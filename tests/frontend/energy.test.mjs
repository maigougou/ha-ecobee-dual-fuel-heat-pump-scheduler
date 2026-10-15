import test from 'node:test';
import assert from 'node:assert/strict';
import {periodEnergy, runtimeReport, runtimeReportHTML, runtimePeriodStart, reportEnergySources, equipmentIntervals, combineEnergy, ENERGY_ATTRIBUTION, loadPowerHistory, normalizeConfig, EcobeeDualFuelCard, editorSchema} from '../../ecobee-dual-fuel-card.js';
const zone='America/Toronto', MIN=60000, HOUR=3600000;
const schedule={status:'ok',start:'23:00:00',end:'07:00:00',days:['mon','tue','wed','thu','fri','sat','sun']};
const power=(time,value,unit='W',extra={})=>({lu:Date.parse(time)/1000,s:String(value),a:{unit_of_measurement:unit,...extra}});
const energy=(points,start,end,method='trapezoidal',s=schedule,window='heat')=>periodEnergy(points,s,zone,Date.parse(start),Date.parse(end),15,method,window);
const near=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('integrates W and kW to energy, never watts times equipment runtime',()=>{
 for(const [v,unit] of [[1000,'W'],[1,'kW']]){
 const r=energy([power('2026-10-13T04:00Z',v,unit),power('2026-10-13T04:10Z',v,unit)],'2026-10-13T04:00Z','2026-10-13T04:10Z');
 near(r.periods['heat:'+Date.parse('2026-10-13T03:00Z')].kwh,1/6);assert.equal(r.periods['heat:'+Date.parse('2026-10-13T03:00Z')].recorded,10*MIN);
 }
});
test('trapezoidal/left/right use correct integration and clipping at a schedule boundary',()=>{
 const points=[power('2026-10-13T10:55Z',0),power('2026-10-13T11:05Z',2000)];
 near(energy(points,'2026-10-13T10:55Z','2026-10-13T11:05Z').periods['heat:'+Date.parse('2026-10-13T03:00Z')].kwh,500*5/60/1000);
 near(energy(points,'2026-10-13T10:55Z','2026-10-13T11:05Z','left').periods['heat:'+Date.parse('2026-10-13T03:00Z')].kwh,0);
 near(energy(points,'2026-10-13T10:55Z','2026-10-13T11:05Z','right').periods['heat:'+Date.parse('2026-10-13T03:00Z')].kwh,2000*5/60/1000);
});
test('keeps cross-midnight energy in one schedule period and excludes auxiliary-only time',()=>{
 const r=energy([power('2026-10-13T03:55Z',1200),power('2026-10-13T04:05Z',1200),power('2026-10-13T11:05Z',3000),power('2026-10-13T11:10Z',3000)],'2026-10-13T03:55Z','2026-10-13T11:10Z');
 assert.equal(Object.keys(r.periods).length,1);near(r.periods['heat:'+Date.parse('2026-10-13T03:00Z')].kwh,.2);
});
test('invalid units, negative readings, missing data and restored states are never energy',()=>{
 for(const p of [power('2026-10-13T04:00Z',-1),power('2026-10-13T04:00Z','unavailable'),power('2026-10-13T04:00Z',1,'kWh'),power('2026-10-13T04:00Z',1,'W',{restored:true}),{lu:Date.parse('2026-10-13T04:00Z')/1000,s:'1000',a:{}}]){
 const r=energy([p,power('2026-10-13T04:05Z',1000)],'2026-10-13T04:00Z','2026-10-13T04:05Z');assert.deepEqual(r.periods,{});
 }
});
test('long gaps and unpaired endpoints do not extrapolate energy',()=>{
 for(const points of [[power('2026-10-13T04:00Z',1000)],[power('2026-10-13T04:00Z',1000),power('2026-10-13T04:30Z',1000)]])assert.deepEqual(energy(points,'2026-10-13T04:00Z','2026-10-13T04:30Z').periods,{});
});
test('known zero power is zero energy with coverage, not missing',()=>{
 const r=energy([power('2026-10-13T04:00Z',0),power('2026-10-13T04:05Z',0)],'2026-10-13T04:00Z','2026-10-13T04:05Z');assert.equal(r.periods['heat:'+Date.parse('2026-10-13T03:00Z')].kwh,0);assert.equal(r.periods['heat:'+Date.parse('2026-10-13T03:00Z')].recorded,5*MIN);
});
test('each report window uses its own configured circuit; no sensors or switches off hide it',()=>{
 assert.deepEqual(reportEnergySources(normalizeConfig({})),{heatPump:null,furnace:null});
 assert.deepEqual(reportEnergySources(normalizeConfig({furnace_power_entity:'sensor.furnace'})),{heatPump:null,furnace:'sensor.furnace'});
 assert.deepEqual(reportEnergySources(normalizeConfig({heat_pump_power_entity:'sensor.arbitrary'})),{heatPump:'sensor.arbitrary',furnace:null});
 assert.deepEqual(reportEnergySources(normalizeConfig({heat_pump_power_entity:'sensor.arbitrary',furnace_power_entity:'sensor.furnace',show_energy_report:false})),{heatPump:null,furnace:null});
 assert.deepEqual(reportEnergySources(normalizeConfig({heat_pump_power_entity:'sensor.arbitrary',furnace_power_entity:'sensor.furnace',show_runtime_report:false})),{heatPump:null,furnace:null});
 assert.throws(()=>normalizeConfig({energy_integration_method:'guess'}));assert.throws(()=>normalizeConfig({show_energy_report:'true'}));
});
test('adds heat-pump circuit energy to the heat-pump window and marks partial values; no sensor leaves layout intact',()=>{
 const start=Date.parse('2026-10-13T04:00Z'),end=start+10*MIN;
 const r=runtimeReport([],schedule,zone,start,end);
 assert.doesNotMatch(runtimeReportHTML(r,'ok','en',schedule,zone),/kWh/);
 r.energy={heat:{...energy([power('2026-10-13T04:00Z',1200),power('2026-10-13T04:05Z',1200)],'2026-10-13T04:00Z','2026-10-13T04:10Z'),status:'ok'}};
 const html=runtimeReportHTML(r,'ok','en',schedule,zone);assert.match(html,/<th scope="col" title="kWh ≈ Heat pump running, incl. blower · Estimated from power">kWh ≈<\/th>/);assert.match(html,/0.10<sup>\*<\/sup>/);assert.match(html,/the furnace circuit, which then powers the blower/);
 r.energy={heat:{status:'unavailable',periods:{},method:'trapezoidal'}};assert.match(runtimeReportHTML(r,'ok','en',schedule,zone),/Power history unavailable/);
 assert.match(runtimeReportHTML(r,'ok','zh',schedule,zone),/热泵运行（含送风机）/);
});
test('history API queries only selected power entity and retains units',async()=>{
 let payload;const r=await loadPowerHistory({callWS:async p=>{payload=p;return {'sensor.custom':[]}}},'sensor.custom',Date.now()-HOUR,Date.now(),15);
 assert.deepEqual(r,[]);assert.deepEqual(payload.entity_ids,['sensor.custom']);assert.equal(payload.no_attributes,false);assert.equal(payload.minimal_response,false);assert.equal(payload.include_start_time_state,false);
 await assert.rejects(loadPowerHistory({callWS:async()=>({'sensor.custom':{}})},'sensor.custom',0,HOUR,15));
});
test('power history failure preserves runtime, and changing power sensor invalidates the report cache',async()=>{
 const card=Object.create(EcobeeDualFuelCard.prototype);card._render=()=>{};card._contextKey='one';card._controlContext={schedule};
 card._config=normalizeConfig({entity:'climate.one',heat_pump_power_entity:'sensor.one',furnace_power_entity:'sensor.furnace'});
 const requests=[];card._hass={config:{time_zone:zone},callWS:async p=>{requests.push(p.entity_ids[0]);if(p.entity_ids[0].startsWith('sensor.'))throw Error('denied');return {'climate.one':[]}}};
 await card._refreshReport();assert.equal(card._reportStatus,'ok');assert.equal(card._runtimeReport.activityEnergy.heating.heat.status,'unavailable');assert.equal(card._runtimeReport.activityEnergy.heating.aux.status,'unavailable');assert.deepEqual(requests,['climate.one','sensor.one','sensor.furnace']);
 card._config=normalizeConfig({...card._config,heat_pump_power_entity:'sensor.two'});await card._refreshReport();assert.equal(requests.at(-2),'sensor.two');
 card._config=normalizeConfig({...card._config,show_energy_report:false});await card._refreshReport();assert.equal(requests.at(-1),'climate.one');assert.equal(card._runtimeReport.activityEnergy,undefined);
});
test('DST repeated local hour integrates actual elapsed time',()=>{
 const points=[];for(let t=Date.parse('2026-11-01T05:00Z');t<=Date.parse('2026-11-01T07:00Z');t+=5*MIN)points.push(power(new Date(t).toISOString(),1000));
 const r=energy(points,'2026-11-01T05:00Z','2026-11-01T07:00Z');near(r.periods['heat:'+Date.parse('2026-11-01T03:00Z')].kwh,2);
});

