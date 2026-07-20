import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  FlaskConical, Beaker, Plus, Pencil, Trash2, Pin, Undo2, X, Copy, Download,
  Upload, HelpCircle, RotateCcw, Sparkles, FileText, FileJson, Table2,
  Search, ClipboardPaste, CheckCircle2, AlertTriangle, Scale, BookOpenCheck,
  Mail, UserPlus, Phone, MessageSquare, ChevronDown, ChevronUp, Gavel, Keyboard,
  Link2,
} from 'lucide-react';

/* ================= console bus (BizDev Console Deck link) ================= */

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
    try { window.parent.postMessage({ bizdev: 'ready', v: 1, slug: '16-outreach-ab-journal' }, '*'); } catch {}
    return () => window.removeEventListener('message', onMsg);
  }, []);
  return ctx;
}

/* ================= constants & helpers ================= */

const LS_KEY = 'bizdev:16-outreach-ab-journal:v1';
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

const CHANNELS = {
  email: { label: 'Email', Icon: Mail, tint: '#2b66c4' },
  linkedin: { label: 'LinkedIn', Icon: UserPlus, tint: '#0a66a0' },
  call: { label: 'Call', Icon: Phone, tint: '#2e7d4f' },
  sms: { label: 'SMS', Icon: MessageSquare, tint: '#c77c1e' },
};

const VERDICTS = {
  A: { label: 'A WINS', color: '#2b66c4' },
  B: { label: 'B WINS', color: '#d0432e' },
  flat: { label: 'NO DIFFERENCE', color: '#5b6572' },
  inconclusive: { label: 'INCONCLUSIVE', color: '#c77c1e' },
};

const fmtPct = (x, digits = 1) =>
  x == null || !isFinite(x) ? '—' : (x * 100).toFixed(digits) + '%';

/* Wilson 95% score interval — honest small-sample bounds */
function wilson(k, n) {
  if (!n || n <= 0) return null;
  const z = 1.96, p = k / n, z2 = z * z;
  const den = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / den;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / den;
  return { p, lo: Math.max(0, center - half), hi: Math.min(1, center + half) };
}

/* two-proportion z test */
function zTest(kA, nA, kB, nB) {
  if (!nA || !nB) return null;
  const pooled = (kA + kB) / (nA + nB);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB));
  if (se === 0) return 0;
  return (kB / nB - kA / nA) / se;
}

/* the honesty engine: what can this sample actually claim? */
function readResult(ex) {
  const A = ex.variants.A, B = ex.variants.B;
  const wA = wilson(A.replies, A.sent), wB = wilson(B.replies, B.sent);
  const z = zTest(A.replies, A.sent, B.replies, B.sent);
  const minN = Math.min(A.sent || 0, B.sent || 0);
  const totalReplies = (A.replies || 0) + (B.replies || 0);
  const lead = wA && wB ? (wB.p === wA.p ? null : wB.p > wA.p ? 'B' : 'A') : null;
  const lift = wA && wB && wA.p > 0 ? (wB.p - wA.p) / wA.p : null;

  let tone, verdictLine, detail;
  if (!wA || !wB) {
    tone = 'idle'; verdictLine = 'Awaiting sends';
    detail = 'Log sends for both arms before reading anything into this.';
  } else if (minN < 20) {
    tone = 'warn'; verdictLine = 'Sample too small to call';
    detail = `Only ${minN} sends in the thinner arm. Under ~20 per arm, reply rates are mostly noise — keep sending.`;
  } else if (totalReplies < 8) {
    tone = 'warn'; verdictLine = 'Too few replies to trust the rates';
    detail = `${totalReplies} total replies. Rare events swing hard; wait for at least 8–10 replies across arms.`;
  } else if (Math.abs(z) >= 2.58) {
    tone = 'strong'; verdictLine = `${lead} is clearly ahead (~99% confidence)`;
    detail = `z = ${z.toFixed(2)}. The intervals barely overlap — this one is real. Ship the winner and iterate.`;
  } else if (Math.abs(z) >= 1.96) {
    tone = 'good'; verdictLine = `${lead} is ahead (~95% confidence)`;
    detail = `z = ${z.toFixed(2)}. Statistically significant at the usual bar. Safe to call, better with one more batch.`;
  } else if (Math.abs(z) >= 1.28) {
    tone = 'lean'; verdictLine = `Directional lean toward ${lead} (~80%)`;
    detail = `z = ${z.toFixed(2)}. A hint, not a verdict. One more send batch per arm would settle it.`;
  } else {
    tone = 'flat'; verdictLine = 'No real difference yet';
    detail = `z = ${(z || 0).toFixed(2)}. The intervals sit on top of each other. Either arms are equivalent, or you need bolder variants.`;
  }
  return { wA, wB, z, minN, totalReplies, lead, lift, tone, verdictLine, detail };
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

const blankVariant = (v) => ({
  name: v ? String(v.name ?? '') : '',
  copy: v ? String(v.copy ?? '') : '',
  sent: Math.max(0, Math.round(Number(v?.sent) || 0)),
  replies: Math.max(0, Math.round(Number(v?.replies) || 0)),
  meetings: Math.max(0, Math.round(Number(v?.meetings) || 0)),
});

function normExperiment(e, i) {
  if (!e || typeof e !== 'object') e = {};
  return {
    id: typeof e.id === 'string' ? e.id : uid(),
    code: typeof e.code === 'string' && e.code ? e.code : `EXP-${String(i + 1).padStart(3, '0')}`,
    title: String(e.title ?? 'Untitled experiment'),
    hypothesis: String(e.hypothesis ?? ''),
    channel: CHANNELS[e.channel] ? e.channel : 'email',
    audience: String(e.audience ?? ''),
    started: String(e.started ?? new Date().toISOString().slice(0, 10)),
    status: e.status === 'concluded' ? 'concluded' : 'running',
    verdict: VERDICTS[e.verdict] ? e.verdict : '',
    learning: String(e.learning ?? ''),
    variants: {
      A: blankVariant(e.variants?.A),
      B: blankVariant(e.variants?.B),
    },
  };
}

function normalize(raw) {
  let d = raw;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { d = null; } }
  if (!d || typeof d !== 'object') d = {};
  return {
    version: 1,
    seenGuide: !!d.seenGuide,
    experiments: Array.isArray(d.experiments) ? d.experiments.map(normExperiment) : [],
    insights: Array.isArray(d.insights)
      ? d.insights.filter((x) => x && typeof x === 'object').map((x) => ({
          id: typeof x.id === 'string' ? x.id : uid(),
          text: String(x.text ?? ''),
          tag: String(x.tag ?? 'pattern'),
          source: String(x.source ?? ''),
          date: String(x.date ?? new Date().toISOString().slice(0, 10)),
        }))
      : [],
    copilotNotes: String(d.copilotNotes ?? ''),
  };
}

/* ================= demo scenario ================= */

