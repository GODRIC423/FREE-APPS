/* Lead Leak Radar — remake.
   Channel-by-channel leak audit with severity scoring, monthly $ leak math,
   a prioritized fix plan, and an exportable radar report.
   Local-first: state lives in localStorage only. All outputs are drafts. */
(() => {
  'use strict';

  // ---------- Constants ----------
  const STORAGE_KEY = 'fable-remake:day-02-lead-leak-radar:v1';
  const WEEKS_PER_MONTH = 4.33;
  const MAX_CHANNELS = 40;

  const EFFORT_LABEL = { 1: 'Low', 2: 'Medium', 3: 'High' };

  // Channel-type templates: audit check, first fix, proof metric, effort, defaults.
  const TYPES = {
    calls: {
      label: 'Missed & after-hours calls', effort: 1,
      check: 'Pull two weeks of call logs; count unanswered, voicemail-only, and after-hours calls.',
      fix: 'Stand up a daily missed-call queue with a named same-day callback owner and a draft callback text.',
      proof: 'Callback rate within one business hour; recovered bookings per week.',
      defaults: { weeklyVolume: 20, leakRate: 30, delayHours: 12, avgValue: 500, confidence: 70 }
    },
    forms: {
      label: 'Website forms & quote requests', effort: 1,
      check: 'Submit a test form; time the first human response and check where notifications actually land.',
      fix: 'Route every form to one named owner with a visible first-response timer (target under one hour).',
      proof: 'Median form-to-first-reply time; stale forms older than 24 hours.',
      defaults: { weeklyVolume: 10, leakRate: 20, delayHours: 8, avgValue: 500, confidence: 70 }
    },
    inbox: {
      label: 'Shared email inbox', effort: 2,
      check: 'Search unread, unassigned, and older-than-24h threads that contain a customer request.',
      fix: 'Add a twice-daily triage pass with labels plus an end-of-day unresolved-request report.',
      proof: 'Open request count trend; threads resolved within 24 hours.',
      defaults: { weeklyVolume: 15, leakRate: 15, delayHours: 24, avgValue: 450, confidence: 60 }
    },
    booking: {
      label: 'Online booking drop-off', effort: 2,
      check: 'Walk the booking flow on a phone; note abandonment points, unclear slots, and dead ends.',
      fix: 'Add a fallback "request a callback" path and draft follow-ups for abandoned bookings.',
      proof: 'Abandoned-booking count; saved appointments per week.',
      defaults: { weeklyVolume: 8, leakRate: 15, delayHours: 6, avgValue: 450, confidence: 60 }
    },
    quotes: {
      label: 'Sent quotes with no follow-up', effort: 1,
      check: 'List quotes sent in the last 60 days with zero follow-up touches after day three.',
      fix: 'Create a three-touch follow-up ladder (day 2, day 7, day 14) with draft messages for owner review.',
      proof: 'Quotes chased vs. ignored; win rate on chased quotes.',
      defaults: { weeklyVolume: 6, leakRate: 35, delayHours: 72, avgValue: 1200, confidence: 70 }
    },
    social: {
      label: 'Social & messaging DMs', effort: 2,
      check: 'Check response times across Google Business messages, Instagram/Facebook DMs, and WhatsApp for two weeks.',
      fix: 'Consolidate DMs into one daily check with saved reply drafts for the five most common questions.',
      proof: 'DM first-response time; conversations moved to a call or booking.',
      defaults: { weeklyVolume: 10, leakRate: 25, delayHours: 18, avgValue: 400, confidence: 60 }
    },
    custom: {
      label: 'Custom channel', effort: 2,
      check: 'Audit the handoff where this lead waits or changes owner; find exactly where it goes quiet.',
      fix: 'Assign one owner, one response timer, and one draft-only follow-up lane.',
      proof: 'Lost-lead count before and after; recovery attempts logged.',
      defaults: { weeklyVolume: 10, leakRate: 20, delayHours: 12, avgValue: 500, confidence: 60 }
    }
  };

  const BANDS = [
    { min: 65, key: 'critical', label: 'Critical' },
    { min: 45, key: 'high', label: 'High' },
    { min: 25, key: 'moderate', label: 'Moderate' },
    { min: 0, key: 'low', label: 'Low' }
  ];

  const DEMO = {
    profile: {
      name: 'Summit Heating & Air',
      type: 'HVAC',
      closeRate: 35,
      recoveryRate: 40,
      proofNote: 'Owner wants a daily missed-lead list, who approved each follow-up, and how many booked jobs came back.'
    },
    channels: [
      { id: 'demo-calls', type: 'calls', name: 'After-hours & missed calls', weeklyVolume: 24, leakRate: 34, delayHours: 14, avgValue: 680, confidence: 85 },
      { id: 'demo-quotes', type: 'quotes', name: 'Sent quotes never chased', weeklyVolume: 7, leakRate: 45, delayHours: 96, avgValue: 1450, confidence: 70 },
      { id: 'demo-forms', type: 'forms', name: 'Website quote form', weeklyVolume: 12, leakRate: 22, delayHours: 9, avgValue: 720, confidence: 75 },
      { id: 'demo-inbox', type: 'inbox', name: 'Shared office inbox', weeklyVolume: 16, leakRate: 18, delayHours: 26, avgValue: 540, confidence: 60 },
      { id: 'demo-booking', type: 'booking', name: 'Online booking drop-off', weeklyVolume: 9, leakRate: 15, delayHours: 4, avgValue: 460, confidence: 55 }
    ]
  };

  // ---------- Tiny helpers ----------
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const money = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number.isFinite(v) ? v : 0);
  const fmt1 = (v) => (Number.isFinite(v) ? (Math.round(v * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 }) : '0');

  function clampNum(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback !== undefined ? fallback : min;
    return Math.min(max, Math.max(min, n));
  }
  function cleanStr(value, maxLen) {
    return typeof value === 'string' ? value.slice(0, maxLen) : '';
  }
  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  // ---------- State ----------
  function defaultState() {
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    return {
      v: 1,
      profile: { name: '', type: '', closeRate: 30, recoveryRate: 40, proofNote: '' },
      channels: [],
      ui: { theme: prefersLight ? 'light' : 'dark', seenGuide: false }
    };
  }

  function normalizeChannel(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const type = TYPES[raw.type] ? raw.type : 'custom';
    const d = TYPES[type].defaults;
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 64) : uid(),
      type,
      name: cleanStr(raw.name, 80),
      weeklyVolume: clampNum(raw.weeklyVolume, 0, 100000, d.weeklyVolume),
      leakRate: clampNum(raw.leakRate, 0, 100, d.leakRate),
      delayHours: clampNum(raw.delayHours, 0, 720, d.delayHours),
      avgValue: clampNum(raw.avgValue, 0, 1000000, d.avgValue),
      confidence: clampNum(raw.confidence, 0, 100, d.confidence)
    };
  }

  function normalize(raw) {
    const d = defaultState();
    if (!raw || typeof raw !== 'object') return d;
    const p = raw.profile && typeof raw.profile === 'object' ? raw.profile : {};
    const ui = raw.ui && typeof raw.ui === 'object' ? raw.ui : {};
    const channels = Array.isArray(raw.channels) ? raw.channels : [];
    return {
      v: 1,
      profile: {
        name: cleanStr(p.name, 80),
        type: cleanStr(p.type, 60),
        closeRate: clampNum(p.closeRate, 0, 100, d.profile.closeRate),
        recoveryRate: clampNum(p.recoveryRate, 0, 100, d.profile.recoveryRate),
        proofNote: cleanStr(p.proofNote, 300)
      },
      channels: channels.slice(0, MAX_CHANNELS).map(normalizeChannel).filter(Boolean),
      ui: {
        theme: ui.theme === 'light' ? 'light' : (ui.theme === 'dark' ? 'dark' : d.ui.theme),
        seenGuide: !!ui.seenGuide
      }
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return normalize(raw ? JSON.parse(raw) : null);
    } catch {
      return defaultState();
    }
  }

  let state = loadState();

  function saveNow() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage blocked/full */ }
  }
  const save = debounce(saveNow, 250);

  // ---------- Domain logic (pure) ----------
  function bandOf(score) {
    return BANDS.find((b) => score >= b.min) || BANDS[BANDS.length - 1];
  }

  function severityOf(channel, leakMonthly) {
    const leakPart = channel.leakRate * 0.5;                                  // 0-50
    const delayPart = Math.min(25, Math.log2(1 + channel.delayHours) * 3.6);  // 0-25
    const moneyPart = Math.min(25, leakMonthly / 300);                        // 0-25 ($7.5k/mo caps it)
    return clampNum(Math.round(leakPart + delayPart + moneyPart), 0, 100, 0);
  }

  function compute(st) {
    const closeRate = st.profile.closeRate / 100;
    const recoveryRate = st.profile.recoveryRate / 100;
    const channels = st.channels.map((ch, index) => {
      const tpl = TYPES[ch.type] || TYPES.custom;
      const lostMo = ch.weeklyVolume * WEEKS_PER_MONTH * (ch.leakRate / 100);
      const leakMo = lostMo * closeRate * ch.avgValue;
      const recMo = leakMo * recoveryRate;
      const weightedRec = recMo * (ch.confidence / 100);
      const severity = severityOf(ch, leakMo);
      return {
        ...ch, index, tpl, lostMo, leakMo, recMo, weightedRec,
        severity, band: bandOf(severity),
        priority: weightedRec / tpl.effort,
        quickWin: tpl.effort === 1 && recMo >= 300
      };
    });
    const totals = channels.reduce((acc, c) => {
      acc.lostMo += c.lostMo; acc.leakMo += c.leakMo; acc.recMo += c.recMo;
      return acc;
    }, { lostMo: 0, leakMo: 0, recMo: 0 });
    const bySeverity = [...channels].sort((a, b) => b.severity - a.severity || b.leakMo - a.leakMo);
    const byPriority = [...channels].sort((a, b) => b.priority - a.priority || b.severity - a.severity);
    const maxSev = bySeverity.length ? bySeverity[0].severity : 0;
    const avgSev = channels.length ? channels.reduce((s, c) => s + c.severity, 0) / channels.length : 0;
    const score = channels.length ? Math.round(maxSev * 0.55 + avgSev * 0.45) : 0;
    return { channels, bySeverity, byPriority, totals, score, scoreBand: bandOf(score) };
  }

  // ---------- Report builders ----------
  function displayName(ch) { return ch.name.trim() || 'Untitled channel'; }
  function bizName() { return state.profile.name.trim() || 'Local business'; }

  function buildMarkdown(c) {
    const p = state.profile;
    const lines = [];
    lines.push(`# Lead Leak Radar report — ${bizName()}`);
    lines.push('');
    lines.push('_Draft for human review — generated locally; no data left this browser._');
    lines.push('');
    lines.push(`- Prepared: ${new Date().toLocaleDateString()}`);
    if (p.type.trim()) lines.push(`- Business type: ${p.type.trim()}`);
    lines.push(`- Assumptions: ${p.closeRate}% close rate on answered leads · ${p.recoveryRate}% of leaked value recoverable · ${WEEKS_PER_MONTH} weeks/month`);
    lines.push('');
    lines.push('## Leak summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('| --- | --- |');
    lines.push(`| Channels audited | ${c.channels.length} |`);
    lines.push(`| Lost leads / month | ${fmt1(c.totals.lostMo)} |`);
    lines.push(`| Estimated monthly $ leak | ${money(c.totals.leakMo)} |`);
    lines.push(`| Recoverable / month | ${money(c.totals.recMo)} |`);
    lines.push(`| Radar severity | ${c.score}/100 (${c.scoreBand.label}) |`);
    lines.push('');
    lines.push('## Channel audit');
    lines.push('');
    if (!c.channels.length) {
      lines.push('No channels audited yet — add the places leads arrive (calls, forms, quotes, DMs).');
    } else {
      lines.push('| # | Channel | Severity | Lost/mo | Leak $/mo | Recoverable $/mo | Response delay |');
      lines.push('| --- | --- | --- | --- | --- | --- | --- |');
      c.bySeverity.forEach((ch, i) => {
        lines.push(`| ${i + 1} | ${displayName(ch)} | ${ch.band.label} (${ch.severity}/100) | ${fmt1(ch.lostMo)} | ${money(ch.leakMo)} | ${money(ch.recMo)} | ${ch.delayHours}h |`);
      });
      c.bySeverity.forEach((ch, i) => {
        lines.push('');
        lines.push(`### ${i + 1}. ${displayName(ch)} — ${ch.band.label} (${ch.severity}/100)`);
        lines.push(`- Volume: ${ch.weeklyVolume} inquiries/week · leak ${ch.leakRate}% · avg job ${money(ch.avgValue)} · confidence ${ch.confidence}%`);
        lines.push(`- Impact: ${fmt1(ch.lostMo)} lost leads/mo → ${money(ch.leakMo)}/mo leak · ${money(ch.recMo)}/mo recoverable`);
        lines.push(`- Audit check: ${ch.tpl.check}`);
        lines.push(`- First fix: ${ch.tpl.fix}`);
        lines.push(`- Proof metric: ${ch.tpl.proof}`);
      });
    }
    lines.push('');
    lines.push('## Prioritized fix plan (next 30 days)');
    lines.push('');
    if (!c.byPriority.length) {
      lines.push('Add channels to generate a plan.');
    } else {
      c.byPriority.forEach((ch, i) => {
        const win = ch.quickWin ? ' · **Quick win**' : '';
        lines.push(`${i + 1}. **${displayName(ch)}** — effort ${EFFORT_LABEL[ch.tpl.effort]}${win} · ~${money(ch.weightedRec)}/mo confidence-weighted recovery. First fix: ${ch.tpl.fix}`);
      });
    }
    lines.push('');
    lines.push('## Owner proof requirement');
    lines.push('');
    lines.push(p.proofNote.trim() || 'Not set — agree on the proof the owner needs before any fix ships.');
    lines.push('');
    lines.push('## Review boundary');
    lines.push('');
    lines.push('This report is a draft planning artifact. Lead Leak Radar makes no calls, sends no messages, and writes to no CRM — a human reviews and approves every customer-facing action.');
    return lines.join('\n');
  }

  function csvCell(v) { return `"${String(v ?? '').replace(/"/g, '""')}"`; }

  function buildCsv(c) {
    const head = ['Channel', 'Type', 'Weekly inquiries', 'Leak %', 'Response delay (h)', 'Avg job value', 'Confidence %', 'Lost leads/mo', 'Monthly leak $', 'Recoverable $/mo', 'Severity', 'Severity score'];
    const rows = c.bySeverity.map((ch) => [
      displayName(ch), ch.tpl.label, ch.weeklyVolume, ch.leakRate, ch.delayHours,
      Math.round(ch.avgValue), ch.confidence, fmt1(ch.lostMo), Math.round(ch.leakMo),
      Math.round(ch.recMo), ch.band.label, ch.severity
    ]);
    return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  }

  function buildPrintHtml(c) {
    const p = state.profile;
    const rows = c.bySeverity.map((ch, i) => `<tr>
      <td>${i + 1}</td><td>${esc(displayName(ch))}</td><td>${ch.band.label} (${ch.severity})</td>
      <td>${fmt1(ch.lostMo)}</td><td>${money(ch.leakMo)}</td><td>${money(ch.recMo)}</td><td>${ch.delayHours}h</td>
    </tr>`).join('');
    const plan = c.byPriority.map((ch) => `<li><strong>${esc(displayName(ch))}</strong> — effort ${EFFORT_LABEL[ch.tpl.effort]}${ch.quickWin ? ' · Quick win' : ''} · ~${money(ch.weightedRec)}/mo weighted recovery.<br>First fix: ${esc(ch.tpl.fix)}<br>Proof: ${esc(ch.tpl.proof)}</li>`).join('');
    return `
      <h1>Lead Leak Radar report — ${esc(bizName())}</h1>
      <p class="print-meta">Prepared ${esc(new Date().toLocaleDateString())}${p.type.trim() ? ` · ${esc(p.type.trim())}` : ''} · assumptions: ${p.closeRate}% close rate, ${p.recoveryRate}% recovery rate</p>
      <h2>Leak summary</h2>
      <table><tbody>
        <tr><th>Channels audited</th><td>${c.channels.length}</td></tr>
        <tr><th>Lost leads / month</th><td>${fmt1(c.totals.lostMo)}</td></tr>
        <tr><th>Estimated monthly $ leak</th><td>${money(c.totals.leakMo)}</td></tr>
        <tr><th>Recoverable / month</th><td>${money(c.totals.recMo)}</td></tr>
        <tr><th>Radar severity</th><td>${c.score}/100 (${c.scoreBand.label})</td></tr>
      </tbody></table>
      <h2>Channel audit</h2>
      ${c.channels.length ? `<table><thead><tr><th>#</th><th>Channel</th><th>Severity</th><th>Lost/mo</th><th>Leak $/mo</th><th>Recoverable</th><th>Delay</th></tr></thead><tbody>${rows}</tbody></table>` : '<p>No channels audited yet.</p>'}
      <h2>Prioritized fix plan (next 30 days)</h2>
      ${c.byPriority.length ? `<ol>${plan}</ol>` : '<p>Add channels to generate a plan.</p>'}
      <h2>Owner proof requirement</h2>
      <p>${esc(p.proofNote.trim() || 'Not set.')}</p>
      <p class="print-boundary">Draft for human review — this report was generated locally; no calls, messages, or CRM writes were made.</p>`;
  }

  // ---------- Render ----------
  function applyTheme() {
    document.documentElement.dataset.theme = state.ui.theme;
    $('themeToggle').setAttribute('aria-pressed', state.ui.theme === 'light' ? 'true' : 'false');
  }

  function renderProfileInputs() {
    $('bizName').value = state.profile.name;
    $('bizType').value = state.profile.type;
    $('closeRate').value = state.profile.closeRate;
    $('recoveryRate').value = state.profile.recoveryRate;
    $('proofNote').value = state.profile.proofNote;
  }

  function badgeHtml(ch) {
    return `<i class="dot sev-${ch.band.key}" aria-hidden="true"></i>${ch.band.label} ${ch.severity}`;
  }

  function typeOptions(selected) {
    return Object.entries(TYPES)
      .map(([key, t]) => `<option value="${key}"${key === selected ? ' selected' : ''}>${esc(t.label)}</option>`)
      .join('');
  }

  function channelComputedHtml(ch) {
    return `<b>${fmt1(ch.lostMo)}</b> lost/mo &middot; <b>${money(ch.leakMo)}</b> leak/mo &middot; <b>${money(ch.recMo)}</b> recoverable/mo`;
  }

  function renderChannels(c) {
    const list = $('channelList');
    if (!state.channels.length) {
      list.innerHTML = `
        <div class="empty-state">
          <p>No channels yet. Add every place leads arrive — missed calls, web forms, sent quotes, DMs — and the radar quantifies what each one is costing.</p>
          <div class="empty-actions">
            <button class="btn btn-primary" type="button" data-act="empty-add">Add first channel</button>
            <button class="btn" type="button" data-act="empty-demo">Load demo</button>
          </div>
        </div>`;
      return;
    }
    const byId = new Map(c.channels.map((ch) => [ch.id, ch]));
    list.innerHTML = state.channels.map((raw) => {
      const ch = byId.get(raw.id);
      return `
      <article class="channel-card" data-id="${esc(ch.id)}">
        <div class="channel-head">
          <span class="sev-badge" data-role="badge">${badgeHtml(ch)}</span>
          <input class="channel-name${ch.name.trim() ? '' : ' invalid'}" type="text" maxlength="80" data-field="name"
                 value="${esc(ch.name)}" placeholder="Channel name (required)" aria-label="Channel name" />
          <button class="channel-del" type="button" data-act="del" aria-label="Delete channel ${esc(displayName(ch))}">&#10005;</button>
        </div>
        <div class="channel-grid">
          <label>Type
            <select data-field="type" aria-label="Channel type">${typeOptions(ch.type)}</select>
          </label>
          <label>Inquiries / week
            <input type="number" min="0" max="100000" step="1" inputmode="numeric" data-field="weeklyVolume" value="${ch.weeklyVolume}" />
          </label>
          <label>Leak %
            <input type="number" min="0" max="100" step="1" inputmode="numeric" data-field="leakRate" value="${ch.leakRate}" />
          </label>
          <label>Response delay (h)
            <input type="number" min="0" max="720" step="1" inputmode="numeric" data-field="delayHours" value="${ch.delayHours}" />
          </label>
          <label>Avg job value $
            <input type="number" min="0" max="1000000" step="10" inputmode="numeric" data-field="avgValue" value="${ch.avgValue}" />
          </label>
          <label>Confidence %
            <input type="number" min="0" max="100" step="5" inputmode="numeric" data-field="confidence" value="${ch.confidence}" />
          </label>
        </div>
        <p class="channel-computed" data-role="computed">${channelComputedHtml(ch)}</p>
      </article>`;
    }).join('');
  }

  function refreshChannelCards(c) {
    const byId = new Map(c.channels.map((ch) => [ch.id, ch]));
    $('channelList').querySelectorAll('.channel-card').forEach((card) => {
      const ch = byId.get(card.dataset.id);
      if (!ch) return;
      const badge = card.querySelector('[data-role="badge"]');
      const computed = card.querySelector('[data-role="computed"]');
      if (badge) badge.innerHTML = badgeHtml(ch);
      if (computed) computed.innerHTML = channelComputedHtml(ch);
      const nameInput = card.querySelector('[data-field="name"]');
      if (nameInput) nameInput.classList.toggle('invalid', !nameInput.value.trim());
    });
  }

  function renderStats(c) {
    $('statLost').textContent = c.channels.length ? fmt1(c.totals.lostMo) : '0';
    $('statLeak').textContent = money(c.totals.leakMo);
    $('statRecoverable').textContent = money(c.totals.recMo);
    $('statScore').textContent = String(c.score);
    $('statScoreBand').textContent = c.channels.length ? `radar severity — ${c.scoreBand.label.toLowerCase()}` : 'radar severity';
  }

  function renderRadar(c) {
    const CX = 230, CY = 230, R_MIN = 36, R_MAX = 190;
    const radiusFor = (severity) => R_MIN + (100 - severity) * ((R_MAX - R_MIN) / 100);
    const parts = [];
    // sweep wedge (decorative; CSS-animated, disabled under reduced motion)
    parts.push(`<path class="sweep" d="M${CX} ${CY} L${CX} ${CY - R_MAX} A${R_MAX} ${R_MAX} 0 0 1 ${(CX + R_MAX * Math.sin(Math.PI / 4)).toFixed(1)} ${(CY - R_MAX * Math.cos(Math.PI / 4)).toFixed(1)} Z" aria-hidden="true"></path>`);
    // rings at severity band thresholds + outer ring
    [65, 45, 25, 0].forEach((sev) => {
      const r = radiusFor(sev);
      parts.push(`<circle class="ring" cx="${CX}" cy="${CY}" r="${r.toFixed(1)}"></circle>`);
      if (sev > 0) parts.push(`<text class="ring-label" x="${CX + 4}" y="${(CY - r + 12).toFixed(1)}">${sev}</text>`);
    });
    parts.push(`<line class="cross" x1="${CX}" y1="${CY - R_MAX}" x2="${CX}" y2="${CY + R_MAX}"></line>`);
    parts.push(`<line class="cross" x1="${CX - R_MAX}" y1="${CY}" x2="${CX + R_MAX}" y2="${CY}"></line>`);

    if (!c.channels.length) {
      parts.push(`<text class="radar-empty" x="${CX}" y="${CY - 8}" text-anchor="middle">Nothing on the scope yet.</text>`);
      parts.push(`<text class="radar-empty" x="${CX}" y="${CY + 14}" text-anchor="middle">Add channels or load the demo to start the scan.</text>`);
      $('radarSvg').innerHTML = parts.join('');
      $('radarSummary').textContent = 'No channels scanned yet';
      return;
    }

    const n = c.channels.length;
    // draw cooler blips first so hotter ones sit on top
    [...c.channels].sort((a, b) => a.severity - b.severity).forEach((ch) => {
      const angle = ((-90 + ch.index * (360 / n)) * Math.PI) / 180;
      const r = radiusFor(ch.severity);
      const x = CX + Math.cos(angle) * r;
      const y = CY + Math.sin(angle) * r;
      const blipR = 8 + Math.min(9, ch.leakMo / 900);
      const left = x < CX;
      const labelX = Math.min(452, Math.max(8, x + (left ? -(blipR + 7) : blipR + 7)));
      const labelY = Math.min(452, Math.max(14, y + 4));
      const name = displayName(ch);
      const shortName = name.length > 20 ? `${name.slice(0, 19)}…` : name;
      parts.push(`<g>
        <title>${esc(name)} — ${ch.band.label} ${ch.severity}/100 · ${money(ch.leakMo)}/mo leak · ${money(ch.recMo)}/mo recoverable</title>
        <circle class="blip" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${blipR.toFixed(1)}" fill="var(--sev-${ch.band.key})"></circle>
        <text class="blip-label" x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="${left ? 'end' : 'start'}">${esc(shortName)}</text>
      </g>`);
    });
    $('radarSvg').innerHTML = parts.join('');
    const hottest = c.bySeverity[0];
    $('radarSummary').textContent = `${n} channel${n === 1 ? '' : 's'} scanned · hottest: ${displayName(hottest)} (${hottest.band.label} ${hottest.severity})`;
  }

  function renderPlan(c) {
    const list = $('planList');
    if (!c.byPriority.length) {
      list.innerHTML = `<li class="empty-state"><p>The fix plan appears here once you add channels — ranked so you always know what to fix first.</p></li>`;
      return;
    }
    list.innerHTML = c.byPriority.map((ch, i) => `
      <li class="plan-item">
        <div class="plan-rank" aria-hidden="true">${i + 1}</div>
        <div class="plan-body">
          <div class="plan-top">
            <strong>${esc(displayName(ch))}</strong>
            <span class="sev-badge">${badgeHtml(ch)}</span>
            ${ch.quickWin ? '<span class="chip-win">Quick win</span>' : ''}
            <span class="plan-money">~${money(ch.weightedRec)}/mo weighted</span>
          </div>
          <p><b>First fix:</b> ${esc(ch.tpl.fix)}</p>
          <p><b>Audit check:</b> ${esc(ch.tpl.check)}</p>
          <p><b>Proof metric:</b> ${esc(ch.tpl.proof)}</p>
          <p class="plan-meta">Effort: ${EFFORT_LABEL[ch.tpl.effort]} · ${money(ch.recMo)}/mo recoverable at ${ch.confidence}% confidence</p>
        </div>
      </li>`).join('');
  }

  function updateDerived() {
    const c = compute(state);
    renderStats(c);
    renderRadar(c);
    renderPlan(c);
    refreshChannelCards(c);
    $('exportPreview').value = buildMarkdown(c);
    $('printReport').innerHTML = buildPrintHtml(c);
    return c;
  }

  function renderAll() {
    applyTheme();
    renderProfileInputs();
    renderChannels(compute(state));
    updateDerived();
  }

  // ---------- Toast ----------
  function toast(message, opts = {}) {
    const region = $('toastRegion');
    const item = document.createElement('div');
    item.className = 'toast-item';
    const text = document.createElement('span');
    text.textContent = message;
    item.appendChild(text);
    let timer;
    if (opts.undo) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toast-undo';
      btn.textContent = 'Undo';
      btn.addEventListener('click', () => { clearTimeout(timer); item.remove(); opts.undo(); });
      item.appendChild(btn);
    }
    region.appendChild(item);
    while (region.children.length > 3) region.firstElementChild.remove();
    timer = setTimeout(() => item.remove(), opts.undo ? 7000 : 2600);
  }

  // ---------- Clipboard & downloads ----------
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch { toast('Copy failed — select the preview text manually'); }
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
  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- Actions ----------
  function addChannel(type) {
    if (state.channels.length >= MAX_CHANNELS) { toast(`Channel limit reached (${MAX_CHANNELS})`); return; }
    const key = TYPES[type] ? type : 'custom';
    const tpl = TYPES[key];
    state.channels.push(normalizeChannel({ id: uid(), type: key, name: tpl.label, ...tpl.defaults }));
    renderChannels(compute(state));
    updateDerived();
    save();
    const card = $('channelList').lastElementChild;
    const nameInput = card && card.querySelector('[data-field="name"]');
    if (nameInput) { nameInput.focus(); nameInput.select(); }
    toast('Channel added');
  }

  function deleteChannel(id) {
    const index = state.channels.findIndex((ch) => ch.id === id);
    if (index === -1) return;
    const [removed] = state.channels.splice(index, 1);
    renderChannels(compute(state));
    updateDerived();
    save();
    toast(`Deleted "${displayName(removed)}"`, {
      undo: () => {
        state.channels.splice(Math.min(index, state.channels.length), 0, removed);
        renderChannels(compute(state));
        updateDerived();
        save();
        toast('Channel restored');
      }
    });
  }

  function loadDemo() {
    const ui = state.ui;
    state = normalize({ ...DEMO, ui });
    renderAll();
    saveNow();
    toast('Demo scenario loaded');
  }

  function resetAll() {
    if (!window.confirm('Reset Lead Leak Radar? This clears the profile and all channels from this browser.')) return;
    const ui = state.ui;
    state = defaultState();
    state.ui = ui;
    renderAll();
    saveNow();
    toast('Everything cleared');
  }

  function importStateFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const incoming = parsed && typeof parsed === 'object' && parsed.state ? parsed.state : parsed;
        const ui = state.ui;
        state = normalize(incoming);
        state.ui = { ...state.ui, theme: ui.theme, seenGuide: ui.seenGuide };
        renderAll();
        saveNow();
        toast('Import complete');
      } catch {
        toast('Import failed — not a valid Lead Leak Radar JSON file');
      }
    };
    reader.onerror = () => toast('Import failed — could not read the file');
    reader.readAsText(file);
  }

  function copyMarkdownReport() {
    copyText($('exportPreview').value, 'Markdown report copied');
  }

  // ---------- Help dialog ----------
  function openHelp() {
    const dialog = $('helpDialog');
    if (!dialog.open) dialog.showModal();
  }
  function closeHelp() {
    const dialog = $('helpDialog');
    if (dialog.open) dialog.close();
  }

  // ---------- Event wiring ----------
  function wireProfile() {
    $('bizName').addEventListener('input', (e) => { state.profile.name = cleanStr(e.target.value, 80); updateDerived(); save(); });
    $('bizType').addEventListener('input', (e) => { state.profile.type = cleanStr(e.target.value, 60); updateDerived(); save(); });
    $('proofNote').addEventListener('input', (e) => { state.profile.proofNote = cleanStr(e.target.value, 300); updateDerived(); save(); });
    ['closeRate', 'recoveryRate'].forEach((key) => {
      const input = $(key);
      input.addEventListener('input', () => {
        state.profile[key] = clampNum(input.value, 0, 100, state.profile[key]);
        updateDerived(); save();
      });
      input.addEventListener('change', () => { input.value = state.profile[key]; });
    });
  }

  function wireChannels() {
    const list = $('channelList');
    const NUM_FIELDS = {
      weeklyVolume: [0, 100000],
      leakRate: [0, 100],
      delayHours: [0, 720],
      avgValue: [0, 1000000],
      confidence: [0, 100]
    };
    list.addEventListener('input', (e) => {
      const field = e.target.dataset.field;
      const card = e.target.closest('[data-id]');
      if (!field || !card) return;
      const ch = state.channels.find((x) => x.id === card.dataset.id);
      if (!ch) return;
      if (field === 'name') {
        ch.name = cleanStr(e.target.value, 80);
      } else if (field === 'type') {
        ch.type = TYPES[e.target.value] ? e.target.value : 'custom';
      } else if (NUM_FIELDS[field]) {
        const [min, max] = NUM_FIELDS[field];
        ch[field] = clampNum(e.target.value, min, max, ch[field]);
      }
      updateDerived();
      save();
    });
    list.addEventListener('change', (e) => {
      const field = e.target.dataset.field;
      const card = e.target.closest('[data-id]');
      if (!field || !card || !NUM_FIELDS[field]) return;
      const ch = state.channels.find((x) => x.id === card.dataset.id);
      if (ch) e.target.value = ch[field];
    });
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'del') {
        const card = btn.closest('[data-id]');
        if (card) deleteChannel(card.dataset.id);
      } else if (act === 'empty-add') {
        addChannel($('addChannelType').value);
      } else if (act === 'empty-demo') {
        loadDemo();
      }
    });
    $('addChannelBtn').addEventListener('click', () => addChannel($('addChannelType').value));
  }

  function wireHeader() {
    $('demoBtn').addEventListener('click', loadDemo);
    $('resetBtn').addEventListener('click', resetAll);
    $('helpBtn').addEventListener('click', openHelp);
    $('themeToggle').addEventListener('click', () => {
      state.ui.theme = state.ui.theme === 'light' ? 'dark' : 'light';
      applyTheme();
      saveNow();
      toast(`${state.ui.theme === 'light' ? 'Light' : 'Dark'} theme on`);
    });
  }

  function wireExport() {
    $('copyMdBtn').addEventListener('click', copyMarkdownReport);
    $('downloadJsonBtn').addEventListener('click', () => {
      const c = compute(state);
      const payload = {
        app: 'lead-leak-radar',
        exportedAt: new Date().toISOString(),
        state: { v: state.v, profile: state.profile, channels: state.channels },
        derived: {
          totals: { lostLeadsPerMonth: Math.round(c.totals.lostMo * 10) / 10, monthlyLeak: Math.round(c.totals.leakMo), recoverablePerMonth: Math.round(c.totals.recMo) },
          radarSeverity: c.score,
          rankedBySeverity: c.bySeverity.map((ch) => ({
            id: ch.id, name: displayName(ch), severity: ch.severity, band: ch.band.label,
            monthlyLeak: Math.round(ch.leakMo), recoverable: Math.round(ch.recMo)
          }))
        },
        boundary: 'Draft planning artifact for human review — no external actions were performed.'
      };
      download('lead-leak-radar.json', JSON.stringify(payload, null, 2), 'application/json');
      toast('JSON downloaded');
    });
    $('importBtn').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) importStateFile(file);
      e.target.value = '';
    });
    $('downloadCsvBtn').addEventListener('click', () => {
      download('lead-leak-radar-channels.csv', buildCsv(compute(state)), 'text/csv');
      toast('CSV downloaded');
    });
    $('printBtn').addEventListener('click', () => window.print());
  }

  function wireHelp() {
    const dialog = $('helpDialog');
    $('helpClose').addEventListener('click', closeHelp);
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) closeHelp(); // backdrop click
    });
  }

  function wireKeyboard() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        copyMarkdownReport();
        return;
      }
      const typing = /^(input|textarea|select)$/i.test(e.target.tagName || '');
      if (e.key === '?' && !typing) {
        e.preventDefault();
        openHelp();
      }
      // Escape closes the <dialog> natively; focus returns to the opener.
    });
  }

  // ---------- Init ----------
  function populateAddSelect() {
    $('addChannelType').innerHTML = typeOptions('calls');
  }

  function init() {
    applyTheme();
    populateAddSelect();
    wireHeader();
    wireProfile();
    wireChannels();
    wireExport();
    wireHelp();
    wireKeyboard();
    renderAll();
    if (!state.ui.seenGuide) {
      state.ui.seenGuide = true;
      saveNow();
      openHelp();
    }
  }

  init();
})();
