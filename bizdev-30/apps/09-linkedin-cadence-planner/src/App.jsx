import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles, Copy, Check, Download, Upload, HelpCircle, RotateCcw, Plus, Trash2, X,
  ChevronLeft, ChevronRight, Undo2, Printer, FileJson, FileText, MessageSquare,
  Repeat2, Search, PenLine, CalendarDays, ClipboardList, Zap, Newspaper, FileDown,
} from 'lucide-react';

/* ================================================================
   The Cadence Desk — LinkedIn Cadence Planner (bizdev-30 / app 09)
   World: editorial newsroom. Paper white, ink black, one electric blue.
   ================================================================ */

const SLUG = '09-linkedin-cadence-planner';
const LS_KEY = `bizdev:${SLUG}:v1`;
const HOOK_FOLD = 210; // chars visible before LinkedIn's "…see more"
const POST_MAX = 3000; // LinkedIn post character ceiling

const TYPES = {
  contrarian: { label: 'Contrarian', slug: 'CON', hint: 'Challenge the default take' },
  story: { label: 'Story', slug: 'STY', hint: 'Lived scenes, real stakes' },
  howto: { label: 'How-to', slug: 'HOW', hint: 'Teach one thing completely' },
  proof: { label: 'Proof', slug: 'PRF', hint: 'Receipts, numbers, outcomes' },
};
const TYPE_KEYS = Object.keys(TYPES);
const STATUSES = ['idea', 'drafted', 'scheduled', 'posted'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* ---------------- date helpers ---------------- */
const pad2 = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayISO = () => isoOf(new Date());
const currentYM = () => todayISO().slice(0, 7);
const parseYM = (ym) => ym.split('-').map(Number);
function monthLabel(ym) {
  const [y, m] = parseYM(ym);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
function shiftYM(ym, delta) {
  const [y, m] = parseYM(ym);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
function daysInYM(ym) {
  const [y, m] = parseYM(ym);
  return new Date(y, m, 0).getDate();
}
function weekdayShort(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' });
}
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

/* ---------------- normalize (survives corrupt/missing data) ---------------- */
const str = (v, fb = '') => (typeof v === 'string' ? v : fb);
const bool = (v) => v === true;
function normalize(raw) {
  const base = {
    seenGuide: false,
    niche: '', audience: '', voice: '',
    month: currentYM(),
    posts: [], hooks: [], queue: [],
    claudeNotes: '',
  };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const out = { ...base };
  out.seenGuide = bool(raw.seenGuide);
  out.niche = str(raw.niche); out.audience = str(raw.audience); out.voice = str(raw.voice);
  out.claudeNotes = str(raw.claudeNotes);
  out.month = /^\d{4}-\d{2}$/.test(str(raw.month)) ? raw.month : currentYM();
  if (Array.isArray(raw.posts)) {
    out.posts = raw.posts.filter((p) => p && typeof p === 'object').map((p) => ({
      id: str(p.id) || uid(),
      date: /^\d{4}-\d{2}-\d{2}$/.test(str(p.date)) ? p.date : '',
      type: TYPE_KEYS.includes(p.type) ? p.type : 'story',
      status: STATUSES.includes(p.status) ? p.status : 'idea',
      hook: str(p.hook), body: str(p.body), cta: str(p.cta),
    }));
  }
  if (Array.isArray(raw.hooks)) {
    out.hooks = raw.hooks.filter((h) => h && typeof h === 'object').map((h) => ({
      id: str(h.id) || uid(),
      type: TYPE_KEYS.includes(h.type) ? h.type : 'contrarian',
      text: str(h.text),
    }));
  }
  if (Array.isArray(raw.queue)) {
    out.queue = raw.queue.filter((q) => q && typeof q === 'object').map((q) => ({
      id: str(q.id) || uid(),
      kind: q.kind === 'repost' ? 'repost' : 'comment',
      target: str(q.target), note: str(q.note),
      day: DAYS.includes(q.day) ? q.day : 'Mon',
      done: bool(q.done),
    }));
  }
  return out;
}

/* ---------------- demo edition ---------------- */
function demoState() {
  const ym = currentYM();
  const dim = daysInYM(ym);
  const d = (day) => `${ym}-${pad2(Math.min(day, dim))}`;
  const today = todayISO();
  const st = (date, future) => (date < today ? 'posted' : future);
  const P = (day, type, status, hook, body, cta) => ({
    id: uid(), date: day === 0 ? '' : d(day), type,
    status: day === 0 ? status : st(d(day), status),
    hook, body, cta,
  });
  return normalize({
    seenGuide: true,
    niche: 'Fractional CFO for B2B SaaS founders between $1M and $10M ARR',
    audience: 'Founders and COOs who still run finance out of a spreadsheet — and feel it every month-end',
    voice: 'Plainspoken and numbers-first. Short lines. A mild contrarian streak. No hashtags, no hype words, no "game-changer".',
    month: ym,
    posts: [
      P(1, 'proof', 'posted',
        'Last quarter I found $61,000 of dead spend inside a 14-person SaaS company. It took one afternoon and zero layoffs.',
        'Nobody was careless. Everybody was busy.\n\nThe money was hiding in the boring places:\n\n— 11 seats on tools nobody had opened since March\n— An annual contract auto-renewed at list price\n— A "temporary" contractor in month nine\n— Two departments paying for the same analytics stack\n\nThe fix was not a spreadsheet. It was an owner.\n\nEvery line of spend now has a name next to it. When a renewal lands, a human decides.\n\nBurn is a leadership metric, not a finance metric.',
        'Want the 20-line audit checklist we used? Comment LEDGER and I will send it over.'),
      P(3, 'howto', 'posted',
        'How to build a 13-week cash forecast in 45 minutes. No new software. The template my clients actually keep using.',
        'Most forecasts die because they are built for the board, not for Monday morning.\n\nThe 45-minute version:\n\n1. One row per cash-in source, one per cash-out bucket. Twelve rows max.\n2. Thirteen columns. Weeks, not months — payroll does not care about months.\n3. Enter only what is CONTRACTED for weeks 1-4. Everything else gets a confidence tag.\n4. Bold one cell: lowest projected balance. That cell is your job now.\n5. Update it every Monday. Ten minutes once it exists.\n\nA forecast you update beats a model you admire.',
        'Comment FORECAST and I will DM you the sheet.'),
      P(6, 'story', 'posted',
        'In 2019 I watched a $4M ARR company die with money in the bank. The invoice that killed them was $12,000.',
        'They had 34% of revenue concentrated in one enterprise logo.\n\nThat customer switched to 90-day payment terms in a procurement "update". Nobody escalated it — $12k was too small to escalate.\n\nThree quarters later the gap between booked and banked was $600k wide. Payroll bridged on a credit line. The credit line got called.\n\nThe post-mortem took one sentence: revenue is an opinion, cash is a fact.\n\nI have opened every client engagement since with the same question: who actually controls the timing of your cash?',
        'Follow for one honest SaaS finance story every week.'),
      P(8, 'contrarian', 'posted',
        'Your SaaS does not have a growth problem. It has a margin problem you keep calling a growth problem.',
        'Growth covers sins. Everyone knows this. Almost nobody acts on it.\n\nWhat I see inside the books at $1-10M ARR:\n\n— Gross margin quoted at 80%, real number 62% once support and success land where they belong\n— CAC payback "12 months" that is 21 once you count ramp time\n— Discounts nobody remembers approving, renewing on autopilot\n\nFix the margin math first. Then growth compounds something worth compounding.\n\nGrowth on broken unit economics is just a faster way to need a bridge round.',
        'Disagree? Tell me why in the comments — I read every one.'),
      P(10, 'proof', 'posted',
        'We moved one client from monthly to annual billing on 40% of contracts. Net burn fell $38,000 a month. Here is the playbook.',
        'No product changes. No new hires. Ninety days.\n\nThe playbook:\n\n1. Segment: which customers already behave annually? (Low support load, steady usage.)\n2. Offer: two months free is cheaper than the fundraise you avoid.\n3. Script: renewals only. Never mid-term. One email, one call.\n4. Floor: never discount below the margin line we drew first.\n\nResult: 40% adoption, DSO down 19 days, and the founder stopped checking the bank balance before approving expenses.\n\nCash timing is a product decision wearing a finance costume.',
        'Want the renewal email script? Comment ANNUAL.'),
      P(13, 'howto', 'posted',
        'The 5 numbers I check every Monday before I touch email. Nine minutes. Catches 90% of cash surprises early.',
        'Monday, 8:00, coffee, five numbers:\n\n1. Bank balance vs. forecast cell — variance over 5% gets a note\n2. AR over 30 days — who moved, who did not\n3. Weekly net burn, trailing 4-week average\n4. New MRR booked vs. cash actually collected\n5. Days until lowest projected balance\n\nNo dashboard. One sheet, five cells, nine minutes.\n\nThe discipline is not the numbers. It is refusing to open your inbox first.',
        'Steal the sheet: comment MONDAY and it is yours.'),
      P(15, 'story', 'posted',
        'A founder told me "we will fix pricing after we hit $5M." We modeled the wait. It was costing him $23,000 a week.',
        'He was not wrong to be scared. Repricing feels like touching a live wire.\n\nSo we did not touch existing customers at all.\n\nNew deals only: value-metric pricing, 18% higher anchor, one fewer discount tier. Sales team had one page of talk tracks.\n\nWin rate moved from 31% to 29%. Statistically noise.\nAverage contract value moved 24%. Statistically rent.\n\nSix months later the "after $5M" plan happened at $4.2M — funded by the pricing he was afraid of.\n\nThe expensive decision is usually the one you defer.',
        'If pricing scares you, my DMs are open. No pitch, just the model.'),
      P(17, 'contrarian', 'posted',
        'Hiring a full-time CFO at $2M ARR is how founders buy themselves a very expensive feeling of safety.',
        'A $220k executive to produce reports nobody reads is not finance. It is theater with a headcount line.\n\nWhat a $2M ARR company actually needs:\n\n— A closed month by day 10\n— A 13-week cash view someone owns\n— Pricing reviewed twice a year\n— A board pack with three decisions, not thirty slides\n\nThat is 3-4 focused days a month. Buy days, not a title.\n\nHire the full-time CFO when the work is full-time: audit, debt, M&A, real board complexity. Usually $8-15M ARR.\n\nUntil then, rent the brain and keep the equity.',
        'Founders past $5M: what finally made a full-time hire worth it? Genuinely asking.'),
      P(20, 'proof', 'scheduled',
        'Q2 client scoreboard: median burn down 18%, runway up 4.1 months, zero layoffs across the book. The 3 moves that did the work.',
        'Twelve clients, one quarter, full transparency (ranges to protect identities):\n\n— Burn: down 4% to 31%, median 18%\n— Runway: up 1.9 to 7.3 months, median 4.1\n— Layoffs: zero\n\nThe three moves that showed up in every win:\n\n1. Spend got an owner per line, reviewed monthly\n2. Billing terms renegotiated at renewal, never mid-term\n3. One pricing decision founders had been deferring, made\n\nNo heroics. No 5am hustle posts. Just decisions with dates on them.',
        'Q3 cohort opens next month — two seats. DM "SCOREBOARD" for the criteria.'),
      P(22, 'howto', 'scheduled',
        'How to read a SaaS P&L in 6 lines. If your accountant sends you forty, this is the translation layer.',
        'The six lines that matter at $1-10M ARR:\n\n1. Recurring revenue (only the recurring part)\n2. Cost to serve it — support, success, hosting\n3. Gross margin — line 1 minus line 2, honest version\n4. Sales & marketing as % of new ARR\n5. Everything else, one line, no drama\n6. Net burn, in dollars and in weeks of runway\n\nIf a line cannot change a decision, it does not belong in front of a founder.\n\nPrint yours. Cross out everything that is not one of these six. What is left is your actual business.',
        'Want my 6-line template mapped to QuickBooks? Comment SIXLINES.'),
      P(24, 'story', 'drafted',
        'My first fractional client fired me after six weeks. It was the best thing that ever happened to my practice.',
        'They wanted a bookkeeper with a CFO title. I kept showing up with decisions instead of reports.\n\n"We just need the numbers done" is a fair thing to want. It is not what I sell.\n\nSo I wrote the niche statement I still use today — and put WHO IT IS NOT FOR above who it is for.\n\nRevenue dipped for one quarter. Close rate tripled the next.\n\nThe lesson I hand every services founder: getting fired by the wrong client is cheaper than keeping them.',
        'What firing taught you more than any win? Comments are open.'),
      P(27, 'contrarian', 'idea',
        'Runway is a vanity metric. Founders quote months of runway the way gamblers quote their best night.',
        '', ''),
      P(0, 'proof', 'drafted',
        'Every SaaS founder tracks MRR weekly. Almost none track contribution margin per customer. That gap is where bad quarters are born.',
        'Draft in progress — pull the anonymized cohort chart from the Q2 file and pick the two customers whose margin flipped negative after the support tier change.',
        'Comment MARGIN for the worksheet.'),
    ],
    hooks: [
      { id: uid(), type: 'contrarian', text: 'Your board deck has thirty slides and zero decisions. That is not reporting. That is theater.' },
      { id: uid(), type: 'contrarian', text: 'Most SaaS budgets are fiction with a spreadsheet accent.' },
      { id: uid(), type: 'contrarian', text: 'Cutting costs did not slow us down. It is the only reason we are still here to be called slow.' },
      { id: uid(), type: 'story', text: 'The CEO asked me for one number before the board call. I gave him two. The second one saved the meeting.' },
      { id: uid(), type: 'story', text: 'We celebrated a record quarter on Friday. On Monday I found out we could not make April payroll.' },
      { id: uid(), type: 'howto', text: 'Three questions that expose whether your pricing leaks money. You can answer them in ten minutes.' },
      { id: uid(), type: 'howto', text: 'The exact email I send when a client’s biggest customer pays 47 days late.' },
      { id: uid(), type: 'proof', text: 'Twelve clients, and one metric moved first every single time: days of visible runway. Here is the distribution.' },
      { id: uid(), type: 'proof', text: 'From 61 to 34 days DSO in one quarter. The collections script was four sentences long.' },
      { id: uid(), type: 'proof', text: 'We priced one add-on correctly and it now covers the entire payroll of the CS team.' },
    ],
    queue: [
      { id: uid(), kind: 'comment', target: 'Katelyn Bourgoin — thread on pricing surveys', note: 'Add the 10-minute pricing-leak test; link back to my how-to from the 15th', day: 'Tue', done: false },
      { id: uid(), kind: 'comment', target: 'Ben Murray — SaaS CFO benchmark post', note: 'Share the 18% median burn reduction from the Q2 scoreboard, no pitch', day: 'Wed', done: false },
      { id: uid(), kind: 'comment', target: 'Founder poll: annual vs monthly billing', note: 'Drop the $38k/month case numbers, offer the renewal script', day: 'Thu', done: true },
      { id: uid(), kind: 'repost', target: 'My 13-week cash forecast how-to (best performer this month)', note: 'Repost with a new first line for the audience that missed it', day: 'Fri', done: false },
      { id: uid(), kind: 'repost', target: 'Client win: runway +4.1 months', note: 'Add one paragraph on what changed operationally, not just the number', day: 'Mon', done: true },
      { id: uid(), kind: 'comment', target: 'Newsletter excerpt on first finance hires', note: 'Counterpoint: fractional first below $5M ARR — keep it friendly', day: 'Sat', done: false },
    ],
    claudeNotes: '',
  });
}

/* ---------------- composition + serialization ---------------- */
const composePost = (p) => [p.hook, p.body, p.cta].filter(Boolean).join('\n\n');
const postChars = (p) => composePost(p).length;

function calendarMd(s) {
  const dated = s.posts.filter((p) => p.date && p.date.startsWith(s.month)).sort((a, b) => a.date.localeCompare(b.date));
  if (!dated.length) return '_No posts filed to this month yet._';
  return dated.map((p) => `- **${p.date} (${weekdayShort(p.date)})** · ${TYPES[p.type].label} · ${p.status} — ${p.hook || '(no hook yet)'}`).join('\n');
}
function draftsMd(s, full = true) {
  const list = [...s.posts].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  if (!list.length) return '_No drafts on the desk._';
  return list.map((p) => {
    const head = `### ${p.date || 'Unscheduled'} · ${TYPES[p.type].label} · ${p.status} · ${postChars(p)}/${POST_MAX} chars`;
    if (!full) return `${head}\n> ${p.hook || '(no hook yet)'}`;
    return `${head}\n**Hook (${p.hook.length}/${HOOK_FOLD} before the fold):** ${p.hook || '—'}\n\n**Body:**\n${p.body || '—'}\n\n**CTA:** ${p.cta || '—'}`;
  }).join('\n\n');
}
function hooksMd(s) {
  if (!s.hooks.length) return '_Hook bank is empty._';
  return TYPE_KEYS.map((t) => {
    const hs = s.hooks.filter((h) => h.type === t);
    return hs.length ? `**${TYPES[t].label}**\n${hs.map((h) => `- ${h.text}`).join('\n')}` : null;
  }).filter(Boolean).join('\n\n');
}
function queueMd(s) {
  if (!s.queue.length) return '_Wire queue is empty._';
  return s.queue.map((q) => `- [${q.done ? 'x' : ' '}] **${q.day}** · ${q.kind === 'repost' ? 'Repost' : 'Comment'}: ${q.target}${q.note ? ` — ${q.note}` : ''}`).join('\n');
}
function profileMd(s) {
  return [
    `- **Niche:** ${s.niche || '(not set)'}`,
    `- **Audience:** ${s.audience || '(not set)'}`,
    `- **Voice:** ${s.voice || '(not set)'}`,
  ].join('\n');
}
function planMarkdown(s) {
  return [
    `# The Cadence Desk — ${monthLabel(s.month)} edition`,
    ``, `## Editorial slate`, profileMd(s),
    ``, `## Front page — ${monthLabel(s.month)} calendar`, calendarMd(s),
    ``, `## Copy desk — full drafts`, draftsMd(s, true),
    ``, `## Hook bank`, hooksMd(s),
    ``, `## Repost & comment wire`, queueMd(s),
    ``, `---`, `_Exported from The Cadence Desk — LinkedIn Cadence Planner._`,
  ].join('\n');
}

/* ---------------- Copilot prompt builders ---------------- */
function consoleHeader(ctx) {
  if (!ctx) return '';
  const p = ctx.profile || {}; const c = ctx.claude || {};
  const bits = [
    p.company ? `- Company: ${p.company}` : '', p.offer ? `- Offer: ${p.offer}` : '',
    p.icp ? `- ICP: ${p.icp}` : '', c.voiceNotes ? `- Voice notes: ${c.voiceNotes}` : '',
  ].filter(Boolean);
  return bits.length ? `## Operator context (from my BD console)\n${bits.join('\n')}\n\n` : '';
}
function promptHooks(s, ctx) {
  return `You are a veteran LinkedIn ghostwriter for founders and consultants — the kind whose clients grow from 2,000 to 50,000 followers on substance, not engagement bait. You write hooks that stop the scroll because they are specific, not because they shout.

${consoleHeader(ctx)}## My editorial profile
${profileMd(s)}

## Hooks already in my bank (do NOT repeat these angles)
${hooksMd(s)}

## Hooks I have already run this month
${s.posts.filter((p) => p.hook).map((p) => `- (${TYPES[p.type].label}) ${p.hook}`).join('\n') || '- none yet'}

## The ask
Write 10 new hooks for my niche: 3 contrarian, 3 story, 2 how-to, 2 proof.

Rules:
- Each hook must fit in ${HOOK_FOLD} characters (LinkedIn cuts the rest behind "…see more").
- Specific beats clever: use numbers, named situations, and concrete stakes from my niche.
- No clickbait a post cannot cash. No em-dash abuse. No hashtags. Match my voice notes exactly.
- Assume a skeptical, senior audience that has seen every recycled LinkedIn trope.

## Output format
A markdown table: # | Type | Hook | Character count | Why it stops the scroll (one short clause).
Then one line naming which single hook you would run first, and why.`;
}
function promptExpand(s, p, ctx) {
  const voiceRefs = s.posts.filter((x) => x.status === 'posted' && x.body).slice(0, 2);
  return `You are my LinkedIn ghostwriter. You write in MY voice — not generic LinkedIn voice. Study the reference posts below before writing a word.

${consoleHeader(ctx)}## My editorial profile
${profileMd(s)}

## Voice reference — posts I have already published
${voiceRefs.length ? voiceRefs.map((x, i) => `### Reference ${i + 1} (${TYPES[x.type].label})\n${composePost(x)}`).join('\n\n') : '_No published references yet — lean entirely on the voice notes above._'}

## The draft to expand
- Post type: ${TYPES[p.type].label} (${TYPES[p.type].hint.toLowerCase()})
- Hook: ${p.hook || '(none — propose one that fits the type)'}
- Body notes so far: ${p.body || '(blank — build the argument from the hook)'}
- CTA direction: ${p.cta || '(propose a natural, low-pressure CTA)'}
- Scheduled: ${p.date || 'not yet scheduled'}

## The ask
Expand this into a complete LinkedIn post, ready to paste.

Constraints:
- Total length under ${POST_MAX} characters; the first ${HOOK_FOLD} characters must work standalone before the fold.
- Short paragraphs (1–2 lines), generous line breaks, no hashtags, no emoji.
- Keep every number and claim consistent with my notes; invent nothing that reads as a fabricated result.
- End with the CTA on its own line.

## Output format
1. The finished post in a fenced code block (exactly as I should paste it).
2. Character count of the full post and of the pre-fold hook.
3. Two sentences on the single strongest and single weakest line, with a suggested fix for the weak one.`;
}
function promptCritique(s, p, ctx) {
  return `You are a ruthless LinkedIn editor. Your only job today is first lines. You know the reader decides in under two seconds, on a phone, mid-scroll, and that the first ${HOOK_FOLD} characters are the entire ballgame.

${consoleHeader(ctx)}## My editorial profile
${profileMd(s)}

## The first line under review
- Post type: ${TYPES[p.type].label}
- Hook: "${p.hook || '(empty — treat this as a failing grade and write 3 from the body below)'}"
- Character count: ${p.hook.length}/${HOOK_FOLD}
- The post it must carry:\n${composePost(p) || '(body not written yet)'}

## The ask
1. Score this first line 1–10 on each of: curiosity gap, specificity, audience match (my niche above), rhythm when read aloud, and the fold test (does it work cut at ${HOOK_FOLD} chars?). One line of justification per score.
2. Name the single biggest reason a tired executive scrolls past it.
3. Rewrite it three ways IN MY VOICE: one sharper version of the same angle, one that leads with the number, one that leads with the human stake. Keep each under ${HOOK_FOLD} characters and honest to the post's content.

## Output format
Scores as a compact markdown table, then the diagnosis line, then the three rewrites as a numbered list with character counts.`;
}
function promptNextMonth(s, ctx) {
  const next = shiftYM(s.month, 1);
  return `You are a LinkedIn content strategist for consultants who sell high-trust services. You plan cadences that compound authority — not posting for posting's sake.

${consoleHeader(ctx)}## My editorial profile
${profileMd(s)}

## This month's edition (${monthLabel(s.month)})
${calendarMd(s)}

## What is in my hook bank
${hooksMd(s)}

## My repost & comment wire
${queueMd(s)}

## The ask
Design my ${monthLabel(next + '-01').replace(' 1,', '')} cadence: 3 posts per week for 4 weeks (Mon/Wed/Fri rhythm unless you argue otherwise).

Requirements:
- Balance the four types (contrarian / story / how-to / proof) against what I have already run — call out any type I am over- or under-using.
- Reuse unfired hooks from my bank where they fit; mark them (BANK). Propose new working hooks for the rest, in my voice, under ${HOOK_FOLD} characters.
- Suggest 2 weekly comment targets and 1 monthly repost slot that support the same themes.
- Anchor everything to a monthly theme that serves my niche's buying season, and say what the month should make my audience believe by its end.

## Output format
A markdown table: Date | Day | Type | Working hook | Note. Then the theme statement, the type-mix callout, and the wire suggestions as short sections.`;
}

/* ---------------- clipboard + download ---------------- */
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta); return ok;
  } catch { return false; }
}
function downloadFile(name, text, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 800);
}
function csvOf(s) {
  const esc = (v) => `"${String(v).replaceAll('"', '""')}"`;
  const rows = [['date', 'weekday', 'type', 'status', 'hook', 'cta', 'chars']];
  [...s.posts].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')).forEach((p) => {
    rows.push([p.date, p.date ? weekdayShort(p.date) : '', TYPES[p.type].label, p.status, p.hook, p.cta, postChars(p)]);
  });
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}

/* ================================================================ SVG pieces */
function PressMark({ className }) {
  return (
    <svg viewBox="0 0 44 44" className={className} aria-hidden="true">
      <rect x="1.5" y="1.5" width="41" height="41" fill="var(--color-ink)" />
      <rect x="1.5" y="1.5" width="41" height="41" fill="none" stroke="var(--color-ink)" strokeWidth="3" />
      <text x="22" y="31" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="900" fontSize="26" fill="var(--color-page)">C</text>
      <rect x="8" y="35" width="28" height="2.5" fill="var(--color-wire)" />
    </svg>
  );
}

/* Signature hero: the composing stone — two press sheets, column rules, blue editor's stroke */
function PressHero() {
  const lines = (x, y, w, n, gap = 4.5) =>
    Array.from({ length: n }, (_, i) => <line key={i} x1={x} y1={y + i * gap} x2={x + w} y2={y + i * gap} stroke="var(--color-ink)" strokeOpacity="0.22" strokeWidth="1.6" />);
  return (
    <svg viewBox="0 0 300 190" className="w-full max-w-[300px]" role="img" aria-label="A newsroom composing stone: two press sheets with column rules and an editor's blue stroke">
      <defs>
        <pattern id="halftone" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.4" fill="var(--color-ink)" fillOpacity="0.35" />
        </pattern>
      </defs>
      {/* back sheet */}
      <g transform="rotate(-5 150 100)">
        <rect x="30" y="26" width="200" height="140" fill="var(--color-pulp)" stroke="var(--color-rule)" />
      </g>
      {/* front sheet */}
      <g transform="rotate(2 160 100)">
        <rect x="52" y="18" width="212" height="152" fill="var(--color-page)" stroke="var(--color-ink)" strokeWidth="1.4" />
        {/* masthead */}
        <text x="62" y="42" fontFamily="var(--font-display)" fontWeight="900" fontSize="19" fill="var(--color-ink)">THE CADENCE</text>
        <line x1="62" y1="48" x2="254" y2="48" stroke="var(--color-ink)" strokeWidth="2.4" />
        <line x1="62" y1="52" x2="254" y2="52" stroke="var(--color-ink)" strokeWidth="1" />
        {/* dateline */}
        <text x="62" y="62" fontFamily="var(--font-body)" fontSize="6.5" letterSpacing="1.5" fill="var(--color-ink-2)">MONDAY EDITION · HOOK · BODY · CTA · SHIPPED</text>
        {/* three columns */}
        {lines(62, 74, 56, 9)}
        {lines(126, 74, 56, 4)}
        <rect x="126" y="96" width="56" height="34" fill="url(#halftone)" stroke="var(--color-ink)" strokeOpacity="0.5" strokeWidth="0.8" />
        {lines(126, 140, 56, 3)}
        {lines(190, 74, 56, 15)}
        {/* column rules */}
        <line x1="122" y1="72" x2="122" y2="160" stroke="var(--color-rule)" strokeWidth="1" />
        <line x1="186" y1="72" x2="186" y2="160" stroke="var(--color-rule)" strokeWidth="1" />
        {/* the hook line, underlined in wire blue */}
        <line x1="62" y1="118" x2="118" y2="118" stroke="var(--color-wire)" strokeWidth="2.6" />
      </g>
      {/* editor's blue stroke circling the hook */}
      <path d="M 46 108 C 40 88, 96 82, 118 96 C 138 110, 118 132, 78 130 C 52 128, 42 120, 46 108"
        fill="none" stroke="var(--color-wire)" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="230" opacity="0.9" />
      {/* SHIP IT stamp */}
      <g transform="rotate(-8 246 152)">
        <rect x="216" y="140" width="62" height="22" fill="none" stroke="var(--color-wire)" strokeWidth="2" />
        <text x="247" y="155" textAnchor="middle" fontFamily="var(--font-body)" fontWeight="700" fontSize="10" letterSpacing="2" fill="var(--color-wire)">SHIP IT</text>
      </g>
    </svg>
  );
}

/* character gauge with fold tick */
function Gauge({ value, max, tick, tickLabel, label }) {
  const W = 300, X0 = 4, X1 = W - 4;
  const px = (v) => X0 + Math.min(v / max, 1) * (X1 - X0);
  const over = value > max;
  return (
    <svg viewBox={`0 0 ${W} 34`} className="w-full" role="img" aria-label={`${label}: ${value} of ${max} characters`}>
      <line x1={X0} y1="22" x2={X1} y2="22" stroke="var(--color-rule)" strokeWidth="3" />
      <line x1={X0} y1="17" x2={X0} y2="27" stroke="var(--color-ink)" strokeWidth="1.5" />
      <line x1={X1} y1="17" x2={X1} y2="27" stroke="var(--color-ink)" strokeWidth="1.5" />
      {tick != null && tick < max && (
        <g>
          <line x1={px(tick)} y1="14" x2={px(tick)} y2="30" stroke="var(--color-ink)" strokeWidth="1.2" strokeDasharray="2 2" />
          <text x={px(tick)} y="10" textAnchor="middle" fontSize="8" fill="var(--color-ink-2)" fontFamily="var(--font-body)">{tickLabel}</text>
        </g>
      )}
      <line x1={X0} y1="22" x2={px(value)} y2="22" stroke={over ? 'var(--color-ink)' : 'var(--color-wire)'} strokeWidth={over ? 5 : 4} strokeDasharray={over ? '4 3' : 'none'} strokeLinecap="butt" />
      <text x={X1} y="10" textAnchor="end" fontSize="9" fontWeight="700" fill={over ? 'var(--color-ink)' : 'var(--color-ink-2)'} fontFamily="var(--font-body)">
        {value}/{max}{over ? ' — OVER' : ''}
      </text>
    </svg>
  );
}

/* type mix bars for the stats board */
function TypeMixBars({ posts }) {
  const counts = TYPE_KEYS.map((t) => posts.filter((p) => p.type === t).length);
  const max = Math.max(1, ...counts);
  const W = 240, LX = 78, X1 = W - 26;
  return (
    <svg viewBox={`0 0 ${W} 96`} className="w-full" role="img" aria-label="Post mix by type">
      {TYPE_KEYS.map((t, i) => {
        const y = 14 + i * 22;
        const w = (counts[i] / max) * (X1 - LX);
        return (
          <g key={t}>
            <text x={LX - 6} y={y + 4} textAnchor="end" fontSize="9.5" fontWeight="600" fill="var(--color-ink-2)" fontFamily="var(--font-body)">{TYPES[t].label}</text>
            <line x1={LX} y1={y} x2={X1} y2={y} stroke="var(--color-rule)" strokeWidth="1" />
            <line x1={LX} y1={y - 4} x2={LX} y2={y + 4} stroke="var(--color-ink)" strokeWidth="1" />
            <line x1={X1} y1={y - 4} x2={X1} y2={y + 4} stroke="var(--color-ink)" strokeWidth="1" />
            {counts[i] > 0 && <rect x={LX} y={y - 3.5} width={Math.max(3, w)} height="7" fill={i % 2 === 0 ? 'var(--color-wire)' : 'var(--color-ink)'} />}
            <text x={X1 + 6} y={y + 4} fontSize="10" fontWeight="700" fill="var(--color-ink)" fontFamily="var(--font-body)">{counts[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* posts-per-week meter vs target 3 */
function WeekMeter({ posts, ym }) {
  const dim = daysInYM(ym);
  const [y, m] = parseYM(ym);
  const weeks = [];
  let wk = [];
  for (let d = 1; d <= dim; d++) {
    wk.push(`${ym}-${pad2(d)}`);
    if (new Date(y, m - 1, d).getDay() === 0 || d === dim) { weeks.push(wk); wk = []; }
  }
  const counts = weeks.map((w) => posts.filter((p) => w.includes(p.date)).length);
  const TARGET = 3, maxV = Math.max(TARGET + 1, ...counts);
  const W = 240, H = 96, X0 = 30, BW = (W - X0 - 10) / Math.max(1, counts.length);
  const yOf = (v) => H - 18 - (v / maxV) * (H - 40);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Posts per week against a target of ${TARGET}`}>
      <line x1={X0 - 4} y1={yOf(TARGET)} x2={W - 8} y2={yOf(TARGET)} stroke="var(--color-wire)" strokeWidth="1.4" strokeDasharray="4 3" />
      <text x={X0 - 8} y={yOf(TARGET) + 3.5} textAnchor="end" fontSize="8.5" fontWeight="700" fill="var(--color-wire)" fontFamily="var(--font-body)">{TARGET}/wk</text>
      {counts.map((c, i) => {
        const x = X0 + i * BW + BW * 0.2;
        return (
          <g key={i}>
            <rect x={x} y={c ? yOf(c) : H - 20} width={BW * 0.6} height={c ? H - 18 - yOf(c) : 2} fill={c >= TARGET ? 'var(--color-wire)' : 'var(--color-ink)'} fillOpacity={c ? 1 : 0.25} />
            <text x={x + BW * 0.3} y={H - 6} textAnchor="middle" fontSize="8.5" fill="var(--color-ink-2)" fontFamily="var(--font-body)">W{i + 1}</text>
            {c > 0 && <text x={x + BW * 0.3} y={yOf(c) - 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--color-ink)" fontFamily="var(--font-body)">{c}</text>}
          </g>
        );
      })}
      <line x1={X0 - 4} y1={H - 18} x2={W - 8} y2={H - 18} stroke="var(--color-ink)" strokeWidth="1.4" />
    </svg>
  );
}

function StatusGlyph({ status }) {
  const c = status === 'posted' ? 'var(--color-wire)' : 'var(--color-ink)';
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0" aria-hidden="true">
      {status === 'idea' && <circle cx="6" cy="6" r="4" fill="none" stroke={c} strokeWidth="1.5" strokeDasharray="2 2" />}
      {status === 'drafted' && <circle cx="6" cy="6" r="4" fill="none" stroke={c} strokeWidth="1.5" />}
      {status === 'scheduled' && (<g><circle cx="6" cy="6" r="4" fill="none" stroke={c} strokeWidth="1.5" /><path d="M6 3.5 V6 L8 7.5" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" /></g>)}
      {status === 'posted' && (<g><circle cx="6" cy="6" r="4.5" fill={c} /><path d="M4 6.2 L5.5 7.7 L8.2 4.6" fill="none" stroke="var(--color-page)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></g>)}
    </svg>
  );
}

function TypeTag({ type, small }) {
  const base = `inline-flex items-center gap-1 font-semibold uppercase tracking-[0.12em] ${small ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]'}`;
  const style = {
    contrarian: 'bg-wire text-page',
    story: 'bg-ink text-page',
    howto: 'border border-ink text-ink bg-page',
    proof: 'proof-stripes border border-ink/50 text-ink bg-page',
  }[type];
  return <span className={`${base} ${style}`}>{TYPES[type].label}</span>;
}

/* ================================================================ shared UI */
const btnGhost = 'inline-flex items-center gap-1.5 border border-ink/25 bg-page px-2.5 py-1.5 text-[12px] font-semibold text-ink hover:border-ink hover:bg-pulp/60 transition-colors';
const btnInk = 'inline-flex items-center gap-1.5 border border-ink bg-ink px-3 py-1.5 text-[12px] font-semibold text-page hover:bg-ink/85 transition-colors';
const btnWire = 'inline-flex items-center gap-1.5 border border-wire bg-wire px-3 py-1.5 text-[12px] font-semibold text-page hover:bg-wire-deep transition-colors';
const fieldCls = 'w-full border border-ink/25 bg-page px-2.5 py-1.5 text-[13px] text-ink placeholder:text-ink-3 focus:border-wire';

function Modal({ title, kicker, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-3 sm:p-8" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`anim-slip w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} border-2 border-ink bg-page shadow-plate`}>
        <div className="flex items-start justify-between gap-4 border-b-2 border-ink px-4 py-3 sm:px-6">
          <div>
            {kicker && <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-wire">{kicker}</p>}
            <h2 className="font-display text-xl font-black leading-tight text-ink sm:text-2xl">{title}</h2>
          </div>
          <button className={btnGhost} onClick={onClose} aria-label="Close dialog"><X className="h-4 w-4" aria-hidden="true" /></button>
        </div>
        <div className="px-4 py-4 sm:px-6 sm:py-5">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, headline, copy, children }) {
  return (
    <div className="slug-dash flex flex-col items-center gap-3 bg-page/60 px-6 py-10 text-center">
      <Icon className="h-7 w-7 text-ink-3" aria-hidden="true" />
      <p className="font-display text-lg font-black text-ink">{headline}</p>
      <p className="max-w-md text-[13px] leading-relaxed text-ink-2">{copy}</p>
      {children && <div className="mt-1 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

/* ================================================================ App */
export default function App() {
  const [state, setState] = useState(() => {
    try { return normalize(JSON.parse(localStorage.getItem(LS_KEY) || 'null')); }
    catch { return normalize(null); }
  });
  const [tab, setTab] = useState('front');
  const [editorId, setEditorId] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState(null); // { text, undo?: prevState }
  const [copiedKey, setCopiedKey] = useState('');
  const [copilotPostId, setCopilotPostId] = useState('');
  const [consoleCtx, setConsoleCtx] = useState(null);
  const fileRef = useRef(null);
  const toastTimer = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  /* first visit -> guide */
  useEffect(() => { if (!stateRef.current.seenGuide) setShowHelp(true); }, []);

  /* autosave (debounced) */
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage may be unavailable */ }
    }, 350);
    return () => clearTimeout(t);
  }, [state]);

  /* console bus (optional; app stays fully standalone) */
  useEffect(() => {
    if (window.parent === window) return;
    try { window.parent.postMessage({ bizdev: 'ready', v: 1, slug: SLUG }, '*'); } catch { /* noop */ }
    const onMsg = (e) => {
      const m = e.data;
      if (m && m.bizdev === 'context' && m.v === 1 && m.connectors && typeof m.connectors === 'object') setConsoleCtx(m.connectors);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const up = (patch) => setState((s) => ({ ...s, ...patch }));
  const closeGuide = () => { setShowHelp(false); if (!stateRef.current.seenGuide) up({ seenGuide: true }); };

  const fireToast = (text, undoPrev) => {
    clearTimeout(toastTimer.current);
    setToast({ text, undo: undoPrev || null });
    toastTimer.current = setTimeout(() => setToast(null), undoPrev ? 7000 : 3200);
  };

  /* ------- mutations ------- */
  const newPost = (date = '') => {
    const p = { id: uid(), date, type: 'story', status: 'idea', hook: '', body: '', cta: '' };
    setState((s) => ({ ...s, posts: [...s.posts, p] }));
    setEditorId(p.id); setCopilotPostId(p.id);
  };
  const updatePost = (id, patch) => setState((s) => ({ ...s, posts: s.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  const deletePost = (id) => {
    const prev = stateRef.current;
    setState((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== id) }));
    if (editorId === id) setEditorId(null);
    fireToast('Draft spiked (removed from the desk).', prev);
  };
  const duplicatePost = (id) => {
    const src = state.posts.find((p) => p.id === id); if (!src) return;
    const p = { ...src, id: uid(), date: '', status: 'idea' };
    setState((s) => ({ ...s, posts: [...s.posts, p] }));
    setEditorId(p.id); fireToast('Duplicated to an unscheduled draft.');
  };
  const addHook = (type, text) => setState((s) => ({ ...s, hooks: [{ id: uid(), type, text }, ...s.hooks] }));
  const updateHook = (id, patch) => setState((s) => ({ ...s, hooks: s.hooks.map((h) => (h.id === id ? { ...h, ...patch } : h)) }));
  const deleteHook = (id) => {
    const prev = stateRef.current;
    setState((s) => ({ ...s, hooks: s.hooks.filter((h) => h.id !== id) }));
    fireToast('Hook filed to the wastebasket.', prev);
  };
  const draftFromHook = (h) => {
    const p = { id: uid(), date: '', type: h.type, status: 'idea', hook: h.text, body: '', cta: '' };
    setState((s) => ({ ...s, posts: [...s.posts, p] }));
    setEditorId(p.id); setCopilotPostId(p.id); setTab('desk');
  };
  const addQueueItem = (item) => setState((s) => ({ ...s, queue: [...s.queue, { id: uid(), done: false, ...item }] }));
  const updateQueueItem = (id, patch) => setState((s) => ({ ...s, queue: s.queue.map((q) => (q.id === id ? { ...q, ...patch } : q)) }));
  const deleteQueueItem = (id) => {
    const prev = stateRef.current;
    setState((s) => ({ ...s, queue: s.queue.filter((q) => q.id !== id) }));
    fireToast('Wire item cleared.', prev);
  };

  /* ------- exports ------- */
  const doCopyPlan = async () => {
    const ok = await copyText(planMarkdown(stateRef.current));
    fireToast(ok ? 'Edition plan copied as Markdown.' : 'Copy blocked by the browser — use Download instead.');
  };
  const doCopyPrompt = async (key, text) => {
    const ok = await copyText(text);
    if (ok) { setCopiedKey(key); setTimeout(() => setCopiedKey(''), 2000); }
    fireToast(ok ? 'Prompt copied — paste it into claude.ai.' : 'Copy blocked — select the prompt text manually.');
  };
  const doExportJson = () => { downloadFile(`cadence-desk-${state.month}.json`, JSON.stringify(state, null, 2), 'application/json'); setMenuOpen(false); };
  const doExportCsv = () => { downloadFile(`cadence-calendar-${state.month}.csv`, csvOf(state), 'text/csv'); setMenuOpen(false); };
  const doImport = (file) => {
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const next = normalize(JSON.parse(String(rd.result)));
        setState((s) => ({ ...next, seenGuide: s.seenGuide || next.seenGuide }));
        fireToast('Edition imported. The desk is restored.');
      } catch { fireToast('That file did not parse as a Cadence Desk export.'); }
    };
    rd.readAsText(file);
  };

  /* ------- keyboard ------- */
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (e.key === 'Escape') {
        if (menuOpen) { setMenuOpen(false); return; }
        if (editorId) { setEditorId(null); return; }
        if (showReset) { setShowReset(false); return; }
        if (showHelp) { closeGuide(); return; }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); doCopyPlan(); return; }
      if (typing) return;
      if (e.key === '?') { e.preventDefault(); setShowHelp(true); }
      else if (e.key.toLowerCase() === 'n') { e.preventDefault(); newPost(''); setTab('desk'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen, editorId, showReset, showHelp]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ------- derived ------- */
  const monthPosts = useMemo(() => state.posts.filter((p) => p.date && p.date.startsWith(state.month)), [state.posts, state.month]);
  const stats = useMemo(() => ({
    filed: monthPosts.length,
    posted: monthPosts.filter((p) => p.status === 'posted').length,
    overFold: state.posts.filter((p) => p.hook.length > HOOK_FOLD).length,
    unscheduled: state.posts.filter((p) => !p.date).length,
  }), [monthPosts, state.posts]);

  const editorPost = state.posts.find((p) => p.id === editorId) || null;
  const copilotPost = state.posts.find((p) => p.id === copilotPostId) || state.posts[state.posts.length - 1] || null;
  const isEmpty = !state.posts.length && !state.hooks.length && !state.queue.length;

  const tabs = [
    { id: 'front', label: 'Front Page', sub: 'the month', icon: CalendarDays },
    { id: 'hooks', label: 'Hook Bank', sub: 'the morgue file', icon: Zap },
    { id: 'desk', label: 'Copy Desk', sub: 'drafts in progress', icon: PenLine },
    { id: 'wire', label: 'The Wire', sub: 'reposts & comments', icon: Repeat2 },
  ];

  return (
    <>
      {/* ============================== SCREEN APP ============================== */}
      <div className="screen-app mx-auto min-h-screen max-w-[1240px] px-3 pb-24 sm:px-6">
        {/* ---------- masthead ---------- */}
        <header className="pt-4 sm:pt-6">
          <div className="flex items-center justify-between gap-2 border-b border-rule pb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-2">
            <span className="hidden sm:inline">Vol. 1 · A BD content engine for LinkedIn</span>
            <span className="sm:hidden">Vol. 1</span>
            <span className="flex items-center gap-2">
              {consoleCtx && <span className="border border-wire px-1.5 py-px text-[9px] text-wire">Console linked</span>}
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </span>
          </div>

          <div className="rule-double mt-[3px] flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pt-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <PressMark className="h-11 w-11 shrink-0 sm:h-14 sm:w-14" />
              <div>
                <h1 className="font-display text-[34px] font-black leading-[0.95] tracking-tight text-ink sm:text-[52px]">
                  The Cadence <span className="text-wire">Desk</span>
                </h1>
                <p className="mt-1 text-[12px] font-medium text-ink-2 sm:text-[13px]">
                  Plan the month. Bank the hooks. Ship posts that earn pipeline &mdash; the LinkedIn Cadence Planner.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button className={btnGhost} onClick={() => { setState((s) => ({ ...demoState(), seenGuide: true })); fireToast('Demo edition loaded — a full month on the stone.'); }}>
                <Newspaper className="h-3.5 w-3.5" aria-hidden="true" /> Load demo
              </button>
              <button className={btnGhost} onClick={() => setShowReset(true)}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
              </button>
              <button className={btnGhost} onClick={() => setShowHelp(true)}>
                <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" /> How to use
              </button>
              <div className="relative">
                <button className={btnInk} onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={menuOpen}>
                  <Download className="h-3.5 w-3.5" aria-hidden="true" /> Export
                </button>
                {menuOpen && (
                  <>
                    <button className="fixed inset-0 z-30 cursor-default" aria-label="Close export menu" onClick={() => setMenuOpen(false)} tabIndex={-1} />
                    <div role="menu" className="anim-slip absolute right-0 z-40 mt-1 w-56 border-2 border-ink bg-page shadow-plate">
                      {[
                        { icon: FileText, label: 'Copy Markdown plan', hint: 'Ctrl/Cmd+S', fn: () => { doCopyPlan(); setMenuOpen(false); } },
                        { icon: FileJson, label: 'Download JSON (full state)', fn: doExportJson },
                        { icon: FileDown, label: 'Download calendar CSV', fn: doExportCsv },
                        { icon: Upload, label: 'Import JSON…', fn: () => { fileRef.current?.click(); setMenuOpen(false); } },
                        { icon: Printer, label: 'Print the edition', fn: () => { setMenuOpen(false); window.print(); } },
                      ].map((it) => (
                        <button key={it.label} role="menuitem" onClick={it.fn}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] font-semibold text-ink hover:bg-wire-wash">
                          <span className="flex items-center gap-2"><it.icon className="h-3.5 w-3.5 text-ink-2" aria-hidden="true" />{it.label}</span>
                          {it.hint && <kbd className="text-[9px] text-ink-3">{it.hint}</kbd>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Import JSON file"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ''; }} />
            </div>
          </div>

          {/* ---------- hero band: press graphic + stats board ---------- */}
          <div className="rule-heavy mt-4 grid gap-4 pt-4 lg:grid-cols-[300px_1fr]">
            <div className="hidden items-center justify-center border border-rule bg-page/70 p-3 shadow-slip lg:flex">
              <PressHero />
            </div>
            <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr]">
              <div className="flex flex-row items-stretch justify-between gap-3 border border-rule bg-page p-3 shadow-slip sm:flex-col sm:justify-center">
                {[
                  { n: stats.filed, l: 'filed this month' },
                  { n: stats.posted, l: 'shipped' },
                  { n: stats.unscheduled, l: 'unscheduled drafts' },
                ].map((x) => (
                  <div key={x.l} className="text-center sm:text-left">
                    <p className="font-display text-3xl font-black leading-none text-ink">{x.n}</p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-2">{x.l}</p>
                  </div>
                ))}
              </div>
              <div className="border border-rule bg-page p-3 shadow-slip">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-2">Weekly cadence · {monthLabel(state.month)}</p>
                <WeekMeter posts={monthPosts} ym={state.month} />
              </div>
              <div className="border border-rule bg-page p-3 shadow-slip">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-2">Type mix · the four columns</p>
                <TypeMixBars posts={monthPosts} />
              </div>
            </div>
          </div>
        </header>

        {/* ---------- tabs ---------- */}
        <nav className="rule-heavy mt-5 flex gap-0 overflow-x-auto pt-0" aria-label="Sections">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
              className={`flex min-w-[112px] flex-col border-b-[3px] px-3 py-2 text-left transition-colors ${tab === t.id ? 'border-wire bg-page' : 'border-transparent hover:bg-page/60'}`}>
              <span className={`flex items-center gap-1.5 font-display text-[15px] font-black ${tab === t.id ? 'text-ink' : 'text-ink-2'}`}>
                <t.icon className="h-3.5 w-3.5" aria-hidden="true" />{t.label}
              </span>
              <span className="text-[10px] uppercase tracking-[0.16em] text-ink-3">{t.sub}</span>
            </button>
          ))}
        </nav>

        {/* ---------- main grid: tool + rail ---------- */}
        <main className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="min-w-0">
            {isEmpty && tab === 'front' ? (
              <EmptyState icon={Newspaper} headline="The page is blank. Good."
                copy="Every strong month on LinkedIn starts as an empty grid. Load the demo to see a finished edition, or file your first draft and let the calendar tell you the truth about your cadence.">
                <button className={btnWire} onClick={() => { setState({ ...demoState(), seenGuide: true }); fireToast('Demo edition loaded.'); }}><Newspaper className="h-3.5 w-3.5" aria-hidden="true" />Load the demo edition</button>
                <button className={btnGhost} onClick={() => newPost(todayISO())}><Plus className="h-3.5 w-3.5" aria-hidden="true" />File today&rsquo;s first draft</button>
              </EmptyState>
            ) : (
              <>
                {tab === 'front' && <FrontPage state={state} up={up} onDay={(d) => newPost(d)} onPost={(id) => { setEditorId(id); setCopilotPostId(id); }} />}
                {tab === 'hooks' && <HookBank state={state} addHook={addHook} updateHook={updateHook} deleteHook={deleteHook} draftFromHook={draftFromHook} />}
                {tab === 'desk' && <CopyDesk state={state} onEdit={(id) => { setEditorId(id); setCopilotPostId(id); }} onNew={() => newPost('')} onDelete={deletePost} updatePost={updatePost} />}
                {tab === 'wire' && <WireQueue state={state} addQueueItem={addQueueItem} updateQueueItem={updateQueueItem} deleteQueueItem={deleteQueueItem} />}
              </>
            )}
          </section>

          {/* ---------- right rail ---------- */}
          <aside className="min-w-0 space-y-4 lg:border-l lg:border-rule lg:pl-5">
            <EditorialSlate state={state} up={up} />
            <CopilotPanel state={state} consoleCtx={consoleCtx} copilotPost={copilotPost}
              posts={state.posts} copilotPostId={copilotPostId} setCopilotPostId={setCopilotPostId}
              copiedKey={copiedKey} doCopyPrompt={doCopyPrompt} />
            <WireCopyNotes state={state} up={up} />
          </aside>
        </main>

        {/* ---------- footer colophon ---------- */}
        <footer className="rule-double mt-10 pt-3 text-[10px] uppercase tracking-[0.18em] text-ink-3">
          <p>The Cadence Desk · set in Fraunces &amp; Public Sans · your copy never leaves this browser · press <kbd className="border border-rule px-1">?</kbd> for the style guide</p>
        </footer>
      </div>

      {/* ============================== PRINT SHEET ============================== */}
      <PrintSheet state={state} />

      {/* ============================== MODALS ============================== */}
      {editorPost && <PostEditor post={editorPost} updatePost={updatePost} onDelete={() => deletePost(editorPost.id)}
        onDuplicate={() => duplicatePost(editorPost.id)} onClose={() => setEditorId(null)}
        onSendToCopilot={() => { setCopilotPostId(editorPost.id); setEditorId(null); fireToast('Draft loaded onto the Rewrite Desk (right rail).'); }} />}

      {showHelp && <HelpModal onClose={closeGuide} firstVisit={!state.seenGuide} />}

      {showReset && (
        <Modal title="Clear the composing stone?" kicker="Reset" onClose={() => setShowReset(false)}>
          <p className="text-[13px] leading-relaxed text-ink-2">
            This erases every draft, hook, wire item and your editorial slate from this browser. Download a JSON backup first if this edition matters. This cannot be undone.
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button className={btnGhost} onClick={doExportJson}><FileJson className="h-3.5 w-3.5" aria-hidden="true" />Backup JSON first</button>
            <button className={btnGhost} onClick={() => setShowReset(false)}>Keep my edition</button>
            <button className={btnInk} onClick={() => { setState({ ...normalize(null), seenGuide: true }); setShowReset(false); setEditorId(null); fireToast('Stone cleared. Fresh edition.'); }}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Erase everything
            </button>
          </div>
        </Modal>
      )}

      {/* ============================== TOAST ============================== */}
      {toast && (
        <div className="anim-slip fixed bottom-4 left-1/2 z-[60] flex w-[min(92vw,430px)] -translate-x-1/2 items-center justify-between gap-3 border-2 border-ink bg-ink px-4 py-3 text-page shadow-plate" role="status">
          <span className="text-[12.5px] font-semibold">{toast.text}</span>
          {toast.undo && (
            <button className="inline-flex shrink-0 items-center gap-1 border border-page/60 px-2 py-1 text-[11px] font-bold uppercase tracking-wider hover:bg-page hover:text-ink"
              onClick={() => { setState(toast.undo); setToast(null); }}>
              <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />Undo
            </button>
          )}
        </div>
      )}
    </>
  );
}

/* ================================================================ Front Page (calendar) */
function FrontPage({ state, up, onDay, onPost }) {
  const ym = state.month;
  const [y, m] = parseYM(ym);
  const dim = daysInYM(ym);
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Monday first
  const today = todayISO();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: dim }, (_, i) => `${ym}-${pad2(i + 1)}`)];
  while (cells.length % 7) cells.push(null);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink pb-2">
        <div className="flex items-center gap-2">
          <button className={btnGhost} onClick={() => up({ month: shiftYM(ym, -1) })} aria-label="Previous month"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
          <h2 className="font-display text-2xl font-black text-ink sm:text-3xl">{monthLabel(ym)}</h2>
          <button className={btnGhost} onClick={() => up({ month: shiftYM(ym, 1) })} aria-label="Next month"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
          {ym !== currentYM() && <button className={btnGhost} onClick={() => up({ month: currentYM() })}>Today</button>}
        </div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-ink-2">Click a day to file a draft · click a slug to edit</p>
      </div>

      <div className="mt-2 grid grid-cols-7 border-l border-t border-rule bg-page shadow-slip">
        {DAYS.map((d) => (
          <div key={d} className="border-b-2 border-r border-b-ink border-r-rule bg-pulp/50 px-1.5 py-1 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-ink-2">{d}</div>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <div key={`x${i}`} className="min-h-[68px] border-b border-r border-rule bg-pulp/30 sm:min-h-[92px]" />;
          const posts = state.posts.filter((p) => p.date === iso);
          const isToday = iso === today;
          const wd = (i % 7);
          return (
            <button key={iso} onClick={() => (posts.length === 0 ? onDay(iso) : onPost(posts[0].id))}
              aria-label={`${iso}: ${posts.length ? posts.length + ' post(s)' : 'file a draft'}`}
              className={`group relative min-h-[68px] border-b border-r border-rule p-1 text-left align-top transition-colors hover:bg-wire-wash/70 sm:min-h-[92px] sm:p-1.5 ${wd >= 5 ? 'bg-pulp/25' : 'bg-page'}`}>
              <span className={`inline-flex h-5 w-5 items-center justify-center text-[10.5px] font-bold ${isToday ? 'bg-wire text-page' : 'text-ink-2'}`}>{Number(iso.slice(8))}</span>
              <span className="mt-0.5 block space-y-0.5">
                {posts.slice(0, 3).map((p) => (
                  <span key={p.id} role="button" tabIndex={0} aria-label={`Edit: ${p.hook || 'untitled draft'}`}
                    onClick={(e) => { e.stopPropagation(); onPost(p.id); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onPost(p.id); } }}
                    className="flex items-center gap-1 border border-ink/20 bg-page px-1 py-0.5 hover:border-wire">
                    <StatusGlyph status={p.status} />
                    <TypeTag type={p.type} small />
                    <span className="hidden truncate text-[10px] font-medium text-ink lg:inline">{p.hook || 'untitled'}</span>
                  </span>
                ))}
                {posts.length > 3 && <span className="block text-[9px] font-bold text-wire">+{posts.length - 3} more</span>}
                {posts.length === 0 && <Plus className="mx-auto mt-1 hidden h-3.5 w-3.5 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 sm:block" aria-hidden="true" />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.14em] text-ink-2">
        <span className="flex items-center gap-1"><StatusGlyph status="idea" />idea</span>
        <span className="flex items-center gap-1"><StatusGlyph status="drafted" />drafted</span>
        <span className="flex items-center gap-1"><StatusGlyph status="scheduled" />scheduled</span>
        <span className="flex items-center gap-1"><StatusGlyph status="posted" />posted</span>
        <span className="ml-auto flex flex-wrap items-center gap-1.5">{TYPE_KEYS.map((t) => <TypeTag key={t} type={t} small />)}</span>
      </div>
    </div>
  );
}

/* ================================================================ Hook Bank */
function HookBank({ state, addHook, updateHook, deleteHook, draftFromHook }) {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [newType, setNewType] = useState('contrarian');
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const list = state.hooks.filter((h) => (filter === 'all' || h.type === filter) && (!q || h.text.toLowerCase().includes(q.toLowerCase())));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2 border-b-2 border-ink pb-2">
        <div>
          <h2 className="font-display text-2xl font-black text-ink sm:text-3xl">Hook Bank</h2>
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-2">The morgue file — first lines waiting for their edition</p>
        </div>
        <label className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search hooks…" aria-label="Search hooks" className={`${fieldCls} w-48 pl-7`} />
        </label>
      </div>

      {/* add form */}
      <div className="mt-3 border border-rule bg-page p-3 shadow-slip">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-2">File a new hook</p>
        <div className="flex flex-wrap gap-1.5">
          {TYPE_KEYS.map((t) => (
            <button key={t} onClick={() => setNewType(t)} aria-pressed={newType === t}
              className={`border px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider transition-colors ${newType === t ? 'border-wire bg-wire text-page' : 'border-ink/25 bg-page text-ink-2 hover:border-ink'}`}>
              {TYPES[t].label}
            </button>
          ))}
          <span className="self-center text-[10.5px] italic text-ink-3">{TYPES[newType].hint}</span>
        </div>
        <div className="mt-2 flex gap-2">
          <textarea rows={2} value={newText} onChange={(e) => setNewText(e.target.value)} className={fieldCls}
            placeholder={'A first line that would stop YOU mid-scroll. Under ' + HOOK_FOLD + ' characters.'} aria-label="New hook text" />
          <button className={`${btnWire} self-end`} disabled={!newText.trim()}
            onClick={() => { addHook(newType, newText.trim()); setNewText(''); }}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />Bank it
          </button>
        </div>
        <p className={`mt-1 text-right text-[10px] font-semibold ${newText.length > HOOK_FOLD ? 'text-ink underline decoration-wavy' : 'text-ink-3'}`}>{newText.length}/{HOOK_FOLD}</p>
      </div>

      {/* filters */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {['all', ...TYPE_KEYS].map((t) => (
          <button key={t} onClick={() => setFilter(t)} aria-pressed={filter === t}
            className={`border px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider ${filter === t ? 'border-ink bg-ink text-page' : 'border-ink/25 bg-page text-ink-2 hover:border-ink'}`}>
            {t === 'all' ? `All (${state.hooks.length})` : `${TYPES[t].label} (${state.hooks.filter((h) => h.type === t).length})`}
          </button>
        ))}
      </div>

      {state.hooks.length === 0 ? (
        <div className="mt-3">
          <EmptyState icon={Zap} headline="No hooks in the morgue file yet"
            copy="Strong months are written twice: hooks first, posts second. Bank ten first lines here, then ask the Rewrite Desk (right rail) for ten more in your niche." />
        </div>
      ) : list.length === 0 ? (
        <p className="mt-4 text-[13px] italic text-ink-2">Nothing matches that filter. The morgue file keeps its secrets.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {list.map((h) => (
            <li key={h.id} className="group border border-rule bg-page p-3 shadow-slip">
              <div className="flex items-start justify-between gap-3">
                <TypeTag type={h.type} />
                <div className="flex gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                  <button className={btnGhost} onClick={() => draftFromHook(h)}><PenLine className="h-3.5 w-3.5" aria-hidden="true" />Draft it</button>
                  {editingId === h.id ? (
                    <button className={btnWire} onClick={() => { updateHook(h.id, { text: editText.trim() || h.text }); setEditingId(null); }}>
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />Save
                    </button>
                  ) : (
                    <button className={btnGhost} onClick={() => { setEditingId(h.id); setEditText(h.text); }} aria-label={`Edit hook: ${h.text.slice(0, 40)}`}>Edit</button>
                  )}
                  <button className={btnGhost} onClick={() => deleteHook(h.id)} aria-label={`Delete hook: ${h.text.slice(0, 40)}`}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></button>
                </div>
              </div>
              {editingId === h.id ? (
                <textarea rows={2} autoFocus value={editText} onChange={(e) => setEditText(e.target.value)} className={`${fieldCls} mt-2`} aria-label="Edit hook text" />
              ) : (
                <p className="mt-2 font-display text-[16px] font-black leading-snug text-ink">{h.text}</p>
              )}
              <p className={`mt-1 text-[10px] font-semibold ${h.text.length > HOOK_FOLD ? 'text-ink underline decoration-wavy' : 'text-ink-3'}`}>{h.text.length}/{HOOK_FOLD} before the fold</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ================================================================ Copy Desk */
function CopyDesk({ state, onEdit, onNew, onDelete, updatePost }) {
  const [fStatus, setFStatus] = useState('all');
  const [fType, setFType] = useState('all');
  const list = [...state.posts]
    .filter((p) => (fStatus === 'all' || p.status === fStatus) && (fType === 'all' || p.type === fType))
    .sort((a, b) => (a.date || '9999-99-99').localeCompare(b.date || '9999-99-99'));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2 border-b-2 border-ink pb-2">
        <div>
          <h2 className="font-display text-2xl font-black text-ink sm:text-3xl">Copy Desk</h2>
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-2">Every draft: hook, body, CTA — counted against the fold</p>
        </div>
        <button className={btnWire} onClick={onNew}><Plus className="h-3.5 w-3.5" aria-hidden="true" />New draft <kbd className="ml-1 text-[9px] opacity-70">N</kbd></button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {['all', ...STATUSES].map((s) => (
          <button key={s} onClick={() => setFStatus(s)} aria-pressed={fStatus === s}
            className={`border px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider ${fStatus === s ? 'border-ink bg-ink text-page' : 'border-ink/25 bg-page text-ink-2 hover:border-ink'}`}>{s}</button>
        ))}
        <span className="mx-1 h-4 w-px bg-rule" aria-hidden="true" />
        {['all', ...TYPE_KEYS].map((t) => (
          <button key={t} onClick={() => setFType(t)} aria-pressed={fType === t}
            className={`border px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider ${fType === t ? 'border-wire bg-wire text-page' : 'border-ink/25 bg-page text-ink-2 hover:border-ink'}`}>
            {t === 'all' ? 'all types' : TYPES[t].label}
          </button>
        ))}
      </div>

      {state.posts.length === 0 ? (
        <div className="mt-3">
          <EmptyState icon={PenLine} headline="The desk is clear"
            copy="File a draft and the desk holds it against LinkedIn's real limits: the first 210 characters carry the post, 3,000 end it. Start from a banked hook or a blank slug.">
            <button className={btnWire} onClick={onNew}><Plus className="h-3.5 w-3.5" aria-hidden="true" />File a blank draft</button>
          </EmptyState>
        </div>
      ) : list.length === 0 ? (
        <p className="mt-4 text-[13px] italic text-ink-2">No drafts match those filters.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {list.map((p) => (
            <li key={p.id} className="group border border-rule bg-page p-3 shadow-slip">
              <div className="flex flex-wrap items-center gap-2">
                <StatusGlyph status={p.status} />
                <TypeTag type={p.type} />
                <span className="text-[11px] font-bold text-ink-2">{p.date ? `${p.date} · ${weekdayShort(p.date)}` : 'Unscheduled'}</span>
                <span className={`ml-auto text-[10.5px] font-bold ${p.hook.length > HOOK_FOLD || postChars(p) > POST_MAX ? 'text-ink underline decoration-wavy' : 'text-ink-3'}`}>
                  {p.hook.length}/{HOOK_FOLD} fold · {postChars(p)}/{POST_MAX} total
                </span>
              </div>
              <button onClick={() => onEdit(p.id)} className="mt-1.5 block w-full text-left">
                <p className="font-display text-[17px] font-black leading-snug text-ink group-hover:text-wire">{p.hook || <span className="italic text-ink-3">No hook yet — the fold is empty</span>}</p>
                {p.body && <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-2">{p.body}</p>}
              </button>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <select value={p.status} onChange={(e) => updatePost(p.id, { status: e.target.value })} aria-label="Draft status"
                  className="border border-ink/25 bg-page px-1.5 py-1 text-[11px] font-semibold text-ink">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="date" value={p.date} onChange={(e) => updatePost(p.id, { date: e.target.value })} aria-label="Scheduled date"
                  className="border border-ink/25 bg-page px-1.5 py-0.5 text-[11px] font-semibold text-ink" />
                <span className="ml-auto flex gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                  <button className={btnGhost} onClick={() => onEdit(p.id)}><PenLine className="h-3.5 w-3.5" aria-hidden="true" />Open</button>
                  <button className={btnGhost} onClick={() => onDelete(p.id)} aria-label={`Delete draft: ${p.hook.slice(0, 40) || 'untitled'}`}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ================================================================ Wire Queue */
function WireQueue({ state, addQueueItem, updateQueueItem, deleteQueueItem }) {
  const [kind, setKind] = useState('comment');
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [day, setDay] = useState('Mon');
  const open = state.queue.filter((q) => !q.done).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2 border-b-2 border-ink pb-2">
        <div>
          <h2 className="font-display text-2xl font-black text-ink sm:text-3xl">The Wire</h2>
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-2">Reposts &amp; comments — the cheap half of the cadence · {open} open</p>
        </div>
      </div>

      <div className="mt-3 border border-rule bg-page p-3 shadow-slip">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-2">Put something on the wire</p>
        <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto]">
          <div className="flex gap-1.5">
            {[['comment', MessageSquare, 'Comment'], ['repost', Repeat2, 'Repost']].map(([k, Icon, label]) => (
              <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k}
                className={`inline-flex items-center gap-1 border px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider ${kind === k ? 'border-wire bg-wire text-page' : 'border-ink/25 bg-page text-ink-2 hover:border-ink'}`}>
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}
              </button>
            ))}
          </div>
          <input value={target} onChange={(e) => setTarget(e.target.value)} className={fieldCls}
            placeholder={kind === 'comment' ? 'Whose post? e.g. "Ben Murray — CFO benchmarks thread"' : 'Which of your posts to resurface?'} aria-label="Target" />
          <div className="flex gap-2">
            <select value={day} onChange={(e) => setDay(e.target.value)} aria-label="Day of week" className="border border-ink/25 bg-page px-2 py-1.5 text-[12px] font-semibold text-ink">
              {DAYS.map((d) => <option key={d}>{d}</option>)}
            </select>
            <button className={btnWire} disabled={!target.trim()} onClick={() => { addQueueItem({ kind, target: target.trim(), note: note.trim(), day }); setTarget(''); setNote(''); }}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />Queue
            </button>
          </div>
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} className={`${fieldCls} mt-2`}
          placeholder="Your angle: what will you actually add? (No 'great post!' allowed on this desk.)" aria-label="Angle note" />
      </div>

      {state.queue.length === 0 ? (
        <div className="mt-3">
          <EmptyState icon={Repeat2} headline="The wire is silent"
            copy="Posts earn attention; comments earn relationships. Queue 3 thoughtful comments and 1 repost per week — each with a real angle — and your posts stop landing in a vacuum." />
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {[...state.queue].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.kind.localeCompare(b.kind)).map((q) => (
            <li key={q.id} className={`group flex items-start gap-3 border border-rule bg-page p-2.5 shadow-slip ${q.done ? 'opacity-55' : ''}`}>
              <input type="checkbox" checked={q.done} onChange={(e) => updateQueueItem(q.id, { done: e.target.checked })}
                aria-label={`Mark ${q.target} ${q.done ? 'open' : 'done'}`} className="mt-1 h-4 w-4 accent-[var(--color-wire)]" />
              <span className="w-9 shrink-0 pt-0.5 text-center text-[10px] font-black uppercase tracking-wider text-wire">{q.day}</span>
              <span className="shrink-0 pt-0.5">{q.kind === 'repost' ? <Repeat2 className="h-4 w-4 text-ink-2" aria-hidden="true" /> : <MessageSquare className="h-4 w-4 text-ink-2" aria-hidden="true" />}</span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[13px] font-bold text-ink ${q.done ? 'line-through' : ''}`}>{q.target}</span>
                {q.note && <span className="block text-[12px] text-ink-2">{q.note}</span>}
              </span>
              <button className={`${btnGhost} opacity-60 group-hover:opacity-100`} onClick={() => deleteQueueItem(q.id)} aria-label={`Delete wire item: ${q.target}`}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ================================================================ right rail pieces */
function EditorialSlate({ state, up }) {
  return (
    <div className="border border-rule bg-page p-3 shadow-slip">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-wire">Editorial slate</p>
      <p className="mt-0.5 text-[11px] leading-snug text-ink-2">Who you write for and how you sound. Every Copilot prompt carries this.</p>
      {[
        ['niche', 'Niche', 'e.g. Fractional CFO for B2B SaaS founders, $1–10M ARR'],
        ['audience', 'Audience', 'Who exactly should stop scrolling?'],
        ['voice', 'Voice notes', 'Short lines? No hashtags? Numbers-first? Write your rules.'],
      ].map(([k, label, ph]) => (
        <label key={k} className="mt-2 block">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-2">{label}</span>
          <textarea rows={k === 'voice' ? 2 : 1} value={state[k]} onChange={(e) => up({ [k]: e.target.value })} placeholder={ph} className={`${fieldCls} mt-0.5 resize-none`} />
        </label>
      ))}
    </div>
  );
}

function CopilotPanel({ state, consoleCtx, copilotPost, posts, copilotPostId, setCopilotPostId, copiedKey, doCopyPrompt }) {
  const actions = [
    { key: 'hooks', icon: Zap, title: '10 hooks from my niche', desc: 'Fills the morgue file with scroll-stoppers in your voice.', need: null, build: () => promptHooks(state, consoleCtx) },
    { key: 'expand', icon: PenLine, title: 'Expand this draft into a post', desc: 'Turns the working draft’s hook + notes into finished copy.', need: 'post', build: () => promptExpand(state, copilotPost, consoleCtx) },
    { key: 'critique', icon: Search, title: 'Critique this post’s first line', desc: 'Five scored criteria, one diagnosis, three rewrites.', need: 'post', build: () => promptCritique(state, copilotPost, consoleCtx) },
    { key: 'plan', icon: CalendarDays, title: 'Plan next month’s cadence', desc: 'A full 4-week calendar balanced against what you’ve run.', need: null, build: () => promptNextMonth(state, consoleCtx) },
  ];
  return (
    <div className="border-2 border-ink bg-ink p-3 text-page shadow-plate">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-wire" aria-hidden="true" style={{ color: '#7c8cff' }} />
        <p className="font-display text-lg font-black leading-none">The Rewrite Desk</p>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-page/70">
        Claude is your senior editor. Copy a brief, paste it into claude.ai &mdash; works with the standard $20 Claude subscription. No API, no keys.
      </p>

      <label className="mt-3 block">
        <span className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-page/60">Working draft</span>
        <select value={copilotPost?.id || ''} onChange={(e) => setCopilotPostId(e.target.value)} aria-label="Choose the working draft"
          className="mt-0.5 w-full border border-page/30 bg-ink px-2 py-1.5 text-[12px] font-semibold text-page">
          {posts.length === 0 && <option value="">No drafts yet</option>}
          {posts.map((p) => (
            <option key={p.id} value={p.id}>{(p.date || 'unsched.') + ' · ' + TYPES[p.type].slug + ' · ' + (p.hook ? p.hook.slice(0, 46) : 'untitled')}</option>
          ))}
        </select>
      </label>

      <div className="mt-3 space-y-2">
        {actions.map((a) => {
          const blocked = a.need === 'post' && !copilotPost;
          return (
            <div key={a.key} className="border border-page/25 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1.5 text-[12.5px] font-bold"><a.icon className="h-3.5 w-3.5 shrink-0" style={{ color: '#7c8cff' }} aria-hidden="true" />{a.title}</p>
                  <p className="mt-0.5 text-[10.5px] leading-snug text-page/60">{a.desc}</p>
                </div>
                <button disabled={blocked} onClick={() => doCopyPrompt(a.key, a.build())}
                  className="inline-flex shrink-0 items-center gap-1 border border-page/40 px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider transition-colors hover:bg-page hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-page">
                  {copiedKey === a.key ? <><Check className="h-3 w-3" aria-hidden="true" />Copied</> : <><Copy className="h-3 w-3" aria-hidden="true" />Copy prompt</>}
                </button>
              </div>
              {blocked && <p className="mt-1 text-[10px] italic text-page/50">File a draft first — this brief needs one on the desk.</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WireCopyNotes({ state, up }) {
  return (
    <div className="border border-rule bg-page p-3 shadow-slip">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-ink-2">
        <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />Wire copy from Claude
      </p>
      <p className="mt-0.5 text-[11px] leading-snug text-ink-2">Paste Claude&rsquo;s answers here so they live with the edition. Saved automatically.</p>
      <textarea rows={6} value={state.claudeNotes} onChange={(e) => up({ claudeNotes: e.target.value })}
        placeholder="Hooks, rewrites, cadence plans — paste the good stuff back from claude.ai…" aria-label="Notes pasted back from Claude"
        className={`${fieldCls} mt-2 resize-y font-mono text-[12px]`} />
    </div>
  );
}

/* ================================================================ Post editor modal */
function PostEditor({ post, updatePost, onDelete, onDuplicate, onClose, onSendToCopilot }) {
  const total = postChars(post);
  return (
    <Modal wide title={post.hook ? 'Edit the slug' : 'File a new draft'} kicker={`Copy desk · ${post.date || 'unscheduled'}`} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="flex flex-wrap gap-1.5">
          {TYPE_KEYS.map((t) => (
            <button key={t} onClick={() => updatePost(post.id, { type: t })} aria-pressed={post.type === t}
              className={`border px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider ${post.type === t ? 'border-wire bg-wire text-page' : 'border-ink/25 bg-page text-ink-2 hover:border-ink'}`}
              title={TYPES[t].hint}>{TYPES[t].label}</button>
          ))}
        </div>
        <input type="date" value={post.date} onChange={(e) => updatePost(post.id, { date: e.target.value })} aria-label="Scheduled date"
          className="border border-ink/25 bg-page px-2 py-1 text-[12px] font-semibold text-ink" />
        <select value={post.status} onChange={(e) => updatePost(post.id, { status: e.target.value })} aria-label="Status"
          className="border border-ink/25 bg-page px-2 py-1 text-[12px] font-semibold text-ink">
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <label className="mt-4 block">
        <span className="flex items-baseline justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-ink-2">
          <span>The hook &mdash; everything above the fold</span>
        </span>
        <textarea rows={2} value={post.hook} onChange={(e) => updatePost(post.id, { hook: e.target.value })}
          placeholder="The first line is the whole newspaper. Make them need line two."
          className={`${fieldCls} mt-1 font-display text-[16px] font-black leading-snug`} />
        <Gauge value={post.hook.length} max={HOOK_FOLD + 90} tick={HOOK_FOLD} tickLabel={`fold · ${HOOK_FOLD}`} label="Hook length" />
      </label>

      <label className="block">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-2">Body &mdash; short paragraphs, generous air</span>
        <textarea rows={9} value={post.body} onChange={(e) => updatePost(post.id, { body: e.target.value })}
          placeholder={'One idea per post. One or two lines per paragraph.\n\nLists earn their keep. Adjectives do not.'}
          className={`${fieldCls} mt-1 leading-relaxed`} />
      </label>

      <label className="mt-3 block">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-2">CTA &mdash; one ask, low pressure</span>
        <input value={post.cta} onChange={(e) => updatePost(post.id, { cta: e.target.value })}
          placeholder={'e.g. "Comment LEDGER and I’ll send the checklist."'} className={`${fieldCls} mt-1`} />
      </label>

      <div className="mt-2">
        <Gauge value={total} max={POST_MAX} label="Full post length" />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-rule pt-3">
        <div className="flex gap-2">
          <button className={btnGhost} onClick={onDuplicate}><Copy className="h-3.5 w-3.5" aria-hidden="true" />Duplicate</button>
          <button className={btnGhost} onClick={onDelete}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Spike it</button>
        </div>
        <div className="flex gap-2">
          <button className={btnGhost} onClick={onSendToCopilot}><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />To the Rewrite Desk</button>
          <button className={btnWire} onClick={onClose}><Check className="h-3.5 w-3.5" aria-hidden="true" />Done</button>
        </div>
      </div>
    </Modal>
  );
}

/* ================================================================ Help modal */
function HelpModal({ onClose, firstVisit }) {
  const steps = [
    ['Set your editorial slate', 'Right rail: niche, audience, voice. Thirty seconds now makes every Copilot brief ten times sharper.'],
    ['Load the demo edition', 'See a finished month first — a fractional CFO’s full cadence — then reset or overwrite it with your own.'],
    ['Bank hooks before you write posts', 'Hook Bank tab. File first lines by type: contrarian, story, how-to, proof. Hooks are cheap; keep twenty on ice.'],
    ['File drafts onto the Front Page', 'Click any calendar day to open a fresh slug. Aim for three posts a week; the cadence meter keeps score.'],
    ['Write against the fold', 'In the Copy Desk editor, the gauge marks 210 characters — what LinkedIn shows before "…see more" — and 3,000 overall.'],
    ['Work The Wire', 'Queue 3 comments and 1 repost a week, each with a written angle. Distribution is a habit, not an accident.'],
    ['Hire the Rewrite Desk', 'Copy any Copilot brief, paste it into claude.ai (standard $20 Claude subscription — no API key). Paste answers into "Wire copy from Claude".'],
    ['Export the edition', 'Ctrl/Cmd+S copies the month as Markdown. JSON backs up everything; CSV feeds a scheduler; Print makes the paper copy.'],
  ];
  const keys = [['?', 'Open this style guide'], ['Esc', 'Close any dialog'], ['Ctrl/Cmd + S', 'Copy the edition plan as Markdown'], ['N', 'File a new draft']];
  return (
    <Modal wide title="How this desk works" kicker={firstVisit ? 'Welcome to the newsroom' : 'The style guide'} onClose={onClose}>
      <ol className="space-y-2.5">
        {steps.map(([h, c], i) => (
          <li key={h} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-ink font-display text-[13px] font-black text-page">{i + 1}</span>
            <p className="text-[13px] leading-relaxed text-ink-2"><strong className="font-bold text-ink">{h}.</strong> {c}</p>
          </li>
        ))}
      </ol>
      <div className="mt-4 border-t-2 border-ink pt-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-2">Keyboard</p>
        <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {keys.map(([k, d]) => (
            <p key={k} className="flex items-center gap-2 text-[12.5px] text-ink-2">
              <kbd className="border border-ink/40 bg-pulp px-1.5 py-0.5 text-[11px] font-bold text-ink">{k}</kbd>{d}
            </p>
          ))}
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button className={btnWire} onClick={onClose}><Check className="h-3.5 w-3.5" aria-hidden="true" />To the desk</button>
      </div>
    </Modal>
  );
}

/* ================================================================ Print sheet */
function PrintSheet({ state }) {
  const dated = state.posts.filter((p) => p.date && p.date.startsWith(state.month)).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="print-sheet hidden p-8" aria-hidden="true">
      <h1 className="font-display text-3xl font-black">The Cadence Desk &mdash; {monthLabel(state.month)} edition</h1>
      <p className="mt-1 text-sm">{state.niche || 'Niche not set'} &middot; exported {todayISO()}</p>
      <h2 className="mt-6 border-b-2 border-black pb-1 font-display text-xl font-black">Front page &mdash; calendar</h2>
      {dated.length === 0 ? <p className="mt-2 text-sm italic">No posts filed this month.</p> : (
        <ul className="mt-2 space-y-1 text-sm">
          {dated.map((p) => <li key={p.id}><strong>{p.date} ({weekdayShort(p.date)})</strong> &middot; {TYPES[p.type].label} &middot; {p.status} &mdash; {p.hook || '(no hook)'}</li>)}
        </ul>
      )}
      <h2 className="mt-6 border-b-2 border-black pb-1 font-display text-xl font-black">Copy desk &mdash; full drafts</h2>
      {state.posts.map((p) => (
        <article key={p.id} className="mt-4">
          <h3 className="font-display text-base font-black">{p.date || 'Unscheduled'} &middot; {TYPES[p.type].label} &middot; {p.status} &middot; {postChars(p)}/{POST_MAX} chars</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm">{composePost(p) || '(empty draft)'}</p>
        </article>
      ))}
      <h2 className="mt-6 border-b-2 border-black pb-1 font-display text-xl font-black">Hook bank</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {state.hooks.map((h) => <li key={h.id}>[{TYPES[h.type].label}] {h.text}</li>)}
      </ul>
      <h2 className="mt-6 border-b-2 border-black pb-1 font-display text-xl font-black">Repost &amp; comment wire</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {state.queue.map((q) => <li key={q.id}>[{q.done ? 'x' : ' '}] {q.day} &middot; {q.kind} &middot; {q.target}{q.note ? ` — ${q.note}` : ''}</li>)}
      </ul>
    </div>
  );
}
