import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Ruler, Hammer, Wrench, Anchor, Plus, Trash2, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, Copy, Download, Upload, FileText, HelpCircle,
  RotateCcw, Sparkles, FlaskConical, Check, X, AlertTriangle, Undo2, Scale,
  ListChecks, PencilRuler, CircleDollarSign, BadgeCheck, Flag, NotebookPen,
  ClipboardPaste, Gauge as GaugeIcon, TrendingUp, Star, Info, Cable,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* console bus (optional link to the BizDev Console Deck host)         */
/* ------------------------------------------------------------------ */
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
    try { window.parent.postMessage({ bizdev: 'ready', v: 1, slug: '11-pricing-bench' }, '*'); } catch {}
    return () => window.removeEventListener('message', onMsg);
  }, []);
  return ctx;
}

/* ------------------------------------------------------------------ */
/* utils                                                               */
/* ------------------------------------------------------------------ */
const LS_KEY = 'bizdev:11-pricing-bench:v1';
const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (n) => '$' + num(n).toLocaleString('en-US', { maximumFractionDigits: num(n) % 1 ? 2 : 0 });
const pct = (n) => `${Math.round(num(n))}%`;
const todayISO = () => new Date().toISOString().slice(0, 10);

const ROLE_STAMPS = ['GOOD', 'BETTER', 'BEST', 'ANCHOR+'];

const OUTCOMES = [
  { id: 'accepted', label: 'Accepted', tone: 'text-moss', dot: 'bg-moss' },
  { id: 'negotiated', label: 'Negotiated', tone: 'text-brass-700', dot: 'bg-brass-500' },
  { id: 'rejected', label: 'Rejected', tone: 'text-signal', dot: 'bg-signal' },
  { id: 'silent', label: 'No decision', tone: 'text-steel-500', dot: 'bg-steel-400' },
];

const METRIC_CRITERIA = [
  { key: 'fit', label: 'Tracks value delivered' },
  { key: 'measure', label: 'Easy to measure & bill' },
  { key: 'predict', label: 'Predictable for the buyer' },
  { key: 'scale', label: 'Scales with your cost' },
];

const PRESET_METRICS = [
  'Flat monthly retainer', 'Per project / fixed scope', 'Per seat / user',
  'Per deliverable shipped', '% of spend or revenue managed',
];

/* ------------------------------------------------------------------ */
/* state shape + normalize                                             */
/* ------------------------------------------------------------------ */
function normFeature(f) {
  if (typeof f === 'string') return { id: uid(), text: f };
  return { id: typeof f?.id === 'string' ? f.id : uid(), text: typeof f?.text === 'string' ? f.text : '' };
}
function normTier(t) {
  t = t && typeof t === 'object' ? t : {};
  return {
    id: typeof t.id === 'string' ? t.id : uid(),
    name: typeof t.name === 'string' ? t.name : 'New package',
    tagline: typeof t.tagline === 'string' ? t.tagline : '',
    price: num(t.price),
    unit: typeof t.unit === 'string' ? t.unit : '/mo',
    anchor: !!t.anchor,
    lead: !!t.lead,
    hours: num(t.hours),
    rate: num(t.rate),
    hardCosts: num(t.hardCosts),
    features: Array.isArray(t.features) ? t.features.map(normFeature) : [],
  };
}
function normMetric(m) {
  m = m && typeof m === 'object' ? m : {};
  const s = m.scores && typeof m.scores === 'object' ? m.scores : {};
  return {
    id: typeof m.id === 'string' ? m.id : uid(),
    name: typeof m.name === 'string' ? m.name : 'New metric',
    note: typeof m.note === 'string' ? m.note : '',
    scores: {
      fit: clamp(num(s.fit) || 3, 1, 5), measure: clamp(num(s.measure) || 3, 1, 5),
      predict: clamp(num(s.predict) || 3, 1, 5), scale: clamp(num(s.scale) || 3, 1, 5),
    },
  };
}
function normTest(t) {
  t = t && typeof t === 'object' ? t : {};
  return {
    id: typeof t.id === 'string' ? t.id : uid(),
    date: typeof t.date === 'string' ? t.date : todayISO(),
    tierName: typeof t.tierName === 'string' ? t.tierName : '',
    price: num(t.price),
    segment: typeof t.segment === 'string' ? t.segment : '',
    outcome: OUTCOMES.some((o) => o.id === t.outcome) ? t.outcome : 'silent',
    note: typeof t.note === 'string' ? t.note : '',
  };
}
function normalize(raw) {
  let d = raw;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { d = null; } }
  if (!d || typeof d !== 'object') d = {};
  return {
    version: 1,
    seenGuide: !!d.seenGuide,
    service: {
      name: typeof d.service?.name === 'string' ? d.service.name : '',
      promise: typeof d.service?.promise === 'string' ? d.service.promise : '',
      icp: typeof d.service?.icp === 'string' ? d.service.icp : '',
    },
    tiers: (Array.isArray(d.tiers) ? d.tiers : []).slice(0, 4).map(normTier),
    anchorNote: typeof d.anchorNote === 'string' ? d.anchorNote : '',
    metrics: (Array.isArray(d.metrics) ? d.metrics : []).map(normMetric),
    chosenMetricId: typeof d.chosenMetricId === 'string' ? d.chosenMetricId : null,
    tests: (Array.isArray(d.tests) ? d.tests : []).map(normTest),
    copilotNotes: typeof d.copilotNotes === 'string' ? d.copilotNotes : '',
  };
}
function loadInitial() {
  try { return normalize(localStorage.getItem(LS_KEY)); } catch { return normalize(null); }
}

/* ------------------------------------------------------------------ */
/* demo data                                                           */
/* ------------------------------------------------------------------ */
const DEMO = normalize({
  seenGuide: true,
  service: {
    name: 'Beacon Revenue Analytics — done-for-you dashboards for B2B SaaS',
    promise: 'We turn your messy product + billing data into a revenue dashboard your board actually reads.',
    icp: 'Seed-to-Series B B2B SaaS, 10-80 employees, no data team, founder or RevOps lead is the buyer.',
  },
  tiers: [
    {
      name: 'Toolbox', tagline: 'The essentials, wired in a week.', price: 2400, unit: '/mo',
      hours: 14, rate: 85, hardCosts: 120,
      features: [
        'Revenue + churn dashboard (1 source)', 'Weekly automated board snapshot',
        'Slack alerts on metric anomalies', 'Email support, 2-day response',
      ],
    },
    {
      name: 'Workbench', tagline: 'The one most teams pick.', price: 4800, unit: '/mo', lead: true,
      hours: 26, rate: 85, hardCosts: 260,
      features: [
        'Everything in Toolbox', 'Full-funnel dashboard (up to 4 sources)',
        'Cohort retention + NRR breakdowns', 'Monthly metrics review call (45 min)',
        'Same-day Slack support', 'Quarterly board-deck data appendix',
      ],
    },
    {
      name: 'Master Shop', tagline: 'A fractional data team on call.', price: 9500, unit: '/mo', anchor: true,
      hours: 48, rate: 85, hardCosts: 420,
      features: [
        'Everything in Workbench', 'Unlimited sources + custom models',
        'Forecasting: pipeline + cash runway', 'Bi-weekly working sessions with exec team',
        'Ad-hoc analyst requests (48h turnaround)', 'Annual pricing & packaging study',
      ],
    },
  ],
  anchorNote: 'Master Shop exists to make Workbench feel obviously sane. Ratio ladder 1 : 2 : 4. Never discount Workbench — move scope, not price.',
  metrics: [
    { name: 'Flat monthly retainer', scores: { fit: 3, measure: 5, predict: 5, scale: 3 }, note: 'Easy to sell, decouples from value over time.' },
    { name: 'Per connected data source', scores: { fit: 4, measure: 5, predict: 4, scale: 5 }, note: 'Cost scales with sources; buyers understand it.' },
    { name: '% of tracked ARR', scores: { fit: 5, measure: 3, predict: 2, scale: 2 }, note: 'Best value story, hardest procurement conversation.' },
  ],
  chosenMetricId: null,
  tests: [
    { date: '2025-05-12', tierName: 'Workbench', price: 3900, segment: 'Seed SaaS, 12 ppl', outcome: 'accepted', note: 'Closed same call. Priced too low — no flinch at all.' },
    { date: '2025-05-28', tierName: 'Workbench', price: 4400, segment: 'Series A, 35 ppl', outcome: 'accepted', note: 'Small pause, then yes. Asked about annual discount.' },
    { date: '2025-06-10', tierName: 'Workbench', price: 4800, segment: 'Series A, 40 ppl', outcome: 'negotiated', note: 'Landed at 4800 with quarterly billing. Anchor did its job.' },
    { date: '2025-06-19', tierName: 'Toolbox', price: 2400, segment: 'Bootstrapped, 8 ppl', outcome: 'rejected', note: 'Budget is 1k. Wrong segment, not wrong price.' },
    { date: '2025-07-02', tierName: 'Master Shop', price: 9500, segment: 'Series B, 70 ppl', outcome: 'negotiated', note: 'CFO countered 8k annual prepay. Considering.' },
    { date: '2025-07-11', tierName: 'Workbench', price: 5200, segment: 'Series A, 28 ppl', outcome: 'silent', note: 'Went quiet after proposal. Testing 5200 ceiling next.' },
  ],
  copilotNotes: '',
});

