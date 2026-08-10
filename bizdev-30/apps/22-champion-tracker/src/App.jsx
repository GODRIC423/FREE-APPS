import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Star, Sparkles, Users, UserPlus, Trash2, Plus, ChevronUp, ChevronDown,
  Search, Copy, Check, Download, Upload, FileText, HelpCircle, RotateCcw, X, Undo2,
  FileDown, Keyboard, BookOpen, AlertTriangle, ShieldAlert, ShieldCheck, Handshake,
  Network, Building2, ListChecks, ClipboardList, Link2, MoonStar, CircleAlert,
} from 'lucide-react';

/* ================================ constants ================================ */

const SLUG = '22-champion-tracker';
const LS_KEY = `bizdev:${SLUG}:v1`;

const STAGES = [
  { id: 'targeting', label: 'Targeting' },
  { id: 'discovery', label: 'Discovery' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'closed-won', label: 'Closed won' },
  { id: 'closed-lost', label: 'Closed lost' },
];

const ROLES = [
  { id: 'unknown', label: 'Unassigned' },
  { id: 'economic-buyer', label: 'Economic buyer' },
  { id: 'champion', label: 'Champion' },
  { id: 'coach', label: 'Coach' },
  { id: 'user', label: 'End user' },
  { id: 'influencer', label: 'Influencer' },
  { id: 'gatekeeper', label: 'Gatekeeper' },
  { id: 'blocker', label: 'Blocker' },
];

const PRIORITIES = [
  { id: 'now', label: 'This week' },
  { id: 'soon', label: 'This month' },
  { id: 'later', label: 'Someday' },
];

const CHAMPION_CRITERIA = [
  { id: 'stake', label: 'Has a real, personal stake in solving this — not just assigned to evaluate it' },
  { id: 'access', label: 'Can get 15 minutes with the economic buyer without going through you' },
  { id: 'volunteers', label: 'Has volunteered information you did not ask for — a trust signal' },
  { id: 'forwards', label: 'Forwards your materials internally without a nudge' },
  { id: 'burned', label: 'Has been burned by a bad vendor before and wants proof this time is different' },
  { id: 'explains', label: 'Understands the value well enough to explain it in their own words' },
  { id: 'capital', label: 'Has political capital to spend defending this — or is visibly building it' },
  { id: 'responsive', label: 'Responds within 48 hours, or tells you why not' },
];

const QUADRANTS = {
  champion: { label: 'Champions', color: 'gold', desc: 'High influence, high support — your inner circle.' },
  coach: { label: 'Coaches', color: 'coach', desc: 'On your side, still building power. Grow their influence.' },
  blocker: { label: 'Blockers', color: 'blocker', desc: 'Powerful and unconvinced — your single biggest risk.' },
  bystander: { label: 'Bystanders', color: 'bystander', desc: 'Low power, low conviction. Low priority for now.' },
};

