import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Power, RotateCw, ExternalLink, Maximize2, Minimize2, X, Plus, Trash2,
  Upload, Download, HelpCircle, Undo2, AlertTriangle, FlaskConical, Keyboard,
  ClipboardPaste, FileUp, Check, Pencil,
} from 'lucide-react';

/* ================================================================== */
/* Constants                                                           */
/* ================================================================== */

const LS_KEY = 'bizdev:console:v1';
const BUS_V = 1;

const APPS = [
  ['01-icp-architect', 'ICP Architect', 'Define and score Ideal Customer Profiles, then rank real prospects against a weighted fit matrix.'],
  ['02-cold-email-forge', 'Cold Email Forge', 'Build cold email sequences with merge fields, spam/length lint, and subject A/B slots.'],
  ['03-discovery-call-copilot', 'Discovery Call Copilot', 'Question banks, a live call sheet with timer and notes, and post-call scorecards.'],
  ['04-proposal-studio', 'Proposal Studio', 'Assemble winning service proposals with section libraries, pricing tables, and print-perfect output.'],
  ['05-case-study-factory', 'Case Study Factory', 'Turn client wins into case studies: interview capture, story assembly, consent tracking.'],
  ['06-battlecard-bay', 'Battlecard Bay', 'Competitor battlecards with landmines, objection counters, and a quick-draw mode for live calls.'],
  ['07-partner-pipeline', 'Partner Pipeline', 'Source and manage channel partnerships with fit scoring and co-marketing idea lists.'],
  ['08-referral-engine', 'Referral Engine', 'Design a referral program and work a weekly ask queue with scripts and funnel tracking.'],
  ['09-linkedin-cadence-planner', 'LinkedIn Cadence Planner', 'A BD content engine: calendar, hook bank, drafts with counters, repost queue.'],
  ['10-lead-magnet-lab', 'Lead Magnet Lab', 'Score lead-magnet concepts, outline the winner, and draft the landing copy.'],
  ['11-pricing-bench', 'Pricing Bench', 'Engineer good/better/best packages with margin math and a price-test log.'],
  ['12-objection-dojo', 'Objection Dojo', 'Drill sales objections with spaced-repetition flashcards and confidence heat.'],
  ['13-cadence-composer', 'Cadence Composer', 'Compose multi-channel follow-up sequences on a visual timeline with exit rules.'],
  ['14-deal-qualifier', 'Deal Qualifier', 'MEDDICC-style qualification wizard with gap flags and honest deal scores.'],
  ['15-territory-mapper', 'Territory Mapper', 'Plan segments, verticals, and account tiers with coverage math.'],
  ['16-outreach-ab-journal', 'Outreach A/B Journal', 'Test outreach variants like a scientist: reply-rate math, verdicts, insight board.'],
  ['17-event-prep-kit', 'Event Prep Kit', 'Extract pipeline from events: target lists, talk tracks, day-of cards, follow-up queue.'],
  ['18-testimonial-harvester', 'Testimonial Harvester', 'Collect social proof: ask pipeline, rights checklist, styled proof wall.'],
  ['19-narrative-deck-builder', 'Narrative Deck Builder', 'Structure the sales story beat-by-beat before you touch slides.'],
  ['20-win-loss-ledger', 'Win/Loss Ledger', 'Post-mortem every closed deal and surface the patterns that decide them.'],
  ['21-meeting-roi-auditor', 'Meeting ROI Auditor', 'Cost every meeting against pipeline impact; keep, shrink, kill, or async.'],
  ['22-champion-tracker', 'Champion Tracker', 'Map stakeholders on an influence-by-support grid and build real champions.'],
  ['23-rfp-answer-vault', 'RFP Answer Vault', 'A reusable answer library with freshness dates and a response assembler.'],
  ['24-niche-validator', 'Niche Validator', 'Score niche candidates on pain, budget, reachability, competition, and your edge.'],
  ['25-service-productizer', 'Service Productizer', 'Turn custom work into fixed-scope offers with scope-creep lint.'],
  ['26-renewal-radar', 'Renewal Radar', 'Client health signals, renewal timelines, and save-plays before it is too late.'],
  ['27-expansion-matrix', 'Expansion Matrix', 'A whitespace grid of accounts and offers that finds revenue you already earned.'],
  ['28-conference-roi-planner', 'Conference ROI Planner', 'Decide events with a full cost model and expected-pipeline math.'],
  ['29-traction-bullseye', 'Traction Bullseye', 'Run cheap channel experiments through the bullseye to your first 100 customers.'],
  ['30-bd-command-deck', 'BD Command Deck', 'The weekly BD scorecard: activity targets, conversion waterfall, review ritual.'],
].map(([slug, name, desc], i) => ({
  slug, name, desc,
  num: slug.slice(0, 2),
  hue: Math.round((i * 137.508 + 16) % 360),
}));

const APP_BY_SLUG = Object.fromEntries(APPS.map(a => [a.slug, a]));

const CONNECTORS = [
  { id: 'claude', label: 'CLAUDE', hue: 26, desc: 'Your name and voice — stamped onto every Copilot prompt the apps generate.' },
  { id: 'profile', label: 'PROFILE', hue: 202, desc: 'Company, offer, and ICP — shared context every cartridge can read.' },
  { id: 'roster', label: 'ROSTER', hue: 135, desc: 'One account list, available to every app with prospect inputs.' },
  { id: 'email', label: 'EMAIL', hue: 268, desc: 'How apps hand a drafted message to your mail tool.' },
  { id: 'calendar', label: 'CALENDAR', hue: 330, desc: 'Lets apps surface scheduling hints alongside follow-ups.' },
  { id: 'exportHub', label: 'EXPORT HUB', hue: 55, desc: 'A shared filename prefix so every exported file sorts together.' },
];

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const str = (v, fb = '') => (typeof v === 'string' ? v : fb);
const filled = v => typeof v === 'string' && v.trim().length > 0;

/* ================================================================== */
/* State: defaults, normalize, statuses, context payload               */
/* ================================================================== */

function defaultConnectors() {
  return {
    claude: { userName: '', company: '', voiceNotes: '' },
    profile: { company: '', offer: '', icp: '', pricingAnchor: '' },
    roster: { accounts: [] },
    email: { mode: 'mailto' },
    calendar: { enabled: true },
    exportHub: { filenamePrefix: 'bizdev' },
  };
}

function normalize(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  const c = d.connectors && typeof d.connectors === 'object' ? d.connectors : {};
  const g = k => (c[k] && typeof c[k] === 'object' ? c[k] : {});
  const cl = g('claude'), pr = g('profile'), ro = g('roster'), em = g('email'), ca = g('calendar'), ex = g('exportHub');
  const accounts = (Array.isArray(ro.accounts) ? ro.accounts : [])
    .filter(a => a && typeof a === 'object' && filled(str(a.name)))
    .slice(0, 500)
    .map(a => ({ id: filled(str(a.id)) ? str(a.id) : uid(), name: str(a.name).slice(0, 120), segment: str(a.segment).slice(0, 80), notes: str(a.notes).slice(0, 400) }));
  return {
    seenGuide: !!d.seenGuide,
    lastSlug: APP_BY_SLUG[d.lastSlug] ? d.lastSlug : null,
    connectors: {
      claude: { userName: str(cl.userName).slice(0, 80), company: str(cl.company).slice(0, 120), voiceNotes: str(cl.voiceNotes).slice(0, 600) },
      profile: { company: str(pr.company).slice(0, 120), offer: str(pr.offer).slice(0, 400), icp: str(pr.icp).slice(0, 400), pricingAnchor: str(pr.pricingAnchor).slice(0, 120) },
      roster: { accounts },
      email: { mode: em.mode === 'gmail-web' ? 'gmail-web' : 'mailto' },
      calendar: { enabled: typeof ca.enabled === 'boolean' ? ca.enabled : true },
      exportHub: { filenamePrefix: str(ex.filenamePrefix, 'bizdev').slice(0, 40) },
    },
  };
}

