import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Scale, Flame, Coins, Crosshair, Swords, Gem, Plus, Trash2,
  ChevronLeft, Search, ShieldCheck, ShieldAlert, MessageSquare, Columns3,
  Pickaxe, Telescope, ClipboardList, Copy, Check, Download, Upload, FileText, FileDown,
  HelpCircle, RotateCcw, X, Sparkles, Undo2, Keyboard, BookOpen, AlertTriangle, Stamp,
  Gauge, Filter, ListChecks,
} from 'lucide-react';

/* ================================ constants ================================ */

const LS_KEY = 'bizdev:24-niche-validator:v1';

const CRITERIA = [
  { id: 'pain', label: 'Pain intensity', icon: Flame, hint: 'How urgent & costly is the problem for them right now?', lo: 'Nice-to-have', hi: 'Hair on fire' },
  { id: 'budget', label: 'Budget', icon: Coins, hint: 'Can they pay a real price — is money already budgeted?', lo: 'No budget', hi: 'Funded & ready' },
  { id: 'reach', label: 'Reachability', icon: Crosshair, hint: 'Can you find them and get in front of them affordably?', lo: 'Invisible', hi: 'Everywhere' },
  { id: 'competition', label: 'Open field', icon: Swords, hint: 'How clear is the field? Score high for open, low for brutal.', lo: 'Brutal', hi: 'Wide open' },
  { id: 'edge', label: 'Your edge', icon: Gem, hint: 'Do you have an unfair right-to-win — network, proof, insight?', lo: 'None yet', hi: 'Unfair edge' },
];

const STANCES = [
  { id: 'support', label: 'Supports', icon: ShieldCheck, color: 'verdigris' },
  { id: 'against', label: 'Against', icon: ShieldAlert, color: 'rust' },
  { id: 'neutral', label: 'Neutral', icon: MessageSquare, color: 'slag' },
];

const VERDICTS = {
  validated: { label: 'VALIDATED', short: 'Validated', color: 'gold', desc: 'Go — build the pipeline.' },
  rejected: { label: 'REJECTED', short: 'Rejected', color: 'rust', desc: 'No-go — kill it, for now.' },
  parked: { label: 'PARKED', short: 'Parked', color: 'slag', desc: 'Shelved — revisit later.' },
};

let _uid = 0;
const uid = () => `${Date.now().toString(36)}-${(_uid++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().slice(0, 10);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ================================ normalize ================================ */

const str = (v, fb = '') => (typeof v === 'string' ? v : fb);
const arr = (v) => (Array.isArray(v) ? v : []);
const num = (v, fb) => (Number.isFinite(Number(v)) ? Number(v) : fb);

function normEvidence(e) {
  return {
    id: str(e?.id) || uid(),
    stance: STANCES.some((s) => s.id === e?.stance) ? e.stance : 'neutral',
    text: str(e?.text),
    source: str(e?.source),
    url: str(e?.url),
    date: str(e?.date, today()),
  };
}
function normScores(s) {
  const out = {};
  CRITERIA.forEach((c) => { out[c.id] = clamp(Math.round(num(s?.[c.id], 5)), 0, 10); });
  return out;
}
function normDecision(d) {
  if (!d || typeof d !== 'object') return null;
  if (!VERDICTS[d.verdict]) return null;
  return {
    verdict: d.verdict,
    rationale: str(d.rationale),
    nextTest: str(d.nextTest),
    decidedAt: str(d.decidedAt, today()),
  };
}
function normNiche(n) {
  return {
    id: str(n?.id) || uid(),
    name: str(n?.name, 'Unnamed niche'),
    oneLiner: str(n?.oneLiner),
    description: str(n?.description),
    scores: normScores(n?.scores),
    evidence: arr(n?.evidence).map(normEvidence),
    notes: str(n?.notes),
    decision: normDecision(n?.decision),
    createdAt: str(n?.createdAt, today()),
  };
}
function normWeights(w) {
  const out = {};
  CRITERIA.forEach((c) => { out[c.id] = clamp(Math.round(num(w?.[c.id], 3)), 1, 5); });
  return out;
}

function normalize(raw) {
  let d = raw;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { d = null; } }
  if (!d || typeof d !== 'object') d = {};
  const niches = arr(d.niches).map(normNiche);
  return {
    niches,
    weights: normWeights(d.weights),
    selectedId: niches.some((n) => n.id === d.selectedId) ? d.selectedId : null,
    offer: str(d.offer),
    copilotNotes: str(d.copilotNotes),
    seenGuide: !!d.seenGuide,
  };
}

function loadState() {
  try { return normalize(localStorage.getItem(LS_KEY)); } catch { return normalize(null); }
}

/* ================================ demo data ================================ */

function demoState() {
  const ev = (stance, text, source, url, date) => ({ id: uid(), stance, text, source, url, date });
  return normalize({
    offer: 'I install a 90-day ops system for small service businesses — SOPs, a single source-of-truth dashboard, and light workflow automation. Flat fee, no retainer, done in 6 weeks.',
    copilotNotes: '',
    seenGuide: true,
    weights: { pain: 4, budget: 3, reach: 4, competition: 2, edge: 5 },
    selectedId: 'ore-fitness',
    niches: [
      {
        id: 'ore-fitness', name: 'Boutique fitness & yoga studios (2–6 locations)',
        oneLiner: 'Multi-location studio owners drowning in scheduling chaos and instructor payroll.',
        description: 'Owner-operators who grew past one location by instinct — now running three or four studios on a patchwork of spreadsheets, group chats, and whatever the front-desk software half-supports.',
        scores: { pain: 7, budget: 5, reach: 8, competition: 7, edge: 8 },
        notes: 'My own studio-owner client last year is basically this exact profile — she is my proof point and my first 5 warm intros.',
        createdAt: '2026-06-02',
        decision: { verdict: 'validated', rationale: 'Highest karat reading on the board and the only niche where I already have a paying reference client. Reach is excellent — studio owners hang out in 3 identifiable Facebook groups and one big Instagram hashtag community. My edge (an actual former studio-ops client) is real, not aspirational.', nextTest: 'Run the niche-specific outreach test against 20 multi-location owners found via the Facebook groups; target 4 replies and 1 booked call within 10 days before writing a single word of marketing copy.', decidedAt: '2026-07-10' },
        evidence: [
          ev('support', '"I have a Google Sheet, a Slack, and a paper binder at the front desk and none of them agree with each other." — studio owner, 4 locations', 'r/yogastudio thread on scheduling', '', '2026-06-04'),
          ev('support', 'Client (my own past project) cut instructor payroll disputes from ~6/month to 0 after we built a single source of truth.', 'Direct client, Bloom Movement Co.', '', '2026-06-05'),
          ev('support', '"We tried three different scheduling apps and none of them talk to payroll — we just do it by hand every Sunday night."', 'Studio Owners Collective FB group', '', '2026-06-11'),
          ev('against', 'A few owners in the same thread said Mindbody + a bookkeeper "mostly works" — the pain may be episodic (month-end) rather than constant.', 'Studio Owners Collective FB group', '', '2026-06-11'),
          ev('neutral', 'Average multi-location studio revenue estimated at $600k–$1.4M/yr per trade press — budget plausible but unconfirmed for smaller 2-location owners.', 'Industry trade newsletter', '', '2026-06-14'),
        ],
      },
      {
        id: 'ore-insurance', name: 'Independent insurance agencies (5–20 agents)',
        oneLiner: 'Agency principals manually tracking policy renewals and E&O compliance across spreadsheets.',
        description: 'Independent (non-captive) P&C agencies that outgrew their original AMS workflow but are too small for enterprise RevOps tooling.',
        scores: { pain: 8, budget: 7, reach: 6, competition: 5, edge: 6 },
        notes: 'Strong on paper. My hesitation is entirely reach — I do not have a single warm contact in this world yet.',
        createdAt: '2026-06-03',
        decision: null,
        evidence: [
          ev('support', '"Renewal season is a fire drill every single quarter. We find out a policy lapsed because the client calls angry."', 'Agency principal, LinkedIn comment', '', '2026-06-08'),
          ev('support', 'E&O compliance audit prep reportedly takes one ops person 2 full weeks per agency, per an agency-management-software vendor case study.', 'AMS vendor case study (vendor-published, treat as biased)', '', '2026-06-09'),
          ev('neutral', 'Agencies this size typically run $1–3M in commission revenue — budget for a flat-fee project is plausible but not yet confirmed by a real conversation.', 'Independent Agents Assoc. benchmark report', '', '2026-06-10'),
        ],
      },
      {
        id: 'ore-devtools', name: 'Series-A dev-tools startups (no ops hire yet)',
        oneLiner: 'Freshly-funded technical founders whose ops are held together with Notion and vibes.',
        description: '15–40 person dev-tools companies 3–9 months post Series A, before the first RevOps/BizOps hire lands.',
        scores: { pain: 6, budget: 8, reach: 4, competition: 3, edge: 4 },
        notes: 'Budget looks great on paper but everyone and their cousin is already pitching "fractional RevOps" into this exact inbox.',
        createdAt: '2026-06-05',
        decision: null,
        evidence: [
          ev('support', 'Funded startups have real budget and a founder who feels the chaos personally — easy pain to name in a cold email.', 'Personal experience, 2 past clients', '', '2026-06-12'),
          ev('against', 'Searched "fractional revops" + "series a" on LinkedIn: 40+ people actively positioning against this exact audience this month alone.', 'LinkedIn search, manual count', '', '2026-06-13'),
          ev('against', 'Two founders I DM\'d said they would rather hire a full-time ops generalist than pay an outside consultant — trust barrier for outsiders is high post-raise.', 'Cold DM replies (2 of 2)', '', '2026-06-15'),
        ],
      },
      {
        id: 'ore-hvac', name: 'Regional HVAC / plumbing contractor groups (3–8 trucks)',
        oneLiner: 'Trade contractors juggling dispatch, quoting, and job costing across paper and group texts.',
        description: 'Owner-operator trade businesses that have grown past one truck but have no real back-office system.',
        scores: { pain: 8, budget: 6, reach: 3, competition: 8, edge: 6 },
        notes: 'Field is wide open — almost nobody is pitching ops consulting into trades. The problem is I genuinely do not know how to reach them; no shared online watering hole yet.',
        createdAt: '2026-06-06',
        decision: null,
        evidence: [
          ev('support', '"Job costing is a guess. We find out we lost money on a job a month later, if ever."', 'Trade contractor, local networking event', '', '2026-06-18'),
          ev('neutral', 'Trade associations exist (local HVAC guild chapters) but engagement online is minimal — most communication happens by phone and in person.', 'Own research, local chapter website', '', '2026-06-19'),
          ev('against', 'No LinkedIn presence for owners in this segment in my area — cold outreach channel unproven, would likely require in-person or referral-only approach.', 'LinkedIn search, 0 relevant profiles found in a 20-contractor sample', '', '2026-06-19'),
        ],
      },
      {
        id: 'ore-skincare', name: 'DTC skincare brands (7–8 figure revenue)',
        oneLiner: 'Glamorous-sounding niche that is already saturated with ops and growth agencies.',
        description: 'Direct-to-consumer skincare/beauty brands doing $2M–$40M/yr, considered because of a single strong personal connection.',
        scores: { pain: 5, budget: 6, reach: 5, competition: 2, edge: 3 },
        notes: 'Talked myself out of this one. I was chasing the glamour of the vertical, not real evidence.',
        createdAt: '2026-06-07',
        decision: { verdict: 'rejected', rationale: 'Lowest karat reading on the board, and honestly the score is generous — my "edge" is one warm intro, not a repeatable advantage. The field is crowded with agencies who live and breathe DTC ops; I would be competing on their turf with none of their case studies.', nextTest: '', decidedAt: '2026-07-08' },
        evidence: [
          ev('against', 'Searched "DTC ops agency": dozens of well-funded, well-cased agencies already own this positioning.', 'Google search, manual scan', '', '2026-06-20'),
          ev('against', 'My one warm contact in this space said their brand already has 2 ops consultants on retainer — market may already be served at this size.', 'Warm intro call notes', '', '2026-06-21'),
          ev('neutral', 'DTC brands at this revenue band do have real budget, per public interviews with founders on ecommerce podcasts.', 'Podcast research', '', '2026-06-21'),
        ],
      },
    ],
  });
}

/* ============================ derived + serializers ============================ */

function weightedAvg(scores, weights) {
  const totalW = CRITERIA.reduce((s, c) => s + (weights[c.id] || 0), 0) || 1;
  const sum = CRITERIA.reduce((s, c) => s + (scores[c.id] || 0) * (weights[c.id] || 0), 0);
  return sum / totalW; // 0-10
}
const karatOf = (avg) => clamp(Math.round((avg / 10) * 24), 0, 24);
const purityOf = (avg) => clamp(Math.round((avg / 10) * 100), 0, 100);

function evidenceTally(evidence) {
  const t = { support: 0, against: 0, neutral: 0 };
  evidence.forEach((e) => { t[e.stance] = (t[e.stance] || 0) + 1; });
  return t;
}

function statusOf(niche) {
  return niche.decision ? niche.decision.verdict : 'candidate';
}

const pctLabel = (v) => `${v}%`;

function nicheToMarkdown(n, weights) {
  const avg = weightedAvg(n.scores, weights);
  const karat = karatOf(avg), purity = purityOf(avg);
  const t = evidenceTally(n.evidence);
  const st = statusOf(n);
  const L = [];
  L.push(`## ${n.name} — ${karat}kt (${purity}% purity) — ${st === 'candidate' ? 'Candidate' : VERDICTS[st].short}`);
  if (n.oneLiner) L.push(`> ${n.oneLiner}`);
  if (n.description) L.push(`\n${n.description}`);
  L.push(`\n### Assay scores (0–10, weighted in grains)`);
  L.push(`| Criterion | Score | Weight | Contribution |`);
  L.push(`| --- | --- | --- | --- |`);
  CRITERIA.forEach((c) => {
    const contrib = Math.round(((n.scores[c.id] * weights[c.id]) / (CRITERIA.reduce((s, x) => s + weights[x.id], 0) || 1)) * 10) / 10;
    L.push(`| ${c.label} | ${n.scores[c.id]}/10 | ${weights[c.id]} grains | ${contrib} |`);
  });
  L.push(`\n### Evidence log (${t.support} support · ${t.against} against · ${t.neutral} neutral)`);
  if (n.evidence.length === 0) L.push('_No evidence logged yet._');
  n.evidence.forEach((e) => {
    L.push(`- **[${e.stance.toUpperCase()}]** ${e.text || '—'}${e.source ? ` — _${e.source}_` : ''}${e.url ? ` (${e.url})` : ''}`);
  });
  if (n.notes) L.push(`\n### Notes\n${n.notes}`);
  if (n.decision) {
    L.push(`\n### Decision record — ${VERDICTS[n.decision.verdict].label}`);
    L.push(`Decided ${n.decision.decidedAt}.`);
    if (n.decision.rationale) L.push(`**Rationale:** ${n.decision.rationale}`);
    if (n.decision.nextTest) L.push(`**Next step:** ${n.decision.nextTest}`);
  }
  return L.join('\n');
}