let _uid = 0;
const uid = () => `${Date.now().toString(36)}-${(_uid++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().slice(0, 10);

/* ================================ normalize ================================ */

const str = (v, fb = '') => (typeof v === 'string' ? v : fb);
const arr = (v) => (Array.isArray(v) ? v : []);
const bool = (v, fb = false) => (typeof v === 'boolean' ? v : fb);
const clampNum = (v, fb, lo = 0, hi = 100) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : fb;
};

function normReadiness(r) {
  const out = {};
  CHAMPION_CRITERIA.forEach((c) => { out[c.id] = bool(r?.[c.id]); });
  return out;
}

function normStakeholder(s) {
  return {
    id: str(s?.id) || uid(),
    name: str(s?.name, 'Unnamed contact'),
    title: str(s?.title),
    role: ROLES.some((r) => r.id === s?.role) ? s.role : 'unknown',
    influence: clampNum(s?.influence, 50),
    support: clampNum(s?.support, 50),
    champCandidate: bool(s?.champCandidate),
    connections: arr(s?.connections).filter((x) => typeof x === 'string'),
    notes: str(s?.notes),
    lastTouch: str(s?.lastTouch),
    readiness: normReadiness(s?.readiness),
  };
}

function normAction(a) {
  return {
    id: str(a?.id) || uid(),
    stakeholderId: str(a?.stakeholderId),
    text: str(a?.text),
    priority: PRIORITIES.some((p) => p.id === a?.priority) ? a.priority : 'soon',
    done: bool(a?.done),
    createdAt: str(a?.createdAt, today()),
  };
}

function normAccount(a) {
  const stakeholders = arr(a?.stakeholders).map(normStakeholder);
  const validIds = new Set(stakeholders.map((s) => s.id));
  stakeholders.forEach((s) => { s.connections = s.connections.filter((cid) => validIds.has(cid) && cid !== s.id); });
  const actions = arr(a?.actions).map(normAction).map((x) => ({ ...x, stakeholderId: validIds.has(x.stakeholderId) ? x.stakeholderId : '' }));
  return {
    id: str(a?.id) || uid(),
    name: str(a?.name, 'Untitled account'),
    dealValue: str(a?.dealValue),
    stage: STAGES.some((s) => s.id === a?.stage) ? a.stage : 'discovery',
    pitch: str(a?.pitch),
    stakeholders,
    actions,
  };
}

function normalize(raw) {
  let d = raw;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { d = null; } }
  if (!d || typeof d !== 'object') d = {};
  const accounts = arr(d.accounts).map(normAccount);
  return {
    accounts,
    selectedId: accounts.some((a) => a.id === d.selectedId) ? d.selectedId : (accounts[0]?.id || null),
    copilotNotes: str(d.copilotNotes),
    seenGuide: bool(d.seenGuide),
  };
}

function loadState() { try { return normalize(localStorage.getItem(LS_KEY)); } catch { return normalize(null); } }

/* ================================ derived ================================ */

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return Infinity;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function touchLabel(dateStr) {
  const d = daysSince(dateStr);
  if (d === Infinity) return 'never logged';
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  return `${d}d ago`;
}

function quadrantOf(s) {
  const hi = s.influence >= 50, hs = s.support >= 50;
  if (hi && hs) return 'champion';
  if (!hi && hs) return 'coach';
  if (hi && !hs) return 'blocker';
  return 'bystander';
}

function quadrantColorVar(q) { return `var(--color-${QUADRANTS[q].color})`; }

const roleLabel = (id) => ROLES.find((r) => r.id === id)?.label || id;
const stageLabel = (id) => STAGES.find((s) => s.id === id)?.label || id;

function championScore(s) {
  const total = CHAMPION_CRITERIA.length;
  const checked = CHAMPION_CRITERIA.filter((c) => s.readiness?.[c.id]).length;
  return total ? checked / total : 0;
}

function nameById(account, id) { return account.stakeholders.find((s) => s.id === id)?.name || ''; }

function accountRisks(account) {
  const sh = account.stakeholders;
  const flags = [];
  const engaged = sh.filter((s) => daysSince(s.lastTouch) <= 45);
  if (sh.length === 0) {
    flags.push({ id: 'empty', severity: 'high', title: 'No stakeholders mapped', detail: 'Zero visibility into this account — you cannot manage a relationship you have not mapped.' });
  } else if (sh.length === 1) {
    flags.push({ id: 'single-threaded', severity: 'high', title: 'Single-threaded deal', detail: `Only ${sh[0].name} is on the map. If they go quiet, go dark, or leave the company, so does your visibility into this account.` });
  } else if (engaged.length <= 1) {
    flags.push({ id: 'single-threaded-active', severity: 'high', title: 'Effectively single-threaded', detail: `${sh.length} contacts on file, but only ${engaged.length} touched in the last 45 days. The rest have gone cold.` });
  }
  if (sh.length > 0 && !sh.some((s) => s.role === 'economic-buyer')) {
    flags.push({ id: 'no-buyer', severity: 'medium', title: 'No economic buyer identified', detail: 'Nobody on the map is tagged as the person who actually signs the check.' });
  }
  const candidates = sh.filter((s) => s.champCandidate);
  const proven = candidates.find((s) => championScore(s) >= 0.6 && s.support >= 60);
  if (sh.length > 0 && !proven) {
    flags.push({
      id: 'no-champion', severity: candidates.length ? 'medium' : 'high',
      title: candidates.length ? 'Champion not yet proven' : 'No champion identified',
      detail: candidates.length
        ? `${candidates.length} candidate${candidates.length > 1 ? 's' : ''} tracked, but none clear both the readiness and support thresholds yet.`
        : 'Nobody is positioned and willing to sell this internally when you are not in the room.',
    });
  }
  const coldBlockers = sh.filter((s) => quadrantOf(s) === 'blocker' && daysSince(s.lastTouch) > 30);
  if (coldBlockers.length) {
    flags.push({ id: 'blocker-cold', severity: 'high', title: 'A blocker is going cold', detail: `${coldBlockers.map((s) => s.name).join(', ')} — high influence, unconvinced, and it has been a while since you talked.` });
  }
  if (sh.length > 0 && !sh.some((s) => s.influence >= 60)) {
    flags.push({ id: 'no-power', severity: 'medium', title: 'Nobody with real power is engaged', detail: 'Every mapped contact is under 60/100 influence. Find whoever actually moves budget.' });
  }
  return flags;
}

function moveActionState(actions, id, dir) {
  const idx = actions.findIndex((a) => a.id === id);
  if (idx < 0) return actions;
  const src = actions[idx];
  let j = idx;
  do { j += dir; } while (j >= 0 && j < actions.length && (actions[j].priority !== src.priority || actions[j].done !== src.done));
  if (j < 0 || j >= actions.length) return actions;
  const next = actions.slice();
  [next[idx], next[j]] = [next[j], next[idx]];
  return next;
}

/* ================================ demo data ================================ */

function demoState() {
  const acc1 = normAccount({
    name: 'Meridian Health Systems',
    stage: 'negotiation',
    dealValue: '$140k ARR',
    pitch: 'We sell Halyard Care Ops — a clinical scheduling and shift-handoff platform that gets nursing teams off whiteboards and phone trees. Live in 6 weeks, priced per facility, not per seat.',
    stakeholders: [
      { id: 'priya', name: 'Priya Nair', title: 'VP Clinical Operations', role: 'economic-buyer', influence: 90, support: 55,
        notes: 'Owns the budget line. Wants hard ROI numbers before she defends this to the CFO — burned by a scheduling vendor three years ago that never hit adoption.',
        lastTouch: '2026-07-14', connections: ['marcus', 'leon'] },
      { id: 'marcus', name: 'Marcus Webb', title: 'Director of Nursing Informatics', role: 'champion', champCandidate: true, influence: 60, support: 92,
        notes: 'Ran the eval himself, already piloted with four charge nurses. Presenting to Priya next week — offered to loop in the CNO.',
        lastTouch: '2026-07-18', connections: ['priya', 'tom'],
        readiness: { stake: true, access: true, volunteers: true, forwards: true, burned: false, explains: true, capital: true, responsive: false } },
      { id: 'dana', name: 'Dana Ruiz', title: 'IT Security & Compliance Lead', role: 'blocker', influence: 75, support: 22,
        notes: 'Worried about HIPAA data residency and Epic SSO. Has killed two vendor deals this year over security gaps — has not returned the last two follow-ups.',
        lastTouch: '2026-06-02', connections: ['grace'] },
      { id: 'tom', name: 'Tom Alvarez', title: 'Charge Nurse, pilot user', role: 'user', influence: 25, support: 80,
        notes: "Loud advocate on the floor — tells anyone who will listen the pilot saved him 40 minutes a shift.",
        lastTouch: '2026-07-16', connections: ['marcus'] },
      { id: 'grace', name: 'Grace Kim', title: 'Procurement Manager', role: 'gatekeeper', influence: 55, support: 48,
        notes: 'Neutral on the product, focused entirely on contract terms and payment schedule. Wants a multi-year discount.',
        lastTouch: '2026-07-10', connections: ['dana'] },
      { id: 'leon', name: 'Leon Ferris', title: 'CFO', role: 'economic-buyer', influence: 96, support: 30,
        notes: 'Final signature required above $100k. Has never taken a call with us directly — everything routes through Priya.',
        lastTouch: '', connections: ['priya'] },
    ],
    actions: [
      { stakeholderId: 'dana', priority: 'now', done: false, text: 'Send Dana the SOC2 report and HIPAA data-residency architecture doc before she goes quiet again' },
      { stakeholderId: 'leon', priority: 'now', done: false, text: 'Ask Priya to broker 15 minutes with Leon — zero-threaded on the finance side' },
      { stakeholderId: 'tom', priority: 'soon', done: false, text: 'Pull a two-line quote from Tom into the ROI one-pager Marcus is building' },
      { stakeholderId: 'grace', priority: 'soon', done: false, text: "Loop in our legal for redlines so Grace isn't left waiting on us" },
      { stakeholderId: '', priority: 'later', done: false, text: 'Ask Marcus for the CNO introduction he mentioned in passing' },
      { stakeholderId: 'marcus', priority: 'now', done: true, text: 'Sent Marcus the ROI calculator to review before he pitches Priya' },
    ],
  });
  const acc2 = normAccount({
    name: 'Comstock Regional Clinics',
    stage: 'discovery',
    dealValue: '$40k ARR (est.)',
    pitch: 'Early conversations about Halyard Care Ops for their outpatient clinic network — no formal evaluation yet.',
    stakeholders: [
      { id: 'renee', name: 'Renee Ostrander', title: 'Practice Operations Manager', role: 'influencer', influence: 40, support: 65,
        notes: "Found us through a peer at a conference. Enthusiastic, but no budget authority and isn't sure who has it.",
        lastTouch: '2026-07-15', connections: [] },
    ],
    actions: [
      { stakeholderId: 'renee', priority: 'now', done: false, text: 'Ask Renee directly: who signs off on new clinical software at Comstock?' },
    ],
  });
  return normalize({ accounts: [acc1, acc2], selectedId: acc1.id, seenGuide: true, copilotNotes: '' });
}

/* ============================ serializers ============================ */

function stakeholderBrief(account, s) {
  const L = [];
  L.push(`${s.name} — ${s.title || 'title unknown'}`);
  L.push(`Role: ${roleLabel(s.role)} | Quadrant: ${QUADRANTS[quadrantOf(s)].label} | Influence ${s.influence}/100 | Support ${s.support}/100`);
  if (s.champCandidate) L.push(`Champion candidate — readiness ${Math.round(championScore(s) * 100)}%`);
  const conns = s.connections.map((id) => nameById(account, id)).filter(Boolean);
  if (conns.length) L.push(`Connected to: ${conns.join(', ')}`);
  L.push(`Last touched: ${s.lastTouch || 'never logged'} (${touchLabel(s.lastTouch)})`);
  if (s.notes) L.push(`Notes: ${s.notes}`);
  return L.join('\n');
}

function accountToMarkdown(account) {
  const risks = accountRisks(account);
  const L = [];
  L.push(`# ${account.name} — Champion Map`);
  L.push(`_Stage: ${stageLabel(account.stage)} · Deal: ${account.dealValue || '—'} · Exported ${today()}_`);
  if (account.pitch) L.push(`\n**What we're selling here:** ${account.pitch}`);
  L.push(`\n## Risk flags (${risks.length})`);
  L.push(risks.length ? risks.map((r) => `- **[${r.severity.toUpperCase()}] ${r.title}** — ${r.detail}`).join('\n') : '- None detected — this account is reasonably multi-threaded.');
  L.push(`\n## Stakeholders (${account.stakeholders.length})`);
  if (!account.stakeholders.length) L.push('_No stakeholders mapped yet._');
  account.stakeholders.forEach((s) => {
    L.push(`\n### ${s.name} — ${s.title || 'title unknown'}`);
    L.push(stakeholderBrief(account, s).split('\n').slice(1).map((l) => `- ${l}`).join('\n'));
  });
  const champs = account.stakeholders.filter((s) => s.champCandidate);
  if (champs.length) {
    L.push(`\n## Champion readiness`);
    champs.forEach((s) => {
      const checked = CHAMPION_CRITERIA.filter((c) => s.readiness?.[c.id]);
      L.push(`\n### ${s.name} — ${checked.length}/${CHAMPION_CRITERIA.length} (${Math.round(championScore(s) * 100)}%)`);
      L.push(CHAMPION_CRITERIA.map((c) => `- [${s.readiness?.[c.id] ? 'x' : ' '}] ${c.label}`).join('\n'));
    });
  }
  if (account.actions.length) {
    L.push(`\n## Relationship actions queue`);
    PRIORITIES.forEach((p) => {
      const items = account.actions.filter((a) => a.priority === p.id && !a.done);
      if (!items.length) return;
      L.push(`\n### ${p.label}`);
      L.push(items.map((a) => `- [ ] ${a.text}${a.stakeholderId ? ` — ${nameById(account, a.stakeholderId)}` : ''}`).join('\n'));
    });
    const done = account.actions.filter((a) => a.done);
    if (done.length) {
      L.push(`\n### Done`);
      L.push(done.map((a) => `- [x] ${a.text}${a.stakeholderId ? ` — ${nameById(account, a.stakeholderId)}` : ''}`).join('\n'));
    }
  }
  return L.join('\n');
}

function stateToMarkdown(state) {
  const account = state.accounts.find((a) => a.id === state.selectedId);
  if (!account) return `# Champion Tracker\n\nNo account selected. Create or select an account to export its champion map.`;
  return accountToMarkdown(account);
}

