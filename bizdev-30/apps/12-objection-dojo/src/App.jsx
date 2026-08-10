import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Trash2, Pencil, X, Copy, Check, Download, Upload,
  CircleHelp, RotateCcw, Play, Sparkles, Search, Undo2, Printer,
  Flame, Swords, ScrollText, Eye, ChevronDown, Table2, MessageSquareQuote,
  Cable,
} from 'lucide-react';

/* ─────────────────────────────── console bus ───────────────────────────── */

function useConsoleBus() {
  const [ctx, setCtx] = useState(null);
  useEffect(() => {
    if (window.parent === window) return; // standalone, no console
    const onMsg = (e) => {
      const m = e.data;
      if (!m || m.bizdev !== 'context' || m.v !== 1) return; // version-gate + ignore junk
      setCtx(m.connectors || null);
    };
    window.addEventListener('message', onMsg);
    try { window.parent.postMessage({ bizdev: 'ready', v: 1, slug: '12-objection-dojo' }, '*'); } catch { /* no console host */ }
    return () => window.removeEventListener('message', onMsg);
  }, []);
  return ctx;
}

function consoleContextHeader(consoleCtx) {
  if (!consoleCtx) return '';
  const { claude, profile, roster } = consoleCtx;
  const lines = [];
  if (profile?.company) lines.push(`- My company: ${profile.company}`);
  if (profile?.offer) lines.push(`- What I sell: ${profile.offer}`);
  if (profile?.icp) lines.push(`- My ICP: ${profile.icp}`);
  if (profile?.pricingAnchor) lines.push(`- Pricing anchor: ${profile.pricingAnchor}`);
  const voice = [claude?.userName, claude?.voiceNotes].filter(Boolean).join(' — ');
  if (voice) lines.push(`- My name / voice: ${voice}`);
  if (roster?.accounts?.length) {
    const accounts = roster.accounts.slice(0, 12)
      .map((a) => `${a.name}${a.segment ? ` (${a.segment})` : ''}`).join(', ');
    lines.push(`- Accounts on file: ${accounts}`);
  }
  if (!lines.length) return '';
  return ['## Shared context (from BizDev Console)', ...lines].join('\n');
}

/* ─────────────────────────────── constants ─────────────────────────────── */

const LS_KEY = 'bizdev:12-objection-dojo:v1';
const DAY = 86400000;
const INTERVALS = [0, 1, 3, 7, 14, 30]; // days per box 0..5

const CATEGORIES = [
  { id: 'price', label: 'Price & Budget' },
  { id: 'timing', label: 'Timing' },
  { id: 'need', label: 'Need & Fit' },
  { id: 'trust', label: 'Trust & Risk' },
  { id: 'authority', label: 'Authority' },
  { id: 'competitor', label: 'Competitor' },
  { id: 'statusquo', label: 'Status Quo' },
];
const catLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || 'Uncategorized';

const BELTS = [
  { id: 'white', label: 'White belt', color: '#f2ecdc', edge: '#b8ab8c', min: 0 },
  { id: 'yellow', label: 'Yellow belt', color: '#d9a521', edge: '#a87d12', min: 0.15 },
  { id: 'orange', label: 'Orange belt', color: '#cf6f2b', edge: '#9c4f1a', min: 0.32 },
  { id: 'green', label: 'Green belt', color: '#4a7040', edge: '#33512c', min: 0.5 },
  { id: 'brown', label: 'Brown belt', color: '#7a5230', edge: '#573920', min: 0.68 },
  { id: 'black', label: 'Black belt', color: '#1b1712', edge: '#000000', min: 0.85 },
];
const beltFor = (m) => [...BELTS].reverse().find((b) => m >= b.min) || BELTS[0];

const uid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);

const todayStr = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const yesterdayStr = () => todayStr(new Date(Date.now() - DAY));

/* ─────────────────────────────── normalize ─────────────────────────────── */

function normalizeObjection(raw) {
  if (!raw || typeof raw !== 'object') raw = {};
  const box = Math.min(5, Math.max(0, Number(raw.box) || 0));
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
    category: CATEGORIES.some((c) => c.id === raw.category) ? raw.category : 'need',
    objection: typeof raw.objection === 'string' ? raw.objection : '',
    rootCause: typeof raw.rootCause === 'string' ? raw.rootCause : '',
    counter: typeof raw.counter === 'string' ? raw.counter : '',
    proofPoint: typeof raw.proofPoint === 'string' ? raw.proofPoint : '',
    box,
    reps: Math.max(0, Number(raw.reps) || 0),
    dueAt: Number.isFinite(Number(raw.dueAt)) ? Number(raw.dueAt) : 0,
    lastGrade: ['again', 'hard', 'easy'].includes(raw.lastGrade) ? raw.lastGrade : null,
    createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now(),
  };
}

function normalize(raw) {
  if (!raw || typeof raw !== 'object') raw = {};
  const offer = raw.offer && typeof raw.offer === 'object' ? raw.offer : {};
  const streak = raw.streak && typeof raw.streak === 'object' ? raw.streak : {};
  return {
    version: 1,
    seenGuide: !!raw.seenGuide,
    offer: {
      name: typeof offer.name === 'string' ? offer.name : '',
      description: typeof offer.description === 'string' ? offer.description : '',
      icp: typeof offer.icp === 'string' ? offer.icp : '',
    },
    objections: Array.isArray(raw.objections) ? raw.objections.map(normalizeObjection) : [],
    streak: {
      current: Math.max(0, Number(streak.current) || 0),
      best: Math.max(0, Number(streak.best) || 0),
      lastDay: typeof streak.lastDay === 'string' ? streak.lastDay : '',
    },
    senseiNotes: typeof raw.senseiNotes === 'string' ? raw.senseiNotes : '',
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return normalize({});
    return normalize(JSON.parse(raw));
  } catch {
    return normalize({});
  }
}

/* ─────────────────────────────── demo data ─────────────────────────────── */

