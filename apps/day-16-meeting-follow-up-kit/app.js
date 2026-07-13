/* Meeting Follow-up Kit — remake
   Turn rough meeting notes into a structured recap: decisions, action items
   with owners/dates/status, risks, open questions, and a tone-adjustable
   follow-up email draft. Local-first; nothing is ever sent anywhere. */
(() => {
  'use strict';

  /* ============================== Constants ============================== */

  const STORAGE_KEY = 'fable-remake:day-16-meeting-follow-up-kit:v1';
  const STATUSES = ['open', 'doing', 'done'];
  const STATUS_LABELS = { open: 'Open', doing: 'In progress', done: 'Done' };
  const TONES = ['friendly', 'professional', 'direct'];
  const KIND_LABELS = { decision: 'Decision', action: 'Action', risk: 'Risk', question: 'Question' };
  const KIND_TARGET = { decision: 'decisions', risk: 'risks', question: 'questions' };

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
  const pad2 = (n) => String(n).padStart(2, '0');
  const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const todayISO = () => toISO(new Date());
  const isoPlus = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return toISO(d); };
  const parseISO = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const fmtShort = (iso) => { const d = parseISO(iso); return d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''; };
  const fmtLong = (iso) => { const d = parseISO(iso); return d ? d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : ''; };
  const isDateStr = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '');

  /* ============================ State helpers ============================ */

  function defaultState() {
    return { version: 1, theme: null, seenGuide: false, activeMeetingId: null, meetings: [] };
  }

  function blankMeeting() {
    return {
      id: uid(), title: '', date: todayISO(), attendees: '', sender: '', goal: '',
      notes: '', tone: 'professional',
      decisions: [], risks: [], questions: [], actions: [],
      createdAt: Date.now(), updatedAt: Date.now()
    };
  }

  const normItem = (it) => {
    if (typeof it === 'string') return { id: uid(), text: clean(it) };
    if (!it || typeof it !== 'object') return { id: uid(), text: '' };
    return { id: typeof it.id === 'string' ? it.id : uid(), text: clean(it.text) };
  };
  const normItems = (list) => (Array.isArray(list) ? list.map(normItem).filter((i) => i.text) : []);

  function normAction(a) {
    if (typeof a === 'string') a = { title: a };
    if (!a || typeof a !== 'object') a = {};
    return {
      id: typeof a.id === 'string' ? a.id : uid(),
      title: clean(a.title),
      owner: clean(a.owner),
      due: isDateStr(a.due) ? a.due : '',
      status: STATUSES.includes(a.status) ? a.status : (a.done === true ? 'done' : 'open')
    };
  }

  function normMeeting(m) {
    if (!m || typeof m !== 'object') m = {};
    return {
      id: typeof m.id === 'string' ? m.id : uid(),
      title: String(m.title ?? ''),
      date: isDateStr(m.date) ? m.date : todayISO(),
      attendees: String(m.attendees ?? ''),
      sender: String(m.sender ?? ''),
      goal: String(m.goal ?? ''),
      notes: String(m.notes ?? ''),
      tone: TONES.includes(m.tone) ? m.tone : 'professional',
      decisions: normItems(m.decisions),
      risks: normItems(m.risks),
      questions: normItems(m.questions),
      actions: Array.isArray(m.actions) ? m.actions.map(normAction).filter((a) => a.title) : [],
      createdAt: Number(m.createdAt) || Date.now(),
      updatedAt: Number(m.updatedAt) || Date.now()
    };
  }

  function normalize(raw) {
    const st = defaultState();
    if (!raw || typeof raw !== 'object') return st;
    st.theme = raw.theme === 'light' ? 'light' : raw.theme === 'dark' ? 'dark' : null;
    st.seenGuide = Boolean(raw.seenGuide);
    if (Array.isArray(raw.meetings)) {
      st.meetings = raw.meetings.map(normMeeting);
    } else if (raw.meetingTitle !== undefined || Array.isArray(raw.tasks)) {
      // Legacy single-meeting export from the original app — migrate it.
      st.meetings = [normMeeting({
        title: raw.meetingTitle, date: raw.meetingDate, attendees: raw.attendees,
        sender: raw.sender, goal: raw.meetingGoal, notes: raw.meetingNotes,
        decisions: raw.decisions, risks: raw.risks, questions: raw.questions,
        actions: (Array.isArray(raw.tasks) ? raw.tasks : []).map((t) => ({
          title: t?.title, owner: t?.owner, due: t?.due, status: t?.done ? 'done' : 'open'
        }))
      })];
    }
    st.activeMeetingId = st.meetings.some((m) => m.id === raw.activeMeetingId)
      ? raw.activeMeetingId : (st.meetings[0] ? st.meetings[0].id : null);
    return st;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch { /* corrupt storage — start fresh */ }
    return defaultState();
  }

  let state = loadState();
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* quota */ }
    }, 250);
  }

  /* ============================ Domain logic ============================= */

  const activeMeeting = () => state.meetings.find((m) => m.id === state.activeMeetingId) || null;
  const isOverdue = (a) => Boolean(a.due) && a.status !== 'done' && a.due < todayISO();

  function meetingMetrics(m) {
    if (!m) return { decisions: 0, openActions: 0, overdue: 0, questions: 0 };
    return {
      decisions: m.decisions.length,
      openActions: m.actions.filter((a) => a.status !== 'done').length,
      overdue: m.actions.filter(isOverdue).length,
      questions: m.questions.length
    };
  }

  function sortedActions(m) {
    const rank = (a) => (a.status === 'done' ? 1 : 0);
    return m.actions
      .map((a, i) => ({ a, i }))
      .sort((x, y) => (rank(x.a) - rank(y.a)) || (x.a.due || '9999').localeCompare(y.a.due || '9999') || (x.i - y.i))
      .map((w) => w.a);
  }

  /* --- Note scanning: classify lines into decisions / actions / risks / questions --- */

  function classifyLine(text) {
    const t = text.toLowerCase();
    if (/\?\s*$/.test(text) || /^(who|what|when|where|why|how|should we|can we|do we|is there|are we)\b/.test(t)) return 'question';
    if (/\b(decided|decision|agreed|agreement|approved|confirmed|chose|we will go with|locked?(?: in)?|signed? off)\b/.test(t)) return 'decision';
    if (/\b(risk|blocker|blocked|blocking|concern|worried|worry|issue|dependency|slip|behind schedule|delay|delayed|unclear|hasn'?t confirmed|not confirmed|stale)\b/.test(t)) return 'risk';
    if (/\b(action|todo|to do|follow(?:s|ing)? up|will|needs? to|must|should|takes? over|owns?|by (?:mon|tue|wed|thu|fri|sat|sun|next|end|eod|eow))\b/.test(t)) return 'action';
    return null;
  }

  function extractOwner(text) {
    const m = /^([A-Z][a-z]+(?: [A-Z][a-z]+)?) (?:will|to|should|needs? to|must|takes?|owns?)\b/.exec(text.trim());
    return m ? m[1] : '';
  }

  function suggestFromNotes(m) {
    const existing = new Set([
      ...m.decisions.map((i) => i.text.toLowerCase()),
      ...m.risks.map((i) => i.text.toLowerCase()),
      ...m.questions.map((i) => i.text.toLowerCase()),
      ...m.actions.map((a) => a.title.toLowerCase())
    ]);
    const parts = String(m.notes || '').split(/\n+|(?<=[.!?])\s+/).map(clean).filter((s) => s.length > 6);
    const seen = new Set();
    const out = [];
    for (const p of parts) {
      const key = p.toLowerCase();
      if (seen.has(key) || existing.has(key)) continue;
      const kind = classifyLine(p);
      if (!kind) continue;
      seen.add(key);
      out.push({ id: uid(), kind, text: p });
      if (out.length >= 12) break;
    }
    return out;
  }

  /* --- Follow-up email generator with tone options --- */

  const firstNames = (attendees) =>
    String(attendees || '').split(/[,;]+/).map(clean).filter(Boolean).map((n) => n.split(' ')[0]);

  function emailDraft(m) {
    const tone = TONES.includes(m.tone) ? m.tone : 'professional';
    const open = m.actions.filter((a) => a.status !== 'done');
    const done = m.actions.filter((a) => a.status === 'done');
    const dateLong = fmtLong(m.date);
    const title = clean(m.title) || 'our meeting';
    const names = firstNames(m.attendees);

    const subject = {
      friendly: `Recap & next steps — ${clean(m.title) || "today's meeting"}`,
      professional: `Meeting follow-up: ${clean(m.title) || 'summary and action items'}`,
      direct: `${clean(m.title) || 'Meeting'} — decisions & actions`
    }[tone];
    const greeting = {
      friendly: names.length && names.length <= 3 ? `Hi ${names.join(', ')},` : 'Hi everyone,',
      professional: 'Hello all,',
      direct: 'Team,'
    }[tone];
    const opener = {
      friendly: `Thanks for making the time${dateLong ? ` on ${dateLong}` : ''} — good discussion. Quick recap so nothing slips through the cracks:`,
      professional: `Thank you for attending ${title}${dateLong ? ` on ${dateLong}` : ''}. Below is a summary of what was agreed and the resulting action items.`,
      direct: `Recap from ${title}${dateLong ? ` (${dateLong})` : ''}. Skim the actions — corrections welcome.`
    }[tone];

    const L = [`Subject: ${subject}`, '', greeting, '', opener, ''];
    if (clean(m.goal)) L.push(`Purpose: ${clean(m.goal)}`, '');

    let hasBody = false;
    const section = (label, lines) => { hasBody = true; L.push(label, ...lines, ''); };
    if (m.decisions.length) {
      section(tone === 'friendly' ? 'What we decided:' : 'Decisions:', m.decisions.map((d) => `• ${d.text}`));
    }
    if (open.length) {
      section(tone === 'direct' ? 'Actions (owner — due):' : 'Action items:', open.map((a) => {
        const bits = [a.owner || 'Unassigned'];
        if (a.due) bits.push(`due ${fmtShort(a.due)}${isOverdue(a) ? ' — OVERDUE' : ''}`);
        if (a.status === 'doing') bits.push('in progress');
        return `• ${a.title} (${bits.join(', ')})`;
      }));
    }
    if (done.length) {
      section('Already done:', done.map((a) => `• ${a.title}${a.owner ? (tone === 'friendly' ? ` — thanks, ${a.owner}!` : ` — ${a.owner}`) : ''}`));
    }
    if (m.risks.length) {
      section(tone === 'friendly' ? 'Things to keep an eye on:' : 'Risks / watch-outs:', m.risks.map((r) => `• ${r.text}`));
    }
    if (m.questions.length) {
      section(tone === 'direct' ? 'Open questions — reply with answers:' : 'Open questions (replies appreciated):', m.questions.map((q) => `• ${q.text}`));
    }
    if (!hasBody) L.push('(No decisions, actions, risks, or questions captured yet — add them in the kit and this draft fills itself in.)', '');

    const closer = {
      friendly: 'If I got anything wrong or missed something, just shout. Thanks again!',
      professional: 'Please review and reply with any corrections or additions. I will circulate an updated version if anything changes.',
      direct: 'Reply with corrections by end of day tomorrow; otherwise this recap stands.'
    }[tone];
    const signoff = { friendly: 'Cheers,', professional: 'Best regards,', direct: '—' }[tone];
    L.push(closer, '', signoff, clean(m.sender) || '[Your name]');
    return L.join('\n');
  }

  /* --- Markdown recap (main export artifact) --- */

  function recapMarkdown(m) {
    const L = [
      `# Meeting recap — ${clean(m.title) || 'Untitled meeting'}`, '',
      '> Draft-only recap generated locally by Meeting Follow-up Kit. Review before sending or sharing — nothing is sent automatically.', '',
      `- **Date:** ${m.date || 'Not set'}`,
      `- **Attendees:** ${clean(m.attendees) || 'Not listed'}`,
      `- **Purpose:** ${clean(m.goal) || 'Not captured'}`, '',
      '## Decisions'
    ];
    L.push(...(m.decisions.length ? m.decisions.map((d) => `- ${d.text}`) : ['- None recorded.']));
    L.push('', '## Action items');
    if (m.actions.length) {
      L.push('| Action | Owner | Due | Status |', '| --- | --- | --- | --- |');
      sortedActions(m).forEach((a) =>
        L.push(`| ${a.title} | ${a.owner || '—'} | ${a.due || '—'}${isOverdue(a) ? ' (overdue)' : ''} | ${STATUS_LABELS[a.status]} |`));
    } else {
      L.push('- None recorded.');
    }
    L.push('', '## Risks & watch-outs');
    L.push(...(m.risks.length ? m.risks.map((r) => `- ${r.text}`) : ['- None recorded.']));
    L.push('', '## Open questions');
    L.push(...(m.questions.length ? m.questions.map((q) => `- ${q.text}`) : ['- None recorded.']));
    L.push('', `## Draft follow-up email (${m.tone} tone)`, '', '```', emailDraft(m), '```');
    if (m.notes.trim()) L.push('', '## Source notes', '', m.notes.trim());
    L.push('', '---', `Generated ${new Date().toLocaleString()} · Local draft for human review.`);
    return L.join('\n');
  }

  function actionsCsv(m) {
    const cell = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
    const rows = [['Action', 'Owner', 'Due', 'Status', 'Overdue']];
    sortedActions(m).forEach((a) => rows.push([a.title, a.owner, a.due, STATUS_LABELS[a.status], isOverdue(a) ? 'yes' : 'no']));
    return rows.map((r) => r.map(cell).join(',')).join('\n');
  }

  const fileSlug = (title) =>
    (clean(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'meeting');

  /* ============================= Demo data ============================== */

  function demoMeetings() {
    const item = (text) => ({ id: uid(), text });
    const act = (title, owner, due, status) => ({ id: uid(), title, owner, due, status });
    const m1 = {
      ...blankMeeting(),
      title: 'Website relaunch — weekly sync',
      date: todayISO(),
      attendees: 'Priya Shah, Marcus Lee, Dana Ortiz, Sam Becker',
      sender: 'Priya Shah',
      goal: 'Lock the launch date, confirm content owners, and surface anything that could slip the timeline.',
      tone: 'friendly',
      notes: [
        'Agreed to lock the relaunch date to the 28th.',
        'Marcus will finish the pricing page copy by Friday.',
        'Dana raised a concern that the checkout redesign is still blocked on legal review.',
        'Decided to keep the old blog URLs and 301-redirect everything else.',
        'Who owns updating the customer help articles after launch?',
        'Sam needs to confirm the staging environment can handle the load test.',
        'Risk: the photography vendor has not confirmed delivery for the hero images.',
        'Should we soft-launch to 10% of traffic first?'
      ].join('\n'),
      decisions: [item('Launch date locked to the 28th'), item('Keep old blog URLs; 301-redirect everything else')],
      risks: [item('Checkout redesign still blocked on legal review'), item('Photography vendor has not confirmed hero image delivery')],
      questions: [item('Who owns updating the help articles after launch?'), item('Do we soft-launch to 10% of traffic first?')],
      actions: [
        act('Finish pricing page copy', 'Marcus Lee', isoPlus(4), 'open'),
        act('Run staging load test', 'Sam Becker', isoPlus(2), 'doing'),
        act('Chase legal review on checkout redesign', 'Dana Ortiz', isoPlus(-1), 'open'),
        act('Confirm photography delivery date', 'Priya Shah', isoPlus(1), 'open'),
        act('Draft the 301-redirect map', 'Marcus Lee', isoPlus(-2), 'done')
      ]
    };
    const m2 = {
      ...blankMeeting(),
      title: 'Q3 budget review',
      date: isoPlus(-7),
      attendees: 'Priya Shah, Alex Kim',
      sender: 'Priya Shah',
      goal: 'Agree on spending priorities for the rest of the quarter.',
      tone: 'professional',
      notes: 'Decided to freeze new tooling spend until Q4. Alex will share the revised budget sheet.',
      decisions: [item('Freeze new tooling spend until Q4')],
      questions: [item('Does the conference budget survive the freeze?')],
      actions: [act('Share revised budget sheet', 'Alex Kim', isoPlus(-3), 'done')],
      createdAt: Date.now() - 7 * 864e5,
      updatedAt: Date.now() - 7 * 864e5
    };
    return [m1, m2];
  }

  /* =============================== Toast ================================ */

  let toastTimer = null;
  let pendingUndo = null;

  function showToast(msg, undoFn) {
    $('toastMsg').textContent = msg;
    pendingUndo = undoFn || null;
    $('toastUndo').hidden = !undoFn;
    $('toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, undoFn ? 7000 : 2600);
  }

  function hideToast() {
    $('toast').classList.remove('show');
    pendingUndo = null;
  }

  /* ============================== Rendering ============================== */

  let suggestions = [];
  let editingActionId = null;

  function applyTheme() {
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const theme = state.theme || (prefersLight ? 'light' : 'dark');
    document.documentElement.dataset.theme = theme;
    $('themeBtn').textContent = theme === 'dark' ? '☀ Light' : '☾ Dark';
    $('themeBtn').setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
  }

  function renderStats() {
    const met = meetingMetrics(activeMeeting());
    $('statDecisions').textContent = String(met.decisions);
    $('statActions').textContent = String(met.openActions);
    $('statOverdue').textContent = String(met.overdue);
    $('statOverdueWrap').dataset.zero = met.overdue === 0 ? 'true' : 'false';
    $('statQuestions').textContent = String(met.questions);
  }

  function renderHistory() {
    const list = $('meetingList');
    if (!state.meetings.length) {
      list.innerHTML = '<li class="empty-note">No meetings yet — click + New or load the demo.</li>';
      return;
    }
    const sorted = [...state.meetings].sort((a, b) => b.date.localeCompare(a.date) || (b.updatedAt - a.updatedAt));
    list.innerHTML = sorted.map((m) => {
      const met = meetingMetrics(m);
      const name = clean(m.title) || 'Untitled meeting';
      const overdue = met.overdue ? ` <span class="overdue-tag">${met.overdue} overdue</span>` : '';
      return `<li class="meeting-item${m.id === state.activeMeetingId ? ' active' : ''}" data-id="${esc(m.id)}">
        <button type="button" class="meeting-select" data-role="select">
          <span class="meeting-title">${esc(name)}</span>
          <span class="meeting-meta">${esc(`${fmtShort(m.date) || 'No date'} · ${met.openActions} open`)}${overdue}</span>
        </button>
        <button type="button" class="icon-btn" data-role="delete" aria-label="Delete meeting ${esc(name)}">✕</button>
      </li>`;
    }).join('');
  }

  function syncFormFields(m) {
    $('mTitle').value = m.title;
    $('mDate').value = m.date;
    $('mAttendees').value = m.attendees;
    $('mSender').value = m.sender;
    $('mGoal').value = m.goal;
    $('mNotes').value = m.notes;
    $('mTitle').classList.remove('invalid');
  }

  function renderItemList(elId, items, kind) {
    $(elId).innerHTML = items.length
      ? items.map((i) => `<li data-id="${esc(i.id)}"><span>${esc(i.text)}</span>
          <button type="button" class="icon-btn" data-role="remove" aria-label="Remove ${esc(KIND_LABELS[kind].toLowerCase())}: ${esc(i.text)}">✕</button></li>`).join('')
      : `<li class="empty-note">No ${KIND_LABELS[kind].toLowerCase()}s captured yet.</li>`;
  }

  function renderCapture(m) {
    renderItemList('decisionList', m.decisions, 'decision');
    renderItemList('riskList', m.risks, 'risk');
    renderItemList('questionList', m.questions, 'question');
  }

  function renderActions(m) {
    const el = $('actionList');
    if (!m.actions.length) {
      el.innerHTML = '<li class="empty-note">No action items yet. Add one above, or scan your notes for suggestions.</li>';
      return;
    }
    el.innerHTML = sortedActions(m).map((a) => {
      const meta = [a.owner || 'Unassigned', a.due ? `due ${fmtShort(a.due)}` : 'no due date'].join(' · ');
      return `<li class="action-row status-${esc(a.status)}" data-id="${esc(a.id)}">
        <div class="action-main">
          <span class="action-title">${esc(a.title)}</span>
          <span class="action-meta">${esc(meta)} ${isOverdue(a) ? '<span class="overdue-tag">overdue</span>' : ''}</span>
        </div>
        <div class="action-controls">
          <label class="sr-only" for="status-${esc(a.id)}">Status for ${esc(a.title)}</label>
          <select id="status-${esc(a.id)}" data-role="status">
            ${STATUSES.map((s) => `<option value="${s}"${s === a.status ? ' selected' : ''}>${STATUS_LABELS[s]}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-sm" data-role="edit">Edit</button>
          <button type="button" class="icon-btn" data-role="delete" aria-label="Delete action: ${esc(a.title)}">✕</button>
        </div>
      </li>`;
    }).join('');
  }

  function renderSuggestions() {
    $('suggestWrap').hidden = !suggestions.length;
    $('suggestCount').textContent = String(suggestions.length);
    $('suggestionList').innerHTML = suggestions.map((s) =>
      `<li class="suggestion" data-id="${esc(s.id)}">
        <span class="badge badge-${esc(s.kind)}">${esc(KIND_LABELS[s.kind])}</span>
        <span class="sug-text">${esc(s.text)}</span>
        <button type="button" class="btn-primary btn-sm" data-role="accept">Add</button>
        <button type="button" class="btn-ghost btn-sm" data-role="dismiss">Dismiss</button>
      </li>`).join('');
  }

  function renderTone(m) {
    $('toneGroup').querySelectorAll('[role="radio"]').forEach((btn) => {
      btn.setAttribute('aria-checked', btn.dataset.tone === m.tone ? 'true' : 'false');
    });
  }

  function renderRecap(m) {
    const rows = sortedActions(m).map((a) =>
      `<tr class="${isOverdue(a) ? 'overdue' : ''}"><td>${esc(a.title)}</td><td>${esc(a.owner || '—')}</td>
        <td>${a.due ? esc(fmtShort(a.due)) : '—'}${isOverdue(a) ? ' <span class="overdue-tag">overdue</span>' : ''}</td>
        <td>${STATUS_LABELS[a.status]}</td></tr>`).join('');
    const listOrNone = (items) => (items.length
      ? `<ul>${items.map((i) => `<li>${esc(i.text)}</li>`).join('')}</ul>`
      : '<p class="dim">None recorded.</p>');
    $('recapDoc').innerHTML = `
      <header>
        <h2>${esc(clean(m.title) || 'Untitled meeting')}</h2>
        <p class="recap-meta">${esc(fmtLong(m.date) || 'No date')}${clean(m.attendees) ? ` · ${esc(clean(m.attendees))}` : ''}</p>
        ${clean(m.goal) ? `<p class="recap-goal">${esc(clean(m.goal))}</p>` : ''}
      </header>
      <h3>Decisions</h3>${listOrNone(m.decisions)}
      <h3>Action items</h3>
      ${m.actions.length
        ? `<div class="recap-table-wrap"><table class="recap-table">
            <thead><tr><th>Action</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody></table></div>`
        : '<p class="dim">None recorded.</p>'}
      <h3>Risks &amp; watch-outs</h3>${listOrNone(m.risks)}
      <h3>Open questions</h3>${listOrNone(m.questions)}
      <p class="recap-footer">Draft recap generated locally by Meeting Follow-up Kit — review before sharing. Nothing is sent automatically.</p>`;
  }

  function resetActionEditor() {
    editingActionId = null;
    $('actTitle').value = '';
    $('actOwner').value = '';
    $('actDue').value = '';
    $('actStatus').value = 'open';
    $('actTitle').classList.remove('invalid');
    $('actTitleErr').hidden = true;
    $('actSaveBtn').textContent = 'Add action';
    $('actCancelBtn').hidden = true;
  }

  function renderDerived() {
    const m = activeMeeting();
    renderStats();
    renderHistory();
    if (m) {
      $('emailOut').value = emailDraft(m);
      renderRecap(m);
    }
    save();
  }

  function renderAll(syncForm) {
    applyTheme();
    const m = activeMeeting();
    $('workspace').hidden = !m;
    $('emptyState').hidden = Boolean(m);
    if (m) {
      if (syncForm) { syncFormFields(m); resetActionEditor(); }
      renderCapture(m);
      renderActions(m);
      renderSuggestions();
      renderTone(m);
    }
    renderDerived();
  }

  /* =========================== Mutations & undo ========================== */

  const touch = (m) => { m.updatedAt = Date.now(); };

  function selectMeeting(id) {
    if (state.activeMeetingId === id) return;
    state.activeMeetingId = id;
    suggestions = [];
    renderAll(true);
  }

  function newMeeting() {
    const m = blankMeeting();
    state.meetings.unshift(m);
    state.activeMeetingId = m.id;
    suggestions = [];
    renderAll(true);
    $('mTitle').focus();
    showToast('New meeting created');
  }

  function deleteMeeting(id) {
    const idx = state.meetings.findIndex((m) => m.id === id);
    if (idx < 0) return;
    const [removed] = state.meetings.splice(idx, 1);
    if (state.activeMeetingId === id) {
      state.activeMeetingId = state.meetings[0] ? state.meetings[0].id : null;
      suggestions = [];
    }
    renderAll(true);
    showToast(`Deleted "${clean(removed.title) || 'Untitled meeting'}"`, () => {
      state.meetings.splice(Math.min(idx, state.meetings.length), 0, removed);
      state.activeMeetingId = removed.id;
      renderAll(true);
    });
  }

  function addCaptureItem(kind, inputId) {
    const m = activeMeeting();
    if (!m) return;
    const input = $(inputId);
    const text = clean(input.value);
    if (!text) { input.classList.add('invalid'); input.focus(); return; }
    input.classList.remove('invalid');
    m[KIND_TARGET[kind]].push({ id: uid(), text });
    touch(m);
    input.value = '';
    input.focus();
    renderCapture(m);
    renderDerived();
  }

  function removeCaptureItem(kind, itemId) {
    const m = activeMeeting();
    if (!m) return;
    const list = m[KIND_TARGET[kind]];
    const idx = list.findIndex((i) => i.id === itemId);
    if (idx < 0) return;
    const [removed] = list.splice(idx, 1);
    touch(m);
    renderCapture(m);
    renderDerived();
    showToast(`${KIND_LABELS[kind]} removed`, () => {
      const mm = state.meetings.find((x) => x.id === m.id);
      if (!mm) return;
      mm[KIND_TARGET[kind]].splice(Math.min(idx, mm[KIND_TARGET[kind]].length), 0, removed);
      renderAll(false);
    });
  }

  function saveActionFromEditor() {
    const m = activeMeeting();
    if (!m) return;
    const title = clean($('actTitle').value);
    if (!title) {
      $('actTitle').classList.add('invalid');
      $('actTitleErr').hidden = false;
      $('actTitle').focus();
      return;
    }
    const payload = {
      title,
      owner: clean($('actOwner').value),
      due: $('actDue').value || '',
      status: STATUSES.includes($('actStatus').value) ? $('actStatus').value : 'open'
    };
    if (editingActionId) {
      const a = m.actions.find((x) => x.id === editingActionId);
      if (a) Object.assign(a, payload);
      showToast('Action updated');
    } else {
      m.actions.push({ id: uid(), ...payload });
      showToast('Action added');
    }
    touch(m);
    resetActionEditor();
    renderActions(m);
    renderDerived();
  }

  function editAction(id) {
    const m = activeMeeting();
    const a = m && m.actions.find((x) => x.id === id);
    if (!a) return;
    editingActionId = id;
    $('actTitle').value = a.title;
    $('actOwner').value = a.owner;
    $('actDue').value = a.due;
    $('actStatus').value = a.status;
    $('actTitle').classList.remove('invalid');
    $('actTitleErr').hidden = true;
    $('actSaveBtn').textContent = 'Save changes';
    $('actCancelBtn').hidden = false;
    $('actTitle').focus();
  }

  function deleteAction(id) {
    const m = activeMeeting();
    if (!m) return;
    const idx = m.actions.findIndex((a) => a.id === id);
    if (idx < 0) return;
    const [removed] = m.actions.splice(idx, 1);
    if (editingActionId === id) resetActionEditor();
    touch(m);
    renderActions(m);
    renderDerived();
    showToast(`Action deleted: "${removed.title}"`, () => {
      const mm = state.meetings.find((x) => x.id === m.id);
      if (!mm) return;
      mm.actions.splice(Math.min(idx, mm.actions.length), 0, removed);
      renderAll(false);
    });
  }

  function acceptSuggestion(id) {
    const m = activeMeeting();
    const s = suggestions.find((x) => x.id === id);
    if (!m || !s) return;
    if (s.kind === 'action') {
      m.actions.push({ id: uid(), title: s.text, owner: extractOwner(s.text), due: '', status: 'open' });
      renderActions(m);
    } else {
      m[KIND_TARGET[s.kind]].push({ id: uid(), text: s.text });
      renderCapture(m);
    }
    touch(m);
    suggestions = suggestions.filter((x) => x.id !== id);
    renderSuggestions();
    renderDerived();
    showToast(`Added as ${KIND_LABELS[s.kind].toLowerCase()}`);
  }

  /* ========================== Clipboard & files ========================== */

  function copyText(text, msg) {
    const done = () => showToast(msg || 'Copied to clipboard');
    const fallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        done();
      } catch { showToast('Copy failed — select the text manually'); }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  function downloadFile(name, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function copyRecap() {
    const m = activeMeeting();
    if (!m) { showToast('Nothing to copy yet — create a meeting first'); return; }
    if (!clean(m.title)) $('mTitle').classList.add('invalid');
    copyText(recapMarkdown(m), 'Markdown recap copied — review before sharing');
  }

  /* ============================ Help modal ============================== */

  let lastFocus = null;
  function openHelp() {
    lastFocus = document.activeElement;
    if (!$('helpModal').open) $('helpModal').showModal();
  }
  function closeHelp() {
    if ($('helpModal').open) $('helpModal').close();
  }

  /* ============================ Event wiring ============================= */

  // Header
  $('themeBtn').addEventListener('click', () => {
    const current = document.documentElement.dataset.theme || 'dark';
    state.theme = current === 'dark' ? 'light' : 'dark';
    applyTheme();
    save();
    showToast(`${state.theme === 'light' ? 'Light' : 'Dark'} theme saved`);
  });

  function loadDemo() {
    const snapshot = JSON.stringify(state);
    const demos = demoMeetings();
    state.meetings = demos;
    state.activeMeetingId = demos[0].id;
    suggestions = [];
    renderAll(true);
    showToast('Demo meetings loaded', () => {
      state = normalize(JSON.parse(snapshot));
      suggestions = [];
      renderAll(true);
    });
  }
  $('demoBtn').addEventListener('click', loadDemo);
  $('emptyDemoBtn').addEventListener('click', loadDemo);

  $('resetBtn').addEventListener('click', () => {
    if (!window.confirm('Clear all meetings from this browser? This cannot be undone.')) return;
    state = { ...defaultState(), theme: state.theme, seenGuide: true };
    suggestions = [];
    resetActionEditor();
    renderAll(true);
    showToast('All data cleared');
  });

  $('helpBtn').addEventListener('click', openHelp);
  $('helpCloseBtn').addEventListener('click', closeHelp);
  $('helpOkBtn').addEventListener('click', closeHelp);
  $('helpModal').addEventListener('close', () => {
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  });
  $('helpModal').addEventListener('click', (e) => {
    if (e.target === $('helpModal')) closeHelp();
  });

  // History
  $('newMeetingBtn').addEventListener('click', newMeeting);
  $('emptyNewBtn').addEventListener('click', newMeeting);
  $('meetingList').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-role]');
    const li = e.target.closest('li[data-id]');
    if (!btn || !li) return;
    if (btn.dataset.role === 'select') selectMeeting(li.dataset.id);
    if (btn.dataset.role === 'delete') deleteMeeting(li.dataset.id);
  });

  // Meeting detail fields
  const FIELD_MAP = { mTitle: 'title', mDate: 'date', mAttendees: 'attendees', mSender: 'sender', mGoal: 'goal', mNotes: 'notes' };
  Object.entries(FIELD_MAP).forEach(([id, key]) => {
    $(id).addEventListener('input', () => {
      const m = activeMeeting();
      if (!m) return;
      m[key] = $(id).value;
      touch(m);
      if (id === 'mTitle') $(id).classList.remove('invalid');
      renderDerived();
    });
  });

  // Notes scanning
  $('scanBtn').addEventListener('click', () => {
    const m = activeMeeting();
    if (!m) return;
    if (!m.notes.trim()) {
      showToast('Paste some notes first — one thought per line works best');
      $('mNotes').focus();
      return;
    }
    suggestions = suggestFromNotes(m);
    renderSuggestions();
    showToast(suggestions.length
      ? `${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'} found`
      : 'No new suggestions found — try one thought per line');
  });

  $('suggestionList').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-role]');
    const li = e.target.closest('li[data-id]');
    if (!btn || !li) return;
    if (btn.dataset.role === 'accept') acceptSuggestion(li.dataset.id);
    if (btn.dataset.role === 'dismiss') {
      suggestions = suggestions.filter((x) => x.id !== li.dataset.id);
      renderSuggestions();
    }
  });

  // Structured capture (quick-add + remove, per kind)
  [['decision', 'decisionInput', 'addDecisionBtn', 'decisionList'],
   ['risk', 'riskInput', 'addRiskBtn', 'riskList'],
   ['question', 'questionInput', 'addQuestionBtn', 'questionList']
  ].forEach(([kind, inputId, btnId, listId]) => {
    $(btnId).addEventListener('click', () => addCaptureItem(kind, inputId));
    $(inputId).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addCaptureItem(kind, inputId); }
    });
    $(listId).addEventListener('click', (e) => {
      const btn = e.target.closest('[data-role="remove"]');
      const li = e.target.closest('li[data-id]');
      if (btn && li) removeCaptureItem(kind, li.dataset.id);
    });
  });

  // Actions
  $('actSaveBtn').addEventListener('click', saveActionFromEditor);
  $('actCancelBtn').addEventListener('click', resetActionEditor);
  $('actTitle').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); saveActionFromEditor(); }
  });
  $('actTitle').addEventListener('input', () => {
    if (clean($('actTitle').value)) {
      $('actTitle').classList.remove('invalid');
      $('actTitleErr').hidden = true;
    }
  });
  $('actionList').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-role]');
    const li = e.target.closest('li[data-id]');
    if (!btn || !li) return;
    if (btn.dataset.role === 'edit') editAction(li.dataset.id);
    if (btn.dataset.role === 'delete') deleteAction(li.dataset.id);
  });
  $('actionList').addEventListener('change', (e) => {
    const sel = e.target.closest('select[data-role="status"]');
    const li = e.target.closest('li[data-id]');
    if (!sel || !li) return;
    const m = activeMeeting();
    const a = m && m.actions.find((x) => x.id === li.dataset.id);
    if (!a) return;
    a.status = STATUSES.includes(sel.value) ? sel.value : 'open';
    touch(m);
    renderActions(m);
    renderDerived();
  });

  // Tone
  $('toneGroup').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tone]');
    const m = activeMeeting();
    if (!btn || !m) return;
    m.tone = TONES.includes(btn.dataset.tone) ? btn.dataset.tone : 'professional';
    touch(m);
    renderTone(m);
    renderDerived();
  });

  // Export & handoff
  $('copyEmailBtn').addEventListener('click', () => {
    const m = activeMeeting();
    if (m) copyText(emailDraft(m), 'Email draft copied — review before sending');
  });
  $('copyMdBtn').addEventListener('click', copyRecap);
  $('downloadJsonBtn').addEventListener('click', () => {
    downloadFile('meeting-follow-up-kit.json', JSON.stringify({
      ...state,
      exportedAt: new Date().toISOString(),
      note: 'Draft-only local export from Meeting Follow-up Kit. Human review required before any send, calendar, or CRM action.'
    }, null, 2), 'application/json');
    showToast('JSON downloaded');
  });
  $('downloadCsvBtn').addEventListener('click', () => {
    const m = activeMeeting();
    if (!m) { showToast('Create a meeting first'); return; }
    if (!m.actions.length) { showToast('No action items to export yet'); return; }
    downloadFile(`${fileSlug(m.title)}-actions.csv`, actionsCsv(m), 'text/csv');
    showToast('Actions CSV downloaded');
  });
  $('printBtn').addEventListener('click', () => {
    if (!activeMeeting()) { showToast('Create a meeting first'); return; }
    window.print();
  });
  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', () => {
    const file = $('importFile').files && $('importFile').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = normalize(JSON.parse(String(reader.result)));
        if (!next.meetings.length) { showToast('Import failed — no meetings found in that file'); return; }
        next.theme = next.theme || state.theme;
        next.seenGuide = true;
        state = next;
        suggestions = [];
        resetActionEditor();
        renderAll(true);
        showToast(`Imported ${next.meetings.length} meeting${next.meetings.length === 1 ? '' : 's'}`);
      } catch { showToast('Import failed — that file is not valid JSON'); }
    };
    reader.readAsText(file);
    $('importFile').value = '';
  });

  // Toast undo
  $('toastUndo').addEventListener('click', () => {
    const fn = pendingUndo;
    hideToast();
    if (fn) { fn(); showToast('Restored'); }
  });

  // Keyboard shortcuts
  const isTyping = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      copyRecap();
      return;
    }
    if (e.key === '?' && !isTyping(e.target) && !$('helpModal').open) {
      e.preventDefault();
      openHelp();
    }
  });

  /* ================================ Init ================================= */

  renderAll(true);
  if (!state.seenGuide) {
    state.seenGuide = true;
    save();
    openHelp();
  }
})();
