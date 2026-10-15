"""HACS package installation; isolated filesystem/HA fixtures, no physical devices."""
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock
import json

import pytest

from custom_components.ecobee_managed_auto import installation as module
from custom_components.ecobee_managed_auto import async_setup_entry, async_unload_entry
from custom_components.ecobee_managed_auto.installation import LOVELACE_DATA
from homeassistant.exceptions import ConfigEntryNotReady


class Resources:
    loaded=False
    def __init__(self, rows=()):
        self.rows=list(rows)
        self.async_load=AsyncMock()
        self.async_create_item=AsyncMock(side_effect=self.create)
        self.async_update_item=AsyncMock(side_effect=self.update)
    def async_items(self):return self.rows
    async def create(self,data):
        self.rows.append({'id':'card','url':data['url'],'type':data['res_type']})
    async def update(self,key,data):
        row=next(r for r in self.rows if r['id']==key)
        row.update(url=data['url'],type=data['res_type'])


@pytest.fixture
def install_hass(tmp_path):
    resources=Resources()
    async def executor(fn,*args):return fn(*args)
    return SimpleNamespace(data={LOVELACE_DATA:SimpleNamespace(resource_mode='storage',resources=resources)},
        config=SimpleNamespace(config_dir=str(tmp_path)),async_add_executor_job=executor,
        http=SimpleNamespace(async_register_static_paths=AsyncMock()))


def test_packaged_assets_match_release_sources():
    root=Path(__file__).resolve().parents[1]
    assert (module.BUNDLE/'ecobee-dual-fuel-card.js').read_bytes()==(root/'dist/ecobee-dual-fuel-card.js').read_bytes()
    for name in ('ecobee_dual_fuel_scheduler.yaml','ecobee_dual_fuel_scheduler_zh.yaml'):
        assert (module.BUNDLE/name).read_bytes()==(root/'blueprints/automation'/name).read_bytes()
    assert json.loads((root/'hacs.json').read_text())['homeassistant']=='2024.12.0'
    domains=[p for p in (root/'custom_components').iterdir() if p.is_dir() and (p/'manifest.json').exists()]
    assert len(domains)==1


def test_blueprint_install_update_backup_and_original_path(tmp_path):
    relative=module.install_blueprint(tmp_path,'zh')
    target=tmp_path/relative
    assert target.read_bytes()==(module.BUNDLE/target.name).read_bytes()
    assert module.install_blueprint(tmp_path,'zh')==relative
    assert not (tmp_path/'.ecobee-dual-fuel-backups').exists()
    target.write_text('previous version')
    module.install_blueprint(tmp_path,'zh')
    backups=list((tmp_path/'.ecobee-dual-fuel-backups').rglob(target.name))
    assert len(backups)==1 and backups[0].read_text()=='previous version'
    assert not (tmp_path/'automations.yaml').exists()


def test_blueprint_existing_import_path_is_preserved(tmp_path):
    p=tmp_path/'blueprints/automation/old_import/ecobee_dual_fuel_scheduler.yaml'
    p.parent.mkdir(parents=True);p.write_text('old')
    assert module.install_blueprint(tmp_path,'en')==str(p.relative_to(tmp_path))


def test_upgrade_updates_both_previously_installed_languages(tmp_path):
    paths=[tmp_path/module.install_blueprint(tmp_path,lang) for lang in ('en','zh')]
    for path in paths:path.write_text('old translated blueprint')
    module.install_blueprint(tmp_path,'en')
    for path in paths:assert path.read_bytes()==(module.BUNDLE/path.name).read_bytes()
    assert len(list((tmp_path/'.ecobee-dual-fuel-backups').rglob('*.yaml')))==2


def test_symlink_and_duplicate_blueprints_refused(tmp_path):
    path=tmp_path/'blueprints';path.symlink_to(tmp_path/'outside')
    with pytest.raises(ValueError):module.install_blueprint(tmp_path,'en')
    path.unlink()
    for folder in ['a','b']:
        p=path/'automation'/folder/'ecobee_dual_fuel_scheduler.yaml';p.parent.mkdir(parents=True);p.write_text('old')
    with pytest.raises(ValueError):module.install_blueprint(tmp_path,'en')


@pytest.mark.asyncio
async def test_resource_registration_is_idempotent(install_hass):
    hass=install_hass
    one=await module.async_install(hass,'en');two=await module.async_install(hass,'en')
    assert one==two
    hass.http.async_register_static_paths.assert_awaited_once()
    resources=hass.data[LOVELACE_DATA].resources
    resources.async_create_item.assert_awaited_once()
    version=json.loads((module.BUNDLE/'versions.json').read_text())['card']
    assert resources.rows[0]['url'].startswith(f'{module.STATIC_URL}?v={version}-')


