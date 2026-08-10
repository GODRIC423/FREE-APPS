import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Archive, ClipboardList, Sparkles, Library, HelpCircle, Download, FileText, FileDown, Upload, RotateCcw,
  BookOpen, AlertTriangle, X, Undo2, Search, Plus, ShieldCheck, RefreshCw, Boxes, ChevronLeft, Copy, Trash2,
  Stamp, ChevronUp, ChevronDown, FolderOpen, FolderPlus, Check, Layers, Gauge, Keyboard, Cable,
} from 'lucide-react';

/* ================================ BizDev Console bus (postMessage v1) ================================ */

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
    try { window.parent.postMessage({ bizdev: 'ready', v: 1, slug: '23-rfp-answer-vault' }, '*'); } catch {}
    return () => window.removeEventListener('message', onMsg);
  }, []);
  return ctx;
}

/* Compact context header prepended to every Claude Copilot prompt when linked to the console. */
function consoleContextHeader(ctx) {
  if (!ctx) return '';
  const lines = [];
  if (ctx.profile?.company) lines.push(`- My company: ${ctx.profile.company}`);
  if (ctx.profile?.offer) lines.push(`- What I sell: ${ctx.profile.offer}`);
  if (ctx.profile?.icp) lines.push(`- My ICP: ${ctx.profile.icp}`);
  if (ctx.profile?.pricingAnchor) lines.push(`- Pricing anchor: ${ctx.profile.pricingAnchor}`);
  const nameVoice = [ctx.claude?.userName, ctx.claude?.voiceNotes].filter(Boolean).join(' — ');
  if (nameVoice) lines.push(`- My name / voice: ${nameVoice}`);
  const accounts = (ctx.roster?.accounts || []).filter((a) => a && a.name);
  if (accounts.length) {
    const list = accounts.slice(0, 12).map((a) => (a.segment ? `${a.name} (${a.segment})` : a.name)).join(', ');
    lines.push(`- Accounts on file: ${list}`);
  }
  if (!lines.length) return '';
  return `## Shared context (from BizDev Console)\n${lines.join('\n')}\n\n`;
}

/* ================================ constants ================================ */

const LS_KEY = 'bizdev:23-rfp-answer-vault:v1';

const CATEGORIES = [
  { id: 'security', label: 'Security & Compliance', code: 'SEC' },
  { id: 'company', label: 'Company & Team', code: 'CO' },
  { id: 'product', label: 'Product & Technical', code: 'PRD' },
  { id: 'implementation', label: 'Implementation & Support', code: 'IMP' },
  { id: 'commercial', label: 'Pricing & Commercial', code: 'COM' },
  { id: 'legal', label: 'Legal & Data Privacy', code: 'LEG' },
];

const RESPONSE_STATUSES = ['drafting', 'submitted', 'won', 'lost'];

const FRESH_META = {
  fresh: { label: 'Fresh' },
  aging: { label: 'Aging' },
  stale: { label: 'Stale' },
  unknown: { label: 'Undated' },
};

let _uid = 0;
const uid = () => `${Date.now().toString(36)}-${(_uid++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const daysFromNow = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const pct = (r) => (r == null ? '—' : `${Math.round(r * 100)}%`);

/* ================================ normalize ================================ */

const str = (v, fb = '') => (typeof v === 'string' ? v : fb);
const arr = (v) => (Array.isArray(v) ? v : []);

function normAnswer(a) {
  return {
    id: str(a?.id) || uid(),
    question: str(a?.question, 'New question pattern'),
    answer: str(a?.answer),
    tags: arr(a?.tags).map((t) => str(t)).filter(Boolean).slice(0, 12),
    category: CATEGORIES.some((c) => c.id === a?.category) ? a.category : 'company',
    owner: str(a?.owner),
    freshnessDate: /^\d{4}-\d{2}-\d{2}$/.test(a?.freshnessDate) ? a.freshnessDate : today(),
    source: str(a?.source),
  };
}

function normResponseItem(it) {
  return {
    id: str(it?.id) || uid(),
    question: str(it?.question),
    answerId: str(it?.answerId) || null,
    text: str(it?.text),
  };
}

function normResponse(r) {
  return {
    id: str(r?.id) || uid(),
    name: str(r?.name, 'Untitled RFP'),
    client: str(r?.client),
    dueDate: str(r?.dueDate),
    status: RESPONSE_STATUSES.includes(r?.status) ? r.status : 'drafting',
    items: arr(r?.items).map(normResponseItem),
    notes: str(r?.notes),
  };
}

function normalize(raw) {
  let d = raw;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { d = null; } }
  if (!d || typeof d !== 'object') d = {};
  const answers = arr(d.answers).map(normAnswer);
  const responses = arr(d.responses).map(normResponse);
  return {
    answers,
    responses,
    selectedResponseId: responses.some((r) => r.id === d.selectedResponseId) ? d.selectedResponseId : (responses[0]?.id || null),
    copilotNotes: str(d.copilotNotes),
    seenGuide: !!d.seenGuide,
  };
}

function loadState() {
  try { return normalize(localStorage.getItem(LS_KEY)); } catch { return normalize(null); }
}

/* ================================ freshness ================================ */

function daysSince(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return null;
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

function freshnessStatus(dateStr) {
  const days = daysSince(dateStr);
  if (days == null) return 'unknown';
  if (days <= 90) return 'fresh';
  if (days <= 180) return 'aging';
  return 'stale';
}

/* ================================ demo data ================================ */

function demoState() {
  const A = (id, question, answer, category, tags, owner, freshDays, source = '') =>
    ({ id, question, answer, category, tags, owner, freshnessDate: daysAgo(freshDays), source });

  const answers = [
    A('ans-1001', 'Describe your approach to data encryption at rest and in transit.',
      "All customer data is encrypted at rest using AES-256 via our cloud provider's managed key service, with per-tenant envelope keys rotated every 90 days. Data in transit is encrypted with TLS 1.2 or higher on every endpoint, including internal service-to-service calls. Key management runs through a dedicated KMS with access logged and reviewed quarterly.",
      'security', ['encryption', 'data-security', 'kms'], 'Priya Nair — Security', 20, 'Security whitepaper, section 3'),
    A('ans-1002', 'What compliance certifications do you hold (SOC 2, ISO 27001, etc.)?',
      'Fathom holds a SOC 2 Type II report, renewed annually and available under NDA through the security portal. ISO 27001 certification is in progress with a target completion this year; a letter of attestation from our auditor is available on request in the meantime.',
      'security', ['soc2', 'iso27001', 'certifications'], 'Priya Nair — Security', 214, 'SOC 2 report cover letter'),
    A('ans-1003', 'How do you handle a security incident or suspected data breach?',
      'We run a documented incident response plan with a 24/7 on-call security rotation. Confirmed incidents affecting customer data trigger notification within 72 hours, consistent with GDPR and most state breach-notification laws, along with a written root-cause report once the investigation closes.',
      'security', ['incident-response', 'breach-notification'], 'Priya Nair — Security', 38, ''),
    A('ans-1004', 'Do you support single sign-on (SSO) and SCIM provisioning?',
      'Yes. We support SAML 2.0 and OIDC for SSO with any major identity provider (Okta, Azure AD, Google Workspace), and SCIM for automated user provisioning and deprovisioning. SSO is included at no extra cost on all paid tiers.',
      'security', ['sso', 'saml', 'scim'], 'Priya Nair — Security', 11, ''),
    A('ans-1005', 'Provide an overview of your company: founding year, headcount, and headquarters.',
      'Fathom was founded in 2018 and is headquartered in Austin, TX, with a distributed team of 140 employees across North America and Europe. We are privately held and have been cash-flow positive since 2023.',
      'company', ['company-overview', 'background'], 'Owen Ruiz — RevOps', 15, ''),
    A('ans-1006', 'What is your gross and net customer retention rate?',
      'Trailing twelve months: 96% gross revenue retention and 112% net revenue retention, driven primarily by seat expansion within existing accounts. We publish these figures in our annual customer trust report.',
      'company', ['retention', 'metrics'], 'Owen Ruiz — RevOps', 132, 'Annual trust report, FY25'),
    A('ans-1007', 'Provide three reference customers we can contact.',
      'We can provide references from three accounts of comparable size and industry once we reach the shortlist stage; typical references include a mid-market logistics operator, a regional healthcare network, and a public-sector agency. We ask for two weeks notice to confirm availability with the reference contact.',
      'company', ['references'], 'Owen Ruiz — RevOps', 61, ''),
    A('ans-1008', 'Describe your API and third-party integration capabilities.',
      'Fathom exposes a versioned REST API with webhook support for real-time events, rate-limited at 600 requests/minute per tenant with burst headroom on request. We publish SDKs for Python, Node, and Java, plus prebuilt connectors for Salesforce, NetSuite, and 30+ other systems.',
      'product', ['api', 'integrations', 'webhooks'], 'Dev Chen — Product', 6, 'API docs'),
    A('ans-1009', 'What is your platform uptime SLA and historical availability?',
      'Our contractual SLA is 99.9% monthly uptime with service credits for shortfalls. Actual trailing-12-month availability is 99.97%, published live on our status page along with incident history and postmortems for any outage over 15 minutes.',
      'product', ['uptime', 'sla', 'status-page'], 'Dev Chen — Product', 27, 'status.fathom (public)'),
    A('ans-1010', 'How does your product handle data residency requirements (EU, US, etc.)?',
      'Customer data is hosted in the US East region by default. An EU hosting option (Frankfurt) is available on request for an additional infrastructure fee. All regions run the same security controls and backup schedule.',
      'product', ['data-residency', 'gdpr', 'hosting'], 'Dev Chen — Product', 301, 'Infra architecture doc v2'),
    A('ans-1011', 'What does a typical implementation timeline look like?',
      'Standard implementations run 3-6 weeks in three phases: data migration and integration setup (weeks 1-2), configuration and workflow mapping (weeks 3-4), and a pilot rollout with a subset of users before full go-live. A dedicated implementation manager runs weekly checkpoints throughout.',
      'implementation', ['onboarding', 'timeline', 'rollout'], 'Marisol Vega — CS', 49, ''),
    A('ans-1012', 'Describe your customer support model and response-time SLAs.',
      'All plans include email and in-app chat support with a 4-business-hour first response SLA; enterprise plans add a named customer success manager and a 1-hour SLA on severity-1 issues via a dedicated escalation line, available 24/7.',
      'implementation', ['support', 'sla'], 'Marisol Vega — CS', 18, ''),
    A('ans-1013', 'What training and enablement do you provide during rollout?',
      'Rollout includes live admin training, role-specific end-user sessions, an in-app guided walkthrough for first-time users, and a resource hub of short how-to videos. Enterprise plans add a customized train-the-trainer session for internal champions.',
      'implementation', ['training', 'enablement'], 'Marisol Vega — CS', 168, ''),
    A('ans-1014', 'Describe your pricing model and what is included at each tier.',
      'Pricing is a hybrid of a per-seat platform fee plus metered usage above an included allotment, billed monthly or annually. Three tiers (Team, Business, Enterprise) differ mainly in SSO/SCIM, API rate limits, support SLA, and audit-log retention; all tiers include the core workflow features.',
      'commercial', ['pricing', 'packaging'], 'Owen Ruiz — RevOps', 8, ''),
    A('ans-1015', 'What are your standard payment terms?',
      'Standard terms are net 30 on invoiced annual contracts, with a 10% discount for annual prepay. Monthly self-serve plans are billed by credit card at the start of each cycle. Custom terms are available for multi-year enterprise agreements.',
      'commercial', ['payment-terms', 'billing'], 'Owen Ruiz — RevOps', 74, ''),
    A('ans-1016', 'Will you sign a Data Processing Agreement (DPA) with GDPR-standard contractual clauses?',
      'Yes. Our standard DPA incorporates the EU Standard Contractual Clauses and is available for redline through our legal team; most counterparties execute it without changes within a few business days.',
      'legal', ['dpa', 'gdpr', 'scc'], 'Priya Nair — Security', 12, ''),
    A('ans-1017', 'What is your data retention and deletion policy upon contract termination?',
      'Customer data is retained for 30 days post-termination to allow export, then permanently deleted from production and backup systems within 60 days. Customers may request an earlier deletion certificate in writing.',
      'legal', ['data-retention', 'offboarding'], 'Priya Nair — Security', 227, 'Data handling policy v3'),
  ];

  const item = (question, answerId, edited) => {
    const src = answers.find((a) => a.id === answerId);
    return { question, answerId, text: edited ?? src?.answer ?? '' };
  };

  const responses = [
    {
      id: 'rfp-globalfreight', name: 'Global Freight Co. — Enterprise Ops RFP', client: 'Global Freight Co.',
      dueDate: daysFromNow(9), status: 'drafting',
      notes: 'Procurement-led eval, 4 vendors shortlisted. Security and uptime numbers are the two sections their IT lead flagged as "must be airtight" on the kickoff call.',
      items: [
        item('3.2 — Explain your encryption standards for data at rest and in motion.', 'ans-1001'),
        item('3.5 — List current security certifications and audit reports, with dates.', 'ans-1002'),
        item('5.1 — Detail your API and integration approach for our TMS and WMS systems.', 'ans-1008'),
        item('5.4 — State your platform uptime SLA and actual historical availability.', 'ans-1009'),
        item('8.1 — Outline your pricing model and what is included at each tier.', 'ans-1014'),
        item('9.3 — Confirm you will sign our standard Data Processing Agreement.', 'ans-1016'),
        { question: '6.2 — Describe your disaster recovery plan, including RPO and RTO targets.', answerId: null, text: '' },
        { question: '2.3 — Provide your diversity, equity & inclusion commitments and supplier diversity program.', answerId: null, text: '' },
      ],
    },
    {
      id: 'rfp-bramwell', name: 'Bramwell Health Systems — Vendor Onboarding RFP', client: 'Bramwell Health Systems',
      dueDate: daysAgo(41), status: 'won',
      notes: 'Won. Debrief call: the SOC 2 report and the 99.97% uptime figure — cited verbatim from our status page — were named as the deciding factors over the incumbent.',
      items: [
        item('Explain your data encryption approach.', 'ans-1001'),
        item('List your compliance certifications.', 'ans-1002'),
        item('What is your uptime SLA and track record?', 'ans-1009'),
        item('Describe your implementation timeline and support model.', 'ans-1011',
          'Implementations typically run 3-6 weeks across three phases — migration, configuration, and a pilot rollout — with weekly checkpoints from a dedicated implementation manager. Support during and after rollout includes a 1-hour severity-1 SLA on our enterprise plan.'),
        item('Confirm DPA and data retention terms on termination.', 'ans-1016'),
      ],
    },
  ];

  return normalize({ answers, responses, selectedResponseId: 'rfp-globalfreight', copilotNotes: '', seenGuide: true });
}

/* ============================ derived + serializers ============================ */

function coverage(r) {
  const total = r.items.length;
  const answered = r.items.filter((it) => it.text.trim() !== '').length;
  return { total, answered, gaps: total - answered, pct: total ? Math.round((answered / total) * 100) : 0 };
}

function usageCount(state, answerId) {
  return state.responses.reduce((n, r) => n + r.items.filter((it) => it.answerId === answerId).length, 0);
}

function vaultStats(answers) {
  const s = { fresh: 0, aging: 0, stale: 0, unknown: 0 };
  answers.forEach((a) => { s[freshnessStatus(a.freshnessDate)]++; });
  return { total: answers.length, ...s };
}

function answerToMarkdown(a) {
  const cat = CATEGORIES.find((c) => c.id === a.category);
  const st = freshnessStatus(a.freshnessDate);
  return [
    `### ${a.question}`,
    `*${cat?.label || a.category} · ${a.tags.join(', ') || 'no tags'} · owner ${a.owner || '—'} · verified ${a.freshnessDate || '—'} (${FRESH_META[st].label})*`,
    '',
    a.answer || '_No canonical answer written yet._',
  ].join('\n');
}