function stateToMarkdown(state) {
  const ranked = state.niches.slice().sort((a, b) => weightedAvg(b.scores, state.weights) - weightedAvg(a.scores, state.weights));
  const top = ranked[0];
  const L = [
    `# Niche Validator — Assay Ledger`,
    `_Exported ${today()} · ${state.niches.length} candidates on the board${top ? ` · top reading: ${top.name} at ${karatOf(weightedAvg(top.scores, state.weights))}kt` : ''}_`,
  ];
  if (state.offer) L.push(`\n**What you sell:** ${state.offer}`);
  L.push(`\n## The assay weights (grains, 1–5 — higher = more important)`);
  CRITERIA.forEach((c) => L.push(`- ${c.label}: ${state.weights[c.id]} grains`));
  const decided = state.niches.filter((n) => n.decision);
  if (decided.length) {
    L.push(`\n## Decision register`);
    decided.forEach((n) => L.push(`- **${VERDICTS[n.decision.verdict].label}** — ${n.name} — decided ${n.decision.decidedAt}${n.decision.rationale ? ` — ${n.decision.rationale}` : ''}`));
  }
  ranked.forEach((n) => L.push(`\n---\n\n${nicheToMarkdown(n, state.weights)}`));
  return L.join('\n');
}

function nichesToCSV(niches, weights) {
  const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const rows = [['name', 'status', ...CRITERIA.map((c) => c.id), 'weighted_avg', 'karat', 'purity_pct', 'support', 'against', 'neutral', 'decided_at']];
  niches.forEach((n) => {
    const avg = weightedAvg(n.scores, weights);
    const t = evidenceTally(n.evidence);
    rows.push([
      n.name, statusOf(n), ...CRITERIA.map((c) => n.scores[c.id]),
      Math.round(avg * 100) / 100, karatOf(avg), purityOf(avg),
      t.support, t.against, t.neutral, n.decision?.decidedAt || '',
    ]);
  });
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}

/* ================================ clipboard ================================ */

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

