import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, Pin, Undo2, X, Copy, Download, Upload, HelpCircle,
  RotateCcw, Sparkles, FileText, FileJson, Table2, Search, ClipboardPaste,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Keyboard, Filter,
  Building2, Swords, CalendarRange, ScrollText, Receipt, Landmark, Stamp,
  MessageSquareQuote,
} from 'lucide-react';

/* ================= constants & helpers ================= */

const LS_KEY = 'bizdev:20-win-loss-ledger:v1';
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const todayISO = () => new Date().toISOString().slice(0, 10);

/* hex palette for inline SVG (kept literal, not var(), to match SVG paint conventions) */
const C = {
  paper: '#f3ecd6', paperDeep: '#e9dfc0', card: '#fbf6e6',
  ink: '#182620', pencil: '#55665a', faint: '#8b9a8d', rule: '#c7d6bb',
  win: '#1c6b3d', loss: '#a3231f', gold: '#a9832c', visor: '#14432f',
  inkdark: '#101a15',
};

const SEGMENTS = {
  smb: { label: 'SMB', tint: '#55665a' },
  mid: { label: 'Mid-Market', tint: '#1c6b3d' },
  ent: { label: 'Enterprise', tint: '#a9832c' },
  strat: { label: 'Strategic', tint: '#a3231f' },
};
const SOURCES = {
  outbound: { label: 'Outbound', tint: '#14432f' },
  inbound: { label: 'Inbound', tint: '#1c6b3d' },
  referral: { label: 'Referral', tint: '#a9832c' },
  partner: { label: 'Partner', tint: '#2b5f8a' },
  event: { label: 'Event', tint: '#7a4fa0' },
  expansion: { label: 'Expansion', tint: '#a3231f' },
};
const PRICE_FACTORS = {
  favorable: { label: 'Price worked for us', tint: '#1c6b3d' },
  unfavorable: { label: 'Price worked against us', tint: '#a3231f' },
  neutral: { label: "Price wasn't decisive", tint: '#55665a' },
  premium: { label: 'Won despite premium price', tint: '#a9832c' },
};
const DRIVERS = [
  'Champion strength', 'Executive alignment', 'Product fit', 'Pricing & value',
  'Competitive displacement', 'Timing', 'Procurement/legal', 'Response speed',
  'Trust & rapport', 'Feature gap', 'Budget cut', 'Champion turnover',
  'Status quo bias', 'Reference/proof',
];

const fmtPct = (x, digits = 0) => (x == null || !isFinite(x) ? '—' : (x * 100).toFixed(digits) + '%');
const fmtMoney = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
const truncate = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));

function quarterKey(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d)) return 'Unknown';
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
}

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

/* ================= state shape ================= */

function normDeal(e, i) {
  if (!e || typeof e !== 'object') e = {};
  const segKeys = Object.keys(SEGMENTS), srcKeys = Object.keys(SOURCES), pfKeys = Object.keys(PRICE_FACTORS);
  return {
    id: typeof e.id === 'string' ? e.id : uid(),
    code: typeof e.code === 'string' && e.code ? e.code : `WL-${String(i + 1).padStart(3, '0')}`,
    account: String(e.account ?? 'Unnamed account'),
    dealName: String(e.dealName ?? ''),
    outcome: e.outcome === 'lost' ? 'lost' : 'won',
    closeDate: /^\d{4}-\d{2}-\d{2}$/.test(e.closeDate) ? e.closeDate : todayISO(),
    value: Math.max(0, Math.round(Number(e.value) || 0)),
    segment: segKeys.includes(e.segment) ? e.segment : segKeys[0],
    source: srcKeys.includes(e.source) ? e.source : srcKeys[0],
    competitor: String(e.competitor ?? '').trim(),
    priceFactor: pfKeys.includes(e.priceFactor) ? e.priceFactor : '',
    drivers: Array.isArray(e.drivers) ? e.drivers.filter((d) => DRIVERS.includes(d)) : [],
    rep: String(e.rep ?? ''),
    narrative: String(e.narrative ?? ''),
    lessons: String(e.lessons ?? ''),
  };
}

function normalize(raw) {
  let d = raw;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { d = null; } }
  if (!d || typeof d !== 'object') d = {};
  return {
    version: 1,
    seenGuide: !!d.seenGuide,
    deals: Array.isArray(d.deals) ? d.deals.map(normDeal) : [],
    lessons: Array.isArray(d.lessons)
      ? d.lessons.filter((x) => x && typeof x === 'object').map((x) => ({
          id: typeof x.id === 'string' ? x.id : uid(),
          text: String(x.text ?? ''),
          tag: String(x.tag ?? 'pattern'),
          source: String(x.source ?? ''),
          date: String(x.date ?? todayISO()),
        }))
      : [],
    copilotNotes: String(d.copilotNotes ?? ''),
  };
}

/* ================= demo scenario ================= */

