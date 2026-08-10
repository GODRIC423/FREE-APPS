/* Content Repurposer — remake
   Turn one long-form piece into a publishing packet: title options, description,
   chapters, short posts, newsletter blurb, claim-check lint, and a draft-only export. */
(() => {
'use strict';

/* ============================== constants ============================== */

const LS_KEY = 'fable-remake:content-repurposer:v1';

const SOURCE_TYPES = ['Video', 'Podcast episode', 'Article / blog post', 'Build log', 'Talk / webinar'];
const AUDIENCES = ['Owner-operators', 'Builder audience', 'Industry peers', 'Customers / clients', 'Internal team'];
const TONES = ['Plain-spoken', 'Proof-first', 'Teaching', 'Founder build log', 'Short and direct'];

const TYPE_WORD = {
  'Video': 'video', 'Podcast episode': 'episode', 'Article / blog post': 'article',
  'Build log': 'build log', 'Talk / webinar': 'talk',
};

/* Platform draft fields: real limits, editable cards. */
const DRAFT_FIELDS = [
  { key: 'ytTitle0', el: 'd-ytTitle0', counter: 'c-ytTitle0', label: 'YouTube title 1', limit: 100 },
  { key: 'ytTitle1', el: 'd-ytTitle1', counter: 'c-ytTitle1', label: 'YouTube title 2', limit: 100 },
  { key: 'ytTitle2', el: 'd-ytTitle2', counter: 'c-ytTitle2', label: 'YouTube title 3', limit: 100 },
  { key: 'ytDesc',    el: 'd-ytDesc',    counter: 'c-ytDesc',    label: 'YouTube description', limit: 5000 },
  { key: 'xPost',     el: 'd-xPost',     counter: 'c-xPost',     label: 'Short post', limit: 280 },
  { key: 'liPost',    el: 'd-liPost',    counter: 'c-liPost',    label: 'LinkedIn post', limit: 3000 },
  { key: 'nlSubject', el: 'd-nlSubject', counter: 'c-nlSubject', label: 'Newsletter subject', limit: 150 },
  { key: 'nlBody',    el: 'd-nlBody',    counter: 'c-nlBody',    label: 'Newsletter blurb', limit: 2000 },
];

/* Card groupings for chips + over-limit outline. */
const CARDS = [
  { card: 'card-ytTitle',   chips: 'chips-ytTitle',   fields: ['ytTitle0', 'ytTitle1', 'ytTitle2'] },
  { card: 'card-ytDesc',    chips: 'chips-ytDesc',    fields: ['ytDesc'] },
  { card: 'card-xPost',     chips: 'chips-xPost',     fields: ['xPost'] },
  { card: 'card-liPost',    chips: 'chips-liPost',    fields: ['liPost'] },
  { card: 'card-nlSubject', chips: 'chips-nlSubject', fields: ['nlSubject'] },
  { card: 'card-nlBody',    chips: 'chips-nlBody',    fields: ['nlBody'] },
];

/* Claim-check lint rules. Symbol-anchored tokens (#1, 100%) avoid \b pitfalls. */
const LINT_RULES = [
  {
    cat: 'Superlative', sev: 'warn',
    re: /\b(best ever|greatest|ultimate|revolutionary|game.?chang(?:er|ing)|world.?class|unbeatable|flawless|unmatched|number one)\b|#1\b/gi,
    advice: 'Superlative — soften it or attach the proof that earns it.',
  },
  {
    cat: 'Absolute', sev: 'warn',
    re: /\b(always|never|guaranteed?|everyone|no one|nobody|zero risk|instantly|overnight|effortless(?:ly)?|foolproof)\b|\b100%/gi,
    advice: 'Absolutes rarely survive contact with reality — qualify the claim.',
  },
  {
    cat: 'Bait', sev: 'note',
    re: /\b(you won'?t believe|secret|hack|shocking|insane|mind.?blowing|unbelievable|go(?:es|ne)? viral)\b/gi,
    advice: 'Bait wording erodes trust — describe the actual value instead.',
  },
  {
    cat: 'Unsourced evidence', sev: 'block',
    re: /\b(scientifically|clinically|studies show|research (?:shows|proves)|proven)\b/gi,
    advice: 'Cite the study/source in proof notes or remove the claim.',
  },
];

/* Stats that must be backed by a proof note: 40%, 10x, $1,200, doubled… */
const STAT_RE = /\$\d[\d,]*(?:\.\d+)?|\b\d+(?:\.\d+)?\s*(?:%|percent\b|x\b)|\b(?:doubled|tripled|halved)\b/gi;

const APPROVAL_CHECKLIST = [
  'Every stat in the drafts matches a proof note',
  'Caveats appear wherever the claim appears',
  'Titles promise only what the content delivers',
  'Screenshots, links, and logs checked for secrets before sharing',
  'Human approval given per platform before posting',
];

/* ============================== tiny helpers ============================== */

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));
const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim();
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const uid = () => 'c' + Math.random().toString(36).slice(2, 9);
const wordCount = (text) => (String(text || '').match(/\S+/g) || []).length;
const pick = (list, v, fallback) => (list.includes(v) ? v : fallback);

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ============================== state ============================== */

function defaultState() {
  return {
    v: 1,
    theme: null, // null = follow system until user chooses
    seenGuide: false,
    approval: true,
    source: {
      title: '', type: SOURCE_TYPES[0], audience: AUDIENCES[0], tone: TONES[0],
      duration: 10, content: '', takeaway: '', proof: '', caveats: '',
    },
    drafts: {
      ytTitle0: '', ytTitle1: '', ytTitle2: '', ytPrimary: 0,
      ytDesc: '', xPost: '', liPost: '', nlSubject: '', nlBody: '',
    },
    chapters: [],
  };
}

function normalize(raw) {
  const d = defaultState();
  if (!raw || typeof raw !== 'object') return d;
  const src = raw.source && typeof raw.source === 'object' ? raw.source : {};
  const dr = raw.drafts && typeof raw.drafts === 'object' ? raw.drafts : {};
  const out = {
    v: 1,
    theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : null,
    seenGuide: Boolean(raw.seenGuide),
    approval: raw.approval !== false,
    source: {
      title: String(src.title || '').slice(0, 120),
      type: pick(SOURCE_TYPES, src.type, d.source.type),
      audience: pick(AUDIENCES, src.audience, d.source.audience),
      tone: pick(TONES, src.tone, d.source.tone),
      duration: clamp(Math.round(Number(src.duration) || 10), 1, 600),
      content: String(src.content || ''),
      takeaway: String(src.takeaway || '').slice(0, 160),
      proof: String(src.proof || ''),
      caveats: String(src.caveats || ''),
    },
    drafts: { ytPrimary: [0, 1, 2].includes(dr.ytPrimary) ? dr.ytPrimary : 0 },
    chapters: [],
  };
  for (const f of DRAFT_FIELDS) out.drafts[f.key] = String(dr[f.key] || '');
  if (Array.isArray(raw.chapters)) {
    out.chapters = raw.chapters.slice(0, 40)
      .filter((c) => c && typeof c === 'object')
      .map((c) => ({ id: uid(), ts: String(c.ts || '00:00').slice(0, 9), label: String(c.label || '').slice(0, 120) }));
  }
  return out;
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch { /* corrupt storage never crashes the app */ }
  return defaultState();
}

let state = loadState();
const saveState = debounce(() => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
}, 350);
const snapshot = () => JSON.parse(JSON.stringify(state));

