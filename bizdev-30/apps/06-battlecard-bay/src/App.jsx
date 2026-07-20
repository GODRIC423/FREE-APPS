import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Anchor, Radar, Plus, Trash2, ChevronUp, ChevronDown, ChevronLeft, Search,
  Crosshair, Shield, ShieldAlert, Bomb, Swords, ClipboardList, Copy, Check,
  Download, Upload, FileText, HelpCircle, RotateCcw, X, Sparkles, Undo2,
  Target, Flag, Ship, FileDown, Keyboard, BookOpen, AlertTriangle,
} from 'lucide-react';

/* ================================ constants ================================ */

const LS_KEY = 'bizdev:06-battlecard-bay:v1';
const TIERS = [
  { id: 'primary', label: 'Primary threat', short: 'PRI', ring: 0 },
  { id: 'secondary', label: 'Secondary', short: 'SEC', ring: 1 },
  { id: 'watch', label: 'On watch', short: 'WCH', ring: 2 },
];
const OUTCOMES = ['won', 'lost', 'open'];

let _uid = 0;
const uid = () => `${Date.now().toString(36)}-${(_uid++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().slice(0, 10);

/* ================================ normalize ================================ */

const str = (v, fb = '') => (typeof v === 'string' ? v : fb);
const arr = (v) => (Array.isArray(v) ? v : []);

function normItem(it) {
  if (typeof it === 'string') return { id: uid(), text: it };
  return { id: str(it?.id) || uid(), text: str(it?.text) };
}
function normCounter(c) {
  return {
    id: str(c?.id) || uid(),
    objection: str(c?.objection),
    response: str(c?.response),
    proof: str(c?.proof),
  };
}
function normDeal(d) {
  return {
    id: str(d?.id) || uid(),
    name: str(d?.name),
    outcome: OUTCOMES.includes(d?.outcome) ? d.outcome : 'open',
    date: str(d?.date, today()),
    note: str(d?.note),
  };
}
function normCompetitor(c) {
  return {
    id: str(c?.id) || uid(),
    name: str(c?.name, 'Unnamed contact'),
    tagline: str(c?.tagline),
    tier: TIERS.some((t) => t.id === c?.tier) ? c.tier : 'secondary',
    positioning: str(c?.positioning),
    strengths: arr(c?.strengths).map(normItem),
    weaknesses: arr(c?.weaknesses).map(normItem),
    landmines: arr(c?.landmines).map(normItem),
    counters: arr(c?.counters).map(normCounter),
    deals: arr(c?.deals).map(normDeal),
    intel: str(c?.intel),
  };
}

function normalize(raw) {
  let d = raw;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { d = null; } }
  if (!d || typeof d !== 'object') d = {};
  const competitors = arr(d.competitors).map(normCompetitor);
  return {
    competitors,
    selectedId: competitors.some((c) => c.id === d.selectedId) ? d.selectedId : null,
    ourPitch: str(d.ourPitch),
    copilotNotes: str(d.copilotNotes),
    seenGuide: !!d.seenGuide,
  };
}

function loadState() {
  try { return normalize(localStorage.getItem(LS_KEY)); } catch { return normalize(null); }
}

/* ================================ demo data ================================ */

function demoState() {
  const li = (texts) => texts.map((t) => ({ id: uid(), text: t }));
  return normalize({
    ourPitch:
      'We sell Northstar Dispatch — an ops platform that gets mid-market logistics teams off spreadsheets: live driver dispatch, exception alerts, and customer ETAs, deployed in 3 weeks with flat fleet-based pricing.',
    copilotNotes: '',
    seenGuide: true,
    competitors: [
      {
        id: 'atlas', name: 'Atlas Freight OS', tier: 'primary',
        tagline: 'The enterprise incumbent everyone "shortlists by default".',
        positioning:
          'Positions as the safe, end-to-end enterprise suite: TMS + WMS + billing under one roof. Sells to the CFO on consolidation. Typical deal: 12-month contract, per-seat pricing, systems-integrator implementation.',
        strengths: li([
          'Brand gravity — procurement already knows the name, easy internal sell',
          'Breadth: TMS, WMS and billing modules under one contract',
          'Deep EDI catalog for legacy carrier integrations',
          'Analyst-report presence gives them air cover in committee deals',
        ]),
        weaknesses: li([
          'Implementations run 6–9 months with a paid systems integrator',
          'Per-seat pricing creeps hard once dispatch + drivers + CS all need logins',
          'Mobile driver app is a wrapped web view — crews revolt in the field',
          'Feature requests route through an annual release cycle',
        ]),
        landmines: li([
          'Ask them to put year-2 total cost at 50 seats in writing — including the integrator.',
          'Ask for three references that went live in under 90 days.',
          'Ask which version of the driver app the demo used, and its App Store rating.',
          'Ask how a custom exception workflow gets built — and who pays for it.',
        ]),
        counters: [
          { objection: '"Atlas is the safe choice — nobody gets fired for buying them."',
            response: 'Safe for procurement is not safe for operations. The risk that kills these projects is a 9-month rollout your dispatchers never adopt. Ask their references how long until first live load.',
            proof: 'Corridor Freight switched to us after a stalled 11-month Atlas rollout; live in 19 days, 94% dispatcher daily-active by week 4.' },
          { objection: '"We want one suite for everything, not another point tool."',
            response: 'You are not buying software categories, you are buying working dispatch. A suite where two modules are mediocre costs more than two tools that are each best-run. We integrate with your WMS today.',
            proof: 'Integration catalog: 40+ live WMS/ERP connectors; median connector go-live 4 days.' },
          { objection: '"Atlas gave us a big first-year discount."',
            response: 'Model year 2. Their discount decays exactly when your seat count grows. Flat fleet-based pricing means adding a dispatcher never triggers a re-negotiation.',
            proof: 'Side-by-side TCO sheet: 50-seat mid-market profile shows 41% lower 3-year cost.' },
        ],
        deals: [
          { name: 'Corridor Freight', outcome: 'won', date: '2026-05-19', note: 'Landmine on year-2 pricing landed in the CFO review.' },
          { name: 'Bluewater Cold Chain', outcome: 'won', date: '2026-04-02', note: 'Driver-app demo head-to-head sealed it.' },
          { name: 'Pallas Logistics', outcome: 'lost', note: 'CIO mandate to consolidate on Atlas suite. Never had a champion in ops.', date: '2026-03-11' },
          { name: 'Harbor & Sons Haulage', outcome: 'won', date: '2026-06-06', note: '90-day go-live guarantee beat their SI quote.' },
          { name: 'Vanguard Interstate', outcome: 'lost', date: '2026-02-14', note: 'Priced out — they only compared year-1 numbers. Fix: send TCO sheet earlier.' },
          { name: 'Keystone Carriers', outcome: 'open', date: '2026-07-08', note: 'In eval. Their SI just quoted the Atlas rollout — waiting for sticker shock.' },
        ],
        intel: 'Q3 note from claude.ai recon: Atlas repositioning around "AI-powered network optimization" at their user conference; expect that phrase in every deck this quarter.',
      },
      {
        id: 'quickhaul', name: 'QuickHaul', tier: 'primary',
        tagline: 'The $99/mo point tool that wins on price and loses on payroll day.',
        positioning:
          'Self-serve dispatch board aimed at owner-operators and small fleets. Sells on price and a slick 10-minute signup. Little sales team; product-led, credit-card checkout.',
        strengths: li([
          'Genuinely fast to start — trial to first dispatch in an afternoon',
          '$99/mo headline price anchors every negotiation',
          'Clean, modern UI that demos well to non-technical buyers',
        ]),
        weaknesses: li([
          'No exception management — everything after "assigned" is a phone call',
          'Caps at ~25 drivers before the board becomes unusable',
          'No SOC 2, no SSO — fails mid-market security review',
          'Support is a chatbot and a subreddit',
        ]),
        landmines: li([
          'Ask them to demo a late-load exception end to end — watch it leave the product.',
          'Ask for their SOC 2 report before the security review starts.',
          'Ask what happens to the board view at 40 drivers across 3 terminals.',
        ]),
        counters: [
          { objection: '"QuickHaul is a tenth of your price."',
            response: 'It is a tenth of the product. Price the phone calls: their board stops at assignment, so every exception is manual. At your volume that is two headcount of firefighting we automate.',
            proof: 'ROI worksheet: 30-driver fleet, 6% exception rate = 340 manual interventions/month recovered.' },
          { objection: '"We can start with QuickHaul and upgrade later."',
            response: 'Migration is the hidden cost. You will re-onboard drivers, rebuild integrations, and re-run security review in 12 months — during your busy season. Start on rails that scale.',
            proof: '3 of our last 10 wins were QuickHaul migrations; average switch cost they reported: 6 weeks of ops time.' },
        ],
        deals: [
          { name: 'Redline Couriers', outcome: 'won', date: '2026-05-30', note: 'Security review disqualified QuickHaul — landmine worked.' },
          { name: 'Metro Freightways', outcome: 'won', date: '2026-04-22', note: 'Exception-demo head-to-head. Their ops lead said "that is my whole day".' },
          { name: 'Sparrow Express', outcome: 'lost', date: '2026-03-28', note: '12 drivers, price-only buyer. Right loss — outside ICP. Flag for 12-month recycle.' },
        ],
        intel: '',
      },
      {
        id: 'meridian', name: 'Meridian TMS', tier: 'secondary',
        tagline: 'Regional legacy player defending install base with loyalty discounts.',
        positioning:
          'On-prem-heritage TMS strong in the Midwest. Sells through long-standing relationships and steep renewal discounts. Cloud version is a lift-and-shift, sold as "Meridian Sky".',
        strengths: li([
          '15-year relationships with regional carrier networks',
          'Will discount renewals 40%+ to keep an account',
          'On-prem option still matters to a few conservative IT shops',
        ]),
        weaknesses: li([
          '"Sky" cloud version is the old product in a browser — same screens, same lag',
          'No public API; integrations are paid professional-services projects',
          'Roadmap has slipped two years running; users notice',
        ]),
        landmines: li([
          'Ask to see the Sky release notes for the last 12 months.',
          'Ask how you would connect a customer-facing ETA feed — and the PS quote for it.',
        ]),
        counters: [
          { objection: '"We have been with Meridian for a decade — switching is painful."',
            response: 'You are not switching from Meridian, you are switching from 2014. Keep what works: we import their load history and run parallel for 30 days, so the team switches only when the new board is already faster.',
            proof: 'Parallel-run playbook: 30-day cutover, zero missed loads across last 6 Meridian migrations.' },
        ],
        deals: [
          { name: 'Great Lakes Transit Co', outcome: 'won', date: '2026-06-17', note: 'Release-notes landmine exposed the stalled roadmap in front of IT.' },
          { name: 'Prairie Line Freight', outcome: 'open', date: '2026-07-01', note: 'Renewal in 60 days. Meridian will discount hard — prep TCO + parallel-run offer.' },
        ],
        intel: '',
      },
      {
        id: 'statusquo', name: 'Spreadsheets + phone calls', tier: 'watch',
        tagline: 'The real competitor in half our deals: doing nothing.',
        positioning:
          'No vendor, no contract, no security review. "The way we have always done it." Wins by inertia whenever we fail to make the cost of the status quo visible and urgent.',
        strengths: li([
          'Zero procurement friction — no decision required',
          'Everyone already knows the spreadsheet',
          'No new software to learn during busy season',
        ]),
        weaknesses: li([
          'Exception handling lives in one dispatcher’s head — bus-factor of one',
          'No customer ETAs means inbound "where is my load?" calls all day',
          'Errors are invisible until a customer churns',
        ]),
        landmines: li([
          'Ask: what happened the last time your senior dispatcher took a two-week vacation?',
          'Ask them to count "where is my truck?" calls for one week. Just count.',
        ]),
        counters: [
          { objection: '"This is not a priority this quarter."',
            response: 'Agreed — a tool is never the priority. Missed loads during peak season are. Peak starts in 9 weeks; a 3-week deployment means deciding now or accepting another peak on spreadsheets.',
            proof: 'Peak-season case: Bluewater cut missed-pickup rate 62% in their first peak on the platform.' },
          { objection: '"Our dispatcher has a system that works."',
            response: 'It works because of her, not the spreadsheet. This makes her system the company’s system — she stops being the single point of failure and starts training the next dispatcher in days, not years.',
            proof: 'Corridor onboarded two junior dispatchers in one week post-rollout.' },
        ],
        deals: [
          { name: 'Ironway Trucking', outcome: 'lost', date: '2026-05-05', note: 'No-decision. Never quantified their inbound call volume. Add the count-the-calls landmine earlier.' },
          { name: 'Cascade Freight Lines', outcome: 'won', date: '2026-06-24', note: 'Vacation-story landmine hit — ops manager lived it in March.' },
        ],
        intel: '',
      },
    ],
    selectedId: 'atlas',
  });
}

/* ============================ derived + serializers ============================ */

function record(c) {
  const won = c.deals.filter((d) => d.outcome === 'won').length;
  const lost = c.deals.filter((d) => d.outcome === 'lost').length;
  const open = c.deals.filter((d) => d.outcome === 'open').length;
  const closed = won + lost;
  return { won, lost, open, closed, rate: closed ? won / closed : null };
}

function fleetRecord(competitors) {
  return competitors.reduce(
    (a, c) => { const r = record(c); a.won += r.won; a.lost += r.lost; a.open += r.open; a.closed += r.closed; return a; },
    { won: 0, lost: 0, open: 0, closed: 0 }
  );
}

const pct = (r) => (r == null ? '—' : `${Math.round(r * 100)}%`);
const tierLabel = (id) => TIERS.find((t) => t.id === id)?.label || id;

function competitorToMarkdown(c) {
  const r = record(c);
  const L = [];
  L.push(`## ${c.name} — ${tierLabel(c.tier)}`);
  if (c.tagline) L.push(`> ${c.tagline}`);
  if (c.positioning) L.push(`\n**Their positioning:** ${c.positioning}`);
  if (c.strengths.length) L.push(`\n### Strengths (respect these)\n${c.strengths.map((s) => `- ${s.text}`).join('\n')}`);
  if (c.weaknesses.length) L.push(`\n### Weaknesses (attack surface)\n${c.weaknesses.map((s) => `- ${s.text}`).join('\n')}`);
  if (c.landmines.length) L.push(`\n### Mines to lay (questions to plant early)\n${c.landmines.map((s) => `- ${s.text}`).join('\n')}`);
  if (c.counters.length) {
    L.push(`\n### Counter-battery (objection -> counter -> proof)`);
    c.counters.forEach((k, i) => {
      L.push(`\n**${i + 1}. Objection:** ${k.objection || '—'}`);
      L.push(`   - **Counter:** ${k.response || '—'}`);
      if (k.proof) L.push(`   - **Proof:** ${k.proof}`);
    });
  }
  if (c.deals.length) {
    L.push(`\n### Engagement log — record ${r.won}W–${r.lost}L${r.open ? ` (${r.open} open)` : ''}, win rate ${pct(r.rate)}`);
    L.push(`| Deal | Outcome | Date | Note |`);
    L.push(`| --- | --- | --- | --- |`);
    c.deals.forEach((d) => L.push(`| ${d.name || '—'} | ${d.outcome} | ${d.date} | ${d.note || ''} |`));
  }
  if (c.intel) L.push(`\n### Intel notes\n${c.intel}`);
  return L.join('\n');
}

