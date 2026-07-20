import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ShipWheel, Compass, Gauge, Radio, Flag,
  TrendingUp, TrendingDown, Target, ListChecks, AlertTriangle, CalendarDays,
  ArrowUp, ArrowDown, CircleHelp, BookOpen, Bot, FileDown,
  FileUp, FileText, ClipboardCopy, Printer, X, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, Check, Undo2, Search, SlidersHorizontal, Plus,
  Trash2, RotateCcw, Binoculars, Cable,
} from 'lucide-react';

/* ================================================================
   CONSOLE BUS — BizDev Console link
================================================================ */
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
    try { window.parent.postMessage({ bizdev: 'ready', v: 1, slug: '30-bd-command-deck' }, '*'); } catch {}
    return () => window.removeEventListener('message', onMsg);
  }, []);
  return ctx;
}

function consoleContextHeader(ctx) {
  if (!ctx) return '';
  const lines = [];
  if (ctx.profile?.company) lines.push(`- My company: ${ctx.profile.company}`);
  if (ctx.profile?.offer) lines.push(`- What I sell: ${ctx.profile.offer}`);
  if (ctx.profile?.icp) lines.push(`- My ICP: ${ctx.profile.icp}`);
  if (ctx.profile?.pricingAnchor) lines.push(`- Pricing anchor: ${ctx.profile.pricingAnchor}`);
  const nameVoice = [ctx.claude?.userName, ctx.claude?.voiceNotes].filter(Boolean).join(' — ');
  if (nameVoice) lines.push(`- My name / voice: ${nameVoice}`);
  if (ctx.roster?.accounts?.length) {
    const accts = ctx.roster.accounts.slice(0, 12)
      .map((a) => (a.segment ? `${a.name} (${a.segment})` : a.name)).join(', ');
    lines.push(`- Accounts on file: ${accts}`);
  }
  if (!lines.length) return '';
  return `## Shared context (from BizDev Console)\n${lines.join('\n')}\n\n`;
}

function ConsoleLinkedPill({ ctx }) {
  if (!ctx) return null;
  const company = ctx.profile?.company;
  return (
    <span
      title={company ? `Linked to BizDev Console — ${company}` : 'Linked to BizDev Console'}
      className="label-cap inline-flex items-center gap-1.5 rounded border border-brass/50 bg-brass/10 px-2.5 py-1.5 text-[11px] font-semibold text-brass">
      <Cable className="h-3.5 w-3.5 shrink-0" aria-hidden /> Console linked{company ? ` · ${company}` : ''}
    </span>
  );
}

/* ================================================================
   CONSTANTS — the bridge's instrument roster
================================================================ */
const LS_KEY = 'bizdev:30-bd-command-deck:v1';

const METRICS = [
  { key: 'outreach', label: 'Outreach', code: 'OUT', desc: 'Touches sent — cold emails, DMs, calls dialed.' },
  { key: 'conversations', label: 'Conversations', code: 'CONV', desc: 'Real two-way conversations opened.' },
  { key: 'proposals', label: 'Proposals', code: 'PROP', desc: 'Proposals or quotes sent.' },
  { key: 'wins', label: 'Wins', code: 'WIN', desc: 'Deals closed-won.' },
  { key: 'revenue', label: 'Revenue', code: 'REV', desc: 'Revenue booked, in dollars.', isMoney: true },
];

const DEFAULT_TARGETS = { outreach: 60, conversations: 12, proposals: 4, wins: 1, revenue: 6000 };

const STAGE_DEFS = [
  { key: 'reply', from: 'outreach', to: 'conversations', fromLabel: 'Outreach', toLabel: 'Conversations', verb: 'reply rate' },
  { key: 'proposal', from: 'conversations', to: 'proposals', fromLabel: 'Conversations', toLabel: 'Proposals', verb: 'proposal rate' },
  { key: 'win', from: 'proposals', to: 'wins', fromLabel: 'Proposals', toLabel: 'Wins', verb: 'win rate' },
];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const money = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n) || 0);

const compact = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1000) return (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k';
  return String(Math.round(v));
};

const fmtVal = (m, v) => (m.isMoney ? money(v) : (Number(v) || 0).toLocaleString('en-US'));
const fmtValCompact = (m, v) => (m.isMoney ? '$' + compact(v) : compact(v));

const pct = (n) => `${Math.round((Number.isFinite(n) ? n : 0) * 100)}%`;

/* ================================================================
   DATE / QUARTER MATH
================================================================ */
function mondayOf(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 sun .. 6 sat
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function toISO(d) { return d.toISOString().slice(0, 10); }
function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toISO(d);
}
function todayMondayISO() { return toISO(mondayOf(new Date())); }
function weekLabel(iso) {
  const start = new Date(iso + 'T00:00:00');
  const end = new Date(addDays(iso, 6) + 'T00:00:00');
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' });
  return `${startStr}–${endStr}, ${end.getFullYear()}`;
}
function weekLabelShort(iso) {
  const start = new Date(iso + 'T00:00:00');
  return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function quarterOf(iso) {
  const d = new Date(iso + 'T00:00:00');
  return { year: d.getFullYear(), q: Math.floor(d.getMonth() / 3) + 1 };
}
function quarterKey(q) { return `${q.year}-Q${q.q}`; }
function quarterLabel(q) { return `Q${q.q} ${q.year}`; }
function quarterRangeLabel(q) {
  const startMonth = (q.q - 1) * 3;
  const start = new Date(q.year, startMonth, 1);
  const end = new Date(q.year, startMonth + 3, 0);
  return `${start.toLocaleDateString('en-US', { month: 'short' })}–${end.toLocaleDateString('en-US', { month: 'short' })} ${q.year}`;
}
function prevQuarter(q) { return q.q === 1 ? { year: q.year - 1, q: 4 } : { year: q.year, q: q.q - 1 }; }

/* ================================================================
   STATE SHAPE — normalize survives anything
================================================================ */
function blankWeek(weekStart) {
  return {
    id: uid(),
    weekStart,
    actuals: { outreach: 0, conversations: 0, proposals: 0, wins: 0, revenue: 0 },
    worked: '', stalled: '', bets: [],
    createdAt: Date.now(), updatedAt: Date.now(),
  };
}

function normalize(raw) {
  const base = { weeks: [], targets: { ...DEFAULT_TARGETS }, seenGuide: false, copilotNotes: '' };
  if (!raw || typeof raw !== 'object') return base;
  const out = { ...base };
  out.seenGuide = raw.seenGuide === true;
  out.copilotNotes = typeof raw.copilotNotes === 'string' ? raw.copilotNotes : '';
  if (raw.targets && typeof raw.targets === 'object') {
    for (const m of METRICS) {
      const v = Number(raw.targets[m.key]);
      out.targets[m.key] = Number.isFinite(v) && v >= 0 ? v : DEFAULT_TARGETS[m.key];
    }
  }
  if (Array.isArray(raw.weeks)) {
    out.weeks = raw.weeks
      .filter((w) => w && typeof w === 'object' && typeof w.weekStart === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w.weekStart))
      .map((w) => {
        const nw = blankWeek(w.weekStart);
        nw.id = typeof w.id === 'string' && w.id ? w.id : uid();
        nw.worked = typeof w.worked === 'string' ? w.worked : '';
        nw.stalled = typeof w.stalled === 'string' ? w.stalled : '';
        nw.createdAt = Number.isFinite(w.createdAt) ? w.createdAt : Date.now();
        nw.updatedAt = Number.isFinite(w.updatedAt) ? w.updatedAt : Date.now();
        if (w.actuals && typeof w.actuals === 'object') {
          for (const m of METRICS) {
            const v = Number(w.actuals[m.key]);
            nw.actuals[m.key] = Number.isFinite(v) && v >= 0 ? v : 0;
          }
        }
        if (Array.isArray(w.bets)) {
          nw.bets = w.bets.filter((b) => b && typeof b === 'object').map((b) => ({
            id: typeof b.id === 'string' && b.id ? b.id : uid(),
            text: typeof b.text === 'string' ? b.text : '',
            done: b.done === true,
          }));
        }
        return nw;
      })
      // one entry per weekStart, dedupe keeping latest updatedAt
      .reduce((acc, w) => {
        const i = acc.findIndex((x) => x.weekStart === w.weekStart);
        if (i === -1) acc.push(w);
        else if (w.updatedAt >= acc[i].updatedAt) acc[i] = w;
        return acc;
      }, [])
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  }
  return out;
}

function loadState() {
  try { return normalize(JSON.parse(localStorage.getItem(LS_KEY))); }
  catch { return normalize(null); }
}

/* ================================================================
   SCORING — attainment, tone, streak
================================================================ */
function metricRatio(actual, target) {
  if (!target || target <= 0) return 1;
  return actual / target;
}
function weekHitCount(week, targets) {
  let n = 0;
  for (const m of METRICS) if (metricRatio(week.actuals[m.key], targets[m.key]) >= 1) n++;
  return n;
}
function weekAttainmentPct(week, targets) {
  let sum = 0, n = 0;
  for (const m of METRICS) {
    const t = targets[m.key];
    if (!t || t <= 0) continue;
    sum += week.actuals[m.key] / t;
    n++;
  }
  return n ? Math.round((sum / n) * 100) : 0;
}
function weekTone(week, targets) {
  const hit = weekHitCount(week, targets);
  if (hit >= 5) return 'clear';
  if (hit >= 3) return 'caution';
  return 'deny';
}
function weeksDesc(weeks) { return [...weeks].sort((a, b) => b.weekStart.localeCompare(a.weekStart)); }
function weeksAsc(weeks) { return [...weeks].sort((a, b) => a.weekStart.localeCompare(b.weekStart)); }

function computeStreak(weeks, targets) {
  const desc = weeksDesc(weeks);
  let n = 0;
  for (const w of desc) {
    if (weekTone(w, targets) === 'clear') n++;
    else break;
  }
  return n;
}

function aggregate(weeksArr) {
  const sums = { outreach: 0, conversations: 0, proposals: 0, wins: 0, revenue: 0 };
  for (const w of weeksArr) for (const m of METRICS) sums[m.key] += Number(w.actuals[m.key]) || 0;
  return sums;
}

function waterfallStats(sums) {
  const replyRate = sums.outreach > 0 ? sums.conversations / sums.outreach : NaN;
  const proposalRate = sums.conversations > 0 ? sums.proposals / sums.conversations : NaN;
  const winRate = sums.proposals > 0 ? sums.wins / sums.proposals : NaN;
  const overallRate = sums.outreach > 0 ? sums.wins / sums.outreach : NaN;
  const revPerWin = sums.wins > 0 ? sums.revenue / sums.wins : NaN;
  return { ...sums, replyRate, proposalRate, winRate, overallRate, revPerWin };
}

function weakestStage(stats) {
  const rows = [
    { ...STAGE_DEFS[0], rate: stats.replyRate },
    { ...STAGE_DEFS[1], rate: stats.proposalRate },
    { ...STAGE_DEFS[2], rate: stats.winRate },
  ].filter((r) => Number.isFinite(r.rate));
  if (!rows.length) return null;
  return rows.reduce((a, b) => (b.rate < a.rate ? b : a));
}

function quartersPresent(weeks) {
  const map = new Map();
  for (const w of weeks) {
    const q = quarterOf(w.weekStart);
    const k = quarterKey(q);
    if (!map.has(k)) map.set(k, q);
  }
  return [...map.values()].sort((a, b) => (a.year - b.year) || (a.q - b.q));
}

