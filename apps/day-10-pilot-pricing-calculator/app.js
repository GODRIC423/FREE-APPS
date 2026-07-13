/* Pilot Pricing Calculator — remake (Day 10)
 * Price an AI pilot from recovered value, effort, and risk.
 * Local-first, draft-only. No network, no accounts, no sends.
 */
(() => {
  'use strict';

  // ---------------------------------------------------------------- constants

  const STORAGE_KEY = 'fable-remake:day-10-pilot-pricing-calculator:v1';
  const WEEKS_PER_MONTH = 4.345;
  const MIN_FLOOR = 750;        // never price a staffed pilot under this
  const FLOOR_MARGIN = 1.15;    // cost floor = effort cost + 15% margin
  const ROUND_TO = 25;          // present prices rounded to nearest $25

  const TEXT_FIELDS = { client: 90, workflow: 140 };

  const NUM_FIELDS = {
    monthlyLeads: { min: 0, max: 20000, def: 0 },
    leakRate:     { min: 0, max: 100, def: 0 },
    avgValue:     { min: 0, max: 1000000, def: 0 },
    recoveryRate: { min: 0, max: 100, def: 0 },
    proofWeeks:   { min: 1, max: 26, def: 6 },
    setupHours:   { min: 0, max: 400, def: 0 },
    weeklyHours:  { min: 0, max: 80, def: 0 },
    hourlyRate:   { min: 25, max: 1000, def: 125 },
  };

  const SLIDER_FIELDS = {
    valueShare:   { min: 5, max: 40, def: 20 },
    horizon:      { min: 1, max: 12, def: 3 },
    risk:         { min: 1, max: 10, def: 5 },
    proofClarity: { min: 1, max: 10, def: 5 },
    fit:          { min: 1, max: 10, def: 5 },
  };

  const DEMO = {
    client: 'North Star Plumbing — missed-call recovery pilot',
    workflow: 'Missed call + quote follow-up recovery lane',
    monthlyLeads: 140, leakRate: 18, avgValue: 850, recoveryRate: 32,
    proofWeeks: 6, setupHours: 12, weeklyHours: 2.5, hourlyRate: 110,
    valueShare: 20, horizon: 3, risk: 4, proofClarity: 7, fit: 8,
  };

  const $ = (id) => document.getElementById(id);

  // ------------------------------------------------------------ state helpers

  function defaultState() {
    const s = { v: 1, theme: prefersLight() ? 'light' : 'dark', seenGuide: false, client: '', workflow: '' };
    for (const k of Object.keys(NUM_FIELDS)) s[k] = NUM_FIELDS[k].def;
    for (const k of Object.keys(SLIDER_FIELDS)) s[k] = SLIDER_FIELDS[k].def;
    return s;
  }

  function prefersLight() {
    try { return window.matchMedia('(prefers-color-scheme: light)').matches; }
    catch { return false; }
  }

  function clampNum(raw, spec) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return spec.def;
    return Math.min(spec.max, Math.max(spec.min, n));
  }

  function normalize(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== 'object') return base;
    const s = { ...base };
    if (raw.theme === 'light' || raw.theme === 'dark') s.theme = raw.theme;
    s.seenGuide = raw.seenGuide === true;
    for (const [k, max] of Object.entries(TEXT_FIELDS)) {
      if (typeof raw[k] === 'string') s[k] = raw[k].slice(0, max);
    }
    for (const [k, spec] of Object.entries(NUM_FIELDS)) {
      if (raw[k] !== undefined) s[k] = clampNum(raw[k], spec);
    }
    for (const [k, spec] of Object.entries(SLIDER_FIELDS)) {
      if (raw[k] !== undefined) s[k] = Math.round(clampNum(raw[k], spec));
    }
    return s;
  }

  function loadState() {
    try { return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
    catch { return defaultState(); }
  }

  let state = loadState();
  let saveTimer = null;

  function saveNow() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
  }
  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 300);
  }

  // ------------------------------------------------------------- domain logic

  function multipliers(s) {
    return {
      risk: 1 + (s.risk - 5) * 0.05,                 // 0.80 … 1.25 contingency premium
      clarity: 0.85 + s.proofClarity * 0.03,         // 0.88 … 1.15 proof confidence
      fit: 1 - Math.max(0, s.fit - 5) * 0.02,        // 1.00 … 0.90 strategic-fit discount
    };
  }

  function priceFromValue(monthlyValue, s, mults, floor) {
    const anchor = monthlyValue * s.horizon * (s.valueShare / 100);
    const adjusted = anchor * mults.risk * mults.clarity * mults.fit;
    const target = Math.max(floor, adjusted);
    const low = Math.max(floor, target * 0.85);
    const high = Math.max(target * 1.2, low + 250);
    return { anchor, adjusted, target, low, high, floorBound: floor > 0 && adjusted < floor };
  }

  function computeModel(s) {
    const proofMonths = s.proofWeeks / WEEKS_PER_MONTH;
    const missed = s.monthlyLeads * (s.leakRate / 100);
    const recovered = missed * (s.recoveryRate / 100);
    const monthlyValue = recovered * s.avgValue;
    const proofValue = monthlyValue * proofMonths;
    const horizonValue = monthlyValue * s.horizon;

    const effortHours = s.setupHours + s.weeklyHours * s.proofWeeks;
    const effortCost = effortHours * s.hourlyRate;
    const floor = effortHours > 0 ? Math.max(MIN_FLOOR, effortCost * FLOOR_MARGIN) : 0;

    const mults = multipliers(s);
    const base = priceFromValue(monthlyValue, s, mults, floor);
    const hasValue = monthlyValue > 0;
    const hasModel = hasValue || effortHours > 0;

    const target = hasModel ? base.target : 0;
    const low = hasModel ? base.low : 0;
    const high = hasModel ? base.high : 0;
    const buyerRoi = target > 0 && hasValue ? horizonValue / target : 0;

    // Sensitivity scenarios: recovery rate ±30%.
    const scenarios = [
      { name: 'Conservative', factor: 0.7 },
      { name: 'Base case', factor: 1 },
      { name: 'Optimistic', factor: 1.3 },
    ].map((sc) => {
      const rate = Math.min(100, s.recoveryRate * sc.factor);
      const mv = missed * (rate / 100) * s.avgValue;
      const p = priceFromValue(mv, s, mults, floor);
      return { ...sc, rate, monthlyValue: mv, target: hasModel ? p.target : 0, floorBound: p.floorBound };
    });

    // Packaging options.
    const flatTotal = target;
    const months = Math.max(1, Math.ceil(proofMonths));
    const monthlyFee = (target * 1.1) / months;
    const monthlyTotal = monthlyFee * months;
    const continuation = hasValue
      ? Math.max(s.weeklyHours * WEEKS_PER_MONTH * s.hourlyRate * 1.4, monthlyValue * 0.12)
      : s.weeklyHours * WEEKS_PER_MONTH * s.hourlyRate * 1.4;
    const perfBase = floor * 0.6;
    const perfShare = Math.min(45, Math.max(10, Math.round(s.valueShare * 1.4)));
    const perfExpected = perfBase + proofValue * (perfShare / 100);
    const perfUpside = perfBase + proofValue * 1.3 * (perfShare / 100);

    return {
      proofMonths, missed, recovered, monthlyValue, proofValue, horizonValue,
      effortHours, effortCost, floor, mults,
      anchor: base.anchor, adjusted: base.adjusted,
      target, low, high, buyerRoi, hasValue, hasModel, scenarios,
      packaging: {
        flat: { total: flatTotal },
        monthly: { months, fee: monthlyFee, total: monthlyTotal, continuation },
        performance: { base: perfBase, share: perfShare, expected: perfExpected, downside: perfBase, upside: perfUpside },
      },
    };
  }

  function healthChecks(s, m) {
    const items = [];
    if (!m.hasModel) {
      items.push({ level: 'warn', text: 'No inputs yet — enter the value model and delivery effort to check deal health.' });
      return items;
    }
    if (m.hasValue && m.floor > m.adjusted) {
      items.push({ level: 'bad', text: `Cost floor (${money(m.floor)}) exceeds the adjusted value anchor (${money(m.adjusted)}). Shrink scope, shorten the window, or raise the capture share — otherwise you are selling hours, not value.` });
    }
    if (m.buyerRoi > 0 && m.buyerRoi < 3) {
      items.push({ level: 'warn', text: `Buyer ROI at target is ${m.buyerRoi.toFixed(1)}x. Below ~3x, buyers push back — strengthen the value model or lower the capture share.` });
    }
    if (!m.hasValue && m.effortHours > 0) {
      items.push({ level: 'warn', text: 'Only effort is filled in — the price is cost-based. Add the value model so you can defend a value-based number.' });
    }
    if (s.recoveryRate > 60) {
      items.push({ level: 'warn', text: `A ${s.recoveryRate}% recovery rate is rarely defensible in a first pilot. Consider quoting 20–40% and letting results argue upward.` });
    }
    if (s.proofWeeks > 12) {
      items.push({ level: 'warn', text: `A ${s.proofWeeks}-week proof window is long for a pilot. Phase it: prove one lane in 4–8 weeks, then extend.` });
    }
    if (m.effortHours > 80) {
      items.push({ level: 'warn', text: `${fmtNum(m.effortHours)} delivery hours is heavier than a pilot — this is a project. Split it or reprice as one.` });
    }
    if (items.length === 0) {
      items.push({ level: 'ok', text: 'No red flags with the current assumptions. The range is defensible as drafted.' });
    }
    return items;
  }

  function breakdownSteps(s, m) {
    const steps = [
      { label: 'Missed opportunities / mo', formula: `${fmtNum(s.monthlyLeads)} leads x ${s.leakRate}% leak`, result: `${fmtNum(m.missed)} / mo` },
      { label: 'Recovered opportunities / mo', formula: `${fmtNum(m.missed)} x ${s.recoveryRate}% recovery`, result: `${fmtNum(m.recovered)} / mo` },
      { label: 'Recovered value / mo', formula: `${fmtNum(m.recovered)} x ${money(s.avgValue)} avg`, result: money(m.monthlyValue) },
      { label: 'Proof-window value', formula: `${money(m.monthlyValue)} x ${m.proofMonths.toFixed(2)} mo (${s.proofWeeks} wks)`, result: money(m.proofValue) },
      { label: 'Value horizon', formula: `${money(m.monthlyValue)} x ${s.horizon} mo horizon`, result: money(m.horizonValue) },
      { label: 'Value anchor', formula: `${money(m.horizonValue)} x ${s.valueShare}% capture`, result: money(m.anchor) },
      { label: 'Sensitivity adjustment', formula: `x${m.mults.risk.toFixed(2)} risk x${m.mults.clarity.toFixed(2)} proof x${m.mults.fit.toFixed(2)} fit`, result: money(m.adjusted) },
      { label: 'Delivery cost', formula: `${fmtNum(m.effortHours)} h x ${money(s.hourlyRate)}/h`, result: money(m.effortCost) },
      { label: 'Cost floor', formula: `${money(m.effortCost)} x ${FLOOR_MARGIN} margin (min ${money(MIN_FLOOR)})`, result: money(m.floor) },
      { label: 'Recommended target', formula: 'max(cost floor, adjusted anchor)', result: money(round25(m.target)), key: true },
    ];
    return steps;
  }

  // ---------------------------------------------------------------- formatting

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function money(n) {
    const safe = Number.isFinite(n) ? n : 0;
    return safe.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  }
  function round25(n) { return Math.round(n / ROUND_TO) * ROUND_TO; }
  function fmtNum(n) {
    const safe = Number.isFinite(n) ? n : 0;
    return safe.toLocaleString('en-US', { maximumFractionDigits: 1 });
  }
  function mult(n) { return `x${n.toFixed(2)}`; }

  // ------------------------------------------------------------------- render

  function bindInputs() {
    for (const k of Object.keys(TEXT_FIELDS)) $(k).value = state[k];
    for (const k of Object.keys(NUM_FIELDS)) $(k).value = state[k];
    for (const k of Object.keys(SLIDER_FIELDS)) $(k).value = state[k];
  }

  function renderStats(m) {
    $('statTarget').textContent = m.hasModel ? money(round25(m.target)) : '—';
    $('statRange').textContent = m.hasModel ? `${money(round25(m.low))}–${money(round25(m.high))}` : '—';
    $('statMonthly').textContent = m.hasValue ? money(m.monthlyValue) : '—';
    $('statRoi').textContent = m.buyerRoi > 0 ? `${m.buyerRoi.toFixed(1)}x` : '—';
  }

  function renderLevers(m) {
    $('valueShareOut').textContent = `${state.valueShare}%`;
    $('horizonOut').textContent = `${state.horizon} mo`;
    $('riskOut').textContent = String(state.risk);
    $('proofClarityOut').textContent = String(state.proofClarity);
    $('fitOut').textContent = String(state.fit);
    $('valueShareChip').textContent = m.hasValue ? `${money(m.anchor)} anchor` : '—';
    $('horizonChip').textContent = m.hasValue ? `${money(m.horizonValue)} value` : '—';
    $('riskChip').textContent = mult(m.mults.risk);
    $('proofClarityChip').textContent = mult(m.mults.clarity);
    $('fitChip').textContent = mult(m.mults.fit);
  }

  function renderEffort(m) {
    $('effortReadout').innerHTML = m.effortHours > 0
      ? `Total effort <strong>${esc(fmtNum(m.effortHours))} h</strong> &middot; delivery cost <strong>${esc(money(m.effortCost))}</strong> &middot; walk-away floor <strong>${esc(money(round25(m.floor)))}</strong>`
      : 'Enter hours to compute your delivery cost and walk-away floor.';
  }

  function renderBreakdown(m) {
    const empty = $('breakdownEmpty');
    const table = $('breakdownTable');
    if (!m.hasModel) {
      empty.hidden = false;
      table.style.display = 'none';
      $('breakdownBody').innerHTML = '';
      return;
    }
    empty.hidden = true;
    table.style.display = '';
    $('breakdownBody').innerHTML = breakdownSteps(state, m).map((st) => `
      <tr${st.key ? ' class="key-row"' : ''}>
        <td>${esc(st.label)}</td>
        <td class="formula">${esc(st.formula)}</td>
        <td class="result">${esc(st.result)}</td>
      </tr>`).join('');
  }

  function renderHealth(m) {
    $('healthList').innerHTML = healthChecks(state, m)
      .map((h) => `<li class="${h.level}">${esc(h.text)}</li>`).join('');
  }

  function renderRange(m) {
    const viz = $('rangeViz');
    const legend = $('rangeLegend');
    if (!m.hasModel) {
      viz.innerHTML = '<div class="track"></div>';
      legend.innerHTML = '<span>Enter inputs to see the range</span>';
      $('rangeCards').innerHTML = `
        <article><span>Walk-away floor</span><strong>—</strong><p>Covers delivery cost + margin.</p></article>
        <article class="hot"><span>Recommended target</span><strong>—</strong><p>Blend of value anchor and floor.</p></article>
        <article><span>Stretch ceiling</span><strong>—</strong><p>Anchor for strong-fit negotiations.</p></article>`;
      $('scenarioBody').innerHTML = '<tr><td colspan="4" class="floor-note">No value model yet.</td></tr>';
      return;
    }
    const scale = Math.max(m.high * 1.15, 1);
    const pct = (v) => `${Math.min(100, Math.max(0, (v / scale) * 100)).toFixed(1)}%`;
    viz.innerHTML = `
      <div class="track"></div>
      <div class="band" style="left:${pct(m.low)};width:calc(${pct(m.high)} - ${pct(m.low)})"></div>
      ${m.floor > 0 ? `<div class="marker floor" style="left:${pct(m.floor)}" title="Floor"></div>` : ''}
      <div class="marker" style="left:${pct(m.target)}" title="Target"></div>`;
    legend.innerHTML = [
      m.floor > 0 ? `<span>Floor <b>${esc(money(round25(m.floor)))}</b></span>` : '',
      `<span>Low <b>${esc(money(round25(m.low)))}</b></span>`,
      `<span>Target <b>${esc(money(round25(m.target)))}</b></span>`,
      `<span>High <b>${esc(money(round25(m.high)))}</b></span>`,
    ].join('');
    $('rangeCards').innerHTML = `
      <article>
        <span>Walk-away floor</span><strong>${esc(money(round25(m.floor || m.low)))}</strong>
        <p>Delivery cost + ${Math.round((FLOOR_MARGIN - 1) * 100)}% margin. Below this, decline politely.</p>
      </article>
      <article class="hot">
        <span>Recommended target</span><strong>${esc(money(round25(m.target)))}</strong>
        <p>Lead with this. It is ${esc(state.valueShare)}% of the ${esc(String(state.horizon))}-month value, adjusted for risk, proof, and fit.</p>
      </article>
      <article>
        <span>Stretch ceiling</span><strong>${esc(money(round25(m.high)))}</strong>
        <p>Anchor only when proof clarity and urgency are both high.</p>
      </article>`;
    $('scenarioBody').innerHTML = m.scenarios.map((sc) => `
      <tr>
        <td>${esc(sc.name)}</td>
        <td>${esc(sc.rate.toFixed(0))}%</td>
        <td>${esc(money(sc.monthlyValue))}</td>
        <td>${esc(money(round25(sc.target)))}${sc.floorBound ? ' <span class="floor-note">(floor)</span>' : ''}</td>
      </tr>`).join('');
  }

  function renderPackaging(m) {
    const grid = $('packGrid');
    if (!m.hasModel) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <p><strong>Nothing to package yet.</strong> Fill in the value model and effort above, and the three packaging options will be computed from the same defensible range.</p>
      </div>`;
      return;
    }
    const p = m.packaging;
    grid.innerHTML = `
      <article class="recommended">
        <div class="pack-head"><h3>Flat pilot fee</h3><span class="pack-badge">Simplest to sell</span></div>
        <div class="pack-price">${esc(money(round25(p.flat.total)))} <small>one-time</small></div>
        <div class="pack-struct">50% to start &middot; 50% at proof review</div>
        <div class="pack-rows">
          <div><span class="k">Covers</span><span class="v">${esc(String(state.proofWeeks))}-week proof window</span></div>
          <div><span class="k">Your risk</span><span class="v">Low — fee is committed</span></div>
          <div><span class="k">Buyer risk</span><span class="v">Capped, known up front</span></div>
        </div>
        <p class="pack-note"><strong>Best when</strong> the buyer wants a fixed number and you trust your effort estimate. Watch out: no upside if results overshoot.</p>
      </article>
      <article>
        <div class="pack-head"><h3>Monthly during proof</h3><span class="pack-badge">Cash-flow friendly</span></div>
        <div class="pack-price">${esc(money(round25(p.monthly.fee)))} <small>/ mo x ${esc(String(p.monthly.months))}</small></div>
        <div class="pack-struct">Total ${esc(money(round25(p.monthly.total)))} (+10% for pay-as-you-go)</div>
        <div class="pack-rows">
          <div><span class="k">Total vs flat</span><span class="v">${esc(money(round25(p.monthly.total - p.flat.total)))} more</span></div>
          <div><span class="k">After proof</span><span class="v">${esc(money(round25(p.monthly.continuation)))} / mo suggested</span></div>
          <div><span class="k">Buyer risk</span><span class="v">Can stop monthly</span></div>
        </div>
        <p class="pack-note"><strong>Best when</strong> the buyer is cash-tight or wants an easy exit. Watch out: they can cancel before proof completes.</p>
      </article>
      <article>
        <div class="pack-head"><h3>Performance-based</h3><span class="pack-badge">Shared upside</span></div>
        <div class="pack-price">${esc(money(round25(p.performance.base)))} <small>base + ${esc(String(p.performance.share))}% of recovered</small></div>
        <div class="pack-struct">Base covers ~60% of your floor</div>
        <div class="pack-rows">
          <div><span class="k">Expected total</span><span class="v">${esc(money(round25(p.performance.expected)))}</span></div>
          <div><span class="k">Downside (0 recovery)</span><span class="v">${esc(money(round25(p.performance.downside)))}</span></div>
          <div><span class="k">Upside (+30%)</span><span class="v">${esc(money(round25(p.performance.upside)))}</span></div>
        </div>
        <p class="pack-note"><strong>Best when</strong> recovered value is cleanly measurable and attributable. Watch out: requires agreed measurement before the pilot starts.</p>
      </article>`;
  }

  // ----------------------------------------------------------------- exports

  function memoMarkdown(m) {
    const s = state;
    const p = m.packaging;
    const lines = [];
    lines.push(`# Pilot pricing memo — ${s.client || '[client name missing]'}`);
    lines.push('');
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push('Status: DRAFT for human review. This memo does not create invoices, quotes, contracts, or customer communication.');
    lines.push('');
    lines.push('## Pilot');
    lines.push(`- Client / pilot: ${s.client || '[missing]'}`);
    lines.push(`- Workflow being fixed: ${s.workflow || '[missing]'}`);
    lines.push(`- Proof window: ${s.proofWeeks} weeks (${m.proofMonths.toFixed(2)} months)`);
    lines.push('');
    lines.push('## Assumptions');
    lines.push(`- Monthly leads / events: ${fmtNum(s.monthlyLeads)}`);
    lines.push(`- Leak / miss rate: ${s.leakRate}%`);
    lines.push(`- Average job value: ${money(s.avgValue)}`);
    lines.push(`- Expected recovery rate: ${s.recoveryRate}%`);
    lines.push(`- Delivery: ${s.setupHours} setup h + ${s.weeklyHours} h/wk x ${s.proofWeeks} wks @ ${money(s.hourlyRate)}/h`);
    lines.push(`- Levers: ${s.valueShare}% capture, ${s.horizon}-mo horizon, risk ${s.risk}/10, proof clarity ${s.proofClarity}/10, fit ${s.fit}/10`);
    lines.push('');
    lines.push('## Formula breakdown');
    lines.push('| Step | Calculation | Result |');
    lines.push('| --- | --- | --- |');
    for (const st of breakdownSteps(s, m)) {
      lines.push(`| ${st.label} | ${st.formula} | ${st.result} |`);
    }
    lines.push('');
    lines.push('## Recommended range');
    lines.push(`- Walk-away floor: ${money(round25(m.floor || m.low))}`);
    lines.push(`- Recommended target: ${money(round25(m.target))}`);
    lines.push(`- Stretch ceiling: ${money(round25(m.high))}`);
    lines.push(`- Buyer ROI at target (over ${s.horizon}-mo horizon): ${m.buyerRoi > 0 ? m.buyerRoi.toFixed(1) + 'x' : 'n/a'}`);
    lines.push('');
    lines.push('## Packaging options');
    lines.push(`1. Flat pilot fee — ${money(round25(p.flat.total))} one-time (50% start / 50% at proof review). Simplest; no upside share.`);
    lines.push(`2. Monthly during proof — ${money(round25(p.monthly.fee))}/mo x ${p.monthly.months} (total ${money(round25(p.monthly.total))}, +10% flexibility premium). Suggested continuation after proof: ${money(round25(p.monthly.continuation))}/mo.`);
    lines.push(`3. Performance-based — ${money(round25(p.performance.base))} base + ${p.performance.share}% of measured recovered value. Expected ${money(round25(p.performance.expected))}; downside ${money(round25(p.performance.downside))}; upside ${money(round25(p.performance.upside))}. Requires agreed measurement.`);
    lines.push('');
    lines.push('## Sensitivity (recovery rate +/-30%)');
    for (const sc of m.scenarios) {
      lines.push(`- ${sc.name}: ${sc.rate.toFixed(0)}% recovery -> ${money(sc.monthlyValue)}/mo -> target ${money(round25(sc.target))}${sc.floorBound ? ' (floor-bound)' : ''}`);
    }
    lines.push('');
    lines.push('## Deal health');
    for (const h of healthChecks(s, m)) {
      lines.push(`- [${h.level.toUpperCase()}] ${h.text}`);
    }
    lines.push('');
    lines.push('## Guardrail');
    lines.push('Human review required before sharing. Re-check assumptions, scope, proof window, measurement plan, payment terms, and claims. Never promise recovered value as guaranteed revenue.');
    return lines.join('\n');
  }

  function csvExport(m) {
    const s = state;
    const rows = [
      ['field', 'value'],
      ['client', s.client], ['workflow', s.workflow],
      ['monthly_leads', s.monthlyLeads], ['leak_rate_pct', s.leakRate],
      ['avg_value_usd', s.avgValue], ['recovery_rate_pct', s.recoveryRate],
      ['proof_weeks', s.proofWeeks], ['setup_hours', s.setupHours],
      ['weekly_hours', s.weeklyHours], ['hourly_rate_usd', s.hourlyRate],
      ['value_capture_pct', s.valueShare], ['value_horizon_months', s.horizon],
      ['risk_1_10', s.risk], ['proof_clarity_1_10', s.proofClarity], ['strategic_fit_1_10', s.fit],
      ['recovered_value_per_month_usd', Math.round(m.monthlyValue)],
      ['proof_window_value_usd', Math.round(m.proofValue)],
      ['value_anchor_usd', Math.round(m.anchor)],
      ['effort_cost_usd', Math.round(m.effortCost)],
      ['cost_floor_usd', round25(m.floor)],
      ['price_low_usd', round25(m.low)], ['price_target_usd', round25(m.target)], ['price_high_usd', round25(m.high)],
      ['buyer_roi_x', m.buyerRoi.toFixed(2)],
      ['pack_flat_total_usd', round25(m.packaging.flat.total)],
      ['pack_monthly_fee_usd', round25(m.packaging.monthly.fee)],
      ['pack_perf_base_usd', round25(m.packaging.performance.base)],
      ['pack_perf_share_pct', m.packaging.performance.share],
      ['status', 'draft-only human review required'],
    ];
    return rows.map((r) => r.map((c) => `"${String(c ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  }

  function renderPrintSheet(m) {
    const s = state;
    const p = m.packaging;
    const rows = breakdownSteps(s, m).map((st) =>
      `<tr><td>${esc(st.label)}</td><td>${esc(st.formula)}</td><td>${esc(st.result)}</td></tr>`).join('');
    $('printSheet').innerHTML = `
      <h1>Pilot pricing memo — ${esc(s.client || '[client name missing]')}</h1>
      <p class="muted">Generated ${esc(new Date().toLocaleString())} · DRAFT for human review · No invoices, contracts, or sends were created.</p>
      <h2>Pilot</h2>
      <p>Workflow: ${esc(s.workflow || '[missing]')} · Proof window: ${esc(String(s.proofWeeks))} weeks</p>
      <h2>Formula breakdown</h2>
      <table><thead><tr><th>Step</th><th>Calculation</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table>
      <h2>Recommended range</h2>
      <ul>
        <li>Walk-away floor: ${esc(money(round25(m.floor || m.low)))}</li>
        <li>Recommended target: ${esc(money(round25(m.target)))}</li>
        <li>Stretch ceiling: ${esc(money(round25(m.high)))}</li>
        <li>Buyer ROI at target: ${esc(m.buyerRoi > 0 ? m.buyerRoi.toFixed(1) + 'x' : 'n/a')}</li>
      </ul>
      <h2>Packaging options</h2>
      <ul>
        <li>Flat pilot fee: ${esc(money(round25(p.flat.total)))} one-time (50/50 split)</li>
        <li>Monthly during proof: ${esc(money(round25(p.monthly.fee)))}/mo x ${esc(String(p.monthly.months))} — total ${esc(money(round25(p.monthly.total)))}; continuation ${esc(money(round25(p.monthly.continuation)))}/mo</li>
        <li>Performance: ${esc(money(round25(p.performance.base)))} base + ${esc(String(p.performance.share))}% of measured recovered value (expected ${esc(money(round25(p.performance.expected)))})</li>
      </ul>
      <h2>Deal health</h2>
      <ul>${healthChecks(s, m).map((h) => `<li>[${esc(h.level.toUpperCase())}] ${esc(h.text)}</li>`).join('')}</ul>
      <h2>Guardrail</h2>
      <p>Human review required before sharing. Never promise recovered value as guaranteed revenue.</p>`;
  }

  // -------------------------------------------------------------- render all

  function renderAll() {
    const m = computeModel(state);
    renderStats(m);
    renderLevers(m);
    renderEffort(m);
    renderBreakdown(m);
    renderHealth(m);
    renderRange(m);
    renderPackaging(m);
    $('memoPreview').value = memoMarkdown(m);
    renderPrintSheet(m);
    saveSoon();
  }

  // -------------------------------------------------------------------- theme

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    const btn = $('themeToggle');
    btn.textContent = state.theme === 'dark' ? '☾' : '☀';
    btn.setAttribute('aria-pressed', state.theme === 'light' ? 'true' : 'false');
    btn.setAttribute('aria-label', state.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }

  // -------------------------------------------------------------------- toast

  let toastTimer = null;
  function toast(msg, opts = {}) {
    const el = $('toast');
    el.innerHTML = '';
    const span = document.createElement('span');
    span.textContent = msg;
    el.appendChild(span);
    if (opts.actionLabel && typeof opts.onAction === 'function') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-primary';
      btn.textContent = opts.actionLabel;
      btn.addEventListener('click', () => {
        hideToast();
        opts.onAction();
      });
      el.appendChild(btn);
    }
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, opts.duration ?? (opts.actionLabel ? 7000 : 2400));
  }
  function hideToast() {
    $('toast').classList.remove('show');
  }

  // -------------------------------------------------------------- help modal

  let lastFocus = null;
  function openHelp() {
    lastFocus = document.activeElement;
    const modal = $('helpModal');
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
    $('helpClose').focus();
  }
  function closeHelp() {
    const modal = $('helpModal');
    if (typeof modal.close === 'function' && modal.open) modal.close();
    else modal.removeAttribute('open');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  // ------------------------------------------------------------ file helpers

  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyText(text, okMsg) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => toast(okMsg))
        .catch(() => fallbackCopy());
    } else fallbackCopy();
    function fallbackCopy() {
      const ta = $('memoPreview');
      ta.focus();
      ta.select();
      toast('Clipboard blocked — memo selected, press Ctrl/Cmd+C');
    }
  }

  // ------------------------------------------------------------ event wiring

  function readInputsIntoState() {
    for (const [k, max] of Object.entries(TEXT_FIELDS)) {
      state[k] = $(k).value.slice(0, max);
    }
    for (const [k, spec] of Object.entries(NUM_FIELDS)) {
      const el = $(k);
      const raw = el.value;
      if (raw === '') { state[k] = spec.min; el.classList.remove('invalid'); continue; }
      const n = Number(raw);
      const clamped = clampNum(raw, spec);
      state[k] = clamped;
      el.classList.toggle('invalid', !Number.isFinite(n) || n < spec.min || n > spec.max);
    }
    for (const [k, spec] of Object.entries(SLIDER_FIELDS)) {
      state[k] = Math.round(clampNum($(k).value, spec));
    }
  }

  function onFieldInput(e) {
    const id = e.target && e.target.id;
    if (!id) return;
    if (id in TEXT_FIELDS || id in NUM_FIELDS || id in SLIDER_FIELDS) {
      readInputsIntoState();
      renderAll();
    }
  }

  function onNumberBlur(e) {
    const id = e.target && e.target.id;
    if (id in NUM_FIELDS) {
      e.target.value = state[id];
      e.target.classList.remove('invalid');
      renderAll();
    }
  }

  function loadDemo() {
    const keep = { theme: state.theme, seenGuide: state.seenGuide };
    state = normalize({ ...DEMO, ...keep });
    bindInputs();
    renderAll();
    saveNow();
    toast('Demo pilot loaded — a plumbing missed-call recovery scenario');
  }

  function resetAll() {
    if (!window.confirm('Reset the calculator? Your current inputs will be cleared (you can undo for a few seconds).')) return;
    const snapshot = JSON.stringify(state);
    const keep = { theme: state.theme, seenGuide: state.seenGuide };
    state = { ...defaultState(), ...keep };
    bindInputs();
    renderAll();
    saveNow();
    toast('Calculator reset', {
      actionLabel: 'Undo',
      onAction: () => {
        state = normalize(JSON.parse(snapshot));
        bindInputs();
        renderAll();
        saveNow();
        toast('Inputs restored');
      },
    });
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const incoming = parsed && typeof parsed === 'object' && parsed.state ? parsed.state : parsed;
        const keep = { theme: state.theme, seenGuide: state.seenGuide };
        state = normalize({ ...incoming, ...keep });
        bindInputs();
        renderAll();
        saveNow();
        toast('Pricing scenario imported');
      } catch {
        toast('Import failed — not a valid JSON export');
      }
    };
    reader.onerror = () => toast('Import failed — could not read the file');
    reader.readAsText(file);
  }

  function wireEvents() {
    const main = $('main');
    main.addEventListener('input', onFieldInput);
    main.addEventListener('blur', onNumberBlur, true);

    $('themeToggle').addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme();
      saveNow();
      toast(`${state.theme === 'dark' ? 'Dark' : 'Light'} theme saved`);
    });

    $('demoBtn').addEventListener('click', loadDemo);
    $('helpBtn').addEventListener('click', openHelp);
    $('helpClose').addEventListener('click', closeHelp);
    $('helpModal').addEventListener('cancel', (e) => {
      e.preventDefault();
      closeHelp();
    });
    $('helpModal').addEventListener('click', (e) => {
      if (e.target === $('helpModal')) closeHelp();
    });

    $('copyMemoBtn').addEventListener('click', () => copyText($('memoPreview').value, 'Pricing memo copied as Markdown'));

    $('downloadJsonBtn').addEventListener('click', () => {
      const m = computeModel(state);
      const payload = {
        app: 'pilot-pricing-calculator',
        version: 1,
        exportedAt: new Date().toISOString(),
        safety: 'draft-only, human review required',
        state: { ...state },
        derived: {
          monthlyValue: Math.round(m.monthlyValue),
          proofValue: Math.round(m.proofValue),
          floor: round25(m.floor),
          low: round25(m.low),
          target: round25(m.target),
          high: round25(m.high),
          buyerRoi: Number(m.buyerRoi.toFixed(2)),
        },
        memo: memoMarkdown(m),
      };
      download('pilot-pricing-calculator.json', JSON.stringify(payload, null, 2), 'application/json');
      toast('JSON downloaded');
    });

    $('downloadCsvBtn').addEventListener('click', () => {
      download('pilot-pricing-calculator.csv', csvExport(computeModel(state)), 'text/csv');
      toast('CSV downloaded');
    });

    $('importBtn').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) importJson(file);
      e.target.value = '';
    });

    $('printBtn').addEventListener('click', () => window.print());
    $('resetBtn').addEventListener('click', resetAll);

    document.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === '?' && !typing) {
        e.preventDefault();
        openHelp();
      } else if (e.key === 'Escape' && $('helpModal').open) {
        closeHelp();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        copyText($('memoPreview').value, 'Pricing memo copied as Markdown');
      }
    });
  }

  // --------------------------------------------------------------------- init

  function init() {
    applyTheme();
    bindInputs();
    renderAll();
    wireEvents();
    if (!state.seenGuide) {
      state.seenGuide = true;
      saveNow();
      openHelp();
    }
  }

  init();
})();
