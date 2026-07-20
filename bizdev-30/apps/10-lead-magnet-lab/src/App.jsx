import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Magnet, FlaskConical, TestTube, Microscope, Copy, Check, X, Plus, Trash2,
  ChevronUp, ChevronDown, ChevronRight, CircleHelp, Sparkles, FileText, Printer,
  RotateCcw, Upload, Download, ListChecks, Pipette,
  ClipboardCheck, Target, Archive, Undo2, Eye, NotebookPen, Quote
} from 'lucide-react';

/* ================================================================== */
/* Constants & helpers                                                 */
/* ================================================================== */

const SLUG = '10-lead-magnet-lab';
const LS_KEY = `bizdev:${SLUG}:v1`;

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

const FORMATS = [
  { id: 'checklist', label: 'Checklist' },
  { id: 'template', label: 'Template' },
  { id: 'calculator', label: 'Calculator' },
  { id: 'swipe-file', label: 'Swipe file' },
  { id: 'mini-guide', label: 'Mini-guide' },
  { id: 'email-course', label: 'Email course' },
  { id: 'quiz', label: 'Quiz / scorecard' },
  { id: 'toolkit', label: 'Toolkit' },
  { id: 'teardown', label: 'Teardown' },
  { id: 'workshop', label: 'Workshop' },
];
const formatLabel = (id) => (FORMATS.find((f) => f.id === id) || FORMATS[0]).label;

const EFFORTS = {
  S: 'Small · under a day',
  M: 'Medium · 2–4 days',
  L: 'Large · a week or more',
};

const SCORE_AXES = [
  { key: 'pain', label: 'Pain relevance', hint: 'Does it hit a problem your ICP already feels?' },
  { key: 'speed', label: 'Speed-to-value', hint: 'Minutes to a first win, not weeks?' },
  { key: 'ease', label: 'Ease to build', hint: 'Can you ship it without a rebuild of your life?' },
];

const CHECKLIST_GROUPS = ['Build', 'Page', 'Distribution', 'Follow-up'];
const defaultChecklist = () => [
  { id: uid(), group: 'Build', label: 'Draft the asset from the approved outline', done: false },
  { id: uid(), group: 'Build', label: 'Design pass: cover, title, one visual per section', done: false },
  { id: uid(), group: 'Build', label: 'Test the download / delivery end-to-end', done: false },
  { id: uid(), group: 'Page', label: 'Publish landing page with the Label copy', done: false },
  { id: uid(), group: 'Page', label: 'Wire the form to your email tool + tag new leads', done: false },
  { id: uid(), group: 'Page', label: 'Set up thank-you page with one next step', done: false },
  { id: uid(), group: 'Distribution', label: 'Announce to your list and social profiles', done: false },
  { id: uid(), group: 'Distribution', label: 'Add to email signature and content CTAs', done: false },
  { id: uid(), group: 'Distribution', label: 'Pitch 3 partners / communities to share it', done: false },
  { id: uid(), group: 'Follow-up', label: 'Write the 3-email nurture that follows delivery', done: false },
  { id: uid(), group: 'Follow-up', label: 'Review opt-in rate after 100 visitors; iterate headline', done: false },
];

const blankCopy = () => ({ headline: '', subhead: '', bullets: [], cta: '', proof: '', micro: '' });

const blankConcept = (patch = {}) => ({
  id: uid(),
  title: '',
  format: 'checklist',
  promise: '',
  effort: 'M',
  notes: '',
  scores: { pain: 0, speed: 0, ease: 0 },
  shelved: false,
  outline: [],
  copy: blankCopy(),
  checklist: defaultChecklist(),
  ...patch,
});

/* Attraction Index: pain × speed × ease, normalized to 0–100 */
const attractionIndex = (c) => {
  const { pain, speed, ease } = c.scores;
  if (!pain || !speed || !ease) return null;
  return Math.round((pain * speed * ease / 125) * 100);
};

const str = (v, fb = '') => (typeof v === 'string' ? v : fb);
const num05 = (v) => (typeof v === 'number' && isFinite(v) ? clamp(Math.round(v), 0, 5) : 0);

function normalize(raw) {
  const base = {
    v: 1,
    seenGuide: false,
    tab: 'bench',
    context: { icp: '', offer: '' },
    concepts: [],
    chosenId: null,
    activeId: null,
    copilotNotes: '',
    filterFormat: 'all',
    showShelved: false,
  };
  if (!raw || typeof raw !== 'object') return base;
  const out = { ...base };
  out.seenGuide = raw.seenGuide === true;
  out.tab = ['bench', 'outline', 'copy', 'launch'].includes(raw.tab) ? raw.tab : 'bench';
  if (raw.context && typeof raw.context === 'object') {
    out.context = { icp: str(raw.context.icp), offer: str(raw.context.offer) };
  }
  out.copilotNotes = str(raw.copilotNotes);
  out.filterFormat = str(raw.filterFormat, 'all') || 'all';
  out.showShelved = raw.showShelved === true;
  if (Array.isArray(raw.concepts)) {
    out.concepts = raw.concepts.filter((c) => c && typeof c === 'object').map((c) => {
      const b = blankConcept();
      const scores = c.scores && typeof c.scores === 'object' ? c.scores : {};
      return {
        ...b,
        id: str(c.id) || b.id,
        title: str(c.title),
        format: FORMATS.some((f) => f.id === c.format) ? c.format : 'checklist',
        promise: str(c.promise),
        effort: ['S', 'M', 'L'].includes(c.effort) ? c.effort : 'M',
        notes: str(c.notes),
        shelved: c.shelved === true,
        scores: { pain: num05(scores.pain), speed: num05(scores.speed), ease: num05(scores.ease) },
        outline: Array.isArray(c.outline)
          ? c.outline.filter((s) => s && typeof s === 'object').map((s) => ({
              id: str(s.id) || uid(), heading: str(s.heading), bullets: str(s.bullets),
            }))
          : [],
        copy: c.copy && typeof c.copy === 'object'
          ? {
              headline: str(c.copy.headline), subhead: str(c.copy.subhead),
              bullets: Array.isArray(c.copy.bullets) ? c.copy.bullets.map((x) => str(x)) : [],
              cta: str(c.copy.cta), proof: str(c.copy.proof), micro: str(c.copy.micro),
            }
          : blankCopy(),
        checklist: Array.isArray(c.checklist)
          ? c.checklist.filter((i) => i && typeof i === 'object').map((i) => ({
              id: str(i.id) || uid(),
              group: CHECKLIST_GROUPS.includes(i.group) ? i.group : 'Build',
              label: str(i.label), done: i.done === true,
            }))
          : defaultChecklist(),
      };
    });
  }
  const ids = new Set(out.concepts.map((c) => c.id));
  out.chosenId = ids.has(raw.chosenId) ? raw.chosenId : null;
  out.activeId = ids.has(raw.activeId) ? raw.activeId : out.chosenId;
  return out;
}

/* ================================================================== */
/* Demo scenario — Ledgerline, a fractional CFO studio                 */
/* ================================================================== */

function demoState() {
  const chosen = blankConcept({
    title: 'SaaS Runway & Burn Calculator',
    format: 'calculator',
    promise: 'Know your exact cash-out date in 10 minutes — no spreadsheet archaeology.',
    effort: 'M',
    notes: 'Google Sheet with a locked model tab. Inputs: bank balance, MRR, growth, payroll, spend. Outputs: runway date, default-alive check, 3 scenario columns.',
    scores: { pain: 5, speed: 5, ease: 4 },
    outline: [
      { id: uid(), heading: 'Start here: the 5 numbers you need', bullets: 'Where to find each number in Stripe / your bank\nWhy "cash in bank" is not "cash you can spend"\nThe 10-minute promise: set a timer' },
      { id: uid(), heading: 'Input panel: your business in 5 fields', bullets: 'Bank balance, MRR, monthly growth %, payroll, non-payroll spend\nPre-filled example row so nothing starts blank\nRed/green validation so typos are obvious' },
      { id: uid(), heading: 'The runway readout', bullets: 'Cash-out date in plain words ("You run out in March 2027")\nMonths of runway with a visual bar\nDefault-alive / default-dead verdict, Paul Graham style' },
      { id: uid(), heading: 'Three scenarios side by side', bullets: 'Base / cut 15% / hire 2 engineers columns\nWhich single lever moves the date most\nCopy-paste summary line for your investor update' },
      { id: uid(), heading: 'What founders get wrong (annotated)', bullets: 'Counting ARR as cash\nForgetting payroll taxes and fees\nAveraging growth over the wrong window' },
      { id: uid(), heading: 'When to get help', bullets: 'The 3 signals you have a finance problem, not a spreadsheet problem\nWhat a fractional CFO engagement actually looks like\nSoft CTA: book a 20-minute runway review' },
    ],
    copy: {
      headline: 'Find out the day your startup runs out of money',
      subhead: 'A free runway calculator for SaaS founders. Five inputs, ten minutes, and a straight answer — plus the three levers that move your cash-out date the most.',
      bullets: [
        'Your cash-out date, in plain words — not a wall of cells',
        'Default-alive or default-dead verdict on one screen',
        'Three scenarios side by side: base, cut 15%, make the hire',
        'A copy-paste runway line for your next investor update',
      ],
      cta: 'Get the calculator',
      proof: 'Built by Ledgerline — the fractional CFO studio behind 40+ B2B SaaS finance stacks.',
      micro: 'Instant delivery. One email, no spam, unsubscribe anytime.',
    },
    checklist: null,
  });
  chosen.checklist = defaultChecklist();
  chosen.checklist[0].done = true;
  chosen.checklist[1].done = true;
  chosen.checklist[3].done = true;

  const concepts = [
    chosen,
    blankConcept({
      title: '13-Week Cash Flow Template',
      format: 'template',
      promise: 'The exact rolling cash sheet our CFOs run for every client, blank and ready.',
      effort: 'S',
      scores: { pain: 5, speed: 4, ease: 4 },
      notes: 'Strip the client version. Add a Loom walkthrough on tab 1.',
    }),
    blankConcept({
      title: 'Investor Update Swipe File',
      format: 'swipe-file',
      promise: '9 real (anonymized) investor updates that got follow-on checks.',
      effort: 'S',
      scores: { pain: 3, speed: 5, ease: 4 },
      notes: 'Needs founder permission on 3 of them. Redact numbers to ranges.',
    }),
    blankConcept({
      title: 'Month-End Close Checklist',
      format: 'checklist',
      promise: 'Close your books in 3 days, not 3 weeks — every step in order.',
      effort: 'S',
      scores: { pain: 4, speed: 4, ease: 5 },
      notes: 'Strong for ops-minded founders; weaker hook for CEOs.',
    }),
    blankConcept({
      title: 'SaaS Metrics Mini-Guide',
      format: 'mini-guide',
      promise: 'The 12 metrics investors actually read, and the 20 they skip.',
      effort: 'M',
      scores: { pain: 3, speed: 3, ease: 3 },
      notes: 'Crowded space — needs a sharper angle to beat the noise.',
    }),
    blankConcept({
      title: 'Finance Stack Teardown Workshop',
      format: 'workshop',
      promise: 'Live teardown of a real seed-stage finance stack, warts and all.',
      effort: 'L',
      scores: { pain: 4, speed: 3, ease: 2 },
      shelved: true,
      notes: 'Shelved: high effort, and live delivery does not scale as a magnet.',
    }),
  ];
  return normalize({
    v: 1,
    seenGuide: true,
    tab: 'bench',
    context: {
      icp: 'Bootstrapped and seed-stage B2B SaaS founders, $1–10M ARR, 5–40 headcount, no in-house finance leader. They feel cash anxiety monthly and do finance at midnight in spreadsheets.',
      offer: 'Ledgerline — fractional CFO studio. Monthly finance operations, board-ready reporting, and runway strategy from $2.5k/mo.',
    },
    concepts,
    chosenId: concepts[0].id,
    activeId: concepts[0].id,
    copilotNotes: '',
  });
}

