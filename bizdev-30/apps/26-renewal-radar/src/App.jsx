import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle, Ban, BookOpen, CalendarClock, CheckCircle2, ChevronDown, ChevronLeft, ChevronUp,
  Circle, ClipboardList, Copy, Download, FileDown, FileText, Gauge, HelpCircle, Keyboard, LifeBuoy,
  Mail, Plus, Radar, Radio, RotateCcw, Search, ShieldAlert, ShieldCheck, SlidersHorizontal, Sparkles,
  Star, Trash2, TrendingUp, TriangleAlert, Undo2, Upload, Users, X,
} from 'lucide-react';

/* ================================ constants ================================ */

const LS_KEY = 'bizdev:26-renewal-radar:v1';
const MANUAL_STATUSES = ['auto', 'healthy', 'watch', 'atrisk', 'saved', 'churned'];
const SILENCE_WARN = 25;
const SILENCE_THRESHOLD = 45;

const PLAY_TEMPLATES = {
  t90: [
    'Schedule the T-90 check-in / QBR',
    'Pull usage and adoption data for the term',
    'Confirm the renewal owner and budget cycle',
    'Log any expansion signals from this stage',
  ],
  t60: [
    'Send the value-recap email — wins, metrics, roadmap',
    'Confirm the champion is still in-seat and bought in',
    'Surface any pricing or term changes early',
    'Identify anyone new who needs to sign off',
  ],
  t30: [
    'Send the renewal proposal or order form',
    'Get a verbal commitment or a named blocker in writing',
    'Loop in your manager if there is no response by T-15',
    'Confirm the signed renewal and log the new date',
  ],
};
const SAVE_PLAY_TEMPLATE = [
  'Diagnose the real root cause with the champion — not the story',
  'Get an executive-to-executive call on the calendar',
  'Name the one thing that would change their mind',
  'Offer a concrete recovery plan with a date attached',
  'Get a written recommitment — verbal is not a save',
];