/* ================================================================
   DEMO DATA — a founder-seller's Q2→Q3 2026 run
================================================================ */
function demoState() {
  const rows = [
    // [weekStart, outreach, conversations, proposals, wins, revenue, worked, stalled, bets(done?)]
    ['2026-04-06', 58, 10, 3, 1, 4800,
      'Restarted the outbound list after the Q1 lull — 58 touches out, first two replies of the quarter.',
      'No proposal moved past "sounds interesting" — nobody asked for pricing.',
      [['Rewrite the opening line — lead with their number, not our pitch', false], ['Book 3 discovery calls before Friday', true]]],
    ['2026-04-13', 61, 11, 3, 0, 0,
      'One demo booked straight from a LinkedIn comment thread, not from cold outreach.',
      'Zero wins this week — the demo from last week went quiet after we sent a recording instead of calling.',
      [['Never send a recording in place of a live follow-up call again', true], ['Add a book-a-call link to every email signature', true]]],
    ['2026-04-20', 55, 9, 2, 1, 5400,
      'Referral from the Meridian contact turned into a real conversation the same day it landed.',
      'Proposal count still thin — only 2 out, both stalled on "let me check budget."',
      [['Ask for the budget number on the call, not after the proposal goes out', false], ['Chase the two open proposals with a short check-in, not a nudge', true]]],
    ['2026-04-27', 64, 12, 4, 1, 6100,
      'First all-green week of the quarter — closed the referral deal, hit every number on the board.',
      'Nothing major broke, but reply quality was thin — mostly polite "not right now."',
      [['Bank the referral playbook — ask every new client for one warm intro', true], ['Test a shorter subject line on next week’s batch', true]]],
    ['2026-05-04', 62, 7, 2, 0, 0,
      'Volume held at 62 touches even through a rough week — didn’t skip a day.',
      'Reply rate fell off a cliff — 7 conversations out of 62 touches. Something in the message stopped landing.',
      [['Pull every reply (and non-reply) from the last 3 weeks and look for the pattern', true], ['Pause the current sequence instead of pushing more volume through it', false]]],
    ['2026-05-11', 59, 6, 1, 0, 0,
      'Kept outreach discipline through the dry spell — the habit didn’t break even when the results did.',
      'Worst week of the quarter: 6 conversations, 1 proposal, $0 booked. The sequence is broken, not the market.',
      [['Rewrite subject lines from scratch — assume the current ones are the problem', true], ['Get one honest "why didn’t you reply" answer from a warm contact', true]]],
    ['2026-05-18', 66, 8, 2, 1, 3200,
      'A warm contact finally told us straight: the subject lines read like spam. Rewrote them Thursday.',
      'Still soft — 8 conversations against 66 touches, and most of the week ran on the old lines.',
      [['Run the new subject lines on the full list Monday, not a test slice', true], ['Track reply rate daily this week to see if the fix is real', true]]],
    ['2026-05-25', 60, 10, 3, 1, 5600,
      'New subject lines are working — conversations back up to 10, and it only took three days to see it.',
      'Proposals still lagging the conversation count — good talks aren’t reaching paper fast enough.',
      [['Send every proposal within 48 hours of a good call, no exceptions', true], ['Ask directly for a close date on the next 3 proposal calls', false]]],
    ['2026-06-01', 63, 13, 4, 1, 6400,
      'First all-green week since April — 63 touches, 13 conversations, one proposal-to-close in the same week.',
      'Nothing stalled — first clean week in five. Watching to see if it holds or if it was luck.',
      [['Document what changed this week so it’s repeatable, not lucky', true], ['Add a second referral ask into the win call script', true]]],
    ['2026-06-08', 61, 12, 4, 1, 6200,
      'Held the line — second straight all-green week, numbers steady rather than spiking.',
      'The conversation-to-proposal gap is widening slightly — good talks, slower to turn into paper.',
      [['Bring a one-page proposal template to cut turnaround time', false], ['Follow up same-day on every "send me something" request', true]]],
    ['2026-06-15', 65, 14, 5, 2, 11800,
      'Best week of the quarter so far — 2 wins, $11.8k booked, and the referral flywheel is starting to turn.',
      'Proposal volume (5) is now the ceiling — can’t close what never gets sent.',
      [['Block 2 hours Monday morning just for proposal writing', true], ['Ask both new clients for their best contact before the kickoff call', true]]],
    ['2026-06-22', 68, 13, 4, 1, 6800,
      'Third straight all-green week — the fixed sequence is now the default, not an experiment.',
      'One proposal sat nine days before a reply — the follow-up cadence is too loose.',
      [['Set a 3-day follow-up rule on every proposal, calendar it at send time', true], ['Start a swipe file of the subject lines that are actually working', true]]],
    ['2026-06-29', 70, 15, 5, 2, 13200,
      'Closed the quarter strong: 2 wins, $13.2k, every number over target — best week to date.',
      'Outreach volume is creeping toward the ceiling of what one person can send by hand.',
      [['Look at a sequencing tool for next quarter — volume is now the constraint', false], ['Write the Q2 close-out note before Monday while it’s fresh', true]]],
    ['2026-07-06', 64, 13, 4, 1, 6500,
      'Streak carried straight into Q3 without a dip — new quarter, same discipline.',
      'Short week for the holiday capped outreach a little below the recent pace.',
      [['Get back to full volume next week now the holiday’s over', true], ['Revisit pricing on the mid-tier package — two prospects flinched at the number', false]]],
    ['2026-07-13', 72, 16, 6, 3, 24500,
      'Biggest week of the year — 3 wins including the Vantage deal, $24.5k booked, streak now at 7 straight.',
      'Time budget is tight — proposal writing is eating evenings; the template still isn’t built.',
      [['Actually build the one-page proposal template — it’s been a bet for 3 weeks running', false], ['Send the streak update to the mastermind group Friday', false]]],
  ];
  const weeks = rows.map(([weekStart, outreach, conversations, proposals, wins, revenue, worked, stalled, bets]) => {
    const w = blankWeek(weekStart);
    w.actuals = { outreach, conversations, proposals, wins, revenue };
    w.worked = worked;
    w.stalled = stalled;
    w.bets = bets.map(([text, done]) => ({ id: uid(), text, done }));
    return w;
  });
  return normalize({
    seenGuide: true,
    targets: { ...DEFAULT_TARGETS },
    copilotNotes: '',
    weeks,
  });
}

/* ================================================================
   SERIALIZATION — markdown, csv
================================================================ */
function weekMarkdown(week, targets) {
  const lines = [];
  const tone = weekTone(week, targets).toUpperCase();
  lines.push(`### Week of ${weekLabel(week.weekStart)} — ${tone} (${weekAttainmentPct(week, targets)}% of target)`);
  lines.push('');
  lines.push('| Metric | Actual | Target | Status |');
  lines.push('| --- | --- | --- | --- |');
  for (const m of METRICS) {
    const a = week.actuals[m.key], t = targets[m.key];
    const hit = metricRatio(a, t) >= 1;
    lines.push(`| ${m.label} | ${fmtVal(m, a)} | ${fmtVal(m, t)} | ${hit ? 'Hit' : 'Miss'} |`);
  }
  lines.push('');
  lines.push(`**What worked:** ${week.worked.trim() || '—'}`);
  lines.push('');
  lines.push(`**What stalled:** ${week.stalled.trim() || '—'}`);
  if (week.bets.length) {
    lines.push('');
    lines.push('**Next bets:**');
    for (const b of week.bets) lines.push(`- [${b.done ? 'x' : ' '}] ${b.text || '(untitled bet)'}`);
  }
  return lines.join('\n');
}

function logMarkdown(state) {
  const { weeks, targets } = state;
  const desc = weeksDesc(weeks);
  const streak = computeStreak(weeks, targets);
  const stats = waterfallStats(aggregate(weeks));
  const weak = weakestStage(stats);
  const lines = [];
  lines.push('# BD Command Deck — Ship\'s Log');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString().slice(0, 10)} · ${weeks.length} week${weeks.length === 1 ? '' : 's'} logged`);
  lines.push('');
  lines.push(`- Current streak: **${streak} week${streak === 1 ? '' : 's'}** on target (all 5 metrics)`);
  lines.push(`- All-time funnel: ${stats.outreach.toLocaleString()} outreach → ${stats.conversations.toLocaleString()} conversations → ${stats.proposals.toLocaleString()} proposals → ${stats.wins.toLocaleString()} wins · ${money(stats.revenue)} booked`);
  if (weak) lines.push(`- Weakest stage: **${weak.fromLabel} → ${weak.toLabel}** at ${pct(weak.rate)} ${weak.verb}`);
  lines.push('');
  lines.push('| Week | Outreach | Conversations | Proposals | Wins | Revenue | Attainment | Status |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const w of desc) {
    lines.push(`| ${weekLabel(w.weekStart)} | ${w.actuals.outreach} | ${w.actuals.conversations} | ${w.actuals.proposals} | ${w.actuals.wins} | ${money(w.actuals.revenue)} | ${weekAttainmentPct(w, targets)}% | ${weekTone(w, targets).toUpperCase()} |`);
  }
  lines.push('');
  lines.push('---');
  for (const w of desc) {
    lines.push('');
    lines.push(weekMarkdown(w, targets));
  }
  return lines.join('\n');
}

function csvOf(state) {
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const head = ['week_start', ...METRICS.map((m) => m.key + '_actual'), ...METRICS.map((m) => m.key + '_target'), 'attainment_pct', 'status', 'worked', 'stalled', 'open_bets'];
  const rows = weeksDesc(state.weeks).map((w) => {
    const openBets = w.bets.filter((b) => !b.done).map((b) => b.text).join('; ');
    return [
      w.weekStart,
      ...METRICS.map((m) => w.actuals[m.key]),
      ...METRICS.map((m) => state.targets[m.key]),
      weekAttainmentPct(w, state.targets),
      weekTone(w, state.targets),
      w.worked, w.stalled, openBets,
    ].map(esc).join(',');
  });
  return [head.join(','), ...rows].join('\n');
}

/* ---- Copilot prompt builders ---- */
const COPILOT_HINT = 'Paste into claude.ai — works with the standard Claude subscription. No API key needed.';

function promptWeakestStage(state) {
  const { weeks, targets } = state;
  const recent = weeksDesc(weeks).slice(0, 8);
  const stats = waterfallStats(aggregate(recent.length ? recent : weeks));
  const weak = weakestStage(stats);
  return `You are a B2B revenue operations analyst who specializes in diagnosing where a seller's funnel actually leaks — not where they assume it does. You have reviewed hundreds of outbound funnels and know that sellers usually blame the stage they find most emotionally uncomfortable (often "closing"), when the data more often points somewhere earlier.

Here is my conversion funnel over the last ${recent.length || weeks.length} logged week${(recent.length || weeks.length) === 1 ? '' : 's'}, from my BD Command Deck:

- Outreach (touches sent): ${stats.outreach.toLocaleString()}
- Conversations (replies that became real dialogue): ${stats.conversations.toLocaleString()} — reply rate ${pct(stats.replyRate)}
- Proposals (sent): ${stats.proposals.toLocaleString()} — proposal rate ${pct(stats.proposalRate)}
- Wins (closed): ${stats.wins.toLocaleString()} — win rate ${pct(stats.winRate)}
- Revenue booked: ${money(stats.revenue)} (${Number.isFinite(stats.revPerWin) ? money(stats.revPerWin) : 'n/a'} average per win)
- Weekly targets: ${METRICS.map((m) => `${m.label} ${fmtVal(m, targets[m.key])}`).join(', ')}
${weak ? `- My own instrument reads the weakest stage as **${weak.fromLabel} → ${weak.toLabel}** at ${pct(weak.rate)} ${weak.verb}.` : ''}

Diagnose the funnel:

1. **Confirm or challenge the weakest-stage read.** Do you agree ${weak ? `${weak.fromLabel} → ${weak.toLabel}` : 'the flagged stage'} is the real bottleneck, using only the rates above? If you'd point somewhere else, say where and why.
2. **Root causes.** The 3 most likely reasons that specific stage is underperforming for a solo or small-team B2B seller — ranked by how common they are.
3. **The fix, ranked by leverage.** 3 concrete changes I could make next week, ordered by expected impact on the weakest stage specifically — not generic sales advice.
4. **The number to watch.** Which single rate above should I track weekly to know if the fix is working, and what would "working" look like within 2–3 weeks?

Format: four numbered sections with bold headers, tight bullets, no motivational filler. Reason only from the numbers given — do not invent facts about my business.`;
}

function promptPlanNextWeek(state) {
  const { weeks, targets } = state;
  const desc = weeksDesc(weeks);
  const recent = desc.slice(0, 4);
  const streak = computeStreak(weeks, targets);
  const lastWeek = desc[0];
  const openBets = lastWeek ? lastWeek.bets.filter((b) => !b.done) : [];
  const recentBlock = recent.length
    ? recent.map((w) => weekMarkdown(w, targets)).join('\n\n')
    : '_No weeks logged yet — this will be the first entry._';
  return `You are a sharp, no-nonsense sales manager doing my Monday-morning planning session. You have my actual numbers, not my mood, and you coach from evidence.

My most recent week${recent.length === 1 ? '' : 's'} on the bridge (newest first):

${recentBlock}

Current streak: ${streak} consecutive week${streak === 1 ? '' : 's'} hitting all 5 targets.
${openBets.length ? `Open bets carried from last week that never got done: ${openBets.map((b) => `"${b.text}"`).join('; ')}.` : 'No open bets carried over from last week.'}

Plan my next week:

1. **One-sentence read on where I stand** — streak, momentum, and the single number most worth watching this week.
2. **This week's numeric targets** — for each of Outreach, Conversations, Proposals, Wins, propose a specific number (not just "hit target") based on the recent trend, and say whether I should push harder than the standard target or hold steady.
3. **Top 3 actions**, in priority order, each tied to a specific stalled item or open bet above — not generic advice. Say what to actually do, not just what to feel.
4. **The one thing to NOT do** — the most tempting distraction given this data, and why to skip it this week.

