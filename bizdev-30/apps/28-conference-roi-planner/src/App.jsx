import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Plus, Trash2, RotateCcw, BookOpen, Search, Copy, Check, X, ChevronDown,
  Bot, Undo2, ClipboardCopy, Printer, FileDown, FileUp, FileText,
  CheckCircle2, XCircle, Compass, Gauge, TrendingUp, Wallet, ClipboardList,
  PlaneTakeoff, PlaneLanding,
} from 'lucide-react';

/* ================================================================
   CONSTANTS — the flight plan's rulebook
================================================================ */
const LS_KEY = 'bizdev:28-conference-roi-planner:v1';

const CATEGORIES = ['Conference', 'Trade Show', 'Summit', 'Workshop', 'Sponsorship'];
const STATUSES = ['candidate', 'go', 'no-go', 'flown'];
const STATUS_META = {
  candidate: { label: 'Scouting', tone: 'scout' },
  go: { label: 'Cleared', tone: 'go' },
  'no-go': { label: 'Grounded', tone: 'nogo' },
  flown: { label: 'Flown', tone: 'flown' },
};
const TONE_VAR = {
  scout: 'var(--color-sky-300)',
  go: 'var(--color-go)',
  nogo: 'var(--color-nogo)',
  flown: 'var(--color-runway)',
};

const TABS = [
  { key: 'cost', label: 'Cost Model', icon: Wallet },
  { key: 'pipeline', label: 'Pipeline Model', icon: TrendingUp },
  { key: 'decision', label: 'Breakeven & Decision', icon: Gauge },
  { key: 'actuals', label: 'Post-Event Actuals', icon: ClipboardList },
];

const ROI_GO_THRESHOLD = 60;
const ROI_HOLD_THRESHOLD = -10;

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const money = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n) || 0);
const round1 = (n) => {
  const v = Math.round((Number(n) || 0) * 10) / 10;
  return v % 1 === 0 ? String(v) : v.toFixed(1);
};
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/* ================================================================
   STATE — normalize survives anything
================================================================ */
function blankCosts(partial = {}) {
  return {
    ticketPerPerson: 0, flightsPerPerson: 0, hotelRate: 0, hotelNights: 0,
    groundPerPerson: 0, mealsPerDiemPerPerson: 0,
    boothFee: 0, boothBuild: 0, boothCollateral: 0,
    dayRatePerPerson: 0, misc: 0, miscLabel: '',
    ...partial,
  };
}
function blankPipeline(partial = {}) {
  return { conversations: 0, meetingRate: 0, dealRate: 0, avgDealValue: 0, ...partial };
}
function blankActuals(partial = {}) {
  return { logged: false, cost: 0, conversations: 0, meetings: 0, deals: 0, revenue: 0, notes: '', loggedAt: null, ...partial };
}
function blankEvent(partial = {}) {
  return {
    id: uid(), name: '', organizer: '', location: '', category: 'Conference',
    startDate: '', endDate: '', people: 1, exhibiting: false,
    status: 'candidate', decidedAt: null, decidedBy: '', rationale: '',
    notes: '', copilotNotes: '',
    costs: blankCosts(), pipeline: blankPipeline(), actuals: blankActuals(),
    createdAt: Date.now(), updatedAt: Date.now(),
    ...partial,
  };
}

function normalize(raw) {
  const base = { events: [], seenGuide: false, budgetCap: 0 };
  if (!raw || typeof raw !== 'object') return base;
  const out = { ...base };
  out.seenGuide = raw.seenGuide === true;
  out.budgetCap = Number.isFinite(Number(raw.budgetCap)) ? Math.max(0, Number(raw.budgetCap)) : 0;
  if (Array.isArray(raw.events)) {
    out.events = raw.events.filter((e) => e && typeof e === 'object').map((e) => {
      const ne = blankEvent();
      ne.id = typeof e.id === 'string' && e.id ? e.id : uid();
      ne.name = typeof e.name === 'string' ? e.name : '';
      ne.organizer = typeof e.organizer === 'string' ? e.organizer : '';
      ne.location = typeof e.location === 'string' ? e.location : '';
      ne.category = CATEGORIES.includes(e.category) ? e.category : 'Conference';
      ne.startDate = typeof e.startDate === 'string' ? e.startDate : '';
      ne.endDate = typeof e.endDate === 'string' ? e.endDate : '';
      ne.people = Number.isFinite(Number(e.people)) ? Math.max(1, Math.round(Number(e.people))) : 1;
      ne.exhibiting = e.exhibiting === true;
      ne.status = STATUSES.includes(e.status) ? e.status : 'candidate';
      ne.decidedAt = Number.isFinite(e.decidedAt) ? e.decidedAt : null;
      ne.decidedBy = typeof e.decidedBy === 'string' ? e.decidedBy : '';
      ne.rationale = typeof e.rationale === 'string' ? e.rationale : '';
      ne.notes = typeof e.notes === 'string' ? e.notes : '';
      ne.copilotNotes = typeof e.copilotNotes === 'string' ? e.copilotNotes : '';
      ne.createdAt = Number.isFinite(e.createdAt) ? e.createdAt : Date.now();
      ne.updatedAt = Number.isFinite(e.updatedAt) ? e.updatedAt : Date.now();
      if (e.costs && typeof e.costs === 'object') {
        for (const k of Object.keys(ne.costs)) {
          if (k === 'miscLabel') { ne.costs.miscLabel = typeof e.costs.miscLabel === 'string' ? e.costs.miscLabel : ''; continue; }
          const v = Number(e.costs[k]);
          ne.costs[k] = Number.isFinite(v) ? Math.max(0, v) : 0;
        }
      }
      if (e.pipeline && typeof e.pipeline === 'object') {
        const v = (key, max) => { const n = Number(e.pipeline[key]); return Number.isFinite(n) ? Math.max(0, max ? Math.min(max, n) : n) : 0; };
        ne.pipeline = { conversations: v('conversations'), meetingRate: v('meetingRate', 100), dealRate: v('dealRate', 100), avgDealValue: v('avgDealValue') };
      }
      if (e.actuals && typeof e.actuals === 'object') {
        ne.actuals.logged = e.actuals.logged === true;
        for (const k of ['cost', 'conversations', 'meetings', 'deals', 'revenue']) {
          const v = Number(e.actuals[k]);
          ne.actuals[k] = Number.isFinite(v) ? Math.max(0, v) : 0;
        }
        ne.actuals.notes = typeof e.actuals.notes === 'string' ? e.actuals.notes : '';
        ne.actuals.loggedAt = Number.isFinite(e.actuals.loggedAt) ? e.actuals.loggedAt : null;
      }
      return ne;
    });
  }
  return out;
}

function loadState() {
  try { return normalize(JSON.parse(localStorage.getItem(LS_KEY))); }
  catch { return normalize(null); }
}

/* ================================================================
   FLIGHT MATH — cost, pipeline, breakeven, variance
================================================================ */
function eventDays(ev) {
  if (ev.startDate && ev.endDate) {
    const a = new Date(ev.startDate), b = new Date(ev.endDate);
    const diff = Math.round((b - a) / 86400000) + 1;
    if (Number.isFinite(diff) && diff > 0) return diff;
  }
  return 2;
}

function costBreakdown(ev) {
  const c = ev.costs;
  const people = Math.max(1, Number(ev.people) || 1);
  const days = eventDays(ev);
  const nights = Math.max(0, Number(c.hotelNights) || 0);
  const ticket = (Number(c.ticketPerPerson) || 0) * people;
  const flights = (Number(c.flightsPerPerson) || 0) * people;
  const hotel = (Number(c.hotelRate) || 0) * nights * people;
  const ground = (Number(c.groundPerPerson) || 0) * people;
  const meals = (Number(c.mealsPerDiemPerPerson) || 0) * days * people;
  const travel = flights + hotel + ground + meals;
  const booth = ev.exhibiting ? (Number(c.boothFee) || 0) + (Number(c.boothBuild) || 0) + (Number(c.boothCollateral) || 0) : 0;
  const time = (Number(c.dayRatePerPerson) || 0) * days * people;
  const misc = Number(c.misc) || 0;
  const total = ticket + travel + booth + time + misc;
  return { ticket, flights, hotel, ground, meals, travel, booth, time, misc, total, days, nights, people };
}

function pipelineModel(ev) {
  const p = ev.pipeline;
  const conversations = Math.max(0, Number(p.conversations) || 0);
  const meetingRate = clamp(Number(p.meetingRate) || 0, 0, 100);
  const dealRate = clamp(Number(p.dealRate) || 0, 0, 100);
  const avgDealValue = Math.max(0, Number(p.avgDealValue) || 0);
  const meetings = conversations * (meetingRate / 100);
  const deals = meetings * (dealRate / 100);
  const pipelineValue = meetings * avgDealValue;
  const expectedRevenue = deals * avgDealValue;
  return { conversations, meetingRate, dealRate, avgDealValue, meetings, deals, pipelineValue, expectedRevenue };
}

function breakevenOf(ev) {
  const cost = costBreakdown(ev);
  const pipe = pipelineModel(ev);
  const breakevenDeals = pipe.avgDealValue > 0 ? cost.total / pipe.avgDealValue : null;
  const breakevenMeetings = (pipe.avgDealValue > 0 && pipe.dealRate > 0) ? breakevenDeals / (pipe.dealRate / 100) : null;
  const roiPct = cost.total > 0 ? ((pipe.expectedRevenue - cost.total) / cost.total) * 100 : (pipe.expectedRevenue > 0 ? Infinity : 0);
  const costPerConversation = pipe.conversations > 0 ? cost.total / pipe.conversations : null;
  const costPerMeeting = pipe.meetings > 0 ? cost.total / pipe.meetings : null;
  const netExpected = pipe.expectedRevenue - cost.total;
  return { cost, pipe, breakevenDeals, breakevenMeetings, roiPct, costPerConversation, costPerMeeting, netExpected };
}

function suggestedCall(b) {
  const { roiPct, cost, pipe } = b;
  if (cost.total <= 0) {
    return pipe.expectedRevenue > 0
      ? { key: 'GO', tone: 'go', note: 'No modeled cost — any pipeline clears this event.' }
      : { key: 'INCOMPLETE', tone: 'hold', note: 'Add costs and a pipeline forecast to get a call.' };
  }
  if (roiPct >= ROI_GO_THRESHOLD) return { key: 'GO', tone: 'go', note: `Expected return clears cost by ${Math.round(roiPct)}%.` };
  if (roiPct >= ROI_HOLD_THRESHOLD) return { key: 'BORDERLINE', tone: 'hold', note: 'Close enough to call — tighten the pipeline assumptions or negotiate cost before deciding.' };
  return { key: 'NO-GO', tone: 'nogo', note: `Expected return trails cost by ${Math.abs(Math.round(roiPct))}%.` };
}

function varianceOf(ev) {
  const b = breakevenOf(ev);
  const a = ev.actuals;
  if (!a.logged) return null;
  const actualCost = Math.max(0, Number(a.cost) || 0);
  const actualRevenue = Math.max(0, Number(a.revenue) || 0);
  const actualConversations = Math.max(0, Number(a.conversations) || 0);
  const actualMeetings = Math.max(0, Number(a.meetings) || 0);
  const actualDeals = Math.max(0, Number(a.deals) || 0);
  const actualRoi = actualCost > 0 ? ((actualRevenue - actualCost) / actualCost) * 100 : (actualRevenue > 0 ? Infinity : 0);
  return {
    actualCost, actualRevenue, actualConversations, actualMeetings, actualDeals, actualRoi,
    costDelta: actualCost - b.cost.total,
    revenueDelta: actualRevenue - b.pipe.expectedRevenue,
    conversationsDelta: actualConversations - b.pipe.conversations,
    meetingsDelta: actualMeetings - b.pipe.meetings,
    dealsDelta: actualDeals - b.pipe.deals,
    roiDelta: (Number.isFinite(actualRoi) && Number.isFinite(b.roiPct)) ? actualRoi - b.roiPct : null,
  };
}

