import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Music4, Mail, Phone, UserPlus, MessageSquareText, Plus, Trash2, Copy, Check,
  Download, Upload, RotateCcw, HelpCircle, X, ChevronUp, ChevronDown, ChevronRight,
  FileJson, FileSpreadsheet, FileText, Sparkles, ClipboardPaste, Undo2, DoorOpen,
  CalendarClock, Scale, HeartHandshake, AlertTriangle, ListMusic, Library, Files,
  PencilLine, Keyboard, Link2,
} from 'lucide-react';

/* ============================== console bus =============================== */

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
    try { window.parent.postMessage({ bizdev: 'ready', v: 1, slug: '13-cadence-composer' }, '*'); } catch {}
    return () => window.removeEventListener('message', onMsg);
  }, []);
  return ctx;
}

/* ================================ constants =============================== */

const STORAGE_KEY = 'bizdev:13-cadence-composer:v1';

const CHANNELS = {
  email: { label: 'Email', short: 'EM', color: '#35507c', soft: 'rgba(53,80,124,0.12)', Icon: Mail },
  call: { label: 'Call', short: 'CL', color: '#8c3a2e', soft: 'rgba(140,58,46,0.12)', Icon: Phone },
  linkedin: { label: 'LinkedIn', short: 'LI', color: '#2e6b58', soft: 'rgba(46,107,88,0.12)', Icon: UserPlus },
  sms: { label: 'SMS', short: 'SM', color: '#a9791f', soft: 'rgba(169,121,31,0.14)', Icon: MessageSquareText },
};
const CHANNEL_KEYS = Object.keys(CHANNELS);
const STAFF_ORDER = ['email', 'call', 'linkedin', 'sms'];

let idSeed = Date.now() % 100000;
const uid = () => `cc_${(idSeed++).toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/* ================================ normalize =============================== */

function normStep(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const channel = CHANNEL_KEYS.includes(raw.channel) ? raw.channel : 'email';
  const day = Number.isFinite(Number(raw.day)) ? Math.max(0, Math.min(120, Math.round(Number(raw.day)))) : 0;
  return {
    id: typeof raw.id === 'string' ? raw.id : uid(),
    channel,
    day,
    title: typeof raw.title === 'string' ? raw.title.slice(0, 140) : '',
    subject: typeof raw.subject === 'string' ? raw.subject.slice(0, 200) : '',
    body: typeof raw.body === 'string' ? raw.body.slice(0, 4000) : '',
    note: typeof raw.note === 'string' ? raw.note.slice(0, 600) : '',
  };
}

function normCadence(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const er = raw.exitRules && typeof raw.exitRules === 'object' ? raw.exitRules : {};
  return {
    id: typeof raw.id === 'string' ? raw.id : uid(),
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.slice(0, 90) : 'Untitled cadence',
    goal: typeof raw.goal === 'string' ? raw.goal.slice(0, 240) : '',
    persona: typeof raw.persona === 'string' ? raw.persona.slice(0, 240) : '',
    exitRules: {
      replied: er.replied !== false,
      booked: er.booked !== false,
      optedOut: er.optedOut !== false,
      custom: typeof er.custom === 'string' ? er.custom.slice(0, 300) : '',
    },
    steps: Array.isArray(raw.steps) ? raw.steps.map(normStep).filter(Boolean).slice(0, 60) : [],
  };
}

function normalize(raw) {
  const base = { cadences: [], activeId: null, seenGuide: false, claudeNotes: '' };
  if (!raw || typeof raw !== 'object') return base;
  const cadences = Array.isArray(raw.cadences) ? raw.cadences.map(normCadence).filter(Boolean).slice(0, 40) : [];
  let activeId = typeof raw.activeId === 'string' ? raw.activeId : null;
  if (!cadences.some((c) => c.id === activeId)) activeId = cadences[0]?.id ?? null;
  return {
    cadences,
    activeId,
    seenGuide: raw.seenGuide === true,
    claudeNotes: typeof raw.claudeNotes === 'string' ? raw.claudeNotes.slice(0, 20000) : '',
  };
}

function loadState() {
  try { return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
  catch { return normalize(null); }
}

/* ================================ demo data =============================== */

function demoState() {
  const c1 = {
    id: uid(),
    name: 'New-Logo Outbound — Mid-Market SaaS Ops',
    goal: 'Book a 25-minute discovery call with Directors of RevOps at 100–600 person SaaS companies.',
    persona: 'Director of Revenue Operations. Drowning in tool sprawl, measured on pipeline hygiene, allergic to fluffy vendor emails.',
    exitRules: { replied: true, booked: true, optedOut: true, custom: 'Also exit if their company announces layoffs or a funding freeze — park in the Q3 warm list.' },
    steps: [
      { id: uid(), channel: 'email', day: 0, title: 'Opener — the broken forecast', subject: 'your forecast vs. what closed in Q2', body: "{{first_name}} — most RevOps teams I talk to can pull a forecast in 10 seconds and defend it in zero.\n\nWe helped Loftbeam cut forecast variance from 31% to 9% in one quarter, without changing their CRM.\n\nWorth 25 minutes to see the before/after? If not, tell me to buzz off and I will.", note: 'Send Tue–Thu, 7:40am their time. No links in touch 1.' },
      { id: uid(), channel: 'linkedin', day: 1, title: 'Profile view + follow', subject: '', body: 'View their profile, follow, react thoughtfully to their most recent post. No connection request yet — let the name land twice before you knock.', note: 'Skip the react if their last post is older than 60 days.' },
      { id: uid(), channel: 'call', day: 3, title: 'First dial — voicemail is the ad', subject: '', body: "Opener: \"{{first_name}}, cold call — 27 seconds, then you can hang up on me guilt-free.\"\n\nVoicemail: \"This is {{me}} at {{company}}. I emailed Tuesday about forecast variance — the 31%-to-9% story. I'll try you once more Thursday; if it's a never, one word by email and I vanish.\"", note: 'Dial block 4:05–4:45pm local. Log disposition.' },
      { id: uid(), channel: 'email', day: 4, title: 'Bump — 3-line proof', subject: 're: your forecast vs. what closed', body: "Bumping this once.\n\nOne number: Loftbeam's ops team got 6 hours/week back when board-deck prep stopped being archaeology.\n\nIf pipeline hygiene isn't a 2026 priority, say the word and I'll close the file.", note: 'Reply in-thread. Keep under 60 words.' },
      { id: uid(), channel: 'linkedin', day: 7, title: 'Connect with a real note', subject: '', body: "Request: \"{{first_name}} — I've emailed and called like a polite woodpecker. Connecting here in case LinkedIn is where you actually live. The forecast-variance story is real; happy to share the teardown either way.\"", note: '280-char limit — trim to fit.' },
      { id: uid(), channel: 'call', day: 9, title: 'Second dial — new angle', subject: '', body: 'Lead with the peer angle, not the product: "Talked to three RevOps leads this month who all said Q3 planning ate their July. Curious if that matches your world."', note: 'Morning block this time — 8:10–8:40am.' },
      { id: uid(), channel: 'email', day: 12, title: 'Value drop — the teardown', subject: 'the 9-line forecast audit (steal it)', body: "No ask today.\n\nHere's the 9-line audit we run before any engagement — paste it into a doc, run it on your own pipeline, and it'll show you where the variance hides. Takes 20 minutes.\n\nIf the audit surfaces something ugly, that's usually the moment a call is worth it.", note: 'Attach the audit as plain text in the email body, not a link.' },
      { id: uid(), channel: 'sms', day: 15, title: 'Text — only if a call connected', subject: '', body: "{{first_name}}, it's {{me}} — the forecast-audit person. Sending times for a 25-min walkthrough: Thu 2pm or Fri 10am work? Totally fine to say neither.", note: 'CONDITIONAL: only send if we have spoken live at least once. Never cold-text.' },
      { id: uid(), channel: 'email', day: 21, title: 'Break-up — the graceful exit', subject: 'closing your file (one question first)', body: "I'll stop here — three emails, two calls, one carrier pigeon short of a full cadence.\n\nBefore I close the file: was this a timing problem, a relevance problem, or a me problem? One word helps me bother the right people better.\n\nDoor's open whenever forecast season gets loud.", note: 'Send Friday morning. Highest reply rate of the whole cadence — write it like a human.' },
    ],
  };
  const c2 = {
    id: uid(),
    name: 'Post-Demo Nudge — 14-Day Close',
    goal: 'Convert completed demos into signed pilots within 14 days, before the excitement decays.',
    persona: 'The champion who loved the demo but has a boss, a procurement form, and forty other tabs open.',
    exitRules: { replied: true, booked: true, optedOut: true, custom: 'Exit to the Nurture score if they say "next quarter" twice.' },
    steps: [
      { id: uid(), channel: 'email', day: 0, title: 'Same-day recap + mutual plan', subject: 'recap + the 3 things we agreed', body: 'Send within 4 hours of the demo. Recap the 3 pains in THEIR words, the two features that landed, and a dated mutual-action plan with one small ask for this week.', note: 'The mutual plan is the artifact — keep it to 5 rows.' },
      { id: uid(), channel: 'linkedin', day: 2, title: 'Send the champion ammo', subject: '', body: "DM: \"Made you a one-pager your boss can read in 90 seconds — the ROI math from our call, no logo soup. Want me to tailor the numbers before you forward it?\"", note: '' },
      { id: uid(), channel: 'call', day: 5, title: 'Pulse check call', subject: '', body: '"Not chasing a signature — checking whether the internal conversation happened and what landed weird." Listen for the silent stakeholder.', note: 'If no-answer, do NOT voicemail; the day-6 email covers it.' },
      { id: uid(), channel: 'email', day: 6, title: 'Objection pre-emption', subject: 'the two questions your CFO will ask', body: 'Name the two objections every buyer hits (price vs. status quo, migration fear) and answer both in plain language before they are raised.', note: '' },
      { id: uid(), channel: 'email', day: 10, title: 'Deadline with a reason', subject: 'pilot slot closes Friday', body: 'Real scarcity only: onboarding cohort starts Monday, next one is 6 weeks out. Offer to hold the slot for 48 hours.', note: 'Never invent scarcity. If there is none, skip this step.' },
      { id: uid(), channel: 'call', day: 13, title: 'The direct ask', subject: '', body: '"Feels like this is a yes that has not found its paperwork. What has to be true by Friday for the pilot to start?" Then be quiet.', note: '' },
    ],
  };
  return normalize({ cadences: [c1, c2], activeId: c1.id, seenGuide: true, claudeNotes: '' });
}

function blankCadence() {
  return normCadence({
    id: uid(), name: 'Untitled cadence', goal: '', persona: '',
    exitRules: { replied: true, booked: true, optedOut: true, custom: '' },
    steps: [],
  });
}

/* =============================== serializers ============================== */

function cadenceToMarkdown(c) {
  const lines = [];
  lines.push(`# Cadence: ${c.name}`);
  lines.push('');
  if (c.goal) lines.push(`**Goal:** ${c.goal}`);
  if (c.persona) lines.push(`**Persona:** ${c.persona}`);
  const exits = [
    c.exitRules.replied && 'prospect replies',
    c.exitRules.booked && 'meeting booked',
    c.exitRules.optedOut && 'opt-out / unsubscribe',
    c.exitRules.custom && c.exitRules.custom,
  ].filter(Boolean);
  lines.push(`**Exit rules (stop the cadence when):** ${exits.length ? exits.join('; ') : 'none defined'}`);
  const span = c.steps.length ? Math.max(...c.steps.map((s) => s.day)) : 0;
  lines.push(`**Shape:** ${c.steps.length} touches over ${span + 1} day${span === 0 ? '' : 's'}`);
  lines.push('');
  lines.push('| # | Day | Channel | Touch |');
  lines.push('|---|-----|---------|-------|');
  c.steps.forEach((s, i) => {
    lines.push(`| ${i + 1} | ${s.day} | ${CHANNELS[s.channel].label} | ${s.title || '(untitled)'} |`);
  });
  lines.push('');
  c.steps.forEach((s, i) => {
    lines.push(`## Step ${i + 1} — Day ${s.day} · ${CHANNELS[s.channel].label} · ${s.title || '(untitled)'}`);
    if (s.subject) lines.push(`**Subject:** ${s.subject}`);
    if (s.body) { lines.push(''); lines.push(s.body); }
    if (s.note) { lines.push(''); lines.push(`> Playbook note: ${s.note}`); }
    lines.push('');
  });
  return lines.join('\n');
}