test('merged report lists both windows and keeps an aligned, empty kWh cell when the furnace has no sensor',()=>{
 const start=Date.parse('2026-10-13T10:55Z'),end=start+15*MIN;
 const r=runtimeReport([{lu:start/1000,s:'heat',a:{equipment_running:'heatPump'}},{lu:(start+10*MIN)/1000,s:'heat',a:{equipment_running:'auxHeat1'}}],schedule,zone,start,end);
 r.energy={heat:{status:'ok',method:'trapezoidal',periods:{['heat:'+Date.parse('2026-10-13T03:00Z')]:{kwh:1,recorded:5*MIN}}}};
 const html=runtimeReportHTML(r,'ok','en',schedule,zone);
 assert.match(html,/kWh ≈<\/th>/);assert.match(html,/with-energy/);assert.match(html,/<td class="energy-cell" title="No power sensor selected for this circuit"><\/td>/);assert.match(html,/>1.00</);assert.doesNotMatch(html,/data-report-window/);
 assert.match(html,/class="win-heat/);assert.match(html,/class="win-aux/);assert.ok(html.indexOf('win-aux')<html.indexOf('win-heat'),'newest period first');
 assert.doesNotMatch(html,/report-context|Outside heat-pump hours/);assert.match(html,/5m<\/span>/);assert.match(html,/0m<sup>\*<\/sup>/);
});

