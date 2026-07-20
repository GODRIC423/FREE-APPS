import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Waves, Sparkles, Copy, Check, Download, Upload, HelpCircle, RotateCcw, Plus,
  Trash2, X, Pencil, Undo2, Gift, Users, CalendarClock, TrendingUp, FileText,
  FileJson, Printer, Mail, Phone, MessagesSquare, Handshake, Send,
  Search, ChevronDown, ChevronUp, CircleDollarSign, ClipboardPaste, Table2,
  ListChecks, Droplets, Target, Share2,
} from 'lucide-react';

/* ================================================================
   Referral Engine — design a referral program & work it weekly.
   World: ripple/network. Ink dark, cyan ripples radiating from nodes.
   ================================================================ */

const STORAGE_KEY = 'bizdev:08-referral-engine:v1';
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
const todayISO = () => new Date().toISOString().slice(0, 10);

function mondayOf(d = new Date()) {
  const dt = new Date(d);
  const day = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - day);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
const isoOf = (d) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
const thisWeekISO = () => isoOf(mondayOf());

function daysSince(iso) {
  if (!iso) return null;
  const then = new Date(iso + 'T00:00:00');
  if (isNaN(then)) return null;
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / 86400000));
}
const agoLabel = (iso) => {
  const d = daysSince(iso);
  if (d === null) return 'never';
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  return `${d}d ago`;
};
const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');

/* ---------------- vocabulary of the world ---------------- */

