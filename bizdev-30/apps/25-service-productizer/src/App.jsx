import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Trash2, Copy, Check, Download, Upload, HelpCircle, RotateCcw, X,
  ChevronDown, ArrowUp, ArrowDown, Printer, FileJson, FileText, FileSpreadsheet,
  GripVertical, Search, Sparkles, Eye, PenLine, Link2, ClipboardPaste,
  Circle, CircleCheck, CircleAlert, Stamp, Target, PackageCheck, Route, Fence,
  Tag, ClipboardCheck, Factory, Wrench, Gauge, OctagonAlert, Scale, PackagePlus,
  Rocket, ShieldQuestion, Truck, MoveRight, DollarSign,
} from 'lucide-react';

/* ==================================================================== *
 *  SERVICE PRODUCTIZER — turn custom work into fixed-scope offers      *
 *  World: factory line. Off-white shop floor, safety-yellow guides,    *
 *  steel-gray structure, conveyor-belt step flow, stencil headlines.   *
 *  Fonts: Public Sans (display + body), IBM Plex Mono (readouts).      *
 * ==================================================================== */

const SLUG = '25-service-productizer';
const LS_KEY = 'bizdev:25-service-productizer:v1';

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const str = (v, d = '') => (typeof v === 'string' ? v : d);
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const arr = (v) => (Array.isArray(v) ? v : []);
const wordCount = (t) => str(t).split(/\s+/).filter(Boolean).length;

const CURRENCIES = [
  ['USD', '$'], ['EUR', '€'], ['GBP', '£'], ['CAD', 'CA$'], ['AUD', 'AU$'],
];
function fmtMoney(n, cur) {
  const v = num(n, 0);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: cur || 'USD',
      minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(v);
  } catch {
    return `$${v.toLocaleString()}`;
  }
}
const PRICE_UNITS = ['one-time', 'per month', 'per phase'];
function unitSuffix(u) {
  return u === 'per month' ? ' /mo' : u === 'per phase' ? ' /phase' : '';
}

/* ------------------------------ stations ------------------------------ */

const STATIONS = [
  { id: 'outcome', label: 'Outcome', icon: Target, hint: 'What the client walks away with.' },
  { id: 'deliverables', label: 'Deliverables', icon: PackageCheck, hint: 'Countable nouns you actually hand over.' },
  { id: 'timeline', label: 'Timeline', icon: Route, hint: 'The build schedule, phase by phase.' },
  { id: 'boundaries', label: 'Boundaries', icon: Fence, hint: 'The fence. What is not included — said out loud.' },
  { id: 'price', label: 'Price', icon: Tag, hint: 'One number. No "starting at," no surprises.' },
  { id: 'checklist', label: 'Checklist', icon: ClipboardCheck, hint: 'The work order every delivery runs through.' },
];
const STATION_IDS = STATIONS.map((s) => s.id);
const STATION_BY_ID = Object.fromEntries(STATIONS.map((s) => [s.id, s]));

/* --------------------------- scope-creep lint -------------------------- */

const VAGUE_TERMS = [
  { term: 'ongoing', severity: 'high', tip: 'Set an end date or a review cadence instead of leaving it open-ended.' },
  { term: 'as needed', severity: 'high', tip: 'Name the trigger and the cap — "up to 2 requests/month," not "as needed."' },
  { term: 'if needed', severity: 'high', tip: 'Say when it is needed, or drop it — "if needed" is a blank cheque.' },
  { term: 'unlimited', severity: 'high', tip: 'Unlimited anything is a promise you cannot staff. Put a number on it.' },
  { term: 'and more', severity: 'high', tip: 'List the "more," or cut it. This phrase is where scope leaks in.' },
  { term: 'etc', severity: 'high', tip: 'Finish the list. "Etc." means you have not decided the boundary yet.' },
  { term: 'tbd', severity: 'high', tip: 'Decide it before you price it — TBD scope becomes TBD hours, unpaid.' },
  { term: 'support', severity: 'med', tip: 'Define support: what channel, what response time, what it excludes.' },
  { term: 'help', severity: 'med', tip: 'Replace "help with" with the specific action you will take.' },
  { term: 'assist', severity: 'med', tip: 'Name the deliverable "assist" produces, or it will grow to mean anything.' },
  { term: 'manage', severity: 'med', tip: 'Managing what, how often, reported how? Spell it out.' },
  { term: 'oversee', severity: 'med', tip: 'Oversight without a cadence becomes an always-on obligation.' },
  { term: 'flexible', severity: 'med', tip: 'Flexible scope prices at zero. Pick the version you are actually selling.' },
  { term: 'best effort', severity: 'med', tip: 'A promise with no floor is a promise clients will test.' },
  { term: 'reasonable', severity: 'med', tip: '"Reasonable" is negotiated after the invoice, not before. Quantify it.' },
  { term: 'coordinate', severity: 'med', tip: 'Coordinating with whom, on what cadence? Or is this actually a deliverable?' },
  { term: 'general', severity: 'low', tip: 'Name the specific thing "general" is standing in for.' },
  { term: 'various', severity: 'low', tip: 'List the various things — the list is the deliverable.' },
  { term: 'some', severity: 'low', tip: 'A number reads as confidence. "Some" reads as a guess.' },
  { term: 'up to', severity: 'low', tip: 'Fine if a real ceiling follows it — check that it does.' },
  { term: 'custom', severity: 'low', tip: 'Custom work inside a fixed-scope offer needs its own line and price.' },
  { term: 'touch base', severity: 'low', tip: 'Name the cadence — "touch base" alone has no calendar entry.' },
  { term: 'check in', severity: 'low', tip: 'Fine as a scheduled call; risky as a standing promise.' },
  { term: 'occasionally', severity: 'low', tip: 'Occasionally is a frequency nobody can staff against. Pick a number.' },
];
const SEV_WEIGHT = { high: 4, med: 2, low: 1 };
const SEV_LABEL = { high: 'High', med: 'Med', low: 'Low' };
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function scanText(text, field, station, itemLabel) {
  const hits = [];
  const t = str(text);
  if (!t.trim()) return hits;
  VAGUE_TERMS.forEach((v) => {
    const re = new RegExp(`\\b${escapeRegex(v.term)}\\b`, 'gi');
    let m;
    while ((m = re.exec(t))) {
      const start = Math.max(0, m.index - 22);
      const end = Math.min(t.length, m.index + m[0].length + 22);
      const context = `${start > 0 ? '…' : ''}${t.slice(start, end).trim()}${end < t.length ? '…' : ''}`;
      hits.push({ id: uid(), term: v.term, severity: v.severity, tip: v.tip, field, station, itemLabel, context });
      if (hits.length > 400) return hits; // sanity guard
    }
  });
  return hits;
}

function lintOffer(offer) {
  let hits = [];
  hits = hits.concat(scanText(offer.outcome, 'Outcome', 'outcome'));
  offer.deliverables.forEach((d, i) => {
    hits = hits.concat(scanText(d.text, 'Deliverable', 'deliverables', `Deliverable ${i + 1}`));
  });
  offer.exclusions.forEach((e, i) => {
    hits = hits.concat(scanText(e.text, 'Boundary', 'boundaries', `Boundary ${i + 1}`));
  });
  return hits;
}

function riskFromHits(hits) {
  const total = hits.reduce((s, h) => s + SEV_WEIGHT[h.severity], 0);
  const score = clamp(100 - total * 5, 0, 100);
  const level = score >= 75 ? 'airtight' : score >= 45 ? 'tight' : 'leaky';
  const levelLabel = level === 'airtight' ? 'Airtight' : level === 'tight' ? 'Tight — review' : 'Leaky — rewrite';
  return { total, score, level, levelLabel };
}

/* ------------------------------ normalize ------------------------------ */

function normLine(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  return { id: str(o.id) || uid(), text: str(o.text) };
}
function normChecklistItem(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  return { id: str(o.id) || uid(), text: str(o.text), included: o.included !== false };
}
function normPhase(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  return { id: str(o.id) || uid(), name: str(o.name), detail: str(o.detail) };
}
function normalizeOffer(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  return {
    id: str(o.id) || uid(),
    name: str(o.name, 'Untitled offer'),
    status: ['draft', 'ready', 'shipped'].includes(o.status) ? o.status : 'draft',
    outcome: str(o.outcome),
    deliverables: arr(o.deliverables).map(normLine),
    exclusions: arr(o.exclusions).map(normLine),
    durationLabel: str(o.durationLabel),
    phases: arr(o.phases).map(normPhase),
    price: clamp(num(o.price, 0), 0, 99999999),
    currency: CURRENCIES.some(([k]) => k === o.currency) ? o.currency : 'USD',
    priceUnit: PRICE_UNITS.includes(o.priceUnit) ? o.priceUnit : 'one-time',
    billingNote: str(o.billingNote),
    checklist: arr(o.checklist).map(normChecklistItem),
  };
}
function normalizeBusiness(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  return { name: str(o.name), tagline: str(o.tagline), contact: str(o.contact) };
}
function normalize(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  return {
    v: 1,
    seenGuide: !!o.seenGuide,
    tab: ['line', 'workbench', 'onepager', 'copilot'].includes(o.tab) ? o.tab : 'line',
    station: STATION_IDS.includes(o.station) ? o.station : 'outcome',
    activeOfferId: str(o.activeOfferId),
    offers: arr(o.offers).map(normalizeOffer),
    business: normalizeBusiness(o.business),
    copilotNotes: str(o.copilotNotes),
    productizeInput: str(o.productizeInput),
  };
}

/* ------------------------------ readiness ------------------------------ */

function offerChecks(offer) {
  const risk = riskFromHits(lintOffer(offer));
  return [
    { ok: wordCount(offer.outcome) >= 6, label: 'Outcome states a concrete result', station: 'outcome' },
    { ok: offer.deliverables.filter((d) => d.text.trim()).length >= 3, label: 'At least 3 countable deliverables', station: 'deliverables' },
    { ok: !!offer.durationLabel.trim() && offer.phases.length >= 2, label: 'Timeline has a duration and phases', station: 'timeline' },
    { ok: offer.exclusions.filter((e) => e.text.trim()).length >= 2, label: 'At least 2 boundaries fenced off', station: 'boundaries' },
    { ok: offer.price > 0, label: 'Price is set — no "custom quote"', station: 'price' },
    { ok: offer.checklist.filter((c) => c.included).length >= 3, label: 'Delivery checklist has 3+ steps', station: 'checklist' },
    { ok: risk.score >= 70, label: 'Scope-creep risk is under control', station: 'boundaries' },
  ];
}
function readinessFor(offer) {
  const checks = offerChecks(offer);
  const passed = checks.filter((c) => c.ok).length;
  return { checks, passed, pct: Math.round((passed / checks.length) * 100) };
}

/* --------------------------- serialization ----------------------------- */

function offerMarkdown(offer, business) {
  const parts = [];
  parts.push(`# ${offer.name || 'Untitled offer'}`);
  parts.push(`*Fixed-scope offer${business.name ? ` — ${business.name}` : ''}*`);
  parts.push('');
  parts.push(`**The outcome.** ${offer.outcome || '—'}`);
  parts.push('');
  parts.push('## What’s included');
  const dels = offer.deliverables.filter((d) => d.text.trim());
  parts.push(...(dels.length ? dels.map((d) => `- ${d.text}`) : ['*(no deliverables listed yet)*']));
  parts.push('');
  parts.push('## Timeline');
  parts.push(offer.durationLabel || '*(no duration set)*');
  offer.phases.forEach((p, i) => parts.push(`${i + 1}. **${p.name || 'Untitled phase'}**${p.detail ? ` — ${p.detail}` : ''}`));
  parts.push('');
  parts.push('## What’s not included');
  const exs = offer.exclusions.filter((e) => e.text.trim());
  parts.push(...(exs.length ? exs.map((e) => `- ${e.text}`) : ['*(no boundaries fenced off yet — add at least two)*']));
  parts.push('');
  parts.push('## Investment');
  parts.push(`**${fmtMoney(offer.price, offer.currency)}${unitSuffix(offer.priceUnit)}**`);
  if (offer.billingNote) parts.push(offer.billingNote);
  const checked = offer.checklist.filter((c) => c.included);
  if (checked.length) {
    parts.push('');
    parts.push('## Delivery checklist');
    checked.forEach((c) => parts.push(`- [ ] ${c.text}`));
  }
  parts.push('');
  parts.push('---');
  parts.push(`*${business.name || 'Prepared'}${business.contact ? ` · ${business.contact}` : ''}*`);
  return parts.join('\n');
}

