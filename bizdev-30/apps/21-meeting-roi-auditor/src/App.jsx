import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Timer, Gauge, Plus, Pencil, Trash2, Undo2, X, Copy, Download, Upload,
  HelpCircle, RotateCcw, Sparkles, FileText, FileJson, Table2, Search,
  ClipboardPaste, ChevronDown, Keyboard, AlertTriangle, ArrowUp,
  ArrowDown, CheckCircle2, Ban, Scissors, MessageSquareText, CircleDashed,
  Link2, Link2Off, Repeat, ClipboardList, Users, Building2, Megaphone,
  CalendarDays, ListChecks, Zap, ShieldAlert, Printer, UserPlus,
  DollarSign, Siren, Cable,
} from 'lucide-react';

/* ================= BizDev Console bus (postMessage v1) ================= */

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
    try { window.parent.postMessage({ bizdev: 'ready', v: 1, slug: '21-meeting-roi-auditor' }, '*'); } catch {}
    return () => window.removeEventListener('message', onMsg);
  }, []);
  return ctx;
}

/* Compact context header prepended to every Claude Copilot prompt when linked to the console. */
function consoleContextHeader(ctx) {
  if (!ctx) return '';
  const lines = [];
  if (ctx.profile?.company) lines.push(`- My company: ${ctx.profile.company}`);
  if (ctx.profile?.offer) lines.push(`- What I sell: ${ctx.profile.offer}`);
  if (ctx.profile?.icp) lines.push(`- My ICP: ${ctx.profile.icp}`);
  if (ctx.profile?.pricingAnchor) lines.push(`- Pricing anchor: ${ctx.profile.pricingAnchor}`);
  const nameVoice = [ctx.claude?.userName, ctx.claude?.voiceNotes].filter(Boolean).join(' — ');
  if (nameVoice) lines.push(`- My name / voice: ${nameVoice}`);
  const accounts = (ctx.roster?.accounts || []).filter((a) => a && a.name);
  if (accounts.length) {
    const list = accounts.slice(0, 12).map((a) => (a.segment ? `${a.name} (${a.segment})` : a.name)).join(', ');
    lines.push(`- Accounts on file: ${list}`);
  }
  if (!lines.length) return '';
  return `## Shared context (from BizDev Console)\n${lines.join('\n')}\n\n`;
}

/* ================= constants ================= */

const LS_KEY = 'bizdev:21-meeting-roi-auditor:v1';
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const WORK_WEEKS = 48; // annualizing assumption — stated honestly in the UI, not hidden in the math

const CADENCE = {
  daily:    { label: 'Daily',    short: '5×/wk',  perWeek: 5 },
  weekly:   { label: 'Weekly',   short: '1×/wk',  perWeek: 1 },
  biweekly: { label: 'Biweekly', short: '1×/2wk', perWeek: 0.5 },
  monthly:  { label: 'Monthly',  short: '1×/mo',  perWeek: 12 / 52 },
  oneTime:  { label: 'One-time', short: 'once',   perWeek: 0 },
};

const MEETING_TYPES = {
  standup:    { label: 'Standup',       Icon: Repeat },
  status:     { label: 'Status sync',   Icon: ClipboardList },
  oneOnOne:   { label: '1:1',           Icon: Users },
  client:     { label: 'Client call',   Icon: Building2 },
  allHands:   { label: 'All-hands',     Icon: Megaphone },
  planning:   { label: 'Planning',      Icon: CalendarDays },
  review:     { label: 'Review',        Icon: ListChecks },
  brainstorm: { label: 'Brainstorm',    Icon: Zap },
  other:      { label: 'Other',         Icon: CircleDashed },
};

const LINKAGE = {
  none:     { label: 'No pipeline link',           short: 'no link',   color: '#ff4a3d', Icon: Link2Off },
  indirect: { label: 'Indirect — enablement/ops',  short: 'indirect',  color: '#ffb020', Icon: Link2 },
  direct:   { label: 'Direct — active deal/account', short: 'direct',  color: '#35c47a', Icon: Link2 },
};

const VERDICTS = {
  unreviewed: { label: 'Unreviewed', short: 'TBD',    color: '#8a929a', Icon: CircleDashed },
  keep:       { label: 'Keep',       short: 'KEEP',   color: '#35c47a', Icon: CheckCircle2 },
  shrink:     { label: 'Shrink',     short: 'SHRINK', color: '#ffb020', Icon: Scissors },
  kill:       { label: 'Kill',       short: 'KILL',   color: '#ff4a3d', Icon: Ban },
  async:      { label: 'Make async', short: 'ASYNC',  color: '#4fb3d8', Icon: MessageSquareText },
};
const VERDICT_ORDER = ['unreviewed', 'keep', 'shrink', 'kill', 'async'];

/* ================= formatting & io helpers ================= */

const fmtMoney = (n) => (n == null || !isFinite(n)) ? '—' : '$' + Math.round(n).toLocaleString('en-US');
const fmtHours = (n) => {
  if (n == null || !isFinite(n)) return '—';
  const v = Math.round(n * 100) / 100;
  const s = v < 1 && v > -1 && v !== 0 ? v.toFixed(2) : v.toFixed(1);
  return s.replace(/\.0$/, '') + 'h';
};
function copyText(text) {
  return new Promise((res) => {
    const fallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta); res(true);
      } catch { res(false); }
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => res(true), fallback);
    else fallback();
  });
}

function download(name, text, mime = 'application/octet-stream') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: mime }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

/* ================= state shape & normalization ================= */

function blankAttendee(a) {
  return {
    id: typeof a?.id === 'string' ? a.id : uid(),
    name: String(a?.name ?? ''),
    rate: Math.max(0, Number(a?.rate) || 0),
  };
}

function normMeeting(m, i, defaultRate) {
  if (!m || typeof m !== 'object') m = {};
  const type = MEETING_TYPES[m.type] ? m.type : 'other';
  const cadence = CADENCE[m.cadence] ? m.cadence : 'weekly';
  const hours = Math.max(0.05, Number(m.hours) || 0.5);
  const attendees = Array.isArray(m.attendees) && m.attendees.length
    ? m.attendees.map(blankAttendee)
    : [blankAttendee({ name: 'You', rate: defaultRate })];
  const verdict = VERDICTS[m.verdict] ? m.verdict : 'unreviewed';
  let shrinkToHours = Math.max(0, Number(m.shrinkToHours) || +(hours / 2).toFixed(2));
  if (shrinkToHours > hours) shrinkToHours = +(hours / 2).toFixed(2);
  return {
    id: typeof m.id === 'string' ? m.id : uid(),
    code: typeof m.code === 'string' && m.code ? m.code : `MTG-${String(i + 1).padStart(3, '0')}`,
    title: String(m.title ?? 'Untitled meeting'),
    type,
    cadence,
    hours,
    attendees,
    linkage: LINKAGE[m.linkage] ? m.linkage : 'none',
    linkedNote: String(m.linkedNote ?? ''),
    verdict,
    shrinkToHours: Math.round(shrinkToHours * 100) / 100,
    notes: String(m.notes ?? ''),
  };
}

function normPolicyItem(p) {
  if (!p || typeof p !== 'object') p = {};
  return {
    id: typeof p.id === 'string' ? p.id : uid(),
    title: String(p.title ?? 'Untitled rule'),
    body: String(p.body ?? ''),
    active: p.active !== false,
  };
}

function normalize(raw) {
  let d = raw;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { d = null; } }
  if (!d || typeof d !== 'object') d = {};
  const defaultRate = Math.max(1, Number(d.defaultRate) || 95);
  return {
    version: 1,
    seenGuide: !!d.seenGuide,
    defaultRate,
    meetings: Array.isArray(d.meetings) ? d.meetings.map((m, i) => normMeeting(m, i, defaultRate)) : [],
    policy: Array.isArray(d.policy) ? d.policy.filter((x) => x && typeof x === 'object').map(normPolicyItem) : [],
    copilotNotes: String(d.copilotNotes ?? ''),
  };
}

/* ================= cost engine ================= */

function meetingCost(m) {
  const rateSum = m.attendees.reduce((s, a) => s + a.rate, 0);
  const occurrenceCost = rateSum * m.hours;
  const weeklyOccurrences = CADENCE[m.cadence].perWeek;
  const weeklyCost = occurrenceCost * weeklyOccurrences;
  const personHoursPerOcc = m.hours * m.attendees.length;
  const weeklyPersonHours = personHoursPerOcc * weeklyOccurrences;
  const annualCost = weeklyCost * WORK_WEEKS;

  let reclaimFraction = 0;
  if (m.verdict === 'kill' || m.verdict === 'async') reclaimFraction = 1;
  else if (m.verdict === 'shrink' && m.hours > 0) {
    reclaimFraction = Math.max(0, Math.min(1, (m.hours - m.shrinkToHours) / m.hours));
  }
  const reclaimedWeeklyHours = weeklyPersonHours * reclaimFraction;
  const reclaimedWeeklyCost = weeklyCost * reclaimFraction;

  return {
    rateSum, occurrenceCost, weeklyOccurrences, weeklyCost, personHoursPerOcc,
    weeklyPersonHours, annualCost, reclaimFraction, reclaimedWeeklyHours,
    reclaimedWeeklyCost, reclaimedAnnualCost: reclaimedWeeklyCost * WORK_WEEKS,
  };
}

