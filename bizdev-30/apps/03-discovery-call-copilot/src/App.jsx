import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Radio, Mic, Play, Pause, SkipBack, SkipForward, Square, Plus, Trash2, Pencil,
  GripVertical, ArrowUp, ArrowDown, Copy, Check, Download, Upload, HelpCircle,
  RotateCcw, X, Clock3, Sparkles, Undo2, Search, Printer, Mail, ListChecks,
  CircleAlert, FileJson, FileText, ChevronRight, Headphones, BadgeCheck,
  MessageSquareText, StickyNote, Antenna, Disc3,
} from 'lucide-react';

/* ================================================================== */
/* Constants & world                                                   */
/* ================================================================== */

const SLUG = '03-discovery-call-copilot';
const LS_KEY = `bizdev:${SLUG}:v1`;

const STAGES = [
  { id: 'situation', name: 'Situation', freq: '88.1', color: 'var(--color-stg-situation)', hint: 'Map the current state — facts before feelings.' },
  { id: 'problem', name: 'Problem', freq: '92.5', color: 'var(--color-stg-problem)', hint: 'Find where it breaks, and who bleeds when it does.' },
  { id: 'impact', name: 'Impact', freq: '97.9', color: 'var(--color-stg-impact)', hint: 'Put a number on the cost of doing nothing.' },
  { id: 'ideal', name: 'Ideal', freq: '104.3', color: 'var(--color-stg-ideal)', hint: 'Let them broadcast the promised land in their own words.' },
];
const STAGE_IDS = STAGES.map((s) => s.id);
const stageMeta = (id) => STAGES.find((s) => s.id === id) || STAGES[0];

const CHECKS = [
  { id: 'nextStep', label: 'Next step booked before hanging up' },
  { id: 'painQuant', label: 'Pain quantified in hours or dollars' },
  { id: 'process', label: 'Decision process mapped' },
  { id: 'champion', label: 'Champion identified' },
  { id: 'budget', label: 'Budget range surfaced' },
];

let uidCounter = 0;
const uid = () => `${Date.now().toString(36)}-${(++uidCounter).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtClock = (sec) => {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/* ================================================================== */
/* Normalize / persistence                                             */
/* ================================================================== */

const str = (v, d = '') => (typeof v === 'string' ? v : d);
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const bool = (v, d = false) => (typeof v === 'boolean' ? v : d);
const arr = (v) => (Array.isArray(v) ? v : []);

function normalizeBankQ(q) {
  if (!q || typeof q !== 'object') q = {};
  return {
    id: str(q.id) || uid(),
    text: str(q.text),
    stage: STAGE_IDS.includes(q.stage) ? q.stage : 'situation',
    why: str(q.why),
  };
}
function normalizeSheetQ(q) {
  if (!q || typeof q !== 'object') q = {};
  return {
    id: str(q.id) || uid(),
    bankId: str(q.bankId),
    text: str(q.text),
    stage: STAGE_IDS.includes(q.stage) ? q.stage : 'situation',
    notes: str(q.notes),
    asked: bool(q.asked),
  };
}
function normalizeCall(c) {
  if (!c || typeof c !== 'object') c = {};
  const checks = {};
  for (const k of CHECKS) checks[k.id] = bool(c.checks && c.checks[k.id]);
  return {
    id: str(c.id) || uid(),
    prospect: str(c.prospect),
    role: str(c.role),
    company: str(c.company),
    industry: str(c.industry),
    goal: str(c.goal),
    date: str(c.date) || todayISO(),
    plannedMin: clamp(num(c.plannedMin, 30), 5, 240),
    status: c.status === 'done' ? 'done' : 'prep',
    questions: arr(c.questions).map(normalizeSheetQ).filter((q) => q.text.trim()),
    elapsedSec: Math.max(0, num(c.elapsedSec, 0)),
    talkRatio: clamp(num(c.talkRatio, 40), 0, 100),
    checks,
    headline: str(c.headline),
    copilotNotes: str(c.copilotNotes),
  };
}
function normalize(raw) {
  if (!raw || typeof raw !== 'object') raw = {};
  const calls = arr(raw.calls).map(normalizeCall);
  let activeCallId = str(raw.activeCallId);
  if (!calls.some((c) => c.id === activeCallId)) activeCallId = calls.length ? calls[0].id : '';
  return {
    v: 1,
    seenGuide: bool(raw.seenGuide),
    bank: arr(raw.bank).map(normalizeBankQ).filter((q) => q.text.trim()),
    calls,
    activeCallId,
  };
}
function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
    /* corrupt storage — fall through to a clean slate */
  }
  return normalize(null);
}

/* ================================================================== */
/* Scoring                                                             */
/* ================================================================== */

const qCovered = (q) => q.asked || q.notes.trim().length > 0;

function stageCoverage(call) {
  return STAGES.map((s) => {
    const qs = call.questions.filter((q) => q.stage === s.id);
    return { stage: s, total: qs.length, covered: qs.filter(qCovered).length };
  }).filter((r) => r.total > 0);
}
function computeScore(call) {
  const rows = stageCoverage(call);
  const coverage = rows.length ? rows.reduce((a, r) => a + r.covered / r.total, 0) / rows.length : 0;
  const momentum = CHECKS.filter((k) => call.checks[k.id]).length / CHECKS.length;
  const t = call.talkRatio;
  const talk = t <= 45 ? 1 : Math.max(0, 1 - (t - 45) / 40);
  const total = Math.round(100 * (0.45 * coverage + 0.35 * momentum + 0.2 * talk));
  return { coverage, momentum, talk, total, rows };
}
function verdict(total) {
  if (total >= 85) return 'Broadcast quality';
  if (total >= 65) return 'Clear signal';
  if (total >= 40) return 'Static in the mix';
  return 'Dead air';
}

/* ================================================================== */
/* Markdown serializers                                                */
/* ================================================================== */

function bankToMarkdown(bank) {
  const lines = ['# Question rack — Discovery Call Copilot', ''];
  for (const s of STAGES) {
    const qs = bank.filter((q) => q.stage === s.id);
    if (!qs.length) continue;
    lines.push(`## ${s.name} band`);
    for (const q of qs) lines.push(`- **${q.text}**${q.why ? `\n  - _Why it works:_ ${q.why}` : ''}`);
    lines.push('');
  }
  if (lines.length === 2) lines.push('_The rack is empty._');
  return lines.join('\n');
}

function callToMarkdown(call) {
  const sc = computeScore(call);
  const L = [];
  L.push(`# Discovery debrief — ${call.prospect || 'Unnamed prospect'}${call.role ? `, ${call.role}` : ''}${call.company ? ` @ ${call.company}` : ''}`);
  L.push('');
  L.push(`- **Date:** ${call.date}   **Industry:** ${call.industry || '—'}`);
  L.push(`- **Planned:** ${call.plannedMin} min   **On air:** ${fmtClock(call.elapsedSec)}`);
  L.push(`- **Status:** ${call.status === 'done' ? 'Debriefed' : 'In prep'}`);
  L.push(`- **Call goal:** ${call.goal || '—'}`);
  L.push('');
  L.push(`## Signal score — ${sc.total}/100 (${verdict(sc.total)})`);
  L.push('');
  if (sc.rows.length) {
    L.push('| Band | Covered | Coverage |');
    L.push('| --- | --- | --- |');
    for (const r of sc.rows) L.push(`| ${r.stage.name} | ${r.covered}/${r.total} | ${Math.round((100 * r.covered) / r.total)}% |`);
    L.push('');
  }
  L.push(`- Talk ratio (me): ${call.talkRatio}% ${call.talkRatio > 60 ? '(too hot — aim under 45%)' : call.talkRatio <= 45 ? '(healthy)' : '(warm — watch it)'}`);
  for (const k of CHECKS) L.push(`- [${call.checks[k.id] ? 'x' : ' '}] ${k.label}`);
  L.push('');
  if (call.headline.trim()) {
    L.push('## Headline takeaway');
    L.push(call.headline.trim());
    L.push('');
  }
  L.push('## Sheet & notes');
  for (const s of STAGES) {
    const qs = call.questions.filter((q) => q.stage === s.id);
    if (!qs.length) continue;
    L.push('');
    L.push(`### ${s.name}`);
    qs.forEach((q, i) => {
      L.push(`${i + 1}. **${q.text}**${qCovered(q) ? '' : ' _(not asked)_'}`);
      if (q.notes.trim()) for (const ln of q.notes.trim().split('\n')) L.push(`   > ${ln}`);
    });
  }
  if (call.copilotNotes.trim()) {
    L.push('');
    L.push("## Producer's booth — pasted analysis");
    L.push(call.copilotNotes.trim());
  }
  L.push('');
  L.push('_Exported from Discovery Call Copilot._');
  return L.join('\n');
}

/* ================================================================== */
/* Claude Copilot prompts                                              */
/* ================================================================== */

function consoleContextBlock(ctx) {
  if (!ctx) return '';
  const p = ctx.profile || {};
  const c = ctx.claude || {};
  const bits = [];
  if (p.company) bits.push(`- Company: ${p.company}`);
  if (p.offer) bits.push(`- Offer: ${p.offer}`);
  if (p.icp) bits.push(`- ICP: ${p.icp}`);
  if (c.voiceNotes) bits.push(`- Voice notes: ${c.voiceNotes}`);
  if (!bits.length) return '';
  return `## Operator context (from my BD console)\n${bits.join('\n')}\n\n`;
}

function promptIndustryQuestions(state, industry, ctx) {
  const target = industry.trim() || 'my target industry';
  return `You are a discovery-call coach who has trained hundreds of B2B sellers, with a reputation for questions that make prospects say "good question" out loud. You favor short, conversational questions that open stories, never interrogations.

${consoleContextBlock(ctx)}## My current question rack
${bankToMarkdown(state.bank)}

## The ask
Write 12 NEW discovery questions for a prospect in **${target}** — exactly 3 per band:

1. **Situation** — map the current state (process, stack, people, trigger events)
2. **Problem** — where it breaks, workarounds, failed fixes
3. **Impact** — cost in hours/dollars, metrics leadership reads, cost of inaction
4. **Ideal** — the working future state, success metrics, who else benefits

Rules:
- Conversational, one thought per question, no stacked or yes/no questions.
- Use the vocabulary of ${target} (name the roles, systems, and metrics that world uses).
- Do not duplicate or lightly rephrase anything already on my rack.
- Each question gets a one-line "why it works".

## Output format
A markdown table: Band | Question | Why it works.
Then two closing lines: which single question you would open the call with, and why.
If you need more context about my offer to sharpen these, ask me up to 3 questions first.`;
}