const INCENTIVE_TYPES = [
  { id: 'cash', label: 'Cash / commission', hint: 'A % or flat fee per closed referral' },
  { id: 'credit', label: 'Service credit', hint: 'Money off their next invoice' },
  { id: 'gift', label: 'Meaningful gift', hint: 'Curated and personal, not a mug' },
  { id: 'donation', label: 'Charity donation', hint: 'Given in the referrer’s name' },
  { id: 'reciprocal', label: 'Reciprocal referrals', hint: 'You send business back their way' },
];
const PAYOUT_TRIGGERS = [
  { id: 'intro', label: 'On a qualified intro' },
  { id: 'meeting', label: 'On a first meeting held' },
  { id: 'closed', label: 'On a closed deal' },
];
const MOMENTS = [
  { id: 'win', label: 'Right after a delivered win' },
  { id: 'praise', label: 'The moment a client praises the work' },
  { id: 'wrap', label: 'At project wrap-up' },
  { id: 'invoice', label: 'When the final invoice is paid happily' },
  { id: 'quarterly', label: 'Quarterly relationship check-in' },
  { id: 'renewal', label: 'On renewal or re-signing' },
];
const CHANNELS = [
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'call', label: 'Call', icon: Phone },
  { id: 'linkedin', label: 'LinkedIn', icon: Share2 },
  { id: 'inperson', label: 'In person', icon: Handshake },
  { id: 'sms', label: 'Text / WhatsApp', icon: MessagesSquare },
];
const REF_TYPES = [
  { id: 'client', label: 'Client' },
  { id: 'past-client', label: 'Past client' },
  { id: 'partner', label: 'Partner' },
  { id: 'peer', label: 'Peer' },
  { id: 'friend', label: 'Friend' },
];
const STRENGTH_LABELS = ['', 'Distant', 'Warm', 'Solid', 'Strong', 'Inner ring'];
const STAGES = [
  { id: 'intro', label: 'Intro made' },
  { id: 'call', label: 'Conversation' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
];
const QUEUE_STATUSES = [
  { id: 'queued', label: 'Queued' },
  { id: 'sent', label: 'Sent' },
  { id: 'replied', label: 'Replied' },
  { id: 'skipped', label: 'Skipped' },
];

const labelOf = (list, id) => (list.find((x) => x.id === id) || {}).label || id;

/* ---------------- normalize / persistence ---------------- */

const inSet = (v, list, d) => (list.some((x) => x.id === v) ? v : d);
const str = (v, d = '') => (typeof v === 'string' ? v : d);
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

function normalize(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const p = s.program && typeof s.program === 'object' ? s.program : {};
  const arr = (v) => (Array.isArray(v) ? v : []);
  return {
    version: 1,
    seenGuide: !!s.seenGuide,
    program: {
      name: str(p.name, 'Untitled program'),
      offer: str(p.offer),
      pricePoint: str(p.pricePoint),
      incentiveType: inSet(p.incentiveType, INCENTIVE_TYPES, 'cash'),
      incentiveGive: str(p.incentiveGive),
      incentiveGet: str(p.incentiveGet),
      doubleSided: p.doubleSided !== false,
      payoutTrigger: inSet(p.payoutTrigger, PAYOUT_TRIGGERS, 'closed'),
      askMoments: arr(p.askMoments).filter((m) => MOMENTS.some((x) => x.id === m)),
      channels: arr(p.channels).filter((c) => CHANNELS.some((x) => x.id === c)),
      weeklyTarget: Math.min(20, Math.max(1, num(p.weeklyTarget, 3))),
      notes: str(p.notes),
    },
    referrers: arr(s.referrers).map((r) => (r && typeof r === 'object' ? {
      id: str(r.id) || uid(),
      name: str(r.name, 'Unnamed'),
      company: str(r.company),
      role: str(r.role),
      type: inSet(r.type, REF_TYPES, 'client'),
      strength: Math.min(5, Math.max(1, num(r.strength, 3))),
      lastAsk: str(r.lastAsk),
      notes: str(r.notes),
    } : null)).filter(Boolean),
    queue: arr(s.queue).map((q) => (q && typeof q === 'object' ? {
      id: str(q.id) || uid(),
      referrerId: str(q.referrerId),
      week: str(q.week, thisWeekISO()),
      channel: inSet(q.channel, CHANNELS, 'email'),
      script: str(q.script),
      status: inSet(q.status, QUEUE_STATUSES, 'queued'),
    } : null)).filter(Boolean),
    referrals: arr(s.referrals).map((r) => (r && typeof r === 'object' ? {
      id: str(r.id) || uid(),
      prospect: str(r.prospect, 'Unnamed prospect'),
      company: str(r.company),
      referrerId: str(r.referrerId),
      stage: inSet(r.stage, STAGES, 'intro'),
      value: Math.max(0, num(r.value, 0)),
      date: str(r.date, todayISO()),
      notes: str(r.notes),
    } : null)).filter(Boolean),
    copilotNotes: str(s.copilotNotes),
  };
}

function loadState() {
  try { return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
  catch { return normalize(null); }
}

/* ---------------- demo scenario ---------------- */

function demoState() {
  const wk = thisWeekISO();
  const lastWk = isoOf(new Date(mondayOf().getTime() - 7 * 86400000));
  const ago = (d) => isoOf(new Date(Date.now() - d * 86400000));
  const ids = { maya: uid(), tom: uid(), priya: uid(), dan: uid(), sofia: uid(), james: uid(), anika: uid(), leo: uid() };
  const program = {
    name: 'Northbeam Studio referral program',
    offer: 'B2B web design & brand sprints for ops-heavy companies',
    pricePoint: '$9,500 avg first project',
    incentiveType: 'cash',
    incentiveGive: '10% of the first project fee (avg $950), paid within a week of close',
    incentiveGet: '$500 off their first sprint',
    doubleSided: true,
    payoutTrigger: 'closed',
    askMoments: ['win', 'wrap', 'quarterly'],
    channels: ['email', 'call', 'linkedin'],
    weeklyTarget: 3,
    notes: 'Rules of the pond: asks are personal, never blast. Every referral gets a handwritten thank-you within 48h, incentive paid within 7 days of close. Never ask the same person twice in 30 days.',
  };
  const referrers = [
    { id: ids.maya, name: 'Maya Chen', company: 'Alderline Logistics', role: 'COO', type: 'client', strength: 5, lastAsk: ago(12), notes: 'Championed us internally. Loves the ops dashboard we shipped; knows every COO in her freight peer group.' },
    { id: ids.sofia, name: 'Sofia Reyes', company: 'Reyes Copy Co.', role: 'Founder', type: 'peer', strength: 5, lastAsk: ago(8), notes: 'We swap overflow work. Her clients constantly need design after messaging projects.' },
    { id: ids.tom, name: 'Tom Okafor', company: 'Brightpath Coaching', role: 'Founder', type: 'past-client', strength: 4, lastAsk: '', notes: 'Rebrand doubled his inbound in 2024. Has never been asked directly - warm but untapped.' },
    { id: ids.priya, name: 'Priya Nair', company: 'Ledger & Lane Accounting', role: 'Partner', type: 'partner', strength: 4, lastAsk: ago(40), notes: 'Sends us clients outgrowing DIY sites. Wants co-branded audit offer in return.' },
    { id: ids.leo, name: 'Leo Martins', company: 'Martins & Co Realty', role: 'CEO', type: 'past-client', strength: 4, lastAsk: ago(30), notes: 'Sent Ruth Adler already. Responds best to short texts, hates long emails.' },
    { id: ids.dan, name: 'Dan Kowalski', company: 'Vantage CRM', role: 'Head of RevOps', type: 'partner', strength: 3, lastAsk: ago(75), notes: 'Their onboarding team sees clients with dated sites weekly. Needs a one-pager to forward.' },
    { id: ids.james, name: 'James Whitfield', company: 'Harbor Freight Brokers', role: 'CFO', type: 'client', strength: 3, lastAsk: '', notes: 'Quietly happy client, numbers guy. Lead with the ROI story, not the design story.' },
    { id: ids.anika, name: 'Anika Sharma', company: 'Klick', role: 'Product Lead', type: 'friend', strength: 2, lastAsk: ago(120), notes: 'Old friend, big network, but keep it light - one ask per quarter max.' },
  ];
  const refBy = Object.fromEntries(referrers.map((r) => [r.id, r]));
  const queue = [
    { id: uid(), referrerId: ids.maya, week: wk, channel: 'email', status: 'sent', script: draftScript(program, refBy[ids.maya], 'email') },
    { id: uid(), referrerId: ids.tom, week: wk, channel: 'call', status: 'queued', script: draftScript(program, refBy[ids.tom], 'call') },
    { id: uid(), referrerId: ids.priya, week: wk, channel: 'linkedin', status: 'queued', script: draftScript(program, refBy[ids.priya], 'linkedin') },
    { id: uid(), referrerId: ids.sofia, week: lastWk, channel: 'email', status: 'replied', script: draftScript(program, refBy[ids.sofia], 'email') },
    { id: uid(), referrerId: ids.leo, week: lastWk, channel: 'sms', status: 'sent', script: draftScript(program, refBy[ids.leo], 'sms') },
  ];
  const referrals = [
    { id: uid(), prospect: 'Grace Liu', company: 'Pacific Fulfillment', referrerId: ids.maya, stage: 'won', value: 9500, date: ago(21), notes: 'Ops dashboard + site refresh. Maya intro over lunch.' },
    { id: uid(), prospect: 'Ruth Adler', company: 'Adler Dental Partners', referrerId: ids.leo, stage: 'won', value: 7200, date: ago(35), notes: 'Brand sprint. Leo texted her our one-pager.' },
    { id: uid(), prospect: 'Ben Carter', company: 'Carter Legal', referrerId: ids.sofia, stage: 'proposal', value: 12000, date: ago(9), notes: 'Full rebrand + site. Proposal sent Tuesday; decision by month end.' },
    { id: uid(), prospect: 'Nina Petrov', company: 'Altura HR', referrerId: ids.priya, stage: 'call', value: 8000, date: ago(5), notes: 'Outgrew their template site. Second call booked.' },
    { id: uid(), prospect: 'Owen Blake', company: 'Blake Roofing Group', referrerId: ids.tom, stage: 'intro', value: 9500, date: ago(2), notes: 'Warm three-way email thread open. Waiting on his availability.' },
    { id: uid(), prospect: 'Tessa Morgan', company: 'Morgan Events', referrerId: ids.sofia, stage: 'intro', value: 6500, date: ago(1), notes: 'Sofia says budget is real but timeline is spring.' },
    { id: uid(), prospect: 'Marco Diaz', company: 'Diaz Imports', referrerId: ids.dan, stage: 'lost', value: 9000, date: ago(50), notes: 'Budget freeze mid-cycle. Revisit in Q4 - parked, not dead.' },
  ];
  return normalize({ version: 1, seenGuide: true, program, referrers, queue, referrals, copilotNotes: '' });
}

/* ---------------- ask script drafts ---------------- */

function incentiveLine(program) {
  const t = labelOf(INCENTIVE_TYPES, program.incentiveType).toLowerCase();
  const give = program.incentiveGive || `a ${t} thank-you`;
  const both = program.doubleSided && program.incentiveGet
    ? ` - and whoever you send gets ${program.incentiveGet}`
    : '';
  return `${give}${both}`;
}

function draftScript(program, referrer, channelId) {
  const first = (referrer.name || 'there').trim().split(/\s+/)[0];
  const offer = program.offer || 'the work we do';
  const inc = incentiveLine(program);
  if (channelId === 'call') {
    return [
      `Call plan - ${referrer.name}`,
      `1. Open with something real (their business, not yours).`,
      `2. Bridge: "One reason I'm calling - we've got room for two new projects this quarter and the best ones always come from people like you."`,
      `3. The ask: "Who's the one person in your world wrestling with ${offer.toLowerCase()}? I'd love a warm intro."`,
      `4. Make it easy: offer to send a 3-line forwardable blurb.`,
      `5. Mention the thank-you: ${inc}.`,
    ].join('\n');
  }
  if (channelId === 'linkedin' || channelId === 'sms') {
    return `${first} - quick one. We're opening two client slots this quarter and the best people always come through you. Anyone in your circle dealing with ${offer.toLowerCase()}? One name is plenty - I'll do the rest, and there's ${inc}.`;
  }
  if (channelId === 'inperson') {
    return `In-person ask - ${referrer.name}: after the catch-up, name the moment ("that thing you said about X"), then: "Who's one person you know facing ${offer.toLowerCase()}? An intro from you lands 10x warmer than anything I could do." Close with the thank-you: ${inc}.`;
  }
  return [
    `Subject: A favor I'd only ask you, ${first}`,
    ``,
    `Hi ${first},`,
    ``,
    `Working with you${referrer.company ? ` and ${referrer.company}` : ''} has been a highlight - and it made me realize the best projects we take on all start the same way: someone like you makes an intro.`,
    ``,
    `We have room for two new clients this quarter. Is there one person in your network wrestling with ${offer.toLowerCase()}? A two-line intro is all it takes - I'll send you a short forwardable blurb so it costs you 30 seconds.`,
    ``,
    `And because good deeds should pay: ${inc}.`,
    ``,
    `Either way - thank you for being in our corner.`,
  ].join('\n');
}

/* ---------------- markdown / csv serializers ---------------- */

function programMarkdown(p) {
  return [
    `- **Offer:** ${p.offer || '(not set)'}`,
    `- **Average deal value:** ${p.pricePoint || '(not set)'}`,
    `- **Incentive:** ${labelOf(INCENTIVE_TYPES, p.incentiveType)} - ${p.incentiveGive || '(not set)'}${p.doubleSided ? ` | referred side gets: ${p.incentiveGet || '(not set)'}` : ' (single-sided)'}`,
    `- **Pays out:** ${labelOf(PAYOUT_TRIGGERS, p.payoutTrigger)}`,
    `- **Ask moments:** ${p.askMoments.length ? p.askMoments.map((m) => labelOf(MOMENTS, m)).join('; ') : '(none chosen)'}`,
    `- **Channels:** ${p.channels.length ? p.channels.map((c) => labelOf(CHANNELS, c)).join(', ') : '(none chosen)'}`,
    `- **Weekly ask target:** ${p.weeklyTarget}`,
    p.notes ? `- **Program rules:** ${p.notes}` : null,
  ].filter(Boolean).join('\n');
}

function rosterMarkdown(state) {
  const sent = countReferralsBy(state);
  if (!state.referrers.length) return '_No referrers yet._';
  const rows = [...state.referrers]
    .sort((a, b) => b.strength - a.strength)
    .map((r) => `| ${r.name} | ${r.company || '-'} | ${labelOf(REF_TYPES, r.type)} | ${r.strength}/5 ${STRENGTH_LABELS[r.strength]} | ${agoLabel(r.lastAsk)} | ${sent[r.id] || 0} |`);
  return ['| Referrer | Company | Type | Strength | Last ask | Referrals |', '| --- | --- | --- | --- | --- | --- |', ...rows].join('\n');
}

function queueMarkdown(state) {
  const wk = thisWeekISO();
  const items = state.queue.filter((q) => q.week === wk);
  if (!items.length) return '_No asks queued this week._';
  const nameOf = (id) => (state.referrers.find((r) => r.id === id) || {}).name || '(removed)';
  const fence = '```';
  return items.map((q) =>
    `### ${nameOf(q.referrerId)} - ${labelOf(CHANNELS, q.channel)} - ${labelOf(QUEUE_STATUSES, q.status)}\n\n${fence}\n${q.script || '(no script drafted)'}\n${fence}`
  ).join('\n\n');
}

function funnelRows(state) {
  const asks = state.queue.filter((q) => q.status === 'sent' || q.status === 'replied').length;
  const live = state.referrals.filter((r) => r.stage !== 'lost');
  const reached = (min) => live.filter((r) => STAGES.findIndex((s) => s.id === r.stage) >= min).length;
  return [
    { label: 'Asks made', count: asks },
    { label: 'Intros', count: state.referrals.length },
    { label: 'Conversations', count: reached(1) },
    { label: 'Proposals', count: reached(2) },
    { label: 'Won', count: reached(3) },
  ];
}

function funnelMarkdown(state) {
  const rows = funnelRows(state);
  const won = state.referrals.filter((r) => r.stage === 'won');
  const open = state.referrals.filter((r) => r.stage !== 'won' && r.stage !== 'lost');
  const lines = rows.map((r, i) => {
    const conv = i > 0 && rows[i - 1].count > 0 ? ` (${Math.round((100 * r.count) / rows[i - 1].count)}% from previous)` : '';
    return `- ${r.label}: **${r.count}**${conv}`;
  });
  lines.push(`- Pipeline value (open): **${money(open.reduce((a, r) => a + r.value, 0))}**`);
  lines.push(`- Won value: **${money(won.reduce((a, r) => a + r.value, 0))}**`);
  const lost = state.referrals.filter((r) => r.stage === 'lost').length;
  if (lost) lines.push(`- Lost: ${lost}`);
  return lines.join('\n');
}

function referralsMarkdown(state) {
  if (!state.referrals.length) return '_No referrals tracked yet._';
  const nameOf = (id) => (state.referrers.find((r) => r.id === id) || {}).name || '(removed)';
  const rows = state.referrals.map((r) =>
    `| ${r.prospect} | ${r.company || '-'} | ${nameOf(r.referrerId)} | ${labelOf(STAGES, r.stage)} | ${money(r.value)} | ${r.date} |`);
  return ['| Prospect | Company | Via | Stage | Value | Date |', '| --- | --- | --- | --- | --- | --- |', ...rows].join('\n');
}

function stateToMarkdown(state) {
  return [
    `# Referral Engine - ${state.program.name}`,
    `_Exported ${todayISO()}_`,
    '', '## The program', programMarkdown(state.program),
    '', `## Referrer roster (${state.referrers.length})`, rosterMarkdown(state),
    '', `## This week's ask queue (week of ${thisWeekISO()})`, queueMarkdown(state),
    '', '## Referral funnel', funnelMarkdown(state),
    '', '## Referrals', referralsMarkdown(state),
  ].join('\n');
}

function countReferralsBy(state) {
  const m = {};
  for (const r of state.referrals) m[r.referrerId] = (m[r.referrerId] || 0) + 1;
  return m;
}

const csvEsc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
function rosterCSV(state) {
  const sent = countReferralsBy(state);
  const head = 'name,company,role,type,strength,last_ask,referrals_sent,notes';
  return [head, ...state.referrers.map((r) =>
    [r.name, r.company, r.role, r.type, r.strength, r.lastAsk, sent[r.id] || 0, r.notes].map(csvEsc).join(',')
  )].join('\n');
}
function referralsCSV(state) {
  const nameOf = (id) => (state.referrers.find((r) => r.id === id) || {}).name || '';
  const head = 'prospect,company,via_referrer,stage,value,date,notes';
  return [head, ...state.referrals.map((r) =>
    [r.prospect, r.company, nameOf(r.referrerId), r.stage, r.value, r.date, r.notes].map(csvEsc).join(',')
  )].join('\n');
}

/* ---------------- copilot prompt builders ---------------- */

function promptHeader(state) {
  return [
    'You are a world-class referral strategist and BD copywriter. You write asks that feel personal, never salesy, and you think in terms of relationship capital.',
    '',
    '# My referral program (current state)',
    programMarkdown(state.program),
  ].join('\n');
}

function promptPersonalizeAsk(state, referrer) {
  const q = state.queue.find((x) => x.referrerId === referrer.id && x.week === thisWeekISO());
  const script = q?.script || draftScript(state.program, referrer, q?.channel || state.program.channels[0] || 'email');
  const sent = countReferralsBy(state)[referrer.id] || 0;
  return [
    promptHeader(state),
    '',
    '# The referrer I am about to ask',
    `- Name: ${referrer.name}${referrer.role ? ` (${referrer.role}${referrer.company ? `, ${referrer.company}` : ''})` : referrer.company ? ` (${referrer.company})` : ''}`,
    `- Relationship: ${labelOf(REF_TYPES, referrer.type)}, strength ${referrer.strength}/5 (${STRENGTH_LABELS[referrer.strength]})`,
    `- Last asked: ${agoLabel(referrer.lastAsk)}`,
    `- Referrals they have sent so far: ${sent}`,
    referrer.notes ? `- My notes on them: ${referrer.notes}` : null,
    '',
    '# My current draft ask',
    '```',
    script,
    '```',
    '',
    '# Your task',
    `Rewrite this ask so it could only have been written to ${referrer.name}. Anchor it in our specific relationship and their world, keep the incentive natural (not transactional), and make the ask concrete: one name, one intro. Match the channel: ${labelOf(CHANNELS, q?.channel || 'email')}.`,
    '',
    '# Output format',
    '1. **Primary version** (under 120 words, ready to send)',
    '2. **Short nudge version** (under 40 words, for a follow-up 5 days later)',
    '3. **Why this works** - two sentences on the psychology you used.',
    '',
    'Paste into claude.ai - works with the standard Claude subscription.',
  ].filter((l) => l !== null).join('\n');
}

function promptDesignIncentives(state) {
  const mix = REF_TYPES.map((t) => `${t.label}: ${state.referrers.filter((r) => r.type === t.id).length}`).join(', ');
  return [
    promptHeader(state),
    '',
    '# Extra context',
    `- Referrer mix on my roster: ${mix || 'empty roster'}`,
    `- Roster size: ${state.referrers.length}`,
    '',
    '# Your task',
    `Design 3 alternative incentive structures for my price point (${state.program.pricePoint || 'not set - assume a mid-four-figure service'}). For each: the exact give/get amounts, unit economics (cost per closed referral vs revenue), which referrer types it motivates best, one risk, and how to describe it in one warm sentence. Then recommend ONE structure and the payout trigger that best fits, and say why in 3 bullets.`,
    '',
    '# Output format',
    'A markdown table comparing the 3 structures, then a "Recommendation" section. Be specific with numbers - no hand-waving.',
    '',
    'Paste into claude.ai - works with the standard Claude subscription.',
  ].join('\n');
}

function promptThankYou(state) {
  const nameOf = (id) => (state.referrers.find((r) => r.id === id) || {}).name || 'a referrer';
  const recent = state.referrals.slice(0, 6).map((r) => `- ${r.prospect} (${r.company || 'n/a'}) via ${nameOf(r.referrerId)} - stage: ${labelOf(STAGES, r.stage)}, value ${money(r.value)}`);
  return [
    promptHeader(state),
    '',
    '# Recent referrals to thank people for',
    recent.length ? recent.join('\n') : '- (none yet - write templates I can reuse)',
    '',
    '# Your task',
    'Write my 3-touch thank-you sequence for referrers: (1) within 48h of the intro - gratitude, zero outcome pressure; (2) when the deal closes - deliver the incentive and make them feel like a hero; (3) 30 days later - a "ripple update" showing what their intro set in motion. Each touch under 90 words, sendable as-is, warm but not gushing. Where a real name above fits, personalize touch 1 for them as an example.',
    '',
    '# Output format',
    'Three sections titled Touch 1 / Touch 2 / Touch 3, each with subject line (if email) and body. Then a two-line note on timing.',
    '',
    'Paste into claude.ai - works with the standard Claude subscription.',
  ].join('\n');
}

function promptWeeklyPlan(state) {
  const wk = thisWeekISO();
  const stale = state.referrers.filter((r) => r.strength >= 4 && (daysSince(r.lastAsk) === null || daysSince(r.lastAsk) > 45));
  return [
    promptHeader(state),
    '',
    '# My funnel right now',
    funnelMarkdown(state),
    '',
    '# This week’s queue',
    queueMarkdown(state),
    '',
    '# Coverage gaps',
    `- Strong referrers (4-5) not asked in 45+ days: ${stale.length ? stale.map((r) => r.name).join(', ') : 'none'}`,
    `- Weekly target: ${state.program.weeklyTarget} asks; week of ${wk}.`,
    '',
    '# Your task',
    'Audit this referral engine like an operator. Diagnose the single weakest stage of my funnel and the most likely cause. Then plan next week: pick the 3 best people to ask (with a one-line reason each), flag anything in my queue that looks off (wrong channel, stale script), and propose ONE small experiment to improve conversion at the weak stage.',
    '',
    '# Output format',
    'Sections: Diagnosis / Next week’s 3 asks / Queue fixes / One experiment. Keep it under 350 words - this is a working brief, not an essay.',
    '',
    'Paste into claude.ai - works with the standard Claude subscription.',
  ].join('\n');
}

/* ---------------- clipboard / download helpers ---------------- */

function legacyCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch { return false; }
}
function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
      return true;
    }
  } catch { /* fall through */ }
  return legacyCopy(text);
}
function downloadFile(name, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ================================================================
   Visual pieces
   ================================================================ */

function RippleField({ className }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0, w = 0, h = 0, t = 0;
    const nodes = [];
    const seed = () => {
      nodes.length = 0;
      const n = Math.max(6, Math.min(14, Math.floor(w / 120)));
      for (let i = 0; i < n; i++) {
        nodes.push({
          x: (i + 0.5) / n * w + (Math.random() - 0.5) * (w / n) * 0.8,
          y: h * 0.22 + Math.random() * h * 0.6,
          phase: Math.random() * 500,
          period: 300 + Math.random() * 260,
          big: Math.random() > 0.6,
        });
      }
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 200) {
            ctx.strokeStyle = `rgba(62,230,248,${(0.11 * (1 - d / 200)).toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (const nd of nodes) {
        const rings = nd.big ? 3 : 2;
        const maxR = nd.big ? 84 : 52;
        for (let k = 0; k < rings; k++) {
          const p = (((t + nd.phase) / nd.period) + k / rings) % 1;
          const alpha = (1 - p) * (nd.big ? 0.34 : 0.22);
          ctx.strokeStyle = `rgba(62,230,248,${alpha.toFixed(3)})`;
          ctx.lineWidth = 1.25;
          ctx.beginPath(); ctx.arc(nd.x, nd.y, 4 + p * maxR, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(125,243,255,0.95)';
        ctx.shadowColor = 'rgba(62,230,248,0.8)';
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(nd.x, nd.y, nd.big ? 2.6 : 1.9, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      t += 1;
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reduced) { t = 120; draw(); }
    };
    resize();
    if (!reduced) draw();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 44 44" className="h-11 w-11 shrink-0" aria-hidden="true">
        <circle cx="22" cy="22" r="20" fill="none" stroke="var(--color-ripple-800)" strokeWidth="1" />
        <circle cx="22" cy="22" r="14.5" fill="none" stroke="var(--color-ripple-600)" strokeWidth="1.2" />
        <circle cx="22" cy="22" r="9" fill="none" stroke="var(--color-ripple-400)" strokeWidth="1.5" />
        <circle cx="22" cy="22" r="3.2" fill="var(--color-ripple-300)" />
        <circle cx="35" cy="12" r="1.6" fill="var(--color-ripple-400)" />
        <circle cx="8.5" cy="30" r="1.3" fill="var(--color-ripple-600)" />
        <path d="M24.5 20.3 L34 13" stroke="var(--color-ripple-600)" strokeWidth="0.9" />
        <path d="M19.8 24.2 L9.6 29.3" stroke="var(--color-ripple-800)" strokeWidth="0.9" />
      </svg>
      <div>
        <div className="font-display text-xl font-bold tracking-tight text-white-ice leading-none">
          Referral<span className="text-ripple-400"> Engine</span>
        </div>
        <div className="mt-1 text-[11px] font-mono uppercase tracking-[0.18em] text-mist">
          Drop the stone. Track every ripple.
        </div>
      </div>
    </div>
  );
}

function StrengthGlyph({ n, size = 26 }) {
  const rings = [4.5, 7.5, 10.5, 13.5];
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true" className="shrink-0">
      <circle cx="15" cy="15" r="2.4" fill={n >= 1 ? 'var(--color-ripple-300)' : 'var(--color-ink-600)'} />
      {rings.map((r, i) => (
        <circle key={r} cx="15" cy="15" r={r} fill="none"
          stroke={n >= i + 2 ? 'var(--color-ripple-500)' : 'var(--color-ink-700)'}
          strokeWidth={n >= i + 2 ? 1.6 : 1} opacity={n >= i + 2 ? 1 - i * 0.14 : 0.8} />
      ))}
    </svg>
  );
}

function ArcGauge({ value, target }) {
  const pct = Math.max(0, Math.min(1, target ? value / target : 0));
  const r = 26, cx = 32, cy = 32;
  const circ = Math.PI * r;
  return (
    <svg viewBox="0 0 64 40" className="w-16" aria-hidden="true">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--color-ink-700)" strokeWidth="5" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none"
        stroke={pct >= 1 ? 'var(--color-won)' : 'var(--color-ripple-400)'} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${(circ * pct).toFixed(1)} ${circ.toFixed(1)}`} />
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const a = Math.PI * (1 - t);
        return <line key={t}
          x1={cx + Math.cos(a) * (r - 6)} y1={cy - Math.sin(a) * (r - 6)}
          x2={cx + Math.cos(a) * (r - 9)} y2={cy - Math.sin(a) * (r - 9)}
          stroke="var(--color-line)" strokeWidth="1" />;
      })}
    </svg>
  );
}