function demoState() {
  const now = Date.now();
  const o = (category, objection, rootCause, counter, proofPoint, box, reps, dueOffsetDays) => ({
    id: uid(), category, objection, rootCause, counter, proofPoint,
    box, reps, dueAt: now + dueOffsetDays * DAY, lastGrade: box >= 3 ? 'easy' : box >= 1 ? 'hard' : null,
    createdAt: now - 21 * DAY,
  });
  return normalize({
    seenGuide: true,
    offer: {
      name: 'Clearlane — RevOps Retainer',
      description: 'RevOps-as-a-service at $4,500/mo. We rebuild CRM hygiene, lead routing, and forecast cadence in 90 days, then run it. Fixed scope, weekly shipped changelog, day-30 exit clause.',
      icp: 'B2B SaaS, 5–25 sales reps, $2–20M ARR, founder-led or first VP Sales, HubSpot or Salesforce.',
    },
    streak: { current: 6, best: 11, lastDay: todayStr() },
    senseiNotes:
      'Claude flagged that my price counters lean on ROI math before empathy. New pattern to drill: acknowledge the sticker shock in one sentence BEFORE any reframe. Also: stop answering the CEO objection with features — arm the champion instead.',
    objections: [
      o('price',
        "Four and a half grand a month? I could hire a full-time admin for that.",
        'They are comparing the retainer to headcount cost, not to the cost of a broken forecast.',
        "Fair — an admin costs about the same. But an admin still needs someone to tell them what good looks like. You're not buying hours, you're buying a working forecast in 90 days. If clean routing recovers two stalled deals a quarter, the retainer has paid for itself. Want me to show the math on your numbers?",
        'Harbor & Fell recovered $210k of stalled pipeline in the first quarter after routing fixes.',
        4, 14, 6),
      o('price',
        "We just don't have budget for this quarter.",
        "No budget line exists because the leak has never been quantified — it's absorbed silently.",
        "Totally understand — nobody budgets for a problem they haven't priced. That's usually the first thing we fix: a one-page leak audit that puts a dollar figure on missed routing and stale stages. If the number is boring, you file it. If it isn't, you'll have the business case for next quarter's planning. When does that cycle start?",
        'Leak audits across our last 9 clients averaged $38k/quarter in recoverable pipeline.',
        2, 6, -0.1),
      o('timing',
        "Come back after our Salesforce migration is done.",
        'Fear of stacking change on change; they see us as extra load, not migration insurance.',
        "That instinct makes sense — one big change at a time. Here's the catch: hygiene rules are 10x cheaper to define while the migration is in flight than to retrofit after. We slot in as the standards layer for the migration, not a second project. Would your migration lead take 20 minutes to pressure-test that?",
        'Our last 6 mid-migration clients shipped ~30% fewer post-launch fixes than post-migration starts.',
        3, 9, 2),
      o('timing',
        "This just isn't a priority right now.",
        'Pain is real but ranks below whatever the exec team is currently on fire about.',
        "Believe me, I won't argue priorities with you — you know the fire drill list. Can I ask what IS the top priority this quarter? In most teams we meet, it's hitting the number — and forecast accuracy is usually the shortest path to that. If I can tie this to your #1 metric in one page, is it worth a second look?",
        'Nordica moved forecast accuracy from ±40% to ±12% in one quarter — CFO now runs board prep off the CRM.',
        1, 3, -0.5),
      o('need',
        "Our ops person already handles all of this.",
        "Turf threat — the insider hears 'replacement', so they quietly kill the deal.",
        "Great — that means someone owns it, which is rare. We're not a replacement; we're the playbook and extra hands your ops person points at the boring parts. Our best renewals are championed by exactly that person. Can we bring them into the scoping call so they shape what we take off their plate?",
        '8 of our 11 active clients have in-house ops; every single renewal was championed by that person.',
        3, 11, 4),
      o('need',
        "We're probably too small to need RevOps.",
        "They equate RevOps with enterprise bureaucracy, not with rep-level selling time.",
        "You might be — and if so, I'll say it. But small is the cheapest time to fix this: rewiring 8 reps' habits costs a fraction of rewiring 80. Teams that wait usually pay for it in the exact quarter they scale. What does your rep count look like a year from now?",
        'Two clients who started at 6 reps scaled past 20 without adding a single ops hire.',
        0, 0, 0),
      o('trust',
        "We got burned by consultants before.",
        'Past vendors sold slide decks and scope creep; trust deficit transfers to us.',
        "I hear that a lot, and honestly the industry earned it. Two things we do differently: fixed 90-day scope with a weekly shipped changelog — working changes in your CRM, not decks — and a day-30 exit clause. If we're not obviously worth it by day 30, you walk and pay nothing further. Does that de-risk it enough to try?",
        'The day-30 exit clause has existed for 2 years. Zero clients have used it.',
        2, 5, -1),
      o('trust',
        "How do we know this will actually work for us?",
        'No proof yet that their mess resembles messes we have fixed before.',
        "You don't — yet, and you shouldn't take my word for it. That's what the diagnostic week is for: we audit your pipeline data and show you, with your numbers, exactly what we'd fix and what it's worth. If the findings are thin, you've lost a week and gained an audit. Fair trade?",
        'Diagnostic-week findings doc: every prospect keeps it whether they buy or not.',
        1, 2, 0.2),
      o('authority',
        "I need to run this by my CEO first.",
        "Single-threaded deal — the champion has no retellable story, so it dies in translation.",
        "Of course — and honestly, how this lands with your CEO is the whole game. Most champions get one shot at that pitch, so let me arm you: a one-page brief in your CEO's language — cost of the leak, the 90-day plan, the exit clause. Or better, a 20-minute three-way call. Which would your CEO actually respond to?",
        'Deals where we did a joint exec call closed at ~70%; solo-champion retells closed under 30%.',
        2, 7, 1),
      o('competitor',
        "We're also talking to a bigger agency about this.",
        "Safety-in-size bias: nobody gets fired for hiring the big shop.",
        "Smart — you should compare. One question to ask them: who exactly does the work after the kickoff call? At big shops the A-team sells and a pod of juniors delivers. Here, the person who wrote the playbook is the person in your CRM every week. Put us side by side on that one dimension and pick whoever wins.",
        'Client quote: "The person who scoped it was the person who built it. That never happens."',
        1, 4, -0.3),
      o('statusquo',
        "Honestly, our spreadsheets work fine.",
        'Pain is absorbed silently — forecast misses get explained away, never priced.',
        "If they truly work, keep them — a spreadsheet that's trusted beats a CRM that isn't. Quick gut check though: when the forecast missed last quarter, did anyone know by week 3, or did it land as a surprise in week 13? That gap is what we sell. What did the last surprise quarter cost you?",
        'Nordica: forecast accuracy ±40% to ±12% in one quarter after cadence + hygiene rebuild.',
        0, 1, 0),
    ],
  });
}