@pytest.mark.asyncio
async def test_existing_manual_card_resource_is_migrated(install_hass):
    resources=install_hass.data[LOVELACE_DATA].resources
    other={'id':'other','url':'/local/other.js','type':'module'}
    resources.rows=[other.copy(),{'id':'old','url':'/local/ecobee-dual-fuel-card.js?v=old','type':'module'}]
    await module.async_install(install_hass,'en')
    assert resources.rows[0]==other
    assert resources.rows[1]['id']=='old'
    resources.async_update_item.assert_awaited_once()
    resources.async_create_item.assert_not_awaited()


@pytest.mark.asyncio
async def test_yaml_resources_use_frontend_hook_without_yaml_write(install_hass,monkeypatch):
    install_hass.data[LOVELACE_DATA].resource_mode='yaml'
    calls=[];monkeypatch.setattr(module.frontend,'add_extra_js_url',lambda h,u:calls.append(u))
    await module.async_install(install_hass,'en');await module.async_install(install_hass,'en')
    assert len(calls)==1
    install_hass.data[LOVELACE_DATA].resources.async_create_item.assert_not_awaited()


@pytest.mark.asyncio
async def test_duplicate_resources_report_retryable_setup_error(install_hass):
    install_hass.data[LOVELACE_DATA].resources.rows=[{'id':'a','url':module.STATIC_URL},{'id':'b','url':'/local/ecobee-dual-fuel-card.js'}]
    with pytest.raises(ConfigEntryNotReady):await module.async_install(install_hass,'en')


@pytest.mark.asyncio
async def test_package_entry_does_not_create_hvac_controller(install_hass,monkeypatch):
    import custom_components.ecobee_managed_auto as integration
    def forbidden(*args):raise AssertionError('No HVAC controller should be created')
    monkeypatch.setattr(integration,'Controller',forbidden)
    entry=SimpleNamespace(data={'entry_type':'installation','blueprint_language':'en'},options={},
                          async_on_unload=lambda fn:None,add_update_listener=lambda fn:lambda:None)
    assert await async_setup_entry(install_hass,entry)
    assert entry.runtime_data['blueprint']
    assert await async_unload_entry(install_hass,entry)


@pytest.mark.asyncio
@pytest.mark.parametrize('ready', [False, True])
async def test_installation_diagnostics_without_controller(ready):
    from custom_components.ecobee_managed_auto.diagnostics import async_get_config_entry_diagnostics
    entry=SimpleNamespace(data={'entry_type':'installation'},options={})
    if ready:entry.runtime_data={'blueprint':'test.yaml','card_url':module.STATIC_URL}
    report=await async_get_config_entry_diagnostics(None,entry)
    assert report['installation']==(entry.runtime_data if ready else None)
    assert 'controller' not in report


@pytest.mark.asyncio
async def test_setup_menu_and_install_entry_are_independent_of_equipment(ha):
    from custom_components.ecobee_managed_auto.config_flow import ManagedAutoConfigFlow
    flow=ManagedAutoConfigFlow();flow.hass=ha.hass
    menu=await flow.async_step_user()
    assert menu['type']=='menu'
    assert menu['menu_options']==['installation','controller']
    # A real ConfigFlow manager owns creation; the entry payload itself requires no thermostat.
    from custom_components.ecobee_managed_auto.config_flow import installation_schema
    assert installation_schema({})({})=={'blueprint_language':'en'}


@pytest.mark.asyncio
async def test_legacy_lovelace_dictionary_is_supported(install_hass):
    resources=install_hass.data[LOVELACE_DATA].resources
    install_hass.data[LOVELACE_DATA]={"mode":"storage","resources":resources}
    await module.async_install(install_hass,"en")
    resources.async_create_item.assert_awaited_once()

@pytest.mark.asyncio
async def test_resource_registration_against_real_ha_collection(ha,tmp_path):
    from homeassistant.components.lovelace.resources import ResourceStorageCollection
    resources=ResourceStorageCollection(ha.hass,SimpleNamespace(async_load=AsyncMock(return_value={})))
    async def executor(fn,*args):return fn(*args)
    facade=SimpleNamespace(data={LOVELACE_DATA:SimpleNamespace(resource_mode='storage',resources=resources)},
        config=SimpleNamespace(config_dir=str(tmp_path)),async_add_executor_job=executor,
        http=SimpleNamespace(async_register_static_paths=AsyncMock()))
    await module.async_install(facade,'en')
    await module.async_install(facade,'en')
    rows=resources.async_items()
    assert len(rows)==1 and rows[0]['type']=='module'
    await resources.async_update_item(rows[0]['id'],{'url':'/local/ecobee-dual-fuel-card.js?v=old','res_type':'module'})
    await module.async_install(facade,'en')
    assert resources.async_items()[0]['url'].startswith(module.STATIC_URL)
