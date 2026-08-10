/* Pilot Forge — The Drafting Room. Vanilla JS, local-first, no external calls. */
(() => {
  'use strict';

  // ---------------------------------------------------------------- constants

  const LS_KEY = 'fable-remake:day-01-pilot-forge:v1';
  const WEEKS_PER_MONTH = 4.33;

  const BUSINESSES = [
    'HVAC', 'Plumbing', 'Electrical', 'Roofing', 'Landscaping', 'Cleaning',
    'Auto repair', 'Dental clinic', 'Med spa', 'Law firm', 'Other local service'
  ];

  const WEDGES = {
    'missed-call': {
      title: 'Missed-call rescue',
      artifact: 'Daily missed-call & recovery report',
      source: 'phone system / after-hours voicemail log',
      draft: 'callback text or voicemail-return script',
      speed: 15,
      speedWhy: 'Missed calls are counted in days, not months — fast, undeniable proof.'
    },
    'web-lead': {
      title: 'Web-lead follow-up',
      artifact: 'Lead response-time log',
      source: 'website forms and chat inbox',
      draft: 'first-response email or text',
      speed: 14,
      speedWhy: 'Form fills carry timestamps, so response time is instantly measurable.'
    },
    'quote-chase': {
      title: 'Quote follow-up',
      artifact: 'Open-quote follow-up board',
      source: 'sent quotes / estimates list',
      draft: 'quote nudge message',
      speed: 13,
      speedWhy: 'Open quotes already exist — every follow-up has visible dollar value.'
    },
    'review-recovery': {
      title: 'Review request lane',
      artifact: 'Review request tracker',
      source: 'completed jobs list',
      draft: 'review request message',
      speed: 10,
      speedWhy: 'Reviews land over weeks, so the cash proof builds more slowly.'
    },
    'owner-report': {
      title: 'Daily owner report',
      artifact: 'One-page daily owner report',
      source: 'job board, calls, and invoices',
      draft: 'daily report email',
      speed: 8,
      speedWhy: 'Reports prove visibility, not recovered dollars — a weaker cash story.'
    }
  };

  // Short engraving labels for the blueprint schematic (SVG text has no wrap).
  const SCHEMATIC = {
    'missed-call': { intake: 'PHONE LINES', out: 'RECOVERY LOG' },
    'web-lead': { intake: 'WEB FORMS', out: 'RESPONSE LOG' },
    'quote-chase': { intake: 'OPEN QUOTES', out: 'FOLLOW-UP BOARD' },
    'review-recovery': { intake: 'FINISHED JOBS', out: 'REVIEW TRACKER' },
    'owner-report': { intake: 'JOBS & CALLS', out: 'DAILY REPORT' }
  };

  const AUTOMATION = [
    { name: 'Manual capture', desc: 'A human does everything; the pilot only organizes and counts.', risk: 'Low', pts: 12 },
    { name: 'Draft-only', desc: 'AI drafts every message; a human reviews and sends each one.', risk: 'Low', pts: 15 },
    { name: 'Reviewed auto', desc: 'AI acts, but only after per-item owner approval.', risk: 'Medium', pts: 11 },
    { name: 'Full auto', desc: 'AI acts without review — needs proof, logs, and rollback first.', risk: 'High', pts: 4 }
  ];

  const STATUSES = [
    { id: 'todo', title: 'Queued' },
    { id: 'doing', title: 'On the bench' },
    { id: 'done', title: 'Signed off' }
  ];

  // One consistent stroke style for every glyph. No emoji as UI.
  const svgIcon = (paths) =>
    `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const ICONS = {
    left: svgIcon('<path d="M10 3 L5 8 L10 13"/>'),
    right: svgIcon('<path d="M6 3 L11 8 L6 13"/>'),
    x: svgIcon('<path d="M4 4 L12 12 M12 4 L4 12"/>'),
    clip: '<svg viewBox="0 0 36 14" width="34" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><rect x="1" y="5" width="34" height="8" rx="2.5"/><path d="M13 5 V3 a5 5 0 0 1 10 0 v2"/><circle cx="18" cy="9" r="1.4"/></svg>'
  };

  // ---------------------------------------------------------------- utilities

  const $ = (id) => document.getElementById(id);

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const clamp = (value, min, max) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  };

  const usd = (value) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0
  }).format(Number.isFinite(value) ? value : 0);

  const debounce = (fn, ms) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  };

  const hasAny = (text, words) => words.some((w) => text.includes(w));

  // ---------------------------------------------------------------- state

  function defaultState() {
    return {
      version: 1,
      theme: null,               // retained for v1 JSON compatibility; the room has one light now
      seenGuide: false,
      businessType: 'HVAC',
      businessName: '',
      wedge: 'missed-call',
      pain: '',
      proof: '',
      automation: 1,
      roi: { missedLeads: 10, closeRate: 30, jobValue: 600, recoveryRate: 40 },
      milestones: [],
      planEdited: false,
      planSig: '',
      tasks: []
    };
  }

  function normalize(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== 'object') return base;
    const s = { ...base };

    s.theme = raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : null;
    s.seenGuide = Boolean(raw.seenGuide);
    s.businessType = BUSINESSES.includes(raw.businessType) ? raw.businessType : base.businessType;
    s.businessName = typeof raw.businessName === 'string' ? raw.businessName.slice(0, 60) : '';
    s.wedge = Object.prototype.hasOwnProperty.call(WEDGES, raw.wedge) ? raw.wedge : base.wedge;
    s.pain = typeof raw.pain === 'string' ? raw.pain.slice(0, 200) : '';
    s.proof = typeof raw.proof === 'string' ? raw.proof.slice(0, 260) : '';
    s.automation = clamp(Math.round(Number(raw.automation ?? raw.automationLevel ?? 1)), 0, 3);

    const roi = raw.roi && typeof raw.roi === 'object' ? raw.roi : raw; // accept legacy flat shape
    s.roi = {
      missedLeads: clamp(roi.missedLeads, 0, 999),
      closeRate: clamp(roi.closeRate, 0, 100),
      jobValue: clamp(roi.jobValue, 0, 1000000),
      recoveryRate: clamp(roi.recoveryRate, 0, 100)
    };

    s.milestones = Array.isArray(raw.milestones)
      ? raw.milestones
        .filter((m) => m && typeof m === 'object' && typeof m.title === 'string')
        .slice(0, 40)
        .map((m) => ({
          id: typeof m.id === 'string' ? m.id : uid(),
          day: clamp(Math.round(Number(m.day)), 1, 60),
          title: m.title.slice(0, 160),
          done: Boolean(m.done)
        }))
      : [];
    s.planEdited = Boolean(raw.planEdited);
    s.planSig = typeof raw.planSig === 'string' ? raw.planSig : '';

    s.tasks = Array.isArray(raw.tasks)
      ? raw.tasks
        .filter((t) => t && typeof t === 'object' && typeof t.text === 'string' && t.text.trim())
        .slice(0, 200)
        .map((t) => ({
          id: typeof t.id === 'string' ? t.id : uid(),
          text: t.text.slice(0, 120),
          status: STATUSES.some((c) => c.id === t.status) ? t.status : 'todo'
        }))
      : [];

    return s;
  }

  function loadState() {
    try {
      return normalize(JSON.parse(localStorage.getItem(LS_KEY)));
    } catch {
      return defaultState();
    }
  }

  const persist = debounce(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
  }, 150);

  let state = loadState();

  function demoState() {
    const s = defaultState();
    s.theme = state.theme;
    s.seenGuide = true;
    s.businessType = 'HVAC';
    s.businessName = 'Rivera Heating & Air';
    s.wedge = 'missed-call';
    s.pain = 'After-hours calls go to voicemail and 10-14 a week never get a callback before a competitor answers.';
    s.proof = 'A daily one-page report: missed calls captured, callbacks drafted, response time, jobs booked, and an approval log for every message.';
    s.automation = 1;
    s.roi = { missedLeads: 12, closeRate: 30, jobValue: 750, recoveryRate: 40 };
    s.tasks = [
      { id: uid(), text: 'Confirm voicemail access with the office manager', status: 'todo' },
      { id: uid(), text: 'Write the pilot offer: fee, 14-day window, exit terms', status: 'todo' },
      { id: uid(), text: 'Build a fake missed-call sample set (10 calls)', status: 'doing' },
      { id: uid(), text: 'Draft the daily report mock in a shared doc', status: 'doing' },
      { id: uid(), text: 'Map the current call flow with the owner', status: 'done' }
    ];
    return s;
  }

  // ---------------------------------------------------------------- domain

  function computeRoi(s) {
    const { missedLeads, closeRate, jobValue, recoveryRate } = s.roi;
    const monthlyLeak = missedLeads * (closeRate / 100) * jobValue * WEEKS_PER_MONTH;
    const recoverable = monthlyLeak * (recoveryRate / 100);
    const fee = recoverable > 0
      ? clamp(Math.round((recoverable * 0.15) / 50) * 50, 250, 2500)
      : 0;
    const payback = fee > 0 ? recoverable / fee : 0;
    return { monthlyLeak, annualLeak: monthlyLeak * 12, recoverable, fee, payback };
  }

  function computeFactors(s, roi) {
    const factors = [];
    const pain = s.pain.trim().toLowerCase();
    const proof = s.proof.trim().toLowerCase();
    const wedge = WEDGES[s.wedge];
    const auto = AUTOMATION[s.automation];

    // 1. Revenue upside (max 25)
    const revPts = clamp(Math.round((roi.recoverable / 8000) * 25), 0, 25);
    factors.push({
      label: 'Revenue upside', pts: revPts, max: 25,
      why: roi.recoverable > 0
        ? `${usd(roi.recoverable)}/mo recoverable out of a ${usd(roi.monthlyLeak)}/mo leak.`
        : 'No recoverable revenue yet — the leak numbers are empty.',
      tip: revPts < 13 ? 'Under ~$4k/mo recoverable, the fee gets hard to justify. Recheck missed-lead volume and job value with the owner.' : ''
    });

    // 2. Pain clarity (max 15)
    let painPts = 0;
    if (pain.length >= 20) painPts += 6;
    if (pain.length >= 60) painPts += 3;
    if (/\d/.test(pain)) painPts += 3;
    if (hasAny(pain, ['every', 'daily', 'week', 'month', 'call', 'lead', 'quote', 'hour', 'miss', 'after'])) painPts += 3;
    painPts = Math.min(15, painPts);
    factors.push({
      label: 'Pain clarity', pts: painPts, max: 15,
      why: !pain ? 'No pain statement yet — no pain, no pilot.'
        : painPts >= 12 ? 'Specific, frequent, and quantified — an owner will recognize this instantly.'
          : 'The pain statement exists but reads vague.',
      tip: painPts < 10 ? 'Write one concrete sentence with a number and a frequency, e.g. "10-14 after-hours calls a week never get a callback."' : ''
    });

    // 3. Proof definition (max 15)
    let proofPts = 0;
    if (proof.length >= 25) proofPts += 7;
    if (proof.length >= 80) proofPts += 3;
    if (hasAny(proof, ['report', 'log', 'count', 'book', 'response', 'daily', 'track', 'time', 'before', 'after'])) proofPts += 5;
    proofPts = Math.min(15, proofPts);
    factors.push({
      label: 'Proof definition', pts: proofPts, max: 15,
      why: !proof ? 'No proof artifact defined — the owner has nothing to look at.'
        : proofPts >= 12 ? 'A countable artifact the owner sees on a schedule. Exactly right.'
          : 'A proof idea exists but is not yet countable or scheduled.',
      tip: proofPts < 10 ? 'Name a concrete artifact (report, log, tracker) with numbers the owner can check daily.' : ''
    });

    // 4. Speed to proof (max 15)
    factors.push({
      label: 'Speed to proof', pts: wedge.speed, max: 15,
      why: wedge.speedWhy,
      tip: wedge.speed < 12 ? 'Slower-proof wedges work, but pair them with a hard metric or pick a faster wedge for the first pilot.' : ''
    });

    // 5. Risk posture (max 15)
    factors.push({
      label: 'Risk posture', pts: auto.pts, max: 15,
      why: `${auto.name}: ${auto.desc}`,
      tip: auto.pts < 11 ? 'Full auto before proof scares owners off. Sell draft-only first; earn automation with the pilot results.' : ''
    });

    // 6. Fee payback (max 15)
    const paybackPts = clamp(Math.round(roi.payback * 1.8), 0, 15);
    factors.push({
      label: 'Fee payback', pts: paybackPts, max: 15,
      why: roi.fee > 0
        ? `~${roi.payback.toFixed(1)}x monthly payback on a ${usd(roi.fee)}/mo suggested fee.`
        : 'No fee suggested yet — enter the leak numbers first.',
      tip: paybackPts < 9 ? 'Owners say yes fast at 5x+ monthly payback. Raise recoverable value or drop the fee.' : ''
    });

    return factors;
  }

  const scoreOf = (factors) => clamp(factors.reduce((sum, f) => sum + f.pts, 0), 0, 100);

  function verdictOf(score) {
    if (score >= 80) return { title: 'Strong pilot fit', text: 'Clear leak, fast proof, safe posture. Pitch it this week.' };
    if (score >= 60) return { title: 'Good pilot fit', text: 'Solid wedge. Tighten the weakest line below before selling it.' };
    if (score >= 40) return { title: 'Workable — tighten it', text: 'The bones are there. Fix the low-scoring lines before pitching.' };
    return { title: 'Not ready to pitch', text: 'Sharpen the pain, proof, and numbers — right now this reads as a guess.' };
  }

  const proofWindowOf = (score) => (score >= 80 ? 7 : score >= 60 ? 14 : 21);

  function generatePlan(wedgeKey, windowDays) {
    const w = WEDGES[wedgeKey];
    const at = (fraction) => clamp(Math.round(windowDays * fraction), 1, windowDays);
    return [
      { day: 1, title: `Map the intake source (${w.source}) and name the human approver` },
      { day: Math.min(2, windowDays), title: `Build a sample ${w.artifact.toLowerCase()} from fake/test data` },
      { day: at(0.3), title: 'Run the workflow by hand — log every lead, draft, and decision' },
      { day: at(0.5), title: `Owner reviews the first real ${w.draft} — approval gate goes live` },
      { day: at(0.75), title: 'Compare captured value against the baseline; tighten numbers and wording' },
      { day: windowDays, title: 'Present the recovered-value report and ask for the go/no-go decision' }
    ].map((m) => ({ id: uid(), day: m.day, title: m.title, done: false }));
  }

  function derive() {
    const roi = computeRoi(state);
    const factors = computeFactors(state, roi);
    const score = scoreOf(factors);
    const verdict = verdictOf(score);
    const windowDays = proofWindowOf(score);
    const auto = AUTOMATION[state.automation];
    return { roi, factors, score, verdict, windowDays, risk: auto.risk, auto, wedge: WEDGES[state.wedge] };
  }

  const businessLabel = () => {
    const name = state.businessName.trim();
    return name ? `${name} (${state.businessType})` : state.businessType;
  };

  const briefTitle = () => `${WEDGES[state.wedge].title} pilot — ${state.businessName.trim() || state.businessType}`;

  // ---------------------------------------------------------------- brief builders

  function buildBriefMarkdown(d) {
    const { roi, factors, score, verdict, windowDays, wedge, auto } = d;
    const ms = [...state.milestones].sort((a, b) => a.day - b.day);
    const lines = [
      `# ${briefTitle()}`,
      '',
      `_Draft for human review — drafted locally by Pilot Forge on ${new Date().toLocaleDateString()}. Nothing in this brief contacts customers or runs live._`,
      '',
      '## Snapshot',
      `- Business: ${businessLabel()}`,
      `- Wedge: ${wedge.title}`,
      `- Pilot-fit score: ${score}/100 (${verdict.title})`,
      `- Proof window: ${windowDays} days`,
      `- Risk level: ${d.risk} (${auto.name})`,
      `- First artifact: ${wedge.artifact}`,
      '',
      '## The leak',
      state.pain.trim() || '_Not written yet._',
      '',
      '## Proof the owner will see',
      state.proof.trim() || `_Default:_ ${wedge.artifact}.`,
      '',
      '## Revenue case',
      `- Missed leads: ${state.roi.missedLeads}/week at a ${state.roi.closeRate}% close rate and ${usd(state.roi.jobValue)} average job`,
      `- Monthly leak: ${usd(roi.monthlyLeak)} (${usd(roi.annualLeak)}/year)`,
      `- Recoverable at ${state.roi.recoveryRate}% recovery: ${usd(roi.recoverable)}/month`,
      `- Suggested pilot fee: ${roi.fee > 0 ? `${usd(roi.fee)}/month (~${roi.payback.toFixed(1)}x monthly payback for the owner)` : 'not set — enter leak numbers'}`,
      '',
      `## Why this scores ${score}/100`,
      ...factors.map((f) => `- ${f.label}: ${f.pts}/${f.max} — ${f.why}${f.tip ? ` Improve: ${f.tip}` : ''}`),
      '',
      `## Proof plan (${windowDays}-day window)`,
      ...(ms.length
        ? ms.map((m) => `- [${m.done ? 'x' : ' '}] Day ${m.day} — ${m.title}`)
        : ['_No milestones yet._']),
      '',
      '## Work orders',
      ...STATUSES.flatMap((col) => {
        const tasks = state.tasks.filter((t) => t.status === col.id);
        return [`### ${col.title}`, ...(tasks.length ? tasks.map((t) => `- [${col.id === 'done' ? 'x' : ' '}] ${t.text}`) : ['- _(empty)_']), ''];
      }),
      '## Boundaries & approval gate',
      '- All customer-facing messages stay draft-only until a human approves each one.',
      '- The pilot runs on fake/test data before touching live intake.',
      '- No secrets, credentials, or customer data leave the owner\'s systems.',
      `- Automation level: ${auto.name} — ${auto.desc}`
    ];
    return lines.join('\n');
  }

  function buildPrintHtml(d) {
    const { roi, factors, score, verdict, windowDays, wedge, auto } = d;
    const ms = [...state.milestones].sort((a, b) => a.day - b.day);
    const row = (k, v) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`;
    return `
      <div class="print-titleblock">
        <div><span>Project</span><strong>${esc(briefTitle())}</strong></div>
        <div><span>Client</span><strong>${esc(businessLabel())}</strong></div>
        <div><span>Drawn</span><strong>${esc(new Date().toLocaleDateString())}</strong></div>
        <div><span>Fit</span><strong>${score}/100</strong></div>
        <div><span>Sheet</span><strong>01 of 01 &middot; REV A</strong></div>
      </div>
      <h1>${esc(briefTitle())}</h1>
      <p class="meta">Draft for human review — drafted locally by Pilot Forge (The Drafting Room). Nothing here contacts customers or runs live.</p>
      <h2>Snapshot</h2>
      <table>
        ${row('Business', businessLabel())}
        ${row('Wedge', wedge.title)}
        ${row('Pilot-fit score', `${score}/100 — ${verdict.title}`)}
        ${row('Proof window', `${windowDays} days`)}
        ${row('Risk level', `${d.risk} (${auto.name})`)}
        ${row('First artifact', wedge.artifact)}
      </table>
      <h2>The leak</h2><p>${esc(state.pain.trim() || 'Not written yet.')}</p>
      <h2>Proof the owner will see</h2><p>${esc(state.proof.trim() || wedge.artifact)}</p>
      <h2>Revenue case</h2>
      <table>
        ${row('Inputs', `${state.roi.missedLeads} missed leads/week · ${state.roi.closeRate}% close · ${usd(state.roi.jobValue)} avg job · ${state.roi.recoveryRate}% recovery`)}
        ${row('Monthly leak', `${usd(roi.monthlyLeak)} (${usd(roi.annualLeak)}/year)`)}
        ${row('Recoverable / month', usd(roi.recoverable))}
        ${row('Suggested fee', roi.fee > 0 ? `${usd(roi.fee)}/month (~${roi.payback.toFixed(1)}x payback)` : 'Not set')}
      </table>
      <h2>Why this scores ${score}/100</h2>
      <ul>${factors.map((f) => `<li><strong>${esc(f.label)}</strong> — ${f.pts}/${f.max}: ${esc(f.why)}</li>`).join('')}</ul>
      <h2>Proof plan (${windowDays}-day window)</h2>
      <ol>${ms.map((m) => `<li>${m.done ? '&#9745;' : '&#9744;'} Day ${m.day} — ${esc(m.title)}</li>`).join('') || '<li>No milestones yet.</li>'}</ol>
      <h2>Work orders</h2>
      <ul>${STATUSES.map((col) => `<li><strong>${esc(col.title)}:</strong> ${state.tasks.filter((t) => t.status === col.id).map((t) => esc(t.text)).join('; ') || '(empty)'}</li>`).join('')}</ul>
      <p class="boundary"><strong>Boundaries:</strong> draft-only customer messages, fake/test data first, no secrets or customer data leave the owner's systems, human approval on every step. Automation level: ${esc(auto.name)}.</p>
    `;
  }

  // ---------------------------------------------------------------- rendering

  function syncInput(id, value) {
    const el = $(id);
    if (el && document.activeElement !== el) el.value = value;
  }

  function renderForm() {
    syncInput('businessType', state.businessType);
    syncInput('businessName', state.businessName);
    syncInput('wedge', state.wedge);
    syncInput('pain', state.pain);
    syncInput('proof', state.proof);
    syncInput('automationLevel', state.automation);
    syncInput('missedLeads', state.roi.missedLeads);
    syncInput('closeRate', state.roi.closeRate);
    syncInput('jobValue', state.roi.jobValue);
    syncInput('recoveryRate', state.roi.recoveryRate);

    const auto = AUTOMATION[state.automation];
    $('automationName').textContent = auto.name;
    $('automationDesc').textContent = auto.desc;
    const riskChip = $('automationRisk');
    riskChip.textContent = `${auto.risk} risk`;
    riskChip.className = `chip risk-${auto.risk.toLowerCase()}`;

    const painEmpty = !state.pain.trim();
    $('painField').classList.toggle('warn', painEmpty);
    $('painHint').textContent = painEmpty
      ? 'Needed for a sellable brief — include a number and a frequency.'
      : `${state.pain.trim().length}/200 characters`;

    const proofEmpty = !state.proof.trim();
    $('proofField').classList.toggle('warn', proofEmpty);
    $('proofHint').textContent = proofEmpty
      ? 'Name the artifact the owner checks — a report, log, or tracker.'
      : `${state.proof.trim().length}/260 characters`;
  }

  function renderHero(d) {
    const sch = SCHEMATIC[state.wedge];
    $('heroSource').textContent = sch.intake;
    $('heroWedge').textContent = d.wedge.title.toUpperCase();
    $('heroGate').textContent = d.auto.name.toUpperCase();
    $('heroArtifact').textContent = sch.out;
    $('heroWindowDim').textContent = `PROOF WINDOW · ${d.windowDays} DAYS`;

    $('tbProject').textContent = briefTitle();
    $('tbClient').textContent = businessLabel();
    $('tbDate').textContent = new Date().toLocaleDateString();
    $('statScore').textContent = `${d.score}/100`;
    $('statLeak').textContent = usd(d.roi.monthlyLeak);
    $('statRecover').textContent = usd(d.roi.recoverable);
    $('statFee').textContent = d.roi.fee > 0 ? usd(d.roi.fee) : '—';
  }

  function renderScore(d) {
    // Needle sweep: 0 → -90deg, 100 → +90deg.
    $('gaugeNeedle').style.transform = `rotate(${d.score * 1.8 - 90}deg)`;
    $('scoreGauge').setAttribute('aria-label', `Pilot fit score ${d.score} out of 100 — ${d.verdict.title}`);
    $('scoreValue').textContent = d.score;
    $('scoreVerdict').textContent = d.verdict.title;
    $('scoreSummary').textContent = d.verdict.text;
    $('proofWindowText').textContent = `${d.windowDays} days`;
    $('riskText').textContent = d.risk;
    $('artifactText').textContent = d.wedge.artifact;

    $('factorList').innerHTML = d.factors.map((f) => {
      const weak = f.pts / f.max < 0.6;
      return `<li class="factor${weak ? ' low' : ''}">
        <div class="factor-top"><strong>${esc(f.label)}</strong><span class="factor-pts">${f.pts}/${f.max}</span></div>
        <div class="factor-bar"><i style="width:${Math.round((f.pts / f.max) * 100)}%"></i></div>
        <p class="factor-why">${esc(f.why)}</p>
        ${f.tip ? `<p class="factor-tip">Fix: ${esc(f.tip)}</p>` : ''}
      </li>`;
    }).join('');
  }

  function renderRoi(d) {
    $('roiPill').textContent = `${usd(d.roi.recoverable)}/MO RECOVERABLE`;
    $('monthlyLeak').textContent = usd(d.roi.monthlyLeak);
    $('annualLeak').textContent = usd(d.roi.annualLeak);
    $('recoverableOut').textContent = usd(d.roi.recoverable);
    $('pilotFeeOut').textContent = d.roi.fee > 0 ? usd(d.roi.fee) : '—';
    $('paybackOut').textContent = d.roi.payback > 0 ? `~${d.roi.payback.toFixed(1)}x / mo` : '—';
  }

  function renderPlan(d) {
    // Auto-sync the drafted schedule until the user redraws it by hand.
    const sig = `${state.wedge}:${d.windowDays}`;
    if (!state.planEdited && state.planSig !== sig) {
      state.milestones = generatePlan(state.wedge, d.windowDays);
      state.planSig = sig;
    }

    const ms = [...state.milestones].sort((a, b) => a.day - b.day);
    const doneCount = ms.filter((m) => m.done).length;
    $('planMeta').textContent = ms.length
      ? `${d.windowDays}-day proof window · ${doneCount}/${ms.length} milestones inspected${state.planEdited ? ' · redrawn by hand' : ' · drafted from your wedge'}`
      : `${d.windowDays}-day proof window`;

    $('planList').innerHTML = ms.length
      ? ms.map((m) => `<li class="ms-row${m.done ? ' done' : ''}" data-id="${esc(m.id)}">
          <input type="checkbox" data-f="done" ${m.done ? 'checked' : ''} aria-label="Mark milestone inspected" />
          <span class="ms-day">DAY <input type="number" data-f="day" min="1" max="60" value="${m.day}" aria-label="Milestone day" /></span>
          <input class="ms-title" type="text" data-f="title" maxlength="160" value="${esc(m.title)}" aria-label="Milestone description" />
          <button class="icon-x" type="button" data-act="del" aria-label="Strike this milestone">${ICONS.x}</button>
        </li>`).join('')
      : `<li class="plan-empty"><span>No schedule on the sheet yet.</span><button class="btn" type="button" id="planEmptyRegen">Draft the schedule</button></li>`;
  }

  function renderBoard() {
    const total = state.tasks.length;
    $('boardCount').textContent = `${total} card${total === 1 ? '' : 's'} on the boards`;
    $('kanban').innerHTML = STATUSES.map((col, colIdx) => {
      const tasks = state.tasks.filter((t) => t.status === col.id);
      const cards = tasks.map((t, i) => `
        <article class="task-card" draggable="true" data-id="${esc(t.id)}">
          <span class="wo-num" aria-hidden="true">WO-${String(colIdx + 1)}${String(i + 1).padStart(2, '0')}</span>
          <p>${esc(t.text)}</p>
          <div class="task-actions">
            <button type="button" data-act="left" ${colIdx === 0 ? 'disabled' : ''} aria-label="Move to ${esc(STATUSES[Math.max(0, colIdx - 1)].title)}">${ICONS.left}</button>
            <button type="button" data-act="right" ${colIdx === STATUSES.length - 1 ? 'disabled' : ''} aria-label="Move to ${esc(STATUSES[Math.min(STATUSES.length - 1, colIdx + 1)].title)}">${ICONS.right}</button>
            <button type="button" data-act="del" aria-label="Strike this card">${ICONS.x}</button>
          </div>
        </article>`).join('');
      const empty = `<div class="col-empty">${total === 0 && col.id === 'todo'
        ? 'No work orders yet — cut the first card above.'
        : 'Drop a card on this clipboard.'}</div>`;
      return `<section class="clipboard" aria-label="${esc(col.title)} clipboard">
        <span class="clip" aria-hidden="true">${ICONS.clip}</span>
        <header><h3>${esc(col.title)}</h3><span class="col-count">${tasks.length}</span></header>
        <div class="col-body" data-status="${col.id}">${cards || empty}</div>
      </section>`;
    }).join('');
  }

  function renderExport(d) {
    $('briefPreview').value = buildBriefMarkdown(d);
    $('printSheet').innerHTML = buildPrintHtml(d);

    const approved = d.score >= 60;
    const stamp = $('issueStamp');
    stamp.classList.toggle('approved', approved);
    stamp.innerHTML = approved
      ? '<strong>APPROVED</strong><span>FOR PROOF</span><small>HUMAN GATE ON EVERY SEND</small>'
      : '<strong>HOLD</strong><span>TIGHTEN THE SPEC</span><small>NEEDLE MUST CLEAR 60</small>';
  }

  function renderAll() {
    renderForm();
    const d = derive();
    renderHero(d);
    renderScore(d);
    renderRoi(d);
    renderPlan(d);
    renderBoard();
    renderExport(d);
    persist();
  }

  // ---------------------------------------------------------------- toast & undo

  function toast(message, opts = {}) {
    const region = $('toastRegion');
    const el = document.createElement('div');
    el.className = 'toast';
    const label = document.createElement('span');
    label.textContent = message;
    el.appendChild(label);
    let timer;
    const dismiss = () => {
      clearTimeout(timer);
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 220);
    };
    if (opts.actionLabel && typeof opts.onAction === 'function') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = opts.actionLabel;
      btn.addEventListener('click', () => { opts.onAction(); dismiss(); });
      el.appendChild(btn);
    }
    region.appendChild(el);
    while (region.children.length > 3) region.firstElementChild.remove();
    timer = setTimeout(dismiss, opts.actionLabel ? 7000 : 3200);
  }

  function snapshotUndo() {
    const snap = JSON.stringify(state);
    return () => {
      state = normalize(JSON.parse(snap));
      renderAll();
    };
  }

  // ---------------------------------------------------------------- clipboard / files

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
      return ok;
    }
  }

  function downloadFile(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  async function copyBrief() {
    const ok = await copyText(buildBriefMarkdown(derive()));
    toast(ok ? 'Markdown brief copied — take it to the owner.' : 'Copy failed — select the brief text and copy it by hand.');
  }

  // ---------------------------------------------------------------- dialog

  let lastFocused = null;

  function openHelp() {
    const dlg = $('helpDialog');
    if (dlg.open) return;
    lastFocused = document.activeElement;
    dlg.showModal();
  }

  function closeHelp() {
    const dlg = $('helpDialog');
    if (dlg.open) dlg.close();
  }

  // ---------------------------------------------------------------- events

  function setField(key, value) {
    state[key] = value;
    renderAll();
  }

  function wireForm() {
    $('businessType').addEventListener('change', (e) => setField('businessType', e.target.value));
    $('businessName').addEventListener('input', (e) => setField('businessName', e.target.value.slice(0, 60)));
    $('wedge').addEventListener('change', (e) => setField('wedge', e.target.value));
    $('pain').addEventListener('input', (e) => setField('pain', e.target.value.slice(0, 200)));
    $('proof').addEventListener('input', (e) => setField('proof', e.target.value.slice(0, 260)));
    $('automationLevel').addEventListener('input', (e) => setField('automation', clamp(Math.round(e.target.value), 0, 3)));

    const roiFields = [
      ['missedLeads', 0, 999],
      ['closeRate', 0, 100],
      ['jobValue', 0, 1000000],
      ['recoveryRate', 0, 100]
    ];
    roiFields.forEach(([key, min, max]) => {
      $(key).addEventListener('input', (e) => {
        state.roi[key] = clamp(e.target.value, min, max);
        renderAll();
      });
      $(key).addEventListener('blur', (e) => { e.target.value = state.roi[key]; });
    });

    $('shapeForm').addEventListener('submit', (e) => e.preventDefault());
  }

  function wirePlan() {
    $('planList').addEventListener('change', (e) => {
      const row = e.target.closest('.ms-row');
      const field = e.target.dataset.f;
      if (!row || !field) return;
      const m = state.milestones.find((x) => x.id === row.dataset.id);
      if (!m) return;
      if (field === 'done') m.done = e.target.checked;
      if (field === 'day') m.day = clamp(Math.round(e.target.value), 1, 60);
      if (field === 'title') m.title = e.target.value.slice(0, 160);
      if (field !== 'done') state.planEdited = true;
      renderAll();
    });

    $('planList').addEventListener('click', (e) => {
      const regen = e.target.closest('#planEmptyRegen');
      if (regen) { regeneratePlan(); return; }
      const del = e.target.closest('[data-act="del"]');
      const row = e.target.closest('.ms-row');
      if (!del || !row) return;
      const undo = snapshotUndo();
      state.milestones = state.milestones.filter((m) => m.id !== row.dataset.id);
      state.planEdited = true;
      renderAll();
      toast('Milestone struck from the schedule.', { actionLabel: 'Undo', onAction: undo });
    });

    $('addMilestoneBtn').addEventListener('click', () => {
      const d = derive();
      state.milestones.push({ id: uid(), day: d.windowDays, title: 'New milestone — describe the check-in', done: false });
      state.planEdited = true;
      renderAll();
      const inputs = $('planList').querySelectorAll('input[data-f="title"]');
      if (inputs.length) {
        const last = inputs[inputs.length - 1];
        last.focus();
        last.select();
      }
    });

    $('regenPlanBtn').addEventListener('click', regeneratePlan);
  }

  function regeneratePlan() {
    const undo = snapshotUndo();
    const d = derive();
    state.milestones = generatePlan(state.wedge, d.windowDays);
    state.planEdited = false;
    state.planSig = `${state.wedge}:${d.windowDays}`;
    renderAll();
    toast('Schedule redrafted from the current wedge.', { actionLabel: 'Undo', onAction: undo });
  }

  function wireBoard() {
    $('taskAddForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $('taskInput');
      const text = input.value.trim().slice(0, 120);
      if (!text) {
        input.focus();
        return;
      }
      state.tasks.push({ id: uid(), text, status: 'todo' });
      input.value = '';
      renderAll();
      input.focus();
    });

    const kanban = $('kanban');
    const order = STATUSES.map((c) => c.id);

    kanban.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-act]');
      const card = e.target.closest('.task-card');
      if (!btn || !card || btn.disabled) return;
      const task = state.tasks.find((t) => t.id === card.dataset.id);
      if (!task) return;
      const act = btn.dataset.act;
      if (act === 'del') {
        const undo = snapshotUndo();
        state.tasks = state.tasks.filter((t) => t.id !== task.id);
        renderAll();
        toast('Card struck from the boards.', { actionLabel: 'Undo', onAction: undo });
        return;
      }
      const idx = order.indexOf(task.status);
      task.status = order[clamp(idx + (act === 'right' ? 1 : -1), 0, order.length - 1)];
      renderAll();
    });

    kanban.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.task-card');
      if (!card) return;
      e.dataTransfer.setData('text/plain', card.dataset.id);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    });
    kanban.addEventListener('dragend', () => {
      kanban.querySelectorAll('.dragging').forEach((el) => el.classList.remove('dragging'));
      kanban.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
    });
    kanban.addEventListener('dragover', (e) => {
      const body = e.target.closest('.col-body');
      if (!body) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      body.classList.add('drag-over');
    });
    kanban.addEventListener('dragleave', (e) => {
      const body = e.target.closest('.col-body');
      if (body && !body.contains(e.relatedTarget)) body.classList.remove('drag-over');
    });
    kanban.addEventListener('drop', (e) => {
      const body = e.target.closest('.col-body');
      if (!body) return;
      e.preventDefault();
      const task = state.tasks.find((t) => t.id === e.dataTransfer.getData('text/plain'));
      if (task && task.status !== body.dataset.status) {
        task.status = body.dataset.status;
        renderAll();
      } else {
        body.classList.remove('drag-over');
      }
    });
  }

  function wireExport() {
    $('copyMdBtn').addEventListener('click', copyBrief);

    $('downloadJsonBtn').addEventListener('click', () => {
      downloadFile('pilot-forge-state.json', JSON.stringify(state, null, 2), 'application/json');
      toast('JSON copy filed to your downloads.');
    });

    $('importBtn').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        const undo = snapshotUndo();
        state = normalize(parsed);
        state.seenGuide = true;
        renderAll();
        toast('Drawing loaded from the JSON copy.', { actionLabel: 'Undo', onAction: undo });
      } catch {
        toast('Load failed — that file is not a Pilot Forge drawing.');
      }
    });

    $('printBtn').addEventListener('click', () => window.print());
  }

  function wireChrome() {
    $('helpBtn').addEventListener('click', openHelp);
    $('helpCloseBtn').addEventListener('click', closeHelp);
    const dlg = $('helpDialog');
    dlg.addEventListener('click', (e) => { if (e.target === dlg) closeHelp(); });
    dlg.addEventListener('close', () => {
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    });

    $('loadDemoBtn').addEventListener('click', () => {
      const undo = snapshotUndo();
      state = demoState();
      renderAll();
      toast('Sample job pinned up — Rivera Heating & Air.', { actionLabel: 'Undo', onAction: undo });
    });

    $('resetBtn').addEventListener('click', () => {
      if (!window.confirm('Clear the sheet? This scraps the spec, schedule, and work orders in this browser.')) return;
      const theme = state.theme;
      state = defaultState();
      state.theme = theme;
      state.seenGuide = true;
      renderAll();
      toast('Sheet cleared — fresh vellum on the table.');
    });

    document.addEventListener('keydown', (e) => {
      const typing = /^(input|textarea|select)$/i.test(e.target.tagName) || e.target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        copyBrief();
        return;
      }
      if (e.key === '?' && !typing) {
        e.preventDefault();
        openHelp();
      }
      if (e.key === 'Escape') closeHelp();
    });
  }

  // ---------------------------------------------------------------- init

  function populateSelects() {
    $('businessType').innerHTML = BUSINESSES.map((b) => `<option value="${esc(b)}">${esc(b)}</option>`).join('');
    $('wedge').innerHTML = Object.entries(WEDGES).map(([key, w]) => `<option value="${esc(key)}">${esc(w.title)}</option>`).join('');
  }

  function init() {
    populateSelects();
    wireForm();
    wirePlan();
    wireBoard();
    wireExport();
    wireChrome();
    renderAll();
    // Orchestrated reveal: the sheet inks in and the gauge needle sweeps to its reading.
    requestAnimationFrame(() => document.body.classList.add('inked'));
    if (!state.seenGuide) {
      state.seenGuide = true;
      persist();
      openHelp();
    }
  }

  init();
})();
