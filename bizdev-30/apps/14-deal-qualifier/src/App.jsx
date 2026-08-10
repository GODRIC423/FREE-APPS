import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Plus, Trash2, RotateCcw, BookOpen, Search, Copy, Check, X,
  ChevronLeft, ChevronRight, ChevronDown, Flag, ShieldCheck, CircleHelp,
  MessageSquareQuote, FileDown, FileUp, FileText, Stamp, Bot, Undo2,
  SlidersHorizontal, TriangleAlert, ClipboardCopy, Printer, Link2,
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
    try { window.parent.postMessage({ bizdev: 'ready', v: 1, slug: '14-deal-qualifier' }, '*'); } catch {}
    return () => window.removeEventListener('message', onMsg);
  }, []);
  return ctx;
}

/* ================================================================
   CONSTANTS — the checkpoint's rulebook
================================================================ */
const LS_KEY = 'bizdev:14-deal-qualifier:v1';

const STAGES = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Commit'];

const STATUS_META = {
  unknown: { label: 'No papers', factor: 0, tone: 'deny' },
  claimed: { label: 'Claimed', factor: 0.5, tone: 'caution' },
  verified: { label: 'Verified', factor: 1, tone: 'clear' },
};

const PILLARS = [
  {
    key: 'metrics', code: 'MTR', lane: 'LANE 01', title: 'Metrics',
    ask: 'What measurable result justifies this purchase?',
    probes: [
      'Which number moves if they buy — and by how much, by when?',
      'Who inside the account has agreed that number matters?',
      'Is the metric written in their words anywhere (email, deck, pilot report)?',
    ],
    coach: 'A deal without a number is a conversation, not a deal.',
  },
  {
    key: 'buyer', code: 'BYR', lane: 'LANE 02', title: 'Economic Buyer',
    ask: 'Who can actually sign, and have you met them?',
    probes: [
      'Name the person whose budget this comes out of.',
      'Have they spent 30+ minutes with you — or only heard about you?',
      'What do they personally win if this succeeds?',
    ],
    coach: 'If you cannot name the signer, someone else is running your deal.',
  },
  {
    key: 'process', code: 'PRC', lane: 'LANE 03', title: 'Decision Process',
    ask: 'What are the exact steps between today and a signature?',
    probes: [
      'Who else must approve — legal, security, procurement, finance?',
      'What is their paper process and how long did it take last time?',
      'Is there a date-driven reason this closes when you say it will?',
    ],
    coach: 'Deals slip in the steps you never asked about.',
  },
  {
    key: 'pain', code: 'PAI', lane: 'LANE 04', title: 'Identified Pain',
    ask: 'What breaks or bleeds if they do nothing?',
    probes: [
      'What does the problem cost them per month, in their own estimate?',
      'Who feels it daily, and who gets blamed for it?',
      'Why act now instead of next fiscal year?',
    ],
    coach: 'No pain, no urgency. No urgency, no close date you control.',
  },
  {
    key: 'champion', code: 'CHM', lane: 'LANE 05', title: 'Champion',
    ask: 'Who sells for you when you are not in the room?',
    probes: [
      'Have they given you inside information they did not have to share?',
      'Have they taken a personal risk for this deal (booked the EB, pushed back)?',
      'Do they gain influence or budget if this lands?',
    ],
    coach: 'A friendly contact is not a champion. A champion has skin in it.',
  },
  {
    key: 'competition', code: 'CMP', lane: 'LANE 06', title: 'Competition',
    ask: 'Who else is in the room — including "do nothing"?',
    probes: [
      'Which vendors are being evaluated, and who is incumbent?',
      'What would make them build it internally or defer entirely?',
      'What is your champion saying about you versus the field?',
    ],
    coach: 'The rival you have not named is the one that beats you.',
  },
];

const DEFAULT_WEIGHTS = { metrics: 20, buyer: 20, process: 15, pain: 20, champion: 15, competition: 10 };
const CRITICAL = ['pain', 'buyer', 'champion'];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const money = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n) || 0);

/* ================================================================
   STATE — normalize survives anything
================================================================ */
function blankPillars() {
  const o = {};
  for (const p of PILLARS) o[p.key] = { status: 'unknown', evidence: '' };
  return o;
}

function blankDeal(partial = {}) {
  return {
    id: uid(),
    name: '', company: '', value: 0, closeDate: '', repStage: 'Discovery',
    notes: '', debrief: '',
    pillars: blankPillars(),
    createdAt: Date.now(), updatedAt: Date.now(),
    ...partial,
  };
}

function normalize(raw) {
  const base = { deals: [], weights: { ...DEFAULT_WEIGHTS }, seenGuide: false, portfolioDebrief: '' };
  if (!raw || typeof raw !== 'object') return base;
  const out = { ...base };
  out.seenGuide = raw.seenGuide === true;
  out.portfolioDebrief = typeof raw.portfolioDebrief === 'string' ? raw.portfolioDebrief : '';
  if (raw.weights && typeof raw.weights === 'object') {
    for (const p of PILLARS) {
      const w = Number(raw.weights[p.key]);
      out.weights[p.key] = Number.isFinite(w) ? Math.min(30, Math.max(5, Math.round(w))) : DEFAULT_WEIGHTS[p.key];
    }
  }
  if (Array.isArray(raw.deals)) {
    out.deals = raw.deals.filter((d) => d && typeof d === 'object').map((d) => {
      const nd = blankDeal();
      nd.id = typeof d.id === 'string' && d.id ? d.id : uid();
      nd.name = typeof d.name === 'string' ? d.name : '';
      nd.company = typeof d.company === 'string' ? d.company : '';
      nd.value = Number.isFinite(Number(d.value)) ? Math.max(0, Number(d.value)) : 0;
      nd.closeDate = typeof d.closeDate === 'string' ? d.closeDate : '';
      nd.repStage = STAGES.includes(d.repStage) ? d.repStage : 'Discovery';
      nd.notes = typeof d.notes === 'string' ? d.notes : '';
      nd.debrief = typeof d.debrief === 'string' ? d.debrief : '';
      nd.createdAt = Number.isFinite(d.createdAt) ? d.createdAt : Date.now();
      nd.updatedAt = Number.isFinite(d.updatedAt) ? d.updatedAt : Date.now();
      if (d.pillars && typeof d.pillars === 'object') {
        for (const p of PILLARS) {
          const src = d.pillars[p.key];
          if (src && typeof src === 'object') {
            nd.pillars[p.key] = {
              status: ['unknown', 'claimed', 'verified'].includes(src.status) ? src.status : 'unknown',
              evidence: typeof src.evidence === 'string' ? src.evidence : '',
            };
          }
        }
      }
      return nd;
    });
  }
  return out;
}

function loadState() {
  try { return normalize(JSON.parse(localStorage.getItem(LS_KEY))); }
  catch { return normalize(null); }
}

/* ================================================================
   SCORING — truth engine
================================================================ */
function dealScore(deal, weights) {
  let tw = 0, sum = 0;
  for (const p of PILLARS) {
    const w = weights[p.key] || 0;
    tw += w;
    sum += w * STATUS_META[deal.pillars[p.key].status].factor;
  }
  return tw ? Math.round((sum / tw) * 100) : 0;
}

function recommendStageIdx(deal, score) {
  let idx = score >= 85 ? 4 : score >= 70 ? 3 : score >= 50 ? 2 : score >= 30 ? 1 : 0;
  if (deal.pillars.pain.status === 'unknown' || deal.pillars.buyer.status === 'unknown') idx = Math.min(idx, 1);
  if (deal.pillars.champion.status === 'unknown') idx = Math.min(idx, 2);
  return idx;
}

function verdictOf(deal, score) {
  const criticalsVerified = CRITICAL.every((k) => deal.pillars[k].status === 'verified');
  if (score >= 70 && criticalsVerified) return { key: 'CLEARED', tone: 'clear', note: 'Evidence supports the forecast.' };
  if (score >= 45) return { key: 'CONDITIONAL', tone: 'caution', note: 'Advance only after gaps close.' };
  return { key: 'HELD AT GATE', tone: 'deny', note: 'Not enough papers to forecast this deal.' };
}

function gapsOf(deal) {
  const gaps = [];
  for (const p of PILLARS) {
    const { status, evidence } = deal.pillars[p.key];
    if (status === 'unknown') gaps.push({ pillar: p, sev: 'high', label: `${p.title}: no papers — nothing on file.` });
    else if (status === 'claimed') gaps.push({ pillar: p, sev: 'mid', label: `${p.title}: claimed but never verified.` });
    else if (!evidence.trim()) gaps.push({ pillar: p, sev: 'low', label: `${p.title}: verified with no evidence written down.` });
  }
  return gaps;
}

function inspect(deal, weights) {
  const score = dealScore(deal, weights);
  const recIdx = recommendStageIdx(deal, score);
  const repIdx = STAGES.indexOf(deal.repStage);
  return {
    score, recIdx, repIdx,
    recStage: STAGES[recIdx],
    hopeGap: repIdx - recIdx,
    verdict: verdictOf(deal, score),
    gaps: gapsOf(deal),
  };
}

