import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Trash2, Copy, Check, Download, Upload, HelpCircle, RotateCcw, X,
  ChevronDown, ArrowUp, ArrowDown, Printer, FileJson, FileText, FileSpreadsheet,
  GripVertical, Star, Eye, EyeOff, PenLine, Search, Sparkles, Stamp, ScrollText,
  CircleCheck, Circle, Link2, ClipboardPaste, MessageCircleQuestion, Feather,
  Landmark, ListChecks, Scale, ShieldQuestion, BookOpen,
} from 'lucide-react';

/* ==================================================================== *
 *  PROPOSAL STUDIO — assemble winning service proposals                *
 *  World: fine stationery. Cream paper, ink navy, gold foil,           *
 *  letterpress rules. Fraunces display, Lora body.                     *
 * ==================================================================== */

const SLUG = '04-proposal-studio';
const LS_KEY = 'bizdev:04-proposal-studio:v1';

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const str = (v, d = '') => (typeof v === 'string' ? v : d);
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'];
const roman = (i) => ROMAN[i] || String(i + 1);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function fmtDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(s));
  if (!m) return str(s) || '—';
  return `${MONTHS[+m[2] - 1] || m[2]} ${+m[3]}, ${m[1]}`;
}

const CURRENCIES = [
  ['USD', 'US Dollar'], ['EUR', 'Euro'], ['GBP', 'Pound Sterling'],
  ['CAD', 'Canadian Dollar'], ['AUD', 'Australian Dollar'], ['CHF', 'Swiss Franc'],
];
function fmtMoney(n, cur) {
  const v = num(n, 0);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: cur || 'USD',
      minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(v);
  } catch {
    return `$${v.toLocaleString()}`;
  }
}

const wordCount = (t) => str(t).split(/\s+/).filter(Boolean).length;
const blanksIn = (t) => (str(t).match(/\[[^\]]*\]/g) || []).length;

/* --------------------------- section drawer -------------------------- */

const TEMPLATES = [
  {
    kind: 'letter', title: 'Opening Letter', cat: 'Foundation',
    blurb: 'A short personal letter. The one page everyone actually reads.',
    starter:
      'Dear [first name],\n\nThank you for the conversation on [date]. What stayed with us was [the thing they said that matters].\n\nThis document sets out how we would [outcome], what it costs, and what happens next. It is deliberately short: every page in it earns its place.\n\nWe would be glad to do this work.\n\n[Your name]',
  },
  {
    kind: 'problem', title: 'The Situation', cat: 'Foundation',
    blurb: 'Their problem, in their words. Prove you listened before you pitch.',
    starter:
      'In our conversations, three things came through clearly:\n\n- [Symptom the client named, in their own words]\n- [The cost of it — hours, revenue, reputation]\n- [Why now — the deadline or trigger forcing the decision]\n\nLeft as it is, [consequence of doing nothing]. That is the problem this proposal is built to remove.',
  },
  {
    kind: 'approach', title: 'Our Approach', cat: 'Persuasion',
    blurb: 'How you think, not just what you do. Your method as the differentiator.',
    starter:
      'We work in [number] moves:\n\n- [Phase one name] — [what happens and what the client gets from it]\n- [Phase two name] — [what happens]\n- [Phase three name] — [what happens]\n\nTwo principles run through all of it: [principle one, stated plainly], and [principle two]. This is why our work [the result the method produces].',
  },
  {
    kind: 'scope', title: 'Scope & Deliverables', cat: 'Commercial',
    blurb: 'Countable nouns only. This section is what the invoice points at.',
    starter:
      'This engagement delivers, concretely:\n\n- [Deliverable 1 — a countable noun with a number attached]\n- [Deliverable 2]\n- [Deliverable 3]\n\nEach deliverable is accepted when [acceptance criterion]. Anything not listed here is out of scope and quoted separately.',
  },
  {
    kind: 'timeline', title: 'Timeline & Milestones', cat: 'Commercial',
    blurb: 'Dated milestones. A schedule reads as competence.',
    starter:
      'From a signed acceptance, the work runs [n] weeks:\n\n- Week 1 — [kickoff milestone]\n- Week [n] — [midpoint milestone, the first thing they can react to]\n- Week [n] — [delivery milestone]\n\nThe schedule holds if feedback rounds return within [x] working days.',
  },
  {
    kind: 'team', title: 'The Team', cat: 'Persuasion',
    blurb: 'Who shows up, by name. Buyers hire people, not brochures.',
    starter:
      '- [Name], [role] — leads [what they own]. Previously [one relevant credential].\n- [Name], [role] — owns [what they own].\n\nNo hand-offs to juniors you have not met: the people named here do the work.',
  },
  {
    kind: 'proof', title: 'Selected Results', cat: 'Persuasion',
    blurb: 'Two or three wins with numbers. Proof beats adjectives.',
    starter:
      '- [Client or sector] — [what you did] led to [measured result] in [timeframe].\n- [Client or sector] — [what you did] led to [measured result].\n\nReferences with direct experience of this kind of engagement are available on request.',
  },
  {
    kind: 'guarantee', title: 'Our Guarantee', cat: 'Persuasion',
    blurb: 'Where you shoulder the risk. Use sparingly, mean it fully.',
    starter:
      'If [specific, checkable condition is not met], we will [remedy: rework, extend, or refund the phase]. We can offer this because [the reason the guarantee is safe for you to make].',
  },
  {
    kind: 'exclusions', title: 'Out of Scope', cat: 'Commercial',
    blurb: 'The polite fence. Scope creep dies here, not in month two.',
    starter:
      'To keep the price honest, this proposal does not include:\n\n- [Adjacent work often assumed, e.g. ongoing maintenance]\n- [Third-party costs: licences, media spend, print runs]\n- [Anything requiring a separate specialist]\n\nWe are glad to quote any of these separately once the core engagement is underway.',
  },
  {
    kind: 'terms', title: 'Terms & Conditions', cat: 'Commercial',
    blurb: 'Payment schedule, revisions, ownership, validity. The quiet page that prevents loud arguments.',
    starter:
      '- Payment: [50%] on acceptance, [50%] on delivery. Invoices due within [14] days.\n- Revisions: each deliverable includes [two] rounds of consolidated feedback.\n- Ownership: full rights transfer on final payment; we retain portfolio rights.\n- Expenses: pre-approved, billed at cost.\n- Validity: pricing in this proposal holds until the date on the cover.',
  },
  {
    kind: 'next', title: 'Next Steps & Acceptance', cat: 'Foundation',
    blurb: 'One clear action and a signature line. End with a door, not a wall.',
    starter:
      'To proceed:\n\n- Reply confirming the option you have chosen.\n- We countersign and send the first invoice with the kickoff agenda.\n- Work begins on [date] — we hold this start date until the validity date on the cover.\n\nAgreed and accepted for [client company]:\n\nSignature, name and date',
  },
];
const TEMPLATE_BY_KIND = Object.fromEntries(TEMPLATES.map((t) => [t.kind, t]));
const CATS = ['Foundation', 'Persuasion', 'Commercial'];

/* ----------------------------- normalize ----------------------------- */

function normalizeSection(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  return {
    id: str(o.id) || uid(),
    kind: TEMPLATE_BY_KIND[str(o.kind)] ? str(o.kind) : 'custom',
    title: str(o.title, 'Untitled section'),
    body: str(o.body),
    included: o.included !== false,
  };
}

function normalizeItem(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  return {
    id: str(o.id) || uid(),
    desc: str(o.desc),
    detail: str(o.detail),
    qty: clamp(num(o.qty, 1), 0, 999999),
    rate: clamp(num(o.rate, 0), 0, 99999999),
  };
}

function normalizeOption(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  return {
    id: str(o.id) || uid(),
    name: str(o.name, 'Option'),
    tagline: str(o.tagline),
    recommended: !!o.recommended,
    discountPct: clamp(num(o.discountPct, 0), 0, 100),
    items: (Array.isArray(o.items) ? o.items : []).map(normalizeItem),
  };
}

function normalize(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const c = o.cover && typeof o.cover === 'object' ? o.cover : {};
  const p = o.pricing && typeof o.pricing === 'object' ? o.pricing : {};
  return {
    v: 1,
    seenGuide: !!o.seenGuide,
    tab: ['cover', 'sections', 'pricing', 'preview', 'copilot'].includes(o.tab) ? o.tab : 'cover',
    cover: {
      title: str(c.title),
      subtitle: str(c.subtitle),
      clientName: str(c.clientName),
      clientCompany: str(c.clientCompany),
      preparedBy: str(c.preparedBy),
      company: str(c.company),
      email: str(c.email),
      refNo: str(c.refNo),
      date: str(c.date),
      validUntil: str(c.validUntil),
      monogram: str(c.monogram).slice(0, 3),
      tagline: str(c.tagline),
    },
    sections: (Array.isArray(o.sections) ? o.sections : []).map(normalizeSection),
    pricing: {
      currency: CURRENCIES.some(([k]) => k === p.currency) ? p.currency : 'USD',
      taxLabel: str(p.taxLabel, 'Tax'),
      taxPct: clamp(num(p.taxPct, 0), 0, 60),
      note: str(p.note),
      options: (Array.isArray(p.options) ? p.options : []).map(normalizeOption),
    },
    copilotNotes: str(o.copilotNotes),
  };
}

/* ----------------------------- demo state ---------------------------- */

