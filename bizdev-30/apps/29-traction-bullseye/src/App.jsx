import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Target, Crosshair, HelpCircle, RotateCcw, Download, Upload, Copy, FileJson, FileText,
  FileSpreadsheet, Printer, X, Plus, Trash2, Undo2, Check, Sparkles, ChevronUp, ChevronDown,
  Search, Filter, Lightbulb, Info, AlertTriangle, Clock, CheckCircle2, XCircle, DollarSign,
  Timer, Gauge, FlaskConical, BookMarked, Share2, Newspaper, Megaphone, LayoutGrid, Radio,
  TrendingUp, TrendingDown, PenLine, Mail, Wrench, BookOpen, Handshake, PhoneCall, Percent,
  Layers, Tent, CalendarDays, Mic, Users,
} from 'lucide-react';

/* ================================================================
   constants
   ================================================================ */

const KEY = 'bizdev:29-traction-bullseye:v1';
const SLUG = '29-traction-bullseye';
const MAX_ACTIVE = 3;
const DAY = 86400000;

const RINGS = [
  { id: 'outer', label: 'Untested', radius: 262.5, tagline: 'The full nineteen — nothing ruled out yet.' },
  { id: 'middle', label: 'Testing', radius: 187.5, tagline: 'A cheap test is in flight.' },
  { id: 'inner', label: 'Focus', radius: 112.5, tagline: 'Proven enough to go all-in.' },
];
const RING_IDS = RINGS.map((r) => r.id);
const RING_META = {
  outer: { label: 'Untested', chip: 'border-cream-300 bg-cream-100 text-ink-700', dark: 'border-cream-200/40 bg-cream-100/10 text-cream-100' },
  middle: { label: 'Testing', chip: 'border-go-500/50 bg-go-500/15 text-go-600', dark: 'border-go-400/50 bg-go-500/20 text-go-400' },
  inner: { label: 'Focus', chip: 'border-bull-500/50 bg-bull-500/15 text-bull-600', dark: 'border-bull-400/50 bg-bull-500/20 text-bull-400' },
};

const RESULT_IDS = ['pending', 'promising', 'no-go', 'inconclusive'];
const RESULT_META = {
  pending: { label: 'Testing', icon: Clock, text: 'text-fog-500', bg: 'bg-fog-500/15', border: 'border-fog-500/40', dot: 'bg-fog-500' },
  promising: { label: 'Promising', icon: CheckCircle2, text: 'text-go-600', bg: 'bg-go-500/15', border: 'border-go-500/40', dot: 'bg-go-500' },
  'no-go': { label: 'No-go', icon: XCircle, text: 'text-bull-600', bg: 'bg-bull-500/15', border: 'border-bull-500/40', dot: 'bg-bull-500' },
  inconclusive: { label: 'Inconclusive', icon: HelpCircle, text: 'text-honey-500', bg: 'bg-honey-500/15', border: 'border-honey-500/40', dot: 'bg-honey-500' },
};
const MARKER_BORDER = {
  none: 'border-ink-900/30',
  pending: 'border-fog-500',
  promising: 'border-go-500',
  'no-go': 'border-bull-500',
  inconclusive: 'border-honey-500',
};

const CHANNELS = [
  { id: 'viral-marketing', name: 'Viral Marketing', icon: Share2, blurb: 'Every user who arrives pulls in the next one — built into the product, not bolted on after launch.' },
  { id: 'pr', name: 'Public Relations', icon: Newspaper, blurb: 'Earned coverage that puts your name in front of people who trust the publication more than they trust an ad.' },
  { id: 'unconventional-pr', name: 'Unconventional PR', icon: Megaphone, blurb: 'Stunts, contests, and PR moves too strange for a normal press release — built to get shared, not just printed.' },
  { id: 'sem', name: 'Search Engine Marketing', icon: Search, blurb: 'Paid placement in front of people already typing the exact words that mean they want what you sell.' },
  { id: 'social-display-ads', name: 'Social & Display Ads', icon: LayoutGrid, blurb: 'Paid placements on the feeds and networks your buyers scroll past every day.' },
  { id: 'offline-ads', name: 'Offline Ads', icon: Radio, blurb: 'Print, radio, transit, direct mail — reach where there is no ad blocker.' },
  { id: 'seo', name: 'Search Engine Optimization', icon: TrendingUp, blurb: 'Ranking organically for the terms your buyers search, for years after you stop paying attention to it.' },
  { id: 'content-marketing', name: 'Content Marketing', icon: PenLine, blurb: 'Guides, posts, and videos that earn attention and trust before you ever ask for the sale.' },
  { id: 'email-marketing', name: 'Email Marketing', icon: Mail, blurb: 'A list you own outright, nurtured and converted on your own schedule — no algorithm standing between you and it.' },
  { id: 'engineering-as-marketing', name: 'Engineering as Marketing', icon: Wrench, blurb: 'Free tools, calculators, or templates that generate demand just by being genuinely useful on their own.' },
  { id: 'target-market-blogs', name: 'Target Market Blogs', icon: BookOpen, blurb: 'Guest posts and placements on the blogs and newsletters your buyers already read and trust.' },
  { id: 'business-development', name: 'Business Development', icon: Handshake, blurb: 'Strategic partnerships that hand you distribution in exchange for something you can genuinely give back.' },
  { id: 'sales', name: 'Sales', icon: PhoneCall, blurb: 'Direct, personal outreach — one relationship at a time, closed by a human, not a funnel.' },
  { id: 'affiliate-programs', name: 'Affiliate Programs', icon: Percent, blurb: 'Partners who market you for a cut of the revenue — they only get paid when it actually works.' },
  { id: 'existing-platforms', name: 'Existing Platforms', icon: Layers, blurb: 'Building on top of an audience someone else already spent years assembling.' },
  { id: 'trade-shows', name: 'Trade Shows', icon: Tent, blurb: 'The floor where your buyers already go shopping, budget in hand.' },
  { id: 'offline-events', name: 'Offline Events', icon: CalendarDays, blurb: 'Meetups, workshops, and pop-ups you host or sponsor — traction with a handshake attached.' },
  { id: 'speaking-engagements', name: 'Speaking Engagements', icon: Mic, blurb: 'A stage that puts you in front of a room that already chose to be qualified.' },
  { id: 'community-building', name: 'Community Building', icon: Users, blurb: 'A space that gathers around a shared identity first, and your product a distant second.' },
];
const CHANNEL_IDS = CHANNELS.map((c) => c.id);
const CHANNEL_BY_ID = Object.fromEntries(CHANNELS.map((c) => [c.id, c]));

const COPILOT_ACTIONS = [
  { id: 'cheap-test', icon: FlaskConical, needsChannel: true, title: 'Design a cheap test', desc: 'A lean, low-cost way to get real signal from one channel in days, not months.' },
  { id: 'interpret', icon: Gauge, needsChannel: true, title: 'Interpret my results', desc: "Read this channel's experiments plainly — promote, hold, or park it?" },
  { id: 'ring-moves', icon: Crosshair, needsChannel: false, title: 'Pick my next ring moves', desc: 'Given the whole board and the 3-active guardrail, what should move where.' },
  { id: 'playbook', icon: BookMarked, needsChannel: false, title: 'Turn learnings into a playbook', desc: 'Synthesize the learnings feed into rules you can actually repeat.' },
];

/* ================================================================
   helpers
   ================================================================ */

const uid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

const str = (v, fb = '') => (typeof v === 'string' ? v : fb);
const num = (v, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);
const clampMin0 = (v) => Math.max(0, Math.round(num(v, 0)));