let _uid = 0;
const uid = () => `${Date.now().toString(36)}-${(_uid++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function toUTC(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  return Date.UTC(y || 1970, (m || 1) - 1, d || 1);
}
const today = () => new Date().toISOString().slice(0, 10);
const isDateStr = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
function addDaysStr(dateStr, delta) {
  const d = new Date(toUTC(dateStr));
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
function daysBetween(dateStr) {
  if (!isDateStr(dateStr)) return null;
  return Math.round((toUTC(dateStr) - toUTC(today())) / 86400000);
}
function daysSince(dateStr) {
  if (!isDateStr(dateStr)) return null;
  return Math.round((toUTC(today()) - toUTC(dateStr)) / 86400000);
}

const str = (v, fb = '') => (typeof v === 'string' ? v : fb);
const arrOf = (v) => (Array.isArray(v) ? v : []);
const num = (v, fb = 0) => {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return fb;
};
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/* ================================ normalize ================================ */

function normChecklistItem(it) {
  if (typeof it === 'string') return { id: uid(), text: it, done: false };
  return { id: str(it?.id) || uid(), text: str(it?.text), done: !!it?.done };
}
function normTouchpoint(t) {
  return { id: str(t?.id) || uid(), date: isDateStr(t?.date) ? t.date : today(), note: str(t?.note) };
}
function normHealth(h) {
  const c = (v) => clamp(Math.round(num(v, 50)), 0, 100);
  return { usage: c(h?.usage), results: c(h?.results), relationship: c(h?.relationship) };
}
function normExpansion(e) {
  return { flagged: !!e?.flagged, note: str(e?.note), value: Math.max(0, Math.round(num(e?.value, 0))) };
}
function normClient(c) {
  return {
    id: str(c?.id) || uid(),
    name: str(c?.name, 'Unnamed client'),
    segment: str(c?.segment),
    owner: str(c?.owner),
    arr: Math.max(0, Math.round(num(c?.arr, 0))),
    renewalDate: isDateStr(c?.renewalDate) ? c.renewalDate : addDaysStr(today(), 90),
    health: normHealth(c?.health),
    manualStatus: MANUAL_STATUSES.includes(c?.manualStatus) ? c.manualStatus : 'auto',
    plays: {
      t90: arrOf(c?.plays?.t90).map(normChecklistItem),
      t60: arrOf(c?.plays?.t60).map(normChecklistItem),
      t30: arrOf(c?.plays?.t30).map(normChecklistItem),
    },
    savePlay: arrOf(c?.savePlay).map(normChecklistItem),
    savePlan: str(c?.savePlan),
    expansion: normExpansion(c?.expansion),
    notes: str(c?.notes),
    touchpoints: arrOf(c?.touchpoints).map(normTouchpoint),
    createdAt: isDateStr(c?.createdAt) ? c.createdAt : today(),
  };
}
function normalize(raw) {
  let d = raw;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { d = null; } }
  if (!d || typeof d !== 'object') d = {};
  const clients = arrOf(d.clients).map(normClient);
  return {
    clients,
    selectedId: clients.some((c) => c.id === d.selectedId) ? d.selectedId : null,
    copilotNotes: str(d.copilotNotes),
    seenGuide: !!d.seenGuide,
  };
}
function loadState() {
  try { return normalize(localStorage.getItem(LS_KEY)); } catch { return normalize(null); }
}

/* ================================ demo data ================================ */

function play(list, doneCount = 0) {
  return list.map((t, i) => ({ id: uid(), text: t, done: i < doneCount }));
}
function touch(daysAgo, note) {
  return { id: uid(), date: addDaysStr(today(), -daysAgo), note };
}

function demoState() {
  return normalize({
    seenGuide: true,
    copilotNotes: '',
    selectedId: null,
    clients: [
      {
        id: 'meridian', name: 'Meridian Health Systems', segment: 'Enterprise', owner: 'Priya N.', arr: 186000,
        renewalDate: addDaysStr(today(), 142),
        health: { usage: 88, results: 90, relationship: 82 }, manualStatus: 'auto',
        plays: { t90: play(PLAY_TEMPLATES.t90, 4), t60: play(PLAY_TEMPLATES.t60, 0), t30: play(PLAY_TEMPLATES.t30, 0) },
        savePlay: play(SAVE_PLAY_TEMPLATE, 0), savePlan: '',
        expansion: { flagged: true, value: 42000, note: 'Ask about rolling the analytics module out to their west-coast clinics — they hinted at Q3 budget for it on the last call.' },
        notes: 'Strong exec sponsor (CMIO). Renewed early last cycle with no negotiation.',
        touchpoints: [touch(70, 'Quarterly business review — usage up 18%'), touch(40, 'Casual check-in call'), touch(10, 'Sent Q3 roadmap preview')],
        createdAt: addDaysStr(today(), -400),
      },
      {
        id: 'northbeam', name: 'Northbeam Logistics', segment: 'Mid-Market', owner: 'Marcus T.', arr: 64000,
        renewalDate: addDaysStr(today(), 76),
        health: { usage: 42, results: 60, relationship: 68 }, manualStatus: 'auto',
        plays: { t90: play(PLAY_TEMPLATES.t90, 2), t60: play(PLAY_TEMPLATES.t60, 0), t30: play(PLAY_TEMPLATES.t30, 0) },
        savePlay: play(SAVE_PLAY_TEMPLATE, 0), savePlan: '',
        expansion: { flagged: false, value: 0, note: '' },
        notes: 'Usage dropped after their ops lead left in May. New lead not yet onboarded to the product.',
        touchpoints: [touch(18, 'Left voicemail, no callback yet')],
        createdAt: addDaysStr(today(), -260),
      },
      {
        id: 'carraway', name: 'Carraway & Finch', segment: 'SMB · Legal', owner: 'Dana R.', arr: 21000,
        renewalDate: addDaysStr(today(), 52),
        health: { usage: 75, results: 70, relationship: 58 }, manualStatus: 'auto',
        plays: { t90: play(PLAY_TEMPLATES.t90, 4), t60: play(PLAY_TEMPLATES.t60, 1), t30: play(PLAY_TEMPLATES.t30, 0) },
        savePlay: play(SAVE_PLAY_TEMPLATE, 0), savePlan: '',
        expansion: { flagged: false, value: 0, note: '' },
        notes: 'Managing partner is happy; day-to-day admin is lukewarm. Worth a relationship-building touch.',
        touchpoints: [touch(9, 'Value-recap email sent'), touch(55, 'Renewal kickoff call')],
        createdAt: addDaysStr(today(), -300),
      },
      {
        id: 'union', name: 'Union Robotics', segment: 'Mid-Market', owner: 'Priya N.', arr: 58000,
        renewalDate: addDaysStr(today(), 19),
        health: { usage: 91, results: 88, relationship: 85 }, manualStatus: 'auto',
        plays: { t90: play(PLAY_TEMPLATES.t90, 4), t60: play(PLAY_TEMPLATES.t60, 4), t30: play(PLAY_TEMPLATES.t30, 2) },
        savePlay: play(SAVE_PLAY_TEMPLATE, 0), savePlan: '',
        expansion: { flagged: true, value: 15000, note: 'Team wants 6 more seats once their Series B closes — check timing before proposing.' },
        notes: 'Model account. Champion is an internal advocate on our reference calls.',
        touchpoints: [touch(3, 'Sent renewal proposal draft'), touch(16, 'QBR — walked through Q2 results')],
        createdAt: addDaysStr(today(), -345),
      },
      {
        id: 'solstice', name: 'Solstice Retail Group', segment: 'Enterprise', owner: 'Marcus T.', arr: 210000,
        renewalDate: addDaysStr(today(), -6),
        health: { usage: 22, results: 30, relationship: 25 }, manualStatus: 'auto',
        plays: { t90: play(PLAY_TEMPLATES.t90, 3), t60: play(PLAY_TEMPLATES.t60, 2), t30: play(PLAY_TEMPLATES.t30, 1) },
        savePlay: play(SAVE_PLAY_TEMPLATE, 2),
        savePlan: 'Champion (VP Ops) went quiet after the Q2 outage. Need an exec-to-exec call before their board meeting. Offer a service credit plus dedicated onboarding for the new warehouse rollout as the recovery ask.',
        expansion: { flagged: false, value: 0, note: '' },
        notes: 'June 14 outage cost them a peak sales day. Escalated internally; RCA sent but never acknowledged.',
        touchpoints: [touch(58, 'RCA sent after outage — no reply since')],
        createdAt: addDaysStr(today(), -500),
      },
      {
        id: 'bramwell', name: 'Bramwell Studios', segment: 'Startup', owner: 'Dana R.', arr: 19000,
        renewalDate: addDaysStr(today(), 21),
        health: { usage: 55, results: 60, relationship: 15 }, manualStatus: 'atrisk',
        plays: { t90: play(PLAY_TEMPLATES.t90, 4), t60: play(PLAY_TEMPLATES.t60, 2), t30: play(PLAY_TEMPLATES.t30, 0) },
        savePlay: play(SAVE_PLAY_TEMPLATE, 1),
        savePlan: "Original champion left the company three weeks ago. New economic buyer just started — book an intro call before the renewal date and reframe the value story in their language. Do not assume the old context carried over.",
        expansion: { flagged: false, value: 0, note: '' },
        notes: 'Small team, price-sensitive. Product usage is fine — this is a pure relationship risk.',
        touchpoints: [touch(30, "Old champion's farewell email — no successor named yet")],
        createdAt: addDaysStr(today(), -200),
      },
      {
        id: 'ferro', name: 'Ferro & Vance Consulting', segment: 'Mid-Market', owner: 'Marcus T.', arr: 47000,
        renewalDate: addDaysStr(today(), 205),
        health: { usage: 80, results: 78, relationship: 74 }, manualStatus: 'saved',
        plays: { t90: play(PLAY_TEMPLATES.t90, 4), t60: play(PLAY_TEMPLATES.t60, 4), t30: play(PLAY_TEMPLATES.t30, 4) },
        savePlay: play(SAVE_PLAY_TEMPLATE, 5),
        savePlan: 'The save that worked: repriced onto an annual term with a modest discount in exchange for a case-study commitment. Signed within 9 days of the exec call.',
        expansion: { flagged: false, value: 0, note: '' },
        notes: 'Saved in Q2 after a pricing renegotiation. Watch usage next quarter to confirm it stuck before letting the status drift back to auto.',
        touchpoints: [touch(45, 'Post-save check-in — usage holding steady')],
        createdAt: addDaysStr(today(), -600),
      },
      {
        id: 'dunmore', name: 'Dunmore Analytics', segment: 'SMB', owner: 'Dana R.', arr: 33000,
        renewalDate: addDaysStr(today(), -34),
        health: { usage: 18, results: 20, relationship: 10 }, manualStatus: 'churned',
        plays: { t90: play(PLAY_TEMPLATES.t90, 3), t60: play(PLAY_TEMPLATES.t60, 2), t30: play(PLAY_TEMPLATES.t30, 1) },
        savePlay: play(SAVE_PLAY_TEMPLATE, 3),
        savePlan: 'Save attempt failed — they had already allocated budget to an in-house build before we got an exec call booked.',
        expansion: { flagged: false, value: 0, note: '' },
        notes: 'Postmortem: lost to an in-house build. Root cause — never got past the analyst level; no access to the economic buyer. Lesson: qualify budget-owner access by T-90 or downgrade forecast confidence.',
        touchpoints: [touch(80, 'Last real conversation before renewal went quiet')],
        createdAt: addDaysStr(today(), -620),
      },
    ],
  });
}

/* ============================ derived + serializers ============================ */

function healthScore(c) {
  const h = c.health;
  return Math.round((h.usage + h.results + h.relationship) / 3);
}
function lastTouch(c) {
  if (!c.touchpoints.length) return null;
  return c.touchpoints.reduce((max, t) => (!max || t.date > max ? t.date : max), null);
}
function silenceDays(c) {
  const t = lastTouch(c);
  return t ? daysSince(t) : null;
}
function isSilent(c) {
  const d = silenceDays(c);
  return d == null || d >= SILENCE_THRESHOLD;
}
function computedStatus(c) {
  if (c.manualStatus !== 'auto') return c.manualStatus;
  const score = healthScore(c);
  const d = silenceDays(c);
  const silentBad = d == null || d >= SILENCE_THRESHOLD;
  const silentWarn = d != null && d >= SILENCE_WARN && d < SILENCE_THRESHOLD;
  if (score < 40 || silentBad) return 'atrisk';
  if (score < 70 || silentWarn) return 'watch';
  return 'healthy';
}
function renewalZone(c) {
  if (c.manualStatus === 'churned') return 'churned';
  const d = daysBetween(c.renewalDate);
  if (d == null) return 'cruise';
  if (d < 0) return 'overdue';
  if (d <= 30) return 't30';
  if (d <= 60) return 't60';
  if (d <= 90) return 't90';
  return 'cruise';
}

const STATUS_META = {
  healthy: { label: 'Healthy', icon: ShieldCheck, dot: 'bg-phosphor', chip: 'bg-phosphor/12 text-phosphor border-phosphor/40' },
  watch: { label: 'Watch', icon: TriangleAlert, dot: 'bg-amber', chip: 'bg-amber/12 text-amber border-amber/40' },
  atrisk: { label: 'At risk', icon: ShieldAlert, dot: 'bg-red', chip: 'bg-red/12 text-red border-red/40' },
  saved: { label: 'Saved', icon: LifeBuoy, dot: 'bg-cyan', chip: 'bg-cyan/12 text-cyan border-cyan/40' },
  churned: { label: 'Churned', icon: Ban, dot: 'bg-dim', chip: 'bg-dim/12 text-dim border-dim/30' },
};
const ZONE_META = {
  overdue: { label: 'Overdue', chip: 'bg-red/12 text-red border-red/40' },
  t30: { label: 'T-30', chip: 'bg-panel2 text-text border-line' },
  t60: { label: 'T-60', chip: 'bg-panel2 text-text border-line' },
  t90: { label: 'T-90', chip: 'bg-panel2 text-text border-line' },
  cruise: { label: 'Cruising', chip: 'bg-panel2 text-muted border-line' },
  churned: { label: 'Churned', chip: 'bg-dim/12 text-dim border-dim/30' },
};
const ZONE_ORDER = ['overdue', 't30', 't60', 't90', 'cruise'];

function checklistMD(items) {
  if (!items.length) return '_none_';
  return items.map((i) => `- [${i.done ? 'x' : ' '}] ${i.text}`).join('\n');
}

function clientToMarkdown(c) {
  const status = computedStatus(c);
  const meta = STATUS_META[status];
  const zone = renewalZone(c);
  const zLabel = ZONE_META[zone].label;
  const d = daysBetween(c.renewalDate);
  const score = healthScore(c);
  const sDays = silenceDays(c);
  const L = [];
  L.push(`## ${c.name} — ${c.segment || 'Unsegmented'} · ${meta.label}`);
  L.push(`ARR: $${c.arr.toLocaleString()}/yr  ·  Owner: ${c.owner || '—'}  ·  Renewal: ${c.renewalDate} (${d >= 0 ? `T-${d}` : `${Math.abs(d)}d overdue`}, ${zLabel})`);
  L.push(`Health: usage ${c.health.usage} · results ${c.health.results} · relationship ${c.health.relationship} -> composite ${score}/100`);
  L.push(`Last contact: ${sDays == null ? 'never logged' : `${sDays} days ago`}`);
  L.push(`\n### Renewal plays`);
  L.push(`**T-90** (opens ${addDaysStr(c.renewalDate, -90)})\n${checklistMD(c.plays.t90)}`);
  L.push(`\n**T-60** (opens ${addDaysStr(c.renewalDate, -60)})\n${checklistMD(c.plays.t60)}`);
  L.push(`\n**T-30** (opens ${addDaysStr(c.renewalDate, -30)})\n${checklistMD(c.plays.t30)}`);
  if (c.savePlay.length || c.savePlan) {
    L.push(`\n### Save play`);
    L.push(checklistMD(c.savePlay));
    if (c.savePlan) L.push(`\n**Plan:** ${c.savePlan}`);
  }
  if (c.expansion.flagged) {
    L.push(`\n### Expansion flag`);
    L.push(`Estimated value: $${(c.expansion.value || 0).toLocaleString()}`);
    if (c.expansion.note) L.push(c.expansion.note);
  }
  if (c.touchpoints.length) {
    L.push(`\n### Touchpoints`);
    c.touchpoints.slice().sort((a, b) => b.date.localeCompare(a.date)).forEach((t) => L.push(`- ${t.date}: ${t.note || '(logged)'}`));
  }
  if (c.notes) L.push(`\n### Notes\n${c.notes}`);
  return L.join('\n');
}

function portfolioRollups(state) {
  const active = state.clients.filter((c) => computedStatus(c) !== 'churned');
  const totalARR = active.reduce((a, c) => a + c.arr, 0);
  const atRisk = active.filter((c) => computedStatus(c) === 'atrisk');
  const arrAtRisk = atRisk.reduce((a, c) => a + c.arr, 0);
  const dueSoon = active.filter((c) => ['overdue', 't30'].includes(renewalZone(c)));
  const avgHealth = active.length ? Math.round(active.reduce((a, c) => a + healthScore(c), 0) / active.length) : 0;
  const expansionValue = active.filter((c) => c.expansion.flagged).reduce((a, c) => a + (c.expansion.value || 0), 0);
  return { active, totalARR, atRisk, arrAtRisk, dueSoon, avgHealth, expansionValue };
}