function deltaStr(n, kind) {
  if (!Number.isFinite(n)) return '—';
  if (kind === 'money') {
    const abs = money(Math.abs(n));
    return n === 0 ? 'on plan' : n > 0 ? `+${abs}` : `-${abs}`;
  }
  return n === 0 ? 'on plan' : n > 0 ? `+${round1(n)}` : `${round1(n)}`;
}

/* ================================================================
   DEMO DATA — a realistic mixed flight schedule
================================================================ */
function demoState() {
  const mk = (over, costs, pipeline, actuals) => {
    const e = blankEvent(over);
    e.costs = blankCosts(costs);
    e.pipeline = blankPipeline(pipeline);
    if (actuals) e.actuals = blankActuals({ logged: true, loggedAt: Date.now(), ...actuals });
    return e;
  };
  return normalize({
    seenGuide: true,
    budgetCap: 90000,
    events: [
      mk({
        name: 'SaaSCon Austin 2026', organizer: 'SaaSCon', location: 'Austin, TX', category: 'Conference',
        startDate: '2026-09-14', endDate: '2026-09-16', people: 2, exhibiting: false,
        status: 'go', decidedAt: Date.parse('2026-06-02'), decidedBy: 'Priya (VP Sales)',
        rationale: 'Attendee list is 70% our ICP (mid-market vertical SaaS ops leaders). Two of our best closed-won deals last year started here.',
        notes: 'Book the rooftop meetup on night one — half our best conversations happened there last year.',
      }, {
        ticketPerPerson: 1200, flightsPerPerson: 380, hotelRate: 260, hotelNights: 3,
        groundPerPerson: 90, mealsPerDiemPerPerson: 75, dayRatePerPerson: 650,
        misc: 150, miscLabel: 'Badge scanner add-on + swag',
      }, {
        conversations: 60, meetingRate: 35, dealRate: 20, avgDealValue: 18000,
      }),
      mk({
        name: 'Field Ops Summit — Denver', organizer: 'FieldOps Media', location: 'Denver, CO', category: 'Trade Show',
        startDate: '2026-05-12', endDate: '2026-05-14', people: 3, exhibiting: true,
        status: 'flown', decidedAt: Date.parse('2026-02-20'), decidedBy: 'Marcus (CEO)',
        rationale: 'Biggest concentration of our target vertical (utilities/field service) in one room. Worth the booth spend.',
        notes: 'Booth traffic was strong on day one, thin on day three — pack up the giveaway earlier next time.',
      }, {
        ticketPerPerson: 450, flightsPerPerson: 310, hotelRate: 210, hotelNights: 3,
        groundPerPerson: 60, mealsPerDiemPerPerson: 70, dayRatePerPerson: 600,
        boothFee: 4200, boothBuild: 1800, boothCollateral: 650, misc: 0,
      }, {
        conversations: 140, meetingRate: 25, dealRate: 15, avgDealValue: 9500,
      }, {
        cost: 9430, conversations: 165, meetings: 34, deals: 4, revenue: 41000,
        notes: 'Booth build ran $600 over (rush shipping). Deal count beat plan — two closed inside 45 days, both cited the live demo at the booth.',
      }),
      mk({
        name: 'RevGrowth Live — NYC', organizer: 'RevGrowth', location: 'New York, NY', category: 'Conference',
        startDate: '2026-10-06', endDate: '2026-10-07', people: 2, exhibiting: false,
        status: 'no-go', decidedAt: Date.parse('2026-07-10'), decidedBy: 'Marcus (CEO)',
        rationale: 'Attendee list skews VC and media, not our ICP. Cost per qualified conversation runs roughly triple our other events — pass this year.',
        notes: 'Revisit for next year only if the agenda adds an operator-focused track.',
      }, {
        ticketPerPerson: 1800, flightsPerPerson: 220, hotelRate: 340, hotelNights: 2,
        groundPerPerson: 120, mealsPerDiemPerPerson: 90, dayRatePerPerson: 650, misc: 0,
      }, {
        conversations: 35, meetingRate: 20, dealRate: 15, avgDealValue: 12000,
      }),
      mk({
        name: 'Vertical SaaS Meetup — Chicago', organizer: 'Chicago SaaS Collective', location: 'Chicago, IL', category: 'Workshop',
        startDate: '2026-08-05', endDate: '2026-08-05', people: 1, exhibiting: false,
        status: 'go', decidedAt: Date.parse('2026-07-01'), decidedBy: 'Priya (VP Sales)',
        rationale: 'Free local meetup, near-zero cost, and the last two turned into real pipeline. Easy yes.',
        notes: 'Drive, do not fly — parking validated by the venue.',
      }, {
        ticketPerPerson: 0, flightsPerPerson: 0, hotelRate: 0, hotelNights: 0,
        groundPerPerson: 35, mealsPerDiemPerPerson: 40, dayRatePerPerson: 600,
        misc: 25, miscLabel: 'Business cards reprint',
      }, {
        conversations: 18, meetingRate: 45, dealRate: 25, avgDealValue: 14000,
      }),
      mk({
        name: 'GlobalTech Expo — Las Vegas', organizer: 'GlobalTech Media', location: 'Las Vegas, NV', category: 'Trade Show',
        startDate: '2027-01-20', endDate: '2027-01-23', people: 4, exhibiting: true,
        status: 'candidate',
        rationale: '',
        notes: 'Biggest ticket on the board this cycle. Booth deposit is due Aug 1 — need a decision before then. Run the pressure-test prompt before committing.',
      }, {
        ticketPerPerson: 900, flightsPerPerson: 340, hotelRate: 320, hotelNights: 4,
        groundPerPerson: 140, mealsPerDiemPerPerson: 85, dayRatePerPerson: 650,
        boothFee: 12500, boothBuild: 6200, boothCollateral: 2100, misc: 800, miscLabel: 'Lead-retrieval scanners x4',
      }, {
        conversations: 300, meetingRate: 12, dealRate: 10, avgDealValue: 22000,
      }),
      mk({
        name: 'Founders Retreat — Austin', organizer: 'Invite-only', location: 'Austin, TX', category: 'Summit',
        startDate: '2026-11-03', endDate: '2026-11-05', people: 1, exhibiting: false,
        status: 'candidate',
        rationale: '',
        notes: 'Small, invite-only, high-density enterprise founders. Steep ticket but the room is exactly our economic-buyer profile.',
      }, {
        ticketPerPerson: 3500, flightsPerPerson: 0, hotelRate: 0, hotelNights: 0,
        groundPerPerson: 60, mealsPerDiemPerPerson: 0, dayRatePerPerson: 650, misc: 0,
      }, {
        conversations: 12, meetingRate: 60, dealRate: 35, avgDealValue: 45000,
      }),
    ],
  });
}

/* ================================================================
   SERIALIZATION — markdown, csv, copilot prompts
================================================================ */
function eventMarkdown(ev) {
  const b = breakevenOf(ev);
  const v = varianceOf(ev);
  const lines = [];
  lines.push(`### ${ev.name || 'Untitled event'} — ${ev.location || 'location TBD'}`);
  lines.push('');
  lines.push(`- ${ev.category} · ${ev.startDate || 'dates TBD'}${ev.endDate && ev.endDate !== ev.startDate ? ` → ${ev.endDate}` : ''} · ${ev.people} attending${ev.exhibiting ? ' · exhibiting (booth)' : ''}`);
  lines.push(`- Status: **${STATUS_META[ev.status].label}**${ev.decidedBy ? ` · decided by ${ev.decidedBy}${ev.decidedAt ? ` on ${new Date(ev.decidedAt).toISOString().slice(0, 10)}` : ''}` : ''}`);
  lines.push('');
  lines.push('**Cost model**');
  lines.push('');
  lines.push('| Line | Amount |');
  lines.push('| --- | --- |');
  lines.push(`| Tickets | ${money(b.cost.ticket)} |`);
  lines.push(`| Travel (flights + hotel + ground + meals) | ${money(b.cost.travel)} |`);
  if (ev.exhibiting) lines.push(`| Booth (fee + build + collateral) | ${money(b.cost.booth)} |`);
  lines.push(`| Time (loaded, ${b.cost.days} day${b.cost.days === 1 ? '' : 's'} × ${ev.people} people) | ${money(b.cost.time)} |`);
  if (b.cost.misc) lines.push(`| Misc${ev.costs.miscLabel ? ` (${ev.costs.miscLabel})` : ''} | ${money(b.cost.misc)} |`);
  lines.push(`| **Total cost** | **${money(b.cost.total)}** |`);
  lines.push('');
  lines.push('**Pipeline model**');
  lines.push('');
  lines.push(`- ${round1(b.pipe.conversations)} expected conversations → ${b.pipe.meetingRate}% book a meeting (${round1(b.pipe.meetings)} meetings) → ${b.pipe.dealRate}% close (${round1(b.pipe.deals)} deals) at ${money(b.pipe.avgDealValue)} avg deal value`);
  lines.push(`- Pipeline created: **${money(Math.round(b.pipe.pipelineValue))}** · Expected revenue: **${money(Math.round(b.pipe.expectedRevenue))}**`);
  lines.push('');
  lines.push('**Breakeven**');
  lines.push('');
  lines.push(`- Breakeven deals needed: ${b.breakevenDeals != null ? round1(b.breakevenDeals) : '—'} · Breakeven meetings needed: ${b.breakevenMeetings != null ? round1(b.breakevenMeetings) : '—'}`);
  lines.push(`- Modeled ROI: **${Number.isFinite(b.roiPct) ? Math.round(b.roiPct) + '%' : '∞'}** · Net expected: ${money(Math.round(b.netExpected))}`);
  if (ev.rationale.trim()) { lines.push(''); lines.push(`Decision rationale: ${ev.rationale.trim()}`); }
  if (v) {
    lines.push('');
    lines.push('**Post-event actuals vs. plan**');
    lines.push('');
    lines.push('| Metric | Plan | Actual | Delta |');
    lines.push('| --- | --- | --- | --- |');
    lines.push(`| Cost | ${money(b.cost.total)} | ${money(v.actualCost)} | ${deltaStr(v.costDelta, 'money')} |`);
    lines.push(`| Conversations | ${round1(b.pipe.conversations)} | ${v.actualConversations} | ${deltaStr(v.conversationsDelta)} |`);
    lines.push(`| Meetings | ${round1(b.pipe.meetings)} | ${v.actualMeetings} | ${deltaStr(v.meetingsDelta)} |`);
    lines.push(`| Deals | ${round1(b.pipe.deals)} | ${v.actualDeals} | ${deltaStr(v.dealsDelta)} |`);
    lines.push(`| Revenue | ${money(Math.round(b.pipe.expectedRevenue))} | ${money(v.actualRevenue)} | ${deltaStr(v.revenueDelta, 'money')} |`);
    lines.push(`| ROI | ${Number.isFinite(b.roiPct) ? Math.round(b.roiPct) + '%' : '∞'} | ${Number.isFinite(v.actualRoi) ? Math.round(v.actualRoi) + '%' : '∞'} | — |`);
    if (ev.actuals.notes.trim()) { lines.push(''); lines.push(`Actuals notes: ${ev.actuals.notes.trim()}`); }
  }
  if (ev.notes.trim()) { lines.push(''); lines.push(`Notes: ${ev.notes.trim()}`); }
  return lines.join('\n');
}