/* ─────────────────────────────── utilities ─────────────────────────────── */

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch { /* noop */ }
  document.body.removeChild(ta);
}
function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }
  fallbackCopy(text);
  return Promise.resolve();
}
function downloadFile(name, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
const csvCell = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;

function dueLabel(ob) {
  const now = Date.now();
  if (ob.reps === 0) return 'new — never drilled';
  if (ob.dueAt <= now) return 'due now';
  const days = Math.ceil((ob.dueAt - now) / DAY);
  return days <= 1 ? 'due tomorrow' : `due in ${days} days`;
}

/* ─────────────────────────── markdown serializers ──────────────────────── */

function libraryMarkdown(state) {
  const { offer, objections, streak } = state;
  const mastery = objections.length
    ? objections.reduce((a, o) => a + o.box / 5, 0) / objections.length : 0;
  const belt = beltFor(mastery);
  const lines = [];
  lines.push(`# Objection Dojo — ${offer.name || 'My offer'}`);
  lines.push('');
  if (offer.description) lines.push(`**Offer:** ${offer.description}`);
  if (offer.icp) lines.push(`**ICP:** ${offer.icp}`);
  lines.push(`**Rank:** ${belt.label} (${Math.round(mastery * 100)}% mastery) · **Streak:** ${streak.current} day(s), best ${streak.best} · **Cards:** ${objections.length}`);
  lines.push('');
  for (const cat of CATEGORIES) {
    const items = objections.filter((o) => o.category === cat.id);
    if (!items.length) continue;
    const catM = items.reduce((a, o) => a + o.box / 5, 0) / items.length;
    lines.push(`## ${cat.label} — ${beltFor(catM).label}, ${Math.round(catM * 100)}%`);
    lines.push('');
    for (const ob of items) {
      lines.push(`### "${ob.objection}"`);
      if (ob.rootCause) lines.push(`- **Root cause:** ${ob.rootCause}`);
      if (ob.counter) lines.push(`- **Counter:** ${ob.counter}`);
      if (ob.proofPoint) lines.push(`- **Proof point:** ${ob.proofPoint}`);
      lines.push(`- **Reps:** ${ob.reps} · **Box:** ${ob.box}/5 · ${dueLabel(ob)}`);
      lines.push('');
    }
  }
  if (!objections.length) lines.push('_The library is empty — add your first objection._');
  return lines.join('\n');
}

function promptGenerate(state, consoleCtx) {
  const header = consoleContextHeader(consoleCtx);
  return [
    ...(header ? [header, ''] : []),
    'You are a veteran B2B sales coach who has run thousands of deal reviews. You specialize in objection handling that sounds human, not scripted.',
    '',
    '## My offer',
    `- Name: ${state.offer.name || '(not set — ask me)'}`,
    `- What it is: ${state.offer.description || '(not set — ask me)'}`,
    `- Who buys it (ICP): ${state.offer.icp || '(not set — ask me)'}`,
    '',
    '## Objections I already drill (do NOT duplicate these)',
    state.objections.length
      ? state.objections.map((o) => `- [${catLabel(o.category)}] "${o.objection}"`).join('\n')
      : '- (library is empty)',
    '',
    '## The ask',
    'Generate 10 NEW objections a real prospect would raise against this offer — the uncomfortable ones, including at least one each for: price, timing, trust, authority, competitor, and status quo.',
    '',
    'For each objection give me:',
    '1. **Objection** — verbatim, in the prospect\'s voice (blunt, colloquial).',
    '2. **Root cause** — the real fear or incentive underneath, in one sentence.',
    '3. **Counter** — 2–4 sentences following: acknowledge, reframe, proof, then a question back. No corporate filler.',
    '4. **Proof point to gather** — the specific evidence I should collect to back the counter.',
    '',
    '## Output format',
    'Markdown, one `###` heading per objection with the four labeled bullets underneath, so I can paste each one straight into my dojo library. Rank them from most to least likely to kill a deal.',
  ].join('\n');
}

function promptGrade(state, ob, consoleCtx) {
  const header = consoleContextHeader(consoleCtx);
  return [
    ...(header ? [header, ''] : []),
    'You are a ruthless but fair sales-coaching sensei. You grade objection counters the way a fight judge scores rounds: on what would actually land, not what sounds polished.',
    '',
    '## My offer',
    `- ${state.offer.name || '(unnamed offer)'}: ${state.offer.description || '(no description)'}`,
    `- ICP: ${state.offer.icp || '(not set)'}`,
    '',
    '## The objection I am drilling',
    `- Category: ${catLabel(ob.category)}`,
    `- Objection (prospect's words): "${ob.objection}"`,
    `- Root cause I diagnosed: ${ob.rootCause || '(none written — diagnose it for me)'}`,
    '',
    '## My current counter',
    `> ${ob.counter || '(I have no counter yet — write one from scratch)'}`,
    '',
    `## My proof point`,
    `> ${ob.proofPoint || '(none yet)'}`,
    '',
    '## The ask',
    '1. Score my counter 1–10 on each: **Empathy** (do I acknowledge before arguing?), **Reframe** (do I change the frame or just defend?), **Proof** (specific and believable?), **Advance** (does it end with a question that moves the deal?).',
    '2. Tell me the single biggest weakness, bluntly.',
    '3. Rewrite the counter in my register but stronger — max 4 sentences, spoken language, ends with a question.',
    '4. Suggest one sharper proof point I should go collect.',
    '',
    'Format as markdown with those four numbered sections. Do not soften the critique.',
  ].join('\n');
}

function promptSpar(state, consoleCtx) {
  const weak = [...CATEGORIES]
    .map((c) => {
      const items = state.objections.filter((o) => o.category === c.id);
      if (!items.length) return null;
      return { c, m: items.reduce((a, o) => a + o.box / 5, 0) / items.length };
    })
    .filter(Boolean)
    .sort((a, b) => a.m - b.m)
    .slice(0, 3);
  const header = consoleContextHeader(consoleCtx);
  return [
    ...(header ? [header, ''] : []),
    'You are role-playing a HARD B2B prospect on a discovery call. Stay fully in character until I say "end sparring". Do not coach me mid-scene. Do not be conveniently persuadable.',
    '',
    '## The seller (me) and my offer',
    `- Offer: ${state.offer.name || '(unnamed)'} — ${state.offer.description || '(no description)'}`,
    `- My ICP: ${state.offer.icp || '(not set)'}`,
    '',
    '## Your character',
    'You are a skeptical economic buyer at a company matching my ICP. You have been burned by vendors before, you protect your calendar, and you interrupt weak answers. You are not hostile for sport — you can be won over, but only by counters that acknowledge your concern, reframe it, and bring specific proof.',
    '',
    '## Where I am weakest (press here hardest)',
    weak.length
      ? weak.map((w) => `- ${w.c.label} (my mastery: ${Math.round(w.m * 100)}%)`).join('\n')
      : '- No drill data yet — mix categories freely.',
    '',
    '## Objections you may draw from (paraphrase, escalate, and combine)',
    state.objections.length
      ? state.objections.map((o) => `- "${o.objection}"`).join('\n')
      : '- Invent realistic ones for this offer.',
    '',
    '## Rules of the spar',
    '1. Open the scene mid-call: you have just raised your toughest objection.',
    '2. After each of my replies, respond in character; escalate or concede believably based on the quality of my counter.',
    '3. Raise a new objection whenever I fully defuse one. Keep the pressure on for at least 5 rounds.',
    '4. When I say "end sparring", break character and give me a scorecard: each objection raised, my counter quality 1–10, what a black-belt answer would have been.',
    '',
    'Begin the scene now.',
  ].join('\n');
}

/* ─────────────────────────────── SVG pieces ────────────────────────────── */

function Enso({ id, className }) {
  const f = `enso-${id}`;
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <filter id={f} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="7" />
        </filter>
      </defs>
      <g filter={`url(#${f})`}>
        <path d="M 163 70 A 74 74 0 1 0 152 143" fill="none" stroke="currentColor"
          strokeWidth="15" strokeLinecap="round" opacity="0.92" />
        <path d="M 158 79 A 66 66 0 1 0 146 137" fill="none" stroke="currentColor"
          strokeWidth="5" strokeLinecap="round" opacity="0.45" />
        <path d="M 160 74 A 70 70 0 0 0 118 34" fill="none" stroke="currentColor"
          strokeWidth="20" strokeLinecap="round" opacity="0.28" />
      </g>
    </svg>
  );
}

function BeltIcon({ belt, className }) {
  return (
    <svg viewBox="0 0 56 30" className={className} aria-hidden="true">
      <rect x="2" y="9" width="52" height="9" rx="1.5" fill={belt.color} stroke={belt.edge} strokeWidth="1.4" />
      <path d="M23 9 L33 9 L35.5 18 L20.5 18 Z" fill={belt.color} stroke={belt.edge} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M25 18 L21 28 L26.5 26 L28 19.5 Z" fill={belt.color} stroke={belt.edge} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M31 18 L35.5 27 L30 25.5 L28.6 19.5 Z" fill={belt.color} stroke={belt.edge} strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function HeatBar({ mastery, belt, className }) {
  const filled = Math.round(mastery * 5);
  return (
    <svg viewBox="0 0 132 16" className={className} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={i * 26 + 1} y="2" width="24" height="9" rx="2"
          fill={i < filled ? belt.color : 'transparent'}
          stroke={i < filled ? belt.edge : 'rgba(23,20,15,0.28)'}
          strokeWidth="1" strokeDasharray={i < filled ? undefined : '3 2'} />
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={i} x1={i * 26 + (i === 0 ? 1 : i === 5 ? 1 : 1)} y1="13" x2={i * 26 + 1} y2="16"
          stroke="rgba(23,20,15,0.45)" strokeWidth={i === 0 || i === 5 ? 1.6 : 0.8} />
      ))}
    </svg>
  );
}

function SealMark({ className }) {
  return (
    <svg viewBox="0 0 44 44" className={className} aria-hidden="true">
      <rect x="2" y="2" width="40" height="40" rx="5" fill="var(--color-vermilion)" transform="rotate(-2 22 22)" />
      <g stroke="var(--color-tatami)" strokeWidth="3.4" strokeLinecap="round" fill="none">
        <path d="M12 15 Q 22 11 32 14" />
        <path d="M22 13 L 21 33" />
        <path d="M14 26 Q 22 22 30 25" />
        <path d="M13 33 L 31 32" />
      </g>
    </svg>
  );
}

/* ─────────────────────────────── small UI ──────────────────────────────── */

