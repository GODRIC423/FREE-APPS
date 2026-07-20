import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Anchor, AlertTriangle, Sunrise, BadgeCheck, Target,
  Sparkles, RotateCcw, HelpCircle, Download, Plus, Trash2,
  ChevronRight, ChevronDown, X, Check, Copy, Upload,
  FileJson, FileText, FileSpreadsheet, Keyboard, ClipboardPaste,
  Lightbulb, Search, ArrowUp, ArrowDown, Undo2, Printer, Pin,
  ListOrdered, Waypoints, Wand2, Type, Presentation, LayoutPanelTop,
} from 'lucide-react';

/* ================================================================
   Narrative Deck Builder — structure the sales story before slides
   World: storyboard — matte cork black, pinned index cards, red string.
   ================================================================ */

const LS_KEY = 'bizdev:19-narrative-deck-builder:v1';

const uid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/* ---------------- domain constants ---------------- */

const STAGES = [
  {
    id: 'status-quo', label: 'Status Quo', act: 'setup', icon: Anchor,
    hint: 'The ordinary world, before anything breaks.',
    dot: 'bg-slate', text: 'text-slate', border: 'border-slate/40', chip: 'bg-slate/15 text-slate',
  },
  {
    id: 'threat', label: 'Threat', act: 'conflict', icon: AlertTriangle,
    hint: 'What breaks, costs, or is about to get worse.',
    dot: 'bg-ember', text: 'text-ember', border: 'border-ember/40', chip: 'bg-ember/15 text-ember',
  },
  {
    id: 'promised-land', label: 'Promised Land', act: 'resolution', icon: Sunrise,
    hint: 'The specific, vivid future if they act.',
    dot: 'bg-brass', text: 'text-brass', border: 'border-brass/40', chip: 'bg-brass/15 text-brass',
  },
  {
    id: 'proof', label: 'Proof', act: 'resolution', icon: BadgeCheck,
    hint: 'Evidence this future is real and repeatable.',
    dot: 'bg-moss', text: 'text-moss', border: 'border-moss/40', chip: 'bg-moss/15 text-moss',
  },
  {
    id: 'ask', label: 'The Ask', act: 'resolution', icon: Target,
    hint: 'The exact next step you want them to take.',
    dot: 'bg-teal', text: 'text-teal', border: 'border-teal/40', chip: 'bg-teal/15 text-teal',
  },
];
const STAGE_IDS = STAGES.map(s => s.id);
const STAGE_BY_ID = Object.fromEntries(STAGES.map(s => [s.id, s]));

const ACT_LABEL = { setup: 'Setup', conflict: 'Conflict', resolution: 'Resolution' };
const ACT_DOT = { setup: 'bg-slate', conflict: 'bg-ember', resolution: 'bg-brass' };
const ACT_FILL = { setup: '#8493a3', conflict: '#c1543a', resolution: '#cda23c' };
const ACT_RANGE = { setup: [15, 32], conflict: [14, 42], resolution: [38, 100] };

/* ---------------- normalize & persistence ---------------- */

const str = (v, d = '') => (typeof v === 'string' ? v : d);
const bool = v => v === true;

function normalizeBeat(raw) {
  const b = raw && typeof raw === 'object' ? raw : {};
  return {
    id: str(b.id) || uid(),
    stage: STAGE_IDS.includes(b.stage) ? b.stage : 'status-quo',
    beat: str(b.beat),
    headline: str(b.headline),
    support: str(b.support),
    visual: str(b.visual),
  };
}

function normalize(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    title: str(s.title, 'Untitled pitch'),
    audience: str(s.audience),
    beats: Array.isArray(s.beats) ? s.beats.map(normalizeBeat) : [],
    copilotNotes: str(s.copilotNotes),
    seenGuide: bool(s.seenGuide),
  };
}

function loadState() {
  try {
    return normalize(JSON.parse(localStorage.getItem(LS_KEY) || 'null'));
  } catch {
    return normalize(null);
  }
}

/* ---------------- demo data ---------------- */

const DEMO = normalize({
  title: 'Atlas Warehouse OS — Pitch to Crestline Distribution',
  audience: '45-minute pitch to Priya Anand (VP Ops) and the CFO. Goal: a signed 2-week pilot in the Denver DC before quarter end.',
  beats: [
    {
      id: 'd1', stage: 'status-quo',
      beat: "Crestline's three regional DCs still run picks off a whiteboard and grease-pencil checklists — a system built in 2011 and never touched since.",
      headline: 'Paper still runs the floor',
      support: '3 regional DCs · 40 shift leads · one whiteboard workflow, unchanged since 2011',
      visual: 'Photo: a warehouse whiteboard covered in grease-pencil pick lists',
    },
    {
      id: 'd2', stage: 'status-quo',
      beat: "Every peak season they hire 200 temps and train each one by hand for two weeks before they're fast enough to trust with a full shift.",
      headline: 'Two weeks of training before a temp earns trust',
      support: '200 seasonal hires · 2-week ramp · veteran pickers pulled off the floor to train them',
      visual: 'Simple timeline graphic: hire → 2 weeks shadowing → full shift',
    },
    {
      id: 'd3', stage: 'threat',
      beat: 'Mis-picks cost Crestline $1.4M last year in returns, re-ships, and rush freight to fix the mistake.',
      headline: '$1.4M walked out the door in wrong boxes',
      support: 'FY25 finance report · returns + re-ships + rush freight, combined',
      visual: 'Bar chart: mis-pick cost by quarter, climbing left to right',
    },
    {
      id: 'd4', stage: 'threat',
      beat: "Their biggest account, Meridian Retail, put Crestline on a formal 'performance watch' after two blown delivery windows this spring.",
      headline: 'Your biggest customer is already watching',
      support: '2 missed delivery windows, Q1 · Meridian is 22% of Crestline’s revenue',
      visual: 'Screenshot-style mock: a stern vendor performance-review notice',
    },
    {
      id: 'd5', stage: 'promised-land',
      beat: 'Every picker sees the fastest route on a handheld the second a batch drops — no whiteboard, no memorizing the layout, no tribal knowledge.',
      headline: 'The floor runs itself',
      support: 'Voice-directed picks · dynamic routing · live exception alerts to the shift lead’s phone',
      visual: 'Screenshot: handheld showing the next pick, route highlighted on a mini floor map',
    },
    {
      id: 'd6', stage: 'promised-land',
      beat: "New temps hit 90% of a veteran's pick speed on day one, because the system tells them exactly where to go and what to grab.",
      headline: 'Day one, not week two',
      support: '90% of veteran speed by shift one · ramp time cut from 2 weeks to a single shift',
      visual: 'Before/after ramp-speed line chart, temp cohort',
    },
    {
      id: 'd7', stage: 'proof',
      beat: "Fernwood cut mis-picks 71% for Anchor Fulfillment in the first 90 days of going live — independently verified by Anchor's own ops team.",
      headline: '71% fewer mis-picks in 90 days — Anchor Fulfillment',
      support: 'Independently audited by Anchor’s ops team · same pick-density profile as Crestline’s Denver DC',
      visual: 'Before/after mis-pick-rate chart, Anchor Fulfillment',
    },
    {
      id: 'd8', stage: 'proof',
      beat: "Anchor's VP of Ops has agreed to take a reference call this week and speak candidly about the rollout, warts included.",
      headline: 'A reference who’ll tell you the truth',
      support: '15-minute call, no sales rep on the line · ask about the rollout, not just the results',
      visual: 'Simple contact card: name, title, "available this week"',
    },
    {
      id: 'd9', stage: 'ask',
      beat: 'We’re asking for a two-week pilot in the Denver DC only — it runs in parallel to the whiteboard, so nothing is at risk while we prove it.',
      headline: 'One DC. Two weeks. Zero risk to the whiteboard.',
      support: 'Denver DC only · runs parallel, whiteboard stays live · success metric: mis-pick rate delta, measured daily',
      visual: 'Simple 2-week pilot timeline: setup → live → readout',
    },
    {
      id: 'd10', stage: 'ask',
      beat: 'If the pilot beats a 40% mis-pick reduction, we ask for a signed rollout to all three DCs at the locked-in pilot price.',
      headline: 'Beat 40%, and we roll out at pilot pricing',
      support: 'Rollout trigger: ≥40% mis-pick reduction · pricing locked for 90 days post-pilot',
      visual: 'One-line term sheet mock-up: trigger → price → timeline',
    },
  ],
  copilotNotes: '',
  seenGuide: true,
});

