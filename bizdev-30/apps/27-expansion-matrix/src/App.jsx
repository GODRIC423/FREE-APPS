import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Rocket, Check, Circle, Ban, X, ChevronUp, ChevronDown, Pencil, Trash2,
  HelpCircle, Download, Upload, Copy, Sparkles, FileJson, FileText,
  FileSpreadsheet, Undo2, RotateCcw, Search, Printer, LayoutGrid, Crosshair,
  Building2, Layers, ListOrdered, NotebookPen, Plus, Target, ScrollText, Cable,
} from 'lucide-react';

/* ============================== console bus (BizDev Console link) ============================== */

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
    try { window.parent.postMessage({ bizdev: 'ready', v: 1, slug: '27-expansion-matrix' }, '*'); } catch {}
    return () => window.removeEventListener('message', onMsg);
  }, []);
  return ctx;
}

function consoleContextHeader(ctx) {
  if (!ctx) return '';
  const lines = [];
  if (ctx.profile?.company) lines.push(`- My company: ${ctx.profile.company}`);
  if (ctx.profile?.offer) lines.push(`- What I sell: ${ctx.profile.offer}`);
  if (ctx.profile?.icp) lines.push(`- My ICP: ${ctx.profile.icp}`);
  if (ctx.profile?.pricingAnchor) lines.push(`- Pricing anchor: ${ctx.profile.pricingAnchor}`);
  const nameVoice = [ctx.claude?.userName, ctx.claude?.voiceNotes].filter(Boolean).join(' — ');
  if (nameVoice) lines.push(`- My name / voice: ${nameVoice}`);
  if (ctx.roster?.accounts?.length) {
    const accts = ctx.roster.accounts.slice(0, 12)
      .map((a) => (a.segment ? `${a.name} (${a.segment})` : a.name)).join(', ');
    lines.push(`- Accounts on file: ${accts}`);
  }
  if (!lines.length) return '';
  return `## Shared context (from BizDev Console)\n${lines.join('\n')}\n\n`;
}

function ConsoleLinkedPill({ ctx }) {
  if (!ctx) return null;
  const company = ctx.profile?.company;
  return (
    <span
      title={company ? `Linked to BizDev Console — ${company}` : 'Linked to BizDev Console'}
      className="inline-flex items-center gap-1.5 rounded-sm border border-joy-500/60 bg-joy-400/10 px-2.5 py-1.5 font-mono text-[11px] font-semibold text-joy-700">
      <Cable className="h-3.5 w-3.5 shrink-0" aria-hidden /> Console linked{company ? ` · ${company}` : ''}
    </span>
  );
}

/* ============================== constants ============================== */

const LS_KEY = 'bizdev:27-expansion-matrix:v1';

const STATE_ORDER = ['fit', 'in-play', 'sold', 'no-fit'];
const STATES = {
  fit: { label: 'Fit', desc: 'Good fit — open whitespace, not yet pursued.' },
  'in-play': { label: 'In Play', desc: 'Actively pursuing this quarter.' },
  sold: { label: 'Sold', desc: 'Already buying this — booked revenue.' },
  'no-fit': { label: 'No Fit', desc: 'Not a match for this account — excluded.' },
};
const CELL_CLASS = { '': 'em-cell-empty', fit: 'em-cell-fit', 'in-play': 'em-cell-inplay', sold: 'em-cell-sold', 'no-fit': 'em-cell-nofit' };
const STATE_BTN_ACTIVE = {
  fit: 'border-blue-600 bg-blue-500 text-paper-50',
  'in-play': 'border-joy-700 bg-joy-400 text-ink-900',
  sold: 'border-ink-900 bg-ink-800 text-paper-50',
  'no-fit': 'border-ash-600 bg-ash-500 text-paper-50',
};

/* ============================== utilities ============================== */

const uid = () =>
  (crypto?.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2, 10));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const cellKey = (accountId, offerId) => accountId + '|' + offerId;

function fmtMoney(n) {
  if (!Number.isFinite(n)) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1e9) return '$' + (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1e3) return '$' + Math.round(n / 1e3) + 'k';
  return '$' + Math.round(n);
}
const fmtInt = (n) => (Number.isFinite(n) ? n.toLocaleString('en-US') : '0');

/* ============================== persistence ============================== */

function normalizeOffer(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    id: typeof r.id === 'string' && r.id ? r.id : uid(),
    name: typeof r.name === 'string' ? r.name : 'Unnamed offer',
    priceBand: typeof r.priceBand === 'string' ? r.priceBand : '',
    desc: typeof r.desc === 'string' ? r.desc : '',
  };
}
function normalizeAccount(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    id: typeof r.id === 'string' && r.id ? r.id : uid(),
    name: typeof r.name === 'string' ? r.name : 'Unnamed account',
    segment: typeof r.segment === 'string' ? r.segment : '',
    contact: typeof r.contact === 'string' ? r.contact : '',
    arr: clamp(num(r.arr, 0), 0, 1e9),
    notes: typeof r.notes === 'string' ? r.notes : '',
    planOverride: typeof r.planOverride === 'string' ? r.planOverride : '',
  };
}
const CELL_STATE_SET = new Set(STATE_ORDER);
function normalizeCell(raw, accIds, offIds) {
  const r = raw && typeof raw === 'object' ? raw : {};
  if (!accIds.has(r.accountId) || !offIds.has(r.offerId)) return null;
  return {
    id: typeof r.id === 'string' && r.id ? r.id : uid(),
    accountId: r.accountId,
    offerId: r.offerId,
    state: CELL_STATE_SET.has(r.state) ? r.state : '',
    value: clamp(num(r.value, 0), 0, 1e9),
    note: typeof r.note === 'string' ? r.note : '',
    play: typeof r.play === 'string' ? r.play : '',
  };
}
function normalize(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const offers = (Array.isArray(r.offers) ? r.offers : []).map(normalizeOffer);
  const accounts = (Array.isArray(r.accounts) ? r.accounts : []).map(normalizeAccount);
  const offIds = new Set(offers.map((o) => o.id));
  const accIds = new Set(accounts.map((a) => a.id));
  const rawCells = (Array.isArray(r.cells) ? r.cells : []).map((c) => normalizeCell(c, accIds, offIds)).filter(Boolean);
  const seen = new Set();
  const cells = [];
  for (const c of rawCells) {
    const k = cellKey(c.accountId, c.offerId);
    if (seen.has(k)) continue;
    seen.add(k);
    cells.push(c);
  }
  return {
    v: 1,
    seenGuide: !!r.seenGuide,
    business: typeof r.business === 'string' ? r.business : '',
    offers,
    accounts,
    cells,
    copilotNotes: typeof r.copilotNotes === 'string' ? r.copilotNotes : '',
  };
}
function loadState() {
  try { return normalize(JSON.parse(localStorage.getItem(LS_KEY))); }
  catch { return normalize(null); }
}

/* ============================== demo data ============================== */

function demoState() {
  const offEmail = uid(), offMedia = uid(), offAudit = uid();
  const accNorthlake = uid(), accFernhollow = uid(), accMarrow = uid(), accCascade = uid(), accLoom = uid(), accVerdant = uid();
  const cell = (accountId, offerId, state, value, note, play) => ({ accountId, offerId, state, value: value || 0, note: note || '', play: play || '' });
  return normalize({
    seenGuide: true,
    business:
      'Northlake & Ives — a 9-person growth marketing agency for DTC and early B2B brands doing $5M–40M in revenue. We land accounts on one retainer, then expand into adjacent services. The founder and two account leads own expansion conversations.',
    offers: [
      { id: offEmail, name: 'Lifecycle Email', priceBand: '$3,200/mo', desc: 'Full-funnel lifecycle email: onboarding, win-back, and upsell flows.' },
      { id: offMedia, name: 'Paid Media Management', priceBand: '$4,500/mo + spend', desc: 'Google and Meta media buying with weekly creative testing.' },
      { id: offAudit, name: 'Attribution Audit', priceBand: '$9,000 one-time', desc: 'Multi-touch attribution model and a measurement plan, delivered in a 3-week sprint.' },
    ],
    accounts: [
      { id: accNorthlake, name: 'Northlake Outfitters', segment: 'DTC Apparel', contact: 'Priya Shah — Growth Lead', arr: 38400, notes: 'Founder-led, careful with spend.' },
      { id: accFernhollow, name: 'Fernhollow Coffee Co.', segment: 'DTC / CPG', contact: 'Owen Kass — CMO', arr: 92400, notes: 'Our best reference account.' },
      { id: accMarrow, name: 'Marrow & Bone Pet Co.', segment: 'DTC Pet', contact: 'Dana Ruiz — Head of Marketing', arr: 0, notes: 'Onboarded last month, email-only so far.' },
      { id: accCascade, name: 'Cascade Sport Supply', segment: 'DTC + Marketplace', contact: 'Miguel Torres — Director of Ecomm', arr: 38400, notes: '' },
      { id: accLoom, name: 'Loom & Ledger', segment: 'B2B SaaS', contact: 'Sasha Kim — VP Marketing', arr: 38400, notes: 'Pre-Series C, watching CAC closely.' },
      { id: accVerdant, name: 'Verdant Home Goods', segment: 'DTC Home', contact: 'Alex Whitfield — Founder', arr: 38400, notes: 'Brand-new client, month one.' },
    ],
    cells: [
      cell(accNorthlake, offEmail, 'sold', 38400, 'Live since February, open rates up 40% since we took it over.'),
      cell(accNorthlake, offMedia, 'fit', 54000, 'Priya has hinted at wanting to test Meta again after a bad prior agency.', 'Ask Priya what soured the last agency relationship before pitching.'),
      cell(accNorthlake, offAudit, 'no-fit', 0, 'Too early — under $2M revenue, they cannot act on attribution data yet.'),

      cell(accFernhollow, offEmail, 'sold', 38400, 'Flagship flows, consistently our top case study.'),
      cell(accFernhollow, offMedia, 'sold', 54000, 'Took this over from an in-house hire in March.'),
      cell(accFernhollow, offAudit, 'in-play', 9000, 'Owen asked for a proposal after the Q2 board deck questioned channel mix.', 'Send the audit proposal by Friday — already championed internally.'),

      cell(accMarrow, offEmail, 'fit', 38400, 'Only using a legacy ESP with zero flows built. Easy win.', 'Send a 10-minute teardown of their current (nonexistent) flows.'),
      cell(accMarrow, offMedia, 'no-fit', 0, 'In-house media team is territorial — would not hand over the account.'),
      cell(accMarrow, offAudit, 'fit', 9000, 'Dana mentioned wanting to prove channel ROI before her Q4 budget review.'),

      cell(accCascade, offEmail, 'sold', 38400, ''),
      cell(accCascade, offMedia, 'fit', 54000, "Their current agency's contract renews in 6 weeks — good timing to pitch.", 'Time the outreach for 3 weeks before their renewal date.'),
      cell(accCascade, offAudit, 'no-fit', 0, 'Marketplace-heavy mix makes attribution modeling low-value for now.'),

      cell(accLoom, offEmail, 'sold', 38400, 'Nurture sequence for a long B2B sales cycle.'),
      cell(accLoom, offMedia, 'no-fit', 0, 'Their motion is ABM, not paid social — not our wheelhouse yet.'),
      cell(accLoom, offAudit, 'in-play', 9000, 'Sasha wants to prove pipeline contribution before their Series C raise.', 'Demo the attribution dashboard with a sample of their own data.'),

      cell(accVerdant, offEmail, 'sold', 38400, 'Just launched, too early to size the rest.'),
    ],
    copilotNotes:
      "Claude's ranking agreed with the notes: Fernhollow's attribution audit is the highest-confidence play (champion plus board pressure). Second: Cascade paid media, where renewal timing beats raw deal size.",
  });
}

