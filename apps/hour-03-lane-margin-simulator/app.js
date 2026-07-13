const STORAGE='lane-margin-simulator-v1';
const DEMO_LANES=[
  {id:'LN-301',origin:'Chicago, IL',destination:'Atlanta, GA',equipment:'Dry Van',miles:716,buyRpm:2.82,sellRpm:3.42,fuelRpm:0.48,accessorials:175,risk:'low',volume:12,notes:'Core Midwest to Southeast lane with strong backhaul demand.'},
  {id:'LN-302',origin:'Columbus, OH',destination:'Dallas, TX',equipment:'Reefer',miles:1064,buyRpm:3.05,sellRpm:3.70,fuelRpm:0.52,accessorials:280,risk:'medium',volume:8,notes:'Reefer exposure and longer haul require stronger buffer.'},
  {id:'LN-303',origin:'Savannah, GA',destination:'Louisville, KY',equipment:'Dry Van',miles:612,buyRpm:3.12,sellRpm:3.55,fuelRpm:0.47,accessorials:225,risk:'high',volume:6,notes:'Port-adjacent dwell and appointment volatility; quote defensively.'},
  {id:'LN-304',origin:'Memphis, TN',destination:'Indianapolis, IN',equipment:'Flatbed',miles:463,buyRpm:3.25,sellRpm:3.95,fuelRpm:0.50,accessorials:140,risk:'low',volume:10,notes:'Short steel-friendly flatbed lane with useful margin pool.'}
];
const DEFAULTS={theme:'dark',fuelRpm:0.48,targetMargin:16,riskBuffer:5,accessorialReserve:3,pricingStance:'balanced',lanes:DEMO_LANES};
const $=id=>document.getElementById(id);
const money=n=>'$'+Math.round(Number(n)||0).toLocaleString();
const pct=n=>`${Math.round(Number(n)||0)}%`;
const num=v=>Number(v)||0;
function clone(v){return JSON.parse(JSON.stringify(v));}
let state=loadState();
function loadState(){try{return {...clone(DEFAULTS),...JSON.parse(localStorage.getItem(STORAGE)||'{}')}}catch{return clone(DEFAULTS)}}
function save(){localStorage.setItem(STORAGE,JSON.stringify(state));}
function riskMultiplier(risk){return risk==='high'?1.55:risk==='medium'?1.15:0.75;}
function stanceMultiplier(){return state.pricingStance==='defensive'?1.22:state.pricingStance==='aggressive'?0.82:1;}
function laneCalc(lane){
  const miles=Math.max(num(lane.miles),1);
  const fuel=num(lane.fuelRpm)||num(state.fuelRpm);
  const buyBase=num(lane.buyRpm)*miles;
  const currentSell=num(lane.sellRpm)*miles;
  const fuelCost=fuel*miles;
  const accessorial=num(lane.accessorials);
  const riskReserve=(buyBase+fuelCost+accessorial)*(num(state.riskBuffer)/100)*riskMultiplier(lane.risk)*stanceMultiplier();
  const accessorialReserve=accessorial*(num(state.accessorialReserve)/100+0.08);
  const protectedBuy=buyBase+fuelCost+accessorial+riskReserve+accessorialReserve;
  const targetMargin=num(state.targetMargin)/100;
  const suggestedSell=Math.ceil((protectedBuy/(1-Math.min(0.6,Math.max(0.01,targetMargin))))/25)*25;
  const suggestedRpm=suggestedSell/miles;
  const currentGross=currentSell-protectedBuy;
  const suggestedGross=suggestedSell-protectedBuy;
  const currentMargin=currentSell?currentGross/currentSell*100:0;
  const suggestedMargin=suggestedSell?suggestedGross/suggestedSell*100:0;
  const lift=Math.max(0,suggestedSell-currentSell);
  const monthlyPool=suggestedGross*num(lane.volume);
  let quality=55+Math.min(24,suggestedMargin*1.2)-Math.min(16,Math.max(0,lift/currentSell*100))*1.1+Math.min(12,num(lane.volume));
  if(lane.risk==='high')quality-=12; if(lane.risk==='medium')quality-=5;
  return {miles,buyBase,currentSell,fuelCost,accessorial,riskReserve,accessorialReserve,protectedBuy,suggestedSell,suggestedRpm,currentGross,suggestedGross,currentMargin,suggestedMargin,lift,monthlyPool,quality:Math.max(0,Math.min(99,Math.round(quality)))};
}
function scoredLanes(){return state.lanes.map(l=>({...l,...laneCalc(l)})).sort((a,b)=>b.monthlyPool-a.monthlyPool||b.quality-a.quality);}
function qaChecks(){
  const lanes=scoredLanes();
  const under=lanes.filter(l=>l.lift>0);
  const highRisk=lanes.filter(l=>l.risk==='high' || l.riskReserve>450);
  const accessorial=lanes.filter(l=>l.accessorial>220);
  const top=lanes[0];
  const totalVolume=lanes.reduce((s,l)=>s+num(l.volume),0)||1;
  const concentration=top?num(top.volume)/totalVolume*100:0;
  return [
    {title:'Underpriced lanes',value:String(under.length),tone:under.length?'warn':'good',body:under.length?`${under.map(l=>l.id).join(', ')} need quote lift before sell-side use.`:'All lanes clear the current target-margin sell floor.'},
    {title:'Risk reserve pressure',value:money(highRisk.reduce((s,l)=>s+l.riskReserve,0)),tone:highRisk.length?'warn':'good',body:highRisk.length?`${highRisk.length} lane(s) carry high insurance/dwell/volatility buffer.`:'Risk reserves are inside normal draft-pricing range.'},
    {title:'Accessorial exposure',value:money(accessorial.reduce((s,l)=>s+l.accessorial,0)),tone:accessorial.length?'warn':'good',body:accessorial.length?`${accessorial.map(l=>l.id).join(', ')} should get detention/lumper/TONU terms reviewed.`:'Accessorial assumptions are modest across the demo bench.'},
    {title:'Volume concentration',value:pct(concentration),tone:concentration>38?'warn':'good',body:top?`${top.id} is the largest monthly lane share; keep customer/lane concentration visible.`:'Add lanes to evaluate concentration.'}
  ];
}
function rowEditor(lane,i){
  const fields=['id','origin','destination','equipment','miles','buyRpm','sellRpm','fuelRpm','accessorials','risk','volume','notes'];
  return `<article class="lane-card" data-i="${i}"><div class="lane-grid">${fields.map(k=>{
    const label={buyRpm:'buy RPM',sellRpm:'sell RPM',fuelRpm:'fuel RPM',accessorials:'accessorial $',volume:'monthly loads'}[k]||k;
    if(k==='equipment')return `<label>${label}<select data-k="equipment"><option ${lane.equipment==='Dry Van'?'selected':''}>Dry Van</option><option ${lane.equipment==='Reefer'?'selected':''}>Reefer</option><option ${lane.equipment==='Flatbed'?'selected':''}>Flatbed</option><option ${lane.equipment==='Power Only'?'selected':''}>Power Only</option></select></label>`;
    if(k==='risk')return `<label>${label}<select data-k="risk"><option ${lane.risk==='low'?'selected':''}>low</option><option ${lane.risk==='medium'?'selected':''}>medium</option><option ${lane.risk==='high'?'selected':''}>high</option></select></label>`;
    const type=['miles','buyRpm','sellRpm','fuelRpm','accessorials','volume'].includes(k)?'number':'text';
    const step=['buyRpm','sellRpm','fuelRpm'].includes(k)?' step="0.01"':'';
    return `<label class="${k==='notes'?'wide':''}">${label}<input data-k="${k}" type="${type}"${step} value="${String(lane[k]??'').replace(/"/g,'&quot;')}"></label>`;
  }).join('')}</div><footer><span class="pill">current sell ${money(laneCalc(lane).currentSell)}</span><span class="pill">suggested ${money(laneCalc(lane).suggestedSell)}</span><button class="danger" data-remove="${i}">Remove</button></footer></article>`;
}
function renderMatrix(){
  const lanes=scoredLanes();
  $('matrixLabel').textContent=`${lanes.length} quotes`;
  $('quoteMatrix').innerHTML=lanes.map(l=>{
    const tone=l.quality>=72?'good':l.quality>=52?'warn':'bad';
    return `<article class="quote-card"><div class="quote-title"><div>${l.id} · ${l.equipment}</div><small>quality ${l.quality}</small></div><p class="route">${l.origin} → ${l.destination}<br>${l.notes}</p><div class="tag-row"><span class="pill ${tone}">${l.lift?`lift ${money(l.lift)}`:'sell clears floor'}</span><span class="pill">risk ${l.risk}</span><span class="pill">${l.volume} / mo</span></div><div class="metric-grid"><div class="metric"><span>suggested sell</span><strong>${money(l.suggestedSell)}</strong></div><div class="metric"><span>suggested RPM</span><strong>$${l.suggestedRpm.toFixed(2)}</strong></div><div class="metric"><span>gross</span><strong>${money(l.suggestedGross)}</strong></div><div class="metric"><span>margin</span><strong>${pct(l.suggestedMargin)}</strong></div><div class="metric"><span>protected buy</span><strong>${money(l.protectedBuy)}</strong></div><div class="metric"><span>fuel</span><strong>${money(l.fuelCost)}</strong></div><div class="metric"><span>risk reserve</span><strong>${money(l.riskReserve)}</strong></div><div class="metric"><span>monthly pool</span><strong>${money(l.monthlyPool)}</strong></div></div></article>`;
  }).join('');
  const pool=lanes.reduce((s,l)=>s+l.monthlyPool,0);
  $('marginPool').textContent=money(pool);
  $('marginLabel').textContent=lanes[0]?`${lanes[0].id} leads at ${money(lanes[0].monthlyPool)} / mo`:'Waiting for lanes';
  $('brief').value=buildBrief(lanes);
  renderQa();
}
function renderQa(){const checks=qaChecks();$('qaSummary').textContent=`${checks.length} checks`; $('qaRows').innerHTML=checks.map(c=>`<article class="qa-card"><h3>${c.title}</h3><span class="pill ${c.tone}">${c.value}</span><p>${c.body}</p></article>`).join('');}
function buildBrief(lanes=scoredLanes()){
  const totalPool=lanes.reduce((s,l)=>s+l.monthlyPool,0);
  const totalLift=lanes.reduce((s,l)=>s+l.lift*num(l.volume),0);
  const lines=['# Lane Margin Simulator pricing brief','',`Generated: ${new Date().toLocaleString()}`,'Draft-only local pricing model. Human broker approval required before quoting customers, posting freight, contacting carriers, or writing a TMS/CRM.','',`Projected monthly margin pool at suggested sell: ${money(totalPool)}`,`Monthly underpricing lift to reach floor: ${money(totalLift)}`,'', '## Ranked lane quote matrix'];
  lanes.forEach((l,i)=>lines.push(`${i+1}. ${l.id} ${l.origin} -> ${l.destination} ${l.equipment}: suggested sell ${money(l.suggestedSell)} ($${l.suggestedRpm.toFixed(2)}/mi), protected buy ${money(l.protectedBuy)}, gross ${money(l.suggestedGross)}, margin ${pct(l.suggestedMargin)}, monthly pool ${money(l.monthlyPool)}, risk ${l.risk}${l.lift?`, lift current sell by ${money(l.lift)}`:''}.`));
  lines.push('', '## Margin quality checks');
  qaChecks().forEach(c=>lines.push(`- ${c.title}: ${c.value} — ${c.body}`));
  lines.push('', '## Monetization angle','Sell this as the pricing module for Backhaul: small brokerages can standardize sell floors, risk buffers, accessorial reserves, and lane-level margin pools before anyone quotes from a gut feel.', '', '## Safety boundary','No live scraping, credential use, carrier contact, load posting, TMS/CRM writes, EDI/API calls, spend, or customer-facing commitments happen here.');
  return lines.join('\n');
}
function render(){
  document.documentElement.dataset.theme=state.theme;
  $('themeToggle').textContent=state.theme==='light'?'Dark':'Light';
  ['fuelRpm','targetMargin','riskBuffer','accessorialReserve','pricingStance'].forEach(k=>{$(k).value=state[k];});
  $('laneCount').textContent=`${state.lanes.length} lanes`;
  $('laneRows').innerHTML=state.lanes.map((l,i)=>rowEditor(l,i)).join('');
  document.querySelectorAll('[data-k]').forEach(el=>el.addEventListener('input',()=>{const card=el.closest('.lane-card');state.lanes[Number(card.dataset.i)][el.dataset.k]=el.value;save();renderMatrix();}));
  document.querySelectorAll('[data-remove]').forEach(btn=>btn.addEventListener('click',()=>{state.lanes.splice(Number(btn.dataset.remove),1);save();render();toast('Lane removed');}));
  renderMatrix();save();
}
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),1600);}
function download(name,text,type){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
function csv(){const header='rank,id,origin,destination,equipment,miles,buy_rpm,current_sell_rpm,suggested_sell,suggested_rpm,protected_buy,gross,margin,monthly_volume,monthly_pool,risk,lift';return [header,...scoredLanes().map((l,i)=>[i+1,l.id,l.origin,l.destination,l.equipment,l.miles,l.buyRpm,l.sellRpm,l.suggestedSell,l.suggestedRpm.toFixed(2),l.protectedBuy.toFixed(0),l.suggestedGross.toFixed(0),l.suggestedMargin.toFixed(1),l.volume,l.monthlyPool.toFixed(0),l.risk,l.lift.toFixed(0)].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');}
['fuelRpm','targetMargin','riskBuffer','accessorialReserve','pricingStance'].forEach(k=>$(k).addEventListener('input',()=>{state[k]=$(k).value;save();renderMatrix();}));
$('loadDemo').onclick=()=>{state={...clone(DEFAULTS),theme:state.theme};render();toast('Demo lanes loaded');};
$('addLane').onclick=()=>{state.lanes.push({id:`LN-${Date.now().toString().slice(-4)}`,origin:'New origin',destination:'New destination',equipment:'Dry Van',miles:500,buyRpm:2.9,sellRpm:3.45,fuelRpm:state.fuelRpm,accessorials:150,risk:'medium',volume:4,notes:'Manual lane scenario'});render();toast('Lane added');};
$('themeToggle').onclick=()=>{state.theme=state.theme==='light'?'dark':'light';render();};
$('copyBrief').onclick=()=>navigator.clipboard?.writeText($('brief').value).then(()=>toast('Brief copied')).catch(()=>{$('brief').focus();$('brief').select();});
$('downloadJson').onclick=()=>download('lane-margin-simulator.json',JSON.stringify({controls:{fuelRpm:state.fuelRpm,targetMargin:state.targetMargin,riskBuffer:state.riskBuffer,accessorialReserve:state.accessorialReserve,pricingStance:state.pricingStance},lanes:state.lanes,quotes:scoredLanes(),qualityChecks:qaChecks(),brief:buildBrief(),safety:'local draft only'},null,2),'application/json');
$('downloadCsv').onclick=()=>download('lane-margin-simulator.csv',csv(),'text/csv');

/* Hour 04 cumulative enhancement: carrier approval reserve audit for quote floors. */
function carrierApprovalReserveAudit(){
  const pool={'Dry Van':6,'Reefer':3,'Flatbed':2,'Power Only':1}; const reserve=num(state.carrierReserve||175);
  return scoredLanes().map(l=>{let ready=pool[l.equipment]||2; if(l.risk==='high')ready-=2; if(l.risk==='medium')ready-=1; if(l.accessorial>220)ready-=1; ready=Math.max(0,ready); const thin=ready<3; const add=thin?reserve*Math.max(1,3-ready):0; const reserveSell=Math.ceil((l.protectedBuy+add)/(1-Math.min(0.6,Math.max(0.01,num(state.targetMargin)/100)))/25)*25; const status=thin?'reserve needed':'covered'; return {...l,readyCarriers:ready,carrierReserveAdd:add,carrierReserveSell:reserveSell,carrierReserveStatus:status};}).sort((a,b)=>b.carrierReserveAdd-a.carrierReserveAdd||b.monthlyPool-a.monthlyPool);
}
const __h4MarginBaseBrief=buildBrief;
buildBrief=function(lanes=scoredLanes()){const base=__h4MarginBaseBrief(lanes); const audit=carrierApprovalReserveAudit(); return base.replace('\n## Monetization angle', `\n## Carrier approval reserve audit\n${audit.map((a,i)=>`${i+1}. ${a.id}: ${a.carrierReserveStatus}, ${a.readyCarriers} ready carrier(s), add reserve ${money(a.carrierReserveAdd)}, carrier-protected sell ${money(a.carrierReserveSell)}.`).join('\n')}\n\n## Monetization angle`);};
const __h4MarginBaseRenderMatrix=renderMatrix;
renderMatrix=function(){__h4MarginBaseRenderMatrix(); const audit=carrierApprovalReserveAudit(); const thin=audit.filter(a=>a.carrierReserveAdd>0); if($('carrierReserveSummary'))$('carrierReserveSummary').textContent=`${thin.length} reserve lanes · ${audit.length} checked`; if($('carrierReserveRows'))$('carrierReserveRows').innerHTML=audit.map(a=>`<article class="qa-card"><h3>${a.id} · ${a.equipment}</h3><span class="pill ${a.carrierReserveAdd?'warn':'good'}">${a.carrierReserveStatus}</span><p>${a.readyCarriers} ready carrier(s); approval reserve ${money(a.carrierReserveAdd)}; carrier-protected sell ${money(a.carrierReserveSell)}.</p></article>`).join(''); if($('brief'))$('brief').value=buildBrief(); save();};
const __h4MarginBaseRender=render;
render=function(){__h4MarginBaseRender(); if(state.carrierReserve===undefined)state.carrierReserve=175; const ctl=$('carrierReserve'); if(ctl)ctl.value=state.carrierReserve;};
if(state.carrierReserve===undefined)state.carrierReserve=175;
const __h4ReserveCtl=$('carrierReserve'); if(__h4ReserveCtl)__h4ReserveCtl.addEventListener('input',()=>{state.carrierReserve=__h4ReserveCtl.value;save();renderMatrix();});
$('downloadJson').onclick=()=>download('lane-margin-simulator.json',JSON.stringify({controls:{fuelRpm:state.fuelRpm,targetMargin:state.targetMargin,riskBuffer:state.riskBuffer,accessorialReserve:state.accessorialReserve,pricingStance:state.pricingStance,carrierReserve:state.carrierReserve},lanes:state.lanes,quotes:scoredLanes(),qualityChecks:qaChecks(),carrierApprovalReserveAudit:carrierApprovalReserveAudit(),brief:buildBrief(),safety:'local draft only'},null,2),'application/json');
const __h4MarginBaseCsv=csv;
csv=function(){const header='rank,id,origin,destination,equipment,miles,buy_rpm,current_sell_rpm,suggested_sell,suggested_rpm,protected_buy,gross,margin,monthly_volume,monthly_pool,risk,lift,ready_carriers,carrier_reserve_add,carrier_protected_sell';return [header,...scoredLanes().map((l,i)=>{const a=carrierApprovalReserveAudit().find(x=>x.id===l.id)||{};return [i+1,l.id,l.origin,l.destination,l.equipment,l.miles,l.buyRpm,l.sellRpm,l.suggestedSell,l.suggestedRpm.toFixed(2),l.protectedBuy.toFixed(0),l.suggestedGross.toFixed(0),l.suggestedMargin.toFixed(1),l.volume,l.monthlyPool.toFixed(0),l.risk,l.lift.toFixed(0),a.readyCarriers||0,a.carrierReserveAdd||0,a.carrierReserveSell||l.suggestedSell].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')})].join('\n');};

/* Hour 05 cumulative enhancement: quote approval band audit. */
function quoteApprovalBandAudit(){
  const band=num(state.approvalBandPct||4)/100;
  return scoredLanes().map(l=>{const low=Math.ceil(l.suggestedSell*(1-band)/25)*25; const high=Math.ceil(l.suggestedSell*(1+band)/25)*25; const lowMargin=low?(low-l.protectedBuy)/low*100:0; const highMargin=high?(high-l.protectedBuy)/high*100:0; const status=lowMargin>=num(state.targetMargin)-1?'flexible':lowMargin>=num(state.targetMargin)-4?'approval needed':'floor locked'; return {...l,bandLow:low,bandHigh:high,bandLowMargin:lowMargin,bandHighMargin:highMargin,approvalBandStatus:status};}).sort((a,b)=>a.bandLowMargin-b.bandLowMargin||b.monthlyPool-a.monthlyPool);
}
const __h5MarginBaseBrief=buildBrief;
buildBrief=function(lanes=scoredLanes()){const base=__h5MarginBaseBrief(lanes); const audit=quoteApprovalBandAudit(); return base.replace('\n## Monetization angle', `\n## Quote approval band audit\n${audit.map((a,i)=>`${i+1}. ${a.id}: ${a.approvalBandStatus}, approval band ${money(a.bandLow)}-${money(a.bandHigh)}, low-side margin ${pct(a.bandLowMargin)}.`).join('\n')}\n\n## Monetization angle`);};
const __h5MarginBaseRenderMatrix=renderMatrix;
renderMatrix=function(){__h5MarginBaseRenderMatrix(); const audit=quoteApprovalBandAudit(); const locked=audit.filter(a=>a.approvalBandStatus!=='flexible'); if($('approvalBandSummary'))$('approvalBandSummary').textContent=`${locked.length} approval/floor-locked · ${audit.length} lanes checked`; if($('approvalBandRows'))$('approvalBandRows').innerHTML=audit.map(a=>`<article class="qa-card"><h3>${a.id} · ${a.equipment}</h3><span class="pill ${a.approvalBandStatus==='flexible'?'good':a.approvalBandStatus==='approval needed'?'warn':'bad'}">${a.approvalBandStatus}</span><p>Band ${money(a.bandLow)} to ${money(a.bandHigh)}; low-side margin ${pct(a.bandLowMargin)}, high-side ${pct(a.bandHighMargin)}.</p></article>`).join(''); if($('brief'))$('brief').value=buildBrief(); save();};
const __h5MarginBaseRender=render;
render=function(){__h5MarginBaseRender(); if(state.approvalBandPct===undefined)state.approvalBandPct=4; const ctl=$('approvalBandPct'); if(ctl)ctl.value=state.approvalBandPct;};
if(state.approvalBandPct===undefined)state.approvalBandPct=4;
const __h5BandCtl=$('approvalBandPct'); if(__h5BandCtl)__h5BandCtl.addEventListener('input',()=>{state.approvalBandPct=__h5BandCtl.value;save();renderMatrix();});
$('downloadJson').onclick=()=>download('lane-margin-simulator.json',JSON.stringify({controls:{fuelRpm:state.fuelRpm,targetMargin:state.targetMargin,riskBuffer:state.riskBuffer,accessorialReserve:state.accessorialReserve,pricingStance:state.pricingStance,carrierReserve:state.carrierReserve,approvalBandPct:state.approvalBandPct},lanes:state.lanes,quotes:scoredLanes(),qualityChecks:qaChecks(),carrierApprovalReserveAudit:carrierApprovalReserveAudit(),quoteApprovalBandAudit:quoteApprovalBandAudit(),brief:buildBrief(),safety:'local draft only'},null,2),'application/json');
csv=function(){const header='rank,id,origin,destination,equipment,miles,suggested_sell,suggested_rpm,protected_buy,gross,margin,monthly_pool,risk,lift,band_low,band_high,band_low_margin,approval_band_status';return [header,...scoredLanes().map((l,i)=>{const a=quoteApprovalBandAudit().find(x=>x.id===l.id)||{};return [i+1,l.id,l.origin,l.destination,l.equipment,l.miles,l.suggestedSell,l.suggestedRpm.toFixed(2),l.protectedBuy.toFixed(0),l.suggestedGross.toFixed(0),l.suggestedMargin.toFixed(1),l.monthlyPool.toFixed(0),l.risk,l.lift.toFixed(0),a.bandLow||0,a.bandHigh||0,(a.bandLowMargin||0).toFixed(1),a.approvalBandStatus||''].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')})].join('\n');};
/* Hour 06 cumulative enhancement: cash-to-paid lifecycle forecast. */
function cashLifecycleForecast(){
  const days=num(state.cashCycleDays||32);
  return scoredLanes().map(l=>{const docDelay=l.risk==='high'?4:l.risk==='medium'?2:1; const accessorialDelay=l.accessorial>220?2:0; const cycle=days+docDelay+accessorialDelay; const cashTied=l.protectedBuy*num(l.volume); const status=cycle<=days+1?'clean cycle':cycle<=days+4?'cash watch':'slow pay risk'; return {...l,cashCycle:cycle,cashTied,cashLifecycleStatus:status,cashLifecycleNote:`${cycle} day estimated order-to-paid cycle; ${money(cashTied)} monthly buy-side cash exposure.`};}).sort((a,b)=>b.cashTied-a.cashTied||b.cashCycle-a.cashCycle);
}
const __h6MarginBaseBrief=buildBrief;
buildBrief=function(lanes=scoredLanes()){const base=__h6MarginBaseBrief(lanes); const audit=cashLifecycleForecast(); return base.replace('\n## Monetization angle', `\n## Cash-to-paid lifecycle forecast\n${audit.map((a,i)=>`${i+1}. ${a.id}: ${a.cashLifecycleStatus}, ${a.cashCycle} days, cash tied ${money(a.cashTied)}.`).join('\n')}\n\n## Monetization angle`);};
const __h6MarginBaseRenderMatrix=renderMatrix;
renderMatrix=function(){__h6MarginBaseRenderMatrix(); const audit=cashLifecycleForecast(); const watch=audit.filter(a=>a.cashLifecycleStatus!=='clean cycle'); if($('cashLifecycleSummary'))$('cashLifecycleSummary').textContent=`${watch.length} watch/slow · ${audit.length} lanes checked`; if($('cashLifecycleRows'))$('cashLifecycleRows').innerHTML=audit.map(a=>`<article class="qa-card"><h3>${a.id} · ${a.equipment}</h3><span class="pill ${a.cashLifecycleStatus==='clean cycle'?'good':a.cashLifecycleStatus==='cash watch'?'warn':'bad'}">${a.cashLifecycleStatus}</span><p>${a.cashLifecycleNote}</p></article>`).join(''); if($('brief'))$('brief').value=buildBrief(); save();};
const __h6MarginBaseRender=render;
render=function(){__h6MarginBaseRender(); if(state.cashCycleDays===undefined)state.cashCycleDays=32; const ctl=$('cashCycleDays'); if(ctl)ctl.value=state.cashCycleDays;};
if(state.cashCycleDays===undefined)state.cashCycleDays=32;
const __h6CashCtl=$('cashCycleDays'); if(__h6CashCtl)__h6CashCtl.addEventListener('input',()=>{state.cashCycleDays=__h6CashCtl.value;save();renderMatrix();});
$('downloadJson').onclick=()=>download('lane-margin-simulator.json',JSON.stringify({controls:{fuelRpm:state.fuelRpm,targetMargin:state.targetMargin,riskBuffer:state.riskBuffer,accessorialReserve:state.accessorialReserve,pricingStance:state.pricingStance,carrierReserve:state.carrierReserve,approvalBandPct:state.approvalBandPct,cashCycleDays:state.cashCycleDays},lanes:state.lanes,quotes:scoredLanes(),qualityChecks:qaChecks(),carrierApprovalReserveAudit:carrierApprovalReserveAudit(),quoteApprovalBandAudit:quoteApprovalBandAudit(),cashLifecycleForecast:cashLifecycleForecast(),brief:buildBrief(),safety:'local draft only'},null,2),'application/json');
const __h6MarginBaseCsv=csv;
csv=function(){const header='rank,id,origin,destination,equipment,miles,suggested_sell,protected_buy,margin,monthly_pool,band_low,band_high,cash_cycle_days,cash_tied,cash_lifecycle_status';return [header,...scoredLanes().map((l,i)=>{const a=quoteApprovalBandAudit().find(x=>x.id===l.id)||{};const c=cashLifecycleForecast().find(x=>x.id===l.id)||{};return [i+1,l.id,l.origin,l.destination,l.equipment,l.miles,l.suggestedSell,l.protectedBuy.toFixed(0),l.suggestedMargin.toFixed(1),l.monthlyPool.toFixed(0),a.bandLow||0,a.bandHigh||0,c.cashCycle||0,(c.cashTied||0).toFixed(0),c.cashLifecycleStatus||''].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')})].join('\n');};
/* Hour 07 cumulative enhancement: lane detention reserve model. */
function laneDetentionReserveAudit(){
  const hourly=num(state.detentionHourly||85);
  return scoredLanes().map(l=>{const exposure=Math.max(0,(l.risk==='high'?2.4:l.risk==='medium'?1.25:0.55)+(l.accessorial>220?0.7:0)+(l.equipment==='Reefer'?0.45:0)-2); const reserve=Math.round(exposure*hourly*num(l.volume)); const protectedSell=l.suggestedSell+Math.round(reserve/Math.max(1,num(l.volume))); const status=reserve>=600?'reserve-heavy':reserve>0?'reserve-watch':'low detention'; return {...l,detentionHours:exposure,detentionReserve:reserve,detentionProtectedSell:protectedSell,detentionStatus:status};}).sort((a,b)=>b.detentionReserve-a.detentionReserve);
}
const __h7MarginBaseBrief=buildBrief;
buildBrief=function(lanes=scoredLanes()){const base=__h7MarginBaseBrief(lanes); const audit=laneDetentionReserveAudit(); return base.replace('\n## Monetization angle', `\n## Lane detention reserve model\n${audit.map((a,i)=>`${i+1}. ${a.id}: ${a.detentionStatus}, monthly reserve ${money(a.detentionReserve)}, protected sell ${money(a.detentionProtectedSell)}.`).join('\n')}\n\n## Monetization angle`);};
const __h7MarginBaseRenderMatrix=renderMatrix;
renderMatrix=function(){__h7MarginBaseRenderMatrix(); const audit=laneDetentionReserveAudit(); const watch=audit.filter(a=>a.detentionStatus!=='low detention'); if($('laneDetentionSummary'))$('laneDetentionSummary').textContent=`${watch.length} reserve-watch · ${audit.length} lanes checked`; if($('laneDetentionRows'))$('laneDetentionRows').innerHTML=audit.map(a=>`<article class="qa-card"><h3>${a.id} · ${a.equipment}</h3><span class="pill ${a.detentionStatus==='low detention'?'good':a.detentionStatus==='reserve-watch'?'warn':'bad'}">${a.detentionStatus}</span><p>Reserve ${money(a.detentionReserve)} monthly · protected sell ${money(a.detentionProtectedSell)}</p></article>`).join(''); if($('brief'))$('brief').value=buildBrief(); save();};
const __h7MarginBaseRender=render;
render=function(){__h7MarginBaseRender(); if(state.detentionHourly===undefined)state.detentionHourly=85; const ctl=$('detentionHourly'); if(ctl)ctl.value=state.detentionHourly;};
if(state.detentionHourly===undefined)state.detentionHourly=85;
const __h7LaneDetentionCtl=$('detentionHourly'); if(__h7LaneDetentionCtl)__h7LaneDetentionCtl.addEventListener('input',()=>{state.detentionHourly=__h7LaneDetentionCtl.value;save();renderMatrix();});
$('downloadJson').onclick=()=>download('lane-margin-simulator.json',JSON.stringify({controls:{...state},lanes:state.lanes,quotes:scoredLanes(),qualityChecks:qaChecks(),carrierApprovalReserveAudit:carrierApprovalReserveAudit(),quoteApprovalBandAudit:quoteApprovalBandAudit(),cashLifecycleForecast:cashLifecycleForecast(),laneDetentionReserveAudit:laneDetentionReserveAudit(),brief:buildBrief(),safety:'local draft only'},null,2),'application/json');
/* Hour 08 cumulative enhancement: appointment premium model. */
function appointmentPremiumAudit(){return scoredLanes().map(l=>{const pressure=(l.risk==='high'?210:l.risk==='medium'?115:55)+(l.equipment==='Reefer'?90:0)+(l.accessorial>220?75:0)+Math.max(0,num(l.miles)-700)*0.08; const premium=Math.round(pressure/25)*25; const sellWithPremium=l.suggestedSell+premium; const marginWithPremium=sellWithPremium?(sellWithPremium-l.protectedBuy)/sellWithPremium*100:0; const status=premium>=250?'appointment-premium required':premium>=125?'appointment reserve':'normal window'; return {...l,appointmentPremium:premium,appointmentSell:sellWithPremium,appointmentMargin:marginWithPremium,appointmentPremiumStatus:status};}).sort((a,b)=>b.appointmentPremium-a.appointmentPremium||b.monthlyPool-a.monthlyPool);}
const __h8MarginBaseBrief=buildBrief;
buildBrief=function(lanes=scoredLanes()){const base=__h8MarginBaseBrief(lanes); const audit=appointmentPremiumAudit(); return base.replace('\n## Monetization angle', `\n## Appointment premium model\n${audit.map((a,i)=>`${i+1}. ${a.id}: ${a.appointmentPremiumStatus}, premium ${money(a.appointmentPremium)}, appointment-protected sell ${money(a.appointmentSell)}, margin ${pct(a.appointmentMargin)}.`).join('\n')}\n\n## Monetization angle`);};
const __h8MarginBaseRenderMatrix=renderMatrix;
renderMatrix=function(){__h8MarginBaseRenderMatrix(); const audit=appointmentPremiumAudit(); const watch=audit.filter(a=>a.appointmentPremiumStatus!=='normal window'); if($('appointmentPremiumSummary'))$('appointmentPremiumSummary').textContent=`${watch.length} reserve/premium · ${audit.length} lanes checked`; if($('appointmentPremiumRows'))$('appointmentPremiumRows').innerHTML=audit.map(a=>`<article class="qa-card"><h3>${a.id} · ${a.equipment}</h3><span class="pill ${a.appointmentPremiumStatus==='normal window'?'good':a.appointmentPremiumStatus==='appointment reserve'?'warn':'bad'}">${a.appointmentPremiumStatus}</span><p>Premium ${money(a.appointmentPremium)} · protected sell ${money(a.appointmentSell)} · margin ${pct(a.appointmentMargin)}.</p></article>`).join(''); if($('brief'))$('brief').value=buildBrief(); save();};
$('downloadJson').onclick=()=>download('lane-margin-simulator.json',JSON.stringify({controls:{...state},lanes:state.lanes,quotes:scoredLanes(),qualityChecks:qaChecks(),carrierApprovalReserveAudit:carrierApprovalReserveAudit(),quoteApprovalBandAudit:quoteApprovalBandAudit(),cashLifecycleForecast:cashLifecycleForecast(),laneDetentionReserveAudit:laneDetentionReserveAudit(),appointmentPremiumAudit:appointmentPremiumAudit(),brief:buildBrief(),safety:'local draft only'},null,2),'application/json');

/* Hour 09 cumulative enhancement: document leakage reserve model. */
function documentLeakageReserveAudit(){return scoredLanes().map(l=>{const base=(l.risk==='high'?120:l.risk==='medium'?65:25)+(l.equipment==='Reefer'?45:0)+(l.accessorial>200?55:0)+Math.max(0,num(l.volume)-6)*12; const reserve=Math.round(base/25)*25; const sellWithDocReserve=l.suggestedSell+reserve; const marginWithDocReserve=sellWithDocReserve?(sellWithDocReserve-l.protectedBuy)/sellWithDocReserve*100:0; const status=reserve>=175?'doc reserve required':reserve>=75?'doc watch':'clean doc cost'; return {...l,documentReserve:reserve,documentProtectedSell:sellWithDocReserve,documentProtectedMargin:marginWithDocReserve,documentReserveStatus:status};}).sort((a,b)=>b.documentReserve-a.documentReserve||b.monthlyPool-a.monthlyPool);}
const __h9MarginBaseBrief=buildBrief;
buildBrief=function(lanes=scoredLanes()){const base=__h9MarginBaseBrief(lanes); const audit=documentLeakageReserveAudit(); return base.replace('\n## Monetization angle', `\n## Document leakage reserve model\n${audit.map((a,i)=>`${i+1}. ${a.id}: ${a.documentReserveStatus}, reserve ${money(a.documentReserve)}, doc-protected sell ${money(a.documentProtectedSell)}, margin ${pct(a.documentProtectedMargin)}.`).join('\n')}\n\n## Monetization angle`);};
const __h9MarginBaseRenderMatrix=renderMatrix;
renderMatrix=function(){__h9MarginBaseRenderMatrix(); const audit=documentLeakageReserveAudit(); const watch=audit.filter(a=>a.documentReserveStatus!=='clean doc cost'); if($('docReserveSummary'))$('docReserveSummary').textContent=`${watch.length} watch/reserve · ${audit.length} lanes checked`; if($('docReserveRows'))$('docReserveRows').innerHTML=audit.map(a=>`<article class="qa-card"><h3>${a.id} · ${a.equipment}</h3><span class="pill ${a.documentReserveStatus==='clean doc cost'?'good':a.documentReserveStatus==='doc watch'?'warn':'bad'}">${a.documentReserveStatus}</span><p>Reserve ${money(a.documentReserve)} · protected sell ${money(a.documentProtectedSell)} · margin ${pct(a.documentProtectedMargin)}.</p></article>`).join(''); if($('brief'))$('brief').value=buildBrief(); save();};
$('downloadJson').onclick=()=>download('lane-margin-simulator.json',JSON.stringify({controls:{...state},lanes:state.lanes,quotes:scoredLanes(),qualityChecks:qaChecks(),carrierApprovalReserveAudit:carrierApprovalReserveAudit(),quoteApprovalBandAudit:quoteApprovalBandAudit(),cashLifecycleForecast:cashLifecycleForecast(),laneDetentionReserveAudit:laneDetentionReserveAudit(),appointmentPremiumAudit:appointmentPremiumAudit(),documentLeakageReserveAudit:documentLeakageReserveAudit(),brief:buildBrief(),safety:'local draft only'},null,2),'application/json');

render();