/* ============================== domain: text ============================== */

function sentences(text) {
  return clean(text).split(/(?<=[.!?])\s+/).map(clean).filter(Boolean);
}

const STOPWORDS = new Set(('the and for with that this from into over under your then than they them were was are is has had have will would could should about after before during between just really very more most some what when where which while our their his her its not you all can out one two three how why did does been being').split(' '));

function keywords(text, n = 6) {
  const counts = new Map();
  clean(text).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w))
    .forEach((w) => counts.set(w, (counts.get(w) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w);
}

function titleCase(s) {
  return clean(s).replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1));
}

/* Truncate at a word boundary, never mid-word, with an ellipsis when cut. */
function truncWords(text, max) {
  const t = clean(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const at = cut.lastIndexOf(' ');
  return (at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[,;:.\s]+$/, '') + '…';
}

/* ============================== domain: generation ============================== */

function generateDrafts() {
  const src = state.source;
  const text = clean(src.content);
  const sents = sentences(text);
  const keys = keywords(text);
  const title = clean(src.title) || 'Untitled piece';
  const take = clean(src.takeaway) || sents[0] || title;
  const proofSents = sentences(src.proof);
  const caveat = clean(src.caveats);
  const typeWord = TYPE_WORD[src.type] || 'piece';

  const t3base = keys.length >= 2
    ? `${titleCase(keys.slice(0, 3).join(' '))}: notes from a real ${typeWord}`
    : `${title}: notes from a real ${typeWord}`;

  const description = [
    truncWords(take, 155),
    '',
    sents.slice(0, 3).join(' '),
    '',
    `Receipts: ${proofSents.slice(0, 2).join(' ') || '[add proof notes before publishing]'}`,
    '',
    `Honest caveats: ${caveat || '[add caveats before publishing]'}`,
  ].join('\n');

  const xParts = [truncWords(take, 200)];
  if (proofSents[0] && (xParts[0].length + proofSents[0].length) < 270) xParts.push(proofSents[0]);
  const xPost = truncWords(xParts.join(' '), 279);

  const liPost = [
    truncWords(take, 200),
    '',
    'Three things that held up:',
    ...sents.slice(0, 3).map((s, i) => `${i + 1}. ${truncWords(s, 180)}`),
    '',
    caveat ? `Honest caveat: ${caveat}` : 'Honest caveat: [add one — it builds trust]',
    '',
    `The full ${typeWord} has the messy details.`,
  ].join('\n');

  const nlBody = [
    `This week: ${truncWords(take, 140)}`,
    '',
    sents.slice(0, 2).join(' '),
    '',
    `The receipt: ${proofSents[0] || '[add proof notes before sending]'}`,
    '',
    `Reply if you want the details — the full ${typeWord} has all of them.`,
  ].join('\n');

  Object.assign(state.drafts, {
    ytTitle0: truncWords(take, 96),
    ytTitle1: truncWords(`${title} — what worked and what didn't`, 96),
    ytTitle2: truncWords(t3base, 96),
    ytDesc: description,
    xPost,
    liPost,
    nlSubject: truncWords(take, 64),
    nlBody,
  });
}

/* ============================== domain: chapters ============================== */

function parseTs(str) {
  const m = String(str || '').trim().match(/^(?:(\d{1,2}):)?(\d{1,3}):([0-5]\d)$/);
  if (!m) return null;
  const h = m[1] ? Number(m[1]) : 0;
  return h * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

function fmtTs(sec) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(mm).padStart(2, '0')}:${ss}` : `${String(mm).padStart(2, '0')}:${ss}`;
}

/* Split the source into sections and spread timestamps across the runtime
   proportionally to each section's word count. First chapter is always 00:00. */
function suggestChapters() {
  const text = String(state.source.content || '');
  const durSec = clamp(state.source.duration || 10, 1, 600) * 60;
  let parts = text.split(/\n\s*\n+/).map(clean).filter((p) => p.length >= 30);
  if (parts.length < 3) {
    const sents = sentences(text);
    parts = [];
    for (let i = 0; i < sents.length; i += 3) parts.push(sents.slice(i, i + 3).join(' '));
    parts = parts.filter((p) => p.length >= 30);
  }
  parts = parts.slice(0, 8);
  if (!parts.length) return null;
  const total = parts.reduce((n, p) => n + wordCount(p), 0) || 1;
  let acc = 0;
  return parts.map((p, i) => {
    const start = i === 0 ? 0 : Math.round((acc / total) * durSec / 5) * 5;
    acc += wordCount(p);
    let label = clean(p.replace(/[#*_`>]/g, '')).split(/\s+/).slice(0, 7).join(' ').replace(/[.,;:!?]+$/, '');
    label = label.charAt(0).toUpperCase() + label.slice(1);
    return { id: uid(), ts: fmtTs(start), label };
  });
}