function downloadFile(name, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ============================ copilot prompt builders ============================ */

function scoreTable(n) {
  return CRITERIA.map((c) => `- ${c.label}: ${n.scores[c.id]}/10 (${c.hint})`).join('\n');
}

function promptEvidenceQuestions(state, n) {
  return `You are a rigorous market-research analyst helping a solo founder or small BD team validate a niche BEFORE they build a go-to-market pipeline around it.

## What we sell
${state.offer || '(Not written yet — ask for it first if you need it.)'}

## The niche under assay
Name: ${n.name}
One-liner: ${n.oneLiner || '(not written yet)'}
${n.description ? `Description: ${n.description}` : ''}

## Current self-assessed scores (0–10 — our own guesses, exactly what needs testing)
${scoreTable(n)}

## Evidence collected so far
${n.evidence.length ? n.evidence.map((e) => `- [${e.stance.toUpperCase()}] ${e.text}${e.source ? ` — ${e.source}` : ''}`).join('\n') : '(None yet — this niche is still an untested hunch.)'}

## Your task
For EACH of the five assay criteria (pain intensity, budget, reachability, competition, your edge), write 3 sharp, falsifiable research questions we could answer within a week — a mix of:
- questions to ask in 5 real conversations with people in this niche
- searches to run (forums, subreddits, review sites, job postings, competitor pricing pages)
- data points to look up (market sizing, publicly reported budgets, churn/complaint patterns)
Favor questions whose answer could KILL the niche, not just confirm what we already believe.

## Output format
Markdown, one H3 heading per criterion with 3 bullet questions each. End with a "Fastest kill test" section: the single question that, if answered badly, should end this niche today.`;
}

function promptSteelmanAgainst(state, n) {
  return `You are a skeptical, sharp-eyed advisor whose job is to argue AGAINST the niche the user is most excited about — not to be contrarian for its own sake, but because a real go/no-go decision needs the strongest opposing case on the table before real money gets spent.

## What we sell
${state.offer || '(Not written yet.)'}

## The niche in question
${nicheToMarkdown(n, state.weights)}

## Your task
Build the strongest possible case AGAINST pursuing this niche, even though it currently scores well. Specifically:
1. Attack the evidence: which "supporting" entries are weak, anecdotal, cherry-picked, or could be explained another way?
2. Attack the scores: for each of the 5 criteria, argue why the self-assigned number might be optimistic, and what a more honest number could be.
3. Name the failure mode: if this niche turns out to be a mistake 6 months from now, what is the most likely reason, told as a short story?
4. Propose 3 disqualifying signals — if any of these turn up true, the user should kill this niche immediately, no further debate.

Do not soften this. Assume the user has already heard the optimistic case; they asked specifically for the pessimistic one, argued as strongly as it can honestly be argued.

## Output format
Markdown with sections: "Evidence under cross-examination", "Scores re-argued", "How this goes wrong", "Kill signals" (exactly 3 bullets).`;
}

function promptOutreachTest(state, n) {
  return `You are a lean, scrappy go-to-market strategist who believes the only validation that counts is a real stranger responding to a real message — not another spreadsheet of guesses.

## What we sell
${state.offer || '(Not written yet — infer a reasonable offer from the niche and note your assumption.)'}

## The niche
${nicheToMarkdown(n, state.weights)}

## Your task
Design ONE cheap, fast outreach test to validate real demand in this niche within 7 days, specifically tuned to what the evidence log already suggests about them. Include:
1. **Target list criteria** — exactly who to contact (role, company traits) and where to find 20 of them.
2. **Channel** — the single best channel for THIS niche, and why, given the reachability evidence above.
3. **Message** — a complete first-touch message (under 120 words) written in their language, referencing a specific pain point from the evidence log if one exists.
4. **Success metric** — the specific number that means "this niche is real" (e.g. reply rate, meetings booked) and the number that means "kill it."
5. **Timeline** — a day-by-day plan for one week.

## Output format
Markdown with 5 numbered sections matching the points above. Put the message from section 3 in its own fenced code block, ready to copy-paste as-is.`;
}

function promptBoardAudit(state) {
  const ranked = state.niches.slice().sort((a, b) => weightedAvg(b.scores, state.weights) - weightedAvg(a.scores, state.weights));
  return `You are a fractional Head of Growth reviewing a niche-assay board before the team commits real budget to one niche.

## What we sell
${state.offer || '(Not written yet.)'}

## Assay weights currently in use (grains, 1–5 — higher = more important)
${CRITERIA.map((c) => `- ${c.label}: ${state.weights[c.id]} grains`).join('\n')}

## Every candidate on the board, ranked by current weighted score
${ranked.map((n) => nicheToMarkdown(n, state.weights)).join('\n\n---\n\n')}

## Your task
1. Rank every candidate by how well-VALIDATED it actually is — not just its weighted score, but the strength and volume of real evidence behind it. Flag any niche whose score is high but evidence is thin ("hope, not data").
2. Call out contradictions: any niche with strong "against" evidence being ignored, or a validated niche whose rationale doesn't fully hold up under scrutiny.
3. Recommend exactly one niche to commit to next quarter, one to keep testing cheaply, and one to kill outright — one sentence of justification each.
4. Write a 4-line executive summary suitable for pasting into a founder update.

## Output format
Markdown sections: "True validation ranking", "Contradictions & blind spots", "This quarter's call", "Exec summary" (max 4 lines).`;
}

const COPILOT_ACTIONS = [
  { id: 'evidence', icon: Telescope, needsNiche: true, title: 'Generate evidence questions',
    desc: 'Sharp, falsifiable research questions per criterion, plus a fastest kill test.', build: (s, n) => promptEvidenceQuestions(s, n) },
  { id: 'steelman', icon: ShieldAlert, needsNiche: true, title: 'Steelman the case AGAINST',
    desc: 'The strongest honest argument to kill your top niche, before you spend on it.', build: (s, n) => promptSteelmanAgainst(s, n) },
  { id: 'outreach', icon: Crosshair, needsNiche: true, title: 'Draft the outreach test',
    desc: 'A complete 7-day cheap test: target list, channel, message, success metric.', build: (s, n) => promptOutreachTest(s, n) },
  { id: 'audit', icon: Scale, needsNiche: false, title: 'Full board audit',
    desc: 'Rank by true validation strength, flag contradictions, call the quarter.', build: (s) => promptBoardAudit(s) },
];

/* ================================ tiny UI atoms ================================ */

function IconBtn({ icon: Icon, label, onClick, tone = 'ghost', className = '', children, ...rest }) {
  const tones = {
    ghost: 'border-line bg-panel/60 text-inkdim hover:text-ink hover:border-brass/50',
    gold: 'border-gold/60 bg-gold/10 text-gold hover:bg-gold/20',
    brass: 'border-brass/50 bg-brass/10 text-brass hover:bg-brass/20',
    solid: 'border-brass bg-brass text-leatherdeep hover:bg-brassbright',
    rust: 'border-rust/60 bg-rust/10 text-rust hover:bg-rust/20',
  };
  return (
    <button type="button" onClick={onClick} aria-label={children ? undefined : label} title={label}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-semibold transition-colors ${tones[tone]} ${className}`} {...rest}>
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}{children}
    </button>
  );
}

function Panel({ title, icon: Icon, tone, children, className = '', actions }) {
  return (
    <section className={`rounded-lg border border-line bg-panel/85 shadow-raised backdrop-blur-sm ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-linesoft px-3.5 py-2.5">
          <h3 className={`label-caps flex items-center gap-2 text-xs ${tone === 'gold' ? 'text-gold' : tone === 'brass' ? 'text-brass' : tone === 'rust' ? 'text-rust' : 'text-inkdim'}`}>
            {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />} {title}
          </h3>
          {actions}
        </header>
      )}
      <div className="p-3.5">{children}</div>
    </section>
  );
}

function Modal({ open, onClose, title, icon: Icon, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-leatherdeep/80 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`toast-in relative mt-4 w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-lg border border-line bg-desk shadow-deck`}>
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-display flex items-center gap-2 text-base font-extrabold text-ink">
            {Icon && <Icon className="h-4 w-4 text-brass" aria-hidden />} {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close dialog"
            className="rounded-md border border-line p-1.5 text-inkdim hover:text-ink">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg border border-line bg-panel/80 px-3 py-2.5 shadow-raised">
      <div className="label-caps flex items-center gap-1.5 text-[10px] text-muted">
        <Icon className="h-3 w-3" aria-hidden /> {label}
      </div>
      <div className="font-display mt-1 text-2xl font-extrabold tabular-nums text-ink">{value}</div>
    </div>
  );
}

/* ================================ signature SVGs ================================ */

function Nugget({ cx, cy, karat = 12 }) {
  const s = 6 + (karat / 24) * 7;
  const pts = [[0, -1], [0.7, -0.5], [0.9, 0.3], [0.3, 1], [-0.6, 0.8], [-0.9, -0.2], [-0.4, -0.9]];
  const d = pts.map(([x, y]) => `${cx + x * s},${cy + y * s}`).join(' ');
  return <polygon points={d} fill="url(#nuggetGrad)" stroke="#5b4218" strokeWidth="0.75" />;
}

function AssayDefs() {
  return (
    <defs>
      <linearGradient id="brassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--color-brassbright)" />
        <stop offset="55%" stopColor="var(--color-brass)" />
        <stop offset="100%" stopColor="#7a5a1e" />
      </linearGradient>
      <radialGradient id="nuggetGrad" cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="var(--color-brassbright)" />
        <stop offset="100%" stopColor="var(--color-brass)" />
      </radialGradient>
    </defs>
  );
}

function BalanceScale({ left, right }) {
  const pivot = { x: 210, y: 76 };
  const armLen = 126;
  const chainLen = 62;
  let theta = 0;
  if (left && right) theta = clamp((right.karat - left.karat) * 0.85, -20, 20);
  else if (left && !right) theta = -13;
  else if (!left && right) theta = 13;
  const leftPanX = pivot.x - armLen, rightPanX = pivot.x + armLen;
  const panY = pivot.y + chainLen;

  const Pan = ({ x, data }) => (
    <>
      <line x1={x} y1={pivot.y} x2={x} y2={panY} stroke="#8a6a2c" strokeWidth="1.5" />
      <g transform={`translate(${x}, ${panY})`}>
        <g style={{ transform: `rotate(${-theta}deg)` }}>
          <ellipse cx="0" cy="0" rx="40" ry="12" fill="url(#brassGrad)" stroke="#5b4218" strokeWidth="1.5" />
          <ellipse cx="0" cy="-2" rx="33" ry="7.5" fill="#241a12" opacity="0.4" />
          {data && (
            <>
              <Nugget cx={0} cy={-6} karat={data.karat} />
              <text x="0" y="27" textAnchor="middle" fill="var(--color-ink)" style={{ font: '700 10.5px "IBM Plex Mono", monospace' }}>
                {data.name.length > 24 ? `${data.name.slice(0, 23)}…` : data.name}
              </text>
              <text x="0" y="42" textAnchor="middle" fill="var(--color-gold)" style={{ font: '800 15px "IBM Plex Mono", monospace' }}>{data.karat}kt</text>
            </>
          )}
        </g>
      </g>
    </>
  );

  return (
    <svg viewBox="0 0 420 280" className="mx-auto h-auto w-full max-w-[420px]" role="img"
      aria-label={left && right ? `Balance weighing ${left.name} at ${left.karat} karats against ${right.name} at ${right.karat} karats` : 'Assay balance, awaiting candidates'}>
      <AssayDefs />
      <path d="M 148 264 L 272 264 L 250 246 L 170 246 Z" fill="url(#brassGrad)" stroke="#5b4218" strokeWidth="1.5" />
      <ellipse cx="210" cy="252" rx="48" ry="8" fill="#100a06" opacity="0.45" />
      <rect x="204" y="80" width="12" height="168" rx="3" fill="url(#brassGrad)" stroke="#5b4218" strokeWidth="1" />
      <circle cx={pivot.x} cy={pivot.y} r="9" fill="url(#brassGrad)" stroke="#5b4218" strokeWidth="1.5" className="gleam" />
      <g className="beam-tilt" style={{ transform: `rotate(${theta}deg)`, transformOrigin: `${pivot.x}px ${pivot.y}px` }}>
        <line x1={leftPanX} y1={pivot.y} x2={rightPanX} y2={pivot.y} stroke="var(--color-brassbright)" strokeWidth="5" strokeLinecap="round" />
        <circle cx={leftPanX} cy={pivot.y} r="4" fill="var(--color-brass)" />
        <circle cx={rightPanX} cy={pivot.y} r="4" fill="var(--color-brass)" />
        <Pan x={leftPanX} data={left} />
        <Pan x={rightPanX} data={right} />
      </g>
      {!left && !right && (
        <text x="210" y="150" textAnchor="middle" fill="var(--color-muted)" style={{ font: '600 12px "IBM Plex Mono", monospace' }}>
          Add candidates to weigh them against each other
        </text>
      )}
    </svg>
  );
}