function vaultToMarkdown(state) {
  const L = [`# RFP Answer Vault — Library Export`, `_Exported ${today()} · ${state.answers.length} answers across ${CATEGORIES.length} drawers_`];
  CATEGORIES.forEach((cat) => {
    const items = state.answers.filter((a) => a.category === cat.id);
    if (!items.length) return;
    L.push(`\n---\n\n## ${cat.label} (${cat.code})`);
    items.forEach((a) => L.push(`\n${answerToMarkdown(a)}`));
  });
  return L.join('\n');
}

function responseToMarkdown(state, r) {
  const cov = coverage(r);
  const L = [
    `# ${r.name}`,
    `_Client: ${r.client || '—'} · Due: ${r.dueDate || '—'} · Status: ${r.status} · Coverage: ${cov.answered}/${cov.total} (${cov.pct}%)_`,
  ];
  if (r.notes) L.push(`\n**Notes:** ${r.notes}`);
  r.items.forEach((it, i) => {
    const src = it.answerId ? state.answers.find((a) => a.id === it.answerId) : null;
    L.push(`\n---\n\n**${i + 1}. ${it.question || '(question not entered)'}**\n`);
    if (it.text.trim()) {
      L.push(it.text);
      if (src) {
        const st = freshnessStatus(src.freshnessDate);
        if (st === 'stale') L.push(`\n**[SOURCE STALE — VERIFY BEFORE SUBMITTING]** last verified ${src.freshnessDate}.`);
        else if (st === 'aging') L.push(`\n**[SOURCE AGING — DOUBLE-CHECK]** last verified ${src.freshnessDate}.`);
      }
    } else {
      L.push('_GAP — no answer drafted yet._');
    }
  });
  return L.join('\n');
}

function vaultToCSV(answers) {
  const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const rows = [['category', 'question', 'answer', 'tags', 'owner', 'freshness_date', 'source']];
  answers.forEach((a) => {
    const cat = CATEGORIES.find((c) => c.id === a.category);
    rows.push([cat?.label || a.category, a.question, a.answer, a.tags.join('; '), a.owner, a.freshnessDate, a.source]);
  });
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}

/* ================================ clipboard / files ================================ */

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

function promptAdapt(state, r) {
  const answered = r.items.filter((it) => it.answerId);
  return `You are a senior proposal writer who adapts a company's canonical RFP answers to the exact wording, tone, and emphasis of a specific bid — without changing the underlying facts.

## The RFP
Name: ${r.name}
Client: ${r.client || '—'}
Due: ${r.dueDate || '—'}

## Canonical answers currently attached (source of truth — do not invent facts beyond these)
${answered.map((it) => {
    const src = state.answers.find((a) => a.id === it.answerId);
    return `### Q: ${it.question || '(question not yet entered)'}\nCanonical source (verified ${src?.freshnessDate || 'unknown'}):\n${src?.answer || '(missing)'}\n\nCurrent draft in the response:\n${it.text || '(empty — needs a first draft)'}`;
  }).join('\n\n')}

## Your task
For each Q&A pair above:
1. Rewrite the answer so its opening sentence directly mirrors the language and structure of the RFP's exact question.
2. Preserve every fact, number, and claim from the canonical source exactly — do not soften or embellish claims we have not made.
3. Tighten for a procurement reviewer skimming dozens of responses: lead with the answer, then support it in 2-4 sentences.
4. Flag in brackets anywhere you had to guess or extrapolate beyond the canonical source, so we can verify before submitting.

## Output format
Markdown, one section per question, each with the adapted answer ready to paste back into the response.`;
}

function promptDraftGaps(state, r) {
  const gaps = r.items.filter((it) => !it.text.trim());
  const sample = state.answers.slice(0, 3);
  return `You are a proposal writer drafting new canonical answers for a company's RFP answer library, matching the voice and specificity of their existing entries.