function chapterIssues() {
  const issues = [];
  const chs = state.chapters;
  if (!chs.length) return issues;
  const secs = chs.map((c) => parseTs(c.ts));
  secs.forEach((s, i) => {
    if (s === null) issues.push({ sev: 'block', msg: `Chapter ${i + 1}: timestamp "${chs[i].ts}" isn't mm:ss or h:mm:ss.` });
  });
  if (secs[0] !== null && secs[0] !== 0) issues.push({ sev: 'block', msg: 'YouTube requires the first chapter to start at 00:00.' });
  for (let i = 1; i < secs.length; i++) {
    if (secs[i] !== null && secs[i - 1] !== null && secs[i] <= secs[i - 1]) {
      issues.push({ sev: 'block', msg: `Chapter ${i + 1} must start after chapter ${i} (timestamps ascending).` });
    }
  }
  if (chs.length < 3) issues.push({ sev: 'warn', msg: 'YouTube needs at least 3 chapters before markers appear.' });
  const durSec = (state.source.duration || 10) * 60;
  secs.forEach((s, i) => {
    if (s !== null && s >= durSec) issues.push({ sev: 'warn', msg: `Chapter ${i + 1} starts at ${chs[i].ts}, past the stated ${state.source.duration}-minute runtime.` });
  });
  chs.forEach((c, i) => {
    if (!clean(c.label)) issues.push({ sev: 'warn', msg: `Chapter ${i + 1} has no label.` });
  });
  return issues;
}

function chapterBlock() {
  return state.chapters.map((c) => `${c.ts} ${clean(c.label)}`).join('\n');
}

/* ============================== domain: claim-check lint ============================== */

function lintFieldText(text, where, fieldKey) {
  const flags = [];
  const t = String(text || '');
  if (!clean(t)) return flags;
  for (const rule of LINT_RULES) {
    const seen = new Set();
    for (const m of t.matchAll(rule.re)) {
      const term = m[0].toLowerCase();
      if (seen.has(term)) continue;
      seen.add(term);
      flags.push({ sev: rule.sev, cat: rule.cat, where, fieldKey, term: m[0], advice: rule.advice });
    }
  }
  // Stats must have a matching proof note (compare digit runs).
  const proofDigits = String(state.source.proof || '').match(/\d[\d,.]*/g) || [];
  const proofWords = String(state.source.proof || '').toLowerCase();
  const seenStats = new Set();
  for (const m of t.matchAll(STAT_RE)) {
    const term = m[0];
    if (seenStats.has(term.toLowerCase())) continue;
    seenStats.add(term.toLowerCase());
    const digits = term.replace(/[^0-9.]/g, '');
    const backed = digits
      ? proofDigits.some((p) => p.replace(/[^0-9.]/g, '') === digits)
      : proofWords.includes(term.toLowerCase());
    if (!backed) {
      flags.push({
        sev: 'block', cat: 'Unproven stat', where, fieldKey, term,
        advice: 'No matching proof note. Add the receipt or drop the number.',
      });
    }
  }
  return flags;
}