const DEMO = normalize({
  seenGuide: true,
  experiments: [
    {
      code: 'EXP-001', channel: 'email', started: '2026-06-02', status: 'concluded', verdict: 'B',
      title: 'Subject line: curiosity vs. named metric',
      hypothesis: 'A specific, quantified subject will out-pull a vague curiosity hook with ops leaders.',
      audience: 'Heads of RevOps, 50–200 person B2B SaaS, US/EU',
      learning: 'Specificity beat curiosity 2.7x. Naming the metric ("12% more demos") did the qualifying for us — replies were warmer, not just more frequent.',
      variants: {
        A: { name: 'Curiosity hook', sent: 120, replies: 7, meetings: 1, copy: 'Subject: quick question\n\nHi {{first}}, quick question about how {{company}} handles outbound reporting — got 30 seconds?' },
        B: { name: 'Named metric', sent: 118, replies: 19, meetings: 6, copy: 'Subject: {{company}} + 12% more demos booked\n\nHi {{first}} — we got Fathom 12% more demos booked in 6 weeks by fixing one reporting gap. Worth showing you the before/after?' },
      },
    },
    {
      code: 'EXP-002', channel: 'linkedin', started: '2026-07-06', status: 'running', verdict: '',
      title: 'Connection note: compliment vs. trigger event',
      hypothesis: 'Referencing a hiring trigger will beat a generic content compliment for accept-then-reply.',
      audience: 'VP Sales at companies that posted an SDR role in the last 30 days',
      learning: '',
      variants: {
        A: { name: 'Content compliment', sent: 34, replies: 5, meetings: 1, copy: 'Loved your post on pipeline math, {{first}} — the CAC section especially. Would enjoy having you in my feed.' },
        B: { name: 'Hiring trigger', sent: 31, replies: 8, meetings: 2, copy: 'Saw {{company}} is hiring SDRs — usually means outbound is scaling. I collect what is working in {{industry}} outreach; happy to trade notes.' },
      },
    },
    {
      code: 'EXP-003', channel: 'email', started: '2026-06-16', status: 'concluded', verdict: 'B',
      title: 'CTA: meeting ask vs. interest ask',
      hypothesis: 'A low-friction interest CTA will out-reply a direct 30-minute meeting ask on first touch.',
      audience: 'Founders, bootstrapped agencies 5–30 seats',
      learning: 'Interest CTAs ("worth a look?") more than doubled replies AND still produced more meetings. The meeting ask converted better per reply, but starved the top of the funnel.',
      variants: {
        A: { name: 'Direct meeting ask', sent: 95, replies: 6, meetings: 2, copy: '...if that resonates, do you have 30 minutes Thursday or Friday for a walkthrough?' },
        B: { name: 'Interest ask', sent: 97, replies: 14, meetings: 5, copy: '...if that resonates, worth a look? I can send the 2-minute teardown first — no call needed.' },
      },
    },
    {
      code: 'EXP-004', channel: 'call', started: '2026-07-13', status: 'running', verdict: '',
      title: 'Voicemail vs. no voicemail before the email',
      hypothesis: 'A 20-second voicemail naming the follow-up email will lift that email’s reply rate.',
      audience: 'Ops managers, logistics firms, tier-1 list',
      learning: '',
      variants: {
        A: { name: 'No voicemail', sent: 14, replies: 1, meetings: 0, copy: 'Cold call, no voicemail. Email follows within 10 minutes regardless.' },
        B: { name: '20s voicemail', sent: 16, replies: 3, meetings: 1, copy: 'Voicemail: "Hi {{first}}, Dana from Meridian — just sent you an email titled ‘dock scheduling’ with a 40-second idea. No need to call back."' },
      },
    },
    {
      code: 'EXP-005', channel: 'email', started: '2026-05-19', status: 'concluded', verdict: 'flat',
      title: 'Body length: 120 words vs. 55 words',
      hypothesis: 'Halving the body will raise replies without hurting meeting quality.',
      audience: 'Marketing directors, e-commerce $5–50M GMV',
      learning: 'Length alone moved nothing — the intervals sat on top of each other. What we cut mattered more than how much: the personalized first line was the only load-bearing sentence.',
      variants: {
        A: { name: '120-word body', sent: 80, replies: 9, meetings: 3, copy: 'Full framework email: personalized line, problem story, 3-bullet proof, CTA. ~120 words.' },
        B: { name: '55-word body', sent: 82, replies: 11, meetings: 3, copy: 'Compressed: personalized line, one-sentence claim, single proof point, CTA. ~55 words.' },
      },
    },
    {
      code: 'EXP-006', channel: 'sms', started: '2026-07-17', status: 'running', verdict: '',
      title: 'Follow-up timing: day 2 vs. day 5',
      hypothesis: 'A day-5 SMS bump will feel less pushy and reply better than day 2 after no email response.',
      audience: 'Opted-in webinar registrants who ghosted the recap email',
      learning: '',
      variants: {
        A: { name: 'Day-2 bump', sent: 22, replies: 2, meetings: 0, copy: '{{first}} — Dana here. Sent the teardown Tuesday; want me to resend or drop it?' },
        B: { name: 'Day-5 bump', sent: 19, replies: 4, meetings: 1, copy: '{{first}} — no rush on the teardown from last week. If timing is off, one word ("later") parks it till Q4.' },
      },
    },
  ],
  insights: [
    { text: 'Name the metric in the subject line. Specificity out-pulled curiosity 2.7x and pre-qualified the replies.', tag: 'subject lines', source: 'EXP-001', date: '2026-06-14' },
    { text: 'On first touch, ask for interest, not 30 minutes. Interest CTAs doubled replies and still won on meetings.', tag: 'CTAs', source: 'EXP-003', date: '2026-06-30' },
    { text: 'The personalized first line is the only load-bearing sentence. Cut anything else before you cut it.', tag: 'copy', source: 'EXP-005', date: '2026-06-03' },
    { text: 'Under ~20 sends per arm, call nothing. We reversed two "winners" after the sample grew.', tag: 'method', source: '', date: '2026-05-28' },
  ],
  copilotNotes: '',
});

/* ================= markdown / csv serializers ================= */

function experimentMd(ex) {
  const r = readResult(ex);
  const row = (k, v) => `| ${k} | ${v.name || '—'} | ${v.sent} | ${v.replies} | ${fmtPct(v.sent ? v.replies / v.sent : null)} | ${v.meetings} |`;
  return [
    `### ${ex.code} — ${ex.title}`,
    ``,
    `- **Channel:** ${CHANNELS[ex.channel].label} · **Started:** ${ex.started} · **Status:** ${ex.status}${ex.verdict ? ` · **Verdict:** ${VERDICTS[ex.verdict].label}` : ''}`,
    ex.audience ? `- **Audience:** ${ex.audience}` : null,
    ex.hypothesis ? `- **Hypothesis:** ${ex.hypothesis}` : null,
    ``,
    `| Arm | Variant | Sent | Replies | Reply rate | Meetings |`,
    `|---|---|---|---|---|---|`,
    row('A', ex.variants.A),
    row('B', ex.variants.B),
    ``,
    `**Read:** ${r.verdictLine}. ${r.detail}`,
    ex.variants.A.copy ? `\n**Variant A copy:**\n\n> ${ex.variants.A.copy.replace(/\n/g, '\n> ')}` : null,
    ex.variants.B.copy ? `\n**Variant B copy:**\n\n> ${ex.variants.B.copy.replace(/\n/g, '\n> ')}` : null,
    ex.learning ? `\n**Learning:** ${ex.learning}` : null,
  ].filter(Boolean).join('\n');
}

function journalMd(state) {
  const done = state.experiments.filter((e) => e.status === 'concluded');
  return [
    `# Outreach A/B Journal`,
    ``,
    `_${state.experiments.length} experiments · ${done.length} concluded · exported ${new Date().toISOString().slice(0, 10)}_`,
    ``,
    `## Proven patterns (insight board)`,
    ``,
    state.insights.length
      ? state.insights.map((i) => `- **[${i.tag}]** ${i.text}${i.source ? ` _(from ${i.source})_` : ''}`).join('\n')
      : `_No pinned insights yet._`,
    ``,
    `## Experiment log`,
    ``,
    state.experiments.map(experimentMd).join('\n\n---\n\n'),
  ].join('\n');
}

function journalCsv(state) {
  const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const rows = [['code', 'title', 'channel', 'status', 'verdict', 'arm', 'variant', 'sent', 'replies', 'reply_rate', 'meetings'].join(',')];
  for (const ex of state.experiments) for (const arm of ['A', 'B']) {
    const v = ex.variants[arm];
    rows.push([esc(ex.code), esc(ex.title), ex.channel, ex.status, ex.verdict || '', arm, esc(v.name),
      v.sent, v.replies, v.sent ? (v.replies / v.sent).toFixed(4) : '', v.meetings].join(','));
  }
  return rows.join('\n');
}