const DEMO = normalize({
  seenGuide: true,
  deals: [
    { code: 'WL-001', account: 'Anchor Freight', dealName: 'Dock scheduling rollout', outcome: 'lost', closeDate: '2026-04-18', value: 42000, segment: 'mid', source: 'outbound', competitor: 'FreightPilot', priceFactor: 'unfavorable', drivers: ['Pricing & value', 'Feature gap'], rep: 'Dana Ruiz',
      narrative: 'Strong first two calls, champion was bought in. FreightPilot came in 20% cheaper on the renewal-length contract and we never got past IT security review to make our case on total cost of ownership.',
      lessons: 'When we lead with price instead of ROI math, prospects default to comparing us line-by-line against the incumbent — we lose that fight. Anchor the deal in outcomes before a number ever appears.' },
    { code: 'WL-002', account: 'Bramwell & Voss', dealName: 'Enterprise rollout, 3 regions', outcome: 'won', closeDate: '2026-04-29', value: 168000, segment: 'ent', source: 'referral', competitor: 'In-house build', priceFactor: 'premium', drivers: ['Executive alignment', 'Champion strength', 'Reference/proof'], rep: 'Marcus Webb',
      narrative: 'Referred in by a happy customer on their board. Their CTO wanted to build in-house but the VP Ops had the budget and the political capital, and our reference call sealed it despite us costing more than the internal build estimate.',
      lessons: 'A warm referral plus one great reference call beats a lower internal-build estimate almost every time — buyers trust proof of outcome more than a spreadsheet of engineering hours.' },
    { code: 'WL-003', account: 'Lumen Analytics', dealName: 'Team plan, 40 seats', outcome: 'won', closeDate: '2026-05-06', value: 14400, segment: 'smb', source: 'inbound', competitor: 'DataForge', priceFactor: 'neutral', drivers: ['Response speed', 'Product fit'],
      rep: 'Priya Anand', narrative: 'Inbound trial signup, evaluating us against DataForge on paper. We called within ten minutes of the signup and had a tailored demo booked same day; DataForge took three days to respond to their message.',
      lessons: '' },
    { code: 'WL-004', account: 'Northgate Retail Group', dealName: 'Multi-store expansion', outcome: 'lost', closeDate: '2026-05-14', value: 96000, segment: 'ent', source: 'outbound', competitor: 'Salesloop', priceFactor: 'unfavorable', drivers: ['Procurement/legal', 'Champion turnover'], rep: 'Marcus Webb',
      narrative: 'Our champion (VP Merchandising) left for a competitor mid-cycle. The deal sat untouched in legal redlines for six weeks with no one championing it internally, then Salesloop swept in with an existing MSA already on file.',
      lessons: 'A champion departure mid-cycle is a five-alarm fire, not a scheduling hiccup — re-qualify a new internal sponsor within 48 hours or the deal drifts to whoever already has paper on file.' },
    { code: 'WL-005', account: 'Voss Manufacturing', dealName: 'Plant-floor rollout', outcome: 'won', closeDate: '2026-05-28', value: 38000, segment: 'mid', source: 'partner', competitor: '', priceFactor: 'favorable', drivers: ['Trust & rapport', 'Timing'], rep: 'Dana Ruiz',
      narrative: 'Came through our systems-integrator partner right as their fiscal year budget was about to lapse. No competing vendor was ever brought in — the partner relationship did the qualifying for us.',
      lessons: 'No-competitor deals close faster and at better margins almost every time. The real lesson is to shorten our own sales cycle enough that a competitor never gets invited to the table.' },
    { code: 'WL-006', account: 'PineRidge Health', dealName: 'Compliance reporting suite', outcome: 'lost', closeDate: '2026-06-10', value: 210000, segment: 'ent', source: 'event', competitor: 'CareStack', priceFactor: 'neutral', drivers: ['Status quo bias', 'Budget cut'], rep: 'Priya Anand',
      narrative: 'Met at a healthcare ops conference, five great discovery calls, then our champion went quiet for three weeks. Turned out finance froze new software spend after Q2 budget cuts — the deal never really lost to CareStack, it lost to a frozen budget.',
      lessons: 'Budget freezes kill deals we would otherwise win, and the tell is a stakeholder going quiet mid-cycle. Treat sudden radio silence right after budget season as a risk flag, not a scheduling issue.' },
    { code: 'WL-007', account: 'Cartwell Logistics', dealName: 'Fleet ops dashboard', outcome: 'won', closeDate: '2026-06-24', value: 51000, segment: 'mid', source: 'outbound', competitor: 'FreightPilot', priceFactor: 'favorable', drivers: ['Competitive displacement', 'Product fit', 'Pricing & value'], rep: 'Dana Ruiz',
      narrative: 'Direct rematch against FreightPilot, same competitor that beat us on WL-001. This time we led with our two-week go-live instead of a feature checklist and the buyer had already heard FreightPilot horror stories about a six-month implementation.',
      lessons: "FreightPilot's real weak point is implementation speed, not the product. Lead competitive deals against them with our two-week go-live, not a feature-for-feature checklist." },
    { code: 'WL-008', account: 'Solace Home Goods', dealName: 'Starter plan', outcome: 'won', closeDate: '2026-07-02', value: 9600, segment: 'smb', source: 'referral', competitor: '', priceFactor: 'neutral', drivers: ['Trust & rapport', 'Response speed'], rep: 'Priya Anand',
      narrative: 'Founder-to-founder referral from an existing happy customer. Signed after a single 20-minute call — no formal evaluation, no competitor mentioned once.',
      lessons: 'Founder-to-founder referrals in the SMB segment barely need a sales process at all — the trust transfer is the entire sale. Ask every happy SMB customer for one intro per quarter.' },
    { code: 'WL-009', account: 'Ridgeline Capital', dealName: 'Firm-wide reporting platform', outcome: 'lost', closeDate: '2026-07-09', value: 265000, segment: 'strat', source: 'outbound', competitor: 'In-house build', priceFactor: 'unfavorable', drivers: ['Procurement/legal', 'Budget cut'], rep: 'Marcus Webb',
      narrative: 'Nine-month strategic cycle. Legal review dragged for two quarters over data-residency terms, and by the time we cleared it their new CTO had greenlit an internal build to avoid vendor risk entirely.',
      lessons: 'On strategic deals, a stalled legal review is a silent clock — every extra month gives an internal-build champion more room to make the case for building instead of buying. Push data-residency terms to week one, not month six.' },
    { code: 'WL-010', account: 'Fenwick Studios', dealName: 'Expansion — 3 new teams', outcome: 'won', closeDate: '2026-07-16', value: 33000, segment: 'mid', source: 'expansion', competitor: '', priceFactor: 'favorable', drivers: ['Champion strength', 'Reference/proof'], rep: 'Dana Ruiz',
      narrative: 'Existing champion from last year moved to a new division and pulled us in immediately. Closed in eight days with zero competitive evaluation.',
      lessons: 'A champion who changes teams is one of our highest-probability pipeline sources. Track champion job changes and reach out within the first week.' },
    { code: 'WL-011', account: 'Northwind Import Co', dealName: 'Import compliance tracking', outcome: 'lost', closeDate: '2026-07-18', value: 17800, segment: 'smb', source: 'inbound', competitor: 'DataForge', priceFactor: 'unfavorable', drivers: ['Pricing & value', 'Feature gap'], rep: 'Priya Anand',
      narrative: 'Trial signup, went quiet after pricing was shared, then told us by email they went with DataForge\'s cheaper starter tier. Post-mortem call not yet scheduled.',
      lessons: '' },
  ],
  lessons: [
    { text: 'When we lead with price instead of ROI math, prospects default to comparing us line-by-line against the incumbent — we lose that fight. Anchor the deal in outcomes before a number ever appears.', tag: 'pricing', source: 'WL-001', date: '2026-04-20' },
    { text: "FreightPilot's real weak point is implementation speed, not the product. Lead competitive deals against them with our two-week go-live, not a feature-for-feature checklist.", tag: 'competitive', source: 'WL-007', date: '2026-06-25' },
    { text: 'Budget freezes kill deals we would otherwise win, and the tell is a stakeholder going quiet mid-cycle. Treat sudden radio silence right after budget season as a risk flag, not a scheduling issue.', tag: 'process', source: 'WL-006', date: '2026-06-12' },
    { text: 'No-competitor deals close faster and at better margins almost every time. The real lesson is to shorten our own sales cycle enough that a competitor never gets invited to the table.', tag: 'pipeline', source: 'WL-005', date: '2026-05-30' },
  ],
  copilotNotes: '',
});

/* ================= pattern math ================= */

function groupStats(deals, keyFn, emptyLabel) {
  const map = new Map();
  for (const d of deals) {
    const raw = keyFn(d);
    const key = raw && String(raw).trim() ? String(raw).trim() : emptyLabel;
    if (!map.has(key)) map.set(key, { label: key, won: 0, lost: 0 });
    const g = map.get(key);
    if (d.outcome === 'won') g.won++; else g.lost++;
  }
  return [...map.values()]
    .map((g) => ({ ...g, total: g.won + g.lost, rate: g.won + g.lost ? g.won / (g.won + g.lost) : 0 }))
    .sort((a, b) => b.total - a.total || b.rate - a.rate);
}

function topDriverFor(deals, outcome) {
  const counts = {};
  for (const d of deals) if (d.outcome === outcome) for (const dr of d.drivers) counts[dr] = (counts[dr] || 0) + 1;
  let best = null, n = 0;
  for (const [k, v] of Object.entries(counts)) if (v > n) { n = v; best = k; }
  return best ? { label: best, n } : null;
}

function topCompetitorFor(deals) {
  const counts = {};
  for (const d of deals) { const c = d.competitor.trim() || 'No competitor named'; counts[c] = (counts[c] || 0) + 1; }
  let best = null, n = 0;
  for (const [k, v] of Object.entries(counts)) if (v > n) { n = v; best = k; }
  return best ? { label: best, n } : null;
}

/* ================= markdown / csv serializers ================= */

function dealMd(d) {
  const pf = PRICE_FACTORS[d.priceFactor];
  return [
    `### ${d.code} — ${d.account}${d.dealName ? ` (${d.dealName})` : ''}`,
    ``,
    `- **Outcome:** ${d.outcome.toUpperCase()} · **Closed:** ${d.closeDate} · **Value:** ${fmtMoney(d.value)}`,
    `- **Segment:** ${SEGMENTS[d.segment].label} · **Source:** ${SOURCES[d.source].label} · **Rep:** ${d.rep || '—'}`,
    `- **Competitor:** ${d.competitor || 'None named'}${pf ? ` · **Price factor:** ${pf.label}` : ''}`,
    d.drivers.length ? `- **Drivers:** ${d.drivers.join(', ')}` : null,
    ``,
    d.narrative ? `**What happened:** ${d.narrative}` : null,
    d.lessons ? `\n**Lesson:** ${d.lessons}` : null,
  ].filter(Boolean).join('\n');
}

function patternsTableMd(rows, header) {
  if (!rows.length) return '_No deals logged yet._';
  return [`| ${header} | Won | Lost | Win rate |`, `|---|---|---|---|`, ...rows.map((r) => `| ${r.label} | ${r.won} | ${r.lost} | ${fmtPct(r.rate)} |`)].join('\n');
}

function ledgerMd(state) {
  const bySource = groupStats(state.deals, (d) => SOURCES[d.source].label);
  const bySegment = groupStats(state.deals, (d) => SEGMENTS[d.segment].label);
  const byCompetitor = groupStats(state.deals, (d) => d.competitor, 'No competitor named');
  const won = state.deals.filter((d) => d.outcome === 'won').length;
  const total = state.deals.length;
  return [
    `# Win/Loss Ledger`,
    ``,
    `_${total} deals logged · ${won} won · ${total - won} lost · ${fmtPct(total ? won / total : null)} win rate · exported ${todayISO()}_`,
    ``,
    `## Pattern dashboard`,
    ``,
    `**Win rate by source**`, ``, patternsTableMd(bySource, 'Source'), ``,
    `**Win rate by segment**`, ``, patternsTableMd(bySegment, 'Segment'), ``,
    `**Win rate by competitor**`, ``, patternsTableMd(byCompetitor, 'Competitor'), ``,
    `## Lessons board`,
    ``,
    state.lessons.length ? state.lessons.map((l) => `- **[${l.tag}]** ${l.text}${l.source ? ` _(from ${l.source})_` : ''}`).join('\n') : '_No pinned lessons yet._',
    ``,
    `## Deal log`,
    ``,
    state.deals.length ? state.deals.map(dealMd).join('\n\n---\n\n') : '_No deals logged yet._',
  ].join('\n');
}