function collectLint() {
  const flags = [];
  for (const f of DRAFT_FIELDS) {
    const text = state.drafts[f.key];
    flags.push(...lintFieldText(text, f.label, f.key));
    const len = String(text || '').length;
    if (len > f.limit) {
      flags.push({
        sev: 'block', cat: 'Over limit', where: f.label, fieldKey: f.key,
        term: `${len - f.limit} over`, advice: `${len} characters — the ${f.label} limit is ${f.limit}. Trim it.`,
      });
    }
  }
  flags.push(...lintFieldText(state.source.takeaway, 'Key takeaway', null));

  const anyDraft = DRAFT_FIELDS.some((f) => clean(state.drafts[f.key]));
  if (anyDraft && !clean(state.source.proof)) {
    flags.push({ sev: 'warn', cat: 'Missing proof', where: 'Proof notes', fieldKey: null, term: 'empty', advice: 'The claim check has nothing to verify stats against. Add receipts.' });
  }
  if (anyDraft && !clean(state.source.caveats)) {
    flags.push({ sev: 'note', cat: 'Missing caveats', where: 'Caveats', fieldKey: null, term: 'empty', advice: 'Honest limits build trust — add at least one caveat.' });
  }
  if (!state.approval) {
    flags.push({ sev: 'block', cat: 'Approval gate', where: 'Export & handoff', fieldKey: null, term: 'off', advice: 'The human-approval requirement is switched off. Turn it back on.' });
  }
  const order = { block: 0, warn: 1, note: 2 };
  return flags.sort((a, b) => order[a.sev] - order[b.sev]);
}

/* ============================== domain: packet ============================== */

function packetMarkdown(flags) {
  const s = state.source;
  const d = state.drafts;
  const titles = [d.ytTitle0, d.ytTitle1, d.ytTitle2];
  const lines = [
    `# Publishing packet — ${clean(s.title) || 'Untitled piece'}`,
    '',
    `Generated: ${new Date().toLocaleString()}`,
    `Source: ${s.type} · ~${s.duration} min · ${wordCount(s.content)} words`,
    `Audience: ${s.audience} · Tone: ${s.tone}`,
    '',
    state.approval
      ? '> DRAFTS ONLY — human approval required before anything is posted, uploaded, or sent.'
      : '> WARNING: the human-approval gate is OFF. Turn it on before using this packet.',
    '',
    '## YouTube title options',
    ...titles.map((t, i) => `${i + 1}. ${clean(t) || '(empty)'}${i === d.ytPrimary ? '   ← primary' : ''}`),
    '',
    '## YouTube description',
    d.ytDesc || '(empty)',
    '',
    '## Chapters',
    '```',
    chapterBlock() || '(none yet)',
    '```',
    '',
    '## Short post (X / Mastodon)',
    d.xPost || '(empty)',
    '',
    '## LinkedIn post',
    d.liPost || '(empty)',
    '',
    '## Newsletter',
    `Subject: ${d.nlSubject || '(empty)'}`,
    '',
    d.nlBody || '(empty)',
    '',
    '## Proof notes',
    s.proof || '(none — add receipts before publishing)',
    '',
    '## Caveats & boundaries',
    s.caveats || '(none — add honest limits)',
    '',
    '## Claim-check report',
    ...(flags.length
      ? flags.map((f) => `- [${f.sev.toUpperCase()}] ${f.where} — "${f.term}": ${f.advice}`)
      : ['- No lint flags. Review by a human is still required.']),
    '',
    '## Approval checklist',
    ...APPROVAL_CHECKLIST.map((c) => `- [ ] ${c}`),
  ];
  return lines.join('\n');
}

/* ============================== render ============================== */

function applyTheme() {
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  const theme = state.theme || (prefersLight ? 'light' : 'dark');
  document.documentElement.dataset.theme = theme;
  $('btnTheme').setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
}

function counterClass(len, limit) {
  if (len > limit) return 'counter over';
  if (len >= limit * 0.85) return 'counter warn';
  return 'counter';
}

function renderCounters() {
  for (const f of DRAFT_FIELDS) {
    const len = String(state.drafts[f.key] || '').length;
    const el = $(f.counter);
    el.textContent = `${len}/${f.limit}`;
    el.className = counterClass(len, f.limit);
  }
  for (const c of CARDS) {
    const over = c.fields.some((k) => {
      const def = DRAFT_FIELDS.find((f) => f.key === k);
      return String(state.drafts[k] || '').length > def.limit;
    });
    $(c.card).classList.toggle('over-limit', over);
  }
}

