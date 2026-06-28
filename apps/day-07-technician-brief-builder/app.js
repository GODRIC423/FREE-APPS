const STORAGE_KEY = 'technician-brief-builder-v1';
const demoState = {
  theme: 'dark',
  customer: 'Northside Dental - Suite 204',
  technician: 'Jordan / Truck 3',
  window: 'Today 1:00-3:00 PM',
  jobType: 'Repair',
  issue: 'Front office reports the rooftop unit is short cycling and the waiting room is warming up by mid-day.',
  context: 'Customer has patients scheduled until 5 PM. Office manager asked for quiet entry through the side door and clear updates before any repair cost is discussed.',
  parts: 'Filter set, thermostat batteries, capacitor assortment, contactor, meter, coil cleaner, ladder, roof access key confirmation.',
  hazards: 'Roof access, active dental office, avoid blocking patient entrance, verify breaker labeling before touching equipment.',
  diagnostics: 'Confirm thermostat call, inspect filter/airflow, check capacitor and contactor, measure supply/return split, photograph rooftop unit panel before closing.',
  noPromise: 'Do not promise same-day part availability, final price, or exact completion time until diagnosis is complete and owner approval is logged.',
  checkContact: true,
  checkParts: true,
  checkRisk: true,
  checkBoundary: true
};
let state = loadState();
const $ = id => document.getElementById(id);
function clone(v){ return typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)); }
function loadState(){ try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? { ...clone(demoState), ...JSON.parse(raw) } : clone(demoState); } catch { return clone(demoState); } }
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fields(){ return ['customer','technician','window','jobType','issue','context','parts','hazards','diagnostics','noPromise']; }
function checks(){ return ['checkContact','checkParts','checkRisk','checkBoundary']; }
function missing(){ return fields().filter(k => !String(state[k] || '').trim()).concat(checks().filter(k => !state[k])); }
function riskFlags(){ const text = `${state.issue} ${state.context} ${state.hazards} ${state.noPromise}`.toLowerCase(); return [
  ['Access', /roof|ladder|gate|locked|access|attic|crawl/.test(text)],
  ['Customer sensitivity', /patient|elder|child|complaint|callback|angry|quiet/.test(text)],
  ['Promise risk', /same-day|price|discount|guarantee|exact|promise/.test(text)],
  ['Electrical/safety', /breaker|electrical|panel|gas|leak|burn|smoke/.test(text)]
].filter(([,hit]) => hit).map(([name]) => name); }
function score(){ return Math.max(0, Math.min(100, 100 - missing().length * 10 - Math.max(0, riskFlags().length - 2) * 5)); }
function applyTheme(){ document.documentElement.dataset.theme = state.theme === 'light' ? 'light' : 'dark'; $('themeToggle').textContent = state.theme === 'light' ? 'Dark' : 'Light'; $('themeToggle').setAttribute('aria-pressed', state.theme === 'light' ? 'true' : 'false'); }
function bind(){ fields().forEach(k => { $(k).value = state[k] || ''; }); checks().forEach(k => { $(k).checked = !!state[k]; }); }
function markdown(){ const risks = riskFlags(); return ['# Technician Brief Builder packet','',`Generated: ${new Date().toLocaleString()}`,'Safety: local draft/export only. No customer contact, dispatch update, CRM write, price promise, or technician command is sent by this app.','','## Dispatch header',`- Customer/site: ${state.customer || 'Missing'}`,`- Technician: ${state.technician || 'Missing'}`,`- Service window: ${state.window || 'Missing'}`,`- Job type: ${state.jobType || 'Missing'}`,`- Readiness score: ${score()}/100`,`- Risk flags: ${risks.length ? risks.join(', ') : 'None obvious'}`,'','## Customer-reported issue',state.issue || 'Missing','','## Customer/site context',state.context || 'Missing','','## Truck kit',state.parts || 'Missing','','## Hazards/access notes',state.hazards || 'Missing','','## First diagnostic steps',state.diagnostics || 'Missing','','## Do not promise',state.noPromise || 'Missing','','## Readiness checklist',`- Contact/access confirmed: ${state.checkContact ? 'yes' : 'no'}`,`- Parts/tools listed: ${state.checkParts ? 'yes' : 'no'}`,`- Hazards/risk noted: ${state.checkRisk ? 'yes' : 'no'}`,`- No price/time promise without approval: ${state.checkBoundary ? 'yes' : 'no'}`].join('\n'); }
function csv(){ const rows = [['field','value'], ['customer',state.customer], ['technician',state.technician], ['window',state.window], ['job_type',state.jobType], ['score',score()], ['risk_flags',riskFlags().join('; ')], ['issue',state.issue], ['context',state.context], ['parts',state.parts], ['hazards',state.hazards], ['diagnostics',state.diagnostics], ['no_promise',state.noPromise]]; return rows.map(row => row.map(cell => `"${String(cell ?? '').replaceAll('"','""')}"`).join(',')).join('\n'); }
function renderMetrics(){ $('metricScore').textContent = score(); $('metricMissing').textContent = missing().length; $('metricRisks').textContent = riskFlags().length; }
function renderMap(){ const risks = riskFlags(); $('routeCue').innerHTML = `<strong>${esc(state.window || 'Set service window')}</strong><br>${esc(state.customer || 'Add customer/site')} · ${esc(state.technician || 'Assign technician')}<br><span>${risks.length ? 'Review before dispatch: ' + risks.join(', ') : 'No obvious risk words yet. Still verify access and safety.'}</span>`; $('riskPills').innerHTML = (risks.length ? risks : ['No obvious flags']).map((r,i) => `<span class="${risks.length ? (i>1?'bad':'warn') : 'good'}">${esc(r)}</span>`).join(''); }
function renderBrief(){ const risks = riskFlags(); $('briefCards').innerHTML = [['Score', `${score()}/100`], ['Site', state.customer || 'Missing'], ['Tech', state.technician || 'Missing'], ['Flags', risks.length ? risks.join(', ') : 'Clear']].map(([a,b]) => `<article><span>${esc(a)}</span><strong>${esc(b)}</strong></article>`).join(''); $('exportText').value = markdown(); }
function renderAll(){ applyTheme(); bind(); renderMetrics(); renderMap(); renderBrief(); saveState(); }
function update(){ fields().forEach(k => state[k] = $(k).value); checks().forEach(k => state[k] = $(k).checked); renderMetrics(); renderMap(); renderBrief(); saveState(); }
function toast(msg){ const el=$('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(window.__toastTimer); window.__toastTimer=setTimeout(()=>el.classList.remove('show'),1700); }
function download(name,text,type){ const blob = new Blob([text], {type}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url); }
function copy(text){ navigator.clipboard?.writeText(text).then(()=>toast('Copied')).catch(()=>{ $('exportText').focus(); $('exportText').select(); toast('Select/copy from export'); }); }
fields().forEach(k => $(k).addEventListener('input', update));
checks().forEach(k => $(k).addEventListener('change', update));
$('themeToggle').addEventListener('click', () => { state.theme = state.theme === 'light' ? 'dark' : 'light'; renderAll(); toast(`${state.theme === 'light' ? 'Light':'Dark'} mode saved`); });
$('demoBtn').addEventListener('click', () => { state = clone(demoState); renderAll(); toast('Demo loaded'); });
$('blankBtn').addEventListener('click', () => { state = { ...clone(demoState), customer:'', technician:'', window:'', issue:'', context:'', parts:'', hazards:'', diagnostics:'', noPromise:'', checkContact:false, checkParts:false, checkRisk:false, checkBoundary:false }; renderAll(); toast('Blank brief ready'); });
$('copyMarkdown').addEventListener('click', () => copy($('exportText').value));
$('downloadJson').addEventListener('click', () => download('technician-brief-builder.json', JSON.stringify({ ...state, score:score(), riskFlags:riskFlags(), markdown:markdown(), generatedAt:new Date().toISOString(), safety:'draft-only local export' }, null, 2), 'application/json'));
$('downloadCsv').addEventListener('click', () => download('technician-brief-builder.csv', csv(), 'text/csv'));
renderAll();

// DAY08_SERVICE_TRIAGE_BRIDGE_START
(() => {
  const root = document.getElementById('service-triage-bridge');
  if(!root) return;
  const cards = document.getElementById('serviceTriageCards');
  const text = document.getElementById('serviceTriageText');
  const clean = v => String(v || '').trim();
  const val = id => clean(document.getElementById(id)?.value || document.getElementById(id)?.textContent);
  const escBridge = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function context(){
    const page = document.title || 'Local app';
    const caller = val('caller') || val('customer') || val('businessType') || val('businessName') || val('metricOpenValue') || 'Caller/customer from current app';
    const issue = val('callerSays') || val('issue') || val('win') || val('requestDraft') || val('message') || val('exportText') || 'Translate this app output into the caller-reported issue.';
    const constraints = val('constraints') || val('risk') || val('metricRisk') || val('hazards') || 'Confirm access, timing, risk, owner approval needs, and no price/ETA promises.';
    const urgentWords = /urgent|today|tonight|asap|smoke|leak|hazard|complaint|callback|stale|lost|risk/i.test(`${issue} ${constraints}`);
    const route = urgentWords ? 'Dispatcher/owner review before booking' : 'Standard triage queue';
    return { source:page, caller, issue:issue.slice(0,260), constraints:constraints.slice(0,220), urgency:urgentWords ? 'Review / possible same-day' : 'Normal', route, boundary:'Draft/export only. A human confirms category, ETA, price, availability, and customer contact before any action.' };
  }
  function packet(){ const c=context(); return ['# Service Triage Flow bridge','',`Source app: ${c.source}`,`Caller/customer: ${c.caller}`,`Caller-reported issue: ${c.issue}`,`Constraints/risk: ${c.constraints}`,`Urgency cue: ${c.urgency}`,`Route: ${c.route}`,`No-promise boundary: ${c.boundary}`,'','Next questions: confirm contact, exact site, when it started, active hazards, access details, photos/model numbers, and who must approve scheduling or pricing.'].join('\n'); }
  function render(){ const c=context(); cards.innerHTML = [['Caller',c.caller],['Urgency',c.urgency],['Route',c.route],['Boundary','Human approval before action']].map(([a,b]) => `<article><span>${escBridge(a)}</span><strong>${escBridge(b)}</strong></article>`).join(''); text.value = packet(); }
  function downloadBridge(){ const c=context(); const blob = new Blob([JSON.stringify({ ...c, markdown:packet(), generatedAt:new Date().toISOString(), safety:'draft-only service triage handoff' }, null, 2)], {type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='service-triage-bridge.json'; a.click(); URL.revokeObjectURL(url); }
  document.getElementById('copyServiceTriageBridge')?.addEventListener('click', () => navigator.clipboard?.writeText(text.value));
  document.getElementById('downloadServiceTriageBridge')?.addEventListener('click', downloadBridge);
  ['input','change','click'].forEach(evt => document.addEventListener(evt, () => window.requestAnimationFrame(render)));
  render();
})();
// DAY08_SERVICE_TRIAGE_BRIDGE_END

// DAY09_WARM_OUTREACH_BRIDGE_START
(() => {
  const root = document.getElementById('warm-outreach-bridge');
  if(!root) return;
  const cards = document.getElementById('warmOutreachCards');
  const text = document.getElementById('warmOutreachText');
  const clean = v => String(v || '').trim().replace(/\s+/g,' ');
  const val = id => clean(document.getElementById(id)?.value || document.getElementById(id)?.textContent);
  const escBridge = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function context(){
    const source = document.title || 'Local app';
    const prospect = val('prospect') || val('businessType') || val('businessName') || val('caller') || val('customer') || val('metricRoute') || 'Target local business / owner';
    const observed = val('observed') || val('callerSays') || val('issue') || val('win') || val('exportText') || 'This app surfaced a workflow gap worth a small human review.';
    const proof = val('proof') || val('metricProof') || val('metricRecovered') || val('metricOpenValue') || 'Use a small proof window, existing notes, and owner-visible before/after evidence.';
    const constraints = val('constraints') || val('risk') || val('metricRisk') || 'No guaranteed result, no fake familiarity, no customer action, no CRM write, and no send without approval.';
    const ask = /urgent|same-day|critical|lost|stale|leak|risk/i.test(`${observed} ${constraints}`) ? 'Ask for a short review of the highest-friction handoff.' : 'Ask whether a one-page example would be useful.';
    return { source, prospect:prospect.slice(0,120), observed:observed.slice(0,280), proof:proof.slice(0,220), constraints:constraints.slice(0,220), ask, boundary:'Draft/export only. A human reviews tone, claims, proof, timing, and recipient before any outreach is used.' };
  }
  function endSentence(s){ const t = String(s || '').trim(); return /[.!?]$/.test(t) ? t : `${t}.`; }
  function packet(){ const c=context(); return ['# Warm Outreach Lab bridge','',`Source app: ${c.source}`,`Prospect/context: ${c.prospect}`,`What to mention: ${c.observed}`,`Proof cue: ${c.proof}`,`Constraint: ${c.constraints}`,`Soft ask: ${c.ask}`,`Safety boundary: ${c.boundary}`,'','Starter draft:',`Hi ${c.prospect} — quick note after noticing this: ${endSentence(c.observed)} ${c.proof} ${c.ask}`].join('\n'); }
  function render(){ const c=context(); cards.innerHTML = [['Prospect',c.prospect],['Proof cue',c.proof],['Ask',c.ask],['Boundary','Human review before send']].map(([a,b]) => `<article><span>${escBridge(a)}</span><strong>${escBridge(b)}</strong></article>`).join(''); text.value = packet(); }
  function downloadBridge(){ const c=context(); const blob = new Blob([JSON.stringify({ ...c, markdown:packet(), generatedAt:new Date().toISOString(), safety:'draft-only warm outreach handoff' }, null, 2)], {type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='warm-outreach-bridge.json'; a.click(); URL.revokeObjectURL(url); }
  document.getElementById('copyWarmOutreachBridge')?.addEventListener('click', () => navigator.clipboard?.writeText(text.value));
  document.getElementById('downloadWarmOutreachBridge')?.addEventListener('click', downloadBridge);
  ['input','change','click'].forEach(evt => document.addEventListener(evt, () => window.requestAnimationFrame(render)));
  render();
})();
// DAY09_WARM_OUTREACH_BRIDGE_END

// DAY10_PILOT_PRICING_BRIDGE_START
(() => {
  const root = document.getElementById('pilot-pricing-bridge');
  if(!root) return;
  const cards = document.getElementById('pilotPricingCards');
  const text = document.getElementById('pilotPricingText');
  const clean = v => String(v || '').trim().replace(/\s+/g,' ');
  const val = id => clean(document.getElementById(id)?.value || document.getElementById(id)?.textContent);
  const moneyNum = s => { const nums = String(s || '').match(/[0-9][0-9,]*/g); return nums ? Number(nums[0].replaceAll(',','')) : 0; };
  const escBridge = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function dollars(n){ return Number(n || 0).toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}); }
  function context(){
    const source = document.title || 'Local app';
    const client = val('client') || val('prospect') || val('businessName') || val('businessType') || val('caller') || val('customer') || 'Prospect / owner';
    const workflow = val('workflow') || val('observed') || val('issue') || val('callerSays') || val('metricRoute') || 'Current workflow output from this app';
    const recoveredCue = moneyNum(val('metricRecovered') || val('metricOpenValue') || val('metricValue') || val('exportText')) || 4200;
    const riskText = val('risk') || val('metricRisk') || val('constraints') || 'Scope and proof need human review before quoting.';
    const low = Math.max(750, recoveredCue * 0.18);
    const high = Math.max(low + 500, recoveredCue * 0.42);
    const target = (low + high) / 2;
    return { source, client:client.slice(0,120), workflow:workflow.slice(0,240), recoveredCue, low, target, high, riskText:riskText.slice(0,220), boundary:'Draft/export only. Human reviews assumptions, terms, proof window, claims, and client-facing language before sharing a price.' };
  }
  function packet(){ const c=context(); return ['# Pilot Pricing Calculator bridge','',`Source app: ${c.source}`,`Client/prospect: ${c.client}`,`Workflow priced: ${c.workflow}`,`Recovered value cue: ${dollars(c.recoveredCue)} per month / opportunity signal`, `Draft range: ${dollars(c.low)}–${dollars(c.high)}`,`Working quote: ${dollars(c.target)}`,`Risk/proof note: ${c.riskText}`,`Safety boundary: ${c.boundary}`,'','Owner-safe story:',`Price this as a short proof window. The range is tied to the current value cue and delivery risk, not a guaranteed result.`].join('\n'); }
  function render(){ const c=context(); cards.innerHTML = [['Client',c.client],['Recovered cue',dollars(c.recoveredCue)],['Draft range',`${dollars(c.low)}–${dollars(c.high)}`],['Boundary','Human review before quote']].map(([a,b]) => `<article><span>${escBridge(a)}</span><strong>${escBridge(b)}</strong></article>`).join(''); text.value = packet(); }
  function downloadBridge(){ const c=context(); const blob = new Blob([JSON.stringify({ ...c, markdown:packet(), generatedAt:new Date().toISOString(), safety:'draft-only pilot pricing handoff' }, null, 2)], {type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='pilot-pricing-bridge.json'; a.click(); URL.revokeObjectURL(url); }
  document.getElementById('copyPilotPricingBridge')?.addEventListener('click', () => navigator.clipboard?.writeText(text.value));
  document.getElementById('downloadPilotPricingBridge')?.addEventListener('click', downloadBridge);
  ['input','change','click'].forEach(evt => document.addEventListener(evt, () => window.requestAnimationFrame(render)));
  render();
})();
// DAY10_PILOT_PRICING_BRIDGE_END

// DAY11_LOCAL_BIZ_SNAPSHOT_BRIDGE_START
(() => {
  const root = document.getElementById('local-biz-snapshot-bridge');
  if(!root) return;
  const cards = document.getElementById('localBizSnapshotCards');
  const text = document.getElementById('localBizSnapshotText');
  const clean = v => String(v || '').trim().replace(/\s+/g,' ');
  const val = id => clean(document.getElementById(id)?.value || document.getElementById(id)?.textContent);
  const escBridge = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tokens = () => clean([document.title, val('exportText'), val('pilotPricingText'), val('metricValue'), val('metricRecovered'), val('metricRisk'), val('metricOpenValue')].join(' '));
  function context(){
    const source = document.title || 'Local app';
    const business = val('businessName') || val('client') || val('prospect') || val('customer') || val('caller') || 'Prospect / local business';
    const type = val('businessType') || val('workflow') || val('issue') || val('observed') || 'Service business workflow';
    const blob = tokens().toLowerCase();
    const leaks = [];
    if(/call|missed|phone|triage/.test(blob)) leaks.push('Missed-call or intake leak');
    if(/form|booking|schedule/.test(blob)) leaks.push('Booking/form friction');
    if(/quote|price|pricing|proposal/.test(blob)) leaks.push('Quote follow-up gap');
    if(/review|proof|owner report|case/.test(blob)) leaks.push('Proof/reporting gap');
    if(!leaks.length) leaks.push('Manual follow-up leak to verify');
    const wedge = leaks[0].includes('Quote') ? 'Quote follow-up cleanup' : leaks[0].includes('Proof') ? 'Owner proof snapshot' : leaks[0].includes('Booking') ? 'Service intake triage' : 'Missed-call recovery check';
    const score = Math.min(96, Math.max(42, 48 + leaks.length * 11 + (clean(val('exportText')).length > 400 ? 12 : 0)));
    return { source, business:business.slice(0,120), type:type.slice(0,180), leaks:[...new Set(leaks)].slice(0,4), wedge, score, nextStep:'Verify facts manually, ask for one small data sample, and get human approval before outreach or claims.', boundary:'Draft/export only. No scraping, enrichment, CRM writes, sends, or public/customer-facing action.' };
  }
  function packet(){ const c=context(); return ['# Local Biz Snapshot bridge','',`Source app: ${c.source}`,`Business/profile cue: ${c.business}`,`Workflow/type cue: ${c.type}`,`Fit score: ${c.score}/100`,`Likely leaks: ${c.leaks.join('; ')}`,`First wedge: ${c.wedge}`,`Human next step: ${c.nextStep}`,`Safety boundary: ${c.boundary}`,'','Plain-English snapshot:',`This looks like a ${c.wedge.toLowerCase()} candidate if the public/profile cues hold up. Keep it as an internal dossier until a human verifies the facts.`].join('\n'); }
  function render(){ const c=context(); cards.innerHTML = [['Business cue',c.business],['Likely leak',c.leaks[0]],['First wedge',c.wedge],['Boundary','Human review first']].map(([a,b]) => `<article><span>${escBridge(a)}</span><strong>${escBridge(b)}</strong></article>`).join(''); text.value = packet(); }
  function downloadBridge(){ const c=context(); const blob = new Blob([JSON.stringify({ ...c, markdown:packet(), generatedAt:new Date().toISOString(), safety:'draft-only local business snapshot' }, null, 2)], {type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='local-biz-snapshot-bridge.json'; a.click(); URL.revokeObjectURL(url); }
  document.getElementById('copyLocalBizSnapshotBridge')?.addEventListener('click', () => navigator.clipboard?.writeText(text.value));
  document.getElementById('downloadLocalBizSnapshotBridge')?.addEventListener('click', downloadBridge);
  ['input','change','click'].forEach(evt => document.addEventListener(evt, () => window.requestAnimationFrame(render)));
  render();
})();
// DAY11_LOCAL_BIZ_SNAPSHOT_BRIDGE_END

// DAY12_SCRIPT_REHEARSAL_ROOM_BRIDGE_START
(() => {
  const root = document.getElementById('script-rehearsal-room-bridge');
  if(!root) return;
  const cards = document.getElementById('scriptRehearsalCards');
  const text = document.getElementById('scriptRehearsalText');
  const clean = v => String(v || '').trim().replace(/\s+/g,' ');
  const val = id => clean(document.getElementById(id)?.value || document.getElementById(id)?.textContent);
  const escBridge = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const blob = () => clean([document.title, val('exportText'), val('localBizSnapshotText'), val('pilotPricingText'), val('metricFit'), val('metricValue'), val('metricRecovered'), val('metricOpenValue')].join(' '));
  function context(){
    const source = document.title || 'Local app';
    const raw = blob();
    const lower = raw.toLowerCase();
    const prospect = val('businessName') || val('prospect') || val('customer') || val('caller') || val('client') || 'Owner / prospect';
    const objective = lower.includes('quote') ? 'ask where quote follow-up stalls and propose a tiny cleanup test' : lower.includes('review') ? 'learn what proof customers trust and rehearse a low-pressure ask' : lower.includes('pricing') ? 'validate whether the pilot scope and proof window feel fair' : lower.includes('triage') || lower.includes('call') ? 'understand intake friction and pick one safe next question' : 'find one practical workflow leak worth a small proof step';
    const prompt = lower.includes('price') || lower.includes('pricing') ? 'What price range feels low-risk enough to test, and what proof would change your mind?' : lower.includes('review') ? 'Which customer result would you feel comfortable asking about manually?' : lower.includes('quote') ? 'Which open quote should get a human follow-up first, and why?' : 'Where does the current workflow slow down when the team is busy?';
    const objection = lower.includes('cost') || lower.includes('price') || lower.includes('pricing') ? 'We do not have budget.' : lower.includes('busy') || lower.includes('triage') ? 'I am too busy right now.' : 'How do I know this works?';
    const response = objection.includes('budget') ? 'Keep the answer tied to a short proof window and a small manual pilot before any build.' : objection.includes('busy') ? 'Ask for one ten-minute sample review instead of a full meeting.' : 'Point to measured proof and avoid any revenue promise until facts are verified.';
    return { source, prospect:prospect.slice(0,120), objective, opening:`I want to keep this useful and low-pressure. The goal is to ${objective}, then decide whether one human-reviewed proof step is worth doing.`, prompt, objection, response, boundary:'Draft rehearsal only. Get human approval before calls, sends, recordings, CRM updates, claims, or customer-facing action.' };
  }
  function packet(){ const c=context(); return ['# Script Rehearsal Room bridge','',`Source app: ${c.source}`,`Prospect/customer cue: ${c.prospect}`,`Call objective: ${c.objective}`,'',`Opening line: ${c.opening}`,'','Discovery prompts:',`1. ${c.prompt}`,'2. What would count as proof that this is worth testing?','3. Who needs to approve the smallest next step?','',`Objection card: ${c.objection}`,`Practice response: ${c.response}`,'',`Safety boundary: ${c.boundary}`].join('\n'); }
  function render(){ const c=context(); cards.innerHTML = [['Prospect cue',c.prospect],['Objective',c.objective],['Objection',c.objection],['Boundary','Human approval first']].map(([a,b]) => `<article><span>${escBridge(a)}</span><strong>${escBridge(b)}</strong></article>`).join(''); text.value = packet(); }
  function downloadBridge(){ const c=context(); const blobObj = new Blob([JSON.stringify({ ...c, markdown:packet(), generatedAt:new Date().toISOString(), safety:'draft-only script rehearsal' }, null, 2)], {type:'application/json'}); const url=URL.createObjectURL(blobObj); const a=document.createElement('a'); a.href=url; a.download='script-rehearsal-room-bridge.json'; a.click(); URL.revokeObjectURL(url); }
  document.getElementById('copyScriptRehearsalBridge')?.addEventListener('click', () => navigator.clipboard?.writeText(text.value));
  document.getElementById('downloadScriptRehearsalBridge')?.addEventListener('click', downloadBridge);
  ['input','change','click'].forEach(evt => document.addEventListener(evt, () => window.requestAnimationFrame(render)));
  render();
})();
// DAY12_SCRIPT_REHEARSAL_ROOM_BRIDGE_END

// Day 13 Proof Vault bridge: source-output-to-evidence handoff.
(() => {
  const section = document.getElementById('proof-vault-bridge');
  if (!section) return;
  const cardsEl = document.getElementById('proofVaultCards');
  const textEl = document.getElementById('proofVaultText');
  const copyBtn = document.getElementById('copyProofVault');
  const downloadBtn = document.getElementById('downloadProofVault');
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const escPv = value => String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function appName(){ return clean(document.querySelector('title')?.textContent || document.querySelector('h1')?.textContent || 'Current app'); }
  function currentOutput(){
    const textareas = [...document.querySelectorAll('textarea')].filter(el => el.id !== 'proofVaultText');
    const filled = textareas.map(el => clean(el.value || el.textContent)).find(v => v.length > 80);
    if (filled) return filled.slice(0, 900);
    const live = clean(document.querySelector('main')?.innerText || document.body.innerText || '');
    return live.slice(0, 900);
  }
  function buildPacket(){
    const name = appName();
    const output = currentOutput();
    const headline = clean(document.querySelector('h1')?.textContent || name);
    const resultCue = output.match(/\$[0-9,.kK]+|[0-9]+%|ready|approval|recover|score|proof/i)?.[0] || 'add measured result before external use';
    return {
      sourceApp: name,
      artifactType: 'Report snippet / screenshot candidate',
      proofTitle: `${name} output evidence`,
      location: 'Capture a local screenshot or export from this app before sharing.',
      snippet: output,
      result: `Evidence cue: ${resultCue}. Verify against real owner/customer data before using as proof.`,
      caseStudyAngle: `${headline} can become a Proof Vault card if the screenshot/snippet is redacted, tied to a measured result, and approved by the owner.`,
      redactionChecklist: ['Remove customer names and identifiers', 'Confirm no API keys, tokens, account IDs, phone numbers, or private URLs are visible', 'Mark owner approval before any external case-study use'],
      safety: 'Draft-only local handoff. Do not publish, send, or claim results without redaction and explicit human approval.',
      generatedAt: new Date().toISOString()
    };
  }
  function markdown(packet){
    return ['# Proof Vault evidence card','',`Generated: ${new Date().toLocaleString()}`,'Safety: draft-only local handoff. Redact and obtain explicit approval before external use.','',`## Source app`,packet.sourceApp,'',`## Proof title`,packet.proofTitle,'',`## Artifact type`,packet.artifactType,'',`## Location`,packet.location,'',`## Evidence snippet`,packet.snippet,'',`## Result / signal`,packet.result,'',`## Case-study angle`,packet.caseStudyAngle,'',`## Redaction checklist`,...packet.redactionChecklist.map(item => `- [ ] ${item}`),'',`## Guardrail`,packet.safety].join('\n');
  }
  function render(){
    const packet = buildPacket();
    cardsEl.innerHTML = [
      ['Source', packet.sourceApp],
      ['Artifact', packet.artifactType],
      ['Result cue', packet.result],
      ['Boundary', 'Redact + owner approval']
    ].map(([label, value]) => `<article><span>${escPv(label)}</span><strong>${escPv(value)}</strong></article>`).join('');
    textEl.value = markdown(packet);
    return packet;
  }
  function download(packet){
    const blob = new Blob([JSON.stringify(packet, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${packet.sourceApp.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-proof-vault-card.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  copyBtn?.addEventListener('click', () => navigator.clipboard?.writeText(textEl.value).catch(() => { textEl.focus(); textEl.select(); }));
  downloadBtn?.addEventListener('click', () => download(render()));
  window.addEventListener('input', () => window.requestAnimationFrame(render));
  window.addEventListener('change', () => window.requestAnimationFrame(render));
  render();
})();

// Day 14 SOP Builder bridge: current-output-to-repeatable-procedure handoff.
(() => {
  const section = document.getElementById('sop-builder-bridge');
  if (!section) return;
  const cardsEl = document.getElementById('sopBuilderCards');
  const textEl = document.getElementById('sopBuilderText');
  const copyBtn = document.getElementById('copySopBuilder');
  const downloadBtn = document.getElementById('downloadSopBuilder');
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const escSop = value => String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function appName(){ return clean(document.querySelector('title')?.textContent || document.querySelector('h1')?.textContent || 'Current app'); }
  function currentOutput(){
    const textareas = [...document.querySelectorAll('textarea')].filter(el => el.id !== 'sopBuilderText');
    const filled = textareas.map(el => clean(el.value || el.textContent)).find(v => v.length > 80);
    if (filled) return filled.slice(0, 900);
    return clean(document.querySelector('main')?.innerText || document.body.innerText || '').slice(0, 900);
  }
  function buildPacket(){
    const name = appName();
    const output = currentOutput();
    const title = clean(document.querySelector('h1')?.textContent || name);
    const trigger = output.match(/when|after|if|before|daily|lead|quote|approval|proof|review/i)?.[0] || 'When this workflow output needs to be repeated';
    const stepA = `Open ${name}, load or enter the working context, and confirm the task is still draft-only.`;
    const stepB = `Use the current output to decide the next internal handoff: ${output.slice(0, 180) || 'document the workflow result'}.`;
    const stepC = 'Run the quality checks, get human approval for customer-facing action, then log the decision outside this bridge.';
    return {
      sourceApp: name,
      sopTitle: `${name} repeatable handoff SOP`,
      trigger,
      owner: 'Human operator / owner delegate',
      inputs: 'Current app output, source notes, approval status, and any measured result cues.',
      doneDefinition: 'The handoff is copied/exported, reviewed by a human, and either approved, revised, or parked.',
      steps: [stepA, stepB, stepC],
      qualityChecks: ['No secrets, tokens, account IDs, or private customer identifiers are visible', 'Claims are tied to visible evidence or marked as assumptions', 'Human approval is required before sends, CRM writes, quotes, public changes, or customer contact'],
      exceptionPath: 'If context is unclear, sensitive, or high-risk, stop and ask the owner for review instead of acting.',
      sourceSnippet: output,
      safety: 'Draft-only SOP handoff. No customer-facing action, CRM write, send, quote, or destructive change from this bridge.',
      generatedAt: new Date().toISOString(),
      headline: title
    };
  }
  function markdown(packet){
    return ['# SOP Builder bridge','',`Generated: ${new Date().toLocaleString()}`,'Safety: draft-only local handoff. Human approval is required before customer-facing or destructive action.','',`## SOP`,packet.sopTitle,`Source app: ${packet.sourceApp}`,`Trigger: ${packet.trigger}`,`Owner: ${packet.owner}`,`Inputs: ${packet.inputs}`,`Done definition: ${packet.doneDefinition}`,'',`## Steps`,...packet.steps.map((step, idx) => `${idx + 1}. ${step}`),'',`## Quality checks`,...packet.qualityChecks.map(item => `- [ ] ${item}`),'',`## Exception path`,packet.exceptionPath,'',`## Source snippet`,packet.sourceSnippet,'',`## Guardrail`,packet.safety].join('\n');
  }
  function render(){
    const packet = buildPacket();
    cardsEl.innerHTML = [
      ['Trigger', packet.trigger],
      ['Owner', packet.owner],
      ['Steps', `${packet.steps.length} starter stations`],
      ['Boundary', 'Human approval before action']
    ].map(([label, value]) => `<article><span>${escSop(label)}</span><strong>${escSop(value)}</strong></article>`).join('');
    textEl.value = markdown(packet);
    return packet;
  }
  function download(packet){
    const blob = new Blob([JSON.stringify({ ...packet, markdown: markdown(packet) }, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${packet.sourceApp.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-sop-builder-bridge.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  copyBtn?.addEventListener('click', () => navigator.clipboard?.writeText(textEl.value).catch(() => { textEl.focus(); textEl.select(); }));
  downloadBtn?.addEventListener('click', () => download(render()));
  window.addEventListener('input', () => window.requestAnimationFrame(render));
  window.addEventListener('change', () => window.requestAnimationFrame(render));
  render();
})();

// Day 15 Daily Cash Board bridge: current-output-to-cash-action handoff.
(() => {
  const section = document.getElementById('daily-cash-board-bridge');
  if (!section) return;
  const cardsEl = document.getElementById('dailyCashBoardCards');
  const textEl = document.getElementById('dailyCashBoardText');
  const copyBtn = document.getElementById('copyDailyCashBoard');
  const downloadBtn = document.getElementById('downloadDailyCashBoard');
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const escCash = value => String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function appName(){ return clean(document.querySelector('title')?.textContent || document.querySelector('h1')?.textContent || 'Current app'); }
  function currentOutput(){
    const textareas = [...document.querySelectorAll('textarea')].filter(el => el.id !== 'dailyCashBoardText');
    const filled = textareas.map(el => clean(el.value || el.textContent)).find(v => v.length > 80);
    if (filled) return filled.slice(0, 1000);
    return clean(document.querySelector('main')?.innerText || document.body.innerText || '').slice(0, 1000);
  }
  function valueCue(text){
    const match = text.match(/\$\s?([0-9][0-9,]*(?:\.\d{1,2})?)/);
    return match ? `$${match[1]}` : 'Value not set';
  }
  function buildPacket(){
    const name = appName();
    const output = currentOutput();
    const dueSignal = /today|daily|now|urgent|stale|follow|invoice|quote|call/i.test(output) ? 'Due today / review now' : 'Schedule the next review date';
    return {
      sourceApp: name,
      cashSignal: valueCue(output),
      offerCheckpoint: `If ${name} reveals a clear wedge, draft one narrow offer and route it for human approval.`,
      followupCheckpoint: `If the output mentions a quote, lead, proof, review, or owner decision, create one follow-up task instead of letting it sit.`,
      callCheckpoint: 'If discovery is needed, book or prepare one human-led call; do not send from this bridge.',
      invoiceCheckpoint: 'If work is complete or approved, check invoice/collection status outside this app.',
      nextAction: `${dueSignal}: copy this cash brief into Daily Cash Board and choose the single highest-cash next move.`,
      risk: 'No customer-facing sends, CRM writes, invoices, payments, public changes, pricing promises, or destructive actions from this bridge.',
      sourceSnippet: output,
      generatedAt: new Date().toISOString()
    };
  }
  function markdown(packet){
    return ['# Daily Cash Board bridge','',`Generated: ${new Date().toLocaleString()}`,'Safety: draft-only local cash brief. Human approval is required before customer-facing, billing, CRM, payment, or public actions.','',`## Source`,packet.sourceApp,`Cash/value cue: ${packet.cashSignal}`,'',`## Cash checkpoints`,`- Offer: ${packet.offerCheckpoint}`,`- Follow-up: ${packet.followupCheckpoint}`,`- Booked call: ${packet.callCheckpoint}`,`- Invoice / collect: ${packet.invoiceCheckpoint}`,'',`## Next action`,packet.nextAction,'',`## Source snippet`,packet.sourceSnippet,'',`## Guardrail`,packet.risk].join('\n');
  }
  function render(){
    const packet = buildPacket();
    cardsEl.innerHTML = [
      ['Value cue', packet.cashSignal],
      ['Offer', 'Draft only'],
      ['Follow-up', 'One due action'],
      ['Invoice', 'Check status'],
      ['Boundary', 'Human approval']
    ].map(([label, value]) => `<article><span>${escCash(label)}</span><strong>${escCash(value)}</strong></article>`).join('');
    textEl.value = markdown(packet);
    return packet;
  }
  function download(packet){
    const blob = new Blob([JSON.stringify({ ...packet, markdown: markdown(packet) }, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${packet.sourceApp.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-daily-cash-board-bridge.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  copyBtn?.addEventListener('click', () => navigator.clipboard?.writeText(textEl.value).catch(() => { textEl.focus(); textEl.select(); }));
  downloadBtn?.addEventListener('click', () => download(render()));
  window.addEventListener('input', () => window.requestAnimationFrame(render));
  window.addEventListener('change', () => window.requestAnimationFrame(render));
  render();
})();

// Day 16 Meeting Follow-up Kit bridge: current-output-to-recap handoff.
(() => {
  const section = document.getElementById('meeting-followup-kit-bridge');
  if (!section) return;
  const cardsEl = document.getElementById('meetingFollowupCards');
  const textEl = document.getElementById('meetingFollowupText');
  const copyBtn = document.getElementById('copyMeetingFollowup');
  const downloadBtn = document.getElementById('downloadMeetingFollowup');
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const escMeeting = value => String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function appName(){ return clean(document.querySelector('title')?.textContent || document.querySelector('h1')?.textContent || 'Current app'); }
  function currentOutput(){
    const textareas = [...document.querySelectorAll('textarea')].filter(el => el.id !== 'meetingFollowupText');
    const filled = textareas.map(el => clean(el.value || el.textContent)).find(v => v.length > 80);
    if (filled) return filled.slice(0, 1200);
    return clean(document.querySelector('main')?.innerText || document.body.innerText || '').slice(0, 1200);
  }
  function firstSentence(text){ const match = clean(text).match(/[^.!?]+[.!?]/); return match ? match[0].trim() : clean(text).slice(0, 160); }
  function buildPacket(){
    const name = appName();
    const output = currentOutput();
    const decisionCue = /(approve|approved|decision|choose|selected|ready|won|yes|no|price|pilot|scope)/i.test(output) ? 'Decision cue found' : 'Decision needs owner confirmation';
    const riskCue = /(risk|block|guardrail|approval|secret|payment|invoice|customer|public|send|crm)/i.test(output) ? 'Risk/approval cue found' : 'No obvious risk cue';
    return {
      sourceApp: name,
      recapHeadline: firstSentence(output) || `${name} output needs a meeting recap.`,
      followupEmail: `Subject: Follow-up from ${name}\n\nHi all,\n\nQuick recap: ${firstSentence(output) || 'we reviewed the current app output.'}\n\nProposed next action: assign one owner, one due date, and one approval check before anything customer-facing happens.\n\nPlease confirm the decisions, risks, and open questions below before sending or acting.`,
      ownerTasks: [`Name one owner for the next ${name} action`, 'Set a due date before the next review', 'Copy the guardrail into the handoff'],
      decisions: [decisionCue, 'Confirm whether this output is ready for the next app/workflow'],
      risks: [riskCue, 'No sends, CRM writes, invoices, payments, public changes, or customer contact from this bridge'],
      questions: ['Who owns the next step?', 'What must be approved before real-world action?'],
      sourceSnippet: output,
      generatedAt: new Date().toISOString()
    };
  }
  function markdown(packet){
    return ['# Meeting Follow-up Kit bridge','',`Generated: ${new Date().toLocaleString()}`,'Safety: draft-only local recap. Human approval is required before sending email, calendar invites, CRM updates, customer messages, billing, or public changes.','',`## Source`,packet.sourceApp,'',`## Recap headline`,packet.recapHeadline,'',`## Draft follow-up email`,'```',packet.followupEmail,'```','',`## Tasks`,...packet.ownerTasks.map(v => `- ${v}`),'',`## Decisions`,...packet.decisions.map(v => `- ${v}`),'',`## Risks`,...packet.risks.map(v => `- ${v}`),'',`## Open questions`,...packet.questions.map(v => `- ${v}`),'',`## Source snippet`,packet.sourceSnippet].join('\n');
  }
  function render(){
    const packet = buildPacket();
    cardsEl.innerHTML = [
      ['Recap', 'Ready'],
      ['Email', 'Draft only'],
      ['Tasks', String(packet.ownerTasks.length)],
      ['Risks', String(packet.risks.length)],
      ['Boundary', 'Human review']
    ].map(([label, value]) => `<article><span>${escMeeting(label)}</span><strong>${escMeeting(value)}</strong></article>`).join('');
    textEl.value = markdown(packet);
    return packet;
  }
  function download(packet){
    const blob = new Blob([JSON.stringify({ ...packet, markdown: markdown(packet) }, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${packet.sourceApp.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-meeting-followup-bridge.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  copyBtn?.addEventListener('click', () => navigator.clipboard?.writeText(textEl.value).catch(() => { textEl.focus(); textEl.select(); }));
  downloadBtn?.addEventListener('click', () => download(render()));
  window.addEventListener('input', () => window.requestAnimationFrame(render));
  window.addEventListener('change', () => window.requestAnimationFrame(render));
  render();
})();

// Day 17 Credential Handoff Checklist bridge: no-secret access custody handoff.
(() => {
  const section = document.getElementById('credential-handoff-bridge');
  if (!section) return;
  const cardsEl = document.getElementById('credentialHandoffCards');
  const textEl = document.getElementById('credentialHandoffText');
  const copyBtn = document.getElementById('copyCredentialHandoff');
  const downloadBtn = document.getElementById('downloadCredentialHandoff');
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const escCred = value => String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function appName(){ return clean(document.querySelector('title')?.textContent || document.querySelector('h1')?.textContent || 'Current app'); }
  function currentOutput(){
    const textareas = [...document.querySelectorAll('textarea')].filter(el => el.id !== 'credentialHandoffText');
    const filled = textareas.map(el => clean(el.value || el.textContent)).find(v => v.length > 80);
    if (filled) return filled.slice(0, 1400);
    return clean(document.querySelector('main')?.innerText || document.body.innerText || '').slice(0, 1400);
  }
  function findSystems(text){
    const lower = text.toLowerCase();
    const systems = [];
    if(/email|inbox|follow-up|message|sms/.test(lower)) systems.push('Messaging/inbox access');
    if(/calendar|booking|appointment|schedule/.test(lower)) systems.push('Booking/calendar access');
    if(/crm|lead|customer|quote|invoice/.test(lower)) systems.push('CRM/customer record access');
    if(/api|webhook|integration|automation/.test(lower)) systems.push('API/integration access');
    if(/payment|billing|price|cash|invoice/.test(lower)) systems.push('Billing/payment portal access');
    return systems.length ? [...new Set(systems)].slice(0,4) : ['App/operator access'];
  }
  function buildPacket(){
    const name = appName();
    const output = currentOutput();
    const systems = findSystems(output);
    const riskWords = (output.match(/secret|token|key|password|customer|payment|send|crm|public|invoice|api/gi) || []).length;
    return {
      sourceApp: name,
      systems,
      primaryOwner: 'Assign primary owner',
      backupOwner: 'Assign backup owner',
      storageReference: 'Password-manager item label only — do not paste secret value',
      requiredChecks: ['MFA confirmed', 'Least privilege confirmed', 'Storage reference verified', 'Revocation path documented', 'Rotation date set', 'No raw secret stored in this app/export'],
      revocationPlan: systems.map(system => `${system}: document where to remove user/key and who can execute it.`),
      riskFlags: riskWords ? [`${riskWords} sensitive/action words detected in source output; review access boundaries.`] : ['No obvious credential/action keywords detected; still review manually.'],
      approvalBoundary: 'Human approval required before sharing, rotating, revoking, sending, CRM changes, billing actions, customer contact, or public changes.',
      sourceSnippet: output,
      generatedAt: new Date().toISOString()
    };
  }
  function markdown(packet){
    return ['# Credential Handoff Checklist bridge','',`Generated: ${new Date().toLocaleString()}`,'Safety: metadata only. Do not paste raw passwords, tokens, API keys, cookies, private keys, MFA seed phrases, recovery codes, customer PII, or payment details. Use an encrypted/password-manager workflow for the actual secret handoff.','',`## Source`,packet.sourceApp,'',`## Systems/access surfaces`,...packet.systems.map(v => `- ${v}`),'',`## Owners`,`- Primary owner: ${packet.primaryOwner}`,`- Backup owner: ${packet.backupOwner}`,'',`## Storage reference`,packet.storageReference,'',`## Required checks`,...packet.requiredChecks.map(v => `- [ ] ${v}`),'',`## Revocation plan`,...packet.revocationPlan.map(v => `- ${v}`),'',`## Risk flags`,...packet.riskFlags.map(v => `- ${v}`),'',`## Approval boundary`,packet.approvalBoundary,'',`## Source snippet`,packet.sourceSnippet].join('\n');
  }
  function render(){
    const packet = buildPacket();
    cardsEl.innerHTML = [
      ['Surfaces', String(packet.systems.length)],
      ['Secret values', 'Never store'],
      ['Checks', String(packet.requiredChecks.length)],
      ['Revoke path', 'Required'],
      ['Approval', 'Human gate']
    ].map(([label, value]) => `<article><span>${escCred(label)}</span><strong>${escCred(value)}</strong></article>`).join('');
    textEl.value = markdown(packet);
    return packet;
  }
  function download(packet){
    const blob = new Blob([JSON.stringify({ ...packet, markdown: markdown(packet) }, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${packet.sourceApp.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-credential-handoff-bridge.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  copyBtn?.addEventListener('click', () => navigator.clipboard?.writeText(textEl.value).catch(() => { textEl.focus(); textEl.select(); }));
  downloadBtn?.addEventListener('click', () => download(render()));
  window.addEventListener('input', () => window.requestAnimationFrame(render));
  window.addEventListener('change', () => window.requestAnimationFrame(render));
  render();
})();

// Day 18 Content Repurposer bridge: draft-only publishing packet.
(() => {
  const section = document.getElementById('content-repurposer-bridge');
  if (!section) return;
  const cardsEl = document.getElementById('contentRepurposerCards');
  const textEl = document.getElementById('contentRepurposerText');
  const copyBtn = document.getElementById('copyContentRepurposer');
  const downloadBtn = document.getElementById('downloadContentRepurposer');
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const escContent = value => String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function appName(){ return clean(document.querySelector('title')?.textContent || document.querySelector('h1')?.textContent || 'Current app'); }
  function currentOutput(){
    const textareas = [...document.querySelectorAll('textarea')].filter(el => el.id !== 'contentRepurposerText');
    const filled = textareas.map(el => clean(el.value || el.textContent)).find(v => v.length > 80);
    if (filled) return filled.slice(0, 1600);
    return clean(document.querySelector('main')?.innerText || document.body.innerText || '').slice(0, 1600);
  }
  function splitSentences(text){ return clean(text).split(/(?<=[.!?])\s+/).filter(Boolean); }
  function buildPacket(){
    const name = appName();
    const output = currentOutput();
    const sentences = splitSentences(output);
    const proofWords = (output.match(/verified|smoke|browser|export|recording|phone|proof|score|ready|passed/gi) || []).length;
    const publicWords = (output.match(/send|publish|post|customer|client|public|crm|payment|billing/gi) || []).length;
    const title = `${name}: turn the output into a proof-ready draft`.slice(0, 92);
    const chapters = [
      ['00:00', 'What the app produced', sentences[0] || `${name} generated a useful local-first output.`],
      ['00:35', 'Core workflow', sentences[1] || 'Walk through the main inputs, decisions, and generated packet.'],
      ['01:15', 'Proof and caveats', sentences[2] || 'Show verification, limits, and human-review boundaries.'],
      ['02:00', 'Next action', 'Copy/export the draft packet, then review before public use.']
    ];
    return {
      sourceApp: name,
      title,
      description: `${name} produced a local-first business workflow output. This bridge repurposes it into a draft content packet with proof notes, caveats, chapters, and short posts. Human review is required before publishing.`,
      chapters,
      shortPosts: [
        `Built/useful output from ${name}: now it has a draft content packet with title, description, chapters, proof notes, and caveats.`,
        `The important boundary: this is content drafting only. Review before anything public, customer-facing, or promotional.`,
        proofWords ? `Proof cues detected in the source: ${proofWords}. Keep those in the public story instead of hype.` : `Add verification proof before publishing this story.`
      ],
      checklist: ['Confirm claims match the source output', 'Add proof and screenshots only if secret-safe', 'Keep caveats visible', 'Human approval before public posting', 'No customer data or secrets in exported content'],
      flags: publicWords ? [`${publicWords} public/customer/action words detected; approval review required.`] : ['No obvious public-action terms detected; still review manually.'],
      sourceSnippet: output,
      generatedAt: new Date().toISOString()
    };
  }
  function markdown(packet){
    return ['# Content Repurposer bridge','',`Generated: ${new Date().toLocaleString()}`,'Draft-only. Does not post, upload, send, call APIs, or publish. Human approval required before public use.','',`## Source`,packet.sourceApp,'',`## YouTube title`,packet.title,'',`## Description`,packet.description,'',`## Chapters`,...packet.chapters.map(c => `- ${c[0]} — ${c[1]}: ${c[2]}`),'',`## Short posts`,...packet.shortPosts.map((v,i)=>`### Post ${i+1}\n${v}`),'',`## Review checklist`,...packet.checklist.map(v => `- [ ] ${v}`),'',`## Flags`,...packet.flags.map(v => `- ${v}`),'',`## Source snippet`,packet.sourceSnippet].join('\n');
  }
  function render(){
    const packet = buildPacket();
    cardsEl.innerHTML = [
      ['Title', '1 draft'],
      ['Chapters', String(packet.chapters.length)],
      ['Posts', String(packet.shortPosts.length)],
      ['Proof gate', 'Required'],
      ['Public action', 'Human review']
    ].map(([label, value]) => `<article><span>${escContent(label)}</span><strong>${escContent(value)}</strong></article>`).join('');
    textEl.value = markdown(packet);
    return packet;
  }
  function download(packet){
    const blob = new Blob([JSON.stringify({ ...packet, markdown: markdown(packet) }, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${packet.sourceApp.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-content-repurposer-bridge.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  copyBtn?.addEventListener('click', () => navigator.clipboard?.writeText(textEl.value).catch(() => { textEl.focus(); textEl.select(); }));
  downloadBtn?.addEventListener('click', () => download(render()));
  window.addEventListener('input', () => window.requestAnimationFrame(render));
  window.addEventListener('change', () => window.requestAnimationFrame(render));
  render();
})();

// Day 19 Home Service Route Planner bridge: draft-only service route sheet.
(() => {
  const section = document.getElementById('home-service-route-bridge');
  if (!section) return;
  const cardsEl = document.getElementById('homeServiceRouteCards');
  const textEl = document.getElementById('homeServiceRouteText');
  const copyBtn = document.getElementById('copyHomeServiceRoute');
  const downloadBtn = document.getElementById('downloadHomeServiceRoute');
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const escRoute = value => String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function appName(){ return clean(document.querySelector('title')?.textContent || document.querySelector('h1')?.textContent || 'Current app'); }
  function currentOutput(){
    const textareas = [...document.querySelectorAll('textarea')].filter(el => el.id !== 'homeServiceRouteText');
    const filled = textareas.map(el => clean(el.value || el.textContent)).find(v => v.length > 80);
    if (filled) return filled.slice(0, 1600);
    return clean(document.querySelector('main')?.innerText || document.body.innerText || '').slice(0, 1600);
  }
  function chunks(text){ const parts = clean(text).split(/(?<=[.!?])\s+|\n+/).filter(Boolean); return parts.length ? parts : ['Review generated output', 'Confirm next action', 'Owner approval checkpoint']; }
  function buildRoute(){
    const name = appName();
    const output = currentOutput();
    const parts = chunks(output).slice(0, 5);
    const base = 8 * 60;
    const stops = parts.map((part, index) => {
      const priority = /urgent|risk|overdue|stale|critical|high|emergency/i.test(part) ? 5 : (/review|approve|owner|proof/i.test(part) ? 4 : 3);
      const arrive = base + index * 105;
      return { order:index+1, customer:`${name} stop ${index+1}`, area:['North route','East route','South route','West route','Overflow'][index] || 'Route TBD', priority, windowStart:`${String(Math.floor(arrive/60)).padStart(2,'0')}:${String(arrive%60).padStart(2,'0')}`, duration: priority >= 5 ? 90 : 60, work:part };
    });
    const totalDrive = Math.max(0, stops.length - 1) * 22;
    const totalWork = stops.reduce((sum, stop) => sum + stop.duration, 0);
    const flags = [];
    if(/send|publish|customer|client|dispatch|public|crm|payment/gi.test(output)) flags.push('Customer/public/dispatch action words detected; confirm manually before use.');
    if(stops.length > 4) flags.push('Route has more than four derived stops; dispatcher should tighten scope.');
    if(!/proof|verified|review|approve|check/gi.test(output)) flags.push('Add verification/proof checks before committing this route.');
    return { sourceApp:name, depot:'Draft depot / confirm before dispatch', technician:'Unassigned tech', driveBufferMinutes:22, stops, totals:{drive:totalDrive, work:totalWork, total:totalDrive + totalWork + 30}, flags: flags.length ? flags : ['No blocking route flags detected. Confirm traffic/windows manually.'], sourceSnippet:output, generatedAt:new Date().toISOString() };
  }
  function markdown(packet){
    return ['# Home Service Route Planner bridge','',`Generated: ${new Date().toLocaleString()}`,'Draft-only. Confirm traffic, customer windows, technician constraints, and approvals before dispatch.','',`Source app: ${packet.sourceApp}`,`Depot: ${packet.depot}`,`Technician: ${packet.technician}`,'','## Route summary',`- Stops: ${packet.stops.length}`,`- Drive buffer: ${packet.totals.drive} minutes`,`- Work time: ${packet.totals.work} minutes`,`- Total with admin buffer: ${packet.totals.total} minutes`,'','## Stop order',...packet.stops.map(stop => `### ${stop.order}. ${stop.customer}\n- Area: ${stop.area}\n- Window: ${stop.windowStart}\n- Priority: ${stop.priority >= 5 ? 'Emergency' : stop.priority >= 4 ? 'High' : 'Normal'}\n- Duration: ${stop.duration} minutes\n- Work: ${stop.work}`),'','## Review flags',...packet.flags.map(v => `- ${v}`),'','## Source snippet',packet.sourceSnippet].join('\n');
  }
  function render(){
    const packet = buildRoute();
    cardsEl.innerHTML = [
      ['Stops', String(packet.stops.length)],
      ['Drive buffer', `${packet.totals.drive}m`],
      ['Work', `${packet.totals.work}m`],
      ['Flags', String(packet.flags.length)],
      ['Boundary', 'Draft-only']
    ].map(([label, value]) => `<article><span>${escRoute(label)}</span><strong>${escRoute(value)}</strong></article>`).join('');
    textEl.value = markdown(packet);
    return packet;
  }
  function download(packet){
    const blob = new Blob([JSON.stringify({ ...packet, markdown: markdown(packet) }, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${packet.sourceApp.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-route-planner-bridge.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  copyBtn?.addEventListener('click', () => navigator.clipboard?.writeText(textEl.value).catch(() => { textEl.focus(); textEl.select(); }));
  downloadBtn?.addEventListener('click', () => download(render()));
  window.addEventListener('input', () => window.requestAnimationFrame(render));
  window.addEventListener('change', () => window.requestAnimationFrame(render));
  render();
})();

// Day 20 Intake Form Builder bridge: draft-only intake form spec.
(() => {
  const section = document.getElementById('intake-form-builder-bridge');
  if (!section) return;
  const cardsEl = document.getElementById('intakeFormCards');
  const textEl = document.getElementById('intakeFormText');
  const copyBtn = document.getElementById('copyIntakeForm');
  const downloadBtn = document.getElementById('downloadIntakeForm');
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const escForm = value => String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function appName(){ return clean(document.querySelector('title')?.textContent || document.querySelector('h1')?.textContent || 'Current app'); }
  function currentOutput(){
    const textareas = [...document.querySelectorAll('textarea')].filter(el => el.id !== 'intakeFormText');
    const filled = textareas.map(el => clean(el.value || el.textContent)).find(v => v.length > 80);
    if (filled) return filled.slice(0, 1700);
    return clean(document.querySelector('main')?.innerText || document.body.innerText || '').slice(0, 1700);
  }
  function inferQuestions(output){
    const base = [
      ['Contact name and best callback', 'short-text', 'Contact', true, 'Name, phone, and best time to respond.'],
      ['Service location or account context', 'short-text', 'Contact', true, 'Enough context to route the request; do not ask for unnecessary IDs.'],
      ['What should we help with?', 'long-text', 'Job details', true, 'Let the requester explain the need in plain words.']
    ];
    if(/urgent|risk|critical|emergency|stale|overdue/i.test(output)) base.push(['How urgent is this request?', 'select', 'Urgency', true, 'Emergency | Today | This week | Planning ahead']);
    if(/proof|screenshot|photo|evidence|result/i.test(output)) base.push(['What proof or files are available?', 'long-text', 'Proof / files', false, 'Describe evidence; do not upload sensitive material here.']);
    if(/price|quote|invoice|cash|revenue|roi|cost/i.test(output)) base.push(['What value, quote, or budget context matters?', 'short-text', 'Commercial context', false, 'Keep estimates draft-only until reviewed.']);
    if(/meeting|call|follow|schedule|route|dispatch|appointment/i.test(output)) base.push(['Preferred timing or next appointment window', 'checkboxes', 'Scheduling', false, 'Morning | Midday | Afternoon | Flexible']);
    base.push(['Consent to be contacted about this request', 'select', 'Consent', true, 'Yes, contact me about this request | No, do not contact me']);
    return base.map((row,index) => ({order:index+1,label:row[0],type:row[1],section:row[2],required:row[3],helper:row[4]}));
  }
  function buildSpec(){
    const sourceApp = appName();
    const output = currentOutput();
    const questions = inferQuestions(output);
    const flags = [];
    if(/password|secret|token|api key|credit card|ssn|social security/i.test(output)) flags.push('Sensitive-data wording detected. Remove secret/payment/SSN/password questions before use.');
    if(/send|publish|customer|crm|webhook|public|dispatch/i.test(output)) flags.push('Public/customer/action wording detected. Keep this as a draft spec until approved.');
    if(!/review|approve|proof|check|confirm/i.test(output)) flags.push('Add explicit human review/proof confirmation before publishing the form.');
    return { sourceApp, formName:`${sourceApp} intake draft`, channel:'Draft local form spec', questions, flags:flags.length ? flags : ['No blocking draft flags detected. Privacy review still required.'], privacyRule:'Do not collect secrets, payment cards, SSNs, medical data, or unnecessary IDs.', sourceSnippet:output, generatedAt:new Date().toISOString() };
  }
  function markdown(spec){
    return ['# Intake Form Builder bridge','',`Generated: ${new Date().toLocaleString()}`,'Draft-only form spec. Do not publish or collect customer submissions until privacy/proof review is complete.','',`Source app: ${spec.sourceApp}`,`Form name: ${spec.formName}`,'','## Questions',...spec.questions.map(q => `### ${q.order}. ${q.label}\n- Type: ${q.type}\n- Section: ${q.section}\n- Required: ${q.required ? 'yes' : 'no'}\n- Helper/choices: ${q.helper}`),'','## Privacy rule',spec.privacyRule,'','## Review flags',...spec.flags.map(v => `- ${v}`),'','## Source snippet',spec.sourceSnippet].join('\n');
  }
  function render(){
    const spec = buildSpec();
    const required = spec.questions.filter(q => q.required).length;
    cardsEl.innerHTML = [
      ['Questions', String(spec.questions.length)],
      ['Required', String(required)],
      ['Flags', String(spec.flags.length)],
      ['Channel', 'Draft spec'],
      ['Boundary', 'No publish']
    ].map(([label, value]) => `<article><span>${escForm(label)}</span><strong>${escForm(value)}</strong></article>`).join('');
    textEl.value = markdown(spec);
    return spec;
  }
  function download(spec){
    const blob = new Blob([JSON.stringify({ ...spec, markdown: markdown(spec) }, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${spec.sourceApp.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-intake-form-bridge.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  copyBtn?.addEventListener('click', () => navigator.clipboard?.writeText(textEl.value).catch(() => { textEl.focus(); textEl.select(); }));
  downloadBtn?.addEventListener('click', () => download(render()));
  window.addEventListener('input', () => window.requestAnimationFrame(render));
  window.addEventListener('change', () => window.requestAnimationFrame(render));
  render();
})();