## Voice reference — existing canonical answers (match this tone, length, and level of specificity)
${sample.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')}

## The RFP needing these answers
Name: ${r.name} · Client: ${r.client || '—'}

## Unanswered questions (the gap list — we have no canonical answer for these yet)
${gaps.length ? gaps.map((it, i) => `${i + 1}. ${it.question || '(question text missing — infer a plausible RFP question from context if you can, otherwise ask)'}`).join('\n') : '(No gaps recorded — ask the user which question needs a first draft.)'}

## Your task
Draft a strong, specific, defensible first answer for each gap question above, in the same voice as the reference answers. Where you must make a factual claim you cannot verify (numbers, certifications, dates), write [VERIFY: ...] instead of inventing a figure. Keep each answer tight enough to reuse as a canonical library entry — 3-6 sentences, no filler.

## Output format
Markdown, one "### Q: ..." heading per gap followed by the drafted answer, ready to paste into new vault entries.`;
}

function promptReview(state, r) {
  return `You are a meticulous proposal editor doing a final consistency pass before an RFP response is submitted.

## The compiled response
${responseToMarkdown(state, r)}

## Your task
Review the compiled response above for:
1. Terminology consistency — the same product or feature named the same way throughout (flag any drift).
2. Tone consistency — confident and specific everywhere, no answer that reads noticeably weaker or more hedgy than the rest.
3. Contradictions — any claim in one answer that conflicts with a claim in another (e.g. different uptime numbers, different timelines).
4. Gaps and stale sources — call out every GAP item and every answer flagged as an aging or stale source, ranked by how much submission risk it carries.
5. Redundancy — answers that repeat the same point across questions where they could instead cross-reference.

## Output format
Markdown with sections "Consistency issues", "Contradictions", "Submission risks (ranked)", "Suggested edits" — specific enough that we can paste fixes straight back into the response.`;
}

function promptVaultAudit(state) {
  const stats = vaultStats(state.answers);
  const staleList = state.answers.filter((a) => freshnessStatus(a.freshnessDate) === 'stale');
  return `You are a knowledge-management consultant auditing a company's RFP answer library for a sales and proposal team.

## Library snapshot
${state.answers.length} total answers across ${CATEGORIES.length} categories.
Freshness: ${stats.fresh} fresh, ${stats.aging} aging, ${stats.stale} stale, ${stats.unknown} undated.

## Stale answers (unverified for 180+ days — highest risk of shipping outdated claims)
${staleList.length ? staleList.map((a) => `- [${CATEGORIES.find((c) => c.id === a.category)?.code}] "${a.question}" — last verified ${a.freshnessDate}, owner ${a.owner || 'unassigned'}, used in ${usageCount(state, a.id)} response(s)`).join('\n') : '(No stale answers — nice work.)'}

## Category coverage
${CATEGORIES.map((c) => `- ${c.label}: ${state.answers.filter((a) => a.category === c.id).length} answers`).join('\n')}

## Your task
1. Prioritize the stale answers above into a refresh order — weigh usage count (answers used often are higher-risk) against how volatile that topic typically is (security certifications and pricing change faster than company history).
2. Flag any category above that looks thin (fewer than 2-3 answers) relative to what RFPs typically probe, and suggest 2-3 specific questions to add there.
3. Recommend an ownership and review cadence (who should re-verify what, how often) given the owners listed.

## Output format
Markdown sections: "Refresh priority order", "Thin categories", "Suggested review cadence". Be specific and actionable — this goes straight to the team doing the work.`;
}

const COPILOT_ACTIONS = [
  { id: 'adapt', icon: RefreshCw, needsResponse: true, title: "Adapt answers to this RFP's wording",
    desc: "Rewrites each attached answer to open with the RFP's own question language while preserving every fact.", build: (s, r) => promptAdapt(s, r) },
  { id: 'draft-gap', icon: Layers, needsResponse: true, title: 'Draft the answers we lack',
    desc: "Turns this RFP's gap list into first-draft canonical answers in your team's voice.", build: (s, r) => promptDraftGaps(s, r) },
  { id: 'review', icon: ShieldCheck, needsResponse: true, title: 'Review response for consistency',
    desc: 'Checks the compiled response for contradictions, tone drift, and submission risk before you send it.', build: (s, r) => promptReview(s, r) },
  { id: 'audit', icon: Gauge, needsResponse: false, title: 'Audit the vault for stale answers',
    desc: 'Prioritizes which stale entries to refresh first and flags thin categories.', build: (s) => promptVaultAudit(s) },
];

/* ================================ tiny UI atoms ================================ */

function IconBtn({ icon: Icon, label, onClick, tone = 'ghost', className = '', children, ...rest }) {
  const tones = {
    ghost: 'border-line bg-steel-800/70 text-dim hover:text-ink hover:border-faint/60',
    brass: 'border-brassdeep/60 bg-brass/10 text-brass hover:bg-brass/20',
    rust: 'border-rustdeep/60 bg-rust/10 text-rust hover:bg-rust/20',
    solid: 'border-brass bg-brass text-vault hover:bg-brassglow',
    verdigris: 'border-verdigrisdeep/60 bg-verdigris/10 text-verdigris hover:bg-verdigris/20',
  };
  return (
    <button type="button" onClick={onClick} aria-label={children ? undefined : label} title={label}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-semibold transition-colors ${tones[tone]} ${className}`} {...rest}>
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}{children}
    </button>
  );
}

function Panel({ title, icon: Icon, tone, children, className = '', actions }) {
  const toneText = tone === 'rust' ? 'text-rust' : tone === 'brass' ? 'text-brass' : tone === 'verdigris' ? 'text-verdigris' : 'text-dim';
  return (
    <section className={`rounded-lg border border-line bg-steel-800/80 shadow-raised backdrop-blur-sm ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-linesoft px-3.5 py-2.5">
          <h3 className={`label-caps flex items-center gap-2 text-xs ${toneText}`}>
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-vault/85 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`toast-in relative mt-4 w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-lg border border-line bg-steel-900 shadow-deck`}>
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-display flex items-center gap-2 text-base font-extrabold text-ink">
            {Icon && <Icon className="h-4 w-4 text-brass" aria-hidden />} {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close dialog"
            className="rounded-md border border-line p-1.5 text-dim hover:text-ink">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }) {
  const toneClass = tone === 'verdigris' ? 'text-verdigris' : tone === 'amber' ? 'text-amber' : tone === 'rust' ? 'text-rust' : 'text-ink';
  return (
    <div className="rounded-lg border border-line bg-steel-800/80 px-3 py-2.5 shadow-raised">
      <div className="label-caps flex items-center gap-1.5 text-[10px] text-dim">
        <Icon className="h-3 w-3" aria-hidden /> {label}
      </div>
      <div className={`font-display mt-1 text-2xl font-extrabold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

function FreshBadge({ date, compact }) {
  const status = freshnessStatus(date);
  const meta = FRESH_META[status];
  const days = daysSince(date);
  const colorClasses = {
    fresh: 'border-verdigrisdeep/60 bg-verdigris/10 text-verdigris',
    aging: 'border-amberdeep/60 bg-amber/10 text-amber',
    stale: 'border-rustdeep/60 bg-rust/10 text-rust',
    unknown: 'border-line bg-steel-800 text-faint',
  };
  if (status === 'stale' && !compact) {
    return <span className="ink-stamp text-rust" aria-label={`Stale — last verified ${date || 'never'}`}>Stale</span>;
  }
  return (
    <span className={`label-caps inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] ${colorClasses[status]}`}>
      {meta.label}{days != null ? ` · ${days}d` : ''}
    </span>
  );
}

function StatusChip({ status }) {
  const map = {
    drafting: 'border-line bg-steel-700 text-dim',
    submitted: 'border-amberdeep/50 bg-amber/10 text-amber',
    won: 'border-verdigrisdeep/50 bg-verdigris/10 text-verdigris',
    lost: 'border-rustdeep/50 bg-rust/10 text-rust',
  };
  return <span className={`label-caps rounded-sm border px-1.5 py-0.5 text-[9px] ${map[status]}`}>{status}</span>;
}

function TagEditor({ tags, onChange }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim().toLowerCase().replace(/\s+/g, '-');
    if (!t || tags.includes(t)) { setDraft(''); return; }
    onChange([...tags, t]);
    setDraft('');
  };
  const remove = (t) => onChange(tags.filter((x) => x !== t));
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="label-caps inline-flex items-center gap-1 rounded-sm border border-brassdeep/50 bg-brass/10 px-1.5 py-0.5 text-[10px] text-brass">
            {t}
            <button type="button" onClick={() => remove(t)} aria-label={`Remove tag ${t}`} className="text-brass/70 hover:text-rust">
              <X className="h-2.5 w-2.5" aria-hidden />
            </button>
          </span>
        ))}
        {tags.length === 0 && <span className="text-[12px] text-faint">No tags yet.</span>}
      </div>
      <div className="mt-2 flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Add a tag, press Enter…" aria-label="Add tag"
          className="min-w-0 flex-1 rounded-md border border-line bg-steel-900 px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brassglow/60" />
        <IconBtn icon={Plus} label="Add tag" onClick={add} />
      </div>
    </div>
  );
}

/* ================================ hero graphics ================================ */

