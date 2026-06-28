const STORAGE_KEY = 'content-repurposer-v1';
const demoNotes = `Built Day 18 Content Repurposer as a real local-first browser app. The app takes a build log or rough transcript and turns it into YouTube titles, descriptions, chapters, short posts, newsletter blurbs, proof notes, caveats, and a review checklist. Verification included static smoke test, browser render, clean JavaScript console, theme persistence, LAN phone URL check, and recording MP4 render. Safety boundary: draft-only content, no posting, no cloud calls, no account connections, no customer sends.`;
const defaults = { theme:'dark', projectName:'Content Repurposer', audience:'Owner/operator', tone:'Plain-spoken', sourceNotes:demoNotes, outcome:'Show a real local-first app built and verified today', proofNotes:'Static smoke passed. Browser rendered. Console clean. Theme persisted. Phone URL returned HTTP 200. Recording MP4 rendered.', caveats:'Draft-only. Local browser storage only. No posting, uploading, cloud APIs, account connections, or customer-facing actions.', includeYoutube:true, includeChapters:true, includeShorts:true, includeNewsletter:true, includeProof:true, approvalRequired:true };
const $ = id => document.getElementById(id);
const fields = ['projectName','audience','tone','sourceNotes','outcome','proofNotes','caveats','includeYoutube','includeChapters','includeShorts','includeNewsletter','includeProof','approvalRequired'];
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function clone(value){ return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }
function normalize(value){ const next = { ...clone(defaults), ...(value || {}) }; next.theme = next.theme === 'light' ? 'light' : 'dark'; return next; }
function loadState(){ try { const raw = localStorage.getItem(STORAGE_KEY); if(raw) return normalize(JSON.parse(raw)); } catch {} return clone(defaults); }
let state = loadState();
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function syncForm(){ fields.forEach(id => { const el = $(id); if(!el) return; if(el.type === 'checkbox') el.checked = Boolean(state[id]); else el.value = state[id] || ''; }); }
function readForm(){ fields.forEach(id => { const el = $(id); if(!el) return; state[id] = el.type === 'checkbox' ? el.checked : el.value; }); }
function applyTheme(){ document.documentElement.dataset.theme = state.theme; $('themeToggle').textContent = state.theme === 'light' ? 'Dark' : 'Light'; $('themeToggle').setAttribute('aria-pressed', state.theme === 'light' ? 'true' : 'false'); }
function sentences(text){ return clean(text).split(/(?<=[.!?])\s+/).filter(Boolean); }
function keywords(text){ const stop = new Set('the and for with that this from into local app built build day real draft only verified browser output phone content source notes today using before after human review static'.split(' ')); const counts = new Map(); clean(text).toLowerCase().replace(/[^a-z0-9\s-]/g,' ').split(/\s+/).filter(w => w.length > 3 && !stop.has(w)).forEach(w => counts.set(w, (counts.get(w)||0)+1)); return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([w])=>w); }
function titleCase(s){ return clean(s).replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()); }
function packet(){
  readForm();
  const text = clean(state.sourceNotes) || demoNotes;
  const bits = sentences(text);
  const keys = keywords(text);
  const project = clean(state.projectName) || 'Untitled build';
  const outcome = clean(state.outcome) || 'Show the useful result';
  const titleCore = `${project}: ${outcome}`.slice(0, 88);
  const titles = [titleCore, `I built ${project} from a rough build log`, `${titleCase(keys.slice(0,3).join(' ')) || project}: practical build replay`].map(v => v.replace(/\s+/g,' ').trim());
  const chapters = [
    ['00:00', 'What got built', bits[0] || outcome],
    ['00:35', 'Source-to-output workflow', bits[1] || 'The app turns rough notes into publishing assets.'],
    ['01:20', 'Exports and review packet', bits[2] || 'Markdown, JSON, CSV, and short post drafts stay local.'],
    ['02:05', 'Safety boundary', clean(state.caveats) || 'Draft-only local tool with human approval before public posting.'],
    ['02:45', 'Verification', clean(state.proofNotes) || 'Smoke test and browser checks passed.']
  ];
  const shortPosts = [
    `Built ${project} today. It turns one rough build log into titles, descriptions, chapters, short posts, and a review packet — all local-first and draft-only.`,
    `Useful constraint: ${project} does not post or call cloud APIs. It just makes the content handoff sharper so a human can review before anything public.`,
    `Proof beats polish alone: ${clean(state.proofNotes) || 'the app was smoke-tested, rendered in-browser, and exported recording assets.'}`
  ];
  const flags = [];
  if(text.length < 180) flags.push('Source notes are short; add build/verification detail before publishing.');
  if(!clean(state.proofNotes)) flags.push('Proof notes are missing.');
  if(!clean(state.caveats)) flags.push('Caveats/boundaries are missing.');
  if(!state.approvalRequired) flags.push('Human approval checkbox is off.');
  if(/post(ed|ing)?|publish(ed|ing)?|upload(ed|ing)?|send|customer|client|public/gi.test(text) && !state.approvalRequired) flags.push('Public/customer action words found without approval gate.');
  const description = [`${project} is a local-first draft tool for ${state.audience.toLowerCase()}.`, outcome, '', `What it does: ${bits.slice(0,3).join(' ') || 'Turns rough source notes into reusable publishing assets.'}`, '', `Proof: ${clean(state.proofNotes) || 'Add verification notes before publishing.'}`, '', `Boundary: ${clean(state.caveats) || 'Draft-only until human review.'}`].join('\n');
  return { project, audience:state.audience, tone:state.tone, keywords:keys, titles, description, chapters, shortPosts, newsletter:`Today I built ${project}. The useful part is simple: one messy build log becomes a clean publishing packet with titles, description, chapters, short posts, proof notes, caveats, and an approval checklist. It stays local and draft-only, so the output can be reviewed before anything goes public.`, proofChecklist:['Does the title match the actual build?','Does the description include proof, not hype?','Are caveats and draft-only boundaries visible?','Are public/customer-facing claims human-approved?','Are URLs/screenshots/logs secret-safe before sharing?'], flags, generatedAt:new Date().toISOString() };
}
function markdown(p){ const out = ['# Content Repurposer Packet','',`Generated: ${new Date().toLocaleString()}`,`Project: ${p.project}`,`Audience: ${p.audience}`,`Tone: ${p.tone}`,'']; if(state.includeYoutube){ out.push('## YouTube titles', ...p.titles.map(t => `- ${t}`), '', '## YouTube description', p.description, ''); } if(state.includeChapters){ out.push('## Chapters', ...p.chapters.map(c => `- ${c[0]} — ${c[1]}: ${c[2]}`), ''); } if(state.includeShorts){ out.push('## Short posts', ...p.shortPosts.map((post,i)=>`### Post ${i+1}\n${post}`), ''); } if(state.includeNewsletter){ out.push('## Newsletter blurb', p.newsletter, ''); } if(state.includeProof){ out.push('## Proof and caveat checklist', ...p.proofChecklist.map(v => `- [ ] ${v}`), ''); } out.push('## Review flags', ...(p.flags.length ? p.flags.map(v => `- ${v}`) : ['- No blocking review flags detected. Still review manually.']), '', '## Approval boundary', state.approvalRequired ? 'Human approval required before public posting, uploading, sending, customer contact, or paid promotion.' : 'WARNING: approval requirement is disabled. Turn it on before public use.'); return out.join('\n'); }
function csv(p){ const rows = [['section','item','value']]; p.titles.forEach((v,i)=>rows.push(['youtube_title',i+1,v])); p.chapters.forEach(c=>rows.push(['chapter',c[0],`${c[1]}: ${c[2]}`])); p.shortPosts.forEach((v,i)=>rows.push(['short_post',i+1,v])); p.flags.forEach((v,i)=>rows.push(['review_flag',i+1,v])); return rows.map(r => r.map(c => `"${String(c).replaceAll('"','""')}"`).join(',')).join('\n'); }
function render(){ readForm(); const p = packet(); $('metricWords').textContent = String((clean(state.sourceNotes).match(/\b\w+\b/g) || []).length); $('metricChapters').textContent = String(p.chapters.length); $('metricPosts').textContent = String(p.shortPosts.length); $('metricFlags').textContent = String(p.flags.length); $('chapterRail').innerHTML = p.chapters.map(c => `<article class="chapter"><time>${esc(c[0])}</time><h3>${esc(c[1])}</h3><p>${esc(c[2])}</p></article>`).join(''); $('postCards').innerHTML = p.shortPosts.map((post,i)=>`<article><h3>Post ${i+1}</h3><p>${esc(post)}</p></article>`).join(''); $('reviewChecklist').innerHTML = [...p.proofChecklist, state.approvalRequired ? 'Approval gate is on.' : 'Turn approval gate on.'].map(v => `<li>${esc(v)}</li>`).join(''); $('markdownOutput').value = markdown(p); saveState(); return p; }
function download(name, text, type){ const blob = new Blob([text], {type}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }
function toast(msg){ const el = $('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(() => el.classList.remove('show'), 1700); }
function copy(text){ navigator.clipboard?.writeText(text).then(()=>toast('Copied')).catch(()=>{ $('markdownOutput').focus(); $('markdownOutput').select(); toast('Select/copy manually'); }); }
fields.forEach(id => $(id)?.addEventListener('input', () => window.requestAnimationFrame(render)));
fields.forEach(id => $(id)?.addEventListener('change', () => window.requestAnimationFrame(render)));
$('themeToggle').addEventListener('click', () => { state.theme = state.theme === 'light' ? 'dark' : 'light'; applyTheme(); saveState(); toast(`${state.theme === 'light' ? 'Light' : 'Dark'} mode saved`); });
$('loadDemo').addEventListener('click', () => { state = clone(defaults); syncForm(); applyTheme(); render(); toast('Demo log loaded'); });
$('generatePacket').addEventListener('click', () => { render(); toast('Publishing packet generated'); });
$('copyMarkdown').addEventListener('click', () => copy($('markdownOutput').value));
$('downloadMarkdown').addEventListener('click', () => download('content-repurposer-packet.md', $('markdownOutput').value, 'text/markdown'));
$('downloadJson').addEventListener('click', () => { const p = packet(); download('content-repurposer-packet.json', JSON.stringify({ ...p, markdown: markdown(p), settings: state }, null, 2), 'application/json'); });
$('downloadCsv').addEventListener('click', () => download('content-repurposer-packet.csv', csv(packet()), 'text/csv'));
syncForm(); applyTheme(); render();

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