/* ---------------- derived / serialization ---------------- */

const stageLabel = id => (STAGE_BY_ID[id] || {}).label || id;

function beatsByStage(beats, stageId) {
  return beats.filter(b => b.stage === stageId);
}

function orderedBeats(beats) {
  return STAGE_IDS.flatMap(id => beatsByStage(beats, id));
}

function beatWeight(b) {
  return (b.beat + ' ' + b.headline + ' ' + b.support + ' ' + b.visual)
    .trim().split(/\s+/).filter(Boolean).length;
}

function computeFlow(beats) {
  const sums = { setup: 0, conflict: 0, resolution: 0 };
  beats.forEach(b => {
    const st = STAGE_BY_ID[b.stage];
    if (!st) return;
    sums[st.act] += beatWeight(b);
  });
  const total = sums.setup + sums.conflict + sums.resolution;
  const pct = total
    ? { setup: (sums.setup / total) * 100, conflict: (sums.conflict / total) * 100, resolution: (sums.resolution / total) * 100 }
    : { setup: 0, conflict: 0, resolution: 0 };
  let verdict = 'Add beats to see your pacing.';
  if (total > 0) {
    if (pct.setup > ACT_RANGE.setup[1]) verdict = 'Setup-heavy — trim the throat-clearing.';
    else if (pct.conflict < ACT_RANGE.conflict[0]) verdict = 'Conflict is thin — raise the stakes.';
    else if (pct.resolution < ACT_RANGE.resolution[0]) verdict = 'Resolution needs more weight.';
    else if (pct.conflict > ACT_RANGE.conflict[1]) verdict = 'Conflict-heavy — remember the promised land.';
    else verdict = 'Balanced pacing.';
  }
  return { sums, pct, total, verdict };
}

function stateToMarkdown(state) {
  const flow = computeFlow(state.beats);
  const ordered = orderedBeats(state.beats);
  const lines = [];
  lines.push(`# ${state.title || 'Untitled pitch'}`);
  lines.push('');
  if (state.audience.trim()) lines.push(`_${state.audience.trim()}_`);
  lines.push(`_${ordered.length} beat(s) pinned · exported ${new Date().toISOString().slice(0, 10)}_`);
  lines.push('');
  STAGES.forEach(st => {
    const beats = beatsByStage(state.beats, st.id);
    lines.push(`## ${st.label}`);
    lines.push(`_${st.hint}_`);
    lines.push('');
    if (!beats.length) {
      lines.push('*(no beats pinned yet — this is a hole in the story)*');
      lines.push('');
      return;
    }
    beats.forEach((b, i) => {
      const n = ordered.indexOf(b) + 1;
      lines.push(`### Slide ${n} — ${b.headline.trim() || 'Untitled slide'}`);
      if (b.support.trim()) b.support.split('\n').filter(Boolean).forEach(line => lines.push(`- ${line.trim()}`));
      if (b.visual.trim()) lines.push(`*Visual: ${b.visual.trim()}*`);
      if (b.beat.trim()) lines.push(`> Story beat: ${b.beat.trim()}`);
      lines.push('');
    });
  });
  lines.push('## Pacing check');
  lines.push('');
  lines.push(`Setup ${flow.pct.setup.toFixed(0)}% · Conflict ${flow.pct.conflict.toFixed(0)}% · Resolution ${flow.pct.resolution.toFixed(0)}% — ${flow.verdict}`);
  lines.push('');
  return lines.join('\n');
}

function beatsToCSV(beats) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const ordered = orderedBeats(beats);
  const head = ['slide', 'stage', 'headline', 'support', 'visual', 'beat'];
  const rows = ordered.map((b, i) => [
    i + 1, stageLabel(b.stage), b.headline, b.support, b.visual, b.beat,
  ].map(esc).join(','));
  return [head.join(','), ...rows].join('\n');
}

/* ---------------- copilot prompt builders ---------------- */

function beatMd(b, n) {
  const st = STAGE_BY_ID[b.stage];
  return [
    `**Slide ${n} — ${st ? st.label : b.stage}**`,
    `- Headline: ${b.headline.trim() || '(none yet)'}`,
    `- Support: ${b.support.trim() || '(none yet)'}`,
    `- Visual idea: ${b.visual.trim() || '(none yet)'}`,
    `- Story beat: ${b.beat.trim() || '(not written yet)'}`,
  ].join('\n');
}

function fullArcMd(state) {
  return STAGES.map(st => {
    const beats = beatsByStage(state.beats, st.id);
    if (!beats.length) return `### ${st.label}\n*(empty — no beats pinned)*`;
    const ordered = orderedBeats(state.beats);
    return `### ${st.label}\n` + beats.map(b => beatMd(b, ordered.indexOf(b) + 1)).join('\n\n');
  }).join('\n\n');
}

function buildSharpenPrompt(state, beat) {
  const contrast = beatsByStage(state.beats, 'status-quo').concat(beatsByStage(state.beats, 'threat'));
  return `You are a narrative strategist who sharpens B2B "promised land" statements so they are vivid, specific, and impossible to shrug at — no vague adjectives like "seamless" or "streamlined."

## The pitch
- **Title:** ${state.title || '(untitled)'}
- **Audience:** ${state.audience.trim() || '(not specified)'}

## What makes this land matter (status quo + threat, for contrast)
${contrast.length ? contrast.map(b => `- ${b.beat.trim() || b.headline.trim() || '(empty beat)'}`).join('\n') : '- (no status-quo or threat beats written yet — write those first for real contrast)'}

## The promised-land beat to sharpen
- **Current beat:** ${beat.beat.trim() || '(not written yet — invent nothing, ask me for detail if this is empty)'}
- **Current headline:** ${beat.headline.trim() || '(none)'}
- **Current support:** ${beat.support.trim() || '(none)'}

## The ask
1. Rewrite this promised-land statement THREE ways, each under 30 words:
   - **Sensory version** — makes the reader picture the specific after-state.
   - **Data version** — leads with the number that proves the change.
   - **Urgency version** — implies the cost of waiting, without fear-mongering.
2. For each, suggest a matching slide headline (max 7 words).
3. Flag if the current version is too vague to fix — and what concrete detail I need to supply first.

## Output format
Three labeled versions (statement + headline), then a one-line recommendation for which to use given the audience above.`;
}

function buildHeadlinesPrompt(state) {
  const ordered = orderedBeats(state.beats);
  return `You are a presentation copywriter who writes punchy, concrete slide headlines (never generic corporate-speak) for sales decks.

## The pitch
- **Title:** ${state.title || '(untitled)'}
- **Audience:** ${state.audience.trim() || '(not specified)'}

## The beats, in deck order
${ordered.length ? fullArcMd(state) : '*(no beats pinned yet — add beats to the board first)*'}

## The ask
For every slide above, propose TWO headline options (max 8 words each):
1. One built from the concrete detail already in the beat or support line — no invented facts.
2. One that leans harder into the emotional stake of that arc position (status quo / threat / promised land / proof / the ask).
Flag any beat where the underlying content is too thin to headline well, and say exactly what's missing.

## Output format
A numbered list matching the slide numbers, each with both headline options and, where relevant, the thin-content flag.`;
}