function promptGapAnalysis(call, ctx) {
  return `You are a ruthless but constructive sales coach reviewing a discovery-call debrief. Your job is to find what the seller did NOT learn, before the deal punishes them for it.

${consoleContextBlock(ctx)}## The debrief (my real notes)
${callToMarkdown(call)}

## The ask
Audit this call and give me:

1. **Band coverage gaps** — which of Situation / Problem / Impact / Ideal is under-covered, judging by the notes themselves (not just the checkmarks).
2. **Vague answers to reopen** — quote up to 3 of my notes that sound like answers but are actually fog, and say what a real answer would contain.
3. **Missing deal facts** — which of these are still unknown: metrics, economic buyer, decision criteria, decision process, identified pain (quantified), champion, competition.
4. **Risk flags** — anything in the notes that should worry me (single-threading, failed past fixes, timeline mismatch).
5. **Next-touch questions** — exactly 5 questions for the next conversation, each tied to a specific gap above.

## Output format
Markdown with the five numbered sections as headers. Be blunt and specific — quote my notes back at me. If information simply is not in my notes, say so plainly rather than inventing it.`;
}

function promptFollowUp(call, ctx) {
  return `You are a seller writing the same-day follow-up email after a discovery call. Your emails are short, mirror the prospect's own words, and always land one concrete next step. No filler, no "hope you're well".

${consoleContextBlock(ctx)}## The call record
${callToMarkdown(call)}

## The ask
Draft the follow-up email to ${call.prospect || 'the prospect'}${call.company ? ` at ${call.company}` : ''}:

- **3 subject line options**, each 6 words or fewer, no clickbait.
- **The email**, 150 words maximum, plain text:
  - Open with the single most important thing THEY said (quote or close paraphrase from my notes).
  - Restate the quantified pain in one line, in their numbers.
  - One clear call to action that locks the specific next step from my notes (propose a concrete day/time window).
  - Sign off as [My name].
- **One optional P.S.** only if something in the notes genuinely earns it.

## Output format
Subjects as a numbered list, then the email in a fenced block, then the optional P.S.
Only use facts that appear in my notes above — if the next step or a number is missing, flag it instead of inventing it.`;
}

/* ================================================================== */
/* Demo data                                                           */
/* ================================================================== */

function demoState() {
  const B = (stage, text, why) => ({ id: uid(), stage, text, why });
  const bank = [
    B('situation', 'Walk me through how a deal moves from first touch to signed today — who owns each step?', 'Gets the process map in their words and exposes the handoffs.'),
    B('situation', 'What is stitched together in the stack right now — CRM, quoting, reporting?', 'Surfaces integrations and landmines before you pitch anything.'),
    B('situation', 'How many people spend part of their week wrestling with this?', 'Sizes the blast radius early.'),
    B('situation', 'What changed recently that made this worth a meeting?', 'Finds the trigger event — deals need a reason to exist now.'),
    B('problem', 'Where does that process break most often — and what does the workaround look like?', 'Workarounds are pain made visible.'),
    B('problem', 'What have you already tried? What did not stick?', 'Kills the ghosts of failed fixes before they kill your deal.'),
    B('problem', 'When it breaks, who feels it first — and who hears about it last?', 'Maps pain to people; last-to-know is often your real buyer.'),
    B('impact', 'If you had to put a number on a bad month of this — hours or dollars — what would it be?', 'Quantified pain is what funds projects.'),
    B('impact', 'How does this show up in the metrics your CFO actually reads?', 'Translates ops pain into board language.'),
    B('impact', 'If nothing changes by year end, what happens to the team targets?', 'Cost of inaction beats cost of product.'),
    B('impact', 'Which deal did this most recently cost you?', 'A named loss is worth ten hypotheticals.'),
    B('ideal', 'If this worked perfectly, what would Tuesday morning look like for your team?', 'Concrete future state, not a feature wishlist.'),
    B('ideal', 'How would you measure that it is fixed — what number moves?', 'Their success metric becomes your case study.'),
    B('ideal', 'Who else breathes easier when this goes away?', 'Recruits the buying committee for you.'),
  ];
  const pick = (i, notes = '', asked = false) => ({
    id: uid(), bankId: bank[i].id, text: bank[i].text, stage: bank[i].stage, notes, asked,
  });
  const d1 = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
  const call1 = {
    id: uid(),
    prospect: 'Dana Whitfield', role: 'VP Revenue Operations', company: 'Meridian Freight Systems',
    industry: '3PL / freight brokerage',
    goal: 'Qualify the quote-to-cash rebuild; leave with a technical deep-dive booked.',
    date: d1, plannedMin: 30, status: 'done', elapsedSec: 1965, talkRatio: 38,
    checks: { nextStep: true, painQuant: true, process: true, champion: false, budget: false },
    headline: 'Quote turnaround is the bleeding neck — 41 quotes/day at ~22 min each, macro owner leaving in October. Dana is engaged but has not sold it internally yet. Deep-dive booked Thu; must reach the COO before proposing.',
    copilotNotes: "Claude gap audit (pasted): Champion unconfirmed — Dana answers like an owner but nothing in the notes shows her spending internal capital. Budget band never surfaced; the COO's margin plan is the likely funding line, so anchor there. Reopen 'IT review killed the plugin' — who exactly said no, and does that person still hold the pen?",
    questions: [
      pick(0, 'Intake via shared inbox, 3 ops coordinators triage, quotes built by hand in Excel, rate confirmation in the TMS. Dana owns the middle of the funnel, not intake.', true),
      pick(3, 'New COO arrived in May; margin review flagged quoting as the slowest desk in the org.', true),
      pick(4, 'Breaks at re-keying carrier rates. Workaround is a macro one senior analyst maintains — and he leaves in October.', true),
      pick(5, 'Tried a TMS plugin last year. Died in IT review; nobody owned the data mapping. "We got burned."', true),
      pick(7, 'About 22 min per quote, 41 quotes a day. Dana: "call it two full heads just re-typing numbers."', true),
      pick(9, 'Board target is 14% gross margin; sitting at 11.2%. Quoting speed is named in the COO 90-day plan.', true),
      pick(11, 'Quote out the door in under 5 minutes, inbox to send, zero re-keying. Coordinators handle exceptions only.', true),
      pick(13, 'Carrier relations team plus the two coordinators. The CFO, if margin actually moves.', true),
    ],
  };
  const call2 = {
    id: uid(),
    prospect: 'Marcus Bell', role: 'Head of Sales', company: 'Copperline Manufacturing',
    industry: 'Industrial equipment manufacturing',
    goal: 'First discovery — qualify fit for the CPQ pilot; book a plant walk-through.',
    date: todayISO(), plannedMin: 25, status: 'prep', elapsedSec: 0, talkRatio: 40,
    checks: { nextStep: false, painQuant: false, process: false, champion: false, budget: false },
    headline: '', copilotNotes: '',
    questions: [pick(0), pick(3), pick(4), pick(6), pick(7), pick(11)],
  };
  return normalize({ v: 1, seenGuide: true, bank, calls: [call1, call2], activeCallId: call1.id });
}

/* ================================================================== */
/* SVG instruments                                                     */
/* ================================================================== */

const polar = (cx, cy, r, deg) => {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy - r * Math.sin(rad)];
};
const arcPath = (cx, cy, r, a1, a2) => {
  const [x1, y1] = polar(cx, cy, r, a1);
  const [x2, y2] = polar(cx, cy, r, a2);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${Math.abs(a1 - a2) > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

/** Needle VU meter. value 0..1 maps -44deg..44deg from vertical. */
function VUMeter({ value, label = 'VU', live = false, size = 168, redFrom = 0.72 }) {
  const w = size, h = size * 0.62;
  const cx = w / 2, cy = h * 0.94, R = h * 0.78;
  const angFor = (v) => 134 - clamp(v, 0, 1) * 88; // 134deg..46deg (math angles)
  const needleDeg = -44 + clamp(value, 0, 1) * 88; // css rotation from vertical
  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const a = angFor(i / 10);
    const [x1, y1] = polar(cx, cy, R - (i % 5 === 0 ? 10 : 6), a);
    const [x2, y2] = polar(cx, cy, R, a);
    ticks.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i / 10 >= redFrom ? '#c0392b' : '#3d3427'} strokeWidth={i % 5 === 0 ? 1.8 : 1} />);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={`${label} meter at ${Math.round(value * 100)} percent`} className="block">
      <defs>
        <linearGradient id="vuface" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8f2e2" /><stop offset="1" stopColor="#e2d5b4" />
        </linearGradient>
        <linearGradient id="vubezel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9cf8f" /><stop offset="0.55" stopColor="#9d7728" /><stop offset="1" stopColor="#74561d" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width={w - 2} height={h - 2} rx="10" fill="url(#vubezel)" />
      <rect x="4.5" y="4.5" width={w - 9} height={h - 9} rx="7" fill="url(#vuface)" stroke="#74561d" strokeWidth="0.6" />
      <path d={arcPath(cx, cy, R - 3, angFor(redFrom), angFor(1))} fill="none" stroke="#c0392b" strokeWidth="3.4" strokeLinecap="round" />
      {ticks}
      <text x={w * 0.16} y={h * 0.46} fontSize={h * 0.14} fill="#6b5d40" fontFamily="var(--font-mono)">0</text>
      <text x={w * 0.8} y={h * 0.46} fontSize={h * 0.14} fill="#c0392b" fontFamily="var(--font-mono)">100</text>
      <text x={cx} y={h * 0.82} fontSize={h * 0.17} fill="#3d3427" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700">{label}</text>
      <g transform={`translate(${cx} ${cy})`}>
        <g className={live ? 'vu-live' : ''} style={live ? undefined : { transform: `rotate(${needleDeg}deg)`, transition: 'transform 600ms cubic-bezier(0.3, 1.4, 0.4, 1)' }}>
          <line x1="0" y1="6" x2="0" y2={-R + 8} stroke="#20180c" strokeWidth="2" strokeLinecap="round" />
        </g>
        <circle cx="0" cy="0" r="5" fill="url(#vubezel)" stroke="#4d3a12" strokeWidth="1" />
      </g>
      <polygon points={`${w * 0.08},${h * 0.1} ${w * 0.5},${h * 0.06} ${w * 0.3},${h * 0.34}`} fill="#ffffff" opacity="0.14" />
    </svg>
  );
}

