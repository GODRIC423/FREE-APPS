import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Anvil, Flame, Hammer, Sparkles, Copy, Check, Download, Printer, CircleHelp,
  RotateCcw, Plus, Trash2, ChevronUp, ChevronDown, Mail, FileJson, FileText, X,
  Undo2, Wand2, TriangleAlert, Scale, Zap, BookOpen, ClipboardPaste,
  MessageSquareQuote, Split, FlaskConical, Eye, GripVertical, ChevronDown as Caret,
} from 'lucide-react';

/* ============================== constants ============================== */

const LS_KEY = 'bizdev:02-cold-email-forge:v1';
const MAX_STEPS = 5;

const MERGE_FIELDS = [
  { key: 'first_name', label: 'First name' },
  { key: 'company', label: 'Company' },
  { key: 'role', label: 'Role' },
  { key: 'pain_point', label: 'Pain point' },
  { key: 'trigger_event', label: 'Trigger event' },
  { key: 'my_name', label: 'My name' },
  { key: 'my_company', label: 'My company' },
  { key: 'calendar_link', label: 'Calendar link' },
];

const SPAM_TERMS = [
  'act now', 'act fast', 'buy now', 'order now', 'apply now', 'call now', 'click here',
  'limited time', 'risk-free', 'risk free', 'no obligation', 'guarantee', 'guaranteed',
  '100% free', 'free trial', 'free demo', 'winner', 'congratulations', 'urgent',
  'exclusive', 'once in a lifetime', 'make money', 'extra income', 'cash bonus',
  'no strings attached', 'best price', 'cheap', 'discount', "don't miss", 'last chance',
  'offer expires', 'dear friend', 'this is not spam', 'pre-approved', 'instant access',
  'miracle', 'no catch', 'satisfaction guaranteed', 'money back',
];