function buildHolesPrompt(state) {
  const flow = computeFlow(state.beats);
  const gaps = STAGES.filter(st => beatsByStage(state.beats, st.id).length === 0);
  return `You are a brutally honest sales-narrative editor. Your job is to find the holes in this pitch before the prospect does.

## The pitch
- **Title:** ${state.title || '(untitled)'}
- **Audience:** ${state.audience.trim() || '(not specified)'}

## The full arc
${state.beats.length ? fullArcMd(state) : '*(the board is empty — there is nothing to audit yet)*'}

## Pacing snapshot
Setup ${flow.pct.setup.toFixed(0)}% · Conflict ${flow.pct.conflict.toFixed(0)}% · Resolution ${flow.pct.resolution.toFixed(0)}% — ${flow.verdict}
${gaps.length ? `Empty stages: ${gaps.map(g => g.label).join(', ')}` : 'No empty stages.'}

## The ask
1. Name the single weakest link in this story — the beat or transition most likely to lose the room — and why.
2. List any claim in Proof that isn't actually proof (an assertion dressed as evidence).
3. Check the Ask: is it specific, low-risk, and time-bound? If not, rewrite it in one sentence.
4. Flag any stage that's empty or thin, and give me the ONE beat I should write first to fix it.
5. Note any beat that belongs somewhere else in the arc (e.g. a threat disguised as a status-quo beat).

## Output format
Five short sections matching the five asks above. Be specific — cite the actual beat text, don't generalize. No praise padding.`;
}

function buildExpandPrompt(state, beat) {
  const ordered = orderedBeats(state.beats);
  const idx = ordered.indexOf(beat);
  const prev = idx > 0 ? ordered[idx - 1] : null;
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;
  const st = STAGE_BY_ID[beat.stage];
  return `You are a presentation writer turning one storyboard card into a fully drafted, presentable slide.

## The pitch
- **Title:** ${state.title || '(untitled)'}
- **Audience:** ${state.audience.trim() || '(not specified)'}

## The card to expand — arc position: ${st ? st.label : beat.stage}
- **Story beat:** ${beat.beat.trim() || '(not written yet)'}
- **Current headline:** ${beat.headline.trim() || '(none)'}
- **Current support:** ${beat.support.trim() || '(none)'}
- **Current visual idea:** ${beat.visual.trim() || '(none)'}

## Continuity (so the slide flows from the one before it and into the one after)
- **Previous slide:** ${prev ? (prev.headline.trim() || prev.beat.trim()) : '(this is the first slide)'}
- **Next slide:** ${next ? (next.headline.trim() || next.beat.trim()) : '(this is the last slide)'}

## The ask
Produce a complete, ready-to-build slide:
1. **Headline** (max 8 words, matches the "${st ? st.label : ''}" beat in the arc).
2. **Three support bullets** (concrete, no filler, each under 12 words).
3. **Speaker notes** — a 30–45 second spoken script a presenter could read almost verbatim, that bridges from the previous slide and sets up the next.
4. **Visual brief** — a specific, buildable description of the chart/screenshot/diagram (not "a nice graphic").

## Output format
Four labeled sections in the order above.`;
}

/* ================================================================
   Small building blocks
   ================================================================ */

function IconBtn({ label, onClick, children, className = '', title }) {
  return (
    <button type="button" aria-label={label} title={title || label} onClick={onClick}
      className={'inline-flex items-center justify-center rounded p-1.5 text-fog hover:text-bone hover:bg-bone/10 transition-colors ' + className}>
      {children}
    </button>
  );
}