function FunnelChart({ rows, wonValue, pipelineValue }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const W = 640, rowH = 52, left = 150, right = 84;
  const bw = W - left - right;
  const H = rows.length * rowH + 40;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Referral funnel chart">
      <defs>
        <linearGradient id="funnelGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-ripple-600)" />
          <stop offset="100%" stopColor="var(--color-ripple-400)" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={left + bw * t} y1={22} x2={left + bw * t} y2={H - 14} stroke="var(--color-line-soft)" strokeDasharray="2 5" />
          <text x={left + bw * t} y={13} textAnchor="middle" fontSize="9" fill="var(--color-mist)" fontFamily="var(--font-mono)">
            {Math.round(max * t)}
          </text>
        </g>
      ))}
      {rows.map((r, i) => {
        const w = Math.max(3, (r.count / max) * bw);
        const y = 30 + i * rowH;
        const conv = i > 0 && rows[i - 1].count > 0 ? Math.round((100 * r.count) / rows[i - 1].count) : null;
        return (
          <g key={r.label}>
            <text x={left - 12} y={y + 13} textAnchor="end" fontSize="12.5" fontWeight="700" fill="var(--color-fog)" fontFamily="var(--font-display)">{r.label}</text>
            {conv !== null && (
              <text x={left - 12} y={y + 28} textAnchor="end" fontSize="9.5" fill="var(--color-mist)" fontFamily="var(--font-mono)">{conv}% carry</text>
            )}
            <rect x={left} y={y} width={w} height={20} rx={10} fill="url(#funnelGrad)" opacity={0.3 + 0.7 * (r.count / max)} />
            <circle cx={left + w} cy={y + 10} r={4.2} fill="var(--color-ripple-300)" />
            <circle cx={left + w} cy={y + 10} r={8} fill="none" stroke="var(--color-ripple-500)" strokeWidth="1" opacity="0.5" />
            <text x={left + w + 16} y={y + 14} fontSize="13" fill="var(--color-ripple-300)" fontFamily="var(--font-mono)" fontWeight="600">{r.count}</text>
          </g>
        );
      })}
      <text x={left} y={H - 2} fontSize="10" fill="var(--color-mist)" fontFamily="var(--font-mono)">
        pipeline {pipelineValue} - landed {wonValue}
      </text>
    </svg>
  );
}