function demoState() {
  return normalize({
    v: 1,
    seenGuide: true,
    tab: 'preview',
    cover: {
      title: 'A Brand Worth the Stay',
      subtitle: 'Brand renewal & booking experience for Harbor Lane Hotels',
      clientName: 'Eleanor Vance, Managing Director',
      clientCompany: 'Harbor Lane Hotels',
      preparedBy: 'Jonas Grange, Principal',
      company: 'Marlowe & Grange',
      email: 'studio@marloweandgrange.example',
      refNo: 'PS-2026-014',
      date: '2026-07-18',
      validUntil: '2026-08-15',
      monogram: 'MG',
      tagline: 'Brand & digital, set by hand',
    },
    sections: [
      {
        id: 's-letter', kind: 'letter', title: 'Opening Letter', included: true,
        body:
          'Dear Eleanor,\n\nThank you for the walk through the Beacon Street property last Tuesday. What stayed with us was your phrase: "our guests love us the second time — it is the first time we lose them."\n\nThat is a brand problem and a booking problem, and they need to be solved together. This document sets out how we would do it, what it costs, and what happens next. It is deliberately short: every page in it earns its place.\n\nWe would be proud to do this work.\n\nJonas Grange',
      },
      {
        id: 's-problem', kind: 'problem', title: 'The Situation', included: true,
        body:
          'In our conversations and the audit visit, three things came through clearly:\n\n- Harbor Lane’s four properties present as four unrelated hotels. The marque on the Beacon Street awning does not appear anywhere on the website that books it.\n- Direct bookings sit at 31% against an independent-hotel benchmark of roughly 50%. The difference flows to OTA commissions — at your volume, an estimated $310,000 a year.\n- The booking flow takes eleven steps and loses 68% of guests after the room-select page. Your own front desk calls it "the maze."\n\nGuests who arrive love the stay: your 4.7 review average proves it. The brand and the booking journey are the only parts of Harbor Lane that do not yet deserve those reviews. Left as they are, the OTA dependency compounds every season.',
      },
      {
        id: 's-approach', kind: 'approach', title: 'Our Approach', included: true,
        body:
          'We work in three moves:\n\n- Listen — two days on property, twelve guest interviews, and a teardown of the six competitors your guests also shortlist. We write down what Harbor Lane means before we draw anything.\n- Set — the identity system: marque, palette, typography, voice. Everything is tested on real artefacts first — a key card, a booking confirmation, the Beacon Street awning — never on a mood board.\n- Build — the booking journey redesigned around one promise: room, rate, and confirmation in under three minutes, with the brand present at every step.\n\nTwo principles run through all of it. First, the brand must survive the hallway: if it only works on a slide, it does not work. Second, every design decision must be traceable to a guest we interviewed — taste is not a strategy.',
      },
      {
        id: 's-scope', kind: 'scope', title: 'Scope & Deliverables', included: true,
        body:
          'This engagement delivers, concretely:\n\n- One identity system: marque, three lockups, palette, two typefaces licensed for hotel use, and usage rules.\n- One voice & messaging guide covering website, confirmations, and in-room print.\n- Twelve website templates, designed and prototyped, with a component library your developers implement directly.\n- One redesigned booking journey, from search to confirmation email, prototyped and tested with eight guests.\n- One brand book, printed and digital, plus a 90-day rollout playbook ordered by cost and visibility.\n\nEach deliverable is accepted when it passes the review round defined in Terms. Anything not listed here is out of scope and quoted separately.',
      },
      {
        id: 's-timeline', kind: 'timeline', title: 'Timeline & Milestones', included: true,
        body:
          'From a signed acceptance, the work runs fourteen weeks:\n\n- Weeks 1–2 — Listen: property visits, interviews, competitor teardown. Milestone: findings review with your team.\n- Weeks 3–7 — Set: identity concepts (week 4), refined system (week 6), voice guide (week 7).\n- Weeks 8–13 — Build: booking journey prototype (week 10), guest testing (week 11), twelve templates and component library (week 13).\n- Week 14 — Hand-over: brand book, rollout playbook, and a working session with your web team.\n\nThe schedule holds if consolidated feedback returns within five working days per round. Summer opening dates are unaffected: nothing here touches live systems until your team implements.',
      },
      {
        id: 's-team', kind: 'team', title: 'The Studio Team', included: true,
        body:
          '- Jonas Grange, Principal — leads identity and is your single point of contact. Fifteen years in hospitality branding; previously rebranded a nine-property coastal group.\n- Priya Marlowe, Design Director — owns the booking journey and templates. Led booking-flow work that lifted direct conversion 22% for a city-hotel client.\n- Tomas Ferreira, Brand Writer — owns voice and messaging, from the welcome letter to the error page.\n\nNo hand-offs to juniors you have not met: the three people named here do the work.',
      },
      {
        id: 's-proof', kind: 'proof', title: 'Selected Results', included: true,
        body:
          '- Coastal hotel group, nine properties — full rebrand and booking redesign lifted direct bookings from 29% to 47% in eleven months, retiring roughly $400,000 in annual OTA commission.\n- Independent city hotel, 74 keys — booking-flow redesign cut steps from ten to four; completion rate rose 22% in the first quarter after launch.\n- Heritage inn collection — identity renewal was credited by the owners with supporting a 9% ADR increase without occupancy loss.\n\nReferences with direct experience of this kind of engagement are available on request.',
      },
      {
        id: 's-terms', kind: 'terms', title: 'Terms & Conditions', included: true,
        body:
          '- Payment: 40% on acceptance, 30% at the week-7 milestone, 30% on delivery. Invoices due within 14 days.\n- Revisions: each phase includes two rounds of consolidated feedback; further rounds billed at $210/hour.\n- Ownership: full rights in the identity and templates transfer on final payment; Marlowe & Grange retains portfolio rights.\n- Third-party costs: type licences, photography usage, and print runs are billed at cost with prior approval.\n- Validity: pricing in this proposal holds until August 15, 2026.',
      },
      {
        id: 's-next', kind: 'next', title: 'Next Steps & Acceptance', included: true,
        body:
          'To proceed:\n\n- Reply confirming the edition you have chosen.\n- We countersign and send the first invoice together with the kickoff agenda and interview schedule.\n- Work begins September 1, 2026 — we hold this start date until the validity date on the cover.\n\nAgreed and accepted for Harbor Lane Hotels:\n\nSignature, name and date',
      },
    ],
    pricing: {
      currency: 'USD', taxLabel: 'Tax', taxPct: 0,
      note: 'Both editions include the Listen phase in full. Fees exclude third-party costs (type licences, photography usage, print), which are billed at cost with prior approval.',
      options: [
        {
          id: 'opt-crest', name: 'The Crest Edition', tagline: 'Identity renewal — the brand, set right', recommended: false, discountPct: 0,
          items: [
            { id: 'c1', desc: 'Brand audit & guest research', detail: 'Two property days, 12 guest interviews, competitor teardown', qty: 1, rate: 4800 },
            { id: 'c2', desc: 'Identity refresh', detail: 'Marque, lockups, palette, typography, stationery suite', qty: 1, rate: 9600 },
            { id: 'c3', desc: 'Voice & messaging guide', detail: 'Tone, key messages, naming conventions', qty: 1, rate: 3800 },
            { id: 'c4', desc: 'Collateral templates', detail: 'Menus, key cards, in-room compendium', qty: 1, rate: 4200 },
            { id: 'c5', desc: 'Brand book', detail: 'Printed and digital, with usage rules', qty: 1, rate: 3600 },
          ],
        },
        {
          id: 'opt-foil', name: 'The Foil Edition', tagline: 'Identity plus the booking experience — the full argument', recommended: true, discountPct: 5,
          items: [
            { id: 'f1', desc: 'Brand audit & guest research', detail: 'Two property days, 12 guest interviews, competitor teardown', qty: 1, rate: 4800 },
            { id: 'f2', desc: 'Full identity system', detail: 'Marque, palette, type, signage, uniforms, livery', qty: 1, rate: 14500 },
            { id: 'f3', desc: 'Voice & messaging guide', detail: 'Website, confirmations, in-room print', qty: 1, rate: 3800 },
            { id: 'f4', desc: 'Booking journey redesign', detail: 'Search to confirmation email, prototyped, guest-tested', qty: 1, rate: 16400 },
            { id: 'f5', desc: 'Website design & component library', detail: 'Twelve templates, developer-ready', qty: 1, rate: 11200 },
            { id: 'f6', desc: 'Photography art direction', detail: 'Shoot direction and shot list, per day', qty: 2, rate: 1400 },
            { id: 'f7', desc: 'Brand book & rollout playbook', detail: '90-day rollout ordered by cost and visibility', qty: 1, rate: 4400 },
          ],
        },
      ],
    },
    copilotNotes: '',
  });
}

/* ------------------------------ pricing math -------------------------- */

function optionMath(opt, taxPct) {
  const subtotal = opt.items.reduce((s, it) => s + num(it.qty) * num(it.rate), 0);
  const discount = subtotal * (num(opt.discountPct) / 100);
  const taxable = subtotal - discount;
  const tax = taxable * (num(taxPct) / 100);
  return { subtotal, discount, taxable, tax, total: taxable + tax };
}

/* ------------------------------ readiness ----------------------------- */

function readiness(state) {
  const { cover, sections, pricing } = state;
  const inc = sections.filter((s) => s.included);
  const has = (k) => inc.some((s) => s.kind === k);
  const checks = [
    { ok: !!(cover.title && cover.clientCompany && cover.preparedBy && cover.date), label: 'Cover sheet complete', tab: 'cover' },
    { ok: has('letter') || has('problem'), label: 'Opens with letter or situation', tab: 'sections' },
    { ok: inc.length >= 4, label: 'At least four sections included', tab: 'sections' },
    { ok: inc.every((s) => blanksIn(s.body) === 0) && inc.length > 0, label: 'No [blanks] left to fill', tab: 'sections' },
    { ok: pricing.options.some((o) => o.items.length > 0), label: 'Investment has priced options', tab: 'pricing' },
    { ok: has('terms'), label: 'Terms & conditions included', tab: 'sections' },
    { ok: has('next'), label: 'Acceptance & next steps included', tab: 'sections' },
    { ok: !!cover.validUntil, label: 'Validity date set', tab: 'cover' },
  ];
  const passed = checks.filter((c) => c.ok).length;
  return { checks, passed, pct: Math.round((passed / checks.length) * 100) };
}

/* --------------------------- serialization ---------------------------- */

function pricingMarkdown(pricing) {
  if (!pricing.options.length) return '';
  const cur = pricing.currency;
  const parts = ['## Investment', ''];
  pricing.options.forEach((opt, i) => {
    const m = optionMath(opt, pricing.taxPct);
    parts.push(`### Option ${roman(i)} — ${opt.name}${opt.recommended ? ' (recommended)' : ''}`);
    if (opt.tagline) parts.push(`*${opt.tagline}*`);
    parts.push('', '| Item | Detail | Qty | Rate | Amount |', '| --- | --- | ---: | ---: | ---: |');
    opt.items.forEach((it) => {
      parts.push(`| ${it.desc || '—'} | ${it.detail || ''} | ${it.qty} | ${fmtMoney(it.rate, cur)} | ${fmtMoney(num(it.qty) * num(it.rate), cur)} |`);
    });
    parts.push('');
    parts.push(`- Subtotal: ${fmtMoney(m.subtotal, cur)}`);
    if (m.discount > 0) parts.push(`- Discount (${opt.discountPct}%): −${fmtMoney(m.discount, cur)}`);
    if (m.tax > 0) parts.push(`- ${pricing.taxLabel} (${pricing.taxPct}%): ${fmtMoney(m.tax, cur)}`);
    parts.push(`- **Total: ${fmtMoney(m.total, cur)}**`, '');
  });
  if (pricing.note) parts.push(`> ${pricing.note}`, '');
  return parts.join('\n');
}

function proposalMarkdown(state) {
  const { cover, sections, pricing } = state;
  const inc = sections.filter((s) => s.included);
  const parts = [];
  parts.push(`# ${cover.title || 'Untitled proposal'}`);
  if (cover.subtitle) parts.push(`*${cover.subtitle}*`);
  parts.push('');
  parts.push(`- Prepared for: ${cover.clientName || '—'}${cover.clientCompany ? `, ${cover.clientCompany}` : ''}`);
  parts.push(`- Prepared by: ${cover.preparedBy || '—'}${cover.company ? `, ${cover.company}` : ''}`);
  if (cover.refNo) parts.push(`- Reference: ${cover.refNo}`);
  parts.push(`- Date: ${fmtDate(cover.date)} · Valid until: ${fmtDate(cover.validUntil)}`);
  parts.push('', '---', '');
  inc.forEach((s) => {
    parts.push(`## ${s.title}`, '', str(s.body).trim(), '');
  });
  const pm = pricingMarkdown(pricing);
  if (pm) parts.push(pm);
  parts.push('---', `*${cover.company || 'Prepared'}${cover.email ? ` · ${cover.email}` : ''} · ${fmtDate(cover.date)}*`);
  return parts.join('\n');
}

function pricingCsv(pricing) {
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [['Option', 'Item', 'Detail', 'Qty', 'Rate', 'Amount'].map(esc).join(',')];
  pricing.options.forEach((opt, i) => {
    opt.items.forEach((it) => {
      rows.push([`Option ${roman(i)} — ${opt.name}`, it.desc, it.detail, it.qty, num(it.rate), num(it.qty) * num(it.rate)].map(esc).join(','));
    });
    const m = optionMath(opt, pricing.taxPct);
    rows.push([`Option ${roman(i)} — ${opt.name}`, 'TOTAL', opt.discountPct ? `after ${opt.discountPct}% discount` : '', '', '', Math.round(m.total * 100) / 100].map(esc).join(','));
  });
  return rows.join('\n');
}

/* --------------------------- copilot prompts -------------------------- */

function consoleContextBlock(connectors) {
  if (!connectors) return '';
  const p = connectors.profile || {};
  const c = connectors.claude || {};
  const lines = [];
  if (str(p.company)) lines.push(`- My company: ${p.company}`);
  if (str(p.offer)) lines.push(`- What we sell: ${p.offer}`);
  if (str(p.icp)) lines.push(`- Our ideal customer: ${p.icp}`);
  if (str(p.pricingAnchor)) lines.push(`- Pricing anchor: ${p.pricingAnchor}`);
  if (str(c.voiceNotes)) lines.push(`- Voice notes: ${c.voiceNotes}`);
  return lines.length ? `## Operator context (from my BD console)\n${lines.join('\n')}\n\n` : '';
}