test('furnace circuit energy is integrated only in furnace-only periods and shown on those rows',()=>{
 const points=[power('2026-10-13T10:50Z',300),power('2026-10-13T11:00Z',300),power('2026-10-13T11:10Z',300)];
 const aux=energy(points,'2026-10-13T10:50Z','2026-10-13T11:10Z','trapezoidal',schedule,'aux');
 const id='aux:'+Date.parse('2026-10-13T11:00Z');
 assert.deepEqual(Object.keys(aux.periods),[id]);near(aux.periods[id].kwh,300*10/60/1000);assert.equal(aux.periods[id].recorded,10*MIN);
 const heat=energy(points,'2026-10-13T10:50Z','2026-10-13T11:10Z');assert.deepEqual(Object.keys(heat.periods),['heat:'+Date.parse('2026-10-13T03:00Z')]);
 const start=Date.parse('2026-10-13T11:00Z'),end=start+10*MIN;
 const r=runtimeReport([],schedule,zone,start,end);r.energy={aux:{...aux,status:'ok'}};
 const html=runtimeReportHTML(r,'ok','en',schedule,zone);
 assert.match(html,/title="kWh ≈ Furnace running · Estimated from power">kWh ≈<\/th>/);assert.match(html,/>0\.05<\/td>/);assert.match(html,/not gas use/);assert.match(html,/Fan-only, ventilation and standby are excluded/);
 assert.match(runtimeReportHTML(r,'ok','zh',schedule,zone),/炉子运行 · /);
});