DEMO.chosenMetricId = DEMO.metrics[1].id;
DEMO.tests = DEMO.tests.map((t) => ({ ...t }));

/* ------------------------------------------------------------------ */
/* derived math                                                        */
/* ------------------------------------------------------------------ */
const tierCost = (t) => num(t.hours) * num(t.rate) + num(t.hardCosts);
const tierMargin = (t) => (num(t.price) > 0 ? ((num(t.price) - tierCost(t)) / num(t.price)) * 100 : 0);
const metricScore = (m) => ((m.scores.fit + m.scores.measure + m.scores.predict + m.scores.scale) / 20) * 100;

function ladderChecks(tiers) {
  const out = [];
  if (tiers.length === 0) return out;
  const priced = tiers.filter((t) => num(t.price) > 0);
  if (tiers.length < 3) out.push({ ok: false, text: `Only ${tiers.length} package${tiers.length === 1 ? '' : 's'} on the bench — three gives buyers a frame, not a coin flip.` });
  else out.push({ ok: true, text: 'Three-up ladder in place — buyers compare you to you, not to the market.' });
  if (priced.length >= 2) {
    const sorted = [...priced].sort((a, b) => num(a.price) - num(b.price));
    const ratio = num(sorted[1].price) / Math.max(1, num(sorted[0].price));
    out.push(ratio >= 1.6 && ratio <= 3.2
      ? { ok: true, text: `Step-up ratio ${ratio.toFixed(1)}x between the first two rungs — a real decision, not a rounding error.` }
      : { ok: false, text: `Step-up ratio ${ratio.toFixed(1)}x between the first two rungs — aim for roughly 2x so the middle earns its keep.` });
  }
  const anchor = tiers.find((t) => t.anchor);
  if (!anchor) out.push({ ok: false, text: 'No anchor flagged. Mark your highest package as the anchor — it exists to reprice the middle.' });
  else {
    const maxPrice = Math.max(...tiers.map((t) => num(t.price)));
    out.push(num(anchor.price) >= maxPrice
      ? { ok: true, text: `“${anchor.name}” anchors the ladder at ${money(anchor.price)} — everything under it now looks reasonable.` }
      : { ok: false, text: `Anchor “${anchor.name}” is not the top price. An anchor below the ceiling anchors nothing.` });
  }
  const lead = tiers.find((t) => t.lead);
  if (!lead) out.push({ ok: false, text: 'No lead package marked. Pick the one you want most buyers to choose and say so on the page.' });
  else {
    const idx = tiers.indexOf(lead);
    out.push(tiers.length >= 3 && idx > 0 && idx < tiers.length - 1
      ? { ok: true, text: `Lead package “${lead.name}” sits mid-ladder — the classic goldilocks slot.` }
      : { ok: true, text: `Lead package “${lead.name}” is marked. Mid-ladder placement converts best in three-up lineups.` });
  }
  const thin = tiers.filter((t) => num(t.price) > 0 && tierMargin(t) < 30);
  if (thin.length) out.push({ ok: false, text: `${thin.map((t) => `“${t.name}”`).join(', ')} running under 30% margin — check the gauges before you publish.` });
  return out;
}

/* ------------------------------------------------------------------ */
/* markdown + prompts                                                  */
/* ------------------------------------------------------------------ */
function stateMarkdown(s) {
  const L = [];
  L.push('# Pricing sheet — ' + (s.service.name || 'Untitled service'));
  if (s.service.promise) L.push('', '> ' + s.service.promise);
  if (s.service.icp) L.push('', `**ICP:** ${s.service.icp}`);
  L.push('', '## Packages');
  if (!s.tiers.length) L.push('_No packages yet._');
  s.tiers.forEach((t, i) => {
    const flags = [t.lead ? 'LEAD' : null, t.anchor ? 'ANCHOR' : null].filter(Boolean).join(', ');
    L.push('', `### ${i + 1}. ${t.name} — ${money(t.price)}${t.unit}${flags ? ` (${flags})` : ''}`);
    if (t.tagline) L.push(`*${t.tagline}*`);
    t.features.forEach((f) => f.text && L.push(`- ${f.text}`));
    L.push(`- Cost model: ${t.hours}h × ${money(t.rate)}/h + ${money(t.hardCosts)} hard costs = ${money(tierCost(t))} → **${Math.round(tierMargin(t))}% margin**, effective ${t.hours > 0 ? money(num(t.price) / t.hours) : '—'}/h`);
  });
  if (s.anchorNote) L.push('', '## Anchor logic', s.anchorNote);
  L.push('', '## Value metric');
  if (!s.metrics.length) L.push('_No candidates scored yet._');
  s.metrics.forEach((m) => {
    const chosen = m.id === s.chosenMetricId ? ' ← **CHOSEN**' : '';
    L.push(`- ${m.name} — score ${Math.round(metricScore(m))}/100 (value ${m.scores.fit}, measure ${m.scores.measure}, predict ${m.scores.predict}, scale ${m.scores.scale})${chosen}${m.note ? ` — ${m.note}` : ''}`);
  });
  L.push('', '## Price test log');
  if (!s.tests.length) L.push('_No tests logged yet._');
  else {
    L.push('| Date | Package | Price | Segment | Outcome | Note |', '|---|---|---|---|---|---|');
    s.tests.forEach((t) => L.push(`| ${t.date} | ${t.tierName || '—'} | ${money(t.price)} | ${t.segment || '—'} | ${OUTCOMES.find((o) => o.id === t.outcome)?.label} | ${t.note.replace(/\|/g, '/')} |`));
    const acc = s.tests.filter((t) => t.outcome === 'accepted').length;
    L.push('', `**${s.tests.length} tests · ${acc} accepted (${Math.round((acc / s.tests.length) * 100)}%)**`);
  }
  return L.join('\n');
}

const PROMPT_TAIL = '\n\nPaste into claude.ai — works with the standard Claude subscription.';

/** Builds the "## Shared context (from BizDev Console)" markdown block to prepend to
 * every Copilot prompt when this app is linked to the Console Deck. Only non-empty
 * fields are included; returns '' when there is nothing to share (or no console). */
function buildSharedContextHeader(consoleCtx) {
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
    const acc = roster.accounts.slice(0, 12).map((a) => `${a.name}${a.segment ? ` (${a.segment})` : ''}`).join(', ');
    lines.push(`- Accounts on file: ${acc}`);
  }
  if (!lines.length) return '';
  return `## Shared context (from BizDev Console)\n${lines.join('\n')}\n\n`;
}