/* ============================== derived / compute ============================== */

function buildCellMap(state) {
  const m = new Map();
  for (const c of state.cells) m.set(cellKey(c.accountId, c.offerId), c);
  return m;
}
function getCell(cellMap, accountId, offerId) {
  return cellMap.get(cellKey(accountId, offerId)) || { id: null, accountId, offerId, state: '', value: 0, note: '', play: '' };
}
function accountById(state, id) { return state.accounts.find((a) => a.id === id); }
function offerById(state, id) { return state.offers.find((o) => o.id === id); }

function computeRollup(state) {
  const cellMap = buildCellMap(state);
  let sold = 0, fit = 0, inplay = 0, nofit = 0, soldTotal = 0, fitTotal = 0, inplayTotal = 0;
  for (const c of state.cells) {
    if (c.state === 'sold') { sold++; soldTotal += c.value; }
    else if (c.state === 'fit') { fit++; fitTotal += c.value; }
    else if (c.state === 'in-play') { inplay++; inplayTotal += c.value; }
    else if (c.state === 'no-fit') { nofit++; }
  }
  const totalCombos = state.accounts.length * state.offers.length;
  const scored = sold + fit + inplay + nofit;
  const unscored = Math.max(0, totalCombos - scored);
  return { cellMap, sold, fit, inplay, nofit, unscored, totalCombos, soldTotal, fitTotal, inplayTotal, whitespaceTotal: fitTotal + inplayTotal };
}
function bestOpenCell(state) {
  const candidates = state.cells.filter((c) => c.state === 'fit' || c.state === 'in-play');
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) => b.value - a.value)[0];
}
function accountCoverage(state, account) {
  if (!state.offers.length) return 0;
  const sold = state.cells.filter((c) => c.accountId === account.id && c.state === 'sold').length;
  return sold / state.offers.length;
}
function accountSnippet(state, account) {
  const cells = state.cells.filter((c) => c.accountId === account.id);
  const soldNames = cells.filter((c) => c.state === 'sold').map((c) => offerById(state, c.offerId)?.name).filter(Boolean);
  const open = cells.filter((c) => c.state === 'fit' || c.state === 'in-play').sort((a, b) => b.value - a.value);
  const excludedNames = cells.filter((c) => c.state === 'no-fit').map((c) => offerById(state, c.offerId)?.name).filter(Boolean);
  const parts = [];
  parts.push(soldNames.length ? `Sold on ${soldNames.join(' + ')}.` : 'Not sold on anything yet.');
  if (open.length) {
    const top = open[0];
    const offer = offerById(state, top.offerId);
    parts.push(`Best open play: ${offer?.name || 'an offer'} at ${fmtMoney(top.value)} (${STATES[top.state].label}).`);
    if (top.play) parts.push(`Next: ${top.play}`);
    const rest = open.slice(1).map((c) => offerById(state, c.offerId)?.name).filter(Boolean);
    if (rest.length) parts.push(`Also open: ${rest.join(', ')}.`);
  } else {
    parts.push('No whitespace scored yet.');
  }
  if (excludedNames.length) parts.push(`Ruled out: ${excludedNames.join(', ')}.`);
  return parts.join(' ');
}

/* ============================== exports ============================== */

function planMarkdown(state) {
  const rollup = computeRollup(state);
  const best = bestOpenCell(state);
  const lines = [];
  lines.push(`# Expansion Matrix — ${new Date().toISOString().slice(0, 10)}`);
  if (state.business) lines.push('', `> ${state.business}`);
  lines.push('', `**Portfolio:** ${state.accounts.length} accounts × ${state.offers.length} offers · ${rollup.sold} sold · ${rollup.fit} fit · ${rollup.inplay} in play · ${rollup.nofit} no-fit · ${rollup.unscored} unscored`);
  lines.push(`**Booked (sold cells):** ${fmtMoney(rollup.soldTotal)}  ·  **Open whitespace (fit + in-play):** ${fmtMoney(rollup.whitespaceTotal)}`, '');
  if (best) {
    const acc = accountById(state, best.accountId), off = offerById(state, best.offerId);
    lines.push('## Architect’s read', '', `Best open cell: **${acc?.name} × ${off?.name}** — ${fmtMoney(best.value)} (${STATES[best.state].label}).${best.note ? ` ${best.note}` : ''}`, '');
  }
  lines.push('## The Matrix', '');
  lines.push('| Account | ' + state.offers.map((o) => o.name).join(' | ') + ' |');
  lines.push('|---|' + state.offers.map(() => '---').join('|') + '|');
  for (const a of state.accounts) {
    const row = state.offers.map((o) => {
      const c = getCell(rollup.cellMap, a.id, o.id);
      if (!c.state) return '—';
      return `${STATES[c.state].label}${c.value ? ` (${fmtMoney(c.value)})` : ''}`;
    });
    lines.push(`| ${a.name} | ${row.join(' | ')} |`);
  }
  lines.push('', '## Play Queue', '');
  const queue = state.cells.filter((c) => c.state === 'fit' || c.state === 'in-play').sort((a, b) => b.value - a.value);
  if (!queue.length) lines.push('_Nothing scored as fit or in-play yet._');
  queue.forEach((c, i) => {
    const acc = accountById(state, c.accountId), off = offerById(state, c.offerId);
    lines.push(`${i + 1}. **${acc?.name} × ${off?.name}** — ${fmtMoney(c.value)} — ${STATES[c.state].label}${c.play ? ` — next: ${c.play}` : ''}${c.note ? ` — ${c.note}` : ''}`);
  });
  lines.push('', '## Account Plans', '');
  for (const a of state.accounts) {
    lines.push(`### ${a.name}`, '', (a.planOverride || accountSnippet(state, a)), '');
  }
  if (state.copilotNotes) lines.push('## Field notes (from Claude)', '', state.copilotNotes, '');
  lines.push('---', '_Charted with Expansion Matrix._');
  return lines.join('\n');
}

function matrixCsv(state) {
  const cellMap = buildCellMap(state);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['account', 'segment', 'offer', 'price_band', 'state', 'value', 'note', 'play'].join(',')];
  for (const a of state.accounts) {
    for (const o of state.offers) {
      const c = getCell(cellMap, a.id, o.id);
      rows.push([esc(a.name), esc(a.segment), esc(o.name), esc(o.priceBand), esc(c.state || 'unscored'), c.value, esc(c.note), esc(c.play)].join(','));
    }
  }
  return rows.join('\n');
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove(); return true;
    } catch { return false; }
  }
}

/* ============================== copilot prompts ============================== */

function stateBriefMd(state) {
  const rollup = computeRollup(state);
  const L = [];
  L.push(`**Business:** ${state.business || '(not described yet)'}`);
  L.push('', `**Offers (${state.offers.length}):**`);
  for (const o of state.offers) L.push(`- ${o.name}${o.priceBand ? ` — ${o.priceBand}` : ''}${o.desc ? `: ${o.desc}` : ''}`);
  L.push('', `**Accounts (${state.accounts.length}):**`);
  for (const a of state.accounts) L.push(`- ${a.name}${a.segment ? ` — ${a.segment}` : ''}${a.contact ? `; contact: ${a.contact}` : ''}${a.arr ? `; current annual spend: ${fmtMoney(a.arr)}` : ''}`);
  L.push('', `**Matrix** (${rollup.sold} sold, ${rollup.fit} fit, ${rollup.inplay} in-play, ${rollup.nofit} no-fit, ${rollup.unscored} unscored):`);
  for (const a of state.accounts) {
    const cells = state.cells.filter((c) => c.accountId === a.id && c.state);
    if (!cells.length) continue;
    const parts = cells.map((c) => {
      const o = offerById(state, c.offerId);
      return `${o?.name}=${STATES[c.state].label}${c.value ? `($${c.value})` : ''}${c.note ? ` [${c.note}]` : ''}`;
    });
    L.push(`- ${a.name}: ${parts.join('; ')}`);
  }
  L.push('', `**Booked revenue:** ${fmtMoney(rollup.soldTotal)}  ·  **Open whitespace:** ${fmtMoney(rollup.whitespaceTotal)}`);
  return L.join('\n');
}