/* Statuses are computed REAL from config completeness — never stored. */
function computeStatuses(cn) {
  const p = cn.profile;
  const pFilled = [p.company, p.offer, p.icp].filter(filled).length;
  return {
    claude: filled(cn.claude.userName) ? 'connected' : 'needs-setup',
    profile: pFilled === 3 ? 'connected' : pFilled > 0 ? 'attention' : 'needs-setup',
    roster: cn.roster.accounts.length > 0 ? 'connected' : 'needs-setup',
    email: 'connected',
    calendar: cn.calendar.enabled ? 'connected' : 'needs-setup',
    exportHub: filled(cn.exportHub.filenamePrefix) ? 'connected' : 'attention',
  };
}

function buildContext(cn) {
  const st = computeStatuses(cn);
  return {
    bizdev: 'context', v: BUS_V,
    connectors: {
      claude: { status: st.claude, userName: cn.claude.userName.trim(), company: cn.claude.company.trim(), voiceNotes: cn.claude.voiceNotes.trim() },
      profile: { status: st.profile, company: cn.profile.company.trim(), offer: cn.profile.offer.trim(), icp: cn.profile.icp.trim(), pricingAnchor: cn.profile.pricingAnchor.trim() },
      roster: { status: st.roster, accounts: cn.roster.accounts.map(a => ({ name: a.name, segment: a.segment, notes: a.notes })) },
      email: { status: st.email, mode: cn.email.mode },
      calendar: { status: st.calendar, enabled: cn.calendar.enabled },
      exportHub: { status: st.exportHub, filenamePrefix: cn.exportHub.filenamePrefix.trim() },
    },
  };
}

const DEMO_CONNECTORS = () => ({
  claude: {
    userName: 'Dana Reyes',
    company: 'Northbeam Advisory',
    voiceNotes: 'Direct and warm. Short sentences. No jargon, no hype words. Lead with the prospect’s problem, not our credentials.',
  },
  profile: {
    company: 'Northbeam Advisory',
    offer: 'Fractional RevOps for B2B SaaS: pipeline hygiene, forecast discipline, and a working outbound motion in 90 days.',
    icp: 'Seed to Series B SaaS, 10–80 employees, founder-led sales that is starting to crack, US/EU remote.',
    pricingAnchor: '$4,500/mo retainer, 3-month minimum',
  },
  roster: {
    accounts: [
      { id: uid(), name: 'Ferrostack', segment: 'Series A devtools', notes: 'Warm intro via Priya; hiring first AE this quarter.' },
      { id: uid(), name: 'Quillbird Health', segment: 'Seed healthtech', notes: 'Founder posts weekly on LinkedIn; replied to Dana once.' },
      { id: uid(), name: 'Lanternworks', segment: 'Series B logistics', notes: 'Lost a deal to them in 2024 — they know our name.' },
      { id: uid(), name: 'Copperline Systems', segment: 'Series A fintech', notes: 'CFO asked for pricing in March; went quiet.' },
      { id: uid(), name: 'Bright Harbor Labs', segment: 'Seed climate', notes: 'Met at SaaStr; wants help post fundraise.' },
      { id: uid(), name: 'Mosswood Analytics', segment: 'Series B data', notes: 'RevOps lead just left — timing window open.' },
    ],
  },
  email: { mode: 'gmail-web' },
  calendar: { enabled: true },
  exportHub: { filenamePrefix: 'northbeam' },
});

/* ================================================================== */
/* Small parsers                                                       */
/* ================================================================== */

function parseRosterLines(text) {
  return String(text).split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
    const [name, segment, ...rest] = l.split('|').map(s => s.trim());
    if (!name) return null;
    return { id: uid(), name: name.slice(0, 120), segment: (segment || '').slice(0, 80), notes: rest.join(' | ').slice(0, 400) };
  }).filter(Boolean);
}

function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (ch !== '\r') cur += ch;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}

function rosterFromCSV(text) {
  let rows = parseCSV(text);
  if (rows.length && rows[0].some(c => /^(name|account|company)$/i.test(c.trim()))) rows = rows.slice(1);
  return rows.map(r => {
    const name = (r[0] || '').trim();
    if (!name) return null;
    return { id: uid(), name: name.slice(0, 120), segment: (r[1] || '').trim().slice(0, 80), notes: (r[2] || '').trim().slice(0, 400) };
  }).filter(Boolean);
}

