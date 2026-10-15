import test from 'node:test';
import assert from 'node:assert/strict';
import { readSchedule, scheduleAt, deviceLinks, logicModel, convertedTemperature, loadControlContext, dayTimeline, nextBoundaryTime } from '../../ecobee-dual-fuel-card.js';
const config = {entity:'climate.test',aux_switch:'switch.aux',automation:'automation.schedule'};
const number='number.minimum',weather='weather.test';
const input = {thermostat:config.entity,aux_switch:config.aux_switch,observation_mode:false,manage_cutoff:true,cutoff_entity:number,cutoff_f:'15'};
const bp = (i={}) => ({use_blueprint:{path:'ecobee_dual_fuel_scheduler/ecobee_dual_fuel_scheduler.yaml',input:{...input,...i}}});
const registry=[{entity_id:config.entity,platform:'ecobee',device_id:'one'}, {entity_id:config.aux_switch,platform:'ecobee',device_id:'one'}, {entity_id:number,platform:'ecobee',device_id:'one',unique_id:'test_compressor_protection_min_temp'}, {entity_id:weather,platform:'ecobee',device_id:'one'}, {entity_id:'weather.other',platform:'ecobee',device_id:'two'}, {entity_id:'weather.generic',platform:'met',device_id:'one'}];
const now=new Date('2026-10-13T05:50:00Z');
function fixture(i={},states={}) {
 const schedule=readSchedule(bp(i),config);
 return {hass:{locale:{language:'en'},config:{time_zone:'America/Toronto',unit_system:{temperature:'°C'}},states:{
  [config.entity]:{state:'heat',attributes:{}},[config.aux_switch]:{state:'off'},[config.automation]:{state:'on',attributes:{id:'real-id'}},
  [number]:{state:'-9.4',attributes:{unit_of_measurement:'°C'}},[weather]:{state:'cloudy',attributes:{temperature:8.5,temperature_unit:'°C',attribution:'Ecobee weather provided by station at 2026-10-13 05:40:54 UTC'}},...states,
 }},context:{schedule,links:deviceLinks(registry,config,schedule)}};
}
function model(i={},states={}) {const f=fixture(i,states);return logicModel(f.hass,config,f.context,now);}

