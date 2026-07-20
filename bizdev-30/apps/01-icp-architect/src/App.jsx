import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DraftingCompass, Ruler, PenLine, Plus, Trash2, Copy, Check, Download, Upload,
  HelpCircle, RotateCcw, X, ChevronDown, ChevronRight, ArrowUp, ArrowDown,
  Search, Undo2, Layers, Target, Ban, FileText, FileJson, FileSpreadsheet,
  Printer, Microscope, Eraser, Users, NotebookPen, Stamp, TriangleAlert,
} from 'lucide-react';

/* ================================================================== *
 *  ICP ARCHITECT — draft, weight & score Ideal Customer Profiles     *
 *  World: the architect's studio. Graphite on ivory, drafting lines. *
 * ================================================================== */

const LS_KEY = 'bizdev:01-icp-architect:v1';
const APP_NAME = 'ICP Architect';

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

const RATING_WORDS = ['miss', 'partial', 'solid', 'exact'];
const TIER_META = {
  A: { label: 'TIER A', color: 'var(--color-tier-a)', hint: 'Build here first' },
  B: { label: 'TIER B', color: 'var(--color-tier-b)', hint: 'Worth surveying' },
  C: { label: 'TIER C', color: 'var(--color-tier-c)', hint: 'Back of the flat file' },
  D: { label: 'TIER D', color: 'var(--color-tier-d)', hint: 'Wrong lot entirely' },
  DQ: { label: 'DISQ.', color: 'var(--color-redline)', hint: 'Struck from the survey' },
  NR: { label: 'N/R', color: 'var(--color-pencil2)', hint: 'Not yet rated' },
};

/* ----------------------------- state ------------------------------ */

const str = (v, d = '') => (typeof v === 'string' ? v : d);
const arrStr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
const clampInt = (v, lo, hi, d) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};

function normalizeIcp(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const f = o.firmo && typeof o.firmo === 'object' ? o.firmo : {};
  return {
    id: str(o.id) || uid(),
    code: str(o.code, 'SHT-01'),
    name: str(o.name),
    summary: str(o.summary),
    firmo: {
      industry: str(f.industry), headcount: str(f.headcount), revenue: str(f.revenue),
      geo: str(f.geo), model: str(f.model), stack: str(f.stack),
    },
    pains: arrStr(o.pains),
    triggers: arrStr(o.triggers),
    disquals: arrStr(o.disquals),
    criteria: (Array.isArray(o.criteria) ? o.criteria : [])
      .filter((c) => c && typeof c === 'object')
      .map((c) => ({ id: str(c.id) || uid(), label: str(c.label), weight: clampInt(c.weight, 1, 5, 3) })),
    findings: str(o.findings),
    createdAt: Number(o.createdAt) || Date.now(),
    updatedAt: Number(o.updatedAt) || Date.now(),
  };
}

function normalizeProspect(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const ratings = {};
  if (o.ratings && typeof o.ratings === 'object') {
    for (const [k, v] of Object.entries(o.ratings)) {
      const n = clampInt(v, 0, 3, null);
      if (n !== null && typeof v === 'number') ratings[k] = n;
    }
  }
  return {
    id: str(o.id) || uid(),
    name: str(o.name),
    domain: str(o.domain),
    icpId: str(o.icpId) || null,
    note: str(o.note),
    dq: !!o.dq,
    dqReason: str(o.dqReason),
    ratings,
    addedAt: Number(o.addedAt) || Date.now(),
  };
}

function normalize(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const icps = (Array.isArray(o.icps) ? o.icps : []).map(normalizeIcp);
  const prospects = (Array.isArray(o.prospects) ? o.prospects : []).map(normalizeProspect);
  const ids = new Set(icps.map((i) => i.id));
  return {
    v: 1,
    seenGuide: !!o.seenGuide,
    tab: ['sheets', 'survey', 'copilot'].includes(o.tab) ? o.tab : 'sheets',
    activeIcpId: ids.has(o.activeIcpId) ? o.activeIcpId : (icps[0]?.id ?? null),
    icps,
    prospects,
  };
}

/* --------------------------- demo data ---------------------------- */

function demoState() {
  const now = Date.now();
  const day = 86400000;
  const i1 = {
    id: 'icp-revops', code: 'SHT-01', name: 'Scale-Up SaaS · RevOps Rebuild',
    summary: 'B2B SaaS companies outgrowing founder-led sales, whose CRM and forecast can no longer be trusted by the board.',
    firmo: {
      industry: 'B2B SaaS — horizontal tools, dev tools, fintech infrastructure',
      headcount: '50–300 total · sales org 8–40 seats',
      revenue: '$8M–$40M ARR',
      geo: 'US & Western Europe, remote-friendly',
      model: 'Sales-led with a PLG motion attached',
      stack: 'HubSpot or Salesforce · Outreach/Apollo · forecasting still in spreadsheets',
    },
    pains: [
      'Forecast missed two quarters running — board patience thinning',
      'Pipeline stages mean something different to every rep',
      'SDR-to-AE handoffs leak qualified demand every week',
      'RevOps is one overworked CRM admin, not a function',
    ],
    triggers: [
      'New VP Sales or CRO hired in the last 90 days',
      'Raised Series B/C with an aggressive hiring plan',
      'Sales team doubling within two quarters',
      'CRM migration or consolidation already on the roadmap',
    ],
    disquals: [
      'No dedicated sales team (pure self-serve)',
      'Under $1M ARR or pre-revenue',
      'Agency / services business model',
      'Already engaged with a Big-4 transformation firm',
    ],
    criteria: [
      { id: 'c1', label: 'Sales org between 8 and 40 seats', weight: 5 },
      { id: 'c2', label: 'New sales leader hired in the last two quarters', weight: 5 },
      { id: 'c3', label: 'Visible forecast/pipeline pain (job posts, podcasts, exec churn)', weight: 4 },
      { id: 'c4', label: 'Inside the $8M–$40M ARR band', weight: 4 },
      { id: 'c5', label: 'Runs HubSpot or Salesforce today', weight: 3 },
      { id: 'c6', label: 'Institutional round raised in the last 12 months', weight: 3 },
      { id: 'c7', label: 'US/EU HQ inside our working hours', weight: 2 },
      { id: 'c8', label: 'Warm path available — investor, alum, or client intro', weight: 2 },
    ],
    findings:
      'CLAUDE SURVEY · pasted 14 Jul\n' +
      '- Narrow the headcount band: 50–120 converts 2x better than 120–300 per our own wins.\n' +
      '- Watering holes: RevGenius, Pavilion chapters, SaaStr community, Topline podcast listeners.\n' +
      '- Monitorable trigger: saved LinkedIn search for "VP Sales" + "first 90 days" posts.\n' +
      '- Weak spot flagged: criterion c3 is fuzzy — define which signals count as forecast pain.',
    createdAt: now - 21 * day, updatedAt: now - 2 * day,
  };
  const i2 = {
    id: 'icp-mna', code: 'SHT-02', name: 'Post-Acquisition CRM Consolidation',
    summary: 'Mid-market companies fresh off an acquisition, running two of everything and reporting to a board that wants one number.',
    firmo: {
      industry: 'Mid-market B2B — software, logistics tech, business services',
      headcount: '200–1,500 combined after the deal',
      revenue: '$30M–$250M combined',
      geo: 'North America',
      model: 'Acquisitive — closed 1+ acquisition in the past year',
      stack: 'Two overlapping CRMs · mixed marketing automation · BI held together with exports',
    },
    pains: [
      'Two CRMs, two definitions of a customer',
      'Board reporting assembled by hand every single month',
      'Cross-sell between business units exists on slides only',
      'Duplicate tooling spend that nobody owns',
    ],
    triggers: [
      'Acquisition closed within the last 6 months',
      'Integration lead or PMO named publicly',
      'Renewal date approaching on one duplicate CRM contract',
      'New CFO with a mandate to cut tooling spend',
    ],
    disquals: [
      'Integration owned exclusively by acquirer internal IT',
      'Deal still in regulatory limbo',
      'Fewer than 5 total sales seats across units',
    ],
    criteria: [
      { id: 'd1', label: 'Closed an acquisition in the last 6 months', weight: 5 },
      { id: 'd2', label: 'Runs two overlapping CRM / marketing stacks', weight: 5 },
      { id: 'd3', label: 'Named integration lead or PMO we can reach', weight: 4 },
      { id: 'd4', label: '$30M+ combined revenue', weight: 3 },
      { id: 'd5', label: 'CRM renewal inside the next 9 months', weight: 3 },
      { id: 'd6', label: 'North America HQ', weight: 2 },
    ],
    findings: '',
    createdAt: now - 12 * day, updatedAt: now - 4 * day,
  };
  const P = (id, name, domain, icpId, ratings, extra = {}, ageDays = 5) => ({
    id, name, domain, icpId, ratings,
    note: extra.note || '', dq: !!extra.dq, dqReason: extra.dqReason || '',
    addedAt: now - ageDays * day,
  });
  return normalize({
    v: 1, seenGuide: true, tab: 'sheets', activeIcpId: i1.id,
    icps: [i1, i2],
    prospects: [
      P('p1', 'Lumenary', 'lumenary.io', 'icp-revops',
        { c1: 3, c2: 3, c3: 3, c4: 2, c5: 3, c6: 3, c7: 3, c8: 2 },
        { note: 'New CRO (ex-Gong) started in May. Warm path via Marta — ex-colleague, now VP CS there.' }, 3),
      P('p2', 'Fieldset', 'fieldset.app', 'icp-revops',
        { c1: 3, c2: 2, c3: 2, c4: 3, c5: 3, c6: 2, c7: 3, c8: 0 },
        { note: 'Hiring 6 AEs this quarter per careers page. Forecast pain implied in COO podcast, ep. 41.' }, 4),
      P('p3', 'Corvid Security', 'corvidsec.com', 'icp-revops',
        { c1: 2, c2: 1, c3: 2, c4: 2, c5: 3, c6: 1, c7: 3, c8: 1 }, {}, 6),
      P('p4', 'Atlas Freight OS', 'atlasfreightos.com', 'icp-revops',
        { c1: 2, c2: 0, c3: 2, c4: 1, c5: 2, c6: 3, c7: 2, c8: 0 },
        { note: 'Fresh Series B but sales leadership unchanged since 2023. Watch for a VP hire.' }, 8),
      P('p5', 'Brightline Health', 'brightlinehealth.co', 'icp-revops',
        { c1: 1, c2: 0, c3: 1, c4: 2, c5: 2, c6: 0, c7: 3, c8: 2 }, {}, 9),
      P('p6', 'Papertrail Legal', 'papertraillegal.com', 'icp-revops',
        { c1: 0, c2: 0, c3: 1, c4: 0, c5: 2, c6: 0, c7: 3, c8: 0 },
        { note: 'Nice people, tiny sales team. Revisit in a year.' }, 11),
      P('p7', 'Studio Nomad', 'studionomad.agency', 'icp-revops',
        { c1: 1, c2: 2, c3: 1, c5: 1, c7: 3 },
        { dq: true, dqReason: 'Agency business model — SHT-01 disqualifier 03', note: 'Referred by a client; had to strike it. Sent a polite pass.' }, 7),
      P('p8', 'Harbor & Crane Group', 'harborcrane.com', 'icp-mna',
        { d1: 3, d2: 3, d3: 2, d4: 3, d5: 2, d6: 3 },
        { note: 'Acquired Dockline in March. Integration lead posted about "one CRM by Q4".' }, 2),
      P('p9', 'Meridian Fulfillment', 'meridianfill.com', 'icp-mna',
        { d1: 2, d2: 3, d4: 2 },
        { note: 'Only half-surveyed — need renewal dates and the PMO name before trusting this score.' }, 1),
    ],
  });
}

