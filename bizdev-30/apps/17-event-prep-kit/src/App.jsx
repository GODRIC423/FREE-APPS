import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Plus, Trash2, Copy, Check, Download, Upload, FileJson, FileText, HelpCircle,
  RotateCcw, Sparkles, X, ChevronDown, MapPin, CalendarDays, ClipboardList,
  Send, Gauge, Undo2, Search, Ticket, Printer, Zap, Users, Mail, Phone,
  MessageSquare, StickyNote, BadgeCheck, QrCode, ArrowRight, Megaphone, NotebookPen, Link2,
} from 'lucide-react';

/* ================================================================
   CONSOLE BUS — optional link to the BizDev Console Deck host.
   No-op (ctx stays null) when this app is opened standalone.
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
    try { window.parent.postMessage({ bizdev: 'ready', v: 1, slug: '17-event-prep-kit' }, '*'); } catch {}
    return () => window.removeEventListener('message', onMsg);
  }, []);
  return ctx;
}

/* ================================ constants ================================ */

const LS_KEY = 'bizdev:17-event-prep-kit:v1';
const TABS = [
  { id: 'dossier', n: '01', label: 'Dossier', icon: ClipboardList },
  { id: 'dayof', n: '02', label: 'Day-of', icon: Zap },
  { id: 'followup', n: '03', label: 'Follow-up', icon: Send },
  { id: 'roi', n: '04', label: 'ROI recap', icon: Gauge },
];
const T_STATUS = { scouted: 'SCOUTED', met: 'MET', missed: 'MISSED' };
const F_STATUS = { draft: 'To send', sent: 'Sent', replied: 'Replied', meeting: 'Meeting booked' };
const CHANNELS = ['Email', 'LinkedIn', 'Phone', 'Text'];
const PRIORITIES = ['A', 'B', 'C'];

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

/* ================================ normalize ================================ */

const str = (v, d = '') => (typeof v === 'string' ? v : d);
const num = (v, d = 0) => (v === '' || v === null || v === undefined || Number.isNaN(+v) ? d : +v);
const bool = (v, d = false) => (typeof v === 'boolean' ? v : d);
const arr = (v) => (Array.isArray(v) ? v : []);
const oneOf = (v, opts, d) => (opts.includes(v) ? v : d);

function normalizeTarget(t) {
  const o = t && typeof t === 'object' ? t : {};
  return {
    id: str(o.id) || uid(),
    name: str(o.name, 'Unnamed'),
    company: str(o.company),
    role: str(o.role),
    whyThem: str(o.whyThem),
    icebreaker: str(o.icebreaker),
    priority: oneOf(o.priority, PRIORITIES, 'B'),
    status: oneOf(o.status, Object.keys(T_STATUS), 'scouted'),
    scribbles: str(o.scribbles),
  };
}
function normalizeFollowUp(f) {
  const o = f && typeof f === 'object' ? f : {};
  return {
    id: str(o.id) || uid(),
    person: str(o.person, 'Unnamed'),
    company: str(o.company),
    context: str(o.context),
    channel: oneOf(o.channel, CHANNELS, 'Email'),
    due: str(o.due),
    status: oneOf(o.status, Object.keys(F_STATUS), 'draft'),
  };
}
function normalizeEvent(e) {
  const o = e && typeof e === 'object' ? e : {};
  return {
    id: str(o.id) || uid(),
    name: str(o.name, 'Untitled event'),
    dates: str(o.dates),
    venue: str(o.venue),
    city: str(o.city),
    goal: str(o.goal),
    cost: num(o.cost, 0),
    pipelineTarget: num(o.pipelineTarget, 0),
    conversations: num(o.conversations, 0),
    pipelineValue: num(o.pipelineValue, 0),
    dealsCreated: num(o.dealsCreated, 0),
    targets: arr(o.targets).map(normalizeTarget),
    talkTracks: arr(o.talkTracks).map((t) => ({
      id: str(t?.id) || uid(), title: str(t?.title, 'Untitled track'), body: str(t?.body),
    })),
    icebreakers: arr(o.icebreakers).map((i) => ({ id: str(i?.id) || uid(), text: str(i?.text) })),
    checklist: arr(o.checklist).map((c) => ({
      id: str(c?.id) || uid(), text: str(c?.text), done: bool(c?.done),
      phase: oneOf(c?.phase, ['before', 'dayof'], 'before'),
    })),
    followUps: arr(o.followUps).map(normalizeFollowUp),
    copilotNotes: str(o.copilotNotes),
  };
}
function normalize(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const events = arr(o.events).map(normalizeEvent);
  let activeEventId = str(o.activeEventId);
  if (!events.some((e) => e.id === activeEventId)) activeEventId = events[0]?.id || null;
  return {
    version: 1,
    seenGuide: bool(o.seenGuide),
    tab: oneOf(o.tab, TABS.map((t) => t.id), 'dossier'),
    activeEventId,
    events,
  };
}

/* ================================ demo data ================================ */

function makeDemoEvent() {
  return normalizeEvent({
    id: uid(),
    name: 'SaaS Connect 2026',
    dates: 'Sep 15-17, 2026',
    venue: 'Moscone West',
    city: 'San Francisco',
    goal: 'Book 8 qualified meetings with mid-market RevOps leaders and leave with 25 real conversations logged - not badge scans.',
    cost: 4800,
    pipelineTarget: 120000,
    conversations: 24,
    pipelineValue: 86000,
    dealsCreated: 2,
    targets: [
      { name: 'Priya Raman', company: 'Northwind Robotics', role: 'VP Revenue Operations', priority: 'A', status: 'met', whyThem: 'Posted twice about CRM hygiene pain. 40-rep team, our sweet spot. Renewal with current vendor in Q1.', icebreaker: 'Her post on "pipeline theater" - agree loudly, ask what she killed.', scribbles: 'Hates dashboards nobody opens. Wants exec-ready Friday digest. Intro to her ops lead Marcus. Send the RevOps benchmark PDF.' },
      { name: 'Diego Fuentes', company: 'Harbor Freight Analytics', role: 'Head of Sales', priority: 'A', status: 'met', whyThem: 'Speaking on outbound at scale. Team just raised Series B - budget is live now.', icebreaker: 'Ask what he cut from the talk - speakers love the deleted slides.', scribbles: 'Talk went long, caught him at speaker lounge. Wants pricing for 25 seats. Mentioned competitor quote from Attio. Follow up Weds.' },
      { name: 'Mei-Lin Zhao', company: 'Cobalt Health', role: 'Director of Partnerships', priority: 'A', status: 'missed', whyThem: 'Runs the partner program we want into. Warm intro possible via Sana at Loop.', icebreaker: 'Sana said to ask about the Lisbon offsite disaster story.' },
      { name: 'Tom Okafor', company: 'Brightline Freight', role: 'CRO', priority: 'B', status: 'met', whyThem: 'Logistics vertical test. If his team buys, we have a repeatable wedge.', icebreaker: 'Booth neighbor last year - reference the espresso machine incident.', scribbles: 'Skeptical but curious. Asked for 2 logistics case studies. No budget until Jan - nurture, do not pitch.' },
      { name: 'Sara Lindqvist', company: 'Fjord Payments', role: 'VP Sales EMEA', priority: 'B', status: 'scouted', whyThem: 'Expanding US team by 15 reps in Q4 per their careers page.', icebreaker: 'Ask how EMEA playbooks translate stateside - she has opinions.' },
      { name: 'Andre Boateng', company: 'Kettle & Cask', role: 'Founder', priority: 'C', status: 'scouted', whyThem: 'Small now, loud on LinkedIn. Good design-partner energy, big audience.', icebreaker: 'His tasting-notes-for-cold-email post. Genuinely funny.' },
    ],
    talkTracks: [
      { title: 'The 20-second intro', body: 'We help RevOps teams at 30-80 rep companies stop losing deals to bad handoffs. Teams like Northwind cut stage-slip by a third in a quarter. I am here to meet ops leaders drowning in tools - who is that at your company?' },
      { title: 'Why-now story', body: 'Every team we meet added 3 tools last year and lost visibility. The pain is not data entry - it is that nobody trusts the forecast. We rebuild trust in the number first, workflow second.' },
      { title: 'Pricing deflection', body: 'Fair question - it lands between 12k and 40k a year depending on seats. Rather than quote blind, can I get 25 minutes next week to see if it is even a fit? Worst case you get our benchmark data.' },
    ],
    icebreakers: [
      { text: 'What is the one talk you are actually here for?' },
      { text: 'Booth duty or free-range? You look free-range.' },
      { text: 'What is the best thing you have stolen from a competitor this year - idea, not swag?' },
      { text: 'If this conference had a group chat, what would today\'s hot take be?' },
    ],
    checklist: [
      { text: 'Print 20 one-pagers + QR to booking page', done: true, phase: 'before' },
      { text: 'Block 6 demo slots for the week after', done: true, phase: 'before' },
      { text: 'Tag all targets in CRM: evt-saasconnect26', done: true, phase: 'before' },
      { text: 'Rehearse 20-second intro out loud, 5 reps', done: false, phase: 'before' },
      { text: 'Battery pack + notebook + breath mints', done: true, phase: 'dayof' },
      { text: 'Morning: re-read A-list badges', done: true, phase: 'dayof' },
      { text: 'Log every conversation within 10 minutes', done: false, phase: 'dayof' },
      { text: 'By 3pm: 8 conversations or move to session-room hallway', done: false, phase: 'dayof' },
    ],
    followUps: [
      { person: 'Priya Raman', company: 'Northwind Robotics', channel: 'Email', due: '2026-09-18', status: 'meeting', context: 'Send Friday-digest mockup + RevOps benchmark. Ask for Marcus intro in same thread.' },
      { person: 'Diego Fuentes', company: 'Harbor Freight Analytics', channel: 'Email', due: '2026-09-18', status: 'replied', context: '25-seat pricing. He is comparing Attio - lead with the migration story, not features.' },
      { person: 'Tom Okafor', company: 'Brightline Freight', channel: 'LinkedIn', due: '2026-09-19', status: 'sent', context: 'Two logistics case studies, zero pitch. Calendar nudge in January.' },
      { person: 'Mei-Lin Zhao', company: 'Cobalt Health', role: '', channel: 'Email', due: '2026-09-19', status: 'draft', context: 'Missed her at the event - open with Sana intro + Lisbon story, propose 15-min call instead.' },
      { person: 'Andre Boateng', company: 'Kettle & Cask', channel: 'LinkedIn', due: '2026-09-21', status: 'draft', context: 'Comment on his recap post first, then DM about design-partner slot.' },
    ],
  });
}
const makeDemo = () => {
  const ev = makeDemoEvent();
  return { version: 1, seenGuide: true, tab: 'dossier', activeEventId: ev.id, events: [ev] };
};

function makeBlankEvent(name) {
  return normalizeEvent({ id: uid(), name: name || 'New event' });
}

/* ================================ derived math ================================ */

function eventStats(ev) {
  const targets = ev.targets.length;
  const met = ev.targets.filter((t) => t.status === 'met').length;
  const sent = ev.followUps.filter((f) => f.status !== 'draft').length;
  const replies = ev.followUps.filter((f) => f.status === 'replied' || f.status === 'meeting').length;
  const meetings = ev.followUps.filter((f) => f.status === 'meeting').length;
  const queued = ev.followUps.length;
  const costPerConv = ev.conversations > 0 ? ev.cost / ev.conversations : 0;
  const costPerMeeting = meetings > 0 ? ev.cost / meetings : 0;
  const multiple = ev.cost > 0 ? ev.pipelineValue / ev.cost : 0;
  return { targets, met, sent, replies, meetings, queued, costPerConv, costPerMeeting, multiple };
}