function Wordmark({ consoleCtx }) {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 40 40" className="h-10 w-10" role="img" aria-label="RFP Answer Vault mark">
        <circle cx="20" cy="20" r="18" fill="#1b2027" stroke="var(--color-line)" strokeWidth="2" />
        <circle cx="20" cy="20" r="13" fill="none" stroke="var(--color-brassdeep)" strokeWidth="1.5" />
        <g className="dial-spin" style={{ transformOrigin: '20px 20px' }}>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * 45 * Math.PI) / 180;
            return (
              <line key={i} x1={20 + 9 * Math.cos(a)} y1={20 + 9 * Math.sin(a)}
                x2={20 + 13 * Math.cos(a)} y2={20 + 13 * Math.sin(a)}
                stroke="var(--color-brass)" strokeWidth="1.5" />
            );
          })}
        </g>
        <circle cx="20" cy="20" r="5.5" fill="var(--color-steel-800)" stroke="var(--color-brass)" strokeWidth="1.5" />
        <circle cx="20" cy="20" r="1.6" fill="var(--color-brass)" />
      </svg>
      <div>
        <div className="font-display text-xl font-extrabold leading-none tracking-tight text-ink">
          ANSWER <span className="text-brass">VAULT</span>
        </div>
        <div className="label-caps mt-1 text-[10px] text-dim">Answer RFPs in hours, not weeks</div>
      </div>
      {consoleCtx && (
        <span className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-brassdeep/60 bg-brass/10 px-2.5 py-1 text-[11px] font-semibold text-brass">
          <Cable className="h-3 w-3" aria-hidden /> Console linked{consoleCtx.profile?.company ? ` — ${consoleCtx.profile.company}` : ''}
        </span>
      )}
    </div>
  );
}

function CabinetHero({ answers, categoryFilter, onSelect }) {
  const counts = CATEGORIES.map((cat) => {
    const items = answers.filter((a) => a.category === cat.id);
    const s = { fresh: 0, aging: 0, stale: 0, unknown: 0 };
    items.forEach((a) => { s[freshnessStatus(a.freshnessDate)]++; });
    let dominant = 'unknown';
    if (items.length) dominant = s.stale > 0 ? 'stale' : s.aging > 0 ? 'aging' : 'fresh';
    return { cat, count: items.length, dominant };
  });
  const W = 460, H = 300, cols = 2, rows = 3, gap = 14;
  const dw = (W - gap * (cols + 1)) / cols, dh = (H - gap * (rows + 1)) / rows;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-[500px]" role="img" aria-label="Vault cabinet — click a drawer to filter by category">
      <rect x="0" y="0" width={W} height={H} rx="10" fill="var(--color-steel-800)" stroke="var(--color-line)" strokeWidth="2" />
      {counts.map(({ cat, count, dominant }, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const x = gap + col * (dw + gap), y = gap + row * (dh + gap);
        const active = categoryFilter === cat.id;
        const stripe = dominant === 'stale' ? 'var(--color-rust)' : dominant === 'aging' ? 'var(--color-amber)' : dominant === 'fresh' ? 'var(--color-verdigris)' : 'var(--color-faint)';
        return (
          <g key={cat.id} onClick={() => onSelect(cat.id)} role="button" tabIndex={0}
            aria-label={`Filter to ${cat.label}, ${count} answers`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(cat.id); } }}
            className="cursor-pointer focus:outline-none">
            <rect x={x} y={y} width={dw} height={dh} rx="6"
              fill={active ? 'var(--color-steel-700)' : 'var(--color-steel-900)'}
              stroke={active ? 'var(--color-brass)' : 'var(--color-line)'} strokeWidth={active ? 2 : 1.4} />
            <rect x={x} y={y} width="5" height={dh} fill={stripe} opacity="0.85" />
            <rect x={x + dw / 2 - 26} y={y + dh - 13} width="52" height="7" rx="3.5" fill="var(--color-steel-700)" stroke="var(--color-brassdeep)" strokeWidth="1" />
            <text x={x + dw / 2} y={y + 16} textAnchor="middle" fill="var(--color-brass)"
              style={{ font: '800 12px "Archivo", sans-serif', letterSpacing: '0.08em' }}>{cat.code}</text>
            <text x={x + dw / 2} y={y + dh / 2 + 2} textAnchor="middle" fill="var(--color-ink)"
              style={{ font: '600 9.5px "IBM Plex Mono", monospace' }}>
              {cat.label.length > 22 ? cat.label.slice(0, 21) + '…' : cat.label}
            </text>
            <text x={x + dw / 2} y={y + dh - 20} textAnchor="middle" fill="var(--color-dim)"
              style={{ font: '700 15px "Archivo", sans-serif' }} className="tabular">{String(count).padStart(2, '0')}</text>
          </g>
        );
      })}
    </svg>
  );
}