function downloadFile(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

const prefersReduced = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ================================================================== */
/* Hand-built SVG hardware                                             */
/* ================================================================== */

function Screw({ className }) {
  return (
    <svg viewBox="0 0 10 10" className={`h-2.5 w-2.5 ${className || ''}`} aria-hidden="true">
      <circle cx="5" cy="5" r="4.4" fill="#0d0b07" stroke="#3a3222" strokeWidth="0.8" />
      <line x1="2.4" y1="6.6" x2="7.6" y2="3.4" stroke="#57492c" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function LedDot({ status, className }) {
  const color = status === 'connected' ? 'var(--color-ok)' : status === 'attention' ? 'var(--color-bad)' : 'var(--color-warn)';
  const anim = status === 'attention' ? 'led-blink' : status === 'needs-setup' ? 'led-pulse' : '';
  return (
    <svg viewBox="0 0 16 16" className={`h-3 w-3 ${className || ''}`} aria-hidden="true">
      <circle cx="8" cy="8" r="7.2" fill={color} opacity="0.16" className={anim} />
      <circle cx="8" cy="8" r="3.4" fill={color} className={anim} />
      <circle cx="6.8" cy="6.6" r="1" fill="#fff" opacity="0.55" className={anim} />
    </svg>
  );
}

function JackSVG({ hue, status }) {
  const led = status === 'connected' ? 'var(--color-ok)' : status === 'attention' ? 'var(--color-bad)' : 'var(--color-warn)';
  const anim = status === 'attention' ? 'led-blink' : status === 'needs-setup' ? 'led-pulse' : '';
  const ring = `hsl(${hue} 58% ${status === 'connected' ? 56 : 34}%)`;
  return (
    <svg viewBox="0 0 52 52" className="h-10 w-10 shrink-0" aria-hidden="true">
      {/* hex bezel */}
      <polygon points="26,2 47,14 47,38 26,50 5,38 5,14" fill="#0d0b07" stroke="#3a3222" strokeWidth="1.4" />
      <polygon points="26,6 43.5,16 43.5,36 26,46 8.5,36 8.5,16" fill="none" stroke="#57492c" strokeWidth="0.8" opacity="0.6" />
      {/* jack ring */}
      <circle cx="26" cy="26" r="13.5" fill="none" stroke={ring} strokeWidth="3.4" />
      <circle cx="26" cy="26" r="13.5" fill="none" stroke="#fff" strokeWidth="0.7" opacity="0.14" />
      {/* socket hole */}
      <circle cx="26" cy="26" r="7" fill="#050403" stroke="#2a2416" strokeWidth="1.2" />
      <circle cx="23.5" cy="23.5" r="1.6" fill="#fff" opacity="0.1" />
      {/* patched-in plug */}
      {status === 'connected' && <circle cx="26" cy="26" r="4" fill={`hsl(${hue} 70% 62%)`} />}
      {/* LED */}
      <circle cx="44" cy="9" r="6" fill={led} opacity="0.18" className={anim} />
      <circle cx="44" cy="9" r="3" fill={led} className={anim} />
    </svg>
  );
}

function EjectGlyph({ className }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true" fill="currentColor">
      <path d="M8 2.4 13.4 9H2.6L8 2.4Z" />
      <rect x="2.6" y="11" width="10.8" height="2.4" rx="1" />
    </svg>
  );
}

/* Decorative cable runs from patch-board down toward the bay */
function CableStrip({ statuses }) {
  const W = 1200, H = 84;
  return (
    <div className="hidden md:block relative -mt-px" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-14 w-full">
        {CONNECTORS.map((c, i) => {
          const x0 = ((i + 0.5) / CONNECTORS.length) * W;
          const x1 = W * 0.42 + i * 46;
          const sag = 34 + (i % 3) * 14;
          const d = `M ${x0} 0 C ${x0} ${sag + 26}, ${x1} ${H - sag}, ${x1} ${H}`;
          const on = statuses[c.id] === 'connected';
          return (
            <g key={c.id}>
              <path d={d} fill="none" stroke="#000" strokeWidth="6" opacity="0.35" transform="translate(0 1.6)" />
              <path d={d} fill="none" stroke={`hsl(${c.hue} ${on ? 52 : 26}% ${on ? 44 : 26}%)`} strokeWidth="4.4" strokeLinecap="round" />
              <path d={d} fill="none" stroke="#fff" strokeWidth="1" opacity={on ? 0.16 : 0.06} strokeLinecap="round" />
              <circle cx={x1} cy={H - 2.5} r="4.2" fill={`hsl(${c.hue} 45% ${on ? 52 : 30}%)`} stroke="#0d0b07" strokeWidth="1.4" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* Empty-bay hero: a cartridge hovering over a lit slot */
function SlotHero() {
  return (
    <svg viewBox="0 0 300 170" className="mx-auto mb-6 h-36 w-auto max-w-full" aria-hidden="true">
      {/* hovering cartridge */}
      <g>
        <rect x="96" y="12" width="108" height="74" rx="7" fill="#262015" stroke="#57492c" strokeWidth="2" />
        <rect x="96" y="12" width="108" height="74" rx="7" fill="none" stroke="#000" strokeWidth="0.8" opacity="0.5" />
        <rect x="108" y="24" width="84" height="26" rx="3" fill="#0d0b07" stroke="#3a3222" />
        <text x="150" y="41" textAnchor="middle" fill="var(--color-amber)" fontFamily="IBM Plex Mono, monospace" fontSize="11" letterSpacing="3">BIZDEV</text>
        {[0, 1, 2, 3, 4].map(i => (
          <rect key={i} x={112 + i * 16} y="58" width="9" height="18" rx="1.5" fill="#1c1811" stroke="#3a3222" strokeWidth="0.8" />
        ))}
        <rect x="104" y="86" width="92" height="6" rx="2" fill="#0d0b07" />
      </g>
      {/* motion ticks */}
      <g stroke="#57492c" strokeWidth="2" strokeLinecap="round" opacity="0.8">
        <line x1="150" y1="98" x2="150" y2="108" />
        <line x1="128" y1="96" x2="128" y2="103" />
        <line x1="172" y1="96" x2="172" y2="103" />
      </g>
      {/* slot */}
      <g>
        <rect x="52" y="118" width="196" height="34" rx="8" fill="#1c1811" stroke="#3a3222" strokeWidth="1.6" />
        <rect x="72" y="128" width="156" height="12" rx="4" fill="#050403" stroke="#2a2416" />
        <rect x="74" y="130" width="152" height="3" rx="1.5" fill="var(--color-ember)" opacity="0.85" className="slot-glow" />
        <circle cx="62" cy="135" r="3" fill="#0d0b07" stroke="#3a3222" />
        <circle cx="238" cy="135" r="3" fill="#0d0b07" stroke="#3a3222" />
      </g>
      <text x="150" y="166" textAnchor="middle" fill="var(--color-faint)" fontFamily="IBM Plex Mono, monospace" fontSize="8" letterSpacing="4">BAY 01 - ACCEPTS ALL 30 CARTRIDGES</text>
    </svg>
  );
}

/* ================================================================== */
/* Chrome primitives                                                   */
/* ================================================================== */

function PanelBtn({ children, onClick, title, ariaLabel, tone = 'default', className = '', disabled }) {
  const tones = {
    default: 'border-seam bg-plate text-bone hover:border-seam2 hover:bg-plate2',
    ember: 'border-ember/50 bg-ember/10 text-amber hover:bg-ember/20 hover:border-ember',
    danger: 'border-bad/50 bg-bad/10 text-bad hover:bg-bad/20',
    ghost: 'border-transparent bg-transparent text-mute hover:text-bone hover:border-seam',
  };
  return (
    <button type="button" onClick={onClick} title={title} aria-label={ariaLabel} disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 font-mono text-[11px] font-semibold tracking-[0.08em] uppercase transition-colors disabled:opacity-40 ${tones[tone]} ${className}`}>
      {children}
    </button>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="engrave mb-1 block font-mono text-[10px]">{label}</span>
      {children}
      {hint && <span className="mt-1 block font-mono text-[10.5px] leading-snug text-faint">{hint}</span>}
    </label>
  );
}

const inputCls = 'w-full rounded border border-seam bg-inset px-2.5 py-2 font-mono text-[12.5px] text-bone placeholder:text-faint focus:border-seam2';

/* ================================================================== */
/* App                                                                 */
/* ================================================================== */

export default function App() {
  const [config, setConfig] = useState(() => {
    try { return normalize(JSON.parse(localStorage.getItem(LS_KEY))); }
    catch { return normalize(null); }
  });
  const [bay, setBay] = useState({ slug: null, key: 0, animating: false, loaded: false, failed: false, linked: false, local: false, advisoryDismissed: false });
  const [drawer, setDrawer] = useState(null);          // connector id or null
  const [helpOpen, setHelpOpen] = useState(() => !config.seenGuide);
  const [toasts, setToasts] = useState([]);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [cssFull, setCssFull] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);

  const iframeRef = useRef(null);
  const bayShellRef = useRef(null);
  const searchRef = useRef(null);
  const importRef = useRef(null);
  const timersRef = useRef({});
  const configRef = useRef(config);
  const bayRef = useRef(bay);
  configRef.current = config;
  bayRef.current = bay;

  const statuses = useMemo(() => computeStatuses(config.connectors), [config.connectors]);
  const greenCount = Object.values(statuses).filter(s => s === 'connected').length;
  const runningApp = bay.slug ? APP_BY_SLUG[bay.slug] : null;

  /* ---------- persistence (debounced) ---------- */
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(config)); } catch { /* storage full/blocked */ }
    }, 250);
    return () => clearTimeout(t);
  }, [config]);

  /* ---------- toasts ---------- */
  const pushToast = useCallback((text, kind = 'info', onUndo = null) => {
    const id = uid();
    setToasts(ts => [...ts.slice(-3), { id, text, kind, onUndo }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), onUndo ? 7000 : 4600);
  }, []);
  const dismissToast = id => setToasts(ts => ts.filter(t => t.id !== id));

  /* ---------- the bus (console side of PROTOCOL.md) ---------- */
  useEffect(() => {
    const onMsg = (e) => {
      const d = e.data;
      if (!d || typeof d !== 'object' || d.v !== BUS_V || typeof d.bizdev !== 'string') return; // version-check; ignore unknown
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;           // only the seated cartridge
      if (d.bizdev === 'ready') {
        clearTimeout(timersRef.current.watchdog);
        clearTimeout(timersRef.current.grace);
        setBay(b => ({ ...b, loaded: true, failed: false, linked: true, local: false }));
        try { e.source.postMessage(buildContext(configRef.current.connectors), '*'); } catch { /* frame gone */ }
      } else if (d.bizdev === 'toast') {
        // untrusted plain text: coerce + clamp; React renders it as text only
        pushToast(String(d.text ?? '').slice(0, 220), 'bus');
      }
      // any other bizdev message type: ignored by design
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [pushToast]);

  /* re-send context to the live cartridge whenever connector config changes */
  const ctxJson = useMemo(() => JSON.stringify(buildContext(config.connectors)), [config.connectors]);
  useEffect(() => {
    if (bay.linked && iframeRef.current?.contentWindow) {
      try { iframeRef.current.contentWindow.postMessage(JSON.parse(ctxJson), '*'); } catch { /* frame gone */ }
    }
  }, [ctxJson, bay.linked]);

  /* ---------- insert / eject ---------- */
  const clearBayTimers = () => {
    clearTimeout(timersRef.current.anim);
    clearTimeout(timersRef.current.watchdog);
    clearTimeout(timersRef.current.grace);
  };

  const insert = useCallback((slug) => {
    if (!APP_BY_SLUG[slug]) return;
    clearBayTimers();
    const key = Date.now();
    const animate = !prefersReduced();
    setBay({ slug, key, animating: animate, loaded: false, failed: false, linked: false, local: false, advisoryDismissed: false });
    setConfig(c => ({ ...c, lastSlug: slug }));
    if (animate) timersRef.current.anim = setTimeout(() => setBay(b => (b.key === key ? { ...b, animating: false } : b)), 1350);
    timersRef.current.watchdog = setTimeout(() => {
      setBay(b => (b.key === key && !b.loaded && !b.linked ? { ...b, failed: true, animating: false } : b));
    }, 7000);
  }, []);

  const eject = useCallback(() => {
    clearBayTimers();
    setBay({ slug: null, key: 0, animating: false, loaded: false, failed: false, linked: false, local: false, advisoryDismissed: false });
    setCssFull(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  const reloadBay = useCallback(() => {
    const slug = bayRef.current.slug;
    if (slug) insert(slug);
  }, [insert]);

  const onBayLoad = () => {
    const key = bayRef.current.key;
    clearTimeout(timersRef.current.watchdog);
    let failed = false;
    try {
      // http:// same-origin: a static server's 404 page has no #root
      const doc = iframeRef.current?.contentDocument;
      if (doc && !doc.getElementById('root')) failed = true;
    } catch { /* file:// — opaque origin, cannot inspect; assume seated */ }
    setBay(b => (b.key === key ? { ...b, loaded: true, failed } : b));
    if (!failed) {
      // grace period for the bus handshake; older cartridges run standalone
      timersRef.current.grace = setTimeout(() => {
        setBay(b => (b.key === key && !b.linked ? { ...b, local: true } : b));
      }, 3500);
    }
  };

  /* ---------- fullscreen ---------- */
  useEffect(() => {
    const onFs = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
    if (cssFull) { setCssFull(false); return; }
    const el = bayShellRef.current;
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => setCssFull(true));
    else setCssFull(true);
  };
  const bayIsFull = isFull || cssFull;

  /* ---------- global keys ---------- */
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
      if (e.key === 'Escape') {
        if (helpOpen) { closeHelp(); return; }
        if (drawer) { setDrawer(null); return; }
        if (cssFull) { setCssFull(false); return; }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); exportConfig(); return; }
      if (typing) return;
      if (e.key === '?') { e.preventDefault(); setHelpOpen(true); }
      else if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const closeHelp = () => {
    setHelpOpen(false);
    setConfig(c => (c.seenGuide ? c : { ...c, seenGuide: true }));
  };

  /* ---------- config ops ---------- */
  const setConn = (id, patch) =>
    setConfig(c => ({ ...c, connectors: { ...c.connectors, [id]: { ...c.connectors[id], ...patch } } }));

  const exportConfig = useCallback(() => {
    const c = configRef.current;
    const prefix = c.connectors.exportHub.filenamePrefix.trim() || 'bizdev';
    downloadFile(`${prefix}-console-config.json`, JSON.stringify(c, null, 2), 'application/json');
    pushToast('Config exported as JSON', 'info');
  }, [pushToast]);

  const importConfig = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = normalize(JSON.parse(String(reader.result)));
        next.seenGuide = true;
        setConfig(next);
        pushToast(`Config imported — ${next.connectors.roster.accounts.length} roster accounts`, 'info');
      } catch { pushToast('Import failed: file is not valid console JSON', 'warn'); }
    };
    reader.readAsText(file);
  };

  const loadDemo = () => {
    setConfig(c => ({ ...c, connectors: DEMO_CONNECTORS() }));
    pushToast('Demo patch loaded — all six connectors green', 'info');
  };

  const doReset = () => {
    eject();
    setConfig({ seenGuide: true, lastSlug: null, connectors: defaultConnectors() });
    setResetArmed(false);
    pushToast('Console reset to factory patch', 'info');
  };

  const removeAccount = (id) => {
    const cur = configRef.current.connectors.roster.accounts;
    const idx = cur.findIndex(a => a.id === id);
    if (idx < 0) return;
    const removed = cur[idx];
    setConn('roster', { accounts: cur.filter(a => a.id !== id) });
    pushToast(`Removed "${removed.name}" from roster`, 'undo', () => {
      const now = configRef.current.connectors.roster.accounts.slice();
      now.splice(Math.min(idx, now.length), 0, removed);
      setConn('roster', { accounts: now });
    });
  };

  /* ---------- rack filtering + keyboard nav ---------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return APPS;
    return APPS.filter(a => (a.num + ' ' + a.name + ' ' + a.desc + ' ' + a.slug).toLowerCase().includes(q));
  }, [query]);
  useEffect(() => { setActiveIdx(i => Math.min(i, Math.max(0, filtered.length - 1))); }, [filtered.length]);

  const rackKeys = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && filtered[activeIdx]) { e.preventDefault(); insert(filtered[activeIdx].slug); }
  };
  const activeItemRef = useRef(null);
  useEffect(() => { activeItemRef.current?.scrollIntoView({ block: 'nearest' }); }, [activeIdx, filtered]);

  const resumeApp = config.lastSlug && !bay.slug ? APP_BY_SLUG[config.lastSlug] : null;

  /* ================================================================ */
  /* Render                                                           */
  /* ================================================================ */

  return (
    <div className="console flex h-dvh min-h-0 flex-col overflow-hidden bg-ground font-mono text-bone">

      {/* ============ HEADER ============ */}
      <header className="brushed relative flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-seam bg-hull px-4 py-2.5">
        <Screw className="absolute left-1.5 top-1.5" />
        <Screw className="absolute right-1.5 top-1.5" />
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden="true">
            <rect x="2" y="2" width="36" height="36" rx="6" fill="#0d0b07" stroke="#57492c" strokeWidth="1.6" />
            <rect x="9" y="7" width="22" height="17" rx="3" fill="#262015" stroke="var(--color-ember)" strokeWidth="1.8" />
            <rect x="13" y="11" width="14" height="5" rx="1" fill="var(--color-amber)" />
            <rect x="8" y="28" width="24" height="4" rx="2" fill="#3a3222" />
            <rect x="11" y="29.2" width="18" height="1.6" rx="0.8" fill="var(--color-ember)" opacity="0.9" />
          </svg>
          <div>
            <h1 className="font-display text-[19px] font-extrabold leading-none tracking-tight text-bone">
              CONSOLE&nbsp;DECK
            </h1>
            <p className="engrave mt-1 text-[9.5px]">BizDev-30 operating console · SN 0030-CD</p>
          </div>
        </div>

        <div className="hidden items-center gap-2 rounded border border-seam bg-inset px-2.5 py-1 text-[10.5px] lg:flex" aria-live="polite">
          <span className="text-faint">BUS V1</span>
          <span className="text-seam2">|</span>
          <span className={greenCount === 6 ? 'text-ok' : 'text-mute'}>{greenCount}/6 PATCHED</span>
          <span className="text-seam2">|</span>
          <span className="text-mute">{runningApp ? `RUNNING ${runningApp.num}` : 'BAY EMPTY'}</span>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <PanelBtn onClick={loadDemo} title="Fill sample profile and roster"><FlaskConical className="h-3.5 w-3.5" aria-hidden /> Demo</PanelBtn>
          <PanelBtn onClick={exportConfig} title="Download console config as JSON"><Download className="h-3.5 w-3.5" aria-hidden /> Export</PanelBtn>
          <PanelBtn onClick={() => importRef.current?.click()} title="Import console config JSON"><Upload className="h-3.5 w-3.5" aria-hidden /> Import</PanelBtn>
          <input ref={importRef} type="file" accept=".json,application/json" className="hidden" aria-hidden="true" tabIndex={-1}
            onChange={e => { importConfig(e.target.files?.[0]); e.target.value = ''; }} />
          {resetArmed ? (
            <PanelBtn tone="danger" onClick={doReset} title="Confirm: wipe all console config"><AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Confirm?</PanelBtn>
          ) : (
            <PanelBtn tone="ghost" onClick={() => { setResetArmed(true); setTimeout(() => setResetArmed(false), 3200); }} title="Reset console (two-step)">Reset</PanelBtn>
          )}
          <PanelBtn tone="ember" onClick={() => setHelpOpen(true)} title="How to use (press ?)"><HelpCircle className="h-3.5 w-3.5" aria-hidden /> How&nbsp;to</PanelBtn>
        </div>
      </header>

      {/* ============ PATCH BOARD ============ */}
      <section className="brushed relative border-b border-seam bg-hull px-4 pb-1 pt-2.5" aria-label="Connector patch-board">
        <div className="mb-1.5 flex items-baseline gap-3">
          <h2 className="engrave text-[10px]">Patch board — shared connectors</h2>
          <span className="hidden text-[10px] text-faint sm:inline">click a jack to configure · settings ride along into every cartridge</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-6">
          {CONNECTORS.map(c => {
            const st = statuses[c.id];
            const word = st === 'connected' ? 'PATCHED' : st === 'attention' ? 'CHECK' : 'SET UP';
            const wordCls = st === 'connected' ? 'text-ok' : st === 'attention' ? 'text-bad' : 'text-warn';
            return (
              <button key={c.id} type="button" onClick={() => setDrawer(c.id)}
                aria-label={`${c.label} connector — status ${st}. Open settings.`}
                className="group flex items-center gap-2.5 rounded-md border border-seam bg-plate px-2.5 py-2 text-left transition-colors hover:border-seam2 hover:bg-plate2">
                <JackSVG hue={c.hue} status={st} />
                <span className="min-w-0">
                  <span className="block truncate font-display text-[12px] font-extrabold tracking-wide text-bone">{c.label}</span>
                  <span className={`block text-[9.5px] font-semibold tracking-[0.18em] ${wordCls}`}>{word}</span>
                </span>
              </button>
            );
          })}
        </div>
        <CableStrip statuses={statuses} />
      </section>

      {/* ============ RACK + BAY ============ */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">

        {/* -------- cartridge rack -------- */}
        <aside className="flex max-h-52 min-h-0 shrink-0 flex-col border-b border-seam bg-hull md:max-h-none md:w-[290px] md:border-b-0 md:border-r"
          aria-label="Cartridge rack" onKeyDown={rackKeys}>
          <div className="border-b border-seam px-3 pb-2 pt-2.5">
            <div className="mb-1.5 flex items-baseline justify-between">
              <h2 className="engrave text-[10px]">Cartridge rack</h2>
              <span className="text-[10px] text-faint">{filtered.length}/30</span>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" aria-hidden />
              <input ref={searchRef} value={query} onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
                placeholder="Search the rack…  ( / )"
                aria-label="Search cartridges"
                className={`${inputCls} pl-7`} />
            </div>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto p-1.5" role="listbox" aria-label="Cartridges">
            {filtered.map((a, i) => {
              const inserted = bay.slug === a.slug;
              const active = i === activeIdx;
              return (
                <li key={a.slug} role="option" aria-selected={inserted}>
                  <button type="button"
                    ref={active ? activeItemRef : null}
                    onClick={() => { setActiveIdx(i); insert(a.slug); }}
                    title={a.desc}
                    className={`group mb-1 flex w-full items-stretch gap-0 overflow-hidden rounded border text-left transition-colors
                      ${inserted ? 'border-ember/60 bg-ember/10' : active ? 'border-seam2 bg-plate2' : 'border-seam bg-plate hover:border-seam2 hover:bg-plate2'}`}>
                    <span className="w-1.5 shrink-0" style={{ background: `hsl(${a.hue} 62% 52%)` }} aria-hidden="true" />
                    <span className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5">
                      <span className="shrink-0 rounded-sm bg-inset px-1 py-0.5 text-[9.5px] font-semibold text-mute">{a.num}</span>
                      <span className="min-w-0 flex-1 truncate font-display text-[12px] font-extrabold tracking-wide">{a.name}</span>
                      {inserted && <span className="shrink-0 text-[8.5px] font-bold tracking-[0.2em] text-ember">IN&nbsp;BAY</span>}
                    </span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-[11px] text-faint">No cartridge matches “{query}”.</li>
            )}
          </ul>
          <p className="hidden border-t border-seam px-3 py-1.5 text-[9.5px] text-faint md:block">
            Arrows navigate · Enter inserts · / searches
          </p>
        </aside>

        {/* -------- the bay -------- */}
        <main ref={bayShellRef}
          className={`relative flex min-h-0 min-w-0 flex-1 flex-col bg-ground ${cssFull ? 'fixed inset-0 z-40' : ''}`}
          aria-label="Cartridge bay">

          {/* title plate */}
          <div className="brushed relative flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-seam bg-hull px-3 py-2">
            {runningApp ? (
              <>
                <span className="h-6 w-1.5 rounded-sm" style={{ background: `hsl(${runningApp.hue} 62% 52%)` }} aria-hidden="true" />
                <span className="rounded-sm bg-inset px-1.5 py-0.5 text-[10px] font-semibold text-mute">{runningApp.num}</span>
                <h2 className="min-w-0 truncate font-display text-[15px] font-extrabold tracking-wide">{runningApp.name}</h2>
                <span className="flex items-center gap-1.5 rounded border border-seam bg-inset px-2 py-0.5 text-[9px] font-bold tracking-[0.18em]"
                  aria-live="polite">
                  {bay.linked ? (<><LedDot status="connected" /> <span className="text-ok">BUS LINKED</span></>)
                    : bay.failed ? (<><LedDot status="attention" /> <span className="text-bad">NOT SEATED</span></>)
                    : bay.local ? (<><span className="inline-block h-2 w-2 rounded-full bg-faint" aria-hidden /> <span className="text-mute">STANDALONE</span></>)
                    : (<><LedDot status="needs-setup" /> <span className="text-warn">SEATING…</span></>)}
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  <PanelBtn onClick={eject} tone="ember" title="Eject cartridge" ariaLabel="Eject cartridge">
                    <EjectGlyph className="h-3.5 w-3.5" /> Eject
                  </PanelBtn>
                  <PanelBtn onClick={reloadBay} title="Reload cartridge" ariaLabel="Reload cartridge"><RotateCw className="h-3.5 w-3.5" aria-hidden /></PanelBtn>
                  <a href={`../${runningApp.slug}/index.html`} target="_blank" rel="noopener noreferrer"
                    title="Open standalone in a new tab" aria-label="Open standalone in a new tab"
                    className="inline-flex items-center rounded border border-seam bg-plate px-2.5 py-1.5 text-bone transition-colors hover:border-seam2 hover:bg-plate2">
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                  <PanelBtn onClick={toggleFullscreen} title={bayIsFull ? 'Exit fullscreen bay' : 'Fullscreen the bay'}
                    ariaLabel={bayIsFull ? 'Exit fullscreen bay' : 'Fullscreen the bay'}>
                    {bayIsFull ? <Minimize2 className="h-3.5 w-3.5" aria-hidden /> : <Maximize2 className="h-3.5 w-3.5" aria-hidden />}
                  </PanelBtn>
                </div>
              </>
            ) : (
              <>
                <LedDot status="needs-setup" />
                <h2 className="engrave text-[10px]">Bay 01 — no cartridge seated</h2>
                <span className="ml-auto text-[9.5px] text-faint">connections persist across swaps</span>
              </>
            )}
          </div>

          {/* standalone advisory — on file:// a missing cartridge is indistinguishable
              from a seated non-bus one, so say what a file error below would mean */}
          {runningApp && bay.local && !bay.linked && !bay.failed && !bay.advisoryDismissed && (
            <div className="flex items-center gap-2.5 border-b border-warn/30 bg-[#211a08] px-3 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warn" aria-hidden />
              <p className="min-w-0 flex-1 text-[10.5px] leading-snug text-mute">
                <span className="font-semibold text-warn">No bus link — cartridge running solo.</span>{' '}
                Connectors will not reach it. If the screen below shows a file error, this cartridge
                is not built yet: re-seat it later or eject.
              </p>
              <button type="button" onClick={() => setBay(b => ({ ...b, advisoryDismissed: true }))}
                aria-label="Dismiss standalone advisory" className="shrink-0 text-faint hover:text-bone">
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          )}

          {/* screen */}
          <div className="screen-vignette relative min-h-0 flex-1 overflow-hidden bg-inset">
            {runningApp && !bay.failed && (
              <iframe
                key={bay.key}
                ref={iframeRef}
                title={`${runningApp.name} — cartridge`}
                src={`../${runningApp.slug}/index.html`}
                onLoad={onBayLoad}
                onError={() => setBay(b => ({ ...b, failed: true }))}
                className="h-full w-full border-0 bg-ground"
              />
            )}

            {/* insert animation overlay */}
            {runningApp && bay.animating && !bay.failed && (
              <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden bg-inset" aria-hidden="true">
                <div className="cart-slab absolute inset-x-0 top-0 mx-auto flex h-1/2 max-w-md flex-col items-center justify-end rounded-b-xl border border-t-0 border-seam2 bg-plate pb-6 shadow-[0_18px_60px_rgba(0,0,0,0.8)]">
                  <div className="mb-3 rounded bg-inset px-4 py-2 text-center">
                    <span className="block text-[10px] tracking-[0.3em] text-mute">{runningApp.num}</span>
                    <span className="font-display text-lg font-extrabold" style={{ color: `hsl(${runningApp.hue} 70% 62%)` }}>{runningApp.name}</span>
                  </div>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3, 4, 5].map(i => <span key={i} className="h-4 w-2 rounded-sm bg-hull" />)}
                  </div>
                </div>
                <div className="bay-flash absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,184,77,0.35),rgba(255,138,61,0.08)_55%,transparent_75%)]" />
              </div>
            )}

            {/* seating (loading) */}
            {runningApp && !bay.loaded && !bay.failed && !bay.animating && (
              <div className="screen-scan absolute inset-0 z-[5] grid place-items-center bg-inset" aria-hidden="true">
                <p className="text-[12px] tracking-[0.28em] text-mute">
                  SEATING CARTRIDGE<span className="cursor-blink">_</span>
                </p>
              </div>
            )}

            {/* cartridge not seated */}
            {runningApp && bay.failed && (
              <div className="screen-scan absolute inset-0 z-10 grid place-items-center overflow-y-auto bg-inset p-6">
                <div className="max-w-md text-center">
                  <LedDot status="attention" className="mx-auto mb-4 h-5 w-5" />
                  <h3 className="font-display text-2xl font-extrabold tracking-wide text-bad">CARTRIDGE NOT SEATED</h3>
                  <p className="mx-auto mt-3 text-[12px] leading-relaxed text-mute">
                    <span className="text-bone">{runningApp.name}</span> did not respond from the bay.
                    The cartridge may not be built yet, or its files are missing at
                    <span className="text-amber"> ../{runningApp.slug}/index.html</span>.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <PanelBtn tone="ember" onClick={reloadBay}><RotateCw className="h-3.5 w-3.5" aria-hidden /> Re-seat</PanelBtn>
                    <PanelBtn onClick={eject}><EjectGlyph className="h-3.5 w-3.5" /> Eject</PanelBtn>
                    <a href={`../${runningApp.slug}/index.html`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded border border-seam bg-plate px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-bone hover:border-seam2">
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Try standalone
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* empty state — INSERT CARTRIDGE */}
            {!runningApp && (
              <div className="screen-scan absolute inset-0 grid place-items-center overflow-y-auto p-6">
                <div className="max-w-lg text-center">
                  <SlotHero />
                  <h3 className="font-display text-3xl font-extrabold tracking-[0.08em] text-amber drop-shadow-[0_0_18px_rgba(255,184,77,0.35)] sm:text-4xl">
                    INSERT CARTRIDGE
                  </h3>
                  <p className="mx-auto mt-3 max-w-sm text-[12px] leading-relaxed text-mute">
                    Pick any of the 30 tools from the rack — it powers on in the bay with your
                    connectors already patched in. Swap freely; nothing unplugs.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    {resumeApp && (
                      <PanelBtn tone="ember" onClick={() => insert(resumeApp.slug)} title={`Resume ${resumeApp.name}`}>
                        <Power className="h-3.5 w-3.5" aria-hidden /> Resume · {resumeApp.name}
                      </PanelBtn>
                    )}
                    <PanelBtn onClick={() => searchRef.current?.focus()}><Search className="h-3.5 w-3.5" aria-hidden /> Browse the rack</PanelBtn>
                  </div>
                  {greenCount < 6 && (
                    <p className="mt-5 text-[10.5px] text-faint">
                      {6 - greenCount} connector{6 - greenCount === 1 ? '' : 's'} still unpatched — amber LEDs on the patch board above.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ============ CONNECTOR DRAWER ============ */}
      {drawer && (
        <ConnectorDrawer
          id={drawer}
          config={config}
          statuses={statuses}
          setConn={setConn}
          removeAccount={removeAccount}
          pushToast={pushToast}
          onClose={() => setDrawer(null)}
        />
      )}

      {/* ============ HOW TO USE ============ */}
      {helpOpen && <HelpModal onClose={closeHelp} />}

      {/* ============ TOASTS ============ */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(92vw,360px)] flex-col gap-2" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id}
            className={`toast-in pointer-events-auto flex items-start gap-2 rounded border px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.6)]
              ${t.kind === 'warn' ? 'border-bad/50 bg-[#241210]' : t.kind === 'bus' ? 'border-ember/50 bg-[#221708]' : 'border-seam2 bg-plate2'}`}>
            <span className={`mt-0.5 shrink-0 rounded-sm px-1 py-0.5 text-[8px] font-bold tracking-[0.18em]
              ${t.kind === 'bus' ? 'bg-ember/20 text-ember' : t.kind === 'warn' ? 'bg-bad/20 text-bad' : 'bg-inset text-mute'}`}>
              {t.kind === 'bus' ? 'BUS' : t.kind === 'warn' ? 'ERR' : 'DECK'}
            </span>
            <p className="min-w-0 flex-1 break-words text-[11.5px] leading-snug text-bone">{t.text}</p>
            {t.onUndo && (
              <button type="button" onClick={() => { t.onUndo(); dismissToast(t.id); }}
                className="shrink-0 rounded border border-seam bg-inset px-1.5 py-0.5 text-[10px] font-semibold text-amber hover:border-seam2">
                <Undo2 className="mr-1 inline h-3 w-3" aria-hidden />Undo
              </button>
            )}
            <button type="button" onClick={() => dismissToast(t.id)} aria-label="Dismiss notification"
              className="shrink-0 text-faint hover:text-bone"><X className="h-3.5 w-3.5" aria-hidden /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Connector drawer                                                    */
/* ================================================================== */

function ConnectorDrawer({ id, config, statuses, setConn, removeAccount, pushToast, onClose }) {
  const meta = CONNECTORS.find(c => c.id === id);
  const cn = config.connectors;
  const st = statuses[id];
  const [pasteText, setPasteText] = useState('');
  const [editId, setEditId] = useState(null);
  const csvRef = useRef(null);
  const firstFieldRef = useRef(null);
  useEffect(() => { firstFieldRef.current?.focus(); }, [id]);

  const stWord = st === 'connected' ? 'PATCHED' : st === 'attention' ? 'NEEDS ATTENTION' : 'NEEDS SETUP';
  const stCls = st === 'connected' ? 'text-ok' : st === 'attention' ? 'text-bad' : 'text-warn';

  const addParsed = (list, label) => {
    if (!list.length) { pushToast(`No accounts found in that ${label}`, 'warn'); return; }
    setConn('roster', { accounts: [...cn.roster.accounts, ...list].slice(0, 500) });
    pushToast(`Added ${list.length} account${list.length === 1 ? '' : 's'} from ${label}`, 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`${meta.label} connector settings`}>
      <button type="button" className="absolute inset-0 cursor-default bg-black/55" aria-label="Close connector settings" onClick={onClose} />
      <div className="drawer-in relative flex h-full w-[min(94vw,380px)] flex-col border-l border-seam bg-hull shadow-[-24px_0_60px_rgba(0,0,0,0.6)]">
        <div className="brushed flex items-center gap-3 border-b border-seam px-4 py-3">
          <JackSVG hue={meta.hue} status={st} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[15px] font-extrabold tracking-wide">{meta.label}</h2>
            <p className={`text-[9px] font-bold tracking-[0.2em] ${stCls}`}>{stWord}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close drawer"
            className="rounded border border-seam bg-plate p-1.5 text-mute hover:border-seam2 hover:text-bone">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="border-b border-seam px-4 py-2.5 text-[11px] leading-snug text-mute">{meta.desc}</p>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {id === 'claude' && (
            <>
              <Field label="Your name *" hint="Required to patch this connector. Prompts open with who is asking.">
                <input ref={firstFieldRef} className={inputCls} value={cn.claude.userName} placeholder="e.g. Dana Reyes"
                  onChange={e => setConn('claude', { userName: e.target.value })} />
              </Field>
              <Field label="Company (as you say it)">
                <input className={inputCls} value={cn.claude.company} placeholder="e.g. Northbeam Advisory"
                  onChange={e => setConn('claude', { company: e.target.value })} />
              </Field>
              <Field label="Voice notes" hint="Tone rules the apps prepend to every Copilot prompt — how Claude should sound as you.">
                <textarea className={`${inputCls} min-h-24 resize-y`} value={cn.claude.voiceNotes}
                  placeholder={'Direct and warm. Short sentences. No jargon.'}
                  onChange={e => setConn('claude', { voiceNotes: e.target.value })} />
              </Field>
            </>
          )}

          {id === 'profile' && (
            <>
              <Field label="Company *">
                <input ref={firstFieldRef} className={inputCls} value={cn.profile.company} placeholder="Your company name"
                  onChange={e => setConn('profile', { company: e.target.value })} />
              </Field>
              <Field label="Offer *" hint="What you sell, in one or two sentences.">
                <textarea className={`${inputCls} min-h-20 resize-y`} value={cn.profile.offer}
                  placeholder="Fractional RevOps for B2B SaaS…"
                  onChange={e => setConn('profile', { offer: e.target.value })} />
              </Field>
              <Field label="ICP *" hint="Who you sell to. All three starred fields make the LED go green.">
                <textarea className={`${inputCls} min-h-20 resize-y`} value={cn.profile.icp}
                  placeholder="Seed to Series B SaaS, 10-80 employees…"
                  onChange={e => setConn('profile', { icp: e.target.value })} />
              </Field>
              <Field label="Pricing anchor" hint="Optional. e.g. $4,500/mo retainer.">
                <input className={inputCls} value={cn.profile.pricingAnchor} placeholder="$4,500/mo retainer"
                  onChange={e => setConn('profile', { pricingAnchor: e.target.value })} />
              </Field>
            </>
          )}

          {id === 'roster' && (
            <>
              <div className="flex items-center justify-between">
                <span className="engrave text-[10px]">Accounts ({cn.roster.accounts.length})</span>
                <PanelBtn onClick={() => {
                  const acc = { id: uid(), name: 'New account', segment: '', notes: '' };
                  setConn('roster', { accounts: [...cn.roster.accounts, acc] });
                  setEditId(acc.id);
                }}><Plus className="h-3.5 w-3.5" aria-hidden /> Add</PanelBtn>
              </div>
              <ul className="space-y-1.5">
                {cn.roster.accounts.map(a => (
                  <li key={a.id} className="rounded border border-seam bg-plate p-2">
                    {editId === a.id ? (
                      <div className="space-y-1.5">
                        <input className={inputCls} value={a.name} aria-label="Account name" autoFocus
                          onChange={e => setConn('roster', { accounts: cn.roster.accounts.map(x => x.id === a.id ? { ...x, name: e.target.value } : x) })} />
                        <input className={inputCls} value={a.segment} placeholder="Segment" aria-label="Segment"
                          onChange={e => setConn('roster', { accounts: cn.roster.accounts.map(x => x.id === a.id ? { ...x, segment: e.target.value } : x) })} />
                        <input className={inputCls} value={a.notes} placeholder="Notes" aria-label="Notes"
                          onChange={e => setConn('roster', { accounts: cn.roster.accounts.map(x => x.id === a.id ? { ...x, notes: e.target.value } : x) })} />
                        <div className="flex justify-end">
                          <PanelBtn tone="ember" onClick={() => setEditId(null)}><Check className="h-3.5 w-3.5" aria-hidden /> Done</PanelBtn>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-bone">{a.name}</p>
                          {(a.segment || a.notes) && (
                            <p className="truncate text-[10.5px] text-mute">
                              {a.segment}{a.segment && a.notes ? ' — ' : ''}{a.notes}
                            </p>
                          )}
                        </div>
                        <button type="button" onClick={() => setEditId(a.id)} aria-label={`Edit ${a.name}`}
                          className="shrink-0 rounded border border-seam bg-inset p-1 text-mute hover:text-bone"><Pencil className="h-3 w-3" aria-hidden /></button>
                        <button type="button" onClick={() => removeAccount(a.id)} aria-label={`Delete ${a.name}`}
                          className="shrink-0 rounded border border-seam bg-inset p-1 text-mute hover:border-bad/60 hover:text-bad"><Trash2 className="h-3 w-3" aria-hidden /></button>
                      </div>
                    )}
                  </li>
                ))}
                {cn.roster.accounts.length === 0 && (
                  <li className="rounded border border-dashed border-seam px-3 py-4 text-center text-[11px] text-faint">
                    Empty roster. Add accounts below — one green LED away.
                  </li>
                )}
              </ul>
              <Field label="Paste a list" hint={'One account per line: Name | segment | notes'}>
                <textarea ref={firstFieldRef} className={`${inputCls} min-h-20 resize-y`} value={pasteText}
                  placeholder={'Ferrostack | Series A devtools | warm intro via Priya\nQuillbird Health | Seed healthtech'}
                  onChange={e => setPasteText(e.target.value)} />
              </Field>
              <div className="flex flex-wrap gap-2">
                <PanelBtn tone="ember" onClick={() => { addParsed(parseRosterLines(pasteText), 'paste'); setPasteText(''); }}>
                  <ClipboardPaste className="h-3.5 w-3.5" aria-hidden /> Parse &amp; add
                </PanelBtn>
                <PanelBtn onClick={() => csvRef.current?.click()}><FileUp className="h-3.5 w-3.5" aria-hidden /> Import CSV</PanelBtn>
                <input ref={csvRef} type="file" accept=".csv,text/csv" className="hidden" aria-hidden="true" tabIndex={-1}
                  onChange={e => {
                    const f = e.target.files?.[0]; e.target.value = '';
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = () => addParsed(rosterFromCSV(String(r.result)), 'CSV');
                    r.readAsText(f);
                  }} />
              </div>
              <p className="text-[10px] leading-snug text-faint">CSV columns: name, segment, notes. A header row is skipped automatically.</p>
            </>
          )}

          {id === 'email' && (
            <>
              <span className="engrave block text-[10px]">Compose handoff</span>
              {[['mailto', 'System mail app (mailto:)', 'Apps hand drafts to whatever handles mailto links on this machine.'],
                ['gmail-web', 'Gmail on the web', 'Apps format the handoff for the Gmail web composer.']].map(([val, label, hint]) => (
                <label key={val} className={`flex cursor-pointer items-start gap-2.5 rounded border p-2.5 ${cn.email.mode === val ? 'border-ember/60 bg-ember/10' : 'border-seam bg-plate'}`}>
                  <input type="radio" name="emailmode" className="mt-0.5 accent-[#ff8a3d]" checked={cn.email.mode === val}
                    onChange={() => setConn('email', { mode: val })} />
                  <span>
                    <span className="block text-[12px] font-semibold text-bone">{label}</span>
                    <span className="block text-[10.5px] text-mute">{hint}</span>
                  </span>
                </label>
              ))}
              <p className="text-[10px] text-faint">This connector ships with a sane default, so its LED is green out of the box.</p>
            </>
          )}

          {id === 'calendar' && (
            <>
              <button type="button" role="switch" aria-checked={cn.calendar.enabled}
                onClick={() => setConn('calendar', { enabled: !cn.calendar.enabled })}
                className={`flex w-full items-center justify-between rounded border p-3 ${cn.calendar.enabled ? 'border-ember/60 bg-ember/10' : 'border-seam bg-plate'}`}>
                <span className="text-left">
                  <span className="block text-[12px] font-semibold text-bone">Calendar hints</span>
                  <span className="block text-[10.5px] text-mute">Apps may suggest scheduling blocks next to follow-ups.</span>
                </span>
                <span className={`relative h-5 w-10 shrink-0 rounded-full border transition-colors ${cn.calendar.enabled ? 'border-ember bg-ember/40' : 'border-seam bg-inset'}`} aria-hidden="true">
                  <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${cn.calendar.enabled ? 'left-[22px] bg-amber' : 'left-0.5 bg-faint'}`} />
                </span>
              </button>
              <p className="text-[10px] text-faint">Switching this off sets the LED amber and tells cartridges to skip calendar suggestions.</p>
            </>
          )}

          {id === 'exportHub' && (
            <>
              <Field label="Filename prefix *" hint="Every file any cartridge exports starts with this, so downloads sort together.">
                <input ref={firstFieldRef} className={inputCls} value={cn.exportHub.filenamePrefix} placeholder="bizdev"
                  onChange={e => setConn('exportHub', { filenamePrefix: e.target.value })} />
              </Field>
              <div className="rounded border border-seam bg-inset px-3 py-2 text-[11px] text-mute">
                Preview: <span className="text-amber">{(cn.exportHub.filenamePrefix.trim() || '...')}-proposal-2026-07-20.md</span>
              </div>
              <p className="text-[10px] text-faint">Clearing the prefix flips the LED red until you set one again.</p>
            </>
          )}
        </div>

        <p className="border-t border-seam px-4 py-2 text-[9.5px] text-faint">
          Saved locally as you type · re-broadcast to the seated cartridge instantly
        </p>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Help modal                                                          */
/* ================================================================== */

function HelpModal({ onClose }) {
  const closeRef = useRef(null);
  useEffect(() => { closeRef.current?.focus(); }, []);
  const steps = [
    ['Patch the board', 'The six jacks up top are shared connectors. Click each amber LED and fill it in — PROFILE (company, offer, ICP), CLAUDE (your name and voice), ROSTER (your accounts). EMAIL, CALENDAR, and EXPORT HUB ship green with sane defaults.'],
    ['Insert a cartridge', 'Pick any of the 30 tools in the left rack — search with /, move with the arrow keys, press Enter. The cartridge powers on in the bay with your connectors already patched in.'],
    ['Watch the link LED', 'BUS LINKED (green) means the app is reading your console context. STANDALONE means the cartridge runs fine but has no bus link. NOT SEATED (red) means it failed to load — re-seat, eject, or try it standalone.'],
    ['Swap without unplugging', 'Eject and insert as often as you like. Connectors live in the console, not the cartridge — every app you insert gets the same profile, roster, and voice. Edits you make mid-session are re-broadcast to the live cartridge instantly.'],
    ['Read the chrome', 'Cartridges can post one-line notes to the deck; they appear bottom-right tagged BUS. Deck actions (exports, resets, undo offers) appear tagged DECK.'],
    ['Take your patch with you', 'Export downloads the whole console config as JSON; Import restores it on any machine. Load Demo fills a sample patch so every LED goes green while you explore. Reset wipes back to factory.'],
  ];
  const keys = [['/', 'Focus rack search'], ['↑ ↓', 'Move along the rack'], ['Enter', 'Insert highlighted cartridge'], ['?', 'Open this guide'], ['Esc', 'Close panels / exit fullscreen'], ['Ctrl/Cmd+S', 'Export console config']];
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="How to use Console Deck">
      <button type="button" className="absolute inset-0 cursor-default bg-black/60" aria-label="Close guide" onClick={onClose} />
      <div className="modal-in relative max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-lg border border-seam2 bg-hull shadow-[0_30px_90px_rgba(0,0,0,0.75)]">
        <div className="brushed sticky top-0 flex items-center gap-3 border-b border-seam bg-hull px-5 py-3.5">
          <Power className="h-4 w-4 text-ember" aria-hidden />
          <h2 className="font-display text-[16px] font-extrabold tracking-wide">OPERATOR&rsquo;S CARD</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close guide"
            className="ml-auto rounded border border-seam bg-plate p-1.5 text-mute hover:border-seam2 hover:text-bone">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="mb-4 text-[12px] leading-relaxed text-mute">
            Console Deck runs all 30 BizDev cartridges from one chassis. Set your context once on the
            patch board; every tool you insert inherits it. Everything stays in this browser.
          </p>
          <ol className="space-y-3">
            {steps.map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="mt-0.5 h-6 w-6 shrink-0 rounded border border-seam bg-inset text-center text-[11px] font-bold leading-6 text-amber">{i + 1}</span>
                <span>
                  <span className="block font-display text-[12.5px] font-extrabold tracking-wide text-bone">{t}</span>
                  <span className="block text-[11.5px] leading-relaxed text-mute">{d}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-5 rounded border border-seam bg-inset p-3">
            <p className="engrave mb-2 flex items-center gap-1.5 text-[9.5px]"><Keyboard className="h-3 w-3" aria-hidden /> Switch plate</p>
            <table className="w-full text-[11px]">
              <tbody>
                {keys.map(([k, d]) => (
                  <tr key={k}>
                    <td className="w-28 py-0.5 pr-3"><kbd className="rounded border border-seam bg-plate px-1.5 py-0.5 text-[10px] text-amber">{k}</kbd></td>
                    <td className="py-0.5 text-mute">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[10px] leading-snug text-faint">
            Privacy: config lives in localStorage under bizdev:console:v1. No network, no accounts.
            Cartridges keep their own data under their own keys — ejecting never touches it.
          </p>
        </div>
      </div>
    </div>
  );
}