Format: four numbered sections, bold headers, short bullets. Base every recommendation on the data above; if something is missing, say what you'd need to know instead of guessing.`;
}

function promptAccountabilityUpdate(state) {
  const { weeks, targets } = state;
  const desc = weeksDesc(weeks);
  const lastWeek = desc[0];
  const streak = computeStreak(weeks, targets);
  const quarters = quartersPresent(weeks);
  const currentQ = quarters[quarters.length - 1];
  const qWeeks = currentQ ? weeks.filter((w) => quarterKey(quarterOf(w.weekStart)) === quarterKey(currentQ)) : [];
  const qStats = waterfallStats(aggregate(qWeeks));
  const qTargetRevenue = targets.revenue * qWeeks.length;
  return `You are ghostwriting my weekly accountability update — the short note I send to my accountability partner, manager, or mastermind group so someone besides me knows what actually happened this week.

My numbers:

${lastWeek ? weekMarkdown(lastWeek, targets) : '_No weeks logged yet._'}

Current streak: ${streak} consecutive week${streak === 1 ? '' : 's'} on target.
Quarter-to-date (${currentQ ? quarterLabel(currentQ) : 'this quarter'}, ${qWeeks.length} week${qWeeks.length === 1 ? '' : 's'} logged): ${qStats.outreach.toLocaleString()} outreach, ${qStats.wins} wins, ${money(qStats.revenue)} booked against a ${money(qTargetRevenue)} pace-adjusted revenue target.

Write the update:

- **Headline** — one sentence, plain language, leads with the most important fact (a streak, a win, or a stall — whichever is truest).
- **The numbers** — a compact 2-3 line summary of last week vs. target, in prose, not a table.
- **What worked** — 1-2 sentences, specific, no corporate hedging.
- **What stalled** — 1-2 sentences, honest, including if nothing did.
- **What I'm doing next** — the top 1-2 commitments for next week.
- **The ask** (optional, one line) — anything I need from the person reading this, or omit if there's nothing to ask.

Format: under 150 words total, first-person, sounds like a real person wrote it in five minutes — not a status report generated by software. No emoji, no bullet-point walls.`;
}

function promptRitualSynthesis(state) {
  const { weeks, targets } = state;
  const recent = weeksDesc(weeks).slice(0, 6);
  const block = recent.length
    ? recent.map((w) => `**${weekLabel(w.weekStart)}** (${weekTone(w, targets).toUpperCase()})\n- Worked: ${w.worked.trim() || '—'}\n- Stalled: ${w.stalled.trim() || '—'}\n- Bets: ${w.bets.length ? w.bets.map((b) => `${b.done ? '[done] ' : '[open] '}${b.text}`).join('; ') : '—'}`).join('\n\n')
    : '_No weekly reviews logged yet._';
  return `You are my chief of staff. Every week I write three lines in my captain's log — what worked, what stalled, and my next bets — and you read them across time to find the patterns I'm too close to see.

My last ${recent.length || 0} weekly reviews, newest first:

${block}

Do the synthesis:

1. **Recurring blockers** — anything that shows up as "stalled" more than once, worded differently each time but the same root problem. Name the pattern, not just the instances.
2. **Recurring wins** — anything that worked more than once; flag what should become a permanent habit instead of a one-off.
3. **Bets that keep getting deferred** — any "next bet" that appears (even in different words) across multiple weeks without ever showing up as done. Call these out by name — these are the commitments I'm quietly avoiding.
4. **Rewrite my open bets** — take my currently-open (undone) bets and rewrite each as a sharper, more specific commitment: what exactly gets done, and what "done" looks like. Keep my intent, tighten the execution.

Format: four numbered sections, bold headers, quote my own words back to me where it makes the pattern obvious. Do not invent blockers or wins that aren't actually in the log above.`;
}

/* ================================================================
   CLIPBOARD
================================================================ */
function copyText(text, onDone) {
  const finish = (ok) => onDone && onDone(ok);
  if (navigator.clipboard && window.isSecureContext !== false) {
    navigator.clipboard.writeText(text).then(() => finish(true)).catch(() => { fallbackCopy(text); finish(true); });
  } else { fallbackCopy(text); finish(true); }
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); } catch { /* no-op */ }
  document.body.removeChild(ta);
}

/* ================================================================
   SIGNATURE SVG — the bridge's brass mark
================================================================ */
function BridgeMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none">
      <circle cx="32" cy="32" r="27" fill="var(--color-bridge-900)" stroke="var(--color-brass)" strokeWidth="2.4" />
      <circle cx="32" cy="32" r="21" fill="none" stroke="var(--color-brass-deep)" strokeWidth="1" />
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i * 360) / 16;
        const t = (a * Math.PI) / 180;
        const major = i % 4 === 0;
        const r1 = major ? 21 : 23.5;
        const r2 = 26;
        return (
          <line key={i}
            x1={32 + r1 * Math.sin(t)} y1={32 - r1 * Math.cos(t)}
            x2={32 + r2 * Math.sin(t)} y2={32 - r2 * Math.cos(t)}
            stroke={major ? 'var(--color-brass-bright)' : 'var(--color-brass-deep)'} strokeWidth={major ? 1.6 : 0.9} />
        );
      })}
      <g stroke="var(--color-glass)" strokeWidth="1.4" strokeLinecap="round">
        <line x1="32" y1="32" x2="32" y2="14" />
        <line x1="32" y1="32" x2="21" y2="40" />
      </g>
      <path d="M32 12 L36 32 L32 52 L28 32 Z" fill="var(--color-brass)" opacity="0.9" />
      <circle cx="32" cy="32" r="3.4" fill="var(--color-brass-bright)" stroke="var(--color-bridge-950)" strokeWidth="1" />
    </svg>
  );
}

function BridgeHero() {
  return (
    <svg viewBox="0 0 360 150" className="mx-auto w-full max-w-lg" aria-hidden fill="none">
      <ellipse cx="180" cy="140" rx="170" ry="8" fill="var(--color-bridge-800)" opacity="0.6" />
      {/* console base */}
      <path d="M20 128 Q180 96 340 128 L340 140 Q180 112 20 140 Z" fill="var(--color-bridge-850)" stroke="var(--color-bridge-700)" />
      {/* three brass gauges on the console */}
      {[
        { cx: 96, r: 30 }, { cx: 180, r: 38 }, { cx: 264, r: 30 },
      ].map((g, i) => (
        <g key={i}>
          <circle cx={g.cx} cy={100 - (i === 1 ? 8 : 0)} r={g.r} fill="var(--color-bridge-900)" stroke="var(--color-brass)" strokeWidth="2.2" />
          <circle cx={g.cx} cy={100 - (i === 1 ? 8 : 0)} r={g.r - 6} fill="none" stroke="var(--color-brass-deep)" strokeWidth="1" />
          <circle cx={g.cx} cy={100 - (i === 1 ? 8 : 0)} r={g.r - 6} fill="rgb(73 211 206 / 0.08)" />
          <line x1={g.cx} y1={100 - (i === 1 ? 8 : 0)}
            x2={g.cx + (g.r - 10) * Math.sin((i === 0 ? -40 : i === 1 ? 20 : 60) * Math.PI / 180)}
            y2={100 - (i === 1 ? 8 : 0) - (g.r - 10) * Math.cos((i === 0 ? -40 : i === 1 ? 20 : 60) * Math.PI / 180)}
            stroke="var(--color-brass-bright)" strokeWidth="2" strokeLinecap="round" className="anim-lamp" />
          <circle cx={g.cx} cy={100 - (i === 1 ? 8 : 0)} r="2.4" fill="var(--color-brass-bright)" />
        </g>
      ))}
      {/* ship's wheel, off to the side */}
      <g transform="translate(320 44)">
        <circle r="20" fill="none" stroke="var(--color-brass)" strokeWidth="2.6" />
        <circle r="6" fill="var(--color-bridge-900)" stroke="var(--color-brass)" strokeWidth="1.6" />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * 360) / 8;
          const t = (a * Math.PI) / 180;
          return <line key={i} x1={6 * Math.sin(t)} y1={-6 * Math.cos(t)} x2={20 * Math.sin(t)} y2={-20 * Math.cos(t)} stroke="var(--color-brass)" strokeWidth="2.4" strokeLinecap="round" />;
        })}
      </g>
      {/* signal flags hoisted top-left */}
      <g transform="translate(28 20)">
        <line x1="0" y1="0" x2="0" y2="58" stroke="var(--color-bridge-600)" strokeWidth="1.4" />
        {[
          { y: 4, w: 22, fill: 'var(--color-brass)' },
          { y: 16, w: 16, fill: 'var(--color-glass)' },
          { y: 26, w: 19, fill: 'var(--color-clear)' },
        ].map((f, i) => (
          <polygon key={i} points={`0,${f.y} ${f.w},${f.y + 5} 0,${f.y + 10}`} fill={f.fill} opacity="0.92" />
        ))}
      </g>
      <text x="180" y="14" textAnchor="middle" fill="var(--color-bridge-400)" fontFamily="var(--font-mono)" fontSize="9" letterSpacing="3">COMMAND DECK</text>
    </svg>
  );
}

