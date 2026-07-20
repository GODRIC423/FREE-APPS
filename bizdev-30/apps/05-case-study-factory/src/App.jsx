import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Clapperboard, Film, Plus, Trash2, Copy, Check, Download, Upload, HelpCircle,
  RotateCcw, X, Undo2, Quote, ChevronUp, ChevronDown, Sparkles, FileText,
  FileJson, Printer, Scissors, ShieldCheck, NotebookPen, Share2, Wand2,
  ClipboardPaste, Table2, CircleDot,
} from 'lucide-react';

/* ================================================================
   CASE STUDY FACTORY — turn client wins into box-office proof
   World: film studio. Charcoal soundstage, projector amber,
   clapperboard motifs, Bricolage Grotesque display.
   ================================================================ */

const STORAGE_KEY = 'bizdev:05-case-study-factory:v1';

const BEAT_DEFS = [
  { id: 'hook',   title: 'The Hook',        hint: 'One line that earns the read. Lead with the most surprising number or turnaround.' },
  { id: 'before', title: 'The Before',      hint: 'The status quo. What was broken, what it cost, how it felt inside the client team.' },
  { id: 'stakes', title: 'The Stakes',      hint: 'Why change had to happen now. What would a "do nothing" quarter have cost?' },
  { id: 'turn',   title: 'The Turn',        hint: 'The decision moment. Why they picked you over doing nothing or hiring someone else.' },
  { id: 'work',   title: 'The Work',        hint: 'What you actually did, in plain language. Three moves max — no methodology fog.' },
  { id: 'after',  title: 'The After',       hint: 'Life now. Open with the numbers, close with what the team stopped worrying about.' },
  { id: 'proof',  title: 'The Receipts',    hint: 'Evidence beyond your say-so: a quote, a screenshot you could attach, a third-party signal.' },
  { id: 'cta',    title: 'The Trailer Card', hint: 'What a reader in the same spot should do next. One ask, zero hedging.' },
];

const STATUSES = [
  { id: 'development', label: 'In Development', dot: 'bg-amber',   chip: 'text-amber border-amber/50' },
  { id: 'rough',       label: 'Rough Cut',      dot: 'bg-reel',    chip: 'text-reel border-reel/50' },
  { id: 'review',      label: 'Client Review',  dot: 'bg-ember',   chip: 'text-ember border-ember/50' },
  { id: 'cleared',     label: 'Cleared',        dot: 'bg-cleared', chip: 'text-cleared border-cleared/50' },
  { id: 'released',    label: 'Released',       dot: 'bg-amber-hot', chip: 'text-amber-hot border-amber-hot/60' },
];
const statusById = (id) => STATUSES.find((s) => s.id === id) || STATUSES[0];

const CONSENT_ITEMS = [
  { id: 'quotes',    label: 'Quotes approved verbatim', hint: 'Every quote you publish was signed off word-for-word.' },
  { id: 'metrics',   label: 'Metrics cleared for publication', hint: 'The client agreed these numbers can appear in public.' },
  { id: 'name',      label: 'Company name & logo usage', hint: 'Named attribution and logo use are in writing.' },
  { id: 'placement', label: 'Placements agreed', hint: 'Website, decks, socials — they know where it will run.' },
  { id: 'final',     label: 'Final cut signed off', hint: 'The exact final text was reviewed, not just a summary.' },
];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/* ---------------- normalize: survive any corrupt state ---------------- */
const str = (v, d = '') => (typeof v === 'string' ? v : d);
const bool = (v, d = false) => (typeof v === 'boolean' ? v : d);

function normalizeStudy(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const cap = r.capture && typeof r.capture === 'object' ? r.capture : {};
  const con = r.consent && typeof r.consent === 'object' ? r.consent : {};
  const conItems = con.items && typeof con.items === 'object' ? con.items : {};
  const beatsRaw = Array.isArray(r.beats) ? r.beats : [];
  return {
    id: str(r.id) || uid(),
    client: str(r.client),
    industry: str(r.industry),
    service: str(r.service),
    timeframe: str(r.timeframe),
    status: STATUSES.some((s) => s.id === r.status) ? r.status : 'development',
    capture: { before: str(cap.before), during: str(cap.during), after: str(cap.after) },
    metrics: (Array.isArray(r.metrics) ? r.metrics : []).map((m) => ({
      id: str(m?.id) || uid(), label: str(m?.label), before: str(m?.before), after: str(m?.after), unit: str(m?.unit),
    })),
    quotes: (Array.isArray(r.quotes) ? r.quotes : []).map((q) => ({
      id: str(q?.id) || uid(), text: str(q?.text), name: str(q?.name), role: str(q?.role), approved: bool(q?.approved),
    })),
    beats: BEAT_DEFS.map((def) => {
      const found = beatsRaw.find((b) => b && b.id === def.id) || {};
      return { id: def.id, text: str(found.text), on: bool(found.on, true) };
    }),
    consent: {
      contact: str(con.contact), sentDate: str(con.sentDate), approvedDate: str(con.approvedDate), notes: str(con.notes),
      items: Object.fromEntries(CONSENT_ITEMS.map((c) => [c.id, bool(conItems[c.id])])),
    },
    copilotNotes: str(r.copilotNotes),
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
  };
}

function normalize(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const studies = (Array.isArray(r.studies) ? r.studies : []).map(normalizeStudy);
  return {
    studies,
    selectedId: studies.some((s) => s.id === r.selectedId) ? r.selectedId : (studies[0]?.id ?? null),
    filter: typeof r.filter === 'string' ? r.filter : 'all',
    tab: ['capture', 'assemble', 'cuts', 'release'].includes(r.tab) ? r.tab : 'capture',
    seenGuide: bool(r.seenGuide),
  };
}

/* ---------------- math & story assembly ---------------- */
function parseNum(v) {
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}
function metricDelta(m) {
  const a = parseNum(m.before), b = parseNum(m.after);
  if (a === null || b === null) return null;
  if (a === 0) return { pct: null, abs: b - a, up: b >= a };
  return { pct: ((b - a) / Math.abs(a)) * 100, abs: b - a, up: b >= a };
}
function fmtDelta(d) {
  if (!d) return '';
  if (d.pct === null) return `${d.abs >= 0 ? '+' : ''}${+d.abs.toFixed(1)}`;
  const p = Math.abs(d.pct) >= 100 ? Math.round(d.pct) : +d.pct.toFixed(1);
  return `${d.pct >= 0 ? '+' : ''}${p}%`;
}
function headlineMetric(s) {
  let best = null, bestScore = -1;
  for (const m of s.metrics) {
    const d = metricDelta(m);
    if (!d || !m.label) continue;
    const score = d.pct === null ? Math.abs(d.abs) : Math.abs(d.pct);
    if (score > bestScore) { bestScore = score; best = { m, d }; }
  }
  return best;
}
const beatText = (s, id) => s.beats.find((b) => b.id === id)?.text?.trim() || '';

function logline(s) {
  const hook = beatText(s, 'hook');
  if (hook) return hook;
  const h = headlineMetric(s);
  if (h) {
    const { m } = h;
    return `${s.client || 'Our client'} went from ${m.before}${m.unit} to ${m.after}${m.unit} ${m.label.toLowerCase()}${s.timeframe ? ` in ${s.timeframe}` : ''}.`;
  }
  return '';
}

function completeness(s) {
  let got = 0, max = 0;
  const add = (w, ok) => { max += w; if (ok) got += w; };
  add(6, !!s.client.trim());
  add(3, !!s.service.trim());
  add(3, !!s.timeframe.trim());
  add(9, !!s.capture.before.trim());
  add(9, !!s.capture.during.trim());
  add(9, !!s.capture.after.trim());
  add(12, s.metrics.some((m) => m.label && metricDelta(m)));
  add(8, s.quotes.some((q) => q.text.trim()));
  add(6, s.quotes.some((q) => q.text.trim() && q.approved));
  s.beats.forEach((b) => add(3.5, !!b.text.trim()));
  CONSENT_ITEMS.forEach((c) => add(1.4, !!s.consent.items[c.id]));
  return Math.round((got / max) * 100);
}

function metricsTableMd(s) {
  const rows = s.metrics.filter((m) => m.label.trim());
  if (!rows.length) return '';
  const lines = ['| Metric | Before | After | Change |', '| --- | --- | --- | --- |'];
  rows.forEach((m) => {
    const d = metricDelta(m);
    lines.push(`| ${m.label} | ${m.before}${m.unit} | ${m.after}${m.unit} | ${d ? fmtDelta(d) : '—'} |`);
  });
  return lines.join('\n');
}

function trailerMd(s) {
  const L = [];
  L.push(`## ${s.client || 'Untitled client'} — ${s.service || 'case study'}`);
  const meta = [s.industry, s.timeframe].filter(Boolean).join(' · ');
  if (meta) L.push(`_${meta}_`);
  const log = logline(s);
  if (log) L.push('', `**In one line.** ${log}`);
  const before = beatText(s, 'before') || s.capture.before.trim();
  if (before) L.push('', `**Before.** ${before}`);
  const work = beatText(s, 'work') || s.capture.during.trim();
  if (work) L.push('', `**The work.** ${work}`);
  const after = beatText(s, 'after') || s.capture.after.trim();
  if (after) L.push('', `**After.** ${after}`);
  const nums = s.metrics.filter((m) => m.label.trim()).map((m) => {
    const d = metricDelta(m);
    return `${m.label}: ${m.before}${m.unit} → ${m.after}${m.unit}${d ? ` (${fmtDelta(d)})` : ''}`;
  });
  if (nums.length) L.push('', `**By the numbers.** ${nums.join(' · ')}`);
  const q = s.quotes.find((x) => x.text.trim() && x.approved) || s.quotes.find((x) => x.text.trim());
  if (q) L.push('', `> "${q.text.trim()}" — ${[q.name, q.role].filter(Boolean).join(', ') || 'Client'}`);
  const cta = beatText(s, 'cta');
  if (cta) L.push('', cta);
  return L.join('\n');
}