function Btn({ onClick, children, kind = 'ghost', className = '', ...rest }) {
  const kinds = {
    primary: 'bg-string text-[#fff3ea] hover:bg-string-deep border border-string-deep shadow-[0_2px_0_rgba(0,0,0,.35)]',
    brass: 'bg-brass text-[#241b06] hover:bg-[#e0b654] border border-[#8a6a22] shadow-[0_2px_0_rgba(0,0,0,.35)]',
    ghost: 'bg-bone/[.06] text-bone hover:bg-bone/[.12] border border-bone/15',
    danger: 'bg-bone/[.06] text-ember hover:bg-ember/15 border border-ember/30',
  };
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[13px] font-semibold tracking-wide transition-colors ${kinds[kind]} ${className}`}
      {...rest}>
      {children}
    </button>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <label className={'block ' + className}>
      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-fog mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputCls = 'w-full rounded-sm border border-ink/15 bg-card px-2.5 py-1.5 text-[13px] text-ink placeholder:text-ink/35 focus:border-string';
const darkInputCls = 'w-full rounded-sm border border-bone/20 bg-[#171310] px-2.5 py-1.5 text-[13px] text-bone placeholder:text-bone/35 focus:border-string';

function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-[6vh] anim-fade" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}
        className={`anim-rise w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-sm border border-bone/15 bg-panel shadow-hero`}
        style={{ boxShadow: 'var(--shadow-hero)' }}>
        <div className="flex items-center justify-between border-b border-bone/10 px-5 py-3">
          <h2 className="font-display text-lg font-bold text-bone">{title}</h2>
          <IconBtn label="Close dialog" onClick={onClose}><X size={18} /></IconBtn>
        </div>
        <div className="max-h-[72vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Ico, title, children }) {
  return (
    <div className="anim-rise rounded-sm border border-dashed border-bone/25 bg-panel/50 px-6 py-10 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-bone/20 bg-cork text-fog">
        <Ico size={22} />
      </div>
      <p className="font-display text-lg font-bold text-bone">{title}</p>
      <div className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-fog">{children}</div>
    </div>
  );
}

/* copy hook */
function useCopy() {
  const [copied, setCopied] = useState('');
  const timer = useRef(null);
  const copy = useCallback(async (text, tag = 'x') => {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; }
    catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch { ok = false; }
    }
    if (ok) {
      setCopied(tag);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(''), 1800);
    }
    return ok;
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [copied, copy];
}

/* ---------------- SVG: storyboard hero ---------------- */

function StoryboardHero({ stats }) {
  return (
    <svg viewBox="0 0 760 226" role="img" aria-label="Three index cards pinned to a corkboard and connected by red string"
      className="h-auto w-full max-w-[760px]">
      <defs>
        <filter id="pinShadow" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000" floodOpacity="0.55" />
        </filter>
        <radialGradient id="pinMetal" cx=".35" cy=".3" r=".9">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".35" stopColor="#e2493a" />
          <stop offset="1" stopColor="#701f16" />
        </radialGradient>
        <linearGradient id="ruleLines" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8f2e1" />
          <stop offset="1" stopColor="#efe6cd" />
        </linearGradient>
      </defs>

      {/* faint cork flecks */}
      <g fill="#3a2f21" opacity=".5">
        {[...Array(26)].map((_, i) => (
          <circle key={i} cx={(i * 137 + 40) % 740 + 10} cy={(i * 59 + 20) % 200 + 10} r={i % 5 === 0 ? 1.6 : 1} />
        ))}
      </g>

      {/* red string, hand-tied path between the three pins */}
      <path d="M132,26 Q230,84 322,44 Q430,4 620,50" fill="none" stroke="#d5402c" strokeWidth="2.2" opacity=".85" />
      <path d="M132,26 Q230,84 322,44 Q430,4 620,50" fill="none" stroke="#8f2419" strokeWidth="2.2" opacity=".25" strokeDasharray="1 7" />

      {/* connective-tissue annotations along the string */}
      <text x="225" y="98" fontFamily="Caveat, cursive" fontSize="22" fill="#e7dcc2" transform="rotate(-4 225 98)">but&#8230;</text>
      <text x="452" y="26" fontFamily="Caveat, cursive" fontSize="22" fill="#e7dcc2" transform="rotate(-3 452 26)">therefore</text>

      {/* card 1 — status quo */}
      <g filter="url(#pinShadow)" transform="rotate(-5 200 100)">
        <rect x="118" y="60" width="164" height="118" rx="4" fill="url(#ruleLines)" />
        <rect x="118" y="60" width="164" height="118" rx="4" fill="none" stroke="#00000014" />
        <rect x="130" y="86" width="140" height="1.4" fill="#c6544a" opacity=".5" />
        {[0, 1, 2, 3].map(i => <rect key={i} x="130" y={100 + i * 15} width="140" height="1" fill="#6f86b0" opacity=".22" />)}
        <text x="130" y="78" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="800" fontSize="10" letterSpacing="1.5" fill="#8493a3">STATUS QUO</text>
        <rect x="130" y="112" width="96" height="6" rx="2" fill="#3a3123" />
        <rect x="130" y="124" width="118" height="4" rx="1.5" fill="#8f8570" />
        <rect x="130" y="132" width="80" height="4" rx="1.5" fill="#a49a83" />
      </g>

      {/* card 2 — threat, larger, center */}
      <g filter="url(#pinShadow)" transform="rotate(3 400 90)">
        <rect x="330" y="20" width="176" height="126" rx="4" fill="url(#ruleLines)" />
        <rect x="330" y="20" width="176" height="126" rx="4" fill="none" stroke="#00000014" />
        <rect x="342" y="46" width="152" height="1.4" fill="#c6544a" opacity=".5" />
        {[0, 1, 2, 3].map(i => <rect key={i} x="342" y={60 + i * 15} width="152" height="1" fill="#6f86b0" opacity=".22" />)}
        <text x="342" y="38" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="800" fontSize="10" letterSpacing="1.5" fill="#c1543a">THREAT</text>
        <rect x="342" y="72" width="118" height="7" rx="2" fill="#3a3123" />
        <rect x="342" y="86" width="140" height="4" rx="1.5" fill="#8f8570" />
        <rect x="342" y="94" width="96" height="4" rx="1.5" fill="#a49a83" />
      </g>

      {/* card 3 — promised land */}
      <g filter="url(#pinShadow)" transform="rotate(-2 620 88)">
        <rect x="548" y="42" width="150" height="108" rx="4" fill="url(#ruleLines)" />
        <rect x="548" y="42" width="150" height="108" rx="4" fill="none" stroke="#00000014" />
        <rect x="560" y="66" width="126" height="1.4" fill="#c6544a" opacity=".5" />
        {[0, 1, 2].map(i => <rect key={i} x="560" y={80 + i * 15} width="126" height="1" fill="#6f86b0" opacity=".22" />)}
        <text x="560" y="58" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="800" fontSize="9.5" letterSpacing="1.3" fill="#cda23c">PROMISED LAND</text>
        <rect x="560" y="94" width="88" height="6" rx="2" fill="#3a3123" />
        <rect x="560" y="106" width="104" height="4" rx="1.5" fill="#8f8570" />
      </g>

      {/* pushpins */}
      <circle cx="132" cy="26" r="7.5" fill="url(#pinMetal)" filter="url(#pinShadow)" />
      <circle cx="322" cy="44" r="8" fill="url(#pinMetal)" filter="url(#pinShadow)" />
      <circle cx="620" cy="50" r="7.5" fill="url(#pinMetal)" filter="url(#pinShadow)" />

      {/* stat tabs under the board */}
      <g fontFamily="Public Sans, sans-serif">
        <rect x="140" y="190" width="96" height="24" rx="2" fill="#20190f" stroke="#ddd0ac" strokeOpacity=".22" />
        <text x="188" y="206" textAnchor="middle" fontSize="10.5" fill="#ddd2b9">{stats.pinned} beats pinned</text>
        <rect x="332" y="190" width="104" height="24" rx="2" fill="#20190f" stroke="#ddd0ac" strokeOpacity=".22" />
        <text x="384" y="206" textAnchor="middle" fontSize="10.5" fill="#ddd2b9">{stats.drafted} slides drafted</text>
        <rect x="556" y="190" width="132" height="24" rx="2" fill="#20190f" stroke="#ddd0ac" strokeOpacity=".22" />
        <text x="622" y="206" textAnchor="middle" fontSize="10.5" fill="#ddd2b9">{stats.gaps === 0 ? 'no gaps open' : stats.gaps + ' stage(s) empty'}</text>
      </g>
    </svg>
  );
}

/* ---------------- SVG: flow meter (setup / conflict / resolution) ---------------- */

function FlowMeter({ beats }) {
  const flow = computeFlow(beats);
  const W = 680, H = 96, pad = 8, barY = 30, barH = 22;
  const usable = W - pad * 2;
  const wSetup = flow.total ? (flow.pct.setup / 100) * usable : usable / 3;
  const wConflict = flow.total ? (flow.pct.conflict / 100) * usable : usable / 3;
  const wResolution = flow.total ? (flow.pct.resolution / 100) * usable : usable / 3;
  const xConflict = pad + wSetup;
  const xResolution = xConflict + wConflict;
  const ticks = [0, 25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Pacing: setup ${flow.pct.setup.toFixed(0)}%, conflict ${flow.pct.conflict.toFixed(0)}%, resolution ${flow.pct.resolution.toFixed(0)}%`} className="h-auto w-full">
      {/* segments */}
      <rect x={pad} y={barY} width={usable} height={barH} rx="3" fill="#171310" />
      {flow.total > 0 && (
        <>
          <rect x={pad} y={barY} width={wSetup} height={barH} fill={ACT_FILL.setup} opacity=".9" />
          <rect x={xConflict} y={barY} width={wConflict} height={barH} fill={ACT_FILL.conflict} opacity=".9" />
          <rect x={xResolution} y={barY} width={wResolution} height={barH} fill={ACT_FILL.resolution} opacity=".9" />
        </>
      )}
      <rect x={pad} y={barY} width={usable} height={barH} rx="3" fill="none" stroke="#ddd0ac" strokeOpacity=".18" />

      {/* emphasized endpoints at the two act boundaries */}
      {flow.total > 0 && (
        <>
          <circle cx={xConflict} cy={barY + barH / 2} r="4.5" fill="#100d09" stroke={ACT_FILL.conflict} strokeWidth="2" />
          <circle cx={xResolution} cy={barY + barH / 2} r="4.5" fill="#100d09" stroke={ACT_FILL.resolution} strokeWidth="2" />
        </>
      )}

      {/* percentage labels */}
      <g fontFamily="Public Sans, sans-serif" fontWeight="700" fontSize="11" fill="#ddd2b9" textAnchor="middle">
        <text x={pad + wSetup / 2} y={barY - 8}>{flow.total ? flow.pct.setup.toFixed(0) + '%' : '—'}</text>
        <text x={xConflict + wConflict / 2} y={barY - 8}>{flow.total ? flow.pct.conflict.toFixed(0) + '%' : '—'}</text>
        <text x={xResolution + wResolution / 2} y={barY - 8}>{flow.total ? flow.pct.resolution.toFixed(0) + '%' : '—'}</text>
      </g>

      {/* ruler baseline */}
      <line x1={pad} y1={barY + barH + 12} x2={W - pad} y2={barY + barH + 12} stroke="#968a76" strokeOpacity=".4" strokeWidth="1" />
      {ticks.map(t => (
        <line key={t} x1={pad + (t / 100) * usable} y1={barY + barH + 8} x2={pad + (t / 100) * usable} y2={barY + barH + 16} stroke="#968a76" strokeOpacity=".5" strokeWidth="1" />
      ))}

      {/* act labels */}
      <g fontFamily="Public Sans, sans-serif" fontSize="9.5" fill="#968a76" style={{ letterSpacing: '0.08em' }}>
        <text x={pad}>SETUP</text>
        <text x={W / 2} textAnchor="middle" y={H - 4}>CONFLICT</text>
        <text x={W - pad} textAnchor="end">RESOLUTION</text>
      </g>
    </svg>
  );
}

