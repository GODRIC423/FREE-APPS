/* Owner Report Studio — compose a daily/weekly owner report.
   Local-first remake: metrics with deltas vs prior period, report health
   checklist, printable report layout, markdown/CSV/JSON export. */
(() => {
  'use strict';

  // ---------------------------------------------------------------- constants
  const LS_KEY = 'fable-remake:day-03-owner-report-studio:v1';
  const MAX_TEXT = 300;
  const NUM_MIN = -9999999;
  const NUM_MAX = 9999999;
  const PERIODS = { daily: 'Daily', weekly: 'Weekly' };
  const PERIOD_UNIT = { daily: 'day', weekly: 'week' };
  const FORMATS = ['currency', 'number', 'percent', 'hours'];
  const FORMAT_LABEL = { currency: '$', number: '#', percent: '%', hours: 'hrs' };
  const SEVERITIES = ['low', 'medium', 'high'];
  const SIGNAL_WORD = { good: 'improving', bad: 'declining', flat: 'flat' };

  const $ = (id) => document.getElementById(id);
  const numFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
  const moneyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  // ---------------------------------------------------------------- utils
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const debounce = (fn, ms) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };

  function parseNum(v) {
    if (v === '' || v == null) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.min(NUM_MAX, Math.max(NUM_MIN, n));
  }

  function fmtVal(v, format) {
    if (v == null || !Number.isFinite(v)) return '—';
    switch (format) {
      case 'currency': return moneyFmt.format(v);
      case 'percent': return numFmt.format(v) + '%';
      case 'hours': return numFmt.format(v) + 'h';
      default: return numFmt.format(v);
    }
  }

  function fmtDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return iso || '';
    const d = new Date(iso + 'T00:00:00');
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // ---------------------------------------------------------------- state
  function normalize(raw) {
    const src = (raw && typeof raw === 'object') ? raw : {};
    const str = (v, max = MAX_TEXT) => (typeof v === 'string' ? v.slice(0, max) : '');
    const arr = (v) => (Array.isArray(v) ? v : []);
    const oneOf = (v, list, fb) => (list.includes(v) ? v : fb);
    const isoDate = (v, fb) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : fb);
    const id = (v) => str(v, 40) || uid();
    return {
      version: 1,
      theme: oneOf(src.theme, ['dark', 'light'], null),
      seenGuide: !!src.seenGuide,
      business: str(src.business, 80),
      reportDate: isoDate(src.reportDate, todayISO()),
      period: oneOf(src.period, ['daily', 'weekly'], 'daily'),
      audience: str(src.audience, 60),
      summary: str(src.summary, 600),
      metrics: arr(src.metrics).slice(0, 20).map((m) => ({
        id: id(m && m.id),
        name: str(m && m.name, 60),
        format: oneOf(m && m.format, FORMATS, 'number'),
        value: parseNum(m && m.value),
        prior: parseNum(m && m.prior),
        direction: oneOf(m && m.direction, ['up', 'down'], 'up'),
      })),
      wins: arr(src.wins).slice(0, 20).map((w) => ({
        id: id(w && w.id),
        text: str(typeof w === 'string' ? w : (w && w.text)),
      })),
      risks: arr(src.risks).slice(0, 20).map((r) => ({
        id: id(r && r.id),
        text: str(r && r.text),
        severity: oneOf(r && r.severity, SEVERITIES, 'medium'),
      })),
      decisions: arr(src.decisions).slice(0, 20).map((d) => ({
        id: id(d && d.id),
        text: str(d && d.text),
        owner: str(d && d.owner, 40),
        due: isoDate(d && d.due, ''),
      })),
      actions: arr(src.actions).slice(0, 30).map((a) => ({
        id: id(a && a.id),
        text: str(a && a.text),
        owner: str(a && a.owner, 40),
        done: !!(a && a.done),
      })),
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return normalize(raw ? JSON.parse(raw) : {});
    } catch {
      return normalize({});
    }
  }

  let state = load();

  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage full/blocked: stay in-memory */ }
  }
  const scheduleSave = debounce(save, 400);

  // ---------------------------------------------------------------- demo data
  function demoState() {
    const due = new Date();
    due.setDate(due.getDate() + 3);
    return normalize({
      theme: state.theme,
      seenGuide: true,
      business: 'Northside HVAC',
      reportDate: todayISO(),
      period: 'weekly',
      audience: 'Owner + GM',
      summary: 'Strong recovery week: booked revenue up double digits vs last week and response delay nearly halved. Follow-up on the missed-call list is working. One staffing risk needs an owner decision before the weekend schedule locks.',
      metrics: [
        { name: 'Booked revenue', format: 'currency', value: 18450, prior: 16200, direction: 'up' },
        { name: 'Recovered value', format: 'currency', value: 3260, prior: 2100, direction: 'up' },
        { name: 'Jobs completed', format: 'number', value: 24, prior: 21, direction: 'up' },
        { name: 'Open leads', format: 'number', value: 17, prior: 12, direction: 'up' },
        { name: 'Avg response delay', format: 'hours', value: 4, prior: 7, direction: 'down' },
      ],
      wins: [
        { text: 'Recovered three stale quote requests from the missed-call list and booked two estimate calls.' },
        { text: 'Dispatcher cleared the shared inbox backlog two days running.' },
      ],
      risks: [
        { text: 'Shared inbox still gets unassigned requests older than one business day.', severity: 'high' },
        { text: 'Two techs out Friday — weekend on-call coverage is thin.', severity: 'medium' },
      ],
      decisions: [
        { text: 'Name one dispatcher as the response-time owner and approve the 4:30 PM daily report.', owner: 'Owner', due: due.toISOString().slice(0, 10) },
      ],
      actions: [
        { text: 'Review stale inbox queue before 11 AM', owner: 'Dispatcher', done: false },
        { text: 'Approve draft callback text for missed calls', owner: 'Owner', done: false },
        { text: "Send this week's report with metric deltas attached", owner: 'GM', done: true },
      ],
    });
  }

  // ---------------------------------------------------------------- domain logic
  function metricDelta(m) {
    if (m.value == null || m.prior == null) return null;
    const delta = m.value - m.prior;
    const pct = m.prior !== 0 ? (delta / Math.abs(m.prior)) * 100 : null;
    const signal = delta === 0 ? 'flat' : ((delta > 0) === (m.direction === 'up') ? 'good' : 'bad');
    return { delta, pct, signal };
  }

  function fmtDelta(delta, format) {
    if (delta === 0) return '±0';
    const sign = delta > 0 ? '+' : '−';
    return sign + fmtVal(Math.abs(delta), format);
  }

  function fmtPct(p) {
    if (p === 0) return '±0%';
    return (p > 0 ? '+' : '−') + Math.abs(p).toFixed(1) + '%';
  }

  function deltaChipText(m) {
    const d = metricDelta(m);
    if (!d) return '—';
    const arrow = d.delta > 0 ? '▲' : d.delta < 0 ? '▼' : '→';
    return d.pct != null ? `${arrow} ${fmtPct(d.pct)}` : `${arrow} ${fmtDelta(d.delta, m.format)}`;
  }

  function trendCounts() {
    const counts = { good: 0, bad: 0, flat: 0, withDelta: 0 };
    state.metrics.forEach((m) => {
      const d = metricDelta(m);
      if (!d) return;
      counts.withDelta += 1;
      counts[d.signal] += 1;
    });
    return counts;
  }

  function trendLine() {
    const t = trendCounts();
    if (!t.withDelta) return '';
    return `${t.good} improving · ${t.bad} declining · ${t.flat} flat vs prior ${PERIOD_UNIT[state.period]}.`;
  }

  function healthChecks() {
    const m = state.metrics;
    return [
      { label: 'Report header complete (business, date, audience)', pass: !!(state.business.trim() && state.reportDate && state.audience.trim()) },
      { label: 'Executive summary written (40+ characters)', pass: state.summary.trim().length >= 40 },
      { label: 'At least 3 metrics with current values', pass: m.filter((x) => x.value != null).length >= 3 },
      { label: 'Every metric has a prior-period value (deltas compute)', pass: m.length > 0 && m.every((x) => x.prior != null) },
      { label: 'At least one win recorded', pass: state.wins.some((w) => w.text.trim()) },
      { label: 'Risks logged with a severity call', pass: state.risks.some((r) => r.text.trim()) },
      { label: 'A decision needed is written and has an owner', pass: state.decisions.some((d) => d.text.trim() && d.owner.trim()) },
      { label: 'Next actions listed and every one has an owner', pass: state.actions.some((a) => a.text.trim()) && state.actions.every((a) => !a.text.trim() || a.owner.trim()) },
    ];
  }

  function healthScore() {
    const checks = healthChecks();
    const passed = checks.filter((c) => c.pass).length;
    return { checks, passed, total: checks.length, score: Math.round((passed / checks.length) * 100) };
  }

  function healthStatus(score) {
    if (score >= 90) return { label: 'Ready to send', cls: 'ok' };
    if (score >= 60) return { label: 'Nearly there', cls: 'warn' };
    return { label: 'Needs work', cls: 'bad' };
  }

  // ---------------------------------------------------------------- exports
  const mdCell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

  function buildMarkdown() {
    const p = PERIODS[state.period];
    const health = healthScore();
    const status = healthStatus(health.score);
    const lines = [];
    lines.push(`# ${state.business.trim() || 'Business'} — ${p} Owner Report`);
    lines.push('');
    lines.push(`**Date:** ${state.reportDate}  ·  **Period:** ${p}  ·  **Audience:** ${state.audience.trim() || 'Owner'}`);
    lines.push('');
    lines.push('> Draft composed locally in Owner Report Studio — human review required before sharing.');
    lines.push('');
    lines.push('## Executive summary');
    lines.push(state.summary.trim() || '_Not written yet._');
    lines.push('');
    lines.push(`## Metrics vs prior ${PERIOD_UNIT[state.period]}`);
    const ms = state.metrics.filter((m) => m.name.trim() || m.value != null);
    if (ms.length) {
      lines.push('| Metric | Current | Prior | Δ | Δ% | Signal |');
      lines.push('|---|---:|---:|---:|---:|:--|');
      ms.forEach((m) => {
        const d = metricDelta(m);
        lines.push(`| ${mdCell(m.name.trim() || 'Untitled metric')} | ${fmtVal(m.value, m.format)} | ${fmtVal(m.prior, m.format)} | ${d ? fmtDelta(d.delta, m.format) : '—'} | ${d && d.pct != null ? fmtPct(d.pct) : '—'} | ${d ? SIGNAL_WORD[d.signal] : '—'} |`);
      });
      const t = trendLine();
      if (t) { lines.push(''); lines.push(t); }
    } else {
      lines.push('_No metrics tracked yet._');
    }
    lines.push('');
    lines.push('## Wins');
    const wins = state.wins.filter((w) => w.text.trim());
    lines.push(...(wins.length ? wins.map((w) => `- ${w.text.trim()}`) : ['_No wins recorded._']));
    lines.push('');
    lines.push('## Risks');
    const risks = state.risks.filter((r) => r.text.trim());
    lines.push(...(risks.length ? risks.map((r) => `- **[${r.severity.toUpperCase()}]** ${r.text.trim()}`) : ['_No risks logged._']));
    lines.push('');
    lines.push('## Decisions needed');
    const decisions = state.decisions.filter((d) => d.text.trim());
    lines.push(...(decisions.length
      ? decisions.map((d) => `- ${d.text.trim()} — owner: ${d.owner.trim() || 'unassigned'}${d.due ? ` · by ${d.due}` : ''}`)
      : ['_No decisions queued._']));
    lines.push('');
    lines.push('## Next actions');
    const actions = state.actions.filter((a) => a.text.trim());
    lines.push(...(actions.length
      ? actions.map((a) => `- [${a.done ? 'x' : ' '}] ${a.text.trim()} — ${a.owner.trim() || 'unassigned'}`)
      : ['_No next actions._']));
    lines.push('');
    lines.push('## Report health');
    health.checks.forEach((c) => lines.push(`- [${c.pass ? 'x' : ' '}] ${c.label}`));
    lines.push('');
    lines.push(`**Health: ${health.score}/100 — ${status.label}**`);
    lines.push('');
    lines.push('---');
    lines.push('Draft for human review. Owner Report Studio is local-only: it sends nothing and writes to no external system.');
    return lines.join('\n');
  }

  const csvCell = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };

  function buildCSV() {
    const head = ['Metric', 'Format', 'Current', 'Prior', 'Delta', 'Delta %', 'Good direction', 'Signal'];
    const rows = state.metrics.map((m) => {
      const d = metricDelta(m);
      return [
        m.name, m.format,
        m.value ?? '', m.prior ?? '',
        d ? Math.round(d.delta * 100) / 100 : '',
        d && d.pct != null ? d.pct.toFixed(1) : '',
        m.direction, d ? SIGNAL_WORD[d.signal] : '',
      ];
    });
    return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  }

  // ---------------------------------------------------------------- toast + undo
  let toastTimer = null;

  function hideToast() {
    $('toast').classList.remove('show');
  }

  function showToast(msg, undoFn) {
    const t = $('toast');
    t.textContent = '';
    const span = document.createElement('span');
    span.textContent = msg;
    t.appendChild(span);
    if (undoFn) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'toast-undo';
      b.textContent = 'Undo';
      b.addEventListener('click', () => { hideToast(); undoFn(); });
      t.appendChild(b);
    }
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, undoFn ? 7000 : 2200);
  }

  // ---------------------------------------------------------------- render: theme
  function resolvedTheme() {
    if (state.theme) return state.theme;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
  }

  function applyTheme() {
    const t = resolvedTheme();
    document.documentElement.dataset.theme = t;
    const btn = $('themeToggle');
    btn.textContent = t === 'light' ? '☾' : '☀';
    btn.setAttribute('aria-label', t === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
  }

  // ---------------------------------------------------------------- render: editors
  function emptyHTML(text) {
    return `<p class="empty">${esc(text)}</p>`;
  }

  function metricRowHTML(m) {
    const d = metricDelta(m);
    return `<div class="row metric-row" data-id="${esc(m.id)}">
      <input data-field="name" aria-label="Metric name" placeholder="e.g. Booked revenue" maxlength="60" value="${esc(m.name)}">
      <select data-field="format" aria-label="Metric format">
        ${FORMATS.map((f) => `<option value="${f}"${m.format === f ? ' selected' : ''}>${FORMAT_LABEL[f]}</option>`).join('')}
      </select>
      <input data-field="value" aria-label="Current value" type="number" step="any" placeholder="now" value="${m.value ?? ''}">
      <input data-field="prior" aria-label="Prior period value" type="number" step="any" placeholder="prior" value="${m.prior ?? ''}">
      <select data-field="direction" aria-label="Which direction is good">
        <option value="up"${m.direction === 'up' ? ' selected' : ''}>▲ good</option>
        <option value="down"${m.direction === 'down' ? ' selected' : ''}>▼ good</option>
      </select>
      <span class="delta-chip ${d ? d.signal : ''}" data-chip>${esc(deltaChipText(m))}</span>
      <button class="btn-del" type="button" data-del aria-label="Delete metric">✕</button>
    </div>`;
  }

  function winRowHTML(w) {
    return `<div class="row win-row" data-id="${esc(w.id)}">
      <input data-field="text" aria-label="Win" placeholder="Concrete proof point — what went right?" maxlength="${MAX_TEXT}" value="${esc(w.text)}">
      <button class="btn-del" type="button" data-del aria-label="Delete win">✕</button>
    </div>`;
  }

  function riskRowHTML(r) {
    return `<div class="row risk-row" data-id="${esc(r.id)}">
      <input data-field="text" aria-label="Risk" placeholder="What could bite us — and how badly?" maxlength="${MAX_TEXT}" value="${esc(r.text)}">
      <select data-field="severity" aria-label="Risk severity">
        ${SEVERITIES.map((s) => `<option value="${s}"${r.severity === s ? ' selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}
      </select>
      <button class="btn-del" type="button" data-del aria-label="Delete risk">✕</button>
    </div>`;
  }

  function decisionRowHTML(d) {
    return `<div class="row decision-row" data-id="${esc(d.id)}">
      <input data-field="text" aria-label="Decision needed" placeholder="What must the owner decide?" maxlength="${MAX_TEXT}" value="${esc(d.text)}">
      <input data-field="owner" aria-label="Decision owner" placeholder="Owner" maxlength="40" value="${esc(d.owner)}">
      <input data-field="due" aria-label="Decision due date" type="date" value="${esc(d.due)}">
      <button class="btn-del" type="button" data-del aria-label="Delete decision">✕</button>
    </div>`;
  }

  function actionRowHTML(a) {
    return `<div class="row action-row${a.done ? ' done' : ''}" data-id="${esc(a.id)}">
      <input data-field="done" type="checkbox" aria-label="Action done"${a.done ? ' checked' : ''}>
      <input data-field="text" aria-label="Action" placeholder="Next action" maxlength="${MAX_TEXT}" value="${esc(a.text)}">
      <input data-field="owner" aria-label="Action owner" placeholder="Owner" maxlength="40" value="${esc(a.owner)}">
      <button class="btn-del" type="button" data-del aria-label="Delete action">✕</button>
    </div>`;
  }

  function renderEditors() {
    $('metricList').innerHTML = state.metrics.length
      ? state.metrics.map(metricRowHTML).join('')
      : emptyHTML('No metrics yet. Track 3–6 headline numbers — booked revenue, jobs completed, open leads.');
    $('winList').innerHTML = state.wins.length
      ? state.wins.map(winRowHTML).join('')
      : emptyHTML('No wins yet. Even one concrete proof point keeps the report credible.');
    $('riskList').innerHTML = state.risks.length
      ? state.risks.map(riskRowHTML).join('')
      : emptyHTML('No risks logged. If the period was clean, say so in the summary.');
    $('decisionList').innerHTML = state.decisions.length
      ? state.decisions.map(decisionRowHTML).join('')
      : emptyHTML('No decisions queued. What does the owner need to decide, by when?');
    $('actionList').innerHTML = state.actions.length
      ? state.actions.map(actionRowHTML).join('')
      : emptyHTML("No next actions. Add tomorrow's top three, each with an owner.");
  }

  function renderFields() {
    $('fBusiness').value = state.business;
    $('fDate').value = state.reportDate;
    $('fPeriod').value = state.period;
    $('fAudience').value = state.audience;
    $('fSummary').value = state.summary;
  }

  // ---------------------------------------------------------------- render: derived
  function renderStats() {
    const health = healthScore();
    const t = trendCounts();
    $('statHealth').textContent = `${health.score}%`;
    $('statImproved').textContent = `${t.good}/${t.withDelta}`;
    $('statRisks').textContent = String(state.risks.filter((r) => r.severity === 'high' && r.text.trim()).length);
    $('statActions').textContent = String(state.actions.filter((a) => !a.done && a.text.trim()).length);
  }

  function renderHealth() {
    const health = healthScore();
    const status = healthStatus(health.score);
    $('healthScore').textContent = String(health.score);
    $('healthRing').style.setProperty('--pct', String(health.score));
    $('healthRing').setAttribute('aria-label', `Report health score ${health.score} out of 100`);
    const badge = $('healthBadge');
    badge.textContent = status.label;
    badge.className = `badge ${status.cls}`;
    $('healthHint').textContent = health.passed === health.total
      ? 'All checks pass — this report is ready for the owner.'
      : `${health.passed}/${health.total} checks pass. Fix the open items below before sending.`;
    $('healthChecklist').innerHTML = health.checks.map((c) =>
      `<li class="${c.pass ? 'pass' : ''}"><span class="mark" aria-hidden="true">${c.pass ? '✓' : '○'}</span><span>${esc(c.label)}</span></li>`
    ).join('');
  }

  function renderPreview() {
    const p = PERIODS[state.period];
    $('rpTitle').textContent = `${state.business.trim() || 'Your business'} — ${p} Owner Report`;
    $('rpMeta').textContent = `${fmtDate(state.reportDate)} · ${p} · For: ${state.audience.trim() || 'Owner'}`;
    $('rpSummary').textContent = state.summary.trim()
      || 'No executive summary yet — write 2–3 sentences the owner can read in ten seconds.';
    $('rpMetricsHead').textContent = `Metrics vs prior ${PERIOD_UNIT[state.period]}`;

    const ms = state.metrics.filter((m) => m.name.trim() || m.value != null);
    if (!ms.length) {
      $('rpMetrics').innerHTML = '<p class="rp-none">Add metric rows to build the table.</p>';
    } else {
      $('rpMetrics').innerHTML = `<table class="report-table">
        <thead><tr><th scope="col">Metric</th><th scope="col">Current</th><th scope="col">Prior</th><th scope="col">Δ</th><th scope="col">Δ%</th></tr></thead>
        <tbody>${ms.map((m) => {
          const d = metricDelta(m);
          const cls = d ? `sig-${d.signal}` : '';
          return `<tr>
            <td>${esc(m.name.trim() || 'Untitled metric')}</td>
            <td>${fmtVal(m.value, m.format)}</td>
            <td>${fmtVal(m.prior, m.format)}</td>
            <td class="${cls}">${d ? esc(fmtDelta(d.delta, m.format)) : '—'}</td>
            <td class="${cls}">${d && d.pct != null ? esc(fmtPct(d.pct)) : '—'}</td>
          </tr>`;
        }).join('')}</tbody></table>`;
    }
    $('rpTrend').textContent = trendLine();

    const li = (html) => `<li>${html}</li>`;
    const none = (text) => `<li class="rp-none">${esc(text)}</li>`;
    const wins = state.wins.filter((w) => w.text.trim());
    $('rpWins').innerHTML = wins.length ? wins.map((w) => li(esc(w.text.trim()))).join('') : none('None recorded.');
    const risks = state.risks.filter((r) => r.text.trim());
    $('rpRisks').innerHTML = risks.length
      ? risks.map((r) => li(`<span class="sev sev-${esc(r.severity)}">${esc(r.severity.toUpperCase())}</span> ${esc(r.text.trim())}`)).join('')
      : none('None logged.');
    const decisions = state.decisions.filter((d) => d.text.trim());
    $('rpDecisions').innerHTML = decisions.length
      ? decisions.map((d) => li(`${esc(d.text.trim())} — <em>${esc(d.owner.trim() || 'unassigned')}${d.due ? ` · by ${esc(fmtDate(d.due))}` : ''}</em>`)).join('')
      : none('Nothing queued for the owner.');
    const actions = state.actions.filter((a) => a.text.trim());
    $('rpActions').innerHTML = actions.length
      ? actions.map((a) => li(`${a.done ? '☑' : '☐'} ${esc(a.text.trim())} — <em>${esc(a.owner.trim() || 'unassigned')}</em>`)).join('')
      : none('No next actions listed.');
  }

  function renderValidation() {
    const businessOk = !!state.business.trim();
    $('fBusiness').classList.toggle('invalid', !businessOk);
    $('businessHint').hidden = businessOk;
    $('metricsHint').textContent = `current vs prior ${PERIOD_UNIT[state.period]} — deltas compute live`;
  }

  function renderDerived() {
    renderStats();
    renderHealth();
    renderPreview();
    renderValidation();
  }

  function renderAll() {
    applyTheme();
    renderFields();
    renderEditors();
    renderDerived();
  }

  // ---------------------------------------------------------------- list editing
  function updateChip(rowEl, m) {
    const chip = rowEl.querySelector('[data-chip]');
    if (!chip) return;
    const d = metricDelta(m);
    chip.textContent = deltaChipText(m);
    chip.className = `delta-chip ${d ? d.signal : ''}`.trim();
  }

  function deleteItem(listName, id, label) {
    const idx = state[listName].findIndex((x) => x.id === id);
    if (idx < 0) return;
    const [removed] = state[listName].splice(idx, 1);
    renderEditors();
    renderDerived();
    scheduleSave();
    showToast(`${label} deleted`, () => {
      state[listName].splice(Math.min(idx, state[listName].length), 0, removed);
      renderEditors();
      renderDerived();
      scheduleSave();
      showToast(`${label} restored`);
    });
  }

  function bindList(containerId, listName, label) {
    const container = $(containerId);
    const handleEdit = (e) => {
      const rowEl = e.target.closest('[data-id]');
      const field = e.target.dataset ? e.target.dataset.field : null;
      if (!rowEl || !field) return;
      const item = state[listName].find((x) => x.id === rowEl.dataset.id);
      if (!item) return;
      if (e.target.type === 'checkbox') {
        item[field] = e.target.checked;
        rowEl.classList.toggle('done', !!item.done);
      } else if (e.target.type === 'number') {
        item[field] = parseNum(e.target.value);
      } else {
        item[field] = e.target.value.slice(0, 600);
      }
      if (listName === 'metrics') updateChip(rowEl, item);
      renderDerived();
      scheduleSave();
    };
    container.addEventListener('input', handleEdit);
    container.addEventListener('change', (e) => {
      if (e.target.tagName === 'SELECT') handleEdit(e);
    });
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-del]');
      if (!btn) return;
      const rowEl = btn.closest('[data-id]');
      if (rowEl) deleteItem(listName, rowEl.dataset.id, label);
    });
  }

  function addItem(listName, item, focusSelector) {
    state[listName].push(item);
    renderEditors();
    renderDerived();
    scheduleSave();
    const containerId = { metrics: 'metricList', wins: 'winList', risks: 'riskList', decisions: 'decisionList', actions: 'actionList' }[listName];
    const row = $(containerId).lastElementChild;
    if (row) {
      const input = row.querySelector(focusSelector || 'input');
      if (input) input.focus();
    }
  }

  // ---------------------------------------------------------------- export actions
  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyText(text, okMsg) {
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
      showToast(ok ? okMsg : 'Copy failed — use Download .md instead');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast(okMsg)).catch(fallback);
    } else {
      fallback();
    }
  }

  const copyMarkdown = () => copyText(buildMarkdown(), 'Report Markdown copied');
  const fileStamp = () => state.reportDate || todayISO();

  // ---------------------------------------------------------------- help dialog
  let lastFocus = null;

  function openHelp() {
    const dlg = $('helpDialog');
    lastFocus = document.activeElement;
    if (typeof dlg.showModal === 'function') {
      if (!dlg.open) dlg.showModal();
    } else {
      dlg.setAttribute('open', '');
    }
    $('helpClose').focus();
  }

  function closeHelp() {
    const dlg = $('helpDialog');
    if (typeof dlg.close === 'function' && dlg.open) dlg.close();
    else dlg.removeAttribute('open');
  }

  // ---------------------------------------------------------------- event wiring
  function wire() {
    // header
    $('themeToggle').addEventListener('click', () => {
      state.theme = resolvedTheme() === 'light' ? 'dark' : 'light';
      applyTheme();
      scheduleSave();
      showToast(`${state.theme === 'light' ? 'Light' : 'Dark'} theme saved`);
    });
    $('helpBtn').addEventListener('click', openHelp);
    $('helpClose').addEventListener('click', closeHelp);
    $('helpDialog').addEventListener('close', () => {
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    });
    $('demoBtn').addEventListener('click', () => {
      state = demoState();
      renderAll();
      save();
      showToast('Demo report loaded');
    });
    $('resetBtn').addEventListener('click', () => {
      if (!window.confirm('Reset the report? This clears everything except your theme.')) return;
      state = normalize({ theme: state.theme, seenGuide: true });
      renderAll();
      save();
      showToast('Report reset');
    });

    // setup fields
    [
      ['fBusiness', 'business'],
      ['fDate', 'reportDate'],
      ['fAudience', 'audience'],
      ['fSummary', 'summary'],
    ].forEach(([id, key]) => {
      $(id).addEventListener('input', (e) => {
        state[key] = e.target.value;
        renderDerived();
        scheduleSave();
      });
    });
    $('fPeriod').addEventListener('change', (e) => {
      state.period = e.target.value === 'weekly' ? 'weekly' : 'daily';
      renderDerived();
      scheduleSave();
    });

    // list editors
    bindList('metricList', 'metrics', 'Metric');
    bindList('winList', 'wins', 'Win');
    bindList('riskList', 'risks', 'Risk');
    bindList('decisionList', 'decisions', 'Decision');
    bindList('actionList', 'actions', 'Action');

    // add buttons
    $('addMetric').addEventListener('click', () => addItem('metrics', { id: uid(), name: '', format: 'number', value: null, prior: null, direction: 'up' }, '[data-field="name"]'));
    $('addWin').addEventListener('click', () => addItem('wins', { id: uid(), text: '' }));
    $('addRisk').addEventListener('click', () => addItem('risks', { id: uid(), text: '', severity: 'medium' }));
    $('addDecision').addEventListener('click', () => addItem('decisions', { id: uid(), text: '', owner: '', due: '' }));
    $('addAction').addEventListener('click', () => addItem('actions', { id: uid(), text: '', owner: '', done: false }, '[data-field="text"]'));

    // exports
    $('copyMdBtn').addEventListener('click', copyMarkdown);
    $('downloadMdBtn').addEventListener('click', () => {
      download(`owner-report-${fileStamp()}.md`, buildMarkdown(), 'text/markdown');
      showToast('Markdown downloaded');
    });
    $('downloadCsvBtn').addEventListener('click', () => {
      if (!state.metrics.length) { showToast('No metrics to export yet'); return; }
      download(`owner-report-metrics-${fileStamp()}.csv`, buildCSV(), 'text/csv');
      showToast('Metrics CSV downloaded');
    });
    $('downloadJsonBtn').addEventListener('click', () => {
      download(`owner-report-${fileStamp()}.json`, JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2), 'application/json');
      showToast('JSON backup downloaded');
    });
    $('importJsonBtn').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      file.text().then((text) => {
        const parsed = JSON.parse(text);
        state = normalize(parsed);
        state.seenGuide = true;
        renderAll();
        save();
        showToast('Report imported');
      }).catch(() => showToast('Import failed — not a valid report JSON'));
    });
    $('printBtn').addEventListener('click', () => window.print());
    $('printBtn2').addEventListener('click', () => window.print());

    // keyboard
    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement ? document.activeElement.tagName : '';
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === '?' && !typing) {
        e.preventDefault();
        openHelp();
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        copyMarkdown();
      }
    });

    window.addEventListener('beforeunload', save);
  }

  // ---------------------------------------------------------------- init
  function init() {
    wire();
    renderAll();
    if (!state.seenGuide) {
      state.seenGuide = true;
      save();
      openHelp();
    }
  }

  init();
})();