function buildRollup(meetings, costMap) {
  const byVerdict = {};
  for (const k of VERDICT_ORDER) byVerdict[k] = { count: 0, hours: 0, cost: 0 };
  let weeklyHours = 0, weeklyCost = 0, reclaimedHours = 0, reclaimedCost = 0, noLinkHours = 0, noLinkCost = 0, unreviewedCount = 0;
  for (const m of meetings) {
    const c = costMap[m.id];
    weeklyHours += c.weeklyPersonHours;
    weeklyCost += c.weeklyCost;
    reclaimedHours += c.reclaimedWeeklyHours;
    reclaimedCost += c.reclaimedWeeklyCost;
    if (m.linkage === 'none') { noLinkHours += c.weeklyPersonHours; noLinkCost += c.weeklyCost; }
    if (m.verdict === 'unreviewed') unreviewedCount++;
    byVerdict[m.verdict].count++;
    byVerdict[m.verdict].hours += c.weeklyPersonHours;
    byVerdict[m.verdict].cost += c.weeklyCost;
  }
  return {
    weeklyHours, weeklyCost, reclaimedHours, reclaimedCost,
    reclaimedAnnual: reclaimedCost * WORK_WEEKS,
    noLinkHours, noLinkCost, unreviewedCount, byVerdict,
    meetingCount: meetings.length,
  };
}

/* ================= demo scenario ================= */

const DEMO = normalize({
  seenGuide: true,
  defaultRate: 95,
  meetings: [
    {
      code: 'MTG-001', title: 'AE Daily Pipeline Standup', type: 'standup', cadence: 'daily', hours: 0.25,
      attendees: [
        { name: 'Priya Shah (AE)', rate: 95 }, { name: 'Marcus Webb (AE)', rate: 95 },
        { name: 'Jo Alvarez (AE)', rate: 90 }, { name: 'Dana Kruk (SDR)', rate: 65 },
        { name: 'Sam Ito (SDR)', rate: 65 }, { name: 'Rae Chen (Sales Mgr)', rate: 150 },
      ],
      linkage: 'indirect', linkedNote: 'Surfaces stuck deals daily — no single deal owns the meeting itself.',
      verdict: 'shrink', shrinkToHours: 0.17,
      notes: 'Useful signal but it drifts long. Cutting to a strict 10-minute stand, no seats in the room.',
    },
    {
      code: 'MTG-002', title: 'Weekly Forecast Review', type: 'review', cadence: 'weekly', hours: 1,
      attendees: [
        { name: 'Alicia Ford (VP Sales)', rate: 190 }, { name: 'Priya Shah (AE)', rate: 95 },
        { name: 'Marcus Webb (AE)', rate: 95 }, { name: 'Jo Alvarez (AE)', rate: 90 },
        { name: 'Nina Osei (RevOps)', rate: 110 },
      ],
      linkage: 'direct', linkedNote: 'Reviews every deal over $25k in active pipeline — $2.4M this quarter.',
      verdict: 'keep', notes: "This is the one meeting that actually changes what reps do Monday morning. Keep at full length.",
    },
    {
      code: 'MTG-003', title: 'Client QBR — Meridian Logistics', type: 'client', cadence: 'monthly', hours: 1.5,
      attendees: [
        { name: 'Marcus Webb (AE)', rate: 95 }, { name: 'Toni Reyes (CSM)', rate: 85 },
        { name: 'Ben Okafor (Solutions Eng)', rate: 130 },
      ],
      linkage: 'direct', linkedNote: '$180k renewal due June, $60k expansion in active discovery.',
      verdict: 'keep', notes: 'The executive sponsor only shows up here. Protect it.',
    },
    {
      code: 'MTG-004', title: 'Company All-Hands', type: 'allHands', cadence: 'monthly', hours: 1,
      attendees: Array.from({ length: 40 }, (_, i) => ({ name: `Employee ${i + 1}`, rate: 90 })),
      linkage: 'none', linkedNote: '',
      verdict: 'keep',
      notes: "No deal ties to this and that's fine — it's the alignment/culture meeting, kept deliberately. Compare this to MTG-005 below: same 'no pipeline link' flag, opposite verdict, because that one earns nothing back.",
    },
    {
      code: 'MTG-005', title: 'Cross-team Status Sync (Eng + Sales)', type: 'status', cadence: 'weekly', hours: 0.5,
      attendees: [
        { name: 'Rae Chen (Sales Mgr)', rate: 150 }, { name: 'Priya Shah (AE)', rate: 95 },
        { name: 'Marcus Webb (AE)', rate: 95 }, { name: 'Leo Park (Eng Lead)', rate: 145 },
        { name: 'Yuki Tanaka (PM)', rate: 120 }, { name: 'Dana Kruk (SDR)', rate: 65 },
        { name: 'Sam Ito (SDR)', rate: 65 }, { name: 'Nina Osei (RevOps)', rate: 110 },
      ],
      linkage: 'none', linkedNote: '',
      verdict: 'kill',
      notes: 'Redundant with the #pipeline Slack channel and the Linear roadmap board. Zero decisions made across the last 6 occurrences.',
    },
    {
      code: 'MTG-006', title: '1:1 — Dana / Rae (Manager Sync)', type: 'oneOnOne', cadence: 'weekly', hours: 0.5,
      attendees: [{ name: 'Rae Chen (Sales Mgr)', rate: 150 }, { name: 'Dana Kruk (SDR)', rate: 65 }],
      linkage: 'indirect', linkedNote: "Coaching against Dana's live pipeline and call recordings.",
      verdict: 'keep', notes: "Coaching cadence correlates directly with Dana's booked-meeting rate. Keep.",
    },
    {
      code: 'MTG-007', title: 'New-Logo Messaging Brainstorm', type: 'brainstorm', cadence: 'biweekly', hours: 1,
      attendees: [
        { name: 'Alicia Ford (VP Sales)', rate: 190 }, { name: 'Priya Shah (AE)', rate: 95 },
        { name: 'Marcus Webb (AE)', rate: 95 }, { name: 'Jo Alvarez (AE)', rate: 90 },
        { name: 'Nina Osei (RevOps)', rate: 110 },
      ],
      linkage: 'indirect', linkedNote: 'Feeds cold-email subject lines and call talk tracks.',
      verdict: 'async',
      notes: 'The same five ideas resurface every time. Moving to a running doc with a Friday-afternoon comment window instead.',
    },
    {
      code: 'MTG-008', title: 'Vendor Renewal Check-in — Outreach Tool Inc', type: 'other', cadence: 'monthly', hours: 0.5,
      attendees: [{ name: 'Nina Osei (RevOps)', rate: 110 }, { name: 'Rae Chen (Sales Mgr)', rate: 150 }],
      linkage: 'none', linkedNote: '',
      verdict: 'shrink', shrinkToHours: 0.25,
      notes: 'Vendor pads the agenda every time. Cutting to 15 minutes; anything bigger goes to email first.',
    },
    {
      code: 'MTG-009', title: 'Deal Desk Approval Review', type: 'review', cadence: 'weekly', hours: 0.75,
      attendees: [
        { name: 'Alicia Ford (VP Sales)', rate: 190 }, { name: 'Nina Osei (RevOps)', rate: 110 },
        { name: 'Priya Shah (AE)', rate: 95 }, { name: 'Marcus Webb (AE)', rate: 95 },
        { name: 'Ben Okafor (Solutions Eng)', rate: 130 }, { name: 'Owen Park (Legal)', rate: 170 },
      ],
      linkage: 'direct', linkedNote: 'Every deal over $50k routes through this review before it ships.',
      verdict: 'keep', notes: "Expensive on paper, but it's the gate in front of every enterprise contract. Keep.",
    },
    {
      code: 'MTG-010', title: 'Culture Committee Planning', type: 'planning', cadence: 'monthly', hours: 1,
      attendees: [
        { name: 'Toni Reyes (CSM)', rate: 85 }, { name: 'Yuki Tanaka (PM)', rate: 120 },
        { name: 'Sam Ito (SDR)', rate: 65 }, { name: 'Leo Park (Eng Lead)', rate: 145 },
      ],
      linkage: 'none', linkedNote: '',
      verdict: 'unreviewed', notes: "New this quarter — sitting in the queue until there's 6 weeks of data to judge it on.",
    },
    {
      code: 'MTG-011', title: 'Q3 Sales Offsite Planning', type: 'planning', cadence: 'oneTime', hours: 3,
      attendees: [
        { name: 'Alicia Ford (VP Sales)', rate: 190 }, { name: 'Rae Chen (Sales Mgr)', rate: 150 },
        { name: 'Nina Osei (RevOps)', rate: 110 },
      ],
      linkage: 'none', linkedNote: '',
      verdict: 'unreviewed', notes: 'One-off — tracked for cost visibility, excluded from the weekly recurring math.',
    },
  ],
  policy: [
    { title: '25/50, not 30/60', body: 'Default meeting length is 25 or 50 minutes, never the full block. The calendar buffer is the point.', active: true },
    { title: 'No pipeline, no recurrence', body: 'Any recurring meeting without a named deal, account, or delivery outcome gets killed or made async at the next audit.', active: true },
    { title: 'Status is async-first', body: 'Daily and weekly status updates post in the pipeline channel by 9am. We meet only to unblock, never to report.', active: true },
    { title: 'Six-week expiry', body: 'Every new recurring invite auto-expires after 6 weeks unless the organizer re-justifies it in this audit.', active: true },
    { title: 'Agenda or it doesn’t happen', body: 'Meetings over 5 attendees require a written agenda sent 24 hours ahead, or the invite gets declined.', active: true },
    { title: 'No-meeting Fridays', body: 'Company-wide meeting-free Fridays.', active: false },
  ],
  copilotNotes: '',
});

/* ================= markdown / csv serializers ================= */

