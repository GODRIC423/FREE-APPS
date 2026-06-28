const STORAGE_KEY = 'lead-leak-radar-v2-radar-board';
const templates = {
  calls: { label: 'Missed calls', check: 'Pull call logs and mark unanswered or after-hours calls.', fix: 'Daily missed-call queue with draft callback text.', proof: 'Callback rate, recovered booked calls, owner approvals.' },
  forms: { label: 'Web forms', check: 'Submit a test form and time first response.', fix: 'One response owner and visible first-response timer.', proof: 'Form-to-reply time and stale forms recovered.' },
  inbox: { label: 'Inbox / email', check: 'Search unread, unassigned, and older-than-24h requests.', fix: 'Triage label plus daily unresolved-request report.', proof: 'Open request count, resolved count, next-action log.' },
  booking: { label: 'Booking links', check: 'Walk booking flow for abandonment or unclear slots.', fix: 'Fallback callback drafts for incomplete bookings.', proof: 'Abandoned bookings, saved appointments, follow-up approvals.' },
  custom: { label: 'Custom', check: 'Audit the handoff where this lead waits or changes owner.', fix: 'One owner, one timer, one draft-only follow-up lane.', proof: 'Lost lead count, recovery attempts, approved next actions.' }
};
const demoState = {
  businessType: 'HVAC', closeRate: 32, recoveryRate: 42, theme: 'dark',
  proofRequirement: 'Owner wants a daily list of missed leads, who approved follow-up, and how many booked calls came back.',
  sources: [
    { id: 'calls', type: 'calls', name: 'After-hours calls', weeklyVolume: 26, leakRate: 38, delayHours: 12, avgValue: 720, confidence: 86 },
    { id: 'forms', type: 'forms', name: 'Website quote forms', weeklyVolume: 14, leakRate: 24, delayHours: 8, avgValue: 650, confidence: 74 },
    { id: 'inbox', type: 'inbox', name: 'Shared inbox', weeklyVolume: 18, leakRate: 19, delayHours: 20, avgValue: 540, confidence: 63 },
    { id: 'booking', type: 'booking', name: 'Booking link drop-off', weeklyVolume: 11, leakRate: 17, delayHours: 5, avgValue: 480, confidence: 58 }
  ]
};
let state = loadState();
const $ = id => document.getElementById(id);
function clone(v){ return structuredClone ? structuredClone(v) : JSON.parse(JSON.stringify(v)); }
function loadState(){ try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? { ...clone(demoState), ...JSON.parse(raw) } : clone(demoState); } catch { return clone(demoState); } }
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function clamp(v,min,max){ const n=Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min,n)) : min; }
function money(v){ return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v||0); }
function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function enriched(){ return (state.sources||[]).map((s,i)=>{ const weeklyVolume=clamp(s.weeklyVolume,0,100000), leakRate=clamp(s.leakRate,0,100), delayHours=clamp(s.delayHours,0,720), avgValue=clamp(s.avgValue,0,1000000), confidence=clamp(s.confidence,0,100); const weeklyLost=weeklyVolume*leakRate/100; const monthlyLeak=weeklyLost*4*avgValue*(state.closeRate/100); const recoverable=monthlyLeak*(state.recoveryRate/100); const urgency=Math.min(100, Math.round(leakRate*.32 + delayHours*1.55 + confidence*.18 + Math.min(30,recoverable/160))); return {...s, order:i, weeklyVolume, leakRate, delayHours, avgValue, confidence, weeklyLost, monthlyLeak, recoverable, urgency}; }).sort((a,b)=>b.urgency-a.urgency || b.recoverable-a.recoverable); }
function totals(items=enriched()){ return items.reduce((a,x)=>{ a.weeklyLost+=x.weeklyLost; a.monthlyLeak+=x.monthlyLeak; a.recoverable+=x.recoverable; return a; }, {weeklyLost:0, monthlyLeak:0, recoverable:0}); }
function setTheme(){ document.documentElement.dataset.theme = state.theme === 'light' ? 'light' : 'dark'; $('themeToggle').textContent = state.theme === 'light' ? 'Dark' : 'Light'; $('themeToggle').setAttribute('aria-pressed', state.theme === 'light' ? 'true':'false'); }
function bindInputs(){ $('businessType').value=state.businessType||''; $('closeRate').value=state.closeRate; $('recoveryRate').value=state.recoveryRate; $('proofRequirement').value=state.proofRequirement||''; }
function renderSources(){ $('sourceList').innerHTML = (state.sources||[]).map(s => `<article class="source-node"><div class="node-top"><strong>${esc(s.name)}</strong><button data-remove="${esc(s.id)}" type="button">remove</button></div><div class="node-grid"><label>Name<input data-id="${esc(s.id)}" data-field="name" value="${esc(s.name)}"></label><label>Type<select data-id="${esc(s.id)}" data-field="type">${Object.entries(templates).map(([k,t])=>`<option value="${k}" ${s.type===k?'selected':''}>${t.label}</option>`).join('')}</select></label><label>Weekly<input type="number" data-id="${esc(s.id)}" data-field="weeklyVolume" value="${s.weeklyVolume}"></label><label>Leak %<input type="number" data-id="${esc(s.id)}" data-field="leakRate" value="${s.leakRate}"></label><label>Delay h<input type="number" data-id="${esc(s.id)}" data-field="delayHours" value="${s.delayHours}"></label><label>Avg $<input type="number" data-id="${esc(s.id)}" data-field="avgValue" value="${s.avgValue}"></label></div></article>`).join('') || '<p>No sources yet. Add one to start the radar.</p>';
  document.querySelectorAll('[data-field]').forEach(input => input.addEventListener('input', () => { const source = state.sources.find(s => s.id === input.dataset.id); if(!source) return; const f=input.dataset.field; source[f]=['weeklyVolume','leakRate','delayHours','avgValue'].includes(f) ? Number(input.value) : input.value; renderComputed(); saveState(); }));
  document.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', () => { state.sources = state.sources.filter(s => s.id !== btn.dataset.remove); renderAll(); toast('Source removed'); }));
}
function renderRadar(items=enriched(), total=totals(items)){ const top=items[0]; const risk=Math.min(99, Math.round((top?.urgency||0)*.72 + Math.min(28,total.recoverable/290))); $('riskScore').textContent=risk; $('riskTitle').textContent = risk>=78 ? 'High-value leak cluster' : risk>=52 ? 'Recoverable leak pattern' : 'Light leak signal'; $('totalRecoverable').textContent = `${money(total.recoverable)}/mo`; $('weeklyLost').textContent=total.weeklyLost.toFixed(1); $('monthlyLeak').textContent=money(total.monthlyLeak); $('channelCount').textContent=items.length; const rings=[70,120,170,205]; let svg = `<circle cx="210" cy="210" r="205" fill="none" stroke="rgba(57,255,136,.18)"/><line x1="210" y1="0" x2="210" y2="420" stroke="rgba(57,255,136,.12)"/><line x1="0" y1="210" x2="420" y2="210" stroke="rgba(57,255,136,.12)"/>`; rings.forEach(r => svg += `<circle cx="210" cy="210" r="${r}" fill="none" stroke="rgba(57,255,136,.14)"/>`); svg += `<path d="M210 210 L210 8 A202 202 0 0 1 392 122 Z" fill="rgba(57,255,136,.10)"><animateTransform attributeName="transform" type="rotate" from="0 210 210" to="360 210 210" dur="7s" repeatCount="indefinite"/></path>`; items.forEach((it,idx)=>{ const angle=(-90 + idx*(360/Math.max(items.length,1))) * Math.PI/180; const radius=48 + (100-it.urgency)*.95; const x=210+Math.cos(angle)*radius, y=210+Math.sin(angle)*radius; const color=it.urgency>76?'var(--red)':it.urgency>54?'var(--amber)':'var(--green)'; const left=x<210; const labelX=Math.max(38, Math.min(382, x + (left ? -18 : 18))); const labelY=Math.max(32, Math.min(388, y + 5)); const anchor=left ? 'end' : 'start'; svg += `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${Math.max(9, it.urgency/7).toFixed(1)}" fill="${color}" opacity=".86"/><text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="${anchor}" fill="currentColor" font-size="12" font-weight="800">${esc(it.name)}</text></g>`; }); $('radarSvg').innerHTML=svg; }
function renderPlan(items=enriched()){ $('planList').innerHTML = items.slice(0,4).map((it,idx)=>{ const t=templates[it.type]||templates.custom; return `<article class="plan-card"><b>${idx+1}</b><div><strong>${esc(it.name)}</strong><p>${money(it.recoverable)}/mo recoverable. First fix: ${esc(t.fix)}</p></div></article>`; }).join('') || '<p>Add sources to generate first fixes.</p>'; $('evidenceRows').innerHTML = items.map((it,idx)=>{ const t=templates[it.type]||templates.custom; return `<tr><td><strong>${idx+1}</strong></td><td><strong>${esc(it.name)}</strong><br>${it.urgency}/100 urgency</td><td>${esc(t.check)}</td><td>${esc(t.proof)}</td><td>Draft-only until owner approves exact customer action.</td></tr>`; }).join(''); }
function ownerDigest(items=enriched(), total=totals(items)){ const top=items[0]; const riskWord=(top?.urgency||0)>=78?'Hot':(top?.urgency||0)>=55?'Watch':'Stable'; const proof=state.proofRequirement || 'Owner needs a daily list of leak counts, recovery attempts, approvals, and booked outcomes.'; return [`# Owner report digest — ${state.businessType || 'Local business'}`,'',`Headline: ${riskWord} lead-leak signal with ${money(total.recoverable)}/mo recoverable value.`,`Top risk: ${top ? `${top.name} at ${top.urgency}/100 urgency` : 'No source added yet'}.`,`Today’s win to report: ${total.weeklyLost.toFixed(1)} weekly lost leads identified across ${items.length} channel${items.length===1?'':'s'}.`,`Decision needed: approve the first fix for ${top ? top.name : 'the highest-value channel'} and name the human owner.`,`Proof requirement: ${proof}`,'','Owner Report Studio fields:',`- Business / crew: ${state.businessType || 'Local business'}`,`- Recovered value: ${money(total.recoverable)}` ,`- Open leads: ${total.weeklyLost.toFixed(1)} estimated weekly lost`, `- Risk / blocker: ${top ? (templates[top.type]||templates.custom).check : 'Add a source before reporting'}`,'- Safety: draft-only; no customer contact or CRM writes from this app.'].join('\n'); }
function renderDigest(items=enriched(), total=totals(items)){ const top=items[0]; const cards=[['Owner headline', `${money(total.recoverable)}/mo recoverable`], ['Top blocker', top ? top.name : 'No source'], ['Open lead signal', `${total.weeklyLost.toFixed(1)} weekly lost`], ['Decision ask', top ? `Approve ${top.name} fix` : 'Add source']]; $('digestCards').innerHTML=cards.map(([label,value])=>`<article><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`).join(''); $('digestText').value=ownerDigest(items,total); }
function approvalDeskText(items=enriched(), total=totals(items)){ const top=items[0]; return [`# Approval Gate Desk handoff — ${state.businessType || 'Local business'}`,'',`Top draft queue item: ${top ? `${top.name} recovery message` : 'Add a source first'}.`,`Recoverable value behind approvals: ${money(total.recoverable)}/mo.`,`Required stamp: human approve/reject/revise is logged only; follow-up is tracked separately.`,`Reviewer note: ${state.proofRequirement || 'Verify the draft matches the real source evidence and does not overpromise.'}`,'','Drafts to load into Approval Gate Desk:',...items.slice(0,4).map((it,idx)=>`- ${idx+1}. ${it.name}: review the first-fix draft, evidence check, and owner decision; export the decision log for human use outside the app.`),'','Safety checklist:','- Lead Leak Radar does not send messages or write CRM records.','- Do not approve a draft unless source evidence was checked.','- Reject or revise guarantees, discounts, appointment promises, and unsupported claims.','-  ; export the decision log, then a human uses it outside the app.'].join('\n'); }
function renderApprovalDesk(items=enriched(), total=totals(items)){ const top=items[0]; const cards=[['Drafts waiting', String(Math.min(items.length,4))], ['Top lane', top ? top.name : 'No source'], ['Approval value', `${money(total.recoverable)}/mo`], ['Gate', 'Human stamp only']]; $('approvalDeskCards').innerHTML=cards.map(([label,value])=>`<article><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`).join(''); $('approvalDeskText').value=approvalDeskText(items,total); }

