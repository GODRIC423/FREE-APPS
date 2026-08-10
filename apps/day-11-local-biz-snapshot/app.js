/* Local Biz Snapshot — prospect dossier builder.
   Local-first, draft-only. No scraping, no outreach, no external calls. */
(() => {
  'use strict';

  /* ---------------- constants ---------------- */

  const STORAGE_KEY = 'fable-remake:day-11-local-biz-snapshot:v1';
  const LEGACY_KEY = 'local-biz-snapshot-v1';

  const STATUSES = [
    { id: 'researching', label: 'Researching' },
    { id: 'ready', label: 'Dossier ready' },
    { id: 'contacted', label: 'Contacted' },
    { id: 'parked', label: 'Parked' }
  ];

  const LEAKS = [
    {
      id: 'missedCalls', name: 'Missed & after-hours calls', icon: '☎', impact: 5,
      hint: 'Calls that ring out are the most expensive leak for a service business.',
      signals: [
        { id: 'noAfterHours', label: 'No after-hours answering — voicemail only or rings out' },
        { id: 'phoneOnlyCta', label: 'Phone is the main call-to-action with no text-back or callback option' },
        { id: 'ownerAnswers', label: 'Owner answers personally / mentions being slammed' }
      ]
    },
    {
      id: 'staleQuotes', name: 'Slow quote follow-up', icon: '⌛', impact: 4,
      hint: 'Quotes that sit for days quietly hand jobs to competitors.',
      signals: [
        { id: 'noPromise', label: 'No stated response time for quotes or estimates' },
        { id: 'reviewsMentionWait', label: 'Reviews mention waiting for callbacks or estimates' },
        { id: 'noSystem', label: 'Follow-up lives in someone’s head or inbox — no visible system' }
      ]
    },
    {
      id: 'formFriction', name: 'Contact form friction', icon: '⌨', impact: 3,
      hint: 'Every extra field costs a share of the people who almost reached out.',
      signals: [
        { id: 'manyFields', label: 'Form asks 6+ fields before a human ever responds' },
        { id: 'noConfirmation', label: 'No confirmation of what happens after submitting' },
        { id: 'hardToFind', label: 'Form is buried — more than two clicks from the homepage' }
      ]
    },
    {
      id: 'weakProof', name: 'Weak review & proof engine', icon: '★', impact: 3,
      hint: 'Thin or stale proof makes every other channel work harder.',
      signals: [
        { id: 'fewerReviews', label: 'Noticeably fewer reviews than nearby competitors' },
        { id: 'staleReviews', label: 'No new public reviews in the last 90 days' },
        { id: 'noReplies', label: 'Negative reviews sit unanswered' }
      ]
    },
    {
      id: 'bookingGap', name: 'Unclear booking path', icon: '▤', impact: 4,
      hint: 'If a stranger can’t book in under a minute, many won’t bother.',
      signals: [
        { id: 'noOnlineBooking', label: 'No online booking or scheduling link anywhere' },
        { id: 'unclearBasics', label: 'Hours, service area, or pricing basics are unclear' },
        { id: 'competingCtas', label: 'Multiple competing CTAs — call, form, chat, socials' }
      ]
    },
    {
      id: 'manualIntake', name: 'Manual intake & office memory', icon: '✎', impact: 3,
      hint: 'Paper and memory drop the details that win repeat work.',
      signals: [
        { id: 'onePerson', label: 'Intake depends on one person’s memory or notepad' },
        { id: 'noRecords', label: 'No CRM or shared record of past jobs and customers' },
        { id: 'repeatAsks', label: 'Customers report repeating details they already gave' }
      ]
    }
  ];

  const WEDGES = [
    { id: 'missedCallRecovery', name: 'Missed-call recovery check', leak: 'missedCalls', effort: 'Low',
      pitch: 'Track one week of missed and after-hours calls, then show the owner the recovered value before proposing anything bigger.' },
    { id: 'quoteCleanup', name: 'Quote follow-up cleanup', leak: 'staleQuotes', effort: 'Low',
      pitch: 'List every open quote, agree a simple follow-up rhythm, and revive the two oldest with a human touch.' },
    { id: 'formSimplify', name: 'Contact form simplification', leak: 'formFriction', effort: 'Low',
      pitch: 'Cut the form to three fields, add a response-time promise, and measure the change in completed enquiries.' },
    { id: 'reviewTuneUp', name: 'Review request tune-up', leak: 'weakProof', effort: 'Medium',
      pitch: 'Build a simple post-job review ask for happy customers and a reply routine for the reviews already sitting there.' },
    { id: 'bookingClarity', name: 'Booking path clarity pass', leak: 'bookingGap', effort: 'Medium',
      pitch: 'Make the one obvious next step unmissable: hours, service area, and a single clear way to book.' },
    { id: 'intakeChecklist', name: 'Intake checklist & owner daily report', leak: 'manualIntake', effort: 'Medium',
      pitch: 'Replace memory with a one-page intake checklist and a short daily summary the owner actually reads.' }
  ];

  const LIKELIHOOD = [
    { min: 3, pct: 90, band: 'Very likely', cls: 'very' },
    { min: 2, pct: 70, band: 'Likely', cls: 'likely' },
    { min: 1, pct: 40, band: 'Possible', cls: 'possible' },
    { min: 0, pct: 0, band: 'No evidence', cls: 'none' }
  ];

  const FIT_BANDS = [
    { min: 75, label: 'Hot wedge', cls: 'hot' },
    { min: 55, label: 'Worth a look', cls: 'warm' },
    { min: 0, label: 'Needs proof', cls: 'cold' }
  ];

  const GUARDRAIL = 'Internal snapshot only. Verify facts manually and get human approval before contacting the business or making claims.';

  /* ---------------- helpers ---------------- */

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const uid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const clampNum = (v, lo, hi, fb) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fb;
  };
  const str = (v, max) => typeof v === 'string' ? v.slice(0, max) : '';
  const statusLabel = (id) => (STATUSES.find((s) => s.id === id) || STATUSES[0]).label;

  /* ---------------- state ---------------- */

  let state;
  let saveTimer = null;
  let toastTimer = null;
  let undoBuffer = null;
  let helpOpener = null;

  function blankProspect() {
    return {
      id: uid(), createdAt: Date.now(), updatedAt: Date.now(),
      name: '', type: '', market: '', contact: '', status: 'researching',
      presence: '', trust: '', friction: '',
      revenueFit: 5, proofFit: 5, accessFit: 5,
      leaks: {}, wedgeId: 'auto', wedgeReason: '', nextStep: ''
    };
  }

  function normalizeProspect(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const p = blankProspect();
    p.id = typeof raw.id === 'string' && raw.id ? raw.id : p.id;
    p.createdAt = Number(raw.createdAt) || p.createdAt;
    p.updatedAt = Number(raw.updatedAt) || p.updatedAt;
    p.name = str(raw.name, 90);
    p.type = str(raw.type, 80);
    p.market = str(raw.market, 100);
    p.contact = str(raw.contact, 90);
    p.status = STATUSES.some((s) => s.id === raw.status) ? raw.status : 'researching';
    p.presence = str(raw.presence, 600);
    p.trust = str(raw.trust, 600);
    p.friction = str(raw.friction, 600);
    p.revenueFit = clampNum(raw.revenueFit, 1, 10, 5);
    p.proofFit = clampNum(raw.proofFit, 1, 10, 5);
    p.accessFit = clampNum(raw.accessFit, 1, 10, 5);
    p.wedgeId = raw.wedgeId === 'auto' || WEDGES.some((w) => w.id === raw.wedgeId) ? raw.wedgeId : 'auto';
    p.wedgeReason = str(raw.wedgeReason, 600);
    p.nextStep = str(raw.nextStep, 600);
    p.leaks = {};
    LEAKS.forEach((leak) => {
      const src = raw.leaks && typeof raw.leaks === 'object' ? raw.leaks[leak.id] : null;
      if (!src || typeof src !== 'object') return;
      const signals = {};
      leak.signals.forEach((sig) => {
        if (src.signals && src.signals[sig.id]) signals[sig.id] = true;
      });
      const note = str(src.note, 180);
      if (Object.keys(signals).length || note) p.leaks[leak.id] = { signals, note };
    });
    return p;
  }

  function normalize(raw) {
    const s = raw && typeof raw === 'object' ? raw : {};
    const out = {
      version: 1,
      theme: s.theme === 'light' || s.theme === 'dark' ? s.theme : null,
      seenGuide: !!s.seenGuide,
      view: s.view === 'compare' ? 'compare' : 'dossier',
      activeId: typeof s.activeId === 'string' ? s.activeId : null,
      prospects: Array.isArray(s.prospects) ? s.prospects.map(normalizeProspect).filter(Boolean) : []
    };
    if (!out.prospects.some((p) => p.id === out.activeId)) {
      out.activeId = out.prospects.length ? out.prospects[0].id : null;
    }
    return out;
  }

  function migrateLegacy() {
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      if (!raw) return null;
      const old = JSON.parse(raw);
      if (!old || typeof old !== 'object') return null;
      const map = { missedCalls: 'missedCalls', slowForms: 'formFriction', staleQuotes: 'staleQuotes', weakProof: 'weakProof', bookingGap: 'bookingGap', manualIntake: 'manualIntake' };
      const leaks = {};
      Object.entries(old.leaks || {}).forEach(([key, on]) => {
        const id = map[key];
        if (!id || !on) return;
        const leak = LEAKS.find((l) => l.id === id);
        leaks[id] = { signals: { [leak.signals[0].id]: true }, note: 'Imported from v1 snapshot — re-verify signals' };
      });
      const wedge = WEDGES.find((w) => w.name.toLowerCase() === String(old.wedgeType || '').toLowerCase());
      const p = normalizeProspect({
        ...blankProspect(),
        name: old.businessName, type: old.businessType, market: old.market,
        presence: old.publicSignal, trust: old.trustSignals, friction: old.frictionNotes,
        revenueFit: old.revenueFit, proofFit: old.proofFit, accessFit: old.accessFit,
        leaks, wedgeId: wedge ? wedge.id : 'auto',
        wedgeReason: old.wedgeReason, nextStep: old.nextStep
      });
      if (!p || (!p.name && !Object.keys(p.leaks).length)) return null;
      return normalize({ theme: old.theme, seenGuide: true, prospects: [p], activeId: p.id });
    } catch { return null; }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch { /* fall through */ }
    return migrateLegacy() || normalize(null);
  }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
    }, 250);
  }

  const activeProspect = () => state.prospects.find((p) => p.id === state.activeId) || null;

  function ensureLeak(p, leakId) {
    if (!p.leaks[leakId]) p.leaks[leakId] = { signals: {}, note: '' };
    return p.leaks[leakId];
  }

  /* ---------------- domain logic (pure) ---------------- */

  function signalCount(p, leak) {
    const entry = p.leaks[leak.id];
    if (!entry) return 0;
    return leak.signals.filter((s) => entry.signals && entry.signals[s.id]).length;
  }

  function leakAssessment(p, leak) {
    const count = signalCount(p, leak);
    const step = LIKELIHOOD.find((s) => count >= s.min);
    return {
      leak, count,
      pct: step.pct, band: step.band, cls: step.cls,
      score: (step.pct / 100) * leak.impact,
      reasons: leak.signals.filter((s) => p.leaks[leak.id]?.signals?.[s.id]).map((s) => s.label),
      note: p.leaks[leak.id]?.note || ''
    };
  }

  function leakPriority(p) {
    return LEAKS.map((leak) => leakAssessment(p, leak))
      .sort((a, b) => b.score - a.score || b.leak.impact - a.leak.impact);
  }

  function fitParts(p) {
    const sliderPart = Math.round(p.revenueFit * 2.4 + p.proofFit * 1.8 + p.accessFit * 1.8); // max 60
    const evidence = LEAKS.reduce((sum, leak) => sum + leakAssessment(p, leak).score, 0);
    const leakPart = Math.min(40, Math.round(evidence * 3)); // max 40
    const score = Math.max(0, Math.min(100, sliderPart + leakPart));
    return { sliderPart, leakPart, score };
  }

  const fitBand = (score) => FIT_BANDS.find((b) => score >= b.min);

  function recommendedWedge(p) {
    const top = leakPriority(p)[0];
    if (!top || top.pct === 0) return null;
    return { wedge: WEDGES.find((w) => w.leak === top.leak.id), evidence: top };
  }

  function chosenWedge(p) {
    if (p.wedgeId === 'auto') {
      const rec = recommendedWedge(p);
      return rec ? rec.wedge : null;
    }
    return WEDGES.find((w) => w.id === p.wedgeId) || null;
  }

  function recReasonText(rec) {
    return `Targets “${rec.evidence.leak.name}” — ${rec.evidence.band} (${rec.evidence.count} of ${rec.evidence.leak.signals.length} signals observed, impact ${rec.evidence.leak.impact}/5), your strongest evidence.`;
  }

  /* ---------------- exports (pure builders) ---------------- */

  function dossierMarkdown(p) {
    const parts = fitParts(p);
    const band = fitBand(parts.score);
    const prio = leakPriority(p);
    const withEvidence = prio.filter((x) => x.pct > 0);
    const without = prio.filter((x) => x.pct === 0);
    const rec = recommendedWedge(p);
    const chosen = chosenWedge(p);
    const lines = [
      `# Prospect dossier — ${p.name || 'Unnamed prospect'}`, '',
      `Generated: ${new Date().toLocaleString()}`,
      `Status: ${statusLabel(p.status)}`,
      'Draft for human review — manually researched, no scraping or automated outreach.', '',
      '## Profile',
      `- Business: ${p.name || '—'}`,
      `- Type: ${p.type || '—'}`,
      `- Market: ${p.market || '—'}`,
      `- Contact: ${p.contact || '—'}`,
      `- Public presence: ${p.presence || '—'}`,
      `- Trust signals: ${p.trust || '—'}`,
      `- Observed friction: ${p.friction || '—'}`, '',
      '## Lead-leak likelihoods'
    ];
    if (withEvidence.length) {
      withEvidence.forEach((x) => {
        lines.push(`### ${x.leak.name} — ${x.band} (${x.pct}%, impact ${x.leak.impact}/5)`);
        x.reasons.forEach((r) => lines.push(`- Signal: ${r}`));
        if (x.note) lines.push(`- Evidence note: ${x.note}`);
        lines.push('');
      });
    } else {
      lines.push('- No leak evidence recorded yet.', '');
    }
    if (without.length) lines.push(`No evidence yet: ${without.map((x) => x.leak.name).join(', ')}.`, '');
    lines.push(
      `## Fit score: ${parts.score}/100 — ${band.label}`,
      `- Revenue upside: ${p.revenueFit}/10`,
      `- Proof visibility: ${p.proofFit}/10`,
      `- Access ease: ${p.accessFit}/10`,
      `- Leak-evidence contribution: ${parts.leakPart}/40`, '',
      '## First wedge'
    );
    if (chosen) {
      lines.push(`- Wedge: ${chosen.name} (${chosen.effort} effort)${p.wedgeId === 'auto' ? ' — auto-recommended' : ' — manually chosen'}`);
      lines.push(`- Angle: ${chosen.pitch}`);
      if (p.wedgeId === 'auto' && rec) lines.push(`- Why: ${recReasonText(rec)}`);
      if (p.wedgeId !== 'auto' && rec && rec.wedge.id !== chosen.id) {
        lines.push(`- Note: evidence currently points to “${rec.wedge.name}” instead.`);
      }
    } else {
      lines.push('- No wedge yet — check leak signals to unlock a recommendation.');
    }
    lines.push(
      `- Why (your words): ${p.wedgeReason || '—'}`,
      `- Human next step: ${p.nextStep || '—'}`, '',
      '## Guardrail', GUARDRAIL
    );
    return lines.join('\n');
  }

  function compareRows() {
    return state.prospects
      .map((p) => {
        const parts = fitParts(p);
        const top = leakPriority(p)[0];
        const chosen = chosenWedge(p);
        return {
          p, score: parts.score, band: fitBand(parts.score),
          topLeak: top && top.pct > 0 ? `${top.leak.name} (${top.band})` : 'No evidence yet',
          likelyCount: leakPriority(p).filter((x) => x.pct >= 70).length,
          wedge: chosen ? chosen.name : '—'
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  function compareMarkdown() {
    const rows = compareRows();
    if (!rows.length) return '# Prospect comparison\n\nNo prospects yet.';
    const lines = [
      '# Prospect comparison', '',
      `Generated: ${new Date().toLocaleString()} — draft for human review.`, '',
      '| # | Prospect | Fit | Band | Top leak | Likely+ leaks | Wedge | Status |',
      '|---|----------|-----|------|----------|---------------|-------|--------|'
    ];
    rows.forEach((r, i) => {
      lines.push(`| ${i + 1} | ${r.p.name || 'Unnamed prospect'} | ${r.score}/100 | ${r.band.label} | ${r.topLeak} | ${r.likelyCount} | ${r.wedge} | ${statusLabel(r.p.status)} |`);
    });
    lines.push('', GUARDRAIL);
    return lines.join('\n');
  }

  function compareCsv() {
    const rows = [['rank', 'business', 'type', 'market', 'status', 'fit_score', 'fit_band', 'top_leak', 'likely_plus_leaks', 'wedge', 'next_step', 'note']];
    compareRows().forEach((r, i) => {
      rows.push([i + 1, r.p.name || 'Unnamed prospect', r.p.type, r.p.market, statusLabel(r.p.status),
        r.score, r.band.label, r.topLeak, r.likelyCount, r.wedge, r.p.nextStep,
        'draft-only, human review required']);
    });
    return rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  }

  /* ---------------- demo data ---------------- */

  function demoProspects() {
    const now = Date.now();
    const mk = (o) => ({ ...blankProspect(), ...o, id: uid(), createdAt: now, updatedAt: now });
    return [
      mk({
        name: 'North Star Plumbing', type: 'Residential plumbing', market: 'North Dallas suburbs',
        contact: 'Dana (owner)', status: 'ready',
        presence: 'Active Google profile, emergency service promoted, website form visible.',
        trust: '4.7 stars across 210 reviews, licensed & insured, before/after photos.',
        friction: 'Emergency line is strong but the form asks 9 fields; nothing answers after hours.',
        revenueFit: 9, proofFit: 8, accessFit: 7,
        leaks: {
          missedCalls: { signals: { noAfterHours: true, phoneOnlyCta: true, ownerAnswers: true }, note: 'Called Tue 6:10pm — voicemail after 6 rings.' },
          staleQuotes: { signals: { noPromise: true, reviewsMentionWait: true }, note: 'Two reviews mention waiting days for an estimate.' },
          formFriction: { signals: { manyFields: true }, note: '' }
        },
        wedgeId: 'auto',
        wedgeReason: 'Dana already pays for emergency ads; missed after-hours calls are the cheapest revenue to recover.',
        nextStep: 'Ask Dana for one week of call logs and count missed after-hours calls by hand.'
      }),
      mk({
        name: 'Bluebonnet Family Dental', type: 'Dental clinic', market: 'Plano, TX',
        contact: 'Front office — Maria', status: 'researching',
        presence: 'Polished website, active Instagram, no online booking anywhere.',
        trust: '4.9 stars but only 38 reviews; the nearest competitor shows 400+.',
        friction: '“Request appointment” goes to a form with no response-time promise.',
        revenueFit: 7, proofFit: 6, accessFit: 5,
        leaks: {
          bookingGap: { signals: { noOnlineBooking: true, competingCtas: true }, note: 'Call, form, DM, and email all compete on the homepage.' },
          weakProof: { signals: { fewerReviews: true, staleReviews: true }, note: 'Newest public review is 4 months old.' }
        },
        wedgeId: 'auto', wedgeReason: '',
        nextStep: 'Walk the booking path as a new patient and note every point of hesitation.'
      }),
      mk({
        name: 'Casa Verde Landscaping', type: 'Landscaping & lawn care', market: 'East Austin',
        contact: 'Rob (owner-operator)', status: 'parked',
        presence: 'Facebook page only, no website; quotes handled over text message.',
        trust: 'Word-of-mouth is strong; job photos on Facebook get good engagement.',
        friction: 'Rob quotes from memory; repeat customers re-explain their yard every season.',
        revenueFit: 5, proofFit: 4, accessFit: 8,
        leaks: {
          manualIntake: { signals: { onePerson: true, noRecords: true, repeatAsks: true }, note: 'Rob confirmed jobs live in his head and a notes app.' },
          staleQuotes: { signals: { noSystem: true }, note: '' }
        },
        wedgeId: 'intakeChecklist',
        wedgeReason: 'Rob is easy to reach but small; a light intake checklist proves value without a big build.',
        nextStep: 'Draft a one-page intake checklist and review it with Rob over coffee.'
      })
    ];
  }

  /* ---------------- render ---------------- */

  function applyTheme() {
    const theme = state.theme || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.dataset.theme = theme;
    const btn = $('themeToggle');
    btn.textContent = theme === 'dark' ? '☀ Light' : '☾ Dark';
    btn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
    btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  }

  function renderStats() {
    const ps = state.prospects;
    $('statProspects').textContent = ps.length;
    $('statTopFit').textContent = ps.length ? `${Math.max(...ps.map((p) => fitParts(p).score))}` : '–';
    $('statHighLeaks').textContent = ps.reduce((n, p) => n + leakPriority(p).filter((x) => x.pct >= 70).length, 0);
    $('statReady').textContent = ps.filter((p) => p.status === 'ready').length;
  }

  function renderList() {
    const list = $('prospectList');
    $('listEmpty').hidden = state.prospects.length > 0;
    list.innerHTML = state.prospects.map((p) => {
      const parts = fitParts(p);
      const band = fitBand(parts.score);
      const active = p.id === state.activeId;
      return `<li class="prospect-row${active ? ' active' : ''}">
        <button class="prospect-item" type="button" data-select="${esc(p.id)}" aria-current="${active ? 'true' : 'false'}">
          <span class="pi-name">${esc(p.name || 'Unnamed prospect')}</span>
          <span class="pi-meta">${esc(p.type || 'Type not set')} · ${esc(statusLabel(p.status))}</span>
        </button>
        <span class="pi-score ${band.cls}" title="Fit ${parts.score}/100 — ${esc(band.label)}">${parts.score}</span>
        <button class="pi-delete" type="button" data-delete="${esc(p.id)}" aria-label="Delete ${esc(p.name || 'unnamed prospect')}">✕</button>
      </li>`;
    }).join('');
  }

  function buildLeakCards() {
    $('leakGrid').innerHTML = LEAKS.map((leak) => `
      <article class="leak-card">
        <div class="leak-head">
          <span class="leak-icon" aria-hidden="true">${leak.icon}</span>
          <div class="leak-title">
            <h3>${esc(leak.name)}</h3>
            <p class="hint">${esc(leak.hint)} Impact ${leak.impact}/5.</p>
          </div>
          <span class="leak-badge none" id="badge-${leak.id}">No evidence</span>
        </div>
        <div class="leak-meter" aria-hidden="true"><span id="meter-${leak.id}"></span></div>
        <div class="leak-signals">
          ${leak.signals.map((sig) => `
            <label class="check-row">
              <input type="checkbox" id="sig-${leak.id}-${sig.id}" data-leak="${leak.id}" data-signal="${sig.id}" />
              <span>${esc(sig.label)}</span>
            </label>`).join('')}
        </div>
        <label class="leak-note-label" for="note-${leak.id}">Evidence note (optional)</label>
        <input id="note-${leak.id}" class="leak-note" data-leaknote="${leak.id}" maxlength="180"
               placeholder="e.g. called Tue 6pm — straight to voicemail" autocomplete="off" />
      </article>`).join('');
  }

  function buildWedgeOptions() {
    $('wedgeSelect').innerHTML = ['<option value="auto">Auto — follow the strongest evidence</option>']
      .concat(WEDGES.map((w) => `<option value="${w.id}">${esc(w.name)} (${w.effort} effort)</option>`)).join('');
  }

  function fillEditor(p) {
    $('fName').value = p.name; $('fType').value = p.type; $('fMarket').value = p.market;
    $('fContact').value = p.contact; $('fStatus').value = p.status;
    $('fPresence').value = p.presence; $('fTrust').value = p.trust; $('fFriction').value = p.friction;
    ['revenueFit', 'proofFit', 'accessFit'].forEach((k) => {
      $(k).value = p[k];
      $(k + 'Out').textContent = p[k];
    });
    $('wedgeSelect').value = p.wedgeId;
    $('fWedgeReason').value = p.wedgeReason; $('fNextStep').value = p.nextStep;
    LEAKS.forEach((leak) => {
      leak.signals.forEach((sig) => {
        $(`sig-${leak.id}-${sig.id}`).checked = !!(p.leaks[leak.id]?.signals?.[sig.id]);
      });
      $(`note-${leak.id}`).value = p.leaks[leak.id]?.note || '';
    });
  }

  function renderLeakDerived(p) {
    LEAKS.forEach((leak) => {
      const a = leakAssessment(p, leak);
      const badge = $(`badge-${leak.id}`);
      badge.textContent = a.pct > 0 ? `${a.band} · ${a.pct}%` : 'No evidence';
      badge.className = `leak-badge ${a.cls}`;
      $(`meter-${leak.id}`).style.width = `${a.pct}%`;
    });
  }

  function renderFitReadout(p) {
    const parts = fitParts(p);
    const band = fitBand(parts.score);
    $('fitReadout').innerHTML = `
      <div class="fit-top">
        <span class="fit-score"><strong>${parts.score}</strong>/100</span>
        <span class="stamp ${band.cls}">${esc(band.label)}</span>
      </div>
      <div class="fit-bar" aria-hidden="true"><span style="width:${parts.score}%"></span></div>
      <p class="hint">Sliders ${parts.sliderPart}/60 + leak evidence ${parts.leakPart}/40</p>`;
  }

  function renderWedgeRec(p) {
    const rec = recommendedWedge(p);
    const chosen = chosenWedge(p);
    let html;
    if (!rec) {
      html = `<p class="rec-kicker">Recommended wedge</p>
        <p class="rec-empty">No recommendation yet — check the leak signals you observed above and the strongest-evidence wedge will appear here.</p>`;
    } else {
      const overridden = p.wedgeId !== 'auto' && chosen && chosen.id !== rec.wedge.id;
      html = `<p class="rec-kicker">Recommended wedge</p>
        <h3>${esc(rec.wedge.name)} <span class="effort">${esc(rec.wedge.effort)} effort</span></h3>
        <p>${esc(rec.wedge.pitch)}</p>
        <p class="rec-why">${esc(recReasonText(rec))}</p>
        ${overridden ? `<p class="rec-override">You overrode this with “${esc(chosen.name)}” — that’s fine if you know something the signals don’t.</p>` : ''}`;
    }
    $('wedgeRec').innerHTML = html;
  }

  function renderPreview(p) {
    const parts = fitParts(p);
    const band = fitBand(parts.score);
    const prio = leakPriority(p);
    const withEvidence = prio.filter((x) => x.pct > 0);
    const without = prio.filter((x) => x.pct === 0);
    const rec = recommendedWedge(p);
    const chosen = chosenWedge(p);
    $('dossierPreview').innerHTML = `
      <header class="dp-head">
        <div>
          <h3>${esc(p.name || 'Unnamed prospect')}</h3>
          <p>${esc(p.type || 'Type not set')} · ${esc(p.market || 'Market not set')} · ${esc(statusLabel(p.status))}</p>
        </div>
        <span class="stamp ${band.cls}">${parts.score}/100 · ${esc(band.label)}</span>
      </header>
      <section>
        <h4>Profile</h4>
        <dl class="dp-dl">
          <dt>Contact</dt><dd>${esc(p.contact || '—')}</dd>
          <dt>Public presence</dt><dd>${esc(p.presence || '—')}</dd>
          <dt>Trust signals</dt><dd>${esc(p.trust || '—')}</dd>
          <dt>Observed friction</dt><dd>${esc(p.friction || '—')}</dd>
        </dl>
      </section>
      <section>
        <h4>Lead-leak likelihoods</h4>
        ${withEvidence.length ? `<ul class="dp-leaks">${withEvidence.map((x) => `
          <li>
            <div class="dp-leak-line"><strong>${esc(x.leak.name)}</strong><span class="leak-badge ${x.cls}">${esc(x.band)} · ${x.pct}%</span></div>
            <ul>${x.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}${x.note ? `<li class="dp-note">Note: ${esc(x.note)}</li>` : ''}</ul>
          </li>`).join('')}</ul>` : '<p class="dp-muted">No leak evidence recorded yet.</p>'}
        ${without.length ? `<p class="dp-muted">No evidence yet: ${without.map((x) => esc(x.leak.name)).join(', ')}.</p>` : ''}
      </section>
      <section>
        <h4>Fit</h4>
        <p>Revenue upside ${p.revenueFit}/10 · Proof visibility ${p.proofFit}/10 · Access ease ${p.accessFit}/10 · Leak evidence ${parts.leakPart}/40</p>
      </section>
      <section>
        <h4>First wedge</h4>
        ${chosen ? `
          <p><strong>${esc(chosen.name)}</strong> (${esc(chosen.effort)} effort)${p.wedgeId === 'auto' ? ' — auto-recommended' : ' — manually chosen'}</p>
          <p>${esc(chosen.pitch)}</p>
          ${p.wedgeId === 'auto' && rec ? `<p class="dp-muted">${esc(recReasonText(rec))}</p>` : ''}` :
        '<p class="dp-muted">No wedge yet — check leak signals to unlock a recommendation.</p>'}
        ${p.wedgeReason ? `<p><em>Why:</em> ${esc(p.wedgeReason)}</p>` : ''}
        <p><em>Human next step:</em> ${esc(p.nextStep || '—')}</p>
      </section>
      <p class="dp-guardrail">${esc(GUARDRAIL)}</p>`;
  }

  function renderValidation(p) {
    const missing = !p.name.trim();
    $('fName').classList.toggle('invalid', missing);
    $('nameErr').hidden = !missing;
  }

  function renderDerived() {
    const p = activeProspect();
    if (!p) return;
    renderLeakDerived(p);
    renderFitReadout(p);
    renderWedgeRec(p);
    renderPreview(p);
    renderValidation(p);
  }

  function renderCompare() {
    const rows = compareRows();
    if (!rows.length) {
      $('compareWrap').innerHTML = `<div class="empty-state">
        <p><strong>Nothing to compare yet.</strong></p>
        <p>Add at least one prospect in the Dossier view (or load the demo) and this table will rank them by fit score.</p>
      </div>`;
      return;
    }
    $('compareWrap').innerHTML = `<table class="compare-table">
      <thead><tr>
        <th scope="col">#</th><th scope="col">Prospect</th><th scope="col">Fit</th>
        <th scope="col">Top leak</th><th scope="col">Likely+ leaks</th>
        <th scope="col">Wedge</th><th scope="col">Status</th><th scope="col"><span class="visually-hidden">Open</span></th>
      </tr></thead>
      <tbody>${rows.map((r, i) => `<tr>
        <td>${i + 1}</td>
        <td class="ct-name">${esc(r.p.name || 'Unnamed prospect')}<span class="ct-sub">${esc(r.p.market || '')}</span></td>
        <td><span class="pi-score ${r.band.cls}">${r.score}</span> ${esc(r.band.label)}</td>
        <td>${esc(r.topLeak)}</td>
        <td>${r.likelyCount}</td>
        <td>${esc(r.wedge)}</td>
        <td>${esc(statusLabel(r.p.status))}</td>
        <td><button class="btn btn-sm" type="button" data-open="${esc(r.p.id)}">Open</button></td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  function renderEditorVisibility() {
    const has = !!activeProspect();
    $('editorEmpty').hidden = has;
    $('editorBody').hidden = !has;
    if (has) fillEditor(activeProspect());
  }

  function renderView() {
    const compare = state.view === 'compare';
    $('viewDossier').hidden = compare;
    $('viewCompare').hidden = !compare;
    $('tabDossier').setAttribute('aria-pressed', String(!compare));
    $('tabCompare').setAttribute('aria-pressed', String(compare));
    if (compare) renderCompare();
  }

  function renderAll() {
    applyTheme();
    renderStats();
    renderList();
    renderEditorVisibility();
    renderDerived();
    renderView();
  }

  /* ---------------- toast & clipboard ---------------- */

  function showToast(msg, opts = {}) {
    $('toastMsg').textContent = msg;
    $('toastUndo').hidden = !opts.undo;
    const t = $('toast');
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove('show');
      $('toastUndo').hidden = true;
      if (opts.undo) undoBuffer = null;
    }, opts.undo ? 7000 : 2400);
  }

  function copyText(text, okMsg) {
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
      showToast(ok ? okMsg : 'Copy blocked — use Download JSON instead');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast(okMsg)).catch(fallback);
    } else fallback();
  }

  function downloadFile(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------------- actions ---------------- */

  function addProspect() {
    const p = blankProspect();
    state.prospects.unshift(p);
    state.activeId = p.id;
    state.view = 'dossier';
    save();
    renderAll();
    $('fName').focus();
    showToast('New prospect created — name it first');
  }

  function selectProspect(id) {
    if (!state.prospects.some((p) => p.id === id)) return;
    state.activeId = id;
    state.view = 'dossier';
    save();
    renderAll();
  }

  function deleteProspect(id) {
    const idx = state.prospects.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const [removed] = state.prospects.splice(idx, 1);
    undoBuffer = { prospect: removed, index: idx, wasActive: state.activeId === id };
    if (state.activeId === id) {
      state.activeId = (state.prospects[Math.min(idx, state.prospects.length - 1)] || {}).id || null;
    }
    save();
    renderAll();
    showToast(`Deleted “${removed.name || 'Unnamed prospect'}”`, { undo: true });
  }

  function undoDelete() {
    if (!undoBuffer) return;
    const { prospect, index, wasActive } = undoBuffer;
    undoBuffer = null;
    state.prospects.splice(Math.min(index, state.prospects.length), 0, prospect);
    if (wasActive) state.activeId = prospect.id;
    save();
    renderAll();
    showToast('Prospect restored');
  }

  function copyDossier() {
    const p = activeProspect();
    if (!p) { showToast('Create or select a prospect first'); return; }
    copyText(dossierMarkdown(p), 'Dossier Markdown copied');
  }

  function openHelp() {
    helpOpener = document.activeElement;
    $('helpModal').showModal();
  }

  function setView(view) {
    state.view = view;
    save();
    renderView();
  }

  /* ---------------- event wiring ---------------- */

  function wire() {
    $('themeToggle').addEventListener('click', () => {
      const current = document.documentElement.dataset.theme;
      state.theme = current === 'dark' ? 'light' : 'dark';
      save();
      applyTheme();
      showToast(`${state.theme === 'light' ? 'Light' : 'Dark'} mode on`);
    });

    $('helpBtn').addEventListener('click', openHelp);
    $('helpClose').addEventListener('click', () => $('helpModal').close());
    $('helpModal').addEventListener('close', () => {
      if (helpOpener && document.contains(helpOpener)) helpOpener.focus();
      helpOpener = null;
    });
    $('helpModal').addEventListener('click', (e) => {
      if (e.target === $('helpModal')) $('helpModal').close();
    });

    $('tabDossier').addEventListener('click', () => setView('dossier'));
    $('tabCompare').addEventListener('click', () => setView('compare'));

    $('demoBtn').addEventListener('click', () => {
      state.prospects = demoProspects();
      state.activeId = state.prospects[0].id;
      save();
      renderAll();
      showToast('Demo pipeline loaded — 3 prospects');
    });

    $('resetBtn').addEventListener('click', () => {
      if (!window.confirm('Reset everything? This clears all prospects from this browser.')) return;
      state = normalize({ theme: state.theme, seenGuide: state.seenGuide });
      save();
      renderAll();
      showToast('All data cleared');
    });

    $('newProspectBtn').addEventListener('click', addProspect);
    $('emptyNewBtn').addEventListener('click', addProspect);
    $('emptyDemoBtn').addEventListener('click', () => $('demoBtn').click());

    $('prospectList').addEventListener('click', (e) => {
      const del = e.target.closest('[data-delete]');
      if (del) { deleteProspect(del.dataset.delete); return; }
      const sel = e.target.closest('[data-select]');
      if (sel) selectProspect(sel.dataset.select);
    });

    $('compareWrap').addEventListener('click', (e) => {
      const open = e.target.closest('[data-open]');
      if (open) selectProspect(open.dataset.open);
    });

    $('editorBody').addEventListener('input', (e) => {
      const p = activeProspect();
      if (!p) return;
      const t = e.target;
      if (t.dataset.field) {
        if (t.type === 'range') {
          const v = clampNum(t.value, 1, 10, 5);
          p[t.dataset.field] = v;
          $(t.id + 'Out').textContent = v;
        } else {
          p[t.dataset.field] = t.value;
        }
      } else if (t.dataset.leaknote) {
        ensureLeak(p, t.dataset.leaknote).note = t.value.slice(0, 180);
      } else if (t.dataset.leak && t.dataset.signal) {
        ensureLeak(p, t.dataset.leak).signals[t.dataset.signal] = t.checked;
      } else {
        return;
      }
      p.updatedAt = Date.now();
      save();
      renderDerived();
      renderList();
      renderStats();
    });

    $('toastUndo').addEventListener('click', () => {
      $('toast').classList.remove('show');
      $('toastUndo').hidden = true;
      clearTimeout(toastTimer);
      undoDelete();
    });

    $('exportMd').addEventListener('click', copyDossier);
    $('compareCopy').addEventListener('click', () => copyText(compareMarkdown(), 'Comparison table copied'));

    $('exportJson').addEventListener('click', () => {
      downloadFile('local-biz-snapshot.json', JSON.stringify({
        app: 'local-biz-snapshot', version: 1,
        exportedAt: new Date().toISOString(),
        safety: 'draft-only, human review required',
        state
      }, null, 2), 'application/json');
      showToast('JSON downloaded');
    });

    $('exportCsv').addEventListener('click', () => {
      if (!state.prospects.length) { showToast('Nothing to export yet'); return; }
      downloadFile('local-biz-comparison.csv', compareCsv(), 'text/csv');
      showToast('Comparison CSV downloaded');
    });

    $('importBtn').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const raw = JSON.parse(reader.result);
          const incoming = raw && typeof raw === 'object' && raw.state ? raw.state : raw;
          const next = normalize(incoming);
          if (!next.prospects.length) { showToast('No prospects found in that file'); return; }
          next.theme = state.theme;
          next.seenGuide = true;
          state = next;
          save();
          renderAll();
          showToast(`Imported ${state.prospects.length} prospect${state.prospects.length === 1 ? '' : 's'}`);
        } catch {
          showToast('Import failed — not valid JSON');
        }
      };
      reader.readAsText(file);
    });

    $('printBtn').addEventListener('click', () => {
      if (!activeProspect()) { showToast('Create or select a prospect first'); return; }
      setView('dossier');
      window.print();
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        copyDossier();
        return;
      }
      const tag = (document.activeElement || {}).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '?') { e.preventDefault(); openHelp(); }
      else if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); addProspect(); }
    });
  }

  /* ---------------- init ---------------- */

  state = load();
  buildLeakCards();
  buildWedgeOptions();
  wire();
  renderAll();
  if (!state.seenGuide) {
    state.seenGuide = true;
    save();
    openHelp();
  }
})();