function meetingMd(m) {
  const c = meetingCost(m);
  const t = MEETING_TYPES[m.type], cad = CADENCE[m.cadence], v = VERDICTS[m.verdict], link = LINKAGE[m.linkage];
  return [
    `### ${m.code} — ${m.title}`,
    ``,
    `- **Type:** ${t.label} · **Cadence:** ${cad.label} · **Duration:** ${fmtHours(m.hours)} · **Verdict:** ${v.label}`,
    `- **Attendees (${m.attendees.length}):** ${m.attendees.map((a) => `${a.name || 'Unnamed'} ($${a.rate}/hr)`).join(', ') || '—'}`,
    `- **Pipeline link:** ${link.label}${m.linkedNote ? ` — ${m.linkedNote}` : ''}`,
    `- **Cost:** $${Math.round(c.occurrenceCost).toLocaleString()}/occurrence · $${Math.round(c.weeklyCost).toLocaleString()}/week · $${Math.round(c.annualCost).toLocaleString()}/yr (≈${WORK_WEEKS} work-weeks)`,
    m.verdict === 'shrink' ? `- **Shrink target:** ${fmtHours(m.shrinkToHours)} (reclaims ${fmtHours(c.reclaimedWeeklyHours)}/wk, $${Math.round(c.reclaimedWeeklyCost).toLocaleString()}/wk)` : null,
    (m.verdict === 'kill' || m.verdict === 'async') ? `- **Reclaimed:** ${fmtHours(c.reclaimedWeeklyHours)}/wk, $${Math.round(c.reclaimedWeeklyCost).toLocaleString()}/wk` : null,
    m.notes ? `- **Notes:** ${m.notes}` : null,
  ].filter(Boolean).join('\n');
}

function policyText(state) {
  const active = state.policy.filter((p) => p.active);
  return active.length
    ? active.map((p) => `- **${p.title}** — ${p.body}`).join('\n')
    : '_No active policy rules yet._';
}

function auditMd(state, costMap) {
  const r = buildRollup(state.meetings, costMap);
  return [
    `# Meeting ROI Audit`,
    ``,
    `_${state.meetings.length} meetings tracked · exported ${new Date().toISOString().slice(0, 10)}_`,
    ``,
    `## Weekly scoreboard`,
    ``,
    `| Metric | Value |`,
    `|---|---|`,
    `| Person-hours in meetings / week | ${fmtHours(r.weeklyHours)} |`,
    `| Loaded cost / week | ${fmtMoney(r.weeklyCost)} |`,
    `| Reclaimed hours / week | ${fmtHours(r.reclaimedHours)} |`,
    `| Reclaimed cost / week | ${fmtMoney(r.reclaimedCost)} |`,
    `| Reclaimed cost / year (≈${WORK_WEEKS} work-weeks) | ${fmtMoney(r.reclaimedAnnual)} |`,
    `| Hours/week with no pipeline link | ${fmtHours(r.noLinkHours)} (${fmtMoney(r.noLinkCost)}/wk) |`,
    `| Still unreviewed | ${r.unreviewedCount} meeting(s) |`,
    ``,
    `## Verdict breakdown`,
    ``,
    `| Verdict | Count | Hours/wk | Cost/wk |`,
    `|---|---|---|---|`,
    ...VERDICT_ORDER.map((k) => `| ${VERDICTS[k].label} | ${r.byVerdict[k].count} | ${fmtHours(r.byVerdict[k].hours)} | ${fmtMoney(r.byVerdict[k].cost)} |`),
    ``,
    `## Meeting log`,
    ``,
    state.meetings.length ? state.meetings.map(meetingMd).join('\n\n---\n\n') : '_No meetings logged yet._',
    ``,
    `## Active meeting policy`,
    ``,
    policyText(state),
  ].join('\n');
}

function meetingsCsv(state) {
  const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const rows = [[
    'code', 'title', 'type', 'cadence', 'hours', 'attendees', 'rate_sum_per_hr', 'linkage', 'linked_note',
    'verdict', 'shrink_to_hours', 'weekly_person_hours', 'weekly_cost', 'annual_cost',
    'reclaimed_weekly_hours', 'reclaimed_weekly_cost', 'notes',
  ].join(',')];
  for (const m of state.meetings) {
    const c = meetingCost(m);
    rows.push([
      esc(m.code), esc(m.title), m.type, m.cadence, m.hours, m.attendees.length, c.rateSum,
      m.linkage, esc(m.linkedNote), m.verdict, m.shrinkToHours,
      c.weeklyPersonHours.toFixed(2), c.weeklyCost.toFixed(2), c.annualCost.toFixed(2),
      c.reclaimedWeeklyHours.toFixed(2), c.reclaimedWeeklyCost.toFixed(2), esc(m.notes),
    ].join(','));
  }
  return rows.join('\n');
}

/* ================= copilot prompts ================= */

function promptAsyncReplacement(m) {
  const c = meetingCost(m);
  return [
    `You are an operations lead who has killed hundreds of low-value recurring meetings and knows how to replace them without losing the signal they carried.`,
    ``,
    `## The meeting being replaced`,
    ``,
    meetingMd(m),
    ``,
    `## Your task`,
    `Design the async replacement for this meeting. Give me:`,
    `1. **Format** — the exact artifact (thread, doc, dashboard, short recorded update, etc.) and where it should live.`,
    `2. **Cadence & owner** — who posts, how often, and by what time of day.`,
    `3. **Template** — a fill-in-the-blank structure for each update: field labels, plus one example filled in using this meeting's context.`,
    `4. **Escalation trigger** — the exact condition that pulls this back into a live meeting, so real signal doesn't quietly get lost.`,
    `5. **Rollout message** — 3-4 sentences I can post to the team announcing the change, framed around what they get back, not what they lose.`,
    ``,
    `This meeting currently costs ${fmtMoney(c.weeklyCost)}/week (${fmtHours(c.weeklyPersonHours)} of people's time). Make the replacement worth less than 10% of that.`,
  ].join('\n');
}

function promptDecline(m) {
  const v = VERDICTS[m.verdict];
  return [
    `You are a sharp, kind operator who declines or renegotiates meetings without burning relationships.`,
    ``,
    `## The meeting`,
    ``,
    meetingMd(m),
    ``,
    `## Your task`,
    `Write a short, warm, direct message I can send to the organizer or attendees about this meeting. My verdict on it: **${v.label}**.`,
    `- If **Kill**: a decline-with-grace message that ends the recurrence, states why using the cost data above, and offers the async alternative.`,
    `- If **Shrink**: a message proposing the new shorter length and why, without sounding like a complaint.`,
    `- If **Make async**: a message announcing the switch and what (if anything) stays live.`,
    `- If **Keep** or **Unreviewed**: instead write one sharp clarifying question that would help me finish auditing this meeting — its true pipeline link, or who actually needs to be in the room.`,
    ``,
    `Keep it under 120 words, first person, no corporate throat-clearing. End with one clear next step.`,
  ].join('\n');
}

function promptPolicy(state, costMap) {
  const r = buildRollup(state.meetings, costMap);
  return [
    `You are a chief of staff who writes meeting policies people actually follow because they're specific, not aspirational.`,
    ``,
    `## My current audit`,
    `- ${state.meetings.length} meetings tracked, ${fmtHours(r.weeklyHours)}/week in loaded people-time, ${fmtMoney(r.weeklyCost)}/week.`,
    `- ${fmtHours(r.noLinkHours)}/week (${fmtMoney(r.noLinkCost)}/wk) has no pipeline link at all.`,
    `- ${r.unreviewedCount} meeting(s) still unreviewed.`,
    `- Already reclaiming ${fmtHours(r.reclaimedHours)}/week (${fmtMoney(r.reclaimedCost)}/wk) from verdicts stamped so far.`,
    ``,
    `## My draft policy rules`,
    ``,
    state.policy.length
      ? state.policy.map((p) => `- [${p.active ? 'active' : 'retired'}] **${p.title}** — ${p.body}`).join('\n')
      : '_No rules drafted yet — propose a full starter set._',
    ``,
    `## Full meeting log for context`,
    ``,
    state.meetings.length ? state.meetings.map(meetingMd).join('\n\n---\n\n') : '_No meetings logged yet._',
    ``,
    `## Your task`,
    `Write "Meeting Policy v1" ready to publish to the team:`,
    `1. **Principles** — 2-3 sentences on the philosophy: meetings must earn their cost.`,
    `2. **Rules** — numbered, each imperative and specific (a length cap, an attendee cap, a pipeline-link requirement, an expiry rule, an async-first rule). Cite my numbers where they justify a rule.`,
    `3. **Exceptions** — what's explicitly allowed to break the rules, and why.`,
    `4. **Enforcement** — how a violation actually gets caught and corrected. Be concrete, not "we'll self-police."`,
    `Keep the whole thing under one page.`,
  ].join('\n');
}

function promptWeeklyAudit(state, costMap) {
  const r = buildRollup(state.meetings, costMap);
  return [
    `You are a ruthless-but-fair operations auditor. You've reviewed hundreds of meeting logs and you're good at spotting cuts the people inside the calendar are too close to see.`,
    ``,
    `## My full meeting log and current verdicts`,
    ``,
    state.meetings.length ? state.meetings.map(meetingMd).join('\n\n---\n\n') : '_No meetings logged yet — say so and stop._',
    ``,
    `## Current scoreboard`,
    `- ${fmtHours(r.weeklyHours)}/week in meetings, ${fmtMoney(r.weeklyCost)}/week loaded cost.`,
    `- Already reclaiming ${fmtHours(r.reclaimedHours)}/week (${fmtMoney(r.reclaimedCost)}/wk) via my Keep/Shrink/Kill/Async verdicts.`,
    `- ${fmtHours(r.noLinkHours)}/week has no pipeline link.`,
    ``,
    `## Your task`,
    `1. **Second-guess my Keep verdicts** — which ones would you challenge, and why?`,
    `2. **Find hidden shrink candidates** — meetings I marked Keep that could survive at half the length.`,
    `3. **Flag consolidation** — any meetings covering overlapping ground that could merge into one.`,
    `4. **Rank the next 3 moves by dollar impact**, with the specific weekly $ each one reclaims.`,
    `Be blunt. I would rather be told I'm wrong than be comfortable.`,
  ].join('\n');
}

/* ================= small building blocks ================= */