/* ---------------- small UI atoms ---------------- */

function Btn({ children, onClick, kind = 'ghost', className = '', ...rest }) {
  const kinds = {
    primary: 'bg-ripple-500 text-ink-950 hover:bg-ripple-400 font-semibold shadow-[0_0_20px_-4px_rgba(20,200,222,0.5)]',
    ghost: 'border border-line bg-ink-850 text-fog hover:border-ripple-600 hover:text-white-ice',
    danger: 'border border-line bg-ink-850 text-lost hover:border-lost',
    quiet: 'text-mist hover:text-ripple-300',
  };
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${kinds[kind]} ${className}`}
      {...rest}>
      {children}
    </button>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? 'border-ripple-500 bg-ripple-500/15 text-ripple-300'
          : 'border-line bg-ink-850 text-mist hover:border-ripple-800 hover:text-fog'
      }`}>
      {children}
    </button>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-mono uppercase tracking-[0.14em] text-mist">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-mist/70">{hint}</span>}
    </label>
  );
}

const inputCls = 'w-full rounded-lg border border-line bg-ink-900 px-3 py-2 text-sm text-white-ice placeholder:text-mist/50 focus:border-ripple-600';

function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/85 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`anim-fade-up relative mt-4 w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-2xl border border-line bg-ink-900 shadow-pool`}>
        <div className="flex items-center justify-between border-b border-line-soft px-5 py-3.5">
          <h2 className="font-display text-base font-bold text-white-ice">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog"
            className="rounded-md p-1 text-mist hover:bg-ink-800 hover:text-white-ice">
            <X className="h-4.5 w-4.5" aria-hidden />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function EmptyCoach({ icon: Icon, title, body, action }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-ink-600 bg-ink-900/60 px-6 py-10 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full border border-ripple-800 bg-ink-850">
        <Icon className="h-5 w-5 text-ripple-400" aria-hidden />
      </div>
      <h3 className="font-display text-base font-bold text-white-ice">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-mist">{body}</p>
      {action && <div className="mt-4 flex justify-center gap-2">{action}</div>}
    </div>
  );
}

/* ================================================================
   Main App
   ================================================================ */

