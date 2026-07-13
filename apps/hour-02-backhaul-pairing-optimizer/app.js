const STORAGE='backhaul-pairing-optimizer-v1';
const DEMO_OUTBOUND=[
  {id:'OB-201',origin:'Chicago, IL',destination:'Atlanta, GA',ready:'2026-07-14T07:30',deliver:'2026-07-14T22:00',equipment:'Dry Van',miles:716,emptyToPickup:42,sell:2460,buy:2040,risk:'low',notes:'Strong Midwest to Southeast headhaul; reliable shipper history.'},
  {id:'OB-202',origin:'Columbus, OH',destination:'Dallas, TX',ready:'2026-07-14T06:00',deliver:'2026-07-15T04:00',equipment:'Reefer',miles:1064,emptyToPickup:82,sell:3950,buy:3380,risk:'medium',notes:'Good gross dollars, appointment window is tighter.'},
  {id:'OB-203',origin:'Memphis, TN',destination:'Indianapolis, IN',ready:'2026-07-14T09:00',deliver:'2026-07-14T18:30',equipment:'Flatbed',miles:463,emptyToPickup:28,sell:1790,buy:1510,risk:'low',notes:'Short profitable hop for steel-friendly flatbed lanes.'}
];
const DEMO_RETURNS=[
  {id:'RT-301',origin:'Macon, GA',destination:'Louisville, KY',ready:'2026-07-15T07:00',deliver:'2026-07-15T19:00',equipment:'Dry Van',miles:512,emptyFromDrop:84,sell:1990,buy:1650,risk:'low',notes:'Return points north with low empty reposition from Atlanta.'},
  {id:'RT-302',origin:'Fort Worth, TX',destination:'St Louis, MO',ready:'2026-07-15T09:30',deliver:'2026-07-16T01:00',equipment:'Reefer',miles:640,emptyFromDrop:38,sell:2325,buy:1945,risk:'medium',notes:'Good return from DFW; cold-chain check needed.'},
  {id:'RT-303',origin:'Louisville, KY',destination:'Chicago, IL',ready:'2026-07-15T05:30',deliver:'2026-07-15T13:00',equipment:'Dry Van',miles:300,emptyFromDrop:115,sell:1220,buy:990,risk:'low',notes:'Fast reload loop back to the Chicago market.'},
  {id:'RT-304',origin:'Birmingham, AL',destination:'Nashville, TN',ready:'2026-07-15T16:00',deliver:'2026-07-15T21:00',equipment:'Flatbed',miles:192,emptyFromDrop:240,sell:820,buy:690,risk:'high',notes:'Looks short but empty reposition and risk hurt the loop.'}
];
const DEFAULTS={theme:'dark',maxEmpty:165,maxDwell:28,minMargin:15,minRpm:2.12,riskStance:'balanced',backupTarget:2,outbound:DEMO_OUTBOUND,returns:DEMO_RETURNS};
const $=id=>document.getElementById(id);
const money=n=>'$'+Math.round(Number(n)||0).toLocaleString();
const pct=n=>`${Math.round(Number(n)||0)}%`;
const num=v=>Number(v)||0;
function clone(v){return JSON.parse(JSON.stringify(v));}
let state=loadState();
function loadState(){try{return {...clone(DEFAULTS),...JSON.parse(localStorage.getItem(STORAGE)||'{}')}}catch{return clone(DEFAULTS)}}
function save(){localStorage.setItem(STORAGE,JSON.stringify(state));}
function hoursBetween(a,b){const diff=(new Date(b)-new Date(a))/36e5;return Number.isFinite(diff)?diff:999;}
function gross(load){return num(load.sell)-num(load.buy);}
function marginPct(sell,buy){return num(sell)?((num(sell)-num(buy))/num(sell))*100:0;}
function equipmentFit(a,b){return a.equipment===b.equipment?1:0;}
function riskPenalty(risk){return risk==='high'?18:risk==='medium'?7:0;}
function pairScore(outbound,ret){
  const empty=num(outbound.emptyToPickup)+num(ret.emptyFromDrop);
  const loaded=num(outbound.miles)+num(ret.miles);
  const sell=num(outbound.sell)+num(ret.sell);
  const buy=num(outbound.buy)+num(ret.buy);
  const grossDollars=sell-buy;
  const margin=marginPct(sell,buy);
  const rpm=sell/Math.max(loaded+empty,1);
  const dwell=hoursBetween(outbound.deliver,ret.ready);
  const compatible=equipmentFit(outbound,ret);
  const stance=state.riskStance==='strict'?1.25:state.riskStance==='opportunistic'?0.75:1;
  let score=42;
  score+=Math.min(24,margin*1.35);
  score+=Math.min(18,Math.max(0,(rpm-1.65)*18));
  score+=Math.max(-22,18-empty/9);
  score+=Math.max(-16,12-Math.abs(dwell-10)*0.7);
  score+=compatible?12:-28;
  score-=riskPenalty(outbound.risk)*stance+riskPenalty(ret.risk)*stance;
  const disqualifiers=[];
  if(!compatible)disqualifiers.push('equipment mismatch');
  if(empty>num(state.maxEmpty))disqualifiers.push('empty miles over cap');
  if(dwell<0)disqualifiers.push('return ready before delivery');
  if(dwell>num(state.maxDwell))disqualifiers.push('dwell over cap');
  if(margin<num(state.minMargin))disqualifiers.push('margin under floor');
  if(rpm<num(state.minRpm))disqualifiers.push('RPM under floor');
  const feasible=disqualifiers.length===0;
  if(!feasible)score-=22+disqualifiers.length*5;
  return {outbound,ret,empty,loaded,sell,buy,grossDollars,margin,rpm,dwell,score:Math.max(0,Math.min(99,Math.round(score))),feasible,disqualifiers};
}
function allPairs(){const pairs=[];state.outbound.forEach(o=>state.returns.forEach(r=>pairs.push(pairScore(o,r))));return pairs.sort((a,b)=>b.score-a.score||b.grossDollars-a.grossDollars);}
function coverageAudit(pairs=allPairs()){
  const groups={};
  pairs.forEach(p=>{const key=p.outbound.equipment;groups[key]=groups[key]||{equipment:key,total:0,feasible:0,backup:0,best:null,avgScore:0,blockers:{}};const g=groups[key];g.total+=1;if(p.feasible)g.feasible+=1;if(p.feasible&&p.score>=65)g.backup+=1;if(!g.best||p.score>g.best.score)g.best=p;g.avgScore+=p.score;p.disqualifiers.forEach(b=>g.blockers[b]=(g.blockers[b]||0)+1)});
  return Object.values(groups).map(g=>({...g,avgScore:g.total?g.avgScore/g.total:0,confidence:g.backup>=num(state.backupTarget)?'ready':g.feasible?'thin':'blocked'})).sort((a,b)=>b.backup-a.backup||b.avgScore-a.avgScore);
}
function rowEditor(kind,load,i){
  const fields=['id','origin','destination','ready','deliver','equipment','miles',kind==='outbound'?'emptyToPickup':'emptyFromDrop','sell','buy','risk','notes'];
  return `<article class="load-card" data-kind="${kind}" data-i="${i}"><div class="load-grid">${fields.map(k=>{
    const label=k==='emptyToPickup'?'empty to pickup':k==='emptyFromDrop'?'empty from drop':k;
    if(k==='risk')return `<label>${label}<select data-k="risk"><option ${load.risk==='low'?'selected':''}>low</option><option ${load.risk==='medium'?'selected':''}>medium</option><option ${load.risk==='high'?'selected':''}>high</option></select></label>`;
    if(k==='equipment')return `<label>${label}<select data-k="equipment"><option ${load.equipment==='Dry Van'?'selected':''}>Dry Van</option><option ${load.equipment==='Reefer'?'selected':''}>Reefer</option><option ${load.equipment==='Flatbed'?'selected':''}>Flatbed</option></select></label>`;
    const type=['miles','emptyToPickup','emptyFromDrop','sell','buy'].includes(k)?'number':['ready','deliver'].includes(k)?'datetime-local':'text';
    return `<label class="${k==='notes'?'wide':''}">${label}<input data-k="${k}" type="${type}" value="${String(load[k]??'').replace(/"/g,'&quot;')}"></label>`;
  }).join('')}</div><footer><span class="pill">gross ${money(gross(load))}</span><button class="danger" data-remove="${kind}:${i}">Remove</button></footer></article>`;
}
function renderPairs(){
  const pairs=allPairs();
  $('pairCount').textContent=`${pairs.length} pairs`;
  $('pairRows').innerHTML=pairs.slice(0,9).map((p,idx)=>{
    const klass=p.feasible&&p.score>=72?'good':p.score>=50?'warn':'bad';
    const blockers=p.disqualifiers.length?p.disqualifiers.join(', '):'clear within constraints';
    return `<article class="pair-card"><div class="pair-title"><div>#${idx+1} ${p.outbound.id} + ${p.ret.id}</div><small>score ${p.score}</small></div><p class="pair-route">${p.outbound.origin} → ${p.outbound.destination} · reload ${p.ret.origin} → ${p.ret.destination}</p><div class="tag-row"><span class="pill ${klass}">${p.feasible?'feasible loop':'review needed'}</span><span class="pill">${blockers}</span></div><div class="metric-grid"><div class="metric"><span>gross</span><strong>${money(p.grossDollars)}</strong></div><div class="metric"><span>margin</span><strong>${pct(p.margin)}</strong></div><div class="metric"><span>RPM</span><strong>$${p.rpm.toFixed(2)}</strong></div><div class="metric"><span>empty</span><strong>${Math.round(p.empty)} mi</strong></div><div class="metric"><span>dwell</span><strong>${p.dwell.toFixed(1)} hr</strong></div><div class="metric"><span>loaded</span><strong>${Math.round(p.loaded)} mi</strong></div></div></article>`;
  }).join('');
  const best=pairs.find(p=>p.feasible)||pairs[0];
  $('bestValue').textContent=best?money(best.grossDollars):'$0';
  $('bestLabel').textContent=best?`${best.outbound.id} + ${best.ret.id} · score ${best.score}`:'Waiting for pairings';
  $('plan').value=buildPlan(pairs);
  renderCoverage(pairs);
}
function renderCoverage(pairs=allPairs()){
  const audit=coverageAudit(pairs);
  const thin=audit.filter(a=>a.confidence!=='ready');
  $('coverageSummary').textContent=`${audit.length} equipment pools · ${thin.length} thin`;
  $('coverageRows').innerHTML=audit.map(a=>{const blocker=Object.entries(a.blockers).sort((x,y)=>y[1]-x[1])[0];const best=a.best?`${a.best.outbound.id}+${a.best.ret.id}`:'none';return `<article class="coverage-card"><h3>${a.equipment}</h3><span class="pill ${a.confidence==='ready'?'good':a.confidence==='thin'?'warn':'bad'}">${a.confidence}</span><p>${a.feasible}/${a.total} feasible candidate loops; ${a.backup} score-65+ backup loop(s) vs target ${state.backupTarget}.</p><p>Best: ${best} · avg score ${a.avgScore.toFixed(0)}${blocker?` · top blocker: ${blocker[0]} (${blocker[1]})`:''}</p></article>`}).join('');
}
function buildPlan(pairs=allPairs()){
  const feasible=pairs.filter(p=>p.feasible);
  const top=feasible[0]||pairs[0];
  const lines=['# Backhaul Pairing Optimizer plan','',`Generated: ${new Date().toLocaleString()}`,'Draft-only local planning output. Human broker approval required before quoting, posting, tendering, calling carriers, or writing any TMS/CRM.',''];
  if(!top){lines.push('No candidate pairs yet.');return lines.join('\n');}
  lines.push(`Best candidate: ${top.outbound.id} + ${top.ret.id}`);
  lines.push(`Route: ${top.outbound.origin} -> ${top.outbound.destination}; reload ${top.ret.origin} -> ${top.ret.destination}`);
  lines.push(`Gross ${money(top.grossDollars)} · margin ${pct(top.margin)} · RPM $${top.rpm.toFixed(2)} · empty ${Math.round(top.empty)} mi · dwell ${top.dwell.toFixed(1)} hr · score ${top.score}`);
  lines.push('');
  lines.push('## Broker review checklist');
  lines.push('- Confirm pickup/delivery windows and facility dwell history.');
  lines.push('- Verify equipment compatibility, cargo requirements, and insurance fit.');
  lines.push('- Recheck carrier availability and rate floor before any tender.');
  lines.push('- Keep this as a draft until a human approves all operational actions.');
  lines.push('');
  lines.push('## Ranked loop bench');
  pairs.slice(0,6).forEach((p,i)=>lines.push(`${i+1}. ${p.outbound.id}+${p.ret.id}: score ${p.score}, ${p.feasible?'feasible':'review'}, gross ${money(p.grossDollars)}, margin ${pct(p.margin)}, rpm $${p.rpm.toFixed(2)}, empty ${Math.round(p.empty)} mi, dwell ${p.dwell.toFixed(1)} hr${p.disqualifiers.length?`, blockers: ${p.disqualifiers.join('; ')}`:''}.`));
  lines.push('');
  lines.push('## Coverage confidence audit');
  coverageAudit(pairs).forEach(a=>lines.push(`- ${a.equipment}: ${a.confidence}, ${a.feasible}/${a.total} feasible loops, ${a.backup} score-65+ backups vs target ${state.backupTarget}, average score ${a.avgScore.toFixed(0)}.`));
  lines.push('');
  lines.push('## Monetization angle');
  lines.push('Package as a paid Backhaul loop-building module: surface profitable round trips from fragmented loadboard rows before a broker burns time manually checking deadhead, dwell, and margin floors.');
  lines.push('');
  lines.push('## Safety boundary');
  lines.push('No live scraping, carrier contact, load posting, TMS/CRM writes, EDI/API calls, spend, or customer-facing commitments happen here.');
  return lines.join('\n');
}
function render(){
  document.documentElement.dataset.theme=state.theme;
  $('themeToggle').textContent=state.theme==='light'?'Dark':'Light';
  ['maxEmpty','maxDwell','minMargin','minRpm','riskStance','backupTarget'].forEach(k=>{$(k).value=state[k];});
  $('outboundCount').textContent=`${state.outbound.length}`;
  $('returnCount').textContent=`${state.returns.length}`;
  $('outboundRows').innerHTML=state.outbound.map((l,i)=>rowEditor('outbound',l,i)).join('');
  $('returnRows').innerHTML=state.returns.map((l,i)=>rowEditor('returns',l,i)).join('');
  document.querySelectorAll('[data-k]').forEach(el=>el.addEventListener('input',()=>{const card=el.closest('.load-card');state[card.dataset.kind][Number(card.dataset.i)][el.dataset.k]=el.value;save();renderPairs();}));
  document.querySelectorAll('[data-remove]').forEach(btn=>btn.addEventListener('click',()=>{const [kind,i]=btn.dataset.remove.split(':');state[kind].splice(Number(i),1);save();render();toast('Load removed');}));
  renderPairs();save();
}
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),1600);}
function download(name,text,type){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
function csv(){const header='rank,outbound,return,score,feasible,gross,margin,rpm,empty_miles,dwell_hours,blockers';return [header,...allPairs().map((p,i)=>[i+1,p.outbound.id,p.ret.id,p.score,p.feasible,p.grossDollars,p.margin.toFixed(1),p.rpm.toFixed(2),Math.round(p.empty),p.dwell.toFixed(1),p.disqualifiers.join('; ')].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');}
['maxEmpty','maxDwell','minMargin','minRpm','riskStance','backupTarget'].forEach(k=>$(k).addEventListener('input',()=>{state[k]=$(k).value;save();renderPairs();}));
$('loadDemo').onclick=()=>{state={...clone(DEFAULTS),theme:state.theme};render();toast('Demo loop board loaded');};
$('addOutbound').onclick=()=>{state.outbound.push({id:`OB-${Date.now().toString().slice(-4)}`,origin:'New origin',destination:'New drop',ready:'2026-07-14T08:00',deliver:'2026-07-14T20:00',equipment:'Dry Van',miles:520,emptyToPickup:55,sell:2050,buy:1740,risk:'medium',notes:'Manual outbound candidate'});render();toast('Outbound added');};
$('addReturn').onclick=()=>{state.returns.push({id:`RT-${Date.now().toString().slice(-4)}`,origin:'Reload market',destination:'Home market',ready:'2026-07-15T08:00',deliver:'2026-07-15T18:00',equipment:'Dry Van',miles:430,emptyFromDrop:65,sell:1725,buy:1440,risk:'medium',notes:'Manual return candidate'});render();toast('Return added');};
$('themeToggle').onclick=()=>{state.theme=state.theme==='light'?'dark':'light';render();};
$('copyPlan').onclick=()=>navigator.clipboard?.writeText($('plan').value).then(()=>toast('Plan copied')).catch(()=>{$('plan').focus();$('plan').select();});
$('downloadJson').onclick=()=>download('backhaul-pairing-optimizer.json',JSON.stringify({constraints:{maxEmpty:state.maxEmpty,maxDwell:state.maxDwell,minMargin:state.minMargin,minRpm:state.minRpm,riskStance:state.riskStance,backupTarget:state.backupTarget},outbound:state.outbound,returns:state.returns,pairs:allPairs(),coverageAudit:coverageAudit(),plan:buildPlan(),safety:'local draft only'},null,2),'application/json');
$('downloadCsv').onclick=()=>download('backhaul-pairing-optimizer.csv',csv(),'text/csv');

/* Hour 04 cumulative enhancement: vetting friction audit for loop candidates. */
function vettingFrictionAudit(pairs=allPairs()){
  const pool={'Dry Van':{ready:6,doc:12},'Reefer':{ready:3,doc:22},'Flatbed':{ready:2,doc:18},'Power Only':{ready:1,doc:28}};
  return pairs.slice(0,12).map(p=>{const a=pool[p.outbound.equipment]||{ready:1,doc:25}; let friction=a.doc; if(!p.feasible)friction+=18; if(p.outbound.risk==='high'||p.ret.risk==='high')friction+=16; if(p.outbound.risk==='medium'||p.ret.risk==='medium')friction+=7; if(p.empty>num(state.maxEmpty))friction+=10; if(p.dwell>num(state.maxDwell))friction+=8; friction+=Math.max(0,2-a.ready)*10; const cleared=friction<=num(state.maxVettingFriction||35)&&a.ready>0&&p.feasible; return {...p,readyCarriers:a.ready,docMinutes:a.doc,vettingFriction:Math.round(friction),vettingStatus:cleared?'clear':friction<=num(state.maxVettingFriction||35)+15?'manual review':'high friction'};}).sort((a,b)=>a.vettingFriction-b.vettingFriction||b.score-a.score);
}
const __h4PairingBasePlan=buildPlan;
buildPlan=function(pairs=allPairs()){const base=__h4PairingBasePlan(pairs); const audit=vettingFrictionAudit(pairs); return base.replace('\n## Monetization angle', `\n## Vetting friction audit\n${audit.slice(0,6).map((a,i)=>`${i+1}. ${a.outbound.id}+${a.ret.id}: ${a.vettingStatus}, friction ${a.vettingFriction}, ready carriers ${a.readyCarriers}, estimated document check ${a.docMinutes} min.`).join('\n')}\n\n## Monetization angle`);};
const __h4PairingBaseRenderPairs=renderPairs;
renderPairs=function(){__h4PairingBaseRenderPairs(); const audit=vettingFrictionAudit(); const high=audit.filter(a=>a.vettingStatus!=='clear'); if($('vettingSummary'))$('vettingSummary').textContent=`${high.length} review/high-friction · ${audit.length} loops checked`; if($('vettingRows'))$('vettingRows').innerHTML=audit.slice(0,8).map(a=>`<article class="coverage-card"><h3>${a.outbound.id}+${a.ret.id}</h3><span class="pill ${a.vettingStatus==='clear'?'good':a.vettingStatus==='manual review'?'warn':'bad'}">${a.vettingStatus}</span><p>${a.readyCarriers} ready carrier(s); vetting friction ${a.vettingFriction} vs max ${state.maxVettingFriction||35}.</p><p>Doc check ${a.docMinutes} min · loop score ${a.score} · ${a.feasible?'feasible':'constraint review'}</p></article>`).join(''); if($('plan'))$('plan').value=buildPlan(); save();};
const __h4PairingBaseRender=render;
render=function(){__h4PairingBaseRender(); if(state.maxVettingFriction===undefined)state.maxVettingFriction=35; const ctl=$('maxVettingFriction'); if(ctl)ctl.value=state.maxVettingFriction;};
if(state.maxVettingFriction===undefined)state.maxVettingFriction=35;
const __h4VettingCtl=$('maxVettingFriction'); if(__h4VettingCtl)__h4VettingCtl.addEventListener('input',()=>{state.maxVettingFriction=__h4VettingCtl.value;save();renderPairs();});
$('downloadJson').onclick=()=>download('backhaul-pairing-optimizer.json',JSON.stringify({constraints:{maxEmpty:state.maxEmpty,maxDwell:state.maxDwell,minMargin:state.minMargin,minRpm:state.minRpm,riskStance:state.riskStance,backupTarget:state.backupTarget,maxVettingFriction:state.maxVettingFriction},outbound:state.outbound,returns:state.returns,pairs:allPairs(),coverageAudit:coverageAudit(),vettingFrictionAudit:vettingFrictionAudit(),plan:buildPlan(),safety:'local draft only'},null,2),'application/json');
const __h4PairingBaseCsv=csv;
csv=function(){const header='rank,outbound,return,score,feasible,gross,margin,rpm,empty_miles,dwell_hours,vetting_status,vetting_friction,ready_carriers,blockers';return [header,...allPairs().map((p,i)=>{const v=vettingFrictionAudit([p])[0]; return [i+1,p.outbound.id,p.ret.id,p.score,p.feasible,p.grossDollars,p.margin.toFixed(1),p.rpm.toFixed(2),Math.round(p.empty),p.dwell.toFixed(1),v.vettingStatus,v.vettingFriction,v.readyCarriers,p.disqualifiers.join('; ')].map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')})].join('\n');};

/* Hour 05 cumulative enhancement: driver hours feasibility audit for loop candidates. */
function driverHoursAudit(pairs=allPairs()){
  const maxDay=num(state.maxDriveHours||10), buffer=num(state.hosBuffer||1.5);
  return pairs.slice(0,12).map(p=>{const driveHours=(p.loaded+p.empty)/52; const days=Math.max(1,Math.ceil(driveHours/Math.max(1,maxDay-buffer))); const dwellWindow=Math.max(0,p.dwell); const feasibleHos=p.feasible && (driveHours/days)<=maxDay && dwellWindow>=buffer; const pressure=Math.round((driveHours/days)/(maxDay||10)*100); const status=feasibleHos?'clock-ready':p.feasible?'tight clock':'blocked'; return {...p,driveHours,driverDays:days,clockPressure:pressure,hosStatus:status};}).sort((a,b)=>b.clockPressure-a.clockPressure||b.score-a.score);
}
const __h5PairingBasePlan=buildPlan;
buildPlan=function(pairs=allPairs()){const base=__h5PairingBasePlan(pairs); const audit=driverHoursAudit(pairs); return base.replace('\n## Monetization angle', `\n## Driver hours feasibility audit\n${audit.slice(0,6).map((a,i)=>`${i+1}. ${a.outbound.id}+${a.ret.id}: ${a.hosStatus}, ${a.driveHours.toFixed(1)} estimated drive hours across ${a.driverDays} day(s), clock pressure ${a.clockPressure}%.`).join('\n')}\n\n## Monetization angle`);};
const __h5PairingBaseRenderPairs=renderPairs;
renderPairs=function(){__h5PairingBaseRenderPairs(); const audit=driverHoursAudit(); const tight=audit.filter(a=>a.hosStatus!=='clock-ready'); if($('hosSummary'))$('hosSummary').textContent=`${tight.length} tight/blocked · ${audit.length} loops checked`; if($('hosRows'))$('hosRows').innerHTML=audit.slice(0,8).map(a=>`<article class="coverage-card"><h3>${a.outbound.id}+${a.ret.id}</h3><span class="pill ${a.hosStatus==='clock-ready'?'good':a.hosStatus==='tight clock'?'warn':'bad'}">${a.hosStatus}</span><p>${a.driveHours.toFixed(1)} drive hours · ${a.driverDays} driver day(s) · ${a.clockPressure}% pressure.</p><p>Dwell ${a.dwell.toFixed(1)} hr vs HOS buffer ${state.hosBuffer||1.5} hr.</p></article>`).join(''); if($('plan'))$('plan').value=buildPlan(); save();};
const __h5PairingBaseRender=render;
render=function(){__h5PairingBaseRender(); if(state.maxDriveHours===undefined)state.maxDriveHours=10; if(state.hosBuffer===undefined)state.hosBuffer=1.5; ['maxDriveHours','hosBuffer'].forEach(k=>{const ctl=$(k); if(ctl)ctl.value=state[k];});};
if(state.maxDriveHours===undefined)state.maxDriveHours=10; if(state.hosBuffer===undefined)state.hosBuffer=1.5;
['maxDriveHours','hosBuffer'].forEach(k=>{const ctl=$(k); if(ctl)ctl.addEventListener('input',()=>{state[k]=ctl.value;save();renderPairs();});});
$('downloadJson').onclick=()=>download('backhaul-pairing-optimizer.json',JSON.stringify({constraints:{maxEmpty:state.maxEmpty,maxDwell:state.maxDwell,minMargin:state.minMargin,minRpm:state.minRpm,riskStance:state.riskStance,backupTarget:state.backupTarget,maxVettingFriction:state.maxVettingFriction,maxDriveHours:state.maxDriveHours,hosBuffer:state.hosBuffer},outbound:state.outbound,returns:state.returns,pairs:allPairs(),coverageAudit:coverageAudit(),vettingFrictionAudit:vettingFrictionAudit(),driverHoursAudit:driverHoursAudit(),plan:buildPlan(),safety:'local draft only'},null,2),'application/json');
csv=function(){const header='rank,outbound,return,score,feasible,gross,margin,rpm,empty_miles,dwell_hours,hos_status,drive_hours,driver_days,clock_pressure,blockers';return [header,...allPairs().map((p,i)=>{const h=driverHoursAudit([p])[0]; return [i+1,p.outbound.id,p.ret.id,p.score,p.feasible,p.grossDollars,p.margin.toFixed(1),p.rpm.toFixed(2),Math.round(p.empty),p.dwell.toFixed(1),h.hosStatus,h.driveHours.toFixed(1),h.driverDays,h.clockPressure,p.disqualifiers.join('; ')].map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')})].join('\n');};
/* Hour 06 cumulative enhancement: loop lifecycle handoff timeline. */
function loopLifecycleTimeline(pairs=allPairs()){
  const buffer=num(state.lifecycleHandoffBuffer||2);
  return pairs.slice(0,12).map(p=>{const dispatchBy=new Date(new Date(p.outbound.ready).getTime()-buffer*36e5); const reloadGap=p.dwell; const milestones=[`dispatch by ${dispatchBy.toLocaleString()}`,`pickup ${p.outbound.ready}`,`deliver ${p.outbound.deliver}`,`reload ${p.ret.ready}`,`return deliver ${p.ret.deliver}`]; const blockers=[]; if(reloadGap<buffer)blockers.push('reload buffer tight'); if(!p.feasible)blockers.push(...p.disqualifiers); if(p.outbound.risk==='high'||p.ret.risk==='high')blockers.push('high risk leg'); const status=blockers.length===0?'handoff-ready':blockers.length<=2?'timeline watch':'handoff blocked'; return {...p,lifecycleStatus:status,lifecycleBlockers:blockers.length?blockers:['milestones have usable handoff buffer'],milestones};}).sort((a,b)=>a.lifecycleBlockers.length-b.lifecycleBlockers.length||b.score-a.score);
}
const __h6PairingBasePlan=buildPlan;
buildPlan=function(pairs=allPairs()){const base=__h6PairingBasePlan(pairs); const audit=loopLifecycleTimeline(pairs); return base.replace('\n## Monetization angle', `\n## Loop lifecycle handoff timeline\n${audit.slice(0,6).map((a,i)=>`${i+1}. ${a.outbound.id}+${a.ret.id}: ${a.lifecycleStatus}, blockers/checks: ${a.lifecycleBlockers.join('; ')}.`).join('\n')}\n\n## Monetization angle`);};
const __h6PairingBaseRenderPairs=renderPairs;
renderPairs=function(){__h6PairingBaseRenderPairs(); const audit=loopLifecycleTimeline(); const watch=audit.filter(a=>a.lifecycleStatus!=='handoff-ready'); if($('timelineSummary'))$('timelineSummary').textContent=`${watch.length} watch/blocked · ${audit.length} loops checked`; if($('timelineRows'))$('timelineRows').innerHTML=audit.slice(0,8).map(a=>`<article class="coverage-card"><h3>${a.outbound.id}+${a.ret.id}</h3><span class="pill ${a.lifecycleStatus==='handoff-ready'?'good':a.lifecycleStatus==='timeline watch'?'warn':'bad'}">${a.lifecycleStatus}</span><p>${a.lifecycleBlockers.join('; ')}</p><p>${a.milestones.slice(0,3).join(' · ')}</p></article>`).join(''); if($('plan'))$('plan').value=buildPlan(); save();};
const __h6PairingBaseRender=render;
render=function(){__h6PairingBaseRender(); if(state.lifecycleHandoffBuffer===undefined)state.lifecycleHandoffBuffer=2; const ctl=$('lifecycleHandoffBuffer'); if(ctl)ctl.value=state.lifecycleHandoffBuffer;};
if(state.lifecycleHandoffBuffer===undefined)state.lifecycleHandoffBuffer=2;
const __h6TimelineCtl=$('lifecycleHandoffBuffer'); if(__h6TimelineCtl)__h6TimelineCtl.addEventListener('input',()=>{state.lifecycleHandoffBuffer=__h6TimelineCtl.value;save();renderPairs();});
$('downloadJson').onclick=()=>download('backhaul-pairing-optimizer.json',JSON.stringify({constraints:{maxEmpty:state.maxEmpty,maxDwell:state.maxDwell,minMargin:state.minMargin,minRpm:state.minRpm,riskStance:state.riskStance,backupTarget:state.backupTarget,maxVettingFriction:state.maxVettingFriction,maxDriveHours:state.maxDriveHours,hosBuffer:state.hosBuffer,lifecycleHandoffBuffer:state.lifecycleHandoffBuffer},outbound:state.outbound,returns:state.returns,pairs:allPairs(),coverageAudit:coverageAudit(),vettingFrictionAudit:vettingFrictionAudit(),driverHoursAudit:driverHoursAudit(),loopLifecycleTimeline:loopLifecycleTimeline(),plan:buildPlan(),safety:'local draft only'},null,2),'application/json');
const __h6PairingBaseCsv=csv;
csv=function(){const header='rank,outbound,return,score,feasible,gross,margin,rpm,empty_miles,dwell_hours,hos_status,lifecycle_status,lifecycle_blockers';return [header,...allPairs().map((p,i)=>{const h=driverHoursAudit([p])[0]; const t=loopLifecycleTimeline([p])[0]; return [i+1,p.outbound.id,p.ret.id,p.score,p.feasible,p.grossDollars,p.margin.toFixed(1),p.rpm.toFixed(2),Math.round(p.empty),p.dwell.toFixed(1),h.hosStatus,t.lifecycleStatus,t.lifecycleBlockers.join('; ')].map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')})].join('\n');};
/* Hour 07 cumulative enhancement: loop detention buffer audit. */
function loopDetentionBufferAudit(pairs=allPairs()){
  const buffer=num(state.detentionBufferHours||1);
  return pairs.slice(0,14).map(p=>{const dwellExposure=Math.max(0,buffer-p.dwell)+((p.outbound.risk==='high'||p.ret.risk==='high')?0.75:0)+((p.outbound.equipment==='Reefer'||p.ret.equipment==='Reefer')?0.5:0); const reserve=Math.round(dwellExposure*95); const blockers=[]; if(p.dwell<buffer)blockers.push('reload dwell buffer below target'); if(p.outbound.risk!=='low')blockers.push(`outbound ${p.outbound.risk} risk`); if(p.ret.risk!=='low')blockers.push(`return ${p.ret.risk} risk`); if(!p.feasible)blockers.push(...p.disqualifiers); const status=reserve>=140?'detention-blocked':reserve>0?'reserve loop':'clean buffer'; return {...p,detentionReserve:reserve,detentionStatus:status,detentionBlockers:blockers.length?blockers:['loop dwell buffer clears detention target']};}).sort((a,b)=>b.detentionReserve-a.detentionReserve||b.score-a.score);
}
const __h7PairingBasePlan=buildPlan;
buildPlan=function(pairs=allPairs()){const base=__h7PairingBasePlan(pairs); const audit=loopDetentionBufferAudit(pairs); return base.replace('\n## Monetization angle', `\n## Loop detention buffer audit\n${audit.slice(0,6).map((a,i)=>`${i+1}. ${a.outbound.id}+${a.ret.id}: ${a.detentionStatus}, reserve ${money(a.detentionReserve)}, checks: ${a.detentionBlockers.join('; ')}.`).join('\n')}\n\n## Monetization angle`);};
const __h7PairingBaseRenderPairs=renderPairs;
renderPairs=function(){__h7PairingBaseRenderPairs(); const audit=loopDetentionBufferAudit(); const watch=audit.filter(a=>a.detentionStatus!=='clean buffer'); if($('detentionLoopSummary'))$('detentionLoopSummary').textContent=`${watch.length} reserve/blocked · ${audit.length} loops checked`; if($('detentionLoopRows'))$('detentionLoopRows').innerHTML=audit.slice(0,8).map(a=>`<article class="coverage-card"><h3>${a.outbound.id}+${a.ret.id}</h3><span class="pill ${a.detentionStatus==='clean buffer'?'good':a.detentionStatus==='reserve loop'?'warn':'bad'}">${a.detentionStatus}</span><p>Reserve ${money(a.detentionReserve)} · dwell ${a.dwell.toFixed(1)} hr</p><p>${a.detentionBlockers.join('; ')}</p></article>`).join(''); if($('plan'))$('plan').value=buildPlan(); save();};
const __h7PairingBaseRender=render;
render=function(){__h7PairingBaseRender(); if(state.detentionBufferHours===undefined)state.detentionBufferHours=1; const ctl=$('detentionBufferHours'); if(ctl)ctl.value=state.detentionBufferHours;};
if(state.detentionBufferHours===undefined)state.detentionBufferHours=1;
const __h7LoopDetentionCtl=$('detentionBufferHours'); if(__h7LoopDetentionCtl)__h7LoopDetentionCtl.addEventListener('input',()=>{state.detentionBufferHours=__h7LoopDetentionCtl.value;save();renderPairs();});
$('downloadJson').onclick=()=>download('backhaul-pairing-optimizer.json',JSON.stringify({constraints:{...state},outbound:state.outbound,returns:state.returns,pairs:allPairs(),coverageAudit:coverageAudit(),vettingFrictionAudit:vettingFrictionAudit(),driverHoursAudit:driverHoursAudit(),loopLifecycleTimeline:loopLifecycleTimeline(),loopDetentionBufferAudit:loopDetentionBufferAudit(),plan:buildPlan(),safety:'local draft only'},null,2),'application/json');
/* Hour 08 cumulative enhancement: loop appointment sync audit. */
function loopAppointmentSyncAudit(pairs=allPairs()){return pairs.slice(0,14).map(p=>{const reloadBuffer=p.dwell-num(state.lifecycleHandoffBuffer||2); const drivePressure=(p.loaded+p.empty)/52/Math.max(1,num(state.maxDriveHours||10))*100; let score=82+Math.min(10,reloadBuffer*2)-Math.max(0,drivePressure-95)*0.45-Math.max(0,p.empty-num(state.maxEmpty))*0.08; if(!p.feasible)score-=18; if(p.outbound.risk==='high'||p.ret.risk==='high')score-=10; score=Math.max(0,Math.min(100,Math.round(score))); const blockers=[]; if(reloadBuffer<0)blockers.push('reload appointment buffer short'); if(drivePressure>100)blockers.push('driver clock pressure'); if(p.empty>num(state.maxEmpty))blockers.push('empty miles hurt appointment recovery'); if(!p.feasible)blockers.push(...p.disqualifiers); const status=score>=76?'appointment-synced':score>=56?'sync watch':'sync blocked'; return {...p,appointmentSyncScore:score,appointmentSyncStatus:status,appointmentSyncBlockers:blockers.length?blockers:['appointments align with loop buffer'],reloadBuffer,drivePressure};}).sort((a,b)=>a.appointmentSyncScore-b.appointmentSyncScore||a.reloadBuffer-b.reloadBuffer);}
const __h8PairingBasePlan=buildPlan;
buildPlan=function(pairs=allPairs()){const base=__h8PairingBasePlan(pairs); const audit=loopAppointmentSyncAudit(pairs); return base.replace('\n## Monetization angle', `\n## Loop appointment sync audit\n${audit.slice(0,6).map((a,i)=>`${i+1}. ${a.outbound.id}+${a.ret.id}: ${a.appointmentSyncStatus}, score ${a.appointmentSyncScore}%, reload buffer ${a.reloadBuffer.toFixed(1)} hr, checks: ${a.appointmentSyncBlockers.join('; ')}.`).join('\n')}\n\n## Monetization angle`);};
const __h8PairingBaseRenderPairs=renderPairs;
renderPairs=function(){__h8PairingBaseRenderPairs(); const audit=loopAppointmentSyncAudit(); const watch=audit.filter(a=>a.appointmentSyncStatus!=='appointment-synced'); if($('appointmentSyncSummary'))$('appointmentSyncSummary').textContent=`${watch.length} watch/blocked · ${audit.length} loops checked`; if($('appointmentSyncRows'))$('appointmentSyncRows').innerHTML=audit.slice(0,8).map(a=>`<article class="coverage-card"><h3>${a.outbound.id}+${a.ret.id}</h3><span class="pill ${a.appointmentSyncStatus==='appointment-synced'?'good':a.appointmentSyncStatus==='sync watch'?'warn':'bad'}">${a.appointmentSyncStatus}</span><p>Score ${a.appointmentSyncScore}% · reload buffer ${a.reloadBuffer.toFixed(1)} hr · drive pressure ${a.drivePressure.toFixed(0)}%.</p><p>${a.appointmentSyncBlockers.join('; ')}</p></article>`).join(''); if($('plan'))$('plan').value=buildPlan(); save();};
$('downloadJson').onclick=()=>download('backhaul-pairing-optimizer.json',JSON.stringify({constraints:{...state},outbound:state.outbound,returns:state.returns,pairs:allPairs(),coverageAudit:coverageAudit(),vettingFrictionAudit:vettingFrictionAudit(),driverHoursAudit:driverHoursAudit(),loopLifecycleTimeline:loopLifecycleTimeline(),loopDetentionBufferAudit:loopDetentionBufferAudit(),loopAppointmentSyncAudit:loopAppointmentSyncAudit(),plan:buildPlan(),safety:'local draft only'},null,2),'application/json');

/* Hour 09 cumulative enhancement: loop document readiness audit. */
function loopDocumentReadinessAudit(pairs=allPairs()){return pairs.slice(0,14).map(p=>{let score=86; const blockers=[]; if(!p.feasible){score-=20; blockers.push('loop not feasible; do not build packet');} if(p.outbound.risk!=='low'||p.ret.risk!=='low'){score-=12; blockers.push('risk notes needed on both legs');} if(p.margin<num(state.minMargin)){score-=10; blockers.push('margin exception needs approval document');} if(p.dwell>num(state.maxDwell)){score-=8; blockers.push('dwell exception should be in tender/load file');} if(p.empty>num(state.maxEmpty)){score-=7; blockers.push('empty-mile exception proof needed');} score=Math.max(0,Math.min(100,Math.round(score))); const status=score>=78?'packet-ready':score>=58?'packet review':'packet blocker'; return {...p,documentReadinessScore:score,documentReadinessStatus:status,documentReadinessBlockers:blockers.length?blockers:['outbound/return packet facts are ready for review']};}).sort((a,b)=>a.documentReadinessScore-b.documentReadinessScore||b.totalRevenue-a.totalRevenue);}
const __h9PairingBasePlan=buildPlan;
buildPlan=function(pairs=allPairs()){const base=__h9PairingBasePlan(pairs); const audit=loopDocumentReadinessAudit(pairs); return base.replace('\n## Monetization angle', `\n## Loop document readiness audit\n${audit.slice(0,6).map((a,i)=>`${i+1}. ${a.outbound.id}+${a.ret.id}: ${a.documentReadinessStatus}, score ${a.documentReadinessScore}%, checks: ${a.documentReadinessBlockers.join('; ')}.`).join('\n')}\n\n## Monetization angle`);};
const __h9PairingBaseRenderPairs=renderPairs;
renderPairs=function(){__h9PairingBaseRenderPairs(); const audit=loopDocumentReadinessAudit(); const review=audit.filter(a=>a.documentReadinessStatus!=='packet-ready'); if($('loopDocumentSummary'))$('loopDocumentSummary').textContent=`${review.length} review/blocker · ${audit.length} loops checked`; if($('loopDocumentRows'))$('loopDocumentRows').innerHTML=audit.slice(0,8).map(a=>`<article class="coverage-card"><h3>${a.outbound.id}+${a.ret.id}</h3><span class="pill ${a.documentReadinessStatus==='packet-ready'?'good':a.documentReadinessStatus==='packet review'?'warn':'bad'}">${a.documentReadinessStatus}</span><p>Score ${a.documentReadinessScore}% · margin ${a.margin.toFixed(1)}%.</p><p>${a.documentReadinessBlockers.join('; ')}</p></article>`).join(''); if($('plan'))$('plan').value=buildPlan(); save();};
$('downloadJson').onclick=()=>download('backhaul-pairing-optimizer.json',JSON.stringify({constraints:{...state},outbound:state.outbound,returns:state.returns,pairs:allPairs(),coverageAudit:coverageAudit(),vettingFrictionAudit:vettingFrictionAudit(),driverHoursAudit:driverHoursAudit(),loopLifecycleTimeline:loopLifecycleTimeline(),loopDetentionBufferAudit:loopDetentionBufferAudit(),loopAppointmentSyncAudit:loopAppointmentSyncAudit(),loopDocumentReadinessAudit:loopDocumentReadinessAudit(),plan:buildPlan(),safety:'local draft only'},null,2),'application/json');

render();
