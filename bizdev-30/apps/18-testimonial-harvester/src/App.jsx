import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Quote, Frame, Send, Inbox, GalleryVertical, MapPin, Sparkles,
  Copy, Check, Download, Upload, RotateCcw, HelpCircle, X, Plus, Trash2,
  ChevronRight, ChevronDown, PenLine, Undo2, FileJson, FileText, FileSpreadsheet,
  Keyboard, ClipboardPaste, Scale, LayoutGrid, ScrollText, Users,
  CircleDot, Printer, Lightbulb, Search, Link2
} from 'lucide-react';

/* ================================================================
   Testimonial Harvester — collect & deploy social proof
   World: gallery wall — warm plaster, museum labels, framed quotes.
   ================================================================ */

/* ---------------- BizDev Console bus (postMessage, v1) ----------------
   Standalone by default: if this app is not framed by the Console Deck,
   window.parent === window and nothing is sent or listened for. When
   framed, we announce readiness and wait for a context message; until
   one arrives (or if it never does) consoleCtx stays null and every
   consumer below treats that as "no console, behave exactly as usual". */
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
    try { window.parent.postMessage({ bizdev: 'ready', v: 1, slug: '18-testimonial-harvester' }, '*'); } catch {}
    return () => window.removeEventListener('message', onMsg);
  }, []);
  return ctx;
}

const LS_KEY = 'bizdev:18-testimonial-harvester:v1';

const uid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/* ---------------- domain constants ---------------- */

const STATUSES = [
  { id: 'shortlist', label: 'Shortlist', hint: 'Worth asking' },
  { id: 'asked', label: 'Ask sent', hint: 'Waiting politely' },
  { id: 'nudged', label: 'Nudged', hint: 'One gentle reminder' },
  { id: 'received', label: 'Received', hint: 'Words in hand' },
  { id: 'approved', label: 'Approved', hint: 'Rights cleared' },
  { id: 'published', label: 'On the wall', hint: 'Hung & deployed' },
];
const STATUS_IDS = STATUSES.map(s => s.id);

const STATUS_TONE = {
  shortlist: 'bg-linen text-umber',
  asked: 'bg-[#e8ddc2] text-[#6b5420]',
  nudged: 'bg-[#f0d9c4] text-oxide',
  received: 'bg-[#dfe7d8] text-[#44603a]',
  approved: 'bg-[#d6e4da] text-verdi',
  published: 'bg-ink text-gilt-pale',
};

const RELATIONSHIPS = [
  { id: 'longtime', label: 'Longtime client' },
  { id: 'fresh', label: 'Just-wrapped project' },
  { id: 'partner', label: 'Partner / collaborator' },
  { id: 'peer', label: 'Peer / colleague' },
];

const CHANNELS = ['Email', 'LinkedIn DM', 'Call', 'In person', 'Video ask'];

const FRAMES = [
  { id: 'gilt', label: 'Gilt' },
  { id: 'walnut', label: 'Walnut' },
  { id: 'gallery', label: 'Gallery black' },
  { id: 'float', label: 'Float white' },
];

const RIGHTS_ITEMS = [
  { id: 'useName', label: 'Use full name' },
  { id: 'useCompany', label: 'Name the company' },
  { id: 'useTitle', label: 'Use role / title' },
  { id: 'useLogo', label: 'Show their logo' },
  { id: 'editsApproved', label: 'Edited wording approved' },
  { id: 'chWebsite', label: 'OK for website' },
  { id: 'chSocial', label: 'OK for social posts' },
  { id: 'chSales', label: 'OK for proposals & ads' },
];

const DEFAULT_SCRIPTS = {
  longtime:
`Subject: A small favor (2 minutes, big for me)

Hi {{first_name}},

We've worked together for a while now, and {{company}} is honestly the kind of client story I wish more people could hear.

Would you be open to a short testimonial? Two or three sentences is plenty — what problem we tackled, what changed, and what you'd tell someone considering working with me.

If it's easier, reply to these three prompts and I'll draft something for your approval:
1. Where were things before we started?
2. What result mattered most? ({{result_hint}})
3. What would you say to someone on the fence?

You approve every word before it appears anywhere. Thanks either way, truly.

{{my_name}}`,
  fresh:
`Subject: While {{project}} is still warm

Hi {{first_name}},

Now that {{project}} is wrapped, and while the results are fresh ({{result_hint}}), could I ask a small favor?

A two-sentence testimonial would mean a lot: the situation before, and what changed after. Rough and unpolished is perfect — I'll tidy it up and send it back for your sign-off before it goes anywhere.

If it's simpler, just reply with a voice-note-style ramble and I'll shape it.

Thanks for being a great partner on this one.

{{my_name}}`,
  partner:
`Subject: Trading proof?

Hey {{first_name}},

Idea: we've sent each other real results this year. Want to trade testimonials? I'll write one for {{company}} you can use anywhere, and if you're up for it, a couple of sentences about working with me.

What's most useful on my side: who you'd recommend me to, and why. ({{result_hint}})

Happy to draft both so it costs you 90 seconds. Deal?

{{my_name}}`,
  peer:
`Subject: A sentence for my wall?

Hi {{first_name}},

You've seen my work up close — {{project}} in particular. I'm collecting a few short quotes from people whose judgment I trust.

Would you write 1–2 sentences on what it's like to work with me, or what you'd tell someone considering it? ({{result_hint}})

You'll approve final wording, and I'm glad to return the favor any time.

{{my_name}}`,
};

/* ---------------- normalize & persistence ---------------- */

const str = (v, d = '') => (typeof v === 'string' ? v : d);
const bool = v => v === true;

function normalizeAsk(raw) {
  const a = raw && typeof raw === 'object' ? raw : {};
  const rights = a.rights && typeof a.rights === 'object' ? a.rights : {};
  return {
    id: str(a.id) || uid(),
    name: str(a.name),
    role: str(a.role),
    company: str(a.company),
    relationship: RELATIONSHIPS.some(r => r.id === a.relationship) ? a.relationship : 'fresh',
    channel: CHANNELS.includes(a.channel) ? a.channel : 'Email',
    status: STATUS_IDS.includes(a.status) ? a.status : 'shortlist',
    askedOn: str(a.askedOn),
    project: str(a.project),
    resultHint: str(a.resultHint),
    notes: str(a.notes),
    quote: str(a.quote),
    frame: FRAMES.some(f => f.id === a.frame) ? a.frame : 'gilt',
    rights: Object.fromEntries(RIGHTS_ITEMS.map(r => [r.id, bool(rights[r.id])])),
  };
}

function normalizePlacement(raw) {
  const p = raw && typeof raw === 'object' ? raw : {};
  return {
    id: str(p.id) || uid(),
    page: str(p.page),
    goal: str(p.goal),
    askId: str(p.askId, '') || null,
    live: bool(p.live),
  };
}

function normalize(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const scripts = s.scripts && typeof s.scripts === 'object' ? s.scripts : {};
  return {
    asks: Array.isArray(s.asks) ? s.asks.map(normalizeAsk) : [],
    placements: Array.isArray(s.placements) ? s.placements.map(normalizePlacement) : [],
    scripts: Object.fromEntries(
      RELATIONSHIPS.map(r => [r.id, str(scripts[r.id]) || DEFAULT_SCRIPTS[r.id]])
    ),
    myName: str(s.myName, 'Alex Rivera'),
    copilotNotes: str(s.copilotNotes),
    seenGuide: bool(s.seenGuide),
  };
}

function loadState() {
  try {
    return normalize(JSON.parse(localStorage.getItem(LS_KEY) || 'null'));
  } catch {
    return normalize(null);
  }
}

/* ---------------- demo data ---------------- */