function ledgerCsv(state) {
  const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const rows = [['code', 'account', 'deal_name', 'outcome', 'close_date', 'value', 'segment', 'source', 'competitor', 'price_factor', 'drivers', 'rep'].join(',')];
  for (const d of state.deals) {
    rows.push([esc(d.code), esc(d.account), esc(d.dealName), d.outcome, d.closeDate, d.value, SEGMENTS[d.segment].label, SOURCES[d.source].label,
      esc(d.competitor), d.priceFactor ? PRICE_FACTORS[d.priceFactor].label : '', esc(d.drivers.join('; ')), esc(d.rep)].join(','));
  }
  return rows.join('\n');
}

/* ================= copilot prompts ================= */

function promptInterview(deal) {
  const win = deal.outcome === 'won';
  return [
    `You are an experienced win/loss interviewer — the kind revenue teams hire specifically to get past polite answers and find the real reason a deal went the way it did.`,
    ``,
    `Here is the closed deal you're about to investigate:`,
    ``,
    dealMd(deal),
    ``,
    `## Your task`,
    `Write a ${win ? 'win' : 'loss'} interview script I can run, by phone or async, with ${win ? 'the buyer (or, if they decline, with my internal deal team as a reconstruction)' : "the buyer (or, if they won't talk to a vendor they rejected, with my internal deal team)"}.`,
    ``,
    `Requirements:`,
    `- 12–16 questions across these phases, in this order: Opening & rapport, Decision process & stakeholders, Product/fit, Competitive landscape, Price & value, Relationship & trust, Closing & ${win ? 'referral ask' : 'door-left-open ask'}.`,
    `- Mix open-ended questions with 2–3 calibrated "how/what" probes that surface what my notes above can't already tell me.`,
    `- Do not ask about facts already stated above — dig into WHY, not WHAT.`,
    `- Add one short coaching note under each phase on how to keep the interviewee talking without them getting defensive.`,
    `- End with a short, send-ready outreach message to book this interview.`,
    ``,
    `Format as markdown with the phases as headers.`,
  ].join('\n');
}

function promptPatterns(state) {
  const bySource = groupStats(state.deals, (d) => SOURCES[d.source].label);
  const bySegment = groupStats(state.deals, (d) => SEGMENTS[d.segment].label);
  const byCompetitor = groupStats(state.deals, (d) => d.competitor, 'No competitor named');
  return [
    `You are a win/loss analyst for a B2B revenue team. I keep a structured ledger of every closed deal with outcome, source, segment, competitor, price factor, and drivers.`,
    ``,
    `## Computed win rates (I've already done the arithmetic — interpret, don't recompute)`,
    ``,
    `**By source**`, ``, patternsTableMd(bySource, 'Source'), ``,
    `**By segment**`, ``, patternsTableMd(bySegment, 'Segment'), ``,
    `**By competitor**`, ``, patternsTableMd(byCompetitor, 'Competitor'), ``,
    `## Full deal log`,
    ``,
    state.deals.length ? state.deals.map(dealMd).join('\n\n---\n\n') : '_No deals logged yet._',
    ``,
    `## Already-pinned lessons`,
    state.lessons.length ? state.lessons.map((l) => `- [${l.tag}] ${l.text}`).join('\n') : '_None pinned yet._',
    ``,
    `## Your task`,
    `1. **Strongest patterns** — the 3–5 patterns that most explain why we win and why we lose. Cite deal codes as evidence.`,
    `2. **Signal vs. noise** — flag any pattern built on a thin sample (under 4–5 deals) as directional, not proven.`,
    `3. **What's already known** — note where a pattern just restates a pinned lesson above; don't repeat it as new.`,
    `4. **Three actions** — concrete, doable this quarter, each tied to a specific pattern above.`,
    ``,
    `Format with those four numbered headings. No hedging filler.`,
  ].join('\n');
}

function promptQuarterly(qKey, qDeals, qStats) {
  return [
    `You are a business development leader preparing a quarterly win/loss readout for company leadership. Be honest, specific, and confident — no hedging filler.`,
    ``,
    `## Quarter: ${qKey}`,
    ``,
    `- Deals closed: ${qStats.total} (${qStats.won} won / ${qStats.lost} lost) — ${fmtPct(qStats.rate)} win rate`,
    `- Value won: ${fmtMoney(qStats.wonValue)} · Value lost: ${fmtMoney(qStats.lostValue)} · Avg deal size: ${fmtMoney(qStats.avgValue)}`,
    qStats.topWinDriver ? `- Most common win driver: ${qStats.topWinDriver.label} (${qStats.topWinDriver.n} deals)` : null,
    qStats.topLossDriver ? `- Most common loss driver: ${qStats.topLossDriver.label} (${qStats.topLossDriver.n} deals)` : null,
    qStats.topCompetitor ? `- Most-faced competitor: ${qStats.topCompetitor.label} (${qStats.topCompetitor.n} deals)` : null,
    ``,
    `## This quarter's deals`,
    ``,
    qDeals.length ? qDeals.map(dealMd).join('\n\n---\n\n') : '_No deals closed this quarter._',
    ``,
    `## Your task`,
    `Write "${qKey} Win/Loss Readout" as a polished markdown document ready to paste into a doc or slide:`,
    `1. **Executive summary** — 3 sentences, headline number first.`,
    `2. **Headline metrics** — the numbers above, framed clearly with one comparison if you can reasonably infer it.`,
    `3. **What worked** — top win drivers, told as a pattern, not a list.`,
    `4. **What cost us deals** — top loss drivers and the competitive picture, told straight.`,
    `5. **Two notable deals** — one win, one loss, each in 2–3 sentences with the lesson.`,
    `6. **Recommended bets for next quarter** — 3 concrete moves, each tied to evidence above.`,
  ].filter(Boolean).join('\n');
}

/* ================= small components ================= */

function Btn({ children, onClick, kind = 'ghost', title, ariaLabel, className = '', disabled }) {
  const kinds = {
    primary: 'bg-inkdark text-paper hover:bg-visor shadow-[2px_2px_0_rgba(16,26,21,0.28)]',
    accent: 'bg-gold text-inkdark hover:brightness-95 shadow-[2px_2px_0_rgba(16,26,21,0.3)] font-semibold',
    ghost: 'bg-card/80 text-ink border border-rule hover:border-visor hover:bg-card',
    danger: 'bg-card/80 text-loss border border-loss/40 hover:bg-loss/10',
  };
  return (
    <button type="button" onClick={onClick} title={title} aria-label={ariaLabel} disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-40 ${kinds[kind]} ${className}`}>
      {children}
    </button>
  );
}

function SpecTag({ children, color = C.pencil }) {
  return (
    <span className="specimen-label inline-flex items-center rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ borderColor: color + '66', color, background: color + '0d' }}>
      {children}
    </span>
  );
}

function StampBadge({ outcome }) {
  const won = outcome === 'won';
  return (
    <span className="stamp inline-block px-2 py-0.5 text-[11px] font-bold" style={{ color: won ? C.win : C.loss }}>
      {won ? 'WON' : 'LOST'}
    </span>
  );
}

/* ---- signature hero graphic: an open, ruled, audited ledger ---- */
function HeroFigure({ won, lost }) {
  const total = won + lost;
  const rate = total ? won / total : null;
  const auditColor = rate == null ? C.pencil : rate >= 0.5 ? C.win : C.loss;
  const rows = 7;
  return (
    <svg viewBox="0 0 380 224" className="w-full max-w-[400px]" role="img"
      aria-label={`Figure: open ledger, ${total} deals audited, ${fmtPct(rate)} win rate`}>
      <rect x="8" y="10" width="364" height="196" rx="4" fill={C.paperDeep} stroke={C.ink} strokeWidth="1.6" />
      <rect x="14" y="16" width="168" height="184" rx="2" fill={C.paper} />
      <rect x="198" y="16" width="168" height="184" rx="2" fill={C.card} />
      <rect x="182" y="10" width="16" height="196" fill={C.ink} opacity="0.9" />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={'s' + i} x1="182" x2="198" y1={20 + i * 21} y2={20 + i * 21} stroke={C.paper} strokeWidth="1.4" opacity="0.5" />
      ))}
      {Array.from({ length: rows }, (_, i) => (
        <g key={'l' + i}>
          <line x1="22" x2="174" y1={38 + i * 22} y2={38 + i * 22} stroke={C.rule} strokeWidth="1.1" />
          <line x1="206" x2="358" y1={38 + i * 22} y2={38 + i * 22} stroke={C.rule} strokeWidth="1.1" />
        </g>
      ))}
      <line x1="40" y1="20" x2="40" y2="200" stroke={C.loss} strokeWidth="1.3" opacity="0.45" />
      <line x1="224" y1="20" x2="224" y2="200" stroke={C.loss} strokeWidth="1.3" opacity="0.45" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const isWin = i % 3 !== 1;
        const y = 34 + i * 22 + 14;
        return (
          <text key={'n' + i} x="352" y={y} textAnchor="end" fontFamily="IBM Plex Mono, monospace" fontSize="11" fontWeight="600"
            fill={isWin ? C.win : C.loss}>
            {isWin ? `${(1.2 + i * 0.6).toFixed(1)}k` : `(${(0.8 + i * 0.3).toFixed(1)}k)`}
          </text>
        );
      })}
      <g transform="translate(300,168) rotate(-9)">
        <circle r="30" fill="none" stroke={auditColor} strokeWidth="2.4" opacity="0.85" />
        <circle r="24" fill="none" stroke={auditColor} strokeWidth="1" opacity="0.5" />
        <text y="-2" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fontWeight="800" letterSpacing="1"
          fill={auditColor}>AUDITED</text>
        <text y="9" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="8" fontWeight="700" fill={auditColor}>
          {fmtPct(rate)} WIN
        </text>
      </g>
      <g transform="translate(46,178) rotate(38)">
        <rect width="70" height="6" rx="2" fill={C.ink} />
        <polygon points="70,0 84,3 70,6" fill={C.gold} />
      </g>
      <text x="22" y="212" fontFamily="IBM Plex Mono, monospace" fontSize="9" letterSpacing="2" fill={C.faint}>
        LEDGER — {total} DEALS CLOSED, {fmtPct(rate)} WIN RATE
      </text>
    </svg>
  );
}

function Sparkline({ series }) {
  const values = series.map((s) => s.rate);
  if (values.length < 2) return <span className="font-mono text-[10px] text-faint">need 2+ months of closed deals</span>;
  const W = 148, H = 34, max = Math.max(...values, 0.05);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * (W - 8) + 4},${H - 4 - (v / max) * (H - 10)}`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[34px] w-[148px]" role="img" aria-label="Win rate trend by month">
      <polyline points={pts.join(' ')} fill="none" stroke={C.visor} strokeWidth="1.8" />
      {pts.map((p, i) => {
        const [cx, cy] = p.split(',');
        return <circle key={i} cx={cx} cy={cy} r={i === pts.length - 1 ? 2.8 : 1.5} fill={i === pts.length - 1 ? C.gold : C.visor} />;
      })}
    </svg>
  );
}

