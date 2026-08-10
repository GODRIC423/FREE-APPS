/* Service Triage Flow — step-through triage wizard for inbound service calls.
   Local-first: no network, no accounts. Every output is a draft for human review. */
(() => {
  'use strict';

  /* ---------------- helpers ---------------- */
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const fmtDateTime = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); };
  const isToday = (iso) => { const d = new Date(iso), n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate(); };

  /* ---------------- constants ---------------- */
  const STORAGE_KEY = 'fable-remake:day-08-service-triage-flow:v1';
  const SERVICE_TYPES = ['HVAC', 'Plumbing', 'Electrical', 'Appliance', 'Roofing', 'General service'];
  const CATEGORIES = ['Emergency', 'Same-day', 'Scheduled', 'Estimate', 'Callback'];
  const REPEAT_LABELS = { no: 'No — first call about this', callback: 'Callback — repeat visit for the same issue', warranty: 'Warranty / complaint about prior work' };

  const HAZARDS = [
    { id: 'gas', severe: true, label: 'Gas smell or suspected gas leak', advice: 'Ask the caller to leave the building, avoid switches and open flames, and call the gas utility or 911 before any booking.' },
    { id: 'smoke', severe: true, label: 'Smoke, burning smell, or sparking', advice: 'If anything is actively burning, 911 first. Power off at the breaker only if it is safe to reach.' },
    { id: 'co', severe: true, label: 'Carbon monoxide alarm going off', advice: 'Everyone outside to fresh air, then 911 or the utility. Do not schedule around an active CO alarm.' },
    { id: 'wire', severe: true, label: 'Exposed or arcing wiring', advice: 'Keep everyone away from it. Shut the main breaker only if that is safe. Treat as an electrical emergency.' },
    { id: 'flood', severe: false, label: 'Active water leak or flooding', advice: 'Ask whether the main water shutoff is reachable and safe to close right now.' },
    { id: 'sewage', severe: false, label: 'Sewage backup', advice: 'Advise no contact, keep kids and pets away, and ventilate the area.' },
    { id: 'outage', severe: false, label: 'Total outage — no heat, cooling, water, or power', advice: 'Check for vulnerable occupants and extreme weather before treating this as routine.' }
  ];

  const CUES = [
    { id: 'safety', kind: 'emergency', weight: 35, label: 'Safety-risk language', re: /gas smell|smells? (like )?gas|gas leak|smoke|burning|sparking|sparks|carbon monoxide|co alarm|live wire|shocked|sewage|flood(ing)?/ },
    { id: 'outage', kind: 'urgent', weight: 14, label: 'Service outage', re: /no (heat|heating|cool(ing)?|ac|a\/c|power|water|hot water)|stopped (cool|heat|work)ing|won'?t (turn on|start|drain|flush)|completely (dead|down)/ },
    { id: 'vulnerable', kind: 'urgent', weight: 14, label: 'Vulnerable occupant', re: /elderly|senior|infant|baby|newborn|pregnant|medical|oxygen|disabled|wheelchair/ },
    { id: 'sameday', kind: 'urgent', weight: 10, label: 'Same-day pressure', re: /today|tonight|asap|right away|urgent|emergency|can'?t wait|rush/ },
    { id: 'business', kind: 'urgent', weight: 8, label: 'Business impact', re: /lunch rush|dinner service|customers waiting|can'?t open|had to close|losing (business|money)|health inspect/ },
    { id: 'estimate', kind: 'estimate', weight: 0, label: 'Estimate / quote request', re: /estimate|quote|price|pricing|bid|how much|replace(ment)?|new install|upgrade|second opinion/ },
    { id: 'callback', kind: 'callback', weight: 5, label: 'Repeat / callback signal', re: /called (before|last)|call back|callback|still (not|isn'?t|broken)|warranty|complaint|you (came|were) out/ }
  ];

  const CATEGORY_INFO = {
    Emergency: { route: 'Escalate to owner / on-call dispatcher now', queue: 'Interrupt a human immediately — phone or radio, never a ticket queue.' },
    'Same-day': { route: 'Same-day scheduler review', queue: 'Goes on the same-day board; a human confirms any rush fee and the slot.' },
    Scheduled: { route: 'Standard booking queue', queue: 'Book the next routine slot; confirm access notes before the visit.' },
    Estimate: { route: 'Estimator / sales queue', queue: 'Quote pipeline — never give a price on the phone.' },
    Callback: { route: 'Service manager callback review', queue: 'Pull the prior job history before anyone calls back.' }
  };

  const STEPS = [
    { id: 'caller', label: 'Caller' },
    { id: 'issue', label: 'Issue' },
    { id: 'safety', label: 'Safety' },
    { id: 'logistics', label: 'Logistics' },
    { id: 'review', label: 'Review & route' }
  ];
  const STEP_HINTS = [
    'Who is calling and where is the job?',
    'Type what the caller says — urgency cues light up as you type.',
    'Walk the hazard checklist out loud with the caller.',
    'Capture access, timing, and repeat-visit context.',
    'Confirm the no-promises boundary, then log the call.'
  ];

  const DEMO_DRAFT = {
    caller: 'Maria — Lakeside Bistro', phone: '555-0142',
    site: '214 Lakeshore Ave — kitchen / back entrance', serviceType: 'HVAC',
    callerSays: 'Kitchen AC stopped cooling during lunch rush. Staff hears the unit start and stop. No smoke, but the kitchen is too hot and we have dinner service tonight.',
    hazards: ['outage'], hazardsConfirmedNone: false, vulnerable: false, businessImpact: true,
    window: 'Manager on site until 5 PM', access: 'Back alley parking only; loading door — ask for the manager.',
    constraints: 'Any same-day fee needs the owner to approve it before we confirm an appointment.',
    repeat: 'no', wantsEstimate: false, photosRequested: true, noPromises: true,
    categoryOverride: '', notes: 'Regular customer. Two rooftop units — only unit 2 is affected.'
  };
  const DEMO_LOG = [
    {
      caller: 'Dev Patel', phone: '555-0177', site: '48 Alder Ct — basement', serviceType: 'Plumbing',
      callerSays: 'Strong gas smell in the basement near the water heater, hissing sound. Everyone already stepped outside.',
      hazards: ['gas'], window: 'Family waiting outside', access: 'Side door unlocked',
      repeat: 'no', noPromises: true, notes: 'Told caller to stay outside and call the gas utility first.'
    },
    {
      caller: 'Ruth Okafor', phone: '555-0129', site: '901 Birch Ln', serviceType: 'Plumbing',
      callerSays: 'Water heater is 15 years old and rumbling. Wants a quote to replace it with a tankless unit sometime next month.',
      hazards: [], hazardsConfirmedNone: true, window: 'Home most weekday mornings',
      access: 'Gate code with owner, friendly dog', constraints: 'Comparing two other bids',
      repeat: 'no', wantsEstimate: true, photosRequested: true, noPromises: true, notes: ''
    }
  ];

  /* ---------------- state ---------------- */
  function defaultDraft() {
    return {
      caller: '', phone: '', site: '', serviceType: 'HVAC', callerSays: '',
      hazards: [], hazardsConfirmedNone: false, vulnerable: false, businessImpact: false,
      window: '', access: '', constraints: '', repeat: 'no',
      wantsEstimate: false, photosRequested: false, noPromises: false,
      categoryOverride: '', notes: ''
    };
  }
  function defaultState() {
    return { version: 1, theme: null, seenGuide: false, step: 0, draft: defaultDraft(), log: [] };
  }
  function normalizeDraft(raw) {
    const d = defaultDraft();
    if (!raw || typeof raw !== 'object') return d;
    for (const k of ['caller', 'phone', 'site', 'callerSays', 'window', 'access', 'constraints', 'notes']) {
      if (typeof raw[k] === 'string') d[k] = raw[k].slice(0, 800);
    }
    d.serviceType = SERVICE_TYPES.includes(raw.serviceType) ? raw.serviceType : d.serviceType;
    d.hazards = Array.isArray(raw.hazards) ? raw.hazards.filter((id) => HAZARDS.some((h) => h.id === id)) : [];
    for (const k of ['hazardsConfirmedNone', 'vulnerable', 'businessImpact', 'wantsEstimate', 'photosRequested', 'noPromises']) d[k] = !!raw[k];
    d.repeat = ['no', 'callback', 'warranty'].includes(raw.repeat) ? raw.repeat : 'no';
    d.categoryOverride = CATEGORIES.includes(raw.categoryOverride) ? raw.categoryOverride : '';
    return d;
  }
  function normalizeEntry(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const at = typeof raw.at === 'string' && !Number.isNaN(new Date(raw.at).getTime()) ? raw.at : new Date().toISOString();
    return { ...normalizeDraft(raw), id: typeof raw.id === 'string' && raw.id ? raw.id : uid(), at };
  }
  function normalize(raw) {
    const s = defaultState();
    if (!raw || typeof raw !== 'object') return s;
    s.theme = raw.theme === 'light' ? 'light' : raw.theme === 'dark' ? 'dark' : null;
    s.seenGuide = !!raw.seenGuide;
    s.step = clamp(Math.round(Number(raw.step)) || 0, 0, STEPS.length - 1);
    s.draft = normalizeDraft(raw.draft);
    s.log = Array.isArray(raw.log) ? raw.log.map(normalizeEntry).filter(Boolean).slice(0, 500) : [];
    return s;
  }
  function load() {
    try { return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')); }
    catch { return defaultState(); }
  }
  function saveNow() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage blocked or full */ }
  }
  const save = debounce(saveNow, 250);

  let state = load();
  let toastTimer = 0;
  let printEntry = null; // log entry being printed; null = print the current draft

  /* ---------------- domain logic (pure) ---------------- */
  function stripNegations(text) {
    // "no smoke", "not flooding", "no signs of burning" should not trip safety cues.
    return text.replace(/\b(?:no|not|without|denies|denied|nothing|no signs? of)\s+(?:visible\s+|any\s+)?(?:smoke|smoking|burning|sparks?|sparking|gas smell|gas leak|gas|flood(?:ing)?|leak(?:s|ing)?|carbon monoxide|co alarm)\b/g, ' ');
  }
  function detectCues(d) {
    const text = stripNegations(`${d.callerSays} ${d.constraints} ${d.window}`.toLowerCase());
    const found = [];
    for (const c of CUES) {
      const m = text.match(c.re);
      if (m) found.push({ id: c.id, kind: c.kind, weight: c.weight, label: c.label, match: m[0] });
    }
    return found;
  }
  function assess(d) {
    const cues = detectCues(d);
    const reasons = [];
    let score = 5;
    const hazards = d.hazards.map((id) => HAZARDS.find((h) => h.id === id)).filter(Boolean);
    for (const h of hazards) {
      const pts = h.severe ? 40 : 18;
      score += pts;
      reasons.push(`Hazard confirmed: ${h.label} (+${pts}${h.severe ? ', severe' : ''})`);
    }
    for (const c of cues) {
      if (c.weight) { score += c.weight; reasons.push(`Caller language “${c.match}” — ${c.label} (+${c.weight})`); }
    }
    if (d.vulnerable) { score += 14; reasons.push('Vulnerable occupant on site (+14)'); }
    if (d.businessImpact) { score += 10; reasons.push('Business cannot operate normally (+10)'); }
    if (d.repeat === 'warranty') { score += 8; reasons.push('Warranty / complaint about prior work (+8)'); }
    else if (d.repeat === 'callback') { score += 5; reasons.push('Repeat visit for the same issue (+5)'); }

    const severe = hazards.some((h) => h.severe);
    score = clamp(Math.round(score), 0, 100);
    if (severe) score = Math.max(score, 90);

    const safetyCue = cues.some((c) => c.kind === 'emergency');
    let autoCategory, why;
    if (severe) { autoCategory = 'Emergency'; why = 'a severe hazard was confirmed on the safety checklist'; }
    else if (safetyCue) { autoCategory = 'Emergency'; why = 'the caller description contains safety-risk language'; }
    else if (score >= 85) { autoCategory = 'Emergency'; why = `urgency score ${score} is in the emergency band`; }
    else if (score >= 50) { autoCategory = 'Same-day'; why = `urgency score ${score} calls for a same-day look`; }
    else if (d.repeat !== 'no' || cues.some((c) => c.kind === 'callback')) { autoCategory = 'Callback'; why = 'repeat-visit or warranty signals with no urgency'; }
    else if (d.wantsEstimate || cues.some((c) => c.kind === 'estimate')) { autoCategory = 'Estimate'; why = 'an estimate/quote request with no urgency signals'; }
    else { autoCategory = 'Scheduled'; why = 'no urgency, repeat, or estimate signals'; }

    const overridden = !!d.categoryOverride && d.categoryOverride !== autoCategory;
    const category = d.categoryOverride || autoCategory;
    reasons.push(`Suggested category: ${autoCategory} — ${why}.`);
    if (overridden) reasons.push(`Call-taker override to ${category} — human judgment wins; the suggestion stays on record.`);

    const band = score >= 80 ? 'Critical' : score >= 50 ? 'High' : score >= 25 ? 'Moderate' : 'Low';
    const info = CATEGORY_INFO[category];
    return { score, band, category, autoCategory, overridden, route: info.route, queue: info.queue, reasons, cues, questions: nextQuestions(category, d, hazards) };
  }
  function nextQuestions(category, d, hazards) {
    const qs = [];
    if (category === 'Emergency') {
      qs.push('Safety first: if there is fire, a gas smell, or a medical risk, tell the caller to call 911 or the utility before anything else.');
      for (const h of hazards) qs.push(`${h.label} — ${h.advice}`);
    }
    qs.push('Confirm the caller name, callback number, and exact site address or unit.');
    qs.push('Ask what changed, when it started, and what they have already tried.');
    if (category === 'Same-day') qs.push('Confirm who is on site and until when. Any same-day or rush fee needs human approval before booking.');
    if (category === 'Estimate') qs.push('Ask whether this is a repair, replacement, new install, or second opinion — and who makes the decision.');
    if (category === 'Callback') qs.push('Get the prior job or invoice number and pull the history before anyone calls back.');
    if (!d.access.trim()) qs.push('Capture access details: gate codes, parking, pets, roof or attic access, on-site contact.');
    if (!d.photosRequested) qs.push('Ask for photos or the model/serial plate if easy — do not diagnose from the desk.');
    qs.push('Close with: “A dispatcher will confirm price, ETA, and availability — I am not promising those now.”');
    return qs;
  }
  const draftEntry = () => ({ ...state.draft, at: new Date().toISOString() });

  /* ---------------- artifacts: markdown / csv / print ---------------- */
  function markdown(entryLike) {
    const d = entryLike;
    const a = assess(d);
    const hazardNames = d.hazards.map((id) => HAZARDS.find((h) => h.id === id)?.label).filter(Boolean);
    const lines = [
      `# Service triage card — ${d.caller || 'Unnamed caller'}`,
      '',
      `- Generated: ${new Date(d.at || Date.now()).toLocaleString()}`,
      '- Status: draft for human review — no price, ETA, availability, or outcome was promised.',
      '',
      '## Caller',
      `- Caller / business: ${d.caller || '(missing)'}`,
      `- Callback number: ${d.phone || '(missing)'}`,
      `- Site: ${d.site || '(missing)'}`,
      `- Service type: ${d.serviceType}`,
      `- Repeat visit: ${REPEAT_LABELS[d.repeat] || REPEAT_LABELS.no}`,
      '',
      '## Situation',
      d.callerSays ? `> ${d.callerSays.replace(/\n/g, '\n> ')}` : '_No description captured._',
      '',
      `- Hazards: ${hazardNames.length ? hazardNames.join('; ') : d.hazardsConfirmedNone ? 'asked — caller confirms none' : 'not yet checked'}`,
      `- Vulnerable occupant: ${d.vulnerable ? 'yes' : 'no'}`,
      `- Business impact: ${d.businessImpact ? 'yes' : 'no'}`,
      `- On-site window: ${d.window || '—'}`,
      `- Access: ${d.access || '—'}`,
      `- Constraints: ${d.constraints || '—'}`,
      '',
      '## Assessment',
      `- Urgency: ${a.band} (${a.score}/100)`,
      `- Category: ${a.category}${a.overridden ? ` (call-taker override; auto suggested ${a.autoCategory})` : ''}`,
      `- Route: ${a.route}`,
      `- Queue note: ${a.queue}`,
      '',
      '### Why this routing',
      ...a.reasons.map((r) => `- ${r}`),
      '',
      '## Next questions',
      ...a.questions.map((q, i) => `${i + 1}. ${q}`)
    ];
    if (d.notes) lines.push('', '## Call-taker notes', d.notes);
    lines.push('', '---', 'Draft only. This app never contacts customers, books jobs, or updates any external system.');
    return lines.join('\n');
  }
  function logCsv() {
    const head = ['logged_at', 'caller', 'phone', 'site', 'service_type', 'urgency_band', 'urgency_score', 'category', 'route', 'hazards', 'caller_says'];
    const rows = state.log.map((e) => {
      const a = assess(e);
      const hz = e.hazards.map((id) => HAZARDS.find((h) => h.id === id)?.label).filter(Boolean).join(' | ');
      return [e.at, e.caller, e.phone, e.site, e.serviceType, a.band, a.score, a.category, a.route, hz, e.callerSays];
    });
    return [head, ...rows].map((r) => r.map((c) => `"${String(c ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  }
  function renderPrintCard(entryLike) {
    const d = entryLike;
    const a = assess(d);
    const hazardNames = d.hazards.map((id) => HAZARDS.find((h) => h.id === id)?.label).filter(Boolean);
    $('printCard').innerHTML = `
      <div class="pc-head">
        <h1>Service triage card</h1>
        <p>Generated ${esc(new Date(d.at || Date.now()).toLocaleString())} · Draft for human review — no promises made.</p>
      </div>
      <table class="pc-table">
        <tr><th>Caller / business</th><td>${esc(d.caller || '(missing)')}</td><th>Callback</th><td>${esc(d.phone || '(missing)')}</td></tr>
        <tr><th>Site</th><td>${esc(d.site || '(missing)')}</td><th>Service type</th><td>${esc(d.serviceType)}</td></tr>
        <tr><th>On-site window</th><td>${esc(d.window || '—')}</td><th>Repeat visit</th><td>${esc(REPEAT_LABELS[d.repeat] || REPEAT_LABELS.no)}</td></tr>
      </table>
      <div class="pc-assess">
        <p><strong>Urgency:</strong> ${esc(a.band)} (${a.score}/100) &nbsp;·&nbsp; <strong>Category:</strong> ${esc(a.category)}${a.overridden ? ` (override; auto: ${esc(a.autoCategory)})` : ''}</p>
        <p><strong>Route:</strong> ${esc(a.route)} — ${esc(a.queue)}</p>
      </div>
      <h2>Caller says</h2>
      <p>${esc(d.callerSays || 'No description captured.')}</p>
      <h2>Hazards &amp; flags</h2>
      <p>${esc(hazardNames.length ? hazardNames.join('; ') : d.hazardsConfirmedNone ? 'Asked — caller confirms none' : 'Not yet checked')}${d.vulnerable ? ' · Vulnerable occupant on site' : ''}${d.businessImpact ? ' · Business impact' : ''}</p>
      ${d.access || d.constraints ? `<h2>Access &amp; constraints</h2><p>${esc([d.access, d.constraints].filter(Boolean).join(' · '))}</p>` : ''}
      <h2>Why this routing</h2>
      <ul>${a.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
      <h2>Next questions</h2>
      <ol>${a.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>
      ${d.notes ? `<h2>Call-taker notes</h2><p>${esc(d.notes)}</p>` : ''}
      <p class="pc-foot">No price, ETA, availability, or outcome was promised on this call. A human dispatcher confirms all of that.</p>`;
  }

  /* ---------------- wizard step templates ---------------- */
  const check = (v) => (v ? 'checked' : '');
  function tplCaller(d) {
    return `<div class="form-grid">
      <label class="field">Caller / business <span class="req">required</span>
        <input id="f-caller" data-field="caller" maxlength="90" value="${esc(d.caller)}" placeholder="Maria — Lakeside Bistro" autocomplete="off">
      </label>
      <label class="field">Callback number
        <input id="f-phone" data-field="phone" maxlength="30" value="${esc(d.phone)}" placeholder="555-0142" autocomplete="off">
      </label>
      <label class="field span-2">Site / location <span class="req">required</span>
        <input id="f-site" data-field="site" maxlength="120" value="${esc(d.site)}" placeholder="214 Lakeshore Ave — kitchen / back entrance" autocomplete="off">
      </label>
      <label class="field">Service type
        <select id="f-serviceType" data-field="serviceType">
          ${SERVICE_TYPES.map((t) => `<option ${d.serviceType === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </label>
    </div>`;
  }
  function tplIssue(d) {
    return `<label class="field">What does the caller say? <span class="req">required</span>
      <textarea id="f-callerSays" data-field="callerSays" rows="5" maxlength="700" placeholder="In the caller's own words: what is broken, since when, what they tried…">${esc(d.callerSays)}</textarea>
    </label>
    <div class="cue-box">
      <p class="cue-title">Detected urgency cues <span class="cue-hint">— negated phrases like “no smoke” are ignored</span></p>
      <div id="cueChips" class="chips"></div>
    </div>
    <div class="toggle-row">
      <label class="check"><input type="checkbox" data-field="vulnerable" ${check(d.vulnerable)}><span>Vulnerable occupant on site (elderly, infant, medical needs)</span></label>
      <label class="check"><input type="checkbox" data-field="businessImpact" ${check(d.businessImpact)}><span>Business cannot operate normally</span></label>
    </div>`;
  }
  function tplSafety(d) {
    return `<p class="step-lede">Walk this list out loud. A severe hazard shows a caller-safety script and routes the call as an emergency.</p>
    <div id="hazardList" class="hazard-list" role="group" aria-label="Hazard checklist">
      ${HAZARDS.map((h) => `<label class="check hazard"><input type="checkbox" data-hazard="${h.id}" ${check(d.hazards.includes(h.id))}><span>${esc(h.label)}${h.severe ? ' <em class="sev">severe</em>' : ''}</span></label>`).join('')}
    </div>
    <label class="check none-check"><input id="f-noneCheck" type="checkbox" data-field="hazardsConfirmedNone" ${check(d.hazardsConfirmedNone)}><span>Asked — caller confirms none of these</span></label>
    <div id="hazardAdvice" class="advice-list" aria-live="polite"></div>
    <div id="fastTrackWrap" class="fast-track" hidden>
      <p><strong>Severe hazard confirmed.</strong> You have enough to route this call now.</p>
      <button type="button" class="btn btn-primary" data-action="fastTrack">Fast-track to review →</button>
    </div>`;
  }
  function tplLogistics(d) {
    return `<div class="form-grid">
      <label class="field">On-site contact &amp; time window
        <input id="f-window" data-field="window" maxlength="120" value="${esc(d.window)}" placeholder="Manager on site until 5 PM" autocomplete="off">
      </label>
      <label class="field">Repeat visit?
        <select id="f-repeat" data-field="repeat">
          <option value="no" ${d.repeat === 'no' ? 'selected' : ''}>No — first call about this</option>
          <option value="callback" ${d.repeat === 'callback' ? 'selected' : ''}>Callback — we've been out for this before</option>
          <option value="warranty" ${d.repeat === 'warranty' ? 'selected' : ''}>Warranty / complaint about our work</option>
        </select>
      </label>
      <label class="field span-2">Access notes
        <textarea id="f-access" data-field="access" rows="2" maxlength="300" placeholder="Gate code, parking, pets, roof or attic access…">${esc(d.access)}</textarea>
      </label>
      <label class="field span-2">Constraints / approvals
        <textarea id="f-constraints" data-field="constraints" rows="2" maxlength="300" placeholder="Fee approvals, timing limits, who makes the decision…">${esc(d.constraints)}</textarea>
      </label>
    </div>
    <div class="toggle-row">
      <label class="check"><input type="checkbox" data-field="wantsEstimate" ${check(d.wantsEstimate)}><span>Caller wants an estimate / quote</span></label>
      <label class="check"><input type="checkbox" data-field="photosRequested" ${check(d.photosRequested)}><span>Photos / model &amp; serial requested for follow-up</span></label>
    </div>`;
  }
  function tplReview(d) {
    const chips = ['Auto', ...CATEGORIES].map((c) => `<button type="button" class="chip chip-btn" data-cat="${c}" aria-pressed="false">${c}</button>`).join('');
    return `<div id="reviewRouteLine" class="review-route"></div>
    <div class="field">
      <p class="field-label">Category — keep the auto suggestion or override it</p>
      <div id="reviewChips" class="chips chip-row">${chips}</div>
    </div>
    <label class="field">Call-taker notes
      <textarea id="f-notes" data-field="notes" rows="3" maxlength="400" placeholder="Anything the dispatcher should know…">${esc(d.notes)}</textarea>
    </label>
    <label class="check boundary-check" id="noPromisesWrap">
      <input type="checkbox" data-field="noPromises" ${check(d.noPromises)}>
      <span><strong>No promises made.</strong> The caller was not promised a price, ETA, availability, or outcome — a human dispatcher confirms all of that.</span>
    </label>`;
  }
  const STEP_TEMPLATES = { caller: tplCaller, issue: tplIssue, safety: tplSafety, logistics: tplLogistics, review: tplReview };

  /* ---------------- render ---------------- */
  function applyTheme() {
    const t = state.theme || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.dataset.theme = t;
    $('themeBtn').textContent = t === 'light' ? '☾ Dark' : '☀ Light';
    $('themeBtn').setAttribute('aria-pressed', String(t === 'light'));
  }
  function renderStepTabs() {
    $('stepTabs').innerHTML = STEPS.map((s, i) => {
      const done = i < state.step && validateStep(i).length === 0;
      const current = i === state.step;
      return `<li><button type="button" class="step-tab${current ? ' current' : ''}${done ? ' done' : ''}" data-step="${i}" ${current ? 'aria-current="step"' : ''}>
        <span class="step-num" aria-hidden="true">${done ? '✓' : i + 1}</span>${esc(s.label)}</button></li>`;
    }).join('');
  }
  function renderStepBody() {
    $('stepBody').innerHTML = STEP_TEMPLATES[STEPS[state.step].id](state.draft);
    const hint = $('stepHint');
    hint.textContent = STEP_HINTS[state.step];
    hint.classList.remove('warn');
    $('backBtn').disabled = state.step === 0;
    $('nextBtn').textContent = state.step === STEPS.length - 1 ? 'Log this call' : 'Next step →';
  }
  function renderStats(a) {
    $('statUrgency').textContent = a.band;
    $('statScore').textContent = String(a.score);
    $('statLogged').textContent = String(state.log.length);
    $('statCritical').textContent = String(state.log.filter((e) => isToday(e.at) && assess(e).band === 'Critical').length);
  }
  function renderSummary(a) {
    const band = a.band.toLowerCase();
    const sumBand = $('sumBand');
    sumBand.textContent = a.band;
    sumBand.className = `badge band-${band}`;
    $('sumScore').textContent = `${a.score}/100`;
    const bar = $('sumBar');
    bar.style.width = `${a.score}%`;
    bar.className = `meter-fill fill-${band}`;
    $('sumCategory').textContent = a.category + (a.overridden ? ' (override)' : '');
    $('sumRoute').textContent = a.route;
    $('sumQueue').textContent = a.queue;
    $('reasonList').innerHTML = a.reasons.map((r) => `<li>${esc(r)}</li>`).join('');
    $('questionList').innerHTML = a.questions.map((q) => `<li>${esc(q)}</li>`).join('');
  }
  function updateCueChips(a) {
    const el = $('cueChips');
    if (!el) return;
    el.innerHTML = a.cues.length
      ? a.cues.map((c) => `<span class="chip kind-${c.kind}">${esc(c.label)} · “${esc(c.match)}”</span>`).join('')
      : '<span class="chip chip-empty">No urgency cues detected yet</span>';
  }
  function updateHazardWidgets() {
    const advice = $('hazardAdvice');
    if (!advice) return;
    const active = state.draft.hazards.map((id) => HAZARDS.find((h) => h.id === id)).filter(Boolean);
    advice.innerHTML = active.map((h) => `<div class="advice${h.severe ? ' severe' : ''}"><strong>${esc(h.label)}.</strong> ${esc(h.advice)}</div>`).join('');
    const ft = $('fastTrackWrap');
    if (ft) ft.hidden = !active.some((h) => h.severe);
  }
  function updateReviewWidgets(a) {
    const line = $('reviewRouteLine');
    if (!line) return;
    line.innerHTML = `<span class="badge band-${a.band.toLowerCase()}">${a.band} · ${a.score}/100</span>
      <span class="review-cat"><strong>${esc(a.category)}</strong> → ${esc(a.route)}</span>
      <span class="review-auto">${a.overridden ? `Override — auto suggested ${esc(a.autoCategory)}` : 'Auto-suggested from cues and answers'}</span>`;
    const chips = $('reviewChips');
    if (!chips) return;
    for (const b of chips.querySelectorAll('button')) {
      const active = (b.dataset.cat === 'Auto' && !state.draft.categoryOverride) || b.dataset.cat === state.draft.categoryOverride;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    }
  }
  function renderLog() {
    const list = $('logList');
    $('logCount').textContent = state.log.length ? `· ${state.log.length} call${state.log.length === 1 ? '' : 's'}` : '';
    if (!state.log.length) {
      list.innerHTML = `<div class="empty-state">
        <p><strong>No calls logged yet.</strong></p>
        <p>Finish the wizard and press “Log this call”, or load the demo to see triaged calls.</p>
        <button type="button" class="btn" data-action="empty-demo">Load demo</button>
      </div>`;
      return;
    }
    list.innerHTML = state.log.map((e) => {
      const a = assess(e);
      return `<article class="log-row" data-id="${esc(e.id)}">
        <span class="badge band-${a.band.toLowerCase()}">${a.band}</span>
        <div class="log-body">
          <strong>${esc(e.caller || 'Unnamed caller')}</strong>
          <p class="log-sub">${esc(a.category)} → ${esc(a.route)} · ${esc(e.serviceType)}${e.site ? ' · ' + esc(e.site) : ''}</p>
        </div>
        <div class="log-actions">
          <span class="log-time">${esc(fmtDateTime(e.at))}</span>
          <button type="button" class="btn btn-ghost" data-action="print">Print card</button>
          <button type="button" class="btn btn-ghost" data-action="copy">Copy</button>
          <button type="button" class="btn btn-danger" data-action="delete">Delete</button>
        </div>
      </article>`;
    }).join('');
  }
  function renderDerived() {
    const a = assess(state.draft);
    renderStats(a);
    renderSummary(a);
    $('exportPreview').value = markdown(draftEntry());
    if (!printEntry) renderPrintCard(draftEntry());
    updateCueChips(a);
    updateHazardWidgets();
    updateReviewWidgets(a);
  }
  function renderWizard() {
    renderStepTabs();
    renderStepBody();
    renderDerived();
  }
  function renderAll() {
    applyTheme();
    renderStepTabs();
    renderStepBody();
    renderLog();
    renderDerived();
  }

  /* ---------------- wizard navigation & validation ---------------- */
  function validateStep(i) {
    const d = state.draft;
    const bad = [];
    if (i === 0) { if (!d.caller.trim()) bad.push('f-caller'); if (!d.site.trim()) bad.push('f-site'); }
    if (i === 1 && !d.callerSays.trim()) bad.push('f-callerSays');
    if (i === 2 && !d.hazards.length && !d.hazardsConfirmedNone) bad.push('hazardList');
    if (i === 4 && !d.noPromises) bad.push('noPromisesWrap');
    return bad;
  }
  function markInvalid(ids, message) {
    for (const id of ids) { const el = $(id); if (el) el.classList.add('invalid'); }
    const hint = $('stepHint');
    hint.textContent = message;
    hint.classList.add('warn');
    const first = $(ids[0]);
    if (first) (first.matches('input,textarea,select') ? first : first.querySelector('input,textarea,select') || first).focus();
  }
  function focusStepStart() {
    const el = $('stepBody').querySelector('input, textarea, select, button');
    if (el) el.focus();
  }
  function goToStep(target) {
    target = clamp(target, 0, STEPS.length - 1);
    if (target === state.step) return;
    if (target > state.step) {
      for (let i = state.step; i < target; i++) {
        const bad = validateStep(i);
        if (bad.length) {
          if (i !== state.step) { state.step = i; renderWizard(); }
          markInvalid(bad, `Complete “${STEPS[i].label}” before jumping ahead.`);
          save();
          return;
        }
      }
    }
    state.step = target;
    renderWizard(); save();
  }
  function nextStep() {
    if (state.step >= STEPS.length - 1) { logCall(); return; }
    const bad = validateStep(state.step);
    if (bad.length) { markInvalid(bad, 'Fill the required fields to continue.'); return; }
    state.step += 1;
    renderWizard(); save();
    focusStepStart();
  }
  function prevStep() {
    if (state.step === 0) return;
    state.step -= 1;
    renderWizard(); save();
    focusStepStart();
  }
  function logCall() {
    for (const i of [0, 1, 2, 4]) {
      const bad = validateStep(i);
      if (bad.length) {
        if (i !== state.step) { state.step = i; renderWizard(); }
        markInvalid(bad, i === 4 ? 'Confirm the no-promises boundary before logging.' : `“${STEPS[i].label}” still needs required answers.`);
        return;
      }
    }
    state.log.unshift({ ...state.draft, hazards: [...state.draft.hazards], id: uid(), at: new Date().toISOString() });
    state.draft = defaultDraft();
    state.step = 0;
    renderAll(); saveNow();
    toast('Call logged — draft handoff saved in this browser');
  }

  /* ---------------- toast / copy / download ---------------- */
  function hideToast() { $('toast').classList.remove('show'); }
  function toast(msg, opts = {}) {
    const el = $('toast');
    el.innerHTML = `<span>${esc(msg)}</span>${opts.action ? `<button type="button" id="toastAction" class="toast-btn">${esc(opts.action)}</button>` : ''}`;
    if (opts.action) $('toastAction').addEventListener('click', () => { hideToast(); if (opts.onAction) opts.onAction(); });
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, opts.action ? 7000 : 2400);
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch { toast('Copy failed — select the preview box instead'); }
    ta.remove();
  }
  function copyText(text, okMsg) {
    const done = () => toast(okMsg || 'Copied to clipboard');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------------- demo / reset ---------------- */
  function loadDemo() {
    state.draft = { ...defaultDraft(), ...DEMO_DRAFT, hazards: [...DEMO_DRAFT.hazards] };
    state.step = STEPS.length - 1;
    if (!state.log.length) {
      const now = Date.now();
      state.log = [
        { ...defaultDraft(), ...DEMO_LOG[0], id: uid(), at: new Date(now - 2 * 3600e3).toISOString() },
        { ...defaultDraft(), ...DEMO_LOG[1], id: uid(), at: new Date(now - 26 * 3600e3).toISOString() }
      ];
    }
    renderAll(); saveNow();
    toast('Demo call loaded — review the routing, then log it');
  }
  function resetAll() {
    if (!window.confirm('Clear the current draft AND the entire call log? Download a JSON backup first if you need one.')) return;
    state = { ...defaultState(), theme: state.theme, seenGuide: state.seenGuide };
    renderAll(); saveNow();
    toast('Reset — blank triage ready');
  }

  /* ---------------- events ---------------- */
  function onFieldInput(e) {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    t.classList.remove('invalid');
    const wrap = t.closest('.invalid');
    if (wrap) wrap.classList.remove('invalid');
    const d = state.draft;
    if (t.dataset.hazard) {
      const id = t.dataset.hazard;
      if (t.checked) {
        if (!d.hazards.includes(id)) d.hazards.push(id);
        d.hazardsConfirmedNone = false;
        const none = $('f-noneCheck');
        if (none) none.checked = false;
      } else {
        d.hazards = d.hazards.filter((x) => x !== id);
      }
    } else if (t.dataset.field) {
      const f = t.dataset.field;
      if (t.type === 'checkbox') {
        d[f] = t.checked;
        if (f === 'hazardsConfirmedNone' && t.checked) {
          d.hazards = [];
          for (const cb of $('stepBody').querySelectorAll('input[data-hazard]')) cb.checked = false;
        }
      } else {
        d[f] = t.value;
      }
    } else {
      return;
    }
    renderDerived();
    save();
  }
  function onStepBodyClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.action === 'fastTrack') {
      state.step = STEPS.length - 1;
      renderWizard(); save();
      focusStepStart();
    } else if (btn.dataset.cat) {
      state.draft.categoryOverride = btn.dataset.cat === 'Auto' ? '' : btn.dataset.cat;
      renderDerived();
      save();
    }
  }
  function onLogClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'empty-demo') { loadDemo(); return; }
    const row = btn.closest('[data-id]');
    const idx = state.log.findIndex((x) => x.id === (row && row.dataset.id));
    if (idx < 0) return;
    const entry = state.log[idx];
    if (btn.dataset.action === 'copy') {
      copyText(markdown(entry), 'Triage card markdown copied');
    } else if (btn.dataset.action === 'print') {
      printEntry = entry;
      renderPrintCard(entry);
      window.print();
    } else if (btn.dataset.action === 'delete') {
      state.log.splice(idx, 1);
      renderLog(); renderDerived(); save();
      toast('Call deleted', {
        action: 'Undo',
        onAction() {
          state.log.splice(Math.min(idx, state.log.length), 0, entry);
          renderLog(); renderDerived(); save();
          toast('Call restored');
        }
      });
    }
  }
  function openHelp() { $('helpModal').showModal(); }

  function wireEvents() {
    const stepBody = $('stepBody');
    stepBody.addEventListener('input', onFieldInput);
    stepBody.addEventListener('change', onFieldInput);
    stepBody.addEventListener('click', onStepBodyClick);
    $('stepTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-step]');
      if (btn) goToStep(Number(btn.dataset.step));
    });
    $('nextBtn').addEventListener('click', nextStep);
    $('backBtn').addEventListener('click', prevStep);
    $('logList').addEventListener('click', onLogClick);

    $('themeBtn').addEventListener('click', () => {
      state.theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      applyTheme(); saveNow();
      toast(`${state.theme === 'light' ? 'Light' : 'Dark'} theme saved`);
    });
    $('demoBtn').addEventListener('click', loadDemo);
    $('resetBtn').addEventListener('click', resetAll);
    $('helpBtn').addEventListener('click', openHelp);
    $('helpCloseBtn').addEventListener('click', () => $('helpModal').close());
    $('helpModal').addEventListener('click', (e) => { if (e.target === $('helpModal')) $('helpModal').close(); });

    $('copyMdBtn').addEventListener('click', () => copyText(markdown(draftEntry()), 'Triage card markdown copied'));
    $('printBtn').addEventListener('click', () => { printEntry = null; renderPrintCard(draftEntry()); window.print(); });
    $('downloadJsonBtn').addEventListener('click', () => {
      download('service-triage-flow-backup.json', JSON.stringify({ ...state, exportedAt: new Date().toISOString(), safety: 'draft-only local export' }, null, 2), 'application/json');
      toast('JSON backup downloaded');
    });
    $('downloadCsvBtn').addEventListener('click', () => {
      if (!state.log.length) { toast('No logged calls yet — the CSV covers the call log'); return; }
      download('service-triage-call-log.csv', logCsv(), 'text/csv');
      toast('Call log CSV downloaded');
    });
    $('importBtn').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          state = normalize(JSON.parse(String(reader.result)));
          renderAll(); saveNow();
          toast('Backup imported');
        } catch { toast('Import failed — not a valid JSON backup'); }
      };
      reader.readAsText(file);
    });

    window.addEventListener('afterprint', () => { printEntry = null; renderPrintCard(draftEntry()); });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        copyText(markdown(draftEntry()), 'Triage card markdown copied');
        return;
      }
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || '');
      if (e.key === '?' && !typing && !$('helpModal').open) { e.preventDefault(); openHelp(); return; }
      if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); nextStep(); }
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); prevStep(); }
    });
  }

  /* ---------------- init ---------------- */
  wireEvents();
  renderAll();
  if (!state.seenGuide) {
    state.seenGuide = true;
    saveNow();
    setTimeout(openHelp, 350);
  }
})();
