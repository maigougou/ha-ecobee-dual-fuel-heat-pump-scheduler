import test from 'node:test';
import assert from 'node:assert/strict';
import {cardModel, normalizeConfig, EcobeeDualFuelCard, EcobeeDualFuelEditor, runtimeReport, runtimeReportHTML, reportActivities, activityEnergy, combineEnergy, reportSchedule, editorSchema} from '../../ecobee-dual-fuel-card.js';
const zone='America/Toronto', MIN=60000, start=Date.parse('2026-10-13T10:55Z'), end=start+20*MIN;
const schedule={status:'ok',start:'23:00:00',end:'07:00:00',days:['mon','tue','wed','thu','fri','sat','sun']};
const config=normalizeConfig({entity:'climate.test',automation:'automation.test',aux_switch:'switch.test'});
const record=(m,eq)=>({lu:(start+m*MIN)/1000,s:'heat_cool',a:{equipment_running:eq}});
const history=[record(0,'heatPump2'),record(5,'compCool1,fan'),record(10,'compCool1,compCool2,fan'),record(15,'auxHeat2'),record(20,'')];
const points=w=>[0,5,10,15,20].map(m=>({lu:(start+m*MIN)/1000,s:String(w),a:{unit_of_measurement:'W'}}));
const power={heatPump:{status:'fulfilled',value:points(2000)},furnace:{status:'fulfilled',value:points(300)}};
const fixture=(mode,eq='')=>({language:'en',config:{time_zone:zone,unit_system:{temperature:'°C'}},states:{'climate.test':{state:mode,attributes:{current_temperature:23,temperature:24,target_temp_low:22,target_temp_high:24,current_humidity:50,equipment_running:eq,fan:'off'}},'automation.test':{state:'on'},'switch.test':{state:'off'}}});
function render(mode,eq='',override={}) {
 const card=Object.create(EcobeeDualFuelCard.prototype),parts={};
 card._config=normalizeConfig({...config,...override});card._hass=fixture(mode,eq);card._controlContext={schedule,links:{}};
 card.shadowRoot={querySelector:s=>s==='.grid'?{classList:{toggle(){}}}:null};card._ensureSkeleton=()=>{};card._setPart=(key,value)=>parts[key]=value;
 card._render();return {card,parts};
}
for (const mode of ['heat','cool','heat_cool','off','unavailable']) test(`${mode} layout follows thermostat mode without service calls`,()=>{
 const {parts}=render(mode);
 if (mode==='cool') {assert.match(parts.main,/Cool target/);assert.match(parts.main,/ecobee schedule/);assert.doesNotMatch(parts.main,/class="timeline"|class="source-main"|Heating: Not running|Furnace \/ blower/);}
 if (mode==='heat_cool') {assert.match(parts.main,/class="chip range" title="Heat 22 °C · Cool 24 °C"/);assert.match(parts.main,/>22<\/span><span class="dash">–<\/span><span>24 °C</);assert.match(parts.main,/Native Auto/);}
 if (mode!=='heat') {assert.equal(parts.controls,'');assert.doesNotMatch(parts.main,/class="timeline"|Next .*Furnace/);}
 if (mode==='off') {assert.doesNotMatch(parts.main,/class="equipment"|Target/);assert.match(parts.main,/Off/);}
 if(mode==='unavailable') assert.match(parts.main,/Unknown/);
});
test('Auto keeps its dual-target layout for cooling, furnace, heating, fan and idle',()=>{
 for(const eq of ['compCool2','auxHeat2','heatPump','fan','']){const {parts}=render('heat_cool',eq);assert.match(parts.main,/class="chip range"/);assert.match(parts.main,/class="equipment"/);}
});
test('reports cooling independently at highest stage, in both windows',()=>{
 const r=runtimeReport(history,schedule,zone,start,end);
 assert.equal(r.periods.heat[0].heat,5*MIN);assert.equal(r.periods.aux[0].cool,10*MIN);assert.deepEqual(r.periods.aux[0].stages.cool,[5*MIN,5*MIN]);assert.equal(r.periods.aux[0].aux,5*MIN);
 const html=runtimeReportHTML(r,'ok','en',schedule,zone,false,'aux',{mode:'cool',activity:'cooling',activities:['cooling']});
 assert.match(html,/Cooling report/);assert.doesNotMatch(html,/class="activity-tabs"/);assert.match(html,/07:00–23:00/);assert.match(html,/Total<\/span><span class="runtime-value">10m/);assert.doesNotMatch(html,/Furnace-only hours|>Furnace<\/th>/);
});
test('daytime cooling uses outdoor circuit plus optional blower and keeps furnace electricity separate',()=>{
 const run=scope=>activityEnergy(power,history,schedule,zone,start,end,normalizeConfig({...config,heat_pump_energy_scope:scope}));
 const sum=x=>Object.values(x.periods).reduce((a,p)=>a+p.kwh,0);
 const r=run('with_blower');assert(Math.abs(sum(r.cooling.aux)-2300/6/1000)<1e-9);assert(Math.abs(sum(r.heating.aux)-300/12/1000)<1e-9);
 assert(Math.abs(sum(run('outdoor_only').cooling.aux)-2000/6/1000)<1e-9);
});
test('shared blower circuit is attributed once when both heating sources are reported',()=>{
 const r=activityEnergy(power,[record(0,'heatPump,auxHeat1,fan'),record(5,'')],schedule,zone,start,start+5*MIN,config);
 const p=Object.values(r.heating.heat.periods)[0];assert(Math.abs(p.kwh-2300/12/1000)<1e-9);
});
test('actual circuit intersection is zero for disjoint coverage even when both have ten minutes',()=>{
 const r=combineEnergy({periods:{a:{kwh:1,recorded:10*MIN,coverage:[[0,10*MIN]]}}},{periods:{a:{kwh:2,recorded:10*MIN,coverage:[[10*MIN,20*MIN]]}}});
 assert.equal(r.periods.a.recorded,0);assert.equal(r.periods.a.kwh,3);assert.equal(r.periods.a.any,true);
});
test('failed indoor history preserves partial outdoor sum with no fabricated joint coverage',()=>{
 const r=activityEnergy({...power,furnace:{status:'rejected'}},history,schedule,zone,start,end,config).cooling.aux;
 assert.equal(r.partialSource,true);const p=Object.values(r.periods)[0];assert.equal(p.recorded,0);assert(p.kwh>0);assert(p.any);
});
test('contradictory cooling/heating is unverified and excluded from runtime and attributed electricity',()=>{
 const h=[record(0,'compCool1,auxHeat1'),record(5,'')];const r=runtimeReport(h,schedule,zone,start,start+5*MIN);
 assert.equal(r.recorded,0);assert.equal(cardModel(fixture('heat_cool','compCool1,auxHeat1'),config).activity,'unknown');
 assert.deepEqual(activityEnergy(power,h,schedule,zone,start,start+5*MIN,config).cooling.heat.periods,{});
});
test('independent analysis periods are explicit, validated and editable',()=>{
 const c=normalizeConfig({...config,report_schedule_source:'custom',report_start:'21:00:00',report_end:'06:00:00',report_days:['sat']});
 assert.deepEqual(reportSchedule(c,{schedule}),{status:'ok',start:'21:00:00',end:'06:00:00',days:['sat'],analysisOnly:true});
 assert.throws(()=>normalizeConfig({...c,report_days:[]}));assert.throws(()=>normalizeConfig({...c,report_end:'21:00:00'}));
 assert(editorSchema({},c).flatMap(g=>g.schema).some(f=>f.name==='report_days'));
});
test('an explicit report tab persists across live updates and returns when it applies again; all reports can be hidden',()=>{
 const pressed=a=>new RegExp(`data-report-activity="${a}" aria-pressed="true"`);
 const {card,parts}=render('heat_cool');card._runtimeReport=runtimeReport(history,schedule,zone,start,end);card._reportActivity='cooling';card._render();assert.match(parts.report,pressed('cooling'));
 card._hass=fixture('heat_cool','auxHeat2');card._render();assert.match(parts.report,pressed('cooling'),'furnace activity does not override the chosen tab');
 card._hass=fixture('heat');card._render();assert.match(parts.report,/Heating report/);assert.doesNotMatch(parts.report,/class="activity-tabs"/);
 card._hass=fixture('heat_cool');card._render();assert.match(parts.report,pressed('cooling'));
 card._config=normalizeConfig({...config,show_heating_report:false,show_cooling_report:false});card._render();assert.equal(parts.report,'');
});
test('duplicate circuit mapping gives a clear warning and does not produce electricity',async()=>{
 const {card,parts}=render('cool','',{heat_pump_power_entity:'sensor.same',furnace_power_entity:'sensor.same'});assert.match(parts.main,/same sensor/);
 card._contextKey='test';card._hass.callWS=async p=>({[p.entity_ids[0]]:[]});await card._refreshReport();assert.equal(card._runtimeReport.activityEnergy,undefined);
});