function KaratGauge({ karat, purity, size = 112 }) {
  const r = 36, cx = 50, cy = 50;
  const a0 = Math.PI, a1 = 0;
  const arc = (t) => { const a = a0 + (a1 - a0) * t; return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }; };
  const ticks = [];
  for (let i = 0; i <= 12; i++) {
    const a = a0 + (a1 - a0) * (i / 12);
    const major = i % 3 === 0;
    const inner = major ? r - 7 : r - 4;
    ticks.push(
      <line key={i} x1={cx + inner * Math.cos(a)} y1={cy - inner * Math.sin(a)}
        x2={cx + r * Math.cos(a)} y2={cy - r * Math.sin(a)}
        stroke={i === 0 || i === 12 ? 'var(--color-muted)' : 'var(--color-linesoft)'} strokeWidth={major ? 2 : 1} />
    );
  }
  const v = clamp(karat, 0, 24) / 24;
  const start = arc(0), end = arc(v);
  const needleA = a0 + (a1 - a0) * v;
  const arcColor = karat >= 18 ? 'var(--color-gold)' : karat >= 9 ? 'var(--color-brass)' : 'var(--color-slag)';
  return (
    <svg viewBox="0 0 100 62" width={size} height={size * 0.62} role="img" aria-label={`Assay reading ${karat} karats, ${purity}% purity`} className="overflow-visible">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--color-linesoft)" strokeWidth="6" />
      {karat > 0 && (
        <path d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`} fill="none" stroke={arcColor} strokeWidth="6" strokeLinecap="round" />
      )}
      {ticks}
      <line x1={cx} y1={cy} x2={cx + (r - 12) * Math.cos(needleA)} y2={cy - (r - 12) * Math.sin(needleA)}
        stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="3" fill="var(--color-ink)" />
      <text x={cx} y={cy - 12} textAnchor="middle" fill="var(--color-ink)" stroke="var(--color-panel)" strokeWidth="3"
        style={{ font: '800 13px "IBM Plex Mono", monospace', paintOrder: 'stroke' }}>{karat}kt</text>
    </svg>
  );
}

function CriteriaBars({ scores, size = 108 }) {
  const w = 130, h = 44, bw = 16;
  const gap = (w - CRITERIA.length * bw) / (CRITERIA.length + 1);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={size} height={size * (h / w)} role="img" aria-label="Criteria reading">
      <line x1="0" y1={h - 2} x2={w} y2={h - 2} stroke="var(--color-linesoft)" strokeWidth="1" />
      {CRITERIA.map((c, i) => {
        const x = gap + i * (bw + gap);
        const val = scores[c.id] || 0;
        const bh = Math.max(1.5, (val / 10) * (h - 8));
        const fill = val >= 7 ? 'var(--color-gold)' : val >= 4 ? 'var(--color-brass)' : 'var(--color-slag)';
        return <rect key={c.id} x={x} y={h - 2 - bh} width={bw} height={bh} rx="1.5" fill={fill} />;
      })}
    </svg>
  );
}

function EvidenceBalance({ tally, size = 30 }) {
  const diff = tally.support - tally.against;
  const theta = clamp(-diff * 6, -18, 18);
  return (
    <svg viewBox="0 0 40 30" width={size} height={size * 0.75} role="img" aria-label={`${tally.support} entries supporting, ${tally.against} against`}>
      <line x1="20" y1="4" x2="20" y2="10" stroke="var(--color-brass)" strokeWidth="2" />
      <g style={{ transform: `rotate(${theta}deg)`, transformOrigin: '20px 10px' }}>
        <line x1="4" y1="10" x2="36" y2="10" stroke="var(--color-brass)" strokeWidth="2" strokeLinecap="round" />
        <line x1="4" y1="10" x2="4" y2="17" stroke="#8a6a2c" strokeWidth="1" />
        <line x1="36" y1="10" x2="36" y2="17" stroke="#8a6a2c" strokeWidth="1" />
        <ellipse cx="4" cy="18.5" rx="6" ry="2.4" fill="var(--color-verdigris)" opacity="0.85" />
        <ellipse cx="36" cy="18.5" rx="6" ry="2.4" fill="var(--color-rust)" opacity="0.85" />
      </g>
    </svg>
  );
}

function StampGraphic({ verdict, size = 120, dateStr }) {
  const v = VERDICTS[verdict];
  const c = `var(--color-${v.color})`;
  return (
    <svg viewBox="0 0 140 140" width={size} height={size} role="img" aria-label={`${v.label} stamp, ${dateStr || ''}`} className="stamp-in">
      <g transform="rotate(-9 70 70)">
        <circle cx="70" cy="70" r="58" fill="none" stroke={c} strokeWidth="4" strokeDasharray="3 2.5" opacity="0.92" />
        <circle cx="70" cy="70" r="47" fill="none" stroke={c} strokeWidth="1.5" opacity="0.7" />
        <text x="70" y="65" textAnchor="middle" fill={c} style={{ font: '900 19px "Fraunces", serif', letterSpacing: '0.02em' }}>{v.label}</text>
        <text x="70" y="84" textAnchor="middle" fill={c} style={{ font: '600 9.5px "IBM Plex Mono", monospace', letterSpacing: '0.1em' }}>{dateStr || ''}</text>
      </g>
    </svg>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 40 40" className="h-10 w-10" role="img" aria-label="Niche Validator mark">
        <AssayDefs />
        <circle cx="20" cy="20" r="18" fill="var(--color-leatherdeep)" stroke="var(--color-line)" strokeWidth="2" />
        <rect x="18.5" y="9" width="3" height="20" rx="1.5" fill="url(#brassGrad)" />
        <line x1="9" y1="14" x2="31" y2="14" stroke="var(--color-brass)" strokeWidth="2" strokeLinecap="round" />
        <line x1="9" y1="14" x2="9" y2="21" stroke="#8a6a2c" strokeWidth="1" />
        <line x1="31" y1="14" x2="31" y2="21" stroke="#8a6a2c" strokeWidth="1" />
        <ellipse cx="9" cy="22.5" rx="6" ry="2.3" fill="url(#brassGrad)" />
        <ellipse cx="31" cy="22.5" rx="6.5" ry="2.6" fill="url(#brassGrad)" />
        <circle cx="20" cy="12.5" r="2.5" fill="var(--color-gold)" className="gleam" />
      </svg>
      <div>
        <div className="font-display text-xl font-extrabold leading-none tracking-tight text-ink">
          NICHE <span className="text-gold">VALIDATOR</span>
        </div>
        <div className="label-caps mt-1 text-[10px] text-muted">Pick the niche before you build the pipeline</div>
      </div>
    </div>
  );
}

/* ================================ niche card ================================ */

function StatusTag({ niche }) {
  const st = statusOf(niche);
  if (st === 'candidate') {
    return <span className="label-caps inline-flex items-center gap-1 rounded-sm border border-line bg-panelraised px-1.5 py-0.5 text-[10px] text-inkdim"><Search className="h-2.5 w-2.5" aria-hidden /> Assaying</span>;
  }
  const v = VERDICTS[st];
  const cls = {
    gold: 'border-gold/50 bg-gold/10 text-gold',
    rust: 'border-rust/50 bg-rust/10 text-rust',
    slag: 'border-slag/50 bg-slag/10 text-inkdim',
  }[v.color];
  return <span className={`label-caps inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] ${cls}`}><Stamp className="h-2.5 w-2.5" aria-hidden /> {v.short}</span>;
}

function NicheCard({ n, weights, index, onOpen, onDelete, compareChecked, onToggleCompare }) {
  const avg = weightedAvg(n.scores, weights);
  const karat = karatOf(avg), purity = purityOf(avg);
  const tally = evidenceTally(n.evidence);
  return (
    <div className="group relative rounded-lg border border-line bg-panel/85 p-4 shadow-raised transition-colors hover:border-brass/50">
      <button type="button" onClick={() => onOpen(n.id)} className="block w-full text-left" aria-label={`Open ${n.name}`}>
        <div className="flex items-start justify-between gap-2">
          <span className="label-caps text-[9px] text-muted">SPECIMEN N&deg;{String(index + 1).padStart(3, '0')}</span>
          <StatusTag niche={n} />
        </div>
        <div className="mt-1.5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display truncate text-base font-extrabold text-ink group-hover:text-brassbright">{n.name}</div>
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-inkdim">{n.oneLiner || 'No one-liner yet — open the specimen to write one.'}</p>
          </div>
          <KaratGauge karat={karat} purity={purity} size={80} />
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <CriteriaBars scores={n.scores} size={112} />
          <div className="flex shrink-0 flex-col items-end gap-1">
            <EvidenceBalance tally={tally} size={34} />
            <span className="label-caps text-[9px] text-muted">{tally.support}s &middot; {tally.against}a &middot; {tally.neutral}n</span>
          </div>
        </div>
      </button>
      <div className="mt-3 flex items-center justify-between border-t border-linesoft pt-2.5">
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-inkdim">
          <input type="checkbox" checked={compareChecked} onChange={() => onToggleCompare(n.id)}
            aria-label={`Select ${n.name} for comparison`}
            className="h-3.5 w-3.5 rounded border-line accent-[#c8952f]" />
          Compare
        </label>
        <span className="label-caps text-[10px] tabular-nums text-muted">{purity}% purity</span>
        <button type="button" onClick={() => onDelete(n.id)} aria-label={`Remove ${n.name} from the board`}
          className="rounded p-1 text-inkdim opacity-0 transition-opacity hover:text-rust group-hover:opacity-100">
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/* ================================ weights panel ================================ */

function WeightsPanel({ weights, onChange }) {
  return (
    <Panel title="The Assay Weights — grains of importance" icon={Scale} tone="brass">
      <p className="mb-3 text-[12.5px] leading-relaxed text-inkdim">
        Every niche is weighed on the same five criteria. Set how many grains (1–5) each one counts for — the karat reading on every specimen recalculates live.
      </p>
      <div className="space-y-3.5">
        {CRITERIA.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.id}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <Icon className="h-3.5 w-3.5 text-brass" aria-hidden /> {c.label}
                </span>
                <span className="label-caps text-[10px] tabular-nums text-brass">{weights[c.id]} grain{weights[c.id] === 1 ? '' : 's'}</span>
              </div>
              <input type="range" min={1} max={5} step={1} value={weights[c.id]}
                onChange={(e) => onChange({ ...weights, [c.id]: Number(e.target.value) })}
                aria-label={`${c.label} weight in grains`}
                style={{ accentColor: 'var(--color-brass)' }}
                className="mt-1.5 w-full cursor-pointer" />
              <div className="mt-0.5 flex justify-between text-[10px] text-muted"><span>{c.lo}</span><span>{c.hi}</span></div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/* ================================ decision register ================================ */

function DecisionRegister({ niches }) {
  const decided = niches.filter((n) => n.decision).sort((a, b) => (b.decision.decidedAt || '').localeCompare(a.decision.decidedAt || ''));
  if (decided.length === 0) return null;
  return (
    <Panel title="The Decision Register" icon={Stamp} tone="gold">
      <ul className="space-y-2">
        {decided.map((n) => {
          const v = VERDICTS[n.decision.verdict];
          const dotCls = { gold: 'bg-gold', rust: 'bg-rust', slag: 'bg-slag' }[v.color];
          return (
            <li key={n.id} className="flex items-start gap-2.5">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotCls}`} aria-hidden />
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-bold text-ink">{n.name}</span>
                  <span className="label-caps text-[10px] text-muted">{v.label} &middot; {n.decision.decidedAt}</span>
                </div>
                {n.decision.rationale && <p className="line-clamp-1 text-[12px] text-inkdim">{n.decision.rationale}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ================================ board view ================================ */

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'candidate', label: 'Assaying' },
  { id: 'validated', label: 'Validated' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'parked', label: 'Parked' },
];