const DEMO = normalize({
  myName: 'Alex Rivera',
  asks: [
    {
      id: 'd1', name: 'Maya Chen', role: 'VP Marketing', company: 'Northbeam Analytics',
      relationship: 'fresh', channel: 'Email', status: 'published', askedOn: '2026-06-12',
      project: 'the positioning sprint', resultHint: 'demo requests up 40% in 6 weeks',
      quote: 'Alex rewrote our story in three weeks. Demo requests are up 40% and, for the first time, prospects arrive already understanding what we do.',
      frame: 'gilt',
      rights: { useName: true, useCompany: true, useTitle: true, useLogo: true, editsApproved: true, chWebsite: true, chSocial: true, chSales: true },
      notes: 'Loves the before/after framing. Offered to do a video version in Q3.',
    },
    {
      id: 'd2', name: 'Tomás Ferreira', role: 'Founder', company: 'Ledgerline',
      relationship: 'longtime', channel: 'Call', status: 'approved', askedOn: '2026-06-20',
      project: 'three launch campaigns', resultHint: 'CAC down 28% year over year',
      quote: 'Three launches together and every one beat the last. Alex is the only consultant whose invoices I never question — CAC is down 28% since we started.',
      frame: 'walnut',
      rights: { useName: true, useCompany: true, useTitle: true, useLogo: false, editsApproved: true, chWebsite: true, chSocial: true, chSales: false },
      notes: 'No logo use — brand team is strict. Fine with everything else.',
    },
    {
      id: 'd3', name: 'Priya Nair', role: 'Head of Sales', company: 'Quartzwork CRM',
      relationship: 'fresh', channel: 'LinkedIn DM', status: 'received', askedOn: '2026-07-02',
      project: 'the outbound revamp', resultHint: 'reply rate 3.1% to 9.8%',
      quote: 'So basically we were sending a lot of emails and nothing was landing, and then Alex came in and honestly I was skeptical at first but the new sequences just worked, reply rates tripled or more, I think it went from about 3 percent to almost 10, and the team actually enjoys writing outbound now which I never thought I would say.',
      frame: 'gallery',
      rights: { useName: true, useCompany: false, useTitle: true, useLogo: false, editsApproved: false, chWebsite: true, chSocial: false, chSales: false },
      notes: 'Rambly but gold. Needs an ethical tighten + her approval. Ask about naming Quartzwork.',
    },
    {
      id: 'd4', name: 'Jordan Okafor', role: 'COO', company: 'Brightside Logistics',
      relationship: 'longtime', channel: 'Email', status: 'nudged', askedOn: '2026-06-25',
      project: 'the pricing overhaul', resultHint: 'avg deal size +22%',
      quote: '', frame: 'float',
      rights: {},
      notes: 'Replied "happy to!" then went quiet. Nudged July 10. Try the 3-prompt version next.',
    },
    {
      id: 'd5', name: 'Sofia Marchetti', role: 'CEO', company: 'Fieldnote Studio',
      relationship: 'partner', channel: 'In person', status: 'asked', askedOn: '2026-07-14',
      project: 'the co-marketing webinar', resultHint: '212 registrants, 31 SQLs between us',
      quote: '', frame: 'gilt',
      rights: {},
      notes: 'Proposed a testimonial swap over coffee. She was in — send draft of hers first.',
    },
    {
      id: 'd6', name: 'Dev Batra', role: 'Product Lead', company: 'Canopy Health',
      relationship: 'peer', channel: 'Email', status: 'shortlist', askedOn: '',
      project: 'the advisory sessions', resultHint: 'shipped repositioning 2 months early',
      quote: '', frame: 'walnut',
      rights: {},
      notes: 'Great candidate for a credibility quote aimed at health-tech ICP.',
    },
    {
      id: 'd7', name: 'Hana Yoshida', role: 'Growth Manager', company: 'Reeftide',
      relationship: 'fresh', channel: 'Video ask', status: 'approved', askedOn: '2026-05-30',
      project: 'the onboarding email rebuild', resultHint: 'activation +18%',
      quote: 'We handed Alex a leaky onboarding flow and got back a machine. Activation is up 18% and the emails finally sound like us — only better.',
      frame: 'float',
      rights: { useName: true, useCompany: true, useTitle: true, useLogo: true, editsApproved: true, chWebsite: true, chSocial: true, chSales: true },
      notes: 'Full rights. Cheerful on camera — candidate for a video wall later.',
    },
  ],
  placements: [
    { id: 'p1', page: 'Homepage hero', goal: 'Instant credibility above the fold', askId: 'd1', live: true },
    { id: 'p2', page: 'Pricing page', goal: 'De-risk the top tier', askId: 'd2', live: false },
    { id: 'p3', page: 'Proposal template, page 2', goal: 'Proof next to the offer', askId: 'd7', live: true },
    { id: 'p4', page: 'LinkedIn featured section', goal: 'Warm inbound before the call', askId: null, live: false },
    { id: 'p5', page: 'Cold email P.S. line', goal: 'One-line proof in outreach', askId: null, live: false },
  ],
  copilotNotes: '',
  seenGuide: true,
});

/* ---------------- serialization ---------------- */

const rightsSummary = a => {
  const on = RIGHTS_ITEMS.filter(r => a.rights[r.id]).map(r => r.label);
  return on.length ? on.join(', ') : 'none granted yet';
};
const attribution = a => {
  const parts = [a.rights.useName ? a.name : 'Anonymous'];
  if (a.rights.useTitle && a.role) parts.push(a.role);
  if (a.rights.useCompany && a.company) parts.push(a.company);
  return parts.join(', ');
};
const statusLabel = id => (STATUSES.find(s => s.id === id) || {}).label || id;

function stateToMarkdown(state) {
  const wall = state.asks.filter(a => a.quote.trim());
  const lines = [];
  lines.push('# Proof Wall — Testimonial Harvester');
  lines.push('');
  lines.push(`_${wall.length} testimonial(s) collected · ${state.asks.length} people in the ask pipeline · exported ${new Date().toISOString().slice(0, 10)}_`);
  lines.push('');
  lines.push('## The wall');
  lines.push('');
  if (!wall.length) lines.push('*(no testimonials collected yet)*');
  wall.forEach(a => {
    lines.push(`> "${a.quote.trim()}"`);
    lines.push(`> — **${attribution(a)}** · status: ${statusLabel(a.status)}`);
    lines.push(`>   rights: ${rightsSummary(a)}`);
    lines.push('');
  });
  lines.push('## Ask pipeline');
  lines.push('');
  lines.push('| Person | Company | Relationship | Channel | Status | Asked on |');
  lines.push('|---|---|---|---|---|---|');
  state.asks.forEach(a => {
    const rel = (RELATIONSHIPS.find(r => r.id === a.relationship) || {}).label || a.relationship;
    lines.push(`| ${a.name || '—'} | ${a.company || '—'} | ${rel} | ${a.channel} | ${statusLabel(a.status)} | ${a.askedOn || '—'} |`);
  });
  lines.push('');
  lines.push('## Placement plan');
  lines.push('');
  lines.push('| Placement | Goal | Quote assigned | Live |');
  lines.push('|---|---|---|---|');
  state.placements.forEach(p => {
    const a = state.asks.find(x => x.id === p.askId);
    lines.push(`| ${p.page || '—'} | ${p.goal || '—'} | ${a ? a.name : '(unassigned)'} | ${p.live ? 'yes' : 'planned'} |`);
  });
  lines.push('');
  return lines.join('\n');
}

function asksToCSV(asks) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['name', 'role', 'company', 'relationship', 'channel', 'status', 'askedOn', 'project', 'quote', 'rights', 'notes'];
  const rows = asks.map(a => [
    a.name, a.role, a.company,
    (RELATIONSHIPS.find(r => r.id === a.relationship) || {}).label || a.relationship,
    a.channel, statusLabel(a.status), a.askedOn, a.project, a.quote, rightsSummary(a), a.notes,
  ].map(esc).join(','));
  return [head.join(','), ...rows].join('\n');
}

function mergeScript(template, ask, myName) {
  const first = (ask.name || 'there').split(' ')[0];
  return template
    .replace(/\{\{first_name\}\}/g, first)
    .replace(/\{\{company\}\}/g, ask.company || 'your company')
    .replace(/\{\{project\}\}/g, ask.project || 'our recent project')
    .replace(/\{\{result_hint\}\}/g, ask.resultHint || 'the result you noticed most')
    .replace(/\{\{my_name\}\}/g, myName || 'Me');
}

/* ---------------- console context (BizDev Console bus) ---------------- */

function consoleContextBlock(ctx) {
  if (!ctx) return '';
  const profile = (ctx.profile && typeof ctx.profile === 'object') ? ctx.profile : {};
  const claude = (ctx.claude && typeof ctx.claude === 'object') ? ctx.claude : {};
  const roster = (ctx.roster && typeof ctx.roster === 'object') ? ctx.roster : {};
  const lines = [];
  if (profile.company) lines.push(`- My company: ${profile.company}`);
  if (profile.offer) lines.push(`- What I sell: ${profile.offer}`);
  if (profile.icp) lines.push(`- My ICP: ${profile.icp}`);
  if (profile.pricingAnchor) lines.push(`- Pricing anchor: ${profile.pricingAnchor}`);
  if (claude.userName || claude.voiceNotes) {
    lines.push(`- My name / voice: ${claude.userName || ''} — ${claude.voiceNotes || ''}`);
  }
  if (Array.isArray(roster.accounts) && roster.accounts.length) {
    const list = roster.accounts.slice(0, 12)
      .map(a => `${a.name}${a.segment ? ` (${a.segment})` : ''}`)
      .join(', ');
    lines.push(`- Accounts on file: ${list}`);
  }
  if (!lines.length) return '';
  return `## Shared context (from BizDev Console)\n${lines.join('\n')}\n\n`;
}

const withConsoleContext = (ctx, prompt) => consoleContextBlock(ctx) + prompt;

/* ---------------- copilot prompt builders ---------------- */

function askContextMd(a) {
  const rel = (RELATIONSHIPS.find(r => r.id === a.relationship) || {}).label;
  return [
    `- **Name:** ${a.name || '(unnamed)'} — ${a.role || 'role unknown'}${a.company ? `, ${a.company}` : ''}`,
    `- **Relationship:** ${rel} · **Channel:** ${a.channel} · **Status:** ${statusLabel(a.status)}`,
    `- **Project:** ${a.project || '(not recorded)'}`,
    `- **Result worth citing:** ${a.resultHint || '(not recorded)'}`,
    `- **My notes:** ${a.notes || '(none)'}`,
    a.quote.trim() ? `- **Raw testimonial on file:** "${a.quote.trim()}"` : '- **Raw testimonial on file:** none yet',
  ].join('\n');
}

function buildAskPrompt(state, ask) {
  const script = mergeScript(state.scripts[ask.relationship], ask, state.myName);
  return `You are a senior B2B relationship strategist who writes warm, zero-cringe testimonial requests that get replies without straining the relationship.

## Who I'm asking
${askContextMd(ask)}

## My current draft script (${(RELATIONSHIPS.find(r => r.id === ask.relationship) || {}).label} template)
\`\`\`
${script}
\`\`\`

## The ask
Rewrite this request specifically for this person. Requirements:
1. Reference our actual shared work and the concrete result above — no generic flattery.
2. Keep it under 120 words for ${ask.channel === 'LinkedIn DM' ? 'a LinkedIn DM (casual, no subject line)' : ask.channel.toLowerCase()}.
3. Make the ask effortless: offer the "answer 3 prompts and I'll draft it for your approval" path.
4. Make refusing feel completely safe — no guilt mechanics.
5. Match the closeness of a "${(RELATIONSHIPS.find(r => r.id === ask.relationship) || {}).label}" relationship.

## Output format
1. The personalized message, ready to send.
2. A one-line P.S. variant I can add if they've gone quiet before.
3. Two sentences on WHY you framed it this way, so I learn the pattern.`;
}