function renderChips(flags) {
  for (const c of CARDS) {
    const mine = flags.filter((f) => f.fieldKey && c.fields.includes(f.fieldKey)).slice(0, 4);
    $(c.chips).innerHTML = mine
      .map((f) => `<span class="chip sev-${esc(f.sev)}" title="${esc(f.advice)}">${esc(f.term)}</span>`)
      .join('');
  }
}

function renderLint(flags) {
  const counts = { block: 0, warn: 0, note: 0 };
  flags.forEach((f) => { counts[f.sev]++; });
  $('lintSummary').innerHTML = [
    `<span class="lint-pill ${counts.block ? 'on-block' : ''}">${counts.block} blocker${counts.block === 1 ? '' : 's'}</span>`,
    `<span class="lint-pill ${counts.warn ? 'on-warn' : ''}">${counts.warn} warning${counts.warn === 1 ? '' : 's'}</span>`,
    `<span class="lint-pill">${counts.note} note${counts.note === 1 ? '' : 's'}</span>`,
  ].join('');

  const body = $('lintBody');
  const anyContent = clean(state.source.content) || DRAFT_FIELDS.some((f) => clean(state.drafts[f.key]));
  if (!anyContent) {
    body.innerHTML = '<div class="empty-state">Nothing to lint yet.<br />Paste source content and generate drafts to run the claim check.</div>';
    return;
  }
  if (!flags.length) {
    body.innerHTML = '<p class="lint-clean"><span aria-hidden="true">&#10003;</span> No flags — claims look backed and inside limits. A human still reviews before posting.</p>';
    return;
  }
  body.innerHTML = `<ul class="lint-list">${flags.map((f) => `
    <li class="lint-item">
      <span class="lint-sev ${esc(f.sev)}">${esc(f.sev)}</span>
      <div><span class="where">${esc(f.where)} · ${esc(f.cat)}</span>
      <mark>${esc(f.term)}</mark> — ${esc(f.advice)}</div>
    </li>`).join('')}</ul>`;
}

function renderChapterList() {
  const list = $('chapterList');
  if (!state.chapters.length) {
    list.innerHTML = '<div class="empty-state">No chapters yet. Auto-suggest cuts them from your source sections, or add rows by hand.</div>';
    return;
  }
  list.innerHTML = state.chapters.map((c, i) => `
    <div class="chapter-row ${parseTs(c.ts) === null ? 'bad-ts' : ''}" data-id="${esc(c.id)}">
      <span class="grip" aria-hidden="true">&#8801;</span>
      <input class="ch-ts" data-k="ts" value="${esc(c.ts)}" maxlength="9" inputmode="numeric" aria-label="Chapter ${i + 1} timestamp (mm:ss)" />
      <input class="ch-label" data-k="label" value="${esc(c.label)}" maxlength="120" aria-label="Chapter ${i + 1} label" />
      <div class="row-actions">
        <button class="btn-icon" type="button" data-act="up" aria-label="Move chapter ${i + 1} up" ${i === 0 ? 'disabled' : ''}>&#8593;</button>
        <button class="btn-icon" type="button" data-act="down" aria-label="Move chapter ${i + 1} down" ${i === state.chapters.length - 1 ? 'disabled' : ''}>&#8595;</button>
        <button class="btn-icon danger" type="button" data-act="del" aria-label="Delete chapter ${i + 1}">&#10005;</button>
      </div>
    </div>`).join('');
}

function renderChapterMeta() {
  const issues = chapterIssues();
  $('chapterPreview').textContent = chapterBlock() || 'Chapters appear here in paste-ready YouTube format.';
  const ul = $('chapterIssues');
  if (!state.chapters.length) {
    ul.innerHTML = '';
  } else if (!issues.length) {
    ul.innerHTML = '<li class="ok">&#10003; Chapter block is valid: starts at 00:00, ascending, 3+ chapters.</li>';
  } else {
    ul.innerHTML = issues.map((i) => `<li class="${esc(i.sev)}">${esc(i.msg)}</li>`).join('');
  }
  return issues;
}

function renderStats(flags, issues) {
  $('statWords').textContent = String(wordCount(state.source.content));
  const ready = DRAFT_FIELDS.filter((f) => {
    const t = String(state.drafts[f.key] || '');
    return clean(t) && t.length <= f.limit;
  }).length;
  $('statReady').textContent = `${ready}/${DRAFT_FIELDS.length}`;
  $('statReadyWrap').className = 'stat' + (ready === DRAFT_FIELDS.length ? ' good' : '');
  $('statChapters').textContent = String(state.chapters.length);
  const chBlock = issues.some((i) => i.sev === 'block');
  $('statChaptersWrap').className = 'stat' + (chBlock ? ' flagged' : (state.chapters.length >= 3 && !issues.length ? ' good' : ''));
  $('statFlags').textContent = String(flags.length);
  const anyBlock = flags.some((f) => f.sev === 'block');
  $('statFlagsWrap').className = 'stat' + (anyBlock ? ' flagged' : (flags.length === 0 ? ' good' : ''));
}

