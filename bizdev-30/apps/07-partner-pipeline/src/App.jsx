import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Anchor, Ship, Compass, Package, Flag, Trash2, Plus, X, ChevronLeft, ChevronRight,
  Search, Download, Upload, Copy, HelpCircle, RotateCcw, Sparkles, FileJson,
  FileSpreadsheet, FileText, Lightbulb, Handshake, Percent, Undo2, Printer, Check,
  PenLine, LifeBuoy, ArrowUpDown, ListOrdered,
} from 'lucide-react';

/* ================= constants & helpers ================= */

const KEY = 'bizdev:07-partner-pipeline:v1';
const SLUG = '07-partner-pipeline';

const LANES = [
  { id: 'identified', label: 'Identified', sub: 'Sighted on the horizon' },
  { id: 'contacted', label: 'Contacted', sub: 'Hailed — awaiting signal' },
  { id: 'exploring', label: 'Exploring', sub: 'Docked for talks' },
  { id: 'active', label: 'Active', sub: 'Crewed and shipping together' },
];
const LANE_IDS = LANES.map((l) => l.id);

const KINDS = ['Agency', 'Newsletter', 'Community', 'SaaS / App', 'Podcast', 'Marketplace', 'Service firm', 'Other'];
const IDEA_STATUS = ['spark', 'planned', 'live'];

const uid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

const clamp10 = (n) => Math.max(0, Math.min(10, Math.round(Number(n) || 0)));
const str = (v, fb = '') => (typeof v === 'string' ? v : fb);

function fitScore(p) {
  // audience overlap 40% + complementarity 40% + ease (10 - effort) 20%
  return Math.round(p.overlap * 4 + p.complement * 4 + (10 - p.effort) * 2);
}
function fitTier(score) {
  if (score >= 72) return { label: 'Deep water', color: 'var(--color-harbor-500)' };
  if (score >= 48) return { label: 'Fair tide', color: 'var(--color-rope-500)' };
  return { label: 'Shallow', color: 'var(--color-buoy-500)' };
}

function normalizeIdea(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    id: str(r.id) || uid(),
    title: str(r.title),
    status: IDEA_STATUS.includes(r.status) ? r.status : 'spark',
  };
}

function normalizePartner(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    id: str(r.id) || uid(),
    name: str(r.name, 'Unnamed partner'),
    kind: KINDS.includes(r.kind) ? r.kind : 'Other',
    lane: LANE_IDS.includes(r.lane) ? r.lane : 'identified',
    contact: str(r.contact),
    audience: str(r.audience),
    notes: str(r.notes),
    overlap: clamp10(r.overlap ?? 5),
    complement: clamp10(r.complement ?? 5),
    effort: clamp10(r.effort ?? 5),
    flagged: !!r.flagged,
    ideas: Array.isArray(r.ideas) ? r.ideas.map(normalizeIdea) : [],
    intro: str(r.intro),
    added: Number(r.added) || Date.now(),
  };
}