function portfolioMarkdown(state) {
  const { events } = state;
  const lines = [];
  lines.push('# Flight Log — Conference ROI Planner');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString().slice(0, 10)} · ${events.length} event${events.length === 1 ? '' : 's'} logged`);
  lines.push('');
  const committed = events.filter((e) => e.status === 'go' || e.status === 'flown');
  const totalCommitted = committed.reduce((s, e) => s + breakevenOf(e).cost.total, 0);
  const totalExpectedRevenue = committed.reduce((s, e) => s + breakevenOf(e).pipe.expectedRevenue, 0);
  lines.push(`- Committed spend (Cleared + Flown): **${money(totalCommitted)}**`);
  lines.push(`- Expected revenue (Cleared + Flown): **${money(Math.round(totalExpectedRevenue))}**`);
  lines.push(`- Portfolio ROI: **${totalCommitted > 0 ? Math.round(((totalExpectedRevenue - totalCommitted) / totalCommitted) * 100) + '%' : '—'}**`);
  lines.push('');
  lines.push('| Event | Status | Dates | Cost | Expected revenue | ROI |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const e of events) {
    const b = breakevenOf(e);
    lines.push(`| ${e.name || 'Untitled'} | ${STATUS_META[e.status].label} | ${e.startDate || 'TBD'} | ${money(b.cost.total)} | ${money(Math.round(b.pipe.expectedRevenue))} | ${Number.isFinite(b.roiPct) ? Math.round(b.roiPct) + '%' : '∞'} |`);
  }
  lines.push('');
  lines.push('---');
  for (const e of events) { lines.push(''); lines.push(eventMarkdown(e)); }
  return lines.join('\n');
}

function csvOf(state) {
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const head = ['name', 'category', 'location', 'start_date', 'end_date', 'people', 'exhibiting', 'status',
    'total_cost', 'conversations', 'meetings', 'deals', 'expected_revenue', 'roi_pct', 'breakeven_deals',
    'actual_logged', 'actual_cost', 'actual_conversations', 'actual_meetings', 'actual_deals', 'actual_revenue', 'actual_roi_pct'];
  const rows = state.events.map((e) => {
    const b = breakevenOf(e);
    const v = varianceOf(e);
    return [
      e.name, e.category, e.location, e.startDate, e.endDate, e.people, e.exhibiting ? 'yes' : 'no', STATUS_META[e.status].label,
      Math.round(b.cost.total), round1(b.pipe.conversations), round1(b.pipe.meetings), round1(b.pipe.deals), Math.round(b.pipe.expectedRevenue),
      Number.isFinite(b.roiPct) ? Math.round(b.roiPct) : '', b.breakevenDeals != null ? round1(b.breakevenDeals) : '',
      v ? 'yes' : 'no', v ? Math.round(v.actualCost) : '', v ? v.actualConversations : '', v ? v.actualMeetings : '', v ? v.actualDeals : '', v ? Math.round(v.actualRevenue) : '',
      v && Number.isFinite(v.actualRoi) ? Math.round(v.actualRoi) : '',
    ].map(esc).join(',');
  });
  return [head.join(','), ...rows].join('\n');
}

/* ---- Copilot prompt builders ---- */
const COPILOT_HINT = 'Paste into claude.ai — works with the standard Claude subscription. No API key needed.';

function promptTargetList(ev) {
  const pipe = pipelineModel(ev);
  return `You are a senior B2B event strategist who has run account-based target lists for hundreds of conference sponsorships and attendances. You are ruthless about only chasing accounts that justify the travel cost.

I am planning to attend the following event. Here is my full event dossier, exported from my Conference ROI Planner:

${eventMarkdown(ev)}

Build my target list for this event:

1. **Target account profile** — infer the 3-4 firmographic/role patterns most likely to attend an event like this (industry, company size, buyer titles), based on the event name, category, and location.
2. **Target list** — 20 named-or-typed target accounts/attendee patterns I should research and try to meet, grouped into "must-meet" (aligns tightly with my ICP and deal size) and "opportunistic" (worth a conversation if I run into them). For each, one line on why they are worth 10 minutes of my conference time.
3. **Pre-event research checklist** — the 5 things I should look up about each must-meet target before the event (LinkedIn signals, recent funding/news, job postings, etc.).
4. **Booth/session strategy** — if I am ${ev.exhibiting ? 'exhibiting' : 'attending without a booth'}, the 3 highest-leverage ways to get in front of these targets given that constraint.

Format: four numbered sections, tight bullets, no filler. Assume I have ${ev.people} people attending and ${Math.round(pipe.conversations)} conversations budgeted across the event — size the list accordingly.`;
}

function promptOutreach(ev) {
  const b = breakevenOf(ev);
  return `You are an outbound copywriter who specializes in pre-event outreach that actually books meetings, not "let's grab coffee" messages that get ignored.

Here is my event dossier, exported from my Conference ROI Planner:

${eventMarkdown(ev)}

I need to book ${Math.max(1, Math.round(b.pipe.meetings))} meetings at this event to hit my modeled pipeline. Draft the pre-event outreach:

1. **LinkedIn connection + note** (under 300 characters) — for a cold target who will be at the event.
2. **Email version** — subject line + 3-sentence body, referencing the event by name, proposing a specific meeting format (e.g., "15 minutes at your booth" or "coffee near registration"), for someone I have some context on already.
3. **Warm re-engagement message** — for an existing contact/lead I want to convert into a meeting at this event.
4. **Follow-up nudge** — a short bump message to send 3-4 days before the event to anyone who has not responded.
5. **Booking-line** — one sentence I can drop into any of the above if I want them to grab a slot directly instead of replying.

Format: five labeled sections, each with the message text ready to copy-paste. Keep every message under 120 words. Do not invent facts about specific people — write templates with clear [bracketed] placeholders where personalization is needed.`;
}

function promptPostEventReport(ev) {
  const v = varianceOf(ev);
  return `You are a revenue operations lead who writes internal post-event reports that get read, not skimmed. You lead with the number that matters and you do not bury bad news.

Here is my full event dossier, exported from my Conference ROI Planner${v ? ', including plan vs. actuals' : ''}:

${eventMarkdown(ev)}

${v ? '' : 'Note: actuals have not been logged yet in the app — write the report assuming the plan numbers held, and flag clearly wherever a number is a placeholder pending real results.\n\n'}Write the post-event report:

- **Headline verdict** (first line) — one sentence: did this event pay for itself, and by how much.
- **The numbers** — plan vs. actual for cost, conversations, meetings, deals, and revenue, in a short table, with the ROI delta called out.
- **What worked** — the 2-3 things that most drove the result (positive or negative).
- **What I'd change** — specific, actionable changes for next time (booth placement, target list, follow-up speed, staffing) — not generic advice.
- **Recommendation** — should we attend this event again next year? At what investment level, and with what changes?
- **Follow-up plan** — the top 5 conversations/leads from this event and the next action owed to each (use placeholders if I have not listed names).

Format: the sections above with bold headers, under 350 words total, plain language a CFO would trust.`;
}

function promptPressureTest(ev) {
  const b = breakevenOf(ev);
  return `You are a skeptical CFO who has seen too many "this conference will pay for itself" pitches fall apart in the room. Your job is to find the weak assumptions in this business case before money is committed.

Here is the event's full cost and pipeline model, exported from my Conference ROI Planner:

${eventMarkdown(ev)}

The model currently shows a modeled ROI of ${Number.isFinite(b.roiPct) ? Math.round(b.roiPct) + '%' : 'an undefined (zero-cost) result'}, needing ${b.breakevenDeals != null ? Math.ceil(b.breakevenDeals) : 'an unknown number of'} closed deals to break even.

Pressure-test this business case:

1. **Weakest assumption** — the single number in this model most likely to be wrong (usually the conversation count or a conversion rate), and why.
2. **Sensitivity check** — show what happens to the ROI if the meeting rate and deal rate are each 30% lower than modeled, and what happens if the average deal value is 30% lower. Do the arithmetic using the numbers in the dossier.
3. **Hidden costs** — 3 real costs teams typically forget to model for an event like this (be specific to the category, and to whether they are exhibiting).
4. **Better bet?** — one honest sentence on whether this is likely a good use of the budget compared to spending the same amount on cold outbound or paid ads, given the numbers shown.
5. **Verdict** — GO, HOLD, or NO-GO, with the one condition that would change your mind.