/** Signature hero: the discovery console faceplate. */
function ConsoleHero({ live, coverage = 0.62, momentum = 0.4 }) {
  const faders = [0.72, 0.44, 0.86, 0.58];
  return (
    <svg viewBox="0 0 560 168" className="block w-full max-w-[560px]" role="img" aria-label="Studio console faceplate with VU meters, faders and knobs">
      <defs>
        <linearGradient id="heropanel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a3f33" /><stop offset="1" stopColor="#0e2921" />
        </linearGradient>
        <linearGradient id="herobrass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9cf8f" /><stop offset="0.55" stopColor="#9d7728" /><stop offset="1" stopColor="#74561d" />
        </linearGradient>
        <linearGradient id="heroface" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8f2e2" /><stop offset="1" stopColor="#ddcfae" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="556" height="164" rx="14" fill="url(#heropanel)" stroke="url(#herobrass)" strokeWidth="1.6" />
      <rect x="8" y="8" width="544" height="152" rx="10" fill="none" stroke="#0a1f18" strokeWidth="1" opacity="0.8" />
      {[[16, 16], [544, 16], [16, 152], [544, 152]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="4.4" fill="url(#herobrass)" stroke="#4d3a12" strokeWidth="0.8" />
          <line x1={x - 2.4} y1={y} x2={x + 2.4} y2={y} stroke="#3a2b0d" strokeWidth="1" transform={`rotate(${i * 40} ${x} ${y})`} />
        </g>
      ))}
      {[0, 1].map((m) => {
        const bx = 30 + m * 158, by = 26, bw = 142, bh = 84;
        const cx = bx + bw / 2, cy = by + bh - 8, R = 58;
        const val = m === 0 ? coverage : momentum;
        const needleDeg = -44 + clamp(val, 0, 1) * 88;
        const angFor = (v) => 134 - clamp(v, 0, 1) * 88;
        const ticks = [];
        for (let i = 0; i <= 10; i++) {
          const a = angFor(i / 10);
          const [x1, y1] = polar(cx, cy, R - (i % 5 === 0 ? 9 : 5), a);
          const [x2, y2] = polar(cx, cy, R, a);
          ticks.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i >= 8 ? '#c0392b' : '#3d3427'} strokeWidth={i % 5 === 0 ? 1.6 : 0.9} />);
        }
        return (
          <g key={m}>
            <rect x={bx - 4} y={by - 4} width={bw + 8} height={bh + 8} rx="8" fill="url(#herobrass)" />
            <rect x={bx} y={by} width={bw} height={bh} rx="5" fill="url(#heroface)" stroke="#74561d" strokeWidth="0.6" />
            <path d={arcPath(cx, cy, R - 2.5, angFor(0.8), angFor(1))} fill="none" stroke="#c0392b" strokeWidth="3" strokeLinecap="round" />
            {ticks}
            <text x={cx} y={by + bh - 14} fontSize="11" fill="#3d3427" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700">
              {m === 0 ? 'COVERAGE' : 'MOMENTUM'}
            </text>
            <g transform={`translate(${cx} ${cy})`}>
              <g className={live ? 'vu-live' : ''} style={live ? undefined : { transform: `rotate(${needleDeg}deg)` }}>
                <line x1="0" y1="4" x2="0" y2={-R + 7} stroke="#20180c" strokeWidth="1.8" strokeLinecap="round" />
              </g>
              <circle r="4" fill="url(#herobrass)" stroke="#4d3a12" strokeWidth="0.8" />
            </g>
            <polygon points={`${bx + 8},${by + 6} ${bx + 74},${by + 4} ${bx + 30},${by + 30}`} fill="#fff" opacity="0.13" />
          </g>
        );
      })}
      <g>
        <rect x="352" y="26" width="120" height="40" rx="7" fill={live ? '#d63b26' : '#2a0d09'} stroke="url(#herobrass)" strokeWidth="1.4" />
        {live && <rect x="352" y="26" width="120" height="40" rx="7" fill="#ff8a76" opacity="0.35" />}
        <text x="412" y="52" fontSize="19" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="900" letterSpacing="3"
          fill={live ? '#fff4ec' : '#6b2318'}>ON AIR</text>
      </g>
      {STAGES.map((s, i) => {
        const x = 352 + i * 32;
        const level = faders[i];
        return (
          <g key={s.id}>
            <circle cx={x + 8} cy={82} r="2.6" fill={s.color} />
            <rect x={x + 6.6} y={90} width="2.8" height="56" rx="1.4" fill="#0a1f18" stroke="#000" strokeWidth="0.4" />
            <rect x={x} y={90 + (1 - level) * 40} width="16" height="10" rx="2" fill="url(#herobrass)" stroke="#4d3a12" strokeWidth="0.7" />
          </g>
        );
      })}
      {[0, 1].map((i) => {
        const x = 502 + i * 0, y = 42 + i * 62;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle r="15" fill="url(#herobrass)" stroke="#4d3a12" strokeWidth="1" />
            <circle r="10.5" fill="#1a3f33" stroke="#0a1f18" strokeWidth="0.8" />
            <line x1="0" y1="-3" x2="0" y2="-9.5" stroke="#e9cf8f" strokeWidth="1.8" transform={`rotate(${i ? 52 : -34})`} strokeLinecap="round" />
          </g>
        );
      })}
      <text x="30" y="146" fontSize="9" fill="#c49a42" fontFamily="var(--font-mono)" letterSpacing="2" opacity="0.85">DCC-3 · DISCOVERY CONSOLE · 4-BAND</text>
      <line x1="30" y1="126" x2="316" y2="126" stroke="#c49a42" strokeWidth="0.6" opacity="0.4" />
      {STAGES.map((s, i) => (
        <g key={s.id}>
          <circle cx={44 + i * 72} cy={126} r="3" fill={s.color} stroke="#0a1f18" strokeWidth="0.6" />
          <text x={54 + i * 72} y={129} fontSize="8.5" fill="#cabb95" fontFamily="var(--font-mono)">{s.freq}</text>
        </g>
      ))}
    </svg>
  );
}

/** Half-circle signal-score gauge, 0..100. */
function ScoreDial({ score }) {
  const w = 240, h = 148, cx = w / 2, cy = 126, R = 96;
  const angFor = (v) => 180 - clamp(v, 0, 100) * 1.8;
  const zones = [
    [0, 40, '#c0392b'], [40, 65, '#d9a441'], [65, 85, '#5f8f5a'], [85, 100, '#c49a42'],
  ];
  const ticks = [];
  for (let v = 0; v <= 100; v += 5) {
    const major = v % 25 === 0;
    const edge = v === 0 || v === 100;
    const a = angFor(v);
    const [x1, y1] = polar(cx, cy, R - (edge ? 16 : major ? 12 : 7), a);
    const [x2, y2] = polar(cx, cy, R, a);
    ticks.push(<line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#efe6cd" strokeWidth={edge ? 2.6 : major ? 1.8 : 0.9} opacity={major ? 0.95 : 0.55} />);
    if (major) {
      const [tx, ty] = polar(cx, cy, R - 26, a);
      ticks.push(<text key={`t${v}`} x={tx} y={ty + 3} fontSize="10" textAnchor="middle" fill="#cabb95" fontFamily="var(--font-mono)">{v}</text>);
    }
  }
  const needle = angFor(score);
  const [nx, ny] = polar(cx, cy, R - 20, needle);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={`Signal score ${score} out of 100`} className="block">
      <defs>
        <linearGradient id="dialbrass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9cf8f" /><stop offset="0.6" stopColor="#9d7728" /><stop offset="1" stopColor="#74561d" />
        </linearGradient>
      </defs>
      {zones.map(([a, b, col]) => (
        <path key={a} d={arcPath(cx, cy, R + 6, angFor(a), angFor(b))} fill="none" stroke={col} strokeWidth="5" strokeLinecap="butt" opacity="0.9" />
      ))}
      <path d={arcPath(cx, cy, R + 12, 180, 0)} fill="none" stroke="url(#dialbrass)" strokeWidth="2" />
      {ticks}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#f8f2e2" strokeWidth="2.4" strokeLinecap="round" style={{ transition: 'all 500ms ease' }} />
      <circle cx={cx} cy={cy} r="7" fill="url(#dialbrass)" stroke="#4d3a12" strokeWidth="1.2" />
      <text x={cx} y={cy - 26} fontSize="34" textAnchor="middle" fill="#f8f2e2" fontFamily="var(--font-display)" fontWeight="900">{score}</text>
      <text x={cx} y={cy - 8} fontSize="10" textAnchor="middle" fill="#cabb95" fontFamily="var(--font-mono)" letterSpacing="1.5">/ 100</text>
    </svg>
  );
}

function CoverageBar({ row }) {
  const pct = row.total ? row.covered / row.total : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs font-semibold tracking-wide" style={{ color: row.stage.color }}>{row.stage.name}</span>
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="h-3 w-full" role="img" aria-label={`${row.stage.name} coverage ${Math.round(pct * 100)} percent`}>
        <rect x="0" y="2" width="100" height="6" rx="3" fill="#0a1f18" stroke="#74561d" strokeWidth="0.5" />
        <rect x="0" y="2" width={Math.max(1.5, pct * 100)} height="6" rx="3" fill={row.stage.color} />
        {[25, 50, 75].map((t) => <line key={t} x1={t} y1="1" x2={t} y2="9" stroke="#0e2921" strokeWidth="0.8" />)}
      </svg>
      <span className="w-10 shrink-0 text-right font-mono text-xs text-cream-300">{row.covered}/{row.total}</span>
    </div>
  );
}

/* ================================================================== */
/* UI atoms                                                            */
/* ================================================================== */

function OnAirLamp({ live, small = false }) {
  return (
    <div className={`onair-lamp ${live ? 'is-live' : ''} ${small ? 'rounded-md px-2.5 py-1' : 'rounded-lg px-4 py-1.5'} select-none`}
      role="status" aria-label={live ? 'On air' : 'Off air'}>
      <span className={`font-display font-black tracking-[0.28em] ${small ? 'text-[10px]' : 'text-sm'} ${live ? 'text-[#fff4ec]' : 'text-[#6b2318]'}`}>ON AIR</span>
    </div>
  );
}

function StageChip({ stage, dim = false }) {
  const s = stageMeta(stage);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${dim ? 'opacity-70' : ''}`}
      style={{ borderColor: s.color, color: s.color }}>
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
      {s.name}
      <span className="font-mono opacity-70">{s.freq}</span>
    </span>
  );
}

function GhostBtn({ children, onClick, label, className = '', disabled = false }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-md border border-brass-600/50 bg-felt-800/70 px-2.5 py-1.5 text-xs font-semibold text-cream-100 transition hover:border-brass-400 hover:bg-felt-700 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}>
      {children}
    </button>
  );
}

function IconBtn({ children, onClick, label, className = '', disabled = false }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} disabled={disabled}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-cream-300 transition hover:border-brass-600/60 hover:bg-felt-700 hover:text-brass-300 disabled:cursor-not-allowed disabled:opacity-30 ${className}`}>
      {children}
    </button>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-brass-400">{label}</span>
      {children}
    </label>
  );
}
const inputCls = 'w-full rounded-md border border-brass-700/60 bg-felt-900/80 px-2.5 py-1.5 text-sm text-cream-50 placeholder:text-cream-400/50 focus:border-brass-400';

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-[2px]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`modal-in brass-edge relative mt-[4vh] w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-2xl bg-felt-850 shadow-console`}>
        <div className="pinstripe flex items-center justify-between rounded-t-2xl border-b border-brass-700/50 bg-felt-800 px-5 py-3">
          <h2 className="font-display text-lg font-bold text-brass-300">{title}</h2>
          <IconBtn label="Close dialog" onClick={onClose}><X className="h-4 w-4" aria-hidden /></IconBtn>
        </div>
        <div className="max-h-[74vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, body, children }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-brass-700/50 bg-felt-900/50 px-6 py-10 text-center">
      <Icon className="h-8 w-8 text-brass-500" aria-hidden />
      <p className="font-display text-base font-bold text-cream-100">{title}</p>
      <p className="max-w-sm text-xs leading-relaxed text-cream-300">{body}</p>
      {children}
    </div>
  );
}