function quoteLeakText(items=enriched(), total=totals(items)){
  const top = items[0];
  const quoteSource = items.find(it => /quote|estimate|booking/i.test(`${it.name} ${it.type}`)) || top;
  return [`# Quote Chase Board handoff — ${state.businessType || 'Local business'}`,'',`Quote/estimate lane to chase: ${quoteSource ? quoteSource.name : 'Add a quote source first'}.`,`Open value proxy: ${money(total.monthlyLeak)} monthly leak, ${money(total.recoverable)} recoverable target.`,`Stale rule: any sent quote with no touch for 7 days moves to stale and needs a human-reviewed follow-up draft.`,`Owner proof: ${state.proofRequirement || 'Track sent quote, follow-up date, owner, value, and result.'}`,'','Starter Quote Chase Board rows:',...items.slice(0,4).map((it,idx)=>`- ${idx+1}. ${it.name}: seed as a quote lane with ${money(it.recoverable)} recoverable value and draft-only follow-up note.`),'','Safety: Lead Leak Radar and Quote Chase Board only produce local exports. No messages, CRM writes, or customer actions happen here.'].join('\n');
}
function renderQuoteLeak(items=enriched(), total=totals(items)){
  const top = items[0];
  const cards = [['Quote lane', top ? top.name : 'No source'], ['Open value proxy', money(total.recoverable)], ['Stale clock', '7 days'], ['Mode', 'Draft-only board']];
  $('quoteLeakCards').innerHTML = cards.map(([label,value])=>`<article><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`).join('');
  $('quoteLeakText').value = quoteLeakText(items,total);
}