function portfolioToMarkdown(state) {
  const r = portfolioRollups(state);
  const L = [
    `# Renewal Radar — Portfolio`,
    `_Exported ${today()} · ${r.active.length} active clients · $${r.totalARR.toLocaleString()} ARR under management · $${r.arrAtRisk.toLocaleString()} at risk · ${r.dueSoon.length} due within 30 days · avg health ${r.avgHealth}/100 · $${r.expansionValue.toLocaleString()} expansion pipeline_`,
  ];
  state.clients
    .slice()
    .sort((a, b) => (daysBetween(a.renewalDate) ?? 0) - (daysBetween(b.renewalDate) ?? 0))
    .forEach((c) => L.push(`\n---\n\n${clientToMarkdown(c)}`));
  return L.join('\n');
}

function rosterToCSV(clients) {
  const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const rows = [['name', 'segment', 'owner', 'status', 'zone', 'arr', 'renewalDate', 'daysToRenewal', 'health', 'silenceDays', 'expansionFlag', 'expansionValue']];
  clients.forEach((c) => {
    rows.push([c.name, c.segment, c.owner, computedStatus(c), renewalZone(c), c.arr, c.renewalDate, daysBetween(c.renewalDate), healthScore(c), silenceDays(c) ?? '', c.expansion.flagged ? 'yes' : 'no', c.expansion.value || 0]);
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

function promptT90(state, c) {
  return `You are a senior Customer Success / renewals manager known for opening renewal conversations early and honestly.

## The client
${clientToMarkdown(c)}

## Portfolio context
This account is one of ${state.clients.length} in my book. ${c.name} is ${daysBetween(c.renewalDate)} days from renewal, in the T-90 planning window.

## Your task
Draft a T-90 kickoff email to ${c.name}'s main contact that:
1. Opens the renewal conversation without sounding like a sales pitch — frame it as a proactive check-in.
2. Requests a short QBR / value-review call, proposing 2 concrete time windows.
3. Asks 2-3 specific questions that would surface expansion or risk signals early (tailor them to what's already known about this account above).
4. Sets a warm, low-pressure tone appropriate this far from the renewal date.

## Output format
The email (subject line + body, under 180 words), followed by a 3-bullet "internal prep notes" section for me before the call.`;
}

function promptT60(state, c) {
  return `You are a senior Customer Success manager who proves value before ever asking for a renewal.

## The client
${clientToMarkdown(c)}

## Your task
Draft the T-60 value-recap email to ${c.name}. It lands ${daysBetween(c.renewalDate)} days before their renewal date. It should:
1. Recap concrete wins/results from the term using the health signals and notes above (name specifics; if a number is missing, write "[metric]" as a placeholder rather than inventing one).
2. Reference the relationship — mention their team or champion by role if known.
3. Preview what's next (roadmap, upcoming value) without yet presenting pricing or terms.
4. End with a light, specific call to action — not "let me know if you have questions."

## Output format
Subject line + email body (150-220 words), then a short "risks to watch before T-30" bullet list based on the health signals above.`;
}

function promptSave(state, c) {
  const status = computedStatus(c);
  return `You are a renewals strategist brought in to save an at-risk account. Be direct — no generic advice.

## The account
${clientToMarkdown(c)}

## Current read
Status: ${STATUS_META[status].label}.${isSilent(c) ? ` No meaningful contact in ${silenceDays(c) ?? 'an unknown number of'} days — silence itself is a risk signal here.` : ''}

## Your task
1. Name the most likely root cause of the risk, reasoning from the health signals, notes, and save-play items above — do not just restate the numbers, interpret them.
2. Build a save plan: 4-6 concrete, dated actions between now and the renewal date (today is ${today()}, renewal is ${c.renewalDate}). Assign each a "who" (me / my manager / the champion).
3. Draft the one message — email or call opener — that starts the save. The actual words to send or say first.
4. Give me a single go/no-go signal to watch for by T-14 that tells me whether this account is savable or should be forecast as a loss.

## Output format
Markdown sections: "Root cause", "Save plan" (table: Action | Who | By when), "First message", "Go/no-go signal".`;
}

function promptProposal(state, c) {
  return `You are a renewals manager preparing the renewal order for a client's sign-off.

## The client
${clientToMarkdown(c)}

## Your task
Write a renewal proposal outline for ${c.name} — not full legal copy, a structured outline I can turn into a proposal doc or paste into an order form:
1. Value recap (2-3 lines, grounded in the health signals and notes above).
2. Renewal terms: term length, pricing approach, and — if the expansion flag above is set — how to fold that opportunity in as an add-on option, not a hard requirement.
3. What stays the same vs. what's changing from the current term.
4. Next steps with dates, working back from the renewal date ${c.renewalDate}.

## Output format
Markdown outline with headers matching the four sections above; keep each section to bullet points, not prose paragraphs.`;
}

const COPILOT_ACTIONS = [
  { id: 't90', icon: Radar, title: 'Draft T-90 kickoff email', desc: 'Open the renewal conversation early, before anything is at stake.', build: promptT90 },
  { id: 't60', icon: Mail, title: 'Draft the T-60 value-recap email', desc: 'Prove the value before the renewal conversation gets hard.', build: promptT60 },
  { id: 'save', icon: LifeBuoy, title: 'Plan a save for this client', desc: "Root-cause the risk and build a dated recovery plan.", build: promptSave },
  { id: 'proposal', icon: ClipboardList, title: 'Write the renewal proposal outline', desc: 'Structure the ask before you draft the real document.', build: promptProposal },
];

/* ================================ tiny UI atoms ================================ */

function IconBtn({ icon: Icon, label, onClick, tone = 'ghost', className = '', children, ...rest }) {
  const tones = {
    ghost: 'border-line bg-panel/60 text-muted hover:text-text hover:border-phosphordim/50',
    phosphor: 'border-phosphor/50 bg-phosphor/10 text-phosphor hover:bg-phosphor/20',
    amber: 'border-amber/50 bg-amber/10 text-amber hover:bg-amber/20',
    red: 'border-red/50 bg-red/10 text-red hover:bg-red/20',
    solid: 'border-phosphor bg-phosphor text-void hover:bg-phosphorbright',
  };
  return (
    <button type="button" onClick={onClick} aria-label={children ? undefined : label} title={label}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-semibold transition-colors ${tones[tone]} ${className}`} {...rest}>
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}{children}
    </button>
  );
}

function Panel({ title, icon: Icon, tone, children, className = '', actions }) {
  const toneText = tone === 'red' ? 'text-red' : tone === 'amber' ? 'text-amber' : tone === 'cyan' ? 'text-cyan' : 'text-phosphor';
  return (
    <section className={`rounded-lg border border-line bg-panel/80 shadow-raised backdrop-blur-sm ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-linesoft px-3.5 py-2.5">
          <h3 className={`label-caps flex items-center gap-2 text-xs ${toneText}`}>
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-void/80 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`toast-in relative mt-4 w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-lg border border-line bg-deep shadow-deck`}>
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-display flex items-center gap-2 text-base font-extrabold text-text">
            {Icon && <Icon className="h-4 w-4 text-phosphor" aria-hidden />} {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close dialog"
            className="rounded-md border border-line p-1.5 text-muted hover:text-text">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, sub, tone = 'phosphor' }) {
  const toneText = tone === 'red' ? 'text-red' : tone === 'amber' ? 'text-amber' : tone === 'cyan' ? 'text-cyan' : 'text-phosphor';
  return (
    <div className="rounded-lg border border-line bg-panel/70 px-4 py-3 shadow-raised">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${toneText}`} aria-hidden />
        <span className="label-caps text-[9px] text-muted">{label}</span>
      </div>
      <div className="font-display tabular text-2xl font-extrabold text-text">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

function StatusPill({ status }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={`label-caps inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] ${meta.chip}`}>
      <Icon className="h-2.5 w-2.5" aria-hidden /> {meta.label}
    </span>
  );
}

function ZoneChip({ zone }) {
  const meta = ZONE_META[zone];
  return <span className={`label-caps inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[8px] ${meta.chip}`}>{meta.label}</span>;
}

function HealthMeters({ health }) {
  const rows = [['USG', health.usage], ['RES', health.results], ['REL', health.relationship]];
  return (
    <div className="space-y-1">
      {rows.map(([label, val]) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className="label-caps w-7 shrink-0 text-[8px] text-muted">{label}</span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-linesoft"><div className="h-full rounded-full bg-phosphordim" style={{ width: `${val}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function HealthSlider({ label, hint, value, onChange }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-text">{label}</span>
        <span className="tabular text-xs text-phosphor">{value}</span>
      </div>
      <input type="range" min="0" max="100" value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} className="w-full" />
      <p className="mt-1 text-[11px] text-muted">{hint}</p>
    </div>
  );
}

function SilenceBadge({ client }) {
  const days = silenceDays(client);
  if (days == null) {
    return (
      <span className="label-caps inline-flex shrink-0 items-center gap-1 rounded border border-line px-1.5 py-0.5 text-[9px] text-muted">
        <Radio className="h-2.5 w-2.5" aria-hidden /> No contact logged
      </span>
    );
  }
  const silent = days >= SILENCE_THRESHOLD;
  const warn = days >= SILENCE_WARN && !silent;
  const cls = silent ? 'border-red/50 bg-red/10 text-red' : warn ? 'border-amber/50 bg-amber/10 text-amber' : 'border-line text-muted';
  return (
    <span className={`label-caps inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] ${cls} ${silent ? 'blink' : ''}`}>
      <Radio className="h-2.5 w-2.5" aria-hidden /> {days}d silent
    </span>
  );
}

function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="rounded-lg border border-dashed border-line px-6 py-14 text-center">
      <Icon className="mx-auto mb-3 h-7 w-7 text-phosphordim" aria-hidden />
      <h3 className="font-display text-base font-bold text-text">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">{body}</p>
      {action}
    </div>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 40 40" className="h-10 w-10 shrink-0" role="img" aria-label="Renewal Radar mark">
        <circle cx="20" cy="20" r="18" fill="#04140c" stroke="#163d29" strokeWidth="2" />
        <circle cx="20" cy="20" r="12" fill="none" stroke="#163d29" strokeWidth="1" strokeDasharray="2 3" />
        <circle cx="20" cy="20" r="6" fill="none" stroke="#163d29" strokeWidth="1" strokeDasharray="2 3" />
        <path d="M 20 20 L 34 20 A 14 14 0 0 0 30.5 10.9 Z" fill="rgba(77,255,160,0.28)" />
        <line x1="20" y1="20" x2="34" y2="20" stroke="#9dffce" strokeWidth="1.3" />
        <circle cx="20" cy="20" r="2" fill="#4dffa0" />
        <circle cx="12" cy="26" r="2.2" fill="#ff5c5c" />
      </svg>
      <div>
        <div className="font-display text-xl font-extrabold leading-none tracking-tight text-text">
          RENEWAL <span className="text-phosphor">RADAR</span>
        </div>
        <div className="label-caps mt-1 text-[10px] text-muted">Never lose a client to silence</div>
      </div>
    </div>
  );
}

