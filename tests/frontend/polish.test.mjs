import test from 'node:test';
import assert from 'node:assert/strict';
import {intersectIntervals, mergeHistory, recentActivity, watchedEntities, hassChanged, runtimeReport, runtimeReportHTML, runtimePeriodStart, normalizeConfig, EcobeeDualFuelCard, logicModel} from '../../ecobee-dual-fuel-card.js';
const zone='America/Toronto', MIN=60000, HOUR=60*MIN;
const schedule={status:'ok',start:'23:00:00',end:'07:00:00',days:['mon','tue','wed','thu','fri','sat','sun']};
const at=iso=>Date.parse(iso), rec=(iso,eq,s='heat')=>({lu:at(iso)/1000,s,a:{equipment_running:eq}});

test('incremental history keeps older records, lets newer ones win and drops records outside the window',()=>{
 const cached=[rec('2026-10-13T10:00Z','heatPump'),rec('2026-10-13T10:03Z','')], fresh=[{...rec('2026-10-13T10:03Z','auxHeat1')},rec('2026-10-13T10:06Z','')];
 const merged=mergeHistory(cached,fresh,at('2026-10-13T10:01Z'));
 assert.deepEqual(merged.map(r=>r.lu*1000),[at('2026-10-13T10:03Z'),at('2026-10-13T10:06Z')]);
 assert.equal(merged[0].a.equipment_running,'auxHeat1');
});

test('past 24 hours merges contiguous activity and marks gaps',()=>{
 const end=at('2026-10-13T10:50Z');
 const recs=[rec('2026-10-13T10:00Z','heatPump'),rec('2026-10-13T10:05Z','heatPump'),rec('2026-10-13T10:10Z','auxHeat1,fan'),rec('2026-10-13T10:20Z','compCool1'),rec('2026-10-13T10:30Z','fan'),rec('2026-10-13T10:40Z','')];
 const r=recentActivity(recs,end,15);
 assert.deepEqual(r.segments.map(s=>s.kind),['heat','aux','cool','fan','idle']);
 assert.equal(r.totals.heat,10*MIN);assert.equal(r.totals.aux,10*MIN);assert.equal(r.totals.cool,10*MIN);assert.equal(r.totals.fan,10*MIN);
 assert.equal(r.totals.idle,10*MIN);
 assert.equal(recentActivity(recs,at('2026-10-13T12:00Z'),15).totals.idle,0,'a record older than the gap limit is missing data, not idle');
});

test('unrelated entity changes do not redraw the card',()=>{
 const config=normalizeConfig({entity:'climate.t',automation:'automation.s',managed_auto_entity:'switch.m'});
 const ids=watchedEntities(config,{links:{weatherId:'weather.w'},schedule:{auxSwitch:'switch.a'}});
 for (const id of ['climate.t','automation.s','switch.m','weather.w','switch.a']) assert.ok(ids.includes(id));
 const states={'climate.t':{},'light.kitchen':{}}, base={states,config:{},locale:{}};
 assert.equal(hassChanged(base,{...base,states:{...states,'light.kitchen':{}}},ids),false);
 assert.equal(hassChanged(base,{...base,states:{...states,'climate.t':{}}},ids),true);
 assert.equal(hassChanged(base,{...base,locale:{}},ids),true);
 assert.equal(hassChanged(undefined,base,ids),true);
});

test('cross-day periods use a compact date that does not repeat the month',()=>{
 const end=at('2026-10-13T14:00Z'),r=runtimeReport([],schedule,zone,runtimePeriodStart(end,zone,schedule),end);
 assert.match(runtimeReportHTML(r,'ok','zh',schedule,zone),/10月12日 → 13日</);
 const month=at('2026-11-01T14:00Z'),m=runtimeReport([],schedule,zone,runtimePeriodStart(month,zone,schedule),month);
 assert.match(runtimeReportHTML(m,'ok','en',schedule,zone,false,'heat',{expanded:true}),/Oct 31 → Nov 1</);
});