/* ================================================================
   DEMO DATA — a realistic mid-year pipeline
================================================================ */
function demoState() {
  const mk = (over, pillarOver) => {
    const d = blankDeal(over);
    for (const k of Object.keys(pillarOver)) d.pillars[k] = pillarOver[k];
    return d;
  };
  return normalize({
    seenGuide: true,
    weights: { ...DEFAULT_WEIGHTS },
    deals: [
      mk({
        name: 'TMS platform, 3-yr agreement', company: 'Meridian Freight', value: 84000,
        closeDate: '2026-08-28', repStage: 'Negotiation',
        notes: 'Pilot ran across the Ohio Valley lanes in May. Legal redlines back Friday. Dana wants this live before peak season.',
      }, {
        metrics: { status: 'verified', evidence: 'Pilot cut detention fees 14% ($11.2k/mo run-rate). Dana presented the number to the ops council on Jun 12 — deck on file.' },
        buyer: { status: 'verified', evidence: 'COO Marcus Webb. 45-min call Jun 3; he asked for the 3-yr price himself and named the budget line (Ops Transformation).' },
        process: { status: 'verified', evidence: 'Security review passed Jun 20. MSA with legal now; procurement says 2-week turn. Signature: Webb only.' },
        pain: { status: 'verified', evidence: 'Detention + deadhead costing ~$130k/qtr per their own finance pull. Board flagged it in Q1 letter.' },
        champion: { status: 'verified', evidence: 'Dana Okafor (VP Ops) booked the EB meeting, shared the rival bid, and is presenting the rollout plan internally.' },
        competition: { status: 'claimed', evidence: 'Dana says project44 was cut after pilot, but no written confirmation the eval closed.' },
      }),
      mk({
        name: 'Patient recall automation', company: 'Bluepeak Dental Group', value: 18500,
        closeDate: '2026-07-31', repStage: 'Commit',
        notes: 'Office manager loves the demo. Feels hot — but every hard question is still open. Classic hope deal.',
      }, {
        metrics: { status: 'claimed', evidence: 'They "think" no-shows cost a lot. No number agreed.' },
        buyer: { status: 'unknown', evidence: '' },
        process: { status: 'unknown', evidence: '' },
        pain: { status: 'claimed', evidence: 'Front desk complains about recall calls eating mornings. Owner-dentist has not said it is a priority.' },
        champion: { status: 'claimed', evidence: 'Office manager enthusiastic but has never bought software before and will not intro the owner yet.' },
        competition: { status: 'unknown', evidence: '' },
      }),
      mk({
        name: 'Customer onboarding overhaul', company: 'Arcadia Robotics', value: 42000,
        closeDate: '2026-09-15', repStage: 'Proposal',
        notes: 'Strong pain, real champion. Need the CFO meeting — Priya keeps offering to "relay" instead.',
      }, {
        metrics: { status: 'verified', evidence: 'Agreed target: cut time-to-first-value from 62 to 30 days. Priya co-wrote the success plan Jun 25.' },
        buyer: { status: 'claimed', evidence: 'CFO Tomas Ruiz holds budget per Priya. Never met him; meeting requested twice.' },
        process: { status: 'claimed', evidence: 'Priya believes it is CFO sign-off plus a security questionnaire. Not confirmed with anyone in finance.' },
        pain: { status: 'verified', evidence: 'Two churned logos in Q2 cited onboarding. CS lead showed me the churn post-mortems.' },
        champion: { status: 'verified', evidence: 'Priya Nair (Head of CS) shared the churn docs unprompted and pushed back on her own VP over timeline.' },
        competition: { status: 'claimed', evidence: 'Says "we might just hire a CS ops person instead." Internal-build is the real rival.' },
      }),
      mk({
        name: 'Client intake analytics', company: 'Halvorsen & Reed LLP', value: 27000,
        closeDate: '2026-10-30', repStage: 'Qualification',
        notes: 'Early and honestly staged. Managing partner interested after the webinar. Next: quantify lost-intake cost with their numbers.',
      }, {
        metrics: { status: 'unknown', evidence: '' },
        buyer: { status: 'claimed', evidence: 'Likely managing partner Erik Halvorsen; partners vote on spend >$20k, per the office administrator.' },
        process: { status: 'unknown', evidence: '' },
        pain: { status: 'claimed', evidence: 'Erik said intake "leaks" evening and weekend leads. No cost attached yet.' },
        champion: { status: 'unknown', evidence: '' },
        competition: { status: 'unknown', evidence: '' },
      }),
      mk({
        name: 'Field ops rollout, 400 techs', company: 'Vantage Grid Services', value: 130000,
        closeDate: '2026-09-30', repStage: 'Proposal',
        notes: 'Biggest deal on the board. Everything checks except competition — RFP means at least two rivals I have not mapped.',
      }, {
        metrics: { status: 'verified', evidence: 'Target: +2 jobs/tech/week. Their ops analyst modeled $1.9M annual impact; model shared under NDA.' },
        buyer: { status: 'verified', evidence: 'SVP Field Ops Carla Mendes. Met twice; she owns the modernization budget approved in March.' },
        process: { status: 'claimed', evidence: 'Formal RFP. Scoring rubric promised but not yet shared; IT review timeline unknown.' },
        pain: { status: 'verified', evidence: 'Missed SLA penalties $400k last year — figure came from Carla in the kickoff, confirmed by analyst.' },
        champion: { status: 'claimed', evidence: 'Ops analyst Dev is helpful and shares freely, but has no seat at the decision table.' },
        competition: { status: 'unknown', evidence: '' },
      }),
      mk({
        name: 'Route optimization pilot', company: 'Copperline Brewing Co-op', value: 9800,
        closeDate: '2026-11-20', repStage: 'Discovery',
        notes: 'Two conversations in. Small but could anchor the craft-beverage vertical. Staged where it belongs.',
      }, {
        metrics: { status: 'unknown', evidence: '' },
        buyer: { status: 'unknown', evidence: '' },
        process: { status: 'unknown', evidence: '' },
        pain: { status: 'claimed', evidence: 'GM mentioned drivers doing "coffee-shop routing" and missed self-distribution windows.' },
        champion: { status: 'unknown', evidence: '' },
        competition: { status: 'unknown', evidence: '' },
      }),
    ],
  });
}

/* ================================================================
   SERIALIZATION — markdown, csv, prompts
================================================================ */
function dealMarkdown(deal, weights) {
  const r = inspect(deal, weights);
  const lines = [];
  lines.push(`### ${deal.company || 'Unnamed account'} — ${deal.name || 'Untitled deal'}`);
  lines.push('');
  lines.push(`- Value: ${money(deal.value)} · Target close: ${deal.closeDate || 'unset'}`);
  lines.push(`- Rep-stated stage: **${deal.repStage}** · Evidence-supported stage: **${r.recStage}**${r.hopeGap > 0 ? ` · HOPE GAP: +${r.hopeGap} stage${r.hopeGap > 1 ? 's' : ''} ahead of evidence` : ''}`);
  lines.push(`- Deal score: **${r.score}/100** · Verdict: **${r.verdict.key}**`);
  lines.push('');
  lines.push('| Pillar | Weight | Status | Evidence on file |');
  lines.push('| --- | --- | --- | --- |');
  for (const p of PILLARS) {
    const pl = deal.pillars[p.key];
    lines.push(`| ${p.title} | ${weights[p.key]} | ${STATUS_META[pl.status].label} | ${pl.evidence.trim().replace(/\n/g, ' ') || '—'} |`);
  }
  if (r.gaps.length) {
    lines.push('');
    lines.push(`Open gaps (${r.gaps.length}): ${r.gaps.map((g) => g.label).join(' · ')}`);
  }
  if (deal.notes.trim()) {
    lines.push('');
    lines.push(`Notes: ${deal.notes.trim()}`);
  }
  return lines.join('\n');
}

function ledgerMarkdown(state) {
  const { deals, weights } = state;
  const rows = deals.map((d) => ({ d, r: inspect(d, weights) })).sort((a, b) => b.r.score - a.r.score);
  const stated = deals.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const honest = rows.reduce((s, { d, r }) => s + (Number(d.value) || 0) * (r.score / 100), 0);
  const lines = [];
  lines.push('# Checkpoint Ledger — Deal Qualifier');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString().slice(0, 10)} · ${deals.length} deal${deals.length === 1 ? '' : 's'} in the queue`);
  lines.push('');
  lines.push(`- Stated pipeline: **${money(stated)}**`);
  lines.push(`- Evidence-weighted pipeline: **${money(honest)}**`);
  lines.push(`- Truth gap: **${stated ? Math.round(100 - (honest / stated) * 100) : 0}%** of stated value is not yet backed by evidence`);
  lines.push('');
  lines.push('| Deal | Value | Rep stage | Evidence stage | Score | Verdict | Gaps |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const { d, r } of rows) {
    lines.push(`| ${d.company || '—'} — ${d.name || 'Untitled'} | ${money(d.value)} | ${d.repStage} | ${r.recStage} | ${r.score} | ${r.verdict.key} | ${r.gaps.length} |`);
  }
  lines.push('');
  lines.push('---');
  for (const { d } of rows) {
    lines.push('');
    lines.push(dealMarkdown(d, weights));
  }
  return lines.join('\n');
}

function csvOf(state) {
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const head = ['company', 'deal', 'value_usd', 'close_date', 'rep_stage', 'evidence_stage', 'score', 'verdict', 'open_gaps', ...PILLARS.map((p) => p.key + '_status')];
  const rows = state.deals.map((d) => {
    const r = inspect(d, state.weights);
    return [d.company, d.name, d.value, d.closeDate, d.repStage, r.recStage, r.score, r.verdict.key, r.gaps.length, ...PILLARS.map((p) => d.pillars[p.key].status)].map(esc).join(',');
  });
  return [head.join(','), ...rows].join('\n');
}

/* ---- Copilot prompt builders ---- */
const COPILOT_HINT = 'Paste into claude.ai — works with the standard Claude subscription. No API key needed.';

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

function promptInterrogate(deal, weights, consoleCtx) {
  return withConsoleContext(`You are a ruthless enterprise deal inspector trained on MEDDICC. You have reviewed thousands of qualification sheets and you know that sellers systematically over-trust friendly signals and under-collect hard evidence. Your job is to find where this deal will actually die.

Below is my qualification sheet for one live deal, exported from my Deal Qualifier checkpoint. Status meanings: "Verified" = confirmed with evidence, "Claimed" = someone said it but it is unconfirmed, "No papers" = we know nothing.

${dealMarkdown(deal, weights)}

Interrogate this deal:

1. **Blind spots** — the 5 most dangerous things I am probably assuming. For each: why my own evidence (or its absence) suggests it, and the single question that would expose the truth.
2. **Kill risks** — the 2 most likely ways this deal dies, written as short scenarios with a probability guess (low/med/high).
3. **Evidence audit** — any pillar marked Verified whose evidence looks thinner than the status implies. Be blunt.
4. **Score challenge** — do you agree with the ${inspect(deal, weights).score}/100 score and the ${inspect(deal, weights).recStage} stage? If not, what stage does the evidence actually support?

Format: four numbered sections with bold headers, tight bullets, no pleasantries. If information is missing, say what is missing rather than inventing facts about the account.`, consoleCtx);
}

function promptGapQuestions(deal, weights, consoleCtx) {
  const r = inspect(deal, weights);
  const gapList = r.gaps.length
    ? r.gaps.map((g) => `- ${g.pillar.title} (${STATUS_META[deal.pillars[g.pillar.key].status].label}): ${g.label}`).join('\n')
    : '- No open gaps flagged — stress-test the verified pillars instead.';
  return withConsoleContext(`You are a sales coach who writes discovery questions that real buyers answer honestly — specific, low-pressure, impossible to bluff past. I need to close the information gaps on one deal before my next call.

