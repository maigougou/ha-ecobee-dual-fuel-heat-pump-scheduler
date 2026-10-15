import test from 'node:test';
import assert from 'node:assert/strict';
import { cardModel, managedAutoModel, editorSchema, deadbandModel, managedRequest, runtimeReportHTML } from '../../ecobee-dual-fuel-card.js';
const config={entity:'climate.test',managed_auto_entity:'switch.auto'};
function fixture(mode='heat',attrs={}) {return {language:'en', config:{unit_system:{temperature:'°C'}},states:{
 'climate.test':{state:mode,attributes:{current_temperature:22,temperature:22,equipment_running:'auxHeat1',fan:'off'}},
 'switch.auto':{state:'on',attributes:{thermostat:'climate.test',owns_mode:true,heat_target_c:22,cool_target_c:25,status:'furnace_selected',device_mode:'auxHeatOnly',heat_pump_window:false,...attrs}}
}};}
test('managed Auto shows both native Comfort targets while the physical thermostat is Aux',()=>{
 const m=cardModel(fixture(),config);
 assert.equal(m.mode,'heat_cool');assert.equal(m.heatTarget,'22 °C');assert.equal(m.coolTarget,'25 °C');
 assert.equal(m.managed.status,'Furnace selected · Cooling monitored');assert.equal(m.activity,'aux');
});
test('standby controller does not relabel ordinary Heat',()=>{
 assert.equal(cardModel(fixture('heat',{owns_mode:false,status:'waiting_for_auto'}),config).mode,'heat');
});
test('wrong thermostat and unavailable controller do not assert managed ownership',()=>{
 assert.equal(managedAutoModel(fixture('heat',{thermostat:'climate.other'}),config).active,false);
 const hass=fixture();hass.states['switch.auto'].state='unavailable';
 assert.equal(cardModel(hass,config).mode,'heat');
});
test('managed targets convert to viewer units without changing equipment',()=>{
 const hass=fixture();hass.config.unit_system.temperature='°F';
 assert.equal(cardModel(hass,config).heatTarget,'71.6 °F');
 assert.equal(cardModel(hass,config).coolTarget,'77 °F');
});
test('controller selection remains optional and user-configurable',()=>{
 const fields=editorSchema(fixture(),config).flatMap(s=>s.schema||[]);
 assert.ok(fields.some(s=>s.name==='managed_auto_entity'));
 assert.equal(managedAutoModel(fixture(),{entity:'climate.test'}),null);
});
test('managed headline follows the selected side, not always the furnace',()=>{
 assert.equal(managedAutoModel(fixture(),config).sideText,'Furnace only');
 const cool=managedAutoModel(fixture('cool',{device_mode:'cool',status:'cooling_selected'}),config);
 assert.equal(cool.side,'cool');assert.equal(cool.sideText,'Heat pump cooling');assert.equal(cool.deviceText,'ecobee: Cool');
 const pump=managedAutoModel(fixture('heat_cool',{device_mode:'auto',heat_pump_window:true,status:'heat_pump_window'}),config);
 assert.equal(pump.side,'heat');assert.equal(pump.sideText,'Heat pump · Furnace backup');assert.equal(pump.tone,'normal');
 assert.equal(managedAutoModel(fixture('heat',{owns_mode:false,status:'waiting_for_auto'}),config).side,null);
});
test('new controller statuses are labelled in both languages with a problem tone',()=>{
 for (const status of ['schedule_paused','command_failed']) {
  const en=managedAutoModel(fixture('heat',{status}),config), zh=managedAutoModel({...fixture('heat',{status}),language:'zh'},{...config,language:'zh'});
  assert.notEqual(en.status,'Unknown');assert.match(zh.status,/[\u4e00-\u9fff]/);
 }
 assert.equal(managedAutoModel(fixture('heat',{status:'command_failed'}),config).tone,'error');
 assert.equal(managedAutoModel(fixture('heat',{status:'schedule_paused'}),config).tone,'warning');
});
test('deadband places targets and current temperature on one strip',()=>{
 const band=deadbandModel({heat_target_c:20,cool_target_c:25,current_c:19},'°C');
 assert.ok(band.currentAt<band.heatAt&&band.heatAt<band.coolAt);assert.equal(band.zone,'aux');
 assert.equal(deadbandModel({heat_target_c:20,cool_target_c:25,current_c:22},'°C').zone,'keep');
 assert.equal(deadbandModel({heat_target_c:20,cool_target_c:25,current_c:26},'°F').zone,'cool');
 assert.equal(deadbandModel({heat_target_c:20,cool_target_c:25,current_c:26},'°F').heat,68);
 assert.equal(deadbandModel({heat_target_c:20},'°C'),null);
});
test('Managed Auto toggle turns the controller switch on and off',()=>{
 assert.deepEqual(managedRequest(fixture(),config,false),{domain:'switch',service:'turn_off',data:{entity_id:'switch.auto'}});
 const hass=fixture();hass.states['switch.auto'].state='unavailable';
 assert.equal(managedRequest(hass,config,true),null);
});
test('managed heating history marks heat-pump and furnace-only rows',()=>{
 const zone='America/Toronto', schedule={status:'ok',start:'23:00:00',end:'07:00:00',days:['mon','tue','wed','thu','fri','sat','sun']};
 const r={periods:{heat:[],aux:[]},coverage:{}};
 const at=Date.parse('2026-10-13T12:00Z'), row=(start,hours)=>({id:'x'+start,start,end:start+hours*3600000,total:hours*3600000,recorded:0,missing:hours*3600000,heat:0,aux:0,cool:0,stages:{heat:[0,0,0],aux:[0,0,0],cool:[0,0,0]}});
 r.periods={heat:[row(at-8*3600000,8)],aux:[row(at,1)]};
 const managed=runtimeReportHTML(r,'ok','en',schedule,zone,false,'heat',{mode:'heat_cool',managed:true,activity:'heating'});
 assert.doesNotMatch(managed,/neutral/);assert.match(managed,/period-window">Heat-pump hours/);assert.match(managed,/period-window">Furnace-only hours/);
 assert.match(runtimeReportHTML(r,'ok','en',schedule,zone,false,'heat',{mode:'heat_cool',activity:'heating'}),/win-heat neutral/);
 assert.match(runtimeReportHTML(r,'ok','en',schedule,zone,false,'heat',{mode:'heat_cool',managed:true,activity:'cooling'}),/win-aux neutral/);
});
test('a pending command shows the side being selected',()=>{
 const m=managedAutoModel(fixture('heat_cool',{device_mode:'auto',pending_mode:'auxHeatOnly',status:'awaiting_device'}),config);
 assert.equal(m.side,'aux');assert.equal(m.sideText,'Furnace only');assert.equal(m.tone,'pending');
});

test('syncing and restoring use the neutral pending tone with readable text',()=>{
 for (const status of ['syncing','restoring_auto','awaiting_device']) assert.equal(managedAutoModel(fixture('heat_cool',{status}),config).tone,'pending');
 assert.equal(managedAutoModel(fixture('heat_cool',{status:'syncing'}),config).status,'Syncing with the thermostat');
 assert.equal(managedAutoModel(fixture('heat_cool',{status:'command_failed'}),config).tone,'error');
});
test('furnace-only Managed Auto says the heat pump is off, not just idle',()=>{
 assert.deepEqual(cardModel(fixture('heat_cool'),config).outdoor,['Off · Furnace-only mode']);
 assert.deepEqual(cardModel(fixture('heat_cool',{device_mode:'cool',status:'cooling_selected'}),config).outdoor,['Not running']);
 assert.deepEqual(cardModel(fixture('heat_cool',{device_mode:'auto',pending_mode:'auxHeatOnly',status:'awaiting_device'}),config).outdoor,['Not running'],'unconfirmed: the device is still in Auto');
});