function rosterCsv(state) {
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [['Offer', 'Status', 'Price', 'Currency', 'Unit', 'Deliverables', 'Exclusions', 'Ship-ready %', 'Scope-safety score', 'Risk level'].map(esc).join(',')];
  state.offers.forEach((o) => {
    const ready = readinessFor(o);
    const risk = riskFromHits(lintOffer(o));
    rows.push([
      o.name, o.status, num(o.price), o.currency, o.priceUnit,
      o.deliverables.filter((d) => d.text.trim()).length,
      o.exclusions.filter((e) => e.text.trim()).length,
      ready.pct, risk.score, risk.levelLabel,
    ].map(esc).join(','));
  });
  return rows.join('\n');
}

/* --------------------------- copilot prompts ---------------------------- */

function consoleContextBlock(connectors) {
  if (!connectors) return '';
  const p = connectors.profile || {};
  const c = connectors.claude || {};
  const lines = [];
  if (str(p.company)) lines.push(`- My company: ${p.company}`);
  if (str(p.offer)) lines.push(`- What we sell: ${p.offer}`);
  if (str(p.icp)) lines.push(`- Our ideal customer: ${p.icp}`);
  if (str(p.pricingAnchor)) lines.push(`- Pricing anchor: ${p.pricingAnchor}`);
  if (str(c.voiceNotes)) lines.push(`- Voice notes: ${c.voiceNotes}`);
  return lines.length ? `## Operator context (from my BD console)\n${lines.join('\n')}\n\n` : '';
}
function businessContextBlock(business) {
  const lines = [];
  if (business.name) lines.push(`- Studio: ${business.name}`);
  if (business.tagline) lines.push(`- What we do: ${business.tagline}`);
  if (business.contact) lines.push(`- Contact: ${business.contact}`);
  return lines.length ? `## My studio\n${lines.join('\n')}\n\n` : '';
}
function offersFewShot(offers) {
  const good = offers.filter((o) => o.status !== 'draft' && o.outcome.trim());
  if (!good.length) return '(no finished offers yet — establish the voice from scratch, plain and concrete)';
  return good.map((o) => `- **${o.name}** — ${o.outcome} (${fmtMoney(o.price, o.currency)}${unitSuffix(o.priceUnit)})`).join('\n');
}

function promptProductize(state, messyText) {
  return `You are a productization consultant who has turned dozens of freelancers' and small agencies' open-ended "it depends" services into fixed-scope offers that sell themselves. You think in countable nouns, dated milestones, and fences — never in hours.

${businessContextBlock(state.business)}## Offers already on my line (for voice and price-point consistency)
${offersFewShot(state.offers)}

## The messy service, in my own words
${messyText.trim() || '(paste a rough, rambling description of a service you currently sell by the hour or "it depends" — the messier the better, this tool is built for that)'}

## Your task
Turn this into one fixed-scope offer, using exactly this structure so I can paste each piece straight into my offer builder:
1. **Offer name** — short, sellable, no jargon.
2. **Outcome** — one or two sentences, the concrete result the client walks away with. No hedging language.
3. **Deliverables** — 5–8 bullets, each a countable noun ("3 revised pages," not "revisions").
4. **Timeline** — a duration, then 2–4 named phases with what happens in each.
5. **Boundaries (what's excluded)** — 4–6 bullets. This is the fence that keeps the price honest.
6. **Price** — one number, the billing unit (one-time / per month / per phase), and one sentence of reasoning tied to the value, not your hours.
7. **Scope-creep flags** — reread my messy description and call out every phrase in it that sounds like it could quietly expand ("as needed," "help with," "ongoing," "whenever they want," etc.) so I know what NOT to carry into the offer.

## Output format
Use the numbered headings above, each with its content directly beneath. No preamble, no closing summary.`;
}

function promptTighten(offer, business) {
  const hits = lintOffer(offer);
  const hitLines = hits.length
    ? hits.map((h) => `- [${SEV_LABEL[h.severity]}] "${h.term}" in ${h.itemLabel || h.field} — "…${h.context}…"`).join('\n')
    : '(the built-in scope-creep lint found no flagged words — sanity-check the language anyway for anything it might have missed)';
  return `You are an editor obsessed with scope-creep prevention. You have watched "support," "help," and "as needed" quietly turn fixed-price engagements into unpaid retainers, and you rewrite around them on sight.

${businessContextBlock(business)}## The offer
**${offer.name || 'Untitled offer'}**
Outcome: ${offer.outcome || '(not written yet)'}

Deliverables:
${offer.deliverables.filter((d) => d.text.trim()).map((d) => `- ${d.text}`).join('\n') || '(none yet)'}

Boundaries (excluded):
${offer.exclusions.filter((e) => e.text.trim()).map((e) => `- ${e.text}`).join('\n') || '(none yet)'}

## What my own scope-creep lint already flagged
${hitLines}

## Your task
1. Rewrite the outcome, every flagged deliverable, and every flagged boundary into countable, specific language — no vague verbs, no open-ended phrases. Keep the ones that already read as fixed-scope unchanged.
2. For each rewrite, show the before and after in one line so I can see exactly what changed.
3. If the offer feels thin (fewer than 5 deliverables or fewer than 3 boundaries), propose 2–3 more of each that a reasonable client would expect this offer to either include or explicitly exclude.

## Output format
- **Rewrites** — table: | Before | After |
- **New deliverables to consider** — bullets (or "none needed")
- **New boundaries to consider** — bullets (or "none needed")`;
}

function promptSalesPage(offer, business) {
  return `You are a senior conversion copywriter who specializes in one-offer landing pages for productized services — the kind that sell a single fixed-scope package with no pricing calls and no "let's chat first."

${businessContextBlock(business)}## The offer to sell
**${offer.name || 'Untitled offer'}** — ${fmtMoney(offer.price, offer.currency)}${unitSuffix(offer.priceUnit)}
Outcome: ${offer.outcome || '(not written yet)'}

What's included:
${offer.deliverables.filter((d) => d.text.trim()).map((d) => `- ${d.text}`).join('\n') || '(none yet)'}

Timeline: ${offer.durationLabel || '(not set)'}
${offer.phases.map((p, i) => `${i + 1}. ${p.name}${p.detail ? ` — ${p.detail}` : ''}`).join('\n')}

What's not included:
${offer.exclusions.filter((e) => e.text.trim()).map((e) => `- ${e.text}`).join('\n') || '(none yet)'}

Billing: ${offer.billingNote || '(no billing note set)'}

## Your task
Write the complete sales page, in this order:
1. **Headline** — leads with the outcome, not the process.
2. **Subhead** — one sentence naming who this is for.
3. **Who it's for / who it's not for** — 3 bullets each. The "not for" list should make the right buyer trust you more.
4. **What you get** — the deliverables, rewritten as benefits, not just relisted.
5. **What's not included** — reframe the boundaries as a feature ("so the price never moves"), not an apology.
6. **How it works** — the timeline as a simple numbered flow.
7. **Investment** — the price, the billing terms, and one sentence defending it on value.
8. **FAQ** — 4 objections this specific offer will draw, answered in one to two sentences each.
9. **Call to action** — one clear next step, low-friction.

## Output format
Markdown, ready to paste into a page builder. Section headers as H2. No commentary before or after.`;
}

function promptRedTeam(offer, business) {
  return `You are the most skeptical prospect this offer will ever meet: budget-conscious, allergic to vague language, and reading the one-pager for exactly ninety seconds before deciding whether to book a call or bounce.

${businessContextBlock(business)}## The offer, as written
${offerMarkdown(offer, business)}

## Your task
Read it exactly as that ninety-second prospect would.
1. **Verdict** — book a call / hesitate / bounce — one sentence of reasoning.
2. **Where it still feels squishy** — quote the specific line(s) that make you doubt the price is really fixed, if any.
3. **The one question you'd ask before paying** — the single clarifying question this page fails to answer.
4. **A sharper one-line pitch** — rewrite the outcome statement to be more concrete and more provable.
5. **Price gut-check** — does the price feel cheap, fair, or expensive for what's listed? One sentence why.

## Output format
Numbered exactly as above. Be blunt — I would rather hear this from you than from a prospect who just ghosts.`;
}

/* ============================ visual pieces ============================ */

function HazardDefs() {
  return (
    <defs>
      <pattern id="hazardStripe" width="9" height="9" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
        <rect width="9" height="9" fill="var(--color-safety)" />
        <rect width="4.5" height="9" fill="var(--color-steel-900)" />
      </pattern>
    </defs>
  );
}

function FactoryMark({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden focusable="false">
      <HazardDefs />
      <rect x="3" y="3" width="58" height="58" rx="6" fill="var(--color-steel-900)" />
      <rect x="3" y="3" width="58" height="58" rx="6" fill="none" stroke="var(--color-safety)" strokeWidth="2" />
      <circle cx="10.5" cy="10.5" r="2.2" fill="var(--color-steel-400)" />
      <circle cx="53.5" cy="10.5" r="2.2" fill="var(--color-steel-400)" />
      <circle cx="10.5" cy="53.5" r="2.2" fill="var(--color-steel-400)" />
      <circle cx="53.5" cy="53.5" r="2.2" fill="var(--color-steel-400)" />
      <text x="32" y="39" textAnchor="middle" fontFamily="Public Sans, sans-serif" fontWeight="800" fontSize="23"
        fill="var(--color-safety)" style={{ letterSpacing: '-0.02em' }}>SP</text>
      <rect x="3" y="47" width="58" height="6" fill="url(#hazardStripe)" />
    </svg>
  );
}

/* signature hero graphic — the offer moving down the line */
function ConveyorHero({ className }) {
  const rollerXs = Array.from({ length: 9 }, (_, i) => 18 + i * 76);
  const boxes = [
    { x: 30, label: 'OUTCOME' },
    { x: 198, label: 'SCOPE' },
    { x: 366, label: 'PRICE' },
    { x: 534, label: 'SHIP' },
  ];
  return (
    <svg viewBox="0 0 640 128" className={className} role="img"
      aria-label="A conveyor belt carrying an offer through outcome, scope, price, and ship stations">
      <HazardDefs />
      <rect x="0" y="0" width="640" height="9" fill="url(#hazardStripe)" />
      <rect x="0" y="33" width="640" height="62" rx="7" fill="var(--color-steel-800)" />
      <rect x="0.75" y="33.75" width="638.5" height="60.5" rx="6.25" fill="none" stroke="var(--color-steel-900)" strokeWidth="1.5" />
      <line x1="6" y1="64" x2="634" y2="64" stroke="var(--color-steel-600)" strokeWidth="2" strokeDasharray="16 10" className="anim-belt" />
      {rollerXs.map((x, i) => (
        <g key={i}>
          <circle cx={x} cy="33" r="5" fill="var(--color-steel-600)" stroke="var(--color-steel-900)" strokeWidth="1" />
          <circle cx={x} cy="95" r="5" fill="var(--color-steel-600)" stroke="var(--color-steel-900)" strokeWidth="1" />
        </g>
      ))}
      {boxes.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y="43" width="88" height="40" rx="3" fill="var(--color-panel)" stroke="var(--color-steel-900)" strokeWidth="1.5" />
          <rect x={b.x} y="43" width="88" height="9" fill="var(--color-safety)" />
          <text x={b.x + 44} y="70" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontWeight="600" fontSize="11.5"
            fill="var(--color-steel-900)">{b.label}</text>
          {i < boxes.length - 1 && (
            <path d={`M ${b.x + 92} 63 L ${b.x + 106} 63`} stroke="var(--color-steel-900)" strokeWidth="1.6" markerEnd="url(#heroArrow)" />
          )}
        </g>
      ))}
      <defs>
        <marker id="heroArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--color-steel-900)" />
        </marker>
      </defs>
      <rect x="0" y="119" width="640" height="9" fill="url(#hazardStripe)" />
    </svg>
  );
}

