/* Review Request Composer — remake
   Local-first, draft-only. Nothing is ever sent from this app. */
(() => {
  'use strict';

  // ---------------------------------------------------------------- constants
  const LS_KEY = 'fable-remake:day-06-review-request-composer:v1';

  const TONES = {
    warm: 'Warm & short',
    grateful: 'Grateful owner note',
    tech: 'Technician handoff',
    low: 'Ultra low-pressure',
    pro: 'Professional (B2B)'
  };
  const CHANNELS = { sms: 'SMS', email: 'Email' };
  const SATISFACTIONS = {
    happy: 'Happy / thanked us',
    solved: 'Problem solved',
    repeat: 'Repeat customer',
    neutral: 'Neutral / unsure',
    issue: 'Had an issue'
  };
  const STATUSES = ['pending', 'asked', 'reviewed', 'skipped'];
  const SMS_SOFT_LIMIT = 320;   // ~2 SMS segments
  const EMAIL_SOFT_LIMIT = 950; // chars before an ask reads as a wall of text

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------------------------------------------------------------- state
  let state = load();
  let saveTimer = null;
  let toastTimer = null;
  let lastDeleted = null;
  let lastFocus = null;

  function defaultState() {
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    return {
      theme: prefersLight ? 'light' : 'dark',
      seenGuide: false,
      selectedId: null,
      queueFilter: 'all',
      business: { name: '', sender: '', platform: 'Google' },
      customers: []
    };
  }

  function isoDate(d) { return d.toISOString().slice(0, 10); }
  function todayIso() { return isoDate(new Date()); }
  function daysAgoIso(n) { const d = new Date(); d.setDate(d.getDate() - n); return isoDate(d); }
  function daysSince(iso) {
    if (!iso) return 0;
    const a = new Date(iso + 'T00:00:00');
    const b = new Date(todayIso() + 'T00:00:00');
    if (Number.isNaN(a.getTime())) return 0;
    return Math.max(0, Math.round((b - a) / 86400000));
  }
  function uid() {
    return (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  }

  function normalizeCustomer(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const str = (v, max) => String(v ?? '').slice(0, max);
    const dateOk = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : todayIso();
    const oneOf = (v, keys, fallback) => keys.includes(v) ? v : fallback;
    const ov = raw.overrides && typeof raw.overrides === 'object' ? raw.overrides : {};
    return {
      id: str(raw.id, 60) || uid(),
      name: str(raw.name ?? raw.customer, 80),
      job: str(raw.job, 100),
      completedDate: dateOk(raw.completedDate),
      satisfaction: oneOf(raw.satisfaction, Object.keys(SATISFACTIONS), 'happy'),
      tone: oneOf(raw.tone, Object.keys(TONES), 'warm'),
      channel: oneOf(raw.channel, Object.keys(CHANNELS), 'sms'),
      detail: str(raw.detail ?? raw.proof, 240),
      status: oneOf(raw.status, STATUSES, 'pending'),
      askedDate: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.askedDate || '')) ? String(raw.askedDate) : null,
      overrides: {
        sms: typeof ov.sms === 'string' ? ov.sms.slice(0, 2000) : null,
        email: typeof ov.email === 'string' ? ov.email.slice(0, 6000) : null
      }
    };
  }

  function normalize(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== 'object') return base;
    const out = { ...base };
    if (raw.theme === 'light' || raw.theme === 'dark') out.theme = raw.theme;
    out.seenGuide = !!raw.seenGuide;
    out.queueFilter = ['all', 'pending', 'asked', 'done'].includes(raw.queueFilter) ? raw.queueFilter : 'all';
    const biz = raw.business && typeof raw.business === 'object' ? raw.business : {};
    out.business = {
      name: String(biz.name ?? '').slice(0, 60),
      sender: String(biz.sender ?? '').slice(0, 40),
      platform: ['Google', 'Yelp', 'Facebook', 'Nextdoor', 'Other'].includes(biz.platform) ? biz.platform : 'Google'
    };
    out.customers = Array.isArray(raw.customers)
      ? raw.customers.map(normalizeCustomer).filter(Boolean).slice(0, 500)
      : [];
    out.selectedId = out.customers.some((c) => c.id === raw.selectedId)
      ? raw.selectedId
      : (out.customers[0] ? out.customers[0].id : null);
    return out;
  }

  function load() {
    try { return normalize(JSON.parse(localStorage.getItem(LS_KEY))); }
    catch { return normalize(null); }
  }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage blocked */ }
    }, 250);
  }

  function selected() { return state.customers.find((c) => c.id === state.selectedId) || null; }

  // ---------------------------------------------------------------- domain: drafts
  const BIZ_WORD = /\b(inc|llc|ltd|co|corp|company|group|hoa|dental|clinic|office|services|properties|associates)\b/i;
  function firstName(name) {
    const n = String(name || '').trim();
    if (!n) return 'there';
    if (BIZ_WORD.test(n)) return n;
    return n.split(/\s+/)[0];
  }

  function platformLabel(biz) { return biz.platform === 'Other' ? '' : biz.platform; }
  function endStop(s) { return /[.!?]$/.test(s) ? s : s + '.'; }

  function smsDraft(c, biz) {
    const n = firstName(c.name);
    const job = c.job || 'the recent job';
    const bizName = biz.name || 'us';
    const sender = biz.sender;
    const plat = platformLabel(biz);
    const openers = {
      warm: `Hi ${n}, thanks again for letting ${bizName} take care of ${job}.`,
      grateful: `Hi ${n}, it's ${sender || 'the owner'} at ${bizName} — a personal thank-you for trusting us with ${job}.`,
      tech: `Hi ${n}, this is ${sender || 'the office'} at ${bizName} — our tech said ${job} wrapped up well and wanted us to pass along thanks.`,
      low: `Hi ${n} — no pressure at all, just a thank-you for choosing ${bizName} for ${job}.`,
      pro: `Hello ${n}, thank you for working with ${bizName} on ${job}.`
    };
    const ask = plat
      ? `If it felt worth recommending, an honest ${plat} review would help neighbors find us. Either way, thanks — and if anything's off, just reply and we'll make it right.`
      : `If it felt worth recommending, a short honest review would help others find us. Either way, thanks — and if anything's off, just reply and we'll make it right.`;
    const detail = String(c.detail || '').trim();
    const detailSentence = detail ? ` ${endStop(detail)}` : '';
    const full = `${openers[c.tone] || openers.warm}${detailSentence} ${ask}`;
    // Length-aware: drop the detail sentence if the message runs past the soft limit.
    return (full.length > SMS_SOFT_LIMIT && detailSentence)
      ? `${openers[c.tone] || openers.warm} ${ask}`
      : full;
  }

  function emailDraft(c, biz) {
    const n = firstName(c.name);
    const job = c.job || 'the recent job';
    const bizName = biz.name || 'our team';
    const sender = biz.sender;
    const plat = platformLabel(biz);
    const subjects = {
      warm: `Thank you from ${bizName}`,
      grateful: `A personal thank-you from ${sender || 'the owner'}`,
      tech: `Following up on your ${job}`,
      low: `A small favor — zero obligation`,
      pro: `Thank you for your business — one quick request`
    };
    const openers = {
      warm: `Thank you again for letting us take care of ${job} — we really appreciate it.`,
      grateful: `This is ${sender || 'the owner'} writing personally. Thank you for trusting ${bizName} with ${job}; jobs like yours are why we do this work.`,
      tech: `Our technician mentioned that ${job} wrapped up nicely and asked me to pass along their thanks.`,
      low: `Just a short note to say thank you for choosing ${bizName} for ${job}. There is no obligation attached to this email.`,
      pro: `Thank you for partnering with ${bizName} on ${job}. We appreciated the clear communication throughout.`
    };
    const detail = String(c.detail || '').trim();
    const detailPara = detail ? `One detail that stood out on our end: ${endStop(detail)}` : '';
    const askPara = plat
      ? `If you feel we earned it, would you be willing to share a short, honest review on ${plat}? Even a sentence or two helps the next customer know what to expect.`
      : `If you feel we earned it, would you be willing to share a short, honest review wherever you found us? Even a sentence or two helps the next customer know what to expect.`;
    const fixPara = `And if anything about the job doesn't feel right, please reply to this email first — we'd much rather fix it than have you settle for less than you paid for.`;
    const signoff = `Thanks again,\n${sender || bizName}${sender && biz.name ? '\n' + biz.name : ''}`;
    const body = [`Hi ${n},`, openers[c.tone] || openers.warm, detailPara, askPara, fixPara, signoff]
      .filter(Boolean).join('\n\n');
    return { subject: subjects[c.tone] || subjects.warm, body };
  }

  function generatedDraft(c, channel) {
    if (channel === 'email') {
      const e = emailDraft(c, state.business);
      return `Subject: ${e.subject}\n\n${e.body}`;
    }
    return smsDraft(c, state.business);
  }

  function effectiveDraft(c, channel) {
    const ov = c.overrides ? c.overrides[channel] : null;
    return (typeof ov === 'string') ? ov : generatedDraft(c, channel);
  }

  function smsSegments(len) { return len === 0 ? 0 : (len <= 160 ? 1 : Math.ceil(len / 153)); }

  // ---------------------------------------------------------------- domain: lint
  const LINT_RULES = [
    {
      level: 'block', name: 'Incentive offered',
      test: (t) => /\b(discount|free|gift|coupon|voucher|\d+\s?% ?off|in exchange|reward|raffle|prize|credit toward)\b/i.test(t),
      tip: 'Paying or rewarding for reviews violates Google/Yelp policy and can get listings penalized. Remove the offer.'
    },
    {
      level: 'block', name: 'Star begging',
      test: (t) => /\b(5|five)[\s-]?stars?\b/i.test(t),
      tip: 'Never name a rating. Ask for an honest review and let the customer choose the stars.'
    },
    {
      level: 'warn', name: 'Review gating',
      test: (t) => /\bif you(?:'re| are| were)? (happy|satisfied|pleased)\b[^.!?]*\breview\b/i.test(t),
      tip: 'Conditioning the ask on happiness reads as review gating. Keep the ask unconditional and honest.'
    },
    {
      level: 'warn', name: 'Pressure language',
      test: (t) => /\b(really need|need you to|you must|urgent|asap|right away|last chance|don't forget|make sure (you|to))\b/i.test(t),
      tip: 'Urgency turns a favor into a demand. A review is optional — say so or imply it.'
    },
    {
      level: 'warn', name: 'Guilt framing',
      test: (t) => /\b(mean the world|keep the lights on|struggling|small business needs|beg(ging)?|help us survive)\b/i.test(t),
      tip: 'Guilt gets pity clicks, not honest reviews. Keep the tone grateful, not needy.'
    },
    {
      level: 'warn', name: 'Shouting',
      test: (t) => /!{2,}/.test(t) || /\b[A-Z]{5,}\b/.test(t),
      tip: 'Multiple exclamation marks or ALL-CAPS words read as pushy. One calm sentence works better.'
    },
    {
      level: 'warn', name: 'Over-asking',
      test: (t) => (t.match(/review/gi) || []).length > 2,
      tip: 'The word "review" appears more than twice. One clear ask is enough.'
    },
    {
      level: 'warn', name: 'Too long for SMS', channel: 'sms',
      test: (t) => t.length > SMS_SOFT_LIMIT,
      tip: `Over ${SMS_SOFT_LIMIT} characters (3+ SMS segments). Trim it — short texts get read.`
    },
    {
      level: 'warn', name: 'Email runs long', channel: 'email',
      test: (t) => t.length > EMAIL_SOFT_LIMIT,
      tip: 'A review ask should be skimmable in ten seconds. Cut it down.'
    },
    {
      level: 'warn', name: 'Generic message',
      test: (t, c) => !String(c.detail || '').trim(),
      tip: 'No specific job detail on file. Add one concrete detail so this does not feel like a mass blast.'
    }
  ];

  function lintDraft(text, c, channel) {
    const t = String(text || '');
    return LINT_RULES
      .filter((r) => !r.channel || r.channel === channel)
      .filter((r) => r.test(t, c))
      .map((r) => ({ level: r.level, name: r.name, tip: r.tip }));
  }

  // ---------------------------------------------------------------- domain: timing
  function timingAdvice(c) {
    const checks = [];
    const d = daysSince(c.completedDate);
    let verdict = 'ready';
    const push = (level, title, msg) => {
      checks.push({ level, title, msg });
      if (level === 'fail') verdict = 'hold';
      else if (level === 'warn' && verdict !== 'hold') verdict = 'wait';
    };

    if (d < 1) push('fail', 'Cooling-off window', 'Asking on the day of the job feels transactional. Wait until at least tomorrow so the result has sunk in.');
    else if (d <= 7) push('pass', 'Prime window', `${d} day${d === 1 ? '' : 's'} since completion — the result is fresh and the goodwill is real. Ask now.`);
    else if (d <= 14) push('warn', 'Window narrowing', `${d} days since completion. Still fine, but name the job specifically so they remember exactly what went well.`);
    else push('fail', 'Gone stale', `${d} days since completion. Memory has faded; consider skipping, or send a softer "is everything still working?" note instead of an ask.`);

    if (c.satisfaction === 'issue') push('fail', 'Open issue', 'They had a problem. Fix it first — an ask now invites a bad review and deserves one.');
    else if (c.satisfaction === 'neutral') push('warn', 'Unclear mood', 'No positive signal yet. Check in about the job first; only ask once you hear something good.');
    else push('pass', 'Earned it', `"${SATISFACTIONS[c.satisfaction]}" is a genuine positive signal — the ask is earned, not extracted.`);

    if (String(c.detail || '').trim().length >= 12) push('pass', 'Specific proof', 'The draft carries a concrete job detail, so it reads personal instead of automated.');
    else push('warn', 'Add a detail', 'One specific detail ("finished early", "left the crawlspace cleaner than we found it") separates a favor from spam.');

    if (c.channel === 'sms') push('pass', 'SMS timing', 'Best sent weekdays 10am–5pm local. Avoid before 9am, after 8pm, and Sunday mornings.');
    else push('pass', 'Email timing', 'Best sent Tuesday–Thursday mid-morning. Avoid the Monday inbox pile-up and weekends.');

    if (c.status === 'asked') {
      const ad = c.askedDate ? daysSince(c.askedDate) : 0;
      if (ad < 7) push('warn', 'Already asked', `Asked ${ad} day${ad === 1 ? '' : 's'} ago. Give it a full week before even thinking about a follow-up.`);
      else if (ad <= 30) push('warn', 'Follow-up window', `Asked ${ad} days ago with no review yet. One gentle follow-up is acceptable — and only one.`);
      else push('fail', 'Let it go', `Asked ${ad} days ago. Repeated asks damage trust more than a missing review costs. Close this one out.`);
    }

    if (c.status === 'asked') verdict = 'asked';
    else if (c.status === 'reviewed' || c.status === 'skipped') verdict = 'done';
    return { verdict, checks, days: d };
  }

  function verdictLabel(c) {
    if (c.status === 'reviewed') return { key: 'done', label: 'Reviewed' };
    if (c.status === 'skipped') return { key: 'done', label: 'Skipped' };
    if (c.status === 'asked') return { key: 'asked', label: 'Asked' };
    const v = timingAdvice(c).verdict;
    return v === 'ready' ? { key: 'ready', label: 'Ready' }
      : v === 'wait' ? { key: 'wait', label: 'Not yet' }
        : { key: 'hold', label: 'Hold' };
  }

  function computeStats() {
    let ready = 0, hold = 0, asked = 0, reviewed = 0;
    for (const c of state.customers) {
      if (c.status === 'asked') asked++;
      else if (c.status === 'reviewed') reviewed++;
      else if (c.status === 'pending') {
        if (timingAdvice(c).verdict === 'ready') ready++; else hold++;
      }
    }
    return { ready, hold, asked, reviewed };
  }

  // ---------------------------------------------------------------- exports
  const STATUS_RANK = { pending: 0, asked: 1, reviewed: 2, skipped: 3 };
  function sortedCustomers() {
    return state.customers.slice().sort((a, b) => {
      const s = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      if (s) return s;
      return daysSince(b.completedDate) - daysSince(a.completedDate);
    });
  }

  function mdPacket() {
    const biz = state.business;
    const lines = [
      '# Review request packet' + (biz.name ? ` — ${biz.name}` : ''),
      '',
      `Generated: ${new Date().toLocaleString()}`,
      `Platform: ${biz.platform}${biz.sender ? ` · Sender: ${biz.sender}` : ''}`,
      'Boundary: drafts only. A human reviews, personalizes, and sends every message manually.',
      ''
    ];
    const c = selected();
    if (c) {
      const t = timingAdvice(c);
      const v = verdictLabel(c);
      const sms = effectiveDraft(c, 'sms');
      const seg = smsSegments(sms.length);
      const findings = lintDraft(effectiveDraft(c, c.channel), c, c.channel);
      lines.push(`## Selected ask — ${c.name || 'Unnamed customer'}`, '');
      lines.push(`- Job: ${c.job || '—'}`);
      lines.push(`- Completed: ${c.completedDate} (${t.days} day${t.days === 1 ? '' : 's'} ago)`);
      lines.push(`- Satisfaction: ${SATISFACTIONS[c.satisfaction]}`);
      lines.push(`- Tone: ${TONES[c.tone]} · Preferred channel: ${CHANNELS[c.channel]}`);
      lines.push(`- Timing verdict: ${v.label}`);
      lines.push(`- Pressure lint: ${findings.length ? findings.map((f) => `${f.level.toUpperCase()} ${f.name}`).join('; ') : 'clean'}`);
      lines.push('', '### SMS variant', '', '```', sms, '```',
        `(${sms.length} chars · ${seg} segment${seg === 1 ? '' : 's'})`, '');
      lines.push('### Email variant', '', '```', effectiveDraft(c, 'email'), '```', '');
      lines.push('### Timing advisor', '');
      t.checks.forEach((ch) => lines.push(`- [${ch.level.toUpperCase()}] ${ch.title}: ${ch.msg}`));
      lines.push('');
    }
    lines.push('## Pending-ask queue', '');
    if (!state.customers.length) {
      lines.push('_Queue is empty._');
    } else {
      lines.push('| Customer | Job | Completed | Days | Channel | Status | Verdict |');
      lines.push('| --- | --- | --- | --- | --- | --- | --- |');
      sortedCustomers().forEach((cu) => {
        lines.push(`| ${cu.name || '—'} | ${cu.job || '—'} | ${cu.completedDate} | ${daysSince(cu.completedDate)} | ${CHANNELS[cu.channel]} | ${cu.status} | ${verdictLabel(cu).label} |`);
      });
    }
    lines.push('', '---', 'Review Request Composer · local-first · manual send only.');
    return lines.join('\n');
  }

  function csvPacket() {
    const head = ['customer', 'job', 'completed_date', 'days_since', 'channel', 'tone', 'satisfaction', 'status', 'verdict', 'asked_date'];
    const rows = sortedCustomers().map((c) => [
      c.name, c.job, c.completedDate, daysSince(c.completedDate), CHANNELS[c.channel],
      TONES[c.tone], SATISFACTIONS[c.satisfaction], c.status, verdictLabel(c).label, c.askedDate || ''
    ]);
    return [head, ...rows]
      .map((r) => r.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n');
  }

  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  function copyText(text, okMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => showToast(okMsg))
        .catch(() => showToast('Copy blocked — select the text manually.'));
    } else {
      showToast('Clipboard unavailable — select the text manually.');
    }
  }

  // ---------------------------------------------------------------- rendering
  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    const btn = $('themeToggle');
    btn.setAttribute('aria-pressed', state.theme === 'light' ? 'true' : 'false');
    btn.innerHTML = state.theme === 'light' ? '&#9788; Light' : '&#9789; Dark';
  }

  function renderStats() {
    const s = computeStats();
    $('statReady').textContent = s.ready;
    $('statHold').textContent = s.hold;
    $('statAsked').textContent = s.asked;
    $('statReviewed').textContent = s.reviewed;
  }

  function filteredCustomers() {
    const f = state.queueFilter;
    return sortedCustomers().filter((c) => {
      if (f === 'pending') return c.status === 'pending';
      if (f === 'asked') return c.status === 'asked';
      if (f === 'done') return c.status === 'reviewed' || c.status === 'skipped';
      return true;
    });
  }

  function renderQueue() {
    const list = $('customerList');
    const items = filteredCustomers();
    if (!state.customers.length) {
      list.innerHTML = `<div class="empty-state empty-mini" role="listitem">
        <p><strong>Queue is empty.</strong></p>
        <p>Add a completed job, or load the demo.</p>
        <div class="empty-actions">
          <button class="btn btn-primary" type="button" data-action="add">+ Add customer</button>
          <button class="btn" type="button" data-action="demo">Load demo</button>
        </div></div>`;
      return;
    }
    if (!items.length) {
      list.innerHTML = `<div class="empty-state empty-mini" role="listitem"><p>Nothing matches this filter.</p></div>`;
      return;
    }
    list.innerHTML = items.map((c) => {
      const v = verdictLabel(c);
      const d = daysSince(c.completedDate);
      return `<button type="button" role="listitem" class="customer-card ${c.id === state.selectedId ? 'active' : ''}" data-select="${esc(c.id)}">
        <strong>${esc(c.name || 'Unnamed customer')}</strong>
        <small>${esc(c.job || 'No job noted')} · ${d} day${d === 1 ? '' : 's'} ago</small>
        <span class="badge-row">
          <span class="badge ${v.key}">${esc(v.label)}</span>
          <span class="badge">${esc(CHANNELS[c.channel])}</span>
        </span>
      </button>`;
    }).join('');
  }

  function renderComposerFields() {
    const c = selected();
    const empty = !c;
    $('composerEmpty').classList.toggle('hidden', !empty);
    $('composerBody').classList.toggle('hidden', empty);
    if (empty) return;
    $('composerTitle').textContent = c.name || 'New customer';
    $('custName').value = c.name;
    $('custName').classList.toggle('invalid', !c.name.trim());
    $('custJob').value = c.job;
    $('custJob').classList.toggle('invalid', !c.job.trim());
    $('custDate').value = c.completedDate;
    $('custSatisfaction').value = c.satisfaction;
    $('custTone').value = c.tone;
    $('custDetail').value = c.detail;
    renderChannelTabs();
    renderDraft();
    renderStatusButtons();
  }

  function renderChannelTabs() {
    const c = selected(); if (!c) return;
    $('chanSms').setAttribute('aria-pressed', c.channel === 'sms' ? 'true' : 'false');
    $('chanEmail').setAttribute('aria-pressed', c.channel === 'email' ? 'true' : 'false');
  }

  function renderDraft() {
    const c = selected(); if (!c) return;
    $('draftText').value = effectiveDraft(c, c.channel);
    renderDraftDerived();
  }

  function renderDraftDerived() {
    const c = selected(); if (!c) return;
    const text = $('draftText').value;
    const meta = $('draftMeta');
    if (c.channel === 'sms') {
      const seg = smsSegments(text.length);
      meta.textContent = `${text.length} chars · ${seg} SMS segment${seg === 1 ? '' : 's'}`;
    } else {
      const words = (text.trim().match(/\S+/g) || []).length;
      meta.textContent = `${text.length} chars · ${words} words · ~${Math.max(1, Math.round(words / 220 * 60))}s read`;
    }
    const edited = typeof c.overrides[c.channel] === 'string';
    $('regenBtn').disabled = !edited;
    $('regenBtn').textContent = edited ? 'Regenerate (discard edits)' : 'Regenerate';
    renderLint();
    renderVerdict();
  }

  function renderLint() {
    const c = selected(); if (!c) return;
    const findings = lintDraft($('draftText').value, c, c.channel);
    const badge = $('lintBadge');
    const blocks = findings.filter((f) => f.level === 'block').length;
    if (!findings.length) { badge.textContent = 'Clean'; badge.className = 'pill clean'; }
    else if (blocks) { badge.textContent = `${blocks} blocker${blocks === 1 ? '' : 's'}`; badge.className = 'pill block'; }
    else { badge.textContent = `${findings.length} warning${findings.length === 1 ? '' : 's'}`; badge.className = 'pill warn'; }
    $('lintList').innerHTML = findings.length
      ? findings.map((f) => `<li class="${f.level}"><strong>${f.level === 'block' ? 'Blocker' : 'Warning'} · ${esc(f.name)}</strong><span>${esc(f.tip)}</span></li>`).join('')
      : `<li class="clean">No pressure patterns found. The ask is honest, optional, and specific — send-worthy once the timing checks pass.</li>`;
  }

  function renderVerdict() {
    const c = selected(); if (!c) return;
    const v = verdictLabel(c);
    $('verdictPill').textContent = v.label;
    $('verdictPill').className = `pill ${v.key === 'done' ? '' : v.key}`;
  }

  function renderTiming() {
    const c = selected();
    const list = $('timingList');
    const verdict = $('timingVerdict');
    if (!c) {
      verdict.textContent = 'Select a customer to see timing guidance.';
      list.innerHTML = '';
      return;
    }
    const t = timingAdvice(c);
    const msgs = {
      ready: 'Green light — this ask is earned and inside the prime window.',
      wait: 'Almost — resolve the flagged items before sending.',
      hold: 'Hold — do not send this one yet.',
      asked: 'Already asked — watch the follow-up guidance below.',
      done: c.status === 'reviewed'
        ? 'Closed — the review landed. Nothing more to send.'
        : 'Closed — skipped by choice. No further asks.'
    };
    verdict.textContent = msgs[t.verdict] || msgs.wait;
    list.innerHTML = t.checks.map((ch) =>
      `<li class="${ch.level}"><strong>${esc(ch.title)}</strong><span>${esc(ch.msg)}</span></li>`).join('');
  }

  function renderStatusButtons() {
    const c = selected(); if (!c) return;
    const pending = c.status === 'pending';
    $('markAskedBtn').classList.toggle('hidden', !pending);
    $('markSkipBtn').classList.toggle('hidden', !pending);
    $('markReviewedBtn').classList.toggle('hidden', c.status !== 'asked');
    $('reopenBtn').classList.toggle('hidden', pending);
  }

  function renderBusiness() {
    $('bizName').value = state.business.name;
    $('senderName').value = state.business.sender;
    $('platform').value = state.business.platform;
    $('queueFilter').value = state.queueFilter;
  }

  function renderExport() {
    $('exportPreview').textContent = mdPacket();
  }

  function renderAll() {
    applyTheme();
    renderBusiness();
    renderStats();
    renderQueue();
    renderComposerFields();
    renderTiming();
    renderExport();
    save();
  }

  // Keystroke-level refresh that leaves the form inputs alone.
  function renderDerived() {
    renderStats();
    renderQueue();
    renderTiming();
    renderExport();
    save();
  }

  // ---------------------------------------------------------------- toast / undo
  function showToast(msg, undoFn) {
    const toast = $('toast');
    const action = $('toastAction');
    $('toastMsg').textContent = msg;
    clearTimeout(toastTimer);
    if (undoFn) {
      action.classList.remove('hidden');
      action.onclick = () => { undoFn(); hideToast(); };
    } else {
      action.classList.add('hidden');
      action.onclick = null;
    }
    toast.classList.add('show');
    toastTimer = setTimeout(hideToast, undoFn ? 7000 : 2200);
  }
  function hideToast() { $('toast').classList.remove('show'); }

  // ---------------------------------------------------------------- actions
  function addCustomer() {
    const c = normalizeCustomer({
      id: uid(), name: '', job: '', completedDate: daysAgoIso(1),
      satisfaction: 'happy', tone: 'warm', channel: 'sms', detail: '', status: 'pending'
    });
    state.customers.unshift(c);
    state.selectedId = c.id;
    state.queueFilter = 'all';
    renderAll();
    $('custName').focus();
    showToast('Customer added — fill in the job facts.');
  }

  function deleteSelected() {
    const c = selected(); if (!c) return;
    const idx = state.customers.indexOf(c);
    lastDeleted = { item: c, index: idx };
    state.customers.splice(idx, 1);
    state.selectedId = state.customers.length
      ? state.customers[Math.min(idx, state.customers.length - 1)].id
      : null;
    renderAll();
    showToast(`Deleted ${c.name || 'customer'}.`, () => {
      if (!lastDeleted) return;
      state.customers.splice(Math.min(lastDeleted.index, state.customers.length), 0, lastDeleted.item);
      state.selectedId = lastDeleted.item.id;
      lastDeleted = null;
      renderAll();
      showToast('Restored.');
    });
  }

  function setStatus(status) {
    const c = selected(); if (!c) return;
    c.status = status;
    if (status === 'asked') c.askedDate = todayIso();
    if (status === 'pending') c.askedDate = null;
    renderComposerFields();
    renderDerived();
    const msgs = {
      asked: 'Logged as asked — you sent it yourself; the app just keeps score.',
      reviewed: 'Review landed. Nice.',
      skipped: 'Skipped — no ask for this one.',
      pending: 'Back in the queue.'
    };
    showToast(msgs[status] || 'Status updated.');
  }

  function loadDemo() {
    const demo = normalize({
      theme: state.theme,
      seenGuide: state.seenGuide,
      business: { name: 'Lakeside Plumbing & Air', sender: 'Sam', platform: 'Google' },
      customers: [
        { id: 'd1', name: 'Maya Patel', job: 'tankless water heater replacement', completedDate: daysAgoIso(2), satisfaction: 'happy', tone: 'warm', channel: 'sms', detail: 'Install finished a day early and the crew left the utility room cleaner than they found it.', status: 'pending' },
        { id: 'd2', name: 'Northside Dental LLC', job: 'after-hours HVAC repair', completedDate: daysAgoIso(3), satisfaction: 'solved', tone: 'pro', channel: 'email', detail: 'The office reopened on schedule and your manager thanked our tech for the hourly updates.', status: 'pending' },
        { id: 'd3', name: 'Avery Chen', job: 'annual maintenance plan visit', completedDate: daysAgoIso(9), satisfaction: 'repeat', tone: 'low', channel: 'sms', detail: 'Second visit this year with zero callbacks.', status: 'asked', askedDate: daysAgoIso(8) },
        { id: 'd4', name: 'Rob Kowalski', job: 'sump pump install', completedDate: daysAgoIso(12), satisfaction: 'happy', tone: 'grateful', channel: 'email', detail: 'The basement stayed dry through last week’s storm — Rob texted a photo to say thanks.', status: 'reviewed', askedDate: daysAgoIso(10) },
        { id: 'd5', name: 'Cedar Lane HOA', job: 'clubhouse panel upgrade', completedDate: daysAgoIso(0), satisfaction: 'neutral', tone: 'tech', channel: 'email', detail: '', status: 'pending' },
        { id: 'd6', name: 'Dana Whitfield', job: 'garbage disposal swap', completedDate: daysAgoIso(1), satisfaction: 'issue', tone: 'warm', channel: 'sms', detail: 'Mentioned a lingering rattle — tech is scheduled to recheck Thursday.', status: 'pending' }
      ]
    });
    demo.selectedId = 'd1';
    state = demo;
    renderAll();
    showToast('Demo loaded — six jobs in various states.');
  }

  function resetAll() {
    if (!window.confirm('Reset everything? This clears the queue and business profile from this browser.')) return;
    const theme = state.theme;
    state = defaultState();
    state.theme = theme;
    state.seenGuide = true;
    renderAll();
    showToast('Reset. Clean slate.');
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        state = normalize(parsed && typeof parsed.state === 'object' ? parsed.state : parsed);
        renderAll();
        showToast(`Imported ${state.customers.length} customer${state.customers.length === 1 ? '' : 's'}.`);
      } catch {
        showToast('Import failed — that file is not valid JSON.');
      }
    };
    reader.onerror = () => showToast('Could not read that file.');
    reader.readAsText(file);
  }

  // ---------------------------------------------------------------- help modal
  function openHelp() {
    lastFocus = document.activeElement;
    const dlg = $('helpModal');
    if (!dlg.open) dlg.showModal();
    $('helpCloseBtn').focus();
  }
  function closeHelp() {
    const dlg = $('helpModal');
    if (dlg.open) dlg.close();
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  // ---------------------------------------------------------------- wiring
  function updateSelectedFromField(key, value) {
    const c = selected(); if (!c) return;
    c[key] = value;
    renderDraft();      // regenerates unless the channel draft is overridden
    renderDerived();
  }

  function setChannel(ch) {
    const c = selected(); if (!c || c.channel === ch) return;
    c.channel = ch;
    renderChannelTabs();
    renderDraft();
    renderDerived();
  }

  function refreshAfterBusinessEdit() {
    if (selected()) renderDraft();
    renderDerived();
  }

  function wire() {
    $('themeToggle').addEventListener('click', () => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      applyTheme(); save();
    });
    $('helpBtn').addEventListener('click', openHelp);
    $('helpCloseBtn').addEventListener('click', closeHelp);
    $('helpModal').addEventListener('cancel', (e) => { e.preventDefault(); closeHelp(); });
    $('helpModal').addEventListener('click', (e) => { if (e.target === $('helpModal')) closeHelp(); });
    $('demoBtn').addEventListener('click', loadDemo);
    $('addCustomerBtn').addEventListener('click', addCustomer);
    $('resetBtn').addEventListener('click', resetAll);

    // Queue: delegation for select + empty-state actions
    $('customerList').addEventListener('click', (e) => {
      const sel = e.target.closest('[data-select]');
      if (sel) {
        state.selectedId = sel.dataset.select;
        renderQueue(); renderComposerFields(); renderTiming(); renderExport(); save();
        return;
      }
      const act = e.target.closest('[data-action]');
      if (act) (act.dataset.action === 'add' ? addCustomer : loadDemo)();
    });
    $('composerEmpty').addEventListener('click', (e) => {
      const act = e.target.closest('[data-action]');
      if (act) (act.dataset.action === 'add' ? addCustomer : loadDemo)();
    });
    $('queueFilter').addEventListener('change', () => {
      state.queueFilter = $('queueFilter').value;
      renderQueue(); save();
    });

    // Business profile
    $('bizName').addEventListener('input', () => { state.business.name = $('bizName').value; refreshAfterBusinessEdit(); });
    $('senderName').addEventListener('input', () => { state.business.sender = $('senderName').value; refreshAfterBusinessEdit(); });
    $('platform').addEventListener('change', () => { state.business.platform = $('platform').value; refreshAfterBusinessEdit(); });

    // Composer fields
    $('custName').addEventListener('input', () => {
      const v = $('custName').value;
      $('custName').classList.toggle('invalid', !v.trim());
      const c = selected(); if (!c) return;
      c.name = v;
      $('composerTitle').textContent = v || 'New customer';
      renderDraft(); renderDerived();
    });
    $('custJob').addEventListener('input', () => {
      $('custJob').classList.toggle('invalid', !$('custJob').value.trim());
      updateSelectedFromField('job', $('custJob').value);
    });
    $('custDate').addEventListener('change', () => {
      let v = $('custDate').value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) v = todayIso();
      if (v > todayIso()) { v = todayIso(); showToast('Completed date can’t be in the future — clamped to today.'); }
      $('custDate').value = v;
      updateSelectedFromField('completedDate', v);
    });
    $('custSatisfaction').addEventListener('change', () => updateSelectedFromField('satisfaction', $('custSatisfaction').value));
    $('custTone').addEventListener('change', () => updateSelectedFromField('tone', $('custTone').value));
    $('custDetail').addEventListener('input', () => updateSelectedFromField('detail', $('custDetail').value));

    // Channel tabs
    $('chanSms').addEventListener('click', () => setChannel('sms'));
    $('chanEmail').addEventListener('click', () => setChannel('email'));

    // Draft editing → per-channel override
    $('draftText').addEventListener('input', () => {
      const c = selected(); if (!c) return;
      const text = $('draftText').value;
      c.overrides[c.channel] = (text === generatedDraft(c, c.channel)) ? null : text;
      renderDraftDerived();
      renderStats(); renderExport(); save();
    });
    $('regenBtn').addEventListener('click', () => {
      const c = selected(); if (!c) return;
      c.overrides[c.channel] = null;
      renderDraft(); renderDerived();
      showToast('Draft regenerated from the template.');
    });
    $('copyDraftBtn').addEventListener('click', () => {
      const c = selected(); if (!c) return;
      copyText($('draftText').value, `${CHANNELS[c.channel]} draft copied — paste it into your own ${c.channel === 'sms' ? 'messages app' : 'email client'} to send.`);
    });

    // Status actions
    $('markAskedBtn').addEventListener('click', () => setStatus('asked'));
    $('markReviewedBtn').addEventListener('click', () => setStatus('reviewed'));
    $('markSkipBtn').addEventListener('click', () => setStatus('skipped'));
    $('reopenBtn').addEventListener('click', () => setStatus('pending'));
    $('deleteBtn').addEventListener('click', deleteSelected);

    // Export & handoff
    $('copyMdBtn').addEventListener('click', () => copyText(mdPacket(), 'Markdown packet copied.'));
    $('downloadJsonBtn').addEventListener('click', () => {
      download('review-request-composer.json', JSON.stringify({
        app: 'review-request-composer', version: 1,
        exportedAt: new Date().toISOString(),
        boundary: 'Drafts only — a human sends every message manually.',
        state
      }, null, 2), 'application/json');
      showToast('JSON downloaded.');
    });
    $('importBtn').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', () => {
      const file = $('importFile').files && $('importFile').files[0];
      if (file) importJson(file);
      $('importFile').value = '';
    });
    $('downloadCsvBtn').addEventListener('click', () => {
      download('review-request-queue.csv', csvPacket(), 'text/csv');
      showToast('CSV downloaded.');
    });
    $('printBtn').addEventListener('click', () => { renderExport(); window.print(); });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      const typing = /^(input|textarea|select)$/i.test(tag);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        copyText(mdPacket(), 'Markdown packet copied.');
        return;
      }
      if (e.key === '?' && !typing && !$('helpModal').open) { e.preventDefault(); openHelp(); }
      if (e.key === 'Escape' && $('helpModal').open) closeHelp();
    });
  }

  // ---------------------------------------------------------------- init
  function init() {
    wire();
    renderAll();
    if (!state.seenGuide) {
      state.seenGuide = true;
      save();
      openHelp();
    }
  }

  init();
})();
