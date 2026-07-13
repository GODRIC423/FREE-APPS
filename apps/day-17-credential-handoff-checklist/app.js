/* Credential Handoff Checklist — access-custody tracker. Metadata only, never secrets. */
(() => {
  'use strict';

  // ---------- constants ----------

  const LS_KEY = 'fable-remake:day-17-credential-handoff-checklist:v1';

  const LANES = ['intake', 'verify', 'handoff', 'revoke'];
  const LANE_LABELS = { intake: 'Intake', verify: 'Verify', handoff: 'Handoff ready', revoke: 'Revoke / remove' };

  const TYPES = ['Admin login', 'API key', 'Shared inbox', 'Domain/DNS', 'Payment portal', 'Database', 'Cloud console', 'Social account', 'SSO / IdP', 'Other'];
  const LEVELS = ['Viewer', 'Editor', 'Admin', 'Billing', 'Owner'];
  const LEVEL_RANK = { Viewer: 1, Editor: 2, Admin: 4, Billing: 4, Owner: 5 };

  const MFA_LABELS = { enforced: 'MFA enforced', enabled: 'MFA enabled', none: 'No MFA', na: 'MFA not available' };

  const SEV = { critical: 35, high: 18, medium: 10, low: 4 };
  const SEV_ORDER = ['critical', 'high', 'medium', 'low'];

  const CONTROL_KEYS = ['backupConfirmed', 'revokeDocumented', 'leastPrivilege', 'storageVerified', 'noSecretStored'];
  const CONTROL_LABELS = {
    backupConfirmed: 'Backup owner confirmed',
    revokeDocumented: 'Revocation path documented',
    leastPrivilege: 'Least privilege reviewed',
    storageVerified: 'Storage reference verified',
    noSecretStored: 'No secret value stored here'
  };

  const ROTATION_DUE_SOON_DAYS = 14;

  // shared-credential types where rotation is mandatory on any departure
  const SHARED_TYPES = ['API key', 'Shared inbox', 'Database', 'Social account'];

  // ---------- tiny helpers ----------

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
  const uid = () => 'sys-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const isoDate = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };
  const cloneDeep = (v) => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

  // ---------- secret lint (hard block: nothing password-shaped may be saved) ----------

  const LINT_PATTERNS = [
    [/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/, 'private key block'],
    [/-----BEGIN PGP[A-Z ]*-----/, 'PGP block'],
    [/\bgithub_pat_[A-Za-z0-9_]{20,}/, 'GitHub fine-grained token'],
    [/\bgh[pousr]_[A-Za-z0-9]{20,}\b/, 'GitHub token'],
    [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, 'Slack token'],
    [/\bsk-[A-Za-z0-9_-]{16,}\b/, 'API secret key (sk-…)'],
    [/\b[rs]k_(?:live|test)_[A-Za-z0-9]{10,}\b/, 'Stripe-style key'],
    [/\bnpm_[A-Za-z0-9]{30,}\b/, 'npm token'],
    [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key ID'],
    [/\bAIza[0-9A-Za-z_-]{30,}/, 'Google API key'],
    [/\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}/, 'JWT'],
    [/\bbearer\s+[A-Za-z0-9._~+/=-]{16,}/i, 'bearer token'],
    [/\botp\s*[:=]?\s*\d{6}\b/i, 'one-time code'],
    [/\b(?:password|passwd|pwd|passphrase|pin|secret|token|api[_ ]?key)\s*[:=]\s*(?=\S*[\d!@#$%^&*+])\S{6,}/i, 'secret assignment (password: …)']
  ];

  function tokenLooksSecret(token) {
    if (token.length >= 32 && /^[0-9a-f]+$/i.test(token)) return true; // long hex
    if (token.length < 20) return false;
    if (/:\/\/|^www\./i.test(token)) return false; // plain URLs handled by explicit patterns
    let classes = 0;
    if (/[a-z]/.test(token)) classes++;
    if (/[A-Z]/.test(token)) classes++;
    if (/\d/.test(token)) classes++;
    if (/[^A-Za-z0-9]/.test(token)) classes++;
    return classes >= 3; // long, mixed-class, no spaces => password-shaped
  }

  function secretLint(text) {
    const hits = [];
    const value = String(text ?? '');
    for (const [re, label] of LINT_PATTERNS) {
      const m = value.match(re);
      if (m) hits.push({ label, sample: m[0].slice(0, 8) + '…' });
    }
    for (const token of value.split(/\s+/)) {
      if (tokenLooksSecret(token)) {
        hits.push({ label: 'high-entropy string (password-shaped)', sample: token.slice(0, 8) + '…' });
        break;
      }
    }
    return hits;
  }

  function scrubSecrets(text) {
    let value = String(text ?? '');
    for (const [re] of LINT_PATTERNS) {
      value = value.replace(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'), '[removed-by-lint]');
    }
    value = value.split(/(\s+)/).map((part) => (tokenLooksSecret(part) ? '[removed-by-lint]' : part)).join('');
    return value;
  }

  // fields the lint watches, in editor and in stored items
  const LINTED_FIELDS = [
    ['systemName', 'System / vendor'],
    ['owner', 'Primary owner'],
    ['backupOwner', 'Backup owner'],
    ['storageRef', 'Storage reference'],
    ['notes', 'Notes']
  ];

  // ---------- state ----------

  function blankItem() {
    return {
      id: uid(),
      systemName: '',
      accessType: 'Admin login',
      accessLevel: 'Viewer',
      mfa: 'enabled',
      owner: '',
      backupOwner: '',
      storageRef: '',
      rotationDate: '',
      lane: 'intake',
      controls: { backupConfirmed: false, revokeDocumented: false, leastPrivilege: false, storageVerified: false, noSecretStored: true },
      notes: ''
    };
  }

  function defaultState() {
    return {
      version: 1,
      ui: { theme: 'dark', seenGuide: false },
      editingId: null,
      items: [],
      offboard: { person: '', done: {} }
    };
  }

  function demoItems() {
    return [
      {
        id: uid(), systemName: 'Google Workspace super-admin', accessType: 'Admin login', accessLevel: 'Owner', mfa: 'enforced',
        owner: 'Priya (founder)', backupOwner: 'Marcus', storageRef: 'Password manager › "GWS super-admin" item',
        rotationDate: isoDate(45), lane: 'handoff',
        controls: { backupConfirmed: true, revokeDocumented: true, leastPrivilege: true, storageVerified: true, noSecretStored: true },
        notes: 'Revoke: Admin console › Users › suspend, then transfer super-admin role. Rotate password after any handoff.'
      },
      {
        id: uid(), systemName: 'Booking platform API', accessType: 'API key', accessLevel: 'Editor', mfa: 'na',
        owner: 'Ops desk', backupOwner: 'Priya (founder)', storageRef: 'Password manager › "Booking API key" item (label only)',
        rotationDate: isoDate(-12), lane: 'verify',
        controls: { backupConfirmed: true, revokeDocumented: true, leastPrivilege: false, storageVerified: true, noSecretStored: true },
        notes: 'Key scope should be lead-read and booking-create only. Regenerate from vendor dashboard › Developer › API keys.'
      },
      {
        id: uid(), systemName: 'Domain registrar / DNS', accessType: 'Domain/DNS', accessLevel: 'Owner', mfa: 'none',
        owner: 'Priya (founder)', backupOwner: '', storageRef: 'Password manager › "Registrar owner login"',
        rotationDate: isoDate(30), lane: 'intake',
        controls: { backupConfirmed: false, revokeDocumented: true, leastPrivilege: false, storageVerified: true, noSecretStored: true },
        notes: 'Highest-blast-radius account. Enable MFA and add a backup owner before any other change.'
      },
      {
        id: uid(), systemName: 'Shared support inbox', accessType: 'Shared inbox', accessLevel: 'Admin', mfa: 'enabled',
        owner: 'Marcus', backupOwner: 'Office manager', storageRef: 'Password manager › "Support inbox admin"',
        rotationDate: isoDate(10), lane: 'handoff',
        controls: { backupConfirmed: true, revokeDocumented: true, leastPrivilege: true, storageVerified: true, noSecretStored: true },
        notes: 'Revoke by removing member from inbox admin console. Do not export mailbox contents.'
      },
      {
        id: uid(), systemName: 'Payment portal', accessType: 'Payment portal', accessLevel: 'Billing', mfa: 'enforced',
        owner: 'Marcus', backupOwner: 'Priya (founder)', storageRef: 'Password manager › "Payment portal billing"',
        rotationDate: isoDate(60), lane: 'verify',
        controls: { backupConfirmed: true, revokeDocumented: false, leastPrivilege: true, storageVerified: true, noSecretStored: true },
        notes: ''
      },
      {
        id: uid(), systemName: 'Reporting DB read replica', accessType: 'Database', accessLevel: 'Viewer', mfa: 'na',
        owner: 'Dana (contractor)', backupOwner: 'Marcus', storageRef: 'Password manager › "Reporting DB read-only" item',
        rotationDate: '', lane: 'revoke',
        controls: { backupConfirmed: true, revokeDocumented: true, leastPrivilege: true, storageVerified: false, noSecretStored: true },
        notes: 'Contract ends this month — revoke DB user and rotate the shared read-only credential.'
      }
    ];
  }

  function normalizeItem(raw) {
    const base = blankItem();
    const src = (raw && typeof raw === 'object') ? raw : {};
    const item = {
      id: typeof src.id === 'string' && src.id ? src.id : base.id,
      systemName: scrubSecrets(clean(src.systemName)).slice(0, 120),
      accessType: TYPES.includes(src.accessType) ? src.accessType : 'Other',
      accessLevel: LEVELS.includes(src.accessLevel) ? src.accessLevel : 'Viewer',
      mfa: MFA_LABELS[src.mfa] ? src.mfa : 'none',
      owner: scrubSecrets(clean(src.owner)).slice(0, 80),
      backupOwner: scrubSecrets(clean(src.backupOwner)).slice(0, 80),
      storageRef: scrubSecrets(clean(src.storageRef)).slice(0, 160),
      rotationDate: /^\d{4}-\d{2}-\d{2}$/.test(String(src.rotationDate || '')) ? src.rotationDate : '',
      lane: LANES.includes(src.lane) ? src.lane : (LANES.includes(src.status) ? src.status : 'intake'),
      controls: {},
      notes: scrubSecrets(String(src.notes || '').trim()).slice(0, 700)
    };
    const rawControls = (src.controls && typeof src.controls === 'object') ? src.controls : {};
    for (const key of CONTROL_KEYS) {
      item.controls[key] = key === 'noSecretStored' ? rawControls[key] !== false : Boolean(rawControls[key]);
    }
    // legacy field names from v0 of this app
    if (rawControls.revokePath && !item.controls.revokeDocumented) item.controls.revokeDocumented = true;
    if (rawControls.storageConfirmed && !item.controls.storageVerified) item.controls.storageVerified = true;
    if (rawControls.mfaEnabled && !MFA_LABELS[src.mfa]) item.mfa = 'enabled';
    if (!item.systemName) item.systemName = 'Unnamed system';
    return item;
  }

  function normalize(raw) {
    const next = defaultState();
    const src = (raw && typeof raw === 'object') ? raw : {};
    const ui = (src.ui && typeof src.ui === 'object') ? src.ui : {};
    next.ui.theme = ui.theme === 'light' ? 'light' : 'dark';
    next.ui.seenGuide = Boolean(ui.seenGuide);
    next.items = Array.isArray(src.items) ? src.items.map(normalizeItem) : [];
    next.editingId = next.items.some((i) => i.id === src.editingId) ? src.editingId : null;
    const ob = (src.offboard && typeof src.offboard === 'object') ? src.offboard : {};
    next.offboard.person = clean(ob.person).slice(0, 80);
    if (ob.done && typeof ob.done === 'object') {
      for (const [key, val] of Object.entries(ob.done)) {
        if (val === true && typeof key === 'string' && key.includes('||')) next.offboard.done[key] = true;
      }
    }
    return next;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch { /* fall through */ }
    const fresh = defaultState();
    fresh.ui.theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
    return fresh;
  }

  let state = loadState();
  let saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
    }, 250);
  }

  // ---------- domain: rotation, risk flags, health score ----------

  function rotationStatus(item) {
    if (!item.rotationDate) return 'unset';
    const today = todayISO();
    if (item.rotationDate < today) return 'overdue';
    if (item.rotationDate <= isoDate(ROTATION_DUE_SOON_DAYS)) return 'due';
    return 'ok';
  }

  function isPrivileged(item) {
    return LEVEL_RANK[item.accessLevel] >= 4;
  }

  function riskFlags(item) {
    const flags = [];
    const add = (sev, title, detail) => flags.push({ sev, title, detail });

    if (!item.controls.noSecretStored) {
      add('critical', 'Secret may be stored', 'This entry says a secret value may live in this app. Remove it and keep the storage label only.');
    }
    if (item.mfa === 'none') {
      add('high', 'No MFA', 'Enable MFA before any handoff. Until then, treat this credential as exposed.');
    } else if (item.mfa === 'na') {
      add('medium', 'MFA unavailable', 'Vendor offers no MFA. Document a compensating control (SSO, IP allowlist, short rotation).');
    }
    if (!item.backupOwner) {
      add('high', 'No backup owner', 'Single point of failure: name a second person who can act on this system.');
    } else if (!item.controls.backupConfirmed) {
      add('medium', 'Backup unconfirmed', `${item.backupOwner} is named but not confirmed. Verify they can actually get in.`);
    }
    const rot = rotationStatus(item);
    if (rot === 'overdue') {
      add('high', 'Stale rotation', `Rotation was due ${item.rotationDate}. Rotate the credential and set the next date.`);
    } else if (rot === 'due') {
      add('low', 'Rotation due soon', `Rotation scheduled for ${item.rotationDate} — within ${ROTATION_DUE_SOON_DAYS} days.`);
    } else if (rot === 'unset') {
      add('medium', 'No rotation date', 'Set a next-rotation date so this credential does not silently age.');
    }
    if (!item.controls.revokeDocumented) {
      add(isPrivileged(item) ? 'high' : 'medium', 'Revocation path missing', 'Write down exactly how to remove or rotate this access (console path, who approves).');
    }
    if (isPrivileged(item) && !item.controls.leastPrivilege) {
      add('medium', 'Broad privilege unreviewed', `${item.accessLevel}-level access has not been checked for least privilege.`);
    }
    if (!item.storageRef) {
      add('medium', 'No storage reference', 'Record where the credential lives (password-manager item label only, never the value).');
    } else if (!item.controls.storageVerified) {
      add('low', 'Storage unverified', 'Confirm the referenced password-manager item actually exists and is current.');
    }
    return flags;
  }

  function itemScore(item) {
    let score = 100;
    for (const f of riskFlags(item)) score -= SEV[f.sev];
    return Math.max(0, score);
  }

  function healthScore() {
    if (!state.items.length) return { score: 0, grade: '–' };
    let total = 0, weight = 0;
    for (const item of state.items) {
      const w = isPrivileged(item) ? 2 : 1; // owner/admin/billing gaps hurt twice as much
      total += itemScore(item) * w;
      weight += w;
    }
    const score = Math.round(total / weight);
    const grade = score >= 90 ? 'A' : score >= 78 ? 'B' : score >= 64 ? 'C' : score >= 50 ? 'D' : 'F';
    return { score, grade };
  }

  function allFlags() {
    const rows = [];
    for (const item of state.items) {
      for (const f of riskFlags(item)) rows.push({ item, ...f });
    }
    rows.sort((a, b) => SEV_ORDER.indexOf(a.sev) - SEV_ORDER.indexOf(b.sev));
    return rows;
  }

  function people() {
    const seen = new Map();
    for (const item of state.items) {
      for (const name of [item.owner, item.backupOwner]) {
        const n = clean(name);
        if (n && !seen.has(n.toLowerCase())) seen.set(n.toLowerCase(), n);
      }
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }

  // ---------- domain: offboarding runbook ----------

  function runbookSteps(item, person) {
    const isOwner = clean(item.owner).toLowerCase() === person.toLowerCase();
    const successor = isOwner ? (item.backupOwner || 'UNASSIGNED — pick a successor first') : item.owner;
    const steps = [];
    steps.push(`Revoke ${person}'s access to ${item.systemName} (${item.accessType}, ${item.accessLevel})${item.controls.revokeDocumented ? ' — follow the documented revocation path' : ' — WARNING: revocation path not documented yet'}`);
    if (isOwner || SHARED_TYPES.includes(item.accessType)) {
      steps.push(`Rotate the credential and update the entry at "${item.storageRef || 'storage reference missing'}" (update the label/location only — never store the value here)`);
    }
    if (isOwner) {
      steps.push(`Reassign primary ownership to ${successor} and have them confirm login`);
    } else {
      steps.push(`Name and confirm a new backup owner to replace ${person}`);
    }
    steps.push('Verify access is actually gone (login attempt / audit log) and record the date and approver');
    return steps;
  }

  function runbookFor(person) {
    if (!person) return [];
    const p = person.toLowerCase();
    return state.items
      .filter((i) => clean(i.owner).toLowerCase() === p || clean(i.backupOwner).toLowerCase() === p)
      .sort((a, b) => (LEVEL_RANK[b.accessLevel] - LEVEL_RANK[a.accessLevel]) || (riskFlags(b).length - riskFlags(a).length))
      .map((item) => ({
        item,
        role: clean(item.owner).toLowerCase() === p ? 'primary owner' : 'backup owner',
        steps: runbookSteps(item, person)
      }));
  }

  const stepKey = (person, itemId, idx) => `${person}||${itemId}||${idx}`;

  function runbookProgress(person, entries) {
    let total = 0, done = 0;
    for (const e of entries) {
      total += e.steps.length;
      e.steps.forEach((_, i) => { if (state.offboard.done[stepKey(person, e.item.id, i)]) done++; });
    }
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  // ---------- artifacts (all metadata-only drafts) ----------

  const BOUNDARY_NOTE = 'Draft for human review. Metadata only — this report must never contain secret values. Real secret exchange, rotation, and revocation happen in your password manager / vendor consoles with explicit human approval.';

  function custodyReportMd() {
    const { score, grade } = healthScore();
    const flags = allFlags();
    const bySev = (sev) => flags.filter((f) => f.sev === sev);
    const overdue = state.items.filter((i) => rotationStatus(i) === 'overdue');
    const dueSoon = state.items.filter((i) => rotationStatus(i) === 'due');
    const lines = [];
    lines.push('# Custody Report — Credential Handoff Checklist');
    lines.push('');
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push('');
    lines.push(`> ${BOUNDARY_NOTE}`);
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push(`- Systems tracked: ${state.items.length}`);
    lines.push(`- Custody health: ${score}/100 (grade ${grade})`);
    lines.push(`- Open risk flags: ${flags.length} (critical ${bySev('critical').length} · high ${bySev('high').length} · medium ${bySev('medium').length} · low ${bySev('low').length})`);
    lines.push(`- Rotations overdue: ${overdue.length} · due within ${ROTATION_DUE_SOON_DAYS} days: ${dueSoon.length}`);
    lines.push('');
    lines.push('## Risk register');
    lines.push('');
    if (!flags.length) {
      lines.push('No open risk flags. Re-verify controls before any real handoff.');
    } else {
      for (const sev of SEV_ORDER) {
        const rows = bySev(sev);
        if (!rows.length) continue;
        lines.push(`### ${sev.charAt(0).toUpperCase() + sev.slice(1)}`);
        for (const f of rows) lines.push(`- **${f.item.systemName}** — ${f.title}: ${f.detail}`);
        lines.push('');
      }
    }
    lines.push('## System inventory');
    lines.push('');
    for (const item of state.items) {
      const rot = rotationStatus(item);
      lines.push(`### ${item.systemName}`);
      lines.push(`- Type / level: ${item.accessType} · ${item.accessLevel}`);
      lines.push(`- Lane: ${LANE_LABELS[item.lane]}`);
      lines.push(`- Primary owner: ${item.owner || 'MISSING'}`);
      lines.push(`- Backup owner: ${item.backupOwner || 'MISSING'}`);
      lines.push(`- MFA: ${MFA_LABELS[item.mfa]}`);
      lines.push(`- Credential lives at: ${item.storageRef || 'MISSING'} (reference only)`);
      lines.push(`- Next rotation: ${item.rotationDate || 'unset'}${rot === 'overdue' ? ' (OVERDUE)' : rot === 'due' ? ' (due soon)' : ''}`);
      lines.push(`- Controls: ${CONTROL_KEYS.map((k) => `${CONTROL_LABELS[k]} = ${item.controls[k] ? 'yes' : 'no'}`).join('; ')}`);
      lines.push(`- Item score: ${itemScore(item)}/100 · open flags: ${riskFlags(item).length}`);
      if (item.notes) lines.push(`- Notes: ${item.notes}`);
      lines.push('');
    }
    lines.push('## Rotation schedule');
    lines.push('');
    const scheduled = state.items.filter((i) => i.rotationDate).sort((a, b) => a.rotationDate.localeCompare(b.rotationDate));
    if (scheduled.length) {
      for (const item of scheduled) {
        const rot = rotationStatus(item);
        lines.push(`- ${item.rotationDate} — ${item.systemName}${rot === 'overdue' ? ' (OVERDUE)' : rot === 'due' ? ' (due soon)' : ''}`);
      }
    } else {
      lines.push('No rotation dates set.');
    }
    lines.push('');
    const person = state.offboard.person;
    if (person && runbookFor(person).length) {
      lines.push(runbookMd(person, false));
    }
    lines.push('## Human approval boundary');
    lines.push('');
    lines.push('Before any real handoff or revocation: confirm MFA, least privilege, backup owner, storage location, revocation path, and rotation date — then get explicit human approval. This checklist is a draft, not an authorization.');
    return lines.join('\n');
  }

  function runbookMd(person, standalone = true) {
    const entries = runbookFor(person);
    const prog = runbookProgress(person, entries);
    const lines = [];
    lines.push(standalone ? `# Offboarding revocation runbook — ${person}` : `## Offboarding runbook — ${person}`);
    lines.push('');
    if (standalone) {
      lines.push(`Generated: ${new Date().toLocaleString()}`);
      lines.push('');
      lines.push(`> ${BOUNDARY_NOTE}`);
      lines.push('');
    }
    lines.push(`Systems touched: ${entries.length} · steps complete: ${prog.done}/${prog.total} (${prog.pct}%)`);
    lines.push('Order: highest privilege first.');
    lines.push('');
    entries.forEach((e, n) => {
      lines.push(`${standalone ? '##' : '###'} ${n + 1}. ${e.item.systemName} (${e.item.accessLevel} · ${e.role})`);
      e.steps.forEach((step, i) => {
        lines.push(`- [${state.offboard.done[stepKey(person, e.item.id, i)] ? 'x' : ' '}] ${step}`);
      });
      lines.push('');
    });
    if (!entries.length) lines.push('No tracked systems reference this person.');
    return lines.join('\n');
  }

  function inventoryCsv() {
    const rows = [['system', 'access_type', 'access_level', 'lane', 'primary_owner', 'backup_owner', 'mfa', 'storage_reference_label', 'next_rotation', 'rotation_status', 'item_score', 'open_flags']];
    for (const item of state.items) {
      rows.push([
        item.systemName, item.accessType, item.accessLevel, LANE_LABELS[item.lane],
        item.owner, item.backupOwner, MFA_LABELS[item.mfa], item.storageRef,
        item.rotationDate, rotationStatus(item), itemScore(item),
        riskFlags(item).map((f) => f.title).join('; ')
      ]);
    }
    return rows.map((r) => r.map((c) => `"${String(c ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  }

  // ---------- toast (with undo) ----------

  let toastTimer = null;
  let pendingUndo = null;

  function toast(msg, undoFn) {
    $('toastMsg').textContent = msg;
    pendingUndo = undoFn || null;
    $('toastUndo').hidden = !undoFn;
    $('toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, undoFn ? 7000 : 2200);
  }

  function hideToast() {
    $('toast').classList.remove('show');
    pendingUndo = null;
    $('toastUndo').hidden = true;
  }

  // ---------- render ----------

  function applyTheme() {
    document.documentElement.dataset.theme = state.ui.theme;
    $('btnTheme').textContent = state.ui.theme === 'dark' ? 'Light mode' : 'Dark mode';
    $('btnTheme').setAttribute('aria-pressed', state.ui.theme === 'light' ? 'true' : 'false');
  }

  function renderStats() {
    const { score, grade } = healthScore();
    const flags = allFlags();
    const critHigh = flags.filter((f) => f.sev === 'critical' || f.sev === 'high').length;
    const overdue = state.items.filter((i) => rotationStatus(i) === 'overdue').length;
    const dueSoon = state.items.filter((i) => rotationStatus(i) === 'due').length;
    $('statSystems').textContent = String(state.items.length);
    $('statHealth').textContent = state.items.length ? String(score) : '–';
    $('statHealthGrade').textContent = grade;
    $('statFlags').textContent = String(flags.length);
    $('statFlagsDetail').textContent = flags.length ? `open flags · ${critHigh} critical/high` : 'open risk flags';
    $('statOverdue').textContent = String(overdue);
    $('statOverdueDetail').textContent = dueSoon ? `rotations overdue · ${dueSoon} due soon` : 'rotations overdue';
  }

  function renderHealth() {
    const { score, grade } = healthScore();
    const ring = $('healthRing');
    ring.style.setProperty('--pct', String(state.items.length ? score : 0));
    ring.style.setProperty('--ring-color', score >= 78 ? 'var(--ok)' : score >= 50 ? 'var(--med)' : 'var(--crit)');
    ring.setAttribute('aria-label', state.items.length ? `Custody health score ${score} out of 100, grade ${grade}` : 'No systems yet');
    $('healthScore').textContent = state.items.length ? String(score) : '–';
    $('healthGrade').textContent = state.items.length ? `grade ${grade}` : 'no data';
    $('healthHint').textContent = state.items.length
      ? 'Score = 100 minus severity-weighted flags per system, averaged. Owner/Admin/Billing systems count double.'
      : 'Add systems to compute a custody health score. Owner and admin access counts double.';
  }

  function renderRisks() {
    const flags = allFlags();
    if (!state.items.length) {
      $('riskList').innerHTML = '<div class="empty-state">No systems yet — the risk register fills in as you add access items.</div>';
      return;
    }
    if (!flags.length) {
      $('riskList').innerHTML = '<article class="risk-item all-clear"><h3>No open risk flags</h3><p>Every tracked control is in place. Re-verify before any real handoff.</p></article>';
      return;
    }
    $('riskList').innerHTML = flags.map((f) => `
      <article class="risk-item sev-${f.sev}">
        <h3><span class="sev-tag ${f.sev}">${f.sev}</span> ${esc(f.title)} · ${esc(f.item.systemName)}</h3>
        <p>${esc(f.detail)}</p>
      </article>`).join('');
  }

  function laneCard(item) {
    const score = itemScore(item);
    const flags = riskFlags(item);
    const worst = flags.length ? flags[0].sev : null;
    const rot = rotationStatus(item);
    const scoreCls = score >= 85 ? 'good' : score >= 60 ? 'warn' : 'bad';
    const flagCls = !flags.length ? 'good' : (worst === 'critical' || worst === 'high') ? 'bad' : 'warn';
    const mfaCls = item.mfa === 'none' ? 'bad' : item.mfa === 'na' ? 'warn' : 'good';
    const rotChip = rot === 'overdue' ? `<span class="chip bad">rotation overdue</span>`
      : rot === 'due' ? `<span class="chip warn">rotate by ${esc(item.rotationDate)}</span>`
      : rot === 'unset' ? `<span class="chip warn">no rotation date</span>`
      : `<span class="chip">rotate ${esc(item.rotationDate)}</span>`;
    const lastLane = item.lane === LANES[LANES.length - 1];
    return `
      <article class="card" data-id="${esc(item.id)}">
        <h4>${esc(item.systemName)}</h4>
        <p class="card-meta">${esc(item.accessType)} · ${esc(item.accessLevel)} · ${esc(item.owner || 'no owner')}</p>
        <div class="chips">
          <span class="chip ${scoreCls}">${score}/100</span>
          <span class="chip ${flagCls}">${flags.length} flag${flags.length === 1 ? '' : 's'}</span>
          <span class="chip ${mfaCls}">${esc(MFA_LABELS[item.mfa])}</span>
          ${rotChip}
        </div>
        <div class="card-actions">
          <button type="button" data-act="edit">Edit</button>
          ${lastLane ? '' : '<button type="button" data-act="next">Advance →</button>'}
          <button type="button" data-act="del" class="del">Delete</button>
        </div>
      </article>`;
  }

  function renderBoard() {
    if (!state.items.length) {
      $('board').innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <p>No systems tracked yet. Every login, key, and shared inbox someone could walk away with belongs here.</p>
          <button type="button" class="btn" data-act="demo">Load the demo inventory</button>
        </div>`;
      return;
    }
    $('board').innerHTML = LANES.map((lane) => {
      const items = state.items.filter((i) => i.lane === lane);
      const cards = items.map(laneCard).join('') || '<div class="empty-state">Nothing in this lane.</div>';
      return `
        <section class="lane" aria-label="${esc(LANE_LABELS[lane])} lane">
          <h3>${esc(LANE_LABELS[lane])} <span class="lane-count">${items.length}</span></h3>
          ${cards}
        </section>`;
    }).join('');
  }

  function renderOffboard() {
    const names = people();
    const current = names.find((n) => n.toLowerCase() === state.offboard.person.toLowerCase()) || '';
    if (!current) state.offboard.person = '';
    $('offboardPerson').innerHTML = '<option value="">— pick a person —</option>' +
      names.map((n) => `<option value="${esc(n)}"${n === current ? ' selected' : ''}>${esc(n)}</option>`).join('');

    const person = current;
    const entries = runbookFor(person);
    const prog = runbookProgress(person, entries);
    $('runbookBar').style.width = prog.pct + '%';
    $('runbookPct').textContent = person ? `${prog.done}/${prog.total} steps · ${prog.pct}% complete` : '0% complete';
    $('btnCopyRunbook').disabled = !person || !entries.length;

    if (!person) {
      $('offboardSummary').textContent = names.length
        ? 'Pick a person to generate their revocation runbook — every system they own or back up, highest privilege first.'
        : 'Add systems with owners first; people appear here automatically.';
      $('runbook').innerHTML = '<div class="empty-state">No runbook yet. Select the person leaving or handing off above.</div>';
      return;
    }
    if (!entries.length) {
      $('offboardSummary').textContent = `No tracked systems reference ${person}.`;
      $('runbook').innerHTML = '<div class="empty-state">Nothing to revoke for this person.</div>';
      return;
    }
    $('offboardSummary').textContent = `${person} touches ${entries.length} system${entries.length === 1 ? '' : 's'}. Work top-down: highest privilege first. Tick steps as you complete them.`;
    $('runbook').innerHTML = entries.map((e, n) => `
      <article class="runbook-item">
        <h3>${n + 1}. ${esc(e.item.systemName)}
          <span class="chip">${esc(e.item.accessLevel)}</span>
          <span class="chip">${esc(e.role)}</span>
        </h3>
        <div class="runbook-steps">
          ${e.steps.map((step, i) => {
            const key = stepKey(person, e.item.id, i);
            const done = Boolean(state.offboard.done[key]);
            return `<label class="${done ? 'done' : ''}"><input type="checkbox" data-key="${esc(key)}"${done ? ' checked' : ''}> <span>${esc(step)}</span></label>`;
          }).join('')}
        </div>
      </article>`).join('');
  }

  function renderPrint() {
    const { score, grade } = healthScore();
    const flags = allFlags();
    const rows = state.items.map((item) => `
      <tr>
        <td>${esc(item.systemName)}</td>
        <td>${esc(item.accessType)} · ${esc(item.accessLevel)}</td>
        <td>${esc(item.owner || '—')}<br><span class="muted">backup: ${esc(item.backupOwner || 'MISSING')}</span></td>
        <td>${esc(MFA_LABELS[item.mfa])}</td>
        <td>${esc(item.storageRef || 'MISSING')}</td>
        <td>${esc(item.rotationDate || 'unset')}${rotationStatus(item) === 'overdue' ? ' (OVERDUE)' : ''}</td>
        <td>${itemScore(item)}/100</td>
      </tr>`).join('');
    const flagList = flags.map((f) => `<li><strong>${esc(f.item.systemName)}</strong> — ${esc(f.title)} (${esc(f.sev)}): ${esc(f.detail)}</li>`).join('');
    $('printReport').innerHTML = `
      <h1>Custody Report — Credential Handoff Checklist</h1>
      <p class="muted">Generated ${esc(new Date().toLocaleString())} · ${esc(BOUNDARY_NOTE)}</p>
      <h2>Summary</h2>
      <p>Systems: ${state.items.length} · Custody health: ${state.items.length ? `${score}/100 (grade ${grade})` : 'n/a'} · Open risk flags: ${flags.length}</p>
      <h2>System inventory (metadata only)</h2>
      <table>
        <thead><tr><th>System</th><th>Type · level</th><th>Owners</th><th>MFA</th><th>Credential lives at (label)</th><th>Next rotation</th><th>Score</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="7">No systems tracked.</td></tr>'}</tbody>
      </table>
      <h2>Risk register</h2>
      ${flagList ? `<ul>${flagList}</ul>` : '<p>No open risk flags.</p>'}
      <h2>Human approval boundary</h2>
      <p>Before any real handoff or revocation: confirm MFA, least privilege, backup owner, storage location, revocation path, and rotation date — then get explicit human approval.</p>`;
  }

  function renderAll() {
    applyTheme();
    renderStats();
    renderHealth();
    renderRisks();
    renderBoard();
    renderOffboard();
    renderPrint();
    scheduleSave();
  }

  // ---------- editor ----------

  const EDITOR_FIELDS = { systemName: 'fSystem', owner: 'fOwner', backupOwner: 'fBackup', storageRef: 'fStorage', notes: 'fNotes' };

  function fillEditor(item) {
    const v = item || blankItem();
    state.editingId = item ? item.id : null;
    $('editorTitle').textContent = item ? `Editing: ${item.systemName}` : 'Add a system';
    $('fSystem').value = v.systemName;
    $('fType').value = v.accessType;
    $('fLevel').value = v.accessLevel;
    $('fMfa').value = v.mfa;
    $('fOwner').value = v.owner;
    $('fBackup').value = v.backupOwner;
    $('fStorage').value = v.storageRef;
    $('fRotation').value = v.rotationDate;
    $('fStatus').value = v.lane;
    $('fNotes').value = v.notes;
    $('cBackup').checked = v.controls.backupConfirmed;
    $('cRevoke').checked = v.controls.revokeDocumented;
    $('cLeastPriv').checked = v.controls.leastPrivilege;
    $('cStorage').checked = v.controls.storageVerified;
    $('cNoSecret').checked = v.controls.noSecretStored;
    clearFieldErrors();
    runLiveLint();
    scheduleSave();
  }

  function readEditor() {
    return normalizeItem({
      id: state.editingId || uid(),
      systemName: $('fSystem').value,
      accessType: $('fType').value,
      accessLevel: $('fLevel').value,
      mfa: $('fMfa').value,
      owner: $('fOwner').value,
      backupOwner: $('fBackup').value,
      storageRef: $('fStorage').value,
      rotationDate: $('fRotation').value,
      lane: $('fStatus').value,
      notes: $('fNotes').value,
      controls: {
        backupConfirmed: $('cBackup').checked,
        revokeDocumented: $('cRevoke').checked,
        leastPrivilege: $('cLeastPriv').checked,
        storageVerified: $('cStorage').checked,
        noSecretStored: $('cNoSecret').checked
      }
    });
  }

  function clearFieldErrors() {
    for (const id of ['fSystem', 'fOwner']) $(id).closest('.field').classList.remove('invalid');
    $('errSystem').hidden = true;
    $('errOwner').hidden = true;
  }

  function editorLintHits() {
    const hits = [];
    for (const [key, label] of LINTED_FIELDS) {
      const el = $(EDITOR_FIELDS[key]);
      for (const hit of secretLint(el.value)) hits.push({ field: label, ...hit });
    }
    return hits;
  }

  function showLint(hits, blocking) {
    const box = $('lintBox');
    if (!hits.length) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }
    box.hidden = false;
    box.classList.toggle('warn-only', !blocking);
    box.innerHTML = `
      <strong>${blocking ? 'Save blocked — password-shaped content detected.' : 'Heads up — password-shaped content detected. Saving will be blocked.'}</strong>
      <ul>${hits.map((h) => `<li>${esc(h.field)}: looks like a ${esc(h.label)} (<code>${esc(h.sample)}</code>)</li>`).join('')}</ul>
      Replace it with a reference label (e.g. the password-manager item name). Secrets never belong in this app.`;
  }

  let lintTimer = null;
  function runLiveLint() {
    clearTimeout(lintTimer);
    lintTimer = setTimeout(() => showLint(editorLintHits(), false), 250);
  }

  function saveFromEditor() {
    // required fields
    clearFieldErrors();
    let bad = false;
    if (!clean($('fSystem').value)) {
      $('fSystem').closest('.field').classList.add('invalid');
      $('errSystem').hidden = false;
      bad = true;
    }
    if (!clean($('fOwner').value)) {
      $('fOwner').closest('.field').classList.add('invalid');
      $('errOwner').hidden = false;
      bad = true;
    }
    if (bad) {
      toast('Fill in the required fields');
      return;
    }
    // hard secret lint — block the save entirely
    const hits = editorLintHits();
    if (hits.length) {
      showLint(hits, true);
      toast('Blocked: remove the password-shaped content first');
      return;
    }
    showLint([], true);
    const item = readEditor();
    const idx = state.items.findIndex((i) => i.id === item.id);
    if (idx >= 0) state.items[idx] = item; else state.items.push(item);
    state.editingId = item.id;
    $('editorTitle').textContent = `Editing: ${item.systemName}`;
    renderAll();
    toast(idx >= 0 ? 'System updated' : 'System added');
  }

  function deleteItem(id) {
    const idx = state.items.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const [removed] = state.items.splice(idx, 1);
    if (state.editingId === id) fillEditor(null);
    renderAll();
    toast(`Deleted "${removed.systemName}"`, () => {
      state.items.splice(Math.min(idx, state.items.length), 0, removed);
      renderAll();
      toast('Restored');
    });
  }

  // ---------- clipboard / files ----------

  function copyText(text, label) {
    const done = () => toast(label + ' copied — draft for human review');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch { toast('Copy failed — select and copy manually'); }
    ta.remove();
  }

  function downloadFile(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function exportJson() {
    const payload = {
      app: 'credential-handoff-checklist',
      version: 1,
      exportedAt: new Date().toISOString(),
      safety: 'Metadata only. No raw secrets. Human approval required before real handoff or revocation.',
      state
    };
    downloadFile('credential-handoff-checklist.json', JSON.stringify(payload, null, 2), 'application/json');
    toast('JSON downloaded');
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const source = (parsed && typeof parsed === 'object' && parsed.state && typeof parsed.state === 'object') ? parsed.state : parsed;
        state = normalize(source);
        fillEditor(null);
        renderAll();
        toast(`Imported ${state.items.length} system${state.items.length === 1 ? '' : 's'} (lint-scrubbed)`);
      } catch {
        toast('Import failed: not a valid JSON export');
      }
    };
    reader.onerror = () => toast('Import failed: could not read file');
    reader.readAsText(file);
  }

  // ---------- help modal ----------

  let lastFocus = null;

  function openHelp() {
    const modal = $('helpModal');
    if (modal.open) return;
    lastFocus = document.activeElement;
    modal.showModal();
    $('btnCloseHelp').focus();
  }

  function closeHelp() {
    const modal = $('helpModal');
    if (modal.open) modal.close();
  }

  // ---------- events ----------

  function wireEvents() {
    $('btnTheme').addEventListener('click', () => {
      state.ui.theme = state.ui.theme === 'dark' ? 'light' : 'dark';
      applyTheme();
      scheduleSave();
      toast(state.ui.theme === 'dark' ? 'Dark mode' : 'Light mode');
    });

    $('btnHelp').addEventListener('click', openHelp);
    $('btnCloseHelp').addEventListener('click', closeHelp);
    $('helpModal').addEventListener('close', () => {
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
      lastFocus = null;
    });

    $('btnDemo').addEventListener('click', () => {
      if (state.items.length && !confirm('Replace the current inventory with the demo scenario?')) return;
      state.items = demoItems();
      state.offboard = { person: 'Dana (contractor)', done: {} };
      fillEditor(null);
      renderAll();
      toast('Demo inventory loaded');
    });

    $('btnNewItem').addEventListener('click', () => {
      fillEditor(null);
      $('fSystem').focus();
    });
    $('btnClearEditor').addEventListener('click', () => {
      fillEditor(null);
      toast('Editor cleared');
    });
    $('btnSaveItem').addEventListener('click', saveFromEditor);

    // live lint + inline validation reset
    for (const id of Object.values(EDITOR_FIELDS)) {
      $(id).addEventListener('input', () => {
        runLiveLint();
        if (id === 'fSystem' || id === 'fOwner') {
          $(id).closest('.field').classList.remove('invalid');
          $(id === 'fSystem' ? 'errSystem' : 'errOwner').hidden = true;
        }
      });
    }
    $('cNoSecret').addEventListener('change', () => {
      if (!$('cNoSecret').checked) toast('That box unchecked = a critical flag. Remove any secret from this entry.');
    });

    // board (event delegation)
    $('board').addEventListener('click', (ev) => {
      const btn = ev.target.closest('button');
      if (!btn) return;
      if (btn.dataset.act === 'demo') { $('btnDemo').click(); return; }
      const card = btn.closest('[data-id]');
      if (!card) return;
      const item = state.items.find((i) => i.id === card.dataset.id);
      if (!item) return;
      if (btn.dataset.act === 'edit') {
        fillEditor(item);
        $('fSystem').focus();
        $('editorTitle').scrollIntoView({ block: 'nearest' });
      } else if (btn.dataset.act === 'next') {
        const pos = LANES.indexOf(item.lane);
        if (pos < LANES.length - 1) {
          item.lane = LANES[pos + 1];
          renderAll();
          toast(`Moved to ${LANE_LABELS[item.lane]}`);
        }
      } else if (btn.dataset.act === 'del') {
        deleteItem(item.id);
      }
    });

    // offboarding
    $('offboardPerson').addEventListener('change', () => {
      state.offboard.person = $('offboardPerson').value;
      renderOffboard();
      scheduleSave();
    });
    $('runbook').addEventListener('change', (ev) => {
      const box = ev.target.closest('input[data-key]');
      if (!box) return;
      if (box.checked) state.offboard.done[box.dataset.key] = true;
      else delete state.offboard.done[box.dataset.key];
      renderOffboard();
      scheduleSave();
    });
    $('btnCopyRunbook').addEventListener('click', () => {
      if (state.offboard.person) copyText(runbookMd(state.offboard.person), 'Runbook');
    });

    // export & handoff
    $('btnCopyReport').addEventListener('click', () => copyText(custodyReportMd(), 'Custody report'));
    $('btnDownloadJson').addEventListener('click', exportJson);
    $('btnDownloadCsv').addEventListener('click', () => {
      downloadFile('credential-custody-inventory.csv', inventoryCsv(), 'text/csv');
      toast('CSV downloaded');
    });
    $('btnImport').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', () => {
      const file = $('importFile').files && $('importFile').files[0];
      if (file) importJson(file);
      $('importFile').value = '';
    });
    $('btnPrint').addEventListener('click', () => {
      renderPrint();
      window.print();
    });

    $('btnReset').addEventListener('click', () => {
      if (!confirm('Reset ALL data in this app? This clears the inventory, runbook progress, and settings.')) return;
      const theme = state.ui.theme;
      state = defaultState();
      state.ui.theme = theme;
      state.ui.seenGuide = true;
      fillEditor(null);
      renderAll();
      toast('All data cleared');
    });

    $('toastUndo').addEventListener('click', () => {
      const fn = pendingUndo;
      hideToast();
      if (fn) fn();
    });

    // keyboard shortcuts
    document.addEventListener('keydown', (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
        ev.preventDefault();
        copyText(custodyReportMd(), 'Custody report');
        return;
      }
      const typing = /^(input|textarea|select)$/i.test(ev.target.tagName);
      if (ev.key === '?' && !typing && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
        ev.preventDefault();
        openHelp();
      }
      if (ev.key === 'Escape' && $('helpModal').open) closeHelp();
    });
  }

  // ---------- init ----------

  function init() {
    wireEvents();
    fillEditor(state.editingId ? state.items.find((i) => i.id === state.editingId) || null : null);
    renderAll();
    if (!state.ui.seenGuide) {
      state.ui.seenGuide = true;
      scheduleSave();
      openHelp();
    }
  }

  init();
})();