/* ================================================================== */
/* Markdown serialization                                              */
/* ================================================================== */

const rankedConcepts = (concepts) =>
  [...concepts].sort((a, b) => (attractionIndex(b) ?? -1) - (attractionIndex(a) ?? -1));

function boardTableMd(concepts) {
  const rows = rankedConcepts(concepts).map((c, i) => {
    const ix = attractionIndex(c);
    return `| ${i + 1} | ${c.title || '(untitled)'}${c.shelved ? ' (shelved)' : ''} | ${formatLabel(c.format)} | ${c.effort} | ${c.scores.pain || '–'} | ${c.scores.speed || '–'} | ${c.scores.ease || '–'} | ${ix ?? 'unscored'} |`;
  });
  return ['| # | Concept | Format | Effort | Pain | Speed | Ease | Index |', '|---|---|---|---|---|---|---|---|', ...rows].join('\n');
}

function conceptMd(c) {
  const ix = attractionIndex(c);
  const lines = [
    `### ${c.title || '(untitled concept)'}`,
    `- Format: ${formatLabel(c.format)} · Effort: ${EFFORTS[c.effort]}`,
    `- Promise: ${c.promise || '(none yet)'}`,
    `- Scores: pain ${c.scores.pain}/5 · speed-to-value ${c.scores.speed}/5 · ease ${c.scores.ease}/5 → Attraction Index ${ix ?? 'unscored'}/100`,
  ];
  if (c.notes) lines.push(`- Bench notes: ${c.notes}`);
  if (c.outline.length) {
    lines.push('', '#### Outline');
    c.outline.forEach((s, i) => {
      lines.push(`${i + 1}. **${s.heading || '(untitled section)'}**`);
      s.bullets.split('\n').filter(Boolean).forEach((b) => lines.push(`   - ${b}`));
    });
  }
  const cp = c.copy;
  if (cp.headline || cp.subhead || cp.bullets.length || cp.cta) {
    lines.push('', '#### Landing page copy');
    if (cp.headline) lines.push(`- **Headline:** ${cp.headline}`);
    if (cp.subhead) lines.push(`- **Subhead:** ${cp.subhead}`);
    cp.bullets.filter(Boolean).forEach((b) => lines.push(`- Bullet: ${b}`));
    if (cp.cta) lines.push(`- **CTA:** ${cp.cta}`);
    if (cp.proof) lines.push(`- **Proof line:** ${cp.proof}`);
    if (cp.micro) lines.push(`- **Form microcopy:** ${cp.micro}`);
  }
  if (c.checklist.length) {
    const done = c.checklist.filter((i) => i.done).length;
    lines.push('', `#### Launch checklist (${done}/${c.checklist.length})`);
    CHECKLIST_GROUPS.forEach((g) => {
      const items = c.checklist.filter((i) => i.group === g);
      if (!items.length) return;
      lines.push(`- ${g}`);
      items.forEach((i) => lines.push(`  - [${i.done ? 'x' : ' '}] ${i.label}`));
    });
  }
  return lines.join('\n');
}

function labReportMd(state) {
  const { context, concepts, chosenId } = state;
  const chosen = concepts.find((c) => c.id === chosenId);
  const out = [
    '# Lead Magnet Lab — Lab Report',
    '',
    `- ICP: ${context.icp || '(not set)'}`,
    `- Offer: ${context.offer || '(not set)'}`,
    `- Concepts on the bench: ${concepts.length} · Lead candidate: ${chosen ? chosen.title || '(untitled)' : 'none selected'}`,
    '',
    '## Concept assay board',
    '',
    concepts.length ? boardTableMd(concepts) : '_No concepts yet._',
  ];
  if (chosen) out.push('', '## Lead candidate — full workup', '', conceptMd(chosen));
  concepts.filter((c) => c.id !== chosenId && !c.shelved).forEach((c) => {
    out.push('', '---', '', conceptMd(c));
  });
  return out.join('\n');
}

function boardCsv(concepts) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['Rank', 'Concept', 'Format', 'Promise', 'Effort', 'Pain', 'SpeedToValue', 'Ease', 'AttractionIndex', 'Shelved'].join(',')];
  rankedConcepts(concepts).forEach((c, i) => {
    rows.push([i + 1, esc(c.title), formatLabel(c.format), esc(c.promise), c.effort,
      c.scores.pain, c.scores.speed, c.scores.ease, attractionIndex(c) ?? '', c.shelved ? 'yes' : 'no'].join(','));
  });
  return rows.join('\n');
}

/* ================================================================== */
/* Claude Copilot prompts                                              */
/* ================================================================== */

function contextBlock(state, bus) {
  const lines = ['## My business context'];
  if (bus?.profile) {
    const p = bus.profile;
    if (p.company) lines.push(`- Company: ${p.company}`);
    if (p.offer) lines.push(`- Offer: ${p.offer}`);
    if (p.icp) lines.push(`- ICP: ${p.icp}`);
  }
  lines.push(`- ICP (from my Lead Magnet Lab): ${state.context.icp || '(not provided — ask me 2 clarifying questions first)'}`);
  lines.push(`- Offer: ${state.context.offer || '(not provided)'}`);
  if (bus?.claude?.voiceNotes) lines.push(`- Voice notes: ${bus.claude.voiceNotes}`);
  return lines.join('\n');
}

function buildPrompts(state, bus) {
  const chosen = state.concepts.find((c) => c.id === state.chosenId)
    || state.concepts.find((c) => c.id === state.activeId)
    || state.concepts[0];
  const ctx = contextBlock(state, bus);
  const board = state.concepts.length ? boardTableMd(state.concepts) : '_Empty board — nothing invented yet._';

  return [
    {
      id: 'ideas',
      icon: Sparkles,
      title: 'Synthesize 10 magnet ideas',
      desc: 'Fresh concepts scored on this lab’s rubric, tuned to your ICP.',
      prompt: `You are a senior demand-generation strategist who has shipped dozens of lead magnets that actually convert cold traffic into qualified pipeline. You despise generic "ultimate guide" ebooks.

${ctx}

## Concepts already on my bench (do not duplicate these)

${board}

## Your task
Generate 10 NEW lead magnet concepts for this ICP. For each:
1. A specific, concrete title (no "Ultimate Guide to X")
2. Format (checklist, template, calculator, swipe file, mini-guide, email course, quiz, toolkit, teardown, or workshop)
3. The promise in one sentence — the outcome the prospect gets in under 30 minutes
4. Effort to build: S (under a day), M (2–4 days), L (a week+)
5. Predicted scores 1–5 on my rubric: pain relevance, speed-to-value, ease to build

Bias hard toward "do the work for them" formats (templates, calculators, swipe files) over "explain things" formats. Every promise must name a specific outcome, number, or artifact.

## Output format
A markdown table with columns: Title | Format | Promise | Effort | Pain | Speed | Ease. Then a short paragraph naming your top 3 picks and why they beat the others for THIS ICP specifically. I will add the winners to my board and score them myself.`,
    },
    {
      id: 'outline',
      icon: ListChecks,
      title: 'Outline the lead candidate',
      desc: 'A complete section-by-section build plan for the chosen magnet.',
      prompt: `You are an expert content architect who designs lead magnets people actually finish and act on. Your outlines are ruthlessly practical: every section moves the reader toward one fast win.

${ctx}

## The magnet I chose to build

${chosen ? conceptMd(chosen) : '_No concept selected yet — I will paste one below._'}

## Your task
Produce a complete production outline for this magnet:
1. 6–9 sections, each with a working heading and 3–5 bullet points of exact content to include
2. For each section, note the ONE thing the reader should be able to do after it
3. Flag any section that risks bloating the magnet — cut or merge it
4. Suggest 3 alternative titles ranked by curiosity + specificity
5. Recommend the delivery format (PDF, Notion page, spreadsheet, etc.) and why, given the format "${chosen ? formatLabel(chosen.format) : 'unknown'}"

Keep the whole magnet consumable in under 20 minutes. The last section should create a natural, non-sleazy bridge to my paid offer.

## Output format
Numbered sections with nested bullets, then the title options, then the delivery recommendation. I will paste sections back into my outline builder, so keep headings on their own lines.`,
    },
    {
      id: 'copy',
      icon: NotebookPen,
      title: 'Write the landing page copy',
      desc: 'Headline variants, subhead, bullets, CTA — mapped to the Label fields.',
      prompt: `You are a direct-response copywriter in the school of Halbert and Georgi — specific, concrete, zero hype-words like "unlock" or "supercharge". You write landing pages for lead magnets that convert at 40%+.

${ctx}

## The magnet this page offers

${chosen ? conceptMd(chosen) : '_No concept selected yet._'}

## Your task
Write the complete opt-in page copy:
1. 5 headline options (under 60 characters each) — lead with the outcome or the fear, never the format
2. One subhead (under 160 characters) that makes the promise concrete: what they get, how fast
3. 4 benefit bullets — each names a specific deliverable or "aha", no feature-speak
4. CTA button text, 2–4 words, first person where it helps ("Get my calculator")
5. One proof / credibility line I can adapt
6. Form microcopy that lowers anxiety (delivery, no spam, unsubscribe)

Rules: no exclamation marks, no "free" more than once, reading level grade 6, every claim checkable.

## Output format
Label each block exactly: HEADLINES, SUBHEAD, BULLETS, CTA, PROOF, MICROCOPY — so I can paste them straight into my Label fields. After the blocks, one paragraph: which headline you would ship and why.`,
    },
    {
      id: 'review',
      icon: Microscope,
      title: 'Peer-review my page copy',
      desc: 'A brutal referee pass on the current Label draft before launch.',
      prompt: `You are a conversion optimizer reviewing an opt-in page before launch. You are the reviewer everyone fears and later thanks: specific, blunt, and you always show the fix, not just the flaw.

${ctx}

## The draft on my bench

${chosen ? conceptMd(chosen) : '_No concept selected yet._'}

## Your task
Referee this landing page copy:
1. Score each element 1–10 with one-line justification: headline hook, promise clarity, bullet specificity, CTA strength, friction/anxiety handling
2. Identify the single biggest conversion leak and rewrite that element in place
3. Rewrite any bullet that describes the magnet instead of the outcome
4. Check promise-to-magnet honesty: does the page oversell what the outline delivers? Flag any gap
5. Give a one-sentence verdict: ship, revise, or rethink — and the one change with the highest expected lift

## Output format
A scorecard table, then your rewrites in labeled blocks (HEADLINE, SUBHEAD, BULLETS, CTA), then the verdict. Do not soften anything.`,
    },
  ];
}