Format: five numbered sections, blunt, no encouragement for its own sake. Show your arithmetic rather than just asserting conclusions.`;
}

/* ================================================================
   CLIPBOARD HELPERS
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
   SIGNATURE SVG — flight-plan visuals
================================================================ */
function PlaneMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none">
      <circle cx="32" cy="32" r="29" fill="var(--color-sky-800)" stroke="var(--color-sky-500)" strokeWidth="1.5" />
      <g stroke="var(--color-sky-600)" strokeWidth="0.6" opacity="0.6">
        <line x1="32" y1="6" x2="32" y2="58" />
        <line x1="6" y1="32" x2="58" y2="32" />
        <circle cx="32" cy="32" r="20" fill="none" />
        <circle cx="32" cy="32" r="11" fill="none" />
      </g>
      <g transform="translate(32 32) rotate(-40)">
        <path d="M0 -19 L4 -6 L20 2 L20 6 L4 1 L4 12 L10 17 L10 20 L0 16.5 L-10 20 L-10 17 L-4 12 L-4 1 L-20 6 L-20 2 L-4 -6 Z" fill="var(--color-runway)" stroke="var(--color-sky-950)" strokeWidth="1" />
      </g>
      <circle cx="32" cy="32" r="29" fill="none" stroke="var(--color-sky-300)" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

function RouteHero({ events }) {
  const sorted = [...events].sort((a, b) => (a.startDate || '9999').localeCompare(b.startDate || '9999'));
  const n = sorted.length;
  if (n === 0) return null;
  const W = Math.max(560, n * 128);
  const H = 176;
  const baseY = 96, amp = 24;
  const pts = sorted.map((e, i) => ({
    e, i,
    x: 60 + i * ((W - 120) / Math.max(1, n - 1 || 1)),
    y: baseY + Math.sin(i * 1.1) * amp,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const mid = pts[Math.floor((n - 1) / 2)];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: W }} role="img" aria-label="Flight route of planned events, ordered by date">
      <g transform="translate(40 40)" opacity="0.35">
        <circle r="17" fill="none" stroke="var(--color-sky-500)" strokeWidth="1" />
        <line x1="0" y1="-17" x2="0" y2="17" stroke="var(--color-sky-500)" strokeWidth="0.8" />
        <line x1="-17" y1="0" x2="17" y2="0" stroke="var(--color-sky-500)" strokeWidth="0.8" />
        <text x="0" y="-21" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="7" fill="var(--color-sky-400)">N</text>
      </g>
      <path d={pathD} fill="none" stroke="var(--color-sky-400)" strokeWidth="1.6" strokeDasharray="2 7" strokeLinecap="round" />
      {mid && (
        <g transform={`translate(${mid.x} ${mid.y - 30})`}>
          <path d="M0 -8 L2.5 -2 L11 1 L11 3 L2.5 1 L2.5 6 L5.5 9 L5.5 10.5 L0 8.5 L-5.5 10.5 L-5.5 9 L-2.5 6 L-2.5 1 L-11 3 L-11 1 L-2.5 -2 Z" fill="var(--color-sky-200)" opacity="0.85" />
        </g>
      )}
      {pts.map(({ e, x, y, i }) => {
        const tone = STATUS_META[e.status].tone;
        const color = TONE_VAR[tone];
        const b = breakevenOf(e);
        const down = i % 2 === 0;
        const label = (e.name || 'Untitled').length > 16 ? `${(e.name || 'Untitled').slice(0, 15)}…` : (e.name || 'Untitled');
        return (
          <g key={e.id}>
            <line x1={x} y1={y} x2={x} y2={y + (down ? 34 : -34)} stroke="var(--color-sky-600)" strokeWidth="1" strokeDasharray="1.5 3" />
            <circle cx={x} cy={y} r="11" fill="none" stroke={color} strokeWidth="1" opacity="0.4" />
            <circle cx={x} cy={y} r="7" fill={color} stroke="var(--color-sky-950)" strokeWidth="1.5" />
            <text x={x} y={y + (down ? 48 : -42)} textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700" fontSize="10" fill="var(--color-sky-100)">{label}</text>
            <text x={x} y={y + (down ? 60 : -30)} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill="var(--color-sky-300)">{Number.isFinite(b.roiPct) ? `${Math.round(b.roiPct)}% ROI` : '∞ ROI'}</text>
          </g>
        );
      })}
    </svg>
  );
}

function AltitudeTape({ value, label = 'ROI', unit = '%', min = -100, max = 200, height = 170 }) {
  const w = 92;
  const finite = Number.isFinite(value);
  const vClamped = finite ? clamp(value, min, max) : max;
  const range = max - min;
  const yFor = (v) => height - ((v - min) / range) * (height - 20) - 10;
  const step = range <= 150 ? 25 : 50;
  const ticks = [];
  for (let t = Math.ceil(min / step) * step; t <= max; t += step) {
    const y = yFor(t);
    ticks.push(
      <g key={t}>
        <line x1={w - 24} y1={y} x2={w - 12} y2={y} stroke="var(--color-sky-400)" strokeWidth="1" />
        <text x={w - 28} y={y + 3} textAnchor="end" fontFamily="var(--font-mono)" fontSize="8" fill="var(--color-sky-300)">{t}</text>
      </g>
    );
  }
  const pointerY = yFor(vClamped);
  const tone = !finite ? 'go' : value >= ROI_GO_THRESHOLD ? 'go' : value >= ROI_HOLD_THRESHOLD ? 'hold' : 'nogo';
  const toneColor = `var(--color-${tone})`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width={w} height={height} role="img" aria-label={`${label} ${finite ? Math.round(value) : 'unlimited'} ${unit}`}>
      <rect x="1.5" y="1.5" width={w - 3} height={height - 3} rx="4" fill="var(--color-sky-950)" stroke="var(--color-sky-700)" />
      <line x1="0" y1={yFor(0)} x2={w} y2={yFor(0)} stroke="var(--color-sky-500)" strokeWidth="1" strokeDasharray="2 3" />
      {ticks}
      <g transform={`translate(0 ${pointerY})`}>
        <path d={`M${w - 12} 0 L${w - 3} -9 L${w - 3} 9 Z`} fill={toneColor} />
        <rect x="4" y="-11" width={w - 18} height="22" rx="3" fill={toneColor} />
        <text x={4 + (w - 18) / 2} y="4" textAnchor="middle" fontFamily="var(--font-mono)" fontWeight="700" fontSize="11.5" fill="var(--color-sky-950)">
          {finite ? `${value > 0 ? '+' : ''}${Math.round(value)}` : '∞'}
        </text>
      </g>
      <text x={w / 2} y={height - 5} textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700" fontSize="7.5" letterSpacing="1.5" fill="var(--color-sky-300)">{label.toUpperCase()} {unit}</text>
    </svg>
  );
}

function RunwayBar({ cost, revenue }) {
  const width = 520, height = 62;
  const max = Math.max(cost, revenue, 1) * 1.12;
  const scale = (v) => (v / max) * (width - 20);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={`Modeled cost ${money(cost)} versus expected revenue ${money(revenue)}`}>
      <rect x="10" y={height / 2 - 10} width={width - 20} height="20" fill="var(--color-sky-950)" stroke="var(--color-sky-700)" />
      <line x1="10" y1={height / 2} x2={width - 10} y2={height / 2} stroke="var(--color-sky-600)" strokeWidth="1" strokeDasharray="10 8" />
      <rect x="10" y={height / 2 - 8} width={Math.max(0, scale(cost))} height="7" fill="var(--color-nogo)" opacity="0.85" />
      <rect x="10" y={height / 2 + 1} width={Math.max(0, scale(revenue))} height="7" fill="var(--color-go)" opacity="0.85" />
      <line x1={10 + scale(cost)} y1={height / 2 - 16} x2={10 + scale(cost)} y2={height / 2 + 16} stroke="var(--color-runway)" strokeWidth="2" />
      <text x={10 + scale(cost)} y={height / 2 - 20} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="8.5" fill="var(--color-runway)">BREAKEVEN</text>
      <text x="12" y={height - 4} fontFamily="var(--font-mono)" fontSize="9" fill="var(--color-nogo)">{money(cost)} cost</text>
      <text x={width - 12} y={height - 4} textAnchor="end" fontFamily="var(--font-mono)" fontSize="9" fill="var(--color-go)">{money(Math.round(revenue))} expected</text>
    </svg>
  );
}

function MiniStack({ cost, big }) {
  const total = Math.max(1, cost.total);
  const segs = [
    { v: cost.ticket, c: 'var(--color-sky-400)' },
    { v: cost.travel, c: 'var(--color-sky-300)' },
    { v: cost.booth, c: 'var(--color-magenta)' },
    { v: cost.time, c: 'var(--color-hold)' },
    { v: cost.misc, c: 'var(--color-sky-600)' },
  ].filter((s) => s.v > 0);
  let x = 0;
  return (
    <svg viewBox="0 0 100 6" className={`w-full ${big ? 'h-2.5' : 'h-1.5'}`} role="img" aria-label="Cost composition">
      <rect x="0" y="0" width="100" height="6" rx="1" fill="var(--color-sky-950)" />
      {segs.map((s, i) => { const w = (s.v / total) * 100; const r = <rect key={i} x={x} y="0" width={w} height="6" fill={s.c} />; x += w; return r; })}
    </svg>
  );
}

function FunnelBars({ conversations, meetings, deals }) {
  const max = Math.max(conversations, 1);
  const rows = [
    { label: 'Conversations', v: conversations, color: 'var(--color-sky-400)' },
    { label: 'Meetings', v: meetings, color: 'var(--color-hold)' },
    { label: 'Deals', v: deals, color: 'var(--color-go)' },
  ];
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="label-tape text-sky-400">{r.label}</span>
            <span className="font-mono-tab text-sky-100">{round1(r.v)}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full border border-sky-700 bg-sky-950">
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, (r.v / max) * 100)}%`, background: r.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   SMALL UI ATOMS
================================================================ */
function StatusBadge({ status, small }) {
  const meta = STATUS_META[status];
  const toneCls = {
    scout: 'border-sky-300/60 text-sky-300 bg-sky-300/10',
    go: 'border-go/60 text-go bg-go/10',
    nogo: 'border-nogo/60 text-nogo bg-nogo/10',
    flown: 'border-runway/60 text-runway bg-runway/10',
  }[meta.tone];
  return <span className={`placard inline-flex items-center ${toneCls} ${small ? 'text-[9px] px-1.5 py-0.5' : 'text-[11px]'}`}>{meta.label}</span>;
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="label-tape mb-1 block text-[9px] text-sky-400">{label}</span>
      {children}
    </label>
  );
}

function NumField({ label, value, onChange, prefix, suffix, hint }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-1 rounded border border-sky-700 bg-sky-950 px-2.5 py-2 focus-within:border-sky-300">
        {prefix && <span className="shrink-0 text-xs text-sky-500">{prefix}</span>}
        <input type="number" inputMode="decimal" min="0" step="1" value={value || ''}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
          placeholder="0"
          className="w-full min-w-0 bg-transparent font-mono-tab text-sm text-sky-100 outline-none placeholder:text-sky-700" />
        {suffix && <span className="shrink-0 text-xs text-sky-500">{suffix}</span>}
      </div>
      {hint && <span className="mt-1 block text-[10px] leading-snug text-sky-500">{hint}</span>}
    </Field>
  );
}

function TextField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <Field label={label}>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded border border-sky-700 bg-sky-950 px-2.5 py-2 text-sm text-sky-100 outline-none placeholder:text-sky-700 focus:border-sky-300" />
    </Field>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-sky-700 bg-sky-950 px-2.5 py-2 text-sm text-sky-100 outline-none focus:border-sky-300">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <Field label={label}>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded border border-sky-700 bg-sky-950 px-2.5 py-2 text-sm text-sky-100 outline-none placeholder:text-sky-600 focus:border-sky-300" />
    </Field>
  );
}

function Slider({ label, value, onChange, suffix = '%' }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between">
        <span className="label-tape text-[9px] text-sky-400">{label}</span>
        <span className="font-mono-tab text-xs text-sky-200">{value}{suffix}</span>
      </div>
      <input type="range" min="0" max="100" value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-[var(--color-runway)]" aria-label={label} />
    </label>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="label-tape text-[9px] text-sky-400">{label}</span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${checked ? 'border-runway bg-runway/40' : 'border-sky-700 bg-sky-950'}`}>
        <span className="absolute top-0.5 h-3.5 w-3.5 rounded-full bg-sky-100 transition-transform"
          style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }} />
      </button>
    </div>
  );
}

function CostLine({ label, v, c }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c }} aria-hidden />
      <span className="text-sky-400">{label}</span>
      <span className="ml-auto font-mono-tab text-sky-200">{money(v)}</span>
    </div>
  );
}

function MiniStat({ label, value, tone }) {
  return (
    <div>
      <span className="label-tape block text-[9px] text-sky-400">{label}</span>
      <span className={`font-mono-tab text-base font-bold ${tone === 'go' ? 'text-go' : 'text-sky-100'}`}>{value}</span>
    </div>
  );
}

function VarianceRow({ label, plan, actual, delta, good }) {
  return (
    <tr className="border-t border-sky-800">
      <td className="py-1.5 pr-3 text-sky-400">{label}</td>
      <td className="py-1.5 pr-3">{plan}</td>
      <td className="py-1.5 pr-3">{actual}</td>
      <td className={`py-1.5 ${good ? 'text-go' : 'text-nogo'}`}>{delta}</td>
    </tr>
  );
}

function BudgetBar({ committed, cap }) {
  if (!cap) return null;
  const pct = Math.round((committed / cap) * 100);
  const over = committed > cap;
  return (
    <svg viewBox="0 0 220 14" className="mt-1 w-full max-w-[220px]" role="img" aria-label={`Committed spend is ${pct} percent of annual budget`}>
      <rect x="0" y="4" width="200" height="6" rx="3" fill="var(--color-sky-950)" stroke="var(--color-sky-700)" strokeWidth="0.6" />
      <rect x="0" y="4" width={Math.min(200, (committed / cap) * 200)} height="6" rx="3" fill={over ? 'var(--color-nogo)' : 'var(--color-go)'} />
      <line x1="200" y1="0" x2="200" y2="14" stroke="var(--color-runway)" strokeWidth="1.4" />
      <text x="204" y="11" fontSize="9" fontFamily="var(--font-mono)" fill={over ? 'var(--color-nogo)' : 'var(--color-sky-300)'}>{pct}%</text>
    </svg>
  );
}

function Stat({ label, value, sub, tone }) {
  const toneCls = tone === 'go' ? 'text-go' : tone === 'nogo' ? 'text-nogo' : tone === 'hold' ? 'text-hold' : 'text-sky-100';
  return (
    <div>
      <span className="label-tape text-[10px] text-sky-400">{label}</span>
      <div className={`font-mono-tab text-lg font-semibold leading-tight ${toneCls}`}>{value}</div>
      <span className="text-[10px] text-sky-500">{sub}</span>
    </div>
  );
}

function EventCard({ e, b, active, onClick }) {
  return (
    <button onClick={onClick} aria-current={active}
      className={`group w-full rounded-md border px-3 py-2.5 text-left transition-colors ${active ? 'border-sky-300/70 bg-sky-800' : 'border-sky-700 bg-sky-900 hover:border-sky-500'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold text-sky-100">{e.name || 'Untitled event'}</p>
          <p className="truncate text-[11px] text-sky-400">{e.location || 'Location TBD'} · {e.startDate || 'Dates TBD'}</p>
        </div>
        <StatusBadge status={e.status} small />
      </div>
      <div className="mt-2"><MiniStack cost={b.cost} /></div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono-tab">
        <span className="text-sky-400">{money(b.cost.total)}</span>
        <span className={Number.isFinite(b.roiPct) ? (b.roiPct >= ROI_GO_THRESHOLD ? 'text-go' : b.roiPct >= ROI_HOLD_THRESHOLD ? 'text-hold' : 'text-nogo') : 'text-go'}>
          {Number.isFinite(b.roiPct) ? `${b.roiPct > 0 ? '+' : ''}${Math.round(b.roiPct)}% ROI` : '∞ ROI'}
        </span>
      </div>
    </button>
  );
}