function buildPolishPrompt(state, ask) {
  return `You are an editor who tightens customer testimonials ETHICALLY: you may cut, reorder, and smooth grammar, but you must never invent facts, inflate numbers, or put words in the customer's mouth. The customer will approve the final wording.

## The raw testimonial
From ${ask.name || 'a client'}${ask.role ? ` (${ask.role}${ask.company ? `, ${ask.company}` : ''})` : ''}:

> "${ask.quote.trim() || '(paste the raw testimonial into the app first)'}"

Context: we worked on ${ask.project || 'a project'}; the result they cited: ${ask.resultHint || 'see quote'}.

## The ask
1. Produce THREE faithful tightenings, each preserving their voice and every factual claim:
   - **Wall version** (25–40 words) — punchy, leads with the outcome.
   - **One-liner** (max 15 words) — for a homepage or email signature.
   - **Long version** (60–90 words) — for a case-study sidebar.
2. Flag anything you removed that changed meaning, and anything I should verify with them.
3. Draft a 3-sentence approval message I can send: "here's a tightened version — OK to use?" with the wall version embedded.

## Output format
Markdown with the three versions as blockquotes, then "What changed", then the approval message.`;
}

function buildCastPrompt(state, placement) {
  const candidates = state.asks.filter(a => a.quote.trim() && ['received', 'approved', 'published'].includes(a.status));
  const cand = candidates.length
    ? candidates.map(a => `### ${a.name} — ${a.role}${a.company ? `, ${a.company}` : ''} (status: ${statusLabel(a.status)})\n> "${a.quote.trim()}"\n\nRights granted: ${rightsSummary(a)}`).join('\n\n')
    : '*(no collected testimonials yet — I need to harvest first)*';
  return `You are a conversion copywriter choosing social proof for a specific placement. Proof works when it answers the exact doubt a visitor has at that moment on that page.

## The placement
- **Where:** ${placement ? placement.page : '(pick a placement in the app)'}
- **Job of the proof there:** ${placement && placement.goal ? placement.goal : 'not specified — infer from the placement'}

## My collected testimonials
${cand}

## My placement plan (for context)
${state.placements.map(p => {
    const a = state.asks.find(x => x.id === p.askId);
    return `- ${p.page} — ${p.goal || 'no goal set'} — currently: ${a ? `"${a.name}"` : 'unassigned'} (${p.live ? 'live' : 'planned'})`;
  }).join('\n') || '- (no placements yet)'}

## The ask
1. Pick the single best quote for this placement and defend the choice in 2–3 sentences (what doubt it neutralizes there).
2. Say which SENTENCE of it to feature if space is tight.
3. Warn me if the rights granted don't cover this placement.
4. Suggest the runner-up and where IT should go instead, so no strong quote is wasted.

## Output format
"**Winner:**" then the quote, "**Why:**", "**Rights check:**", "**Runner-up:**".`;
}

function buildCoveragePrompt(state) {
  return `You are a social-proof strategist auditing my testimonial program for gaps.

## Pipeline snapshot
${state.asks.map(a => `- ${a.name || '(unnamed)'} (${a.role || '?'}${a.company ? `, ${a.company}` : ''}) — ${(RELATIONSHIPS.find(r => r.id === a.relationship) || {}).label} — ${statusLabel(a.status)}${a.quote.trim() ? ' — quote on file' : ''}`).join('\n') || '- (empty pipeline)'}

## Collected quotes
${state.asks.filter(a => a.quote.trim()).map(a => `> "${a.quote.trim()}" — ${a.name}`).join('\n\n') || '*(none yet)*'}

## Placement plan
${state.placements.map(p => {
    const a = state.asks.find(x => x.id === p.askId);
    return `- ${p.page}: ${a ? 'covered by ' + a.name : 'EMPTY'} (${p.live ? 'live' : 'planned'})`;
  }).join('\n') || '- (no placements planned)'}

## The ask
1. Diagnose my proof coverage: which buyer doubts, industries, and result types are over- or under-represented?
2. Identify the 3 highest-leverage asks to make next (from my shortlist or types of people I should add).
3. Point out any quote that is doing a job it's weak at, and any empty placement that matters most.
4. Give me one specific action for this week.

## Output format
Four short sections with headers matching the four asks. Be direct; no praise padding.`;
}

/* ================================================================
   Small building blocks
   ================================================================ */

function IconBtn({ label, onClick, children, className = '', title }) {
  return (
    <button type="button" aria-label={label} title={title || label} onClick={onClick}
      className={'inline-flex items-center justify-center rounded p-1.5 text-umber hover:text-ink hover:bg-linen/70 transition-colors ' + className}>
      {children}
    </button>
  );
}

