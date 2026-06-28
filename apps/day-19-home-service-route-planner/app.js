const STORAGE_KEY = 'home-service-route-planner-v1';
const today = new Date().toISOString().slice(0,10);
const demoJobs = [
  {id: cryptoId(), customer:'Morgan Residence', address:'North Loop', summary:'No heat callback. Bring igniter kit and confirm prior repair.', priority:5, windowStart:'08:30', duration:90},
  {id: cryptoId(), customer:'Santos Duplex', address:'East Ridge', summary:'Maintenance visit with filter swap and thermostat check.', priority:3, windowStart:'10:30', duration:75},
  {id: cryptoId(), customer:'Pine Street Rental', address:'South Hill', summary:'Tenant reports slow drain. Need camera if first line fails.', priority:4, windowStart:'13:00', duration:105},
  {id: cryptoId(), customer:'Harbor View HOA', address:'West Harbor', summary:'Quote walkthrough. Keep it last if emergency job runs long.', priority:2, windowStart:'15:30', duration:60}
];
const defaults = { theme:'dark', routeDate:today, depot:'Main shop / Van 2', technician:'Alex · Van 2', startTime:'08:00', maxHours:8, driveMinutes:22, adminBuffer:35, plannerNote:'Call before rolling to Pine Street. Confirm Morgan has driveway access.', jobs: demoJobs };
const $ = id => document.getElementById(id);
const fields = ['routeDate','depot','technician','startTime','maxHours','driveMinutes','adminBuffer','plannerNote'];
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function cryptoId(){ if(window.crypto?.randomUUID) return crypto.randomUUID(); return `job-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function clone(value){ return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }
function normalize(value){ const next = { ...clone(defaults), ...(value || {}) }; next.theme = next.theme === 'light' ? 'light' : 'dark'; next.jobs = Array.isArray(next.jobs) && next.jobs.length ? next.jobs : clone(demoJobs); return next; }
function loadState(){ try { const raw = localStorage.getItem(STORAGE_KEY); if(raw) return normalize(JSON.parse(raw)); } catch {} return clone(defaults); }
let state = loadState();
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function applyTheme(){ document.documentElement.dataset.theme = state.theme; $('themeToggle').textContent = state.theme === 'light' ? 'Dark' : 'Light'; $('themeToggle').setAttribute('aria-pressed', state.theme === 'light' ? 'true' : 'false'); }
function syncForm(){ fields.forEach(id => { const el = $(id); if(el) el.value = state[id] ?? ''; }); }
function readForm(){ fields.forEach(id => { const el = $(id); if(!el) return; state[id] = el.type === 'number' ? Number(el.value || 0) : el.value; }); }
function minutesFromTime(time){ const [h,m] = String(time || '08:00').split(':').map(Number); return (h||0)*60 + (m||0); }
function timeFromMinutes(total){ const h = Math.floor(total / 60) % 24; const m = Math.round(total % 60); return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; }
function sortJobs(){ return [...state.jobs].sort((a,b) => Number(a.windowStart.replace(':','')) - Number(b.windowStart.replace(':','')) || b.priority - a.priority); }
function plannedStops(){
  readForm();
  const drive = Number(state.driveMinutes) || 0;
  let cursor = minutesFromTime(state.startTime);
  return sortJobs().map((job, index) => {
    if(index > 0) cursor += drive;
    const windowStart = minutesFromTime(job.windowStart || state.startTime);
    const wait = Math.max(0, windowStart - cursor);
    cursor += wait;
    const arrive = cursor;
    const depart = arrive + (Number(job.duration) || 60);
    cursor = depart;
    return { ...job, order:index+1, arrive:timeFromMinutes(arrive), depart:timeFromMinutes(depart), wait, driveBefore:index === 0 ? 0 : drive };
  });
}
function routePacket(){
  const stops = plannedStops();
  const drive = Math.max(0, (stops.length - 1) * (Number(state.driveMinutes) || 0));
  const work = stops.reduce((sum, job) => sum + (Number(job.duration) || 0), 0);
  const wait = stops.reduce((sum, job) => sum + (Number(job.wait) || 0), 0);
  const admin = Number(state.adminBuffer) || 0;
  const total = drive + work + wait + admin;
  const max = (Number(state.maxHours) || 8) * 60;
  const flags = [];
  if(total > max) flags.push(`Route exceeds max field hours by ${Math.round(total - max)} minutes.`);
  stops.forEach(job => { if(job.priority >= 5 && job.order > 1) flags.push(`${job.customer} is emergency priority but not first.`); });
  if(drive === 0 && stops.length > 1) flags.push('No drive buffer set between stops.');
  if(!clean(state.plannerNote)) flags.push('No dispatcher note recorded.');
  return { routeDate:state.routeDate, depot:clean(state.depot), technician:clean(state.technician), startTime:state.startTime, maxHours:Number(state.maxHours)||8, driveMinutes:Number(state.driveMinutes)||0, adminBuffer:admin, plannerNote:clean(state.plannerNote), stops, totals:{drive, work, wait, admin, total}, flags, generatedAt:new Date().toISOString(), safety:'Draft route only. Confirm traffic, technician constraints, customer windows, and approvals before dispatch.' };
}
function markdown(p){
  const hours = (p.totals.total/60).toFixed(1);
  return ['# Home Service Route Plan','',`Generated: ${new Date().toLocaleString()}`,`Date: ${p.routeDate}`,`Technician: ${p.technician || 'Unassigned'}`,`Depot: ${p.depot || 'Not set'}`,'','## Safety boundary','Draft route only. Confirm traffic, technician constraints, customer windows, customer communications, and approvals before dispatch.','','## Summary',`- Stops: ${p.stops.length}`,`- Work time: ${p.totals.work} minutes`,`- Drive buffer: ${p.totals.drive} minutes`,`- Waiting buffer: ${p.totals.wait} minutes`,`- Admin/lunch buffer: ${p.totals.admin} minutes`,`- Total route: ${hours} hours`,'','## Route order',...p.stops.map(job => `### ${job.order}. ${job.customer}\n- Area: ${job.address}\n- Arrive/depart: ${job.arrive}–${job.depart}\n- Priority: ${priorityLabel(job.priority)}\n- Duration: ${job.duration} minutes\n- Work: ${job.summary}`),'','## Dispatcher note',p.plannerNote || 'None recorded.','','## Review flags',...(p.flags.length ? p.flags.map(f => `- ${f}`) : ['- No blocking flags detected. Still confirm manually.'])].join('\n');
}
function csv(p){ const rows = [['order','customer','area','arrive','depart','priority','duration_minutes','summary']]; p.stops.forEach(job => rows.push([job.order,job.customer,job.address,job.arrive,job.depart,priorityLabel(job.priority),job.duration,job.summary])); return rows.map(r => r.map(c => `"${String(c).replaceAll('"','""')}"`).join(',')).join('\n'); }
function ics(p){ const date = (p.routeDate || today).replaceAll('-',''); const rows = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Hermes//Home Service Route Planner//EN']; p.stops.forEach(job => { rows.push('BEGIN:VEVENT',`UID:${job.id}@home-service-route-planner`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART:${date}T${job.arrive.replace(':','')}00`,`DTEND:${date}T${job.depart.replace(':','')}00`,`SUMMARY:${icsText(`${job.order}. ${job.customer}`)}`,`DESCRIPTION:${icsText(`${job.address} · ${job.summary}`)}`,'END:VEVENT'); }); rows.push('END:VCALENDAR'); return rows.join('\r\n'); }
function icsText(v){ return String(v || '').replace(/[\\,;]/g, '\\$&').replace(/\n/g,'\\n'); }
function priorityLabel(priority){ return ({5:'Emergency',4:'High',3:'Normal',2:'Low'}[String(priority)] || 'Normal'); }
function renderMap(stops){
  const positions = [[8,66],[28,30],[52,58],[75,22],[68,73],[20,84],[88,58],[42,78]];
  $('mapBoard').innerHTML = '<div class="route-line"></div>' + stops.map((job,i) => { const [x,y] = positions[i % positions.length]; return `<article class="stop-pin priority-${esc(job.priority)}" data-order="${esc(job.order)}" style="left:${x}%;top:${y}%"><h3>${esc(job.customer)}</h3><p>${esc(job.arrive)} · ${esc(priorityLabel(job.priority))}</p><p>${esc(job.address)}</p></article>`; }).join('');
}
function render(){
  const p = routePacket();
  $('metricDuration').textContent = `${(p.totals.total/60).toFixed(1)}h`;
  $('metricDrive').textContent = `${p.totals.drive}m`;
  $('metricStops').textContent = String(p.stops.length);
  $('metricFlags').textContent = String(p.flags.length);
  renderMap(p.stops);
  $('timeline').innerHTML = p.stops.map(job => `<article><time>${esc(job.arrive)}–${esc(job.depart)}</time><h3>${esc(job.order)}. ${esc(job.customer)}</h3><p>${esc(job.address)} · ${esc(priorityLabel(job.priority))} · ${esc(job.duration)} min</p><p>${esc(job.summary)}</p></article>`).join('');
  $('jobRoster').innerHTML = p.stops.map(job => `<article><h3>${esc(job.customer)}</h3><p>${esc(job.address)} · window ${esc(job.windowStart)} · ${esc(priorityLabel(job.priority))}</p><div class="job-actions"><button type="button" data-edit="${esc(job.id)}">Edit</button><button type="button" class="ghost" data-remove="${esc(job.id)}">Remove</button></div></article>`).join('');
  $('routeOutput').value = markdown(p);
  saveState();
  return p;
}
function fillJobForm(job){ $('jobCustomer').value = job.customer || ''; $('jobAddress').value = job.address || ''; $('jobSummary').value = job.summary || ''; $('jobPriority').value = String(job.priority || 3); $('jobWindowStart').value = job.windowStart || '09:00'; $('jobDuration').value = String(job.duration || 60); }
function readJobForm(){ return { id: cryptoId(), customer:clean($('jobCustomer').value) || `Stop ${state.jobs.length + 1}`, address:clean($('jobAddress').value) || 'Area TBD', summary:clean($('jobSummary').value) || 'Work summary TBD.', priority:Number($('jobPriority').value || 3), windowStart:$('jobWindowStart').value || state.startTime || '09:00', duration:Number($('jobDuration').value || 60) }; }
function clearJobForm(){ fillJobForm({customer:'',address:'',summary:'',priority:3,windowStart:'09:00',duration:60}); }
function download(name, text, type){ const blob = new Blob([text], {type}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }
function toast(msg){ const el = $('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(() => el.classList.remove('show'), 1700); }
function copy(text){ navigator.clipboard?.writeText(text).then(()=>toast('Copied')).catch(()=>{ $('routeOutput').focus(); $('routeOutput').select(); toast('Select/copy manually'); }); }
fields.forEach(id => $(id)?.addEventListener('input', () => window.requestAnimationFrame(render)));
fields.forEach(id => $(id)?.addEventListener('change', () => window.requestAnimationFrame(render)));
$('themeToggle').addEventListener('click', () => { state.theme = state.theme === 'light' ? 'dark' : 'light'; applyTheme(); saveState(); toast(`${state.theme === 'light' ? 'Light' : 'Dark'} mode saved`); });
$('loadDemo').addEventListener('click', () => { state = clone(defaults); syncForm(); applyTheme(); clearJobForm(); render(); toast('Demo route loaded'); });
$('planRoute').addEventListener('click', () => { render(); toast('Route planned'); });
$('addJob').addEventListener('click', () => { readForm(); state.jobs.push(readJobForm()); clearJobForm(); render(); toast('Stop added'); });
$('resetJobs').addEventListener('click', () => { state.jobs = clone(demoJobs); clearJobForm(); render(); toast('Demo stops reset'); });
$('jobRoster').addEventListener('click', event => { const button = event.target.closest('button'); if(!button) return; const id = button.dataset.edit || button.dataset.remove; const job = state.jobs.find(item => item.id === id); if(!job) return; if(button.dataset.remove){ state.jobs = state.jobs.filter(item => item.id !== id); render(); toast('Stop removed'); } else { fillJobForm(job); state.jobs = state.jobs.filter(item => item.id !== id); render(); toast('Stop loaded for edit'); } });
$('copyRoute').addEventListener('click', () => copy($('routeOutput').value));
$('downloadMarkdown').addEventListener('click', () => download('home-service-route-plan.md', $('routeOutput').value, 'text/markdown'));
$('downloadJson').addEventListener('click', () => { const p = routePacket(); download('home-service-route-plan.json', JSON.stringify({ ...p, markdown: markdown(p) }, null, 2), 'application/json'); });
$('downloadCsv').addEventListener('click', () => download('home-service-route-plan.csv', csv(routePacket()), 'text/csv'));
$('downloadIcs').addEventListener('click', () => download('home-service-route-plan.ics', ics(routePacket()), 'text/calendar'));
syncForm(); applyTheme(); clearJobForm(); render();

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