/* ---------------- beat / stage components ---------------- */

function StagePill({ stage }) {
  const st = STAGE_BY_ID[stage];
  if (!st) return null;
  const Ico = st.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold tracking-wide ${st.chip}`}>
      <Ico size={11} /> {st.label}
    </span>
  );
}

function PushPin({ stage }) {
  const st = STAGE_BY_ID[stage];
  return <span aria-hidden="true" className={`idx-pin ${st ? st.dot : 'bg-string'}`} />;
}

function BeatCard({ beat, index, total, onPatch, onDelete, onMove, onMoveStage, open, onToggle }) {
  const st = STAGE_BY_ID[beat.stage];
  return (
    <li className="idx-card anim-rise px-4 pb-3 pt-6">
      <PushPin stage={beat.stage} />
      <div className="flex items-start gap-2">
        <button onClick={onToggle} aria-expanded={open}
          aria-label={`${open ? 'Collapse' : 'Expand'} beat ${index + 1}`}
          className="mt-0.5 text-ink/50 hover:text-ink">
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink/45">
            {st ? st.label : beat.stage} #{index + 1}
          </div>
          <div className="truncate font-display text-[14px] font-bold text-ink">
            {beat.headline.trim() || <span className="italic text-ink/40">Untitled slide</span>}
          </div>
          {!open && beat.beat.trim() && (
            <p className="mt-0.5 truncate font-hand text-[15px] leading-tight text-ink/70">{beat.beat.trim()}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconBtn label={`Move beat ${index + 1} up`} onClick={() => onMove(-1)} className="text-ink/45 hover:text-ink" title="Move up">
            <ArrowUp size={14} />
          </IconBtn>
          <IconBtn label={`Move beat ${index + 1} down`} onClick={() => onMove(1)} className="text-ink/45 hover:text-ink" title="Move down">
            <ArrowDown size={14} />
          </IconBtn>
          <IconBtn label={`Delete beat ${index + 1}`} onClick={onDelete} className="text-ember/70 hover:text-ember">
            <Trash2 size={14} />
          </IconBtn>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-2.5 border-t border-ink/10 pt-3">
          <Field label="Arc position">
            <select className={inputCls} value={beat.stage} onChange={e => onMoveStage(e.target.value)}>
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Story beat — what happens here">
            <textarea rows={2} className={inputCls + ' font-hand text-[16px] leading-snug'} value={beat.beat}
              onChange={e => onPatch({ beat: e.target.value })}
              placeholder="What happens in the story at this point?" />
          </Field>
          <Field label="Slide headline">
            <input className={inputCls} value={beat.headline} onChange={e => onPatch({ headline: e.target.value })}
              placeholder="The line at the top of the slide" />
          </Field>
          <Field label="Slide support (one line per bullet)">
            <textarea rows={2} className={inputCls} value={beat.support} onChange={e => onPatch({ support: e.target.value })}
              placeholder="Proof points, numbers, or sub-claims" />
          </Field>
          <Field label="Visual idea">
            <input className={inputCls} value={beat.visual} onChange={e => onPatch({ visual: e.target.value })}
              placeholder="Chart, screenshot, diagram — be specific" />
          </Field>
        </div>
      )}
    </li>
  );
}

function StageColumn({ stage, beats, expanded, onToggle, onAdd, onPatch, onDelete, onMove, onMoveStage }) {
  const Ico = stage.icon;
  return (
    <div className="stage-col snap-col flex w-[270px] shrink-0 flex-col rounded-sm p-3">
      <div className="mb-2.5 flex items-start gap-2 px-1">
        <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${stage.chip}`}>
          <Ico size={13} />
        </span>
        <div className="min-w-0">
          <div className={`font-display text-[13.5px] font-bold ${stage.text}`}>{stage.label}</div>
          <div className="text-[11px] leading-snug text-fog">{stage.hint}</div>
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-cork px-1.5 py-0.5 text-[10px] font-semibold text-fog">{beats.length}</span>
      </div>

      {beats.length === 0 ? (
        <div className="rounded-sm border border-dashed border-bone/20 px-2.5 py-4 text-center text-[11px] italic text-faint">
          No beats yet — pin the first one.
        </div>
      ) : (
        <ul className="space-y-3">
          {beats.map((b, i) => (
            <BeatCard key={b.id} beat={b} index={i} total={beats.length}
              open={expanded === b.id} onToggle={() => onToggle(b.id)}
              onPatch={patch => onPatch(b.id, patch)}
              onDelete={() => onDelete(b.id)}
              onMove={dir => onMove(b.id, dir)}
              onMoveStage={stageId => onMoveStage(b.id, stageId)} />
          ))}
        </ul>
      )}

      <button onClick={() => onAdd(stage.id)}
        className={`mt-3 flex items-center justify-center gap-1.5 rounded-sm border border-dashed ${stage.border} py-2 text-[12px] font-semibold ${stage.text} hover:bg-bone/[.04]`}>
        <Plus size={13} /> Pin a beat
      </button>
    </div>
  );
}

/* ================================================================
   Main App
   ================================================================ */