function buildPrompts(s, consoleCtx) {
  const md = stateMarkdown(s);
  const ctxHeader = buildSharedContextHeader(consoleCtx);
  return [
    {
      id: 'structures', icon: Hammer, title: 'Propose 3 packaging structures',
      desc: 'Three alternative good/better/best lineups for your service, with anchor logic and price points.',
      prompt: ctxHeader + `You are a pricing strategist who has packaged 100+ B2B service businesses. You think in value metrics, anchoring, and buyer psychology — and you are allergic to underpricing.\n\nHere is my current pricing bench (my working state, as markdown):\n\n---\n${md}\n---\n\nYour task: propose THREE alternative packaging structures for this service, each a complete good/better/best lineup. For each structure give:\n1. A name for the structure and the strategic bet behind it (one sentence).\n2. The three tiers: name, price + unit, one-line positioning, and 4-6 features per tier (reuse or reshape my features; invent only what is plausible).\n3. The anchor logic: which tier anchors, which is the lead, and why the ratios work.\n4. The biggest risk of this structure and the one signal that would tell me it is working.\n\nThen finish with a verdict: which of the three you would ship first for my ICP, in 3 sentences.\n\nFormat: markdown with a ## heading per structure and a final ## Verdict section. Be concrete with numbers — no ranges wider than 20%.`,
    },
    {
      id: 'stress', icon: Scale, title: 'Stress-test pricing vs my ICP',
      desc: 'A hostile review: where the ladder leaks money, where it will meet resistance, what to test next.',
      prompt: ctxHeader + `You are a skeptical buyer-side procurement advisor AND a pricing consultant, in one head. Your job is to attack my pricing ladder from the buyer's chair, then repair it from the seller's.\n\nMy current pricing bench:\n\n---\n${md}\n---\n\nDo this, in order:\n1. **Buyer attack** — as my exact ICP, list the 5 strongest objections or exploits against this ladder (cheap-tier squatting, anchor disbelief, missing value metric leverage, etc.). Quote my own tier names.\n2. **Margin audit** — using my cost model numbers, flag any tier where the margin or effective hourly rate is a problem, and say what number it should be.\n3. **Price-test read** — read my test log like data: what do the outcomes at each price point actually support? Where am I leaving money?\n4. **Repairs** — the 5 highest-leverage changes, each with: the change, the expected effect, and how I would verify it within 3 sales conversations.\n\nFormat: four ## sections matching the steps. Be blunt; do not pad. If my data is too thin to conclude something, say exactly what to log next.`,
    },
    {
      id: 'copy', icon: PencilRuler, title: 'Write the pricing-page copy',
      desc: 'Full pricing-page draft: headline, tier cards, FAQ, and the anchor framed the way you designed it.',
      prompt: ctxHeader + `You are a conversion copywriter who specializes in B2B service pricing pages. Plain words, concrete outcomes, zero hype-words ("unleash", "supercharge" are banned).\n\nMy pricing bench (source of truth — do not invent tiers or prices):\n\n---\n${md}\n---\n\nWrite the complete pricing page:\n1. **Headline + subhead** that frame the value metric, not the deliverables.\n2. **Tier cards** — for each package: name, price, one-line promise, 4-6 bullet features (rewrite mine for scannability, keep meaning), and a CTA label. Mark the lead tier with a "Most teams pick this" style badge line and give the anchor tier copy that makes the lead feel safe.\n3. **Comparison row ideas** — 5 rows for a feature table that make the differences legible.\n4. **FAQ** — 6 questions a real buyer from my ICP would ask (price justification, switching, contract terms, what happens if usage grows), with tight answers.\n5. **Objection-softening line** to sit under the CTA.\n\nFormat: markdown, ready to paste into a page builder. Keep every price exactly as given.`,
    },
    {
      id: 'nexttest', icon: FlaskConical, title: 'Design my next price test',
      desc: 'Reads your test log and prescribes the next experiment: who, what price, what script, what counts as a result.',
      prompt: ctxHeader + `You are a pricing researcher who runs Van Westendorp and simple A/B price tests for service businesses with small sample sizes. You are honest about what small n can and cannot prove.\n\nMy pricing bench, including my full price test log:\n\n---\n${md}\n---\n\nDesign my single next price test:\n1. **Hypothesis** — one falsifiable sentence grounded in my existing log.\n2. **Design** — which package, what price point(s), which segment, how many conversations before reading results, and why that n is enough to act on (or what caveat applies).\n3. **The script** — the exact words to present the price in the sales conversation, including the anchor setup and the 4-second pause instruction.\n4. **Decision rule** — written BEFORE the test: if X happens, raise/keep/lower to specific numbers.\n5. **Log template** — the fields I should capture per conversation so the next analysis is better than this one.\n\nFormat: markdown with those five ## sections. One test only — do not hedge with alternatives.`,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* small UI atoms                                                      */
/* ------------------------------------------------------------------ */
const btnBase = 'inline-flex items-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-600 disabled:opacity-40 disabled:pointer-events-none';
const btnTool = `${btnBase} border border-steel-300 bg-paper text-steel-800 hover:bg-wood-50 px-3 py-1.5 text-sm shadow-[0_1px_0_rgba(0,0,0,0.12)]`;
const btnBrass = `${btnBase} bg-brass-600 text-paper hover:bg-brass-700 px-3 py-1.5 text-sm shadow-[0_2px_0_rgba(87,59,12,0.5)]`;
const btnGhostIcon = `${btnBase} p-1.5 rounded text-steel-500 hover:text-steel-800 hover:bg-wood-100`;
const inputCls = 'w-full rounded-md border border-steel-300 bg-paper px-2.5 py-1.5 text-sm text-steel-900 placeholder:text-steel-400 focus-visible:outline-2 focus-visible:outline-brass-600 focus-visible:outline-offset-0';
const labelCls = 'block font-mono text-[10px] uppercase tracking-[0.14em] text-steel-500 mb-1';

function TickRule({ className = '' }) {
  return <div aria-hidden className={`tick-rule h-2.5 w-full text-steel-400 ${className}`} />;
}

function SectionHead({ icon: Icon, kicker, title, children }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 text-brass-700">
        <Icon className="h-4 w-4" aria-hidden />
        <span className="font-mono text-[11px] uppercase tracking-[0.2em]">{kicker}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold text-steel-900">{title}</h2>
        {children}
      </div>
      <TickRule className="mt-2" />
    </div>
  );
}

function Modal({ open, onClose, title, wide, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-steel-900/60 p-4 backdrop-blur-[2px] print:hidden" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`relative mt-8 w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-xl border border-steel-300 bg-paper shadow-bench`}>
        <div className="flex items-center justify-between border-b border-steel-200 px-5 py-3.5">
          <h3 className="font-display text-lg font-semibold text-steel-900">{title}</h3>
          <button className={btnGhostIcon} onClick={onClose} aria-label="Close dialog"><X className="h-4 w-4" aria-hidden /></button>
        </div>
        <div className="max-h-[72vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* signature graphics                                                  */
/* ------------------------------------------------------------------ */
function PriceRuler({ tiers }) {
  const priced = tiers.filter((t) => num(t.price) > 0);
  const maxP = Math.max(1000, ...priced.map((t) => num(t.price))) * 1.14;
  const W = 880, H = 168, x0 = 34, x1 = W - 34, span = x1 - x0;
  const px = (p) => x0 + (num(p) / maxP) * span;
  const sorted = [...priced].sort((a, b) => num(a.price) - num(b.price));
  const ticks = [];
  for (let i = 0; i <= 60; i++) {
    const x = x0 + (i / 60) * span;
    const major = i % 10 === 0, mid = i % 5 === 0;
    ticks.push(<line key={i} x1={x} x2={x} y1={H - 30} y2={H - 30 - (major ? 20 : mid ? 13 : 7)} stroke="currentColor" strokeWidth={major ? 1.6 : 0.8} />);
    if (major) ticks.push(<text key={'t' + i} x={x} y={H - 12} textAnchor="middle" className="fill-steel-500" style={{ font: '10px "IBM Plex Mono", monospace' }}>{money(Math.round((maxP * i) / 60 / 50) * 50)}</text>);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-steel-600" role="img" aria-label="Price ladder ruler showing each package position">
      <defs>
        <linearGradient id="rulerwood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-wood-200)" /><stop offset="1" stopColor="var(--color-wood-300)" />
        </linearGradient>
      </defs>
      <rect x={x0 - 16} y={H - 34} width={span + 32} height={26} rx={4} fill="url(#rulerwood)" stroke="var(--color-wood-500)" strokeWidth="1" />
      <g className="text-steel-700">{ticks}</g>
      {sorted.map((t, i) => {
        const x = px(t.price);
        const lift = i % 2 === 0 ? 0 : 34;
        const y = 78 - lift;
        const color = t.anchor ? 'var(--color-brass-600)' : t.lead ? 'var(--color-moss)' : 'var(--color-steel-700)';
        return (
          <g key={t.id}>
            <line x1={x} x2={x} y1={y + 18} y2={H - 34} stroke={color} strokeWidth="1.4" strokeDasharray="3 3" />
            <path d={`M ${x - 6} ${H - 40} L ${x + 6} ${H - 40} L ${x} ${H - 31} Z`} fill={color} />
            <g>
              <rect x={x - 62} y={y - 22} width="124" height="40" rx="5" fill="var(--color-paper)" stroke={color} strokeWidth="1.2" />
              <text x={x} y={y - 6} textAnchor="middle" fill="var(--color-steel-900)" style={{ font: '600 12px "Zilla Slab", serif' }}>{t.name.slice(0, 18)}</text>
              <text x={x} y={y + 11} textAnchor="middle" fill={color} style={{ font: '600 12px "IBM Plex Mono", monospace' }}>{money(t.price)}{t.unit}</text>
            </g>
            {t.anchor && <text x={x} y={y - 28} textAnchor="middle" fill="var(--color-brass-700)" style={{ font: '700 9px "Public Sans", sans-serif', letterSpacing: '0.12em' }}>ANCHOR</text>}
            {t.lead && !t.anchor && <text x={x} y={y - 28} textAnchor="middle" fill="var(--color-moss)" style={{ font: '700 9px "Public Sans", sans-serif', letterSpacing: '0.12em' }}>LEAD</text>}
          </g>
        );
      })}
      {sorted.length === 0 && (
        <text x={W / 2} y={64} textAnchor="middle" className="fill-steel-500" style={{ font: 'italic 14px "Zilla Slab", serif' }}>
          An empty ruler. Add packages below and their price points appear here, measured.
        </text>
      )}
    </svg>
  );
}

function polar(cx, cy, r, deg) {
  const rad = ((deg - 180) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}
function arcPath(cx, cy, r, a0, a1) {
  const [sx, sy] = polar(cx, cy, r, a0); const [ex, ey] = polar(cx, cy, r, a1);
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}
function MarginGauge({ value, label, size = 168 }) {
  const cx = 90, cy = 84, R = 66;
  const v = clamp(num(value), 0, 100);
  const needle = (v / 100) * 180;
  const ticks = [];
  for (let i = 0; i <= 20; i++) {
    const a = (i / 20) * 180; const major = i % 5 === 0;
    const [x1, y1] = polar(cx, cy, R + 2, a); const [x2, y2] = polar(cx, cy, R - (major ? 10 : 5), a);
    ticks.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-steel-500)" strokeWidth={major ? 1.6 : 0.8} />);
    if (major) {
      const [tx, ty] = polar(cx, cy, R - 20, a);
      ticks.push(<text key={'l' + i} x={tx} y={ty + 3} textAnchor="middle" style={{ font: '9px "IBM Plex Mono", monospace' }} fill="var(--color-steel-500)">{i * 5}</text>);
    }
  }
  const zone = num(value) < 30 ? 'var(--color-signal)' : num(value) < 60 ? 'var(--color-brass-600)' : 'var(--color-moss)';
  const [nx, ny] = polar(cx, cy, R - 14, needle);
  return (
    <svg viewBox="0 0 180 118" style={{ width: size }} role="img" aria-label={`${label} margin gauge reading ${Math.round(num(value))} percent`}>
      <path d={arcPath(cx, cy, R + 6, 0, 54)} stroke="var(--color-signal)" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.75" />
      <path d={arcPath(cx, cy, R + 6, 54, 108)} stroke="var(--color-brass-500)" strokeWidth="5" fill="none" opacity="0.8" />
      <path d={arcPath(cx, cy, R + 6, 108, 180)} stroke="var(--color-moss)" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.85" />
      {ticks}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={zone} strokeWidth="2.6" strokeLinecap="round" className="gauge-needle" />
      <circle cx={cx} cy={cy} r="5.5" fill="var(--color-steel-800)" stroke="var(--color-brass-500)" strokeWidth="1.5" />
      <text x={cx} y={cy + 24} textAnchor="middle" fill={zone} style={{ font: '600 17px "IBM Plex Mono", monospace' }}>{Math.round(num(value))}%</text>
      <text x={cx} y={cy + 20} dy="16" textAnchor="middle" fill="var(--color-steel-500)" style={{ font: '9px "Public Sans", sans-serif', letterSpacing: '0.14em' }}>MARGIN</text>
    </svg>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 44 44" className="h-11 w-11" role="img" aria-label="Pricing Bench mark">
        <rect x="2" y="2" width="40" height="40" rx="7" fill="var(--color-steel-800)" stroke="var(--color-brass-500)" strokeWidth="1.5" />
        <rect x="7" y="24" width="30" height="7" rx="1.5" fill="var(--color-wood-400)" />
        {[10, 14, 18, 22, 26, 30, 34].map((x, i) => (
          <line key={x} x1={x} y1="24" x2={x} y2={i % 3 === 0 ? 29 : 27} stroke="var(--color-steel-900)" strokeWidth="1" />
        ))}
        <path d="M 13 24 L 13 12 L 21 12" stroke="var(--color-brass-500)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <circle cx="27" cy="15" r="5.5" fill="none" stroke="var(--color-paper)" strokeWidth="1.8" />
        <line x1="27" y1="15" x2="30.5" y2="12.5" stroke="var(--color-paper)" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="7" y="34" width="30" height="3" rx="1" fill="var(--color-wood-600)" />
      </svg>
      <div>
        <div className="font-display text-[26px] font-semibold leading-none tracking-tight text-paper">
          Pricing <span className="text-brass-400">Bench</span>
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.24em] text-wood-300">Measure twice · Quote once</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* main app                                                            */
/* ------------------------------------------------------------------ */
export default function App() {
  const consoleCtx = useConsoleBus();
  const [state, setState] = useState(loadInitial);
  const [tab, setTab] = useState('bench');
  const [help, setHelp] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState(null); // {msg, undo?}
  const undoRef = useRef(null);
  const toastTimer = useRef(null);
  const fileRef = useRef(null);

  /* persistence */
  useEffect(() => {
    const t = setTimeout(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* full/blocked */ } }, 350);
    return () => clearTimeout(t);
  }, [state]);

  /* first visit */
  useEffect(() => {
    if (!state.seenGuide) { setHelp(true); setState((s) => ({ ...s, seenGuide: true })); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = useCallback((msg, undo) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), 7000);
  }, []);

  const deleteWithUndo = useCallback((label, mutate) => {
    setState((s) => { undoRef.current = s; return mutate(s); });
    showToast(`${label} removed`, () => {
      if (undoRef.current) setState(undoRef.current);
      clearTimeout(toastTimer.current); setToast(null);
    });
  }, [showToast]);

  const copyText = useCallback(async (text, okMsg) => {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; }
    catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove();
      } catch { ok = false; }
    }
    showToast(ok ? okMsg : 'Copy blocked by browser — use Export JSON instead');
  }, [showToast]);

  const copyArtifact = useCallback(() => copyText(stateMarkdown(state), 'Pricing sheet copied as Markdown'), [state, copyText]);

  const downloadFile = useCallback((name, mime, content) => {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 800);
  }, []);

  const exportCSV = useCallback(() => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['date', 'package', 'price', 'segment', 'outcome', 'note'],
      ...state.tests.map((t) => [t.date, t.tierName, t.price, t.segment, t.outcome, t.note])];
    downloadFile('pricing-bench-tests.csv', 'text/csv', rows.map((r) => r.map(esc).join(',')).join('\n'));
    showToast('Price test log exported as CSV');
  }, [state.tests, downloadFile, showToast]);

  const importJSON = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = normalize(String(reader.result));
        setState((s) => { undoRef.current = s; return { ...next, seenGuide: true }; });
        showToast('Bench state imported', () => { if (undoRef.current) setState(undoRef.current); setToast(null); });
      } catch { showToast('That file could not be read as bench JSON'); }
    };
    reader.readAsText(file);
  }, [showToast]);

  /* keyboard */
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(input|textarea|select)$/i.test(e.target?.tagName || '') || e.target?.isContentEditable;
      if (e.key === 'Escape') { setHelp(false); setConfirmReset(false); setExportOpen(false); return; }
      if (typing) return;
      if (e.key === '?') { e.preventDefault(); setHelp(true); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); copyArtifact(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [copyArtifact]);

  /* mutators */
  const up = (fn) => setState((s) => fn(s));
  const patchTier = (id, patch) => up((s) => ({ ...s, tiers: s.tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const setFlag = (id, key) => up((s) => ({ ...s, tiers: s.tiers.map((t) => (t.id === id ? { ...t, [key]: !t[key] } : { ...t, [key]: false })) }));
  const moveTier = (id, dir) => up((s) => {
    const i = s.tiers.findIndex((t) => t.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= s.tiers.length) return s;
    const tiers = [...s.tiers]; [tiers[i], tiers[j]] = [tiers[j], tiers[i]];
    return { ...s, tiers };
  });
  const addTier = () => up((s) => (s.tiers.length >= 4 ? s : {
    ...s,
    tiers: [...s.tiers, normTier({ name: ['Good', 'Better', 'Best', 'Anchor'][s.tiers.length] || 'New package', unit: s.tiers[0]?.unit || '/mo', rate: s.tiers[0]?.rate || 0 })],
  }));
  const addFeature = (tierId, text) => {
    if (!text.trim()) return;
    up((s) => ({ ...s, tiers: s.tiers.map((t) => (t.id === tierId ? { ...t, features: [...t.features, { id: uid(), text: text.trim() }] } : t)) }));
  };
  const patchFeature = (tierId, fid, text) => up((s) => ({
    ...s, tiers: s.tiers.map((t) => (t.id === tierId ? { ...t, features: t.features.map((f) => (f.id === fid ? { ...f, text } : f)) } : t)),
  }));
  const moveFeature = (tierId, fid, dir) => up((s) => ({
    ...s,
    tiers: s.tiers.map((t) => {
      if (t.id !== tierId) return t;
      const i = t.features.findIndex((f) => f.id === fid); const j = i + dir;
      if (i < 0 || j < 0 || j >= t.features.length) return t;
      const features = [...t.features]; [features[i], features[j]] = [features[j], features[i]];
      return { ...t, features };
    }),
  }));

  const prompts = useMemo(() => buildPrompts(state, consoleCtx), [state, consoleCtx]);
  const checks = useMemo(() => ladderChecks(state.tiers), [state.tiers]);
  const testStats = useMemo(() => {
    const n = state.tests.length;
    const acc = state.tests.filter((t) => t.outcome === 'accepted');
    const byTier = {};
    state.tests.forEach((t) => {
      const k = t.tierName || '—';
      byTier[k] = byTier[k] || { n: 0, acc: 0 };
      byTier[k].n++; if (t.outcome === 'accepted') byTier[k].acc++;
    });
    return {
      n, accN: acc.length,
      accRate: n ? (acc.length / n) * 100 : 0,
      avgAccepted: acc.length ? acc.reduce((a, t) => a + num(t.price), 0) / acc.length : 0,
      byTier,
    };
  }, [state.tests]);

  const TABS = [
    { id: 'bench', label: 'Package Bench', icon: Hammer },
    { id: 'gauges', label: 'Margin Gauges', icon: GaugeIcon },
    { id: 'tests', label: 'Price Test Log', icon: FlaskConical },
    { id: 'metric', label: 'Value Metric', icon: Scale },
  ];

  return (
    <div className="min-h-screen text-steel-900">
      {/* ---------------- header ---------------- */}
      <header className="no-print bench-top relative border-b-4 border-wood-700 text-paper">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <Wordmark />
            {consoleCtx && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-brass-400/50 bg-wood-900/40 px-2.5 py-1 text-xs font-medium text-wood-100"
                title="Linked to the BizDev Console">
                <Cable className="h-3.5 w-3.5 text-brass-400" aria-hidden />
                Console linked{consoleCtx.profile?.company ? ` · ${consoleCtx.profile.company}` : ''}
              </span>
            )}
          </div>
          <p className="hidden max-w-xs text-sm leading-snug text-wood-100/90 md:block">
            Engineer your packages, price points, and margins — then test them like an instrument, not a guess.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button className={btnTool} onClick={() => { setState({ ...DEMO, seenGuide: true }); showToast('Demo bench loaded — a worked example, edit anything'); }}>
              <Sparkles className="h-4 w-4 text-brass-600" aria-hidden />Load demo
            </button>
            <button className={btnTool} onClick={() => setConfirmReset(true)}>
              <RotateCcw className="h-4 w-4" aria-hidden />Reset
            </button>
            <button className={btnTool} onClick={() => setHelp(true)}>
              <HelpCircle className="h-4 w-4" aria-hidden />How to use
            </button>
            <div className="relative">
              <button className={btnBrass} onClick={() => setExportOpen((v) => !v)} aria-expanded={exportOpen} aria-haspopup="menu">
                <Download className="h-4 w-4" aria-hidden />Export
              </button>
              {exportOpen && (
                <div role="menu" className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-lg border border-steel-300 bg-paper text-steel-800 shadow-bench">
                  {[
                    { icon: FileText, label: 'Copy Markdown sheet', act: () => copyArtifact() },
                    { icon: Download, label: 'Download JSON (full state)', act: () => { downloadFile('pricing-bench.json', 'application/json', JSON.stringify(state, null, 2)); showToast('Bench state downloaded'); } },
                    { icon: Upload, label: 'Import JSON…', act: () => fileRef.current?.click() },
                    { icon: FlaskConical, label: 'Test log as CSV', act: exportCSV },
                  ].map((m) => (
                    <button key={m.label} role="menuitem" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm hover:bg-wood-50 focus-visible:bg-wood-50 focus-visible:outline-none"
                      onClick={() => { setExportOpen(false); m.act(); }}>
                      <m.icon className="h-4 w-4 text-brass-700" aria-hidden />{m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Import bench JSON file"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importJSON(f); e.target.value = ''; }} />
          </div>
        </div>
      </header>

      {/* ---------------- hero ruler ---------------- */}
      <section className="no-print border-b border-wood-300 bg-wood-50/70">
        <div className="mx-auto max-w-7xl px-4 pb-2 pt-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-steel-500">
              <Ruler className="h-3.5 w-3.5 text-brass-700" aria-hidden />The price ladder, to scale
            </div>
            {state.service.name && <div className="hidden truncate pl-4 font-display text-sm italic text-steel-600 sm:block">{state.service.name}</div>}
          </div>
          <PriceRuler tiers={state.tiers} />
        </div>
      </section>

      {/* ---------------- tabs ---------------- */}
      <nav className="no-print sticky top-0 z-30 border-b border-wood-300 bg-paper/95 backdrop-blur" aria-label="Sections">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-1.5 border-b-[3px] px-3.5 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brass-600 ${tab === t.id ? 'border-brass-600 text-steel-900' : 'border-transparent text-steel-500 hover:text-steel-800'}`}>
              <t.icon className={`h-4 w-4 ${tab === t.id ? 'text-brass-700' : ''}`} aria-hidden />{t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ---------------- body ---------------- */}
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_330px]">
        <div className="min-w-0">
          {/* service line */}
          <div className={`no-print mb-6 rounded-xl border border-wood-300 bg-paper p-4 shadow-card ${tab === 'bench' ? '' : 'hidden'}`}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="svc-name">Service on the bench</label>
                <input id="svc-name" className={inputCls} placeholder="e.g. Done-for-you revenue dashboards for B2B SaaS"
                  value={state.service.name} onChange={(e) => up((s) => ({ ...s, service: { ...s.service, name: e.target.value } }))} />
              </div>
              <div>
                <label className={labelCls} htmlFor="svc-icp">Who buys it (ICP)</label>
                <input id="svc-icp" className={inputCls} placeholder="e.g. Seed-to-Series B SaaS, no data team, RevOps buyer"
                  value={state.service.icp} onChange={(e) => up((s) => ({ ...s, service: { ...s.service, icp: e.target.value } }))} />
              </div>
            </div>
            <div className="mt-3">
              <label className={labelCls} htmlFor="svc-promise">One-line promise</label>
              <input id="svc-promise" className={inputCls} placeholder="The outcome you sell, in one sentence"
                value={state.service.promise} onChange={(e) => up((s) => ({ ...s, service: { ...s.service, promise: e.target.value } }))} />
            </div>
          </div>

          {/* ============ TAB: bench ============ */}
          <section className={tab === 'bench' ? '' : 'hidden'} aria-label="Package bench">
            <SectionHead icon={Hammer} kicker="Station 01" title="Package Bench">
              <button className={btnBrass} onClick={addTier} disabled={state.tiers.length >= 4}>
                <Plus className="h-4 w-4" aria-hidden />Add package
              </button>
            </SectionHead>

            {state.tiers.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-wood-400 bg-wood-50/60 p-8 text-center">
                <Wrench className="mx-auto h-8 w-8 text-brass-600" aria-hidden />
                <h3 className="mt-3 font-display text-xl font-semibold">The bench is clear</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-steel-600">
                  Build a good/better/best ladder: start with the package most buyers should pick, add a smaller
                  entry rung, then a high anchor whose only job is to make the middle feel sane.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <button className={btnBrass} onClick={addTier}><Plus className="h-4 w-4" aria-hidden />Start the first package</button>
                  <button className={btnTool} onClick={() => { setState({ ...DEMO, seenGuide: true }); showToast('Demo bench loaded'); }}>
                    <Sparkles className="h-4 w-4 text-brass-600" aria-hidden />See a worked example
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {state.tiers.map((t, i) => (
                  <article key={t.id} className={`relative flex flex-col rounded-xl border bg-paper shadow-card ${t.lead ? 'border-moss ring-1 ring-moss/40' : t.anchor ? 'border-brass-500 ring-1 ring-brass-500/40' : 'border-wood-300'}`}>
                    <div className="flex items-center justify-between rounded-t-xl border-b border-wood-200 bg-wood-50 px-3.5 py-2">
                      <span className="stamp font-mono text-[10px] tracking-[0.2em] text-steel-600">{ROLE_STAMPS[i] || 'EXTRA'}</span>
                      <div className="flex items-center gap-0.5">
                        <button className={btnGhostIcon} onClick={() => moveTier(t.id, -1)} disabled={i === 0} aria-label={`Move ${t.name} left`}><ChevronLeft className="h-4 w-4" aria-hidden /></button>
                        <button className={btnGhostIcon} onClick={() => moveTier(t.id, 1)} disabled={i === state.tiers.length - 1} aria-label={`Move ${t.name} right`}><ChevronRight className="h-4 w-4" aria-hidden /></button>
                        <button className={`${btnGhostIcon} hover:text-signal`} aria-label={`Delete package ${t.name}`}
                          onClick={() => deleteWithUndo(`Package “${t.name}”`, (s) => ({ ...s, tiers: s.tiers.filter((x) => x.id !== t.id) }))}>
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 space-y-3 p-3.5">
                      <input className={`${inputCls} font-display text-lg font-semibold`} value={t.name} aria-label="Package name"
                        onChange={(e) => patchTier(t.id, { name: e.target.value })} />
                      <input className={inputCls} value={t.tagline} placeholder="One-line positioning" aria-label={`Tagline for ${t.name}`}
                        onChange={(e) => patchTier(t.id, { tagline: e.target.value })} />
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className={labelCls} htmlFor={`price-${t.id}`}>Price</label>
                          <div className="relative">
                            <CircleDollarSign className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-brass-600" aria-hidden />
                            <input id={`price-${t.id}`} type="number" min="0" className={`${inputCls} pl-8 font-mono`} value={t.price || ''}
                              onChange={(e) => patchTier(t.id, { price: num(e.target.value) })} />
                          </div>
                        </div>
                        <div className="w-20">
                          <label className={labelCls} htmlFor={`unit-${t.id}`}>Unit</label>
                          <input id={`unit-${t.id}`} className={`${inputCls} font-mono`} value={t.unit}
                            onChange={(e) => patchTier(t.id, { unit: e.target.value })} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setFlag(t.id, 'lead')} aria-pressed={t.lead}
                          className={`${btnBase} flex-1 justify-center px-2 py-1.5 text-xs border ${t.lead ? 'border-moss bg-moss text-paper' : 'border-steel-300 bg-paper text-steel-600 hover:border-moss hover:text-moss'}`}>
                          <Star className="h-3.5 w-3.5" aria-hidden />{t.lead ? 'Lead package' : 'Mark as lead'}
                        </button>
                        <button onClick={() => setFlag(t.id, 'anchor')} aria-pressed={t.anchor}
                          className={`${btnBase} flex-1 justify-center px-2 py-1.5 text-xs border ${t.anchor ? 'border-brass-600 bg-brass-600 text-paper' : 'border-steel-300 bg-paper text-steel-600 hover:border-brass-600 hover:text-brass-700'}`}>
                          <Anchor className="h-3.5 w-3.5" aria-hidden />{t.anchor ? 'Anchor' : 'Mark as anchor'}
                        </button>
                      </div>
                      <div>
                        <div className={labelCls}>What's included</div>
                        <ul className="space-y-1.5">
                          {t.features.map((f, fi) => (
                            <li key={f.id} className="group flex items-center gap-1">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brass-600" aria-hidden />
                              <input className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm hover:border-steel-200 focus-visible:border-steel-300 focus-visible:outline-2 focus-visible:outline-brass-600"
                                value={f.text} aria-label={`Feature ${fi + 1} of ${t.name}`}
                                onChange={(e) => patchFeature(t.id, f.id, e.target.value)} />
                              <span className="flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                                <button className={btnGhostIcon} onClick={() => moveFeature(t.id, f.id, -1)} disabled={fi === 0} aria-label="Move feature up"><ChevronUp className="h-3.5 w-3.5" aria-hidden /></button>
                                <button className={btnGhostIcon} onClick={() => moveFeature(t.id, f.id, 1)} disabled={fi === t.features.length - 1} aria-label="Move feature down"><ChevronDown className="h-3.5 w-3.5" aria-hidden /></button>
                                <button className={`${btnGhostIcon} hover:text-signal`} aria-label={`Delete feature: ${f.text || 'empty'}`}
                                  onClick={() => deleteWithUndo('Feature', (s) => ({ ...s, tiers: s.tiers.map((x) => (x.id === t.id ? { ...x, features: x.features.filter((ff) => ff.id !== f.id) } : x)) }))}>
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                </button>
                              </span>
                            </li>
                          ))}
                        </ul>
                        <FeatureAdder onAdd={(txt) => addFeature(t.id, txt)} tierName={t.name} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-b-xl border-t border-wood-200 bg-wood-50/70 px-3.5 py-2 font-mono text-[11px] text-steel-600">
                      <span>cost {money(tierCost(t))}</span>
                      <span className={tierMargin(t) < 30 ? 'text-signal' : tierMargin(t) < 60 ? 'text-brass-700' : 'text-moss'}>
                        {num(t.price) > 0 ? `${Math.round(tierMargin(t))}% margin` : 'unpriced'}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* anchor logic */}
            <div className="mt-6 rounded-xl border border-wood-300 bg-paper p-4 shadow-card">
              <div className="mb-3 flex items-center gap-2">
                <Anchor className="h-4 w-4 text-brass-700" aria-hidden />
                <h3 className="font-display text-lg font-semibold">Anchor logic — the bench check</h3>
              </div>
              {checks.length === 0 ? (
                <p className="text-sm text-steel-500">Add packages and the bench will inspect your ladder: count, ratios, anchor placement, lead placement, margins.</p>
              ) : (
                <ul className="space-y-2">
                  {checks.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      {c.ok
                        ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-moss" aria-hidden />
                        : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brass-700" aria-hidden />}
                      <span className={c.ok ? 'text-steel-700' : 'text-steel-800'}>{c.text}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4">
                <label className={labelCls} htmlFor="anchor-note">Your anchor rationale (goes on the exported sheet)</label>
                <textarea id="anchor-note" rows={2} className={inputCls} placeholder="Why the ladder is shaped this way, what the anchor is doing, what you will never discount…"
                  value={state.anchorNote} onChange={(e) => up((s) => ({ ...s, anchorNote: e.target.value }))} />
              </div>
            </div>
          </section>

          {/* ============ TAB: gauges ============ */}
          <section className={tab === 'gauges' ? '' : 'hidden'} aria-label="Margin gauges">
            <SectionHead icon={GaugeIcon} kicker="Station 02" title="Margin Gauges" />
            {state.tiers.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-wood-400 bg-wood-50/60 p-8 text-center">
                <GaugeIcon className="mx-auto h-8 w-8 text-brass-600" aria-hidden />
                <h3 className="mt-3 font-display text-xl font-semibold">No instruments to read</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-steel-600">Add packages on the bench first, then dial in delivery hours, loaded rate, and hard costs here — the gauges show true margin per tier.</p>
                <button className={`${btnBrass} mt-4`} onClick={() => setTab('bench')}><Hammer className="h-4 w-4" aria-hidden />Go to the bench</button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {state.tiers.map((t) => (
                  <article key={t.id} className="rounded-xl border border-wood-300 bg-paper p-4 shadow-card">
                    <div className="flex items-baseline justify-between">
                      <h3 className="font-display text-lg font-semibold">{t.name}</h3>
                      <span className="font-mono text-sm text-brass-700">{money(t.price)}{t.unit}</span>
                    </div>
                    <div className="mt-1 flex justify-center"><MarginGauge value={tierMargin(t)} label={t.name} /></div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {[
                        { k: 'hours', label: 'Hours', step: '0.5' },
                        { k: 'rate', label: 'Rate $/h', step: '1' },
                        { k: 'hardCosts', label: 'Hard $', step: '1' },
                      ].map((f) => (
                        <div key={f.k}>
                          <label className={labelCls} htmlFor={`${f.k}-${t.id}`}>{f.label}</label>
                          <input id={`${f.k}-${t.id}`} type="number" min="0" step={f.step} className={`${inputCls} font-mono`} value={t[f.k] || ''}
                            onChange={(e) => patchTier(t.id, { [f.k]: num(e.target.value) })} />
                        </div>
                      ))}
                    </div>
                    <dl className="mt-3 space-y-1 border-t border-dashed border-wood-300 pt-2.5 font-mono text-[12px] text-steel-600">
                      <div className="flex justify-between"><dt>Delivery cost</dt><dd>{money(tierCost(t))}</dd></div>
                      <div className="flex justify-between"><dt>Gross profit</dt><dd className={num(t.price) - tierCost(t) < 0 ? 'text-signal' : 'text-moss'}>{money(num(t.price) - tierCost(t))}</dd></div>
                      <div className="flex justify-between"><dt>Effective $/h</dt><dd>{t.hours > 0 ? money(num(t.price) / t.hours) : '—'}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
            {state.tiers.length > 0 && (
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-wood-300 bg-wood-50/70 px-4 py-3 text-sm text-steel-600">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-brass-700" aria-hidden />
                <p>Shop rule: red zone under 30% means the package subsidizes its buyers; 30–60% funds delivery but not growth; over 60% is where productized services should idle. Raise price or cut scope — never quietly eat hours.</p>
              </div>
            )}
          </section>

          {/* ============ TAB: tests ============ */}
          <section className={tab === 'tests' ? '' : 'hidden'} aria-label="Price test log">
            <SectionHead icon={FlaskConical} kicker="Station 03" title="Price Test Log">
              <button className={btnTool} onClick={exportCSV} disabled={!state.tests.length}><Download className="h-4 w-4" aria-hidden />CSV</button>
            </SectionHead>
            <TestForm tiers={state.tiers} onAdd={(t) => { up((s) => ({ ...s, tests: [normTest(t), ...s.tests] })); showToast('Test logged'); }} />
            {state.tests.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <StatPlate label="Tests run" value={String(testStats.n)} />
                <StatPlate label="Accept rate" value={pct(testStats.accRate)} tone={testStats.accRate >= 80 ? 'warn' : 'ok'}
                  sub={testStats.accRate >= 80 && testStats.n >= 4 ? 'Everyone says yes — you are underpriced' : undefined} />
                <StatPlate label="Avg accepted price" value={testStats.avgAccepted ? money(testStats.avgAccepted) : '—'} />
              </div>
            )}
            <div className="mt-4 space-y-2.5">
              {state.tests.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-wood-400 bg-wood-50/60 p-8 text-center">
                  <FlaskConical className="mx-auto h-8 w-8 text-brass-600" aria-hidden />
                  <h3 className="mt-3 font-display text-xl font-semibold">No readings yet</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-steel-600">
                    Every quote is a test. Log the price you said, to whom, and what happened — after five entries the
                    pattern speaks. If nobody ever flinches, the number is too low.
                  </p>
                </div>
              ) : state.tests.map((t) => {
                const o = OUTCOMES.find((x) => x.id === t.outcome);
                return (
                  <article key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-wood-300 bg-paper px-3.5 py-2.5 shadow-card">
                    <span className="font-mono text-[11px] text-steel-500">{t.date}</span>
                    <span className="font-display text-sm font-semibold">{t.tierName || '—'}</span>
                    <span className="font-mono text-sm text-brass-700">{money(t.price)}</span>
                    <span className="text-sm text-steel-500">{t.segment}</span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border border-current/30 px-2 py-0.5 text-xs font-medium ${o.tone}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${o.dot}`} aria-hidden />{o.label}
                    </span>
                    {t.note && <span className="w-full text-sm text-steel-600 sm:w-auto sm:flex-1">{t.note}</span>}
                    <button className={`${btnGhostIcon} ml-auto hover:text-signal`} aria-label={`Delete test from ${t.date}`}
                      onClick={() => deleteWithUndo('Test entry', (s) => ({ ...s, tests: s.tests.filter((x) => x.id !== t.id) }))}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </article>
                );
              })}
            </div>
            {Object.keys(testStats.byTier).length > 0 && (
              <div className="mt-5 rounded-xl border border-wood-300 bg-paper p-4 shadow-card">
                <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold"><TrendingUp className="h-4 w-4 text-brass-700" aria-hidden />Acceptance by package</h3>
                <div className="space-y-2.5">
                  {Object.entries(testStats.byTier).map(([name, v]) => (
                    <div key={name} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 truncate font-display text-sm font-semibold">{name}</span>
                      <div className="h-4 flex-1 overflow-hidden rounded-sm border border-steel-300 bg-wood-100">
                        <div className="h-full bg-moss transition-all" style={{ width: `${v.n ? (v.acc / v.n) * 100 : 0}%` }} />
                      </div>
                      <span className="w-24 shrink-0 text-right font-mono text-[11px] text-steel-600">{v.acc}/{v.n} accepted</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ============ TAB: metric ============ */}
          <section className={tab === 'metric' ? '' : 'hidden'} aria-label="Value metric picker">
            <SectionHead icon={Scale} kicker="Station 04" title="Value Metric Picker">
              <div className="flex gap-2">
                {state.metrics.length === 0 && (
                  <button className={btnTool} onClick={() => up((s) => ({ ...s, metrics: PRESET_METRICS.map((name) => normMetric({ name })) }))}>
                    <ListChecks className="h-4 w-4 text-brass-600" aria-hidden />Add the classics
                  </button>
                )}
                <button className={btnBrass} onClick={() => up((s) => ({ ...s, metrics: [...s.metrics, normMetric({ name: 'New metric' })] }))}>
                  <Plus className="h-4 w-4" aria-hidden />Add candidate
                </button>
              </div>
            </SectionHead>
            {state.metrics.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-wood-400 bg-wood-50/60 p-8 text-center">
                <Scale className="mx-auto h-8 w-8 text-brass-600" aria-hidden />
                <h3 className="mt-3 font-display text-xl font-semibold">What do you charge for?</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-steel-600">
                  The value metric is the unit your price scales on — retainer, seat, project, percentage. Score each
                  candidate on four criteria and put the winner on the bench. Start with the classics if unsure.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {[...state.metrics].sort((a, b) => metricScore(b) - metricScore(a)).map((m) => {
                  const chosen = m.id === state.chosenMetricId;
                  const score = metricScore(m);
                  return (
                    <article key={m.id} className={`rounded-xl border bg-paper p-4 shadow-card ${chosen ? 'border-brass-500 ring-1 ring-brass-500/50' : 'border-wood-300'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <input className={`${inputCls} font-display text-base font-semibold`} value={m.name} aria-label="Value metric name"
                          onChange={(e) => up((s) => ({ ...s, metrics: s.metrics.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)) }))} />
                        <button className={`${btnGhostIcon} hover:text-signal`} aria-label={`Delete metric ${m.name}`}
                          onClick={() => deleteWithUndo(`Metric “${m.name}”`, (s) => ({ ...s, metrics: s.metrics.filter((x) => x.id !== m.id), chosenMetricId: s.chosenMetricId === m.id ? null : s.chosenMetricId }))}>
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                      <div className="mt-3 space-y-2.5">
                        {METRIC_CRITERIA.map((c) => (
                          <div key={c.key} className="flex items-center gap-3">
                            <label className="w-44 shrink-0 text-xs text-steel-600" htmlFor={`m-${m.id}-${c.key}`}>{c.label}</label>
                            <input id={`m-${m.id}-${c.key}`} type="range" min="1" max="5" step="1" value={m.scores[c.key]} className="bench-range flex-1"
                              onChange={(e) => up((s) => ({ ...s, metrics: s.metrics.map((x) => (x.id === m.id ? { ...x, scores: { ...x.scores, [c.key]: num(e.target.value) } } : x)) }))} />
                            <span className="w-4 text-right font-mono text-xs text-brass-700">{m.scores[c.key]}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-3 flex-1 overflow-hidden rounded-sm border border-steel-300 bg-wood-100">
                          <div className={`h-full ${score >= 70 ? 'bg-moss' : score >= 50 ? 'bg-brass-500' : 'bg-signal/80'}`} style={{ width: `${score}%` }} />
                        </div>
                        <span className="font-mono text-sm font-semibold text-steel-800">{Math.round(score)}<span className="text-[10px] text-steel-500">/100</span></span>
                      </div>
                      <input className={`${inputCls} mt-3`} placeholder="Notes — why it could work, what breaks" value={m.note} aria-label={`Notes for ${m.name}`}
                        onChange={(e) => up((s) => ({ ...s, metrics: s.metrics.map((x) => (x.id === m.id ? { ...x, note: e.target.value } : x)) }))} />
                      <button onClick={() => up((s) => ({ ...s, chosenMetricId: chosen ? null : m.id }))} aria-pressed={chosen}
                        className={`${btnBase} mt-3 w-full justify-center border px-3 py-2 text-sm ${chosen ? 'border-brass-600 bg-brass-600 text-paper' : 'border-steel-300 bg-paper text-steel-700 hover:border-brass-600 hover:text-brass-700'}`}>
                        <BadgeCheck className="h-4 w-4" aria-hidden />{chosen ? 'On the bench — your value metric' : 'Put this on the bench'}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* ---------------- copilot rail ---------------- */}
        <aside className="no-print min-w-0" aria-label="Claude Copilot">
          <div className="rounded-xl border border-steel-400 bg-steel-800 p-4 text-wood-50 shadow-bench lg:sticky lg:top-16">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brass-400" aria-hidden />
              <h2 className="font-display text-lg font-semibold text-paper">Claude Copilot</h2>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-wood-200/80">
              Each action forges a complete prompt around your current bench state.
              Paste into claude.ai — works with the standard Claude subscription.
            </p>
            <div className="mt-3.5 space-y-2.5">
              {prompts.map((p) => (
                <div key={p.id} className="rounded-lg border border-steel-600 bg-steel-900/60 p-3">
                  <div className="flex items-center gap-2">
                    <p.icon className="h-4 w-4 shrink-0 text-brass-400" aria-hidden />
                    <h3 className="text-sm font-semibold text-paper">{p.title}</h3>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-wood-200/70">{p.desc}</p>
                  <button className={`${btnBase} mt-2.5 w-full justify-center border border-brass-500/60 bg-brass-600/15 px-3 py-1.5 text-xs text-brass-300 hover:bg-brass-600 hover:text-paper`}
                    onClick={() => copyText(p.prompt + PROMPT_TAIL, `Prompt copied — paste into claude.ai`)}>
                    <Copy className="h-3.5 w-3.5" aria-hidden />Copy prompt
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-steel-600 pt-3.5">
              <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-wood-200" htmlFor="copilot-notes">
                <ClipboardPaste className="h-3.5 w-3.5 text-brass-400" aria-hidden />Paste Claude's answer back
              </label>
              <textarea id="copilot-notes" rows={5} value={state.copilotNotes}
                onChange={(e) => up((s) => ({ ...s, copilotNotes: e.target.value }))}
                placeholder="Keep the verdicts, structures, and copy Claude gives you here — it saves with your bench."
                className="w-full rounded-md border border-steel-600 bg-steel-900 px-2.5 py-2 text-xs text-wood-50 placeholder:text-steel-500 focus-visible:outline-2 focus-visible:outline-brass-500" />
            </div>
          </div>
        </aside>
      </main>

      <footer className="no-print border-t border-wood-300 py-5 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-steel-400">
        Pricing Bench · your data stays in this browser · press ? for help · Ctrl+S copies the sheet
      </footer>

      {/* ---------------- print sheet ---------------- */}
      <PrintSheet state={state} />

      {/* ---------------- modals ---------------- */}
      <Modal open={help} onClose={() => setHelp(false)} title="How to use Pricing Bench" wide>
        <ol className="list-none space-y-3">
          {[
            ['Name the work', 'Describe the service, its one-line promise, and who buys it (top of the Package Bench). Every Copilot prompt embeds this.'],
            ['Build the ladder', 'Add up to four packages — good, better, best, and an optional stretch anchor. Give each a name, tagline, price, and 4–6 included features. Reorder with the arrows.'],
            ['Set anchor + lead', 'Flag your highest tier as Anchor (it reprices the middle) and the tier most buyers should pick as Lead. The bench check below inspects your ratios and placement.'],
            ['Read the gauges', 'On Margin Gauges, enter delivery hours, loaded hourly rate, and hard costs per package. The dials show true margin; stay out of the red zone (<30%).'],
            ['Log every quote', 'On Price Test Log, record each price you actually said out loud: package, price, segment, outcome. The accept-rate plate tells you when to raise.'],
            ['Pick the value metric', 'On Value Metric, score candidates (retainer, per seat, per project…) on four criteria and put the winner on the bench.'],
            ['Bring in Claude', 'In the Copilot rail, copy any prompt — it packs your whole bench state in — and paste it into claude.ai. Save the answer in the notes box.'],
            ['Ship it', 'Export: Copy Markdown for the full pricing sheet, JSON for backup/import, CSV for the test log. Print gives a clean spec sheet.'],
          ].map(([t, d], i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brass-600 font-mono text-xs font-semibold text-paper">{i + 1}</span>
              <p className="text-sm leading-relaxed text-steel-700"><strong className="font-display text-steel-900">{t}.</strong> {d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-5 rounded-lg border border-wood-300 bg-wood-50 p-3.5">
          <h4 className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-steel-500">Keyboard shortcuts</h4>
          <div className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-3">
            {[['?', 'Open this guide'], ['Esc', 'Close dialogs & menus'], ['Ctrl/Cmd+S', 'Copy pricing sheet']].map(([k, d]) => (
              <div key={k} className="flex items-center gap-2">
                <kbd className="rounded border border-steel-300 bg-paper px-1.5 py-0.5 font-mono text-xs shadow-[0_1px_0_rgba(0,0,0,0.15)]">{k}</kbd>
                <span className="text-steel-600">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Clear the bench?">
        <p className="text-sm leading-relaxed text-steel-700">
          This wipes every package, gauge reading, test entry, and metric from this browser.
          If this ladder took work, download the JSON first — there is no undo for a full reset.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button className={btnTool} onClick={() => setConfirmReset(false)}>Keep my work</button>
          <button className={`${btnBase} bg-signal px-3 py-1.5 text-sm text-paper hover:bg-signal/85`}
            onClick={() => { setState(normalize({ seenGuide: true })); setConfirmReset(false); showToast('Bench cleared'); }}>
            <RotateCcw className="h-4 w-4" aria-hidden />Reset everything
          </button>
        </div>
      </Modal>

      {/* ---------------- toast ---------------- */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-lg border border-steel-600 bg-steel-900 px-4 py-2.5 text-sm text-wood-50 shadow-bench print:hidden" role="status">
          <span>{toast.msg}</span>
          {toast.undo && (
            <button className={`${btnBase} border border-brass-500 px-2.5 py-1 text-xs text-brass-300 hover:bg-brass-600 hover:text-paper`} onClick={toast.undo}>
              <Undo2 className="h-3.5 w-3.5" aria-hidden />Undo
            </button>
          )}
          <button className={`${btnGhostIcon} text-steel-400 hover:bg-steel-800 hover:text-paper`} onClick={() => { clearTimeout(toastTimer.current); setToast(null); }} aria-label="Dismiss notification">
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* subcomponents                                                       */
/* ------------------------------------------------------------------ */
function FeatureAdder({ onAdd, tierName }) {
  const [v, setV] = useState('');
  return (
    <form className="mt-2 flex gap-1.5" onSubmit={(e) => { e.preventDefault(); onAdd(v); setV(''); }}>
      <input className={`${inputCls} py-1 text-xs`} value={v} onChange={(e) => setV(e.target.value)}
        placeholder="Add an included feature…" aria-label={`Add feature to ${tierName}`} />
      <button type="submit" className={`${btnTool} px-2 py-1`} aria-label={`Add feature to ${tierName}`} disabled={!v.trim()}>
        <Plus className="h-3.5 w-3.5" aria-hidden />
      </button>
    </form>
  );
}

function StatPlate({ label, value, sub, tone }) {
  return (
    <div className="rounded-lg border border-steel-300 bg-steel-800 px-4 py-3 text-center shadow-card">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-wood-300">{label}</div>
      <div className={`font-mono text-2xl font-semibold ${tone === 'warn' ? 'text-brass-400' : 'text-paper'}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-brass-400">{sub}</div>}
    </div>
  );
}

function TestForm({ tiers, onAdd }) {
  const [form, setForm] = useState({ date: todayISO(), tierName: '', price: '', segment: '', outcome: 'accepted', note: '' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <form className="rounded-xl border border-wood-300 bg-paper p-4 shadow-card"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd({ ...form, price: num(form.price) });
        setForm({ date: todayISO(), tierName: form.tierName, price: '', segment: '', outcome: 'accepted', note: '' });
      }}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className={labelCls} htmlFor="tf-date">Date</label>
          <input id="tf-date" type="date" className={`${inputCls} font-mono`} value={form.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="tf-tier">Package</label>
          {tiers.length ? (
            <select id="tf-tier" className={inputCls} value={form.tierName}
              onChange={(e) => { const t = tiers.find((x) => x.name === e.target.value); setForm((f) => ({ ...f, tierName: e.target.value, price: f.price || (t ? String(t.price) : '') })); }}>
              <option value="">— pick —</option>
              {tiers.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          ) : (
            <input id="tf-tier" className={inputCls} placeholder="Package name" value={form.tierName} onChange={(e) => set('tierName', e.target.value)} />
          )}
        </div>
        <div>
          <label className={labelCls} htmlFor="tf-price">Price quoted</label>
          <input id="tf-price" type="number" min="0" className={`${inputCls} font-mono`} value={form.price} onChange={(e) => set('price', e.target.value)} required />
        </div>
        <div>
          <label className={labelCls} htmlFor="tf-seg">Segment / prospect</label>
          <input id="tf-seg" className={inputCls} placeholder="e.g. Series A, 30 ppl" value={form.segment} onChange={(e) => set('segment', e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="tf-out">Outcome</label>
          <select id="tf-out" className={inputCls} value={form.outcome} onChange={(e) => set('outcome', e.target.value)}>
            {OUTCOMES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="min-w-52 flex-1">
          <label className={labelCls} htmlFor="tf-note">What happened (the flinch, the pause, the counter)</label>
          <input id="tf-note" className={inputCls} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="They paused 3 seconds, then asked about annual billing…" />
        </div>
        <button type="submit" className={btnBrass}><NotebookPen className="h-4 w-4" aria-hidden />Log test</button>
      </div>
    </form>
  );
}

function PrintSheet({ state: s }) {
  return (
    <div className="print-sheet hidden">
      <h1>Pricing sheet — {s.service.name || 'Untitled service'}</h1>
      {s.service.promise && <p className="promise">{s.service.promise}</p>}
      {s.service.icp && <p><strong>ICP:</strong> {s.service.icp}</p>}
      <h2>Packages</h2>
      <table>
        <thead><tr><th>Package</th><th>Price</th><th>Included</th><th>Cost</th><th>Margin</th></tr></thead>
        <tbody>
          {s.tiers.map((t) => (
            <tr key={t.id}>
              <td><strong>{t.name}</strong>{t.lead ? ' (LEAD)' : ''}{t.anchor ? ' (ANCHOR)' : ''}<br /><em>{t.tagline}</em></td>
              <td>{money(t.price)}{t.unit}</td>
              <td>{t.features.map((f) => f.text).filter(Boolean).join(' · ')}</td>
              <td>{money(tierCost(t))}</td>
              <td>{num(t.price) > 0 ? `${Math.round(tierMargin(t))}%` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {s.anchorNote && (<><h2>Anchor logic</h2><p>{s.anchorNote}</p></>)}
      {s.metrics.length > 0 && (
        <>
          <h2>Value metric candidates</h2>
          <ul>{s.metrics.map((m) => <li key={m.id}>{m.name} — {Math.round(metricScore(m))}/100{m.id === s.chosenMetricId ? ' — CHOSEN' : ''}{m.note ? ` — ${m.note}` : ''}</li>)}</ul>
        </>
      )}
      {s.tests.length > 0 && (
        <>
          <h2>Price test log</h2>
          <table>
            <thead><tr><th>Date</th><th>Package</th><th>Price</th><th>Segment</th><th>Outcome</th><th>Note</th></tr></thead>
            <tbody>
              {s.tests.map((t) => (
                <tr key={t.id}><td>{t.date}</td><td>{t.tierName}</td><td>{money(t.price)}</td><td>{t.segment}</td><td>{OUTCOMES.find((o) => o.id === t.outcome)?.label}</td><td>{t.note}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