const ME_RE = /\b(i|i'm|i've|i'll|i'd|me|my|mine|we|we're|we've|we'll|our|ours|us)\b/gi;
const YOU_RE = /\b(you|you're|you've|you'll|you'd|your|yours)\b/gi;

/* ============================== utils ============================== */

const uid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const countWords = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;

function blankStep(day = 0) {
  return { id: uid(), day, goal: '', subjectA: '', subjectB: '', activeSubject: 'A', body: '' };
}

function normalize(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  const m = d.meta && typeof d.meta === 'object' ? d.meta : {};
  const p = d.prospect && typeof d.prospect === 'object' ? d.prospect : {};
  const prospect = {};
  for (const f of MERGE_FIELDS) prospect[f.key] = typeof p[f.key] === 'string' ? p[f.key] : '';
  const steps = (Array.isArray(d.steps) ? d.steps : []).slice(0, MAX_STEPS).map((s, i) => ({
    id: typeof s?.id === 'string' && s.id ? s.id : uid(),
    day: Number.isFinite(+s?.day) ? clamp(Math.round(+s.day), 0, 90) : i * 4,
    goal: typeof s?.goal === 'string' ? s.goal : '',
    subjectA: typeof s?.subjectA === 'string' ? s.subjectA : '',
    subjectB: typeof s?.subjectB === 'string' ? s.subjectB : '',
    activeSubject: s?.activeSubject === 'B' ? 'B' : 'A',
    body: typeof s?.body === 'string' ? s.body : '',
  }));
  return {
    version: 1,
    seenGuide: !!d.seenGuide,
    meta: {
      name: typeof m.name === 'string' ? m.name : '',
      audience: typeof m.audience === 'string' ? m.audience : '',
      offer: typeof m.offer === 'string' ? m.offer : '',
    },
    prospect,
    steps,
    copilotNotes: typeof d.copilotNotes === 'string' ? d.copilotNotes : '',
  };
}

function loadInitial() {
  try {
    return normalize(JSON.parse(localStorage.getItem(LS_KEY)));
  } catch {
    return normalize(null);
  }
}

async function safeCopy(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function downloadFile(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type: type || 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

/* ============================== lint engine ============================== */

const activeSubjectText = (s) => (s.activeSubject === 'B' ? s.subjectB : s.subjectA) || '';

function verdictOf(t) {
  if (t >= 80) return { label: 'TEMPERED', tone: 'gold', note: 'passes the delete test' };
  if (t >= 55) return { label: 'WORKABLE', tone: 'ash', note: 'needs more hammering' };
  return { label: 'BRITTLE', tone: 'slag', note: 'shatters on first read' };
}

function lintStep(step) {
  const body = step.body || '';
  const subj = activeSubjectText(step);
  const all = subj + '\n' + body;
  const spamHits = SPAM_TERMS.filter((t) => new RegExp('\\b' + escRe(t) + '\\b', 'i').test(all));
  const capsWords = all.match(/\b[A-Z]{4,}\b/g) || [];
  const exclaims = (all.match(/!/g) || []).length;
  const links = (all.match(/\bhttps?:|\bwww\.|\.[a-z]{2,4}\//gi) || []).length;
  const words = countWords(body);
  const subjChars = subj.length;
  const subjWords = countWords(subj);
  const me = (body.match(ME_RE) || []).length;
  const you = (body.match(YOU_RE) || []).length;
  const youRatio = me + you === 0 ? 0.5 : you / (me + you);
  const spamPenalty = spamHits.length * 2 + capsWords.length + Math.max(0, exclaims - 1) + Math.max(0, links - 1);
  const spamScore = Math.max(0, 1 - spamPenalty * 0.18);
  const bodyLenScore = words === 0 ? 0 : words < 40 ? words / 40 : words <= 120 ? 1 : Math.max(0, 1 - (words - 120) / 130);
  const subjScore = subjChars === 0 ? 0 : subjChars <= 55 && subjWords <= 8 ? 1 : 0.45;
  const lengthScore = 0.75 * bodyLenScore + 0.25 * subjScore;
  const youScore = Math.min(1, youRatio / 0.6);
  const temper = Math.round(100 * (0.4 * spamScore + 0.3 * lengthScore + 0.3 * youScore));
  return {
    spamHits, capsWords, exclaims, links, words, subjChars, subjWords,
    me, you, youRatio, spamScore, lengthScore, youScore, temper,
    verdict: verdictOf(temper),
  };
}

/* ============================== serialization ============================== */

function resolveText(text, prospect) {
  return String(text || '').replace(/\{\{([a-z_]+)\}\}/g, (m, k) => (prospect[k] ? prospect[k] : '[' + k + ']'));
}

function lintLine(l) {
  const spam = l.spamHits.length === 0 ? 'spam clean' : l.spamHits.length + ' spam triggers (' + l.spamHits.join(', ') + ')';
  return 'temper ' + l.temper + '/100 (' + l.verdict.label + ') - ' + l.words + ' words - ' + Math.round(l.youRatio * 100) + '% you-language - ' + spam;
}

function seqToMarkdown(state) {
  const { meta, prospect, steps } = state;
  const L = [];
  L.push('# Cold Email Forge - ' + (meta.name || 'Untitled sequence'));
  L.push('');
  if (meta.audience) L.push('**Audience:** ' + meta.audience);
  if (meta.offer) L.push('**Offer:** ' + meta.offer);
  L.push('**Merge sample:** ' + MERGE_FIELDS.map((f) => f.key + '=' + (prospect[f.key] || '-')).join(' | '));
  L.push('');
  steps.forEach((st, i) => {
    const l = lintStep(st);
    L.push('---');
    L.push('');
    L.push('## Strike ' + (i + 1) + ' - Day ' + st.day + (st.goal ? ' - ' + st.goal : ''));
    L.push('');
    L.push('- Subject A' + (st.activeSubject === 'A' ? ' (active)' : '') + ': ' + (st.subjectA || '-'));
    L.push('- Subject B' + (st.activeSubject === 'B' ? ' (active)' : '') + ': ' + (st.subjectB || '-'));
    L.push('');
    L.push('```text');
    L.push(st.body || '(empty body)');
    L.push('```');
    L.push('');
    L.push('> Lint: ' + lintLine(l));
    L.push('');
  });
  L.push('---');
  L.push('');
  L.push('_Forged in Cold Email Forge. Merge fields stay as {{tokens}} for your sending tool._');
  return L.join('\n');
}

function seqToPlainText(state) {
  const { meta, prospect, steps } = state;
  const L = [];
  L.push('COLD EMAIL FORGE - ' + (meta.name || 'Untitled sequence'));
  L.push('Resolved with sample prospect: ' + (prospect.first_name || '[first_name]') + ' at ' + (prospect.company || '[company]'));
  steps.forEach((st, i) => {
    L.push('');
    L.push('========================================');
    L.push('STEP ' + (i + 1) + ' of ' + steps.length + ' - send on day ' + st.day + (st.goal ? ' - ' + st.goal : ''));
    L.push('Subject: ' + resolveText(activeSubjectText(st), prospect));
    L.push('----------------------------------------');
    L.push(resolveText(st.body, prospect));
  });
  return L.join('\n');
}

function stateContextMd(state) {
  const { meta, prospect } = state;
  const L = [];
  L.push('- Sequence: ' + (meta.name || 'Untitled'));
  L.push('- Audience: ' + (meta.audience || 'not specified'));
  L.push('- Offer: ' + (meta.offer || 'not specified'));
  L.push('');
  L.push('Prospect sample values (these fill the {{merge_fields}}):');
  for (const f of MERGE_FIELDS) L.push('- ' + f.key + ': ' + (prospect[f.key] || 'not set'));
  return L.join('\n');
}

/* ============================== copilot prompts ============================== */

function promptRewrite(state, step, index) {
  const l = lintStep(step);
  const p = state.prospect;
  return [
    'You are a senior cold-email strategist. You write like a sharp, busy human - never like marketing. You obsess over the "delete test": would a skeptical ' + (p.role || 'decision-maker') + ' skim this on a phone between meetings and still reply?',
    '',
    '## The campaign',
    stateContextMd(state),
    '',
    '## The step to rewrite (Strike ' + (index + 1) + ' of ' + state.steps.length + ', sent on day ' + step.day + ')',
    'Goal of this step: ' + (step.goal || 'not stated - infer it'),
    'Subject A: ' + (step.subjectA || '(empty)'),
    'Subject B: ' + (step.subjectB || '(empty)'),
    'Body (plain text; {{tokens}} are merge fields - keep them as tokens):',
    '"""',
    step.body || '(empty)',
    '"""',
    '',
    '## Current lint readout from my editor',
    '- ' + lintLine(l),
    '- Subject length: ' + l.subjChars + ' chars / ' + l.subjWords + ' words (target: under 55 chars, under 8 words)',
    '',
    '## Your task',
    'Rewrite this step so it lands for ' + (p.first_name || 'the prospect') + ', ' + (p.role || 'their role') + ' at ' + (p.company || 'their company') + '. Rules:',
    '1. Under 110 words. Plain text only.',
    '2. Open with THEIR trigger or pain (' + (p.trigger_event || 'their trigger') + ' / ' + (p.pain_point || 'their pain') + '), never with us.',
    '3. Exactly one ask and one link ({{calendar_link}}).',
    '4. Zero spam-trigger phrases, zero exclamation marks, zero hype adjectives.',
    '5. More you-language than me-language. Keep the voice direct, concrete, a little dry.',
    '6. Keep merge fields written as {{tokens}} so I can reuse the step.',
    '',
    '## Output format',
    'Two rewrite variants. For each: subject line, body, then ONE sentence on why it survives the delete test. Close with the single biggest weakness you removed from my draft.',
  ].join('\n');
}

function promptSubjects(state, step, index) {
  return [
    'You are a cold-email subject-line specialist. Your only job: earn the open on a crowded phone screen without lying to the reader. You know that cold subjects work when they are short, specific, and feel typed by a human.',
    '',
    '## The campaign',
    stateContextMd(state),
    '',
    '## The step this subject must carry (Strike ' + (index + 1) + ', day ' + step.day + ')',
    'Current subject A: ' + (step.subjectA || '(empty)'),
    'Current subject B: ' + (step.subjectB || '(empty)'),
    'Body it opens (merge {{tokens}} intact):',
    '"""',
    step.body || '(empty)',
    '"""',
    '',
    '## Your task',
    'Write 5 subject-line variants. Hard rules:',
    '1. Max 6 words or 45 characters each.',
    '2. Must be true to the body - no bait the email cannot cash.',
    '3. No spam triggers, no ALL CAPS, no exclamation marks. Lowercase-casual is allowed.',
    '4. Mix required: 2 curiosity-gap, 1 direct-value, 1 built on the trigger event, 1 pattern-interrupt.',
    '5. Merge fields as {{tokens}} where personalization helps.',
    '',
    '## Output format',
    'A table: variant | type | why it earns the open (one clause). Then name the winner for slot A, the challenger for slot B, and one sentence on what to measure before declaring a winner.',
  ].join('\n');
}

function promptCritique(state) {
  return [
    'You are the most skeptical VP of Sales alive. You receive 100+ cold emails a week and delete 99 of them in under two seconds each. You are also a world-class cold-email coach, so when you critique, every cut has a reason a writer can act on.',
    '',
    '## My full sequence (exported from my editor, with per-step lint scores)',
    '',
    seqToMarkdown(state),
    '',
    '## Your task',
    'Run the delete test on every step, in character as the buyer described under "Audience". For each step: state the exact word or line where you would stop reading, and why. Then step out of character and coach me.',
    '',
    'Judge specifically:',
    '1. First line: does it earn line two, or does it smell like a template?',
    '2. The me-vs-you balance - who is this email really about?',
    '3. The ask: is there exactly one, and is it sized to the relationship (a cold day-0 ask differs from a day-12 ask)?',
    '4. Sequence logic: does each step add NEW value, or just repeat pressure?',
    '5. The break-up step: graceful exit or guilt trip?',
    '',
    '## Output format',
    '1. Verdict table: step | DELETE or READ | the exact line that killed it or saved it.',
    '2. The 5 highest-impact fixes, ranked, each with a before/after snippet.',
    '3. A full rewrite of the single weakest step (keep {{tokens}}).',
    '4. One thing I should keep exactly as it is, and why.',
    'Be brutal. Do not soften. If a step works, say why in one line only.',
  ].join('\n');
}

/* ============================== demo data ============================== */

const DEMO = {
  version: 1,
  seenGuide: true,
  meta: {
    name: 'Post-funding RevOps outreach',
    audience: 'VP Sales at Series A/B B2B SaaS, 20-80 reps',
    offer: 'Forgeline 21-day RevOps sprint - CRM cleanup, lead routing, and a pipeline dashboard reps actually update',
  },
  prospect: {
    first_name: 'Mara',
    company: 'Brightloop',
    role: 'VP Sales',
    pain_point: 'reps burning 5+ hours a week on manual CRM updates',
    trigger_event: 'your Series B announcement last Tuesday',
    my_name: 'Dev Okonkwo',
    my_company: 'Forgeline',
    calendar_link: 'cal.com/dev-forgeline/15',
  },
  steps: [
    {
      id: 'demo-1', day: 0, goal: 'Earn the open, then open a loop',
      subjectA: '{{company}} + the post-funding scramble',
      subjectB: 'congrats, {{first_name}} - and a question',
      activeSubject: 'A',
      body: 'Hi {{first_name}},\n\nSaw {{trigger_event}} - congrats. The usual next move is doubling the sales team, and that is exactly when CRM hygiene quietly falls apart: {{pain_point}}.\n\nQuestion: if every rep at {{company}} got those hours back next quarter, where would you point them?\n\nAsking because Forgeline runs a 21-day RevOps sprint for teams your size. No deck - just a before/after from two teams at your stage.\n\nWorth 15 minutes? {{calendar_link}}\n\n- {{my_name}}, {{my_company}}',
    },
    {
      id: 'demo-2', day: 3, goal: 'The bump - add value, never "just checking in"',
      subjectA: 're: {{company}} + the post-funding scramble',
      subjectB: 'the 5 hours, {{first_name}}',
      activeSubject: 'A',
      body: '{{first_name}} - one number while you plan the quarter:\n\nAfter Loopwell\'s 21-day sprint, their reps logged 71% less CRM admin in week one. That was 34 reps, same stage as {{company}}.\n\nIf the timing is off, tell me and I will close the loop. If it is not, grab 15 minutes: {{calendar_link}}\n\n- {{my_name}}',
    },
    {
      id: 'demo-3', day: 7, goal: 'Proof strike - the case study',
      subjectA: 'how Loopwell cut 71% of CRM admin',
      subjectB: '{{first_name}}, the before/after I promised',
      activeSubject: 'A',
      body: 'Hi {{first_name}},\n\nPromised proof, so here it is in plain text:\n\nBefore: 14 pipeline fields, reps updating 5 of them, forecast built on guesswork.\nAfter 21 days: 6 fields, routing automated, forecast pulled straight from live data.\n\nThe VP Sales there says the Monday pipeline meeting got 40 minutes shorter.\n\nIf {{pain_point}} sounds familiar, this maps cleanly onto {{company}}. Happy to walk you through the exact playbook: {{calendar_link}}\n\n- {{my_name}}',
    },
    {
      id: 'demo-4', day: 12, goal: 'The break-up - close the loop with grace',
      subjectA: 'closing the file on {{company}}',
      subjectB: 'wrong timing, {{first_name}}?',
      activeSubject: 'B',
      body: '{{first_name}} - taking the hint and closing the file on {{company}}.\n\nOne parting note: post-funding is when CRM debt compounds fastest. Whoever fixes it for you - us or someone else - make sure it happens this quarter.\n\nIf the timing turns, you know where to find me: {{calendar_link}}\n\nGood luck with the scale-up.\n\n- {{my_name}}, {{my_company}}',
    },
  ],
  copilotNotes: '',
};

/* ============================== shared classes ============================== */

const btnBase = 'inline-flex items-center gap-1.5 rounded-lg border text-sm font-semibold transition-colors';
const btnGhost = btnBase + ' border-coal-600 bg-coal-800/80 px-3 py-1.5 text-bone-300 hover:border-ash-600 hover:text-bone-100';
const btnEmber = btnBase + ' border-ember-600 bg-gradient-to-b from-ember-500 to-ember-600 px-3 py-1.5 text-coal-950 hover:from-ember-400 hover:to-ember-500';
const btnDanger = btnBase + ' border-slag-500/60 bg-coal-800/80 px-3 py-1.5 text-slag-300 hover:bg-slag-500/15';
const inputCls = 'w-full rounded-lg border border-coal-600 bg-coal-900/80 px-2.5 py-1.5 text-sm text-bone-100 placeholder:text-ash-600 focus:border-ember-600 focus:outline-none';
const panelCls = 'rounded-xl border border-coal-600/70 bg-coal-850/95 shadow-forge';
const kickerCls = 'font-mono text-[10px] uppercase tracking-[0.22em] text-ash-500';

/* ============================== graphics ============================== */

function SparksCanvas({ className }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const spawn = (seedLife) => ({
      x: w * (0.5 + (Math.random() - 0.5) * 0.26),
      y: h * (0.6 + Math.random() * 0.08),
      vx: (Math.random() - 0.5) * 0.7,
      vy: -(0.5 + Math.random() * 1.3),
      size: 0.8 + Math.random() * 1.7,
      hue: 18 + Math.random() * 28,
      life: seedLife ? Math.random() : 1,
      decay: 0.006 + Math.random() * 0.012,
      sway: Math.random() * Math.PI * 2,
    });

    if (reduced) {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < 14; i += 1) {
        const p = spawn(true);
        const y = p.y - Math.random() * h * 0.4;
        ctx.beginPath();
        ctx.arc(p.x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = 'hsla(' + p.hue + ', 100%, 62%, ' + (0.2 + Math.random() * 0.3) + ')';
        ctx.fill();
      }
      return () => ro.disconnect();
    }

    const parts = Array.from({ length: 44 }, () => spawn(true));
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < parts.length; i += 1) {
        const p = parts[i];
        p.sway += 0.05;
        p.x += p.vx + Math.sin(p.sway) * 0.3;
        p.y += p.vy;
        p.vy *= 0.995;
        p.life -= p.decay;
        if (p.life <= 0 || p.y < -6) parts[i] = spawn(false);
        const a = Math.max(0, Math.min(1, p.life));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.7), 0, Math.PI * 2);
        ctx.fillStyle = 'hsla(' + p.hue + ', 100%, ' + (55 + a * 18) + '%, ' + a * 0.85 + ')';
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

function AnvilArt() {
  return (
    <svg viewBox="0 0 260 170" className="h-full w-auto" role="img" aria-label="Anvil with a glowing ingot">
      <defs>
        <linearGradient id="anvSteel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4d4038" />
          <stop offset="0.5" stopColor="#332a23" />
          <stop offset="1" stopColor="#241d17" />
        </linearGradient>
        <linearGradient id="anvIngot" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff8a3d" />
          <stop offset="0.5" stopColor="#fff3d6" />
          <stop offset="1" stopColor="#ff6b1a" />
        </linearGradient>
        <radialGradient id="anvGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ff6b1a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff6b1a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="132" cy="160" rx="92" ry="8" fill="#000" opacity="0.45" />
      <ellipse cx="140" cy="58" rx="78" ry="30" fill="url(#anvGlow)" className="anim-ember" />
      {/* horn + face */}
      <path
        d="M10 82 C10 70 30 62 52 62 L208 62 C216 62 221 66 221 71 L221 79 C221 84 216 87 210 87 L84 87 C56 90 28 90 10 82 Z"
        fill="url(#anvSteel)" stroke="#5c5248" strokeWidth="1"
      />
      <path d="M52 63 L208 63" stroke="#ffd9a0" strokeOpacity="0.28" strokeWidth="1.6" strokeLinecap="round" />
      {/* step */}
      <rect x="96" y="87" width="82" height="11" rx="2" fill="#2a221c" stroke="#463a30" strokeWidth="1" />
      {/* waist */}
      <path d="M112 98 L162 98 L154 122 L120 122 Z" fill="url(#anvSteel)" stroke="#463a30" strokeWidth="1" />
      {/* foot */}
      <path d="M102 122 L172 122 L186 140 C188 144 186 147 181 147 L93 147 C88 147 86 144 88 140 Z" fill="url(#anvSteel)" stroke="#463a30" strokeWidth="1" />
      <rect x="80" y="147" width="114" height="11" rx="3" fill="#241d17" stroke="#463a30" strokeWidth="1" />
      {/* ingot on the face */}
      <rect x="112" y="47" width="58" height="15" rx="3" fill="url(#anvIngot)" className="anim-ember" />
      <rect x="112" y="47" width="58" height="15" rx="3" fill="none" stroke="#fff3d6" strokeOpacity="0.5" strokeWidth="0.8" />
      {/* heat shimmer ticks */}
      <path d="M104 40 L100 30" stroke="#ff8a3d" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
      <path d="M141 36 L141 25" stroke="#ffc24b" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      <path d="M178 40 L183 30" stroke="#ff8a3d" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function TemperGauge({ value, label }) {
  const gid = useMemo(() => 'dg' + Math.random().toString(36).slice(2, 8), []);
  const cx = 80;
  const cy = 84;
  const r = 62;
  const len = Math.PI * r;
  const t = clamp(value, 0, 100) / 100;
  const theta = Math.PI * (1 - t);
  const nx = cx + Math.cos(theta) * (r - 18);
  const ny = cy - Math.sin(theta) * (r - 18);
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const th = Math.PI * (1 - i / 10);
    const major = i % 5 === 0;
    const r1 = r - 9;
    const r2 = major ? r - 17 : r - 13;
    return {
      x1: cx + Math.cos(th) * r1, y1: cy - Math.sin(th) * r1,
      x2: cx + Math.cos(th) * r2, y2: cy - Math.sin(th) * r2,
      major, key: i,
    };
  });
  const v = verdictOf(value);
  const chip = v.tone === 'gold'
    ? 'border-heat-400/50 bg-heat-400/10 text-heat-300'
    : v.tone === 'ash'
      ? 'border-ash-500/50 bg-ash-500/10 text-ash-300'
      : 'border-slag-500/50 bg-slag-500/10 text-slag-300';
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 160 100" className="w-44" role="img" aria-label={label + ': ' + value + ' out of 100'}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--color-ash-600)" />
            <stop offset="0.55" stopColor="var(--color-ember-500)" />
            <stop offset="1" stopColor="var(--color-heat-300)" />
          </linearGradient>
        </defs>
        <path d={'M ' + (cx - r) + ' ' + cy + ' A ' + r + ' ' + r + ' 0 0 1 ' + (cx + r) + ' ' + cy} fill="none" stroke="var(--color-coal-700)" strokeWidth="9" strokeLinecap="round" />
        {t > 0 && (
          <path
            d={'M ' + (cx - r) + ' ' + cy + ' A ' + r + ' ' + r + ' 0 0 1 ' + (cx + r) + ' ' + cy}
            fill="none" stroke={'url(#' + gid + ')'} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={t * len + ' ' + len}
          />
        )}
        {ticks.map((k) => (
          <line key={k.key} x1={k.x1} y1={k.y1} x2={k.x2} y2={k.y2} stroke={k.major ? 'var(--color-ash-500)' : 'var(--color-coal-500)'} strokeWidth={k.major ? 1.6 : 1} />
        ))}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--color-heat-200)" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill="var(--color-ember-500)" stroke="var(--color-coal-950)" strokeWidth="2" />
        <text x={cx - r - 2} y={cy + 13} fontSize="7.5" fill="var(--color-ash-500)" fontFamily="var(--font-mono)">COLD</text>
        <text x={cx + r + 2} y={cy + 13} textAnchor="end" fontSize="7.5" fill="var(--color-heat-400)" fontFamily="var(--font-mono)">WHITE-HOT</text>
      </svg>
      <div className="-mt-3 flex items-baseline gap-1 font-mono">
        <span className="text-3xl font-semibold text-bone-100">{value}</span>
        <span className="text-xs text-ash-500">/100</span>
      </div>
      <div className={'mt-1 rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-[0.18em] ' + chip}>{v.label}</div>
      <div className={kickerCls + ' mt-1.5'}>{label}</div>
    </div>
  );
}

function MiniTemper({ value }) {
  const r = 13;
  const c = 2 * Math.PI * r;
  const color = value >= 80 ? 'var(--color-heat-400)' : value >= 55 ? 'var(--color-ash-400)' : 'var(--color-slag-500)';
  return (
    <svg viewBox="0 0 34 34" className="h-9 w-9 shrink-0" role="img" aria-label={'Temper ' + value + ' of 100'}>
      <circle cx="17" cy="17" r={r} fill="none" stroke="var(--color-coal-600)" strokeWidth="3.5" />
      {value > 0 && (
        <circle
          cx="17" cy="17" r={r} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={(value / 100) * c + ' ' + c} transform="rotate(-90 17 17)"
        />
      )}
      <text x="17" y="21" textAnchor="middle" fontSize="10.5" fill="var(--color-bone-100)" fontFamily="var(--font-mono)">{value}</text>
    </svg>
  );
}

/* ============================== meters ============================== */

function LengthMeter({ words }) {
  const max = 200;
  const pct = (Math.min(words, max) / max) * 100;
  const good = words >= 40 && words <= 120;
  const verdict = words === 0
    ? 'cold bar - nothing forged yet'
    : words < 25
      ? 'too thin - reads like a drive-by'
      : words < 40
        ? 'getting there - one more heat'
        : good
          ? 'forge weight: right'
          : words <= 150
            ? 'running heavy - trim the slag'
            : 'a wall - deleted on sight';
  const tone = words === 0 ? 'text-ash-500' : good ? 'text-heat-300' : 'text-slag-300';
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className={kickerCls + ' flex items-center gap-1'}><Scale className="h-3 w-3" aria-hidden /> Forge weight</span>
        <span className={'font-mono text-[11px] ' + tone}>{words} words</span>
      </div>
      <div className="relative mt-2 h-2 rounded-full bg-coal-700">
        <div className="absolute inset-y-0 rounded-sm bg-ember-500/25 ring-1 ring-ember-500/40" style={{ left: '20%', width: '40%' }} />
        {[0, 20, 60, 100].map((x) => (
          <div key={x} className="absolute top-full h-1 w-px bg-ash-700" style={{ left: x + '%' }} />
        ))}
        <div className="absolute -top-1 h-4 w-0.5 rounded bg-heat-200 shadow-[0_0_6px_rgba(255,194,75,0.9)]" style={{ left: 'min(' + pct + '%, 99%)' }} />
      </div>
      <div className="relative mt-1.5 h-3 font-mono text-[9px] text-ash-600">
        <span className="absolute left-0">0</span>
        <span className="absolute" style={{ left: '20%' }}>40</span>
        <span className="absolute" style={{ left: '60%' }}>120</span>
        <span className="absolute right-0">200+</span>
      </div>
      <div className="mt-0.5 text-[11px] leading-snug text-ash-400">{verdict}</div>
    </div>
  );
}

function MeYouMeter({ lint }) {
  const total = lint.me + lint.you;
  const youPct = Math.round(lint.youRatio * 100);
  const mePct = 100 - youPct;
  const verdict = total === 0
    ? 'no pronouns yet - write the email'
    : lint.youRatio >= 0.6
      ? 'about them - holds'
      : lint.youRatio >= 0.45
        ? 'balanced - push further toward them'
        : 'all about you - flip the camera';
  const tone = total === 0 ? 'text-ash-500' : lint.youRatio >= 0.6 ? 'text-heat-300' : lint.youRatio >= 0.45 ? 'text-ash-300' : 'text-slag-300';
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className={kickerCls + ' flex items-center gap-1'}><Eye className="h-3 w-3" aria-hidden /> Me vs you</span>
        <span className={'font-mono text-[11px] ' + tone}>{youPct}% you</span>
      </div>
      <div className="relative mt-2 flex h-2 overflow-hidden rounded-full bg-coal-700">
        <div className="h-full bg-ash-600/80" style={{ width: mePct + '%' }} />
        <div className="h-full bg-gradient-to-r from-ember-600 to-heat-400" style={{ width: youPct + '%' }} />
      </div>
      <div className="relative mt-0.5 h-2">
        <div className="absolute left-1/2 -top-3 h-4 w-px bg-bone-100/40" aria-hidden />
      </div>
      <div className="flex justify-between font-mono text-[9px] text-ash-600">
        <span>me {lint.me}</span>
        <span>you {lint.you}</span>
      </div>
      <div className="mt-0.5 text-[11px] leading-snug text-ash-400">{verdict}</div>
    </div>
  );
}