/* ================================================================
   GAUGE — radial brass + glass instrument
================================================================ */
function GaugeDial({ metric, value, target, size = 128 }) {
  const cx = 64, cy = 62, r = 46;
  const a0 = -215, a1 = 35; // 250deg sweep
  const angle = (v) => a0 + ((a1 - a0) * v) / 100;
  const point = (deg, rad) => {
    const t = ((deg - 90) * Math.PI) / 180;
    return [cx + rad * Math.cos(t), cy + rad * Math.sin(t)];
  };
  const max = Math.max(value, target, 1) * (value > target ? 1.25 : 1.35);
  const toPctScale = (v) => Math.max(0, Math.min(100, (v / max) * 100));
  const valuePct = toPctScale(value);
  const targetPct = toPctScale(target);
  const needleAngle = angle(valuePct);
  const arc = (from, to, rad) => {
    const [x1, y1] = point(angle(from), rad); const [x2, y2] = point(angle(to), rad);
    const large = angle(to) - angle(from) > 180 ? 1 : 0;
    return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${rad} ${rad} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  const tone = value >= target && target > 0 ? 'var(--color-clear)' : value >= target * 0.7 ? 'var(--color-caution)' : 'var(--color-deny)';
  const ticks = [];
  for (let v = 0; v <= 100; v += 20) {
    const [x1, y1] = point(angle(v), r + 3);
    const [x2, y2] = point(angle(v), r + 9);
    ticks.push(<line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-bridge-400)" strokeWidth="1.4" />);
  }
  const [tx, ty] = point(angle(targetPct), r + 3);
  const [tx2, ty2] = point(angle(targetPct), r - 8);
  return (
    <svg viewBox="0 0 128 118" width={size} height={(size / 128) * 118} role="img" aria-label={`${metric.label}: ${fmtVal(metric, value)} of ${fmtVal(metric, target)} target`}>
      <circle cx={cx} cy={cy} r={r + 15} fill="var(--color-bridge-900)" stroke="var(--color-brass-deep)" strokeWidth="1.2" />
      <circle cx={cx} cy={cy} r={r + 11} fill="none" stroke="var(--color-brass)" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={r + 6} fill="rgb(73 211 206 / 0.06)" />
      <path d={arc(0, 100, r)} stroke="var(--color-bridge-700)" strokeWidth="7" fill="none" />
      <path d={arc(0, Math.max(2, valuePct), r)} stroke={tone} strokeWidth="7" fill="none" strokeLinecap="round" />
      {ticks}
      <line x1={tx} y1={ty} x2={tx2} y2={ty2} stroke="var(--color-brass-bright)" strokeWidth="2" />
      <g className="anim-needle" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <line x1={cx} y1={cy} x2={point(needleAngle, r - 5)[0]} y2={point(needleAngle, r - 5)[1]} stroke="var(--color-bridge-100)" strokeWidth="2" strokeLinecap="round" />
      </g>
      <circle cx={cx} cy={cy} r="4.5" fill="var(--color-brass-bright)" stroke="var(--color-bridge-950)" strokeWidth="1" />
      <text x={cx} y={cy + 28} textAnchor="middle" fill="var(--color-bridge-100)" fontSize="15" fontWeight="700" fontFamily="var(--font-mono)">{fmtValCompact(metric, value)}</text>
      <text x={cx} y={cy + 40} textAnchor="middle" fill="var(--color-bridge-400)" fontSize="7" fontFamily="var(--font-mono)" letterSpacing="1.5">/ {fmtValCompact(metric, target)} {metric.code}</text>
    </svg>
  );
}

/* ================================================================
   SPARKLINE — glass-tube trend readout
================================================================ */
function Sparkline({ values, target, metric, width = 148, height = 44 }) {
  const n = values.length;
  const max = Math.max(target || 0, ...values, 1) * 1.15;
  const xAt = (i) => n <= 1 ? width / 2 : (i / (n - 1)) * (width - 8) + 4;
  const yAt = (v) => height - 6 - (Math.min(v, max) / max) * (height - 14);
  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(' ');
  const last = values[n - 1] ?? 0;
  const prev = values[n - 2];
  const tone = last >= (target || 0) ? 'var(--color-clear)' : last >= (target || 0) * 0.7 ? 'var(--color-caution)' : 'var(--color-deny)';
  const trendUp = prev !== undefined && last > prev;
  const trendDown = prev !== undefined && last < prev;
  return (
    <div className="panel-sunk rounded-md px-2 py-1.5">
      <div className="mb-1 flex items-center justify-between">
        <span className="label-cap text-[9px] text-bridge-400">{metric.code}</span>
        {trendUp && <TrendingUp className="h-3 w-3 text-clear" aria-hidden />}
        {trendDown && <TrendingDown className="h-3 w-3 text-deny" aria-hidden />}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label={`${metric.label} trend, last ${n} weeks, latest ${fmtVal(metric, last)}`}>
        {target > 0 && (
          <line x1="0" y1={yAt(target)} x2={width} y2={yAt(target)} stroke="var(--color-brass)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
        )}
        {n > 1 && <path d={path} fill="none" stroke="var(--color-glass)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
        {values.map((v, i) => (
          <circle key={i} cx={xAt(i)} cy={yAt(v)} r={i === n - 1 ? 2.6 : 1.5}
            fill={i === n - 1 ? tone : 'var(--color-bridge-400)'} />
        ))}
      </svg>
      <div className="readout text-right text-[11px] font-semibold">{fmtValCompact(metric, last)}</div>
    </div>
  );
}

/* ================================================================
   WATERFALL — conversion funnel, brass connectors
================================================================ */
function Waterfall({ stats, scopeLabel }) {
  const stages = [
    { label: 'Outreach', value: stats.outreach, code: 'OUT' },
    { label: 'Conversations', value: stats.conversations, code: 'CONV' },
    { label: 'Proposals', value: stats.proposals, code: 'PROP' },
    { label: 'Wins', value: stats.wins, code: 'WIN' },
  ];
  const rates = [stats.replyRate, stats.proposalRate, stats.winRate];
  const weak = weakestStage(stats);
  const W = 560, barH = 40, gap = 26, minW = 80, maxW = 300;
  const cx = 175;
  const base = Math.max(stages[0].value, 1);
  const barsGeo = stages.map((s) => {
    const ratio = Math.sqrt(Math.max(s.value, 0) / base);
    const w = base === 0 ? minW : Math.max(minW, Math.min(maxW, minW + (maxW - minW) * ratio));
    return { ...s, w };
  });
  const totalH = barsGeo.length * barH + (barsGeo.length - 1) * gap + 12;
  return (
    <div className="panel brass-rim relative rounded-lg p-4">
      <span className="rivet" style={{ top: 8, left: 8 }} />
      <span className="rivet" style={{ top: 8, right: 8 }} />
      <span className="rivet" style={{ bottom: 8, left: 8 }} />
      <span className="rivet" style={{ bottom: 8, right: 8 }} />
      <div className="mb-3 flex items-center justify-between">
        <h3 className="label-cap text-xs text-bridge-300">Conversion Waterfall</h3>
        <span className="label-cap text-[10px] text-bridge-500">{scopeLabel}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${totalH}`} width="100%" role="img" aria-label="Conversion waterfall from outreach to wins">
        {barsGeo.map((s, i) => {
          const y = 6 + i * (barH + gap);
          const x = cx - s.w / 2;
          const fill = i === 0 ? 'var(--color-brass)' : i === barsGeo.length - 1 ? 'var(--color-clear)' : 'var(--color-glass)';
          const next = barsGeo[i + 1];
          return (
            <g key={s.code}>
              {next && (() => {
                const y2 = 6 + (i + 1) * (barH + gap);
                const x2 = cx - next.w / 2;
                return (
                  <polygon
                    points={`${x},${y + barH} ${x + s.w},${y + barH} ${x2 + next.w},${y2} ${x2},${y2}`}
                    fill="var(--color-brass)" opacity={weak && weak.key === STAGE_DEFS[i].key ? 0.28 : 0.13}
                  />
                );
              })()}
              <rect x={x} y={y} width={s.w} height={barH} rx="5" fill="var(--color-bridge-800)" stroke={fill} strokeWidth="1.6" />
              <rect x={x} y={y} width={s.w} height={barH / 2} rx="5" fill="white" opacity="0.04" />
              <text x={cx} y={y + barH / 2 - 3} textAnchor="middle" fill="var(--color-bridge-100)" fontFamily="var(--font-mono)" fontWeight="700" fontSize="15">{s.value.toLocaleString()}</text>
              <text x={cx} y={y + barH / 2 + 12} textAnchor="middle" fill="var(--color-bridge-400)" fontFamily="var(--font-mono)" fontSize="8" letterSpacing="1">{s.label.toUpperCase()}</text>
              {i < rates.length && Number.isFinite(rates[i]) && (
                <text x={cx + maxW / 2 + 26} y={y + barH + gap / 2 + 3} textAnchor="start"
                  fill={weak && weak.key === STAGE_DEFS[i].key ? 'var(--color-deny)' : 'var(--color-bridge-400)'}
                  fontFamily="var(--font-mono)" fontSize="10" fontWeight={weak && weak.key === STAGE_DEFS[i].key ? '700' : '400'}>
                  {pct(rates[i])} {STAGE_DEFS[i].verb}{weak && weak.key === STAGE_DEFS[i].key ? ' ▾ weakest' : ''}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-bridge-700 pt-3">
        <div>
          <span className="label-cap text-[10px] text-bridge-400">Revenue booked</span>
          <div className="readout text-lg font-bold">{money(stats.revenue)}</div>
        </div>
        <div className="text-right">
          <span className="label-cap text-[10px] text-bridge-400">Avg. per win</span>
          <div className="readout text-lg font-bold">{Number.isFinite(stats.revPerWin) ? money(stats.revPerWin) : '—'}</div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   PENNANT ROW — signal flags for the streak
================================================================ */
function PennantRow({ weeks, targets, count = 8 }) {
  const recent = weeksAsc(weeks).slice(-count);
  const pad = count - recent.length;
  const slots = [...Array(pad).fill(null), ...recent];
  const colorFor = (w) => {
    if (!w) return 'var(--color-bridge-700)';
    const t = weekTone(w, targets);
    return t === 'clear' ? 'var(--color-clear)' : t === 'caution' ? 'var(--color-caution)' : 'var(--color-deny)';
  };
  return (
    <svg viewBox={`0 0 ${count * 20 + 8} 40`} width="100%" height="40" role="img" aria-label="Signal flags: recent week status">
      <line x1="4" y1="4" x2={count * 20 + 4} y2="4" stroke="var(--color-bridge-600)" strokeWidth="1.4" />
      {slots.map((w, i) => (
        <g key={i} className="anim-flag" style={{ animationDelay: `${i * 40}ms` }} transform={`translate(${6 + i * 20} 4)`}>
          <line x1="0" y1="0" x2="0" y2="22" stroke="var(--color-bridge-600)" strokeWidth="1" />
          <polygon points="0,2 14,7 0,12" fill={colorFor(w)} opacity={w ? 0.95 : 0.35} />
        </g>
      ))}
    </svg>
  );
}

/* ================================================================
   MODAL SHELL
================================================================ */
function Modal({ label, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div
      role="dialog" aria-modal="true" aria-label={label}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-bridge-950/85 p-4 backdrop-blur-sm sm:p-8 no-print"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={ref} tabIndex={-1} className={`panel brass-rim relative mt-4 w-full rounded-lg outline-none ${wide ? 'max-w-3xl' : 'max-w-xl'}`}>
        <div className="signal-bar-thin h-2 rounded-t-lg" aria-hidden />
        <button
          onClick={onClose} aria-label="Close dialog"
          className="absolute right-3 top-4 rounded p-1.5 text-bridge-300 hover:bg-bridge-700 hover:text-bridge-100"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        {children}
      </div>
    </div>
  );
}

/* ================================================================
   SMALL ATOMS
================================================================ */
function ToneDot({ tone }) {
  const cls = tone === 'clear' ? 'bg-clear' : tone === 'caution' ? 'bg-caution' : 'bg-deny';
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} aria-hidden />;
}

function AttainmentBar({ actual, target, isMoney = false }) {
  const pctv = target > 0 ? Math.min(1.4, actual / target) : 1;
  const fill = pctv >= 1 ? 'var(--color-clear)' : pctv >= 0.7 ? 'var(--color-caution)' : 'var(--color-deny)';
  const tickPct = target > 0 ? Math.min(100, (target / (target * 1.4)) * 100) : 100;
  return (
    <svg viewBox="0 0 100 10" className="w-full" role="img" aria-label={`${isMoney ? money(actual) : actual} of ${isMoney ? money(target) : target} target`}>
      <rect x="0" y="3" width="100" height="4" rx="2" fill="var(--color-bridge-700)" />
      <rect x="0" y="3" width={Math.max(1.5, Math.min(100, pctv * (100 / 1.4)))} height="4" rx="2" fill={fill} />
      <line x1={tickPct} y1="0" x2={tickPct} y2="10" stroke="var(--color-brass-bright)" strokeWidth="1.2" />
    </svg>
  );
}

function StatCell({ icon: Icon, label, value, sub, tone = 'neutral', children }) {
  const toneCls = tone === 'clear' ? 'text-clear' : tone === 'caution' ? 'text-caution' : tone === 'deny' ? 'text-deny' : 'text-glass';
  return (
    <div className="panel-sunk relative rounded-md px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${toneCls}`} aria-hidden />
        <span className="label-cap text-[9px] text-bridge-400">{label}</span>
      </div>
      {value !== undefined && <div className={`readout mt-1 text-xl font-bold ${toneCls}`}>{value}</div>}
      {sub && <div className="mt-0.5 text-[10px] text-bridge-500">{sub}</div>}
      {children}
    </div>
  );
}

/* ================================================================
   EMPTY STATES
================================================================ */
function EmptyLog({ onDemo, onNew }) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-10 text-center">
      <BridgeHero />
      <div>
        <h3 className="font-display text-lg font-bold text-bridge-100">The watch hasn't started</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-bridge-400">
          Log your first week's outreach, conversations, proposals, wins and revenue — or load the demo run to see a full quarter charted out.
        </p>
      </div>
      <div className="flex gap-2">
        <button onClick={onNew} className="btn-brass label-cap inline-flex items-center gap-1.5 rounded px-3 py-2 text-xs">
          <Plus className="h-3.5 w-3.5" aria-hidden /> Log this week
        </button>
        <button onClick={onDemo} className="label-cap inline-flex items-center gap-1.5 rounded border border-bridge-600 bg-bridge-800 px-3 py-2 text-xs text-bridge-200 hover:border-glass/70 hover:text-glass">
          Load demo run
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   BET ITEM — next-bets checklist row
================================================================ */
function BetItem({ bet, onToggle, onEdit, onDelete, onMove, isFirst, isLast }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bet.text);
  const commit = () => { setEditing(false); onEdit(draft.trim() || bet.text); };
  return (
    <li className="group flex items-start gap-2 rounded-md border border-bridge-700 bg-bridge-900/60 px-2 py-1.5">
      <button onClick={onToggle} aria-label={bet.done ? 'Mark bet not done' : 'Mark bet done'}
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${bet.done ? 'border-clear bg-clear/20 text-clear' : 'border-bridge-500 text-transparent'}`}>
        <Check className="h-3 w-3" aria-hidden />
      </button>
      {editing ? (
        <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
          onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(bet.text); setEditing(false); } }}
          className="min-w-0 flex-1 rounded border border-bridge-600 bg-bridge-950 px-1.5 py-0.5 text-xs text-bridge-100" />
      ) : (
        <button onClick={() => setEditing(true)} className={`min-w-0 flex-1 text-left text-xs ${bet.done ? 'text-bridge-500 line-through' : 'text-bridge-200'}`}>
          {bet.text || <span className="italic text-bridge-500">untitled bet — click to edit</span>}
        </button>
      )}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
        <button onClick={() => onMove(-1)} disabled={isFirst} aria-label="Move bet up" className="rounded p-1 text-bridge-500 hover:text-glass disabled:opacity-25">
          <ChevronUp className="h-3 w-3" aria-hidden />
        </button>
        <button onClick={() => onMove(1)} disabled={isLast} aria-label="Move bet down" className="rounded p-1 text-bridge-500 hover:text-glass disabled:opacity-25">
          <ChevronDown className="h-3 w-3" aria-hidden />
        </button>
        <button onClick={onDelete} aria-label="Delete bet" className="rounded p-1 text-bridge-500 hover:text-deny">
          <Trash2 className="h-3 w-3" aria-hidden />
        </button>
      </div>
    </li>
  );
}

/* ================================================================
   WEEK ROW — sidebar list item
================================================================ */
function WeekRow({ week, targets, selected, onSelect }) {
  const tone = weekTone(week, targets);
  const att = weekAttainmentPct(week, targets);
  const openBets = week.bets.filter((b) => !b.done).length;
  return (
    <button onClick={onSelect}
      className={`group w-full rounded-md border px-3 py-2.5 text-left transition-colors ${selected ? 'border-glass/70 bg-bridge-800' : 'border-bridge-700 bg-bridge-900 hover:border-bridge-500'}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-sm font-semibold text-bridge-100">{weekLabel(week.weekStart)}</span>
        <span className="flex items-center gap-1"><ToneDot tone={tone} /><span className="label-cap text-[9px] text-bridge-400">{tone}</span></span>
      </div>
      <div className="mt-1.5"><AttainmentBar actual={att} target={100} /></div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-bridge-400">
        <span className="readout">{att}% of target</span>
        <span className="readout font-semibold text-bridge-300">{money(week.actuals.revenue)}</span>
      </div>
      {openBets > 0 && (
        <div className="mt-1 flex items-center gap-1 text-[10px] text-brass">
          <ListChecks className="h-3 w-3" aria-hidden /> {openBets} open bet{openBets === 1 ? '' : 's'}
        </div>
      )}
    </button>
  );
}

