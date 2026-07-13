/* Intake Form Builder — Fable remake.
   Local-first, draft-only: designs an intake form spec, never collects data. */
(() => {
  'use strict';

  /* ================= Constants ================= */

  const STORAGE_KEY = 'fable-remake:day-20-intake-form-builder:v1';
  const LEGACY_KEY = 'intake-form-builder-v1';

  const FIELD_TYPES = {
    'short-text': 'Short text',
    'long-text': 'Long text',
    'select': 'Single choice',
    'multiselect': 'Checklist',
    'date': 'Date',
    'time': 'Time window',
    'phone': 'Phone',
    'email': 'Email',
    'address': 'Address',
    'number': 'Number',
    'file': 'File upload'
  };
  const CHOICE_TYPES = ['select', 'multiselect'];
  const SECTIONS = ['Contact', 'Job details', 'Urgency', 'Scheduling', 'Proof & files', 'Consent', 'Other'];
  const CHANNELS = ['Website form', 'Phone screen', 'Text follow-up', 'In-office checklist', 'Email template'];
  const PROMISES = ['No promise yet', 'Same business day', 'Within 2 hours', 'Within 24 hours', 'Next available slot'];

  // Sensitive-data catalog scanned against each field's label + helper text.
  const SENSITIVE = [
    { re: /\bpassword\b|\bpasscode\b|\bpin\b|security question/i, cat: 'Credentials', level: 'bad',
      tip: 'Never collect passwords, PINs, or security answers on an intake form.' },
    { re: /social security|\bssn\b|\bsin\b|national insurance/i, cat: 'Government ID number', level: 'bad',
      tip: 'SSN-style identifiers are never needed to schedule a service job.' },
    { re: /credit card|debit card|card number|\bcvv\b|\bcvc\b|card expir/i, cat: 'Payment card data', level: 'bad',
      tip: 'Take payment through a payment processor at billing time, never on an intake form.' },
    { re: /bank account|routing number|\biban\b|\bswift code\b/i, cat: 'Bank details', level: 'bad',
      tip: 'Banking details do not belong on intake. Invoice later through your billing tool.' },
    { re: /passport|driver'?s? licen[cs]e|government[- ]issued id|national id/i, cat: 'Identity document', level: 'bad',
      tip: 'If identity truly must be verified, do it in person at the visit — not on a web form.' },
    { re: /medical|diagnosis|health condition|medication|disabilit|mental health/i, cat: 'Health data', level: 'bad',
      tip: 'Health data is heavily regulated. Only collect access or safety notes actually needed for the job.' },
    { re: /\brace\b|ethnicit|religio|sexual orientation|immigration status|citizenship/i, cat: 'Protected characteristics', level: 'bad',
      tip: 'Protected-class data has no place on a service intake form.' },
    { re: /mother'?s maiden|place of birth/i, cat: 'Security-question data', level: 'bad',
      tip: 'This is account-recovery data; collecting it creates breach risk for your customers.' },
    { re: /date of birth|\bdob\b|birth ?date|how old are you/i, cat: 'Date of birth', level: 'warn',
      tip: 'Rarely needed to route a job. Drop it unless a law forces you to ask.' },
    { re: /\bincome\b|\bsalary\b|credit score|net worth/i, cat: 'Financial profile', level: 'warn',
      tip: 'Financial profiling erodes trust. If budget matters, ask a broad range question instead.' }
  ];

  const SAFETY_LINE = 'Draft form spec only. Do not publish, collect customer data, call webhooks, or connect a CRM until a human privacy/quality review signs off.';

  const DEMO = {
    settings: {
      formName: 'Emergency HVAC intake',
      businessName: 'Backhaul Heating',
      formGoal: 'Collect enough information to route urgent no-heat calls to the right technician without promising availability or pricing.',
      channel: 'Website form',
      responsePromise: 'No promise yet',
      privacyNote: 'Never ask for passwords, card numbers, SSNs, medical data, or IDs we do not need to do the job.'
    },
    fields: [
      { label: 'Full name', type: 'short-text', required: true, section: 'Contact', help: 'First and last name.' },
      { label: 'Best phone number', type: 'phone', required: true, section: 'Contact', help: 'We only call about this request.' },
      { label: 'Email (optional)', type: 'email', required: false, section: 'Contact', help: 'For written quotes and appointment confirmations.' },
      { label: 'Service address', type: 'address', required: true, section: 'Contact', help: 'Street address or nearest cross-street — enough to route a technician.' },
      { label: 'What is going on with your system?', type: 'long-text', required: true, section: 'Job details', help: 'Describe symptoms, sounds, smells, and when it started.' },
      { label: 'How urgent is this?', type: 'select', required: true, section: 'Urgency', help: 'No heat right now | Today if possible | This week | Planning ahead' },
      { label: 'Preferred appointment windows', type: 'multiselect', required: false, section: 'Scheduling', help: 'Morning (8-11) | Midday (11-2) | Afternoon (2-5) | After 5pm | Flexible' },
      { label: 'Photo of the unit label (optional)', type: 'file', required: false, section: 'Proof & files', help: 'A photo of the model/serial sticker speeds up parts lookup.' },
      { label: 'May we contact you about this request?', type: 'select', required: true, section: 'Consent', help: 'Yes, contact me about this request | No, do not contact me' }
    ]
  };

  /* ================= Small helpers ================= */

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
  const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `f-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const plural = (n, one, many) => (n === 1 ? one : (many ?? `${one}s`));
  const optionsOf = (field) => String(field.help || '').split('|').map(clean).filter(Boolean);

  /* ================= State ================= */

  const defaultState = () => ({
    version: 1,
    theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
    seenGuide: false,
    settings: { formName: '', businessName: '', formGoal: '', channel: CHANNELS[0], responsePromise: PROMISES[0], privacyNote: '' },
    fields: []
  });

  function normalizeField(raw) {
    if (!raw || typeof raw !== 'object') return null;
    let type = String(raw.type || 'short-text');
    if (type === 'checkboxes') type = 'multiselect'; // legacy
    if (!FIELD_TYPES[type]) type = 'short-text';
    let section = clean(raw.section);
    if (section === 'Proof / files') section = 'Proof & files'; // legacy
    if (!SECTIONS.includes(section)) section = 'Other';
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
      label: clean(raw.label).slice(0, 160),
      type,
      required: raw.required === true || raw.required === 'yes',
      section,
      help: clean(raw.help).slice(0, 400)
    };
  }

  function normalize(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== 'object') return base;
    const src = (raw.state && typeof raw.state === 'object') ? raw.state : raw;
    const out = defaultState();
    out.theme = src.theme === 'light' ? 'light' : (src.theme === 'dark' ? 'dark' : base.theme);
    out.seenGuide = src.seenGuide === true;
    const s = (src.settings && typeof src.settings === 'object') ? src.settings : src; // legacy flat shape
    out.settings.formName = clean(s.formName).slice(0, 90);
    out.settings.businessName = clean(s.businessName).slice(0, 90);
    out.settings.formGoal = clean(s.formGoal).slice(0, 400);
    out.settings.channel = CHANNELS.includes(s.channel) ? s.channel : CHANNELS[0];
    out.settings.responsePromise = PROMISES.includes(s.responsePromise) ? s.responsePromise : PROMISES[0];
    out.settings.privacyNote = clean(s.privacyNote).slice(0, 400);
    out.fields = Array.isArray(src.fields) ? src.fields.map(normalizeField).filter(Boolean).slice(0, 60) : [];
    return out;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return normalize(JSON.parse(raw));
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) return normalize(JSON.parse(legacy)); // migrate day-20 v0 data
    } catch { /* corrupt storage — start fresh */ }
    return defaultState();
  }

  let state = loadState();
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
    }, 250);
  }

  // Ephemeral UI state (never persisted)
  let editingId = null;      // field id currently open in the in-place editor
  let editingIsNew = false;  // cancel removes the field if it was just added
  let dragId = null;
  let undoBuffer = null;     // { field, index }

  /* ================= Domain: audit & health ================= */

  function isPII(field) {
    if (['email', 'phone', 'address'].includes(field.type)) return true;
    const l = field.label.toLowerCase();
    if (/business|company/.test(l)) return false;
    return /\bname\b|\bphone\b|\bemail\b|\baddress\b/.test(l);
  }

  function fieldSensitiveHits(field) {
    const hay = `${field.label} ${field.help}`;
    return SENSITIVE.filter((rule) => rule.re.test(hay));
  }

  function runAudit(st) {
    const f = st.fields;
    const findings = [];
    const add = (level, title, detail, privacy = false) => findings.push({ level, title, detail, privacy });

    // 1. Sensitive-data scan (label + helper text of every field)
    f.forEach((field) => {
      fieldSensitiveHits(field).forEach((rule) => {
        add(rule.level, `${rule.cat} requested`,
          `"${field.label || '(untitled field)'}" appears to ask for ${rule.cat.toLowerCase()}. ${rule.tip}`, true);
      });
    });

    const labels = f.map((x) => x.label.toLowerCase());
    const types = f.map((x) => x.type);

    // 2. Structure checks
    if (!f.length) {
      add('bad', 'Empty form', 'There are no fields yet. Add fields or load the demo to start.');
    } else {
      const hasContact = types.some((t) => ['phone', 'email', 'address'].includes(t))
        || labels.some((l) => /phone|email|contact|call back|reach you/.test(l));
      if (!hasContact) add('bad', 'No contact path', 'There is no way to reach the requester. Add a phone or email field.');
      if (f.length < 4) add('warn', 'Very short form', 'Under 4 fields usually means a follow-up call to re-collect basics. Aim for 5-10 focused questions.');
      if (f.length > 12) add('warn', 'Long form friction', `${f.length} fields will hurt completion. Trim to the questions needed to route the job; collect the rest at booking.`);
      if (!labels.some((l) => /problem|issue|symptom|describe|request|need|help|goal|going on/.test(l))) {
        add('warn', 'No problem statement', 'Add an open question so the requester can describe the job in their own words.');
      }
      if (!labels.some((l) => /urgen|priorit|emergenc|when|timeline|how soon|schedul/.test(l))) {
        add('warn', 'No urgency signal', 'Add an urgency or timing question so requests can be triaged without a callback.');
      }
    }

    // 3. Consent check
    const collectsContact = types.some((t) => ['phone', 'email'].includes(t)) || labels.some((l) => /phone|email/.test(l));
    const hasConsent = f.some((x) => x.section === 'Consent' || /consent|permission|agree|opt[- ]?in|may we contact/.test(x.label.toLowerCase()));
    if (collectsContact && !hasConsent) {
      add('warn', 'No consent checkpoint', 'The form collects contact details but never asks permission to use them. Add a consent question.', true);
    }

    // 4. Required burden
    const req = f.filter((x) => x.required).length;
    if (req > 8 || (f.length >= 4 && req / f.length > 0.75)) {
      add('warn', 'Required overload', `${req} of ${f.length} fields are required. Make nice-to-have questions optional so people can finish.`);
    }

    // 5. Duplicates
    const seen = new Set(); const dupes = new Set();
    labels.forEach((l) => { if (l && seen.has(l)) dupes.add(l); seen.add(l); });
    if (dupes.size) add('warn', 'Duplicate questions', `Repeated ${plural(dupes.size, 'label')}: ${[...dupes].join('; ')}.`);

    // 6. Choice fields without options
    f.filter((x) => CHOICE_TYPES.includes(x.type) && optionsOf(x).length < 2).forEach((x) => {
      add('warn', 'Choice field without options', `"${x.label || '(untitled field)'}" needs at least two options. List them in the options box separated by |.`);
    });

    // 7. File uploads
    if (types.includes('file')) {
      add('warn', 'File uploads carry hidden data', 'Photos and documents can embed location and personal data (EXIF, metadata). Document where uploads are stored and who can see them.', true);
    }

    // 8. Data minimization / PII inventory
    const piiFields = f.filter(isPII);
    if (piiFields.length >= 4) {
      add('warn', 'Data minimization', `${piiFields.length} personal-data fields is a lot for intake. Collect the minimum needed to route the job; gather the rest at booking.`, true);
    }
    if (piiFields.length) {
      add('info', 'Personal data inventory', `${piiFields.length} ${plural(piiFields.length, 'field collects', 'fields collect')} personal data: ${piiFields.map((x) => x.label || '(untitled)').join('; ')}. Confirm each one is needed to route the job.`, true);
    }

    // 9. Helper text coverage
    const noHelp = f.filter((x) => !x.help).length;
    if (noHelp) add('info', 'Helper text missing', `${noHelp} ${plural(noHelp, 'field has', 'fields have')} no helper text. A one-line hint improves answer quality.`);

    // 10. Settings checks
    if (!st.settings.privacyNote) add('warn', 'No internal privacy rule', 'Write the privacy rule reviewers should enforce — what this form must never ask for.', true);
    if (st.settings.responsePromise !== PROMISES[0]) {
      add('warn', 'Response promise needs sign-off', `The form promises "${st.settings.responsePromise}". Confirm the team can actually meet it before publishing.`);
    }

    if (!findings.some((x) => x.level === 'bad' || x.level === 'warn')) {
      add('ok', 'Clean draft', 'No blocking issues found. A human still reviews the spec before anything goes live.');
    }
    return findings;
  }

  function computeHealth(st, findings) {
    const reasons = [];
    let score = 100;
    findings.forEach((x) => {
      if (x.level === 'bad') { score -= 15; reasons.push({ delta: -15, text: x.title }); }
      else if (x.level === 'warn') { score -= 6; reasons.push({ delta: -6, text: x.title }); }
    });
    if (!st.settings.formGoal) { score -= 4; reasons.push({ delta: -4, text: 'No intake goal written' }); }
    if (!st.settings.formName) { score -= 2; reasons.push({ delta: -2, text: 'Form has no name' }); }
    const hasConsent = st.fields.some((x) => x.section === 'Consent' || /consent|permission|agree|may we contact/i.test(x.label));
    if (hasConsent) { score += 3; reasons.push({ delta: 3, text: 'Consent checkpoint present' }); }
    if (st.fields.length >= 4 && st.fields.every((x) => x.help)) { score += 3; reasons.push({ delta: 3, text: 'Every field has helper text' }); }
    score = Math.max(0, Math.min(100, Math.round(score)));
    const band = score >= 90 ? 'Ready for human review'
      : score >= 75 ? 'Nearly there'
      : score >= 50 ? 'Needs work'
      : 'Rework the draft';
    return { score, band, reasons };
  }

  function groupBySection(fields) {
    const groups = [];
    SECTIONS.forEach((section) => {
      const list = fields.filter((f) => f.section === section);
      if (list.length) groups.push({ section, fields: list });
    });
    return groups;
  }

  function blueprint() {
    const findings = runAudit(state);
    const health = computeHealth(state, findings);
    return { findings, health };
  }

  /* ================= Domain: exports ================= */

  function toMarkdown(bp) {
    const s = state.settings;
    const req = state.fields.filter((f) => f.required).length;
    const lines = [];
    lines.push(`# Intake Form Spec — ${s.formName || 'Untitled intake form'}`);
    lines.push('');
    lines.push(`> ${SAFETY_LINE}`);
    lines.push('');
    lines.push(`Generated locally: ${new Date().toLocaleString()}`);
    lines.push('');
    lines.push('## Context');
    lines.push(`- Business / team: ${s.businessName || 'Not set'}`);
    lines.push(`- Channel: ${s.channel}`);
    lines.push(`- Response promise: ${s.responsePromise}`);
    lines.push(`- Goal: ${s.formGoal || 'Not set.'}`);
    lines.push(`- Internal privacy rule: ${s.privacyNote || 'Not set.'}`);
    lines.push('');
    lines.push(`## Health score: ${bp.health.score}/100 — ${bp.health.band}`);
    if (bp.health.reasons.length) {
      bp.health.reasons.forEach((r) => lines.push(`- ${r.delta > 0 ? '+' : ''}${r.delta} ${r.text}`));
    } else {
      lines.push('- No deductions — clean draft.');
    }
    lines.push('');
    lines.push(`## Fields (${state.fields.length} total · ${req} required)`);
    let order = 0;
    groupBySection(state.fields).forEach((group) => {
      lines.push('');
      lines.push(`### ${group.section}`);
      group.fields.forEach((f) => {
        order += 1;
        lines.push(`${order}. **${f.label || '(untitled field)'}** — ${FIELD_TYPES[f.type]}, ${f.required ? 'required' : 'optional'}`);
        if (CHOICE_TYPES.includes(f.type)) {
          const opts = optionsOf(f);
          lines.push(`   - Options: ${opts.length ? opts.join(' | ') : 'MISSING — add options before review'}`);
        } else if (f.help) {
          lines.push(`   - Helper: ${f.help}`);
        }
      });
    });
    if (!state.fields.length) lines.push('', '_No fields yet._');
    lines.push('');
    lines.push('## Privacy & quality audit');
    bp.findings.forEach((x) => {
      const tag = x.level === 'bad' ? 'BLOCKER' : x.level.toUpperCase();
      lines.push(`- [${tag}] ${x.title} — ${x.detail}`);
    });
    return lines.join('\n');
  }

  function toCSV() {
    const rows = [['order', 'section', 'label', 'type', 'required', 'options_or_helper']];
    let order = 0;
    groupBySection(state.fields).forEach((group) => {
      group.fields.forEach((f) => {
        order += 1;
        rows.push([order, group.section, f.label, FIELD_TYPES[f.type], f.required ? 'yes' : 'no', f.help]);
      });
    });
    return rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n');
  }

  function toJSON(bp) {
    return JSON.stringify({
      app: 'intake-form-builder',
      version: 1,
      exportedAt: new Date().toISOString(),
      safety: SAFETY_LINE,
      settings: clone(state.settings),
      fields: clone(state.fields),
      audit: bp.findings,
      health: bp.health
    }, null, 2);
  }

  function fileSlug() {
    return (clean(state.settings.formName) || 'intake-form').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'intake-form';
  }

  /* ================= Render ================= */

  function renderStats(bp) {
    $('statFields').textContent = String(state.fields.length);
    $('statRequired').textContent = String(state.fields.filter((f) => f.required).length);
    $('statFlags').textContent = String(bp.findings.filter((x) => x.privacy && (x.level === 'bad' || x.level === 'warn')).length);
    $('statHealth').textContent = String(bp.health.score);
  }

  function typeSelectHTML(selected) {
    return Object.entries(FIELD_TYPES)
      .map(([v, l]) => `<option value="${v}"${v === selected ? ' selected' : ''}>${l}</option>`).join('');
  }
  function sectionSelectHTML(selected) {
    return SECTIONS.map((s) => `<option${s === selected ? ' selected' : ''}>${s}</option>`).join('');
  }

  function editorHTML(f) {
    const isChoice = CHOICE_TYPES.includes(f.type);
    return `
      <form class="field-editor" data-id="${esc(f.id)}" novalidate>
        <label class="fld">Question label
          <input type="text" name="label" maxlength="160" value="${esc(f.label)}" placeholder="What problem should we solve?" autocomplete="off" />
          <span class="fld-error" hidden data-err>Label is required.</span>
        </label>
        <div class="editor-row">
          <label class="fld">Type
            <select name="type">${typeSelectHTML(f.type)}</select>
          </label>
          <label class="fld">Section
            <select name="section">${sectionSelectHTML(f.section)}</select>
          </label>
          <label class="check-fld"><input type="checkbox" name="required"${f.required ? ' checked' : ''} /> Required</label>
        </div>
        <label class="fld">${isChoice ? 'Options (separate with |)' : 'Helper text (or options with |)'}
          <textarea name="help" rows="2" maxlength="400" placeholder="${isChoice ? 'Emergency | This week | Planning ahead' : 'One line telling the requester what a good answer includes.'}">${esc(f.help)}</textarea>
        </label>
        <div class="editor-actions">
          <button type="button" class="btn btn-ghost" data-act="cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Save field</button>
        </div>
      </form>`;
  }

  function fieldCardHTML(f, idx, total) {
    if (f.id === editingId) {
      return `<article class="field-card editing" data-id="${esc(f.id)}">${editorHTML(f)}</article>`;
    }
    const hits = fieldSensitiveHits(f);
    const badges = [
      `<span class="chip chip-section">${esc(f.section)}</span>`,
      `<span class="chip">${esc(FIELD_TYPES[f.type])}</span>`,
      `<span class="chip">${f.required ? 'required' : 'optional'}</span>`,
      hits.length ? `<span class="chip chip-sensitive" title="${esc(hits.map((h) => h.cat).join(', '))}">sensitive?</span>` : '',
      !hits.length && isPII(f) ? '<span class="chip chip-pii">PII</span>' : ''
    ].filter(Boolean).join('');
    return `
      <article class="field-card" data-id="${esc(f.id)}" draggable="true">
        <span class="drag-handle" title="Drag to reorder" aria-hidden="true">&#8942;&#8942;</span>
        <div class="field-main">
          <div class="field-title">
            <strong>${esc(f.label) || '<em>(untitled field)</em>'}</strong>
            ${f.required ? '<span class="req-star" aria-label="required">*</span>' : ''}
          </div>
          ${f.help ? `<p class="field-help-text">${esc(f.help)}</p>` : ''}
          <div class="field-meta">${badges}</div>
        </div>
        <div class="field-actions">
          <button type="button" class="mini-btn" data-act="up" ${idx === 0 ? 'disabled' : ''} aria-label="Move up">&uarr;</button>
          <button type="button" class="mini-btn" data-act="down" ${idx === total - 1 ? 'disabled' : ''} aria-label="Move down">&darr;</button>
          <button type="button" class="mini-btn" data-act="edit">Edit</button>
          <button type="button" class="mini-btn" data-act="dup">Duplicate</button>
          <button type="button" class="mini-btn danger" data-act="del">Delete</button>
        </div>
      </article>`;
  }

  function renderFieldList() {
    const list = $('fieldList');
    if (!state.fields.length) {
      list.innerHTML = `
        <div class="empty-state">
          <p>No fields yet. Every intake form starts with one good question.</p>
          <div class="btn-row">
            <button type="button" class="btn btn-primary" data-act="add">+ Add first field</button>
            <button type="button" class="btn" data-act="demo">Load demo form</button>
          </div>
        </div>`;
      return;
    }
    const total = state.fields.length;
    list.innerHTML = state.fields.map((f, i) => fieldCardHTML(f, i, total)).join('');
  }

  function previewControl(f) {
    const opts = optionsOf(f);
    switch (f.type) {
      case 'long-text': return '<div class="pv-input pv-textarea">Longer answer…</div>';
      case 'select':
        return `<div class="pv-input"><span>${opts[0] ? esc(opts[0]) : 'Select…'}</span><span class="pv-caret">&#9662;</span></div>`
          + (opts.length > 1 ? `<div class="pv-options">${opts.slice(0, 6).map((o) => `<span class="pv-chip">${esc(o)}</span>`).join('')}</div>` : '');
      case 'multiselect': {
        const shown = (opts.length ? opts : ['Option one', 'Option two']).slice(0, 6);
        return `<div class="pv-checks">${shown.map((o) => `<span class="pv-check"><span class="pv-box"></span>${esc(o)}</span>`).join('')}</div>`;
      }
      case 'file': return '<div class="pv-input pv-file">&#8686; Attach a photo or document</div>';
      case 'date': return '<div class="pv-input">mm / dd / yyyy</div>';
      case 'time': return '<div class="pv-input">--:-- &mdash; --:--</div>';
      case 'phone': return '<div class="pv-input">(555) 000-0000</div>';
      case 'email': return '<div class="pv-input">name@example.com</div>';
      case 'address': return '<div class="pv-input">Street, city, ZIP</div>';
      case 'number': return '<div class="pv-input">0</div>';
      default: return '<div class="pv-input">Short answer</div>';
    }
  }

  function renderPreview() {
    const s = state.settings;
    const head = `
      <div class="pv-head">
        ${s.businessName ? `<p class="pv-business">${esc(s.businessName)}</p>` : ''}
        <h3>${esc(s.formName) || 'Untitled intake form'}</h3>
        ${s.formGoal ? `<p class="pv-goal">${esc(s.formGoal)}</p>` : ''}
      </div>`;
    if (!state.fields.length) {
      $('previewBody').innerHTML = head + '<p class="pv-empty">Add fields to see the requester’s view here, grouped by section.</p>';
      return;
    }
    const sections = groupBySection(state.fields).map((group) => `
      <section class="pv-section">
        <h4 class="pv-section-title">${esc(group.section)}</h4>
        ${group.fields.map((f) => `
          <div class="pv-field">
            <span class="pv-label">${esc(f.label) || '(untitled field)'}${f.required ? ' <span class="req-star" aria-label="required">*</span>' : ''}</span>
            ${previewControl(f)}
            ${f.help && !CHOICE_TYPES.includes(f.type) ? `<p class="pv-hint">${esc(f.help)}</p>` : ''}
          </div>`).join('')}
      </section>`).join('');
    const footer = `
      <div class="pv-footer">
        <span class="pv-submit">Submit request (preview only)</span>
        <p class="pv-note">Draft preview — this mock form does not collect or send anything.</p>
      </div>`;
    $('previewBody').innerHTML = head + sections + footer;
  }

  function renderAudit(bp) {
    $('healthScore').textContent = String(bp.health.score);
    $('healthBand').textContent = bp.health.band;
    $('healthBar').style.width = `${bp.health.score}%`;
    $('healthReasons').innerHTML = bp.health.reasons.length
      ? bp.health.reasons.map((r) => `
          <li><span class="health-delta ${r.delta > 0 ? 'plus' : 'minus'}">${r.delta > 0 ? '+' : ''}${r.delta}</span><span>${esc(r.text)}</span></li>`).join('')
      : '<li><span class="health-delta plus">+0</span><span>No deductions — clean draft.</span></li>';
    $('auditList').innerHTML = bp.findings.map((x) => `
      <div class="audit-item ${esc(x.level)}">
        <strong><span class="audit-tag">${x.level === 'bad' ? 'blocker' : esc(x.level)}</span>${esc(x.title)}</strong>
        <p>${esc(x.detail)}</p>
      </div>`).join('');
  }

  function renderSpec(bp) {
    $('specPre').textContent = toMarkdown(bp);
  }

  function renderDerived() {
    const bp = blueprint();
    renderStats(bp);
    renderPreview();
    renderAudit(bp);
    renderSpec(bp);
    save();
    return bp;
  }

  function renderAll() {
    renderFieldList();
    renderDerived();
  }

  function syncSettingsInputs() {
    const s = state.settings;
    $('setFormName').value = s.formName;
    $('setBusinessName').value = s.businessName;
    $('setFormGoal').value = s.formGoal;
    $('setChannel').value = s.channel;
    $('setResponsePromise').value = s.responsePromise;
    $('setPrivacyNote').value = s.privacyNote;
  }

  /* ================= Toast ================= */

  let toastTimer = null;
  function toast(msg, opts = {}) {
    const el = $('toast');
    el.textContent = '';
    const span = document.createElement('span');
    span.textContent = msg;
    el.appendChild(span);
    if (opts.actionLabel && typeof opts.onAction === 'function') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toast-action';
      btn.textContent = opts.actionLabel;
      btn.addEventListener('click', () => { hideToast(); opts.onAction(); });
      el.appendChild(btn);
    }
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, opts.duration ?? 2400);
  }
  function hideToast() {
    clearTimeout(toastTimer);
    $('toast').classList.remove('show');
  }

  /* ================= Modal (help) ================= */

  let lastFocus = null;
  function openHelp() {
    lastFocus = document.activeElement;
    $('helpModal').hidden = false;
    $('helpCloseBtn').focus();
    if (!state.seenGuide) { state.seenGuide = true; save(); }
  }
  function closeHelp() {
    $('helpModal').hidden = true;
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }
  function trapFocus(e) {
    if ($('helpModal').hidden || e.key !== 'Tab') return;
    const focusables = $('helpModal').querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ================= Field actions ================= */

  function fieldIndex(id) { return state.fields.findIndex((f) => f.id === id); }

  function startEdit(id, isNew = false) {
    editingId = id;
    editingIsNew = isNew;
    renderFieldList();
    const card = $('fieldList').querySelector(`.field-card[data-id="${CSS.escape(id)}"]`);
    if (card) {
      card.scrollIntoView({ block: 'nearest' });
      card.querySelector('input[name="label"]')?.focus();
    }
  }

  function cancelEdit() {
    if (editingId === null) return;
    if (editingIsNew) {
      const i = fieldIndex(editingId);
      if (i >= 0) state.fields.splice(i, 1);
    }
    editingId = null;
    editingIsNew = false;
    renderAll();
  }

  function saveEdit(form) {
    const id = form.dataset.id;
    const i = fieldIndex(id);
    if (i < 0) { editingId = null; renderAll(); return; }
    const labelInput = form.querySelector('input[name="label"]');
    const label = clean(labelInput.value);
    if (!label) {
      labelInput.classList.add('invalid');
      form.querySelector('[data-err]').hidden = false;
      labelInput.focus();
      return;
    }
    const f = state.fields[i];
    f.label = label.slice(0, 160);
    f.type = FIELD_TYPES[form.querySelector('select[name="type"]').value] ? form.querySelector('select[name="type"]').value : 'short-text';
    f.section = SECTIONS.includes(form.querySelector('select[name="section"]').value) ? form.querySelector('select[name="section"]').value : 'Other';
    f.required = form.querySelector('input[name="required"]').checked;
    f.help = clean(form.querySelector('textarea[name="help"]').value).slice(0, 400);
    const wasNew = editingIsNew;
    editingId = null;
    editingIsNew = false;
    renderAll();
    toast(wasNew ? 'Field added' : 'Field updated');
  }

  function addField() {
    if (editingId !== null) cancelEdit();
    const field = { id: uid(), label: '', type: 'short-text', required: false, section: 'Job details', help: '' };
    state.fields.push(field);
    startEdit(field.id, true);
  }

  function deleteField(id) {
    const i = fieldIndex(id);
    if (i < 0) return;
    const [removed] = state.fields.splice(i, 1);
    undoBuffer = { field: removed, index: i };
    if (editingId === id) { editingId = null; editingIsNew = false; }
    renderAll();
    toast(`Deleted "${removed.label || 'untitled field'}"`, {
      actionLabel: 'Undo',
      duration: 7000,
      onAction: () => {
        if (!undoBuffer) return;
        const at = Math.min(undoBuffer.index, state.fields.length);
        state.fields.splice(at, 0, undoBuffer.field);
        undoBuffer = null;
        renderAll();
        toast('Field restored');
      }
    });
  }

  function duplicateField(id) {
    const i = fieldIndex(id);
    if (i < 0) return;
    const copy = clone(state.fields[i]);
    copy.id = uid();
    copy.label = `${copy.label || 'Untitled'} (copy)`.slice(0, 160);
    state.fields.splice(i + 1, 0, copy);
    renderAll();
    toast('Field duplicated');
  }

  function moveField(id, delta) {
    const i = fieldIndex(id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= state.fields.length) return;
    [state.fields[i], state.fields[j]] = [state.fields[j], state.fields[i]];
    renderAll();
  }

  /* ================= Exports & data actions ================= */

  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function copyMarkdown() {
    const md = toMarkdown(blueprint());
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(md)
        .then(() => toast('Markdown spec copied'))
        .catch(() => toast('Copy blocked — select the spec text below and copy manually', { duration: 4000 }));
    } else {
      toast('Clipboard unavailable — select the spec text below and copy manually', { duration: 4000 });
    }
  }

  function importJSONFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const next = normalize(parsed);
        next.theme = state.theme;       // keep current view prefs
        next.seenGuide = true;
        state = next;
        editingId = null; editingIsNew = false;
        syncSettingsInputs();
        renderAll();
        toast('Draft imported');
      } catch {
        toast('Import failed — that file is not valid JSON', { duration: 4000 });
      }
    };
    reader.onerror = () => toast('Import failed — could not read the file', { duration: 4000 });
    reader.readAsText(file);
  }

  function loadDemo() {
    state.settings = clone(DEMO.settings);
    state.fields = DEMO.fields.map((f) => ({ id: uid(), ...clone(f) }));
    editingId = null; editingIsNew = false;
    syncSettingsInputs();
    renderAll();
    toast('Demo form loaded — Emergency HVAC intake');
  }

  function resetAll() {
    if (!window.confirm('Reset the whole draft? This clears the form settings and every field. Export JSON first if you want a backup.')) return;
    const theme = state.theme;
    state = defaultState();
    state.theme = theme;
    state.seenGuide = true;
    editingId = null; editingIsNew = false;
    undoBuffer = null;
    syncSettingsInputs();
    renderAll();
    toast('Draft cleared');
  }

  /* ================= Theme ================= */

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    const btn = $('themeBtn');
    btn.innerHTML = state.theme === 'dark' ? '&#9788;' : '&#9789;';
    btn.setAttribute('aria-pressed', state.theme === 'light' ? 'true' : 'false');
    btn.setAttribute('aria-label', state.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }

  /* ================= Event wiring ================= */

  function wireSettings() {
    const map = [
      ['setFormName', 'formName'], ['setBusinessName', 'businessName'], ['setFormGoal', 'formGoal'],
      ['setChannel', 'channel'], ['setResponsePromise', 'responsePromise'], ['setPrivacyNote', 'privacyNote']
    ];
    map.forEach(([id, key]) => {
      $(id).addEventListener('input', () => {
        state.settings[key] = clean($(id).value).slice(0, 400);
        renderDerived(); // skips field list so an open editor is untouched
      });
    });
  }

  function wireFieldList() {
    const list = $('fieldList');

    list.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'add') { addField(); return; }
      if (act === 'demo') { loadDemo(); return; }
      const card = btn.closest('.field-card');
      const id = card?.dataset.id;
      if (!id) return;
      if (act === 'up') moveField(id, -1);
      else if (act === 'down') moveField(id, 1);
      else if (act === 'edit') startEdit(id);
      else if (act === 'dup') duplicateField(id);
      else if (act === 'del') deleteField(id);
      else if (act === 'cancel') cancelEdit();
    });

    list.addEventListener('submit', (e) => {
      const form = e.target.closest('.field-editor');
      if (!form) return;
      e.preventDefault();
      saveEdit(form);
    });

    // Live-swap the options/helper label as the type changes inside the editor
    list.addEventListener('change', (e) => {
      const sel = e.target.closest('.field-editor select[name="type"]');
      if (!sel) return;
      const form = sel.closest('.field-editor');
      const helpFld = form.querySelector('textarea[name="help"]').closest('.fld');
      const isChoice = CHOICE_TYPES.includes(sel.value);
      helpFld.firstChild.textContent = isChoice ? 'Options (separate with |)' : 'Helper text (or options with |)';
      form.querySelector('textarea[name="help"]').placeholder = isChoice
        ? 'Emergency | This week | Planning ahead'
        : 'One line telling the requester what a good answer includes.';
    });

    // Drag & drop reordering
    list.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.field-card');
      if (!card || card.classList.contains('editing')) { e.preventDefault(); return; }
      dragId = card.dataset.id;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', dragId); } catch { /* older engines */ }
    });
    list.addEventListener('dragover', (e) => {
      if (!dragId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const card = e.target.closest('.field-card');
      list.querySelectorAll('.drop-above, .drop-below').forEach((el) => el.classList.remove('drop-above', 'drop-below'));
      if (!card || card.dataset.id === dragId) return;
      const rect = card.getBoundingClientRect();
      card.classList.add(e.clientY < rect.top + rect.height / 2 ? 'drop-above' : 'drop-below');
    });
    list.addEventListener('drop', (e) => {
      if (!dragId) return;
      e.preventDefault();
      const card = e.target.closest('.field-card');
      const from = fieldIndex(dragId);
      if (card && card.dataset.id !== dragId && from >= 0) {
        const rect = card.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        let to = fieldIndex(card.dataset.id) + (before ? 0 : 1);
        const [moved] = state.fields.splice(from, 1);
        if (from < to) to -= 1;
        state.fields.splice(to, 0, moved);
      }
      dragId = null;
      renderAll();
    });
    list.addEventListener('dragend', () => {
      dragId = null;
      list.querySelectorAll('.dragging, .drop-above, .drop-below').forEach((el) => el.classList.remove('dragging', 'drop-above', 'drop-below'));
    });
  }

  function wireHeaderAndExports() {
    $('themeBtn').addEventListener('click', () => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      applyTheme();
      save();
    });
    $('helpBtn').addEventListener('click', openHelp);
    $('helpCloseBtn').addEventListener('click', closeHelp);
    $('helpModal').addEventListener('click', (e) => { if (e.target === $('helpModal')) closeHelp(); });
    $('loadDemoBtn').addEventListener('click', loadDemo);
    $('addFieldBtn').addEventListener('click', addField);

    $('copyMdBtn').addEventListener('click', copyMarkdown);
    $('dlMdBtn').addEventListener('click', () => { download(`${fileSlug()}-spec.md`, toMarkdown(blueprint()), 'text/markdown'); toast('Markdown downloaded'); });
    $('dlJsonBtn').addEventListener('click', () => { download(`${fileSlug()}-spec.json`, toJSON(blueprint()), 'application/json'); toast('JSON downloaded'); });
    $('dlCsvBtn').addEventListener('click', () => { download(`${fileSlug()}-fields.csv`, toCSV(), 'text/csv'); toast('CSV downloaded'); });
    $('printBtn').addEventListener('click', () => window.print());
    $('importBtn').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', () => {
      const file = $('importFile').files?.[0];
      if (file) importJSONFile(file);
      $('importFile').value = '';
    });
    $('resetBtn').addEventListener('click', resetAll);
  }

  function wireKeyboard() {
    document.addEventListener('keydown', (e) => {
      trapFocus(e);
      const typing = /^(input|textarea|select)$/i.test(document.activeElement?.tagName || '');
      if (e.key === 'Escape') {
        if (!$('helpModal').hidden) { closeHelp(); return; }
        if (editingId !== null) { cancelEdit(); return; }
        hideToast();
        return;
      }
      if (e.key === '?' && !typing) {
        e.preventDefault();
        openHelp();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        copyMarkdown();
      }
    });
  }

  /* ================= Init ================= */

  function init() {
    // Populate static selects
    $('setChannel').innerHTML = CHANNELS.map((c) => `<option>${c}</option>`).join('');
    $('setResponsePromise').innerHTML = PROMISES.map((p) => `<option>${p}</option>`).join('');

    applyTheme();
    syncSettingsInputs();
    wireSettings();
    wireFieldList();
    wireHeaderAndExports();
    wireKeyboard();
    renderAll();

    if (!state.seenGuide) openHelp();
  }

  init();
})();