/* ================================================================== */
/* Small shared UI                                                     */
/* ================================================================== */

function Btn({ children, onClick, tone = 'ghost', className = '', ...rest }) {
  const tones = {
    primary: 'bg-magnet-500 text-white hover:bg-magnet-600 border border-magnet-600/60 shadow-sm',
    dark: 'bg-lab-800 text-lab-50 hover:bg-lab-700 border border-lab-900/70 shadow-sm',
    ghost: 'bg-white/60 text-lab-700 hover:bg-white border border-lab-200 hover:border-lab-300',
    danger: 'bg-white/60 text-magnet-600 hover:bg-magnet-50 border border-magnet-200',
  };
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${tones[tone]} ${className}`}
      {...rest}>
      {children}
    </button>
  );
}

function IconBtn({ label, onClick, children, className = '', ...rest }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-lab-500 transition-colors hover:bg-lab-100 hover:text-lab-800 ${className}`}
      {...rest}>
      {children}
    </button>
  );
}

function Modal({ title, kicker, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-lab-950/45 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`glass-strong anim-fade-up relative mt-4 w-full rounded-2xl p-6 sm:p-8 ${wide ? 'max-w-3xl' : 'max-w-xl'}`}>
        <IconBtn label="Close" onClick={onClose} className="absolute right-4 top-4"><X className="h-4 w-4" /></IconBtn>
        {kicker && <p className="annot text-magnet-600">{kicker}</p>}
        <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-lab-900">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

/* Attraction Index dial — semicircular assay gauge */
function AssayDial({ value, size = 92 }) {
  const r = 36, cx = 46, cy = 44;
  const arc = (v) => {
    const a = Math.PI * (1 - v / 100);
    return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
  };
  const v = value ?? 0;
  const end = arc(v);
  const large = v > 50 ? 1 : 0;
  const ticks = [];
  for (let t = 0; t <= 100; t += 10) {
    const a = Math.PI * (1 - t / 100);
    const r1 = t % 50 === 0 ? r - 7 : r - 4;
    ticks.push(
      <line key={t}
        x1={cx + r1 * Math.cos(a)} y1={cy - r1 * Math.sin(a)}
        x2={cx + (r + 1) * Math.cos(a)} y2={cy - (r + 1) * Math.sin(a)}
        stroke={t === 0 || t === 100 ? 'var(--color-lab-600)' : 'var(--color-lab-300)'}
        strokeWidth={t % 50 === 0 ? 1.6 : 1} />
    );
  }
  return (
    <svg width={size} height={size * 0.68} viewBox="0 0 92 62" aria-hidden className="shrink-0">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none"
        stroke="var(--color-lab-150)" strokeWidth="6" strokeLinecap="round" />
      {value != null && v > 0 && (
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`} fill="none"
          stroke={v >= 60 ? 'var(--color-magnet-500)' : v >= 35 ? 'var(--color-assay-500)' : 'var(--color-lab-400)'}
          strokeWidth="6" strokeLinecap="round" />
      )}
      {ticks}
      <text x={cx} y={cy - 6} textAnchor="middle"
        style={{ font: '700 17px "IBM Plex Mono", monospace', fill: value != null ? 'var(--color-lab-900)' : 'var(--color-lab-300)' }}>
        {value != null ? value : '--'}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle"
        style={{ font: '600 6.5px "IBM Plex Mono", monospace', letterSpacing: '0.12em', fill: 'var(--color-lab-500)' }}>
        ATTRACTION IDX
      </text>
      <text x={cx - r} y={cy + 16} textAnchor="middle" style={{ font: '600 7px "IBM Plex Mono", monospace', fill: 'var(--color-lab-400)' }}>0</text>
      <text x={cx + r} y={cy + 16} textAnchor="middle" style={{ font: '600 7px "IBM Plex Mono", monospace', fill: 'var(--color-lab-400)' }}>100</text>
    </svg>
  );
}

/* Signature hero graphic: benchtop glassware + magnet pulling lead particles */
function LabHero() {
  return (
    <svg viewBox="0 0 340 150" className="h-28 w-auto max-w-full sm:h-36" aria-hidden>
      <defs>
        <linearGradient id="liq1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-assay-400)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--color-assay-500)" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="liq2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-magnet-400)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--color-magnet-500)" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      {/* bench line */}
      <line x1="8" y1="132" x2="332" y2="132" stroke="var(--color-lab-600)" strokeWidth="1.6" />
      <line x1="8" y1="137" x2="332" y2="137" stroke="var(--color-lab-300)" strokeWidth="0.8" />
      {/* Erlenmeyer flask */}
      <g stroke="var(--color-lab-700)" strokeWidth="1.6" fill="none" strokeLinejoin="round" strokeLinecap="round">
        <path d="M62 38 h16 M66 38 v26 L48 118 a6 6 0 0 0 5.5 8 h33 a6 6 0 0 0 5.5-8 L74 64 V38" />
        <path d="M57.5 96 L82.5 96 L89 114 a4 4 0 0 1 -3.8 6 h-30 a4 4 0 0 1 -3.8-6 Z" fill="url(#liq1)" stroke="none" />
        <line x1="78" y1="88" x2="84" y2="88" stroke="var(--color-lab-400)" strokeWidth="1" />
        <line x1="80" y1="78" x2="85" y2="78" stroke="var(--color-lab-400)" strokeWidth="1" />
      </g>
      <circle cx="66" cy="106" r="2.4" fill="none" stroke="var(--color-assay-500)" strokeWidth="1" className="anim-bubble" />
      <circle cx="74" cy="112" r="1.7" fill="none" stroke="var(--color-assay-500)" strokeWidth="1" className="anim-bubble" style={{ animationDelay: '1.1s' }} />
      {/* graduated beaker */}
      <g stroke="var(--color-lab-700)" strokeWidth="1.6" fill="none" strokeLinecap="round">
        <path d="M118 52 v66 a8 8 0 0 0 8 8 h30 a8 8 0 0 0 8-8 V52 M114 52 h52" />
        <path d="M120 92 h44 v26 a6 6 0 0 1 -6 6 h-32 a6 6 0 0 1 -6-6 Z" fill="url(#liq2)" stroke="none" />
        <line x1="158" y1="64" x2="164" y2="64" stroke="var(--color-lab-400)" strokeWidth="1" />
        <line x1="158" y1="76" x2="164" y2="76" stroke="var(--color-lab-400)" strokeWidth="1" />
        <line x1="158" y1="88" x2="164" y2="88" stroke="var(--color-lab-400)" strokeWidth="1" />
        <line x1="158" y1="100" x2="164" y2="100" stroke="var(--color-lab-400)" strokeWidth="1" />
      </g>
      <circle cx="134" cy="104" r="2.2" fill="none" stroke="var(--color-magnet-500)" strokeWidth="1" className="anim-bubble" style={{ animationDelay: '0.5s' }} />
      <circle cx="148" cy="110" r="1.6" fill="none" stroke="var(--color-magnet-500)" strokeWidth="1" className="anim-bubble" style={{ animationDelay: '1.7s' }} />
      {/* test tube on stand */}
      <g stroke="var(--color-lab-700)" strokeWidth="1.5" fill="none" strokeLinecap="round">
        <path d="M196 58 v52 a8 8 0 0 0 16 0 V58 M193 58 h22" />
        <path d="M198 90 h12 v20 a6 6 0 0 1 -12 0 Z" fill="url(#liq1)" stroke="none" />
        <path d="M188 126 h32 M192 126 v-8 M216 126 v-8" stroke="var(--color-lab-500)" />
      </g>
      {/* horseshoe magnet pulling lead particles */}
      <g strokeLinecap="round" fill="none">
        <path d="M258 96 v-34 a26 26 0 0 1 52 0 v34" stroke="var(--color-magnet-500)" strokeWidth="13" />
        <path d="M252.5 96 h11 v14 h-11 Z M304.5 96 h11 v14 h-11 Z" fill="var(--color-lab-600)" stroke="var(--color-lab-700)" strokeWidth="1" />
        <path d="M258 122 a26 16 0 0 0 52 0" stroke="var(--color-lab-300)" strokeWidth="1" strokeDasharray="3 3" className="anim-field" />
        <path d="M250 130 a34 22 0 0 0 68 0" stroke="var(--color-lab-300)" strokeWidth="1" strokeDasharray="3 3" className="anim-field" style={{ animationDelay: '0.8s' }} />
      </g>
      <g fill="var(--color-lab-500)">
        <circle cx="270" cy="118" r="2" /><circle cx="284" cy="124" r="2.4" />
        <circle cx="298" cy="117" r="2" /><circle cx="290" cy="110" r="1.6" />
        <circle cx="277" cy="109" r="1.6" fill="var(--color-magnet-500)" />
      </g>
      {/* annotations */}
      <g style={{ font: '600 7px "IBM Plex Mono", monospace', letterSpacing: '0.1em' }} fill="var(--color-lab-500)">
        <text x="40" y="30">FIG.1 — CONCEPT</text>
        <text x="112" y="44">FIG.2 — ASSAY</text>
        <text x="248" y="30" fill="var(--color-magnet-600)">FIG.3 — ATTRACTION</text>
      </g>
      <line x1="66" y1="33" x2="52" y2="26" stroke="var(--color-lab-300)" strokeWidth="0.8" />
    </svg>
  );
}

function ProgressRing({ pct, size = 64 }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-lab-150)" strokeWidth="6" />
      <circle cx="32" cy="32" r={r} fill="none" stroke={pct >= 100 ? 'var(--color-assay-500)' : 'var(--color-magnet-500)'}
        strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`}
        transform="rotate(-90 32 32)" />
      <text x="32" y="36" textAnchor="middle" style={{ font: '700 13px "IBM Plex Mono", monospace', fill: 'var(--color-lab-900)' }}>
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

/* ================================================================== */
/* Main App                                                            */
/* ================================================================== */

export default function App() {
  const [state, setState] = useState(() => {
    try { return normalize(JSON.parse(localStorage.getItem(LS_KEY))); }
    catch { return normalize(null); }
  });
  const [modal, setModal] = useState(() => (state.seenGuide ? null : 'help'));
  const [toast, setToast] = useState(null); // { msg, prev? }
  const [openPrompt, setOpenPrompt] = useState(null);
  const [bus, setBus] = useState(null);
  const toastTimer = useRef(null);
  const fileRef = useRef(null);
  const modalRef = useRef(modal);
  modalRef.current = modal;

  /* autosave (debounced) */
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
    }, 350);
    return () => clearTimeout(t);
  }, [state]);

  /* console bus (PROTOCOL.md) — optional, app stays standalone */
  useEffect(() => {
    if (window.parent === window) return;
    const onMsg = (e) => {
      const d = e.data;
      if (!d || d.bizdev !== 'context' || d.v !== 1) return;
      setBus(d.connectors || null);
    };
    window.addEventListener('message', onMsg);
    try { window.parent.postMessage({ bizdev: 'ready', v: 1, slug: SLUG }, '*'); } catch { /* noop */ }
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const flash = useCallback((msg, prev = null) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, prev });
    toastTimer.current = setTimeout(() => setToast(null), prev ? 7000 : 2600);
  }, []);

  const copyText = useCallback(async (text, okMsg) => {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; }
    catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        ok = document.execCommand('copy'); ta.remove();
      } catch { ok = false; }
    }
    flash(ok ? okMsg : 'Copy failed — select and copy manually.');
  }, [flash]);

  /* keyboard shortcuts */
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
      if (e.key === 'Escape') {
        if (modalRef.current) {
          if (modalRef.current === 'help') setState((s) => ({ ...s, seenGuide: true }));
          setModal(null);
        }
        return;
      }
      if (e.key === '?' && !typing) { e.preventDefault(); setModal('help'); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        copyText(labReportMd(stateRef.current), 'Lab report copied as Markdown.');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [copyText]);

  const stateRef = useRef(state);
  stateRef.current = state;

  /* ------- state mutations ------- */
  const patch = (p) => setState((s) => ({ ...s, ...p }));
  const patchConcept = (id, p) => setState((s) => ({
    ...s,
    concepts: s.concepts.map((c) => (c.id === id ? { ...c, ...(typeof p === 'function' ? p(c) : p) } : c)),
  }));

  const addConcept = () => {
    const c = blankConcept();
    setState((s) => ({ ...s, concepts: [c, ...s.concepts], activeId: s.activeId || c.id }));
    flash('New specimen added to the bench.');
  };

  const deleteConcept = (id) => {
    const prev = stateRef.current;
    const c = prev.concepts.find((x) => x.id === id);
    setState((s) => ({
      ...s,
      concepts: s.concepts.filter((x) => x.id !== id),
      chosenId: s.chosenId === id ? null : s.chosenId,
      activeId: s.activeId === id ? (s.chosenId !== id ? s.chosenId : null) : s.activeId,
    }));
    flash(`Disposed "${c?.title || 'untitled concept'}".`, prev);
  };

  const chooseConcept = (id) => {
    setState((s) => ({ ...s, chosenId: s.chosenId === id ? null : id, activeId: id }));
  };

  const activeConcept = state.concepts.find((c) => c.id === state.activeId)
    || state.concepts.find((c) => c.id === state.chosenId)
    || state.concepts[0]
    || null;

  const chosen = state.concepts.find((c) => c.id === state.chosenId) || null;

  const loadDemo = () => { setState(demoState()); flash('Demo scenario loaded: Ledgerline fractional CFO studio.'); };
  const doReset = () => {
    setState(normalize(null));
    setState((s) => ({ ...s, seenGuide: true }));
    setModal(null);
    flash('Lab sterilized. Fresh bench.');
  };

  const downloadFile = (name, text, type) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 800);
  };

  const importJson = (file) => {
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const next = normalize(JSON.parse(rd.result));
        setState(next); setModal(null);
        flash(`Imported ${next.concepts.length} concept${next.concepts.length === 1 ? '' : 's'}.`);
      } catch { flash('Import failed — not valid Lead Magnet Lab JSON.'); }
    };
    rd.readAsText(file);
  };

  const prompts = useMemo(() => buildPrompts(state, bus), [state, bus]);

  /* ------- derived ------- */
  const visible = useMemo(() => {
    let list = rankedConcepts(state.concepts);
    if (!state.showShelved) list = list.filter((c) => !c.shelved);
    if (state.filterFormat !== 'all') list = list.filter((c) => c.format === state.filterFormat);
    return list;
  }, [state.concepts, state.showShelved, state.filterFormat]);

  const ranks = useMemo(() => {
    const m = new Map();
    rankedConcepts(state.concepts).forEach((c, i) => { if (attractionIndex(c) != null) m.set(c.id, i + 1); });
    return m;
  }, [state.concepts]);

  const topIndex = state.concepts.reduce((m, c) => Math.max(m, attractionIndex(c) ?? 0), 0);

  const TABS = [
    { id: 'bench', n: '01', label: 'Concept Bench', icon: FlaskConical },
    { id: 'outline', n: '02', label: 'Outline Protocol', icon: ListChecks },
    { id: 'copy', n: '03', label: 'Page Label', icon: NotebookPen },
    { id: 'launch', n: '04', label: 'Release Checklist', icon: ClipboardCheck },
  ];

  /* ================================================================ */
  return (
    <div className="lab-ground min-h-screen font-body text-lab-800">
      <div className="app-screen mx-auto max-w-[1400px] px-4 pb-24 pt-5 sm:px-6">

        {/* ============ HERO ============ */}
        <header className="glass relative overflow-hidden rounded-2xl px-5 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="min-w-[260px] flex-1">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-magnet-500 text-white shadow-sm">
                  <Magnet className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h1 className="font-display text-2xl font-extrabold leading-none tracking-tight text-lab-900 sm:text-[1.7rem]">
                    Lead Magnet <span className="text-magnet-600">Lab</span>
                  </h1>
                  <p className="annot mt-1 text-lab-500">Specimen 10 / BizDev-30 series</p>
                </div>
                {bus && (
                  <span className="annot ml-2 rounded-full border border-assay-400/50 bg-assay-100 px-2 py-1 text-assay-700">
                    Console linked
                  </span>
                )}
              </div>
              <p className="mt-3 max-w-xl text-[15px] leading-snug text-lab-600">
                Invent magnet concepts, assay them on <span className="font-semibold text-lab-800">pain × speed-to-value × ease</span>,
                then take the winner from outline to landing page to launch — one bench, no guesswork.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Btn tone="primary" onClick={addConcept}><Plus className="h-4 w-4" aria-hidden />New concept</Btn>
                <Btn onClick={loadDemo}><Pipette className="h-4 w-4" aria-hidden />Load demo</Btn>
                <Btn onClick={() => setModal('reset')}><RotateCcw className="h-4 w-4" aria-hidden />Reset</Btn>
                <Btn onClick={() => setModal('help')}><CircleHelp className="h-4 w-4" aria-hidden />How to use</Btn>
                <Btn tone="dark" onClick={() => setModal('export')}><FileText className="h-4 w-4" aria-hidden />Export</Btn>
              </div>
            </div>
            <div className="hidden shrink-0 md:block"><LabHero /></div>
          </div>
          {/* summary strip */}
          <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-lab-200 bg-lab-200 sm:grid-cols-4">
            {[
              ['Concepts on bench', String(state.concepts.length)],
              ['Top attraction index', state.concepts.length ? `${topIndex}/100` : '--'],
              ['Lead candidate', chosen ? (chosen.title || 'Untitled') : 'None chosen'],
              ['Launch progress', chosen ? `${chosen.checklist.filter((i) => i.done).length}/${chosen.checklist.length} steps` : '--'],
            ].map(([k, v]) => (
              <div key={k} className="bg-white/75 px-3 py-2.5">
                <p className="annot text-lab-400">{k}</p>
                <p className="mt-0.5 truncate font-mono text-sm font-semibold text-lab-800">{v}</p>
              </div>
            ))}
          </div>
        </header>

        {/* ============ TABS ============ */}
        <nav className="mt-5 flex flex-wrap gap-2" aria-label="Lab stages">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => patch({ tab: t.id })}
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${
                state.tab === t.id
                  ? 'border-lab-800 bg-lab-800 text-white shadow-sm'
                  : 'border-lab-200 bg-white/60 text-lab-600 hover:border-lab-300 hover:bg-white'
              }`}>
              <span className={`font-mono text-[11px] ${state.tab === t.id ? 'text-magnet-300' : 'text-magnet-500'}`}>{t.n}</span>
              <t.icon className="h-4 w-4" aria-hidden />{t.label}
            </button>
          ))}
        </nav>

        {/* ============ BODY GRID ============ */}
        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
          <main>
            {state.tab === 'bench' && (
              <BenchView state={state} visible={visible} ranks={ranks}
                patch={patch} patchConcept={patchConcept} addConcept={addConcept}
                deleteConcept={deleteConcept} chooseConcept={chooseConcept} loadDemo={loadDemo} />
            )}
            {state.tab === 'outline' && (
              <OutlineView state={state} concept={activeConcept} patch={patch}
                patchConcept={patchConcept} flash={flash} stateRef={stateRef} setState={setState} />
            )}
            {state.tab === 'copy' && (
              <CopyView state={state} concept={activeConcept} patch={patch} patchConcept={patchConcept} />
            )}
            {state.tab === 'launch' && (
              <LaunchView state={state} concept={activeConcept} patch={patch}
                patchConcept={patchConcept} flash={flash} stateRef={stateRef} setState={setState} />
            )}
          </main>

          {/* ============ COPILOT RAIL ============ */}
          <aside className="space-y-4">
            <section className="glass rounded-2xl p-5">
              <p className="annot text-lab-400">Field notes</p>
              <h2 className="mt-1 font-display text-lg font-extrabold text-lab-900">Lab context</h2>
              <p className="mt-1 text-xs leading-snug text-lab-500">Feeds every Copilot prompt below. Sharper context, sharper output.</p>
              <label className="annot mt-3 block text-lab-500" htmlFor="ctx-icp">Your ICP</label>
              <textarea id="ctx-icp" rows={3} value={state.context.icp}
                onChange={(e) => patch({ context: { ...state.context, icp: e.target.value } })}
                placeholder="Who exactly? e.g. Seed-stage B2B SaaS founders, 5–40 people, no finance leader…"
                className="mt-1 w-full rounded-lg border border-lab-200 bg-white/80 p-2.5 text-sm text-lab-800 placeholder:text-lab-300" />
              <label className="annot mt-2 block text-lab-500" htmlFor="ctx-offer">Your offer</label>
              <textarea id="ctx-offer" rows={2} value={state.context.offer}
                onChange={(e) => patch({ context: { ...state.context, offer: e.target.value } })}
                placeholder="What the magnet ultimately sells, e.g. Fractional CFO retainer from $2.5k/mo"
                className="mt-1 w-full rounded-lg border border-lab-200 bg-white/80 p-2.5 text-sm text-lab-800 placeholder:text-lab-300" />
            </section>

            <section className="glass-strong rounded-2xl p-5">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-lab-800 text-magnet-300">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h2 className="font-display text-lg font-extrabold leading-none text-lab-900">Claude Copilot</h2>
                  <p className="annot mt-1 text-lab-400">Prompt synthesis unit</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-snug text-lab-500">
                Each action compiles your live lab state into a ready-to-run prompt.
                Paste it into <span className="font-mono font-semibold text-lab-700">claude.ai</span> — works with the standard $20 Claude subscription, no API key.
              </p>
              <div className="mt-4 space-y-2.5">
                {prompts.map((p) => (
                  <div key={p.id} className="overflow-hidden rounded-xl border border-lab-200 bg-white/70">
                    <button type="button"
                      onClick={() => setOpenPrompt(openPrompt === p.id ? null : p.id)}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-lab-50"
                      aria-expanded={openPrompt === p.id}>
                      <p.icon className="h-4 w-4 shrink-0 text-magnet-500" aria-hidden />
                      <span className="flex-1">
                        <span className="block text-sm font-bold text-lab-800">{p.title}</span>
                        <span className="block text-[11px] leading-snug text-lab-500">{p.desc}</span>
                      </span>
                      <ChevronRight className={`h-4 w-4 shrink-0 text-lab-400 transition-transform ${openPrompt === p.id ? 'rotate-90' : ''}`} aria-hidden />
                    </button>
                    {openPrompt === p.id && (
                      <div className="border-t border-lab-150 bg-lab-50/70 p-3">
                        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-lab-200 bg-white p-2.5 font-mono text-[10.5px] leading-relaxed text-lab-700">{p.prompt}</pre>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <Btn tone="primary" onClick={() => copyText(p.prompt, 'Prompt copied — paste into claude.ai.')}>
                            <Copy className="h-3.5 w-3.5" aria-hidden />Copy prompt
                          </Btn>
                          <span className="font-mono text-[10px] text-lab-400">{p.prompt.length.toLocaleString()} chars</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <label className="annot mt-4 block text-lab-500" htmlFor="copilot-notes">Results log — paste Claude&rsquo;s findings</label>
              <textarea id="copilot-notes" rows={4} value={state.copilotNotes}
                onChange={(e) => patch({ copilotNotes: e.target.value })}
                placeholder="Paste the useful parts of Claude's answer here. Saved with your lab."
                className="mt-1 w-full rounded-lg border border-lab-200 bg-white/80 p-2.5 font-mono text-xs text-lab-800 placeholder:text-lab-300" />
            </section>
          </aside>
        </div>
      </div>

      {/* ============ TOAST ============ */}
      {toast && (
        <div className="anim-toast fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-lab-700 bg-lab-900 px-4 py-2.5 text-sm text-lab-50 shadow-2xl">
          <TestTube className="h-4 w-4 text-magnet-400" aria-hidden />
          <span className="max-w-[70vw] truncate">{toast.msg}</span>
          {toast.prev && (
            <button type="button"
              onClick={() => { setState(toast.prev); setToast(null); }}
              className="inline-flex items-center gap-1 rounded-md bg-magnet-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-magnet-400">
              <Undo2 className="h-3.5 w-3.5" aria-hidden />Undo
            </button>
          )}
        </div>
      )}

      {/* ============ MODALS ============ */}
      {modal === 'help' && (
        <Modal title="How to run the lab" kicker="Standard operating procedure" wide
          onClose={() => { setModal(null); setState((s) => ({ ...s, seenGuide: true })); }}>
          <ol className="list-none space-y-2.5">
            {[
              ['Set your lab context', 'In the right rail, write who your ICP is and what your paid offer is. Every score and every Copilot prompt gets sharper with this filled in.'],
              ['Invent concepts on the Bench', 'Add magnet concepts (or Load demo to see a finished lab). Give each a title, format, one-sentence promise, and build effort.'],
              ['Assay each concept', 'Score pain relevance, speed-to-value, and ease 1–5. The dial computes the Attraction Index (pain × speed × ease, scaled to 100). Concepts auto-rank.'],
              ['Choose your lead candidate', 'Hit the magnet button on the winner. The Outline, Label, and Release stages now work on that concept.'],
              ['Build the Outline Protocol', 'Draft 6–9 sections with bullet notes. Reorder with the arrows until the magnet delivers one fast win.'],
              ['Write the Page Label', 'Fill headline, subhead, bullets, CTA, proof, and microcopy — the live preview shows your opt-in page as you type.'],
              ['Run the Release Checklist', 'Work the launch list from Build to Follow-up. The ring tracks completion.'],
              ['Ship with Claude', 'Use the Copilot actions to generate ideas, outlines, copy, and a brutal peer review. Copy a prompt, paste into claude.ai, then log the findings.'],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-lab-800 font-mono text-[11px] font-bold text-magnet-300">{i + 1}</span>
                <p className="text-sm leading-snug text-lab-700"><span className="font-bold text-lab-900">{t}.</span> {d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-5 rounded-xl border border-lab-200 bg-lab-50/80 p-4">
            <p className="annot text-lab-500">Keyboard shortcuts</p>
            <div className="mt-2 grid grid-cols-1 gap-1.5 font-mono text-xs text-lab-700 sm:grid-cols-3">
              <p><kbd className="rounded border border-lab-300 bg-white px-1.5 py-0.5">?</kbd> open this guide</p>
              <p><kbd className="rounded border border-lab-300 bg-white px-1.5 py-0.5">Ctrl/Cmd+S</kbd> copy lab report</p>
              <p><kbd className="rounded border border-lab-300 bg-white px-1.5 py-0.5">Esc</kbd> close dialogs</p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Btn tone="primary" onClick={() => { setModal(null); setState((s) => ({ ...s, seenGuide: true })); }}>
              <Check className="h-4 w-4" aria-hidden />To the bench
            </Btn>
          </div>
        </Modal>
      )}

      {modal === 'reset' && (
        <Modal title="Sterilize the lab?" kicker="Irreversible procedure" onClose={() => setModal(null)}>
          <p className="text-sm leading-snug text-lab-600">
            This clears every concept, outline, copy block, and checklist from this browser.
            Download a JSON backup first if any of it matters.
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Btn onClick={() => downloadFile('lead-magnet-lab-backup.json', JSON.stringify(state, null, 2), 'application/json')}>
              <Download className="h-4 w-4" aria-hidden />Backup JSON first
            </Btn>
            <Btn onClick={() => setModal(null)}>Cancel</Btn>
            <Btn tone="primary" onClick={doReset}><RotateCcw className="h-4 w-4" aria-hidden />Yes, wipe it</Btn>
          </div>
        </Modal>
      )}

      {modal === 'export' && (
        <Modal title="Export & import" kicker="Sample transfer" onClose={() => setModal(null)}>
          <div className="space-y-2.5">
            <button type="button" onClick={() => { copyText(labReportMd(state), 'Lab report copied as Markdown.'); }}
              className="flex w-full items-center gap-3 rounded-xl border border-lab-200 bg-white/70 px-4 py-3 text-left hover:border-lab-300 hover:bg-white">
              <Copy className="h-4 w-4 shrink-0 text-magnet-500" aria-hidden />
              <span><span className="block text-sm font-bold text-lab-800">Copy lab report (Markdown)</span>
                <span className="block text-xs text-lab-500">Board table + full workup of the lead candidate. Also on Ctrl/Cmd+S.</span></span>
            </button>
            <button type="button" onClick={() => downloadFile('lead-magnet-lab.json', JSON.stringify(state, null, 2), 'application/json')}
              className="flex w-full items-center gap-3 rounded-xl border border-lab-200 bg-white/70 px-4 py-3 text-left hover:border-lab-300 hover:bg-white">
              <Download className="h-4 w-4 shrink-0 text-magnet-500" aria-hidden />
              <span><span className="block text-sm font-bold text-lab-800">Download JSON (full state)</span>
                <span className="block text-xs text-lab-500">Complete backup — re-import it here or on another machine.</span></span>
            </button>
            <button type="button" onClick={() => downloadFile('lead-magnet-scoreboard.csv', boardCsv(state.concepts), 'text/csv')}
              className="flex w-full items-center gap-3 rounded-xl border border-lab-200 bg-white/70 px-4 py-3 text-left hover:border-lab-300 hover:bg-white">
              <FileText className="h-4 w-4 shrink-0 text-magnet-500" aria-hidden />
              <span><span className="block text-sm font-bold text-lab-800">Download scoreboard CSV</span>
                <span className="block text-xs text-lab-500">Ranked concepts with all three scores — for your spreadsheet.</span></span>
            </button>
            <button type="button" onClick={() => window.print()}
              className="flex w-full items-center gap-3 rounded-xl border border-lab-200 bg-white/70 px-4 py-3 text-left hover:border-lab-300 hover:bg-white">
              <Printer className="h-4 w-4 shrink-0 text-magnet-500" aria-hidden />
              <span><span className="block text-sm font-bold text-lab-800">Print lab report</span>
                <span className="block text-xs text-lab-500">A clean, paper-ready report of the board and lead candidate.</span></span>
            </button>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-lab-300 bg-lab-50/60 px-4 py-3 text-left hover:border-lab-400 hover:bg-lab-50">
              <Upload className="h-4 w-4 shrink-0 text-assay-600" aria-hidden />
              <span><span className="block text-sm font-bold text-lab-800">Import JSON</span>
                <span className="block text-xs text-lab-500">Restores a backup. Runs through validation — corrupt files are rejected safely.</span></span>
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Import JSON file"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
          </div>
        </Modal>
      )}

      <PrintReport state={state} />
    </div>
  );
}

/* ================================================================== */
/* Bench view — concepts board                                         */
/* ================================================================== */

function BenchView({ state, visible, ranks, patch, patchConcept, addConcept, deleteConcept, chooseConcept, loadDemo }) {
  if (!state.concepts.length) {
    return (
      <div className="glass grid place-items-center rounded-2xl px-6 py-16 text-center">
        <FlaskConical className="h-10 w-10 text-lab-300" aria-hidden />
        <h2 className="mt-4 font-display text-xl font-extrabold text-lab-900">The bench is empty</h2>
        <p className="mt-2 max-w-md text-sm leading-snug text-lab-500">
          A great lead magnet is invented, not brainstormed. Add your first concept —
          a format, a promise, an effort guess — then assay it against the others.
          Or load the demo to see a finished experiment.
        </p>
        <div className="mt-5 flex gap-2">
          <Btn tone="primary" onClick={addConcept}><Plus className="h-4 w-4" aria-hidden />First concept</Btn>
          <Btn onClick={loadDemo}><Pipette className="h-4 w-4" aria-hidden />Load demo</Btn>
        </div>
      </div>
    );
  }

  const shelvedCount = state.concepts.filter((c) => c.shelved).length;

  return (
    <div>
      {/* filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="annot text-lab-400">Filter</span>
        <select value={state.filterFormat} onChange={(e) => patch({ filterFormat: e.target.value })}
          aria-label="Filter by format"
          className="rounded-lg border border-lab-200 bg-white/80 px-2.5 py-1.5 text-xs font-semibold text-lab-700">
          <option value="all">All formats</option>
          {FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <button type="button" onClick={() => patch({ showShelved: !state.showShelved })}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            state.showShelved ? 'border-lab-700 bg-lab-800 text-white' : 'border-lab-200 bg-white/70 text-lab-600 hover:bg-white'
          }`}>
          <Archive className="h-3.5 w-3.5" aria-hidden />Shelved ({shelvedCount})
        </button>
        <span className="ml-auto font-mono text-[11px] text-lab-400">ranked by Attraction Index</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((c) => (
          <ConceptCard key={c.id} c={c} rank={ranks.get(c.id)}
            isChosen={state.chosenId === c.id}
            onPatch={(p) => patchConcept(c.id, p)}
            onChoose={() => chooseConcept(c.id)}
            onDelete={() => deleteConcept(c.id)}
            onOpen={(tab) => patch({ activeId: c.id, tab })} />
        ))}
      </div>
      {!visible.length && (
        <div className="glass rounded-2xl p-8 text-center text-sm text-lab-500">
          Nothing matches this filter. Clear it, or un-shelve something worth another look.
        </div>
      )}
    </div>
  );
}