function promptRankCells(state) {
  const queue = state.cells.filter((c) => c.state === 'fit' || c.state === 'in-play').sort((a, b) => b.value - a.value);
  const list = queue.map((c, i) => {
    const a = accountById(state, c.accountId), o = offerById(state, c.offerId);
    return `${i + 1}. ${a?.name} × ${o?.name} — ${fmtMoney(c.value)} (${STATES[c.state].label})${c.note ? ` — ${c.note}` : ''}`;
  }).join('\n');
  return `You are a senior revenue strategist who specializes in account expansion for boutique service businesses. You are ruthless about focus — you would rather I work 3 cells brilliantly than 12 cells badly.

## My context
${stateBriefMd(state)}

## My open whitespace cells, sorted by my own dollar estimate
${list || '(none scored as fit or in-play yet)'}

## What I need
1. **Re-rank these cells** using a weighted view of: expected value, ease of the ask (do I already have a champion/contact there?), urgency (renewal timing, buying signals in my notes), and confidence in my value estimate. Show your weighting.
2. **Call out any cell whose value estimate looks wrong** — too optimistic or too conservative — and say why.
3. **Recommend my top 3 to work in the next two weeks**, and for each, the single next action that moves it forward.
4. **Flag any account with zero scored whitespace** — should I be sizing them up, or are they genuinely maxed out?

## Output format
Markdown. A re-ranked table: | Rank | Account × Offer | My value | Why it moved |. Then "Work these first" as a numbered list of 3 with one next action each. Then a short "blind spots" section.`;
}

function promptReferralAsk(state, cell) {
  const a = accountById(state, cell.accountId), o = offerById(state, cell.offerId);
  const soldNames = state.cells.filter((c) => c.accountId === cell.accountId && c.state === 'sold').map((c) => offerById(state, c.offerId)?.name).filter(Boolean);
  return `You are a B2B account-expansion strategist who ghostwrites short, warm, low-friction referral-ask emails. You never sound like a salesperson — you sound like someone who solved a real problem and is being helpful.

## My context
${stateBriefMd(state)}

## The ask I need drafted
- **Account:** ${a?.name || 'n/a'}${a?.segment ? ` (${a.segment})` : ''}
- **My existing contact / champion there:** ${a?.contact || 'not recorded — assume a warm but not-yet-championed relationship'}
- **What we already deliver them:** ${soldNames.join(', ') || 'nothing sold yet — lead with the relationship, not results'}
- **The new offer / department I want an introduction toward:** ${o?.name || 'n/a'}${o?.desc ? ` — ${o.desc}` : ''}
- **Why this cell:** ${cell.note || '(no notes yet — infer a plausible reason from the account context)'}

## What I need
1. **A short internal-referral-ask email** (under 120 words) to my existing contact, asking them to introduce me to the right person for ${o?.name || 'this offer'}. Reference real results if we have them; if we don't, reference the relationship.
2. **Two alternate subject lines.**
3. **A one-line LinkedIn-message fallback** if email goes quiet after 5 business days.
4. **A single sentence I can say live** if my contact is willing to make the intro in a meeting instead of over email.

## Output format
Markdown. Put the email in a code fence so I can copy it verbatim. Keep every line something a real person would actually say.`;
}

function promptExpansionPitch(state, cell) {
  const a = accountById(state, cell.accountId), o = offerById(state, cell.offerId);
  const soldNames = state.cells.filter((c) => c.accountId === cell.accountId && c.state === 'sold').map((c) => offerById(state, c.offerId)?.name).filter(Boolean);
  return `You are a senior account strategist writing an expansion pitch for an existing client — not a cold pitch. Proof-first, no fluff, no generic B2B language.

## My context
${stateBriefMd(state)}

## The cell to pitch
- **Account:** ${a?.name || 'n/a'}${a?.segment ? ` — ${a.segment}` : ''}
- **What they already buy from us (my proof):** ${soldNames.join(', ') || 'nothing yet — this would be their first purchase, pitch it as a trial-sized next step instead'}
- **The offer to expand into:** ${o?.name || 'n/a'}${o?.priceBand ? ` — ${o.priceBand}` : ''}${o?.desc ? ` — ${o.desc}` : ''}
- **My sizing:** ${fmtMoney(cell.value)} estimated value, currently marked "${STATES[cell.state]?.label || 'unscored'}"
- **My notes:** ${cell.note || '(none)'}
- **My contact:** ${a?.contact || 'not recorded'}

## What I need
1. **A proof-first expansion pitch** (email-length, under 180 words) that opens with a specific result from what we already do for them, bridges to the gap ${o?.name || 'this offer'} closes, and ends with a low-friction ask (a 20-minute call, not a proposal request).
2. **The likely objection** they will raise, and a one-line pre-empt for it.
3. **A one-sentence version** I could say live on our next standing call.

## Output format
Markdown. Email in a code fence. Keep it specific to this account — no placeholders like [result] left unfilled; if I gave you no proof, write it as a first-purchase pitch instead and say so.`;
}

/* ============================== small UI atoms ============================== */

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">{label}</span>
      {children}
    </label>
  );
}
const inputCls =
  'w-full rounded-sm border border-ink-200 bg-paper-50 px-2.5 py-1.5 font-body text-sm text-ink-800 placeholder:text-ink-300 focus:border-joy-600 focus:outline-none focus:ring-1 focus:ring-joy-600/50';