My qualification sheet:

${dealMarkdown(deal, weights)}

The flagged gaps, in priority order:
${gapList}

For each gap, draft:
1. **The live-call version** — one conversational question I can ask my contact verbally. Natural phrasing, not interrogation.
2. **The written version** — one sentence I could drop into an email or Slack message.
3. **What a good answer sounds like** vs. **what a warning-sign answer sounds like** (one line each).

Then finish with a **call plan**: the 3 questions I should ask first in a single 30-minute call if I can only cover three, and why those three.

Format: one short section per gap with the gap name as a bold header, then the call plan. Keep every question under 25 words.`, consoleCtx);
}

function promptMemo(deal, weights, consoleCtx) {
  const r = inspect(deal, weights);
  return withConsoleContext(`You are a revenue leader writing an internal go/no-go memo about one deal. You are honest to the point of discomfort: the memo's job is to protect the team's time and the forecast's credibility, not to keep a deal alive.

The qualification sheet, exported from my Deal Qualifier checkpoint:

${dealMarkdown(deal, weights)}

Current machine verdict: ${r.verdict.key} at ${r.score}/100, evidence supports stage "${r.recStage}" while the rep has it staged at "${deal.repStage}".

Write the go/no-go memo:

- **VERDICT** (first line): GO, CONDITIONAL GO, or NO-GO — with one sentence of reasoning.
- **Deal thesis** — 2-3 sentences: why this deal exists and what the buyer is really buying.
- **Evidence for** — the strongest verified facts, as bullets.
- **Evidence against / unknowns** — every gap, stated plainly, worst first.
- **Conditions** — if CONDITIONAL GO: the specific proof required within 14 days, or the deal drops a stage.
- **Next three actions** — owner, action, deadline.
- **Forecast instruction** — which forecast category this belongs in (commit / best case / pipeline / omit) and the honest close date.

Format: memo style, plain language, under 400 words. No hedging phrases like "it depends". Base every claim on the sheet above; where the sheet is silent, mark it UNKNOWN rather than guessing.`, consoleCtx);
}

function promptForecastAudit(state, consoleCtx) {
  return withConsoleContext(`You are a CRO running a Friday forecast scrub. You have seen every trick: happy-ears staging, ghost economic buyers, "verbal commits", and pipelines padded with hope. Audit my book with that eye.

My full checkpoint ledger (scores are evidence-weighted: Verified = full credit, Claimed = half, No papers = zero):

${ledgerMarkdown(state)}

Run the scrub:

1. **Honest ranking** — re-rank every deal by real likelihood to close this quarter, with one line of reasoning each.
2. **Hope audit** — name the deals staged ahead of their evidence, and the single missing proof that most inflates each one.
3. **Sandbag check** — any deal whose evidence looks stronger than its stage or score suggests.
4. **The 30-day plan** — if I can only work three deals hard for 30 days, which three, and the one move on each that most changes its probability.
5. **Forecast call** — a number: which deals you would submit as commit, best case, and pipeline, and the evidence-weighted total you would put your name on.