/* --------------------------- scoring ------------------------------ */

function scoreProspect(icp, p) {
  const res = { pct: null, rated: 0, total: 0, low: false };
  if (!icp) return res;
  res.total = icp.criteria.length;
  let sum = 0, max = 0;
  for (const c of icp.criteria) {
    const r = p.ratings ? p.ratings[c.id] : undefined;
    if (typeof r === 'number') { sum += c.weight * r; max += c.weight * 3; res.rated++; }
  }
  if (max > 0) res.pct = Math.round((sum / max) * 100);
  res.low = res.total > 0 && res.rated / res.total < 0.6;
  return res;
}

const tierOf = (pct, dq) => {
  if (dq) return 'DQ';
  if (typeof pct !== 'number') return 'NR';
  if (pct >= 75) return 'A';
  if (pct >= 55) return 'B';
  if (pct >= 35) return 'C';
  return 'D';
};

/* ------------------------ serialization --------------------------- */

const fmtDate = (t) => new Date(t).toISOString().slice(0, 10);

function mdIcp(icp) {
  const L = [];
  L.push(`## ${icp.code} — ${icp.name || 'Untitled profile'}`);
  if (icp.summary) L.push(`> ${icp.summary}`);
  L.push('', '**Firmographics**', '');
  const F = icp.firmo;
  const rows = [
    ['Industry / vertical', F.industry], ['Headcount', F.headcount], ['Revenue band', F.revenue],
    ['Geography', F.geo], ['Business model', F.model], ['Tooling & stack signals', F.stack],
  ];
  for (const [k, v] of rows) if (v) L.push(`- **${k}:** ${v}`);
  const list = (title, items) => {
    if (!items.length) return;
    L.push('', `**${title}**`, '');
    items.forEach((x, i) => L.push(`${i + 1}. ${x}`));
  };
  list('Pains — what hurts', icp.pains);
  list('Buying triggers — why now', icp.triggers);
  list('Disqualifiers — walk away when', icp.disquals);
  if (icp.criteria.length) {
    L.push('', '**Fit criteria & weights** (rate each 0 miss · 1 partial · 2 solid · 3 exact)', '');
    L.push('| # | Criterion | Weight |', '| --- | --- | --- |');
    icp.criteria.forEach((c, i) => L.push(`| ${i + 1} | ${c.label || '(unnamed)'} | ${c.weight} |`));
  }
  return L.join('\n');
}

function mdProspectTable(icp, entries) {
  if (!entries.length) return '_No prospects surveyed against this sheet yet._';
  const L = ['| Rank | Company | Domain | Fit | Tier | Coverage | Note |', '| --- | --- | --- | --- | --- | --- | --- |'];
  entries.forEach((e, i) => {
    const fit = e.p.dq ? 'DQ' : (typeof e.sc.pct === 'number' ? `${e.sc.pct}` : 'n/r');
    const note = [e.p.dq && e.p.dqReason ? `DISQUALIFIED: ${e.p.dqReason}` : '', e.p.note].filter(Boolean).join(' — ');
    L.push(`| ${i + 1} | ${e.p.name || 'Untitled'} | ${e.p.domain || ''} | ${fit} | ${TIER_META[e.tier].label} | ${e.sc.rated}/${e.sc.total} | ${note.replace(/\|/g, '/')} |`);
  });
  return L.join('\n');
}

function rankedFor(state, icpId) {
  const icp = state.icps.find((i) => i.id === icpId);
  return state.prospects
    .filter((p) => p.icpId === icpId)
    .map((p) => ({ p, sc: scoreProspect(icp, p), tier: null }))
    .map((e) => ({ ...e, tier: tierOf(e.sc.pct, e.p.dq) }))
    .sort((a, b) => (a.p.dq ? 1 : 0) - (b.p.dq ? 1 : 0) || (b.sc.pct ?? -1) - (a.sc.pct ?? -1));
}

function mdPortfolio(state) {
  const L = [
    `# ${APP_NAME} — ICP Portfolio`,
    `_Exported ${fmtDate(Date.now())} · ${state.icps.length} sheet(s) · ${state.prospects.length} prospect(s)_`,
    '',
  ];
  if (!state.icps.length) L.push('_No profiles drafted yet._');
  for (const icp of state.icps) {
    L.push(mdIcp(icp), '', `### Ranked survey vs ${icp.code}`, '', mdProspectTable(icp, rankedFor(state, icp.id)), '', '---', '');
  }
  const orphans = state.prospects.filter((p) => !state.icps.some((i) => i.id === p.icpId));
  if (orphans.length) {
    L.push('### Unfiled prospects (no sheet assigned)', '');
    orphans.forEach((p) => L.push(`- ${p.name || 'Untitled'} ${p.domain ? `(${p.domain})` : ''}`));
  }
  return L.join('\n');
}

function csvProspects(state) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['rank', 'company', 'domain', 'sheet', 'fit_pct', 'tier', 'coverage', 'disqualified', 'dq_reason', 'note'].join(',')];
  for (const icp of state.icps) {
    rankedFor(state, icp.id).forEach((e, i) => {
      rows.push([
        i + 1, esc(e.p.name), esc(e.p.domain), esc(icp.code),
        typeof e.sc.pct === 'number' ? e.sc.pct : '', TIER_META[e.tier].label,
        `${e.sc.rated}/${e.sc.total}`, e.p.dq ? 'yes' : 'no', esc(e.p.dqReason), esc(e.p.note),
      ].join(','));
    });
  }
  return rows.join('\n');
}

/* ------------------------- Claude prompts ------------------------- */

function calibrationBlock(state, icp) {
  const ranked = rankedFor(state, icp.id).filter((e) => typeof e.sc.pct === 'number');
  if (!ranked.length) return '_No prospects scored against this profile yet — calibrate from the criteria alone._';
  const top = ranked.slice(0, 5);
  const L = ['These real prospects have already been scored against the sheet (weighted fit, 0–100):', ''];
  top.forEach((e) => {
    L.push(`- **${e.p.name}** (${e.p.domain || 'no domain'}) — fit ${e.p.dq ? 'DISQUALIFIED' : e.sc.pct}${e.p.dq && e.p.dqReason ? `: ${e.p.dqReason}` : ''}${e.p.note ? ` — note: ${e.p.note}` : ''}`);
  });
  return L.join('\n');
}

function promptResearch(state, icp) {
  return [
    'You are a senior B2B go-to-market researcher who builds evidence-backed market maps for boutique consultancies and agencies. You are rigorous about separating verified facts from inference, and you always name your sources or say "unverified".',
    '',
    'I run business development and I have drafted the following Ideal Customer Profile in my ICP Architect workspace. I need you to deep-research it so I can decide where to spend my next 90 days of outreach.',
    '',
    '# The profile under review',
    '',
    mdIcp(icp),
    '',
    '# Scoring evidence so far',
    '',
    calibrationBlock(state, icp),
    '',
    '# Your task',
    '',
    '1. **Market map.** Size the reachable segment implied by the firmographics (order-of-magnitude is fine — show your arithmetic). Name 3–5 sub-segments inside it and say which one is most underserved and why.',
    '2. **Watering holes.** Where do these exact buyers already gather? List communities, Slack/Discord groups, newsletters, podcasts, conferences, and LinkedIn voices they follow. Be specific — real names, not categories.',
    '3. **Trigger observatory.** For each buying trigger on the sheet, tell me the concrete, monitorable signal (job boards, funding databases, press patterns, LinkedIn searches) and how often to check it.',
    '4. **Message angles.** For each pain, give one outreach angle: the observation that proves I understand it, in one sentence a skeptical operator would respect.',
    '5. **Where this ICP is probably wrong.** The three most likely errors in this profile, and the cheapest test to falsify each within two weeks.',
    '',
    '# Output format',
    '',
    'Markdown, with the five numbered sections above as headings. Use tables for the watering holes and trigger observatory. Flag anything you could not verify as "unverified". End with a one-paragraph verdict: would you bet a quarter of pipeline on this ICP as drafted — yes or no, and what single change would most improve the odds.',
  ].join('\n');
}

function promptCritique(state, icp) {
  return [
    'You are a ruthless go-to-market advisor who has reviewed a thousand ICP documents and watched most of them fail in the field. You are on my side, which is why you do not flatter me. Red pen out.',
    '',
    'Below is an Ideal Customer Profile I drafted in my ICP Architect workspace, including the weighted fit criteria I use to score real prospects (each criterion is rated 0–3 and multiplied by its weight, 1–5).',
    '',
    '# The sheet',
    '',
    mdIcp(icp),
    '',
    '# Scoring evidence so far',
    '',
    calibrationBlock(state, icp),
    '',
    '# Your review, in this order',
    '',
    '1. **Grade each block** — firmographics, pains, triggers, disqualifiers, criteria — from 0–10 with one blunt sentence per grade.',
    '2. **Vagueness hunt.** Quote every phrase a stranger could not verify from the outside (e.g. "growing fast", "values quality"). For each, rewrite it as an observable fact.',
    '3. **Weight audit.** Given my weights, describe the company that would score 90+ yet be a terrible client. If you can construct one, my criteria are leaking — tell me which weight to change.',
    '4. **Disqualifier upgrade.** Propose 2–3 sharper disqualifiers I am missing, based on the pains and model described.',
    '5. **Rewrite the sheet.** Produce the full corrected ICP in the same structure (firmographics, pains, triggers, disqualifiers, criteria table with weights) so I can paste it back into my workspace field by field.',
    '',
    '# Rules',
    '',
    'No hedging, no "it depends" without saying on what. Prefer deleting a weak line to decorating it. If the whole ICP is two ICPs wearing a trenchcoat, say so and split them.',
  ].join('\n');
}

