/* Proof Vault — catalog wins as reusable, approval-gated proof cards.
   Local-first remake. No network calls, no accounts; localStorage only. */
(() => {
'use strict';

/* ============================== Constants ============================== */

const STORAGE_KEY = 'fable-remake:proof-vault:v1';

const STATUS_FLOW = ['captured', 'redaction', 'pending', 'approved'];
const STATUS_META = {
  captured:  { label: 'Captured',          badge: 'st-captured'  },
  redaction: { label: 'Redaction review',  badge: 'st-redaction' },
  pending:   { label: 'Pending approval',  badge: 'st-pending'   },
  approved:  { label: 'Approved',          badge: 'st-approved'  }
};

const REDACTION_ITEMS = [
  { key: 'names',      label: 'Names & customer identifiers removed or anonymized' },
  { key: 'secrets',    label: 'Secrets, tokens, account IDs & internal URLs absent' },
  { key: 'financials', label: 'Financial specifics generalized or client-cleared' },
  { key: 'visuals',    label: 'Screenshots/photos scrubbed (faces, screens, addresses)' },
  { key: 'thirdparty', label: 'Third-party & partner data cleared for reuse' }
];

const ARTIFACT_TYPES = ['Screenshot', 'Report snippet', 'Result metric', 'Client quote',
  'Before / after note', 'Approval record', 'Demo recording', 'Other'];

const ANGLE_TYPES = ['metric', 'problem', 'beforeafter', 'trust'];

const FIELD_MAP = [
  ['fTitle', 'title'], ['fSource', 'source'], ['fMetric', 'metric'],
  ['fLocation', 'location'], ['fContext', 'context'], ['fResult', 'result'],
  ['fRedactionNotes', 'redactionNotes'], ['fApprover', 'approver']
];

const $ = (id) => document.getElementById(id);

/* ============================== Utilities ============================== */

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function clamp(n, min, max) {
  n = Number(n);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : min;
}
function uid() { return 'pc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
function firstSentence(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const m = clean.match(/[^.!?]+[.!?]/);
  return (m ? m[0] : clean.slice(0, 140)).trim();
}
function truncate(s, n) {
  s = String(s || '').trim();
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function parseTags(raw) {
  return [...new Set(String(raw || '').split(',').map((t) => t.trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean))].slice(0, 12);
}

/* ============================== State ============================== */

function blankCard() {
  const now = new Date().toISOString();
  return {
    id: uid(), title: '', source: '', type: 'Screenshot', tags: [],
    context: '', result: '', metric: '', location: '',
    impact: 5, confidence: 5,
    redaction: { names: false, secrets: false, financials: false, visuals: false, thirdparty: false },
    redactionNotes: '', status: 'captured',
    approver: '', approvedBy: '', approvedAt: '',
    createdAt: now, updatedAt: now
  };
}

// Accepts current cards, legacy day-13 cards, and arbitrary junk without crashing.
function normalizeCard(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const base = blankCard();
  const legacyStatus = {
    'Needs capture': 'captured', 'Needs redaction': 'redaction',
    'Needs owner approval': 'pending', 'Ready for case study': 'approved'
  };
  const str = (v, max) => typeof v === 'string' ? v.slice(0, max) : '';
  const card = {
    ...base,
    id: typeof raw.id === 'string' && raw.id ? raw.id : base.id,
    title: str(raw.title, 120) || str(raw.proofTitle, 120),
    source: str(raw.source, 80) || str(raw.sourceApp, 80),
    type: ARTIFACT_TYPES.includes(raw.type) ? raw.type
      : ARTIFACT_TYPES.includes(raw.artifactType) ? raw.artifactType : 'Other',
    tags: Array.isArray(raw.tags) ? parseTags(raw.tags.join(',')) : [],
    context: str(raw.context, 900) || str(raw.snippet, 900),
    result: str(raw.result, 900),
    metric: str(raw.metric, 80),
    location: str(raw.location, 160),
    impact: clamp(raw.impact ?? 5, 1, 10),
    confidence: clamp(raw.confidence ?? 5, 1, 10),
    redactionNotes: str(raw.redactionNotes, 400),
    status: STATUS_FLOW.includes(raw.status) ? raw.status : (legacyStatus[raw.status] || 'captured'),
    approver: str(raw.approver, 80),
    approvedBy: str(raw.approvedBy, 80),
    approvedAt: str(raw.approvedAt, 40),
    createdAt: str(raw.createdAt, 40) || base.createdAt,
    updatedAt: str(raw.updatedAt, 40) || base.updatedAt
  };
  card.redaction = {};
  const legacyRed = { names: !!raw.redactNames, secrets: !!raw.redactSecrets };
  for (const item of REDACTION_ITEMS) {
    const src = raw.redaction && typeof raw.redaction === 'object' ? raw.redaction[item.key] : undefined;
    card.redaction[item.key] = src !== undefined ? !!src : !!legacyRed[item.key];
  }
  if (card.status === 'approved' && !card.approvedAt) card.approvedAt = card.updatedAt;
  return card;
}

function normalize(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    version: 1,
    theme: src.theme === 'light' ? 'light' : src.theme === 'dark' ? 'dark' : null,
    seenGuide: !!src.seenGuide,
    cards: Array.isArray(src.cards) ? src.cards.map(normalizeCard).filter(Boolean) : [],
    query: '', statusFilter: 'all', tagFilter: '',
    sort: ['updated', 'readiness', 'impact', 'title'].includes(src.sort) ? src.sort : 'updated',
    angleType: ANGLE_TYPES.includes(src.angleType) ? src.angleType : 'metric',
    angleVariant: Number.isInteger(src.angleVariant) ? src.angleVariant : 0,
    view: 'gallery', activeId: null
  };
}

let state = loadState();

function loadState() {
  try { return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
  catch { return normalize(null); }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
}
const scheduleSave = debounce(saveState, 250);

function activeCard() { return state.cards.find((c) => c.id === state.activeId) || null; }
function touch(card) { card.updatedAt = new Date().toISOString(); }

/* ============================== Domain logic ============================== */

function redactionDone(card) { return REDACTION_ITEMS.filter((i) => card.redaction[i.key]).length; }
function redactionComplete(card) { return redactionDone(card) === REDACTION_ITEMS.length; }
function redactionMissing(card) { return REDACTION_ITEMS.filter((i) => !card.redaction[i.key]).map((i) => i.label); }

// 0–100 composite: substance (50) + redaction (20) + workflow (18) + conviction (12).
function readiness(card) {
  let score = 0;
  if (card.title.trim()) score += 10;
  if (card.context.trim().length >= 30) score += 12;
  if (card.result.trim().length >= 20) score += 14;
  if (card.metric.trim()) score += 8;
  if (card.location.trim()) score += 6;
  score += redactionDone(card) * 4;
  score += { captured: 0, redaction: 4, pending: 10, approved: 18 }[card.status] || 0;
  score += Math.round(((card.impact + card.confidence) / 20) * 12);
  return Math.min(100, score);
}
function readinessBand(score) {
  if (score < 40) return 'raw capture';
  if (score < 65) return 'shaping up';
  if (score < 85) return 'strong candidate';
  return 'flagship proof';
}

// Returns '' when the card may advance, otherwise the blocking reason.
function gateMessage(card) {
  const next = STATUS_FLOW[STATUS_FLOW.indexOf(card.status) + 1];
  if (!next) return 'Fully approved — this card is cleared for case-study drafting.';
  if (!card.title.trim()) return 'Add a title before advancing.';
  if (next === 'pending' && !redactionComplete(card)) {
    return `Complete the redaction checklist first (${redactionDone(card)}/${REDACTION_ITEMS.length} done).`;
  }
  if (next === 'approved' && !card.approver.trim()) {
    return 'Name the approver (person or role) before recording approval.';
  }
  return '';
}

function advanceStatus(card) {
  const idx = STATUS_FLOW.indexOf(card.status);
  const next = STATUS_FLOW[idx + 1];
  if (!next || gateMessage(card)) return false;
  card.status = next;
  if (next === 'approved') {
    card.approvedBy = card.approver.trim();
    card.approvedAt = new Date().toISOString();
  }
  touch(card);
  return true;
}
function sendBackStatus(card) {
  const idx = STATUS_FLOW.indexOf(card.status);
  if (idx <= 0) return false;
  if (card.status === 'approved') { card.approvedBy = ''; card.approvedAt = ''; }
  card.status = STATUS_FLOW[idx - 1];
  touch(card);
  return true;
}

/* ---------- Case-study angle generator (pure) ---------- */

function generateAngle(card, type, variant) {
  const pick = (arr) => arr[((variant % arr.length) + arr.length) % arr.length];
  const title = card.title.trim() || 'Untitled proof';
  const source = card.source.trim() || 'a lightweight workflow';
  const outcome = card.metric.trim() || firstSentence(card.result) || 'a measurable outcome (add the metric)';
  const problem = firstSentence(card.context) || 'a costly, recurring problem (add context to sharpen this)';
  const problemShort = truncate(problem.replace(/[.!?]$/, ''), 70);
  const evidence = card.type + (card.location.trim() ? ' — ' + card.location.trim() : ' (add evidence location)');
  const reuseNote = card.status === 'approved'
    ? `Approved by ${card.approvedBy || 'reviewer'} on ${fmtDate(card.approvedAt) || 'record'} — cleared for case-study drafting.`
    : `Status: ${STATUS_META[card.status].label} — keep internal until approved.`;

  let headline, hook, craft;
  if (type === 'problem') {
    headline = pick([
      `From "${problemShort}" to ${truncate(outcome, 60)}`,
      `A concrete answer to a familiar problem: ${problemShort}`,
      `${title}: the problem, the fix, the receipt`
    ]);
    hook = pick([
      `Most prospects will recognize this situation instantly: ${problem} This card documents the path from that pain to ${outcome}.`,
      `Open with the problem in the client's own words — ${problemShort.toLowerCase()} — then land the resolution: ${outcome}.`
    ]);
    craft = 'Mirror the prospect’s vocabulary for the problem; skip internal jargon.';
  } else if (type === 'beforeafter') {
    headline = pick([
      `Before / after: ${title}`,
      `What changed when ${source} entered the picture`,
      `${title} — the same operation, before and after`
    ]);
    hook = pick([
      `Two snapshots, one variable. Before: ${problemShort.toLowerCase()}. After: ${outcome}. The contrast carries the whole story.`,
      `Put the before state and the after state side by side — ${outcome} means little without the starting point.`
    ]);
    craft = 'Show the before state honestly; an ugly baseline makes the after credible.';
  } else if (type === 'trust') {
    headline = pick([
      `Proof with a paper trail: ${title}`,
      `${title} — evidence that shipped through review, not around it`,
      `Every claim here passed a redaction check and a human approval gate`
    ]);
    hook = pick([
      `This isn’t a screenshot pulled from a camera roll. It went through a ${REDACTION_ITEMS.length}-point redaction checklist and named-approver sign-off before anyone could reuse it.`,
      `The result (${outcome}) matters, but the process is the differentiator: documented evidence, scrubbed identifiers, explicit approval.`
    ]);
    craft = 'Name the review steps — the redaction checklist and the approval gate are the story.';
  } else { // metric
    headline = pick([
      `${truncate(outcome, 70)}: the number behind "${title}"`,
      `How ${source} produced ${truncate(outcome, 60)}`,
      `${truncate(outcome, 70)} — proof, not promises`
    ]);
    hook = pick([
      `Start with the number. ${outcome} is what changed; this card holds the context it came from and how it was measured.`,
      `One metric carries the story: ${outcome}. Everything else — situation, method, evidence — backs it up.`
    ]);
    craft = 'Lead with the metric in the first line and keep the measurement method visible.';
  }

  return {
    headline, hook,
    outline: [
      `Situation: ${problem}`,
      `What ran: ${source} (${card.type})`,
      `Outcome: ${outcome}`,
      `Evidence to attach: ${evidence}`,
      `Craft note: ${craft}`,
      `Reuse boundary: ${reuseNote}`
    ]
  };
}

/* ---------- Exports (pure builders) ---------- */

function vaultStats() {
  const total = state.cards.length;
  const approved = state.cards.filter((c) => c.status === 'approved').length;
  const redactionOpen = state.cards.filter((c) => !redactionComplete(c)).length;
  const avg = total ? Math.round(state.cards.reduce((s, c) => s + readiness(c), 0) / total) : 0;
  return { total, approved, redactionOpen, avg };
}

function cardMarkdown(card, i) {
  const missing = redactionMissing(card);
  const approval = card.status === 'approved'
    ? `Approved by ${card.approvedBy || 'unrecorded'} on ${fmtDate(card.approvedAt) || 'unrecorded'}`
    : card.status === 'pending'
      ? `Pending sign-off from ${card.approver || 'unassigned approver'}`
      : 'Not yet in approval';
  return [
    `### ${i + 1}. ${card.title || 'Untitled proof'}`,
    `- Status: ${STATUS_META[card.status].label} · Readiness ${readiness(card)}/100 (${readinessBand(readiness(card))})`,
    `- Source: ${card.source || '—'} · Type: ${card.type} · Tags: ${card.tags.join(', ') || '—'}`,
    `- Headline metric: ${card.metric || '—'}`,
    `- Context: ${card.context || '—'}`,
    `- Result: ${card.result || '—'}`,
    `- Evidence location: ${card.location || '—'}`,
    `- Impact ${card.impact}/10 · Confidence ${card.confidence}/10`,
    `- Redaction: ${redactionDone(card)}/${REDACTION_ITEMS.length}${missing.length ? ` — open: ${missing.join('; ')}` : ' — complete'}`,
    card.redactionNotes ? `- Redaction notes: ${card.redactionNotes}` : null,
    `- Approval: ${approval}`
  ].filter(Boolean).join('\n');
}

function vaultMarkdown() {
  const s = vaultStats();
  const lines = [
    '# Proof Vault — evidence pack',
    '',
    `Generated: ${new Date().toLocaleString()}`,
    'Draft for human review. Redact and obtain explicit approval before any external use.',
    'Local-first: nothing in this pack was uploaded, sent, or synced anywhere.',
    '',
    '## Vault summary',
    `- Proof cards: ${s.total}`,
    `- Approved: ${s.approved}`,
    `- Redaction open: ${s.redactionOpen}`,
    `- Average readiness: ${s.avg}/100`,
    '',
    '## Proof cards'
  ];
  if (!state.cards.length) lines.push('', '_The vault is empty._');
  state.cards.forEach((c, i) => lines.push('', cardMarkdown(c, i)));
  const approvedCards = state.cards.filter((c) => c.status === 'approved');
  if (approvedCards.length) {
    lines.push('', '## Suggested case-study angles (approved cards only)');
    approvedCards.forEach((c) => {
      const angle = generateAngle(c, state.angleType, state.angleVariant);
      lines.push('', `- **${c.title || 'Untitled proof'}** — ${angle.headline}`, `  ${angle.hook}`);
    });
  }
  return lines.join('\n');
}

function angleMarkdown(card, angle) {
  return [
    `# Case-study angle — ${card.title || 'Untitled proof'}`,
    '',
    `Draft only — human review and approval required before external use.`,
    '',
    `## Headline`, angle.headline,
    '', `## Hook`, angle.hook,
    '', `## Outline`, ...angle.outline.map((b) => `- ${b}`)
  ].join('\n');
}

function vaultCsv() {
  const header = ['title', 'status', 'source', 'type', 'tags', 'metric', 'context', 'result', 'location',
    'impact', 'confidence', 'readiness', 'redaction_done', 'redaction_open', 'approver', 'approved_by', 'approved_at', 'updated_at'];
  const rows = state.cards.map((c) => [
    c.title, STATUS_META[c.status].label, c.source, c.type, c.tags.join('|'), c.metric, c.context, c.result,
    c.location, c.impact, c.confidence, readiness(c), redactionDone(c),
    redactionMissing(c).join('|'), c.approver, c.approvedBy, c.approvedAt, c.updatedAt
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n');
}

/* ============================== Demo data ============================== */

function demoCards() {
  const day = 86400000;
  const iso = (ago) => new Date(Date.now() - ago * day).toISOString();
  const mk = (over) => normalizeCard({ ...blankCard(), ...over });
  return [
    mk({
      title: 'Missed-call leak estimate — Ridgeline Plumbing',
      source: 'Lead Leak Radar', type: 'Result metric', tags: ['lead-recovery', 'local-services', 'pilot'],
      context: 'Two-truck plumbing shop was missing after-hours calls and never following up on web form leads older than a day.',
      result: 'Radar review put recoverable value at roughly $8.4k/month from missed calls and slow form response, pending verification against real call logs.',
      metric: '~$8.4k/mo recoverable', location: 'recordings/day-02-lead-leak-radar/frame-02.png',
      impact: 8, confidence: 6, status: 'redaction',
      redaction: { names: true, secrets: true, financials: false, visuals: false, thirdparty: true },
      redactionNotes: 'Dollar figure still owner-confidential; screenshot shows the shop name in the header.',
      createdAt: iso(9), updatedAt: iso(2)
    }),
    mk({
      title: 'Three stale quotes revived in one afternoon',
      source: 'Quote Chase Board', type: 'Report snippet', tags: ['follow-up', 'revenue', 'quotes'],
      context: 'Eleven open quotes had sat untouched for 2–6 weeks; the owner assumed they were dead and never chased them.',
      result: 'A single prioritized chase list produced replies on three quotes the same day, one of which was accepted at full price within the week.',
      metric: '3 of 11 stale quotes revived', location: 'quote-chase-board-export-w24.md',
      impact: 7, confidence: 8, status: 'pending', approver: 'Owner (M. Torres)',
      redaction: { names: true, secrets: true, financials: true, visuals: true, thirdparty: true },
      redactionNotes: 'Customer names replaced with roles; quote amounts rounded.',
      createdAt: iso(6), updatedAt: iso(1)
    }),
    mk({
      title: 'Approval-gated outreach record',
      source: 'Approval Gate Desk', type: 'Approval record', tags: ['process', 'trust', 'guardrails'],
      context: 'Client worried that automated drafting would send messages without oversight, after a bad experience with a previous vendor.',
      result: 'Decision ledger shows every customer-facing draft was held for review; the reviewer rewrote one risky claim before anything went out.',
      metric: '100% of sends human-approved', location: 'decision-ledger-export-may.json',
      impact: 7, confidence: 9, status: 'approved',
      approver: 'Client ops lead', approvedBy: 'Client ops lead', approvedAt: iso(3),
      redaction: { names: true, secrets: true, financials: true, visuals: true, thirdparty: true },
      redactionNotes: 'Ledger export stripped of recipient addresses before capture.',
      createdAt: iso(12), updatedAt: iso(3)
    }),
    mk({
      title: 'Before/after: objection-handling script',
      source: 'Script Rehearsal Room', type: 'Before / after note', tags: ['sales-call', 'coaching'],
      context: 'The opening pitch over-promised turnaround times and stalled whenever price came up.',
      result: 'After two rehearsal passes the script dropped the risky promise, added a two-week proof window ask, and the next real call ended with a scheduled follow-up.',
      metric: '', location: 'rehearsal run sheet export',
      impact: 6, confidence: 7, status: 'captured',
      redaction: { names: false, secrets: true, financials: false, visuals: false, thirdparty: false },
      createdAt: iso(4), updatedAt: iso(4)
    }),
    mk({
      title: 'Weekly owner digest screenshot',
      source: 'Owner Report Studio', type: 'Screenshot', tags: ['reporting', 'retention'],
      context: 'Owner had no regular visibility into what the engagement actually produced week to week.',
      result: 'One-page Friday digest now summarizes wins, open risks, and the single decision needed — owner reads it in under two minutes.',
      metric: '5-min weekly reporting habit', location: 'owner-digest-w25.png',
      impact: 5, confidence: 6, status: 'captured',
      redaction: { names: false, secrets: false, financials: false, visuals: false, thirdparty: false },
      createdAt: iso(1), updatedAt: iso(0.2)
    })
  ];
}

/* ============================== Rendering ============================== */

function applyTheme() {
  const theme = state.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.dataset.theme = theme;
  $('themeToggle').textContent = theme === 'light' ? '☾ Dark' : '☀ Light';
  $('themeToggle').setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
}

function renderStats() {
  const s = vaultStats();
  $('statTotal').textContent = s.total;
  $('statApproved').textContent = s.approved;
  $('statRedaction').textContent = s.redactionOpen;
  $('statReadiness').textContent = s.avg;
  $('statSummary').textContent =
    `${s.total} proof cards, ${s.approved} approved, ${s.redactionOpen} with redaction open, average readiness ${s.avg} out of 100.`;
}

function visibleCards() {
  const tokens = state.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let cards = state.cards.filter((c) => {
    if (state.statusFilter !== 'all' && c.status !== state.statusFilter) return false;
    if (state.tagFilter && !c.tags.includes(state.tagFilter)) return false;
    if (tokens.length) {
      const hay = [c.title, c.source, c.type, c.metric, c.context, c.result, c.location, c.tags.join(' ')].join(' ').toLowerCase();
      if (!tokens.every((t) => hay.includes(t))) return false;
    }
    return true;
  });
  const sorters = {
    updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    readiness: (a, b) => readiness(b) - readiness(a),
    impact: (a, b) => b.impact - a.impact || readiness(b) - readiness(a),
    title: (a, b) => a.title.localeCompare(b.title)
  };
  return cards.sort(sorters[state.sort] || sorters.updated);
}

function renderTagChips() {
  const counts = new Map();
  state.cards.forEach((c) => c.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
  const tags = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  if (!tags.length) { $('tagChips').innerHTML = ''; return; }
  const chip = (value, label, active) =>
    `<button type="button" class="chip ${active ? 'active' : ''}" data-tag="${esc(value)}" aria-pressed="${active}">${esc(label)}</button>`;
  $('tagChips').innerHTML =
    chip('', 'All tags', !state.tagFilter) +
    tags.map(([t, n]) => chip(t, `${t} (${n})`, state.tagFilter === t)).join('');
}

function galleryCardHtml(card) {
  const meta = STATUS_META[card.status];
  const summary = card.metric || firstSentence(card.result) || firstSentence(card.context) || 'No result captured yet.';
  return `<article class="proof-card" data-id="${esc(card.id)}" tabindex="0" role="button"
    aria-label="Open proof card: ${esc(card.title || 'Untitled proof')}">
    <button type="button" class="card-delete" data-del="${esc(card.id)}" aria-label="Delete ${esc(card.title || 'this card')}">&#10005;</button>
    <h3>${esc(card.title || 'Untitled proof')}</h3>
    <span class="card-meta">${esc(card.source || 'No source')} · ${esc(card.type)}</span>
    <p class="card-result">${esc(truncate(summary, 120))}</p>
    ${card.tags.length ? `<div class="card-tags">${card.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
    <div class="card-foot">
      <span class="badge ${meta.badge}">${esc(meta.label)}</span>
      <span>${readiness(card)}/100 · ${esc(fmtDate(card.updatedAt))}</span>
    </div>
  </article>`;
}

function renderGallery() {
  renderTagChips();
  const cards = visibleCards();
  const grid = $('cardGrid');
  if (!state.cards.length) {
    $('resultCount').textContent = '';
    grid.innerHTML = `<div class="empty-state">
      <strong>Your vault is empty</strong>
      <p>Capture your first win as a proof card, or explore with realistic demo data.</p>
      <div class="btn-row"><button type="button" class="btn-primary" data-action="empty-new">+ New proof card</button>
      <button type="button" class="btn" data-action="empty-demo">Load demo</button></div>
    </div>`;
    return;
  }
  if (!cards.length) {
    $('resultCount').textContent = 'No cards match the current filters.';
    grid.innerHTML = `<div class="empty-state">
      <strong>No matches</strong>
      <p>No proof cards match this search or filter combination.</p>
      <div class="btn-row"><button type="button" class="btn" data-action="clear-filters">Clear filters</button></div>
    </div>`;
    return;
  }
  $('resultCount').textContent = `${cards.length} of ${state.cards.length} card${state.cards.length === 1 ? '' : 's'} shown`;
  grid.innerHTML = cards.map(galleryCardHtml).join('');
}

/* ---------- Detail view ---------- */

function bindDetailForm(card) {
  for (const [id, key] of FIELD_MAP) $(id).value = card[key] || '';
  $('fType').value = card.type;
  $('fTags').value = card.tags.join(', ');
  $('fImpact').value = card.impact;
  $('fConfidence').value = card.confidence;
  $('impactOut').textContent = card.impact;
  $('confidenceOut').textContent = card.confidence;
  $('redactionList').innerHTML = REDACTION_ITEMS.map((item) =>
    `<li><label><input type="checkbox" data-red="${item.key}" ${card.redaction[item.key] ? 'checked' : ''}>
     <span>${esc(item.label)}</span></label></li>`).join('');
}

function renderDerived() {
  const card = activeCard();
  if (!card) return;
  // Readiness
  const score = readiness(card);
  $('readinessVal').textContent = score;
  $('readinessBand').textContent = readinessBand(score);
  $('readinessBar').style.width = score + '%';
  $('readinessNote').textContent = score >= 85
    ? 'Lead with this card in proposals and case studies.'
    : 'Fill the gaps below to raise this score toward reusable proof.';
  // Title validation
  const missingTitle = !card.title.trim();
  $('titleError').hidden = !missingTitle;
  $('fTitle').classList.toggle('invalid', missingTitle);
  // Redaction
  const done = redactionDone(card);
  $('redactionBar').style.width = (done / REDACTION_ITEMS.length) * 100 + '%';
  $('redactionLabel').textContent = done === REDACTION_ITEMS.length
    ? 'Redaction complete — this card can enter approval.'
    : `${done}/${REDACTION_ITEMS.length} checks complete.`;
  // Workflow stepper
  const idx = STATUS_FLOW.indexOf(card.status);
  $('statusStepper').innerHTML = STATUS_FLOW.map((s, i) => {
    const cls = i < idx ? 'done' : i === idx ? 'current' : '';
    return `<li class="${cls}"><span class="step-dot">${i < idx ? '✓' : i + 1}</span><span>${esc(STATUS_META[s].label)}</span></li>`;
  }).join('');
  const gate = gateMessage(card);
  const next = STATUS_FLOW[idx + 1];
  $('workflowHint').textContent = gate || `Ready to advance to ${STATUS_META[next].label}.`;
  $('workflowHint').classList.toggle('ok', !gate);
  $('advanceBtn').disabled = !next;
  $('advanceBtn').textContent = next ? `Advance → ${STATUS_META[next].label}` : 'Approved ✓';
  $('sendBackBtn').disabled = idx === 0;
  $('approvalInfo').textContent = card.status === 'approved'
    ? `Approved by ${card.approvedBy || 'unrecorded'} on ${fmtDate(card.approvedAt) || 'unrecorded'}.`
    : card.status === 'pending'
      ? `Waiting on sign-off from ${card.approver.trim() || 'an unassigned approver'}.`
      : 'No approval recorded yet.';
  // Angle
  const angle = generateAngle(card, state.angleType, state.angleVariant);
  $('angleHeadline').textContent = angle.headline;
  $('angleHook').textContent = angle.hook;
  $('angleOutline').innerHTML = angle.outline.map((b) => `<li>${esc(b)}</li>`).join('');
  renderStats();
}

function showGallery() {
  state.view = 'gallery';
  state.activeId = null;
  $('detailView').hidden = true;
  $('galleryView').hidden = false;
  renderGallery();
  renderStats();
  scheduleSave();
}

function showDetail(id) {
  const card = state.cards.find((c) => c.id === id);
  if (!card) return;
  state.view = 'detail';
  state.activeId = id;
  $('galleryView').hidden = true;
  $('detailView').hidden = false;
  $('angleType').value = state.angleType;
  bindDetailForm(card);
  renderDerived();
  $('fTitle').focus();
  scheduleSave();
}

/* ---------- Print report ---------- */

function renderPrintReport() {
  const s = vaultStats();
  const rows = state.cards.map((c, i) => `<article>
    <h3>${i + 1}. ${esc(c.title || 'Untitled proof')} <span class="muted">(${esc(STATUS_META[c.status].label)}, ${readiness(c)}/100)</span></h3>
    <table>
      <tr><th>Source / type</th><td>${esc(c.source || '—')} · ${esc(c.type)} · ${esc(c.tags.join(', ') || 'no tags')}</td></tr>
      <tr><th>Metric</th><td>${esc(c.metric || '—')}</td></tr>
      <tr><th>Context</th><td>${esc(c.context || '—')}</td></tr>
      <tr><th>Result</th><td>${esc(c.result || '—')}</td></tr>
      <tr><th>Evidence</th><td>${esc(c.location || '—')}</td></tr>
      <tr><th>Redaction</th><td>${redactionDone(c)}/${REDACTION_ITEMS.length} complete${redactionMissing(c).length ? ' — open: ' + esc(redactionMissing(c).join('; ')) : ''}</td></tr>
      <tr><th>Approval</th><td>${c.status === 'approved' ? esc(`Approved by ${c.approvedBy || 'unrecorded'} on ${fmtDate(c.approvedAt)}`) : esc(STATUS_META[c.status].label)}</td></tr>
    </table>
  </article>`).join('');
  $('printReport').innerHTML = `
    <h1>Proof Vault — evidence pack</h1>
    <p class="muted">Generated ${esc(new Date().toLocaleString())} · Draft for human review — redact and obtain explicit approval before external use.</p>
    <h2>Summary</h2>
    <p>${s.total} proof cards · ${s.approved} approved · ${s.redactionOpen} with redaction open · average readiness ${s.avg}/100</p>
    <h2>Proof cards</h2>
    ${rows || '<p>The vault is empty.</p>'}`;
}

/* ============================== Toast & undo ============================== */

let toastTimer = null;
let undoAction = null;

function toast(msg, opts = {}) {
  const el = $('toast');
  clearTimeout(toastTimer);
  $('toastMsg').textContent = msg;
  undoAction = opts.undo || null;
  $('toastUndo').hidden = !undoAction;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('show'));
  toastTimer = setTimeout(hideToast, undoAction ? 7000 : 2400);
}
function hideToast() {
  const el = $('toast');
  el.classList.remove('show');
  undoAction = null;
  toastTimer = setTimeout(() => { el.hidden = true; }, 220);
}

/* ============================== Actions ============================== */

function createCard() {
  const card = blankCard();
  state.cards.unshift(card);
  saveState();
  showDetail(card.id);
  toast('New proof card created');
}

function deleteCard(id) {
  const index = state.cards.findIndex((c) => c.id === id);
  if (index < 0) return;
  const [removed] = state.cards.splice(index, 1);
  if (state.activeId === id) showGallery(); else { renderGallery(); renderStats(); }
  saveState();
  toast(`Deleted "${truncate(removed.title || 'Untitled proof', 40)}"`, {
    undo: () => {
      state.cards.splice(Math.min(index, state.cards.length), 0, removed);
      saveState();
      if (state.view === 'gallery') { renderGallery(); renderStats(); }
      toast('Card restored');
    }
  });
}

function duplicateCard(id) {
  const src = state.cards.find((c) => c.id === id);
  if (!src) return;
  const copy = normalizeCard({
    ...src, id: uid(), title: (src.title ? src.title + ' (copy)' : ''),
    status: 'captured', approvedBy: '', approvedAt: '',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  });
  state.cards.unshift(copy);
  saveState();
  showDetail(copy.id);
  toast('Card duplicated — workflow reset to Captured');
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function copyText(text, okMsg) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => toast(okMsg)).catch(() => fallbackCopy(text, okMsg));
  } else fallbackCopy(text, okMsg);
}
function fallbackCopy(text, okMsg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); toast(okMsg); }
  catch { toast('Copy failed — use Download instead'); }
  ta.remove();
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const next = normalize(parsed);
      if (!next.cards.length && !Array.isArray(parsed.cards)) throw new Error('no cards');
      next.theme = state.theme;
      next.seenGuide = state.seenGuide;
      state = next;
      saveState();
      showGallery();
      toast(`Imported ${state.cards.length} proof card${state.cards.length === 1 ? '' : 's'}`);
    } catch {
      toast('Import failed — not a valid Proof Vault JSON file');
    }
  };
  reader.onerror = () => toast('Import failed — could not read file');
  reader.readAsText(file);
}

/* ============================== Help modal ============================== */

let helpReturnFocus = null;
function openHelp() {
  helpReturnFocus = document.activeElement;
  $('helpModal').showModal();
}
function closeHelp() {
  $('helpModal').close();
}

/* ============================== Event wiring ============================== */

function wireEvents() {
  // Header
  $('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.dataset.theme;
    state.theme = current === 'light' ? 'dark' : 'light';
    applyTheme();
    saveState();
  });
  $('helpBtn').addEventListener('click', openHelp);
  $('helpClose').addEventListener('click', closeHelp);
  $('helpModal').addEventListener('close', () => { helpReturnFocus?.focus?.(); });

  // Gallery toolbar
  $('newCardBtn').addEventListener('click', createCard);
  $('demoBtn').addEventListener('click', () => {
    if (state.cards.length && !window.confirm('Loading the demo replaces the cards currently in the vault. Continue?')) return;
    state.cards = demoCards();
    state.query = ''; state.tagFilter = ''; state.statusFilter = 'all';
    $('searchInput').value = ''; $('statusFilter').value = 'all';
    saveState();
    showGallery();
    toast('Demo vault loaded — 5 sample proof cards');
  });
  $('resetBtn').addEventListener('click', () => {
    if (!window.confirm('Reset Proof Vault? This clears every proof card stored in this browser.')) return;
    state.cards = [];
    state.query = ''; state.tagFilter = ''; state.statusFilter = 'all';
    $('searchInput').value = ''; $('statusFilter').value = 'all';
    saveState();
    showGallery();
    toast('Vault cleared');
  });
  $('searchInput').addEventListener('input', () => { state.query = $('searchInput').value; renderGallery(); });
  $('statusFilter').addEventListener('change', () => { state.statusFilter = $('statusFilter').value; renderGallery(); });
  $('sortSelect').addEventListener('change', () => { state.sort = $('sortSelect').value; renderGallery(); scheduleSave(); });
  $('tagChips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-tag]');
    if (!chip) return;
    state.tagFilter = chip.dataset.tag === state.tagFilter ? '' : chip.dataset.tag;
    renderGallery();
  });

  // Gallery grid (delegated)
  $('cardGrid').addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) { deleteCard(del.dataset.del); return; }
    const action = e.target.closest('[data-action]');
    if (action) {
      if (action.dataset.action === 'empty-new') createCard();
      if (action.dataset.action === 'empty-demo') $('demoBtn').click();
      if (action.dataset.action === 'clear-filters') {
        state.query = ''; state.tagFilter = ''; state.statusFilter = 'all';
        $('searchInput').value = ''; $('statusFilter').value = 'all';
        renderGallery();
      }
      return;
    }
    const card = e.target.closest('.proof-card[data-id]');
    if (card) showDetail(card.dataset.id);
  });
  $('cardGrid').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.proof-card[data-id]');
    if (card) { e.preventDefault(); showDetail(card.dataset.id); }
  });

  // Detail bar
  $('backBtn').addEventListener('click', showGallery);
  $('deleteBtn').addEventListener('click', () => { if (state.activeId) deleteCard(state.activeId); });
  $('duplicateBtn').addEventListener('click', () => { if (state.activeId) duplicateCard(state.activeId); });

  // Detail form fields
  for (const [id, key] of FIELD_MAP) {
    $(id).addEventListener('input', () => {
      const card = activeCard();
      if (!card) return;
      card[key] = $(id).value;
      touch(card);
      renderDerived();
      scheduleSave();
    });
  }
  $('fType').addEventListener('change', () => {
    const card = activeCard();
    if (!card) return;
    card.type = $('fType').value;
    touch(card); renderDerived(); scheduleSave();
  });
  $('fTags').addEventListener('input', () => {
    const card = activeCard();
    if (!card) return;
    card.tags = parseTags($('fTags').value);
    touch(card); renderDerived(); scheduleSave();
  });
  for (const [id, key, out] of [['fImpact', 'impact', 'impactOut'], ['fConfidence', 'confidence', 'confidenceOut']]) {
    $(id).addEventListener('input', () => {
      const card = activeCard();
      if (!card) return;
      card[key] = clamp($(id).value, 1, 10);
      $(out).textContent = card[key];
      touch(card); renderDerived(); scheduleSave();
    });
  }

  // Redaction checklist (delegated)
  $('redactionList').addEventListener('change', (e) => {
    const box = e.target.closest('[data-red]');
    const card = activeCard();
    if (!box || !card) return;
    card.redaction[box.dataset.red] = box.checked;
    touch(card); renderDerived(); scheduleSave();
  });

  // Workflow
  $('advanceBtn').addEventListener('click', () => {
    const card = activeCard();
    if (!card) return;
    const gate = gateMessage(card);
    if (gate) { toast(gate); renderDerived(); return; }
    advanceStatus(card);
    saveState();
    renderDerived();
    toast(card.status === 'approved'
      ? `Approval recorded — signed off by ${card.approvedBy}`
      : `Moved to ${STATUS_META[card.status].label}`);
  });
  $('sendBackBtn').addEventListener('click', () => {
    const card = activeCard();
    if (!card || !sendBackStatus(card)) return;
    saveState();
    renderDerived();
    toast(`Sent back to ${STATUS_META[card.status].label}`);
  });

  // Angle generator
  $('angleType').addEventListener('change', () => {
    state.angleType = $('angleType').value;
    renderDerived();
    scheduleSave();
  });
  $('shuffleAngleBtn').addEventListener('click', () => {
    state.angleVariant += 1;
    renderDerived();
    scheduleSave();
  });
  $('copyAngleBtn').addEventListener('click', () => {
    const card = activeCard();
    if (!card) return;
    copyText(angleMarkdown(card, generateAngle(card, state.angleType, state.angleVariant)), 'Angle copied as Markdown');
  });

  // Export & handoff
  $('copyMdBtn').addEventListener('click', () => copyText(vaultMarkdown(), 'Evidence pack copied as Markdown'));
  $('downloadJsonBtn').addEventListener('click', () => {
    download('proof-vault.json', JSON.stringify({
      app: 'proof-vault', version: 1, generatedAt: new Date().toISOString(),
      safety: 'Draft evidence pack. Redact and obtain explicit approval before external use.',
      cards: state.cards, sort: state.sort, angleType: state.angleType
    }, null, 2), 'application/json');
    toast('JSON downloaded');
  });
  $('downloadCsvBtn').addEventListener('click', () => { download('proof-vault.csv', vaultCsv(), 'text/csv'); toast('CSV downloaded'); });
  $('printBtn').addEventListener('click', () => { renderPrintReport(); window.print(); });
  window.addEventListener('beforeprint', renderPrintReport);
  $('importFile').addEventListener('change', () => {
    const file = $('importFile').files?.[0];
    if (file) importJson(file);
    $('importFile').value = '';
  });

  // Toast undo
  $('toastUndo').addEventListener('click', () => {
    const fn = undoAction;
    hideToast();
    fn?.();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      copyText(vaultMarkdown(), 'Evidence pack copied as Markdown');
      return;
    }
    const typing = /^(input|textarea|select)$/i.test(document.activeElement?.tagName || '');
    if (typing || $('helpModal').open) {
      if (e.key === 'Escape' && $('helpModal').open) return; // dialog handles it
      if (e.key === 'Escape' && typing) document.activeElement.blur();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '?') { e.preventDefault(); openHelp(); }
    else if (e.key === '/' && state.view === 'gallery') { e.preventDefault(); $('searchInput').focus(); }
    else if (e.key.toLowerCase() === 'n') { e.preventDefault(); createCard(); }
    else if (e.key === 'Escape' && state.view === 'detail') showGallery();
  });
}

/* ============================== Init ============================== */

function init() {
  applyTheme();
  $('statusFilter').value = state.statusFilter;
  $('sortSelect').value = state.sort;
  $('angleType').value = state.angleType;
  wireEvents();
  showGallery();
  if (!state.seenGuide) {
    state.seenGuide = true;
    saveState();
    openHelp();
  }
}

init();
})();