function EmptyLog({ onDemo, onNew }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <PlaneMark className="h-10 w-10 opacity-70" />
      <p className="text-sm text-sky-300">No events on the board yet. Log a candidate — even a rough guess at cost and pipeline beats FOMO.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button onClick={onNew} className="label-tape inline-flex items-center gap-1 rounded bg-runway px-3 py-1.5 text-[11px] font-bold text-sky-950 hover:brightness-110">
          <Plus className="h-3.5 w-3.5" aria-hidden /> Add your first event
        </button>
        <button onClick={onDemo} className="label-tape rounded border border-sky-700 px-3 py-1.5 text-[11px] text-sky-200 hover:border-sky-300/70 hover:text-sky-100">
          Load demo
        </button>
      </div>
    </div>
  );
}

function EmptyDossier({ events, onNew }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 p-8 text-center">
      {events.length > 0 ? (
        <div className="w-full overflow-x-auto"><RouteHero events={events} /></div>
      ) : (
        <PlaneMark className="h-14 w-14 opacity-70" />
      )}
      <h2 className="font-display text-lg font-bold uppercase tracking-wide text-sky-100">
        {events.length ? 'Pick an event from the Flight Log' : 'File your first flight plan'}
      </h2>
      <p className="max-w-md text-sm leading-relaxed text-sky-400">
        {events.length
          ? 'Select any waypoint on the left to open its cost model, pipeline forecast, breakeven view, and go/no-go record.'
          : 'A conference is a bet: real dollars against a guess about pipeline. Log the cost, model the pipeline, and let the breakeven math make the call — not the FOMO.'}
      </p>
      {!events.length && (
        <button onClick={onNew} className="label-tape mt-1 inline-flex items-center gap-1.5 rounded bg-runway px-4 py-2 text-[11px] font-bold text-sky-950 hover:brightness-110">
          <Plus className="h-4 w-4" aria-hidden /> Add your first event
        </button>
      )}
    </div>
  );
}

/* ================================================================
   DOSSIER TABS
================================================================ */
function CostTab({ event, b, onPatch, onPatchCosts }) {
  const c = event.costs;
  return (
    <div className="space-y-5">
      <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <TextField label="Location" value={event.location} onChange={(v) => onPatch({ location: v })} placeholder="Austin, TX" />
        <SelectField label="Category" value={event.category} onChange={(v) => onPatch({ category: v })} options={CATEGORIES} />
        <TextField label="Start date" type="date" value={event.startDate} onChange={(v) => onPatch({ startDate: v })} />
        <TextField label="End date" type="date" value={event.endDate} onChange={(v) => onPatch({ endDate: v })} />
        <NumField label="People attending" value={event.people} onChange={(v) => onPatch({ people: Math.max(1, Math.round(v) || 1) })} suffix="ppl" />
        <div className="flex items-end pb-2"><Toggle checked={event.exhibiting} onChange={(v) => onPatch({ exhibiting: v })} label="Exhibiting" /></div>
      </div>
      <p className="text-[11px] text-sky-500">
        Modeled as {b.cost.days} day{b.cost.days === 1 ? '' : 's'} on site{(!event.startDate || !event.endDate) ? ' — set both dates to model the real span' : ''}.
      </p>

      <div>
        <h3 className="label-tape text-[10px] text-sky-400">Tickets & travel</h3>
        <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
          <NumField label="Ticket / pass, per person" value={c.ticketPerPerson} onChange={(v) => onPatchCosts({ ticketPerPerson: v })} prefix="$" />
          <NumField label="Flights, per person" value={c.flightsPerPerson} onChange={(v) => onPatchCosts({ flightsPerPerson: v })} prefix="$" />
          <NumField label="Ground transport, per person" value={c.groundPerPerson} onChange={(v) => onPatchCosts({ groundPerPerson: v })} prefix="$" />
          <NumField label="Hotel, per room-night" value={c.hotelRate} onChange={(v) => onPatchCosts({ hotelRate: v })} prefix="$" />
          <NumField label="Hotel nights" value={c.hotelNights} onChange={(v) => onPatchCosts({ hotelNights: v })} />
          <NumField label="Meals per diem, per person/day" value={c.mealsPerDiemPerPerson} onChange={(v) => onPatchCosts({ mealsPerDiemPerPerson: v })} prefix="$" />
        </div>
      </div>

      {event.exhibiting && (
        <div className="rounded-md border border-magenta/30 bg-magenta/5 p-3">
          <h3 className="label-tape text-[10px] text-magenta">Booth</h3>
          <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
            <NumField label="Booth / sponsorship fee" value={c.boothFee} onChange={(v) => onPatchCosts({ boothFee: v })} prefix="$" />
            <NumField label="Build & design" value={c.boothBuild} onChange={(v) => onPatchCosts({ boothBuild: v })} prefix="$" />
            <NumField label="Collateral & swag" value={c.boothCollateral} onChange={(v) => onPatchCosts({ boothCollateral: v })} prefix="$" />
          </div>
        </div>
      )}

      <div>
        <h3 className="label-tape text-[10px] text-sky-400">Time & misc</h3>
        <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
          <NumField label="Loaded day rate, per person" value={c.dayRatePerPerson} onChange={(v) => onPatchCosts({ dayRatePerPerson: v })} prefix="$"
            hint="What a fully-loaded day of this person's time is worth if they were selling instead of traveling." />
          <NumField label="Misc / other" value={c.misc} onChange={(v) => onPatchCosts({ misc: v })} prefix="$" />
          <TextField label="Misc label" value={c.miscLabel} onChange={(v) => onPatchCosts({ miscLabel: v })} placeholder="Lead scanners, printing…" />
        </div>
      </div>

      <div className="panel-sunk rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h3 className="label-tape text-[10px] text-sky-400">Total modeled cost</h3>
          <span className="font-mono-tab text-2xl font-bold text-sky-100">{money(b.cost.total)}</span>
        </div>
        <div className="mt-3"><MiniStack cost={b.cost} big /></div>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] sm:grid-cols-4">
          <CostLine label="Tickets" v={b.cost.ticket} c="var(--color-sky-400)" />
          <CostLine label="Travel" v={b.cost.travel} c="var(--color-sky-300)" />
          {event.exhibiting && <CostLine label="Booth" v={b.cost.booth} c="var(--color-magenta)" />}
          <CostLine label="Time" v={b.cost.time} c="var(--color-hold)" />
          {b.cost.misc > 0 && <CostLine label="Misc" v={b.cost.misc} c="var(--color-sky-600)" />}
        </div>
      </div>

      <TextArea label="Notes" value={event.notes} onChange={(v) => onPatch({ notes: v })} placeholder="Why this event, context for future you…" />
    </div>
  );
}

function PipelineTab({ event, b, onPatchPipeline }) {
  const p = event.pipeline;
  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed text-sky-400">
        Model the funnel you actually expect from standing at this event: conversations you can realistically have, how many turn into a real meeting, and how many meetings turn into a closed deal.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumField label="Expected conversations" value={p.conversations} onChange={(v) => onPatchPipeline({ conversations: v })}
          hint="A realistic count across every person attending, for the whole event." />
        <NumField label="Average deal value" value={p.avgDealValue} onChange={(v) => onPatchPipeline({ avgDealValue: v })} prefix="$" />
        <Slider label="Conversation → meeting rate" value={p.meetingRate} onChange={(v) => onPatchPipeline({ meetingRate: v })} />
        <Slider label="Meeting → deal rate" value={p.dealRate} onChange={(v) => onPatchPipeline({ dealRate: v })} />
      </div>
      <div className="panel-sunk rounded-lg p-4">
        <h3 className="label-tape text-[10px] text-sky-400">Funnel</h3>
        <div className="mt-3"><FunnelBars conversations={b.pipe.conversations} meetings={b.pipe.meetings} deals={b.pipe.deals} /></div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Meetings" value={round1(b.pipe.meetings)} />
          <MiniStat label="Deals" value={round1(b.pipe.deals)} />
          <MiniStat label="Pipeline created" value={money(Math.round(b.pipe.pipelineValue))} />
          <MiniStat label="Expected revenue" value={money(Math.round(b.pipe.expectedRevenue))} tone="go" />
        </div>
      </div>
    </div>
  );
}