function Btn({ children, onClick, kind = 'ghost', title, ariaLabel, className = '', disabled }) {
  const kinds = {
    primary: 'bg-ink text-ground-deep hover:bg-white shadow-[2px_2px_0_rgba(0,0,0,0.4)] font-bold',
    accent: 'bg-amber text-ground-deep hover:brightness-95 shadow-[2px_2px_0_rgba(0,0,0,0.4)] font-bold',
    ghost: 'bg-panel/70 text-ink border border-line hover:border-steel hover:bg-panel',
    danger: 'bg-panel/70 text-alarm border border-alarm/40 hover:bg-alarm/10',
  };
  return (
    <button type="button" onClick={onClick} title={title} aria-label={ariaLabel} disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[13px] font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${kinds[kind]} ${className}`}>
      {children}
    </button>
  );
}

function Tag({ children, color = '#8a929a', Icon }) {
  return (
    <span className="panel-label inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-0.5 text-[10px] font-bold"
      style={{ borderColor: color + '55', color, background: color + '14' }}>
      {Icon && <Icon className="h-3 w-3" aria-hidden />}{children}
    </span>
  );
}

/* signature hero: stopwatch dial reading live reclaimed hours */
function StopwatchHero({ reclaimedHours, reclaimedCost, weeklyHours }) {
  const cx = 100, cy = 100, rTick = 84, rProgress = 82;
  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const angle = (i * 6 - 90) * (Math.PI / 180);
    const major = i % 5 === 0;
    const len = major ? 10 : 4;
    const x1 = cx + Math.cos(angle) * rTick, y1 = cy + Math.sin(angle) * rTick;
    const x2 = cx + Math.cos(angle) * (rTick - len), y2 = cy + Math.sin(angle) * (rTick - len);
    ticks.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={major ? '#c9cdd2' : '#4a4e54'} strokeWidth={major ? 2 : 1} />);
  }
  const pct = weeklyHours > 0 ? Math.min(1, reclaimedHours / weeklyHours) : 0;
  const circumference = 2 * Math.PI * rProgress;
  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[230px]" role="img"
      aria-label={`Stopwatch dial: ${fmtHours(reclaimedHours)} reclaimed per week, ${fmtMoney(reclaimedCost)} per week`}>
      <defs>
        <radialGradient id="bezel" cx="35%" cy="28%" r="85%">
          <stop offset="0%" stopColor="#3c4046" />
          <stop offset="65%" stopColor="#1c1f22" />
          <stop offset="100%" stopColor="#0d0e10" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={98} fill="url(#bezel)" stroke="#050506" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={90} fill="#15171a" stroke="#3a3e44" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={rProgress} fill="none" stroke="#2a2d31" strokeWidth="7" />
      <circle cx={cx} cy={cy} r={rProgress} fill="none" stroke="#ff4a3d" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={circumference * (1 - pct)}
        transform={`rotate(-90 ${cx} ${cy})`} />
      {ticks}
      <rect x={cx - 7} y={1} width="14" height="9" rx="2" fill="#3a3e44" stroke="#050506" strokeWidth="1" />
      <g className="sweep-hand" aria-hidden>
        <line x1={cx} y1={cy} x2={cx} y2={cy - 62} stroke="#ff4a3d" strokeWidth="2" strokeLinecap="round" />
      </g>
      <circle cx={cx} cy={cy} r="4" fill="#ff4a3d" stroke="#0d0e10" strokeWidth="1" />
      <text x={cx} y={cy - 10} textAnchor="middle" className="tabular glow-alarm" fontSize="28" fontWeight="700" fill="#eef0f1">{fmtHours(reclaimedHours)}</text>
      <text x={cx} y={cy + 8} textAnchor="middle" className="panel-label" fontSize="7.5" fill="#9aa1a8" letterSpacing="2">RECLAIMED / WK</text>
      <text x={cx} y={cy + 24} textAnchor="middle" className="tabular glow-keep" fontSize="11" fontWeight="600" fill="#35c47a">{fmtMoney(reclaimedCost)}/wk</text>
    </svg>
  );
}

/* verdict distribution — horizontal bars with emphasized values */
function VerdictChart({ rollupData }) {
  const order = ['keep', 'shrink', 'kill', 'async', 'unreviewed'];
  const max = Math.max(1, ...order.map((k) => rollupData.byVerdict[k].hours));
  const W = 300, H = order.length * 28 + 8, L = 60, R = 58;
  const plotW = W - L - R;
  const x = (v) => (v / max) * plotW;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Weekly person-hours by verdict">
      {order.map((k, i) => {
        const v = VERDICTS[k], d = rollupData.byVerdict[k];
        const y = 12 + i * 28;
        return (
          <g key={k}>
            <line x1={L} x2={W - R} y1={y - 8} y2={y - 8} stroke="#2a2d31" strokeWidth="1" />
            <text x={L - 8} y={y + 5} textAnchor="end" className="panel-label" fontSize="9" fontWeight="700" fill={v.color}>{v.short}</text>
            <rect x={L} y={y - 6} width={Math.max(2, x(d.hours))} height={12} rx={2} fill={v.color} opacity="0.88" />
            <text x={L + x(d.hours) + 6} y={y + 4} className="tabular" fontSize="10" fill="#c9cdd2">{fmtHours(d.hours)} · {d.count}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ================= meeting editor drawer ================= */

const emptyDraft = (defaultRate) => normMeeting({ title: '', attendees: [{ name: 'You', rate: defaultRate }] }, 998, defaultRate);

function AttendeeRow({ a, onChange, onRemove, removable }) {
  return (
    <div className="flex items-center gap-1.5">
      <input value={a.name} onChange={(e) => onChange({ ...a, name: e.target.value })} placeholder="Name or role"
        className="min-w-0 flex-1 rounded-sm border border-line bg-panel-soft px-2 py-1.5 text-[13px] text-ink placeholder:text-faint" />
      <div className="flex items-center gap-1 rounded-sm border border-line bg-panel-soft px-2 py-1.5">
        <DollarSign className="h-3.5 w-3.5 text-faint" aria-hidden />
        <input type="number" min="0" value={a.rate} aria-label={`Loaded hourly rate for ${a.name || 'attendee'}`}
          onChange={(e) => onChange({ ...a, rate: Math.max(0, Number(e.target.value) || 0) })}
          className="tabular w-16 bg-transparent text-[13px] text-ink outline-none" />
        <span className="text-[11px] text-faint">/hr</span>
      </div>
      <button type="button" onClick={onRemove} disabled={!removable} aria-label={`Remove ${a.name || 'attendee'}`}
        className="rounded-sm border border-line bg-panel-soft p-1.5 text-faint hover:border-alarm/50 hover:text-alarm disabled:cursor-not-allowed disabled:opacity-30">
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

function EditorDrawer({ draft, setDraft, onSave, onClose }) {
  const rateSum = draft.attendees.reduce((s, a) => s + a.rate, 0);
  return (
    <div role="dialog" aria-modal="true" aria-label={draft.id ? 'Edit meeting' : 'New meeting'}
      className="fixed inset-0 z-40 flex justify-end bg-black/55" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pop-in gauge-card h-full w-full max-w-xl overflow-y-auto border-l-4 border-amber p-5">
        <div className="flex items-center justify-between">
          <h2 className="panel-label text-sm font-bold text-ink">{draft.id ? `Edit ${draft.code}` : 'Log a new meeting'}</h2>
          <Btn kind="ghost" onClick={onClose} ariaLabel="Close editor"><X className="h-4 w-4" aria-hidden /></Btn>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-steel">Meeting title
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="e.g. Weekly Forecast Review"
              className="mt-1 w-full rounded-sm border border-line bg-panel-soft px-2 py-2 text-[15px] font-semibold text-ink" />
          </label>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-steel">Type
              <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                className="mt-1 w-full rounded-sm border border-line bg-panel-soft px-2 py-1.5 text-[13px] text-ink">
                {Object.entries(MEETING_TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
              </select>
            </label>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-steel">Cadence
              <select value={draft.cadence} onChange={(e) => setDraft({ ...draft, cadence: e.target.value })}
                className="mt-1 w-full rounded-sm border border-line bg-panel-soft px-2 py-1.5 text-[13px] text-ink">
                {Object.entries(CADENCE).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
              </select>
            </label>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-steel">Duration (hrs)
              <input type="number" min="0.05" step="0.05" value={draft.hours}
                onChange={(e) => setDraft({ ...draft, hours: Math.max(0.05, Number(e.target.value) || 0.05) })}
                className="tabular mt-1 w-full rounded-sm border border-line bg-panel-soft px-2 py-1.5 text-[13px] text-ink" />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-steel">Pipeline link
              <select value={draft.linkage} onChange={(e) => setDraft({ ...draft, linkage: e.target.value })}
                className="mt-1 w-full rounded-sm border border-line bg-panel-soft px-2 py-1.5 text-[13px] text-ink">
                {Object.entries(LINKAGE).map(([k, l]) => <option key={k} value={k}>{l.label}</option>)}
              </select>
            </label>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-steel">Linked deal / account (optional)
              <input value={draft.linkedNote} onChange={(e) => setDraft({ ...draft, linkedNote: e.target.value })}
                placeholder="Which deal or outcome does this serve?"
                className="mt-1 w-full rounded-sm border border-line bg-panel-soft px-2 py-1.5 text-[13px] text-ink" />
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-steel">Attendees &amp; loaded rates</span>
              <span className="tabular text-[11px] text-steel">${rateSum}/hr combined</span>
            </div>
            <div className="mt-1.5 space-y-1.5">
              {draft.attendees.map((a, i) => (
                <AttendeeRow key={a.id} a={a} removable={draft.attendees.length > 1}
                  onChange={(next) => setDraft({ ...draft, attendees: draft.attendees.map((x, j) => (j === i ? next : x)) })}
                  onRemove={() => setDraft({ ...draft, attendees: draft.attendees.filter((_, j) => j !== i) })} />
              ))}
            </div>
            <button type="button"
              onClick={() => setDraft({ ...draft, attendees: [...draft.attendees, blankAttendee({ rate: 95 })] })}
              className="mt-1.5 inline-flex items-center gap-1.5 rounded-sm border border-dashed border-line px-2 py-1 text-[12px] text-steel hover:border-steel hover:text-ink">
              <UserPlus className="h-3.5 w-3.5" aria-hidden /> Add attendee
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-steel">Verdict
              <select value={draft.verdict} onChange={(e) => setDraft({ ...draft, verdict: e.target.value })}
                className="mt-1 w-full rounded-sm border border-line bg-panel-soft px-2 py-1.5 text-[13px] text-ink">
                {VERDICT_ORDER.map((k) => <option key={k} value={k}>{VERDICTS[k].label}</option>)}
              </select>
            </label>
            {draft.verdict === 'shrink' && (
              <label className="block text-[11px] font-bold uppercase tracking-wider text-steel">Shrink to (hrs)
                <input type="number" min="0" max={draft.hours} step="0.05" value={draft.shrinkToHours}
                  onChange={(e) => setDraft({ ...draft, shrinkToHours: Math.max(0, Math.min(draft.hours, Number(e.target.value) || 0)) })}
                  className="tabular mt-1 w-full rounded-sm border border-line bg-panel-soft px-2 py-1.5 text-[13px] text-ink" />
              </label>
            )}
          </div>

          <label className="block text-[11px] font-bold uppercase tracking-wider text-steel">Notes / verdict reasoning
            <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={3}
              placeholder="Why this verdict? What would change your mind?"
              className="mt-1 w-full resize-y rounded-sm border border-line bg-panel-soft px-2 py-1.5 text-[13px] text-ink placeholder:text-faint" />
          </label>

          <div className="flex justify-end gap-2 pb-6 pt-2">
            <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
            <Btn kind="accent" onClick={onSave}><CheckCircle2 className="h-4 w-4" aria-hidden /> Save meeting</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= meeting card ================= */

function MeetingCard({ m, cost, onEdit, onDelete, onSetVerdict, onSetShrinkTo }) {
  const t = MEETING_TYPES[m.type], cad = CADENCE[m.cadence], link = LINKAGE[m.linkage];
  return (
    <article className="gauge-card riveted relative rounded-sm border border-line p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag color="#9aa1a8" Icon={t.Icon}>{t.label}</Tag>
          <Tag color="#9aa1a8">{cad.short}</Tag>
          <span className="panel-label text-[11px] font-bold text-faint">{m.code}</span>
        </div>
        <div className="no-print flex gap-1">
          <Btn kind="ghost" onClick={onEdit} ariaLabel={`Edit ${m.code}`} className="!px-1.5"><Pencil className="h-4 w-4" aria-hidden /></Btn>
          <Btn kind="danger" onClick={onDelete} ariaLabel={`Delete ${m.code}`} className="!px-1.5"><Trash2 className="h-4 w-4" aria-hidden /></Btn>
        </div>
      </header>

      <h3 className="mt-2 text-[17px] font-extrabold leading-snug tracking-tight text-ink">{m.title}</h3>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Tag color={link.color} Icon={link.Icon}>{link.short}</Tag>
        {m.linkedNote && <span className="text-[11.5px] italic leading-snug text-steel">{m.linkedNote}</span>}
      </div>

      <p className="mt-2 text-[11.5px] leading-snug text-steel">
        {m.attendees.length} {m.attendees.length === 1 ? 'person' : 'people'} · ${cost.rateSum.toLocaleString()}/hr combined ·{' '}
        <span title={m.attendees.map((a) => a.name || 'unnamed').join(', ')}>{m.attendees.slice(0, 3).map((a) => a.name || 'unnamed').join(', ')}{m.attendees.length > 3 ? `, +${m.attendees.length - 3} more` : ''}</span>
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-sm border border-line-soft bg-panel-soft/60 p-2.5">
        <div>
          <p className="panel-label text-[9px] font-bold text-faint">Per occurrence</p>
          <p className="tabular text-[15px] font-bold text-ink">{fmtMoney(cost.occurrenceCost)}</p>
        </div>
        <div>
          <p className="panel-label text-[9px] font-bold text-faint">Per week</p>
          <p className="tabular text-[15px] font-bold text-ink">{fmtMoney(cost.weeklyCost)}</p>
        </div>
        <div>
          <p className="panel-label text-[9px] font-bold text-faint">Per year (≈{WORK_WEEKS}wk)</p>
          <p className="tabular text-[15px] font-bold text-ink">{fmtMoney(cost.annualCost)}</p>
        </div>
      </div>

      <div className="no-print mt-3 flex flex-wrap items-center gap-1.5">
        <span className="panel-label mr-1 text-[10px] font-bold text-faint">Verdict:</span>
        {VERDICT_ORDER.map((k) => {
          const v = VERDICTS[k];
          const active = m.verdict === k;
          return (
            <button key={k} type="button" onClick={() => onSetVerdict(k)}
              className="panel-label inline-flex items-center gap-1 rounded-[3px] border-2 px-1.5 py-0.5 text-[10px] font-black transition-colors"
              style={active ? { background: v.color, borderColor: v.color, color: '#0d0e10' } : { borderColor: v.color + '55', color: v.color }}>
              <v.Icon className="h-3 w-3" aria-hidden />{v.short}
            </button>
          );
        })}
      </div>

      {m.verdict === 'shrink' && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-sm border border-amber/35 bg-amber/10 px-2.5 py-2">
          <label className="flex items-center gap-1.5 text-[12px] text-ink">
            Shrink {fmtHours(m.hours)} →
            <input type="number" min="0" max={m.hours} step="0.05" value={m.shrinkToHours}
              onChange={(e) => onSetShrinkTo(Math.max(0, Math.min(m.hours, Number(e.target.value) || 0)))}
              aria-label={`Shrink target hours for ${m.title}`}
              className="tabular w-16 rounded-sm border border-line bg-panel-soft px-1.5 py-1 text-[12px] text-ink" />
            hrs
          </label>
          <span className="tabular text-[12px] font-bold text-amber">reclaims {fmtHours(cost.reclaimedWeeklyHours)}/wk · {fmtMoney(cost.reclaimedWeeklyCost)}/wk</span>
        </div>
      )}
      {(m.verdict === 'kill' || m.verdict === 'async') && (
        <div className="mt-2 rounded-sm border px-2.5 py-2" style={{ borderColor: VERDICTS[m.verdict].color + '55', background: VERDICTS[m.verdict].color + '12' }}>
          <span className="tabular text-[12px] font-bold" style={{ color: VERDICTS[m.verdict].color }}>
            reclaims {fmtHours(cost.reclaimedWeeklyHours)}/wk · {fmtMoney(cost.reclaimedWeeklyCost)}/wk
          </span>
        </div>
      )}

      {m.notes && <p className="mt-2.5 border-t border-dashed border-line-soft pt-2 text-[12.5px] leading-relaxed text-steel">{m.notes}</p>}
    </article>
  );
}

/* ================= policy builder ================= */

function PolicyRow({ p, onChange, onRemove, onMove, first, last }) {
  return (
    <div className={`gauge-card rounded-sm border p-3 ${p.active ? 'border-line' : 'border-line-soft opacity-55'}`}>
      <div className="flex items-start gap-2">
        <div className="no-print mt-1 flex flex-col gap-0.5">
          <button type="button" onClick={() => onMove(-1)} disabled={first} aria-label={`Move rule "${p.title}" up`}
            className="rounded-sm border border-line-soft p-0.5 text-faint hover:text-ink disabled:opacity-25"><ArrowUp className="h-3 w-3" aria-hidden /></button>
          <button type="button" onClick={() => onMove(1)} disabled={last} aria-label={`Move rule "${p.title}" down`}
            className="rounded-sm border border-line-soft p-0.5 text-faint hover:text-ink disabled:opacity-25"><ArrowDown className="h-3 w-3" aria-hidden /></button>
        </div>
        <div className="min-w-0 flex-1">
          <input value={p.title} onChange={(e) => onChange({ ...p, title: e.target.value })} placeholder="Rule title"
            className="w-full bg-transparent text-[14px] font-bold text-ink outline-none placeholder:text-faint" />
          <textarea value={p.body} onChange={(e) => onChange({ ...p, body: e.target.value })} rows={2} placeholder="What exactly does this rule require?"
            className="mt-1 w-full resize-y rounded-sm border border-line-soft bg-panel-soft px-2 py-1.5 text-[12.5px] leading-relaxed text-ink placeholder:text-faint" />
        </div>
        <div className="no-print flex flex-col items-end gap-1.5">
          <button type="button" onClick={() => onChange({ ...p, active: !p.active })}
            aria-pressed={p.active} aria-label={p.active ? `Retire rule "${p.title}"` : `Activate rule "${p.title}"`}
            className={`panel-label rounded-[3px] border px-1.5 py-0.5 text-[9px] font-bold ${p.active ? 'border-keep/50 text-keep' : 'border-line text-faint'}`}>
            {p.active ? 'active' : 'retired'}
          </button>
          <button type="button" onClick={onRemove} aria-label={`Delete rule "${p.title}"`}
            className="rounded-sm p-1 text-faint hover:text-alarm"><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
        </div>
      </div>
    </div>
  );
}

/* ================= main app ================= */

export default function App() {
  const consoleCtx = useConsoleBus();
  const [state, setState] = useState(() => {
    let raw = null;
    try { raw = localStorage.getItem(LS_KEY); } catch { /* private mode */ }
    return normalize(raw);
  });
  const [helpOpen, setHelpOpen] = useState(() => !state.seenGuide);
  const [resetOpen, setResetOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [toast, setToast] = useState(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [verdictFilter, setVerdictFilter] = useState('all');
  const [sortKey, setSortKey] = useState('costDesc');
  const [asyncTargetId, setAsyncTargetId] = useState('');
  const [declineTargetId, setDeclineTargetId] = useState('');
  const [promptPreview, setPromptPreview] = useState(null);
  const toastTimer = useRef(null);
  const fileRef = useRef(null);
  const saveTimer = useRef(null);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  /* debounced autosave */
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* full/blocked */ }
    }, 250);
    return () => clearTimeout(saveTimer.current);
  }, [state]);

  const flash = useCallback((msg, undo) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), undo ? 7000 : 2600);
  }, []);

  const markGuideSeen = useCallback(() => {
    setHelpOpen(false);
    setState((s) => (s.seenGuide ? s : { ...s, seenGuide: true }));
  }, []);

  const costMap = useMemo(() => Object.fromEntries(state.meetings.map((m) => [m.id, meetingCost(m)])), [state.meetings]);
  const rollupData = useMemo(() => buildRollup(state.meetings, costMap), [state.meetings, costMap]);

  /* keyboard shortcuts */
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable;
      if (e.key === 'Escape') {
        setPromptPreview(null); setExportOpen(false); setResetOpen(false); setDraft(null); markGuideSeen();
        return;
      }
      if (typing) return;
      if (e.key === '?') { e.preventDefault(); setHelpOpen(true); }
      else if (e.key === 'n' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setDraft(emptyDraft(stateRef.current.defaultRate)); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const cm = Object.fromEntries(stateRef.current.meetings.map((m) => [m.id, meetingCost(m)]));
        copyText(auditMd(stateRef.current, cm)).then((ok) => flash(ok ? 'Weekly audit copied as Markdown' : 'Copy failed — use Export menu'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flash, markGuideSeen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = state.meetings.filter((m) =>
      (typeFilter === 'all' || m.type === typeFilter) &&
      (verdictFilter === 'all' || m.verdict === verdictFilter) &&
      (!q || [m.title, m.code, m.linkedNote, m.notes, ...m.attendees.map((a) => a.name)].join(' ').toLowerCase().includes(q)));
    const cmp = {
      costDesc: (a, b) => costMap[b.id].weeklyCost - costMap[a.id].weeklyCost,
      hoursDesc: (a, b) => costMap[b.id].weeklyPersonHours - costMap[a.id].weeklyPersonHours,
      unreviewed: (a, b) => (a.verdict === 'unreviewed' ? 0 : 1) - (b.verdict === 'unreviewed' ? 0 : 1),
      alpha: (a, b) => a.title.localeCompare(b.title),
    }[sortKey];
    return [...list].sort(cmp);
  }, [state.meetings, query, typeFilter, verdictFilter, sortKey, costMap]);

  /* actions */
  const saveDraft = () => {
    const clean = normMeeting(draft, state.meetings.length, state.defaultRate);
    setState((s) => {
      const exists = s.meetings.some((m) => m.id === clean.id);
      return { ...s, meetings: exists ? s.meetings.map((m) => (m.id === clean.id ? clean : m)) : [clean, ...s.meetings] };
    });
    setDraft(null);
    flash('Meeting saved to the log');
  };

  const deleteMeeting = (m) => {
    const idx = state.meetings.findIndex((x) => x.id === m.id);
    setState((s) => ({ ...s, meetings: s.meetings.filter((x) => x.id !== m.id) }));
    flash(`Deleted ${m.code}`, () => {
      setState((s) => {
        const arr = [...s.meetings]; arr.splice(Math.min(idx, arr.length), 0, m);
        return { ...s, meetings: arr };
      });
      setToast(null);
    });
  };

  const setVerdict = (id, verdict) =>
    setState((s) => ({ ...s, meetings: s.meetings.map((m) => (m.id === id ? { ...m, verdict } : m)) }));

  const setShrinkTo = (id, hours) =>
    setState((s) => ({ ...s, meetings: s.meetings.map((m) => (m.id === id ? { ...m, shrinkToHours: hours } : m)) }));

  /* policy actions */
  const addPolicy = () =>
    setState((s) => ({ ...s, policy: [...s.policy, normPolicyItem({ title: '', body: '', active: true })] }));
  const updatePolicy = (id, next) =>
    setState((s) => ({ ...s, policy: s.policy.map((p) => (p.id === id ? next : p)) }));
  const removePolicy = (p) => {
    const idx = state.policy.findIndex((x) => x.id === p.id);
    setState((s) => ({ ...s, policy: s.policy.filter((x) => x.id !== p.id) }));
    flash('Policy rule removed', () => {
      setState((s) => { const arr = [...s.policy]; arr.splice(Math.min(idx, arr.length), 0, p); return { ...s, policy: arr }; });
      setToast(null);
    });
  };
  const movePolicy = (id, dir) =>
    setState((s) => {
      const arr = [...s.policy]; const i = arr.findIndex((p) => p.id === id); const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return s;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...s, policy: arr };
    });

  const importJson = (file) => {
    const rd = new FileReader();
    rd.onload = () => {
      const next = normalize(rd.result);
      if (!next.meetings.length && !next.policy.length) { flash('Import failed — not an audit file'); return; }
      setState({ ...next, seenGuide: true });
      flash(`Imported ${next.meetings.length} meetings`);
    };
    rd.readAsText(file);
  };

  const copyAudit = () => copyText(auditMd(state, costMap)).then((ok) => flash(ok ? 'Weekly audit copied as Markdown' : 'Copy failed'));

  const asyncTarget = state.meetings.find((m) => m.id === asyncTargetId) || state.meetings.find((m) => m.verdict === 'kill' || m.verdict === 'async') || state.meetings[0];
  const declineTarget = state.meetings.find((m) => m.id === declineTargetId) || state.meetings[0];

  const copilotActions = [
    {
      id: 'async', title: 'Draft the async replacement', Icon: MessageSquareText,
      desc: 'Pick a killed or async-verdict meeting; Claude designs the format, cadence, template, and rollout message.',
      build: () => (asyncTarget ? consoleContextHeader(consoleCtx) + promptAsyncReplacement(asyncTarget) : ''),
      disabled: !state.meetings.length,
    },
    {
      id: 'decline', title: 'Write the decline-with-grace message', Icon: Ban,
      desc: 'Pick any meeting; Claude writes the message to send based on its verdict — kill, shrink, async, or a clarifying question.',
      build: () => (declineTarget ? consoleContextHeader(consoleCtx) + promptDecline(declineTarget) : ''),
      disabled: !state.meetings.length,
    },
    {
      id: 'policy', title: 'Design my meeting policy', Icon: ShieldAlert,
      desc: 'Sends your audit numbers and draft rules; Claude returns a publish-ready Meeting Policy v1.',
      build: () => consoleContextHeader(consoleCtx) + promptPolicy(state, costMap), disabled: false,
    },
    {
      id: 'audit', title: 'Audit my week for more time to reclaim', Icon: Gauge,
      desc: 'Sends the full log; Claude challenges your Keep verdicts and ranks the next 3 cuts by dollar impact.',
      build: () => consoleContextHeader(consoleCtx) + promptWeeklyAudit(state, costMap), disabled: !state.meetings.length,
    },
  ];

  const copyPrompt = (a) => {
    const p = a.build();
    if (!p) { flash('Log a meeting first'); return; }
    copyText(p).then((ok) => flash(ok ? 'Prompt copied — paste into claude.ai' : 'Copy failed'));
  };

  const inputCls = 'rounded-sm border border-line bg-panel-soft px-2 py-1.5 text-[13px] text-ink';

  return (
    <div className="grain min-h-screen">
      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-8 lg:px-12">

        {/* ============ header ============ */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <svg viewBox="0 0 44 44" className="mt-0.5 h-11 w-11 shrink-0" role="img" aria-label="Meeting ROI Auditor mark: a stopwatch">
              <rect x="18" y="1" width="8" height="6" rx="1.5" fill="#3a3e44" stroke="#eef0f1" strokeWidth="1" />
              <circle cx="22" cy="24" r="18" fill="#16181b" stroke="#eef0f1" strokeWidth="2" />
              <circle cx="22" cy="24" r="18" fill="none" stroke="#ff4a3d" strokeWidth="2.5" strokeDasharray="14 100" strokeLinecap="round" transform="rotate(-90 22 24)" />
              <line x1="22" y1="8" x2="22" y2="11" stroke="#5a5f66" strokeWidth="1.5" />
              <line x1="22" y1="37" x2="22" y2="40" stroke="#5a5f66" strokeWidth="1.5" />
              <line x1="6" y1="24" x2="9" y2="24" stroke="#5a5f66" strokeWidth="1.5" />
              <line x1="35" y1="24" x2="38" y2="24" stroke="#5a5f66" strokeWidth="1.5" />
              <line x1="22" y1="24" x2="22" y2="13" stroke="#eef0f1" strokeWidth="2" strokeLinecap="round" />
              <line x1="22" y1="24" x2="29" y2="24" stroke="#ff4a3d" strokeWidth="2" strokeLinecap="round" />
              <circle cx="22" cy="24" r="2" fill="#ff4a3d" />
            </svg>
            <div>
              <h1 className="text-[26px] font-extrabold leading-none tracking-tight text-ink">
                Meeting <span className="text-alarm">ROI</span> Auditor
              </h1>
              <p className="mt-1 text-[13.5px] text-steel">Cut meetings that don&apos;t move pipeline — <span className="font-semibold text-amber">log the cost, stamp the verdict, reclaim the hours</span>.</p>
              {consoleCtx && (
                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-alarm/40 bg-alarm/10 px-2.5 py-1 text-[11px] font-semibold text-alarm">
                  <Cable className="h-3 w-3" aria-hidden /> Console linked{consoleCtx.profile?.company ? ` — ${consoleCtx.profile.company}` : ''}
                </span>
              )}
            </div>
          </div>
          <nav className="no-print flex flex-wrap items-center gap-2" aria-label="Primary actions">
            <Btn kind="ghost" onClick={() => { setState({ ...DEMO, seenGuide: true }); flash('Demo audit loaded'); }}>
              <Timer className="h-4 w-4" aria-hidden /> Load demo
            </Btn>
            <Btn kind="ghost" onClick={() => setResetOpen(true)}><RotateCcw className="h-4 w-4" aria-hidden /> Reset</Btn>
            <Btn kind="ghost" onClick={() => setHelpOpen(true)}><HelpCircle className="h-4 w-4" aria-hidden /> How to use</Btn>
            <div className="relative">
              <Btn kind="primary" onClick={() => setExportOpen((v) => !v)}><Download className="h-4 w-4" aria-hidden /> Export <ChevronDown className="h-3.5 w-3.5" aria-hidden /></Btn>
              {exportOpen && (
                <div role="menu" aria-label="Export options" className="pop-in gauge-card absolute right-0 z-30 mt-1 w-64 rounded-sm border border-line p-1">
                  {[
                    { Icon: FileText, label: 'Copy weekly audit as Markdown', act: copyAudit },
                    { Icon: FileJson, label: 'Download JSON (full state)', act: () => download('meeting-roi-audit.json', JSON.stringify(state, null, 2), 'application/json') },
                    { Icon: Table2, label: 'Download CSV (meeting log)', act: () => download('meeting-roi-log.csv', meetingsCsv(state), 'text/csv') },
                    { Icon: Printer, label: 'Print weekly audit', act: () => window.print() },
                    { Icon: Upload, label: 'Import JSON…', act: () => fileRef.current?.click() },
                  ].map((mi) => (
                    <button key={mi.label} type="button" role="menuitem" onClick={() => { setExportOpen(false); mi.act(); }}
                      className="flex w-full items-center gap-2 rounded-[3px] px-2 py-1.5 text-left text-[13px] text-ink hover:bg-panel-raised">
                      <mi.Icon className="h-4 w-4 text-steel" aria-hidden /> {mi.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Import audit JSON file"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
          </nav>
        </header>

        {/* ============ hero: instrument panel ============ */}
        <section className="hazard-edge mt-6 rounded-sm p-[3px] shadow-[0_20px_44px_-26px_rgba(0,0,0,0.7)]" aria-label="Weekly scoreboard">
          <div className="gauge-card grid items-center gap-5 rounded-[2px] p-4 md:grid-cols-[1fr_auto]">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              {[
                ['Meetings tracked', rollupData.meetingCount, ''],
                ['Weekly hours', fmtHours(rollupData.weeklyHours), 'person-hours, all attendees'],
                ['Weekly loaded cost', fmtMoney(rollupData.weeklyCost), 'at logged rates'],
                ['No pipeline link', fmtHours(rollupData.noLinkHours), `${fmtMoney(rollupData.noLinkCost)}/wk at risk`],
              ].map(([label, value, sub], i) => (
                <div key={label}>
                  <p className="panel-label text-[10px] font-bold text-faint">{label}</p>
                  <p className={`tabular text-[26px] font-bold leading-tight ${i === 3 ? 'text-alarm glow-alarm' : 'text-ink'}`}>{value}</p>
                  {sub && <p className="text-[10px] text-faint">{sub}</p>}
                </div>
              ))}
              <div className="col-span-2 sm:col-span-4">
                <label className="flex flex-wrap items-center gap-2 text-[11px] text-steel">
                  <span className="panel-label font-bold text-faint">Default loaded rate</span>
                  <span className="flex items-center gap-1 rounded-sm border border-line bg-panel-soft px-2 py-1">
                    <DollarSign className="h-3.5 w-3.5 text-faint" aria-hidden />
                    <input type="number" min="1" value={state.defaultRate}
                      onChange={(e) => setState((s) => ({ ...s, defaultRate: Math.max(1, Number(e.target.value) || 1) }))}
                      aria-label="Default loaded hourly rate for new attendees"
                      className="tabular w-16 bg-transparent text-[12px] text-ink outline-none" />
                    <span className="text-[11px] text-faint">/hr</span>
                  </span>
                  <span className="text-faint">applied to new attendees you add</span>
                </label>
              </div>
            </div>
            <div className="no-print hidden md:block">
              <StopwatchHero reclaimedHours={rollupData.reclaimedHours} reclaimedCost={rollupData.reclaimedCost} weeklyHours={rollupData.weeklyHours} />
            </div>
          </div>
        </section>

        {rollupData.unreviewedCount > 0 && (
          <div className="no-print mt-4 flex flex-wrap items-center gap-2 rounded-sm border border-amber/40 bg-amber/10 px-3 py-2">
            <Siren className="h-4 w-4 text-amber" aria-hidden />
            <span className="text-[13px] text-ink"><b className="tabular text-amber">{rollupData.unreviewedCount}</b> meeting{rollupData.unreviewedCount === 1 ? '' : 's'} still waiting on a verdict.</span>
            <button type="button" onClick={() => setVerdictFilter('unreviewed')} className="ml-auto text-[12px] font-semibold text-amber underline decoration-dotted underline-offset-2">Show unreviewed →</button>
          </div>
        )}

        {/* ============ workbench grid ============ */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">

          {/* --- meeting log --- */}
          <section aria-label="Meeting log">
            <div className="no-print flex flex-wrap items-center gap-2">
              <h2 className="panel-label mr-auto text-[12px] font-bold text-ink">Meeting log</h2>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" aria-hidden />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search meetings…" aria-label="Search meetings"
                  className={`${inputCls} w-36 pl-7`} />
              </div>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by meeting type" className={inputCls}>
                <option value="all">all types</option>
                {Object.entries(MEETING_TYPES).map(([k, t]) => <option key={k} value={k}>{t.label.toLowerCase()}</option>)}
              </select>
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} aria-label="Sort meetings" className={inputCls}>
                <option value="costDesc">highest cost first</option>
                <option value="hoursDesc">most hours first</option>
                <option value="unreviewed">unreviewed first</option>
                <option value="alpha">A → Z</option>
              </select>
              <Btn kind="accent" onClick={() => setDraft(emptyDraft(state.defaultRate))}><Plus className="h-4 w-4" aria-hidden /> New meeting</Btn>
            </div>

            <div className="no-print mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Filter by verdict">
              <button type="button" onClick={() => setVerdictFilter('all')}
                className={`panel-label rounded-[3px] border px-2 py-1 text-[10px] font-bold ${verdictFilter === 'all' ? 'border-ink bg-ink text-ground-deep' : 'border-line text-steel'}`}>ALL</button>
              {VERDICT_ORDER.map((k) => {
                const v = VERDICTS[k]; const active = verdictFilter === k;
                return (
                  <button key={k} type="button" onClick={() => setVerdictFilter(k)}
                    className="panel-label inline-flex items-center gap-1 rounded-[3px] border-2 px-2 py-1 text-[10px] font-bold"
                    style={active ? { background: v.color, borderColor: v.color, color: '#0d0e10' } : { borderColor: v.color + '55', color: v.color }}>
                    <v.Icon className="h-3 w-3" aria-hidden />{v.short}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-4">
              {filtered.length === 0 && state.meetings.length === 0 && (
                <div className="gauge-card relative rounded-sm border border-dashed border-line p-8 text-center">
                  <Timer className="mx-auto h-8 w-8 text-steel" aria-hidden />
                  <h3 className="mt-3 text-lg font-extrabold text-ink">Nobody has audited this calendar yet</h3>
                  <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-steel">
                    Every recurring meeting has a loaded cost, whether anyone has run the math or not.
                    Log one, name its attendees and rates, and stamp a verdict — <span className="font-semibold text-amber">keep, shrink, kill, or make it async</span>.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Btn kind="accent" onClick={() => setDraft(emptyDraft(state.defaultRate))}><Plus className="h-4 w-4" aria-hidden /> Log first meeting</Btn>
                    <Btn kind="ghost" onClick={() => { setState({ ...DEMO, seenGuide: true }); flash('Demo audit loaded'); }}>
                      <Timer className="h-4 w-4" aria-hidden /> See a worked example
                    </Btn>
                  </div>
                </div>
              )}
              {filtered.length === 0 && state.meetings.length > 0 && (
                <p className="p-6 text-center text-[13px] text-steel">No meetings match this filter — clear the search or switch type/verdict.</p>
              )}
              {filtered.map((m) => (
                <MeetingCard key={m.id} m={m} cost={costMap[m.id]}
                  onEdit={() => setDraft(JSON.parse(JSON.stringify(m)))}
                  onDelete={() => deleteMeeting(m)}
                  onSetVerdict={(v) => setVerdict(m.id, v)}
                  onSetShrinkTo={(h) => setShrinkTo(m.id, h)} />
              ))}
            </div>
          </section>

          {/* --- right rail --- */}
          <aside className="space-y-6">
            <section aria-label="Weekly audit" className="gauge-card rounded-sm border border-line p-4">
              <h2 className="panel-label flex items-center gap-1.5 text-[12px] font-bold text-ink"><Gauge className="h-4 w-4 text-async" aria-hidden /> Weekly audit</h2>
              <p className="mt-1 text-[11.5px] leading-snug text-steel">Person-hours per week by verdict. Reclaimed = shrink + kill + async.</p>
              <div className="mt-3"><VerdictChart rollupData={rollupData} /></div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line-soft pt-2.5">
                <div><dt className="panel-label text-[9px] font-bold text-faint">Reclaimed / yr</dt><dd className="tabular text-[15px] font-bold text-keep">{fmtMoney(rollupData.reclaimedAnnual)}</dd></div>
                <div><dt className="panel-label text-[9px] font-bold text-faint">Unreviewed</dt><dd className="tabular text-[15px] font-bold text-amber">{rollupData.unreviewedCount}</dd></div>
              </dl>
            </section>

            <section aria-label="Claude Copilot" className="no-print gauge-card rounded-sm border border-async/30 p-4">
              <h2 className="panel-label flex items-center gap-1.5 text-[12px] font-bold text-ink"><Sparkles className="h-4 w-4 text-async" aria-hidden /> Claude Copilot</h2>
              <p className="mt-1 text-[11.5px] leading-snug text-steel">
                Each action builds a complete prompt from your live audit. Paste into <span className="tabular">claude.ai</span> — works with the standard $20 Claude subscription, no API key.
              </p>
              <div className="mt-3 space-y-3">
                {copilotActions.map((a) => (
                  <div key={a.id} className="rounded-sm border border-line bg-panel-soft/60 p-2.5">
                    <p className="flex items-center gap-1.5 text-[13px] font-bold text-ink"><a.Icon className="h-4 w-4 text-async" aria-hidden />{a.title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-steel">{a.desc}</p>
                    {a.id === 'async' && state.meetings.length > 0 && (
                      <select value={asyncTarget?.id || ''} onChange={(e) => setAsyncTargetId(e.target.value)}
                        aria-label="Meeting to design an async replacement for" className={`${inputCls} mt-1.5 w-full text-[11px]`}>
                        {state.meetings.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.title.slice(0, 40)}</option>)}
                      </select>
                    )}
                    {a.id === 'decline' && state.meetings.length > 0 && (
                      <select value={declineTarget?.id || ''} onChange={(e) => setDeclineTargetId(e.target.value)}
                        aria-label="Meeting to write a decline message for" className={`${inputCls} mt-1.5 w-full text-[11px]`}>
                        {state.meetings.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.title.slice(0, 40)}</option>)}
                      </select>
                    )}
                    <div className="mt-2 flex gap-1.5">
                      <Btn kind="primary" onClick={() => copyPrompt(a)} disabled={a.disabled} className="!py-1 !text-[12px]">
                        <Copy className="h-3.5 w-3.5" aria-hidden /> Copy prompt
                      </Btn>
                      <Btn kind="ghost" onClick={() => setPromptPreview({ title: a.title, text: a.build() })} disabled={a.disabled} className="!py-1 !text-[12px]">Preview</Btn>
                    </div>
                  </div>
                ))}
              </div>
              <label className="mt-3 block">
                <span className="panel-label flex items-center gap-1.5 text-[10px] font-bold text-faint">
                  <ClipboardPaste className="h-3.5 w-3.5" aria-hidden /> Claude&apos;s answer (saved with your audit)
                </span>
                <textarea value={state.copilotNotes} onChange={(e) => setState({ ...state, copilotNotes: e.target.value })}
                  rows={4} placeholder="Paste the useful parts of Claude's reply here…"
                  className="mt-1 w-full resize-y rounded-sm border border-line bg-panel-soft px-2 py-1.5 text-[12px] leading-relaxed text-ink placeholder:text-faint" />
              </label>
            </section>
          </aside>
        </div>

        {/* ============ meeting policy builder ============ */}
        <section aria-label="Meeting policy builder" className="mt-8">
          <div className="no-print flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="panel-label text-[12px] font-bold text-ink">Meeting policy builder</h2>
              <p className="mt-0.5 text-[11.5px] text-steel">Rules earn their place on this list. Retire what stopped working instead of deleting the evidence.</p>
            </div>
            <div className="flex gap-2">
              <Btn kind="ghost" onClick={() => copyText(policyText(state)).then((ok) => flash(ok ? 'Active policy copied' : 'Copy failed'))}>
                <Copy className="h-4 w-4" aria-hidden /> Copy active rules
              </Btn>
              <Btn kind="accent" onClick={addPolicy}><Plus className="h-4 w-4" aria-hidden /> Add rule</Btn>
            </div>
          </div>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {state.policy.length === 0 && (
              <p className="col-span-2 rounded-sm border border-dashed border-line p-5 text-center text-[13px] text-steel">
                No policy yet. Start from a pattern you see below — most teams start with a length cap and a pipeline-link requirement.
              </p>
            )}
            {state.policy.map((p, i) => (
              <PolicyRow key={p.id} p={p}
                first={i === 0} last={i === state.policy.length - 1}
                onChange={(next) => updatePolicy(p.id, next)}
                onRemove={() => removePolicy(p)}
                onMove={(dir) => movePolicy(p.id, dir)} />
            ))}
          </div>
        </section>

        <footer className="mt-10 border-t border-dashed border-line pt-3 text-center text-[10.5px] text-faint">
          Data lives only in this browser (localStorage). Export JSON for backup. Press <kbd className="rounded border border-line bg-panel-soft px-1">?</kbd> for help.
        </footer>
      </main>

      {/* ============ modals ============ */}
      {helpOpen && (
        <div role="dialog" aria-modal="true" aria-label="How to use Meeting ROI Auditor"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) markGuideSeen(); }}>
          <div className="pop-in gauge-card max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-sm border-t-4 border-amber p-6">
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-extrabold tracking-tight text-ink">How to run the audit</h2>
              <Btn kind="ghost" onClick={markGuideSeen} ariaLabel="Close help"><X className="h-4 w-4" aria-hidden /></Btn>
            </div>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-[13.5px] leading-relaxed text-ink">
              <li><b>Load the demo</b> to see a fully-audited calendar, or start clean with <b>New meeting</b>.</li>
              <li><b>Log the meeting's shape</b> — type, cadence, duration, and every attendee with their loaded hourly rate. The cost calculator does the rest.</li>
              <li><b>Set the pipeline link</b> — direct, indirect, or none. Meetings with no link are the ones this audit exists to find.</li>
              <li><b>Stamp a verdict</b> on the card: <b>Keep</b>, <b>Shrink</b> (set a target length), <b>Kill</b>, or <b>Make async</b>. The reclaimed-hours counter updates live.</li>
              <li><b>Watch the stopwatch dial</b> in the header — it reads your total reclaimed hours and dollars per week, and the ring fills with the share of your week you've gotten back.</li>
              <li><b>Build your policy</b> in the Meeting Policy Builder — add, edit, reorder, and retire rules as they prove out.</li>
              <li><b>Use the Claude Copilot</b> — copy a prompt (your live audit rides along) into claude.ai to draft an async replacement, a decline message, your policy doc, or a deeper audit.</li>
              <li><b>Export</b> — Markdown for the weekly readout, CSV for spreadsheets, JSON for backup.</li>
            </ol>
            <h3 className="panel-label mt-4 flex items-center gap-1.5 text-[11px] font-bold text-faint"><Keyboard className="h-4 w-4" aria-hidden /> Shortcuts</h3>
            <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-ink">
              {[['n', 'new meeting'], ['?', 'open this guide'], ['Ctrl/Cmd+S', 'copy weekly audit as Markdown'], ['Esc', 'close any panel']].map(([k, d]) => (
                <p key={k}><kbd className="rounded border border-line bg-panel-soft px-1.5 py-0.5">{k}</kbd> <span className="text-steel">{d}</span></p>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <Btn kind="accent" onClick={markGuideSeen}>Start auditing</Btn>
            </div>
          </div>
        </div>
      )}

      {resetOpen && (
        <div role="dialog" aria-modal="true" aria-label="Confirm reset"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setResetOpen(false); }}>
          <div className="pop-in hazard-edge w-full max-w-sm rounded-sm p-[3px]">
            <div className="gauge-card rounded-[2px] p-5">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink"><AlertTriangle className="h-5 w-5 text-alarm" aria-hidden /> Wipe the audit?</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-steel">
                This erases every meeting and policy rule from this browser. Download the JSON first if the math took real work to gather.
              </p>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Btn kind="ghost" onClick={() => download('meeting-roi-audit-backup.json', JSON.stringify(state, null, 2), 'application/json')}>
                  <FileJson className="h-4 w-4" aria-hidden /> Backup first
                </Btn>
                <Btn kind="ghost" onClick={() => setResetOpen(false)}>Cancel</Btn>
                <Btn kind="danger" onClick={() => { setState(normalize({ seenGuide: true })); setResetOpen(false); flash('Audit reset'); }}>
                  <Trash2 className="h-4 w-4" aria-hidden /> Reset everything
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {promptPreview && (
        <div role="dialog" aria-modal="true" aria-label="Prompt preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setPromptPreview(null); }}>
          <div className="pop-in gauge-card flex max-h-[86vh] w-full max-w-2xl flex-col rounded-sm border-t-4 border-async p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-ink">{promptPreview.title}</h2>
              <div className="flex gap-1.5">
                <Btn kind="primary" onClick={() => copyText(promptPreview.text).then((ok) => flash(ok ? 'Prompt copied — paste into claude.ai' : 'Copy failed'))}>
                  <Copy className="h-4 w-4" aria-hidden /> Copy
                </Btn>
                <Btn kind="ghost" onClick={() => setPromptPreview(null)} ariaLabel="Close preview"><X className="h-4 w-4" aria-hidden /></Btn>
              </div>
            </div>
            <pre className="tabular mt-3 flex-1 overflow-y-auto whitespace-pre-wrap rounded-sm border border-line bg-panel-soft p-3 text-[11.5px] leading-relaxed text-ink">{promptPreview.text}</pre>
          </div>
        </div>
      )}

      {draft && <EditorDrawer draft={draft} setDraft={setDraft} onSave={saveDraft} onClose={() => setDraft(null)} />}

      {toast && (
        <div className="toast-in fixed bottom-5 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-sm border border-line bg-panel px-4 py-2.5 text-[13px] text-ink shadow-2xl" role="status">
          {toast.msg}
          {toast.undo && (
            <button type="button" onClick={toast.undo}
              className="inline-flex items-center gap-1 rounded-[3px] bg-amber px-2 py-1 font-semibold text-ground-deep hover:brightness-95">
              <Undo2 className="h-3.5 w-3.5" aria-hidden /> Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