/* radial win-rate dial, semicircle gauge with ticks + emphasized endpoint */
function RateDial({ rate, label = 'WIN RATE', size = 148 }) {
  const cx = size / 2, cy = size * 0.56, r = size / 2 - 20;
  const pct = rate == null ? 0 : Math.max(0, Math.min(1, rate));
  const polarAt = (rad, deg) => { const a = (deg * Math.PI) / 180; return { x: cx + rad * Math.cos(a), y: cy - rad * Math.sin(a) }; };
  const arcPath = (startDeg, endDeg, rad = r) => {
    const s = polarAt(rad, startDeg), e = polarAt(rad, endDeg);
    const large = Math.abs(startDeg - endDeg) > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${rad} ${rad} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  };
  const valueDeg = 180 - pct * 180;
  const color = rate == null ? C.faint : pct >= 0.6 ? C.win : pct < 0.4 ? C.loss : C.gold;
  const end = polarAt(r, valueDeg);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <svg viewBox={`0 0 ${size} ${size * 0.62}`} className="w-full max-w-[180px]" role="img"
      aria-label={`${label}: ${rate == null ? 'no data yet' : fmtPct(pct)}`}>
      <path d={arcPath(180, 0)} fill="none" stroke={C.rule} strokeWidth="10" strokeLinecap="round" />
      <path d={arcPath(180, valueDeg)} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      {ticks.map((t) => {
        const deg = 180 - t * 180;
        const inner = polarAt(r - 8, deg), outer = polarAt(r + 8, deg);
        return <line key={t} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={C.ink} strokeWidth="1.2" opacity="0.35" />;
      })}
      <circle cx={end.x} cy={end.y} r="5.5" fill={color} stroke={C.card} strokeWidth="2" />
      <text x={cx} y={cy - 6} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="24" fontWeight="800" fill={C.ink}>
        {rate == null ? '—' : fmtPct(pct)}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="8.5" letterSpacing="1.5" fill={C.faint}>
        {label}
      </text>
    </svg>
  );
}

