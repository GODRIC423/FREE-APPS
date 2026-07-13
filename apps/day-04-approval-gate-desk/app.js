/* Approval Gate Desk — human review queue for AI-drafted customer messages.
   Local-first, no network calls, no accounts. All data lives in localStorage. */
(() => {
'use strict';

/* ============================== constants ============================== */

const LS_KEY = 'fable-remake:day-04-approval-gate-desk:v1';
const CHANNELS = ['SMS', 'Email', 'Voicemail callback', 'Portal message', 'Chat'];
const STATUSES = ['pending', 'revision', 'approved', 'rejected'];
const RISKS = ['Low', 'Medium', 'High'];
const STATUS_RANK = { pending: 0, revision: 1, approved: 2, rejected: 3 };
const RISK_RANK = { High: 0, Medium: 1, Low: 2 };

const ACTION_LABELS = {
  'approved': 'Approved',
  'approved-with-edits': 'Approved with edits',
  'rejected': 'Rejected',
  'revision-requested': 'Revision requested',
  'reopened': 'Reopened'
};

/* Rejection reason taxonomy — required on reject, optional on revision. */
const REASONS = [
  { code: 'overpromise', label: 'Overpromise / unverifiable guarantee' },
  { code: 'pricing', label: 'Unauthorized pricing, discount, or refund' },
  { code: 'tone', label: 'Tone or brand mismatch' },
  { code: 'factual', label: 'Factual error / wrong details' },
  { code: 'privacy', label: 'Privacy / personal data exposure' },
  { code: 'policy', label: 'Compliance or policy violation' },
  { code: 'context', label: 'Wrong recipient or missing context' },
  { code: 'other', label: 'Other (explain in note)' }
];

/* Heuristic risk scan over the draft text. Weights sum to a level:
   score >= 3 -> High, >= 1 -> Medium, else Low. */
const RISK_RULES = [
  { code: 'guarantee', label: 'Guarantee / absolute promise', weight: 3,
    re: /\b(guarantee[ds]?|promise[sd]?|100\s?%|risk[- ]free|no risk|never fails?)\b/i },
  { code: 'pricing', label: 'Pricing / discount commitment', weight: 2,
    re: /(\$\s?\d|\d{1,3}\s?%\s?off|discount|waived?|free of charge|no charge|refund)/i },
  { code: 'urgency', label: 'Pressure / urgency tactic', weight: 2,
    re: /\b(today only|act now|last chance|final notice|expires (today|tonight|soon))\b/i },
  { code: 'legal', label: 'Legal / warranty exposure', weight: 2,
    re: /\b(warrant(y|ies)|liabilit\w*|lawsuit|legally binding|insurance claim|code violation)\b/i },
  { code: 'pii', label: 'Possible personal data', weight: 2,
    re: /(\d{3}[-.\s]\d{3}[-.\s]\d{4}|\bssn\b|social security|card number|account (number|#))/i },
  { code: 'absolute', label: 'Absolute wording', weight: 1,
    re: /\b(always|definitely|certainly)\b/i }
];

/* ============================== tiny helpers ============================== */

const $$ = sel => [...document.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() :
  `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
const isIso = v => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const fmt = iso => new Date(iso).toLocaleString(undefined,
  { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function timeAgo(iso) {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function debounce(fn, ms) {
  let t = null;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ============================== state ============================== */

function defaultState() {
  return {
    v: 1,
    theme: null,            /* null = follow prefers-color-scheme */
    seenGuide: false,
    reviewer: '',
    selectedId: null,
    filters: { status: 'all', risk: 'all', q: '' },
    ledgerFilter: 'all',
    drafts: [],
    ledger: []
  };
}

const normStr = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

function normalizeDraft(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  let status = normStr(d.status, 20);
  if (status === 'revise') status = 'revision'; /* legacy value */
  return {
    id: normStr(d.id, 40) || uid(),
    customer: normStr(d.customer, 90),
    channel: CHANNELS.includes(d.channel) ? d.channel : 'Email',
    intent: normStr(d.intent ?? d.reviewNote, 140), /* legacy: reviewNote */
    message: normStr(d.message, 1200),
    original: typeof d.original === 'string' ? d.original.slice(0, 1200) : null,
    riskOverride: RISKS.includes(d.riskOverride) ? d.riskOverride : '',
    status: STATUSES.includes(status) ? status : 'pending',
    createdAt: isIso(d.createdAt) ? d.createdAt : new Date().toISOString(),
    decidedAt: isIso(d.decidedAt) ? d.decidedAt : null
  };
}

function normalizeEntry(raw) {
  const e = raw && typeof raw === 'object' ? raw : {};
  return {
    seq: Number.isFinite(e.seq) ? e.seq : 0,
    id: normStr(e.id, 40) || uid(),
    at: isIso(e.at) ? e.at : new Date().toISOString(),
    draftId: normStr(e.draftId, 40),
    customer: normStr(e.customer, 90) || 'Unnamed customer',
    channel: normStr(e.channel, 30) || 'Email',
    action: ACTION_LABELS[e.action] ? e.action : 'approved',
    reviewer: normStr(e.reviewer, 60) || 'Reviewer',
    reasonCode: normStr(e.reasonCode, 30),
    reasonLabel: normStr(e.reasonLabel, 80),
    note: normStr(e.note, 300),
    edited: !!e.edited,
    risk: RISKS.includes(e.risk) ? e.risk : 'Low',
    snapshot: normStr(e.snapshot, 1200),
    /* Hashes are preserved as-is so external tampering stays detectable. */
    prevHash: normStr(e.prevHash, 40),
    hash: normStr(e.hash, 40)
  };
}

function normalize(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const st = defaultState();
  if (src.theme === 'light' || src.theme === 'dark') st.theme = src.theme;
  st.seenGuide = !!src.seenGuide;
  st.reviewer = normStr(src.reviewer, 60);
  const f = src.filters && typeof src.filters === 'object' ? src.filters : {};
  st.filters.status = ['all', ...STATUSES].includes(f.status) ? f.status : 'all';
  st.filters.risk = ['all', ...RISKS].includes(f.risk) ? f.risk : 'all';
  st.filters.q = normStr(f.q, 90);
  st.ledgerFilter = ['all', ...Object.keys(ACTION_LABELS)].includes(src.ledgerFilter) ? src.ledgerFilter : 'all';
  st.drafts = Array.isArray(src.drafts) ? src.drafts.map(normalizeDraft) : [];
  st.ledger = Array.isArray(src.ledger) ? src.ledger.map(normalizeEntry) : [];
  st.ledger.sort((a, b) => a.seq - b.seq);
  st.selectedId = st.drafts.some(d => d.id === src.selectedId) ? src.selectedId : null;
  return st;
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? normalize(JSON.parse(raw)) : defaultState();
  } catch {
    return defaultState();
  }
}

let state = load();

function saveNow() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
}
const save = debounce(saveNow, 250);

/* ============================== domain: risk ============================== */

function analyzeRisk(text) {
  const flags = RISK_RULES.filter(r => r.re.test(text || ''));
  const score = flags.reduce((s, r) => s + r.weight, 0);
  const level = score >= 3 ? 'High' : score >= 1 ? 'Medium' : 'Low';
  return { level, score, flags };
}
const draftRisk = d => analyzeRisk(`${d.message} ${d.intent}`);
const effectiveRisk = d => d.riskOverride || draftRisk(d).level;

/* ============================== domain: hash-chained ledger ============================== */

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function entryDigest(e) {
  return [e.seq, e.at, e.draftId, e.customer, e.channel, e.action, e.reviewer,
    e.reasonCode, e.note, e.edited ? 1 : 0, e.risk, e.snapshot, e.prevHash].join('␟');
}

/* 16 hex chars: fnv1a of the digest plus a salted second pass. */
function hashEntry(e) {
  const d = entryDigest(e);
  return fnv1a(d) + fnv1a(d + '::gate');
}

function appendDecision(ledger, draft, action, opts = {}) {
  const prev = ledger[ledger.length - 1];
  const reason = REASONS.find(r => r.code === opts.reasonCode);
  const entry = {
    seq: prev ? prev.seq + 1 : 1,
    id: uid(),
    at: opts.at || new Date().toISOString(),
    draftId: draft.id,
    customer: draft.customer.trim() || 'Unnamed customer',
    channel: draft.channel,
    action,
    reviewer: (opts.reviewer || state.reviewer || 'Reviewer').trim() || 'Reviewer',
    reasonCode: reason ? reason.code : '',
    reasonLabel: reason ? reason.label : '',
    note: (opts.note || '').trim(),
    edited: !!opts.edited,
    risk: effectiveRisk(draft),
    snapshot: draft.message,
    prevHash: prev ? prev.hash : 'GENESIS'
  };
  entry.hash = hashEntry(entry);
  ledger.push(entry);
  return entry;
}

function verifyChain(ledger) {
  for (let i = 0; i < ledger.length; i++) {
    const e = ledger[i];
    const expectedPrev = i === 0 ? 'GENESIS' : ledger[i - 1].hash;
    if (e.prevHash !== expectedPrev || e.hash !== hashEntry(e)) {
      return { ok: false, at: e.seq };
    }
  }
  return { ok: true, at: null };
}

/* ============================== domain: queue & counts ============================== */

function counts() {
  const c = { pending: 0, revision: 0, approved: 0, rejected: 0, highPending: 0 };
  for (const d of state.drafts) {
    c[d.status]++;
    if (d.status === 'pending' && effectiveRisk(d) === 'High') c.highPending++;
  }
  return c;
}

function visibleDrafts() {
  const { status, risk, q } = state.filters;
  const needle = q.trim().toLowerCase();
  return state.drafts
    .filter(d =>
      (status === 'all' || d.status === status) &&
      (risk === 'all' || effectiveRisk(d) === risk) &&
      (!needle || `${d.customer} ${d.message} ${d.intent}`.toLowerCase().includes(needle)))
    .sort((a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      RISK_RANK[effectiveRisk(a)] - RISK_RANK[effectiveRisk(b)] ||
      a.createdAt.localeCompare(b.createdAt));
}

const selectedDraft = () => state.drafts.find(d => d.id === state.selectedId) || null;

/* ============================== exports ============================== */

function buildMarkdown() {
  const c = counts();
  const chain = verifyChain(state.ledger);
  const lines = [
    '# Approval Gate Desk — review packet', '',
    `Generated: ${new Date().toLocaleString()}`,
    `Reviewer: ${state.reviewer || 'Not set'}`, '',
    '## Queue snapshot',
    `- Pending review: ${c.pending} (high risk: ${c.highPending})`,
    `- Awaiting revision: ${c.revision}`,
    `- Approved: ${c.approved}`,
    `- Rejected: ${c.rejected}`, '',
    '## Drafts awaiting review'
  ];
  const open = state.drafts.filter(d => d.status === 'pending' || d.status === 'revision');
  if (!open.length) lines.push('', '_Queue is clear — no drafts waiting._');
  open.forEach((d, i) => {
    const r = draftRisk(d);
    lines.push('',
      `### ${i + 1}. ${d.customer.trim() || 'Unnamed customer'} — ${d.channel}`,
      `- Status: ${d.status}`,
      `- Risk: ${effectiveRisk(d)}${d.riskOverride ? ' (manual override)' : ''}`,
      `- Flags: ${r.flags.length ? r.flags.map(fl => fl.label).join('; ') : 'none detected'}`,
      `- Context: ${d.intent || '—'}`,
      '', '```text', d.message || '(empty draft)', '```');
  });
  lines.push('', '## Decision log (append-only)');
  if (!state.ledger.length) lines.push('', '_No decisions recorded yet._');
  state.ledger.forEach(e => {
    lines.push(`- #${e.seq} · ${new Date(e.at).toLocaleString()} · ${ACTION_LABELS[e.action]} · ` +
      `${e.customer} (${e.channel}) · by ${e.reviewer}` +
      (e.reasonLabel ? ` · reason: ${e.reasonLabel}` : '') +
      (e.edited ? ' · edited before approval' : '') +
      (e.note ? ` · note: ${e.note}` : ''));
  });
  lines.push('',
    `Chain check: ${chain.ok ? `intact (${state.ledger.length} entries)` : `BROKEN at entry #${chain.at}`}`, '',
    '## Boundary',
    'Every message here is a draft for human review. Approval Gate Desk records decisions locally; it never sends messages or writes to any external system.');
  return lines.join('\n');
}

const csvCell = v => `"${String(v ?? '').replaceAll('"', '""')}"`;

function buildCsv() {
  const head = ['seq', 'timestamp', 'action', 'customer', 'channel', 'reviewer', 'risk',
    'reason', 'note', 'edited', 'message_snapshot', 'prev_hash', 'hash'];
  const rows = state.ledger.map(e => [e.seq, e.at, e.action, e.customer, e.channel,
    e.reviewer, e.risk, e.reasonLabel, e.note, e.edited ? 'yes' : 'no',
    e.snapshot, e.prevHash, e.hash]);
  return [head, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/* ============================== demo scenario ============================== */

function buildDemo() {
  const st = defaultState();
  st.theme = state.theme;
  st.seenGuide = true;
  st.reviewer = state.reviewer || 'Sam (owner)';
  const h = 3600000;
  const now = Date.now();
  const iso = msAgo => new Date(now - msAgo).toISOString();
  const mk = (o, msAgo) => normalizeDraft({ id: uid(), ...o, createdAt: iso(msAgo) });

  const d1 = mk({ customer: 'Dana Whitfield', channel: 'Email',
    intent: 'Reply to refund question after a cancelled install',
    message: 'Hi Dana, sorry about the cancelled install. We can offer a full refund plus 20% off your next booking if you stay with us — just say the word and it is done.' }, 2 * h);
  const d2 = mk({ customer: 'Marcus Lee', channel: 'SMS',
    intent: 'Appointment reminder for Tuesday tune-up',
    message: 'Hi Marcus — reminder that your furnace tune-up is Tuesday between 9 and 11 AM. Reply C to confirm or R to reschedule. Thanks!' }, 5 * h);
  const d3 = mk({ customer: 'Harborview Dental (office mgr)', channel: 'Email',
    intent: 'Follow-up on the duct cleaning quote sent last week',
    message: 'Hi — checking in on the duct cleaning quote we sent last Wednesday. If budget is the sticking point we could look at a small discount for booking this month. Happy to answer questions.' }, 26 * h);
  const d4 = mk({ customer: 'Priya Nair', channel: 'SMS',
    intent: 'Missed call follow-up about a leaking water heater',
    message: 'Hi Priya, sorry we missed your call about the water heater leak. We guarantee same-day service if you book before noon — a tech will fix it today, no risk to you.' }, 1 * h);
  const d5 = mk({ customer: 'Tom Alvarez', channel: 'Portal message',
    intent: 'Response to warranty claim on compressor',
    message: 'Hi Tom, thanks for the warranty claim. Our records show the compressor may be covered; we are confirming with the manufacturer and will follow up with scheduling options.',
    original: 'Hi Tom, the compressor is definitely covered under warranty and we will replace it free of charge this week, guaranteed.' }, 30 * h);
  const d6 = mk({ customer: 'Jess Kim', channel: 'Email',
    intent: 'Thank-you note after completed AC repair',
    message: 'Hi Jess, thanks for having us out today. If anything about the repair feels off in the next few days, reply here and we will take another look.',
    original: 'Hi Jess! Thanks a million!! If you loved the repair we would KILL for a 5-star review — it takes two seconds!!' }, 50 * h);
  const d7 = mk({ customer: 'Ridgeline HOA board', channel: 'Email',
    intent: 'Cover note for annual maintenance proposal',
    message: 'Attached is our proposal. Choose us and your maintenance costs will drop 30% guaranteed — no other vendor can match this, and prices expire soon.' }, 52 * h);
  const d8 = mk({ customer: 'Sofia Grant', channel: 'SMS',
    intent: 'Confirming rescheduled gutter cleaning',
    message: 'Hi Sofia — your gutter cleaning has moved to Friday at 2 PM as requested. Reply if that no longer works. See you then!' }, 28 * h);

  st.drafts = [d1, d2, d3, d4, d5, d6, d7, d8];

  /* Replay decisions in chronological order so the hash chain is valid. */
  const dec = (draft, action, msAgo, opts = {}) => {
    appendDecision(st.ledger, draft, action, { ...opts, at: iso(msAgo), reviewer: st.reviewer });
    if (action === 'rejected') { draft.status = 'rejected'; draft.decidedAt = iso(msAgo); }
    else if (action.startsWith('approved')) { draft.status = 'approved'; draft.decidedAt = iso(msAgo); }
    else if (action === 'revision-requested') { draft.status = 'revision'; }
  };
  dec(d7, 'rejected', 49 * h, { reasonCode: 'overpromise',
    note: '30% and "guaranteed" are unverifiable. Rewrite around the maintenance checklist instead.' });
  dec(d6, 'approved-with-edits', 47 * h, { edited: true,
    note: 'Toned down the review ask; kept it service-first.' });
  dec(d5, 'revision-requested', 27 * h, { reasonCode: 'factual',
    note: 'Verify warranty coverage with the manufacturer before promising a replacement.' });
  dec(d8, 'approved', 25 * h);

  st.selectedId = d4.id;
  return st;
}

/* ============================== element registry ============================== */

const el = {};
[
  'demoBtn', 'helpBtn', 'themeToggle', 'newDraftBtn', 'emptyNewBtn',
  'statPending', 'statHighRisk', 'statApproved', 'statDecisions',
  'statusFilters', 'riskFilter', 'searchInput', 'queueList', 'queueCount',
  'reviewEmpty', 'reviewForm', 'reviewerName', 'statusChip', 'riskBadge', 'editedBadge', 'draftMeta',
  'fCustomer', 'fChannel', 'fIntent', 'fMessage', 'riskFlags',
  'originalWrap', 'originalText', 'revertBtn', 'riskOverride',
  'approveBtn', 'reviseBtn', 'rejectBtn', 'reopenBtn', 'deleteBtn',
  'drawer', 'drawerTitle', 'reasonRequired', 'drawerReason', 'drawerNote', 'drawerConfirm', 'drawerCancel',
  'chainBadge', 'ledgerCount', 'ledgerFilter', 'ledgerList',
  'copyMdBtn', 'downloadJsonBtn', 'downloadCsvBtn', 'printBtn', 'importBtn', 'importFile', 'resetBtn',
  'toast', 'toastMsg', 'toastAction',
  'helpModal', 'helpClose', 'printArea'
].forEach(id => { el[id] = document.getElementById(id); });

/* ============================== render ============================== */

function renderStats() {
  const c = counts();
  el.statPending.textContent = String(c.pending);
  el.statHighRisk.textContent = String(c.highPending);
  el.statApproved.textContent = String(c.approved);
  el.statDecisions.textContent = String(state.ledger.length);
}

function renderQueue() {
  const list = visibleDrafts();
  el.queueCount.textContent = String(list.length);
  $$('#statusFilters .pill').forEach(b => {
    const active = b.dataset.status === state.filters.status;
    b.classList.toggle('is-active', active);
    b.setAttribute('aria-pressed', String(active));
  });
  if (el.riskFilter.value !== state.filters.risk) el.riskFilter.value = state.filters.risk;
  if (el.searchInput.value !== state.filters.q) el.searchInput.value = state.filters.q;

  if (!list.length) {
    el.queueList.innerHTML = `<li class="empty-state">${state.drafts.length
      ? '<p><strong>No drafts match these filters.</strong></p><p>Clear the search or switch the status and risk filters.</p>'
      : '<p><strong>The queue is empty.</strong></p><p>Load the demo scenario or add the first AI draft to review.</p>'}</li>`;
    return;
  }
  el.queueList.innerHTML = list.map(d => {
    const risk = effectiveRisk(d);
    const msg = d.message || 'Empty draft — add the message text.';
    const snippet = msg.slice(0, 110) + (msg.length > 110 ? '…' : '');
    const selected = d.id === state.selectedId;
    return `<li><button type="button" class="queue-item${selected ? ' is-selected' : ''}" data-id="${esc(d.id)}" aria-pressed="${selected}">
      <span class="qi-top"><strong>${esc(d.customer.trim() || 'Unnamed customer')}</strong><span class="chip risk-${risk.toLowerCase()}">${risk}</span></span>
      <span class="qi-snippet">${esc(snippet)}</span>
      <span class="qi-meta"><span class="chip status-${esc(d.status)}">${esc(d.status)}</span><span class="meta-text">${esc(d.channel)} · ${esc(timeAgo(d.createdAt))}</span></span>
    </button></li>`;
  }).join('');
}

function renderRiskUI() {
  const d = selectedDraft();
  if (!d || el.reviewForm.hidden) return;
  const r = draftRisk(d);
  const eff = effectiveRisk(d);
  el.riskBadge.textContent = `${eff} risk${d.riskOverride ? ' (override)' : ''}`;
  el.riskBadge.className = `chip risk-${eff.toLowerCase()}`;
  el.riskFlags.innerHTML = r.flags.length
    ? r.flags.map(fl => `<span class="flag">${esc(fl.label)}</span>`).join('')
    : '<span class="flag flag-none">No risk flags detected</span>';
  const edited = d.original !== null && d.original !== d.message;
  el.editedBadge.hidden = !edited;
  el.originalWrap.hidden = !edited;
  if (edited) el.originalText.textContent = d.original;
}

function renderReview() {
  const d = selectedDraft();
  if (el.reviewerName.value !== state.reviewer) el.reviewerName.value = state.reviewer;
  if (!d) {
    el.reviewEmpty.hidden = false;
    el.reviewForm.hidden = true;
    return;
  }
  el.reviewEmpty.hidden = true;
  el.reviewForm.hidden = false;
  el.fCustomer.value = d.customer;
  el.fChannel.value = d.channel;
  el.fIntent.value = d.intent;
  el.fMessage.value = d.message;
  el.riskOverride.value = d.riskOverride;
  el.statusChip.textContent = d.status;
  el.statusChip.className = `chip status-${d.status}`;
  el.draftMeta.textContent = `created ${fmt(d.createdAt)}${d.decidedAt ? ` · decided ${fmt(d.decidedAt)}` : ''}`;
  const locked = d.status === 'approved' || d.status === 'rejected';
  [el.fCustomer, el.fChannel, el.fIntent, el.fMessage, el.riskOverride].forEach(i => { i.disabled = locked; });
  el.approveBtn.hidden = locked;
  el.reviseBtn.hidden = locked;
  el.rejectBtn.hidden = locked;
  el.reopenBtn.hidden = !locked;
  el.fCustomer.classList.remove('invalid');
  el.fMessage.classList.remove('invalid');
  closeDrawer();
  renderRiskUI();
}

function renderLedger() {
  const chain = verifyChain(state.ledger);
  el.ledgerCount.textContent = String(state.ledger.length);
  el.chainBadge.textContent = !state.ledger.length ? 'No entries yet'
    : chain.ok ? `Chain intact · ${state.ledger.length} entries`
    : `Chain broken at #${chain.at}`;
  el.chainBadge.className = `chip ${!state.ledger.length ? '' : chain.ok ? 'chip-ok' : 'chip-bad'}`;
  if (el.ledgerFilter.value !== state.ledgerFilter) el.ledgerFilter.value = state.ledgerFilter;

  const rows = state.ledger
    .filter(e => state.ledgerFilter === 'all' || e.action === state.ledgerFilter)
    .slice().reverse();
  if (!rows.length) {
    el.ledgerList.innerHTML = `<li class="empty-state"><p><strong>${state.ledger.length
      ? 'No entries match this filter.' : 'No decisions logged yet.'}</strong></p><p>${state.ledger.length
      ? 'Switch the filter to see other decision types.'
      : 'Approve, reject, or request revision on a draft — every decision lands here permanently.'}</p></li>`;
    return;
  }
  el.ledgerList.innerHTML = rows.map(e => `<li class="ledger-item act-${esc(e.action)}">
    <div class="li-top">
      <span class="chip act-chip-${esc(e.action)}">${esc(ACTION_LABELS[e.action])}</span>
      <strong>${esc(e.customer)}</strong>
      <span class="meta-text">${esc(e.channel)} · by ${esc(e.reviewer)}</span>
      <time class="meta-text mono" datetime="${esc(e.at)}">${esc(fmt(e.at))}</time>
    </div>
    ${e.reasonLabel ? `<p class="li-line">Reason: ${esc(e.reasonLabel)}</p>` : ''}
    ${e.note ? `<p class="li-line">${esc(e.note)}</p>` : ''}
    ${e.edited ? '<p class="li-line meta-text">Message was edited before approval.</p>' : ''}
    <p class="hash-line mono">#${e.seq} · ${esc(e.hash)} &larr; ${esc(e.prevHash)}</p>
  </li>`).join('');
}

function renderPrint() {
  const c = counts();
  const chain = verifyChain(state.ledger);
  const open = state.drafts.filter(d => d.status === 'pending' || d.status === 'revision');
  el.printArea.innerHTML = `
    <h1>Approval Gate Desk — audit report</h1>
    <p>Generated ${esc(new Date().toLocaleString())} · Reviewer: ${esc(state.reviewer || 'Not set')}</p>
    <p>Pending ${c.pending} (high risk ${c.highPending}) · Revision ${c.revision} · Approved ${c.approved} · Rejected ${c.rejected} · Chain: ${chain.ok ? 'intact' : `BROKEN at #${chain.at}`}</p>
    <h2>Drafts awaiting review</h2>
    ${open.length ? open.map(d => `<div class="print-draft">
      <h3>${esc(d.customer.trim() || 'Unnamed customer')} — ${esc(d.channel)} · ${esc(effectiveRisk(d))} risk · ${esc(d.status)}</h3>
      ${d.intent ? `<p><em>${esc(d.intent)}</em></p>` : ''}
      <blockquote>${esc(d.message || '(empty draft)')}</blockquote>
    </div>`).join('') : '<p>Queue is clear.</p>'}
    <h2>Decision log</h2>
    ${state.ledger.length ? `<table><thead><tr><th>#</th><th>When</th><th>Action</th><th>Customer</th><th>Reviewer</th><th>Reason / note</th></tr></thead><tbody>${
      state.ledger.map(e => `<tr><td>${e.seq}</td><td>${esc(fmt(e.at))}</td><td>${esc(ACTION_LABELS[e.action])}${e.edited ? ' (edited)' : ''}</td><td>${esc(e.customer)}</td><td>${esc(e.reviewer)}</td><td>${esc([e.reasonLabel, e.note].filter(Boolean).join(' — '))}</td></tr>`).join('')
    }</tbody></table>` : '<p>No decisions logged.</p>'}
    <p class="print-foot">Draft-only boundary: all messages are drafts for human review; nothing is sent from this tool.</p>`;
}

function renderAll() {
  renderStats();
  renderQueue();
  renderReview();
  renderLedger();
}

/* ============================== toast ============================== */

let toastTimer = null;
function toast(msg, opts = {}) {
  el.toastMsg.textContent = msg;
  if (opts.actionLabel && opts.onAction) {
    el.toastAction.hidden = false;
    el.toastAction.textContent = opts.actionLabel;
    el.toastAction.onclick = () => { hideToast(); opts.onAction(); };
  } else {
    el.toastAction.hidden = true;
    el.toastAction.onclick = null;
  }
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, opts.duration || 3200);
}
function hideToast() { el.toast.classList.remove('show'); }

/* ============================== help modal ============================== */

let lastFocus = null;
function openHelp() {
  lastFocus = document.activeElement;
  el.helpModal.hidden = false;
  el.helpClose.focus();
}
function closeHelp() {
  el.helpModal.hidden = true;
  if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
}
el.helpModal.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const items = $$('#helpModal button, #helpModal a[href], #helpModal input, #helpModal select, #helpModal textarea')
    .filter(i => !i.disabled);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
el.helpModal.addEventListener('click', e => { if (e.target === el.helpModal) closeHelp(); });
el.helpClose.addEventListener('click', closeHelp);
el.helpBtn.addEventListener('click', openHelp);

/* ============================== decisions ============================== */

function requireValidDraft(d) {
  let ok = true;
  if (!d.customer.trim()) { el.fCustomer.classList.add('invalid'); ok = false; }
  if (!d.message.trim()) { el.fMessage.classList.add('invalid'); ok = false; }
  if (!ok) toast('Add a customer name and message text before deciding.');
  return ok;
}

function approveSelected() {
  const d = selectedDraft();
  if (!d || d.status === 'approved' || d.status === 'rejected') return;
  if (!requireValidDraft(d)) return;
  if (d.original === null) d.original = d.message;
  const edited = d.original.trim() !== d.message.trim();
  appendDecision(state.ledger, d, edited ? 'approved-with-edits' : 'approved', { edited });
  d.status = 'approved';
  d.decidedAt = new Date().toISOString();
  save();
  renderAll();
  toast(edited ? 'Approved with edits — logged.' : 'Approved — logged.');
}

let drawerMode = 'reject';
function openDrawer(mode) {
  const d = selectedDraft();
  if (!d || !requireValidDraft(d)) return;
  drawerMode = mode;
  el.drawerTitle.textContent = mode === 'reject' ? 'Reject this draft' : 'Request a revision';
  el.reasonRequired.hidden = mode !== 'reject';
  el.drawerConfirm.textContent = mode === 'reject' ? 'Confirm rejection' : 'Log revision request';
  el.drawerConfirm.classList.toggle('btn-danger', mode === 'reject');
  el.drawerReason.value = '';
  el.drawerNote.value = '';
  el.drawerReason.classList.remove('invalid');
  el.drawer.hidden = false;
  el.drawerReason.focus();
}
function closeDrawer() { el.drawer.hidden = true; }

function confirmDrawer() {
  const d = selectedDraft();
  if (!d) return;
  const reasonCode = el.drawerReason.value;
  if (drawerMode === 'reject' && !reasonCode) {
    el.drawerReason.classList.add('invalid');
    toast('Pick a rejection reason — it feeds the taxonomy in the audit log.');
    return;
  }
  const note = el.drawerNote.value.trim();
  if (d.original === null && d.message.trim()) d.original = d.message;
  if (drawerMode === 'reject') {
    appendDecision(state.ledger, d, 'rejected', { reasonCode, note });
    d.status = 'rejected';
    d.decidedAt = new Date().toISOString();
    toast('Rejected — reason logged.');
  } else {
    appendDecision(state.ledger, d, 'revision-requested', { reasonCode, note });
    d.status = 'revision';
    d.decidedAt = null;
    toast('Revision requested — logged.');
  }
  save();
  renderAll();
}

function reopenSelected() {
  const d = selectedDraft();
  if (!d || (d.status !== 'approved' && d.status !== 'rejected')) return;
  appendDecision(state.ledger, d, 'reopened', { note: 'Returned to pending for another review.' });
  d.status = 'pending';
  d.decidedAt = null;
  save();
  renderAll();
  toast('Reopened — back in the pending queue.');
}

function deleteSelected() {
  const d = selectedDraft();
  if (!d) return;
  const idx = state.drafts.indexOf(d);
  state.drafts.splice(idx, 1);
  state.selectedId = null;
  save();
  renderAll();
  toast(`Deleted draft for ${d.customer.trim() || 'unnamed customer'}.`, {
    actionLabel: 'Undo',
    duration: 7000,
    onAction: () => {
      state.drafts.splice(Math.min(idx, state.drafts.length), 0, d);
      state.selectedId = d.id;
      save();
      renderAll();
      toast('Draft restored.');
    }
  });
}

function newDraft() {
  const d = normalizeDraft({ id: uid(), channel: 'SMS', status: 'pending' });
  state.drafts.unshift(d);
  state.selectedId = d.id;
  state.filters = { status: 'all', risk: 'all', q: '' };
  save();
  renderAll();
  el.fCustomer.focus();
  toast('New draft added to the queue.');
}

/* ============================== event wiring ============================== */

/* Queue selection (event delegation). */
el.queueList.addEventListener('click', e => {
  const btn = e.target.closest('[data-id]');
  if (!btn) return;
  state.selectedId = btn.dataset.id;
  save();
  renderQueue();
  renderReview();
});

/* Filters. */
el.statusFilters.addEventListener('click', e => {
  const btn = e.target.closest('[data-status]');
  if (!btn) return;
  state.filters.status = btn.dataset.status;
  save();
  renderQueue();
});
el.riskFilter.addEventListener('change', () => { state.filters.risk = el.riskFilter.value; save(); renderQueue(); });
el.searchInput.addEventListener('input', () => { state.filters.q = el.searchInput.value; save(); renderQueue(); });
el.ledgerFilter.addEventListener('change', () => { state.ledgerFilter = el.ledgerFilter.value; save(); renderLedger(); });

/* Review pad inputs write straight into the selected draft. */
function updateDraftField(key, value) {
  const d = selectedDraft();
  if (!d) return;
  d[key] = value;
  save();
  renderStats();
  renderQueue();
  renderRiskUI();
}
el.fCustomer.addEventListener('input', () => { el.fCustomer.classList.remove('invalid'); updateDraftField('customer', el.fCustomer.value); });
el.fChannel.addEventListener('change', () => updateDraftField('channel', el.fChannel.value));
el.fIntent.addEventListener('input', () => updateDraftField('intent', el.fIntent.value));
el.fMessage.addEventListener('input', () => { el.fMessage.classList.remove('invalid'); updateDraftField('message', el.fMessage.value); });
/* The first committed message text becomes the preserved "original AI draft" baseline. */
el.fMessage.addEventListener('change', () => {
  const d = selectedDraft();
  if (d && d.original === null && d.message.trim()) { d.original = d.message; save(); }
});
el.riskOverride.addEventListener('change', () => updateDraftField('riskOverride', el.riskOverride.value));
el.revertBtn.addEventListener('click', () => {
  const d = selectedDraft();
  if (!d || d.original === null) return;
  d.message = d.original;
  save();
  renderAll();
  toast('Reverted to the original AI draft.');
});
el.reviewerName.addEventListener('input', () => { state.reviewer = el.reviewerName.value; save(); });

/* Decisions. */
el.approveBtn.addEventListener('click', approveSelected);
el.rejectBtn.addEventListener('click', () => openDrawer('reject'));
el.reviseBtn.addEventListener('click', () => openDrawer('revise'));
el.drawerConfirm.addEventListener('click', confirmDrawer);
el.drawerCancel.addEventListener('click', closeDrawer);
el.reopenBtn.addEventListener('click', reopenSelected);
el.deleteBtn.addEventListener('click', deleteSelected);
el.newDraftBtn.addEventListener('click', newDraft);
el.emptyNewBtn.addEventListener('click', newDraft);

/* Header actions. */
el.demoBtn.addEventListener('click', () => {
  if ((state.drafts.length || state.ledger.length) &&
      !confirm('Replace the current drafts and decision log with the demo scenario?')) return;
  state = buildDemo();
  saveNow();
  applyTheme();
  renderAll();
  toast('Demo loaded — 8 drafts, 4 logged decisions.');
});
el.themeToggle.addEventListener('click', () => {
  const current = document.documentElement.dataset.theme;
  state.theme = current === 'dark' ? 'light' : 'dark';
  save();
  applyTheme();
});

/* Export & handoff. */
function copyText(text, okMsg) {
  const done = () => toast(okMsg);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}
function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); }
  catch { toast('Copy failed — use Download JSON instead.'); }
  ta.remove();
}
el.copyMdBtn.addEventListener('click', () => copyText(buildMarkdown(), 'Markdown packet copied.'));
el.downloadJsonBtn.addEventListener('click', () => {
  download('approval-gate-desk.json', JSON.stringify({
    app: 'Approval Gate Desk',
    exportedAt: new Date().toISOString(),
    boundary: 'Draft-only: every message requires human review before sending.',
    ...state
  }, null, 2), 'application/json');
  toast('JSON backup downloaded.');
});
el.downloadCsvBtn.addEventListener('click', () => {
  if (!state.ledger.length) { toast('No decisions to export yet.'); return; }
  download('approval-gate-desk-audit.csv', buildCsv(), 'text/csv');
  toast('Audit CSV downloaded.');
});
el.printBtn.addEventListener('click', () => { renderPrint(); window.print(); });
window.addEventListener('beforeprint', renderPrint);
el.importBtn.addEventListener('click', () => el.importFile.click());
el.importFile.addEventListener('change', () => {
  const file = el.importFile.files && el.importFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = normalize(JSON.parse(String(reader.result)));
      saveNow();
      applyTheme();
      renderAll();
      toast('Import complete.');
    } catch {
      toast('Import failed — that file is not valid JSON.');
    }
  };
  reader.readAsText(file);
  el.importFile.value = '';
});
el.resetBtn.addEventListener('click', () => {
  if (!confirm('Reset Approval Gate Desk? This clears all drafts and the decision log from this browser.')) return;
  const theme = state.theme;
  const seen = state.seenGuide;
  state = defaultState();
  state.theme = theme;
  state.seenGuide = seen;
  saveNow();
  renderAll();
  toast('All data cleared.');
});

/* Keyboard shortcuts. */
function moveSelection(dir) {
  const list = visibleDrafts();
  if (!list.length) return;
  const idx = list.findIndex(d => d.id === state.selectedId);
  const nextIdx = idx === -1
    ? (dir > 0 ? 0 : list.length - 1)
    : Math.min(list.length - 1, Math.max(0, idx + dir));
  state.selectedId = list[nextIdx].id;
  save();
  renderQueue();
  renderReview();
}
document.addEventListener('keydown', e => {
  const typing = /^(input|textarea|select)$/i.test(e.target.tagName);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    copyText(buildMarkdown(), 'Markdown packet copied.');
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    if (el.drawer.hidden) approveSelected();
    return;
  }
  if (e.key === 'Escape') {
    if (!el.helpModal.hidden) closeHelp();
    else if (!el.drawer.hidden) closeDrawer();
    return;
  }
  if (typing) return;
  if (e.key === '?') { e.preventDefault(); openHelp(); return; }
  if (e.key === 'j' || e.key === 'J') { moveSelection(1); return; }
  if (e.key === 'k' || e.key === 'K') { moveSelection(-1); }
});

/* ============================== theme & init ============================== */

function applyTheme() {
  const preferLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  const t = state.theme || (preferLight ? 'light' : 'dark');
  document.documentElement.dataset.theme = t;
  el.themeToggle.textContent = t === 'dark' ? 'Light mode' : 'Dark mode';
  el.themeToggle.setAttribute('aria-pressed', String(t === 'light'));
}

/* Populate the rejection-reason taxonomy once. */
el.drawerReason.innerHTML = '<option value="">Select a reason…</option>' +
  REASONS.map(r => `<option value="${esc(r.code)}">${esc(r.label)}</option>`).join('');

applyTheme();
renderAll();

if (!state.seenGuide) {
  state.seenGuide = true;
  saveNow();
  openHelp();
}

})();