function render(mode,eq='',override={},auxState='off',extra={}) {
 const card=Object.create(EcobeeDualFuelCard.prototype),parts={};
 card._config=normalizeConfig({entity:'climate.test',automation:'automation.test',aux_switch:'switch.test',...override});
 card._hass={language:'en',config:{time_zone:zone,unit_system:{temperature:'°C'}},states:{'climate.test':{state:mode,attributes:{current_temperature:21,temperature:21,target_temp_low:20,target_temp_high:24,equipment_running:eq,fan:'off'}},'automation.test':{state:'on',attributes:{id:'1'}},'switch.test':{state:auxState},...extra}};
 card._controlContext={schedule,links:{}};
 card.shadowRoot={querySelector:s=>s==='.grid'?{classList:{toggle(){}}}:null};card._ensureSkeleton=()=>{};card._setPart=(key,value)=>parts[key]=value;
 card._render();return parts;
}
test('Off is a calm panel, not a warning notice',()=>{
 const main=render('off').main;
 assert.match(main,/class="native-mode kind-idle"/);assert.match(main,/no heating or cooling/);assert.doesNotMatch(main,/class="notice"/);
});
test('activity text sits with the orb; idle shows nothing at the top right',()=>{
 const running=render('heat','auxHeat1').main;
 assert.match(running,/class="pulse kind-aux" role="status"><div class="orb kind-aux live"/);assert.match(running,/class="orb-label">Furnace heating · Stage 1</);
 assert.doesNotMatch(running,/class="activity /);
 const idle=render('heat','').main;
 assert.doesNotMatch(idle,/class="orb/);assert.match(idle,/class="sr" role="status">Idle</);
});
test('an unverified furnace-only switch is shown as a warning',()=>{
 const l=logicModel({language:'en',config:{time_zone:zone},states:{'automation.test':{state:'on'},'climate.test':{state:'heat',attributes:{}}}},normalizeConfig({entity:'climate.test',automation:'automation.test'}),{schedule,links:{}});
 assert.equal(l.tone,'warning');
});

test('coverage intersection is linear and matches the pairwise result',()=>{
 const a=[],b=[];for(let i=0;i<2000;i++){a.push([i*10,i*10+6]);b.push([i*10+3,i*10+9]);}
 const naive=(x,y)=>x.flatMap(([p,q])=>y.map(([r,s])=>[Math.max(p,r),Math.min(q,s)]).filter(([u,v])=>v>u));
 assert.deepEqual(intersectIntervals(a,b),naive(a,b));
 assert.deepEqual(intersectIntervals([[0,100]],[[50,60],[10,20]]),[[10,20],[50,60]]);
 const started=performance.now();const big=[];for(let i=0;i<50000;i++)big.push([i*10,i*10+6]);intersectIntervals(big,big);
 assert.ok(performance.now()-started<500);
});
test('furnace-only scheduling labels the heat-pump tile as off',()=>{
 assert.match(render('heat','',{},'on').main,/Off · Furnace-only mode/);
 assert.doesNotMatch(render('heat','',{},'off').main,/Furnace-only mode</);
});
test('the eyebrow does not repeat Managed Auto and the schedule toggle warns that off pauses it',()=>{
 const managed={'switch.m':{state:'on',attributes:{thermostat:'climate.test',owns_mode:true,status:'furnace_selected',device_mode:'auxHeatOnly',heat_target_c:20,cool_target_c:24}}};
 const parts=render('heat','',{managed_auto_entity:'switch.m'},'on',managed);
 assert.match(parts.main,/class="eyebrow">Indoor temperature</);assert.doesNotMatch(parts.main,/class="eyebrow">Managed Auto/);
 assert.match(parts.controls,/Off pauses Managed Auto/);
 assert.doesNotMatch(render('heat').controls,/Off pauses/);
});
test('Managed Auto keeps both report tabs even while the physical mode is furnace-only Heat',()=>{
 const managed={'switch.m':{state:'on',attributes:{thermostat:'climate.test',owns_mode:true,status:'furnace_selected',device_mode:'auxHeatOnly',heat_target_c:20,cool_target_c:24}}};
 const report=render('heat','',{managed_auto_entity:'switch.m'},'on',managed).report;
 assert.match(report,/<\/ha-icon>Runtime report<\/span>/);assert.match(report,/class="activity-tabs"/);
 assert.match(render('heat').report,/<\/ha-icon>Heating report<\/span>/);
});
test('a failed refresh keeps the last report and the recent strip, with a note',async()=>{
 const card=Object.create(EcobeeDualFuelCard.prototype);card._render=()=>{};card._contextKey='one';card._controlContext={schedule,links:{}};
 card._config=normalizeConfig({entity:'climate.one',show_runtime_report:true});
 let fail=false;card._hass={config:{time_zone:zone},callWS:async()=>{if(fail)throw Error('offline');return {'climate.one':[]}}};
 await card._refreshReport();const first=card._runtimeReport;assert.ok(first?.recent);assert.equal(card._reportStatus,'ok');
 fail=true;card._reportCheckedAt=0;const pending=card._refreshReport();
 assert.equal(card._reportStatus,'ok','a refresh does not switch back to loading');await pending;
 assert.equal(card._runtimeReport,first);assert.equal(card._reportStatus,'ok');assert.ok(card._reportStaleAt);
 assert.ok(Date.now()-card._reportCheckedAt>=240000,'retries sooner than the normal 5 minutes');
 const html=runtimeReportHTML(first,'ok','en',schedule,zone,false,'heat',{staleAt:Date.parse('2026-10-13T14:05Z')});
 assert.match(html,/class="report-note warn">Refresh failed · Showing data from 10:05</);
});
test('a hidden page skips history reads and redraws until it is visible again',async()=>{
 const listeners={};globalThis.document={hidden:true,addEventListener:(n,f)=>listeners[n]=f,removeEventListener(){}};
 try {
  const card=Object.create(EcobeeDualFuelCard.prototype);let renders=0,reads=0;card._render=()=>renders++;card._refreshContext=()=>{};card._contextKey='one';card._controlContext={schedule,links:{}};
  card._config=normalizeConfig({entity:'climate.one',show_runtime_report:true});
  card._hass={config:{time_zone:zone},states:{},callWS:async()=>{reads++;return {'climate.one':[]}}};
  await card._refreshReport();assert.equal(reads,0);
  card.hass={...card._hass,states:{'climate.one':{state:'heat'}}};assert.equal(renders,0);assert.equal(card._stale,true);
  card.connectedCallback();globalThis.document.hidden=false;listeners.visibilitychange();await new Promise(r=>setTimeout(r,0));
  assert.ok(reads>0);assert.ok(renders>0);card.disconnectedCallback();
 } finally { delete globalThis.document; }
});
