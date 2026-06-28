const STORAGE_KEY = 'daily-cash-board-v1';
const today = new Date();
const isoDate = offset => { const d = new Date(today); d.setDate(d.getDate() + offset); return d.toISOString().slice(0,10); };
const stages = ['offer','followup','call','invoice','collect'];
const stageLabel = stage => ({offer:'Offer',followup:'Follow-up',call:'Booked call',invoice:'Invoice',collect:'Collect / close'}[stage] || stage);
const newId = () => (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
  ? globalThis.crypto.randomUUID()
  : `cash-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const demoState = {
  theme: 'dark',
  selectedId: null,
  items: [
    { id: newId(), title:'Send narrow pilot offer to Westside HVAC', stage:'offer', value:4200, confidence:55, due:isoDate(0), owner:'Brian', notes:'Use proof-window language. Draft only; no send until human approval.' },
    { id: newId(), title:'Follow up on stale estimate with owner-safe note', stage:'followup', value:1850, confidence:45, due:isoDate(0), owner:'Ops desk', notes:'Reference the original quote and ask if they want to keep the slot open.' },
    { id: newId(), title:'Discovery call for missed-call recovery pilot', stage:'call', value:3000, confidence:65, due:isoDate(1), owner:'Brian', notes:'Confirm lead sources, current response time, and proof metric.' },
    { id: newId(), title:'Invoice approved local workflow build', stage:'invoice', value:1250, confidence:90, due:isoDate(-1), owner:'Admin', notes:'Check invoice status. Do not collect payment inside this app.' },
    { id: newId(), title:'Close decision on review-request composer add-on', stage:'collect', value:900, confidence:70, due:isoDate(2), owner:'Brian', notes:'Make a yes/no decision and log next action.' }
  ]
};
let state = loadState();
const $ = id => document.getElementById(id);
const money = n => '$' + Math.round(Number(n || 0)).toLocaleString();
const clean = s => String(s || '').replace(/\s+/g,' ').trim();
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function clone(value){ return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }
function loadState(){ try { const raw = localStorage.getItem(STORAGE_KEY); if(raw) return normalize(JSON.parse(raw)); } catch {} return clone(demoState); }
function normalize(value){ const next = { ...clone(demoState), ...value }; next.theme = next.theme === 'light' ? 'light':'dark'; next.items = Array.isArray(value?.items) && value.items.length ? value.items.map(normalizeItem) : clone(demoState.items); return next; }
function normalizeItem(item){ return { id:item.id || newId(), title:item.title || 'Untitled cash move', stage:stages.includes(item.stage) ? item.stage : 'offer', value:Math.max(0, Number(item.value || 0)), confidence:Math.min(100, Math.max(0, Number(item.confidence ?? 50))), due:item.due || isoDate(0), owner:item.owner || 'Owner', notes:item.notes || '' }; }
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function applyTheme(){ document.documentElement.dataset.theme = state.theme === 'light' ? 'light' : 'dark'; $('themeToggle').textContent = state.theme === 'light' ? 'Dark' : 'Light'; $('themeToggle').setAttribute('aria-pressed', state.theme === 'light' ? 'true':'false'); }
function weighted(item){ return Number(item.value || 0) * Number(item.confidence || 0) / 100; }
function isDue(item){ return !item.due || item.due <= isoDate(0); }
function sortedItems(){ return [...state.items].sort((a,b) => (a.due || '').localeCompare(b.due || '') || weighted(b)-weighted(a)); }
function metrics(){ const items = state.items; return { expected:items.reduce((sum,item)=>sum+weighted(item),0), due:items.filter(isDue).length, invoices:items.filter(i=>i.stage==='invoice').reduce((s,i)=>s+Number(i.value||0),0), next:sortedItems()[0] } }
function stageCounts(){ return stages.reduce((acc, stage) => { acc[stage] = state.items.filter(item => item.stage === stage).length; return acc; }, {}); }
function setEditor(item){ state.selectedId = item?.id || null; $('titleInput').value = item?.title || ''; $('stageInput').value = item?.stage || 'offer'; $('valueInput').value = item?.value ?? 0; $('confidenceInput').value = item?.confidence ?? 50; $('dueInput').value = item?.due || isoDate(0); $('ownerInput').value = item?.owner || ''; $('notesInput').value = item?.notes || ''; saveState(); }
function readEditor(){ return normalizeItem({ id:state.selectedId || newId(), title:$('titleInput').value, stage:$('stageInput').value, value:$('valueInput').value, confidence:$('confidenceInput').value, due:$('dueInput').value, owner:$('ownerInput').value, notes:$('notesInput').value }); }
function saveEditor(){ const item = readEditor(); const idx = state.items.findIndex(existing => existing.id === item.id); if(idx >= 0) state.items[idx] = item; else state.items.push(item); state.selectedId = item.id; renderAll(); toast('Cash move saved'); }
function removeItem(id){ state.items = state.items.filter(item => item.id !== id); if(state.selectedId === id) setEditor(null); renderAll(); toast('Move removed'); }
function advanceItem(id){ const item = state.items.find(row => row.id === id); if(!item) return; const idx = stages.indexOf(item.stage); item.stage = stages[Math.min(stages.length - 1, idx + 1)]; renderAll(); toast('Moved to ' + stageLabel(item.stage)); }
function duplicateItem(id){ const item = state.items.find(row => row.id === id); if(!item) return; state.items.push({ ...clone(item), id:newId(), title:item.title + ' (copy)' }); renderAll(); toast('Move duplicated'); }
function markdown(){ const m = metrics(); const byStage = stages.map(stage => `- ${stageLabel(stage)}: ${state.items.filter(item => item.stage === stage).length}`).join('\n'); const lines = ['# Daily Cash Board brief','',`Generated: ${new Date().toLocaleString()}`,'Safety: draft-only local board. Human approval is required before emails, texts, invoices, CRM writes, payments, customer contact, public changes, or promises.','',`## Snapshot`,`Expected weighted cash: ${money(m.expected)}`,`Moves due now: ${m.due}`,`Invoice value on board: ${money(m.invoices)}`,`Next move: ${m.next ? `${m.next.title} (${stageLabel(m.next.stage)}, ${money(weighted(m.next))} weighted)` : 'None'}`,'','## Stage counts',byStage,'','## Priority queue',...sortedItems().map((item, idx) => `${idx+1}. ${item.title} — ${stageLabel(item.stage)} — value ${money(item.value)} · confidence ${item.confidence}% · due ${item.due || 'unscheduled'} · owner ${item.owner || 'Owner'}\n   Next: ${item.notes || 'Write the next action.'}`),'','## Guardrail','This board plans cash actions only. Execute real customer-facing, billing, CRM, or public actions outside this app after human approval.']; return lines.join('\n'); }
function csv(){ const rows = [['title','stage','value','confidence','weighted_value','due','owner','notes']]; sortedItems().forEach(item => rows.push([item.title, stageLabel(item.stage), item.value, item.confidence, Math.round(weighted(item)), item.due, item.owner, item.notes])); return rows.map(row => row.map(cell => `"${String(cell ?? '').replaceAll('"','""')}"`).join(',')).join('\n'); }
function renderMetrics(){ const m = metrics(); const counts = stageCounts(); $('metricExpected').textContent = money(m.expected); $('metricDue').textContent = String(m.due); $('metricInvoices').textContent = money(m.invoices); $('metricNext').textContent = m.next ? stageLabel(m.next.stage) : 'None'; $('laneOffer').textContent = `${counts.offer} open`; $('laneFollowup').textContent = `${counts.followup} due`; $('laneCall').textContent = `${counts.call} booked`; $('laneInvoice').textContent = `${counts.invoice} unpaid`; $('laneCollect').textContent = `${counts.collect} ready`; $('forecastDial').textContent = money(m.expected); $('priorityList').innerHTML = sortedItems().slice(0,5).map(item => `<li>${esc(item.title)} · ${esc(stageLabel(item.stage))} · ${money(weighted(item))}</li>`).join(''); }
function renderItems(){ $('itemRail').innerHTML = sortedItems().map(item => `<article class="cash-card" data-stage="${esc(item.stage)}"><h3>${esc(item.title)}</h3><div class="cash-meta"><span>${esc(stageLabel(item.stage))}</span><span>${money(item.value)}</span><span>${item.confidence}% confidence</span><span>Due ${esc(item.due || 'unscheduled')}</span><span>${esc(item.owner || 'Owner')}</span></div><p>${esc(item.notes || 'Write the next action.')}</p><div class="card-actions"><button type="button" data-edit="${esc(item.id)}">Edit</button><button type="button" class="secondary" data-advance="${esc(item.id)}">Advance</button><button type="button" class="secondary" data-copy="${esc(item.id)}">Copy</button><button type="button" class="secondary" data-remove="${esc(item.id)}">Remove</button></div></article>`).join(''); document.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => setEditor(state.items.find(item => item.id === btn.dataset.edit)))); document.querySelectorAll('[data-advance]').forEach(btn => btn.addEventListener('click', () => advanceItem(btn.dataset.advance))); document.querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', () => duplicateItem(btn.dataset.copy))); document.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', () => removeItem(btn.dataset.remove))); }
function renderOutput(){ $('exportText').value = markdown(); }
function renderAll(){ applyTheme(); renderMetrics(); renderItems(); renderOutput(); saveState(); }
function download(name,text,type){ const blob = new Blob([text], {type}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }
function copy(text){ navigator.clipboard?.writeText(text).then(()=>toast('Copied')).catch(()=>{ $('exportText').focus(); $('exportText').select(); toast('Select/copy from export'); }); }
function toast(msg){ const el = $('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(()=>el.classList.remove('show'),1700); }
$('themeToggle').addEventListener('click', () => { state.theme = state.theme === 'light' ? 'dark' : 'light'; renderAll(); toast(`${state.theme === 'light' ? 'Light':'Dark'} mode saved`); });
$('loadDemo').addEventListener('click', () => { state = clone(demoState); setEditor(state.items[0]); renderAll(); toast('Demo cash board loaded'); });
$('addItem').addEventListener('click', () => { setEditor({ title:'New cash move', stage:'offer', value:500, confidence:50, due:isoDate(0), owner:'Owner', notes:'Write the exact next action.' }); });
$('saveItem').addEventListener('click', saveEditor);
$('clearEditor').addEventListener('click', () => { setEditor(null); toast('Editor cleared'); });
$('copyMarkdown').addEventListener('click', () => copy($('exportText').value));
$('downloadJson').addEventListener('click', () => download('daily-cash-board.json', JSON.stringify({ ...state, metrics:metrics(), markdown:markdown(), generatedAt:new Date().toISOString(), safety:'draft-only local board; human approval before customer-facing or billing actions' }, null, 2), 'application/json'));
$('downloadCsv').addEventListener('click', () => download('daily-cash-board.csv', csv(), 'text/csv'));
setEditor(state.items[0]);
renderAll();

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