/* ================================================================== */
/* App                                                                 */
/* ================================================================== */

export default function App() {
  const [state, setState] = useState(loadState);
  const [view, setView] = useState('studio'); // studio | live | debrief
  const [modal, setModal] = useState(null); // 'help' | 'export' | 'reset' | {type:'question', q}
  const [toasts, setToasts] = useState([]);
  const [running, setRunning] = useState(false);
  const [liveIdx, setLiveIdx] = useState(0);
  const [bankFilter, setBankFilter] = useState('all');
  const [bankSearch, setBankSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [dropHot, setDropHot] = useState(false);
  const [consoleCtx, setConsoleCtx] = useState(null);
  const fileRef = useRef(null);
  const toastIdRef = useRef(0);

  const activeCall = state.calls.find((c) => c.id === state.activeCallId) || null;
  const score = activeCall ? computeScore(activeCall) : null;

  /* ---- persistence ---- */
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage full/unavailable */ }
    }, 350);
    return () => clearTimeout(t);
  }, [state]);

  /* ---- first-visit guide ---- */
  useEffect(() => {
    if (!state.seenGuide) {
      setModal('help');
      setState((s) => ({ ...s, seenGuide: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- console bus (optional host) ---- */
  useEffect(() => {
    if (window.parent === window) return;
    const onMsg = (e) => {
      const d = e.data;
      if (d && d.bizdev === 'context' && d.v === 1) setConsoleCtx(d.connectors || null);
    };
    window.addEventListener('message', onMsg);
    try { window.parent.postMessage({ bizdev: 'ready', v: 1, slug: SLUG }, '*'); } catch { /* sandboxed host */ }
    return () => window.removeEventListener('message', onMsg);
  }, []);

  /* ---- live timer ---- */
  useEffect(() => {
    if (view !== 'live' || !running || !state.activeCallId) return;
    const id = state.activeCallId;
    const t = setInterval(() => {
      setState((s) => ({ ...s, calls: s.calls.map((c) => (c.id === id ? { ...c, elapsedSec: (c.elapsedSec || 0) + 1 } : c)) }));
    }, 1000);
    return () => clearInterval(t);
  }, [view, running, state.activeCallId]);

  /* ---- toasts ---- */
  const pushToast = (text, undo) => {
    const id = ++toastIdRef.current;
    setToasts((ts) => [...ts.slice(-2), { id, text, undo }]);
    window.setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 7000);
  };
  const dismissToast = (id) => setToasts((ts) => ts.filter((t) => t.id !== id));

  /* ---- clipboard ---- */
  async function copyText(text, key, okMsg) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch { ok = false; }
    if (!ok) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); ok = true;
      } catch { ok = false; }
    }
    if (key) { setCopiedKey(key); window.setTimeout(() => setCopiedKey((k) => (k === key ? '' : k)), 1800); }
    if (okMsg) pushToast(ok ? okMsg : 'Copy failed — select and copy manually.');
    return ok;
  }

  /* ---- state mutators ---- */
  const updateCall = (id, fn) => setState((s) => ({ ...s, calls: s.calls.map((c) => (c.id === id ? normalizeCall(fn(c)) : c)) }));
  const updateActive = (fn) => { if (activeCall) updateCall(activeCall.id, fn); };

  function saveBankQuestion(q) {
    setState((s) => {
      const exists = s.bank.some((b) => b.id === q.id);
      return { ...s, bank: exists ? s.bank.map((b) => (b.id === q.id ? q : b)) : [...s.bank, q] };
    });
  }
  function deleteBankQuestion(id) {
    const idx = state.bank.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const removed = state.bank[idx];
    setState((s) => ({ ...s, bank: s.bank.filter((b) => b.id !== id) }));
    pushToast('Question pulled from the rack.', () =>
      setState((s) => {
        const bank = [...s.bank]; bank.splice(Math.min(idx, bank.length), 0, removed);
        return { ...s, bank };
      }));
  }

  function newCall() {
    const c = normalizeCall({ id: uid(), date: todayISO() });
    setState((s) => ({ ...s, calls: [...s.calls, c], activeCallId: c.id }));
    setView('studio');
  }
  function deleteCall(id) {
    const idx = state.calls.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const removed = state.calls[idx];
    setState((s) => {
      const calls = s.calls.filter((c) => c.id !== id);
      return { ...s, calls, activeCallId: s.activeCallId === id ? (calls[0]?.id || '') : s.activeCallId };
    });
    pushToast(`Run sheet for ${removed.prospect || 'unnamed prospect'} struck.`, () =>
      setState((s) => {
        const calls = [...s.calls]; calls.splice(Math.min(idx, calls.length), 0, removed);
        return { ...s, calls, activeCallId: removed.id };
      }));
  }

  function ensureActiveCall() {
    if (activeCall) return activeCall.id;
    const c = normalizeCall({ id: uid(), date: todayISO() });
    setState((s) => ({ ...s, calls: [...s.calls, c], activeCallId: c.id }));
    return c.id;
  }
  function addToSheet(bankId, atIdx = null) {
    const q = state.bank.find((b) => b.id === bankId);
    if (!q) return;
    const callId = ensureActiveCall();
    setState((s) => ({
      ...s,
      calls: s.calls.map((c) => {
        if (c.id !== callId) return c;
        const item = { id: uid(), bankId: q.id, text: q.text, stage: q.stage, notes: '', asked: false };
        const questions = [...c.questions];
        questions.splice(atIdx == null ? questions.length : clamp(atIdx, 0, questions.length), 0, item);
        return { ...c, questions };
      }),
    }));
  }
  function removeFromSheet(qid) {
    if (!activeCall) return;
    const idx = activeCall.questions.findIndex((q) => q.id === qid);
    if (idx < 0) return;
    const removed = activeCall.questions[idx];
    const callId = activeCall.id;
    updateCall(callId, (c) => ({ ...c, questions: c.questions.filter((q) => q.id !== qid) }));
    pushToast('Question cut from the run sheet.', () =>
      updateCall(callId, (c) => {
        const questions = [...c.questions]; questions.splice(Math.min(idx, questions.length), 0, removed);
        return { ...c, questions };
      }));
  }
  function moveInSheet(idx, dir) {
    updateActive((c) => {
      const j = idx + dir;
      if (j < 0 || j >= c.questions.length) return c;
      const questions = [...c.questions];
      [questions[idx], questions[j]] = [questions[j], questions[idx]];
      return { ...c, questions };
    });
  }
  function reorderSheet(from, to) {
    updateActive((c) => {
      const questions = [...c.questions];
      const [item] = questions.splice(from, 1);
      questions.splice(clamp(to, 0, questions.length), 0, item);
      return { ...c, questions };
    });
  }
  function handleSheetDrop(e, targetIdx = null) {
    e.preventDefault();
    setDropHot(false);
    const data = e.dataTransfer.getData('text/plain') || '';
    if (data.startsWith('bank:')) addToSheet(data.slice(5), targetIdx);
    else if (data.startsWith('sheet:')) {
      const from = parseInt(data.slice(6), 10);
      if (!Number.isNaN(from) && activeCall) reorderSheet(from, targetIdx == null ? activeCall.questions.length : targetIdx);
    }
  }

  /* ---- live mode ---- */
  function goLive() {
    if (!activeCall || !activeCall.questions.length) return;
    const firstOpen = activeCall.questions.findIndex((q) => !qCovered(q));
    setLiveIdx(firstOpen >= 0 ? firstOpen : 0);
    setRunning(true);
    setView('live');
  }
  function markAskedThenMove(dir) {
    if (!activeCall) return;
    const q = activeCall.questions[clamp(liveIdx, 0, activeCall.questions.length - 1)];
    if (q && q.notes.trim() && !q.asked) {
      updateActive((c) => ({ ...c, questions: c.questions.map((x) => (x.id === q.id ? { ...x, asked: true } : x)) }));
    }
    setLiveIdx((i) => clamp(i + dir, 0, Math.max(0, (activeCall?.questions.length || 1) - 1)));
  }
  function toggleAskedCurrent() {
    if (!activeCall) return;
    const q = activeCall.questions[clamp(liveIdx, 0, activeCall.questions.length - 1)];
    if (q) updateActive((c) => ({ ...c, questions: c.questions.map((x) => (x.id === q.id ? { ...x, asked: !x.asked } : x)) }));
  }
  function endLive() {
    setRunning(false);
    updateActive((c) => ({ ...c, status: 'done' }));
    setView('debrief');
  }

  /* ---- exports ---- */
  const mainArtifact = () => (activeCall ? callToMarkdown(activeCall) : bankToMarkdown(state.bank));
  const copyMarkdown = () => copyText(mainArtifact(), 'md', activeCall ? 'Debrief markdown copied to clipboard.' : 'Question rack markdown copied.');
  function downloadFile(name, mime, content) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
  const downloadJSON = () => downloadFile(`discovery-call-copilot-${todayISO()}.json`, 'application/json', JSON.stringify(state, null, 2));
  function downloadCSV() {
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [['band', 'question', 'why_it_works'], ...state.bank.map((q) => [stageMeta(q.stage).name, q.text, q.why])];
    downloadFile(`question-rack-${todayISO()}.csv`, 'text/csv', rows.map((r) => r.map(esc).join(',')).join('\n'));
  }
  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = normalize(JSON.parse(String(reader.result)));
        const prev = state;
        setState({ ...next, seenGuide: true });
        setModal(null);
        pushToast('Session tape imported.', () => setState(prev));
      } catch {
        pushToast('That file did not parse as a session JSON.');
      }
    };
    reader.readAsText(file);
  }
  function loadDemo() {
    const prev = state;
    setState(demoState());
    setView('studio');
    pushToast('Demo loaded — the Meridian Freight debrief is on the deck.', () => setState(prev));
  }
  function doReset() {
    setState(normalize({ seenGuide: true }));
    setView('studio');
    setModal(null);
    pushToast('Console wiped. Fresh felt.');
  }

  /* ---- keyboard ---- */
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (e.key === 'Escape') {
        if (modal) { setModal(null); return; }
        if (view === 'live') { setRunning(false); setView('studio'); }
        return;
      }
      if (typing) return;
      if (e.key === '?') { e.preventDefault(); setModal((m) => (m === 'help' ? null : 'help')); return; }
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); copyMarkdown(); return; }
      if (view === 'live' && activeCall) {
        if (e.key === 'ArrowRight') { e.preventDefault(); markAskedThenMove(1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); markAskedThenMove(-1); }
        else if (e.key === ' ') { e.preventDefault(); setRunning((r) => !r); }
        else if (e.key === 'a' || e.key === 'A') { e.preventDefault(); toggleAskedCurrent(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* ---- derived: bank list ---- */
  const filteredBank = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    return state.bank.filter((b) =>
      (bankFilter === 'all' || b.stage === bankFilter) &&
      (!q || b.text.toLowerCase().includes(q) || b.why.toLowerCase().includes(q)));
  }, [state.bank, bankFilter, bankSearch]);

  const liveQ = activeCall && activeCall.questions.length
    ? activeCall.questions[clamp(liveIdx, 0, activeCall.questions.length - 1)]
    : null;
  const overTime = activeCall ? activeCall.elapsedSec > activeCall.plannedMin * 60 : false;

  const copilotDisabled = !activeCall;

  /* ================================================================ */

  return (
    <>
      <div className="felt-grain" aria-hidden />
      <div className="app-chrome relative z-10 mx-auto max-w-6xl px-3 pb-24 pt-4 sm:px-5">

        {/* ============ Header ============ */}
        <header className="brass-edge pinstripe relative overflow-hidden rounded-2xl bg-felt-800 shadow-console">
          <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 44 44" className="h-11 w-11 shrink-0" role="img" aria-label="Discovery Call Copilot mark">
                  <defs>
                    <linearGradient id="markbrass" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#e9cf8f" /><stop offset="1" stopColor="#9d7728" />
                    </linearGradient>
                  </defs>
                  <circle cx="22" cy="22" r="20" fill="#0e2921" stroke="url(#markbrass)" strokeWidth="2" />
                  <rect x="17" y="10" width="10" height="16" rx="5" fill="url(#markbrass)" />
                  <path d="M 13 22 a 9 9 0 0 0 18 0" fill="none" stroke="#e9cf8f" strokeWidth="2" strokeLinecap="round" />
                  <line x1="22" y1="31" x2="22" y2="35" stroke="#e9cf8f" strokeWidth="2" strokeLinecap="round" />
                  <path d="M 31 13 a 12 12 0 0 1 3 6" fill="none" stroke="#d9b565" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
                  <path d="M 34 10 a 16 16 0 0 1 4 8" fill="none" stroke="#d9b565" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
                </svg>
                <div className="min-w-0">
                  <h1 className="brass-text font-display text-2xl font-black leading-tight sm:text-3xl">Discovery Call Copilot</h1>
                  <p className="text-xs text-cream-300 sm:text-sm">Run discovery like a broadcast — scripted, timed, scored.</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <GhostBtn onClick={loadDemo} label="Load demo scenario"><Disc3 className="h-3.5 w-3.5" aria-hidden />Load demo</GhostBtn>
                <GhostBtn onClick={() => setModal('reset')} label="Reset all data"><RotateCcw className="h-3.5 w-3.5" aria-hidden />Reset</GhostBtn>
                <GhostBtn onClick={() => setModal('help')} label="How to use"><HelpCircle className="h-3.5 w-3.5" aria-hidden />How to use</GhostBtn>
                <button type="button" onClick={() => setModal('export')}
                  className="btn-brass inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold">
                  <Download className="h-3.5 w-3.5" aria-hidden />Export
                </button>
                {consoleCtx && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-brass-600/50 px-2 py-0.5 text-[10px] font-semibold text-brass-300">
                    <Antenna className="h-3 w-3" aria-hidden />Console linked
                  </span>
                )}
              </div>
            </div>
            <div className="hidden shrink-0 items-center gap-4 md:flex lg:w-[46%]">
              <ConsoleHero live={view === 'live' && running} coverage={score ? score.coverage : 0.62} momentum={score ? score.momentum : 0.4} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-brass-700/40 bg-felt-900/60 px-4 py-2 sm:px-5">
            <div className="flex items-center gap-2 text-[11px] text-cream-300">
              <Headphones className="h-3.5 w-3.5 text-brass-400" aria-hidden />
              <span className="font-mono">{state.bank.length} questions racked · {state.calls.length} run sheet{state.calls.length === 1 ? '' : 's'}</span>
            </div>
            <OnAirLamp live={view === 'live' && running} small />
          </div>
        </header>

        {/* ============ Cartridge row: run sheets ============ */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
          {state.calls.map((c) => {
            const sc = computeScore(c);
            const active = c.id === state.activeCallId;
            return (
              <div key={c.id} className={`group relative flex shrink-0 items-stretch overflow-hidden rounded-lg border transition ${active ? 'border-brass-400 bg-felt-700 shadow-plate' : 'border-brass-700/40 bg-felt-800/70 hover:border-brass-500'}`}>
                <button type="button" onClick={() => { setState((s) => ({ ...s, activeCallId: c.id })); if (view === 'live') setView('studio'); }}
                  aria-pressed={active} className="flex items-center gap-2.5 px-3 py-2 text-left">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${c.status === 'done' ? 'bg-stg-ideal' : 'bg-stg-situation'}`}
                    title={c.status === 'done' ? 'Debriefed' : 'In prep'} />
                  <span className="min-w-0">
                    <span className="block max-w-40 truncate text-xs font-bold text-cream-50">{c.prospect || 'Unnamed prospect'}</span>
                    <span className="block max-w-40 truncate text-[10px] text-cream-300">{c.company || 'No company yet'}</span>
                  </span>
                  {c.status === 'done' && <span className="ml-1 font-mono text-[10px] font-semibold text-brass-300">{sc.total}</span>}
                </button>
                <button type="button" onClick={() => deleteCall(c.id)} aria-label={`Delete run sheet for ${c.prospect || 'unnamed prospect'}`}
                  className="flex items-center border-l border-brass-700/30 px-1.5 text-cream-400 opacity-0 transition hover:text-onair-400 focus-visible:opacity-100 group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            );
          })}
          <button type="button" onClick={newCall}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-brass-600/60 px-3 py-2 text-xs font-semibold text-brass-300 transition hover:border-brass-400 hover:bg-felt-800">
            <Plus className="h-3.5 w-3.5" aria-hidden />New run sheet
          </button>
          {activeCall && view !== 'live' && (
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <GhostBtn onClick={() => setView('studio')} label="Prep studio view" className={view === 'studio' ? 'border-brass-400 bg-felt-700' : ''}>
                <ListChecks className="h-3.5 w-3.5" aria-hidden />Prep
              </GhostBtn>
              <GhostBtn onClick={() => setView('debrief')} label="Debrief view" className={view === 'debrief' ? 'border-brass-400 bg-felt-700' : ''}>
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden />Debrief
              </GhostBtn>
            </div>
          )}
        </div>

        {/* ============ LIVE VIEW ============ */}
        {view === 'live' && activeCall && (
          <section className="mt-4">
            <div className="brass-edge rounded-2xl bg-felt-850 shadow-console">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brass-700/40 bg-felt-800 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-3">
                  <OnAirLamp live={running} />
                  <div>
                    <p className="text-sm font-bold text-cream-50">{activeCall.prospect || 'Unnamed prospect'}{activeCall.company ? ` · ${activeCall.company}` : ''}</p>
                    <p className="text-[11px] text-cream-300">{activeCall.goal || 'No call goal set — dangerous territory.'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg border px-3 py-1.5 font-mono text-xl font-semibold tabular-nums ${overTime ? 'border-onair-400 text-onair-300' : 'border-brass-600/60 text-brass-200'}`}
                    role="timer" aria-label="Elapsed call time">
                    {fmtClock(activeCall.elapsedSec)}
                    <span className="ml-1 text-[10px] text-cream-400">/ {activeCall.plannedMin}:00</span>
                  </div>
                  <IconBtn label={running ? 'Pause timer' : 'Resume timer'} onClick={() => setRunning((r) => !r)} className="h-9 w-9 border-brass-600/60">
                    {running ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
                  </IconBtn>
                  <button type="button" onClick={endLive}
                    className="btn-brass inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold">
                    <Square className="h-3.5 w-3.5" aria-hidden />Off air → debrief
                  </button>
                </div>
              </div>

              {liveQ ? (
                <div className="px-4 py-6 sm:px-8 sm:py-8">
                  <div className="flex items-center justify-between gap-3">
                    <StageChip stage={liveQ.stage} />
                    <span className="font-mono text-xs text-cream-300">Q {clamp(liveIdx, 0, activeCall.questions.length - 1) + 1} / {activeCall.questions.length}</span>
                  </div>
                  <p className="mt-4 font-display text-2xl font-bold leading-snug text-cream-50 sm:text-4xl">{liveQ.text}</p>
                  <p className="mt-2 text-xs italic text-brass-300">{stageMeta(liveQ.stage).hint}</p>
                  <textarea
                    value={liveQ.notes}
                    onChange={(e) => updateActive((c) => ({ ...c, questions: c.questions.map((x) => (x.id === liveQ.id ? { ...x, notes: e.target.value } : x)) }))}
                    placeholder="Type what they say — their words, their numbers. Notes here mark the question covered."
                    rows={5}
                    aria-label="Notes for the current question"
                    className="mt-5 w-full rounded-xl border border-brass-700/60 bg-felt-900/80 p-4 text-base leading-relaxed text-cream-50 placeholder:text-cream-400/50 focus:border-brass-400"
                  />
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <GhostBtn onClick={() => markAskedThenMove(-1)} label="Previous question" disabled={liveIdx <= 0}>
                        <SkipBack className="h-3.5 w-3.5" aria-hidden />Prev
                      </GhostBtn>
                      <GhostBtn onClick={() => markAskedThenMove(1)} label="Next question" disabled={liveIdx >= activeCall.questions.length - 1}>
                        Next<SkipForward className="h-3.5 w-3.5" aria-hidden />
                      </GhostBtn>
                      <GhostBtn onClick={toggleAskedCurrent} label="Toggle asked on current question" className={liveQ.asked ? 'border-stg-ideal text-stg-ideal' : ''}>
                        <Check className="h-3.5 w-3.5" aria-hidden />{liveQ.asked ? 'Asked' : 'Mark asked'}
                      </GhostBtn>
                    </div>
                    <p className="font-mono text-[10px] text-cream-400">← → move · Space pause · A asked · Esc off air</p>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-1.5" aria-label="Question queue">
                    {activeCall.questions.map((q, i) => (
                      <button key={q.id} type="button" onClick={() => setLiveIdx(i)} aria-label={`Jump to question ${i + 1}`}
                        className={`h-3 w-3 rounded-full border transition ${i === clamp(liveIdx, 0, activeCall.questions.length - 1) ? 'scale-125 border-cream-50' : 'border-transparent'}`}
                        style={{ background: qCovered(q) ? stageMeta(q.stage).color : 'transparent', borderColor: i === clamp(liveIdx, 0, activeCall.questions.length - 1) ? '#f8f2e2' : stageMeta(q.stage).color }} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <EmptyState icon={Mic} title="Nothing on the run sheet"
                    body="Go back to the studio and drag questions onto this call before going on air." />
                </div>
              )}
            </div>
          </section>
        )}

        {/* ============ STUDIO VIEW ============ */}
        {view === 'studio' && (
          <section className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* --- Question Rack --- */}
            <div className="brass-edge flex flex-col rounded-2xl bg-felt-850 shadow-console">
              <div className="pinstripe flex items-center justify-between rounded-t-2xl border-b border-brass-700/40 bg-felt-800 px-4 py-3">
                <h2 className="font-display text-lg font-bold text-brass-300">Question Rack</h2>
                <GhostBtn onClick={() => setModal({ type: 'question', q: { id: uid(), text: '', stage: bankFilter === 'all' ? 'situation' : bankFilter, why: '' }, isNew: true })} label="Add a question to the rack">
                  <Plus className="h-3.5 w-3.5" aria-hidden />New question
                </GhostBtn>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-b border-brass-700/30 px-4 py-2.5">
                <div className="relative min-w-36 flex-1">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cream-400" aria-hidden />
                  <input value={bankSearch} onChange={(e) => setBankSearch(e.target.value)} placeholder="Search the rack…"
                    aria-label="Search questions" className={`${inputCls} pl-7`} />
                </div>
                <div className="flex items-center gap-1" role="group" aria-label="Filter by band">
                  <button type="button" onClick={() => setBankFilter('all')} aria-pressed={bankFilter === 'all'}
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${bankFilter === 'all' ? 'border-brass-300 text-brass-200' : 'border-brass-700/50 text-cream-300 hover:border-brass-500'}`}>All</button>
                  {STAGES.map((s) => (
                    <button key={s.id} type="button" onClick={() => setBankFilter(bankFilter === s.id ? 'all' : s.id)} aria-pressed={bankFilter === s.id}
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${bankFilter === s.id ? '' : 'opacity-60 hover:opacity-100'}`}
                      style={{ borderColor: s.color, color: s.color }}>{s.name}</button>
                  ))}
                </div>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-3" style={{ maxHeight: '30rem' }}>
                {state.bank.length === 0 ? (
                  <EmptyState icon={Mic} title="The rack is empty"
                    body="Every great interviewer works from a rack of proven questions. Load the demo to see a full 4-band rack, or write your first question now.">
                    <div className="mt-2 flex gap-2">
                      <GhostBtn onClick={loadDemo} label="Load demo"><Disc3 className="h-3.5 w-3.5" aria-hidden />Load demo</GhostBtn>
                      <GhostBtn onClick={() => setModal({ type: 'question', q: { id: uid(), text: '', stage: 'situation', why: '' }, isNew: true })} label="Write first question">
                        <Plus className="h-3.5 w-3.5" aria-hidden />Write one
                      </GhostBtn>
                    </div>
                  </EmptyState>
                ) : filteredBank.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-cream-300">No questions match that filter. Clear the search or pick another band.</p>
                ) : (
                  filteredBank.map((q) => (
                    <div key={q.id} draggable
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', `bank:${q.id}`); e.dataTransfer.effectAllowed = 'copyMove'; }}
                      className="group rounded-lg border border-brass-700/40 bg-felt-800/80 p-2.5 shadow-plate transition hover:border-brass-500"
                      style={{ borderLeftWidth: 3, borderLeftColor: stageMeta(q.stage).color }}>
                      <div className="flex items-start gap-2">
                        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-cream-400/60" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug text-cream-50">{q.text}</p>
                          {q.why && <p className="mt-1 text-[11px] italic text-cream-300">{q.why}</p>}
                          <div className="mt-1.5"><StageChip stage={q.stage} dim /></div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-0.5 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
                          <IconBtn label="Add to run sheet" onClick={() => addToSheet(q.id)}><Plus className="h-3.5 w-3.5" aria-hidden /></IconBtn>
                          <IconBtn label="Edit question" onClick={() => setModal({ type: 'question', q: { ...q } })}><Pencil className="h-3.5 w-3.5" aria-hidden /></IconBtn>
                          <IconBtn label="Delete question" onClick={() => deleteBankQuestion(q.id)}><Trash2 className="h-3.5 w-3.5" aria-hidden /></IconBtn>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* --- Run Sheet --- */}
            <div className="brass-edge flex flex-col rounded-2xl bg-felt-850 shadow-console">
              <div className="pinstripe flex items-center justify-between rounded-t-2xl border-b border-brass-700/40 bg-felt-800 px-4 py-3">
                <h2 className="font-display text-lg font-bold text-brass-300">Run Sheet</h2>
                {activeCall && (
                  <button type="button" onClick={goLive} disabled={!activeCall.questions.length}
                    className="btn-brass inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40">
                    <Radio className="h-3.5 w-3.5" aria-hidden />Go on air
                  </button>
                )}
              </div>
              {!activeCall ? (
                <div className="p-4">
                  <EmptyState icon={StickyNote} title="No run sheet on the deck"
                    body="A run sheet is one call: the prospect, the goal, and the questions in the order you plan to ask them. Cut a new one to start prepping.">
                    <GhostBtn onClick={newCall} label="Create new run sheet" className="mt-2"><Plus className="h-3.5 w-3.5" aria-hidden />New run sheet</GhostBtn>
                  </EmptyState>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2.5 border-b border-brass-700/30 px-4 py-3 sm:grid-cols-3">
                    <Field label="Prospect"><input className={inputCls} value={activeCall.prospect} onChange={(e) => updateActive((c) => ({ ...c, prospect: e.target.value }))} placeholder="Dana Whitfield" /></Field>
                    <Field label="Role"><input className={inputCls} value={activeCall.role} onChange={(e) => updateActive((c) => ({ ...c, role: e.target.value }))} placeholder="VP RevOps" /></Field>
                    <Field label="Company"><input className={inputCls} value={activeCall.company} onChange={(e) => updateActive((c) => ({ ...c, company: e.target.value }))} placeholder="Meridian Freight" /></Field>
                    <Field label="Industry"><input className={inputCls} value={activeCall.industry} onChange={(e) => updateActive((c) => ({ ...c, industry: e.target.value }))} placeholder="3PL / logistics" /></Field>
                    <Field label="Date"><input type="date" className={inputCls} value={activeCall.date} onChange={(e) => updateActive((c) => ({ ...c, date: e.target.value }))} /></Field>
                    <Field label="Planned (min)"><input type="number" min="5" max="240" className={inputCls} value={activeCall.plannedMin} onChange={(e) => updateActive((c) => ({ ...c, plannedMin: parseInt(e.target.value, 10) || 30 }))} /></Field>
                    <Field label="Call goal" className="col-span-2 sm:col-span-3">
                      <input className={inputCls} value={activeCall.goal} onChange={(e) => updateActive((c) => ({ ...c, goal: e.target.value }))}
                        placeholder="What must be true when you hang up? e.g. deep-dive booked with the champion" />
                    </Field>
                  </div>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDropHot(true); }}
                    onDragLeave={() => setDropHot(false)}
                    onDrop={(e) => handleSheetDrop(e, null)}
                    className={`flex-1 space-y-1.5 overflow-y-auto p-3 transition ${dropHot ? 'bg-felt-700/50 ring-2 ring-inset ring-brass-400/60' : ''}`}
                    style={{ maxHeight: '22rem' }}>
                    {activeCall.questions.length === 0 ? (
                      <EmptyState icon={ChevronRight} title="Empty sheet, dead air"
                        body="Drag questions in from the rack (or tap the + on a rack card). Aim for 8–12 across all four bands — Situation first, Ideal last." />
                    ) : (
                      activeCall.questions.map((q, i) => (
                        <div key={q.id} draggable
                          onDragStart={(e) => { e.dataTransfer.setData('text/plain', `sheet:${i}`); }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => { e.stopPropagation(); handleSheetDrop(e, i); }}
                          className="group flex items-start gap-2 rounded-lg border border-brass-700/40 bg-felt-800/80 px-2.5 py-2 shadow-plate transition hover:border-brass-500"
                          style={{ borderLeftWidth: 3, borderLeftColor: stageMeta(q.stage).color }}>
                          <span className="mt-0.5 w-5 shrink-0 text-right font-mono text-xs text-brass-400">{i + 1}</span>
                          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-cream-400/60" aria-hidden />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm leading-snug text-cream-50">{q.text}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <StageChip stage={q.stage} dim />
                              {qCovered(q) && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-stg-ideal"><Check className="h-3 w-3" aria-hidden />covered</span>}
                            </div>
                            {q.notes.trim() && <p className="mt-1 truncate text-[11px] italic text-cream-300">{q.notes}</p>}
                          </div>
                          <div className="flex shrink-0 gap-0.5 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
                            <IconBtn label="Move question up" onClick={() => moveInSheet(i, -1)} disabled={i === 0}><ArrowUp className="h-3.5 w-3.5" aria-hidden /></IconBtn>
                            <IconBtn label="Move question down" onClick={() => moveInSheet(i, 1)} disabled={i === activeCall.questions.length - 1}><ArrowDown className="h-3.5 w-3.5" aria-hidden /></IconBtn>
                            <IconBtn label="Remove from run sheet" onClick={() => removeFromSheet(q.id)}><X className="h-3.5 w-3.5" aria-hidden /></IconBtn>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t border-brass-700/30 px-4 py-2.5 text-[11px] text-cream-300">
                    <span className="font-mono">{activeCall.questions.length} question{activeCall.questions.length === 1 ? '' : 's'} · {activeCall.plannedMin} min planned</span>
                    <span className="flex items-center gap-2">
                      {STAGES.map((s) => {
                        const n = activeCall.questions.filter((q) => q.stage === s.id).length;
                        return <span key={s.id} className="font-mono" style={{ color: s.color }}>{s.name.slice(0, 3)} {n}</span>;
                      })}
                    </span>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* ============ DEBRIEF VIEW ============ */}
        {view === 'debrief' && activeCall && score && (
          <section className="mt-4 grid gap-4 lg:grid-cols-5">
            <div className="brass-edge rounded-2xl bg-felt-850 p-4 shadow-console lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-brass-300">Signal Score</h2>
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${score.total >= 65 ? 'border-stg-ideal text-stg-ideal' : score.total >= 40 ? 'border-stg-situation text-stg-situation' : 'border-onair-400 text-onair-300'}`}>
                  {verdict(score.total)}
                </span>
              </div>
              <div className="mx-auto mt-2 max-w-[280px]"><ScoreDial score={score.total} /></div>
              <div className="mt-3 space-y-2">
                {score.rows.length ? score.rows.map((r) => <CoverageBar key={r.stage.id} row={r} />)
                  : <p className="text-xs text-cream-300">No questions on the sheet — nothing to measure yet.</p>}
              </div>

              <div className="mt-5 rounded-xl border border-brass-700/40 bg-felt-900/60 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-brass-400">Talk-time VU</h3>
                  <span className={`font-mono text-xs ${activeCall.talkRatio > 60 ? 'text-onair-300' : activeCall.talkRatio > 45 ? 'text-stg-situation' : 'text-stg-ideal'}`}>you spoke {activeCall.talkRatio}%</span>
                </div>
                <div className="mx-auto mt-2 max-w-[220px]">
                  <VUMeter value={activeCall.talkRatio / 100} label="TALK" redFrom={0.6} />
                </div>
                <input type="range" min="0" max="100" value={activeCall.talkRatio}
                  onChange={(e) => updateActive((c) => ({ ...c, talkRatio: parseInt(e.target.value, 10) }))}
                  aria-label="Your estimated talk ratio percent" className="mt-2 w-full accent-[#c49a42]" />
                <p className="mt-1 text-[10px] text-cream-400">Estimate honestly. Under 45% keeps the needle out of the red — discovery is their show, not yours.</p>
              </div>

              <div className="mt-4 space-y-1.5">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-brass-400">Momentum checklist</h3>
                {CHECKS.map((k) => (
                  <label key={k.id} className="flex cursor-pointer items-center gap-2.5 rounded-md border border-brass-700/30 bg-felt-800/60 px-2.5 py-1.5 text-xs text-cream-100 transition hover:border-brass-500">
                    <input type="checkbox" checked={activeCall.checks[k.id]}
                      onChange={(e) => updateActive((c) => ({ ...c, checks: { ...c.checks, [k.id]: e.target.checked } }))}
                      className="h-3.5 w-3.5 accent-[#c49a42]" />
                    {k.label}
                  </label>
                ))}
              </div>

              <Field label="Headline takeaway" className="mt-4">
                <textarea rows={3} className={inputCls} value={activeCall.headline}
                  onChange={(e) => updateActive((c) => ({ ...c, headline: e.target.value }))}
                  placeholder="One paragraph you would radio back to base: the pain, the number, the risk, the next step." />
              </Field>
            </div>

            <div className="space-y-4 lg:col-span-3">
              <div className="brass-edge rounded-2xl bg-felt-850 shadow-console">
                <div className="pinstripe flex flex-wrap items-center justify-between gap-2 rounded-t-2xl border-b border-brass-700/40 bg-felt-800 px-4 py-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-brass-300">Off-air transcript</h2>
                    <p className="text-[11px] text-cream-300">
                      {activeCall.prospect || 'Unnamed prospect'}{activeCall.company ? ` @ ${activeCall.company}` : ''} · on air {fmtClock(activeCall.elapsedSec)} of {activeCall.plannedMin}:00
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <GhostBtn onClick={copyMarkdown} label="Copy debrief markdown">
                      {copiedKey === 'md' ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}Copy markdown
                    </GhostBtn>
                    <GhostBtn onClick={() => window.print()} label="Print debrief"><Printer className="h-3.5 w-3.5" aria-hidden />Print</GhostBtn>
                  </div>
                </div>
                <div className="max-h-[26rem] space-y-3 overflow-y-auto p-4">
                  {activeCall.questions.length === 0 && (
                    <EmptyState icon={StickyNote} title="No transcript"
                      body="This sheet went on air with no questions. Head back to Prep, build the sheet, and re-run the call." />
                  )}
                  {STAGES.map((s) => {
                    const qs = activeCall.questions.filter((q) => q.stage === s.id);
                    if (!qs.length) return null;
                    return (
                      <div key={s.id}>
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: s.color }}>{s.name} band</p>
                        <div className="space-y-2">
                          {qs.map((q) => (
                            <div key={q.id} className="rounded-lg border border-brass-700/30 bg-felt-900/50 p-2.5" style={{ borderLeftWidth: 3, borderLeftColor: s.color }}>
                              <p className="text-xs font-semibold text-cream-100">{q.text}
                                {!qCovered(q) && <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-onair-300"><CircleAlert className="h-3 w-3" aria-hidden />not asked</span>}
                              </p>
                              <textarea rows={2} value={q.notes}
                                onChange={(e) => updateActive((c) => ({ ...c, questions: c.questions.map((x) => (x.id === q.id ? { ...x, notes: e.target.value } : x)) }))}
                                placeholder="No notes captured."
                                aria-label={`Notes for: ${q.text}`}
                                className="mt-1.5 w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs italic leading-relaxed text-cream-300 placeholder:text-cream-400/40 focus:border-brass-600/60 focus:bg-felt-900" />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ============ PRODUCER'S BOOTH (Claude Copilot) ============ */}
        {view !== 'live' && (
          <section className="brass-edge mt-4 rounded-2xl bg-felt-850 shadow-console">
            <div className="pinstripe flex flex-wrap items-center justify-between gap-2 rounded-t-2xl border-b border-brass-700/40 bg-felt-800 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-brass-300" aria-hidden />
                <h2 className="font-display text-lg font-bold text-brass-300">Producer's Booth</h2>
              </div>
              <p className="text-[11px] text-cream-300">Copy a prompt, paste into claude.ai — works with the standard $20 Claude subscription. No API key needed.</p>
            </div>
            <div className="grid gap-3 p-4 md:grid-cols-3">
              {/* Action 1 */}
              <div className="flex flex-col rounded-xl border border-brass-700/40 bg-felt-900/60 p-3 shadow-plate">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4 shrink-0 text-stg-impact" aria-hidden />
                  <h3 className="text-sm font-bold text-cream-50">Write questions for an industry</h3>
                </div>
                <p className="mt-1.5 flex-1 text-[11px] leading-relaxed text-cream-300">
                  Sends your whole rack plus a target industry; Claude returns 12 new questions — 3 per band — in that industry's own vocabulary, each with why it works.
                </p>
                <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Industry, e.g. dental groups, freight brokerage"
                  aria-label="Target industry for generated questions" className={`${inputCls} mt-2 text-xs`} />
                <button type="button" onClick={() => copyText(promptIndustryQuestions(state, industry, consoleCtx), 'p1', 'Prompt copied — paste it into claude.ai.')}
                  className="btn-brass mt-2 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold">
                  {copiedKey === 'p1' ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}Copy prompt
                </button>
              </div>
              {/* Action 2 */}
              <div className="flex flex-col rounded-xl border border-brass-700/40 bg-felt-900/60 p-3 shadow-plate">
                <div className="flex items-center gap-2">
                  <CircleAlert className="h-4 w-4 shrink-0 text-stg-problem" aria-hidden />
                  <h3 className="text-sm font-bold text-cream-50">Audit my notes for gaps</h3>
                </div>
                <p className="mt-1.5 flex-1 text-[11px] leading-relaxed text-cream-300">
                  Sends the active call's full debrief; Claude flags under-covered bands, fog answers to reopen, missing deal facts, risk flags, and 5 next-touch questions.
                </p>
                <p className="mt-2 truncate text-[10px] font-semibold text-brass-400">{activeCall ? `On deck: ${activeCall.prospect || 'unnamed'} @ ${activeCall.company || '—'}` : 'Select or create a run sheet first.'}</p>
                <button type="button" disabled={copilotDisabled}
                  onClick={() => activeCall && copyText(promptGapAnalysis(activeCall, consoleCtx), 'p2', 'Gap-audit prompt copied — paste it into claude.ai.')}
                  className="btn-brass mt-2 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40">
                  {copiedKey === 'p2' ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}Copy prompt
                </button>
              </div>
              {/* Action 3 */}
              <div className="flex flex-col rounded-xl border border-brass-700/40 bg-felt-900/60 p-3 shadow-plate">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-stg-situation" aria-hidden />
                  <h3 className="text-sm font-bold text-cream-50">Draft the follow-up email</h3>
                </div>
                <p className="mt-1.5 flex-1 text-[11px] leading-relaxed text-cream-300">
                  Sends your notes and next step; Claude drafts a sub-150-word same-day follow-up that mirrors the prospect's words and locks the next step, plus 3 subject lines.
                </p>
                <p className="mt-2 truncate text-[10px] font-semibold text-brass-400">{activeCall ? `On deck: ${activeCall.prospect || 'unnamed'} @ ${activeCall.company || '—'}` : 'Select or create a run sheet first.'}</p>
                <button type="button" disabled={copilotDisabled}
                  onClick={() => activeCall && copyText(promptFollowUp(activeCall, consoleCtx), 'p3', 'Follow-up prompt copied — paste it into claude.ai.')}
                  className="btn-brass mt-2 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40">
                  {copiedKey === 'p3' ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}Copy prompt
                </button>
              </div>
            </div>
            <div className="border-t border-brass-700/30 px-4 pb-4 pt-3">
              <Field label="Tape return — paste Claude's answer here (saved with this call)">
                <textarea rows={3} className={inputCls} disabled={copilotDisabled}
                  value={activeCall ? activeCall.copilotNotes : ''}
                  onChange={(e) => updateActive((c) => ({ ...c, copilotNotes: e.target.value }))}
                  placeholder={activeCall ? "Paste the gap audit or draft back here so it travels with the debrief and its exports." : 'Create a run sheet to attach Claude output.'} />
              </Field>
            </div>
          </section>
        )}

        {/* ============ Footer ============ */}
        <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-cream-400">
          <span className="font-mono">DCC-3 · your data stays in this browser (localStorage) · export anytime</span>
          <span className="font-mono">? help · Ctrl/Cmd+S copy debrief · Esc close</span>
        </footer>
      </div>

      {/* ============ Print artifact ============ */}
      {activeCall && (
        <div className="print-sheet">
          <h1 style={{ fontSize: '22pt', fontWeight: 900 }}>Discovery debrief — {activeCall.prospect || 'Unnamed prospect'}{activeCall.company ? ` @ ${activeCall.company}` : ''}</h1>
          <p style={{ fontSize: '10pt' }}>{activeCall.role}{activeCall.role && activeCall.industry ? ' · ' : ''}{activeCall.industry} · {activeCall.date} · planned {activeCall.plannedMin} min · on air {fmtClock(activeCall.elapsedSec)}</p>
          <div className="rule" style={{ margin: '8pt 0' }} />
          <p style={{ fontSize: '12pt' }}><strong>Signal score: {computeScore(activeCall).total}/100 — {verdict(computeScore(activeCall).total)}</strong> · talk ratio {activeCall.talkRatio}%</p>
          {activeCall.goal && <p style={{ fontSize: '10pt' }}><strong>Goal:</strong> {activeCall.goal}</p>}
          {activeCall.headline && <p style={{ fontSize: '10pt', fontStyle: 'italic' }}>{activeCall.headline}</p>}
          <ul style={{ fontSize: '9pt', margin: '6pt 0 10pt 14pt' }}>
            {CHECKS.map((k) => <li key={k.id}>[{activeCall.checks[k.id] ? 'x' : ' '}] {k.label}</li>)}
          </ul>
          {STAGES.map((s) => {
            const qs = activeCall.questions.filter((q) => q.stage === s.id);
            if (!qs.length) return null;
            return (
              <div key={s.id} style={{ marginBottom: '8pt' }}>
                <h2 style={{ fontSize: '13pt', fontWeight: 700 }}>{s.name}</h2>
                {qs.map((q) => (
                  <div key={q.id} style={{ margin: '4pt 0 6pt' }}>
                    <p style={{ fontSize: '10pt', fontWeight: 600 }}>{q.text}{qCovered(q) ? '' : '  — not asked'}</p>
                    {q.notes.trim() && <p style={{ fontSize: '9.5pt', margin: '2pt 0 0 10pt', whiteSpace: 'pre-wrap' }}>{q.notes}</p>}
                  </div>
                ))}
              </div>
            );
          })}
          {activeCall.copilotNotes.trim() && (
            <div>
              <h2 style={{ fontSize: '13pt', fontWeight: 700 }}>Producer's booth</h2>
              <p style={{ fontSize: '9.5pt', whiteSpace: 'pre-wrap' }}>{activeCall.copilotNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* ============ Toasts ============ */}
      <div className="fixed bottom-4 left-1/2 z-[60] flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-3" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast-in brass-edge flex items-center justify-between gap-3 rounded-lg bg-felt-800 px-3.5 py-2.5 shadow-console">
            <p className="text-xs text-cream-100">{t.text}</p>
            <div className="flex shrink-0 items-center gap-1">
              {t.undo && (
                <button type="button" onClick={() => { t.undo(); dismissToast(t.id); }}
                  className="inline-flex items-center gap-1 rounded-md border border-brass-500 px-2 py-1 text-[11px] font-bold text-brass-300 hover:bg-felt-700">
                  <Undo2 className="h-3 w-3" aria-hidden />Undo
                </button>
              )}
              <IconBtn label="Dismiss notification" onClick={() => dismissToast(t.id)}><X className="h-3.5 w-3.5" aria-hidden /></IconBtn>
            </div>
          </div>
        ))}
      </div>

      {/* ============ Modals ============ */}
      {modal === 'help' && (
        <Modal title="How to use — from prep to signed follow-up" onClose={() => setModal(null)} wide>
          <ol className="list-decimal space-y-2.5 pl-5 text-sm leading-relaxed text-cream-100">
            <li><strong className="text-brass-300">Load the demo</strong> (header) to see a finished call — the Meridian Freight debrief shows what "done well" looks like.</li>
            <li><strong className="text-brass-300">Build your Question Rack.</strong> Write questions into four bands: Situation (facts), Problem (breakage), Impact (cost), Ideal (future state). Give each a "why it works".</li>
            <li><strong className="text-brass-300">Cut a Run Sheet.</strong> Create a call, fill in prospect, goal and planned minutes, then drag 8–12 questions from the rack — or tap the + on any rack card.</li>
            <li><strong className="text-brass-300">Go on air.</strong> The lamp lights, the timer rolls. One big question at a time; type their words into the notes. Arrow keys move, Space pauses, A marks asked.</li>
            <li><strong className="text-brass-300">Debrief while it's warm.</strong> Set your talk ratio, tick the momentum checklist, write the headline takeaway. The Signal Score dial tells you the truth.</li>
            <li><strong className="text-brass-300">Visit the Producer's Booth.</strong> Copy a prompt — industry questions, gap audit, or follow-up email — and paste it into claude.ai. Paste Claude's answer into the tape return so it travels with the call.</li>
            <li><strong className="text-brass-300">Export.</strong> Copy the debrief as markdown, print it, or download the full session JSON. Import the JSON on any machine to restore everything.</li>
            <li><strong className="text-brass-300">Repeat.</strong> Promote the questions that made prospects talk; cut the ones that got one-word answers.</li>
          </ol>
          <h3 className="mb-2 mt-5 font-display text-base font-bold text-brass-300">Keyboard</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-cream-100">
              <thead><tr className="border-b border-brass-700/50 text-[10px] uppercase tracking-widest text-brass-400"><th className="py-1.5 pr-4">Key</th><th className="py-1.5">Action</th></tr></thead>
              <tbody>
                {[['?', 'Open or close this guide'], ['Esc', 'Close dialogs · leave live mode'], ['Ctrl / Cmd + S', 'Copy the debrief markdown'], ['← / →', 'Previous / next question (on air)'], ['Space', 'Pause / resume the timer (on air)'], ['A', 'Toggle asked on the current question (on air)']].map(([k, a]) => (
                  <tr key={k} className="border-b border-brass-700/20">
                    <td className="py-1.5 pr-4 font-mono text-brass-200">{k}</td><td className="py-1.5">{a}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 rounded-lg border border-brass-700/40 bg-felt-900/60 p-3 text-[11px] leading-relaxed text-cream-300">
            <strong className="text-brass-300">Your data:</strong> everything lives in this browser's localStorage — nothing is sent anywhere. Use Export → Download JSON for backups, and the Producer's Booth prompts with your own claude.ai account.
          </p>
        </Modal>
      )}

      {modal === 'reset' && (
        <Modal title="Wipe the console?" onClose={() => setModal(null)}>
          <p className="text-sm leading-relaxed text-cream-100">
            This erases the question rack, every run sheet, and all notes from this browser. If any of it matters, download the session JSON first.
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <GhostBtn onClick={() => { downloadJSON(); }} label="Download backup JSON"><FileJson className="h-3.5 w-3.5" aria-hidden />Download backup</GhostBtn>
            <GhostBtn onClick={() => setModal(null)} label="Cancel reset">Cancel</GhostBtn>
            <button type="button" onClick={doReset}
              className="inline-flex items-center gap-1.5 rounded-md border border-onair-500 bg-onair-500/20 px-3 py-1.5 text-xs font-bold text-onair-300 hover:bg-onair-500/30">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />Wipe everything
            </button>
          </div>
        </Modal>
      )}

      {modal === 'export' && (
        <Modal title="Export the session" onClose={() => setModal(null)} wide>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={copyMarkdown}
              className="flex items-start gap-3 rounded-xl border border-brass-700/40 bg-felt-900/60 p-3 text-left transition hover:border-brass-400">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-brass-300" aria-hidden />
              <span><span className="block text-sm font-bold text-cream-50">Copy markdown</span>
                <span className="block text-[11px] text-cream-300">{activeCall ? 'The active call debrief — score, checklist, transcript.' : 'The question rack, grouped by band.'} (Ctrl/Cmd+S)</span></span>
            </button>
            <button type="button" onClick={downloadJSON}
              className="flex items-start gap-3 rounded-xl border border-brass-700/40 bg-felt-900/60 p-3 text-left transition hover:border-brass-400">
              <FileJson className="mt-0.5 h-5 w-5 shrink-0 text-brass-300" aria-hidden />
              <span><span className="block text-sm font-bold text-cream-50">Download JSON</span>
                <span className="block text-[11px] text-cream-300">Full session: rack, every run sheet, notes, scores. Your backup.</span></span>
            </button>
            <button type="button" onClick={downloadCSV}
              className="flex items-start gap-3 rounded-xl border border-brass-700/40 bg-felt-900/60 p-3 text-left transition hover:border-brass-400">
              <Download className="mt-0.5 h-5 w-5 shrink-0 text-brass-300" aria-hidden />
              <span><span className="block text-sm font-bold text-cream-50">Download rack CSV</span>
                <span className="block text-[11px] text-cream-300">Question bank as a spreadsheet — band, question, why it works.</span></span>
            </button>
            <button type="button" onClick={() => fileRef.current && fileRef.current.click()}
              className="flex items-start gap-3 rounded-xl border border-brass-700/40 bg-felt-900/60 p-3 text-left transition hover:border-brass-400">
              <Upload className="mt-0.5 h-5 w-5 shrink-0 text-brass-300" aria-hidden />
              <span><span className="block text-sm font-bold text-cream-50">Import JSON</span>
                <span className="block text-[11px] text-cream-300">Restore a downloaded session. Replaces what's on the console (undoable).</span></span>
            </button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Import session JSON file"
            onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) importJSON(f); e.target.value = ''; }} />
          <div className="mt-4">
            <Field label="Markdown preview">
              <textarea readOnly rows={9} className={`${inputCls} font-mono text-[11px] leading-relaxed`} value={mainArtifact()} />
            </Field>
          </div>
        </Modal>
      )}

      {modal && typeof modal === 'object' && modal.type === 'question' && (
        <QuestionEditor
          initial={modal.q}
          isNew={!!modal.isNew}
          onCancel={() => setModal(null)}
          onSave={(q) => {
            if (!q.text.trim()) { setModal(null); return; }
            saveBankQuestion(normalizeBankQ(q));
            setModal(null);
          }}
        />
      )}
    </>
  );
}

/* ================================================================== */
/* Question editor modal                                               */
/* ================================================================== */

function QuestionEditor({ initial, isNew, onSave, onCancel }) {
  const [q, setQ] = useState(initial);
  return (
    <Modal title={isNew ? 'Rack a new question' : 'Edit question'} onClose={onCancel}>
      <div className="space-y-3">
        <Field label="Band">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose band">
            {STAGES.map((s) => (
              <button key={s.id} type="button" onClick={() => setQ((x) => ({ ...x, stage: s.id }))} aria-pressed={q.stage === s.id}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${q.stage === s.id ? '' : 'opacity-50 hover:opacity-90'}`}
                style={{ borderColor: s.color, color: s.color, background: q.stage === s.id ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                {s.name} <span className="font-mono opacity-70">{s.freq}</span>
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10px] italic text-cream-400">{stageMeta(q.stage).hint}</p>
        </Field>
        <Field label="The question">
          <textarea rows={3} autoFocus className={inputCls} value={q.text}
            onChange={(e) => setQ((x) => ({ ...x, text: e.target.value }))}
            placeholder="One thought, conversational, opens a story. e.g. Where does that process break most often?" />
        </Field>
        <Field label="Why it works (optional coaching note)">
          <input className={inputCls} value={q.why}
            onChange={(e) => setQ((x) => ({ ...x, why: e.target.value }))}
            placeholder="e.g. Workarounds are pain made visible." />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <GhostBtn onClick={onCancel} label="Cancel editing">Cancel</GhostBtn>
          <button type="button" onClick={() => onSave(q)} disabled={!q.text.trim()}
            className="btn-brass inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40">
            <Check className="h-3.5 w-3.5" aria-hidden />{isNew ? 'Add to rack' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