function markdown(items=enriched(), total=totals(items)){ const lines=[`# Lead Leak Radar — ${state.businessType || 'Local business'}`,'',`- Weekly lost leads: ${total.weeklyLost.toFixed(1)}`,`- Monthly leak estimate: ${money(total.monthlyLeak)}`,`- Recoverable/month estimate: ${money(total.recoverable)}`,`- Owner proof requirement: ${state.proofRequirement || 'Not set'}`,'','## Recovery queue']; items.forEach((it,idx)=>{ const t=templates[it.type]||templates.custom; lines.push('',`### ${idx+1}. ${it.name}`,`- Urgency: ${it.urgency}/100`,`- Recoverable/month: ${money(it.recoverable)}`,`- Check: ${t.check}`,`- First fix: ${t.fix}`,`- Proof: ${t.proof}`,'- Safety: draft review; actions are tracked separately.'); }); lines.push('', '## Owner Report Studio digest', ...ownerDigest(items,total).split('\n').filter(line=>!line.startsWith('# ')).map(line=>line ? `- ${line}` : ''), '', '## Approval Gate Desk handoff', ...approvalDeskText(items,total).split('\n').filter(line=>!line.startsWith('# ')).map(line=>line ? `- ${line}` : ''), '', '## Quote Chase Board handoff', ...quoteLeakText(items,total).split('\n').filter(line=>!line.startsWith('# ')).map(line=>line ? `- ${line}` : ''), '', '## Review boundary', 'This app performs no calls, emails, texts, CRM writes, or cloud actions. It only creates a local planning/export artifact.'); return lines.join('\n'); }
function renderComputed(){ const items=enriched(), total=totals(items); renderRadar(items,total); renderPlan(items); renderDigest(items,total); renderApprovalDesk(items,total); renderQuoteLeak(items,total); $('exportText').value=markdown(items,total); }
function renderAll(){ setTheme(); bindInputs(); renderSources(); renderComputed(); saveState(); }
function toast(msg){ const el=$('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(window.__toastTimer); window.__toastTimer=setTimeout(()=>el.classList.remove('show'),1700); }
function copyText(text){ navigator.clipboard?.writeText(text).then(()=>toast('Copied')).catch(()=>{ $('exportText').focus(); $('exportText').select(); toast('Select/copy from export'); }); }
function addSource(){ state.sources.push({ id: crypto.randomUUID(), type:'custom', name:'New leak lane', weeklyVolume:10, leakRate:15, delayHours:6, avgValue:500, confidence:50 }); renderAll(); toast('Source added'); }
['businessType','proofRequirement'].forEach(k => $(k).addEventListener('input', e => { state[k]=e.target.value; renderComputed(); saveState(); }));
['closeRate','recoveryRate'].forEach(k => $(k).addEventListener('input', e => { state[k]=clamp(e.target.value,0,100); renderComputed(); saveState(); }));
$('themeToggle').addEventListener('click', () => { state.theme = state.theme === 'light' ? 'dark' : 'light'; renderAll(); toast(`${state.theme === 'light' ? 'Light':'Dark'} mode saved`); });
$('demoBtn').addEventListener('click', () => { state=clone(demoState); renderAll(); toast('Demo loaded'); });
$('blankBtn').addEventListener('click', () => { state={...clone(demoState), businessType:'', proofRequirement:'', sources:[]}; renderAll(); toast('Blank scan ready'); });
$('addSource').addEventListener('click', addSource);
$('copyMarkdown').addEventListener('click', () => copyText($('exportText').value));
$('copyDigest').addEventListener('click', () => copyText($('digestText').value));
$('copyApprovalDesk').addEventListener('click', () => copyText($('approvalDeskText').value));
$('copyQuoteLeak').addEventListener('click', () => copyText($('quoteLeakText').value));
$('downloadJson').addEventListener('click', () => { const items=enriched(); const blob=new Blob([JSON.stringify({...state, totals:totals(items), ranked:items},null,2)], {type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='lead-leak-radar-export.json'; a.click(); URL.revokeObjectURL(url); toast('JSON downloaded'); });
renderAll();


// DAY06_REVIEW_REQUEST_BRIDGE_START
(function initReviewRequestBridge(){
  const cards = document.getElementById('reviewRequestCards');
  const text = document.getElementById('reviewRequestText');
  if(!cards || !text) return;
  const getVal = id => { const el = document.getElementById(id); if(!el) return ''; return ('value' in el ? el.value : el.textContent || '').trim(); };
  const escBridge = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function context(){
    const title = document.title;
    if(title.includes('Pilot Forge')) return { source:title, candidate:`${getVal('businessType') || 'Service business'} pilot customer`, moment:'After the proof window shows a real completed win', proof:getVal('proof') || getVal('scoreText') || 'Owner-visible proof from the pilot', ask:`If the pilot created a clear win, ask for one honest sentence about the experience.`, guard:'Do not request a review until the job outcome is real, verified, and customer-safe.' };
    if(title.includes('Lead Leak Radar')) return { source:title, candidate:`${getVal('businessType') || 'Recovered lead'} customer`, moment:'After a recovered lead books, completes, and thanks the team', proof:`${getVal('totalRecoverable') || 'Recovered value'} signal plus ${getVal('riskTitle') || 'lead leak fix'}`, ask:'Turn the recovered-lead win into a low-pressure review request candidate.', guard:'Never ask from a raw lead list; wait for completed service and positive signal.' };
    if(title.includes('Owner Report Studio')) return { source:title, candidate:getVal('businessName') || 'Owner-report customer', moment:'When the daily report shows a completed win with no open blocker', proof:getVal('win') || getVal('executiveSummary') || 'Today’s documented win', ask:'Use the owner report as the proof note for a review ask packet.', guard:'If the report has a risk/blocker, resolve it before requesting a review.' };
    if(title.includes('Approval Gate Desk')) return { source:title, candidate:getVal('customer') || 'Approved draft customer', moment:'After a human approves the request wording and confirms job quality', proof:getVal('reviewNote') || `${getVal('metricApproved') || '0'} approved decisions in the ledger`, ask:'Route the review request through the same approval stamp before manual send.', guard:'No unstamped review requests; reject or revise if claims, discounts, or pressure appear.' };
    return { source:title, candidate:getVal('customer') || 'Won quote customer', moment:'After the quoted work is completed and the customer is satisfied', proof:getVal('note') || `${getVal('metricWon') || '$0'} won quote value with a completed job`, ask:'Convert won/completed quote momentum into a low-pressure review request.', guard:'A won quote alone is not enough; wait for finished work and positive customer signal.' };
  }
  function packet(){ const c = context(); return ['# Review Request Composer bridge','',`Source app: ${c.source}`,`Candidate: ${c.candidate}`,`Best moment: ${c.moment}`,`Proof detail: ${c.proof}`,`Draft ask: ${c.ask}`,`Safety guard: ${c.guard}`,'','Manual-send boundary: this app only drafts/copies/exports. A human verifies customer mood, job outcome, and platform policy before contact.'].join('\n'); }
  function render(){ const c = context(); cards.innerHTML = [['Candidate',c.candidate],['Best moment',c.moment],['Proof detail',c.proof],['Guardrail',c.guard]].map(([a,b]) => `<article><span>${escBridge(a)}</span><strong>${escBridge(b)}</strong></article>`).join(''); text.value = packet(); }
  function downloadBridge(){ const c = context(); const blob = new Blob([JSON.stringify({ ...c, markdown: packet(), generatedAt:new Date().toISOString(), safety:'draft-only manual-send boundary' }, null, 2)], {type:'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'review-request-bridge.json'; a.click(); URL.revokeObjectURL(url); }
  document.getElementById('copyReviewRequestBridge')?.addEventListener('click', () => navigator.clipboard?.writeText(text.value));
  document.getElementById('downloadReviewRequestBridge')?.addEventListener('click', downloadBridge);
  ['input','change','click'].forEach(evt => document.addEventListener(evt, () => window.requestAnimationFrame(render)));
  render();
})();
// DAY06_REVIEW_REQUEST_BRIDGE_END

// DAY07_TECH_BRIEF_BRIDGE_START
(() => {
  const root = document.getElementById('tech-brief-bridge');
  if(!root) return;
  const cards = document.getElementById('techBriefCards');
  const text = document.getElementById('techBriefText');
  const clean = v => String(v || '').trim();
  const val = id => clean(document.getElementById(id)?.value || document.getElementById(id)?.textContent);
  const escBridge = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function context(){
    const title = document.title || 'Local app';
    const customer = val('customer') || val('businessType') || val('businessName') || val('metricOpenValue') || 'Customer/site from current app';
    const issue = val('issue') || val('win') || val('proofRequirement') || val('note') || val('requestDraft') || val('message') || 'Translate current app output into the job issue and field objective.';
    const parts = val('parts') || val('actionList') || val('quoteLeakText') || val('approvalDeskText') || val('exportText') || 'Bring the checklist, screenshots, quote/report proof, and any likely parts before dispatch.';
    const risk = val('hazards') || val('risk') || val('metricRisk') || 'Verify access, safety, customer mood, scope, timing, and price before making commitments.';
    return { source:title, customer, issue:issue.slice(0,260), parts:parts.slice(0,260), risk:risk.slice(0,220), boundary:'Draft/export only. A human verifies the site, customer, safety, pricing, and schedule before dispatch or contact.' };
  }
  function packet(){ const c=context(); return ['# Technician Brief Builder bridge','',`Source app: ${c.source}`,`Customer/site: ${c.customer}`,`Reported issue / objective: ${c.issue}`,`Parts/checks to carry forward: ${c.parts}`,`Risk notes: ${c.risk}`,`No-promise boundary: ${c.boundary}`,'','Use this as a starter handoff inside Technician Brief Builder; do not send, schedule, quote, or update a customer from this bridge.'].join('\n'); }
  function render(){ const c=context(); cards.innerHTML = [['Customer/site',c.customer],['Issue/objective',c.issue],['Parts/checks',c.parts],['Risk boundary',c.risk]].map(([a,b]) => `<article><span>${escBridge(a)}</span><strong>${escBridge(b)}</strong></article>`).join(''); text.value = packet(); }
  function downloadBridge(){ const c=context(); const blob = new Blob([JSON.stringify({ ...c, markdown:packet(), generatedAt:new Date().toISOString(), safety:'draft-only technician brief handoff' }, null, 2)], {type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='technician-brief-bridge.json'; a.click(); URL.revokeObjectURL(url); }
  document.getElementById('copyTechBriefBridge')?.addEventListener('click', () => navigator.clipboard?.writeText(text.value));
  document.getElementById('downloadTechBriefBridge')?.addEventListener('click', downloadBridge);
  ['input','change','click'].forEach(evt => document.addEventListener(evt, () => window.requestAnimationFrame(render)));
  render();
})();
// DAY07_TECH_BRIEF_BRIDGE_END

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