function Btn({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-1.5 rounded-md border border-ink/25 bg-paper px-3 py-1.5 text-[13px] font-semibold text-ink shadow-[0_1px_0_rgba(23,20,15,0.18)] transition-colors hover:bg-tatami-deep focus-visible:outline-2 focus-visible:outline-vermilion focus-visible:outline-offset-2 ${className}`}
    >
      {children}
    </button>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/55 p-4 backdrop-blur-[2px] sm:items-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`anim-rise relative my-6 w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-lg border-2 border-ink bg-paper shadow-[8px_8px_0_rgba(23,20,15,0.35)]`}>
        <div className="flex items-center justify-between border-b-2 border-ink/80 px-5 py-3">
          <h2 className="font-display text-lg font-extrabold uppercase tracking-wider text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog"
            className="rounded p-1 text-ink hover:bg-tatami-deep focus-visible:outline-2 focus-visible:outline-vermilion">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────── main app ──────────────────────────────── */

export default function App() {
  const consoleCtx = useConsoleBus();
  const [state, setState] = useState(loadState);
  const [helpOpen, setHelpOpen] = useState(() => !loadStateSeen());
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [editing, setEditing] = useState(null); // objection id | 'new' | null
  const [drill, setDrill] = useState(null); // { queue:[ids], i, revealed, results:{again,hard,easy}, done }
  const [toast, setToast] = useState(null); // { msg, undo? }
  const [copied, setCopied] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [copilotObId, setCopilotObId] = useState('');
  const toastTimer = useRef(null);
  const fileRef = useRef(null);

  function loadStateSeen() { return loadState().seenGuide; }

  /* autosave (debounced) */
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* full/blocked */ }
    }, 350);
    return () => clearTimeout(t);
  }, [state]);

  /* derived */
  const now = Date.now();
  const objections = state.objections;
  const dueIds = useMemo(
    () => objections.filter((o) => o.reps === 0 || o.dueAt <= now).map((o) => o.id),
    [objections, now],
  );
  const catStats = useMemo(() => CATEGORIES.map((c) => {
    const items = objections.filter((o) => o.category === c.id);
    const mastery = items.length ? items.reduce((a, o) => a + o.box / 5, 0) / items.length : 0;
    const due = items.filter((o) => o.reps === 0 || o.dueAt <= now).length;
    return { ...c, count: items.length, mastery, due, belt: beltFor(mastery) };
  }), [objections, now]);
  const overallMastery = objections.length
    ? objections.reduce((a, o) => a + o.box / 5, 0) / objections.length : 0;
  const overallBelt = beltFor(overallMastery);
  const totalReps = objections.reduce((a, o) => a + o.reps, 0);
  const streakLive = state.streak.lastDay === todayStr() || state.streak.lastDay === yesterdayStr()
    ? state.streak.current : 0;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return objections
      .filter((o) => (catFilter === 'all' ? true : o.category === catFilter))
      .filter((o) => !q || [o.objection, o.rootCause, o.counter, o.proofPoint].join(' ').toLowerCase().includes(q))
      .sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0));
  }, [objections, query, catFilter]);

  /* actions */
  const patch = useCallback((fn) => setState((s) => normalize(fn(s))), []);

  const flashCopied = (key) => { setCopied(key); setTimeout(() => setCopied(''), 1600); };
  const showToast = (msg, undo) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), 7000);
  };

  const removeObjection = (id) => {
    const idx = objections.findIndex((o) => o.id === id);
    if (idx < 0) return;
    const removed = objections[idx];
    patch((s) => ({ ...s, objections: s.objections.filter((o) => o.id !== id) }));
    showToast(`Removed "${removed.objection.slice(0, 42)}${removed.objection.length > 42 ? '…' : ''}"`, () => {
      patch((s) => {
        const arr = [...s.objections];
        arr.splice(Math.min(idx, arr.length), 0, removed);
        return { ...s, objections: arr };
      });
      setToast(null);
    });
  };

  const saveObjection = (data, id) => {
    if (id && id !== 'new') {
      patch((s) => ({ ...s, objections: s.objections.map((o) => (o.id === id ? { ...o, ...data } : o)) }));
    } else {
      patch((s) => ({ ...s, objections: [...s.objections, normalizeObjection({ ...data, dueAt: 0 })] }));
    }
    setEditing(null);
  };

  const bumpStreak = (s) => {
    const t = todayStr();
    if (s.streak.lastDay === t) return s.streak;
    const current = s.streak.lastDay === yesterdayStr() ? s.streak.current + 1 : 1;
    return { current, best: Math.max(current, s.streak.best), lastDay: t };
  };

  const gradeCard = (id, grade) => {
    patch((s) => {
      const objectionsNext = s.objections.map((o) => {
        if (o.id !== id) return o;
        let box = o.box;
        let dueAt;
        const nowMs = Date.now();
        if (grade === 'again') { box = 0; dueAt = nowMs + 10 * 60000; }
        else if (grade === 'hard') { box = Math.max(1, box); dueAt = nowMs + 1 * DAY; }
        else { box = Math.min(5, box + 1); dueAt = nowMs + INTERVALS[Math.min(5, box)] * DAY; }
        return { ...o, box, dueAt, reps: o.reps + 1, lastGrade: grade };
      });
      return { ...s, objections: objectionsNext, streak: bumpStreak(s) };
    });
    setDrill((d) => {
      if (!d) return d;
      const results = { ...d.results, [grade]: d.results[grade] + 1 };
      const queue = grade === 'again' ? [...d.queue, d.queue[d.i]] : d.queue;
      const i = d.i + 1;
      if (i >= queue.length) return { ...d, results, queue, done: true };
      return { ...d, results, queue, i, revealed: false };
    });
  };

  const startDrill = (scope = 'due') => {
    let pool;
    if (scope === 'due') pool = objections.filter((o) => o.reps === 0 || o.dueAt <= Date.now());
    else if (scope === 'all') pool = [...objections];
    else pool = objections.filter((o) => o.category === scope);
    if (!pool.length) { showToast('Nothing to drill in that scope — add cards or wait for reviews to come due.'); return; }
    const queue = [...pool].sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0)).map((o) => o.id);
    setDrill({ queue, i: 0, revealed: false, results: { again: 0, hard: 0, easy: 0 }, done: false });
  };

  const doReset = () => {
    patch(() => ({ ...normalize({}), seenGuide: true }));
    setConfirmReset(false);
    setEditing(null);
    showToast('Dojo cleared. A fresh mat awaits.');
  };

  const copyMarkdown = useCallback(() => {
    copyText(libraryMarkdown(state));
    flashCopied('md');
    showToast('Dojo scroll copied as Markdown.');
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportJSON = () => downloadFile('objection-dojo.json', 'application/json', JSON.stringify(state, null, 2));
  const exportCSV = () => {
    const head = ['category', 'objection', 'root_cause', 'counter', 'proof_point', 'box', 'reps', 'status'];
    const rows = objections.map((o) => [
      catLabel(o.category), o.objection, o.rootCause, o.counter, o.proofPoint, o.box, o.reps, dueLabel(o),
    ].map(csvCell).join(','));
    downloadFile('objection-dojo.csv', 'text/csv', [head.join(','), ...rows].join('\n'));
  };
  const importJSON = (file) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const next = normalize(JSON.parse(String(r.result)));
        setState({ ...next, seenGuide: true });
        showToast(`Imported ${next.objections.length} objection(s).`);
      } catch { showToast('That file did not parse as dojo JSON.'); }
    };
    r.readAsText(file);
  };

  /* keyboard */
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); copyMarkdown(); return; }
      if (e.key === 'Escape') {
        if (drill) setDrill(null);
        else if (editing) setEditing(null);
        else if (helpOpen) { setHelpOpen(false); patch((s) => ({ ...s, seenGuide: true })); }
        return;
      }
      if (typing) return;
      if (e.key === '?') { e.preventDefault(); setHelpOpen(true); return; }
      if (drill) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setDrill((d) => (d && !d.done ? { ...d, revealed: true } : d)); }
        else if (drill.revealed && !drill.done) {
          if (e.key === '1') gradeCard(drill.queue[drill.i], 'again');
          if (e.key === '2') gradeCard(drill.queue[drill.i], 'hard');
          if (e.key === '3') gradeCard(drill.queue[drill.i], 'easy');
        }
        return;
      }
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); setEditing('new'); }
      if (e.key.toLowerCase() === 'd') { e.preventDefault(); startDrill('due'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const closeHelp = () => { setHelpOpen(false); patch((s) => ({ ...s, seenGuide: true })); };
  const currentCard = drill && !drill.done ? objections.find((o) => o.id === drill.queue[drill.i]) : null;

  /* ── render ── */
  return (
    <div className="min-h-screen bg-tatami-weave text-ink font-body">
      {/* ───────── header ───────── */}
      <header className="no-print border-b-2 border-ink/80 bg-paper/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <SealMark className="h-11 w-11 shrink-0 drop-shadow-[2px_2px_0_rgba(23,20,15,0.25)]" />
            <div>
              <h1 className="font-display text-2xl font-extrabold uppercase leading-none tracking-[0.14em] text-ink sm:text-3xl">
                Objection<span className="text-vermilion"> Dojo</span>
              </h1>
              <p className="mt-1 text-[13px] font-medium text-ink-soft">
                Drill sales objections until they're reflexes.
              </p>
            </div>
            {consoleCtx && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/25 bg-paper px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft"
                title="Linked to BizDev Console"
              >
                <Cable className="h-3.5 w-3.5 text-vermilion" aria-hidden />
                Console linked{consoleCtx.profile?.company ? ` · ${consoleCtx.profile.company}` : ''}
              </span>
            )}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Btn onClick={() => { setState(demoState()); setCatFilter('all'); setQuery(''); showToast('Demo dojo loaded — Clearlane RevOps.'); }}>
              <ScrollText className="h-4 w-4" aria-hidden /> Load demo
            </Btn>
            {confirmReset ? (
              <Btn onClick={doReset} className="!border-vermilion !bg-vermilion !text-paper hover:!bg-vermilion/90">
                <RotateCcw className="h-4 w-4" aria-hidden /> Confirm reset
              </Btn>
            ) : (
              <Btn onClick={() => { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 4000); }}>
                <RotateCcw className="h-4 w-4" aria-hidden /> Reset
              </Btn>
            )}
            <Btn onClick={() => setHelpOpen(true)}>
              <CircleHelp className="h-4 w-4" aria-hidden /> How to use
            </Btn>
            <Btn onClick={copyMarkdown} title="Ctrl/Cmd+S">
              {copied === 'md' ? <Check className="h-4 w-4 text-belt-green" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />} Copy Markdown
            </Btn>
            <Btn onClick={exportJSON}><Download className="h-4 w-4" aria-hidden /> JSON</Btn>
            <Btn onClick={exportCSV}><Table2 className="h-4 w-4" aria-hidden /> CSV</Btn>
            <Btn onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" aria-hidden /> Import</Btn>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Import dojo JSON file"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importJSON(f); e.target.value = ''; }} />
            <Btn onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden /> Print</Btn>
          </div>
        </div>
      </header>

      {/* ───────── dojo status strip ───────── */}
      <section aria-label="Dojo status" className="no-print border-b border-ink/20 bg-gradient-to-b from-paper/40 to-transparent">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[auto_auto_1fr]">
          {/* enso + streak */}
          <div className="flex items-center gap-5">
            <div className="relative h-32 w-32 shrink-0 text-ink">
              <Enso id="hero" className="absolute inset-0 h-full w-full" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-4xl font-extrabold leading-none tabular-nums">{streakLive}</span>
                <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-soft">day streak</span>
              </div>
            </div>
            <div className="space-y-1.5 text-[13px] text-ink-soft">
              <p className="flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-vermilion" aria-hidden />
                <span><strong className="text-ink tabular-nums">{streakLive}</strong> day streak · best <strong className="text-ink tabular-nums">{state.streak.best}</strong></span>
              </p>
              <p className="flex items-center gap-1.5">
                <Swords className="h-4 w-4 text-vermilion" aria-hidden />
                <span><strong className="text-ink tabular-nums">{totalReps}</strong> lifetime reps · <strong className="text-ink tabular-nums">{objections.length}</strong> cards</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-vermilion" aria-hidden />
                <span><strong className="text-ink tabular-nums">{dueIds.length}</strong> due for review now</span>
              </p>
            </div>
          </div>

          {/* rank card */}
          <div className="flex items-center gap-4 rounded-lg border-2 border-ink/80 bg-paper px-5 py-4 shadow-[4px_4px_0_rgba(23,20,15,0.22)]">
            <BeltIcon belt={overallBelt} className="h-14 w-24 shrink-0" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-soft">Current rank</p>
              <p className="font-display text-xl font-extrabold uppercase tracking-wide">{overallBelt.label}</p>
              <p className="text-[12px] text-ink-soft"><span className="tabular-nums">{Math.round(overallMastery * 100)}%</span> library mastery</p>
            </div>
          </div>

          {/* confidence heat */}
          <div className="min-w-0">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-ink-soft">Confidence heat by category</p>
            <div className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
              {catStats.map((c) => (
                <button key={c.id} onClick={() => setCatFilter(catFilter === c.id ? 'all' : c.id)}
                  className={`group flex min-w-0 items-center gap-2 rounded px-1 py-0.5 text-left focus-visible:outline-2 focus-visible:outline-vermilion ${catFilter === c.id ? 'bg-tatami-deep' : 'hover:bg-tatami-deep/60'}`}
                  aria-label={`Filter library to ${c.label}`}>
                  <span className="w-[88px] flex-none truncate text-[12px] font-semibold">{c.label}</span>
                  <HeatBar mastery={c.mastery} belt={c.belt} className="h-4 w-[96px] flex-none" />
                  <span className="ml-auto flex-none whitespace-nowrap text-[11px] tabular-nums text-ink-soft">
                    {c.count ? `${Math.round(c.mastery * 100)}%` : '—'}
                    {c.due > 0 && <span className="ml-1 rounded-sm bg-vermilion px-1 py-px text-[9px] font-bold text-paper">{c.due} due</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── main ───────── */}
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── library ── */}
        <section aria-label="Objection library" className="min-w-0">
          <div className="no-print mb-4 flex flex-wrap items-center gap-2">
            <h2 className="mr-auto font-display text-lg font-extrabold uppercase tracking-wider">The Library</h2>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search objections…"
                aria-label="Search objections"
                className="w-48 rounded-md border border-ink/30 bg-paper py-1.5 pl-8 pr-2 text-[13px] placeholder:text-ink-soft/60 focus-visible:outline-2 focus-visible:outline-vermilion" />
            </div>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} aria-label="Filter by category"
              className="rounded-md border border-ink/30 bg-paper px-2 py-1.5 text-[13px] focus-visible:outline-2 focus-visible:outline-vermilion">
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <Btn onClick={() => setEditing('new')} className="!border-ink !bg-ink !text-paper hover:!bg-ink/85">
              <Plus className="h-4 w-4" aria-hidden /> New objection
            </Btn>
          </div>

          {/* offer context */}
          <details className="no-print group mb-4 rounded-lg border border-ink/25 bg-paper/80 open:shadow-[3px_3px_0_rgba(23,20,15,0.15)]">
            <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-[13px] font-semibold marker:content-none">
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
              My offer — context the Copilot prompts embed
              <span className="ml-auto truncate text-[12px] font-normal text-ink-soft">{state.offer.name || 'not set yet'}</span>
            </summary>
            <div className="grid gap-3 border-t border-ink/15 px-4 py-3 sm:grid-cols-2">
              <label className="text-[12px] font-semibold text-ink-soft">Offer name
                <input value={state.offer.name} onChange={(e) => patch((s) => ({ ...s, offer: { ...s.offer, name: e.target.value } }))}
                  placeholder="e.g. Clearlane — RevOps Retainer"
                  className="mt-1 w-full rounded-md border border-ink/30 bg-paper px-2.5 py-1.5 text-[13px] font-normal text-ink focus-visible:outline-2 focus-visible:outline-vermilion" />
              </label>
              <label className="text-[12px] font-semibold text-ink-soft">Ideal customer (ICP)
                <input value={state.offer.icp} onChange={(e) => patch((s) => ({ ...s, offer: { ...s.offer, icp: e.target.value } }))}
                  placeholder="Who buys, at what size, in which stack"
                  className="mt-1 w-full rounded-md border border-ink/30 bg-paper px-2.5 py-1.5 text-[13px] font-normal text-ink focus-visible:outline-2 focus-visible:outline-vermilion" />
              </label>
              <label className="text-[12px] font-semibold text-ink-soft sm:col-span-2">What it is, price, promise
                <textarea value={state.offer.description} rows={2}
                  onChange={(e) => patch((s) => ({ ...s, offer: { ...s.offer, description: e.target.value } }))}
                  placeholder="One or two sentences a stranger would understand."
                  className="mt-1 w-full resize-y rounded-md border border-ink/30 bg-paper px-2.5 py-1.5 text-[13px] font-normal text-ink focus-visible:outline-2 focus-visible:outline-vermilion" />
              </label>
            </div>
          </details>

          {/* empty state */}
          {objections.length === 0 && (
            <div className="rounded-lg border-2 border-dashed border-ink/30 bg-paper/60 px-6 py-12 text-center">
              <div className="mx-auto mb-4 h-20 w-20 text-ink/70"><Enso id="empty" className="h-full w-full" /></div>
              <h3 className="font-display text-lg font-extrabold uppercase tracking-wide">The mat is empty</h3>
              <p className="mx-auto mt-2 max-w-md text-[13px] text-ink-soft">
                Every reflex starts with one objection written down. Add the last objection that actually stung on a call —
                or load the demo to see a black-belt library, then replace it with your own.
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <Btn onClick={() => setEditing('new')} className="!border-ink !bg-ink !text-paper hover:!bg-ink/85">
                  <Plus className="h-4 w-4" aria-hidden /> Add my first objection
                </Btn>
                <Btn onClick={() => setState(demoState())}><ScrollText className="h-4 w-4" aria-hidden /> Load demo</Btn>
              </div>
            </div>
          )}

          {objections.length > 0 && visible.length === 0 && (
            <div className="rounded-lg border border-ink/25 bg-paper/60 px-6 py-8 text-center text-[13px] text-ink-soft">
              No cards match that search or filter. Loosen the filter, or add the objection you were looking for — if a
              prospect said it once, it belongs in the library.
            </div>
          )}

          {/* cards */}
          <ul className="space-y-3">
            {visible.map((ob) => {
              const b = beltFor(ob.box / 5);
              const isDue = ob.reps === 0 || ob.dueAt <= now;
              return (
                <li key={ob.id} className="group relative overflow-hidden rounded-lg border border-ink/30 bg-paper shadow-[3px_3px_0_rgba(23,20,15,0.14)]">
                  <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: b.color, borderRight: `1px solid ${b.edge}` }} aria-hidden />
                  <div className="px-5 py-4 pl-6">
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">
                          <span>{catLabel(ob.category)}</span>
                          <span aria-hidden>·</span>
                          <span className="tabular-nums">box {ob.box}/5</span>
                          <span aria-hidden>·</span>
                          <span className="tabular-nums">{ob.reps} reps</span>
                          <span className={`rounded-sm px-1.5 py-px ${isDue ? 'bg-vermilion text-paper' : 'bg-tatami-deep text-ink-soft'}`}>
                            {dueLabel(ob)}
                          </span>
                        </div>
                        <p className="font-display text-[17px] font-bold leading-snug">"{ob.objection}"</p>
                      </div>
                      <div className="no-print flex shrink-0 gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                        <button onClick={() => setEditing(ob.id)} aria-label={`Edit objection: ${ob.objection}`}
                          className="rounded p-1.5 text-ink-soft hover:bg-tatami-deep hover:text-ink focus-visible:outline-2 focus-visible:outline-vermilion">
                          <Pencil className="h-4 w-4" aria-hidden />
                        </button>
                        <button onClick={() => removeObjection(ob.id)} aria-label={`Delete objection: ${ob.objection}`}
                          className="rounded p-1.5 text-ink-soft hover:bg-vermilion/10 hover:text-vermilion focus-visible:outline-2 focus-visible:outline-vermilion">
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                    <dl className="mt-3 space-y-2 text-[13px] leading-relaxed">
                      {ob.rootCause && (
                        <div className="flex gap-2">
                          <dt className="w-20 shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft pt-0.5">Root cause</dt>
                          <dd className="text-ink-soft">{ob.rootCause}</dd>
                        </div>
                      )}
                      {ob.counter && (
                        <div className="flex gap-2">
                          <dt className="w-20 shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft pt-0.5">Counter</dt>
                          <dd>{ob.counter}</dd>
                        </div>
                      )}
                      {ob.proofPoint && (
                        <div className="flex gap-2">
                          <dt className="w-20 shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft pt-0.5">Proof</dt>
                          <dd className="italic text-ink-soft">{ob.proofPoint}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── right rail ── */}
        <aside className="no-print space-y-6">
          {/* drill panel */}
          <section aria-label="Drill" className="rounded-lg border-2 border-ink bg-ink px-5 py-5 text-paper shadow-[5px_5px_0_rgba(23,20,15,0.3)]">
            <h2 className="font-display text-lg font-extrabold uppercase tracking-wider">Enter the mat</h2>
            <p className="mt-1 text-[13px] text-paper/70">
              {dueIds.length > 0
                ? <><strong className="text-paper tabular-nums">{dueIds.length}</strong> card{dueIds.length === 1 ? ' is' : 's are'} due. Ten minutes of reps beats an hour of reading.</>
                : objections.length > 0
                  ? 'Nothing due right now. Drill the whole library to stay sharp, or come back tomorrow.'
                  : 'Add objections to the library and the dojo will schedule your reps.'}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button onClick={() => startDrill('due')} disabled={!objections.length}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-vermilion px-4 py-2.5 font-display text-[14px] font-extrabold uppercase tracking-wider text-paper shadow-[0_2px_0_rgba(0,0,0,0.4)] transition-transform hover:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-2">
                <Play className="h-4 w-4" aria-hidden /> Drill due cards ({dueIds.length})
              </button>
              <button onClick={() => startDrill('all')} disabled={!objections.length}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-paper/30 px-4 py-2 text-[13px] font-semibold text-paper/90 hover:bg-paper/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-paper">
                <Swords className="h-4 w-4" aria-hidden /> Drill entire library
              </button>
            </div>
            <p className="mt-3 text-[11px] text-paper/50">
              Shortcut: press <kbd className="rounded border border-paper/30 px-1 font-mono">D</kbd> anywhere. In a drill:
              space reveals, 1/2/3 grades again/hard/easy.
            </p>
          </section>

          {/* copilot */}
          <section aria-label="Claude Copilot" className="rounded-lg border-2 border-ink/80 bg-paper px-5 py-5 shadow-[4px_4px_0_rgba(23,20,15,0.2)]">
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold uppercase tracking-wider">
              <Sparkles className="h-5 w-5 text-vermilion" aria-hidden /> Claude Copilot
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              Each button builds a complete prompt around your live library. Paste into{' '}
              <span className="font-semibold text-ink">claude.ai</span> — works with the standard $20 Claude subscription. No API key needed.
            </p>
            <div className="mt-4 space-y-3">
              <CopilotAction
                title="Scout new objections"
                desc="Claude generates 10 objections for your offer — with root causes, counters, and proof points to gather."
                copied={copied === 'cp1'}
                onCopy={() => { copyText(promptGenerate(state, consoleCtx)); flashCopied('cp1'); }}
              />
              <div className="rounded-md border border-ink/20 bg-tatami/60 p-3">
                <p className="text-[13px] font-bold">Grade my counter</p>
                <p className="mt-0.5 text-[12px] text-ink-soft">Pick a card — Claude scores it on empathy, reframe, proof, and advance, then rewrites it stronger.</p>
                <div className="mt-2 flex gap-2">
                  <select value={copilotObId} onChange={(e) => setCopilotObId(e.target.value)} aria-label="Choose objection to grade"
                    className="min-w-0 flex-1 rounded-md border border-ink/30 bg-paper px-2 py-1.5 text-[12px] focus-visible:outline-2 focus-visible:outline-vermilion">
                    <option value="">Choose an objection…</option>
                    {objections.map((o) => (
                      <option key={o.id} value={o.id}>{o.objection.slice(0, 48)}{o.objection.length > 48 ? '…' : ''}</option>
                    ))}
                  </select>
                  <button
                    disabled={!copilotObId}
                    onClick={() => {
                      const ob = objections.find((o) => o.id === copilotObId);
                      if (ob) { copyText(promptGrade(state, ob, consoleCtx)); flashCopied('cp2'); }
                    }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-ink bg-ink px-3 py-1.5 text-[12px] font-semibold text-paper hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-vermilion focus-visible:outline-offset-2">
                    {copied === 'cp2' ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />} Copy prompt
                  </button>
                </div>
              </div>
              <CopilotAction
                title="Spar with a hard prospect"
                desc="A full roleplay brief: Claude plays a skeptical buyer who presses your weakest categories for 5+ rounds, then scores you."
                copied={copied === 'cp3'}
                onCopy={() => { copyText(promptSpar(state, consoleCtx)); flashCopied('cp3'); }}
              />
            </div>
            <div className="mt-4 border-t border-ink/15 pt-3">
              <label className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-ink-soft">
                <MessageSquareQuote className="h-4 w-4" aria-hidden /> Sensei notes — paste Claude's verdicts here
              </label>
              <textarea value={state.senseiNotes} rows={4}
                onChange={(e) => patch((s) => ({ ...s, senseiNotes: e.target.value }))}
                placeholder="What Claude told you to fix. Saved automatically."
                className="mt-2 w-full resize-y rounded-md border border-ink/25 bg-tatami/50 px-2.5 py-2 text-[13px] leading-relaxed placeholder:text-ink-soft/50 focus-visible:outline-2 focus-visible:outline-vermilion" />
            </div>
          </section>
        </aside>
      </main>

      <footer className="no-print border-t border-ink/15 py-6 text-center text-[11px] text-ink-soft">
        <p>Objection Dojo · your reps live in this browser only (localStorage) · export JSON to back up or move dojos.</p>
      </footer>

      {/* ── print artifact ── */}
      <section className="print-scroll hidden" aria-hidden="true">
        <h1>Objection Dojo — {state.offer.name || 'My offer'}</h1>
        {state.offer.description && <p className="muted">{state.offer.description}</p>}
        <p className="muted">
          Rank: {overallBelt.label} ({Math.round(overallMastery * 100)}% mastery) · Streak: {streakLive} day(s) · {objections.length} cards · {totalReps} lifetime reps
        </p>
        {CATEGORIES.map((c) => {
          const items = objections.filter((o) => o.category === c.id);
          if (!items.length) return null;
          return (
            <div key={c.id}>
              <h2>{c.label}</h2>
              {items.map((ob) => (
                <div key={ob.id} className="print-card">
                  <h3>"{ob.objection}"</h3>
                  {ob.rootCause && <p><strong>Root cause:</strong> {ob.rootCause}</p>}
                  {ob.counter && <p><strong>Counter:</strong> {ob.counter}</p>}
                  {ob.proofPoint && <p><strong>Proof:</strong> {ob.proofPoint}</p>}
                  <p className="muted">Box {ob.box}/5 · {ob.reps} reps · {dueLabel(ob)}</p>
                </div>
              ))}
            </div>
          );
        })}
      </section>

      {/* ───────── drill overlay ───────── */}
      {drill && (
        <div role="dialog" aria-modal="true" aria-label="Drill mode"
          className="fixed inset-0 z-50 flex flex-col bg-ink text-paper">
          <div className="bg-tatami-weave-dark absolute inset-0 opacity-100" aria-hidden />
          <div className="relative flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 text-vermilion"><Enso id="drill" className="h-full w-full" /></div>
              <span className="font-display text-sm font-extrabold uppercase tracking-[0.2em] text-paper/80">Drill mode</span>
            </div>
            {!drill.done && (
              <span className="text-[13px] tabular-nums text-paper/60">card {drill.i + 1} / {drill.queue.length}</span>
            )}
            <button onClick={() => setDrill(null)} aria-label="Leave drill mode"
              className="rounded p-2 text-paper/70 hover:bg-paper/10 hover:text-paper focus-visible:outline-2 focus-visible:outline-vermilion">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          {/* progress */}
          {!drill.done && (
            <div className="relative mx-5 h-1 overflow-hidden rounded-full bg-paper/15" aria-hidden>
              <div className="h-full bg-vermilion transition-all" style={{ width: `${(drill.i / drill.queue.length) * 100}%` }} />
            </div>
          )}

          <div className="relative flex flex-1 items-center justify-center overflow-y-auto p-5">
            {drill.done ? (
              <div className="anim-rise w-full max-w-lg rounded-xl border-2 border-paper/25 bg-paper p-8 text-center text-ink shadow-2xl">
                <div className="mx-auto mb-3 h-16 w-16 text-vermilion"><Enso id="done" className="h-full w-full" /></div>
                <h2 className="font-display text-2xl font-extrabold uppercase tracking-wider">Session complete</h2>
                <p className="mt-2 text-[13px] text-ink-soft">
                  {drill.results.easy + drill.results.hard + drill.results.again} reps banked. The schedule already knows when each card returns.
                </p>
                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg border border-ink/20 bg-tatami/60 py-3">
                    <p className="font-display text-2xl font-extrabold tabular-nums text-vermilion">{drill.results.again}</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">again</p>
                  </div>
                  <div className="rounded-lg border border-ink/20 bg-tatami/60 py-3">
                    <p className="font-display text-2xl font-extrabold tabular-nums text-belt-orange">{drill.results.hard}</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">hard</p>
                  </div>
                  <div className="rounded-lg border border-ink/20 bg-tatami/60 py-3">
                    <p className="font-display text-2xl font-extrabold tabular-nums text-belt-green">{drill.results.easy}</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">easy</p>
                  </div>
                </div>
                <button onClick={() => setDrill(null)}
                  className="mt-6 inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2.5 font-display text-[14px] font-extrabold uppercase tracking-wider text-paper hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-vermilion focus-visible:outline-offset-2">
                  Bow out
                </button>
              </div>
            ) : currentCard ? (
              <div className="anim-rise w-full max-w-2xl">
                <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-[0.24em] text-paper/50">
                  {catLabel(currentCard.category)} · box {currentCard.box}/5
                </p>
                <div className="rounded-xl border-2 border-paper/25 bg-paper px-7 py-8 text-ink shadow-2xl">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-vermilion">The prospect says</p>
                  <p className="mt-2 font-display text-2xl font-extrabold leading-snug sm:text-3xl">"{currentCard.objection}"</p>
                  {!drill.revealed ? (
                    <p className="mt-6 text-[14px] italic text-ink-soft">Say your counter out loud. Actually out loud. Then reveal.</p>
                  ) : (
                    <div className="anim-rise mt-6 space-y-4 border-t-2 border-ink/15 pt-5 text-[15px] leading-relaxed">
                      {currentCard.rootCause && (
                        <p><span className="mr-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">Root cause</span>{currentCard.rootCause}</p>
                      )}
                      <p><span className="mr-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">Counter</span>{currentCard.counter || <em className="text-ink-soft">No counter written yet — grade Again and go write one.</em>}</p>
                      {currentCard.proofPoint && (
                        <p className="italic text-ink-soft"><span className="mr-2 not-italic text-[10px] font-bold uppercase tracking-[0.18em]">Proof</span>{currentCard.proofPoint}</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-6 flex justify-center gap-3">
                  {!drill.revealed ? (
                    <button onClick={() => setDrill((d) => ({ ...d, revealed: true }))}
                      className="inline-flex items-center gap-2 rounded-md bg-vermilion px-8 py-3 font-display text-[15px] font-extrabold uppercase tracking-wider text-paper shadow-[0_3px_0_rgba(0,0,0,0.4)] hover:translate-y-px focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-2">
                      <Eye className="h-5 w-5" aria-hidden /> Reveal counter
                    </button>
                  ) : (
                    <>
                      <GradeBtn label="Again" sub="reset · back in 10 min" kbd="1" tone="#c73a1d" onClick={() => gradeCard(currentCard.id, 'again')} />
                      <GradeBtn label="Hard" sub="shaky · tomorrow" kbd="2" tone="#cf6f2b" onClick={() => gradeCard(currentCard.id, 'hard')} />
                      <GradeBtn label="Easy" sub="reflex · schedule out" kbd="3" tone="#4a7040" onClick={() => gradeCard(currentCard.id, 'easy')} />
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ───────── edit / new modal ───────── */}
      {editing && (
        <ObjectionForm
          key={editing}
          initial={editing === 'new' ? null : objections.find((o) => o.id === editing)}
          onCancel={() => setEditing(null)}
          onSave={(data) => saveObjection(data, editing)}
        />
      )}

      {/* ───────── help modal ───────── */}
      {helpOpen && (
        <Modal title="How to use the dojo" onClose={closeHelp} wide>
          <ol className="list-none space-y-3 text-[14px] leading-relaxed">
            {[
              ['Set your offer', 'Open "My offer" above the library and describe what you sell and to whom. Every Copilot prompt embeds it.'],
              ['Stock the library', 'Add each objection you actually hear: the prospect\'s exact words, the root cause underneath, your counter, and a proof point. Real quotes beat paraphrases.'],
              ['Enter the mat', 'Hit "Drill due cards" (or press D). Read the objection, say your counter out loud, reveal, then grade yourself: Again, Hard, or Easy.'],
              ['Trust the schedule', 'Easy cards return later (1, 3, 7, 14, then 30 days out). Again resets a card to box 0. The "due" queue is your daily workout.'],
              ['Watch the heat', 'The category heat bars show where you\'re still a white belt. Click a bar to filter the library to that category and fix the weak counters.'],
              ['Train with Claude', 'Use the Copilot panel: scout new objections, get a counter graded and rewritten, or spar with a simulated hard prospect. Copy the prompt, paste into claude.ai, and save the verdicts in Sensei notes.'],
              ['Keep the streak', 'One rep a day keeps the streak alive. The enso counts your consecutive training days.'],
              ['Export your scroll', 'Copy Markdown (Ctrl/Cmd+S) for docs and wikis, CSV for spreadsheets, JSON for backup — and Import JSON to restore or share a dojo.'],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink font-display text-[12px] font-extrabold text-paper">{i + 1}</span>
                <p><strong>{t}.</strong> <span className="text-ink-soft">{d}</span></p>
              </li>
            ))}
          </ol>
          <h3 className="mt-5 font-display text-sm font-extrabold uppercase tracking-wider">Keyboard</h3>
          <div className="mt-2 grid grid-cols-1 gap-x-8 gap-y-1 text-[13px] sm:grid-cols-2">
            {[
              ['?', 'open this guide'], ['Esc', 'close dialogs / leave drill'],
              ['N', 'new objection'], ['D', 'drill due cards'],
              ['Space / Enter', 'reveal counter (in drill)'], ['1 / 2 / 3', 'grade again / hard / easy'],
              ['Ctrl/Cmd + S', 'copy library as Markdown'],
            ].map(([k, d]) => (
              <p key={k} className="flex items-baseline gap-2">
                <kbd className="rounded border border-ink/30 bg-tatami-deep px-1.5 py-0.5 font-mono text-[11px]">{k}</kbd>
                <span className="text-ink-soft">{d}</span>
              </p>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <Btn onClick={closeHelp} className="!border-ink !bg-ink !text-paper hover:!bg-ink/85">Begin training</Btn>
          </div>
        </Modal>
      )}

      {/* ───────── toast ───────── */}
      {toast && (
        <div className="anim-rise fixed bottom-5 left-1/2 z-[60] flex w-[min(92vw,480px)] -translate-x-1/2 items-center gap-3 rounded-lg border-2 border-ink bg-paper px-4 py-3 text-[13px] shadow-[5px_5px_0_rgba(23,20,15,0.3)]" role="status">
          <span className="min-w-0 flex-1">{toast.msg}</span>
          {toast.undo && (
            <button onClick={toast.undo}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-ink bg-ink px-2.5 py-1 font-semibold text-paper hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-vermilion focus-visible:outline-offset-2">
              <Undo2 className="h-3.5 w-3.5" aria-hidden /> Undo
            </button>
          )}
          <button onClick={() => setToast(null)} aria-label="Dismiss notification"
            className="shrink-0 rounded p-1 text-ink-soft hover:bg-tatami-deep focus-visible:outline-2 focus-visible:outline-vermilion">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── subcomponents ─────────────────────────────── */

function CopilotAction({ title, desc, onCopy, copied }) {
  return (
    <div className="rounded-md border border-ink/20 bg-tatami/60 p-3">
      <p className="text-[13px] font-bold">{title}</p>
      <p className="mt-0.5 text-[12px] text-ink-soft">{desc}</p>
      <button onClick={onCopy}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-ink bg-ink px-3 py-1.5 text-[12px] font-semibold text-paper hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-vermilion focus-visible:outline-offset-2">
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
        {copied ? 'Copied — paste into claude.ai' : 'Copy prompt'}
      </button>
    </div>
  );
}

function GradeBtn({ label, sub, kbd, tone, onClick }) {
  return (
    <button onClick={onClick}
      className="group flex min-w-[104px] flex-col items-center rounded-lg border-2 border-paper/25 bg-paper/5 px-4 py-2.5 backdrop-blur-sm transition-colors hover:bg-paper/10 focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-2"
      style={{ boxShadow: `inset 0 -3px 0 ${tone}` }}>
      <span className="font-display text-[15px] font-extrabold uppercase tracking-wider" style={{ color: tone === '#1b1712' ? undefined : tone }}>{label}</span>
      <span className="mt-0.5 text-[10px] text-paper/60">{sub}</span>
      <span className="mt-1 rounded border border-paper/25 px-1 font-mono text-[10px] text-paper/50">{kbd}</span>
    </button>
  );
}

function ObjectionForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({
    category: initial?.category || 'price',
    objection: initial?.objection || '',
    rootCause: initial?.rootCause || '',
    counter: initial?.counter || '',
    proofPoint: initial?.proofPoint || '',
  }));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.objection.trim().length > 0;
  const field = 'mt-1 w-full rounded-md border border-ink/30 bg-paper px-2.5 py-2 text-[13px] leading-relaxed focus-visible:outline-2 focus-visible:outline-vermilion';
  return (
    <Modal title={initial ? 'Edit objection' : 'New objection'} onClose={onCancel} wide>
      <form onSubmit={(e) => { e.preventDefault(); if (valid) onSave({ ...form, objection: form.objection.trim() }); }}
        className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
          <label className="text-[12px] font-semibold text-ink-soft">Category
            <select value={form.category} onChange={set('category')} className={field}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          <label className="text-[12px] font-semibold text-ink-soft">The objection — prospect's exact words
            <input value={form.objection} onChange={set('objection')} autoFocus
              placeholder={'e.g. "We already have someone who does this."'} className={field} />
          </label>
        </div>
        <label className="block text-[12px] font-semibold text-ink-soft">Root cause — the fear or incentive underneath
          <input value={form.rootCause} onChange={set('rootCause')}
            placeholder="What are they really protecting or afraid of?" className={field} />
        </label>
        <label className="block text-[12px] font-semibold text-ink-soft">Counter — acknowledge, reframe, proof, question
          <textarea value={form.counter} onChange={set('counter')} rows={4}
            placeholder="Write it as you'd say it out loud. End with a question back." className={field} />
        </label>
        <label className="block text-[12px] font-semibold text-ink-soft">Proof point — the evidence that makes it land
          <input value={form.proofPoint} onChange={set('proofPoint')}
            placeholder="A number, a named result, a client quote." className={field} />
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <Btn type="button" onClick={onCancel}>Cancel</Btn>
          <Btn type="submit" disabled={!valid} className="!border-ink !bg-ink !text-paper hover:!bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40">
            <Check className="h-4 w-4" aria-hidden /> {initial ? 'Save changes' : 'Add to library'}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