const fmtMoney = (n) => '$' + Math.round(n).toLocaleString('en-US');

/* ================================ serializers ================================ */

function eventToMarkdown(ev) {
  const s = eventStats(ev);
  const L = [];
  L.push(`# Event Dossier — ${ev.name}`);
  L.push('');
  L.push(`- **When:** ${ev.dates || '—'}`);
  L.push(`- **Where:** ${[ev.venue, ev.city].filter(Boolean).join(', ') || '—'}`);
  L.push(`- **Mission:** ${ev.goal || '—'}`);
  L.push(`- **Budget:** ${fmtMoney(ev.cost)} · **Pipeline target:** ${fmtMoney(ev.pipelineTarget)}`);
  L.push('');
  L.push(`## Target list (${ev.targets.length})`);
  if (!ev.targets.length) L.push('_No targets yet._');
  ev.targets.forEach((t) => {
    L.push(`### [${t.priority}] ${t.name} — ${t.role || 'Role?'} @ ${t.company || '?'} (${T_STATUS[t.status]})`);
    if (t.whyThem) L.push(`- Why them: ${t.whyThem}`);
    if (t.icebreaker) L.push(`- Opener: ${t.icebreaker}`);
    if (t.scribbles) L.push(`- Scribbles: ${t.scribbles}`);
  });
  L.push('');
  L.push('## Talk tracks');
  if (!ev.talkTracks.length) L.push('_None yet._');
  ev.talkTracks.forEach((t) => { L.push(`### ${t.title}`); L.push(t.body || '_(empty)_'); });
  L.push('');
  L.push('## Icebreakers');
  ev.icebreakers.forEach((i) => L.push(`- ${i.text}`));
  L.push('');
  L.push('## Checklist');
  ev.checklist.forEach((c) => L.push(`- [${c.done ? 'x' : ' '}] (${c.phase === 'before' ? 'prep' : 'day-of'}) ${c.text}`));
  L.push('');
  L.push(`## Follow-up queue (${ev.followUps.length})`);
  ev.followUps.forEach((f) => {
    L.push(`- **${f.person}** (${f.company || '?'}) — ${F_STATUS[f.status]} · ${f.channel}${f.due ? ' · due ' + f.due : ''}`);
    if (f.context) L.push(`  - Context: ${f.context}`);
  });
  L.push('');
  L.push('## ROI recap');
  L.push(`- Conversations: ${ev.conversations} · Targets met: ${s.met}/${s.targets}`);
  L.push(`- Follow-ups sent: ${s.sent}/${s.queued} · Replies: ${s.replies} · Meetings booked: ${s.meetings}`);
  L.push(`- Deals created: ${ev.dealsCreated} · Pipeline attributed: ${fmtMoney(ev.pipelineValue)}`);
  L.push(`- Cost: ${fmtMoney(ev.cost)} · Cost/conversation: ${fmtMoney(s.costPerConv)} · Cost/meeting: ${fmtMoney(s.costPerMeeting)} · Pipeline multiple: ${s.multiple.toFixed(1)}x`);
  return L.join('\n');
}

function followUpsToCsv(ev) {
  const esc = (v) => '"' + String(v ?? '').replaceAll('"', '""') + '"';
  const rows = [['person', 'company', 'channel', 'due', 'status', 'context']];
  ev.followUps.forEach((f) => rows.push([f.person, f.company, f.channel, f.due, F_STATUS[f.status], f.context]));
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}

/* ================================ copilot prompts ================================ */

/* Console Deck integration: when this app is framed inside the Console, prepend
   a compact shared-context header to every Copilot prompt. Plain text only —
   never HTML — and a pure no-op when consoleCtx is null (standalone). */
function buildConsoleContextHeader(consoleCtx) {
  if (!consoleCtx) return '';
  const profile = consoleCtx.profile || {};
  const claude = consoleCtx.claude || {};
  const roster = consoleCtx.roster || {};
  const lines = [];
  if (profile.company) lines.push(`- My company: ${profile.company}`);
  if (profile.offer) lines.push(`- What I sell: ${profile.offer}`);
  if (profile.icp) lines.push(`- My ICP: ${profile.icp}`);
  if (profile.pricingAnchor) lines.push(`- Pricing anchor: ${profile.pricingAnchor}`);
  const nameVoice = [claude.userName, claude.voiceNotes].filter((v) => v && String(v).trim());
  if (nameVoice.length) lines.push(`- My name / voice: ${nameVoice.join(' — ')}`);
  if (Array.isArray(roster.accounts) && roster.accounts.length) {
    const accts = roster.accounts.slice(0, 12).map((a) => `${a.name}${a.segment ? ` (${a.segment})` : ''}`).join(', ');
    lines.push(`- Accounts on file: ${accts}`);
  }
  if (!lines.length) return '';
  return `## Shared context (from BizDev Console)\n${lines.join('\n')}`;
}

function withConsoleContext(prompt, consoleCtx) {
  const header = buildConsoleContextHeader(consoleCtx);
  return header ? `${header}\n\n${prompt}` : prompt;
}

function promptResearchTarget(ev, t, consoleCtx) {
  return withConsoleContext(`You are a senior business-development researcher prepping me for a conference conversation.

## The event
${ev.name}${ev.dates ? ` (${ev.dates})` : ''}${ev.city ? `, ${ev.city}` : ''}.
My mission there: ${ev.goal || '(not set)'}

## The person I need to be sharp on
- Name: ${t.name}
- Role: ${t.role || 'unknown'}
- Company: ${t.company || 'unknown'}
- Why I targeted them: ${t.whyThem || '(not recorded)'}
- My planned opener: ${t.icebreaker || '(none yet)'}

## Your task
1. Infer what someone in this role at this kind of company is most likely measured on this quarter, and the 3 pains that follow.
2. Give me 5 sharp talking points I can raise naturally (no flattery, no generic small talk).
3. Give me 3 questions that make me sound like an insider in their world.
4. Flag 2 landmines - topics or phrasings that would make me sound like every other vendor.
5. Suggest one better opener than mine, in one sentence I could actually say out loud.

## Output format
Markdown with the 5 numbered sections above. Keep every bullet under 25 words - this gets read on my phone in a hallway.`, consoleCtx);
}

function promptIntro(ev, consoleCtx) {
  const tracks = ev.talkTracks.map((t) => `- ${t.title}: ${t.body}`).join('\n') || '(none written yet)';
  return withConsoleContext(`You are a sales-messaging coach who cuts fluff ruthlessly.

## Context
I'm attending ${ev.name}${ev.dates ? ` (${ev.dates})` : ''}. My mission: ${ev.goal || '(not set)'}

My current talk tracks:
${tracks}

My top targets and why they matter:
${ev.targets.slice(0, 6).map((t) => `- ${t.name}, ${t.role || '?'} at ${t.company || '?'} — ${t.whyThem || 'no reason recorded'}`).join('\n') || '- (no targets yet)'}

## Your task
Write my 20-second spoken intro for this event: who I help, the specific pain, one proof point, and a question that opens a real conversation. It must sound like a human at a bar, not a booth pitch.

Then give:
1. Three variants: one bold, one curious, one story-led.
2. A one-line answer to "so what do you do?" for when I have 5 seconds, not 20.
3. The single biggest weakness in my current talk tracks, in one blunt sentence.

## Output format
Markdown. Spoken lines in quotes. No corporate vocabulary (no "solutions", "leverage", "synergy").`, consoleCtx);
}

function promptFollowUps(ev, consoleCtx) {
  const met = ev.targets.filter((t) => t.status === 'met');
  const scr = met.map((t) => `### ${t.name} — ${t.role || '?'} @ ${t.company || '?'}
- Why targeted: ${t.whyThem || '(none)'}
- My scribbles from the conversation: ${t.scribbles || '(no notes - I will have to wing it)'}`).join('\n') || '(I met no logged targets - work from the queue below)';
  const queue = ev.followUps.map((f) => `- ${f.person} (${f.company || '?'}) · ${f.channel} · ${F_STATUS[f.status]}${f.due ? ' · due ' + f.due : ''} — context: ${f.context || 'none'}`).join('\n') || '(queue is empty)';
  return withConsoleContext(`You are my BD copilot turning messy conference scribbles into follow-ups people actually answer.

## Event
${ev.name}${ev.dates ? ` (${ev.dates})` : ''}. Mission: ${ev.goal || '(not set)'}

## People I met, with my raw scribbles
${scr}

## Current follow-up queue
${queue}

## Your task
For each person with a Draft or unsent follow-up:
1. Write the follow-up message for the listed channel (email: subject + under-120-word body; LinkedIn/Text: under 60 words).
2. Open with a specific detail from my scribbles - never "great to meet you".
3. End with exactly one low-friction ask.
4. If my scribbles say nurture-don't-pitch, respect it - give value, ask nothing.

Then add a "Sequencing" section: who to send first and why, in 3 bullets.

## Output format
Markdown, one section per person, message text in code blocks so I can copy cleanly.`, consoleCtx);
}

function promptRoi(ev, consoleCtx) {
  const s = eventStats(ev);
  return withConsoleContext(`You are a revenue analyst who tells founders the truth about event spend.

## The numbers from ${ev.name}
- Cost: ${fmtMoney(ev.cost)} · Pipeline target going in: ${fmtMoney(ev.pipelineTarget)}
- Targets planned: ${s.targets} · Actually met: ${s.met}
- Conversations logged: ${ev.conversations}
- Follow-ups queued: ${s.queued} · sent: ${s.sent} · replies: ${s.replies} · meetings booked: ${s.meetings}
- Deals created: ${ev.dealsCreated} · Pipeline attributed: ${fmtMoney(ev.pipelineValue)} (${s.multiple.toFixed(1)}x cost)
- Cost per conversation: ${fmtMoney(s.costPerConv)} · Cost per meeting: ${fmtMoney(s.costPerMeeting)}

## My mission was
${ev.goal || '(not set)'}

## Your task
1. Verdict in one sentence: was this event worth it - yes, no, or not yet provable?
2. The 3 numbers that matter most here and what each says about my execution (targeting? conversion? follow-through?).
3. Where the funnel leaked worst, and the single process fix for next event.
4. A go/no-go rule of thumb I can apply to the next event invite, using my own numbers as the baseline.
5. A 5-line recap I can paste into Slack for my team - honest, no spin.

## Output format
Markdown with those 5 numbered sections. Be direct - I would rather hear "skip it next year" than comfort.`, consoleCtx);
}

/* ================================ tiny UI atoms ================================ */

function SectionTitle({ icon: Icon, children, right }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-display text-[13px] font-extrabold uppercase tracking-[0.18em] text-dim-400">
        {Icon && <Icon className="h-4 w-4 text-signal-400" aria-hidden />}
        {children}
      </h2>
      {right}
    </div>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <label className={'block ' + className}>
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-dim-500">{label}</span>
      {children}
    </label>
  );
}