function featureMd(s) {
  const L = [];
  const log = logline(s);
  L.push(`# ${s.client || 'Untitled client'}: ${log || s.service || 'case study'}`);
  const meta = [s.service, s.industry, s.timeframe].filter(Boolean).join(' · ');
  if (meta) L.push(`_${meta}_`);
  s.beats.filter((b) => b.on && b.text.trim() && b.id !== 'hook').forEach((b) => {
    const def = BEAT_DEFS.find((d) => d.id === b.id);
    L.push('', `## ${def.title}`, '', b.text.trim());
  });
  const table = metricsTableMd(s);
  if (table) L.push('', '## Results, side by side', '', table);
  const approved = s.quotes.filter((q) => q.text.trim() && q.approved);
  if (approved.length) {
    L.push('', '## In their words');
    approved.forEach((q) => L.push('', `> "${q.text.trim()}"`, `> — ${[q.name, q.role].filter(Boolean).join(', ') || 'Client'}`));
  }
  const st = statusById(s.status);
  const sign = s.consent.approvedDate ? ` · Approved ${s.consent.approvedDate}${s.consent.contact ? ` by ${s.consent.contact}` : ''}` : '';
  L.push('', '---', `_Status: ${st.label}${sign}_`);
  return L.join('\n');
}

function serializeStudy(s) {
  const L = [`# Production file: ${s.client || 'Untitled'}`];
  L.push(`- Service delivered: ${s.service || '(not set)'}`);
  L.push(`- Industry: ${s.industry || '(not set)'}`);
  L.push(`- Timeframe: ${s.timeframe || '(not set)'}`);
  L.push(`- Pipeline status: ${statusById(s.status).label}`);
  L.push('', '## Raw interview notes');
  L.push(`**Before (their world pre-engagement):** ${s.capture.before || '(empty)'}`);
  L.push(`**During (what we did):** ${s.capture.during || '(empty)'}`);
  L.push(`**After (their world now):** ${s.capture.after || '(empty)'}`);
  L.push('', '## Metrics (before → after)');
  if (s.metrics.length) {
    s.metrics.forEach((m) => {
      const d = metricDelta(m);
      L.push(`- ${m.label || '(unlabeled)'}: ${m.before}${m.unit} → ${m.after}${m.unit}${d ? ` (${fmtDelta(d)})` : ''}`);
    });
  } else L.push('- (none captured yet)');
  L.push('', '## Client quotes');
  if (s.quotes.length) {
    s.quotes.forEach((q) => L.push(`- "${q.text}" — ${[q.name, q.role].filter(Boolean).join(', ') || 'unattributed'} [${q.approved ? 'APPROVED' : 'not yet approved'}]`));
  } else L.push('- (none captured yet)');
  L.push('', '## Narrative beats drafted so far');
  s.beats.forEach((b) => {
    const def = BEAT_DEFS.find((d) => d.id === b.id);
    L.push(`- ${def.title}${b.on ? '' : ' [excluded from final]'}: ${b.text.trim() || '(not written)'}`);
  });
  return L.join('\n');
}

/* ---------------- Copilot prompt builders ---------------- */
const COPILOT_ACTIONS = [
  {
    id: 'draft', icon: Wand2, title: 'Notes to first draft',
    desc: 'Hand Claude the raw production file; get all three cuts back.',
    build: (s) => `You are a senior B2B case-study writer who has ghostwritten for top consultancies. Your style: concrete, numerate, zero hype-words ("transformative", "seamless", "game-changing" are banned), and you always lead with change, not activity.

Below is my raw production file from Case Study Factory — interview notes, before/after metrics, client quotes, and the narrative beats I have drafted so far.

${serializeStudy(s)}

YOUR TASK
Write this case study in three cuts:
1. **Logline** — one sentence, max 25 words, built around the strongest verifiable number.
2. **Trailer** — a half-page (150–200 words) suitable for a website card or proposal appendix.
3. **Feature** — 600–800 words following my beat structure in order: The Hook, The Before, The Stakes, The Turn, The Work, The After, The Receipts, The Trailer Card (call to action).

RULES
- Use ONLY numbers present in my data. Never invent or extrapolate a metric. If a claim needs backup I have not provided, mark it [VERIFY].
- Quotes must stay verbatim; you may choose where to place them but not rewrite them.
- Write in the voice of the service provider ("we"), about the client by name.
- Where my beat drafts are decent, improve them; where empty, write them from the interview notes.

OUTPUT FORMAT
Markdown with exactly three sections: "## Logline", "## Trailer", "## Feature". After the Feature, add "## Editor's notes" — three bullet points on the weakest part of the story and what evidence would fix it.`,
  },
  {
    id: 'quotes', icon: Quote, title: 'Mine the pull-quotes',
    desc: 'Surface the 5 strongest quotable moments buried in the notes.',
    build: (s) => `You are an editor who cuts pull-quotes for business publications. Great pull-quotes are specific, emotional-but-credible, and stand alone without context.

Here is my case-study production file, including raw interview notes and existing quotes:

${serializeStudy(s)}

YOUR TASK
1. Extract or construct 5 candidate pull-quotes from the client's perspective. Prefer lines the client actually said (from the notes/quotes above). Where you tighten wording for clarity, keep meaning intact and flag it "(edited — needs client re-approval)".
2. For each candidate, give: the quote, the best speaker attribution from my data, a one-line "why it works", and where it belongs (hero, mid-story, results section, or social).
3. Rank them 1–5 and mark your single "marquee" pick.

RULES
- Never fabricate sentiment the notes do not support.
- Anything not verbatim from my data must carry the re-approval flag.

OUTPUT FORMAT: a markdown table with columns Quote | Speaker | Why it works | Placement | Verbatim?, then a one-paragraph recommendation for the marquee pick.`,
  },
  {
    id: 'social', icon: Share2, title: 'Cut 3 social posts',
    desc: 'Turn the finished study into a week of LinkedIn material.',
    build: (s) => `You are a B2B ghostwriter whose LinkedIn posts consistently earn comments from buyers, not just peers. You never use engagement-bait cliches ("I was today years old", "Unpopular opinion:"), hashtag walls, or fake humility.

Here is the finished case study to promote:

${featureMd(s)}

And the underlying production file for extra detail:

${serializeStudy(s)}

YOUR TASK
Write 3 LinkedIn posts from this one case study, each taking a different angle:
1. **The narrative post** — tell the turnaround as a story, client-first, cliffhanger opening line.
2. **The data post** — lead with the single strongest number, then the 3 decisions behind it.
3. **The lesson post** — the counterintuitive thing this engagement taught us, useful even to readers who never hire us.

RULES
- Max 180 words each. First line must survive the "see more" fold on its own.
- Only use numbers and quotes from my data; respect that only APPROVED quotes may appear.
- End each post with one soft call-to-action that fits my service.
- Add a suggested posting order across a week and one comment I should pin under each post.

OUTPUT FORMAT: "## Post 1 — Narrative", "## Post 2 — Data", "## Post 3 — Lesson", then "## Rollout plan".`,
  },
  {
    id: 'credibility', icon: ShieldCheck, title: 'Credibility pass',
    desc: 'A hostile skeptic reads the study before your prospects do.',
    build: (s) => `You are a skeptical procurement director who has read a thousand vendor case studies and believes roughly none of them. You are reviewing the case study below before it is published, and your job is to find every claim a cynical buyer would roll their eyes at.

THE CASE STUDY (current feature cut):

${featureMd(s)}

SUPPORTING PRODUCTION FILE:

${serializeStudy(s)}

YOUR TASK
1. List every factual claim in the study. For each: rate credibility 1–5 (5 = fully evidenced in the data), note what is missing (baseline? timeframe? attribution? sample size?), and suggest the smallest edit or piece of evidence that would fix it.
2. Flag any place where correlation is dressed up as causation.
3. Flag vague quantifiers ("significantly", "dramatically") and propose the concrete number to request from the client.
4. Finish with a verdict: "Publishable as-is", "Publishable with edits", or "Hold — needs evidence", plus the top 3 fixes in priority order.

OUTPUT FORMAT: a markdown table Claim | Credibility (1–5) | What's missing | Smallest fix, then the flags, then the verdict block.`,
  },
];