test('report tabs follow the HVAC mode and the title never contradicts them',()=>{
 const r=runtimeReport(history,schedule,zone,start,end);
 for (const [mode,title,tabs] of [['heat','Heating report',false],['cool','Cooling report',false],['heat_cool','Runtime report',true],['off','Runtime report',true],['unavailable','Runtime report',true]]) {
  const {card,parts}=render(mode);card._runtimeReport=r;card._render();
  assert.match(parts.report,new RegExp(`</ha-icon>${title}</span>`),mode);assert.equal(/class="activity-tabs"/.test(parts.report),tabs,mode);
 }
 assert.match(runtimeReportHTML(r,'ok','zh',schedule,zone,false,'heat',{mode:'off',activity:'heating',activities:['heating','cooling']}),/<\/ha-icon>运行报告<\/span>/);
 assert.deepEqual(reportActivities(normalizeConfig({...config,show_heating_report:false}),'heat'),['cooling'],'an explicit editor choice is still shown');
 assert.deepEqual(reportActivities(normalizeConfig({...config,show_cooling_report:false}),'heat_cool'),['heating']);
 assert.deepEqual(reportActivities(config,'cool'),['cooling']);
});
test('cooling history uses neutral period labels even while thermostat is in Heat',()=>{
 const r=runtimeReport(history,schedule,zone,start,end);
 const html=runtimeReportHTML(r,'ok','en',schedule,zone,false,'aux',{mode:'heat',activity:'cooling'});
 assert.match(html,/07:00–23:00/);assert.doesNotMatch(html,/Furnace-only hours/);
});
test('outdoor-only heat-pump scope still counts furnace heating in either schedule window',()=>{
 const r=activityEnergy(power,history,schedule,zone,start,end,normalizeConfig({...config,heat_pump_energy_scope:'outdoor_only'}));
 assert.deepEqual(r.heating.aux.circuits,['heatPump','furnace']);assert(Math.abs(Object.values(r.heating.aux.periods).reduce((a,p)=>a+p.kwh,0)-300/12/1000)<1e-9);
 assert(Math.abs(Object.values(r.heating.heat.periods).reduce((a,p)=>a+p.kwh,0)-2000/12/1000)<1e-9);
 assert.deepEqual(r.cooling.aux.circuits,['heatPump']);assert.deepEqual(r.fan,{});
});