const inputCls = 'w-full rounded-md border border-line-700 bg-tarmac-900 px-2.5 py-1.5 text-sm text-chalk-100 placeholder:text-dim-500 focus:border-signal-500';
const btnGhost = 'inline-flex items-center gap-1.5 rounded-md border border-line-700 bg-slab-800 px-3 py-1.5 text-[13px] font-semibold text-chalk-100 hover:border-line-600 hover:bg-slab-700 transition-colors';
const btnSignal = 'inline-flex items-center gap-1.5 rounded-md bg-signal-400 px-3 py-1.5 text-[13px] font-extrabold text-tarmac-950 hover:bg-signal-300 transition-colors';

function EmptyCoach({ icon: Icon, title, children }) {
  return (
    <div className="rounded-lg border border-dashed border-line-600 bg-slab-900/60 px-5 py-6 text-center">
      <Icon className="mx-auto mb-2 h-6 w-6 text-dim-500" aria-hidden />
      <p className="font-display text-sm font-extrabold uppercase tracking-wider text-chalk-100">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-dim-400">{children}</p>
    </div>
  );
}

/* ================================ hero badge SVG ================================ */

function HeroBadge() {
  return (
    <svg viewBox="0 0 240 300" className="h-full w-auto drop-shadow-[0_24px_40px_rgba(0,0,0,0.6)]" aria-hidden role="img">
      {/* lanyard straps */}
      <path d="M30 -10 L112 96" stroke="#ddf526" strokeWidth="14" strokeLinecap="round" />
      <path d="M210 -10 L128 96" stroke="#c1d90e" strokeWidth="14" strokeLinecap="round" />
      <path d="M30 -10 L112 96" stroke="#07080b" strokeWidth="2" strokeDasharray="1 7" opacity=".5" />
      <path d="M210 -10 L128 96" stroke="#07080b" strokeWidth="2" strokeDasharray="1 7" opacity=".5" />
      {/* clip */}
      <rect x="104" y="88" width="32" height="22" rx="5" fill="#3b4250" />
      <rect x="104" y="88" width="32" height="8" rx="4" fill="#586173" />
      <circle cx="120" cy="101" r="3.5" fill="#0b0d11" />
      {/* badge card */}
      <g>
        <rect x="34" y="106" width="172" height="182" rx="12" fill="#f6f4ee" />
        <rect x="34" y="106" width="172" height="182" rx="12" fill="none" stroke="#d9d5c8" />
        {/* slot */}
        <rect x="98" y="118" width="44" height="9" rx="4.5" fill="#0b0d11" />
        {/* top band */}
        <rect x="34" y="136" width="172" height="30" fill="#15171b" />
        <text x="120" y="156" textAnchor="middle" fontFamily="Archivo, sans-serif" fontWeight="800" fontSize="15" letterSpacing="4" fill="#ddf526">ATTENDEE</text>
        {/* name block */}
        <text x="48" y="196" fontFamily="Archivo, sans-serif" fontWeight="800" fontSize="21" fill="#15171b">YOU, PREPARED</text>
        <text x="48" y="214" fontFamily="'IBM Plex Mono', monospace" fontSize="10" letterSpacing="1" fill="#6d7784">ACCESS: ALL PIPELINE</text>
        {/* barcode */}
        <g fill="#15171b">
          {[0, 4, 6, 12, 15, 21, 24, 27, 33, 37, 41, 47, 50, 55, 60, 64, 70, 73, 79, 83, 88, 93, 97, 103, 107, 112, 118, 121, 127, 131, 136, 140].map((x, i) => (
            <rect key={i} x={48 + x} y={230} width={i % 3 === 0 ? 3 : 1.6} height={30} />
          ))}
        </g>
        <text x="48" y="276" fontFamily="'IBM Plex Mono', monospace" fontSize="9" letterSpacing="2" fill="#9aa2ae">NO. 0017-EPK</text>
        {/* signal corner chevron */}
        <path d="M206 248 v40 h-40 z" fill="#ddf526" />
        <path d="M196 278 l-8 8 M188 270 l-16 16" stroke="#15171b" strokeWidth="2.5" />
      </g>
    </svg>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 34 40" className="h-9 w-8" aria-hidden>
        <rect x="2" y="8" width="30" height="30" rx="5" fill="#ddf526" />
        <rect x="11" y="12" width="12" height="4" rx="2" fill="#07080b" />
        <rect x="7" y="21" width="20" height="3" rx="1.5" fill="#07080b" />
        <rect x="7" y="27" width="13" height="3" rx="1.5" fill="#07080b" opacity=".65" />
        <path d="M13 0 L17 8 L21 0" stroke="#ddf526" strokeWidth="3" fill="none" />
      </svg>
      <div className="leading-none">
        <div className="font-display text-lg font-extrabold uppercase tracking-[0.08em] text-chalk-50">
          Event <span className="text-signal-400">Prep</span> Kit
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-dim-500">Extract pipeline from every event</div>
      </div>
    </div>
  );
}

/* ================================ modal ================================ */

