/* SOP Builder — local-first standard operating procedure editor.
   Structure: constants → state helpers → domain logic → render → events → init. */
(() => {
  'use strict';

  // ---------- constants & tiny helpers ----------
  const STORAGE_KEY = 'fable-remake:day-14-sop-builder:v1';
  const LEGACY_KEY = 'sop-builder-v1';
  const UNDO_MS = 7000;

  const $ = (id) => document.getElementById(id);
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const filled = (v, min = 1) => String(v || '').trim().length >= min;

  // ---------- state ----------
  let state = null;
  let saveTimer = null;
  let derivedTimer = null;
  let toastTimer = null;
  let dragSid = null;
  let lastFocus = null;

  function blankStep() {
    return { id: uid(), title: '', detail: '', owner: '', tool: '', minutes: 0 };
  }
  function blankCheck(text = '', done = false) {
    return { id: uid(), text, done };
  }
  function blankException() {
    return { id: uid(), condition: '', response: '', escalate: '' };
  }
  function blankSop(title = '') {
    return {
      id: uid(),
      title,
      owner: '',
      trigger: '',
      frequency: '',
      purpose: '',
      inputs: '',
      done: '',
      steps: [blankStep()],
      checks: [
        blankCheck('All required inputs were present before work began'),
        blankCheck('The decision owner named in this SOP made the call'),
        blankCheck('The exception paths were consulted for anything unusual'),
        blankCheck('A human approved every customer-facing or financial action'),
      ],
      exceptions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  function normalizeStep(raw) {
    const s = raw && typeof raw === 'object' ? raw : {};
    return {
      id: typeof s.id === 'string' && s.id ? s.id : uid(),
      title: String(s.title ?? ''),
      detail: String(s.detail ?? s.action ?? ''),
      owner: String(s.owner ?? ''),
      tool: String(s.tool ?? ''),
      minutes: clamp(Math.round(Number(s.minutes) || 0), 0, 999),
    };
  }
  function normalizeCheck(raw) {
    if (typeof raw === 'string') return blankCheck(raw);
    const c = raw && typeof raw === 'object' ? raw : {};
    return {
      id: typeof c.id === 'string' && c.id ? c.id : uid(),
      text: String(c.text ?? ''),
      done: !!c.done,
    };
  }
  function normalizeException(raw) {
    const x = raw && typeof raw === 'object' ? raw : {};
    return {
      id: typeof x.id === 'string' && x.id ? x.id : uid(),
      condition: String(x.condition ?? ''),
      response: String(x.response ?? ''),
      escalate: String(x.escalate ?? x.escalateTo ?? ''),
    };
  }
  function normalizeSop(raw) {
    const s = raw && typeof raw === 'object' ? raw : {};
    return {
      id: typeof s.id === 'string' && s.id ? s.id : uid(),
      title: String(s.title ?? s.taskName ?? ''),
      owner: String(s.owner ?? ''),
      trigger: String(s.trigger ?? ''),
      frequency: String(s.frequency ?? ''),
      purpose: String(s.purpose ?? ''),
      inputs: String(s.inputs ?? ''),
      done: String(s.done ?? s.doneDefinition ?? ''),
      steps: Array.isArray(s.steps) ? s.steps.map(normalizeStep) : [],
      checks: Array.isArray(s.checks) ? s.checks.map(normalizeCheck) : [],
      exceptions: Array.isArray(s.exceptions) ? s.exceptions.map(normalizeException) : [],
      createdAt: Number(s.createdAt) || Date.now(),
      updatedAt: Number(s.updatedAt) || Date.now(),
    };
  }
  function normalize(raw) {
    const prefersLight = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-color-scheme: light)').matches;
    const base = { theme: prefersLight ? 'light' : 'dark', seenGuide: false, activeId: null, sops: [] };
    if (!raw || typeof raw !== 'object') return base;
    const st = { ...base };
    if (raw.theme === 'light' || raw.theme === 'dark') st.theme = raw.theme;
    st.seenGuide = !!raw.seenGuide;
    st.sops = Array.isArray(raw.sops) ? raw.sops.map(normalizeSop) : [];
    st.activeId = st.sops.some((s) => s.id === raw.activeId) ? raw.activeId : (st.sops[0]?.id ?? null);
    return st;
  }

  // Convert the pre-remake single-SOP format into a one-item library.
  function migrateLegacy() {
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      if (!raw) return null;
      const old = JSON.parse(raw);
      if (!old || typeof old !== 'object') return null;
      const sop = blankSop();
      sop.title = String(old.taskName || 'Imported SOP');
      sop.trigger = String(old.trigger || '');
      sop.owner = String(old.owner || '');
      sop.inputs = String(old.inputs || '');
      sop.done = String(old.done || '');
      sop.steps = Array.isArray(old.steps) && old.steps.length
        ? old.steps.map(normalizeStep) : [blankStep()];
      const stepChecks = (Array.isArray(old.steps) ? old.steps : [])
        .map((s) => String(s?.check || '').trim()).filter(Boolean);
      sop.checks = [...sop.checks, ...stepChecks.map((t) => blankCheck(t))];
      if (String(old.risk || '').trim()) {
        sop.exceptions = [{
          id: uid(),
          condition: 'Anything covered by the legacy risk note',
          response: String(old.risk),
          escalate: String(old.owner || ''),
        }];
      }
      return { theme: old.theme === 'light' ? 'light' : 'dark', seenGuide: false, activeId: sop.id, sops: [sop] };
    } catch { return null; }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch { /* corrupt data falls through to defaults */ }
    const legacy = migrateLegacy();
    return legacy ? normalize(legacy) : normalize(null);
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 250);
  }
  function activeSop() {
    return state.sops.find((s) => s.id === state.activeId) || null;
  }
  function touch() {
    const sop = activeSop();
    if (sop) sop.updatedAt = Date.now();
    scheduleSave();
  }

  // ---------- domain logic (pure) ----------
  function scoreSop(sop) {
    const rows = [];
    const add = (cat, earned, max, hint) => rows.push({ cat, earned, max, hint });

    // Basics — 35 pts
    add('Basics', filled(sop.title, 3) ? 5 : 0, 5, 'Give the SOP a clear title.');
    add('Basics', filled(sop.owner) ? 6 : 0, 6, 'Name the role that owns this procedure.');
    add('Basics', filled(sop.trigger, 8) ? 7 : 0, 7, 'Write the event or schedule that starts it.');
    add('Basics', filled(sop.frequency) ? 3 : 0, 3, 'Say how often it runs.');
    add('Basics', filled(sop.purpose, 12) ? 5 : 0, 5, 'Explain why this SOP exists.');
    add('Basics', filled(sop.inputs, 5) ? 4 : 0, 4, 'List the inputs needed before starting.');
    add('Basics', filled(sop.done, 12) ? 5 : 0, 5, 'Define what a finished run looks like.');

    // Steps — 30 pts
    const steps = sop.steps;
    add('Steps', Math.min(steps.length, 3) * 4, 12, 'Break the work into at least three steps.');
    const written = steps.filter((s) => filled(s.title, 3) && filled(s.detail, 10)).length;
    add('Steps', steps.length ? Math.round((9 * written) / steps.length) : 0, 9,
      'Describe what actually happens in every step.');
    const metaRatio = steps.length
      ? steps.reduce((sum, s) => sum + (filled(s.owner) ? 1 : 0) + (filled(s.tool) ? 1 : 0) + (s.minutes > 0 ? 1 : 0), 0) / (steps.length * 3)
      : 0;
    add('Steps', Math.round(9 * metaRatio), 9, 'Give each step an owner, a tool, and a duration.');

    // Quality checks — 15 pts
    const checkCount = sop.checks.filter((c) => filled(c.text, 5)).length;
    add('Quality checks', Math.min(checkCount, 3) * 5, 15, 'Write at least three quality checks.');

    // Exceptions — 20 pts
    const excCount = sop.exceptions.filter((x) => filled(x.condition, 5) && filled(x.response, 5)).length;
    add('Exceptions', Math.min(excCount, 2) * 10, 20,
      'Document at least two exception paths (condition + response).');

    const earned = rows.reduce((a, r) => a + r.earned, 0);
    const max = rows.reduce((a, r) => a + r.max, 0);
    return { score: Math.round((100 * earned) / max), rows };
  }

  function scoreBadge(score) {
    if (score >= 90) return ['Run-ready draft', 'ok'];
    if (score >= 70) return ['Nearly ready', 'good'];
    if (score >= 40) return ['Working draft', 'warn'];
    return ['Skeleton', 'bad'];
  }

  function totalMinutes(sop) {
    return sop.steps.reduce((a, s) => a + (Number(s.minutes) || 0), 0);
  }
  function fmtMinutes(m) {
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest ? `${h}h ${rest}m` : `${h}h`;
  }
  function inputLines(sop) {
    return String(sop.inputs || '').split('\n').map((v) => v.trim()).filter(Boolean);
  }
  function slugify(text) {
    return String(text || 'sop').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sop';
  }

  function sopMarkdown(sop) {
    const { score } = scoreSop(sop);
    const L = [];
    L.push(`# ${sop.title || 'Untitled SOP'}`, '');
    L.push(`> Draft SOP for human review — completeness ${score}%. Approve before any customer-facing, financial, or destructive action.`, '');
    L.push('| Field | Value |', '| --- | --- |');
    L.push(`| Owner | ${sop.owner || '—'} |`);
    L.push(`| Trigger | ${sop.trigger || '—'} |`);
    L.push(`| Frequency | ${sop.frequency || '—'} |`);
    L.push(`| Est. runtime | ${fmtMinutes(totalMinutes(sop))} |`);
    L.push(`| Last updated | ${new Date(sop.updatedAt).toLocaleDateString()} |`, '');
    if (filled(sop.purpose)) L.push('## Purpose', '', sop.purpose.trim(), '');
    const inp = inputLines(sop);
    if (inp.length) {
      L.push('## Inputs needed', '');
      inp.forEach((i) => L.push(`- ${i}`));
      L.push('');
    }
    L.push('## Steps', '');
    if (!sop.steps.length) L.push('_No steps documented yet._', '');
    sop.steps.forEach((s, i) => {
      L.push(`### ${i + 1}. ${s.title || 'Untitled step'}`, '');
      const meta = [
        s.owner ? `Owner: ${s.owner}` : null,
        s.tool ? `Tool: ${s.tool}` : null,
        s.minutes ? `~${s.minutes} min` : null,
      ].filter(Boolean).join(' · ');
      if (meta) L.push(`*${meta}*`, '');
      if (filled(s.detail)) L.push(s.detail.trim(), '');
    });
    L.push('## Quality checklist', '');
    const checks = sop.checks.filter((c) => filled(c.text));
    if (checks.length) checks.forEach((c) => L.push(`- [ ] ${c.text.trim()}`));
    else L.push('_No quality checks yet._');
    L.push('', '## Exception paths', '');
    if (sop.exceptions.length) {
      sop.exceptions.forEach((x) => {
        const esc2 = x.escalate ? ` _(escalate to: ${x.escalate})_` : '';
        L.push(`- **If** ${x.condition || '—'} **then** ${x.response || '—'}${esc2}`);
      });
    } else L.push('_No exception paths yet._');
    L.push('', '## Definition of done', '', sop.done.trim() || '_Not defined._', '');
    L.push('---', '', '_Generated locally by SOP Builder. Draft only — a human approves before anything real happens._');
    return L.join('\n');
  }

  function stepsCsv(sop) {
    const rows = [['order', 'title', 'owner', 'tool', 'minutes', 'action']];
    sop.steps.forEach((s, i) => rows.push([i + 1, s.title, s.owner, s.tool, s.minutes, s.detail]));
    return rows.map((r) => r.map((c) => `"${String(c ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  }

  // ---------- demo data ----------
  function demoSops() {
    const a = blankSop('Missed lead → same-day callback');
    a.owner = 'Ops lead';
    a.trigger = 'A missed call or web-form lead has had no response for 2+ business hours';
    a.frequency = 'Daily lead sweep at 10:00 and 16:00';
    a.purpose = 'Every missed lead gets a human response the same day, so paid marketing and word-of-mouth stop leaking revenue.';
    a.inputs = 'Lead source and timestamp\nCustomer name and callback number\nPrior contact notes from the CRM\nQuote value, if one exists';
    a.done = 'The customer got a call or an approved message, the outcome is logged in the CRM, and the owner can see the result in the daily summary.';
    a.steps = [
      { id: uid(), title: 'Pull the lead-leak list', detail: 'Run the saved "untouched leads" view and list every lead with no response in 2+ business hours.', owner: 'Office admin', tool: 'CRM report', minutes: 10 },
      { id: uid(), title: 'Classify each lead', detail: 'Tag each lead as: call back now, quote chase, review request, or archive with a written reason.', owner: 'Ops lead', tool: 'CRM', minutes: 10 },
      { id: uid(), title: 'Call the hot leads first', detail: 'Work the "call back now" list top-down. Two attempts, then leave a voicemail and mark for message follow-up.', owner: 'Office admin', tool: 'Phone', minutes: 25 },
      { id: uid(), title: 'Draft follow-up messages', detail: 'Use the approved template. No pricing, timing, or availability promises in any draft.', owner: 'Office admin', tool: 'Email templates', minutes: 15 },
      { id: uid(), title: 'Route drafts for approval', detail: 'The owner or a named delegate approves every customer-facing message before it is sent.', owner: 'Ops lead', tool: 'Shared inbox', minutes: 10 },
      { id: uid(), title: 'Log outcomes and report', detail: 'Record every outcome in the CRM and post the daily summary in the ops channel.', owner: 'Office admin', tool: 'CRM', minutes: 10 },
    ];
    a.checks = [
      blankCheck('Every lead on the list has an outcome logged — none skipped', true),
      blankCheck('No message promised price, timing, or availability without approval', true),
      blankCheck('Voicemails were left for every unreachable hot lead'),
      blankCheck('The owner approved all customer-facing drafts before sending', true),
    ];
    a.exceptions = [
      { id: uid(), condition: 'The customer is angry or mentions a complaint', response: 'Stop the script. Do not send templates. Take notes and hand the lead directly to the owner within the hour.', escalate: 'Business owner' },
      { id: uid(), condition: 'The lead asks for a firm price on the spot', response: 'Book an estimate visit instead of quoting. Only the owner quotes prices.', escalate: 'Ops lead' },
      { id: uid(), condition: 'The CRM is down or the lead list will not load', response: 'Fall back to the shared phone-log spreadsheet and reconcile in the CRM once it is back.', escalate: 'Office admin' },
    ];

    const b = blankSop('Weekly invoice run');
    b.owner = 'Bookkeeper';
    b.trigger = 'Every Friday at 09:00, after job completions are logged';
    b.frequency = 'Weekly';
    b.purpose = 'Completed work gets invoiced within a week, so cash stops lagging the schedule.';
    b.inputs = 'Completed job list for the week\nSigned work orders or completion photos\nCurrent price list\nOpen credit notes';
    b.done = 'Every completed job has a draft invoice reviewed and approved by the owner, and the aging report is updated.';
    b.steps = [
      { id: uid(), title: 'Pull completed jobs', detail: 'Export the week\'s completed jobs and reconcile against the technician schedule.', owner: 'Bookkeeper', tool: 'Job tracker', minutes: 15 },
      { id: uid(), title: 'Draft invoices', detail: 'Create one draft invoice per job from the price list. Flag any job with a scope change.', owner: 'Bookkeeper', tool: 'Accounting app', minutes: 30 },
      { id: uid(), title: 'Owner review', detail: 'The owner reviews every draft — especially flagged scope changes — before anything is sent.', owner: 'Business owner', tool: 'Accounting app', minutes: 15 },
      { id: uid(), title: 'Send and log', detail: 'Send only the approved invoices, then update the aging report.', owner: 'Bookkeeper', tool: 'Accounting app', minutes: 10 },
    ];
    b.checks = [
      blankCheck('Every completed job has exactly one invoice', true),
      blankCheck('Scope changes were flagged and reviewed'),
      blankCheck('No invoice was sent without owner approval', true),
    ];
    b.exceptions = [
      { id: uid(), condition: 'A job is complete but has no signed work order', response: 'Hold the invoice and ask the technician for completion evidence the same day.', escalate: 'Business owner' },
      { id: uid(), condition: 'A customer disputes a line item', response: 'Do not argue in writing. Log the dispute and schedule an owner call.', escalate: 'Business owner' },
    ];

    const c = blankSop('New employee first-day setup');
    c.owner = 'Office admin';
    c.trigger = 'A signed offer letter, one week before the start date';
    c.frequency = 'Per hire';
    c.purpose = 'New hires are productive on day one instead of waiting on access and equipment.';
    c.inputs = 'Signed offer letter\nRole and team\nStandard equipment list for the role\nAccounts checklist';
    c.done = 'The new hire can log in to every listed system, has their equipment, and has a first-week plan from their manager.';
    c.steps = [
      { id: uid(), title: 'Order equipment', detail: 'Order the laptop and peripherals from the role\'s standard kit list.', owner: 'Office admin', tool: 'Vendor portal', minutes: 20 },
      { id: uid(), title: 'Create accounts', detail: 'Create least-privilege accounts from the role checklist. Never share credentials over email or chat.', owner: 'Office admin', tool: 'Admin consoles', minutes: 30 },
      { id: uid(), title: 'Day-one walkthrough', detail: 'Office tour, introductions, and the first-week plan with the hiring manager.', owner: 'Hiring manager', tool: 'In person', minutes: 45 },
    ];
    c.checks = [
      blankCheck('All accounts follow least privilege'),
      blankCheck('No credentials were shared over email or chat', true),
      blankCheck('The manager confirmed the first-week plan'),
    ];
    c.exceptions = [
      { id: uid(), condition: 'Equipment will not arrive by the start date', response: 'Assign the spare laptop and note the swap date in the checklist.', escalate: 'Office admin' },
    ];

    return [a, b, c];
  }

  // ---------- render ----------
  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    $('btnTheme').setAttribute('aria-label',
      state.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    $('themeIcon').textContent = state.theme === 'dark' ? '☀' : '☾';
  }

  function renderAll() {
    applyTheme();
    renderLibrary();
    renderEditor();
  }

  function renderLibrary() {
    const list = $('sopList');
    $('libraryEmpty').hidden = state.sops.length > 0;
    list.innerHTML = state.sops.map((s) => {
      const { score } = scoreSop(s);
      const name = s.title || 'Untitled SOP';
      return `<li>
        <button type="button" class="sop-item ${s.id === state.activeId ? 'active' : ''}" data-open="${s.id}"
          aria-current="${s.id === state.activeId ? 'true' : 'false'}">
          <span class="sop-item-title">${esc(name)}</span>
          <span class="sop-item-meta">${s.steps.length} step${s.steps.length === 1 ? '' : 's'} &middot; ${score}% complete</span>
        </button>
        <button type="button" class="icon-btn danger sop-del" data-del="${s.id}" aria-label="Delete ${esc(name)}">&#10005;</button>
      </li>`;
    }).join('');
  }

  function renderEditor() {
    const sop = activeSop();
    $('editorEmpty').hidden = !!sop;
    $('editor').hidden = !sop;
    if (!sop) return;
    bindOverview(sop);
    renderSteps(sop);
    renderChecks(sop);
    renderExceptions(sop);
    renderDerived();
  }

  function bindOverview(sop) {
    $('fTitle').value = sop.title;
    $('fOwner').value = sop.owner;
    $('fTrigger').value = sop.trigger;
    $('fFrequency').value = sop.frequency;
    $('fPurpose').value = sop.purpose;
    $('fInputs').value = sop.inputs;
    $('fDone').value = sop.done;
  }

  function renderSteps(sop) {
    $('stepsEmpty').hidden = sop.steps.length > 0;
    $('stepList').innerHTML = sop.steps.map((s, i) => `
      <article class="step-card" data-sid="${s.id}">
        <div class="step-top">
          <span class="drag-handle" title="Drag to reorder" aria-hidden="true">&#10495;</span>
          <span class="step-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <input class="step-title" data-field="title" value="${esc(s.title)}" maxlength="120"
            placeholder="Step title" aria-label="Step ${i + 1} title">
          <div class="step-btns">
            <button type="button" class="icon-btn" data-action="step-up" ${i === 0 ? 'disabled' : ''} aria-label="Move step ${i + 1} up">&uarr;</button>
            <button type="button" class="icon-btn" data-action="step-down" ${i === sop.steps.length - 1 ? 'disabled' : ''} aria-label="Move step ${i + 1} down">&darr;</button>
            <button type="button" class="icon-btn danger" data-action="step-del" aria-label="Delete step ${i + 1}">&#10005;</button>
          </div>
        </div>
        <label class="lbl">Action
          <textarea data-field="detail" rows="2" maxlength="600"
            placeholder="What exactly happens, in plain words.">${esc(s.detail)}</textarea>
        </label>
        <div class="step-meta">
          <label class="lbl">Owner
            <input data-field="owner" value="${esc(s.owner)}" maxlength="80" placeholder="Role"></label>
          <label class="lbl">Tool
            <input data-field="tool" value="${esc(s.tool)}" maxlength="80" placeholder="CRM, phone…"></label>
          <label class="lbl">Minutes
            <input data-field="minutes" type="number" min="0" max="999" inputmode="numeric" value="${s.minutes || 0}"></label>
        </div>
      </article>`).join('');
  }

  function renderChecks(sop) {
    $('checksEmpty').hidden = sop.checks.length > 0;
    $('checkList').innerHTML = sop.checks.map((c, i) => `
      <li class="check-row" data-cid="${c.id}">
        <input type="checkbox" data-field="done" ${c.done ? 'checked' : ''} aria-label="Mark quality check ${i + 1} as verified in a dry run">
        <input type="text" data-field="text" value="${esc(c.text)}" maxlength="200"
          placeholder="What must be true before this run counts?" aria-label="Quality check ${i + 1}">
        <button type="button" class="icon-btn danger" data-action="check-del" aria-label="Delete quality check ${i + 1}">&#10005;</button>
      </li>`).join('');
  }

  function renderExceptions(sop) {
    $('excEmpty').hidden = sop.exceptions.length > 0;
    $('excList').innerHTML = sop.exceptions.map((x, i) => `
      <article class="exc-card" data-eid="${x.id}">
        <div class="exc-top">
          <label class="lbl grow">If this happens
            <input data-field="condition" value="${esc(x.condition)}" maxlength="200"
              placeholder="e.g. The customer is angry or threatens to cancel"></label>
          <button type="button" class="icon-btn danger" data-action="exc-del" aria-label="Delete exception ${i + 1}">&#10005;</button>
        </div>
        <label class="lbl">Do this instead
          <textarea data-field="response" rows="2" maxlength="400"
            placeholder="The safe path — what to do, what not to do.">${esc(x.response)}</textarea>
        </label>
        <label class="lbl">Escalate to
          <input data-field="escalate" value="${esc(x.escalate)}" maxlength="80" placeholder="e.g. Business owner"></label>
      </article>`).join('');
  }

  function renderDerived() {
    const sop = activeSop();
    if (!sop) return;
    const { score, rows } = scoreSop(sop);

    $('statSteps').textContent = sop.steps.length;
    $('statTime').textContent = fmtMinutes(totalMinutes(sop));
    $('statChecks').textContent = sop.checks.filter((c) => filled(c.text)).length;
    $('statScore').textContent = `${score}%`;
    $('scoreBig').textContent = `${score}%`;

    const [label, tone] = scoreBadge(score);
    const badge = $('scoreBadge');
    badge.textContent = label;
    badge.className = `badge badge-${tone}`;
    $('scoreFill').style.width = `${score}%`;

    const cats = {};
    rows.forEach((r) => {
      cats[r.cat] = cats[r.cat] || { earned: 0, max: 0 };
      cats[r.cat].earned += r.earned;
      cats[r.cat].max += r.max;
    });
    $('scoreBreakdown').innerHTML = Object.entries(cats).map(([cat, v]) =>
      `<li><span>${esc(cat)}</span><span class="mono">${v.earned}/${v.max}</span></li>`).join('');

    const fixes = rows.filter((r) => r.earned < r.max).slice(0, 4);
    $('fixList').innerHTML = fixes.length
      ? fixes.map((r) => `<li>${esc(r.hint)}</li>`).join('')
      : '<li class="done-msg">Nothing left — run a dry run, then print or share the document.</li>';

    markRequired(sop);
    renderDocument(sop, score);
    renderLibrary();
  }

  function markRequired(sop) {
    [['fTitle', sop.title], ['fOwner', sop.owner], ['fTrigger', sop.trigger], ['fDone', sop.done]]
      .forEach(([id, v]) => $(id).classList.toggle('missing', !filled(v)));
  }

  function stepMetaLine(s) {
    const bits = [
      s.owner && `Owner: ${esc(s.owner)}`,
      s.tool && `Tool: ${esc(s.tool)}`,
      s.minutes ? `~${s.minutes} min` : '',
    ].filter(Boolean);
    return bits.length ? `<span class="doc-step-meta">${bits.join(' &middot; ')}</span>` : '';
  }

  function renderDocument(sop, score) {
    const inp = inputLines(sop);
    const checks = sop.checks.filter((c) => filled(c.text));
    $('sopDocument').innerHTML = `
      <header class="doc-head">
        <h1>${esc(sop.title || 'Untitled SOP')}</h1>
        <p class="doc-sub">Standard operating procedure &middot; draft for human review &middot; completeness ${score}%</p>
        <dl class="doc-meta">
          <div><dt>Owner</dt><dd>${esc(sop.owner || '—')}</dd></div>
          <div><dt>Trigger</dt><dd>${esc(sop.trigger || '—')}</dd></div>
          <div><dt>Frequency</dt><dd>${esc(sop.frequency || '—')}</dd></div>
          <div><dt>Est. runtime</dt><dd>${esc(fmtMinutes(totalMinutes(sop)))}</dd></div>
        </dl>
      </header>
      ${filled(sop.purpose) ? `<section><h2>Purpose</h2><p>${esc(sop.purpose)}</p></section>` : ''}
      ${inp.length ? `<section><h2>Inputs needed</h2><ul>${inp.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></section>` : ''}
      <section><h2>Steps</h2>
        ${sop.steps.length
          ? `<ol class="doc-steps">${sop.steps.map((s) => `<li><strong>${esc(s.title || 'Untitled step')}</strong>${stepMetaLine(s)}${filled(s.detail) ? `<p>${esc(s.detail)}</p>` : ''}</li>`).join('')}</ol>`
          : '<p class="doc-empty">No steps documented yet.</p>'}
      </section>
      <section><h2>Quality checklist</h2>
        ${checks.length
          ? `<ul class="doc-checks">${checks.map((c) => `<li><span class="tick" aria-hidden="true"></span>${esc(c.text)}</li>`).join('')}</ul>`
          : '<p class="doc-empty">No quality checks yet.</p>'}
      </section>
      <section><h2>Exception paths</h2>
        ${sop.exceptions.length
          ? `<ul class="doc-excs">${sop.exceptions.map((x) => `<li><strong>If:</strong> ${esc(x.condition || '—')}<br><strong>Then:</strong> ${esc(x.response || '—')}${x.escalate ? `<br><strong>Escalate to:</strong> ${esc(x.escalate)}` : ''}</li>`).join('')}</ul>`
          : '<p class="doc-empty">No exception paths yet.</p>'}
      </section>
      <section><h2>Definition of done</h2><p>${esc(sop.done || 'Not defined.')}</p></section>
      <footer class="doc-foot">Draft SOP generated locally in SOP Builder &middot; a human approves before anything customer-facing, financial, or destructive.</footer>`;
  }

  function scheduleDerived() {
    clearTimeout(derivedTimer);
    derivedTimer = setTimeout(renderDerived, 150);
  }

  // ---------- toasts & undo ----------
  function toast(msg, opts = {}) {
    const el = $('toast');
    clearTimeout(toastTimer);
    el.textContent = '';
    const span = document.createElement('span');
    span.textContent = msg;
    el.appendChild(span);
    if (opts.action) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'toast-action';
      b.textContent = opts.action;
      b.addEventListener('click', () => { hideToast(); opts.onAction?.(); });
      el.appendChild(b);
    }
    el.classList.add('show');
    toastTimer = setTimeout(hideToast, opts.action ? UNDO_MS : 2200);
  }
  function hideToast() { $('toast').classList.remove('show'); }

  function mutateWithUndo(label, mutate) {
    const snapshot = clone(state);
    mutate();
    touch();
    save();
    renderAll();
    toast(label, {
      action: 'Undo',
      onAction: () => {
        state = normalize(snapshot);
        save();
        renderAll();
        toast('Restored');
      },
    });
  }

  // ---------- exports ----------
  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
  function copyText(text, label) {
    const done = () => toast(label || 'Copied to clipboard');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch { toast('Copy failed — use Download JSON instead'); }
    ta.remove();
  }
  function copyActiveMarkdown() {
    const sop = activeSop();
    if (!sop) { toast('No SOP selected'); return; }
    copyText(sopMarkdown(sop), 'SOP Markdown copied');
  }

  // ---------- modal ----------
  function openHelp() {
    const dlg = $('helpModal');
    if (dlg.open) return;
    lastFocus = document.activeElement;
    dlg.showModal();
  }

  // ---------- actions ----------
  function createSop() {
    const sop = blankSop();
    state.sops.push(sop);
    state.activeId = sop.id;
    save();
    renderAll();
    $('fTitle').focus();
    toast('New SOP created');
  }

  function loadDemo() {
    mutateWithUndo('Demo library loaded', () => {
      state.sops = demoSops();
      state.activeId = state.sops[0].id;
    });
  }

  function duplicateSop() {
    const sop = activeSop();
    if (!sop) return;
    const copy = normalizeSop(clone(sop));
    copy.id = uid();
    copy.title = `${sop.title || 'Untitled SOP'} (copy)`;
    copy.createdAt = Date.now();
    copy.updatedAt = Date.now();
    copy.steps.forEach((s) => { s.id = uid(); });
    copy.checks.forEach((c) => { c.id = uid(); c.done = false; });
    copy.exceptions.forEach((x) => { x.id = uid(); });
    state.sops.splice(state.sops.indexOf(sop) + 1, 0, copy);
    state.activeId = copy.id;
    save();
    renderAll();
    toast('SOP duplicated');
  }

  function deleteSop(id) {
    const sop = state.sops.find((s) => s.id === id);
    if (!sop) return;
    mutateWithUndo(`Deleted "${sop.title || 'Untitled SOP'}"`, () => {
      state.sops = state.sops.filter((s) => s.id !== id);
      if (state.activeId === id) state.activeId = state.sops[0]?.id ?? null;
    });
  }

  function moveStep(sop, sid, delta) {
    const from = sop.steps.findIndex((s) => s.id === sid);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= sop.steps.length) return;
    const [moved] = sop.steps.splice(from, 1);
    sop.steps.splice(to, 0, moved);
    touch();
    renderSteps(sop);
    renderDerived();
    $('stepList').querySelector(`[data-sid="${sid}"] [data-action="${delta < 0 ? 'step-up' : 'step-down'}"]`)?.focus();
  }

  function importLibrary(parsed) {
    let incoming;
    if (parsed && Array.isArray(parsed.sops)) incoming = normalize(parsed);
    else if (parsed && Array.isArray(parsed.steps)) {
      incoming = normalize({ sops: [parsed] }); // a single exported SOP
    } else {
      toast('Import failed — not a SOP Builder JSON file');
      return;
    }
    if (!incoming.sops.length) { toast('Import failed — no SOPs found in file'); return; }
    mutateWithUndo(`Imported ${incoming.sops.length} SOP${incoming.sops.length === 1 ? '' : 's'}`, () => {
      state.sops = incoming.sops;
      state.activeId = incoming.activeId;
    });
  }

  // ---------- events ----------
  function wireEvents() {
    // Header
    $('btnTheme').addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      save();
      applyTheme();
      toast(state.theme === 'light' ? 'Light theme on' : 'Dark theme on');
    });
    $('btnDemo').addEventListener('click', loadDemo);
    $('btnEmptyDemo').addEventListener('click', loadDemo);
    $('btnHelp').addEventListener('click', openHelp);
    $('btnCloseHelp').addEventListener('click', () => $('helpModal').close());
    $('helpModal').addEventListener('close', () => { lastFocus?.focus?.(); });

    // Library
    $('btnNewSop').addEventListener('click', createSop);
    $('btnEmptyNew').addEventListener('click', createSop);
    $('sopList').addEventListener('click', (e) => {
      const del = e.target.closest('[data-del]');
      if (del) { deleteSop(del.dataset.del); return; }
      const open = e.target.closest('[data-open]');
      if (open && open.dataset.open !== state.activeId) {
        state.activeId = open.dataset.open;
        scheduleSave();
        renderAll();
      }
    });

    // Editor text inputs (delegated)
    $('editor').addEventListener('input', (e) => {
      const sop = activeSop();
      const t = e.target;
      const field = t.dataset?.field;
      if (!sop || !field) return;
      const stepCard = t.closest('[data-sid]');
      const checkRow = t.closest('[data-cid]');
      const excCard = t.closest('[data-eid]');
      if (stepCard) {
        const step = sop.steps.find((s) => s.id === stepCard.dataset.sid);
        if (!step) return;
        if (field === 'minutes') step.minutes = clamp(Math.round(Number(t.value) || 0), 0, 999);
        else step[field] = t.value;
      } else if (checkRow) {
        const c = sop.checks.find((x) => x.id === checkRow.dataset.cid);
        if (!c) return;
        if (field === 'done') c.done = t.checked;
        else c.text = t.value;
      } else if (excCard) {
        const x = sop.exceptions.find((v) => v.id === excCard.dataset.eid);
        if (!x) return;
        x[field] = t.value;
      } else {
        sop[field] = t.value;
      }
      touch();
      scheduleDerived();
    });

    // Normalize the minutes field display after editing settles
    $('editor').addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset?.field !== 'minutes') return;
      const sop = activeSop();
      const card = t.closest('[data-sid]');
      const step = sop?.steps.find((s) => s.id === card?.dataset.sid);
      if (step) t.value = step.minutes;
    });

    // Editor buttons (delegated)
    $('editor').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      const sop = activeSop();
      if (!btn || !sop) return;
      const action = btn.dataset.action;
      const sid = btn.closest('[data-sid]')?.dataset.sid;
      const cid = btn.closest('[data-cid]')?.dataset.cid;
      const eid = btn.closest('[data-eid]')?.dataset.eid;
      if (action === 'step-up') moveStep(sop, sid, -1);
      else if (action === 'step-down') moveStep(sop, sid, 1);
      else if (action === 'step-del') {
        mutateWithUndo('Step deleted', () => { sop.steps = sop.steps.filter((s) => s.id !== sid); });
      } else if (action === 'check-del') {
        mutateWithUndo('Quality check deleted', () => { sop.checks = sop.checks.filter((c) => c.id !== cid); });
      } else if (action === 'exc-del') {
        mutateWithUndo('Exception deleted', () => { sop.exceptions = sop.exceptions.filter((x) => x.id !== eid); });
      }
    });

    // Add buttons
    $('btnAddStep').addEventListener('click', () => {
      const sop = activeSop();
      if (!sop) return;
      const step = blankStep();
      sop.steps.push(step);
      touch();
      renderSteps(sop);
      renderDerived();
      $('stepList').querySelector(`[data-sid="${step.id}"] .step-title`)?.focus();
      toast('Step added');
    });
    $('btnAddCheck').addEventListener('click', () => {
      const sop = activeSop();
      if (!sop) return;
      const c = blankCheck();
      sop.checks.push(c);
      touch();
      renderChecks(sop);
      renderDerived();
      $('checkList').querySelector(`[data-cid="${c.id}"] input[type="text"]`)?.focus();
      toast('Quality check added');
    });
    $('btnAddExc').addEventListener('click', () => {
      const sop = activeSop();
      if (!sop) return;
      const x = blankException();
      sop.exceptions.push(x);
      touch();
      renderExceptions(sop);
      renderDerived();
      $('excList').querySelector(`[data-eid="${x.id}"] input`)?.focus();
      toast('Exception path added');
    });

    // Drag-to-reorder steps (handle-initiated)
    const stepList = $('stepList');
    stepList.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.drag-handle')) {
        e.target.closest('.step-card')?.setAttribute('draggable', 'true');
      }
    });
    stepList.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.step-card');
      if (!card) return;
      dragSid = card.dataset.sid;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', dragSid); } catch { /* older engines */ }
    });
    stepList.addEventListener('dragover', (e) => {
      if (!dragSid) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const over = e.target.closest('.step-card');
      [...stepList.querySelectorAll('.step-card')].forEach((c) =>
        c.classList.toggle('drop-target', c === over && c.dataset.sid !== dragSid));
    });
    stepList.addEventListener('drop', (e) => {
      e.preventDefault();
      const over = e.target.closest('.step-card');
      const sop = activeSop();
      if (sop && over && dragSid && over.dataset.sid !== dragSid) {
        const from = sop.steps.findIndex((s) => s.id === dragSid);
        const to = sop.steps.findIndex((s) => s.id === over.dataset.sid);
        if (from >= 0 && to >= 0) {
          const [moved] = sop.steps.splice(from, 1);
          sop.steps.splice(to, 0, moved);
          touch();
          renderSteps(sop);
          renderDerived();
          toast('Step reordered');
        }
      }
      endDrag();
    });
    stepList.addEventListener('dragend', endDrag);

    // Export & handoff
    $('btnCopyMd').addEventListener('click', copyActiveMarkdown);
    $('btnPrint').addEventListener('click', () => window.print());
    $('btnJson').addEventListener('click', () => {
      download('sop-builder-library.json', JSON.stringify({
        app: 'sop-builder',
        exportedAt: new Date().toISOString(),
        note: 'Draft SOP library — human approval required before real-world use.',
        sops: state.sops,
        activeId: state.activeId,
      }, null, 2), 'application/json');
      toast('Library JSON downloaded');
    });
    $('btnCsv').addEventListener('click', () => {
      const sop = activeSop();
      if (!sop) return;
      download(`${slugify(sop.title)}-steps.csv`, stepsCsv(sop), 'text/csv');
      toast('Steps CSV downloaded');
    });
    $('btnImport').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try { importLibrary(JSON.parse(String(reader.result))); }
        catch { toast('Import failed — invalid JSON'); }
      };
      reader.readAsText(file);
    });
    $('btnDuplicate').addEventListener('click', duplicateSop);
    $('btnDeleteSop').addEventListener('click', () => {
      if (state.activeId) deleteSop(state.activeId);
    });
    $('btnReset').addEventListener('click', () => {
      if (!window.confirm('Reset all data? This deletes every SOP in this browser.')) return;
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      state = normalize(null);
      state.seenGuide = true;
      save();
      renderAll();
      toast('All data reset');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName || '';
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        copyActiveMarkdown();
        return;
      }
      if (e.key === '?' && !typing) {
        e.preventDefault();
        openHelp();
      }
      if (e.key === 'Escape' && $('helpModal').open) $('helpModal').close();
    });
  }

  function endDrag() {
    dragSid = null;
    [...$('stepList').querySelectorAll('.step-card')].forEach((c) => {
      c.classList.remove('dragging', 'drop-target');
      c.removeAttribute('draggable');
    });
  }

  // ---------- init ----------
  function init() {
    state = load();
    wireEvents();
    renderAll();
    if (!state.seenGuide) {
      state.seenGuide = true;
      save();
      openHelp();
    }
  }

  init();
})();