/* semicircle gauge geometry, shared by ShipGauge + RiskGauge */
function polarPoint(p, r, cx = 100, cy = 96) {
  const a = Math.PI * (1 - clamp(p, 0, 100) / 100);
  return [cx + Math.cos(a) * r, cy - Math.sin(a) * r];
}
function bandArc(p0, p1, r) {
  const [x0, y0] = polarPoint(p0, r);
  const [x1, y1] = polarPoint(p1, r);
  return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
}
function gaugeTicks() {
  return Array.from({ length: 11 }, (_, i) => {
    const p = i * 10;
    const major = i % 5 === 0;
    const [x1, y1] = polarPoint(p, major ? 70 : 74);
    const [x2, y2] = polarPoint(p, 80);
    return { x1, y1, x2, y2, major };
  });
}

function ShipGauge({ pct }) {
  const P = clamp(num(pct, 0), 0, 100);
  const [nx, ny] = polarPoint(P, 56);
  const ticks = gaugeTicks();
  return (
    <svg viewBox="0 0 200 112" className="w-full" role="img" aria-label={`Ship-ready gauge at ${P} percent`}>
      <path d="M 20 96 A 80 80 0 0 1 180 96" fill="none" stroke="var(--color-floor-deep)" strokeWidth="9" strokeLinecap="round" />
      <path d={bandArc(0, P, 80)} fill="none" stroke="var(--color-safety)" strokeWidth="9" strokeLinecap="round" />
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={t.major ? 'var(--color-steel-800)' : 'var(--color-steel-400)'} strokeWidth={t.major ? 1.6 : 0.9} />
      ))}
      <circle cx={20} cy={96} r="2.6" fill="var(--color-steel-800)" />
      <circle cx={180} cy={96} r="2.6" fill="var(--color-safety-deep)" />
      <line x1="100" y1="96" x2={nx} y2={ny} stroke="var(--color-steel-900)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="100" cy="96" r="5.5" fill="var(--color-steel-900)" />
      <circle cx="100" cy="96" r="2.2" fill="var(--color-safety)" />
      <text x="100" y="72" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontWeight="600" fontSize="24" fill="var(--color-ink)">{P}%</text>
    </svg>
  );
}

function RiskGauge({ score }) {
  const P = clamp(num(score, 0), 0, 100);
  const [nx, ny] = polarPoint(P, 56);
  const ticks = gaugeTicks();
  return (
    <svg viewBox="0 0 200 112" className="w-full" role="img" aria-label={`Scope-creep safety score at ${P} percent`}>
      <path d={bandArc(0, 45, 80)} fill="none" stroke="var(--color-hazard)" strokeWidth="9" strokeLinecap="round" />
      <path d={bandArc(45, 75, 80)} fill="none" stroke="var(--color-caution)" strokeWidth="9" />
      <path d={bandArc(75, 100, 80)} fill="none" stroke="var(--color-go)" strokeWidth="9" strokeLinecap="round" />
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={t.major ? 'var(--color-steel-800)' : 'var(--color-panel)'} strokeWidth={t.major ? 1.6 : 0.9} />
      ))}
      <circle cx={20} cy={96} r="2.6" fill="var(--color-hazard-deep)" />
      <circle cx={180} cy={96} r="2.6" fill="var(--color-go-deep)" />
      <line x1="100" y1="96" x2={nx} y2={ny} stroke="var(--color-steel-900)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="100" cy="96" r="5.5" fill="var(--color-steel-900)" />
      <circle cx="100" cy="96" r="2.2" fill="var(--color-panel)" />
      <text x="100" y="72" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontWeight="600" fontSize="24" fill="var(--color-ink)">{P}</text>
    </svg>
  );
}

/* the conveyor station stepper — the offer builder's primary navigation */
function StationRail({ active, onSelect, doneMap }) {
  return (
    <div role="tablist" aria-label="Offer build stations" className="relative">
      <div className="hazard-rule h-1.5 rounded-t-md" />
      <div className="flex items-stretch gap-1 overflow-x-auto border-x border-b border-steel-900 bg-steel-800 px-1.5 py-1.5">
        {STATIONS.map((s) => {
          const Icon = s.icon;
          const activeS = active === s.id;
          return (
            <button key={s.id} type="button" role="tab" aria-selected={activeS} onClick={() => onSelect(s.id)}
              title={s.hint}
              className={`group relative flex flex-1 min-w-[84px] flex-col items-center gap-1 rounded px-2 py-2 text-center transition-colors ${
                activeS ? 'bg-safety text-steel-900' : 'text-steel-200 hover:bg-steel-700'
              }`}>
              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                activeS ? 'border-steel-900 bg-panel' : 'border-steel-500 bg-steel-900'
              }`}>
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.08em]">{s.label}</span>
              {doneMap[s.id] && (
                <CircleCheck className={`absolute right-1 top-1 h-3 w-3 ${activeS ? 'text-go-deep' : 'text-go'}`} aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== UI atoms =============================== */

function IconBtn({ label, onClick, children, className = '', title }) {
  return (
    <button type="button" aria-label={label} title={title || label} onClick={onClick}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line-strong bg-panel text-ink-soft transition-colors hover:border-safety-deep hover:text-safety-ink ${className}`}>
      {children}
    </button>
  );
}

function Btn({ onClick, children, tone = 'ghost', className = '', ...rest }) {
  const tones = {
    ghost: 'border-line-strong bg-panel text-ink hover:border-safety-deep hover:bg-panel-deep',
    ink: 'border-steel-900 bg-steel-900 text-panel hover:bg-steel-800',
    safety: 'border-safety-deep bg-safety text-safety-ink hover:bg-safety-bright',
    hazard: 'border-hazard-deep bg-panel text-hazard-deep hover:bg-hazard-soft',
  };
  return (
    <button type="button" onClick={onClick} {...rest}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] font-semibold tracking-wide transition-colors ${tones[tone]} ${className}`}>
      {children}
    </button>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block font-display text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-ink-faint">{hint}</span>}
    </label>
  );
}

const inputCls = 'w-full rounded-md border border-line-strong bg-panel px-3 py-2 text-[14px] leading-snug shadow-[inset_0_1px_2px_rgb(24_20_8/0.08)] outline-none focus:border-safety-deep';

function Modal({ open, onClose, label, children, wide }) {
  if (!open) return null;
  return (
    <div className="anim-toast fixed inset-0 z-[70] overflow-y-auto bg-steel-900/55 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={label}
        className={`anim-rise relative mx-auto my-6 w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-lg border border-steel-900 bg-panel p-6 shadow-panel`}>
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 block h-1.5 rounded-t-lg hazard-rule" />
        <button type="button" aria-label="Close dialog" onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-faint hover:bg-panel-deep hover:text-ink">
          <X className="h-4 w-4" aria-hidden />
        </button>
        {children}
      </div>
    </div>
  );
}

const STATUS_META = {
  draft: { label: 'DRAFT', cls: 'border-steel-500 text-steel-600' },
  ready: { label: 'READY', cls: 'border-go-deep text-go-deep' },
  shipped: { label: 'SHIPPED', cls: 'border-safety-deep text-safety-ink bg-safety/30' },
};
function StatusStamp({ status, className = '' }) {
  const m = STATUS_META[status] || STATUS_META.draft;
  return (
    <span className={`inline-block -rotate-2 rounded border-2 px-2 py-0.5 font-display text-[10px] font-black uppercase tracking-[0.14em] ${m.cls} ${className}`}>
      {m.label}
    </span>
  );
}

function SeverityChip({ severity }) {
  const map = {
    high: 'border-hazard-deep bg-hazard-soft text-hazard-deep',
    med: 'border-caution bg-caution-soft text-caution',
    low: 'border-steel-400 bg-floor-deep text-steel-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] ${map[severity]}`}>
      {SEV_LABEL[severity]}
    </span>
  );
}

/* reusable add/edit/remove list, used for deliverables, boundaries & checklist */
function EditableList({ items, onAdd, onUpdate, onRemove, onMove, placeholder, addLabel, toggleable }) {
  const [draft, setDraft] = useState('');
  const submit = () => {
    const v = draft.trim();
    if (!v) return;
    onAdd(v);
    setDraft('');
  };
  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="rounded-md border border-dashed border-line-strong bg-panel-deep px-3 py-3 text-[12.5px] text-ink-faint">
          Nothing here yet — add the first line below.
        </p>
      )}
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={it.id} className="flex items-start gap-1.5">
            {toggleable && (
              <button type="button" aria-label={it.included ? 'Remove from delivery checklist output' : 'Include in delivery checklist output'}
                onClick={() => onUpdate(it.id, { included: !it.included })}
                className={`mt-1.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${
                  it.included ? 'border-go-deep bg-go text-panel' : 'border-line-strong bg-panel'
                }`}>
                {it.included && <Check className="h-3 w-3" aria-hidden />}
              </button>
            )}
            <span className="mt-2 font-mono text-[11px] font-bold text-ink-faint">{String(i + 1).padStart(2, '0')}</span>
            <textarea value={it.text} onChange={(e) => onUpdate(it.id, { text: e.target.value })} rows={1}
              aria-label={`Line ${i + 1}`}
              className={`${inputCls} min-h-[38px] flex-1 resize-y py-1.5`} />
            <div className="mt-0.5 flex shrink-0 flex-col gap-0.5">
              <IconBtn label="Move up" onClick={() => onMove(i, -1)} className="h-6 w-6"><ArrowUp className="h-3 w-3" aria-hidden /></IconBtn>
              <IconBtn label="Move down" onClick={() => onMove(i, 1)} className="h-6 w-6"><ArrowDown className="h-3 w-3" aria-hidden /></IconBtn>
            </div>
            <IconBtn label="Remove line" onClick={() => onRemove(it.id)} className="mt-0.5 hover:border-hazard-deep hover:text-hazard-deep">
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </IconBtn>
          </li>
        ))}
      </ul>
      <div className="flex items-start gap-2 border-t border-dashed border-line pt-2.5">
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={1} placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          aria-label={addLabel} className={`${inputCls} min-h-[38px] flex-1 resize-y py-1.5`} />
        <Btn tone="safety" onClick={submit}><Plus className="h-3.5 w-3.5" aria-hidden /> Add</Btn>
      </div>
    </div>
  );
}

/* ================================ app =================================== */