function SpamMeter({ lint }) {
  const extras = [];
  if (lint.capsWords.length > 0) extras.push('CAPS: ' + lint.capsWords.slice(0, 3).join(', '));
  if (lint.exclaims > 1) extras.push(lint.exclaims + ' exclamation marks');
  if (lint.links > 1) extras.push(lint.links + ' links (keep 1)');
  const clean = lint.spamHits.length === 0 && extras.length === 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className={kickerCls + ' flex items-center gap-1'}><TriangleAlert className="h-3 w-3" aria-hidden /> Spam heat</span>
        <span className={'font-mono text-[11px] ' + (clean ? 'text-heat-300' : 'text-slag-300')}>
          {clean ? 'CLEAN' : lint.spamHits.length + extras.length + ' flags'}
        </span>
      </div>
      {clean ? (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-heat-400/25 bg-heat-400/5 px-2 py-1 text-[11px] text-ash-300">
          <Check className="h-3 w-3 text-heat-400" aria-hidden /> No trigger words, caps, or bait
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1">
          {lint.spamHits.map((h) => (
            <span key={h} className="rounded-full border border-slag-500/50 bg-slag-500/10 px-2 py-0.5 font-mono text-[10px] text-slag-300">{h}</span>
          ))}
          {extras.map((e) => (
            <span key={e} className="rounded-full border border-slag-500/30 bg-slag-500/5 px-2 py-0.5 font-mono text-[10px] text-slag-300/90">{e}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================== small components ============================== */

function Modal({ open, onClose, title, kicker, icon: Icon, wide, children }) {
  if (!open) return null;
  return (
    <div className="print-hide fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-coal-950/85 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog" aria-modal="true" aria-label={title}
        className={'anim-modal relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-xl border border-coal-600 bg-coal-850 shadow-forge ' + (wide ? 'max-w-3xl' : 'max-w-xl')}
      >
        <div className="flex items-center justify-between gap-3 border-b border-coal-700 bg-coal-800/70 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            {Icon && <Icon className="h-4.5 w-4.5 text-ember-400" aria-hidden />}
            <div>
              {kicker && <div className={kickerCls}>{kicker}</div>}
              <h2 className="font-display text-lg font-bold leading-tight text-bone-100">{title}</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg border border-coal-600 bg-coal-800 p-1.5 text-ash-400 hover:text-bone-100">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function ResolvedText({ text, prospect }) {
  const parts = String(text || '').split(/(\{\{[a-z_]+\}\})/g);
  return parts.map((p, i) => {
    const m = p.match(/^\{\{([a-z_]+)\}\}$/);
    if (!m) return <span key={i}>{p}</span>;
    const v = prospect[m[1]];
    if (v) return <span key={i} className="text-heat-300">{v}</span>;
    return <span key={i} className="rounded bg-slag-500/15 px-1 font-semibold text-slag-300">{p}</span>;
  });
}

function CopyButton({ getText, label, copiedLabel, className, onDone }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      className={className || btnEmber}
      onClick={async () => {
        const ok = await safeCopy(getText());
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1800);
        if (onDone) onDone(ok);
      }}
    >
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {copied ? (copiedLabel || 'Copied') : label}
    </button>
  );
}

/* ============================== app ============================== */

export default function App() {
  const [state, setState] = useState(loadInitial);
  const [helpOpen, setHelpOpen] = useState(!state.seenGuide);
  const [selectedId, setSelectedId] = useState(state.steps[0] ? state.steps[0].id : null);
  const [exportOpen, setExportOpen] = useState(false);
  const [promptModal, setPromptModal] = useState(null); // {kicker, title, text}
  const [toast, setToast] = useState(null); // {id, msg, action}
  const [resetArmed, setResetArmed] = useState(false);
  const [previewMode, setPreviewMode] = useState('step');
  const bodyRefs = useRef({});
  const fileRef = useRef(null);
  const toastTimer = useRef(null);
  const resetTimer = useRef(null);

  /* autosave (debounced) */
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
    }, 350);
    return () => clearTimeout(t);
  }, [state]);

  /* keep a valid selection */
  useEffect(() => {
    if (state.steps.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!state.steps.some((s) => s.id === selectedId)) setSelectedId(state.steps[0].id);
  }, [state.steps, selectedId]);

  const lints = useMemo(() => {
    const map = {};
    for (const s of state.steps) map[s.id] = lintStep(s);
    return map;
  }, [state.steps]);

  const avgTemper = state.steps.length === 0
    ? 0
    : Math.round(state.steps.reduce((a, s) => a + lints[s.id].temper, 0) / state.steps.length);
  const totalWords = state.steps.reduce((a, s) => a + lints[s.id].words, 0);
  const totalFlags = state.steps.reduce((a, s) => a + lints[s.id].spamHits.length, 0);
  const daySpan = state.steps.length === 0 ? 0 : Math.max(...state.steps.map((s) => s.day));
  const selectedIndex = state.steps.findIndex((s) => s.id === selectedId);
  const selectedStep = selectedIndex >= 0 ? state.steps[selectedIndex] : null;

  /* ---------- toast ---------- */
  const showToast = useCallback((msg, action) => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), msg, action });
    toastTimer.current = setTimeout(() => setToast(null), 7000);
  }, []);
  useEffect(() => () => { clearTimeout(toastTimer.current); clearTimeout(resetTimer.current); }, []);

  /* ---------- actions ---------- */
  const closeHelp = useCallback(() => {
    setHelpOpen(false);
    setState((s) => (s.seenGuide ? s : { ...s, seenGuide: true }));
  }, []);

  const loadDemo = () => {
    const next = normalize(DEMO);
    next.seenGuide = true;
    setState(next);
    setSelectedId(next.steps[0].id);
    setPreviewMode('step');
    showToast('Demo loaded - a four-strike sequence, fully tempered.');
  };

  const doReset = () => {
    clearTimeout(resetTimer.current);
    if (!resetArmed) {
      setResetArmed(true);
      resetTimer.current = setTimeout(() => setResetArmed(false), 4000);
      return;
    }
    setResetArmed(false);
    const fresh = normalize(null);
    fresh.seenGuide = true;
    setState(fresh);
    setSelectedId(null);
    showToast('Forge cleared. The anvil is cold.');
  };

  const addStep = () => {
    if (state.steps.length >= MAX_STEPS) return;
    const lastDay = state.steps.length ? Math.max(...state.steps.map((s) => s.day)) : -4;
    const st = blankStep(clamp(lastDay + 4, 0, 90));
    setState((s) => ({ ...s, steps: [...s.steps, st] }));
    setSelectedId(st.id);
  };

  const updateStep = (id, patch) => {
    setState((s) => ({ ...s, steps: s.steps.map((st) => (st.id === id ? { ...st, ...patch } : st)) }));
  };

  const moveStep = (id, dir) => {
    setState((s) => {
      const i = s.steps.findIndex((st) => st.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.steps.length) return s;
      const steps = [...s.steps];
      const [it] = steps.splice(i, 1);
      steps.splice(j, 0, it);
      return { ...s, steps };
    });
  };

  const deleteStep = (id) => {
    const idx = state.steps.findIndex((st) => st.id === id);
    if (idx < 0) return;
    const removed = state.steps[idx];
    setState((s) => ({ ...s, steps: s.steps.filter((st) => st.id !== id) }));
    showToast('Strike ' + (idx + 1) + ' scrapped.', {
      label: 'Undo',
      fn: () => {
        setState((s) => {
          const steps = [...s.steps];
          steps.splice(Math.min(idx, steps.length), 0, removed);
          return { ...s, steps };
        });
        setSelectedId(removed.id);
        clearTimeout(toastTimer.current);
        setToast(null);
      },
    });
  };

  const insertMerge = (stepId, key) => {
    const token = '{{' + key + '}}';
    const el = bodyRefs.current[stepId];
    const step = state.steps.find((s) => s.id === stepId);
    if (!step) return;
    if (!el) {
      updateStep(stepId, { body: (step.body || '') + token });
      return;
    }
    const start = el.selectionStart != null ? el.selectionStart : el.value.length;
    const end = el.selectionEnd != null ? el.selectionEnd : start;
    const body = step.body.slice(0, start) + token + step.body.slice(end);
    updateStep(stepId, { body });
    requestAnimationFrame(() => {
      try {
        el.focus();
        const pos = start + token.length;
        el.setSelectionRange(pos, pos);
      } catch { /* detached */ }
    });
  };

  const copyMarkdown = useCallback(async () => {
    const ok = await safeCopy(seqToMarkdown(state));
    showToast(ok ? 'Sequence Markdown copied to clipboard.' : 'Copy blocked by the browser - use Export > Download instead.');
  }, [state, showToast]);

  const copyPlainText = async () => {
    const ok = await safeCopy(seqToPlainText(state));
    showToast(ok ? 'Resolved plain-text sequence copied.' : 'Copy blocked by the browser - use Export > Download instead.');
  };

  const onImportFile = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const next = normalize(JSON.parse(String(r.result)));
        next.seenGuide = true;
        setState(next);
        setSelectedId(next.steps[0] ? next.steps[0].id : null);
        showToast('Sequence imported from JSON.');
      } catch {
        showToast('Import failed - that file is not valid Forge JSON.');
      }
    };
    r.readAsText(f);
  };

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === 's') {
        e.preventDefault();
        copyMarkdown();
        return;
      }
      if (e.key === 'Escape') {
        if (promptModal) { setPromptModal(null); return; }
        if (exportOpen) { setExportOpen(false); return; }
        if (helpOpen) { closeHelp(); return; }
        if (resetArmed) setResetArmed(false);
        return;
      }
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
      if (e.key === '?') {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (e.key === '[' || e.key === ']') {
        if (state.steps.length === 0) return;
        const i = state.steps.findIndex((s) => s.id === selectedId);
        const j = clamp(i + (e.key === ']' ? 1 : -1), 0, state.steps.length - 1);
        setSelectedId(state.steps[j].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [copyMarkdown, promptModal, exportOpen, helpOpen, resetArmed, state.steps, selectedId, closeHelp]);

  /* ---------- copilot ---------- */
  const openPrompt = (kind) => {
    if (kind === 'critique') {
      setPromptModal({ kicker: 'Forge hand prompt', title: 'Brutal critique - the delete test', text: promptCritique(state) });
      return;
    }
    if (!selectedStep) return;
    if (kind === 'rewrite') {
      setPromptModal({ kicker: 'Forge hand prompt', title: 'Re-strike step ' + (selectedIndex + 1) + ' for ' + (state.prospect.first_name || 'the prospect'), text: promptRewrite(state, selectedStep, selectedIndex) });
    } else if (kind === 'subjects') {
      setPromptModal({ kicker: 'Forge hand prompt', title: '5 subject variants for strike ' + (selectedIndex + 1), text: promptSubjects(state, selectedStep, selectedIndex) });
    }
  };

  const setMeta = (k, v) => setState((s) => ({ ...s, meta: { ...s.meta, [k]: v } }));
  const setProspect = (k, v) => setState((s) => ({ ...s, prospect: { ...s.prospect, [k]: v } }));

  const hasSteps = state.steps.length > 0;

  /* ============================== render ============================== */
  return (
    <>
      <div className="print-hide">
        {/* ===== top bar ===== */}
        <header className="sticky top-0 z-40 border-b border-coal-700/80 bg-coal-950/85 backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-ember-600/50 bg-gradient-to-b from-coal-750 to-coal-900 shadow-forge">
                <Anvil className="h-5 w-5 text-ember-400" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="truncate font-display text-lg font-extrabold leading-tight tracking-tight text-bone-100">
                  COLD EMAIL <span className="bg-gradient-to-r from-ember-400 to-heat-400 bg-clip-text text-transparent">FORGE</span>
                </div>
                <div className="hidden font-mono text-[10px] uppercase tracking-[0.24em] text-ash-500 sm:block">
                  Sequences that survive the delete test
                </div>
              </div>
            </div>
            <nav className="flex items-center gap-2" aria-label="Primary actions">
              <button type="button" className={btnGhost} onClick={loadDemo}>
                <Flame className="h-4 w-4 text-ember-400" aria-hidden />
                <span className="hidden sm:inline">Load demo</span>
              </button>
              <button
                type="button"
                className={resetArmed ? btnDanger : btnGhost}
                onClick={doReset}
                aria-label={resetArmed ? 'Confirm reset - this clears everything' : 'Reset the forge'}
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{resetArmed ? 'Really clear?' : 'Reset'}</span>
              </button>
              <button type="button" className={btnGhost} onClick={() => setHelpOpen(true)}>
                <CircleHelp className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">How to use</span>
              </button>
              <div className="relative">
                <button
                  type="button"
                  className={btnEmber}
                  onClick={() => setExportOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={exportOpen}
                >
                  <Download className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Export</span>
                  <Caret className="h-3.5 w-3.5" aria-hidden />
                </button>
                {exportOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setExportOpen(false)} aria-hidden="true" />
                    <div role="menu" aria-label="Export options" className="absolute right-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-xl border border-coal-600 bg-coal-850 shadow-forge">
                      {[
                        { icon: FileText, t: 'Copy Markdown', d: 'The full sequence artifact (Ctrl/Cmd+S)', fn: () => { setExportOpen(false); copyMarkdown(); } },
                        { icon: Mail, t: 'Copy plain text', d: 'Merge fields resolved with sample prospect', fn: () => { setExportOpen(false); copyPlainText(); } },
                        { icon: FileJson, t: 'Download JSON', d: 'Full state backup, re-importable', fn: () => { setExportOpen(false); downloadFile('cold-email-forge.json', JSON.stringify(state, null, 2)); showToast('JSON backup downloaded.'); } },
                        { icon: ClipboardPaste, t: 'Import JSON', d: 'Restore a downloaded backup', fn: () => { setExportOpen(false); if (fileRef.current) fileRef.current.click(); } },
                        { icon: Printer, t: 'Print forge sheet', d: 'A clean sheet of the whole sequence', fn: () => { setExportOpen(false); window.print(); } },
                      ].map((it) => (
                        <button key={it.t} type="button" role="menuitem" onClick={it.fn} className="flex w-full items-start gap-3 border-b border-coal-700/60 px-4 py-3 text-left last:border-0 hover:bg-coal-800">
                          <it.icon className="mt-0.5 h-4 w-4 shrink-0 text-ember-400" aria-hidden />
                          <span>
                            <span className="block text-sm font-semibold text-bone-100">{it.t}</span>
                            <span className="block text-xs text-ash-500">{it.d}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} aria-label="Import JSON file" />
            </nav>
          </div>
        </header>

        {/* ===== hero ===== */}
        <section className="relative overflow-hidden border-b border-coal-700/60">
          <div className="mx-auto grid max-w-[1400px] items-center gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:gap-10 lg:px-8">
            <div>
              <h1 className="max-w-2xl font-display text-3xl font-extrabold leading-[1.08] tracking-tight text-bone-100 sm:text-4xl">
                Hammer cold email until it survives{' '}
                <span className="bg-gradient-to-r from-ember-400 via-heat-400 to-heat-200 bg-clip-text text-transparent">the delete test.</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-ash-400">
                Five strikes max. Merge-field steel. A lint meter that tells you the truth about spam heat,
                forge weight, and me-vs-you balance - before any prospect ever sees it.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  { n: state.steps.length, u: state.steps.length === 1 ? 'strike' : 'strikes' },
                  { n: daySpan, u: 'day span' },
                  { n: totalWords, u: 'words total' },
                  { n: totalFlags, u: totalFlags === 1 ? 'spam flag' : 'spam flags', warn: totalFlags > 0 },
                ].map((c) => (
                  <div key={c.u} className={'rounded-lg border px-3 py-1.5 ' + (c.warn ? 'border-slag-500/50 bg-slag-500/10' : 'border-coal-600 bg-coal-800/70')}>
                    <span className={'font-mono text-base font-semibold ' + (c.warn ? 'text-slag-300' : 'text-heat-300')}>{c.n}</span>
                    <span className="ml-1.5 font-mono text-[10px] uppercase tracking-wider text-ash-500">{c.u}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden justify-self-center lg:block">
              <TemperGauge value={avgTemper} label="Sequence temper" />
            </div>
            <div className="relative h-44 w-64 justify-self-center sm:h-48">
              <SparksCanvas className="absolute inset-0 h-full w-full" />
              <div className="absolute inset-x-0 bottom-0 flex justify-center">
                <div className="h-40 sm:h-44"><AnvilArt /></div>
              </div>
            </div>
            <div className="lg:hidden">
              <TemperGauge value={avgTemper} label="Sequence temper" />
            </div>
          </div>
        </section>

        {/* ===== main ===== */}
        <main className="mx-auto max-w-[1400px] px-4 pb-28 pt-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            {/* ---------- forge line (steps) ---------- */}
            <section aria-label="Sequence steps">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <div className={kickerCls}>The forge line</div>
                  <h2 className="font-display text-xl font-bold text-bone-100">Your strikes</h2>
                </div>
                <button type="button" className={btnEmber} onClick={addStep} disabled={state.steps.length >= MAX_STEPS} aria-label="Add a step">
                  <Hammer className="h-4 w-4" aria-hidden />
                  {state.steps.length >= MAX_STEPS ? 'Five strikes max' : 'Strike a new step'}
                </button>
              </div>

              {/* firing order strip */}
              {state.steps.length >= 2 && (
                <div className={panelCls + ' mb-4 px-6 py-4'}>
                  <div className={kickerCls + ' mb-3'}>Firing order - day offsets</div>
                  <div className="relative mx-2 h-10">
                    <div className="absolute inset-x-0 top-3.5 h-px bg-gradient-to-r from-coal-600 via-ash-700 to-coal-600" aria-hidden />
                    {state.steps.map((s, i) => {
                      const span = Math.max(daySpan, 1);
                      const left = (s.day / span) * 100;
                      const l = lints[s.id];
                      const tone = l.temper >= 80 ? 'border-heat-400 bg-coal-800 text-heat-300' : l.temper >= 55 ? 'border-ash-500 bg-coal-800 text-ash-300' : 'border-slag-500 bg-coal-800 text-slag-300';
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedId(s.id)}
                          className="absolute top-0 -translate-x-1/2"
                          style={{ left: left + '%' }}
                          aria-label={'Select strike ' + (i + 1) + ', day ' + s.day}
                        >
                          <span className={'grid h-7 w-7 place-items-center rounded-full border-2 font-mono text-[11px] font-semibold ' + tone + (s.id === selectedId ? ' ring-2 ring-ember-500/60' : '')}>
                            {i + 1}
                          </span>
                          <span className="mt-0.5 block text-center font-mono text-[9px] text-ash-600">d{s.day}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* empty state */}
              {!hasSteps && (
                <div className={panelCls + ' relative overflow-hidden px-6 py-12 text-center'}>
                  <Anvil className="mx-auto h-10 w-10 text-ash-600" aria-hidden />
                  <h3 className="mt-3 font-display text-2xl font-extrabold text-bone-100">The forge is cold.</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ash-400">
                    No strikes yet. Load the demo to study a tempered four-step sequence,
                    or put the first ingot on the anvil and start hammering.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <button type="button" className={btnEmber} onClick={loadDemo}>
                      <Flame className="h-4 w-4" aria-hidden /> Load the demo sequence
                    </button>
                    <button type="button" className={btnGhost} onClick={addStep}>
                      <Hammer className="h-4 w-4" aria-hidden /> Strike step one
                    </button>
                  </div>
                </div>
              )}

              {/* step cards */}
              <div className="space-y-4">
                {state.steps.map((step, i) => {
                  const l = lints[step.id];
                  const selected = step.id === selectedId;
                  return (
                    <article
                      key={step.id}
                      onClick={() => setSelectedId(step.id)}
                      className={panelCls + ' overflow-hidden transition-shadow ' + (selected ? 'shadow-ember border-ember-600/60' : '')}
                      aria-label={'Strike ' + (i + 1)}
                    >
                      {/* card head */}
                      <div className="flex flex-wrap items-center gap-3 border-b border-coal-700/70 bg-coal-800/50 px-4 py-3">
                        <GripVertical className="h-4 w-4 shrink-0 text-ash-700" aria-hidden />
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ember-400">Strike {i + 1}</span>
                        <label className="flex items-center gap-1.5 rounded-lg border border-coal-600 bg-coal-900/70 px-2 py-1">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-ash-500">Day</span>
                          <input
                            type="number" min="0" max="90" value={step.day}
                            onChange={(e) => updateStep(step.id, { day: clamp(Math.round(+e.target.value || 0), 0, 90) })}
                            className="w-10 bg-transparent font-mono text-sm text-heat-300 focus:outline-none"
                            aria-label={'Send day for strike ' + (i + 1)}
                          />
                        </label>
                        <input
                          value={step.goal}
                          onChange={(e) => updateStep(step.id, { goal: e.target.value })}
                          placeholder="Goal of this strike - e.g. Earn the open"
                          className="min-w-32 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm italic text-bone-300 placeholder:text-ash-600 hover:border-coal-600 focus:border-ember-600 focus:outline-none"
                          aria-label={'Goal for strike ' + (i + 1)}
                        />
                        <div className="ml-auto flex items-center gap-1.5">
                          <MiniTemper value={l.temper} />
                          <span className={
                            'hidden rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-[0.16em] sm:inline ' +
                            (l.verdict.tone === 'gold' ? 'border-heat-400/50 bg-heat-400/10 text-heat-300'
                              : l.verdict.tone === 'ash' ? 'border-ash-500/50 bg-ash-500/10 text-ash-300'
                                : 'border-slag-500/50 bg-slag-500/10 text-slag-300')
                          }>
                            {l.verdict.label}
                          </span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); moveStep(step.id, -1); }} disabled={i === 0} aria-label={'Move strike ' + (i + 1) + ' up'} className="rounded-lg border border-coal-600 p-1.5 text-ash-400 hover:text-bone-100 disabled:opacity-30">
                            <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); moveStep(step.id, 1); }} disabled={i === state.steps.length - 1} aria-label={'Move strike ' + (i + 1) + ' down'} className="rounded-lg border border-coal-600 p-1.5 text-ash-400 hover:text-bone-100 disabled:opacity-30">
                            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); deleteStep(step.id); }} aria-label={'Scrap strike ' + (i + 1)} className="rounded-lg border border-coal-600 p-1.5 text-ash-400 hover:border-slag-500/60 hover:text-slag-300">
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4 px-4 py-4">
                        {/* subjects */}
                        <div>
                          <div className={kickerCls + ' mb-2 flex items-center gap-1.5'}>
                            <Split className="h-3 w-3" aria-hidden /> Subject slots - A/B
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {['A', 'B'].map((slot) => {
                              const val = slot === 'A' ? step.subjectA : step.subjectB;
                              const active = step.activeSubject === slot;
                              const chars = val.length;
                              const wc = countWords(val);
                              const okLen = chars > 0 && chars <= 55 && wc <= 8;
                              return (
                                <div key={slot} className={'flex items-center gap-2 rounded-lg border px-2 py-1.5 ' + (active ? 'border-ember-600/70 bg-ember-900/15' : 'border-coal-600 bg-coal-900/60')}>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); updateStep(step.id, { activeSubject: slot }); }}
                                    aria-label={'Make subject ' + slot + ' active for strike ' + (i + 1)}
                                    aria-pressed={active}
                                    className={'grid h-6 w-6 shrink-0 place-items-center rounded-md font-mono text-[11px] font-bold ' + (active ? 'bg-ember-500 text-coal-950' : 'border border-coal-600 text-ash-400 hover:text-bone-100')}
                                  >
                                    {slot}
                                  </button>
                                  <input
                                    value={val}
                                    onChange={(e) => updateStep(step.id, slot === 'A' ? { subjectA: e.target.value } : { subjectB: e.target.value })}
                                    placeholder={slot === 'A' ? 'Subject slot A' : 'Subject slot B - the challenger'}
                                    className="w-full bg-transparent text-sm text-bone-100 placeholder:text-ash-600 focus:outline-none"
                                    aria-label={'Subject ' + slot + ' for strike ' + (i + 1)}
                                  />
                                  <span className={'shrink-0 font-mono text-[10px] ' + (chars === 0 ? 'text-ash-600' : okLen ? 'text-heat-300' : 'text-slag-300')}>
                                    {chars}c/{wc}w
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* body */}
                        <div>
                          <div className={kickerCls + ' mb-2 flex items-center gap-1.5'}>
                            <Mail className="h-3 w-3" aria-hidden /> Plain-text body
                          </div>
                          <textarea
                            ref={(el) => { bodyRefs.current[step.id] = el; }}
                            value={step.body}
                            onChange={(e) => updateStep(step.id, { body: e.target.value })}
                            placeholder={'Write like you talk. Open with their trigger, not your pitch.\nInsert merge fields below - they resolve in the Quench Test.'}
                            rows={8}
                            className="w-full resize-y rounded-lg border border-coal-600 bg-coal-900/80 px-3 py-2.5 font-mono text-[13px] leading-relaxed text-bone-100 placeholder:text-ash-600 focus:border-ember-600 focus:outline-none"
                            aria-label={'Email body for strike ' + (i + 1)}
                          />
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-ash-600">Merge steel:</span>
                            {MERGE_FIELDS.map((f) => (
                              <button
                                key={f.key}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); insertMerge(step.id, f.key); }}
                                title={f.label + (state.prospect[f.key] ? ' = ' + state.prospect[f.key] : ' (no sample value yet)')}
                                className="rounded-md border border-coal-600 bg-coal-800/80 px-1.5 py-0.5 font-mono text-[10px] text-ash-300 hover:border-ember-600 hover:text-heat-300"
                              >
                                {'{{' + f.key + '}}'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* lint meters */}
                        <div className="rounded-lg border border-coal-700 bg-coal-900/50 px-4 py-3">
                          <div className={kickerCls + ' mb-3 flex items-center gap-1.5'}>
                            <FlaskConical className="h-3 w-3" aria-hidden /> Forge inspection
                          </div>
                          <div className="grid gap-4 md:grid-cols-3">
                            <SpamMeter lint={l} />
                            <LengthMeter words={l.words} />
                            <MeYouMeter lint={l} />
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {hasSteps && state.steps.length < MAX_STEPS && (
                <button type="button" onClick={addStep} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-coal-600 py-3 text-sm font-semibold text-ash-500 hover:border-ember-600/60 hover:text-ember-400">
                  <Plus className="h-4 w-4" aria-hidden /> Strike {state.steps.length + 1} of {MAX_STEPS}
                </button>
              )}
            </section>

            {/* ---------- right rail ---------- */}
            <aside className="space-y-6">
              {/* quench test */}
              <section className={panelCls} aria-label="Plain-text preview">
                <div className="flex items-center justify-between gap-2 border-b border-coal-700 bg-coal-800/50 px-4 py-3">
                  <div>
                    <div className={kickerCls}>Quench test</div>
                    <h2 className="font-display text-base font-bold text-bone-100">Plain text, as it lands</h2>
                  </div>
                  <div className="flex rounded-lg border border-coal-600 p-0.5">
                    {[['step', 'This step'], ['sequence', 'Full run']].map(([k, t]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setPreviewMode(k)}
                        aria-pressed={previewMode === k}
                        className={'rounded-md px-2.5 py-1 text-xs font-semibold ' + (previewMode === k ? 'bg-ember-500 text-coal-950' : 'text-ash-400 hover:text-bone-100')}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="px-4 py-4">
                  {!hasSteps && (
                    <p className="text-sm text-ash-500">Nothing to quench. Strike a step and the plain-text preview appears here, merge fields resolved.</p>
                  )}
                  {hasSteps && (previewMode === 'step' ? (selectedStep ? [selectedStep] : []) : state.steps).map((st, i) => (
                    <div key={st.id} className={'overflow-hidden rounded-lg border border-coal-600 bg-coal-900 ' + (i > 0 ? 'mt-4' : '')}>
                      <div className="flex items-center gap-1.5 border-b border-coal-700 bg-coal-800/70 px-3 py-2">
                        <span className="h-2 w-2 rounded-full bg-slag-500/70" aria-hidden />
                        <span className="h-2 w-2 rounded-full bg-heat-400/70" aria-hidden />
                        <span className="h-2 w-2 rounded-full bg-ember-500/70" aria-hidden />
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-ash-500">
                          Day {st.day} - strike {state.steps.indexOf(st) + 1} of {state.steps.length}
                        </span>
                      </div>
                      <div className="px-3.5 py-3 font-mono text-[12px] leading-relaxed">
                        <div className="text-ash-500">
                          <span className="text-ash-600">From:</span> {state.prospect.my_name || '[my_name]'}{state.prospect.my_company ? ' - ' + state.prospect.my_company : ''}
                        </div>
                        <div className="text-ash-500">
                          <span className="text-ash-600">To:</span> {state.prospect.first_name || '[first_name]'}{state.prospect.company ? ' @ ' + state.prospect.company : ''}
                        </div>
                        <div className="mt-1 border-b border-dashed border-coal-600 pb-2 text-bone-100">
                          <span className="text-ash-600">Subject:</span>{' '}
                          <ResolvedText text={activeSubjectText(st) || '(no subject in the active slot)'} prospect={state.prospect} />
                        </div>
                        <div className="mt-2 whitespace-pre-wrap text-bone-300">
                          {st.body
                            ? <ResolvedText text={st.body} prospect={state.prospect} />
                            : <span className="text-ash-600">(empty body - the anvil awaits)</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                  {hasSteps && (
                    <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-snug text-ash-500">
                      <Zap className="mt-0.5 h-3 w-3 shrink-0 text-heat-400" aria-hidden />
                      Highlighted values come from the Prospect Ingot. Red tokens have no sample value yet.
                    </p>
                  )}
                </div>
              </section>

              {/* the job + prospect ingot */}
              <section className={panelCls} aria-label="Campaign and prospect details">
                <div className="border-b border-coal-700 bg-coal-800/50 px-4 py-3">
                  <div className={kickerCls}>The job</div>
                  <h2 className="font-display text-base font-bold text-bone-100">What are we forging?</h2>
                </div>
                <div className="space-y-2.5 px-4 py-4">
                  <label className="block">
                    <span className={kickerCls}>Sequence name</span>
                    <input className={inputCls + ' mt-1'} value={state.meta.name} onChange={(e) => setMeta('name', e.target.value)} placeholder="e.g. Post-funding RevOps outreach" />
                  </label>
                  <label className="block">
                    <span className={kickerCls}>Audience</span>
                    <input className={inputCls + ' mt-1'} value={state.meta.audience} onChange={(e) => setMeta('audience', e.target.value)} placeholder="Who receives this? Be narrow." />
                  </label>
                  <label className="block">
                    <span className={kickerCls}>Offer</span>
                    <input className={inputCls + ' mt-1'} value={state.meta.offer} onChange={(e) => setMeta('offer', e.target.value)} placeholder="The thing you actually sell, in one line" />
                  </label>
                </div>
                <div className="border-y border-coal-700 bg-coal-800/50 px-4 py-3">
                  <div className={kickerCls}>Prospect ingot</div>
                  <h2 className="font-display text-base font-bold text-bone-100">Sample merge values</h2>
                </div>
                <div className="grid grid-cols-1 gap-2.5 px-4 py-4 sm:grid-cols-2">
                  {MERGE_FIELDS.map((f) => (
                    <label key={f.key} className="block">
                      <span className="font-mono text-[10px] text-ash-500">{'{{' + f.key + '}}'}</span>
                      <input
                        className={inputCls + ' mt-1'}
                        value={state.prospect[f.key]}
                        onChange={(e) => setProspect(f.key, e.target.value)}
                        placeholder={f.label}
                        aria-label={'Sample value for ' + f.label}
                      />
                    </label>
                  ))}
                  <p className="text-[11px] leading-snug text-ash-500 sm:col-span-2">
                    These sample values fill your merge fields in the Quench Test and travel with every Copilot prompt.
                  </p>
                </div>
              </section>

              {/* copilot */}
              <section className={panelCls + ' relative overflow-hidden'} aria-label="Claude Copilot">
                <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-ember-500/10 blur-2xl" aria-hidden />
                <div className="border-b border-coal-700 bg-gradient-to-r from-coal-800/70 to-coal-800/30 px-4 py-3">
                  <div className={kickerCls + ' flex items-center gap-1.5'}>
                    <Sparkles className="h-3 w-3 text-heat-400" aria-hidden /> Forge hand
                  </div>
                  <h2 className="font-display text-base font-bold text-bone-100">Claude Copilot</h2>
                  <p className="mt-1 text-[11px] leading-snug text-ash-500">
                    Copy a prompt, paste it into claude.ai - works with the standard $20 Claude subscription. No API, no key.
                    Each prompt carries your sequence, prospect, and lint scores.
                  </p>
                </div>
                <div className="space-y-2 px-4 py-4">
                  {[
                    { k: 'rewrite', icon: Wand2, t: 'Re-strike this step for the prospect', d: selectedStep ? 'Personalized rewrite of strike ' + (selectedIndex + 1) + ' for ' + (state.prospect.first_name || 'your prospect') : 'Select a step first', need: !!selectedStep },
                    { k: 'subjects', icon: Split, t: 'Forge 5 subject variants', d: selectedStep ? 'A/B ammunition for strike ' + (selectedIndex + 1) + '’s subject slots' : 'Select a step first', need: !!selectedStep },
                    { k: 'critique', icon: Flame, t: 'Brutal critique - the delete test', d: hasSteps ? 'The whole sequence, judged by the meanest VP alive' : 'Forge at least one step first', need: hasSteps },
                  ].map((a) => (
                    <button
                      key={a.k}
                      type="button"
                      disabled={!a.need}
                      onClick={() => openPrompt(a.k)}
                      className="flex w-full items-start gap-3 rounded-xl border border-coal-600 bg-coal-800/60 px-3.5 py-3 text-left transition-colors hover:border-ember-600/60 hover:bg-coal-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-ember-600/40 bg-ember-900/20">
                        <a.icon className="h-4 w-4 text-ember-400" aria-hidden />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-bone-100">{a.t}</span>
                        <span className="block text-[11px] leading-snug text-ash-500">{a.d}</span>
                      </span>
                    </button>
                  ))}
                  <div className="pt-2">
                    <div className={kickerCls + ' flex items-center gap-1.5'}>
                      <MessageSquareQuote className="h-3 w-3" aria-hidden /> Quench notes
                    </div>
                    <textarea
                      value={state.copilotNotes}
                      onChange={(e) => setState((s) => ({ ...s, copilotNotes: e.target.value }))}
                      rows={4}
                      placeholder="Paste Claude's answer back here - it saves with your sequence."
                      className="mt-1.5 w-full resize-y rounded-lg border border-coal-600 bg-coal-900/80 px-3 py-2 text-xs leading-relaxed text-bone-300 placeholder:text-ash-600 focus:border-ember-600 focus:outline-none"
                      aria-label="Notes from Claude's answers"
                    />
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </main>

        {/* ===== footer ===== */}
        <footer className="border-t border-coal-700/60 py-6 text-center font-mono text-[10px] uppercase tracking-[0.24em] text-ash-600">
          Cold Email Forge - everything stays in your browser - press ? for the guide
        </footer>

        {/* ===== help modal ===== */}
        <Modal open={helpOpen} onClose={closeHelp} title="How to work the forge" kicker="Guide" icon={BookOpen} wide>
          <ol className="list-none space-y-3">
            {[
              ['Load the demo', 'Hit "Load demo" in the top bar to study a finished four-strike sequence - a post-funding RevOps campaign with tempered copy.'],
              ['Describe the job', 'In "What are we forging?", set the sequence name, the narrow audience, and your one-line offer. The Copilot prompts lean on these.'],
              ['Cast the prospect ingot', 'Fill the sample merge values (first name, company, pain, trigger). They resolve your {{merge_fields}} in the preview and prompts.'],
              ['Strike your steps', 'Up to five strikes. Set each step’s send day and goal, then write a plain-text body. Click a merge chip to insert a token at your cursor.'],
              ['Fill both subject slots', 'Write an A and a B subject per step, then toggle which one is active. The counters go gold under 55 characters and 8 words.'],
              ['Read the forge inspection', 'Every step is linted live: spam heat (trigger words, caps, bait), forge weight (40-120 words), and me-vs-you balance. Hammer until the temper ring reads 80+.'],
              ['Run the quench test', 'The right-hand preview shows the exact plain text a prospect receives - this step or the full run. Red tokens are missing sample values.'],
              ['Call the forge hand', 'Use a Claude Copilot action, copy the prompt into claude.ai, then paste the answer into Quench notes. Export Markdown, JSON, or a print sheet when the temper holds.'],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ember-500 font-mono text-xs font-bold text-coal-950">{i + 1}</span>
                <div>
                  <div className="text-sm font-semibold text-bone-100">{t}</div>
                  <div className="text-xs leading-relaxed text-ash-400">{d}</div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-5 rounded-xl border border-coal-600 bg-coal-900/60 p-4">
            <div className={kickerCls + ' mb-2'}>Keyboard</div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {[
                ['?', 'Open this guide'],
                ['Esc', 'Close dialogs'],
                ['Ctrl/Cmd + S', 'Copy the sequence as Markdown'],
                ['[ and ]', 'Select previous / next strike'],
              ].map(([k, d]) => (
                <div key={k} className="flex items-center gap-2 text-xs text-ash-400">
                  <kbd className="rounded-md border border-coal-500 bg-coal-800 px-1.5 py-0.5 font-mono text-[11px] text-heat-300">{k}</kbd>
                  {d}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="button" className={btnEmber} onClick={closeHelp}>
              <Hammer className="h-4 w-4" aria-hidden /> To the anvil
            </button>
          </div>
        </Modal>

        {/* ===== copilot prompt modal ===== */}
        <Modal open={!!promptModal} onClose={() => setPromptModal(null)} title={promptModal ? promptModal.title : ''} kicker={promptModal ? promptModal.kicker : ''} icon={Sparkles} wide>
          {promptModal && (
            <>
              <textarea
                readOnly
                value={promptModal.text}
                rows={14}
                className="w-full resize-y rounded-lg border border-coal-600 bg-coal-900 px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-bone-300 focus:border-ember-600 focus:outline-none"
                aria-label="Generated Claude prompt"
                onFocus={(e) => e.target.select()}
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-sm text-[11px] leading-snug text-ash-500">
                  Paste into claude.ai - works with the standard $20 Claude subscription. Your sequence, prospect, and lint scores travel inside the prompt.
                </p>
                <CopyButton getText={() => promptModal.text} label="Copy prompt" copiedLabel="Prompt copied" />
              </div>
            </>
          )}
        </Modal>

        {/* ===== toast ===== */}
        {toast && (
          <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex justify-center px-4">
            <div role="status" className="anim-toast pointer-events-auto relative w-full max-w-md overflow-hidden rounded-xl border border-coal-500 bg-coal-800 px-4 py-3 shadow-forge">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-bone-100">{toast.msg}</span>
                {toast.action && (
                  <button type="button" onClick={toast.action.fn} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-ember-600/60 bg-ember-900/30 px-2.5 py-1 text-xs font-bold text-ember-300 hover:bg-ember-900/60">
                    <Undo2 className="h-3.5 w-3.5" aria-hidden /> {toast.action.label}
                  </button>
                )}
              </div>
              <div className="anim-toast-bar absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-ember-500 to-heat-400" aria-hidden />
            </div>
          </div>
        )}
      </div>

      {/* ===== print sheet ===== */}
      <section className="print-sheet hidden bg-white px-10 py-8 text-black">
        <h1 className="font-display text-2xl font-extrabold">Cold Email Forge - {state.meta.name || 'Untitled sequence'}</h1>
        <p className="mt-1 text-sm">
          {state.meta.audience && <span><strong>Audience:</strong> {state.meta.audience} &nbsp; </span>}
          {state.meta.offer && <span><strong>Offer:</strong> {state.meta.offer}</span>}
        </p>
        <p className="mt-1 text-xs">
          Merge sample: {MERGE_FIELDS.map((f) => f.key + '=' + (state.prospect[f.key] || '-')).join(' | ')}
        </p>
        {state.steps.map((st, i) => {
          const l = lintStep(st);
          return (
            <div key={st.id} className="mt-6 border-t border-black/30 pt-4" style={{ breakInside: 'avoid' }}>
              <h2 className="font-display text-lg font-bold">Strike {i + 1} - Day {st.day}{st.goal ? ' - ' + st.goal : ''}</h2>
              <p className="mt-1 text-sm">
                <strong>Subject A{st.activeSubject === 'A' ? ' (active)' : ''}:</strong> {st.subjectA || '-'}<br />
                <strong>Subject B{st.activeSubject === 'B' ? ' (active)' : ''}:</strong> {st.subjectB || '-'}
              </p>
              <pre className="mt-2 whitespace-pre-wrap border border-black/20 p-3 font-mono text-xs leading-relaxed">{st.body || '(empty body)'}</pre>
              <p className="mt-1 font-mono text-[10px]">Lint: {lintLine(l)}</p>
            </div>
          );
        })}
        <p className="mt-8 font-mono text-[10px]">Forged in Cold Email Forge. Merge fields stay as tokens for your sending tool.</p>
      </section>
    </>
  );
}