test('reads selected automation inputs and defaults, never a second card schedule',()=>{
 const s=readSchedule(bp(),config);assert.equal(s.start,'23:00:00');assert.equal(s.end,'07:00:00');assert.equal(s.days.length,7);assert.equal(s.observation,false);
 assert.equal(readSchedule(bp({observation_mode:undefined,manage_cutoff:undefined}),config).observation,true);
 assert.equal(readSchedule({use_blueprint:{path:'other.yaml'}},config).status,'unsupported');
 assert.equal(readSchedule(bp({thermostat:'climate.other'}),config).status,'wrongEquipment');
 assert.equal(readSchedule(bp({aux_switch:'switch.other'}),config).status,'wrongEquipment');
});
for(const i of [{start_time:'07:00',end_time:'07:00:00'},{start_time:'25:00'},{weekdays:[]},{weekdays:['abc']},{observation_mode:'false'},{cutoff_f:'16'}]) {
 test(`invalid schedule is unverified: ${JSON.stringify(i)}`,()=>assert.equal(readSchedule(bp(i),config).status,'invalid'));
}
test('same-device ecobee association excludes other thermostats/providers and disabled weather',()=>{
 const s=readSchedule(bp(),config);assert.equal(deviceLinks(registry,config,s).weatherId,weather);
 assert.equal(deviceLinks(registry,{...config,entity:'climate.missing'},s).weatherId,undefined);
 assert.equal(deviceLinks([...registry,{entity_id:'weather.duplicate',platform:'ecobee',device_id:'one'}],config,s).weatherId,undefined);
 assert.equal(deviceLinks(registry.map(r=>r.entity_id===weather?{...r,disabled_by:'user'}:r),config,s).weatherId,undefined);
 assert.equal(deviceLinks(registry,{...config,cutoff_entity:'number.other'},s).cutoffId,undefined);
});
test('night window follows HA time zone, includes start and excludes end',()=>{
 const s=readSchedule(bp(),config);
 for(const [date,policy] of [['2026-10-13T02:59:59Z','aux'],['2026-10-13T03:00:00Z','heat'],['2026-10-13T10:59:59Z','heat'],['2026-10-13T11:00:00Z','aux']]) assert.equal(scheduleAt(s,'America/Toronto',new Date(date)).policy,policy);
 assert.equal(scheduleAt(s,'Asia/Shanghai',now).policy,'aux');
 assert.equal(scheduleAt(s,'invalid/zone',now),null);assert.equal(scheduleAt(s,undefined,now),null);
});
test('weekday start-day semantics, Sunday rollover, same-day window, next boundary',()=>{
 const monday=readSchedule(bp({weekdays:['mon']}),config);
 assert.equal(scheduleAt(monday,'America/Toronto',now).policy,'heat');
 assert.equal(scheduleAt(monday,'America/Toronto',new Date('2026-10-12T05:50Z')).policy,'aux');
 assert.equal(scheduleAt(monday,'America/Toronto',now).next.time,'07:00:00');
 const sunday=readSchedule(bp({weekdays:['sun']}),config);
 assert.equal(scheduleAt(sunday,'America/Toronto',new Date('2026-10-12T05:50Z')).policy,'heat');
 const daytime=readSchedule(bp({start_time:'08:00:00',end_time:'16:00:00'}),config);
 assert.equal(scheduleAt(daytime,'America/Toronto',new Date('2026-10-13T12:00Z')).policy,'heat');
 assert.equal(scheduleAt(daytime,'America/Toronto',new Date('2026-10-13T20:00Z')).policy,'aux');
});
test('DST repeats/skips follow local clock rather than fixed elapsed duration',()=>{
 const s=readSchedule(bp(),config);
 for(const d of ['2026-11-01T05:30Z','2026-11-01T06:30Z','2026-03-08T06:30Z','2026-03-08T07:30Z']) assert.equal(scheduleAt(s,'America/Toronto',new Date(d)).policy,'heat');
 assert.equal(scheduleAt(s,'America/Toronto',new Date('2026-11-01T12:00Z')).policy,'aux');
});
test('real mode match remains distinct from enable state and execution success',()=>{
 let m=model();assert.equal(m.status,'Enabled');assert.equal(m.reason,'Matches schedule');assert.equal(m.cutoffMismatch,false);assert.equal(m.window,'Heat-pump window');
 m=model({}, {[config.aux_switch]:{state:'on'}});assert.match(m.reason,/Differs/);assert.equal(m.tone,'warning');
 m=model({}, {[config.aux_switch]:{state:'unavailable'}});assert.equal(m.reason,'Furnace-only mode not verified');
 m=model({}, {[number]:{state:'0',attributes:{unit_of_measurement:'°C'}}});assert.equal(m.cutoffMismatch,true);
});
for(const mode of ['off','cool','heat_cool']) {
 test(`source scheduling is paused in ${mode}`,()=>{assert.equal(model({}, {[config.entity]:{state:mode}}).status,'Paused');assert.equal(model({}, {[config.entity]:{state:mode}}).cutoffMismatch,false);});
}
test('disabled and observation do not claim current policy is being enforced',()=>{
 let m=model({observation_mode:true});assert.equal(m.status,'Observation only');assert.match(m.reason,/No source commands/);
 m=model({}, {[config.automation]:{state:'off'}});assert.equal(m.status,'Disabled');assert.match(m.reason,/Last source settings/);
 m=model({}, {[config.automation]:{state:'unavailable'}});assert.equal(m.status,'Unverified');
 const f=fixture();f.context.schedule={status:'configUnknown'};assert.equal(logicModel(f.hass,config,f.context,now).status,'Unverified');
 assert.match(logicModel(f.hass,config,f.context,now).reason,/unavailable/);
});
test('weather/cutoff units convert numerically, below vs above threshold, equality',()=>{
 const m=model();assert.equal(m.outsideText,'8.5 °C');assert.equal(m.minimumText,'-9.4 °C');assert.match(m.weatherReason,/above/);
 let n=model({}, {[weather]:{state:'cloudy',attributes:{temperature:5,temperature_unit:'°F'}}});assert.match(n.weatherReason,/below/);assert.equal(n.outside,-15);
 n=model({}, {[weather]:{state:'cloudy',attributes:{temperature:-9.4,temperature_unit:'°C'}}});assert.match(n.weatherReason,/above/);
 assert.equal(convertedTemperature(15,'°F','°C'),-9.444444444444445);assert.equal(convertedTemperature('', '°C','°F'),null);assert.equal(convertedTemperature(true,'°C','°F'),null);
 const f=fixture();f.hass.config.unit_system.temperature='°F';n=logicModel(f.hass,config,f.context,now);assert.equal(n.outsideText,'47.3 °F');assert.equal(n.minimumText,'15.1 °F');
});
test('missing or stale weather does not imply permission; missing minimum is explicit',()=>{
 assert.equal(model({}, {[weather]:{state:'unavailable'}}).weatherReason,'ecobee weather unavailable');
 assert.equal(model({}, {[number]:{state:'unavailable'}}).weatherReason,'Minimum not available');
 assert.match(model({}, {[weather]:{state:'cloudy',attributes:{temperature:8.5,temperature_unit:'°C',attribution:'Ecobee weather provided by station at 2026-10-12 05:40:54 UTC'}}}).weatherReason,/older than 2 hours/);
});
test('no registry cannot assign weather/cutoff or verify device mode by guessing names',()=>{
 const f=fixture();f.context.links={};const m=logicModel(f.hass,config,f.context,now);assert.equal(m.showWeather,false);assert.equal(m.reason,'Furnace-only mode not verified');
});
test('client loads only selected config ID and read-only registry, failures remain explicit',async()=>{
 const f=fixture(), calls=[];
 f.hass.callWS=async p=>{calls.push(p);return registry;};f.hass.callApi=async (method,path)=>{calls.push({method,path});return bp();};
 const c=await loadControlContext(f.hass,config);assert.equal(c.schedule.status,'ok');assert.equal(c.links.weatherId,weather);
 assert.deepEqual(calls,[{type:'config/entity_registry/list'},{method:'GET',path:'config/automation/config/real-id'}]);
 f.hass.callApi=async()=>{throw Error('403');};const unavailable=await loadControlContext(f.hass,config);assert.equal(unavailable.schedule.status,'configUnknown');assert.equal(unavailable.links.weatherId,weather);
 f.hass.callWS=async()=>{throw Error('no registry');};assert.deepEqual((await loadControlContext(f.hass,config)).links,{});
});
test('Chinese labels follow viewer and non-daily days are explicit',()=>{
 const f=fixture({weekdays:['mon']});f.hass.locale.language='zh';const m=logicModel(f.hass,config,f.context,now);assert.equal(m.status,'调度启用');assert.equal(m.windowText,'23:00–07:00 · 周一');assert.match(m.nextText,/07:00/);
});
test('24-hour strip follows window start-day semantics for overnight and same-day windows',()=>{
 const s=readSchedule(bp(),config);assert.deepEqual(dayTimeline(s,1),[[0,7*3600],[23*3600,86400]]);
 const monday=readSchedule(bp({weekdays:['mon']}),config);
 assert.deepEqual(dayTimeline(monday,0),[[23*3600,86400]]);assert.deepEqual(dayTimeline(monday,1),[[0,7*3600]]);assert.deepEqual(dayTimeline(monday,2),[]);
 assert.deepEqual(dayTimeline(readSchedule(bp({start_time:'08:00:00',end_time:'16:00:00',weekdays:['tue']}),config),1),[[8*3600,16*3600]]);
 assert.deepEqual(dayTimeline(readSchedule(bp({start_time:'22:00:00',end_time:'00:00:00'}),config),3),[[22*3600,86400]]);
});
test('next boundary countdown uses real elapsed time, including DST changes',()=>{
 const s=readSchedule(bp(),config),zone='America/Toronto';
 const at=d=>{const n=new Date(d);return nextBoundaryTime(scheduleAt(s,zone,n),zone,n);};
 assert.equal(at('2026-10-13T05:50:00Z'),Date.parse('2026-10-13T11:00:00Z'));
 assert.equal(at('2026-11-01T04:00:00Z'),Date.parse('2026-11-01T12:00:00Z'));
 assert.equal(at('2026-03-08T04:00:00Z'),Date.parse('2026-03-08T11:00:00Z'));
 assert.equal(at('2026-10-13T20:00:00Z'),Date.parse('2026-10-14T03:00:00Z'));
 const m=model();assert.equal(m.countdown,'in 5h 10m');assert.deepEqual(m.timeline,[[0,7*3600],[23*3600,86400]]);
});