/* ================= copilot prompts ================= */

function promptNextTest(state) {
  return [
    `You are a senior outbound experimentation scientist. You design A/B tests for cold outreach the way a lab designs trials: one variable, a falsifiable hypothesis, and a pre-committed sample size.`,
    ``,
    `Here is my experiment journal so far:`,
    ``,
    journalMd(state),
    ``,
    `## Your task`,
    `Design my SINGLE best next A/B test. Build on what is proven, attack the biggest open question, and do not re-test settled patterns.`,
    ``,
    `## Output format`,
    `1. **Hypothesis** — one falsifiable sentence.`,
    `2. **Variable under test** — exactly one; say what is held constant.`,
    `3. **Variant A and Variant B** — full ready-to-send copy for my channel, merge fields like {{first}}/{{company}} allowed.`,
    `4. **Sample size** — sends per arm needed to detect a realistic lift from my current base rate, and how many days that takes at my volume (ask me if unknown).`,
    `5. **Decision rule** — what result ships A, ships B, or kills both.`,
    `6. **What we learn either way.**`,
  ].join('\n');
}

function promptExplain(state, ex) {
  const r = readResult(ex);
  return [
    `You are a direct-response copy analyst and statistician. I ran a cold-outreach A/B test and I want to understand WHY it turned out this way — mechanism, not vibes.`,
    ``,
    experimentMd(ex),
    ``,
    `Computed stats: z = ${r.z == null ? 'n/a' : r.z.toFixed(2)}; A 95% CI ${r.wA ? `${fmtPct(r.wA.lo)}–${fmtPct(r.wA.hi)}` : 'n/a'}; B 95% CI ${r.wB ? `${fmtPct(r.wB.lo)}–${fmtPct(r.wB.hi)}` : 'n/a'}; app read: "${r.verdictLine}".`,
    ``,
    `## Your task`,
    `1. **Verdict check** — is my sample big enough to believe this result? Be blunt.`,
    `2. **Mechanism** — line-by-line, what in the winning copy plausibly caused the difference (psychology, specificity, friction, framing)?`,
    `3. **Confounds** — list anything other than the copy that could explain the gap (list quality, timing, deliverability).`,
    `4. **Next iteration** — one follow-up test that isolates the mechanism you believe most.`,
    ``,
    `Format as short sections with those four headings. No hedging filler.`,
  ].join('\n');
}

function promptPlaybook(state) {
  const done = state.experiments.filter((e) => e.status === 'concluded');
  return [
    `You are a revenue operations writer. Turn my raw A/B test journal into a crisp internal playbook my whole team can follow without reading the experiments.`,
    ``,
    `## Concluded experiments`,
    ``,
    done.length ? done.map(experimentMd).join('\n\n---\n\n') : '_None concluded yet — say so and stop._',
    ``,
    `## Pinned insights`,
    state.insights.map((i) => `- [${i.tag}] ${i.text}${i.source ? ` (from ${i.source})` : ''}`).join('\n') || '_None._',
    ``,
    `## Your task`,
    `Write "Outreach Playbook v1" in markdown:`,
    `1. **Rules we follow** — numbered, imperative, each citing the experiment code that earned it.`,
    `2. **Do / Don't table** — concrete phrasings, not abstractions.`,
    `3. **Message templates** — one per channel I use, assembled from winning patterns, with merge fields.`,
    `4. **Open questions** — what the journal has NOT settled yet, ranked by likely impact.`,
    `Keep it under a page. Confidence must match the evidence — flag any rule built on thin samples.`,
  ].join('\n');
}

/* console context header, prepended to Claude Copilot prompts when linked to the Console Deck */
function consoleContextHeader(consoleCtx) {
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
    lines.push(`- My name / voice: ${[claude.userName, claude.voiceNotes].filter(Boolean).join(' — ')}`);
  }
  if (Array.isArray(roster.accounts) && roster.accounts.length) {
    const accts = roster.accounts.slice(0, 12)
      .map((a) => (a.segment ? `${a.name} (${a.segment})` : a.name))
      .join(', ');
    if (accts) lines.push(`- Accounts on file: ${accts}`);
  }
  if (!lines.length) return '';
  return [`## Shared context (from BizDev Console)`, ...lines].join('\n');
}

function withConsoleContext(promptText, consoleCtx) {
  const header = consoleContextHeader(consoleCtx);
  return header ? `${header}\n\n${promptText}` : promptText;
}

/* ================= small components ================= */