function stakeholdersToCSV(accounts) {
  const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const rows = [['account', 'name', 'title', 'role', 'influence', 'support', 'quadrant', 'champion_candidate', 'readiness_pct', 'last_touch', 'notes']];
  accounts.forEach((a) => a.stakeholders.forEach((s) => {
    rows.push([a.name, s.name, s.title, roleLabel(s.role), s.influence, s.support, QUADRANTS[quadrantOf(s)].label, s.champCandidate ? 'yes' : 'no', s.champCandidate ? Math.round(championScore(s) * 100) : '', s.lastTouch, s.notes]);
  }));
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

function promptWinSkeptic(state, account, s) {
  return `You are a B2B relationship strategist who specializes in turning internal skeptics into at-worst-neutral stakeholders — without ever coming across as pushy or manipulative.

## The account
${account.name} — ${stageLabel(account.stage)}${account.dealValue ? `, ${account.dealValue}` : ''}
${account.pitch ? `What we're selling here: ${account.pitch}` : '(No pitch recorded for this account yet — infer a reasonable one and flag your assumption.)'}

## The full stakeholder map, for context
${account.stakeholders.map((x) => `- ${x.name}, ${x.title || 'title unknown'} (${roleLabel(x.role)}, ${QUADRANTS[quadrantOf(x)].label}, influence ${x.influence}/100, support ${x.support}/100)`).join('\n') || '(This is the only stakeholder mapped so far.)'}

## The skeptic to win over
${stakeholderBrief(account, s)}

## Your task
1. Diagnose the most likely root cause of their resistance from the evidence above (role, influence, support score, notes, engagement gap) — name 2-3 plausible causes, ranked, and how to tell which is real in the next conversation.
2. Write a specific plan to move them from ${QUADRANTS[quadrantOf(s)].label.toLowerCase()} toward genuine neutral-or-better support over the next 2-3 touches: what to say, what to bring (proof, references, a scoped pilot), and what NOT to do.
3. Flag the risk of over-pushing this specific person — what "back off" looks like if they signal it, and how you re-approach later without losing ground.
4. Give me one verbatim opening line for the next conversation with them.

## Output format
Markdown with headers "Likely root cause", "The plan", "If they push back", "Opening line". I should be able to act on this before my next call with them — no generic sales advice.`;
}

function promptChampionOnePager(state, account, s) {
  const others = account.stakeholders.filter((x) => x.id !== s.id);
  return `You are an enablement writer who ghostwrites internal-selling documents for champions inside B2B deals — the one-pager a champion forwards to their own boss with almost no editing.

## The account
${account.name} — ${stageLabel(account.stage)}${account.dealValue ? `, ${account.dealValue}` : ''}
${account.pitch ? `What we're selling here: ${account.pitch}` : '(No pitch recorded — infer a reasonable one from context and flag the assumption.)'}

## The champion this is for
${stakeholderBrief(account, s)}

## Who they likely need to convince
${others.length ? others.map((x) => `- ${x.name}, ${x.title || 'role unknown'} (${roleLabel(x.role)})`).join('\n') : '(No other stakeholders mapped yet — write for a generic budget-holder and note the gap.)'}

## Your task
Draft a one-page internal document ${s.name} can forward almost unedited, structured as:
1. **The problem, in the recipient's language** — their pain, not our pitch. Quantify it if I've given you numbers, otherwise mark "[QUANTIFY]".
2. **Why now** — the cost of waiting, tied to something real in the notes above if present.
3. **What we're proposing** — a plain-language summary of the deal, not a spec sheet.
4. **Proof it works** — 2-3 believable proof points; mark any you would be inventing as "[NEEDS PROOF POINT]" rather than fabricating a stat.
5. **The ask** — exactly what approval, budget, or meeting this document should unlock, in one sentence.
Keep it under 400 words, first-person plural from the champion's side ("we've been evaluating…"), zero vendor jargon.

## Output format
Markdown, ready to paste into an email or doc. End with a one-line "Coaching note for ${s.name.split(' ')[0]}" on how to deliver it.`;
}

function promptThreadingRisk(state, account) {
  const risks = accountRisks(account);
  return `You are a deal-risk analyst who has watched more enterprise deals collapse from single-threading than from losing on price.

## The account, in full
${accountToMarkdown(account)}

## Risk flags the tool already auto-detected
${risks.length ? risks.map((r) => `- [${r.severity.toUpperCase()}] ${r.title}: ${r.detail}`).join('\n') : '- None auto-detected — audit it anyway, automated checks miss context.'}

## Your task
1. Give this account a threading-risk score from 1 (bulletproof, multi-threaded) to 10 (one departure from dead) and justify it in 2-3 sentences using the specific people above — not generic advice.
2. Identify which personas are missing from the map entirely (e.g. no technical validator, no end-user voice, no procurement contact) and why each gap matters for THIS deal specifically.
3. Recommend the 3 highest-value next contacts to pursue — name a real person if one exists implicitly in the notes, otherwise a role/title — with the specific reason each one reduces risk.
4. Write a 2-week multi-threading plan: who to contact, in what order, and why that order (usually the warmest path in, not the org chart).

## Output format
Markdown. Bold the risk score at the very top, then sections "Missing personas", "Who to add next", "2-week plan".`;
}

const COPILOT_ACTIONS = [
  { id: 'skeptic', icon: Handshake, needsStakeholder: true, pick: 'skeptic', title: 'Plan to win over a skeptic',
    desc: 'Diagnose the resistance and get a concrete plan to move them.', build: (st, a, s) => promptWinSkeptic(st, a, s) },
  { id: 'onepager', icon: FileText, needsStakeholder: true, pick: 'champion', title: 'Draft the champion-enablement one-pager',
    desc: 'A one-page doc your champion can forward almost unedited.', build: (st, a, s) => promptChampionOnePager(st, a, s) },
  { id: 'threading', icon: Network, needsStakeholder: false, title: "Assess my account's threading risk",
    desc: 'A risk score, the personas you are missing, and a 2-week plan.', build: (st, a) => promptThreadingRisk(st, a) },
];

/* ================================ tiny UI atoms ================================ */

function IconBtn({ icon: Icon, label, onClick, tone = 'ghost', className = '', children, ...rest }) {
  const tones = {
    ghost: 'border-line bg-nebula/60 text-stardim hover:text-star hover:border-nova/50',
    gold: 'border-gold/50 bg-gold/10 text-gold hover:bg-gold/20',
    nova: 'border-nova/50 bg-nova/10 text-nova hover:bg-nova/20',
    solid: 'border-gold bg-gold text-ink hover:bg-golddeep',
    danger: 'border-blocker bg-blocker text-white hover:bg-blocker/80',
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
    <section className={`rounded-lg border border-line bg-nebula/80 shadow-raised backdrop-blur-sm ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-linesoft px-3.5 py-2.5">
          <h3 className={`label-caps flex items-center gap-2 text-xs ${tone === 'gold' ? 'text-gold' : tone === 'nova' ? 'text-nova' : 'text-stardim'}`}>
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-void/80 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`toast-in relative mt-4 w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-lg border border-line bg-nebula2 shadow-deep`}>
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-display flex items-center gap-2 text-lg italic text-star">
            {Icon && <Icon className="h-4 w-4 text-gold" aria-hidden />} {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close dialog"
            className="rounded-md border border-line p-1.5 text-stardim hover:text-star">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function ScoreDial({ value, size = 88, label }) {
  const r = 34, cx = 44, cy = 44, circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  const dash = circumference * pct;
  const good = pct >= 0.6;
  return (
    <svg viewBox="0 0 88 88" width={size} height={size} role="img" aria-label={label || `Readiness ${Math.round(pct * 100)}%`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-linesoft)" strokeWidth="7" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={good ? 'var(--color-gold)' : 'var(--color-coach)'} strokeWidth="7"
        strokeLinecap="round" strokeDasharray={`${dash} ${circumference - dash}`}
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        style={{ font: '700 19px "Public Sans", sans-serif' }} fill="var(--color-star)">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

/* ================================ constellation canvas ================================ */

const BG_STARS = Array.from({ length: 34 }, (_, i) => ({
  x: (i * 53) % 100,
  y: (i * 31 + 17) % 100,
  r: ((i * 7) % 3) * 0.5 + 0.4,
  o: 0.15 + ((i * 13) % 40) / 100,
}));

function ConstellationCanvas({ stakeholders, selectedId, onSelect, onMove }) {
  const boxRef = useRef(null);
  const draggingRef = useRef(null);

  const toXY = (clientX, clientY) => {
    const rect = boxRef.current.getBoundingClientRect();
    let x = ((clientX - rect.left) / rect.width) * 100;
    let y = ((clientY - rect.top) / rect.height) * 100;
    x = Math.max(2, Math.min(98, x));
    y = Math.max(2, Math.min(98, y));
    return { influence: Math.round(x), support: Math.round(100 - y) };
  };

  const onPointerDown = (id, e) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
    draggingRef.current = id;
    onSelect(id);
  };
  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    const { influence, support } = toXY(e.clientX, e.clientY);
    onMove(draggingRef.current, influence, support);
  };
  const onPointerUp = () => { draggingRef.current = null; };

  const lines = [];
  const seen = new Set();
  stakeholders.forEach((s) => {
    s.connections.forEach((cid) => {
      const key = [s.id, cid].sort().join('|');
      if (seen.has(key)) return;
      seen.add(key);
      const other = stakeholders.find((x) => x.id === cid);
      if (!other) return;
      lines.push({ key, x1: s.influence, y1: 100 - s.support, x2: other.influence, y2: 100 - other.support });
    });
  });

  return (
    <div className="flex gap-2">
      <div className="hidden w-5 shrink-0 items-center justify-center sm:flex">
        <span className="label-caps whitespace-nowrap text-[9px] text-muted" style={{ writingMode: 'vertical-rl' }}>
          Support — low to high ↑
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div ref={boxRef}
          className="sky-field relative aspect-[4/3] w-full touch-none select-none overflow-hidden rounded-xl border border-line bg-void/60 shadow-raised"
          onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <rect x="50" y="0" width="50" height="50" fill="var(--color-gold)" opacity="0.06" />
            <rect x="0" y="0" width="50" height="50" fill="var(--color-coach)" opacity="0.05" />
            <rect x="50" y="50" width="50" height="50" fill="var(--color-blocker)" opacity="0.06" />
            <rect x="0" y="50" width="50" height="50" fill="var(--color-bystander)" opacity="0.045" />
            {BG_STARS.map((st, i) => <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="var(--color-star)" opacity={st.o} />)}
            <line x1="50" y1="0" x2="50" y2="100" stroke="var(--color-line)" strokeWidth="0.3" strokeDasharray="1.2 1.2" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="var(--color-line)" strokeWidth="0.3" strokeDasharray="1.2 1.2" />
            {lines.map((l) => (
              <line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="var(--color-nova)" strokeWidth="0.35" opacity="0.55" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>

          <span className="label-caps pointer-events-none absolute right-2 top-2 text-[10px] text-gold/70">Champions</span>
          <span className="label-caps pointer-events-none absolute left-2 top-2 text-[10px] text-coach/70">Coaches</span>
          <span className="label-caps pointer-events-none absolute bottom-2 right-2 text-[10px] text-blocker/70">Blockers</span>
          <span className="label-caps pointer-events-none absolute bottom-2 left-2 text-[10px] text-bystander/70">Bystanders</span>

          {stakeholders.map((s) => {
            const size = 14 + (s.influence / 100) * 20;
            const sel = s.id === selectedId;
            const q = quadrantOf(s);
            return (
              <button key={s.id} type="button"
                onPointerDown={(e) => onPointerDown(s.id, e)}
                onClick={() => onSelect(s.id)}
                onKeyDown={(e) => {
                  let di = 0, ds = 0;
                  if (e.key === 'ArrowLeft') di = -3; else if (e.key === 'ArrowRight') di = 3;
                  else if (e.key === 'ArrowUp') ds = 3; else if (e.key === 'ArrowDown') ds = -3;
                  else return;
                  e.preventDefault();
                  onMove(s.id, Math.max(0, Math.min(100, s.influence + di)), Math.max(0, Math.min(100, s.support + ds)));
                }}
                aria-label={`${s.name}, influence ${s.influence} of 100, support ${s.support} of 100. Drag or use arrow keys to reposition.`}
                className="group absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center focus:outline-none active:cursor-grabbing"
                style={{ left: `${s.influence}%`, top: `${100 - s.support}%` }}>
                <span className={`flex items-center justify-center rounded-full transition-transform ${sel ? 'scale-110' : ''}`} style={{ width: size, height: size }}>
                  {s.champCandidate || q === 'champion' ? (
                    <Star className={`h-full w-full ${s.champCandidate ? 'twinkle' : ''}`}
                      fill="var(--color-gold)" stroke={sel ? 'var(--color-star)' : 'var(--color-golddeep)'} strokeWidth={sel ? 2 : 1} aria-hidden />
                  ) : (
                    <span className="block rounded-full" style={{
                      width: '100%', height: '100%', background: quadrantColorVar(q),
                      boxShadow: sel ? `0 0 0 2px var(--color-star), 0 0 14px ${quadrantColorVar(q)}` : `0 0 8px ${quadrantColorVar(q)}88`,
                    }} />
                  )}
                </span>
                <span className={`label-caps mt-1 max-w-[92px] truncate rounded px-1 text-[9.5px] ${sel ? 'bg-nebula2 text-star' : 'text-stardim group-hover:text-star'}`}>
                  {s.name}
                </span>
              </button>
            );
          })}

          {stakeholders.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center">
              <p className="text-sm text-stardim">The sky is empty. Add your first stakeholder to place a star.</p>
            </div>
          )}
        </div>
        <p className="label-caps mt-1.5 text-center text-[9px] text-muted">Influence — low to high →</p>
      </div>
    </div>
  );
}

/* ================================ account view ================================ */

function AccountView({ account, onPatchAccount, onDeleteAccount, onAddStakeholder, onPatchStakeholder, onRemoveStakeholder,
  onAddAction, onPatchAction, onRemoveAction, onMoveAction, onCopyAccount }) {
  const [tab, setTab] = useState('canvas');
  const [selId, setSelId] = useState(null);
  const [query, setQuery] = useState('');

  const risks = useMemo(() => accountRisks(account), [account]);
  const pendingActions = account.actions.filter((a) => !a.done).length;
  const champCount = account.stakeholders.filter((s) => s.champCandidate).length;

  const TABS = [
    { id: 'canvas', label: 'Constellation', icon: Star, count: account.stakeholders.length },
    { id: 'actions', label: 'Actions queue', icon: Handshake, count: pendingActions },
    { id: 'readiness', label: 'Champion readiness', icon: ListChecks, count: champCount },
    { id: 'risk', label: 'Threading risk', icon: ShieldAlert, count: risks.length },
  ];

  const addStar = () => { const s = onAddStakeholder(); setSelId(s.id); setTab('canvas'); };

  return (
    <div>
      <div className="rounded-xl border border-line bg-nebula/80 p-4 shadow-raised sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[240px] flex-1">
            <label className="label-caps text-[10px] text-muted" htmlFor="acc-name">Account</label>
            <input id="acc-name" value={account.name} onChange={(e) => onPatchAccount({ name: e.target.value })}
              className="font-display mt-1 block w-full rounded-md border border-linesoft bg-ink px-3 py-2 text-2xl italic text-star outline-none focus:border-nova/60" />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="label-caps text-[10px] text-muted" htmlFor="acc-stage">Stage</label>
              <select id="acc-stage" value={account.stage} onChange={(e) => onPatchAccount({ stage: e.target.value })}
                className="mt-1 block rounded-md border border-line bg-ink px-2.5 py-2 text-sm text-star outline-none focus:border-nova/60">
                {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label-caps text-[10px] text-muted" htmlFor="acc-deal">Deal</label>
              <input id="acc-deal" value={account.dealValue} onChange={(e) => onPatchAccount({ dealValue: e.target.value })}
                placeholder="$85k ARR" className="mt-1 block w-32 rounded-md border border-line bg-ink px-2.5 py-2 text-sm text-star outline-none placeholder:text-muted focus:border-nova/60" />
            </div>
            <IconBtn icon={Copy} label="Copy this account's champion map" onClick={onCopyAccount}>Copy map</IconBtn>
            <IconBtn icon={Trash2} label="Delete this account" onClick={onDeleteAccount} />
          </div>
        </div>
        <div className="mt-3">
          <label className="label-caps text-[10px] text-muted" htmlFor="acc-pitch">What we're selling here</label>
          <textarea id="acc-pitch" value={account.pitch} onChange={(e) => onPatchAccount({ pitch: e.target.value })} rows={2}
            placeholder="One paragraph: the offer, the value, why this account. Every Copilot prompt gets sharper once this exists."
            className="mt-1 w-full resize-y rounded-md border border-linesoft bg-ink px-3 py-2 text-sm leading-relaxed text-star outline-none placeholder:text-muted focus:border-nova/60" />
        </div>
      </div>

      {risks.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {risks.slice(0, 3).map((r) => (
            <button key={r.id} type="button" onClick={() => setTab('risk')}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${r.severity === 'high' ? 'border-blocker/50 bg-blocker/10 text-blocker' : 'border-gold/40 bg-gold/10 text-gold'}`}>
              {r.severity === 'high' ? <ShieldAlert className="h-3 w-3" aria-hidden /> : <CircleAlert className="h-3 w-3" aria-hidden />}
              {r.title}
            </button>
          ))}
          {risks.length > 3 && (
            <button type="button" onClick={() => setTab('risk')} className="rounded-full border border-line px-2.5 py-1 text-[11px] text-stardim hover:text-star">
              +{risks.length - 3} more
            </button>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-1.5 border-b border-linesoft pb-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-pressed={tab === t.id}
              className={`label-caps flex items-center gap-1.5 rounded-md px-3 py-2 text-[11px] transition-colors ${tab === t.id ? 'bg-nebula2 text-gold' : 'text-stardim hover:text-star'}`}>
              <Icon className="h-3.5 w-3.5" aria-hidden /> {t.label}
              {t.count > 0 && <span className="tabular-nums rounded-full bg-linesoft px-1.5 text-[10px] text-stardim">{t.count}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {tab === 'canvas' && (
          <CanvasTab account={account} selId={selId} setSelId={setSelId} query={query} setQuery={setQuery}
            onAddStakeholder={addStar} onPatchStakeholder={onPatchStakeholder}
            onRemoveStakeholder={(id) => { if (id === selId) setSelId(null); onRemoveStakeholder(id); }} />
        )}
        {tab === 'actions' && <ActionsTab account={account} onAdd={onAddAction} onPatch={onPatchAction} onRemove={onRemoveAction} onMove={onMoveAction} />}
        {tab === 'readiness' && (
          <ReadinessTab account={account} onPatchStakeholder={onPatchStakeholder}
            onGoToCanvas={(id) => { setSelId(id); setTab('canvas'); }} />
        )}
        {tab === 'risk' && (
          <RiskTab risks={risks} onQueueAction={(text, stakeholderId) => { onAddAction({ text, stakeholderId, priority: 'now' }); setTab('actions'); }} />
        )}
      </div>
    </div>
  );
}

function CanvasTab({ account, selId, setSelId, query, setQuery, onAddStakeholder, onPatchStakeholder, onRemoveStakeholder }) {
  const selected = account.stakeholders.find((s) => s.id === selId) || null;
  const filtered = account.stakeholders.filter((s) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [s.name, s.title, s.notes].join(' ').toLowerCase().includes(q);
  });
  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div>
        <ConstellationCanvas stakeholders={account.stakeholders} selectedId={selId} onSelect={setSelId}
          onMove={(id, influence, support) => onPatchStakeholder(id, { influence, support })} />
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          {Object.entries(QUADRANTS).map(([id, q]) => (
            <span key={id} className="flex items-center gap-1.5 text-[11px] text-stardim">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: quadrantColorVar(id) }} /> {q.label}
            </span>
          ))}
        </div>
      </div>
      <div>
        {selected ? (
          <StakeholderEditor account={account} s={selected} onPatch={(p) => onPatchStakeholder(selected.id, p)}
            onRemove={() => onRemoveStakeholder(selected.id)} onClose={() => setSelId(null)} />
        ) : (
          <Panel title="Stakeholders" icon={Users} actions={<IconBtn icon={UserPlus} label="Add stakeholder" tone="gold" onClick={onAddStakeholder}>Add</IconBtn>}>
            <div className="relative mb-2.5">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search stakeholders…" aria-label="Search stakeholders"
                className="w-full rounded-md border border-line bg-ink py-1.5 pl-8 pr-3 text-sm text-star outline-none placeholder:text-muted focus:border-nova/60" />
            </div>
            {account.stakeholders.length === 0 ? (
              <div className="rounded-md border border-dashed border-line p-5 text-center">
                <Star className="mx-auto h-6 w-6 text-muted" aria-hidden />
                <p className="mt-2 text-sm text-stardim">No stars yet. Add everyone you talk to at this account — even the ones who never reply. You cannot manage a risk you have not mapped.</p>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-stardim">No stakeholders match that search.</p>
            ) : (
              <ul className="space-y-1.5">
                {filtered.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => setSelId(s.id)}
                      className="flex w-full items-center gap-2.5 rounded-md border border-linesoft bg-ink/70 px-2.5 py-2 text-left hover:border-nova/50">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                        {s.champCandidate
                          ? <Star className="h-4 w-4" fill="var(--color-gold)" stroke="var(--color-golddeep)" aria-hidden />
                          : <span className="h-2.5 w-2.5 rounded-full" style={{ background: quadrantColorVar(quadrantOf(s)) }} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-star">{s.name}</span>
                        <span className="block truncate text-[11px] text-stardim">{s.title || roleLabel(s.role)}</span>
                      </span>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted">{s.influence}/{s.support}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}

function StakeholderEditor({ account, s, onPatch, onRemove, onClose }) {
  const others = account.stakeholders.filter((x) => x.id !== s.id);
  const toggleConn = (id) => {
    const has = s.connections.includes(id);
    onPatch({ connections: has ? s.connections.filter((c) => c !== id) : [...s.connections, id] });
  };
  return (
    <Panel title={s.name || 'Stakeholder'} icon={Star} tone="gold"
      actions={<button type="button" onClick={onClose} aria-label="Back to stakeholder list" className="rounded-md border border-line p-1.5 text-stardim hover:text-star"><X className="h-4 w-4" aria-hidden /></button>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="label-caps text-[10px] text-muted" htmlFor="s-name">Name</label>
            <input id="s-name" value={s.name} onChange={(e) => onPatch({ name: e.target.value })}
              className="mt-1 w-full rounded-md border border-linesoft bg-ink px-2.5 py-1.5 text-sm text-star outline-none focus:border-nova/60" />
          </div>
          <div>
            <label className="label-caps text-[10px] text-muted" htmlFor="s-title">Title</label>
            <input id="s-title" value={s.title} onChange={(e) => onPatch({ title: e.target.value })}
              className="mt-1 w-full rounded-md border border-linesoft bg-ink px-2.5 py-1.5 text-sm text-star outline-none focus:border-nova/60" />
          </div>
        </div>
        <div>
          <label className="label-caps text-[10px] text-muted" htmlFor="s-role">Role</label>
          <select id="s-role" value={s.role}
            onChange={(e) => onPatch({ role: e.target.value, champCandidate: e.target.value === 'champion' ? true : s.champCandidate })}
            className="mt-1 w-full rounded-md border border-line bg-ink px-2.5 py-1.5 text-sm text-star outline-none focus:border-nova/60">
            {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-caps flex justify-between text-[10px] text-muted" htmlFor="s-inf"><span>Influence</span><span className="tabular-nums text-star">{s.influence}</span></label>
            <input id="s-inf" type="range" min="0" max="100" value={s.influence} onChange={(e) => onPatch({ influence: Number(e.target.value) })} className="mt-1.5 w-full" />
          </div>
          <div>
            <label className="label-caps flex justify-between text-[10px] text-muted" htmlFor="s-sup"><span>Support</span><span className="tabular-nums text-star">{s.support}</span></label>
            <input id="s-sup" type="range" min="0" max="100" value={s.support} onChange={(e) => onPatch({ support: Number(e.target.value) })} className="mt-1.5 w-full" />
          </div>
        </div>
        <p className="text-[11px] text-muted">Sitting in <span className="font-semibold text-star">{QUADRANTS[quadrantOf(s)].label}</span> — {QUADRANTS[quadrantOf(s)].desc}</p>
        <label className="flex items-center gap-2 text-sm text-star">
          <input type="checkbox" checked={s.champCandidate} onChange={(e) => onPatch({ champCandidate: e.target.checked })} />
          Track as champion candidate — evaluate readiness
        </label>
        <div>
          <label className="label-caps text-[10px] text-muted" htmlFor="s-touch">Last touched</label>
          <input id="s-touch" type="date" value={s.lastTouch} onChange={(e) => onPatch({ lastTouch: e.target.value })}
            className="mt-1 w-full rounded-md border border-line bg-ink px-2.5 py-1.5 text-sm text-star outline-none focus:border-nova/60" />
        </div>
        {others.length > 0 && (
          <div>
            <span className="label-caps flex items-center gap-1 text-[10px] text-muted"><Link2 className="h-3 w-3" aria-hidden /> Connected to</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {others.map((o) => (
                <button key={o.id} type="button" onClick={() => toggleConn(o.id)} aria-pressed={s.connections.includes(o.id)}
                  className={`rounded-full border px-2 py-1 text-[11px] ${s.connections.includes(o.id) ? 'border-nova/60 bg-nova/15 text-nova' : 'border-line text-stardim hover:text-star'}`}>
                  {o.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="label-caps text-[10px] text-muted" htmlFor="s-notes">Notes</label>
          <textarea id="s-notes" value={s.notes} onChange={(e) => onPatch({ notes: e.target.value })} rows={3}
            placeholder="What matters about this person: motivations, history, how they like to be approached…"
            className="mt-1 w-full resize-y rounded-md border border-linesoft bg-ink px-2.5 py-1.5 text-sm leading-relaxed text-star outline-none placeholder:text-muted focus:border-nova/60" />
        </div>
        <button type="button" onClick={onRemove}
          className="label-caps flex w-full items-center justify-center gap-1.5 rounded-md border border-blocker/40 bg-blocker/10 px-3 py-2 text-[11px] text-blocker hover:bg-blocker/20">
          <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove from map
        </button>
      </div>
    </Panel>
  );
}

function ActionsTab({ account, onAdd, onPatch, onRemove, onMove }) {
  const [draft, setDraft] = useState({ text: '', stakeholderId: '', priority: 'now' });
  const [showDone, setShowDone] = useState(false);
  const submit = () => {
    if (!draft.text.trim()) return;
    onAdd({ ...draft });
    setDraft({ text: '', stakeholderId: '', priority: 'now' });
  };
  const doneItems = account.actions.filter((a) => a.done);

  return (
    <div className="space-y-4">
      <Panel title="Queue an action — who to warm, and how" icon={Handshake}>
        <div className="flex flex-wrap gap-2">
          <select value={draft.stakeholderId} onChange={(e) => setDraft((d) => ({ ...d, stakeholderId: e.target.value }))} aria-label="Stakeholder"
            className="rounded-md border border-line bg-ink px-2.5 py-2 text-sm text-star outline-none focus:border-nova/60">
            <option value="">No specific person</option>
            {account.stakeholders.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input value={draft.text} onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
            placeholder="e.g. Send Dana the SOC2 report before Friday's review" aria-label="Action"
            className="min-w-[220px] flex-1 rounded-md border border-line bg-ink px-2.5 py-2 text-sm text-star outline-none placeholder:text-muted focus:border-nova/60" />
          <select value={draft.priority} onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))} aria-label="Priority"
            className="rounded-md border border-line bg-ink px-2.5 py-2 text-sm text-star outline-none focus:border-nova/60">
            {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <IconBtn icon={Plus} label="Add action" tone="gold" onClick={submit}>Add</IconBtn>
        </div>
      </Panel>

      {account.actions.length === 0 ? (
        <div className="rounded-md border border-dashed border-line p-8 text-center">
          <Handshake className="mx-auto h-7 w-7 text-muted" aria-hidden />
          <p className="mt-2 text-sm text-stardim">No actions queued. Every stakeholder needs a next move — who to warm, and exactly how. Start with your coldest contact.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {PRIORITIES.map((p) => {
            const items = account.actions.filter((a) => a.priority === p.id && !a.done);
            return (
              <div key={p.id} className="rounded-lg border border-line bg-nebula/70 p-3">
                <h3 className="label-caps mb-2 flex items-center justify-between text-[11px] text-stardim">{p.label} <span className="tabular-nums text-muted">{items.length}</span></h3>
                {items.length === 0 && <p className="text-[12px] text-muted">Nothing queued.</p>}
                <ul className="space-y-1.5">
                  {items.map((a, i) => (
                    <li key={a.id} className="group rounded-md border border-linesoft bg-ink/70 p-2">
                      <div className="flex items-start gap-2">
                        <input type="checkbox" checked={a.done} onChange={() => onPatch(a.id, { done: true })} className="mt-1" aria-label={`Mark done: ${a.text}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] leading-snug text-star">{a.text}</p>
                          {a.stakeholderId && <p className="mt-0.5 text-[11px] text-gold">{nameById(account, a.stakeholderId)}</p>}
                        </div>
                        <span className="flex shrink-0 flex-col opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                          <button type="button" onClick={() => onMove(a.id, -1)} disabled={i === 0} aria-label="Move up" className="rounded p-0.5 text-stardim hover:text-star disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" aria-hidden /></button>
                          <button type="button" onClick={() => onMove(a.id, 1)} disabled={i === items.length - 1} aria-label="Move down" className="rounded p-0.5 text-stardim hover:text-star disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" aria-hidden /></button>
                          <button type="button" onClick={() => onRemove(a.id)} aria-label="Delete action" className="rounded p-0.5 text-stardim hover:text-blocker"><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {doneItems.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowDone((v) => !v)} className="label-caps flex items-center gap-1.5 text-[11px] text-stardim hover:text-star">
            {showDone ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />} Done ({doneItems.length})
          </button>
          {showDone && (
            <ul className="mt-2 space-y-1">
              {doneItems.map((a) => (
                <li key={a.id} className="flex items-center gap-2 rounded-md border border-linesoft bg-ink/50 px-2.5 py-1.5">
                  <input type="checkbox" checked onChange={() => onPatch(a.id, { done: false })} aria-label={`Reopen: ${a.text}`} />
                  <span className="flex-1 truncate text-[12px] text-muted line-through">{a.text}</span>
                  <button type="button" onClick={() => onRemove(a.id)} aria-label="Delete action" className="text-stardim hover:text-blocker"><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ReadinessTab({ account, onPatchStakeholder, onGoToCanvas }) {
  const candidates = account.stakeholders.filter((s) => s.champCandidate);
  const others = account.stakeholders.filter((s) => !s.champCandidate);
  const [addId, setAddId] = useState('');
  return (
    <div className="space-y-4">
      {candidates.length === 0 && (
        <div className="rounded-md border border-dashed border-line p-8 text-center">
          <ListChecks className="mx-auto h-7 w-7 text-muted" aria-hidden />
          <p className="mt-2 text-sm text-stardim">No champion candidates tracked yet. Open a stakeholder on the constellation and check "Track as champion candidate" — or pick one below.</p>
          {others.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <select value={addId} onChange={(e) => setAddId(e.target.value)} aria-label="Choose a stakeholder to track"
                className="rounded-md border border-line bg-ink px-2.5 py-1.5 text-sm text-star outline-none focus:border-nova/60">
                <option value="">Choose a stakeholder…</option>
                {others.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <IconBtn icon={Star} label="Track as champion candidate" tone="gold"
                onClick={() => { if (addId) { onPatchStakeholder(addId, { champCandidate: true }); onGoToCanvas(addId); } }}>Track</IconBtn>
            </div>
          )}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {candidates.map((s) => {
          const score = championScore(s);
          return (
            <Panel key={s.id} title={s.name} icon={Star} tone="gold"
              actions={<button type="button" onClick={() => onGoToCanvas(s.id)} className="text-[11px] text-stardim hover:text-star">View on map</button>}>
              <div className="flex items-center gap-4">
                <ScoreDial value={score} label={`${s.name} readiness`} />
                <div>
                  <p className="text-sm text-star">{s.title || roleLabel(s.role)}</p>
                  <p className="text-[12px] text-stardim">{CHAMPION_CRITERIA.filter((c) => s.readiness?.[c.id]).length}/{CHAMPION_CRITERIA.length} criteria met</p>
                  <button type="button" onClick={() => onPatchStakeholder(s.id, { champCandidate: false })} className="mt-1 text-[11px] text-muted hover:text-blocker">Untrack</button>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5">
                {CHAMPION_CRITERIA.map((c) => (
                  <li key={c.id}>
                    <label className="flex items-start gap-2 text-[12.5px] leading-snug text-stardim">
                      <input type="checkbox" checked={!!s.readiness?.[c.id]}
                        onChange={(e) => onPatchStakeholder(s.id, { readiness: { ...s.readiness, [c.id]: e.target.checked } })}
                        className="mt-0.5" />
                      <span className={s.readiness?.[c.id] ? 'text-star' : ''}>{c.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

function RiskTab({ risks, onQueueAction }) {
  if (risks.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-line p-8 text-center">
        <ShieldCheck className="mx-auto h-7 w-7 text-gold" aria-hidden />
        <p className="mt-2 text-sm text-stardim">No threading risk detected. This account has an identified buyer, a proven champion, and more than one warm thread. Keep it that way.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {risks.map((r) => (
        <div key={r.id} className={`rounded-lg border p-4 ${r.severity === 'high' ? 'border-blocker/50 bg-blocker/10' : 'border-gold/40 bg-gold/10'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              {r.severity === 'high' ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-blocker" aria-hidden /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />}
              <div>
                <p className={`text-sm font-bold ${r.severity === 'high' ? 'text-blocker' : 'text-gold'}`}>{r.title}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-stardim">{r.detail}</p>
              </div>
            </div>
            <IconBtn icon={Handshake} label={`Queue an action for: ${r.title}`} onClick={() => onQueueAction(`Address: ${r.title}`, '')}>Queue action</IconBtn>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================================ account rail + wordmark ================================ */

function AccountRail({ accounts, selectedId, onSelect, onAdd, consoleAccounts, onImportConsole }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {accounts.map((a) => {
        const risks = accountRisks(a);
        const champ = a.stakeholders.some((s) => s.champCandidate);
        const sel = a.id === selectedId;
        return (
          <button key={a.id} type="button" onClick={() => onSelect(a.id)} aria-pressed={sel}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${sel ? 'border-gold/60 bg-gold/15 text-gold' : 'border-line bg-nebula/70 text-stardim hover:text-star'}`}>
            <Building2 className="h-3.5 w-3.5" aria-hidden /> {a.name}
            {champ && <Star className="h-3 w-3" fill="currentColor" aria-hidden />}
            {risks.length > 0 && <span className="tabular-nums rounded-full bg-blocker/20 px-1.5 text-[10px] text-blocker">{risks.length}</span>}
          </button>
        );
      })}
      <IconBtn icon={Plus} label="New account" onClick={onAdd}>New account</IconBtn>
      {consoleAccounts && consoleAccounts.length > 0 && (
        <IconBtn icon={Download} label="Pull accounts from console roster" tone="nova" onClick={onImportConsole}>Pull from console</IconBtn>
      )}
    </div>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 44 44" className="h-10 w-10 drift" role="img" aria-label="Champion Tracker mark">
        <circle cx="22" cy="22" r="20" fill="var(--color-ink)" stroke="var(--color-line)" strokeWidth="1.5" />
        <line x1="14" y1="28" x2="22" y2="14" stroke="var(--color-nova)" strokeWidth="1" opacity="0.6" />
        <line x1="22" y1="14" x2="31" y2="18" stroke="var(--color-nova)" strokeWidth="1" opacity="0.6" />
        <line x1="22" y1="14" x2="16" y2="12" stroke="var(--color-nova)" strokeWidth="1" opacity="0.5" />
        <line x1="31" y1="18" x2="30" y2="30" stroke="var(--color-nova)" strokeWidth="1" opacity="0.5" />
        <circle cx="14" cy="28" r="1.6" fill="var(--color-star)" />
        <circle cx="16" cy="12" r="1.4" fill="var(--color-star)" />
        <circle cx="31" cy="18" r="1.6" fill="var(--color-star)" />
        <circle cx="30" cy="30" r="1.8" fill="var(--color-star)" />
        <path d="M22 8 L24.2 12.6 L29.2 13.3 L25.6 16.8 L26.5 21.8 L22 19.4 L17.5 21.8 L18.4 16.8 L14.8 13.3 L19.8 12.6 Z"
          fill="var(--color-gold)" stroke="var(--color-golddeep)" strokeWidth="0.6" />
      </svg>
      <div>
        <div className="font-display text-2xl italic leading-none tracking-tight text-star">
          Champion <span className="not-italic text-gold">Tracker</span>
        </div>
        <div className="label-caps mt-1 text-[10px] text-muted">Map stakeholders. Build champions. Never go single-threaded.</div>
      </div>
    </div>
  );
}

function EmptyState({ onLoadDemo, onAdd }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-nebula/40 p-10 text-center">
      <svg viewBox="0 0 120 80" className="mx-auto h-20 w-32" role="img" aria-label="An empty night sky">
        {Array.from({ length: 14 }, (_, i) => {
          const x = (i * 37 + 13) % 120, y = (i * 53 + 7) % 80, r = (i % 3) + 0.6;
          return <circle key={i} cx={x} cy={y} r={r} fill="var(--color-star)" opacity={0.25 + ((i * 17) % 50) / 100} />;
        })}
      </svg>
      <h2 className="font-display mt-3 text-2xl italic text-star">No accounts on the board yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-stardim">
        A champion map earns its keep in four moves: place every stakeholder you talk to, tag your champion candidate, queue the next warm-up, then watch the risk flags before you get surprised.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <IconBtn icon={MoonStar} label="Load demo" tone="gold" onClick={onLoadDemo}>Load the demo constellation</IconBtn>
        <IconBtn icon={Plus} label="Create first account" tone="solid" onClick={onAdd}>Create your first account</IconBtn>
      </div>
    </div>
  );
}

/* ================================ copilot drawer ================================ */

function CopilotDrawer({ state, account, onClose, onNotes, onToast }) {
  const stakeholders = account?.stakeholders || [];
  const defaultFor = (pick) => {
    if (!stakeholders.length) return '';
    if (pick === 'skeptic') return [...stakeholders].sort((a, b) => a.support - b.support)[0].id;
    if (pick === 'champion') {
      const champs = stakeholders.filter((s) => s.champCandidate);
      const pool = (champs.length ? champs : stakeholders).slice().sort((a, b) => championScore(b) - championScore(a));
      return pool[0]?.id || '';
    }
    return stakeholders[0]?.id || '';
  };
  const [actionId, setActionId] = useState(COPILOT_ACTIONS[0].id);
  const active = COPILOT_ACTIONS.find((a) => a.id === actionId);
  const [stakeholderId, setStakeholderId] = useState(() => defaultFor(active.pick));
  const [copied, setCopied] = useState(false);

  const chooseAction = (id) => {
    setActionId(id);
    const a = COPILOT_ACTIONS.find((x) => x.id === id);
    if (a.needsStakeholder) setStakeholderId(defaultFor(a.pick));
  };

  const s = stakeholders.find((x) => x.id === stakeholderId) || null;
  const prompt = !account ? '' : (active.needsStakeholder ? (s ? active.build(state, account, s) : '') : active.build(state, account));

  const doCopy = async () => {
    if (!prompt) return;
    const ok = await copyText(prompt);
    setCopied(ok); onToast(ok ? 'Prompt copied — paste it into claude.ai' : 'Copy failed');
    if (ok) setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-void/70 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-label="Claude Copilot" className="toast-in flex h-full w-full max-w-lg flex-col border-l border-line bg-nebula2 shadow-deep">
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-display flex items-center gap-2 text-lg italic text-star"><Sparkles className="h-4 w-4 text-gold" aria-hidden /> Claude Copilot</h2>
          <button type="button" onClick={onClose} aria-label="Close Copilot" className="rounded-md border border-line p-1.5 text-stardim hover:text-star"><X className="h-4 w-4" aria-hidden /></button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {!account ? (
            <p className="text-sm text-stardim">Select or create an account first — Copilot prompts are built from its live stakeholder map.</p>
          ) : (
            <>
              <p className="text-[13px] leading-relaxed text-stardim">
                Each action builds a complete prompt from <span className="font-semibold text-star">{account.name}</span>'s live map. Copy it, paste into <span className="font-semibold text-star">claude.ai</span> — works with the standard $20 Claude subscription, no API key.
              </p>
              <div className="space-y-2">
                {COPILOT_ACTIONS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button key={a.id} type="button" onClick={() => chooseAction(a.id)} aria-pressed={actionId === a.id}
                      className={`flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors ${actionId === a.id ? 'border-gold/60 bg-gold/10' : 'border-line bg-ink/60 hover:border-nova/50'}`}>
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${actionId === a.id ? 'text-gold' : 'text-stardim'}`} aria-hidden />
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-star">{a.title}</span>
                        <span className="block text-[12px] leading-snug text-stardim">{a.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {active.needsStakeholder && (
                <div>
                  <label className="label-caps text-[10px] text-muted" htmlFor="cp-stakeholder">Target stakeholder</label>
                  <select id="cp-stakeholder" value={stakeholderId} onChange={(e) => setStakeholderId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-line bg-ink px-2.5 py-2 text-sm text-star outline-none focus:border-nova/60">
                    {stakeholders.length === 0 && <option value="">No stakeholders yet — add one first</option>}
                    {stakeholders.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                </div>
              )}
              {prompt && (
                <div className="rounded-md border border-line bg-ink/70 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="label-caps text-[10px] text-gold">Generated prompt · {prompt.length.toLocaleString()} chars</span>
                    <IconBtn icon={copied ? Check : Copy} label="Copy prompt" tone="gold" onClick={doCopy}>{copied ? 'Copied' : 'Copy prompt'}</IconBtn>
                  </div>
                  <textarea readOnly value={prompt} rows={10} aria-label="Generated Copilot prompt"
                    className="w-full resize-y rounded border border-linesoft bg-void/60 p-2.5 font-mono text-[11.5px] leading-relaxed text-stardim outline-none" />
                  <p className="mt-1.5 text-[11px] text-muted">Paste into claude.ai — works with the standard Claude subscription.</p>
                </div>
              )}
              <div>
                <label className="label-caps text-[10px] text-muted" htmlFor="cp-notes">Paste Claude's answer back (auto-saved)</label>
                <textarea id="cp-notes" value={state.copilotNotes} onChange={(e) => onNotes(e.target.value)} rows={6}
                  placeholder="Keep the useful parts of Claude's answers here, then fold them into notes or the actions queue."
                  className="mt-1 w-full resize-y rounded-md border border-line bg-ink px-3 py-2 text-sm leading-relaxed text-star outline-none placeholder:text-muted focus:border-nova/60" />
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ================================ help ================================ */

function HelpContent() {
  const steps = [
    ['Load the demo constellation', 'See a finished map: two accounts, six mapped stakeholders, a proven champion, a queued warm-up plan, and one live risk flag. Study it, then reset when ready to build your own.'],
    ['Create your account', 'Name it, set the stage and deal size, and write one paragraph on what you are selling here — every Copilot prompt gets sharper once that exists.'],
    ['Place your stars', 'Add each stakeholder, then drag their star on the constellation by influence (left→right) and support (bottom→top), or use the sliders in the side panel. Arrow keys nudge a focused star too.'],
    ['Wire the connections', 'Open a stakeholder and mark who they talk to. The lines that appear reveal your actual path through the org — not the org chart.'],
    ['Track your champion candidate', 'Check "Track as champion candidate" on whoever might carry this deal for you, then work the 8-criteria checklist in Champion readiness honestly. The score updates live.'],
    ['Queue relationship actions', 'Who to warm, and exactly how — sorted into this week, this month, and someday. Check items off as you go; delete gives you an Undo.'],
    ['Watch the threading-risk tab', 'It flags single-threading, a missing economic buyer, an unproven champion, and blockers gone cold — automatically, after every edit.'],
    ['Run Copilot, then export', 'Generate a prompt, copy it into claude.ai, and paste the answer back into the notes area. Copy the account map as Markdown (or Ctrl/Cmd+S), or download JSON/CSV for backup and CRM import.'],
  ];
  const keys = [
    ['?', 'Open this guide'], ['C', 'Claude Copilot on/off'],
    ['Ctrl / Cmd + S', 'Copy the current account map as Markdown'], ['Esc', 'Close any panel or dialog'],
    ['Arrow keys', 'Move a focused star on the constellation'], ['Enter', 'Add the entry you are typing'],
  ];
  return (
    <div className="space-y-5">
      <ol className="space-y-3">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="label-caps mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-gold/10 text-[11px] tabular-nums text-gold">{i + 1}</span>
            <div>
              <div className="text-sm font-bold text-star">{t}</div>
              <p className="text-[13px] leading-relaxed text-stardim">{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <div>
        <h3 className="label-caps mb-2 flex items-center gap-1.5 text-[11px] text-gold"><Keyboard className="h-3.5 w-3.5" aria-hidden /> Keyboard shortcuts</h3>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {keys.map(([k, d]) => (
            <div key={k} className="flex items-center gap-2 rounded-md border border-linesoft bg-ink/60 px-2.5 py-1.5">
              <kbd className="rounded border border-line bg-nebula2 px-1.5 py-0.5 font-mono text-[11px] text-star">{k}</kbd>
              <span className="text-[12px] text-stardim">{d}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[12px] leading-relaxed text-muted">
        Your data never leaves this browser — everything lives in localStorage. Export JSON regularly if these maps matter to you.
      </p>
    </div>
  );
}

/* ================================ print sheet ================================ */

function PrintSheet({ account }) {
  if (!account) return <div className="print-sheet" aria-hidden><p>No account selected.</p></div>;
  const risks = accountRisks(account);
  return (
    <div className="print-sheet" aria-hidden>
      <h1>{account.name} — Champion Map</h1>
      <p>Stage: {stageLabel(account.stage)} · Deal: {account.dealValue || '—'} · Printed {today()}</p>
      {account.pitch && <p><strong>What we're selling here:</strong> {account.pitch}</p>}
      <h2>Risk flags ({risks.length})</h2>
      {risks.length ? <ul>{risks.map((r) => <li key={r.id}><strong>[{r.severity.toUpperCase()}] {r.title}</strong> — {r.detail}</li>)}</ul> : <p>None detected.</p>}
      <h2>Stakeholders ({account.stakeholders.length})</h2>
      {account.stakeholders.map((s) => (
        <div key={s.id} className="pc-card">
          <h3>{s.name} — {s.title || 'title unknown'}</h3>
          <p>{roleLabel(s.role)} · {QUADRANTS[quadrantOf(s)].label} · Influence {s.influence}/100 · Support {s.support}/100</p>
          {s.champCandidate && <p>Champion candidate — readiness {Math.round(championScore(s) * 100)}%</p>}
          {s.notes && <p>{s.notes}</p>}
        </div>
      ))}
      <h2>Relationship actions</h2>
      {account.actions.filter((a) => !a.done).map((a) => <p key={a.id}>[ ] {a.text}{a.stakeholderId ? ` — ${nameById(account, a.stakeholderId)}` : ''}</p>)}
      {account.actions.filter((a) => !a.done).length === 0 && <p>None queued.</p>}
    </div>
  );
}

/* ================================ App ================================ */

export default function App() {
  const [state, setState] = useState(loadState);
  const [helpOpen, setHelpOpen] = useState(() => !loadStateSeen());
  const [resetOpen, setResetOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [consoleCtx, setConsoleCtx] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const fileRef = useRef(null);
  const exportRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  function loadStateSeen() { try { return normalize(localStorage.getItem(LS_KEY)).seenGuide; } catch { return false; } }

  const selectedAccount = state.accounts.find((a) => a.id === state.selectedId) || null;

  /* autosave (debounced) */
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
    }, 350);
    return () => clearTimeout(t);
  }, [state]);

  /* console bus (PROTOCOL.md) — optional, standalone works without it */
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

  const patch = (p) => setState((s) => ({ ...s, ...p }));
  const patchAccount = (id, p) => setState((s) => ({
    ...s, accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...(typeof p === 'function' ? p(a) : p) } : a)),
  }));
  const patchStakeholder = (accountId, stakeholderId, p) => patchAccount(accountId, (a) => ({
    ...a, stakeholders: a.stakeholders.map((st) => (st.id === stakeholderId ? { ...st, ...(typeof p === 'function' ? p(st) : p) } : st)),
  }));

  const addAccount = () => {
    const a = normAccount({ name: 'New account' });
    setState((s) => ({ ...s, accounts: [...s.accounts, a], selectedId: a.id }));
  };
  const removeAccount = (id) => {
    const name = state.accounts.find((a) => a.id === id)?.name || 'account';
    deleteWithUndo(`Removed account "${name}"`, (prev) => {
      const accounts = prev.accounts.filter((a) => a.id !== id);
      return { ...prev, accounts, selectedId: prev.selectedId === id ? (accounts[0]?.id || null) : prev.selectedId };
    });
  };

  const boundPatchAccount = (p) => { if (selectedAccount) patchAccount(selectedAccount.id, p); };
  const boundAddStakeholder = () => {
    const s = normStakeholder({});
    if (selectedAccount) patchAccount(selectedAccount.id, (a) => ({ ...a, stakeholders: [...a.stakeholders, s] }));
    return s;
  };
  const boundPatchStakeholder = (stakeholderId, p) => { if (selectedAccount) patchStakeholder(selectedAccount.id, stakeholderId, p); };
  const boundRemoveStakeholder = (stakeholderId) => {
    if (!selectedAccount) return;
    const name = selectedAccount.stakeholders.find((s) => s.id === stakeholderId)?.name || 'stakeholder';
    const accId = selectedAccount.id;
    deleteWithUndo(`Removed ${name} from the map`, (prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) => (a.id !== accId ? a : {
        ...a,
        stakeholders: a.stakeholders.filter((s) => s.id !== stakeholderId),
        actions: a.actions.map((act) => (act.stakeholderId === stakeholderId ? { ...act, stakeholderId: '' } : act)),
      })),
    }));
  };
  const boundAddAction = ({ text, stakeholderId, priority }) => {
    if (selectedAccount) patchAccount(selectedAccount.id, (a) => ({ ...a, actions: [...a.actions, normAction({ text, stakeholderId, priority })] }));
  };
  const boundPatchAction = (actionId, p) => {
    if (selectedAccount) patchAccount(selectedAccount.id, (a) => ({ ...a, actions: a.actions.map((x) => (x.id === actionId ? { ...x, ...p } : x)) }));
  };
  const boundRemoveAction = (actionId) => {
    if (!selectedAccount) return;
    const accId = selectedAccount.id;
    deleteWithUndo('Action removed', (prev) => ({
      ...prev, accounts: prev.accounts.map((a) => (a.id !== accId ? a : { ...a, actions: a.actions.filter((x) => x.id !== actionId) })),
    }));
  };
  const boundMoveAction = (actionId, dir) => {
    if (selectedAccount) patchAccount(selectedAccount.id, (a) => ({ ...a, actions: moveActionState(a.actions, actionId, dir) }));
  };
  const boundCopyAccount = async () => {
    if (!selectedAccount) return;
    const ok = await copyText(accountToMarkdown(selectedAccount));
    showToast(ok ? `${selectedAccount.name} map copied as Markdown` : 'Copy failed — try Export > Download');
  };

  const closeHelp = () => { setHelpOpen(false); if (!state.seenGuide) patch({ seenGuide: true }); };

  const doCopyMarkdown = async () => {
    const ok = await copyText(stateToMarkdown(state));
    showToast(ok ? 'Champion map copied as Markdown' : 'Copy failed — try Export > Download');
  };
  const doExportJSON = () => { downloadFile('champion-tracker.json', 'application/json', JSON.stringify(state, null, 2)); setExportOpen(false); };
  const doExportCSV = () => { downloadFile('champion-tracker-stakeholders.csv', 'text/csv', stakeholdersToCSV(state.accounts)); setExportOpen(false); };
  const doImport = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = normalize(String(reader.result));
        setState((s) => ({ ...next, seenGuide: s.seenGuide || next.seenGuide }));
        showToast('Champion map imported');
      } catch { showToast('Import failed — not a valid export file'); }
    };
    reader.readAsText(f);
    e.target.value = '';
    setExportOpen(false);
  };
  const doLoadDemo = () => {
    setState((s) => ({ ...demoState(), seenGuide: s.seenGuide || true }));
    showToast('Demo constellation loaded — 2 accounts, one fully mapped');
  };
  const doReset = () => {
    try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
    setState(normalize({ seenGuide: true }));
    setResetOpen(false);
    showToast('Sky cleared — fresh start');
  };
  const importConsoleAccounts = () => {
    const list = consoleCtx?.roster?.accounts || [];
    if (!list.length) return;
    const existingNames = new Set(state.accounts.map((a) => a.name.toLowerCase()));
    const additions = list.filter((x) => x.name && !existingNames.has(x.name.toLowerCase())).map((x) => normAccount({ name: x.name, pitch: x.notes || '' }));
    if (!additions.length) { showToast('No new accounts to pull — already on the board'); return; }
    setState((s) => ({ ...s, accounts: [...s.accounts, ...additions], selectedId: s.selectedId || additions[0].id }));
    showToast(`Pulled ${additions.length} account${additions.length > 1 ? 's' : ''} from the console roster`);
  };

  /* keyboard */
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if (e.key === 'Escape') {
        if (exportOpen) { setExportOpen(false); return; }
        if (helpOpen) { closeHelp(); return; }
        if (resetOpen) { setResetOpen(false); return; }
        if (copilotOpen) { setCopilotOpen(false); return; }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); doCopyMarkdown(); return; }
      if (typing) return;
      if (e.key === '?') { e.preventDefault(); setHelpOpen(true); return; }
      if (e.key.toLowerCase() === 'c') { e.preventDefault(); setCopilotOpen((v) => !v); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (!exportOpen) return;
    const onDown = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false); };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [exportOpen]);

  return (
    <div className="sky-field min-h-screen">
      <div className="app-chrome">
        <header className="sticky top-0 z-40 border-b border-line bg-void/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Wordmark />
            <div className="flex flex-wrap items-center gap-2">
              {consoleCtx && <span className="label-caps rounded-sm border border-nova/50 bg-nova/10 px-1.5 py-0.5 text-[10px] text-nova">Console linked</span>}
              <IconBtn icon={Sparkles} label="Claude Copilot (C)" tone="gold" onClick={() => setCopilotOpen(true)}>Copilot</IconBtn>
              <IconBtn icon={MoonStar} label="Load demo constellation" onClick={doLoadDemo}>Load demo</IconBtn>
              <IconBtn icon={HelpCircle} label="How to use (?)" onClick={() => setHelpOpen(true)}>How to use</IconBtn>
              <div className="relative" ref={exportRef}>
                <IconBtn icon={Download} label="Export menu" onClick={() => setExportOpen((v) => !v)} aria-expanded={exportOpen}>Export</IconBtn>
                {exportOpen && (
                  <div className="toast-in absolute right-0 z-50 mt-1.5 w-64 rounded-md border border-line bg-nebula2 p-1.5 shadow-deep">
                    <button type="button" onClick={() => { doCopyMarkdown(); setExportOpen(false); }} className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-star hover:bg-nebula"><FileText className="h-4 w-4 text-stardim" aria-hidden /> Copy account map (Markdown)</button>
                    <button type="button" onClick={doExportJSON} className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-star hover:bg-nebula"><FileDown className="h-4 w-4 text-stardim" aria-hidden /> Download JSON (full state)</button>
                    <button type="button" onClick={doExportCSV} className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-star hover:bg-nebula"><ClipboardList className="h-4 w-4 text-stardim" aria-hidden /> Download all stakeholders (CSV)</button>
                    <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-star hover:bg-nebula"><Upload className="h-4 w-4 text-stardim" aria-hidden /> Import JSON…</button>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={doImport} aria-label="Import JSON file" />
              </div>
              <IconBtn icon={RotateCcw} label="Reset all data" onClick={() => setResetOpen(true)} />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-6">
          <AccountRail accounts={state.accounts} selectedId={state.selectedId} onSelect={(id) => patch({ selectedId: id })}
            onAdd={addAccount} consoleAccounts={consoleCtx?.roster?.accounts} onImportConsole={importConsoleAccounts} />

          <div className="mt-5">
            {state.accounts.length === 0 ? (
              <EmptyState onLoadDemo={doLoadDemo} onAdd={addAccount} />
            ) : selectedAccount ? (
              <AccountView account={selectedAccount}
                onPatchAccount={boundPatchAccount}
                onDeleteAccount={() => removeAccount(selectedAccount.id)}
                onAddStakeholder={boundAddStakeholder}
                onPatchStakeholder={boundPatchStakeholder}
                onRemoveStakeholder={boundRemoveStakeholder}
                onAddAction={boundAddAction}
                onPatchAction={boundPatchAction}
                onRemoveAction={boundRemoveAction}
                onMoveAction={boundMoveAction}
                onCopyAccount={boundCopyAccount} />
            ) : null}
          </div>
        </main>

        {copilotOpen && (
          <CopilotDrawer state={state} account={selectedAccount} onClose={() => setCopilotOpen(false)}
            onNotes={(v) => patch({ copilotNotes: v })} onToast={showToast} />
        )}

        <Modal open={helpOpen} onClose={closeHelp} title="How to build a champion map" icon={BookOpen} wide>
          <HelpContent />
        </Modal>

        <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Clear the whole sky?" icon={AlertTriangle}>
          <p className="text-sm text-stardim">This clears every account, stakeholder, and action from this browser. Download a JSON backup first if you want a fallback copy.</p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <IconBtn label="Cancel reset" onClick={() => setResetOpen(false)}>Cancel</IconBtn>
            <IconBtn icon={FileDown} label="Download JSON backup" onClick={() => downloadFile('champion-tracker-backup.json', 'application/json', JSON.stringify(state, null, 2))}>Backup first</IconBtn>
            <IconBtn icon={RotateCcw} label="Confirm clear" tone="danger" onClick={doReset}>Clear it</IconBtn>
          </div>
        </Modal>

        {toast && (
          <div className="toast-in fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-md border border-line bg-nebula2 px-4 py-2.5 shadow-deep">
            <span className="text-sm text-star">{toast.msg}</span>
            {toast.undo && (
              <button type="button" onClick={() => { toast.undo(); setToast(null); }}
                className="label-caps flex items-center gap-1 rounded border border-gold/50 bg-gold/10 px-2 py-1 text-[11px] text-gold hover:bg-gold/20">
                <Undo2 className="h-3 w-3" aria-hidden /> Undo
              </button>
            )}
          </div>
        )}
      </div>

      <PrintSheet account={selectedAccount} />
    </div>
  );
}