/* ---------------- demo data ---------------- */
function demoState() {
  const s1 = normalizeStudy({
    client: 'Meridian Freight Co.',
    industry: 'Mid-market logistics (140 staff)',
    service: 'Outbound revamp + sales process rebuild',
    timeframe: '14 weeks, Q1 2026',
    status: 'cleared',
    capture: {
      before: 'SDR team of 3 sending ~800 templated emails/mo off a bought list. Reply rate 1.1%, mostly angry. VP Sales Dana Okafor was two board meetings away from cutting outbound entirely. Pipeline concentration: 61% of open pipe from 2 referral sources. Reps spent Fridays manually building lists in spreadsheets.',
      during: 'Weeks 1-3: rebuilt the ICP around the 22 best-fit closed-won accounts; killed the bought list. Weeks 4-8: new 4-step sequence (problem-led, one CTA), call-first for tier-1 accounts. Weeks 9-14: weekly message testing ritual, handed off a documented playbook + hiring scorecard for SDR #4.',
      after: 'Reply rate holding above 5% for six straight weeks. Meetings booked tripled without adding headcount. Dana presented the playbook at the March board meeting instead of a shutdown plan. Two enterprise logos sourced entirely from the new tier-1 call-first motion.',
    },
    metrics: [
      { label: 'Cold reply rate', before: '1.1', after: '5.4', unit: '%' },
      { label: 'Qualified meetings / month', before: '6', after: '19', unit: '' },
      { label: 'Sales cycle', before: '94', after: '61', unit: ' days' },
      { label: 'Pipeline from outbound', before: '210', after: '740', unit: 'k' },
    ],
    quotes: [
      { text: "We'd written off cold outbound as a channel that simply didn't work for freight. Turns out it didn't work the way we were doing it.", name: 'Dana Okafor', role: 'VP Sales, Meridian Freight', approved: true },
      { text: 'The playbook is the thing. I could hire an SDR tomorrow and have them productive in a week.', name: 'Dana Okafor', role: 'VP Sales, Meridian Freight', approved: true },
      { text: 'First time in two years I actually enjoy Mondays. My calendar has real conversations on it.', name: 'Marcus Bell', role: 'SDR Lead', approved: false },
    ],
    beats: [
      { id: 'hook', on: true, text: 'Meridian Freight took cold reply rates from 1.1% to 5.4% in 14 weeks — with the same three SDRs and 40% fewer emails.' },
      { id: 'before', on: true, text: "Meridian's outbound was a volume machine pointed at the wrong people: 800 templated emails a month off a bought list, a 1.1% reply rate, and a VP Sales two board meetings away from shutting the channel down. Worse, 61% of open pipeline hung on just two referral sources — one soured relationship away from a bad year." },
      { id: 'stakes', on: true, text: 'Freight is a trust business with long memories; every spammy email was salting ground the brand would need later. Doing nothing meant betting the 2026 number entirely on referrals they did not control.' },
      { id: 'turn', on: true, text: 'Dana Okafor gave the channel one last quarter — but only if the approach changed completely. We won the work with an uncomfortable audit finding: their 22 best customers shared a profile their list vendor had never heard of.' },
      { id: 'work', on: true, text: 'Three moves. First, we rebuilt the ICP from closed-won data and killed the bought list. Second, we replaced the 800-email blast with a 4-step, problem-led sequence — call-first for the 60 tier-1 accounts. Third, we installed a weekly testing ritual and documented everything into a playbook an SDR can run without us.' },
      { id: 'after', on: true, text: 'Reply rate has held above 5% for six consecutive weeks. Qualified meetings tripled from 6 to 19 a month with zero added headcount, and outbound-sourced pipeline grew from $210k to $740k. The March board meeting featured a playbook, not a shutdown plan.' },
      { id: 'proof', on: true, text: 'The sequence and call scripts now live in a 34-page playbook Meridian owns outright — including the hiring scorecard they used to open SDR seat #4. Both enterprise logos signed this quarter came from the tier-1 call-first motion.' },
      { id: 'cta', on: true, text: 'If your outbound is a volume machine pointed at the wrong people, we run the same audit we ran for Meridian — one week, your closed-won data, no commitment. Book the audit.' },
    ],
    consent: {
      contact: 'Dana Okafor (dana@meridianfreight.example)',
      sentDate: '2026-06-30', approvedDate: '2026-07-08',
      notes: "Dana asked us to round pipeline figures to the nearest $10k and to hold Marcus's quote until his promotion is announced.",
      items: { quotes: true, metrics: true, name: true, placement: true, final: false },
    },
  });
  const s2 = normalizeStudy({
    client: 'Bright & Co. Accounting',
    industry: 'Boutique accounting firm',
    service: 'Referral program design',
    timeframe: '6 weeks, ongoing',
    status: 'development',
    capture: {
      before: 'Partner-led referrals only, feast or famine. No ask ritual. Maybe 1 warm intro a month.',
      during: 'Designed the "quarterly thank-you audit" ritual, built a referrer roster of 32 past clients, scripted three ask variants.',
      after: '',
    },
    metrics: [{ label: 'Warm intros / month', before: '1', after: '4', unit: '' }],
    quotes: [],
    beats: [{ id: 'hook', on: true, text: '' }],
    consent: { items: {} },
  });
  return normalize({ studies: [s1, s2], selectedId: s1.id, tab: 'capture', filter: 'all', seenGuide: true });
}

function blankStudy() {
  return normalizeStudy({ client: '', status: 'development' });
}

/* ---------------- clipboard helper (file:// safe) ---------------- */
function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }
  return Promise.resolve(fallbackCopy(text));
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch { /* ignore */ }
  document.body.removeChild(ta);
}

/* ================================================================
   SVG set pieces
   ================================================================ */
function ClapperMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <g transform="rotate(-8 24 24)">
        <rect x="6" y="20" width="36" height="20" rx="2.5" fill="#232019" stroke="#ffb437" strokeWidth="2" />
        <g transform="rotate(-14 8 16)">
          <rect x="6" y="10" width="36" height="8" rx="2" fill="#f1e8d5" />
          <path d="M10 10l6 8h6l-6-8zM24 10l6 8h6l-6-8zM38 10l4 5.3V18h-2l-6-8z" fill="#17140f" />
        </g>
        <rect x="10" y="25" width="20" height="2.4" rx="1.2" fill="#776b59" />
        <rect x="10" y="30" width="26" height="2.4" rx="1.2" fill="#776b59" />
        <circle cx="38" cy="34" r="2.6" fill="#ffb437" />
      </g>
    </svg>
  );
}

function ProjectorRig({ className }) {
  /* hand-built projector with light beam — the hero's left anchor */
  return (
    <svg viewBox="0 0 220 120" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="csf-beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffd07a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffb437" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="csf-lens" cx="0.35" cy="0.35" r="0.9">
          <stop offset="0" stopColor="#fff3d6" />
          <stop offset="0.5" stopColor="#ffb437" />
          <stop offset="1" stopColor="#8a5c07" />
        </radialGradient>
      </defs>
      <polygon points="70,52 220,6 220,110 70,66" fill="url(#csf-beam)" className="beam-flicker" />
      {/* reels */}
      <g stroke="#4d4436" strokeWidth="2" fill="#1c1916">
        <circle cx="26" cy="30" r="17" />
        <circle cx="58" cy="24" r="13" />
      </g>
      <g fill="#3b342a">
        <circle cx="26" cy="30" r="4" /><circle cx="58" cy="24" r="3.2" />
        <circle cx="26" cy="19" r="2.6" /><circle cx="35.5" cy="35.5" r="2.6" /><circle cx="16.5" cy="35.5" r="2.6" />
        <circle cx="58" cy="16" r="2" /><circle cx="65" cy="28" r="2" /><circle cx="51" cy="28" r="2" />
      </g>
      {/* body */}
      <rect x="12" y="48" width="58" height="30" rx="6" fill="#232019" stroke="#4d4436" strokeWidth="2" />
      <rect x="18" y="55" width="22" height="5" rx="2.5" fill="#3b342a" />
      <rect x="18" y="64" width="14" height="5" rx="2.5" fill="#3b342a" />
      <circle cx="66" cy="59" r="8.5" fill="url(#csf-lens)" stroke="#4d4436" strokeWidth="2" />
      {/* legs */}
      <path d="M24 78l-7 22m24-22l7 22M17 100h28" stroke="#4d4436" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="82" cy="59" r="2.2" fill="#ffd07a" className="beam-flicker" />
    </svg>
  );
}

function ReelDial({ value, size = 108 }) {
  /* film-reel completeness gauge */
  const r = 42, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const spokes = [0, 60, 120, 180, 240, 300];
  return (
    <svg viewBox="0 0 110 110" width={size} height={size} role="img" aria-label={`Production completeness ${pct} percent`}>
      <circle cx="55" cy="55" r="50" fill="#1c1916" stroke="#3b342a" strokeWidth="2" />
      {spokes.map((a) => (
        <circle key={a} cx={55 + 28 * Math.cos((a * Math.PI) / 180)} cy={55 + 28 * Math.sin((a * Math.PI) / 180)} r="7.5" fill="#131110" stroke="#3b342a" strokeWidth="1.5" />
      ))}
      <circle cx="55" cy="55" r="10" fill="#131110" stroke="#4d4436" strokeWidth="1.5" />
      {[0, 25, 50, 75].map((t) => {
        const a = ((t / 100) * 360 - 90) * (Math.PI / 180);
        return <line key={t} x1={55 + 46 * Math.cos(a)} y1={55 + 46 * Math.sin(a)} x2={55 + 50 * Math.cos(a)} y2={55 + 50 * Math.sin(a)} stroke="#776b59" strokeWidth="2" />;
      })}
      <circle cx="55" cy="55" r={r} fill="none" stroke="#3b342a" strokeWidth="5" />
      <circle
        cx="55" cy="55" r={r} fill="none" stroke={pct >= 80 ? '#93c26f' : '#ffb437'} strokeWidth="5"
        strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 55 55)"
      />
      <text x="55" y="52" textAnchor="middle" fill="#f1e8d5" fontSize="20" fontWeight="800" fontFamily="Bricolage Grotesque, sans-serif">{pct}</text>
      <text x="55" y="66" textAnchor="middle" fill="#b0a28a" fontSize="8" fontFamily="Public Sans, sans-serif" letterSpacing="1.5">IN THE CAN</text>
    </svg>
  );
}