export default function App() {
  const [state, setState] = useState(loadState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [tab, setTab] = useState('program');
  const [helpOpen, setHelpOpen] = useState(() => !loadState().seenGuide);
  const [exportOpen, setExportOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [editingReferrer, setEditingReferrer] = useState(null); // object or 'new'
  const [editingReferral, setEditingReferral] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const fileInputRef = useRef(null);

  /* autosave (debounced) */
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
    }, 350);
    return () => clearTimeout(t);
  }, [state]);

  const showToast = useCallback((msg, undo) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), 7000);
  }, []);

  const patch = useCallback((fn) => setState((s) => normalize(fn(s))), []);
  const patchProgram = useCallback((k, v) => patch((s) => ({ ...s, program: { ...s.program, [k]: v } })), [patch]);

  const closeAllModals = useCallback(() => {
    setHelpOpen((h) => {
      if (h) setState((s) => (s.seenGuide ? s : { ...s, seenGuide: true }));
      return false;
    });
    setExportOpen(false); setResetOpen(false);
    setEditingReferrer(null); setEditingReferral(null);
  }, []);

  const copyMarkdown = useCallback(() => {
    copyText(stateToMarkdown(stateRef.current));
    showToast('Markdown copied - the whole program, ready to paste.');
  }, [showToast]);

  /* keyboard */
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      const typing = el instanceof HTMLElement &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if (e.key === 'Escape') { closeAllModals(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); copyMarkdown(); return; }
      if (typing) return;
      if (e.key === '?') { e.preventDefault(); setHelpOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeAllModals, copyMarkdown]);

  /* derived */
  const wk = thisWeekISO();
  const weekQueue = state.queue.filter((q) => q.week === wk);
  const pastQueue = state.queue.filter((q) => q.week !== wk);
  const asksDone = weekQueue.filter((q) => q.status === 'sent' || q.status === 'replied').length;
  const sentBy = useMemo(() => countReferralsBy(state), [state]);
  const openReferrals = state.referrals.filter((r) => r.stage !== 'won' && r.stage !== 'lost');
  const wonReferrals = state.referrals.filter((r) => r.stage === 'won');
  const pipelineValue = openReferrals.reduce((a, r) => a + r.value, 0);
  const wonValue = wonReferrals.reduce((a, r) => a + r.value, 0);
  const strongCount = state.referrers.filter((r) => r.strength >= 4).length;
  const referrerOf = useCallback((id) => state.referrers.find((r) => r.id === id), [state.referrers]);

  /* actions */
  function loadDemo() {
    const snapshot = stateRef.current;
    setState(demoState());
    showToast('Demo pond loaded - Northbeam Studio’s referral engine.', () => setState(snapshot));
  }
  function doReset() {
    setState(normalize({ seenGuide: true }));
    setResetOpen(false);
    showToast('Reset. Still water - drop your first stone.');
  }
  function deleteReferrer(id) {
    const snapshot = stateRef.current;
    const name = referrerOf(id)?.name || 'Referrer';
    patch((s) => ({ ...s, referrers: s.referrers.filter((r) => r.id !== id) }));
    showToast(`${name} removed from the roster.`, () => setState(snapshot));
  }
  function deleteQueueItem(id) {
    const snapshot = stateRef.current;
    patch((s) => ({ ...s, queue: s.queue.filter((q) => q.id !== id) }));
    showToast('Ask removed from the queue.', () => setState(snapshot));
  }
  function deleteReferral(id) {
    const snapshot = stateRef.current;
    patch((s) => ({ ...s, referrals: s.referrals.filter((r) => r.id !== id) }));
    showToast('Referral removed.', () => setState(snapshot));
  }
  function queueAsk(referrer) {
    const channel = state.program.channels[0] || 'email';
    patch((s) => ({
      ...s,
      queue: [{ id: uid(), referrerId: referrer.id, week: wk, channel, status: 'queued', script: draftScript(s.program, referrer, channel) }, ...s.queue],
    }));
    setTab('queue');
    showToast(`${referrer.name} queued for this week.`);
  }
  function setQueueStatus(id, status) {
    patch((s) => ({
      ...s,
      queue: s.queue.map((q) => (q.id === id ? { ...q, status } : q)),
      referrers: status === 'sent' || status === 'replied'
        ? s.referrers.map((r) => {
            const q = s.queue.find((x) => x.id === id);
            return q && r.id === q.referrerId ? { ...r, lastAsk: todayISO() } : r;
          })
        : s.referrers,
    }));
  }
  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = normalize(JSON.parse(String(reader.result)));
        const snapshot = stateRef.current;
        setState({ ...next, seenGuide: true });
        setExportOpen(false);
        showToast('Import complete - state replaced.', () => setState(snapshot));
      } catch {
        showToast('Import failed - that file is not valid JSON.');
      }
    };
    reader.readAsText(file);
  }

  const suggestions = useMemo(() => {
    const queuedIds = new Set(weekQueue.map((q) => q.referrerId));
    return [...state.referrers]
      .filter((r) => !queuedIds.has(r.id))
      .sort((a, b) => (b.strength - a.strength) || ((daysSince(b.lastAsk) ?? 9999) - (daysSince(a.lastAsk) ?? 9999)))
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 5);
  }, [state.referrers, weekQueue]);

  const funnel = funnelRows(state);

  /* ---------------- render ---------------- */

  return (
    <div className="min-h-screen font-body">
      <div className="print:hidden">
        {/* ======= hero ======= */}
        <header className="relative overflow-hidden border-b border-line">
          <div className="ambient-dots absolute inset-0" aria-hidden />
          <RippleField className="absolute inset-0 h-full w-full" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-950/90" aria-hidden />
          <div className="relative mx-auto max-w-7xl px-4 pb-6 pt-6 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <Wordmark />
              <div className="flex flex-wrap items-center gap-2">
                <Btn onClick={loadDemo}><Droplets className="h-4 w-4" aria-hidden />Load demo</Btn>
                <Btn onClick={() => setResetOpen(true)}><RotateCcw className="h-4 w-4" aria-hidden />Reset</Btn>
                <Btn onClick={() => setHelpOpen(true)}><HelpCircle className="h-4 w-4" aria-hidden />How to use</Btn>
                <Btn kind="primary" onClick={() => setExportOpen(true)}><Download className="h-4 w-4" aria-hidden />Export</Btn>
              </div>
            </div>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-fog">
              Design your referral program once - then work it every single week.
              <span className="text-mist"> One stone, dropped well, keeps rippling.</span>
            </p>

            {/* stat strip */}
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-xl border border-line bg-ink-900/80 px-4 py-3 backdrop-blur-sm">
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-mist">First ring</div>
                <div className="mt-1 font-mono text-2xl font-semibold text-white-ice">{state.referrers.length}</div>
                <div className="text-[11px] text-mist">{strongCount} strong (4-5)</div>
              </div>
              <div className="rounded-xl border border-line bg-ink-900/80 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-mist">Asks this week</div>
                    <div className="mt-1 font-mono text-2xl font-semibold text-white-ice">
                      {asksDone}<span className="text-sm text-mist">/{state.program.weeklyTarget}</span>
                    </div>
                  </div>
                  <ArcGauge value={asksDone} target={state.program.weeklyTarget} />
                </div>
              </div>
              <div className="rounded-xl border border-line bg-ink-900/80 px-4 py-3 backdrop-blur-sm">
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-mist">Live ripples</div>
                <div className="mt-1 font-mono text-2xl font-semibold text-ripple-300">{openReferrals.length}</div>
                <div className="text-[11px] text-mist">{money(pipelineValue)} in motion</div>
              </div>
              <div className="rounded-xl border border-line bg-ink-900/80 px-4 py-3 backdrop-blur-sm">
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-mist">Landed</div>
                <div className="mt-1 font-mono text-2xl font-semibold text-won">{wonReferrals.length}</div>
                <div className="text-[11px] text-mist">{money(wonValue)} won</div>
              </div>
            </div>
          </div>
        </header>

        {/* ======= nav ======= */}
        <nav className="sticky top-0 z-30 border-b border-line bg-ink-950/90 backdrop-blur" aria-label="Sections">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
            {[
              { id: 'program', label: 'Program', sub: 'design the drop', icon: Target },
              { id: 'roster', label: 'Roster', sub: 'your first ring', icon: Users, count: state.referrers.length },
              { id: 'queue', label: 'Ask Queue', sub: 'make waves weekly', icon: CalendarClock, count: weekQueue.length },
              { id: 'funnel', label: 'Funnel', sub: 'where ripples land', icon: TrendingUp, count: state.referrals.length },
            ].map((t) => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm transition-colors ${
                  tab === t.id ? 'border-ripple-400 text-white-ice' : 'border-transparent text-mist hover:text-fog'
                }`}>
                <t.icon className="h-4 w-4" aria-hidden />
                <span className="font-semibold">{t.label}</span>
                {typeof t.count === 'number' && (
                  <span className="rounded-full bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-ripple-300">{t.count}</span>
                )}
                <span className="hidden text-[10px] font-mono uppercase tracking-wider text-mist/60 lg:inline">{t.sub}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* ======= body ======= */}
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 xl:grid-cols-[1fr_340px]">
          <main>
            {tab === 'program' && (
              <ProgramTab program={state.program} patchProgram={patchProgram} />
            )}
            {tab === 'roster' && (
              <RosterTab
                referrers={state.referrers} sentBy={sentBy}
                onAdd={() => setEditingReferrer('new')}
                onEdit={setEditingReferrer}
                onDelete={deleteReferrer}
                onQueue={queueAsk}
                onDemo={loadDemo}
              />
            )}
            {tab === 'queue' && (
              <QueueTab
                weekQueue={weekQueue} pastQueue={pastQueue} wk={wk}
                program={state.program} referrerOf={referrerOf}
                suggestions={suggestions}
                onQueue={queueAsk}
                onStatus={setQueueStatus}
                onDelete={deleteQueueItem}
                onScript={(id, script) => patch((s) => ({ ...s, queue: s.queue.map((q) => (q.id === id ? { ...q, script } : q)) }))}
                onChannel={(id, channel) => patch((s) => ({
                  ...s,
                  queue: s.queue.map((q) => {
                    if (q.id !== id) return q;
                    const ref = s.referrers.find((r) => r.id === q.referrerId);
                    return { ...q, channel, script: ref ? draftScript(s.program, ref, channel) : q.script };
                  }),
                }))}
                gotoRoster={() => setTab('roster')}
              />
            )}
            {tab === 'funnel' && (
              <FunnelTab
                state={state} funnel={funnel} referrerOf={referrerOf}
                pipelineValue={pipelineValue} wonValue={wonValue}
                onAdd={() => setEditingReferral('new')}
                onEdit={setEditingReferral}
                onDelete={deleteReferral}
                onStage={(id, stage) => patch((s) => ({ ...s, referrals: s.referrals.map((r) => (r.id === id ? { ...r, stage } : r)) }))}
              />
            )}
          </main>

          {/* ======= copilot rail ======= */}
          <CopilotRail
            state={state}
            notes={state.copilotNotes}
            onNotes={(v) => patch((s) => ({ ...s, copilotNotes: v }))}
            onCopied={(what) => showToast(`${what} prompt copied - paste into claude.ai.`)}
          />
        </div>

        <footer className="border-t border-line-soft py-6 text-center text-[11px] font-mono uppercase tracking-[0.2em] text-mist/50">
          Referral Engine - part of the BizDev-30 suite - your data never leaves this browser
        </footer>
      </div>

      {/* ======= print one-pager ======= */}
      <PrintSheet state={state} />

      {/* ======= modals ======= */}
      <Modal open={helpOpen} onClose={closeAllModals} title="How to use Referral Engine" wide>
        <HelpContent />
      </Modal>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset everything?">
        <p className="text-sm text-fog">
          This clears the program, roster, queue and funnel from this browser. Export a JSON backup first if you might want it back.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Btn onClick={() => setResetOpen(false)}>Keep my data</Btn>
          <Btn kind="danger" onClick={doReset}><Trash2 className="h-4 w-4" aria-hidden />Yes, reset</Btn>
        </div>
      </Modal>

      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title="Export & import">
        <div className="grid gap-2">
          <Btn onClick={() => { copyMarkdown(); setExportOpen(false); }}>
            <FileText className="h-4 w-4" aria-hidden />Copy Markdown - full program brief
          </Btn>
          <Btn onClick={() => { downloadFile('referral-engine.json', JSON.stringify(stateRef.current, null, 2), 'application/json'); }}>
            <FileJson className="h-4 w-4" aria-hidden />Download JSON - complete state
          </Btn>
          <Btn onClick={() => { downloadFile('referrer-roster.csv', rosterCSV(stateRef.current), 'text/csv'); }}>
            <Table2 className="h-4 w-4" aria-hidden />Download roster CSV
          </Btn>
          <Btn onClick={() => { downloadFile('referrals.csv', referralsCSV(stateRef.current), 'text/csv'); }}>
            <Table2 className="h-4 w-4" aria-hidden />Download referrals CSV
          </Btn>
          <Btn onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden />Print the program one-pager
          </Btn>
          <div className="mt-1 border-t border-line-soft pt-3">
            <Btn onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" aria-hidden />Import JSON backup
            </Btn>
            <input ref={fileInputRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Import JSON file"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importJSON(f); e.target.value = ''; }} />
            <p className="mt-2 text-[11px] text-mist">Imports replace current state (with Undo available for a few seconds).</p>
          </div>
        </div>
      </Modal>

      {editingReferrer !== null && (
        <ReferrerModal
          initial={editingReferrer === 'new' ? null : editingReferrer}
          onClose={() => setEditingReferrer(null)}
          onSave={(data) => {
            patch((s) => editingReferrer === 'new'
              ? { ...s, referrers: [{ ...data, id: uid() }, ...s.referrers] }
              : { ...s, referrers: s.referrers.map((r) => (r.id === editingReferrer.id ? { ...r, ...data } : r)) });
            setEditingReferrer(null);
          }}
        />
      )}

      {editingReferral !== null && (
        <ReferralModal
          initial={editingReferral === 'new' ? null : editingReferral}
          referrers={state.referrers}
          onClose={() => setEditingReferral(null)}
          onSave={(data) => {
            patch((s) => editingReferral === 'new'
              ? { ...s, referrals: [{ ...data, id: uid() }, ...s.referrals] }
              : { ...s, referrals: s.referrals.map((r) => (r.id === editingReferral.id ? { ...r, ...data } : r)) });
            setEditingReferral(null);
          }}
        />
      )}

      {/* ======= undo toast ======= */}
      {toast && (
        <div className="anim-toast fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-xl border border-line bg-ink-850 px-4 py-3 shadow-pool" role="status">
          <Waves className="h-4 w-4 shrink-0 text-ripple-400" aria-hidden />
          <span className="flex-1 text-sm text-fog">{toast.msg}</span>
          {toast.undo && (
            <button type="button"
              onClick={() => { toast.undo(); setToast(null); }}
              className="inline-flex items-center gap-1 rounded-md border border-ripple-800 px-2.5 py-1 text-xs font-semibold text-ripple-300 hover:bg-ripple-500/10">
              <Undo2 className="h-3.5 w-3.5" aria-hidden />Undo
            </button>
          )}
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification"
            className="rounded p-0.5 text-mist hover:text-white-ice"><X className="h-3.5 w-3.5" aria-hidden /></button>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Tab: Program designer
   ================================================================ */

function ProgramTab({ program, patchProgram }) {
  const toggle = (k, id) => patchProgram(k, program[k].includes(id) ? program[k].filter((x) => x !== id) : [...program[k], id]);
  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-line bg-ink-900/70 p-5 shadow-pool">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white-ice">
          <Target className="h-5 w-5 text-ripple-400" aria-hidden />The offer
        </h2>
        <p className="mt-0.5 text-xs text-mist">What are people referring, and what is it worth?</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Program name">
            <input className={inputCls} value={program.name} onChange={(e) => patchProgram('name', e.target.value)} placeholder="e.g. Studio referral program" />
          </Field>
          <Field label="Average deal value">
            <input className={inputCls} value={program.pricePoint} onChange={(e) => patchProgram('pricePoint', e.target.value)} placeholder="e.g. $9,500 avg first project" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="What you sell (one line, in plain words)">
              <input className={inputCls} value={program.offer} onChange={(e) => patchProgram('offer', e.target.value)} placeholder="e.g. B2B web design & brand sprints for ops-heavy companies" />
            </Field>
          </div>
          <Field label="Weekly ask target" hint="Asks per week you commit to. 2-3 is sustainable.">
            <input type="number" min="1" max="20" className={inputCls} value={program.weeklyTarget}
              onChange={(e) => patchProgram('weeklyTarget', Math.min(20, Math.max(1, Number(e.target.value) || 1)))} />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-ink-900/70 p-5 shadow-pool">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white-ice">
          <Gift className="h-5 w-5 text-ember" aria-hidden />The incentive
        </h2>
        <p className="mt-0.5 text-xs text-mist">What flows back to the person who drops your name.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-label="Incentive type">
          {INCENTIVE_TYPES.map((t) => (
            <button key={t.id} type="button" onClick={() => patchProgram('incentiveType', t.id)}
              aria-pressed={program.incentiveType === t.id}
              className={`rounded-xl border p-3 text-left transition-colors ${
                program.incentiveType === t.id
                  ? 'border-ripple-500 bg-ripple-500/10'
                  : 'border-line bg-ink-850 hover:border-ripple-800'
              }`}>
              <div className={`text-sm font-bold ${program.incentiveType === t.id ? 'text-ripple-300' : 'text-fog'}`}>{t.label}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-mist">{t.hint}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="The referrer gets">
            <input className={inputCls} value={program.incentiveGive} onChange={(e) => patchProgram('incentiveGive', e.target.value)} placeholder="e.g. 10% of first project fee, paid within a week" />
          </Field>
          <Field label={program.doubleSided ? 'The referred person gets' : 'Referred side (off)'}>
            <input className={inputCls} disabled={!program.doubleSided} value={program.incentiveGet}
              onChange={(e) => patchProgram('incentiveGet', e.target.value)} placeholder="e.g. $500 off their first sprint" />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button type="button" role="switch" aria-checked={program.doubleSided}
            onClick={() => patchProgram('doubleSided', !program.doubleSided)}
            className="flex items-center gap-2 text-sm text-fog">
            <span className={`relative h-5 w-9 rounded-full transition-colors ${program.doubleSided ? 'bg-ripple-500' : 'bg-ink-600'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white-ice transition-all ${program.doubleSided ? 'left-4.5' : 'left-0.5'}`} />
            </span>
            Double-sided (both sides win)
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-mist">Pays out</span>
            {PAYOUT_TRIGGERS.map((t) => (
              <Chip key={t.id} active={program.payoutTrigger === t.id} onClick={() => patchProgram('payoutTrigger', t.id)}>{t.label}</Chip>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-ink-900/70 p-5 shadow-pool">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white-ice">
          <CalendarClock className="h-5 w-5 text-ripple-400" aria-hidden />The moment & the channel
        </h2>
        <p className="mt-0.5 text-xs text-mist">Referrals are asked for at high points, through channels the relationship already lives in.</p>
        <div className="mt-4">
          <span className="mb-2 block text-[11px] font-mono uppercase tracking-[0.14em] text-mist">Ask at these moments</span>
          <div className="flex flex-wrap gap-2">
            {MOMENTS.map((m) => (
              <Chip key={m.id} active={program.askMoments.includes(m.id)} onClick={() => toggle('askMoments', m.id)}>{m.label}</Chip>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <span className="mb-2 block text-[11px] font-mono uppercase tracking-[0.14em] text-mist">Through these channels (first = default)</span>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((c) => (
              <Chip key={c.id} active={program.channels.includes(c.id)} onClick={() => toggle('channels', c.id)}>{c.label}</Chip>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <Field label="Rules of the pond (program notes)" hint="Promises you make to referrers: speed of thank-you, payout timing, no-blast rule.">
            <textarea rows={3} className={inputCls} value={program.notes} onChange={(e) => patchProgram('notes', e.target.value)}
              placeholder="e.g. Every referral gets a handwritten thank-you within 48h; incentive paid within 7 days of close." />
          </Field>
        </div>
      </section>

      {/* live program card */}
      <section className="relative overflow-hidden rounded-2xl border border-ripple-800 bg-gradient-to-br from-ink-850 to-ink-900 p-5 shadow-pool">
        <div className="ambient-dots absolute inset-0 opacity-60" aria-hidden />
        <div className="relative">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-ripple-400">The stone, ready to drop</div>
          <h3 className="mt-1 font-display text-lg font-bold text-white-ice">{program.name}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fog">
            {program.offer ? `We deliver ${program.offer.toLowerCase()}. ` : 'Describe your offer above to complete this card. '}
            When someone you trust sends a good fit our way, you get {program.incentiveGive || 'a meaningful thank-you'}
            {program.doubleSided && program.incentiveGet ? ` - and they get ${program.incentiveGet}` : ''}.
            {' '}Paid {labelOf(PAYOUT_TRIGGERS, program.payoutTrigger).toLowerCase()}.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {program.askMoments.map((m) => (
              <span key={m} className="rounded-full bg-ripple-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-ripple-300">{labelOf(MOMENTS, m)}</span>
            ))}
            {program.channels.map((c) => (
              <span key={c} className="rounded-full bg-ink-800 px-2.5 py-0.5 text-[11px] font-semibold text-mist">{labelOf(CHANNELS, c)}</span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ================================================================
   Tab: Roster
   ================================================================ */

function RosterTab({ referrers, sentBy, onAdd, onEdit, onDelete, onQueue, onDemo }) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...referrers]
      .filter((r) => typeFilter === 'all' || r.type === typeFilter)
      .filter((r) => !q || `${r.name} ${r.company} ${r.role} ${r.notes}`.toLowerCase().includes(q))
      .sort((a, b) => (b.strength - a.strength) || ((sentBy[b.id] || 0) - (sentBy[a.id] || 0)));
  }, [referrers, query, typeFilter, sentBy]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-mist" aria-hidden />
          <input className={`${inputCls} pl-9`} placeholder="Search the ring..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search referrers" />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
          <Chip active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>All</Chip>
          {REF_TYPES.map((t) => (
            <Chip key={t.id} active={typeFilter === t.id} onClick={() => setTypeFilter(t.id)}>{t.label}</Chip>
          ))}
        </div>
        <Btn kind="primary" onClick={onAdd}><Plus className="h-4 w-4" aria-hidden />Add referrer</Btn>
      </div>

      {referrers.length === 0 ? (
        <EmptyCoach icon={Users} title="Your first ring is empty"
          body="List the 10 people who already trust your work - happy clients, past clients, partners, peers. They are the stones every ripple starts from."
          action={<><Btn kind="primary" onClick={onAdd}><Plus className="h-4 w-4" aria-hidden />Add your first referrer</Btn><Btn onClick={onDemo}>See the demo pond</Btn></>} />
      ) : list.length === 0 ? (
        <EmptyCoach icon={Search} title="No one matches" body="Loosen the search or the type filter." />
      ) : (
        <ul className="grid gap-2.5">
          {list.map((r) => (
            <li key={r.id} className="group rounded-xl border border-line bg-ink-900/70 p-4 transition-colors hover:border-ripple-800">
              <div className="flex flex-wrap items-start gap-3">
                <StrengthGlyph n={r.strength} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-display text-[15px] font-bold text-white-ice">{r.name}</span>
                    <span className="text-xs text-mist">{[r.role, r.company].filter(Boolean).join(', ')}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="rounded-full bg-ink-800 px-2 py-0.5 font-semibold text-mist">{labelOf(REF_TYPES, r.type)}</span>
                    <span className="font-mono text-ripple-300">{STRENGTH_LABELS[r.strength]}</span>
                    <span className="font-mono text-mist">asked {agoLabel(r.lastAsk)}</span>
                    <span className="font-mono text-mist">{sentBy[r.id] || 0} referral{(sentBy[r.id] || 0) === 1 ? '' : 's'} sent</span>
                  </div>
                  {r.notes && <p className="mt-1.5 text-xs leading-relaxed text-fog/80">{r.notes}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Btn onClick={() => onQueue(r)} className="text-xs"><Send className="h-3.5 w-3.5" aria-hidden />Queue ask</Btn>
                  <button type="button" onClick={() => onEdit(r)} aria-label={`Edit ${r.name}`}
                    className="rounded-md p-1.5 text-mist hover:bg-ink-800 hover:text-white-ice"><Pencil className="h-4 w-4" aria-hidden /></button>
                  <button type="button" onClick={() => onDelete(r.id)} aria-label={`Delete ${r.name}`}
                    className="rounded-md p-1.5 text-mist hover:bg-ink-800 hover:text-lost"><Trash2 className="h-4 w-4" aria-hidden /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ================================================================
   Tab: Ask Queue
   ================================================================ */

function QueueTab({ weekQueue, pastQueue, wk, program, referrerOf, suggestions, onQueue, onStatus, onDelete, onScript, onChannel, gotoRoster }) {
  const [copiedId, setCopiedId] = useState(null);
  const [showPast, setShowPast] = useState(false);
  const copyScript = (q) => { copyText(q.script); setCopiedId(q.id); setTimeout(() => setCopiedId(null), 1500); };

  return (
    <div className="grid gap-5">
      {suggestions.length > 0 && (
        <section className="rounded-2xl border border-ripple-800/60 bg-ink-900/70 p-4">
          <h3 className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-ripple-400">
            <Waves className="h-4 w-4" aria-hidden />Suggested next drops - strongest, least recently asked
          </h3>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {suggestions.map((r) => (
              <button key={r.id} type="button" onClick={() => onQueue(r)}
                className="flex items-center gap-2 rounded-full border border-line bg-ink-850 py-1 pl-1.5 pr-3 text-xs text-fog transition-colors hover:border-ripple-600">
                <StrengthGlyph n={r.strength} size={20} />
                <span className="font-semibold text-white-ice">{r.name}</span>
                <span className="font-mono text-mist">{agoLabel(r.lastAsk)}</span>
                <Plus className="h-3.5 w-3.5 text-ripple-400" aria-hidden />
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-bold text-white-ice">Week of <span className="font-mono text-ripple-300">{wk}</span></h2>
          <span className="text-xs font-mono text-mist">{weekQueue.length} queued - target {program.weeklyTarget}</span>
        </div>

        {weekQueue.length === 0 ? (
          <EmptyCoach icon={CalendarClock} title="Still water this week"
            body="Queue 2-3 asks from your roster. Each one is a stone: a personal script, a channel the relationship lives in, a clear thank-you."
            action={<Btn kind="primary" onClick={gotoRoster}><Users className="h-4 w-4" aria-hidden />Pick from the roster</Btn>} />
        ) : (
          <ul className="grid gap-3">
            {weekQueue.map((q) => {
              const r = referrerOf(q.referrerId);
              return (
                <li key={q.id} className="rounded-xl border border-line bg-ink-900/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {r ? <StrengthGlyph n={r.strength} size={26} /> : null}
                    <span className="font-display text-[15px] font-bold text-white-ice">{r?.name || '(removed referrer)'}</span>
                    {r?.company && <span className="text-xs text-mist">{r.company}</span>}
                    <span className="flex-1" />
                    <select value={q.channel} onChange={(e) => onChannel(q.id, e.target.value)} aria-label="Ask channel"
                      className="rounded-lg border border-line bg-ink-850 px-2 py-1 text-xs text-fog">
                      {CHANNELS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    <div className="flex overflow-hidden rounded-lg border border-line" role="group" aria-label="Ask status">
                      {QUEUE_STATUSES.map((s) => (
                        <button key={s.id} type="button" onClick={() => onStatus(q.id, s.id)}
                          aria-pressed={q.status === s.id}
                          className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                            q.status === s.id
                              ? s.id === 'replied' ? 'bg-won/20 text-won'
                                : s.id === 'skipped' ? 'bg-ink-700 text-mist'
                                : 'bg-ripple-500/20 text-ripple-300'
                              : 'bg-ink-850 text-mist hover:text-fog'
                          }`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => onDelete(q.id)} aria-label="Remove this ask"
                      className="rounded-md p-1.5 text-mist hover:bg-ink-800 hover:text-lost"><Trash2 className="h-4 w-4" aria-hidden /></button>
                  </div>
                  <textarea value={q.script} onChange={(e) => onScript(q.id, e.target.value)} rows={q.channel === 'email' || q.channel === 'call' ? 8 : 4}
                    aria-label={`Ask script for ${r?.name || 'referrer'}`}
                    className="mt-3 w-full rounded-lg border border-line-soft bg-ink-950/70 p-3 font-mono text-[12.5px] leading-relaxed text-fog focus:border-ripple-600" />
                  <div className="mt-2 flex justify-end">
                    <Btn onClick={() => copyScript(q)} className="text-xs">
                      {copiedId === q.id ? <Check className="h-3.5 w-3.5 text-won" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                      {copiedId === q.id ? 'Copied' : 'Copy script'}
                    </Btn>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {pastQueue.length > 0 && (
        <section>
          <button type="button" onClick={() => setShowPast(!showPast)}
            className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.14em] text-mist hover:text-fog">
            {showPast ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
            Earlier weeks ({pastQueue.length})
          </button>
          {showPast && (
            <ul className="mt-2 grid gap-1.5">
              {pastQueue.map((q) => {
                const r = referrerOf(q.referrerId);
                return (
                  <li key={q.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line-soft bg-ink-900/40 px-3 py-2 text-xs">
                    <span className="font-mono text-mist">{q.week}</span>
                    <span className="font-semibold text-fog">{r?.name || '(removed)'}</span>
                    <span className="text-mist">{labelOf(CHANNELS, q.channel)}</span>
                    <span className={`ml-auto rounded-full px-2 py-0.5 font-semibold ${
                      q.status === 'replied' ? 'bg-won/15 text-won' : q.status === 'sent' ? 'bg-ripple-500/15 text-ripple-300' : 'bg-ink-800 text-mist'
                    }`}>{labelOf(QUEUE_STATUSES, q.status)}</span>
                    <button type="button" onClick={() => onDelete(q.id)} aria-label="Delete past ask"
                      className="rounded p-1 text-mist hover:text-lost"><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

/* ================================================================
   Tab: Funnel
   ================================================================ */

function FunnelTab({ state, funnel, referrerOf, pipelineValue, wonValue, onAdd, onEdit, onDelete, onStage }) {
  const [stageFilter, setStageFilter] = useState('all');
  const list = state.referrals.filter((r) => stageFilter === 'all' || r.stage === stageFilter);
  const leaders = useMemo(() => {
    const by = countReferralsBy(state);
    return [...state.referrers].filter((r) => by[r.id]).sort((a, b) => (by[b.id] || 0) - (by[a.id] || 0)).slice(0, 3)
      .map((r) => ({ name: r.name, n: by[r.id] }));
  }, [state]);

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-line bg-ink-900/70 p-5 shadow-pool">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-white-ice">Where the ripples land</h2>
          {leaders.length > 0 && (
            <span className="text-[11px] font-mono text-mist">
              top sources: {leaders.map((l) => `${l.name} (${l.n})`).join(' - ')}
            </span>
          )}
        </div>
        {state.referrals.length === 0 && funnel[0].count === 0 ? (
          <p className="mt-3 text-sm text-mist">The funnel draws itself as you send asks and log referrals below.</p>
        ) : (
          <FunnelChart rows={funnel} wonValue={money(wonValue)} pipelineValue={money(pipelineValue)} />
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by stage">
            <Chip active={stageFilter === 'all'} onClick={() => setStageFilter('all')}>All ({state.referrals.length})</Chip>
            {STAGES.map((s) => (
              <Chip key={s.id} active={stageFilter === s.id} onClick={() => setStageFilter(s.id)}>
                {s.label} ({state.referrals.filter((r) => r.stage === s.id).length})
              </Chip>
            ))}
          </div>
          <span className="flex-1" />
          <Btn kind="primary" onClick={onAdd}><Plus className="h-4 w-4" aria-hidden />Log referral</Btn>
        </div>

        {state.referrals.length === 0 ? (
          <EmptyCoach icon={TrendingUp} title="No ripples tracked yet"
            body="The moment someone makes an intro, log it here. Watching a name move from intro to won is what keeps the weekly asks honest."
            action={<Btn kind="primary" onClick={onAdd}><Plus className="h-4 w-4" aria-hidden />Log your first referral</Btn>} />
        ) : list.length === 0 ? (
          <EmptyCoach icon={TrendingUp} title="Nothing in this stage" body="Pick another stage filter." />
        ) : (
          <ul className="grid gap-2.5">
            {list.map((r) => {
              const via = referrerOf(r.referrerId);
              return (
                <li key={r.id} className={`rounded-xl border p-4 transition-colors ${
                  r.stage === 'won' ? 'border-won/30 bg-won/5'
                    : r.stage === 'lost' ? 'border-line-soft bg-ink-900/40 opacity-75'
                    : 'border-line bg-ink-900/70 hover:border-ripple-800'
                }`}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <div className="min-w-0">
                      <span className="font-display text-[15px] font-bold text-white-ice">{r.prospect}</span>
                      {r.company && <span className="ml-2 text-xs text-mist">{r.company}</span>}
                    </div>
                    <span className="text-[11px] font-mono text-ripple-300">via {via?.name || '(removed)'}</span>
                    <span className="flex-1" />
                    <span className="font-mono text-sm font-semibold text-white-ice">{money(r.value)}</span>
                    <span className="text-[11px] font-mono text-mist">{r.date}</span>
                    <select value={r.stage} onChange={(e) => onStage(r.id, e.target.value)} aria-label={`Stage for ${r.prospect}`}
                      className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
                        r.stage === 'won' ? 'border-won/40 bg-won/10 text-won'
                          : r.stage === 'lost' ? 'border-line bg-ink-850 text-lost'
                          : 'border-line bg-ink-850 text-ripple-300'
                      }`}>
                      {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    <button type="button" onClick={() => onEdit(r)} aria-label={`Edit referral ${r.prospect}`}
                      className="rounded-md p-1.5 text-mist hover:bg-ink-800 hover:text-white-ice"><Pencil className="h-4 w-4" aria-hidden /></button>
                    <button type="button" onClick={() => onDelete(r.id)} aria-label={`Delete referral ${r.prospect}`}
                      className="rounded-md p-1.5 text-mist hover:bg-ink-800 hover:text-lost"><Trash2 className="h-4 w-4" aria-hidden /></button>
                  </div>
                  {r.notes && <p className="mt-1.5 text-xs leading-relaxed text-fog/80">{r.notes}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ================================================================
   Copilot rail
   ================================================================ */

function CopilotRail({ state, notes, onNotes, onCopied }) {
  const [refId, setRefId] = useState('');
  const [copied, setCopied] = useState('');
  const [preview, setPreview] = useState('');
  const chosen = state.referrers.find((r) => r.id === refId) || state.referrers[0];

  const actions = [
    {
      id: 'personalize', icon: Send, title: 'Personalize the ask',
      desc: 'Turn this week’s script into something only this referrer could receive.',
      needsReferrer: true,
      build: () => (chosen ? promptPersonalizeAsk(state, chosen) : ''),
      disabled: !chosen,
    },
    {
      id: 'incentives', icon: CircleDollarSign, title: 'Design incentives for my price point',
      desc: 'Three structures with real unit economics, one recommendation.',
      build: () => promptDesignIncentives(state),
    },
    {
      id: 'thankyou', icon: Gift, title: 'Write the thank-you sequence',
      desc: 'Three touches: on intro, on close, and the 30-day ripple update.',
      build: () => promptThankYou(state),
    },
    {
      id: 'weekly', icon: ListChecks, title: 'Audit my engine, plan the week',
      desc: 'Weakest funnel stage, next 3 asks, one experiment.',
      build: () => promptWeeklyPlan(state),
    },
  ];

  const doCopy = (a) => {
    const p = a.build();
    if (!p) return;
    copyText(p);
    setCopied(a.id);
    setTimeout(() => setCopied(''), 1600);
    onCopied(a.title);
  };

  return (
    <aside className="xl:sticky xl:top-16 xl:self-start" aria-label="Claude Copilot">
      <div className="rounded-2xl border border-ripple-800/70 bg-gradient-to-b from-ink-850 to-ink-900 p-4 shadow-pool">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-ripple-500/15">
            <Sparkles className="h-4 w-4 text-ripple-300" aria-hidden />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-white-ice">Claude Copilot</h2>
            <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-mist">Prompts built from your live data</p>
          </div>
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-mist">
          Each action packs your program, roster and funnel into one excellent prompt.
          Paste into claude.ai - works with the standard Claude subscription, no API key.
        </p>

        <div className="mt-3 grid gap-2.5">
          {actions.map((a) => (
            <div key={a.id} className="rounded-xl border border-line bg-ink-900/80 p-3">
              <div className="flex items-start gap-2">
                <a.icon className="mt-0.5 h-4 w-4 shrink-0 text-ripple-400" aria-hidden />
                <div className="min-w-0 flex-1">
                  <h3 className="text-[13px] font-bold text-fog">{a.title}</h3>
                  <p className="mt-0.5 text-[11px] leading-snug text-mist">{a.desc}</p>
                  {a.needsReferrer && state.referrers.length > 0 && (
                    <select value={chosen?.id || ''} onChange={(e) => setRefId(e.target.value)} aria-label="Referrer to personalize for"
                      className="mt-2 w-full rounded-lg border border-line bg-ink-850 px-2 py-1.5 text-xs text-fog">
                      {state.referrers.map((r) => <option key={r.id} value={r.id}>{r.name}{r.company ? ` - ${r.company}` : ''}</option>)}
                    </select>
                  )}
                  {a.needsReferrer && state.referrers.length === 0 && (
                    <p className="mt-1.5 text-[11px] italic text-mist/70">Add a referrer first.</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <button type="button" onClick={() => doCopy(a)} disabled={a.disabled}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        a.disabled ? 'cursor-not-allowed bg-ink-800 text-mist/50'
                          : copied === a.id ? 'bg-won/20 text-won'
                          : 'bg-ripple-500/15 text-ripple-300 hover:bg-ripple-500/25'
                      }`}>
                      {copied === a.id ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                      {copied === a.id ? 'Copied' : 'Copy prompt'}
                    </button>
                    <button type="button" disabled={a.disabled}
                      onClick={() => setPreview(preview === a.id ? '' : a.id)}
                      className="text-[11px] font-mono text-mist underline-offset-2 hover:text-fog hover:underline disabled:opacity-40">
                      {preview === a.id ? 'hide' : 'preview'}
                    </button>
                  </div>
                  {preview === a.id && !a.disabled && (
                    <pre className="mt-2 max-h-44 overflow-y-auto whitespace-pre-wrap rounded-lg border border-line-soft bg-ink-950/80 p-2.5 font-mono text-[10.5px] leading-relaxed text-fog/80">{a.build()}</pre>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-line bg-ink-900/80 p-3">
          <h3 className="flex items-center gap-1.5 text-[13px] font-bold text-fog">
            <ClipboardPaste className="h-4 w-4 text-ripple-400" aria-hidden />Claude&rsquo;s answer
          </h3>
          <p className="mt-0.5 text-[11px] text-mist">Paste the response you want to keep - it saves with your data.</p>
          <textarea rows={5} value={notes} onChange={(e) => onNotes(e.target.value)} aria-label="Claude answer notes"
            placeholder="Paste Claude's plan, sequence or rewrite here..."
            className="mt-2 w-full rounded-lg border border-line-soft bg-ink-950/70 p-2.5 font-mono text-[11.5px] leading-relaxed text-fog placeholder:text-mist/40 focus:border-ripple-600" />
        </div>
      </div>
    </aside>
  );
}

/* ================================================================
   Editors
   ================================================================ */

function ReferrerModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(() => initial || { name: '', company: '', role: '', type: 'client', strength: 3, lastAsk: '', notes: '' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal open onClose={onClose} title={initial ? `Edit ${initial.name}` : 'Add a referrer'}>
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Maya Chen" autoFocus /></Field>
          <Field label="Company"><input className={inputCls} value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="Alderline Logistics" /></Field>
          <Field label="Role"><input className={inputCls} value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="COO" /></Field>
          <Field label="Relationship type">
            <select className={inputCls} value={form.type} onChange={(e) => set('type', e.target.value)}>
              {REF_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </Field>
        </div>
        <div>
          <span className="mb-1.5 block text-[11px] font-mono uppercase tracking-[0.14em] text-mist">Relationship strength</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Relationship strength">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => set('strength', n)} aria-pressed={form.strength === n}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  form.strength === n ? 'border-ripple-500 bg-ripple-500/10 text-ripple-300' : 'border-line bg-ink-850 text-mist hover:border-ripple-800'
                }`}>
                <StrengthGlyph n={n} size={20} />{STRENGTH_LABELS[n]}
              </button>
            ))}
          </div>
        </div>
        <Field label="Last asked (leave blank if never)">
          <input type="date" className={inputCls} value={form.lastAsk} onChange={(e) => set('lastAsk', e.target.value)} />
        </Field>
        <Field label="Notes - what makes their intros land">
          <textarea rows={3} className={inputCls} value={form.notes} onChange={(e) => set('notes', e.target.value)}
            placeholder="Who do they know? What do they love about your work? How do they prefer to be reached?" />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" onClick={() => form.name.trim() && onSave(form)}>
            <Check className="h-4 w-4" aria-hidden />{initial ? 'Save changes' : 'Add to the ring'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function ReferralModal({ initial, referrers, onClose, onSave }) {
  const [form, setForm] = useState(() => initial || {
    prospect: '', company: '', referrerId: referrers[0]?.id || '', stage: 'intro', value: 0, date: todayISO(), notes: '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal open onClose={onClose} title={initial ? `Edit referral - ${initial.prospect}` : 'Log a referral'}>
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prospect name"><input className={inputCls} value={form.prospect} onChange={(e) => set('prospect', e.target.value)} placeholder="Grace Liu" autoFocus /></Field>
          <Field label="Company"><input className={inputCls} value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="Pacific Fulfillment" /></Field>
          <Field label="Referred by">
            <select className={inputCls} value={form.referrerId} onChange={(e) => set('referrerId', e.target.value)}>
              <option value="">(unknown)</option>
              {referrers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <Field label="Stage">
            <select className={inputCls} value={form.stage} onChange={(e) => set('stage', e.target.value)}>
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Estimated / actual value ($)">
            <input type="number" min="0" className={inputCls} value={form.value} onChange={(e) => set('value', Math.max(0, Number(e.target.value) || 0))} />
          </Field>
          <Field label="Date"><input type="date" className={inputCls} value={form.date} onChange={(e) => set('date', e.target.value)} /></Field>
        </div>
        <Field label="Notes">
          <textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="How the intro happened, next step, timeline..." />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" onClick={() => form.prospect.trim() && onSave(form)}>
            <Check className="h-4 w-4" aria-hidden />{initial ? 'Save changes' : 'Log it'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ================================================================
   Help & print
   ================================================================ */

function HelpContent() {
  const steps = [
    ['Design the drop', 'On the Program tab, name what you sell, pick an incentive people actually want, choose the moments you will ask at, and the channels your relationships live in.'],
    ['Fill your first ring', 'On the Roster tab, add the 10 people who already trust your work. Rate relationship strength honestly - the engine sorts your asks by it.'],
    ['Queue this week’s asks', 'On the Ask Queue tab, take the suggested drops (strongest, least-recently asked) or queue from the roster. Each ask gets a ready-drafted script you can edit.'],
    ['Send and mark', 'Copy each script, send it through its channel, then mark it Sent or Replied. Marking updates the referrer’s last-ask date automatically.'],
    ['Log every ripple', 'When an intro happens, log it on the Funnel tab with the referrer who caused it. Move it through Intro, Conversation, Proposal, Won.'],
    ['Read the funnel', 'The funnel chart shows where ripples die. Weak carry between two stages tells you exactly what to fix next week.'],
    ['Let Claude sharpen it', 'The Copilot rail builds complete prompts from your live data - personalize an ask, design incentives, write thank-yous, plan the week. Copy, paste into claude.ai, paste the answer back.'],
    ['Export and repeat', 'Export gives you Markdown, JSON backup, CSVs, and a print one-pager. Come back every week - the engine only works if you turn it.'],
  ];
  const keys = [
    ['?', 'Open this guide'],
    ['Esc', 'Close any dialog'],
    ['Ctrl/Cmd + S', 'Copy the full Markdown brief'],
  ];
  return (
    <div>
      <ol className="grid gap-3">
        {steps.map(([t, b], i) => (
          <li key={t} className="flex gap-3">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ripple-500/15 font-mono text-xs font-semibold text-ripple-300">{i + 1}</span>
            <div>
              <div className="text-sm font-bold text-white-ice">{t}</div>
              <p className="mt-0.5 text-[13px] leading-relaxed text-mist">{b}</p>
            </div>
          </li>
        ))}
      </ol>
      <h3 className="mt-5 text-[11px] font-mono uppercase tracking-[0.16em] text-mist">Keyboard</h3>
      <table className="mt-2 w-full text-sm">
        <tbody>
          {keys.map(([k, v]) => (
            <tr key={k} className="border-t border-line-soft">
              <td className="py-1.5 pr-4"><kbd className="rounded-md border border-line bg-ink-850 px-2 py-0.5 font-mono text-xs text-ripple-300">{k}</kbd></td>
              <td className="py-1.5 text-fog">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 rounded-lg border border-line-soft bg-ink-850 p-3 text-[12px] leading-relaxed text-mist">
        Your data lives only in this browser (localStorage). Export a JSON backup before switching machines, and import it on the other side.
      </p>
    </div>
  );
}

function PrintSheet({ state }) {
  const p = state.program;
  const sent = countReferralsBy(state);
  const rows = funnelRows(state);
  const nameOf = (id) => (state.referrers.find((r) => r.id === id) || {}).name || '-';
  return (
    <div className="print-sheet hidden">
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>Referral Engine - {p.name}</h1>
      <p style={{ fontSize: 11, color: '#456' }}>Exported {todayISO()}</p>
      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '14px 0 6px' }}>The program</h2>
      <p style={{ fontSize: 12, lineHeight: 1.5 }}>
        Offer: {p.offer || '-'}. Average deal: {p.pricePoint || '-'}.
        Incentive ({labelOf(INCENTIVE_TYPES, p.incentiveType)}): {p.incentiveGive || '-'}
        {p.doubleSided && p.incentiveGet ? `; referred side gets ${p.incentiveGet}` : ''}.
        Pays out {labelOf(PAYOUT_TRIGGERS, p.payoutTrigger).toLowerCase()}.
        Ask moments: {p.askMoments.map((m) => labelOf(MOMENTS, m)).join('; ') || '-'}.
        Channels: {p.channels.map((c) => labelOf(CHANNELS, c)).join(', ') || '-'}.
        Weekly target: {p.weeklyTarget} asks.
      </p>
      {p.notes && <p style={{ fontSize: 12, marginTop: 4 }}><strong>Rules:</strong> {p.notes}</p>}
      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '14px 0 6px' }}>Roster ({state.referrers.length})</h2>
      <table>
        <thead><tr><th>Referrer</th><th>Company</th><th>Type</th><th>Strength</th><th>Last ask</th><th>Referrals</th></tr></thead>
        <tbody>
          {[...state.referrers].sort((a, b) => b.strength - a.strength).map((r) => (
            <tr key={r.id}><td>{r.name}</td><td>{r.company}</td><td>{labelOf(REF_TYPES, r.type)}</td><td>{r.strength}/5</td><td>{agoLabel(r.lastAsk)}</td><td>{sent[r.id] || 0}</td></tr>
          ))}
        </tbody>
      </table>
      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '14px 0 6px' }}>Funnel</h2>
      <p style={{ fontSize: 12 }}>{rows.map((r) => `${r.label}: ${r.count}`).join('  |  ')}</p>
      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '14px 0 6px' }}>Referrals ({state.referrals.length})</h2>
      <table>
        <thead><tr><th>Prospect</th><th>Company</th><th>Via</th><th>Stage</th><th>Value</th><th>Date</th></tr></thead>
        <tbody>
          {state.referrals.map((r) => (
            <tr key={r.id}><td>{r.prospect}</td><td>{r.company}</td><td>{nameOf(r.referrerId)}</td><td>{labelOf(STAGES, r.stage)}</td><td>{money(r.value)}</td><td>{r.date}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