async function copyText(t) {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = t;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

function downloadFile(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const fmtDate = (t) => (t ? new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—');

/* ================================================================
   normalize / persistence
   ================================================================ */

function normalizeExperiment(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    id: str(r.id) || uid(),
    hypothesis: str(r.hypothesis),
    cheapTest: str(r.cheapTest),
    costDollars: clampMin0(r.costDollars),
    costHours: Math.max(0, num(r.costHours, 0)),
    result: RESULT_IDS.includes(r.result) ? r.result : 'pending',
    customersWon: clampMin0(r.customersWon),
    learning: str(r.learning),
    startedAt: Number(r.startedAt) || Date.now(),
    completedAt: r.completedAt ? Number(r.completedAt) : null,
  };
}

function normalizeChannelState(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    ring: RING_IDS.includes(r.ring) ? r.ring : 'outer',
    experiments: Array.isArray(r.experiments) ? r.experiments.map(normalizeExperiment) : [],
  };
}

function normalize(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const aim = r.aim && typeof r.aim === 'object' ? r.aim : {};
  const boardRaw = r.board && typeof r.board === 'object' ? r.board : {};
  const board = {};
  CHANNELS.forEach((c) => { board[c.id] = normalizeChannelState(boardRaw[c.id]); });
  return {
    v: 1,
    seenGuide: !!r.seenGuide,
    aim: {
      company: str(aim.company),
      offer: str(aim.offer),
      audience: str(aim.audience),
      target: Math.max(1, Math.round(num(aim.target, 100))),
    },
    board,
    copilotNotes: str(r.copilotNotes),
  };
}

function load() {
  try {
    return normalize(JSON.parse(localStorage.getItem(KEY)));
  } catch {
    return normalize(null);
  }
}

/* ================================================================
   computed / rollups
   ================================================================ */

const ringOf = (db, id) => db.board[id]?.ring || 'outer';
const activeIds = (db) => CHANNEL_IDS.filter((id) => db.board[id].ring !== 'outer');
const activeCount = (db) => activeIds(db).length;

function totalCustomers(db) {
  let n = 0;
  CHANNELS.forEach((c) => db.board[c.id].experiments.forEach((e) => { n += e.customersWon; }));
  return n;
}
function totalSpend(db) {
  let dollars = 0, hours = 0;
  CHANNELS.forEach((c) => db.board[c.id].experiments.forEach((e) => { dollars += e.costDollars; hours += e.costHours; }));
  return { dollars, hours };
}
function testedCount(db) {
  return CHANNELS.filter((c) => db.board[c.id].experiments.length > 0).length;
}
function latestExperiment(state) {
  if (!state.experiments.length) return null;
  return [...state.experiments].sort((a, b) => (b.completedAt || b.startedAt) - (a.completedAt || a.startedAt))[0];
}
function channelHitRate(state) {
  const decided = state.experiments.filter((e) => e.result === 'promising' || e.result === 'no-go');
  if (!decided.length) return null;
  return Math.round((100 * decided.filter((e) => e.result === 'promising').length) / decided.length);
}
function resultCounts(experiments) {
  const c = { pending: 0, promising: 0, 'no-go': 0, inconclusive: 0 };
  experiments.forEach((e) => { c[e.result] = (c[e.result] || 0) + 1; });
  return c;
}
function overallHitRate(db) {
  let promising = 0, decided = 0;
  CHANNELS.forEach((c) => db.board[c.id].experiments.forEach((e) => {
    if (e.result === 'promising' || e.result === 'no-go') { decided++; if (e.result === 'promising') promising++; }
  }));
  return decided ? Math.round((100 * promising) / decided) : null;
}
function allExperiments(db) {
  const rows = [];
  CHANNELS.forEach((c) => db.board[c.id].experiments.forEach((e) => rows.push({ ...e, channelId: c.id, channelName: c.name })));
  return rows;
}
function learningsFeed(db) {
  return allExperiments(db)
    .filter((e) => e.learning.trim())
    .sort((a, b) => (b.completedAt || b.startedAt) - (a.completedAt || a.startedAt));
}

/* ================================================================
   demo scenario
   ================================================================ */

const NOW = Date.now();

const DEMO = normalize({
  seenGuide: true,
  aim: {
    company: 'Lantern Ops',
    offer: 'Async standup + weekly-review tool for 5–20 person remote teams — $29/mo per team',
    audience: 'Remote-first startup founders and ops leads, 5–20 employees, Slack-native',
    target: 100,
  },
  copilotNotes:
    "Claude's read after the last review: double down on target-market-blogs — cost per signup is basically zero there. Hold content-marketing's SEO angle (traffic is not the bottleneck, the CTA is) rather than killing it outright. Revisit existing-platforms only once there is a real Slack integration to point to, not just a directory listing.",
  board: {
    'community-building': {
      ring: 'inner',
      experiments: [
        {
          id: 'e1',
          hypothesis: 'Founders already venting about async chaos in remote-ops Slack communities will try a free week if we show up as a peer, not a vendor.',
          cheapTest: 'Posted a genuine "how we fixed our standup chaos" story in 3 remote-ops Slack communities, replying to every comment for 48 hours.',
          costDollars: 0, costHours: 5, result: 'promising', customersWon: 6,
          learning: 'Communities that already discuss remote-team dysfunction convert roughly 3x better than general startup communities — the story format outperformed any pitch.',
          startedAt: NOW - 26 * DAY, completedAt: NOW - 21 * DAY,
        },
        {
          id: 'e2',
          hypothesis: 'A recurring "office hours" thread in the same communities keeps converting past the one-time story post.',
          cheapTest: 'Hosting a biweekly async AMA thread on remote standups in the two communities that responded best.',
          costDollars: 0, costHours: 2, result: 'pending', customersWon: 0, learning: '',
          startedAt: NOW - 6 * DAY, completedAt: null,
        },
      ],
    },
    'target-market-blogs': {
      ring: 'middle',
      experiments: [
        {
          id: 'e3',
          hypothesis: 'A guest post on a remote-work newsletter our ICP actually reads outperforms a generic startup blog.',
          cheapTest: 'Pitched and placed a 900-word guest post on a 6,000-subscriber remote-ops newsletter, one clear CTA to a 14-day trial.',
          costDollars: 0, costHours: 4, result: 'promising', customersWon: 14,
          learning: 'Guest posts on niche, already-subscribed newsletters beat general startup blogs by a wide margin — find three more like it before this well runs dry.',
          startedAt: NOW - 18 * DAY, completedAt: NOW - 12 * DAY,
        },
      ],
    },
    'content-marketing': {
      ring: 'middle',
      experiments: [
        {
          id: 'e4',
          hypothesis: 'Ranking for "async standup template" and two related terms brings in qualified organic signups.',
          cheapTest: 'Published 3 SEO-structured guides targeting async-standup and weekly-review keywords, no gating.',
          costDollars: 60, costHours: 9, result: 'inconclusive', customersWon: 1,
          learning: 'Traffic showed up (400+ sessions/mo by week 3) but converted once — the bottleneck looks like CTA placement, not traffic volume. Testing an inline product demo embed next before judging the channel.',
          startedAt: NOW - 40 * DAY, completedAt: NOW - 9 * DAY,
        },
      ],
    },
    'existing-platforms': {
      ring: 'outer',
      experiments: [
        {
          id: 'e5',
          hypothesis: 'Listing in the Slack App Directory generates discovery traffic from teams already searching for standup tools.',
          cheapTest: 'Published a directory listing with screenshots and a plain description, no paid placement.',
          costDollars: 0, costHours: 3, result: 'no-go', customersWon: 0,
          learning: 'A directory listing with no native Slack integration gets scrolled past — revisit only once there is a real slash-command integration, not before.',
          startedAt: NOW - 33 * DAY, completedAt: NOW - 30 * DAY,
        },
      ],
    },
  },
});

/* ================================================================
   svg helpers
   ================================================================ */

function polar(cx, cy, r, deg) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
function pieSlice(cx, cy, r, a0, a1) {
  const [x1, y1] = polar(cx, cy, r, a0);
  const [x2, y2] = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

/* ================================================================
   small SVG pieces
   ================================================================ */

function BullseyeMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24" cy="24" r="21" fill="var(--color-cream-100)" stroke="var(--color-wedge)" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="14.5" fill="var(--color-go-500)" />
      <circle cx="24" cy="24" r="8" fill="var(--color-bull-500)" />
      <circle cx="24" cy="24" r="3" fill="var(--color-brass-400)" />
    </svg>
  );
}

function DartGlyph({ className = 'h-10 w-10', rotate = 0 }) {
  return (
    <svg viewBox="0 0 64 64" className={className} style={{ transform: `rotate(${rotate}deg)` }} aria-hidden>
      <line x1="10" y1="54" x2="44" y2="20" stroke="var(--color-brass-400)" strokeWidth="3" strokeLinecap="round" />
      <path d="M44 20 L54 10 L58 14 L48 24 Z" fill="var(--color-cream-100)" stroke="var(--color-wedge)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 54 L2 60 L6 48 L14 46 Z" fill="var(--color-bull-500)" stroke="var(--color-wedge)" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M10 54 L18 60 L14 48 L14 46 Z" fill="var(--color-go-500)" stroke="var(--color-wedge)" strokeWidth="1.2" strokeLinejoin="round" opacity="0.92" />
    </svg>
  );
}

function ResultBar({ experiments, size = 'md' }) {
  const c = resultCounts(experiments);
  const total = experiments.length;
  const h = size === 'sm' ? 'h-2' : 'h-3';
  if (!total) {
    return <div className={`${h} w-full overflow-hidden rounded-full bg-cream-200`} aria-hidden />;
  }
  const seg = (key, cls) => (c[key] ? <div key={key} className={cls} style={{ width: `${(100 * c[key]) / total}%` }} /> : null);
  return (
    <div
      className={`flex ${h} w-full overflow-hidden rounded-full bg-cream-200`}
      role="img"
      aria-label={`${c.promising} promising, ${c['no-go']} no-go, ${c.inconclusive} inconclusive, ${c.pending} testing, out of ${total} experiments`}
    >
      {seg('promising', 'bg-go-500')}
      {seg('no-go', 'bg-bull-500')}
      {seg('inconclusive', 'bg-honey-500')}
      {seg('pending', 'bg-fog-500')}
    </div>
  );
}

