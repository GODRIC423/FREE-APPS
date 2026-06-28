const STORAGE_KEY = 'credential-handoff-checklist-v1';
const now = new Date();
const isoDate = offset => { const d = new Date(now); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const newId = () => 'cred-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
const statusLabels = { intake:'Intake', verify:'Verify', handoff:'Handoff ready', revoke:'Revoke / remove' };
const controls = ['mfaEnabled','backupConfirmed','revokePath','leastPrivilege','storageConfirmed','noSecretStored'];
const controlLabels = { mfaEnabled:'MFA confirmed', backupConfirmed:'Backup owner confirmed', revokePath:'Revocation path known', leastPrivilege:'Least privilege checked', storageConfirmed:'Storage reference verified', noSecretStored:'No secret value stored here' };
const demoItems = [
  { id:newId(), systemName:'Missed-call follow-up inbox', accessType:'Shared inbox', owner:'Brian', backupOwner:'Office Manager', storageRef:'Password manager: Shared inbox admin item', accessLevel:'Admin', rotationDate:isoDate(14), status:'handoff', controls:{mfaEnabled:true,backupConfirmed:true,revokePath:true,leastPrivilege:true,storageConfirmed:true,noSecretStored:true}, notes:'Revoke by removing user from inbox admin console. Rotate password after handoff confirmation. Do not export mailbox contents.' },
  { id:newId(), systemName:'Booking platform API', accessType:'API key', owner:'Ops desk', backupOwner:'Brian', storageRef:'Password manager: booking API key label only', accessLevel:'Editor', rotationDate:isoDate(7), status:'verify', controls:{mfaEnabled:true,backupConfirmed:true,revokePath:false,leastPrivilege:false,storageConfirmed:true,noSecretStored:true}, notes:'Confirm API scope is lead-read and booking-create only before handoff.' },
  { id:newId(), systemName:'Domain DNS registrar', accessType:'Domain/DNS', owner:'Owner', backupOwner:'Brian', storageRef:'Password manager: registrar owner login', accessLevel:'Owner', rotationDate:isoDate(30), status:'intake', controls:{mfaEnabled:false,backupConfirmed:false,revokePath:true,leastPrivilege:false,storageConfirmed:true,noSecretStored:true}, notes:'High-risk owner-level access. Require MFA and documented recovery path before any change.' }
];
const demoState = { theme:'dark', selectedId:null, items:demoItems };
function clone(value){ return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }
function clean(value){ return String(value || '').replace(/\s+/g, ' ').trim(); }
function esc(value){ return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function normalizeControls(value){ const source = value || {}; return Object.fromEntries(controls.map(key => [key, key === 'noSecretStored' ? source[key] !== false : Boolean(source[key])])); }
function normalizeItem(item){ return { id:item.id || newId(), systemName:clean(item.systemName) || 'Unnamed access item', accessType:clean(item.accessType) || 'Other', owner:clean(item.owner) || 'Unassigned', backupOwner:clean(item.backupOwner), storageRef:clean(item.storageRef), accessLevel:clean(item.accessLevel) || 'Viewer', rotationDate:item.rotationDate || isoDate(14), status:statusLabels[item.status] ? item.status : 'intake', controls:normalizeControls(item.controls), notes:String(item.notes || '').trim() }; }
function normalize(value){ const next = { ...clone(demoState), ...(value || {}) }; next.theme = next.theme === 'light' ? 'light' : 'dark'; next.items = Array.isArray(value?.items) && value.items.length ? value.items.map(normalizeItem) : clone(demoItems); return next; }
function loadState(){ try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return normalize(JSON.parse(raw)); } catch {} return clone(demoState); }
let state = loadState();
const $ = id => document.getElementById(id);
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function applyTheme(){ document.documentElement.dataset.theme = state.theme; $('themeToggle').textContent = state.theme === 'light' ? 'Dark' : 'Light'; $('themeToggle').setAttribute('aria-pressed', state.theme === 'light' ? 'true' : 'false'); }
function itemScore(item){ const checked = controls.filter(key => item.controls[key]).length; const requiredText = [item.owner,item.backupOwner,item.storageRef,item.rotationDate,item.notes].filter(v => clean(v)).length; return Math.round(((checked / controls.length) * 70) + ((requiredText / 5) * 30)); }
function readiness(){ if(!state.items.length) return 0; return Math.round(state.items.reduce((sum,item) => sum + itemScore(item), 0) / state.items.length); }
function riskFlags(item){ const flags = [];
  if(!item.controls.noSecretStored) flags.push(['Secret risk','This item says a secret value may be stored in the app. Remove it and keep only metadata.']);
  if(!item.controls.mfaEnabled) flags.push(['MFA missing','Confirm MFA before handoff.']);
  if(!item.controls.backupConfirmed || !item.backupOwner) flags.push(['Backup owner missing','Name and confirm a backup owner.']);
  if(!item.controls.revokePath) flags.push(['Revocation unclear','Document how to remove or rotate access.']);
  if(!item.controls.leastPrivilege && ['Admin','Owner','Billing'].includes(item.accessLevel)) flags.push(['Privilege too broad','Check whether this access can be narrowed.']);
  if(!item.storageRef || !item.controls.storageConfirmed) flags.push(['Storage unverified','Point to the password-manager item label without revealing the value.']);
  return flags;
}
function allRisks(){ return state.items.flatMap(item => riskFlags(item).map(([title,body]) => ({ item, title, body }))); }
function nextRotation(){ return [...state.items].filter(i => i.rotationDate).sort((a,b) => a.rotationDate.localeCompare(b.rotationDate))[0]; }
function metrics(){ return { items:state.items.length, ready:state.items.filter(i => i.status === 'handoff' && itemScore(i) >= 85).length, risks:allRisks().length, next:nextRotation() }; }
function syncEditor(item){ const v = item || { systemName:'', accessType:'Admin login', owner:'', backupOwner:'', storageRef:'', accessLevel:'Viewer', rotationDate:isoDate(14), status:'intake', controls:{ noSecretStored:true }, notes:'' };
  state.selectedId = item?.id || null;
  $('systemName').value = v.systemName || ''; $('accessType').value = v.accessType || 'Admin login'; $('owner').value = v.owner || ''; $('backupOwner').value = v.backupOwner || ''; $('storageRef').value = v.storageRef || ''; $('accessLevel').value = v.accessLevel || 'Viewer'; $('rotationDate').value = v.rotationDate || isoDate(14); $('status').value = v.status || 'intake'; $('notes').value = v.notes || '';
  const c = normalizeControls(v.controls); controls.forEach(key => $(key).checked = c[key]); saveState();
}
function readEditor(){ const item = { id:state.selectedId || newId(), systemName:$('systemName').value, accessType:$('accessType').value, owner:$('owner').value, backupOwner:$('backupOwner').value, storageRef:$('storageRef').value, accessLevel:$('accessLevel').value, rotationDate:$('rotationDate').value, status:$('status').value, notes:$('notes').value, controls:{} }; controls.forEach(key => item.controls[key] = $(key).checked); return normalizeItem(item); }
function saveItem(){ const item = readEditor(); const idx = state.items.findIndex(i => i.id === item.id); if(idx >= 0) state.items[idx] = item; else state.items.push(item); state.selectedId = item.id; renderAll(); toast('Checkpoint saved'); }
function removeItem(id){ state.items = state.items.filter(i => i.id !== id); if(state.selectedId === id) syncEditor(null); renderAll(); }
function moveItem(id, status){ const item = state.items.find(i => i.id === id); if(item) item.status = status; renderAll(); }
function renderMetrics(){ const m = metrics(); $('metricItems').textContent = String(m.items); $('metricReady').textContent = String(m.ready); $('metricRisks').textContent = String(m.risks); $('metricNext').textContent = m.next ? m.next.rotationDate : 'None'; }
function renderRisks(){ const score = readiness(); $('readinessScore').textContent = score + '%'; document.querySelector('.score-ring').style.setProperty('--score', String(score)); const risks = allRisks(); $('riskList').innerHTML = risks.length ? risks.slice(0,10).map(r => `<article><h3>${esc(r.title)} · ${esc(r.item.systemName)}</h3><p>${esc(r.body)}</p></article>`).join('') : '<article class="ok"><h3>No open risk flags</h3><p>The current inventory has the required handoff controls checked. Still review before real use.</p></article>'; }
function renderBoard(){ const statuses = ['intake','verify','handoff','revoke']; $('custodyBoard').innerHTML = statuses.map(status => {
  const cards = state.items.filter(item => item.status === status).map(item => { const score = itemScore(item); const flags = riskFlags(item).length; return `<article class="access-card"><h4>${esc(item.systemName)}</h4><p>${esc(item.accessType)} · ${esc(item.accessLevel)} · owner: ${esc(item.owner)}</p><div class="badges"><span class="badge ${score>=85?'good':score>=65?'warn':''}">${score}% ready</span><span class="badge ${flags?'warn':'good'}">${flags} flags</span><span class="badge">rotate ${esc(item.rotationDate || 'unset')}</span></div><div class="card-actions"><button type="button" data-edit="${esc(item.id)}">Edit</button><button type="button" class="secondary" data-next="${esc(item.id)}">Next lane</button><button type="button" class="secondary" data-remove="${esc(item.id)}">Remove</button></div></article>`; }).join('') || '<p class="empty">No items.</p>';
  return `<section class="lane"><h3>${esc(statusLabels[status])}<span>${state.items.filter(i => i.status === status).length}</span></h3>${cards}</section>`;
}).join('');
  document.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => syncEditor(state.items.find(i => i.id === btn.dataset.edit))));
  document.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', () => removeItem(btn.dataset.remove)));
  document.querySelectorAll('[data-next]').forEach(btn => btn.addEventListener('click', () => { const order = ['intake','verify','handoff','revoke']; const item = state.items.find(i => i.id === btn.dataset.next); if(item) moveItem(item.id, order[(order.indexOf(item.status)+1) % order.length]); }));
}
function markdownPacket(){ const m = metrics(); return ['# Credential Handoff Checklist','',`Generated: ${new Date().toLocaleString()}`,'Safety: metadata-only packet. Do not include raw passwords, tokens, API keys, cookies, seed phrases, recovery codes, private keys, customer PII, or payment data. Use an approved encrypted/password-manager workflow for the actual secret handoff.','',`## Summary`,`Items: ${m.items}`,`Handoff ready: ${m.ready}`,`Risk flags: ${m.risks}`,`Next rotation: ${m.next ? `${m.next.systemName} on ${m.next.rotationDate}` : 'None'}`,'',`## Access inventory`,...state.items.map(item => { const flags = riskFlags(item).map(([title]) => title).join('; ') || 'None'; return [`### ${item.systemName}`,`- Type: ${item.accessType}`,`- Access level: ${item.accessLevel}`,`- Primary owner: ${item.owner}`,`- Backup owner: ${item.backupOwner || 'Missing'}`,`- Storage reference: ${item.storageRef || 'Missing'} (label only, not the secret)`,`- Rotation date: ${item.rotationDate || 'Missing'}`,`- Status: ${statusLabels[item.status]}`,`- Readiness: ${itemScore(item)}%`,`- Risk flags: ${flags}`,`- Controls: ${controls.map(k => `${controlLabels[k]}=${item.controls[k] ? 'yes':'no'}`).join('; ')}`,`- Notes: ${item.notes || 'None'}`].join('\n'); }),'',`## Revocation plan`,...state.items.map(item => `- ${item.systemName}: owner ${item.owner}; revoke path ${item.controls.revokePath ? 'documented' : 'missing'}; notes: ${item.notes || 'not captured'}`),'',`## Human approval boundary`,'Before any real handoff: confirm MFA, least privilege, backup owner, storage location, revocation path, rotation date, and explicit human approval.'].join('\n\n'); }
function csv(){ const rows = [['system','type','owner','backup_owner','storage_reference_label','access_level','rotation_date','status','readiness','risk_flags']]; state.items.forEach(item => rows.push([item.systemName,item.accessType,item.owner,item.backupOwner,item.storageRef,item.accessLevel,item.rotationDate,statusLabels[item.status],itemScore(item),riskFlags(item).map(([t])=>t).join('; ')])); return rows.map(row => row.map(cell => `"${String(cell ?? '').replaceAll('"','""')}"`).join(',')).join('\n'); }
function revocationPlan(){ return ['# Credential Revocation Plan','',`Generated: ${new Date().toLocaleString()}`,'Metadata only. This file contains no secret values.','',...state.items.map(item => [`## ${item.systemName}`,`Owner: ${item.owner}`,`Backup: ${item.backupOwner || 'Missing'}`,`Access level: ${item.accessLevel}`,`Revoke path known: ${item.controls.revokePath ? 'yes':'no'}`,`Rotation date: ${item.rotationDate || 'Missing'}`,`Instructions: ${item.notes || 'Not captured'}`].join('\n'))].join('\n\n'); }
function renderOutputs(){ $('markdownOutput').value = markdownPacket(); }
function renderAll(){ applyTheme(); renderMetrics(); renderRisks(); renderBoard(); renderOutputs(); saveState(); }
function download(name, text, type){ const blob = new Blob([text], {type}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }
function copy(text){ navigator.clipboard?.writeText(text).then(() => toast('Copied')).catch(() => { $('markdownOutput').focus(); $('markdownOutput').select(); toast('Select/copy manually'); }); }
function toast(msg){ const el = $('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(() => el.classList.remove('show'), 1700); }
['systemName','accessType','owner','backupOwner','storageRef','accessLevel','rotationDate','status','notes',...controls].forEach(id => $(id).addEventListener('input', () => { if(id === 'noSecretStored' && !$(id).checked) toast('Remove any secret values from this app'); }));
$('themeToggle').addEventListener('click', () => { state.theme = state.theme === 'light' ? 'dark' : 'light'; renderAll(); toast(`${state.theme === 'light' ? 'Light':'Dark'} mode saved`); });
$('loadDemo').addEventListener('click', () => { state = normalize(demoState); syncEditor(state.items[0]); renderAll(); toast('Demo custody checklist loaded'); });
$('addItem').addEventListener('click', () => { syncEditor(null); $('systemName').focus(); });
$('saveItem').addEventListener('click', saveItem);
$('clearEditor').addEventListener('click', () => { syncEditor(null); toast('Editor cleared'); });
$('copyMarkdown').addEventListener('click', () => copy($('markdownOutput').value));
$('downloadJson').addEventListener('click', () => download('credential-handoff-checklist.json', JSON.stringify({ ...state, markdown:markdownPacket(), generatedAt:new Date().toISOString(), safety:'metadata only; no raw secrets; human approval required for real handoff' }, null, 2), 'application/json'));
$('downloadCsv').addEventListener('click', () => download('credential-handoff-inventory.csv', csv(), 'text/csv'));
$('downloadRevocation').addEventListener('click', () => download('credential-revocation-plan.md', revocationPlan(), 'text/markdown'));
syncEditor(state.items[0]);
renderAll();

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