function Btn({ onClick, children, kind = 'ghost', className = '', ...rest }) {
  const kinds = {
    primary: 'bg-ink text-gesso hover:bg-night border border-ink shadow-[0_2px_0_rgba(43,33,24,.35)]',
    gilt: 'bg-gilt text-gesso hover:bg-gilt-deep border border-gilt-deep shadow-[0_2px_0_rgba(125,90,28,.4)]',
    ghost: 'bg-gesso/70 text-ink hover:bg-gesso border border-ink/20',
    danger: 'bg-gesso/70 text-oxide hover:bg-[#f6e4dc] border border-oxide/30',
  };
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[13px] font-semibold tracking-wide transition-colors ${kinds[kind]} ${className}`}
      {...rest}>
      {children}
    </button>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <label className={'block ' + className}>
      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-umber mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputCls = 'w-full rounded-sm border border-ink/20 bg-gesso px-2.5 py-1.5 text-[13px] text-ink placeholder:text-faded focus:border-gilt';

function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-night/50 p-4 pt-[6vh] anim-fade" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}
        className={`anim-rise w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-sm border border-ink/25 bg-gesso shadow-hang`}
        style={{ boxShadow: 'var(--shadow-hang)' }}>
        <div className="flex items-center justify-between border-b-2 border-double border-ink/20 px-5 py-3">
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          <IconBtn label="Close dialog" onClick={onClose}><X size={18} /></IconBtn>
        </div>
        <div className="max-h-[72vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Ico, title, children }) {
  return (
    <div className="anim-rise rounded-sm border border-dashed border-umber/40 bg-gesso/50 px-6 py-10 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-umber/30 bg-plaster text-umber">
        <Ico size={22} />
      </div>
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      <div className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-umber">{children}</div>
    </div>
  );
}

/* copy hook */
function useCopy() {
  const [copied, setCopied] = useState('');
  const timer = useRef(null);
  const copy = useCallback(async (text, tag = 'x') => {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; }
    catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch { ok = false; }
    }
    if (ok) {
      setCopied(tag);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(''), 1800);
    }
    return ok;
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [copied, copy];
}

/* ---------------- SVG: gallery hero ---------------- */

function GalleryHero({ stats }) {
  return (
    <svg viewBox="0 0 760 218" role="img" aria-label="Gallery wall with framed testimonials"
      className="h-auto w-full max-w-[760px]">
      <defs>
        <linearGradient id="giltG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e9d49c" /><stop offset=".35" stopColor="#a97e2f" />
          <stop offset=".6" stopColor="#d9bd7d" /><stop offset="1" stopColor="#7d5a1c" />
        </linearGradient>
        <linearGradient id="walG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6a4b30" /><stop offset=".5" stopColor="#33220f" /><stop offset="1" stopColor="#5d422c" />
        </linearGradient>
        <linearGradient id="blkG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#322b23" /><stop offset="1" stopColor="#14100c" />
        </linearGradient>
        <radialGradient id="spot" cx=".5" cy="0" r="1">
          <stop offset="0" stopColor="#fff8e6" stopOpacity=".9" />
          <stop offset=".7" stopColor="#fff8e6" stopOpacity="0" />
        </radialGradient>
        <filter id="soft" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#2b2118" floodOpacity="0.30" />
        </filter>
      </defs>

      {/* picture rail */}
      <rect x="0" y="8" width="760" height="4" fill="#71614e" opacity=".55" />
      <rect x="0" y="13" width="760" height="1.5" fill="#fffdf6" opacity=".8" />

      {/* spotlights */}
      <ellipse cx="180" cy="30" rx="150" ry="150" fill="url(#spot)" opacity=".8" />
      <ellipse cx="420" cy="24" rx="170" ry="170" fill="url(#spot)" />
      <ellipse cx="632" cy="30" rx="140" ry="140" fill="url(#spot)" opacity=".7" />

      {/* wires */}
      <g stroke="#71614e" strokeWidth="1.4" opacity=".75">
        <line x1="180" y1="12" x2="128" y2="72" /><line x1="180" y1="12" x2="232" y2="72" />
        <line x1="420" y1="12" x2="352" y2="52" /><line x1="420" y1="12" x2="488" y2="52" />
        <line x1="632" y1="12" x2="586" y2="84" /><line x1="632" y1="12" x2="678" y2="84" />
      </g>
      <circle cx="180" cy="12" r="3.4" fill="#a97e2f" /><circle cx="420" cy="12" r="3.4" fill="#a97e2f" /><circle cx="632" cy="12" r="3.4" fill="#a97e2f" />

      {/* left frame — walnut */}
      <g filter="url(#soft)">
        <rect x="118" y="70" width="124" height="96" rx="3" fill="url(#walG)" />
        <rect x="128" y="80" width="104" height="76" fill="#fffdf6" />
        <text x="141" y="118" fontFamily="Fraunces, serif" fontSize="34" fontWeight="900" fill="#a97e2f">&#8220;</text>
        <rect x="140" y="122" width="66" height="3.5" rx="1.5" fill="#d8cdb6" />
        <rect x="140" y="131" width="80" height="3.5" rx="1.5" fill="#d8cdb6" />
        <rect x="140" y="140" width="52" height="3.5" rx="1.5" fill="#e6ddc9" />
      </g>

      {/* center frame — gilt, larger */}
      <g filter="url(#soft)">
        <rect x="344" y="48" width="152" height="118" rx="3" fill="url(#giltG)" />
        <rect x="349" y="53" width="142" height="108" rx="2" fill="none" stroke="#7d5a1c" strokeWidth="1.4" />
        <rect x="357" y="61" width="126" height="92" fill="#fffdf6" />
        <text x="371" y="102" fontFamily="Fraunces, serif" fontSize="42" fontWeight="900" fill="#a13d1e">&#8220;</text>
        <rect x="371" y="108" width="86" height="4" rx="2" fill="#cfc3a9" />
        <rect x="371" y="118" width="98" height="4" rx="2" fill="#cfc3a9" />
        <rect x="371" y="128" width="64" height="4" rx="2" fill="#e0d7c2" />
        <rect x="371" y="140" width="44" height="3" rx="1.5" fill="#a97e2f" />
      </g>

      {/* right frame — gallery black */}
      <g filter="url(#soft)">
        <rect x="580" y="82" width="104" height="84" rx="3" fill="url(#blkG)" />
        <rect x="589" y="91" width="86" height="66" fill="#fffdf6" />
        <text x="600" y="124" fontFamily="Fraunces, serif" fontSize="30" fontWeight="900" fill="#3e6b53">&#8220;</text>
        <rect x="600" y="128" width="52" height="3" rx="1.5" fill="#d8cdb6" />
        <rect x="600" y="136" width="62" height="3" rx="1.5" fill="#e6ddc9" />
      </g>

      {/* museum labels under frames */}
      <g fontFamily="Lora, serif">
        <rect x="146" y="176" width="68" height="20" rx="1.5" fill="#fffdf6" stroke="#2b2118" strokeOpacity=".18" />
        <text x="180" y="189" textAnchor="middle" fontSize="8.5" fontStyle="italic" fill="#71614e">{stats.received} received</text>
        <rect x="380" y="176" width="80" height="20" rx="1.5" fill="#fffdf6" stroke="#2b2118" strokeOpacity=".18" />
        <text x="420" y="189" textAnchor="middle" fontSize="8.5" fontStyle="italic" fill="#71614e">{stats.approved} approved</text>
        <rect x="596" y="176" width="72" height="20" rx="1.5" fill="#fffdf6" stroke="#2b2118" strokeOpacity=".18" />
        <text x="632" y="189" textAnchor="middle" fontSize="8.5" fontStyle="italic" fill="#71614e">{stats.published} on the wall</text>
      </g>

      {/* floor line */}
      <rect x="0" y="212" width="760" height="1.5" fill="#71614e" opacity=".3" />
    </svg>
  );
}

/* ---------------- SVG: pipeline funnel meter ---------------- */

function FunnelMeter({ asks }) {
  const counts = STATUSES.map(s => asks.filter(a => a.status === s.id).length);
  const max = Math.max(1, ...counts);
  const W = 640, H = 92, pad = 6;
  const bw = (W - pad * 2) / STATUSES.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ask pipeline by stage" className="h-auto w-full">
      <line x1={pad} y1={H - 26} x2={W - pad} y2={H - 26} stroke="#71614e" strokeOpacity=".45" strokeWidth="1" />
      {STATUSES.map((s, i) => {
        const h = 8 + (counts[i] / max) * 42;
        const x = pad + i * bw;
        const isEnd = i === 0 || i === STATUSES.length - 1;
        return (
          <g key={s.id}>
            <rect x={x + bw * 0.18} y={H - 26 - h} width={bw * 0.64} height={h} rx="2"
              fill={i >= 4 ? '#3e6b53' : i >= 3 ? '#7fa08a' : '#c9b98f'}
              stroke={isEnd ? '#a97e2f' : 'none'} strokeWidth={isEnd ? 1.6 : 0} />
            <text x={x + bw / 2} y={H - 32 - h} textAnchor="middle" fontSize="13" fontWeight="700"
              fontFamily="Fraunces, serif" fill="#2b2118">{counts[i]}</text>
            <line x1={x + bw / 2} y1={H - 26} x2={x + bw / 2} y2={H - 22} stroke="#71614e" strokeWidth="1" />
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="9.5" fill="#71614e"
              style={{ letterSpacing: '0.06em' }}>{s.label.toUpperCase()}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* rights donut */
function RightsRing({ ask, size = 34 }) {
  const total = RIGHTS_ITEMS.length;
  const on = RIGHTS_ITEMS.filter(r => ask.rights[r.id]).length;
  const r = size / 2 - 4, c = 2 * Math.PI * r, frac = on / total;
  return (
    <div className="flex items-center gap-1.5" title={`${on} of ${total} rights granted`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${on} of ${total} rights granted`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eae1cf" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={frac === 1 ? '#3e6b53' : frac > 0.5 ? '#a97e2f' : '#a13d1e'}
          strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${c * frac} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fontSize={size * 0.3}
          fontFamily="Fraunces, serif" fontWeight="700" fill="#2b2118">{on}</text>
      </svg>
      <span className="text-[10px] uppercase tracking-wider text-umber">/{total} rights</span>
    </div>
  );
}