function DecideButton({ active, tone, label, icon: Icon, onClick }) {
  const cls = { scout: 'border-sky-300/70 bg-sky-300/15 text-sky-200', go: 'border-go/70 bg-go/15 text-go', nogo: 'border-nogo/70 bg-nogo/15 text-nogo' }[tone];
  return (
    <button onClick={onClick} aria-pressed={active} className={`label-tape inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] ${active ? cls : 'border-sky-700 text-sky-400 hover:border-sky-500'}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
    </button>
  );
}

function DecisionTab({ event, b, call, onPatch, onDecide }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="panel-sunk rounded-lg p-4">
          <h3 className="label-tape text-[10px] text-sky-400">Cost vs. expected revenue</h3>
          <div className="mt-3"><RunwayBar cost={b.cost.total} revenue={b.pipe.expectedRevenue} /></div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Breakeven deals" value={b.breakevenDeals != null ? round1(b.breakevenDeals) : '—'} />
            <MiniStat label="Breakeven meetings" value={b.breakevenMeetings != null ? round1(b.breakevenMeetings) : '—'} />
            <MiniStat label="Cost / conversation" value={b.costPerConversation != null ? money(Math.round(b.costPerConversation)) : '—'} />
            <MiniStat label="Net expected" value={money(Math.round(b.netExpected))} tone={b.netExpected >= 0 ? 'go' : undefined} />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-1">
          <AltitudeTape value={b.roiPct} label="ROI" height={220} />
        </div>
      </div>

      <div className={`rounded-lg border p-4 ${call.tone === 'go' ? 'border-go/50 bg-go/8' : call.tone === 'nogo' ? 'border-nogo/50 bg-nogo/8' : 'border-hold/50 bg-hold/8'}`}>
        <span className="label-tape text-[9px] text-sky-400">Suggested call</span>
        <p className={`mt-0.5 font-display text-lg font-bold ${call.tone === 'go' ? 'text-go' : call.tone === 'nogo' ? 'text-nogo' : 'text-hold'}`}>{call.key}</p>
        <p className="mt-1 text-xs text-sky-300">{call.note}</p>
      </div>

      <div>
        <h3 className="label-tape text-[10px] text-sky-400">Go / no-go record</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <DecideButton active={event.status === 'candidate'} tone="scout" label="Scouting" icon={Compass} onClick={() => onDecide('candidate')} />
          <DecideButton active={event.status === 'go'} tone="go" label="GO" icon={CheckCircle2} onClick={() => onDecide('go')} />
          <DecideButton active={event.status === 'no-go'} tone="nogo" label="NO-GO" icon={XCircle} onClick={() => onDecide('no-go')} />
        </div>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <TextField label="Decided by" value={event.decidedBy} onChange={(v) => onPatch({ decidedBy: v })} placeholder="Who made the call" />
          <div>
            <span className="label-tape mb-1 block text-[9px] text-sky-400">Decided on</span>
            <p className="font-mono-tab text-sm text-sky-300">{event.decidedAt ? new Date(event.decidedAt).toISOString().slice(0, 10) : 'Not yet decided'}</p>
          </div>
        </div>
        <div className="mt-3">
          <TextArea label="Rationale" value={event.rationale} onChange={(v) => onPatch({ rationale: v })}
            placeholder="Why this call — the number that decided it, or the risk that killed it." rows={3} />
        </div>
      </div>
    </div>
  );
}

function ActualsTab({ event, b, v, onPatchActuals, onLogActuals, onClearActuals }) {
  if (!event.actuals.logged) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-sky-700 px-6 py-12 text-center">
        <ClipboardList className="h-8 w-8 text-sky-500" aria-hidden />
        <h3 className="font-display text-base font-bold text-sky-100">No actuals logged</h3>
        <p className="max-w-sm text-xs leading-relaxed text-sky-400">
          Once you're back from the event, log what really happened — cost, conversations, meetings, deals, revenue — and see the plan-vs-actual variance.
        </p>
        <button onClick={onLogActuals} className="label-tape mt-1 inline-flex items-center gap-1.5 rounded bg-runway px-3 py-2 text-[11px] font-bold text-sky-950 hover:brightness-110">
          <PlaneLanding className="h-4 w-4" aria-hidden /> Log actuals now
        </button>
      </div>
    );
  }
  const a = event.actuals;
  return (
    <div className="space-y-5">
      <div className="grid gap-2.5 sm:grid-cols-3">
        <NumField label="Actual total cost" value={a.cost} onChange={(val) => onPatchActuals({ cost: val })} prefix="$" />
        <NumField label="Actual conversations" value={a.conversations} onChange={(val) => onPatchActuals({ conversations: val })} />
        <NumField label="Actual meetings booked" value={a.meetings} onChange={(val) => onPatchActuals({ meetings: val })} />
        <NumField label="Actual deals closed" value={a.deals} onChange={(val) => onPatchActuals({ deals: val })} />
        <NumField label="Actual revenue" value={a.revenue} onChange={(val) => onPatchActuals({ revenue: val })} prefix="$" />
      </div>
      <TextArea label="Actuals notes" value={a.notes} onChange={(val) => onPatchActuals({ notes: val })}
        placeholder="What actually happened — booth traffic, standout conversations, what to change next time…" />

      {v && (
        <div className="panel-sunk overflow-x-auto rounded-lg p-4">
          <h3 className="label-tape text-[10px] text-sky-400">Plan vs. actual</h3>
          <table className="mt-2 w-full text-left text-xs">
            <thead>
              <tr className="text-sky-500">
                <th className="py-1 pr-3 font-normal">Metric</th><th className="py-1 pr-3 font-normal">Plan</th>
                <th className="py-1 pr-3 font-normal">Actual</th><th className="py-1 font-normal">Delta</th>
              </tr>
            </thead>
            <tbody className="font-mono-tab text-sky-200">
              <VarianceRow label="Cost" plan={money(b.cost.total)} actual={money(v.actualCost)} delta={deltaStr(v.costDelta, 'money')} good={v.costDelta <= 0} />
              <VarianceRow label="Conversations" plan={round1(b.pipe.conversations)} actual={v.actualConversations} delta={deltaStr(v.conversationsDelta)} good={v.conversationsDelta >= 0} />
              <VarianceRow label="Meetings" plan={round1(b.pipe.meetings)} actual={v.actualMeetings} delta={deltaStr(v.meetingsDelta)} good={v.meetingsDelta >= 0} />
              <VarianceRow label="Deals" plan={round1(b.pipe.deals)} actual={v.actualDeals} delta={deltaStr(v.dealsDelta)} good={v.dealsDelta >= 0} />
              <VarianceRow label="Revenue" plan={money(Math.round(b.pipe.expectedRevenue))} actual={money(v.actualRevenue)} delta={deltaStr(v.revenueDelta, 'money')} good={v.revenueDelta >= 0} />
              <VarianceRow label="ROI" plan={Number.isFinite(b.roiPct) ? `${Math.round(b.roiPct)}%` : '∞'} actual={Number.isFinite(v.actualRoi) ? `${Math.round(v.actualRoi)}%` : '∞'} delta={v.roiDelta != null ? deltaStr(v.roiDelta) : '—'} good={v.roiDelta == null || v.roiDelta >= 0} />
            </tbody>
          </table>
        </div>
      )}
      <button onClick={onClearActuals} className="label-tape inline-flex items-center gap-1.5 rounded border border-sky-700 px-2.5 py-1.5 text-[10px] text-sky-400 hover:border-nogo/60 hover:text-nogo">
        <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Clear actuals
      </button>
    </div>
  );
}

function EventDossier({ event, tab, setTab, onPatch, onPatchCosts, onPatchPipeline, onPatchActuals, onDecide, onLogActuals, onClearActuals, onDelete, onCopyDossier, onCopilot }) {
  const b = breakevenOf(event);
  const call = suggestedCall(b);
  const v = varianceOf(event);
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-sky-700 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <input value={event.name} onChange={(e) => onPatch({ name: e.target.value })}
              placeholder="Event name — e.g. SaaSCon Austin 2026" aria-label="Event name"
              className="w-full bg-transparent font-display text-xl font-bold text-sky-100 placeholder:text-sky-600 outline-none" />
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={event.status} />
              <span className="text-xs text-sky-400">{event.category}{event.location ? ` · ${event.location}` : ''}</span>
            </div>
          </div>
          <AltitudeTape value={b.roiPct} label="ROI" />
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-sky-700 bg-sky-900/50 px-3 pt-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} aria-pressed={tab === t.key}
            className={`label-tape inline-flex items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-2 text-[10px] ${tab === t.key ? 'border-sky-600 bg-sky-800 text-sky-100' : 'border-transparent text-sky-400 hover:text-sky-200'}`}>
            <t.icon className="h-3.5 w-3.5" aria-hidden /> {t.label}
            {t.key === 'actuals' && event.actuals.logged && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-runway" aria-hidden />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'cost' && <CostTab event={event} b={b} onPatch={onPatch} onPatchCosts={onPatchCosts} />}
        {tab === 'pipeline' && <PipelineTab event={event} b={b} onPatchPipeline={onPatchPipeline} />}
        {tab === 'decision' && <DecisionTab event={event} b={b} call={call} onPatch={onPatch} onDecide={onDecide} />}
        {tab === 'actuals' && <ActualsTab event={event} b={b} v={v} onPatchActuals={onPatchActuals} onLogActuals={onLogActuals} onClearActuals={onClearActuals} />}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-sky-700 px-4 py-2.5">
        <button onClick={onDelete} className="label-tape inline-flex items-center gap-1.5 rounded border border-sky-700 px-2.5 py-1.5 text-[10px] text-sky-400 hover:border-nogo/60 hover:text-nogo">
          <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete event
        </button>
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={onCopyDossier} className="label-tape inline-flex items-center gap-1.5 rounded border border-sky-700 px-2.5 py-1.5 text-[10px] text-sky-300 hover:border-sky-300/70 hover:text-sky-100">
            <ClipboardCopy className="h-3.5 w-3.5" aria-hidden /> Copy dossier
          </button>
          <button onClick={onCopilot} className="label-tape inline-flex items-center gap-1.5 rounded border border-runway/50 bg-runway/10 px-2.5 py-1.5 text-[10px] font-bold text-runway hover:bg-runway/20">
            <Bot className="h-3.5 w-3.5" aria-hidden /> Send to Copilot
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MODAL SHELL
================================================================ */
function Modal({ label, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div role="dialog" aria-modal="true" aria-label={label}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-sky-950/85 p-4 backdrop-blur-sm sm:p-8 no-print"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} tabIndex={-1} className={`panel relative mt-4 w-full rounded-lg outline-none ${wide ? 'max-w-3xl' : 'max-w-xl'}`}>
        <div className="hazard-strip h-2 rounded-t-lg" aria-hidden />
        <button onClick={onClose} aria-label="Close dialog"
          className="absolute right-3 top-4 rounded p-1.5 text-sky-300 hover:bg-sky-700 hover:text-sky-100">
          <X className="h-4 w-4" aria-hidden />
        </button>
        {children}
      </div>
    </div>
  );
}

function CopilotModal({ events, defaultEventId, onClose, onToast, onNotesChange }) {
  const [eventId, setEventId] = useState(defaultEventId || (events[0] && events[0].id) || null);
  const [copied, setCopied] = useState(null);
  const ev = events.find((e) => e.id === eventId) || null;
  const actions = [
    { id: 'targets', title: 'Build my target list', desc: 'Turns the event profile into a 20-name target list with a research checklist and booth/session strategy.', build: () => promptTargetList(ev) },
    { id: 'outreach', title: 'Draft pre-event outreach', desc: 'LinkedIn, email, warm re-engagement, and follow-up nudge templates sized to the meetings you need to book.', build: () => promptOutreach(ev) },
    { id: 'report', title: 'Write the post-event report', desc: 'A CFO-trusted readout: headline verdict, plan vs. actual, what worked, what to change, the recommendation.', build: () => promptPostEventReport(ev) },
    { id: 'pressure', title: 'Pressure-test this business case', desc: 'A skeptical CFO stress-tests your assumptions and gives a blunt GO / HOLD / NO-GO.', build: () => promptPressureTest(ev) },
  ];
  return (
    <Modal label="Claude Copilot" onClose={onClose} wide>
      <div className="p-5">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-runway" aria-hidden />
          <h2 className="font-display text-base font-bold uppercase tracking-wide">Flight Ops Copilot</h2>
        </div>
        <p className="mt-1 text-xs text-sky-400">Each action builds a complete, ready-to-run prompt around one event's live data. {COPILOT_HINT}</p>
        <div className="mt-3">
          <span className="label-tape mb-1 block text-[9px] text-sky-400">Event context</span>
          {events.length ? (
            <select value={eventId || ''} onChange={(e) => setEventId(e.target.value)} aria-label="Event to use for Copilot prompts"
              className="w-full max-w-sm rounded border border-sky-700 bg-sky-950 px-2.5 py-2 text-sm text-sky-100">
              {events.map((e) => <option key={e.id} value={e.id}>{e.name || 'Untitled event'}</option>)}
            </select>
          ) : (
            <p className="text-xs text-sky-500">Add an event first — every action needs a dossier to work from.</p>
          )}
        </div>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {actions.map((a) => (
            <div key={a.id} className={`panel-sunk rounded-md p-3.5 ${!ev ? 'opacity-45' : ''}`}>
              <h3 className="text-sm font-bold text-sky-100">{a.title}</h3>
              <p className="mt-1 min-h-[42px] text-[11px] leading-snug text-sky-400">{a.desc}</p>
              <div className="mt-2 flex items-center gap-2">
                <button disabled={!ev}
                  onClick={() => { copyText(a.build(), () => { setCopied(a.id); onToast('Prompt copied — paste into claude.ai'); setTimeout(() => setCopied(null), 2000); }); }}
                  className="label-tape inline-flex items-center gap-1.5 rounded bg-runway px-2.5 py-1.5 text-[10px] font-bold text-sky-950 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
                  {copied === a.id ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />} {copied === a.id ? 'Copied' : 'Copy prompt'}
                </button>
                {ev && (
                  <details className="min-w-0 flex-1">
                    <summary className="label-tape cursor-pointer text-[9px] text-sky-500 hover:text-sky-300">view prompt</summary>
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-sky-950 p-2 font-mono text-[9px] leading-relaxed text-sky-300">{a.build()}</pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
        {ev && (
          <div className="mt-4">
            <TextArea label="Paste Claude's answer back — saved with this event" value={ev.copilotNotes} onChange={(val) => onNotesChange(ev.id, val)} rows={4}
              placeholder="Target list, outreach drafts, the post-event report…" />
          </div>
        )}
      </div>
    </Modal>
  );
}

function HelpModal({ onClose }) {
  const steps = [
    ['Load the demo route', 'Click "Load demo" for six realistic events across every stage: scouting, cleared, grounded, and flown with logged actuals.'],
    ['Add an event', '"New event" (or press N). Name it, set location, category, dates and people, and toggle Exhibiting if you are taking a booth.'],
    ['Build the cost model', 'Cost Model tab: tickets, travel, booth (if exhibiting), and the loaded cost of your team’s time. The total updates live.'],
    ['Model the pipeline', 'Pipeline Model tab: expected conversations, what share become meetings, what share of meetings close, and your average deal value.'],
    ['Read the breakeven view', 'Breakeven & Decision tab: the ROI altitude tape, the cost-vs-revenue runway bar, and how many deals or meetings you need just to break even.'],
    ['Make the call', 'Record Scouting / GO / NO-GO, who decided, and why. The suggested call is a hint, not a verdict — you own the decision.'],
    ['Log actuals after the event', 'Post-Event Actuals tab: log what really happened and see the plan-vs-actual variance instantly.'],
    ['Bring in the Copilot', 'Open Claude Copilot, pick an event, copy a prompt — target list, pre-event outreach, post-event report, or pressure-test — paste into claude.ai, and save the answer back to the event.'],
  ];
  const keys = [
    ['?', 'Open this guide'], ['Esc', 'Close dialogs / deselect event'], ['N', 'New event'],
    ['Ctrl/Cmd + S', 'Copy the flight log as Markdown'], ['← →', 'Previous / next tab in the open dossier'],
  ];
  return (
    <Modal label="How to use Conference ROI Planner" onClose={onClose} wide>
      <div className="max-h-[78vh] overflow-y-auto p-5">
        <div className="flex items-center gap-3">
          <PlaneMark className="h-10 w-10" />
          <div>
            <h2 className="font-display text-base font-bold uppercase tracking-wide">How the flight plan works</h2>
            <p className="text-xs text-sky-400">Every event is a bet against pipeline. File the flight plan before you buy the ticket.</p>
          </div>
        </div>
        <ol className="mt-4 space-y-2.5">
          {steps.map(([t, d], i) => (
            <li key={i} className="flex gap-3">
              <span className="label-tape flex h-6 w-6 shrink-0 items-center justify-center rounded border border-runway/50 bg-runway/10 font-mono text-[10px] font-bold text-runway">{i + 1}</span>
              <div>
                <span className="text-sm font-bold text-sky-100">{t}</span>
                <p className="text-xs leading-relaxed text-sky-400">{d}</p>
              </div>
            </li>
          ))}
        </ol>
        <h3 className="label-tape mt-5 text-[10px] text-sky-400">Keyboard</h3>
        <div className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
          {keys.map(([k, d]) => (
            <div key={k} className="flex items-center gap-2 text-xs">
              <kbd className="rounded border border-sky-600 bg-sky-950 px-1.5 py-0.5 font-mono text-[10px] text-runway">{k}</kbd>
              <span className="text-sky-400">{d}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="label-tape rounded bg-runway px-4 py-2 text-[11px] font-bold text-sky-950 hover:brightness-110">
            Cleared for takeoff
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PrintLog({ state }) {
  const { events } = state;
  return (
    <section className="print-only p-6" aria-hidden>
      <h1 className="text-2xl font-extrabold">Flight Log — Conference ROI Planner</h1>
      <p className="mt-1 text-sm">Generated {new Date().toLocaleDateString()} · {events.length} event{events.length === 1 ? '' : 's'} logged</p>
      <table className="mt-4">
        <thead><tr><th>Event</th><th>Status</th><th>Dates</th><th>Cost</th><th>Expected revenue</th><th>ROI</th></tr></thead>
        <tbody>
          {events.map((e) => {
            const b = breakevenOf(e);
            return (
              <tr key={e.id}>
                <td>{e.name || 'Untitled'}</td><td>{STATUS_META[e.status].label}</td><td>{e.startDate || 'TBD'}</td>
                <td>{money(b.cost.total)}</td><td>{money(Math.round(b.pipe.expectedRevenue))}</td>
                <td>{Number.isFinite(b.roiPct) ? Math.round(b.roiPct) + '%' : '∞'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {events.map((e) => {
        const b = breakevenOf(e);
        const v = varianceOf(e);
        return (
          <div key={e.id} className="pb mt-6">
            <h2 className="text-lg font-bold">{e.name || 'Untitled event'} — {e.location || 'Location TBD'}</h2>
            <p className="text-sm">
              {e.category} · {e.startDate || 'TBD'}{e.endDate && e.endDate !== e.startDate ? ` – ${e.endDate}` : ''} · {e.people} attending{e.exhibiting ? ' · exhibiting' : ''} · {STATUS_META[e.status].label}
            </p>
            <table className="mt-2">
              <thead><tr><th>Line</th><th>Amount</th></tr></thead>
              <tbody>
                <tr><td>Tickets</td><td>{money(b.cost.ticket)}</td></tr>
                <tr><td>Travel</td><td>{money(b.cost.travel)}</td></tr>
                {e.exhibiting && <tr><td>Booth</td><td>{money(b.cost.booth)}</td></tr>}
                <tr><td>Time</td><td>{money(b.cost.time)}</td></tr>
                {b.cost.misc > 0 && <tr><td>Misc</td><td>{money(b.cost.misc)}</td></tr>}
                <tr><td><strong>Total</strong></td><td><strong>{money(b.cost.total)}</strong></td></tr>
              </tbody>
            </table>
            <p className="mt-2 text-sm">
              Pipeline: {round1(b.pipe.conversations)} conversations → {round1(b.pipe.meetings)} meetings → {round1(b.pipe.deals)} deals at {money(b.pipe.avgDealValue)} avg. Expected revenue {money(Math.round(b.pipe.expectedRevenue))}. ROI {Number.isFinite(b.roiPct) ? Math.round(b.roiPct) + '%' : '∞'}.
            </p>
            {e.rationale && <p className="mt-1 text-sm"><strong>Decision:</strong> {STATUS_META[e.status].label} — {e.rationale}</p>}
            {v && (
              <table className="mt-2">
                <thead><tr><th>Actuals</th><th>Plan</th><th>Actual</th></tr></thead>
                <tbody>
                  <tr><td>Cost</td><td>{money(b.cost.total)}</td><td>{money(v.actualCost)}</td></tr>
                  <tr><td>Conversations</td><td>{round1(b.pipe.conversations)}</td><td>{v.actualConversations}</td></tr>
                  <tr><td>Meetings</td><td>{round1(b.pipe.meetings)}</td><td>{v.actualMeetings}</td></tr>
                  <tr><td>Deals</td><td>{round1(b.pipe.deals)}</td><td>{v.actualDeals}</td></tr>
                  <tr><td>Revenue</td><td>{money(Math.round(b.pipe.expectedRevenue))}</td><td>{money(v.actualRevenue)}</td></tr>
                </tbody>
              </table>
            )}
            {e.notes && <p className="mt-2 text-sm"><strong>Notes:</strong> {e.notes}</p>}
          </div>
        );
      })}
    </section>
  );
}

/* ================================================================
   APP
================================================================ */
export default function App() {
  const [state, setState] = useState(loadState);
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState('cost');
  const [helpOpen, setHelpOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState('date');
  const toastTimer = useRef(null);
  const fileRef = useRef(null);
  const exportRef = useRef(null);

  const { events } = state;
  const selected = events.find((e) => e.id === selectedId) || null;

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

  const patchEvent = useCallback((id, patch) => {
    setState((s) => ({ ...s, events: s.events.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: Date.now() } : e)) }));
  }, []);
  const patchCosts = useCallback((id, patch) => {
    setState((s) => ({ ...s, events: s.events.map((e) => (e.id === id ? { ...e, updatedAt: Date.now(), costs: { ...e.costs, ...patch } } : e)) }));
  }, []);
  const patchPipeline = useCallback((id, patch) => {
    setState((s) => ({ ...s, events: s.events.map((e) => (e.id === id ? { ...e, updatedAt: Date.now(), pipeline: { ...e.pipeline, ...patch } } : e)) }));
  }, []);
  const patchActuals = useCallback((id, patch) => {
    setState((s) => ({ ...s, events: s.events.map((e) => (e.id === id ? { ...e, updatedAt: Date.now(), actuals: { ...e.actuals, ...patch } } : e)) }));
  }, []);

  const newEvent = useCallback(() => {
    const e = blankEvent();
    setState((s) => ({ ...s, events: [e, ...s.events] }));
    setSelectedId(e.id);
    setTab('cost');
  }, []);

  const deleteEvent = useCallback((id) => {
    setState((s) => {
      const idx = s.events.findIndex((e) => e.id === id);
      if (idx === -1) return s;
      const removed = s.events[idx];
      const next = { ...s, events: s.events.filter((e) => e.id !== id) };
      showToast(`Removed from the log: ${removed.name || 'Untitled event'}`, () => {
        setState((s2) => {
          const restored = [...s2.events];
          restored.splice(Math.min(idx, restored.length), 0, removed);
          return { ...s2, events: restored };
        });
      });
      return next;
    });
    setSelectedId((cur) => (cur === id ? null : cur));
  }, [showToast]);

  const decide = useCallback((id, status) => { patchEvent(id, { status, decidedAt: Date.now() }); }, [patchEvent]);

  const logActuals = useCallback((id) => {
    setState((s) => ({
      ...s,
      events: s.events.map((e) => (e.id === id
        ? { ...e, updatedAt: Date.now(), status: e.status === 'go' ? 'flown' : e.status, actuals: { ...e.actuals, logged: true, loggedAt: Date.now() } }
        : e)),
    }));
  }, []);

  const clearActuals = useCallback((id) => {
    setState((s) => ({ ...s, events: s.events.map((e) => (e.id === id ? { ...e, updatedAt: Date.now(), actuals: blankActuals() } : e)) }));
  }, []);

  const loadDemo = useCallback(() => {
    setState(demoState());
    setSelectedId(null);
    showToast('Demo route loaded — six events across every stage');
  }, [showToast]);

  const copyPortfolio = useCallback(() => {
    copyText(portfolioMarkdown(state), () => showToast('Flight log copied as Markdown'));
  }, [state, showToast]);

  const downloadJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'conference-roi-planner-export.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showToast('Full state downloaded as JSON');
  }, [state, showToast]);

  const downloadCsv = useCallback(() => {
    const blob = new Blob([csvOf(state)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'conference-roi-planner-events.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showToast('Events CSV downloaded');
  }, [state, showToast]);

  const importJson = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = normalize(JSON.parse(String(reader.result)));
        next.seenGuide = true;
        setState(next);
        setSelectedId(null);
        showToast(`Imported ${next.events.length} event${next.events.length === 1 ? '' : 's'}`);
      } catch {
        showToast('Import failed — that file is not a valid export');
      }
    };
    reader.readAsText(file);
  }, [showToast]);

  const setCopilotNotes = useCallback((id, val) => patchEvent(id, { copilotNotes: val }), [patchEvent]);

  /* keyboard */
  useEffect(() => {
    const onKey = (e) => {
      const inField = e.target.closest?.('input, textarea, select, [contenteditable="true"]');
      if (e.key === 'Escape') {
        if (exportOpen) setExportOpen(false);
        else if (copilotOpen) setCopilotOpen(false);
        else if (resetOpen) setResetOpen(false);
        else if (helpOpen) setHelpOpen(false);
        else if (selectedId && !inField) setSelectedId(null);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); copyPortfolio(); return; }
      if (inField) return;
      if (e.key === '?') { e.preventDefault(); setHelpOpen(true); }
      else if (e.key.toLowerCase() === 'n') { e.preventDefault(); newEvent(); }
      else if (selectedId && e.key === 'ArrowRight') { e.preventDefault(); setTab((t) => TABS[Math.min(TABS.length - 1, TABS.findIndex((x) => x.key === t) + 1)].key); }
      else if (selectedId && e.key === 'ArrowLeft') { e.preventDefault(); setTab((t) => TABS[Math.max(0, TABS.findIndex((x) => x.key === t) - 1)].key); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpOpen, copilotOpen, resetOpen, exportOpen, selectedId, copyPortfolio, newEvent]);

  /* close export dropdown on outside click */
  useEffect(() => {
    if (!exportOpen) return;
    const onDown = (e) => { if (!exportRef.current?.contains(e.target)) setExportOpen(false); };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [exportOpen]);

  const rows = useMemo(() => {
    let list = events.map((e) => ({ e, b: breakevenOf(e) }));
    const q = query.trim().toLowerCase();
    if (q) list = list.filter(({ e }) => (e.name + ' ' + e.location + ' ' + e.organizer).toLowerCase().includes(q));
    if (statusFilter !== 'all') list = list.filter(({ e }) => e.status === statusFilter);
    const cmp = {
      date: (a, b) => (a.e.startDate || '9999').localeCompare(b.e.startDate || '9999'),
      roi: (a, b) => (Number.isFinite(b.b.roiPct) ? b.b.roiPct : 1e9) - (Number.isFinite(a.b.roiPct) ? a.b.roiPct : 1e9),
      cost: (a, b) => b.b.cost.total - a.b.cost.total,
      name: (a, b) => (a.e.name || '').localeCompare(b.e.name || ''),
    }[sortKey];
    return [...list].sort(cmp);
  }, [events, query, statusFilter, sortKey]);

  const portfolio = useMemo(() => {
    let committed = 0, expectedRevenue = 0;
    const counts = { candidate: 0, go: 0, 'no-go': 0, flown: 0 };
    for (const e of events) {
      counts[e.status] = (counts[e.status] || 0) + 1;
      if (e.status === 'go' || e.status === 'flown') {
        const b = breakevenOf(e);
        committed += b.cost.total;
        expectedRevenue += b.pipe.expectedRevenue;
      }
    }
    const roi = committed > 0 ? ((expectedRevenue - committed) / committed) * 100 : (expectedRevenue > 0 ? Infinity : 0);
    return { committed, expectedRevenue, roi, counts };
  }, [events]);

  return (
    <div className="min-h-screen font-body text-sky-100">
      {/* ============ HEADER ============ */}
      <header className="no-print sticky top-0 z-40 border-b border-sky-800 bg-sky-950/95 backdrop-blur">
        <div className="hazard-strip h-1.5" aria-hidden />
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            <PlaneMark className="h-9 w-9" />
            <div>
              <h1 className="font-display text-lg font-bold uppercase leading-none tracking-[0.08em] text-sky-100">
                Conference<span className="text-sky-300"> ROI Planner</span>
              </h1>
              <p className="label-tape mt-0.5 text-[10px] text-sky-400">Decide events with math, not FOMO</p>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <button onClick={loadDemo} className="label-tape rounded border border-sky-700 bg-sky-900 px-2.5 py-1.5 text-[11px] text-sky-200 hover:border-sky-300/70 hover:text-sky-100">
              Load demo
            </button>
            <button onClick={() => setResetOpen(true)} className="label-tape inline-flex items-center gap-1.5 rounded border border-sky-700 bg-sky-900 px-2.5 py-1.5 text-[11px] text-sky-200 hover:border-nogo/70 hover:text-nogo">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
            </button>
            <button onClick={() => setHelpOpen(true)} className="label-tape inline-flex items-center gap-1.5 rounded border border-sky-700 bg-sky-900 px-2.5 py-1.5 text-[11px] text-sky-200 hover:border-sky-300/70 hover:text-sky-100">
              <BookOpen className="h-3.5 w-3.5" aria-hidden /> How to use
            </button>
            <button onClick={() => setCopilotOpen(true)} className="label-tape inline-flex items-center gap-1.5 rounded border border-runway/50 bg-runway/10 px-2.5 py-1.5 text-[11px] text-runway hover:bg-runway/20">
              <Bot className="h-3.5 w-3.5" aria-hidden /> Claude Copilot
            </button>
            <div className="relative" ref={exportRef}>
              <button onClick={() => setExportOpen((v) => !v)} aria-haspopup="menu" aria-expanded={exportOpen}
                className="label-tape inline-flex items-center gap-1.5 rounded border border-sky-700 bg-sky-900 px-2.5 py-1.5 text-[11px] text-sky-200 hover:border-sky-300/70 hover:text-sky-100">
                <FileDown className="h-3.5 w-3.5" aria-hidden /> Export <ChevronDown className="h-3 w-3" aria-hidden />
              </button>
              {exportOpen && (
                <div role="menu" className="panel absolute right-0 z-50 mt-1.5 w-64 rounded-md p-1.5">
                  {[
                    { icon: ClipboardCopy, label: 'Copy flight log (Markdown)', fn: () => { copyPortfolio(); setExportOpen(false); } },
                    { icon: FileDown, label: 'Download JSON (full state)', fn: () => { downloadJson(); setExportOpen(false); } },
                    { icon: FileText, label: 'Download events CSV', fn: () => { downloadCsv(); setExportOpen(false); } },
                    { icon: FileUp, label: 'Import JSON…', fn: () => { fileRef.current?.click(); setExportOpen(false); } },
                    { icon: Printer, label: 'Print flight log', fn: () => { setExportOpen(false); window.print(); } },
                  ].map(({ icon: I, label, fn }) => (
                    <button key={label} role="menuitem" onClick={fn}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-xs text-sky-200 hover:bg-sky-800">
                      <I className="h-3.5 w-3.5 text-sky-400" aria-hidden /> {label}
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

      {/* ============ PORTFOLIO STRIP ============ */}
      <div className="no-print border-b border-sky-800 bg-sky-900/60">
        <div className="mx-auto grid max-w-[1500px] grid-cols-2 gap-x-6 gap-y-3 px-4 py-3 sm:px-6 md:grid-cols-5">
          <Stat label="Events logged" value={String(events.length)} sub={`${portfolio.counts.go || 0} cleared · ${portfolio.counts.flown || 0} flown`} />
          <Stat label="Committed spend" value={money(portfolio.committed)} sub="Cleared + flown events" />
          <Stat label="Expected revenue" value={money(Math.round(portfolio.expectedRevenue))} sub="modeled, not actual" />
          <Stat label="Portfolio ROI" value={Number.isFinite(portfolio.roi) ? `${portfolio.roi >= 0 ? '+' : ''}${Math.round(portfolio.roi)}%` : '∞'}
            tone={portfolio.roi >= ROI_GO_THRESHOLD ? 'go' : portfolio.roi >= ROI_HOLD_THRESHOLD ? 'hold' : 'nogo'} sub="on committed events" />
          <div>
            <span className="label-tape text-[10px] text-sky-400">Annual budget</span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-xs text-sky-500">$</span>
              <input type="number" min="0" step="1000" value={state.budgetCap || ''}
                onChange={(e) => setState((s) => ({ ...s, budgetCap: Math.max(0, Number(e.target.value) || 0) }))}
                placeholder="optional" aria-label="Annual event budget"
                className="w-24 border-b border-sky-700 bg-transparent font-mono-tab text-sm text-sky-100 outline-none placeholder:text-sky-700 focus:border-sky-300" />
            </div>
            <BudgetBar committed={portfolio.committed} cap={state.budgetCap} />
          </div>
        </div>
      </div>

      {/* ============ MAIN ============ */}
      <main className="no-print mx-auto grid max-w-[1500px] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* ---- FLIGHT LOG ---- */}
        <section aria-label="Flight log" className="panel flex min-h-[300px] flex-col self-start rounded-lg lg:sticky lg:top-[132px] lg:max-h-[calc(100vh-148px)]">
          <div className="flex items-center justify-between gap-2 border-b border-sky-700 px-3.5 py-2.5">
            <h2 className="label-tape text-xs text-sky-300">Flight Log</h2>
            <button onClick={newEvent} className="label-tape inline-flex items-center gap-1 rounded bg-runway px-2 py-1 text-[11px] font-bold text-sky-950 hover:brightness-110">
              <Plus className="h-3.5 w-3.5" aria-hidden /> New event
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 border-b border-sky-800 px-3 py-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sky-500" aria-hidden />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search events…" aria-label="Search events"
                className="w-full rounded border border-sky-700 bg-sky-950 py-1.5 pl-7 pr-2 text-xs text-sky-100 placeholder:text-sky-600" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status"
              className="rounded border border-sky-700 bg-sky-950 px-1.5 py-1.5 text-xs text-sky-200">
              <option value="all">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
            </select>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} aria-label="Sort events"
              className="rounded border border-sky-700 bg-sky-950 px-1.5 py-1.5 text-xs text-sky-200">
              <option value="date">Sort: date</option>
              <option value="roi">Sort: ROI</option>
              <option value="cost">Sort: cost</option>
              <option value="name">Sort: name</option>
            </select>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {events.length === 0 ? (
              <EmptyLog onDemo={loadDemo} onNew={newEvent} />
            ) : rows.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-sky-400">No events match those filters. Widen the search or clear filters.</p>
            ) : (
              <ul className="space-y-1.5">
                {rows.map(({ e, b }) => (
                  <li key={e.id}>
                    <EventCard e={e} b={b} active={selectedId === e.id} onClick={() => { setSelectedId(e.id); setTab('cost'); }} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ---- DOSSIER ---- */}
        <section aria-label="Event dossier" className="panel min-h-[420px] rounded-lg">
          {!selected ? (
            <EmptyDossier events={events} onNew={newEvent} />
          ) : (
            <EventDossier
              event={selected} tab={tab} setTab={setTab}
              onPatch={(patch) => patchEvent(selected.id, patch)}
              onPatchCosts={(patch) => patchCosts(selected.id, patch)}
              onPatchPipeline={(patch) => patchPipeline(selected.id, patch)}
              onPatchActuals={(patch) => patchActuals(selected.id, patch)}
              onDecide={(status) => decide(selected.id, status)}
              onLogActuals={() => logActuals(selected.id)}
              onClearActuals={() => clearActuals(selected.id)}
              onDelete={() => deleteEvent(selected.id)}
              onCopyDossier={() => copyText(eventMarkdown(selected), () => showToast('Event dossier copied as Markdown'))}
              onCopilot={() => setCopilotOpen(true)}
            />
          )}
        </section>
      </main>

      {/* ============ FOOTER ============ */}
      <footer className="no-print mx-auto max-w-[1500px] px-4 pb-6 sm:px-6">
        <div className="hazard-strip h-1 rounded opacity-60" aria-hidden />
        <p className="label-tape mt-2 text-[9px] text-sky-500">
          Conference ROI Planner · Your data never leaves this browser — saved locally, exportable anytime.
        </p>
      </footer>

      {/* ============ MODALS ============ */}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      {copilotOpen && (
        <CopilotModal events={events} defaultEventId={selectedId} onClose={() => setCopilotOpen(false)} onToast={showToast} onNotesChange={setCopilotNotes} />
      )}
      {resetOpen && (
        <Modal label="Confirm reset" onClose={() => setResetOpen(false)}>
          <div className="p-5">
            <h2 className="font-display text-base font-bold uppercase tracking-wide">Clear the flight log?</h2>
            <p className="mt-2 text-sm text-sky-300">
              This clears every event, cost model, and decision record from this browser. Download a JSON export first if any of it matters.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setResetOpen(false)}
                className="label-tape rounded border border-sky-700 px-3 py-1.5 text-[11px] text-sky-200 hover:text-sky-100">Keep everything</button>
              <button onClick={() => { setState(normalize(null)); setState((s) => ({ ...s, seenGuide: true })); setSelectedId(null); setResetOpen(false); showToast('Flight log cleared'); }}
                className="label-tape rounded bg-nogo px-3 py-1.5 text-[11px] font-bold text-white hover:bg-nogo/80">Reset everything</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============ TOAST ============ */}
      {toast && (
        <div className="anim-toast fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4 no-print" role="status">
          <div className="panel flex items-center gap-3 rounded-md px-4 py-2.5 text-sm">
            <PlaneTakeoff className="h-4 w-4 text-runway" aria-hidden />
            <span>{toast.msg}</span>
            {toast.undo && (
              <button onClick={() => { toast.undo(); setToast(null); }}
                className="label-tape inline-flex items-center gap-1 rounded bg-runway px-2 py-1 text-[10px] font-bold text-sky-950 hover:brightness-110">
                <Undo2 className="h-3 w-3" aria-hidden /> Undo
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============ PRINT FLIGHT LOG ============ */}
      <PrintLog state={state} />
    </div>
  );
}