function MetricBars({ metric }) {
  const a = parseNum(metric.before), b = parseNum(metric.after);
  const d = metricDelta(metric);
  if (a === null || b === null) return null;
  const max = Math.max(Math.abs(a), Math.abs(b), 0.0001);
  const wA = Math.max(3, (Math.abs(a) / max) * 100);
  const wB = Math.max(3, (Math.abs(b) / max) * 100);
  return (
    <svg viewBox="0 0 200 34" className="w-full" role="img" aria-label={`${metric.label}: before ${metric.before}${metric.unit}, after ${metric.after}${metric.unit}`}>
      {[0, 50, 100, 150, 200].map((x) => <line key={x} x1={x} y1="0" x2={x} y2="34" stroke="#3b342a" strokeWidth="0.6" />)}
      <rect x="0" y="4" width={wA * 2} height="9" rx="2" fill="#776b59" />
      <rect x="0" y="19" width={wB * 2} height="9" rx="2" fill="#ffb437" />
      <rect x={wB * 2 - 1.5} y="17" width="3" height="13" fill="#ffd07a" />
    </svg>
  );
}

/* ================================================================
   Small UI atoms
   ================================================================ */
function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline gap-2">
        <span className="font-display text-[13px] font-bold uppercase tracking-wider text-faded">{label}</span>
        {hint && <span className="text-[11px] text-dim">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls = 'w-full rounded-md border border-seam bg-set/80 px-3 py-2 text-[14px] text-bone placeholder:text-dim focus:border-amber/60';
const areaCls = inputCls + ' min-h-24 leading-relaxed resize-y';

function CopyBtn({ getText, label = 'Copy', className = '', onCopied }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={'inline-flex items-center gap-1.5 rounded-md border border-seam2 bg-card2 px-2.5 py-1.5 text-[12px] font-semibold text-bone hover:border-amber/60 hover:text-amber-hot ' + className}
      onClick={() => { copyText(getText()); setDone(true); onCopied?.(); setTimeout(() => setDone(false), 1600); }}
    >
      {done ? <Check className="h-3.5 w-3.5 text-cleared" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      {done ? 'Copied' : label}
    </button>
  );
}

function Modal({ title, kicker, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className={'modal-pop relative my-6 w-full rounded-xl border border-seam2 bg-booth shadow-marquee ' + (wide ? 'max-w-3xl' : 'max-w-xl')}>
        <div className="clap-stripes h-3 rounded-t-xl opacity-90" aria-hidden />
        <div className="flex items-start justify-between gap-4 border-b border-seam px-5 py-4">
          <div>
            {kicker && <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber">{kicker}</div>}
            <h2 className="font-display text-xl font-extrabold text-bone">{title}</h2>
          </div>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="rounded-md border border-seam bg-card p-1.5 text-faded hover:text-bone">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ================================================================
   APP
   ================================================================ */
export default function App() {
  const [state, setState] = useState(() => {
    try { return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
    catch { return normalize(null); }
  });
  const [modal, setModal] = useState(() => (state.seenGuide ? null : 'help')); // 'help' | 'reset' | 'export' | null
  const [toast, setToast] = useState(null); // { msg, undo? }
  const toastTimer = useRef(null);
  const fileRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  /* autosave (debounced) */
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
    }, 350);
    return () => clearTimeout(t);
  }, [state]);

  const showToast = useCallback((msg, undo) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), 7000);
  }, []);

  const selected = state.studies.find((s) => s.id === state.selectedId) || null;

  const patch = useCallback((p) => setState((st) => ({ ...st, ...p })), []);
  const updateStudy = useCallback((id, fn) => {
    setState((st) => ({ ...st, studies: st.studies.map((s) => (s.id === id ? normalizeStudy(fn(s)) : s)) }));
  }, []);

  const addStudy = useCallback(() => {
    const s = blankStudy();
    setState((st) => ({ ...st, studies: [s, ...st.studies], selectedId: s.id, tab: 'capture' }));
  }, []);

  const deleteStudy = useCallback((id) => {
    const st = stateRef.current;
    const idx = st.studies.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const victim = st.studies[idx];
    setState((cur) => {
      const remaining = cur.studies.filter((s) => s.id !== id);
      return { ...cur, studies: remaining, selectedId: cur.selectedId === id ? (remaining[Math.min(idx, remaining.length - 1)]?.id ?? null) : cur.selectedId };
    });
    showToast(`Struck "${victim.client || 'Untitled'}" from the slate`, () => {
      setState((cur) => {
        const arr = [...cur.studies];
        arr.splice(Math.min(idx, arr.length), 0, victim);
        return { ...cur, studies: arr, selectedId: victim.id };
      });
    });
  }, [showToast]);

  const loadDemo = useCallback(() => {
    setState((st) => ({ ...demoState(), seenGuide: st.seenGuide || true }));
    showToast('Demo production loaded — Meridian Freight is on the slate');
  }, [showToast]);

  const doReset = useCallback(() => {
    setState((st) => ({ ...normalize(null), seenGuide: st.seenGuide }));
    setModal(null);
    showToast('Studio cleared. Fresh slate.');
  }, [showToast]);

  const copyFeature = useCallback(() => {
    const s = stateRef.current.studies.find((x) => x.id === stateRef.current.selectedId);
    if (!s) { showToast('Nothing on the slate to copy yet'); return; }
    copyText(featureMd(s));
    showToast('Feature cut copied as Markdown');
  }, [showToast]);

  const downloadJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(stateRef.current, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'case-study-factory.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  const downloadCsv = useCallback(() => {
    const esc = (v) => '"' + String(v).replaceAll('"', '""') + '"';
    const rows = [['Client', 'Service', 'Status', 'Completeness %', 'Headline metric', 'Approved quotes'].map(esc).join(',')];
    stateRef.current.studies.forEach((s) => {
      const h = headlineMetric(s);
      rows.push([
        s.client, s.service, statusById(s.status).label, completeness(s),
        h ? `${h.m.label}: ${h.m.before}${h.m.unit} to ${h.m.after}${h.m.unit} (${fmtDelta(h.d)})` : '',
        s.quotes.filter((q) => q.approved && q.text.trim()).length,
      ].map(esc).join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'case-study-slate.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  const importJson = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = normalize(JSON.parse(String(reader.result)));
        setState((st) => ({ ...next, seenGuide: st.seenGuide || next.seenGuide }));
        showToast(`Imported ${next.studies.length} production${next.studies.length === 1 ? '' : 's'}`);
      } catch { showToast('That file did not parse — import unchanged'); }
    };
    reader.readAsText(file);
  }, [showToast]);

  /* keyboard shortcuts */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); copyFeature(); return; }
      if (e.key === 'Escape') {
        setModal(null);
        setState((st) => (st.seenGuide ? st : { ...st, seenGuide: true }));
        return;
      }
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (typing) return;
      if (e.key === '?') { e.preventDefault(); setModal('help'); }
      if (e.key.toLowerCase() === 'n') { addStudy(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [copyFeature, addStudy]);

  const closeHelp = useCallback(() => {
    setModal(null);
    setState((st) => (st.seenGuide ? st : { ...st, seenGuide: true }));
  }, []);

  const filtered = state.filter === 'all' ? state.studies : state.studies.filter((s) => s.status === state.filter);

  return (
    <div className="grain min-h-screen">
      <div className="app-chrome relative z-10 mx-auto max-w-[1500px] px-3 pb-24 sm:px-5">

        {/* ============ HEADER ============ */}
        <header className="pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ClapperMark className="h-10 w-10 shrink-0" />
              <div>
                <h1 className="font-display text-2xl font-extrabold leading-none tracking-tight text-bone sm:text-[28px]">
                  Case Study <span className="text-amber">Factory</span>
                </h1>
                <p className="mt-1 text-[12.5px] text-faded">Turn client wins into box-office proof — capture, cut, clear, release.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={loadDemo} className="inline-flex items-center gap-1.5 rounded-md border border-seam2 bg-card px-3 py-2 text-[12.5px] font-semibold text-bone hover:border-amber/60 hover:text-amber-hot">
                <Sparkles className="h-3.5 w-3.5" aria-hidden /> Load demo
              </button>
              <button type="button" onClick={() => setModal('reset')} className="inline-flex items-center gap-1.5 rounded-md border border-seam2 bg-card px-3 py-2 text-[12.5px] font-semibold text-bone hover:border-ember/70 hover:text-ember">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
              </button>
              <button type="button" onClick={() => setModal('help')} className="inline-flex items-center gap-1.5 rounded-md border border-seam2 bg-card px-3 py-2 text-[12.5px] font-semibold text-bone hover:border-amber/60 hover:text-amber-hot">
                <HelpCircle className="h-3.5 w-3.5" aria-hidden /> How to use
              </button>
              <button type="button" onClick={() => setModal('export')} className="inline-flex items-center gap-1.5 rounded-md bg-amber px-3 py-2 text-[12.5px] font-bold text-set hover:bg-amber-hot">
                <Download className="h-3.5 w-3.5" aria-hidden /> Export
              </button>
            </div>
          </div>

          {/* ============ HERO: projector + marquee screen ============ */}
          <div className="mt-4 overflow-hidden rounded-xl border border-seam bg-booth shadow-marquee">
            <div className="sprockets h-[22px] border-b border-seam" aria-hidden />
            <div className="flex flex-col items-stretch gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-0 sm:px-5">
              <ProjectorRig className="hidden h-[110px] w-[200px] shrink-0 sm:block" />
              <div className="min-w-0 flex-1 rounded-lg border border-seam2 bg-gradient-to-br from-[#2d2820] via-[#262117] to-[#1c1916] px-5 py-4 shadow-lift">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.25em] text-amber">Now showing on the marquee</div>
                {selected ? (
                  <>
                    <p className="mt-1.5 font-display text-[17px] font-bold leading-snug text-amber-hot sm:text-[19px]">
                      {logline(selected) || 'Write your Hook beat — or add a before/after metric — and your logline appears on this screen.'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-faded">
                      <span className={'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-semibold ' + statusById(selected.status).chip}>
                        <CircleDot className="h-3 w-3" aria-hidden /> {statusById(selected.status).label}
                      </span>
                      {selected.client && <span>{selected.client}</span>}
                      {selected.timeframe && <span>· {selected.timeframe}</span>}
                    </div>
                  </>
                ) : (
                  <p className="mt-1.5 font-display text-[17px] font-bold leading-snug text-faded sm:text-[19px]">
                    Dark screen. Load the demo or open a new production to light the projector.
                  </p>
                )}
              </div>
              {selected && (
                <div className="flex items-center justify-center sm:pl-5">
                  <ReelDial value={completeness(selected)} />
                </div>
              )}
            </div>
            <div className="sprockets h-[22px] border-t border-seam" aria-hidden />
          </div>
        </header>

        {/* ============ BODY GRID ============ */}
        <div className="mt-5 grid gap-5 lg:grid-cols-[270px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)_320px]">

          {/* -------- Production slate (sidebar) -------- */}
          <aside>
            <div className="rounded-xl border border-seam bg-booth p-3 shadow-marquee">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-display text-[13px] font-extrabold uppercase tracking-[0.15em] text-faded">Production slate</h2>
                <button type="button" onClick={addStudy} className="inline-flex items-center gap-1 rounded-md bg-amber px-2 py-1 text-[11.5px] font-bold text-set hover:bg-amber-hot">
                  <Plus className="h-3.5 w-3.5" aria-hidden /> New
                </button>
              </div>
              <div className="mb-3 flex flex-wrap gap-1">
                <button type="button" onClick={() => patch({ filter: 'all' })}
                  className={'rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ' + (state.filter === 'all' ? 'border-amber/60 bg-amber/15 text-amber-hot' : 'border-seam text-faded hover:text-bone')}>
                  All ({state.studies.length})
                </button>
                {STATUSES.map((st) => {
                  const n = state.studies.filter((s) => s.status === st.id).length;
                  return (
                    <button key={st.id} type="button" onClick={() => patch({ filter: st.id })}
                      className={'rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ' + (state.filter === st.id ? 'border-amber/60 bg-amber/15 text-amber-hot' : 'border-seam text-faded hover:text-bone')}>
                      {st.label} ({n})
                    </button>
                  );
                })}
              </div>
              <ul className="space-y-2">
                {filtered.length === 0 && (
                  <li className="rounded-lg border border-dashed border-seam2 px-3 py-4 text-center text-[12px] text-dim">
                    {state.studies.length === 0 ? 'No productions yet. Every client win you never wrote down is marketing you already paid for.' : 'Nothing in this stage of the pipeline.'}
                  </li>
                )}
                {filtered.map((s) => {
                  const st = statusById(s.status);
                  const pct = completeness(s);
                  const active = s.id === state.selectedId;
                  return (
                    <li key={s.id}>
                      <div
                        role="button" tabIndex={0}
                        onClick={() => patch({ selectedId: s.id })}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); patch({ selectedId: s.id }); } }}
                        className={'group w-full cursor-pointer rounded-lg border p-2.5 text-left transition-colors ' + (active ? 'border-amber/60 bg-card2 shadow-lift' : 'border-seam bg-card hover:border-seam2')}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 truncate font-display text-[13.5px] font-bold text-bone">{s.client || 'Untitled production'}</span>
                          <button type="button" aria-label={`Delete ${s.client || 'untitled study'}`}
                            onClick={(e) => { e.stopPropagation(); deleteStudy(s.id); }}
                            className="rounded p-0.5 text-dim opacity-0 hover:text-ember focus-visible:opacity-100 group-hover:opacity-100">
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                        {s.service && <div className="mt-0.5 truncate text-[11px] text-faded">{s.service}</div>}
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className={'inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ' + st.chip.split(' ')[0]}>
                            <span className={'h-1.5 w-1.5 rounded-full ' + st.dot} aria-hidden /> {st.label}
                          </span>
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-set">
                            <div className={'h-full rounded-full ' + (pct >= 80 ? 'bg-cleared' : 'bg-amber')} style={{ width: pct + '%' }} />
                          </div>
                          <span className="text-[10px] font-semibold tabular-nums text-dim">{pct}%</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          {/* -------- Main stage -------- */}
          <main className="min-w-0">
            {!selected ? (
              <EmptyStage onDemo={loadDemo} onNew={addStudy} />
            ) : (
              <div className="rounded-xl border border-seam bg-booth shadow-marquee">
                {/* tab rail styled as slate sections */}
                <div className="flex flex-wrap gap-1 border-b border-seam px-3 pt-3">
                  {[
                    { id: 'capture', label: 'The Shoot', icon: NotebookPen },
                    { id: 'assemble', label: 'The Edit Bay', icon: Scissors },
                    { id: 'cuts', label: 'Screening Room', icon: Film },
                    { id: 'release', label: 'Clearances', icon: ShieldCheck },
                  ].map((t) => (
                    <button key={t.id} type="button" onClick={() => patch({ tab: t.id })}
                      className={'inline-flex items-center gap-1.5 rounded-t-lg border border-b-0 px-3.5 py-2 text-[12.5px] font-bold ' +
                        (state.tab === t.id ? 'border-seam2 bg-card text-amber-hot' : 'border-transparent text-faded hover:text-bone')}>
                      <t.icon className="h-3.5 w-3.5" aria-hidden /> {t.label}
                    </button>
                  ))}
                </div>
                <div className="p-4 sm:p-5">
                  {state.tab === 'capture' && <CaptureTab study={selected} update={updateStudy} showToast={showToast} />}
                  {state.tab === 'assemble' && <AssembleTab study={selected} update={updateStudy} />}
                  {state.tab === 'cuts' && <CutsTab study={selected} showToast={showToast} />}
                  {state.tab === 'release' && <ReleaseTab study={selected} update={updateStudy} />}
                </div>
              </div>
            )}
          </main>

          {/* -------- Copilot: the Writers' Room -------- */}
          <aside className="min-w-0">
            <CopilotPanel study={selected} update={updateStudy} showToast={showToast} />
          </aside>
        </div>

        <footer className="mt-8 flex items-center justify-between text-[11px] text-dim">
          <span>Everything stays in this browser — localStorage only. Export JSON for backups.</span>
          <span className="hidden sm:block">Shortcuts: <kbd className="rounded border border-seam px-1">?</kbd> help · <kbd className="rounded border border-seam px-1">N</kbd> new · <kbd className="rounded border border-seam px-1">Ctrl+S</kbd> copy feature cut</span>
        </footer>
      </div>

      {/* ============ print sheet (feature cut only) ============ */}
      {selected && <PrintSheet study={selected} />}

      {/* ============ modals ============ */}
      {modal === 'help' && <HelpModal onClose={closeHelp} />}
      {modal === 'reset' && (
        <Modal title="Clear the whole studio?" kicker="Reset" onClose={() => setModal(null)}>
          <p className="text-[13.5px] leading-relaxed text-faded">
            This strikes every production from the slate and wipes saved data in this browser. If any of it matters, hit <strong className="text-bone">Export → Download JSON</strong> first.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setModal(null)} className="rounded-md border border-seam2 bg-card px-3 py-2 text-[12.5px] font-semibold text-bone hover:text-amber-hot">Keep everything</button>
            <button type="button" onClick={doReset} className="rounded-md bg-ember px-3 py-2 text-[12.5px] font-bold text-set hover:brightness-110">Yes, burn the negatives</button>
          </div>
        </Modal>
      )}
      {modal === 'export' && (
        <Modal title="Export & backup" kicker="Distribution" onClose={() => setModal(null)}>
          <div className="space-y-2.5">
            <ExportRow icon={FileText} title="Copy feature cut (Markdown)" desc="The full case study for the selected production — paste anywhere." onClick={() => { copyFeature(); }} cta="Copy" disabled={!selected} />
            <ExportRow icon={Printer} title="Print / save as PDF" desc="A print-clean feature cut of the selected production." onClick={() => { setModal(null); setTimeout(() => window.print(), 150); }} cta="Print" disabled={!selected} />
            <ExportRow icon={FileJson} title="Download JSON" desc="Full studio state — every production, beat, and clearance." onClick={downloadJson} cta="Download" />
            <ExportRow icon={Table2} title="Download slate CSV" desc="One row per production: status, completeness, headline metric." onClick={downloadCsv} cta="Download" disabled={state.studies.length === 0} />
            <ExportRow icon={Upload} title="Import JSON" desc="Restore a backup. Runs through the same validator as saved data." onClick={() => fileRef.current?.click()} cta="Choose file" />
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Import JSON backup"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
        </Modal>
      )}

      {/* ============ undo toast ============ */}
      {toast && (
        <div className="toast-in fixed bottom-5 left-1/2 z-[60] flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-lg border border-seam2 bg-card2 px-4 py-3 shadow-lift" role="status">
          <Clapperboard className="h-4 w-4 shrink-0 text-amber" aria-hidden />
          <span className="text-[13px] text-bone">{toast.msg}</span>
          {toast.undo && (
            <button type="button" onClick={() => { toast.undo(); setToast(null); }}
              className="inline-flex items-center gap-1 rounded-md bg-amber px-2.5 py-1 text-[12px] font-bold text-set hover:bg-amber-hot">
              <Undo2 className="h-3.5 w-3.5" aria-hidden /> Undo
            </button>
          )}
          <button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)} className="rounded p-0.5 text-dim hover:text-bone">
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

function ExportRow({ icon: Icon, title, desc, onClick, cta, disabled }) {
  return (
    <div className={'flex items-center justify-between gap-3 rounded-lg border border-seam bg-card px-3 py-2.5 ' + (disabled ? 'opacity-50' : '')}>
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="h-4.5 w-4.5 shrink-0 text-amber" aria-hidden />
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-bone">{title}</div>
          <div className="truncate text-[11.5px] text-faded">{desc}</div>
        </div>
      </div>
      <button type="button" disabled={disabled} onClick={onClick}
        className="shrink-0 rounded-md border border-seam2 bg-card2 px-2.5 py-1.5 text-[12px] font-semibold text-bone hover:border-amber/60 hover:text-amber-hot disabled:cursor-not-allowed">
        {cta}
      </button>
    </div>
  );
}

/* ================================================================
   Empty stage
   ================================================================ */
function EmptyStage({ onDemo, onNew }) {
  return (
    <div className="rounded-xl border border-dashed border-seam2 bg-booth/60 px-6 py-12 text-center shadow-marquee">
      <ClapperMark className="mx-auto h-16 w-16" />
      <h2 className="mt-4 font-display text-2xl font-extrabold text-bone">Nothing on the slate</h2>
      <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-faded">
        Every client win you never wrote down is marketing you already paid for. Pick your best result from the last year and give it twenty minutes in the Shoot tab — the Factory handles the structure.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onDemo} className="inline-flex items-center gap-1.5 rounded-md bg-amber px-4 py-2 text-[13px] font-bold text-set hover:bg-amber-hot">
          <Sparkles className="h-4 w-4" aria-hidden /> Load the demo production
        </button>
        <button type="button" onClick={onNew} className="inline-flex items-center gap-1.5 rounded-md border border-seam2 bg-card px-4 py-2 text-[13px] font-semibold text-bone hover:border-amber/60 hover:text-amber-hot">
          <Plus className="h-4 w-4" aria-hidden /> Start from a blank slate
        </button>
      </div>
      <div className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-2 text-left sm:grid-cols-3">
        {[
          ['1 · Shoot', 'Capture the before/during/after, hard numbers, and raw quotes while they are fresh.'],
          ['2 · Cut', 'Assemble eight narrative beats, then screen the logline, trailer, and feature.'],
          ['3 · Clear', 'Track written approval per quote, metric, and placement before anything ships.'],
        ].map(([t, d]) => (
          <div key={t} className="rounded-lg border border-seam bg-card p-3">
            <div className="font-display text-[12px] font-extrabold uppercase tracking-wider text-amber">{t}</div>
            <p className="mt-1 text-[12px] leading-relaxed text-faded">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   TAB: The Shoot (capture)
   ================================================================ */
function CaptureTab({ study, update, showToast }) {
  const set = (fn) => update(study.id, fn);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Client"><input className={inputCls} value={study.client} placeholder="Meridian Freight Co." onChange={(e) => set((s) => ({ ...s, client: e.target.value }))} /></Field>
        <Field label="Industry"><input className={inputCls} value={study.industry} placeholder="Mid-market logistics" onChange={(e) => set((s) => ({ ...s, industry: e.target.value }))} /></Field>
        <Field label="Service delivered"><input className={inputCls} value={study.service} placeholder="Outbound revamp" onChange={(e) => set((s) => ({ ...s, service: e.target.value }))} /></Field>
        <Field label="Timeframe"><input className={inputCls} value={study.timeframe} placeholder="14 weeks, Q1 2026" onChange={(e) => set((s) => ({ ...s, timeframe: e.target.value }))} /></Field>
      </div>

      <section>
        <SectionTitle icon={NotebookPen} title="Interview reel" sub="Ask the client, write their answers raw — polish happens in the Edit Bay." />
        <div className="mt-2 grid gap-3 lg:grid-cols-3">
          <Field label="Before" hint='"What was life like before we started?"'>
            <textarea className={areaCls} value={study.capture.before} placeholder="Pain, cost of pain, failed attempts, who felt it worst..." onChange={(e) => set((s) => ({ ...s, capture: { ...s.capture, before: e.target.value } }))} />
          </Field>
          <Field label="During" hint='"What did we actually do together?"'>
            <textarea className={areaCls} value={study.capture.during} placeholder="The moves, in order. Include what you decided NOT to do." onChange={(e) => set((s) => ({ ...s, capture: { ...s.capture, during: e.target.value } }))} />
          </Field>
          <Field label="After" hint='"What is different now, day to day?"'>
            <textarea className={areaCls} value={study.capture.after} placeholder="Numbers first, then feelings. What did they stop worrying about?" onChange={(e) => set((s) => ({ ...s, capture: { ...s.capture, after: e.target.value } }))} />
          </Field>
        </div>
      </section>

      <section>
        <SectionTitle icon={Table2} title="The numbers" sub="Before → after pairs. One strong metric beats five soft ones." />
        <div className="mt-2 space-y-2">
          {study.metrics.length === 0 && (
            <p className="rounded-lg border border-dashed border-seam2 px-3 py-3 text-[12.5px] text-dim">No metrics yet. Even "hours saved per week" counts — ask the client for one number they would defend to their own boss.</p>
          )}
          {study.metrics.map((m) => {
            const d = metricDelta(m);
            return (
              <div key={m.id} className="rounded-lg border border-seam bg-card p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_90px_90px_80px_auto] sm:items-end">
                  <Field label="Metric"><input className={inputCls} value={m.label} placeholder="Cold reply rate" onChange={(e) => set((s) => ({ ...s, metrics: s.metrics.map((x) => x.id === m.id ? { ...x, label: e.target.value } : x) }))} /></Field>
                  <Field label="Before"><input className={inputCls} value={m.before} placeholder="1.1" onChange={(e) => set((s) => ({ ...s, metrics: s.metrics.map((x) => x.id === m.id ? { ...x, before: e.target.value } : x) }))} /></Field>
                  <Field label="After"><input className={inputCls} value={m.after} placeholder="5.4" onChange={(e) => set((s) => ({ ...s, metrics: s.metrics.map((x) => x.id === m.id ? { ...x, after: e.target.value } : x) }))} /></Field>
                  <Field label="Unit"><input className={inputCls} value={m.unit} placeholder="%" onChange={(e) => set((s) => ({ ...s, metrics: s.metrics.map((x) => x.id === m.id ? { ...x, unit: e.target.value } : x) }))} /></Field>
                  <button type="button" aria-label={`Delete metric ${m.label || 'unlabeled'}`}
                    onClick={() => {
                      const victim = m;
                      set((s) => ({ ...s, metrics: s.metrics.filter((x) => x.id !== m.id) }));
                      showToast(`Metric "${victim.label || 'unlabeled'}" cut`, () => update(study.id, (s) => ({ ...s, metrics: [...s.metrics, victim] })));
                    }}
                    className="mb-0.5 justify-self-end rounded-md border border-seam p-2 text-dim hover:border-ember/60 hover:text-ember">
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1"><MetricBars metric={m} /></div>
                  {d && (
                    <span className={'shrink-0 rounded-md px-2 py-0.5 font-display text-[13px] font-extrabold tabular-nums ' + (d.up ? 'bg-cleared/15 text-cleared' : 'bg-ember/15 text-ember')}>
                      {fmtDelta(d)}
                    </span>
                  )}
                </div>
                {d === null && (m.before || m.after) && <p className="mt-1 text-[11px] text-dim">Add numeric before/after values to chart this one.</p>}
              </div>
            );
          })}
          <button type="button" onClick={() => set((s) => ({ ...s, metrics: [...s.metrics, { id: uid(), label: '', before: '', after: '', unit: '' }] }))}
            className="inline-flex items-center gap-1.5 rounded-md border border-seam2 bg-card px-3 py-1.5 text-[12px] font-semibold text-bone hover:border-amber/60 hover:text-amber-hot">
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add metric
          </button>
        </div>
      </section>

      <section>
        <SectionTitle icon={Quote} title="Quotes on tape" sub="Verbatim only. The approval checkbox is your legal memory." />
        <div className="mt-2 space-y-2">
          {study.quotes.length === 0 && (
            <p className="rounded-lg border border-dashed border-seam2 px-3 py-3 text-[12.5px] text-dim">No quotes yet. End the interview with: "If a peer asked whether working with us was worth it, what would you tell them?" Write down exactly what they say.</p>
          )}
          {study.quotes.map((q) => (
            <div key={q.id} className="rounded-lg border border-seam bg-card p-3">
              <textarea className={areaCls + ' min-h-16'} value={q.text} placeholder='"We had written off cold outbound entirely..."' onChange={(e) => set((s) => ({ ...s, quotes: s.quotes.map((x) => x.id === q.id ? { ...x, text: e.target.value } : x) }))} />
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center">
                <input className={inputCls} value={q.name} placeholder="Dana Okafor" aria-label="Speaker name" onChange={(e) => set((s) => ({ ...s, quotes: s.quotes.map((x) => x.id === q.id ? { ...x, name: e.target.value } : x) }))} />
                <input className={inputCls} value={q.role} placeholder="VP Sales" aria-label="Speaker role" onChange={(e) => set((s) => ({ ...s, quotes: s.quotes.map((x) => x.id === q.id ? { ...x, role: e.target.value } : x) }))} />
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-faded">
                  <input type="checkbox" checked={q.approved} className="h-4 w-4 accent-[#93c26f]"
                    onChange={(e) => set((s) => ({ ...s, quotes: s.quotes.map((x) => x.id === q.id ? { ...x, approved: e.target.checked } : x) }))} />
                  <span className={q.approved ? 'text-cleared' : ''}>{q.approved ? 'Approved' : 'Awaiting approval'}</span>
                </label>
                <button type="button" aria-label="Delete quote"
                  onClick={() => {
                    const victim = q;
                    set((s) => ({ ...s, quotes: s.quotes.filter((x) => x.id !== q.id) }));
                    showToast('Quote cut from the reel', () => update(study.id, (s) => ({ ...s, quotes: [...s.quotes, victim] })));
                  }}
                  className="justify-self-end rounded-md border border-seam p-2 text-dim hover:border-ember/60 hover:text-ember">
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => set((s) => ({ ...s, quotes: [...s.quotes, { id: uid(), text: '', name: '', role: '', approved: false }] }))}
            className="inline-flex items-center gap-1.5 rounded-md border border-seam2 bg-card px-3 py-1.5 text-[12px] font-semibold text-bone hover:border-amber/60 hover:text-amber-hot">
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add quote
          </button>
        </div>
      </section>

      <section>
        <SectionTitle icon={CircleDot} title="Pipeline status" sub="Where this production sits, development to released." />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {STATUSES.map((st) => (
            <button key={st.id} type="button" onClick={() => set((s) => ({ ...s, status: st.id }))}
              className={'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold ' +
                (study.status === st.id ? st.chip + ' bg-card2' : 'border-seam text-faded hover:text-bone')}>
              <span className={'h-2 w-2 rounded-full ' + st.dot} aria-hidden /> {st.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, sub }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-seam pb-1.5">
      <Icon className="h-4 w-4 translate-y-0.5 text-amber" aria-hidden />
      <h3 className="font-display text-[15px] font-extrabold text-bone">{title}</h3>
      {sub && <span className="hidden text-[11.5px] text-dim sm:inline">{sub}</span>}
    </div>
  );
}

/* ================================================================
   TAB: The Edit Bay (beats)
   ================================================================ */
function AssembleTab({ study, update }) {
  const set = (fn) => update(study.id, fn);
  const filled = study.beats.filter((b) => b.text.trim()).length;
  const move = (idx, dir) => {
    /* beats have a canonical order in BEAT_DEFS; here we let users reorder within the study */
    set((s) => {
      const arr = [...s.beats];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return s;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...s, beats: arr };
    });
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-xl text-[12.5px] leading-relaxed text-faded">
          Eight beats, one arc: hook them, show the before, raise the stakes, earn the turn, do the work, land the after, show the receipts, roll the trailer card. Toggle a beat off to cut it from the feature.
        </p>
        <div className="rounded-md border border-seam bg-card px-2.5 py-1 text-[11.5px] font-semibold text-faded">
          <span className="font-display text-[14px] font-extrabold text-amber-hot">{filled}</span> / {study.beats.length} beats on film
        </div>
      </div>
      {/* beat strip: mini progress like a strip of film frames */}
      <div className="flex gap-1" aria-hidden>
        {study.beats.map((b) => (
          <div key={b.id} className={'h-2 flex-1 rounded-sm ' + (b.text.trim() ? (b.on ? 'bg-amber' : 'bg-dim') : 'bg-set border border-seam')} />
        ))}
      </div>
      <ol className="space-y-2.5">
        {study.beats.map((b, i) => {
          const def = BEAT_DEFS.find((d) => d.id === b.id);
          return (
            <li key={b.id} className={'rounded-lg border p-3 ' + (b.on ? 'border-seam bg-card' : 'border-seam bg-set/60 opacity-70')}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="clap-stripes-amber inline-block h-3.5 w-8 rounded-sm" aria-hidden />
                  <span className="font-display text-[13.5px] font-extrabold text-bone">{i + 1}. {def.title}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label={`Move ${def.title} up`} disabled={i === 0} onClick={() => move(i, -1)}
                    className="rounded-md border border-seam p-1 text-dim hover:text-bone disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" aria-hidden /></button>
                  <button type="button" aria-label={`Move ${def.title} down`} disabled={i === study.beats.length - 1} onClick={() => move(i, 1)}
                    className="rounded-md border border-seam p-1 text-dim hover:text-bone disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" aria-hidden /></button>
                  <label className="ml-1 inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-faded">
                    <input type="checkbox" checked={b.on} className="h-3.5 w-3.5 accent-[#ffb437]"
                      onChange={(e) => set((s) => ({ ...s, beats: s.beats.map((x) => x.id === b.id ? { ...x, on: e.target.checked } : x) }))} />
                    In the cut
                  </label>
                </div>
              </div>
              <p className="mt-1.5 text-[11.5px] italic text-dim">{def.hint}</p>
              <textarea
                className={areaCls + ' mt-2 min-h-20'} value={b.text} placeholder={'Write ' + def.title.toLowerCase() + '...'}
                onChange={(e) => set((s) => ({ ...s, beats: s.beats.map((x) => x.id === b.id ? { ...x, text: e.target.value } : x) }))}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ================================================================
   TAB: Screening Room (three cuts)
   ================================================================ */
function CutsTab({ study, showToast }) {
  const cuts = [
    { id: 'logline', title: 'The Logline', runtime: 'one line · social bios, subject lines, hero headlines', text: logline(study) || 'No logline yet — write the Hook beat or add a numeric before/after metric.' , md: logline(study) },
    { id: 'trailer', title: 'The Trailer', runtime: 'half page · website cards, proposal appendix, sales decks', text: trailerMd(study), md: trailerMd(study) },
    { id: 'feature', title: 'The Feature', runtime: 'full cut · case-study page, PDF leave-behind', text: featureMd(study), md: featureMd(study) },
  ];
  return (
    <div className="space-y-4">
      <p className="text-[12.5px] leading-relaxed text-faded">
        Three cuts, assembled live from your shoot notes and beats. Nothing here is editable — go back to the Shoot or Edit Bay to change the picture. <kbd className="rounded border border-seam px-1 text-[10.5px]">Ctrl+S</kbd> copies the Feature.
      </p>
      {cuts.map((c) => (
        <div key={c.id} className="overflow-hidden rounded-lg border border-seam bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-seam bg-card2 px-3.5 py-2.5">
            <div>
              <div className="font-display text-[14px] font-extrabold text-amber-hot">{c.title}</div>
              <div className="text-[11px] text-dim">{c.runtime}</div>
            </div>
            <CopyBtn getText={() => c.md} label="Copy Markdown" onCopied={() => showToast(`${c.title} copied`)} />
          </div>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap px-4 py-3 font-body text-[12.5px] leading-relaxed text-bone">{c.text}</pre>
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   TAB: Clearances (consent tracker)
   ================================================================ */
function ReleaseTab({ study, update }) {
  const set = (fn) => update(study.id, fn);
  const done = CONSENT_ITEMS.filter((c) => study.consent.items[c.id]).length;
  const pct = Math.round((done / CONSENT_ITEMS.length) * 100);
  const unapproved = study.quotes.filter((q) => q.text.trim() && !q.approved).length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-seam bg-card p-4">
        <svg viewBox="0 0 60 60" width="64" height="64" role="img" aria-label={`Clearance progress ${pct} percent`}>
          <circle cx="30" cy="30" r="24" fill="none" stroke="#3b342a" strokeWidth="6" />
          <circle cx="30" cy="30" r="24" fill="none" stroke={pct === 100 ? '#93c26f' : '#ffb437'} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 2 * Math.PI * 24} ${2 * Math.PI * 24}`} transform="rotate(-90 30 30)" />
          <text x="30" y="35" textAnchor="middle" fill="#f1e8d5" fontSize="14" fontWeight="800" fontFamily="Bricolage Grotesque, sans-serif">{done}/{CONSENT_ITEMS.length}</text>
        </svg>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[15px] font-extrabold text-bone">{pct === 100 ? 'Cleared for release' : 'Clearances outstanding'}</h3>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-faded">
            A case study without written consent is a lawsuit with nice typography. Get each item in writing — email counts — before this leaves the building.
          </p>
          {unapproved > 0 && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-ember/15 px-2 py-1 text-[12px] font-semibold text-ember">
              <Quote className="h-3.5 w-3.5" aria-hidden /> {unapproved} quote{unapproved > 1 ? 's' : ''} on tape still awaiting approval (see The Shoot).
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {CONSENT_ITEMS.map((c) => (
          <label key={c.id} className={'flex cursor-pointer items-start gap-3 rounded-lg border p-3 ' + (study.consent.items[c.id] ? 'border-cleared/50 bg-cleared/10' : 'border-seam bg-card hover:border-seam2')}>
            <input type="checkbox" checked={!!study.consent.items[c.id]} className="mt-0.5 h-4 w-4 accent-[#93c26f]"
              onChange={(e) => set((s) => ({ ...s, consent: { ...s.consent, items: { ...s.consent.items, [c.id]: e.target.checked } } }))} />
            <span>
              <span className={'block text-[13px] font-bold ' + (study.consent.items[c.id] ? 'text-cleared' : 'text-bone')}>{c.label}</span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-dim">{c.hint}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Approver contact"><input className={inputCls} value={study.consent.contact} placeholder="Dana Okafor (dana@client.example)" onChange={(e) => set((s) => ({ ...s, consent: { ...s.consent, contact: e.target.value } }))} /></Field>
        <Field label="Sent for review"><input type="date" className={inputCls} value={study.consent.sentDate} onChange={(e) => set((s) => ({ ...s, consent: { ...s.consent, sentDate: e.target.value } }))} /></Field>
        <Field label="Approved on"><input type="date" className={inputCls} value={study.consent.approvedDate} onChange={(e) => set((s) => ({ ...s, consent: { ...s.consent, approvedDate: e.target.value } }))} /></Field>
      </div>
      <Field label="Clearance notes" hint="Redlines, conditions, embargo dates">
        <textarea className={areaCls} value={study.consent.notes} placeholder='e.g. "Round revenue to nearest $10k; hold SDR quote until promotion is public."' onChange={(e) => set((s) => ({ ...s, consent: { ...s.consent, notes: e.target.value } }))} />
      </Field>
    </div>
  );
}

/* ================================================================
   Copilot panel — the Writers' Room
   ================================================================ */
function CopilotPanel({ study, update, showToast }) {
  return (
    <div className="rounded-xl border border-amber/25 bg-booth shadow-marquee">
      <div className="border-b border-seam px-4 py-3">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-amber" aria-hidden />
          <h2 className="font-display text-[15px] font-extrabold text-bone">The Writers&apos; Room</h2>
        </div>
        <p className="mt-1 text-[11.5px] leading-snug text-faded">
          Each button builds a complete prompt around this production&apos;s data. Paste into <span className="font-semibold text-amber-hot">claude.ai</span> — works with the standard Claude subscription, no API key.
        </p>
      </div>
      <div className="space-y-2.5 px-4 py-3">
        {!study && <p className="rounded-lg border border-dashed border-seam2 px-3 py-3 text-[12px] text-dim">Select or create a production and the Writers&apos; Room lights up.</p>}
        {study && COPILOT_ACTIONS.map((a) => (
          <div key={a.id} className="rounded-lg border border-seam bg-card p-3">
            <div className="flex items-center gap-2">
              <a.icon className="h-4 w-4 shrink-0 text-amber" aria-hidden />
              <span className="font-display text-[13px] font-extrabold text-bone">{a.title}</span>
            </div>
            <p className="mt-1 text-[11.5px] leading-snug text-faded">{a.desc}</p>
            <div className="mt-2">
              <CopyBtn getText={() => a.build(study)} label="Copy prompt" onCopied={() => showToast(`Prompt ready — paste into claude.ai (${a.title})`)} />
            </div>
          </div>
        ))}
        {study && (
          <div className="rounded-lg border border-seam bg-card p-3">
            <div className="flex items-center gap-2">
              <ClipboardPaste className="h-4 w-4 text-amber" aria-hidden />
              <span className="font-display text-[13px] font-extrabold text-bone">Claude&apos;s dailies</span>
            </div>
            <p className="mt-1 text-[11.5px] text-faded">Paste Claude&apos;s answer here — it saves with this production.</p>
            <textarea
              className={areaCls + ' mt-2 min-h-28'} value={study.copilotNotes}
              placeholder="Paste the draft, pull-quotes, or critique back here for safekeeping..."
              onChange={(e) => update(study.id, (s) => ({ ...s, copilotNotes: e.target.value }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   Print sheet — clean feature cut for paper/PDF
   ================================================================ */
function PrintSheet({ study }) {
  const s = study;
  const approved = s.quotes.filter((q) => q.text.trim() && q.approved);
  const rows = s.metrics.filter((m) => m.label.trim());
  return (
    <div className="print-sheet">
      <h1>{s.client || 'Untitled client'}{logline(s) ? `: ${logline(s)}` : ''}</h1>
      <p><em>{[s.service, s.industry, s.timeframe].filter(Boolean).join(' · ')}</em></p>
      {s.beats.filter((b) => b.on && b.text.trim() && b.id !== 'hook').map((b) => {
        const def = BEAT_DEFS.find((d) => d.id === b.id);
        return (
          <div key={b.id}>
            <h2>{def.title}</h2>
            <p>{b.text.trim()}</p>
          </div>
        );
      })}
      {rows.length > 0 && (
        <div>
          <h2>Results, side by side</h2>
          <table>
            <thead><tr><th>Metric</th><th>Before</th><th>After</th><th>Change</th></tr></thead>
            <tbody>
              {rows.map((m) => {
                const d = metricDelta(m);
                return <tr key={m.id}><td>{m.label}</td><td>{m.before}{m.unit}</td><td>{m.after}{m.unit}</td><td>{d ? fmtDelta(d) : '—'}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      )}
      {approved.length > 0 && (
        <div>
          <h2>In their words</h2>
          {approved.map((q) => (
            <blockquote key={q.id}>&ldquo;{q.text.trim()}&rdquo; — {[q.name, q.role].filter(Boolean).join(', ') || 'Client'}</blockquote>
          ))}
        </div>
      )}
      <p><em>Status: {statusById(s.status).label}{s.consent.approvedDate ? ` · Approved ${s.consent.approvedDate}${s.consent.contact ? ` by ${s.consent.contact}` : ''}` : ''}</em></p>
    </div>
  );
}

/* ================================================================
   Help modal
   ================================================================ */
function HelpModal({ onClose }) {
  const steps = [
    ['Load the demo', 'Hit "Load demo" in the header to see a finished production — Meridian Freight — with every tab filled the way it should look.'],
    ['Shoot the interview', 'In The Shoot, capture the client, the before/during/after in their own words, hard before→after metrics, and verbatim quotes. Raw is fine; raw is better.'],
    ['Cut the story', 'In The Edit Bay, write the eight narrative beats. The hints under each beat tell you what earns the read. Reorder or toggle beats out of the cut as needed.'],
    ['Screen the three cuts', 'The Screening Room assembles a Logline, a half-page Trailer, and the full Feature live from your material. Copy any cut as Markdown.'],
    ['Clear it', 'In Clearances, tick off written approvals — quotes, metrics, name/logo, placements, final text — and log who approved what, when.'],
    ['Call the Writers’ Room', 'Use the Copilot panel to copy a ready-made prompt (draft, pull-quotes, social posts, credibility pass) into claude.ai, then paste the answer back into "Claude’s dailies".'],
    ['Release and back up', 'Export → copy the Feature, print to PDF, download the JSON backup or the slate CSV. Everything lives in this browser only.'],
  ];
  const keys = [
    ['?', 'Open this guide'],
    ['Esc', 'Close any dialog'],
    ['N', 'New production'],
    ['Ctrl/Cmd + S', 'Copy the Feature cut as Markdown'],
  ];
  return (
    <Modal title="How the Factory runs" kicker="Production manual" onClose={onClose} wide>
      <ol className="space-y-2.5">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="clap-stripes-amber flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-display text-[12px] font-extrabold text-set">
              <span className="rounded-sm bg-booth/90 px-1 text-amber-hot">{i + 1}</span>
            </span>
            <div>
              <div className="font-display text-[13.5px] font-extrabold text-bone">{t}</div>
              <p className="text-[12.5px] leading-relaxed text-faded">{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <h3 className="mt-5 font-display text-[13px] font-extrabold uppercase tracking-wider text-amber">Keyboard shortcuts</h3>
      <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {keys.map(([k, d]) => (
          <div key={k} className="flex items-center gap-2.5 rounded-md border border-seam bg-card px-3 py-1.5">
            <kbd className="rounded border border-seam2 bg-set px-1.5 py-0.5 font-body text-[11px] font-semibold text-amber-hot">{k}</kbd>
            <span className="text-[12px] text-faded">{d}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <button type="button" onClick={onClose} className="rounded-md bg-amber px-4 py-2 text-[13px] font-bold text-set hover:bg-amber-hot">Roll camera</button>
      </div>
    </Modal>
  );
}