function promptLookalikes(state, icp) {
  return [
    'You are a meticulous prospect researcher for a B2B business-development team. Your specialty is turning an Ideal Customer Profile into a concrete investigation list — real, named companies, with an honest note on what still needs verifying.',
    '',
    '# The Ideal Customer Profile',
    '',
    mdIcp(icp),
    '',
    '# Calibration — what a good fit looks like',
    '',
    calibrationBlock(state, icp),
    '',
    '# Your task',
    '',
    'Generate **20 lookalike companies** that plausibly match this profile and are worth an hour of investigation each. Use companies you believe actually exist; if you are not certain a company still matches (size, ownership, stack), keep it on the list but say exactly what to verify first.',
    '',
    '# Hard rules',
    '',
    `- Respect every disqualifier on the sheet — if a company trips one, it does not belong on the list.`,
    '- No household-name enterprises; stay inside the firmographic bands.',
    '- Spread the list: at least 3 distinct sub-verticals, not 20 clones of the calibration examples.',
    '',
    '# Output format',
    '',
    'A markdown table with columns: **Company** · **Likely domain** · **Why it fits** (map to specific criteria numbers from the sheet) · **Probable trigger right now** · **Verify first** (the one fact to check before outreach) · **Best entry role** (title to approach). After the table, add a short "honesty footer": which 3 rows you are least confident about and why.',
  ].join('\n');
}

const COPILOT_ACTIONS = [
  {
    id: 'research', title: 'Site investigation', sub: 'Deep-research this ICP',
    icon: Microscope,
    desc: 'Market map, watering holes, monitorable trigger signals, message angles — and where the profile is probably wrong.',
    build: promptResearch,
  },
  {
    id: 'critique', title: 'Red-pen review', sub: 'Critique & tighten the sheet',
    icon: Eraser,
    desc: 'A ruthless advisor grades every block, hunts vague language, audits your weights, and rewrites the sheet.',
    build: promptCritique,
  },
  {
    id: 'lookalikes', title: 'Twenty lookalikes', sub: 'Prospects to investigate',
    icon: Users,
    desc: 'Twenty named companies matching the sheet, calibrated on your scored prospects, with a verify-first column.',
    build: promptLookalikes,
  },
];

/* --------------------------- utilities ---------------------------- */

async function copyText(txt) {
  try { await navigator.clipboard.writeText(txt); return true; } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove(); return true;
  } catch { return false; }
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

/* ------------------------- shared classes ------------------------- */

const BTN = 'inline-flex items-center gap-1.5 border border-graphite/60 bg-vellum px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-graphite transition-colors hover:bg-white active:translate-y-px select-none';
const BTN_DARK = 'inline-flex items-center gap-1.5 border border-graphite bg-graphite px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-paper transition-colors hover:bg-black active:translate-y-px select-none';
const ICONBTN = 'inline-flex h-7 w-7 items-center justify-center border border-transparent text-pencil2 transition-colors hover:border-hairline2 hover:bg-white hover:text-graphite';

/* ------------------------- tiny components ------------------------ */

function SectionLabel({ n, children, tone, right }) {
  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] font-semibold tracking-[0.2em] text-pencil2">{n}</span>
          <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em]" style={tone ? { color: tone } : undefined}>{children}</h3>
        </div>
        {right}
      </div>
      <div className="rule-double mt-1.5" />
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-pencil">{label}</span>
      <input className="field text-sm" {...props} />
    </label>
  );
}

function TierStamp({ tier, animate }) {
  const m = TIER_META[tier] || TIER_META.NR;
  return (
    <span className={`stamp text-[10px] ${animate ? 'anim-stamp' : ''}`} style={{ color: m.color }} title={m.hint}>
      {m.label}
    </span>
  );
}

/* Architectural dimension line: the studio's score visual */
function DimLine({ pct, w = 168, big = false, dq = false }) {
  const h = big ? 42 : 26;
  const pad = 8;
  const yb = big ? 29 : 18;
  const x0 = pad, x1 = w - pad, span = x1 - x0;
  const has = typeof pct === 'number';
  const val = has ? Math.max(0, Math.min(100, pct)) : 0;
  const xv = x0 + (span * val) / 100;
  const tone = dq ? 'var(--color-redline)' : has && pct >= 75 ? 'var(--color-draft)' : 'var(--color-graphite)';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden="true">
      {[0, 25, 50, 75, 100].map((t) => (
        <line key={t} x1={x0 + (span * t) / 100} y1={yb - 3.5} x2={x0 + (span * t) / 100} y2={yb + 3.5} stroke="var(--color-hairline2)" strokeWidth="1" />
      ))}
      <line x1={x0} y1={yb} x2={x1} y2={yb} stroke="var(--color-hairline2)" strokeWidth="1" />
      <line x1={x0 - 4} y1={yb + 4} x2={x0 + 4} y2={yb - 4} stroke="var(--color-graphite)" strokeWidth="1.2" />
      <line x1={x1 - 4} y1={yb + 4} x2={x1 + 4} y2={yb - 4} stroke="var(--color-graphite)" strokeWidth="1.2" />
      {has && <line x1={x0} y1={yb} x2={xv} y2={yb} stroke={tone} strokeWidth={big ? 3 : 2.5} />}
      {has && <line x1={xv - 4.5} y1={yb + 4.5} x2={xv + 4.5} y2={yb - 4.5} stroke={tone} strokeWidth="1.6" />}
      <text
        x={has ? Math.min(Math.max(xv, x0 + 12), x1 - 12) : x0}
        y={big ? 16 : 10}
        textAnchor={has ? 'middle' : 'start'}
        fontFamily="IBM Plex Mono, monospace"
        fontSize={big ? 14 : 10}
        fontWeight="600"
        fill={has ? tone : 'var(--color-pencil2)'}
      >
        {has ? (dq ? `${pct} DQ` : pct) : 'n/r'}
      </text>
    </svg>
  );
}

/* Signature hero: a drafted elevation of the "ideal customer" */
function HeroDrawing() {
  const G = 'var(--color-graphite)';
  const B = 'var(--color-draft)';
  const R = 'var(--color-redline)';
  const H = 'var(--color-hairline2)';
  const mono = 'IBM Plex Mono, monospace';
  return (
    <svg viewBox="0 0 560 250" className="h-auto w-full" role="img" aria-label="Architectural elevation drawing of an ideal customer profile, with dimension lines and a title block">
      {/* frame + registration crosses */}
      <rect x="6" y="6" width="548" height="238" fill="none" stroke={H} strokeWidth="1" />
      {[[20, 20], [540, 20], [20, 230], [376, 230]].map(([x, y], i) => (
        <g key={i} stroke={H} strokeWidth="1">
          <line x1={x - 5} y1={y} x2={x + 5} y2={y} /><line x1={x} y1={y - 5} x2={x} y2={y + 5} />
        </g>
      ))}
      {/* north arrow */}
      <g>
        <circle cx="52" cy="56" r="17" fill="none" stroke={G} strokeWidth="1" />
        <line x1="52" y1="69" x2="52" y2="45" stroke={G} strokeWidth="1" />
        <path d="M52 41 L48 51 L52 48.5 L56 51 Z" fill={B} stroke="none" />
        <text x="52" y="86" textAnchor="middle" fontFamily={mono} fontSize="8" fill={G}>N</text>
      </g>
      {/* ground line + hatching */}
      <line x1="90" y1="186" x2="470" y2="186" stroke={G} strokeWidth="1.4" className="anim-draw" style={{ '--dash': 380 }} />
      {Array.from({ length: 20 }).map((_, i) => (
        <line key={i} x1={96 + i * 19} y1={186} x2={88 + i * 19} y2={195} stroke={H} strokeWidth="1" />
      ))}
      {/* main block */}
      <rect x="160" y="88" width="132" height="98" fill="var(--color-vellum)" stroke={G} strokeWidth="1.4" />
      {/* window grid on main block */}
      {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => (
        <rect key={`${r}${c}`} x={172 + c * 30} y={100 + r * 26} width="18" height="14" fill="none" stroke={H} strokeWidth="1" />
      )))}
      {/* tower */}
      <rect x="236" y="46" width="72" height="42" fill="var(--color-vellum)" stroke={G} strokeWidth="1.4" />
      {[0, 1, 2].map((c) => (
        <rect key={c} x={245 + c * 21} y={56} width="12" height="10" fill="none" stroke={H} strokeWidth="1" />
      ))}
      {/* champion window, red-pencil circled */}
      <rect x={232 + 30} y={100} width="18" height="14" fill="var(--color-draftwash)" stroke={B} strokeWidth="1.2" />
      <ellipse cx="271" cy="107" rx="17" ry="12" fill="none" stroke={R} strokeWidth="1.3" strokeDasharray="3 3" />
      <line x1="286" y1="99" x2="330" y2="72" stroke={R} strokeWidth="1" />
      <text x="334" y="70" fontFamily={mono} fontSize="8.5" fill={R}>CHAMPION FLOOR</text>
      {/* door */}
      <rect x="216" y="160" width="20" height="26" fill="none" stroke={G} strokeWidth="1.2" />
      {/* disqualified lot */}
      <g>
        <rect x="96" y="126" width="48" height="60" fill="none" stroke={R} strokeWidth="1.1" strokeDasharray="4 3" />
        <line x1="96" y1="126" x2="144" y2="186" stroke={R} strokeWidth="1" />
        <line x1="144" y1="126" x2="96" y2="186" stroke={R} strokeWidth="1" />
        <text x="120" y="120" textAnchor="middle" fontFamily={mono} fontSize="8" fill={R}>DISQUAL. LOT</text>
      </g>
      {/* horizontal dimension: firmographics */}
      <g>
        <line x1="160" y1="192" x2="160" y2="212" stroke={H} strokeWidth="1" />
        <line x1="292" y1="192" x2="292" y2="212" stroke={H} strokeWidth="1" />
        <line x1="160" y1="207" x2="292" y2="207" stroke={B} strokeWidth="1.2" />
        <line x1="156" y1="211" x2="164" y2="203" stroke={B} strokeWidth="1.2" />
        <line x1="288" y1="211" x2="296" y2="203" stroke={B} strokeWidth="1.2" />
        <text x="226" y="221" textAnchor="middle" fontFamily={mono} fontSize="8.5" fill={B}>FIRMOGRAPHICS · 50–500 SEATS</text>
      </g>
      {/* vertical dimension: pain depth */}
      <g>
        <line x1="298" y1="46" x2="330" y2="46" stroke={H} strokeWidth="1" />
        <line x1="298" y1="186" x2="330" y2="186" stroke={H} strokeWidth="1" />
        <line x1="324" y1="46" x2="324" y2="186" stroke={G} strokeWidth="1" />
        <line x1="320" y1="50" x2="328" y2="42" stroke={G} strokeWidth="1.2" />
        <line x1="320" y1="190" x2="328" y2="182" stroke={G} strokeWidth="1.2" />
        <text x="333" y="120" fontFamily={mono} fontSize="8.5" fill={G} transform="rotate(90 333 120)">PAIN DEPTH · WEIGHTED</text>
      </g>
      {/* leader: trigger */}
      <g>
        <circle cx="272" cy="38" r="2" fill={B} />
        <line x1="272" y1="38" x2="272" y2="24" stroke={B} strokeWidth="1" />
        <line x1="272" y1="24" x2="352" y2="24" stroke={B} strokeWidth="1" />
        <text x="356" y="27" fontFamily={mono} fontSize="8.5" fill={B}>TRIGGER: NEW VP · DAY 38</text>
      </g>
      {/* title block */}
      <g>
        <rect x="384" y="192" width="162" height="44" fill="var(--color-vellum)" stroke={G} strokeWidth="1.2" />
        <line x1="384" y1="208" x2="546" y2="208" stroke={G} strokeWidth="0.8" />
        <line x1="384" y1="222" x2="546" y2="222" stroke={H} strokeWidth="0.8" />
        <text x="392" y="203" fontFamily={mono} fontSize="8.5" fontWeight="600" fill={G} letterSpacing="1.5">ICP ARCHITECT — STUDIO</text>
        <text x="392" y="218" fontFamily={mono} fontSize="7.5" fill={G}>SHT A-01 · IDEAL CUSTOMER, ELEVATION</text>
        <text x="392" y="232" fontFamily={mono} fontSize="7.5" fill={G}>SCALE 1:1 · REV C · CHECKED: CLAUDE</text>
      </g>
    </svg>
  );
}

