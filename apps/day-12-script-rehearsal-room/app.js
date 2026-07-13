/* Script Rehearsal Room — remake.
   Local-first rehearsal studio for sales & discovery calls:
   talk-track builder, objection flashcard drills, paced timer, scored session history.
   Draft-only: never calls, records, sends, or writes to a CRM. */
(() => {
  'use strict';

  /* ================= constants ================= */

  const LS_KEY = 'fable-remake:day-12-script-rehearsal-room:v1';
  const WPM = 140; // assumed speaking pace, words per minute
  const CALL_TYPES = ['Discovery', 'Follow-up', 'Pilot pitch', 'Demo', 'Objection clinic', 'Renewal / save'];
  const SCORE_KEYS = ['opening', 'discovery', 'objections', 'close'];
  const SCORE_LABELS = { opening: 'Open', discovery: 'Disc', objections: 'Objn', close: 'Close' };

  const $ = (id) => document.getElementById(id);

  /* ================= generic helpers ================= */

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const countWords = (s) => (String(s || '').trim().match(/\S+/g) || []).length;
  const fmtTime = (sec) => {
    sec = Math.max(0, Math.round(sec));
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  };
  const nowIso = () => new Date().toISOString();
  const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
  const int = (v, lo, hi, dflt) => {
    const n = Number(v);
    return Number.isFinite(n) ? clamp(Math.round(n), lo, hi) : dflt;
  };

  /* ================= state ================= */

  function defaultSections() {
    return ['Opening', 'Discovery questions', 'Value story', 'Objection handling', 'Close & next step']
      .map((title) => ({ id: uid(), title, cards: [] }));
  }

  function defaultState() {
    return {
      version: 1,
      theme: null, // null => follow prefers-color-scheme
      seenGuide: false,
      scenario: { callType: 'Discovery', prospect: '', objective: '', boundary: '' },
      sections: defaultSections(),
      objections: [],
      targetMinutes: 6,
      sessions: [] // newest first
    };
  }

  function normalize(raw) {
    const s = defaultState();
    if (!raw || typeof raw !== 'object') return s;
    s.theme = raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : null;
    s.seenGuide = !!raw.seenGuide;
    const sc = raw.scenario && typeof raw.scenario === 'object' ? raw.scenario : {};
    s.scenario = {
      callType: CALL_TYPES.includes(sc.callType) ? sc.callType : 'Discovery',
      prospect: str(sc.prospect, 120),
      objective: str(sc.objective, 160),
      boundary: str(sc.boundary, 600)
    };
    if (Array.isArray(raw.sections)) {
      s.sections = raw.sections.slice(0, 12).map((sec) => ({
        id: str(sec && sec.id, 20) || uid(),
        title: str(sec && sec.title, 60) || 'Untitled section',
        cards: Array.isArray(sec && sec.cards)
          ? sec.cards.slice(0, 20).map((c) => ({
              id: str(c && c.id, 20) || uid(),
              cue: str(c && c.cue, 80),
              line: str(c && c.line, 600)
            }))
          : []
      }));
    }
    if (Array.isArray(raw.objections)) {
      s.objections = raw.objections.slice(0, 30).map((o) => ({
        id: str(o && o.id, 20) || uid(),
        front: str(o && o.front, 160),
        back: str(o && o.back, 400),
        nailed: int(o && o.nailed, 0, 999, 0),
        needsWork: int(o && o.needsWork, 0, 999, 0)
      })).filter((o) => o.front);
    }
    s.targetMinutes = int(raw.targetMinutes, 1, 30, 6);
    if (Array.isArray(raw.sessions)) {
      s.sessions = raw.sessions.slice(0, 100).map((x) => ({
        id: str(x && x.id, 20) || uid(),
        date: typeof (x && x.date) === 'string' && !Number.isNaN(Date.parse(x.date)) ? x.date : nowIso(),
        durationSec: int(x && x.durationSec, 0, 36000, 0),
        scores: Object.fromEntries(SCORE_KEYS.map((k) => [k, int(x && x.scores && x.scores[k], 1, 5, 3)])),
        notes: str(x && x.notes, 400)
      }));
    }
    return s;
  }

  function load() {
    try { return normalize(JSON.parse(localStorage.getItem(LS_KEY))); }
    catch { return defaultState(); }
  }

  let state = load();
  let saveTimer = null;
  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
  }
  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 300);
  }

  /* ================= demo data ================= */

  function demoState() {
    const base = defaultState();
    base.theme = state.theme;
    base.seenGuide = true;
    base.scenario = {
      callType: 'Discovery',
      prospect: 'Dana — owner, North Star Plumbing',
      objective: 'Earn a two-week missed-call recovery pilot',
      boundary: 'No revenue promises. No automation or customer contact without explicit owner approval. Keep it a manual proof conversation.'
    };
    const S = (title, cards) => ({ id: uid(), title, cards: cards.map(([cue, line]) => ({ id: uid(), cue, line })) });
    base.sections = [
      S('Opening', [
        ['Permission + agenda', "Thanks for making time, Dana. I'd like ten minutes to understand how calls reach your office, share one idea, and let you decide if a tiny two-week test is worth it. Fair?"],
        ['Why I called', "I noticed your intake path leans on the front desk between jobs — I help trades shops recover the calls that slip through."]
      ]),
      S('Discovery questions', [
        ['Lead leaks', 'Where do good jobs most often stall right now — first call, quote, or follow-up?'],
        ['Busy hours', 'What happens to a call that comes in while both techs are on site and the office is slammed?'],
        ['Proof bar', 'If we ran a small test, what number would convince you it was worth fixing?']
      ]),
      S('Value story', [
        ['Similar shop', 'A two-truck shop tracked one week of missed calls: eleven missed, four were real jobs. A same-day callback script recovered three of them.'],
        ['Tiny pilot', 'The pilot is manual and owner-approved: we log one week of calls, then you decide. Nothing touches a customer without your sign-off.']
      ]),
      S('Objection handling', [
        ['Bridge line', "Totally fair — most owners say that. Can I show you what the two-week version looks like before you decide?"]
      ]),
      S('Close & next step', [
        ['The ask', "Can we pick one week this month to log calls? You keep the data either way — no commitment past that."],
        ['Confirm boundary', "I'll send a one-page recap for your approval before anything customer-facing happens."]
      ])
    ];
    base.objections = [
      { front: "We're too busy right now.", back: "That's exactly the week worth measuring. Setup costs you ten minutes — I do the logging.", nailed: 3, needsWork: 1 },
      { front: "We don't have budget for this.", back: 'The test is free to run. If the log shows nothing worth recovering, we shake hands and stop.', nailed: 2, needsWork: 2 },
      { front: 'How do I know this works?', back: "You don't yet — that's why we measure first. No claims until you've seen your own numbers.", nailed: 1, needsWork: 2 },
      { front: "We're not technical people.", back: "Nothing technical lands on you. It's a call log and a callback script — office workflow, not software.", nailed: 2, needsWork: 0 },
      { front: 'Send me some info instead.', back: 'Happy to — and info reads better with your own numbers in it. Can we log one week first?', nailed: 0, needsWork: 1 },
      { front: 'We already have an answering service.', back: "Great — then the log just tells you how well it's converting. If it's airtight, that's good news.", nailed: 0, needsWork: 0 }
    ].map((o) => ({ id: uid(), ...o }));
    base.targetMinutes = 6;
    const day = 86400000;
    base.sessions = [
      {
        id: uid(), date: new Date(Date.now() - day).toISOString(), durationSec: 371,
        scores: { opening: 4, discovery: 4, objections: 3, close: 4 },
        notes: 'Better. Pause after the proof story — let Dana react before the ask.'
      },
      {
        id: uid(), date: new Date(Date.now() - 3 * day).toISOString(), durationSec: 412,
        scores: { opening: 3, discovery: 4, objections: 2, close: 3 },
        notes: 'Rushed the opening and got tangled on the budget objection. Slow down.'
      }
    ];
    return normalize(base);
  }

  /* ================= domain logic (pure) ================= */

  function scriptStats() {
    const per = state.sections.map((sec) => {
      const w = sec.cards.reduce((n, c) => n + countWords(c.cue) + countWords(c.line), 0);
      return { id: sec.id, title: sec.title, words: w, sec: (w / WPM) * 60 };
    });
    const totalWords = per.reduce((n, p) => n + p.words, 0);
    const cardCount = state.sections.reduce((n, s) => n + s.cards.length, 0);
    return { per, totalWords, cardCount, estSec: (totalWords / WPM) * 60 };
  }

  function mastery() {
    const graded = state.objections.reduce((n, o) => n + o.nailed + o.needsWork, 0);
    const nailed = state.objections.reduce((n, o) => n + o.nailed, 0);
    return { graded, nailed, pct: graded ? Math.round((nailed / graded) * 100) : null };
  }

  function sessionAvg(sess) {
    return SCORE_KEYS.reduce((n, k) => n + sess.scores[k], 0) / SCORE_KEYS.length;
  }

  function readiness() {
    const sc = state.scenario;
    const ss = scriptStats();
    const m = mastery();
    let pts = 0;
    // scene: 20
    pts += sc.prospect.trim() ? 6 : 0;
    pts += sc.objective.trim().length >= 12 ? 7 : 0;
    pts += sc.boundary.trim().length >= 12 ? 7 : 0;
    // script: 30 (coverage + volume)
    const covered = state.sections.filter((s) => s.cards.length).length;
    pts += state.sections.length ? Math.round((covered / state.sections.length) * 15) : 0;
    pts += Math.min(15, Math.round(ss.totalWords / 20));
    // objections: 25 (deck size + drill mastery)
    pts += Math.min(10, state.objections.length * 2);
    pts += m.pct === null ? 0 : Math.round(m.pct * 0.15);
    // sessions: 25 (reps + latest self-score)
    pts += Math.min(10, state.sessions.length * 3);
    pts += state.sessions.length ? Math.round((sessionAvg(state.sessions[0]) / 5) * 15) : 0;
    return Math.min(100, pts);
  }

  function readinessBand(score) {
    return score >= 80 ? 'Call-ready' : score >= 55 ? 'One more pass' : 'Keep drilling';
  }

  // Section checkpoints scaled onto the target duration.
  function checkpoints() {
    const ss = scriptStats();
    const T = state.targetMinutes * 60;
    if (!ss.totalWords) return [];
    let cum = 0;
    return ss.per.filter((p) => p.words > 0).map((p) => {
      cum += p.words;
      return { title: p.title, at: (cum / ss.totalWords) * T };
    });
  }

  /* ================= exports (markdown / csv / print) ================= */

  function markdown() {
    const ss = scriptStats();
    const m = mastery();
    const sc = state.scenario;
    const T = state.targetMinutes * 60;
    const L = [];
    L.push(`# Call run sheet — ${sc.prospect || 'Untitled call'}`);
    L.push('');
    L.push(`_Generated ${new Date().toLocaleString()} · Draft for human review. Rehearsal aid only — this app never calls, records, sends, or writes to a CRM._`);
    L.push('', '## Scene');
    L.push(`- **Call type:** ${sc.callType}`);
    L.push(`- **Prospect:** ${sc.prospect || '(not set)'}`);
    L.push(`- **Objective:** ${sc.objective || '(not set)'}`);
    L.push(`- **Boundary / promises to avoid:** ${sc.boundary || '(not set)'}`);
    L.push('', `## Talk track — ${ss.totalWords} words · ~${fmtTime(ss.estSec)} at ${WPM} wpm`);
    state.sections.forEach((sec, i) => {
      const per = ss.per.find((p) => p.id === sec.id);
      L.push('', `### ${i + 1}. ${sec.title}${per && per.words ? ` (~${fmtTime(per.sec)})` : ''}`);
      if (!sec.cards.length) L.push('- _(no cards yet)_');
      sec.cards.forEach((c) => L.push(`- **${c.cue || 'Cue'}** — ${c.line || '(no line written)'}`));
    });
    L.push('', `## Objection deck — ${state.objections.length} cards${m.pct !== null ? ` · ${m.pct}% nailed` : ''}`);
    if (!state.objections.length) L.push('- _(deck is empty)_');
    state.objections.forEach((o) => L.push(`- **"${o.front}"** → ${o.back || '(no response yet)'} _(nailed ${o.nailed} · needs work ${o.needsWork})_`));
    L.push('', '## Pace plan');
    L.push(`- Target: ${fmtTime(T)} · Script estimate: ${ss.totalWords ? fmtTime(ss.estSec) : '—'} · Required pace: ${ss.totalWords ? Math.round(ss.totalWords / (T / 60)) + ' wpm' : '—'}`);
    checkpoints().forEach((c) => L.push(`- Wrap "${c.title}" by ${fmtTime(c.at)}`));
    L.push('', `## Session history — ${state.sessions.length} logged`);
    if (state.sessions.length) {
      L.push('| Date | Duration | Opening | Discovery | Objections | Close | Avg | Notes |');
      L.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
      state.sessions.forEach((s) => {
        const notes = (s.notes || '').replace(/\|/g, '/').replace(/\n+/g, ' ');
        L.push(`| ${new Date(s.date).toLocaleDateString()} | ${s.durationSec ? fmtTime(s.durationSec) : '—'} | ${s.scores.opening} | ${s.scores.discovery} | ${s.scores.objections} | ${s.scores.close} | ${sessionAvg(s).toFixed(1)} | ${notes} |`);
      });
    } else {
      L.push('_(none yet)_');
    }
    L.push('', '## Guardrail');
    L.push('Draft-only rehearsal artifact. Get explicit human approval before sending, calling, recording, or taking any customer-facing action.');
    return L.join('\n');
  }

  function sessionsCsv() {
    const rows = [['date', 'duration_seconds', 'opening', 'discovery', 'objections', 'close', 'average', 'notes']];
    state.sessions.forEach((s) => rows.push([
      s.date, s.durationSec, ...SCORE_KEYS.map((k) => s.scores[k]), sessionAvg(s).toFixed(2), s.notes
    ]));
    return rows.map((r) => r.map((c) => `"${String(c ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  }

  function renderPrintSheet() {
    const ss = scriptStats();
    const m = mastery();
    const sc = state.scenario;
    const T = state.targetMinutes * 60;
    const h = [];
    h.push(`<h1>Call run sheet — ${esc(sc.prospect || 'Untitled call')}</h1>`);
    h.push(`<p class="print-meta">Generated ${esc(new Date().toLocaleString())} · Draft for human review — rehearsal aid only.</p>`);
    h.push('<h2>Scene</h2><ul>');
    h.push(`<li><strong>Call type:</strong> ${esc(sc.callType)}</li>`);
    h.push(`<li><strong>Prospect:</strong> ${esc(sc.prospect || '(not set)')}</li>`);
    h.push(`<li><strong>Objective:</strong> ${esc(sc.objective || '(not set)')}</li>`);
    h.push(`<li><strong>Boundary:</strong> ${esc(sc.boundary || '(not set)')}</li>`);
    h.push('</ul>');
    h.push(`<h2>Talk track — ${ss.totalWords} words · ~${esc(fmtTime(ss.estSec))} at ${WPM} wpm</h2>`);
    state.sections.forEach((sec, i) => {
      const per = ss.per.find((p) => p.id === sec.id);
      h.push(`<h3>${i + 1}. ${esc(sec.title)}${per && per.words ? ` (~${esc(fmtTime(per.sec))})` : ''}</h3><ul>`);
      if (!sec.cards.length) h.push('<li><em>(no cards yet)</em></li>');
      sec.cards.forEach((c) => h.push(`<li><strong>${esc(c.cue || 'Cue')}</strong> — ${esc(c.line || '(no line written)')}</li>`));
      h.push('</ul>');
    });
    h.push(`<h2>Objection deck — ${state.objections.length} cards${m.pct !== null ? ` · ${m.pct}% nailed` : ''}</h2><ul>`);
    if (!state.objections.length) h.push('<li><em>(deck is empty)</em></li>');
    state.objections.forEach((o) => h.push(`<li><strong>"${esc(o.front)}"</strong> → ${esc(o.back || '(no response yet)')}</li>`));
    h.push('</ul>');
    h.push('<h2>Pace plan</h2><ul>');
    h.push(`<li>Target ${esc(fmtTime(T))} · estimate ${ss.totalWords ? esc(fmtTime(ss.estSec)) : '—'}</li>`);
    checkpoints().forEach((c) => h.push(`<li>Wrap "${esc(c.title)}" by ${esc(fmtTime(c.at))}</li>`));
    h.push('</ul>');
    if (state.sessions.length) {
      h.push('<h2>Session history</h2><table><tr><th>Date</th><th>Duration</th><th>Open</th><th>Disc</th><th>Objn</th><th>Close</th><th>Avg</th></tr>');
      state.sessions.forEach((s) => {
        h.push(`<tr><td>${esc(new Date(s.date).toLocaleDateString())}</td><td>${s.durationSec ? esc(fmtTime(s.durationSec)) : '—'}</td><td>${s.scores.opening}</td><td>${s.scores.discovery}</td><td>${s.scores.objections}</td><td>${s.scores.close}</td><td>${esc(sessionAvg(s).toFixed(1))}</td></tr>`);
      });
      h.push('</table>');
    }
    h.push('<h2>Guardrail</h2><p>Draft-only rehearsal artifact. Get explicit human approval before any customer-facing action.</p>');
    $('printSheet').innerHTML = h.join('');
  }

  /* ================= transient runtime state ================= */

  const timer = { running: false, elapsed: 0, interval: null };
  const drill = { order: [], index: 0, flipped: false };
  let undoSnapshot = null;
  let toastTimer = null;
  let lastFocus = null;

  /* ================= render ================= */

  function applyTheme() {
    const preferLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const t = state.theme || (preferLight ? 'light' : 'dark');
    document.documentElement.dataset.theme = t;
    $('themeToggle').textContent = t === 'light' ? '☾' : '☀';
    $('themeToggle').setAttribute('aria-label', t === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
  }

  function bindScenario() {
    $('callType').value = state.scenario.callType;
    ['prospect', 'objective', 'boundary'].forEach((k) => { $(k).value = state.scenario[k]; });
    $('targetMinutes').value = state.targetMinutes;
  }

  function renderStats() {
    const score = readiness();
    const ss = scriptStats();
    const m = mastery();
    $('statReadiness').textContent = score;
    $('statReadinessSub').textContent = `Readiness /100 · ${readinessBand(score)}`;
    $('statScript').textContent = ss.totalWords ? `~${fmtTime(ss.estSec)}` : '0:00';
    $('statScriptSub').textContent = `${ss.totalWords} words · ${ss.cardCount} cards`;
    $('statMastery').textContent = m.pct === null ? '—' : `${m.pct}%`;
    $('statMasterySub').textContent = `${state.objections.length} objections · ${m.graded} graded`;
    $('statSessions').textContent = state.sessions.length;
    if (state.sessions.length) {
      const last = sessionAvg(state.sessions[0]);
      const prev = state.sessions.length > 1 ? sessionAvg(state.sessions[1]) : null;
      const arrow = prev === null ? '' : last - prev > 0.05 ? ' ▲' : last - prev < -0.05 ? ' ▼' : ' –';
      $('statSessionsSub').textContent = `Sessions · last avg ${last.toFixed(1)}/5${arrow}`;
    } else {
      $('statSessionsSub').textContent = 'Sessions logged · none yet';
    }
  }

  function sectionHTML(sec, i, ss) {
    const per = ss.per.find((p) => p.id === sec.id);
    const cards = sec.cards.map((c) => `
      <div class="card-row">
        <input data-field="cue" data-sid="${esc(sec.id)}" data-cid="${esc(c.id)}" value="${esc(c.cue)}" maxlength="80" placeholder="Cue (e.g. Permission + agenda)" aria-label="Card cue" />
        <textarea data-field="line" data-sid="${esc(sec.id)}" data-cid="${esc(c.id)}" rows="2" maxlength="600" placeholder="What you'll actually say&hellip;" aria-label="Talk-track line">${esc(c.line)}</textarea>
        <button class="icon-x" data-action="del-card" data-sid="${esc(sec.id)}" data-cid="${esc(c.id)}" type="button" aria-label="Delete card">&#10005;</button>
      </div>`).join('');
    return `<section class="script-section">
      <header class="section-head">
        <span class="section-num" aria-hidden="true">${i + 1}</span>
        <input class="section-title" data-field="title" data-sid="${esc(sec.id)}" value="${esc(sec.title)}" maxlength="60" aria-label="Section title" />
        <span class="section-est" data-est="${esc(sec.id)}">${per && per.words ? `~${fmtTime(per.sec)}` : '—'}</span>
        <button class="icon-x" data-action="del-section" data-sid="${esc(sec.id)}" type="button" aria-label="Delete section ${esc(sec.title)}">&#10005;</button>
      </header>
      ${cards || '<p class="empty-inline">No cards yet — add your first talk-track line.</p>'}
      <button class="btn btn-ghost add-card" data-action="add-card" data-sid="${esc(sec.id)}" type="button">+ Add talk-track card</button>
    </section>`;
  }

  function renderSections() {
    const ss = scriptStats();
    const host = $('sectionsList');
    if (!state.sections.length) {
      host.innerHTML = '<div class="empty"><p>No script sections yet.</p><p class="dim">Add a section below, or load the demo to see a full talk track.</p></div>';
    } else {
      host.innerHTML = state.sections.map((sec, i) => sectionHTML(sec, i, ss)).join('');
    }
    $('scriptTotals').textContent = ss.cardCount
      ? `${ss.totalWords} words · ~${fmtTime(ss.estSec)} at ${WPM} wpm`
      : 'No cards yet';
  }

  function renderObjections() {
    const host = $('objectionList');
    if (!state.objections.length) { host.innerHTML = ''; return; }
    host.innerHTML = state.objections.map((o) => `
      <div class="deck-row">
        <div class="deck-fields">
          <input data-field="front" data-oid="${esc(o.id)}" value="${esc(o.front)}" maxlength="160" aria-label="Objection text" />
          <textarea data-field="back" data-oid="${esc(o.id)}" rows="2" maxlength="400" aria-label="Planned response" placeholder="Your best response&hellip;">${esc(o.back)}</textarea>
        </div>
        <div class="deck-meta">
          <button class="icon-x" data-action="del-objection" data-oid="${esc(o.id)}" type="button" aria-label="Delete objection">&#10005;</button>
          <span class="chip ok" title="Nailed it count">&#10003; ${o.nailed}</span>
          <span class="chip warn" title="Needs work count">&#8635; ${o.needsWork}</span>
        </div>
      </div>`).join('');
  }

  function syncDrill(shuffled) {
    let ids = state.objections.map((o) => o.id);
    if (shuffled) {
      ids = ids.slice();
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
    }
    drill.order = ids;
    drill.index = 0;
    drill.flipped = false;
  }

  function currentObjection() {
    return state.objections.find((o) => o.id === drill.order[drill.index]) || null;
  }

  function renderDrill() {
    const has = state.objections.length > 0;
    $('drillEmpty').hidden = has;
    $('drillStage').hidden = !has;
    if (!has) return;
    if (!drill.order.length || drill.index >= drill.order.length || !currentObjection()) syncDrill(false);
    const o = currentObjection();
    $('drillFront').textContent = o.front || 'Untitled objection';
    $('drillBack').textContent = o.back || 'No planned response yet — write one in the deck list below.';
    $('drillCard').classList.toggle('flipped', drill.flipped);
    $('drillCard').setAttribute('aria-label',
      drill.flipped
        ? `Response shown: ${o.back || 'none written'}. Press Enter or Space to flip back.`
        : `Objection: ${o.front}. Press Enter or Space to reveal your response.`);
    $('drillProgress').textContent = `Card ${drill.index + 1} of ${drill.order.length}`;
    $('drillNailedBtn').disabled = !drill.flipped;
    $('drillNeedsBtn').disabled = !drill.flipped;
  }

  function renderPaceNote() {
    const ss = scriptStats();
    const T = state.targetMinutes * 60;
    if (!ss.totalWords) {
      $('paceNote').textContent = 'No script yet — estimates appear as you add cards.';
      return;
    }
    const needWpm = Math.round(ss.totalWords / (T / 60));
    const fit = ss.estSec <= T * 0.85
      ? 'comfortable — leaves room to listen'
      : ss.estSec <= T * 1.1
        ? 'snug — keep answers tight'
        : 'over target — trim cards or raise the target';
    $('paceNote').textContent = `Script ≈ ${fmtTime(ss.estSec)} at ${WPM} wpm · ~${needWpm} wpm to fit ${state.targetMinutes} min (${fit}).`;
  }

  function paceHintText() {
    const T = state.targetMinutes * 60;
    const cps = checkpoints();
    if (!cps.length) return 'Add talk-track cards to unlock pace hints.';
    if (!timer.running && timer.elapsed === 0) {
      const plan = cps.slice(0, 3).map((c) => `${c.title} by ${fmtTime(c.at)}`).join(' → ');
      return `Plan: ${plan}${cps.length > 3 ? ' → …' : ''}`;
    }
    if (timer.elapsed > T) return 'Overtime — land the close and ask for the next step.';
    const current = cps.find((c) => timer.elapsed <= c.at);
    if (!current) return 'Final stretch — close and confirm the next step.';
    return `Pace: be wrapping "${current.title}" in ${fmtTime(current.at - timer.elapsed)}.`;
  }

  function renderTimer() {
    const T = state.targetMinutes * 60;
    const over = timer.elapsed > T;
    $('timerDisplay').textContent = fmtTime(timer.elapsed);
    $('timerDisplay').classList.toggle('over', over);
    $('timerToggleBtn').textContent = timer.running ? 'Pause' : timer.elapsed ? 'Resume' : 'Start';
    $('timerFinishBtn').disabled = timer.elapsed === 0;
    $('timerFill').style.width = `${clamp((timer.elapsed / T) * 100, 0, 100)}%`;
    $('timerFill').classList.toggle('over', over);
    $('paceHint').textContent = paceHintText();
    $('paceHint').classList.toggle('over', over);
  }

  function renderSessions() {
    const host = $('sessionList');
    if (!state.sessions.length) {
      host.innerHTML = '<div class="empty"><p>No rehearsal sessions yet.</p><p class="dim">Run the timer, hit &ldquo;Finish &amp; score&rdquo;, and your history builds here.</p></div>';
      return;
    }
    host.innerHTML = state.sessions.map((s) => {
      const d = new Date(s.date);
      const when = `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
      const chips = SCORE_KEYS.map((k) => `<span class="chip">${SCORE_LABELS[k]} ${s.scores[k]}</span>`).join('');
      return `<article class="session-row">
        <div class="session-top"><strong>${esc(when)}</strong><span class="avg-badge">${sessionAvg(s).toFixed(1)}/5</span></div>
        <div class="session-chips">${chips}<span class="chip">${s.durationSec ? fmtTime(s.durationSec) : 'untimed'}</span></div>
        ${s.notes ? `<p class="session-notes">${esc(s.notes)}</p>` : ''}
        <button class="icon-x" data-action="del-session" data-id="${esc(s.id)}" type="button" aria-label="Delete session">&#10005;</button>
      </article>`;
    }).join('');
  }

  function renderPreview() {
    $('mdPreview').textContent = markdown();
  }

  function updateDerived() {
    renderStats();
    renderPaceNote();
    renderTimer();
    renderPreview();
  }

  function renderAll() {
    applyTheme();
    bindScenario();
    renderSections();
    renderObjections();
    renderDrill();
    renderSessions();
    updateDerived();
  }

  /* ================= toast + undo ================= */

  function toast(msg, undoable = false) {
    clearTimeout(toastTimer);
    if (!undoable) undoSnapshot = null;
    $('toastMsg').textContent = msg;
    $('toastAction').hidden = !undoable;
    $('toast').classList.add('show');
    toastTimer = setTimeout(() => {
      $('toast').classList.remove('show');
      undoSnapshot = null;
      $('toastAction').hidden = true;
    }, undoable ? 7000 : 2200);
  }

  function withUndo(msg, mutate) {
    const snap = clone(state);
    mutate();
    undoSnapshot = snap;
    save();
    syncDrill(false);
    renderAll();
    toast(msg, true);
  }

  /* ================= timer control ================= */

  function startTimer() {
    if (timer.running) return;
    timer.running = true;
    timer.interval = setInterval(() => { timer.elapsed += 1; renderTimer(); }, 1000);
    renderTimer();
  }
  function pauseTimer() {
    timer.running = false;
    clearInterval(timer.interval);
    renderTimer();
  }
  function resetTimer() {
    pauseTimer();
    timer.elapsed = 0;
    renderTimer();
  }

  /* ================= dialogs ================= */

  function openDialog(dlg) {
    lastFocus = document.activeElement;
    dlg.showModal();
  }

  function openScoreDialog() {
    pauseTimer();
    $('scoreDuration').textContent = timer.elapsed ? fmtTime(timer.elapsed) : 'not timed';
    SCORE_KEYS.forEach((k) => {
      $(`score_${k}`).value = 3;
      $(`score_${k}_out`).textContent = '3';
    });
    $('sessionNotes').value = '';
    openDialog($('scoreDialog'));
  }

  /* ================= clipboard / files ================= */

  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); }
    catch { toast('Copy failed — open the preview and copy manually'); }
    ta.remove();
  }

  function copyMarkdown() {
    const text = markdown();
    const done = () => toast('Run sheet copied as Markdown');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  /* ================= event wiring ================= */

  // Header
  $('themeToggle').addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme;
    state.theme = cur === 'light' ? 'dark' : 'light';
    save();
    applyTheme();
    toast(`${state.theme === 'light' ? 'Light' : 'Dark'} theme saved`);
  });
  $('helpBtn').addEventListener('click', () => openDialog($('helpDialog')));
  $('loadDemoBtn').addEventListener('click', () => {
    state = demoState();
    save();
    resetTimer();
    syncDrill(false);
    renderAll();
    toast('Demo rehearsal loaded');
  });

  // Scenario
  ['prospect', 'objective', 'boundary'].forEach((k) => {
    $(k).addEventListener('input', (e) => {
      state.scenario[k] = e.target.value;
      if (k !== 'boundary') e.target.classList.toggle('invalid', !e.target.value.trim());
      saveSoon();
      updateDerived();
    });
  });
  $('callType').addEventListener('change', (e) => {
    state.scenario.callType = e.target.value;
    saveSoon();
    updateDerived();
  });

  // Script builder — delegated text edits (no re-render, keeps focus)
  $('sectionsList').addEventListener('input', (e) => {
    const t = e.target;
    const sec = state.sections.find((s) => s.id === t.dataset.sid);
    if (!sec || !t.dataset.field) return;
    if (t.dataset.field === 'title') {
      sec.title = t.value;
    } else {
      const card = sec.cards.find((c) => c.id === t.dataset.cid);
      if (!card) return;
      card[t.dataset.field] = t.value;
    }
    saveSoon();
    const per = scriptStats().per.find((p) => p.id === sec.id);
    const badge = $('sectionsList').querySelector(`[data-est="${sec.id}"]`);
    if (badge) badge.textContent = per && per.words ? `~${fmtTime(per.sec)}` : '—';
    updateDerived();
    const ss = scriptStats();
    $('scriptTotals').textContent = ss.cardCount ? `${ss.totalWords} words · ~${fmtTime(ss.estSec)} at ${WPM} wpm` : 'No cards yet';
  });

  $('sectionsList').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, sid, cid } = btn.dataset;
    const sec = state.sections.find((s) => s.id === sid);
    if (action === 'add-card' && sec) {
      const card = { id: uid(), cue: '', line: '' };
      sec.cards.push(card);
      save();
      renderSections();
      updateDerived();
      const el = $('sectionsList').querySelector(`input[data-field="cue"][data-cid="${card.id}"]`);
      if (el) el.focus();
    } else if (action === 'del-card' && sec) {
      withUndo('Card deleted', () => { sec.cards = sec.cards.filter((c) => c.id !== cid); });
    } else if (action === 'del-section') {
      withUndo('Section deleted', () => { state.sections = state.sections.filter((s) => s.id !== sid); });
    }
  });

  $('addSectionBtn').addEventListener('click', () => {
    if (state.sections.length >= 12) { toast('Section limit reached (12)'); return; }
    state.sections.push({ id: uid(), title: 'New section', cards: [] });
    save();
    renderSections();
    updateDerived();
    const inputs = $('sectionsList').querySelectorAll('.section-title');
    const last = inputs[inputs.length - 1];
    if (last) { last.focus(); last.select(); }
  });

  // Objection deck
  $('addObjectionBtn').addEventListener('click', () => {
    const front = $('objFront').value.trim();
    const back = $('objBack').value.trim();
    if (!front) {
      $('objFront').classList.add('invalid');
      $('objFront').focus();
      toast('Write the objection text first');
      return;
    }
    if (state.objections.length >= 30) { toast('Deck limit reached (30)'); return; }
    state.objections.push({ id: uid(), front: front.slice(0, 160), back: back.slice(0, 400), nailed: 0, needsWork: 0 });
    $('objFront').value = '';
    $('objBack').value = '';
    save();
    syncDrill(false);
    renderObjections();
    renderDrill();
    updateDerived();
    toast('Objection added to deck');
  });
  $('objFront').addEventListener('input', (e) => e.target.classList.remove('invalid'));

  $('objectionList').addEventListener('input', (e) => {
    const t = e.target;
    const o = state.objections.find((x) => x.id === t.dataset.oid);
    if (!o || !t.dataset.field) return;
    o[t.dataset.field] = t.value;
    saveSoon();
    renderDrill();
    renderPreview();
  });
  $('objectionList').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="del-objection"]');
    if (!btn) return;
    const id = btn.dataset.oid;
    withUndo('Objection deleted', () => { state.objections = state.objections.filter((o) => o.id !== id); });
  });

  // Drill
  $('drillCard').addEventListener('click', () => {
    if (!state.objections.length) return;
    drill.flipped = !drill.flipped;
    renderDrill();
  });
  $('drillShuffleBtn').addEventListener('click', () => {
    if (!state.objections.length) return;
    syncDrill(true);
    renderDrill();
    toast('Deck shuffled');
  });
  $('drillSkipBtn').addEventListener('click', () => {
    if (!state.objections.length) return;
    drill.flipped = false;
    drill.index = (drill.index + 1) % drill.order.length;
    renderDrill();
  });
  function grade(kind) {
    const o = currentObjection();
    if (!o) return;
    o[kind] += 1;
    drill.flipped = false;
    if (drill.index + 1 >= drill.order.length) {
      syncDrill(true);
      toast('Deck complete — reshuffled for another pass');
    } else {
      drill.index += 1;
    }
    saveSoon();
    renderDrill();
    renderObjections();
    renderStats();
    renderPreview();
  }
  $('drillNailedBtn').addEventListener('click', () => grade('nailed'));
  $('drillNeedsBtn').addEventListener('click', () => grade('needsWork'));

  // Timer
  $('timerToggleBtn').addEventListener('click', () => {
    if (timer.running) { pauseTimer(); toast('Timer paused'); }
    else startTimer();
  });
  $('timerResetBtn').addEventListener('click', () => { resetTimer(); toast('Timer reset'); });
  $('timerFinishBtn').addEventListener('click', openScoreDialog);
  $('targetMinutes').addEventListener('change', (e) => {
    const v = clamp(Math.round(Number(e.target.value) || 6), 1, 30);
    e.target.value = v;
    state.targetMinutes = v;
    saveSoon();
    renderPaceNote();
    renderTimer();
    renderPreview();
  });

  // Sessions
  $('logSessionBtn').addEventListener('click', openScoreDialog);
  $('sessionList').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="del-session"]');
    if (!btn) return;
    const id = btn.dataset.id;
    withUndo('Session deleted', () => { state.sessions = state.sessions.filter((s) => s.id !== id); });
  });

  // Score dialog
  $('scoreForm').addEventListener('input', (e) => {
    if (e.target.type === 'range') {
      const out = $(`${e.target.id}_out`);
      if (out) out.textContent = e.target.value;
    }
  });
  $('scoreForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const scores = Object.fromEntries(SCORE_KEYS.map((k) => [k, int($(`score_${k}`).value, 1, 5, 3)]));
    state.sessions.unshift({
      id: uid(),
      date: nowIso(),
      durationSec: timer.elapsed,
      scores,
      notes: $('sessionNotes').value.trim().slice(0, 400)
    });
    if (state.sessions.length > 100) state.sessions.length = 100;
    resetTimer();
    save();
    $('scoreDialog').close();
    renderSessions();
    updateDerived();
    toast('Session logged');
  });
  $('scoreCancelBtn').addEventListener('click', () => $('scoreDialog').close());
  $('helpCloseBtn').addEventListener('click', () => $('helpDialog').close());
  [$('helpDialog'), $('scoreDialog')].forEach((d) => {
    d.addEventListener('close', () => { if (lastFocus && lastFocus.focus) lastFocus.focus(); });
  });

  // Export & handoff
  $('copyMdBtn').addEventListener('click', copyMarkdown);
  $('downloadJsonBtn').addEventListener('click', () => {
    const payload = {
      ...clone(state),
      readiness: readiness(),
      generatedAt: nowIso(),
      safety: 'Draft-only rehearsal artifact; human approval required before customer-facing action.'
    };
    download('script-rehearsal-room.json', JSON.stringify(payload, null, 2), 'application/json');
    toast('JSON downloaded');
  });
  $('downloadCsvBtn').addEventListener('click', () => {
    if (!state.sessions.length) { toast('No sessions to export yet'); return; }
    download('script-rehearsal-sessions.csv', sessionsCsv(), 'text/csv');
    toast('Sessions CSV downloaded');
  });
  $('importFile').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result);
        state = normalize({ ...raw, theme: state.theme, seenGuide: true });
        save();
        resetTimer();
        syncDrill(false);
        renderAll();
        toast('Rehearsal data imported');
      } catch {
        toast('Import failed — not a valid JSON export');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
  $('printBtn').addEventListener('click', () => {
    renderPrintSheet();
    window.print();
  });
  window.addEventListener('beforeprint', renderPrintSheet);
  $('resetBtn').addEventListener('click', () => {
    if (!window.confirm('Reset everything? This clears the scene, script, deck, and session history stored in this browser.')) return;
    const theme = state.theme;
    state = defaultState();
    state.theme = theme;
    state.seenGuide = true;
    save();
    resetTimer();
    syncDrill(false);
    renderAll();
    toast('Room reset');
  });

  // Undo
  $('toastAction').addEventListener('click', () => {
    if (!undoSnapshot) return;
    state = normalize(undoSnapshot);
    undoSnapshot = null;
    save();
    syncDrill(false);
    renderAll();
    toast('Restored');
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      copyMarkdown();
      return;
    }
    const tag = document.activeElement ? document.activeElement.tagName : '';
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if (e.key === '?' && !typing && !$('helpDialog').open && !$('scoreDialog').open) {
      e.preventDefault();
      openDialog($('helpDialog'));
    }
  });

  /* ================= init ================= */

  applyTheme();
  syncDrill(false);
  renderAll();
  if (!state.seenGuide) {
    state.seenGuide = true;
    save();
    openDialog($('helpDialog'));
  }
})();
