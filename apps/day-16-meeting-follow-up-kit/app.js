const STORAGE_KEY = 'meeting-follow-up-kit-v1';
const now = new Date();
const isoDate = offset => { const d = new Date(now); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const newId = () => 'mfu-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
const taskTypes = { email:'Email draft', ops:'Ops task', risk:'Risk check', decision:'Decision confirm' };
const demoState = {
  theme: 'dark',
  selectedTaskId: null,
  meetingTitle: 'Missed-call recovery pilot kickoff',
  meetingDate: isoDate(0),
  attendees: 'Brian, Owner, Office Manager',
  sender: 'Brian',
  meetingGoal: 'Agree on the proof window, the first lane to test, and what needs owner approval before customer-facing action.',
  meetingNotes: 'Owner wants a narrow missed-call follow-up pilot. Start with after-hours calls and stale web forms. Proof metric is recovered booked calls over 14 days. Need office manager to confirm phone handoff rules. No customer-facing texts until owner approves exact draft. Potential risk: existing booking link may be stale.',
  decisions: ['Use a 14-day proof window', 'Start with after-hours missed calls and stale web forms'],
  risks: ['Owner must approve exact customer-facing copy', 'Booking link ownership is unclear'],
  questions: ['Who owns the current booking link?', 'What is the baseline missed-call volume?'],
  tasks: [
    { id:newId(), title:'Draft owner recap and approval ask', owner:'Brian', due:isoDate(0), type:'email', done:false },
    { id:newId(), title:'Confirm phone handoff rules with office manager', owner:'Office Manager', due:isoDate(1), type:'ops', done:false },
    { id:newId(), title:'Check booking link status before any send', owner:'Ops desk', due:isoDate(1), type:'risk', done:false },
    { id:newId(), title:'Confirm baseline missed-call volume', owner:'Owner', due:isoDate(2), type:'decision', done:false }
  ]
};
function clone(value){ return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }
function clean(value){ return String(value || '').replace(/\s+/g, ' ').trim(); }
function esc(value){ return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function normalizeTask(task){ return { id:task.id || newId(), title:clean(task.title) || 'Untitled follow-up action', owner:clean(task.owner) || 'Owner', due:task.due || isoDate(1), type:taskTypes[task.type] ? task.type : 'ops', done:Boolean(task.done) }; }
function normalize(value){ const next = { ...clone(demoState), ...(value || {}) }; next.theme = next.theme === 'light' ? 'light' : 'dark'; next.decisions = Array.isArray(value?.decisions) ? value.decisions.map(clean).filter(Boolean) : clone(demoState.decisions); next.risks = Array.isArray(value?.risks) ? value.risks.map(clean).filter(Boolean) : clone(demoState.risks); next.questions = Array.isArray(value?.questions) ? value.questions.map(clean).filter(Boolean) : clone(demoState.questions); next.tasks = Array.isArray(value?.tasks) && value.tasks.length ? value.tasks.map(normalizeTask) : clone(demoState.tasks); return next; }
function loadState(){ try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return normalize(JSON.parse(raw)); } catch {} return clone(demoState); }
let state = loadState();
const $ = id => document.getElementById(id);
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function applyTheme(){ document.documentElement.dataset.theme = state.theme; $('themeToggle').textContent = state.theme === 'light' ? 'Dark' : 'Light'; $('themeToggle').setAttribute('aria-pressed', state.theme === 'light' ? 'true' : 'false'); }
function syncInputs(){ $('meetingTitle').value = state.meetingTitle || ''; $('meetingDate').value = state.meetingDate || isoDate(0); $('attendees').value = state.attendees || ''; $('sender').value = state.sender || ''; $('meetingGoal').value = state.meetingGoal || ''; $('meetingNotes').value = state.meetingNotes || ''; }
function readInputs(){ state.meetingTitle = clean($('meetingTitle').value); state.meetingDate = $('meetingDate').value || isoDate(0); state.attendees = clean($('attendees').value); state.sender = clean($('sender').value); state.meetingGoal = clean($('meetingGoal').value); state.meetingNotes = $('meetingNotes').value.trim(); }
function nextTask(){ return [...state.tasks].filter(t => !t.done).sort((a,b) => (a.due || '').localeCompare(b.due || ''))[0]; }
function metrics(){ return { tasks: state.tasks.filter(t => !t.done).length, decisions: state.decisions.length, risks: state.risks.length, next: nextTask() }; }
function addChip(kind, value){ const v = clean(value); if(!v) return; state[kind].push(v); renderAll(); toast('Added'); }
function removeChip(kind, idx){ state[kind].splice(idx, 1); renderAll(); }
function setTaskEditor(task){ state.selectedTaskId = task?.id || null; $('taskTitle').value = task?.title || ''; $('taskOwner').value = task?.owner || ''; $('taskDue').value = task?.due || isoDate(1); $('taskType').value = task?.type || 'ops'; saveState(); }
function readTaskEditor(){ return normalizeTask({ id:state.selectedTaskId || newId(), title:$('taskTitle').value, owner:$('taskOwner').value, due:$('taskDue').value, type:$('taskType').value, done:false }); }
function saveTask(){ const task = readTaskEditor(); const idx = state.tasks.findIndex(t => t.id === task.id); if(idx >= 0) state.tasks[idx] = { ...state.tasks[idx], ...task }; else state.tasks.push(task); state.selectedTaskId = task.id; renderAll(); toast('Action saved'); }
function toggleTask(id){ const task = state.tasks.find(t => t.id === id); if(task) task.done = !task.done; renderAll(); }
function removeTask(id){ state.tasks = state.tasks.filter(t => t.id !== id); if(state.selectedTaskId === id) setTaskEditor(null); renderAll(); }
function emailDraft(){ const openTasks = state.tasks.filter(t => !t.done); return [`Subject: Follow-up from ${state.meetingTitle || 'today\'s meeting'}`,'',`Hi all,`,'',`Quick recap from ${state.meetingTitle || 'the meeting'} on ${state.meetingDate || isoDate(0)}.`,'',state.meetingGoal ? `Goal: ${state.meetingGoal}` : 'Goal: confirm the next safe step and owners.','',state.decisions.length ? `Decisions:\n${state.decisions.map(v => `- ${v}`).join('\n')}` : 'Decisions:\n- No confirmed decisions captured yet.', '', openTasks.length ? `Actions:\n${openTasks.map(t => `- ${t.title} — owner: ${t.owner}; due: ${t.due}; type: ${taskTypes[t.type]}`).join('\n')}` : 'Actions:\n- No open actions captured yet.', '', state.risks.length ? `Risks / blockers:\n${state.risks.map(v => `- ${v}`).join('\n')}` : 'Risks / blockers:\n- None captured yet.', '', state.questions.length ? `Open questions:\n${state.questions.map(v => `- ${v}`).join('\n')}` : '', '', 'Safety note: this is a draft generated locally. Please review before sending or taking any customer-facing action.', '', `— ${state.sender || 'Sender'}`].filter(Boolean).join('\n'); }
function markdownPacket(){ const m = metrics(); return ['# Meeting Follow-up Kit recap','',`Generated: ${new Date().toLocaleString()}`,'Safety: draft-only local follow-up packet. Human approval is required before sending emails, calendar invites, CRM updates, customer messages, billing, or public changes.','',`## Meeting`, `Title: ${state.meetingTitle || 'Untitled meeting'}`, `Date: ${state.meetingDate || isoDate(0)}`, `Attendees: ${state.attendees || 'Not listed'}`, `Goal: ${state.meetingGoal || 'Not captured'}`,'',`## Metrics`, `Open tasks: ${m.tasks}`, `Decisions: ${m.decisions}`, `Risks: ${m.risks}`, `Next due: ${m.next ? `${m.next.title} (${m.next.due})` : 'None'}`,'',`## Decisions`, ...(state.decisions.length ? state.decisions.map(v => `- ${v}`) : ['- None captured yet.']),'',`## Actions`, ...(state.tasks.map(t => `- [${t.done ? 'x':' '}] ${t.title} — ${t.owner} — ${t.due} — ${taskTypes[t.type]}`)),'',`## Risks`, ...(state.risks.length ? state.risks.map(v => `- ${v}`) : ['- None captured yet.']),'',`## Questions`, ...(state.questions.length ? state.questions.map(v => `- ${v}`) : ['- None captured yet.']),'',`## Draft follow-up email`,'```',emailDraft(),'```','',`## Source notes`,state.meetingNotes || 'No notes captured.'].join('\n'); }
function csv(){ const rows = [['title','owner','due','type','done']]; state.tasks.forEach(t => rows.push([t.title,t.owner,t.due,taskTypes[t.type],t.done ? 'yes':'no'])); return rows.map(row => row.map(cell => `"${String(cell ?? '').replaceAll('"','""')}"`).join(',')).join('\n'); }
function ics(){ const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Hermes//Meeting Follow-up Kit//EN']; state.tasks.filter(t => !t.done).forEach(t => { const date = (t.due || isoDate(1)).replaceAll('-',''); lines.push('BEGIN:VTODO',`UID:${t.id}@meeting-follow-up-kit`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').split('.')[0]}Z`,`DUE;VALUE=DATE:${date}`,`SUMMARY:${t.title.replace(/\n/g,' ')}`,`DESCRIPTION:Owner: ${t.owner}; Type: ${taskTypes[t.type]}`,'END:VTODO'); }); lines.push('END:VCALENDAR'); return lines.join('\r\n'); }
function renderMetrics(){ const m = metrics(); $('metricTasks').textContent = String(m.tasks); $('metricDecisions').textContent = String(m.decisions); $('metricRisks').textContent = String(m.risks); $('metricNext').textContent = m.next ? m.next.due : 'None'; }
function renderChips(){ const draw = (kind, id) => { $(id).innerHTML = state[kind].map((v, idx) => `<span class="chip">${esc(v)} <button type="button" aria-label="Remove" data-chip-kind="${kind}" data-chip-idx="${idx}">×</button></span>`).join('') || '<p class="empty">None yet.</p>'; }; draw('decisions','decisionChips'); draw('risks','riskChips'); draw('questions','questionChips'); document.querySelectorAll('[data-chip-kind]').forEach(btn => btn.addEventListener('click', () => removeChip(btn.dataset.chipKind, Number(btn.dataset.chipIdx)))); }
function renderTasks(){ const lanes = ['email','ops','risk','decision']; $('taskBoard').innerHTML = lanes.map(type => `<section class="task-lane"><h3>${esc(taskTypes[type])}</h3>${state.tasks.filter(t => t.type === type).map(t => `<article class="task-card"><h3>${esc(t.title)}</h3><p>${esc(t.done ? 'Done' : 'Open')}</p><div class="task-meta"><span>${esc(t.owner)}</span><span>Due ${esc(t.due)}</span></div><div class="card-actions"><button type="button" data-edit="${esc(t.id)}">Edit</button><button type="button" class="secondary" data-toggle="${esc(t.id)}">${t.done ? 'Reopen':'Done'}</button><button type="button" class="secondary" data-remove="${esc(t.id)}">Remove</button></div></article>`).join('') || '<p class="empty">No actions.</p>'}</section>`).join(''); document.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => setTaskEditor(state.tasks.find(t => t.id === btn.dataset.edit)))); document.querySelectorAll('[data-toggle]').forEach(btn => btn.addEventListener('click', () => toggleTask(btn.dataset.toggle))); document.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', () => removeTask(btn.dataset.remove))); }
function renderOutputs(){ $('emailOutput').value = emailDraft(); $('markdownOutput').value = markdownPacket(); }
function renderAll(){ readInputs(); applyTheme(); renderMetrics(); renderChips(); renderTasks(); renderOutputs(); saveState(); }
function download(name, text, type){ const blob = new Blob([text], {type}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }
function toast(msg){ const el = $('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(() => el.classList.remove('show'), 1700); }
function copy(text){ navigator.clipboard?.writeText(text).then(() => toast('Copied')).catch(() => { $('markdownOutput').focus(); $('markdownOutput').select(); toast('Select/copy manually'); }); }
['meetingTitle','meetingDate','attendees','sender','meetingGoal','meetingNotes'].forEach(id => $(id).addEventListener('input', renderAll));
$('themeToggle').addEventListener('click', () => { state.theme = state.theme === 'light' ? 'dark' : 'light'; renderAll(); toast(`${state.theme === 'light' ? 'Light':'Dark'} mode saved`); });
$('loadDemo').addEventListener('click', () => { state = normalize(demoState); syncInputs(); setTaskEditor(state.tasks[0]); renderAll(); toast('Demo meeting loaded'); });
$('addCommitment').addEventListener('click', () => { setTaskEditor({ title:'New follow-up action', owner:'Owner', due:isoDate(1), type:'ops', done:false }); });
$('addDecision').addEventListener('click', () => { addChip('decisions', $('decisionInput').value); $('decisionInput').value = ''; });
$('addRisk').addEventListener('click', () => { addChip('risks', $('riskInput').value); $('riskInput').value = ''; });
$('addQuestion').addEventListener('click', () => { addChip('questions', $('questionInput').value); $('questionInput').value = ''; });
$('saveTask').addEventListener('click', saveTask);
$('clearTask').addEventListener('click', () => { setTaskEditor(null); toast('Task editor cleared'); });
$('copyMarkdown').addEventListener('click', () => copy($('markdownOutput').value));
$('downloadJson').addEventListener('click', () => download('meeting-follow-up-kit.json', JSON.stringify({ ...state, emailDraft:emailDraft(), markdown:markdownPacket(), generatedAt:new Date().toISOString(), safety:'draft-only; human review before sends/calendar/CRM/customer actions' }, null, 2), 'application/json'));
$('downloadCsv').addEventListener('click', () => download('meeting-follow-up-tasks.csv', csv(), 'text/csv'));
$('downloadIcs').addEventListener('click', () => download('meeting-follow-up-reminders.ics', ics(), 'text/calendar'));
syncInputs();
setTaskEditor(state.tasks[0]);
renderAll();

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