/* ================================================================
   WEEKS SIDEBAR
================================================================ */
function WeeksSidebar({ rows, targets, quarters, quarterFilter, setQuarterFilter, onTargetOnly, setOnTargetOnly,
  sortKey, setSortKey, query, setQuery, selectedId, onSelect, onNew, weeksLen, onDemo }) {
  return (
    <section aria-label="Weekly log" className="panel flex min-h-[300px] flex-col self-start rounded-lg lg:sticky lg:top-[150px] lg:max-h-[calc(100vh-166px)]">
      <div className="flex items-center justify-between gap-2 border-b border-bridge-700 px-3.5 py-2.5">
        <h2 className="label-cap text-xs text-bridge-300">Ship's Log</h2>
        <button onClick={onNew} className="btn-brass label-cap inline-flex items-center gap-1 rounded px-2 py-1 text-[11px]">
          <Plus className="h-3.5 w-3.5" aria-hidden /> Log week
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-bridge-800 px-3 py-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-bridge-500" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the log…" aria-label="Search weekly notes"
            className="w-full rounded border border-bridge-700 bg-bridge-950 py-1.5 pl-7 pr-2 text-xs text-bridge-100 placeholder:text-bridge-500" />
        </div>
        <select value={quarterFilter} onChange={(e) => setQuarterFilter(e.target.value)} aria-label="Filter by quarter"
          className="rounded border border-bridge-700 bg-bridge-950 px-1.5 py-1.5 text-xs text-bridge-200">
          <option value="all">All quarters</option>
          {quarters.map((q) => <option key={quarterKey(q)} value={quarterKey(q)}>{quarterLabel(q)}</option>)}
        </select>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} aria-label="Sort weeks"
          className="rounded border border-bridge-700 bg-bridge-950 px-1.5 py-1.5 text-xs text-bridge-200">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="attainment">Highest attainment</option>
        </select>
        <button onClick={() => setOnTargetOnly((v) => !v)} aria-pressed={onTargetOnly}
          className={`label-cap inline-flex items-center gap-1 rounded border px-1.5 py-1.5 text-[10px] ${onTargetOnly ? 'border-clear/70 bg-clear/15 text-clear' : 'border-bridge-700 bg-bridge-950 text-bridge-400 hover:text-bridge-200'}`}>
          <Target className="h-3 w-3" aria-hidden /> On target
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {weeksLen === 0 ? (
          <EmptyLog onDemo={onDemo} onNew={onNew} />
        ) : rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-bridge-400">Nothing matches those filters. Widen the search or clear a filter.</p>
        ) : (
          <ul className="space-y-1.5">
            {rows.map((w) => (
              <li key={w.id}><WeekRow week={w} targets={targets} selected={w.id === selectedId} onSelect={() => onSelect(w.id)} /></li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ================================================================
   METRIC INPUT — number field + gauge pairing
================================================================ */
function MetricInput({ metric, week, targets, onChange }) {
  const value = week.actuals[metric.key];
  const target = targets[metric.key];
  return (
    <div className="panel-sunk flex flex-col items-center gap-1.5 rounded-md p-2.5">
      <GaugeDial metric={metric} value={value} target={target} size={112} />
      <label className="label-cap text-[9px] text-bridge-400" htmlFor={`m-${metric.key}`}>{metric.label}</label>
      <div className="flex items-center gap-1">
        {metric.isMoney && <span className="text-xs text-bridge-500">$</span>}
        <input id={`m-${metric.key}`} type="number" min="0" inputMode="decimal" value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-20 rounded border border-bridge-600 bg-bridge-950 px-1.5 py-1 text-center text-xs text-bridge-100" />
      </div>
    </div>
  );
}

/* ================================================================
   WEEK WORKSPACE — the selected week's full instrument panel
================================================================ */
function WeekWorkspace({ week, targets, trendWeeks, onPatchActual, onPatchField, onAddBet, onToggleBet,
  onEditBet, onDeleteBet, onMoveBet, onDeleteWeek }) {
  const [betDraft, setBetDraft] = useState('');
  const tone = weekTone(week, targets);
  const att = weekAttainmentPct(week, targets);
  const scopeStats = waterfallStats(aggregate([week]));
  const submitBet = () => {
    const t = betDraft.trim();
    if (!t) return;
    onAddBet(t);
    setBetDraft('');
  };
  const doneCount = week.bets.filter((b) => b.done).length;
  const ritualLogged = week.worked.trim() && week.stalled.trim() && week.bets.length > 0;

  return (
    <div className="space-y-4">
      {/* header card */}
      <div className="panel brass-rim relative rounded-lg p-4">
        <span className="rivet" style={{ top: 8, left: 8 }} />
        <span className="rivet" style={{ top: 8, right: 8 }} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="label-cap text-[10px] text-bridge-400">Week of</span>
            <h2 className="font-display text-2xl font-bold text-bridge-100">{weekLabel(week.weekStart)}</h2>
            <div className="mt-1 flex items-center gap-2">
              <ToneDot tone={tone} />
              <span className="label-cap text-xs" style={{ color: tone === 'clear' ? 'var(--color-clear)' : tone === 'caution' ? 'var(--color-caution)' : 'var(--color-deny)' }}>
                {tone === 'clear' ? 'ALL TARGETS HIT' : tone === 'caution' ? 'HOLDING COURSE' : 'OFF TARGET'}
              </span>
              <span className="readout text-xs text-bridge-400">· {att}% avg attainment</span>
              <span className={`label-cap text-[10px] ${ritualLogged ? 'text-clear' : 'text-bridge-500'}`}>· ritual {ritualLogged ? 'logged' : 'open'}</span>
            </div>
          </div>
          <button onClick={onDeleteWeek} aria-label="Delete this week"
            className="label-cap inline-flex items-center gap-1.5 rounded border border-bridge-600 bg-bridge-800 px-2.5 py-1.5 text-[11px] text-bridge-300 hover:border-deny/70 hover:text-deny">
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete week
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {METRICS.map((m) => (
            <MetricInput key={m.key} metric={m} week={week} targets={targets}
              onChange={(v) => onPatchActual(m.key, v)} />
          ))}
        </div>
      </div>

      {/* trend rail */}
      <div className="panel rounded-lg p-3.5">
        <h3 className="label-cap mb-2 text-xs text-bridge-300">Trend Rail <span className="text-bridge-500">— last {trendWeeks.length} logged weeks</span></h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {METRICS.map((m) => (
            <Sparkline key={m.key} metric={m} target={targets[m.key]} values={trendWeeks.map((w) => w.actuals[m.key])} />
          ))}
        </div>
      </div>

      {/* waterfall for this week */}
      <Waterfall stats={scopeStats} scopeLabel={`Week of ${weekLabelShort(week.weekStart)}`} />

      {/* review ritual */}
      <div className="panel brass-rim relative rounded-lg p-4">
        <span className="rivet" style={{ bottom: 8, left: 8 }} />
        <span className="rivet" style={{ bottom: 8, right: 8 }} />
        <h3 className="label-cap mb-3 flex items-center gap-2 text-xs text-bridge-300">
          <Binoculars className="h-3.5 w-3.5 text-brass" aria-hidden /> Weekly Review Ritual
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="worked" className="label-cap text-[10px] text-clear">What worked</label>
            <textarea id="worked" value={week.worked} onChange={(e) => onPatchField('worked', e.target.value)}
              placeholder="The specific thing that moved the needle this week…" rows={3}
              className="mt-1 w-full resize-none rounded border border-bridge-600 bg-bridge-950 px-2.5 py-2 text-sm text-bridge-100 placeholder:text-bridge-500" />
          </div>
          <div>
            <label htmlFor="stalled" className="label-cap text-[10px] text-deny">What stalled</label>
            <textarea id="stalled" value={week.stalled} onChange={(e) => onPatchField('stalled', e.target.value)}
              placeholder="Where the week got stuck, honestly…" rows={3}
              className="mt-1 w-full resize-none rounded border border-bridge-600 bg-bridge-950 px-2.5 py-2 text-sm text-bridge-100 placeholder:text-bridge-500" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <span className="label-cap text-[10px] text-brass">Next bets {week.bets.length > 0 && <span className="text-bridge-500">({doneCount}/{week.bets.length} done)</span>}</span>
          </div>
          {week.bets.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {week.bets.map((b, i) => (
                <BetItem key={b.id} bet={b}
                  onToggle={() => onToggleBet(b.id)}
                  onEdit={(text) => onEditBet(b.id, text)}
                  onDelete={() => onDeleteBet(b.id)}
                  onMove={(dir) => onMoveBet(b.id, dir)}
                  isFirst={i === 0} isLast={i === week.bets.length - 1} />
              ))}
            </ul>
          )}
          <div className="mt-1.5 flex gap-1.5">
            <input value={betDraft} onChange={(e) => setBetDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitBet(); }}
              placeholder="Add a next bet — a specific move for next week…" aria-label="New next bet"
              className="min-w-0 flex-1 rounded border border-bridge-600 bg-bridge-950 px-2.5 py-1.5 text-xs text-bridge-100 placeholder:text-bridge-500" />
            <button onClick={submitBet} className="label-cap inline-flex items-center gap-1 rounded border border-brass/50 bg-brass/10 px-2.5 py-1.5 text-[11px] text-brass hover:bg-brass/20">
              <Plus className="h-3.5 w-3.5" aria-hidden /> Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   QUARTER VIEW
================================================================ */
function QuarterView({ weeks, targets, quarters, selectedKey, setSelectedKey }) {
  if (!quarters.length) {
    return (
      <div className="panel rounded-lg p-10 text-center">
        <CalendarDays className="mx-auto h-8 w-8 text-bridge-500" aria-hidden />
        <p className="mt-3 text-sm text-bridge-400">No weeks logged yet — the quarter report fills in once you've charted at least one week.</p>
      </div>
    );
  }
  const idx = Math.max(0, quarters.findIndex((q) => quarterKey(q) === selectedKey));
  const q = quarters[idx] || quarters[quarters.length - 1];
  const qWeeks = weeksAsc(weeks.filter((w) => quarterKey(quarterOf(w.weekStart)) === quarterKey(q)));
  const sums = aggregate(qWeeks);
  const stats = waterfallStats(sums);
  const qTargets = {};
  for (const m of METRICS) qTargets[m.key] = targets[m.key] * qWeeks.length;
  const prevQ = quarters[idx - 1];
  const prevQWeeks = prevQ ? weeks.filter((w) => quarterKey(quarterOf(w.weekStart)) === quarterKey(prevQ)) : [];
  const prevSums = prevQ ? aggregate(prevQWeeks) : null;
  const streakInQ = qWeeks.length ? computeStreak(qWeeks, targets) : 0;
  const openBets = qWeeks.flatMap((w) => w.bets.filter((b) => !b.done).map((b) => ({ week: w, bet: b })));
  const qSeries = quarters.map((qq) => {
    const ws = weeks.filter((w) => quarterKey(quarterOf(w.weekStart)) === quarterKey(qq));
    return { q: qq, sums: aggregate(ws) };
  });

  return (
    <div className="space-y-4">
      <div className="panel brass-rim flex flex-wrap items-center justify-between gap-3 rounded-lg p-3.5">
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedKey(quarterKey(quarters[Math.max(0, idx - 1)]))} disabled={idx === 0}
            aria-label="Previous quarter" className="rounded border border-bridge-600 bg-bridge-800 p-1.5 text-bridge-300 hover:text-glass disabled:opacity-25">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <div className="text-center">
            <h2 className="font-display text-xl font-bold text-bridge-100">{quarterLabel(q)}</h2>
            <p className="label-cap text-[10px] text-bridge-400">{quarterRangeLabel(q)} · {qWeeks.length} week{qWeeks.length === 1 ? '' : 's'} logged</p>
          </div>
          <button onClick={() => setSelectedKey(quarterKey(quarters[Math.min(quarters.length - 1, idx + 1)]))} disabled={idx === quarters.length - 1}
            aria-label="Next quarter" className="rounded border border-bridge-600 bg-bridge-800 p-1.5 text-bridge-300 hover:text-glass disabled:opacity-25">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-brass/40 bg-brass/10 px-3 py-1.5">
          <Flag className="h-3.5 w-3.5 text-brass" aria-hidden />
          <span className="label-cap text-[10px] text-brass">{streakInQ} wk streak within quarter</span>
        </div>
      </div>

      {qWeeks.length === 0 ? (
        <div className="panel rounded-lg p-8 text-center text-sm text-bridge-400">No weeks logged in {quarterLabel(q)}.</div>
      ) : (
        <>
          <div className="panel rounded-lg p-3.5">
            <h3 className="label-cap mb-2.5 text-xs text-bridge-300">Quarter Totals vs. Pace Target</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {METRICS.map((m) => {
                const actual = sums[m.key], target = qTargets[m.key];
                const prevVal = prevSums ? prevSums[m.key] : null;
                const actualPace = qWeeks.length ? actual / qWeeks.length : null;
                const prevPace = prevVal !== null && prevQWeeks.length ? prevVal / prevQWeeks.length : null;
                const delta = actualPace !== null && prevPace ? ((actualPace - prevPace) / prevPace) * 100 : null;
                return (
                  <div key={m.key} className="panel-sunk rounded-md p-2.5">
                    <span className="label-cap text-[9px] text-bridge-400">{m.label}</span>
                    <div className="readout mt-0.5 text-lg font-bold text-bridge-100">{fmtValCompact(m, actual)}</div>
                    <div className="mt-1"><AttainmentBar actual={actual} target={target} isMoney={m.isMoney} /></div>
                    <div className="mt-1 flex items-center justify-between text-[9px] text-bridge-500">
                      <span>of {fmtValCompact(m, target)} pace</span>
                      {delta !== null && (
                        <span className={`flex items-center gap-0.5 ${delta >= 0 ? 'text-clear' : 'text-deny'}`}>
                          {delta >= 0 ? <ArrowUp className="h-2.5 w-2.5" aria-hidden /> : <ArrowDown className="h-2.5 w-2.5" aria-hidden />}
                          {Math.abs(Math.round(delta))}% weekly pace vs prior Q
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Waterfall stats={stats} scopeLabel={quarterLabel(q)} />

          {qSeries.length > 1 && (
            <div className="panel rounded-lg p-3.5">
              <h3 className="label-cap mb-2 text-xs text-bridge-300">Quarter-over-Quarter Trend</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {METRICS.map((m) => (
                  <Sparkline key={m.key} metric={m} target={0} values={qSeries.map((s) => s.sums[m.key])} />
                ))}
              </div>
            </div>
          )}

          <div className="panel rounded-lg p-3.5">
            <h3 className="label-cap mb-2 text-xs text-bridge-300">Weeks in {quarterLabel(q)}</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-bridge-700 text-left text-bridge-400">
                    <th className="label-cap px-2 py-1.5 font-normal">Week</th>
                    {METRICS.map((m) => <th key={m.key} className="label-cap px-2 py-1.5 text-right font-normal">{m.code}</th>)}
                    <th className="label-cap px-2 py-1.5 text-right font-normal">Attain.</th>
                    <th className="label-cap px-2 py-1.5 text-right font-normal">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {weeksDesc(qWeeks).map((w) => (
                    <tr key={w.id} className="border-b border-bridge-800 text-bridge-200">
                      <td className="px-2 py-1.5">{weekLabelShort(w.weekStart)}</td>
                      {METRICS.map((m) => <td key={m.key} className="readout px-2 py-1.5 text-right">{fmtValCompact(m, w.actuals[m.key])}</td>)}
                      <td className="readout px-2 py-1.5 text-right">{weekAttainmentPct(w, targets)}%</td>
                      <td className="px-2 py-1.5 text-right"><span className="inline-flex items-center gap-1 justify-end"><ToneDot tone={weekTone(w, targets)} />{weekTone(w, targets)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel rounded-lg p-3.5">
            <h3 className="label-cap mb-2 flex items-center gap-2 text-xs text-bridge-300">
              <Compass className="h-3.5 w-3.5 text-brass" aria-hidden /> Captain's Log — {quarterLabel(q)}
            </h3>
            <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
              {weeksDesc(qWeeks).filter((w) => w.worked.trim() || w.stalled.trim()).map((w) => (
                <div key={w.id} className="panel-sunk rounded-md p-2.5 text-xs">
                  <span className="label-cap text-[9px] text-bridge-400">{weekLabelShort(w.weekStart)}</span>
                  {w.worked.trim() && <p className="mt-1 text-clear/90"><span className="text-bridge-500">Worked — </span>{w.worked}</p>}
                  {w.stalled.trim() && <p className="mt-1 text-deny/90"><span className="text-bridge-500">Stalled — </span>{w.stalled}</p>}
                </div>
              ))}
            </div>
            {openBets.length > 0 && (
              <div className="mt-3 border-t border-bridge-700 pt-2.5">
                <span className="label-cap text-[10px] text-brass">Open bets carried in this quarter ({openBets.length})</span>
                <ul className="mt-1.5 space-y-1 text-xs text-bridge-300">
                  {openBets.map(({ week, bet }) => (
                    <li key={bet.id} className="flex items-start gap-1.5">
                      <span className="text-bridge-500">{weekLabelShort(week.weekStart)} —</span> {bet.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ================================================================
   HELP MODAL
================================================================ */
function HelpModal({ onClose }) {
  const steps = [
    { t: 'Load the demo run', d: 'Click "Load demo" in the header to see a full Q2→Q3 2026 run — 15 weeks including a mid-quarter slump, a fix, and a 7-week streak. Reset when ready to log your own.' },
    { t: 'Log your first week', d: 'Click "Log week" in the Ship\'s Log panel. It defaults to the Monday after your last entry (or this week, if you\'re starting fresh).' },
    { t: 'Read the instrument cluster', d: 'Each metric gets its own brass gauge — needle shows actual, the bright tick marks your weekly target. Type directly into the number field beneath any gauge.' },
    { t: 'Watch the trend rail', d: 'Five glass-tube sparklines track each metric across your recent weeks, with a dashed line at target and the latest point lit in its status color.' },
    { t: 'Read the conversion waterfall', d: 'Outreach → Conversations → Proposals → Wins, with the conversion rate labeled between each stage. The weakest stage — your real bottleneck — is called out in red.' },
    { t: 'Run the weekly review ritual', d: 'Three prompts: What worked, What stalled, and your Next bets — a small checklist you can add to, reorder, check off, or delete (with undo).' },
    { t: 'Check the Quarter Report', d: 'Switch views to see quarter totals against a pace-adjusted target, quarter-over-quarter deltas, every week in a printable table, and a Captain\'s Log rollup of your notes.' },
    { t: 'Use Claude Copilot', d: 'Four prompts embed your live numbers — weakest-stage diagnosis, next-week plan, an accountability update, and a synthesis of your review ritual. Copy, paste into claude.ai, and paste the reply back into the notes field.' },
  ];
  return (
    <Modal label="How to use BD Command Deck" onClose={onClose}>
      <div className="max-h-[85vh] overflow-y-auto p-6">
        <div className="mb-4 flex items-center gap-3">
          <BridgeMark className="h-8 w-8" />
          <div>
            <h2 className="font-display text-xl font-bold text-bridge-100">How to run the deck</h2>
            <p className="text-xs text-bridge-400">Eight steps from first watch to a finished quarter.</p>
          </div>
        </div>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brass/60 bg-brass/10 text-[11px] font-bold text-brass">{i + 1}</span>
              <div>
                <p className="text-sm font-semibold text-bridge-100">{s.t}</p>
                <p className="text-xs text-bridge-400">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-5 border-t border-bridge-700 pt-4">
          <h3 className="label-cap mb-2 text-xs text-bridge-300">Keyboard shortcuts</h3>
          <table className="w-full text-xs">
            <tbody>
              {[
                ['?', 'Open this guide'],
                ['N', 'Log a new week'],
                ['Q', 'Toggle Bridge Log / Quarter Report'],
                ['↑ / ↓', 'Move selection up/down the ship\'s log'],
                ['Ctrl / Cmd + S', 'Copy the full ship\'s log as Markdown'],
                ['Esc', 'Close the open dialog, or clear selection'],
              ].map(([k, d]) => (
                <tr key={k} className="border-b border-bridge-800">
                  <td className="py-1.5 pr-3"><kbd className="rounded border border-bridge-600 bg-bridge-800 px-1.5 py-0.5 font-mono text-[11px] text-bridge-200">{k}</kbd></td>
                  <td className="py-1.5 text-bridge-400">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}

/* ================================================================
   COPILOT MODAL
================================================================ */
function CopilotModal({ state, consoleCtx, onClose, showToast, notes, onNotesChange }) {
  const [openKey, setOpenKey] = useState(null);
  const actions = [
    { key: 'weak', icon: AlertTriangle, title: 'Analyze my weakest stage', blurb: 'Diagnose the funnel bottleneck from your last 8 weeks and rank fixes by leverage.', build: () => consoleContextHeader(consoleCtx) + promptWeakestStage(state) },
    { key: 'plan', icon: Compass, title: 'Plan next week from my numbers', blurb: 'Turns recent weeks, streak, and open bets into numeric targets and 3 priority actions.', build: () => consoleContextHeader(consoleCtx) + promptPlanNextWeek(state) },
    { key: 'update', icon: Radio, title: 'Write my accountability update', blurb: 'A short, human status note for a manager, partner, or mastermind group.', build: () => consoleContextHeader(consoleCtx) + promptAccountabilityUpdate(state) },
    { key: 'ritual', icon: BookOpen, title: 'Synthesize my review ritual', blurb: 'Finds recurring blockers and deferred bets across your last 6 weekly reviews.', build: () => consoleContextHeader(consoleCtx) + promptRitualSynthesis(state) },
  ];
  return (
    <Modal label="Claude Copilot" onClose={onClose} wide>
      <div className="max-h-[85vh] overflow-y-auto p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-glass/50 bg-glass/10"><Bot className="h-4.5 w-4.5 text-glass" aria-hidden /></div>
          <div>
            <h2 className="font-display text-xl font-bold text-bridge-100">Claude Copilot</h2>
            <p className="text-xs text-bridge-400">{COPILOT_HINT}</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {actions.map((a) => (
            <div key={a.key} className="panel rounded-lg">
              <button onClick={() => setOpenKey(openKey === a.key ? null : a.key)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <span className="flex items-center gap-2.5">
                  <a.icon className="h-4 w-4 shrink-0 text-brass" aria-hidden />
                  <span>
                    <span className="block text-sm font-semibold text-bridge-100">{a.title}</span>
                    <span className="block text-xs text-bridge-400">{a.blurb}</span>
                  </span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-bridge-400 transition-transform ${openKey === a.key ? 'rotate-180' : ''}`} aria-hidden />
              </button>
              {openKey === a.key && (
                <div className="border-t border-bridge-700 px-4 py-3">
                  <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md border border-bridge-700 bg-bridge-950 p-3 font-mono text-[11px] leading-relaxed text-bridge-300">{a.build()}</pre>
                  <button onClick={() => copyText(a.build(), () => showToast('Prompt copied — paste into claude.ai'))}
                    className="btn-brass label-cap mt-2 inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[11px]">
                    <ClipboardCopy className="h-3.5 w-3.5" aria-hidden /> Copy prompt
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-bridge-700 pt-4">
          <label htmlFor="copilot-notes" className="label-cap text-xs text-bridge-300">Paste Claude's answer back</label>
          <textarea id="copilot-notes" value={notes} onChange={(e) => onNotesChange(e.target.value)} rows={5}
            placeholder="Paste any reply here — it autosaves with the rest of your log."
            className="mt-1.5 w-full resize-y rounded border border-bridge-600 bg-bridge-950 px-3 py-2 text-xs text-bridge-100 placeholder:text-bridge-500" />
        </div>
      </div>
    </Modal>
  );
}

/* ================================================================
   TARGETS MODAL
================================================================ */
function TargetsModal({ targets, onClose, onSave }) {
  const [draft, setDraft] = useState(targets);
  return (
    <Modal label="Calibrate weekly targets" onClose={onClose}>
      <div className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <SlidersHorizontal className="h-6 w-6 text-brass" aria-hidden />
          <div>
            <h2 className="font-display text-xl font-bold text-bridge-100">Calibrate targets</h2>
            <p className="text-xs text-bridge-400">These set every gauge's tick mark, weekly and quarterly pace, and the on-target streak.</p>
          </div>
        </div>
        <div className="space-y-3">
          {METRICS.map((m) => (
            <div key={m.key} className="flex items-center justify-between gap-3">
              <div>
                <label htmlFor={`t-${m.key}`} className="text-sm font-semibold text-bridge-100">{m.label}</label>
                <p className="text-[11px] text-bridge-400">{m.desc}</p>
              </div>
              <div className="flex items-center gap-1">
                {m.isMoney && <span className="text-sm text-bridge-500">$</span>}
                <input id={`t-${m.key}`} type="number" min="0" value={draft[m.key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [m.key]: Math.max(0, Number(e.target.value) || 0) }))}
                  className="w-24 rounded border border-bridge-600 bg-bridge-950 px-2 py-1.5 text-right text-sm text-bridge-100" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="label-cap rounded border border-bridge-600 bg-bridge-800 px-3 py-2 text-xs text-bridge-300">Cancel</button>
          <button onClick={() => { onSave(draft); onClose(); }} className="btn-brass label-cap rounded px-3 py-2 text-xs">Save targets</button>
        </div>
      </div>
    </Modal>
  );
}

/* ================================================================
   RESET MODAL
================================================================ */
function ResetModal({ onClose, onConfirm }) {
  return (
    <Modal label="Confirm reset" onClose={onClose}>
      <div className="p-6">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-deny/50 bg-deny/10"><AlertTriangle className="h-4.5 w-4.5 text-deny" aria-hidden /></div>
          <h2 className="font-display text-lg font-bold text-bridge-100">Clear the whole log?</h2>
        </div>
        <p className="text-sm text-bridge-400">This wipes every logged week, targets, and Copilot notes from this browser. It cannot be undone — export your JSON first if you want a backup.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="label-cap rounded border border-bridge-600 bg-bridge-800 px-3 py-2 text-xs text-bridge-300">Cancel</button>
          <button onClick={onConfirm} className="label-cap inline-flex items-center gap-1.5 rounded bg-deny px-3 py-2 text-xs font-bold text-bridge-950 hover:bg-deny/90">
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Clear everything
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ================================================================
   TOAST
================================================================ */
function Toast({ toast, onUndo, onDismiss }) {
  if (!toast) return null;
  return (
    <div className="no-print anim-toast fixed bottom-4 left-1/2 z-[60] -translate-x-1/2">
      <div className="panel brass-rim flex items-center gap-3 rounded-lg px-4 py-2.5 shadow-2xl">
        <span className="text-sm text-bridge-100">{toast.msg}</span>
        {toast.undo && (
          <button onClick={() => { toast.undo(); onUndo(); }} className="label-cap inline-flex items-center gap-1 rounded border border-brass/50 bg-brass/10 px-2 py-1 text-[11px] text-brass hover:bg-brass/20">
            <Undo2 className="h-3 w-3" aria-hidden /> Undo
          </button>
        )}
        <button onClick={onDismiss} aria-label="Dismiss" className="text-bridge-500 hover:text-bridge-200"><X className="h-3.5 w-3.5" aria-hidden /></button>
      </div>
    </div>
  );
}

/* ================================================================
   APP
================================================================ */
export default function App() {
  const consoleCtx = useConsoleBus();
  const [state, setState] = useState(loadState);
  const [selectedId, setSelectedId] = useState(null);
  const [view, setView] = useState('log'); // 'log' | 'quarter'
  const [selectedQKey, setSelectedQKey] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [query, setQuery] = useState('');
  const [quarterFilter, setQuarterFilter] = useState('all');
  const [onTargetOnly, setOnTargetOnly] = useState(false);
  const [sortKey, setSortKey] = useState('newest');
  const toastTimer = useRef(null);
  const fileRef = useRef(null);
  const exportRef = useRef(null);

  const { weeks, targets } = state;
  const quarters = useMemo(() => quartersPresent(weeks), [weeks]);
  const streak = useMemo(() => computeStreak(weeks, targets), [weeks, targets]);
  const allStats = useMemo(() => waterfallStats(aggregate(weeks)), [weeks]);
  const weak = useMemo(() => weakestStage(allStats), [allStats]);
  const latestWeek = useMemo(() => weeksDesc(weeks)[0] || null, [weeks]);

  const effectiveQKey = selectedQKey || (quarters.length ? quarterKey(quarters[quarters.length - 1]) : null);
  const currentRealQ = quarterOf(todayMondayISO());
  const qWeeksForRevenue = quarters.length
    ? weeks.filter((w) => quarterKey(quarterOf(w.weekStart)) === effectiveQKey)
    : [];
  const qRevenueTarget = targets.revenue * qWeeksForRevenue.length;
  const qRevenueActual = qWeeksForRevenue.reduce((s, w) => s + (Number(w.actuals.revenue) || 0), 0);

  /* first visit: open the guide */
  useEffect(() => {
    if (!state.seenGuide) {
      setHelpOpen(true);
      setState((s) => ({ ...s, seenGuide: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* autosave, debounced */
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
    }, 350);
    return () => clearTimeout(t);
  }, [state]);

  const showToast = useCallback((msg, undo = null) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), undo ? 7000 : 2600);
  }, []);

  const patchWeek = useCallback((id, patch) => {
    setState((s) => ({ ...s, weeks: s.weeks.map((w) => (w.id === id ? { ...w, ...patch, updatedAt: Date.now() } : w)) }));
  }, []);

  const patchActual = useCallback((id, key, value) => {
    setState((s) => ({
      ...s,
      weeks: s.weeks.map((w) => (w.id === id ? { ...w, actuals: { ...w.actuals, [key]: value }, updatedAt: Date.now() } : w)),
    }));
  }, []);

  const newWeek = useCallback(() => {
    setState((s) => {
      const desc = weeksDesc(s.weeks);
      const nextStart = desc.length ? addDays(desc[0].weekStart, 7) : todayMondayISO();
      const w = blankWeek(nextStart);
      setSelectedId(w.id);
      return { ...s, weeks: [...s.weeks, w].sort((a, b) => a.weekStart.localeCompare(b.weekStart)) };
    });
  }, []);

  const deleteWeek = useCallback((id) => {
    setState((s) => {
      const idx = s.weeks.findIndex((w) => w.id === id);
      if (idx === -1) return s;
      const removed = s.weeks[idx];
      const next = { ...s, weeks: s.weeks.filter((w) => w.id !== id) };
      showToast(`Week logged out: ${weekLabelShort(removed.weekStart)}`, () => {
        setState((s2) => ({ ...s2, weeks: [...s2.weeks, removed].sort((a, b) => a.weekStart.localeCompare(b.weekStart)) }));
      });
      return next;
    });
    setSelectedId((cur) => (cur === id ? null : cur));
  }, [showToast]);

  const addBet = useCallback((weekId, text) => {
    setState((s) => ({
      ...s,
      weeks: s.weeks.map((w) => (w.id === weekId ? { ...w, bets: [...w.bets, { id: uid(), text, done: false }], updatedAt: Date.now() } : w)),
    }));
  }, []);

  const toggleBet = useCallback((weekId, betId) => {
    setState((s) => ({
      ...s,
      weeks: s.weeks.map((w) => (w.id === weekId
        ? { ...w, bets: w.bets.map((b) => (b.id === betId ? { ...b, done: !b.done } : b)), updatedAt: Date.now() }
        : w)),
    }));
  }, []);

  const editBet = useCallback((weekId, betId, text) => {
    setState((s) => ({
      ...s,
      weeks: s.weeks.map((w) => (w.id === weekId
        ? { ...w, bets: w.bets.map((b) => (b.id === betId ? { ...b, text } : b)), updatedAt: Date.now() }
        : w)),
    }));
  }, []);

  const deleteBet = useCallback((weekId, betId) => {
    setState((s) => {
      const week = s.weeks.find((w) => w.id === weekId);
      if (!week) return s;
      const idx = week.bets.findIndex((b) => b.id === betId);
      if (idx === -1) return s;
      const removed = week.bets[idx];
      const next = {
        ...s,
        weeks: s.weeks.map((w) => (w.id === weekId ? { ...w, bets: w.bets.filter((b) => b.id !== betId), updatedAt: Date.now() } : w)),
      };
      showToast('Bet removed', () => {
        setState((s2) => ({
          ...s2,
          weeks: s2.weeks.map((w) => {
            if (w.id !== weekId) return w;
            const bets = [...w.bets];
            bets.splice(Math.min(idx, bets.length), 0, removed);
            return { ...w, bets };
          }),
        }));
      });
      return next;
    });
  }, [showToast]);

  const moveBet = useCallback((weekId, betId, dir) => {
    setState((s) => ({
      ...s,
      weeks: s.weeks.map((w) => {
        if (w.id !== weekId) return w;
        const idx = w.bets.findIndex((b) => b.id === betId);
        const j = idx + dir;
        if (idx === -1 || j < 0 || j >= w.bets.length) return w;
        const bets = [...w.bets];
        [bets[idx], bets[j]] = [bets[j], bets[idx]];
        return { ...w, bets, updatedAt: Date.now() };
      }),
    }));
  }, []);

  const saveTargets = useCallback((next) => {
    setState((s) => ({ ...s, targets: next }));
    showToast('Targets calibrated');
  }, [showToast]);

  const copyLog = useCallback(() => {
    copyText(logMarkdown(state), () => showToast('Ship\'s log copied as Markdown'));
  }, [state, showToast]);

  const downloadJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bd-command-deck-export.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showToast('Full state downloaded as JSON');
  }, [state, showToast]);

  const downloadCsv = useCallback(() => {
    const blob = new Blob([csvOf(state)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bd-command-deck-weeks.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showToast('Weekly CSV downloaded');
  }, [state, showToast]);

  const importJson = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = normalize(JSON.parse(String(reader.result)));
        next.seenGuide = true;
        setState(next);
        setSelectedId(null);
        showToast(`Imported ${next.weeks.length} week${next.weeks.length === 1 ? '' : 's'}`);
      } catch {
        showToast('Import failed — that file is not a valid export');
      }
    };
    reader.readAsText(file);
  }, [showToast]);

  /* filtered + sorted rows for the sidebar */
  const rows = useMemo(() => {
    let list = [...weeks];
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((w) => (w.worked + ' ' + w.stalled + ' ' + w.bets.map((b) => b.text).join(' ')).toLowerCase().includes(q));
    if (quarterFilter !== 'all') list = list.filter((w) => quarterKey(quarterOf(w.weekStart)) === quarterFilter);
    if (onTargetOnly) list = list.filter((w) => weekTone(w, targets) === 'clear');
    const cmp = {
      newest: (a, b) => b.weekStart.localeCompare(a.weekStart),
      oldest: (a, b) => a.weekStart.localeCompare(b.weekStart),
      attainment: (a, b) => weekAttainmentPct(b, targets) - weekAttainmentPct(a, targets),
    }[sortKey];
    return list.sort(cmp);
  }, [weeks, query, quarterFilter, onTargetOnly, sortKey, targets]);

  const selectedWeek = weeks.find((w) => w.id === selectedId) || null;
  const trendWeeks = useMemo(() => {
    if (!selectedWeek) return [];
    const asc = weeksAsc(weeks);
    const idx = asc.findIndex((w) => w.id === selectedWeek.id);
    return asc.slice(Math.max(0, idx - 7), idx + 1);
  }, [weeks, selectedWeek]);

  /* keyboard */
  useEffect(() => {
    const onKey = (e) => {
      const inField = e.target.closest?.('input, textarea, select, [contenteditable="true"]');
      if (e.key === 'Escape') {
        if (targetsOpen) setTargetsOpen(false);
        else if (exportOpen) setExportOpen(false);
        else if (copilotOpen) setCopilotOpen(false);
        else if (resetOpen) setResetOpen(false);
        else if (helpOpen) setHelpOpen(false);
        else if (selectedId && !inField) setSelectedId(null);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        copyLog();
        return;
      }
      if (inField) return;
      if (e.key === '?') { e.preventDefault(); setHelpOpen(true); }
      else if (e.key.toLowerCase() === 'n') { e.preventDefault(); newWeek(); }
      else if (e.key.toLowerCase() === 'q') { e.preventDefault(); setView((v) => (v === 'log' ? 'quarter' : 'log')); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!rows.length) return;
        e.preventDefault();
        const idx = rows.findIndex((w) => w.id === selectedId);
        const next = e.key === 'ArrowDown' ? Math.min(rows.length - 1, idx + 1) : Math.max(0, idx - 1);
        setSelectedId(rows[Math.max(0, next)].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpOpen, copilotOpen, targetsOpen, resetOpen, exportOpen, selectedId, rows, copyLog, newWeek]);

  /* close export dropdown on outside click */
  useEffect(() => {
    if (!exportOpen) return;
    const onDown = (e) => { if (!exportRef.current?.contains(e.target)) setExportOpen(false); };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [exportOpen]);

  const loadDemo = () => {
    const demo = demoState();
    setState(demo);
    setSelectedId(weeksDesc(demo.weeks)[0]?.id || null);
    setSelectedQKey(null);
    showToast('Demo run loaded — 15 weeks, Q2 → Q3 2026');
  };

  const doReset = () => {
    setState(normalize(null));
    setSelectedId(null);
    setResetOpen(false);
    showToast('Log cleared');
  };

  return (
    <div className="min-h-screen font-display text-bridge-100">
      {/* ============ HEADER ============ */}
      <header className="no-print sticky top-0 z-40 border-b border-bridge-700 bg-bridge-950/95 backdrop-blur">
        <div className="signal-bar h-1.5" aria-hidden />
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            <BridgeMark className="h-9 w-9" />
            <div>
              <h1 className="text-lg font-extrabold uppercase leading-none tracking-[0.08em]">
                BD <span className="text-brass">Command Deck</span>
              </h1>
              <p className="label-cap mt-0.5 text-[10px] text-bridge-400">Run business development like a bridge watch</p>
            </div>
            <ConsoleLinkedPill ctx={consoleCtx} />
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <button onClick={loadDemo}
              className="label-cap rounded border border-bridge-600 bg-bridge-800 px-2.5 py-1.5 text-[11px] text-bridge-200 hover:border-brass/70 hover:text-brass">
              Load demo
            </button>
            <button onClick={() => setTargetsOpen(true)}
              className="label-cap inline-flex items-center gap-1.5 rounded border border-bridge-600 bg-bridge-800 px-2.5 py-1.5 text-[11px] text-bridge-200 hover:border-brass/70 hover:text-brass">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden /> Calibrate
            </button>
            <button onClick={() => setResetOpen(true)}
              className="label-cap inline-flex items-center gap-1.5 rounded border border-bridge-600 bg-bridge-800 px-2.5 py-1.5 text-[11px] text-bridge-200 hover:border-deny/70 hover:text-deny">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
            </button>
            <button onClick={() => setHelpOpen(true)}
              className="label-cap inline-flex items-center gap-1.5 rounded border border-bridge-600 bg-bridge-800 px-2.5 py-1.5 text-[11px] text-bridge-200 hover:border-brass/70 hover:text-brass">
              <CircleHelp className="h-3.5 w-3.5" aria-hidden /> How to use
            </button>
            <button onClick={() => setCopilotOpen(true)}
              className="label-cap inline-flex items-center gap-1.5 rounded border border-glass/50 bg-glass/10 px-2.5 py-1.5 text-[11px] text-glass hover:bg-glass/20">
              <Bot className="h-3.5 w-3.5" aria-hidden /> Claude Copilot
            </button>
            <div className="relative" ref={exportRef}>
              <button onClick={() => setExportOpen((v) => !v)} aria-haspopup="menu" aria-expanded={exportOpen}
                className="label-cap inline-flex items-center gap-1.5 rounded border border-bridge-600 bg-bridge-800 px-2.5 py-1.5 text-[11px] text-bridge-200 hover:border-brass/70 hover:text-brass">
                <FileDown className="h-3.5 w-3.5" aria-hidden /> Export <ChevronDown className="h-3 w-3" aria-hidden />
              </button>
              {exportOpen && (
                <div role="menu" className="panel brass-rim absolute right-0 z-50 mt-1.5 w-60 rounded-md p-1.5">
                  {[
                    { icon: ClipboardCopy, label: 'Copy ship\'s log (Markdown)', fn: () => { copyLog(); setExportOpen(false); } },
                    { icon: FileDown, label: 'Download JSON (full state)', fn: () => { downloadJson(); setExportOpen(false); } },
                    { icon: FileText, label: 'Download weeks CSV', fn: () => { downloadCsv(); setExportOpen(false); } },
                    { icon: FileUp, label: 'Import JSON…', fn: () => { fileRef.current?.click(); setExportOpen(false); } },
                    { icon: Printer, label: 'Print quarter report', fn: () => { setExportOpen(false); window.print(); } },
                  ].map(({ icon: I, label, fn }) => (
                    <button key={label} role="menuitem" onClick={fn}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-xs text-bridge-200 hover:bg-bridge-700">
                      <I className="h-3.5 w-3.5 text-bridge-400" aria-hidden /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Import JSON file"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
          </div>
        </div>
      </header>

      {/* ============ INSTRUMENT STRIP ============ */}
      <div className="no-print border-b border-bridge-800 bg-bridge-900/70">
        <div className="mx-auto grid max-w-[1500px] grid-cols-2 gap-2.5 px-4 py-3 sm:px-6 md:grid-cols-4">
          <StatCell icon={Flag} label="On-target streak" value={`${streak} wk${streak === 1 ? '' : 's'}`}
            tone={streak >= 3 ? 'clear' : streak > 0 ? 'caution' : 'neutral'}>
            <div className="mt-2"><PennantRow weeks={weeks} targets={targets} count={8} /></div>
          </StatCell>
          <StatCell icon={Gauge} label="Latest week" value={latestWeek ? `${weekAttainmentPct(latestWeek, targets)}%` : '—'}
            sub={latestWeek ? weekLabelShort(latestWeek.weekStart) : 'No weeks logged'}
            tone={latestWeek ? weekTone(latestWeek, targets) : 'neutral'} />
          <StatCell icon={CalendarDays} label={`${quarters.length ? quarterLabel(quarters[quarters.findIndex((q) => quarterKey(q) === effectiveQKey)] || currentRealQ) : quarterLabel(currentRealQ)} revenue`}
            value={money(qRevenueActual)} sub={`of ${money(qRevenueTarget)} pace target`}
            tone={qRevenueTarget > 0 && qRevenueActual >= qRevenueTarget ? 'clear' : 'caution'} />
          <StatCell icon={AlertTriangle} label="Weakest stage" value={weak ? pct(weak.rate) : '—'}
            sub={weak ? `${weak.fromLabel} → ${weak.toLabel} (${weak.verb})` : 'Log outreach & wins to see it'}
            tone={weak ? 'deny' : 'neutral'} />
        </div>
      </div>

      {/* ============ VIEW TOGGLE ============ */}
      <div className="no-print mx-auto max-w-[1500px] px-4 pt-3 sm:px-6">
        <div className="inline-flex rounded-md border border-bridge-700 bg-bridge-900 p-1">
          <button onClick={() => setView('log')} aria-pressed={view === 'log'}
            className={`label-cap inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[11px] ${view === 'log' ? 'bg-bridge-700 text-brass' : 'text-bridge-400 hover:text-bridge-200'}`}>
            <ShipWheel className="h-3.5 w-3.5" aria-hidden /> Bridge Log
          </button>
          <button onClick={() => setView('quarter')} aria-pressed={view === 'quarter'}
            className={`label-cap inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[11px] ${view === 'quarter' ? 'bg-bridge-700 text-brass' : 'text-bridge-400 hover:text-bridge-200'}`}>
            <CalendarDays className="h-3.5 w-3.5" aria-hidden /> Quarter Report
          </button>
        </div>
      </div>

      {/* ============ MAIN ============ */}
      <main className="no-print mx-auto max-w-[1500px] px-4 py-4 sm:px-6">
        {view === 'log' ? (
          <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
            <WeeksSidebar
              rows={rows} targets={targets} quarters={quarters}
              quarterFilter={quarterFilter} setQuarterFilter={setQuarterFilter}
              onTargetOnly={onTargetOnly} setOnTargetOnly={setOnTargetOnly}
              sortKey={sortKey} setSortKey={setSortKey}
              query={query} setQuery={setQuery}
              selectedId={selectedId} onSelect={setSelectedId}
              onNew={newWeek} weeksLen={weeks.length} onDemo={loadDemo}
            />
            <div>
              {selectedWeek ? (
                <WeekWorkspace
                  week={selectedWeek} targets={targets} trendWeeks={trendWeeks}
                  onPatchActual={(key, v) => patchActual(selectedWeek.id, key, v)}
                  onPatchField={(field, v) => patchWeek(selectedWeek.id, { [field]: v })}
                  onAddBet={(text) => addBet(selectedWeek.id, text)}
                  onToggleBet={(betId) => toggleBet(selectedWeek.id, betId)}
                  onEditBet={(betId, text) => editBet(selectedWeek.id, betId, text)}
                  onDeleteBet={(betId) => deleteBet(selectedWeek.id, betId)}
                  onMoveBet={(betId, dir) => moveBet(selectedWeek.id, betId, dir)}
                  onDeleteWeek={() => deleteWeek(selectedWeek.id)}
                />
              ) : (
                <div className="panel flex min-h-[420px] flex-col items-center justify-center rounded-lg p-8">
                  <div className="text-center">
                    <ShipWheel className="mx-auto h-8 w-8 text-bridge-500" aria-hidden />
                    {weeks.length === 0 ? (
                      <p className="mt-3 text-sm text-bridge-400">Log your first week in the Ship's Log to the left — its instrument cluster, trend rail, and review ritual will open here.</p>
                    ) : (
                      <p className="mt-3 text-sm text-bridge-400">Select a week from the Ship's Log to open its instruments, or press <kbd className="rounded border border-bridge-600 bg-bridge-800 px-1.5 py-0.5 font-mono text-[11px]">N</kbd> to log a new one.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <QuarterView weeks={weeks} targets={targets} quarters={quarters} selectedKey={effectiveQKey} setSelectedKey={setSelectedQKey} />
        )}
      </main>

      {/* ============ PRINT-ONLY LOG ============ */}
      <div className="print-only p-8">
        <h1>BD Command Deck — Ship's Log</h1>
        <p>Generated {new Date().toISOString().slice(0, 10)} · {weeks.length} weeks logged · current streak {streak}</p>
        <table>
          <thead>
            <tr><th>Week</th>{METRICS.map((m) => <th key={m.key}>{m.label}</th>)}<th>Attainment</th><th>Status</th></tr>
          </thead>
          <tbody>
            {weeksDesc(weeks).map((w) => (
              <tr key={w.id} className="pb">
                <td>{weekLabel(w.weekStart)}</td>
                {METRICS.map((m) => <td key={m.key}>{fmtVal(m, w.actuals[m.key])}</td>)}
                <td>{weekAttainmentPct(w, targets)}%</td>
                <td>{weekTone(w, targets).toUpperCase()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {weeksDesc(weeks).map((w) => (
          <div key={w.id} className="pb" style={{ marginTop: '14px' }}>
            <h3>{weekLabel(w.weekStart)}</h3>
            <p><strong>Worked:</strong> {w.worked || '—'}</p>
            <p><strong>Stalled:</strong> {w.stalled || '—'}</p>
            {w.bets.length > 0 && (
              <ul>{w.bets.map((b) => <li key={b.id}>{b.done ? '[x] ' : '[ ] '}{b.text}</li>)}</ul>
            )}
          </div>
        ))}
      </div>

      {/* ============ MODALS ============ */}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      {copilotOpen && (
        <CopilotModal state={state} consoleCtx={consoleCtx} onClose={() => setCopilotOpen(false)} showToast={showToast}
          notes={state.copilotNotes} onNotesChange={(v) => setState((s) => ({ ...s, copilotNotes: v }))} />
      )}
      {targetsOpen && <TargetsModal targets={targets} onClose={() => setTargetsOpen(false)} onSave={saveTargets} />}
      {resetOpen && <ResetModal onClose={() => setResetOpen(false)} onConfirm={doReset} />}

      <Toast toast={toast} onUndo={() => setToast(null)} onDismiss={() => setToast(null)} />
    </div>
  );
}
