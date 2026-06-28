const STORAGE_KEY = 'intake-form-builder-v1';
const starterFields = [
  {id:id(), label:'Name and best callback number', type:'short-text', required:true, section:'Contact', help:'Ask for name, phone, and the best time to call back.'},
  {id:id(), label:'Service address or neighborhood', type:'address', required:true, section:'Contact', help:'Enough location detail to route the job. Do not ask for unnecessary personal IDs.'},
  {id:id(), label:'What problem should we solve?', type:'long-text', required:true, section:'Job details', help:'Let the customer describe symptoms, timing, and what changed.'},
  {id:id(), label:'How urgent is this?', type:'select', required:true, section:'Urgency', help:'Emergency | Today if possible | This week | Planning ahead'},
  {id:id(), label:'Preferred appointment windows', type:'checkboxes', required:false, section:'Scheduling', help:'Morning | Midday | Afternoon | After 5 | Flexible'},
  {id:id(), label:'Consent to be contacted about this request', type:'select', required:true, section:'Consent', help:'Yes, contact me about this request | No, do not contact me'}
];
const defaults = { theme:'dark', formName:'Emergency HVAC intake', businessName:'Backhaul Heating', formGoal:'Collect enough information to route urgent no-heat calls without promising availability or pricing.', channel:'Website form', responsePromise:'No promise yet', privacyNote:'Do not ask for passwords, card numbers, social security numbers, medical data, or unnecessary IDs.', fields: clone(starterFields) };
const $ = id => document.getElementById(id);
const contextFields = ['formName','businessName','formGoal','channel','responsePromise','privacyNote'];
function id(){ if(window.crypto && typeof window.crypto.randomUUID === 'function') return crypto.randomUUID(); return `field-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function clone(value){ return JSON.parse(JSON.stringify(value)); }
function clean(value){ return String(value || '').replace(/\s+/g, ' ').trim(); }
function esc(value){ return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function normalize(value){ const next = { ...clone(defaults), ...(value || {}) }; next.theme = next.theme === 'light' ? 'light' : 'dark'; next.fields = Array.isArray(next.fields) ? next.fields : clone(starterFields); return next; }
function loadState(){ try { const raw = localStorage.getItem(STORAGE_KEY); if(raw) return normalize(JSON.parse(raw)); } catch {} return clone(defaults); }
let state = loadState();
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function applyTheme(){ document.documentElement.dataset.theme = state.theme; $('themeToggle').textContent = state.theme === 'light' ? 'Dark' : 'Light'; $('themeToggle').setAttribute('aria-pressed', state.theme === 'light' ? 'true' : 'false'); }
function syncForm(){ contextFields.forEach(key => { if($(key)) $(key).value = state[key] || ''; }); }
function readContext(){ contextFields.forEach(key => { if($(key)) state[key] = $(key).value; }); }
function fieldFromInputs(){ return { id:id(), label:clean($('fieldLabel').value) || `Question ${state.fields.length + 1}`, type:$('fieldType').value, required:$('fieldRequired').value === 'yes', section:$('fieldSection').value, help:clean($('fieldHelp').value) || 'Add helper text before publishing.' }; }
function clearFieldInputs(){ $('fieldLabel').value=''; $('fieldType').value='short-text'; $('fieldRequired').value='yes'; $('fieldSection').value='Contact'; $('fieldHelp').value=''; }
function audits(){
  readContext();
  const flags = [];
  const labels = state.fields.map(f => clean(f.label).toLowerCase());
  if(state.fields.length < 4) flags.push(['bad','Too short','Add at least four fields so the intake can route the job without a phone redo.']);
  if(!labels.some(v => /name|contact|phone|email/.test(v))) flags.push(['bad','Missing contact path','Add a way to contact the requester.']);
  if(!labels.some(v => /problem|issue|symptom|request|need/.test(v))) flags.push(['warn','Missing problem statement','Ask what the customer needs in their own words.']);
  if(!labels.some(v => /urgent|priority|emergency|when/.test(v))) flags.push(['warn','Missing urgency cue','Add an urgency or timing question before routing.']);
  if(labels.some(v => /password|social security|ssn|card number|credit card|bank/.test(v))) flags.push(['bad','Sensitive data risk','Remove fields that ask for secrets, card numbers, SSNs, banking, or passwords.']);
  if(!clean(state.privacyNote)) flags.push(['warn','No privacy note','Add a short internal privacy rule for reviewers.']);
  if(state.responsePromise !== 'No promise yet') flags.push(['warn','Promise needs approval',`Response promise is "${state.responsePromise}". Confirm the team can meet it before publishing.`]);
  if(!flags.length) flags.push(['ok','Clean draft','No blocking draft issues detected. Human review still required before publishing.']);
  return flags;
}
function blueprint(){
  const issues = audits();
  const blocking = issues.filter(([level]) => level === 'bad').length;
  const warnings = issues.filter(([level]) => level === 'warn').length;
  const required = state.fields.filter(f => f.required).length;
  const health = Math.max(0, Math.min(100, 100 - blocking * 30 - warnings * 12 + Math.min(10, state.fields.length)));
  return { formName:clean(state.formName), businessName:clean(state.businessName), goal:clean(state.formGoal), channel:state.channel, responsePromise:state.responsePromise, privacyNote:clean(state.privacyNote), fields:state.fields.map((f,i) => ({ order:i+1, ...f })), audit:issues.map(([level,title,message]) => ({level,title,message})), metrics:{ fieldCount:state.fields.length, requiredCount:required, privacyFlags:blocking + warnings, health }, safety:'Draft form spec only. Do not publish, collect customer data, call webhooks, or connect to CRM until privacy/proof review is complete.', generatedAt:new Date().toISOString() };
}
function markdown(p){ return ['# Intake Form Blueprint','',`Generated: ${new Date().toLocaleString()}`,`Form: ${p.formName || 'Untitled intake form'}`,`Business/team: ${p.businessName || 'Not set'}`,`Channel: ${p.channel}`,`Response promise: ${p.responsePromise}`,'','## Safety boundary',p.safety,'','## Goal',p.goal || 'Not set.','','## Fields',...p.fields.map(f => `### ${f.order}. ${f.label}\n- Type: ${f.type}\n- Section: ${f.section}\n- Required: ${f.required ? 'yes' : 'no'}\n- Helper/choices: ${f.help || 'None'}`),'','## Privacy note',p.privacyNote || 'None.','','## Audit',...p.audit.map(item => `- ${item.level.toUpperCase()}: ${item.title} — ${item.message}`)].join('\n'); }
function csv(p){ const rows = [['order','section','label','type','required','helper_or_choices']]; p.fields.forEach(f => rows.push([f.order,f.section,f.label,f.type,f.required ? 'yes' : 'no',f.help])); return rows.map(r => r.map(c => `"${String(c).replaceAll('"','""')}"`).join(',')).join('\n'); }
function shareNote(p){ return [`${p.formName || 'Intake form'} — draft review`, `${p.metrics.fieldCount} fields · ${p.metrics.requiredCount} required · health ${p.metrics.health}%`, '', 'Review before publish:', ...p.audit.map(item => `- ${item.title}: ${item.message}`), '', 'No customer data has been collected by this local draft tool.'].join('\n'); }
function fakeInput(field){ if(field.type === 'select') return `<div class="fake-input">${esc((field.help || '').split('|')[0] || 'Choose one')}</div>`; if(field.type === 'checkboxes') return `<div class="fake-input">☐ ${esc((field.help || '').split('|').slice(0,3).join('   ☐ ') || 'Option one   ☐ Option two')}</div>`; if(field.type === 'long-text') return '<div class="fake-input">Long answer box</div>'; return `<div class="fake-input">${esc(field.type)} field</div>`; }
function render(){
  const p = blueprint();
  $('metricFields').textContent = String(p.metrics.fieldCount);
  $('metricRequired').textContent = String(p.metrics.requiredCount);
  $('metricFlags').textContent = String(p.metrics.privacyFlags);
  $('metricHealth').textContent = `${p.metrics.health}%`;
  $('fieldCanvas').innerHTML = p.fields.length ? p.fields.map(f => `<article class="field-card"><div class="order">${f.order}</div><div><h3>${esc(f.label)} ${f.required ? '<span class="required-dot">*</span>' : ''}</h3><p>${esc(f.help || 'No helper text yet.')}</p><div class="field-meta"><span class="chip">${esc(f.section)}</span><span class="chip">${esc(f.type)}</span><span class="chip">${f.required ? 'required' : 'optional'}</span></div></div><div class="field-actions"><button type="button" data-up="${esc(f.id)}">↑</button><button type="button" data-down="${esc(f.id)}">↓</button><button type="button" class="ghost" data-remove="${esc(f.id)}">Remove</button></div></article>`).join('') : '<p class="lede">No fields yet. Add a starter set or create the first question.</p>';
  $('formPreview').innerHTML = `<div class="preview-head"><h3>${esc(p.formName || 'Untitled intake form')}</h3><p>${esc(p.goal || 'Explain what this form is for.')}</p></div>` + p.fields.map(f => `<label class="preview-field">${esc(f.label)} ${f.required ? '<span class="required-dot">*</span>' : ''}${fakeInput(f)}<small>${esc(f.help || '')}</small></label>`).join('');
  $('auditList').innerHTML = p.audit.map(item => `<article><strong class="${esc(item.level)}">${esc(item.title)}</strong><p>${esc(item.message)}</p></article>`).join('');
  $('blueprintOutput').value = markdown(p);
  saveState();
  return p;
}
function download(name, text, type){ const blob = new Blob([text], {type}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }
function toast(msg){ const el = $('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(() => el.classList.remove('show'), 1700); }
function copy(text){ navigator.clipboard?.writeText(text).then(()=>toast('Copied')).catch(()=>{ $('blueprintOutput').focus(); $('blueprintOutput').select(); toast('Select/copy manually'); }); }
function slug(){ return (clean(state.formName) || 'intake-form').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
contextFields.forEach(id => $(id)?.addEventListener('input', () => window.requestAnimationFrame(render)));
contextFields.forEach(id => $(id)?.addEventListener('change', () => window.requestAnimationFrame(render)));
$('themeToggle').addEventListener('click', () => { state.theme = state.theme === 'light' ? 'dark' : 'light'; applyTheme(); saveState(); toast(`${state.theme === 'light' ? 'Light' : 'Dark'} mode saved`); });
$('loadDemo').addEventListener('click', () => { state = clone(defaults); syncForm(); applyTheme(); clearFieldInputs(); render(); toast('Demo form loaded'); });
$('buildForm').addEventListener('click', () => { render(); toast('Blueprint rebuilt'); });
$('addField').addEventListener('click', () => { readContext(); state.fields.push(fieldFromInputs()); clearFieldInputs(); render(); toast('Field added'); });
$('addStarterSet').addEventListener('click', () => { state.fields = clone(starterFields); render(); toast('Starter set added'); });
$('clearFields').addEventListener('click', () => { state.fields = []; render(); toast('Field list cleared'); });
$('fieldCanvas').addEventListener('click', event => { const btn = event.target.closest('button'); if(!btn) return; const idValue = btn.dataset.up || btn.dataset.down || btn.dataset.remove; const index = state.fields.findIndex(f => f.id === idValue); if(index < 0) return; if(btn.dataset.remove){ state.fields.splice(index,1); } else if(btn.dataset.up && index > 0){ [state.fields[index-1], state.fields[index]] = [state.fields[index], state.fields[index-1]]; } else if(btn.dataset.down && index < state.fields.length - 1){ [state.fields[index+1], state.fields[index]] = [state.fields[index], state.fields[index+1]]; } render(); });
$('copyBlueprint').addEventListener('click', () => copy($('blueprintOutput').value));
$('downloadMarkdown').addEventListener('click', () => download(`${slug()}-blueprint.md`, $('blueprintOutput').value, 'text/markdown'));
$('downloadJson').addEventListener('click', () => { const p = blueprint(); download(`${slug()}-blueprint.json`, JSON.stringify({ ...p, markdown: markdown(p) }, null, 2), 'application/json'); });
$('downloadCsv').addEventListener('click', () => download(`${slug()}-fields.csv`, csv(blueprint()), 'text/csv'));
$('downloadShare').addEventListener('click', () => download(`${slug()}-share-note.txt`, shareNote(blueprint()), 'text/plain'));
syncForm(); applyTheme(); clearFieldInputs(); render();
