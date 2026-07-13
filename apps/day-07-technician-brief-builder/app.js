/* Technician Brief Builder — dispatch-ready job briefs.
   Local-first, draft-only. Nothing is sent anywhere by this app. */
(() => {
  'use strict';

  // ---------------------------------------------------------------- constants

  const STORE_KEY = 'fable-remake:day-07-technician-brief-builder:v1';
  const UNDO_MS = 7000;
  const SEVERITIES = ['low', 'medium', 'high'];

  const JOB_TEMPLATES = {
    hvac: {
      label: 'HVAC repair',
      checks: [
        'Confirm thermostat call and settings',
        'Inspect filter and airflow',
        'Check capacitor and contactor readings',
        'Measure supply/return temperature split',
        'Photograph nameplate and panel before closing'
      ],
      parts: ['Filter set', 'Thermostat batteries', 'Capacitor assortment', 'Contactor', 'Multimeter', 'Gauge manifold', 'Coil cleaner', 'Ladder'],
      hazards: 'Roof or attic access; live power at the disconnect; refrigerant lines under pressure; hot surfaces.',
      noPromise: 'No same-day part availability, final price, or completion time until diagnosis is complete and the customer approves the quote.'
    },
    plumbing: {
      label: 'Plumbing repair',
      checks: [
        'Locate and test the main shut-off',
        'Confirm reported leak location and whether it is active',
        'Check water pressure and visible corrosion',
        'Inspect surrounding areas for hidden water damage',
        'Photograph before opening walls or fittings'
      ],
      parts: ['Pipe wrench set', 'Basin wrench', 'Braided supply lines', 'Shut-off valves', 'PTFE tape', 'Compression fittings', 'Wet/dry vacuum', 'Drop cloths & bucket'],
      hazards: 'Water shut-off access; slip hazards; possible mold or hidden damage behind finishes.',
      noPromise: 'No fixed price or wall-opening commitment until the leak source is confirmed and the customer approves the scope.'
    },
    electrical: {
      label: 'Electrical service',
      checks: [
        'Verify breaker labeling before touching equipment',
        'Test the circuit with a meter — treat as live until proven dead',
        'Inspect the panel for scorching, corrosion, and double-taps',
        'Check the load on the affected circuit',
        'Photograph the panel before and after'
      ],
      parts: ['Multimeter / voltage tester', 'Breaker assortment', 'Wire nuts & connectors', 'Insulated tool set', 'Fish tape', 'Outlet & GFCI stock', 'Headlamp', 'Lockout/tagout kit'],
      hazards: 'Live electrical panels; lockout/tagout required; never trust panel stickers alone — verify labeling.',
      noPromise: 'No guarantee the first fix resolves intermittent faults; no price until the circuit is traced and code issues are known.'
    },
    appliance: {
      label: 'Appliance repair',
      checks: [
        'Confirm model and serial number',
        'Reproduce the reported fault',
        'Check error codes, door switches, and seals',
        'Inspect power, water, or gas connections',
        'Photograph the data plate for parts lookup'
      ],
      parts: ['Model-specific parts (verify serial)', 'Multimeter', 'Nut driver set', 'Appliance dolly', 'Moving blankets', 'Leveling feet', 'Hose clamps', 'Floor protection'],
      hazards: 'Heavy lifting; gas or water connections behind the unit; sharp sheet-metal edges; protect flooring.',
      noPromise: 'No same-visit fix promise — many appliance parts are order-only. Confirm parts availability before quoting a return date.'
    },
    maintenance: {
      label: 'Preventive maintenance',
      checks: [
        'Pull service history before arrival',
        'Run the standard inspection checklist',
        'Record readings against the last visit',
        'Flag anything trending toward failure',
        'Leave the equipment area cleaner than found'
      ],
      parts: ['Filter stock', 'Belts (common sizes)', 'Lubricants', 'Cleaning supplies', 'Inspection camera', 'Test meter', 'Labels & marker', 'Service stickers'],
      hazards: 'Routine visit — still verify power isolation before opening equipment; occupied-site etiquette applies.',
      noPromise: 'A maintenance visit does not include repairs — anything found gets documented and quoted separately, not fixed on the spot without approval.'
    },
    install: {
      label: 'Equipment install',
      checks: [
        'Verify delivered equipment matches the order',
        'Confirm site measurements and clearances',
        'Check that power/water/drain rough-in is ready',
        'Review placement with the customer before mounting',
        'Test full operation and walk the customer through it'
      ],
      parts: ['Install kit / mounting hardware', 'Level', 'Drill & bits', 'Sealant / caulk', 'Shims', 'Disconnect or valve stock', 'PPE', 'Old-unit disposal plan'],
      hazards: 'Heavy lifting — two-person rule; protect flooring; confirm structural mounting points; old-unit disposal.',
      noPromise: 'No completion-time promise if the rough-in is not ready; change orders require office approval before extra work.'
    },
    inspection: {
      label: 'Inspection / diagnostic',
      checks: [
        'Interview the customer about symptoms and history',
        'Document current condition with photos',
        'Test primary functions and record readings',
        'List findings from most to least urgent',
        'Prepare findings for office review — not a verbal quote'
      ],
      parts: ['Multimeter / test meters', 'Inspection camera', 'Flashlight / headlamp', 'Moisture meter', 'Camera for photos', 'Notepad or forms', 'Shoe covers', 'Marking tape'],
      hazards: 'Diagnostic only — do not start repairs; note hazards found for the report rather than fixing on the spot.',
      noPromise: 'This visit produces findings, not a repair or a final price. All quotes come from the office after review.'
    },
    custom: {
      label: 'Custom / other',
      checks: [],
      parts: [],
      hazards: '',
      noPromise: 'Do not promise price, parts availability, or completion time on site — the office confirms all commitments.'
    }
  };

  const AUTO_RISK_RULES = [
    { id: 'access', label: 'Access constraint', severity: 'medium',
      test: /roof|ladder|attic|crawl ?space|locked|gate code|keys? (held|at)|height/,
      hint: 'Confirm keys, codes, and a safe access route before arrival.' },
    { id: 'occupied', label: 'Occupied site', severity: 'medium',
      test: /patient|occupied|business hours|open during|customers? on site|staff|tenants?|quiet/,
      hint: 'Plan entry, noise, and work windows around the people on site.' },
    { id: 'sensitivity', label: 'Customer sensitivity', severity: 'medium',
      test: /complaint|callback|angry|upset|frustrated|second visit|escalat/,
      hint: 'Lead with listening, log everything, and loop in the office early.' },
    { id: 'promise', label: 'Promise pressure', severity: 'high',
      test: /same.day|guarantee|exact (price|cost)|promise|asap|by (tonight|today|tomorrow)|cost is discussed|quote/,
      hint: 'Route every price or timing commitment to the office — diagnosis first.' },
    { id: 'electrical', label: 'Electrical hazard', severity: 'high',
      test: /breaker|panel|voltage|live wire|shock|sparking|electrical/,
      hint: 'Verify labeling, test before touch, lockout/tagout where possible.' },
    { id: 'gas', label: 'Gas / air-quality hazard', severity: 'high',
      test: /\bgas\b|carbon monoxide|fumes|propane|burning smell/,
      hint: 'Ventilate, meter-check the air, and evacuate and escalate if readings are unsafe.' },
    { id: 'water', label: 'Water damage risk', severity: 'medium',
      test: /leak|flood|burst|water damage|mold|dripping/,
      hint: 'Locate the shut-off first, protect floors, photograph existing damage.' }
  ];

  const JOB_FIELDS = ['customer', 'contact', 'technician', 'window', 'jobType', 'issue', 'context', 'access', 'firstChecks', 'noPromise'];
  const FIELD_IDS = {
    customer: 'customer', contact: 'contact', technician: 'technician',
    window: 'jobWindow', jobType: 'jobType', issue: 'issue', context: 'context',
    access: 'accessNotes', firstChecks: 'firstChecks', noPromise: 'noPromise'
  };
  const CHECK_IDS = { contact: 'checkContact', parts: 'checkParts', risk: 'checkRisk', boundary: 'checkBoundary' };
  const CHECK_LABELS = {
    contact: 'Contact & access confirmed with the customer',
    parts: 'Parts & tools loaded on the truck',
    risk: 'Risks reviewed with the technician',
    boundary: 'No price/time promise without office approval'
  };

  // ---------------------------------------------------------------- helpers

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const clampInt = (v, min, max, fallback) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };

  // ---------------------------------------------------------------- state

  function prefersLight() {
    return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches;
  }

  function defaultState() {
    return {
      version: 1,
      theme: prefersLight() ? 'light' : 'dark',
      seenGuide: false,
      job: { customer: '', contact: '', technician: '', window: '', jobType: '', issue: '', context: '', access: '', firstChecks: '', noPromise: '' },
      parts: [],
      risks: [],
      checks: { contact: false, parts: false, risk: false, boundary: false }
    };
  }

  function normalize(raw) {
    const d = defaultState();
    if (!raw || typeof raw !== 'object') return d;
    const s = defaultState();
    s.theme = raw.theme === 'light' ? 'light' : raw.theme === 'dark' ? 'dark' : d.theme;
    s.seenGuide = !!raw.seenGuide;
    const j = (raw.job && typeof raw.job === 'object') ? raw.job : {};
    for (const k of JOB_FIELDS) s.job[k] = typeof j[k] === 'string' ? j[k].slice(0, 2000) : '';
    if (s.job.jobType && !JOB_TEMPLATES[s.job.jobType]) s.job.jobType = '';
    s.parts = Array.isArray(raw.parts)
      ? raw.parts
          .filter(p => p && typeof p === 'object' && String(p.name || '').trim())
          .map(p => ({
            id: typeof p.id === 'string' ? p.id : uid(),
            name: String(p.name).trim().slice(0, 80),
            qty: clampInt(p.qty, 1, 99, 1),
            packed: !!p.packed
          }))
          .slice(0, 60)
      : [];
    s.risks = Array.isArray(raw.risks)
      ? raw.risks
          .filter(r => r && typeof r === 'object' && String(r.label || '').trim())
          .map(r => ({
            id: typeof r.id === 'string' ? r.id : uid(),
            label: String(r.label).trim().slice(0, 120),
            severity: SEVERITIES.includes(r.severity) ? r.severity : 'medium',
            mitigation: typeof r.mitigation === 'string' ? r.mitigation.slice(0, 240) : '',
            ruleId: typeof r.ruleId === 'string' ? r.ruleId : ''
          }))
          .slice(0, 30)
      : [];
    const c = (raw.checks && typeof raw.checks === 'object') ? raw.checks : {};
    for (const k of Object.keys(s.checks)) s.checks[k] = !!c[k];
    return s;
  }

  function loadState() {
    try { return normalize(JSON.parse(localStorage.getItem(STORE_KEY))); }
    catch { return defaultState(); }
  }

  let state = loadState();
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* storage blocked */ }
    }, 250);
  }

  function demoState() {
    const s = defaultState();
    s.theme = state.theme;
    s.seenGuide = state.seenGuide;
    s.job = {
      customer: 'Northside Dental — Suite 204',
      contact: 'Office manager Dana — quiet entry via the side door, roof key at the front desk',
      technician: 'Jordan / Truck 3',
      window: 'Today 1:00–3:00 PM',
      jobType: 'hvac',
      issue: 'Front office reports the rooftop unit is short cycling and the waiting room warms up by mid-day. Started three days ago; they already replaced the thermostat batteries.',
      context: 'Patients are scheduled until 5 PM. The office manager asked for clear updates before any repair cost is discussed — the owner approves all quotes.',
      access: 'Rooftop unit via the exterior ladder at the rear; roof key held at the front desk. Verify breaker labeling in the suite electrical closet before touching equipment.',
      firstChecks: JOB_TEMPLATES.hvac.checks.join('\n'),
      noPromise: JOB_TEMPLATES.hvac.noPromise
    };
    s.parts = [
      { name: 'Filter set', qty: 2, packed: true },
      { name: 'Thermostat batteries', qty: 2, packed: true },
      { name: 'Capacitor assortment', qty: 1, packed: true },
      { name: 'Contactor', qty: 1, packed: false },
      { name: 'Multimeter', qty: 1, packed: true },
      { name: 'Coil cleaner', qty: 1, packed: false },
      { name: 'Ladder', qty: 1, packed: true },
      { name: 'Roof access key (confirm at desk)', qty: 1, packed: false }
    ].map(p => ({ id: uid(), ...p }));
    s.risks = [
      { id: uid(), label: 'Roof access — exterior ladder', severity: 'high', mitigation: 'Get the roof key from the front desk; check tie-off points before stepping onto the roof.', ruleId: 'access' },
      { id: uid(), label: 'Active dental office — patients until 5 PM', severity: 'medium', mitigation: 'Quiet entry through the side door; give a heads-up before any loud work.', ruleId: 'occupied' },
      { id: uid(), label: 'Cost questions expected on site', severity: 'medium', mitigation: 'Route all cost questions to the office — diagnosis first, quote after owner approval.', ruleId: 'promise' },
      { id: uid(), label: 'Unlabeled breakers in suite closet', severity: 'high', mitigation: 'Test before touch; treat every circuit as live until verified with the meter.', ruleId: 'electrical' }
    ];
    s.checks = { contact: true, parts: true, risk: true, boundary: true };
    return s;
  }

  // ---------------------------------------------------------------- domain

  const scanText = () => `${state.job.issue} ${state.job.context} ${state.job.access}`.toLowerCase();

  function suggestedRisks() {
    const text = scanText();
    if (!text.trim()) return [];
    const recorded = new Set(state.risks.map(r => r.ruleId).filter(Boolean));
    return AUTO_RISK_RULES.filter(rule => rule.test.test(text) && !recorded.has(rule.id));
  }

  function firstCheckLines() {
    return state.job.firstChecks.split('\n').map(l => l.trim()).filter(Boolean);
  }

  function completenessItems() {
    const j = state.job;
    return [
      { pts: 10, done: j.customer.trim().length > 1, label: 'Name the customer / site' },
      { pts: 8, done: j.technician.trim().length > 1, label: 'Assign a technician' },
      { pts: 8, done: j.window.trim().length > 1, label: 'Set the service window' },
      { pts: 4, done: !!j.jobType, label: 'Choose a job type' },
      { pts: 14, done: j.issue.trim().length >= 30, label: 'Describe the reported issue (a sentence or two)' },
      { pts: 8, done: j.context.trim().length >= 15, label: 'Add site & customer context' },
      { pts: 8, done: j.access.trim().length >= 10, label: 'Note access & hazards' },
      { pts: 12, done: state.parts.length >= 3, label: 'List at least 3 parts / tools' },
      { pts: 10, done: firstCheckLines().length >= 2, label: 'List at least 2 first checks' },
      { pts: 8, done: state.risks.length > 0 || state.checks.risk, label: 'Record a risk flag (or confirm risks reviewed)' },
      { pts: 10, done: j.noPromise.trim().length >= 10, label: 'Write the do-not-promise boundary' }
    ];
  }

  const completeness = () => completenessItems().reduce((sum, it) => sum + (it.done ? it.pts : 0), 0);
  const packedCount = () => state.parts.filter(p => p.packed).length;
  const checksDone = () => Object.values(state.checks).filter(Boolean).length;
  const dispatchReady = () => completeness() >= 85 && checksDone() === 4;

  function sortedRisks() {
    const order = { high: 0, medium: 1, low: 2 };
    return [...state.risks].sort((a, b) => order[a.severity] - order[b.severity]);
  }

  function briefMarkdown() {
    const j = state.job;
    const v = (s, fb = '(not set)') => (String(s || '').trim() || fb);
    const typeLabel = j.jobType ? JOB_TEMPLATES[j.jobType].label : '(not set)';
    const lines = [
      `# Technician job brief — ${v(j.customer, 'Untitled job')}`,
      '',
      `Generated: ${new Date().toLocaleString()}`,
      `Completeness: ${completeness()}% · Risk flags: ${state.risks.length} · Status: ${dispatchReady() ? 'DISPATCH READY' : 'DRAFT — NEEDS WORK'}`,
      '',
      '> Draft for dispatcher review. Generated locally — this app sends no customer contact, dispatch update, CRM write, or price promise.',
      '',
      '## Dispatch header',
      `- Customer / site: ${v(j.customer)}`,
      `- Contact & entry: ${v(j.contact)}`,
      `- Technician: ${v(j.technician)}`,
      `- Service window: ${v(j.window)}`,
      `- Job type: ${typeLabel}`,
      '',
      '## Reported issue',
      v(j.issue),
      '',
      '## Site & customer context',
      v(j.context),
      '',
      '## Access & hazards',
      v(j.access),
      '',
      `## Parts & tools (packed ${packedCount()}/${state.parts.length})`
    ];
    if (state.parts.length) {
      for (const p of state.parts) lines.push(`- [${p.packed ? 'x' : ' '}] ${p.name}${p.qty > 1 ? ` ×${p.qty}` : ''}`);
    } else {
      lines.push('- (none listed)');
    }
    lines.push('', '## First checks');
    const checks = firstCheckLines();
    if (checks.length) checks.forEach((c, i) => lines.push(`${i + 1}. ${c}`));
    else lines.push('(none listed)');
    lines.push('', '## Risk flags');
    if (state.risks.length) {
      for (const r of sortedRisks()) {
        lines.push(`- [${r.severity.toUpperCase()}] ${r.label}${r.mitigation ? ` — mitigation: ${r.mitigation}` : ' — no mitigation noted'}`);
      }
    } else {
      lines.push(state.checks.risk ? '- None recorded — dispatcher confirmed risks were reviewed.' : '- None recorded yet.');
    }
    lines.push('', '## Do not promise', v(j.noPromise), '', '## Dispatch sign-off');
    for (const [key, label] of Object.entries(CHECK_LABELS)) {
      lines.push(`- [${state.checks[key] ? 'x' : ' '}] ${label}`);
    }
    return lines.join('\n');
  }

  // ---------------------------------------------------------------- render

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    const btn = $('themeToggle');
    btn.textContent = state.theme === 'dark' ? 'Light' : 'Dark';
    btn.setAttribute('aria-pressed', state.theme === 'light' ? 'true' : 'false');
    btn.setAttribute('aria-label', `Switch to ${state.theme === 'dark' ? 'light' : 'dark'} theme`);
  }

  function bindForm() {
    for (const [key, id] of Object.entries(FIELD_IDS)) $(id).value = state.job[key];
    for (const [key, id] of Object.entries(CHECK_IDS)) $(id).checked = state.checks[key];
  }

  function renderStats() {
    const score = completeness();
    const scoreEl = $('statScore');
    scoreEl.textContent = `${score}%`;
    scoreEl.className = score >= 85 ? 'ok' : score >= 50 ? 'warn' : 'bad';
    $('statPacked').textContent = `${packedCount()}/${state.parts.length}`;
    const risksEl = $('statRisks');
    risksEl.textContent = String(state.risks.length);
    const highCount = state.risks.filter(r => r.severity === 'high').length;
    risksEl.className = highCount ? 'bad' : state.risks.length ? 'warn' : '';
    $('statRisksLabel').textContent = highCount ? `Risk flags (${highCount} high)` : 'Risk flags';
    const statusEl = $('statStatus');
    statusEl.textContent = dispatchReady() ? 'READY' : 'DRAFT';
    statusEl.className = dispatchReady() ? 'ok' : 'warn';
  }

  function renderMeter() {
    const score = completeness();
    const fill = $('meterFill');
    fill.style.width = `${score}%`;
    fill.className = 'meter-fill' + (dispatchReady() ? ' ready' : score >= 75 ? ' high' : score >= 40 ? ' mid' : '');
    $('meterWrap').setAttribute('role', 'img');
    $('meterWrap').setAttribute('aria-label', `Brief completeness: ${score} percent`);
    $('meterLabel').textContent = dispatchReady()
      ? `${score}% complete — dispatch ready`
      : `${score}% complete${score >= 85 && checksDone() < 4 ? ' — finish the sign-off checkboxes' : ''}`;
    const missing = completenessItems().filter(it => !it.done).sort((a, b) => b.pts - a.pts);
    $('missingList').innerHTML = missing.length
      ? missing.slice(0, 6).map(it => `<li>${esc(it.label)}</li>`).join('')
      : '<li class="all-done">Everything on the checklist is covered.</li>';
  }

  function renderFieldFlags() {
    for (const wrap of document.querySelectorAll('.field.req')) {
      const key = wrap.dataset.field;
      wrap.classList.toggle('missing', !state.job[key].trim());
    }
  }

  function renderPartChips() {
    const box = $('partChips');
    const tpl = JOB_TEMPLATES[state.job.jobType];
    if (!tpl || !tpl.parts.length) { box.innerHTML = ''; return; }
    const have = new Set(state.parts.map(p => p.name.toLowerCase()));
    const suggestions = tpl.parts.filter(name => !have.has(name.toLowerCase()));
    box.innerHTML = suggestions.length
      ? `<span class="chip-note">Suggested for ${esc(tpl.label)}:</span>` +
        suggestions.map(name => `<button type="button" class="chip" data-part="${esc(name)}">+ ${esc(name)}</button>`).join('')
      : `<span class="chip-note">All ${esc(tpl.label)} suggestions are on the list.</span>`;
  }

  function renderParts() {
    const list = $('partList');
    if (!state.parts.length) {
      list.innerHTML = '<li class="empty-state">No parts or tools yet. Apply a job-type template for suggestions, or add your first item above.</li>';
    } else {
      list.innerHTML = state.parts.map(p => `
        <li class="item-row" data-id="${p.id}">
          <input type="checkbox" data-act="pack" ${p.packed ? 'checked' : ''} aria-label="Packed: ${esc(p.name)}">
          <span class="part-name${p.packed ? ' done' : ''}">${esc(p.name)}</span>
          <span class="part-qty">×${p.qty}</span>
          <button type="button" class="icon-btn" data-act="del" aria-label="Remove ${esc(p.name)}">✕</button>
        </li>`).join('');
    }
    $('packedMeta').textContent = `${packedCount()} of ${state.parts.length} packed`;
  }

  function renderAutoRisks() {
    const box = $('autoRiskRow');
    const suggestions = suggestedRisks();
    if (suggestions.length) {
      box.innerHTML = suggestions.map(rule => `
        <span class="risk-pill">
          <span class="sev-dot ${rule.severity}" aria-hidden="true"></span>
          ${esc(rule.label)}
          <button type="button" data-rule="${rule.id}" aria-label="Add risk flag: ${esc(rule.label)}">Add</button>
        </span>`).join('');
    } else if (!scanText().trim()) {
      box.innerHTML = '<span class="auto-note">Fill in the issue and access notes — the app scans them and suggests risk flags here.</span>';
    } else {
      box.innerHTML = '<span class="auto-note">No new risk phrases detected in the notes. Add flags manually below if the job needs them.</span>';
    }
  }

  function renderRisks() {
    const list = $('riskList');
    if (!state.risks.length) {
      list.innerHTML = '<li class="empty-state">No risk flags recorded. Accept a suggestion above or flag one manually — the tech reads these first.</li>';
    } else {
      list.innerHTML = sortedRisks().map(r => `
        <li class="item-row risk-row" data-id="${r.id}">
          <div class="risk-body">
            <span class="sev-badge ${r.severity}">${r.severity.toUpperCase()}</span>
            <strong>${esc(r.label)}</strong>
            <p class="risk-mit">${r.mitigation ? esc(r.mitigation) : 'No mitigation noted — add one before dispatch.'}</p>
          </div>
          <button type="button" class="icon-btn" data-act="del" aria-label="Remove risk flag: ${esc(r.label)}">✕</button>
        </li>`).join('');
    }
    $('riskMeta').textContent = `${state.risks.length} recorded`;
  }

  function renderSignoffMeta() {
    $('signoffMeta').textContent = `${checksDone()}/4 confirmed`;
  }

  function renderPreview() {
    const j = state.job;
    const score = completeness();
    const ready = dispatchReady();
    const typeLabel = j.jobType ? JOB_TEMPLATES[j.jobType].label : '';
    const text = (val, fb) => (String(val || '').trim() ? `<p>${esc(val)}</p>` : `<p class="placeholder">${fb}</p>`);
    const dd = val => (String(val || '').trim() ? esc(val) : '<span class="placeholder">—</span>');
    const checks = firstCheckLines();
    const parts = state.parts;
    const highRisks = state.risks.filter(r => r.severity === 'high').length;

    $('briefDoc').innerHTML = `
      <header class="bd-head">
        <div>
          <h3>Technician job brief</h3>
          <p class="bd-sub">${j.customer.trim() ? esc(j.customer) : 'Customer / site not set'}</p>
        </div>
        <div class="bd-badges">
          <span class="badge">${score}% complete</span>
          <span class="badge${highRisks ? ' risk' : ''}">${state.risks.length} risk flag${state.risks.length === 1 ? '' : 's'}</span>
          <span class="badge ${ready ? 'ready' : 'draft'}">${ready ? 'DISPATCH READY' : 'DRAFT'}</span>
        </div>
      </header>
      <dl class="bd-grid">
        <div><dt>Customer / site</dt><dd>${dd(j.customer)}</dd></div>
        <div><dt>Contact &amp; entry</dt><dd>${dd(j.contact)}</dd></div>
        <div><dt>Technician</dt><dd>${dd(j.technician)}</dd></div>
        <div><dt>Service window</dt><dd>${dd(j.window)}</dd></div>
        <div><dt>Job type</dt><dd>${typeLabel ? esc(typeLabel) : '<span class="placeholder">—</span>'}</dd></div>
        <div><dt>Packed</dt><dd>${packedCount()}/${parts.length} items</dd></div>
      </dl>
      <section class="bd-section">
        <h4>Reported issue</h4>
        ${text(j.issue, 'No issue description yet.')}
      </section>
      <section class="bd-section">
        <h4>Site &amp; customer context</h4>
        ${text(j.context, 'No context notes yet.')}
      </section>
      <section class="bd-section">
        <h4>Access &amp; hazards</h4>
        ${text(j.access, 'No access or hazard notes yet.')}
      </section>
      <section class="bd-section">
        <h4>Parts &amp; tools</h4>
        ${parts.length
          ? `<ul class="bd-parts">${parts.map(p => `<li class="${p.packed ? 'packed' : ''}">${p.packed ? '☑' : '☐'} ${esc(p.name)}${p.qty > 1 ? ` ×${p.qty}` : ''}</li>`).join('')}</ul>`
          : '<p class="placeholder">No parts or tools listed yet.</p>'}
      </section>
      <section class="bd-section">
        <h4>First checks</h4>
        ${checks.length
          ? `<ol>${checks.map(c => `<li>${esc(c)}</li>`).join('')}</ol>`
          : '<p class="placeholder">No first checks listed yet.</p>'}
      </section>
      <section class="bd-section">
        <h4>Risk flags</h4>
        ${state.risks.length
          ? `<ul class="bd-risks">${sortedRisks().map(r => `<li><span class="sev-badge ${r.severity}">${r.severity.toUpperCase()}</span><strong>${esc(r.label)}</strong>${r.mitigation ? ` — ${esc(r.mitigation)}` : ''}</li>`).join('')}</ul>`
          : `<p class="placeholder">${state.checks.risk ? 'None recorded — dispatcher confirmed risks were reviewed.' : 'No risk flags recorded yet.'}</p>`}
      </section>
      <section class="bd-section">
        <h4>Do not promise</h4>
        <div class="bd-boundary">${j.noPromise.trim() ? esc(j.noPromise) : '<span class="placeholder">No boundary written yet — spell out what the tech must not commit to.</span>'}</div>
      </section>
      <section class="bd-section">
        <h4>Dispatch sign-off</h4>
        <ul class="bd-signoff">
          ${Object.entries(CHECK_LABELS).map(([key, label]) =>
            `<li class="${state.checks[key] ? '' : 'no'}">${state.checks[key] ? '✓' : '✗'} ${esc(label)}</li>`).join('')}
        </ul>
      </section>
      <footer class="bd-foot">Draft generated locally on ${esc(new Date().toLocaleDateString())} for dispatcher review. This app sends nothing — no customer contact, dispatch update, CRM write, or price promise.</footer>`;
  }

  function renderDerived() {
    renderStats();
    renderMeter();
    renderFieldFlags();
    renderAutoRisks();
    renderSignoffMeta();
    renderPreview();
  }

  function renderAll() {
    applyTheme();
    bindForm();
    renderParts();
    renderPartChips();
    renderRisks();
    renderDerived();
  }

  // ---------------------------------------------------------------- toast & undo

  let toastTimer = null;
  let toastAction = null;

  function toast(msg, opts = {}) {
    const el = $('toast');
    const btn = $('toastAction');
    $('toastMsg').textContent = msg;
    if (opts.action) {
      btn.hidden = false;
      btn.textContent = opts.action;
      toastAction = opts.onAction || null;
    } else {
      btn.hidden = true;
      toastAction = null;
    }
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.classList.remove('show'); toastAction = null; }, opts.duration || (opts.action ? UNDO_MS : 2200));
  }

  function offerUndo(msg, restore) {
    toast(msg, {
      action: 'Undo',
      duration: UNDO_MS,
      onAction: () => {
        restore();
        save();
        renderAll();
        toast('Restored');
      }
    });
  }

  // ---------------------------------------------------------------- actions

  function addPart(name, qty) {
    const clean = String(name || '').trim().slice(0, 80);
    if (!clean) { $('partName').focus(); return false; }
    const q = clampInt(qty, 1, 99, 1);
    const existing = state.parts.find(p => p.name.toLowerCase() === clean.toLowerCase());
    if (existing) {
      existing.qty = clampInt(existing.qty + q, 1, 99, existing.qty);
      toast(`"${clean}" already listed — quantity bumped to ${existing.qty}`);
    } else {
      state.parts.push({ id: uid(), name: clean, qty: q, packed: false });
    }
    save();
    renderParts();
    renderPartChips();
    renderDerived();
    return true;
  }

  function deletePart(id) {
    const idx = state.parts.findIndex(p => p.id === id);
    if (idx === -1) return;
    const [item] = state.parts.splice(idx, 1);
    save();
    renderParts();
    renderPartChips();
    renderDerived();
    offerUndo(`Removed "${item.name}"`, () => {
      state.parts.splice(Math.min(idx, state.parts.length), 0, item);
    });
  }

  function addRisk(label, severity, mitigation, ruleId = '') {
    const clean = String(label || '').trim().slice(0, 120);
    if (!clean) { $('riskLabel').focus(); return false; }
    state.risks.push({
      id: uid(),
      label: clean,
      severity: SEVERITIES.includes(severity) ? severity : 'medium',
      mitigation: String(mitigation || '').trim().slice(0, 240),
      ruleId
    });
    save();
    renderRisks();
    renderDerived();
    return true;
  }

  function deleteRisk(id) {
    const idx = state.risks.findIndex(r => r.id === id);
    if (idx === -1) return;
    const [item] = state.risks.splice(idx, 1);
    save();
    renderRisks();
    renderDerived();
    offerUndo(`Removed flag "${item.label}"`, () => {
      state.risks.splice(Math.min(idx, state.risks.length), 0, item);
    });
  }

  function applyTemplate() {
    const tpl = JOB_TEMPLATES[state.job.jobType];
    if (!tpl) { toast('Choose a job type first'); $('jobType').focus(); return; }
    const filled = [];
    if (!state.job.firstChecks.trim() && tpl.checks.length) { state.job.firstChecks = tpl.checks.join('\n'); filled.push('first checks'); }
    if (!state.job.access.trim() && tpl.hazards) { state.job.access = tpl.hazards; filled.push('hazards'); }
    if (!state.job.noPromise.trim() && tpl.noPromise) { state.job.noPromise = tpl.noPromise; filled.push('boundary'); }
    save();
    renderAll();
    toast(filled.length
      ? `${tpl.label} template applied — filled ${filled.join(', ')}. Suggested parts are below.`
      : `Fields already filled — see the suggested ${tpl.label} parts.`);
  }

  function downloadFile(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyText(text, doneMsg) {
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
      toast(ok ? doneMsg : 'Copy failed — select the text manually');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast(doneMsg)).catch(fallback);
    } else {
      fallback();
    }
  }

  function exportJson() {
    const payload = {
      app: 'technician-brief-builder',
      version: 1,
      exportedAt: new Date().toISOString(),
      safety: 'Draft-only local export. Human review required before any customer-facing use.',
      completeness: completeness(),
      dispatchReady: dispatchReady(),
      theme: state.theme,
      seenGuide: state.seenGuide,
      job: state.job,
      parts: state.parts,
      risks: state.risks,
      checks: state.checks
    };
    downloadFile('technician-brief.json', JSON.stringify(payload, null, 2), 'application/json');
    toast('JSON downloaded');
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const next = normalize(parsed);
        next.theme = state.theme;
        next.seenGuide = true;
        state = next;
        save();
        renderAll();
        toast('Brief imported');
      } catch {
        toast('Import failed — that file is not valid JSON');
      }
    };
    reader.onerror = () => toast('Import failed — could not read the file');
    reader.readAsText(file);
  }

  // ---------------------------------------------------------------- help modal

  let helpReturnFocus = null;

  function openHelp() {
    const dlg = $('helpModal');
    if (dlg.open) return;
    helpReturnFocus = document.activeElement;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    $('helpDoneBtn').focus();
  }

  function closeHelp() {
    const dlg = $('helpModal');
    if (typeof dlg.close === 'function') { if (dlg.open) dlg.close(); }
    else dlg.removeAttribute('open');
  }

  // ---------------------------------------------------------------- events

  function wire() {
    // Job fields
    for (const [key, id] of Object.entries(FIELD_IDS)) {
      $(id).addEventListener('input', () => {
        state.job[key] = $(id).value;
        save();
        if (key === 'jobType') renderPartChips();
        renderDerived();
      });
    }

    // Sign-off checks
    for (const [key, id] of Object.entries(CHECK_IDS)) {
      $(id).addEventListener('change', () => {
        state.checks[key] = $(id).checked;
        save();
        renderDerived();
      });
    }

    $('applyTemplateBtn').addEventListener('click', applyTemplate);

    // Parts
    $('partForm').addEventListener('submit', e => {
      e.preventDefault();
      if (addPart($('partName').value, $('partQty').value)) {
        $('partName').value = '';
        $('partQty').value = '1';
        $('partName').focus();
      }
    });
    $('partChips').addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (chip && chip.dataset.part) addPart(chip.dataset.part, 1);
    });
    $('partList').addEventListener('change', e => {
      if (e.target.dataset.act !== 'pack') return;
      const row = e.target.closest('[data-id]');
      const part = state.parts.find(p => p.id === row.dataset.id);
      if (!part) return;
      part.packed = e.target.checked;
      save();
      renderParts();
      renderDerived();
    });
    $('partList').addEventListener('click', e => {
      const btn = e.target.closest('[data-act="del"]');
      if (btn) deletePart(btn.closest('[data-id]').dataset.id);
    });

    // Risks
    $('riskForm').addEventListener('submit', e => {
      e.preventDefault();
      if (addRisk($('riskLabel').value, $('riskSeverity').value, $('riskMitigation').value)) {
        $('riskLabel').value = '';
        $('riskMitigation').value = '';
        $('riskLabel').focus();
        toast('Risk flag added');
      }
    });
    $('autoRiskRow').addEventListener('click', e => {
      const btn = e.target.closest('button[data-rule]');
      if (!btn) return;
      const rule = AUTO_RISK_RULES.find(r => r.id === btn.dataset.rule);
      if (rule && addRisk(rule.label, rule.severity, rule.hint, rule.id)) {
        toast(`Flagged: ${rule.label} — edit the mitigation if needed`);
      }
    });
    $('riskList').addEventListener('click', e => {
      const btn = e.target.closest('[data-act="del"]');
      if (btn) deleteRisk(btn.closest('[data-id]').dataset.id);
    });

    // Header actions
    $('themeToggle').addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      save();
      applyTheme();
      toast(`${state.theme === 'dark' ? 'Dark' : 'Light'} theme on`);
    });
    $('demoBtn').addEventListener('click', () => {
      state = demoState();
      save();
      renderAll();
      toast('Demo brief loaded — Northside Dental HVAC call');
    });
    $('helpBtn').addEventListener('click', openHelp);

    // Help modal
    $('helpCloseBtn').addEventListener('click', closeHelp);
    $('helpDoneBtn').addEventListener('click', closeHelp);
    $('helpModal').addEventListener('close', () => {
      if (helpReturnFocus && typeof helpReturnFocus.focus === 'function') helpReturnFocus.focus();
      helpReturnFocus = null;
    });
    $('helpModal').addEventListener('click', e => {
      if (e.target === $('helpModal')) closeHelp(); // backdrop click
    });

    // Preview / export
    $('printBtn').addEventListener('click', () => window.print());
    $('copyMdBtn').addEventListener('click', () => copyText(briefMarkdown(), 'Brief copied as Markdown'));
    $('downloadJsonBtn').addEventListener('click', exportJson);
    $('importJsonBtn').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', () => {
      const file = $('importFile').files[0];
      if (file) importJson(file);
      $('importFile').value = '';
    });
    $('resetBtn').addEventListener('click', () => {
      if (!confirm('Clear this brief and start over? Export JSON first if you want a backup.')) return;
      const fresh = defaultState();
      fresh.theme = state.theme;
      fresh.seenGuide = true;
      state = fresh;
      save();
      renderAll();
      toast('Brief cleared');
    });

    // Toast action button
    $('toastAction').addEventListener('click', () => {
      const fn = toastAction;
      toastAction = null;
      $('toast').classList.remove('show');
      clearTimeout(toastTimer);
      if (fn) fn();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        copyText(briefMarkdown(), 'Brief copied as Markdown');
        return;
      }
      if (e.key === '?' && !typing && !$('helpModal').open) {
        e.preventDefault();
        openHelp();
      }
    });

    // Flush pending save on tab close
    window.addEventListener('beforeunload', () => {
      clearTimeout(saveTimer);
      try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
    });
  }

  // ---------------------------------------------------------------- init

  wire();
  renderAll();

  if (!state.seenGuide) {
    state.seenGuide = true;
    save();
    openHelp();
  }
})();