function BoardView({
  state, filtered, query, setQuery, statusFilter, setStatusFilter, sortBy, setSortBy,
  compareIds, onToggleCompare, onOpen, onAdd, onDelete, onLoadDemo, onOffer, onWeights,
}) {
  const empty = state.niches.length === 0;
  const ranked = state.niches.slice().sort((a, b) => weightedAvg(b.scores, state.weights) - weightedAvg(a.scores, state.weights));
  const top2 = ranked.slice(0, 2).map((n) => ({ name: n.name, karat: karatOf(weightedAvg(n.scores, state.weights)) }));
  const validatedCount = state.niches.filter((n) => n.decision?.verdict === 'validated').length;
  const rejectedCount = state.niches.filter((n) => n.decision?.verdict === 'rejected').length;
  const topKarat = ranked[0] ? karatOf(weightedAvg(ranked[0].scores, state.weights)) : 0;

  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,400px)_1fr]">
        <div className="flex flex-col gap-5">
          <Panel title="The Scale — top two, head to head" icon={Scale}>
            <BalanceScale left={top2[0] || null} right={top2[1] || null} />
          </Panel>
          <WeightsPanel weights={state.weights} onChange={onWeights} />
        </div>

        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="On the board" value={state.niches.length} icon={Pickaxe} />
            <Stat label="Validated" value={validatedCount} icon={Stamp} />
            <Stat label="Rejected" value={rejectedCount} icon={ShieldAlert} />
            <Stat label="Top reading" value={state.niches.length ? `${topKarat}kt` : '—'} icon={Gauge} />
          </div>

          <Panel title="What you sell — context for every reading" icon={ClipboardList} tone="brass">
            <textarea value={state.offer} onChange={(e) => onOffer(e.target.value)} rows={3}
              placeholder="One paragraph: what you sell, the shape of the offer, and the price. Every Copilot prompt gets sharper once this is filled in."
              className="w-full resize-y rounded-md border border-linesoft bg-desk px-3 py-2 text-sm leading-relaxed text-ink outline-none placeholder:text-muted focus:border-brass/60" />
          </Panel>

          <DecisionRegister niches={state.niches} />

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search specimens, evidence, notes…"
                aria-label="Search niches"
                className="w-full rounded-md border border-line bg-panel/80 py-2 pl-8 pr-3 text-sm text-ink outline-none placeholder:text-muted focus:border-brass/60" />
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort candidates"
              className="rounded-md border border-line bg-panel/80 px-2 py-2 text-sm text-ink outline-none focus:border-brass/60">
              <option value="karat">Sort: highest karat</option>
              <option value="name">Sort: name A–Z</option>
              <option value="newest">Sort: newest first</option>
            </select>
            <IconBtn icon={Plus} label="Add candidate niche" tone="solid" onClick={onAdd}>New specimen</IconBtn>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button key={f.id} type="button" onClick={() => setStatusFilter(f.id)}
                className={`label-caps rounded-md border px-2.5 py-1.5 text-[11px] transition-colors ${
                  statusFilter === f.id ? 'border-brass/60 bg-brass/15 text-brass' : 'border-line bg-panel/60 text-inkdim hover:text-ink'}`}>
                <Filter className="mr-1 inline h-2.5 w-2.5" aria-hidden />{f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {empty ? (
        <div className="mt-8 rounded-lg border border-dashed border-line bg-panel/40 p-10 text-center">
          <Pickaxe className="mx-auto h-10 w-10 text-muted" aria-hidden />
          <h2 className="font-display mt-3 text-lg font-extrabold text-ink">The assay table is empty</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-inkdim">
            Bring in the niches you are actually considering, weigh each on pain, budget, reachability, the field, and your edge — then log real evidence before you stamp a decision.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <IconBtn icon={Pickaxe} label="Load demo" tone="brass" onClick={onLoadDemo}>Load the demo assay</IconBtn>
            <IconBtn icon={Plus} label="Add first candidate" tone="solid" onClick={onAdd}>Add first specimen</IconBtn>
          </div>
        </div>
      ) : (
        <>
          {filtered.length === 0 && (
            <p className="mt-8 text-center text-sm text-inkdim">No specimens match that search or filter.</p>
          )}
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((n, i) => (
              <NicheCard key={n.id} n={n} weights={state.weights} index={i}
                onOpen={onOpen} onDelete={onDelete}
                compareChecked={compareIds.includes(n.id)} onToggleCompare={onToggleCompare} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ================================ evidence log ================================ */

function EvidenceLog({ evidence, onAdd, onDelete }) {
  const [draft, setDraft] = useState({ stance: 'support', text: '', source: '', url: '' });
  const submit = () => {
    if (!draft.text.trim()) return;
    onAdd({ ...draft, text: draft.text.trim() });
    setDraft({ stance: 'support', text: '', source: '', url: '' });
  };
  return (
    <div>
      <div className="ledger-lines space-y-0 rounded-md border border-linesoft">
        {evidence.length === 0 ? (
          <p className="p-3 text-sm text-inkdim">No evidence logged. Paste quotes, forum posts, call notes, or data points — anything that pushes this niche toward or away from real.</p>
        ) : (
          <ul>
            {evidence.map((e) => {
              const s = STANCES.find((x) => x.id === e.stance);
              const Icon = s.icon;
              const colorCls = { verdigris: 'border-l-verdigris text-verdigris', rust: 'border-l-rust text-rust', slag: 'border-l-slag text-inkdim' }[s.color];
              return (
                <li key={e.id} className={`group flex items-start gap-2.5 border-l-[3px] px-3 py-[7px] ${colorCls}`}>
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug text-ink">{e.text}</p>
                    {(e.source || e.url) && (
                      <p className="mt-0.5 truncate text-[11px] text-muted">{e.source}{e.source && e.url ? ' · ' : ''}{e.url}</p>
                    )}
                  </div>
                  <button type="button" onClick={() => onDelete(e.id, e.text)} aria-label="Delete evidence entry"
                    className="shrink-0 rounded p-1 text-inkdim opacity-0 transition-opacity hover:text-rust group-hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="mt-3 space-y-2 rounded-md border border-linesoft bg-desk/70 p-3">
        <div className="flex flex-wrap gap-1.5">
          {STANCES.map((s) => {
            const Icon = s.icon;
            const active = draft.stance === s.id;
            const cls = { verdigris: 'border-verdigris/60 bg-verdigris/15 text-verdigris', rust: 'border-rust/60 bg-rust/15 text-rust', slag: 'border-slag/60 bg-slag/15 text-inkdim' }[s.color];
            return (
              <button key={s.id} type="button" onClick={() => setDraft((d) => ({ ...d, stance: s.id }))} aria-pressed={active}
                className={`label-caps flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] transition-colors ${active ? cls : 'border-line bg-panel/60 text-inkdim'}`}>
                <Icon className="h-3 w-3" aria-hidden /> {s.label}
              </button>
            );
          })}
        </div>
        <textarea value={draft.text} onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))} rows={2}
          placeholder="Paste the quote, the data point, or the observation…" aria-label="Evidence text"
          className="w-full resize-y rounded border border-linesoft bg-panel/70 px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brass/60" />
        <div className="flex flex-wrap gap-2">
          <input value={draft.source} onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}
            placeholder="Source (who / where)" aria-label="Evidence source"
            className="min-w-[140px] flex-1 rounded border border-linesoft bg-panel/70 px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brass/60" />
          <input value={draft.url} onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
            placeholder="Link (optional)" aria-label="Evidence link"
            className="min-w-[140px] flex-1 rounded border border-linesoft bg-panel/70 px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brass/60" />
          <IconBtn icon={Plus} label="Add evidence entry" onClick={submit}>Log it</IconBtn>
        </div>
      </div>
    </div>
  );
}

/* ================================ seal modal ================================ */

function SealModal({ niche, verdict, onClose, onConfirm }) {
  const [rationale, setRationale] = useState(niche.decision?.rationale || '');
  const [nextTest, setNextTest] = useState(niche.decision?.nextTest || '');
  const v = VERDICTS[verdict];
  const nextLabel = verdict === 'validated' ? 'Next test — first move to build the pipeline'
    : verdict === 'rejected' ? 'What would have to change to revisit this'
    : 'What to check before reopening it';
  return (
    <Modal open onClose={onClose} title={`Stamp the seal — ${v.label}`} icon={Stamp}>
      <div className="flex flex-col items-center gap-3 pb-2">
        <StampGraphic verdict={verdict} size={104} dateStr={today()} />
        <p className="text-center text-sm text-inkdim">{v.desc} This is your decision record for <strong className="text-ink">{niche.name}</strong>.</p>
      </div>
      <label className="label-caps mt-2 block text-[10px] text-muted" htmlFor="seal-rationale">Rationale — why, in plain language</label>
      <textarea id="seal-rationale" value={rationale} onChange={(e) => setRationale(e.target.value)} rows={4}
        placeholder="What tipped the decision — the score, the evidence, a specific conversation…"
        className="mt-1 w-full resize-y rounded-md border border-linesoft bg-desk px-3 py-2 text-sm leading-relaxed text-ink outline-none placeholder:text-muted focus:border-brass/60" />
      <label className="label-caps mt-3 block text-[10px] text-muted" htmlFor="seal-next">{nextLabel}</label>
      <textarea id="seal-next" value={nextTest} onChange={(e) => setNextTest(e.target.value)} rows={2}
        className="mt-1 w-full resize-y rounded-md border border-linesoft bg-desk px-3 py-2 text-sm leading-relaxed text-ink outline-none placeholder:text-muted focus:border-brass/60" />
      <div className="mt-4 flex justify-end gap-2">
        <IconBtn label="Cancel" onClick={onClose}>Cancel</IconBtn>
        <IconBtn icon={Stamp} label={`Confirm ${v.label}`} tone={v.color === 'gold' ? 'gold' : v.color === 'rust' ? 'rust' : 'ghost'}
          onClick={() => onConfirm({ verdict, rationale, nextTest, decidedAt: today() })}>
          Stamp {v.short}
        </IconBtn>
      </div>
    </Modal>
  );
}

/* ================================ niche detail ================================ */

function NicheDetail({ n, weights, onBack, onPatch, onAddEvidence, onDeleteEvidence, onRemove, onCopy, onOpenSeal, onReopen }) {
  const avg = weightedAvg(n.scores, weights);
  const karat = karatOf(avg), purity = purityOf(avg);
  const totalW = CRITERIA.reduce((s, c) => s + weights[c.id], 0) || 1;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onBack}
          className="label-caps flex items-center gap-1 rounded-md border border-line bg-panel/60 px-2.5 py-1.5 text-[11px] text-inkdim hover:text-ink">
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Back to the board
        </button>
        <div className="flex gap-2">
          <IconBtn icon={Copy} label="Copy this specimen as Markdown" onClick={onCopy}>Copy specimen</IconBtn>
          <IconBtn icon={Trash2} label="Remove this specimen from the board" tone="rust" onClick={onRemove}>Remove</IconBtn>
        </div>
      </div>

      {/* identity strip */}
      <div className="rounded-lg border border-line bg-panel/85 p-4 shadow-raised">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[260px] flex-1">
            <label className="label-caps text-[10px] text-muted" htmlFor="nname">Specimen name</label>
            <input id="nname" value={n.name} onChange={(e) => onPatch({ name: e.target.value })}
              className="font-display mt-1 block w-full rounded-md border border-linesoft bg-desk px-3 py-2 text-xl font-extrabold text-ink outline-none focus:border-brass/60" />
            <input value={n.oneLiner} onChange={(e) => onPatch({ oneLiner: e.target.value })}
              placeholder="One line: who they are and the pain they carry…" aria-label="One-liner"
              className="mt-2 block w-full rounded-md border border-linesoft bg-desk px-3 py-1.5 text-sm text-inkdim outline-none placeholder:text-muted focus:border-brass/60" />
          </div>
          <div className="flex flex-col items-center">
            <KaratGauge karat={karat} purity={purity} size={128} />
            <StatusTag niche={n} />
          </div>
        </div>
        <div className="mt-3">
          <label className="label-caps text-[10px] text-muted" htmlFor="ndesc">Description — who exactly, and why now</label>
          <textarea id="ndesc" value={n.description} onChange={(e) => onPatch({ description: e.target.value })} rows={2}
            placeholder="The specifics: company size, role, how they currently cope, what triggers the search for a fix…"
            className="mt-1 w-full resize-y rounded-md border border-linesoft bg-desk px-3 py-2 text-sm leading-relaxed text-ink outline-none placeholder:text-muted focus:border-brass/60" />
        </div>
      </div>

      {/* criteria sliders */}
      <Panel className="mt-4" title="Assay readings — score each criterion" icon={Gauge} tone="brass">
        <div className="grid gap-4 sm:grid-cols-2">
          {CRITERIA.map((c) => {
            const Icon = c.icon;
            const val = n.scores[c.id];
            const contrib = Math.round(((val * weights[c.id]) / totalW) * 10) / 10;
            return (
              <div key={c.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <Icon className="h-3.5 w-3.5 text-brass" aria-hidden /> {c.label}
                  </span>
                  <span className="label-caps tabular-nums text-[11px] text-gold">{val}/10</span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted">{c.hint}</p>
                <input type="range" min={0} max={10} step={1} value={val}
                  onChange={(e) => onPatch({ scores: { ...n.scores, [c.id]: Number(e.target.value) } })}
                  aria-label={`${c.label} score`} style={{ accentColor: 'var(--color-gold)' }}
                  className="mt-1.5 w-full cursor-pointer" />
                <div className="flex justify-between text-[10px] text-muted">
                  <span>{c.lo}</span>
                  <span className="label-caps text-brass">contributes {contrib}</span>
                  <span>{c.hi}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* evidence */}
      <Panel className="mt-4" title="Evidence log — links & quotes you paste" icon={ClipboardList}>
        <EvidenceLog evidence={n.evidence} onAdd={onAddEvidence} onDelete={onDeleteEvidence} />
      </Panel>

      {/* notes + decision */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Panel title="Notes — your read, between the lines" icon={FileText}>
          <textarea value={n.notes} onChange={(e) => onPatch({ notes: e.target.value })} rows={8}
            placeholder="What the evidence doesn't capture: gut read, warm contacts you have here, doubts you can't quite prove…"
            className="h-full min-h-[160px] w-full resize-y rounded-md border border-linesoft bg-desk px-3 py-2 text-sm leading-relaxed text-ink outline-none placeholder:text-muted focus:border-brass/60" />
        </Panel>

        <Panel title="The Decision" icon={Stamp} tone="gold">
          {n.decision ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <StampGraphic verdict={n.decision.verdict} size={92} dateStr={n.decision.decidedAt} />
              {n.decision.rationale && <p className="text-[13px] leading-relaxed text-inkdim">{n.decision.rationale}</p>}
              {n.decision.nextTest && (
                <p className="text-[12px] text-inkdim"><span className="label-caps text-brass">Next: </span>{n.decision.nextTest}</p>
              )}
              <IconBtn icon={RotateCcw} label="Reopen this decision" onClick={onReopen}>Reopen for re-assay</IconBtn>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[13px] leading-relaxed text-inkdim">No decision stamped yet. Once the evidence and the reading feel honest, seal it.</p>
              <IconBtn icon={Stamp} label="Stamp VALIDATED — go" tone="gold" className="w-full justify-center" onClick={() => onOpenSeal('validated')}>Stamp VALIDATED</IconBtn>
              <IconBtn icon={Stamp} label="Stamp REJECTED — no-go" tone="rust" className="w-full justify-center" onClick={() => onOpenSeal('rejected')}>Stamp REJECTED</IconBtn>
              <IconBtn icon={Stamp} label="Park this niche" className="w-full justify-center" onClick={() => onOpenSeal('parked')}>Park it</IconBtn>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ================================ compare view ================================ */

function CompareView({ niches, weights, onClose, onRemove }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-leatherdeep/95 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Side-by-side comparison">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Columns3 className="h-5 w-5 text-brass" aria-hidden />
            <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">SIDE BY SIDE</h2>
            <span className="label-caps hidden text-[10px] text-muted sm:inline">every reading, one table</span>
          </div>
          <IconBtn icon={X} label="Close comparison (Esc)" onClick={onClose}>Close</IconBtn>
        </div>
        {niches.length < 2 ? (
          <p className="mt-10 text-center text-inkdim">Select at least 2 specimens on the board (the "Compare" checkbox on each card) to weigh them side by side.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-panel/80 shadow-raised">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="p-3 text-left"><span className="label-caps text-[10px] text-muted">Criterion</span></th>
                  {niches.map((n) => (
                    <th key={n.id} className="p-3 text-left align-top">
                      <div className="font-display text-sm font-extrabold text-ink">{n.name}</div>
                      <div className="mt-1"><StatusTag niche={n} /></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CRITERIA.map((c) => {
                  const Icon = c.icon;
                  return (
                    <tr key={c.id} className="border-b border-linesoft">
                      <td className="p-3 text-inkdim">
                        <span className="flex items-center gap-1.5 text-[13px]">
                          <Icon className="h-3.5 w-3.5 text-brass" aria-hidden /> {c.label}
                          <span className="label-caps text-[9px] text-muted">&times;{weights[c.id]}</span>
                        </span>
                      </td>
                      {niches.map((n) => (
                        <td key={n.id} className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-linesoft">
                              <div className="h-full rounded-full" style={{ width: `${n.scores[c.id] * 10}%`, background: n.scores[c.id] >= 7 ? 'var(--color-gold)' : n.scores[c.id] >= 4 ? 'var(--color-brass)' : 'var(--color-slag)' }} />
                            </div>
                            <span className="w-5 text-right text-xs tabular-nums text-ink">{n.scores[c.id]}</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr className="border-b border-linesoft bg-desk/40">
                  <td className="p-3"><span className="label-caps text-[11px] text-brass">Weighted reading</span></td>
                  {niches.map((n) => {
                    const avg = weightedAvg(n.scores, weights);
                    return (
                      <td key={n.id} className="p-3">
                        <span className="font-display text-lg font-extrabold text-gold">{karatOf(avg)}kt</span>{' '}
                        <span className="text-xs text-muted">({purityOf(avg)}%)</span>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="p-3"><span className="label-caps text-[11px] text-muted">Evidence tally</span></td>
                  {niches.map((n) => {
                    const t = evidenceTally(n.evidence);
                    return <td key={n.id} className="p-3 text-xs text-inkdim">{t.support} support &middot; {t.against} against &middot; {t.neutral} neutral</td>;
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {niches.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {niches.map((n) => (
              <button key={n.id} type="button" onClick={() => onRemove(n.id)}
                className="label-caps flex items-center gap-1 rounded-md border border-line bg-panel/60 px-2 py-1 text-[10px] text-inkdim hover:text-rust">
                {n.name} <X className="h-3 w-3" aria-hidden />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================ copilot drawer ================================ */

function CopilotDrawer({ state, onClose, onNotes, onToast }) {
  const [nicheId, setNicheId] = useState(state.selectedId || state.niches[0]?.id || '');
  const [activeId, setActiveId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const n = state.niches.find((x) => x.id === nicheId) || null;
  const active = COPILOT_ACTIONS.find((a) => a.id === activeId) || null;
  const prompt = active ? (active.needsNiche ? (n ? active.build(state, n) : '') : active.build(state)) : '';

  const doCopy = async () => {
    if (!prompt) return;
    const ok = await copyText(prompt);
    setCopiedId(ok ? active.id : null);
    onToast(ok ? 'Prompt copied — paste it into claude.ai' : 'Copy failed');
    if (ok) setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-leatherdeep/60 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-label="Claude Copilot"
        className="toast-in flex h-full w-full max-w-lg flex-col border-l border-line bg-desk shadow-deck">
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-display flex items-center gap-2 text-base font-extrabold text-ink">
            <Sparkles className="h-4 w-4 text-gold" aria-hidden /> Claude Copilot
          </h2>
          <button type="button" onClick={onClose} aria-label="Close Copilot"
            className="rounded-md border border-line p-1.5 text-inkdim hover:text-ink"><X className="h-4 w-4" aria-hidden /></button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <p className="text-[13px] leading-relaxed text-inkdim">
            Each action builds a complete prompt around your live assay data. Copy it, paste into{' '}
            <span className="font-semibold text-ink">claude.ai</span> — works with the standard $20 Claude subscription, no API key.
          </p>
          <div>
            <label className="label-caps text-[10px] text-muted" htmlFor="cp-niche">Target specimen</label>
            <select id="cp-niche" value={nicheId} onChange={(e) => setNicheId(e.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-panel px-2.5 py-2 text-sm text-ink outline-none focus:border-brass/60">
              {state.niches.length === 0 && <option value="">No specimens yet — add one first</option>}
              {state.niches.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            {COPILOT_ACTIONS.map((a) => {
              const disabled = a.needsNiche && !n;
              const Icon = a.icon;
              return (
                <button key={a.id} type="button" disabled={disabled}
                  onClick={() => setActiveId(a.id === activeId ? null : a.id)}
                  aria-pressed={activeId === a.id}
                  className={`flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors disabled:opacity-40 ${
                    activeId === a.id ? 'border-gold/60 bg-gold/10' : 'border-line bg-panel/70 hover:border-brass/50'}`}>
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${activeId === a.id ? 'text-gold' : 'text-inkdim'}`} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-ink">{a.title}</span>
                    <span className="block text-[12px] leading-snug text-inkdim">{a.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {active && prompt && (
            <div className="rounded-md border border-line bg-panel/70 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="label-caps text-[10px] text-gold">Generated prompt &middot; {prompt.length.toLocaleString()} chars</span>
                <IconBtn icon={copiedId === active.id ? Check : Copy} label="Copy prompt" tone="gold" onClick={doCopy}>
                  {copiedId === active.id ? 'Copied' : 'Copy prompt'}
                </IconBtn>
              </div>
              <textarea readOnly value={prompt} rows={10} aria-label="Generated Copilot prompt"
                className="w-full resize-y rounded border border-linesoft bg-desk p-2.5 font-mono text-[11.5px] leading-relaxed text-inkdim outline-none" />
              <p className="mt-1.5 text-[11px] text-muted">Paste into claude.ai — works with the standard Claude subscription.</p>
            </div>
          )}
          <div>
            <label className="label-caps text-[10px] text-muted" htmlFor="cp-notes">Assay notebook — paste Claude&apos;s answer back (auto-saved)</label>
            <textarea id="cp-notes" value={state.copilotNotes} onChange={(e) => onNotes(e.target.value)} rows={6}
              placeholder="Keep the useful parts of Claude's answers here, then fold them into scores, evidence, or the decision."
              className="mt-1 w-full resize-y rounded-md border border-line bg-panel px-3 py-2 text-sm leading-relaxed text-ink outline-none placeholder:text-muted focus:border-brass/60" />
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ================================ help ================================ */

function HelpContent() {
  const steps = [
    ['Write what you sell', 'On the board, fill in "What you sell — context for every reading." Every Copilot prompt and every judgment call gets sharper once this exists.'],
    ['Set the assay weights', 'In "The Assay Weights," set 1–5 grains per criterion (pain, budget, reachability, open field, your edge) based on what actually matters for your situation. These weights apply to every specimen at once.'],
    ['Bring in your candidates', 'Click "New specimen" for each niche you are genuinely considering (or Load demo to study a finished board). Give each a name, one-liner, and description.'],
    ['Score honestly', 'Open a specimen and set the five sliders 0–10. The karat gauge (0–24kt, like gold purity) and the percentage below it recompute live from your scores and weights.'],
    ['Log real evidence', 'In the evidence log, paste quotes, forum posts, call notes, or data points — tag each as supporting, against, or neutral. The little balance glyph on each card tilts toward whichever side has more weight.'],
    ['Compare side by side', 'Check "Compare" on 2–4 specimen cards, then open the comparison table for every criterion, weighted reading, and evidence tally in one view.'],
    ['Run Copilot passes', 'Press C or Copilot: generate evidence questions, steelman the case against your top niche, draft a 7-day outreach test, or audit the whole board. Copy the prompt into claude.ai and paste useful answers into the Assay notebook.'],
    ['Stamp the decision', 'When you are honestly done assaying a specimen, stamp it VALIDATED, REJECTED, or PARKED with a rationale and next step. Decisions show up in the Decision Register on the board.'],
  ];
  const keys = [
    ['?', 'Open this guide'], ['N', 'Add a new specimen'], ['C', 'Claude Copilot on/off'],
    ['V', 'Open comparison (needs 2+ selected)'], ['Ctrl / Cmd + S', 'Copy the full ledger as Markdown'],
    ['Esc', 'Close any panel or dialog, or step back'],
  ];
  return (
    <div className="space-y-5">
      <ol className="space-y-3">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="label-caps mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brass/50 bg-brass/10 text-[11px] tabular-nums text-brass">{i + 1}</span>
            <div>
              <div className="text-sm font-bold text-ink">{t}</div>
              <p className="text-[13px] leading-relaxed text-inkdim">{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <div>
        <h3 className="label-caps mb-2 flex items-center gap-1.5 text-[11px] text-gold"><Keyboard className="h-3.5 w-3.5" aria-hidden /> Keyboard shortcuts</h3>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {keys.map(([k, d]) => (
            <div key={k} className="flex items-center gap-2 rounded-md border border-linesoft bg-panel/60 px-2.5 py-1.5">
              <kbd className="rounded border border-line bg-desk px-1.5 py-0.5 font-mono text-[11px] text-ink">{k}</kbd>
              <span className="text-[12px] text-inkdim">{d}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[12px] leading-relaxed text-muted">
        Your data never leaves this browser — everything lives in localStorage. Export JSON regularly if the board matters to you.
      </p>
    </div>
  );
}

/* ================================ print sheet ================================ */

function PrintSheet({ state }) {
  const ranked = state.niches.slice().sort((a, b) => weightedAvg(b.scores, state.weights) - weightedAvg(a.scores, state.weights));
  return (
    <div className="print-sheet" aria-hidden>
      <h1>Niche Validator — Assay Ledger</h1>
      <p>Exported {today()} &middot; {state.niches.length} candidates on the board</p>
      {state.offer && <p><strong>What you sell:</strong> {state.offer}</p>}
      {ranked.map((n) => {
        const avg = weightedAvg(n.scores, state.weights);
        const t = evidenceTally(n.evidence);
        return (
          <div key={n.id} className="pc-card">
            <h2>{n.name} — {karatOf(avg)}kt ({purityOf(avg)}%) {n.decision ? `— ${VERDICTS[n.decision.verdict].label}` : ''}</h2>
            {n.oneLiner && <p><em>{n.oneLiner}</em></p>}
            {n.description && <p>{n.description}</p>}
            <h3>Scores</h3>
            <ul>{CRITERIA.map((c) => <li key={c.id}>{c.label}: {n.scores[c.id]}/10 (weight {state.weights[c.id]})</li>)}</ul>
            <h3>Evidence ({t.support} support &middot; {t.against} against &middot; {t.neutral} neutral)</h3>
            {n.evidence.length > 0 && (
              <ul>{n.evidence.map((e) => <li key={e.id}>[{e.stance.toUpperCase()}] {e.text}{e.source ? ` — ${e.source}` : ''}</li>)}</ul>
            )}
            {n.decision && (
              <>
                <h3>Decision record</h3>
                <p>{VERDICTS[n.decision.verdict].label} on {n.decision.decidedAt}. {n.decision.rationale}</p>
                {n.decision.nextTest && <p><strong>Next:</strong> {n.decision.nextTest}</p>}
              </>
            )}
          </div>
        );
      })}
      {state.niches.length === 0 && <p>No specimens yet.</p>}
    </div>
  );
}

/* ================================ App ================================ */

export default function App() {
  const [state, setState] = useState(loadState);
  const [view, setView] = useState('board'); // board | detail
  const [helpOpen, setHelpOpen] = useState(() => !loadStateSeen());
  const [resetOpen, setResetOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const [sealRequest, setSealRequest] = useState(null); // { nicheId, verdict }
  const [toast, setToast] = useState(null); // {msg, undo?}
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('karat');
  const toastTimer = useRef(null);
  const fileRef = useRef(null);
  const exportRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  function loadStateSeen() { try { return normalize(localStorage.getItem(LS_KEY)).seenGuide; } catch { return false; } }

  const selected = state.niches.find((n) => n.id === state.selectedId) || null;

  /* autosave (debounced) */
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
    }, 350);
    return () => clearTimeout(t);
  }, [state]);

  /* toast helper */
  const showToast = useCallback((msg, undo) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), 7000);
  }, []);

  const deleteWithUndo = useCallback((label, nextState) => {
    const prev = stateRef.current;
    setState(typeof nextState === 'function' ? nextState(prev) : nextState);
    showToast(label, () => setState(prev));
  }, [showToast]);

  /* state helpers */
  const patch = (p) => setState((s) => ({ ...s, ...p }));
  const patchNiche = (id, p) =>
    setState((s) => ({ ...s, niches: s.niches.map((n) => (n.id === id ? { ...n, ...(typeof p === 'function' ? p(n) : p) } : n)) }));

  const addNiche = () => {
    const n = normNiche({ name: 'New specimen' });
    setState((s) => ({ ...s, niches: [...s.niches, n], selectedId: n.id }));
    setView('detail');
  };

  const removeNiche = (id) => {
    const name = state.niches.find((n) => n.id === id)?.name || 'specimen';
    deleteWithUndo(`Removed "${name}" from the board`, (prev) => ({
      ...prev,
      niches: prev.niches.filter((n) => n.id !== id),
      selectedId: prev.selectedId === id ? null : prev.selectedId,
    }));
    if (state.selectedId === id) setView('board');
    setCompareIds((ids) => ids.filter((x) => x !== id));
  };

  const openDetail = (id) => { patch({ selectedId: id }); setView('detail'); };
  const backToBoard = () => setView('board');

  const closeHelp = () => { setHelpOpen(false); if (!state.seenGuide) patch({ seenGuide: true }); };

  const addEvidence = (nicheId, entry) => patchNiche(nicheId, (n) => ({ evidence: [...n.evidence, normEvidence(entry)] }));
  const deleteEvidence = (nicheId, evId) => {
    deleteWithUndo('Evidence entry removed', (prev) => ({
      ...prev,
      niches: prev.niches.map((n) => (n.id === nicheId ? { ...n, evidence: n.evidence.filter((e) => e.id !== evId) } : n)),
    }));
  };

  const confirmSeal = (decision) => {
    const niche = state.niches.find((n) => n.id === sealRequest.nicheId);
    patchNiche(sealRequest.nicheId, { decision });
    setSealRequest(null);
    showToast(`${VERDICTS[decision.verdict].label} stamped on "${niche?.name}"`);
  };
  const reopenDecision = (nicheId) => {
    const niche = state.niches.find((n) => n.id === nicheId);
    deleteWithUndo(`Reopened "${niche?.name}" for re-assay`, (prev) => ({
      ...prev,
      niches: prev.niches.map((n) => (n.id === nicheId ? { ...n, decision: null } : n)),
    }));
  };

  const toggleCompare = (id) => setCompareIds((ids) => {
    if (ids.includes(id)) return ids.filter((x) => x !== id);
    if (ids.length >= 4) { showToast('Compare holds up to 4 specimens at a time'); return ids; }
    return [...ids, id];
  });

  /* actions */
  const doCopyMarkdown = async () => {
    const ok = await copyText(stateToMarkdown(state));
    showToast(ok ? 'Assay ledger copied as Markdown' : 'Copy failed — try Export > Download');
  };
  const doCopyNiche = async (n) => {
    const ok = await copyText(nicheToMarkdown(n, state.weights));
    showToast(ok ? `"${n.name}" copied as Markdown` : 'Copy failed');
  };
  const doExportJSON = () => { downloadFile('niche-validator.json', 'application/json', JSON.stringify(state, null, 2)); setExportOpen(false); };
  const doExportCSV = () => { downloadFile('niche-validator-comparison.csv', 'text/csv', nichesToCSV(state.niches, state.weights)); setExportOpen(false); };
  const doImport = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = normalize(String(reader.result));
        setState((s) => ({ ...next, seenGuide: s.seenGuide || next.seenGuide }));
        showToast('Ledger imported — board updated');
      } catch { showToast('Import failed — not a valid ledger file'); }
    };
    reader.readAsText(f);
    e.target.value = '';
    setExportOpen(false);
  };
  const doLoadDemo = () => {
    setState((s) => ({ ...demoState(), seenGuide: s.seenGuide || true }));
    setView('board'); setCompareIds([]);
    showToast('Demo assay loaded — 5 specimens on the board');
  };
  const doReset = () => {
    try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
    setState(normalize({ seenGuide: true }));
    setView('board'); setResetOpen(false); setCompareIds([]);
    showToast('Board wiped clean');
  };

  /* keyboard */
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if (e.key === 'Escape') {
        if (sealRequest) { setSealRequest(null); return; }
        if (exportOpen) { setExportOpen(false); return; }
        if (compareOpen) { setCompareOpen(false); return; }
        if (helpOpen) { closeHelp(); return; }
        if (resetOpen) { setResetOpen(false); return; }
        if (copilotOpen) { setCopilotOpen(false); return; }
        if (view === 'detail') { setView('board'); return; }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); doCopyMarkdown(); return; }
      if (typing) return;
      if (e.key === '?') { e.preventDefault(); setHelpOpen(true); return; }
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); addNiche(); return; }
      if (e.key.toLowerCase() === 'c') { e.preventDefault(); setCopilotOpen((v) => !v); return; }
      if (e.key.toLowerCase() === 'v') {
        e.preventDefault();
        if (compareIds.length >= 2) setCompareOpen(true);
        else showToast('Select at least 2 specimens (checkbox on each card) to compare');
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* close export menu on outside click */
  useEffect(() => {
    if (!exportOpen) return;
    const onDown = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false); };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [exportOpen]);

  const filtered = state.niches
    .filter((n) => {
      if (statusFilter !== 'all' && statusOf(n) !== statusFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return [n.name, n.oneLiner, n.description, n.notes, ...n.evidence.map((e) => `${e.text} ${e.source}`)]
        .join(' ').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'newest') return b.createdAt.localeCompare(a.createdAt);
      return weightedAvg(b.scores, state.weights) - weightedAvg(a.scores, state.weights);
    });

  const compareNiches = compareIds.map((id) => state.niches.find((n) => n.id === id)).filter(Boolean);

  return (
    <div className="leather-grain min-h-screen">
      <div className="app-chrome">
        {/* ============ header ============ */}
        <header className="sticky top-0 z-40 border-b border-line bg-leatherdeep/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Wordmark />
            <div className="flex flex-wrap items-center gap-2">
              <IconBtn icon={Columns3} label={`Compare selected specimens (${compareIds.length} chosen)`}
                tone={compareIds.length >= 2 ? 'brass' : 'ghost'}
                onClick={() => (compareIds.length >= 2 ? setCompareOpen(true) : showToast('Select at least 2 specimens (checkbox on each card) to compare'))}>
                Compare{compareIds.length > 0 ? ` (${compareIds.length})` : ''}
              </IconBtn>
              <IconBtn icon={Sparkles} label="Claude Copilot (C)" tone="gold" onClick={() => setCopilotOpen(true)}>Copilot</IconBtn>
              <IconBtn icon={Pickaxe} label="Load demo assay" onClick={doLoadDemo}>Load demo</IconBtn>
              <IconBtn icon={HelpCircle} label="How to use (?)" onClick={() => setHelpOpen(true)}>How to use</IconBtn>
              <div className="relative" ref={exportRef}>
                <IconBtn icon={Download} label="Export menu" onClick={() => setExportOpen((v) => !v)} aria-expanded={exportOpen}>Export</IconBtn>
                {exportOpen && (
                  <div className="toast-in absolute right-0 z-50 mt-1.5 w-64 rounded-md border border-line bg-desk p-1.5 shadow-deck">
                    <button type="button" onClick={() => { doCopyMarkdown(); setExportOpen(false); }}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-ink hover:bg-panel">
                      <FileText className="h-4 w-4 text-inkdim" aria-hidden /> Copy assay ledger (Markdown)
                    </button>
                    <button type="button" onClick={doExportJSON}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-ink hover:bg-panel">
                      <FileDown className="h-4 w-4 text-inkdim" aria-hidden /> Download JSON (full state)
                    </button>
                    <button type="button" onClick={doExportCSV}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-ink hover:bg-panel">
                      <ListChecks className="h-4 w-4 text-inkdim" aria-hidden /> Download comparison (CSV)
                    </button>
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-ink hover:bg-panel">
                      <Upload className="h-4 w-4 text-inkdim" aria-hidden /> Import JSON…
                    </button>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={doImport} aria-label="Import JSON file" />
              </div>
              <IconBtn icon={RotateCcw} label="Reset all data" onClick={() => setResetOpen(true)} />
            </div>
          </div>
        </header>

        {/* ============ main ============ */}
        <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-6">
          {view === 'detail' && selected ? (
            <NicheDetail
              key={selected.id}
              n={selected} weights={state.weights}
              onBack={backToBoard}
              onPatch={(p) => patchNiche(selected.id, p)}
              onAddEvidence={(entry) => addEvidence(selected.id, entry)}
              onDeleteEvidence={(evId, text) => deleteEvidence(selected.id, evId, text)}
              onRemove={() => removeNiche(selected.id)}
              onCopy={() => doCopyNiche(selected)}
              onOpenSeal={(verdict) => setSealRequest({ nicheId: selected.id, verdict })}
              onReopen={() => reopenDecision(selected.id)}
            />
          ) : (
            <BoardView
              state={state} filtered={filtered}
              query={query} setQuery={setQuery}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              sortBy={sortBy} setSortBy={setSortBy}
              compareIds={compareIds} onToggleCompare={toggleCompare}
              onOpen={openDetail} onAdd={addNiche} onDelete={removeNiche} onLoadDemo={doLoadDemo}
              onOffer={(v) => patch({ offer: v })}
              onWeights={(w) => patch({ weights: normWeights(w) })}
            />
          )}
        </main>

        {/* ============ overlays ============ */}
        {compareOpen && (
          <CompareView niches={compareNiches} weights={state.weights}
            onClose={() => setCompareOpen(false)}
            onRemove={(id) => setCompareIds((ids) => ids.filter((x) => x !== id))} />
        )}
        {copilotOpen && (
          <CopilotDrawer state={state} onClose={() => setCopilotOpen(false)}
            onNotes={(v) => patch({ copilotNotes: v })} onToast={showToast} />
        )}
        {sealRequest && (
          <SealModal
            niche={state.niches.find((n) => n.id === sealRequest.nicheId)}
            verdict={sealRequest.verdict}
            onClose={() => setSealRequest(null)}
            onConfirm={confirmSeal}
          />
        )}

        <Modal open={helpOpen} onClose={closeHelp} title="How to run an assay" icon={BookOpen} wide>
          <HelpContent />
        </Modal>

        <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Wipe the board?" icon={AlertTriangle}>
          <p className="text-sm text-inkdim">
            This clears every specimen, evidence entry, and decision from this browser. Download a JSON backup first if you want a fallback copy.
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <IconBtn label="Cancel reset" onClick={() => setResetOpen(false)}>Cancel</IconBtn>
            <IconBtn icon={FileDown} label="Download JSON backup" onClick={() => downloadFile('niche-validator-backup.json', 'application/json', JSON.stringify(state, null, 2))}>Backup first</IconBtn>
            <IconBtn icon={RotateCcw} label="Confirm wipe" tone="rust" onClick={doReset}>Wipe it</IconBtn>
          </div>
        </Modal>

        {/* toast */}
        {toast && (
          <div className="toast-in fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-md border border-line bg-desk px-4 py-2.5 shadow-deck">
            <span className="text-sm text-ink">{toast.msg}</span>
            {toast.undo && (
              <button type="button" onClick={() => { toast.undo(); setToast(null); }}
                className="label-caps flex items-center gap-1 rounded border border-brass/50 bg-brass/10 px-2 py-1 text-[11px] text-brass hover:bg-brass/20">
                <Undo2 className="h-3 w-3" aria-hidden /> Undo
              </button>
            )}
          </div>
        )}
      </div>

      {/* print artifact */}
      <PrintSheet state={state} />
    </div>
  );
}