function stateToMarkdown(state) {
  const f = fleetRecord(state.competitors);
  const L = [
    `# Battlecard Bay — Fleet Dossier`,
    `_Exported ${today()} · ${state.competitors.length} contacts on scope · fleet record ${f.won}W–${f.lost}L · win rate ${f.closed ? Math.round((f.won / f.closed) * 100) + '%' : '—'}_`,
  ];
  if (state.ourPitch) L.push(`\n**Our pitch:** ${state.ourPitch}`);
  state.competitors.forEach((c) => L.push(`\n---\n\n${competitorToMarkdown(c)}`));
  return L.join('\n');
}

function dealsToCSV(competitors) {
  const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const rows = [['competitor', 'tier', 'deal', 'outcome', 'date', 'note']];
  competitors.forEach((c) => c.deals.forEach((d) => rows.push([c.name, c.tier, d.name, d.outcome, d.date, d.note])));
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}

/* ================================ clipboard ================================ */

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

function downloadFile(name, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ============================ copilot prompt builders ============================ */

function promptRecon(state, c) {
  return `You are a senior competitive-intelligence analyst embedded in a B2B sales team.

## Our context
${state.ourPitch || '(The user has not described their own product yet — ask for it first if needed.)'}

## The competitor to research
Name: ${c.name}
What we believe today:
${competitorToMarkdown(c)}

## Your task
From your knowledge of this market (do not invent facts — say "unverified" where unsure):
1. Reconstruct ${c.name}'s likely public positioning: headline message, target buyer, pricing model signals, and the 3 claims they most likely lead with in a sales cycle.
2. Compare that against our current battlecard above. What are we missing, overstating, or getting wrong?
3. List 5 specific things to verify on their website, pricing page, review sites (G2/Capterra), and job postings — phrased as concrete checks.

## Output format
Markdown with sections: "Their likely positioning", "Gaps in our battlecard", "Verification checklist". Keep each bullet under 25 words so it pastes cleanly into a battlecard.`;
}

function promptCounters(state, c) {
  return `You are a competitive sales strategist who writes counters that respect the buyer's intelligence — no trash talk, no FUD.

## Our context
${state.ourPitch || '(No pitch recorded — infer a reasonable one from the battlecard, and note your assumption.)'}

## Competitor battlecard
${competitorToMarkdown(c)}

## Your task
Generate 5 NEW objection -> counter -> proof rows for ${c.name} that are not already covered above. For each:
- **Objection**: the exact sentence a prospect says (in quotes, realistic voice).
- **Counter**: 2-3 sentences a rep can say verbatim on a live call. Reframe, never attack; concede what is genuinely true.
- **Proof**: the ONE artifact that would make the counter land (case study, worksheet, demo moment, reference call) — if we likely lack it, mark it "TO BUILD".

Then add a short "Landmines" section: 3 questions we should plant early in a deal that ${c.name} will struggle to answer well, phrased so they sound like diligence, not sabotage.

## Output format
Markdown table for the 5 rows (Objection | Counter | Proof), then a bullet list of landmines.`;
}

function promptRoleplay(state, c) {
  return `You are now the top enterprise sales rep at ${c.name}. Stay fully in character until I say "debrief".

## What you (as ${c.name}) know
Your own positioning and strengths, as our team understands them:
${competitorToMarkdown(c)}

## Scenario
We are both finalists at the same prospect. You are on a call with the buying committee right after my demo. You pitch hard, handle my differentiators, and plant doubts about my product:
${state.ourPitch || '(Ask me to describe my product first, then begin.)'}

## Rules of engagement
- Be as good as their best rep actually is: confident, prepared, plausible. Use your real strengths; do not strawman yourself.
- When I respond, push back the way a competitive rep would — including polite FUD and pricing games.
- After I say "debrief", break character and score my performance: what landed, what I fumbled, which of your attacks I left unanswered, and the 3 lines I should have ready next time.

Start the roleplay now with your opening statement to the committee.`;
}

function promptFleetBrief(state) {
  return `You are a revenue strategist reviewing a competitive battlecard system before a new quarter.

## Our context
${state.ourPitch || '(No pitch recorded.)'}

## The full fleet dossier
${stateToMarkdown(state)}

## Your task
1. Read the engagement logs. Which competitor is costing us the most winnable revenue, and what pattern explains the losses?
2. Audit card quality: which battlecards are thin (few counters, no proof points, stale intel) and need work first?
3. Recommend this quarter's competitive priorities: 3 concrete actions (e.g. "build the TCO sheet referenced but missing", "recycle Sparrow Express in Q4"), each tied to evidence from the dossier.
4. Write a 5-line competitive briefing I can paste into my team channel: plain language, one line per competitor, what to say and what to avoid.

## Output format
Markdown sections: "Biggest leak", "Card audit", "This quarter's plays", "Team briefing". Be direct — this is an internal doc.`;
}

const COPILOT_ACTIONS = [
  { id: 'recon', icon: Radar, needsCompetitor: true, title: 'Recon their positioning',
    desc: 'Rebuild the competitor’s public story and find the gaps in your card.', build: (s, c) => promptRecon(s, c) },
  { id: 'counters', icon: Swords, needsCompetitor: true, title: 'Generate counter-battery',
    desc: '5 new objection-counter-proof rows plus landmines to plant.', build: (s, c) => promptCounters(s, c) },
  { id: 'roleplay', icon: Crosshair, needsCompetitor: true, title: 'Wargame: roleplay them',
    desc: 'Claude plays their best rep; you drill live, then get scored.', build: (s, c) => promptRoleplay(s, c) },
  { id: 'brief', icon: Flag, needsCompetitor: false, title: 'Quarterly fleet brief',
    desc: 'Audit every card, find the revenue leak, plan the quarter.', build: (s) => promptFleetBrief(s) },
];

/* ================================ tiny UI atoms ================================ */

function TierFlag({ tier }) {
  const map = {
    primary: 'bg-signal/15 text-signal border-signal/40',
    secondary: 'bg-brass/10 text-brass border-brass/40',
    watch: 'bg-scope/10 text-scope border-scope/30',
  };
  const t = TIERS.find((x) => x.id === tier);
  return (
    <span className={`label-caps inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] ${map[tier]}`}>
      <Flag className="h-2.5 w-2.5" aria-hidden /> {t?.short}
    </span>
  );
}

function WinDial({ rate, size = 92, label }) {
  // semicircular gauge with ticks; rate in [0,1] or null
  const r = 36, cx = 50, cy = 50;
  const a0 = Math.PI, a1 = 0; // left to right
  const arc = (t) => {
    const a = a0 + (a1 - a0) * t;
    return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
  };
  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const a = a0 + (a1 - a0) * (i / 10);
    const inner = i % 5 === 0 ? r - 7 : r - 4;
    ticks.push(
      <line key={i}
        x1={cx + inner * Math.cos(a)} y1={cy - inner * Math.sin(a)}
        x2={cx + r * Math.cos(a)} y2={cy - r * Math.sin(a)}
        stroke={i === 0 || i === 10 ? 'var(--color-chartdim)' : 'var(--color-line)'}
        strokeWidth={i % 5 === 0 ? 2 : 1} />
    );
  }
  const v = rate == null ? 0 : rate;
  const end = arc(v);
  const start = arc(0);
  const needleA = a0 + (a1 - a0) * v;
  return (
    <svg viewBox="0 0 100 62" width={size} height={size * 0.62} role="img"
      aria-label={label || `Win rate ${pct(rate)}`} className="overflow-visible">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--color-linesoft)" strokeWidth="6" />
      {rate != null && v > 0 && (
        <path d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`}
          fill="none" stroke={v >= 0.5 ? 'var(--color-sonar)' : 'var(--color-signal)'} strokeWidth="6" strokeLinecap="round" />
      )}
      {ticks}
      {rate != null && (
        <line x1={cx} y1={cy} x2={cx + (r - 12) * Math.cos(needleA)} y2={cy - (r - 12) * Math.sin(needleA)}
          stroke="var(--color-chart)" strokeWidth="2" strokeLinecap="round" />
      )}
      <circle cx={cx} cy={cy} r="3" fill="var(--color-chart)" />
      <text x={cx} y={cy - 12} textAnchor="middle" fill="var(--color-chart)" stroke="#0a1626" strokeWidth="3"
        style={{ font: '700 13px "Archivo Narrow", sans-serif', paintOrder: 'stroke' }}>{pct(rate)}</text>
    </svg>
  );
}

function RadarScope({ competitors, onPick, selectedId }) {
  const ringR = [62, 108, 152];
  const blips = competitors.map((c, i) => {
    const ring = TIERS.find((t) => t.id === c.tier)?.ring ?? 1;
    const angle = ((i * 137.5 + 25) % 360) * (Math.PI / 180);
    const rr = ringR[ring] + ((i * 29) % 21) - 10;
    return { c, x: 200 + rr * Math.cos(angle), y: 200 + rr * Math.sin(angle) };
  });
  return (
    <svg viewBox="0 0 400 400" className="h-auto w-full max-w-[440px]" role="img" aria-label="Radar scope of tracked competitors">
      <defs>
        <radialGradient id="scopebg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0e2038" />
          <stop offset="78%" stopColor="#0a1830" />
          <stop offset="100%" stopColor="#071022" />
        </radialGradient>
        <linearGradient id="sweepg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(127,212,255,0)" />
          <stop offset="100%" stopColor="rgba(127,212,255,0.28)" />
        </linearGradient>
      </defs>
      <circle cx="200" cy="200" r="182" fill="url(#scopebg)" stroke="var(--color-line)" strokeWidth="2" />
      {/* degree ticks */}
      {Array.from({ length: 72 }, (_, i) => {
        const a = (i * 5 * Math.PI) / 180;
        const big = i % 6 === 0;
        const r1 = big ? 172 : 177;
        return (
          <line key={i} x1={200 + r1 * Math.cos(a)} y1={200 + r1 * Math.sin(a)}
            x2={200 + 182 * Math.cos(a)} y2={200 + 182 * Math.sin(a)}
            stroke={big ? 'var(--color-chartdim)' : 'var(--color-line)'} strokeWidth={big ? 1.5 : 1} />
        );
      })}
      {/* bearing labels */}
      {[0, 90, 180, 270].map((deg) => {
        const a = ((deg - 90) * Math.PI) / 180;
        return (
          <text key={deg} x={200 + 163 * Math.cos(a)} y={200 + 163 * Math.sin(a) + 3}
            textAnchor="middle" fill="var(--color-muted)"
            style={{ font: '700 9px "Archivo Narrow", sans-serif', letterSpacing: '0.1em' }}>
            {String(deg).padStart(3, '0')}
          </text>
        );
      })}
      {ringR.map((r) => (
        <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="var(--color-line)" strokeWidth="1" strokeDasharray="2 4" />
      ))}
      <line x1="18" y1="200" x2="382" y2="200" stroke="var(--color-linesoft)" strokeWidth="1" />
      <line x1="200" y1="18" x2="200" y2="382" stroke="var(--color-linesoft)" strokeWidth="1" />
      {/* ring legend */}
      <text x="204" y="132" fill="var(--color-muted)" style={{ font: '700 8.5px "Archivo Narrow", sans-serif', letterSpacing: '0.12em' }}>PRIMARY</text>
      <text x="204" y="86" fill="var(--color-muted)" style={{ font: '700 8.5px "Archivo Narrow", sans-serif', letterSpacing: '0.12em' }}>SECONDARY</text>
      <text x="204" y="42" fill="var(--color-muted)" style={{ font: '700 8.5px "Archivo Narrow", sans-serif', letterSpacing: '0.12em' }}>WATCH</text>
      {/* sweep */}
      <g className="radar-sweep" style={{ transformOrigin: '200px 200px' }}>
        <path d="M 200 200 L 382 200 A 182 182 0 0 0 361.6 108.9 Z" fill="url(#sweepg)" />
        <line x1="200" y1="200" x2="382" y2="200" stroke="rgba(127,212,255,0.5)" strokeWidth="1.5" />
      </g>
      {/* own ship */}
      <g>
        <path d="M 200 193 L 206 200 L 200 207 L 194 200 Z" fill="var(--color-brass)" />
        <text x="200" y="221" textAnchor="middle" fill="var(--color-brass)" style={{ font: '700 9px "Archivo Narrow", sans-serif', letterSpacing: '0.14em' }}>YOU</text>
      </g>
      {/* blips */}
      {blips.map(({ c, x, y }) => {
        const sel = c.id === selectedId;
        return (
          <g key={c.id} onClick={() => onPick(c.id)} role="button" tabIndex={0} aria-label={`Open battlecard: ${c.name}`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(c.id); } }}
            className="cursor-pointer focus:outline-none" style={{ pointerEvents: 'bounding-box' }}>
            <circle cx={x} cy={y} r="10" fill="rgba(241,60,77,0.12)" className="blip-pulse" />
            <circle cx={x} cy={y} r={sel ? 6 : 4.5} fill="var(--color-signal)" stroke={sel ? 'var(--color-chart)' : '#71121c'} strokeWidth={sel ? 2 : 1} />
            <text x={x} y={y - 10} textAnchor="middle" fill={sel ? 'var(--color-chart)' : 'var(--color-chartdim)'}
              style={{ font: '700 10px "Archivo Narrow", sans-serif', letterSpacing: '0.06em' }}>
              {c.name.length > 20 ? c.name.slice(0, 19) + '…' : c.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 40 40" className="h-10 w-10" role="img" aria-label="Battlecard Bay mark">
        <circle cx="20" cy="20" r="18" fill="#0e2038" stroke="var(--color-line)" strokeWidth="2" />
        <circle cx="20" cy="20" r="11" fill="none" stroke="var(--color-line)" strokeWidth="1" strokeDasharray="2 3" />
        <line x1="20" y1="4" x2="20" y2="36" stroke="var(--color-linesoft)" strokeWidth="1" />
        <line x1="4" y1="20" x2="36" y2="20" stroke="var(--color-linesoft)" strokeWidth="1" />
        <path d="M 20 20 L 34 20 A 14 14 0 0 0 30.5 10.9 Z" fill="rgba(127,212,255,0.3)" />
        <circle cx="27" cy="13" r="3" fill="var(--color-signal)" />
      </svg>
      <div>
        <div className="font-display text-xl font-extrabold leading-none tracking-tight text-chart">
          BATTLECARD <span className="text-signal">BAY</span>
        </div>
        <div className="label-caps mt-1 text-[10px] text-muted">Competitor battlecards that win deals</div>
      </div>
    </div>
  );
}

function IconBtn({ icon: Icon, label, onClick, tone = 'ghost', className = '', children, ...rest }) {
  const tones = {
    ghost: 'border-line bg-hull/60 text-chartdim hover:text-chart hover:border-chartdim/50',
    signal: 'border-signal/60 bg-signal/10 text-signal hover:bg-signal/20',
    brass: 'border-brass/50 bg-brass/10 text-brass hover:bg-brass/20',
    solid: 'border-signal bg-signal text-white hover:bg-signaldeep',
  };
  return (
    <button type="button" onClick={onClick} aria-label={children ? undefined : label} title={label}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-semibold transition-colors ${tones[tone]} ${className}`} {...rest}>
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}{children}
    </button>
  );
}