/* ------------------------- list editor ---------------------------- */

function ListEditor({ code, title, tone, items, onItems, onRemove, placeholder, coach }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onItems([...items, v]);
    setDraft('');
  };
  return (
    <div className="min-w-0">
      <SectionLabel n={code} tone={tone}>{title}</SectionLabel>
      {items.length === 0 && <p className="mb-2 text-[13px] italic leading-snug text-pencil2">{coach}</p>}
      <ol className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span className="w-5 shrink-0 text-right font-mono text-[10px] text-pencil2">{String(i + 1).padStart(2, '0')}</span>
            <input
              className="field text-[13px]"
              value={it}
              onChange={(e) => onItems(items.map((x, j) => (j === i ? e.target.value : x)), true)}
              aria-label={`${title} item ${i + 1}`}
            />
            <button className={ICONBTN} onClick={() => onRemove(i)} aria-label={`Strike ${title} item ${i + 1}`}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="w-5 shrink-0" />
        <input
          className="field text-[13px]"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          aria-label={`Add to ${title}`}
        />
        <button className={ICONBTN} onClick={add} aria-label={`Add ${title} entry`}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* ============================== APP =============================== */

export default function App() {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? normalize(JSON.parse(raw)) : normalize(null);
    } catch { return normalize(null); }
  });
  const stateRef = useRef(state);
  stateRef.current = state;

  const [helpOpen, setHelpOpen] = useState(!state.seenGuide);
  const [confirm, setConfirm] = useState(null); // {title, body, verb, onYes}
  const [exportOpen, setExportOpen] = useState(false);
  const [drawerId, setDrawerId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [survey, setSurvey] = useState({ q: '', icpId: 'all', tiers: [], sort: 'fit' });
  const fileRef = useRef(null);
  const searchRef = useRef(null);
  const timersRef = useRef({});

  /* ---- autosave (debounced) ---- */
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
    }, 350);
    return () => clearTimeout(t);
  }, [state]);

  /* ---- toasts ---- */
  const dismissToast = (id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const h = timersRef.current[id];
    if (h) { clearTimeout(h); delete timersRef.current[id]; }
  };
  const pushToast = (msg, opts = {}) => {
    const id = uid();
    setToasts((t) => [...t.slice(-2), { id, msg, undo: opts.undo, kind: opts.kind || 'info' }]);
    timersRef.current[id] = setTimeout(() => dismissToast(id), opts.undo ? 7000 : 2600);
  };
  const mutateWithUndo = (msg, fn) => {
    const snap = stateRef.current;
    setState(fn);
    pushToast(msg, { undo: () => setState(snap), kind: 'undo' });
  };

  /* ---- derived ---- */
  const icpById = useMemo(() => Object.fromEntries(state.icps.map((i) => [i.id, i])), [state.icps]);
  const activeIcp = icpById[state.activeIcpId] || state.icps[0] || null;

  const enriched = useMemo(() => state.prospects.map((p) => {
    const icp = icpById[p.icpId];
    const sc = scoreProspect(icp, p);
    return { p, icp, sc, tier: icp ? tierOf(sc.pct, p.dq) : 'NR' };
  }), [state.prospects, icpById]);

  const stats = useMemo(() => {
    const scored = enriched.filter((e) => !e.p.dq && typeof e.sc.pct === 'number');
    const avg = scored.length ? Math.round(scored.reduce((s, e) => s + e.sc.pct, 0) / scored.length) : null;
    return {
      sheets: state.icps.length,
      prospects: state.prospects.length,
      avg,
      aCount: enriched.filter((e) => e.tier === 'A').length,
      dqCount: enriched.filter((e) => e.p.dq).length,
    };
  }, [enriched, state.icps.length, state.prospects.length]);

  /* ---- icp mutations ---- */
  const setTab = (tab) => setState((s) => ({ ...s, tab }));
  const patchIcp = (id, patch) =>
    setState((s) => ({ ...s, icps: s.icps.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: Date.now() } : i)) }));
  const addIcp = () => {
    const n = state.icps.length + 1;
    const icp = normalizeIcp({ id: uid(), code: `SHT-${String(n).padStart(2, '0')}`, name: '', criteria: [] });
    setState((s) => ({ ...s, icps: [...s.icps, icp], activeIcpId: icp.id, tab: 'sheets' }));
  };
  const deleteIcp = (id) => {
    const icp = icpById[id];
    mutateWithUndo(`Sheet ${icp?.code || ''} struck from the index.`, (s) => {
      const icps = s.icps.filter((i) => i.id !== id);
      return { ...s, icps, activeIcpId: s.activeIcpId === id ? (icps[0]?.id ?? null) : s.activeIcpId };
    });
  };

  /* ---- prospect mutations ---- */
  const patchProspect = (id, patch) =>
    setState((s) => ({ ...s, prospects: s.prospects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  const addProspect = () => {
    if (!state.icps.length) {
      pushToast('Draft a sheet first — a survey needs a drawing to measure against.');
      setTab('sheets');
      return;
    }
    const p = normalizeProspect({ id: uid(), icpId: activeIcp?.id || state.icps[0].id });
    setState((s) => ({ ...s, prospects: [p, ...s.prospects], tab: 'survey' }));
    setDrawerId(p.id);
  };
  const deleteProspect = (id) => {
    const p = state.prospects.find((x) => x.id === id);
    setDrawerId((d) => (d === id ? null : d));
    mutateWithUndo(`"${p?.name || 'Untitled prospect'}" struck from the survey.`, (s) => ({
      ...s, prospects: s.prospects.filter((x) => x.id !== id),
    }));
  };

  /* ---- exports ---- */
  const doCopyMarkdown = async () => {
    const ok = await copyText(mdPortfolio(stateRef.current));
    pushToast(ok ? 'Portfolio markdown copied to clipboard.' : 'Copy failed — your browser blocked the clipboard.');
  };
  const doJson = () => download('icp-architect-portfolio.json', JSON.stringify(stateRef.current, null, 2), 'application/json');
  const doCsv = () => download('icp-architect-prospects.csv', csvProspects(stateRef.current), 'text/csv');
  const doImport = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = normalize(JSON.parse(String(reader.result)));
        next.seenGuide = true;
        setState(next);
        pushToast(`Imported ${next.icps.length} sheet(s) and ${next.prospects.length} prospect(s).`);
      } catch { pushToast('Import failed — that file is not a valid portfolio JSON.'); }
    };
    reader.readAsText(file);
  };

  /* ---- keyboard ---- */
  const keyCtx = useRef({});
  keyCtx.current = { helpOpen, confirm, exportOpen, drawerId, tab: state.tab };
  useEffect(() => {
    const onKey = (e) => {
      const k = keyCtx.current;
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault(); doCopyMarkdown(); return;
      }
      if (e.key === 'Escape') {
        if (k.exportOpen) setExportOpen(false);
        else if (k.confirm) setConfirm(null);
        else if (k.drawerId) setDrawerId(null);
        else if (k.helpOpen) closeHelp();
        return;
      }
      if (typing) return;
      if (e.key === '?') { e.preventDefault(); setHelpOpen(true); return; }
      if (e.key === '/' && k.tab === 'survey') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const closeHelp = () => {
    setHelpOpen(false);
    setState((s) => (s.seenGuide ? s : { ...s, seenGuide: true }));
  };

  /* ---- header actions ---- */
  const askLoadDemo = () => {
    const hasData = state.icps.length || state.prospects.length;
    const load = () => { setState(demoState()); setConfirm(null); pushToast('Demo studio loaded — two sheets, nine surveyed prospects.'); };
    if (hasData) {
      setConfirm({
        title: 'Overwrite the drafting table?',
        body: 'Loading the demo replaces your current sheets and survey. Export JSON first if you want a copy.',
        verb: 'Load demo', onYes: load,
      });
    } else load();
  };
  const askReset = () => setConfirm({
    title: 'Clear the studio?',
    body: 'This strikes every sheet and every surveyed prospect. There is no undo for a full reset — export JSON first if in doubt.',
    verb: 'Reset everything', danger: true,
    onYes: () => { setState({ ...normalize(null), seenGuide: true }); setConfirm(null); pushToast('Studio cleared. Fresh vellum.'); },
  });

  /* ================================================================ */

  return (
    <div className="board-ground min-h-screen font-body text-graphite">
      {/* ============ interactive app (hidden in print) ============ */}
      <div className="print:hidden">
        <div className="mx-auto max-w-[1240px] px-4 pb-24 pt-6 sm:px-6">

          {/* ---------------- hero ---------------- */}
          <header className="sheet sheet-ticks relative overflow-hidden">
            <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-stretch">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-pencil2">
                  Studio sheet 01 · BizDev suite · Rev C
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center border-[1.5px] border-graphite bg-vellum2">
                    <DraftingCompass className="h-6 w-6 text-draft" aria-hidden="true" />
                  </span>
                  <h1 className="font-display text-[34px] font-extrabold leading-none tracking-tight sm:text-[42px]">
                    ICP&nbsp;Architect
                  </h1>
                </div>
                <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-pencil">
                  Draft your Ideal Customer Profiles like working drawings — firmographics, pains, triggers,
                  disqualifiers — then weight the criteria and score real prospects against the sheet before
                  you spend a single outreach hour.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button className={BTN_DARK} onClick={askLoadDemo}>
                    <Layers className="h-3.5 w-3.5" aria-hidden="true" /> Load demo
                  </button>
                  <button className={BTN} onClick={askReset}>
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
                  </button>
                  <button className={BTN} onClick={() => setHelpOpen(true)}>
                    <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" /> How to use
                  </button>
                  <div className="relative">
                    <button className={BTN} onClick={() => setExportOpen((v) => !v)} aria-haspopup="menu" aria-expanded={exportOpen}>
                      <Download className="h-3.5 w-3.5" aria-hidden="true" /> Export
                      <ChevronDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                    {exportOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} aria-hidden="true" />
                        <div role="menu" className="sheet absolute left-0 z-50 mt-1 w-60 p-1.5">
                          {[
                            { icon: FileText, label: 'Copy Markdown portfolio', act: () => { doCopyMarkdown(); } },
                            { icon: FileJson, label: 'Download JSON (full state)', act: doJson },
                            { icon: FileSpreadsheet, label: 'Download prospects CSV', act: doCsv },
                            { icon: Upload, label: 'Import JSON…', act: () => fileRef.current?.click() },
                            { icon: Printer, label: 'Print active sheet', act: () => window.print() },
                          ].map((m) => (
                            <button key={m.label} role="menuitem"
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-graphite hover:bg-draftwash"
                              onClick={() => { setExportOpen(false); m.act(); }}>
                              <m.icon className="h-3.5 w-3.5 text-pencil" aria-hidden="true" /> {m.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
                    aria-label="Import portfolio JSON"
                    onChange={(e) => { doImport(e.target.files?.[0]); e.target.value = ''; }} />
                </div>
              </div>
              <div className="hidden w-[46%] max-w-[520px] shrink-0 self-center md:block" aria-hidden="true">
                <HeroDrawing />
              </div>
            </div>

            {/* schedule of quantities */}
            <div className="grid grid-cols-2 border-t border-hairline2 bg-vellum2 font-mono sm:grid-cols-4">
              {[
                { k: 'Sheets on file', v: stats.sheets },
                { k: 'Prospects surveyed', v: stats.prospects },
                { k: 'Mean fit, live', v: stats.avg === null ? 'n/r' : stats.avg, dim: true },
                { k: 'Tier A / struck', v: `${stats.aCount} / ${stats.dqCount}` },
              ].map((c, i) => (
                <div key={c.k} className={`px-5 py-3 ${i > 0 ? 'border-l border-hairline2' : ''} ${i >= 2 ? 'max-sm:border-t' : ''} max-sm:odd:border-l-0`}>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-pencil2">{c.k}</div>
                  {c.dim && stats.avg !== null
                    ? <DimLine pct={stats.avg} w={150} />
                    : <div className="mt-0.5 text-xl font-semibold tabular-nums">{c.v}</div>}
                </div>
              ))}
            </div>
          </header>

          {/* ---------------- tabs ---------------- */}
          <nav className="mt-6 flex flex-wrap items-end gap-1 border-b border-graphite/60" aria-label="Workspace areas">
            {[
              { id: 'sheets', label: 'A · Drafting table', n: state.icps.length },
              { id: 'survey', label: 'B · Site survey', n: state.prospects.length },
              { id: 'copilot', label: 'C · Claude copilot', n: null },
            ].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                aria-current={state.tab === t.id ? 'page' : undefined}
                className={`border border-b-0 px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                  state.tab === t.id
                    ? 'border-graphite/60 bg-graphite text-paper'
                    : 'border-hairline2 bg-vellum2 text-pencil hover:bg-vellum hover:text-graphite'
                }`}>
                {t.label}{t.n !== null && <span className={`ml-2 tabular-nums ${state.tab === t.id ? 'text-paper/60' : 'text-pencil2'}`}>{t.n}</span>}
              </button>
            ))}
          </nav>

          {/* ---------------- views ---------------- */}
          <main className="pt-6">
            {state.tab === 'sheets' && (
              <DraftingTable
                state={state} activeIcp={activeIcp}
                onSelect={(id) => setState((s) => ({ ...s, activeIcpId: id }))}
                onAdd={addIcp} onDelete={deleteIcp} onPatch={patchIcp}
                enriched={enriched}
                mutateWithUndo={mutateWithUndo}
                gotoSurvey={(icpId) => { setSurvey((f) => ({ ...f, icpId })); setTab('survey'); }}
              />
            )}
            {state.tab === 'survey' && (
              <SiteSurvey
                state={state} enriched={enriched} survey={survey} setSurvey={setSurvey}
                searchRef={searchRef}
                onAdd={addProspect} onOpen={setDrawerId} onDelete={deleteProspect}
              />
            )}
            {state.tab === 'copilot' && (
              <CopilotDesk
                state={state} activeIcp={activeIcp}
                onSelect={(id) => setState((s) => ({ ...s, activeIcpId: id }))}
                onPatch={patchIcp} pushToast={pushToast}
              />
            )}
          </main>
        </div>
      </div>

      {/* ================= print artifact ================= */}
      <PrintSheet state={state} activeIcp={activeIcp} />

      {/* ================= overlays ================= */}
      {drawerId && (
        <ScoreDrawer
          key={drawerId}
          prospect={state.prospects.find((p) => p.id === drawerId)}
          icps={state.icps} icpById={icpById}
          onPatch={patchProspect}
          onDelete={() => deleteProspect(drawerId)}
          onClose={() => setDrawerId(null)}
        />
      )}

      {helpOpen && <HelpModal onClose={closeHelp} />}

      {confirm && (
        <Modal onClose={() => setConfirm(null)} label={confirm.title} narrow>
          <div className="p-6">
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center border ${confirm.danger ? 'border-redline text-redline' : 'border-graphite text-graphite'}`}>
                <TriangleAlert className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-lg font-extrabold tracking-tight">{confirm.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-pencil">{confirm.body}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className={BTN} onClick={() => setConfirm(null)}>Keep drafting</button>
              <button
                className={`${BTN_DARK} ${confirm.danger ? '!border-redline !bg-redline' : ''}`}
                onClick={confirm.onYes}>
                {confirm.verb}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= toasts ================= */}
      <div className="pointer-events-none fixed bottom-4 left-4 z-[70] flex w-[min(92vw,380px)] flex-col gap-2 print:hidden" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="anim-toast pointer-events-auto flex items-center gap-3 border border-graphite bg-graphite px-4 py-3 text-paper shadow-lg">
            <Stamp className="h-4 w-4 shrink-0 text-paper/60" aria-hidden="true" />
            <p className="min-w-0 flex-1 font-mono text-[11.5px] leading-snug">{t.msg}</p>
            {t.undo && (
              <button
                className="inline-flex shrink-0 items-center gap-1 border border-paper/40 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] hover:bg-white/10"
                onClick={() => { t.undo(); dismissToast(t.id); }}>
                <Undo2 className="h-3 w-3" aria-hidden="true" /> Undo
              </button>
            )}
            <button className="shrink-0 text-paper/60 hover:text-paper" onClick={() => dismissToast(t.id)} aria-label="Dismiss notice">
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========================= drafting table ========================= */

function DraftingTable({ state, activeIcp, onSelect, onAdd, onDelete, onPatch, enriched, mutateWithUndo, gotoSurvey }) {
  if (!state.icps.length) {
    return (
      <div className="pencil-dash mx-auto max-w-2xl px-8 py-16 text-center">
        <DraftingCompass className="mx-auto h-10 w-10 text-pencil2" aria-hidden="true" />
        <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight">Blank vellum</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-pencil">
          Every good pipeline starts as a drawing. Draft your first Ideal Customer Profile — who they are,
          what hurts, why now, and when to walk away — then weight the criteria you can actually verify.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button className={BTN_DARK} onClick={onAdd}><PenLine className="h-3.5 w-3.5" aria-hidden="true" /> Draft first sheet</button>
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-pencil2">or load the demo studio from the header</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[290px_minmax(0,1fr)]">
      {/* -------- sheet index -------- */}
      <aside>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-pencil">Sheet index</h2>
          <button className={BTN} onClick={onAdd}><Plus className="h-3.5 w-3.5" aria-hidden="true" /> New sheet</button>
        </div>
        <ul className="space-y-2">
          {state.icps.map((icp) => {
            const mine = enriched.filter((e) => e.p.icpId === icp.id);
            const scored = mine.filter((e) => !e.p.dq && typeof e.sc.pct === 'number');
            const avg = scored.length ? Math.round(scored.reduce((s, e) => s + e.sc.pct, 0) / scored.length) : null;
            const active = activeIcp && activeIcp.id === icp.id;
            return (
              <li key={icp.id} className="relative">
                <button
                  onClick={() => onSelect(icp.id)}
                  className={`sheet w-full p-3.5 pr-10 text-left transition-shadow ${active ? 'sheet--flat !border-draft' : 'sheet--flat hover:!border-pencil2'}`}
                  style={active ? { boxShadow: 'inset 3px 0 0 var(--color-draft)' } : undefined}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`font-mono text-[10px] font-semibold tracking-[0.18em] ${active ? 'text-draft' : 'text-pencil2'}`}>{icp.code}</span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-pencil2">rev {fmtDate(icp.updatedAt).slice(5)}</span>
                  </div>
                  <div className="mt-0.5 truncate font-display text-[15px] font-semibold leading-tight">
                    {icp.name || <span className="italic text-pencil2">Untitled profile</span>}
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 font-mono text-[10px] text-pencil">
                    <span>{icp.criteria.length} crit.</span>
                    <span>{mine.length} pros.</span>
                    <span className={avg !== null && avg >= 75 ? 'font-semibold text-draft' : ''}>{avg !== null ? `μ ${avg}` : 'μ n/r'}</span>
                  </div>
                </button>
                <button
                  className={`${ICONBTN} absolute right-1.5 top-1.5`}
                  onClick={() => onDelete(icp.id)}
                  aria-label={`Strike sheet ${icp.code} ${icp.name || ''}`}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-[12px] italic leading-relaxed text-pencil2">
          Keep sheets few and sharp. Two profiles you can verify beat six you can admire.
        </p>
      </aside>

      {/* -------- active sheet editor -------- */}
      {activeIcp && (
        <SheetEditor key={activeIcp.id}
          icp={activeIcp} onPatch={onPatch} enriched={enriched}
          mutateWithUndo={mutateWithUndo} gotoSurvey={gotoSurvey} />
      )}
    </div>
  );
}

function SheetEditor({ icp, onPatch, enriched, mutateWithUndo, gotoSurvey }) {
  const set = (patch) => onPatch(icp.id, patch);
  const setFirmo = (k, v) => set({ firmo: { ...icp.firmo, [k]: v } });
  const mine = enriched.filter((e) => e.p.icpId === icp.id);
  const scored = mine.filter((e) => !e.p.dq && typeof e.sc.pct === 'number');
  const avg = scored.length ? Math.round(scored.reduce((s, e) => s + e.sc.pct, 0) / scored.length) : null;
  const totalWeight = icp.criteria.reduce((s, c) => s + c.weight, 0);

  const listProps = (key, tone) => ({
    items: icp[key],
    tone,
    onItems: (items) => set({ [key]: items }),
    onRemove: (i) => {
      const item = icp[key][i];
      mutateWithUndo(`Struck "${(item || 'entry').slice(0, 42)}${(item || '').length > 42 ? '…' : ''}"`, (s) => ({
        ...s,
        icps: s.icps.map((x) => (x.id === icp.id ? { ...x, [key]: x[key].filter((_, j) => j !== i), updatedAt: Date.now() } : x)),
      }));
    },
  });

  const moveCriterion = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= icp.criteria.length) return;
    const next = [...icp.criteria];
    [next[i], next[j]] = [next[j], next[i]];
    set({ criteria: next });
  };
  const deleteCriterion = (i) => {
    const c = icp.criteria[i];
    mutateWithUndo(`Criterion "${(c.label || 'unnamed').slice(0, 36)}" struck.`, (s) => ({
      ...s,
      icps: s.icps.map((x) => (x.id === icp.id ? { ...x, criteria: x.criteria.filter((_, j) => j !== i), updatedAt: Date.now() } : x)),
    }));
  };

  return (
    <section className="sheet sheet-ticks p-5 sm:p-7">
      {/* identity */}
      <SectionLabel n="00" right={
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-pencil2">drawn {fmtDate(icp.createdAt)} · rev {fmtDate(icp.updatedAt)}</span>
      }>Profile identity</SectionLabel>
      <div className="grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)]">
        <Field label="Sheet no." value={icp.code} onChange={(e) => set({ code: e.target.value })} placeholder="SHT-01" style={{ fontFamily: 'var(--font-mono)' }} />
        <label className="block min-w-0">
          <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-pencil">Profile name</span>
          <input className="field font-display text-lg font-bold tracking-tight" value={icp.name}
            onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Scale-Up SaaS · RevOps Rebuild" />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-pencil">One-line thesis — who, and why they buy</span>
        <textarea className="field resize-y text-sm leading-relaxed" rows={2} value={icp.summary}
          onChange={(e) => set({ summary: e.target.value })}
          placeholder="The company in one sentence a stranger could verify from the outside." />
      </label>

      {/* firmographics */}
      <div className="mt-7">
        <SectionLabel n="01">Firmographics — the lot &amp; structure</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Industry / vertical" value={icp.firmo.industry} onChange={(e) => setFirmo('industry', e.target.value)} placeholder="B2B SaaS — dev tools…" />
          <Field label="Headcount" value={icp.firmo.headcount} onChange={(e) => setFirmo('headcount', e.target.value)} placeholder="50–300 · sales org 8–40" />
          <Field label="Revenue band" value={icp.firmo.revenue} onChange={(e) => setFirmo('revenue', e.target.value)} placeholder="$8M–$40M ARR" />
          <Field label="Geography" value={icp.firmo.geo} onChange={(e) => setFirmo('geo', e.target.value)} placeholder="US & Western Europe" />
          <Field label="Business model" value={icp.firmo.model} onChange={(e) => setFirmo('model', e.target.value)} placeholder="Sales-led, PLG attached" />
          <Field label="Tooling & stack signals" value={icp.firmo.stack} onChange={(e) => setFirmo('stack', e.target.value)} placeholder="HubSpot or Salesforce…" />
        </div>
      </div>

      {/* pains / triggers / disqualifiers */}
      <div className="mt-7 grid gap-7 lg:grid-cols-3 lg:gap-5">
        <ListEditor code="02" title="Pains — what hurts" placeholder="Add a pain…"
          coach="What is broken, in their words? Write pains you could quote from a discovery call."
          {...listProps('pains')} />
        <ListEditor code="03" title="Buying triggers — why now" placeholder="Add a trigger…"
          coach="Events that open the wallet: a hire, a raise, a deadline, a breach. Observable from outside."
          {...listProps('triggers', 'var(--color-draft)')} />
        <ListEditor code="04" title="Disqualifiers — walk away" placeholder="Add a disqualifier…"
          coach="The red-pencil list. If any line is true, strike the prospect — no matter how nice the logo."
          {...listProps('disquals', 'var(--color-redline)')} />
      </div>

      {/* criteria matrix */}
      <div className="mt-8">
        <SectionLabel n="05" right={
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-pencil2">Σ weight {totalWeight} · max score 100</span>
        }>Fit criteria &amp; load-bearing weights</SectionLabel>
        {icp.criteria.length === 0 && (
          <p className="mb-3 text-[13px] italic leading-snug text-pencil2">
            Criteria are the structure the score hangs on. Add 5–8 verifiable checks; weight 5 for load-bearing walls, 1 for trim.
          </p>
        )}
        <ol className="space-y-2">
          {icp.criteria.map((c, i) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 border border-hairline bg-vellum2 p-2 pl-3 sm:flex-nowrap">
              <span className="w-5 shrink-0 font-mono text-[10px] text-pencil2">{String(i + 1).padStart(2, '0')}</span>
              <input className="field min-w-[200px] flex-1 text-[13px]" value={c.label}
                onChange={(e) => set({ criteria: icp.criteria.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                placeholder="Verifiable check — e.g. sales org between 8 and 40 seats"
                aria-label={`Criterion ${i + 1} label`} />
              <div className="flex items-center gap-1" role="group" aria-label={`Criterion ${i + 1} weight`}>
                {[1, 2, 3, 4, 5].map((wgt) => (
                  <button key={wgt}
                    onClick={() => set({ criteria: icp.criteria.map((x, j) => (j === i ? { ...x, weight: wgt } : x)) })}
                    aria-label={`Set weight ${wgt}`} aria-pressed={c.weight === wgt}
                    className={`h-7 w-7 border font-mono text-[11px] font-semibold transition-colors ${
                      c.weight === wgt
                        ? 'border-draft bg-draft text-white'
                        : wgt <= c.weight
                          ? 'border-draft/50 bg-draftwash text-draftink'
                          : 'border-hairline2 bg-white text-pencil2 hover:border-pencil2'
                    }`}>
                    {wgt}
                  </button>
                ))}
              </div>
              <div className="flex items-center">
                <button className={ICONBTN} onClick={() => moveCriterion(i, -1)} disabled={i === 0} aria-label={`Move criterion ${i + 1} up`}>
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button className={ICONBTN} onClick={() => moveCriterion(i, 1)} disabled={i === icp.criteria.length - 1} aria-label={`Move criterion ${i + 1} down`}>
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button className={ICONBTN} onClick={() => deleteCriterion(i)} aria-label={`Strike criterion ${i + 1}`}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ol>
        <button className={`${BTN} mt-3`}
          onClick={() => set({ criteria: [...icp.criteria, { id: uid(), label: '', weight: 3 }] })}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add criterion
        </button>
      </div>

      {/* title block + sheet rollup */}
      <div className="mt-8 flex flex-col gap-4 border-t border-graphite/50 pt-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-pencil sm:grid-cols-3">
          <span>Project: pipeline</span>
          <span>Sheet: {icp.code || '—'}</span>
          <span>Scale 1:1</span>
          <span>Criteria: {icp.criteria.length}</span>
          <span>Drawn by: you</span>
          <span>Checked by: Claude</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-pencil2">Mean fit · {scored.length} scored</div>
            <DimLine pct={avg} w={190} big />
          </div>
          <button className={BTN_DARK} onClick={() => gotoSurvey(icp.id)}>
            <Ruler className="h-3.5 w-3.5" aria-hidden="true" /> Survey prospects
          </button>
        </div>
      </div>
    </section>
  );
}

/* =========================== site survey ========================== */

function SiteSurvey({ state, enriched, survey, setSurvey, searchRef, onAdd, onOpen, onDelete }) {
  const q = survey.q.trim().toLowerCase();
  const filtered = enriched
    .filter((e) => survey.icpId === 'all' || e.p.icpId === survey.icpId)
    .filter((e) => !survey.tiers.length || survey.tiers.includes(e.tier))
    .filter((e) => !q || [e.p.name, e.p.domain, e.p.note, e.icp?.name, e.icp?.code].some((s) => (s || '').toLowerCase().includes(q)));

  const sorted = [...filtered].sort((a, b) => {
    if (survey.sort === 'name') return (a.p.name || 'zzz').localeCompare(b.p.name || 'zzz');
    if (survey.sort === 'newest') return b.p.addedAt - a.p.addedAt;
    return (a.p.dq ? 1 : 0) - (b.p.dq ? 1 : 0) || (b.sc.pct ?? -1) - (a.sc.pct ?? -1);
  });

  const toggleTier = (t) => setSurvey((f) => ({ ...f, tiers: f.tiers.includes(t) ? f.tiers.filter((x) => x !== t) : [...f.tiers, t] }));

  return (
    <div>
      {/* toolbar */}
      <div className="sheet sheet--flat mb-5 flex flex-wrap items-center gap-2.5 p-3">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-pencil2" aria-hidden="true" />
          <input ref={searchRef} className="field pl-8 text-[13px]" placeholder="Search the survey…  ( / )"
            value={survey.q} onChange={(e) => setSurvey((f) => ({ ...f, q: e.target.value }))}
            aria-label="Search prospects" />
        </div>
        <select className="field w-auto text-[12px]" value={survey.icpId}
          onChange={(e) => setSurvey((f) => ({ ...f, icpId: e.target.value }))} aria-label="Filter by sheet">
          <option value="all">All sheets</option>
          {state.icps.map((i) => <option key={i.id} value={i.id}>{i.code} — {i.name || 'Untitled'}</option>)}
        </select>
        <div className="flex items-center gap-1" role="group" aria-label="Filter by tier">
          {['A', 'B', 'C', 'D', 'DQ'].map((t) => (
            <button key={t} onClick={() => toggleTier(t)} aria-pressed={survey.tiers.includes(t)}
              className={`border px-2 py-1.5 font-mono text-[10px] font-semibold tracking-[0.12em] transition-colors ${
                survey.tiers.includes(t)
                  ? 'border-graphite bg-graphite text-paper'
                  : 'border-hairline2 bg-white text-pencil hover:border-pencil2'
              }`}>
              {t}
            </button>
          ))}
        </div>
        <select className="field w-auto text-[12px]" value={survey.sort}
          onChange={(e) => setSurvey((f) => ({ ...f, sort: e.target.value }))} aria-label="Sort prospects">
          <option value="fit">Sort: fit, high first</option>
          <option value="newest">Sort: newest</option>
          <option value="name">Sort: name A–Z</option>
        </select>
        <button className={BTN_DARK} onClick={onAdd}><Plus className="h-3.5 w-3.5" aria-hidden="true" /> Log prospect</button>
      </div>

      {/* list */}
      {state.prospects.length === 0 ? (
        <div className="pencil-dash px-8 py-14 text-center">
          <Target className="mx-auto h-9 w-9 text-pencil2" aria-hidden="true" />
          <h2 className="mt-3 font-display text-xl font-extrabold tracking-tight">No prospects on the survey yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-pencil">
            Log real companies and measure them against a sheet, criterion by criterion.
            The ranked list tells you where to spend Monday morning.
          </p>
          <button className={`${BTN_DARK} mt-5`} onClick={onAdd}><Plus className="h-3.5 w-3.5" aria-hidden="true" /> Log first prospect</button>
        </div>
      ) : (
        <div className="sheet overflow-x-auto">
          <div className="min-w-[780px]">
            <div className="grid grid-cols-[44px_minmax(190px,1.4fr)_120px_86px_190px_92px_84px] items-center gap-2 border-b border-graphite/50 bg-vellum2 px-4 py-2 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-pencil2">
              <span>Rank</span><span>Company</span><span>Sheet</span><span>Coverage</span><span>Weighted fit 0–100</span><span>Tier</span>
              <span className="text-right">Actions</span>
            </div>
            <ul>
              {sorted.map((e, idx) => (
                <li key={e.p.id}
                  className={`group grid cursor-pointer grid-cols-[44px_minmax(190px,1.4fr)_120px_86px_190px_92px_84px] items-center gap-2 border-b border-hairline px-4 py-2.5 transition-colors hover:bg-white ${e.p.dq ? 'bg-redwash/60' : ''}`}
                  onClick={() => onOpen(e.p.id)}>
                  <span className="font-mono text-[13px] font-semibold tabular-nums text-pencil2">{String(idx + 1).padStart(2, '0')}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold leading-tight">
                      {e.p.name || <span className="italic text-pencil2">Untitled prospect</span>}
                    </span>
                    <span className="block truncate font-mono text-[10.5px] text-pencil2">{e.p.domain || '—'}</span>
                  </span>
                  <span className="truncate font-mono text-[10.5px] font-semibold tracking-[0.1em] text-pencil">
                    {e.icp ? e.icp.code : <span className="text-redline">UNFILED</span>}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-pencil">
                    {e.sc.total ? `${e.sc.rated}/${e.sc.total}` : '—'}
                    {e.sc.low && e.sc.rated > 0 && <span className="ml-1 text-[8.5px] font-semibold uppercase text-seal" title="Less than 60% of criteria rated">low</span>}
                  </span>
                  <DimLine pct={e.sc.pct} w={180} dq={e.p.dq} />
                  <TierStamp tier={e.tier} />
                  <span className="flex justify-end gap-0.5">
                    <button className={ICONBTN} onClick={(ev) => { ev.stopPropagation(); onOpen(e.p.id); }} aria-label={`Score ${e.p.name || 'prospect'}`}>
                      <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button className={ICONBTN} onClick={(ev) => { ev.stopPropagation(); onDelete(e.p.id); }} aria-label={`Strike ${e.p.name || 'prospect'} from survey`}>
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            {sorted.length === 0 && (
              <p className="px-4 py-8 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-pencil2">
                Nothing matches these filters — loosen the survey.
              </p>
            )}
          </div>
        </div>
      )}
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-pencil2">
        Scores measure rated criteria only — low coverage is flagged. Rate before you trust.
      </p>
    </div>
  );
}

/* ========================== score drawer ========================== */

function ScoreDrawer({ prospect, icps, icpById, onPatch, onDelete, onClose }) {
  if (!prospect) return null;
  const icp = icpById[prospect.icpId];
  const sc = scoreProspect(icp, prospect);
  const tier = icp ? tierOf(sc.pct, prospect.dq) : 'NR';
  const set = (patch) => onPatch(prospect.id, patch);
  const rate = (cid, v) => {
    const ratings = { ...prospect.ratings };
    if (ratings[cid] === v) delete ratings[cid]; else ratings[cid] = v;
    set({ ratings });
  };
  return (
    <>
      <div className="fixed inset-0 z-[55] bg-graphite/25 print:hidden" onClick={onClose} aria-hidden="true" />
      <aside className="anim-drawer fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col border-l border-graphite bg-vellum shadow-2xl print:hidden"
        role="dialog" aria-modal="true" aria-label="Survey and score prospect">
        <header className="border-b border-hairline2 bg-vellum2 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-pencil2">Site survey · field card</span>
            <button className={ICONBTN} onClick={onClose} aria-label="Close survey card">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <input className="field mt-2 font-display text-lg font-bold tracking-tight" value={prospect.name}
            onChange={(e) => set({ name: e.target.value })} placeholder="Company name" aria-label="Prospect name" autoFocus />
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <input className="field font-mono text-[12px]" value={prospect.domain}
              onChange={(e) => set({ domain: e.target.value })} placeholder="domain.com" aria-label="Prospect domain" />
            <select className="field w-auto font-mono text-[11px]" value={prospect.icpId || ''}
              onChange={(e) => set({ icpId: e.target.value })} aria-label="Score against sheet">
              {!icp && <option value="">Choose sheet…</option>}
              {icps.map((i) => <option key={i.id} value={i.id}>{i.code}</option>)}
            </select>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {/* live measurement */}
          <div className="sheet sheet--flat flex items-center justify-between gap-3 p-3">
            <div>
              <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-pencil2">Weighted fit · {sc.rated}/{sc.total} rated</div>
              <DimLine pct={sc.pct} w={200} big dq={prospect.dq} />
            </div>
            <TierStamp tier={tier} animate />
          </div>
          {sc.low && sc.rated > 0 && (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-seal">
              Low coverage — rate more criteria before trusting this number.
            </p>
          )}

          {/* disqualify */}
          <div className={`mt-4 border p-3 ${prospect.dq ? 'border-redline bg-redwash' : 'border-hairline2 bg-vellum2'}`}>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" checked={prospect.dq} onChange={(e) => set({ dq: e.target.checked })}
                className="h-4 w-4 accent-[#bf4429]" />
              <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-redline">
                <Ban className="h-3.5 w-3.5" aria-hidden="true" /> Disqualified — strike from ranking
              </span>
            </label>
            {prospect.dq && (
              <input className="field mt-2 text-[12.5px]" value={prospect.dqReason}
                onChange={(e) => set({ dqReason: e.target.value })}
                placeholder="Which disqualifier did it trip?" aria-label="Disqualification reason" />
            )}
          </div>

          {/* criteria */}
          <div className="mt-5">
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-pencil">Measure against {icp ? icp.code : '—'}</h3>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-pencil2">0 miss · 1 partial · 2 solid · 3 exact</span>
            </div>
            {!icp && (
              <p className="pencil-dash p-4 text-[13px] italic text-pencil2">
                This prospect has no sheet — choose one above to measure against.
              </p>
            )}
            {icp && icp.criteria.length === 0 && (
              <p className="pencil-dash p-4 text-[13px] italic text-pencil2">
                {icp.code} has no fit criteria yet. Draft them on the Drafting Table first.
              </p>
            )}
            <ul className="space-y-2">
              {icp && icp.criteria.map((c, i) => {
                const r = prospect.ratings[c.id];
                return (
                  <li key={c.id} className="border border-hairline bg-white/60 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12.5px] leading-snug">
                        <span className="mr-1.5 font-mono text-[9.5px] text-pencil2">{String(i + 1).padStart(2, '0')}</span>
                        {c.label || <span className="italic text-pencil2">unnamed criterion</span>}
                      </p>
                      <span className="shrink-0 border border-hairline2 bg-vellum2 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-pencil" title={`Weight ${c.weight} of 5`}>w{c.weight}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1" role="group" aria-label={`Rate: ${c.label || `criterion ${i + 1}`}`}>
                      {[0, 1, 2, 3].map((v) => (
                        <button key={v} onClick={() => rate(c.id, v)} aria-pressed={r === v}
                          aria-label={`${v} — ${RATING_WORDS[v]}`} title={RATING_WORDS[v]}
                          className={`h-8 flex-1 border font-mono text-[12px] font-semibold transition-colors ${
                            r === v
                              ? v === 0 ? 'border-redline bg-redline text-white' : 'border-draft bg-draft text-white'
                              : 'border-hairline2 bg-white text-pencil hover:border-pencil2'
                          }`}>
                          {v}
                        </button>
                      ))}
                      <span className="ml-1 w-14 text-right font-mono text-[9.5px] uppercase tracking-[0.08em] text-pencil2">
                        {typeof r === 'number' ? RATING_WORDS[r] : 'unrated'}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* notes */}
          <label className="mt-5 block">
            <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-pencil">Field notes</span>
            <textarea className="field resize-y text-[13px] leading-relaxed" rows={3} value={prospect.note}
              onChange={(e) => set({ note: e.target.value })}
              placeholder="Intro paths, trigger evidence, who to approach…" />
          </label>
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-hairline2 bg-vellum2 px-5 py-3">
          <button className={`${BTN} !border-redline !text-redline hover:!bg-redwash`} onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Strike
          </button>
          <button className={BTN_DARK} onClick={onClose}><Check className="h-3.5 w-3.5" aria-hidden="true" /> Done</button>
        </footer>
      </aside>
    </>
  );
}

/* ========================== copilot desk ========================== */

function CopilotDesk({ state, activeIcp, onSelect, onPatch, pushToast }) {
  const [copied, setCopied] = useState(null);
  const [viewing, setViewing] = useState(null);
  const icp = activeIcp;

  if (!state.icps.length) {
    return (
      <div className="pencil-dash mx-auto max-w-2xl px-8 py-16 text-center">
        <NotebookPen className="mx-auto h-9 w-9 text-pencil2" aria-hidden="true" />
        <h2 className="mt-3 font-display text-xl font-extrabold tracking-tight">The consultation desk is empty</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-pencil">
          Draft at least one ICP sheet, then bring it here. Each action writes a complete, expert-grade prompt
          around your sheet — copy it into claude.ai and let Claude do the heavy research.
        </p>
      </div>
    );
  }

  const doCopy = async (action) => {
    const ok = await copyText(action.build(state, icp));
    if (ok) {
      setCopied(action.id);
      setTimeout(() => setCopied((c) => (c === action.id ? null : c)), 2000);
    } else pushToast('Copy failed — your browser blocked the clipboard.');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div>
        <div className="sheet sheet-ticks p-5 sm:p-6">
          <SectionLabel n="C1">Consultation desk — pair with your Claude subscription</SectionLabel>
          <p className="text-sm leading-relaxed text-pencil">
            No API keys, no extra bill. Each action below writes a complete prompt — role, your sheet serialized
            as markdown, scoring evidence, the ask, and an output format — ready to paste into{' '}
            <span className="font-semibold text-graphite">claude.ai</span>. Works with the standard $20 Claude subscription.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-pencil">Consulting on sheet</span>
            <select className="field w-auto font-mono text-[12px]" value={icp.id}
              onChange={(e) => onSelect(e.target.value)} aria-label="Choose sheet for Claude prompts">
              {state.icps.map((i) => <option key={i.id} value={i.id}>{i.code} — {i.name || 'Untitled'}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {COPILOT_ACTIONS.map((a) => (
            <article key={a.id} className="sheet p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center border-[1.5px] border-graphite bg-vellum2">
                    <a.icon className="h-5 w-5 text-draft" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-[17px] font-extrabold leading-tight tracking-tight">{a.title}</h3>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-pencil2">{a.sub}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button className={BTN} onClick={() => setViewing((v) => (v === a.id ? null : a.id))} aria-expanded={viewing === a.id}>
                    <ChevronRight className={`h-3.5 w-3.5 transition-transform ${viewing === a.id ? 'rotate-90' : ''}`} aria-hidden="true" />
                    {viewing === a.id ? 'Hide' : 'View'}
                  </button>
                  <button className={BTN_DARK} onClick={() => doCopy(a)}>
                    {copied === a.id
                      ? <><Check className="h-3.5 w-3.5" aria-hidden="true" /> Copied</>
                      : <><Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy prompt</>}
                  </button>
                </div>
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-pencil">{a.desc}</p>
              {viewing === a.id && (
                <textarea readOnly value={a.build(state, icp)}
                  className="field mt-3 h-52 w-full resize-y font-mono text-[11px] leading-relaxed"
                  aria-label={`Prompt preview: ${a.title}`} onFocus={(e) => e.target.select()} />
              )}
              <p className="mt-2.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-pencil2">
                Paste into claude.ai — works with the standard Claude subscription
              </p>
            </article>
          ))}
        </div>
      </div>

      {/* findings ledger */}
      <aside>
        <div className="sheet sheet-ticks p-5 sm:p-6">
          <SectionLabel n="C2" tone="var(--color-draft)">Findings ledger — {icp.code}</SectionLabel>
          <p className="text-[13px] leading-relaxed text-pencil">
            Paste the useful parts of Claude&rsquo;s answer here. It saves with the sheet and travels with your
            JSON export — so the research stays welded to the profile it belongs to.
          </p>
          <textarea
            className="field mt-3 h-[420px] w-full resize-y font-mono text-[12px] leading-relaxed"
            value={icp.findings}
            onChange={(e) => onPatch(icp.id, { findings: e.target.value })}
            placeholder={'CLAUDE SURVEY · pasted <date>\n- Finding one…\n- Watering holes…\n- Signals to monitor…'}
            aria-label="Findings ledger for this sheet" />
          <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-pencil2">Autosaves as you type</p>
        </div>
      </aside>
    </div>
  );
}

/* ============================ modals ============================== */

function Modal({ children, onClose, label, narrow }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4 print:hidden">
      <div className="absolute inset-0 bg-graphite/30" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={label}
        className={`anim-modal sheet sheet-ticks relative z-10 max-h-[88vh] w-full overflow-y-auto ${narrow ? 'max-w-md' : 'max-w-2xl'}`}>
        {children}
      </div>
    </div>
  );
}

function HelpModal({ onClose }) {
  const steps = [
    ['Draft a sheet', 'On the Drafting Table, hit New sheet. Name the profile and write the one-line thesis a stranger could verify.'],
    ['Fill the four blocks', 'Firmographics (the lot and structure), pains (what hurts), buying triggers (why now), disqualifiers (when to walk away).'],
    ['Weight the criteria', 'Add 5–8 verifiable fit checks. Weight 5 = load-bearing wall, 1 = trim. The score hangs on this structure.'],
    ['Log prospects', 'Switch to the Site Survey and log real companies against a sheet — name, domain, field notes.'],
    ['Measure, 0 to 3', 'Open a prospect and rate each criterion: 0 miss, 1 partial, 2 solid, 3 exact. The weighted fit and tier update live. Disqualify ruthlessly.'],
    ['Read the ranking', 'The survey ranks by weighted fit, disqualified at the bottom. Work Tier A first; treat low-coverage scores as rumors.'],
    ['Consult Claude', 'On the Copilot desk, copy a prompt (deep research, red-pen critique, twenty lookalikes) into claude.ai. Paste findings back into the ledger.'],
    ['Export the drawings', 'Markdown portfolio, prospects CSV, or full JSON. Import JSON on any machine — your data lives in this browser only.'],
  ];
  const keys = [
    ['?', 'Open this guide'],
    ['Esc', 'Close menus, drawers, and dialogs'],
    ['Ctrl / Cmd + S', 'Copy the markdown portfolio'],
    ['/', 'Focus search on the Site Survey'],
    ['Enter', 'Commit a new list entry'],
  ];
  return (
    <Modal onClose={onClose} label="How to use ICP Architect">
      <div className="p-6 sm:p-8">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-pencil2">Working drawing · read once</p>
        <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight">How to use the studio</h2>
        <ol className="mt-5 space-y-3">
          {steps.map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="mt-0.5 h-6 w-6 shrink-0 border border-graphite text-center font-mono text-[11px] font-semibold leading-6">{i + 1}</span>
              <p className="text-sm leading-relaxed"><span className="font-semibold">{t}.</span> <span className="text-pencil">{d}</span></p>
            </li>
          ))}
        </ol>
        <div className="mt-6">
          <SectionLabel n="K">Keyboard</SectionLabel>
          <div className="grid gap-y-1.5 sm:grid-cols-2 sm:gap-x-8">
            {keys.map(([k, d]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 border-b border-hairline pb-1.5">
                <kbd className="border border-hairline2 bg-vellum2 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold">{k}</kbd>
                <span className="text-[12.5px] text-pencil">{d}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button className={BTN_DARK} onClick={onClose}><Check className="h-3.5 w-3.5" aria-hidden="true" /> To the drafting table</button>
        </div>
      </div>
    </Modal>
  );
}

/* ========================= print artifact ========================= */

function PrintSheet({ state, activeIcp }) {
  const icp = activeIcp;
  return (
    <div className="hidden print:block">
      <div className="mb-6 flex items-baseline justify-between border-b-2 border-graphite pb-2">
        <span className="font-display text-2xl font-extrabold tracking-tight">ICP Architect</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Exported {fmtDate(Date.now())}</span>
      </div>
      {!icp && <p className="italic">No profile drafted yet.</p>}
      {icp && (
        <div>
          <h1 className="font-display text-xl font-extrabold">{icp.code} — {icp.name || 'Untitled profile'}</h1>
          {icp.summary && <p className="mt-1 italic">{icp.summary}</p>}
          <h2 className="mt-4 font-mono text-[11px] font-semibold uppercase tracking-[0.2em]">Firmographics</h2>
          <ul className="mt-1 list-disc pl-5 text-[13px]">
            {Object.entries({
              'Industry / vertical': icp.firmo.industry, Headcount: icp.firmo.headcount,
              'Revenue band': icp.firmo.revenue, Geography: icp.firmo.geo,
              'Business model': icp.firmo.model, 'Tooling & stack': icp.firmo.stack,
            }).filter(([, v]) => v).map(([k, v]) => <li key={k}><strong>{k}:</strong> {v}</li>)}
          </ul>
          {[['Pains — what hurts', icp.pains], ['Buying triggers — why now', icp.triggers], ['Disqualifiers — walk away', icp.disquals]].map(([t, items]) => (
            items.length ? (
              <div key={t}>
                <h2 className="mt-4 font-mono text-[11px] font-semibold uppercase tracking-[0.2em]">{t}</h2>
                <ol className="mt-1 list-decimal pl-5 text-[13px]">{items.map((x, i) => <li key={i}>{x}</li>)}</ol>
              </div>
            ) : null
          ))}
          {icp.criteria.length > 0 && (
            <div>
              <h2 className="mt-4 font-mono text-[11px] font-semibold uppercase tracking-[0.2em]">Fit criteria &amp; weights</h2>
              <table className="mt-1 w-full border-collapse text-[12.5px]">
                <thead><tr>
                  <th className="border border-graphite px-2 py-1 text-left font-mono text-[10px] uppercase">#</th>
                  <th className="border border-graphite px-2 py-1 text-left font-mono text-[10px] uppercase">Criterion</th>
                  <th className="border border-graphite px-2 py-1 text-left font-mono text-[10px] uppercase">Weight</th>
                </tr></thead>
                <tbody>
                  {icp.criteria.map((c, i) => (
                    <tr key={c.id}>
                      <td className="border border-hairline2 px-2 py-1 font-mono">{i + 1}</td>
                      <td className="border border-hairline2 px-2 py-1">{c.label}</td>
                      <td className="border border-hairline2 px-2 py-1 font-mono">{c.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <h2 className="mt-4 font-mono text-[11px] font-semibold uppercase tracking-[0.2em]">Ranked survey vs {icp.code}</h2>
          <table className="mt-1 w-full border-collapse text-[12.5px]">
            <thead><tr>
              {['Rank', 'Company', 'Domain', 'Fit', 'Tier', 'Coverage', 'Note'].map((h) => (
                <th key={h} className="border border-graphite px-2 py-1 text-left font-mono text-[10px] uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rankedFor(state, icp.id).map((e, i) => (
                <tr key={e.p.id}>
                  <td className="border border-hairline2 px-2 py-1 font-mono">{i + 1}</td>
                  <td className="border border-hairline2 px-2 py-1 font-semibold">{e.p.name || 'Untitled'}</td>
                  <td className="border border-hairline2 px-2 py-1 font-mono">{e.p.domain}</td>
                  <td className="border border-hairline2 px-2 py-1 font-mono">{e.p.dq ? 'DQ' : (typeof e.sc.pct === 'number' ? e.sc.pct : 'n/r')}</td>
                  <td className="border border-hairline2 px-2 py-1 font-mono">{TIER_META[e.tier].label}</td>
                  <td className="border border-hairline2 px-2 py-1 font-mono">{e.sc.rated}/{e.sc.total}</td>
                  <td className="border border-hairline2 px-2 py-1">{[e.p.dq && e.p.dqReason, e.p.note].filter(Boolean).join(' — ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-6 border-t border-graphite pt-2 font-mono text-[9px] uppercase tracking-[0.2em]">
            Sheet {icp.code} · scale 1:1 · drawn by you · checked by Claude · icp-architect studio print
          </p>
        </div>
      )}
    </div>
  );
}
