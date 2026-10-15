"""Mode ownership/changeover tests, with no real thermostat or network."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock
from zoneinfo import ZoneInfo

import pytest
import pytest_asyncio

from custom_components.ecobee_managed_auto import controller as module
from custom_components.ecobee_managed_auto.controller import Controller
from custom_components.ecobee_managed_auto.policy import Snapshot, desired_mode, heat_pump_window, snapshot

NOW = datetime(2026, 10, 13, 16, tzinfo=timezone.utc)
AUTO = 'switch.test_managed_auto'


def raw_data(mode='auto', temperature=22):
    def f(v): return (v * 9 / 5 + 32) * 10
    return {'settings': {'hvacMode': mode, 'hasHeatPump': True, 'autoHeatCoolFeatureEnabled': True},
            'runtime': {'connected': True, 'actualTemperature': f(temperature), 'desiredHeat': f(22), 'desiredCool': f(25), 'lastStatusModified': NOW.strftime('%Y-%m-%d %H:%M:%S')}, 'equipmentStatus': ''}


@pytest.mark.parametrize('mode,temp,cheap,target', [
    ('auto',22,False,'auxHeatOnly'), ('auto',25,False,'cool'), ('auto',23,False,'auxHeatOnly'),
    ('auto',24,False,'cool'), ('auxHeatOnly',23.5,False,'auxHeatOnly'), ('cool',23,False,'cool'),
    ('auxHeatOnly',25,False,'cool'), ('cool',22,False,'auxHeatOnly'),
    ('cool',22,True,'auto'), ('auxHeatOnly',25,True,'auto'), ('auto',22,True,'auto')])
def test_decisions(mode,temp,cheap,target):
    assert desired_mode(snapshot(raw_data(mode,temp), NOW,20),cheap)==target


@pytest.mark.parametrize('change', [
    {'connected':False}, {'lastStatusModified':'bad'}, {'lastStatusModified':'2026-10-13 15:00:00'},
    {'actualTemperature':float('nan')}, {'desiredHeat':800,'desiredCool':800}, {'desiredCool':None}])
def test_bad_runtime_rejected(change):
    raw=raw_data();raw['runtime'].update(change)
    with pytest.raises((ValueError, TypeError)): snapshot(raw,NOW,20)


@pytest.mark.parametrize('local,expected', [
    ('2026-10-12T23:00:00',True),('2026-10-13T06:59:59',True),('2026-10-13T07:00:00',False),
    ('2026-10-13T23:00:00',False),('2026-11-01T01:30:00',False)])
def test_cross_midnight_start_day(local,expected):
    assert heat_pump_window({'weekdays':['mon']},datetime.fromisoformat(local).replace(tzinfo=ZoneInfo('America/Toronto')))==expected


@pytest_asyncio.fixture
async def managed(ha,monkeypatch):
    entry=SimpleNamespace(entry_id='managed_test',data={'thermostat':'climate.test_ecobee','aux_switch':'switch.test_ecobee_auxiliary_heat_only','automation':'automation.test_ecobee_dual_fuel'},options={})
    c=Controller(ha.hass,entry)
    c.entity_id=AUTO
    c.save=AsyncMock()
    c.publish=lambda: ha.set_state(AUTO,'on' if c.enabled else 'off',**c.attributes)
    raw=raw_data()
    when=[NOW]
    inputs={'observation_mode':False,'managed_auto_entity':AUTO}
    def read_raw(*args):
        mode=raw['settings']['hvacMode']
        ha.set_state(entry.data['thermostat'], {'auto':'heat_cool','auxHeatOnly':'heat'}.get(mode,mode))
        ha.set_state(entry.data['aux_switch'],'on' if mode=='auxHeatOnly' else 'off')
        return deepcopy(raw)
    monkeypatch.setattr(module,'native_thermostat',read_raw)
    monkeypatch.setattr(module,'schedule_inputs',lambda *args: dict(inputs))
    monkeypatch.setattr(module.dt_util,'utcnow',lambda: when[0])
    def advance(minutes=11):
        when[0]+=timedelta(minutes=minutes)
        raw['runtime']['lastStatusModified']=when[0].strftime('%Y-%m-%d %H:%M:%S')
    notices=[]
    monkeypatch.setattr(module.persistent_notification,'async_create',lambda hass,message,title=None,notification_id=None:notices.append(message))
    monkeypatch.setattr(module.persistent_notification,'async_dismiss',lambda hass,notification_id:notices.append(None))
    c.notices=notices
    yield c,raw,inputs,advance,ha


@pytest.mark.asyncio
async def test_full_day_night_and_comfort_change(managed):
    c,raw,inputs,advance,ha=managed
    await c.tick()
    assert c.owns and c.pending['mode']=='auxHeatOnly'
    assert ha.writes[-1][0]=='switch.turn_on'
    raw['settings']['hvacMode']='auxHeatOnly'
    await c.tick()
    assert c.status=='furnace_selected'
    raw['runtime']['actualTemperature']=780  # 25.56 C
    await c.tick()
    assert c.status=='minimum_mode_wait'
    advance()
    await c.tick()
    assert c.pending['mode']=='cool'
    raw['settings']['hvacMode']='cool'
    await c.tick()
    # Comfort target changes while physically Cool; both raw targets remain usable.
    raw['runtime']['desiredHeat']=790
    raw['runtime']['desiredCool']=830
    advance()
    await c.tick()
    assert c.pending['mode']=='auxHeatOnly'
    raw['settings']['hvacMode']='auxHeatOnly'
    await c.tick()
    # 23:xx local next day: return to native Auto, including cooling.
    advance(660)
    await c.tick()
    assert c.pending['mode']=='auto'
    assert ha.writes[-1][1]['hvac_mode']=='heat_cool'
    assert all(name in ('switch.turn_on','climate.set_hvac_mode') for name,_ in ha.writes)


@pytest.mark.asyncio
@pytest.mark.parametrize('mode',['heat','cool','off'])
async def test_armed_does_not_take_over_manual_modes(managed,mode):
    c,raw,_,_,ha=managed
    raw['settings']['hvacMode']=mode
    await c.tick()
    assert not c.owns and not ha.writes


@pytest.mark.asyncio
async def test_off_cancels_pending(managed):
    c,raw,_,_,ha=managed
    await c.tick()
    before=len(ha.writes)
    raw['settings']['hvacMode']='off'
    await c.tick()
    assert not c.enabled and not c.owns and c.pending is None
    assert len(ha.writes)==before


@pytest.mark.asyncio
async def test_manual_mode_change_yields(managed):
    c,raw,_,_,ha=managed
    await c.tick()
    raw['settings']['hvacMode']='auxHeatOnly'
    await c.tick()
    raw['settings']['hvacMode']='cool'
    await c.tick()
    assert c.status=='manual_override' and not c.owns
    assert len(ha.writes)==1


@pytest.mark.asyncio
async def test_disable_restores_auto(managed):
    c,raw,_,_,ha=managed
    await c.tick();raw['settings']['hvacMode']='auxHeatOnly';await c.tick()
    await c.enable(False)
    assert c.owns and c.pending['mode']=='auto'
    raw['settings']['hvacMode']='auto';await c.tick()
    assert not c.owns and not c.enabled


@pytest.mark.asyncio
async def test_stale_runtime_suspends_until_fresh_then_restores(managed):
    c,raw,_,advance,ha=managed
    await c.tick();raw['settings']['hvacMode']='auxHeatOnly';await c.tick()
    raw['runtime']['lastStatusModified']='2020-01-01 00:00:00'
    await c.tick()
    # A data outage pauses control but stays armed.
    assert c.status=='waiting_for_connection' and c.owns and c.enabled
    assert len(ha.writes)==1
    advance();await c.tick()
    assert c.pending['mode']=='auto'
    raw['settings']['hvacMode']='auto';await c.tick()
    assert not c.owns and c.enabled and c.status=='waiting_for_auto'
    advance();await c.tick()
    assert c.owns and c.pending['mode']=='auxHeatOnly'


@pytest.mark.asyncio
async def test_timeout_not_repeat_aux_commands(managed):
    c,raw,_,advance,ha=managed
    await c.tick();advance();await c.tick()
    # The original mode is already Auto; no duplicate Aux request after timeout.
    assert not c.owns and not c.enabled
    assert len(ha.writes)==1


@pytest.mark.asyncio
async def test_service_error_is_uncertain_not_immediate_retry(managed):
    c,raw,_,_,ha=managed
    ha.fail_services.add('switch.turn_on')
    await c.tick();await c.tick()
    assert c.pending and len(ha.writes)==1


@pytest.mark.asyncio
async def test_observation_and_disabled_schedule(managed):
    c,raw,inputs,_,ha=managed
    inputs['observation_mode']=True
    await c.tick()
    assert not c.owns and not ha.writes
    inputs['observation_mode']=False
    ha.set_state(c.config['automation'],'off')
    await c.tick()
    assert not c.owns and not ha.writes


@pytest.mark.asyncio
async def test_restart_restores_only_owned_mode(managed):
    c,raw,_,_,ha=managed
    c.store.async_load=AsyncMock(return_value={'owns':True,'enabled':True,'expected':'auxHeatOnly','pending':None})
    await c.load()
    raw['settings']['hvacMode']='cool'  # changed externally while HA was down
    await c.tick()
    assert not c.owns and not ha.writes


@pytest.mark.asyncio
async def test_restart_uncertain_transaction_recovers(managed):
    c,raw,_,_,ha=managed
    c.store.async_load=AsyncMock(return_value={'owns':True,'enabled':True,'expected':'cool','pending':{'previous':'auxHeatOnly','mode':'cool','since':NOW.timestamp()}})
    await c.load()
    raw['settings']['hvacMode']='auxHeatOnly'
    await c.tick()
    assert c.pending['mode']=='auto' and not c.enabled


@pytest.mark.asyncio
async def test_guard_prevents_blueprint_writes(ha,run_blueprint):
    from homeassistant.helpers.entity import entity_sources
    entity_sources(ha.hass)[AUTO]={'domain':'ecobee_managed_auto'}
    ha.set_state(AUTO,'on',thermostat='climate.test_ecobee',owns_mode=True)
    await run_blueprint(managed_auto_entity=AUTO,observation_mode=False)
    assert not ha.writes


@pytest.mark.asyncio
async def test_missing_guard_fails_closed(ha,run_blueprint):
    await run_blueprint(managed_auto_entity=AUTO,observation_mode=False)
    assert not ha.writes

@pytest.mark.asyncio
async def test_external_ha_off_wins_even_with_pending_cloud_command(managed):
    from homeassistant.core import Context, Event
    c,raw,_,_,ha=managed
    await c.tick()
    event=Event('call_service',{'domain':'climate','service':'set_hvac_mode','service_data':{'entity_id':c.config['thermostat'],'hvac_mode':'off'}},context=Context())
    c.external_service(event)
    assert not c.owns and not c.enabled and c.pending is None
    await ha.hass.async_block_till_done()
    await c.tick()
    assert len(ha.writes)==1


@pytest.mark.asyncio
async def test_our_service_event_is_not_manual_override(managed):
    from homeassistant.core import Context, Event
    c,raw,_,_,ha=managed
    await c.tick()
    context=Context(id=next(iter(c.contexts)))
    c.external_service(Event('call_service',{'domain':'switch','service':'turn_on','service_data':{'entity_id':c.config['aux_switch']}},context=context))
    assert c.owns and c.enabled


@pytest.mark.asyncio
async def test_changed_schedule_pauses_then_resumes(managed):
    c,raw,inputs,advance,ha=managed
    await c.tick();raw['settings']['hvacMode']='auxHeatOnly';await c.tick()
    inputs['observation_mode']=True
    await c.tick();await c.tick()
    # Turning the schedule off or observing pauses: restore Auto, stay armed, resume later.
    assert c.pending['mode']=='auto' and c.enabled
    raw['settings']['hvacMode']='auto';await c.tick()
    assert not c.owns and c.status=='schedule_paused'
    await c.tick()
    assert c.status=='schedule_paused' and not c.owns and len(ha.writes)==2
    inputs['observation_mode']=False;advance();await c.tick()
    assert c.owns and c.pending['mode']=='auxHeatOnly' and not c.notices


@pytest.mark.asyncio
async def test_guard_cancels_blueprint_before_second_command(ha,run_blueprint,clock):
    from homeassistant.helpers.entity import entity_sources
    entity_sources(ha.hass)[AUTO]={'domain':'ecobee_managed_auto'}
    ha.set_state(AUTO,'on',thermostat='climate.test_ecobee',owns_mode=False)
    def on_call(name,data):
        if name=='number.set_value':
            ha.set_state(AUTO,'on',owns_mode=True)
    ha.on_call=on_call
    await run_blueprint(managed_auto_entity=AUTO,observation_mode=False,manage_cutoff=True,cutoff_entity='number.test_ecobee_compressor_minimum_temperature')
    assert [n for n,_ in ha.writes]==['number.set_value']


def test_config_flow_requires_cloud_limit_acknowledgement():
    from custom_components.ecobee_managed_auto.config_flow import validate,schema
    assert validate(None,{'accept_cloud_limitations':False})=='accept_limitations'
    values=schema({})({'thermostat':'climate.test','aux_switch':'switch.test','automation':'automation.test'})
    assert values['accept_cloud_limitations'] is False


def test_adapter_rejects_other_device_and_non_aux_switch(monkeypatch):
    from custom_components.ecobee_managed_auto import adapter
    climate=SimpleNamespace(platform='ecobee',device_id='a',unique_id='t1',config_entry_id='native')
    aux=SimpleNamespace(platform='ecobee',device_id='b',unique_id='t1_aux_heat_only')
    registry=SimpleNamespace(async_get=lambda entity:climate if entity.startswith('climate.') else aux)
    monkeypatch.setattr(adapter.er,'async_get',lambda hass:registry)
    with pytest.raises(ValueError,match='share_device'):adapter.native_thermostat(None,'climate.a','switch.a')
    aux.device_id='a';aux.unique_id='t1_ventilator_20m_timer'
    with pytest.raises(ValueError,match='auxiliary_heat'):adapter.native_thermostat(None,'climate.a','switch.a')


@pytest.mark.parametrize('legacy', [False, True])
def test_adapter_reads_only_selected_native_thermostat(monkeypatch, legacy):
    from custom_components.ecobee_managed_auto import adapter
    climate=SimpleNamespace(platform='ecobee',device_id='a',unique_id='t1',config_entry_id='native')
    aux=SimpleNamespace(platform='ecobee',device_id='a',unique_id='t1_aux_heat_only')
    registry=SimpleNamespace(async_get=lambda entity:climate if entity.startswith('climate.') else aux)
    monkeypatch.setattr(adapter.er,'async_get',lambda hass:registry)
    raw={'identifier':'t1',**raw_data()}
    native=SimpleNamespace()
    data=SimpleNamespace(entry=native,ecobee=SimpleNamespace(thermostats=[{'identifier':'other'},raw]))
    if not legacy:native.runtime_data=data
    hass=SimpleNamespace(data={'ecobee':data},config_entries=SimpleNamespace(async_get_entry=lambda eid:native))
    assert adapter.native_thermostat(hass,'climate.a','switch.a') is raw
    if legacy:
        data.entry=SimpleNamespace()
        with pytest.raises(ValueError,match='native_thermostat_unavailable'):
            adapter.native_thermostat(hass,'climate.a','switch.a')


@pytest.mark.asyncio
async def test_queued_tick_cannot_reacquire_after_stop(managed):
    c,raw,_,_,ha=managed
    await c.tick()
    raw['settings']['hvacMode']='auxHeatOnly'
    await c.tick()
    await c.stop()
    before=len(ha.writes)
    raw['settings']['hvacMode']='auto'
    # Model callbacks that had already been queued when unload began.
    await c.tick()
    await c.tick()
    c.wake()
    await ha.hass.async_block_till_done()
    assert len(ha.writes)==before


def test_schedule_adapter_requires_guard_and_matching_device():
    from custom_components.ecobee_managed_auto.adapter import schedule_inputs
    inputs={'thermostat':'climate.a','aux_switch':'switch.a'}
    automation=SimpleNamespace(_blueprint_inputs={'use_blueprint':{'path':'folder/ecobee_dual_fuel_scheduler.yaml','input':inputs}})
    hass=SimpleNamespace(data={'automation':SimpleNamespace(get_entity=lambda eid:automation)})
    with pytest.raises(ValueError,match='guard'):schedule_inputs(hass,'automation.a','climate.a','switch.a',AUTO)
    inputs['managed_auto_entity']=AUTO
    assert schedule_inputs(hass,'automation.a','climate.a','switch.a',AUTO)==inputs
    with pytest.raises(ValueError,match='mismatch'):schedule_inputs(hass,'automation.a','climate.b','switch.a',AUTO)


@pytest.mark.asyncio
async def test_manual_override_during_journal_write_aborts_command(managed):
    from homeassistant.core import Context,Event
    c,raw,_,_,ha=managed
    async def save():
        if c.pending:
            c.external_service(Event('call_service',{'domain':'climate','service':'turn_off','service_data':{'entity_id':c.config['thermostat']}},context=Context()))
    c.save=save
    await c.tick()
    await ha.hass.async_block_till_done()
    assert not c.owns and not c.enabled and not ha.writes

@pytest.mark.asyncio
async def test_adapter_uses_real_ha_blueprint_instance_config(ha,blueprint):
    from homeassistant.components.blueprint.models import BlueprintInputs
    from custom_components.ecobee_managed_auto.adapter import schedule_inputs
    raw={'id':'test','use_blueprint':{'path':'ecobee_dual_fuel_scheduler.yaml','input':{'thermostat':'climate.test_ecobee','aux_switch':'switch.test_ecobee_auxiliary_heat_only','managed_auto_entity':AUTO,'start_time':'22:30:00'}}}
    instance=BlueprintInputs(blueprint,raw)
    instance.validate()
    # This matches HA AutomationEntity's two distinct configuration fields.
    automation=SimpleNamespace(raw_config=instance.async_substitute(),_blueprint_inputs=instance.config_with_inputs)
    assert 'use_blueprint' not in automation.raw_config
    fake=SimpleNamespace(data={'automation':SimpleNamespace(get_entity=lambda eid:automation)})
    assert schedule_inputs(fake,'automation.test','climate.test_ecobee','switch.test_ecobee_auxiliary_heat_only',AUTO)['start_time']=='22:30:00'


def _saved(**extra):
    return AsyncMock(return_value={'owns':True,'enabled':True,'expected':'auxHeatOnly','pending':None,**extra})


@pytest.mark.asyncio
async def test_clean_restart_restores_auto_then_resumes(managed):
    c,raw,_,advance,ha=managed
    c.store.async_load=_saved(clean_shutdown=True)
    await c.load()
    assert c.enabled and c.recovering and c.startup_notice is None
    raw['settings']['hvacMode']='auxHeatOnly'
    await c.tick()
    assert c.pending['mode']=='auto'
    raw['settings']['hvacMode']='auto';await c.tick()
    assert not c.owns and c.enabled and c.status=='waiting_for_auto'
    advance();await c.tick()
    assert c.owns and c.pending['mode']=='auxHeatOnly'


@pytest.mark.asyncio
async def test_unexpected_restart_stays_off_and_notifies(managed):
    c,raw,_,_,ha=managed
    c.store.async_load=_saved()
    await c.load()
    assert not c.enabled and c.startup_notice=='unexpected_shutdown'
    c.start()
    assert 'unexpectedly' in c.notices[0]
    raw['settings']['hvacMode']='auxHeatOnly';await c.tick()
    raw['settings']['hvacMode']='auto';await c.tick()
    assert not c.owns and not c.enabled and c.status=='disabled'
    for unsubscribe in c.unsub: unsubscribe()


@pytest.mark.asyncio
async def test_resume_option_off_keeps_controller_off_after_clean_restart(managed):
    c,raw,_,_,ha=managed
    c.config['resume_after_restart']=False
    c.store.async_load=_saved(clean_shutdown=True)
    await c.load()
    assert not c.enabled and c.startup_notice is None


@pytest.mark.asyncio
async def test_stop_records_clean_shutdown_and_keeps_intent(managed):
    c,raw,_,_,ha=managed
    saved=[]
    async def save(): saved.append({'enabled':c.enabled,'owns':c.owns,'clean':c.clean_shutdown,'pending':dict(c.pending or {})})
    c.save=save
    await c.tick();raw['settings']['hvacMode']='auxHeatOnly';await c.tick()
    await c.stop()
    assert ha.writes[-1][1]['hvac_mode']=='heat_cool'
    assert saved[-1]['enabled'] and saved[-1]['owns'] and saved[-1]['clean'] and saved[-1]['pending']['mode']=='auto'


@pytest.mark.asyncio
async def test_restore_failure_notifies_once(managed):
    c,raw,_,advance,ha=managed
    await c.tick();raw['settings']['hvacMode']='auxHeatOnly';await c.tick()
    await c.enable(False)
    for _ in range(3):
        advance(9);await c.tick()
    assert c.status=='restore_failed'
    await c.tick()
    assert sum('could not restore' in (n or '') for n in c.notices)==1


@pytest.mark.asyncio
async def test_manual_override_notifies_and_rearm_clears(managed):
    c,raw,_,_,ha=managed
    await c.tick();raw['settings']['hvacMode']='auxHeatOnly';await c.tick()
    raw['settings']['hvacMode']='cool';await c.tick()
    assert 'changed manually' in c.notices[-1]
    await c.enable(True)
    assert c.notices[-1] is None


@pytest.mark.asyncio
async def test_connection_notice_only_after_thirty_minutes(managed):
    c,raw,_,advance,ha=managed
    await c.tick();raw['settings']['hvacMode']='auxHeatOnly';await c.tick()
    stale='2020-01-01 00:00:00'
    raw['runtime']['lastStatusModified']=stale;await c.tick()
    assert not c.notices
    advance(31);raw['runtime']['lastStatusModified']=stale;await c.tick()
    assert 'more than 30 minutes' in c.notices[-1]


@pytest.mark.asyncio
async def test_notify_option_off_suppresses_notifications(managed):
    c,raw,_,_,ha=managed
    c.config['notify']=False
    await c.tick();raw['settings']['hvacMode']='auxHeatOnly';await c.tick()
    raw['settings']['hvacMode']='cool';await c.tick()
    assert c.status=='manual_override' and not c.notices


@pytest.mark.asyncio
async def test_mode_changes_are_logged_with_reason(managed):
    c,raw,_,advance,ha=managed
    events=[]
    ha.hass.bus.async_listen('logbook_entry',lambda e:events.append(e.data))
    await c.tick();await ha.hass.async_block_till_done()
    messages=[e['message'] for e in events if e['entity_id']==AUTO]
    assert any('≤ heat target' in m and '22.0 °C' in m for m in messages)
    assert 'Took control: ecobee is in Auto' in messages


@pytest.mark.asyncio
@pytest.mark.parametrize('target',['device','area','all'])
async def test_device_area_and_all_targets_are_manual_overrides(managed,target):
    from homeassistant.core import Context, Event
    from homeassistant.helpers import device_registry as dr, entity_registry as er
    c,raw,_,_,ha=managed
    await c.tick()
    entry=er.async_get(ha.hass).async_get(c.config['thermostat'])
    data={'device':{'device_id':entry.device_id},'all':{'entity_id':'all'}}.get(target)
    if target=='area':
        dr.async_get(ha.hass).async_update_device(entry.device_id,area_id='hall')
        data={'area_id':['hall']}
    c.external_service(Event('call_service',{'domain':'climate','service':'set_hvac_mode','service_data':{**data,'hvac_mode':'cool'}},context=Context()))
    assert c.status=='manual_override' and not c.owns


@pytest.mark.asyncio
async def test_unrelated_device_target_is_ignored(managed):
    from homeassistant.core import Context, Event
    c,raw,_,_,ha=managed
    await c.tick()
    c.external_service(Event('call_service',{'domain':'climate','service':'set_hvac_mode','service_data':{'device_id':'other','hvac_mode':'cool'}},context=Context()))
    assert c.owns


def test_config_flow_reports_specific_reason(monkeypatch):
    from custom_components.ecobee_managed_auto import config_flow
    def fail(*args): raise ValueError('stale_runtime')
    monkeypatch.setattr(config_flow,'native_thermostat',fail)
    assert config_flow.validate(None,{'accept_cloud_limitations':True,'thermostat':'c','aux_switch':'s','maximum_data_age_minutes':20})=='stale_runtime'
    def other(*args): raise ValueError('something_new')
    monkeypatch.setattr(config_flow,'native_thermostat',other)
    assert config_flow.validate(None,{'accept_cloud_limitations':True,'thermostat':'c','aux_switch':'s','maximum_data_age_minutes':20})=='invalid_equipment'
    values=config_flow.schema({})({'thermostat':'climate.t','aux_switch':'switch.t','automation':'automation.t'})
    assert values['resume_after_restart'] is True and values['notify'] is True


def test_translations_cover_every_status_and_error():
    import json, pathlib
    from custom_components.ecobee_managed_auto.const import STATUSES
    from custom_components.ecobee_managed_auto.config_flow import REASONS
    base=pathlib.Path(__file__).parents[1]/'custom_components'/'ecobee_managed_auto'
    strings=json.loads((base/'strings.json').read_text())
    for path in ['strings.json','translations/en.json','translations/zh-Hans.json']:
        data=json.loads((base/path).read_text())
        assert set(data['entity']['sensor']['status']['state'])==set(STATUSES)
        assert set(REASONS)<=set(data['config']['error'])
        assert data.keys()==strings.keys()
    zh=json.loads((base/'translations/zh-Hans.json').read_text())
    assert all(any('\u4e00'<=ch<='\u9fff' for ch in v) for v in zh['config']['error'].values())


@pytest.mark.asyncio
async def test_status_sensor_and_diagnostics_follow_controller(managed):
    from custom_components.ecobee_managed_auto.sensor import ManagedAutoStatus
    from custom_components.ecobee_managed_auto.switch import ManagedAutoSwitch
    from custom_components.ecobee_managed_auto.diagnostics import async_get_config_entry_diagnostics
    from custom_components.ecobee_managed_auto.const import STATUSES
    c,raw,_,_,ha=managed
    entry=SimpleNamespace(entry_id='managed_test',title='t',data={'thermostat':'climate.x'},options={},runtime_data=c)
    await c.tick()
    sensor=ManagedAutoStatus(entry)
    assert sensor.native_value==c.status and sensor.options==list(STATUSES)
    assert {'runtime_updated','current_c'}<=ManagedAutoSwitch._unrecorded_attributes
    diag=await async_get_config_entry_diagnostics(ha.hass,entry)
    assert diag['controller']['owns'] and diag['controller']['pending']['mode']=='auxHeatOnly' and diag['data']=={'thermostat':'climate.x'}


@pytest.mark.asyncio
async def test_ha_restart_keeps_control_without_mode_changes(managed):
    c,raw,_,_,ha=managed
    saved=[]
    async def save(): saved.append({'owns':c.owns,'held':c.held,'clean':c.clean_shutdown,'expected':c.expected})
    c.save=save
    await c.tick();raw['settings']['hvacMode']='auxHeatOnly';await c.tick()
    writes=len(ha.writes)
    ha.hass.exit_code=100
    try:
        await c.stop()
    finally:
        ha.hass.exit_code=0
    assert len(ha.writes)==writes, 'a restart must not restore Auto'
    assert saved[-1]=={'owns':True,'held':True,'clean':True,'expected':'auxHeatOnly'}


def _supervisor(monkeypatch, *jobs, fail=False):
    async def supervisor_jobs(hass):
        if fail: raise TimeoutError
        return list(jobs)
    monkeypatch.setattr(module,'supervisor_jobs',supervisor_jobs)


def _job(name, done=False, children=()):
    return SimpleNamespace(name=name, done=done, child_jobs=list(children))


@pytest.mark.asyncio
@pytest.mark.parametrize('jobs,held', [
    ([_job('home_assistant_core_restart')], True),
    ([_job('home_assistant_core_update')], True),
    ([_job('backup_manager_full_backup', children=[_job('home_assistant_core_rebuild')])], True),
    ([_job('home_assistant_core_restart', done=True)], False),
    ([_job('home_assistant_core_stop')], False),
    ([], False)])
async def test_supervisor_restart_is_recognized_without_exit_code(managed, monkeypatch, jobs, held):
    # HA OS restarts (UI button, `ha core restart`, Core updates) arrive as SIGTERM with exit code 0.
    c,raw,_,_,ha=managed
    _supervisor(monkeypatch,*jobs)
    await c.tick();raw['settings']['hvacMode']='auxHeatOnly';await c.tick()
    writes=len(ha.writes)
    await c.stop()
    assert c.held is held
    assert (len(ha.writes)==writes) is held


@pytest.mark.asyncio
async def test_unreachable_supervisor_counts_as_shutdown(managed, monkeypatch):
    c,raw,_,_,ha=managed
    _supervisor(monkeypatch,fail=True)
    await c.tick();raw['settings']['hvacMode']='auxHeatOnly';await c.tick()
    await c.stop()
    assert not c.held and ha.writes[-1][1]['hvac_mode']=='heat_cool'


@pytest.mark.asyncio
async def test_shutdown_still_restores_auto(managed):
    c,raw,_,_,ha=managed
    await c.tick();raw['settings']['hvacMode']='auxHeatOnly';await c.tick()
    await c.stop()
    assert ha.writes[-1][1]['hvac_mode']=='heat_cool' and not c.held


@pytest.mark.asyncio
async def test_held_restart_resumes_in_place(managed):
    c,raw,_,_,ha=managed
    events=[]
    ha.hass.bus.async_listen('logbook_entry',lambda e:events.append(e.data['message']))
    c.store.async_load=_saved(clean_shutdown=True,held=True,last_change=NOW.timestamp())
    await c.load()
    assert c.owns and c.enabled and not c.recovering and c.status=='syncing'
    raw['settings']['hvacMode']='auxHeatOnly'
    c.start();await c.tick();await ha.hass.async_block_till_done()
    assert c.owns and c.status=='furnace_selected' and not ha.writes and not c.notices
    assert 'Resumed control after the Home Assistant restart' in events
    for unsubscribe in c.unsub: unsubscribe()


@pytest.mark.asyncio
async def test_mode_changed_while_ha_was_down_wins(managed):
    c,raw,_,_,ha=managed
    c.store.async_load=_saved(clean_shutdown=True,held=True)
    await c.load()
    raw['settings']['hvacMode']='cool';await c.tick()
    assert not c.owns and not c.enabled and c.status=='manual_override' and not ha.writes


@pytest.mark.asyncio
async def test_held_restart_waits_for_data_before_restoring(managed):
    c,raw,_,_,ha=managed
    c.store.async_load=_saved(clean_shutdown=True,held=True)
    raw['runtime']['connected']=False
    await c.load();c.start();await c.tick()
    assert c.owns and not c.recovering and c.status=='waiting_for_connection' and not ha.writes
    for unsubscribe in c.unsub: unsubscribe()


@pytest.mark.asyncio
async def test_unsynced_entities_show_syncing_not_awaiting_device(managed,monkeypatch):
    c,raw,_,_,ha=managed
    def stale_switch(*args):
        ha.set_state('climate.test_ecobee','heat_cool');ha.set_state('switch.test_ecobee_auxiliary_heat_only','on')
        return deepcopy(raw)
    monkeypatch.setattr(module,'native_thermostat',stale_switch)
    calls=[]
    ha.hass.services.async_register('homeassistant','update_entity',lambda call:calls.append(call.data['entity_id']))
    await c.tick();await ha.hass.async_block_till_done()
    assert c.status=='syncing' and not c.owns and not ha.writes
    assert calls==[['switch.test_ecobee_auxiliary_heat_only']]
    await c.tick();await ha.hass.async_block_till_done()
    assert len(calls)==1  # Rate limited; the state change wakes the controller.


@pytest.mark.asyncio
async def test_restore_log_uses_readable_reason(managed):
    c,raw,_,_,ha=managed
    events=[]
    ha.hass.bus.async_listen('logbook_entry',lambda e:events.append(e.data['message']))
    await c.tick();raw['settings']['hvacMode']='auxHeatOnly';await c.tick()
    await c.enable(False);await ha.hass.async_block_till_done()
    assert 'Restoring native Auto (Managed Auto turned off)' in events
    assert not any('(disabled)' in m for m in events)


def test_switch_uses_device_name_only():
    from custom_components.ecobee_managed_auto.switch import ManagedAutoSwitch
    switch=ManagedAutoSwitch(SimpleNamespace(runtime_data=None,entry_id='x',title='ecobee Managed Auto'))
    assert switch.name is None


@pytest.mark.asyncio
async def test_supervisor_jobs_is_none_outside_ha_os(ha):
    assert await module.supervisor_jobs(ha.hass) is None