Format: five numbered sections, tables where useful, no motivational filler. Use only the data in the ledger; where evidence is missing, treat the claim as unproven.`, consoleCtx);
}

/* ================================================================
   SMALL UI ATOMS
================================================================ */
const TONE_TEXT = { clear: 'text-clear', caution: 'text-caution', deny: 'text-deny' };
const TONE_BORDER = { clear: 'border-clear/60', caution: 'border-caution/60', deny: 'border-deny/60' };

function copyText(text, onDone) {
  const finish = (ok) => onDone && onDone(ok);
  if (navigator.clipboard && window.isSecureContext !== false) {
    navigator.clipboard.writeText(text).then(() => finish(true)).catch(() => {
      fallbackCopy(text); finish(true);
    });
  } else { fallbackCopy(text); finish(true); }
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); } catch { /* no-op */ }
  document.body.removeChild(ta);
}

function GateMark({ className = 'h-8 w-8' }) {
  /* checkpoint booth + chevron barrier arm */
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none">
      <rect x="6" y="26" width="14" height="30" rx="1.5" fill="var(--color-concrete-700)" stroke="var(--color-concrete-500)" />
      <rect x="9" y="30" width="8" height="7" rx="1" fill="var(--color-caution)" opacity="0.9" />
      <circle cx="13" cy="20" r="3.4" fill="var(--color-caution)" className="anim-lamp" />
      <g transform="rotate(-14 20 42)">
        <rect x="18" y="40" width="42" height="5.6" rx="2.8" fill="#191b1f" stroke="var(--color-concrete-500)" strokeWidth="0.8" />
        <g clipPath="url(#armclip)">
          <path d="M20 40h7l-5 5.6h-7z" fill="var(--color-caution)" />
          <path d="M31 40h7l-5 5.6h-7z" fill="var(--color-caution)" />
          <path d="M42 40h7l-5 5.6h-7z" fill="var(--color-caution)" />
          <path d="M53 40h7l-5 5.6h-7z" fill="var(--color-caution)" />
        </g>
        <clipPath id="armclip"><rect x="18" y="40" width="42" height="5.6" rx="2.8" /></clipPath>
      </g>
      <rect x="2" y="56" width="60" height="3" fill="var(--color-concrete-700)" />
    </svg>
  );
}

function CheckpointHero() {
  /* wide gate scene for the empty state */
  return (
    <svg viewBox="0 0 360 130" className="mx-auto w-full max-w-md" aria-hidden fill="none">
      <rect x="0" y="112" width="360" height="6" fill="var(--color-concrete-700)" />
      <g>
        <rect x="30" y="46" width="44" height="66" rx="2" fill="var(--color-concrete-800)" stroke="var(--color-concrete-600)" />
        <rect x="37" y="54" width="30" height="18" rx="1.5" fill="var(--color-concrete-950)" stroke="var(--color-concrete-600)" />
        <rect x="37" y="54" width="30" height="18" rx="1.5" fill="var(--color-caution)" opacity="0.14" />
        <rect x="26" y="40" width="52" height="8" rx="1" fill="var(--color-concrete-700)" />
        <circle cx="52" cy="32" r="5" fill="var(--color-caution)" className="anim-lamp" />
        <rect x="50.6" y="37" width="2.8" height="4" fill="var(--color-concrete-600)" />
      </g>
      <g transform="rotate(-4 84 84)">
        <rect x="80" y="80" width="230" height="9" rx="4.5" fill="#17191d" stroke="var(--color-concrete-500)" />
        <g clipPath="url(#heroarm)">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <path key={i} d={`M${88 + i * 29} 80h13l-9 9h-13z`} fill="var(--color-caution)" />
          ))}
        </g>
        <clipPath id="heroarm"><rect x="80" y="80" width="230" height="9" rx="4.5" /></clipPath>
        <circle cx="84" cy="84.5" r="7" fill="var(--color-concrete-700)" stroke="var(--color-concrete-500)" />
      </g>
      <g stroke="var(--color-concrete-600)" strokeDasharray="5 7">
        <line x1="130" y1="112" x2="130" y2="98" />
        <line x1="230" y1="112" x2="230" y2="98" />
        <line x1="330" y1="112" x2="330" y2="98" />
      </g>
      <text x="290" y="30" fill="var(--color-concrete-500)" fontFamily="var(--font-mono)" fontSize="9" letterSpacing="2">CHECKPOINT</text>
      <text x="290" y="42" fill="var(--color-caution)" fontFamily="var(--font-mono)" fontSize="9" letterSpacing="2">Q-14</text>
    </svg>
  );
}

function ScoreDial({ score, size = 148, animateKey }) {
  const r = 56, cx = 74, cy = 72;
  const a0 = -210, a1 = 30; // sweep 240deg
  const angle = (v) => a0 + ((a1 - a0) * v) / 100;
  const pt = (deg, rad) => {
    const t = (deg * Math.PI) / 180;
    return [cx + rad * Math.cos(t), cy + rad * Math.sin(t)];
  };
  const arc = (from, to, rad) => {
    const [x1, y1] = pt(angle(from), rad); const [x2, y2] = pt(angle(to), rad);
    const large = (angle(to) - angle(from)) > 180 ? 1 : 0;
    return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${rad} ${rad} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  const needleAngle = angle(Math.max(0, Math.min(100, score)));
  const ticks = [];
  for (let v = 0; v <= 100; v += 10) {
    const major = v % 50 === 0;
    const [x1, y1] = pt(angle(v), r + 7);
    const [x2, y2] = pt(angle(v), r + (major ? 15 : 11));
    ticks.push(<line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke={major ? 'var(--color-concrete-200)' : 'var(--color-concrete-500)'} strokeWidth={major ? 2 : 1} />);
  }
  return (
    <svg viewBox="0 0 148 128" width={size} height={(size / 148) * 128} role="img" aria-label={`Deal score ${score} out of 100`}>
      <path d={arc(0, 45, r)} stroke="var(--color-deny)" strokeWidth="9" fill="none" strokeLinecap="butt" opacity="0.85" />
      <path d={arc(45, 70, r)} stroke="var(--color-caution)" strokeWidth="9" fill="none" opacity="0.9" />
      <path d={arc(70, 100, r)} stroke="var(--color-clear)" strokeWidth="9" fill="none" opacity="0.9" />
      {ticks}
      <text x={pt(angle(0), r - 14)[0]} y={pt(angle(0), r - 14)[1] + 4} fill="var(--color-concrete-400)" fontSize="8" fontFamily="var(--font-mono)" textAnchor="middle">0</text>
      <text x={pt(angle(100), r - 14)[0]} y={pt(angle(100), r - 14)[1] + 4} fill="var(--color-concrete-400)" fontSize="8" fontFamily="var(--font-mono)" textAnchor="middle">100</text>
      <g key={animateKey} style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <line x1={cx} y1={cy} x2={pt(needleAngle, r - 4)[0]} y2={pt(needleAngle, r - 4)[1]} stroke="var(--color-concrete-100)" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <circle cx={cx} cy={cy} r="5" fill="var(--color-concrete-100)" />
      <circle cx={cx} cy={cy} r="2.2" fill="var(--color-concrete-900)" />
      <text x={cx} y={cy + 34} textAnchor="middle" fill="var(--color-concrete-100)" fontSize="26" fontWeight="800" fontFamily="var(--font-display)">{score}</text>
      <text x={cx} y={cy + 46} textAnchor="middle" fill="var(--color-concrete-400)" fontSize="7.5" fontFamily="var(--font-label)" letterSpacing="2">DEAL SCORE / 100</text>
    </svg>
  );
}

function MiniMeter({ score }) {
  const tone = score >= 70 ? 'var(--color-clear)' : score >= 45 ? 'var(--color-caution)' : 'var(--color-deny)';
  return (
    <svg viewBox="0 0 110 14" className="w-24 shrink-0" role="img" aria-label={`Score ${score}`}>
      <rect x="0" y="4" width="100" height="6" rx="2" fill="var(--color-concrete-800)" stroke="var(--color-concrete-600)" strokeWidth="0.6" />
      <rect x="0" y="4" width={Math.max(2, score)} height="6" rx="2" fill={tone} />
      {[25, 50, 75].map((t) => <line key={t} x1={t} y1="2" x2={t} y2="12" stroke="var(--color-concrete-950)" strokeWidth="1.4" />)}
      <text x="104" y="11" fontSize="9" fontFamily="var(--font-mono)" fill="var(--color-concrete-300)">{score}</text>
    </svg>
  );
}

function VerdictStamp({ verdict, small = false, animate = false }) {
  const tone = TONE_TEXT[verdict.tone];
  return (
    <span className={`stamp inline-block ${tone} ${animate ? 'anim-stamp' : ''} ${small ? 'text-[10px]' : 'text-lg sm:text-xl'}`}>
      {verdict.key}
    </span>
  );
}

function StatusPip({ status }) {
  const cls = status === 'verified' ? 'bg-clear' : status === 'claimed' ? 'bg-caution' : 'bg-deny/80';
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} aria-hidden />;
}

/* ================================================================
   MODAL SHELL
================================================================ */
function Modal({ label, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div
      role="dialog" aria-modal="true" aria-label={label}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-asphalt/80 p-4 backdrop-blur-sm sm:p-8 no-print"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={ref} tabIndex={-1} className={`panel relative mt-4 w-full rounded-lg outline-none ${wide ? 'max-w-3xl' : 'max-w-xl'}`}>
        <div className="hazard-thin h-2 rounded-t-lg" aria-hidden />
        <button
          onClick={onClose} aria-label="Close dialog"
          className="absolute right-3 top-4 rounded p-1.5 text-concrete-300 hover:bg-concrete-700 hover:text-concrete-100"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        {children}
      </div>
    </div>
  );
}

/* ================================================================
   APP
================================================================ */
export default function App() {
  const consoleCtx = useConsoleBus();
  const [state, setState] = useState(loadState);
  const [selectedId, setSelectedId] = useState(null);
  const [step, setStep] = useState(0); // 0 intake, 1..6 pillars, 7 verdict
  const [helpOpen, setHelpOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [calibOpen, setCalibOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [hopeOnly, setHopeOnly] = useState(false);
  const [sortKey, setSortKey] = useState('score');
  const toastTimer = useRef(null);
  const fileRef = useRef(null);
  const exportRef = useRef(null);
  const rosterRef = useRef(null);

  const { deals, weights } = state;
  const selected = deals.find((d) => d.id === selectedId) || null;
  const inspection = selected ? inspect(selected, weights) : null;

  /* first visit: open the guide */
  useEffect(() => {
    if (!state.seenGuide) {
      setHelpOpen(true);
      setState((s) => ({ ...s, seenGuide: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* autosave, debounced */
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
    }, 350);
    return () => clearTimeout(t);
  }, [state]);

  const showToast = useCallback((msg, undo = null) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), undo ? 7000 : 2600);
  }, []);

  const patchDeal = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      deals: s.deals.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d)),
    }));
  }, []);

  const patchPillar = useCallback((id, key, patch) => {
    setState((s) => ({
      ...s,
      deals: s.deals.map((d) =>
        d.id === id ? { ...d, updatedAt: Date.now(), pillars: { ...d.pillars, [key]: { ...d.pillars[key], ...patch } } } : d
      ),
    }));
  }, []);

  const newDeal = useCallback(() => {
    const d = blankDeal();
    setState((s) => ({ ...s, deals: [d, ...s.deals] }));
    setSelectedId(d.id);
    setStep(0);
  }, []);

  /* console-linked convenience: prefill a new dossier from a roster account */
  const newDealFromRoster = useCallback((account) => {
    const d = blankDeal({
      company: account.name || '',
      notes: account.notes ? account.notes : '',
    });
    setState((s) => ({ ...s, deals: [d, ...s.deals] }));
    setSelectedId(d.id);
    setStep(0);
  }, []);

  const deleteDeal = useCallback((id) => {
    setState((s) => {
      const idx = s.deals.findIndex((d) => d.id === id);
      if (idx === -1) return s;
      const removed = s.deals[idx];
      const next = { ...s, deals: s.deals.filter((d) => d.id !== id) };
      showToast(`Dossier shredded: ${removed.company || removed.name || 'untitled'}`, () => {
        setState((s2) => {
          const restored = [...s2.deals];
          restored.splice(Math.min(idx, restored.length), 0, removed);
          return { ...s2, deals: restored };
        });
      });
      return next;
    });
    setSelectedId((cur) => (cur === id ? null : cur));
  }, [showToast]);

  const copyLedger = useCallback(() => {
    copyText(ledgerMarkdown(state), () => showToast('Checkpoint ledger copied as Markdown'));
  }, [state, showToast]);

  const downloadJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'deal-qualifier-export.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showToast('Full state downloaded as JSON');
  }, [state, showToast]);

  const downloadCsv = useCallback(() => {
    const blob = new Blob([csvOf(state)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'deal-qualifier-forecast.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showToast('Forecast CSV downloaded');
  }, [state, showToast]);

  const importJson = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = normalize(JSON.parse(String(reader.result)));
        next.seenGuide = true;
        setState(next);
        setSelectedId(null);
        showToast(`Imported ${next.deals.length} dossier${next.deals.length === 1 ? '' : 's'}`);
      } catch {
        showToast('Import failed — that file is not a valid export');
      }
    };
    reader.readAsText(file);
  }, [showToast]);

  /* keyboard */
  useEffect(() => {
    const onKey = (e) => {
      const inField = e.target.closest?.('input, textarea, select, [contenteditable="true"]');
      if (e.key === 'Escape') {
        if (exportOpen) setExportOpen(false);
        else if (rosterOpen) setRosterOpen(false);
        else if (copilotOpen) setCopilotOpen(false);
        else if (calibOpen) setCalibOpen(false);
        else if (resetOpen) setResetOpen(false);
        else if (helpOpen) setHelpOpen(false);
        else if (selectedId && !inField) setSelectedId(null);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        copyLedger();
        return;
      }
      if (inField) return;
      if (e.key === '?') { e.preventDefault(); setHelpOpen(true); }
      else if (e.key.toLowerCase() === 'n') { e.preventDefault(); newDeal(); }
      else if (selectedId && e.key === 'ArrowRight') setStep((v) => Math.min(7, v + 1));
      else if (selectedId && e.key === 'ArrowLeft') setStep((v) => Math.max(0, v - 1));
      else if (selectedId && step >= 1 && step <= 6 && ['1', '2', '3'].includes(e.key)) {
        const status = e.key === '1' ? 'unknown' : e.key === '2' ? 'claimed' : 'verified';
        patchPillar(selectedId, PILLARS[step - 1].key, { status });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpOpen, copilotOpen, calibOpen, resetOpen, exportOpen, rosterOpen, selectedId, step, copyLedger, newDeal, patchPillar]);

  /* close export dropdown on outside click */
  useEffect(() => {
    if (!exportOpen) return;
    const onDown = (e) => { if (!exportRef.current?.contains(e.target)) setExportOpen(false); };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [exportOpen]);

  /* close roster dropdown on outside click */
  useEffect(() => {
    if (!rosterOpen) return;
    const onDown = (e) => { if (!rosterRef.current?.contains(e.target)) setRosterOpen(false); };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [rosterOpen]);

  /* queue math */
  const rows = useMemo(() => {
    let list = deals.map((d) => ({ d, r: inspect(d, weights) }));
    const q = query.trim().toLowerCase();
    if (q) list = list.filter(({ d }) => (d.name + ' ' + d.company + ' ' + d.notes).toLowerCase().includes(q));
    if (stageFilter !== 'all') list = list.filter(({ d }) => d.repStage === stageFilter);
    if (hopeOnly) list = list.filter(({ r }) => r.hopeGap > 0);
    const cmp = {
      score: (a, b) => b.r.score - a.r.score,
      value: (a, b) => b.d.value - a.d.value,
      hope: (a, b) => b.r.hopeGap - a.r.hopeGap,
      close: (a, b) => (a.d.closeDate || '9999').localeCompare(b.d.closeDate || '9999'),
    }[sortKey];
    return [...list].sort(cmp);
  }, [deals, weights, query, stageFilter, hopeOnly, sortKey]);

  const manifest = useMemo(() => {
    const stated = deals.reduce((s, d) => s + (Number(d.value) || 0), 0);
    let honest = 0, hoped = 0, gapCount = 0;
    for (const d of deals) {
      const r = inspect(d, weights);
      honest += (Number(d.value) || 0) * (r.score / 100);
      if (r.hopeGap > 0) hoped += 1;
      gapCount += r.gaps.length;
    }
    return { stated, honest, hoped, gapCount };
  }, [deals, weights]);

  const stepLabels = ['INTAKE', ...PILLARS.map((p) => p.code), 'VERDICT'];

  return (
    <div className="min-h-screen font-display text-concrete-100">
      {/* ============ HEADER ============ */}
      <header className="no-print sticky top-0 z-40 border-b border-concrete-700 bg-concrete-950/95 backdrop-blur">
        <div className="hazard h-1.5" aria-hidden />
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            <GateMark className="h-9 w-9" />
            <div>
              <h1 className="text-lg font-extrabold uppercase leading-none tracking-[0.08em]">
                Deal<span className="text-caution"> Qualifier</span>
              </h1>
              <p className="label-cap mt-0.5 text-[10px] text-concrete-400">Qualify hard · Forecast honestly</p>
            </div>
          </div>
          {consoleCtx && (
            <span
              className="label-cap inline-flex items-center gap-1.5 rounded-full border border-caution/50 bg-caution/10 px-2.5 py-1 text-[10px] text-caution"
              title="Linked to the BizDev Console Deck"
            >
              <Link2 className="h-3 w-3" aria-hidden /> Console linked
              {consoleCtx.profile?.company ? ` · ${consoleCtx.profile.company}` : ''}
            </span>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <button onClick={() => { setState(demoState()); setSelectedId(null); showToast('Demo pipeline loaded — six dossiers at the gate'); }}
              className="label-cap rounded border border-concrete-600 bg-concrete-800 px-2.5 py-1.5 text-[11px] text-concrete-200 hover:border-caution/70 hover:text-caution">
              Load demo
            </button>
            <button onClick={() => setResetOpen(true)}
              className="label-cap inline-flex items-center gap-1.5 rounded border border-concrete-600 bg-concrete-800 px-2.5 py-1.5 text-[11px] text-concrete-200 hover:border-deny/70 hover:text-deny">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
            </button>
            <button onClick={() => setHelpOpen(true)}
              className="label-cap inline-flex items-center gap-1.5 rounded border border-concrete-600 bg-concrete-800 px-2.5 py-1.5 text-[11px] text-concrete-200 hover:border-caution/70 hover:text-caution">
              <BookOpen className="h-3.5 w-3.5" aria-hidden /> How to use
            </button>
            <button onClick={() => setCopilotOpen(true)}
              className="label-cap inline-flex items-center gap-1.5 rounded border border-caution/50 bg-caution/10 px-2.5 py-1.5 text-[11px] text-caution hover:bg-caution/20">
              <Bot className="h-3.5 w-3.5" aria-hidden /> Claude Copilot
            </button>
            <div className="relative" ref={exportRef}>
              <button onClick={() => setExportOpen((v) => !v)} aria-haspopup="menu" aria-expanded={exportOpen}
                className="label-cap inline-flex items-center gap-1.5 rounded border border-concrete-600 bg-concrete-800 px-2.5 py-1.5 text-[11px] text-concrete-200 hover:border-caution/70 hover:text-caution">
                <FileDown className="h-3.5 w-3.5" aria-hidden /> Export <ChevronDown className="h-3 w-3" aria-hidden />
              </button>
              {exportOpen && (
                <div role="menu" className="panel absolute right-0 z-50 mt-1.5 w-56 rounded-md p-1.5">
                  {[
                    { icon: ClipboardCopy, label: 'Copy ledger (Markdown)', fn: () => { copyLedger(); setExportOpen(false); } },
                    { icon: FileDown, label: 'Download JSON (full state)', fn: () => { downloadJson(); setExportOpen(false); } },
                    { icon: FileText, label: 'Download forecast CSV', fn: () => { downloadCsv(); setExportOpen(false); } },
                    { icon: FileUp, label: 'Import JSON…', fn: () => { fileRef.current?.click(); setExportOpen(false); } },
                    { icon: Printer, label: 'Print ledger', fn: () => { setExportOpen(false); window.print(); } },
                  ].map(({ icon: I, label, fn }) => (
                    <button key={label} role="menuitem" onClick={fn}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-xs text-concrete-200 hover:bg-concrete-700">
                      <I className="h-3.5 w-3.5 text-concrete-400" aria-hidden /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Import JSON file"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
          </div>
        </div>
      </header>

      {/* ============ MANIFEST STRIP ============ */}
      <div className="no-print border-b border-concrete-800 bg-concrete-900/70">
        <div className="mx-auto grid max-w-[1500px] grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 sm:px-6 md:grid-cols-4">
          <ManifestStat label="Stated pipeline" value={money(manifest.stated)} sub={`${deals.length} dossier${deals.length === 1 ? '' : 's'} in queue`} />
          <ManifestStat label="Evidence-weighted" value={money(Math.round(manifest.honest))} tone="caution"
            sub={manifest.stated ? `${Math.round((manifest.honest / manifest.stated) * 100)}% of stated` : 'no deals yet'} />
          <ManifestStat label="Hope-flagged deals" value={String(manifest.hoped)} tone={manifest.hoped ? 'deny' : 'clear'}
            sub="staged ahead of evidence" />
          <div className="hidden flex-col justify-center md:flex">
            <span className="label-cap text-[10px] text-concrete-400">Truth meter</span>
            <TruthBar stated={manifest.stated} honest={manifest.honest} />
          </div>
        </div>
      </div>

      {/* ============ MAIN ============ */}
      <main className="no-print mx-auto grid max-w-[1500px] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* ---- THE QUEUE ---- */}
        <section aria-label="Deal queue" className="panel flex min-h-[300px] flex-col self-start rounded-lg lg:sticky lg:top-[92px] lg:max-h-[calc(100vh-108px)]">
          <div className="flex items-center justify-between gap-2 border-b border-concrete-700 px-3.5 py-2.5">
            <h2 className="label-cap text-xs text-concrete-300">The Queue</h2>
            <span className="label-cap hidden text-[9px] text-concrete-500 sm:inline">sorted by truth, not hope</span>
            <div className="flex items-center gap-1.5">
              {consoleCtx?.roster?.accounts?.length > 0 && (
                <div className="relative" ref={rosterRef}>
                  <button onClick={() => setRosterOpen((v) => !v)} aria-haspopup="menu" aria-expanded={rosterOpen}
                    className="label-cap inline-flex items-center gap-1 rounded border border-concrete-600 bg-concrete-800 px-2 py-1 text-[11px] text-concrete-200 hover:border-caution/70 hover:text-caution">
                    <Link2 className="h-3.5 w-3.5" aria-hidden /> From roster <ChevronDown className="h-3 w-3" aria-hidden />
                  </button>
                  {rosterOpen && (
                    <div role="menu" className="panel absolute left-0 z-50 mt-1.5 w-56 max-h-64 overflow-y-auto rounded-md p-1.5">
                      {consoleCtx.roster.accounts.slice(0, 50).map((a, i) => (
                        <button key={i} role="menuitem" onClick={() => { newDealFromRoster(a); setRosterOpen(false); }}
                          className="flex w-full items-center justify-between gap-2 rounded px-2.5 py-2 text-left text-xs text-concrete-200 hover:bg-concrete-700">
                          <span className="truncate">{a.name}</span>
                          {a.segment && <span className="label-cap shrink-0 text-[9px] text-concrete-500">{a.segment}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button onClick={newDeal}
                className="label-cap inline-flex items-center gap-1 rounded bg-caution px-2 py-1 text-[11px] font-bold text-ink hover:bg-caution-bright">
                <Plus className="h-3.5 w-3.5" aria-hidden /> New dossier
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-b border-concrete-800 px-3 py-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-concrete-500" aria-hidden />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the queue…" aria-label="Search deals"
                className="w-full rounded border border-concrete-700 bg-concrete-950 py-1.5 pl-7 pr-2 text-xs text-concrete-100 placeholder:text-concrete-500" />
            </div>
            <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} aria-label="Filter by stage"
              className="rounded border border-concrete-700 bg-concrete-950 px-1.5 py-1.5 text-xs text-concrete-200">
              <option value="all">All stages</option>
              {STAGES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} aria-label="Sort deals"
              className="rounded border border-concrete-700 bg-concrete-950 px-1.5 py-1.5 text-xs text-concrete-200">
              <option value="score">Sort: score</option>
              <option value="value">Sort: value</option>
              <option value="hope">Sort: hope gap</option>
              <option value="close">Sort: close date</option>
            </select>
            <button onClick={() => setHopeOnly((v) => !v)} aria-pressed={hopeOnly}
              className={`label-cap inline-flex items-center gap-1 rounded border px-1.5 py-1.5 text-[10px] ${hopeOnly ? 'border-deny/70 bg-deny/15 text-deny' : 'border-concrete-700 bg-concrete-950 text-concrete-400 hover:text-concrete-200'}`}>
              <Flag className="h-3 w-3" aria-hidden /> Hope
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {deals.length === 0 ? (
              <EmptyQueue onDemo={() => { setState(demoState()); showToast('Demo pipeline loaded'); }} onNew={newDeal} />
            ) : rows.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-concrete-400">
                Nothing matches those filters. The gate is quiet — widen the search.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {rows.map(({ d, r }) => (
                  <li key={d.id}>
                    <button onClick={() => { setSelectedId(d.id); setStep(7); }}
                      className={`group w-full rounded-md border px-3 py-2.5 text-left transition-colors ${selectedId === d.id ? 'border-caution/70 bg-concrete-800' : 'border-concrete-700 bg-concrete-900 hover:border-concrete-500'}`}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{d.company || 'Unnamed account'}</span>
                        <span className="shrink-0 font-mono text-xs text-concrete-300">{money(d.value)}</span>
                      </div>
                      <div className="truncate text-[11px] text-concrete-400">{d.name || 'Untitled deal'}</div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <MiniMeter score={r.score} />
                        <span className={`label-cap rounded border px-1 py-px text-[8px] ${TONE_BORDER[r.verdict.tone]} ${TONE_TEXT[r.verdict.tone]}`}>
                          {r.verdict.key}
                        </span>
                        {r.hopeGap > 0 && (
                          <span className="label-cap inline-flex items-center gap-0.5 rounded bg-deny/15 px-1 py-px text-[8px] text-deny">
                            <TriangleAlert className="h-2.5 w-2.5" aria-hidden /> hope +{r.hopeGap}
                          </span>
                        )}
                        <span className="ml-auto flex items-center gap-1 text-[9px] text-concrete-500">
                          {r.gaps.length > 0 && <><Flag className="h-2.5 w-2.5" aria-hidden />{r.gaps.length}</>}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[9px]">
                        <span className="label-cap text-concrete-500">rep: {d.repStage}</span>
                        <ChevronRight className="h-2.5 w-2.5 text-concrete-600" aria-hidden />
                        <span className={`label-cap ${r.hopeGap > 0 ? 'text-deny' : r.hopeGap < 0 ? 'text-clear' : 'text-concrete-400'}`}>evidence: {r.recStage}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ---- INSPECTION BAY ---- */}
        <section aria-label="Inspection bay" className="min-w-0">
          {!selected ? (
            <InspectionIdle hasDeals={deals.length > 0} onNew={newDeal} />
          ) : (
            <div className="panel rounded-lg">
              {/* deal header */}
              <div className="flex flex-wrap items-center gap-3 border-b border-concrete-700 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="label-cap text-[9px] text-concrete-500">Dossier under inspection</div>
                  <div className="truncate text-base font-extrabold">
                    {selected.company || 'Unnamed account'}
                    <span className="mx-2 text-concrete-600">/</span>
                    <span className="font-semibold text-concrete-300">{selected.name || 'Untitled deal'}</span>
                  </div>
                </div>
                <VerdictStamp verdict={inspection.verdict} small />
                <button onClick={() => setCalibOpen(true)}
                  className="label-cap inline-flex items-center gap-1 rounded border border-concrete-600 px-2 py-1 text-[10px] text-concrete-300 hover:text-caution" >
                  <SlidersHorizontal className="h-3 w-3" aria-hidden /> Calibration
                </button>
                <button onClick={() => { copyText(dealMarkdown(selected, weights), () => showToast('Dossier copied as Markdown')); }}
                  aria-label="Copy this dossier as Markdown"
                  className="rounded border border-concrete-600 p-1.5 text-concrete-300 hover:text-caution">
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button onClick={() => deleteDeal(selected.id)} aria-label="Delete this dossier"
                  className="rounded border border-concrete-600 p-1.5 text-concrete-300 hover:border-deny/70 hover:text-deny">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>

              {/* stepper */}
              <nav aria-label="Inspection gates" className="flex items-stretch overflow-x-auto border-b border-concrete-700 bg-concrete-950/60">
                {stepLabels.map((lbl, i) => {
                  const pillar = i >= 1 && i <= 6 ? PILLARS[i - 1] : null;
                  const st = pillar ? selected.pillars[pillar.key].status : null;
                  return (
                    <button key={lbl} onClick={() => setStep(i)} aria-current={step === i ? 'step' : undefined}
                      className={`label-cap relative flex min-w-[64px] flex-1 flex-col items-center gap-1 border-r border-concrete-800 px-2 py-2 text-[9px] transition-colors ${step === i ? 'bg-concrete-800 text-caution' : 'text-concrete-400 hover:text-concrete-200'}`}>
                      <span className="font-mono text-[8px] text-concrete-500">{String(i).padStart(2, '0')}</span>
                      {lbl}
                      {pillar && <StatusPip status={st} />}
                      {!pillar && <span className="h-2" aria-hidden />}
                      {step === i && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-caution" aria-hidden />}
                    </button>
                  );
                })}
              </nav>

              <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_230px]">
                {/* step content */}
                <div className="min-w-0">
                  {step === 0 && <IntakeStep deal={selected} patch={(p) => patchDeal(selected.id, p)} />}
                  {step >= 1 && step <= 6 && (
                    <PillarStep
                      pillar={PILLARS[step - 1]} weight={weights[PILLARS[step - 1].key]}
                      value={selected.pillars[PILLARS[step - 1].key]}
                      onChange={(p) => patchPillar(selected.id, PILLARS[step - 1].key, p)}
                    />
                  )}
                  {step === 7 && (
                    <VerdictStep deal={selected} r={inspection} weights={weights}
                      onCopilot={() => setCopilotOpen(true)}
                      patch={(p) => patchDeal(selected.id, p)} />
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-concrete-800 pt-3">
                    <button onClick={() => setStep((v) => Math.max(0, v - 1))} disabled={step === 0}
                      className="label-cap inline-flex items-center gap-1 rounded border border-concrete-600 px-2.5 py-1.5 text-[11px] text-concrete-300 disabled:opacity-30 hover:text-concrete-100">
                      <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Back
                    </button>
                    <span className="label-cap hidden text-[9px] text-concrete-500 sm:inline">Arrow keys move gates · 1/2/3 set status</span>
                    <button onClick={() => setStep((v) => Math.min(7, v + 1))} disabled={step === 7}
                      className="label-cap inline-flex items-center gap-1 rounded bg-caution px-3 py-1.5 text-[11px] font-bold text-ink disabled:opacity-30 hover:bg-caution-bright">
                      {step === 6 ? 'To verdict' : 'Next gate'} <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>

                {/* summary rail */}
                <aside aria-label="Inspection summary" className="panel-sunk hidden rounded-md p-3 xl:block">
                  <div className="flex justify-center"><ScoreDial score={inspection.score} size={120} animateKey={selected.id} /></div>
                  <ul className="mt-2 space-y-1">
                    {PILLARS.map((p, i) => {
                      const st = selected.pillars[p.key].status;
                      return (
                        <li key={p.key}>
                          <button onClick={() => setStep(i + 1)}
                            className={`flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-[11px] hover:bg-concrete-800 ${step === i + 1 ? 'bg-concrete-800' : ''}`}>
                            <StatusPip status={st} />
                            <span className="flex-1 truncate">{p.title}</span>
                            <span className="font-mono text-[9px] text-concrete-500">w{weights[p.key]}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="label-cap mt-3 border-t border-concrete-800 pt-2 text-[9px] text-concrete-500">
                    Evidence stage
                    <div className={`mt-0.5 text-xs font-bold normal-case tracking-normal ${inspection.hopeGap > 0 ? 'text-deny' : 'text-concrete-200'}`}>{inspection.recStage}</div>
                  </div>
                </aside>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ============ FOOTER ============ */}
      <footer className="no-print mx-auto max-w-[1500px] px-4 pb-6 sm:px-6">
        <div className="hazard-thin h-1 rounded" aria-hidden />
        <p className="label-cap mt-2 text-[9px] text-concrete-500">
          Deal Qualifier · Checkpoint Q-14 · Your data never leaves this browser — saved locally, exportable anytime.
        </p>
      </footer>

      {/* ============ MODALS ============ */}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      {calibOpen && (
        <CalibrationModal weights={weights} onClose={() => setCalibOpen(false)}
          onChange={(k, v) => setState((s) => ({ ...s, weights: { ...s.weights, [k]: v } }))}
          onReset={() => setState((s) => ({ ...s, weights: { ...DEFAULT_WEIGHTS } }))} />
      )}
      {copilotOpen && (
        <CopilotModal
          state={state} selected={selected} consoleCtx={consoleCtx} onClose={() => setCopilotOpen(false)}
          onToast={showToast}
          onDebrief={(text) => {
            if (selected) patchDeal(selected.id, { debrief: text });
            else setState((s) => ({ ...s, portfolioDebrief: text }));
          }}
        />
      )}
      {resetOpen && (
        <Modal label="Confirm reset" onClose={() => setResetOpen(false)}>
          <div className="p-5">
            <h2 className="text-base font-extrabold uppercase tracking-wide">Burn the files?</h2>
            <p className="mt-2 text-sm text-concrete-300">
              This clears every dossier, weight and note from this browser. Download a JSON export first if any of it matters.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setResetOpen(false)}
                className="label-cap rounded border border-concrete-600 px-3 py-1.5 text-[11px] text-concrete-200 hover:text-concrete-100">Keep everything</button>
              <button onClick={() => { setState(normalize(null)); setState((s) => ({ ...s, seenGuide: true })); setSelectedId(null); setResetOpen(false); showToast('Checkpoint cleared'); }}
                className="label-cap rounded bg-deny px-3 py-1.5 text-[11px] font-bold text-white hover:bg-deny/80">Reset everything</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============ TOAST ============ */}
      {toast && (
        <div className="anim-toast fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4 no-print" role="status">
          <div className="panel flex items-center gap-3 rounded-md border-caution/40 px-4 py-2.5 text-sm">
            <Stamp className="h-4 w-4 text-caution" aria-hidden />
            <span>{toast.msg}</span>
            {toast.undo && (
              <button onClick={() => { toast.undo(); setToast(null); }}
                className="label-cap inline-flex items-center gap-1 rounded bg-caution px-2 py-1 text-[10px] font-bold text-ink hover:bg-caution-bright">
                <Undo2 className="h-3 w-3" aria-hidden /> Undo
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============ PRINT LEDGER ============ */}
      <PrintLedger state={state} />
    </div>
  );
}

/* ================================================================
   SUBCOMPONENTS
================================================================ */
function ManifestStat({ label, value, sub, tone }) {
  return (
    <div>
      <span className="label-cap text-[10px] text-concrete-400">{label}</span>
      <div className={`font-mono text-lg font-semibold leading-tight ${tone ? TONE_TEXT[tone] : 'text-concrete-100'}`}>{value}</div>
      <span className="text-[10px] text-concrete-500">{sub}</span>
    </div>
  );
}

function TruthBar({ stated, honest }) {
  const pct = stated ? Math.round((honest / stated) * 100) : 0;
  return (
    <svg viewBox="0 0 220 26" className="mt-1 w-full max-w-[220px]" role="img" aria-label={`Evidence supports ${pct} percent of stated pipeline`}>
      <rect x="0" y="8" width="200" height="10" rx="3" fill="var(--color-concrete-800)" stroke="var(--color-concrete-600)" strokeWidth="0.6" />
      <rect x="0" y="8" width={Math.max(3, pct * 2)} height="10" rx="3" fill="var(--color-caution)" />
      {[50, 100, 150].map((t) => <line key={t} x1={t} y1="6" x2={t} y2="20" stroke="var(--color-concrete-950)" strokeWidth="1.6" />)}
      <text x="204" y="17" fontSize="10" fontFamily="var(--font-mono)" fill="var(--color-caution)">{pct}%</text>
    </svg>
  );
}

function EmptyQueue({ onDemo, onNew }) {
  return (
    <div className="px-4 py-6 text-center">
      <CheckpointHero />
      <h3 className="mt-3 text-sm font-extrabold uppercase tracking-wide">The gate is empty</h3>
      <p className="mx-auto mt-1.5 max-w-[260px] text-xs leading-relaxed text-concrete-400">
        Every deal that wants a place in your forecast must pass inspection.
        Open a dossier, walk the six lanes, and let the evidence set the stage.
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <button onClick={onNew} className="label-cap inline-flex items-center gap-1 rounded bg-caution px-3 py-1.5 text-[11px] font-bold text-ink hover:bg-caution-bright">
          <Plus className="h-3.5 w-3.5" aria-hidden /> First dossier
        </button>
        <button onClick={onDemo} className="label-cap rounded border border-concrete-600 px-3 py-1.5 text-[11px] text-concrete-200 hover:border-caution/70 hover:text-caution">
          Load demo
        </button>
      </div>
    </div>
  );
}

function InspectionIdle({ hasDeals, onNew }) {
  return (
    <div className="panel flex min-h-[420px] flex-col items-center justify-center rounded-lg p-8 text-center">
      <CheckpointHero />
      <h2 className="mt-4 text-lg font-extrabold uppercase tracking-wide">Inspection bay idle</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-concrete-400">
        {hasDeals
          ? 'Pick a dossier from the queue to run it through the six lanes — Metrics, Buyer, Process, Pain, Champion, Competition — and stamp an honest verdict.'
          : 'No dossiers yet. Open one and this bay becomes a MEDDICC-style inspection line: six lanes, evidence on file, a weighted score, and a stamp you can defend.'}
      </p>
      {!hasDeals && (
        <button onClick={onNew} className="label-cap mt-5 inline-flex items-center gap-1.5 rounded bg-caution px-4 py-2 text-xs font-bold text-ink hover:bg-caution-bright">
          <Plus className="h-4 w-4" aria-hidden /> Open the first dossier
        </button>
      )}
    </div>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="label-cap mb-1 block text-[9px] text-concrete-400">{label}</span>
      {children}
    </label>
  );
}
const inputCls = 'w-full rounded border border-concrete-700 bg-concrete-950 px-2.5 py-2 text-sm text-concrete-100 placeholder:text-concrete-600';

function IntakeStep({ deal, patch }) {
  return (
    <div>
      <div className="label-cap text-[9px] text-caution">Gate 00 · Intake</div>
      <h3 className="mt-0.5 text-lg font-extrabold uppercase tracking-wide">Papers, please</h3>
      <p className="mt-1 text-xs text-concrete-400">Identity first. The stage you claim here is exactly what the inspection will test.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Account / company">
          <input className={inputCls} value={deal.company} onChange={(e) => patch({ company: e.target.value })} placeholder="Meridian Freight" />
        </Field>
        <Field label="Deal name">
          <input className={inputCls} value={deal.name} onChange={(e) => patch({ name: e.target.value })} placeholder="TMS platform, 3-yr agreement" />
        </Field>
        <Field label="Value (USD)">
          <input type="number" min="0" step="500" className={inputCls} value={deal.value || ''} onChange={(e) => patch({ value: Number(e.target.value) || 0 })} placeholder="42000" />
        </Field>
        <Field label="Target close date">
          <input type="date" className={inputCls} value={deal.closeDate} onChange={(e) => patch({ closeDate: e.target.value })} />
        </Field>
        <Field label="Stage you are claiming (rep stage)" className="sm:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {STAGES.map((s) => (
              <button key={s} onClick={() => patch({ repStage: s })} aria-pressed={deal.repStage === s}
                className={`label-cap rounded border px-2.5 py-1.5 text-[10px] ${deal.repStage === s ? 'border-caution bg-caution/15 text-caution' : 'border-concrete-700 text-concrete-300 hover:border-concrete-500'}`}>
                {s}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Working notes" className="sm:col-span-2">
          <textarea rows={3} className={inputCls} value={deal.notes} onChange={(e) => patch({ notes: e.target.value })}
            placeholder="What you know, what you suspect, what you have been told…" />
        </Field>
      </div>
    </div>
  );
}

function PillarStep({ pillar, weight, value, onChange }) {
  const statusOrder = ['unknown', 'claimed', 'verified'];
  return (
    <div>
      <div className="label-cap flex items-center gap-2 text-[9px] text-caution">
        {pillar.lane} · weight {weight}
      </div>
      <h3 className="mt-0.5 text-lg font-extrabold uppercase tracking-wide">{pillar.title}</h3>
      <p className="mt-1 text-sm text-concrete-300">{pillar.ask}</p>

      <div className="mt-4">
        <span className="label-cap mb-1.5 block text-[9px] text-concrete-400">Inspection status <span className="text-concrete-600">(keys 1 / 2 / 3)</span></span>
        <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={`${pillar.title} status`}>
          {statusOrder.map((st) => {
            const meta = STATUS_META[st];
            const active = value.status === st;
            const Icon = st === 'verified' ? ShieldCheck : st === 'claimed' ? MessageSquareQuote : CircleHelp;
            const toneCls = active
              ? st === 'verified' ? 'border-clear bg-clear/15 text-clear'
                : st === 'claimed' ? 'border-caution bg-caution/15 text-caution'
                : 'border-deny bg-deny/15 text-deny'
              : 'border-concrete-700 text-concrete-400 hover:border-concrete-500 hover:text-concrete-200';
            return (
              <button key={st} role="radio" aria-checked={active} onClick={() => onChange({ status: st })}
                className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2.5 transition-colors ${toneCls}`}>
                <Icon className="h-4 w-4" aria-hidden />
                <span className="label-cap text-[10px] font-bold">{meta.label}</span>
                <span className="font-mono text-[9px] opacity-70">{Math.round(meta.factor * 100)}% credit</span>
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Evidence on file — how do you know?" className="mt-4">
        <textarea rows={4} className={inputCls} value={value.evidence} onChange={(e) => onChange({ evidence: e.target.value })}
          placeholder={'Quote the email. Name the person. Cite the number. "They seemed excited" is not evidence.'} />
      </Field>
      {value.status === 'verified' && !value.evidence.trim() && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-caution">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden /> Verified with nothing on file — write down how you know, or downgrade to Claimed.
        </p>
      )}

      <div className="paper mt-4 rounded-sm p-3.5">
        <span className="label-cap text-[9px] text-ink/60">Inspector's probes</span>
        <ul className="mt-1.5 space-y-1.5 text-[13px] leading-snug">
          {pillar.probes.map((q, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-mono text-[10px] font-semibold text-ink/50">{String(i + 1).padStart(2, '0')}</span>
              <span>{q}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 border-t border-ink/15 pt-2 text-[11px] italic text-ink/60">{pillar.coach}</p>
      </div>
    </div>
  );
}

function VerdictStep({ deal, r, weights, onCopilot, patch }) {
  return (
    <div>
      <div className="label-cap text-[9px] text-caution">Gate 07 · Verdict</div>
      <h3 className="mt-0.5 text-lg font-extrabold uppercase tracking-wide">Stamp &amp; stage</h3>

      <div className="mt-3 grid items-center gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-2">
          <ScoreDial score={r.score} animateKey={deal.id + r.score} />
          <VerdictStamp verdict={r.verdict} animate />
          <p className="max-w-[180px] text-center text-[10px] text-concrete-400">{r.verdict.note}</p>
        </div>

        <div className="min-w-0">
          <div className="panel-sunk rounded-md p-3">
            <span className="label-cap text-[9px] text-concrete-400">Weighted breakdown</span>
            <div className="mt-2 space-y-1.5">
              {PILLARS.map((p) => {
                const st = deal.pillars[p.key].status;
                const factor = STATUS_META[st].factor;
                const w = weights[p.key];
                const tone = st === 'verified' ? 'var(--color-clear)' : st === 'claimed' ? 'var(--color-caution)' : 'var(--color-deny)';
                return (
                  <div key={p.key} className="flex items-center gap-2 text-[11px]">
                    <span className="label-cap w-16 shrink-0 text-[9px] text-concrete-400">{p.code}</span>
                    <svg viewBox="0 0 120 10" className="h-2.5 min-w-0 flex-1" aria-hidden>
                      <rect x="0" y="2" width="120" height="6" rx="2" fill="var(--color-concrete-800)" />
                      <rect x="0" y="2" width={Math.max(1.5, factor * 120)} height="6" rx="2" fill={tone} opacity="0.9" />
                    </svg>
                    <span className="w-20 shrink-0 text-right font-mono text-[10px] text-concrete-300">
                      {(factor * w).toFixed(1)}<span className="text-concrete-600">/{w}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            <div>
              <span className="label-cap block text-[9px] text-concrete-500">Rep says</span>
              <span className="font-semibold">{deal.repStage}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-concrete-600" aria-hidden />
            <div>
              <span className="label-cap block text-[9px] text-concrete-500">Evidence supports</span>
              <span className={`font-semibold ${r.hopeGap > 0 ? 'text-deny' : 'text-clear'}`}>{r.recStage}</span>
            </div>
            {r.hopeGap > 0 && (
              <span className="label-cap inline-flex items-center gap-1 rounded bg-deny/15 px-2 py-1 text-[9px] text-deny">
                <TriangleAlert className="h-3 w-3" aria-hidden /> Hope gap: staged {r.hopeGap} ahead of evidence
              </span>
            )}
            {r.hopeGap === 0 && <span className="label-cap rounded bg-clear/10 px-2 py-1 text-[9px] text-clear">Staged honestly</span>}
            {r.hopeGap < 0 && <span className="label-cap rounded bg-clear/10 px-2 py-1 text-[9px] text-clear">Sandbagged {-r.hopeGap} below evidence</span>}
          </div>
        </div>
      </div>

      {/* gap flags */}
      <div className="mt-4">
        <span className="label-cap text-[9px] text-concrete-400">Hold flags ({r.gaps.length})</span>
        {r.gaps.length === 0 ? (
          <p className="mt-1.5 flex items-center gap-2 text-xs text-clear"><ShieldCheck className="h-4 w-4" aria-hidden /> Clean sheet — every lane verified with evidence on file.</p>
        ) : (
          <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {r.gaps.map((g, i) => (
              <li key={i} className={`flex items-start gap-2 rounded border px-2.5 py-2 text-[11px] ${g.sev === 'high' ? 'border-deny/50 bg-deny/8 text-deny' : g.sev === 'mid' ? 'border-caution/50 bg-caution/8 text-caution' : 'border-concrete-600 text-concrete-300'}`}>
                <Flag className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                <span>{g.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button onClick={onCopilot}
        className="label-cap mt-4 inline-flex items-center gap-1.5 rounded border border-caution/50 bg-caution/10 px-3 py-2 text-[11px] font-bold text-caution hover:bg-caution/20">
        <Bot className="h-4 w-4" aria-hidden /> Send to the Second Inspector (Claude)
      </button>

      <Field label="Inspector's debrief — paste Claude's findings here (saved with the dossier)" className="mt-4">
        <textarea rows={4} className={inputCls} value={deal.debrief} onChange={(e) => patch({ debrief: e.target.value })}
          placeholder="Blind spots, gap questions, memo verdict…" />
      </Field>
    </div>
  );
}

function CalibrationModal({ weights, onChange, onReset, onClose }) {
  const total = PILLARS.reduce((s, p) => s + weights[p.key], 0);
  return (
    <Modal label="Calibration — pillar weights" onClose={onClose}>
      <div className="p-5">
        <h2 className="text-base font-extrabold uppercase tracking-wide">Calibration</h2>
        <p className="mt-1 text-xs text-concrete-400">
          How much each lane counts toward the score. Weights are relative — the score always lands on 0–100.
        </p>
        <div className="mt-4 space-y-3">
          {PILLARS.map((p) => (
            <label key={p.key} className="flex items-center gap-3 text-sm">
              <span className="label-cap w-32 shrink-0 text-[10px] text-concrete-300">{p.title}</span>
              <input type="range" min="5" max="30" step="1" value={weights[p.key]}
                onChange={(e) => onChange(p.key, Number(e.target.value))}
                className="min-w-0 flex-1 accent-[var(--color-caution)]" aria-label={`Weight for ${p.title}`} />
              <span className="w-10 text-right font-mono text-xs text-caution">{weights[p.key]}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-concrete-800 pt-3">
          <span className="font-mono text-[11px] text-concrete-500">total weight {total}</span>
          <button onClick={onReset} className="label-cap rounded border border-concrete-600 px-3 py-1.5 text-[10px] text-concrete-300 hover:text-caution">
            Restore defaults
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CopilotModal({ state, selected, consoleCtx, onClose, onToast, onDebrief }) {
  const [copied, setCopied] = useState(null);
  const needDeal = !selected;
  const actions = [
    {
      id: 'interrogate', title: 'Interrogate this deal', needsDeal: true,
      desc: 'A ruthless MEDDICC inspector hunts the blind spots, kill risks and thin evidence in the selected dossier.',
      build: () => promptInterrogate(selected, state.weights, consoleCtx),
    },
    {
      id: 'gaps', title: 'Draft gap-closing questions', needsDeal: true,
      desc: 'Turns every hold flag into live-call and written questions, plus a 3-question plan for your next 30 minutes.',
      build: () => promptGapQuestions(selected, state.weights, consoleCtx),
    },
    {
      id: 'memo', title: 'Write the go/no-go memo', needsDeal: true,
      desc: 'A revenue leader drafts the internal memo: verdict, evidence for and against, conditions, next three actions.',
      build: () => promptMemo(selected, state.weights, consoleCtx),
    },
    {
      id: 'audit', title: 'Audit my forecast', needsDeal: false,
      desc: 'A CRO scrubs the whole queue: honest ranking, hope audit, sandbag check, 30-day plan, forecast call.',
      build: () => promptForecastAudit(state, consoleCtx),
    },
  ];
  const debriefValue = selected ? selected.debrief : state.portfolioDebrief;
  return (
    <Modal label="Claude Copilot" onClose={onClose} wide>
      <div className="p-5">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-caution" aria-hidden />
          <h2 className="text-base font-extrabold uppercase tracking-wide">Second Inspector's Office</h2>
        </div>
        <p className="mt-1 text-xs text-concrete-400">
          Each action builds a complete, ready-to-run prompt around your live data. {COPILOT_HINT}
        </p>
        {selected ? (
          <p className="label-cap mt-2 inline-block rounded bg-concrete-800 px-2 py-1 text-[9px] text-concrete-300">
            Dossier on the desk: {selected.company || 'Unnamed'} — {selected.name || 'Untitled'}
          </p>
        ) : (
          <p className="label-cap mt-2 inline-block rounded bg-concrete-800 px-2 py-1 text-[9px] text-concrete-400">
            No dossier selected — deal-level actions are gated. Portfolio audit is open.
          </p>
        )}
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {actions.map((a) => {
            const disabled = a.needsDeal && needDeal;
            return (
              <div key={a.id} className={`panel-sunk rounded-md p-3.5 ${disabled ? 'opacity-45' : ''}`}>
                <h3 className="text-sm font-bold">{a.title}</h3>
                <p className="mt-1 min-h-[42px] text-[11px] leading-snug text-concrete-400">{a.desc}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button disabled={disabled}
                    onClick={() => { copyText(a.build(), () => { setCopied(a.id); onToast('Prompt copied — paste into claude.ai'); setTimeout(() => setCopied(null), 2000); }); }}
                    className="label-cap inline-flex items-center gap-1.5 rounded bg-caution px-2.5 py-1.5 text-[10px] font-bold text-ink hover:bg-caution-bright disabled:cursor-not-allowed">
                    {copied === a.id ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
                    {copied === a.id ? 'Copied' : 'Copy prompt'}
                  </button>
                  {!disabled && (
                    <details className="min-w-0 flex-1">
                      <summary className="label-cap cursor-pointer text-[9px] text-concrete-500 hover:text-concrete-300">view prompt</summary>
                      <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-concrete-950 p-2 font-mono text-[9px] leading-relaxed text-concrete-300">{a.build()}</pre>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <Field label={selected ? "Inspector's debrief — paste Claude's answer (saved with this dossier)" : "Portfolio debrief — paste Claude's audit (saved)"} className="mt-4">
          <textarea rows={4} className={inputCls} value={debriefValue} onChange={(e) => onDebrief(e.target.value)}
            placeholder="Paste the findings here so they live next to the deal…" />
        </Field>
      </div>
    </Modal>
  );
}

function HelpModal({ onClose }) {
  const steps = [
    ['Open a dossier', 'Hit "New dossier" (or press N). Fill in the intake papers: account, deal, value, close date — and the stage you are claiming.'],
    ['Walk the six lanes', 'Metrics, Economic Buyer, Decision Process, Identified Pain, Champion, Competition. One gate at a time — arrow keys move you along.'],
    ['Grade honestly', 'Each lane is No papers (0%), Claimed (50%), or Verified (100%). Keys 1/2/3 set it. Verified means you can point at evidence.'],
    ['Write the evidence', 'Every lane has an "Evidence on file" box. Quote the email, name the person, cite the number. The probes on the paper card tell you what to ask.'],
    ['Read the verdict', 'Gate 07 stamps the deal: CLEARED, CONDITIONAL, or HELD AT GATE — with a weighted score, the stage your evidence actually supports, and every hold flag.'],
    ['Watch the hope gap', 'The queue compares your claimed stage against the evidence stage. Deals staged ahead of their proof get a red HOPE flag. Sort by truth, not vibes.'],
    ['Bring in the Second Inspector', 'Open Claude Copilot, copy a prompt — interrogation, gap questions, go/no-go memo, forecast audit — and paste it into claude.ai. Save the findings in the debrief box.'],
    ['Export the ledger', 'Copy the full Checkpoint Ledger as Markdown (Ctrl/Cmd+S), download JSON or CSV, or print it for the forecast meeting.'],
  ];
  const keys = [
    ['?', 'Open this guide'], ['Esc', 'Close dialogs / leave inspection'], ['N', 'New dossier'],
    ['Ctrl/Cmd + S', 'Copy ledger as Markdown'], ['← →', 'Previous / next gate'], ['1 / 2 / 3', 'Set lane status (in a lane)'],
  ];
  return (
    <Modal label="How to use Deal Qualifier" onClose={onClose} wide>
      <div className="max-h-[78vh] overflow-y-auto p-5">
        <div className="flex items-center gap-3">
          <GateMark className="h-10 w-10" />
          <div>
            <h2 className="text-base font-extrabold uppercase tracking-wide">How the checkpoint works</h2>
            <p className="text-xs text-concrete-400">Every deal wants into your forecast. Make each one show its papers.</p>
          </div>
        </div>
        <ol className="mt-4 space-y-2.5">
          {steps.map(([t, d], i) => (
            <li key={i} className="flex gap-3">
              <span className="label-cap flex h-6 w-6 shrink-0 items-center justify-center rounded border border-caution/50 bg-caution/10 font-mono text-[10px] font-bold text-caution">{i + 1}</span>
              <div>
                <span className="text-sm font-bold">{t}</span>
                <p className="text-xs leading-relaxed text-concrete-400">{d}</p>
              </div>
            </li>
          ))}
        </ol>
        <h3 className="label-cap mt-5 text-[10px] text-concrete-400">Keyboard</h3>
        <div className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
          {keys.map(([k, d]) => (
            <div key={k} className="flex items-center gap-2 text-xs">
              <kbd className="rounded border border-concrete-600 bg-concrete-950 px-1.5 py-0.5 font-mono text-[10px] text-caution">{k}</kbd>
              <span className="text-concrete-400">{d}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="label-cap rounded bg-caution px-4 py-2 text-[11px] font-bold text-ink hover:bg-caution-bright">
            Open the gate
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PrintLedger({ state }) {
  const rows = state.deals.map((d) => ({ d, r: inspect(d, state.weights) })).sort((a, b) => b.r.score - a.r.score);
  const stated = state.deals.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const honest = rows.reduce((s, { d, r }) => s + (Number(d.value) || 0) * (r.score / 100), 0);
  return (
    <section className="print-only p-6" aria-hidden>
      <h1 className="text-2xl font-extrabold">Checkpoint Ledger — Deal Qualifier</h1>
      <p className="mt-1 text-sm">
        Generated {new Date().toLocaleDateString()} · {state.deals.length} deals · Stated {money(stated)} · Evidence-weighted {money(Math.round(honest))}
      </p>
      <table className="mt-4">
        <thead>
          <tr><th>Deal</th><th>Value</th><th>Rep stage</th><th>Evidence stage</th><th>Score</th><th>Verdict</th><th>Gaps</th></tr>
        </thead>
        <tbody>
          {rows.map(({ d, r }) => (
            <tr key={d.id}>
              <td>{d.company || '—'} — {d.name || 'Untitled'}</td>
              <td>{money(d.value)}</td><td>{d.repStage}</td><td>{r.recStage}</td>
              <td>{r.score}</td><td>{r.verdict.key}</td><td>{r.gaps.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.map(({ d, r }) => (
        <div key={d.id} className="pb mt-6">
          <h2 className="text-lg font-bold">{d.company || 'Unnamed'} — {d.name || 'Untitled'}</h2>
          <p className="text-sm">{money(d.value)} · close {d.closeDate || 'unset'} · rep {d.repStage} · evidence {r.recStage} · score {r.score}/100 · {r.verdict.key}</p>
          <table className="mt-2">
            <thead><tr><th>Pillar</th><th>Status</th><th>Evidence</th></tr></thead>
            <tbody>
              {PILLARS.map((p) => (
                <tr key={p.key}>
                  <td>{p.title}</td>
                  <td>{STATUS_META[d.pillars[p.key].status].label}</td>
                  <td>{d.pillars[p.key].evidence || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {d.notes && <p className="mt-2 text-sm"><strong>Notes:</strong> {d.notes}</p>}
        </div>
      ))}
    </section>
  );
}
