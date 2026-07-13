/* Daily Cash Board — cash-first daily control room.
   Local-first, draft-only: no sends, no CRM writes, no payments. */
(() => {
  'use strict';

  // ---------------------------------------------------------------- constants
  const LS_KEY = 'fable-remake:day-15-daily-cash-board:v1';
  const LEGACY_KEY = 'daily-cash-board-v1';
  const FOCUS_LIMIT = 3;

  const STAGES = [
    { id: 'offer',    label: 'Offers out',     hint: 'Sent, waiting on a reply' },
    { id: 'followup', label: 'Follow-ups due', hint: 'Nudge before it goes cold' },
    { id: 'call',     label: 'Booked calls',   hint: 'Show up prepared' },
    { id: 'invoice',  label: 'Invoices out',   hint: 'Billed, not yet paid' },
    { id: 'collect',  label: 'Collect / close', hint: 'Chase payment or decide' },
  ];
  const STAGE_IDS = STAGES.map(s => s.id);
  const stageLabel = id => (STAGES.find(s => s.id === id) || STAGES[0]).label;

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g,
    ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const money = n => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
  const clone = v => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));
  const newId = () => (globalThis.crypto && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : `cm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function isoOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function daysBetween(fromISO, toISO) {
    const a = new Date(fromISO + 'T00:00:00');
    const b = new Date(toISO + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  }
  function niceDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // ---------------------------------------------------------------- state
  function defaultState() {
    return {
      version: 1,
      theme: null,          // null = follow prefers-color-scheme
      seenGuide: false,
      filter: 'all',
      focus: [],            // up to 3 item ids
      focusDate: todayISO(),
      items: [],
    };
  }

  function normalizeItem(raw) {
    const it = (raw && typeof raw === 'object') ? raw : {};
    const value = Math.min(10000000, Math.max(0, Number(it.value) || 0));
    const confidence = Math.min(100, Math.max(0, Math.round(Number(it.confidence ?? 50) || 0)));
    return {
      id: typeof it.id === 'string' && it.id ? it.id : newId(),
      title: String(it.title || 'Untitled cash move').slice(0, 120),
      stage: STAGE_IDS.includes(it.stage) ? it.stage : 'offer',
      value,
      confidence,
      due: /^\d{4}-\d{2}-\d{2}$/.test(String(it.due || '')) ? it.due : '',
      owner: String(it.owner || '').slice(0, 60),
      notes: String(it.notes || '').slice(0, 500),
      status: it.status === 'done' ? 'done' : 'open',
      doneAt: /^\d{4}-\d{2}-\d{2}$/.test(String(it.doneAt || '')) ? it.doneAt : null,
    };
  }

  function normalize(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== 'object') return base;
    const st = { ...base };
    st.theme = raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : null;
    st.seenGuide = raw.seenGuide === true;
    st.filter = ['all', 'today', 'overdue', 'done'].includes(raw.filter) ? raw.filter : 'all';
    st.items = Array.isArray(raw.items) ? raw.items.map(normalizeItem) : [];
    st.focusDate = /^\d{4}-\d{2}-\d{2}$/.test(String(raw.focusDate || '')) ? raw.focusDate : todayISO();
    const ids = new Set(st.items.map(i => i.id));
    st.focus = Array.isArray(raw.focus) ? raw.focus.filter(id => ids.has(id)).slice(0, FOCUS_LIMIT) : [];
    // Fresh morning: yesterday's focus picks don't carry over.
    if (st.focusDate !== todayISO()) { st.focus = []; st.focusDate = todayISO(); }
    return st;
  }

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return normalize(JSON.parse(raw));
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const old = JSON.parse(legacy);
        return normalize({ items: old && old.items, theme: old && old.theme });
      }
    } catch { /* corrupt storage never crashes the board */ }
    return defaultState();
  }

  let state = load();
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
    }, 250);
  }

  // ---------------------------------------------------------------- domain
  const weighted = it => it.value * it.confidence / 100;
  const openItems = () => state.items.filter(i => i.status === 'open');

  function dueState(it) {
    if (it.status === 'done') return 'done';
    if (!it.due) return 'none';
    const diff = daysBetween(todayISO(), it.due);
    if (diff < 0) return 'overdue';
    if (diff === 0) return 'today';
    return 'upcoming';
  }

  function dueChip(it) {
    const ds = dueState(it);
    if (ds === 'done') return { cls: 'done', text: 'Done ' + (it.doneAt ? niceDate(it.doneAt) : '') };
    if (ds === 'none') return { cls: '', text: 'No date' };
    const diff = daysBetween(todayISO(), it.due);
    if (ds === 'overdue') return { cls: 'overdue', text: `Overdue ${Math.abs(diff)}d` };
    if (ds === 'today') return { cls: 'today', text: 'Due today' };
    if (diff === 1) return { cls: '', text: 'Due tomorrow' };
    return { cls: '', text: `Due ${niceDate(it.due)}` };
  }

  // Priority: overdue first (oldest), then due today, then soonest, dateless, done last.
  function priorityRank(it) {
    const ds = dueState(it);
    if (ds === 'overdue') return 0;
    if (ds === 'today') return 1;
    if (ds === 'upcoming') return 2;
    if (ds === 'none') return 3;
    return 4; // done
  }
  function sortItems(list) {
    return [...list].sort((a, b) =>
      priorityRank(a) - priorityRank(b) ||
      (a.due || '9999').localeCompare(b.due || '9999') ||
      weighted(b) - weighted(a));
  }

  function metrics() {
    const open = openItems();
    const today = todayISO();
    const overdue = open.filter(i => dueState(i) === 'overdue');
    const dueToday = open.filter(i => dueState(i) === 'today');
    const closedToday = state.items.filter(i => i.status === 'done' && i.doneAt === today);
    return {
      openCount: open.length,
      expected: open.reduce((s, i) => s + weighted(i), 0),
      risk: overdue.reduce((s, i) => s + i.value, 0),
      riskCount: overdue.length,
      dueTodayCount: dueToday.length,
      dueTodayValue: dueToday.reduce((s, i) => s + i.value, 0),
      closedValue: closedToday.reduce((s, i) => s + i.value, 0),
      closedCount: closedToday.length,
      overdue, dueToday, closedToday,
    };
  }

  function laneTotals(stageId) {
    const rows = openItems().filter(i => i.stage === stageId);
    return {
      count: rows.length,
      face: rows.reduce((s, i) => s + i.value, 0),
      weighted: rows.reduce((s, i) => s + weighted(i), 0),
    };
  }

  const findItem = id => state.items.find(i => i.id === id);

  // ---------------------------------------------------------------- demo data
  function demoItems() {
    return [
      { title: 'Send narrow pilot offer to Westside HVAC', stage: 'offer', value: 4200, confidence: 55, due: todayISO(), owner: 'Brian', notes: 'Use proof-window language. Draft only; no send until human approval.' },
      { title: 'Offer maintenance-plan upsell to Lakeview Dental', stage: 'offer', value: 2600, confidence: 40, due: isoOffset(2), owner: 'Brian', notes: 'Reference their two emergency calls last quarter.' },
      { title: 'Follow up on stale estimate with owner-safe note', stage: 'followup', value: 1850, confidence: 45, due: isoOffset(-2), owner: 'Ops desk', notes: 'Reference the original quote; ask if they want to keep the slot open.' },
      { title: 'Nudge Riverside Cafe on the signage quote', stage: 'followup', value: 950, confidence: 50, due: todayISO(), owner: 'Ops desk', notes: 'Second touch. Keep it to two sentences.' },
      { title: 'Discovery call: missed-call recovery pilot', stage: 'call', value: 3000, confidence: 65, due: isoOffset(1), owner: 'Brian', notes: 'Confirm lead sources, current response time, and proof metric.' },
      { title: 'Scope call with Hilltop Property Mgmt', stage: 'call', value: 5200, confidence: 35, due: isoOffset(3), owner: 'Brian', notes: 'They asked for a per-unit price. Prep two options.' },
      { title: 'Invoice approved local workflow build', stage: 'invoice', value: 1250, confidence: 90, due: isoOffset(-4), owner: 'Admin', notes: 'Overdue. Check invoice status; collection happens outside this app.' },
      { title: 'Invoice Q3 retainer — Chen & Associates', stage: 'invoice', value: 2000, confidence: 95, due: isoOffset(5), owner: 'Admin', notes: 'Net-15 terms. Send reminder two days before due.' },
      { title: 'Close decision on review-request composer add-on', stage: 'collect', value: 900, confidence: 70, due: todayISO(), owner: 'Brian', notes: 'Make a yes/no decision and log the next action.' },
      { title: 'Collect deposit for October kitchen refit', stage: 'collect', value: 1500, confidence: 85, due: '', owner: 'Admin', notes: 'Waiting on their bookkeeper. No date committed yet.', status: 'done', doneAt: todayISO() },
    ].map(normalizeItem);
  }

  function loadDemo() {
    state.items = demoItems();
    const sorted = sortItems(openItems());
    state.focus = sorted.slice(0, 2).map(i => i.id);
    state.focusDate = todayISO();
    state.filter = 'all';
    renderAll();
    toast('Demo day loaded — 10 cash moves');
  }

  // ---------------------------------------------------------------- exports
  function buildMarkdown() {
    const m = metrics();
    const today = todayISO();
    const lines = [];
    lines.push(`# Daily Cash Board — end-of-day summary — ${today}`);
    lines.push('');
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push('Draft-only local board. Human approval is required before emails, texts, invoices, CRM writes, payments, customer contact, or public changes.');
    lines.push('');
    lines.push('## Cash snapshot');
    lines.push(`- Cash-in potential (weighted): ${money(m.expected)} across ${m.openCount} open move${m.openCount === 1 ? '' : 's'}`);
    lines.push(`- Cash at risk (overdue): ${money(m.risk)} across ${m.riskCount} move${m.riskCount === 1 ? '' : 's'}`);
    lines.push(`- Due today: ${m.dueTodayCount} move${m.dueTodayCount === 1 ? '' : 's'} (${money(m.dueTodayValue)} face value)`);
    lines.push(`- Closed today: ${m.closedCount} move${m.closedCount === 1 ? '' : 's'} (${money(m.closedValue)})`);
    lines.push('');
    lines.push("## Today's top 3 focus");
    if (state.focus.length) {
      state.focus.forEach((id, idx) => {
        const it = findItem(id);
        if (!it) return;
        const mark = it.status === 'done' ? 'x' : ' ';
        lines.push(`${idx + 1}. [${mark}] ${it.title} — ${stageLabel(it.stage)}, ${money(it.value)} @ ${it.confidence}%`);
      });
    } else {
      lines.push('_No focus picked today._');
    }
    lines.push('');
    if (m.overdue.length) {
      lines.push('## Overdue — handle first tomorrow');
      sortItems(m.overdue).forEach(it => {
        lines.push(`- ${it.title} — ${stageLabel(it.stage)} — ${money(it.value)} — ${Math.abs(daysBetween(today, it.due))}d overdue — owner: ${it.owner || 'unassigned'}`);
      });
      lines.push('');
    }
    lines.push('## Lane totals (open moves)');
    STAGES.forEach(s => {
      const t = laneTotals(s.id);
      lines.push(`- ${s.label}: ${t.count} move${t.count === 1 ? '' : 's'} — ${money(t.face)} face — ${money(t.weighted)} weighted`);
    });
    lines.push('');
    lines.push('## Next actions (priority order)');
    const queue = sortItems(openItems()).slice(0, 5);
    if (queue.length) {
      queue.forEach((it, idx) => {
        const chip = dueChip(it);
        lines.push(`${idx + 1}. ${it.title} — ${stageLabel(it.stage)} — ${money(weighted(it))} weighted — ${chip.text}${it.owner ? ` — owner: ${it.owner}` : ''}`);
        if (it.notes) lines.push(`   Next: ${it.notes}`);
      });
    } else {
      lines.push('_Board is clear. Add tomorrow\'s moves before you log off._');
    }
    if (m.closedToday.length) {
      lines.push('');
      lines.push('## Completed today');
      m.closedToday.forEach(it => lines.push(`- ${it.title} — ${stageLabel(it.stage)} — ${money(it.value)}`));
    }
    lines.push('');
    lines.push('## Guardrail');
    lines.push('This board plans cash actions only. Execute customer-facing, billing, CRM, or public actions outside this app after human approval.');
    return lines.join('\n');
  }

  function buildCSV() {
    const rows = [['title', 'lane', 'status', 'value', 'confidence_pct', 'weighted_value', 'due', 'due_state', 'owner', 'in_focus', 'notes']];
    sortItems(state.items).forEach(it => rows.push([
      it.title, stageLabel(it.stage), it.status, it.value, it.confidence,
      Math.round(weighted(it)), it.due || '', dueState(it), it.owner,
      state.focus.includes(it.id) ? 'yes' : 'no', it.notes,
    ]));
    return rows.map(r => r.map(c => `"${String(c ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  }

  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function copyText(text, okMsg) {
    const fallback = () => {
      const pre = $('summaryPre');
      const range = document.createRange();
      range.selectNodeContents(pre);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      toast('Clipboard blocked — text selected, press Ctrl+C');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast(okMsg)).catch(fallback);
    } else fallback();
  }

  // ---------------------------------------------------------------- toast + undo
  let toastTimer = null;
  let undoFn = null;
  function toast(msg, undo) {
    $('toastMsg').textContent = msg;
    undoFn = undo || null;
    $('toastUndo').hidden = !undo;
    const el = $('toast');
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.classList.remove('show'); undoFn = null; }, undo ? 7000 : 2600);
  }

  // ---------------------------------------------------------------- renders
  function applyTheme() {
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const theme = state.theme || (prefersLight ? 'light' : 'dark');
    document.documentElement.dataset.theme = theme;
    const btn = $('btnTheme');
    btn.textContent = theme === 'dark' ? 'Light' : 'Dark';
    btn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
    btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  }

  function renderStats() {
    const m = metrics();
    $('statExpected').textContent = money(m.expected);
    $('statExpectedSub').textContent = `${m.openCount} open move${m.openCount === 1 ? '' : 's'}, weighted`;
    $('statRisk').textContent = money(m.risk);
    $('statRiskSub').textContent = `${m.riskCount} overdue move${m.riskCount === 1 ? '' : 's'}`;
    document.querySelector('.stat-risk').classList.toggle('has-risk', m.riskCount > 0);
    $('statDueToday').textContent = String(m.dueTodayCount);
    $('statDueTodaySub').textContent = `${money(m.dueTodayValue)} face value`;
    $('statClosed').textContent = money(m.closedValue);
    $('statClosedSub').textContent = `${m.closedCount} move${m.closedCount === 1 ? '' : 's'} done`;
  }

  function renderFocus() {
    const wrap = $('focusList');
    $('focusCount').textContent = `${state.focus.length} / ${FOCUS_LIMIT} picked`;
    $('focusDateLabel').textContent = `${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} — pick the moves that matter most. Resets each morning.`;
    if (!state.focus.length) {
      wrap.innerHTML = `<p class="focus-empty">Nothing picked yet. Hit the &#9734; on up to ${FOCUS_LIMIT} cards below to build today's focus${state.items.length ? '' : ' — or load the demo to see how it works'}.</p>`;
      return;
    }
    wrap.innerHTML = state.focus.map(id => {
      const it = findItem(id);
      if (!it) return '';
      const done = it.status === 'done';
      const chip = dueChip(it);
      return `<div class="focus-row${done ? ' is-done' : ''}">
        <input type="checkbox" class="focus-check" data-check="${esc(it.id)}" ${done ? 'checked' : ''} aria-label="Mark '${esc(it.title)}' ${done ? 'open' : 'done'}" />
        <span class="focus-title">${esc(it.title)}</span>
        <span class="focus-meta">
          <span class="due-chip ${chip.cls}">${esc(chip.text)}</span>
          <span class="focus-value">${money(it.value)}</span>
          <button type="button" class="unstar" data-unstar="${esc(it.id)}" aria-label="Remove '${esc(it.title)}' from focus">&times;</button>
        </span>
      </div>`;
    }).join('');
  }

  function visibleInFilter(it) {
    switch (state.filter) {
      case 'today': return it.status === 'open' && dueState(it) === 'today';
      case 'overdue': return it.status === 'open' && dueState(it) === 'overdue';
      case 'done': return it.status === 'done';
      default: return true;
    }
  }

  function cardHTML(it) {
    const chip = dueChip(it);
    const overdue = dueState(it) === 'overdue';
    const done = it.status === 'done';
    const focused = state.focus.includes(it.id);
    const isLast = it.stage === STAGE_IDS[STAGE_IDS.length - 1];
    return `<article class="card${overdue ? ' is-overdue' : ''}${done ? ' is-done' : ''}" data-id="${esc(it.id)}">
      <div class="card-top">
        <h4 class="card-title">${esc(it.title)}</h4>
        <button type="button" class="star-btn${focused ? ' is-focused' : ''}" data-act="star" data-id="${esc(it.id)}"
          aria-pressed="${focused}" aria-label="${focused ? 'Remove from' : 'Add to'} today's focus" title="Today's focus">${focused ? '&#9733;' : '&#9734;'}</button>
      </div>
      <div class="card-meta">
        <span class="card-value">${money(it.value)}</span>
        <span>${it.confidence}%</span>
        <span class="due-chip ${chip.cls}">${esc(chip.text)}</span>
        ${it.owner ? `<span>${esc(it.owner)}</span>` : ''}
      </div>
      ${it.notes ? `<p class="card-notes">${esc(it.notes)}</p>` : ''}
      <div class="card-actions">
        <button type="button" data-act="edit" data-id="${esc(it.id)}">Edit</button>
        ${done
          ? `<button type="button" data-act="reopen" data-id="${esc(it.id)}">Reopen</button>`
          : `${isLast ? '' : `<button type="button" data-act="advance" data-id="${esc(it.id)}">Advance &rarr;</button>`}
             <button type="button" data-act="done" data-id="${esc(it.id)}">Done</button>`}
        <button type="button" data-act="del" data-id="${esc(it.id)}">Delete</button>
      </div>
    </article>`;
  }

  function renderBoard() {
    const board = $('board');
    if (!state.items.length) {
      board.innerHTML = `<div class="board-empty">
        <p><strong>No cash moves yet.</strong> Every offer, follow-up, call, invoice, and collection you're waiting on belongs on this board.</p>
        <div class="empty-actions">
          <button type="button" class="btn-primary" data-act="add">+ Add your first move</button>
          <button type="button" class="btn" data-act="demo">Load demo day</button>
        </div>
      </div>`;
      return;
    }
    board.innerHTML = STAGES.map(s => {
      const t = laneTotals(s.id);
      const rows = sortItems(state.items.filter(it => it.stage === s.id && visibleInFilter(it)));
      const filterNote = { today: 'due today', overdue: 'overdue', done: 'done' }[state.filter];
      const empty = state.filter === 'all'
        ? `<p class="lane-empty">Empty lane. <button type="button" data-act="add" data-stage="${esc(s.id)}">Add a move</button></p>`
        : `<p class="lane-empty">No ${esc(filterNote)} moves here.</p>`;
      return `<div class="lane" data-stage="${esc(s.id)}">
        <div class="lane-head">
          <h3>${esc(s.label)}</h3>
          <p>${t.count} open &middot; ${money(t.face)} &middot; ${esc(s.hint)}</p>
        </div>
        ${rows.length ? rows.map(cardHTML).join('') : empty}
      </div>`;
    }).join('');
  }

  function renderFilters() {
    document.querySelectorAll('#filterBar .chip').forEach(chip => {
      const active = chip.dataset.filter === state.filter;
      chip.classList.toggle('is-active', active);
      chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function renderSummary() {
    $('summaryPre').textContent = buildMarkdown();
  }

  function renderAll() {
    applyTheme();
    renderStats();
    renderFocus();
    renderFilters();
    renderBoard();
    renderSummary();
    save();
  }

  // ---------------------------------------------------------------- item ops
  function toggleFocus(id) {
    const idx = state.focus.indexOf(id);
    if (idx >= 0) {
      state.focus.splice(idx, 1);
      toast('Removed from today\'s focus');
    } else {
      if (state.focus.length >= FOCUS_LIMIT) {
        toast(`Focus is full (${FOCUS_LIMIT}). Remove one first.`);
        return;
      }
      state.focus.push(id);
      toast(`Focus ${state.focus.length} of ${FOCUS_LIMIT} picked`);
    }
    renderAll();
  }

  function markDone(id, done) {
    const it = findItem(id);
    if (!it) return;
    it.status = done ? 'done' : 'open';
    it.doneAt = done ? todayISO() : null;
    renderAll();
    toast(done ? `Done — ${money(it.value)} closed today` : 'Move reopened');
  }

  function advanceItem(id) {
    const it = findItem(id);
    if (!it) return;
    const idx = STAGE_IDS.indexOf(it.stage);
    if (idx < STAGE_IDS.length - 1) {
      it.stage = STAGE_IDS[idx + 1];
      renderAll();
      toast(`Moved to ${stageLabel(it.stage)}`);
    }
  }

  function deleteItem(id) {
    const idx = state.items.findIndex(i => i.id === id);
    if (idx < 0) return;
    const [removed] = state.items.splice(idx, 1);
    const focusIdx = state.focus.indexOf(id);
    if (focusIdx >= 0) state.focus.splice(focusIdx, 1);
    renderAll();
    toast(`Deleted "${removed.title.slice(0, 40)}"`, () => {
      state.items.splice(Math.min(idx, state.items.length), 0, removed);
      if (focusIdx >= 0 && state.focus.length < FOCUS_LIMIT) state.focus.splice(focusIdx, 0, removed.id);
      renderAll();
      toast('Move restored');
    });
  }

  // ---------------------------------------------------------------- dialogs
  let editingId = null;
  let lastFocused = null;

  function openDialog(dlg) {
    lastFocused = document.activeElement;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }
  function closeDialog(dlg) {
    if (dlg.open) dlg.close();
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    lastFocused = null;
  }

  function openEditor(item, presetStage) {
    editingId = item ? item.id : null;
    $('dialogTitle').textContent = item ? 'Edit cash move' : 'Add cash move';
    $('fldTitle').value = item ? item.title : '';
    $('fldStage').value = item ? item.stage : (presetStage || 'offer');
    $('fldValue').value = item ? item.value : 500;
    $('fldConfidence').value = item ? item.confidence : 50;
    $('fldDue').value = item ? item.due : todayISO();
    $('fldOwner').value = item ? item.owner : '';
    $('fldNotes').value = item ? item.notes : '';
    $('fldTitle').classList.remove('invalid');
    $('titleError').hidden = true;
    openDialog($('itemDialog'));
    $('fldTitle').focus();
  }

  function submitEditor(ev) {
    ev.preventDefault();
    const title = $('fldTitle').value.trim();
    if (!title) {
      $('fldTitle').classList.add('invalid');
      $('titleError').hidden = false;
      $('fldTitle').focus();
      return;
    }
    const patch = normalizeItem({
      id: editingId || undefined,
      title,
      stage: $('fldStage').value,
      value: $('fldValue').value,
      confidence: $('fldConfidence').value,
      due: $('fldDue').value,
      owner: $('fldOwner').value.trim(),
      notes: $('fldNotes').value.trim(),
      status: editingId ? (findItem(editingId) || {}).status : 'open',
      doneAt: editingId ? (findItem(editingId) || {}).doneAt : null,
    });
    const idx = state.items.findIndex(i => i.id === patch.id);
    if (idx >= 0) state.items[idx] = patch;
    else state.items.push(patch);
    closeDialog($('itemDialog'));
    renderAll();
    toast(editingId ? 'Move updated' : 'Cash move added');
    editingId = null;
  }

  // ---------------------------------------------------------------- import / reset
  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result));
        // Accept either full-state exports or bare { items: [...] }.
        const next = normalize(raw && raw.state && typeof raw.state === 'object' ? raw.state : raw);
        if (!next.items.length) { toast('Import contained no cash moves'); return; }
        next.theme = state.theme;        // keep the viewer's theme choice
        next.seenGuide = state.seenGuide;
        state = next;
        renderAll();
        toast(`Imported ${state.items.length} cash move${state.items.length === 1 ? '' : 's'}`);
      } catch {
        toast('Import failed — not valid JSON');
      }
    };
    reader.readAsText(file);
  }

  function resetBoard() {
    if (!confirm('Reset the board? This clears every cash move from this browser.')) return;
    const theme = state.theme;
    const seen = state.seenGuide;
    state = defaultState();
    state.theme = theme;
    state.seenGuide = seen;
    renderAll();
    toast('Board reset');
  }

  // ---------------------------------------------------------------- events
  $('btnTheme').addEventListener('click', () => {
    const current = document.documentElement.dataset.theme;
    state.theme = current === 'dark' ? 'light' : 'dark';
    applyTheme();
    save();
    toast(`${state.theme === 'light' ? 'Light' : 'Dark'} theme saved`);
  });

  $('btnDemo').addEventListener('click', loadDemo);
  $('btnAddItem').addEventListener('click', () => openEditor(null));
  $('btnHelp').addEventListener('click', () => { openDialog($('helpDialog')); $('btnCloseHelp').focus(); });
  $('btnCloseHelp').addEventListener('click', () => closeDialog($('helpDialog')));
  $('btnCancelItem').addEventListener('click', () => { editingId = null; closeDialog($('itemDialog')); });
  $('itemForm').addEventListener('submit', submitEditor);
  $('fldTitle').addEventListener('input', () => {
    if ($('fldTitle').value.trim()) { $('fldTitle').classList.remove('invalid'); $('titleError').hidden = true; }
  });
  ['itemDialog', 'helpDialog'].forEach(id => {
    $(id).addEventListener('cancel', () => {
      // native Escape close — restore focus
      setTimeout(() => { if (lastFocused && lastFocused.focus) lastFocused.focus(); lastFocused = null; }, 0);
    });
  });

  $('filterBar').addEventListener('click', ev => {
    const chip = ev.target.closest('[data-filter]');
    if (!chip) return;
    state.filter = chip.dataset.filter;
    renderAll();
  });

  // Board: event delegation for all card actions.
  $('board').addEventListener('click', ev => {
    const btn = ev.target.closest('button[data-act]');
    if (!btn) return;
    const { act, id, stage } = btn.dataset;
    if (act === 'add') { openEditor(null, stage); return; }
    if (act === 'demo') { loadDemo(); return; }
    if (!id) return;
    if (act === 'star') toggleFocus(id);
    else if (act === 'edit') openEditor(findItem(id));
    else if (act === 'advance') advanceItem(id);
    else if (act === 'done') markDone(id, true);
    else if (act === 'reopen') markDone(id, false);
    else if (act === 'del') deleteItem(id);
  });

  // Focus panel delegation.
  $('focusList').addEventListener('click', ev => {
    const unstar = ev.target.closest('[data-unstar]');
    if (unstar) toggleFocus(unstar.dataset.unstar);
  });
  $('focusList').addEventListener('change', ev => {
    const check = ev.target.closest('[data-check]');
    if (check) markDone(check.dataset.check, check.checked);
  });

  // Export & handoff.
  $('btnCopyMd').addEventListener('click', () => copyText(buildMarkdown(), 'End-of-day summary copied as Markdown'));
  $('btnJson').addEventListener('click', () => {
    download(`daily-cash-board-${todayISO()}.json`, JSON.stringify({
      app: 'daily-cash-board',
      version: 1,
      generatedAt: new Date().toISOString(),
      safety: 'Draft-only local board; human approval required before customer-facing or billing actions.',
      state: { items: state.items, focus: state.focus, focusDate: state.focusDate },
      metrics: (({ overdue, dueToday, closedToday, ...rest }) => rest)(metrics()),
      markdown: buildMarkdown(),
    }, null, 2), 'application/json');
    toast('JSON downloaded');
  });
  $('btnCsv').addEventListener('click', () => { download(`daily-cash-board-${todayISO()}.csv`, buildCSV(), 'text/csv'); toast('CSV downloaded'); });
  $('btnImport').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', ev => {
    const file = ev.target.files && ev.target.files[0];
    if (file) importJSON(file);
    ev.target.value = '';
  });
  $('btnPrint').addEventListener('click', () => window.print());
  $('btnReset').addEventListener('click', resetBoard);
  $('toastUndo').addEventListener('click', () => {
    const fn = undoFn;
    undoFn = null;
    $('toast').classList.remove('show');
    if (fn) fn();
  });

  // Keyboard shortcuts.
  document.addEventListener('keydown', ev => {
    const tag = (ev.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || ev.target.isContentEditable;
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
      ev.preventDefault();
      copyText(buildMarkdown(), 'End-of-day summary copied as Markdown');
      return;
    }
    if (typing || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (ev.key === '?') { ev.preventDefault(); openDialog($('helpDialog')); $('btnCloseHelp').focus(); }
    else if (ev.key.toLowerCase() === 'n') { ev.preventDefault(); openEditor(null); }
  });

  // ---------------------------------------------------------------- init
  renderAll();
  if (!state.seenGuide) {
    state.seenGuide = true;
    save();
    openDialog($('helpDialog'));
    $('btnCloseHelp').focus();
  }
})();