/* horizontal win-rate bars for the pattern dashboard */
function RateBarGroup({ title, Icon, rows }) {
  const W = 500, rowH = 32, L = 118, R = 62, topPad = 8, bottomPad = 22;
  const H = topPad + rows.length * rowH + bottomPad;
  const plotW = W - L - R;
  const x = (v) => L + v * plotW;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const colorFor = (r) => (r >= 0.6 ? C.win : r < 0.4 ? C.loss : C.gold);
  return (
    <div>
      <h3 className="specimen-label flex items-center gap-1.5 text-[11px] font-bold text-ink">
        <Icon className="h-3.5 w-3.5 text-visor" aria-hidden /> {title}
      </h3>
      {rows.length === 0 ? (
        <p className="mt-2 font-mono text-[12px] text-faint">No deals in this category yet.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-1.5 w-full" role="img" aria-label={`${title}: win rate by category`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={topPad} y2={topPad + rows.length * rowH - 6} stroke={C.rule} strokeDasharray="2 3" />
              <text x={x(t)} y={H - 6} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill={C.faint}>{Math.round(t * 100)}%</text>
            </g>
          ))}
          {rows.map((row, i) => {
            const y = topPad + i * rowH + rowH / 2 - 4;
            const color = colorFor(row.rate);
            return (
              <g key={row.label}>
                <text x={L - 8} y={y + 4} textAnchor="end" fontSize="11" fontWeight="600" fill={C.ink}>{truncate(row.label, 15)}</text>
                <rect x={L} y={y - 8} width={plotW} height={16} fill={C.paperDeep} rx="2" />
                <rect x={L} y={y - 8} width={Math.max(2, row.rate * plotW)} height={16} fill={color} rx="2" opacity="0.88" />
                <circle cx={x(row.rate)} cy={y} r="3.5" fill={color} stroke={C.card} strokeWidth="1.5" />
                <text x={L + plotW + 8} y={y + 4} fontFamily="IBM Plex Mono, monospace" fontSize="10.5" fontWeight="700" fill={C.ink}>
                  {Math.round(row.rate * 100)}% ·n{row.total}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

/* ================= editor drawer ================= */

const emptyDraft = () => normDeal({ outcome: 'won', closeDate: todayISO() }, 998);

function DriverToggle({ selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {DRIVERS.map((dr) => {
        const on = selected.includes(dr);
        return (
          <button key={dr} type="button" onClick={() => onToggle(dr)} aria-pressed={on}
            className={`rounded-[3px] border px-2 py-1 font-mono text-[10.5px] transition-colors ${on ? 'border-visor bg-visor text-paper' : 'border-rule bg-card text-pencil hover:border-visor'}`}>
            {dr}
          </button>
        );
      })}
    </div>
  );
}

function EditorDrawer({ draft, setDraft, onSave, onClose }) {
  const inputCls = 'mt-1 w-full rounded-sm border border-rule bg-card px-2 py-1.5 text-[13px]';
  const labelCls = 'block text-[11px] font-semibold uppercase tracking-wider text-pencil';
  const toggleDriver = (dr) => setDraft({ ...draft, drivers: draft.drivers.includes(dr) ? draft.drivers.filter((x) => x !== dr) : [...draft.drivers, dr] });
  return (
    <div role="dialog" aria-modal="true" aria-label={draft.id ? 'Edit deal' : 'New deal'}
      className="fixed inset-0 z-40 flex justify-end bg-inkdark/45" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pop-in h-full w-full max-w-xl overflow-y-auto border-l-4 border-gold bg-paper p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="specimen-label text-sm font-bold text-ink">{draft.id ? `Edit ${draft.code}` : 'Post-mortem a closed deal'}</h2>
          <Btn kind="ghost" onClick={onClose} ariaLabel="Close editor"><X className="h-4 w-4" aria-hidden /></Btn>
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex overflow-hidden rounded-sm border border-rule" role="group" aria-label="Outcome">
            {['won', 'lost'].map((o) => (
              <button key={o} type="button" onClick={() => setDraft({ ...draft, outcome: o })}
                className="flex-1 py-2 font-mono text-[13px] font-bold uppercase tracking-wide transition-colors"
                style={o === draft.outcome ? { background: o === 'won' ? C.win : C.loss, color: C.card } : { background: 'transparent', color: C.pencil }}>
                {o}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}>Account
              <input value={draft.account} onChange={(e) => setDraft({ ...draft, account: e.target.value })} placeholder="e.g. Anchor Freight" className={inputCls} />
            </label>
            <label className={labelCls}>Deal / opportunity name
              <input value={draft.dealName} onChange={(e) => setDraft({ ...draft, dealName: e.target.value })} placeholder="e.g. Dock scheduling rollout" className={inputCls} />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className={labelCls}>Close date
              <input type="date" value={draft.closeDate} onChange={(e) => setDraft({ ...draft, closeDate: e.target.value })} className={`${inputCls} font-mono`} />
            </label>
            <label className={labelCls}>Deal value ($)
              <input type="number" min="0" value={draft.value} onChange={(e) => setDraft({ ...draft, value: Math.max(0, Math.round(Number(e.target.value) || 0)) })} className={`${inputCls} font-mono`} />
            </label>
            <label className={labelCls}>Rep
              <input value={draft.rep} onChange={(e) => setDraft({ ...draft, rep: e.target.value })} placeholder="optional" className={inputCls} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className={labelCls}>Segment
              <select value={draft.segment} onChange={(e) => setDraft({ ...draft, segment: e.target.value })} className={`${inputCls} font-mono`}>
                {Object.entries(SEGMENTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
            </label>
            <label className={labelCls}>Source
              <select value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} className={`${inputCls} font-mono`}>
                {Object.entries(SOURCES).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
            </label>
            <label className={`${labelCls} col-span-2 sm:col-span-1`}>Price factor
              <select value={draft.priceFactor} onChange={(e) => setDraft({ ...draft, priceFactor: e.target.value })} className={`${inputCls} font-mono`}>
                <option value="">Not recorded</option>
                {Object.entries(PRICE_FACTORS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
              </select>
            </label>
          </div>
          <label className={labelCls}>Competitor (leave blank if none)
            <input value={draft.competitor} onChange={(e) => setDraft({ ...draft, competitor: e.target.value })} placeholder="e.g. FreightPilot, In-house build, No decision" className={inputCls} />
          </label>
          <div>
            <p className={labelCls}>Drivers (select all that apply)</p>
            <div className="mt-1"><DriverToggle selected={draft.drivers} onToggle={toggleDriver} /></div>
          </div>
          <label className={labelCls}>What happened
            <textarea value={draft.narrative} onChange={(e) => setDraft({ ...draft, narrative: e.target.value })} rows={3}
              placeholder="The honest account: what moved this deal, what stalled it, who mattered."
              className={`${inputCls} resize-y leading-relaxed`} />
          </label>
          <label className={labelCls}>Lesson (one sharp sentence)
            <textarea value={draft.lessons} onChange={(e) => setDraft({ ...draft, lessons: e.target.value })} rows={2}
              placeholder="What does this deal PROVE that changes how we sell? Leave blank if not decided yet."
              className={`${inputCls} resize-y leading-relaxed`} />
          </label>
          <div className="flex justify-end gap-2 pb-6 pt-2">
            <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
            <Btn kind="primary" onClick={onSave}><CheckCircle2 className="h-4 w-4" aria-hidden /> Save entry</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= deal card ================= */

function DealCard({ deal, onEdit, onDelete, onPin, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const seg = SEGMENTS[deal.segment], src = SOURCES[deal.source], pf = PRICE_FACTORS[deal.priceFactor];
  const won = deal.outcome === 'won';
  return (
    <article className="ledger-row relative rounded-sm border border-rule/80 p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StampBadge outcome={deal.outcome} />
          <span className="specimen-label text-[11px] font-bold text-pencil">{deal.code}</span>
          <span className="font-mono text-[11px] text-faint">{deal.closeDate}</span>
          <SpecTag color={seg.tint}>{seg.label}</SpecTag>
          <SpecTag color={src.tint}>{src.label}</SpecTag>
        </div>
        <div className="no-print flex gap-1">
          <Btn kind="ghost" onClick={() => setOpen(!open)} ariaLabel={open ? 'Collapse entry' : 'Expand entry'} className="!px-1.5">
            {open ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
          </Btn>
          <Btn kind="ghost" onClick={onEdit} ariaLabel={`Edit ${deal.code}`} className="!px-1.5"><Pencil className="h-4 w-4" aria-hidden /></Btn>
          <Btn kind="danger" onClick={onDelete} ariaLabel={`Delete ${deal.code}`} className="!px-1.5"><Trash2 className="h-4 w-4" aria-hidden /></Btn>
        </div>
      </header>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[17px] font-extrabold leading-snug tracking-tight">
          {deal.account}{deal.dealName ? <span className="font-normal text-pencil"> — {deal.dealName}</span> : null}
        </h3>
        <span className="font-mono text-[19px] font-bold tabular-nums" style={{ color: won ? C.win : C.loss }}>
          {won ? fmtMoney(deal.value) : `(${fmtMoney(deal.value)})`}
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11.5px] text-pencil">
        <span className="inline-flex items-center gap-1"><Swords className="h-3 w-3" aria-hidden /> vs. <b className="text-ink">{deal.competitor || 'no competitor named'}</b></span>
        {pf && <SpecTag color={pf.tint}>{pf.label}</SpecTag>}
        {deal.rep && <span>rep: {deal.rep}</span>}
      </div>

      {deal.drivers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {deal.drivers.map((dr) => (
            <span key={dr} className="rounded-[3px] border border-rule bg-paper-deep/70 px-1.5 py-0.5 font-mono text-[10px] text-pencil">{dr}</span>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-3 space-y-2 border-t border-dashed border-rule pt-2">
          {deal.narrative ? (
            <p className="text-[13px] leading-relaxed text-ink/90">{deal.narrative}</p>
          ) : (
            <p className="text-[13px] italic text-faint">No narrative recorded.</p>
          )}
          {deal.lessons ? (
            <div className="rounded-sm border border-gold/40 bg-gold/10 p-2.5">
              <p className="specimen-label flex items-center gap-1 text-[10px] font-bold" style={{ color: C.gold }}>
                <MessageSquareQuote className="h-3.5 w-3.5" aria-hidden /> Lesson
              </p>
              <p className="mt-0.5 text-[13.5px] font-medium leading-snug">{deal.lessons}</p>
              <div className="no-print mt-1.5">
                <Btn kind="ghost" onClick={() => onPin(deal)} className="!text-[12px]"><Pin className="h-3.5 w-3.5" aria-hidden /> Pin to lessons board</Btn>
              </div>
            </div>
          ) : (
            <p className="text-[13px] italic text-faint">No lesson recorded yet — edit this entry and write one; a closed deal without a lesson is just a number.</p>
          )}
        </div>
      )}
    </article>
  );
}

/* ================= main app ================= */

export default function App() {
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
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [segFilter, setSegFilter] = useState('all');
  const [srcFilter, setSrcFilter] = useState('all');
  const [quarterSel, setQuarterSel] = useState('');
  const [copilotDeal, setCopilotDeal] = useState('');
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

  /* keyboard */
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
      else if (e.key === 'n' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setDraft(emptyDraft()); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        copyText(ledgerMd(stateRef.current)).then((ok) => flash(ok ? 'Ledger copied as Markdown' : 'Copy failed — use Export menu'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flash, markGuideSeen]);

  /* derived: rollup + trend */
  const rollup = useMemo(() => {
    let won = 0, lost = 0, wonValue = 0, lostValue = 0;
    for (const d of state.deals) { if (d.outcome === 'won') { won++; wonValue += d.value; } else { lost++; lostValue += d.value; } }
    const total = won + lost;
    return { total, won, lost, rate: total ? won / total : null, wonValue, lostValue };
  }, [state.deals]);

  const trend = useMemo(() => {
    const byMonth = new Map();
    for (const d of [...state.deals].sort((a, b) => a.closeDate.localeCompare(b.closeDate))) {
      const m = d.closeDate.slice(0, 7);
      if (!byMonth.has(m)) byMonth.set(m, { won: 0, total: 0 });
      const g = byMonth.get(m); g.total++; if (d.outcome === 'won') g.won++;
    }
    return [...byMonth.values()].map((g) => ({ rate: g.won / g.total }));
  }, [state.deals]);

  const bySource = useMemo(() => groupStats(state.deals, (d) => SOURCES[d.source].label), [state.deals]);
  const bySegment = useMemo(() => groupStats(state.deals, (d) => SEGMENTS[d.segment].label), [state.deals]);
  const byCompetitor = useMemo(() => groupStats(state.deals, (d) => d.competitor, 'No competitor named'), [state.deals]);

  const quarters = useMemo(() => [...new Set(state.deals.map((d) => quarterKey(d.closeDate)))].sort().reverse(), [state.deals]);
  const activeQuarter = quarterSel && quarters.includes(quarterSel) ? quarterSel : (quarters[0] || quarterKey(todayISO()));
  const quarterDeals = useMemo(() => state.deals.filter((d) => quarterKey(d.closeDate) === activeQuarter), [state.deals, activeQuarter]);
  const quarterStats = useMemo(() => {
    let won = 0, lost = 0, wonValue = 0, lostValue = 0;
    for (const d of quarterDeals) { if (d.outcome === 'won') { won++; wonValue += d.value; } else { lost++; lostValue += d.value; } }
    const total = won + lost;
    return {
      total, won, lost, rate: total ? won / total : null, wonValue, lostValue,
      avgValue: total ? Math.round((wonValue + lostValue) / total) : 0,
      topWinDriver: topDriverFor(quarterDeals, 'won'), topLossDriver: topDriverFor(quarterDeals, 'lost'),
      topCompetitor: topCompetitorFor(quarterDeals),
    };
  }, [quarterDeals]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.deals.filter((d) =>
      (outcomeFilter === 'all' || d.outcome === outcomeFilter) &&
      (segFilter === 'all' || d.segment === segFilter) &&
      (srcFilter === 'all' || d.source === srcFilter) &&
      (!q || [d.account, d.dealName, d.competitor, d.narrative, d.lessons, d.rep, ...d.drivers].join(' ').toLowerCase().includes(q)));
  }, [state.deals, query, outcomeFilter, segFilter, srcFilter]);

  /* actions */
  const saveDraft = () => {
    const clean = normDeal(draft, state.deals.length);
    setState((s) => {
      const exists = s.deals.some((d) => d.id === clean.id);
      return { ...s, deals: exists ? s.deals.map((d) => (d.id === clean.id ? clean : d)) : [clean, ...s.deals] };
    });
    setDraft(null);
    flash('Entry saved to the ledger');
  };

  const deleteDeal = (deal) => {
    const idx = state.deals.findIndex((d) => d.id === deal.id);
    setState((s) => ({ ...s, deals: s.deals.filter((d) => d.id !== deal.id) }));
    flash(`Deleted ${deal.code}`, () => {
      setState((s) => { const arr = [...s.deals]; arr.splice(Math.min(idx, arr.length), 0, deal); return { ...s, deals: arr }; });
      setToast(null);
    });
  };

  const pinLesson = (deal) => {
    if (!deal.lessons.trim()) return;
    if (state.lessons.some((l) => l.source === deal.code && l.text === deal.lessons)) { flash('Already pinned'); return; }
    setState((s) => ({
      ...s,
      lessons: [{ id: uid(), text: deal.lessons, tag: deal.outcome === 'won' ? 'win' : 'loss', source: deal.code, date: todayISO() }, ...s.lessons],
    }));
    flash('Pinned to the lessons board');
  };

  const deleteLesson = (ins) => {
    setState((s) => ({ ...s, lessons: s.lessons.filter((l) => l.id !== ins.id) }));
    flash('Lesson removed', () => {
      setState((s) => ({ ...s, lessons: [ins, ...s.lessons] }));
      setToast(null);
    });
  };

  const importJson = (file) => {
    const rd = new FileReader();
    rd.onload = () => {
      const next = normalize(rd.result);
      if (!next.deals.length && !next.lessons.length) { flash('Import failed — not a ledger file'); return; }
      setState({ ...next, seenGuide: true });
      flash(`Imported ${next.deals.length} deals`);
    };
    rd.readAsText(file);
  };

  const copilotActions = [
    {
      id: 'interview', title: 'Run a win/loss interview script', Icon: MessageSquareQuote,
      desc: 'Pick a closed deal; Claude writes a phased interview script tailored to what you already know and don’t.',
      build: () => { const d = state.deals.find((x) => x.id === copilotDeal) || state.deals[0]; return d ? promptInterview(d) : ''; },
      disabled: !state.deals.length,
    },
    {
      id: 'patterns', title: 'Find patterns across my entries', Icon: Filter,
      desc: 'Sends your full ledger and computed win rates; Claude surfaces the strongest patterns and three actions.',
      build: () => promptPatterns(state), disabled: !state.deals.length,
    },
    {
      id: 'quarterly', title: 'Write the quarterly readout', Icon: CalendarRange,
      desc: `Compiles the ${activeQuarter} deals and stats into a leadership-ready readout document.`,
      build: () => promptQuarterly(activeQuarter, quarterDeals, quarterStats), disabled: !quarterDeals.length,
    },
  ];

  const copyPrompt = (a) => {
    const p = a.build();
    if (!p) { flash('Log a deal first'); return; }
    copyText(p).then((ok) => flash(ok ? 'Prompt copied — paste into claude.ai' : 'Copy failed'));
  };

  const inputCls = 'rounded-sm border border-rule bg-card px-2 py-1.5 text-[13px]';

  return (
    <div className="grain min-h-screen">
      <div className="margin-rule" aria-hidden />
      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-8 lg:px-12">

        {/* ============ header ============ */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <svg viewBox="0 0 44 44" className="mt-1 h-11 w-11 shrink-0" role="img" aria-label="Win/Loss Ledger mark: an audited ledger page">
              <rect x="7" y="4" width="30" height="36" rx="2" fill={C.card} stroke={C.ink} strokeWidth="2" />
              <path d="M29 4v8l-8-4z" fill={C.visor} stroke={C.ink} strokeWidth="1.4" strokeLinejoin="round" />
              {[12, 17, 22, 27, 32].map((y) => <line key={y} x1="11" y1={y} x2="33" y2={y} stroke={C.rule} strokeWidth="1.4" />)}
              <line x1="15" y1="9" x2="15" y2="37" stroke={C.loss} strokeWidth="1.3" opacity="0.55" />
              <circle cx="30" cy="32" r="5.5" fill="none" stroke={C.gold} strokeWidth="1.6" />
              <path d="M27.6 32.2l1.6 1.6 3-3.4" fill="none" stroke={C.gold} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <h1 className="text-[26px] font-extrabold leading-none tracking-tight">
                <span style={{ color: C.win }}>Win</span><span className="font-mono text-pencil">/</span><span style={{ color: C.loss }}>Loss</span> Ledger
              </h1>
              <p className="mt-1 text-[13.5px] text-pencil">Learn from every closed deal — <span className="hilite font-semibold">post-mortem it, find the pattern, promote the lesson</span>.</p>
            </div>
          </div>
          <nav className="no-print flex flex-wrap items-center gap-2" aria-label="Primary actions">
            <Btn kind="ghost" onClick={() => { setState({ ...DEMO, seenGuide: true }); flash('Demo ledger loaded'); }}>
              <Stamp className="h-4 w-4" aria-hidden /> Load demo
            </Btn>
            <Btn kind="ghost" onClick={() => setResetOpen(true)}><RotateCcw className="h-4 w-4" aria-hidden /> Reset</Btn>
            <Btn kind="ghost" onClick={() => setHelpOpen(true)}><HelpCircle className="h-4 w-4" aria-hidden /> How to use</Btn>
            <div className="relative">
              <Btn kind="primary" onClick={() => setExportOpen((v) => !v)}><Download className="h-4 w-4" aria-hidden /> Export <ChevronDown className="h-3.5 w-3.5" aria-hidden /></Btn>
              {exportOpen && (
                <div role="menu" aria-label="Export options" className="pop-in absolute right-0 z-30 mt-1 w-56 rounded-sm border border-rule bg-card p-1 shadow-xl">
                  {[
                    { Icon: FileText, label: 'Copy ledger as Markdown', act: () => copyText(ledgerMd(state)).then((ok) => flash(ok ? 'Ledger copied as Markdown' : 'Copy failed')) },
                    { Icon: FileJson, label: 'Download JSON (full state)', act: () => download('win-loss-ledger.json', JSON.stringify(state, null, 2), 'application/json') },
                    { Icon: Table2, label: 'Download CSV (deal log)', act: () => download('win-loss-ledger.csv', ledgerCsv(state), 'text/csv') },
                    { Icon: Upload, label: 'Import JSON…', act: () => fileRef.current?.click() },
                  ].map((m) => (
                    <button key={m.label} type="button" role="menuitem" onClick={() => { setExportOpen(false); m.act(); }}
                      className="flex w-full items-center gap-2 rounded-[3px] px-2 py-1.5 text-left text-[13px] hover:bg-gold/10">
                      <m.Icon className="h-4 w-4 text-pencil" aria-hidden /> {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Import ledger JSON file"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
          </nav>
        </header>

        {/* ============ hero ledger band ============ */}
        <section className="mt-6 grid items-center gap-5 rounded-sm border border-rule bg-card/70 p-4 shadow-[0_10px_30px_-18px_rgba(16,26,21,0.4)] md:grid-cols-[1fr_auto]" aria-label="Ledger summary">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {[
              ['Deals closed', rollup.total, ''],
              ['Win rate', fmtPct(rollup.rate), `${rollup.won} won · ${rollup.lost} lost`],
              ['Value won', fmtMoney(rollup.wonValue), 'credit'],
              ['Value lost', `(${fmtMoney(rollup.lostValue)})`, 'debit'],
            ].map(([label, value, sub]) => (
              <div key={label}>
                <p className="specimen-label text-[10px] font-bold text-pencil">{label}</p>
                <p className="font-mono text-[26px] font-semibold leading-tight tabular-nums text-ink">{value}</p>
                {sub && <p className="font-mono text-[10px] text-faint">{sub}</p>}
              </div>
            ))}
            <div className="col-span-2 sm:col-span-4">
              <p className="specimen-label text-[10px] font-bold text-pencil">Win rate by month, closed deals</p>
              <Sparkline series={trend} />
            </div>
          </div>
          <div className="no-print hidden md:block"><HeroFigure won={rollup.won} lost={rollup.lost} /></div>
        </section>

        {/* ============ pattern dashboard ============ */}
        <section className="mt-6 rounded-sm border border-rule bg-card/70 p-4 shadow-[0_8px_24px_-16px_rgba(16,26,21,0.3)]" aria-label="Pattern dashboard">
          <h2 className="specimen-label text-[12px] font-bold text-ink">Pattern dashboard</h2>
          <p className="mt-1 text-[11.5px] leading-snug text-pencil">Win rate broken out three ways. Green reads ≥60%, gold reads a coin-flip, red reads ≤40%.</p>
          {state.deals.length === 0 ? (
            <p className="mt-3 font-mono text-[13px] text-faint">Log your first closed deal to start seeing patterns.</p>
          ) : (
            <div className="mt-3 grid gap-6 lg:grid-cols-3">
              <RateBarGroup title="By source" Icon={Filter} rows={bySource} />
              <RateBarGroup title="By segment" Icon={Building2} rows={bySegment} />
              <RateBarGroup title="By competitor" Icon={Swords} rows={byCompetitor} />
            </div>
          )}
        </section>

        {/* ============ workbench grid ============ */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">

          {/* --- deal log --- */}
          <section aria-label="Deal log">
            <div className="no-print flex flex-wrap items-center gap-2">
              <h2 className="specimen-label mr-auto flex items-center gap-1.5 text-[12px] font-bold text-ink"><Receipt className="h-3.5 w-3.5" aria-hidden /> Deal log</h2>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" aria-hidden />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search deals…" aria-label="Search deals"
                  className={`${inputCls} w-36 pl-7 font-mono text-[12px]`} />
              </div>
              <div className="flex overflow-hidden rounded-sm border border-rule" role="group" aria-label="Filter by outcome">
                {['all', 'won', 'lost'].map((s) => (
                  <button key={s} type="button" onClick={() => setOutcomeFilter(s)}
                    className={`px-2.5 py-1.5 font-mono text-[12px] ${outcomeFilter === s ? 'bg-inkdark text-paper' : 'bg-card text-pencil hover:text-ink'}`}>
                    {s}
                  </button>
                ))}
              </div>
              <select value={segFilter} onChange={(e) => setSegFilter(e.target.value)} aria-label="Filter by segment" className={`${inputCls} font-mono text-[12px]`}>
                <option value="all">all segments</option>
                {Object.entries(SEGMENTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
              <select value={srcFilter} onChange={(e) => setSrcFilter(e.target.value)} aria-label="Filter by source" className={`${inputCls} font-mono text-[12px]`}>
                <option value="all">all sources</option>
                {Object.entries(SOURCES).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
              <Btn kind="accent" onClick={() => setDraft(emptyDraft())}><Plus className="h-4 w-4" aria-hidden /> New entry</Btn>
            </div>

            <div className="mt-4 space-y-4">
              {filtered.length === 0 && state.deals.length === 0 && (
                <div className="ledger-row relative rounded-sm border border-dashed border-pencil/50 p-8 text-center">
                  <Landmark className="mx-auto h-8 w-8 text-pencil" aria-hidden />
                  <h3 className="mt-3 text-lg font-extrabold">The ledger is empty</h3>
                  <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-pencil">
                    Every closed deal, won or lost, has a lesson in it — if you write it down before the memory fades.
                    Log the outcome, the competitor, the price factor and the drivers, and let the pattern dashboard
                    show you what your gut has been missing.
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Btn kind="accent" onClick={() => setDraft(emptyDraft())}><Plus className="h-4 w-4" aria-hidden /> Log first deal</Btn>
                    <Btn kind="ghost" onClick={() => { setState({ ...DEMO, seenGuide: true }); flash('Demo ledger loaded'); }}>
                      <Stamp className="h-4 w-4" aria-hidden /> See a worked ledger
                    </Btn>
                  </div>
                </div>
              )}
              {filtered.length === 0 && state.deals.length > 0 && (
                <p className="p-6 text-center font-mono text-[13px] text-pencil">No entries match this filter — clear the search or widen the filters.</p>
              )}
              {filtered.map((d, i) => (
                <DealCard key={d.id} deal={d} defaultOpen={i === 0}
                  onEdit={() => setDraft(JSON.parse(JSON.stringify(d)))}
                  onDelete={() => deleteDeal(d)}
                  onPin={pinLesson}
                />
              ))}
            </div>
          </section>

          {/* --- right rail --- */}
          <aside className="space-y-6">
            {/* quarter summary */}
            <section aria-label="Quarter summary" className="rounded-sm border border-rule bg-card/80 p-4 shadow-[0_8px_24px_-16px_rgba(16,26,21,0.35)]">
              <div className="flex items-center justify-between gap-2">
                <h2 className="specimen-label flex items-center gap-1.5 text-[12px] font-bold text-ink"><CalendarRange className="h-4 w-4 text-visor" aria-hidden /> Quarter summary</h2>
                {quarters.length > 0 && (
                  <select value={activeQuarter} onChange={(e) => setQuarterSel(e.target.value)} aria-label="Select quarter" className={`${inputCls} font-mono text-[11px]`}>
                    {quarters.map((q) => <option key={q} value={q}>{q}</option>)}
                  </select>
                )}
              </div>
              {quarterDeals.length === 0 ? (
                <p className="mt-3 font-mono text-[12.5px] text-faint">No deals closed this quarter yet.</p>
              ) : (
                <>
                  <div className="mt-2 flex items-center gap-3">
                    <RateDial rate={quarterStats.rate} />
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div><p className="specimen-label text-[9px] font-bold text-pencil">Deals</p><p className="font-mono text-[16px] font-semibold tabular-nums">{quarterStats.total}</p></div>
                      <div><p className="specimen-label text-[9px] font-bold text-pencil">Avg size</p><p className="font-mono text-[16px] font-semibold tabular-nums">{fmtMoney(quarterStats.avgValue)}</p></div>
                      <div><p className="specimen-label text-[9px] font-bold" style={{ color: C.win }}>Won</p><p className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: C.win }}>{fmtMoney(quarterStats.wonValue)}</p></div>
                      <div><p className="specimen-label text-[9px] font-bold" style={{ color: C.loss }}>Lost</p><p className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: C.loss }}>({fmtMoney(quarterStats.lostValue)})</p></div>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 border-t border-dashed border-rule pt-2 font-mono text-[11px] text-pencil">
                    <p>Top win driver: <b className="text-ink">{quarterStats.topWinDriver ? `${quarterStats.topWinDriver.label} (${quarterStats.topWinDriver.n})` : '—'}</b></p>
                    <p>Top loss driver: <b className="text-ink">{quarterStats.topLossDriver ? `${quarterStats.topLossDriver.label} (${quarterStats.topLossDriver.n})` : '—'}</b></p>
                    <p>Most faced: <b className="text-ink">{quarterStats.topCompetitor ? `${quarterStats.topCompetitor.label} (${quarterStats.topCompetitor.n})` : '—'}</b></p>
                  </div>
                </>
              )}
            </section>

            {/* lessons board */}
            <section aria-label="Lessons board" className="rounded-sm border border-gold/40 bg-gold/10 p-4 shadow-[0_8px_24px_-16px_rgba(169,131,44,0.5)]">
              <h2 className="specimen-label flex items-center gap-1.5 text-[12px] font-bold text-ink">
                <ScrollText className="h-4 w-4" style={{ color: C.gold }} aria-hidden /> Lessons board
              </h2>
              <p className="mt-1 text-[11.5px] leading-snug text-pencil">Only pin what a closed deal actually proved. This board becomes your playbook.</p>
              <ul className="mt-3 space-y-2.5">
                {state.lessons.length === 0 && (
                  <li className="text-[13px] italic text-pencil">Nothing proven yet — write a lesson on a deal, then pin it here.</li>
                )}
                {state.lessons.map((ins) => (
                  <li key={ins.id} className="group relative rounded-sm border border-gold/30 bg-card p-2.5 shadow-sm">
                    <p className="text-[12.5px] font-medium leading-snug">{ins.text}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-faint">[{ins.tag}]{ins.source ? ` · ${ins.source}` : ''} · {ins.date}</p>
                    <button type="button" onClick={() => deleteLesson(ins)} aria-label={`Remove lesson: ${ins.text.slice(0, 40)}`}
                      className="no-print absolute right-1.5 top-1.5 rounded-[3px] p-1 text-faint opacity-0 transition-opacity hover:text-loss focus-visible:opacity-100 group-hover:opacity-100">
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* copilot */}
            <section aria-label="Claude Copilot" className="no-print rounded-sm border border-visor/30 bg-card/80 p-4 shadow-[0_8px_24px_-16px_rgba(20,67,47,0.45)]">
              <h2 className="specimen-label flex items-center gap-1.5 text-[12px] font-bold text-ink">
                <Sparkles className="h-4 w-4 text-visor" aria-hidden /> Claude Copilot — ledger analyst
              </h2>
              <p className="mt-1 text-[11.5px] leading-snug text-pencil">
                Each action builds a complete prompt around your live ledger. Paste into <span className="font-mono">claude.ai</span> — works with the standard $20 Claude subscription, no API key.
              </p>
              <div className="mt-3 space-y-3">
                {copilotActions.map((a) => (
                  <div key={a.id} className="rounded-sm border border-rule bg-paper/60 p-2.5">
                    <p className="flex items-center gap-1.5 text-[13px] font-bold"><a.Icon className="h-4 w-4 text-visor" aria-hidden />{a.title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-pencil">{a.desc}</p>
                    {a.id === 'interview' && state.deals.length > 0 && (
                      <select value={copilotDeal || state.deals[0].id} onChange={(e) => setCopilotDeal(e.target.value)}
                        aria-label="Deal to interview about" className={`${inputCls} mt-1.5 w-full font-mono text-[11px]`}>
                        {state.deals.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.account.slice(0, 34)} ({d.outcome})</option>)}
                      </select>
                    )}
                    <div className="mt-2 flex gap-1.5">
                      <Btn kind="primary" onClick={() => copyPrompt(a)} disabled={a.disabled} className="!py-1 !text-[12px]">
                        <Copy className="h-3.5 w-3.5" aria-hidden /> Copy prompt
                      </Btn>
                      <Btn kind="ghost" onClick={() => setPromptPreview({ title: a.title, text: a.build() })} disabled={a.disabled} className="!py-1 !text-[12px]">
                        Preview
                      </Btn>
                    </div>
                  </div>
                ))}
              </div>
              <label className="mt-3 block">
                <span className="specimen-label flex items-center gap-1.5 text-[10px] font-bold text-pencil">
                  <ClipboardPaste className="h-3.5 w-3.5" aria-hidden /> Claude&apos;s findings (saved with your ledger)
                </span>
                <textarea value={state.copilotNotes} onChange={(e) => setState({ ...state, copilotNotes: e.target.value })}
                  rows={4} placeholder="Paste the useful parts of Claude's answer here…"
                  className="mt-1 w-full resize-y rounded-sm border border-rule bg-card px-2 py-1.5 font-mono text-[12px] leading-relaxed" />
              </label>
            </section>
          </aside>
        </div>

        <footer className="mt-10 border-t border-dashed border-rule pt-3 text-center font-mono text-[10.5px] text-faint">
          Data lives only in this browser (localStorage). Export JSON for backup. Press <kbd className="rounded border border-rule bg-card px-1">?</kbd> for help.
        </footer>
      </main>

      {/* ============ modals ============ */}
      {helpOpen && (
        <div role="dialog" aria-modal="true" aria-label="How to use Win/Loss Ledger"
          className="fixed inset-0 z-50 flex items-center justify-center bg-inkdark/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) markGuideSeen(); }}>
          <div className="pop-in max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-sm border-t-4 border-gold bg-paper p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-extrabold tracking-tight">How to run the ledger</h2>
              <Btn kind="ghost" onClick={markGuideSeen} ariaLabel="Close help"><X className="h-4 w-4" aria-hidden /></Btn>
            </div>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-[13.5px] leading-relaxed">
              <li><b>Load the demo</b> to see a fully-worked ledger, or start clean with <b>New entry</b>.</li>
              <li><b>Post-mortem every closed deal</b> — outcome, segment, source, competitor, price factor, and the drivers that actually decided it.</li>
              <li><b>Write the lesson</b> in one sharp sentence — what does this deal prove that changes how you sell next time?</li>
              <li><b>Read the pattern dashboard.</b> Win rate by source, segment and competitor is computed live from every entry — green reads strong, red reads weak.</li>
              <li><b>Pin proven lessons</b> to the Lessons board. That board is your accumulating playbook.</li>
              <li><b>Check the Quarter summary</b> for the dial, top drivers and most-faced competitor for any quarter you've closed deals in.</li>
              <li><b>Use the Claude Copilot</b> — copy a prompt (your ledger rides along) into claude.ai to run an interview, find patterns, or write the quarterly readout.</li>
              <li><b>Export</b> — Markdown for sharing, JSON for backup, CSV for spreadsheets.</li>
            </ol>
            <h3 className="specimen-label mt-4 flex items-center gap-1.5 text-[11px] font-bold text-pencil"><Keyboard className="h-4 w-4" aria-hidden /> Shortcuts</h3>
            <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[12px]">
              {[['n', 'new entry'], ['?', 'open this guide'], ['Ctrl/Cmd+S', 'copy ledger as Markdown'], ['Esc', 'close any panel']].map(([k, d]) => (
                <p key={k}><kbd className="rounded border border-rule bg-card px-1.5 py-0.5">{k}</kbd> <span className="text-pencil">{d}</span></p>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <Btn kind="accent" onClick={markGuideSeen}>Open the ledger</Btn>
            </div>
          </div>
        </div>
      )}

      {resetOpen && (
        <div role="dialog" aria-modal="true" aria-label="Confirm reset"
          className="fixed inset-0 z-50 flex items-center justify-center bg-inkdark/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setResetOpen(false); }}>
          <div className="pop-in w-full max-w-sm rounded-sm border-t-4 border-loss bg-paper p-5 shadow-2xl">
            <h2 className="flex items-center gap-2 text-lg font-extrabold"><AlertTriangle className="h-5 w-5 text-loss" aria-hidden /> Close the books?</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-pencil">
              This erases every deal and lesson from this browser. Download the JSON first if any of it took real deals to earn.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Btn kind="ghost" onClick={() => download('win-loss-ledger-backup.json', JSON.stringify(state, null, 2), 'application/json')}>
                <FileJson className="h-4 w-4" aria-hidden /> Backup first
              </Btn>
              <Btn kind="ghost" onClick={() => setResetOpen(false)}>Cancel</Btn>
              <Btn kind="danger" onClick={() => { setState(normalize({ seenGuide: true })); setResetOpen(false); flash('Ledger reset'); }}>
                <Trash2 className="h-4 w-4" aria-hidden /> Reset everything
              </Btn>
            </div>
          </div>
        </div>
      )}

      {promptPreview && (
        <div role="dialog" aria-modal="true" aria-label="Prompt preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-inkdark/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setPromptPreview(null); }}>
          <div className="pop-in flex max-h-[86vh] w-full max-w-2xl flex-col rounded-sm border-t-4 border-visor bg-paper p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold">{promptPreview.title}</h2>
              <div className="flex gap-1.5">
                <Btn kind="primary" onClick={() => copyText(promptPreview.text).then((ok) => flash(ok ? 'Prompt copied — paste into claude.ai' : 'Copy failed'))}>
                  <Copy className="h-4 w-4" aria-hidden /> Copy
                </Btn>
                <Btn kind="ghost" onClick={() => setPromptPreview(null)} ariaLabel="Close preview"><X className="h-4 w-4" aria-hidden /></Btn>
              </div>
            </div>
            <pre className="mt-3 flex-1 overflow-y-auto whitespace-pre-wrap rounded-sm border border-rule bg-card p-3 font-mono text-[11.5px] leading-relaxed">{promptPreview.text}</pre>
          </div>
        </div>
      )}

      {draft && <EditorDrawer draft={draft} setDraft={setDraft} onSave={saveDraft} onClose={() => setDraft(null)} />}

      {toast && (
        <div className="toast-in fixed bottom-5 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-sm border border-rule bg-inkdark px-4 py-2.5 text-[13px] text-paper shadow-2xl" role="status">
          {toast.msg}
          {toast.undo && (
            <button type="button" onClick={toast.undo}
              className="inline-flex items-center gap-1 rounded-[3px] bg-gold px-2 py-1 font-semibold text-inkdark hover:brightness-95">
              <Undo2 className="h-3.5 w-3.5" aria-hidden /> Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