test('energy is attributed only while ecobee reports that equipment running; heat-pump blower comes from the furnace circuit',()=>{
 // Heat-pump window 23:00-07:00 Toronto = 03:00Z-11:00Z. 04:00-04:10 heat pump, 04:10-04:20 idle, 04:20-04:30 furnace backup, 04:30-04:40 fan only.
 const t=m=>new Date(Date.parse('2026-10-13T04:00Z')+m*MIN).toISOString();
 const state=(m,eq)=>({lu:Date.parse(t(m))/1000,s:'heat',a:{equipment_running:eq}});
 const climate=[state(0,'heatPump,fan'),state(5,'heatPump2,fan'),state(10,''),state(15,''),state(20,'auxHeat1'),state(25,'auxHeat1'),state(30,'fan'),state(35,'fan'),state(40,'')];
 const intervals=equipmentIntervals(climate,Date.parse(t(40)),15);
 const flat=v=>[0,10,20,30,40].map(m=>power(t(m),v));
 const hp=flat(3000),furnace=flat(300),id='heat:'+Date.parse('2026-10-13T03:00Z');
 const run=(points,active)=>periodEnergy(points,schedule,zone,Date.parse(t(0)),Date.parse(t(40)),15,'trapezoidal','heat',{intervals,active});
 const hpOnly=run(hp,ENERGY_ATTRIBUTION.heatPump).periods[id],blower=run(furnace,ENERGY_ATTRIBUTION.heatPumpBlower).periods[id];
 near(hpOnly.kwh,3000*10/60/1000);assert.equal(hpOnly.recorded,40*MIN);
 near(blower.kwh,300*10/60/1000);
 const total=combineEnergy(run(hp,ENERGY_ATTRIBUTION.heatPump),run(furnace,ENERGY_ATTRIBUTION.heatPumpBlower)).periods[id];
 near(total.kwh,(3000+300)*10/60/1000);assert.equal(total.recorded,40*MIN);
 near(run(furnace,ENERGY_ATTRIBUTION.furnace).periods[id].kwh,300*10/60/1000);
});
test('unknown equipment state is not coverage, and combined coverage follows the weaker circuit',()=>{
 const t=m=>new Date(Date.parse('2026-10-13T04:00Z')+m*MIN).toISOString();
 const climate=[{lu:Date.parse(t(0))/1000,s:'heat',a:{equipment_running:'heatPump'}},{lu:Date.parse(t(10))/1000,s:'unavailable',a:{}},{lu:Date.parse(t(20))/1000,s:'heat',a:{equipment_running:'heatPump'}}];
 const intervals=equipmentIntervals(climate,Date.parse(t(20)),15),id='heat:'+Date.parse('2026-10-13T03:00Z');
 const r=periodEnergy([power(t(0),1000),power(t(10),1000),power(t(20),1000)],schedule,zone,Date.parse(t(0)),Date.parse(t(20)),15,'trapezoidal','heat',{intervals,active:ENERGY_ATTRIBUTION.heatPump}).periods[id];
 near(r.kwh,1000*10/60/1000);assert.equal(r.recorded,10*MIN);
 const c=combineEnergy({periods:{[id]:{kwh:1,recorded:10*MIN}},method:'trapezoidal'},{periods:{},method:'trapezoidal'}).periods[id];
 assert.equal(c.kwh,1);assert.equal(c.recorded,0);assert.equal(c.any,true);
});
test('card refresh combines heat-pump and blower energy, and furnace energy uses furnace running time',async()=>{
 const card=Object.create(EcobeeDualFuelCard.prototype);card._render=()=>{};card._contextKey='one';card._controlContext={schedule};
 card._config=normalizeConfig({entity:'climate.one',heat_pump_power_entity:'sensor.hp',furnace_power_entity:'sensor.furnace'});
 const now=Date.now(),at=m=>new Date(now-m*MIN).toISOString();
 const climate=[];for(let m=60;m>=0;m-=5)climate.push({lu:Date.parse(at(m))/1000,s:'heat',a:{equipment_running:m>30?'heatPump':'auxHeat1'}});
 const flat=v=>{const p=[];for(let m=60;m>=0;m-=5)p.push(power(at(m),v));return p;};
 card._hass={config:{time_zone:zone},callWS:async p=>({[p.entity_ids[0]]:p.entity_ids[0]==='climate.one'?climate:p.entity_ids[0]==='sensor.hp'?flat(2000):flat(400)})};
 await card._refreshReport();
 const e=card._runtimeReport.activityEnergy.heating;assert.equal(e.heat.status,'ok');assert.equal(e.aux.status,'ok');assert.deepEqual(e.heat.circuits,['heatPump','furnace']);
 const sum=w=>Object.values(e[w].periods).reduce((a,b)=>a+b.kwh,0),hours=w=>card._runtimeReport.periods[w].reduce((a,p)=>a+p.heat+p.aux,0);
 // Each circuit's energy can never exceed its power times the matching reported runtime.
 assert(sum('heat')<=(2000+400)*card._runtimeReport.periods.heat.reduce((a,p)=>a+p.heat,0)/3600000000+400*card._runtimeReport.periods.heat.reduce((a,p)=>a+p.aux,0)/3600000000+1e-9);
 assert(sum('aux')<=card._runtimeReport.periods.aux.reduce((a,p)=>a+(2400*p.heat+400*p.aux)/3600000000,0)+1e-9);
 assert(hours('heat')+hours('aux')>0);
});