function cadenceToCsv(c) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['step', 'day', 'channel', 'title', 'subject', 'body', 'note'].join(',')];
  c.steps.forEach((s, i) => {
    rows.push([i + 1, s.day, s.channel, esc(s.title), esc(s.subject), esc(s.body), esc(s.note)].join(','));
  });
  return rows.join('\n');
}

function download(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

/* ============================== copilot prompts =========================== */

function sharedContextHeader(consoleCtx) {
  if (!consoleCtx) return '';
  const profile = consoleCtx.profile || {};
  const claude = consoleCtx.claude || {};
  const roster = consoleCtx.roster || {};
  const lines = [];
  if (profile.company) lines.push(`- My company: ${profile.company}`);
  if (profile.offer) lines.push(`- What I sell: ${profile.offer}`);
  if (profile.icp) lines.push(`- My ICP: ${profile.icp}`);
  if (profile.pricingAnchor) lines.push(`- Pricing anchor: ${profile.pricingAnchor}`);
  if (claude.userName || claude.voiceNotes) {
    const bits = [claude.userName, claude.voiceNotes].filter(Boolean);
    lines.push(`- My name / voice: ${bits.join(' — ')}`);
  }
  if (Array.isArray(roster.accounts) && roster.accounts.length) {
    const accts = roster.accounts.slice(0, 12).map((a) => (a.segment ? `${a.name} (${a.segment})` : a.name)).join(', ');
    lines.push(`- Accounts on file: ${accts}`);
  }
  if (!lines.length) return '';
  return `## Shared context (from BizDev Console)\n${lines.join('\n')}\n\n`;
}

function promptDraftStep(c, stepIndex) {
  const s = c.steps[stepIndex];
  return `You are a top-1% outbound copywriter and SDR coach. You write follow-up touches that feel hand-typed, earn replies, and never sound like "just circling back."

Here is my full multi-channel cadence, exported from Cadence Composer:

${cadenceToMarkdown(c)}

YOUR TASK
Draft the complete copy for **Step ${stepIndex + 1} (Day ${s.day}, ${CHANNELS[s.channel].label}${s.title ? ` — "${s.title}"` : ''})**.

Requirements:
- Match the persona and goal above; reference what earlier touches already said so this step advances the story instead of repeating it.
- ${s.channel === 'email' ? 'Give me 2 subject-line options plus a body under 90 words, written for a skim.' : s.channel === 'call' ? 'Give me a 15-second opener, 3 discovery questions, and a 25-second voicemail script.' : s.channel === 'linkedin' ? 'Give me the message (under 280 characters if a connection note, under 100 words if a DM) plus one comment I could leave on their content instead.' : 'Give me a text under 300 characters that is warm, low-pressure, and obviously human.'}
- Use merge fields like {{first_name}} and {{company}} where personalization belongs.
- Zero filler phrases ("hope you're well", "just checking in", "quick question").

OUTPUT FORMAT
1) The draft copy, ready to paste.
2) A 2-sentence rationale: why this angle at this point in the cadence.
3) One riskier alternative version.`;
}

function promptBalanceMix(c, stats) {
  const mix = STAFF_ORDER.map((k) => `${CHANNELS[k].label}: ${stats.counts[k]} touch(es)`).join(', ');
  return `You are a sales-engagement strategist who has audited hundreds of outbound cadences. You know channel-mix benchmarks, pacing science (front-load early, breathe later), and when multi-channel becomes multi-annoying.

Here is my cadence, exported from Cadence Composer:

${cadenceToMarkdown(c)}

CURRENT SHAPE
- Total: ${stats.total} touches across ${stats.span + 1} days.
- Channel mix: ${mix}.
- Largest silent gap: ${stats.maxGap} day(s)${stats.maxGapAfter ? ` (after step ${stats.maxGapAfter})` : ''}.

YOUR TASK
Audit and rebalance this cadence.
1. Score the current mix and pacing out of 10, with one sentence of justification each.
2. Diagnose the top 3 problems (channel over/under-use, gaps, tone monotony, missing conditional touches).
3. Propose a revised timeline as a table (Day | Channel | Purpose of touch), keeping what already works — do not rewrite for the sake of it.
4. Flag anything that risks spam filters, LinkedIn jail, or plain rudeness for this persona.

OUTPUT FORMAT: the two scores, the diagnosis list, the revised table, then a 3-bullet "why this rhythm works" summary.`;
}

function promptBreakup(c) {
  const last = c.steps[c.steps.length - 1];
  return `You are a master of the break-up email — the final touch that gets more replies than the previous five combined because it is honest, light, and gives the prospect a graceful out.

Here is my cadence, exported from Cadence Composer:

${cadenceToMarkdown(c)}

CONTEXT
- Persona: ${c.persona || 'not specified — infer from the cadence copy'}.
- The current final touch is ${last ? `Step ${c.steps.length} on Day ${last.day} (${CHANNELS[last.channel].label}${last.title ? `: "${last.title}"` : ''})` : 'missing — this cadence has no break-up step yet'}.

YOUR TASK
Write 3 distinct break-up message variants for this cadence's final touch:
1. **The Gracious Close** — warm, zero guilt, leaves the door open.
2. **The Honest Question** — asks the one-word diagnostic (timing / relevance / wrong person).
3. **The Pattern Interrupt** — unexpected angle or gentle humor that fits this persona; never gimmicky.

Each variant: subject line + body under 80 words + a one-line note on when to choose it. Then recommend which variant fits this persona best and why, in 2 sentences.`;
}

function promptCritique(c) {
  return `You are a ruthless but constructive cadence reviewer. Your bar: would a busy ${c.persona ? c.persona.split('.')[0] : 'executive'} feel pursued by a thoughtful peer, or hunted by a sequence tool?

Here is my cadence, exported from Cadence Composer:

${cadenceToMarkdown(c)}

YOUR TASK
Run a full critique:
1. Read every step as the prospect would, in order, with the day gaps in mind.
2. Grade the cadence A–F on: opening hook, value-to-ask ratio, channel choreography, exit-rule hygiene, break-up strength.
3. Quote the 3 weakest lines verbatim and rewrite each one.
4. Identify the single change that would most improve reply rate.

OUTPUT FORMAT: report card table, the 3 rewrites (before → after), then the one big change as a bolded sentence.`;
}

/* ============================== small components ========================== */

function ChannelChip({ channel, size = 'md' }) {
  const ch = CHANNELS[channel];
  const Icon = ch.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono uppercase tracking-wider ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'}`}
      style={{ color: ch.color, background: ch.soft, border: `1px solid ${ch.color}33` }}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden />
      {ch.label}
    </span>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 44 44" className="h-11 w-11 shrink-0" aria-hidden>
        <rect x="1.5" y="1.5" width="41" height="41" rx="9" fill="#fbf6ea" stroke="#a9791f" strokeWidth="1.6" />
        {[14, 20, 26, 32].map((y) => (
          <line key={y} x1="8" x2="36" y1={y} y2={y} stroke="#d9cbaa" strokeWidth="1.2" />
        ))}
        <ellipse cx="14" cy="26" rx="3.2" ry="2.4" fill="#35507c" transform="rotate(-18 14 26)" />
        <line x1="17" y1="25" x2="17" y2="13.5" stroke="#35507c" strokeWidth="1.6" strokeLinecap="round" />
        <ellipse cx="27" cy="20" rx="3.2" ry="2.4" fill="#8c3a2e" transform="rotate(-18 27 20)" />
        <line x1="30" y1="19" x2="30" y2="9.5" stroke="#8c3a2e" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M30 9.5 q4 1.5 5 5" stroke="#8c3a2e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
      <div>
        <h1 className="font-display text-2xl font-black leading-none tracking-tight text-ink sm:text-[27px]">
          Cadence Composer
        </h1>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-inksoft">
          Follow-up, arranged like music
        </p>
      </div>
    </div>
  );
}