/* ================================ radar scope (canvas) ================================ */

const HEX = {
  line: '#163d29', lineBright: '#2b9d63', dim: '#4c7261',
  phosphor: '#4dffa0', phosphorBright: '#9dffce',
};
const SCOPE_SIZE = 480; // intrinsic canvas resolution, logical coords are 0-400
const RADAR_POINTS = [[-30, 20], [0, 46], [30, 88], [60, 130], [90, 168], [200, 178]];
const RING_LABELS = [[46, 'T-0'], [88, 'T-30'], [130, 'T-60'], [168, 'T-90']];

function lerpPoints(points, x) {
  if (x <= points[0][0]) return points[0][1];
  if (x >= points[points.length - 1][0]) return points[points.length - 1][1];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i], [x1, y1] = points[i + 1];
    if (x >= x0 && x <= x1) { const t = (x - x0) / (x1 - x0); return y0 + t * (y1 - y0); }
  }
  return points[points.length - 1][1];
}
function blipRadius(days) {
  if (days == null) return 178;
  return lerpPoints(RADAR_POINTS, days);
}
function hashAngle(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

function drawStaticScope(ctx, size) {
  const scale = size / 400;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.scale(scale, scale);
  const grad = ctx.createRadialGradient(200, 200, 10, 200, 200, 190);
  grad.addColorStop(0, '#0c2a1c');
  grad.addColorStop(0.72, '#081f15');
  grad.addColorStop(1, '#04140c');
  ctx.beginPath(); ctx.arc(200, 200, 186, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = HEX.line; ctx.stroke();
  // range rings
  [46, 88, 130, 168].forEach((r) => {
    ctx.beginPath(); ctx.arc(200, 200, r, 0, Math.PI * 2);
    ctx.setLineDash([2, 5]); ctx.strokeStyle = HEX.line; ctx.lineWidth = 1; ctx.stroke();
  });
  ctx.setLineDash([]);
  // degree ticks
  for (let i = 0; i < 72; i++) {
    const a = (i * 5 * Math.PI) / 180;
    const big = i % 6 === 0;
    const r1 = big ? 174 : 179;
    ctx.beginPath();
    ctx.moveTo(200 + r1 * Math.cos(a), 200 + r1 * Math.sin(a));
    ctx.lineTo(200 + 186 * Math.cos(a), 200 + 186 * Math.sin(a));
    ctx.strokeStyle = big ? HEX.lineBright : HEX.line;
    ctx.lineWidth = big ? 1.3 : 0.7;
    ctx.stroke();
  }
  // crosshair
  ctx.strokeStyle = HEX.line; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(18, 200); ctx.lineTo(382, 200); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(200, 18); ctx.lineTo(200, 382); ctx.stroke();
  // ring labels
  RING_LABELS.forEach(([r, label]) => {
    ctx.fillStyle = HEX.dim;
    ctx.font = '700 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, 200, 200 - r - 5);
  });
  // hub ("today")
  ctx.beginPath(); ctx.arc(200, 200, 4, 0, Math.PI * 2); ctx.fillStyle = HEX.phosphor; ctx.fill();
  ctx.fillStyle = HEX.dim; ctx.font = '700 8px monospace'; ctx.textAlign = 'center';
  ctx.fillText('TODAY', 200, 214);
  ctx.restore();
}

function drawSweep(ctx, size, angleDeg) {
  const scale = size / 400;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(200, 200);
  ctx.rotate((angleDeg * Math.PI) / 180);
  const grad = ctx.createLinearGradient(0, 0, 186, 0);
  grad.addColorStop(0, 'rgba(77,255,160,0.34)');
  grad.addColorStop(1, 'rgba(77,255,160,0)');
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 186, -0.55, 0.02);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(186, 0);
  ctx.strokeStyle = 'rgba(157,255,206,0.9)'; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.restore();
}

function RadarScope({ clients, onPick, selectedId }) {
  const staticRef = useRef(null);
  const sweepRef = useRef(null);
  const reducedRef = useRef(false);

  useEffect(() => {
    reducedRef.current = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const cv = staticRef.current;
    if (cv) drawStaticScope(cv.getContext('2d'), SCOPE_SIZE);
  }, []);

  useEffect(() => {
    const cv = sweepRef.current;
    if (!cv) return undefined;
    const ctx = cv.getContext('2d');
    if (reducedRef.current) { drawSweep(ctx, SCOPE_SIZE, 40); return undefined; }
    let raf;
    const loop = (t) => { drawSweep(ctx, SCOPE_SIZE, (t / 9000) * 360 % 360); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const active = clients.filter((c) => computedStatus(c) !== 'churned');
  const blips = active.map((c) => {
    const days = daysBetween(c.renewalDate);
    const angle = (hashAngle(c.id) * Math.PI) / 180;
    const r = blipRadius(days);
    return { c, x: 200 + r * Math.cos(angle), y: 200 + r * Math.sin(angle), days };
  });

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px]">
      <canvas ref={staticRef} width={SCOPE_SIZE} height={SCOPE_SIZE} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <canvas ref={sweepRef} width={SCOPE_SIZE} height={SCOPE_SIZE} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <div className="absolute inset-0" role="group" aria-label="Renewal radar — client contacts by time to renewal">
        {blips.map(({ c, x, y, days }) => {
          const status = computedStatus(c);
          const meta = STATUS_META[status];
          const sel = c.id === selectedId;
          const silent = isSilent(c);
          return (
            <button key={c.id} type="button" onClick={() => onPick(c.id)}
              aria-label={`${c.name} — ${meta.label}, ${days < 0 ? `${Math.abs(days)} days overdue` : `renews in ${days} days`}${silent ? ', silent' : ''}`}
              className="group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
              style={{ left: `${(x / 400) * 100}%`, top: `${(y / 400) * 100}%` }}>
              <span className={`absolute -inset-2 rounded-full blip-pulse ${meta.dot} opacity-20`} aria-hidden />
              {silent && <span className="absolute -inset-1.5 rounded-full border border-dashed border-amber/70" aria-hidden />}
              <span className={`relative block rounded-full border-2 border-void transition-transform group-hover:scale-125 ${sel ? 'h-4 w-4' : 'h-2.5 w-2.5'} ${meta.dot}`} />
              {sel && (
                <span className="label-caps pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded border border-line bg-scope/95 px-1.5 py-0.5 text-[9px] text-text shadow-deck">
                  {c.name}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute left-3 top-3 label-caps text-[9px] text-dim">SCOPE</div>
      <div className="pointer-events-none absolute bottom-3 right-3 label-caps text-[9px] text-dim">{active.length} CONTACTS</div>
    </div>
  );
}

/* ================================ checklist editor ================================ */

function ChecklistEditor({ items, onChange, onDeleteItem, placeholder }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    onChange([...items, { id: uid(), text: t, done: false }]);
    setDraft('');
  };
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const toggle = (id) => onChange(items.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
  const edit = (id, text) => onChange(items.map((it) => (it.id === id ? { ...it, text } : it)));
  const done = items.filter((i) => i.done).length;
  return (
    <div>
      {items.length > 0 && (
        <div className="mb-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-linesoft">
            <div className="h-full rounded-full bg-phosphor" style={{ width: `${(done / items.length) * 100}%` }} />
          </div>
          <span className="label-caps shrink-0 text-[10px] text-muted tabular">{done}/{items.length}</span>
        </div>
      )}
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={it.id} className="group flex items-start gap-2 rounded-md border border-linesoft bg-deep/70 px-2.5 py-2">
            <button type="button" onClick={() => toggle(it.id)} aria-label={it.done ? 'Mark not done' : 'Mark done'} className="mt-0.5 shrink-0 text-phosphor">
              {it.done ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <Circle className="h-4 w-4 text-muted" aria-hidden />}
            </button>
            <input value={it.text} onChange={(e) => edit(it.id, e.target.value)}
              className={`min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted ${it.done ? 'text-muted line-through' : 'text-text'}`}
              aria-label="Edit checklist item" />
            <span className="flex shrink-0 items-center gap-0.5 opacity-40 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"
                className="rounded p-1 text-muted hover:text-text disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" aria-hidden /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down"
                className="rounded p-1 text-muted hover:text-text disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" aria-hidden /></button>
              <button type="button" onClick={() => onDeleteItem(it.id)} aria-label="Delete item"
                className="rounded p-1 text-muted hover:text-red"><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-md border border-line bg-deep px-2.5 py-1.5 text-sm text-text outline-none placeholder:text-muted focus:border-phosphor/60" />
        <IconBtn icon={Plus} label="Add item" onClick={add} />
      </div>
    </div>
  );
}

function PlayWindow({ label, opensOn, active, items, onChange, onDeleteItem }) {
  return (
    <div className={`rounded-lg border p-3 ${active ? 'border-phosphor/50 bg-phosphor/5 shadow-glow' : 'border-line bg-panel/60'}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="label-caps text-[10px] text-text">{label}</span>
        {active && <span className="label-caps rounded bg-phosphor/15 px-1.5 py-0.5 text-[8px] text-phosphor">ACTIVE</span>}
      </div>
      <p className="mb-2 text-[10px] text-muted">opens {opensOn}</p>
      <ChecklistEditor items={items} onChange={onChange} onDeleteItem={onDeleteItem} placeholder="Add a play…" />
    </div>
  );
}

/* ================================ health dial ================================ */

function HealthDial({ score, size = 118 }) {
  const r = 36, cx = 50, cy = 50, a0 = Math.PI, a1 = 0;
  const arc = (t) => { const a = a0 + (a1 - a0) * t; return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }; };
  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const a = a0 + (a1 - a0) * (i / 10);
    const inner = i % 5 === 0 ? r - 7 : r - 4;
    ticks.push(
      <line key={i} x1={cx + inner * Math.cos(a)} y1={cy - inner * Math.sin(a)} x2={cx + r * Math.cos(a)} y2={cy - r * Math.sin(a)}
        stroke={i === 0 || i === 10 ? HEX.dim : HEX.line} strokeWidth={i % 5 === 0 ? 2 : 1} />
    );
  }
  const v = clamp(score, 0, 100) / 100;
  const end = arc(v), start = arc(0);
  const needleA = a0 + (a1 - a0) * v;
  const color = score >= 70 ? HEX.phosphor : score >= 40 ? '#ffb020' : '#ff5c5c';
  return (
    <svg viewBox="0 0 100 62" width={size} height={size * 0.62} role="img" aria-label={`Health score ${score} of 100`} className="overflow-visible">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#0f2c1e" strokeWidth="6" />
      {v > 0 && <path d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />}
      {ticks}
      <line x1={cx} y1={cy} x2={cx + (r - 12) * Math.cos(needleA)} y2={cy - (r - 12) * Math.sin(needleA)} stroke="#d9ffe9" strokeWidth="2" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="3" fill="#d9ffe9" />
      <text x={cx} y={cy - 12} textAnchor="middle" fill="#d9ffe9" style={{ font: '700 15px "IBM Plex Mono", monospace' }}>{score}</text>
    </svg>
  );
}

/* ================================ client detail ================================ */

function ClientDetail({ c, onBack, onPatch, onDeleteItem, onRemove, onCopy, onLogTouch }) {
  const status = computedStatus(c);
  const zone = renewalZone(c);
  const d = daysBetween(c.renewalDate);
  const score = healthScore(c);
  const [touchDraft, setTouchDraft] = useState('');
  const activeWindow = zone === 'overdue' ? 't30' : ['t90', 't60', 't30'].includes(zone) ? zone : null;
  const logTouch = () => { onLogTouch(touchDraft); setTouchDraft(''); };

  return (
    <div className="fade-in space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="label-caps flex items-center gap-1 text-[11px] text-muted hover:text-text">
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Back to scope
        </button>
        <div className="flex items-center gap-2">
          <IconBtn icon={Copy} label="Copy client record as Markdown" onClick={onCopy}>Copy record</IconBtn>
          <IconBtn icon={Trash2} label={`Delete ${c.name}`} tone="red" onClick={onRemove}>Delete</IconBtn>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-panel/80 p-4 shadow-raised">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[220px] flex-1">
            <input value={c.name} onChange={(e) => onPatch({ name: e.target.value })} aria-label="Client name"
              className="font-display w-full bg-transparent text-2xl font-extrabold text-text outline-none placeholder:text-muted" placeholder="Client name" />
            <div className="mt-2 flex flex-wrap gap-2">
              <input value={c.segment} onChange={(e) => onPatch({ segment: e.target.value })} placeholder="Segment (e.g. Enterprise)" aria-label="Segment"
                className="rounded-md border border-line bg-deep px-2.5 py-1.5 text-xs text-text outline-none placeholder:text-muted focus:border-phosphor/60" />
              <input value={c.owner} onChange={(e) => onPatch({ owner: e.target.value })} placeholder="Owner / CSM" aria-label="Owner"
                className="rounded-md border border-line bg-deep px-2.5 py-1.5 text-xs text-text outline-none placeholder:text-muted focus:border-phosphor/60" />
            </div>
          </div>
          <StatusPill status={status} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="label-caps block text-[9px] text-muted">ARR</span>
            <div className="mt-1 flex items-center rounded-md border border-line bg-deep px-2.5 py-1.5">
              <span className="mr-1 text-xs text-muted">$</span>
              <input type="number" min="0" value={c.arr} onChange={(e) => onPatch({ arr: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full bg-transparent text-sm tabular text-text outline-none" aria-label="Annual contract value" />
            </div>
          </label>
          <label className="block">
            <span className="label-caps block text-[9px] text-muted">Renewal date</span>
            <input type="date" value={c.renewalDate} onChange={(e) => onPatch({ renewalDate: e.target.value || today() })}
              className="mt-1 w-full rounded-md border border-line bg-deep px-2.5 py-1.5 text-sm tabular text-text outline-none focus:border-phosphor/60" aria-label="Renewal date" />
          </label>
          <label className="block">
            <span className="label-caps block text-[9px] text-muted">Status override</span>
            <select value={c.manualStatus} onChange={(e) => onPatch({ manualStatus: e.target.value })}
              className="mt-1 w-full rounded-md border border-line bg-deep px-2.5 py-1.5 text-sm text-text outline-none focus:border-phosphor/60" aria-label="Status override">
              <option value="auto">Auto (from signals)</option>
              {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
            </select>
          </label>
          <div className="block">
            <span className="label-caps block text-[9px] text-muted">Renews in</span>
            <div className={`mt-1 tabular text-lg font-bold ${d < 0 ? 'text-red' : 'text-text'}`}>{d < 0 ? `${Math.abs(d)}d overdue` : `${d} days`}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <Panel title="Health" icon={Gauge}>
          <div className="flex flex-col items-center gap-2">
            <HealthDial score={score} />
            <SilenceBadge client={c} />
          </div>
        </Panel>
        <Panel title="Signals — set these honestly, they drive status" icon={SlidersHorizontal}>
          <div className="space-y-4">
            <HealthSlider label="Usage" hint="% of seats or features genuinely active in the last 30 days" value={c.health.usage}
              onChange={(v) => onPatch((cc) => ({ health: { ...cc.health, usage: v } }))} />
            <HealthSlider label="Results" hint="Are they hitting the outcome they bought this for?" value={c.health.results}
              onChange={(v) => onPatch((cc) => ({ health: { ...cc.health, results: v } }))} />
            <HealthSlider label="Relationship" hint="Champion strength, exec sponsor, sentiment on calls" value={c.health.relationship}
              onChange={(v) => onPatch((cc) => ({ health: { ...cc.health, relationship: v } }))} />
          </div>
        </Panel>
      </div>

      <Panel title="Touchpoints — log contact to stay off the silence list" icon={Radio}>
        <div className="mb-2 flex gap-2">
          <input value={touchDraft} onChange={(e) => setTouchDraft(e.target.value)} placeholder="What happened? (optional)"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); logTouch(); } }}
            className="min-w-0 flex-1 rounded-md border border-line bg-deep px-2.5 py-1.5 text-sm text-text outline-none placeholder:text-muted focus:border-phosphor/60" aria-label="Touchpoint note" />
          <IconBtn icon={Plus} label="Log contact today" onClick={logTouch}>Log today</IconBtn>
        </div>
        {c.touchpoints.length === 0 ? (
          <p className="text-xs text-muted">No touchpoints logged yet — this account will read as silent.</p>
        ) : (
          <ul className="space-y-1.5">
            {c.touchpoints.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 rounded-md border border-linesoft bg-deep/60 px-2.5 py-1.5 text-xs">
                <span><span className="tabular text-muted">{t.date}</span>{t.note ? ` — ${t.note}` : ''}</span>
                <button type="button" onClick={() => onDeleteItem('touchpoints', t.id, `Removed touchpoint from ${t.date}`)} aria-label="Delete touchpoint"
                  className="shrink-0 text-muted hover:text-red"><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div>
        <h3 className="font-display mb-2 flex items-center gap-2 text-sm font-bold text-text">
          <CalendarClock className="h-4 w-4 text-phosphor" aria-hidden /> Renewal plays
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <PlayWindow label="T-90" opensOn={addDaysStr(c.renewalDate, -90)} active={activeWindow === 't90'} items={c.plays.t90}
            onChange={(items) => onPatch({ plays: { ...c.plays, t90: items } })} onDeleteItem={(id) => onDeleteItem('plays.t90', id, 'Removed T-90 play')} />
          <PlayWindow label="T-60" opensOn={addDaysStr(c.renewalDate, -60)} active={activeWindow === 't60'} items={c.plays.t60}
            onChange={(items) => onPatch({ plays: { ...c.plays, t60: items } })} onDeleteItem={(id) => onDeleteItem('plays.t60', id, 'Removed T-60 play')} />
          <PlayWindow label="T-30" opensOn={addDaysStr(c.renewalDate, -30)} active={activeWindow === 't30'} items={c.plays.t30}
            onChange={(items) => onPatch({ plays: { ...c.plays, t30: items } })} onDeleteItem={(id) => onDeleteItem('plays.t30', id, 'Removed T-30 play')} />
        </div>
      </div>

      <Panel title="Save play" icon={LifeBuoy} tone="red" className={status === 'atrisk' ? 'ring-1 ring-red/40' : ''}>
        <ChecklistEditor items={c.savePlay} onChange={(items) => onPatch({ savePlay: items })} onDeleteItem={(id) => onDeleteItem('savePlay', id, 'Removed save-play item')} placeholder="Add a save action…" />
        <label className="mt-3 block">
          <span className="label-caps block text-[9px] text-muted">Save plan narrative</span>
          <textarea value={c.savePlan} onChange={(e) => onPatch({ savePlan: e.target.value })} rows={3} placeholder="Root cause, who's involved, what changes the outcome…"
            className="mt-1 w-full resize-y rounded-md border border-line bg-deep px-2.5 py-2 text-sm text-text outline-none placeholder:text-muted focus:border-red/60" />
        </label>
      </Panel>

      <Panel title="Expansion" icon={TrendingUp} tone="cyan">
        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={c.expansion.flagged} onChange={(e) => onPatch({ expansion: { ...c.expansion, flagged: e.target.checked } })} className="h-4 w-4 accent-cyan" />
          Flag this account for expansion
        </label>
        {c.expansion.flagged && (
          <div className="mt-3 space-y-2">
            <label className="block">
              <span className="label-caps block text-[9px] text-muted">Estimated value</span>
              <div className="mt-1 flex items-center rounded-md border border-line bg-deep px-2.5 py-1.5">
                <span className="mr-1 text-xs text-muted">$</span>
                <input type="number" min="0" value={c.expansion.value}
                  onChange={(e) => onPatch({ expansion: { ...c.expansion, value: Math.max(0, Number(e.target.value) || 0) } })}
                  className="w-full bg-transparent text-sm tabular text-text outline-none" aria-label="Expansion value" />
              </div>
            </label>
            <label className="block">
              <span className="label-caps block text-[9px] text-muted">Notes</span>
              <textarea value={c.expansion.note} onChange={(e) => onPatch({ expansion: { ...c.expansion, note: e.target.value } })} rows={2}
                className="mt-1 w-full resize-y rounded-md border border-line bg-deep px-2.5 py-2 text-sm text-text outline-none placeholder:text-muted focus:border-cyan/60" placeholder="What's the opportunity?" />
            </label>
          </div>
        )}
      </Panel>

      <Panel title="Notes">
        <textarea value={c.notes} onChange={(e) => onPatch({ notes: e.target.value })} rows={4} placeholder="Anything else worth remembering about this account…"
          className="w-full resize-y rounded-md border border-line bg-deep px-2.5 py-2 text-sm text-text outline-none placeholder:text-muted focus:border-phosphor/60" />
      </Panel>
    </div>
  );
}

/* ================================ roster views ================================ */

function RosterRow({ c, onOpen }) {
  const status = computedStatus(c);
  const zone = renewalZone(c);
  const d = daysBetween(c.renewalDate);
  const score = healthScore(c);
  return (
    <li>
      <button type="button" onClick={onOpen}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line bg-panel/70 px-3.5 py-3 text-left transition-colors hover:border-phosphordim/60">
        <div className="min-w-[150px] flex-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-text">
            {c.name} {c.expansion.flagged && <Star className="h-3 w-3 shrink-0 text-cyan" aria-hidden />}
          </div>
          <div className="text-[11px] text-muted">{c.segment || 'Unsegmented'}{c.owner ? ` · ${c.owner}` : ''}</div>
        </div>
        <StatusPill status={status} />
        <div className="hidden w-32 shrink-0 sm:block"><HealthMeters health={c.health} /></div>
        <div className="w-16 shrink-0 text-right">
          <div className="tabular text-sm font-bold text-text">{score}</div>
          <div className="label-caps text-[8px] text-muted">health</div>
        </div>
        <div className="w-24 shrink-0 text-right">
          <div className="tabular text-sm font-bold text-text">{zone === 'churned' ? '—' : d < 0 ? `${Math.abs(d)}d over` : `${d}d`}</div>
          <ZoneChip zone={zone} />
        </div>
        <div className="w-24 shrink-0 text-right tabular text-sm text-text">${c.arr.toLocaleString()}</div>
        <SilenceBadge client={c} />
      </button>
    </li>
  );
}

function RosterList({ clients, onOpen, query, setQuery, statusFilter, setStatusFilter, searchRef }) {
  if (!clients.length) {
    return (
      <EmptyState icon={Users} title="No clients yet" body="Load the demo portfolio to see Renewal Radar working, or add your first client to start tracking renewals."
        action={<p className="mt-3 text-[11px] text-dim">Use "New client" in the header, or "Load demo" to explore.</p>} />
    );
  }
  const filtered = clients.filter((c) => {
    if (statusFilter !== 'all' && computedStatus(c) !== statusFilter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [c.name, c.segment, c.owner, c.notes].join(' ').toLowerCase().includes(q);
  }).sort((a, b) => (daysBetween(a.renewalDate) ?? 9999) - (daysBetween(b.renewalDate) ?? 9999));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden />
          <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search clients, owners, notes…"
            className="w-full rounded-md border border-line bg-panel py-1.5 pl-8 pr-2.5 text-sm text-text outline-none placeholder:text-muted focus:border-phosphor/60" aria-label="Search roster" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-line bg-panel px-2.5 py-1.5 text-sm text-text outline-none focus:border-phosphor/60" aria-label="Filter by status">
          <option value="all">All statuses</option>
          {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">No clients match this filter.</p>
      ) : (
        <ul className="space-y-2">{filtered.map((c) => <RosterRow key={c.id} c={c} onOpen={() => onOpen(c.id)} />)}</ul>
      )}
    </div>
  );
}

function TimelineBoard({ clients, onOpen }) {
  const active = clients.filter((c) => renewalZone(c) !== 'churned');
  if (!active.length) {
    return <EmptyState icon={CalendarClock} title="Nothing on the timeline" body="Add a client with a renewal date to see the T-90/T-60/T-30 windows fill in." />;
  }
  const columns = ZONE_ORDER.map((z) => ({
    zone: z,
    items: active.filter((c) => renewalZone(c) === z).sort((a, b) => daysBetween(a.renewalDate) - daysBetween(b.renewalDate)),
  }));
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {columns.map((col) => (
        <div key={col.zone} className="w-[240px] shrink-0 rounded-lg border border-line bg-panel/60 p-2.5">
          <div className="label-caps mb-2 flex items-center justify-between text-[10px] text-muted">
            <span>{ZONE_META[col.zone].label}</span><span className="tabular">{col.items.length}</span>
          </div>
          <div className="space-y-2">
            {col.items.length === 0 && <p className="rounded border border-dashed border-linesoft px-2 py-4 text-center text-[11px] text-dim">Empty</p>}
            {col.items.map((c) => {
              const currentPlay = col.zone === 'overdue' ? c.plays.t30 : col.zone === 'cruise' ? null : c.plays[col.zone];
              const done = currentPlay ? currentPlay.filter((i) => i.done).length : 0;
              const total = currentPlay ? currentPlay.length : 0;
              return (
                <button key={c.id} type="button" onClick={() => onOpen(c.id)}
                  className="block w-full rounded-md border border-linesoft bg-deep/70 px-2.5 py-2 text-left hover:border-phosphordim/60">
                  <div className="truncate text-xs font-semibold text-text">{c.name}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <StatusPill status={computedStatus(c)} />
                    {total > 0 && <span className="label-caps text-[8px] text-muted tabular">{done}/{total}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function AtRiskQueue({ clients, onOpen }) {
  const list = clients.filter((c) => computedStatus(c) === 'atrisk').sort((a, b) => daysBetween(a.renewalDate) - daysBetween(b.renewalDate));
  if (!list.length) {
    return (
      <EmptyState icon={ShieldCheck} title="No accounts at risk right now" body="Keep logging touchpoints and updating health signals to keep it that way." />
    );
  }
  return (
    <ul className="space-y-2.5">
      {list.map((c) => {
        const d = daysBetween(c.renewalDate);
        const done = c.savePlay.filter((i) => i.done).length;
        const total = c.savePlay.length;
        const nextItem = c.savePlay.find((i) => !i.done);
        return (
          <li key={c.id}>
            <button type="button" onClick={() => onOpen(c.id)} className="w-full rounded-lg border border-red/30 bg-red/5 px-3.5 py-3 text-left hover:border-red/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-text"><ShieldAlert className="h-4 w-4 text-red" aria-hidden /> {c.name}</div>
                <div className="tabular text-xs text-red">{d < 0 ? `${Math.abs(d)}d overdue` : `${d}d to renewal`} · ${c.arr.toLocaleString()}/yr</div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-linesoft"><div className="h-full rounded-full bg-red" style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
                <span className="label-caps shrink-0 text-[9px] text-muted tabular">{done}/{total} saved</span>
              </div>
              {nextItem && <p className="mt-1.5 text-[11px] text-muted">Next: {nextItem.text}</p>}
              <div className="mt-1.5"><SilenceBadge client={c} /></div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ExpansionList({ clients, onOpen }) {
  const list = clients.filter((c) => c.expansion.flagged && computedStatus(c) !== 'churned').sort((a, b) => (b.expansion.value || 0) - (a.expansion.value || 0));
  if (!list.length) {
    return <EmptyState icon={TrendingUp} title="No expansion flags yet" body="Open a healthy client and flag the opportunity when you spot one." />;
  }
  const total = list.reduce((a, c) => a + (c.expansion.value || 0), 0);
  return (
    <div>
      <p className="label-caps mb-2 text-[10px] text-muted">{list.length} flagged · ${total.toLocaleString()} pipeline</p>
      <ul className="space-y-2.5">
        {list.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => onOpen(c.id)} className="w-full rounded-lg border border-cyan/30 bg-cyan/5 px-3.5 py-3 text-left hover:border-cyan/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-text"><TrendingUp className="h-4 w-4 text-cyan" aria-hidden /> {c.name}</div>
                <div className="tabular text-xs text-cyan">+${(c.expansion.value || 0).toLocaleString()}</div>
              </div>
              {c.expansion.note && <p className="mt-1.5 text-[12px] text-muted">{c.expansion.note}</p>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ================================ copilot drawer ================================ */

function CopilotDrawer({ state, initialClientId, onClose, onNotes, onToast }) {
  const [clientId, setClientId] = useState(initialClientId || state.clients[0]?.id || '');
  const [actionId, setActionId] = useState(null);
  const client = state.clients.find((c) => c.id === clientId) || null;
  const action = COPILOT_ACTIONS.find((a) => a.id === actionId) || null;
  const prompt = action && client ? action.build(state, client) : '';
  const copy = async () => { const ok = await copyText(prompt); onToast(ok ? "Prompt copied — paste into claude.ai" : 'Copy failed'); };
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-void/70 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Claude Copilot" className="toast-in flex h-full w-full max-w-md flex-col border-l border-line bg-deep shadow-deck">
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-display flex items-center gap-2 text-base font-extrabold text-text"><Sparkles className="h-4 w-4 text-phosphor" aria-hidden /> Claude Copilot</h2>
          <button type="button" onClick={onClose} aria-label="Close Copilot" className="rounded-md border border-line p-1.5 text-muted hover:text-text"><X className="h-4 w-4" aria-hidden /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">
          <label className="label-caps mb-1.5 block text-[10px] text-muted" htmlFor="rr-copilot-client">Client</label>
          <select id="rr-copilot-client" value={clientId} onChange={(e) => setClientId(e.target.value)}
            className="mb-4 w-full rounded-md border border-line bg-panel px-2.5 py-2 text-sm text-text outline-none focus:border-phosphor/60">
            <option value="">— choose a client —</option>
            {state.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="space-y-2">
            {COPILOT_ACTIONS.map((a) => {
              const Icon = a.icon;
              const active = actionId === a.id;
              return (
                <button key={a.id} type="button" onClick={() => setActionId(a.id)} disabled={!client}
                  className={`flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors disabled:opacity-40 ${active ? 'border-phosphor/60 bg-phosphor/10' : 'border-line bg-panel/60 hover:border-phosphordim/60'}`}>
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-phosphor" aria-hidden />
                  <span>
                    <span className="block text-sm font-semibold text-text">{a.title}</span>
                    <span className="block text-xs text-muted">{a.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {action && client && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="label-caps text-[10px] text-muted">Generated prompt</span>
                <IconBtn icon={Copy} label="Copy prompt" tone="solid" onClick={copy}>Copy prompt</IconBtn>
              </div>
              <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border border-line bg-scope p-3 text-[11px] leading-relaxed text-text/90">{prompt}</pre>
              <p className="mt-1.5 text-[11px] text-muted">Paste into claude.ai — works with the standard Claude subscription.</p>
            </div>
          )}
          <div className="mt-6 border-t border-linesoft pt-4">
            <label className="label-caps mb-1.5 block text-[10px] text-muted" htmlFor="rr-copilot-notes">Paste Claude's answer back</label>
            <textarea id="rr-copilot-notes" value={state.copilotNotes} onChange={(e) => onNotes(e.target.value)} rows={6}
              placeholder="Paste Claude's reply here to keep it with this portfolio…"
              className="w-full resize-y rounded-md border border-line bg-panel px-2.5 py-2 text-sm text-text outline-none placeholder:text-muted focus:border-phosphor/60" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================ help content ================================ */

function HelpContent() {
  const steps = [
    ['Read the guide, then close it.', 'It only auto-opens once; reopen anytime with ? or the "How to use" button.'],
    ['Load the demo portfolio.', 'Eight realistic clients across every zone and status — cruising, watch, at-risk, saved, and one churned lesson.'],
    ['Add your own clients.', 'Use "New client", then set segment, owner, ARR, and renewal date on the detail screen.'],
    ['Set health signals honestly.', 'Usage, results, and relationship sliders (0-100) drive the composite health score and the auto status.'],
    ['Log touchpoints — silence is a signal.', 'No contact in 45+ days trips the at-risk flag even if health scores look fine.'],
    ['Work the renewal plays.', 'Each client gets T-90/T-60/T-30 checklists; the window matching today\'s date is highlighted ACTIVE.'],
    ['Watch the At-risk queue and Expansion tab.', 'Work each save plan to completion; flag upsell opportunities the moment you spot them.'],
    ['Run Copilot prompts.', 'Pick a client and an action, copy the prompt into claude.ai, then paste the reply back into notes.'],
  ];
  return (
    <div>
      <ol className="space-y-3">
        {steps.map(([title, body], i) => (
          <li key={i} className="flex gap-3">
            <span className="label-caps flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-phosphor/50 bg-phosphor/10 text-[11px] text-phosphor">{i + 1}</span>
            <div><p className="text-sm font-semibold text-text">{title}</p><p className="text-sm text-muted">{body}</p></div>
          </li>
        ))}
      </ol>
      <div className="mt-5 border-t border-linesoft pt-4">
        <h3 className="label-caps mb-2 flex items-center gap-1.5 text-[10px] text-muted"><Keyboard className="h-3.5 w-3.5" aria-hidden /> Keyboard shortcuts</h3>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full text-left text-xs">
            <tbody>
              {[['?', 'Open this guide'], ['Ctrl / Cmd + S', 'Copy the portfolio as Markdown'], ['N', 'New client'], ['C', 'Toggle Claude Copilot'], ['Esc', 'Close a dialog, or go back to the scope view']].map(([k, v]) => (
                <tr key={k} className="border-b border-linesoft last:border-0">
                  <td className="w-40 border-r border-linesoft px-3 py-1.5 font-mono text-phosphor">{k}</td>
                  <td className="px-3 py-1.5 text-muted">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================================ App ================================ */

const TABS = [
  { id: 'roster', label: 'Roster', icon: Users },
  { id: 'timeline', label: 'Timeline', icon: CalendarClock },
  { id: 'atrisk', label: 'At-risk queue', icon: ShieldAlert },
  { id: 'expansion', label: 'Expansion', icon: TrendingUp },
];

export default function App() {
  const [state, setState] = useState(loadState);
  const [view, setView] = useState('scope'); // scope | client
  const [tab, setTab] = useState('roster');
  const [helpOpen, setHelpOpen] = useState(() => !loadSeen());
  const [resetOpen, setResetOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const toastTimer = useRef(null);
  const fileRef = useRef(null);
  const exportRef = useRef(null);
  const searchRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  function loadSeen() { try { return normalize(localStorage.getItem(LS_KEY)).seenGuide; } catch { return false; } }

  const selected = state.clients.find((c) => c.id === state.selectedId) || null;

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
  const patchClient = (id, p) =>
    setState((s) => ({ ...s, clients: s.clients.map((c) => (c.id === id ? { ...c, ...(typeof p === 'function' ? p(c) : p) } : c)) }));

  const removeClientListItem = (clientId, field, itemId, label) => {
    const prev = stateRef.current;
    setState((s) => ({
      ...s,
      clients: s.clients.map((c) => {
        if (c.id !== clientId) return c;
        if (field.startsWith('plays.')) {
          const key = field.split('.')[1];
          return { ...c, plays: { ...c.plays, [key]: c.plays[key].filter((it) => it.id !== itemId) } };
        }
        return { ...c, [field]: c[field].filter((it) => it.id !== itemId) };
      }),
    }));
    showToast(label, () => setState(prev));
  };

  const addClient = () => {
    const renewal = addDaysStr(today(), 90);
    const c = normClient({
      name: 'New client', renewalDate: renewal,
      plays: {
        t90: PLAY_TEMPLATES.t90.map((t) => ({ id: uid(), text: t, done: false })),
        t60: PLAY_TEMPLATES.t60.map((t) => ({ id: uid(), text: t, done: false })),
        t30: PLAY_TEMPLATES.t30.map((t) => ({ id: uid(), text: t, done: false })),
      },
      savePlay: SAVE_PLAY_TEMPLATE.map((t) => ({ id: uid(), text: t, done: false })),
    });
    setState((s) => ({ ...s, clients: [...s.clients, c], selectedId: c.id }));
    setView('client');
  };

  const removeClient = (id) => {
    const name = state.clients.find((c) => c.id === id)?.name || 'client';
    deleteWithUndo(`Removed ${name}`, (prev) => ({
      ...prev,
      clients: prev.clients.filter((c) => c.id !== id),
      selectedId: prev.selectedId === id ? null : prev.selectedId,
    }));
    if (state.selectedId === id) setView('scope');
  };

  const openClient = (id) => { patch({ selectedId: id }); setView('client'); };

  const logTouch = (clientId, note) => {
    const t = { id: uid(), date: today(), note: (note || '').trim() };
    patchClient(clientId, (c) => ({ touchpoints: [...c.touchpoints, t] }));
    showToast('Touchpoint logged — silence clock reset');
  };

  const closeHelp = () => { setHelpOpen(false); if (!state.seenGuide) patch({ seenGuide: true }); };

  /* actions */
  const doCopyMarkdown = async () => {
    const ok = await copyText(portfolioToMarkdown(state));
    showToast(ok ? 'Portfolio copied as Markdown' : 'Copy failed — try Export > Download');
  };
  const doExportJSON = () => { downloadFile('renewal-radar.json', 'application/json', JSON.stringify(state, null, 2)); setExportOpen(false); };
  const doExportCSV = () => { downloadFile('renewal-radar-roster.csv', 'text/csv', rosterToCSV(state.clients)); setExportOpen(false); };
  const doImport = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = normalize(String(reader.result));
        setState((s) => ({ ...next, seenGuide: s.seenGuide || next.seenGuide }));
        showToast('Portfolio imported — roster updated');
      } catch { showToast('Import failed — not a valid portfolio file'); }
    };
    reader.readAsText(f);
    e.target.value = '';
    setExportOpen(false);
  };
  const doLoadDemo = () => {
    setState((s) => ({ ...demoState(), seenGuide: s.seenGuide || true }));
    setView('scope'); setTab('roster');
    showToast('Demo portfolio loaded — 8 clients across every zone');
  };
  const doReset = () => {
    try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
    setState(normalize({ seenGuide: true }));
    setView('scope'); setResetOpen(false);
    showToast('Scope cleared');
  };

  /* keyboard */
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if (e.key === 'Escape') {
        if (exportOpen) { setExportOpen(false); return; }
        if (copilotOpen) { setCopilotOpen(false); return; }
        if (helpOpen) { closeHelp(); return; }
        if (resetOpen) { setResetOpen(false); return; }
        if (view === 'client') { setView('scope'); return; }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); doCopyMarkdown(); return; }
      if (typing) return;
      if (e.key === '?') { e.preventDefault(); setHelpOpen(true); return; }
      if (e.key.toLowerCase() === 'c') { e.preventDefault(); setCopilotOpen((v) => !v); return; }
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); addClient(); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* close export menu on outside click */
  useEffect(() => {
    if (!exportOpen) return undefined;
    const onDown = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false); };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [exportOpen]);

  const r = portfolioRollups(state);

  return (
    <div className="scope-grid min-h-screen">
      <div className="app-chrome">
        {/* ============ header ============ */}
        <header className="sticky top-0 z-40 border-b border-line bg-void/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Wordmark />
            <div className="flex flex-wrap items-center gap-2">
              <IconBtn icon={Plus} label="New client (N)" onClick={addClient}>New client</IconBtn>
              <IconBtn icon={Sparkles} label="Claude Copilot (C)" tone="phosphor" onClick={() => setCopilotOpen(true)}>Copilot</IconBtn>
              <IconBtn icon={Radar} label="Load demo portfolio" onClick={doLoadDemo}>Load demo</IconBtn>
              <IconBtn icon={HelpCircle} label="How to use (?)" onClick={() => setHelpOpen(true)}>How to use</IconBtn>
              <div className="relative" ref={exportRef}>
                <IconBtn icon={Download} label="Export menu" onClick={() => setExportOpen((v) => !v)} aria-expanded={exportOpen}>Export</IconBtn>
                {exportOpen && (
                  <div className="toast-in absolute right-0 z-50 mt-1.5 w-64 rounded-md border border-line bg-deep p-1.5 shadow-deck">
                    <button type="button" onClick={() => { doCopyMarkdown(); setExportOpen(false); }}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-text hover:bg-panel">
                      <FileText className="h-4 w-4 text-muted" aria-hidden /> Copy portfolio (Markdown)
                    </button>
                    <button type="button" onClick={doExportJSON}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-text hover:bg-panel">
                      <FileDown className="h-4 w-4 text-muted" aria-hidden /> Download JSON (full state)
                    </button>
                    <button type="button" onClick={doExportCSV}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-text hover:bg-panel">
                      <ClipboardList className="h-4 w-4 text-muted" aria-hidden /> Download roster (CSV)
                    </button>
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-text hover:bg-panel">
                      <Upload className="h-4 w-4 text-muted" aria-hidden /> Import JSON…
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
          {view === 'client' && selected ? (
            <ClientDetail
              key={selected.id}
              c={selected}
              onBack={() => setView('scope')}
              onPatch={(p) => patchClient(selected.id, p)}
              onDeleteItem={(field, itemId, label) => removeClientListItem(selected.id, field, itemId, label)}
              onRemove={() => removeClient(selected.id)}
              onCopy={async () => { const ok = await copyText(clientToMarkdown(selected)); showToast(ok ? `${selected.name} record copied` : 'Copy failed'); }}
              onLogTouch={(note) => logTouch(selected.id, note)}
            />
          ) : (
            <div className="fade-in space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <StatTile icon={ClipboardList} label="ARR under mgmt" value={`$${r.totalARR.toLocaleString()}`} sub={`${r.active.length} active clients`} />
                <StatTile icon={ShieldAlert} label="ARR at risk" value={`$${r.arrAtRisk.toLocaleString()}`} sub={`${r.atRisk.length} accounts`} tone="red" />
                <StatTile icon={CalendarClock} label="Due within 30d" value={r.dueSoon.length} sub="overdue + T-30" tone="amber" />
                <StatTile icon={Gauge} label="Avg health" value={`${r.avgHealth}`} sub="composite / 100" />
                <StatTile icon={TrendingUp} label="Expansion pipeline" value={`$${r.expansionValue.toLocaleString()}`} sub="flagged accounts" tone="cyan" />
              </div>

              <section className="scanlines overflow-hidden rounded-xl border border-line bg-scope/60 p-4 shadow-raised">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display flex items-center gap-2 text-sm font-bold text-text"><Radar className="h-4 w-4 text-phosphor" aria-hidden /> Renewal scope</h2>
                  <p className="label-caps text-[9px] text-muted">radius = time to renewal · color = health status</p>
                </div>
                <RadarScope clients={state.clients} onPick={openClient} selectedId={state.selectedId} />
                <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                  {Object.entries(STATUS_META).filter(([k]) => k !== 'churned').map(([k, m]) => (
                    <span key={k} className="label-caps flex items-center gap-1.5 text-[9px] text-muted">
                      <span className={`h-2 w-2 rounded-full ${m.dot}`} /> {m.label}
                    </span>
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-3 flex flex-wrap gap-1.5 border-b border-linesoft">
                  {TABS.map((t) => {
                    const Icon = t.icon;
                    const count = t.id === 'roster' ? state.clients.length
                      : t.id === 'timeline' ? r.active.length
                      : t.id === 'atrisk' ? r.atRisk.length
                      : state.clients.filter((c) => c.expansion.flagged && computedStatus(c) !== 'churned').length;
                    const active = tab === t.id;
                    return (
                      <button key={t.id} type="button" onClick={() => setTab(t.id)}
                        className={`label-caps -mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[11px] transition-colors ${active ? 'border-phosphor text-phosphor' : 'border-transparent text-muted hover:text-text'}`}>
                        <Icon className="h-3.5 w-3.5" aria-hidden /> {t.label} <span className="tabular text-dim">{count}</span>
                      </button>
                    );
                  })}
                </div>
                {tab === 'roster' && (
                  <RosterList clients={state.clients} onOpen={openClient} query={query} setQuery={setQuery}
                    statusFilter={statusFilter} setStatusFilter={setStatusFilter} searchRef={searchRef} />
                )}
                {tab === 'timeline' && <TimelineBoard clients={state.clients} onOpen={openClient} />}
                {tab === 'atrisk' && <AtRiskQueue clients={state.clients} onOpen={openClient} />}
                {tab === 'expansion' && <ExpansionList clients={state.clients} onOpen={openClient} />}
              </section>
            </div>
          )}
        </main>

        {/* ============ overlays ============ */}
        {copilotOpen && (
          <CopilotDrawer state={state} initialClientId={state.selectedId} onClose={() => setCopilotOpen(false)}
            onNotes={(v) => patch({ copilotNotes: v })} onToast={showToast} />
        )}

        <Modal open={helpOpen} onClose={closeHelp} title="How to run the radar" icon={BookOpen} wide>
          <HelpContent />
        </Modal>

        <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Clear the scope?" icon={AlertTriangle}>
          <p className="text-sm text-muted">This clears every client, checklist, and note from this browser. Download a JSON backup first if you want a fallback copy.</p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <IconBtn label="Cancel reset" onClick={() => setResetOpen(false)}>Cancel</IconBtn>
            <IconBtn icon={FileDown} label="Download JSON backup" onClick={() => downloadFile('renewal-radar-backup.json', 'application/json', JSON.stringify(state, null, 2))}>Backup first</IconBtn>
            <IconBtn icon={RotateCcw} label="Confirm clear" tone="red" onClick={doReset}>Clear it</IconBtn>
          </div>
        </Modal>

        {/* toast */}
        {toast && (
          <div className="toast-in fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-md border border-line bg-deep px-4 py-2.5 shadow-deck">
            <span className="text-sm text-text">{toast.msg}</span>
            {toast.undo && (
              <button type="button" onClick={() => { toast.undo(); setToast(null); }}
                className="label-caps flex items-center gap-1 rounded border border-phosphor/50 bg-phosphor/10 px-2 py-1 text-[11px] text-phosphor hover:bg-phosphor/20">
                <Undo2 className="h-3 w-3" aria-hidden /> Undo
              </button>
            )}
          </div>
        )}
      </div>

      {/* ============ print sheet ============ */}
      <div className="print-sheet">
        <h1>Renewal Radar — Portfolio</h1>
        <p>Exported {today()} · {r.active.length} active clients · ${r.totalARR.toLocaleString()} ARR under management · ${r.arrAtRisk.toLocaleString()} at risk</p>
        {state.clients.map((c) => (
          <div key={c.id} className="pc-card">
            <h2>{c.name} — {STATUS_META[computedStatus(c)].label}</h2>
            <p>ARR ${c.arr.toLocaleString()}/yr · Renewal {c.renewalDate} · Owner {c.owner || '—'}</p>
            <h3>T-90</h3>
            <ul>{c.plays.t90.map((i) => <li key={i.id}>[{i.done ? 'x' : ' '}] {i.text}</li>)}</ul>
            <h3>T-60</h3>
            <ul>{c.plays.t60.map((i) => <li key={i.id}>[{i.done ? 'x' : ' '}] {i.text}</li>)}</ul>
            <h3>T-30</h3>
            <ul>{c.plays.t30.map((i) => <li key={i.id}>[{i.done ? 'x' : ' '}] {i.text}</li>)}</ul>
            {c.savePlay.length > 0 && (<><h3>Save play</h3><ul>{c.savePlay.map((i) => <li key={i.id}>[{i.done ? 'x' : ' '}] {i.text}</li>)}</ul></>)}
            {c.notes && (<><h3>Notes</h3><p>{c.notes}</p></>)}
          </div>
        ))}
      </div>
    </div>
  );
}