function promptDraftSection(state, sectionId, notes, connectors) {
  const sec = state.sections.find((s) => s.id === sectionId);
  const others = state.sections.filter((s) => s.included).map((s, i) => `${roman(i)}. ${s.title}`).join('\n');
  const totals = state.pricing.options.map((o, i) => `Option ${roman(i)} — ${o.name}: ${fmtMoney(optionMath(o, state.pricing.taxPct).total, state.pricing.currency)}`).join('; ');
  return `You are a senior proposal writer for professional-services firms. You write like a person, not a brochure: concrete nouns, short sentences, zero filler adjectives, and you always argue from the client's problem, never from the vendor's process.

${consoleContextBlock(connectors)}## Context
- Proposal: "${state.cover.title || 'Untitled'}" — prepared for ${state.cover.clientName || 'the client'}${state.cover.clientCompany ? ` at ${state.cover.clientCompany}` : ''} by ${state.cover.company || 'my firm'}.
- Sections currently in the proposal, in order:
${others || '(none yet)'}
- Investment on the table: ${totals || 'not priced yet'}.

## The section to write
"${sec ? sec.title : 'New section'}"${sec && sec.body.trim() ? ` — a draft exists; improve on it:\n\n${sec.body}` : ' — currently empty.'}

## My rough notes for this section
${notes.trim() || '(no notes — infer sensibly from the context above and mark assumptions)'}

## Your task
Write the finished body copy for this one section.
- 120–280 words unless the material genuinely demands more.
- Use "you/your" for the client and "we" for us. Name the client where natural.
- Turn every vague claim into something checkable (a number, a date, a named deliverable).
- If my notes leave a factual hole, keep the sentence but put the missing fact in [square brackets] so I can fill it.

## Output format
Return only the section body, ready to paste: plain paragraphs and dash lists. No markdown headings, no preamble, no commentary.`;
}

function promptTightenScope(state, connectors) {
  const scopeKinds = ['scope', 'exclusions', 'terms', 'timeline'];
  const scopeSecs = state.sections.filter((s) => s.included && scopeKinds.includes(s.kind));
  const body = scopeSecs.map((s) => `### ${s.title}\n${s.body}`).join('\n\n') || '(no scope, exclusions, timeline or terms sections yet — say so and propose them)';
  const items = state.pricing.options.map((o, i) =>
    `Option ${roman(i)} — ${o.name}:\n${o.items.map((it) => `- ${it.desc}${it.detail ? ` (${it.detail})` : ''} — qty ${it.qty} @ ${fmtMoney(it.rate, state.pricing.currency)}`).join('\n')}`
  ).join('\n\n') || '(no priced options yet)';
  return `You are a contracts-savvy consultant who has watched a hundred service engagements go sideways from vague scope language. Your specialty is turning soft promises into countable deliverables before the client ever sees them.

${consoleContextBlock(connectors)}## The commercial sections of my proposal
${body}

## The priced line items
${items}

## Your task
Audit this scope language for creep risk, then fix it.
1. Hunt vague words and elastic phrases: "ongoing", "support", "as needed", "unlimited", "etc.", "assist with", "help", "manage", "up to", "and more". List every instance you find.
2. For each risky phrase, explain in one line how a client could stretch it, and what it would cost me.
3. Check the line items against the scope text: flag anything priced but not described, or described but not priced.
4. Rewrite the scope and exclusions sections with countable nouns, explicit quantities, named acceptance criteria, and a clean out-of-scope fence.

## Output format
- **Risk table**: | Phrase | Where | How it stretches | Severity (high/med/low) |
- **Mismatches**: bullet list of scope-vs-pricing gaps.
- **Rewritten sections**: full replacement text for each commercial section, ready to paste.`;
}

function promptObjectionFaq(state, connectors) {
  return `You are a sales strategist who preps consultants for the meeting after the proposal lands — the one where the client's team pokes holes in it. You know the objections arrive whether or not we prepare, so we prepare.

${consoleContextBlock(connectors)}## The proposal, in full
${proposalMarkdown(state)}

## Your task
Read the proposal as the buying committee will. Produce the objection-handling kit:
1. The 8–10 objections this specific proposal will actually draw, grouped: Price & value, Risk & proof, Timing & disruption, Capability & fit. Ground each in something concrete on the page (quote the line that triggers it).
2. For each objection: a two-to-four sentence answer in my voice — calm, specific, never defensive. Use the proposal's own numbers where they help.
3. Mark the two objections I should preempt inside the proposal itself, and say exactly which section to amend and how.
4. Finish with a short "price defense" paragraph I can deliver verbatim if asked to discount.

## Output format
Markdown with the four group headings, each objection as **bold**, answer beneath. Then "Preempt these" and "Price defense" as separate sections.`;
}

function promptRedTeam(state, connectors) {
  return `You are the client's most skeptical reader: part CFO, part procurement, allergic to adjectives. You have twelve minutes with this proposal before advising ${state.cover.clientCompany || 'the client'} whether to sign, negotiate, or pass.

${consoleContextBlock(connectors)}## The proposal, in full
${proposalMarkdown(state)}

## Your task
Red-team it honestly.
1. Verdict first: sign / negotiate / pass — one sentence of reasoning.
2. Score each section 1–5 for persuasive weight, with one line each on what earns or loses the score.
3. Identify the single weakest promise — the sentence I would least like to defend in the room — and rewrite it stronger and truer.
4. The three questions your team would ask in the meeting, ranked by how much they hurt.
5. One thing to cut entirely: the passage that works against the sale.

## Output format
Numbered exactly as above. Be blunt; I can take it. Do not soften the verdict.`;
}

/* ========================= visual set pieces ========================== */

function GoldDefs() {
  return (
    <defs>
      <linearGradient id="foil" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#8a6a22" />
        <stop offset="0.45" stopColor="#d3ad55" />
        <stop offset="0.55" stopColor="#f3e2ae" />
        <stop offset="0.7" stopColor="#c49a3f" />
        <stop offset="1" stopColor="#7c5d1d" />
      </linearGradient>
    </defs>
  );
}

/* The studio crest — hand-set mark for the header */
function Crest({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden focusable="false">
      <GoldDefs />
      <rect x="4" y="4" width="56" height="56" rx="4" fill="var(--color-card)" stroke="url(#foil)" strokeWidth="1.6" />
      <rect x="8.5" y="8.5" width="47" height="47" rx="2" fill="none" stroke="var(--color-ink)" strokeWidth="0.7" opacity="0.55" />
      <path d="M32 10.5 L36 16 H28 Z" fill="url(#foil)" />
      <text x="32" y="40" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontWeight="900" fontSize="21" fill="var(--color-ink)">PS</text>
      <line x1="17" y1="46.5" x2="27" y2="46.5" stroke="url(#foil)" strokeWidth="1.4" />
      <rect x="30" y="44.5" width="4" height="4" transform="rotate(45 32 46.5)" fill="url(#foil)" />
      <line x1="37" y1="46.5" x2="47" y2="46.5" stroke="url(#foil)" strokeWidth="1.4" />
    </svg>
  );
}

/* Letterpress rule with a center diamond — the signature divider */
function Flourish({ className = '', tone = 'var(--color-rule-strong)' }) {
  return (
    <svg viewBox="0 0 400 14" preserveAspectRatio="none" className={`h-3.5 w-full ${className}`} aria-hidden focusable="false">
      <line x1="0" y1="7" x2="182" y2="7" stroke={tone} strokeWidth="1" />
      <line x1="0" y1="10" x2="182" y2="10" stroke={tone} strokeWidth="0.5" opacity="0.6" />
      <rect x="196" y="3" width="8" height="8" transform="rotate(45 200 7)" fill="none" stroke="var(--color-gold)" strokeWidth="1.2" />
      <rect x="198.6" y="5.6" width="2.8" height="2.8" transform="rotate(45 200 7)" fill="var(--color-gold)" />
      <line x1="218" y1="7" x2="400" y2="7" stroke={tone} strokeWidth="1" />
      <line x1="218" y1="10" x2="400" y2="10" stroke={tone} strokeWidth="0.5" opacity="0.6" />
    </svg>
  );
}

/* Wax seal for the cover sheet */
function WaxSeal({ monogram, className }) {
  const petals = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return { cx: 40 + Math.cos(a) * 30, cy: 40 + Math.sin(a) * 30, r: 7 + (i % 3) * 1.6 };
  });
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden focusable="false">
      <GoldDefs />
      {petals.map((p, i) => <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="var(--color-seal)" />)}
      <circle cx="40" cy="40" r="31" fill="var(--color-seal)" />
      <circle cx="40" cy="40" r="30" fill="none" stroke="#6d2129" strokeWidth="1.5" opacity="0.8" />
      <circle cx="40" cy="40" r="23" fill="none" stroke="#f3ded8" strokeWidth="0.9" opacity="0.75" />
      <circle cx="33" cy="31" r="10" fill="#ffffff" opacity="0.08" />
      <text x="40" y="47.5" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontWeight="900" fontSize="19" fill="#f6e3d3" style={{ letterSpacing: '0.02em' }}>
        {monogram || 'PS'}
      </text>
    </svg>
  );
}

/* Send-ready gauge — semicircular dial with ticks and needle */
function ReadyDial({ pct }) {
  const P = clamp(num(pct, 0), 0, 100);
  const angle = Math.PI * (1 - P / 100);
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const a = Math.PI * (1 - i / 10);
    const major = i % 5 === 0;
    return {
      x1: 100 + Math.cos(a) * (major ? 70 : 74), y1: 96 - Math.sin(a) * (major ? 70 : 74),
      x2: 100 + Math.cos(a) * 80, y2: 96 - Math.sin(a) * 80, major,
    };
  });
  const nx = 100 + Math.cos(angle) * 56;
  const ny = 96 - Math.sin(angle) * 56;
  return (
    <svg viewBox="0 0 200 112" className="w-full" role="img" aria-label={`Send-ready gauge at ${P} percent`}>
      <GoldDefs />
      <path d="M 20 96 A 80 80 0 0 1 180 96" fill="none" stroke="var(--color-rule)" strokeWidth="8" strokeLinecap="round" />
      <path d="M 20 96 A 80 80 0 0 1 180 96" fill="none" stroke="url(#foil)" strokeWidth="8" strokeLinecap="round"
        pathLength="100" strokeDasharray={`${P} 200`} />
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={t.major ? 'var(--color-ink)' : 'var(--color-ink-faint)'} strokeWidth={t.major ? 1.6 : 0.9} />
      ))}
      <circle cx={20} cy={96} r="2.6" fill="var(--color-ink)" />
      <circle cx={180} cy={96} r="2.6" fill="var(--color-gold)" />
      <line x1="100" y1="96" x2={nx} y2={ny} stroke="var(--color-ink-deep)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="100" cy="96" r="5" fill="var(--color-ink-deep)" />
      <circle cx="100" cy="96" r="2" fill="var(--color-gold-bright)" />
      <text x="100" y="72" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontWeight="900" fontSize="26" fill="var(--color-ink)">{P}%</text>
    </svg>
  );
}