function Panel({ title, icon: Icon, tone, children, className = '', actions }) {
  return (
    <section className={`rounded-lg border border-line bg-hull/80 shadow-raised backdrop-blur-sm ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-linesoft px-3.5 py-2.5">
          <h3 className={`label-caps flex items-center gap-2 text-xs ${tone === 'signal' ? 'text-signal' : tone === 'brass' ? 'text-brass' : 'text-chartdim'}`}>
            {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />} {title}
          </h3>
          {actions}
        </header>
      )}
      <div className="p-3.5">{children}</div>
    </section>
  );
}

function Modal({ open, onClose, title, icon: Icon, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-abyss/80 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`toast-in relative mt-4 w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-lg border border-line bg-deep shadow-deck`}>
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-display flex items-center gap-2 text-base font-extrabold text-chart">
            {Icon && <Icon className="h-4 w-4 text-signal" aria-hidden />} {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close dialog"
            className="rounded-md border border-line p-1.5 text-chartdim hover:text-chart">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

/* ================================ list editor ================================ */

function ListEditor({ items, onChange, onDelete, placeholder, accent = 'chartdim', bullet: Bullet }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    onChange([...items, { id: uid(), text: t }]);
    setDraft('');
  };
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={it.id} className="group flex items-start gap-2 rounded-md border border-linesoft bg-deep/70 px-2.5 py-2">
            <Bullet className={`mt-1 h-3.5 w-3.5 shrink-0 text-${accent}`} aria-hidden />
            <input value={it.text}
              onChange={(e) => onChange(items.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)))}
              className="min-w-0 flex-1 bg-transparent text-sm text-chart outline-none placeholder:text-muted"
              aria-label="Edit entry" />
            <span className="flex shrink-0 items-center gap-0.5 opacity-40 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"
                className="rounded p-1 text-chartdim hover:text-chart disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" aria-hidden /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down"
                className="rounded p-1 text-chartdim hover:text-chart disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" aria-hidden /></button>
              <button type="button" onClick={() => onDelete(it.id)} aria-label="Delete entry"
                className="rounded p-1 text-chartdim hover:text-signal"><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-md border border-line bg-deep px-2.5 py-1.5 text-sm text-chart outline-none placeholder:text-muted focus:border-scope/60" />
        <IconBtn icon={Plus} label="Add entry" onClick={add} />
      </div>
    </div>
  );
}

/* ================================ App ================================ */

export default function App() {
  const [state, setState] = useState(loadState);
  const [view, setView] = useState('fleet'); // fleet | card
  const [helpOpen, setHelpOpen] = useState(() => !loadStateSeen());
  const [resetOpen, setResetOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [quickDraw, setQuickDraw] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [toast, setToast] = useState(null); // {msg, undo?}
  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const toastTimer = useRef(null);
  const fileRef = useRef(null);
  const exportRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  function loadStateSeen() { try { return normalize(localStorage.getItem(LS_KEY)).seenGuide; } catch { return false; } }

  const selected = state.competitors.find((c) => c.id === state.selectedId) || null;

  /* autosave (debounced) */
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
    }, 350);
    return () => clearTimeout(t);
  }, [state]);

  /* toast helper */
  const showToast = useCallback((msg, undo) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), 7000);
  }, []);

  const deleteWithUndo = useCallback((label, nextState) => {
    const prev = stateRef.current;
    setState(typeof nextState === 'function' ? nextState(prev) : nextState);
    showToast(label, () => setState(prev));
  }, [showToast]);

  /* state helpers */
  const patch = (p) => setState((s) => ({ ...s, ...p }));
  const patchCompetitor = (id, p) =>
    setState((s) => ({ ...s, competitors: s.competitors.map((c) => (c.id === id ? { ...c, ...(typeof p === 'function' ? p(c) : p) } : c)) }));

  const addCompetitor = () => {
    const c = normCompetitor({ name: 'New contact', tier: 'secondary' });
    setState((s) => ({ ...s, competitors: [...s.competitors, c], selectedId: c.id }));
    setView('card');
  };

  const removeCompetitor = (id) => {
    const name = state.competitors.find((c) => c.id === id)?.name || 'contact';
    deleteWithUndo(`Struck "${name}" from the board`, (prev) => ({
      ...prev,
      competitors: prev.competitors.filter((c) => c.id !== id),
      selectedId: prev.selectedId === id ? null : prev.selectedId,
    }));
    if (state.selectedId === id) setView('fleet');
  };

  const openCard = (id) => { patch({ selectedId: id }); setView('card'); };

  const closeHelp = () => { setHelpOpen(false); if (!state.seenGuide) patch({ seenGuide: true }); };

  /* actions */
  const doCopyMarkdown = async () => {
    const ok = await copyText(stateToMarkdown(state));
    showToast(ok ? 'Fleet dossier copied as Markdown' : 'Copy failed — try Export > Download');
  };
  const doExportJSON = () => { downloadFile('battlecard-bay.json', 'application/json', JSON.stringify(state, null, 2)); setExportOpen(false); };
  const doExportCSV = () => { downloadFile('battlecard-bay-engagements.csv', 'text/csv', dealsToCSV(state.competitors)); setExportOpen(false); };
  const doImport = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = normalize(String(reader.result));
        setState((s) => ({ ...next, seenGuide: s.seenGuide || next.seenGuide }));
        showToast('Dossier imported — fleet updated');
      } catch { showToast('Import failed — not a valid dossier file'); }
    };
    reader.readAsText(f);
    e.target.value = '';
    setExportOpen(false);
  };
  const doLoadDemo = () => {
    setState((s) => ({ ...demoState(), seenGuide: s.seenGuide || true }));
    setView('fleet');
    showToast('Demo fleet loaded — 4 contacts on scope');
  };
  const doReset = () => {
    try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
    setState(normalize({ seenGuide: true }));
    setView('fleet'); setResetOpen(false);
    showToast('Board wiped — clean scope');
  };

  /* keyboard */
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if (e.key === 'Escape') {
        if (exportOpen) { setExportOpen(false); return; }
        if (quickDraw) { setQuickDraw(false); return; }
        if (helpOpen) { closeHelp(); return; }
        if (resetOpen) { setResetOpen(false); return; }
        if (copilotOpen) { setCopilotOpen(false); return; }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); doCopyMarkdown(); return; }
      if (typing) return;
      if (e.key === '?') { e.preventDefault(); setHelpOpen(true); return; }
      if (e.key.toLowerCase() === 'q') { e.preventDefault(); setQuickDraw((v) => !v); return; }
      if (e.key.toLowerCase() === 'c') { e.preventDefault(); setCopilotOpen((v) => !v); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* close export menu on outside click */
  useEffect(() => {
    if (!exportOpen) return;
    const onDown = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false); };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [exportOpen]);

  const fleet = fleetRecord(state.competitors);
  const filtered = state.competitors.filter((c) => {
    if (tierFilter !== 'all' && c.tier !== tierFilter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [c.name, c.tagline, c.positioning, ...c.strengths.map((x) => x.text), ...c.weaknesses.map((x) => x.text),
      ...c.landmines.map((x) => x.text), ...c.counters.flatMap((k) => [k.objection, k.response, k.proof])]
      .join(' ').toLowerCase().includes(q);
  });

  return (
    <div className="chart-grid min-h-screen">
      <div className="app-chrome">
        {/* ============ header ============ */}
        <header className="sticky top-0 z-40 border-b border-line bg-abyss/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Wordmark />
            <div className="flex flex-wrap items-center gap-2">
              <IconBtn icon={Crosshair} label="Action Stations — quick-draw for live calls (Q)" tone="signal" onClick={() => setQuickDraw(true)}>
                Action stations
              </IconBtn>
              <IconBtn icon={Sparkles} label="Claude Copilot (C)" tone="brass" onClick={() => setCopilotOpen(true)}>Copilot</IconBtn>
              <IconBtn icon={Ship} label="Load demo fleet" onClick={doLoadDemo}>Load demo</IconBtn>
              <IconBtn icon={HelpCircle} label="How to use (?)" onClick={() => setHelpOpen(true)}>How to use</IconBtn>
              <div className="relative" ref={exportRef}>
                <IconBtn icon={Download} label="Export menu" onClick={() => setExportOpen((v) => !v)} aria-expanded={exportOpen}>Export</IconBtn>
                {exportOpen && (
                  <div className="toast-in absolute right-0 z-50 mt-1.5 w-60 rounded-md border border-line bg-deep p-1.5 shadow-deck">
                    <button type="button" onClick={() => { doCopyMarkdown(); setExportOpen(false); }}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-chart hover:bg-hull">
                      <FileText className="h-4 w-4 text-chartdim" aria-hidden /> Copy fleet dossier (Markdown)
                    </button>
                    <button type="button" onClick={doExportJSON}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-chart hover:bg-hull">
                      <FileDown className="h-4 w-4 text-chartdim" aria-hidden /> Download JSON (full state)
                    </button>
                    <button type="button" onClick={doExportCSV}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-chart hover:bg-hull">
                      <ClipboardList className="h-4 w-4 text-chartdim" aria-hidden /> Download engagement log (CSV)
                    </button>
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-chart hover:bg-hull">
                      <Upload className="h-4 w-4 text-chartdim" aria-hidden /> Import JSON…
                    </button>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={doImport} aria-label="Import JSON file" />
              </div>
              <IconBtn icon={RotateCcw} label="Reset all data" onClick={() => setResetOpen(true)} />
            </div>
          </div>
        </header>

        {/* ============ main ============ */}
        <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-6">
          {view === 'card' && selected ? (
            <CardEditor
              key={selected.id}
              c={selected}
              onBack={() => setView('fleet')}
              onPatch={(p) => patchCompetitor(selected.id, p)}
              onDeleteItem={(field, itemId, label) =>
                deleteWithUndo(label, (prev) => ({
                  ...prev,
                  competitors: prev.competitors.map((x) => (x.id === selected.id ? { ...x, [field]: x[field].filter((it) => it.id !== itemId) } : x)),
                }))}
              onRemove={() => removeCompetitor(selected.id)}
              onCopyCard={async () => {
                const ok = await copyText(competitorToMarkdown(selected));
                showToast(ok ? `Battlecard for ${selected.name} copied` : 'Copy failed');
              }}
            />
          ) : (
            <FleetView
              state={state} fleet={fleet} filtered={filtered}
              query={query} setQuery={setQuery}
              tierFilter={tierFilter} setTierFilter={setTierFilter}
              onOpen={openCard} onAdd={addCompetitor} onLoadDemo={doLoadDemo}
              ourPitch={state.ourPitch} setOurPitch={(v) => patch({ ourPitch: v })}
            />
          )}
        </main>

        {/* ============ overlays ============ */}
        {quickDraw && <QuickDraw competitors={state.competitors} initialId={state.selectedId} onClose={() => setQuickDraw(false)} />}
        {copilotOpen && (
          <CopilotDrawer
            state={state}
            onClose={() => setCopilotOpen(false)}
            onNotes={(v) => patch({ copilotNotes: v })}
            onToast={showToast}
          />
        )}

        <Modal open={helpOpen} onClose={closeHelp} title="How to run the Bay" icon={BookOpen} wide>
          <HelpContent />
        </Modal>

        <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Wipe the board?" icon={AlertTriangle}>
          <p className="text-sm text-chartdim">
            This clears every battlecard, engagement log, and note from this browser. Download a JSON dossier first if you want a fallback copy.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <IconBtn label="Cancel reset" onClick={() => setResetOpen(false)}>Cancel</IconBtn>
            <IconBtn icon={FileDown} label="Download JSON backup" onClick={() => downloadFile('battlecard-bay-backup.json', 'application/json', JSON.stringify(state, null, 2))}>Backup first</IconBtn>
            <IconBtn icon={RotateCcw} label="Confirm wipe" tone="solid" onClick={doReset}>Wipe it</IconBtn>
          </div>
        </Modal>

        {/* toast */}
        {toast && (
          <div className="toast-in fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-md border border-line bg-deep px-4 py-2.5 shadow-deck">
            <span className="text-sm text-chart">{toast.msg}</span>
            {toast.undo && (
              <button type="button" onClick={() => { toast.undo(); setToast(null); }}
                className="label-caps flex items-center gap-1 rounded border border-brass/50 bg-brass/10 px-2 py-1 text-[11px] text-brass hover:bg-brass/20">
                <Undo2 className="h-3 w-3" aria-hidden /> Undo
              </button>
            )}
          </div>
        )}
      </div>

      {/* print artifact */}
      <PrintSheet state={state} />
    </div>
  );
}

/* ================================ fleet view ================================ */

function FleetView({ state, fleet, filtered, query, setQuery, tierFilter, setTierFilter, onOpen, onAdd, onLoadDemo, ourPitch, setOurPitch }) {
  const empty = state.competitors.length === 0;
  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,460px)_1fr]">
        {/* radar hero */}
        <Panel className="flex items-center justify-center" title="Contact scope" icon={Radar}>
          {empty ? (
            <div className="flex flex-col items-center py-8 text-center">
              <RadarScope competitors={[]} onPick={() => {}} selectedId={null} />
              <p className="mt-3 max-w-xs text-sm text-chartdim">Scope is clear — no contacts tracked yet. Add the competitors you actually meet in deals, or load the demo fleet to see a working bay.</p>
            </div>
          ) : (
            <RadarScope competitors={state.competitors} onPick={onOpen} selectedId={state.selectedId} />
          )}
        </Panel>

        {/* fleet stats + pitch */}
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Contacts on scope" value={state.competitors.length} icon={Target} />
            <Stat label="Engagements" value={fleet.won + fleet.lost + fleet.open} icon={Swords} />
            <Stat label="Fleet record" value={`${fleet.won}W – ${fleet.lost}L`} icon={Flag} />
            <div className="flex flex-col items-center justify-center rounded-lg border border-line bg-hull/80 px-3 py-2.5 shadow-raised">
              <span className="label-caps mb-1 text-[10px] text-muted">Fleet win rate</span>
              <WinDial rate={fleet.closed ? fleet.won / fleet.closed : null} size={84} label="Fleet win rate" />
            </div>
          </div>

          <Panel title="Our pitch — the flag we fly" icon={Anchor} tone="brass">
            <textarea value={ourPitch} onChange={(e) => setOurPitch(e.target.value)} rows={3}
              placeholder="One paragraph: what you sell, to whom, and why you win. Every Copilot prompt and every counter is sharper when this is filled in."
              className="w-full resize-y rounded-md border border-linesoft bg-deep px-3 py-2 text-sm leading-relaxed text-chart outline-none placeholder:text-muted focus:border-scope/60" />
          </Panel>

          {/* filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search cards, counters, landmines…"
                aria-label="Search battlecards"
                className="w-full rounded-md border border-line bg-hull/80 py-2 pl-8 pr-3 text-sm text-chart outline-none placeholder:text-muted focus:border-scope/60" />
            </div>
            {['all', ...TIERS.map((t) => t.id)].map((t) => (
              <button key={t} type="button" onClick={() => setTierFilter(t)}
                className={`label-caps rounded-md border px-2.5 py-1.5 text-[11px] transition-colors ${
                  tierFilter === t ? 'border-signal/60 bg-signal/15 text-signal' : 'border-line bg-hull/60 text-chartdim hover:text-chart'}`}>
                {t === 'all' ? 'All tiers' : tierLabel(t)}
              </button>
            ))}
            <IconBtn icon={Plus} label="Add competitor" tone="solid" onClick={onAdd}>New contact</IconBtn>
          </div>
        </div>
      </div>

      {/* roster */}
      {empty ? (
        <div className="mt-8 rounded-lg border border-dashed border-line bg-hull/40 p-10 text-center">
          <Radar className="mx-auto h-10 w-10 text-muted" aria-hidden />
          <h2 className="font-display mt-3 text-lg font-extrabold text-chart">Nothing on the board yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-chartdim">
            A battlecard bay earns its keep in three moves: log the competitors you actually lose to, arm each card with counters and landmines, then run <em>Action stations</em> on live calls.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <IconBtn icon={Ship} label="Load demo" tone="brass" onClick={onLoadDemo}>Load the demo fleet</IconBtn>
            <IconBtn icon={Plus} label="Add first competitor" tone="solid" onClick={onAdd}>Add first contact</IconBtn>
          </div>
        </div>
      ) : (
        <>
          {filtered.length === 0 && (
            <p className="mt-8 text-center text-sm text-chartdim">No contacts match that search. Adjust the query or tier filter.</p>
          )}
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => {
              const r = record(c);
              return (
                <button key={c.id} type="button" onClick={() => onOpen(c.id)}
                  className="group rounded-lg border border-line bg-hull/80 p-4 text-left shadow-raised transition-colors hover:border-chartdim/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-display truncate text-base font-extrabold text-chart group-hover:text-white">{c.name}</div>
                      <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-chartdim">{c.tagline || 'No tagline yet — open the card to arm it.'}</p>
                    </div>
                    <TierFlag tier={c.tier} />
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <CountChip icon={Swords} n={c.counters.length} label="counters" />
                      <CountChip icon={Bomb} n={c.landmines.length} label="mines" />
                      <CountChip icon={ShieldAlert} n={c.weaknesses.length} label="weak pts" />
                    </div>
                    <div className="flex flex-col items-end">
                      <WinDial rate={r.rate} size={72} label={`${c.name} win rate`} />
                      <span className="label-caps mt-0.5 text-[10px] text-muted">{r.won}W–{r.lost}L{r.open ? ` · ${r.open} open` : ''}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg border border-line bg-hull/80 px-3 py-2.5 shadow-raised">
      <div className="label-caps flex items-center gap-1.5 text-[10px] text-muted">
        <Icon className="h-3 w-3" aria-hidden /> {label}
      </div>
      <div className="font-display mt-1 text-2xl font-extrabold tabular-nums text-chart">{value}</div>
    </div>
  );
}

function CountChip({ icon: Icon, n, label }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-chartdim">
      <Icon className={`h-3 w-3 ${n === 0 ? 'text-muted' : 'text-brass'}`} aria-hidden />
      <span className="tabular-nums font-semibold text-chart">{n}</span> {label}
    </span>
  );
}

/* ================================ card editor ================================ */

function CardEditor({ c, onBack, onPatch, onDeleteItem, onRemove, onCopyCard }) {
  const r = record(c);
  const [dealDraft, setDealDraft] = useState({ name: '', outcome: 'open', note: '' });

  const addCounter = () => onPatch({ counters: [...c.counters, normCounter({})] });
  const patchCounter = (id, p) => onPatch({ counters: c.counters.map((k) => (k.id === id ? { ...k, ...p } : k)) });
  const moveCounter = (i, d) => {
    const j = i + d; if (j < 0 || j >= c.counters.length) return;
    const next = c.counters.slice(); [next[i], next[j]] = [next[j], next[i]];
    onPatch({ counters: next });
  };

  const addDeal = () => {
    if (!dealDraft.name.trim()) return;
    onPatch({ deals: [{ ...normDeal({ ...dealDraft, date: today() }) }, ...c.deals] });
    setDealDraft({ name: '', outcome: 'open', note: '' });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onBack}
          className="label-caps flex items-center gap-1 rounded-md border border-line bg-hull/60 px-2.5 py-1.5 text-[11px] text-chartdim hover:text-chart">
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Back to fleet
        </button>
        <div className="flex gap-2">
          <IconBtn icon={Copy} label="Copy this battlecard as Markdown" onClick={onCopyCard}>Copy card</IconBtn>
          <IconBtn icon={Trash2} label="Strike this competitor from the board" tone="signal" onClick={onRemove}>Strike card</IconBtn>
        </div>
      </div>

      {/* identity strip */}
      <div className="rounded-lg border border-line bg-hull/80 p-4 shadow-raised">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[260px] flex-1">
            <label className="label-caps text-[10px] text-muted" htmlFor="cname">Contact designation</label>
            <input id="cname" value={c.name} onChange={(e) => onPatch({ name: e.target.value })}
              className="font-display mt-1 block w-full rounded-md border border-linesoft bg-deep px-3 py-2 text-xl font-extrabold text-chart outline-none focus:border-scope/60" />
            <input value={c.tagline} onChange={(e) => onPatch({ tagline: e.target.value })}
              placeholder="One line that tells a rep what this competitor really is…" aria-label="Tagline"
              className="mt-2 block w-full rounded-md border border-linesoft bg-deep px-3 py-1.5 text-sm text-chartdim outline-none placeholder:text-muted focus:border-scope/60" />
          </div>
          <div className="flex items-center gap-5">
            <div>
              <span className="label-caps block text-[10px] text-muted">Threat tier</span>
              <div className="mt-1.5 flex gap-1.5">
                {TIERS.map((t) => (
                  <button key={t.id} type="button" onClick={() => onPatch({ tier: t.id })}
                    aria-pressed={c.tier === t.id}
                    className={`label-caps rounded-md border px-2 py-1.5 text-[10px] transition-colors ${
                      c.tier === t.id ? 'border-signal/60 bg-signal/15 text-signal' : 'border-line bg-deep text-chartdim hover:text-chart'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <WinDial rate={r.rate} size={100} label={`Win rate vs ${c.name}`} />
              <span className="label-caps mt-0.5 text-[10px] text-muted">{r.won}W–{r.lost}L vs them</span>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <label className="label-caps text-[10px] text-muted" htmlFor="cpos">Their positioning — how they sell against you</label>
          <textarea id="cpos" value={c.positioning} onChange={(e) => onPatch({ positioning: e.target.value })} rows={2}
            placeholder="Their headline story, who they target, how they price, how their reps run a deal…"
            className="mt-1 w-full resize-y rounded-md border border-linesoft bg-deep px-3 py-2 text-sm leading-relaxed text-chart outline-none placeholder:text-muted focus:border-scope/60" />
        </div>
      </div>

      {/* strengths / weaknesses */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Strengths — respect these" icon={Shield}>
          <ListEditor items={c.strengths} bullet={Shield} accent="sonar"
            onChange={(items) => onPatch({ strengths: items })}
            onDelete={(id) => onDeleteItem('strengths', id, 'Strength removed')}
            placeholder="What they are genuinely good at…" />
        </Panel>
        <Panel title="Weaknesses — attack surface" icon={ShieldAlert} tone="signal">
          <ListEditor items={c.weaknesses} bullet={ShieldAlert} accent="signal"
            onChange={(items) => onPatch({ weaknesses: items })}
            onDelete={(id) => onDeleteItem('weaknesses', id, 'Weakness removed')}
            placeholder="Where they consistently fall short…" />
        </Panel>
      </div>

      {/* landmines */}
      <Panel className="mt-4" title="Mines to lay — plant these questions early" icon={Bomb} tone="signal">
        <p className="mb-2 text-[13px] text-chartdim">
          Questions that sound like ordinary diligence but detonate later in the competitor&apos;s own demo. Phrase them so the prospect asks, not you.
        </p>
        <ListEditor items={c.landmines} bullet={Bomb} accent="signal"
          onChange={(items) => onPatch({ landmines: items })}
          onDelete={(id) => onDeleteItem('landmines', id, 'Mine defused')}
          placeholder='e.g. "Ask them to put year-2 total cost in writing…"' />
      </Panel>

      {/* counter-battery */}
      <Panel className="mt-4" title="Counter-battery — objection, counter, proof" icon={Swords} tone="brass"
        actions={<IconBtn icon={Plus} label="Add counter" onClick={addCounter}>Add counter</IconBtn>}>
        {c.counters.length === 0 && (
          <p className="text-sm text-chartdim">No counters loaded. Each row is one objection you hear, the reply a rep can say verbatim, and the proof that makes it stick. Ask Copilot to generate a first salvo.</p>
        )}
        <div className="space-y-3">
          {c.counters.map((k, i) => (
            <div key={k.id} className="rounded-md border border-linesoft bg-deep/70 p-3">
              <div className="flex items-start gap-2">
                <span className="label-caps mt-1.5 shrink-0 rounded bg-bulkhead px-1.5 py-0.5 text-[10px] tabular-nums text-chartdim">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <label className="label-caps text-[10px] text-signal">Objection heard</label>
                    <input value={k.objection} onChange={(e) => patchCounter(k.id, { objection: e.target.value })}
                      placeholder='"They said your competitor is…"'
                      className="mt-0.5 w-full rounded border border-linesoft bg-hull/70 px-2.5 py-1.5 text-sm text-chart outline-none placeholder:text-muted focus:border-scope/60" />
                  </div>
                  <div>
                    <label className="label-caps text-[10px] text-brass">Counter — say this</label>
                    <textarea value={k.response} onChange={(e) => patchCounter(k.id, { response: e.target.value })} rows={2}
                      placeholder="The verbatim reply. Concede what is true, reframe what matters."
                      className="mt-0.5 w-full resize-y rounded border border-linesoft bg-hull/70 px-2.5 py-1.5 text-sm leading-relaxed text-chart outline-none placeholder:text-muted focus:border-scope/60" />
                  </div>
                  <div>
                    <label className="label-caps text-[10px] text-scope">Proof point</label>
                    <input value={k.proof} onChange={(e) => patchCounter(k.id, { proof: e.target.value })}
                      placeholder="The artifact that makes it land: case study, worksheet, demo moment…"
                      className="mt-0.5 w-full rounded border border-linesoft bg-hull/70 px-2.5 py-1.5 text-sm text-chart outline-none placeholder:text-muted focus:border-scope/60" />
                  </div>
                </div>
                <span className="flex shrink-0 flex-col gap-0.5">
                  <button type="button" onClick={() => moveCounter(i, -1)} disabled={i === 0} aria-label="Move counter up"
                    className="rounded p-1 text-chartdim hover:text-chart disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" aria-hidden /></button>
                  <button type="button" onClick={() => moveCounter(i, 1)} disabled={i === c.counters.length - 1} aria-label="Move counter down"
                    className="rounded p-1 text-chartdim hover:text-chart disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" aria-hidden /></button>
                  <button type="button" onClick={() => onDeleteItem('counters', k.id, 'Counter removed')} aria-label="Delete counter"
                    className="rounded p-1 text-chartdim hover:text-signal"><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
                </span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* engagement log + intel */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Engagement log — every deal against them" icon={ClipboardList}>
          <div className="mb-3 flex flex-wrap gap-2">
            <input value={dealDraft.name} onChange={(e) => setDealDraft((d) => ({ ...d, name: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDeal(); } }}
              placeholder="Deal / account name" aria-label="Deal name"
              className="min-w-[140px] flex-1 rounded-md border border-line bg-deep px-2.5 py-1.5 text-sm text-chart outline-none placeholder:text-muted focus:border-scope/60" />
            <select value={dealDraft.outcome} onChange={(e) => setDealDraft((d) => ({ ...d, outcome: e.target.value }))}
              aria-label="Deal outcome"
              className="rounded-md border border-line bg-deep px-2 py-1.5 text-sm text-chart outline-none focus:border-scope/60">
              {OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <IconBtn icon={Plus} label="Log engagement" onClick={addDeal}>Log</IconBtn>
          </div>
          {c.deals.length === 0 ? (
            <p className="text-sm text-chartdim">No engagements logged. Every closed deal against this competitor — win or lose — makes the win-rate dial honest and the quarterly brief useful.</p>
          ) : (
            <ul className="space-y-1.5">
              {c.deals.map((d) => (
                <li key={d.id} className="group flex flex-wrap items-center gap-2 rounded-md border border-linesoft bg-deep/70 px-2.5 py-2">
                  <select value={d.outcome} aria-label={`Outcome for ${d.name}`}
                    onChange={(e) => onPatch({ deals: c.deals.map((x) => (x.id === d.id ? { ...x, outcome: e.target.value } : x)) })}
                    className={`label-caps rounded border px-1.5 py-1 text-[10px] outline-none ${
                      d.outcome === 'won' ? 'border-sonar/50 bg-sonar/10 text-sonar' :
                      d.outcome === 'lost' ? 'border-signal/50 bg-signal/10 text-signal' :
                      'border-brass/40 bg-brass/10 text-brass'}`}>
                    {OUTCOMES.map((o) => <option key={o} value={o}>{o.toUpperCase()}</option>)}
                  </select>
                  <input value={d.name} aria-label="Edit deal name"
                    onChange={(e) => onPatch({ deals: c.deals.map((x) => (x.id === d.id ? { ...x, name: e.target.value } : x)) })}
                    className="min-w-[100px] flex-1 bg-transparent text-sm font-semibold text-chart outline-none" />
                  <span className="label-caps text-[10px] tabular-nums text-muted">{d.date}</span>
                  <button type="button" aria-label={`Delete deal ${d.name}`}
                    onClick={() => onDeleteItem('deals', d.id, `Engagement "${d.name}" removed`)}
                    className="rounded p-1 text-chartdim opacity-40 hover:text-signal group-hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <input value={d.note} aria-label={`Note for ${d.name}`}
                    onChange={(e) => onPatch({ deals: c.deals.map((x) => (x.id === d.id ? { ...x, note: e.target.value } : x)) })}
                    placeholder="Why it went that way — what to repeat or fix…"
                    className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-[13px] text-chartdim outline-none placeholder:text-muted focus:border-linesoft" />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Intel locker — paste Claude recon here" icon={Sparkles} tone="brass">
          <textarea value={c.intel} onChange={(e) => onPatch({ intel: e.target.value })} rows={10}
            placeholder="Findings from the Copilot recon prompt, pricing-page notes, review-site quotes, field reports from reps…"
            className="h-full min-h-[200px] w-full resize-y rounded-md border border-linesoft bg-deep px-3 py-2 text-sm leading-relaxed text-chart outline-none placeholder:text-muted focus:border-scope/60" />
        </Panel>
      </div>
    </div>
  );
}

/* ================================ quick draw ================================ */

function QuickDraw({ competitors, initialId, onClose }) {
  const [q, setQ] = useState('');
  const [compId, setCompId] = useState(initialId || 'all');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const pool = competitors.filter((c) => compId === 'all' || c.id === compId);
  const needle = q.trim().toLowerCase();
  const hit = (t) => !needle || t.toLowerCase().includes(needle);

  const results = pool.flatMap((c) => {
    const rows = [];
    c.counters.forEach((k) => {
      if (hit(`${k.objection} ${k.response} ${k.proof}`)) rows.push({ type: 'counter', c, k, id: k.id });
    });
    c.landmines.forEach((m) => { if (hit(m.text)) rows.push({ type: 'mine', c, m, id: m.id }); });
    if (needle) {
      c.weaknesses.forEach((w) => { if (hit(w.text)) rows.push({ type: 'weak', c, m: w, id: w.id }); });
    }
    return rows;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-abyss/95 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Action stations — quick draw">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="lamp-blink inline-flex h-3 w-3 rounded-full bg-signal shadow-[0_0_12px_2px_rgba(241,60,77,0.7)]" aria-hidden />
            <h2 className="font-display text-xl font-extrabold tracking-tight text-chart">ACTION STATIONS</h2>
            <span className="label-caps hidden text-[10px] text-muted sm:inline">live-call quick draw · big type · zero fumbling</span>
          </div>
          <IconBtn icon={X} label="Stand down (Esc)" onClick={onClose}>Stand down</IconBtn>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Type what the prospect just said…" aria-label="Search counters and landmines"
              className="w-full rounded-lg border border-line bg-hull px-4 py-3 pl-10 text-lg text-chart outline-none placeholder:text-muted focus:border-signal/70" />
          </div>
          <select value={compId} onChange={(e) => setCompId(e.target.value)} aria-label="Filter by competitor"
            className="rounded-lg border border-line bg-hull px-3 py-2 text-sm text-chart outline-none focus:border-scope/60">
            <option value="all">All competitors</option>
            {competitors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {competitors.length === 0 ? (
          <p className="mt-10 text-center text-chartdim">No battlecards yet — stand down, load the demo or build a card first.</p>
        ) : results.length === 0 ? (
          <p className="mt-10 text-center text-chartdim">No match. Try fewer words — search hits objections, counters, proof, mines and weaknesses.</p>
        ) : (
          <div className="mt-6 space-y-4 pb-16">
            {results.map((r) => (
              <div key={`${r.c.id}-${r.type}-${r.id}`}
                className={`rounded-lg border p-4 shadow-raised ${r.type === 'mine' ? 'border-signal/40 bg-signal/5' : 'border-line bg-hull/80'}`}>
                <div className="mb-1.5 flex items-center gap-2">
                  {r.type === 'counter' ? <Swords className="h-3.5 w-3.5 text-brass" aria-hidden />
                    : r.type === 'mine' ? <Bomb className="h-3.5 w-3.5 text-signal" aria-hidden />
                    : <ShieldAlert className="h-3.5 w-3.5 text-signal" aria-hidden />}
                  <span className="label-caps text-[10px] text-muted">
                    {r.c.name} · {r.type === 'counter' ? 'Counter-battery' : r.type === 'mine' ? 'Mine to lay' : 'Weakness'}
                  </span>
                </div>
                {r.type === 'counter' ? (
                  <>
                    <p className="text-base font-semibold text-signal">{r.k.objection || 'Objection not written yet'}</p>
                    <p className="mt-2 text-xl leading-snug text-chart sm:text-2xl">{r.k.response || '—'}</p>
                    {r.k.proof && <p className="mt-2 text-sm text-scope">Proof: {r.k.proof}</p>}
                  </>
                ) : (
                  <p className="text-xl leading-snug text-chart sm:text-2xl">{r.m.text}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================ copilot ================================ */

function CopilotDrawer({ state, onClose, onNotes, onToast }) {
  const [compId, setCompId] = useState(state.selectedId || state.competitors[0]?.id || '');
  const [activeId, setActiveId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const comp = state.competitors.find((c) => c.id === compId) || null;
  const active = COPILOT_ACTIONS.find((a) => a.id === activeId) || null;
  const prompt = active ? (active.needsCompetitor ? (comp ? active.build(state, comp) : '') : active.build(state)) : '';

  const doCopy = async () => {
    if (!prompt) return;
    const ok = await copyText(prompt);
    setCopiedId(ok ? active.id : null);
    onToast(ok ? 'Prompt copied — paste it into claude.ai' : 'Copy failed');
    if (ok) setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-abyss/60 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-label="Claude Copilot"
        className="toast-in flex h-full w-full max-w-lg flex-col border-l border-line bg-deep shadow-deck">
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-display flex items-center gap-2 text-base font-extrabold text-chart">
            <Sparkles className="h-4 w-4 text-brass" aria-hidden /> Claude Copilot
          </h2>
          <button type="button" onClick={onClose} aria-label="Close Copilot"
            className="rounded-md border border-line p-1.5 text-chartdim hover:text-chart"><X className="h-4 w-4" aria-hidden /></button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <p className="text-[13px] leading-relaxed text-chartdim">
            Each action builds a complete prompt around your live battlecard data. Copy it, paste into{' '}
            <span className="font-semibold text-chart">claude.ai</span> — works with the standard $20 Claude subscription, no API key.
          </p>
          <div>
            <label className="label-caps text-[10px] text-muted" htmlFor="cp-comp">Target competitor</label>
            <select id="cp-comp" value={compId} onChange={(e) => setCompId(e.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-hull px-2.5 py-2 text-sm text-chart outline-none focus:border-scope/60">
              {state.competitors.length === 0 && <option value="">No competitors yet — add one first</option>}
              {state.competitors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            {COPILOT_ACTIONS.map((a) => {
              const disabled = a.needsCompetitor && !comp;
              const Icon = a.icon;
              return (
                <button key={a.id} type="button" disabled={disabled}
                  onClick={() => setActiveId(a.id === activeId ? null : a.id)}
                  aria-pressed={activeId === a.id}
                  className={`flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors disabled:opacity-40 ${
                    activeId === a.id ? 'border-brass/60 bg-brass/10' : 'border-line bg-hull/70 hover:border-chartdim/50'}`}>
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${activeId === a.id ? 'text-brass' : 'text-chartdim'}`} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-chart">{a.title}</span>
                    <span className="block text-[12px] leading-snug text-chartdim">{a.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {active && prompt && (
            <div className="rounded-md border border-line bg-hull/70 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="label-caps text-[10px] text-brass">Generated prompt · {prompt.length.toLocaleString()} chars</span>
                <IconBtn icon={copiedId === active.id ? Check : Copy} label="Copy prompt" tone="brass" onClick={doCopy}>
                  {copiedId === active.id ? 'Copied' : 'Copy prompt'}
                </IconBtn>
              </div>
              <textarea readOnly value={prompt} rows={10} aria-label="Generated Copilot prompt"
                className="w-full resize-y rounded border border-linesoft bg-deep p-2.5 font-mono text-[11.5px] leading-relaxed text-chartdim outline-none" />
              <p className="mt-1.5 text-[11px] text-muted">Paste into claude.ai — works with the standard Claude subscription.</p>
            </div>
          )}
          <div>
            <label className="label-caps text-[10px] text-muted" htmlFor="cp-notes">Debrief locker — paste Claude&apos;s answer back (auto-saved)</label>
            <textarea id="cp-notes" value={state.copilotNotes} onChange={(e) => onNotes(e.target.value)} rows={6}
              placeholder="Keep the useful parts of Claude's answers here, then fold them into the cards."
              className="mt-1 w-full resize-y rounded-md border border-line bg-hull px-3 py-2 text-sm leading-relaxed text-chart outline-none placeholder:text-muted focus:border-scope/60" />
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ================================ help ================================ */

function HelpContent() {
  const steps = [
    ['Fly your flag', 'Fill in "Our pitch" on the fleet screen. Every counter and every Copilot prompt gets sharper once the Bay knows what you sell.'],
    ['Put contacts on scope', 'Add the competitors you actually meet in deals (or Load demo to study a finished bay). Tier them: primary threats sit on the inner radar ring.'],
    ['Arm each battlecard', 'Open a card and load its magazine: strengths you must respect, weaknesses to attack, mines to lay early, and counter-battery rows (objection, verbatim counter, proof).'],
    ['Log every engagement', 'Win or lose, log the deal on the card with a one-line reason. The win-rate dials only tell the truth if you feed them losses too.'],
    ['Go to action stations on live calls', 'Press Q (or the red button) mid-call. Type what the prospect just said; the matching counter appears in big type with its proof point.'],
    ['Run Copilot sorties', 'Open Copilot (C): recon a competitor’s positioning, generate new counters, wargame against Claude playing their best rep, or get the quarterly fleet brief. Copy the prompt into claude.ai.'],
    ['Fold intel back in', 'Paste Claude’s findings into the card’s Intel locker or the Debrief locker, then promote the best lines into real counters.'],
    ['Ship the dossier', 'Export: copy the fleet dossier as Markdown for your wiki, download JSON as backup, CSV of engagements for your CRM. Print gives a clean paper battlecard pack.'],
  ];
  const keys = [
    ['?', 'Open this guide'], ['Q', 'Action stations (quick-draw) on/off'], ['C', 'Claude Copilot on/off'],
    ['Ctrl / Cmd + S', 'Copy fleet dossier as Markdown'], ['Esc', 'Close any panel or dialog'], ['Enter', 'Add the entry you are typing'],
  ];
  return (
    <div className="space-y-5">
      <ol className="space-y-3">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="label-caps mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-signal/50 bg-signal/10 text-[11px] tabular-nums text-signal">{i + 1}</span>
            <div>
              <div className="text-sm font-bold text-chart">{t}</div>
              <p className="text-[13px] leading-relaxed text-chartdim">{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <div>
        <h3 className="label-caps mb-2 flex items-center gap-1.5 text-[11px] text-brass"><Keyboard className="h-3.5 w-3.5" aria-hidden /> Keyboard stations</h3>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {keys.map(([k, d]) => (
            <div key={k} className="flex items-center gap-2 rounded-md border border-linesoft bg-hull/60 px-2.5 py-1.5">
              <kbd className="rounded border border-line bg-deep px-1.5 py-0.5 font-mono text-[11px] text-chart">{k}</kbd>
              <span className="text-[12px] text-chartdim">{d}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[12px] leading-relaxed text-muted">
        Your data never leaves this browser — everything lives in localStorage. Export JSON regularly if the fleet matters to you.
      </p>
    </div>
  );
}

/* ================================ print sheet ================================ */

function PrintSheet({ state }) {
  const f = fleetRecord(state.competitors);
  return (
    <div className="print-sheet" aria-hidden>
      <h1>Battlecard Bay — Fleet Dossier</h1>
      <p>
        Exported {today()} · {state.competitors.length} contacts · fleet record {f.won}W–{f.lost}L
        {f.closed ? ` · win rate ${Math.round((f.won / f.closed) * 100)}%` : ''}
      </p>
      {state.ourPitch && <p><strong>Our pitch:</strong> {state.ourPitch}</p>}
      {state.competitors.map((c) => {
        const r = record(c);
        return (
          <div key={c.id} className="pc-card">
            <h2>{c.name} — {tierLabel(c.tier)} · {r.won}W–{r.lost}L ({pct(r.rate)})</h2>
            {c.tagline && <p><em>{c.tagline}</em></p>}
            {c.positioning && <p><strong>Their positioning:</strong> {c.positioning}</p>}
            {c.strengths.length > 0 && (<><h3>Strengths</h3><ul>{c.strengths.map((s) => <li key={s.id}>{s.text}</li>)}</ul></>)}
            {c.weaknesses.length > 0 && (<><h3>Weaknesses</h3><ul>{c.weaknesses.map((s) => <li key={s.id}>{s.text}</li>)}</ul></>)}
            {c.landmines.length > 0 && (<><h3>Mines to lay</h3><ul>{c.landmines.map((s) => <li key={s.id}>{s.text}</li>)}</ul></>)}
            {c.counters.length > 0 && (
              <>
                <h3>Counter-battery</h3>
                <ul>
                  {c.counters.map((k) => (
                    <li key={k.id}>
                      <strong>Objection:</strong> {k.objection || '—'} <strong>Counter:</strong> {k.response || '—'}
                      {k.proof ? <> <strong>Proof:</strong> {k.proof}</> : null}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        );
      })}
      {state.competitors.length === 0 && <p>No battlecards yet.</p>}
    </div>
  );
}