function ConceptCard({ c, rank, isChosen, onPatch, onChoose, onDelete, onOpen }) {
  const ix = attractionIndex(c);
  return (
    <article className={`glass relative rounded-2xl p-4 transition-shadow ${isChosen ? 'outline-2 outline-magnet-500' : ''}`}>
      {isChosen && (
        <span className="annot absolute -top-2.5 left-4 rounded-full bg-magnet-500 px-2.5 py-1 text-white shadow-sm">
          Lead candidate
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-lab-100 font-mono text-[11px] font-bold text-lab-600">
            {rank ? `#${rank}` : '--'}
          </span>
          <select value={c.format} onChange={(e) => onPatch({ format: e.target.value })}
            aria-label="Magnet format"
            className="rounded-md border border-lab-200 bg-white/80 px-1.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-lab-600">
            {FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          {c.shelved && <span className="annot rounded bg-lab-100 px-1.5 py-0.5 text-lab-500">shelved</span>}
        </div>
        <div className="flex items-center gap-0.5">
          <IconBtn label={isChosen ? 'Unset lead candidate' : 'Choose as lead candidate'} onClick={onChoose}
            className={isChosen ? 'text-magnet-500' : ''}>
            <Magnet className="h-4 w-4" />
          </IconBtn>
          <IconBtn label={c.shelved ? 'Return to bench' : 'Shelve concept'} onClick={() => onPatch({ shelved: !c.shelved })}>
            <Archive className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="Dispose of concept" onClick={onDelete} className="hover:text-magnet-600">
            <Trash2 className="h-4 w-4" />
          </IconBtn>
        </div>
      </div>

      <input value={c.title} onChange={(e) => onPatch({ title: e.target.value })}
        placeholder="Name the magnet — specific beats clever"
        aria-label="Concept title"
        className="mt-2.5 w-full rounded-lg border border-transparent bg-transparent font-display text-lg font-extrabold tracking-tight text-lab-900 placeholder:text-lab-300 hover:border-lab-150 focus:border-lab-200 focus:bg-white/70 px-1 py-0.5" />
      <textarea value={c.promise} onChange={(e) => onPatch({ promise: e.target.value })} rows={2}
        placeholder="The promise: what does the prospect walk away with in 30 minutes?"
        aria-label="Concept promise"
        className="mt-1 w-full resize-none rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm leading-snug text-lab-600 placeholder:text-lab-300 hover:border-lab-150 focus:border-lab-200 focus:bg-white/70" />

      <div className="mt-2 flex items-center gap-2">
        <span className="annot text-lab-400">Effort</span>
        <div className="flex overflow-hidden rounded-md border border-lab-200">
          {['S', 'M', 'L'].map((e) => (
            <button key={e} type="button" onClick={() => onPatch({ effort: e })} title={EFFORTS[e]}
              className={`px-2.5 py-1 font-mono text-[11px] font-bold transition-colors ${
                c.effort === e ? 'bg-lab-800 text-white' : 'bg-white/70 text-lab-500 hover:bg-lab-50'
              }`}>{e}</button>
          ))}
        </div>
        <span className="hidden font-mono text-[10px] text-lab-400 sm:inline">{EFFORTS[c.effort]}</span>
      </div>

      <div className="mt-3 flex items-end gap-4 rounded-xl border border-lab-150 bg-white/60 p-3">
        <div className="flex-1 space-y-2">
          {SCORE_AXES.map((ax) => (
            <div key={ax.key} className="flex items-center gap-2" title={ax.hint}>
              <span className="w-[7.2rem] shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wider text-lab-500">{ax.label}</span>
              <input type="range" min={0} max={5} step={1} value={c.scores[ax.key]}
                aria-label={`${ax.label} score`}
                onChange={(e) => onPatch({ scores: { ...c.scores, [ax.key]: Number(e.target.value) } })}
                className="assay-range flex-1" />
              <span className={`w-6 text-right font-mono text-xs font-bold ${c.scores[ax.key] ? 'text-lab-800' : 'text-lab-300'}`}>
                {c.scores[ax.key] || '-'}
              </span>
            </div>
          ))}
        </div>
        <AssayDial value={ix} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Btn onClick={() => onOpen('outline')} className="!px-2.5 !py-1 !text-xs">
          <ListChecks className="h-3.5 w-3.5" aria-hidden />Outline {c.outline.length ? `(${c.outline.length})` : ''}
        </Btn>
        <Btn onClick={() => onOpen('copy')} className="!px-2.5 !py-1 !text-xs">
          <NotebookPen className="h-3.5 w-3.5" aria-hidden />Label {c.copy.headline ? '(drafted)' : ''}
        </Btn>
        <Btn onClick={() => onOpen('launch')} className="!px-2.5 !py-1 !text-xs">
          <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />{c.checklist.filter((i) => i.done).length}/{c.checklist.length}
        </Btn>
      </div>
    </article>
  );
}

/* ================================================================== */
/* Concept picker shared by stage views                                */
/* ================================================================== */

function StageHeader({ state, concept, patch, stageNo, title, blurb }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="annot text-magnet-600">Stage {stageNo}</p>
        <h2 className="font-display text-xl font-extrabold tracking-tight text-lab-900">{title}</h2>
        <p className="mt-1 max-w-xl text-sm leading-snug text-lab-500">{blurb}</p>
      </div>
      {state.concepts.length > 0 && (
        <label className="flex items-center gap-2">
          <span className="annot text-lab-400">Working on</span>
          <select value={concept?.id || ''} onChange={(e) => patch({ activeId: e.target.value })}
            aria-label="Select concept to work on"
            className="max-w-56 rounded-lg border border-lab-200 bg-white/80 px-2.5 py-1.5 text-sm font-semibold text-lab-800">
            {rankedConcepts(state.concepts).map((c) => (
              <option key={c.id} value={c.id}>
                {(state.chosenId === c.id ? '* ' : '') + (c.title || 'Untitled concept')}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

function NoConceptCoach({ icon: Icon, text }) {
  return (
    <div className="glass grid place-items-center rounded-2xl px-6 py-14 text-center">
      <Icon className="h-9 w-9 text-lab-300" aria-hidden />
      <p className="mt-3 max-w-md text-sm leading-snug text-lab-500">{text}</p>
    </div>
  );
}

/* ================================================================== */
/* Outline view                                                        */
/* ================================================================== */

function OutlineView({ state, concept, patch, patchConcept, flash, stateRef, setState }) {
  if (!concept) {
    return <NoConceptCoach icon={ListChecks}
      text="No concept to outline yet. Go to the Concept Bench, add or choose a magnet, then come back to draft its sections." />;
  }
  const sections = concept.outline;

  const addSection = () => patchConcept(concept.id, (c) => ({
    outline: [...c.outline, { id: uid(), heading: '', bullets: '' }],
  }));
  const patchSection = (sid, p) => patchConcept(concept.id, (c) => ({
    outline: c.outline.map((s) => (s.id === sid ? { ...s, ...p } : s)),
  }));
  const move = (i, dir) => patchConcept(concept.id, (c) => {
    const arr = [...c.outline];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return {};
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return { outline: arr };
  });
  const removeSection = (sid) => {
    const prev = stateRef.current;
    const s = sections.find((x) => x.id === sid);
    patchConcept(concept.id, (c) => ({ outline: c.outline.filter((x) => x.id !== sid) }));
    flash(`Removed section "${s?.heading || 'untitled'}".`, prev);
  };

  return (
    <div>
      <StageHeader state={state} concept={concept} patch={patch} stageNo="02" title="Outline Protocol"
        blurb="6–9 sections, each earning its place. Every section should hand the reader one fast win — cut anything that merely explains." />
      <div className={`mb-3 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-[11px] font-semibold ${
        sections.length >= 6 && sections.length <= 9
          ? 'border-assay-400/50 bg-assay-100 text-assay-700'
          : 'border-lab-200 bg-white/70 text-lab-500'
      }`}>
        <Target className="h-3.5 w-3.5" aria-hidden />
        {sections.length} section{sections.length === 1 ? '' : 's'} — target 6–9
      </div>

      {!sections.length && (
        <div className="glass mb-4 rounded-2xl px-6 py-10 text-center">
          <p className="mx-auto max-w-md text-sm leading-snug text-lab-500">
            Blank protocol. Start with the classic arc: the quick start, the core asset,
            the mistakes to avoid, and a soft bridge to your offer. Or run the
            <span className="font-semibold text-lab-700"> Outline the lead candidate</span> Copilot action and paste the results in.
          </p>
        </div>
      )}

      <ol className="space-y-3">
        {sections.map((s, i) => (
          <li key={s.id} className="glass rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-lab-800 font-mono text-[11px] font-bold text-magnet-300">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0 flex-1">
                <input value={s.heading} onChange={(e) => patchSection(s.id, { heading: e.target.value })}
                  placeholder="Section heading — say the payoff, not the topic"
                  aria-label={`Section ${i + 1} heading`}
                  className="w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 font-display text-base font-bold text-lab-900 placeholder:text-lab-300 hover:border-lab-150 focus:border-lab-200 focus:bg-white/70" />
                <textarea value={s.bullets} onChange={(e) => patchSection(s.id, { bullets: e.target.value })}
                  rows={Math.max(2, s.bullets.split('\n').length)}
                  placeholder={'One bullet per line:\nWhat exactly goes in this section\nThe one thing the reader can do after it'}
                  aria-label={`Section ${i + 1} bullets`}
                  className="mt-1 w-full resize-y rounded-lg border border-lab-150 bg-white/70 p-2.5 font-mono text-xs leading-relaxed text-lab-700 placeholder:text-lab-300" />
              </div>
              <div className="flex shrink-0 flex-col gap-0.5">
                <IconBtn label="Move section up" onClick={() => move(i, -1)} disabled={i === 0}
                  className={i === 0 ? 'opacity-30' : ''}><ChevronUp className="h-4 w-4" /></IconBtn>
                <IconBtn label="Move section down" onClick={() => move(i, 1)} disabled={i === sections.length - 1}
                  className={i === sections.length - 1 ? 'opacity-30' : ''}><ChevronDown className="h-4 w-4" /></IconBtn>
                <IconBtn label="Delete section" onClick={() => removeSection(s.id)} className="hover:text-magnet-600">
                  <Trash2 className="h-4 w-4" /></IconBtn>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <Btn tone="primary" onClick={addSection} className="mt-3"><Plus className="h-4 w-4" aria-hidden />Add section</Btn>
    </div>
  );
}

/* ================================================================== */
/* Copy (Label) view                                                   */
/* ================================================================== */

function CharCount({ value, max }) {
  const n = value.length;
  return (
    <span className={`font-mono text-[10px] ${n > max ? 'font-bold text-magnet-600' : 'text-lab-400'}`}>
      {n}/{max}
    </span>
  );
}

function CopyView({ state, concept, patch, patchConcept }) {
  if (!concept) {
    return <NoConceptCoach icon={NotebookPen}
      text="Nothing to label yet. Choose a concept on the Bench first — then write the opt-in page that sells the download." />;
  }
  const cp = concept.copy;
  const setCopy = (p) => patchConcept(concept.id, (c) => ({ copy: { ...c.copy, ...p } }));
  const setBullet = (i, v) => setCopy({ bullets: cp.bullets.map((b, j) => (j === i ? v : b)) });

  const field = 'w-full rounded-lg border border-lab-200 bg-white/80 p-2.5 text-sm text-lab-800 placeholder:text-lab-300';

  return (
    <div>
      <StageHeader state={state} concept={concept} patch={patch} stageNo="03" title="Page Label"
        blurb="The landing page copy blocks. Write outcomes, not formats — the live specimen label on the right renders as you type." />
      <div className="grid gap-4 lg:grid-cols-2">
        {/* form */}
        <div className="glass space-y-3.5 rounded-2xl p-5">
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="cp-headline" className="annot text-lab-500">Headline</label>
              <CharCount value={cp.headline} max={60} />
            </div>
            <input id="cp-headline" value={cp.headline} onChange={(e) => setCopy({ headline: e.target.value })}
              placeholder="Lead with the outcome or the fear — never the format" className={`mt-1 ${field} font-display text-base font-bold`} />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="cp-subhead" className="annot text-lab-500">Subhead</label>
              <CharCount value={cp.subhead} max={160} />
            </div>
            <textarea id="cp-subhead" rows={2} value={cp.subhead} onChange={(e) => setCopy({ subhead: e.target.value })}
              placeholder="Make the promise concrete: what they get, how fast" className={`mt-1 ${field}`} />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="annot text-lab-500">Benefit bullets</span>
              <span className={`font-mono text-[10px] ${cp.bullets.length >= 3 && cp.bullets.length <= 5 ? 'text-assay-600' : 'text-lab-400'}`}>
                {cp.bullets.length} of 3–5
              </span>
            </div>
            <div className="mt-1 space-y-1.5">
              {cp.bullets.map((b, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 shrink-0 text-magnet-500" aria-hidden />
                  <input value={b} onChange={(e) => setBullet(i, e.target.value)}
                    aria-label={`Benefit bullet ${i + 1}`}
                    placeholder="A specific deliverable or aha — no feature-speak" className={field} />
                  <IconBtn label={`Remove bullet ${i + 1}`}
                    onClick={() => setCopy({ bullets: cp.bullets.filter((_, j) => j !== i) })}
                    className="hover:text-magnet-600"><X className="h-3.5 w-3.5" /></IconBtn>
                </div>
              ))}
              <Btn onClick={() => setCopy({ bullets: [...cp.bullets, ''] })} className="!px-2.5 !py-1 !text-xs">
                <Plus className="h-3.5 w-3.5" aria-hidden />Add bullet
              </Btn>
            </div>
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div>
              <label htmlFor="cp-cta" className="annot text-lab-500">CTA button</label>
              <input id="cp-cta" value={cp.cta} onChange={(e) => setCopy({ cta: e.target.value })}
                placeholder="Get the calculator" className={`mt-1 ${field} font-semibold`} />
            </div>
            <div>
              <label htmlFor="cp-proof" className="annot text-lab-500">Proof line</label>
              <input id="cp-proof" value={cp.proof} onChange={(e) => setCopy({ proof: e.target.value })}
                placeholder="Who is this from, and why trust it" className={`mt-1 ${field}`} />
            </div>
          </div>
          <div>
            <label htmlFor="cp-micro" className="annot text-lab-500">Form microcopy</label>
            <input id="cp-micro" value={cp.micro} onChange={(e) => setCopy({ micro: e.target.value })}
              placeholder="Instant delivery. One email, no spam, unsubscribe anytime." className={`mt-1 ${field}`} />
          </div>
        </div>

        {/* live preview */}
        <div>
          <p className="annot mb-2 flex items-center gap-1.5 text-lab-400"><Eye className="h-3.5 w-3.5" aria-hidden />Live specimen label</p>
          <div className="glass-strong overflow-hidden rounded-2xl">
            <div className="h-1.5 bg-magnet-500" />
            <div className="px-6 py-7">
              <p className="annot text-magnet-600">{formatLabel(concept.format)} · Free</p>
              <h3 className="mt-2 font-display text-2xl font-extrabold leading-tight tracking-tight text-lab-900">
                {cp.headline || <span className="text-lab-300">Your headline lands here</span>}
              </h3>
              <p className="mt-2.5 text-sm leading-snug text-lab-600">
                {cp.subhead || <span className="text-lab-300">Subhead: the concrete promise, and how fast they get it.</span>}
              </p>
              <ul className="mt-4 space-y-1.5">
                {(cp.bullets.length ? cp.bullets : ['Benefit bullet one', 'Benefit bullet two', 'Benefit bullet three']).map((b, i) => (
                  <li key={i} className={`flex items-start gap-2 text-sm ${cp.bullets.length ? 'text-lab-700' : 'text-lab-300'}`}>
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-magnet-500" aria-hidden />{b || '…'}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <div className="flex-1 rounded-lg border border-lab-200 bg-white px-3 py-2.5 text-sm text-lab-300">you@company.com</div>
                <div className="rounded-lg bg-magnet-500 px-5 py-2.5 text-center text-sm font-bold text-white shadow-sm">
                  {cp.cta || 'Get it free'}
                </div>
              </div>
              <p className="mt-2 text-[11px] text-lab-400">{cp.micro || 'Form microcopy appears here.'}</p>
              {cp.proof && (
                <p className="mt-4 flex items-start gap-1.5 border-t border-lab-150 pt-3 text-xs italic text-lab-500">
                  <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lab-300" aria-hidden />{cp.proof}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Launch view                                                         */
/* ================================================================== */

function LaunchView({ state, concept, patch, patchConcept, flash, stateRef }) {
  const [newItem, setNewItem] = useState('');
  const [newGroup, setNewGroup] = useState('Build');
  if (!concept) {
    return <NoConceptCoach icon={ClipboardCheck}
      text="No release to run. Choose a lead candidate on the Bench and its launch checklist will be waiting here." />;
  }
  const items = concept.checklist;
  const done = items.filter((i) => i.done).length;
  const pct = items.length ? (done / items.length) * 100 : 0;

  const toggle = (id) => patchConcept(concept.id, (c) => ({
    checklist: c.checklist.map((i) => (i.id === id ? { ...i, done: !i.done } : i)),
  }));
  const remove = (id) => {
    const prev = stateRef.current;
    const it = items.find((x) => x.id === id);
    patchConcept(concept.id, (c) => ({ checklist: c.checklist.filter((i) => i.id !== id) }));
    flash(`Removed "${it?.label || 'item'}" from the checklist.`, prev);
  };
  const add = () => {
    const label = newItem.trim();
    if (!label) return;
    patchConcept(concept.id, (c) => ({
      checklist: [...c.checklist, { id: uid(), group: newGroup, label, done: false }],
    }));
    setNewItem('');
  };

  return (
    <div>
      <StageHeader state={state} concept={concept} patch={patch} stageNo="04" title="Release Checklist"
        blurb="From built asset to booked calls. Work top to bottom — Distribution and Follow-up are where most magnets quietly die." />
      <div className="glass mb-4 flex items-center gap-4 rounded-2xl p-4">
        <ProgressRing pct={pct} />
        <div>
          <p className="font-display text-lg font-extrabold text-lab-900">{done} of {items.length} steps complete</p>
          <p className="mt-0.5 text-sm text-lab-500">
            {pct >= 100 ? 'Released. Watch the opt-in rate and iterate the headline.'
              : pct >= 50 ? 'Past the halfway mark — do not stall before Distribution.'
              : 'Early stage. Ship scrappy; polish after the first 100 visitors.'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CHECKLIST_GROUPS.map((g) => {
          const gi = items.filter((i) => i.group === g);
          return (
            <section key={g} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <h3 className="annot text-magnet-600">{g}</h3>
                <span className="font-mono text-[10px] text-lab-400">{gi.filter((i) => i.done).length}/{gi.length}</span>
              </div>
              <ul className="mt-2.5 space-y-1">
                {gi.map((i) => (
                  <li key={i.id} className="group flex items-start gap-2 rounded-lg px-1 py-1 hover:bg-white/70">
                    <button type="button" onClick={() => toggle(i.id)} role="checkbox" aria-checked={i.done}
                      aria-label={`Mark "${i.label}" ${i.done ? 'not done' : 'done'}`}
                      className={`mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded border transition-colors ${
                        i.done ? 'border-assay-500 bg-assay-500 text-white' : 'border-lab-300 bg-white hover:border-lab-400'
                      }`}>
                      {i.done && <Check className="h-3 w-3" aria-hidden />}
                    </button>
                    <span className={`flex-1 text-sm leading-snug ${i.done ? 'text-lab-400 line-through' : 'text-lab-700'}`}>{i.label}</span>
                    <IconBtn label={`Delete "${i.label}"`} onClick={() => remove(i.id)}
                      className="opacity-0 group-hover:opacity-100 hover:text-magnet-600 focus-visible:opacity-100">
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconBtn>
                  </li>
                ))}
                {!gi.length && <li className="px-1 py-1 text-xs text-lab-300">No steps in this phase.</li>}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="glass mt-4 flex flex-wrap items-center gap-2 rounded-2xl p-4">
        <select value={newGroup} onChange={(e) => setNewGroup(e.target.value)} aria-label="Checklist phase"
          className="rounded-lg border border-lab-200 bg-white/80 px-2.5 py-2 text-xs font-semibold text-lab-700">
          {CHECKLIST_GROUPS.map((g) => <option key={g}>{g}</option>)}
        </select>
        <input value={newItem} onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          placeholder="Add a launch step…" aria-label="New checklist step"
          className="min-w-40 flex-1 rounded-lg border border-lab-200 bg-white/80 px-3 py-2 text-sm text-lab-800 placeholder:text-lab-300" />
        <Btn tone="primary" onClick={add}><Plus className="h-4 w-4" aria-hidden />Add step</Btn>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Print-only lab report                                               */
/* ================================================================== */

function PrintReport({ state }) {
  const chosen = state.concepts.find((c) => c.id === state.chosenId);
  const ranked = rankedConcepts(state.concepts);
  return (
    <div id="print-report">
      <p className="annot">Lead Magnet Lab — lab report</p>
      <h1>Lead magnet program: findings &amp; lead candidate</h1>
      <p><strong>ICP:</strong> {state.context.icp || 'not set'}<br />
        <strong>Offer:</strong> {state.context.offer || 'not set'}</p>
      <h2>Concept assay board</h2>
      <table>
        <thead><tr><th>#</th><th>Concept</th><th>Format</th><th>Effort</th><th>Pain</th><th>Speed</th><th>Ease</th><th>Index</th></tr></thead>
        <tbody>
          {ranked.map((c, i) => (
            <tr key={c.id}>
              <td>{i + 1}</td><td>{c.title || 'Untitled'}{c.shelved ? ' (shelved)' : ''}</td>
              <td>{formatLabel(c.format)}</td><td>{c.effort}</td>
              <td>{c.scores.pain || '–'}</td><td>{c.scores.speed || '–'}</td><td>{c.scores.ease || '–'}</td>
              <td>{attractionIndex(c) ?? '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {chosen && (
        <>
          <h2>Lead candidate: {chosen.title || 'Untitled'}</h2>
          <p><strong>Format:</strong> {formatLabel(chosen.format)} · <strong>Effort:</strong> {EFFORTS[chosen.effort]}<br />
            <strong>Promise:</strong> {chosen.promise || '—'}</p>
          {chosen.outline.length > 0 && (
            <>
              <h2>Outline</h2>
              <ol>
                {chosen.outline.map((s) => (
                  <li key={s.id}><strong>{s.heading || 'Untitled section'}</strong>
                    <ul>{s.bullets.split('\n').filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}</ul>
                  </li>
                ))}
              </ol>
            </>
          )}
          {(chosen.copy.headline || chosen.copy.cta) && (
            <>
              <h2>Landing page copy</h2>
              <p><strong>Headline:</strong> {chosen.copy.headline || '—'}<br />
                <strong>Subhead:</strong> {chosen.copy.subhead || '—'}</p>
              <ul>{chosen.copy.bullets.filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}</ul>
              <p><strong>CTA:</strong> {chosen.copy.cta || '—'} · <strong>Proof:</strong> {chosen.copy.proof || '—'}<br />
                <strong>Microcopy:</strong> {chosen.copy.micro || '—'}</p>
            </>
          )}
          <h2>Launch checklist</h2>
          <ul>
            {chosen.checklist.map((i) => <li key={i.id}>[{i.done ? 'x' : ' '}] {i.group}: {i.label}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}