function renderPrintDoc(md) {
  const s = state.source;
  $('printDoc').innerHTML = `
    <h1>Publishing packet — ${esc(clean(s.title) || 'Untitled piece')}</h1>
    <p class="muted">${esc(s.type)} · ~${esc(String(s.duration))} min · generated ${esc(new Date().toLocaleString())} · drafts only, human approval required</p>
    <pre>${esc(md)}</pre>`;
}

function render() {
  const flags = collectLint();
  renderCounters();
  renderChips(flags);
  renderLint(flags);
  const issues = renderChapterMeta();
  renderStats(flags, issues);
  $('srcContentHint').textContent = `${wordCount(state.source.content)} words · ${String(state.source.content || '').length} characters`;
  const md = packetMarkdown(flags);
  $('packetPreview').textContent = md;
  renderPrintDoc(md);
  saveState();
  return md;
}

let renderQueued = false;
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; render(); });
}

/* Push state values into every form control (after load/demo/import/undo). */
function syncForm() {
  const s = state.source;
  $('srcTitle').value = s.title; $('srcType').value = s.type;
  $('srcAudience').value = s.audience; $('srcTone').value = s.tone;
  $('srcDuration').value = s.duration; $('srcContent').value = s.content;
  $('srcTakeaway').value = s.takeaway; $('srcProof').value = s.proof; $('srcCaveats').value = s.caveats;
  for (const f of DRAFT_FIELDS) $(f.el).value = state.drafts[f.key];
  const radio = document.querySelector(`input[name="ytPrimary"][value="${state.drafts.ytPrimary}"]`);
  if (radio) radio.checked = true;
  $('apGate').checked = state.approval;
  $('srcContent').classList.remove('invalid');
  $('srcError').hidden = true;
  applyTheme();
  renderChapterList();
  render();
}

/* ============================== toast & undo ============================== */

let toastTimer = null;
let undoAction = null;

function toast(msg, undoFn) {
  const el = $('toast');
  $('toastMsg').textContent = msg;
  undoAction = undoFn || null;
  $('toastUndo').hidden = !undoFn;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; undoAction = null; }, undoFn ? 7000 : 2400);
}

function restoreSnapshot(snap, msg) {
  state = normalize(snap);
  syncForm();
  toast(msg);
}

/* ============================== export & clipboard ============================== */

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function copyText(text, okMsg) {
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    toast(ok ? okMsg : 'Copy failed — select the preview and copy manually');
  };
  if (navigator.clipboard && window.isSecureContext !== false) {
    navigator.clipboard.writeText(text).then(() => toast(okMsg)).catch(fallback);
  } else {
    fallback();
  }
}