export default function App() {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return normalize(raw ? JSON.parse(raw) : null);
    } catch {
      return normalize(null);
    }
  });
  const [guideOpen, setGuideOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const fileRef = useRef(null);
  const dragFrom = useRef(null);
  const [dragOver, setDragOver] = useState(null);
  const [connectors, setConnectors] = useState(null);

  /* console bus (PROTOCOL.md) — standalone-safe */
  useEffect(() => {
    if (window.parent === window) return;
    const onMsg = (e) => {
      const d = e && e.data;
      if (d && d.bizdev === 'context' && d.v === 1 && d.connectors && typeof d.connectors === 'object') {
        setConnectors(d.connectors);
      }
    };
    window.addEventListener('message', onMsg);
    try { window.parent.postMessage({ bizdev: 'ready', v: 1, slug: SLUG }, '*'); } catch { /* framed cross-origin edge */ }
    return () => window.removeEventListener('message', onMsg);
  }, []);

  useEffect(() => {
    if (!state.seenGuide) setGuideOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
    }, 350);
    return () => clearTimeout(t);
  }, [state]);

  const patch = (p) => setState((s) => ({ ...s, ...p }));
  const setTab = (tab) => patch({ tab });
  const patchBusiness = (p) => setState((s) => ({ ...s, business: { ...s.business, ...p } }));

  const showToast = (text, onUndo) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    const id = uid();
    setToast({ id, text, onUndo });
    toastTimer.current = setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), onUndo ? 7000 : 2600);
  };

  const closeGuide = () => { setGuideOpen(false); if (!state.seenGuide) patch({ seenGuide: true }); };

  const copyText = async (text, doneMsg) => {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch { ok = false; }
    if (!ok) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        ta.remove();
      } catch { ok = false; }
    }
    showToast(ok ? doneMsg : 'Copy failed — select and copy manually');
  };

  const activeOffer = useMemo(
    () => state.offers.find((o) => o.id === state.activeOfferId) || state.offers[0] || null,
    [state.offers, state.activeOfferId],
  );
  const md = useMemo(() => (activeOffer ? offerMarkdown(activeOffer, state.business) : ''), [activeOffer, state.business]);

  /* keyboard: ? help · Esc close · Ctrl/Cmd+S copy markdown */
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const editing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (e.key === 'Escape') {
        setExportOpen(false);
        setConfirmReset(false);
        setConfirmDemo(false);
        setGuideOpen((g) => { if (g && !state.seenGuide) patch({ seenGuide: true }); return false; });
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (md) copyText(md, 'Offer spec copied as Markdown');
        return;
      }
      if (e.key === '?' && !editing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setGuideOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, md]);

  /* -------- offer ops -------- */
  const updateOffer = (id, p) =>
    setState((s) => ({ ...s, offers: s.offers.map((o) => (o.id === id ? { ...o, ...p } : o)) }));

  const addOffer = () => {
    const o = normalizeOffer({ name: 'New offer' });
    setState((s) => ({ ...s, offers: [...s.offers, o], activeOfferId: o.id, tab: 'workbench', station: 'outcome' }));
    showToast('New offer set on the line');
  };
  const duplicateOffer = (id) => {
    const src = state.offers.find((o) => o.id === id);
    if (!src) return;
    const copy = normalizeOffer({ ...src, id: undefined, name: `${src.name} (copy)`, status: 'draft' });
    copy.deliverables = copy.deliverables.map((d) => ({ ...d, id: uid() }));
    copy.exclusions = copy.exclusions.map((d) => ({ ...d, id: uid() }));
    copy.phases = copy.phases.map((d) => ({ ...d, id: uid() }));
    copy.checklist = copy.checklist.map((d) => ({ ...d, id: uid() }));
    setState((s) => {
      const idx = s.offers.findIndex((o) => o.id === id);
      const offers = [...s.offers];
      offers.splice(idx + 1, 0, copy);
      return { ...s, offers };
    });
    showToast(`Duplicated "${src.name}"`);
  };
  const removeOffer = (id) => {
    setState((s) => {
      const idx = s.offers.findIndex((o) => o.id === id);
      if (idx < 0) return s;
      const removed = s.offers[idx];
      const offers = s.offers.filter((o) => o.id !== id);
      showToast(`Removed "${removed.name}"`, () =>
        setState((s2) => {
          const arr2 = [...s2.offers];
          arr2.splice(Math.min(idx, arr2.length), 0, removed);
          return { ...s2, offers: arr2 };
        }));
      return { ...s, offers, activeOfferId: s.activeOfferId === id ? '' : s.activeOfferId };
    });
  };
  const moveOffer = (idx, dir) =>
    setState((s) => {
      const j = idx + dir;
      if (j < 0 || j >= s.offers.length) return s;
      const offers = [...s.offers];
      const [x] = offers.splice(idx, 1);
      offers.splice(j, 0, x);
      return { ...s, offers };
    });
  const dropOffer = (to) => {
    const from = dragFrom.current;
    dragFrom.current = null;
    setDragOver(null);
    if (from === null || from === undefined || from === to) return;
    setState((s) => {
      const offers = [...s.offers];
      const [x] = offers.splice(from, 1);
      offers.splice(to > from ? to - 1 : to, 0, x);
      return { ...s, offers };
    });
  };
  const openOffer = (id) => setState((s) => ({ ...s, activeOfferId: id, tab: 'workbench', station: 'outcome' }));

  /* -------- list helpers scoped to the active offer -------- */
  const listOp = (listKey) => ({
    add: (text) => {
      if (!activeOffer) return;
      const item = listKey === 'checklist' ? normChecklistItem({ text }) : normLine({ text });
      updateOffer(activeOffer.id, { [listKey]: [...activeOffer[listKey], item] });
    },
    update: (id, p) => {
      if (!activeOffer) return;
      updateOffer(activeOffer.id, { [listKey]: activeOffer[listKey].map((it) => (it.id === id ? { ...it, ...p } : it)) });
    },
    remove: (id) => {
      if (!activeOffer) return;
      const idx = activeOffer[listKey].findIndex((it) => it.id === id);
      if (idx < 0) return;
      const removed = activeOffer[listKey][idx];
      const offerId = activeOffer.id;
      updateOffer(offerId, { [listKey]: activeOffer[listKey].filter((it) => it.id !== id) });
      showToast('Line removed', () =>
        setState((s2) => ({
          ...s2,
          offers: s2.offers.map((o) => {
            if (o.id !== offerId) return o;
            const arr2 = [...o[listKey]];
            arr2.splice(Math.min(idx, arr2.length), 0, removed);
            return { ...o, [listKey]: arr2 };
          }),
        })));
    },
    move: (idx, dir) => {
      if (!activeOffer) return;
      const j = idx + dir;
      const list = activeOffer[listKey];
      if (j < 0 || j >= list.length) return;
      const copy = [...list];
      const [x] = copy.splice(idx, 1);
      copy.splice(j, 0, x);
      updateOffer(activeOffer.id, { [listKey]: copy });
    },
  });
  const deliverableOps = listOp('deliverables');
  const exclusionOps = listOp('exclusions');
  const checklistOps = listOp('checklist');

  const generateChecklist = () => {
    if (!activeOffer) return;
    const existing = new Set(activeOffer.checklist.map((c) => c.text.trim().toLowerCase()));
    const fresh = activeOffer.deliverables
      .filter((d) => d.text.trim() && !existing.has(`deliver: ${d.text.trim().toLowerCase()}`))
      .map((d) => normChecklistItem({ text: `Deliver: ${d.text.trim()}` }));
    if (!fresh.length) { showToast('Checklist already covers every deliverable'); return; }
    updateOffer(activeOffer.id, { checklist: [...activeOffer.checklist, ...fresh] });
    showToast(`Added ${fresh.length} step${fresh.length === 1 ? '' : 's'} from your deliverables`);
  };

  const addPhase = () => {
    if (!activeOffer) return;
    updateOffer(activeOffer.id, { phases: [...activeOffer.phases, normPhase({ name: `Phase ${activeOffer.phases.length + 1}` })] });
  };
  const updatePhase = (id, p) => {
    if (!activeOffer) return;
    updateOffer(activeOffer.id, { phases: activeOffer.phases.map((ph) => (ph.id === id ? { ...ph, ...p } : ph)) });
  };
  const removePhase = (id) => {
    if (!activeOffer) return;
    updateOffer(activeOffer.id, { phases: activeOffer.phases.filter((ph) => ph.id !== id) });
  };

  /* -------- exports -------- */
  const downloadFile = (name, mime, content) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 400);
  };
  const fileSlug = (n) => (n || 'offer').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'offer';
  const onImportFile = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(String(r.result));
        setState(normalize({ ...parsed, seenGuide: true }));
        showToast('Line imported from JSON');
      } catch {
        showToast('That file is not a valid Service Productizer JSON');
      }
    };
    r.readAsText(f);
  };

  const loadDemo = () => {
    setState(demoState());
    setConfirmDemo(false);
    showToast('Demo line loaded — Kiln & Vance Studio');
  };
  const hasContent = state.offers.length > 0 || !!state.business.name;
  const doReset = () => {
    try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
    setState(normalize({ seenGuide: true }));
    setConfirmReset(false);
    showToast('Line cleared — floor is empty');
  };

  const readiness = useMemo(() => (activeOffer ? readinessFor(activeOffer) : null), [activeOffer]);
  const lintHits = useMemo(() => (activeOffer ? lintOffer(activeOffer) : []), [activeOffer]);
  const risk = useMemo(() => riskFromHits(lintHits), [lintHits]);
  const doneMap = useMemo(() => {
    if (!readiness) return {};
    const m = {};
    readiness.checks.forEach((c) => { m[c.station] = (m[c.station] ?? true) && c.ok; });
    return m;
  }, [readiness]);

  const TabBtn = ({ id, label, count, icon: Icon }) => (
    <button type="button" onClick={() => setTab(id)}
      className={`relative -mb-px inline-flex items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 font-display text-[13px] font-semibold tracking-wide transition-colors sm:px-4 ${
        state.tab === id ? 'border-safety-deep text-ink' : 'border-transparent text-ink-faint hover:text-ink-soft'
      }`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
      {count !== undefined && count > 0 && (
        <span className={`rounded-full px-1.5 text-[10px] font-bold ${state.tab === id ? 'bg-safety text-safety-ink' : 'bg-floor-deep text-ink-faint'}`}>{count}</span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen font-body text-ink">
      <div className="ambient-floor pointer-events-none fixed inset-0 -z-10" aria-hidden />
      {/* ======================= app chrome ======================= */}
      <div className="print:hidden">
        <header className="border-b border-line-strong bg-panel/85 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <FactoryMark className="h-12 w-12 shrink-0 drop-shadow-sm" />
              <div>
                <h1 className="font-display text-[26px] font-black uppercase leading-none tracking-tight">
                  Service <span className="stencil-cut">Productizer</span>
                </h1>
                <p className="mt-1 text-[12.5px] text-ink-soft">
                  Turn one more “it depends” quote into a fixed-scope offer you can sell on repeat.
                </p>
              </div>
            </div>
            <div className="ms-auto flex flex-wrap items-center gap-2">
              {connectors && (
                <span className="inline-flex items-center gap-1 rounded-full border border-safety-deep bg-safety/25 px-2.5 py-1 text-[11px] font-semibold text-safety-ink">
                  <Link2 className="h-3 w-3" aria-hidden /> Console linked
                </span>
              )}
              <Btn onClick={() => (hasContent ? setConfirmDemo(true) : loadDemo())}><Sparkles className="h-3.5 w-3.5" aria-hidden /> Load demo</Btn>
              <Btn tone="hazard" onClick={() => setConfirmReset(true)}><RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset</Btn>
              <Btn onClick={() => setGuideOpen(true)}><HelpCircle className="h-3.5 w-3.5" aria-hidden /> How to use</Btn>
              <div className="relative">
                <Btn tone="ink" onClick={() => setExportOpen((v) => !v)} aria-expanded={exportOpen} aria-haspopup="menu">
                  <Download className="h-3.5 w-3.5" aria-hidden /> Export <ChevronDown className="h-3 w-3" aria-hidden />
                </Btn>
                {exportOpen && (
                  <div role="menu" aria-label="Export options"
                    className="anim-rise absolute right-0 z-40 mt-2 w-72 rounded-lg border border-steel-900 bg-panel p-1.5 shadow-panel">
                    {[
                      { icon: FileText, label: 'Copy offer as Markdown', sub: 'Ctrl/Cmd+S', fn: () => md && copyText(md, 'Offer spec copied as Markdown'), disabled: !activeOffer },
                      { icon: FileJson, label: 'Download JSON (full line)', sub: 'backup / move machines', fn: () => downloadFile('service-productizer.json', 'application/json', JSON.stringify(state, null, 2)) },
                      { icon: FileSpreadsheet, label: 'Download roster CSV', sub: 'every offer, one row each', fn: () => downloadFile('offer-line.csv', 'text/csv', rosterCsv(state)), disabled: state.offers.length === 0 },
                      { icon: Upload, label: 'Import JSON…', sub: 'restores a saved line', fn: () => fileRef.current && fileRef.current.click() },
                      { icon: Printer, label: 'Print / Save as PDF', sub: 'prints the active offer’s spec sheet', fn: () => window.print(), disabled: !activeOffer },
                    ].map((it, i) => (
                      <button key={i} type="button" role="menuitem" disabled={it.disabled}
                        onClick={() => { setExportOpen(false); it.fn(); }}
                        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-panel-deep disabled:pointer-events-none disabled:opacity-40">
                        <it.icon className="h-4 w-4 shrink-0 text-safety-deep" aria-hidden />
                        <span className="flex-1 font-semibold">{it.label}</span>
                        <span className="text-[10.5px] text-ink-faint">{it.sub}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} aria-label="Import line JSON file" />
            </div>
          </div>
          <div className="mx-auto max-w-6xl px-4 pb-3 sm:px-6">
            <ConveyorHero className="h-16 w-full sm:h-[76px]" />
          </div>
          <nav aria-label="Studio areas" className="mx-auto flex max-w-6xl items-end gap-0.5 overflow-x-auto px-4 sm:px-6">
            <TabBtn id="line" label="The Line" count={state.offers.length} icon={Factory} />
            <TabBtn id="workbench" label="Workbench" icon={Wrench} />
            <TabBtn id="onepager" label="Spec Sheet" icon={FileText} />
            <TabBtn id="copilot" label="Claude Copilot" icon={Sparkles} />
          </nav>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          {state.tab === 'line' && (
            <LineTab
              offers={state.offers}
              openOffer={openOffer} addOffer={addOffer} duplicateOffer={duplicateOffer}
              removeOffer={removeOffer} moveOffer={moveOffer}
              dragFrom={dragFrom} dragOver={dragOver} setDragOver={setDragOver} dropOffer={dropOffer}
              business={state.business} patchBusiness={patchBusiness}
              loadDemo={() => (hasContent ? setConfirmDemo(true) : loadDemo())}
            />
          )}
          {state.tab === 'workbench' && (
            activeOffer ? (
              <WorkbenchTab
                offer={activeOffer} updateOffer={updateOffer}
                station={state.station} setStation={(station) => patch({ station })}
                deliverableOps={deliverableOps} exclusionOps={exclusionOps} checklistOps={checklistOps}
                generateChecklist={generateChecklist}
                addPhase={addPhase} updatePhase={updatePhase} removePhase={removePhase}
                readiness={readiness} risk={risk} lintHits={lintHits} doneMap={doneMap}
                setTab={setTab}
              />
            ) : (
              <EmptyLine onAdd={addOffer} onDemo={() => (hasContent ? setConfirmDemo(true) : loadDemo())} />
            )
          )}
          {state.tab === 'onepager' && (
            activeOffer
              ? <OnePagerTab offer={activeOffer} business={state.business} onPrint={() => window.print()} onCopy={() => copyText(md, 'Offer spec copied as Markdown')} setTab={setTab} />
              : <EmptyLine onAdd={addOffer} onDemo={() => (hasContent ? setConfirmDemo(true) : loadDemo())} />
          )}
          {state.tab === 'copilot' && (
            <CopilotTab state={state} activeOffer={activeOffer} connectors={connectors}
              copyText={copyText} patch={patch} />
          )}
        </main>

        <footer className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
          <div className="hazard-rule h-1 rounded-full" />
          <p className="mt-2 text-center text-[11px] text-ink-faint">
            Set in Public Sans & IBM Plex Mono · Your line lives in this browser only — export JSON to keep a copy off the floor.
          </p>
        </footer>
      </div>

      {/* ======================= print document ======================= */}
      <div className="hidden print:block">
        {activeOffer && <SpecSheetPrint offer={activeOffer} business={state.business} />}
      </div>

      {/* ======================= modals & toast ======================= */}
      <GuideModal open={guideOpen} onClose={closeGuide} />
      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} label="Confirm reset">
        <h2 className="font-display text-xl font-black">Clear the whole line?</h2>
        <p className="mt-2 text-[14px] text-ink-soft">
          This removes every offer and your studio profile, and cannot be undone.
          Consider <strong>Export → Download JSON</strong> first.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Btn onClick={() => setConfirmReset(false)}>Keep working</Btn>
          <Btn tone="hazard" onClick={doReset}><Trash2 className="h-3.5 w-3.5" aria-hidden /> Clear the floor</Btn>
        </div>
      </Modal>
      <Modal open={confirmDemo} onClose={() => setConfirmDemo(false)} label="Confirm demo load">
        <h2 className="font-display text-xl font-black">Load the demo line?</h2>
        <p className="mt-2 text-[14px] text-ink-soft">
          The Kiln & Vance Studio demo will replace what is currently on your line. Export JSON first if you want to keep it.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Btn onClick={() => setConfirmDemo(false)}>Cancel</Btn>
          <Btn tone="safety" onClick={loadDemo}><Sparkles className="h-3.5 w-3.5" aria-hidden /> Load demo</Btn>
        </div>
      </Modal>

      {toast && (
        <div className="anim-toast fixed bottom-5 left-1/2 z-[80] -translate-x-1/2" role="status" aria-live="polite">
          <div className="flex items-center gap-3 rounded-lg border border-steel-900 bg-steel-900 px-4 py-2.5 text-[13px] font-semibold text-panel shadow-panel">
            <Stamp className="h-4 w-4 text-safety" aria-hidden />
            {toast.text}
            {toast.onUndo && (
              <button type="button"
                onClick={() => { toast.onUndo(); setToast(null); }}
                className="rounded border border-safety px-2 py-0.5 text-[12px] font-bold text-safety hover:bg-safety/20">
                Undo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================== line tab ================================ */

function EmptyLine({ onAdd, onDemo }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-line-strong bg-panel-deep px-6 py-14 text-center">
      <Factory className="mx-auto h-10 w-10 text-steel-400" aria-hidden />
      <h2 className="mt-3 font-display text-lg font-black">The line is empty</h2>
      <p className="mx-auto mt-1.5 max-w-md text-[13.5px] text-ink-soft">
        Describe one messy, priced-by-the-hour service and cut it down to a fixed-scope offer — outcome, deliverables, timeline, boundaries, one price.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Btn tone="safety" onClick={onAdd}><Plus className="h-3.5 w-3.5" aria-hidden /> Build an offer</Btn>
        <Btn onClick={onDemo}><Sparkles className="h-3.5 w-3.5" aria-hidden /> Load demo</Btn>
      </div>
    </div>
  );
}

function OfferCard({ offer, index, onOpen, onDuplicate, onRemove, onMove, dragProps }) {
  const ready = readinessFor(offer);
  const risk = riskFromHits(lintOffer(offer));
  const riskCls = risk.level === 'airtight' ? 'text-go-deep' : risk.level === 'tight' ? 'text-caution' : 'text-hazard-deep';
  return (
    <li {...dragProps}
      className={`group rounded-lg border bg-panel p-4 shadow-lift transition-shadow ${dragProps['data-over'] ? 'border-safety-deep ring-2 ring-safety/50' : 'border-line-strong'}`}>
      <div className="flex items-start gap-3">
        <button type="button" aria-label={`Reorder ${offer.name}`} className="mt-1 hidden shrink-0 cursor-grab text-ink-faint hover:text-ink sm:inline-flex" draggable
          onDragStart={dragProps.onGripDragStart}>
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => onOpen(offer.id)} className="text-left font-display text-[16px] font-black hover:text-safety-ink">
              {offer.name || 'Untitled offer'}
            </button>
            <StatusStamp status={offer.status} />
          </div>
          <p className="mt-1 line-clamp-2 text-[13px] text-ink-soft">{offer.outcome || 'No outcome written yet — open the Workbench to start.'}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-soft">
            <span className="inline-flex items-center gap-1 font-mono font-semibold text-ink">
              <Tag className="h-3.5 w-3.5 text-safety-deep" aria-hidden />
              {fmtMoney(offer.price, offer.currency)}{unitSuffix(offer.priceUnit)}
            </span>
            <span className="inline-flex items-center gap-1">
              <PackageCheck className="h-3.5 w-3.5" aria-hidden /> {offer.deliverables.filter((d) => d.text.trim()).length} deliverables
            </span>
            <span className="inline-flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5" aria-hidden /> {ready.pct}% ship-ready
            </span>
            <span className={`inline-flex items-center gap-1 font-semibold ${riskCls}`}>
              <OctagonAlert className="h-3.5 w-3.5" aria-hidden /> {risk.levelLabel}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex gap-1">
            <IconBtn label="Move up" onClick={() => onMove(index, -1)}><ArrowUp className="h-3.5 w-3.5" aria-hidden /></IconBtn>
            <IconBtn label="Move down" onClick={() => onMove(index, 1)}><ArrowDown className="h-3.5 w-3.5" aria-hidden /></IconBtn>
          </div>
          <div className="flex gap-1">
            <IconBtn label={`Duplicate ${offer.name}`} onClick={() => onDuplicate(offer.id)}><Copy className="h-3.5 w-3.5" aria-hidden /></IconBtn>
            <IconBtn label={`Delete ${offer.name}`} onClick={() => onRemove(offer.id)} className="hover:border-hazard-deep hover:text-hazard-deep"><Trash2 className="h-3.5 w-3.5" aria-hidden /></IconBtn>
          </div>
          <Btn tone="ink" onClick={() => onOpen(offer.id)} className="mt-1"><Wrench className="h-3.5 w-3.5" aria-hidden /> Workbench</Btn>
        </div>
      </div>
    </li>
  );
}

function LineTab({ offers, openOffer, addOffer, duplicateOffer, removeOffer, moveOffer, dragFrom, dragOver, setDragOver, dropOffer, business, patchBusiness, loadDemo }) {
  const [q, setQ] = useState('');
  const filtered = offers.filter((o) => {
    const needle = q.trim().toLowerCase();
    return !needle || o.name.toLowerCase().includes(needle) || o.outcome.toLowerCase().includes(needle);
  });
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <section aria-label="Offer line">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-faint" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the line…"
              className={`${inputCls} py-1.5 pl-8 text-[13px]`} aria-label="Search offers" />
          </div>
          <Btn tone="safety" onClick={addOffer}><Plus className="h-3.5 w-3.5" aria-hidden /> New offer</Btn>
        </div>
        {offers.length === 0 ? (
          <EmptyLine onAdd={addOffer} onDemo={loadDemo} />
        ) : (
          <ul className="space-y-3">
            {filtered.map((o, i) => {
              const realIndex = offers.findIndex((x) => x.id === o.id);
              return (
                <OfferCard key={o.id} offer={o} index={realIndex}
                  onOpen={openOffer} onDuplicate={duplicateOffer} onRemove={removeOffer} onMove={moveOffer}
                  dragProps={{
                    draggable: true,
                    'data-over': dragOver === realIndex,
                    onDragStart: () => { dragFrom.current = realIndex; },
                    onDragOver: (e) => { e.preventDefault(); setDragOver(realIndex); },
                    onDragLeave: () => setDragOver((d) => (d === realIndex ? null : d)),
                    onDrop: (e) => { e.preventDefault(); dropOffer(realIndex); },
                    onGripDragStart: () => { dragFrom.current = realIndex; },
                  }}
                />
              );
            })}
            {filtered.length === 0 && <p className="px-2 py-6 text-center text-[13px] text-ink-faint">Nothing on the line matches “{q}.”</p>}
          </ul>
        )}
      </section>
      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <section className="rounded-lg border border-line-strong bg-panel p-4 shadow-lift" aria-label="Studio profile">
          <h2 className="font-display text-[12px] font-black uppercase tracking-[0.14em] text-ink-soft">Your studio</h2>
          <p className="mt-0.5 text-[11.5px] text-ink-faint">Printed on every spec sheet and folded into every Copilot prompt.</p>
          <div className="mt-3 space-y-3">
            <Field label="Studio name">
              <input className={inputCls} value={business.name} onChange={(e) => patchBusiness({ name: e.target.value })} placeholder="Kiln & Vance Studio" />
            </Field>
            <Field label="What you do">
              <input className={inputCls} value={business.tagline} onChange={(e) => patchBusiness({ tagline: e.target.value })} placeholder="Websites and local SEO for independent restaurants." />
            </Field>
            <Field label="Contact">
              <input className={inputCls} value={business.contact} onChange={(e) => patchBusiness({ contact: e.target.value })} placeholder="hello@yourstudio.example" />
            </Field>
          </div>
        </section>
        <section className="rounded-lg border border-line-strong bg-panel p-4 shadow-lift" aria-label="Line summary">
          <h2 className="font-display text-[12px] font-black uppercase tracking-[0.14em] text-ink-soft">Line summary</h2>
          <dl className="mt-2 space-y-1.5 text-[13px]">
            <div className="flex items-center justify-between"><dt className="text-ink-soft">Offers on the line</dt><dd className="font-mono font-semibold">{offers.length}</dd></div>
            <div className="flex items-center justify-between"><dt className="text-ink-soft">Shipped</dt><dd className="font-mono font-semibold">{offers.filter((o) => o.status === 'shipped').length}</dd></div>
            <div className="flex items-center justify-between"><dt className="text-ink-soft">Ready to ship</dt><dd className="font-mono font-semibold">{offers.filter((o) => o.status === 'ready').length}</dd></div>
            <div className="flex items-center justify-between"><dt className="text-ink-soft">Still draft</dt><dd className="font-mono font-semibold">{offers.filter((o) => o.status === 'draft').length}</dd></div>
          </dl>
        </section>
      </aside>
    </div>
  );
}

/* ============================ workbench tab ============================= */

function WorkbenchTab({ offer, updateOffer, station, setStation, deliverableOps, exclusionOps, checklistOps, generateChecklist, addPhase, updatePhase, removePhase, readiness, risk, lintHits, doneMap, setTab }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input value={offer.name} onChange={(e) => updateOffer(offer.id, { name: e.target.value })}
            aria-label="Offer name"
            className="min-w-0 flex-1 rounded-md border border-line-strong bg-panel px-3 py-2 font-display text-[19px] font-black outline-none focus:border-safety-deep" />
          <StatusStamp status={offer.status} className="shrink-0" />
          <select value={offer.status} onChange={(e) => updateOffer(offer.id, { status: e.target.value })}
            aria-label="Offer status" className={`${inputCls} w-auto shrink-0 py-1.5 text-[12.5px]`}>
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="shipped">Shipped</option>
          </select>
        </div>
        <StationRail active={station} onSelect={setStation} doneMap={doneMap} />
        <div className="rounded-b-lg border border-t-0 border-line-strong bg-panel p-5 shadow-lift">
          {station === 'outcome' && (
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-black"><Target className="h-4.5 w-4.5 text-safety-deep" aria-hidden /> The outcome</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">One or two sentences. What does the client have, that they did not have before, when this is done?</p>
              <textarea value={offer.outcome} onChange={(e) => updateOffer(offer.id, { outcome: e.target.value })}
                rows={5} aria-label="Offer outcome" className={`${inputCls} mt-3`}
                placeholder="A live, mobile-ready restaurant website, designed, built, and indexed by Google within three weeks of kickoff." />
              <p className="mt-1.5 text-right text-[11px] text-ink-faint">{wordCount(offer.outcome)} words</p>
            </div>
          )}
          {station === 'deliverables' && (
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-black"><PackageCheck className="h-4.5 w-4.5 text-safety-deep" aria-hidden /> Deliverables</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">Countable nouns only — “5 pages,” not “a website.” This list is what the invoice points at.</p>
              <div className="mt-3">
                <EditableList items={offer.deliverables} onAdd={deliverableOps.add} onUpdate={deliverableOps.update}
                  onRemove={deliverableOps.remove} onMove={deliverableOps.move}
                  placeholder="e.g. 5-page responsive website — Home, Menu, About, Events, Contact"
                  addLabel="Add a deliverable" />
              </div>
            </div>
          )}
          {station === 'timeline' && (
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-black"><Route className="h-4.5 w-4.5 text-safety-deep" aria-hidden /> Timeline</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">A duration clients can hold you to, then the phases that fill it.</p>
              <div className="mt-3">
                <Field label="Duration" hint="e.g. “3 weeks from kickoff” or “Monthly · cancel with 30 days’ notice.”">
                  <input className={inputCls} value={offer.durationLabel} onChange={(e) => updateOffer(offer.id, { durationLabel: e.target.value })} placeholder="3 weeks from kickoff" />
                </Field>
              </div>
              <div className="mt-4 space-y-2.5">
                {offer.phases.map((p, i) => (
                  <div key={p.id} className="flex items-start gap-2 rounded-md border border-line-strong bg-panel-deep p-2.5">
                    <span className="mt-1.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-steel-700 bg-steel-900 font-mono text-[11px] font-bold text-safety">{i + 1}</span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <input value={p.name} onChange={(e) => updatePhase(p.id, { name: e.target.value })} placeholder="Phase name" aria-label={`Phase ${i + 1} name`}
                        className={`${inputCls} py-1.5 font-display text-[13px] font-bold`} />
                      <textarea value={p.detail} onChange={(e) => updatePhase(p.id, { detail: e.target.value })} rows={1} placeholder="What happens in this phase" aria-label={`Phase ${i + 1} detail`}
                        className={`${inputCls} min-h-[36px] resize-y py-1.5 text-[12.5px]`} />
                    </div>
                    {i < offer.phases.length - 1 && <MoveRight className="mt-2 h-4 w-4 shrink-0 text-ink-faint" aria-hidden />}
                    <IconBtn label={`Remove phase ${i + 1}`} onClick={() => removePhase(p.id)} className="mt-1 hover:border-hazard-deep hover:text-hazard-deep"><Trash2 className="h-3.5 w-3.5" aria-hidden /></IconBtn>
                  </div>
                ))}
                <Btn onClick={addPhase}><Plus className="h-3.5 w-3.5" aria-hidden /> Add phase</Btn>
              </div>
            </div>
          )}
          {station === 'boundaries' && (
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-black"><Fence className="h-4.5 w-4.5 text-safety-deep" aria-hidden /> Boundaries</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">Say the fence out loud. Everything not listed here is quoted separately — and everyone knows it up front.</p>
              <div className="mt-3">
                <EditableList items={offer.exclusions} onAdd={exclusionOps.add} onUpdate={exclusionOps.update}
                  onRemove={exclusionOps.remove} onMove={exclusionOps.move}
                  placeholder="e.g. Paid ad campaign setup and management"
                  addLabel="Add a boundary" />
              </div>
            </div>
          )}
          {station === 'price' && (
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-black"><Tag className="h-4.5 w-4.5 text-safety-deep" aria-hidden /> Price</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">One number. “Starting at” is a custom quote wearing a disguise.</p>
              <div className="mt-3 grid gap-3.5 sm:grid-cols-2">
                <Field label="Price">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
                    <input type="number" min="0" step="1" className={inputCls} value={offer.price || ''}
                      onChange={(e) => updateOffer(offer.id, { price: clamp(num(e.target.value, 0), 0, 99999999) })} placeholder="4200" />
                  </div>
                </Field>
                <Field label="Currency">
                  <select className={inputCls} value={offer.currency} onChange={(e) => updateOffer(offer.id, { currency: e.target.value })}>
                    {CURRENCIES.map(([k, sym]) => <option key={k} value={k}>{k} ({sym})</option>)}
                  </select>
                </Field>
                <Field label="Billing unit">
                  <select className={inputCls} value={offer.priceUnit} onChange={(e) => updateOffer(offer.id, { priceUnit: e.target.value })}>
                    {PRICE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Billing note" hint="Deposit split, invoicing cadence, card-on-file — the practical part.">
                    <textarea rows={2} className={inputCls} value={offer.billingNote} onChange={(e) => updateOffer(offer.id, { billingNote: e.target.value })}
                      placeholder="50% deposit to start, 50% due at launch." />
                  </Field>
                </div>
              </div>
              <p className="mt-4 rounded-md border border-line-strong bg-panel-deep px-3 py-2 font-mono text-[15px] font-bold">
                {fmtMoney(offer.price, offer.currency)}{unitSuffix(offer.priceUnit)}
              </p>
            </div>
          )}
          {station === 'checklist' && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-display text-lg font-black"><ClipboardCheck className="h-4.5 w-4.5 text-safety-deep" aria-hidden /> Delivery checklist</h2>
                <Btn tone="safety" onClick={generateChecklist}><PackagePlus className="h-3.5 w-3.5" aria-hidden /> Generate from deliverables</Btn>
              </div>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">The work order every delivery runs through. Checked lines print on the spec sheet.</p>
              <div className="mt-3">
                <EditableList items={offer.checklist} onAdd={checklistOps.add} onUpdate={checklistOps.update}
                  onRemove={checklistOps.remove} onMove={checklistOps.move} toggleable
                  placeholder="e.g. Google Business Profile claimed and verified"
                  addLabel="Add a checklist step" />
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <section className="rounded-lg border border-line-strong bg-panel p-4 shadow-lift" aria-label="Ship-ready gauge">
          <h2 className="flex items-center gap-1.5 font-display text-[12px] font-black uppercase tracking-[0.14em] text-ink-soft"><Gauge className="h-3.5 w-3.5" aria-hidden /> Ship gauge</h2>
          <ShipGauge pct={readiness ? readiness.pct : 0} />
          <p className="-mt-1 text-center font-display text-[10.5px] font-bold uppercase tracking-[0.2em] text-ink-faint">ship-ready</p>
          <ul className="mt-3 space-y-1.5">
            {(readiness ? readiness.checks : []).map((c, i) => (
              <li key={i}>
                <button type="button" onClick={() => setStation(c.station)}
                  className="flex w-full items-start gap-2 rounded px-1 py-0.5 text-left text-[12.5px] leading-snug hover:bg-panel-deep">
                  {c.ok
                    ? <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-go-deep" aria-hidden />
                    : <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />}
                  <span className={c.ok ? 'text-ink-soft' : 'text-ink'}>{c.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg border border-line-strong bg-panel p-4 shadow-lift" aria-label="Scope-creep risk gauge">
          <h2 className="flex items-center gap-1.5 font-display text-[12px] font-black uppercase tracking-[0.14em] text-ink-soft"><OctagonAlert className="h-3.5 w-3.5" aria-hidden /> Risk gauge</h2>
          <RiskGauge score={risk.score} />
          <p className={`-mt-1 text-center font-display text-[10.5px] font-bold uppercase tracking-[0.2em] ${
            risk.level === 'airtight' ? 'text-go-deep' : risk.level === 'tight' ? 'text-caution' : 'text-hazard-deep'
          }`}>{risk.levelLabel}</p>
          {lintHits.length > 0 ? (
            <ul className="mt-3 space-y-2 border-t border-dashed border-line pt-3">
              {lintHits.slice(0, 8).map((h) => (
                <li key={h.id}>
                  <button type="button" onClick={() => setStation(h.station)} className="w-full rounded px-1 py-0.5 text-left hover:bg-panel-deep">
                    <div className="flex items-center gap-1.5">
                      <SeverityChip severity={h.severity} />
                      <span className="font-mono text-[11.5px] font-bold">“{h.term}”</span>
                      <span className="text-[10.5px] text-ink-faint">· {h.itemLabel || h.field}</span>
                    </div>
                    <p className="mt-0.5 text-[11.5px] italic text-ink-faint">{h.tip}</p>
                  </button>
                </li>
              ))}
              {lintHits.length > 8 && <li className="text-[11px] text-ink-faint">+{lintHits.length - 8} more flagged word{lintHits.length - 8 === 1 ? '' : 's'}.</li>}
            </ul>
          ) : (
            <p className="mt-3 border-t border-dashed border-line pt-3 text-[12px] text-ink-soft">No vague words caught in outcome, deliverables, or boundaries. Airtight.</p>
          )}
        </section>
        <button type="button" onClick={() => setTab('onepager')}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-line-strong bg-panel px-3 py-2 text-[12.5px] font-semibold hover:border-safety-deep hover:text-safety-ink">
          <Eye className="h-3.5 w-3.5" aria-hidden /> Open the spec sheet
        </button>
      </aside>
    </div>
  );
}

/* ============================ one-pager tab ============================= */

function OnePagerTab({ offer, business, onPrint, onCopy, setTab }) {
  const dels = offer.deliverables.filter((d) => d.text.trim());
  const exs = offer.exclusions.filter((e) => e.text.trim());
  const checked = offer.checklist.filter((c) => c.included);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-black">Spec Sheet</h2>
          <p className="text-[12.5px] text-ink-soft">The offer one-pager — this is what a prospect actually reads.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => setTab('workbench')}><Wrench className="h-3.5 w-3.5" aria-hidden /> Back to Workbench</Btn>
          <Btn onClick={onCopy}><Copy className="h-3.5 w-3.5" aria-hidden /> Copy Markdown</Btn>
          <Btn tone="safety" onClick={onPrint}><Printer className="h-3.5 w-3.5" aria-hidden /> Print / Save as PDF</Btn>
        </div>
      </div>
      <article className="mx-auto max-w-2xl rounded-lg border border-steel-900 bg-panel shadow-panel">
        <div className="hazard-rule h-2 rounded-t-lg" />
        <div className="px-7 py-8 sm:px-10">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-safety-deep">Fixed-scope offer</p>
          <h1 className="mt-1 font-display text-[28px] font-black uppercase leading-tight">{offer.name || 'Untitled offer'}</h1>
          {business.name && <p className="mt-1 text-[13px] text-ink-soft">{business.name}{business.tagline ? ` — ${business.tagline}` : ''}</p>}
          <div className="mt-5 rounded-md border border-line-strong bg-panel-deep p-4">
            <p className="text-[15px] leading-relaxed">{offer.outcome || 'No outcome written yet.'}</p>
          </div>

          <h2 className="mt-6 flex items-center gap-1.5 font-display text-[13px] font-black uppercase tracking-[0.12em]"><PackageCheck className="h-4 w-4 text-safety-deep" aria-hidden /> What's included</h2>
          <ul className="mt-2 space-y-1.5">
            {dels.length ? dels.map((d) => (
              <li key={d.id} className="flex items-start gap-2 text-[13.5px]"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-go-deep" aria-hidden /> {d.text}</li>
            )) : <li className="text-[13px] italic text-ink-faint">No deliverables listed yet.</li>}
          </ul>

          <h2 className="mt-6 flex items-center gap-1.5 font-display text-[13px] font-black uppercase tracking-[0.12em]"><Route className="h-4 w-4 text-safety-deep" aria-hidden /> Timeline</h2>
          <p className="mt-1 font-mono text-[13px] font-semibold">{offer.durationLabel || 'No duration set yet.'}</p>
          {offer.phases.length > 0 && (
            <ol className="mt-2 space-y-1.5">
              {offer.phases.map((p, i) => (
                <li key={p.id} className="flex items-start gap-2 text-[13px]">
                  <span className="mt-0.5 inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-steel-900 font-mono text-[9.5px] font-bold text-safety">{i + 1}</span>
                  <span><strong>{p.name}</strong>{p.detail ? ` — ${p.detail}` : ''}</span>
                </li>
              ))}
            </ol>
          )}

          <h2 className="mt-6 flex items-center gap-1.5 font-display text-[13px] font-black uppercase tracking-[0.12em]"><Fence className="h-4 w-4 text-hazard-deep" aria-hidden /> What's not included</h2>
          <div className="mt-2 rounded-md border border-dashed border-hazard-deep/50 bg-hazard-soft/40 p-3">
            <ul className="space-y-1.5">
              {exs.length ? exs.map((e) => (
                <li key={e.id} className="text-[13px]">— {e.text}</li>
              )) : <li className="text-[13px] italic text-ink-faint">No boundaries fenced off yet.</li>}
            </ul>
          </div>

          <h2 className="mt-6 flex items-center gap-1.5 font-display text-[13px] font-black uppercase tracking-[0.12em]"><Tag className="h-4 w-4 text-safety-deep" aria-hidden /> Investment</h2>
          <p className="mt-1 font-mono text-[22px] font-bold">{fmtMoney(offer.price, offer.currency)}{unitSuffix(offer.priceUnit)}</p>
          {offer.billingNote && <p className="mt-1 text-[12.5px] text-ink-soft">{offer.billingNote}</p>}

          {checked.length > 0 && (
            <>
              <h2 className="mt-6 flex items-center gap-1.5 font-display text-[13px] font-black uppercase tracking-[0.12em]"><ClipboardCheck className="h-4 w-4 text-safety-deep" aria-hidden /> Delivery checklist</h2>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {checked.map((c) => (
                  <li key={c.id} className="flex items-start gap-1.5 text-[12px] text-ink-soft"><Circle className="mt-0.5 h-2.5 w-2.5 shrink-0" aria-hidden /> {c.text}</li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-7 border-t border-dashed border-line pt-3 text-[11px] text-ink-faint">
            {business.name || 'Prepared'}{business.contact ? ` · ${business.contact}` : ''}
          </div>
        </div>
      </article>
    </div>
  );
}

function SpecSheetPrint({ offer, business }) {
  const dels = offer.deliverables.filter((d) => d.text.trim());
  const exs = offer.exclusions.filter((e) => e.text.trim());
  const checked = offer.checklist.filter((c) => c.included);
  return (
    <div className="print-sheet mx-auto max-w-2xl px-2 py-4 text-[13px] text-[#1a1608]">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em]">Fixed-scope offer</p>
      <h1 className="text-[26px] font-black uppercase leading-tight">{offer.name || 'Untitled offer'}</h1>
      {business.name && <p className="text-[12px]">{business.name}{business.tagline ? ` — ${business.tagline}` : ''}</p>}
      <p className="mt-4 text-[14px] leading-relaxed">{offer.outcome || '—'}</p>

      <h2 className="mt-5 text-[12px] font-black uppercase tracking-[0.1em]">What's included</h2>
      <ul className="mt-1.5 list-disc pl-5">
        {dels.map((d) => <li key={d.id}>{d.text}</li>)}
      </ul>

      <h2 className="mt-5 text-[12px] font-black uppercase tracking-[0.1em]">Timeline</h2>
      <p>{offer.durationLabel || '—'}</p>
      <ol className="mt-1 list-decimal pl-5">
        {offer.phases.map((p) => <li key={p.id}><strong>{p.name}</strong>{p.detail ? ` — ${p.detail}` : ''}</li>)}
      </ol>

      <h2 className="mt-5 text-[12px] font-black uppercase tracking-[0.1em]">What's not included</h2>
      <ul className="mt-1.5 list-disc pl-5">
        {exs.map((e) => <li key={e.id}>{e.text}</li>)}
      </ul>

      <h2 className="mt-5 text-[12px] font-black uppercase tracking-[0.1em]">Investment</h2>
      <p className="text-[18px] font-bold">{fmtMoney(offer.price, offer.currency)}{unitSuffix(offer.priceUnit)}</p>
      {offer.billingNote && <p>{offer.billingNote}</p>}

      {checked.length > 0 && (
        <>
          <h2 className="mt-5 text-[12px] font-black uppercase tracking-[0.1em]">Delivery checklist</h2>
          <ul className="mt-1.5 list-disc pl-5">
            {checked.map((c) => <li key={c.id}>{c.text}</li>)}
          </ul>
        </>
      )}

      <p className="mt-6 border-t pt-2 text-[10px]">{business.name || 'Prepared'}{business.contact ? ` · ${business.contact}` : ''}</p>
    </div>
  );
}

/* ============================== copilot tab ============================== */

function CopilotTab({ state, activeOffer, connectors, copyText, patch }) {
  const [preview, setPreview] = useState(null);
  const [offerId, setOfferId] = useState('');
  const targetOffer = state.offers.find((o) => o.id === offerId) || activeOffer;

  const actions = [
    {
      icon: PackagePlus,
      title: 'Productize my messy service description',
      desc: 'Paste a rambling, priced-by-the-hour description below. Claude drafts a complete fixed-scope offer — outcome, deliverables, timeline, boundaries, and a defensible price.',
      needsMessy: true,
      build: () => promptProductize(state, state.productizeInput),
      disabled: false,
    },
    {
      icon: Scale,
      title: 'Tighten deliverable language',
      desc: 'Feeds this offer’s exact scope-creep lint results into Claude, then asks for line-by-line rewrites of every vague phrase — before and after.',
      needsOffer: true,
      build: () => promptTighten(targetOffer, state.business),
      disabled: !targetOffer,
      disabledHint: 'Build an offer first.',
    },
    {
      icon: Rocket,
      title: 'Write the sales page for this offer',
      desc: 'A complete one-offer landing page: headline, who it’s for, what’s included, what’s not, price, FAQ, and a call to action.',
      needsOffer: true,
      build: () => promptSalesPage(targetOffer, state.business),
      disabled: !targetOffer,
      disabledHint: 'Build an offer first.',
    },
    {
      icon: ShieldQuestion,
      title: 'Red-team this offer',
      desc: 'Claude plays the skeptical prospect with ninety seconds and a red pen: verdict, the squishy line, the one question, a sharper pitch.',
      needsOffer: true,
      build: () => promptRedTeam(targetOffer, state.business),
      disabled: !targetOffer,
      disabledHint: 'Build an offer first.',
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <section className="rounded-lg border border-line-strong bg-panel p-5 shadow-lift">
          <h2 className="flex items-center gap-2 font-display text-lg font-black"><Sparkles className="h-4.5 w-4.5 text-safety-deep" aria-hidden /> The Foreman's Desk</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            Each action below sets a complete prompt with your studio and offer folded in.
            Copy it, paste it into <strong>claude.ai</strong>, and bring the answer back.
            Works with the standard $20 Claude subscription; no API key, nothing leaves this page until you paste.
          </p>
          {connectors && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-safety-deep bg-safety/20 px-2.5 py-1 text-[11px] font-semibold text-safety-ink">
              <Link2 className="h-3 w-3" aria-hidden /> Console context will be woven into every prompt
            </p>
          )}
        </section>

        {actions.map((a, i) => (
          <section key={i} className="rounded-lg border border-line-strong bg-panel p-4 shadow-lift">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-safety-deep bg-safety/25 text-safety-ink deboss">
                <a.icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-[15px] font-bold">{a.title}</h3>
                <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">{a.desc}</p>
                {a.needsMessy && (
                  <textarea value={state.productizeInput} onChange={(e) => patch({ productizeInput: e.target.value })}
                    rows={4} aria-label="Messy service description" className={`${inputCls} mt-3 text-[13px]`}
                    placeholder="e.g. Ok so whenever a client needs their menu page updated I just... do it? I charge $75/hr but it's all over the place..." />
                )}
                {a.needsOffer && state.offers.length > 0 && (
                  <select value={targetOffer ? targetOffer.id : ''} onChange={(e) => setOfferId(e.target.value)}
                    aria-label="Offer to use" className={`${inputCls} mt-3 py-1.5 text-[13px]`}>
                    {state.offers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                )}
                {a.disabled && <p className="mt-2 text-[12px] italic text-hazard-deep">{a.disabledHint}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Btn tone="safety" onClick={() => !a.disabled && copyText(a.build(), 'Prompt copied — paste into claude.ai')}
                    className={a.disabled ? 'pointer-events-none opacity-40' : ''} aria-disabled={a.disabled}>
                    <Copy className="h-3.5 w-3.5" aria-hidden /> Copy prompt
                  </Btn>
                  <Btn onClick={() => !a.disabled && setPreview({ title: a.title, text: a.build() })}
                    className={a.disabled ? 'pointer-events-none opacity-40' : ''} aria-disabled={a.disabled}>
                    <Eye className="h-3.5 w-3.5" aria-hidden /> Read it first
                  </Btn>
                  <span className="text-[11px] text-ink-faint">Paste into claude.ai — standard Claude subscription is enough.</span>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        <section className="rounded-lg border border-line-strong bg-panel p-4 shadow-lift" aria-label="Claude reply notes">
          <h3 className="flex items-center gap-2 font-display text-[13px] font-black uppercase tracking-[0.14em]"><ClipboardPaste className="h-4 w-4 text-safety-deep" aria-hidden /> The Foreman's Notes</h3>
          <p className="mt-1 text-[12px] text-ink-faint">Paste Claude's answers here — they save with your line, ready to fold back into an offer.</p>
          <textarea value={state.copilotNotes} onChange={(e) => patch({ copilotNotes: e.target.value })}
            rows={16} aria-label="Pasted Claude answers"
            className={`${inputCls} mt-3 text-[13px] leading-relaxed`}
            placeholder="Claude said…" />
        </section>
      </aside>

      <Modal open={!!preview} onClose={() => setPreview(null)} label="Prompt preview" wide>
        {preview && (
          <div>
            <h2 className="pr-8 font-display text-lg font-black">{preview.title}</h2>
            <pre className="mt-3 max-h-[55vh] overflow-y-auto whitespace-pre-wrap rounded-md border border-line-strong bg-panel-deep p-4 font-body text-[12.5px] leading-relaxed">
              {preview.text}
            </pre>
            <div className="mt-4 flex justify-end gap-2">
              <Btn onClick={() => setPreview(null)}>Close</Btn>
              <Btn tone="safety" onClick={() => { copyText(preview.text, 'Prompt copied — paste into claude.ai'); setPreview(null); }}>
                <Copy className="h-3.5 w-3.5" aria-hidden /> Copy prompt
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ============================== guide modal ============================== */

function GuideModal({ open, onClose }) {
  const steps = [
    ['Load the demo or start an offer', 'The Line tab is your roster. Load demo to see Kiln & Vance Studio’s three offers done well — one shipped, one ready, one still draft — or click "New offer" to start your own.'],
    ['Walk the stations', 'Open an offer into the Workbench. Six stations run left to right like a conveyor: Outcome, Deliverables, Timeline, Boundaries, Price, Checklist. Click any station to jump straight there.'],
    ['Write the outcome first', 'One or two sentences — the concrete result the client walks away with. Everything else in the offer defends this sentence.'],
    ['List countable deliverables', 'Numbers and named nouns, not verbs. "5 pages," not "a website." This is what the invoice — and the client — will point back to.'],
    ['Fence the boundaries', 'Say what is excluded, out loud, on the offer itself. The Boundaries station is what keeps "custom work" from sneaking back in for free.'],
    ['Watch the Risk Gauge', 'The scope-creep lint scans your outcome, deliverables, and boundaries for vague words — "ongoing," "as needed," "support" — as you type. Click a flagged word to jump to it.'],
    ['Set one price, generate the checklist', 'Price station: one number, no "starting at." Checklist station: "Generate from deliverables" seeds a work order automatically — edit it into your real delivery process.'],
    ['Ship it', 'Spec Sheet shows the finished offer one-pager. Print it, copy it as Markdown, or send Claude to write the sales page from it.'],
  ];
  const keys = [
    ['?', 'Open this guide'],
    ['Esc', 'Close dialogs and menus'],
    ['Ctrl/Cmd + S', 'Copy the active offer as Markdown'],
    ['Ctrl/Cmd + P', 'Print the active offer’s spec sheet'],
  ];
  return (
    <Modal open={open} onClose={onClose} label="How to use Service Productizer" wide>
      <div className="flex items-center gap-3">
        <FactoryMark className="h-11 w-11" />
        <div>
          <h2 className="font-display text-xl font-black leading-tight">How to use Service Productizer</h2>
          <p className="text-[12.5px] text-ink-soft">From a messy hourly service to a fixed-scope offer, in eight moves.</p>
        </div>
      </div>
      <div className="hazard-rule my-4 h-1 rounded-full" />
      <ol className="space-y-3">
        {steps.map(([t, d], i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-safety-deep font-display text-[11px] font-black text-safety-ink">{i + 1}</span>
            <p className="text-[13.5px] leading-snug"><strong className="font-display">{t}.</strong>{' '}<span className="text-ink-soft">{d}</span></p>
          </li>
        ))}
      </ol>
      <h3 className="mt-5 font-display text-[12px] font-black uppercase tracking-[0.14em] text-ink-soft">Keyboard</h3>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {keys.map(([k, d], i) => (
          <p key={i} className="text-[13px]">
            <kbd className="rounded border border-steel-700 bg-steel-900 px-1.5 py-0.5 font-mono text-[11px] font-bold text-safety shadow-[inset_0_-1px_0_rgb(0_0_0/0.4)]">{k}</kbd>
            <span className="ms-2 text-ink-soft">{d}</span>
          </p>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <Btn tone="ink" onClick={onClose}><Check className="h-3.5 w-3.5" aria-hidden /> To the floor</Btn>
      </div>
    </Modal>
  );
}

/* ================================ demo =================================== */

function demoState() {
  const offer1 = normalizeOffer({
    id: 'off-launch',
    name: 'The Launch Sprint',
    status: 'shipped',
    outcome: 'A live, mobile-ready restaurant website, designed, built, and indexed by Google within three weeks of kickoff.',
    deliverables: [
      { text: '5-page responsive website — Home, Menu, About, Events, Contact' },
      { text: 'Mobile-first build tested on iOS and Android' },
      { text: 'Google Business Profile claimed and optimized' },
      { text: 'On-page SEO for 8 target local keywords' },
      { text: 'Menu PDF converted into an editable, styled page' },
      { text: 'One round of photography direction (client supplies the shots)' },
    ],
    durationLabel: '3 weeks from kickoff',
    phases: [
      { name: 'Discovery & Content Audit', detail: 'Kickoff call, brand assets and menu content collected, competitor scan run.' },
      { name: 'Design & Build', detail: 'All five pages designed and built on our stack; one consolidated feedback round.' },
      { name: 'Launch & Index', detail: 'QA pass, DNS cutover, Search Console and Google Business Profile submission.' },
    ],
    exclusions: [
      { text: 'Menu content updates beyond launch day' },
      { text: 'Paid ad campaign setup and management' },
      { text: 'Photography and videography production' },
      { text: 'Third-party booking or POS integrations' },
      { text: 'Multilingual translation of site content' },
    ],
    price: 4200, currency: 'USD', priceUnit: 'one-time',
    billingNote: '50% deposit to start, 50% due at launch. Card or bank transfer.',
    checklist: [
      { text: 'Kickoff call held and brand assets received' },
      { text: 'Sitemap and page copy approved by the client' },
      { text: 'Design mockup approved (one round)' },
      { text: 'Site built and QA’d on mobile and desktop' },
      { text: 'Google Business Profile claimed and verified' },
      { text: 'DNS cutover scheduled with the client’s registrar' },
      { text: 'Search Console and sitemap submitted' },
      { text: 'Launch email sent with login and handoff notes' },
    ],
  });
  const offer2 = normalizeOffer({
    id: 'off-foundations',
    name: 'The Foundations Plan',
    status: 'ready',
    outcome: 'Your site and local listings stay accurate, fast, and found — every month, without you lifting a finger.',
    deliverables: [
      { text: 'Two content updates per month — menu, hours, events' },
      { text: 'Monthly local SEO check-up across 8 tracked keywords' },
      { text: 'Uptime and speed monitoring with same-week fixes' },
      { text: 'Quarterly Google Business Profile photo refresh' },
      { text: 'One 30-minute strategy call per quarter' },
    ],
    durationLabel: 'Monthly · cancel with 30 days’ notice',
    phases: [
      { name: 'Collect', detail: 'Updates requested from the client by the 3rd of the month.' },
      { name: 'Publish', detail: 'Changes built, QA’d, and live within 5 business days.' },
      { name: 'Report', detail: 'Local SEO check-up run and sent by the 25th.' },
      { name: 'Check in', detail: 'Quarterly 30-minute call — trends, wins, next quarter’s priorities.' },
    ],
    exclusions: [
      { text: 'New page design or site redesign work' },
      { text: 'Paid advertising spend or management' },
      { text: 'Emergency fixes outside business hours' },
      { text: 'Content writing beyond 150 words per update' },
    ],
    price: 340, currency: 'USD', priceUnit: 'per month',
    billingNote: 'Billed monthly to the card on file. First month due at signing.',
    checklist: [
      { text: 'Monthly update request sent by the 3rd' },
      { text: 'Content changes published within 5 business days' },
      { text: 'SEO check-up report sent by the 25th' },
      { text: 'Uptime log reviewed weekly' },
    ],
  });
  const offer3 = normalizeOffer({
    id: 'off-menu',
    name: 'The Menu Refresh',
    status: 'draft',
    outcome: 'We will help improve your menu page and support your seasonal changes as needed.',
    deliverables: [
      { text: 'Updated menu design' },
      { text: 'Ongoing seasonal menu support' },
      { text: 'General site polish' },
    ],
    durationLabel: '',
    phases: [],
    exclusions: [
      { text: 'Photography — added if needed' },
    ],
    price: 0, currency: 'USD', priceUnit: 'one-time', billingNote: '',
    checklist: [],
  });
  return normalize({
    v: 1,
    seenGuide: true,
    tab: 'line',
    station: 'outcome',
    activeOfferId: offer1.id,
    offers: [offer1, offer2, offer3],
    business: {
      name: 'Kiln & Vance Studio',
      tagline: 'Websites and local SEO for independent restaurants.',
      contact: 'hello@kilnandvance.example',
    },
    copilotNotes: '',
    productizeInput:
      'Ok so basically for the Menu Refresh thing, whenever a restaurant client needs their menu page updated I just... do it? I charge $75/hr but it’s honestly all over the place — sometimes it’s a quick text swap, sometimes they want new photos, sometimes they ask me to also just "keep an eye on it" through the season. I never know how to scope it and I end up doing way more than I quoted. Need to turn this into something fixed-price I can actually sell without losing money.',
  });
}
