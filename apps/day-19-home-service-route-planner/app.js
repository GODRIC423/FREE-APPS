/* Home Service Route Planner — remake
   Plan a service day: stop cards, priorities, time windows, drive buffers,
   manual route ordering, per-tech capacity meters, printable dispatch sheet.
   Fully offline. Draft-only: a human confirms every route before dispatch. */
(() => {
  'use strict';

  // ---------------------------------------------------------------- constants
  const LS_KEY = 'fable-remake:day-19-home-service-route-planner:v1';
  const PRIORITY_LABELS = { 5: 'Emergency', 4: 'High', 3: 'Normal', 2: 'Low' };
  const SAFETY_LINE = 'Draft for human review — confirm traffic, access, technician constraints, and customer windows before dispatch.';

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
  const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
  const uid = () => (window.crypto?.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const clampNum = (v, min, max, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  const debounce = (fn, ms) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  };

  // ------------------------------------------------------------- time helpers
  const TIME_RE = /^(\d{1,2}):(\d{2})$/;
  function validTime(v, fallback) {
    const m = TIME_RE.exec(String(v ?? ''));
    if (!m) return fallback;
    const h = Number(m[1]); const min = Number(m[2]);
    if (h > 23 || min > 59) return fallback;
    return `${String(h).padStart(2, '0')}:${m[2]}`;
  }
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const toHHMM = (min) => {
    const m = ((Math.round(min) % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  };
  const fmtDur = (min) => {
    const m = Math.round(min);
    if (m < 60) return `${m}m`;
    return m % 60 === 0 ? `${m / 60}h` : `${Math.floor(m / 60)}h ${m % 60}m`;
  };
  const fmtH = (min) => `${(min / 60).toFixed(1)}h`;
  const todayISO = () => new Date().toISOString().slice(0, 10);

  // ------------------------------------------------------------------- state
  function defaultState() {
    const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    return {
      theme,
      seenGuide: false,
      date: todayISO(),
      start: '08:00',
      depot: '',
      maxHours: 8,
      drive: 20,
      admin: 30,
      note: '',
      techs: [{ id: uid(), name: 'Tech 1', start: '08:00' }],
      stops: [],
    };
  }

  function demoState(base) {
    const t1 = uid(); const t2 = uid();
    return {
      ...defaultState(),
      theme: base.theme,
      seenGuide: base.seenGuide,
      date: todayISO(),
      start: '08:00',
      depot: 'Main shop — 14 Foundry Rd',
      maxHours: 8,
      drive: 20,
      admin: 30,
      note: 'Call Pine Street tenant before rolling. Morgan gate code is on the office board. Van 5 needs the drain camera loaded.',
      techs: [
        { id: t1, name: 'Alex R. · Van 2', start: '08:00' },
        { id: t2, name: 'Priya N. · Van 5', start: '08:30' },
      ],
      stops: [
        { id: uid(), techId: t1, customer: 'Morgan Residence', area: 'North Loop', summary: 'No-heat callback. Bring igniter kit; confirm prior repair held.', priority: 5, winStart: '08:30', winEnd: '10:00', duration: 90, drive: '' },
        { id: uid(), techId: t1, customer: 'Santos Duplex', area: 'East Ridge', summary: 'Seasonal maintenance: filter swap, thermostat check, condensate line.', priority: 3, winStart: '10:30', winEnd: '12:00', duration: 75, drive: '' },
        { id: uid(), techId: t1, customer: 'Pine Street Rental', area: 'South Hill', summary: 'Tenant reports slow drain. Camera the line if the first auger pass fails.', priority: 4, winStart: '13:00', winEnd: '14:30', duration: 105, drive: 25 },
        { id: uid(), techId: t1, customer: 'Harbor View HOA', area: 'West Harbor', summary: 'Quote walkthrough for corridor lighting. Flexible — keep last.', priority: 2, winStart: '15:30', winEnd: '17:00', duration: 60, drive: '' },
        { id: uid(), techId: t2, customer: 'Cedar Court 12', area: 'Cedar Court', summary: 'Water heater flush and anode inspection.', priority: 3, winStart: '09:00', winEnd: '10:30', duration: 60, drive: 15 },
        { id: uid(), techId: t2, customer: 'Delgado Home', area: 'Riverbend', summary: 'AC not cooling. Check capacitor and refrigerant pressures.', priority: 4, winStart: '10:00', winEnd: '11:00', duration: 90, drive: '' },
        { id: uid(), techId: t2, customer: 'Oakwood Clinic', area: 'Midtown', summary: 'Replace lobby thermostat. After-lunch access only — check in at desk.', priority: 3, winStart: '12:30', winEnd: '13:30', duration: 45, drive: '' },
        { id: uid(), techId: t2, customer: 'Birch Lane Fourplex', area: 'Northside', summary: 'Recurring breaker trip in unit C. Needs a load test on the panel.', priority: 4, winStart: '12:45', winEnd: '13:30', duration: 75, drive: '' },
      ],
    };
  }

  function normalize(raw) {
    const src = raw && typeof raw === 'object'
      ? (raw.state && typeof raw.state === 'object' ? raw.state : raw)
      : {};
    const out = defaultState();

    if (src.theme === 'light' || src.theme === 'dark') out.theme = src.theme;
    out.seenGuide = Boolean(src.seenGuide);
    out.date = /^\d{4}-\d{2}-\d{2}$/.test(String(src.date)) ? String(src.date) : out.date;
    out.start = validTime(src.start, '08:00');
    out.depot = clean(src.depot).slice(0, 90);
    out.maxHours = clampNum(src.maxHours, 1, 14, 8);
    out.drive = Math.round(clampNum(src.drive, 0, 180, 20));
    out.admin = Math.round(clampNum(src.admin, 0, 240, 30));
    out.note = String(src.note ?? '').slice(0, 600);

    const techs = Array.isArray(src.techs) ? src.techs : [];
    out.techs = techs
      .filter((t) => t && typeof t === 'object')
      .map((t, i) => ({
        id: typeof t.id === 'string' && t.id ? t.id : uid(),
        name: clean(t.name).slice(0, 60) || `Tech ${i + 1}`,
        start: validTime(t.start, out.start),
      }));
    if (!out.techs.length) out.techs = [{ id: uid(), name: 'Tech 1', start: out.start }];
    const techIds = new Set(out.techs.map((t) => t.id));

    const stops = Array.isArray(src.stops) ? src.stops : [];
    out.stops = stops
      .filter((s) => s && typeof s === 'object')
      .map((s, i) => ({
        id: typeof s.id === 'string' && s.id ? s.id : uid(),
        techId: techIds.has(s.techId) ? s.techId : out.techs[0].id,
        customer: clean(s.customer).slice(0, 90) || `Stop ${i + 1}`,
        area: clean(s.area).slice(0, 120),
        summary: clean(s.summary).slice(0, 400),
        priority: [2, 3, 4, 5].includes(Number(s.priority)) ? Number(s.priority) : 3,
        winStart: validTime(s.winStart, ''),
        winEnd: validTime(s.winEnd, ''),
        duration: Math.round(clampNum(s.duration, 5, 480, 60)),
        drive: s.drive === '' || s.drive == null || !Number.isFinite(Number(s.drive))
          ? '' : Math.round(clampNum(s.drive, 0, 180, 0)),
      }));
    return out;
  }

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch { /* corrupt storage — fall through to defaults */ }
    return defaultState();
  }

  let state = load();
  let editingId = null; // stop currently loaded in the form
  const saveNow = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ } };
  const save = debounce(saveNow, 250);

  // ------------------------------------------------------------- domain logic
  // Compute per-tech schedules: drive buffer before every stop (depot -> first
  // stop included), wait until window opens, flag arrivals after window close.
  function computePlan() {
    const maxMin = state.maxHours * 60;
    const techs = state.techs.map((tech) => {
      const stops = state.stops.filter((s) => s.techId === tech.id);
      const startMin = toMin(tech.start || state.start);
      let cursor = startMin;
      const rows = stops.map((s, i) => {
        const drive = s.drive === '' ? state.drive : s.drive;
        cursor += drive;
        const arrive = cursor;
        const ws = s.winStart ? toMin(s.winStart) : null;
        const we = s.winEnd ? toMin(s.winEnd) : null;
        const wait = ws != null && arrive < ws ? ws - arrive : 0;
        const begin = arrive + wait;
        const lateBy = we != null && arrive > we ? arrive - we : 0;
        const depart = begin + s.duration;
        cursor = depart;
        return { ...s, order: i + 1, driveMin: drive, arrive, wait, begin, lateBy, depart };
      });

      const work = rows.reduce((sum, r) => sum + r.duration, 0);
      const driveTot = rows.reduce((sum, r) => sum + r.driveMin, 0);
      const waitTot = rows.reduce((sum, r) => sum + r.wait, 0);
      const endMin = rows.length ? cursor + state.admin : startMin;
      const fieldMin = rows.length ? endMin - startMin : 0;
      const pct = maxMin > 0 ? fieldMin / maxMin : 0;

      const warnings = [];
      rows.forEach((r) => {
        if (r.lateBy > 0) {
          warnings.push(`#${r.order} ${r.customer}: arrives ${toHHMM(r.arrive)}, ${fmtDur(r.lateBy)} after the window closes (${r.winEnd}).`);
        }
      });
      rows.forEach((r, i) => {
        if (r.priority === 5 && rows.slice(0, i).some((x) => x.priority < 5)) {
          warnings.push(`Emergency stop "${r.customer}" is #${r.order} on ${tech.name}'s route — consider moving it up.`);
        }
      });
      if (fieldMin > maxMin) {
        warnings.push(`${tech.name} is over the ${state.maxHours}h day cap by ${fmtDur(fieldMin - maxMin)}.`);
      }

      return { tech, rows, work, driveTot, waitTot, startMin, endMin, fieldMin, pct, warnings };
    });

    const globalWarnings = [];
    if (state.drive === 0 && state.stops.length > 1 && state.stops.every((s) => s.drive === '')) {
      globalWarnings.push('No drive buffer between stops — every leg is assumed instant.');
    }

    const totals = {
      stops: state.stops.length,
      drive: techs.reduce((sum, t) => sum + t.driveTot, 0),
      wait: techs.reduce((sum, t) => sum + t.waitTot, 0),
      work: techs.reduce((sum, t) => sum + t.work, 0),
      busiest: Math.max(0, ...techs.map((t) => t.fieldMin)),
      warnings: globalWarnings.length + techs.reduce((sum, t) => sum + t.warnings.length, 0),
    };
    return { techs, totals, globalWarnings, maxMin };
  }

  function capClass(pct) { return pct > 1 ? 'over' : (pct > 0.85 ? 'warn' : 'ok'); }

  const mdCell = (v) => clean(v).replace(/\|/g, '\\|') || '—';

  function buildMarkdown(plan) {
    const lines = [];
    lines.push(`# Dispatch sheet — ${state.date}`, '');
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    if (state.depot) lines.push(`Depot: ${state.depot}`);
    lines.push(`Assumptions: ${state.maxHours}h cap per tech · default drive ${state.drive}m · admin buffer ${state.admin}m`, '');
    lines.push(`> ${SAFETY_LINE}`, '');
    plan.techs.forEach((t) => {
      lines.push(`## ${t.tech.name} — starts ${t.tech.start}`, '');
      if (!t.rows.length) { lines.push('_No stops assigned._', ''); return; }
      lines.push(`Capacity: ${fmtH(t.fieldMin)} planned of ${state.maxHours}h cap (${Math.round(t.pct * 100)}%)${t.pct > 1 ? ' — OVER' : ''}`, '');
      lines.push('| # | Customer | Area | Priority | Window | Drive | ETA | On site | Job |');
      lines.push('|---|----------|------|----------|--------|-------|-----|---------|-----|');
      t.rows.forEach((r) => {
        const win = r.winStart || r.winEnd ? `${r.winStart || '…'}–${r.winEnd || '…'}` : 'any';
        lines.push(`| ${r.order} | ${mdCell(r.customer)} | ${mdCell(r.area)} | ${PRIORITY_LABELS[r.priority]} | ${win} | ${r.driveMin}m | ${toHHMM(r.arrive)}${r.lateBy ? ' (LATE)' : ''} | ${toHHMM(r.begin)}–${toHHMM(r.depart)} | ${mdCell(r.summary)} |`);
      });
      lines.push('');
      if (t.warnings.length) {
        lines.push('Warnings:');
        t.warnings.forEach((w) => lines.push(`- ${w}`));
        lines.push('');
      }
    });
    if (plan.globalWarnings.length) {
      lines.push('## Day warnings');
      plan.globalWarnings.forEach((w) => lines.push(`- ${w}`));
      lines.push('');
    }
    lines.push('## Dispatcher note', clean(state.note) || 'None recorded.', '');
    lines.push('## Boundary', SAFETY_LINE);
    return lines.join('\n');
  }

  function buildCsv(plan) {
    const rows = [['technician', 'order', 'customer', 'area', 'priority', 'window_opens', 'window_closes', 'drive_min', 'eta', 'on_site_start', 'on_site_end', 'duration_min', 'late_min', 'summary']];
    plan.techs.forEach((t) => {
      t.rows.forEach((r) => {
        rows.push([t.tech.name, r.order, r.customer, r.area, PRIORITY_LABELS[r.priority],
          r.winStart, r.winEnd, r.driveMin, toHHMM(r.arrive), toHHMM(r.begin), toHHMM(r.depart),
          r.duration, r.lateBy, r.summary]);
      });
    });
    return rows.map((row) => row.map((c) => `"${String(c ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  }

  // --------------------------------------------------------------- mutations
  function moveStop(id, dir) {
    const stop = state.stops.find((s) => s.id === id);
    if (!stop) return;
    const siblings = state.stops.filter((s) => s.techId === stop.techId);
    const pos = siblings.indexOf(stop);
    const target = siblings[pos + dir];
    if (!target) return;
    const i = state.stops.indexOf(stop);
    const j = state.stops.indexOf(target);
    [state.stops[i], state.stops[j]] = [state.stops[j], state.stops[i]];
    renderAll();
  }

  function sortByWindow() {
    const key = (s) => (s.winStart ? toMin(s.winStart) : 24 * 60);
    state.stops = state.techs.flatMap((t) => state.stops
      .filter((s) => s.techId === t.id)
      .sort((a, b) => key(a) - key(b) || b.priority - a.priority));
    renderAll();
    toast('Routes sorted by window, then priority');
  }

  function restoreSnapshot(snapshot) {
    state = normalize(JSON.parse(snapshot));
    applyTheme();
    syncDayForm();
    renderTechs();
    renderStopTechSelect();
    renderAll();
  }

  function deleteStop(id) {
    const snapshot = JSON.stringify(state);
    const stop = state.stops.find((s) => s.id === id);
    state.stops = state.stops.filter((s) => s.id !== id);
    if (editingId === id) cancelEdit();
    renderAll();
    toast(`Deleted "${stop ? stop.customer : 'stop'}"`, {
      undo: () => restoreSnapshot(snapshot),
    });
  }

  function deleteTech(id) {
    if (state.techs.length <= 1) { toast('Keep at least one technician'); return; }
    const snapshot = JSON.stringify(state);
    const tech = state.techs.find((t) => t.id === id);
    state.techs = state.techs.filter((t) => t.id !== id);
    const fallback = state.techs[0].id;
    let moved = 0;
    state.stops.forEach((s) => { if (s.techId === id) { s.techId = fallback; moved += 1; } });
    renderAll();
    toast(`Removed ${tech ? tech.name : 'tech'}${moved ? ` — ${moved} stop${moved > 1 ? 's' : ''} moved to ${state.techs[0].name}` : ''}`, {
      undo: () => restoreSnapshot(snapshot),
    });
  }

  // ------------------------------------------------------------------ render
  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    const btn = $('themeToggle');
    btn.textContent = state.theme === 'dark' ? '☾ Dark' : '☀ Light';
    btn.setAttribute('aria-pressed', state.theme === 'light' ? 'true' : 'false');
  }

  function syncDayForm() {
    $('dayDate').value = state.date;
    $('dayStart').value = state.start;
    $('dayDepot').value = state.depot;
    $('dayMaxHours').value = String(state.maxHours);
    $('dayDrive').value = String(state.drive);
    $('dayAdmin').value = String(state.admin);
    $('dayNote').value = state.note;
    $('stopDrive').placeholder = `default ${state.drive}m`;
  }

  function renderTechs() {
    $('techList').innerHTML = state.techs.map((t) => `
      <div class="tech-row" data-id="${esc(t.id)}">
        <input type="text" data-field="name" value="${esc(t.name)}" maxlength="60" aria-label="Technician name" />
        <input type="time" data-field="start" value="${esc(t.start)}" aria-label="Start time for ${esc(t.name)}" />
        <button type="button" class="tech-remove" data-act="remove" aria-label="Remove ${esc(t.name)}" ${state.techs.length <= 1 ? 'disabled' : ''}>&times;</button>
      </div>`).join('');
  }

  function renderStopTechSelect() {
    const sel = $('stopTech');
    const current = sel.value;
    sel.innerHTML = state.techs.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
    if (state.techs.some((t) => t.id === current)) sel.value = current;
  }

  function stopCardHTML(r, count) {
    const win = r.winStart || r.winEnd ? `window ${r.winStart || '…'}–${r.winEnd || '…'}` : 'no window';
    const chips = [
      `<span class="chip">Drive ${esc(fmtDur(r.driveMin))}</span>`,
      `<span class="chip time">ETA ${esc(toHHMM(r.arrive))}</span>`,
      r.wait > 0 ? `<span class="chip wait">Wait ${esc(fmtDur(r.wait))}</span>` : '',
      `<span class="chip time">On site ${esc(toHHMM(r.begin))}–${esc(toHHMM(r.depart))}</span>`,
      r.lateBy > 0 ? `<span class="chip late">Late ${esc(fmtDur(r.lateBy))}</span>` : '',
    ].filter(Boolean).join('');
    return `
      <article class="stop-card prio-${r.priority}" data-id="${esc(r.id)}">
        <div class="stop-order">
          <button type="button" class="move-btn" data-act="up" aria-label="Move ${esc(r.customer)} earlier" ${r.order === 1 ? 'disabled' : ''}>▲</button>
          <span class="order-num" aria-hidden="true">${r.order}</span>
          <button type="button" class="move-btn" data-act="down" aria-label="Move ${esc(r.customer)} later" ${r.order === count ? 'disabled' : ''}>▼</button>
        </div>
        <div class="stop-body">
          <div class="stop-top">
            <h4>${esc(r.customer)}</h4>
            <span class="badge prio-${r.priority}">${PRIORITY_LABELS[r.priority]}</span>
          </div>
          <p class="stop-meta">${esc(r.area || 'Area TBD')} · ${esc(win)} · ${esc(fmtDur(r.duration))} on site</p>
          ${r.summary ? `<p class="stop-summary">${esc(r.summary)}</p>` : ''}
          <div class="stop-chips">${chips}</div>
        </div>
        <div class="stop-actions">
          <button type="button" class="btn btn-small" data-act="edit">Edit</button>
          <button type="button" class="btn btn-small btn-ghost" data-act="del">Delete</button>
        </div>
      </article>`;
  }

  function renderBoard(plan) {
    const board = $('routeBoard');
    if (!state.stops.length) {
      board.innerHTML = `
        <div class="empty-state">
          <p>No stops yet. Add a stop card on the left, or load a realistic demo day.</p>
          <button type="button" class="btn btn-primary" data-act="demo">Load demo day</button>
        </div>`;
      return;
    }
    board.innerHTML = plan.techs.map((t) => {
      const cls = capClass(t.pct);
      const pctW = Math.min(100, Math.round(t.pct * 100));
      const times = t.rows.length
        ? `starts ${esc(t.tech.start)} · wraps ~${esc(toHHMM(t.endMin))} (incl. ${esc(fmtDur(state.admin))} admin)`
        : `starts ${esc(t.tech.start)}`;
      return `
        <section class="tech-group" data-tech="${esc(t.tech.id)}">
          <header class="tech-group-head">
            <h3>${esc(t.tech.name)}</h3>
            <span class="tech-times">${times}</span>
          </header>
          <div class="capacity" role="img" aria-label="${esc(t.tech.name)} capacity: ${esc(fmtH(t.fieldMin))} of ${esc(String(state.maxHours))} hour cap">
            <div class="meter"><div class="meter-fill ${cls}" style="width:${pctW}%"></div></div>
            <span class="cap-label ${t.pct > 1 ? 'over' : ''}">${esc(fmtH(t.fieldMin))} / ${esc(String(state.maxHours))}h${t.pct > 1 ? ' — over' : ''}</span>
          </div>
          <div class="tech-stops">
            ${t.rows.length
              ? t.rows.map((r) => stopCardHTML(r, t.rows.length)).join('')
              : '<div class="empty-state">No stops assigned — pick this tech in the stop form.</div>'}
          </div>
          ${t.warnings.length ? `<ul class="tech-warnings">${t.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
        </section>`;
    }).join('');
  }

  function renderDispatch(plan) {
    const el = $('dispatchSheet');
    if (!state.stops.length) {
      el.innerHTML = '<div class="empty-state"><p>The dispatch sheet appears here once stops are planned.</p></div>';
      return;
    }
    const head = `
      <header class="ds-head">
        <h3>Dispatch — ${esc(state.date)}</h3>
        <p>${state.depot ? `Depot: ${esc(state.depot)} · ` : ''}Cap ${esc(String(state.maxHours))}h/tech · default drive ${esc(String(state.drive))}m · admin ${esc(String(state.admin))}m</p>
      </header>`;
    const sections = plan.techs.map((t) => {
      if (!t.rows.length) return '';
      const rows = t.rows.map((r) => `
        <tr>
          <td class="num">${r.order}</td>
          <td><span class="ds-cust">${esc(r.customer)}</span><br /><span class="ds-area">${esc(r.area || '—')}</span></td>
          <td>${PRIORITY_LABELS[r.priority]}</td>
          <td class="num">${r.winStart || r.winEnd ? `${esc(r.winStart || '…')}–${esc(r.winEnd || '…')}` : 'any'}</td>
          <td class="num">${esc(fmtDur(r.driveMin))}</td>
          <td class="num${r.lateBy ? ' ds-late' : ''}">${esc(toHHMM(r.arrive))}${r.lateBy ? ' ⚠' : ''}</td>
          <td class="num">${esc(toHHMM(r.begin))}–${esc(toHHMM(r.depart))}</td>
          <td class="ds-job">${esc(r.summary || '—')}</td>
        </tr>`).join('');
      return `
        <section class="ds-tech">
          <h4>${esc(t.tech.name)}</h4>
          <p class="ds-sub">starts ${esc(t.tech.start)} · wraps ~${esc(toHHMM(t.endMin))} ·
            <span class="${t.pct > 1 ? 'over' : ''}">${esc(fmtH(t.fieldMin))} of ${esc(String(state.maxHours))}h cap (${Math.round(t.pct * 100)}%)</span></p>
          <div class="ds-table-wrap">
            <table>
              <thead><tr><th>#</th><th>Customer</th><th>Priority</th><th>Window</th><th>Drive</th><th>ETA</th><th>On site</th><th>Job</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          ${t.warnings.length ? `<ul class="ds-warn">${t.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
        </section>`;
    }).join('');
    const globals = plan.globalWarnings.length
      ? `<ul class="ds-warn">${plan.globalWarnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : '';
    const note = clean(state.note)
      ? `<p class="ds-note"><strong>Dispatcher note:</strong> ${esc(state.note)}</p>` : '';
    el.innerHTML = head + sections + globals + note + `<p class="ds-safety">${esc(SAFETY_LINE)}</p>`;
  }

  function renderStats(plan) {
    $('statStops').textContent = String(plan.totals.stops);
    $('statField').textContent = fmtH(plan.totals.busiest);
    $('statBuffers').textContent = fmtDur(plan.totals.drive + plan.totals.wait);
    $('statWarnings').textContent = String(plan.totals.warnings);
    $('statWarnings').parentElement.classList.toggle('alert', plan.totals.warnings > 0);
  }

  function renderAll() {
    const plan = computePlan();
    renderStats(plan);
    renderBoard(plan);
    renderDispatch(plan);
    save();
  }

  // ------------------------------------------------------------ stop form
  function fillStopForm(stop) {
    $('stopCustomer').value = stop.customer;
    $('stopArea').value = stop.area;
    $('stopSummary').value = stop.summary;
    $('stopPriority').value = String(stop.priority);
    $('stopTech').value = stop.techId;
    $('stopDuration').value = String(stop.duration);
    $('stopWinStart').value = stop.winStart;
    $('stopWinEnd').value = stop.winEnd;
    $('stopDrive').value = stop.drive === '' ? '' : String(stop.drive);
  }

  function clearStopForm() {
    $('stopForm').reset();
    $('stopDuration').value = '60';
    $('stopPriority').value = '3';
    $('stopCustomer').classList.remove('invalid');
    $('stopCustomerError').hidden = true;
  }

  function cancelEdit() {
    editingId = null;
    clearStopForm();
    $('stopFormHeading').textContent = 'Add a stop';
    $('stopSubmitBtn').textContent = 'Add stop';
    $('stopCancelBtn').hidden = true;
  }

  function beginEdit(id) {
    const stop = state.stops.find((s) => s.id === id);
    if (!stop) return;
    editingId = id;
    fillStopForm(stop);
    $('stopFormHeading').textContent = `Editing: ${stop.customer}`;
    $('stopSubmitBtn').textContent = 'Update stop';
    $('stopCancelBtn').hidden = false;
    $('stopCustomer').focus();
  }

  function submitStopForm() {
    const customer = clean($('stopCustomer').value).slice(0, 90);
    if (!customer) {
      $('stopCustomer').classList.add('invalid');
      $('stopCustomerError').hidden = false;
      $('stopCustomer').focus();
      return;
    }
    $('stopCustomer').classList.remove('invalid');
    $('stopCustomerError').hidden = true;
    const driveRaw = $('stopDrive').value.trim();
    const data = {
      customer,
      area: clean($('stopArea').value).slice(0, 120),
      summary: clean($('stopSummary').value).slice(0, 400),
      priority: [2, 3, 4, 5].includes(Number($('stopPriority').value)) ? Number($('stopPriority').value) : 3,
      techId: state.techs.some((t) => t.id === $('stopTech').value) ? $('stopTech').value : state.techs[0].id,
      duration: $('stopDuration').value.trim() === '' ? 60 : Math.round(clampNum($('stopDuration').value, 5, 480, 60)),
      winStart: validTime($('stopWinStart').value, ''),
      winEnd: validTime($('stopWinEnd').value, ''),
      drive: driveRaw === '' ? '' : Math.round(clampNum(driveRaw, 0, 180, 0)),
    };
    if (editingId) {
      const stop = state.stops.find((s) => s.id === editingId);
      if (stop) Object.assign(stop, data);
      toast(`Updated "${data.customer}"`);
      cancelEdit();
    } else {
      state.stops.push({ id: uid(), ...data });
      toast(`Added "${data.customer}"`);
      clearStopForm();
      $('stopCustomer').focus();
    }
    renderAll();
  }

  // ----------------------------------------------------------- toast & modal
  let toastTimer = null;
  function toast(msg, opts = {}) {
    const el = $('toast');
    el.innerHTML = `<span>${esc(msg)}</span>${opts.undo ? '<button type="button" class="toast-undo">Undo</button>' : ''}`;
    if (opts.undo) {
      el.querySelector('.toast-undo').addEventListener('click', () => {
        opts.undo();
        hideToast();
        toast('Restored');
      });
    }
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, opts.undo ? 7000 : 2400);
  }
  function hideToast() { $('toast').classList.remove('show'); }

  let lastFocused = null;
  function openHelp() {
    lastFocused = document.activeElement;
    $('helpModal').hidden = false;
    $('helpClose').focus();
  }
  function closeHelp() {
    $('helpModal').hidden = true;
    if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
  }
  function trapFocus(e) {
    if ($('helpModal').hidden || e.key !== 'Tab') return;
    const focusables = $('helpModal').querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // ------------------------------------------------------------ import/export
  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyMarkdown() {
    const md = buildMarkdown(computePlan());
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(md)
        .then(() => toast('Dispatch sheet copied as Markdown'))
        .catch(() => toast('Copy blocked — use Download JSON instead'));
    } else {
      toast('Clipboard unavailable — use Download JSON instead');
    }
  }

  function loadDemo() {
    state = demoState(state);
    syncDayForm();
    renderTechs();
    renderStopTechSelect();
    cancelEdit();
    renderAll();
    toast('Demo day loaded — two vans, eight stops');
  }

  // ------------------------------------------------------------ event wiring
  // Day settings
  const dayFields = [
    ['dayDate', (v) => { if (/^\d{4}-\d{2}-\d{2}$/.test(v)) state.date = v; }],
    ['dayStart', (v) => { state.start = validTime(v, state.start); }],
    ['dayDepot', (v) => { state.depot = clean(v).slice(0, 90); }],
    ['dayMaxHours', (v) => { if (v.trim() !== '') state.maxHours = clampNum(v, 1, 14, state.maxHours); }],
    ['dayDrive', (v) => { if (v.trim() !== '') { state.drive = Math.round(clampNum(v, 0, 180, state.drive)); $('stopDrive').placeholder = `default ${state.drive}m`; } }],
    ['dayAdmin', (v) => { if (v.trim() !== '') state.admin = Math.round(clampNum(v, 0, 240, state.admin)); }],
    ['dayNote', (v) => { state.note = String(v).slice(0, 600); }],
  ];
  dayFields.forEach(([id, apply]) => {
    $(id).addEventListener('input', (e) => { apply(e.target.value); renderAll(); });
  });

  // Technicians (delegation)
  $('techList').addEventListener('input', (e) => {
    const row = e.target.closest('.tech-row');
    if (!row) return;
    const tech = state.techs.find((t) => t.id === row.dataset.id);
    if (!tech) return;
    if (e.target.dataset.field === 'name') tech.name = clean(e.target.value).slice(0, 60) || 'Tech';
    if (e.target.dataset.field === 'start') tech.start = validTime(e.target.value, tech.start);
    renderStopTechSelect();
    renderAll();
  });
  $('techList').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act="remove"]');
    if (!btn) return;
    const row = btn.closest('.tech-row');
    deleteTech(row.dataset.id);
    renderTechs();
    renderStopTechSelect();
  });
  $('addTechBtn').addEventListener('click', () => {
    state.techs.push({ id: uid(), name: `Tech ${state.techs.length + 1}`, start: state.start });
    renderTechs();
    renderStopTechSelect();
    renderAll();
    const rows = $('techList').querySelectorAll('.tech-row input[data-field="name"]');
    rows[rows.length - 1]?.focus();
  });

  // Stop form
  $('stopForm').addEventListener('submit', (e) => { e.preventDefault(); submitStopForm(); });
  $('stopCancelBtn').addEventListener('click', cancelEdit);
  $('stopCustomer').addEventListener('input', (e) => {
    if (clean(e.target.value)) {
      e.target.classList.remove('invalid');
      $('stopCustomerError').hidden = true;
    }
  });

  // Route board (delegation)
  $('routeBoard').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    if (btn.dataset.act === 'demo') { loadDemo(); return; }
    const card = btn.closest('.stop-card');
    if (!card) return;
    const id = card.dataset.id;
    if (btn.dataset.act === 'up') moveStop(id, -1);
    else if (btn.dataset.act === 'down') moveStop(id, 1);
    else if (btn.dataset.act === 'edit') beginEdit(id);
    else if (btn.dataset.act === 'del') deleteStop(id);
  });
  $('sortBtn').addEventListener('click', sortByWindow);

  // Header
  $('themeToggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    save();
  });
  $('demoBtn').addEventListener('click', loadDemo);
  $('helpBtn').addEventListener('click', openHelp);
  $('helpClose').addEventListener('click', closeHelp);
  $('helpModal').addEventListener('click', (e) => { if (e.target === $('helpModal')) closeHelp(); });

  // Export & handoff
  $('copyMdBtn').addEventListener('click', copyMarkdown);
  $('printBtn').addEventListener('click', () => window.print());
  $('downloadCsvBtn').addEventListener('click', () => {
    download(`dispatch-${state.date}.csv`, buildCsv(computePlan()), 'text/csv');
    toast('CSV downloaded');
  });
  $('downloadJsonBtn').addEventListener('click', () => {
    const payload = {
      app: 'home-service-route-planner',
      version: 1,
      exportedAt: new Date().toISOString(),
      note: SAFETY_LINE,
      state,
      markdown: buildMarkdown(computePlan()),
    };
    download(`dispatch-${state.date}.json`, JSON.stringify(payload, null, 2), 'application/json');
    toast('JSON downloaded');
  });
  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        state = normalize(parsed);
        applyTheme();
        syncDayForm();
        renderTechs();
        renderStopTechSelect();
        cancelEdit();
        renderAll();
        toast('Plan imported');
      } catch {
        toast('Import failed — not a valid JSON export');
      }
    };
    reader.onerror = () => toast('Import failed — could not read file');
    reader.readAsText(file);
  });
  $('resetBtn').addEventListener('click', () => {
    if (!window.confirm('Reset the planner? This clears all stops, technicians, and day settings.')) return;
    const keep = { theme: state.theme, seenGuide: state.seenGuide };
    state = { ...defaultState(), ...keep };
    syncDayForm();
    renderTechs();
    renderStopTechSelect();
    cancelEdit();
    renderAll();
    toast('Planner reset');
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    trapFocus(e);
    if (e.key === 'Escape' && !$('helpModal').hidden) { closeHelp(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      copyMarkdown();
      return;
    }
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
    if (e.key === '?' && !typing && $('helpModal').hidden) {
      e.preventDefault();
      openHelp();
    }
  });

  // -------------------------------------------------------------------- init
  applyTheme();
  syncDayForm();
  renderTechs();
  renderStopTechSelect();
  renderAll();
  if (!state.seenGuide) {
    state.seenGuide = true;
    save();
    openHelp();
  }
})();