function slugName(ext) {
  const slug = clean(state.source.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'publishing-packet';
  return `${slug}-packet.${ext}`;
}

/* ============================== demo data ============================== */

function demoState() {
  const d = defaultState();
  d.source = {
    title: "Cutting our cafe's no-show rate",
    type: 'Video', audience: 'Owner-operators', tone: 'Proof-first', duration: 12,
    content: [
      'Our two-room cafe was losing about 30 bookings a month to no-shows. This is the full walkthrough of the fix: what we changed, what it cost, and the numbers six weeks in.',
      "First, the baseline. We pulled three months of booking data from the paper log into a spreadsheet. Average 31 no-shows per week across both rooms, worst on Friday evenings. Staff guessed the number was half that, which is exactly why we measured before changing anything.",
      "The fix had three parts. A confirmation text the morning of the booking, a two-tap reschedule link instead of a phone call, and a small card-on-file hold for groups of six or more. The reschedule link mattered most — people rarely want to cancel, they want to move.",
      "Six weeks later, no-shows are down from 31 to 12 per week. Friday evenings improved the most. The card hold caused two complaints; both bookings ended up rescheduling instead of cancelling. Revenue from hold deposits was zero, which is the point — it's a nudge, not a fee.",
      "What I'd tell another owner: measure first, make rescheduling easier than cancelling, and give regulars a week or two to see that the texts are useful. Full spreadsheet template and the exact message scripts are shown on screen.",
    ].join('\n\n'),
    takeaway: 'No-shows fell from 31 to 12 a week once rescheduling got easier than cancelling.',
    proof: 'Booking-log spreadsheet, weeks 1–6: no-shows down from 31 to 12 per week. Friday bookings recovered fastest. Two complaints about the card hold; both parties rescheduled.',
    caveats: 'One location, six-week window, small sample. The card hold may not suit walk-in-heavy venues.',
  };
  d.drafts = {
    ytPrimary: 0,
    ytTitle0: 'No-shows fell from 31 to 12 a week — here is the exact fix',
    ytTitle1: "Cutting our cafe's no-show rate — what worked and what didn't",
    ytTitle2: 'The guaranteed no-show fix every cafe needs',
    ytDesc: [
      'No-shows fell from 31 to 12 a week once rescheduling got easier than cancelling.',
      '',
      'Our two-room cafe was losing about 30 bookings a month to no-shows. This is the full walkthrough of the fix: what we changed, what it cost, and the numbers six weeks in.',
      '',
      'Receipts: Booking-log spreadsheet, weeks 1–6: no-shows down from 31 to 12 per week. Friday bookings recovered fastest.',
      '',
      'Honest caveats: One location, six-week window, small sample. The card hold may not suit walk-in-heavy venues.',
    ].join('\n'),
    xPost: 'We cut cafe no-shows 60% in six weeks. The fix was not a fee — it was making rescheduling easier than cancelling. Full breakdown in the new video.',
    liPost: [
      'No-shows fell from 31 to 12 a week once rescheduling got easier than cancelling.',
      '',
      'Three things that held up:',
      '1. Measure before changing anything — staff guessed half the real number.',
      '2. A two-tap reschedule link beats a phone call; people want to move, not cancel.',
      '3. A card-on-file hold for big groups is a game-changing nudge, not a fee.',
      '',
      'Honest caveat: one location, six weeks, small sample.',
      '',
      'The full video has the spreadsheet template and message scripts.',
    ].join('\n'),
    nlSubject: 'The no-show fix: 31 down to 12 a week',
    nlBody: [
      'This week: no-shows fell from 31 to 12 a week once rescheduling got easier than cancelling.',
      '',
      'We pulled three months of booking data first — staff guessed half the real number. Then three changes: a morning-of confirmation text, a two-tap reschedule link, and a card hold for groups of six plus.',
      '',
      'The receipt: booking-log spreadsheet, weeks 1–6, down from 31 to 12 per week.',
      '',
      'Reply if you want the template — the full video walks through all of it.',
    ].join('\n'),
  };
  d.chapters = [
    { id: uid(), ts: '00:00', label: 'The 31-a-week problem' },
    { id: uid(), ts: '01:10', label: 'Measuring the baseline' },
    { id: uid(), ts: '03:05', label: 'The three-part fix' },
    { id: uid(), ts: '06:30', label: 'Results after six weeks' },
    { id: uid(), ts: '09:20', label: 'Advice for other owners' },
  ];
  d.theme = state.theme;
  d.seenGuide = true;
  return d;
}

/* ============================== events ============================== */

function requireSource() {
  if (clean(state.source.content)) {
    $('srcContent').classList.remove('invalid');
    $('srcError').hidden = true;
    return true;
  }
  $('srcContent').classList.add('invalid');
  $('srcError').hidden = false;
  $('srcContent').focus();
  return false;
}

function wireSourceInputs() {
  const map = [
    ['srcTitle', 'title'], ['srcType', 'type'], ['srcAudience', 'audience'], ['srcTone', 'tone'],
    ['srcContent', 'content'], ['srcTakeaway', 'takeaway'], ['srcProof', 'proof'], ['srcCaveats', 'caveats'],
  ];
  for (const [id, key] of map) {
    $(id).addEventListener('input', (e) => {
      state.source[key] = e.target.value;
      if (key === 'content' && clean(e.target.value)) {
        e.target.classList.remove('invalid');
        $('srcError').hidden = true;
      }
      scheduleRender();
    });
  }
  $('srcDuration').addEventListener('change', (e) => {
    state.source.duration = clamp(Math.round(Number(e.target.value) || 10), 1, 600);
    e.target.value = state.source.duration;
    scheduleRender();
  });
}

function wireDraftInputs() {
  for (const f of DRAFT_FIELDS) {
    $(f.el).addEventListener('input', (e) => {
      state.drafts[f.key] = e.target.value;
      scheduleRender();
    });
  }
  document.querySelectorAll('input[name="ytPrimary"]').forEach((r) => {
    r.addEventListener('change', (e) => {
      state.drafts.ytPrimary = Number(e.target.value) || 0;
      scheduleRender();
    });
  });
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.copy;
      const text = key === 'ytPrimary'
        ? state.drafts['ytTitle' + state.drafts.ytPrimary]
        : state.drafts[key];
      if (!clean(text)) { toast('Nothing to copy yet'); return; }
      copyText(text, 'Draft copied');
    });
  });
}