function HealthDial({ rate, size = 92, label }) {
  const r = 36, cx = 50, cy = 50;
  const a0 = Math.PI, a1 = 0;
  const arc = (t) => { const a = a0 + (a1 - a0) * t; return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }; };
  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const a = a0 + (a1 - a0) * (i / 10);
    const inner = i % 5 === 0 ? r - 7 : r - 4;
    ticks.push(
      <line key={i} x1={cx + inner * Math.cos(a)} y1={cy - inner * Math.sin(a)}
        x2={cx + r * Math.cos(a)} y2={cy - r * Math.sin(a)}
        stroke={i === 0 || i === 10 ? 'var(--color-dim)' : 'var(--color-line)'}
        strokeWidth={i % 5 === 0 ? 2 : 1} />
    );
  }
  const v = rate == null ? 0 : rate;
  const end = arc(v), start = arc(0);
  const needleA = a0 + (a1 - a0) * v;
  return (
    <svg viewBox="0 0 100 62" width={size} height={size * 0.62} role="img"
      aria-label={label || `Rate ${pct(rate)}`} className="overflow-visible">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--color-linesoft)" strokeWidth="6" />
      {rate != null && v > 0 && (
        <path d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`}
          fill="none" stroke={v >= 0.66 ? 'var(--color-verdigris)' : v >= 0.33 ? 'var(--color-amber)' : 'var(--color-rust)'}
          strokeWidth="6" strokeLinecap="round" />
      )}
      {ticks}
      {rate != null && (
        <line x1={cx} y1={cy} x2={cx + (r - 12) * Math.cos(needleA)} y2={cy - (r - 12) * Math.sin(needleA)}
          stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" />
      )}
      <circle cx={cx} cy={cy} r="3" fill="var(--color-ink)" />
      <text x={cx} y={cy - 12} textAnchor="middle" fill="var(--color-ink)" stroke="var(--color-steel-900)" strokeWidth="3"
        style={{ font: '700 13px "Archivo", sans-serif', paintOrder: 'stroke' }}>{pct(rate)}</text>
    </svg>
  );
}

/* ================================ vault view ================================ */

function VaultView({ state, query, setQuery, categoryFilter, setCategoryFilter, freshFilter, setFreshFilter, onOpen, onAdd, onLoadDemo }) {
  const empty = state.answers.length === 0;
  const stats = vaultStats(state.answers);
  const filtered = state.answers.filter((a) => {
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    if (freshFilter !== 'all' && freshnessStatus(a.freshnessDate) !== freshFilter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [a.question, a.answer, a.owner, a.source, ...a.tags].join(' ').toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,500px)_1fr]">
        <Panel title="The cabinet — click a drawer to filter" icon={Archive}>
          <div className="flex justify-center py-2">
            <CabinetHero answers={state.answers} categoryFilter={categoryFilter}
              onSelect={(id) => setCategoryFilter((c) => (c === id ? 'all' : id))} />
          </div>
        </Panel>

        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Answers on file" value={stats.total} icon={Boxes} />
            <Stat label="Fresh" value={stats.fresh} icon={ShieldCheck} tone="verdigris" />
            <Stat label="Aging" value={stats.aging} icon={RefreshCw} tone="amber" />
            <div className="flex flex-col items-center justify-center rounded-lg border border-line bg-steel-800/80 px-3 py-2.5 shadow-raised">
              <span className="label-caps mb-1 text-[10px] text-dim">Library health</span>
              <HealthDial rate={stats.total ? stats.fresh / stats.total : null} size={84} label="Library health" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions, answers, tags, owners…"
                aria-label="Search the vault"
                className="w-full rounded-md border border-line bg-steel-800/80 py-2 pl-8 pr-3 text-sm text-ink outline-none placeholder:text-faint focus:border-brassglow/60" />
            </div>
            {['all', 'fresh', 'aging', 'stale'].map((f) => (
              <button key={f} type="button" onClick={() => setFreshFilter(f)}
                className={`label-caps rounded-md border px-2.5 py-1.5 text-[11px] transition-colors ${
                  freshFilter === f ? 'border-brass/60 bg-brass/15 text-brass' : 'border-line bg-steel-800/60 text-dim hover:text-ink'}`}>
                {f === 'all' ? 'All' : FRESH_META[f].label}
              </button>
            ))}
            <IconBtn icon={Plus} label="New answer" tone="solid" onClick={onAdd}>New answer</IconBtn>
          </div>

          {categoryFilter !== 'all' && (
            <div className="flex items-center gap-2 text-[12px] text-dim">
              Drawer: <span className="label-caps text-brass">{CATEGORIES.find((c) => c.id === categoryFilter)?.label}</span>
              <button type="button" onClick={() => setCategoryFilter('all')} className="text-faint underline hover:text-ink">clear</button>
            </div>
          )}
        </div>
      </div>

      {empty ? (
        <div className="mt-8 rounded-lg border border-dashed border-line bg-steel-800/40 p-10 text-center">
          <Archive className="mx-auto h-10 w-10 text-faint" aria-hidden />
          <h2 className="font-display mt-3 text-lg font-extrabold text-ink">The vault is empty</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-dim">
            Every RFP asks the same forty questions in different words. Log the canonical answer once — question, answer, tags, owner, a verified date — and reuse it for the rest of your career.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <IconBtn icon={Library} label="Load demo" tone="brass" onClick={onLoadDemo}>Load the demo vault</IconBtn>
            <IconBtn icon={Plus} label="Add first answer" tone="solid" onClick={onAdd}>Add first answer</IconBtn>
          </div>
        </div>
      ) : (
        <>
          {filtered.length === 0 && (
            <p className="mt-8 text-center text-sm text-dim">No answers match that search. Try another term, or clear the drawer / freshness filters.</p>
          )}
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((a) => (
              <VaultCard key={a.id} a={a} usage={usageCount(state, a.id)} onOpen={() => onOpen(a.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function VaultCard({ a, usage, onOpen }) {
  const cat = CATEGORIES.find((c) => c.id === a.category);
  return (
    <button type="button" onClick={onOpen}
      className="brass-frame group relative rounded-md border border-line bg-steel-800/80 p-4 text-left shadow-raised transition-colors hover:border-brass/50">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="label-caps rounded-sm border border-brassdeep/50 bg-brass/10 px-1.5 py-0.5 text-[10px] text-brass">
          {cat?.code}-{a.id.slice(-4).toUpperCase()}
        </span>
        <FreshBadge date={a.freshnessDate} compact />
      </div>
      <div className="font-display text-[15px] font-bold leading-snug text-ink group-hover:text-brassglow">
        {a.question || 'Untitled question pattern'}
      </div>
      <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-dim">
        {a.answer || 'No canonical answer written yet — open to draft one.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-1">
        {a.tags.slice(0, 4).map((t) => <span key={t} className="rounded-sm bg-steel-700 px-1.5 py-0.5 text-[10px] text-dim">{t}</span>)}
        {a.tags.length > 4 && <span className="text-[10px] text-faint">+{a.tags.length - 4}</span>}
      </div>
      <div className="label-caps mt-3 flex items-center justify-between text-[10px] text-faint">
        <span>{a.owner || 'Unassigned'}</span>
        <span>Used ×{usage}</span>
      </div>
    </button>
  );
}

/* ================================ entry editor ================================ */

function EntryEditor({ a, usage, onBack, onPatch, onRemove, onMarkVerified, onCopy }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onBack}
          className="label-caps flex items-center gap-1 rounded-md border border-line bg-steel-800/60 px-2.5 py-1.5 text-[11px] text-dim hover:text-ink">
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Back to the vault
        </button>
        <div className="flex gap-2">
          <IconBtn icon={Copy} label="Copy this answer as Markdown" onClick={onCopy}>Copy entry</IconBtn>
          <IconBtn icon={Trash2} label="Delete this answer" tone="rust" onClick={onRemove}>Delete</IconBtn>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-steel-800/80 p-4 shadow-raised">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[260px] flex-1">
            <label className="label-caps text-[10px] text-dim" htmlFor="q">Question pattern</label>
            <textarea id="q" value={a.question} onChange={(e) => onPatch({ question: e.target.value })} rows={2}
              className="font-display mt-1 block w-full resize-y rounded-md border border-linesoft bg-steel-900 px-3 py-2 text-lg font-bold text-ink outline-none focus:border-brassglow/60" />
          </div>
          <div className="flex flex-col items-center">
            <FreshBadge date={a.freshnessDate} />
            <span className="label-caps mt-1 text-[10px] text-faint">Used in {usage} response{usage === 1 ? '' : 's'}</span>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <span className="label-caps block text-[10px] text-dim">Drawer / category</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button key={c.id} type="button" onClick={() => onPatch({ category: c.id })} aria-pressed={a.category === c.id}
                  className={`label-caps rounded-md border px-2 py-1.5 text-[10px] transition-colors ${
                    a.category === c.id ? 'border-brass/60 bg-brass/15 text-brass' : 'border-line bg-steel-900 text-dim hover:text-ink'}`}>
                  {c.code}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-caps text-[10px] text-dim" htmlFor="owner">Owner</label>
            <input id="owner" value={a.owner} onChange={(e) => onPatch({ owner: e.target.value })} placeholder="Who verifies this answer…"
              className="mt-1.5 block w-full rounded-md border border-linesoft bg-steel-900 px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brassglow/60" />
          </div>
          <div>
            <label className="label-caps text-[10px] text-dim" htmlFor="fresh">Verified date</label>
            <div className="mt-1.5 flex gap-2">
              <input id="fresh" type="date" value={a.freshnessDate} onChange={(e) => onPatch({ freshnessDate: e.target.value })}
                className="flex-1 rounded-md border border-linesoft bg-steel-900 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brassglow/60" />
              <IconBtn icon={Stamp} label="Mark verified today" tone="verdigris" onClick={onMarkVerified} />
            </div>
          </div>
          <div>
            <label className="label-caps text-[10px] text-dim" htmlFor="source">Source (optional)</label>
            <input id="source" value={a.source} onChange={(e) => onPatch({ source: e.target.value })} placeholder="SOC 2 report, security page, legal review…"
              className="mt-1.5 block w-full rounded-md border border-linesoft bg-steel-900 px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brassglow/60" />
          </div>
        </div>

        <div className="mt-3">
          <span className="label-caps block text-[10px] text-dim">Tags</span>
          <div className="mt-1.5"><TagEditor tags={a.tags} onChange={(tags) => onPatch({ tags })} /></div>
        </div>
      </div>

      <Panel className="mt-4" title="Canonical answer" icon={FileText}>
        <textarea value={a.answer} onChange={(e) => onPatch({ answer: e.target.value })} rows={10}
          placeholder="Write the answer once, in full — the version every future RFP response starts from…"
          className="w-full resize-y rounded-md border border-linesoft bg-steel-900 px-3 py-2 text-sm leading-relaxed text-ink outline-none placeholder:text-faint focus:border-brassglow/60" />
      </Panel>
    </div>
  );
}

/* ================================ assemble view ================================ */

function AssembleView({
  state, onPatchResponse, onAddResponse, onRemoveResponse, onSelectResponse,
  onAddItem, onAddGap, onPatchItem, onRemoveItem, onMoveItem, onPromoteGap, onOpenAnswer, onCopyResponse,
  rosterAccounts,
}) {
  const selected = state.responses.find((r) => r.id === state.selectedResponseId) || null;
  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      <ResponseCabinet responses={state.responses} selectedId={state.selectedResponseId}
        onSelect={onSelectResponse} onAdd={onAddResponse} onRemove={onRemoveResponse} />
      {selected ? (
        <ResponseDetail
          state={state} r={selected} rosterAccounts={rosterAccounts}
          onPatch={(p) => onPatchResponse(selected.id, p)}
          onAddItem={(a) => onAddItem(selected.id, a)}
          onAddGap={() => onAddGap(selected.id)}
          onPatchItem={(itemId, p) => onPatchItem(selected.id, itemId, p)}
          onRemoveItem={(itemId, label) => onRemoveItem(selected.id, itemId, label)}
          onMoveItem={(i, d) => onMoveItem(selected.id, i, d)}
          onPromoteGap={onPromoteGap}
          onOpenAnswer={onOpenAnswer}
          onCopy={() => onCopyResponse(selected)}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-steel-800/40 p-10 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-faint" aria-hidden />
          <h2 className="font-display mt-3 text-lg font-extrabold text-ink">No RFP open</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-dim">Start a folder for the RFP you're answering, then pick questions straight out of the vault.</p>
          <div className="mt-5"><IconBtn icon={FolderPlus} label="New response" tone="solid" onClick={onAddResponse}>New response</IconBtn></div>
        </div>
      )}
    </div>
  );
}

function ResponseCabinet({ responses, selectedId, onSelect, onAdd, onRemove }) {
  return (
    <Panel title="RFP folders" icon={FolderOpen} actions={<IconBtn icon={FolderPlus} label="New response" onClick={onAdd} />}>
      {responses.length === 0 ? (
        <p className="text-sm text-dim">No RFPs started yet. Create a folder for the one you're working on.</p>
      ) : (
        <ul className="space-y-1.5">
          {responses.map((r) => {
            const cov = coverage(r);
            return (
              <li key={r.id} className={`group rounded-md border transition-colors ${
                selectedId === r.id ? 'border-brass/60 bg-brass/10' : 'border-linesoft bg-steel-900/60 hover:border-faint/50'}`}>
                <div className="flex items-start gap-1 px-1 py-1">
                  <button type="button" onClick={() => onSelect(r.id)} className="min-w-0 flex-1 rounded px-1.5 py-1.5 text-left">
                    <div className="truncate text-sm font-bold text-ink">{r.name}</div>
                    <div className="truncate text-[11px] text-dim">{r.client || 'No client set'}{r.dueDate ? ` · due ${r.dueDate}` : ''}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <StatusChip status={r.status} />
                      <span className="label-caps text-[10px] text-faint">{cov.answered}/{cov.total} answered</span>
                    </div>
                  </button>
                  <button type="button" onClick={() => onRemove(r.id)} aria-label={`Delete response ${r.name}`}
                    className="rounded p-1.5 text-faint opacity-0 hover:text-rust focus:opacity-100 group-hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function PickFromVault({ answers, items, onAdd }) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const results = needle
    ? answers.filter((a) => [a.question, a.answer, a.owner, ...a.tags].join(' ').toLowerCase().includes(needle)).slice(0, 8)
    : [];
  const countIn = (id) => items.filter((it) => it.answerId === id).length;
  return (
    <Panel title="Pick from the vault" icon={Search}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the vault for a matching answer…"
          aria-label="Search vault to add to this response"
          className="w-full rounded-md border border-line bg-steel-900 py-2 pl-8 pr-3 text-sm text-ink outline-none placeholder:text-faint focus:border-brassglow/60" />
      </div>
      {needle && (results.length === 0 ? (
        <p className="mt-3 text-sm text-dim">No matches. Add a blank question below and promote it once you've written the answer.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {results.map((a) => {
            const n = countIn(a.id);
            return (
              <li key={a.id} className="flex items-start justify-between gap-2 rounded-md border border-linesoft bg-steel-900/70 px-2.5 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">{a.question}</div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <FreshBadge date={a.freshnessDate} compact />
                    {n > 0 && <span className="label-caps text-[10px] text-faint">in response ×{n}</span>}
                  </div>
                </div>
                <IconBtn icon={Plus} label={`Add "${a.question}" to this response`} tone="brass" onClick={() => onAdd(a)}>Add</IconBtn>
              </li>
            );
          })}
        </ul>
      ))}
    </Panel>
  );
}

function ResponseDetail({ state, r, onPatch, onAddItem, onAddGap, onPatchItem, onRemoveItem, onMoveItem, onPromoteGap, onOpenAnswer, onCopy, rosterAccounts }) {
  const cov = coverage(r);
  const gaps = r.items.filter((it) => !it.text.trim());
  const md = responseToMarkdown(state, r);
  const hasRoster = Array.isArray(rosterAccounts) && rosterAccounts.length > 0;
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-line bg-steel-800/80 p-4 shadow-raised">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[260px] flex-1 space-y-2">
            <input value={r.name} onChange={(e) => onPatch({ name: e.target.value })} aria-label="RFP name"
              className="font-display block w-full rounded-md border border-linesoft bg-steel-900 px-3 py-2 text-lg font-extrabold text-ink outline-none focus:border-brassglow/60" />
            <div className="flex flex-wrap gap-2">
              <input value={r.client} onChange={(e) => onPatch({ client: e.target.value })} placeholder="Client / prospect" aria-label="Client"
                list={hasRoster ? 'console-roster-accounts' : undefined}
                className="min-w-[160px] flex-1 rounded-md border border-linesoft bg-steel-900 px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brassglow/60" />
              {hasRoster && (
                <datalist id="console-roster-accounts">
                  {rosterAccounts.map((a, i) => a?.name ? <option key={i} value={a.name} /> : null)}
                </datalist>
              )}
              <input type="date" value={r.dueDate} onChange={(e) => onPatch({ dueDate: e.target.value })} aria-label="Due date"
                className="rounded-md border border-linesoft bg-steel-900 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brassglow/60" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5">
              {RESPONSE_STATUSES.map((s) => (
                <button key={s} type="button" onClick={() => onPatch({ status: s })} aria-pressed={r.status === s}
                  className={`label-caps rounded-md border px-2 py-1.5 text-[10px] transition-colors ${
                    r.status === s ? 'border-brass/60 bg-brass/15 text-brass' : 'border-line bg-steel-900 text-dim hover:text-ink'}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex flex-col items-center">
              <HealthDial rate={cov.total ? cov.answered / cov.total : null} size={92} label={`Coverage ${cov.answered} of ${cov.total}`} />
              <span className="label-caps mt-0.5 text-[10px] text-faint">{cov.answered}/{cov.total} answered</span>
            </div>
          </div>
        </div>
        <textarea value={r.notes} onChange={(e) => onPatch({ notes: e.target.value })} rows={2}
          placeholder="Notes on this RFP — evaluation criteria, key stakeholders, why we win…"
          className="mt-3 w-full resize-y rounded-md border border-linesoft bg-steel-900 px-3 py-2 text-sm leading-relaxed text-ink outline-none placeholder:text-faint focus:border-brassglow/60" />
      </div>

      <PickFromVault answers={state.answers} items={r.items} onAdd={onAddItem} />

      {gaps.length > 0 && (
        <Panel title={`Gap list — ${gaps.length} question${gaps.length === 1 ? '' : 's'} unanswered`} icon={AlertTriangle} tone="rust">
          <ul className="space-y-1.5">
            {gaps.map((it) => (
              <li key={it.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-rustdeep/40 bg-rust/5 px-2.5 py-2">
                <span className="text-sm text-ink">{it.question || '(question not entered yet)'}</span>
                <IconBtn icon={Library} label="Promote to vault" tone="brass" onClick={() => onPromoteGap(it)}>Promote to vault</IconBtn>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title={`Response items — ${r.items.length}`} icon={ClipboardList}
        actions={<IconBtn icon={Plus} label="Add a blank question" onClick={onAddGap}>Add question</IconBtn>}>
        {r.items.length === 0 ? (
          <p className="text-sm text-dim">No questions picked yet. Search the vault above, or add a blank question if you want to type this RFP's list first.</p>
        ) : (
          <div className="space-y-3">
            {r.items.map((it, i) => {
              const src = it.answerId ? state.answers.find((a) => a.id === it.answerId) : null;
              const srcStatus = src ? freshnessStatus(src.freshnessDate) : null;
              return (
                <div key={it.id} className="rounded-md border border-linesoft bg-steel-900/70 p-3">
                  <div className="flex items-start gap-2">
                    <span className="label-caps tabular mt-1.5 shrink-0 rounded bg-steel-700 px-1.5 py-0.5 text-[10px] text-dim">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <label className="label-caps text-[10px] text-brass">This RFP's exact wording</label>
                          {src ? (
                            <button type="button" onClick={() => onOpenAnswer(src.id)} className="label-caps text-[10px] text-dim hover:text-brass">
                              from {CATEGORIES.find((c) => c.id === src.category)?.code}-{src.id.slice(-4).toUpperCase()}
                            </button>
                          ) : <span className="label-caps text-[10px] text-faint">custom / no source</span>}
                        </div>
                        <input value={it.question} onChange={(e) => onPatchItem(it.id, { question: e.target.value })}
                          placeholder="Paste the RFP's actual question here…" aria-label="RFP question wording"
                          className="w-full rounded border border-linesoft bg-steel-800 px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brassglow/60" />
                      </div>
                      {srcStatus && (srcStatus === 'stale' || srcStatus === 'aging') && (
                        <div className={`label-caps flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[10px] ${
                          srcStatus === 'stale' ? 'border-rustdeep/50 bg-rust/10 text-rust' : 'border-amberdeep/50 bg-amber/10 text-amber'}`}>
                          <AlertTriangle className="h-3 w-3" aria-hidden /> Source answer is {FRESH_META[srcStatus].label.toLowerCase()} — verify before submitting.
                        </div>
                      )}
                      <div>
                        <label className="label-caps text-[10px] text-dim">Answer for this response</label>
                        <textarea value={it.text} onChange={(e) => onPatchItem(it.id, { text: e.target.value })} rows={3}
                          placeholder="Adapt the canonical answer to this RFP, or draft one from scratch…"
                          className="mt-0.5 w-full resize-y rounded border border-linesoft bg-steel-800 px-2.5 py-1.5 text-sm leading-relaxed text-ink outline-none placeholder:text-faint focus:border-brassglow/60" />
                      </div>
                    </div>
                    <span className="flex shrink-0 flex-col gap-0.5">
                      <button type="button" onClick={() => onMoveItem(i, -1)} disabled={i === 0} aria-label="Move item up"
                        className="rounded p-1 text-dim hover:text-ink disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" aria-hidden /></button>
                      <button type="button" onClick={() => onMoveItem(i, 1)} disabled={i === r.items.length - 1} aria-label="Move item down"
                        className="rounded p-1 text-dim hover:text-ink disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" aria-hidden /></button>
                      <button type="button" onClick={() => onRemoveItem(it.id, `Question removed from ${r.name}`)} aria-label="Remove item"
                        className="rounded p-1 text-dim hover:text-rust"><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="Compiled response" icon={FileText} tone="brass"
        actions={<IconBtn icon={Copy} label="Copy compiled response" tone="brass" onClick={onCopy}>Copy Markdown</IconBtn>}>
        <textarea readOnly value={md} rows={8} aria-label="Compiled response preview"
          className="w-full resize-y rounded-md border border-linesoft bg-steel-900 p-3 font-mono text-[12px] leading-relaxed text-dim outline-none" />
      </Panel>
    </div>
  );
}

/* ================================ copilot ================================ */

function CopilotDrawer({ state, onClose, onNotes, onToast, consoleCtx }) {
  const [responseId, setResponseId] = useState(state.selectedResponseId || state.responses[0]?.id || '');
  const [activeId, setActiveId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const r = state.responses.find((x) => x.id === responseId) || null;
  const active = COPILOT_ACTIONS.find((a) => a.id === activeId) || null;
  const basePrompt = active ? (active.needsResponse ? (r ? active.build(state, r) : '') : active.build(state)) : '';
  const prompt = basePrompt ? consoleContextHeader(consoleCtx) + basePrompt : '';

  const doCopy = async () => {
    if (!prompt) return;
    const ok = await copyText(prompt);
    setCopiedId(ok ? active.id : null);
    onToast(ok ? 'Prompt copied — paste it into claude.ai' : 'Copy failed');
    if (ok) setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-vault/70 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-label="Claude Copilot"
        className="toast-in flex h-full w-full max-w-lg flex-col border-l border-line bg-steel-900 shadow-deck">
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-display flex items-center gap-2 text-base font-extrabold text-ink">
            <Sparkles className="h-4 w-4 text-brass" aria-hidden /> Claude Copilot
          </h2>
          <button type="button" onClick={onClose} aria-label="Close Copilot"
            className="rounded-md border border-line p-1.5 text-dim hover:text-ink"><X className="h-4 w-4" aria-hidden /></button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <p className="text-[13px] leading-relaxed text-dim">
            Each action builds a complete prompt from your vault and the RFP you're assembling. Copy it, paste into{' '}
            <span className="font-semibold text-ink">claude.ai</span> — works with the standard $20 Claude subscription, no API key.
          </p>
          <div>
            <label className="label-caps text-[10px] text-dim" htmlFor="cp-resp">Target RFP</label>
            <select id="cp-resp" value={responseId} onChange={(e) => setResponseId(e.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-steel-800 px-2.5 py-2 text-sm text-ink outline-none focus:border-brassglow/60">
              {state.responses.length === 0 && <option value="">No RFPs yet — start one first</option>}
              {state.responses.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            {COPILOT_ACTIONS.map((a) => {
              const disabled = a.needsResponse && !r;
              const Icon = a.icon;
              return (
                <button key={a.id} type="button" disabled={disabled}
                  onClick={() => setActiveId(a.id === activeId ? null : a.id)} aria-pressed={activeId === a.id}
                  className={`flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors disabled:opacity-40 ${
                    activeId === a.id ? 'border-brass/60 bg-brass/10' : 'border-line bg-steel-800/70 hover:border-faint/50'}`}>
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${activeId === a.id ? 'text-brass' : 'text-dim'}`} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-ink">{a.title}</span>
                    <span className="block text-[12px] leading-snug text-dim">{a.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {active && prompt && (
            <div className="rounded-md border border-line bg-steel-800/70 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="label-caps text-[10px] text-brass">Generated prompt · {prompt.length.toLocaleString()} chars</span>
                <IconBtn icon={copiedId === active.id ? Check : Copy} label="Copy prompt" tone="brass" onClick={doCopy}>
                  {copiedId === active.id ? 'Copied' : 'Copy prompt'}
                </IconBtn>
              </div>
              <textarea readOnly value={prompt} rows={10} aria-label="Generated Copilot prompt"
                className="w-full resize-y rounded border border-linesoft bg-steel-900 p-2.5 font-mono text-[11.5px] leading-relaxed text-dim outline-none" />
              <p className="mt-1.5 text-[11px] text-faint">Paste into claude.ai — works with the standard Claude subscription.</p>
            </div>
          )}
          <div>
            <label className="label-caps text-[10px] text-dim" htmlFor="cp-notes">Debrief notes — paste Claude's answer back (auto-saved)</label>
            <textarea id="cp-notes" value={state.copilotNotes} onChange={(e) => onNotes(e.target.value)} rows={6}
              placeholder="Keep the useful parts of Claude's drafts here before folding them into the vault."
              className="mt-1 w-full resize-y rounded-md border border-line bg-steel-800 px-3 py-2 text-sm leading-relaxed text-ink outline-none placeholder:text-faint focus:border-brassglow/60" />
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ================================ help ================================ */

function HelpContent() {
  const steps = [
    ['Stock the vault', 'Add canonical answers (or Load demo) across the six drawers: Security, Company, Product, Implementation, Pricing, Legal. Each gets a question pattern, an answer, tags, an owner, and a verified date.'],
    ['Search first', 'Use the search bar, drawer clicks, and the Fresh / Aging / Stale filters to find the right answer in seconds, not by scrolling.'],
    ['Start an RFP folder', "Switch to Assemble and create a folder for the RFP you're answering: name, client, due date."],
    ['Pick your questions', "Search the vault from inside the folder and add every answer that applies; edit the question field to match this RFP's exact wording and adapt the answer text to fit."],
    ['Watch the gap list', "Anything left blank drops into the Gap List. Search the vault again, write a fresh answer inline, or promote the question straight into the library once you've drafted it."],
    ['Run Copilot', 'Adapt your attached answers to this RFP\'s phrasing, draft the ones you\'re missing, get a full consistency review, or audit the whole vault for stale entries. Paste Claude\'s reply into Debrief notes.'],
    ['Compile & ship', 'Copy the compiled response as Markdown, print it, or download JSON as a backup. Click "Mark verified today" on any answer you\'ve just confirmed, so staleness warnings stay honest.'],
  ];
  const keys = [
    ['?', 'Open this guide'], ['V', 'Vault view'], ['A', 'Assemble view'], ['C', 'Claude Copilot on/off'],
    ['N', 'New answer (Vault) / new RFP (Assemble)'], ['Ctrl / Cmd + S', 'Copy Markdown of the current view'], ['Esc', 'Close a panel, or back out of an answer'],
  ];
  return (
    <div className="space-y-5">
      <ol className="space-y-3">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="label-caps mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brass/50 bg-brass/10 text-[11px] tabular text-brass">{i + 1}</span>
            <div>
              <div className="text-sm font-bold text-ink">{t}</div>
              <p className="text-[13px] leading-relaxed text-dim">{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <div>
        <h3 className="label-caps mb-2 flex items-center gap-1.5 text-[11px] text-brass"><Keyboard className="h-3.5 w-3.5" aria-hidden /> Keyboard</h3>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {keys.map(([k, d]) => (
            <div key={k} className="flex items-center gap-2 rounded-md border border-linesoft bg-steel-800/60 px-2.5 py-1.5">
              <kbd className="rounded border border-line bg-steel-900 px-1.5 py-0.5 font-mono text-[11px] text-ink">{k}</kbd>
              <span className="text-[12px] text-dim">{d}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[12px] leading-relaxed text-faint">
        Your data never leaves this browser — everything lives in localStorage. Export JSON regularly if the vault matters to you.
      </p>
    </div>
  );
}

/* ================================ print sheet ================================ */

function PrintSheet({ state }) {
  const r = state.responses.find((x) => x.id === state.selectedResponseId) || null;
  if (r) {
    const cov = coverage(r);
    return (
      <div className="print-sheet" aria-hidden>
        <h1>{r.name}</h1>
        <p>Client: {r.client || '—'} · Due: {r.dueDate || '—'} · Status: {r.status} · Coverage {cov.answered}/{cov.total} ({cov.pct}%)</p>
        {r.notes && <p><strong>Notes:</strong> {r.notes}</p>}
        {r.items.map((it, i) => {
          const src = it.answerId ? state.answers.find((a) => a.id === it.answerId) : null;
          const st = src ? freshnessStatus(src.freshnessDate) : null;
          return (
            <div key={it.id} className="ps-item">
              <h2>{i + 1}. {it.question || '(question not entered)'}</h2>
              <p>{it.text.trim() || 'GAP — no answer drafted yet.'}</p>
              {st && (st === 'stale' || st === 'aging') && <p><em>Source answer {FRESH_META[st].label.toLowerCase()} — verified {src.freshnessDate}.</em></p>}
            </div>
          );
        })}
        {r.items.length === 0 && <p>No questions added yet.</p>}
      </div>
    );
  }
  return (
    <div className="print-sheet" aria-hidden>
      <h1>RFP Answer Vault — Library Index</h1>
      <p>{state.answers.length} answers across {CATEGORIES.length} drawers.</p>
      {CATEGORIES.map((cat) => {
        const items = state.answers.filter((a) => a.category === cat.id);
        if (!items.length) return null;
        return (
          <div key={cat.id} className="ps-item">
            <h2>{cat.label}</h2>
            <ul>
              {items.map((a) => <li key={a.id}><strong>{a.question}</strong> — {a.answer || '(no answer written)'}</li>)}
            </ul>
          </div>
        );
      })}
      {state.answers.length === 0 && <p>No answers yet.</p>}
    </div>
  );
}

/* ================================ App ================================ */

export default function App() {
  const consoleCtx = useConsoleBus();
  const [state, setState] = useState(loadState);
  const [view, setView] = useState('vault'); // vault | entry | assemble
  const [openAnswerId, setOpenAnswerId] = useState(null);
  const [helpOpen, setHelpOpen] = useState(() => !loadStateSeen());
  const [resetOpen, setResetOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [freshFilter, setFreshFilter] = useState('all');
  const toastTimer = useRef(null);
  const fileRef = useRef(null);
  const exportRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  function loadStateSeen() { try { return normalize(localStorage.getItem(LS_KEY)).seenGuide; } catch { return false; } }

  const openAnswer = state.answers.find((a) => a.id === openAnswerId) || null;
  const selectedResponse = state.responses.find((r) => r.id === state.selectedResponseId) || null;

  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
    }, 350);
    return () => clearTimeout(t);
  }, [state]);

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
  const patchAnswer = (id, p) => setState((s) => ({
    ...s, answers: s.answers.map((a) => (a.id === id ? { ...a, ...(typeof p === 'function' ? p(a) : p) } : a)),
  }));
  const patchResponse = (id, p) => setState((s) => ({
    ...s, responses: s.responses.map((r) => (r.id === id ? { ...r, ...(typeof p === 'function' ? p(r) : p) } : r)),
  }));
  const patchItem = (responseId, itemId, p) => setState((s) => ({
    ...s, responses: s.responses.map((r) => (r.id !== responseId ? r : { ...r, items: r.items.map((it) => (it.id === itemId ? { ...it, ...p } : it)) })),
  }));

  const addAnswer = () => {
    const a = normAnswer({ category: categoryFilter !== 'all' ? categoryFilter : 'company', freshnessDate: today() });
    setState((s) => ({ ...s, answers: [...s.answers, a] }));
    setOpenAnswerId(a.id); setView('entry');
  };
  const removeAnswer = (id) => {
    const label = state.answers.find((a) => a.id === id)?.question || 'Answer';
    deleteWithUndo(`"${label.slice(0, 40)}${label.length > 40 ? '…' : ''}" removed from the vault`,
      (prev) => ({ ...prev, answers: prev.answers.filter((a) => a.id !== id) }));
    setView('vault'); setOpenAnswerId(null);
  };
  const markVerifiedToday = (id) => { patchAnswer(id, { freshnessDate: today() }); showToast('Marked verified today'); };

  const addResponse = () => {
    const r = normResponse({});
    setState((s) => ({ ...s, responses: [...s.responses, r], selectedResponseId: r.id }));
    setView('assemble');
  };
  const removeResponse = (id) => {
    const label = state.responses.find((r) => r.id === id)?.name || 'Response';
    deleteWithUndo(`"${label}" removed`, (prev) => {
      const responses = prev.responses.filter((r) => r.id !== id);
      return { ...prev, responses, selectedResponseId: prev.selectedResponseId === id ? (responses[0]?.id || null) : prev.selectedResponseId };
    });
  };
  const selectResponse = (id) => patch({ selectedResponseId: id });

  const addItemFromAnswer = (responseId, a) => {
    const item = normResponseItem({ question: a.question, answerId: a.id, text: a.answer });
    patchResponse(responseId, (r) => ({ items: [...r.items, item] }));
    showToast('Added to response');
  };
  const addGapItem = (responseId) => {
    const item = normResponseItem({});
    patchResponse(responseId, (r) => ({ items: [...r.items, item] }));
  };
  const removeItem = (responseId, itemId, label) => {
    deleteWithUndo(label, (prev) => ({
      ...prev, responses: prev.responses.map((r) => (r.id !== responseId ? r : { ...r, items: r.items.filter((it) => it.id !== itemId) })),
    }));
  };
  const moveItem = (responseId, i, d) => {
    patchResponse(responseId, (r) => {
      const j = i + d;
      if (j < 0 || j >= r.items.length) return {};
      const items = r.items.slice();
      [items[i], items[j]] = [items[j], items[i]];
      return { items };
    });
  };
  const promoteGapToVault = (item) => {
    const a = normAnswer({ question: item.question, category: categoryFilter !== 'all' ? categoryFilter : 'company', freshnessDate: today() });
    setState((s) => ({ ...s, answers: [...s.answers, a] }));
    setView('entry'); setOpenAnswerId(a.id);
    showToast('Added to vault — write the canonical answer, then pick it into the response');
  };
  const openAnswerFromAssembler = (id) => { setView('entry'); setOpenAnswerId(id); };

  const closeHelp = () => { setHelpOpen(false); if (!state.seenGuide) patch({ seenGuide: true }); };

  const doCopyMarkdown = async () => {
    let md, label;
    if (view === 'assemble' && selectedResponse) { md = responseToMarkdown(state, selectedResponse); label = `"${selectedResponse.name}" copied as Markdown`; }
    else { md = vaultToMarkdown(state); label = 'Vault library copied as Markdown'; }
    const ok = await copyText(md);
    showToast(ok ? label : 'Copy failed — try Export > Download');
  };
  const doCopyResponse = async (r) => {
    const ok = await copyText(responseToMarkdown(state, r));
    showToast(ok ? `"${r.name}" copied as Markdown` : 'Copy failed');
  };
  const doCopyAnswer = async (a) => {
    const ok = await copyText(answerToMarkdown(a));
    showToast(ok ? 'Answer copied as Markdown' : 'Copy failed');
  };
  const doExportJSON = () => { downloadFile('rfp-answer-vault.json', 'application/json', JSON.stringify(state, null, 2)); setExportOpen(false); };
  const doExportCSV = () => { downloadFile('rfp-answer-vault-library.csv', 'text/csv', vaultToCSV(state.answers)); setExportOpen(false); };
  const doImport = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = normalize(String(reader.result));
        setState((s) => ({ ...next, seenGuide: s.seenGuide || next.seenGuide }));
        showToast('Vault imported — library and RFPs updated');
      } catch { showToast('Import failed — not a valid vault file'); }
    };
    reader.readAsText(f);
    e.target.value = '';
    setExportOpen(false);
  };
  const doLoadDemo = () => {
    setState((s) => ({ ...demoState(), seenGuide: s.seenGuide || true }));
    setView('vault'); setOpenAnswerId(null);
    showToast('Demo vault loaded — 17 answers, 2 RFPs on file');
  };
  const doReset = () => {
    try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
    setState(normalize({ seenGuide: true }));
    setView('vault'); setOpenAnswerId(null); setResetOpen(false);
    showToast('Vault cleared');
  };

  useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if (e.key === 'Escape') {
        if (exportOpen) { setExportOpen(false); return; }
        if (copilotOpen) { setCopilotOpen(false); return; }
        if (helpOpen) { closeHelp(); return; }
        if (resetOpen) { setResetOpen(false); return; }
        if (view === 'entry') { setView('vault'); setOpenAnswerId(null); return; }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); doCopyMarkdown(); return; }
      if (typing) return;
      if (e.key === '?') { e.preventDefault(); setHelpOpen(true); return; }
      if (e.key.toLowerCase() === 'v') { e.preventDefault(); setView('vault'); return; }
      if (e.key.toLowerCase() === 'a') { e.preventDefault(); setView('assemble'); return; }
      if (e.key.toLowerCase() === 'c') { e.preventDefault(); setCopilotOpen((v) => !v); return; }
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); if (view === 'assemble') addResponse(); else addAnswer(); return; }
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
    <div className="steel-grain min-h-screen">
      <div className="app-chrome">
        <header className="sticky top-0 z-40 border-b border-line bg-vault/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Wordmark consoleCtx={consoleCtx} />
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex overflow-hidden rounded-md border border-line">
                <button type="button" onClick={() => setView('vault')} aria-pressed={view === 'vault' || view === 'entry'}
                  className={`label-caps px-3 py-1.5 text-[11px] transition-colors ${
                    view === 'vault' || view === 'entry' ? 'bg-brass/15 text-brass' : 'bg-steel-800/70 text-dim hover:text-ink'}`}>
                  <Archive className="mr-1 inline h-3.5 w-3.5" aria-hidden />Vault
                </button>
                <button type="button" onClick={() => setView('assemble')} aria-pressed={view === 'assemble'}
                  className={`label-caps px-3 py-1.5 text-[11px] transition-colors ${
                    view === 'assemble' ? 'bg-brass/15 text-brass' : 'bg-steel-800/70 text-dim hover:text-ink'}`}>
                  <ClipboardList className="mr-1 inline h-3.5 w-3.5" aria-hidden />Assemble
                </button>
              </div>
              <IconBtn icon={Sparkles} label="Claude Copilot (C)" tone="brass" onClick={() => setCopilotOpen(true)}>Copilot</IconBtn>
              <IconBtn icon={Library} label="Load demo vault" onClick={doLoadDemo}>Load demo</IconBtn>
              <IconBtn icon={HelpCircle} label="How to use (?)" onClick={() => setHelpOpen(true)}>How to use</IconBtn>
              <div className="relative" ref={exportRef}>
                <IconBtn icon={Download} label="Export menu" onClick={() => setExportOpen((v) => !v)} aria-expanded={exportOpen}>Export</IconBtn>
                {exportOpen && (
                  <div className="toast-in absolute right-0 z-50 mt-1.5 w-64 rounded-md border border-line bg-steel-800 p-1.5 shadow-deck">
                    <button type="button" onClick={() => { doCopyMarkdown(); setExportOpen(false); }}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-ink hover:bg-steel-700">
                      <FileText className="h-4 w-4 text-dim" aria-hidden /> Copy Markdown (current view)
                    </button>
                    <button type="button" onClick={doExportJSON}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-ink hover:bg-steel-700">
                      <FileDown className="h-4 w-4 text-dim" aria-hidden /> Download JSON (full state)
                    </button>
                    <button type="button" onClick={doExportCSV}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-ink hover:bg-steel-700">
                      <ClipboardList className="h-4 w-4 text-dim" aria-hidden /> Download library (CSV)
                    </button>
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-ink hover:bg-steel-700">
                      <Upload className="h-4 w-4 text-dim" aria-hidden /> Import JSON…
                    </button>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={doImport} aria-label="Import JSON file" />
              </div>
              <IconBtn icon={RotateCcw} label="Reset all data" onClick={() => setResetOpen(true)} />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-6">
          {view === 'entry' && openAnswer ? (
            <EntryEditor a={openAnswer} usage={usageCount(state, openAnswer.id)}
              onBack={() => { setView('vault'); setOpenAnswerId(null); }}
              onPatch={(p) => patchAnswer(openAnswer.id, p)}
              onRemove={() => removeAnswer(openAnswer.id)}
              onMarkVerified={() => markVerifiedToday(openAnswer.id)}
              onCopy={() => doCopyAnswer(openAnswer)} />
          ) : view === 'assemble' ? (
            <AssembleView state={state} rosterAccounts={consoleCtx?.roster?.accounts}
              onPatchResponse={patchResponse}
              onAddResponse={addResponse}
              onRemoveResponse={removeResponse}
              onSelectResponse={selectResponse}
              onAddItem={addItemFromAnswer}
              onAddGap={addGapItem}
              onPatchItem={patchItem}
              onRemoveItem={removeItem}
              onMoveItem={moveItem}
              onPromoteGap={promoteGapToVault}
              onOpenAnswer={openAnswerFromAssembler}
              onCopyResponse={doCopyResponse} />
          ) : (
            <VaultView state={state} query={query} setQuery={setQuery}
              categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
              freshFilter={freshFilter} setFreshFilter={setFreshFilter}
              onOpen={(id) => { setOpenAnswerId(id); setView('entry'); }}
              onAdd={addAnswer} onLoadDemo={doLoadDemo} />
          )}
        </main>

        {copilotOpen && (
          <CopilotDrawer state={state} onClose={() => setCopilotOpen(false)} onNotes={(v) => patch({ copilotNotes: v })} onToast={showToast} consoleCtx={consoleCtx} />
        )}

        <Modal open={helpOpen} onClose={closeHelp} title="How to run the vault" icon={BookOpen} wide>
          <HelpContent />
        </Modal>

        <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Clear the vault?" icon={AlertTriangle}>
          <p className="text-sm text-dim">This clears every answer, RFP folder, and note from this browser. Download a JSON backup first if you want a fallback copy.</p>
          <div className="mt-4 flex justify-end gap-2">
            <IconBtn label="Cancel" onClick={() => setResetOpen(false)}>Cancel</IconBtn>
            <IconBtn icon={FileDown} label="Download JSON backup" onClick={() => downloadFile('rfp-answer-vault-backup.json', 'application/json', JSON.stringify(state, null, 2))}>Backup first</IconBtn>
            <IconBtn icon={RotateCcw} label="Confirm clear" tone="rust" onClick={doReset}>Clear it</IconBtn>
          </div>
        </Modal>

        {toast && (
          <div className="toast-in fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-md border border-line bg-steel-800 px-4 py-2.5 shadow-deck">
            <span className="text-sm text-ink">{toast.msg}</span>
            {toast.undo && (
              <button type="button" onClick={() => { toast.undo(); setToast(null); }}
                className="label-caps flex items-center gap-1 rounded border border-brass/50 bg-brass/10 px-2 py-1 text-[11px] text-brass hover:bg-brass/20">
                <Undo2 className="h-3 w-3" aria-hidden /> Undo
              </button>
            )}
          </div>
        )}
      </div>

      <PrintSheet state={state} />
    </div>
  );
}
