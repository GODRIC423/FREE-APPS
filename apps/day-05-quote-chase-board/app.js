/* Quote Chase Board — track outstanding quotes and drive follow-ups.
   Local-first, draft-only: nothing is ever sent from this app. */
(() => {
  'use strict';

  /* ================= constants ================= */

  const LS_KEY = 'fable-remake:quote-chase-board:v1';
  const AGING_DAYS = 4;   // days since last touch before a quote is "aging"
  const STALE_DAYS = 8;   // days since last touch before a quote is "stale"
  const UNDO_MS = 7000;

  const STAGES = [
    { key: 'draft', label: 'Draft', hint: 'Not sent yet' },
    { key: 'sent', label: 'Sent', hint: 'Waiting on customer' },
    { key: 'negotiating', label: 'Negotiating', hint: 'In conversation' },
    { key: 'won', label: 'Won', hint: 'Accepted' },
    { key: 'lost', label: 'Lost', hint: 'Closed out' }
  ];
  const STAGE_KEYS = STAGES.map(s => s.key);
  const OPEN_STAGES = ['draft', 'sent', 'negotiating'];
  const LEGACY_STAGES = { unsent: 'draft', stale: 'sent' };
  const TONES = ['friendly', 'direct', 'final'];

  /* ================= tiny utils ================= */

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = v => new Intl.NumberFormat('en-US',
    { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(v) || 0);
  const clamp = (v, min, max) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
  };
  const uid = () => (crypto.randomUUID
    ? crypto.randomUUID()
    : `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const isoOf = d =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayIso = () => isoOf(new Date());
  const isoShift = days => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return isoOf(d);
  };
  const isIsoDate = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
  /** Days from today to an ISO date: negative = past, 0 = today, positive = future. */
  const daysFromToday = iso => {
    if (!isIsoDate(iso)) return null;
    const a = new Date(`${todayIso()}T00:00:00`);
    const b = new Date(`${iso}T00:00:00`);
    return Math.round((b - a) / 86400000);
  };
  const fmtDate = iso => {
    if (!isIsoDate(iso)) return '—';
    return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };
  const debounce = (fn, ms) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  };

  /* ================= state ================= */

  const defaultState = () => ({
    version: 1,
    theme: '',
    seenGuide: false,
    tone: 'friendly',
    selectedId: null,
    quotes: []
  });

  function normalizeQuote(raw) {
    const q = (raw && typeof raw === 'object') ? raw : {};
    let stage = String(q.stage ?? q.status ?? 'draft').toLowerCase();
    stage = LEGACY_STAGES[stage] || stage;
    if (!STAGE_KEYS.includes(stage)) stage = 'draft';
    const lastTouch = q.lastTouch ?? q.lastTouched;
    return {
      id: typeof q.id === 'string' && q.id ? q.id : uid(),
      customer: String(q.customer ?? '').slice(0, 120),
      contact: String(q.contact ?? '').slice(0, 80),
      owner: String(q.owner ?? '').slice(0, 60),
      value: clamp(q.value, 0, 99999999),
      probability: clamp(q.probability, 0, 100),
      stage,
      lastTouch: isIsoDate(lastTouch) ? lastTouch : todayIso(),
      followUp: isIsoDate(q.followUp) ? q.followUp : '',
      notes: String(q.notes ?? q.note ?? '').slice(0, 600)
    };
  }

  function normalize(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== 'object') return base;
    base.theme = raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : '';
    base.seenGuide = raw.seenGuide === true;
    base.tone = TONES.includes(raw.tone) ? raw.tone : 'friendly';
    base.quotes = Array.isArray(raw.quotes) ? raw.quotes.slice(0, 500).map(normalizeQuote) : [];
    base.selectedId = base.quotes.some(q => q.id === raw.selectedId) ? raw.selectedId : null;
    return base;
  }

  function load() {
    try {
      return normalize(JSON.parse(localStorage.getItem(LS_KEY) || 'null'));
    } catch {
      return defaultState();
    }
  }

  let state = load();

  const save = () => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage blocked */ }
  };
  const scheduleSave = debounce(save, 250);

  const selected = () => state.quotes.find(q => q.id === state.selectedId) || null;
  const isOpen = q => OPEN_STAGES.includes(q.stage);

  /* ================= domain logic (pure) ================= */

  function daysSinceTouch(q) {
    const d = daysFromToday(q.lastTouch);
    return d === null ? 0 : Math.max(0, -d);
  }

  /** Staleness for open quotes: fresh (<4d), aging (4–7d), stale (8d+). */
  function staleness(q) {
    if (!isOpen(q)) return null;
    const days = daysSinceTouch(q);
    if (days >= STALE_DAYS) return { level: 'stale', days };
    if (days >= AGING_DAYS) return { level: 'aging', days };
    return { level: 'fresh', days };
  }

  /** Follow-up due status for open quotes with a due date. */
  function followUpInfo(q) {
    if (!isOpen(q) || !q.followUp) return null;
    const days = daysFromToday(q.followUp);
    if (days === null) return null;
    if (days < 0) return { cls: 'overdue', label: `${-days}d overdue`, days };
    if (days === 0) return { cls: 'due', label: 'due today', days };
    return { cls: 'ahead', label: `due in ${days}d`, days };
  }

  const weightedValue = q => q.value * (q.probability / 100);

  function computeStats(quotes) {
    const open = quotes.filter(isOpen);
    const staleQs = open.filter(q => staleness(q).level === 'stale');
    const dueQs = open.filter(q => { const f = followUpInfo(q); return f && f.days <= 0; });
    const overdueQs = open.filter(q => { const f = followUpInfo(q); return f && f.days < 0; });
    return {
      openCount: open.length,
      openValue: open.reduce((s, q) => s + q.value, 0),
      weighted: open.reduce((s, q) => s + weightedValue(q), 0),
      dueNow: dueQs.length,
      overdue: overdueQs.length,
      staleCount: staleQs.length,
      staleValue: staleQs.reduce((s, q) => s + q.value, 0),
      wonValue: quotes.filter(q => q.stage === 'won').reduce((s, q) => s + q.value, 0)
    };
  }

  /** Open quotes ordered by chase urgency: most-overdue follow-up first, then weighted value. */
  function chaseQueue(quotes) {
    return quotes.filter(isOpen).slice().sort((a, b) => {
      const fa = a.followUp ? daysFromToday(a.followUp) : 999;
      const fb = b.followUp ? daysFromToday(b.followUp) : 999;
      if (fa !== fb) return fa - fb;
      return weightedValue(b) - weightedValue(a);
    });
  }

  const stageLabel = key => (STAGES.find(s => s.key === key) || { label: key }).label;

  /** Draft-only follow-up note built from the quote's stage, age, value, and tone. */
  function buildFollowUpNote(q, tone) {
    const name = q.contact.trim() || '[first name]';
    const job = q.customer.trim() || 'your project';
    const val = q.value > 0 ? money(q.value) : '[amount]';
    const owner = q.owner.trim() || '[your name]';
    const since = daysSinceTouch(q);
    const ago = since <= 0 ? 'earlier today' : since === 1 ? 'yesterday' : `${since} days ago`;
    const lines = [];

    if (q.stage === 'draft') {
      lines.push(
        `Subject: Your quote for ${job}`,
        '',
        `Hi ${name},`,
        '',
        `Thanks for the chance to quote ${job}. The estimate comes to ${val} — I've broken out the scope so you can see exactly what's included.`,
        `If anything looks off, or you'd like a different option, just reply and I'll adjust it.`,
        '',
        `Is there anything you'd like me to walk through before you decide?`,
        '',
        `Thanks,`,
        owner
      );
    } else if (tone === 'direct') {
      lines.push(
        `Subject: Quick decision check — ${job}`,
        '',
        `Hi ${name},`,
        '',
        `Following up on the ${job} quote (${val}), last discussed ${ago}.`,
        `Could you let me know which of these fits best? A one-line reply is fine:`,
        `1. Ready to go ahead`,
        `2. Need a change or have a question`,
        `3. Not moving forward — we'll close the file`,
        '',
        `Either way, thanks for letting us know where it stands.`,
        '',
        owner
      );
    } else if (tone === 'final') {
      lines.push(
        `Subject: Closing the file on ${job}?`,
        '',
        `Hi ${name},`,
        '',
        `This is my last check-in on the ${job} quote (${val}) — I don't want to keep nudging if the timing isn't right.`,
        `If I don't hear back by ${fmtDate(isoShift(5))}, I'll close the file for now. You're welcome to reopen it any time.`,
        '',
        `Thanks for considering us either way.`,
        '',
        owner
      );
    } else { // friendly
      lines.push(
        `Subject: Checking in on ${job}`,
        '',
        `Hi ${name},`,
        '',
        `Just checking in on the quote for ${job} (${val}) we ${q.stage === 'negotiating' ? 'last talked about' : 'sent over'} ${ago}.`,
        `No rush at all — I wanted to see if any questions came up, or if anything in the scope has changed since then.`,
        '',
        `Happy to hop on a quick call this week if that's easier.`,
        '',
        `Best,`,
        owner
      );
    }
    return lines.join('\n');
  }

  /** Main artifact: the chase plan as Markdown. */
  function buildMarkdown() {
    const t = computeStats(state.quotes);
    const queue = chaseQueue(state.quotes);
    const L = [
      '# Quote chase plan',
      '',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      '> Draft-only boundary: this board never contacts customers. A human reviews price, schedule, and claims before anything is sent.',
      '',
      '## Pipeline stats',
      `- Open pipeline: ${money(t.openValue)} across ${t.openCount} quote${t.openCount === 1 ? '' : 's'}`,
      `- Weighted value: ${money(t.weighted)}`,
      `- Follow-ups due now: ${t.dueNow} (${t.overdue} overdue)`,
      `- Stale quotes (${STALE_DAYS}d+ since touch): ${t.staleCount} — ${money(t.staleValue)} at risk`,
      `- Won value on the board: ${money(t.wonValue)}`,
      '',
      '## Chase queue (most urgent first)'
    ];
    if (!queue.length) L.push('', '_No open quotes. Add a quote or load the demo._');
    queue.forEach((q, i) => {
      const st = staleness(q);
      const fu = followUpInfo(q);
      L.push(
        '',
        `### ${i + 1}. ${q.customer || 'Untitled quote'}`,
        `- Value: ${money(q.value)} at ${q.probability}% → ${money(weightedValue(q))} weighted`,
        `- Stage: ${stageLabel(q.stage)} · Owner: ${q.owner || 'unassigned'}`,
        `- Last touch: ${q.lastTouch} (${st.days}d ago — ${st.level})`,
        `- Follow-up: ${q.followUp || 'not set'}${fu ? ` (${fu.label})` : ''}`
      );
      if (q.notes.trim()) L.push(`- Notes: ${q.notes.trim().replace(/\s+/g, ' ')}`);
      if (i < 3) {
        L.push('- Draft note (review before sending):');
        buildFollowUpNote(q, state.tone).split('\n').forEach(line => L.push(`  > ${line}`));
      }
    });
    L.push('', '## Board snapshot');
    STAGES.forEach(s => {
      const qs = state.quotes.filter(q => q.stage === s.key);
      const total = qs.reduce((sum, q) => sum + q.value, 0);
      L.push('', `### ${s.label} (${qs.length} · ${money(total)})`);
      qs.forEach(q => L.push(`- ${q.customer || 'Untitled'} — ${money(q.value)} · ${q.probability}% · ${q.owner || 'unassigned'}`));
      if (!qs.length) L.push('- none');
    });
    return L.join('\n');
  }

  function buildCsv() {
    const header = ['customer', 'contact', 'owner', 'value', 'probability_pct', 'weighted_value',
      'stage', 'last_touch', 'days_since_touch', 'staleness', 'follow_up', 'follow_up_status', 'notes'];
    const rows = state.quotes.map(q => {
      const st = staleness(q);
      const fu = followUpInfo(q);
      return [q.customer, q.contact, q.owner, q.value, q.probability, Math.round(weightedValue(q)),
        q.stage, q.lastTouch, st ? st.days : '', st ? st.level : '', q.followUp, fu ? fu.label : '', q.notes];
    });
    return [header, ...rows]
      .map(row => row.map(cell => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\r\n');
  }

  /* ================= render ================= */

  function renderStats() {
    const t = computeStats(state.quotes);
    $('statOpenValue').textContent = money(t.openValue);
    $('statOpenCount').textContent = `${t.openCount} open quote${t.openCount === 1 ? '' : 's'}`;
    $('statWeighted').textContent = money(t.weighted);
    $('statDueNow').textContent = String(t.dueNow);
    $('statOverdue').textContent = `${t.overdue} overdue`;
    $('statStale').textContent = String(t.staleCount);
    $('statStaleValue').textContent = `${money(t.staleValue)} at risk`;
  }

  function cardHtml(q) {
    const st = staleness(q);
    const fu = followUpInfo(q);
    const chips = [];
    if (st) chips.push(`<span class="chip chip-${st.level}">${st.days}d since touch</span>`);
    if (fu) chips.push(`<span class="chip chip-${fu.cls}">${esc(fu.label)}</span>`);
    if (q.owner) chips.push(`<span class="chip chip-owner">${esc(q.owner)}</span>`);
    return `<button type="button" class="quote-card" data-id="${esc(q.id)}" aria-pressed="${q.id === state.selectedId}">
      <strong>${esc(q.customer) || '<em>Untitled quote</em>'}</strong>
      <span class="card-value">${money(q.value)} · ${q.probability}%</span>
      ${chips.length ? `<span class="card-chips">${chips.join('')}</span>` : ''}
    </button>`;
  }

  function renderBoard() {
    const board = $('board');
    if (!state.quotes.length) {
      board.innerHTML = `<div class="empty-state board-empty">
        <p>No quotes on the board yet.</p>
        <p class="empty-hint">Add the quotes you're waiting on, or load the demo to see how the board works.</p>
        <span class="panel-actions">
          <button type="button" class="btn-primary" data-action="new">+ New quote</button>
          <button type="button" class="btn" data-action="demo">Load demo</button>
        </span>
      </div>`;
      return;
    }
    const queue = chaseQueue(state.quotes);
    board.innerHTML = STAGES.map(s => {
      const qs = OPEN_STAGES.includes(s.key)
        ? queue.filter(q => q.stage === s.key)
        : state.quotes.filter(q => q.stage === s.key);
      const total = qs.reduce((sum, q) => sum + q.value, 0);
      return `<section class="lane" aria-label="${esc(s.label)} lane">
        <div class="lane-head"><h3>${esc(s.label)}</h3><small>${qs.length} · ${money(total)}</small></div>
        ${qs.map(cardHtml).join('') || `<p class="lane-empty">${esc(s.hint)}</p>`}
      </section>`;
    }).join('');
  }

  function renderEditor() {
    const q = selected();
    $('editorEmpty').hidden = !!q;
    $('editorForm').hidden = !q;
    if (!q) {
      $('editorSub').textContent = 'Select a quote on the board.';
      return;
    }
    $('editorSub').textContent = `Editing: ${q.customer || 'Untitled quote'}`;
    $('fCustomer').value = q.customer;
    $('fContact').value = q.contact;
    $('fOwner').value = q.owner;
    $('fValue').value = q.value;
    $('fProbability').value = q.probability;
    $('fStage').value = q.stage;
    $('fLastTouch').value = q.lastTouch;
    $('fFollowUp').value = q.followUp;
    $('fNotes').value = q.notes;
    validateCustomer();
  }

  function validateCustomer() {
    const input = $('fCustomer');
    const bad = !!selected() && !input.value.trim();
    input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    $('customerError').hidden = !bad;
  }

  function renderFollowUpMeta() {
    const q = selected();
    $('followUpEmpty').hidden = !!q;
    $('followUpBody').hidden = !q;
    if (!q) return;
    const st = staleness(q);
    const fu = followUpInfo(q);
    const bits = [`${stageLabel(q.stage)} stage`];
    if (st) bits.push(`${st.days}d since touch (${st.level})`);
    if (fu) bits.push(`follow-up ${fu.label}`);
    if (!isOpen(q)) bits.push('closed — notes only');
    $('followUpMeta').textContent = `For ${q.customer || 'Untitled quote'} — ${bits.join(' · ')}`;
  }

  function regenFollowUp() {
    const q = selected();
    if (!q) return;
    $('toneSelect').value = state.tone;
    $('followUpText').value = buildFollowUpNote(q, state.tone);
  }

  function renderExport() {
    $('exportPreview').value = buildMarkdown();
  }

  function renderPrintReport() {
    const t = computeStats(state.quotes);
    const queue = chaseQueue(state.quotes);
    const rows = queue.map((q, i) => {
      const st = staleness(q);
      const fu = followUpInfo(q);
      return `<tr><td>${i + 1}</td><td>${esc(q.customer) || 'Untitled'}</td><td>${money(q.value)}</td>
        <td>${q.probability}%</td><td>${esc(stageLabel(q.stage))}</td>
        <td>${st.days}d (${st.level})</td><td>${fu ? esc(fu.label) : esc(q.followUp || '—')}</td>
        <td>${esc(q.owner) || '—'}</td></tr>`;
    }).join('');
    $('printReport').innerHTML = `
      <h1>Quote chase plan</h1>
      <p class="print-dim">Generated ${esc(new Date().toLocaleString())} — draft only; a human reviews before any customer contact.</p>
      <h2>Pipeline stats</h2>
      <ul>
        <li>Open pipeline: ${money(t.openValue)} across ${t.openCount} quotes</li>
        <li>Weighted value: ${money(t.weighted)}</li>
        <li>Follow-ups due now: ${t.dueNow} (${t.overdue} overdue)</li>
        <li>Stale quotes: ${t.staleCount} — ${money(t.staleValue)} at risk</li>
        <li>Won value on the board: ${money(t.wonValue)}</li>
      </ul>
      <h2>Chase queue</h2>
      ${queue.length
        ? `<table><thead><tr><th>#</th><th>Customer / job</th><th>Value</th><th>Prob.</th><th>Stage</th><th>Since touch</th><th>Follow-up</th><th>Owner</th></tr></thead><tbody>${rows}</tbody></table>`
        : '<p>No open quotes.</p>'}
      <h2>Notes</h2>
      <ul>${queue.filter(q => q.notes.trim()).map(q => `<li><strong>${esc(q.customer) || 'Untitled'}:</strong> ${esc(q.notes)}</li>`).join('') || '<li>none</li>'}</ul>`;
  }

  function renderAll({ keepDraft = false } = {}) {
    renderStats();
    renderBoard();
    renderEditor();
    renderFollowUpMeta();
    if (!keepDraft) regenFollowUp();
    renderExport();
    scheduleSave();
  }

  /** Re-render everything except the editor fields (used while typing in them). */
  function renderDerived() {
    renderStats();
    renderBoard();
    renderFollowUpMeta();
    renderExport();
    scheduleSave();
  }

  /* ================= toast ================= */

  let toastTimer = null;
  let toastActionFn = null;

  function showToast(msg, action) {
    const toast = $('toast');
    $('toastMsg').textContent = msg;
    const btn = $('toastAction');
    toastActionFn = action ? action.fn : null;
    btn.hidden = !action;
    if (action) btn.textContent = action.label;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, action ? UNDO_MS : 2500);
  }

  function hideToast() {
    const toast = $('toast');
    toast.classList.remove('show');
    toastActionFn = null;
    setTimeout(() => { toast.hidden = true; }, 220);
  }

  /* ================= actions ================= */

  function newQuote() {
    const q = normalizeQuote({
      probability: 50, stage: 'draft',
      lastTouch: todayIso(), followUp: isoShift(3)
    });
    state.quotes.unshift(q);
    state.selectedId = q.id;
    renderAll();
    $('fCustomer').focus();
    showToast('Quote created — name the customer/job');
  }

  function deleteQuote() {
    const q = selected();
    if (!q) return;
    const index = state.quotes.indexOf(q);
    state.quotes.splice(index, 1);
    state.selectedId = null;
    renderAll();
    showToast(`Deleted "${q.customer || 'Untitled quote'}"`, {
      label: 'Undo',
      fn: () => {
        state.quotes.splice(Math.min(index, state.quotes.length), 0, q);
        state.selectedId = q.id;
        renderAll();
        showToast('Quote restored');
      }
    });
  }

  function setStage(stage, msg) {
    const q = selected();
    if (!q) return;
    q.stage = stage;
    q.lastTouch = todayIso();
    if (stage === 'sent' && !q.followUp) q.followUp = isoShift(3);
    if (stage === 'won') q.probability = 100;
    if (stage === 'lost') q.probability = 0;
    renderAll();
    showToast(msg);
  }

  function logTouch() {
    const q = selected();
    if (!q) return;
    q.lastTouch = todayIso();
    renderAll();
    showToast('Touch logged for today');
  }

  function readEditorIntoState() {
    const q = selected();
    if (!q) return;
    q.customer = $('fCustomer').value.slice(0, 120);
    q.contact = $('fContact').value.slice(0, 80);
    q.owner = $('fOwner').value.slice(0, 60);
    q.value = clamp($('fValue').value, 0, 99999999);
    q.probability = clamp($('fProbability').value, 0, 100);
    q.stage = STAGE_KEYS.includes($('fStage').value) ? $('fStage').value : q.stage;
    q.lastTouch = isIsoDate($('fLastTouch').value) ? $('fLastTouch').value : q.lastTouch;
    q.followUp = isIsoDate($('fFollowUp').value) ? $('fFollowUp').value : '';
    q.notes = $('fNotes').value.slice(0, 600);
    validateCustomer();
  }

  function copyText(text, okMsg) {
    const done = () => showToast(okMsg);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); }
    catch { showToast('Copy failed — select the preview text manually'); }
    ta.remove();
  }

  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function loadDemo() {
    state.quotes = [
      { customer: 'Harborview Dental — rooftop HVAC unit replacement', contact: 'Dana Whitfield', owner: 'Sam',
        value: 18400, probability: 45, stage: 'sent', lastTouch: isoShift(-6), followUp: isoShift(-2),
        notes: 'Two install windows offered. Waiting on their facilities manager sign-off.' },
      { customer: 'Maya Patel — tankless water heater install', contact: 'Maya Patel', owner: 'Sam',
        value: 3450, probability: 70, stage: 'sent', lastTouch: isoShift(-2), followUp: todayIso(),
        notes: 'Asked about financing — confirm terms with the office before replying.' },
      { customer: 'Cedar Lane Apartments — panel upgrades (6 units)', contact: 'R. Ortiz', owner: 'Priya',
        value: 21600, probability: 35, stage: 'negotiating', lastTouch: isoShift(-9), followUp: isoShift(-4),
        notes: 'Pushing on price. Permit timeline is the real blocker — lead with that.' },
      { customer: 'Jensen Roofing — annual inspection contract', contact: 'Kim Jensen', owner: 'Alex',
        value: 5200, probability: 55, stage: 'draft', lastTouch: isoShift(-1), followUp: todayIso(),
        notes: 'Scope written; needs photo attachments before it goes out.' },
      { customer: 'Northside Cafe — walk-in cooler repair', contact: 'Gus Leon', owner: 'Sam',
        value: 2750, probability: 80, stage: 'negotiating', lastTouch: isoShift(-3), followUp: isoShift(2),
        notes: 'Verbal yes; wants the work done on a Monday when they are closed.' },
      { customer: 'Avery Chen — maintenance plan renewal', contact: 'Avery Chen', owner: 'Priya',
        value: 1180, probability: 100, stage: 'won', lastTouch: todayIso(), followUp: '',
        notes: 'Renewed after revised wording was approved.' },
      { customer: 'Elm Street Duplex — sewer line replacement', contact: '', owner: 'Alex',
        value: 9800, probability: 0, stage: 'lost', lastTouch: isoShift(-12), followUp: '',
        notes: 'Went with a cheaper bid. Revisit in spring.' }
    ].map(normalizeQuote);
    state.selectedId = state.quotes[0].id;
    state.tone = 'friendly';
    renderAll();
    showToast('Demo pipeline loaded');
  }

  function resetAll() {
    if (!window.confirm('Reset the board? This clears every quote from this browser.')) return;
    const theme = state.theme;
    state = defaultState();
    state.theme = theme;
    state.seenGuide = true;
    save();
    renderAll();
    showToast('Board reset');
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.quotes)) {
          showToast('Import failed — no quotes array in that file');
          return;
        }
        const next = normalize(parsed);
        next.theme = state.theme;
        next.seenGuide = true;
        state = next;
        save();
        renderAll();
        showToast(`Imported ${state.quotes.length} quote${state.quotes.length === 1 ? '' : 's'}`);
      } catch {
        showToast('Import failed — not valid JSON');
      }
    };
    reader.readAsText(file);
  }

  /* ================= theme ================= */

  function applyTheme() {
    if (!state.theme) {
      state.theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light' : 'dark';
    }
    document.documentElement.dataset.theme = state.theme;
    const btn = $('themeToggle');
    btn.textContent = state.theme === 'dark' ? 'Light mode' : 'Dark mode';
    btn.setAttribute('aria-pressed', state.theme === 'light' ? 'true' : 'false');
  }

  /* ================= help modal ================= */

  let lastFocused = null;

  function openHelp() {
    lastFocused = document.activeElement;
    $('helpModal').hidden = false;
    $('helpClose').focus();
  }

  function closeHelp() {
    $('helpModal').hidden = true;
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
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

  /* ================= event wiring ================= */

  // Header
  $('themeToggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    scheduleSave();
  });
  $('helpBtn').addEventListener('click', openHelp);
  $('helpClose').addEventListener('click', closeHelp);
  $('helpModal').addEventListener('click', e => { if (e.target === $('helpModal')) closeHelp(); });

  // Board toolbar + delegated card / empty-state actions
  $('newQuoteBtn').addEventListener('click', newQuote);
  $('demoBtn').addEventListener('click', loadDemo);
  $('resetBtn').addEventListener('click', resetAll);
  document.addEventListener('click', e => {
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      if (actionBtn.dataset.action === 'new') newQuote();
      if (actionBtn.dataset.action === 'demo') loadDemo();
      return;
    }
    const card = e.target.closest('.quote-card[data-id]');
    if (card) {
      state.selectedId = card.dataset.id;
      renderAll();
    }
  });

  // Editor fields — update state live without re-rendering the form itself
  ['fCustomer', 'fContact', 'fOwner', 'fValue', 'fProbability', 'fNotes'].forEach(id => {
    $(id).addEventListener('input', () => { readEditorIntoState(); renderDerived(); });
  });
  ['fStage', 'fLastTouch', 'fFollowUp'].forEach(id => {
    $(id).addEventListener('change', () => { readEditorIntoState(); renderAll(); });
  });
  $('editorForm').addEventListener('submit', e => e.preventDefault());

  // Quick actions
  $('markSentBtn').addEventListener('click', () => setStage('sent', 'Marked sent — follow-up scheduled'));
  $('markWonBtn').addEventListener('click', () => setStage('won', 'Marked won'));
  $('markLostBtn').addEventListener('click', () => setStage('lost', 'Marked lost'));
  $('logTouchBtn').addEventListener('click', logTouch);
  $('deleteBtn').addEventListener('click', deleteQuote);

  // Follow-up drafter
  $('toneSelect').addEventListener('change', () => {
    state.tone = TONES.includes($('toneSelect').value) ? $('toneSelect').value : 'friendly';
    regenFollowUp();
    renderExport();
    scheduleSave();
  });
  $('regenBtn').addEventListener('click', () => { regenFollowUp(); showToast('Follow-up note regenerated'); });
  $('copyFollowUpBtn').addEventListener('click', () =>
    copyText($('followUpText').value, 'Follow-up note copied — review before sending'));
  $('useNoteBtn').addEventListener('click', () => {
    const q = selected();
    if (!q) return;
    q.notes = $('followUpText').value.slice(0, 600);
    renderAll({ keepDraft: true });
    showToast('Saved into quote notes');
  });

  // Export & handoff
  $('copyMarkdownBtn').addEventListener('click', () => copyText(buildMarkdown(), 'Chase plan Markdown copied'));
  $('downloadCsvBtn').addEventListener('click', () => {
    download('quote-chase-board.csv', buildCsv(), 'text/csv');
    showToast('CSV downloaded');
  });
  $('downloadJsonBtn').addEventListener('click', () => {
    const payload = { ...state, exportedAt: new Date().toISOString(), boundary: 'draft-only local export' };
    download('quote-chase-board.json', JSON.stringify(payload, null, 2), 'application/json');
    showToast('JSON downloaded');
  });
  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', () => {
    const file = $('importFile').files[0];
    if (file) importJson(file);
    $('importFile').value = '';
  });
  $('printBtn').addEventListener('click', () => { renderPrintReport(); window.print(); });
  window.addEventListener('beforeprint', renderPrintReport);

  // Toast undo
  $('toastAction').addEventListener('click', () => {
    const fn = toastActionFn;
    hideToast();
    if (fn) fn();
  });

  // Keyboard
  document.addEventListener('keydown', e => {
    trapFocus(e);
    if (e.key === 'Escape' && !$('helpModal').hidden) { closeHelp(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      copyText(buildMarkdown(), 'Chase plan Markdown copied');
      return;
    }
    const typing = e.target.matches('input, textarea, select') || e.target.isContentEditable;
    if (typing) return;
    if (e.key === '?') {
      e.preventDefault();
      if ($('helpModal').hidden) openHelp(); else closeHelp();
    }
    if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      newQuote();
    }
  });

  /* ================= init ================= */

  applyTheme();
  renderAll();
  if (!state.seenGuide) {
    state.seenGuide = true;
    save();
    openHelp();
  }
})();