/* ================================================================
   the bullseye board — hero + core tool
   ================================================================ */

function BoardRings({ pct }) {
  const N = 19;
  const slice = 360 / N;
  const wedges = Array.from({ length: N }, (_, i) => {
    const a0 = i * slice - slice / 2, a1 = i * slice + slice / 2;
    return { key: i, d: pieSlice(320, 320, 300, a0, a1), fill: i % 2 === 0 ? 'var(--color-cream-100)' : 'var(--color-wedge)' };
  });
  const dialR = 58;
  const C = 2 * Math.PI * dialR;
  const clamped = Math.max(0, Math.min(1, pct));
  const [ex, ey] = polar(320, 320, dialR, 360 * clamped);
  return (
    <svg viewBox="0 0 640 640" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="tb-go" cx="46%" cy="36%" r="72%">
          <stop offset="0%" stopColor="var(--color-go-400)" />
          <stop offset="100%" stopColor="var(--color-go-600)" />
        </radialGradient>
        <radialGradient id="tb-bull" cx="46%" cy="36%" r="72%">
          <stop offset="0%" stopColor="var(--color-bull-400)" />
          <stop offset="100%" stopColor="var(--color-bull-600)" />
        </radialGradient>
        <radialGradient id="tb-gold" cx="40%" cy="32%" r="78%">
          <stop offset="0%" stopColor="var(--color-brass-400)" />
          <stop offset="100%" stopColor="var(--color-brass-600)" />
        </radialGradient>
      </defs>

      {wedges.map((w) => <path key={w.key} d={w.d} fill={w.fill} />)}
      {Array.from({ length: N }, (_, i) => {
        const a = i * slice - slice / 2;
        const [x1, y1] = polar(320, 320, 226, a);
        const [x2, y2] = polar(320, 320, 300, a);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-brass-500)" strokeWidth="1" opacity="0.4" />;
      })}

      <circle cx="320" cy="320" r="225" fill="url(#tb-go)" />
      <circle cx="320" cy="320" r="150" fill="url(#tb-bull)" />
      <circle cx="320" cy="320" r="75" fill="url(#tb-gold)" stroke="var(--color-brass-600)" strokeWidth="2" />

      {[300, 225, 150, 75].map((r) => (
        <circle key={r} cx="320" cy="320" r={r} fill="none" stroke="var(--color-brass-500)" strokeWidth="2.25" opacity="0.65" />
      ))}
      <circle cx="320" cy="320" r="308" fill="none" stroke="var(--color-wedge)" strokeWidth="10" opacity="0.35" />

      {/* progress dial inside the bullseye */}
      <circle cx="320" cy="320" r={dialR} fill="none" stroke="rgba(25,19,7,.32)" strokeWidth="9" />
      {[0, 90, 180, 270].map((a) => {
        const [tx1, ty1] = polar(320, 320, dialR - 5, a);
        const [tx2, ty2] = polar(320, 320, dialR + 5, a);
        return <line key={a} x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="var(--color-ink-900)" strokeWidth="1.4" opacity="0.35" />;
      })}
      {clamped > 0 && (
        <circle
          cx="320" cy="320" r={dialR} fill="none" stroke="var(--color-ink-900)" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${C * clamped} ${C}`} transform="rotate(-90 320 320)"
        />
      )}
      {clamped > 0 && <circle cx={ex} cy={ey} r="5" fill="var(--color-cream-50)" stroke="var(--color-ink-900)" strokeWidth="2.5" />}
    </svg>
  );
}

function BoardHero({ db, selectedId, onSelect }) {
  const N = 19;
  const slice = 360 / N;
  const total = num(db.aim.target, 100);
  const won = totalCustomers(db);
  const pct = total > 0 ? won / total : 0;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[600px]">
      <BoardRings pct={pct} />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="mt-[3%] font-mono text-[7.5vw] font-bold leading-none text-ink-900 sm:text-[42px]">{won}</span>
        <span className="tag-mono text-[2.6vw] text-ink-900/75 sm:text-[11px]">of {total}</span>
      </div>
      {CHANNELS.map((c, i) => {
        const angle = i * slice;
        const ring = ringOf(db, c.id);
        const r = RINGS.find((x) => x.id === ring).radius;
        const [x, y] = polar(320, 320, r, angle);
        const left = `${(x / 640) * 100}%`;
        const top = `${(y / 640) * 100}%`;
        const state = db.board[c.id];
        const latest = latestExperiment(state);
        const borderCls = MARKER_BORDER[latest ? latest.result : 'none'];
        const isSelected = selectedId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            title={c.name}
            aria-label={`${c.name} — ${RING_META[ring].label}${latest ? `, latest result ${RESULT_META[latest.result].label}` : ', no experiments yet'}`}
            style={{ left, top, backgroundColor: 'var(--color-cream-50)' }}
            className={`dart-land absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 shadow-board transition-transform hover:scale-125 focus-visible:scale-125 sm:h-9 sm:w-9 ${borderCls} ${isSelected ? 'z-20 scale-125 ring-4 ring-brass-400/70' : 'z-10'}`}
          >
            <c.icon className="h-3.5 w-3.5 text-ink-900 sm:h-4 sm:w-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

/* ================================================================
   markdown / csv serializers
   ================================================================ */

function aimMd(db) {
  const won = totalCustomers(db);
  const spend = totalSpend(db);
  const hit = overallHitRate(db);
  return [
    '## Campaign',
    `- Company: ${db.aim.company || '(not set)'}`,
    `- Offer: ${db.aim.offer || '(not set)'}`,
    `- Audience / ICP: ${db.aim.audience || '(not set)'}`,
    `- Target: first ${db.aim.target} customers`,
    `- Progress: ${won}/${db.aim.target} customers won (${Math.min(100, Math.round((100 * won) / db.aim.target))}%)`,
    `- Active channels: ${activeCount(db)}/${MAX_ACTIVE} (focus guardrail)`,
    `- Channels tested: ${testedCount(db)}/19`,
    `- Overall hit rate: ${hit === null ? 'not enough decided experiments yet' : `${hit}%`}`,
    `- Testing spend to date: $${spend.dollars} · ${spend.hours}h`,
  ].join('\n');
}

function channelMd(c, state) {
  const lines = [`### ${c.name} — ${RING_META[state.ring].label}`, c.blurb, ''];
  if (!state.experiments.length) {
    lines.push('_No experiments logged yet._');
    return lines.join('\n');
  }
  [...state.experiments].sort((a, b) => b.startedAt - a.startedAt).forEach((e) => {
    const res = RESULT_META[e.result].label;
    lines.push(
      `- **${fmtDate(e.startedAt)}** — Hypothesis: ${e.hypothesis || '(none)'} | Cheap test: ${e.cheapTest || '(none)'} | Cost: $${e.costDollars} · ${e.costHours}h | Result: ${res} | Customers won: ${e.customersWon}${e.learning ? ` | Learning: ${e.learning}` : ''}`
    );
  });
  return lines.join('\n');
}

function boardMd(db) {
  const out = [`# Traction Bullseye — Board Report`, `_Exported ${new Date().toLocaleDateString()}_`, '', aimMd(db), ''];
  ['inner', 'middle', 'outer'].forEach((ringId) => {
    const meta = RINGS.find((r) => r.id === ringId);
    const chs = CHANNELS.filter((c) => db.board[c.id].ring === ringId);
    out.push(`## ${meta.label} (${chs.length})`);
    if (!chs.length) out.push('_None._', '');
    else chs.forEach((c) => out.push(channelMd(c, db.board[c.id]), ''));
  });
  const feed = learningsFeed(db);
  out.push('## Learnings feed');
  if (!feed.length) out.push('_No learnings logged yet._');
  else feed.forEach((l) => out.push(`- **${fmtDate(l.date || l.completedAt || l.startedAt)}** [${l.channelName}] (${RESULT_META[l.result].label}): ${l.learning}`));
  if (db.copilotNotes) out.push('', '## Notes from Claude', db.copilotNotes);
  return out.join('\n');
}

function boardCsv(db) {
  const rows = [
    ['channel', 'ring', 'hypothesis', 'cheapTest', 'costDollars', 'costHours', 'result', 'customersWon', 'learning', 'started', 'completed'].join(','),
  ];
  CHANNELS.forEach((c) => {
    const state = db.board[c.id];
    if (!state.experiments.length) {
      rows.push([c.name, RING_META[state.ring].label, '', '', '', '', '', '', '', '', ''].map(csvCell).join(','));
      return;
    }
    state.experiments.forEach((e) => {
      rows.push(
        [
          c.name, RING_META[state.ring].label, e.hypothesis, e.cheapTest, e.costDollars, e.costHours,
          RESULT_META[e.result].label, e.customersWon, e.learning,
          e.startedAt ? new Date(e.startedAt).toLocaleDateString() : '', e.completedAt ? new Date(e.completedAt).toLocaleDateString() : '',
        ].map(csvCell).join(',')
      );
    });
  });
  return rows.join('\n');
}

/* ================================================================
   copilot prompts
   ================================================================ */

function contextHead(consoleCtx) {
  if (!consoleCtx) return [];
  const c = consoleCtx;
  const head = ['## Operator context (from my BizDev console)'];
  if (c.claude?.userName || c.claude?.company) head.push(`- Operator: ${c.claude?.userName || ''} ${c.claude?.company ? `at ${c.claude.company}` : ''}`.trim());
  if (c.profile?.offer) head.push(`- Offer: ${c.profile.offer}`);
  if (c.profile?.icp) head.push(`- ICP: ${c.profile.icp}`);
  if (c.claude?.voiceNotes) head.push(`- Voice notes: ${c.claude.voiceNotes}`);
  head.push('');
  return head;
}

function buildPrompt(actionId, db, channel, consoleCtx) {
  const head = contextHead(consoleCtx);
  const aim = aimMd(db);
  const state = channel ? db.board[channel.id] : null;

  if (actionId === 'cheap-test' && channel) {
    return [
      "You are a growth lead who specializes in the Bullseye Traction framework — finding the cheapest possible test that produces a real signal from a channel before anyone commits real budget to it.",
      '',
      ...head,
      aim,
      '',
      '## The channel I want to test',
      channelMd(channel, state),
      '',
      '## Your task',
      `Design ONE cheap test for the "${channel.name}" channel that could plausibly produce a real signal (replies, leads, or first customers) within 1–2 weeks, for well under $200 and a few hours of my time.`,
      '',
      '## Output format',
      '1. A one-sentence hypothesis, written as a falsifiable claim.',
      '2. The exact test steps, numbered, specific enough to start today.',
      '3. A budget and time estimate ($ and hours).',
      '4. The single metric that tells me pass/fail, and the threshold that counts as a pass.',
      '5. What "promising" looks like for this channel specifically, versus what "no-go" looks like — not generic advice, tied to the numbers above.',
    ].join('\n');
  }

  if (actionId === 'interpret' && channel) {
    return [
      'You are a skeptical growth advisor who reads experiment data plainly and does not let sunk-cost thinking creep into the read.',
      '',
      ...head,
      aim,
      '',
      '## The channel and its experiment history',
      channelMd(channel, state),
      '',
      '## Your task',
      'Interpret the results logged for this channel. Tell me plainly whether the evidence supports promoting it, holding where it is, or parking it — do not hedge.',
      '',
      '## Output format',
      '1. A plain read of what the evidence actually shows (not what I am hoping it shows).',
      '2. A recommended ring move — Focus, stay in Testing, or back to Untested — with the reasoning in two sentences.',
      "3. If any experiment is inconclusive, the ONE next test that would resolve it fastest.",
      '4. One bias I am likely bringing to this channel, based on how I described it.',
    ].join('\n');
  }

  if (actionId === 'ring-moves') {
    const rows = ['inner', 'middle', 'outer'].map((ringId) => {
      const meta = RINGS.find((r) => r.id === ringId);
      const chs = CHANNELS.filter((c) => db.board[c.id].ring === ringId);
      return [`### ${meta.label} (${chs.length})`, ...(chs.length ? chs.map((c) => channelMd(c, db.board[c.id])) : ['_empty_'])].join('\n\n');
    });
    return [
      'You are running the Bullseye Framework from Traction — test broadly in the Testing ring, then go all-in on ONE channel in Focus, and respect a hard cap on how many channels are active (Testing + Focus) at once.',
      '',
      ...head,
      aim,
      '',
      '## My full board',
      ...rows,
      '',
      '## Your task',
      `Given my current board and the fact only ${MAX_ACTIVE} channels may be active at once, tell me exactly what to promote, hold, or demote this week.`,
      '',
      '## Output format',
      '1. A markdown table of recommended moves: | Channel | Current ring | Recommended ring | Why |',
      '2. Which single channel deserves Focus right now, if the evidence supports one — say plainly if none do yet.',
      '3. Which Untested channel to test next once a slot frees up, and why that one over the others.',
      '4. The one channel type I appear to be avoiding, based on what has and has not been tested.',
    ].join('\n');
  }

  // playbook
  const feed = learningsFeed(db);
  const feedMd = feed.length
    ? feed.map((l) => `- [${l.channelName}] (${RESULT_META[l.result].label}) ${l.learning}`).join('\n')
    : '_No learnings logged yet._';
  return [
    'You are a growth operator turning scattered field notes into a short, repeatable playbook — concrete rules grounded in evidence, not generic marketing advice.',
    '',
    ...head,
    aim,
    '',
    '## My learnings feed, most recent first',
    feedMd,
    '',
    '## Your task',
    'Synthesize this learnings feed into a playbook I can actually reuse.',
    '',
    '## Output format',
    '1. 3–6 patterns you notice across channels (only ones actually supported by what I logged).',
    '2. A numbered list of rules to follow going forward, each traceable to a specific learning above.',
    '3. Which channel(s) I should stop testing, and why, based only on this evidence.',
    '4. A one-paragraph summary I could paste into a team update.',
  ].join('\n');
}

/* ================================================================
   small UI atoms
   ================================================================ */

function Btn({ children, onClick, kind = 'ghost', className = '', ...rest }) {
  const base = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40';
  const kinds = {
    ghost: 'text-cream-50/90 hover:bg-cream-50/10 border border-cream-50/25',
    solid: 'bg-brass-500 text-ink-900 hover:bg-brass-400 shadow-board',
    paper: 'border border-cream-300 bg-cream-50 text-ink-900 hover:bg-cream-200',
    go: 'bg-go-600 text-cream-50 hover:bg-go-500 shadow-board',
    bull: 'bg-bull-600 text-cream-50 hover:bg-bull-500 shadow-board',
  };
  return (
    <button onClick={onClick} className={`${base} ${kinds[kind]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

const inputCls =
  'w-full rounded-md border border-cream-300 bg-cream-50 px-2.5 py-1.5 text-sm text-ink-900 placeholder:text-ink-500/60 focus:border-brass-500';

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="tag-mono mb-1 block text-[10.5px] font-semibold text-ink-500">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-[11px] leading-tight text-ink-500">{hint}</span>}
    </label>
  );
}

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/65 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`modal-in mt-8 w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl border border-cream-300 bg-cream-50 shadow-deep`}>
        <div className="flex items-center justify-between border-b border-cream-200 px-5 py-3">
          <h2 className="tag-mono text-base font-semibold text-ink-900">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="rounded-md p-1.5 text-ink-500 hover:bg-cream-200 hover:text-ink-900">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function RingChip({ ring, dark = false }) {
  const meta = RING_META[ring];
  return (
    <span className={`tag-mono inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${dark ? meta.dark : meta.chip}`}>
      {meta.label}
    </span>
  );
}

function ResultChip({ result }) {
  const meta = RESULT_META[result];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${meta.border} ${meta.bg} ${meta.text}`}>
      <Icon className="h-3 w-3" aria-hidden /> {meta.label}
    </span>
  );
}

function GuardrailStrip({ db }) {
  const n = activeCount(db);
  return (
    <div className="board-panel flex items-center gap-3 rounded-xl px-3.5 py-2.5">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <svg key={i} viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            {i < n ? (
              <path d="M12 2 L15 9 L22 10 L17 15 L18.5 22 L12 18.5 L5.5 22 L7 15 L2 10 L9 9 Z" fill="var(--color-brass-400)" stroke="var(--color-brass-600)" strokeWidth="1" />
            ) : (
              <circle cx="12" cy="12" r="8" fill="none" stroke="var(--color-cream-200)" strokeWidth="2" opacity="0.6" />
            )}
          </svg>
        ))}
      </div>
      <div className="min-w-0">
        <p className="font-mono text-sm font-semibold leading-tight text-cream-50">{n}/{MAX_ACTIVE} active</p>
        <p className="text-[11px] leading-tight text-cream-100/70">Testing + Focus, combined — the discipline is not spreading thin.</p>
      </div>
    </div>
  );
}