function wireChapters() {
  const list = $('chapterList');
  list.addEventListener('input', (e) => {
    const row = e.target.closest('.chapter-row');
    const k = e.target.dataset.k;
    if (!row || !k) return;
    const ch = state.chapters.find((c) => c.id === row.dataset.id);
    if (!ch) return;
    ch[k] = e.target.value;
    if (k === 'ts') row.classList.toggle('bad-ts', parseTs(e.target.value) === null);
    scheduleRender();
  });
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const row = btn.closest('.chapter-row');
    const i = state.chapters.findIndex((c) => c.id === row.dataset.id);
    if (i < 0) return;
    if (btn.dataset.act === 'del') {
      const [removed] = state.chapters.splice(i, 1);
      renderChapterList(); scheduleRender();
      toast(`Deleted "${clean(removed.label) || removed.ts}"`, () => {
        state.chapters.splice(Math.min(i, state.chapters.length), 0, removed);
        renderChapterList(); scheduleRender();
      });
    } else if (btn.dataset.act === 'up' && i > 0) {
      [state.chapters[i - 1], state.chapters[i]] = [state.chapters[i], state.chapters[i - 1]];
      renderChapterList(); scheduleRender();
    } else if (btn.dataset.act === 'down' && i < state.chapters.length - 1) {
      [state.chapters[i], state.chapters[i + 1]] = [state.chapters[i + 1], state.chapters[i]];
      renderChapterList(); scheduleRender();
    }
  });
  $('btnAddChapter').addEventListener('click', () => {
    const last = state.chapters[state.chapters.length - 1];
    const lastSec = last ? parseTs(last.ts) : null;
    const ts = state.chapters.length === 0 ? '00:00' : fmtTs((lastSec ?? 0) + 60);
    state.chapters.push({ id: uid(), ts, label: '' });
    renderChapterList(); scheduleRender();
    const rows = list.querySelectorAll('.ch-label');
    rows[rows.length - 1]?.focus();
  });
  const suggest = () => {
    if (!requireSource()) return;
    const chs = suggestChapters();
    if (!chs) { toast('Source too short to cut chapters from'); return; }
    const prev = snapshot();
    state.chapters = chs;
    renderChapterList(); scheduleRender();
    toast(`Suggested ${chs.length} chapters from your source`, () => restoreSnapshot(prev, 'Chapters restored'));
  };
  $('btnSuggestChapters').addEventListener('click', suggest);
  $('btnSuggestChapters2').addEventListener('click', suggest);
}

function wireGenerate() {
  $('btnGenerate').addEventListener('click', () => {
    if (!requireSource()) return;
    const prev = snapshot();
    generateDrafts();
    if (!state.chapters.length) state.chapters = suggestChapters() || [];
    syncForm();
    toast('Drafts generated — edit them until they are true and yours', () => restoreSnapshot(prev, 'Previous drafts restored'));
  });
}

function wireExports() {
  $('apGate').addEventListener('change', (e) => { state.approval = e.target.checked; scheduleRender(); });
  $('btnCopyMd').addEventListener('click', () => copyText(render(), 'Markdown packet copied'));
  $('btnDlMd').addEventListener('click', () => { download(slugName('md'), render(), 'text/markdown'); toast('Markdown downloaded'); });
  $('btnDlJson').addEventListener('click', () => {
    const md = render();
    const payload = { app: 'content-repurposer', exportedAt: new Date().toISOString(), boundary: 'Drafts only — human approval required before publishing.', state: { ...snapshot(), theme: undefined, seenGuide: undefined }, markdown: md };
    download(slugName('json'), JSON.stringify(payload, null, 2), 'application/json');
    toast('JSON downloaded');
  });
  $('btnImport').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const prev = snapshot();
        state = normalize(parsed.state || parsed);
        state.theme = prev.theme; state.seenGuide = true;
        syncForm();
        toast('Packet imported', () => restoreSnapshot(prev, 'Import undone'));
      } catch {
        toast('Import failed — not a valid packet JSON');
      }
    };
    reader.readAsText(file);
  });
  $('btnPrint').addEventListener('click', () => { render(); window.print(); });
  $('btnReset').addEventListener('click', () => {
    if (!window.confirm('Reset everything? This clears the source, drafts, and chapters stored in this browser.')) return;
    const theme = state.theme;
    state = defaultState();
    state.theme = theme; state.seenGuide = true;
    syncForm();
    toast('Reset — starting fresh');
  });
}

function wireHeader() {
  $('btnTheme').addEventListener('click', () => {
    const current = document.documentElement.dataset.theme;
    state.theme = current === 'light' ? 'dark' : 'light';
    applyTheme();
    saveState();
    toast(`${state.theme === 'light' ? 'Light' : 'Dark'} theme on`);
  });
  $('btnDemo').addEventListener('click', () => {
    const prev = snapshot();
    state = demoState();
    syncForm();
    toast('Demo loaded: a cafe no-show fix, receipts included', () => restoreSnapshot(prev, 'Demo undone'));
  });
  const guide = $('guide');
  $('btnGuide').addEventListener('click', () => guide.showModal());
  $('btnCloseGuide').addEventListener('click', () => guide.close());
  guide.addEventListener('close', () => {
    if (!state.seenGuide) { state.seenGuide = true; saveState(); }
  });
  $('toastUndo').addEventListener('click', () => {
    const fn = undoAction;
    undoAction = null;
    $('toast').hidden = true;
    if (fn) fn();
  });
}

function wireKeyboard() {
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      copyText(render(), 'Markdown packet copied');
      return;
    }
    if (e.key === '?' && !typing) {
      e.preventDefault();
      $('guide').showModal();
    }
    if (e.key === 'Escape' && $('guide').open) $('guide').close();
  });
}

/* ============================== init ============================== */

function init() {
  wireSourceInputs();
  wireDraftInputs();
  wireChapters();
  wireGenerate();
  wireExports();
  wireHeader();
  wireKeyboard();
  syncForm();
  if (!state.seenGuide) {
    $('guide').showModal();
    state.seenGuide = true;
    saveState();
  }
}

init();
})();