export default function App() {
  const [state, setState] = useState(loadState);
  const [tab, setTab] = useState('board');
  const [modal, setModal] = useState(() => (loadState().seenGuide ? null : 'help'));
  const [toast, setToast] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [query, setQuery] = useState('');
  const [copied, copy] = useCopy();
  const toastTimer = useRef(null);
  const fileRef = useRef(null);

  /* autosave (debounced) */
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* full/blocked */ }
    }, 350);
    return () => clearTimeout(t);
  }, [state]);

  const showToast = useCallback((msg, undo = null, ms = 7000) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), ms);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const patch = fn => setState(s => normalize(fn(s)));
  const patchBeat = (id, up) => patch(s => ({ ...s, beats: s.beats.map(b => b.id === id ? { ...b, ...up } : b) }));

  const addBeat = stageId => {
    const b = normalizeBeat({ id: uid(), stage: stageId });
    patch(s => ({ ...s, beats: [...s.beats, b] }));
    setExpanded(b.id);
    setTab('board');
  };

  const deleteBeat = id => {
    const idx = state.beats.findIndex(b => b.id === id);
    if (idx < 0) return;
    const removed = state.beats[idx];
    const st = STAGE_BY_ID[removed.stage];
    patch(s => ({ ...s, beats: s.beats.filter(b => b.id !== id) }));
    showToast(`Unpinned a ${st ? st.label : 'beat'} card.`, () => {
      patch(s => ({ ...s, beats: [...s.beats.slice(0, idx), removed, ...s.beats.slice(idx)] }));
      setToast(null);
    });
  };

  const moveBeat = (id, dir) => {
    patch(s => {
      const beat = s.beats.find(b => b.id === id);
      if (!beat) return s;
      const siblings = s.beats.filter(b => b.stage === beat.stage);
      const pos = siblings.findIndex(b => b.id === id);
      const swapWith = siblings[pos + dir];
      if (!swapWith) return s;
      const beats = [...s.beats];
      const i1 = beats.findIndex(b => b.id === beat.id);
      const i2 = beats.findIndex(b => b.id === swapWith.id);
      [beats[i1], beats[i2]] = [beats[i2], beats[i1]];
      return { ...s, beats };
    });
  };

  const moveBeatStage = (id, stageId) => {
    patch(s => {
      const beat = s.beats.find(b => b.id === id);
      if (!beat) return s;
      const rest = s.beats.filter(b => b.id !== id);
      return { ...s, beats: [...rest, { ...beat, stage: stageId }] };
    });
  };

  const loadDemo = () => {
    patch(s => ({ ...DEMO, seenGuide: s.seenGuide, copilotNotes: s.copilotNotes }));
    showToast('Demo board pinned: 10 beats across the full arc.', null, 5000);
  };

  const doReset = () => {
    patch(s => normalize({ seenGuide: s.seenGuide }));
    setModal(null);
    showToast('Board cleared. Cork wiped clean.', null, 5000);
  };

  const copyMarkdown = useCallback(() => {
    copy(stateToMarkdown(state), 'md').then(ok => ok && showToast('Deck outline copied as Markdown.', null, 3500));
  }, [state, copy, showToast]);

  const downloadFile = (name, text, type) => {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 800);
  };

  const importJSON = file => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = normalize(JSON.parse(String(reader.result)));
        setState(next);
        setModal(null);
        showToast(`Imported ${next.beats.length} beats.`, null, 4500);
      } catch {
        showToast('That file did not parse as Narrative Deck Builder JSON.', null, 5000);
      }
    };
    reader.readAsText(file);
  };

  /* keyboard */
  useEffect(() => {
    const onKey = e => {
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault(); copyMarkdown(); return;
      }
      if (e.key === 'Escape') {
        setModal(null);
        if (modal === 'help') patch(s => ({ ...s, seenGuide: true }));
        return;
      }
      if (typing) return;
      if (e.key === '?') { e.preventDefault(); setModal('help'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [copyMarkdown, modal]);

  const closeHelp = () => {
    setModal(null);
    if (!state.seenGuide) patch(s => ({ ...s, seenGuide: true }));
  };

  /* derived */
  const flow = useMemo(() => computeFlow(state.beats), [state.beats]);
  const ordered = useMemo(() => orderedBeats(state.beats), [state.beats]);
  const gaps = useMemo(() => STAGES.filter(st => beatsByStage(state.beats, st.id).length === 0).length, [state.beats]);
  const stats = useMemo(() => ({
    pinned: state.beats.length,
    drafted: state.beats.filter(b => b.headline.trim()).length,
    gaps,
  }), [state.beats, gaps]);

  const query_ = query.trim().toLowerCase();
  const matches = b => !query_ || [b.beat, b.headline, b.support, b.visual].some(v => v.toLowerCase().includes(query_));

  const TABS = [
    { id: 'board', label: 'The Board', icon: Pin },
    { id: 'read', label: 'Read-through', icon: ListOrdered },
  ];

  return (
    <div className="grain min-h-screen font-body text-bone">
      <div className="app-shell relative z-10 mx-auto max-w-6xl px-4 pb-24 sm:px-6">

        {/* header */}
        <header className="cork-rail flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
              <rect x="7" y="9" width="26" height="20" rx="2" fill="#f8f2e1" stroke="#00000020" transform="rotate(-4 20 19)" />
              <path d="M11,10 Q20,26 31,12" fill="none" stroke="#d5402c" strokeWidth="1.8" />
              <circle cx="11" cy="10" r="3" fill="#e2493a" />
              <circle cx="31" cy="12" r="3" fill="#e2493a" />
            </svg>
            <div>
              <h1 className="font-display text-[22px] font-black leading-none tracking-tight text-bone">
                Narrative <span className="text-brass">Deck</span> Builder
              </h1>
              <p className="text-[12px] italic text-fog">Pin the arc before you touch a single slide.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Btn kind="brass" onClick={loadDemo}><Sparkles size={14} /> Load demo</Btn>
            <Btn onClick={() => setModal('reset')}><RotateCcw size={14} /> Reset</Btn>
            <Btn onClick={() => setModal('help')}><HelpCircle size={14} /> How to use</Btn>
            <Btn kind="primary" onClick={() => setModal('export')}><Download size={14} /> Export</Btn>
          </div>
        </header>

        {/* hero */}
        <section className="mt-5 grid items-center gap-5 lg:grid-cols-[1fr_240px]">
          <div className="anim-rise"><StoryboardHero stats={stats} /></div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            {[
              { n: stats.pinned, l: 'beats pinned', icon: Pin },
              { n: stats.drafted, l: 'slides drafted', icon: LayoutPanelTop },
              { n: gaps === 0 ? 'None' : gaps, l: 'stage gaps open', icon: AlertTriangle },
              { n: flow.total ? flow.verdict.split(' —')[0] : 'Empty', l: 'pacing read', icon: Waypoints },
            ].map((k, i) => (
              <div key={i} className="stage-col flex items-center gap-3 rounded-sm px-3.5 py-2.5">
                <k.icon size={16} className="shrink-0 text-brass" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="truncate font-display text-lg font-black leading-none text-bone">{k.n}</div>
                  <div className="text-[11px] italic text-fog">{k.l}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* flow meter */}
        <section className="mt-5 stage-col rounded-sm p-4">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 font-display text-base font-bold text-bone">
              <Waypoints size={15} className="text-brass" aria-hidden="true" /> Pacing check
            </h2>
            <span className="text-[11.5px] italic text-fog">{flow.verdict}</span>
          </div>
          <FlowMeter beats={state.beats} />
        </section>

        {/* tabs */}
        <nav role="tablist" aria-label="Sections" className="mt-7 flex flex-wrap gap-1 border-b border-bone/15">
          {TABS.map(t => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3.5 py-2 text-[13px] font-semibold tracking-wide transition-colors ${tab === t.id
                ? 'border-string text-bone'
                : 'border-transparent text-fog hover:text-bone'}`}>
              <t.icon size={14} aria-hidden="true" /> {t.label}
            </button>
          ))}
        </nav>

        <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_330px]">
          <main>
            {/* ============ BOARD ============ */}
            {tab === 'board' && (
              <section aria-label="Story arc board" className="anim-rise">
                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  <Field label="Deck title">
                    <input className={darkInputCls} value={state.title} onChange={e => patch(s => ({ ...s, title: e.target.value }))}
                      placeholder="Atlas Warehouse OS — Pitch to Crestline" />
                  </Field>
                  <Field label="Audience & occasion">
                    <input className={darkInputCls} value={state.audience} onChange={e => patch(s => ({ ...s, audience: e.target.value }))}
                      placeholder="Who's in the room, and what decision are you asking for?" />
                  </Field>
                </div>

                <div className="mb-4 relative w-full max-w-xs">
                  <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-fog" aria-hidden="true" />
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search beats, headlines, notes"
                    aria-label="Search beats" className={darkInputCls + ' pl-7'} />
                </div>

                {state.beats.length === 0 ? (
                  <EmptyState icon={Pin} title="An empty board is a blank pitch">
                    Every deal has a status quo, a threat, a promised land, proof, and an ask — you just
                    haven't pinned them yet. Add your first beat below, or press <strong>Load demo</strong> to
                    see a finished board first.
                  </EmptyState>
                ) : (
                  <div className="snap-cols flex gap-4 overflow-x-auto pb-2">
                    {STAGES.map(st => {
                      const beats = beatsByStage(state.beats, st.id).filter(matches);
                      return (
                        <StageColumn key={st.id} stage={st} beats={beats}
                          expanded={expanded} onToggle={id => setExpanded(x => x === id ? null : id)}
                          onAdd={addBeat} onPatch={patchBeat} onDelete={deleteBeat}
                          onMove={moveBeat} onMoveStage={moveBeatStage} />
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ============ READ-THROUGH ============ */}
            {tab === 'read' && (
              <section aria-label="Read-through" className="anim-rise">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-bold text-bone">Read it straight through</h2>
                    <p className="text-[12.5px] italic text-fog">Every slide, in deck order — how the story lands before you build it.</p>
                  </div>
                  <Btn onClick={() => window.print()}><Printer size={14} /> Print outline</Btn>
                </div>
                {ordered.length === 0 ? (
                  <EmptyState icon={ListOrdered} title="Nothing to read yet">
                    Pin a few beats on <strong>The Board</strong> and they'll line up here in presentation order.
                  </EmptyState>
                ) : (
                  <ol className="space-y-3">
                    {ordered.map((b, i) => {
                      const st = STAGE_BY_ID[b.stage];
                      return (
                        <li key={b.id} className="idx-card px-4 pb-3.5 pt-6">
                          <PushPin stage={b.stage} />
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-[11px] font-bold uppercase tracking-wider text-ink/45">Slide {i + 1}</span>
                            <StagePill stage={b.stage} />
                          </div>
                          <div className="mt-1 font-display text-[17px] font-black text-ink">
                            {b.headline.trim() || <span className="italic text-ink/40">Untitled slide</span>}
                          </div>
                          {b.support.trim() && (
                            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[13px] leading-relaxed text-ink/85">
                              {b.support.split('\n').filter(Boolean).map((line, li) => <li key={li}>{line.trim()}</li>)}
                            </ul>
                          )}
                          {b.visual.trim() && (
                            <p className="mt-1.5 text-[12px] italic text-ink/60">Visual: {b.visual.trim()}</p>
                          )}
                          {b.beat.trim() && (
                            <p className="mt-2 border-t border-ink/10 pt-1.5 font-hand text-[16px] leading-snug text-ink/75">{b.beat.trim()}</p>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            )}
          </main>

          {/* ============ COPILOT RAIL ============ */}
          <CopilotPanel state={state} copy={copy} copied={copied}
            onNotes={v => patch(s => ({ ...s, copilotNotes: v }))} />
        </div>

        <footer className="mt-14 border-t border-bone/10 pt-4 text-center text-[11px] italic text-faint">
          Narrative Deck Builder · your data lives only in this browser (localStorage) · press ? for help · Ctrl/Cmd+S copies the outline
        </footer>
      </div>

      {/* ============ print artifact ============ */}
      <div className="print-artifact px-8 py-6">
        <h1 className="font-display text-2xl font-black">{state.title || 'Untitled pitch'}</h1>
        {state.audience.trim() && <p className="mb-2 text-sm italic text-gray-600">{state.audience}</p>}
        <p className="mb-6 text-xs text-gray-500">
          Setup {flow.pct.setup.toFixed(0)}% · Conflict {flow.pct.conflict.toFixed(0)}% · Resolution {flow.pct.resolution.toFixed(0)}% — {flow.verdict}
        </p>
        <div className="space-y-4">
          {ordered.map((b, i) => (
            <div key={b.id} className="p-card border border-gray-300 rounded p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Slide {i + 1} — {stageLabel(b.stage)}</div>
              <div className="text-lg font-bold">{b.headline || 'Untitled slide'}</div>
              {b.support && <ul className="list-disc pl-5 text-sm">{b.support.split('\n').filter(Boolean).map((l, li) => <li key={li}>{l}</li>)}</ul>}
              {b.visual && <p className="text-xs italic text-gray-600">Visual: {b.visual}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* ============ modals ============ */}
      {modal === 'help' && <HelpModal onClose={closeHelp} />}
      {modal === 'export' && (
        <ExportModal onClose={() => setModal(null)}
          onCopyMd={copyMarkdown} copied={copied}
          onJson={() => downloadFile('narrative-deck.json', JSON.stringify(state, null, 2), 'application/json')}
          onCsv={() => downloadFile('narrative-deck-beats.csv', beatsToCSV(state.beats), 'text/csv')}
          onImportClick={() => fileRef.current?.click()} />
      )}
      {modal === 'reset' && (
        <Modal title="Clear the board?" onClose={() => setModal(null)}>
          <p className="text-[13.5px] leading-relaxed text-fog">
            This unpins every beat, title, and audience note from this browser.
            If any of it matters, <strong className="text-bone">Export &rarr; Download JSON</strong> first — there is no undo for this one.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Btn onClick={() => setModal(null)}>Keep my board</Btn>
            <Btn kind="danger" onClick={doReset}><RotateCcw size={14} /> Yes, wipe the cork</Btn>
          </div>
        </Modal>
      )}

      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Import JSON file"
        onChange={e => { const f = e.target.files?.[0]; if (f) importJSON(f); e.target.value = ''; }} />

      {/* ============ toast ============ */}
      {toast && (
        <div className="anim-toast fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-sm border border-string/50 bg-[#100d09] px-4 py-2.5 text-[13px] text-bone shadow-hero" role="status">
          <span>{toast.msg}</span>
          {toast.undo && (
            <button onClick={toast.undo} className="inline-flex items-center gap-1 rounded-sm border border-string/60 px-2 py-0.5 font-semibold text-[#f0a08f] hover:bg-string/20">
              <Undo2 size={13} /> Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Copilot panel
   ================================================================ */

function CopilotPanel({ state, copy, copied, onNotes }) {
  const [open, setOpen] = useState('sharpen');
  const [plId, setPlId] = useState('');
  const [expandId, setExpandId] = useState('');

  const promisedLandBeats = beatsByStage(state.beats, 'promised-land');
  const plTarget = state.beats.find(b => b.id === plId) || promisedLandBeats[0] || null;
  const ordered = orderedBeats(state.beats);
  const expandTarget = state.beats.find(b => b.id === expandId) || ordered[0] || null;

  const ACTIONS = [
    {
      id: 'sharpen', icon: Wand2, title: 'Sharpen the promised land',
      blurb: 'Make the after-state vivid, specific, and impossible to shrug at.',
      picker: promisedLandBeats.length ? (
        <select className={darkInputCls} value={plTarget ? plTarget.id : ''} onChange={e => setPlId(e.target.value)} aria-label="Promised-land beat to sharpen">
          {promisedLandBeats.map(b => <option key={b.id} value={b.id}>{b.headline.trim() || b.beat.trim().slice(0, 40) || 'Untitled beat'}</option>)}
        </select>
      ) : null,
      ready: !!plTarget,
      build: () => buildSharpenPrompt(state, plTarget),
      empty: 'Pin a Promised Land beat first.',
    },
    {
      id: 'headlines', icon: Type, title: 'Generate slide headlines',
      blurb: 'Turn every beat into a punchy, presentable title.',
      picker: null,
      ready: state.beats.length > 0,
      build: () => buildHeadlinesPrompt(state),
      empty: 'Pin at least one beat first.',
    },
    {
      id: 'holes', icon: AlertTriangle, title: 'Find holes in my story',
      blurb: 'An honest audit of gaps, weak links, and pacing.',
      picker: null,
      ready: state.beats.length > 0,
      build: () => buildHolesPrompt(state),
      empty: 'Pin at least one beat first — the audit needs material.',
    },
    {
      id: 'expand', icon: Presentation, title: 'Expand a beat into full slide copy',
      blurb: 'Headline, bullets, speaker notes, and a visual brief for one card.',
      picker: ordered.length ? (
        <select className={darkInputCls} value={expandTarget ? expandTarget.id : ''} onChange={e => setExpandId(e.target.value)} aria-label="Beat to expand">
          {ordered.map((b, i) => <option key={b.id} value={b.id}>Slide {i + 1} — {b.headline.trim() || stageLabel(b.stage)}</option>)}
        </select>
      ) : null,
      ready: !!expandTarget,
      build: () => buildExpandPrompt(state, expandTarget),
      empty: 'Pin a beat first.',
    },
  ];

  return (
    <aside aria-label="Claude Copilot" className="xl:sticky xl:top-4 xl:self-start">
      <div className="copilot-rail rounded-sm">
        <div className="border-b border-brass/25 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-brass" aria-hidden="true" />
            <h2 className="font-display text-[15px] font-bold text-bone">Claude Copilot</h2>
          </div>
          <p className="mt-1 text-[11.5px] italic leading-snug text-fog">
            The writer's-room assistant. Each action packs your current board into a prompt —
            paste it into claude.ai. Works with the standard $20 Claude subscription; no API key.
          </p>
        </div>
        <div className="divide-y divide-bone/10">
          {ACTIONS.map(act => {
            const isOpen = open === act.id;
            const tag = 'cp-' + act.id;
            return (
              <div key={act.id}>
                <button onClick={() => setOpen(isOpen ? '' : act.id)} aria-expanded={isOpen}
                  className="flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-bone/[.04]">
                  <act.icon size={15} className="mt-0.5 shrink-0 text-brass" aria-hidden="true" />
                  <span className="flex-1">
                    <span className="block font-display text-[13.5px] font-bold text-bone">{act.title}</span>
                    <span className="block text-[11.5px] italic leading-snug text-fog">{act.blurb}</span>
                  </span>
                  {isOpen ? <ChevronDown size={14} className="mt-1 text-fog" /> : <ChevronRight size={14} className="mt-1 text-fog" />}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4">
                    {act.picker ? <div className="mb-2">{act.picker}</div> : null}
                    {act.ready ? (
                      <Btn kind="brass" className="w-full justify-center"
                        onClick={() => copy(act.build(), tag)}>
                        {copied === tag ? <Check size={14} /> : <Copy size={14} />}
                        {copied === tag ? 'Prompt copied — paste into claude.ai' : 'Copy prompt'}
                      </Btn>
                    ) : (
                      <p className="text-[11.5px] italic text-faint">{act.empty}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="border-t border-brass/25 px-4 py-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-fog">
            <ClipboardPaste size={12} aria-hidden="true" /> Claude's answer, kept with the board
          </div>
          <textarea rows={4} value={state.copilotNotes} onChange={e => onNotes(e.target.value)}
            aria-label="Paste Claude's answer"
            placeholder="Paste the reply you want to keep — it autosaves with everything else."
            className="w-full rounded-sm border border-bone/20 bg-[#171310] px-2.5 py-2 text-[12px] leading-relaxed text-bone placeholder:text-bone/30 focus:border-string" />
        </div>
      </div>
      <div className="stage-col mt-3 flex items-start gap-2 rounded-sm px-3 py-2.5 text-[11.5px] italic leading-snug text-fog">
        <Lightbulb size={14} className="mt-0.5 shrink-0 text-brass" aria-hidden="true" />
        <span>Writer's rule: if a beat can't be said out loud in one breath, it's not a beat yet — it's two.</span>
      </div>
    </aside>
  );
}

/* ================================================================
   Help & Export modals
   ================================================================ */

function HelpModal({ onClose }) {
  const steps = [
    ['Load the demo', 'Press "Load demo" to pin a finished board — 10 beats across all five arc stages for a warehouse-software pitch. Reset clears it (with confirmation) when you\'re ready to work.'],
    ['Set the frame', 'On The Board tab, fill in the deck title and who\'s actually in the room — every Copilot prompt uses this for context.'],
    ['Pin your Status Quo', 'Add one or two beats describing the ordinary world before anything breaks. Concrete detail beats a generic claim — numbers, names, specifics.'],
    ['Pin the Threat', 'What breaks, costs money, or is about to get worse if nothing changes? This is where the stakes live.'],
    ['Pin the Promised Land, Proof, and Ask', 'The Promised Land is the vivid after-state; Proof is evidence it\'s real; The Ask is the exact next step. Each beat card expands to a full slide outline: headline, support, and a visual idea.'],
    ['Watch the Pacing check', 'The Setup / Conflict / Resolution bar shows how your story\'s weight is distributed, with a plain-language verdict. Thin conflict or a heavy setup shows up immediately.'],
    ['Reorder and re-file beats', 'Use the up/down arrows to reorder beats within a stage, or change a beat\'s "Arc position" dropdown to move it to a different stage entirely.'],
    ['Read it straight through', 'The Read-through tab lines every slide up in presentation order — headline, bullets, visual idea — so you can feel the story before you touch a deck tool. Print it for a leave-behind outline.'],
    ['Let Claude write with you', 'The Copilot panel has four actions: sharpen a promised-land statement, generate slide headlines, find holes in the story, and expand one beat into full slide copy. Copy the prompt, paste it into claude.ai (works with the standard $20 subscription, no API key), and keep what\'s useful in the notes box.'],
  ];
  const keys = [
    ['?', 'Open this guide'],
    ['Esc', 'Close any dialog'],
    ['Ctrl/Cmd + S', 'Copy the deck outline as Markdown'],
  ];
  return (
    <Modal title="How to use Narrative Deck Builder" onClose={onClose} wide>
      <ol className="space-y-3">
        {steps.map(([t, d], i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-string font-display text-[12px] font-bold text-[#fff3ea]">{i + 1}</span>
            <div>
              <div className="font-display text-[14px] font-bold text-bone">{t}</div>
              <div className="text-[12.5px] leading-relaxed text-fog">{d}</div>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-5 rounded-sm border border-bone/15 bg-cork/60 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-fog">
          <Keyboard size={13} aria-hidden="true" /> Keyboard shortcuts
        </div>
        <div className="grid gap-1.5 sm:grid-cols-3">
          {keys.map(([k, d]) => (
            <div key={k} className="flex items-center gap-2 text-[12px]">
              <kbd className="rounded-sm border border-bone/25 bg-panel px-1.5 py-0.5 font-mono text-[11px] text-bone shadow-[0_1px_0_rgba(0,0,0,.4)]">{k}</kbd>
              <span className="text-fog">{d}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Btn kind="primary" onClick={onClose}><Check size={14} /> To the board</Btn>
      </div>
    </Modal>
  );
}

function ExportModal({ onClose, onCopyMd, copied, onJson, onCsv, onImportClick }) {
  const rows = [
    { icon: FileText, title: 'Copy Markdown', desc: 'The full deck outline — arc, slides, and pacing — as a clean document. (Also Ctrl/Cmd+S.)', act: onCopyMd, label: copied === 'md' ? 'Copied' : 'Copy' },
    { icon: FileJson, title: 'Download JSON', desc: 'Full state — your backup, or the file to move between browsers.', act: onJson, label: 'Download' },
    { icon: FileSpreadsheet, title: 'Download CSV', desc: 'Every beat as a spreadsheet row: slide number, stage, headline, support, visual.', act: onCsv, label: 'Download' },
    { icon: Upload, title: 'Import JSON', desc: 'Restore a backup. Anything malformed is gracefully ignored.', act: onImportClick, label: 'Choose file' },
  ];
  return (
    <Modal title="Export & import" onClose={onClose}>
      <ul className="space-y-2.5">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center gap-3 rounded-sm border border-bone/15 bg-cork/50 px-3 py-2.5">
            <r.icon size={18} className="shrink-0 text-brass" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="font-display text-[13.5px] font-bold text-bone">{r.title}</div>
              <div className="text-[11.5px] leading-snug text-fog">{r.desc}</div>
            </div>
            <Btn kind={i === 0 ? 'brass' : 'ghost'} onClick={r.act} className="shrink-0">
              {r.label === 'Copied' ? <Check size={13} /> : null} {r.label}
            </Btn>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] italic text-faint">
        Everything lives in this browser's localStorage — no accounts, no server, nothing leaves your machine.
      </p>
    </Modal>
  );
}