/* ================================================================
   channel legend list
   ================================================================ */

function ChannelLegendList({ db, selectedId, onSelect, query, setQuery, ringFilter, setRingFilter }) {
  const q = query.trim().toLowerCase();
  const groups = ['inner', 'middle', 'outer']
    .filter((r) => ringFilter === 'all' || ringFilter === r)
    .map((ringId) => ({
      ring: RINGS.find((r) => r.id === ringId),
      rows: CHANNELS.filter((c) => db.board[c.id].ring === ringId && (!q || c.name.toLowerCase().includes(q))),
    }));

  return (
    <div className="paper-card flex h-full flex-col rounded-2xl border border-cream-300 shadow-board">
      <div className="flex flex-wrap items-center gap-2 border-b border-cream-200 p-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" aria-hidden />
          <input id="tb-search" value={query} onChange={(e) => setQuery(e.target.value)} className={`${inputCls} pl-8`} placeholder="Search channels ( / )" aria-label="Search channels" />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-ink-500">
          <Filter className="h-3.5 w-3.5" aria-hidden />
          <select value={ringFilter} onChange={(e) => setRingFilter(e.target.value)} className={`${inputCls} w-auto`} aria-label="Filter by ring">
            <option value="all">All rings</option>
            <option value="inner">Focus</option>
            <option value="middle">Testing</option>
            <option value="outer">Untested</option>
          </select>
        </label>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {groups.every((g) => g.rows.length === 0) && (
          <p className="px-3 py-8 text-center text-xs text-ink-500">No channels match. Clear the search or filter.</p>
        )}
        {groups.map((g) =>
          g.rows.length === 0 ? null : (
            <div key={g.ring.id} className="mb-2">
              <p className="tag-mono px-2 py-1 text-[10px] font-semibold text-ink-500">{g.ring.label} · {g.rows.length}</p>
              <ul className="space-y-1">
                {g.rows.map((c) => {
                  const state = db.board[c.id];
                  const latest = latestExperiment(state);
                  const hit = channelHitRate(state);
                  const isSelected = selectedId === c.id;
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => onSelect(c.id)}
                        aria-current={isSelected}
                        className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${isSelected ? 'border-brass-500 bg-brass-500/10' : 'border-transparent hover:bg-cream-200/70'}`}
                      >
                        <c.icon className="h-4 w-4 shrink-0 text-ink-700" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-900">{c.name}</span>
                        {latest && (
                          <span className={`h-2 w-2 shrink-0 rounded-full ${RESULT_META[latest.result].dot}`} aria-hidden title={RESULT_META[latest.result].label} />
                        )}
                        {hit !== null && <span className="shrink-0 font-mono text-[10.5px] text-ink-500">{hit}%</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ================================================================
   experiment card
   ================================================================ */

function ExperimentCard({ exp, onChange, onDelete }) {
  return (
    <div className="rounded-xl border border-cream-300 bg-cream-50 p-3 shadow-board">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <select
          value={exp.result}
          onChange={(e) => onChange({ result: e.target.value })}
          aria-label="Experiment result"
          className="tag-mono rounded-md border border-cream-300 bg-cream-100 px-2 py-1 text-[11px] font-semibold text-ink-900"
        >
          {RESULT_IDS.map((r) => <option key={r} value={r}>{RESULT_META[r].label}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-ink-500">{fmtDate(exp.startedAt)}{exp.completedAt ? ` → ${fmtDate(exp.completedAt)}` : ''}</span>
          <button onClick={onDelete} aria-label="Delete this experiment" className="rounded-md p-1 text-ink-500 hover:bg-cream-200 hover:text-bull-600">
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
      <div className="space-y-2.5">
        <Field label="Hypothesis">
          <textarea rows={2} value={exp.hypothesis} onChange={(e) => onChange({ hypothesis: e.target.value })} className={inputCls} placeholder="If we do X, then Y will happen, because Z." />
        </Field>
        <Field label="Cheap test">
          <textarea rows={2} value={exp.cheapTest} onChange={(e) => onChange({ cheapTest: e.target.value })} className={inputCls} placeholder="The smallest thing you can ship to get a real signal." />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Cost ($)">
            <input type="number" min="0" value={exp.costDollars} onChange={(e) => onChange({ costDollars: clampMin0(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Time (hrs)">
            <input type="number" min="0" step="0.5" value={exp.costHours} onChange={(e) => onChange({ costHours: Math.max(0, num(e.target.value, 0)) })} className={inputCls} />
          </Field>
          <Field label="Customers won">
            <input type="number" min="0" value={exp.customersWon} onChange={(e) => onChange({ customersWon: clampMin0(e.target.value) })} className={inputCls} />
          </Field>
        </div>
        <Field label="What did you learn?" hint={exp.result === 'pending' ? 'Fill this in once you have a result — it feeds the learnings feed below.' : undefined}>
          <textarea rows={2} value={exp.learning} onChange={(e) => onChange({ learning: e.target.value })} className={inputCls} placeholder="The one sentence you would tell a colleague about this test." />
        </Field>
      </div>
    </div>
  );
}

/* ================================================================
   channel panel (drawer)
   ================================================================ */

function ChannelPanel({ channel, db, onPromote, onDemote, onAddExperiment, onUpdateExperiment, onDeleteExperiment, onClose }) {
  const state = db.board[channel.id];
  const idx = RING_IDS.indexOf(state.ring);
  const hit = channelHitRate(state);
  const won = state.experiments.reduce((s, e) => s + e.customersWon, 0);
  const spend = state.experiments.reduce((s, e) => ({ d: s.d + e.costDollars, h: s.h + e.costHours }), { d: 0, h: 0 });
  const guardrailFull = state.ring === 'outer' && activeCount(db) >= MAX_ACTIVE;
  const sorted = [...state.experiments].sort((a, b) => b.startedAt - a.startedAt);

  return (
    <aside className="panel-in fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l-4 border-brass-500 bg-cream-50 shadow-deep">
      <div className="board-panel flex items-start justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-brass-500/50 bg-felt-800 text-brass-400">
            <channel.icon className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold leading-tight text-cream-50">{channel.name}</p>
            <RingChip ring={state.ring} dark />
          </div>
        </div>
        <button onClick={onClose} aria-label="Close channel panel" className="rounded-md p-1.5 text-cream-100/80 hover:bg-cream-50/10">
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <p className="text-sm leading-relaxed text-ink-700">{channel.blurb}</p>

        <section className="rounded-xl border border-cream-300 bg-cream-100 p-3">
          <p className="tag-mono mb-2 text-[10px] font-semibold text-ink-500">Ring position</p>
          <div className="mb-2.5 flex items-center gap-1.5">
            {RINGS.map((r, i) => (
              <div key={r.id} className={`h-1.5 flex-1 rounded-full ${i <= idx ? (r.id === 'inner' ? 'bg-bull-500' : r.id === 'middle' ? 'bg-go-500' : 'bg-brass-400') : 'bg-cream-300'}`} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Btn kind="paper" onClick={onDemote} disabled={idx === 0} className="!py-1">
              <TrendingDown className="h-3.5 w-3.5" aria-hidden /> Demote
            </Btn>
            <Btn kind={idx === 2 ? 'bull' : 'go'} onClick={onPromote} disabled={idx === 2 || guardrailFull} className="!py-1">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden /> Promote to {RINGS[Math.min(idx + 1, 2)].label}
            </Btn>
          </div>
          {guardrailFull && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-bull-600">
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
              Guardrail: {MAX_ACTIVE} channels are already active. Demote one before promoting another.
            </p>
          )}
        </section>

        <section className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-cream-300 bg-cream-100 px-2 py-2">
            <p className="font-mono text-base font-semibold text-ink-900">{hit === null ? '—' : `${hit}%`}</p>
            <p className="tag-mono text-[9px] text-ink-500">Hit rate</p>
          </div>
          <div className="rounded-lg border border-cream-300 bg-cream-100 px-2 py-2">
            <p className="font-mono text-base font-semibold text-ink-900">{won}</p>
            <p className="tag-mono text-[9px] text-ink-500">Customers</p>
          </div>
          <div className="rounded-lg border border-cream-300 bg-cream-100 px-2 py-2">
            <p className="font-mono text-base font-semibold text-ink-900">${spend.d}<span className="text-[10px] text-ink-500"> · {spend.h}h</span></p>
            <p className="tag-mono text-[9px] text-ink-500">Spent</p>
          </div>
        </section>

        {state.experiments.length > 0 && (
          <section>
            <p className="tag-mono mb-1.5 text-[10px] font-semibold text-ink-500">Signal so far</p>
            <ResultBar experiments={state.experiments} />
          </section>
        )}

        {state.ring === 'outer' ? (
          <section className="rounded-xl border-2 border-dashed border-cream-300 px-4 py-6 text-center">
            <Target className="mx-auto mb-2 h-6 w-6 text-brass-500" aria-hidden />
            <p className="text-sm font-semibold text-ink-900">Still in Untested</p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-ink-500">Promote this channel to Testing to start logging cheap tests against it.</p>
          </section>
        ) : (
          <section>
            <div className="mb-1.5 flex items-center justify-between">
              <h3 className="tag-mono flex items-center gap-1.5 text-xs font-semibold text-ink-700">
                <FlaskConical className="h-3.5 w-3.5" aria-hidden /> Experiments
              </h3>
              <Btn kind="solid" onClick={onAddExperiment} className="!px-2.5 !py-1 text-xs">
                <Plus className="h-3.5 w-3.5" aria-hidden /> New experiment
              </Btn>
            </div>
            {sorted.length === 0 ? (
              <p className="rounded-xl border-2 border-dashed border-cream-300 px-3 py-6 text-center text-xs text-ink-500">
                No experiments logged yet — describe your first cheap test above.
              </p>
            ) : (
              <div className="space-y-2.5">
                {sorted.map((e) => (
                  <ExperimentCard key={e.id} exp={e} onChange={(patch) => onUpdateExperiment(e.id, patch)} onDelete={() => onDeleteExperiment(e)} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </aside>
  );
}

/* ================================================================
   learnings feed
   ================================================================ */

function LearningsFeed({ db }) {
  const [filter, setFilter] = useState('all');
  const feed = learningsFeed(db).filter((l) => filter === 'all' || l.result === filter);
  return (
    <div className="paper-card rounded-2xl border border-cream-300 p-4 shadow-board">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
          <Lightbulb className="h-5 w-5 text-brass-500" aria-hidden /> Learnings feed
        </h2>
        <label className="flex items-center gap-1.5 text-xs text-ink-500">
          <Filter className="h-3.5 w-3.5" aria-hidden />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className={`${inputCls} w-auto`} aria-label="Filter learnings by result">
            <option value="all">All results</option>
            {RESULT_IDS.map((r) => <option key={r} value={r}>{RESULT_META[r].label}</option>)}
          </select>
        </label>
      </div>
      {feed.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-cream-300 px-4 py-8 text-center text-sm text-ink-500">
          Nothing here yet. Every experiment you complete with a written learning shows up in this feed, newest first.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {feed.map((l) => (
            <li key={l.id} className="flex gap-3 rounded-xl border border-cream-300 bg-cream-100 p-3">
              <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${RESULT_META[l.result].dot}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-500">
                  <span className="font-semibold text-ink-700">{l.channelName}</span>
                  <ResultChip result={l.result} />
                  <span className="font-mono">{fmtDate(l.completedAt || l.startedAt)}</span>
                </p>
                <p className="mt-1 text-sm leading-snug text-ink-900">{l.learning}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ================================================================
   main app
   ================================================================ */

export default function App() {
  const [db, setDb] = useState(load);
  const [helpOpen, setHelpOpen] = useState(() => !load().seenGuide);
  const [modal, setModal] = useState(null); // 'export' | 'reset' | null
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [ringFilter, setRingFilter] = useState('all');
  const [copilot, setCopilot] = useState({ action: 'cheap-test', channelId: null });
  const [toast, setToast] = useState(null);
  const [undo, setUndo] = useState(null);
  const [consoleCtx, setConsoleCtx] = useState(null);
  const undoTimer = useRef(null);
  const toastTimer = useRef(null);
  const fileRef = useRef(null);

  /* autosave */
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage unavailable */ }
    }, 250);
    return () => clearTimeout(t);
  }, [db]);

  /* console bus (PROTOCOL.md) */
  useEffect(() => {
    if (window.parent !== window) {
      try { window.parent.postMessage({ bizdev: 'ready', v: 1, slug: SLUG }, '*'); } catch { /* noop */ }
    }
    const onMsg = (e) => {
      const m = e.data;
      if (m && m.bizdev === 'context' && m.v === 1 && m.connectors) setConsoleCtx(m.connectors);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const say = (msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  const promoteChannel = (chId) => {
    const cur = db.board[chId].ring;
    const idx = RING_IDS.indexOf(cur);
    if (idx >= RING_IDS.length - 1) return;
    if (cur === 'outer' && activeCount(db) >= MAX_ACTIVE) {
      say(`Guardrail: ${MAX_ACTIVE} channels are already active — demote one first.`);
      return;
    }
    const next = RING_IDS[idx + 1];
    setDb((d) => ({ ...d, board: { ...d.board, [chId]: { ...d.board[chId], ring: next } } }));
    say(`${CHANNEL_BY_ID[chId].name} promoted to ${RING_META[next].label}`);
  };

  const demoteChannel = (chId) => {
    const cur = db.board[chId].ring;
    const idx = RING_IDS.indexOf(cur);
    if (idx <= 0) return;
    const next = RING_IDS[idx - 1];
    setDb((d) => ({ ...d, board: { ...d.board, [chId]: { ...d.board[chId], ring: next } } }));
    say(`${CHANNEL_BY_ID[chId].name} demoted to ${RING_META[next].label}`);
  };

  const addExperiment = (chId) => {
    const exp = normalizeExperiment({ startedAt: Date.now() });
    setDb((d) => ({ ...d, board: { ...d.board, [chId]: { ...d.board[chId], experiments: [exp, ...d.board[chId].experiments] } } }));
  };

  const updateExperiment = (chId, expId, patch) => {
    setDb((d) => {
      const state = d.board[chId];
      const experiments = state.experiments.map((e) => {
        if (e.id !== expId) return e;
        const merged = { ...e, ...patch };
        if (patch.result && patch.result !== 'pending' && !e.completedAt) merged.completedAt = Date.now();
        if (patch.result === 'pending') merged.completedAt = null;
        return merged;
      });
      return { ...d, board: { ...d.board, [chId]: { ...state, experiments } } };
    });
  };

  const deleteExperiment = (chId, exp) => {
    setDb((d) => ({ ...d, board: { ...d.board, [chId]: { ...d.board[chId], experiments: d.board[chId].experiments.filter((e) => e.id !== exp.id) } } }));
    clearTimeout(undoTimer.current);
    setUndo({
      msg: `Experiment removed from ${CHANNEL_BY_ID[chId].name}`,
      restore: () => setDb((d) => ({ ...d, board: { ...d.board, [chId]: { ...d.board[chId], experiments: [exp, ...d.board[chId].experiments] } } })),
    });
    undoTimer.current = setTimeout(() => setUndo(null), 7000);
  };

  const loadDemo = () => {
    setDb((d) => normalize({ ...DEMO, seenGuide: d.seenGuide }));
    setSelectedId(null);
    say('Demo board loaded — 3 active channels, real experiment history');
  };

  const doReset = () => {
    setDb((d) => normalize({ seenGuide: d.seenGuide }));
    setSelectedId(null);
    setModal(null);
    say('Board cleared — every channel back to Untested');
  };

  const closeHelp = () => {
    setHelpOpen(false);
    setDb((d) => (d.seenGuide ? d : { ...d, seenGuide: true }));
  };

  const copyMarkdown = async () => {
    await copyText(boardMd(db));
    say('Board report copied as Markdown');
  };
  const exportJson = () => {
    downloadFile('traction-bullseye.json', JSON.stringify(db, null, 2), 'application/json');
    say('JSON downloaded');
  };
  const exportCsv = () => {
    downloadFile('traction-bullseye.csv', boardCsv(db), 'text/csv');
    say('CSV downloaded');
  };
  const importJson = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setDb(normalize(JSON.parse(String(reader.result))));
        say('Board imported');
      } catch {
        say('Could not read that file — expecting Traction Bullseye JSON');
      }
    };
    reader.readAsText(f);
    e.target.value = '';
  };

  /* keyboard */
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        copyMarkdown();
        return;
      }
      if (e.key === 'Escape') {
        if (helpOpen) closeHelp();
        else if (modal) setModal(null);
        else if (selectedId) setSelectedId(null);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '?') { e.preventDefault(); setHelpOpen(true); }
      if (e.key === '/') { e.preventDefault(); document.getElementById('tb-search')?.focus(); }
      if (selectedId && !helpOpen && !modal) {
        if (e.key === 'ArrowRight') { e.preventDefault(); promoteChannel(selectedId); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); demoteChannel(selectedId); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const selectedChannel = selectedId ? CHANNEL_BY_ID[selectedId] : null;

  const copilotChannel = useMemo(() => {
    if (copilot.channelId) return CHANNEL_BY_ID[copilot.channelId] || null;
    if (selectedId) return CHANNEL_BY_ID[selectedId];
    return CHANNELS[0];
  }, [copilot.channelId, selectedId]);

  const activeAction = COPILOT_ACTIONS.find((a) => a.id === copilot.action) || COPILOT_ACTIONS[0];

  const promptInfo = useMemo(() => {
    if (activeAction.needsChannel && !copilotChannel) return { prompt: '', empty: 'Select a channel from the board or the list.' };
    if (activeAction.id === 'interpret' && copilotChannel && db.board[copilotChannel.id].experiments.length === 0) {
      return { prompt: '', empty: `Log at least one experiment for ${copilotChannel.name} before asking Claude to interpret results.` };
    }
    if (activeAction.id === 'playbook' && learningsFeed(db).length === 0) {
      return { prompt: '', empty: 'Log a learning on at least one experiment first — the playbook is built from your learnings feed.' };
    }
    return { prompt: buildPrompt(activeAction.id, db, copilotChannel, consoleCtx), empty: null };
  }, [activeAction, db, copilotChannel, consoleCtx]);

  const won = totalCustomers(db);
  const spend = totalSpend(db);
  const hit = overallHitRate(db);
  const tested = testedCount(db);
  const active = activeCount(db);

  return (
    <div className="felt-ground min-h-screen font-body text-cream-100">
      {/* ============ header / hero ============ */}
      <header className="no-print relative overflow-hidden">
        <div className="relative mx-auto max-w-7xl px-4 pb-6 pt-6 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <BullseyeMark className="mt-1 h-11 w-11 shrink-0" />
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-cream-50 sm:text-3xl">
                  Traction <span className="text-brass-400">Bullseye</span>
                </h1>
                <p className="mt-1.5 max-w-xl text-sm text-cream-100/85">
                  Nineteen channels. Three rings. Run cheap tests, promote what works, and walk to your first {db.aim.target} customers on purpose.
                </p>
              </div>
              <DartGlyph className="mt-1 hidden h-12 w-12 opacity-70 md:block" rotate={18} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Btn onClick={loadDemo}><Sparkles className="h-4 w-4" aria-hidden /> Load demo</Btn>
              <Btn onClick={() => setModal('reset')}><RotateCcw className="h-4 w-4" aria-hidden /> Reset</Btn>
              <Btn onClick={() => setHelpOpen(true)}><HelpCircle className="h-4 w-4" aria-hidden /> How to use</Btn>
              <Btn kind="solid" onClick={() => setModal('export')}><Download className="h-4 w-4" aria-hidden /> Export</Btn>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {[
              { icon: Target, label: 'Customers won', value: `${won}/${db.aim.target}` },
              { icon: Crosshair, label: 'Active channels', value: `${active}/${MAX_ACTIVE}` },
              { icon: FlaskConical, label: 'Channels tested', value: `${tested}/19` },
              { icon: Gauge, label: 'Overall hit rate', value: hit === null ? '—' : `${hit}%` },
              { icon: DollarSign, label: 'Testing spend', value: `$${spend.dollars} · ${spend.hours}h` },
            ].map((s) => (
              <div key={s.label} className="board-panel flex items-center gap-2.5 rounded-lg px-3 py-2">
                <s.icon className="h-4 w-4 text-brass-400" aria-hidden />
                <div>
                  <div className="font-mono text-base font-semibold leading-none text-cream-50">{s.value}</div>
                  <div className="tag-mono text-[9px] text-cream-100/70">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="wire-rule relative mx-4 sm:mx-6" />
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* ============ aim bar ============ */}
        <section className="no-print mb-5">
          <div className="board-panel flex flex-wrap items-center gap-3 rounded-xl p-3">
            <div className="flex items-center gap-2 pr-1 text-brass-400">
              <Target className="h-5 w-5" aria-hidden />
              <span className="tag-mono text-xs font-semibold">Your aim</span>
            </div>
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-4">
              <input value={db.aim.company} onChange={(e) => setDb((d) => ({ ...d, aim: { ...d.aim, company: e.target.value } }))}
                className={`${inputCls} bg-cream-50`} placeholder="Your company" aria-label="Your company name" />
              <input value={db.aim.offer} onChange={(e) => setDb((d) => ({ ...d, aim: { ...d.aim, offer: e.target.value } }))}
                className={`${inputCls} bg-cream-50 sm:col-span-1`} placeholder="Your offer + price point" aria-label="Your offer" />
              <input value={db.aim.audience} onChange={(e) => setDb((d) => ({ ...d, aim: { ...d.aim, audience: e.target.value } }))}
                className={`${inputCls} bg-cream-50`} placeholder="Your audience / ICP" aria-label="Your audience" />
              <label className="flex items-center gap-1.5">
                <span className="tag-mono shrink-0 text-[10px] text-cream-100/70">Target</span>
                <input type="number" min="1" value={db.aim.target} onChange={(e) => setDb((d) => ({ ...d, aim: { ...d.aim, target: Math.max(1, Math.round(num(e.target.value, 100))) } }))}
                  className={`${inputCls} bg-cream-50`} aria-label="Target customer count" />
              </label>
            </div>
          </div>
        </section>

        {/* ============ board + legend ============ */}
        <section className="no-print grid gap-5 lg:grid-cols-[1fr_380px]">
          <div className="paper-card flex flex-col items-center gap-4 rounded-2xl border border-cream-300 p-5 shadow-board">
            <BoardHero db={db} selectedId={selectedId} onSelect={setSelectedId} />
            <GuardrailStrip db={db} />
            {active === 0 && (
              <p className="flex max-w-md items-start gap-2 rounded-lg border border-cream-300 bg-cream-100 px-3 py-2 text-xs text-ink-700">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brass-500" aria-hidden />
                Every channel starts on the Untested outer ring. Pick one below, promote it to Testing, and log your first cheap test.
              </p>
            )}
          </div>
          <div className="h-[420px] lg:h-auto">
            <ChannelLegendList db={db} selectedId={selectedId} onSelect={setSelectedId} query={query} setQuery={setQuery} ringFilter={ringFilter} setRingFilter={setRingFilter} />
          </div>
        </section>

        {/* ============ portfolio signal + learnings ============ */}
        <section className="no-print mt-5 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <div className="paper-card rounded-2xl border border-cream-300 p-4 shadow-board">
            <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold text-ink-900">
              <Gauge className="h-5 w-5 text-brass-500" aria-hidden /> Signal across all experiments
            </h2>
            <ResultBar experiments={allExperiments(db)} />
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-ink-700">
              {RESULT_IDS.map((r) => (
                <span key={r} className="inline-flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${RESULT_META[r].dot}`} aria-hidden />
                  {RESULT_META[r].label} · {resultCounts(allExperiments(db))[r]}
                </span>
              ))}
            </div>
          </div>
          <LearningsFeed db={db} />
        </section>

        {/* ============ copilot ============ */}
        <section className="no-print mt-8" aria-label="Claude Copilot">
          <div className="wire-rule mb-5" />
          <div className="board-panel overflow-hidden rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-felt-700 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brass-500/20 text-brass-400"><Sparkles className="h-4 w-4" aria-hidden /></span>
                <div>
                  <h2 className="font-display text-base font-bold text-cream-50">Range Officer — Claude Copilot</h2>
                  <p className="text-[11px] text-cream-100/70">Generates a complete prompt from your live board. Paste into claude.ai — works with the standard Claude subscription, no API key.</p>
                </div>
              </div>
              {activeAction.needsChannel && (
                <label className="flex items-center gap-2 text-xs text-cream-100/80">
                  <Crosshair className="h-3.5 w-3.5" aria-hidden /> Channel:
                  <select
                    value={copilotChannel?.id || ''}
                    onChange={(e) => setCopilot((c) => ({ ...c, channelId: e.target.value }))}
                    className="rounded-md border border-felt-600 bg-felt-800 px-2 py-1 text-cream-50"
                    aria-label="Choose channel for Copilot"
                  >
                    {CHANNELS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
              )}
            </div>
            <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
              <div className="flex flex-col gap-2 border-b border-felt-700 p-4 lg:border-b-0 lg:border-r">
                {COPILOT_ACTIONS.map((a) => (
                  <button key={a.id} onClick={() => setCopilot((c) => ({ ...c, action: a.id }))}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      copilot.action === a.id ? 'border-brass-400 bg-brass-500/15' : 'border-felt-700 bg-felt-800/60 hover:border-felt-500'
                    }`}
                  >
                    <span className="flex items-center gap-2 font-display text-sm font-bold text-cream-50">
                      <a.icon className="h-4 w-4 text-brass-400" aria-hidden /> {a.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-cream-100/70">{a.desc}</span>
                  </button>
                ))}
              </div>
              <div className="p-4">
                {promptInfo.prompt ? (
                  <>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="tag-mono text-[10px] font-semibold text-cream-100/70">
                        Prompt · {activeAction.title}{activeAction.needsChannel && copilotChannel ? ` · ${copilotChannel.name}` : ''}
                      </span>
                      <Btn kind="solid" onClick={async () => { await copyText(promptInfo.prompt); say('Prompt copied — paste into claude.ai'); }}>
                        <Copy className="h-4 w-4" aria-hidden /> Copy prompt
                      </Btn>
                    </div>
                    <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-felt-700 bg-felt-950/70 p-3.5 font-mono text-[11.5px] leading-relaxed text-cream-100">{promptInfo.prompt}</pre>
                  </>
                ) : (
                  <p className="rounded-xl border-2 border-dashed border-felt-700 px-4 py-8 text-center text-sm text-cream-100/70">{promptInfo.empty}</p>
                )}
                <label className="mt-3 block">
                  <span className="tag-mono mb-1 block text-[10px] font-semibold text-cream-100/70">Log Claude's answer (saved with your board)</span>
                  <textarea rows={3} value={db.copilotNotes} onChange={(e) => setDb((d) => ({ ...d, copilotNotes: e.target.value }))}
                    className="w-full rounded-xl border border-felt-700 bg-felt-800/60 p-2.5 text-xs text-cream-50 placeholder:text-cream-100/40"
                    placeholder="Paste the useful parts of Claude's answer here so the thinking stays with the board." />
                </label>
              </div>
            </div>
          </div>
        </section>

        <footer className="no-print mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-felt-700 pb-8 pt-4 text-[11px] text-cream-100/60">
          <span className="tag-mono">Traction Bullseye · range edition</span>
          <span>Data stays in this browser (localStorage). Press ? for help · Ctrl/Cmd+S copies the board report.</span>
        </footer>
      </main>

      {/* ============ print sheet ============ */}
      <section className="print-only print-sheet p-8 text-ink-900">
        <h1 className="font-display text-2xl font-bold">Traction Bullseye — Board Report</h1>
        <p className="text-xs">{db.aim.company || 'Company not set'} · exported {new Date().toLocaleDateString()}</p>
        <p className="mt-2 text-xs">Target: first {db.aim.target} customers · Progress: {won}/{db.aim.target} · Active channels: {active}/{MAX_ACTIVE}</p>
        {['inner', 'middle', 'outer'].map((ringId) => {
          const meta = RINGS.find((r) => r.id === ringId);
          const chs = CHANNELS.filter((c) => db.board[c.id].ring === ringId);
          return (
            <div key={ringId} className="mt-5">
              <h2 className="tag-mono border-b border-ink-500 pb-1 text-sm font-semibold">{meta.label} ({chs.length})</h2>
              {chs.map((c) => (
                <div key={c.id} className="mt-2 border-b border-dashed border-cream-300 pb-2 text-xs">
                  <strong className="font-display text-sm">{c.name}</strong>
                  {db.board[c.id].experiments.length === 0 && ' — no experiments logged.'}
                  {db.board[c.id].experiments.map((e) => (
                    <p key={e.id} className="mt-0.5">
                      {fmtDate(e.startedAt)} · {RESULT_META[e.result].label} · {e.hypothesis || 'no hypothesis recorded'}{e.learning ? ` — ${e.learning}` : ''}
                    </p>
                  ))}
                </div>
              ))}
              {chs.length === 0 && <p className="mt-1 text-xs italic">Empty ring.</p>}
            </div>
          );
        })}
        <h2 className="tag-mono mt-5 border-b border-ink-500 pb-1 text-sm font-semibold">Learnings feed</h2>
        {learningsFeed(db).map((l) => (
          <p key={l.id} className="mt-1 text-xs">{fmtDate(l.completedAt || l.startedAt)} — [{l.channelName}] {RESULT_META[l.result].label}: {l.learning}</p>
        ))}
      </section>

      {/* ============ channel panel ============ */}
      {selectedChannel && (
        <ChannelPanel
          channel={selectedChannel}
          db={db}
          onPromote={() => promoteChannel(selectedChannel.id)}
          onDemote={() => demoteChannel(selectedChannel.id)}
          onAddExperiment={() => addExperiment(selectedChannel.id)}
          onUpdateExperiment={(expId, patch) => updateExperiment(selectedChannel.id, expId, patch)}
          onDeleteExperiment={(exp) => deleteExperiment(selectedChannel.id, exp)}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* ============ modals ============ */}
      {helpOpen && (
        <Modal title="How to run the range" onClose={closeHelp} wide>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-700">
            <li><strong>First open.</strong> This guide appears automatically. Close it with <em>Got it</em> or <kbd className="rounded border border-cream-300 bg-cream-200 px-1">Esc</kbd>; reopen anytime with <kbd className="rounded border border-cream-300 bg-cream-200 px-1">?</kbd>.</li>
            <li><strong>Set your aim.</strong> Company, offer, audience, and target customer count — these feed the center dial and every Copilot prompt.</li>
            <li><strong>Load the demo</strong> to see a board "done well": 3 active channels, real experiment history, one channel demoted after a no-go, and a stocked learnings feed.</li>
            <li><strong>Pick a channel.</strong> Click a marker on the board or a row in the list on the right. Every channel starts on the Untested outer ring.</li>
            <li><strong>Promote it to Testing.</strong> The guardrail allows only {MAX_ACTIVE} active channels (Testing + Focus) at once — demote one before adding a fourth.</li>
            <li><strong>Log a cheap test.</strong> Hypothesis, the test itself, cost in dollars and hours — then come back and record the result, customers won, and what you learned.</li>
            <li><strong>Read the signal.</strong> Promising tests can be promoted to Focus; no-go tests get demoted back to Untested. Every written learning lands in the feed.</li>
            <li><strong>Use the Range Officer,</strong> then export. Copy the Markdown report, download JSON or CSV, or print a clean board report.</li>
          </ol>
          <h3 className="tag-mono mt-4 text-xs font-semibold text-ink-700">Keyboard</h3>
          <table className="mt-1.5 w-full text-sm text-ink-700">
            <tbody>
              {[
                ['?', 'Open this guide'],
                ['Esc', 'Close dialogs and the channel panel'],
                ['/', 'Focus search'],
                ['Ctrl/Cmd + S', 'Copy the Markdown board report'],
                ['→ / ←', 'Promote / demote the open channel a ring'],
              ].map(([k, v]) => (
                <tr key={k} className="border-t border-cream-200">
                  <td className="py-1 pr-3 font-mono text-xs font-semibold">{k}</td>
                  <td className="py-1">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 text-right">
            <Btn kind="go" onClick={closeHelp}><Check className="h-4 w-4" aria-hidden /> Got it</Btn>
          </div>
        </Modal>
      )}

      {modal === 'reset' && (
        <Modal title="Clear the board?" onClose={() => setModal(null)}>
          <p className="text-sm text-ink-700">
            This removes every channel's ring position, all experiments, and your aim from this browser. Download a JSON backup first if you might want it back.
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Btn kind="paper" onClick={() => setModal(null)}>Keep everything</Btn>
            <Btn kind="paper" onClick={exportJson}><FileJson className="h-4 w-4" aria-hidden /> Backup JSON</Btn>
            <Btn kind="bull" onClick={doReset}><RotateCcw className="h-4 w-4" aria-hidden /> Yes, clear it</Btn>
          </div>
        </Modal>
      )}

      {modal === 'export' && (
        <Modal title="Export the board" onClose={() => setModal(null)}>
          <div className="grid gap-2">
            <Btn kind="paper" onClick={() => { copyMarkdown(); setModal(null); }} className="justify-start">
              <FileText className="h-4 w-4 text-brass-600" aria-hidden /> Copy Markdown report <span className="ml-auto text-[10px] text-ink-500">Ctrl/Cmd+S</span>
            </Btn>
            <Btn kind="paper" onClick={exportJson} className="justify-start">
              <FileJson className="h-4 w-4 text-brass-600" aria-hidden /> Download JSON (full state)
            </Btn>
            <Btn kind="paper" onClick={exportCsv} className="justify-start">
              <FileSpreadsheet className="h-4 w-4 text-brass-600" aria-hidden /> Download CSV (experiment table)
            </Btn>
            <Btn kind="paper" onClick={() => fileRef.current?.click()} className="justify-start">
              <Upload className="h-4 w-4 text-brass-600" aria-hidden /> Import JSON backup
            </Btn>
            <Btn kind="paper" onClick={() => window.print()} className="justify-start">
              <Printer className="h-4 w-4 text-brass-600" aria-hidden /> Print the board report
            </Btn>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={importJson} className="hidden" aria-label="Import JSON file" />
        </Modal>
      )}

      {/* ============ toasts ============ */}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2">
        {undo && (
          <div className="toast-in pointer-events-auto flex items-center gap-3 rounded-xl border border-felt-700 bg-felt-900 px-4 py-2.5 text-sm text-cream-50 shadow-deep">
            <Trash2 className="h-4 w-4 text-bull-400" aria-hidden />
            {undo.msg}
            <button
              onClick={() => { undo.restore(); setUndo(null); clearTimeout(undoTimer.current); }}
              className="inline-flex items-center gap-1 rounded-md bg-brass-500 px-2.5 py-1 text-xs font-bold text-ink-900 hover:bg-brass-400"
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden /> Undo
            </button>
          </div>
        )}
        {toast && (
          <div className="toast-in pointer-events-auto flex items-center gap-2 rounded-xl border border-cream-300 bg-cream-50 px-4 py-2 text-sm text-ink-900 shadow-deep">
            <Check className="h-4 w-4 text-go-600" aria-hidden /> {toast}
          </div>
        )}
      </div>
    </div>
  );
}