function normalize(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const port = r.port && typeof r.port === 'object' ? r.port : {};
  return {
    v: 1,
    seenGuide: !!r.seenGuide,
    port: { company: str(port.company), offer: str(port.offer), audience: str(port.audience) },
    partners: Array.isArray(r.partners) ? r.partners.map(normalizePartner) : [],
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

/* ================= demo scenario ================= */

const DEMO = normalize({
  seenGuide: true,
  port: {
    company: 'Driftline Analytics',
    offer: 'Retention analytics dashboard for Shopify brands — $79/mo, 14-day trial',
    audience: 'DTC founders and retention marketers, $1M–$20M GMV',
  },
  copilotNotes: '',
  partners: [
    {
      id: 'p1', name: 'Northbound Commerce', kind: 'Agency', lane: 'exploring',
      contact: 'Priya Raman, Head of Partnerships', audience: '40 Shopify Plus retainer clients',
      overlap: 8, complement: 9, effort: 4, flagged: true,
      notes: 'They rebuild retention flows for Plus brands and have no analytics layer of their own. Priya asked for a white-label option on the 6/30 call. Decision window: their Q3 service menu locks mid-August.',
      ideas: [
        { id: 'i1', title: 'Co-branded "Retention Teardown" offer for their client roster', status: 'planned' },
        { id: 'i2', title: 'Driftline dashboard bundled into their Plus onboarding package', status: 'spark' },
      ],
      intro: 'Subject: Driftline x Northbound — retention teardowns for your Plus roster\n\nHi Priya — following up on the teardown idea. We would supply the data layer and a co-branded report template; your strategists keep the client relationship and the upsell. Two pilot clients in July, then we review numbers together. Worth 20 minutes this week?',
    },
    {
      id: 'p2', name: 'The Repeat Customer', kind: 'Newsletter', lane: 'contacted',
      contact: 'Marco Deluca, publisher', audience: '31,000 DTC operators, 52% open rate',
      overlap: 9, complement: 7, effort: 3, flagged: false,
      notes: 'Weekly newsletter on retention tactics. Marco replied to the first hail, wants a data-driven guest piece before talking placements. Sponsorship rate card: $1,400 per primary slot.',
      ideas: [
        { id: 'i3', title: 'Guest essay: "Benchmarks from 400 Shopify brands"', status: 'planned' },
        { id: 'i4', title: 'Quarterly co-published retention index', status: 'spark' },
      ],
      intro: '',
    },
    {
      id: 'p3', name: 'LoyaltyLoop', kind: 'SaaS / App', lane: 'active',
      contact: 'Dana Okafor, BD lead', audience: '2,100 Shopify installs',
      overlap: 7, complement: 9, effort: 2, flagged: false,
      notes: 'Live integration since March. Mutual in-app listing converts at 4.1%. Rev share: 20% first-year on referred subscriptions, paid quarterly. Next: joint webinar in September.',
      ideas: [
        { id: 'i5', title: 'Joint webinar: "Loyalty data you are not using"', status: 'planned' },
        { id: 'i6', title: 'Shared case study with Fern & Field (mutual customer)', status: 'live' },
      ],
      intro: '',
    },
    {
      id: 'p4', name: 'Founders\' Wharf', kind: 'Community', lane: 'contacted',
      contact: 'Sam Whitaker, community lead', audience: '5,400-member Slack, DTC founders',
      overlap: 8, complement: 6, effort: 5, flagged: false,
      notes: 'Paid community, very protective of member attention. Sam open to an AMA if it is teaching-first, zero pitch. Their sponsor waitlist runs 2 months.',
      ideas: [{ id: 'i7', title: 'Monthly "office hours" thread on retention metrics', status: 'spark' }],
      intro: '',
    },
    {
      id: 'p5', name: 'Baltic & Main', kind: 'Agency', lane: 'exploring',
      contact: 'Ines Kovac, founder', audience: '18 email/SMS retainer clients',
      overlap: 7, complement: 8, effort: 4, flagged: false,
      notes: 'Boutique lifecycle agency. Ines wants referral-only to start — no co-marketing until we prove two client wins. Fair. Send the referral one-pager.',
      ideas: [],
      intro: '',
    },
    {
      id: 'p6', name: 'DTC Harbor Podcast', kind: 'Podcast', lane: 'identified',
      contact: 'Booking: producer Lena T.', audience: '12k downloads/episode',
      overlap: 6, complement: 6, effort: 3, flagged: false,
      notes: 'Interview format, founder stories. Angle: our benchmark data as an episode spine, not a product pitch.',
      ideas: [],
      intro: '',
    },
    {
      id: 'p7', name: 'KlickPost SMS', kind: 'SaaS / App', lane: 'identified',
      contact: 'partners@ alias, no name yet', audience: '900 Shopify installs',
      overlap: 6, complement: 8, effort: 6, flagged: false,
      notes: 'SMS platform, adjacent not competing. Their partner program page lists a 15% standard rev share. Need a warm path — check LoyaltyLoop for a mutual contact.',
      ideas: [],
      intro: '',
    },
    {
      id: 'p8', name: 'ShipMate 3PL', kind: 'Service firm', lane: 'identified',
      contact: 'Unknown — find ops marketing lead', audience: '300 fulfilment clients',
      overlap: 4, complement: 5, effort: 7, flagged: false,
      notes: 'Weak overlap: their buyer is ops, ours is marketing. Park unless a champion appears.',
      ideas: [],
      intro: '',
    },
  ],
});

/* ================= tiny SVG pieces ================= */

function polar(cx, cy, r, deg) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
function arcPath(cx, cy, r, a0, a1) {
  const [sx, sy] = polar(cx, cy, r, a0);
  const [ex, ey] = polar(cx, cy, r, a1);
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

function FitDial({ score, size = 46, stroke = 5 }) {
  const tier = fitTier(score);
  const c = size / 2;
  const r = c - stroke - 2;
  const a0 = -120;
  const a1 = -120 + (240 * Math.max(0, Math.min(100, score))) / 100;
  const ticks = [-120, -60, 0, 60, 120].map((a) => {
    const [x1, y1] = polar(c, c, r + 2.5, a);
    const [x2, y2] = polar(c, c, r + 5.5, a);
    return { x1, y1, x2, y2, key: a };
  });
  const [dx, dy] = polar(c, c, r, a1);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Fit score ${score} of 100 — ${tier.label}`}>
      <path d={arcPath(c, c, r, -120, 120)} fill="none" stroke="var(--color-sand-200)" strokeWidth={stroke} strokeLinecap="round" />
      {score > 0 && (
        <path d={arcPath(c, c, r, a0, Math.max(a1, a0 + 1))} fill="none" stroke={tier.color} strokeWidth={stroke} strokeLinecap="round" />
      )}
      {ticks.map((t) => (
        <line key={t.key} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="var(--color-ink-500)" strokeWidth="1" />
      ))}
      <circle cx={dx} cy={dy} r={stroke * 0.62} fill={tier.color} stroke="var(--color-sand-50)" strokeWidth="1.4" />
      <text x={c} y={c + 4} textAnchor="middle" fontFamily="var(--font-display)" fontWeight="600" fontSize={size * 0.32} fill="var(--color-ink-900)">
        {score}
      </text>
    </svg>
  );
}

function KnotMark({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
      <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="2.6" />
      <path d="M8 8 L24 24 M24 8 L8 24" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3.4" fill="currentColor" />
    </svg>
  );
}

const WAVE_D =
  'M0 20 Q 30 6 60 20 T 120 20 T 180 20 T 240 20 T 300 20 T 360 20 T 420 20 T 480 20 T 540 20 T 600 20 T 660 20 T 720 20 T 780 20 T 840 20 T 900 20 T 960 20 T 1020 20 T 1080 20 T 1140 20 T 1200 20 T 1260 20 T 1320 20 T 1380 20 T 1440 20 T 1500 20 T 1560 20 T 1620 20 V 60 H 0 Z';

function HarborScene() {
  return (
    <svg viewBox="0 0 1200 210" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="pp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#156373" />
          <stop offset="0.65" stopColor="#0b3d46" />
          <stop offset="1" stopColor="#072e35" />
        </linearGradient>
        <linearGradient id="pp-hull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14262a" />
          <stop offset="1" stopColor="#041f24" />
        </linearGradient>
      </defs>
      <rect width="1200" height="210" fill="url(#pp-sky)" />
      <circle cx="985" cy="52" r="26" fill="#f4ecda" opacity="0.85" />
      <circle cx="985" cy="52" r="38" fill="#f4ecda" opacity="0.12" />
      {/* distant cranes */}
      <g stroke="#041f24" strokeWidth="4" opacity="0.55" fill="none" strokeLinecap="round">
        <path d="M120 150 V 72 M120 78 L 210 60 M 210 60 V 74 M 96 150 H 146" />
        <path d="M310 150 V 86 M310 92 L 238 74 M 238 74 V 88 M 288 150 H 334" />
      </g>
      {/* container stacks on the far quay */}
      <g opacity="0.65">
        <rect x="60" y="132" width="46" height="18" fill="#96683a" />
        <rect x="110" y="132" width="46" height="18" fill="#1d7d8c" />
        <rect x="85" y="114" width="46" height="18" fill="#c44317" />
        <rect x="238" y="132" width="46" height="18" fill="#1d7d8c" />
        <rect x="288" y="132" width="46" height="18" fill="#96683a" />
      </g>
      {/* cargo ship */}
      <g>
        <path d="M520 168 L 540 138 H 760 L 786 168 Z" fill="url(#pp-hull)" />
        <rect x="560" y="120" width="42" height="18" fill="#e2572b" />
        <rect x="606" y="120" width="42" height="18" fill="#1d7d8c" />
        <rect x="652" y="120" width="42" height="18" fill="#b9854a" />
        <rect x="583" y="102" width="42" height="18" fill="#3aa0ad" />
        <rect x="629" y="102" width="42" height="18" fill="#c44317" />
        <rect x="712" y="92" width="26" height="46" fill="#14262a" />
        <rect x="716" y="98" width="18" height="7" fill="#a8dcdf" />
        <line x1="725" y1="92" x2="725" y2="76" stroke="#14262a" strokeWidth="3" />
        <path d="M725 76 h 20 l -6 6 h -14 Z" fill="#e2572b" />
      </g>
      {/* buoy */}
      <g className="anim-buoy">
        <path d="M880 172 l 8 -26 h 12 l 8 26 Z" fill="#e2572b" />
        <rect x="884" y="150" width="20" height="7" fill="#f4ecda" />
        <circle cx="894" cy="142" r="4" fill="#f4ecda" />
      </g>
      {/* gulls */}
      <g className="anim-gull" stroke="#eefaf8" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.9">
        <path d="M400 62 q 8 -8 16 0 q 8 -8 16 0" />
        <path d="M452 84 q 6 -6 12 0 q 6 -6 12 0" />
      </g>
      {/* water */}
      <rect y="164" width="1200" height="46" fill="#0b3d46" />
      <g className="anim-wave" opacity="0.5">
        <path d={WAVE_D} transform="translate(0,150) scale(1,0.9)" fill="#10505b" />
      </g>
      <g className="anim-wave-2" opacity="0.85">
        <path d={WAVE_D} transform="translate(-80,162)" fill="#072e35" />
      </g>
      <g className="anim-wave" opacity="0.35">
        <path d={WAVE_D} transform="translate(-40,172)" fill="#1d7d8c" />
      </g>
    </svg>
  );
}

function EmptyDock({ onDemo, onNew }) {
  return (
    <div className="crate-face mx-auto max-w-2xl rounded-2xl border border-sand-300 p-8 text-center shadow-crate">
      <svg viewBox="0 0 220 90" className="mx-auto mb-4 h-24 w-56" aria-hidden>
        <rect x="10" y="62" width="200" height="10" rx="2" fill="var(--color-plank)" />
        <g fill="var(--color-plank)" opacity="0.7">
          <rect x="24" y="72" width="8" height="14" />
          <rect x="104" y="72" width="8" height="14" />
          <rect x="186" y="72" width="8" height="14" />
        </g>
        <path d="M30 62 q 40 -34 80 -10" stroke="var(--color-rope-500)" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="1 6" />
        <circle cx="30" cy="58" r="4" fill="var(--color-rope-600)" />
        <path d="M150 30 q 10 -14 24 -8" stroke="var(--color-harbor-400)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M178 40 q 8 -10 18 -6" stroke="var(--color-harbor-400)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </svg>
      <h2 className="stencil text-xl font-semibold text-ink-900">The dock is clear</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
        Every partnership starts as a sail on the horizon. Log the companies whose audience overlaps yours, score the fit,
        and walk them lane by lane to an active berth.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <button onClick={onDemo} className="inline-flex items-center gap-2 rounded-lg bg-harbor-700 px-4 py-2 text-sm font-semibold text-foam shadow-crate hover:bg-harbor-600">
          <Ship className="h-4 w-4" aria-hidden /> Load the demo harbor
        </button>
        <button onClick={onNew} className="inline-flex items-center gap-2 rounded-lg border border-rope-500 bg-sand-50 px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-sand-200">
          <Plus className="h-4 w-4" aria-hidden /> Log your first partner
        </button>
      </div>
    </div>
  );
}

/* ================= markdown serializers ================= */

function portMd(port) {
  return [
    '## Home port (my company)',
    `- Company: ${port.company || '(not set)'}`,
    `- Offer: ${port.offer || '(not set)'}`,
    `- Audience: ${port.audience || '(not set)'}`,
  ].join('\n');
}

function partnerMd(p) {
  const s = fitScore(p);
  const lines = [
    `### ${p.name} — ${p.kind} (${LANES.find((l) => l.id === p.lane)?.label})`,
    `- Fit score: ${s}/100 (${fitTier(s).label}) — overlap ${p.overlap}/10, complementarity ${p.complement}/10, effort ${p.effort}/10`,
    `- Contact: ${p.contact || '(none yet)'}`,
    `- Their audience: ${p.audience || '(unknown)'}`,
  ];
  if (p.notes) lines.push(`- Notes: ${p.notes}`);
  if (p.ideas.length) {
    lines.push('- Co-marketing ideas:');
    p.ideas.forEach((i) => lines.push(`  - [${i.status}] ${i.title}`));
  }
  if (p.intro) lines.push('- Current intro draft:', '', '```', p.intro, '```');
  return lines.join('\n');
}

function boardMd(db) {
  const out = [`# Partner Pipeline — Harbor Manifest`, `_Exported ${new Date().toLocaleDateString()}_`, '', portMd(db.port), ''];
  LANES.forEach((lane) => {
    const rows = db.partners.filter((p) => p.lane === lane.id).sort((a, b) => fitScore(b) - fitScore(a));
    out.push(`## ${lane.label} (${rows.length}) — ${lane.sub}`);
    if (!rows.length) {
      out.push('_No partners in this lane._', '');
      return;
    }
    out.push('', '| Partner | Kind | Fit | Overlap | Complement | Effort | Contact |', '| --- | --- | --- | --- | --- | --- | --- |');
    rows.forEach((p) =>
      out.push(`| ${p.name} | ${p.kind} | ${fitScore(p)}/100 | ${p.overlap} | ${p.complement} | ${p.effort} | ${p.contact || '—'} |`)
    );
    out.push('');
    rows.forEach((p) => out.push(partnerMd(p), ''));
  });
  return out.join('\n');
}

/* ================= copilot prompts ================= */

const COPILOT_ACTIONS = [
  {
    id: 'angles',
    icon: Compass,
    needsPartner: true,
    title: 'Chart partnership angles',
    desc: 'Find the strongest angles between your company and one partner.',
  },
  {
    id: 'pitch',
    icon: Handshake,
    needsPartner: true,
    title: 'Draft the partnership pitch',
    desc: 'A first outreach email plus a LinkedIn DM variant.',
  },
  {
    id: 'revshare',
    icon: Percent,
    needsPartner: true,
    title: 'Design a rev-share structure',
    desc: 'Three commercial structures to propose, with guardrails.',
  },
  {
    id: 'rank',
    icon: ListOrdered,
    needsPartner: false,
    title: 'Rank my dock',
    desc: 'Prioritize the whole board and pick next actions.',
  },
];

function buildPrompt(actionId, db, partner, consoleCtx) {
  const head = [];
  if (consoleCtx) {
    const c = consoleCtx;
    head.push('## Operator context (from my BizDev console)');
    if (c.claude?.userName || c.claude?.company) head.push(`- Operator: ${c.claude?.userName || ''} ${c.claude?.company ? `at ${c.claude.company}` : ''}`.trim());
    if (c.profile?.offer) head.push(`- Offer: ${c.profile.offer}`);
    if (c.profile?.icp) head.push(`- ICP: ${c.profile.icp}`);
    if (c.claude?.voiceNotes) head.push(`- Voice notes: ${c.claude.voiceNotes}`);
    head.push('');
  }
  const port = portMd(db.port);

  if (actionId === 'angles' && partner) {
    return [
      'You are a channel-partnerships strategist who has built partner programs at several B2B software and services companies. You think in terms of audience overlap, complementary value, and what each side actually earns from the deal.',
      '',
      ...head,
      port,
      '',
      '## The partner I am evaluating',
      partnerMd(partner),
      '',
      '## Your task',
      'Find the strongest partnership angles between these two companies. For each angle, be specific about the mechanism (what we actually do together), what each side gives, and what each side gets.',
      '',
      '## Output format',
      '1. A markdown table of 6–8 distinct angles: | Angle | Mechanism | We give | They get | Effort (L/M/H) | Expected payoff |',
      '2. Your top pick, with 3 sentences on why it wins for BOTH sides.',
      '3. The single sentence I should lead with when I propose it.',
      '4. One risk or misalignment I should watch for with this specific partner.',
      'Use only what is plausible from the data above — flag any assumption you make.',
    ].join('\n');
  }

  if (actionId === 'pitch' && partner) {
    return [
      'You are a business-development writer who drafts partnership outreach that gets replies: specific, generous, zero fluff, obviously written for the recipient.',
      '',
      ...head,
      port,
      '',
      '## The partner I am pitching',
      partnerMd(partner),
      '',
      '## Your task',
      'Draft the partnership pitch for this partner.',
      '',
      '## Output format',
      '1. **Email** — subject line + 120–150 word body. Lead with what is in it for them, name one concrete first project we could run in 30 days, end with a single low-friction CTA (a 20-minute call or an async yes/no).',
      '2. **LinkedIn DM variant** — max 60 words, same idea, warmer register.',
      '3. **Three subject-line alternates**, each under 7 words.',
      partner.intro ? 'Use my current intro draft above as raw material — keep what works, fix what does not, and tell me in one line what you changed and why.' : 'I have no draft yet — start from the notes and fit data above.',
      'Match the specificity of my notes; do not invent metrics I did not give you.',
    ].join('\n');
  }

  if (actionId === 'revshare' && partner) {
    return [
      'You are a partnerships commercial lead who designs revenue-share and referral structures that partners actually sign — simple to administer, fair on both sides, with guardrails against channel conflict.',
      '',
      ...head,
      port,
      '',
      '## The partner',
      partnerMd(partner),
      '',
      '## Your task',
      'Design three alternative commercial structures I could propose to this partner, ranging from lightest to deepest commitment (for example: referral fee, reseller margin, co-sell split — adapt to what fits this pair).',
      '',
      '## Output format',
      'For each structure give:',
      '- Name and one-line summary',
      '- The % or fee mechanics (state your assumption about my price point if needed)',
      '- What triggers a payout, and payout cadence',
      '- Who owns the customer relationship and renewal',
      '- Guardrails (attribution window, deal registration, minimums, exit clause)',
      'Then: which one to open with for THIS partner given their lane and effort score, and the one negotiation lever I should hold back.',
    ].join('\n');
  }

  // rank
  return [
    'You are a fractional VP of Partnerships doing a pipeline review. You are decisive: you rank, you cut, and you name the next physical action for each bet.',
    '',
    ...head,
    port,
    '',
    '## My full partner board',
    ...LANES.map((lane) => {
      const rows = db.partners.filter((p) => p.lane === lane.id);
      return [`### ${lane.label} (${rows.length})`, ...(rows.length ? rows.map((p) => partnerMd(p)) : ['_empty_'])].join('\n\n');
    }),
    '',
    '## Your task',
    'Review the whole dock. My fit score weights audience overlap 40%, complementarity 40%, and ease of execution 20%.',
    '',
    '## Output format',
    '1. **Top 5 priorities**, ranked — for each: why it ranks there, and the single next action for the coming week.',
    '2. **Park or cut** — which partners are not worth the effort right now, said plainly.',
    '3. **Gaps** — one partner type missing from my board given my offer and audience.',
    '4. **This week** — a 5-item action list I can execute in under 3 hours total.',
  ].join('\n');
}

/* ================= small UI atoms ================= */

function Btn({ children, onClick, kind = 'ghost', className = '', ...rest }) {
  const base = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors';
  const kinds = {
    ghost: 'text-foam/90 hover:bg-foam/10 border border-foam/25',
    solid: 'bg-buoy-500 text-foam hover:bg-buoy-400 shadow-crate',
    paper: 'border border-sand-300 bg-sand-50 text-ink-900 hover:bg-sand-200',
    teal: 'bg-harbor-700 text-foam hover:bg-harbor-600 shadow-crate',
  };
  return (
    <button onClick={onClick} className={`${base} ${kinds[kind]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="stencil mb-1 block text-[11px] font-semibold text-ink-500">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full rounded-md border border-sand-300 bg-sand-50 px-2.5 py-1.5 text-sm text-ink-900 placeholder:text-ink-500/60 focus:border-harbor-500';

function Meter({ label, hint, value, onChange, invert = false }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="stencil text-[11px] font-semibold text-ink-500">{label}</span>
        <span className="font-display text-sm font-semibold tabular-nums text-ink-900">{value}/10</span>
      </div>
      <input
        type="range" min="0" max="10" step="1" value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-harbor-600)]"
        aria-label={`${label}: ${value} of 10`}
      />
      <p className="text-[11px] leading-tight text-ink-500">{hint}{invert ? ' (lower is better)' : ''}</p>
    </div>
  );
}

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/60 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`drawer-in mt-8 w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl border border-sand-300 bg-sand-50 shadow-deep`}>
        <div className="flex items-center justify-between border-b border-sand-200 px-5 py-3">
          <h2 className="stencil text-base font-semibold text-ink-900">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="rounded-md p-1.5 text-ink-500 hover:bg-sand-200 hover:text-ink-900">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ================= partner card ================= */

function PartnerCard({ p, onOpen, onMove, onDelete, onFlag }) {
  const s = fitScore(p);
  const laneIdx = LANE_IDS.indexOf(p.lane);
  return (
    <article
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)}
      className="crate-face group relative cursor-grab rounded-xl border border-sand-300 p-3 shadow-crate transition-shadow hover:shadow-deep"
    >
      {p.flagged && (
        <svg className="absolute -top-2 right-3 h-5 w-4" viewBox="0 0 16 20" aria-hidden>
          <path d="M2 0 h12 v14 l-6 -4 -6 4 Z" fill="var(--color-buoy-500)" />
        </svg>
      )}
      <div className="flex items-start gap-3">
        <FitDial score={s} size={46} />
        <div className="min-w-0 flex-1">
          <button onClick={() => onOpen(p.id)} className="block w-full text-left">
            <h3 className="truncate font-display text-[15px] font-semibold leading-tight text-ink-900 group-hover:text-harbor-700">{p.name}</h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-500">
              <span className="rounded-sm border border-harbor-300 bg-harbor-100 px-1.5 py-px font-semibold text-harbor-700">{p.kind}</span>
              <span>{fitTier(s).label}</span>
              {p.ideas.length > 0 && (
                <span className="inline-flex items-center gap-0.5"><Lightbulb className="h-3 w-3" aria-hidden />{p.ideas.length}</span>
              )}
            </p>
          </button>
          {p.contact && <p className="mt-1 truncate text-[11px] text-ink-500">{p.contact}</p>}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-dashed border-sand-300 pt-2">
        <div className="flex items-center gap-1">
          <button onClick={() => onMove(p, -1)} disabled={laneIdx === 0} aria-label={`Move ${p.name} back a lane`}
            className="rounded-md p-1 text-ink-500 hover:bg-sand-200 hover:text-ink-900 disabled:opacity-25">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button onClick={() => onMove(p, 1)} disabled={laneIdx === LANE_IDS.length - 1} aria-label={`Advance ${p.name} a lane`}
            className="rounded-md p-1 text-ink-500 hover:bg-sand-200 hover:text-ink-900 disabled:opacity-25">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onFlag(p)} aria-label={p.flagged ? `Unflag ${p.name}` : `Flag ${p.name} as priority`}
            className={`rounded-md p-1 hover:bg-sand-200 ${p.flagged ? 'text-buoy-500' : 'text-ink-500 hover:text-ink-900'}`}>
            <Flag className="h-4 w-4" aria-hidden />
          </button>
          <button onClick={() => onOpen(p.id)} aria-label={`Open manifest for ${p.name}`} className="rounded-md p-1 text-ink-500 hover:bg-sand-200 hover:text-ink-900">
            <PenLine className="h-4 w-4" aria-hidden />
          </button>
          <button onClick={() => onDelete(p)} aria-label={`Delete ${p.name}`} className="rounded-md p-1 text-ink-500 hover:bg-sand-200 hover:text-buoy-600">
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}

/* ================= drawer (manifest) ================= */

function Drawer({ p, upd, onClose, onDelete, port }) {
  const s = fitScore(p);
  const [ideaText, setIdeaText] = useState('');
  const addIdea = () => {
    const t = ideaText.trim();
    if (!t) return;
    upd(p.id, { ideas: [...p.ideas, { id: uid(), title: t, status: 'spark' }] });
    setIdeaText('');
  };
  const seedIntro = () => {
    const draft = [
      `Subject: ${port.company || '[Your company]'} x ${p.name} — one idea worth 20 minutes`,
      '',
      `Hi ${p.contact ? p.contact.split(',')[0] : '[first name]'},`,
      '',
      `I run ${port.company || '[your company]'} — ${port.offer || '[what you do, for whom]'}. Your audience (${p.audience || 'the people you serve'}) overlaps ours almost exactly, and we do complementary, not competing, work.`,
      '',
      `Concrete idea to start: [one specific co-marketing project — see ideas list]. We'd bring [what you give]; you'd get [what they get].`,
      '',
      `Open to 20 minutes next week to see if it's worth a pilot?`,
    ].join('\n');
    upd(p.id, { intro: draft });
  };
  return (
    <aside className="drawer-in fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l-4 border-rope-500 bg-sand-50 shadow-deep">
      <div className="water-surface flex items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <p className="stencil text-[10px] font-semibold text-harbor-300">Cargo manifest</p>
          <input
            value={p.name}
            onChange={(e) => upd(p.id, { name: e.target.value })}
            aria-label="Partner name"
            className="mt-0.5 w-full rounded-md border border-transparent bg-transparent font-display text-xl font-semibold text-foam focus:border-harbor-400 focus:bg-harbor-900/40"
          />
        </div>
        <button onClick={onClose} aria-label="Close manifest" className="rounded-md p-1.5 text-foam/80 hover:bg-foam/10">
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kind">
            <select value={p.kind} onChange={(e) => upd(p.id, { kind: e.target.value })} className={inputCls}>
              {KINDS.map((k) => <option key={k}>{k}</option>)}
            </select>
          </Field>
          <Field label="Lane">
            <select value={p.lane} onChange={(e) => upd(p.id, { lane: e.target.value })} className={inputCls}>
              {LANES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Contact person">
          <input value={p.contact} onChange={(e) => upd(p.id, { contact: e.target.value })} className={inputCls} placeholder="Name, role" />
        </Field>
        <Field label="Their audience / reach">
          <input value={p.audience} onChange={(e) => upd(p.id, { audience: e.target.value })} className={inputCls} placeholder="e.g. 30k newsletter, 40 retainer clients" />
        </Field>

        <section className="rounded-xl border border-sand-300 bg-sand-100 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="stencil text-xs font-semibold text-ink-700">Fit soundings</h3>
            <div className="flex items-center gap-2">
              <FitDial score={s} size={40} stroke={4} />
              <span className="text-xs font-semibold" style={{ color: fitTier(s).color }}>{fitTier(s).label}</span>
            </div>
          </div>
          <div className="space-y-2.5">
            <Meter label="Audience overlap" hint="How much of their audience is your buyer?" value={p.overlap} onChange={(v) => upd(p.id, { overlap: v })} />
            <Meter label="Complementarity" hint="Adjacent value, not competing for the same budget." value={p.complement} onChange={(v) => upd(p.id, { complement: v })} />
            <Meter label="Effort to activate" hint="Work needed to get value flowing." value={p.effort} onChange={(v) => upd(p.id, { effort: v })} invert />
          </div>
        </section>

        <Field label="Notes / signals">
          <textarea rows={4} value={p.notes} onChange={(e) => upd(p.id, { notes: e.target.value })} className={inputCls} placeholder="What you know: their incentives, timing, who decides, past signals." />
        </Field>

        <section>
          <h3 className="stencil mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-700">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden /> Co-marketing ideas
          </h3>
          {p.ideas.length === 0 && <p className="mb-2 text-xs text-ink-500">No ideas logged. Small, concrete projects beat grand alliances.</p>}
          <ul className="space-y-1.5">
            {p.ideas.map((i) => (
              <li key={i.id} className="flex items-center gap-2 rounded-md border border-sand-300 bg-sand-50 px-2 py-1.5">
                <button
                  onClick={() => upd(p.id, { ideas: p.ideas.map((x) => x.id === i.id ? { ...x, status: IDEA_STATUS[(IDEA_STATUS.indexOf(x.status) + 1) % 3] } : x) })}
                  aria-label={`Idea status ${i.status} — click to advance`}
                  className={`stencil shrink-0 rounded-sm px-1.5 py-px text-[10px] font-bold ${
                    i.status === 'live' ? 'bg-harbor-700 text-foam' : i.status === 'planned' ? 'bg-rope-400 text-ink-900' : 'bg-sand-200 text-ink-700'
                  }`}
                >
                  {i.status}
                </button>
                <span className="min-w-0 flex-1 text-xs text-ink-900">{i.title}</span>
                <button onClick={() => upd(p.id, { ideas: p.ideas.filter((x) => x.id !== i.id) })} aria-label={`Remove idea: ${i.title}`}
                  className="shrink-0 rounded p-0.5 text-ink-500 hover:text-buoy-600">
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <input value={ideaText} onChange={(e) => setIdeaText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addIdea()}
              className={inputCls} placeholder="e.g. Joint webinar on churn benchmarks" aria-label="New co-marketing idea" />
            <button onClick={addIdea} aria-label="Add idea" className="shrink-0 rounded-md bg-harbor-700 px-2.5 text-foam hover:bg-harbor-600">
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </section>

        <section>
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="stencil flex items-center gap-1.5 text-xs font-semibold text-ink-700">
              <FileText className="h-3.5 w-3.5" aria-hidden /> Intro-request draft
            </h3>
            <button onClick={seedIntro} className="text-xs font-semibold text-harbor-700 underline-offset-2 hover:underline">Seed a template</button>
          </div>
          <textarea rows={7} value={p.intro} onChange={(e) => upd(p.id, { intro: e.target.value })} className={`${inputCls} font-mono text-xs leading-relaxed`}
            placeholder="Your outreach draft lives here. Seed a template, then let the Copilot sharpen it." />
        </section>

        <button onClick={() => onDelete(p)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-buoy-600 hover:text-buoy-500">
          <Trash2 className="h-3.5 w-3.5" aria-hidden /> Scuttle this partner
        </button>
      </div>
    </aside>
  );
}

/* ================= main app ================= */

export default function App() {
  const [db, setDb] = useState(load);
  const [helpOpen, setHelpOpen] = useState(() => !load().seenGuide);
  const [modal, setModal] = useState(null); // 'export' | 'reset' | null
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('fit');
  const [kindFilter, setKindFilter] = useState('all');
  const [copilot, setCopilot] = useState({ action: 'angles', partnerId: null });
  const [toast, setToast] = useState(null);
  const [undo, setUndo] = useState(null);
  const [dragOver, setDragOver] = useState(null);
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

  const upd = (id, patch) =>
    setDb((d) => ({ ...d, partners: d.partners.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));

  const movePartner = (p, dir) => {
    const idx = LANE_IDS.indexOf(p.lane) + dir;
    if (idx < 0 || idx >= LANE_IDS.length) return;
    upd(p.id, { lane: LANE_IDS[idx] });
  };

  const deletePartner = (p) => {
    setDb((d) => ({ ...d, partners: d.partners.filter((x) => x.id !== p.id) }));
    if (selectedId === p.id) setSelectedId(null);
    clearTimeout(undoTimer.current);
    setUndo({ msg: `${p.name} scuttled`, restore: () => setDb((d) => ({ ...d, partners: [...d.partners, p] })) });
    undoTimer.current = setTimeout(() => setUndo(null), 7000);
  };

  const addPartner = () => {
    const p = normalizePartner({ name: 'New partner', lane: 'identified', overlap: 5, complement: 5, effort: 5 });
    setDb((d) => ({ ...d, partners: [...d.partners, p] }));
    setSelectedId(p.id);
  };

  const loadDemo = () => {
    setDb((d) => normalize({ ...DEMO, seenGuide: d.seenGuide }));
    setSelectedId(null);
    say('Demo harbor loaded — 8 partners across the lanes');
  };

  const doReset = () => {
    setDb((d) => normalize({ seenGuide: d.seenGuide }));
    setSelectedId(null);
    setModal(null);
    say('Harbor cleared');
  };

  const closeHelp = () => {
    setHelpOpen(false);
    setDb((d) => (d.seenGuide ? d : { ...d, seenGuide: true }));
  };

  const copyMarkdown = async () => {
    await copyText(boardMd(db));
    say('Harbor manifest copied as Markdown');
  };
  const exportJson = () => {
    downloadFile('partner-pipeline.json', JSON.stringify(db, null, 2), 'application/json');
    say('JSON downloaded');
  };
  const exportCsv = () => {
    const rows = [
      ['name', 'kind', 'lane', 'fit', 'overlap', 'complementarity', 'effort', 'contact', 'audience', 'ideas', 'notes'].join(','),
      ...db.partners.map((p) =>
        [p.name, p.kind, p.lane, fitScore(p), p.overlap, p.complement, p.effort, p.contact, p.audience, p.ideas.map((i) => `[${i.status}] ${i.title}`).join(' | '), p.notes].map(csvCell).join(',')
      ),
    ].join('\n');
    downloadFile('partner-pipeline.csv', rows, 'text/csv');
    say('CSV downloaded');
  };
  const importJson = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setDb(normalize(JSON.parse(String(reader.result))));
        say('Manifest imported');
      } catch {
        say('Could not read that file — expecting Partner Pipeline JSON');
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
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); addPartner(); }
      if (e.key === '/') {
        e.preventDefault();
        document.getElementById('pp-search')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* derived */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = db.partners;
    if (kindFilter !== 'all') rows = rows.filter((p) => p.kind === kindFilter);
    if (q) rows = rows.filter((p) => [p.name, p.contact, p.notes, p.audience].join(' ').toLowerCase().includes(q));
    const sorters = {
      fit: (a, b) => fitScore(b) - fitScore(a),
      name: (a, b) => a.name.localeCompare(b.name),
      newest: (a, b) => b.added - a.added,
    };
    return [...rows].sort(sorters[sortBy] || sorters.fit);
  }, [db.partners, query, sortBy, kindFilter]);

  const selected = db.partners.find((p) => p.id === selectedId) || null;
  const avgFit = db.partners.length ? Math.round(db.partners.reduce((s, p) => s + fitScore(p), 0) / db.partners.length) : 0;
  const ideasCount = db.partners.reduce((s, p) => s + p.ideas.length, 0);
  const copilotPartner = db.partners.find((p) => p.id === copilot.partnerId) || db.partners[0] || null;
  const activeAction = COPILOT_ACTIONS.find((a) => a.id === copilot.action) || COPILOT_ACTIONS[0];
  const prompt = useMemo(() => {
    if (activeAction.needsPartner && !copilotPartner) return '';
    return buildPrompt(activeAction.id, db, copilotPartner, consoleCtx);
  }, [activeAction, db, copilotPartner, consoleCtx]);

  const onDrop = (laneId, e) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData('text/plain');
    if (id) upd(id, { lane: laneId });
  };

  return (
    <div className="harbor-ground min-h-screen font-body text-ink-900">
      {/* ============ header / hero ============ */}
      <header className="no-print relative overflow-hidden text-foam">
        <HarborScene />
        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-lg border-2 border-rope-400 bg-harbor-900/70 text-rope-400 shadow-crate">
                  <Anchor className="h-5 w-5" aria-hidden />
                </span>
                <h1 className="stencil font-display text-2xl font-semibold tracking-[0.14em] sm:text-3xl">
                  Partner<span className="text-rope-400"> Pipeline</span>
                </h1>
                {consoleCtx && (
                  <span className="stencil rounded-sm border border-harbor-300/60 bg-harbor-900/60 px-1.5 py-0.5 text-[10px] text-harbor-200">Console linked</span>
                )}
              </div>
              <p className="mt-2 max-w-xl text-sm text-harbor-100/90">
                Source, score, and steer channel partnerships — from a sail on the horizon to an active berth in your harbor.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Btn onClick={loadDemo}><Ship className="h-4 w-4" aria-hidden /> Load demo</Btn>
              <Btn onClick={() => setModal('reset')}><RotateCcw className="h-4 w-4" aria-hidden /> Reset</Btn>
              <Btn onClick={() => setHelpOpen(true)}><HelpCircle className="h-4 w-4" aria-hidden /> How to use</Btn>
              <Btn kind="solid" onClick={() => setModal('export')}><Download className="h-4 w-4" aria-hidden /> Export</Btn>
            </div>
          </div>
          {/* stat strip */}
          <div className="mt-6 flex flex-wrap gap-2.5">
            {[
              { icon: Package, label: 'Partners on the board', value: db.partners.length },
              { icon: Handshake, label: 'Active berths', value: db.partners.filter((p) => p.lane === 'active').length },
              { icon: Compass, label: 'Average fit', value: `${avgFit}/100` },
              { icon: Lightbulb, label: 'Co-marketing ideas', value: ideasCount },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2.5 rounded-lg border border-foam/15 bg-harbor-900/55 px-3 py-2 backdrop-blur-sm">
                <s.icon className="h-4 w-4 text-rope-400" aria-hidden />
                <div>
                  <div className="font-display text-lg font-semibold leading-none tabular-nums">{s.value}</div>
                  <div className="stencil text-[9px] text-harbor-200">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rope-rule relative" />
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* ============ home port + toolbar ============ */}
        <section className="no-print mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="crate-face flex flex-wrap items-end gap-3 rounded-xl border border-sand-300 p-3 shadow-crate">
            <div className="flex items-center gap-2 pr-1 text-harbor-700">
              <KnotMark className="h-6 w-6" />
              <span className="stencil text-xs font-semibold">Home port</span>
            </div>
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
              <input value={db.port.company} onChange={(e) => setDb((d) => ({ ...d, port: { ...d.port, company: e.target.value } }))}
                className={inputCls} placeholder="Your company" aria-label="Your company name" />
              <input value={db.port.offer} onChange={(e) => setDb((d) => ({ ...d, port: { ...d.port, offer: e.target.value } }))}
                className={inputCls} placeholder="Your offer + price point" aria-label="Your offer" />
              <input value={db.port.audience} onChange={(e) => setDb((d) => ({ ...d, port: { ...d.port, audience: e.target.value } }))}
                className={inputCls} placeholder="Your audience / ICP" aria-label="Your audience" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" aria-hidden />
              <input id="pp-search" value={query} onChange={(e) => setQuery(e.target.value)}
                className={`${inputCls} w-44 pl-8`} placeholder="Search the dock  ( / )" aria-label="Search partners" />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-ink-500">
              <ArrowUpDown className="h-3.5 w-3.5" aria-hidden />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`${inputCls} w-auto`} aria-label="Sort partners">
                <option value="fit">Best fit first</option>
                <option value="name">Name A–Z</option>
                <option value="newest">Newest first</option>
              </select>
            </label>
            <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} className={`${inputCls} w-auto`} aria-label="Filter by kind">
              <option value="all">All kinds</option>
              {KINDS.map((k) => <option key={k}>{k}</option>)}
            </select>
            <Btn kind="teal" onClick={addPartner}><Plus className="h-4 w-4" aria-hidden /> New partner <span className="stencil text-[10px] opacity-70">N</span></Btn>
          </div>
        </section>

        {/* ============ lanes ============ */}
        {db.partners.length === 0 ? (
          <div className="no-print py-10"><EmptyDock onDemo={loadDemo} onNew={addPartner} /></div>
        ) : (
          <section className="no-print grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Partner lanes">
            {LANES.map((lane, li) => {
              const rows = visible.filter((p) => p.lane === lane.id);
              const laneAvg = rows.length ? Math.round(rows.reduce((s, p) => s + fitScore(p), 0) / rows.length) : null;
              return (
                <div key={lane.id}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(lane.id); }}
                  onDragLeave={() => setDragOver((v) => (v === lane.id ? null : v))}
                  onDrop={(e) => onDrop(lane.id, e)}
                  className={`rounded-2xl border-2 p-2.5 transition-colors ${dragOver === lane.id ? 'border-buoy-400 bg-buoy-400/10' : 'border-sand-300/80 bg-sand-200/45'}`}
                >
                  <header className="mb-2.5 px-1">
                    <div className="flex items-center justify-between">
                      <h2 className="stencil flex items-center gap-2 text-sm font-semibold text-ink-900">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-harbor-700 text-[10px] font-bold text-foam">{li + 1}</span>
                        {lane.label}
                      </h2>
                      <span className="rounded-full border border-sand-300 bg-sand-50 px-2 py-px font-display text-xs font-semibold tabular-nums text-ink-700">
                        {rows.length}{laneAvg !== null && <span className="text-ink-500"> · fit {laneAvg}</span>}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] italic text-ink-500">{lane.sub}</p>
                  </header>
                  <div className="space-y-2.5">
                    {rows.map((p) => (
                      <PartnerCard key={p.id} p={p} onOpen={setSelectedId} onMove={movePartner} onDelete={deletePartner}
                        onFlag={(x) => upd(x.id, { flagged: !x.flagged })} />
                    ))}
                    {rows.length === 0 && (
                      <p className="rounded-xl border-2 border-dashed border-sand-300 px-3 py-6 text-center text-xs text-ink-500">
                        No vessels berthed. Drag a card here or advance one with the arrows.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* ============ copilot ============ */}
        <section className="no-print mt-8" aria-label="Claude Copilot">
          <div className="rope-rule mb-5" />
          <div className="overflow-hidden rounded-2xl border border-harbor-800 bg-harbor-900 text-foam shadow-deep">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-harbor-800 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-rope-500/20 text-rope-400"><Sparkles className="h-4 w-4" aria-hidden /></span>
                <div>
                  <h2 className="stencil font-display text-base font-semibold">First Mate — Claude Copilot</h2>
                  <p className="text-[11px] text-harbor-200">Generates a complete prompt from your board. Paste into claude.ai — works with the standard Claude subscription, no API key.</p>
                </div>
              </div>
              {activeAction.needsPartner && db.partners.length > 0 && (
                <label className="flex items-center gap-2 text-xs text-harbor-200">
                  <LifeBuoy className="h-3.5 w-3.5" aria-hidden /> Partner:
                  <select
                    value={copilotPartner?.id || ''}
                    onChange={(e) => setCopilot((c) => ({ ...c, partnerId: e.target.value }))}
                    className="rounded-md border border-harbor-700 bg-harbor-800 px-2 py-1 text-foam"
                    aria-label="Choose partner for Copilot"
                  >
                    {db.partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
              )}
            </div>
            <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
              <div className="flex flex-col gap-2 border-b border-harbor-800 p-4 lg:border-b-0 lg:border-r">
                {COPILOT_ACTIONS.map((a) => (
                  <button key={a.id} onClick={() => setCopilot((c) => ({ ...c, action: a.id }))}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      copilot.action === a.id ? 'border-rope-400 bg-rope-500/15' : 'border-harbor-700 bg-harbor-800/60 hover:border-harbor-500'
                    }`}
                  >
                    <span className="flex items-center gap-2 font-display text-sm font-semibold">
                      <a.icon className="h-4 w-4 text-rope-400" aria-hidden /> {a.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-harbor-200">{a.desc}</span>
                  </button>
                ))}
              </div>
              <div className="p-4">
                {prompt ? (
                  <>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="stencil text-[10px] font-semibold text-harbor-300">Prompt · {activeAction.title}{activeAction.needsPartner && copilotPartner ? ` · ${copilotPartner.name}` : ''}</span>
                      <Btn kind="solid" onClick={async () => { await copyText(prompt); say('Prompt copied — paste into claude.ai'); }}>
                        <Copy className="h-4 w-4" aria-hidden /> Copy prompt
                      </Btn>
                    </div>
                    <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-harbor-700 bg-harbor-950/70 p-3.5 font-mono text-[11.5px] leading-relaxed text-harbor-100">{prompt}</pre>
                  </>
                ) : (
                  <p className="rounded-xl border-2 border-dashed border-harbor-700 px-4 py-8 text-center text-sm text-harbor-200">
                    Log at least one partner (or load the demo) and the First Mate will draft the prompt from your live board.
                  </p>
                )}
                <label className="mt-3 block">
                  <span className="stencil mb-1 block text-[10px] font-semibold text-harbor-300">Log Claude's answer (saved with your harbor)</span>
                  <textarea rows={3} value={db.copilotNotes} onChange={(e) => setDb((d) => ({ ...d, copilotNotes: e.target.value }))}
                    className="w-full rounded-xl border border-harbor-700 bg-harbor-800/60 p-2.5 text-xs text-foam placeholder:text-harbor-300/50"
                    placeholder="Paste the useful parts of Claude's answer here so the thinking stays with the board." />
                </label>
              </div>
            </div>
          </div>
        </section>

        <footer className="no-print mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-sand-300 pb-8 pt-4 text-[11px] text-ink-500">
          <span className="stencil">Partner Pipeline · harbor edition</span>
          <span>Data stays in this browser (localStorage). Press ? for help · Ctrl/Cmd+S copies the manifest.</span>
        </footer>
      </main>

      {/* ============ print sheet ============ */}
      <section className="print-only print-sheet p-8 text-ink-900">
        <h1 className="font-display text-2xl font-semibold">Partner Pipeline — Harbor Manifest</h1>
        <p className="text-xs">{db.port.company || 'Home port not set'} · exported {new Date().toLocaleDateString()}</p>
        {LANES.map((lane) => {
          const rows = db.partners.filter((p) => p.lane === lane.id).sort((a, b) => fitScore(b) - fitScore(a));
          return (
            <div key={lane.id} className="mt-5">
              <h2 className="stencil border-b border-ink-500 pb-1 text-sm font-semibold">{lane.label} ({rows.length})</h2>
              {rows.map((p) => (
                <div key={p.id} className="mt-2 border-b border-dashed border-sand-300 pb-2 text-xs">
                  <strong className="font-display text-sm">{p.name}</strong> — {p.kind} · fit {fitScore(p)}/100 · {p.contact || 'no contact yet'}
                  {p.notes && <p className="mt-0.5">{p.notes}</p>}
                  {p.ideas.length > 0 && <p className="mt-0.5">Ideas: {p.ideas.map((i) => `[${i.status}] ${i.title}`).join(' · ')}</p>}
                </div>
              ))}
              {rows.length === 0 && <p className="mt-1 text-xs italic">Empty lane.</p>}
            </div>
          );
        })}
      </section>

      {/* ============ drawer ============ */}
      {selected && <Drawer p={selected} upd={upd} onClose={() => setSelectedId(null)} onDelete={deletePartner} port={db.port} />}

      {/* ============ modals ============ */}
      {helpOpen && (
        <Modal title="How to run your harbor" onClose={closeHelp} wide>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-700">
            <li><strong>Set your home port.</strong> Company, offer, and audience power every fit score conversation and every Copilot prompt.</li>
            <li><strong>Log partners</strong> with <em>New partner</em> (or press <kbd className="rounded border border-sand-300 bg-sand-200 px-1">N</kbd>). Start them in <em>Identified</em>.</li>
            <li><strong>Sound the fit.</strong> Open a card's manifest and set the three sliders — audience overlap, complementarity, effort. The dial computes a 0–100 fit score (overlap 40%, complementarity 40%, ease 20%).</li>
            <li><strong>Work the lanes.</strong> Drag cards (or use the arrows) through Identified → Contacted → Exploring → Active as the relationship progresses.</li>
            <li><strong>Stack co-marketing ideas</strong> on each partner and advance them spark → planned → live.</li>
            <li><strong>Draft the intro</strong> in the manifest — seed the template, then sharpen it with the First Mate's pitch prompt.</li>
            <li><strong>Use the First Mate.</strong> Pick an action, copy the generated prompt, paste it into claude.ai (standard $20 subscription — no API key), and log the answer back.</li>
            <li><strong>Export.</strong> Copy the Markdown manifest, download JSON/CSV, or print the manifest for a partner review.</li>
          </ol>
          <h3 className="stencil mt-4 text-xs font-semibold text-ink-700">Keyboard</h3>
          <table className="mt-1.5 w-full text-sm text-ink-700">
            <tbody>
              {[
                ['?', 'Open this guide'],
                ['Esc', 'Close dialogs and the manifest drawer'],
                ['N', 'New partner'],
                ['/', 'Focus search'],
                ['Ctrl/Cmd + S', 'Copy the Markdown manifest'],
              ].map(([k, v]) => (
                <tr key={k} className="border-t border-sand-200">
                  <td className="py-1 pr-3 font-mono text-xs font-semibold">{k}</td>
                  <td className="py-1">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 text-right">
            <Btn kind="teal" onClick={closeHelp}><Check className="h-4 w-4" aria-hidden /> Cast off</Btn>
          </div>
        </Modal>
      )}

      {modal === 'reset' && (
        <Modal title="Clear the harbor?" onClose={() => setModal(null)}>
          <p className="text-sm text-ink-700">
            This removes every partner, idea, and draft from this browser. Download a JSON backup first if you might want it back.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Btn kind="paper" onClick={() => setModal(null)}>Keep everything</Btn>
            <Btn kind="paper" onClick={exportJson}><FileJson className="h-4 w-4" aria-hidden /> Backup JSON</Btn>
            <Btn kind="solid" onClick={doReset}><RotateCcw className="h-4 w-4" aria-hidden /> Yes, clear it</Btn>
          </div>
        </Modal>
      )}

      {modal === 'export' && (
        <Modal title="Export the manifest" onClose={() => setModal(null)}>
          <div className="grid gap-2">
            <Btn kind="paper" onClick={() => { copyMarkdown(); setModal(null); }} className="justify-start">
              <FileText className="h-4 w-4 text-harbor-700" aria-hidden /> Copy Markdown manifest <span className="ml-auto text-[10px] text-ink-500">Ctrl/Cmd+S</span>
            </Btn>
            <Btn kind="paper" onClick={exportJson} className="justify-start">
              <FileJson className="h-4 w-4 text-harbor-700" aria-hidden /> Download JSON (full state)
            </Btn>
            <Btn kind="paper" onClick={exportCsv} className="justify-start">
              <FileSpreadsheet className="h-4 w-4 text-harbor-700" aria-hidden /> Download CSV (partner table)
            </Btn>
            <Btn kind="paper" onClick={() => fileRef.current?.click()} className="justify-start">
              <Upload className="h-4 w-4 text-harbor-700" aria-hidden /> Import JSON backup
            </Btn>
            <Btn kind="paper" onClick={() => window.print()} className="justify-start">
              <Printer className="h-4 w-4 text-harbor-700" aria-hidden /> Print the manifest
            </Btn>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={importJson} className="hidden" aria-label="Import JSON file" />
        </Modal>
      )}

      {/* ============ toasts ============ */}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2">
        {undo && (
          <div className="toast-in pointer-events-auto flex items-center gap-3 rounded-xl border border-harbor-700 bg-harbor-900 px-4 py-2.5 text-sm text-foam shadow-deep">
            <Trash2 className="h-4 w-4 text-buoy-400" aria-hidden />
            {undo.msg}
            <button
              onClick={() => { undo.restore(); setUndo(null); clearTimeout(undoTimer.current); }}
              className="inline-flex items-center gap-1 rounded-md bg-rope-500 px-2.5 py-1 text-xs font-bold text-ink-900 hover:bg-rope-400"
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden /> Undo
            </button>
          </div>
        )}
        {toast && (
          <div className="toast-in pointer-events-auto flex items-center gap-2 rounded-xl border border-sand-300 bg-sand-50 px-4 py-2 text-sm text-ink-900 shadow-deep">
            <Check className="h-4 w-4 text-harbor-600" aria-hidden /> {toast}
          </div>
        )}
      </div>
    </div>
  );
}