/* Investment comparison — engraved bars with a ticked baseline */
function OptionBars({ options, taxPct, currency }) {
  const rows = options.map((o, i) => ({ name: o.name, i, rec: o.recommended, total: optionMath(o, taxPct).total }));
  const max = Math.max(1, ...rows.map((r) => r.total));
  const H = rows.length * 40 + 26;
  return (
    <svg viewBox={`0 0 320 ${H}`} className="w-full" role="img" aria-label="Investment options compared">
      <GoldDefs />
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={10 + f * 280} y1={6} x2={10 + f * 280} y2={H - 20} stroke="var(--color-rule)" strokeWidth="0.8" strokeDasharray="1 4" />
          <line x1={10 + f * 280} y1={H - 20} x2={10 + f * 280} y2={H - 15} stroke="var(--color-ink-faint)" strokeWidth="1" />
        </g>
      ))}
      <line x1="10" y1={H - 20} x2="290" y2={H - 20} stroke="var(--color-ink-soft)" strokeWidth="1.2" />
      {rows.map((r, idx) => {
        const w = Math.max(4, (r.total / max) * 280);
        const y = idx * 40 + 12;
        return (
          <g key={idx}>
            <text x="10" y={y + 2} fontFamily="Lora, Georgia, serif" fontSize="10.5" fontStyle="italic" fill="var(--color-ink-soft)">
              {`${roman(r.i)}. ${r.name}`}{r.rec ? ' ·' : ''}
            </text>
            {r.rec && <text x={16 + (`${roman(r.i)}. ${r.name} ·`.length * 5.1)} y={y + 2} fontFamily="Lora, Georgia, serif" fontSize="9" fill="var(--color-gold-deep)">recommended</text>}
            <rect x="10" y={y + 7} width={w} height="11" rx="2" fill={r.rec ? 'url(#foil)' : 'var(--color-ink)'} opacity={r.rec ? 1 : 0.85} />
            <circle cx={10 + w} cy={y + 12.5} r="3.2" fill={r.rec ? 'var(--color-gold-deep)' : 'var(--color-ink-deep)'} stroke="var(--color-card)" strokeWidth="1.2" />
            <text x={Math.min(288, 10 + w + 7)} y={y + 16} fontFamily="Fraunces, Georgia, serif" fontWeight="600" fontSize="11"
              fill="var(--color-ink)" textAnchor={10 + w + 7 > 240 ? 'end' : 'start'} dx={10 + w + 7 > 240 ? -10 : 0}>
              {fmtMoney(r.total, currency)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ============================ UI atoms ================================ */

function IconBtn({ label, onClick, children, className = '', title }) {
  return (
    <button type="button" aria-label={label} title={title || label} onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-rule bg-paper-bright text-ink-soft transition-colors hover:border-gold hover:text-gold-deep ${className}`}>
      {children}
    </button>
  );
}

function Btn({ onClick, children, tone = 'ghost', className = '', ...rest }) {
  const tones = {
    ghost: 'border-rule bg-paper-bright text-ink hover:border-gold hover:text-gold-deep',
    ink: 'border-ink-deep bg-ink text-paper-bright hover:bg-ink-deep',
    gold: 'border-gold-deep bg-gold text-paper-bright hover:bg-gold-deep',
    seal: 'border-seal bg-paper-bright text-seal hover:bg-seal-soft',
  };
  return (
    <button type="button" onClick={onClick} {...rest}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] font-semibold tracking-wide transition-colors ${tones[tone]} ${className}`}>
      {children}
    </button>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft letterpress">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] italic text-ink-faint">{hint}</span>}
    </label>
  );
}

const inputCls = 'w-full rounded-md border border-rule bg-paper-bright px-3 py-2 text-[14px] leading-snug shadow-[inset_0_1px_2px_rgb(29_43_78/0.07)] outline-none focus:border-gold';

function Modal({ open, onClose, label, children, wide }) {
  if (!open) return null;
  return (
    <div className="anim-veil fixed inset-0 z-[70] overflow-y-auto bg-ink-deep/45 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={label}
        className={`anim-rise relative mx-auto my-6 w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-lg border border-rule-strong bg-card p-6 shadow-sheet`}>
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 block h-1 rounded-t-lg bg-gradient-to-r from-gold-deep via-gold-bright to-gold-deep" />
        <button type="button" aria-label="Close dialog" onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-faint hover:bg-paper-deep hover:text-ink">
          <X className="h-4 w-4" aria-hidden />
        </button>
        {children}
      </div>
    </div>
  );
}

/* ============================== app =================================== */

export default function App() {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return normalize(raw ? JSON.parse(raw) : null);
    } catch {
      return normalize(null);
    }
  });
  const [guideOpen, setGuideOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const fileRef = useRef(null);
  const dragFrom = useRef(null);
  const [dragOver, setDragOver] = useState(null);
  const [connectors, setConnectors] = useState(null);

  /* console bus (PROTOCOL.md) — standalone-safe */
  useEffect(() => {
    if (window.parent === window) return;
    const onMsg = (e) => {
      const d = e && e.data;
      if (d && d.bizdev === 'context' && d.v === 1 && d.connectors && typeof d.connectors === 'object') {
        setConnectors(d.connectors);
      }
    };
    window.addEventListener('message', onMsg);
    try { window.parent.postMessage({ bizdev: 'ready', v: 1, slug: SLUG }, '*'); } catch { /* framed cross-origin edge */ }
    return () => window.removeEventListener('message', onMsg);
  }, []);

  /* first visit → open the guide */
  useEffect(() => {
    if (!state.seenGuide) setGuideOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* debounced autosave */
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
    }, 350);
    return () => clearTimeout(t);
  }, [state]);

  const patch = (p) => setState((s) => ({ ...s, ...p }));
  const setTab = (tab) => patch({ tab });
  const patchCover = (p) => setState((s) => ({ ...s, cover: { ...s.cover, ...p } }));
  const patchPricing = (p) => setState((s) => ({ ...s, pricing: { ...s.pricing, ...p } }));

  const showToast = (text, onUndo) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    const id = uid();
    setToast({ id, text, onUndo });
    toastTimer.current = setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), onUndo ? 7000 : 2600);
  };

  const closeGuide = () => { setGuideOpen(false); if (!state.seenGuide) patch({ seenGuide: true }); };

  /* clipboard with file:// fallback */
  const copyText = async (text, doneMsg) => {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch { ok = false; }
    if (!ok) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        ta.remove();
      } catch { ok = false; }
    }
    showToast(ok ? doneMsg : 'Copy failed — select and copy manually');
  };

  const md = useMemo(() => proposalMarkdown(state), [state]);
  const ready = useMemo(() => readiness(state), [state]);
  const totalWords = useMemo(
    () => state.sections.filter((s) => s.included).reduce((n, s) => n + wordCount(s.body), 0),
    [state.sections],
  );

  /* keyboard: ? help · Esc close · Ctrl/Cmd+S copy markdown */
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const editing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (e.key === 'Escape') {
        setExportOpen(false);
        setConfirmReset(false);
        setConfirmDemo(false);
        setGuideOpen((g) => { if (g && !state.seenGuide) patch({ seenGuide: true }); return false; });
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        copyText(proposalMarkdown(state), 'Proposal Markdown copied');
        return;
      }
      if (e.key === '?' && !editing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setGuideOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  /* -------- section ops -------- */
  const addSection = (tpl) => {
    const sec = normalizeSection({ kind: tpl.kind, title: tpl.title, body: tpl.starter, included: true });
    setState((s) => ({ ...s, sections: [...s.sections, sec], tab: 'sections' }));
    showToast(`"${tpl.title}" set on the page`);
  };
  const addBlankSection = () => {
    const sec = normalizeSection({ kind: 'custom', title: 'New section', body: '', included: true });
    setState((s) => ({ ...s, sections: [...s.sections, sec] }));
  };
  const updateSection = (id, p) =>
    setState((s) => ({ ...s, sections: s.sections.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
  const removeSection = (id) => {
    setState((s) => {
      const idx = s.sections.findIndex((x) => x.id === id);
      if (idx < 0) return s;
      const removed = s.sections[idx];
      const sections = s.sections.filter((x) => x.id !== id);
      showToast(`Removed "${removed.title}"`, () =>
        setState((s2) => {
          const arr = [...s2.sections];
          arr.splice(Math.min(idx, arr.length), 0, removed);
          return { ...s2, sections: arr };
        }));
      return { ...s, sections };
    });
  };
  const moveSection = (idx, dir) =>
    setState((s) => {
      const j = idx + dir;
      if (j < 0 || j >= s.sections.length) return s;
      const arr = [...s.sections];
      const [x] = arr.splice(idx, 1);
      arr.splice(j, 0, x);
      return { ...s, sections: arr };
    });
  const dropSection = (to) => {
    const from = dragFrom.current;
    dragFrom.current = null;
    setDragOver(null);
    if (from === null || from === undefined || from === to) return;
    setState((s) => {
      const arr = [...s.sections];
      const [x] = arr.splice(from, 1);
      arr.splice(to > from ? to - 1 : to, 0, x);
      return { ...s, sections: arr };
    });
  };

  /* -------- pricing ops -------- */
  const addOption = () => {
    const n = state.pricing.options.length;
    patchPricing({
      options: [...state.pricing.options, normalizeOption({
        name: n === 0 ? 'The Crest Edition' : n === 1 ? 'The Foil Edition' : `Option ${roman(n)}`,
        items: [{ desc: '', detail: '', qty: 1, rate: 0 }],
      })],
    });
  };
  const updateOption = (id, p) =>
    patchPricing({ options: state.pricing.options.map((o) => (o.id === id ? { ...o, ...p } : o)) });
  const removeOption = (id) => {
    const idx = state.pricing.options.findIndex((o) => o.id === id);
    if (idx < 0) return;
    const removed = state.pricing.options[idx];
    patchPricing({ options: state.pricing.options.filter((o) => o.id !== id) });
    showToast(`Removed "${removed.name}"`, () =>
      setState((s2) => {
        const arr = [...s2.pricing.options];
        arr.splice(Math.min(idx, arr.length), 0, removed);
        return { ...s2, pricing: { ...s2.pricing, options: arr } };
      }));
  };
  const addItem = (optId) =>
    updateOption(optId, { items: [...state.pricing.options.find((o) => o.id === optId).items, normalizeItem({ qty: 1, rate: 0 })] });
  const updateItem = (optId, itemId, p) => {
    const opt = state.pricing.options.find((o) => o.id === optId);
    updateOption(optId, { items: opt.items.map((it) => (it.id === itemId ? { ...it, ...p } : it)) });
  };
  const removeItem = (optId, itemId) => {
    const opt = state.pricing.options.find((o) => o.id === optId);
    const idx = opt.items.findIndex((it) => it.id === itemId);
    if (idx < 0) return;
    const removed = opt.items[idx];
    updateOption(optId, { items: opt.items.filter((it) => it.id !== itemId) });
    showToast('Line item removed', () =>
      setState((s2) => ({
        ...s2,
        pricing: {
          ...s2.pricing,
          options: s2.pricing.options.map((o) => {
            if (o.id !== optId) return o;
            const arr = [...o.items];
            arr.splice(Math.min(idx, arr.length), 0, removed);
            return { ...o, items: arr };
          }),
        },
      })));
  };

  /* -------- exports -------- */
  const downloadFile = (name, mime, content) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 400);
  };
  const slugName = (state.cover.title || 'proposal').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'proposal';
  const onImportFile = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(String(r.result));
        setState(normalize({ ...parsed, seenGuide: true }));
        showToast('Proposal imported from JSON');
      } catch {
        showToast('That file is not a valid Proposal Studio JSON');
      }
    };
    r.readAsText(f);
  };

  const loadDemo = () => {
    setState(demoState());
    setConfirmDemo(false);
    showToast('Demo proposal loaded — Harbor Lane Hotels');
  };
  const hasContent = state.sections.length > 0 || state.pricing.options.length > 0 || !!state.cover.title;

  const doReset = () => {
    try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
    setState(normalize({ seenGuide: true }));
    setConfirmReset(false);
    showToast('Studio cleared — fresh paper');
  };

  const cur = state.pricing.currency;
  const TabBtn = ({ id, label, count }) => (
    <button type="button" onClick={() => setTab(id)}
      className={`relative -mb-px inline-flex items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 font-display text-[13px] font-semibold tracking-wide transition-colors sm:px-4 ${
        state.tab === id ? 'border-gold text-ink' : 'border-transparent text-ink-faint hover:text-ink-soft'
      }`}>
      {label}
      {count !== undefined && count > 0 && (
        <span className={`rounded-full px-1.5 text-[10px] font-bold ${state.tab === id ? 'bg-gold-soft text-gold-deep' : 'bg-paper-deep text-ink-faint'}`}>{count}</span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen font-body text-ink">
      {/* ======================= app chrome ======================= */}
      <div className="print:hidden">
        {/* ---------- header ---------- */}
        <header className="border-b border-rule-strong bg-card/70 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Crest className="h-12 w-12 shrink-0 drop-shadow-sm" />
              <div>
                <h1 className="font-display text-[26px] font-black leading-none tracking-tight letterpress">
                  Proposal <span className="foil-text foil-live">Studio</span>
                </h1>
                <p className="mt-1 text-[12.5px] italic text-ink-soft">
                  Hand your client a document that feels like a decision already made.
                </p>
              </div>
            </div>
            <div className="ms-auto flex flex-wrap items-center gap-2">
              {connectors && (
                <span className="inline-flex items-center gap-1 rounded-full border border-gold bg-gold-soft px-2.5 py-1 text-[11px] font-semibold text-gold-deep">
                  <Link2 className="h-3 w-3" aria-hidden /> Console linked
                </span>
              )}
              <Btn onClick={() => (hasContent ? setConfirmDemo(true) : loadDemo())}><Sparkles className="h-3.5 w-3.5" aria-hidden /> Load demo</Btn>
              <Btn tone="seal" onClick={() => setConfirmReset(true)}><RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset</Btn>
              <Btn onClick={() => setGuideOpen(true)}><HelpCircle className="h-3.5 w-3.5" aria-hidden /> How to use</Btn>
              <div className="relative">
                <Btn tone="ink" onClick={() => setExportOpen((v) => !v)} aria-expanded={exportOpen} aria-haspopup="menu">
                  <Download className="h-3.5 w-3.5" aria-hidden /> Export <ChevronDown className="h-3 w-3" aria-hidden />
                </Btn>
                {exportOpen && (
                  <div role="menu" aria-label="Export options"
                    className="anim-rise absolute right-0 z-40 mt-2 w-64 rounded-lg border border-rule-strong bg-card p-1.5 shadow-lift">
                    {[
                      { icon: FileText, label: 'Copy proposal as Markdown', sub: 'Ctrl/Cmd+S', fn: () => copyText(md, 'Proposal Markdown copied') },
                      { icon: FileJson, label: 'Download JSON (full state)', sub: 'backup / move machines', fn: () => downloadFile(`${slugName}.proposal.json`, 'application/json', JSON.stringify(state, null, 2)) },
                      { icon: FileSpreadsheet, label: 'Download pricing CSV', sub: 'line items & totals', fn: () => downloadFile(`${slugName}.pricing.csv`, 'text/csv', pricingCsv(state.pricing)) },
                      { icon: Upload, label: 'Import JSON…', sub: 'restores a saved proposal', fn: () => fileRef.current && fileRef.current.click() },
                      { icon: Printer, label: 'Print / Save as PDF', sub: 'prints the finished proposal', fn: () => window.print() },
                    ].map((it, i) => (
                      <button key={i} type="button" role="menuitem"
                        onClick={() => { setExportOpen(false); it.fn(); }}
                        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-paper-deep">
                        <it.icon className="h-4 w-4 shrink-0 text-gold-deep" aria-hidden />
                        <span className="flex-1 font-semibold">{it.label}</span>
                        <span className="text-[10.5px] italic text-ink-faint">{it.sub}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} aria-label="Import proposal JSON file" />
            </div>
          </div>
          {/* ---------- tabs ---------- */}
          <nav aria-label="Studio areas" className="mx-auto flex max-w-6xl items-end gap-0.5 overflow-x-auto px-4 sm:px-6">
            <TabBtn id="cover" label="Cover Sheet" />
            <TabBtn id="sections" label="Sections" count={state.sections.length} />
            <TabBtn id="pricing" label="Investment" count={state.pricing.options.length} />
            <TabBtn id="preview" label="Preview" />
            <TabBtn id="copilot" label="Claude Copilot" />
          </nav>
        </header>

        {/* ---------- body ---------- */}
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          {state.tab === 'preview' ? (
            <PreviewTab state={state} onPrint={() => window.print()} onCopy={() => copyText(md, 'Proposal Markdown copied')} setTab={setTab} />
          ) : state.tab === 'copilot' ? (
            <CopilotTab state={state} connectors={connectors} copyText={copyText} patch={patch} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_290px]">
              <div className="min-w-0">
                {state.tab === 'cover' && <CoverTab cover={state.cover} patchCover={patchCover} />}
                {state.tab === 'sections' && (
                  <SectionsTab
                    sections={state.sections}
                    addSection={addSection} addBlankSection={addBlankSection}
                    updateSection={updateSection} removeSection={removeSection} moveSection={moveSection}
                    dragFrom={dragFrom} dragOver={dragOver} setDragOver={setDragOver} dropSection={dropSection}
                    loadDemo={() => (hasContent ? setConfirmDemo(true) : loadDemo())}
                  />
                )}
                {state.tab === 'pricing' && (
                  <PricingTab pricing={state.pricing} patchPricing={patchPricing}
                    addOption={addOption} updateOption={updateOption} removeOption={removeOption}
                    addItem={addItem} updateItem={updateItem} removeItem={removeItem} />
                )}
              </div>
              {/* ---------- right rail: the gauge ---------- */}
              <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                <section className="rounded-lg border border-rule-strong bg-card p-4 shadow-lift" aria-label="Send-ready gauge">
                  <h2 className="font-display text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-soft letterpress">The Foil Gauge</h2>
                  <ReadyDial pct={ready.pct} />
                  <p className="-mt-1 text-center font-display text-[10.5px] font-semibold uppercase tracking-[0.2em] text-ink-faint">send-ready</p>
                  <ul className="mt-3 space-y-1.5">
                    {ready.checks.map((c, i) => (
                      <li key={i}>
                        <button type="button" onClick={() => setTab(c.tab)}
                          className="flex w-full items-start gap-2 rounded px-1 py-0.5 text-left text-[12.5px] leading-snug hover:bg-paper-deep/60">
                          {c.ok
                            ? <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-deep" aria-hidden />
                            : <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />}
                          <span className={c.ok ? 'text-ink-soft' : 'text-ink'}>{c.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
                {state.pricing.options.length > 0 && (
                  <section className="rounded-lg border border-rule-strong bg-card p-4 shadow-lift" aria-label="Investment at a glance">
                    <h2 className="mb-2 font-display text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-soft letterpress">Investment at a glance</h2>
                    <OptionBars options={state.pricing.options} taxPct={state.pricing.taxPct} currency={cur} />
                  </section>
                )}
                <section className="rounded-lg border border-rule bg-paper-bright p-4" aria-label="Manuscript statistics">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12px] italic text-ink-soft">Manuscript</span>
                    <span className="font-display text-[13px] font-semibold">{totalWords.toLocaleString()} words</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-[12px] italic text-ink-soft">Reading time</span>
                    <span className="font-display text-[13px] font-semibold">{Math.max(1, Math.round(totalWords / 200))} min</span>
                  </div>
                  <button type="button" onClick={() => setTab('preview')}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-rule bg-card px-3 py-1.5 text-[12.5px] font-semibold hover:border-gold hover:text-gold-deep">
                    <Eye className="h-3.5 w-3.5" aria-hidden /> Open the proof
                  </button>
                </section>
              </aside>
            </div>
          )}
        </main>

        <footer className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
          <Flourish />
          <p className="mt-2 text-center text-[11px] italic text-ink-faint">
            Set in Fraunces & Lora · Your proposal lives in this browser only — export JSON to keep a copy in the drawer.
          </p>
        </footer>
      </div>

      {/* ======================= print document ======================= */}
      <div className="hidden print:block">
        <ProposalDocument state={state} />
      </div>

      {/* ======================= modals & toast ======================= */}
      <GuideModal open={guideOpen} onClose={closeGuide} />
      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} label="Confirm reset">
        <h2 className="font-display text-xl font-black">Clear the studio?</h2>
        <p className="mt-2 text-[14px] text-ink-soft">
          This tears up the current proposal — cover, sections, and pricing — and cannot be undone.
          Consider <strong>Export → Download JSON</strong> first.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Btn onClick={() => setConfirmReset(false)}>Keep working</Btn>
          <Btn tone="seal" onClick={doReset} className="border-seal bg-seal text-paper-bright hover:bg-seal"><Trash2 className="h-3.5 w-3.5" aria-hidden /> Tear it up</Btn>
        </div>
      </Modal>
      <Modal open={confirmDemo} onClose={() => setConfirmDemo(false)} label="Confirm demo load">
        <h2 className="font-display text-xl font-black">Load the demo proposal?</h2>
        <p className="mt-2 text-[14px] text-ink-soft">
          The Harbor Lane Hotels demo will replace what is currently on your desk. Export JSON first if you want to keep it.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Btn onClick={() => setConfirmDemo(false)}>Cancel</Btn>
          <Btn tone="gold" onClick={loadDemo}><Sparkles className="h-3.5 w-3.5" aria-hidden /> Load demo</Btn>
        </div>
      </Modal>

      {toast && (
        <div className="anim-toast fixed bottom-5 left-1/2 z-[80] -translate-x-1/2" role="status" aria-live="polite">
          <div className="flex items-center gap-3 rounded-lg border border-ink-deep bg-ink px-4 py-2.5 text-[13px] font-semibold text-paper-bright shadow-sheet">
            <Stamp className="h-4 w-4 text-gold-bright" aria-hidden />
            {toast.text}
            {toast.onUndo && (
              <button type="button"
                onClick={() => { toast.onUndo(); setToast(null); }}
                className="rounded border border-gold-bright px-2 py-0.5 text-[12px] font-bold text-gold-bright hover:bg-gold-deep/30">
                Undo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================ cover tab =============================== */

function CoverTab({ cover, patchCover }) {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_300px]">
      <section className="rounded-lg border border-rule-strong bg-card p-5 shadow-lift" aria-label="Cover sheet fields">
        <h2 className="font-display text-lg font-black">The Cover Sheet</h2>
        <p className="mt-0.5 text-[12.5px] italic text-ink-soft">First impression, set in type. Every field lands on the printed cover.</p>
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Proposal title">
              <input className={inputCls} value={cover.title} onChange={(e) => patchCover({ title: e.target.value })}
                placeholder="A Brand Worth the Stay" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Subtitle" hint="One line on what this proposal delivers, for whom.">
              <input className={inputCls} value={cover.subtitle} onChange={(e) => patchCover({ subtitle: e.target.value })}
                placeholder="Brand renewal & booking experience for…" />
            </Field>
          </div>
          <Field label="Client contact">
            <input className={inputCls} value={cover.clientName} onChange={(e) => patchCover({ clientName: e.target.value })} placeholder="Eleanor Vance, Managing Director" />
          </Field>
          <Field label="Client company">
            <input className={inputCls} value={cover.clientCompany} onChange={(e) => patchCover({ clientCompany: e.target.value })} placeholder="Harbor Lane Hotels" />
          </Field>
          <Field label="Prepared by">
            <input className={inputCls} value={cover.preparedBy} onChange={(e) => patchCover({ preparedBy: e.target.value })} placeholder="Your name, role" />
          </Field>
          <Field label="Your studio / firm">
            <input className={inputCls} value={cover.company} onChange={(e) => patchCover({ company: e.target.value })} placeholder="Marlowe & Grange" />
          </Field>
          <Field label="Contact email">
            <input className={inputCls} value={cover.email} onChange={(e) => patchCover({ email: e.target.value })} placeholder="studio@yourfirm.example" />
          </Field>
          <Field label="Reference no.">
            <input className={inputCls} value={cover.refNo} onChange={(e) => patchCover({ refNo: e.target.value })} placeholder="PS-2026-014" />
          </Field>
          <Field label="Proposal date">
            <input type="date" className={inputCls} value={cover.date} onChange={(e) => patchCover({ date: e.target.value })} />
          </Field>
          <Field label="Valid until" hint="A deadline is a courtesy: it lets the client decide.">
            <input type="date" className={inputCls} value={cover.validUntil} onChange={(e) => patchCover({ validUntil: e.target.value })} />
          </Field>
          <Field label="Seal monogram" hint="Up to three letters, pressed into the wax.">
            <input className={inputCls} value={cover.monogram} maxLength={3}
              onChange={(e) => patchCover({ monogram: e.target.value.toUpperCase().slice(0, 3) })} placeholder="MG" />
          </Field>
          <Field label="Studio tagline">
            <input className={inputCls} value={cover.tagline} onChange={(e) => patchCover({ tagline: e.target.value })} placeholder="Brand & digital, set by hand" />
          </Field>
        </div>
      </section>
      {/* live miniature */}
      <aside aria-label="Cover preview" className="md:sticky md:top-4 md:self-start">
        <div className="rounded-md border border-rule-strong bg-card p-5 text-center shadow-sheet">
          <WaxSeal monogram={cover.monogram} className="mx-auto h-14 w-14" />
          <p className="mt-3 font-display text-[9px] font-semibold uppercase tracking-[0.3em] text-ink-faint">{cover.refNo || 'a proposal'}</p>
          <Flourish className="my-2" />
          <p className="font-display text-[17px] font-black leading-tight">{cover.title || 'Untitled proposal'}</p>
          {cover.subtitle && <p className="mt-1 text-[11px] italic text-ink-soft">{cover.subtitle}</p>}
          <Flourish className="my-2" />
          <div className="mt-2 grid grid-cols-2 gap-2 text-left text-[10px]">
            <div>
              <p className="font-display font-semibold uppercase tracking-[0.18em] text-ink-faint">For</p>
              <p className="mt-0.5 leading-snug">{cover.clientCompany || '—'}</p>
            </div>
            <div>
              <p className="font-display font-semibold uppercase tracking-[0.18em] text-ink-faint">By</p>
              <p className="mt-0.5 leading-snug">{cover.company || '—'}</p>
            </div>
            <div>
              <p className="font-display font-semibold uppercase tracking-[0.18em] text-ink-faint">Dated</p>
              <p className="mt-0.5">{fmtDate(cover.date)}</p>
            </div>
            <div>
              <p className="font-display font-semibold uppercase tracking-[0.18em] text-ink-faint">Valid until</p>
              <p className="mt-0.5">{fmtDate(cover.validUntil)}</p>
            </div>
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] italic text-ink-faint">Miniature of the printed cover</p>
      </aside>
    </div>
  );
}

/* =========================== sections tab ============================= */

function SectionsTab({
  sections, addSection, addBlankSection, updateSection, removeSection, moveSection,
  dragFrom, dragOver, setDragOver, dropSection, loadDemo,
}) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const filtered = TEMPLATES.filter((t) => {
    if (cat !== 'All' && t.cat !== cat) return false;
    const needle = q.trim().toLowerCase();
    return !needle || t.title.toLowerCase().includes(needle) || t.blurb.toLowerCase().includes(needle);
  });
  const countByKind = sections.reduce((m, s) => ((m[s.kind] = (m[s.kind] || 0) + 1), m), {});

  return (
    <div className="grid gap-6 md:grid-cols-[270px_1fr]">
      {/* drawer */}
      <aside className="md:sticky md:top-4 md:self-start" aria-label="Section drawer">
        <div className="rounded-lg border border-rule-strong bg-card shadow-lift">
          <div className="border-b border-rule px-4 py-3">
            <h2 className="flex items-center gap-2 font-display text-[13px] font-black uppercase tracking-[0.14em] letterpress">
              <ScrollText className="h-4 w-4 text-gold-deep" aria-hidden /> The Stationery Drawer
            </h2>
            <p className="mt-0.5 text-[11.5px] italic text-ink-soft">Eleven set pieces. Pull what the argument needs.</p>
          </div>
          <div className="space-y-2 px-4 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-faint" aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the drawer…"
                className={`${inputCls} py-1.5 pl-8 text-[13px]`} aria-label="Search section templates" />
            </div>
            <div className="flex flex-wrap gap-1">
              {['All', ...CATS].map((c) => (
                <button key={c} type="button" onClick={() => setCat(c)}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                    cat === c ? 'border-gold-deep bg-gold-soft text-gold-deep' : 'border-rule bg-paper-bright text-ink-faint hover:text-ink'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <ul className="max-h-[46vh] overflow-y-auto border-t border-rule">
            {filtered.map((t) => (
              <li key={t.kind} className="border-b border-rule/60 last:border-0">
                <div className="group flex items-start gap-2 px-4 py-2.5 hover:bg-paper-deep/50">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-display text-[13px] font-bold leading-tight">
                      {t.title}
                      {countByKind[t.kind] > 0 && <span className="rounded-full bg-gold-soft px-1.5 text-[9.5px] font-bold text-gold-deep">{countByKind[t.kind]} set</span>}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-ink-soft">{t.blurb}</p>
                  </div>
                  <IconBtn label={`Add section: ${t.title}`} onClick={() => addSection(t)} className="mt-0.5 shrink-0">
                    <Plus className="h-4 w-4" aria-hidden />
                  </IconBtn>
                </div>
              </li>
            ))}
            {filtered.length === 0 && <li className="px-4 py-4 text-[12px] italic text-ink-faint">Nothing in the drawer matches.</li>}
          </ul>
          <div className="border-t border-rule px-4 py-3">
            <button type="button" onClick={addBlankSection}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-rule-strong px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft hover:border-gold hover:text-gold-deep">
              <PenLine className="h-3.5 w-3.5" aria-hidden /> Blank sheet
            </button>
          </div>
        </div>
      </aside>

      {/* manuscript */}
      <section className="min-w-0" aria-label="Proposal sections">
        {sections.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed of border-rule-strong bg-paper-bright/60 px-6 py-14 text-center">
            <Feather className="mx-auto h-8 w-8 text-gold-deep" aria-hidden />
            <h2 className="mt-3 font-display text-xl font-black">The paper is blank</h2>
            <p className="mx-auto mt-2 max-w-md text-[13.5px] text-ink-soft">
              A winning proposal is an argument in order: their problem, your approach, the proof, the price, the pen.
              Pull sections from the drawer on the left — start with the <em>Opening Letter</em> — or study a finished one first.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Btn tone="gold" onClick={() => addSection(TEMPLATES[0])}><Plus className="h-3.5 w-3.5" aria-hidden /> Start with the letter</Btn>
              <Btn onClick={loadDemo}><Sparkles className="h-3.5 w-3.5" aria-hidden /> See the demo</Btn>
            </div>
          </div>
        ) : (
          <ol className="space-y-4">
            {sections.map((sec, idx) => {
              const words = wordCount(sec.body);
              const blanks = blanksIn(sec.body);
              return (
                <li key={sec.id}
                  onDragOver={(e) => { e.preventDefault(); if (dragOver !== idx) setDragOver(idx); }}
                  onDrop={(e) => { e.preventDefault(); dropSection(idx); }}
                  className={`relative rounded-lg border bg-card shadow-lift transition-shadow ${
                    dragOver === idx && dragFrom.current !== null ? 'border-gold shadow-sheet' : 'border-rule-strong'
                  } ${sec.included ? '' : 'opacity-60'}`}>
                  {dragOver === idx && dragFrom.current !== null && (
                    <span aria-hidden className="absolute -top-2.5 left-4 right-4 block h-0.5 rounded bg-gold" />
                  )}
                  <div className="flex items-center gap-2 border-b border-rule px-3 py-2">
                    <span draggable
                      onDragStart={(e) => { dragFrom.current = idx; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(idx)); } catch { /* IE-style */ } }}
                      onDragEnd={() => { dragFrom.current = null; setDragOver(null); }}
                      className="cursor-grab rounded p-1 text-ink-faint hover:bg-paper-deep hover:text-ink active:cursor-grabbing"
                      title="Drag to reorder" aria-label={`Drag section ${sec.title}`}>
                      <GripVertical className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="font-display text-[13px] font-black text-gold-deep">{roman(idx)}.</span>
                    <input value={sec.title} onChange={(e) => updateSection(sec.id, { title: e.target.value })}
                      aria-label="Section title"
                      className="min-w-0 flex-1 bg-transparent font-display text-[15.5px] font-bold outline-none placeholder:text-ink-faint focus:text-gold-deep" placeholder="Section title" />
                    {sec.kind !== 'custom' && (
                      <span className="hidden rounded-full border border-rule px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint sm:inline">{TEMPLATE_BY_KIND[sec.kind]?.cat}</span>
                    )}
                    <IconBtn label={sec.included ? `Exclude "${sec.title}" from the proposal` : `Include "${sec.title}" in the proposal`}
                      onClick={() => updateSection(sec.id, { included: !sec.included })}>
                      {sec.included ? <Eye className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}
                    </IconBtn>
                    <IconBtn label={`Move "${sec.title}" up`} onClick={() => moveSection(idx, -1)}><ArrowUp className="h-4 w-4" aria-hidden /></IconBtn>
                    <IconBtn label={`Move "${sec.title}" down`} onClick={() => moveSection(idx, 1)}><ArrowDown className="h-4 w-4" aria-hidden /></IconBtn>
                    <IconBtn label={`Delete "${sec.title}"`} onClick={() => removeSection(sec.id)} className="hover:border-seal hover:text-seal">
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </IconBtn>
                  </div>
                  <textarea value={sec.body} onChange={(e) => updateSection(sec.id, { body: e.target.value })}
                    aria-label={`Body of section ${sec.title}`}
                    rows={clamp(Math.ceil(str(sec.body).length / 88) + 2, 5, 18)}
                    className="w-full resize-y bg-transparent px-4 py-3 text-[14px] leading-relaxed outline-none placeholder:italic"
                    placeholder="Set the body copy here. Paragraphs separated by a blank line; lines starting with a dash become a list." />
                  <div className="flex items-center gap-3 border-t border-rule/60 px-4 py-1.5 text-[11px] text-ink-faint">
                    <span>{words} words</span>
                    {blanks > 0 && (
                      <span className="inline-flex items-center gap-1 font-semibold text-seal">
                        <PenLine className="h-3 w-3" aria-hidden /> {blanks} [blank{blanks > 1 ? 's' : ''}] to fill
                      </span>
                    )}
                    {!sec.included && <span className="italic">excluded from the proof</span>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

/* ============================ pricing tab ============================= */

function PricingTab({ pricing, patchPricing, addOption, updateOption, removeOption, addItem, updateItem, removeItem }) {
  const cur = pricing.currency;
  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-rule-strong bg-card p-4 shadow-lift" aria-label="Pricing settings">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <h2 className="font-display text-lg font-black">The Investment</h2>
            <p className="text-[12.5px] italic text-ink-soft">Two editions beat one price. Give the client a choice between yeses.</p>
          </div>
          <div className="ms-auto flex flex-wrap items-end gap-3">
            <Field label="Currency">
              <select className={`${inputCls} py-1.5`} value={cur} onChange={(e) => patchPricing({ currency: e.target.value })} aria-label="Currency">
                {CURRENCIES.map(([k, name]) => <option key={k} value={k}>{k} — {name}</option>)}
              </select>
            </Field>
            <Field label="Tax label">
              <input className={`${inputCls} w-24 py-1.5`} value={pricing.taxLabel} onChange={(e) => patchPricing({ taxLabel: e.target.value })} />
            </Field>
            <Field label="Tax %">
              <input type="number" min="0" max="60" step="0.1" className={`${inputCls} w-20 py-1.5`} value={pricing.taxPct}
                onChange={(e) => patchPricing({ taxPct: clamp(num(e.target.value, 0), 0, 60) })} />
            </Field>
          </div>
        </div>
        <Field label="Note beneath the tables" hint="Shown under the pricing in the finished proposal.">
          <textarea rows={2} className={`${inputCls} mt-1`} value={pricing.note} onChange={(e) => patchPricing({ note: e.target.value })}
            placeholder="Both editions include… Fees exclude third-party costs…" />
        </Field>
      </section>

      {pricing.options.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-rule-strong bg-paper-bright/60 px-6 py-12 text-center">
          <Landmark className="mx-auto h-8 w-8 text-gold-deep" aria-hidden />
          <h3 className="mt-3 font-display text-lg font-black">No price on the table yet</h3>
          <p className="mx-auto mt-2 max-w-md text-[13.5px] text-ink-soft">
            Name your options like editions, not tiers — <em>The Crest</em>, <em>The Foil</em> — and let the line items carry the value.
            One recommended option converts best.
          </p>
          <Btn tone="gold" className="mt-4" onClick={addOption}><Plus className="h-3.5 w-3.5" aria-hidden /> Set the first edition</Btn>
        </div>
      )}

      {pricing.options.map((opt, oi) => {
        const m = optionMath(opt, pricing.taxPct);
        return (
          <section key={opt.id} className={`overflow-hidden rounded-lg border bg-card shadow-lift ${opt.recommended ? 'border-gold-deep' : 'border-rule-strong'}`}
            aria-label={`Pricing option ${opt.name}`}>
            {opt.recommended && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-gold-deep via-gold to-gold-deep px-4 py-1 text-[10.5px] font-bold uppercase tracking-[0.2em] text-paper-bright">
                <Star className="h-3 w-3 fill-current" aria-hidden /> Recommended edition
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 border-b border-rule px-4 py-3">
              <span className="font-display text-[14px] font-black text-gold-deep">Option {roman(oi)}</span>
              <input value={opt.name} onChange={(e) => updateOption(opt.id, { name: e.target.value })}
                aria-label="Option name" placeholder="The Crest Edition"
                className="min-w-0 flex-1 bg-transparent font-display text-[16px] font-bold outline-none placeholder:text-ink-faint" />
              <IconBtn label={opt.recommended ? `Remove recommendation from ${opt.name}` : `Mark ${opt.name} as recommended`}
                onClick={() => updateOption(opt.id, { recommended: !opt.recommended })}
                className={opt.recommended ? 'border-gold-deep text-gold-deep' : ''}>
                <Star className={`h-4 w-4 ${opt.recommended ? 'fill-current' : ''}`} aria-hidden />
              </IconBtn>
              <IconBtn label={`Delete option ${opt.name}`} onClick={() => removeOption(opt.id)} className="hover:border-seal hover:text-seal">
                <Trash2 className="h-4 w-4" aria-hidden />
              </IconBtn>
            </div>
            <div className="px-4 pt-2">
              <input value={opt.tagline} onChange={(e) => updateOption(opt.id, { tagline: e.target.value })}
                aria-label="Option tagline" placeholder="One italic line on who this edition is for…"
                className="w-full bg-transparent text-[13px] italic text-ink-soft outline-none placeholder:text-ink-faint" />
            </div>
            {/* line items */}
            <div className="overflow-x-auto px-4 pb-1 pt-2">
              <table className="w-full min-w-[560px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-rule-strong text-left font-display text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">
                    <th className="py-1.5 pr-2 font-semibold">Item</th>
                    <th className="py-1.5 pr-2 font-semibold">Detail</th>
                    <th className="w-16 py-1.5 pr-2 text-right font-semibold">Qty</th>
                    <th className="w-28 py-1.5 pr-2 text-right font-semibold">Rate</th>
                    <th className="w-28 py-1.5 pr-2 text-right font-semibold">Amount</th>
                    <th className="w-9 py-1.5" aria-label="Row actions" />
                  </tr>
                </thead>
                <tbody>
                  {opt.items.map((it) => (
                    <tr key={it.id} className="border-b border-rule/50 align-top">
                      <td className="py-1 pr-2">
                        <input value={it.desc} onChange={(e) => updateItem(opt.id, it.id, { desc: e.target.value })}
                          aria-label="Line item name" placeholder="Deliverable"
                          className="w-full bg-transparent py-1 font-semibold outline-none placeholder:font-normal placeholder:italic placeholder:text-ink-faint" />
                      </td>
                      <td className="py-1 pr-2">
                        <input value={it.detail} onChange={(e) => updateItem(opt.id, it.id, { detail: e.target.value })}
                          aria-label="Line item detail" placeholder="what exactly is included"
                          className="w-full bg-transparent py-1 italic text-ink-soft outline-none placeholder:text-ink-faint" />
                      </td>
                      <td className="py-1 pr-2">
                        <input type="number" min="0" step="any" value={it.qty}
                          onChange={(e) => updateItem(opt.id, it.id, { qty: clamp(num(e.target.value, 0), 0, 999999) })}
                          aria-label="Quantity" className="w-full bg-transparent py-1 text-right tabular-nums outline-none" />
                      </td>
                      <td className="py-1 pr-2">
                        <input type="number" min="0" step="any" value={it.rate}
                          onChange={(e) => updateItem(opt.id, it.id, { rate: clamp(num(e.target.value, 0), 0, 99999999) })}
                          aria-label="Rate" className="w-full bg-transparent py-1 text-right tabular-nums outline-none" />
                      </td>
                      <td className="py-1 pr-2 text-right font-display font-semibold tabular-nums">{fmtMoney(num(it.qty) * num(it.rate), cur)}</td>
                      <td className="py-1 text-right">
                        <button type="button" aria-label={`Remove line item ${it.desc || 'unnamed'}`} onClick={() => removeItem(opt.id, it.id)}
                          className="rounded p-1 text-ink-faint hover:bg-seal-soft hover:text-seal">
                          <X className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-3 px-4 pb-4 pt-1">
              <div className="space-y-2">
                <button type="button" onClick={() => addItem(opt.id)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-rule-strong px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft hover:border-gold hover:text-gold-deep">
                  <Plus className="h-3.5 w-3.5" aria-hidden /> Line item
                </button>
                <label className="flex items-center gap-2 text-[12px] text-ink-soft">
                  <span className="font-display text-[10.5px] font-semibold uppercase tracking-[0.14em]">Discount %</span>
                  <input type="number" min="0" max="100" step="0.5" value={opt.discountPct}
                    onChange={(e) => updateOption(opt.id, { discountPct: clamp(num(e.target.value, 0), 0, 100) })}
                    aria-label={`Discount percent for ${opt.name}`}
                    className="w-20 rounded-md border border-rule bg-paper-bright px-2 py-1 text-right tabular-nums outline-none focus:border-gold" />
                </label>
              </div>
              <dl className="min-w-[220px] space-y-0.5 text-right text-[13px]">
                <div className="flex justify-between gap-6"><dt className="italic text-ink-soft">Subtotal</dt><dd className="tabular-nums">{fmtMoney(m.subtotal, cur)}</dd></div>
                {m.discount > 0 && <div className="flex justify-between gap-6 text-seal"><dt className="italic">Discount ({opt.discountPct}%)</dt><dd className="tabular-nums">−{fmtMoney(m.discount, cur)}</dd></div>}
                {m.tax > 0 && <div className="flex justify-between gap-6"><dt className="italic text-ink-soft">{pricing.taxLabel} ({pricing.taxPct}%)</dt><dd className="tabular-nums">{fmtMoney(m.tax, cur)}</dd></div>}
                <div className="flex justify-between gap-6 border-t border-rule-strong pt-1 font-display text-[16px] font-black">
                  <dt>Total</dt><dd className="tabular-nums text-gold-deep">{fmtMoney(m.total, cur)}</dd>
                </div>
              </dl>
            </div>
          </section>
        );
      })}

      {pricing.options.length > 0 && (
        <div className="flex justify-center">
          <Btn onClick={addOption}><Plus className="h-3.5 w-3.5" aria-hidden /> Another edition</Btn>
        </div>
      )}
    </div>
  );
}

/* ============================ preview tab ============================= */

function BodyCopy({ text, className = '' }) {
  const blocks = useMemo(() => {
    const out = [];
    for (const chunk of str(text).split(/\n{2,}/)) {
      const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
      if (!lines.length) continue;
      if (lines.every((l) => /^[-•]\s+/.test(l))) out.push({ t: 'ul', items: lines.map((l) => l.replace(/^[-•]\s+/, '')) });
      else out.push({ t: 'p', text: lines.join(' ') });
    }
    return out;
  }, [text]);
  return (
    <div className={`space-y-3 text-[13.5px] leading-[1.75] ${className}`}>
      {blocks.map((b, i) =>
        b.t === 'ul' ? (
          <ul key={i} className="space-y-1.5 pl-1">
            {b.items.map((it, j) => (
              <li key={j} className="flex gap-2.5">
                <span aria-hidden className="mt-[0.62em] block h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>{b.text}</p>
        ),
      )}
    </div>
  );
}

function ProposalDocument({ state }) {
  const { cover, sections, pricing } = state;
  const inc = sections.filter((s) => s.included);
  const cur = pricing.currency;
  return (
    <div className="space-y-6">
      {/* cover sheet */}
      <div className="print-sheet sheet-break relative mx-auto max-w-[760px] rounded-sm border border-rule-strong bg-card px-8 py-14 text-center shadow-sheet sm:px-14 sm:py-20">
        <span aria-hidden className="pointer-events-none absolute inset-3 rounded-sm border border-rule" />
        <span aria-hidden className="pointer-events-none absolute inset-4 rounded-sm border border-gold-soft" />
        <div className="relative">
          <WaxSeal monogram={cover.monogram} className="mx-auto h-20 w-20 drop-shadow" />
          <p className="mt-6 font-display text-[10px] font-semibold uppercase tracking-[0.34em] text-ink-faint">
            {cover.refNo ? `A proposal · ${cover.refNo}` : 'A proposal'}
          </p>
          <Flourish className="mx-auto my-4 max-w-xs" />
          <h1 className="font-display text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl">
            {cover.title || 'Untitled proposal'}
          </h1>
          {cover.subtitle && <p className="mx-auto mt-4 max-w-md text-[15px] italic leading-relaxed text-ink-soft">{cover.subtitle}</p>}
          <Flourish className="mx-auto my-5 max-w-xs" />
          <div className="mx-auto mt-8 grid max-w-md grid-cols-1 gap-6 text-left sm:grid-cols-2">
            <div>
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.26em] text-gold-deep">Prepared for</p>
              <p className="mt-1.5 text-[14px] leading-snug">{cover.clientName || '—'}</p>
              <p className="font-display text-[15px] font-bold leading-snug">{cover.clientCompany}</p>
            </div>
            <div>
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.26em] text-gold-deep">Prepared by</p>
              <p className="mt-1.5 text-[14px] leading-snug">{cover.preparedBy || '—'}</p>
              <p className="font-display text-[15px] font-bold leading-snug">{cover.company}</p>
            </div>
            <div>
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.26em] text-gold-deep">Dated</p>
              <p className="mt-1.5 text-[14px]">{fmtDate(cover.date)}</p>
            </div>
            <div>
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.26em] text-gold-deep">Valid until</p>
              <p className="mt-1.5 text-[14px]">{fmtDate(cover.validUntil)}</p>
            </div>
          </div>
          {(cover.tagline || cover.email) && (
            <p className="mt-12 text-[11.5px] italic text-ink-faint">
              {cover.tagline}{cover.tagline && cover.email ? ' · ' : ''}{cover.email}
            </p>
          )}
        </div>
      </div>

      {/* manuscript */}
      <div className="print-sheet mx-auto max-w-[760px] rounded-sm border border-rule-strong bg-card px-7 py-10 shadow-sheet sm:px-14 sm:py-14">
        {inc.length === 0 && (
          <p className="text-center text-[13px] italic text-ink-faint">No sections included yet — set some in the Sections room.</p>
        )}
        {inc.map((s, i) => (
          <section key={s.id} className={`avoid-break ${i > 0 ? 'mt-10' : ''}`}>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-[13px] font-black text-gold-deep">{roman(i)}.</span>
              <h2 className="font-display text-[22px] font-black tracking-tight">{s.title}</h2>
            </div>
            <Flourish className="mb-4 mt-2" />
            <BodyCopy text={s.body} />
          </section>
        ))}

        {pricing.options.length > 0 && (
          <section className="avoid-break mt-10">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-[13px] font-black text-gold-deep">{roman(inc.length)}.</span>
              <h2 className="font-display text-[22px] font-black tracking-tight">The Investment</h2>
            </div>
            <Flourish className="mb-5 mt-2" />
            <div className="space-y-7">
              {pricing.options.map((opt, oi) => {
                const m = optionMath(opt, pricing.taxPct);
                return (
                  <div key={opt.id} className={`avoid-break rounded-sm border p-5 ${opt.recommended ? 'border-gold bg-gold-soft/25' : 'border-rule'}`}>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="font-display text-[17px] font-black">Option {roman(oi)} — {opt.name}</h3>
                      {opt.recommended && (
                        <span className="rounded-full border border-gold-deep px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-[0.18em] text-gold-deep">Recommended</span>
                      )}
                    </div>
                    {opt.tagline && <p className="mt-0.5 text-[12.5px] italic text-ink-soft">{opt.tagline}</p>}
                    <table className="mt-3 w-full border-collapse text-[12.5px]">
                      <thead>
                        <tr className="border-b border-rule-strong text-left font-display text-[9.5px] uppercase tracking-[0.16em] text-ink-faint">
                          <th className="py-1 pr-2 font-semibold">Item</th>
                          <th className="hidden py-1 pr-2 font-semibold sm:table-cell">Detail</th>
                          <th className="py-1 pr-2 text-right font-semibold">Qty</th>
                          <th className="py-1 pr-2 text-right font-semibold">Rate</th>
                          <th className="py-1 text-right font-semibold">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {opt.items.map((it) => (
                          <tr key={it.id} className="border-b border-rule/50 align-top">
                            <td className="py-1.5 pr-2 font-semibold">{it.desc || '—'}</td>
                            <td className="hidden py-1.5 pr-2 italic text-ink-soft sm:table-cell">{it.detail}</td>
                            <td className="py-1.5 pr-2 text-right tabular-nums">{it.qty}</td>
                            <td className="py-1.5 pr-2 text-right tabular-nums">{fmtMoney(it.rate, cur)}</td>
                            <td className="py-1.5 text-right font-semibold tabular-nums">{fmtMoney(num(it.qty) * num(it.rate), cur)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <dl className="ms-auto mt-2 max-w-[240px] space-y-0.5 text-right text-[12.5px]">
                      <div className="flex justify-between gap-6"><dt className="italic text-ink-soft">Subtotal</dt><dd className="tabular-nums">{fmtMoney(m.subtotal, cur)}</dd></div>
                      {m.discount > 0 && <div className="flex justify-between gap-6 text-seal"><dt className="italic">Discount ({opt.discountPct}%)</dt><dd className="tabular-nums">−{fmtMoney(m.discount, cur)}</dd></div>}
                      {m.tax > 0 && <div className="flex justify-between gap-6"><dt className="italic text-ink-soft">{pricing.taxLabel} ({pricing.taxPct}%)</dt><dd className="tabular-nums">{fmtMoney(m.tax, cur)}</dd></div>}
                      <div className="flex justify-between gap-6 border-t border-rule-strong pt-1 font-display text-[15px] font-black">
                        <dt>Total</dt><dd className="tabular-nums text-gold-deep">{fmtMoney(m.total, cur)}</dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
            {pricing.note && <p className="mt-4 border-l-2 border-gold pl-3 text-[12px] italic leading-relaxed text-ink-soft">{pricing.note}</p>}
          </section>
        )}

        <div className="mt-12">
          <Flourish />
          <p className="mt-3 text-center text-[11px] italic text-ink-faint">
            {cover.company || 'Prepared with care'}{cover.email ? ` · ${cover.email}` : ''} · {fmtDate(cover.date)}
          </p>
        </div>
      </div>
    </div>
  );
}

function PreviewTab({ state, onPrint, onCopy, setTab }) {
  const empty = state.sections.filter((s) => s.included).length === 0 && state.pricing.options.length === 0 && !state.cover.title;
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-black">The Proof</h2>
          <p className="text-[12.5px] italic text-ink-soft">Exactly what prints. Use Print / Save as PDF for the finished piece.</p>
        </div>
        <div className="flex gap-2">
          <Btn onClick={onCopy}><FileText className="h-3.5 w-3.5" aria-hidden /> Copy Markdown</Btn>
          <Btn tone="ink" onClick={onPrint}><Printer className="h-3.5 w-3.5" aria-hidden /> Print / PDF</Btn>
        </div>
      </div>
      {empty ? (
        <div className="rounded-lg border-2 border-dashed border-rule-strong bg-paper-bright/60 px-6 py-14 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-gold-deep" aria-hidden />
          <h3 className="mt-3 font-display text-lg font-black">Nothing on the press yet</h3>
          <p className="mx-auto mt-2 max-w-md text-[13.5px] text-ink-soft">
            Fill the cover sheet, set a few sections, and price at least one edition — then come back to see the finished piece.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Btn onClick={() => setTab('cover')}>Cover sheet</Btn>
            <Btn onClick={() => setTab('sections')}>Sections</Btn>
          </div>
        </div>
      ) : (
        <ProposalDocument state={state} />
      )}
    </div>
  );
}

/* ============================ copilot tab ============================= */

function CopilotTab({ state, connectors, copyText, patch }) {
  const [notes, setNotes] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [preview, setPreview] = useState(null); // {title, text}

  const targetId = sectionId || (state.sections[0] && state.sections[0].id) || '';

  const actions = [
    {
      icon: Feather,
      title: 'Draft a section from rough notes',
      desc: 'Pick a section, jot bullets below, and Claude writes finished body copy in a working voice — holes marked in [brackets].',
      needsSection: true,
      build: () => promptDraftSection(state, targetId, notes, connectors),
      disabled: state.sections.length === 0,
      disabledHint: 'Add at least one section first.',
    },
    {
      icon: Scale,
      title: 'Tighten the scope language',
      desc: 'Audits your scope, exclusions, timeline and terms for elastic phrases a client can stretch — then rewrites them with countable nouns.',
      build: () => promptTightenScope(state, connectors),
      disabled: false,
    },
    {
      icon: ShieldQuestion,
      title: 'Objection-handling FAQ',
      desc: 'Reads the full proposal as the buying committee will and drafts the 8–10 objections it will draw, each with an answer in your voice.',
      build: () => promptObjectionFaq(state, connectors),
      disabled: false,
    },
    {
      icon: MessageCircleQuestion,
      title: 'Red-team it as the client',
      desc: 'Claude plays the skeptical CFO with twelve minutes and a red pen: verdict, section scores, the weakest promise, and what to cut.',
      build: () => promptRedTeam(state, connectors),
      disabled: false,
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <section className="rounded-lg border border-rule-strong bg-card p-5 shadow-lift">
          <h2 className="flex items-center gap-2 font-display text-lg font-black">
            <Sparkles className="h-4.5 w-4.5 text-gold-deep" aria-hidden /> The Copyist's Desk
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            Each action below sets a complete prompt with this proposal folded in — cover, sections, and pricing.
            Copy it, paste it into <strong>claude.ai</strong>, and bring the answer back.
            Works with the standard $20 Claude subscription; no API key, nothing leaves this page until you paste.
          </p>
          {connectors && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold bg-gold-soft px-2.5 py-1 text-[11px] font-semibold text-gold-deep">
              <Link2 className="h-3 w-3" aria-hidden /> Console context will be woven into every prompt
            </p>
          )}
        </section>

        {actions.map((a, i) => (
          <section key={i} className="rounded-lg border border-rule-strong bg-card p-4 shadow-lift">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gold-soft bg-gold-soft/40 text-gold-deep deboss">
                <a.icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-[15px] font-bold">{a.title}</h3>
                <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">{a.desc}</p>
                {a.needsSection && !a.disabled && (
                  <div className="mt-3 space-y-2">
                    <select value={targetId} onChange={(e) => setSectionId(e.target.value)}
                      aria-label="Section to draft" className={`${inputCls} py-1.5 text-[13px]`}>
                      {state.sections.map((s, si) => <option key={s.id} value={s.id}>{roman(si)}. {s.title}</option>)}
                    </select>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                      aria-label="Rough notes for the section"
                      className={`${inputCls} text-[13px]`}
                      placeholder={'Rough notes, one per line:\n- what they told us on the call\n- the number that matters\n- the promise we can keep'} />
                  </div>
                )}
                {a.disabled && <p className="mt-2 text-[12px] italic text-seal">{a.disabledHint}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Btn tone="gold" onClick={() => !a.disabled && copyText(a.build(), 'Prompt copied — paste into claude.ai')}
                    className={a.disabled ? 'pointer-events-none opacity-40' : ''} aria-disabled={a.disabled}>
                    <Copy className="h-3.5 w-3.5" aria-hidden /> Copy prompt
                  </Btn>
                  <Btn onClick={() => !a.disabled && setPreview({ title: a.title, text: a.build() })}
                    className={a.disabled ? 'pointer-events-none opacity-40' : ''} aria-disabled={a.disabled}>
                    <Eye className="h-3.5 w-3.5" aria-hidden /> Read it first
                  </Btn>
                  <span className="text-[11px] italic text-ink-faint">Paste into claude.ai — standard Claude subscription is enough.</span>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        <section className="rounded-lg border border-rule-strong bg-card p-4 shadow-lift" aria-label="Claude reply ledger">
          <h3 className="flex items-center gap-2 font-display text-[13px] font-black uppercase tracking-[0.14em] letterpress">
            <ClipboardPaste className="h-4 w-4 text-gold-deep" aria-hidden /> The Reply Ledger
          </h3>
          <p className="mt-1 text-[12px] italic text-ink-soft">Paste Claude's answers here — they save with the proposal, ready to fold into sections.</p>
          <textarea value={state.copilotNotes} onChange={(e) => patch({ copilotNotes: e.target.value })}
            rows={16} aria-label="Pasted Claude answers"
            className={`${inputCls} mt-3 text-[13px] leading-relaxed`}
            placeholder="Claude said…" />
        </section>
      </aside>

      <Modal open={!!preview} onClose={() => setPreview(null)} label="Prompt preview" wide>
        {preview && (
          <div>
            <h2 className="pr-8 font-display text-lg font-black">{preview.title}</h2>
            <pre className="mt-3 max-h-[55vh] overflow-y-auto whitespace-pre-wrap rounded-md border border-rule bg-paper-bright p-4 font-body text-[12.5px] leading-relaxed">
              {preview.text}
            </pre>
            <div className="mt-4 flex justify-end gap-2">
              <Btn onClick={() => setPreview(null)}>Close</Btn>
              <Btn tone="gold" onClick={() => { copyText(preview.text, 'Prompt copied — paste into claude.ai'); setPreview(null); }}>
                <Copy className="h-3.5 w-3.5" aria-hidden /> Copy prompt
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ============================ guide modal ============================= */

function GuideModal({ open, onClose }) {
  const steps = [
    ['Set the cover sheet', 'Title, client, your studio, dates, and the wax-seal monogram. The validity date matters — an open-ended proposal never gets signed.'],
    ['Pull sections from the Stationery Drawer', 'Eleven set pieces — problem, approach, scope, timeline, team, proof, terms. Each arrives with starter copy; the [bracketed blanks] show exactly what to fill.'],
    ['Order the argument', 'Drag sections by the grip, or use the arrows. Letter first, price late, pen last. The eye toggle keeps a section on file without printing it.'],
    ['Price the editions', 'In Investment, build one or two named options with line items — quantities, rates, an optional discount and tax. Totals set themselves; star one edition as recommended.'],
    ['Watch the Foil Gauge', 'The dial on the right scores send-readiness across eight checks. Click any unmet check to jump where the work is.'],
    ['Proof and print', 'Preview shows the finished piece — cream paper, seal, letterpress rules. Print / Save as PDF produces the client-ready document.'],
    ['Put Claude to work', 'The Copilot desk writes prompts carrying your whole proposal: draft a section, tighten scope, build the objection FAQ, red-team it. Copy, paste into claude.ai, keep the answers in the Reply Ledger.'],
    ['Keep a copy in the drawer', 'Export JSON to back up or move machines; import restores it. Copy Markdown drops the whole proposal into any editor.'],
  ];
  const keys = [
    ['?', 'Open this guide'],
    ['Esc', 'Close dialogs and menus'],
    ['Ctrl/Cmd + S', 'Copy the proposal as Markdown'],
    ['Ctrl/Cmd + P', 'Print the finished proposal'],
  ];
  return (
    <Modal open={open} onClose={onClose} label="How to use Proposal Studio" wide>
      <div className="flex items-center gap-3">
        <Crest className="h-11 w-11" />
        <div>
          <h2 className="font-display text-xl font-black leading-tight">How to use Proposal Studio</h2>
          <p className="text-[12.5px] italic text-ink-soft">From blank paper to a signed yes, in eight moves.</p>
        </div>
      </div>
      <Flourish className="my-4" />
      <ol className="space-y-3">
        {steps.map(([t, d], i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold-deep font-display text-[11px] font-black text-gold-deep">{i + 1}</span>
            <p className="text-[13.5px] leading-snug"><strong className="font-display">{t}.</strong>{' '}<span className="text-ink-soft">{d}</span></p>
          </li>
        ))}
      </ol>
      <h3 className="mt-5 font-display text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-soft letterpress">Keyboard</h3>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {keys.map(([k, d], i) => (
          <p key={i} className="text-[13px]">
            <kbd className="rounded border border-rule-strong bg-paper-bright px-1.5 py-0.5 font-display text-[11px] font-bold shadow-[inset_0_-1px_0_rgb(29_43_78/0.15)]">{k}</kbd>
            <span className="ms-2 text-ink-soft">{d}</span>
          </p>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <Btn tone="ink" onClick={onClose}><Check className="h-3.5 w-3.5" aria-hidden /> To the desk</Btn>
      </div>
    </Modal>
  );
}