function Modal({ title, onClose, children, wide }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div ref={ref} tabIndex={-1} className={`modal-in relative max-h-[86vh] w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} overflow-y-auto rounded-xl border border-line-700 bg-slab-900 shadow-badge`}>
        <div className="sticky top-0 flex items-center justify-between border-b border-line-700 bg-slab-900/95 px-5 py-3 backdrop-blur">
          <h2 className="font-display text-sm font-extrabold uppercase tracking-[0.16em] text-chalk-50">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="rounded-md p-1.5 text-dim-400 hover:bg-slab-700 hover:text-chalk-50">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ================================ app ================================ */

export default function App() {
  const [state, setState] = useState(() => {
    try { return normalize(JSON.parse(localStorage.getItem(LS_KEY))); } catch { return normalize(null); }
  });
  const [modal, setModal] = useState(() => (state.seenGuide ? null : 'guide')); // 'guide' | 'reset' | null
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState(null); // { msg, prev }
  const [copied, setCopied] = useState(null);
  const [targetQuery, setTargetQuery] = useState('');
  const [targetFilter, setTargetFilter] = useState('all');
  const [fuFilter, setFuFilter] = useState('all');
  const toastTimer = useRef(null);
  const fileRef = useRef(null);
  const saveTimer = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const consoleCtx = useConsoleBus();

  /* autosave (debounced) */
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
    }, 350);
    return () => clearTimeout(saveTimer.current);
  }, [state]);

  const ev = state.events.find((e) => e.id === state.activeEventId) || null;
  const stats = ev ? eventStats(ev) : null;

  /* ---- state helpers ---- */
  const patch = useCallback((fn) => setState((s) => normalize(fn(structuredClone(s)))), []);
  const patchEvent = useCallback((fn) => {
    setState((s) => {
      const next = structuredClone(s);
      const e = next.events.find((x) => x.id === next.activeEventId);
      if (e) fn(e);
      return normalize(next);
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(toastTimer.current);
  }, [toast]);

  const deleteWithUndo = useCallback((msg, mutate) => {
    setToast({ msg, prev: stateRef.current });
    setState((s) => {
      const next = structuredClone(s);
      mutate(next);
      return normalize(next);
    });
  }, []);

  const undo = () => { if (toast) { setState(toast.prev); setToast(null); } };

  /* ---- clipboard ---- */
  const copyText = useCallback(async (text, key) => {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch { ok = false; }
    if (!ok) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta); ok = true;
      } catch { ok = false; }
    }
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
  }, []);

  /* ---- exports ---- */
  const downloadFile = (name, text, type) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };
  const copyMarkdown = useCallback(() => {
    if (ev) copyText(eventToMarkdown(ev), 'md');
  }, [ev, copyText]);

  const importJson = (file) => {
    const r = new FileReader();
    r.onload = () => {
      try { setState(normalize(JSON.parse(String(r.result)))); }
      catch { setToast({ msg: 'Import failed - not valid JSON', prev: null }); }
    };
    r.readAsText(file);
  };

  /* ---- keyboard ---- */
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); copyMarkdown(); return; }
      if (e.key === 'Escape') { setModal(null); setExportOpen(false); setState((s) => (s.seenGuide ? s : { ...s, seenGuide: true })); return; }
      if (typing) return;
      if (e.key === '?') { e.preventDefault(); setModal('guide'); setState((s) => ({ ...s, seenGuide: true })); }
      if (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4') {
        const t = TABS[+e.key - 1]; if (t) setState((s) => ({ ...s, tab: t.id }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [copyMarkdown]);

  const closeGuide = () => { setModal(null); setState((s) => ({ ...s, seenGuide: true })); };

  /* ---- header actions ---- */
  const loadDemo = () => setState(makeDemo());
  const doReset = () => {
    setState(normalize({ seenGuide: true }));
    setModal(null);
  };

  const addEvent = () => {
    const e = makeBlankEvent();
    setState((s) => normalize({ ...s, events: [...s.events, e], activeEventId: e.id, tab: 'dossier' }));
  };

  /* ================================ render ================================ */

  return (
    <div className="venue-floor min-h-screen font-body text-chalk-100">
      {/* lanyard strap across top */}
      <div className="no-print relative h-2.5 overflow-hidden bg-signal-400">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(-55deg, #07080b 0 2px, transparent 2px 14px)' }} />
        <div className="lanyard-sheen absolute inset-y-0 w-1/3 bg-white/40" />
      </div>

      {/* ======= header ======= */}
      <header className="no-print border-b border-line-700/70 bg-tarmac-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <Wordmark />
            {consoleCtx && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-signal-500/50 bg-signal-950 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-signal-300"
                title="Linked to the BizDev Console Deck"
              >
                <Link2 className="h-3 w-3" aria-hidden /> Console linked
                {consoleCtx.profile?.company ? ` · ${consoleCtx.profile.company}` : ''}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className={btnGhost} onClick={loadDemo}>
              <Zap className="h-3.5 w-3.5 text-signal-400" aria-hidden /> Load demo
            </button>
            <button className={btnGhost} onClick={() => setModal('reset')}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
            </button>
            <button className={btnGhost} onClick={() => setModal('guide')}>
              <HelpCircle className="h-3.5 w-3.5" aria-hidden /> How to use
            </button>
            <div className="relative">
              <button className={btnSignal} onClick={() => setExportOpen((o) => !o)} aria-haspopup="menu" aria-expanded={exportOpen}>
                <Download className="h-3.5 w-3.5" aria-hidden /> Export <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              </button>
              {exportOpen && <div className="fixed inset-0 z-30" aria-hidden onClick={() => setExportOpen(false)} />}
              {exportOpen && (
                <div role="menu" className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-lg border border-line-700 bg-slab-900 shadow-badge">
                  {[
                    { icon: FileText, label: copied === 'md' ? 'Copied!' : 'Copy Markdown dossier', act: () => copyMarkdown() },
                    { icon: FileJson, label: 'Download JSON (full state)', act: () => downloadFile('event-prep-kit.json', JSON.stringify(state, null, 2), 'application/json') },
                    { icon: Upload, label: 'Import JSON', act: () => fileRef.current?.click() },
                    { icon: Ticket, label: 'Follow-up queue CSV', act: () => ev && downloadFile(`${ev.name.replaceAll(/\s+/g, '-').toLowerCase()}-followups.csv`, followUpsToCsv(ev), 'text/csv') },
                    { icon: Printer, label: 'Print dossier', act: () => window.print() },
                  ].map((m) => (
                    <button key={m.label} role="menuitem" onClick={() => { m.act(); if (m.label !== 'Import JSON') setExportOpen(false); }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-semibold text-chalk-100 hover:bg-slab-700">
                      <m.icon className="h-4 w-4 text-signal-400" aria-hidden /> {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Import JSON file"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; setExportOpen(false); }} />
          </div>
        </div>
      </header>

      {/* ======= event switcher (ticket stubs) ======= */}
      <div className="no-print mx-auto max-w-7xl px-4 pt-5 sm:px-6">
        <div className="flex flex-wrap items-stretch gap-2">
          {state.events.map((e) => {
            const active = e.id === state.activeEventId;
            return (
              <button key={e.id} onClick={() => setState((s) => ({ ...s, activeEventId: e.id }))}
                className={`group relative flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors ${active ? 'border-signal-500/60 bg-slab-800' : 'border-line-700 bg-slab-900 hover:border-line-600'}`}>
                <Ticket className={`h-4 w-4 ${active ? 'text-signal-400' : 'text-dim-500'}`} aria-hidden />
                <span>
                  <span className={`block font-display text-[13px] font-extrabold uppercase tracking-wide ${active ? 'text-chalk-50' : 'text-dim-400'}`}>{e.name}</span>
                  <span className="block font-mono text-[10px] text-dim-500">{e.dates || 'dates tbd'}</span>
                </span>
              </button>
            );
          })}
          <button onClick={addEvent} className="flex items-center gap-1.5 rounded-md border border-dashed border-line-600 px-3 py-2 text-[13px] font-semibold text-dim-400 hover:border-signal-500/50 hover:text-signal-300">
            <Plus className="h-4 w-4" aria-hidden /> New event
          </button>
        </div>
      </div>

      {/* ======= empty state / main ======= */}
      {!ev ? (
        <main className="no-print mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="grid items-center gap-10 md:grid-cols-[1fr_260px]">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-signal-400">Gate open · No badge issued</p>
              <h1 className="mt-3 font-display text-4xl font-extrabold uppercase leading-[1.02] tracking-tight text-chalk-50 sm:text-5xl">
                Most people attend.<br />You are going to <span className="text-signal-400">extract</span>.
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-dim-400">
                Build a dossier before the event, run the day from badge cards, then convert scribbles into
                a follow-up queue and an honest ROI recap. Start with the demo to see a full event done well,
                or issue a fresh badge.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button className={btnSignal + ' px-5 py-2.5 text-sm'} onClick={loadDemo}>
                  <Zap className="h-4 w-4" aria-hidden /> Load the demo event
                </button>
                <button className={btnGhost + ' px-5 py-2.5 text-sm'} onClick={addEvent}>
                  <Plus className="h-4 w-4" aria-hidden /> Create my event
                </button>
              </div>
            </div>
            <div className="hidden h-80 md:block"><HeroBadge /></div>
          </div>
        </main>
      ) : (
        <main className="no-print mx-auto max-w-7xl px-4 pb-24 pt-5 sm:px-6">
          {/* ======= event hero strip ======= */}
          <section className="relative overflow-hidden rounded-xl border border-line-700 bg-slab-900 shadow-badge">
            <div className="absolute inset-y-0 right-0 hidden w-56 lg:block" aria-hidden>
              <div className="absolute -right-6 top-1/2 h-72 -translate-y-1/2 opacity-90"><HeroBadge /></div>
            </div>
            <div className="relative grid gap-4 p-5 sm:p-6 lg:pr-64">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <input value={ev.name} onChange={(e) => patchEvent((x) => { x.name = e.target.value; })}
                  aria-label="Event name"
                  className="min-w-0 flex-1 basis-64 border-b border-transparent bg-transparent font-display text-3xl font-extrabold uppercase tracking-tight text-chalk-50 outline-none focus:border-signal-500 sm:text-4xl" />
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[12px] text-dim-400">
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-signal-400" aria-hidden />
                  <input value={ev.dates} placeholder="Dates" aria-label="Event dates" onChange={(e) => patchEvent((x) => { x.dates = e.target.value; })}
                    className="w-36 bg-transparent outline-none placeholder:text-dim-500 focus:text-chalk-100" /></span>
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-signal-400" aria-hidden />
                  <input value={ev.venue} placeholder="Venue" aria-label="Venue" onChange={(e) => patchEvent((x) => { x.venue = e.target.value; })}
                    className="w-32 bg-transparent outline-none placeholder:text-dim-500 focus:text-chalk-100" />
                  <input value={ev.city} placeholder="City" aria-label="City" onChange={(e) => patchEvent((x) => { x.city = e.target.value; })}
                    className="w-28 bg-transparent outline-none placeholder:text-dim-500 focus:text-chalk-100" /></span>
                <button onClick={() => deleteWithUndo(`Deleted event "${ev.name}"`, (s) => { s.events = s.events.filter((x) => x.id !== ev.id); })}
                  aria-label="Delete this event" className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-dim-500 hover:bg-slab-700 hover:text-alarm-400">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete event
                </button>
              </div>
              <Field label="Mission — what does 'worth it' look like?">
                <textarea value={ev.goal} rows={2} placeholder="e.g. Book 8 qualified meetings with mid-market RevOps leaders; 25 real conversations logged."
                  onChange={(e) => patchEvent((x) => { x.goal = e.target.value; })} className={inputCls + ' resize-y'} />
              </Field>
              {/* mini scoreboard */}
              <div className="flex flex-wrap gap-2 font-mono text-[11px]">
                {[
                  ['TARGETS', `${stats.met}/${stats.targets} met`],
                  ['QUEUE', `${stats.sent}/${stats.queued} sent`],
                  ['MEETINGS', String(stats.meetings)],
                  ['PIPELINE', `${fmtMoney(ev.pipelineValue)} · ${stats.multiple.toFixed(1)}x`],
                ].map(([k, v]) => (
                  <span key={k} className="rounded border border-line-700 bg-tarmac-900 px-2.5 py-1">
                    <span className="text-dim-500">{k} </span><span className="font-semibold text-signal-300">{v}</span>
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* ======= wayfinding tabs ======= */}
          <nav className="mt-6 flex flex-wrap gap-1.5" aria-label="Sections">
            {TABS.map((t) => {
              const active = state.tab === t.id;
              return (
                <button key={t.id} onClick={() => setState((s) => ({ ...s, tab: t.id }))}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2 rounded-t-lg border-x border-t px-4 py-2.5 font-display text-[13px] font-extrabold uppercase tracking-[0.12em] transition-colors ${active ? 'border-signal-500/50 bg-slab-800 text-signal-300' : 'border-line-700 bg-slab-900/60 text-dim-400 hover:text-chalk-100'}`}>
                  <span className={`font-mono text-[10px] ${active ? 'text-signal-400' : 'text-dim-500'}`}>{t.n}</span>
                  {t.label}
                </button>
              );
            })}
          </nav>

          <div className="grid gap-6 rounded-b-xl rounded-tr-xl border border-line-700 bg-slab-800/60 p-4 sm:p-6 xl:grid-cols-[1fr_330px]">
            {/* =========== LEFT: active tab =========== */}
            <div className="min-w-0">
              {state.tab === 'dossier' && (
                <DossierTab ev={ev} patchEvent={patchEvent} deleteWithUndo={deleteWithUndo}
                  targetQuery={targetQuery} setTargetQuery={setTargetQuery}
                  targetFilter={targetFilter} setTargetFilter={setTargetFilter} consoleCtx={consoleCtx} />
              )}
              {state.tab === 'dayof' && <DayOfTab ev={ev} patchEvent={patchEvent} deleteWithUndo={deleteWithUndo} />}
              {state.tab === 'followup' && (
                <FollowUpTab ev={ev} patchEvent={patchEvent} deleteWithUndo={deleteWithUndo}
                  fuFilter={fuFilter} setFuFilter={setFuFilter} />
              )}
              {state.tab === 'roi' && <RoiTab ev={ev} stats={stats} patchEvent={patchEvent} copyText={copyText} copied={copied} />}
            </div>

            {/* =========== RIGHT: Copilot staff pass =========== */}
            <CopilotPanel ev={ev} copyText={copyText} copied={copied} patchEvent={patchEvent} consoleCtx={consoleCtx} />
          </div>
        </main>
      )}

      {/* ======= footer ======= */}
      <footer className="no-print border-t border-line-700/60 py-5 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-dim-500">
        Event Prep Kit · data lives in your browser only · Ctrl/Cmd+S copies the dossier · press ? for help
      </footer>

      {/* ======= print sheet ======= */}
      {ev && <PrintSheet ev={ev} />}

      {/* ======= modals ======= */}
      {modal === 'guide' && <GuideModal onClose={closeGuide} />}
      {modal === 'reset' && (
        <Modal title="Reset everything?" onClose={() => setModal(null)}>
          <p className="text-sm leading-relaxed text-dim-400">
            This clears every event, target, and follow-up from this browser. Export JSON first if you want a backup.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button className={btnGhost} onClick={() => setModal(null)}>Keep my data</button>
            <button className="inline-flex items-center gap-1.5 rounded-md bg-alarm-400 px-3 py-1.5 text-[13px] font-extrabold text-tarmac-950 hover:brightness-110" onClick={doReset}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Yes, reset
            </button>
          </div>
        </Modal>
      )}

      {/* ======= undo toast ======= */}
      {toast && (
        <div className="toast-in no-print fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-line-600 bg-slab-800 py-2.5 pl-4 pr-2.5 shadow-badge">
          <span className="text-[13px] font-semibold text-chalk-100">{toast.msg}</span>
          {toast.prev && (
            <button onClick={undo} className="inline-flex items-center gap-1.5 rounded-md bg-signal-400 px-2.5 py-1 text-[12px] font-extrabold text-tarmac-950 hover:bg-signal-300">
              <Undo2 className="h-3.5 w-3.5" aria-hidden /> Undo
            </button>
          )}
          <button onClick={() => setToast(null)} aria-label="Dismiss notification" className="rounded p-1 text-dim-500 hover:text-chalk-100">
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

/* ================================ Dossier tab ================================ */

function DossierTab({ ev, patchEvent, deleteWithUndo, targetQuery, setTargetQuery, targetFilter, setTargetFilter, consoleCtx }) {
  const [openId, setOpenId] = useState(null);
  const [rosterOpen, setRosterOpen] = useState(false);
  const rosterRef = useRef(null);

  const shown = ev.targets.filter((t) => {
    const q = targetQuery.trim().toLowerCase();
    const hitQ = !q || [t.name, t.company, t.role, t.whyThem].some((v) => v.toLowerCase().includes(q));
    const hitF = targetFilter === 'all' || (PRIORITIES.includes(targetFilter) ? t.priority === targetFilter : t.status === targetFilter);
    return hitQ && hitF;
  });

  const addTarget = () => {
    const id = uid();
    patchEvent((e) => e.targets.unshift({ id, name: '', company: '', role: '', whyThem: '', icebreaker: '', priority: 'A', status: 'scouted', scribbles: '' }));
    setOpenId(id);
  };

  /* console-linked convenience: pull a target straight from the console roster */
  const addTargetFromRoster = (rosterAcct) => {
    const id = uid();
    patchEvent((e) => e.targets.unshift({
      id, name: rosterAcct.name || '', company: rosterAcct.segment || '', role: '',
      whyThem: rosterAcct.notes || '', icebreaker: '', priority: 'A', status: 'scouted', scribbles: '',
    }));
    setOpenId(id);
  };

  /* close roster dropdown on outside click */
  useEffect(() => {
    if (!rosterOpen) return;
    const onDown = (e) => { if (!rosterRef.current?.contains(e.target)) setRosterOpen(false); };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [rosterOpen]);

  return (
    <div className="grid gap-8">
      {/* ---- target list ---- */}
      <section>
        <SectionTitle icon={Users} right={
          <div className="flex items-center gap-1.5">
            {consoleCtx?.roster?.accounts?.length > 0 && (
              <div className="relative" ref={rosterRef}>
                <button className={btnGhost} onClick={() => setRosterOpen((v) => !v)} aria-haspopup="menu" aria-expanded={rosterOpen}>
                  <Link2 className="h-3.5 w-3.5" aria-hidden /> Pull from roster <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                </button>
                {rosterOpen && (
                  <div role="menu" className="absolute right-0 z-40 mt-2 max-h-64 w-64 overflow-y-auto rounded-lg border border-line-700 bg-slab-900 shadow-badge">
                    {consoleCtx.roster.accounts.slice(0, 50).map((a, i) => (
                      <button key={i} role="menuitem" onClick={() => { addTargetFromRoster(a); setRosterOpen(false); }}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] text-chalk-100 hover:bg-slab-700">
                        <span className="truncate">{a.name}</span>
                        {a.segment && <span className="ml-2 shrink-0 font-mono text-[10px] text-dim-500">{a.segment}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button className={btnSignal} onClick={addTarget}><Plus className="h-3.5 w-3.5" aria-hidden /> Add target</button>
          </div>
        }>
          Target list — who you are there for
        </SectionTitle>

        {ev.targets.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim-500" aria-hidden />
              <input value={targetQuery} onChange={(e) => setTargetQuery(e.target.value)} placeholder="Search names, companies, notes"
                aria-label="Search targets" className={inputCls + ' w-64 pl-8'} />
            </div>
            {['all', 'A', 'B', 'C', 'met', 'scouted', 'missed'].map((f) => (
              <button key={f} onClick={() => setTargetFilter(f)}
                className={`rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors ${targetFilter === f ? 'border-signal-500 bg-signal-950 text-signal-300' : 'border-line-700 text-dim-400 hover:border-line-600'}`}>
                {f === 'all' ? 'All' : PRIORITIES.includes(f) ? `Track ${f}` : T_STATUS[f]}
              </button>
            ))}
          </div>
        )}

        {ev.targets.length === 0 ? (
          <EmptyCoach icon={Users} title="No badges on the wall yet">
            List 5-10 people worth crossing the floor for. For each, write the why-them - if you cannot,
            they are foot traffic, not a target. Track A = must-meet, B = strong, C = opportunistic.
          </EmptyCoach>
        ) : shown.length === 0 ? (
          <EmptyCoach icon={Search} title="No badge matches">Loosen the search or the track filter.</EmptyCoach>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {shown.map((t) => (
              <li key={t.id}>
                <TargetBadge t={t} open={openId === t.id} onToggle={() => setOpenId(openId === t.id ? null : t.id)}
                  onPatch={(p) => patchEvent((e) => { const x = e.targets.find((z) => z.id === t.id); if (x) Object.assign(x, p); })}
                  onDelete={() => deleteWithUndo(`Removed target "${t.name || 'Unnamed'}"`, (s) => {
                    const e = s.events.find((x) => x.id === s.activeEventId);
                    if (e) e.targets = e.targets.filter((z) => z.id !== t.id);
                  })} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- talk tracks ---- */}
      <section>
        <SectionTitle icon={Megaphone} right={
          <button className={btnGhost} onClick={() => patchEvent((e) => e.talkTracks.push({ id: uid(), title: 'New track', body: '' }))}>
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add track
          </button>
        }>
          Talk tracks — say it the same way twice
        </SectionTitle>
        {ev.talkTracks.length === 0 ? (
          <EmptyCoach icon={Megaphone} title="No talk tracks">
            Write your 20-second intro, a why-now story, and a pricing deflection. Rehearsed lines free
            your brain to actually listen.
          </EmptyCoach>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ev.talkTracks.map((tt) => (
              <div key={tt.id} className="group rounded-lg border border-line-700 bg-slab-900 p-3 shadow-stub">
                <div className="flex items-start justify-between gap-2">
                  <input value={tt.title} aria-label="Talk track title"
                    onChange={(e) => patchEvent((x) => { const z = x.talkTracks.find((y) => y.id === tt.id); if (z) z.title = e.target.value; })}
                    className="w-full bg-transparent font-display text-sm font-extrabold uppercase tracking-wide text-signal-300 outline-none focus:border-b focus:border-signal-500" />
                  <button aria-label={`Delete talk track ${tt.title}`} className="rounded p-1 text-dim-500 opacity-0 transition-opacity hover:text-alarm-400 focus:opacity-100 group-hover:opacity-100"
                    onClick={() => deleteWithUndo(`Deleted track "${tt.title}"`, (s) => { const e = s.events.find((x) => x.id === s.activeEventId); if (e) e.talkTracks = e.talkTracks.filter((z) => z.id !== tt.id); })}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
                <textarea value={tt.body} rows={5} placeholder="Write it as you would say it out loud."
                  aria-label={`Talk track body for ${tt.title}`}
                  onChange={(e) => patchEvent((x) => { const z = x.talkTracks.find((y) => y.id === tt.id); if (z) z.body = e.target.value; })}
                  className="mt-2 w-full resize-y rounded-md border border-transparent bg-transparent text-[13px] leading-relaxed text-chalk-100 outline-none placeholder:text-dim-500 focus:border-line-600" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---- icebreakers + prep checklist ---- */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle icon={MessageSquare} right={
            <button className={btnGhost} onClick={() => patchEvent((e) => e.icebreakers.push({ id: uid(), text: '' }))}>
              <Plus className="h-3.5 w-3.5" aria-hidden /> Add
            </button>
          }>
            Icebreakers
          </SectionTitle>
          {ev.icebreakers.length === 0 ? (
            <EmptyCoach icon={MessageSquare} title="Nothing to open with">
              Three lines beat "so, enjoying the conference?". Specific beats clever.
            </EmptyCoach>
          ) : (
            <ul className="grid gap-2">
              {ev.icebreakers.map((ib, i) => (
                <li key={ib.id} className="group flex items-center gap-2 rounded-md border border-line-700 bg-slab-900 px-3 py-2">
                  <span className="font-mono text-[10px] text-signal-400">{String(i + 1).padStart(2, '0')}</span>
                  <input value={ib.text} placeholder="A line you would actually say"
                    aria-label={`Icebreaker ${i + 1}`}
                    onChange={(e) => patchEvent((x) => { const z = x.icebreakers.find((y) => y.id === ib.id); if (z) z.text = e.target.value; })}
                    className="w-full bg-transparent text-[13px] text-chalk-100 outline-none placeholder:text-dim-500" />
                  <button aria-label={`Delete icebreaker ${i + 1}`} className="rounded p-1 text-dim-500 opacity-0 hover:text-alarm-400 focus:opacity-100 group-hover:opacity-100"
                    onClick={() => deleteWithUndo('Deleted icebreaker', (s) => { const e = s.events.find((x) => x.id === s.activeEventId); if (e) e.icebreakers = e.icebreakers.filter((z) => z.id !== ib.id); })}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <ChecklistEditor ev={ev} phase="before" title="Prep checklist" patchEvent={patchEvent} deleteWithUndo={deleteWithUndo} />
        </section>
      </div>
    </div>
  );
}

/* ---- one target rendered as a conference badge ---- */
function TargetBadge({ t, open, onToggle, onPatch, onDelete }) {
  const trackTone = { A: 'bg-signal-400 text-tarmac-950', B: 'bg-chalk-100 text-tarmac-950', C: 'bg-line-600 text-chalk-50' }[t.priority];
  return (
    <div className="relative rounded-xl bg-badge-50 text-badge-900 shadow-badge">
      {/* slot + clip hint */}
      <div className="flex justify-center pt-2.5"><div className="badge-slot" /></div>
      <div className="px-4 pb-4 pt-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <input value={t.name} placeholder="Full name" aria-label="Target name"
              onChange={(e) => onPatch({ name: e.target.value })}
              className="w-full bg-transparent font-display text-xl font-extrabold uppercase leading-tight tracking-tight outline-none placeholder:text-badge-900/30" />
            <div className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-[11px] text-badge-900/60">
              <input value={t.role} placeholder="Role" aria-label="Target role" onChange={(e) => onPatch({ role: e.target.value })}
                className="w-32 bg-transparent outline-none placeholder:text-badge-900/30" />
              <span aria-hidden>·</span>
              <input value={t.company} placeholder="Company" aria-label="Target company" onChange={(e) => onPatch({ company: e.target.value })}
                className="w-32 bg-transparent outline-none placeholder:text-badge-900/30" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <button onClick={() => onPatch({ priority: PRIORITIES[(PRIORITIES.indexOf(t.priority) + 1) % 3] })}
              aria-label={`Priority track ${t.priority} - click to change`}
              className={`grid h-7 w-7 place-items-center rounded-md font-display text-sm font-extrabold ${trackTone}`}>
              {t.priority}
            </button>
            {t.status === 'met' && (
              <span className="stamp rounded border-2 border-signal-500 px-1.5 py-0.5 font-display text-[10px] font-extrabold uppercase tracking-widest text-signal-500">Met</span>
            )}
            {t.status === 'missed' && (
              <span className="stamp rounded border-2 border-alarm-400 px-1.5 py-0.5 font-display text-[10px] font-extrabold uppercase tracking-widest text-alarm-400">Missed</span>
            )}
          </div>
        </div>

        <div className="mt-2 border-t border-dashed border-badge-900/20 pt-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-badge-900/45">Why them</p>
          <textarea value={t.whyThem} rows={open ? 3 : 2} placeholder="If you cannot fill this in, they are not a target."
            aria-label="Why this target matters"
            onChange={(e) => onPatch({ whyThem: e.target.value })}
            className="mt-0.5 w-full resize-none bg-transparent text-[13px] leading-snug outline-none placeholder:text-badge-900/30" />
        </div>

        {open && (
          <div className="grid gap-2 border-t border-dashed border-badge-900/20 pt-2">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-badge-900/45">Opener</p>
              <input value={t.icebreaker} placeholder="Your specific first line for them" aria-label="Opener for this target"
                onChange={(e) => onPatch({ icebreaker: e.target.value })}
                className="mt-0.5 w-full bg-transparent text-[13px] outline-none placeholder:text-badge-900/30" />
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-badge-900/45">Scribbles (from the conversation)</p>
              <textarea value={t.scribbles} rows={3} placeholder="What they said, what you promised, next step." aria-label="Conversation scribbles"
                onChange={(e) => onPatch({ scribbles: e.target.value })}
                className="mt-0.5 w-full resize-y bg-transparent text-[13px] leading-snug outline-none placeholder:text-badge-900/30" />
            </div>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-badge-900/10 pt-2">
          <div className="flex gap-1">
            {Object.keys(T_STATUS).map((s) => (
              <button key={s} onClick={() => onPatch({ status: s })}
                className={`rounded px-2 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors ${t.status === s ? 'bg-badge-900 text-signal-300' : 'text-badge-900/50 hover:bg-badge-100'}`}>
                {T_STATUS[s]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onToggle} className="rounded px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-badge-900/60 hover:bg-badge-100">
              {open ? 'Less' : 'More'}
            </button>
            <button onClick={onDelete} aria-label={`Delete target ${t.name || 'unnamed'}`} className="rounded p-1 text-badge-900/40 hover:text-alarm-400">
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- checklist editor (shared) ---- */
function ChecklistEditor({ ev, phase, title, patchEvent, deleteWithUndo, big = false }) {
  const items = ev.checklist.filter((c) => c.phase === phase);
  const [draft, setDraft] = useState('');
  const add = () => {
    const text = draft.trim();
    if (!text) return;
    patchEvent((e) => e.checklist.push({ id: uid(), text, done: false, phase }));
    setDraft('');
  };
  return (
    <div>
      <SectionTitle icon={ClipboardList}>{title}</SectionTitle>
      <ul className="grid gap-1.5">
        {items.map((c) => (
          <li key={c.id} className={`group flex items-center gap-3 rounded-md border border-line-700 bg-slab-900 px-3 ${big ? 'py-3' : 'py-2'}`}>
            <button role="checkbox" aria-checked={c.done} aria-label={`Mark "${c.text}" ${c.done ? 'not done' : 'done'}`}
              onClick={() => patchEvent((e) => { const z = e.checklist.find((y) => y.id === c.id); if (z) z.done = !z.done; })}
              className={`grid ${big ? 'h-7 w-7' : 'h-5 w-5'} shrink-0 place-items-center rounded border-2 transition-colors ${c.done ? 'border-signal-400 bg-signal-400 text-tarmac-950' : 'border-line-600 hover:border-signal-500'}`}>
              {c.done && <Check className={big ? 'h-5 w-5' : 'h-3.5 w-3.5'} strokeWidth={3.5} aria-hidden />}
            </button>
            <span className={`${big ? 'text-lg font-semibold' : 'text-[13px]'} ${c.done ? 'text-dim-500 line-through' : 'text-chalk-100'}`}>{c.text}</span>
            <button aria-label={`Delete checklist item "${c.text}"`} className="ml-auto rounded p-1 text-dim-500 opacity-0 hover:text-alarm-400 focus:opacity-100 group-hover:opacity-100"
              onClick={() => deleteWithUndo('Deleted checklist item', (s) => { const e = s.events.find((x) => x.id === s.activeEventId); if (e) e.checklist = e.checklist.filter((z) => z.id !== c.id); })}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {items.length === 0 && (
        <p className="mb-2 rounded-md border border-dashed border-line-600 px-3 py-2.5 text-[12px] text-dim-500">
          {phase === 'before' ? 'Logistics kill momentum. One-pagers, demo slots blocked, CRM tags ready.' : 'Big-type reminders for the floor: log fast, re-read badges, hit your number by 3pm.'}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add an item and press Enter" aria-label={`Add ${title} item`} className={inputCls} />
        <button className={btnGhost} onClick={add} aria-label={`Add item to ${title}`}><Plus className="h-4 w-4" aria-hidden /></button>
      </div>
    </div>
  );
}

/* ================================ Day-of tab ================================ */

function DayOfTab({ ev, patchEvent, deleteWithUndo }) {
  const pending = ev.targets.filter((t) => t.status !== 'met');
  const ordered = [...pending].sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority));
  const met = ev.targets.filter((t) => t.status === 'met');

  return (
    <div className="grid gap-8">
      <div className="rounded-lg border border-signal-500/30 bg-signal-950/60 px-4 py-3">
        <p className="font-display text-sm font-extrabold uppercase tracking-[0.14em] text-signal-300">Floor mode</p>
        <p className="mt-0.5 text-[13px] text-dim-400">Big type, fast taps. Tap MET when you have talked, scribble while it is fresh. {met.length}/{ev.targets.length} badges stamped.</p>
      </div>

      <section>
        <SectionTitle icon={Users}>Still to find — track order</SectionTitle>
        {ev.targets.length === 0 ? (
          <EmptyCoach icon={Users} title="No targets to hunt">Build your target list in the Dossier tab before doors open.</EmptyCoach>
        ) : ordered.length === 0 ? (
          <div className="rounded-lg border border-signal-500/40 bg-slab-900 px-5 py-6 text-center">
            <BadgeCheck className="mx-auto mb-2 h-7 w-7 text-signal-400" aria-hidden />
            <p className="font-display text-lg font-extrabold uppercase text-chalk-50">Every badge stamped</p>
            <p className="mt-1 text-[13px] text-dim-400">Now go work the hallway track - serendipity pays the A-list a bonus.</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {ordered.map((t) => (
              <li key={t.id} className="rounded-xl bg-badge-50 p-4 text-badge-900 shadow-badge">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-2xl font-extrabold uppercase leading-none tracking-tight">{t.name || 'Unnamed'}</p>
                    <p className="mt-1 font-mono text-[11px] text-badge-900/60">{[t.role, t.company].filter(Boolean).join(' · ') || 'role/company tbd'}</p>
                  </div>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md font-display text-base font-extrabold ${t.priority === 'A' ? 'bg-signal-400' : t.priority === 'B' ? 'bg-chalk-100' : 'bg-line-600 text-chalk-50'}`}>{t.priority}</span>
                </div>
                {t.icebreaker && (
                  <p className="mt-3 border-l-2 border-signal-500 pl-2.5 text-[14px] font-medium leading-snug">{t.icebreaker}</p>
                )}
                {t.whyThem && <p className="mt-2 text-[12px] leading-snug text-badge-900/60">{t.whyThem}</p>}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => patchEvent((e) => { const z = e.targets.find((y) => y.id === t.id); if (z) z.status = 'met'; })}
                    className="flex-1 rounded-md bg-badge-900 py-2.5 font-display text-sm font-extrabold uppercase tracking-widest text-signal-300 hover:bg-black">
                    Stamp MET
                  </button>
                  <button onClick={() => patchEvent((e) => { const z = e.targets.find((y) => y.id === t.id); if (z) z.status = z.status === 'missed' ? 'scouted' : 'missed'; })}
                    className={`rounded-md border-2 px-3 font-display text-xs font-extrabold uppercase ${t.status === 'missed' ? 'border-alarm-400 text-alarm-400' : 'border-badge-900/20 text-badge-900/50 hover:border-alarm-400 hover:text-alarm-400'}`}>
                    Missed
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {met.length > 0 && (
        <section>
          <SectionTitle icon={NotebookPen}>Scribble while it is fresh</SectionTitle>
          <ul className="grid gap-3">
            {met.map((t) => (
              <li key={t.id} className="rounded-lg border border-line-700 bg-slab-900 p-3">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-signal-400" aria-hidden />
                  <span className="font-display text-sm font-extrabold uppercase tracking-wide text-chalk-50">{t.name}</span>
                  <span className="font-mono text-[11px] text-dim-500">{t.company}</span>
                </div>
                <textarea value={t.scribbles} rows={2} placeholder="What they said. What you promised. The next step. Ten words now beat a blank memory tonight."
                  aria-label={`Scribbles for ${t.name}`}
                  onChange={(e2) => patchEvent((x) => { const z = x.targets.find((y) => y.id === t.id); if (z) z.scribbles = e2.target.value; })}
                  className="mt-2 w-full resize-y rounded-md border border-line-700 bg-tarmac-900 px-2.5 py-2 text-[14px] leading-relaxed text-chalk-100 outline-none placeholder:text-dim-500 focus:border-signal-500" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <ChecklistEditor ev={ev} phase="dayof" title="Day-of checklist" patchEvent={patchEvent} deleteWithUndo={deleteWithUndo} big />
        <section>
          <SectionTitle icon={Megaphone}>Say this — quick glance</SectionTitle>
          {ev.talkTracks.length === 0 ? (
            <EmptyCoach icon={Megaphone} title="No lines loaded">Write talk tracks in the Dossier tab; they show here in big type.</EmptyCoach>
          ) : (
            <div className="grid gap-2">
              {ev.talkTracks.map((tt) => (
                <details key={tt.id} className="group rounded-lg border border-line-700 bg-slab-900">
                  <summary className="cursor-pointer list-none px-4 py-3 font-display text-base font-extrabold uppercase tracking-wide text-signal-300 hover:text-signal-200">
                    {tt.title}
                  </summary>
                  <p className="border-t border-line-700 px-4 py-3 text-[15px] leading-relaxed text-chalk-100">{tt.body || 'Empty - write it in the Dossier tab.'}</p>
                </details>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ================================ Follow-up tab ================================ */

function FollowUpTab({ ev, patchEvent, deleteWithUndo, fuFilter, setFuFilter }) {
  const metNotQueued = ev.targets.filter((t) => t.status === 'met' && !ev.followUps.some((f) => f.person.trim().toLowerCase() === t.name.trim().toLowerCase()));
  const shown = ev.followUps.filter((f) => fuFilter === 'all' || f.status === fuFilter);
  const counts = Object.fromEntries(Object.keys(F_STATUS).map((k) => [k, ev.followUps.filter((f) => f.status === k).length]));

  const queueMet = () => patchEvent((e) => {
    metNotQueued.forEach((t) => e.followUps.push({
      id: uid(), person: t.name, company: t.company, channel: 'Email', due: '', status: 'draft',
      context: t.scribbles ? `From my scribbles: ${t.scribbles}` : '',
    }));
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle icon={Send}>Follow-up queue — the 48-hour window</SectionTitle>
        <div className="flex gap-2">
          {metNotQueued.length > 0 && (
            <button className={btnSignal} onClick={queueMet}>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden /> Queue {metNotQueued.length} met target{metNotQueued.length > 1 ? 's' : ''}
            </button>
          )}
          <button className={btnGhost} onClick={() => patchEvent((e) => e.followUps.unshift({ id: uid(), person: '', company: '', channel: 'Email', due: '', status: 'draft', context: '' }))}>
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add stub
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', ...Object.keys(F_STATUS)].map((f) => (
          <button key={f} onClick={() => setFuFilter(f)}
            className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors ${fuFilter === f ? 'border-signal-500 bg-signal-950 text-signal-300' : 'border-line-700 text-dim-400 hover:border-line-600'}`}>
            {f === 'all' ? `All ${ev.followUps.length}` : `${F_STATUS[f]} ${counts[f]}`}
          </button>
        ))}
      </div>

      {ev.followUps.length === 0 ? (
        <EmptyCoach icon={Send} title="Empty queue, cold pipeline">
          Every met target should become a stub within 24 hours. Use "Queue met targets" to pull them in
          with your scribbles attached, then send within 48 hours while they still remember your face.
        </EmptyCoach>
      ) : shown.length === 0 ? (
        <EmptyCoach icon={Search} title="Nothing in this state">Switch the filter - or go send some.</EmptyCoach>
      ) : (
        <ul className="grid gap-3">
          {shown.map((f, i) => (
            <li key={f.id} className="relative ml-2 rounded-r-xl rounded-l-sm border border-line-700 bg-slab-900 shadow-stub">
              {/* perforated edge */}
              <div className="absolute inset-y-0 left-0">
                <div className="perf-v h-full" />
                <div className="stub-notch-top" /><div className="stub-notch-bottom" />
              </div>
              <div className="grid gap-3 p-4 pl-6 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-mono text-[10px] tracking-[0.18em] text-signal-400">FU-{String(i + 1).padStart(3, '0')}</span>
                    <input value={f.person} placeholder="Person" aria-label="Follow-up person"
                      onChange={(e) => patchEvent((x) => { const z = x.followUps.find((y) => y.id === f.id); if (z) z.person = e.target.value; })}
                      className="min-w-0 bg-transparent font-display text-lg font-extrabold uppercase tracking-tight text-chalk-50 outline-none placeholder:text-dim-500" />
                    <input value={f.company} placeholder="Company" aria-label="Follow-up company"
                      onChange={(e) => patchEvent((x) => { const z = x.followUps.find((y) => y.id === f.id); if (z) z.company = e.target.value; })}
                      className="w-40 bg-transparent font-mono text-[12px] text-dim-400 outline-none placeholder:text-dim-500" />
                  </div>
                  <textarea value={f.context} rows={2} placeholder="Per-person context: what you promised, what to reference, what NOT to do."
                    aria-label={`Context for follow-up to ${f.person || 'unnamed'}`}
                    onChange={(e) => patchEvent((x) => { const z = x.followUps.find((y) => y.id === f.id); if (z) z.context = e.target.value; })}
                    className="mt-2 w-full resize-y rounded-md border border-line-700 bg-tarmac-900 px-2.5 py-1.5 text-[13px] leading-relaxed text-chalk-100 outline-none placeholder:text-dim-500 focus:border-signal-500" />
                </div>
                <div className="flex flex-row flex-wrap items-start gap-2 sm:flex-col">
                  <select value={f.status} aria-label="Follow-up status"
                    onChange={(e) => patchEvent((x) => { const z = x.followUps.find((y) => y.id === f.id); if (z) z.status = e.target.value; })}
                    className={`rounded-md border px-2 py-1.5 font-mono text-[11px] uppercase ${f.status === 'meeting' ? 'border-signal-500 bg-signal-950 text-signal-300' : f.status === 'draft' ? 'border-alarm-400/50 bg-tarmac-900 text-alarm-400' : 'border-line-700 bg-tarmac-900 text-chalk-100'}`}>
                    {Object.entries(F_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <select value={f.channel} aria-label="Follow-up channel"
                    onChange={(e) => patchEvent((x) => { const z = x.followUps.find((y) => y.id === f.id); if (z) z.channel = e.target.value; })}
                    className="rounded-md border border-line-700 bg-tarmac-900 px-2 py-1.5 font-mono text-[11px] text-chalk-100">
                    {CHANNELS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <input type="date" value={f.due} aria-label="Follow-up due date"
                    onChange={(e) => patchEvent((x) => { const z = x.followUps.find((y) => y.id === f.id); if (z) z.due = e.target.value; })}
                    className="rounded-md border border-line-700 bg-tarmac-900 px-2 py-1 font-mono text-[11px] text-chalk-100" />
                  <button aria-label={`Delete follow-up for ${f.person || 'unnamed'}`}
                    onClick={() => deleteWithUndo(`Tore up stub for "${f.person || 'unnamed'}"`, (s) => { const e = s.events.find((x) => x.id === s.activeEventId); if (e) e.followUps = e.followUps.filter((z) => z.id !== f.id); })}
                    className="rounded p-1.5 text-dim-500 hover:text-alarm-400">
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="rounded-md border border-line-700 bg-tarmac-900/60 px-3 py-2 font-mono text-[11px] text-dim-500">
        TIP: channel icons — <Mail className="inline h-3 w-3" aria-hidden /> email for substance, <Phone className="inline h-3 w-3" aria-hidden /> phone for heat, LinkedIn for staying visible. Mark Meeting booked and it counts in your ROI recap automatically.
      </p>
    </div>
  );
}

/* ================================ ROI tab ================================ */

function FunnelBars({ ev, stats }) {
  const steps = [
    ['Targets', stats.targets],
    ['Conversations', ev.conversations],
    ['Follow-ups sent', stats.sent],
    ['Replies', stats.replies],
    ['Meetings', stats.meetings],
  ];
  const max = Math.max(1, ...steps.map((s) => s[1]));
  const W = 520, BH = 26, GAP = 14;
  const H = steps.length * (BH + GAP);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Event funnel: targets to meetings">
      {steps.map(([label, v], i) => {
        const y = i * (BH + GAP);
        const w = Math.max(3, (v / max) * (W - 190));
        return (
          <g key={label}>
            <text x="0" y={y + BH / 2 + 4} fontFamily="'IBM Plex Mono', monospace" fontSize="11" fill="#98a2ae">{label.toUpperCase()}</text>
            <rect x="150" y={y} width={W - 190} height={BH} rx="4" fill="#12151b" stroke="#2a303b" />
            <rect x="150" y={y} width={w} height={BH} rx="4" fill={i === steps.length - 1 ? '#ddf526' : '#5d6b13'} />
            <rect x={150 + w - 2} y={y - 3} width="3" height={BH + 6} fill="#ddf526" />
            <text x={W - 32} y={y + BH / 2 + 4} textAnchor="end" fontFamily="'IBM Plex Mono', monospace" fontSize="13" fontWeight="600" fill={i === steps.length - 1 ? '#ecff5e' : '#e2e6ea'}>{v}</text>
          </g>
        );
      })}
    </svg>
  );
}

function MultipleDial({ multiple, target }) {
  // semicircle gauge 0..max(5, target, multiple)
  const maxV = Math.max(5, Math.ceil(Math.max(multiple, target) + 1));
  const cx = 110, cy = 104, r = 86;
  const angle = (v) => Math.PI * (1 - Math.min(v, maxV) / maxV);
  const pt = (v, rad = r) => [cx + rad * Math.cos(angle(v)), cy - rad * Math.sin(angle(v))];
  const [nx, ny] = pt(multiple, r - 22);
  const ticks = [];
  for (let i = 0; i <= maxV; i++) ticks.push(i);
  const arc = (v1, v2, rad, color, wdt) => {
    const [x1, y1] = pt(v1, rad); const [x2, y2] = pt(v2, rad);
    const large = (v2 - v1) / maxV > 0.5 ? 1 : 0;
    return <path d={`M ${x1} ${y1} A ${rad} ${rad} 0 ${large} 1 ${x2} ${y2}`} stroke={color} strokeWidth={wdt} fill="none" strokeLinecap="round" />;
  };
  return (
    <svg viewBox="0 0 220 118" className="w-full max-w-[280px]" role="img" aria-label={`Pipeline multiple ${multiple.toFixed(1)}x of cost`}>
      {arc(0, maxV, r, '#21262f', 10)}
      {multiple > 0.05 && arc(0, Math.min(multiple, maxV), r, '#ddf526', 10)}
      {ticks.map((t) => {
        const [x1, y1] = pt(t, r + 8); const [x2, y2] = pt(t, r + (t % 5 === 0 ? 16 : 12));
        const [lx, ly] = pt(t, r + 26);
        return (
          <g key={t}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={t === 0 || t === maxV ? '#ecff5e' : '#4a5260'} strokeWidth={t % 5 === 0 ? 2 : 1} />
            {(t === 0 || t === maxV || t % 5 === 0) && <text x={lx} y={ly + 3} textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontSize="8" fill="#6d7784">{t}x</text>}
          </g>
        );
      })}
      {target > 0 && target <= maxV && (() => { const [x1, y1] = pt(target, r - 10); const [x2, y2] = pt(target, r + 6); return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ff5d5d" strokeWidth="2.5" />; })()}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#f3f5f7" strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="6" fill="#ddf526" />
      <text x={cx} y={cy - 26} textAnchor="middle" fontFamily="Archivo, sans-serif" fontWeight="800" fontSize="22" fill="#f3f5f7">{multiple.toFixed(1)}x</text>
      <text x={cx} y={cy - 12} textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontSize="8" letterSpacing="1.5" fill="#6d7784">PIPELINE / COST</text>
    </svg>
  );
}

function RoiTab({ ev, stats, patchEvent, copyText, copied }) {
  const numField = (label, key, moneyHint) => (
    <Field label={label}>
      <input type="number" min="0" value={ev[key] || ''} placeholder="0"
        onChange={(e) => patchEvent((x) => { x[key] = num(e.target.value, 0); })}
        className={inputCls + ' font-mono'} aria-label={label} />
      {moneyHint && <span className="mt-0.5 block font-mono text-[10px] text-dim-500">{moneyHint}</span>}
    </Field>
  );
  const recapMd = () => {
    const s = stats;
    return [
      `**${ev.name} — ROI recap**`,
      `Cost ${fmtMoney(ev.cost)} · ${ev.conversations} conversations · ${s.met}/${s.targets} targets met`,
      `${s.sent}/${s.queued} follow-ups sent · ${s.replies} replies · ${s.meetings} meetings booked`,
      `${ev.dealsCreated} deals created · ${fmtMoney(ev.pipelineValue)} pipeline (${s.multiple.toFixed(1)}x cost)`,
      `Cost/conversation ${fmtMoney(s.costPerConv)} · Cost/meeting ${fmtMoney(s.costPerMeeting)}`,
    ].join('\n');
  };

  return (
    <div className="grid gap-8">
      <section className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="rounded-lg border border-line-700 bg-slab-900 p-4">
          <SectionTitle icon={Gauge}>The funnel — plan vs floor vs pipeline</SectionTitle>
          {stats.targets === 0 && ev.conversations === 0 ? (
            <EmptyCoach icon={Gauge} title="Nothing to measure yet">
              Add targets, log conversations below, and mark follow-ups sent - the funnel draws itself.
            </EmptyCoach>
          ) : <FunnelBars ev={ev} stats={stats} />}
        </div>
        <div className="grid place-items-center rounded-lg border border-line-700 bg-slab-900 p-4">
          <MultipleDial multiple={stats.multiple} target={ev.cost > 0 ? ev.pipelineTarget / ev.cost : 0} />
          <p className="mt-1 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-dim-500">
            Red tick = target multiple{ev.cost > 0 && ev.pipelineTarget > 0 ? ` (${(ev.pipelineTarget / ev.cost).toFixed(1)}x)` : ''}
          </p>
        </div>
      </section>

      <section>
        <SectionTitle icon={NotebookPen}>Log the actuals</SectionTitle>
        <div className="grid gap-3 rounded-lg border border-line-700 bg-slab-900 p-4 sm:grid-cols-3 lg:grid-cols-5">
          {numField('All-in cost ($)', 'cost', 'ticket + travel + time')}
          {numField('Pipeline target ($)', 'pipelineTarget', 'what "worth it" means')}
          {numField('Conversations logged', 'conversations')}
          {numField('Deals created', 'dealsCreated')}
          {numField('Pipeline attributed ($)', 'pipelineValue')}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ['Cost / conversation', stats.costPerConv > 0 ? fmtMoney(stats.costPerConv) : '—', 'under $200 is strong for field events'],
          ['Cost / meeting booked', stats.costPerMeeting > 0 ? fmtMoney(stats.costPerMeeting) : '—', 'compare against your outbound CAC'],
          ['Follow-up completion', stats.queued > 0 ? Math.round((stats.sent / stats.queued) * 100) + '%' : '—', 'the number most teams fail on'],
        ].map(([k, v, hint]) => (
          <div key={k} className="rounded-lg border border-line-700 bg-slab-900 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-dim-500">{k}</p>
            <p className="mt-1 font-display text-3xl font-extrabold tracking-tight text-chalk-50">{v}</p>
            <p className="mt-1 text-[11px] text-dim-500">{hint}</p>
          </div>
        ))}
      </section>

      <button className={btnSignal + ' w-fit'} onClick={() => copyText(recapMd(), 'recap')}>
        {copied === 'recap' ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        {copied === 'recap' ? 'Recap copied' : 'Copy recap for Slack/email'}
      </button>
    </div>
  );
}

/* ================================ Copilot panel ================================ */

function CopilotPanel({ ev, copyText, copied, patchEvent, consoleCtx }) {
  const [open, setOpen] = useState('research');
  const [targetId, setTargetId] = useState('');
  const target = ev.targets.find((t) => t.id === targetId) || ev.targets[0] || null;

  const actions = [
    {
      id: 'research', icon: Search, title: 'Research a target',
      desc: 'Talking points, insider questions, and landmines for one person on your list.',
      ready: !!target, notReady: 'Add a target first (Dossier tab).',
      build: () => promptResearchTarget(ev, target, consoleCtx),
      extra: ev.targets.length > 0 && (
        <select value={target?.id || ''} onChange={(e) => setTargetId(e.target.value)} aria-label="Pick a target to research"
          className="mb-2 w-full rounded-md border border-line-700 bg-tarmac-900 px-2 py-1.5 font-mono text-[12px] text-chalk-100">
          {ev.targets.map((t) => <option key={t.id} value={t.id}>{t.name || 'Unnamed'} — {t.company || '?'}</option>)}
        </select>
      ),
    },
    {
      id: 'intro', icon: Megaphone, title: 'Write my 20-second intro',
      desc: 'A spoken intro tuned to this event, three variants, and a blunt critique of your tracks.',
      ready: true, build: () => promptIntro(ev, consoleCtx),
    },
    {
      id: 'followups', icon: Send, title: 'Draft follow-ups from my scribbles',
      desc: 'Turns raw conversation notes into channel-ready messages with one clean ask each.',
      ready: ev.followUps.length > 0 || ev.targets.some((t) => t.status === 'met'),
      notReady: 'Stamp someone MET or add a stub to the queue first.',
      build: () => promptFollowUps(ev, consoleCtx),
    },
    {
      id: 'roi', icon: Gauge, title: 'Judge my ROI honestly',
      desc: 'Verdict, worst leak, a go/no-go rule for the next invite, and a Slack-ready recap.',
      ready: true, build: () => promptRoi(ev, consoleCtx),
    },
  ];

  return (
    <aside className="h-fit xl:sticky xl:top-4">
      <div className="overflow-hidden rounded-xl border border-line-700 bg-slab-900 shadow-badge">
        {/* staff-pass strap header */}
        <div className="relative bg-signal-400 px-4 py-3">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(-55deg, #07080b 0 2px, transparent 2px 12px)' }} />
          <div className="relative flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-tarmac-950" aria-hidden />
            <div>
              <p className="font-display text-sm font-extrabold uppercase tracking-[0.14em] text-tarmac-950">Claude Copilot</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-tarmac-950/70">Staff pass · no API key needed</p>
            </div>
            <QrCode className="ml-auto h-6 w-6 text-tarmac-950/70" aria-hidden />
          </div>
        </div>

        <div className="grid gap-2 p-3">
          <p className="px-1 text-[12px] leading-relaxed text-dim-400">
            Each button builds a complete prompt around your current dossier. Copy it, paste into
            claude.ai — works with the standard $20 Claude subscription.
          </p>
          {actions.map((a) => {
            const isOpen = open === a.id;
            return (
              <div key={a.id} className={`rounded-lg border transition-colors ${isOpen ? 'border-signal-500/50 bg-slab-800' : 'border-line-700 bg-slab-900 hover:border-line-600'}`}>
                <button onClick={() => setOpen(isOpen ? null : a.id)} aria-expanded={isOpen}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left">
                  <a.icon className={`h-4 w-4 shrink-0 ${isOpen ? 'text-signal-400' : 'text-dim-500'}`} aria-hidden />
                  <span className="font-display text-[13px] font-extrabold uppercase tracking-wide text-chalk-50">{a.title}</span>
                  <ChevronDown className={`ml-auto h-4 w-4 text-dim-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
                </button>
                {isOpen && (
                  <div className="border-t border-line-700 px-3 py-2.5">
                    <p className="mb-2 text-[12px] leading-relaxed text-dim-400">{a.desc}</p>
                    {a.extra}
                    {a.ready ? (
                      <button className={btnSignal + ' w-full justify-center'} onClick={() => copyText(a.build(), 'cp-' + a.id)}>
                        {copied === 'cp-' + a.id ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                        {copied === 'cp-' + a.id ? 'Prompt copied' : 'Copy prompt'}
                      </button>
                    ) : (
                      <p className="rounded-md border border-dashed border-line-600 px-2.5 py-2 text-[12px] text-dim-500">{a.notReady}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="mt-1 rounded-lg border border-line-700 bg-tarmac-900/60 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-dim-500">
              <StickyNote className="h-3.5 w-3.5 text-signal-400" aria-hidden /> Claude's answers — paste to keep
            </p>
            <textarea value={ev.copilotNotes} rows={5}
              placeholder="Paste the useful parts of Claude's reply here. Saved with this event."
              aria-label="Saved Claude answers"
              onChange={(e) => patchEvent((x) => { x.copilotNotes = e.target.value; })}
              className="w-full resize-y rounded-md border border-line-700 bg-tarmac-950 px-2.5 py-2 text-[12px] leading-relaxed text-chalk-100 outline-none placeholder:text-dim-500 focus:border-signal-500" />
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ================================ print sheet ================================ */

function PrintSheet({ ev }) {
  const s = eventStats(ev);
  return (
    <div className="print-only px-2 font-body text-black">
      <h1 className="font-display text-2xl font-extrabold uppercase">{ev.name} — Event Dossier</h1>
      <p className="font-mono text-xs">{[ev.dates, ev.venue, ev.city].filter(Boolean).join(' · ')}</p>
      {ev.goal && <p className="mt-2 text-sm"><strong>Mission:</strong> {ev.goal}</p>}
      <h2 className="mt-4 font-display text-base font-extrabold uppercase">Targets</h2>
      {ev.targets.map((t) => (
        <div key={t.id} className="mt-2 border-t border-black/20 pt-1 text-sm">
          <p><strong>[{t.priority}] {t.name}</strong> — {t.role} @ {t.company} ({T_STATUS[t.status]})</p>
          {t.whyThem && <p>Why: {t.whyThem}</p>}
          {t.icebreaker && <p>Opener: {t.icebreaker}</p>}
          {t.scribbles && <p>Scribbles: {t.scribbles}</p>}
        </div>
      ))}
      <h2 className="mt-4 font-display text-base font-extrabold uppercase">Talk tracks</h2>
      {ev.talkTracks.map((t) => <p key={t.id} className="mt-1 text-sm"><strong>{t.title}:</strong> {t.body}</p>)}
      <h2 className="mt-4 font-display text-base font-extrabold uppercase">Icebreakers</h2>
      <ul className="list-disc pl-5 text-sm">{ev.icebreakers.map((i) => <li key={i.id}>{i.text}</li>)}</ul>
      <h2 className="mt-4 font-display text-base font-extrabold uppercase">Checklist</h2>
      <ul className="list-none text-sm">{ev.checklist.map((c) => <li key={c.id}>[{c.done ? 'x' : ' '}] ({c.phase}) {c.text}</li>)}</ul>
      <h2 className="mt-4 font-display text-base font-extrabold uppercase">Follow-up queue</h2>
      {ev.followUps.map((f) => (
        <p key={f.id} className="mt-1 text-sm"><strong>{f.person}</strong> ({f.company}) — {F_STATUS[f.status]} · {f.channel}{f.due ? ' · due ' + f.due : ''}{f.context ? ' — ' + f.context : ''}</p>
      ))}
      <h2 className="mt-4 font-display text-base font-extrabold uppercase">ROI</h2>
      <p className="text-sm">
        Cost {fmtMoney(ev.cost)} · {ev.conversations} conversations · {s.met}/{s.targets} met · {s.sent}/{s.queued} follow-ups sent · {s.meetings} meetings · {fmtMoney(ev.pipelineValue)} pipeline ({s.multiple.toFixed(1)}x)
      </p>
    </div>
  );
}

/* ================================ guide modal ================================ */

function GuideModal({ onClose }) {
  const steps = [
    ['Issue a badge', 'Load the demo to see a finished event, or create your own and set the mission - what "worth it" means in numbers.'],
    ['Build the target list', 'In 01 Dossier, add 5-10 people with a real why-them. Track A = must-meet. Add openers so you never start cold.'],
    ['Load your lines', 'Write talk tracks (20-second intro, why-now, pricing deflection) and a few icebreakers. Run the prep checklist.'],
    ['Work the floor', '02 Day-of is big-type mode: hunt the unmet badges in track order, stamp MET, and scribble notes within ten minutes.'],
    ['Queue follow-ups', 'In 03 Follow-up, hit "Queue met targets" - your scribbles ride along. Set channel, due date, and send inside 48 hours.'],
    ['Ask the Copilot', 'The staff pass panel builds Claude-ready prompts from your data: research a target, your intro, drafted follow-ups, an ROI verdict. Copy, paste into claude.ai, keep the good parts in the notes box.'],
    ['Face the numbers', '04 ROI recap logs cost and conversations, then draws the funnel and the pipeline-multiple dial. Copy the recap for your team.'],
    ['Keep the artifact', 'Export: Markdown dossier, JSON backup (re-importable), follow-up CSV, or print the whole sheet.'],
  ];
  const keys = [
    ['?', 'Open this guide'], ['Esc', 'Close dialogs and menus'],
    ['Ctrl/Cmd + S', 'Copy the Markdown dossier'], ['1 - 4', 'Jump between sections'],
    ['Enter', 'Add checklist item (while typing in its field)'],
  ];
  return (
    <Modal title="How to use Event Prep Kit" onClose={onClose} wide>
      <p className="mb-4 text-[13px] leading-relaxed text-dim-400">
        The kit runs one loop per event: <span className="font-semibold text-signal-300">dossier before, big type during, queue after, honest math at the end.</span> Everything
        stays in this browser.
      </p>
      <ol className="grid gap-3">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-signal-400 font-display text-[13px] font-extrabold text-tarmac-950">{i + 1}</span>
            <div>
              <p className="font-display text-[13px] font-extrabold uppercase tracking-wide text-chalk-50">{t}</p>
              <p className="text-[13px] leading-relaxed text-dim-400">{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <h3 className="mb-2 mt-5 font-display text-[12px] font-extrabold uppercase tracking-[0.16em] text-dim-400">Keyboard</h3>
      <div className="overflow-hidden rounded-lg border border-line-700">
        {keys.map(([k, d], i) => (
          <div key={k} className={`flex items-center gap-3 px-3 py-2 ${i % 2 ? '' : 'bg-tarmac-900/50'}`}>
            <kbd className="rounded border border-line-600 bg-slab-700 px-2 py-0.5 font-mono text-[11px] text-signal-300">{k}</kbd>
            <span className="text-[13px] text-dim-400">{d}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <button className={btnSignal} onClick={onClose}><Check className="h-4 w-4" aria-hidden /> Got it</button>
      </div>
    </Modal>
  );
}