/* ------------------------------- rhythm staff ----------------------------- */

function RhythmStaff({ cadence, selectedId, onSelect }) {
  const steps = cadence.steps;
  const span = Math.max(7, steps.length ? Math.max(...steps.map((s) => s.day)) : 0);
  const W = 980, H = 218;
  const left = 118, right = 46, top = 42, rowGap = 34;
  const plotW = W - left - right;
  const x = (day) => left + (day / span) * plotW;
  const rowY = (ch) => top + STAFF_ORDER.indexOf(ch) * rowGap;
  const weeks = [];
  for (let d = 7; d <= span; d += 7) weeks.push(d);
  const dayTicks = [];
  const tickEvery = span > 30 ? 5 : 1;
  for (let d = 0; d <= span; d += tickEvery) dayTicks.push(d);

  return (
    <div className="overflow-x-auto rounded-xl border border-staffline bg-cardstock shadow-[var(--shadow-sheet)]">
      <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[640px] w-full" role="img"
        aria-label={`Rhythm view: ${steps.length} touches across ${span + 1} days`}>
        {/* title band */}
        <text x={left} y={22} className="font-mono" fontSize="10.5" letterSpacing="2.5" fill="#94856c">
          RHYTHM VIEW — {steps.length} {steps.length === 1 ? 'TOUCH' : 'TOUCHES'} / {span + 1} DAYS
        </text>
        <text x={W - right} y={22} textAnchor="end" fontSize="10.5" letterSpacing="2" className="font-mono" fill="#a9791f">
          {cadence.exitRules.replied || cadence.exitRules.booked ? 'CODA: EXIT ON REPLY / BOOKED' : 'NO EXIT RULES SET'}
        </text>

        {/* staff lines + clef labels */}
        {STAFF_ORDER.map((ch) => {
          const y = rowY(ch);
          const conf = CHANNELS[ch];
          return (
            <g key={ch}>
              <line x1={left - 8} x2={W - right + 10} y1={y} y2={y} stroke="#d9cbaa" strokeWidth="1.3" />
              <text x={left - 16} y={y + 3.5} textAnchor="end" fontSize="11" className="font-mono" letterSpacing="1.5" fill={conf.color}>
                {conf.label.toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* opening barline */}
        <line x1={left - 8} x2={left - 8} y1={rowY('email') - 10} y2={rowY('sms') + 10} stroke="#6b5c46" strokeWidth="2.4" />
        {/* weekly measure barlines */}
        {weeks.map((d) => (
          <g key={d}>
            <line x1={x(d)} x2={x(d)} y1={rowY('email') - 10} y2={rowY('sms') + 10} stroke="#d9cbaa" strokeWidth="1.1" />
            <text x={x(d)} y={rowY('email') - 16} textAnchor="middle" fontSize="9.5" className="font-mono" fill="#94856c">
              wk {d / 7}
            </text>
          </g>
        ))}
        {/* final double barline */}
        <line x1={W - right + 6} x2={W - right + 6} y1={rowY('email') - 10} y2={rowY('sms') + 10} stroke="#6b5c46" strokeWidth="1.2" />
        <line x1={W - right + 10} x2={W - right + 10} y1={rowY('email') - 10} y2={rowY('sms') + 10} stroke="#6b5c46" strokeWidth="3" />

        {/* day axis */}
        {dayTicks.map((d) => (
          <g key={d}>
            <line x1={x(d)} x2={x(d)} y1={rowY('sms') + 14} y2={rowY('sms') + 19} stroke="#c9b98f" strokeWidth="1" />
            {(tickEvery > 1 || span <= 24 || d % 2 === 0) && (
              <text x={x(d)} y={rowY('sms') + 32} textAnchor="middle" fontSize="9.5" className="font-mono" fill="#94856c">{d}</text>
            )}
          </g>
        ))}
        <text x={left - 16} y={rowY('sms') + 32} textAnchor="end" fontSize="9.5" letterSpacing="1.5" className="font-mono" fill="#94856c">DAY</text>

        {/* connecting phrase line */}
        {steps.length > 1 && (
          <polyline
            points={steps.map((s) => `${x(s.day)},${rowY(s.channel)}`).join(' ')}
            fill="none" stroke="#a9791f" strokeWidth="1" strokeDasharray="3 4" opacity="0.55"
          />
        )}

        {/* note heads */}
        {steps.map((s, i) => {
          const cx = x(s.day), cy = rowY(s.channel);
          const conf = CHANNELS[s.channel];
          const sel = s.id === selectedId;
          return (
            <g key={s.id} className="cursor-pointer" onClick={() => onSelect(s.id)}>
              {sel && <circle cx={cx} cy={cy} r="12.5" fill="none" stroke={conf.color} strokeWidth="1.4" strokeDasharray="2.5 3" />}
              <line x1={cx + 6.5} y1={cy - 1.5} x2={cx + 6.5} y2={cy - 24} stroke={conf.color} strokeWidth="1.7" strokeLinecap="round" />
              <ellipse cx={cx} cy={cy} rx="7" ry="5.2" fill={conf.color} transform={`rotate(-18 ${cx} ${cy})`} />
              <text x={cx} y={cy - 29} textAnchor="middle" fontSize="9.5" className="font-mono" fill="#6b5c46">{i + 1}</text>
              <title>{`Step ${i + 1} — Day ${s.day} · ${conf.label}${s.title ? ` · ${s.title}` : ''}`}</title>
            </g>
          );
        })}

        {/* empty staff hint */}
        {steps.length === 0 && (
          <text x={left + plotW / 2} y={rowY('call') + 16} textAnchor="middle" fontSize="13" fill="#94856c" fontStyle="italic">
            An empty staff. Add your first touch below and the score writes itself.
          </text>
        )}
      </svg>
    </div>
  );
}

/* ------------------------------- mix meter -------------------------------- */

function MixMeter({ stats }) {
  const total = Math.max(1, stats.total);
  return (
    <div className="rounded-xl border border-staffline bg-cardstock p-4 shadow-[var(--shadow-sheet)]">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-inksoft">Channel mix</span>
        <span className="font-mono text-[10.5px] text-inkfaint">{stats.total} touches · {stats.span + 1} days</span>
      </div>
      <div className="flex h-3.5 w-full overflow-hidden rounded-full border border-staffline bg-parchment" role="img"
        aria-label={STAFF_ORDER.map((k) => `${CHANNELS[k].label} ${stats.counts[k]}`).join(', ')}>
        {STAFF_ORDER.map((k) => stats.counts[k] > 0 && (
          <div key={k} style={{ width: `${(stats.counts[k] / total) * 100}%`, background: CHANNELS[k].color }} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4">
        {STAFF_ORDER.map((k) => (
          <div key={k} className="flex items-center gap-1.5 font-mono text-[11px] text-inksoft">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CHANNELS[k].color }} aria-hidden />
            {CHANNELS[k].label}
            <span className="ml-auto tabular-nums text-ink">{stats.counts[k]}</span>
          </div>
        ))}
      </div>
      {stats.warnings.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-rule pt-2.5">
          {stats.warnings.map((w) => (
            <li key={w} className="flex items-start gap-1.5 text-[12px] leading-snug text-oxblood">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ================================== app =================================== */

export default function App() {
  const consoleCtx = useConsoleBus();
  const [state, setState] = useState(loadState);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [copilotStep, setCopilotStep] = useState(0);
  const [selectedStepId, setSelectedStepId] = useState(null);
  const [expandedStepId, setExpandedStepId] = useState(null);
  const [toast, setToast] = useState(null); // {msg, undo?}
  const [copied, setCopied] = useState(null); // key of last copied thing
  const toastTimer = useRef(null);
  const fileRef = useRef(null);
  const saveTimer = useRef(null);

  const active = state.cadences.find((c) => c.id === state.activeId) ?? null;

  /* ------- persistence (debounced autosave) ------- */
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
    }, 250);
    return () => clearTimeout(saveTimer.current);
  }, [state]);

  /* ------- first-visit guide ------- */
  useEffect(() => {
    if (!state.seenGuide) {
      setHelpOpen(true);
      setState((s) => ({ ...s, seenGuide: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------- toast helper ------- */
  const showToast = useCallback((msg, undo) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), 7000);
  }, []);

  /* ------- clipboard ------- */
  const copyText = useCallback(async (text, key, msg) => {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; }
    catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        ok = document.execCommand('copy'); ta.remove();
      } catch { ok = false; }
    }
    setCopied(key);
    setTimeout(() => setCopied((k) => (k === key ? null : k)), 1800);
    showToast(ok ? msg : 'Copy failed — your browser blocked clipboard access');
  }, [showToast]);

  /* ------- cadence mutations ------- */
  const patchActive = useCallback((patch) => {
    setState((s) => ({
      ...s,
      cadences: s.cadences.map((c) => (c.id === s.activeId ? { ...c, ...(typeof patch === 'function' ? patch(c) : patch) } : c)),
    }));
  }, []);

  const addCadence = () => {
    const c = blankCadence();
    setState((s) => ({ ...s, cadences: [...s.cadences, c], activeId: c.id }));
    setExpandedStepId(null);
  };

  const duplicateCadence = (id) => {
    setState((s) => {
      const src = s.cadences.find((c) => c.id === id);
      if (!src) return s;
      const copy = normCadence({ ...src, id: uid(), name: `${src.name} (variation)`, steps: src.steps.map((st) => ({ ...st, id: uid() })) });
      return { ...s, cadences: [...s.cadences, copy], activeId: copy.id };
    });
  };

  const deleteCadence = (id) => {
    const idx = state.cadences.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const removed = state.cadences[idx];
    setState((s) => {
      const next = s.cadences.filter((c) => c.id !== id);
      return { ...s, cadences: next, activeId: s.activeId === id ? (next[Math.max(0, idx - 1)]?.id ?? null) : s.activeId };
    });
    showToast(`Deleted "${removed.name}"`, () => {
      setState((s2) => {
        if (s2.cadences.some((c) => c.id === removed.id)) return s2;
        const cs = [...s2.cadences]; cs.splice(Math.min(idx, cs.length), 0, removed);
        return { ...s2, cadences: cs, activeId: removed.id };
      });
    });
  };

  const addStep = (channel) => {
    if (!active) return;
    const lastDay = active.steps.length ? Math.max(...active.steps.map((s) => s.day)) : -2;
    const step = normStep({ id: uid(), channel, day: Math.min(120, lastDay + 2), title: '', subject: '', body: '', note: '' });
    patchActive((c) => ({ steps: [...c.steps, step] }));
    setExpandedStepId(step.id);
    setSelectedStepId(step.id);
  };

  const patchStep = (stepId, patch) => {
    patchActive((c) => ({ steps: c.steps.map((s) => (s.id === stepId ? normStep({ ...s, ...patch }) : s)) }));
  };

  const deleteStep = (stepId) => {
    if (!active) return;
    const idx = active.steps.findIndex((s) => s.id === stepId);
    if (idx < 0) return;
    const removed = active.steps[idx];
    const cadenceId = active.id;
    patchActive((c) => ({ steps: c.steps.filter((s) => s.id !== stepId) }));
    showToast(`Removed Day ${removed.day} ${CHANNELS[removed.channel].label} touch`, () => {
      setState((s2) => ({
        ...s2,
        cadences: s2.cadences.map((cc) => {
          if (cc.id !== cadenceId || cc.steps.some((s) => s.id === removed.id)) return cc;
          const steps = [...cc.steps]; steps.splice(Math.min(idx, steps.length), 0, removed);
          return { ...cc, steps };
        }),
      }));
    });
  };

  const moveStep = (stepId, dir) => {
    patchActive((c) => {
      const idx = c.steps.findIndex((s) => s.id === stepId);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= c.steps.length) return {};
      const steps = [...c.steps];
      [steps[idx], steps[j]] = [steps[j], steps[idx]];
      return { steps };
    });
  };

  const sortByDay = () => {
    patchActive((c) => ({ steps: [...c.steps].sort((a, b) => a.day - b.day) }));
    showToast('Steps re-sorted by day offset');
  };

  /* ------- demo / reset / import ------- */
  const loadDemo = () => { setState((s) => ({ ...demoState(), seenGuide: true, claudeNotes: s.claudeNotes })); showToast('Demo loaded: two full cadences on the stand'); };
  const doReset = () => {
    setState((s) => ({ cadences: [], activeId: null, seenGuide: true, claudeNotes: s.claudeNotes }));
    setConfirmReset(false);
    showToast('Score wiped clean. Load demo or start a blank cadence.');
  };

  const onImportFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = normalize(JSON.parse(String(reader.result)));
        if (!next.cadences.length) { showToast('That file had no cadences in it — nothing imported'); return; }
        setState((s) => ({ ...next, seenGuide: true, claudeNotes: next.claudeNotes || s.claudeNotes }));
        showToast(`Imported ${next.cadences.length} cadence${next.cadences.length === 1 ? '' : 's'}`);
      } catch { showToast('Import failed — not valid Cadence Composer JSON'); }
    };
    reader.readAsText(f);
  };

  /* ------- stats ------- */
  const stats = useMemo(() => {
    const counts = { email: 0, call: 0, linkedin: 0, sms: 0 };
    const steps = active?.steps ?? [];
    steps.forEach((s) => { counts[s.channel] += 1; });
    const days = steps.map((s) => s.day).sort((a, b) => a - b);
    const span = days.length ? days[days.length - 1] : 0;
    let maxGap = 0, maxGapAfter = null;
    for (let i = 1; i < days.length; i++) {
      const g = days[i] - days[i - 1];
      if (g > maxGap) { maxGap = g; maxGapAfter = i; }
    }
    const warnings = [];
    if (steps.length >= 3 && counts.email === steps.length) warnings.push('Every touch is email — a one-instrument cadence is easy to mute. Add a call or LinkedIn touch.');
    if (maxGap >= 7) warnings.push(`A ${maxGap}-day silence mid-cadence — momentum dies after 6 quiet days.`);
    if (counts.sms > 0 && steps.length > 0 && steps.find((s) => s.channel === 'sms')?.day <= 3) warnings.push('SMS inside the first 3 days reads as invasive. Text only after a live conversation.');
    if (steps.length >= 10) warnings.push(`${steps.length} touches is fortissimo — past ~9, replies fall and spam reports rise.`);
    const outOfOrder = steps.some((s, i) => i > 0 && s.day < steps[i - 1].day);
    return { counts, total: steps.length, span, maxGap, maxGapAfter, warnings, outOfOrder };
  }, [active]);

  /* ------- keyboard shortcuts ------- */
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') {
        setHelpOpen(false); setExportOpen(false); setConfirmReset(false); setExpandedStepId(null);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (active) copyText(cadenceToMarkdown(active), 'md', 'Cadence copied as Markdown');
        else showToast('No cadence selected to copy');
        return;
      }
      if (typing) return;
      if (e.key === '?') { e.preventDefault(); setHelpOpen((v) => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, copyText, showToast]);

  useEffect(() => { setCopilotStep(0); }, [state.activeId]);

  /* ------- copilot actions ------- */
  const copilotActions = active ? [
    {
      key: 'draft', Icon: PencilLine, title: 'Draft the touch for a step',
      desc: 'Complete copy for one step, in context of the whole score.',
      extra: (
        <select
          value={Math.min(copilotStep, Math.max(0, active.steps.length - 1))}
          onChange={(e) => setCopilotStep(Number(e.target.value))}
          disabled={!active.steps.length}
          className="w-full rounded-md border border-staffline bg-cardstock px-2 py-1.5 font-mono text-[11px] text-ink focus-visible:outline-2 focus-visible:outline-brass"
          aria-label="Choose which step to draft"
        >
          {active.steps.length === 0 && <option>Add a step first</option>}
          {active.steps.map((s, i) => (
            <option key={s.id} value={i}>Step {i + 1} — Day {s.day} · {CHANNELS[s.channel].label}{s.title ? ` · ${s.title.slice(0, 30)}` : ''}</option>
          ))}
        </select>
      ),
      build: () => sharedContextHeader(consoleCtx) + promptDraftStep(active, Math.min(copilotStep, active.steps.length - 1)),
      disabled: !active.steps.length,
    },
    {
      key: 'balance', Icon: Scale, title: 'Balance my channel mix',
      desc: 'Audit pacing, mix and gaps; get a rebalanced timeline.',
      build: () => sharedContextHeader(consoleCtx) + promptBalanceMix(active, stats),
      disabled: !active.steps.length,
    },
    {
      key: 'breakup', Icon: DoorOpen, title: 'Break-up message variants',
      desc: 'Three closers for the final touch: gracious, honest, pattern-interrupt.',
      build: () => sharedContextHeader(consoleCtx) + promptBreakup(active),
      disabled: false,
    },
    {
      key: 'critique', Icon: Sparkles, title: 'Critique the whole cadence',
      desc: 'Report card, weakest-line rewrites, the one big change.',
      build: () => sharedContextHeader(consoleCtx) + promptCritique(active),
      disabled: !active.steps.length,
    },
  ] : [];

  /* ================================ render ================================ */

  return (
    <div className="min-h-screen text-ink">
      {/* ============================ header ============================ */}
      <header className="cc-chrome border-b border-staffline/80 bg-cardstock/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Wordmark />
          <p className="hidden max-w-[300px] font-display text-[13.5px] italic leading-snug text-inksoft lg:block">
            Compose multi-channel follow-up sequences with the pacing of a score — not the panic of a to-do list.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {consoleCtx && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-viridian/40 bg-viridian/10 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-wider text-viridian"
                title={`Linked to BizDev Console${consoleCtx.profile?.company ? ` · ${consoleCtx.profile.company}` : ''}`}
              >
                <Link2 className="h-3 w-3" aria-hidden />
                Console linked{consoleCtx.profile?.company ? ` · ${consoleCtx.profile.company}` : ''}
              </span>
            )}
            <button onClick={loadDemo}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brass/50 bg-brass/10 px-3 py-2 font-mono text-[11.5px] font-medium uppercase tracking-wider text-brassdeep transition hover:bg-brass/20 focus-visible:outline-2 focus-visible:outline-brass">
              <ListMusic className="h-3.5 w-3.5" aria-hidden /> Load demo
            </button>
            <div className="relative">
              <button onClick={() => setConfirmReset((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-staffline bg-cardstock px-3 py-2 font-mono text-[11.5px] uppercase tracking-wider text-inksoft transition hover:border-oxblood/50 hover:text-oxblood focus-visible:outline-2 focus-visible:outline-brass">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
              </button>
              {confirmReset && (
                <div className="cc-rise absolute right-0 top-full z-30 mt-2 w-60 rounded-xl border border-staffline bg-cardstock p-3 shadow-[var(--shadow-sheet)]">
                  <p className="text-[12.5px] leading-snug text-inksoft">Wipe every cadence from the stand? Your Claude notes survive.</p>
                  <div className="mt-2.5 flex gap-2">
                    <button onClick={doReset} className="flex-1 rounded-md bg-oxblood px-2 py-1.5 font-mono text-[11px] uppercase tracking-wider text-paper hover:brightness-110 focus-visible:outline-2 focus-visible:outline-brass">Wipe it</button>
                    <button onClick={() => setConfirmReset(false)} className="flex-1 rounded-md border border-staffline px-2 py-1.5 font-mono text-[11px] uppercase tracking-wider text-inksoft hover:bg-parchment focus-visible:outline-2 focus-visible:outline-brass">Keep</button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setHelpOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-staffline bg-cardstock px-3 py-2 font-mono text-[11.5px] uppercase tracking-wider text-inksoft transition hover:bg-parchment focus-visible:outline-2 focus-visible:outline-brass">
              <HelpCircle className="h-3.5 w-3.5" aria-hidden /> How to use
            </button>
            <div className="relative">
              <button onClick={() => setExportOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 font-mono text-[11.5px] uppercase tracking-wider text-paper transition hover:bg-cocoa focus-visible:outline-2 focus-visible:outline-brass">
                <Download className="h-3.5 w-3.5" aria-hidden /> Export
              </button>
              {exportOpen && (
                <div className="cc-rise absolute right-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-xl border border-staffline bg-cardstock shadow-[var(--shadow-sheet)]">
                  <button disabled={!active} onClick={() => { active && copyText(cadenceToMarkdown(active), 'md', 'Cadence copied as Markdown'); setExportOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] hover:bg-parchment disabled:opacity-40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brass">
                    <FileText className="h-4 w-4 text-inksoft" aria-hidden /> Copy cadence as Markdown
                    <kbd className="ml-auto font-mono text-[10px] text-inkfaint">Ctrl+S</kbd>
                  </button>
                  <button onClick={() => { download('cadence-composer-library.json', JSON.stringify(state, null, 2), 'application/json'); setExportOpen(false); showToast('Full library downloaded as JSON'); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] hover:bg-parchment focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brass">
                    <FileJson className="h-4 w-4 text-inksoft" aria-hidden /> Download library (JSON)
                  </button>
                  <button disabled={!active || !active.steps.length} onClick={() => { download(`${active.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`, cadenceToCsv(active), 'text/csv'); setExportOpen(false); showToast('Steps downloaded as CSV'); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] hover:bg-parchment disabled:opacity-40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brass">
                    <FileSpreadsheet className="h-4 w-4 text-inksoft" aria-hidden /> Download steps (CSV)
                  </button>
                  <div className="border-t border-rule" />
                  <button onClick={() => { fileRef.current?.click(); setExportOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] hover:bg-parchment focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brass">
                    <Upload className="h-4 w-4 text-inksoft" aria-hidden /> Import library (JSON)
                  </button>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} aria-label="Import JSON library file" />
          </div>
        </div>
      </header>

      {/* ============================ body ============================ */}
      <div className="cc-chrome mx-auto grid max-w-[1400px] gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)_320px]">

        {/* ---------- cadence library ---------- */}
        <aside>
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.2em] text-inksoft">
              <Library className="h-3.5 w-3.5" aria-hidden /> Cadence library
            </h2>
            <button onClick={addCadence} aria-label="New cadence"
              className="rounded-md border border-staffline bg-cardstock p-1.5 text-inksoft transition hover:border-brass hover:text-brassdeep focus-visible:outline-2 focus-visible:outline-brass">
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </div>
          {state.cadences.length === 0 ? (
            <div className="rounded-xl border border-dashed border-staffline bg-cardstock/60 p-4 text-[12.5px] leading-relaxed text-inksoft">
              The library shelf is bare. A working BD motion usually keeps 3–5 scores: new-logo outbound, post-demo, re-engage, referral thank-you, renewal.
            </div>
          ) : (
            <ul className="space-y-2">
              {state.cadences.map((c) => {
                const isActive = c.id === state.activeId;
                const span = c.steps.length ? Math.max(...c.steps.map((s) => s.day)) + 1 : 0;
                return (
                  <li key={c.id}>
                    <div className={`group relative rounded-xl border p-3 transition ${isActive ? 'border-brass/70 bg-cardstock shadow-[var(--shadow-sheet)]' : 'border-staffline bg-cardstock/60 hover:border-brass/40'}`}>
                      <button onClick={() => { setState((s) => ({ ...s, activeId: c.id })); setExpandedStepId(null); }}
                        className="block w-full text-left focus-visible:outline-2 focus-visible:outline-brass">
                        <span className="font-display text-[14px] font-black leading-tight">{c.name}</span>
                        <span className="mt-1 block font-mono text-[10.5px] text-inkfaint">
                          {c.steps.length} touches · {span} day{span === 1 ? '' : 's'}
                        </span>
                        <span className="mt-2 flex gap-1" aria-hidden>
                          {c.steps.slice(0, 14).map((s) => (
                            <span key={s.id} className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: CHANNELS[s.channel].color }} />
                          ))}
                        </span>
                      </button>
                      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                        <button onClick={() => duplicateCadence(c.id)} aria-label={`Duplicate cadence ${c.name}`}
                          className="rounded-md bg-parchment p-1 text-inksoft hover:text-brassdeep focus-visible:outline-2 focus-visible:outline-brass">
                          <Files className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <button onClick={() => deleteCadence(c.id)} aria-label={`Delete cadence ${c.name}`}
                          className="rounded-md bg-parchment p-1 text-inksoft hover:text-oxblood focus-visible:outline-2 focus-visible:outline-brass">
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {active && <div className="mt-4"><MixMeter stats={stats} /></div>}
        </aside>

        {/* ---------- composer ---------- */}
        <main className="min-w-0">
          {!active ? (
            <div className="grid min-h-[420px] place-items-center rounded-2xl border border-dashed border-staffline bg-cardstock/50 p-8 text-center">
              <div className="max-w-md">
                <svg viewBox="0 0 200 80" className="mx-auto mb-5 w-56 opacity-80" aria-hidden>
                  {[18, 32, 46, 60].map((y) => <line key={y} x1="10" x2="190" y1={y} y2={y} stroke="#d9cbaa" strokeWidth="1.4" />)}
                  <line x1="10" x2="10" y1="12" y2="66" stroke="#6b5c46" strokeWidth="2.5" />
                  <ellipse cx="60" cy="32" rx="8" ry="6" fill="#35507c" transform="rotate(-18 60 32)" opacity="0.35" />
                  <ellipse cx="110" cy="46" rx="8" ry="6" fill="#8c3a2e" transform="rotate(-18 110 46)" opacity="0.35" />
                  <ellipse cx="155" cy="18" rx="8" ry="6" fill="#2e6b58" transform="rotate(-18 155 18)" opacity="0.35" />
                </svg>
                <h2 className="font-display text-2xl font-black">The stand is empty</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-inksoft">
                  A cadence is a follow-up sequence with rhythm: email, call, LinkedIn and SMS touches placed on a timeline, with exit rules so you stop the moment they reply. Load the demo to hear one, or start from a blank sheet.
                </p>
                <div className="mt-5 flex justify-center gap-2.5">
                  <button onClick={loadDemo} className="rounded-lg bg-ink px-4 py-2.5 font-mono text-[12px] uppercase tracking-wider text-paper hover:bg-cocoa focus-visible:outline-2 focus-visible:outline-brass">Load the demo score</button>
                  <button onClick={addCadence} className="rounded-lg border border-staffline bg-cardstock px-4 py-2.5 font-mono text-[12px] uppercase tracking-wider text-inksoft hover:bg-parchment focus-visible:outline-2 focus-visible:outline-brass">Blank cadence</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* cadence meta */}
              <section className="rounded-2xl border border-staffline bg-cardstock p-5 shadow-[var(--shadow-sheet)]">
                <input
                  value={active.name}
                  onChange={(e) => patchActive({ name: e.target.value.slice(0, 90) })}
                  className="w-full rounded-md border border-transparent bg-transparent font-display text-[24px] font-black leading-tight tracking-tight outline-none transition hover:border-staffline focus:border-brass focus-visible:outline-2 focus-visible:outline-brass sm:text-[28px]"
                  aria-label="Cadence name" placeholder="Name this cadence"
                />
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-inksoft">Goal — what a "win" is</span>
                    <textarea value={active.goal} onChange={(e) => patchActive({ goal: e.target.value.slice(0, 240) })} rows={2}
                      placeholder="e.g. Book a 25-minute discovery call"
                      className="mt-1 w-full resize-none rounded-lg border border-staffline bg-paper/60 px-3 py-2 text-[13px] leading-snug placeholder:text-inkfaint focus-visible:outline-2 focus-visible:outline-brass" />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-inksoft">Persona — who hears this</span>
                    <textarea value={active.persona} onChange={(e) => patchActive({ persona: e.target.value.slice(0, 240) })} rows={2}
                      placeholder="e.g. Director of RevOps, allergic to vendor fluff"
                      className="mt-1 w-full resize-none rounded-lg border border-staffline bg-paper/60 px-3 py-2 text-[13px] leading-snug placeholder:text-inkfaint focus-visible:outline-2 focus-visible:outline-brass" />
                  </label>
                </div>
                {/* exit rules */}
                <div className="mt-4 rounded-xl border border-brass/40 bg-brass/[0.06] p-3.5">
                  <div className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-brassdeep">
                    <DoorOpen className="h-3.5 w-3.5" aria-hidden /> Exit rules — the coda
                  </div>
                  <p className="mt-1 text-[12px] italic text-inksoft">A cadence without exit rules is spam with a schedule. Stop the moment any of these fire:</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2">
                    {[['replied', 'Prospect replied', HeartHandshake], ['booked', 'Meeting booked', CalendarClock], ['optedOut', 'Opted out', X]].map(([key, label, Icon]) => (
                      <label key={key} className="inline-flex cursor-pointer items-center gap-2 text-[13px]">
                        <input type="checkbox" checked={active.exitRules[key]}
                          onChange={(e) => patchActive({ exitRules: { ...active.exitRules, [key]: e.target.checked } })}
                          className="h-4 w-4 accent-[#a9791f] focus-visible:outline-2 focus-visible:outline-brass" />
                        <Icon className="h-3.5 w-3.5 text-brassdeep" aria-hidden /> {label}
                      </label>
                    ))}
                  </div>
                  <input value={active.exitRules.custom}
                    onChange={(e) => patchActive({ exitRules: { ...active.exitRules, custom: e.target.value.slice(0, 300) } })}
                    placeholder="Custom exit rule, e.g. exit if the champion changes jobs"
                    className="mt-2.5 w-full rounded-lg border border-staffline bg-paper/60 px-3 py-2 text-[12.5px] placeholder:text-inkfaint focus-visible:outline-2 focus-visible:outline-brass"
                    aria-label="Custom exit rule" />
                </div>
              </section>

              {/* rhythm view */}
              <RhythmStaff cadence={active} selectedId={selectedStepId} onSelect={(id) => {
                setSelectedStepId(id); setExpandedStepId(id);
                document.getElementById(`step-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }} />

              {/* step toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 font-mono text-[10.5px] uppercase tracking-[0.2em] text-inksoft">Add a touch:</span>
                {STAFF_ORDER.map((k) => {
                  const conf = CHANNELS[k]; const Icon = conf.Icon;
                  return (
                    <button key={k} onClick={() => addStep(k)}
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-brass"
                      style={{ color: conf.color, borderColor: `${conf.color}55`, background: conf.soft }}>
                      <Icon className="h-3.5 w-3.5" aria-hidden /> {conf.label}
                    </button>
                  );
                })}
                {stats.outOfOrder && (
                  <button onClick={sortByDay}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-oxblood/50 bg-oxblood/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-oxblood hover:bg-oxblood/20 focus-visible:outline-2 focus-visible:outline-brass">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Out of tempo — sort by day
                  </button>
                )}
              </div>

              {/* step list */}
              {active.steps.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-staffline bg-cardstock/50 p-8 text-center">
                  <p className="font-display text-lg font-black">No touches yet</p>
                  <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-inksoft">
                    Good opening bars: an email on Day 0, a LinkedIn profile view on Day 1, a call on Day 3. Use the channel buttons above — each new touch lands two days after the last.
                  </p>
                </div>
              ) : (
                <ol className="space-y-3">
                  {active.steps.map((s, i) => {
                    const conf = CHANNELS[s.channel]; const Icon = conf.Icon;
                    const open = expandedStepId === s.id;
                    return (
                      <li key={s.id} id={`step-${s.id}`}>
                        <div className={`rounded-xl border bg-cardstock shadow-[var(--shadow-sheet)] transition ${selectedStepId === s.id ? 'border-brass/70' : 'border-staffline'}`}
                          style={{ borderLeft: `4px solid ${conf.color}` }}>
                          <div className="flex items-center gap-3 px-3.5 py-2.5">
                            <button onClick={() => { setExpandedStepId(open ? null : s.id); setSelectedStepId(s.id); }}
                              className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-brass"
                              aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} step ${i + 1}`}>
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-staffline bg-paper font-mono text-[10px] leading-none text-inksoft">
                                <span className="text-[9px] uppercase tracking-wide text-inkfaint">Day</span>
                                <span className="text-[13px] font-semibold text-ink tabular-nums">{s.day}</span>
                              </span>
                              <span className="min-w-0">
                                <span className="flex items-center gap-2">
                                  <ChannelChip channel={s.channel} size="sm" />
                                  <span className="hidden font-mono text-[10px] text-inkfaint sm:inline">#{i + 1}</span>
                                </span>
                                <span className="mt-0.5 block truncate font-display text-[14.5px] font-black leading-snug">
                                  {s.title || <span className="font-normal italic text-inkfaint">Untitled touch — open to write it</span>}
                                </span>
                              </span>
                              <ChevronRight className={`ml-auto h-4 w-4 shrink-0 text-inkfaint transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden />
                            </button>
                            <div className="flex shrink-0 items-center gap-1">
                              <button onClick={() => moveStep(s.id, -1)} disabled={i === 0} aria-label={`Move step ${i + 1} earlier`}
                                className="rounded-md p-1 text-inksoft hover:bg-parchment disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-brass">
                                <ChevronUp className="h-4 w-4" aria-hidden />
                              </button>
                              <button onClick={() => moveStep(s.id, 1)} disabled={i === active.steps.length - 1} aria-label={`Move step ${i + 1} later`}
                                className="rounded-md p-1 text-inksoft hover:bg-parchment disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-brass">
                                <ChevronDown className="h-4 w-4" aria-hidden />
                              </button>
                              <button onClick={() => deleteStep(s.id)} aria-label={`Delete step ${i + 1}`}
                                className="rounded-md p-1 text-inksoft hover:bg-oxblood/10 hover:text-oxblood focus-visible:outline-2 focus-visible:outline-brass">
                                <Trash2 className="h-4 w-4" aria-hidden />
                              </button>
                            </div>
                          </div>

                          {open && (
                            <div className="cc-rise border-t border-rule px-4 py-4">
                              <div className="grid gap-3 sm:grid-cols-[110px_1fr_1fr]">
                                <label className="block">
                                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-inksoft">Day offset</span>
                                  <input type="number" min={0} max={120} value={s.day}
                                    onChange={(e) => patchStep(s.id, { day: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-staffline bg-paper/60 px-3 py-2 font-mono text-[13px] tabular-nums focus-visible:outline-2 focus-visible:outline-brass" />
                                </label>
                                <label className="block">
                                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-inksoft">Channel</span>
                                  <select value={s.channel} onChange={(e) => patchStep(s.id, { channel: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-staffline bg-paper/60 px-3 py-2 text-[13px] focus-visible:outline-2 focus-visible:outline-brass">
                                    {STAFF_ORDER.map((k) => <option key={k} value={k}>{CHANNELS[k].label}</option>)}
                                  </select>
                                </label>
                                <label className="block">
                                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-inksoft">Touch title</span>
                                  <input value={s.title} onChange={(e) => patchStep(s.id, { title: e.target.value })}
                                    placeholder='e.g. "Bump — 3-line proof"'
                                    className="mt-1 w-full rounded-lg border border-staffline bg-paper/60 px-3 py-2 text-[13px] placeholder:text-inkfaint focus-visible:outline-2 focus-visible:outline-brass" />
                                </label>
                              </div>
                              {s.channel === 'email' && (
                                <label className="mt-3 block">
                                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-inksoft">Subject line</span>
                                  <input value={s.subject} onChange={(e) => patchStep(s.id, { subject: e.target.value })}
                                    placeholder="lowercase subjects read as human"
                                    className="mt-1 w-full rounded-lg border border-staffline bg-paper/60 px-3 py-2 text-[13px] placeholder:text-inkfaint focus-visible:outline-2 focus-visible:outline-brass" />
                                </label>
                              )}
                              <label className="mt-3 block">
                                <span className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-inksoft">
                                  <span>{s.channel === 'call' ? 'Call script / talk track' : s.channel === 'linkedin' ? 'Message / action' : 'Message template'}</span>
                                  <span className="tabular-nums text-inkfaint">{s.body.length} chars</span>
                                </span>
                                <textarea value={s.body} onChange={(e) => patchStep(s.id, { body: e.target.value })} rows={5}
                                  placeholder={'Write the actual words. Merge fields like {{first_name}} and {{company}} are welcome.'}
                                  className="mt-1 w-full rounded-lg border border-staffline bg-paper/60 px-3 py-2 font-mono text-[12.5px] leading-relaxed placeholder:text-inkfaint focus-visible:outline-2 focus-visible:outline-brass" />
                              </label>
                              <label className="mt-3 block">
                                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-inksoft">Playbook note (timing, conditions)</span>
                                <input value={s.note} onChange={(e) => patchStep(s.id, { note: e.target.value })}
                                  placeholder="e.g. Only send if the Day 3 call connected"
                                  className="mt-1 w-full rounded-lg border border-staffline bg-paper/60 px-3 py-2 text-[12.5px] italic placeholder:text-inkfaint focus-visible:outline-2 focus-visible:outline-brass" />
                              </label>
                              <div className="mt-3 flex justify-end">
                                <button onClick={() => copyText(`${s.subject ? `Subject: ${s.subject}\n\n` : ''}${s.body}`, `step-${s.id}`, 'Touch copy on the clipboard')}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-staffline px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-inksoft hover:bg-parchment focus-visible:outline-2 focus-visible:outline-brass">
                                  {copied === `step-${s.id}` ? <Check className="h-3.5 w-3.5 text-viridian" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                                  Copy this touch
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          )}
        </main>

        {/* ---------- copilot ---------- */}
        <aside>
          <div className="rounded-2xl border border-ink/20 bg-ink p-4 text-paper shadow-[var(--shadow-sheet)]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brass cc-pulse" aria-hidden />
              <h2 className="font-display text-[16px] font-black tracking-tight">Claude Copilot</h2>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-paper/70">
              Each action packs your current score into an expert prompt. Copy it, paste into claude.ai — works with the standard $20 Claude subscription. No API key, no integration.
            </p>
            {!active ? (
              <p className="mt-4 rounded-lg border border-paper/20 bg-paper/5 p-3 text-[12px] italic text-paper/60">
                Select or create a cadence and the copilot actions unlock.
              </p>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {copilotActions.map((a) => (
                  <li key={a.key} className="rounded-xl border border-paper/15 bg-paper/[0.06] p-3">
                    <div className="flex items-start gap-2.5">
                      <a.Icon className="mt-0.5 h-4 w-4 shrink-0 text-brass" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-[13.5px] font-black leading-snug">{a.title}</p>
                        <p className="mt-0.5 text-[11.5px] leading-snug text-paper/60">{a.desc}</p>
                        {a.extra && <div className="mt-2">{a.extra}</div>}
                        <button disabled={a.disabled}
                          onClick={() => copyText(a.build(), `cp-${a.key}`, 'Prompt copied — paste it into claude.ai')}
                          className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-brass px-3 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-ink transition hover:brightness-110 disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-paper">
                          {copied === `cp-${a.key}` ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                          Copy prompt
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 border-t border-paper/15 pt-3.5">
              <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/60">
                <ClipboardPaste className="h-3.5 w-3.5" aria-hidden /> Paste Claude's answer back
              </label>
              <textarea
                value={state.claudeNotes}
                onChange={(e) => setState((s) => ({ ...s, claudeNotes: e.target.value.slice(0, 20000) }))}
                rows={5}
                placeholder="Drop Claude's rewrite or audit here — it autosaves with the rest of your library."
                className="mt-1.5 w-full rounded-lg border border-paper/20 bg-paper/5 px-3 py-2 font-mono text-[12px] leading-relaxed text-paper placeholder:text-paper/35 focus-visible:outline-2 focus-visible:outline-brass"
              />
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-staffline bg-cardstock/70 p-3.5">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-inksoft">
              <Keyboard className="h-3.5 w-3.5" aria-hidden /> Shortcuts
            </div>
            <dl className="mt-2 space-y-1 text-[12px] text-inksoft">
              <div className="flex justify-between"><dt>Copy cadence Markdown</dt><dd><kbd className="rounded border border-staffline bg-paper px-1.5 font-mono text-[10.5px]">Ctrl/Cmd+S</kbd></dd></div>
              <div className="flex justify-between"><dt>Open this guide</dt><dd><kbd className="rounded border border-staffline bg-paper px-1.5 font-mono text-[10.5px]">?</kbd></dd></div>
              <div className="flex justify-between"><dt>Close panels</dt><dd><kbd className="rounded border border-staffline bg-paper px-1.5 font-mono text-[10.5px]">Esc</kbd></dd></div>
            </dl>
          </div>
        </aside>
      </div>

      {/* ---------- footer ---------- */}
      <footer className="cc-chrome mx-auto max-w-[1400px] px-4 pb-8 sm:px-6">
        <p className="border-t border-rule pt-4 text-center font-mono text-[10.5px] uppercase tracking-[0.2em] text-inkfaint">
          Cadence Composer · your data lives only in this browser · export JSON to back up
        </p>
      </footer>

      {/* ---------- help modal ---------- */}
      {helpOpen && (
        <div className="cc-chrome fixed inset-0 z-40 grid place-items-center bg-ink/50 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="How to use Cadence Composer"
          onClick={(e) => { if (e.target === e.currentTarget) setHelpOpen(false); }}>
          <div className="cc-rise max-h-[86vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-staffline bg-cardstock p-6 shadow-[var(--shadow-sheet)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-[22px] font-black tracking-tight">How to compose a cadence</h2>
                <p className="mt-1 text-[13px] italic text-inksoft">Seven bars, start to finish.</p>
              </div>
              <button onClick={() => setHelpOpen(false)} aria-label="Close help"
                className="rounded-md border border-staffline p-1.5 text-inksoft hover:bg-parchment focus-visible:outline-2 focus-visible:outline-brass">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <ol className="mt-4 space-y-3.5">
              {[
                ['Load the demo', 'Press "Load demo" to see two finished cadences — a 21-day new-logo score and a 14-day post-demo close. Study the pacing before writing your own.'],
                ['Start a cadence', 'Use "+" in the Cadence library. Name it after the motion ("Re-engage closed-lost Q2"), then write the Goal and Persona — every Copilot prompt uses them.'],
                ['Set exit rules first', 'Tick replied / booked / opted-out, and add a custom rule. The coda is what separates a cadence from spam.'],
                ['Place your touches', 'Add Email, Call, LinkedIn and SMS steps with the channel buttons. Each touch gets a day offset, a title, the actual message copy, and a playbook note (conditions, send windows).'],
                ['Read the rhythm view', 'The staff shows every touch as a note on its channel line across the day axis, with weekly barlines. Click a note to jump to its step. Watch the Channel-mix meter for warnings: long silences, all-email monotony, too-early SMS.'],
                ['Reorder and refine', 'Use the arrows to re-sequence, edit day offsets, and "sort by day" if the score falls out of tempo. Deleting anything offers a 7-second Undo.'],
                ['Ship it', 'Export: Copy Markdown (Ctrl/Cmd+S) for docs and Claude, CSV for your sequencer, JSON for backup. Then use the Copilot panel — copy a prompt into claude.ai, and paste the answer back into the notes area.'],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-brass/50 bg-brass/10 font-mono text-[12px] font-semibold text-brassdeep">{i + 1}</span>
                  <div>
                    <p className="font-display text-[14px] font-black leading-snug">{t}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-inksoft">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-5 rounded-xl border border-staffline bg-paper/60 p-3.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-inksoft">Keyboard</p>
              <div className="mt-2 grid grid-cols-1 gap-1.5 text-[12.5px] text-inksoft sm:grid-cols-3">
                <span><kbd className="rounded border border-staffline bg-cardstock px-1.5 font-mono text-[11px]">Ctrl/Cmd+S</kbd> copy Markdown</span>
                <span><kbd className="rounded border border-staffline bg-cardstock px-1.5 font-mono text-[11px]">?</kbd> this guide</span>
                <span><kbd className="rounded border border-staffline bg-cardstock px-1.5 font-mono text-[11px]">Esc</kbd> close panels</span>
              </div>
            </div>
            <button onClick={() => setHelpOpen(false)}
              className="mt-5 w-full rounded-lg bg-ink py-2.5 font-mono text-[12px] uppercase tracking-wider text-paper hover:bg-cocoa focus-visible:outline-2 focus-visible:outline-brass">
              Take the podium
            </button>
          </div>
        </div>
      )}

      {/* ---------- undo toast ---------- */}
      {toast && (
        <div className="cc-chrome fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
          <div className="cc-toast flex items-center gap-3 rounded-xl border border-ink/20 bg-ink px-4 py-2.5 text-paper shadow-[var(--shadow-sheet)]">
            <Music4 className="h-4 w-4 text-brass" aria-hidden />
            <span className="text-[13px]">{toast.msg}</span>
            {toast.undo && (
              <button onClick={() => { toast.undo(); setToast(null); }}
                className="inline-flex items-center gap-1 rounded-md bg-brass px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink hover:brightness-110 focus-visible:outline-2 focus-visible:outline-paper">
                <Undo2 className="h-3.5 w-3.5" aria-hidden /> Undo
              </button>
            )}
            <button onClick={() => setToast(null)} aria-label="Dismiss notification"
              className="rounded p-0.5 text-paper/60 hover:text-paper focus-visible:outline-2 focus-visible:outline-brass">
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {/* ---------- print sheet ---------- */}
      <div id="cc-print-sheet">
        {active && (
          <div>
            <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 900 }}>{active.name}</h1>
            {active.goal && <p><strong>Goal:</strong> {active.goal}</p>}
            {active.persona && <p><strong>Persona:</strong> {active.persona}</p>}
            <p><strong>Exit when:</strong> {[
              active.exitRules.replied && 'prospect replies',
              active.exitRules.booked && 'meeting booked',
              active.exitRules.optedOut && 'opt-out',
              active.exitRules.custom,
            ].filter(Boolean).join('; ') || 'no exit rules set'}</p>
            <hr />
            {active.steps.map((s, i) => (
              <div key={s.id} className="print-step" style={{ marginBottom: '14px' }}>
                <p style={{ fontWeight: 700 }}>
                  Step {i + 1} — Day {s.day} · {CHANNELS[s.channel].label}{s.title ? ` · ${s.title}` : ''}
                </p>
                {s.subject && <p><em>Subject:</em> {s.subject}</p>}
                {s.body && <p style={{ whiteSpace: 'pre-wrap' }}>{s.body}</p>}
                {s.note && <p style={{ fontStyle: 'italic' }}>Note: {s.note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