function StatusPill({ status, onClick, title }) {
  return (
    <button type="button" onClick={onClick} title={title || 'Advance status'}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide transition-transform hover:scale-[1.04] ${STATUS_TONE[status]}`}>
      <CircleDot size={11} />
      {statusLabel(status)}
    </button>
  );
}

/* framed quote card for the wall */
function FramedQuote({ ask, onFrame, compact = false }) {
  return (
    <figure className={`q-frame frame-${ask.frame}`}>
      <div className="q-mat px-5 pb-4 pt-5">
        <Quote size={compact ? 16 : 20} className="mb-2 rotate-180 text-gilt" aria-hidden="true" />
        <blockquote className={`font-body italic leading-relaxed text-ink ${compact ? 'text-[13px]' : 'text-[15px]'}`}>
          {ask.quote.trim()}
        </blockquote>
        <figcaption className="mt-3 border-t border-ink/10 pt-2">
          <div className="font-display text-[13px] font-semibold text-ink">{attribution(ask)}</div>
          {ask.project ? <div className="text-[11px] italic text-umber">{ask.project}</div> : null}
        </figcaption>
      </div>
      {onFrame ? (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
          <select aria-label={`Frame style for ${ask.name || 'testimonial'}`} value={ask.frame}
            onChange={e => onFrame(e.target.value)}
            className="museum-label cursor-pointer px-1.5 py-0.5 text-[10px] italic text-umber">
            {FRAMES.map(f => <option key={f.id} value={f.id}>{f.label} frame</option>)}
          </select>
        </div>
      ) : null}
    </figure>
  );
}

/* ================================================================
   Main App
   ================================================================ */

export default function App() {
  const consoleCtx = useConsoleBus();
  const [state, setState] = useState(loadState);
  const [tab, setTab] = useState('pipeline');
  const [modal, setModal] = useState(() => (loadState().seenGuide ? null : 'help'));
  const [toast, setToast] = useState(null); // {msg, undo?}
  const [expanded, setExpanded] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [copied, copy] = useCopy();
  const toastTimer = useRef(null);
  const fileRef = useRef(null);

  /* autosave (debounced) */
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* full/blocked */ }
    }, 350);
    return () => clearTimeout(t);
  }, [state]);

  const showToast = useCallback((msg, undo = null, ms = 7000) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), ms);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const patch = fn => setState(s => normalize(fn(s)));
  const patchAsk = (id, up) => patch(s => ({ ...s, asks: s.asks.map(a => a.id === id ? { ...a, ...up } : a) }));
  const patchPlacement = (id, up) => patch(s => ({ ...s, placements: s.placements.map(p => p.id === id ? { ...p, ...up } : p) }));

  const deleteAsk = id => {
    const idx = state.asks.findIndex(a => a.id === id);
    if (idx < 0) return;
    const removed = state.asks[idx];
    patch(s => ({ ...s, asks: s.asks.filter(a => a.id !== id), placements: s.placements.map(p => p.askId === id ? { ...p, askId: null } : p) }));
    showToast(`Removed ${removed.name || 'entry'} from the pipeline.`, () => {
      patch(s => ({ ...s, asks: [...s.asks.slice(0, idx), removed, ...s.asks.slice(idx)] }));
      setToast(null);
    });
  };

  const deletePlacement = id => {
    const idx = state.placements.findIndex(p => p.id === id);
    if (idx < 0) return;
    const removed = state.placements[idx];
    patch(s => ({ ...s, placements: s.placements.filter(p => p.id !== id) }));
    showToast(`Removed placement "${removed.page || 'untitled'}".`, () => {
      patch(s => ({ ...s, placements: [...s.placements.slice(0, idx), removed, ...s.placements.slice(idx)] }));
      setToast(null);
    });
  };

  const addAsk = () => {
    const a = normalizeAsk({ id: uid(), status: 'shortlist' });
    patch(s => ({ ...s, asks: [a, ...s.asks] }));
    setExpanded(a.id);
    setStatusFilter('all');
    setTab('pipeline');
  };

  const addAskFromRoster = account => {
    const a = normalizeAsk({
      id: uid(),
      status: 'shortlist',
      company: account.name || '',
      notes: ['Pulled from console roster', account.segment ? `segment: ${account.segment}` : '', account.notes || '']
        .filter(Boolean).join(' · '),
    });
    patch(s => ({ ...s, asks: [a, ...s.asks] }));
    setExpanded(a.id);
    setStatusFilter('all');
    setTab('pipeline');
  };

  const addPlacement = () => {
    const p = normalizePlacement({ id: uid() });
    patch(s => ({ ...s, placements: [...s.placements, p] }));
  };

  const advanceStatus = a => {
    const i = STATUS_IDS.indexOf(a.status);
    const next = STATUS_IDS[(i + 1) % STATUS_IDS.length];
    patchAsk(a.id, { status: next, askedOn: next === 'asked' && !a.askedOn ? new Date().toISOString().slice(0, 10) : a.askedOn });
  };

  const loadDemo = () => {
    patch(s => ({ ...DEMO, seenGuide: s.seenGuide, copilotNotes: s.copilotNotes }));
    showToast('Demo gallery hung: 7 asks, 4 quotes, 5 placements.', null, 5000);
  };

  const doReset = () => {
    patch(s => normalize({ seenGuide: s.seenGuide }));
    setModal(null);
    showToast('Wall cleared. Fresh plaster.', null, 5000);
  };

  const copyMarkdown = useCallback(() => {
    copy(stateToMarkdown(state), 'md').then(ok => ok && showToast('Proof wall copied as Markdown.', null, 3500));
  }, [state, copy, showToast]);

  const downloadFile = (name, text, type) => {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 800);
  };

  const importJSON = file => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = normalize(JSON.parse(String(reader.result)));
        setState(next);
        setModal(null);
        showToast(`Imported ${next.asks.length} asks and ${next.placements.length} placements.`, null, 4500);
      } catch {
        showToast('That file did not parse as Testimonial Harvester JSON.', null, 5000);
      }
    };
    reader.readAsText(file);
  };

  /* keyboard */
  useEffect(() => {
    const onKey = e => {
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault(); copyMarkdown(); return;
      }
      if (e.key === 'Escape') {
        setModal(null);
        if (modal === 'help') patch(s => ({ ...s, seenGuide: true }));
        return;
      }
      if (typing) return;
      if (e.key === '?') { e.preventDefault(); setModal('help'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [copyMarkdown, modal]);

  const closeHelp = () => {
    setModal(null);
    if (!state.seenGuide) patch(s => ({ ...s, seenGuide: true }));
  };

  /* derived */
  const stats = useMemo(() => ({
    total: state.asks.length,
    open: state.asks.filter(a => ['shortlist', 'asked', 'nudged'].includes(a.status)).length,
    received: state.asks.filter(a => ['received', 'approved', 'published'].includes(a.status)).length,
    approved: state.asks.filter(a => ['approved', 'published'].includes(a.status)).length,
    published: state.asks.filter(a => a.status === 'published').length,
  }), [state.asks]);

  const wallAsks = useMemo(() => state.asks.filter(a => a.quote.trim()), [state.asks]);

  const visibleAsks = useMemo(() => state.asks.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return [a.name, a.company, a.role, a.notes, a.quote].some(v => v.toLowerCase().includes(q));
    }
    return true;
  }), [state.asks, statusFilter, query]);

  const TABS = [
    { id: 'pipeline', label: 'Ask Pipeline', icon: Send },
    { id: 'scripts', label: 'Request Scripts', icon: ScrollText },
    { id: 'wall', label: 'Proof Wall', icon: GalleryVertical },
    { id: 'placements', label: 'Placements', icon: MapPin },
  ];

  return (
    <div className="grain min-h-screen font-body text-ink">
      {/* ============ screen app ============ */}
      <div className="app-shell relative z-10 mx-auto max-w-6xl px-4 pb-24 sm:px-6">

        {/* header on the picture rail */}
        <header className="picture-rail flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
              <rect x="3" y="5" width="34" height="30" rx="2" fill="none" stroke="#a97e2f" strokeWidth="2.6" />
              <rect x="8" y="10" width="24" height="20" fill="#fffdf6" stroke="#2b2118" strokeOpacity=".25" />
              <text x="12" y="27" fontFamily="Fraunces, serif" fontWeight="900" fontSize="20" fill="#a13d1e">&#8220;</text>
              <line x1="20" y1="1" x2="8" y2="10" stroke="#71614e" strokeWidth="1.2" />
              <line x1="20" y1="1" x2="32" y2="10" stroke="#71614e" strokeWidth="1.2" />
            </svg>
            <div>
              <h1 className="font-display text-[22px] font-black leading-none tracking-tight">
                Testimonial <span className="text-gilt">Harvester</span>
              </h1>
              <p className="text-[12px] italic text-umber">Collect the praise. Frame it. Hang it where deals happen.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {consoleCtx && (
              <span
                title={consoleCtx.profile?.company ? `Linked to BizDev Console · ${consoleCtx.profile.company}` : 'Linked to BizDev Console'}
                className="inline-flex items-center gap-1.5 rounded-full border border-gilt/40 bg-linen px-2.5 py-1 text-[11px] font-semibold tracking-wide text-umber">
                <Link2 size={12} className="text-gilt" aria-hidden="true" />
                Console linked{consoleCtx.profile?.company ? ` · ${consoleCtx.profile.company}` : ''}
              </span>
            )}
            <Btn kind="gilt" onClick={loadDemo}><Sparkles size={14} /> Load demo</Btn>
            <Btn onClick={() => setModal('reset')}><RotateCcw size={14} /> Reset</Btn>
            <Btn onClick={() => setModal('help')}><HelpCircle size={14} /> How to use</Btn>
            <Btn kind="primary" onClick={() => setModal('export')}><Download size={14} /> Export</Btn>
          </div>
        </header>

        {/* hero: the wall + labels */}
        <section className="mt-5 grid items-center gap-5 lg:grid-cols-[1fr_240px]">
          <div className="anim-rise"><GalleryHero stats={stats} /></div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            {[
              { n: stats.open, l: 'asks in motion', icon: Send },
              { n: stats.received, l: 'testimonials in hand', icon: Inbox },
              { n: stats.approved, l: 'rights cleared', icon: Scale },
              { n: state.placements.filter(p => p.askId).length + '/' + (state.placements.length || 0), l: 'placements covered', icon: MapPin },
            ].map((k, i) => (
              <div key={i} className="museum-label flex items-center gap-3 px-3.5 py-2.5">
                <k.icon size={16} className="shrink-0 text-gilt" aria-hidden="true" />
                <div>
                  <div className="font-display text-xl font-black leading-none">{k.n}</div>
                  <div className="text-[11px] italic text-umber">{k.l}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* tabs */}
        <nav role="tablist" aria-label="Sections" className="mt-7 flex flex-wrap gap-1 border-b-2 border-double border-ink/25">
          {TABS.map(t => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`-mb-[2px] inline-flex items-center gap-1.5 border-b-2 px-3.5 py-2 text-[13px] font-semibold tracking-wide transition-colors ${tab === t.id
                ? 'border-gilt bg-gesso/80 text-ink'
                : 'border-transparent text-umber hover:bg-gesso/40 hover:text-ink'}`}>
              <t.icon size={14} aria-hidden="true" /> {t.label}
            </button>
          ))}
        </nav>

        <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_330px]">
          <main>
            {/* ============ PIPELINE ============ */}
            {tab === 'pipeline' && (
              <section aria-label="Ask pipeline" className="anim-rise">
                <div className="rounded-sm border border-ink/15 bg-gesso/70 p-4 shadow-[var(--shadow-card)]">
                  <div className="mb-1 flex items-center justify-between">
                    <h2 className="font-display text-base font-bold">The harvest, stage by stage</h2>
                    <span className="text-[11px] italic text-umber">{stats.total} people</span>
                  </div>
                  <FunnelMeter asks={state.asks} />
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Btn kind="primary" onClick={addAsk}><Plus size={14} /> Add a person</Btn>
                  {consoleCtx?.roster?.accounts?.length > 0 && (
                    <select
                      aria-label="Pull a new person from the console roster"
                      className={inputCls + ' w-56'}
                      value=""
                      onChange={e => {
                        const acc = consoleCtx.roster.accounts.find(x => x.name === e.target.value);
                        if (acc) addAskFromRoster(acc);
                      }}>
                      <option value="">Pull from console roster…</option>
                      {consoleCtx.roster.accounts.map((acc, i) => (
                        <option key={acc.name + i} value={acc.name}>
                          {acc.name}{acc.segment ? ` (${acc.segment})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="relative">
                    <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-faded" aria-hidden="true" />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search names, notes, quotes"
                      aria-label="Search pipeline" className={inputCls + ' w-56 pl-7'} />
                  </div>
                  <div className="ml-auto flex flex-wrap gap-1">
                    {['all', ...STATUS_IDS].map(sid => (
                      <button key={sid} onClick={() => setStatusFilter(sid)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${statusFilter === sid ? 'bg-ink text-gesso' : 'bg-gesso/70 text-umber hover:bg-linen'}`}>
                        {sid === 'all' ? 'All' : statusLabel(sid)}
                      </button>
                    ))}
                  </div>
                </div>

                {state.asks.length === 0 ? (
                  <div className="mt-5">
                    <EmptyState icon={Users} title="An empty wall is a choice">
                      Every happy client is a testimonial you haven't asked for yet. Add the three people
                      most likely to say yes this week — or press <strong>Load demo</strong> to see a
                      working gallery first.
                    </EmptyState>
                  </div>
                ) : visibleAsks.length === 0 ? (
                  <div className="mt-5">
                    <EmptyState icon={Search} title="Nothing matches that view">
                      Clear the search box or switch the stage filter back to <strong>All</strong>.
                    </EmptyState>
                  </div>
                ) : (
                  <ul className="mt-5 space-y-3">
                    {visibleAsks.map(a => {
                      const open = expanded === a.id;
                      return (
                        <li key={a.id} className="anim-rise rounded-sm border border-ink/15 bg-gesso shadow-[var(--shadow-card)]">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                            <button onClick={() => setExpanded(open ? null : a.id)} aria-expanded={open}
                              aria-label={`${open ? 'Collapse' : 'Expand'} ${a.name || 'entry'}`}
                              className="text-umber hover:text-ink">
                              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-display text-[15px] font-bold">
                                {a.name || <span className="italic text-faded">Unnamed prospect</span>}
                                {a.company ? <span className="font-body text-[12px] font-normal italic text-umber"> — {a.role ? a.role + ', ' : ''}{a.company}</span> : null}
                              </div>
                              <div className="text-[11px] text-umber">
                                {(RELATIONSHIPS.find(r => r.id === a.relationship) || {}).label} · {a.channel}{a.askedOn ? ` · asked ${a.askedOn}` : ''}
                              </div>
                            </div>
                            {a.quote.trim() ? <RightsRing ask={a} /> : null}
                            <StatusPill status={a.status} onClick={() => advanceStatus(a)} title="Click to advance stage" />
                            <IconBtn label={`Delete ${a.name || 'entry'}`} onClick={() => deleteAsk(a.id)} className="text-oxide/70 hover:text-oxide">
                              <Trash2 size={15} />
                            </IconBtn>
                          </div>

                          {open && (
                            <div className="border-t border-ink/10 bg-plaster/40 px-4 py-4">
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <Field label="Name"><input className={inputCls} value={a.name} onChange={e => patchAsk(a.id, { name: e.target.value })} placeholder="Maya Chen" /></Field>
                                <Field label="Role"><input className={inputCls} value={a.role} onChange={e => patchAsk(a.id, { role: e.target.value })} placeholder="VP Marketing" /></Field>
                                <Field label="Company"><input className={inputCls} value={a.company} onChange={e => patchAsk(a.id, { company: e.target.value })} placeholder="Northbeam Analytics" /></Field>
                                <Field label="Relationship">
                                  <select className={inputCls} value={a.relationship} onChange={e => patchAsk(a.id, { relationship: e.target.value })}>
                                    {RELATIONSHIPS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                  </select>
                                </Field>
                                <Field label="Channel">
                                  <select className={inputCls} value={a.channel} onChange={e => patchAsk(a.id, { channel: e.target.value })}>
                                    {CHANNELS.map(c => <option key={c}>{c}</option>)}
                                  </select>
                                </Field>
                                <Field label="Asked on"><input type="date" className={inputCls} value={a.askedOn} onChange={e => patchAsk(a.id, { askedOn: e.target.value })} /></Field>
                                <Field label="Shared project" className="sm:col-span-2"><input className={inputCls} value={a.project} onChange={e => patchAsk(a.id, { project: e.target.value })} placeholder="the positioning sprint" /></Field>
                                <Field label="Result worth citing"><input className={inputCls} value={a.resultHint} onChange={e => patchAsk(a.id, { resultHint: e.target.value })} placeholder="demo requests +40%" /></Field>
                              </div>
                              <Field label="Working notes" className="mt-3">
                                <textarea rows={2} className={inputCls} value={a.notes} onChange={e => patchAsk(a.id, { notes: e.target.value })} placeholder="Where the relationship stands, angles, reminders" />
                              </Field>
                              <Field label="Testimonial (verbatim, as received)" className="mt-3">
                                <textarea rows={3} className={inputCls + ' italic'} value={a.quote} onChange={e => patchAsk(a.id, { quote: e.target.value })} placeholder="Paste their exact words here when they arrive — tidy later, with their approval." />
                              </Field>

                              {a.quote.trim() ? (
                                <div className="mt-4">
                                  <div className="mb-2 flex items-center gap-2">
                                    <Scale size={14} className="text-gilt" aria-hidden="true" />
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-umber">Rights checklist — what they've agreed to</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
                                    {RIGHTS_ITEMS.map(r => (
                                      <label key={r.id} className="flex cursor-pointer items-center gap-1.5 text-[12px] text-ink">
                                        <input type="checkbox" checked={a.rights[r.id]}
                                          onChange={e => patchAsk(a.id, { rights: { ...a.rights, [r.id]: e.target.checked } })}
                                          className="h-3.5 w-3.5 accent-[#3e6b53]" />
                                        {r.label}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p className="mt-3 text-[11px] italic text-faded">The rights checklist appears once a testimonial is on file.</p>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}

            {/* ============ SCRIPTS ============ */}
            {tab === 'scripts' && (
              <section aria-label="Request scripts" className="anim-rise space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold">Request scripts, by relationship</h2>
                    <p className="text-[12.5px] italic text-umber">Merge fields fill from a person in your pipeline: {'{{first_name}} {{company}} {{project}} {{result_hint}} {{my_name}}'}</p>
                  </div>
                  <Field label="Sign as ({{my_name}})">
                    <input className={inputCls + ' w-44'} value={state.myName} onChange={e => patch(s => ({ ...s, myName: e.target.value }))} />
                  </Field>
                </div>
                {RELATIONSHIPS.map(rel => (
                  <ScriptCard key={rel.id} rel={rel} state={state}
                    onChange={text => patch(s => ({ ...s, scripts: { ...s.scripts, [rel.id]: text } }))}
                    onRestore={() => patch(s => ({ ...s, scripts: { ...s.scripts, [rel.id]: DEFAULT_SCRIPTS[rel.id] } }))}
                    copy={copy} copied={copied} />
                ))}
              </section>
            )}

            {/* ============ WALL ============ */}
            {tab === 'wall' && (
              <section aria-label="Proof wall" className="anim-rise">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-bold">The Proof Wall</h2>
                    <p className="text-[12.5px] italic text-umber">Framed and label-ready. Screenshot a card, or print the whole wall for a leave-behind.</p>
                  </div>
                  <Btn onClick={() => window.print()}><Printer size={14} /> Print the wall</Btn>
                </div>
                {wallAsks.length === 0 ? (
                  <EmptyState icon={Frame} title="No quotes to hang yet">
                    When a testimonial lands, paste it into that person's entry in the <strong>Ask
                    Pipeline</strong> — it appears here in a frame automatically. The demo shows a
                    finished wall if you want the feel of it.
                  </EmptyState>
                ) : (
                  <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2">
                    {wallAsks.map(a => (
                      <div key={a.id} className="anim-rise">
                        <FramedQuote ask={a} onFrame={frame => patchAsk(a.id, { frame })} />
                        <div className="mt-5 flex items-center justify-between px-1">
                          <RightsRing ask={a} size={30} />
                          <StatusPill status={a.status} onClick={() => advanceStatus(a)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ============ PLACEMENTS ============ */}
            {tab === 'placements' && (
              <section aria-label="Placement planner" className="anim-rise">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-bold">Placement planner</h2>
                    <p className="text-[12.5px] italic text-umber">A quote in a drawer sells nothing. Decide where each one hangs — and check the rights cover it.</p>
                  </div>
                  <Btn kind="primary" onClick={addPlacement}><Plus size={14} /> Add placement</Btn>
                </div>

                {state.placements.length > 0 && (
                  <CoverageBar placements={state.placements} />
                )}

                {state.placements.length === 0 ? (
                  <EmptyState icon={MapPin} title="Nowhere to hang the work">
                    Start with the classics: homepage hero, pricing page, proposal template, LinkedIn
                    featured section, and a one-line P.S. for cold email. Add each as a placement, then
                    assign your strongest quote to the doubt it settles.
                  </EmptyState>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {state.placements.map(p => {
                      const assigned = state.asks.find(a => a.id === p.askId);
                      const eligible = state.asks.filter(a => a.quote.trim());
                      const salesRisk = assigned && !assigned.rights.chWebsite && !assigned.rights.chSocial && !assigned.rights.chSales;
                      return (
                        <li key={p.id} className="anim-rise rounded-sm border border-ink/15 bg-gesso p-4 shadow-[var(--shadow-card)]">
                          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                            <Field label="Placement">
                              <input className={inputCls} value={p.page} onChange={e => patchPlacement(p.id, { page: e.target.value })} placeholder="Homepage hero" />
                            </Field>
                            <Field label="Job of the proof here">
                              <input className={inputCls} value={p.goal} onChange={e => patchPlacement(p.id, { goal: e.target.value })} placeholder="Instant credibility above the fold" />
                            </Field>
                            <div className="flex items-center gap-2 pb-0.5">
                              <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-umber">
                                <input type="checkbox" checked={p.live} onChange={e => patchPlacement(p.id, { live: e.target.checked })} className="h-3.5 w-3.5 accent-[#3e6b53]" />
                                Live
                              </label>
                              <IconBtn label={`Delete placement ${p.page || 'untitled'}`} onClick={() => deletePlacement(p.id)} className="text-oxide/70 hover:text-oxide">
                                <Trash2 size={15} />
                              </IconBtn>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <Field label="Hang this quote" className="min-w-56 flex-1">
                              <select className={inputCls} value={p.askId || ''} onChange={e => patchPlacement(p.id, { askId: e.target.value || null })}>
                                <option value="">— unassigned —</option>
                                {eligible.map(a => <option key={a.id} value={a.id}>{a.name}{a.company ? ` (${a.company})` : ''}</option>)}
                              </select>
                            </Field>
                            {assigned ? (
                              <div className="max-w-md flex-1 border-l-2 border-gilt/60 pl-3 text-[12px] italic leading-snug text-umber">
                                "{assigned.quote.trim().slice(0, 140)}{assigned.quote.trim().length > 140 ? '…' : ''}"
                              </div>
                            ) : (
                              <span className="text-[12px] italic text-faded">Empty hook — the wall has {wallAsks.length} quote(s) waiting.</span>
                            )}
                          </div>
                          {salesRisk && (
                            <p className="mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-oxide">
                              <Scale size={13} aria-hidden="true" /> Rights check: this person hasn't approved any usage channel yet.
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}
          </main>

          {/* ============ COPILOT RAIL ============ */}
          <CopilotPanel state={state} copy={copy} copied={copied} consoleCtx={consoleCtx}
            onNotes={v => patch(s => ({ ...s, copilotNotes: v }))} />
        </div>

        <footer className="mt-14 border-t border-ink/15 pt-4 text-center text-[11px] italic text-faded">
          Testimonial Harvester · your data lives only in this browser (localStorage) · press ? for help · Ctrl/Cmd+S copies the wall
        </footer>
      </div>

      {/* ============ print artifact ============ */}
      <div className="print-artifact px-8 py-6">
        <h1 className="font-display text-2xl font-black">The Proof Wall</h1>
        <p className="mb-6 text-sm italic text-umber">Collected testimonials · {new Date().toISOString().slice(0, 10)}</p>
        <div className="grid grid-cols-2 gap-6">
          {wallAsks.map(a => <FramedQuote key={a.id} ask={a} compact />)}
        </div>
        <h2 className="mt-8 font-display text-lg font-bold">Placement plan</h2>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {state.placements.map(p => {
            const a = state.asks.find(x => x.id === p.askId);
            return <li key={p.id}>{p.page || 'Untitled'} — {a ? a.name : 'unassigned'} ({p.live ? 'live' : 'planned'})</li>;
          })}
        </ul>
      </div>

      {/* ============ modals ============ */}
      {modal === 'help' && <HelpModal onClose={closeHelp} />}
      {modal === 'export' && (
        <ExportModal onClose={() => setModal(null)}
          onCopyMd={copyMarkdown} copied={copied}
          onJson={() => downloadFile('testimonial-harvester.json', JSON.stringify(state, null, 2), 'application/json')}
          onCsv={() => downloadFile('testimonial-asks.csv', asksToCSV(state.asks), 'text/csv')}
          onImportClick={() => fileRef.current?.click()} />
      )}
      {modal === 'reset' && (
        <Modal title="Clear the wall?" onClose={() => setModal(null)}>
          <p className="text-[13.5px] leading-relaxed text-umber">
            This removes every ask, testimonial, script edit, and placement from this browser.
            If any of it matters, <strong className="text-ink">Export &rarr; Download JSON</strong> first — there is no undo for this one.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Btn onClick={() => setModal(null)}>Keep my gallery</Btn>
            <Btn kind="danger" onClick={doReset}><RotateCcw size={14} /> Yes, strip the wall</Btn>
          </div>
        </Modal>
      )}

      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Import JSON file"
        onChange={e => { const f = e.target.files?.[0]; if (f) importJSON(f); e.target.value = ''; }} />

      {/* ============ toast ============ */}
      {toast && (
        <div className="anim-toast fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-sm border border-gilt/50 bg-ink px-4 py-2.5 text-[13px] text-gesso shadow-hang" role="status">
          <span>{toast.msg}</span>
          {toast.undo && (
            <button onClick={toast.undo} className="inline-flex items-center gap-1 rounded-sm border border-gilt/60 px-2 py-0.5 font-semibold text-gilt-pale hover:bg-gilt/20">
              <Undo2 size={13} /> Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Script card
   ================================================================ */

function ScriptCard({ rel, state, onChange, onRestore, copy, copied }) {
  const [personId, setPersonId] = useState('');
  const [editing, setEditing] = useState(false);
  const people = state.asks.filter(a => a.relationship === rel.id);
  const person = state.asks.find(a => a.id === personId) || people[0] || null;
  const preview = person ? mergeScript(state.scripts[rel.id], person, state.myName) : state.scripts[rel.id];
  const tag = 'script-' + rel.id;
  return (
    <article className="rounded-sm border border-ink/15 bg-gesso shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 px-4 py-2.5">
        <h3 className="font-display text-[15px] font-bold">{rel.label}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {people.length > 0 && (
            <select aria-label={`Preview script for a ${rel.label}`} className={inputCls + ' w-44 py-1'}
              value={person ? person.id : ''} onChange={e => setPersonId(e.target.value)}>
              {people.map(a => <option key={a.id} value={a.id}>{a.name || 'Unnamed'}</option>)}
            </select>
          )}
          <Btn onClick={() => setEditing(e => !e)} className="py-1">
            <PenLine size={13} /> {editing ? 'Preview' : 'Edit template'}
          </Btn>
          <Btn kind="gilt" className="py-1" onClick={() => copy(preview, tag)}>
            {copied === tag ? <Check size={13} /> : <Copy size={13} />} {copied === tag ? 'Copied' : person ? `Copy for ${(person.name || 'them').split(' ')[0]}` : 'Copy'}
          </Btn>
        </div>
      </div>
      <div className="px-4 py-3">
        {editing ? (
          <>
            <textarea rows={10} value={state.scripts[rel.id]} onChange={e => onChange(e.target.value)}
              className={inputCls + ' font-mono text-[12px] leading-relaxed'} aria-label={`${rel.label} script template`} />
            <button onClick={onRestore} className="mt-1.5 text-[11px] italic text-umber underline decoration-dotted hover:text-ink">
              Restore the original template
            </button>
          </>
        ) : (
          <pre className="whitespace-pre-wrap font-body text-[13px] leading-relaxed text-ink">{preview}</pre>
        )}
        {!person && !editing && (
          <p className="mt-2 text-[11px] italic text-faded">No one in the pipeline has this relationship yet — merge fields show as placeholders.</p>
        )}
      </div>
    </article>
  );
}

/* coverage bar for placements */
function CoverageBar({ placements }) {
  const covered = placements.filter(p => p.askId).length;
  const live = placements.filter(p => p.live).length;
  const total = placements.length;
  const W = 620, H = 46;
  const w = x => (x / Math.max(1, total)) * (W - 12);
  return (
    <div className="rounded-sm border border-ink/15 bg-gesso/70 px-4 py-3 shadow-[var(--shadow-card)]">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
        aria-label={`${covered} of ${total} placements have a quote; ${live} live`}>
        <rect x="6" y="14" width={W - 12} height="12" rx="2" fill="#eae1cf" />
        <rect x="6" y="14" width={w(covered)} height="12" rx="2" fill="#a97e2f" />
        <rect x="6" y="14" width={w(live)} height="12" rx="2" fill="#3e6b53" />
        {Array.from({ length: total + 1 }, (_, i) => (
          <line key={i} x1={6 + w(i)} y1="10" x2={6 + w(i)} y2="30" stroke="#71614e" strokeOpacity=".5" strokeWidth="1" />
        ))}
        <text x="6" y="42" fontSize="10" fill="#71614e">{live} live</text>
        <text x={W / 2} y="42" fontSize="10" fill="#71614e" textAnchor="middle">{covered}/{total} assigned</text>
        <text x={W - 6} y="42" fontSize="10" fill="#71614e" textAnchor="end">{total - covered} empty hooks</text>
      </svg>
    </div>
  );
}

/* ================================================================
   Copilot panel
   ================================================================ */

function CopilotPanel({ state, copy, copied, consoleCtx, onNotes }) {
  const [open, setOpen] = useState('ask');
  const [askId, setAskId] = useState('');
  const [polishId, setPolishId] = useState('');
  const [placeId, setPlaceId] = useState('');

  const askables = state.asks.filter(a => ['shortlist', 'asked', 'nudged'].includes(a.status));
  const polishables = state.asks.filter(a => a.quote.trim());
  const askTarget = state.asks.find(a => a.id === askId) || askables[0] || state.asks[0] || null;
  const polishTarget = state.asks.find(a => a.id === polishId) || polishables[0] || null;
  const placeTarget = state.placements.find(p => p.id === placeId) || state.placements[0] || null;

  const ACTIONS = [
    {
      id: 'ask', icon: Send, title: 'Personalize the ask',
      blurb: 'Turn the template into a note only this person could receive.',
      picker: state.asks.length ? (
        <select className={inputCls} value={askTarget ? askTarget.id : ''} onChange={e => setAskId(e.target.value)} aria-label="Person to ask">
          {state.asks.map(a => <option key={a.id} value={a.id}>{a.name || 'Unnamed'}{a.company ? ` — ${a.company}` : ''}</option>)}
        </select>
      ) : null,
      ready: !!askTarget,
      build: () => withConsoleContext(consoleCtx, buildAskPrompt(state, askTarget)),
      empty: 'Add a person to the pipeline first.',
    },
    {
      id: 'polish', icon: PenLine, title: 'Tighten a testimonial, ethically',
      blurb: 'Three faithful cuts of a rambling quote — plus the approval message.',
      picker: polishables.length ? (
        <select className={inputCls} value={polishTarget ? polishTarget.id : ''} onChange={e => setPolishId(e.target.value)} aria-label="Testimonial to tighten">
          {polishables.map(a => <option key={a.id} value={a.id}>{a.name || 'Unnamed'}</option>)}
        </select>
      ) : null,
      ready: !!(polishTarget && polishTarget.quote.trim()),
      build: () => withConsoleContext(consoleCtx, buildPolishPrompt(state, polishTarget)),
      empty: 'Paste a received testimonial into a pipeline entry first.',
    },
    {
      id: 'cast', icon: MapPin, title: 'Cast the right quote',
      blurb: 'Which testimonial belongs on this page? Claude argues it out.',
      picker: state.placements.length ? (
        <select className={inputCls} value={placeTarget ? placeTarget.id : ''} onChange={e => setPlaceId(e.target.value)} aria-label="Placement to cast for">
          {state.placements.map(p => <option key={p.id} value={p.id}>{p.page || 'Untitled placement'}</option>)}
        </select>
      ) : null,
      ready: !!placeTarget,
      build: () => withConsoleContext(consoleCtx, buildCastPrompt(state, placeTarget)),
      empty: 'Add a placement in the Placements tab first.',
    },
    {
      id: 'coverage', icon: LayoutGrid, title: 'Audit my proof coverage',
      blurb: 'Find the doubts, industries, and pages your wall leaves naked.',
      picker: null,
      ready: state.asks.length > 0 || state.placements.length > 0,
      build: () => withConsoleContext(consoleCtx, buildCoveragePrompt(state)),
      empty: 'Add some pipeline or placements first — the audit needs material.',
    },
  ];

  return (
    <aside aria-label="Claude Copilot" className="xl:sticky xl:top-4 xl:self-start">
      <div className="rounded-sm border-2 border-ink/60 bg-night text-plaster shadow-hang" style={{ boxShadow: 'var(--shadow-hang)' }}>
      <div className="border-b border-gilt/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-gilt-pale" aria-hidden="true" />
          <h2 className="font-display text-[15px] font-bold text-gesso">Claude Copilot</h2>
        </div>
        <p className="mt-1 text-[11.5px] italic leading-snug text-plaster/70">
          The curator's assistant. Each action packs your current gallery into a prompt —
          paste it into claude.ai. Works with the standard $20 Claude subscription; no API key.
        </p>
      </div>
      <div className="divide-y divide-plaster/10">
        {ACTIONS.map(act => {
          const isOpen = open === act.id;
          const tag = 'cp-' + act.id;
          return (
            <div key={act.id}>
              <button onClick={() => setOpen(isOpen ? '' : act.id)} aria-expanded={isOpen}
                className="flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-plaster/5">
                <act.icon size={15} className="mt-0.5 shrink-0 text-gilt-pale" aria-hidden="true" />
                <span className="flex-1">
                  <span className="block font-display text-[13.5px] font-bold text-gesso">{act.title}</span>
                  <span className="block text-[11.5px] italic leading-snug text-plaster/60">{act.blurb}</span>
                </span>
                {isOpen ? <ChevronDown size={14} className="mt-1 text-plaster/50" /> : <ChevronRight size={14} className="mt-1 text-plaster/50" />}
              </button>
              {isOpen && (
                <div className="px-4 pb-4">
                  {act.picker ? <div className="mb-2 [&_select]:border-plaster/25 [&_select]:bg-[#2b2419] [&_select]:text-plaster">{act.picker}</div> : null}
                  {act.ready ? (
                    <Btn kind="gilt" className="w-full justify-center"
                      onClick={() => copy(act.build(), tag)}>
                      {copied === tag ? <Check size={14} /> : <Copy size={14} />}
                      {copied === tag ? 'Prompt copied — paste into claude.ai' : 'Copy prompt'}
                    </Btn>
                  ) : (
                    <p className="text-[11.5px] italic text-plaster/50">{act.empty}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="border-t border-gilt/30 px-4 py-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-plaster/60">
          <ClipboardPaste size={12} aria-hidden="true" /> Claude's answer, kept with the gallery
        </div>
        <textarea rows={4} value={state.copilotNotes} onChange={e => onNotes(e.target.value)}
          aria-label="Paste Claude's answer"
          placeholder="Paste the reply you want to keep — it autosaves with everything else."
          className="w-full rounded-sm border border-plaster/25 bg-[#2b2419] px-2.5 py-2 text-[12px] leading-relaxed text-plaster placeholder:text-plaster/35 focus:border-gilt" />
      </div>
      </div>
      <div className="museum-label mt-3 flex items-start gap-2 px-3 py-2.5 text-[11.5px] italic leading-snug text-umber">
        <Lightbulb size={14} className="mt-0.5 shrink-0 text-gilt" aria-hidden="true" />
        <span>Curator's rule: never publish an edited quote without the person's written OK — the checklist has a box for exactly that.</span>
      </div>
    </aside>
  );
}

/* ================================================================
   Help & Export modals
   ================================================================ */

function HelpModal({ onClose }) {
  const steps = [
    ['Load the demo', 'Press "Load demo" to hang a finished gallery — seven asks, four framed quotes, five placements. Reset clears it when you\'re ready to work.'],
    ['Shortlist your believers', 'In Ask Pipeline, add the people most likely to say yes: recent wins, longtime clients, partners. Record the shared project and the result worth citing — those power everything else.'],
    ['Send the ask', 'Request Scripts has a template per relationship. Pick the person, the merge fields fill in, copy, send. Click the status pill to advance them: Shortlist → Ask sent → Nudged → Received.'],
    ['Capture their words verbatim', 'When a testimonial arrives, paste it exactly as written into that person\'s entry. Rambling is fine — the Copilot has an ethical tightening action, and every edit goes back for approval.'],
    ['Clear the rights', 'Tick the rights checklist: name, company, logo, channels, and "edited wording approved". The ring on each card shows how clear you are to publish.'],
    ['Hang the wall', 'The Proof Wall frames every collected quote — pick gilt, walnut, gallery black, or float white per card. Screenshot a card, or Print the wall for a leave-behind.'],
    ['Place every quote', 'In Placements, list where proof should live (homepage, pricing, proposals, outreach P.S.) and hang a specific quote on each hook. The bar shows empty hooks at a glance.'],
    ['Let Claude curate', 'The Copilot panel packs your real data into expert prompts: personalize an ask, tighten a quote, cast the right testimonial for a page, audit coverage. Copy, paste into claude.ai, keep the answer in the notes box.'],
  ];
  const keys = [
    ['?', 'Open this guide'],
    ['Esc', 'Close any dialog'],
    ['Ctrl/Cmd + S', 'Copy the proof wall as Markdown'],
  ];
  return (
    <Modal title="How to use Testimonial Harvester" onClose={onClose} wide>
      <ol className="space-y-3">
        {steps.map(([t, d], i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink font-display text-[12px] font-bold text-gilt-pale">{i + 1}</span>
            <div>
              <div className="font-display text-[14px] font-bold text-ink">{t}</div>
              <div className="text-[12.5px] leading-relaxed text-umber">{d}</div>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-5 rounded-sm border border-ink/15 bg-plaster/60 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-umber">
          <Keyboard size={13} aria-hidden="true" /> Keyboard shortcuts
        </div>
        <div className="grid gap-1.5 sm:grid-cols-3">
          {keys.map(([k, d]) => (
            <div key={k} className="flex items-center gap-2 text-[12px]">
              <kbd className="rounded-sm border border-ink/30 bg-gesso px-1.5 py-0.5 font-mono text-[11px] shadow-[0_1px_0_rgba(43,33,24,.3)]">{k}</kbd>
              <span className="text-umber">{d}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Btn kind="primary" onClick={onClose}><Check size={14} /> To the wall</Btn>
      </div>
    </Modal>
  );
}

function ExportModal({ onClose, onCopyMd, copied, onJson, onCsv, onImportClick }) {
  const rows = [
    { icon: FileText, title: 'Copy Markdown', desc: 'The proof wall, pipeline, and placement plan as a clean document. (Also Ctrl/Cmd+S.)', act: onCopyMd, label: copied === 'md' ? 'Copied' : 'Copy' },
    { icon: FileJson, title: 'Download JSON', desc: 'Full state — your backup, or the file to move between browsers.', act: onJson, label: 'Download' },
    { icon: FileSpreadsheet, title: 'Download CSV', desc: 'The ask pipeline as a spreadsheet: people, statuses, rights, quotes.', act: onCsv, label: 'Download' },
    { icon: Upload, title: 'Import JSON', desc: 'Restore a backup. Anything malformed is gracefully ignored.', act: onImportClick, label: 'Choose file' },
  ];
  return (
    <Modal title="Export & import" onClose={onClose}>
      <ul className="space-y-2.5">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center gap-3 rounded-sm border border-ink/15 bg-plaster/50 px-3 py-2.5">
            <r.icon size={18} className="shrink-0 text-gilt" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="font-display text-[13.5px] font-bold">{r.title}</div>
              <div className="text-[11.5px] leading-snug text-umber">{r.desc}</div>
            </div>
            <Btn kind={i === 0 ? 'gilt' : 'ghost'} onClick={r.act} className="shrink-0">
              {r.label === 'Copied' ? <Check size={13} /> : null} {r.label}
            </Btn>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] italic text-faded">
        Everything lives in this browser's localStorage — no accounts, no server, nothing leaves your machine.
      </p>
    </Modal>
  );
}
