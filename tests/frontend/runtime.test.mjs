import test from 'node:test';
import assert from 'node:assert/strict';
import { runtimeReport, schedulePeriods, runtimeDuration, runtimePeriodStart, compactRuntimeDuration, loadRuntimeHistory, runtimeReportHTML, normalizeConfig, EcobeeDualFuelCard } from '../../ecobee-dual-fuel-card.js';
const MIN=60000, HOUR=60*MIN;
const zone='America/Toronto';
const schedule={status:'ok',start:'23:00:00',end:'07:00:00',days:['mon','tue','wed','thu','fri','sat','sun']};
const point=(date, equipment='', state='heat', extra={})=>({lu:Date.parse(date)/1000,s:state,a:{equipment_running:equipment,...extra}});
const report=(records,start,end,options={})=>runtimeReport(records,options.schedule||schedule,zone,Date.parse(start),Date.parse(end),options.gap||15);
function continuous(start,end,equipment) {const out=[];for(let t=Date.parse(start);t<=Date.parse(end);t+=5*MIN)out.push(point(new Date(t).toISOString(),equipment));return out;}

test('splits an actual heating run exactly at 07:00; stage 1+2 does not double count',()=>{
 const r=report([point('2026-10-13T10:55Z','fan,heatPump,heatPump2'),point('2026-10-13T11:05Z','')],'2026-10-13T10:55Z','2026-10-13T11:10Z');
 assert.equal(r.rows.heat.heat,5*MIN);assert.equal(r.rows.aux.heat,5*MIN);assert.equal(r.recorded,15*MIN);assert.equal(r.rows.aux.aux,0);
});
test('counts auxiliary heating in either window, excludes fan and compressor cooling',()=>{
 const r=report([point('2026-10-13T02:55Z','auxHeat1,auxHeat2,fan'),point('2026-10-13T03:05Z','fan,compCool1'),point('2026-10-13T03:10Z','fan,ventilator')],'2026-10-13T02:55Z','2026-10-13T03:15Z');
 assert.equal(r.rows.heat.aux,5*MIN);assert.equal(r.rows.aux.aux,5*MIN);assert.equal(r.rows.heat.heat,0);assert.equal(r.recorded,20*MIN);
});
test('unknown/unavailable/missing attribute/restored/unknown equipment are gaps, not idle',()=>{
 for(const record of [point('2026-10-13T04:00Z','auxHeat1','unavailable'),point('2026-10-13T04:00Z','','unknown'),{lu:Date.parse('2026-10-13T04:00Z')/1000,s:'heat'},point('2026-10-13T04:00Z','','heat',{restored:true}),point('2026-10-13T04:00Z','newUnknownEquipment')]){
 const r=report([record],'2026-10-13T04:00Z','2026-10-13T04:10Z');assert.equal(r.recorded,0);assert.equal(r.missing,r.rows.heat.total);assert.equal(r.rows.heat.heat,0);
 }
});
test('long historical and trailing gaps are excluded without carrying a run through an outage',()=>{
 const r=report([point('2026-10-13T04:00Z','heatPump'),point('2026-10-13T06:00Z','auxHeat1')],'2026-10-13T03:00Z','2026-10-13T07:00Z');
 assert.equal(r.recorded,0);assert.equal(r.missing,4*HOUR);assert.equal(r.rows.heat.heat,0);assert.equal(r.rows.heat.aux,0);
});
test('beginning and end clip real records; future and malformed timestamps ignored',()=>{
 const r=report([point('2026-10-13T04:00Z','heatPump'),{lu:'bad',s:'heat'},point('2026-10-13T04:10Z','auxHeat1'),point('2026-10-13T04:30Z','heatPump')],'2026-10-13T04:05Z','2026-10-13T04:15Z');
 assert.equal(r.rows.heat.heat,5*MIN);assert.equal(r.rows.heat.aux,5*MIN);assert.equal(r.recorded,10*MIN);
});
test('supports full REST-shaped records and uses last_updated rather than stale last_changed',()=>{
 const r=report([{state:'heat',last_updated:'2026-10-13T04:00Z',last_changed:'2026-10-10T04:00Z',attributes:{equipment_running:'heatPump2'}}],'2026-10-13T04:00Z','2026-10-13T04:05Z');
 assert.equal(r.rows.heat.heat,5*MIN);
});
test('sorts records and last duplicate wins',()=>{
 const r=report([point('2026-10-13T04:05Z',''),point('2026-10-13T04:00Z','heatPump'),point('2026-10-13T04:00Z','auxHeat1')],'2026-10-13T04:00Z','2026-10-13T04:10Z');
 assert.equal(r.rows.heat.heat,0);assert.equal(r.rows.heat.aux,5*MIN);
});
test('summer/winter clock changes use real elapsed duration in HA timezone',()=>{
 for(const [start,end,expected] of [['2026-11-01T03:00Z','2026-11-01T12:00Z',9],['2026-03-08T04:00Z','2026-03-08T11:00Z',7]]){
 const r=report(continuous(start,end,'heatPump'),start,end);assert.equal(r.rows.heat.heat,expected*HOUR);assert.equal(r.rows.aux.total,0);
 }
});
test('selected weekdays belong to window start day and seconds boundaries split precisely',()=>{
 const s={...schedule,days:['mon'],start:'23:00:30',end:'07:00:15'};
 const r=report(continuous('2026-10-13T02:55Z','2026-10-13T03:05Z','heatPump'),'2026-10-13T02:55Z','2026-10-13T03:05Z',{schedule:s});
 assert.equal(r.rows.heat.heat,4.5*MIN);assert.equal(r.rows.aux.heat,5.5*MIN);
 const sunday=report(continuous('2026-10-12T02:55Z','2026-10-12T03:05Z','heatPump'),'2026-10-12T02:55Z','2026-10-12T03:05Z',{schedule:s});assert.equal(sunday.rows.heat.total,0);
});
test('same-day window and simultaneous reports count each equipment once',()=>{
 const r=report(continuous('2026-10-13T13:55Z','2026-10-13T14:05Z','heatPump,auxHeat1'),'2026-10-13T13:55Z','2026-10-13T14:05Z',{schedule:{...schedule,start:'10:00',end:'12:00'}});
 assert.equal(r.rows.heat.heat,5*MIN);assert.equal(r.rows.heat.aux,5*MIN);assert.equal(r.rows.aux.heat,5*MIN);
});
test('empty week has missing coverage, not a false zero-runtime report',()=>{
 const end=Date.parse('2026-10-13T04:00Z');const r=runtimeReport([],schedule,zone,runtimePeriodStart(end,zone,schedule),end);assert.equal(r.missing,r.rows.heat.total+r.rows.aux.total);assert.equal(r.periods.heat.length,7);assert.equal(r.periods.aux.length,7);
 const html=runtimeReportHTML(r,'ok','en',schedule,zone,false,'heat',{expanded:true});assert.match(html,/No usable equipment history/);assert.equal((html.match(/class="report-empty"/g)||[]).length,(r.periods.heat.length+r.periods.aux.length)*6);
 const short=runtimeReportHTML(r,'ok','en',schedule,zone);assert.equal((short.match(/<tr class="win-/g)||[]).length,4);assert.match(short,/data-report-more aria-expanded="false">Show all 14 periods/);assert.match(html,/aria-expanded="true">Show recent periods/);assert.match(html,/Grouped by current analysis periods/);
});
test('renders coverage, localized durations, dates, disclosure, and escaped timezone',()=>{
 const r=report([point('2026-10-13T04:00Z','heatPump')],'2026-10-13T04:00Z','2026-10-13T04:05Z');
 assert.match(runtimeReportHTML(r,'ok','zh',schedule,zone,true),/最近 7 天/);assert.match(runtimeReportHTML(r,'ok','en',schedule,zone,true),/id="report-details" open/);
 assert.equal(runtimeDuration(61*MIN),'1 h 1 min');assert.equal(runtimeDuration(1000),'<1 min');assert.equal(runtimeDuration(0),'0 min');
 assert.match(runtimeReportHTML(null,'unavailable','en'),/Recorder/);assert.match(runtimeReportHTML(null,'needsSchedule','en'),/supported schedule/);
});
test('history request keeps attribute-only changes, no synthetic start state, one thermostat only',async()=>{
 let request;const end=Date.parse('2026-10-13T04:00Z');const hass={config:{time_zone:zone},callWS:async p=>{request=p;return {'climate.custom':[]}}};
 const r=await loadRuntimeHistory(hass,'climate.custom',end);assert.equal(r.start,Date.parse("2026-10-06T11:00Z"));assert.deepEqual(request.entity_ids,['climate.custom']);
 for(const key of ['minimal_response','no_attributes','significant_changes_only','include_start_time_state'])assert.equal(request[key],false);
 assert.equal(Date.parse(request.start_time),r.start-15*MIN);
 await assert.rejects(loadRuntimeHistory({callWS:async()=>{throw Error('denied')}},'climate.custom'));
 await assert.rejects(loadRuntimeHistory({callWS:async()=>({'climate.custom':{}})},'climate.custom'));
});
test('report controls validate configuration and preserve a manual off choice',()=>{
 assert.equal(normalizeConfig({}).show_runtime_report,true);assert.equal(normalizeConfig({show_runtime_report:false}).show_runtime_report,false);
 for(const value of [0,121,'15',NaN])assert.throws(()=>normalizeConfig({history_gap_minutes:value}));
 assert.throws(()=>normalizeConfig({show_runtime_report:'false'}));
});
test('refresh is throttled, old asynchronous result cannot overwrite edited card, and failures clear stale totals',async()=>{
 let calls=0,resolve;const records=[point('2026-10-13T04:00Z','heatPump')];
 const card=Object.create(EcobeeDualFuelCard.prototype);card._render=()=>{};
 card._config=normalizeConfig({entity:'climate.one'});card._controlContext={schedule};card._contextKey='one';
 card._hass={config:{time_zone:zone},callWS:()=>{calls++;return new Promise(r=>{resolve=r})}};
 const pending=card._refreshReport();await card._refreshReport();assert.equal(calls,1);
 card._config=normalizeConfig({entity:'climate.two',show_runtime_report:false});card._contextKey='two';await card._refreshReport();resolve({'climate.one':records});await pending;assert.equal(card._runtimeReport,null);
 card._config=normalizeConfig({entity:'climate.two'});card._hass.callWS=async()=>{calls++;throw Error('unavailable')};await card._refreshReport();assert.equal(card._reportStatus,'unavailable');assert.equal(card._runtimeReport,null);
 await card._refreshReport();assert.equal(calls,2);
});


test('history begins at the oldest complete period, not midnight',()=>{
 const now=Date.parse('2026-10-13T14:30Z');
 assert.equal(runtimePeriodStart(now,zone,schedule),Date.parse('2026-10-07T03:00Z'));
 assert.equal(runtimePeriodStart(Date.parse('2026-10-13T02:30Z'),zone,schedule),Date.parse('2026-10-06T03:00Z'));
 assert.throws(()=>runtimePeriodStart(Date.now()));
});
test('seven occurrences per window with explicit boundaries and current period',()=>{
 const end=Date.parse('2026-10-13T14:00Z'),start=runtimePeriodStart(end,zone,schedule);
 const r=runtimeReport([point('2026-10-13T10:55Z','heatPump'),point('2026-10-13T11:05Z','auxHeat1'),point('2026-10-13T11:10Z','')],schedule,zone,start,end);
 assert.equal(r.periods.heat.length,7);assert.equal(r.periods.aux.length,7);
 const heat=r.periods.heat[0],aux=r.periods.aux[0];
 assert.equal(heat.start,Date.parse('2026-10-13T03:00Z'));assert.equal(heat.end,Date.parse('2026-10-13T11:00Z'));assert.equal(heat.total,8*HOUR);assert.equal(heat.inProgress,false);
 assert.equal(aux.start,heat.end);assert.equal(aux.end,Date.parse('2026-10-14T03:00Z'));assert.equal(aux.total,3*HOUR);assert.equal(aux.inProgress,true);
 assert.equal(heat.heat,5*MIN);assert.equal(aux.heat,5*MIN);assert.equal(aux.aux,5*MIN);
 assert.equal(r.recorded,[...r.periods.heat,...r.periods.aux].reduce((n,p)=>n+p.recorded,0));
 const html=runtimeReportHTML(r,'ok','en',schedule,zone);assert.match(html,/Oct 12 → 13</);assert.match(html,/23:00–07:00/);
 assert.equal((html.match(/In progress/g)||[]).length,1);assert.ok(html.indexOf('In progress')<html.indexOf('Oct 12 → 13'),'current period is listed first');
 assert.equal(compactRuntimeDuration(80*MIN),'1h 20m');
});
test('midnight does not split one overnight run',()=>{
 const r=report(continuous('2026-10-13T03:55Z','2026-10-13T04:05Z','heatPump'),'2026-10-13T03:55Z','2026-10-13T04:05Z');
 assert.equal(r.periods.heat.length,1);assert.equal(r.periods.heat[0].heat,10*MIN);assert.equal(r.periods.heat[0].start,Date.parse('2026-10-13T03:00Z'));
});
test('DST whole overnight periods have seven or nine actual hours',()=>{
 for(const [end,expected] of [['2026-11-01T13:00Z',9],['2026-03-08T12:00Z',7]]) {
  const p=schedulePeriods(schedule,zone,Date.parse(end)).heat.at(-1);assert.equal(p.end-p.start,expected*HOUR);
 }
});
test('skipped weekdays form one continuous auxiliary period; seven weekly windows remain visible',()=>{
 const s={...schedule,days:['mon']},end=Date.parse('2026-10-13T14:00Z');
 const p=schedulePeriods(s,zone,end);assert.equal(p.heat.length,7);assert.equal(p.aux.length,7);
 assert.equal(p.aux.at(-1).start,Date.parse('2026-10-13T11:00Z'));assert.equal(p.aux.at(-1).end,Date.parse('2026-10-20T03:00Z'));
 assert.equal(p.heat.at(-1).start,Date.parse('2026-10-13T03:00Z'));assert.equal(p.heat[0].start,Date.parse('2026-09-01T03:00Z'));
});
test('exact boundary includes the newly started period but never a future period',()=>{
 for(const [at,kind] of [['2026-10-13T11:00Z','aux'],['2026-10-14T03:00Z','heat']]){
  const end=Date.parse(at),r=runtimeReport([],schedule,zone,runtimePeriodStart(end,zone,schedule),end),p=r.periods[kind][0];
  assert.equal(p.start,end);assert.equal(p.total,0);assert.equal(p.inProgress,true);
 }
});
test('same-day schedule and DST repeated-hour windows preserve actual policy transitions',()=>{
 const s={...schedule,start:'01:15:30',end:'01:45:15'};
 const p=schedulePeriods(s,zone,Date.parse('2026-11-01T08:00Z')).heat;
 assert.equal(p.at(-1).start,Date.parse('2026-11-01T06:15:30Z'));assert.equal(p.at(-2).start,Date.parse('2026-11-01T05:15:30Z'));
 assert.equal(p.at(-1).end-p.at(-1).start,29.75*MIN);
});

test('each source accumulates exclusive first/second stage duration within one overnight period',()=>{
 const r=report([
  point('2026-10-13T03:55Z','heatPump,auxHeat1,fan'),
  point('2026-10-13T04:00Z','heatPump,heatPump2,auxHeat1,auxHeat2,fan'),
  point('2026-10-13T04:10Z','fan'),
 ],'2026-10-13T03:55Z','2026-10-13T04:15Z');
 const p=r.periods.heat[0];
 assert.equal(p.heat,15*MIN);assert.equal(p.aux,15*MIN);
 assert.deepEqual(p.stages.heat,[5*MIN,10*MIN,0]);assert.deepEqual(p.stages.aux,[5*MIN,10*MIN,0]);
 assert.equal(p.heat,p.stages.heat.reduce((a,b)=>a+b,0));
 const html=runtimeReportHTML(r,'ok','en',schedule,zone);
 assert.equal((html.match(/class="runtime-line /g)||[]).length,6);
 assert.match(html,/Total<\/span><span class="runtime-value">15m/);
 assert.match(html,/Stage 1<\/span><span class="runtime-value">5m/);
 assert.match(html,/Stage 2<\/span><span class="runtime-value">10m/);
});
test('stage runtime is split at schedule boundaries while retaining both source stages',()=>{
 const r=report([point('2026-10-13T10:55Z','heatPump2,auxHeat2'),point('2026-10-13T11:05Z','')],'2026-10-13T10:55Z','2026-10-13T11:05Z');
 for(const kind of ['heat','aux'])for(const source of ['heat','aux'])assert.deepEqual(r.periods[kind][0].stages[source],[0,5*MIN,0]);
});
test('third-stage reports stay in total and are not relabelled as second stage',()=>{
 const r=report([point('2026-10-13T04:00Z','heatPump,heatPump2,heatPump3,auxHeat1,auxHeat2,auxHeat3')],'2026-10-13T04:00Z','2026-10-13T04:05Z');
 const p=r.periods.heat[0];assert.equal(p.heat,5*MIN);assert.equal(p.aux,5*MIN);
 assert.deepEqual(p.stages.heat,[0,0,5*MIN]);assert.deepEqual(p.stages.aux,[0,0,5*MIN]);
 assert.match(runtimeReportHTML(r,'ok','en',schedule,zone),/Stage 3 was reported/);
});
test('missing stage history stays missing while recorded fan-only activity is zero at both stages',()=>{
 const empty=report([],'2026-10-13T04:00Z','2026-10-13T04:05Z');
 const html=runtimeReportHTML(empty,'ok','en',schedule,zone);assert.equal((html.match(/class="report-empty"/g)||[]).length,6);
 const idle=report([point('2026-10-13T04:00Z','fan')],'2026-10-13T04:00Z','2026-10-13T04:05Z');
 assert.deepEqual(idle.periods.heat[0].stages,{heat:[0,0,0],aux:[0,0,0],cool:[0,0]});
 const zh=runtimeReportHTML(idle,'ok','zh',schedule,zone);assert.match(zh,/总计/);assert.match(zh,/一级/);assert.match(zh,/二级/);assert.doesNotMatch(zh,/class="report-empty"/);
});
