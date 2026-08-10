/* The Correspondence Desk — Warm Outreach Lab.
   Draft human-reviewed warm outreach to local businesses.
   Local-first. No sending, no CRM writes, no network calls. */
(() => {
  'use strict';

  /* ============================== Constants ============================== */

  const STORAGE_KEY = 'fable-remake:day-09-warm-outreach-lab:v1';
  const DAY_MS = 86400000;

  const STATUSES = [
    { id: 'research', label: 'Gathering notes' },
    { id: 'draft',    label: 'At the desk' },
    { id: 'ready',    label: 'Sealed & ready' },
    { id: 'sent',     label: 'Posted' },
    { id: 'replied',  label: 'Reply received' },
    { id: 'meeting',  label: 'Meeting set' },
    { id: 'passed',   label: 'Filed away' },
  ];
  const STATUS_IDS = STATUSES.map(s => s.id);
  const CHANNELS = ['Email', 'LinkedIn DM', 'SMS', 'Voicemail script', 'In person'];
  const SLOTS = ['business', 'contact', 'industry', 'noticed', 'proof', 'ask'];

  const CADENCES = {
    'gentle-3': {
      name: 'The gentle three',
      touches: [
        { offset: 0,  label: 'The first letter', hint: 'Noticed issue + honest proof + one gentle ask' },
        { offset: 4,  label: 'A soft bump',      hint: 'One line in the same thread — no guilt, no pressure' },
        { offset: 12, label: 'The value close',  hint: 'Share one useful observation, then close the loop politely' },
      ],
    },
    'standard-4': {
      name: 'The standard four',
      touches: [
        { offset: 0,  label: 'The first letter', hint: 'Noticed issue + honest proof + one gentle ask' },
        { offset: 3,  label: 'A short bump',     hint: 'Reply to your own message with one added detail' },
        { offset: 8,  label: 'A new angle',      hint: 'Different noticed detail or a small useful resource' },
        { offset: 16, label: 'Close the loop',   hint: '"Closing the file" note — easy yes/no, door stays open' },
      ],
    },
    'slow-4': {
      name: 'The slow burn',
      touches: [
        { offset: 0,  label: 'The first letter', hint: 'Noticed issue + honest proof + one gentle ask' },
        { offset: 7,  label: 'Week-later bump',  hint: 'Short, warm, zero pressure' },
        { offset: 21, label: 'A value drop',     hint: 'Something genuinely useful, no ask attached' },
        { offset: 42, label: 'Season check-in',  hint: 'Light check-in tied to their busy season' },
      ],
    },
  };

  const GENERIC_PHRASES = [
    [/i hope this (email |message |note )?finds you well/i, '"Hope this finds you well" — cut the canned opener'],
    [/to whom it may concern/i, '"To whom it may concern" — find the owner\'s actual name'],
    [/dear (sir|madam)/i, 'Template greeting reads like mass mail'],
    [/my name is/i, 'Don\'t open with your own name — lead with them'],
    [/i wanted to reach out/i, '"I wanted to reach out" is filler — say why instead'],
    [/i('| a)m reaching out/i, '"Reaching out" filler — start with the noticed issue'],
    [/just (checking in|following up|touching base)/i, '"Just checking in" adds no value — add one instead'],
    [/i (came|stumbled) across your (website|business|company|page|profile|shop)/i, '"Came across" is vague — name exactly what you saw'],
    [/businesses like yours/i, '"Businesses like yours" — name their business, not a category'],
    [/we specialize in/i, '"We specialize in" is about you, not them'],
    [/free (consultation|audit|quote|trial)/i, '"Free consultation" pattern-matches to cold spam'],
    [/hope you('| a)re (doing )?well/i, '"Hope you\'re well" — canned opener'],
  ];

  const HYPE_WORDS = [
    'guarantee', 'guaranteed', 'revolutionary', 'game-changing', 'game changer',
    'synergy', 'skyrocket', '10x', 'explode', 'no-brainer', 'act now',
    'limited time', 'cutting-edge', 'world-class', 'best in class', 'unlock',
  ];

  const GUARDRAIL = 'Draft-only boundary: this packet came off a local correspondence desk. '
    + 'Nothing has been sent. A human must verify the noticed issue, the proof claim, and the tone before any message goes out.';

  /* ============================== Small helpers ============================== */

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  function toISO(d) {
    const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return z.toISOString().slice(0, 10);
  }
  const todayISO = () => toISO(new Date());
  function addDaysISO(iso, n) {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return toISO(d);
  }
  function fmtDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return '—';
    return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  function dayDiff(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return null;
    return Math.round((new Date(iso + 'T12:00:00') - new Date(todayISO() + 'T12:00:00')) / DAY_MS);
  }

  /* ============================== State ============================== */

  const uid = () => 'p' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
  const str = (v, max = 4000) => typeof v === 'string' ? v.slice(0, max) : '';

  function blankProspect(name = '') {
    return {
      id: uid(), name, contact: '', industry: '', channel: 'Email', status: 'research',
      notes: '', noticed: '', proof: '', ask: '', constraints: '',
      draft: '', touches: [], createdAt: todayISO(),
    };
  }

  function normalizeTouch(raw) {
    if (!raw || typeof raw !== 'object') return null;
    return {
      id: str(raw.id, 40) || uid(),
      label: str(raw.label, 80) || 'Touch',
      hint: str(raw.hint, 200),
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.date)) ? String(raw.date) : todayISO(),
      done: !!raw.done,
    };
  }

  function normalizeProspect(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const p = blankProspect();
    p.id = str(raw.id, 40) || p.id;
    p.name = str(raw.name, 90);
    p.contact = str(raw.contact, 60);
    p.industry = str(raw.industry, 120);
    p.channel = CHANNELS.includes(raw.channel) ? raw.channel : 'Email';
    p.status = STATUS_IDS.includes(raw.status) ? raw.status : 'research';
    p.notes = str(raw.notes, 800);
    p.noticed = str(raw.noticed, 500);
    p.proof = str(raw.proof, 400);
    p.ask = str(raw.ask, 300);
    p.constraints = str(raw.constraints, 400);
    p.draft = str(raw.draft, 3000);
    p.touches = Array.isArray(raw.touches) ? raw.touches.map(normalizeTouch).filter(Boolean).slice(0, 12) : [];
    p.createdAt = /^\d{4}-\d{2}-\d{2}$/.test(String(raw.createdAt)) ? String(raw.createdAt) : todayISO();
    return p;
  }

  function normalize(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const st = {
      version: 1,
      seenGuide: !!src.seenGuide,
      filter: src.filter === 'all' || STATUS_IDS.includes(src.filter) ? src.filter : 'all',
      selectedId: typeof src.selectedId === 'string' ? src.selectedId : null,
      prospects: Array.isArray(src.prospects) ? src.prospects.map(normalizeProspect).filter(Boolean).slice(0, 200) : [],
    };
    if (st.selectedId && !st.prospects.some(p => p.id === st.selectedId)) st.selectedId = null;
    return st;
  }

  function loadState() {
    try { return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
    catch { return normalize(null); }
  }

  let state = loadState();
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage blocked */ }
    }, 250);
  }

  const selected = () => state.prospects.find(p => p.id === state.selectedId) || null;

  /* ============================== Domain: slots & genericness lint ============================== */

  function slotValue(p, key) {
    switch (key) {
      case 'business': return p.name.trim();
      case 'contact':  return p.contact.trim();
      case 'industry': return p.industry.trim();
      case 'noticed':  return p.noticed.trim();
      case 'proof':    return p.proof.trim();
      case 'ask':      return p.ask.trim();
      default: return null; // unknown slot
    }
  }

  function resolveSlots(raw, p) {
    const unresolved = [], unknown = [];
    const text = String(raw).replace(/\{\{(\w+)\}\}/g, (m, key) => {
      const val = slotValue(p, key);
      if (val === null) { unknown.push(key); return m; }
      if (!val) { unresolved.push(key); return m; }
      return val;
    });
    return { text, unresolved: [...new Set(unresolved)], unknown: [...new Set(unknown)] };
  }

  function significantWords(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 5);
  }
  function overlapCount(source, text) {
    const hay = new Set(significantWords(text));
    let n = 0;
    new Set(significantWords(source)).forEach(w => { if (hay.has(w)) n++; });
    return n;
  }

  // Scores the *resolved* draft 0–100 and explains every deduction.
  function lintDraft(p) {
    const raw = p.draft.trim();
    if (!raw) {
      return {
        score: null, verdict: 'Nothing to mark yet',
        issues: [{ level: 'warn', msg: 'Set words on the sheet — press a brass plate to pull in your research.' }],
      };
    }
    const { text, unresolved, unknown } = resolveSlots(raw, p);
    const lower = text.toLowerCase();
    const issues = [];
    let score = 100;
    const hit = (pts, level, msg) => { score -= pts; issues.push({ level, msg }); };
    const good = msg => issues.push({ level: 'ok', msg });

    unresolved.forEach(k => hit(12, 'bad', `Slot {{${k}}} is empty — fill "${k}" on the research card`));
    unknown.forEach(k => hit(6, 'warn', `Unknown slot {{${k}}} — supported: ${SLOTS.map(s => '{{' + s + '}}').join(' ')}`));

    GENERIC_PHRASES.forEach(([re, msg]) => { if (re.test(text)) hit(10, 'bad', msg); });
    const hyped = HYPE_WORDS.filter(w => lower.includes(w));
    if (hyped.length) hit(Math.min(24, hyped.length * 8), 'bad', `Hype language: ${hyped.slice(0, 4).join(', ')} — warm outreach doesn't shout`);

    if (p.name.trim()) {
      if (lower.includes(p.name.trim().toLowerCase())) good('Names the business');
      else hit(15, 'bad', 'Never names the business — a swap-in-anyone draft is a cold draft');
    }
    if (p.contact.trim() && !lower.includes(p.contact.trim().toLowerCase())) {
      hit(4, 'warn', `You know the contact (${p.contact.trim()}) but the draft doesn't greet them`);
    }

    if (p.noticed.trim()) {
      if (overlapCount(p.noticed, text) >= 2) good('References the noticed issue');
      else hit(15, 'bad', 'Doesn\'t reference the noticed issue — that\'s the whole reason to write');
    } else {
      hit(10, 'warn', 'Research card has no noticed issue, so the draft can\'t be specific');
    }
    if (p.proof.trim()) {
      if (overlapCount(p.proof, text) >= 2) good('Proof point is woven in');
      else hit(6, 'warn', 'Proof point from the card isn\'t in the draft');
    }

    const words = text.split(/\s+/).filter(Boolean).length;
    if (words > 170) hit(10, 'warn', `Long (${words} words) — warm notes land best under ~120`);
    else if (words < 25) hit(10, 'warn', `Very short (${words} words) — add the specific detail you noticed`);
    else good(`Good length (${words} words)`);

    const questions = (text.match(/\?/g) || []).length;
    if (questions === 0) hit(10, 'warn', 'No question anywhere — add one low-pressure ask');
    else if (questions > 2) hit(8, 'warn', `${questions} questions — keep it to one clear ask`);
    else good('One clear ask');

    const selfRefs = (lower.match(/\b(i|we|me|my|our|us)\b/g) || []).length;
    const youRefs = (lower.match(/\b(you|your|yours)\b/g) || []).length;
    if (selfRefs >= 4 && selfRefs > youRefs * 1.5) hit(10, 'warn', `Me-heavy: ${selfRefs} self-references vs ${youRefs} about them`);

    if (/https?:\/\/|www\./i.test(text)) hit(6, 'warn', 'Link in a first touch lowers replies and trips spam filters');
    if ((text.match(/!/g) || []).length > 1) hit(4, 'warn', 'Multiple exclamation marks read as salesy');
    if (/\b[A-Z]{4,}\b/.test(text.replace(/\{\{\w+\}\}/g, ''))) hit(4, 'warn', 'ALL-CAPS words read as shouting');

    score = Math.max(0, Math.min(100, Math.round(score)));
    const verdict = score >= 85 ? 'Reads like a real letter'
      : score >= 70 ? 'Warm enough — give it a read'
      : score >= 50 ? 'Getting there — keep the pencil moving'
      : 'Reads like a circular — rework it';
    return { score, verdict, issues };
  }

  const scoreClass = s => s >= 70 ? 'good' : s >= 50 ? 'mid' : 'low';

  /* ============================== Domain: cadence & pipeline stats ============================== */

  function buildTouches(templateId, startISO) {
    const tpl = CADENCES[templateId] || CADENCES['gentle-3'];
    return tpl.touches.map(t => ({
      id: uid(), label: t.label, hint: t.hint, date: addDaysISO(startISO, t.offset), done: false,
    }));
  }

  const cadenceActive = p => !['replied', 'meeting', 'passed'].includes(p.status);

  function nextTouch(p) {
    if (!cadenceActive(p)) return null;
    return p.touches.filter(t => !t.done).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
  }

  function dueTouchCount() {
    const today = todayISO();
    return state.prospects.reduce((n, p) => {
      if (!cadenceActive(p)) return n;
      return n + p.touches.filter(t => !t.done && t.date <= today).length;
    }, 0);
  }

  function pipelineStats() {
    const ready = state.prospects.filter(p => {
      if (!p.draft.trim() || ['sent', 'replied', 'meeting', 'passed'].includes(p.status)) return false;
      const lint = lintDraft(p);
      return lint.score !== null && lint.score >= 70;
    }).length;
    const contacted = state.prospects.filter(p => ['sent', 'replied', 'meeting'].includes(p.status)).length;
    const replied = state.prospects.filter(p => ['replied', 'meeting'].includes(p.status)).length;
    return {
      total: state.prospects.length,
      ready,
      due: dueTouchCount(),
      replyRate: contacted ? Math.round((replied / contacted) * 100) : null,
    };
  }

  const statusLabel = id => (STATUSES.find(s => s.id === id) || STATUSES[0]).label;

  /* ============================== Domain: exports ============================== */

  function prospectMarkdown(p) {
    const lint = lintDraft(p);
    const { text: resolved } = resolveSlots(p.draft, p);
    return [
      `# Warm outreach packet — ${p.name || 'Unnamed prospect'}`,
      '',
      `Generated: ${new Date().toLocaleString()}`,
      `Status: ${statusLabel(p.status)} · Channel: ${p.channel}`,
      '',
      '## Research card',
      `- Business: ${p.name || '—'}`,
      `- Contact: ${p.contact || '—'}`,
      `- Industry / context: ${p.industry || '—'}`,
      `- Research notes: ${p.notes || '—'}`,
      `- Noticed issue: ${p.noticed || '—'}`,
      `- Proof point: ${p.proof || '—'}`,
      `- Low-pressure ask: ${p.ask || '—'}`,
      `- Constraints / claims to avoid: ${p.constraints || '—'}`,
      '',
      `## Draft (${p.channel})`,
      '',
      resolved.trim() || '_No draft yet._',
      '',
      `## Personalization lint — ${lint.score === null ? 'no draft' : lint.score + '/100 (' + lint.verdict + ')'}`,
      ...lint.issues.map(i => `- [${i.level === 'ok' ? 'pass' : i.level}] ${i.msg}`),
      '',
      '## Follow-up cadence',
      ...(p.touches.length
        ? p.touches.map(t => `- [${t.done ? 'x' : ' '}] ${fmtDate(t.date)} (${t.date}) — ${t.label}: ${t.hint}`)
        : ['_No cadence planned yet._']),
      '',
      '## Guardrail',
      GUARDRAIL,
    ].join('\n');
  }

  function pipelineMarkdown() {
    const stats = pipelineStats();
    return [
      '# The Correspondence Desk — tray ledger',
      '',
      `Generated: ${new Date().toLocaleString()}`,
      `Prospects: ${stats.total} · Send-ready drafts: ${stats.ready} · Touches due: ${stats.due} · Reply rate: ${stats.replyRate === null ? '—' : stats.replyRate + '%'}`,
      '',
      '| Business | Status | Channel | Lint | Next touch |',
      '|---|---|---|---|---|',
      ...state.prospects.map(p => {
        const lint = lintDraft(p);
        const nt = nextTouch(p);
        return `| ${p.name || '—'} | ${statusLabel(p.status)} | ${p.channel} | ${lint.score === null ? '—' : lint.score} | ${nt ? nt.date + ' ' + nt.label : '—'} |`;
      }),
      '',
      '## Guardrail',
      GUARDRAIL,
    ].join('\n');
  }

  function mainMarkdown() {
    const p = selected();
    return p ? prospectMarkdown(p) : pipelineMarkdown();
  }

  function pipelineCsv() {
    const rows = [['business', 'contact', 'industry', 'channel', 'status', 'lint_score', 'next_touch_date', 'next_touch_label', 'touches_done', 'touches_total', 'boundary']];
    state.prospects.forEach(p => {
      const lint = lintDraft(p);
      const nt = nextTouch(p);
      rows.push([
        p.name, p.contact, p.industry, p.channel, statusLabel(p.status),
        lint.score === null ? '' : String(lint.score),
        nt ? nt.date : '', nt ? nt.label : '',
        String(p.touches.filter(t => t.done).length), String(p.touches.length),
        'draft-only, human review required',
      ]);
    });
    return rows.map(r => r.map(c => `"${String(c ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  }

  function printHTML() {
    const p = selected();
    if (!p) {
      return `<h1>The Correspondence Desk — tray ledger</h1>
        <p class="print-dim">Generated ${esc(new Date().toLocaleString())} · Draft-only, human review required</p>
        <ul>${state.prospects.map(x => `<li><strong>${esc(x.name || 'Unnamed')}</strong> — ${esc(statusLabel(x.status))}, ${esc(x.channel)}</li>`).join('')}</ul>
        <h2>Guardrail</h2><p>${esc(GUARDRAIL)}</p>`;
    }
    const lint = lintDraft(p);
    const { text: resolved } = resolveSlots(p.draft, p);
    return `<h1>Warm outreach packet — ${esc(p.name || 'Unnamed prospect')}</h1>
      <p class="print-dim">Generated ${esc(new Date().toLocaleString())} · ${esc(statusLabel(p.status))} · ${esc(p.channel)}</p>
      <h2>Research card</h2>
      <ul>
        <li><strong>Contact:</strong> ${esc(p.contact || '—')}</li>
        <li><strong>Industry / context:</strong> ${esc(p.industry || '—')}</li>
        <li><strong>Research notes:</strong> ${esc(p.notes || '—')}</li>
        <li><strong>Noticed issue:</strong> ${esc(p.noticed || '—')}</li>
        <li><strong>Proof point:</strong> ${esc(p.proof || '—')}</li>
        <li><strong>Low-pressure ask:</strong> ${esc(p.ask || '—')}</li>
        <li><strong>Constraints:</strong> ${esc(p.constraints || '—')}</li>
      </ul>
      <h2>Draft (${esc(p.channel)})</h2>
      <pre>${esc(resolved.trim() || 'No draft yet.')}</pre>
      <h2>Personalization lint — ${lint.score === null ? 'no draft' : lint.score + '/100, ' + esc(lint.verdict)}</h2>
      <ul>${lint.issues.map(i => `<li>[${i.level === 'ok' ? 'pass' : i.level}] ${esc(i.msg)}</li>`).join('')}</ul>
      <h2>Follow-up cadence</h2>
      <ul>${p.touches.length ? p.touches.map(t => `<li>[${t.done ? 'x' : ' '}] ${esc(fmtDate(t.date))} (${esc(t.date)}) — <strong>${esc(t.label)}</strong>: ${esc(t.hint)}</li>`).join('') : '<li>No cadence planned yet.</li>'}</ul>
      <h2>Guardrail</h2><p>${esc(GUARDRAIL)}</p>`;
  }

  /* ============================== Demo data ============================== */

  function demoState() {
    const t = todayISO();
    const cedar = normalizeProspect({
      name: 'Cedar & Steam Coffee', contact: 'Maya', industry: 'Third-wave coffee shop on Maple Ave',
      channel: 'Email', status: 'sent',
      notes: 'Found via Instagram (1.2k followers, active stories). Online-order link in bio 404s on mobile — checked twice. Google listing hours differ from the hours posted on the door.',
      noticed: 'the online-order link in your Instagram bio returns a 404 on mobile, so weekend pre-orders from that audience dead-end',
      proof: 'I fixed the same broken link handoff for a bakery on 5th, and their weekend pre-orders became their biggest channel within a month — their words, happy to connect you',
      ask: 'Want me to send a three-line note on exactly where the link breaks? No call needed.',
      constraints: 'No revenue promises. Do not name the bakery without permission.',
      draft: 'Hi {{contact}} — I was at {{business}} on Saturday (flat white, worth the line) and noticed {{noticed}}.\n\n{{proof}}.\n\n{{ask}}\n\nIf the timing is wrong, no worries at all — the coffee was great either way.',
      touches: [
        { label: 'The first letter', hint: 'Noticed issue + honest proof + one gentle ask', date: addDaysISO(t, -4), done: true },
        { label: 'A soft bump', hint: 'One line in the same thread — no guilt, no pressure', date: t, done: false },
        { label: 'The value close', hint: 'Share one useful observation, then close the loop politely', date: addDaysISO(t, 8), done: false },
      ],
      createdAt: addDaysISO(t, -6),
    });
    const hartline = normalizeProspect({
      name: 'Hartline Auto Care', contact: '', industry: 'Independent auto repair, 40+ Google reviews',
      channel: 'Email', status: 'draft',
      notes: 'Strong reviews, but the booking page buries the phone number and there is no way to request a quote after hours. Owner is Ray per the About page.',
      noticed: 'the booking page hides the phone number below the fold and after-hours visitors have no way to request a quote',
      proof: 'I helped a transmission shop add a simple after-hours quote form; the owner reviews every reply himself',
      ask: 'Open to a two-line email showing where the booking page loses people?',
      constraints: 'No guarantees about bookings. Keep it short — owner-operated shop.',
      draft: 'Hello, I hope this email finds you well. My name is Alex and I wanted to reach out because we specialize in helping businesses like yours skyrocket their online presence!\n\nWe offer a free consultation and guaranteed results with our cutting-edge, world-class process. Act now — limited time!\n\nCan we hop on a call? Do you have 30 minutes this week? What times work? Visit www.example-agency.example to learn more!',
      touches: [],
      createdAt: addDaysISO(t, -2),
    });
    const bluebird = normalizeProspect({
      name: 'Bluebird Yoga Studio', contact: 'Priya', industry: 'Neighborhood yoga studio, two rooms',
      channel: 'LinkedIn DM', status: 'replied',
      notes: 'Class schedule PDF is from last season; three classes on it no longer run per their Instagram. Priya posts the studio content herself.',
      noticed: 'the schedule PDF on your site still lists last season\'s classes, and three of them no longer run according to your Instagram',
      proof: 'I rebuilt a pilates studio\'s schedule as a simple page the owner edits herself — no more stale PDFs',
      ask: 'Would a before/after screenshot of how that looks be useful? Happy to send it, zero obligation.',
      constraints: 'She runs everything solo — do not pitch anything that adds weekly work.',
      draft: 'Hi {{contact}} — quick note from a class regular\'s friend. I noticed {{noticed}}, which probably costs you drop-ins who plan from the website.\n\n{{proof}}.\n\n{{ask}}',
      touches: [
        { label: 'The first letter', hint: 'Noticed issue + honest proof + one gentle ask', date: addDaysISO(t, -14), done: true },
        { label: 'A short bump', hint: 'Reply to your own message with one added detail', date: addDaysISO(t, -11), done: true },
        { label: 'A new angle', hint: 'Different noticed detail or a small useful resource', date: addDaysISO(t, -6), done: false },
        { label: 'Close the loop', hint: '"Closing the file" note — easy yes/no, door stays open', date: addDaysISO(t, 2), done: false },
      ],
      createdAt: addDaysISO(t, -16),
    });
    const northstar = normalizeProspect({
      name: 'North Star Plumbing', contact: 'Dan', industry: 'Family-owned emergency plumbing',
      channel: 'Voicemail script', status: 'research',
      notes: 'Strong reviews. Quote form asks good questions but makes no promise about response time — weekend callers cannot tell whether to call or wait. Dispatcher mentioned by name in reviews (friendly).',
      noticed: 'the quote form never says when someone will get back, so weekend emergencies likely bounce to whoever answers a phone first',
      proof: '',
      ask: '',
      constraints: 'Do not imply access to their data. No guaranteed-revenue claims.',
      draft: '', touches: [], createdAt: t,
    });
    return normalize({
      seenGuide: true, filter: 'all',
      selectedId: cedar.id, prospects: [cedar, hartline, bluebird, northstar],
    });
  }

  /* ============================== Rendering ============================== */

  const FIELD_MAP = {
    pName: 'name', pContact: 'contact', pIndustry: 'industry', pChannel: 'channel',
    pStatus: 'status', pNotes: 'notes', pNoticed: 'noticed', pProof: 'proof',
    pAsk: 'ask', pConstraints: 'constraints',
  };

  // Pencil marks for the editor's report — one consistent stroke style, no emoji.
  const MARKS = {
    ok:   '<svg class="mark m-ok" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5l2.5 2.5L10 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warn: '<svg class="mark m-warn" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.8v5.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="6" cy="10" r="1.2" fill="currentColor"/></svg>',
    bad:  '<svg class="mark m-bad" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.8 2.8l6.4 6.4M9.2 2.8 2.8 9.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  };

  function renderStats() {
    const s = pipelineStats();
    $('statProspects').textContent = s.total;
    $('statReady').textContent = s.ready;
    $('statDue').textContent = s.due;
    $('statReply').textContent = s.replyRate === null ? '–' : s.replyRate + '%';
  }

  function cardTouchInfo(p) {
    const nt = nextTouch(p);
    if (!nt) return '';
    const diff = dayDiff(nt.date);
    if (diff === null) return '';
    if (diff < 0) return `<span class="env-next overdue">${Math.abs(diff)}d past due</span>`;
    if (diff === 0) return '<span class="env-next due">post today</span>';
    return `<span class="env-next">next: ${esc(fmtDate(nt.date))}</span>`;
  }

  function renderList() {
    const listEl = $('prospectList');
    const filtered = state.filter === 'all' ? state.prospects : state.prospects.filter(p => p.status === state.filter);
    if (!state.prospects.length) {
      listEl.innerHTML = '<li class="list-empty">The tray is empty.<br>Start a letter above, or lay out the demo to see the desk at work.</li>';
      return;
    }
    if (!filtered.length) {
      listEl.innerHTML = '<li class="list-empty">No letters under this mark — sort the tray another way.</li>';
      return;
    }
    listEl.innerHTML = filtered.map(p => {
      const lint = lintDraft(p);
      const grade = lint.score === null ? '' : `<span class="grade g-${scoreClass(lint.score)}" title="Editor&#39;s grade">${lint.score}</span>`;
      return `<li>
        <div class="envelope" data-id="${esc(p.id)}" role="button" tabindex="0"
             aria-current="${p.id === state.selectedId ? 'true' : 'false'}"
             aria-label="Open the letter to ${esc(p.name || 'an unnamed addressee')}">
          <span class="env-flap" aria-hidden="true"></span>
          <div class="env-row">
            <span class="env-name">${esc(p.name || 'Unnamed addressee')}</span>
            <span class="stamp s-${esc(p.status)}">${esc(statusLabel(p.status))}</span>
          </div>
          <div class="env-meta">
            <span>${esc(p.channel)}</span>
            ${grade}
            ${cardTouchInfo(p)}
          </div>
        </div>
      </li>`;
    }).join('');
  }

  function renderLintAndPreview() {
    const p = selected();
    if (!p) return;
    const lint = lintDraft(p);
    $('lintScore').textContent = lint.score === null ? '–' : lint.score;
    $('gradeStamp').className = 'grade-stamp' + (lint.score === null ? '' : ' ' + scoreClass(lint.score));
    $('lintVerdict').textContent = lint.verdict;
    $('lintList').innerHTML = lint.issues.map(i =>
      `<li>${MARKS[i.level] || MARKS.warn}<span>${esc(i.msg)}</span></li>`
    ).join('');

    // Resolved preview with unresolved slots highlighted.
    const raw = p.draft;
    const re = /\{\{(\w+)\}\}/g;
    let html = '', last = 0, m;
    while ((m = re.exec(raw))) {
      html += esc(raw.slice(last, m.index));
      const val = slotValue(p, m[1]);
      html += val ? esc(val) : `<span class="slot-unresolved">{{${esc(m[1])}}}</span>`;
      last = m.index + m[0].length;
    }
    html += esc(raw.slice(last));
    $('previewBox').innerHTML = html || '<span class="slot-unresolved">The fair copy appears as you write.</span>';
  }

  function renderTouches() {
    const p = selected();
    if (!p) return;
    const listEl = $('touchList');
    if (!p.touches.length) {
      listEl.innerHTML = '<li class="list-empty">No postmarks on the string yet — choose a cadence and a first posting date, then set them.</li>';
      return;
    }
    const today = todayISO();
    listEl.innerHTML = p.touches.map(t => {
      const diff = dayDiff(t.date);
      const isOverdue = !t.done && t.date < today;
      const isDue = !t.done && t.date === today;
      const cls = ['postmark', t.done ? 'done' : '', isOverdue ? 'overdue' : '', isDue ? 'due' : '']
        .filter(Boolean).join(' ');
      const badge = t.done ? 'POSTED' : isOverdue ? 'PAST DUE' : isDue ? 'DUE TODAY' : '';
      const when = t.done ? 'posted' : diff < 0 ? `${Math.abs(diff)}d past due` : diff === 0 ? 'due today' : `in ${diff}d`;
      return `<li class="${cls}">
        <label class="pm-stamp">
          <input type="checkbox" data-touch="${esc(t.id)}" ${t.done ? 'checked' : ''}
                 aria-label="Mark ${esc(t.label)} on ${esc(fmtDate(t.date))} as posted">
          <span class="pm-ring" aria-hidden="true">${esc(fmtDate(t.date))}</span>
          ${badge ? `<span class="pm-mark" aria-hidden="true">${badge}</span>` : ''}
        </label>
        <span class="pm-label">${esc(t.label)}</span>
        <span class="pm-hint">${esc(t.hint)}</span>
        <span class="pm-when">${esc(when)}</span>
      </li>`;
    }).join('');
  }

  function validateName() {
    const p = selected();
    if (!p) return;
    const bad = !p.name.trim();
    $('pName').closest('.field').classList.toggle('invalid', bad);
    $('pNameErr').hidden = !bad;
  }

  function renderDetail() {
    const p = selected();
    $('detailEmpty').hidden = !!p;
    $('detailBody').hidden = !p;
    if (!p) return;
    $('detailTitle').textContent = p.name || 'Unnamed addressee';
    Object.entries(FIELD_MAP).forEach(([id, prop]) => { $(id).value = p[prop]; });
    $('draftText').value = p.draft;
    if (!$('cadenceStart').value) $('cadenceStart').value = todayISO();
    validateName();
    renderLintAndPreview();
    renderTouches();
  }

  function renderAll() {
    $('statusFilter').value = state.filter;
    renderStats();
    renderList();
    renderDetail();
  }

  /* ============================== Toast & undo ============================== */

  let toastTimer = null;
  let undoFn = null;

  function showToast(msg, undo = null) {
    const toastEl = $('toast');
    $('toastMsg').textContent = msg;
    undoFn = undo;
    $('toastUndo').hidden = !undo;
    toastEl.hidden = false;
    requestAnimationFrame(() => toastEl.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, undo ? 7000 : 2500);
  }
  function hideToast() {
    const toastEl = $('toast');
    toastEl.classList.remove('show');
    undoFn = null;
    setTimeout(() => { if (!toastEl.classList.contains('show')) toastEl.hidden = true; }, 220);
  }

  /* ============================== Clipboard & files ============================== */

  function copyText(text, okMsg) {
    const done = () => showToast(okMsg);
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); }
      catch { showToast('Copy failed — select and copy manually'); }
      ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else fallback();
  }

  function downloadFile(name, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ============================== Help modal ============================== */

  let helpOpener = null;
  function openHelp(opener) {
    helpOpener = opener || null;
    const dlg = $('helpModal');
    if (!dlg.open) dlg.showModal();
  }
  function closeHelp() {
    const dlg = $('helpModal');
    if (dlg.open) dlg.close();
  }

  /* ============================== Actions ============================== */

  function addProspect() {
    const p = blankProspect();
    state.prospects.unshift(p);
    state.selectedId = p.id;
    state.filter = 'all';
    save();
    renderAll();
    $('pName').focus();
    showToast('A fresh sheet is on the desk — name the addressee first');
  }

  function deleteProspect() {
    const p = selected();
    if (!p) return;
    const idx = state.prospects.indexOf(p);
    state.prospects.splice(idx, 1);
    state.selectedId = state.prospects[Math.min(idx, state.prospects.length - 1)]?.id ?? null;
    save();
    renderAll();
    showToast(`Discarded the letter to "${p.name || 'Unnamed addressee'}"`, () => {
      state.prospects.splice(Math.min(idx, state.prospects.length), 0, p);
      state.selectedId = p.id;
      save();
      renderAll();
    });
  }

  function applyCadence() {
    const p = selected();
    if (!p) return;
    const startISO = /^\d{4}-\d{2}-\d{2}$/.test($('cadenceStart').value) ? $('cadenceStart').value : todayISO();
    const prev = p.touches;
    p.touches = buildTouches($('cadenceTemplate').value, startISO);
    save();
    renderTouches(); renderList(); renderStats();
    const tplName = (CADENCES[$('cadenceTemplate').value] || CADENCES['gentle-3']).name;
    showToast(`${tplName} strung from ${fmtDate(startISO)}`, prev.length ? () => {
      p.touches = prev; save(); renderTouches(); renderList(); renderStats();
    } : null);
  }

  function clearCadence() {
    const p = selected();
    if (!p || !p.touches.length) return;
    const prev = p.touches;
    p.touches = [];
    save();
    renderTouches(); renderList(); renderStats();
    showToast('Postmarks taken down', () => {
      p.touches = prev; save(); renderTouches(); renderList(); renderStats();
    });
  }

  function importState(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const incoming = normalize(parsed && typeof parsed.state === 'object' ? parsed.state : parsed);
        incoming.seenGuide = true;
        state = incoming;
        save();
        renderAll();
        showToast(`Imported ${state.prospects.length} letter${state.prospects.length === 1 ? '' : 's'} into the tray`);
      } catch {
        showToast('Import failed — not a valid JSON export from this desk');
      }
    };
    reader.onerror = () => showToast('Import failed — could not read the file');
    reader.readAsText(file);
  }

  function selectProspect(id) {
    state.selectedId = id;
    save();
    renderList();
    renderDetail();
  }

  /* ============================== Event wiring ============================== */

  // Header
  $('helpBtn').addEventListener('click', () => openHelp($('helpBtn')));
  $('closeHelpBtn').addEventListener('click', closeHelp);
  $('helpModal').addEventListener('close', () => {
    if (helpOpener && document.contains(helpOpener)) helpOpener.focus();
    helpOpener = null;
  });
  $('helpModal').addEventListener('click', e => {
    if (e.target === $('helpModal')) closeHelp(); // backdrop click
  });
  $('loadDemoBtn').addEventListener('click', () => {
    state = demoState();
    save();
    renderAll();
    showToast('Demo laid out — four letters on the desk');
  });
  $('resetBtn').addEventListener('click', () => {
    if (!window.confirm('Clear the desk? This discards every letter, dossier, and postmark kept in this browser.')) return;
    state = normalize({ seenGuide: true });
    save();
    renderAll();
    showToast('The desk is cleared');
  });

  // Pipeline
  $('addProspectBtn').addEventListener('click', addProspect);
  $('emptyAddBtn').addEventListener('click', addProspect);
  $('statusFilter').addEventListener('change', () => {
    state.filter = $('statusFilter').value;
    save();
    renderList();
  });
  $('prospectList').addEventListener('click', e => {
    const card = e.target.closest('.envelope');
    if (card) selectProspect(card.dataset.id);
  });
  $('prospectList').addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.envelope');
    if (!card) return;
    e.preventDefault();
    selectProspect(card.dataset.id);
  });

  // Research card fields
  Object.entries(FIELD_MAP).forEach(([id, prop]) => {
    $(id).addEventListener('input', () => {
      const p = selected();
      if (!p) return;
      p[prop] = $(id).value;
      save();
      if (id === 'pName') {
        $('detailTitle').textContent = p.name || 'Unnamed addressee';
        validateName();
      }
      renderList();
      renderStats();
      renderLintAndPreview();
      if (id === 'pStatus') renderTouches(); // active/due state may change
    });
  });
  $('deleteProspectBtn').addEventListener('click', deleteProspect);

  // Draft composer
  $('draftText').addEventListener('input', () => {
    const p = selected();
    if (!p) return;
    p.draft = $('draftText').value;
    save();
    renderLintAndPreview();
    renderList();
    renderStats();
  });
  $('slotBar').addEventListener('click', e => {
    const btn = e.target.closest('[data-slot]');
    if (!btn) return;
    const ta = $('draftText');
    const token = `{{${btn.dataset.slot}}}`;
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    ta.value = ta.value.slice(0, start) + token + ta.value.slice(end);
    ta.focus();
    ta.selectionStart = ta.selectionEnd = start + token.length;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  });
  $('copyDraftBtn').addEventListener('click', () => {
    const p = selected();
    if (!p) return;
    const { text, unresolved } = resolveSlots(p.draft, p);
    copyText(text, unresolved.length
      ? `Fair copy taken — ${unresolved.length} slot${unresolved.length === 1 ? '' : 's'} still blank`
      : 'Fair copy taken, for a human to review and send');
  });

  // Cadence
  $('applyCadenceBtn').addEventListener('click', applyCadence);
  $('clearCadenceBtn').addEventListener('click', clearCadence);
  $('touchList').addEventListener('change', e => {
    const box = e.target.closest('[data-touch]');
    const p = selected();
    if (!box || !p) return;
    const touch = p.touches.find(t => t.id === box.dataset.touch);
    if (!touch) return;
    touch.done = box.checked;
    save();
    renderTouches();
    renderStats();
    renderList();
  });

  // Export & handoff
  $('copyMdBtn').addEventListener('click', () => copyText(mainMarkdown(), 'Markdown packet copied — a human reads it before anything is sent'));
  $('downloadJsonBtn').addEventListener('click', () => {
    downloadFile('warm-outreach-lab.json', JSON.stringify({
      app: 'warm-outreach-lab',
      exportedAt: new Date().toISOString(),
      safety: 'draft-only, human review required before any message is sent',
      state,
    }, null, 2), 'application/json');
    showToast('JSON downloaded — the whole desk, re-importable');
  });
  $('exportCsvBtn').addEventListener('click', () => {
    downloadFile('warm-outreach-pipeline.csv', pipelineCsv(), 'text/csv');
    showToast('Tray ledger CSV downloaded');
  });
  $('printBtn').addEventListener('click', () => {
    $('printArea').innerHTML = printHTML();
    window.print();
  });
  window.addEventListener('beforeprint', () => { $('printArea').innerHTML = printHTML(); });
  $('importJsonInput').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (file) importState(file);
    e.target.value = '';
  });

  // Toast undo
  $('toastUndo').addEventListener('click', () => {
    const fn = undoFn;
    hideToast();
    if (fn) { fn(); showToast('Restored'); }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      copyText(mainMarkdown(), 'Markdown packet copied — a human reads it before anything is sent');
      return;
    }
    const typing = e.target.closest && e.target.closest('input, textarea, select');
    if (typing || $('helpModal').open) return;
    if (e.key === '?') { e.preventDefault(); openHelp(null); }
    if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); addProspect(); }
  });

  /* ============================== Init ============================== */

  renderAll();
  if (!state.seenGuide) {
    state.seenGuide = true;
    save();
    openHelp($('helpBtn'));
  }
})();