function Btn({ children, onClick, kind = 'ghost', title, ariaLabel, className = '', disabled }) {
  const kinds = {
    primary: 'bg-inkdark text-paper hover:bg-ink shadow-[2px_2px_0_rgba(28,37,48,0.25)]',
    accent: 'bg-hilite text-inkdark hover:brightness-95 shadow-[2px_2px_0_rgba(28,37,48,0.3)] font-semibold',
    ghost: 'bg-card/80 text-ink border border-rule hover:border-pencil hover:bg-card',
    danger: 'bg-card/80 text-margin border border-margin/40 hover:bg-margin/10',
  };
  return (
    <button type="button" onClick={onClick} title={title} aria-label={ariaLabel} disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-40 ${kinds[kind]} ${className}`}>
      {children}
    </button>
  );
}

function SpecTag({ children, color = '#5b6572' }) {
  return (
    <span className="specimen-label inline-flex items-center rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ borderColor: color + '66', color, background: color + '0d' }}>
      {children}
    </span>
  );
}

/* horizontal A/B rate bars with Wilson CI whiskers */
function RateChart({ ex }) {
  const r = readResult(ex);
  if (!r.wA && !r.wB) return null;
  const max = Math.max(0.08, (r.wA?.hi || 0) * 1.2, (r.wB?.hi || 0) * 1.2);
  const W = 560, H = 108, L = 64, R = 16, plotW = W - L - R;
  const x = (v) => L + (v / max) * plotW;
  const step = max > 0.3 ? 0.1 : max > 0.12 ? 0.05 : 0.02;
  const ticks = [];
  for (let t = 0; t <= max + 1e-9; t += step) ticks.push(t);
  const bar = (w, y, color, label) => w && (
    <g key={label}>
      <text x={L - 10} y={y + 5} textAnchor="end" className="font-mono" fontSize="12" fontWeight="600" fill={color}>{label}</text>
      <rect x={L} y={y - 7} width={Math.max(2, x(w.p) - L)} height={14} rx={2} fill={color} opacity="0.85" />
      <line x1={x(w.lo)} x2={x(w.hi)} y1={y} y2={y} stroke={color} strokeWidth="1.5" />
      <line x1={x(w.lo)} x2={x(w.lo)} y1={y - 5} y2={y + 5} stroke={color} strokeWidth="1.5" />
      <line x1={x(w.hi)} x2={x(w.hi)} y1={y - 5} y2={y + 5} stroke={color} strokeWidth="1.5" />
      <text x={Math.min(x(w.hi) + 6, W - 4)} y={y + 4} className="font-mono" fontSize="11" fill="#1c2530">{fmtPct(w.p)}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label={`Reply rates: A ${fmtPct(r.wA?.p)} vs B ${fmtPct(r.wB?.p)} with 95% confidence intervals`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={14} y2={H - 22} stroke="#b9c9da" strokeWidth="1" strokeDasharray="2 3" />
          <text x={x(t)} y={H - 8} textAnchor="middle" className="font-mono" fontSize="10" fill="#8b93a0">{Math.round(t * 100)}%</text>
        </g>
      ))}
      {bar(r.wA, 34, '#2b66c4', 'A')}
      {bar(r.wB, 68, '#d0432e', 'B')}
    </svg>
  );
}

/* signature hero: two separated bell curves on graph paper */
function HeroFigure({ experiments }) {
  const gauss = (mu, sig, amp) => {
    const pts = [];
    for (let i = 0; i <= 72; i++) {
      const xx = i / 72;
      pts.push(`${(20 + xx * 300).toFixed(1)},${(128 - amp * Math.exp(-((xx - mu) ** 2) / (2 * sig * sig))).toFixed(1)}`);
    }
    return pts.join(' ');
  };
  return (
    <svg viewBox="0 0 340 168" className="w-full max-w-[380px]" role="img"
      aria-label="Figure 1: two reply-rate distributions separating as the sample grows">
      <defs>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#c77c1e" strokeWidth="1.4" />
        </pattern>
      </defs>
      {Array.from({ length: 9 }, (_, i) => (
        <line key={'h' + i} x1="20" x2="320" y1={20 + i * 13.5} y2={20 + i * 13.5} stroke="#b9c9da" strokeWidth="0.6" opacity="0.7" />
      ))}
      {Array.from({ length: 16 }, (_, i) => (
        <line key={'v' + i} y1="20" y2="128" x1={20 + i * 20} x2={20 + i * 20} stroke="#b9c9da" strokeWidth="0.6" opacity="0.7" />
      ))}
      <line x1="20" y1="128" x2="320" y2="128" stroke="#1c2530" strokeWidth="1.5" />
      <line x1="20" y1="20" x2="20" y2="128" stroke="#1c2530" strokeWidth="1.5" />
      <polygon points={`${gauss(0.42, 0.13, 78)} 320,128 20,128`} fill="url(#hatch)" opacity="0.25" />
      <polyline points={gauss(0.42, 0.13, 78)} fill="none" stroke="#2b66c4" strokeWidth="2.2" />
      <polyline points={gauss(0.66, 0.1, 96)} fill="none" stroke="#d0432e" strokeWidth="2.2" />
      <circle cx={20 + 0.42 * 300} cy={128 - 78} r="3" fill="#2b66c4" />
      <circle cx={20 + 0.66 * 300} cy={128 - 96} r="3" fill="#d0432e" />
      <text x={20 + 0.42 * 300} y={128 - 86} textAnchor="middle" className="font-mono" fontSize="12" fontWeight="600" fill="#2b66c4">A</text>
      <text x={20 + 0.66 * 300} y={128 - 104} textAnchor="middle" className="font-mono" fontSize="12" fontWeight="600" fill="#d0432e">B</text>
      <text x="196" y="70" fontSize="15" fill="#c77c1e" style={{ fontFamily: 'Caveat, cursive' }} transform="rotate(-6 196 70)">separation = signal</text>
      <text x="20" y="146" className="font-mono" fontSize="9" letterSpacing="2" fill="#8b93a0">FIG. 1 — REPLY-RATE DISTRIBUTIONS, {Math.max(1, experiments.length)} TRIALS LOGGED</text>
      <text x="320" y="16" textAnchor="end" fontSize="15" fill="#5b6572" style={{ fontFamily: 'Caveat, cursive' }}>n changes everything →</text>
    </svg>
  );
}

function Sparkline({ series }) {
  if (series.length < 2) return <span className="font-mono text-[10px] text-faint">need 2+ trials</span>;
  const W = 120, H = 30, max = Math.max(...series, 0.02);
  const pts = series.map((v, i) => `${(i / (series.length - 1)) * (W - 8) + 4},${H - 4 - (v / max) * (H - 10)}`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[30px] w-[120px]" role="img" aria-label="Reply rate per experiment over time">
      <polyline points={pts.join(' ')} fill="none" stroke="#2b66c4" strokeWidth="1.8" />
      {pts.map((p, i) => {
        const [cx, cy] = p.split(',');
        return <circle key={i} cx={cx} cy={cy} r={i === pts.length - 1 ? 2.6 : 1.6} fill={i === pts.length - 1 ? '#d0432e' : '#2b66c4'} />;
      })}
    </svg>
  );
}

/* ================= editor drawer ================= */

const emptyDraft = () => normExperiment({ title: '', started: new Date().toISOString().slice(0, 10) }, 998);

function VariantFields({ arm, v, onChange, color }) {
  const num = (field) => (e) => onChange({ ...v, [field]: Math.max(0, Math.round(Number(e.target.value) || 0)) });
  return (
    <fieldset className="rounded-sm border p-3" style={{ borderColor: color + '55' }}>
      <legend className="specimen-label px-1 text-[11px] font-bold" style={{ color }}>Variant {arm}</legend>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-pencil">Name
        <input value={v.name} onChange={(e) => onChange({ ...v, name: e.target.value })} placeholder={arm === 'A' ? 'e.g. Curiosity hook (control)' : 'e.g. Named metric (challenger)'}
          className="mt-1 w-full rounded-sm border border-rule bg-card px-2 py-1.5 font-mono text-[13px]" />
      </label>
      <label className="mt-2 block text-[11px] font-semibold uppercase tracking-wider text-pencil">Message copy
        <textarea value={v.copy} onChange={(e) => onChange({ ...v, copy: e.target.value })} rows={4} placeholder="Paste the exact message. Merge fields like {{first}} welcome."
          className="mt-1 w-full resize-y rounded-sm border border-rule bg-card px-2 py-1.5 font-mono text-[12.5px] leading-relaxed" />
      </label>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {['sent', 'replies', 'meetings'].map((f) => (
          <label key={f} className="block text-[11px] font-semibold uppercase tracking-wider text-pencil">{f}
            <input type="number" min="0" value={v[f]} onChange={num(f)}
              className="mt-1 w-full rounded-sm border border-rule bg-card px-2 py-1.5 font-mono text-[13px]" />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function EditorDrawer({ draft, setDraft, onSave, onClose, consoleCtx }) {
  const rosterAccounts = consoleCtx?.roster?.accounts;
  return (
    <div role="dialog" aria-modal="true" aria-label={draft.id ? 'Edit experiment' : 'New experiment'}
      className="fixed inset-0 z-40 flex justify-end bg-inkdark/45" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pop-in h-full w-full max-w-xl overflow-y-auto border-l-4 border-hilite bg-paper p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="specimen-label text-sm font-bold text-ink">
            {draft.id ? `Edit ${draft.code}` : 'Log a new experiment'}
          </h2>
          <Btn kind="ghost" onClick={onClose} ariaLabel="Close editor"><X className="h-4 w-4" aria-hidden /></Btn>
        </div>
        <div className="mt-4 space-y-3">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-pencil">Experiment title
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Subject line: curiosity vs. named metric"
              className="mt-1 w-full rounded-sm border border-rule bg-card px-2 py-2 text-[15px] font-semibold" />
          </label>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-pencil">Hypothesis (falsifiable)
            <textarea value={draft.hypothesis} onChange={(e) => setDraft({ ...draft, hypothesis: e.target.value })} rows={2}
              placeholder="We believe B will beat A because…"
              className="mt-1 w-full resize-y rounded-sm border border-rule bg-card px-2 py-1.5 text-[13px]" />
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-pencil">Channel
              <select value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value })}
                className="mt-1 w-full rounded-sm border border-rule bg-card px-2 py-1.5 font-mono text-[13px]">
                {Object.entries(CHANNELS).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
              </select>
            </label>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-pencil">Started
              <input type="date" value={draft.started} onChange={(e) => setDraft({ ...draft, started: e.target.value })}
                className="mt-1 w-full rounded-sm border border-rule bg-card px-2 py-1.5 font-mono text-[13px]" />
            </label>
            <label className="col-span-2 block text-[11px] font-semibold uppercase tracking-wider text-pencil sm:col-span-1">Status
              <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                className="mt-1 w-full rounded-sm border border-rule bg-card px-2 py-1.5 font-mono text-[13px]">
                <option value="running">running</option><option value="concluded">concluded</option>
              </select>
            </label>
          </div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-pencil">Audience / segment
            <input value={draft.audience} onChange={(e) => setDraft({ ...draft, audience: e.target.value })} placeholder="Who exactly received this?"
              className="mt-1 w-full rounded-sm border border-rule bg-card px-2 py-1.5 text-[13px]" />
          </label>
          {Array.isArray(rosterAccounts) && rosterAccounts.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-pencil" aria-hidden />
              <select value="" onChange={(e) => {
                const acc = rosterAccounts.find((a) => a.name === e.target.value);
                if (acc) setDraft({ ...draft, audience: acc.segment ? `${acc.name} (${acc.segment})` : acc.name });
              }} aria-label="Pull audience from console roster"
                className="w-full rounded-sm border border-rule bg-card px-2 py-1 font-mono text-[11px] text-pencil">
                <option value="">Pull from console roster…</option>
                {rosterAccounts.map((a) => (
                  <option key={a.name} value={a.name}>{a.segment ? `${a.name} (${a.segment})` : a.name}</option>
                ))}
              </select>
            </div>
          )}
          <VariantFields arm="A" color="#2b66c4" v={draft.variants.A} onChange={(A) => setDraft({ ...draft, variants: { ...draft.variants, A } })} />
          <VariantFields arm="B" color="#d0432e" v={draft.variants.B} onChange={(B) => setDraft({ ...draft, variants: { ...draft.variants, B } })} />
          <div className="flex justify-end gap-2 pb-6 pt-2">
            <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
            <Btn kind="primary" onClick={onSave}><CheckCircle2 className="h-4 w-4" aria-hidden /> Save entry</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= experiment card ================= */

function ExperimentCard({ ex, onEdit, onDelete, onBump, onConclude, onPin, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [concluding, setConcluding] = useState(false);
  const [verdict, setVerdict] = useState(ex.verdict || 'B');
  const [learning, setLearning] = useState(ex.learning);
  const r = readResult(ex);
  const ch = CHANNELS[ex.channel];
  const toneStyle = {
    idle: { color: '#8b93a0', bg: '#8b93a01a', Icon: Beaker },
    warn: { color: '#c77c1e', bg: '#c77c1e14', Icon: AlertTriangle },
    lean: { color: '#c77c1e', bg: '#c77c1e14', Icon: Scale },
    flat: { color: '#5b6572', bg: '#5b65721a', Icon: Scale },
    good: { color: '#2e7d4f', bg: '#2e7d4f14', Icon: CheckCircle2 },
    strong: { color: '#2e7d4f', bg: '#2e7d4f1f', Icon: CheckCircle2 },
  }[r.tone];

  return (
    <article className="entry-card tape relative rounded-sm border border-rule/80 p-4 pt-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <SpecTag color={ch.tint}><ch.Icon className="mr-1 inline h-3 w-3" aria-hidden />{ch.label}</SpecTag>
          <span className="specimen-label text-[11px] font-bold text-pencil">{ex.code}</span>
          <span className="font-mono text-[11px] text-faint">{ex.started}</span>
          {ex.status === 'concluded' && ex.verdict ? (
            <span className="stamp px-1.5 py-0.5 text-[10px] font-bold" style={{ color: VERDICTS[ex.verdict].color }}>
              {VERDICTS[ex.verdict].label}
            </span>
          ) : (
            <SpecTag color="#2b66c4">running</SpecTag>
          )}
        </div>
        <div className="no-print flex gap-1">
          <Btn kind="ghost" onClick={() => setOpen(!open)} ariaLabel={open ? 'Collapse entry' : 'Expand entry'} className="!px-1.5">
            {open ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
          </Btn>
          <Btn kind="ghost" onClick={onEdit} ariaLabel={`Edit ${ex.code}`} className="!px-1.5"><Pencil className="h-4 w-4" aria-hidden /></Btn>
          <Btn kind="danger" onClick={onDelete} ariaLabel={`Delete ${ex.code}`} className="!px-1.5"><Trash2 className="h-4 w-4" aria-hidden /></Btn>
        </div>
      </header>

      <h3 className="mt-2 text-[17px] font-extrabold leading-snug tracking-tight">{ex.title}</h3>
      {ex.hypothesis && <p className="font-hand mt-0.5 text-[17px] leading-tight text-pencil">H: {ex.hypothesis}</p>}
      {ex.audience && <p className="mt-1 font-mono text-[11px] text-faint">n-source: {ex.audience}</p>}

      <div className="mt-3"><RateChart ex={ex} /></div>

      <div className="mt-2 flex items-start gap-2 rounded-sm border px-3 py-2"
        style={{ borderColor: toneStyle.color + '44', background: toneStyle.bg }}>
        <toneStyle.Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: toneStyle.color }} aria-hidden />
        <div>
          <p className="text-[13px] font-bold" style={{ color: toneStyle.color }}>{r.verdictLine}
            {r.lift != null && r.minN >= 20 && isFinite(r.lift) && r.lift !== 0 && (
              <span className="ml-2 font-mono text-[11px] font-semibold">({r.lift > 0 ? '+' : ''}{(r.lift * 100).toFixed(0)}% lift B vs A)</span>
            )}
          </p>
          <p className="text-[12px] leading-snug text-pencil">{r.detail}</p>
        </div>
      </div>

      {open && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {['A', 'B'].map((arm) => {
            const v = ex.variants[arm];
            const color = arm === 'A' ? '#2b66c4' : '#d0432e';
            return (
              <div key={arm} className="rounded-sm border bg-card/70 p-3" style={{ borderColor: color + '40' }}>
                <div className="flex items-center justify-between">
                  <span className="specimen-label text-[11px] font-bold" style={{ color }}>{arm} · {v.name || 'unnamed'}</span>
                  <span className="font-mono text-[15px] font-semibold" style={{ color }}>{fmtPct(v.sent ? v.replies / v.sent : null)}</span>
                </div>
                {v.copy && <pre className="mt-2 max-h-36 overflow-y-auto whitespace-pre-wrap border-l-2 pl-2 font-mono text-[11.5px] leading-relaxed text-ink/90" style={{ borderColor: color + '55' }}>{v.copy}</pre>}
                <div className="no-print mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-pencil">
                  {[['sent', 'sent'], ['replies', 'repl'], ['meetings', 'mtgs']].map(([f, lab]) => (
                    <span key={f} className="inline-flex items-center gap-1">
                      {lab} <b className="text-ink">{v[f]}</b>
                      <button type="button" onClick={() => onBump(arm, f, 1)} aria-label={`Add one to ${f}, variant ${arm}`}
                        className="rounded-[3px] border border-rule bg-card px-1 leading-4 hover:border-pencil">+1</button>
                      {f === 'sent' && (
                        <button type="button" onClick={() => onBump(arm, f, 10)} aria-label={`Add ten to sent, variant ${arm}`}
                          className="rounded-[3px] border border-rule bg-card px-1 leading-4 hover:border-pencil">+10</button>
                      )}
                    </span>
                  ))}
                  <span>mtg rate <b className="text-ink">{fmtPct(v.sent ? v.meetings / v.sent : null)}</b></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* verdict & learning */}
      {ex.status === 'concluded' ? (
        ex.learning ? (
          <div className="mt-3 border-t border-dashed border-rule pt-2">
            <p className="specimen-label text-[10px] font-bold text-warn">Learning · lab margin note</p>
            <p className="font-hand text-[19px] leading-snug text-ink"><span className="hilite">{ex.learning}</span></p>
            <div className="no-print mt-1.5">
              <Btn kind="ghost" onClick={() => onPin(ex)} className="!text-[12px]"><Pin className="h-3.5 w-3.5" aria-hidden /> Pin to insight board</Btn>
            </div>
          </div>
        ) : (
          <p className="font-hand mt-3 text-[16px] text-faint">No learning recorded — edit the entry and write one; a test without a learning is just traffic.</p>
        )
      ) : (
        <div className="no-print mt-3 border-t border-dashed border-rule pt-2">
          {!concluding ? (
            <Btn kind="ghost" onClick={() => setConcluding(true)} className="!text-[12px]"><Gavel className="h-3.5 w-3.5" aria-hidden /> Conclude &amp; record learning</Btn>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="specimen-label text-[10px] font-bold text-pencil">Verdict:</span>
                {Object.entries(VERDICTS).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setVerdict(k)}
                    className={`specimen-label rounded-[3px] border px-2 py-1 text-[10px] font-bold transition-colors ${verdict === k ? 'text-paper' : ''}`}
                    style={verdict === k ? { background: v.color, borderColor: v.color } : { borderColor: v.color + '66', color: v.color }}>
                    {v.label}
                  </button>
                ))}
              </div>
              <textarea value={learning} onChange={(e) => setLearning(e.target.value)} rows={2}
                placeholder="What did this test PROVE that changes how you write outreach? One sharp sentence."
                className="w-full resize-y rounded-sm border border-rule bg-card px-2 py-1.5 text-[13px]" />
              <div className="flex gap-2">
                <Btn kind="primary" onClick={() => { onConclude(verdict, learning); setConcluding(false); }} className="!text-[12px]">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Record verdict
                </Btn>
                <Btn kind="ghost" onClick={() => setConcluding(false)} className="!text-[12px]">Cancel</Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/* ================= main app ================= */

export default function App() {
  const consoleCtx = useConsoleBus();
  const [state, setState] = useState(() => {
    let raw = null;
    try { raw = localStorage.getItem(LS_KEY); } catch { /* private mode */ }
    return normalize(raw);
  });
  const [helpOpen, setHelpOpen] = useState(() => !state.seenGuide);
  const [resetOpen, setResetOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [toast, setToast] = useState(null); // {msg, undo?}
  const [query, setQuery] = useState('');
  const [chanFilter, setChanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copilotExp, setCopilotExp] = useState('');
  const [promptPreview, setPromptPreview] = useState(null);
  const toastTimer = useRef(null);
  const fileRef = useRef(null);
  const saveTimer = useRef(null);

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
        copyText(journalMd(stateRef.current)).then((ok) => flash(ok ? 'Journal copied as Markdown' : 'Copy failed — use Export menu'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flash, markGuideSeen]);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  /* derived */
  const rollup = useMemo(() => {
    const exps = state.experiments;
    let sent = 0, replies = 0, meetings = 0;
    for (const e of exps) for (const arm of ['A', 'B']) {
      sent += e.variants[arm].sent; replies += e.variants[arm].replies; meetings += e.variants[arm].meetings;
    }
    const series = [...exps]
      .sort((a, b) => a.started.localeCompare(b.started))
      .map((e) => {
        const s = e.variants.A.sent + e.variants.B.sent;
        return s ? (e.variants.A.replies + e.variants.B.replies) / s : 0;
      });
    return { sent, replies, meetings, rate: sent ? replies / sent : null, series };
  }, [state.experiments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.experiments.filter((e) =>
      (chanFilter === 'all' || e.channel === chanFilter) &&
      (statusFilter === 'all' || e.status === statusFilter) &&
      (!q || [e.title, e.code, e.audience, e.hypothesis, e.learning, e.variants.A.name, e.variants.B.name, e.variants.A.copy, e.variants.B.copy]
        .join(' ').toLowerCase().includes(q)));
  }, [state.experiments, query, chanFilter, statusFilter]);

  /* actions */
  const saveDraft = () => {
    const clean = normExperiment(draft, state.experiments.length);
    setState((s) => {
      const exists = s.experiments.some((e) => e.id === clean.id);
      return { ...s, experiments: exists ? s.experiments.map((e) => (e.id === clean.id ? clean : e)) : [clean, ...s.experiments] };
    });
    setDraft(null);
    flash('Entry saved to the journal');
  };

  const deleteExp = (ex) => {
    const idx = state.experiments.findIndex((e) => e.id === ex.id);
    setState((s) => ({ ...s, experiments: s.experiments.filter((e) => e.id !== ex.id) }));
    flash(`Deleted ${ex.code}`, () => {
      setState((s) => {
        const arr = [...s.experiments]; arr.splice(Math.min(idx, arr.length), 0, ex);
        return { ...s, experiments: arr };
      });
      setToast(null);
    });
  };

  const bump = (id, arm, field, by) =>
    setState((s) => ({
      ...s,
      experiments: s.experiments.map((e) =>
        e.id === id ? { ...e, variants: { ...e.variants, [arm]: { ...e.variants[arm], [field]: e.variants[arm][field] + by } } } : e),
    }));

  const conclude = (id, verdict, learning) =>
    setState((s) => ({
      ...s,
      experiments: s.experiments.map((e) => (e.id === id ? { ...e, status: 'concluded', verdict, learning } : e)),
    }));

  const pinInsight = (ex) => {
    if (!ex.learning.trim()) return;
    if (state.insights.some((i) => i.source === ex.code && i.text === ex.learning)) { flash('Already pinned'); return; }
    setState((s) => ({
      ...s,
      insights: [{ id: uid(), text: ex.learning, tag: CHANNELS[ex.channel].label.toLowerCase(), source: ex.code, date: new Date().toISOString().slice(0, 10) }, ...s.insights],
    }));
    flash('Pinned to the insight board');
  };

  const deleteInsight = (ins) => {
    setState((s) => ({ ...s, insights: s.insights.filter((i) => i.id !== ins.id) }));
    flash('Insight removed', () => {
      setState((s) => ({ ...s, insights: [ins, ...s.insights] }));
      setToast(null);
    });
  };

  const importJson = (file) => {
    const rd = new FileReader();
    rd.onload = () => {
      const next = normalize(rd.result);
      if (!next.experiments.length && !next.insights.length) { flash('Import failed — not a journal file'); return; }
      setState({ ...next, seenGuide: true });
      flash(`Imported ${next.experiments.length} experiments`);
    };
    rd.readAsText(file);
  };

  const copilotActions = [
    {
      id: 'next', title: 'Design my next A/B test', Icon: FlaskConical,
      desc: 'Sends your full journal; Claude proposes one rigorous next test with copy, sample size, and a decision rule.',
      build: () => withConsoleContext(promptNextTest(state), consoleCtx), disabled: false,
    },
    {
      id: 'explain', title: 'Explain why the winner won', Icon: Scale,
      desc: 'Pick an experiment; Claude dissects the mechanism, checks your sample, and lists confounds.',
      build: () => {
        const ex = state.experiments.find((e) => e.id === copilotExp) || state.experiments[0];
        return ex ? withConsoleContext(promptExplain(state, ex), consoleCtx) : '';
      },
      disabled: !state.experiments.length,
    },
    {
      id: 'playbook', title: 'Turn learnings into a playbook', Icon: BookOpenCheck,
      desc: 'Compiles concluded tests and pinned insights into team rules, do/don’t tables, and templates.',
      build: () => withConsoleContext(promptPlaybook(state), consoleCtx), disabled: false,
    },
  ];

  const copyPrompt = (a) => {
    const p = a.build();
    if (!p) { flash('Log an experiment first'); return; }
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
            <svg viewBox="0 0 44 44" className="mt-1 h-11 w-11 shrink-0" role="img" aria-label="Outreach A/B Journal mark: a split flask">
              <path d="M17 6h10M19 6v10L9 34a4 4 0 0 0 3.6 6h18.8A4 4 0 0 0 35 34L25 16V6" fill="none" stroke="#1c2530" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13.6 28h16.8l3 6.6A2 2 0 0 1 31.6 37H12.4a2 2 0 0 1-1.8-2.4z" fill="#ffe31a" stroke="#1c2530" strokeWidth="1.6" />
              <line x1="22" y1="16" x2="22" y2="37" stroke="#1c2530" strokeWidth="1.6" strokeDasharray="2.5 2.5" />
              <text x="16.5" y="35" textAnchor="middle" fontSize="8.5" fontWeight="700" fontFamily="IBM Plex Mono, monospace" fill="#2b66c4">A</text>
              <text x="27.5" y="35" textAnchor="middle" fontSize="8.5" fontWeight="700" fontFamily="IBM Plex Mono, monospace" fill="#d0432e">B</text>
            </svg>
            <div>
              <h1 className="text-[26px] font-extrabold leading-none tracking-tight">
                Outreach <span className="font-mono text-vara">A</span><span className="font-mono text-pencil">/</span><span className="font-mono text-varb">B</span> Journal
              </h1>
              <p className="mt-1 text-[13.5px] text-pencil">Test messages like a scientist — <span className="hilite font-semibold">log every trial, respect small samples, keep only proven patterns</span>.</p>
              {consoleCtx && (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-[3px] border border-vara/40 bg-vara/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-vara">
                  <Link2 className="h-3 w-3" aria-hidden /> Console linked{consoleCtx.profile?.company ? ` · ${consoleCtx.profile.company}` : ''}
                </span>
              )}
            </div>
          </div>
          <nav className="no-print flex flex-wrap items-center gap-2" aria-label="Primary actions">
            <Btn kind="ghost" onClick={() => { setState({ ...DEMO, seenGuide: true }); flash('Demo notebook loaded'); }}>
              <Beaker className="h-4 w-4" aria-hidden /> Load demo
            </Btn>
            <Btn kind="ghost" onClick={() => setResetOpen(true)}><RotateCcw className="h-4 w-4" aria-hidden /> Reset</Btn>
            <Btn kind="ghost" onClick={() => setHelpOpen(true)}><HelpCircle className="h-4 w-4" aria-hidden /> How to use</Btn>
            <div className="relative">
              <Btn kind="primary" onClick={() => setExportOpen((v) => !v)}><Download className="h-4 w-4" aria-hidden /> Export <ChevronDown className="h-3.5 w-3.5" aria-hidden /></Btn>
              {exportOpen && (
                <div role="menu" aria-label="Export options" className="pop-in absolute right-0 z-30 mt-1 w-56 rounded-sm border border-rule bg-card p-1 shadow-xl">
                  {[
                    { Icon: FileText, label: 'Copy journal as Markdown', act: () => copyText(journalMd(state)).then((ok) => flash(ok ? 'Journal copied as Markdown' : 'Copy failed')) },
                    { Icon: FileJson, label: 'Download JSON (full state)', act: () => download('outreach-ab-journal.json', JSON.stringify(state, null, 2), 'application/json') },
                    { Icon: Table2, label: 'Download CSV (results)', act: () => download('outreach-ab-results.csv', journalCsv(state), 'text/csv') },
                    { Icon: Upload, label: 'Import JSON…', act: () => fileRef.current?.click() },
                  ].map((m) => (
                    <button key={m.label} type="button" role="menuitem" onClick={() => { setExportOpen(false); m.act(); }}
                      className="flex w-full items-center gap-2 rounded-[3px] px-2 py-1.5 text-left text-[13px] hover:bg-hilite-soft">
                      <m.Icon className="h-4 w-4 text-pencil" aria-hidden /> {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Import journal JSON file"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
          </nav>
        </header>

        {/* ============ hero bench ============ */}
        <section className="mt-6 grid items-center gap-5 rounded-sm border border-rule bg-card/70 p-4 shadow-[0_10px_30px_-18px_rgba(28,37,48,0.4)] md:grid-cols-[1fr_auto]" aria-label="Bench summary">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {[
              ['Trials logged', state.experiments.length, ''],
              ['Messages sent', rollup.sent.toLocaleString(), ''],
              ['Bench reply rate', fmtPct(rollup.rate), `${rollup.replies} replies · ${rollup.meetings} mtgs`],
              ['Proven patterns', state.insights.length, 'pinned insights'],
            ].map(([label, value, sub]) => (
              <div key={label}>
                <p className="specimen-label text-[10px] font-bold text-pencil">{label}</p>
                <p className="font-mono text-[26px] font-semibold leading-tight text-ink">{value}</p>
                {sub && <p className="font-mono text-[10px] text-faint">{sub}</p>}
              </div>
            ))}
            <div className="col-span-2 sm:col-span-4">
              <p className="specimen-label text-[10px] font-bold text-pencil">Reply rate by trial (chronological)</p>
              <Sparkline series={rollup.series} />
            </div>
          </div>
          <div className="no-print hidden md:block"><HeroFigure experiments={state.experiments} /></div>
        </section>

        {/* ============ workbench grid ============ */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">

          {/* --- experiment log --- */}
          <section aria-label="Experiment log">
            <div className="no-print flex flex-wrap items-center gap-2">
              <h2 className="specimen-label mr-auto text-[12px] font-bold text-ink">Experiment log</h2>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" aria-hidden />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search trials…" aria-label="Search experiments"
                  className={`${inputCls} w-40 pl-7 font-mono text-[12px]`} />
              </div>
              <select value={chanFilter} onChange={(e) => setChanFilter(e.target.value)} aria-label="Filter by channel" className={`${inputCls} font-mono text-[12px]`}>
                <option value="all">all channels</option>
                {Object.entries(CHANNELS).map(([k, c]) => <option key={k} value={k}>{c.label.toLowerCase()}</option>)}
              </select>
              <div className="flex overflow-hidden rounded-sm border border-rule" role="group" aria-label="Filter by status">
                {['all', 'running', 'concluded'].map((s) => (
                  <button key={s} type="button" onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1.5 font-mono text-[12px] ${statusFilter === s ? 'bg-inkdark text-paper' : 'bg-card text-pencil hover:text-ink'}`}>
                    {s}
                  </button>
                ))}
              </div>
              <Btn kind="accent" onClick={() => setDraft(emptyDraft())}><Plus className="h-4 w-4" aria-hidden /> New experiment</Btn>
            </div>

            <div className="mt-4 space-y-5">
              {filtered.length === 0 && state.experiments.length === 0 && (
                <div className="entry-card tape relative rounded-sm border border-dashed border-pencil/50 p-8 text-center">
                  <FlaskConical className="mx-auto h-8 w-8 text-pencil" aria-hidden />
                  <h3 className="mt-3 text-lg font-extrabold">Your bench is empty</h3>
                  <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-pencil">
                    Every outreach message you send is a trial — this notebook makes it count.
                    Log variant A and variant B, record sends and replies as they land, and let the
                    math tell you when a winner is real (and when your sample is lying to you).
                  </p>
                  <p className="font-hand mt-2 text-[18px] text-warn">Rule one: the plural of anecdote is not data.</p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Btn kind="accent" onClick={() => setDraft(emptyDraft())}><Plus className="h-4 w-4" aria-hidden /> Log first experiment</Btn>
                    <Btn kind="ghost" onClick={() => { setState({ ...DEMO, seenGuide: true }); flash('Demo notebook loaded'); }}>
                      <Beaker className="h-4 w-4" aria-hidden /> See a worked example
                    </Btn>
                  </div>
                </div>
              )}
              {filtered.length === 0 && state.experiments.length > 0 && (
                <p className="p-6 text-center font-mono text-[13px] text-pencil">No trials match this filter — clear the search or switch channel/status.</p>
              )}
              {filtered.map((ex, i) => (
                <ExperimentCard key={ex.id} ex={ex} defaultOpen={i === 0}
                  onEdit={() => setDraft(JSON.parse(JSON.stringify(ex)))}
                  onDelete={() => deleteExp(ex)}
                  onBump={(arm, f, by) => bump(ex.id, arm, f, by)}
                  onConclude={(v, l) => { conclude(ex.id, v, l); flash(`${ex.code} concluded`); }}
                  onPin={pinInsight}
                />
              ))}
            </div>
          </section>

          {/* --- right rail --- */}
          <aside className="space-y-6">
            {/* insight board */}
            <section aria-label="Insight board" className="rounded-sm border border-warn/40 bg-hilite-soft/40 p-4 shadow-[0_8px_24px_-16px_rgba(199,124,30,0.5)]">
              <h2 className="specimen-label flex items-center gap-1.5 text-[12px] font-bold text-ink">
                <Pin className="h-4 w-4 text-warn" aria-hidden /> Insight board — proven patterns
              </h2>
              <p className="mt-1 text-[11.5px] leading-snug text-pencil">Only pin what a concluded test actually proved. This board becomes your playbook.</p>
              <ul className="mt-3 space-y-2.5">
                {state.insights.length === 0 && (
                  <li className="font-hand text-[17px] text-pencil">Nothing proven yet — conclude a test, write the learning, pin it here.</li>
                )}
                {state.insights.map((ins) => (
                  <li key={ins.id} className="group relative rounded-sm border border-warn/30 bg-card p-2.5 shadow-sm">
                    <p className="text-[12.5px] font-medium leading-snug">{ins.text}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-faint">
                      [{ins.tag}]{ins.source ? ` · ${ins.source}` : ''} · {ins.date}
                    </p>
                    <button type="button" onClick={() => deleteInsight(ins)} aria-label={`Remove insight: ${ins.text.slice(0, 40)}`}
                      className="no-print absolute right-1.5 top-1.5 rounded-[3px] p-1 text-faint opacity-0 transition-opacity hover:text-margin focus-visible:opacity-100 group-hover:opacity-100">
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* copilot */}
            <section aria-label="Claude Copilot" className="no-print rounded-sm border border-vara/30 bg-card/80 p-4 shadow-[0_8px_24px_-16px_rgba(43,102,196,0.45)]">
              <h2 className="specimen-label flex items-center gap-1.5 text-[12px] font-bold text-ink">
                <Sparkles className="h-4 w-4 text-vara" aria-hidden /> Claude Copilot — lab assistant
              </h2>
              <p className="mt-1 text-[11.5px] leading-snug text-pencil">
                Each action builds a complete prompt around your live journal.
                Paste into <span className="font-mono">claude.ai</span> — works with the standard $20 Claude subscription, no API key.
              </p>
              <div className="mt-3 space-y-3">
                {copilotActions.map((a) => (
                  <div key={a.id} className="rounded-sm border border-rule bg-paper/60 p-2.5">
                    <p className="flex items-center gap-1.5 text-[13px] font-bold"><a.Icon className="h-4 w-4 text-vara" aria-hidden />{a.title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-pencil">{a.desc}</p>
                    {a.id === 'explain' && state.experiments.length > 0 && (
                      <select value={copilotExp || state.experiments[0].id} onChange={(e) => setCopilotExp(e.target.value)}
                        aria-label="Experiment to explain" className={`${inputCls} mt-1.5 w-full font-mono text-[11px]`}>
                        {state.experiments.map((e) => <option key={e.id} value={e.id}>{e.code} — {e.title.slice(0, 44)}</option>)}
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
                  <ClipboardPaste className="h-3.5 w-3.5" aria-hidden /> Claude&apos;s findings (saved with your journal)
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
        <div role="dialog" aria-modal="true" aria-label="How to use Outreach A/B Journal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-inkdark/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) markGuideSeen(); }}>
          <div className="pop-in max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-sm border-t-4 border-hilite bg-paper p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-extrabold tracking-tight">How to run your bench</h2>
              <Btn kind="ghost" onClick={markGuideSeen} ariaLabel="Close help"><X className="h-4 w-4" aria-hidden /></Btn>
            </div>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-[13.5px] leading-relaxed">
              <li><b>Load the demo</b> to see a fully-worked notebook, or start clean with <b>New experiment</b>.</li>
              <li><b>Log one variable per trial</b> — variant A (control) and variant B (challenger), with the exact copy you sent.</li>
              <li><b>Record sends, replies and meetings</b> as they land — the <span className="font-mono">+1</span> / <span className="font-mono">+10</span> steppers on each open card make daily logging a 5-second habit.</li>
              <li><b>Read the honesty strip.</b> The journal computes reply rates with 95% confidence whiskers and refuses to call a winner on a thin sample — trust it over your gut.</li>
              <li><b>Conclude &amp; record the learning</b> — one sharp sentence about what the test proved, then stamp the verdict.</li>
              <li><b>Pin proven learnings</b> to the Insight board. That board is your accumulating playbook.</li>
              <li><b>Use the Claude Copilot</b> — copy a prompt (your whole journal rides along) into claude.ai to design the next test, explain a result, or compile the playbook.</li>
              <li><b>Export</b> — Markdown for sharing, JSON for backup, CSV for spreadsheets.</li>
            </ol>
            <h3 className="specimen-label mt-4 flex items-center gap-1.5 text-[11px] font-bold text-pencil"><Keyboard className="h-4 w-4" aria-hidden /> Shortcuts</h3>
            <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[12px]">
              {[['n', 'new experiment'], ['?', 'open this guide'], ['Ctrl/Cmd+S', 'copy journal as Markdown'], ['Esc', 'close any panel']].map(([k, d]) => (
                <p key={k}><kbd className="rounded border border-rule bg-card px-1.5 py-0.5">{k}</kbd> <span className="text-pencil">{d}</span></p>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <Btn kind="accent" onClick={markGuideSeen}>Start testing</Btn>
            </div>
          </div>
        </div>
      )}

      {resetOpen && (
        <div role="dialog" aria-modal="true" aria-label="Confirm reset"
          className="fixed inset-0 z-50 flex items-center justify-center bg-inkdark/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setResetOpen(false); }}>
          <div className="pop-in w-full max-w-sm rounded-sm border-t-4 border-margin bg-paper p-5 shadow-2xl">
            <h2 className="flex items-center gap-2 text-lg font-extrabold"><AlertTriangle className="h-5 w-5 text-margin" aria-hidden /> Burn the notebook?</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-pencil">
              This erases every experiment and insight from this browser. Download the JSON first if any of it took real sends to earn.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Btn kind="ghost" onClick={() => download('outreach-ab-journal-backup.json', JSON.stringify(state, null, 2), 'application/json')}>
                <FileJson className="h-4 w-4" aria-hidden /> Backup first
              </Btn>
              <Btn kind="ghost" onClick={() => setResetOpen(false)}>Cancel</Btn>
              <Btn kind="danger" onClick={() => { setState(normalize({ seenGuide: true })); setResetOpen(false); flash('Notebook reset'); }}>
                <Trash2 className="h-4 w-4" aria-hidden /> Reset everything
              </Btn>
            </div>
          </div>
        </div>
      )}

      {promptPreview && (
        <div role="dialog" aria-modal="true" aria-label="Prompt preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-inkdark/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setPromptPreview(null); }}>
          <div className="pop-in flex max-h-[86vh] w-full max-w-2xl flex-col rounded-sm border-t-4 border-vara bg-paper p-5 shadow-2xl">
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

      {draft && <EditorDrawer draft={draft} setDraft={setDraft} onSave={saveDraft} onClose={() => setDraft(null)} consoleCtx={consoleCtx} />}

      {/* toast */}
      {toast && (
        <div className="toast-in fixed bottom-5 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-sm border border-rule bg-inkdark px-4 py-2.5 text-[13px] text-paper shadow-2xl" role="status">
          {toast.msg}
          {toast.undo && (
            <button type="button" onClick={toast.undo}
              className="inline-flex items-center gap-1 rounded-[3px] bg-hilite px-2 py-1 font-semibold text-inkdark hover:brightness-95">
              <Undo2 className="h-3.5 w-3.5" aria-hidden /> Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