test('editor initializes HA form schema before async hass/config arrive',()=>{
 const form={addEventListener(){}};
 EcobeeDualFuelEditor.prototype.attachShadow=function(){this.shadowRoot={innerHTML:'',querySelector:()=>form}};
 try { new EcobeeDualFuelEditor();assert.deepEqual(form.schema,[]);assert.deepEqual(form.data,{}); }
 finally { delete EcobeeDualFuelEditor.prototype.attachShadow; }
});

for(const startHour of ['04','16']) test(`300 W furnace for 30 minutes is 0.15 kWh with outdoor-only scope, UTC hour ${startHour}`,()=>{
 const a=Date.parse(`2026-10-13T${startHour}:00Z`),b=a+30*MIN;
 const h=[0,5,10,15,20,25,30].map(m=>({lu:(a+m*MIN)/1000,s:'heat',a:{equipment_running:m===30?'':'auxHeat1'}}));
 const p=w=>[0,5,10,15,20,25,30].map(m=>({lu:(a+m*MIN)/1000,s:String(w),a:{unit_of_measurement:'W'}}));
 const c=normalizeConfig({...config,heat_pump_energy_scope:'outdoor_only'});
 for(const sensors of [{heatPump:{status:'fulfilled',value:p(0)},furnace:{status:'fulfilled',value:p(300)}},{furnace:{status:'fulfilled',value:p(300)}}]){
  const r=runtimeReport(h,schedule,zone,a,b);r.activityEnergy=activityEnergy(sensors,h,schedule,zone,a,b,c);
  const window=startHour==='04'?'heat':'aux';
  assert(Math.abs(Object.values(r.activityEnergy.heating[window].periods).reduce((sum,p)=>sum+p.kwh,0)-.15)<1e-9);
  assert.match(runtimeReportHTML(r,'ok','en',schedule,zone,false,window,{activity:'heating'}),/>0\.15(?:<|$)/);
 }
});
test('furnace circuit history failure is partial instead of silently excluded by heat-pump scope',()=>{
 const r=activityEnergy({...power,furnace:{status:'rejected'}},history,schedule,zone,start,end,normalizeConfig({...config,heat_pump_energy_scope:'outdoor_only'}));
 assert.equal(r.heating.aux.partialSource,true);
});