function BtnPrimary({ children, className = '', ...p }) {
  return (
    <button {...p} className={`inline-flex items-center gap-1.5 rounded-sm border border-ink-900 bg-ink-800 px-3 py-1.5 font-display text-sm font-semibold text-paper-50 shadow-card transition-colors hover:bg-ink-700 ${className}`}>
      {children}
    </button>
  );
}
function BtnGhost({ children, className = '', ...p }) {
  return (
    <button {...p} className={`inline-flex items-center gap-1.5 rounded-sm border border-ink-300 bg-paper-50 px-3 py-1.5 font-display text-sm font-semibold text-ink-700 transition-colors hover:border-ink-500 hover:bg-paper-100 ${className}`}>
      {children}
    </button>
  );
}
function IconBtn({ label, children, className = '', ...p }) {
  return (
    <button {...p} aria-label={label} title={label}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-sm border border-transparent text-ink-500 transition-colors hover:border-ink-300 hover:bg-paper-100 hover:text-ink-800 ${className}`}>
      {children}
    </button>
  );
}
function SectionHead({ icon: Icon, kicker, title, aside }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink-800/70 pb-2">
      <div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-joy-600">
          <Icon className="h-3.5 w-3.5" aria-hidden /> {kicker}
        </div>
        <h2 className="font-display text-2xl font-black text-ink-900">{title}</h2>
      </div>
      {aside}
    </div>
  );
}

/* ============================== modal + toast ============================== */

function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/55 p-4 pt-[6vh] no-print" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}
        className={`em-rise w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-sm border-2 border-ink-800 bg-paper-50 shadow-deep outline-none`}>
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
          <h3 className="font-display text-lg font-black text-ink-900">{title}</h3>
          <IconBtn label="Close dialog" onClick={onClose}><X className="h-4 w-4" aria-hidden /></IconBtn>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
function Toast({ toast, onUndo, onDismiss }) {
  if (!toast) return null;
  return (
    <div className="em-toast fixed bottom-4 left-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 rounded-sm border-2 border-ink-800 bg-ink-800 text-paper-50 shadow-deep no-print">
      <div className="flex items-center gap-3 px-4 py-3">
        <ScrollText className="h-4 w-4 shrink-0 text-joy-400" aria-hidden />
        <p className="flex-1 font-body text-sm">{toast.msg}</p>
        {toast.undo && (
          <button onClick={onUndo} className="inline-flex items-center gap-1 rounded-sm border border-joy-400/70 px-2 py-1 font-display text-xs font-semibold text-joy-300 hover:bg-ink-700">
            <Undo2 className="h-3.5 w-3.5" aria-hidden /> Undo
          </button>
        )}
        <IconBtn label="Dismiss notice" onClick={onDismiss} className="text-paper-200 hover:bg-ink-700 hover:text-paper-50"><X className="h-3.5 w-3.5" aria-hidden /></IconBtn>
      </div>
      <div className="h-0.5 bg-joy-400/80" style={{ animation: 'em-toast-bar 7s linear forwards' }} />
    </div>
  );
}

/* ============================== signature SVG pieces ============================== */

function MatrixMark() {
  const cells = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const isJoy = r === 1 && c === 2;
      const isSold = r === 0 && c === 0;
      const x = 5 + c * 11, y = 5 + r * 11;
      cells.push(
        <rect key={`${r}-${c}`} x={x} y={y} width="9" height="9"
          fill={isJoy ? 'var(--color-joy-400)' : isSold ? 'var(--color-ink-800)' : 'var(--color-paper-100)'}
          stroke={isJoy ? 'var(--color-joy-700)' : 'var(--color-ink-300)'} strokeWidth="1" />
      );
    }
  }
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10 shrink-0" aria-hidden="true">
      <rect x="1" y="1" width="38" height="38" rx="3" fill="var(--color-paper-50)" stroke="var(--color-ink-800)" strokeWidth="2" />
      {cells}
    </svg>
  );
}

function CornerMark({ corner }) {
  const pos = {
    tl: 'top-2 left-2',
    tr: 'top-2 right-2 rotate-90',
    bl: 'bottom-2 left-2 -rotate-90',
    br: 'bottom-2 right-2 rotate-180',
  }[corner];
  return (
    <svg aria-hidden="true" className={`pointer-events-none absolute ${pos} h-4 w-4 text-ink-400`} viewBox="0 0 16 16" fill="none">
      <path d="M1 1 H7 M1 1 V7" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function MatrixTitleBlock({ accountsCount, offersCount }) {
  const W = 720, H = 56;
  const legend = [
    { x: 226, fill: 'url(#legHatchFit)', stroke: 'var(--color-blue-500)', label: 'FIT' },
    { x: 356, fill: 'var(--color-joy-400)', stroke: 'var(--color-joy-700)', label: 'IN PLAY' },
    { x: 496, fill: 'var(--color-ink-800)', stroke: 'var(--color-ink-900)', label: 'SOLD' },
    { x: 626, fill: 'url(#legHatchNoFit)', stroke: 'var(--color-ash-500)', label: 'NO FIT' },
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Expansion Matrix title block and legend">
      <defs>
        <pattern id="legHatchFit" width="9" height="9" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="9" height="9" fill="var(--color-paper-50)" />
          <line x1="0" y1="0" x2="0" y2="9" stroke="var(--color-blue-500)" strokeWidth="1.6" />
        </pattern>
        <pattern id="legHatchNoFit" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="7" height="7" fill="var(--color-paper-100)" />
          <line x1="0" y1="0" x2="0" y2="7" stroke="var(--color-ash-500)" strokeWidth="1" opacity="0.7" />
        </pattern>
      </defs>
      <line x1="0" y1="2" x2={W} y2="2" stroke="var(--color-ink-800)" strokeWidth="2" />
      <line x1="0" y1="6" x2={W} y2="6" stroke="var(--color-ink-300)" strokeWidth="1" />
      <text x="0" y="26" fontFamily="var(--font-display)" fontWeight="800" fontSize="17" letterSpacing="0.5" fill="var(--color-ink-900)">EXPANSION MATRIX</text>
      <text x="0" y="42" fontFamily="var(--font-mono)" fontSize="10.5" fill="var(--color-ink-500)">SHEET 01 · {accountsCount} ACCTS × {offersCount} OFFERS</text>
      {legend.map((sw) => (
        <g key={sw.label} transform={`translate(${sw.x},14)`}>
          <rect width="16" height="16" fill={sw.fill} stroke={sw.stroke} strokeWidth="1.2" rx="1.5" />
          <text x="22" y="12" fontFamily="var(--font-mono)" fontSize="10" fill="var(--color-ink-600)">{sw.label}</text>
        </g>
      ))}
    </svg>
  );
}

function RollupBar({ rollup }) {
  const { soldTotal, fitTotal, inplayTotal } = rollup;
  const total = soldTotal + fitTotal + inplayTotal;
  const W = 320, H = 54, barY = 22, barH = 14;
  const soldW = total ? (soldTotal / total) * W : 0;
  const fitW = total ? (fitTotal / total) * W : 0;
  const inplayW = total ? (inplayTotal / total) * W : 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img"
      aria-label={`Opportunity breakdown: ${fmtMoney(soldTotal)} sold, ${fmtMoney(fitTotal)} fit, ${fmtMoney(inplayTotal)} in play`}>
      <rect x="0" y={barY} width={W} height={barH} fill="var(--color-paper-200)" />
      <rect x="0" y={barY} width={soldW} height={barH} fill="var(--color-ink-800)" />
      <rect x={soldW} y={barY} width={fitW} height={barH} fill="var(--color-blue-500)" />
      <rect x={soldW + fitW} y={barY} width={inplayW} height={barH} fill="var(--color-joy-400)" />
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={t * W} y1={barY - 3} x2={t * W} y2={barY + barH + 3} stroke="var(--color-ink-300)" strokeWidth={t === 0 || t === 1 ? 1.6 : 0.8} />
      ))}
      <text x="0" y={barY - 8} fontFamily="var(--font-mono)" fontSize="10" fontWeight="600" fill="var(--color-ink-800)">{fmtMoney(0)}</text>
      <text x={W} y={barY - 8} textAnchor="end" fontFamily="var(--font-mono)" fontSize="10" fontWeight="600" fill="var(--color-ink-800)">{fmtMoney(total)}</text>
      <text x="0" y={barY + barH + 18} fontFamily="var(--font-mono)" fontSize="9.5" fill="var(--color-ink-500)">
        Sold {fmtMoney(soldTotal)} · Fit {fmtMoney(fitTotal)} · In Play {fmtMoney(inplayTotal)}
      </text>
    </svg>
  );
}

function StateIcon({ state }) {
  const cls = 'h-4 w-4';
  if (state === 'sold') return <Check className={`${cls} text-paper-50`} aria-hidden strokeWidth={2.5} />;
  if (state === 'in-play') return <Rocket className={`${cls} text-ink-900`} aria-hidden />;
  if (state === 'fit') return <Circle className={`${cls} text-blue-600`} aria-hidden strokeWidth={1.75} />;
  if (state === 'no-fit') return <Ban className={`${cls} text-ash-600`} aria-hidden />;
  return null;
}

/* ============================== offer / account editors ============================== */

function OfferEditor({ offer, onSave, onCancel }) {
  const [f, setF] = useState({ ...offer });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Offer name" className="col-span-2 sm:col-span-1">
        <input className={inputCls} value={f.name} onChange={set('name')} placeholder="e.g. Paid Media Management" />
      </Field>
      <Field label="Price band" className="col-span-2 sm:col-span-1">
        <input className={inputCls} value={f.priceBand} onChange={set('priceBand')} placeholder="$4,500/mo + spend" />
      </Field>
      <Field label="What it is" className="col-span-2">
        <textarea rows={2} className={inputCls} value={f.desc} onChange={set('desc')} placeholder="One or two lines a teammate would recognize instantly…" />
      </Field>
      <div className="col-span-2 flex gap-2">
        <BtnPrimary onClick={() => onSave(normalizeOffer(f))}><Check className="h-4 w-4" aria-hidden /> Save offer</BtnPrimary>
        <BtnGhost onClick={onCancel}>Cancel</BtnGhost>
      </div>
    </div>
  );
}

function AccountEditor({ account, onSave, onCancel }) {
  const [f, setF] = useState({ ...account });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Field label="Account name" className="col-span-2">
        <input className={inputCls} value={f.name} onChange={set('name')} placeholder="e.g. Fernhollow Coffee Co." />
      </Field>
      <Field label="Segment">
        <input className={inputCls} value={f.segment} onChange={set('segment')} placeholder="DTC / CPG" />
      </Field>
      <Field label="Current spend/yr ($)">
        <input type="number" min="0" step="1000" className={inputCls} value={f.arr} onChange={set('arr')} />
      </Field>
      <Field label="Contact" className="col-span-2 sm:col-span-2">
        <input className={inputCls} value={f.contact} onChange={set('contact')} placeholder="Name — role" />
      </Field>
      <Field label="Notes" className="col-span-2 sm:col-span-2">
        <input className={inputCls} value={f.notes} onChange={set('notes')} placeholder="Anything worth remembering…" />
      </Field>
      <div className="col-span-2 flex gap-2 sm:col-span-4">
        <BtnPrimary onClick={() => onSave(normalizeAccount({ ...f, planOverride: account.planOverride }))}><Check className="h-4 w-4" aria-hidden /> Save account</BtnPrimary>
        <BtnGhost onClick={onCancel}>Cancel</BtnGhost>
      </div>
    </div>
  );
}

/* ============================== the matrix (hero) ============================== */

function MatrixGrid({ state, rollup, selected, onSelect, focusMode }) {
  if (!state.offers.length || !state.accounts.length) {
    return (
      <div className="rounded-sm border-2 border-dashed border-ink-300 bg-paper-50/60 p-10 text-center">
        <LayoutGrid className="mx-auto h-8 w-8 text-ink-300" aria-hidden />
        <p className="mx-auto mt-3 max-w-md font-body italic text-ink-500">
          The matrix needs at least one offer and one account before it can draw a single cell.
          {!state.offers.length && ' Add your offers'}{!state.offers.length && !state.accounts.length && ' and'}{!state.accounts.length && ' add your accounts'} below — or load the demo to see a finished sheet.
        </p>
      </div>
    );
  }
  const dim = (c) => {
    if (focusMode === 'whitespace') return !(c.state === 'fit' || c.state === 'in-play');
    if (focusMode === 'unscored') return !!c.state;
    return false;
  };
  return (
    <div className="relative rounded-sm border-2 border-ink-800 bg-paper-50 p-3 shadow-deep sm:p-4">
      <CornerMark corner="tl" /><CornerMark corner="tr" /><CornerMark corner="bl" /><CornerMark corner="br" />
      <MatrixTitleBlock accountsCount={state.accounts.length} offersCount={state.offers.length} />
      <div className="mt-3 overflow-x-auto rounded-sm border border-ink-200">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 min-w-[9rem] border-b-2 border-r-2 border-ink-800 bg-paper-100 px-3 py-2 text-left font-display text-xs font-bold uppercase tracking-wide text-ink-800">
                Account
              </th>
              {state.offers.map((o) => (
                <th key={o.id} scope="col" className="border-b-2 border-l border-ink-300 bg-paper-100 px-2.5 py-2 text-center align-bottom">
                  <div className="font-display text-xs font-bold text-ink-800">{o.name}</div>
                  {o.priceBand && <div className="mt-0.5 font-mono text-[10px] text-ink-400">{o.priceBand}</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.accounts.map((a) => {
              const cov = accountCoverage(state, a);
              return (
                <tr key={a.id} className="group">
                  <th scope="row" className="sticky left-0 z-10 border-b border-r-2 border-ink-800 bg-paper-50 px-3 py-2 text-left align-top group-hover:bg-paper-100">
                    <div className="font-display text-sm font-semibold text-ink-900">{a.name}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-ink-400">{a.segment || '—'}{a.arr ? ` · ${fmtMoney(a.arr)}/yr` : ''}</div>
                    <div className="mt-1.5 h-1 w-16 overflow-hidden rounded-full bg-paper-300" aria-hidden="true">
                      <div className="h-full bg-ink-800" style={{ width: `${cov * 100}%` }} />
                    </div>
                  </th>
                  {state.offers.map((o) => {
                    const c = getCell(rollup.cellMap, a.id, o.id);
                    const isSel = selected && selected.accountId === a.id && selected.offerId === o.id;
                    return (
                      <td key={o.id} className="border-b border-l border-ink-200 p-0 align-top">
                        <button
                          type="button"
                          onClick={() => onSelect({ accountId: a.id, offerId: o.id })}
                          aria-label={`${a.name} × ${o.name}: ${c.state ? STATES[c.state].label : 'unscored'}${c.value ? `, ${fmtMoney(c.value)}` : ''}`}
                          className={`${CELL_CLASS[c.state]} flex h-16 w-24 flex-col items-center justify-center gap-1 outline-none transition-opacity sm:h-[4.5rem] sm:w-28 ${isSel ? 'ring-2 ring-inset ring-joy-600' : ''} ${dim(c) ? 'opacity-25' : ''}`}
                        >
                          <StateIcon state={c.state} />
                          {c.value > 0 && (
                            <span className={`font-mono text-[10.5px] font-semibold ${c.state === 'sold' ? 'text-paper-50' : c.state === 'in-play' ? 'text-ink-900' : 'text-ink-700'}`}>{fmtMoney(c.value)}</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================== cell inspector ============================== */

function CellInspector({ state, selected, rollup, onSetState, onPatchCell, onClear }) {
  if (!selected) {
    return (
      <div className="rounded-sm border border-ink-200 bg-paper-50/80 p-5 text-center shadow-card">
        <Crosshair className="mx-auto h-6 w-6 text-ink-300" aria-hidden />
        <p className="mx-auto mt-2 max-w-[16rem] font-body text-sm italic text-ink-500">
          Click any cell in the matrix to size it up — set its state, its value, and the next move.
        </p>
      </div>
    );
  }
  const a = accountById(state, selected.accountId), o = offerById(state, selected.offerId);
  const c = getCell(rollup.cellMap, selected.accountId, selected.offerId);
  if (!a || !o) return null;
  return (
    <div className="rounded-sm border-2 border-ink-800 bg-paper-50 p-4 shadow-deep">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">Cell inspector</div>
      <h3 className="mt-0.5 font-display text-lg font-black leading-tight text-ink-900">{a.name} × {o.name}</h3>
      <p className="mt-1 font-body text-xs text-ink-500">{[a.segment, o.priceBand].filter(Boolean).join(' · ') || '—'}</p>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {STATE_ORDER.map((k) => (
          <button key={k} type="button" onClick={() => onSetState(k)} title={STATES[k].desc}
            className={`rounded-sm border px-2 py-1.5 font-display text-xs font-semibold transition-colors ${c.state === k ? STATE_BTN_ACTIVE[k] : 'border-ink-200 bg-paper-50 text-ink-600 hover:bg-paper-100'}`}>
            {STATES[k].label}
          </button>
        ))}
      </div>
      {c.state && (
        <button type="button" onClick={onClear} className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-ink-400 hover:text-ink-700">
          <RotateCcw className="h-3 w-3" aria-hidden /> clear score
        </button>
      )}
      <div className="mt-3 space-y-2.5">
        <Field label="Opportunity value ($)">
          <input type="number" min="0" step="500" className={inputCls} value={c.value || ''}
            onChange={(e) => onPatchCell({ value: clamp(num(e.target.value), 0, 1e9) })} placeholder="e.g. 12000" />
        </Field>
        <Field label="Note">
          <textarea rows={2} className={inputCls} value={c.note}
            onChange={(e) => onPatchCell({ note: e.target.value })} placeholder="Why this state — signal, blocker, timing…" />
        </Field>
        {(c.state === 'fit' || c.state === 'in-play') && (
          <Field label="Next play">
            <textarea rows={2} className={inputCls} value={c.play}
              onChange={(e) => onPatchCell({ play: e.target.value })} placeholder="The one action that moves this forward…" />
          </Field>
        )}
      </div>
    </div>
  );
}

/* ============================== main app ============================== */

export default function App() {
  const consoleCtx = useConsoleBus();
  const [state, setState] = useState(loadState);
  const [showGuide, setShowGuide] = useState(() => !loadState().seenGuide);
  const [showExport, setShowExport] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [toast, setToast] = useState(null);
  const [selected, setSelected] = useState(null);
  const [focusMode, setFocusMode] = useState('all');
  const [addingOffer, setAddingOffer] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [addingAccount, setAddingAccount] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [queueFilter, setQueueFilter] = useState('all');
  const [queueQuery, setQueueQuery] = useState('');
  const [acctQuery, setAcctQuery] = useState('');
  const [copilotCellKey, setCopilotCellKey] = useState('');
  const [planEditId, setPlanEditId] = useState(null);
  const fileRef = useRef(null);
  const toastTimer = useRef(null);

  /* autosave (debounced) */
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
    }, 350);
    return () => clearTimeout(t);
  }, [state]);

  /* toast lifecycle */
  const fireToast = useCallback((msg, undo = null) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), 7000);
  }, []);
  const dismissToast = () => { clearTimeout(toastTimer.current); setToast(null); };

  /* derived */
  const rollup = useMemo(() => computeRollup(state), [state]);
  const best = useMemo(() => bestOpenCell(state), [state]);
  const playQueueAll = useMemo(
    () => state.cells.filter((c) => c.state === 'fit' || c.state === 'in-play').sort((a, b) => b.value - a.value),
    [state.cells]
  );
  const playQueue = useMemo(() => playQueueAll.filter((c) => {
    if (queueFilter !== 'all' && c.state !== queueFilter) return false;
    if (queueQuery) {
      const a = accountById(state, c.accountId), o = offerById(state, c.offerId);
      const hay = `${a?.name} ${o?.name} ${c.note}`.toLowerCase();
      if (!hay.includes(queueQuery.toLowerCase())) return false;
    }
    return true;
  }), [playQueueAll, queueFilter, queueQuery, state]);
  const filteredAccounts = useMemo(() => state.accounts.filter((a) => {
    if (!acctQuery) return true;
    return `${a.name} ${a.segment} ${a.contact}`.toLowerCase().includes(acctQuery.toLowerCase());
  }), [state.accounts, acctQuery]);
  const copilotCell = useMemo(() => {
    if (copilotCellKey) {
      const found = playQueueAll.find((c) => cellKey(c.accountId, c.offerId) === copilotCellKey);
      if (found) return found;
    }
    return best;
  }, [copilotCellKey, playQueueAll, best]);

  /* actions: lifecycle */
  const closeGuide = () => { setShowGuide(false); setState((s) => ({ ...s, seenGuide: true })); };
  const loadDemo = () => { setState({ ...demoState(), seenGuide: true }); setSelected(null); fireToast('Demo sheet loaded — an agency charting six accounts against three offers.'); };
  const doReset = () => { setState(normalize({ seenGuide: true })); setSelected(null); setConfirmReset(false); fireToast('The matrix was wiped clean. Fresh sheet awaits.'); };

  /* actions: offers */
  const saveOffer = (offer) => {
    setState((s) => {
      const exists = s.offers.some((o) => o.id === offer.id);
      return { ...s, offers: exists ? s.offers.map((o) => (o.id === offer.id ? offer : o)) : [...s.offers, offer] };
    });
    setEditingOfferId(null); setAddingOffer(false);
  };
  const deleteOffer = (id) => {
    const idx = state.offers.findIndex((o) => o.id === id);
    const offer = state.offers[idx];
    if (!offer) return;
    const removedCells = state.cells.filter((c) => c.offerId === id);
    setState((s) => ({ ...s, offers: s.offers.filter((o) => o.id !== id), cells: s.cells.filter((c) => c.offerId !== id) }));
    if (selected?.offerId === id) setSelected(null);
    fireToast(`Offer "${offer.name}" removed from the matrix.`, () => {
      setState((s) => {
        const offers = [...s.offers]; offers.splice(Math.min(idx, offers.length), 0, offer);
        return { ...s, offers, cells: [...s.cells, ...removedCells] };
      });
    });
  };
  const moveOffer = (id, dir) => {
    setState((s) => {
      const i = s.offers.findIndex((o) => o.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.offers.length) return s;
      const offers = [...s.offers];
      [offers[i], offers[j]] = [offers[j], offers[i]];
      return { ...s, offers };
    });
  };

  /* actions: accounts */
  const saveAccount = (account) => {
    setState((s) => {
      const exists = s.accounts.some((a) => a.id === account.id);
      return { ...s, accounts: exists ? s.accounts.map((a) => (a.id === account.id ? account : a)) : [...s.accounts, account] };
    });
    setEditingAccountId(null); setAddingAccount(false);
  };
  const deleteAccount = (id) => {
    const idx = state.accounts.findIndex((a) => a.id === id);
    const account = state.accounts[idx];
    if (!account) return;
    const removedCells = state.cells.filter((c) => c.accountId === id);
    setState((s) => ({ ...s, accounts: s.accounts.filter((a) => a.id !== id), cells: s.cells.filter((c) => c.accountId !== id) }));
    if (selected?.accountId === id) setSelected(null);
    fireToast(`Account "${account.name}" removed from the matrix.`, () => {
      setState((s) => {
        const accounts = [...s.accounts]; accounts.splice(Math.min(idx, accounts.length), 0, account);
        return { ...s, accounts, cells: [...s.cells, ...removedCells] };
      });
    });
  };
  const moveAccount = (id, dir) => {
    setState((s) => {
      const i = s.accounts.findIndex((a) => a.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.accounts.length) return s;
      const accounts = [...s.accounts];
      [accounts[i], accounts[j]] = [accounts[j], accounts[i]];
      return { ...s, accounts };
    });
  };
  const resetPlanOverride = (id) => setState((s) => ({ ...s, accounts: s.accounts.map((a) => (a.id === id ? { ...a, planOverride: '' } : a)) }));
  const patchPlanOverride = (id, text) => setState((s) => ({ ...s, accounts: s.accounts.map((a) => (a.id === id ? { ...a, planOverride: text } : a)) }));

  /* actions: cells */
  const setCellState = (accountId, offerId, newState) => {
    setState((s) => {
      const idx = s.cells.findIndex((c) => c.accountId === accountId && c.offerId === offerId);
      if (idx === -1) return { ...s, cells: [...s.cells, { id: uid(), accountId, offerId, state: newState, value: 0, note: '', play: '' }] };
      const next = [...s.cells]; next[idx] = { ...next[idx], state: newState };
      return { ...s, cells: next };
    });
  };
  const patchCell = (accountId, offerId, patch) => {
    setState((s) => {
      const idx = s.cells.findIndex((c) => c.accountId === accountId && c.offerId === offerId);
      if (idx === -1) return { ...s, cells: [...s.cells, { id: uid(), accountId, offerId, state: '', value: 0, note: '', play: '', ...patch }] };
      const next = [...s.cells]; next[idx] = { ...next[idx], ...patch };
      return { ...s, cells: next };
    });
  };
  const clearCell = (accountId, offerId) => {
    setState((s) => ({ ...s, cells: s.cells.filter((c) => !(c.accountId === accountId && c.offerId === offerId)) }));
  };
  const promoteCell = (c, newState) => setCellState(c.accountId, c.offerId, newState);

  /* copy / export */
  const doCopy = async (key, text, msg) => {
    const ok = await copyText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2200);
    if (msg) fireToast(ok ? msg : 'Copy failed — your browser blocked the clipboard.');
  };
  const copyPlan = () => doCopy('plan', planMarkdown(state), 'Expansion Plan copied as Markdown.');
  const downloadJson = () => download('expansion-matrix.json', JSON.stringify(state, null, 2), 'application/json');
  const downloadCsv = () => download('expansion-matrix.csv', matrixCsv(state), 'text/csv');
  const importJson = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try { setState(normalize(JSON.parse(String(rd.result)))); setSelected(null); fireToast('Matrix imported — every offer, account, and cell restored.'); }
      catch { fireToast('That file was not a valid Expansion Matrix JSON.'); }
    };
    rd.readAsText(f);
    e.target.value = '';
  };

  /* keyboard */
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable;
      if (e.key === 'Escape') {
        if (showExport) setShowExport(false);
        else if (showRoster) setShowRoster(false);
        else if (showGuide) closeGuide();
        else if (confirmReset) setConfirmReset(false);
        else if (selected) setSelected(null);
        return;
      }
      if (typing) return;
      if (e.key === '?') { e.preventDefault(); setShowGuide(true); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); copyPlan(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const selCell = selected ? getCell(rollup.cellMap, selected.accountId, selected.offerId) : null;

  return (
    <main className="min-h-screen pb-24 font-body">
      {/* ======================= header ======================= */}
      <header className="no-print border-b-2 border-ink-800/60 bg-paper-50/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <MatrixMark />
            <div>
              <h1 className="font-display text-2xl font-black leading-none tracking-tight text-ink-900">Expansion Matrix</h1>
              <p className="mt-1 font-body text-[13px] italic text-ink-500">Chart every account against every offer — score the whitespace, size it, work the best cells first.</p>
            </div>
            <ConsoleLinkedPill ctx={consoleCtx} />
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <BtnGhost onClick={loadDemo}><Rocket className="h-4 w-4" aria-hidden /> Load demo</BtnGhost>
            {confirmReset ? (
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-joy-600 bg-joy-100 px-2 py-1">
                <span className="font-body text-xs italic text-ink-700">Wipe the matrix?</span>
                <button onClick={doReset} className="rounded-sm bg-ink-800 px-2 py-0.5 font-display text-xs font-semibold text-paper-50 hover:bg-ink-700">Wipe it</button>
                <button onClick={() => setConfirmReset(false)} className="px-1 font-display text-xs font-semibold text-ink-600 hover:text-ink-800">Keep</button>
              </span>
            ) : (
              <BtnGhost onClick={() => setConfirmReset(true)}><RotateCcw className="h-4 w-4" aria-hidden /> Reset</BtnGhost>
            )}
            <BtnGhost onClick={() => setShowGuide(true)}><HelpCircle className="h-4 w-4" aria-hidden /> How to use</BtnGhost>
            <div className="relative">
              <BtnPrimary onClick={() => setShowExport((v) => !v)} aria-expanded={showExport} aria-haspopup="menu">
                <Download className="h-4 w-4" aria-hidden /> Export
              </BtnPrimary>
              {showExport && (
                <div role="menu" className="em-rise absolute right-0 z-40 mt-2 w-64 rounded-sm border-2 border-ink-800 bg-paper-50 p-1.5 shadow-deep">
                  {[
                    { k: 'md', icon: FileText, label: copiedKey === 'plan' ? 'Copied to clipboard' : 'Copy plan as Markdown', hint: 'Ctrl/Cmd+S', act: copyPlan },
                    { k: 'json', icon: FileJson, label: 'Download JSON (full state)', hint: '', act: downloadJson },
                    { k: 'csv', icon: FileSpreadsheet, label: 'Download matrix CSV', hint: '', act: downloadCsv },
                    { k: 'imp', icon: Upload, label: 'Import JSON…', hint: '', act: () => fileRef.current?.click() },
                    { k: 'prt', icon: Printer, label: 'Print the Expansion Plan', hint: '', act: () => window.print() },
                  ].map((it) => (
                    <button key={it.k} role="menuitem" onClick={() => { it.act(); if (it.k !== 'md') setShowExport(false); }}
                      className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left font-body text-sm text-ink-800 hover:bg-paper-100">
                      <it.icon className="h-4 w-4 text-ink-500" aria-hidden />
                      <span className="flex-1">{it.label}</span>
                      {it.hint && <kbd className="font-mono text-[10px] text-ink-400">{it.hint}</kbd>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={importJson} aria-label="Import Expansion Matrix JSON file" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* ======================= verdict + business context ======================= */}
        <section className="no-print mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="rounded-sm border-2 border-joy-600 bg-paper-50 p-4 shadow-card">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-joy-600">
              <Target className="h-3.5 w-3.5" aria-hidden /> Architect’s read
            </div>
            {best ? (
              <>
                {(() => {
                  const acc = accountById(state, best.accountId), off = offerById(state, best.offerId);
                  return (
                    <>
                      <h3 className="mt-1 font-display text-xl font-black leading-tight text-ink-900">Work “{acc?.name} × {off?.name}” next</h3>
                      <p className="mt-2 font-body text-sm leading-relaxed text-ink-700">
                        <span className="font-mono font-semibold text-joy-600">{fmtMoney(best.value)}</span> estimated, currently marked {STATES[best.state].label}.
                        {best.note ? ` ${best.note}` : ' No notes yet — open the cell and say why.'}
                        {best.play ? ` Next: ${best.play}` : ''}
                      </p>
                    </>
                  );
                })()}
              </>
            ) : (
              <p className="mt-2 font-body text-sm italic leading-relaxed text-ink-600">
                No read without scored cells. Mark at least one cell “Fit” or “In Play” below — the architect ranks by dollar value and tells you where to work first.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-sm border border-ink-200 bg-paper-50/80 p-4 shadow-card">
              <Field label="The business — what do you sell, and to whom?">
                <textarea rows={3} className={inputCls} value={state.business}
                  onChange={(e) => setState((s) => ({ ...s, business: e.target.value }))}
                  placeholder="e.g. 9-person agency, one retainer to land, then we expand…" />
              </Field>
              <p className="mt-1.5 font-body text-[11px] italic text-ink-500">Woven into every Copilot prompt so Claude knows your shop.</p>
            </div>
          </div>
        </section>

        {/* ======================= offers ======================= */}
        <section className="no-print mt-10">
          <SectionHead icon={Layers} kicker="Your line card" title="Offers"
            aside={<BtnPrimary onClick={() => { setAddingOffer(true); setEditingOfferId(null); }}><Plus className="h-4 w-4" aria-hidden /> Add offer</BtnPrimary>} />
          {addingOffer && (
            <div className="mb-4 rounded-sm border-2 border-dashed border-ink-300 bg-paper-50/80 p-4 shadow-card">
              <OfferEditor offer={normalizeOffer({})} onSave={saveOffer} onCancel={() => setAddingOffer(false)} />
            </div>
          )}
          {state.offers.length === 0 && !addingOffer && (
            <div className="rounded-sm border-2 border-dashed border-ink-300 bg-paper-50/60 p-6 text-center">
              <p className="mx-auto max-w-md font-body italic text-ink-500">An offer is anything you sell as a distinct line item. Add the ones you already have — these become the matrix columns.</p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {state.offers.map((o, i) => (
              <article key={o.id} className="rounded-sm border-2 border-ink-200 bg-paper-50 p-3.5 shadow-card">
                {editingOfferId === o.id ? (
                  <OfferEditor offer={o} onSave={saveOffer} onCancel={() => setEditingOfferId(null)} />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-base font-black text-ink-900">{o.name}</h3>
                        {o.priceBand && <p className="mt-0.5 font-mono text-[11px] text-joy-600">{o.priceBand}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <IconBtn label={`Move ${o.name} left`} onClick={() => moveOffer(o.id, -1)} disabled={i === 0} className="disabled:opacity-30"><ChevronUp className="h-4 w-4 -rotate-90" aria-hidden /></IconBtn>
                        <IconBtn label={`Move ${o.name} right`} onClick={() => moveOffer(o.id, 1)} disabled={i === state.offers.length - 1} className="disabled:opacity-30"><ChevronDown className="h-4 w-4 -rotate-90" aria-hidden /></IconBtn>
                        <IconBtn label={`Edit ${o.name}`} onClick={() => { setEditingOfferId(o.id); setAddingOffer(false); }}><Pencil className="h-4 w-4" aria-hidden /></IconBtn>
                        <IconBtn label={`Delete ${o.name}`} onClick={() => deleteOffer(o.id)} className="hover:text-joy-700"><Trash2 className="h-4 w-4" aria-hidden /></IconBtn>
                      </div>
                    </div>
                    {o.desc && <p className="mt-2 font-body text-[13px] italic leading-relaxed text-ink-600">{o.desc}</p>}
                  </>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* ======================= accounts ======================= */}
        <section className="no-print mt-10">
          <SectionHead icon={Building2} kicker="Who you already sell to" title="Accounts"
            aside={
              <div className="flex flex-wrap items-center gap-2">
                {consoleCtx?.roster?.accounts?.length > 0 && (
                  <div className="relative">
                    <BtnGhost onClick={() => setShowRoster((v) => !v)} aria-expanded={showRoster} aria-haspopup="menu">
                      <Cable className="h-4 w-4" aria-hidden /> Pull from console roster
                    </BtnGhost>
                    {showRoster && (
                      <div role="menu" className="em-rise absolute right-0 z-40 mt-2 max-h-72 w-64 overflow-y-auto rounded-sm border-2 border-ink-800 bg-paper-50 p-1.5 shadow-deep">
                        {consoleCtx.roster.accounts.map((a, i) => (
                          <button key={`${a.name}-${i}`} role="menuitem" type="button"
                            onClick={() => { saveAccount(normalizeAccount({ name: a.name, segment: a.segment || '', notes: a.notes || '' })); setShowRoster(false); }}
                            className="flex w-full items-center justify-between gap-2 rounded-sm px-2.5 py-2 text-left font-body text-sm text-ink-800 hover:bg-paper-100">
                            <span className="truncate">{a.name}</span>
                            {a.segment && <span className="shrink-0 font-mono text-[10px] text-ink-400">{a.segment}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <BtnPrimary onClick={() => { setAddingAccount(true); setEditingAccountId(null); }}><Plus className="h-4 w-4" aria-hidden /> Add account</BtnPrimary>
              </div>
            } />
          {addingAccount && (
            <div className="mb-4 rounded-sm border-2 border-dashed border-ink-300 bg-paper-50/80 p-4 shadow-card">
              <AccountEditor account={normalizeAccount({})} onSave={saveAccount} onCancel={() => setAddingAccount(false)} />
            </div>
          )}
          {state.accounts.length > 4 && (
            <div className="relative mb-3 max-w-xs">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" aria-hidden />
              <input className={`${inputCls} pl-7`} placeholder="Search accounts…" value={acctQuery} onChange={(e) => setAcctQuery(e.target.value)} aria-label="Search accounts" />
            </div>
          )}
          {state.accounts.length === 0 && !addingAccount && (
            <div className="rounded-sm border-2 border-dashed border-ink-300 bg-paper-50/60 p-6 text-center">
              <p className="mx-auto max-w-md font-body italic text-ink-500">Add the real companies already paying you something. These become the matrix rows — even one account is enough to start scoring.</p>
            </div>
          )}
          <ul className="divide-y divide-ink-200 rounded-sm border border-ink-200 bg-paper-50/80 shadow-card">
            {filteredAccounts.map((a, i) => (
              <li key={a.id} className="px-3 py-2.5">
                {editingAccountId === a.id ? (
                  <AccountEditor account={a} onSave={saveAccount} onCancel={() => setEditingAccountId(null)} />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-display text-sm font-semibold text-ink-900">{a.name}</span>
                        <span className="font-mono text-[11px] text-ink-400">{[a.segment, a.contact].filter(Boolean).join(' · ')}</span>
                      </div>
                      {a.notes && <p className="truncate font-body text-xs italic text-ink-500">{a.notes}</p>}
                    </div>
                    <span className="hidden shrink-0 font-mono text-xs text-ink-500 sm:block">{a.arr ? `${fmtMoney(a.arr)}/yr` : '—'}</span>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <IconBtn label={`Move ${a.name} up`} onClick={() => moveAccount(a.id, -1)} disabled={i === 0} className="disabled:opacity-30"><ChevronUp className="h-4 w-4" aria-hidden /></IconBtn>
                      <IconBtn label={`Move ${a.name} down`} onClick={() => moveAccount(a.id, 1)} disabled={i === state.accounts.length - 1} className="disabled:opacity-30"><ChevronDown className="h-4 w-4" aria-hidden /></IconBtn>
                      <IconBtn label={`Edit ${a.name}`} onClick={() => { setEditingAccountId(a.id); setAddingAccount(false); }}><Pencil className="h-4 w-4" aria-hidden /></IconBtn>
                      <IconBtn label={`Delete ${a.name}`} onClick={() => deleteAccount(a.id)} className="hover:text-joy-700"><Trash2 className="h-4 w-4" aria-hidden /></IconBtn>
                    </div>
                  </div>
                )}
              </li>
            ))}
            {filteredAccounts.length === 0 && state.accounts.length > 0 && (
              <li className="px-4 py-6 text-center font-body text-sm italic text-ink-500">No accounts match that search.</li>
            )}
          </ul>
        </section>

        {/* ======================= the matrix + inspector ======================= */}
        <section className="no-print mt-10">
          <SectionHead icon={LayoutGrid} kicker="The whitespace" title="The Matrix"
            aside={
              <div className="flex overflow-hidden rounded-sm border border-ink-300" role="group" aria-label="Focus the matrix">
                {[['all', 'All'], ['whitespace', 'Whitespace'], ['unscored', 'Unscored']].map(([k, label]) => (
                  <button key={k} onClick={() => setFocusMode(k)}
                    className={`px-2.5 py-1.5 font-mono text-xs ${focusMode === k ? 'bg-ink-800 text-paper-50' : 'bg-paper-50 text-ink-600 hover:bg-paper-100'}`}>
                    {label}
                  </button>
                ))}
              </div>
            } />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <MatrixGrid state={state} rollup={rollup} selected={selected} onSelect={setSelected} focusMode={focusMode} />
            <aside className="flex flex-col gap-4">
              <CellInspector
                state={state} selected={selected} rollup={rollup}
                onSetState={(k) => selected && setCellState(selected.accountId, selected.offerId, k)}
                onPatchCell={(patch) => selected && patchCell(selected.accountId, selected.offerId, patch)}
                onClear={() => selected && clearCell(selected.accountId, selected.offerId)}
              />
              <div className="rounded-sm border border-ink-200 bg-paper-50/80 p-4 shadow-card">
                <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">Opportunity breakdown</div>
                <RollupBar rollup={rollup} />
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10px] text-ink-500">
                  <span>{rollup.sold} sold · {rollup.fit} fit</span>
                  <span className="text-right">{rollup.inplay} in play · {rollup.nofit} no-fit</span>
                  <span className="col-span-2">{rollup.unscored} of {rollup.totalCombos} cells unscored</span>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* ======================= play queue ======================= */}
        <section className="no-print mt-10">
          <SectionHead icon={ListOrdered} kicker="Work these first" title="Play Queue" />
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" aria-hidden />
              <input className={`${inputCls} w-48 pl-7`} placeholder="Search the queue…" value={queueQuery} onChange={(e) => setQueueQuery(e.target.value)} aria-label="Search play queue" />
            </div>
            <div className="flex overflow-hidden rounded-sm border border-ink-300" role="group" aria-label="Filter by state">
              {['all', 'fit', 'in-play'].map((k) => (
                <button key={k} onClick={() => setQueueFilter(k)}
                  className={`px-2.5 py-1.5 font-mono text-xs ${queueFilter === k ? 'bg-ink-800 text-paper-50' : 'bg-paper-50 text-ink-600 hover:bg-paper-100'}`}>
                  {k === 'all' ? 'All' : STATES[k].label}
                </button>
              ))}
            </div>
            <span className="ml-auto font-mono text-[11px] text-ink-500">{playQueue.length} cells · {fmtMoney(playQueue.reduce((s, c) => s + c.value, 0))}</span>
          </div>
          {playQueueAll.length === 0 ? (
            <div className="rounded-sm border-2 border-dashed border-ink-300 bg-paper-50/60 p-8 text-center">
              <ListOrdered className="mx-auto h-8 w-8 text-ink-300" aria-hidden />
              <p className="mx-auto mt-3 max-w-md font-body italic text-ink-500">Nothing is marked Fit or In Play yet. Score a few cells in the matrix above — the strongest ones will rank here automatically.</p>
            </div>
          ) : (
            <ul className="divide-y divide-ink-200 rounded-sm border border-ink-200 bg-paper-50/80 shadow-card">
              {playQueue.map((c) => {
                const a = accountById(state, c.accountId), o = offerById(state, c.offerId);
                if (!a || !o) return null;
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5">
                    <span className={`shrink-0 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${c.state === 'in-play' ? 'border-joy-700 bg-joy-100 text-joy-700' : 'border-blue-500 bg-blue-100 text-blue-700'}`}>
                      {STATES[c.state].label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-sm font-semibold text-ink-900">{a.name} × {o.name}</div>
                      {(c.note || c.play) && <div className="truncate font-body text-xs italic text-ink-500">{c.play ? `Next: ${c.play}` : c.note}</div>}
                    </div>
                    <span className="shrink-0 font-mono text-sm font-semibold text-ink-800">{fmtMoney(c.value)}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      {c.state === 'fit' && (
                        <BtnGhost onClick={() => promoteCell(c, 'in-play')} className="px-2 py-1 text-xs"><Rocket className="h-3.5 w-3.5" aria-hidden /> Mark in play</BtnGhost>
                      )}
                      {c.state === 'in-play' && (
                        <BtnGhost onClick={() => promoteCell(c, 'sold')} className="px-2 py-1 text-xs"><Check className="h-3.5 w-3.5" aria-hidden /> Mark sold</BtnGhost>
                      )}
                      <IconBtn label={`Inspect ${a.name} × ${o.name}`} onClick={() => setSelected({ accountId: c.accountId, offerId: c.offerId })}><Crosshair className="h-4 w-4" aria-hidden /></IconBtn>
                    </div>
                  </li>
                );
              })}
              {playQueue.length === 0 && (
                <li className="px-4 py-6 text-center font-body text-sm italic text-ink-500">Nothing in the queue matches those filters.</li>
              )}
            </ul>
          )}
        </section>

        {/* ======================= account plans ======================= */}
        <section className="no-print mt-10">
          <SectionHead icon={NotebookPen} kicker="One page per account" title="Account Plans" />
          {state.accounts.length === 0 ? (
            <div className="rounded-sm border-2 border-dashed border-ink-300 bg-paper-50/60 p-6 text-center">
              <p className="mx-auto max-w-md font-body italic text-ink-500">Plans appear automatically once you have accounts and a scored cell or two.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {state.accounts.map((a) => {
                const auto = accountSnippet(state, a);
                const editing = planEditId === a.id;
                return (
                  <article key={a.id} className="rounded-sm border border-ink-200 bg-paper-50 p-3.5 shadow-card">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-base font-black text-ink-900">{a.name}</h3>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <IconBtn label={editing ? `Stop editing ${a.name}'s plan` : `Edit ${a.name}'s plan`} onClick={() => setPlanEditId(editing ? null : a.id)}><Pencil className="h-4 w-4" aria-hidden /></IconBtn>
                        <IconBtn label={`Copy ${a.name}'s plan`} onClick={() => doCopy('acct-' + a.id, `${a.name}\n\n${a.planOverride || auto}`, `${a.name}'s plan copied.`)}>
                          {copiedKey === 'acct-' + a.id ? <Check className="h-4 w-4 text-joy-600" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                        </IconBtn>
                      </div>
                    </div>
                    {editing ? (
                      <div className="mt-2">
                        <textarea rows={4} className={inputCls} value={a.planOverride || auto} onChange={(e) => patchPlanOverride(a.id, e.target.value)} />
                        {a.planOverride && (
                          <button onClick={() => resetPlanOverride(a.id)} className="mt-1.5 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-ink-400 hover:text-ink-700">
                            <RotateCcw className="h-3 w-3" aria-hidden /> reset to auto-generated
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 font-body text-[13px] leading-relaxed text-ink-700">{a.planOverride || auto}</p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ======================= copilot ======================= */}
        <section className="no-print mt-12">
          <SectionHead icon={Sparkles} kicker="Pairs with your $20 Claude subscription" title="Claude Copilot" />
          <div className="rounded-sm border-2 border-ink-800 bg-ink-800 p-5 shadow-deep">
            <p className="max-w-3xl font-body text-sm italic leading-relaxed text-paper-200">
              Each action below writes a complete, matrix-briefed prompt with your live data baked in.
              Copy one, paste it into <span className="font-semibold not-italic text-joy-300">claude.ai</span> — works with the standard $20 Claude subscription, no API key, no setup.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Field label="Cell for account-specific prompts" className="w-full sm:w-80">
                <select className={inputCls} value={copilotCell ? cellKey(copilotCell.accountId, copilotCell.offerId) : ''}
                  onChange={(e) => setCopilotCellKey(e.target.value)} disabled={!playQueueAll.length}>
                  {!playQueueAll.length && <option value="">Score a Fit or In Play cell first</option>}
                  {playQueueAll.map((c) => {
                    const a = accountById(state, c.accountId), o = offerById(state, c.offerId);
                    return <option key={c.id} value={cellKey(c.accountId, c.offerId)}>{a?.name} × {o?.name} — {fmtMoney(c.value)}</option>;
                  })}
                </select>
              </Field>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                { k: 'rank', icon: ListOrdered, title: 'Rank my whitespace cells', desc: 'Claude re-ranks by value, ease, and urgency, calls out mis-sized cells, and names your top 3 for the next two weeks.', need: true, get: () => consoleContextHeader(consoleCtx) + promptRankCells(state) },
                { k: 'ref', icon: Building2, title: 'Draft the internal-referral ask', desc: 'A warm, short email to your existing champion asking for an introduction to the new offer or department.', need: !!copilotCell, get: () => consoleContextHeader(consoleCtx) + promptReferralAsk(state, copilotCell) },
                { k: 'pitch', icon: Target, title: 'Write the expansion pitch', desc: 'A proof-first pitch for the selected cell, plus the likely objection and a one-line pre-empt.', need: !!copilotCell, get: () => consoleContextHeader(consoleCtx) + promptExpansionPitch(state, copilotCell) },
              ].map((c) => (
                <div key={c.k} className="flex flex-col rounded-sm border border-ink-600 bg-ink-900/40 p-4">
                  <div className="flex items-center gap-2">
                    <c.icon className="h-4 w-4 text-joy-300" aria-hidden />
                    <h3 className="font-display text-base font-black text-paper-100">{c.title}</h3>
                  </div>
                  <p className="mt-1.5 flex-1 font-body text-[13px] leading-relaxed text-paper-200/80">{c.desc}</p>
                  <button
                    onClick={() => c.need && doCopy('cp-' + c.k, c.get())}
                    disabled={!c.need}
                    className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-sm border border-joy-400 bg-joy-400/10 px-3 py-2 font-display text-sm font-semibold text-joy-300 transition-colors hover:bg-joy-400/25 disabled:cursor-not-allowed disabled:opacity-40">
                    {copiedKey === 'cp-' + c.k ? (<><Check className="h-4 w-4" aria-hidden /> Copied — paste into claude.ai</>) : (<><Copy className="h-4 w-4" aria-hidden /> Copy prompt</>)}
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Field label="Field notes — paste Claude's best findings back here (saved with your matrix)">
                <textarea rows={4} className={`${inputCls} border-ink-600 bg-ink-900/40 text-paper-100 placeholder:text-paper-200/40`}
                  value={state.copilotNotes}
                  onChange={(e) => setState((s) => ({ ...s, copilotNotes: e.target.value }))}
                  placeholder="Revised rankings, the pitch that landed, the referral ask that got a reply…" />
              </Field>
            </div>
          </div>
        </section>

        <footer className="no-print mt-12 border-t border-ink-200 pt-4 pb-2 text-center font-body text-xs italic text-ink-500">
          Expansion Matrix · your data never leaves this device — stored locally, exportable always ·
          <kbd className="mx-1 rounded-sm border border-ink-300 bg-paper-50 px-1.5 py-0.5 font-mono not-italic">?</kbd> help ·
          <kbd className="mx-1 rounded-sm border border-ink-300 bg-paper-50 px-1.5 py-0.5 font-mono not-italic">Ctrl+S</kbd> copy plan
        </footer>
      </div>

      {/* ======================= print sheet ======================= */}
      <section className="print-only px-8 py-6" aria-hidden="true">
        <h1 className="font-display text-3xl font-black">Expansion Matrix — {new Date().toISOString().slice(0, 10)}</h1>
        {state.business && <p className="mt-2 font-body italic">{state.business}</p>}
        {best && (() => {
          const acc = accountById(state, best.accountId), off = offerById(state, best.offerId);
          return <p className="mt-3 font-body"><strong>Architect’s read:</strong> work “{acc?.name} × {off?.name}” next — {fmtMoney(best.value)} ({STATES[best.state].label}).</p>;
        })()}
        <h2 className="mt-5 font-display text-xl font-black">The Matrix</h2>
        <table className="mt-2 w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-ink-400 px-2 py-1 text-left">Account</th>
              {state.offers.map((o) => <th key={o.id} className="border border-ink-400 px-2 py-1 text-left">{o.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {state.accounts.map((a) => (
              <tr key={a.id}>
                <td className="border border-ink-400 px-2 py-1 font-semibold">{a.name}</td>
                {state.offers.map((o) => {
                  const c = getCell(rollup.cellMap, a.id, o.id);
                  return <td key={o.id} className="border border-ink-400 px-2 py-1">{c.state ? `${STATES[c.state].label}${c.value ? ` (${fmtMoney(c.value)})` : ''}` : '—'}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <h2 className="mt-5 font-display text-xl font-black">Play Queue</h2>
        {playQueueAll.map((c, i) => {
          const a = accountById(state, c.accountId), o = offerById(state, c.offerId);
          return <p key={c.id} className="mt-1 font-body text-sm">{i + 1}. {a?.name} × {o?.name} — {fmtMoney(c.value)} ({STATES[c.state].label}){c.play ? ` — next: ${c.play}` : ''}</p>;
        })}
        <h2 className="mt-5 font-display text-xl font-black">Account Plans</h2>
        {state.accounts.map((a) => (
          <p key={a.id} className="mt-1.5 font-body text-sm"><strong>{a.name}</strong> — {a.planOverride || accountSnippet(state, a)}</p>
        ))}
      </section>

      {/* ======================= guide modal ======================= */}
      {showGuide && (
        <Modal title="How to use Expansion Matrix" onClose={closeGuide} wide>
          <ol className="list-decimal space-y-2.5 pl-5 font-body text-sm leading-relaxed text-ink-800 marker:font-mono marker:text-joy-600">
            <li><strong className="font-display">Describe the business.</strong> What you sell and to whom — every Copilot prompt uses it.</li>
            <li><strong className="font-display">List your Offers.</strong> Each one becomes a column in the matrix.</li>
            <li><strong className="font-display">List your Accounts.</strong> Each one becomes a row.</li>
            <li><strong className="font-display">Score the Matrix.</strong> Click any cell, then mark it <strong>Sold</strong> (already buying), <strong>Fit</strong> (open whitespace), <strong>In Play</strong> (actively pursuing), or <strong>No Fit</strong> (excluded) — add a value and a note in the inspector.</li>
            <li><strong className="font-display">Read the Architect’s read.</strong> It surfaces your single highest-value open cell automatically.</li>
            <li><strong className="font-display">Work the Play Queue.</strong> Every Fit and In Play cell ranks there by dollar value — promote Fit → In Play → Sold as deals move.</li>
            <li><strong className="font-display">Run the Copilot.</strong> Copy a prompt — rank cells, draft a referral ask, or write a pitch — and paste it into claude.ai (standard $20 subscription). Paste findings back into Field notes.</li>
            <li><strong className="font-display">Export.</strong> Copy the Expansion Plan as Markdown, download JSON or the matrix CSV, print, or re-import a JSON later.</li>
          </ol>
          <div className="mt-4 border-t border-ink-200 pt-3">
            <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">Keyboard</h4>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 font-body text-sm text-ink-700 sm:grid-cols-3">
              {[['?', 'Open this guide'], ['Esc', 'Close dialogs & deselect'], ['Ctrl/Cmd+S', 'Copy plan as Markdown']].map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <kbd className="rounded-sm border border-ink-300 bg-paper-50 px-1.5 py-0.5 font-mono text-xs">{k}</kbd>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <BtnGhost onClick={() => { loadDemo(); closeGuide(); }}><Rocket className="h-4 w-4" aria-hidden /> Load the demo</BtnGhost>
            <BtnPrimary onClick={closeGuide}><Check className="h-4 w-4" aria-hidden /> To the matrix</BtnPrimary>
          </div>
        </Modal>
      )}

      <Toast toast={toast} onUndo={() => { toast?.undo?.(); dismissToast(); }} onDismiss={dismissToast} />
    </main>
  );
}
