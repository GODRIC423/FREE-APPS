import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Compass, Flag, MapPin, Plus, Trash2, Pencil, ChevronUp, ChevronDown, X,
  HelpCircle, Download, Upload, Copy, Check, Sparkles, FileJson, FileText,
  FileSpreadsheet, Undo2, RotateCcw, Search, Anchor, Ruler, Map as MapIcon,
  ScrollText, Ship, Crosshair, Printer, Link2,
} from 'lucide-react';

/* ================================================================
   CONSOLE BUS — optional link to the BizDev Console Deck host.
   No-op (ctx stays null) when this app is opened standalone.
================================================================ */
function useConsoleBus() {
  const [ctx, setCtx] = useState(null);
  useEffect(() => {
    if (window.parent === window) return; // standalone, no console
    const onMsg = (e) => {
      const m = e.data;
      if (!m || m.bizdev !== 'context' || m.v !== 1) return; // version-gate + ignore junk
      setCtx(m.connectors || null);
    };
    window.addEventListener('message', onMsg);
    try { window.parent.postMessage({ bizdev: 'ready', v: 1, slug: '15-territory-mapper' }, '*'); } catch {}
    return () => window.removeEventListener('message', onMsg);
  }, []);
  return ctx;
}

/* ============================== constants ============================== */

const LS_KEY = 'bizdev:15-territory-mapper:v1';
const SIZES = ['SMB', 'Mid-Market', 'Enterprise'];
const TIERS = {
  T1: { label: 'T1', long: 'T1 · Named', desc: 'hand-picked accounts, 1:1 pursuit' },
  T2: { label: 'T2', long: 'T2 · Clustered', desc: 'grouped plays, light personalization' },
  T3: { label: 'T3', long: 'T3 · Programmatic', desc: 'automated motions, no manual touch' },
};
const TIER_KEYS = ['T1', 'T2', 'T3'];

/* ============================== utilities ============================== */

const uid = () =>
  (crypto?.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2, 10));

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

function fmtMoney(n) {
  if (!Number.isFinite(n)) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1e9) return '$' + (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1e3) return '$' + Math.round(n / 1e3) + 'k';
  return '$' + Math.round(n);
}
const fmtInt = (n) => (Number.isFinite(n) ? n.toLocaleString('en-US') : '0');

function segOpportunity(s) {
  return num(s.accountsEst) * num(s.avgDeal) * (num(s.winRate) / 100);
}

/* ============================== persistence ============================== */

function normalizeSegment(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    id: typeof r.id === 'string' && r.id ? r.id : uid(),
    name: typeof r.name === 'string' ? r.name : 'Unnamed territory',
    vertical: typeof r.vertical === 'string' ? r.vertical : '',
    size: SIZES.includes(r.size) ? r.size : 'Mid-Market',
    geo: typeof r.geo === 'string' ? r.geo : '',
    accountsEst: clamp(num(r.accountsEst, 0), 0, 10_000_000),
    avgDeal: clamp(num(r.avgDeal, 0), 0, 1e9),
    winRate: clamp(num(r.winRate, 0), 0, 100),
    notes: typeof r.notes === 'string' ? r.notes : '',
  };
}
function normalizeAccount(raw, segIds) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    id: typeof r.id === 'string' && r.id ? r.id : uid(),
    name: typeof r.name === 'string' ? r.name : 'Unnamed account',
    segmentId: segIds.has(r.segmentId) ? r.segmentId : null,
    tier: TIER_KEYS.includes(r.tier) ? r.tier : null,
    value: clamp(num(r.value, 0), 0, 1e9),
    notes: typeof r.notes === 'string' ? r.notes : '',
  };
}
function normalize(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const segments = (Array.isArray(r.segments) ? r.segments : []).map(normalizeSegment);
  const segIds = new Set(segments.map((s) => s.id));
  const cap = r.capacity && typeof r.capacity === 'object' ? r.capacity : {};
  return {
    v: 1,
    seenGuide: !!r.seenGuide,
    business: typeof r.business === 'string' ? r.business : '',
    segments,
    accounts: (Array.isArray(r.accounts) ? r.accounts : []).map((a) => normalizeAccount(a, segIds)),
    capacity: {
      reps: clamp(num(cap.reps, 1), 0, 10000),
      t1PerRep: clamp(num(cap.t1PerRep, 10), 0, 100000),
      t2PerRep: clamp(num(cap.t2PerRep, 30), 0, 100000),
      t3PerRep: clamp(num(cap.t3PerRep, 150), 0, 1000000),
    },
    copilotNotes: typeof r.copilotNotes === 'string' ? r.copilotNotes : '',
  };
}
function loadState() {
  try { return normalize(JSON.parse(localStorage.getItem(LS_KEY))); }
  catch { return normalize(null); }
}

/* ============================== demo data ============================== */

function demoState() {
  const s1 = uid(), s2 = uid(), s3 = uid(), s4 = uid();
  return normalize({
    seenGuide: true,
    business:
      'Beacon Data — a 6-person data-engineering consultancy. We sell Snowflake cost-optimization retainers ($4k–8k/mo) plus fixed-fee pipeline audits. Founder-led sales, 2 people who can carry accounts.',
    segments: [
      { id: s1, name: 'Series B+ FinTech', vertical: 'FinTech', size: 'Mid-Market', geo: 'NA — East', accountsEst: 420, avgDeal: 54000, winRate: 12, notes: 'Warehouse bills explode after Series B. CFO feels it; data lead owns it. Fastest sales cycles we have seen (34 days median).' },
      { id: s2, name: 'Regional Health Systems', vertical: 'Healthcare', size: 'Enterprise', geo: 'US Midwest', accountsEst: 160, avgDeal: 96000, winRate: 7, notes: 'Big contracts, brutal procurement (90–180 days). Needs a BAA and a security review. Only worth it with a champion.' },
      { id: s3, name: 'DTC & Retail Analytics', vertical: 'Retail / eCom', size: 'SMB', geo: 'NA — remote', accountsEst: 900, avgDeal: 18000, winRate: 9, notes: 'High volume, price-sensitive, churny. Good for T3 programmatic motion and case-study fodder, not for named pursuit.' },
      { id: s4, name: 'Logistics & 3PL', vertical: 'Logistics', size: 'Mid-Market', geo: 'EU — DACH', accountsEst: 260, avgDeal: 42000, winRate: 8, notes: 'Untested. Two inbound leads last quarter from Hamburg. Timezone drag; would need EU-morning coverage.' },
    ],
    accounts: [
      { name: 'Northwind Capital', segmentId: s1, tier: 'T1', value: 72000, notes: 'Champion: Priya (Head of Data). Bill hit $61k/mo in March.' },
      { name: 'Ledgerline', segmentId: s1, tier: 'T1', value: 58000, notes: 'Intro via Snowflake AE. Renewal window Oct.' },
      { name: 'Brightvault Payments', segmentId: s1, tier: 'T1', value: 64000, notes: 'Ex-client CTO now VP Eng here.' },
      { name: 'Copperline Lending', segmentId: s1, tier: 'T2', value: 45000, notes: 'Same stack as Ledgerline; clone the play.' },
      { name: 'Atlas Treasury', segmentId: s1, tier: 'T2', value: 40000, notes: '' },
      { name: 'Meridian Health Network', segmentId: s2, tier: 'T1', value: 120000, notes: 'RFP expected Q4. Security review started early — good sign.' },
      { name: 'Lakeshore Medical Group', segmentId: s2, tier: 'T2', value: 88000, notes: 'No champion yet. Warm via conference contact.' },
      { name: 'Prairie Care Alliance', segmentId: s2, tier: 'T2', value: 90000, notes: '' },
      { name: 'Harbor & Thread Co.', segmentId: s3, tier: 'T3', value: 16000, notes: 'Replied to teardown post.' },
      { name: 'Fable Home Goods', segmentId: s3, tier: 'T3', value: 14000, notes: '' },
      { name: 'Peak & Pine Outfitters', segmentId: s3, tier: 'T3', value: 20000, notes: 'dbt project is a mess — easy audit win.' },
      { name: 'Kestrel Beauty', segmentId: s3, tier: 'T3', value: 12000, notes: '' },
      { name: 'Rheinland Cargo', segmentId: s4, tier: 'T2', value: 46000, notes: 'Inbound. Asked for EU references — we have one.' },
      { name: 'Alpenroute 3PL', segmentId: s4, tier: 'T3', value: 38000, notes: 'Inbound, went quiet after pricing.' },
    ],
    capacity: { reps: 2, t1PerRep: 8, t2PerRep: 25, t3PerRep: 120 },
    copilotNotes: '',
  });
}

/* ============================== geometry: islands ============================== */

function blobPts(cx, cy, r, seed, n = 11) {
  const rnd = mulberry(seed);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.72 + rnd() * 0.5);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.72]);
  }
  return pts;
}
function smoothClosed(pts) {
  const n = pts.length;
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + ' Z';
}
const ISLAND_SLOTS = [
  [200, 170], [462, 148], [718, 186], [300, 356], [578, 344], [812, 352], [128, 342], [872, 132],
];

/* ============================== SVG pieces ============================== */

function CompassRose({ x, y, r = 42 }) {
  const pt = (ang, rr) => `${x + Math.sin(ang) * rr},${y - Math.cos(ang) * rr}`;
  const star = (rr, rw, rot) =>
    [0, 1, 2, 3].map((i) => {
      const a = rot + (i * Math.PI) / 2;
      return `M ${pt(a, rr)} L ${pt(a + Math.PI / 4, rw)} L ${pt(a + Math.PI / 2, 0.001)} L ${pt(a - Math.PI / 4, rw)} Z`;
    }).join(' ');
  return (
    <g aria-hidden="true">
      <circle cx={x} cy={y} r={r + 9} fill="none" stroke="var(--color-inkline)" strokeWidth="0.8" opacity="0.7" />
      <circle cx={x} cy={y} r={r + 5} fill="none" stroke="var(--color-inkline)" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.7" />
      <path d={star(r * 0.62, r * 0.2, Math.PI / 4)} fill="var(--color-sepia-400)" opacity="0.85" />
      <path d={star(r, r * 0.24, 0)} fill="var(--color-sepia-700)" />
      <path d={`M ${pt(0, r)} L ${pt(Math.PI / 4, r * 0.24)} L ${x},${y} Z`} fill="var(--color-oxide-500)" />
      <circle cx={x} cy={y} r={2.4} fill="var(--color-brass-400)" stroke="var(--color-sepia-800)" strokeWidth="0.6" />
      {[['N', 0, -1], ['E', 1, 0], ['S', 0, 1], ['W', -1, 0]].map(([L, dx, dy]) => (
        <text key={L} x={x + dx * (r + 17)} y={y + dy * (r + 17) + 4} textAnchor="middle"
          fontSize="11" fontFamily="var(--font-mono)" fill="var(--color-sepia-600)">{L}</text>
      ))}
    </g>
  );
}

function SeaMarks({ seed, w, h }) {
  const rnd = mulberry(seed);
  const marks = [];
  for (let i = 0; i < 26; i++) {
    const mx = 50 + rnd() * (w - 100), my = 60 + rnd() * (h - 120);
    marks.push(<path key={i} d={`M ${mx} ${my} q 5 -4 10 0 q 5 4 10 0`} fill="none"
      stroke="var(--color-inkline)" strokeWidth="0.8" opacity={0.22 + rnd() * 0.15} />);
  }
  return <g aria-hidden="true">{marks}</g>;
}

function Island({ seg, cx, cy, r, share, focus, selected, t1Count, acctCount, onSelect }) {
  const seed = hashStr(seg.id);
  const body = smoothClosed(blobPts(cx, cy, r, seed));
  const c1 = smoothClosed(blobPts(cx, cy, r * 1.28, seed));
  const c2 = smoothClosed(blobPts(cx, cy, r * 1.58, seed));
  const opp = segOpportunity(seg);
  return (
    <g
      role="button" tabIndex={0} aria-label={`Territory ${seg.name}, opportunity ${fmtMoney(opp)}`}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      className="cursor-pointer outline-none"
      style={{ filter: selected ? 'drop-shadow(0 3px 6px rgb(66 53 34 / 0.45))' : 'none' }}
    >
      <path d={c2} fill="none" stroke="var(--color-contour)" strokeWidth="0.9" opacity="0.75" />
      <path d={c1} fill="none" stroke="var(--color-contour)" strokeWidth="1" strokeDasharray="1 3" opacity="0.9" />
      <path d={body}
        fill={focus ? 'var(--color-parch-300)' : 'var(--color-parch-200)'}
        stroke={focus ? 'var(--color-oxide-500)' : 'var(--color-sepia-500)'}
        strokeWidth={focus ? 2.4 : selected ? 2 : 1.3}
      />
      <path d={smoothClosed(blobPts(cx, cy - r * 0.06, r * 0.6, seed + 7))}
        fill="none" stroke="var(--color-inkline)" strokeWidth="0.6" opacity="0.5" />
      {focus && (
        <g aria-hidden="true">
          <line x1={cx} y1={cy - r * 0.72 - 26} x2={cx} y2={cy - r * 0.72} stroke="var(--color-sepia-800)" strokeWidth="2" />
          <path d={`M ${cx} ${cy - r * 0.72 - 26} l 22 6 l -22 6 Z`} fill="var(--color-oxide-500)" stroke="var(--color-sepia-800)" strokeWidth="0.8" />
        </g>
      )}
      <text x={cx} y={cy - 6} textAnchor="middle" fontFamily="var(--font-body)" fontStyle="italic"
        fontSize={r > 70 ? 17 : 14} fill="var(--color-sepia-800)">{seg.name}</text>
      <text x={cx} y={cy + 13} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="12"
        fill="var(--color-oxide-600)">{fmtMoney(opp)}</text>
      <text x={cx} y={cy + 28} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9.5"
        fill="var(--color-sepia-500)">{Math.round(share * 100)}% of chart · {acctCount} listed · T1×{t1Count}</text>
    </g>
  );
}

function TerritoryChart({ state, focusId, selectedId, onSelect, onLoadDemo }) {
  const W = 960, H = 480;
  const segs = state.segments;
  const total = segs.reduce((a, s) => a + segOpportunity(s), 0) || 1;
  const byTier = useMemo(() => {
    const m = {};
    for (const a of state.accounts) {
      if (!a.segmentId) continue;
      m[a.segmentId] = m[a.segmentId] || { n: 0, t1: 0 };
      m[a.segmentId].n++;
      if (a.tier === 'T1') m[a.segmentId].t1++;
    }
    return m;
  }, [state.accounts]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img"
      aria-label="Territory chart: each island is a market segment sized by opportunity">
      <defs>
        <radialGradient id="seaGlow" cx="50%" cy="40%" r="75%">
          <stop offset="0%" stopColor="#f8f2e1" />
          <stop offset="70%" stopColor="#efe4c9" />
          <stop offset="100%" stopColor="#e2d2ab" />
        </radialGradient>
        <clipPath id="chartClip"><rect x={22} y={22} width={W - 44} height={H - 44} /></clipPath>
      </defs>
      <rect x={4} y={4} width={W - 8} height={H - 8} fill="url(#seaGlow)" stroke="var(--color-sepia-600)" strokeWidth="2.5" />
      <rect x={14} y={14} width={W - 28} height={H - 28} fill="none" stroke="var(--color-sepia-500)" strokeWidth="0.8" />
      {Array.from({ length: 15 }, (_, i) => (
        <g key={i} aria-hidden="true">
          <line x1={22 + i * 65} y1={14} x2={22 + i * 65} y2={20} stroke="var(--color-sepia-500)" strokeWidth="1" />
          <line x1={22 + i * 65} y1={H - 20} x2={22 + i * 65} y2={H - 14} stroke="var(--color-sepia-500)" strokeWidth="1" />
        </g>
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i} aria-hidden="true">
          <line x1={14} y1={22 + i * 65} x2={20} y2={22 + i * 65} stroke="var(--color-sepia-500)" strokeWidth="1" />
          <line x1={W - 20} y1={22 + i * 65} x2={W - 14} y2={22 + i * 65} stroke="var(--color-sepia-500)" strokeWidth="1" />
        </g>
      ))}
      <g clipPath="url(#chartClip)">
        {[...Array(16)].map((_, i) => (
          <line key={i} x1={W - 110} y1={H - 100} x2={W - 110 + Math.sin((i / 16) * Math.PI * 2) * 1400}
            y2={H - 100 - Math.cos((i / 16) * Math.PI * 2) * 1400}
            stroke="var(--color-inkline)" strokeWidth="0.45" opacity="0.18" aria-hidden="true" />
        ))}
        <SeaMarks seed={9137} w={W} h={H} />
        {segs.map((s, i) => {
          const opp = segOpportunity(s);
          const share = opp / total;
          const [cx, cy] = ISLAND_SLOTS[i % ISLAND_SLOTS.length];
          const r = clamp(38 + Math.sqrt(share) * 96, 38, 108);
          return (
            <Island key={s.id} seg={s} cx={cx} cy={cy} r={r} share={share}
              focus={s.id === focusId} selected={s.id === selectedId}
              acctCount={byTier[s.id]?.n || 0} t1Count={byTier[s.id]?.t1 || 0}
              onSelect={() => onSelect(s.id)} />
          );
        })}
      </g>
      <CompassRose x={W - 110} y={H - 100} />
      <g aria-hidden="true">
        <rect x={34} y={30} width={252} height={64} fill="var(--color-parch-100)" stroke="var(--color-sepia-600)" strokeWidth="1.4" />
        <rect x={38} y={34} width={244} height={56} fill="none" stroke="var(--color-inkline)" strokeWidth="0.6" />
        <text x={160} y={56} textAnchor="middle" fontFamily="var(--font-display)" fontWeight="900"
          fontSize="17" letterSpacing="2" fill="var(--color-sepia-800)">CARTA TERRITORII</text>
        <line x1={70} y1={64} x2={250} y2={64} stroke="var(--color-inkline)" strokeWidth="0.7" />
        <text x={160} y={80} textAnchor="middle" fontFamily="var(--font-body)" fontStyle="italic"
          fontSize="11" fill="var(--color-sepia-500)">
          {segs.length ? `${segs.length} territories · ${fmtMoney(total)} charted` : 'awaiting the surveyor'}
        </text>
      </g>
      <text x={30} y={H - 26} fontFamily="var(--font-mono)" fontSize="9" fill="var(--color-sepia-400)" aria-hidden="true">
        41°N 72°W — surveyed {new Date().getFullYear()}
      </text>
      {segs.length === 0 && (
        <g>
          <text x={W / 2} y={H / 2 - 26} textAnchor="middle" fontFamily="var(--font-display)" fontWeight="900"
            fontSize="30" fill="var(--color-sepia-600)">Uncharted waters</text>
          <text x={W / 2} y={H / 2 + 4} textAnchor="middle" fontFamily="var(--font-body)" fontStyle="italic"
            fontSize="15" fill="var(--color-sepia-500)">Every territory you chart below rises here as an island, sized by opportunity.</text>
          <g role="button" tabIndex={0} aria-label="Load the demo expedition" className="cursor-pointer"
            onClick={onLoadDemo}
            onKeyDown={(e) => { if (e.key === 'Enter') onLoadDemo(); }}>
            <rect x={W / 2 - 105} y={H / 2 + 24} width={210} height={36} rx={3}
              fill="var(--color-oxide-500)" stroke="var(--color-sepia-800)" strokeWidth="1" />
            <text x={W / 2} y={H / 2 + 47} textAnchor="middle" fontFamily="var(--font-display)" fontWeight="600"
              fontSize="15" fill="var(--color-parch-50)">Load the demo expedition</text>
          </g>
        </g>
      )}
    </svg>
  );
}

/* ============================== coverage gauge ============================== */

function polar(cx, cy, r, deg) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
function arcPath(cx, cy, r, a0, a1) {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

function CoverageGauge({ tier, assigned, slots }) {
  const util = slots > 0 ? assigned / slots : assigned > 0 ? 1.5 : 0;
  const pct = Math.round(util * 100);
  const max = 1.5; // dial reads 0..150%
  const A0 = -108, A1 = 108;
  const toAng = (u) => A0 + (clamp(u, 0, max) / max) * (A1 - A0);
  const cx = 80, cy = 84, R = 62;
  const over = util > 1.0001;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 160 118" className="w-full max-w-[170px]" role="img"
        aria-label={`${TIERS[tier].long}: ${assigned} assigned of ${slots} slots, ${pct}% loaded`}>
        <path d={arcPath(cx, cy, R, A0, A1)} fill="none" stroke="var(--color-parch-300)" strokeWidth="11" strokeLinecap="round" />
        <path d={arcPath(cx, cy, R, A0, toAng(1))} fill="none" stroke="var(--color-verdi-400)" strokeWidth="11" strokeLinecap="round" opacity="0.55" />
        <path d={arcPath(cx, cy, R, toAng(1), A1)} fill="none" stroke="var(--color-oxide-400)" strokeWidth="11" strokeLinecap="round" opacity="0.45" />
        {[0, 0.25, 0.5, 0.75, 1, 1.25, 1.5].map((u) => {
          const ang = toAng(u);
          const [x0, y0] = polar(cx, cy, R + 9, ang);
          const [x1, y1] = polar(cx, cy, R + (u === 1 ? 16 : 13), ang);
          return <line key={u} x1={x0} y1={y0} x2={x1} y2={y1}
            stroke={u === 1 ? 'var(--color-oxide-600)' : 'var(--color-sepia-500)'} strokeWidth={u === 1 ? 2 : 1} />;
        })}
        <text x={22} y={116} fontSize="8.5" fontFamily="var(--font-mono)" fill="var(--color-sepia-400)">0%</text>
        <text x={132} y={116} fontSize="8.5" fontFamily="var(--font-mono)" fill="var(--color-sepia-400)">150%</text>
        <g style={{ transform: `rotate(${toAng(util)}deg)`, transformOrigin: `${cx}px ${cy}px` }} className="tm-needle">
          <line x1={cx} y1={cy + 8} x2={cx} y2={cy - R + 4} stroke="var(--color-sepia-800)" strokeWidth="2.4" />
          <circle cx={cx} cy={cy} r="4.5" fill="var(--color-brass-400)" stroke="var(--color-sepia-800)" strokeWidth="1" />
        </g>
        <text x={cx} y={cy + 26} textAnchor="middle" fontFamily="var(--font-mono)" fontWeight="600" fontSize="17"
          fill={over ? 'var(--color-oxide-600)' : 'var(--color-verdi-600)'}>{pct}%</text>
      </svg>
      <div className="text-center -mt-1">
        <div className="font-display font-semibold text-sepia-800 text-sm">{TIERS[tier].long}</div>
        <div className="font-mono text-[11px] text-sepia-500">{fmtInt(assigned)} / {fmtInt(slots)} slots</div>
        <div className={`font-body italic text-xs mt-0.5 ${over ? 'text-oxide-600' : 'text-verdi-600'}`}>
          {over ? 'over capacity — cut or demote' : slots - assigned > 0 ? `${fmtInt(slots - assigned)} slots open` : 'fully loaded'}
        </div>
      </div>
    </div>
  );
}

/* ============================== small UI atoms ============================== */

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-sepia-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
const inputCls =
  'w-full rounded-sm border border-sepia-300/70 bg-parch-50/80 px-2.5 py-1.5 font-body text-sm text-sepia-800 placeholder:text-sepia-400/70 placeholder:italic focus:border-oxide-500 focus:outline-none focus:ring-1 focus:ring-oxide-500/50';

function BtnPrimary({ children, className = '', ...p }) {
  return (
    <button {...p} className={`inline-flex items-center gap-1.5 rounded-sm border border-sepia-800 bg-oxide-500 px-3 py-1.5 font-display text-sm font-semibold text-parch-50 shadow-card transition-colors hover:bg-oxide-600 ${className}`}>
      {children}
    </button>
  );
}
function BtnGhost({ children, className = '', ...p }) {
  return (
    <button {...p} className={`inline-flex items-center gap-1.5 rounded-sm border border-sepia-400/70 bg-parch-50/70 px-3 py-1.5 font-display text-sm font-semibold text-sepia-700 transition-colors hover:border-sepia-600 hover:bg-parch-200 ${className}`}>
      {children}
    </button>
  );
}
function IconBtn({ label, children, className = '', ...p }) {
  return (
    <button {...p} aria-label={label} title={label}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-sm border border-transparent text-sepia-500 transition-colors hover:border-sepia-400 hover:bg-parch-200 hover:text-sepia-800 ${className}`}>
      {children}
    </button>
  );
}

function SectionHead({ icon: Icon, kicker, title, aside }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b-2 border-sepia-600/70 pb-2">
      <div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-oxide-600">
          <Icon className="h-3.5 w-3.5" aria-hidden /> {kicker}
        </div>
        <h2 className="font-display text-2xl font-black text-sepia-900">{title}</h2>
      </div>
      {aside}
    </div>
  );
}

/* ============================== markdown / exports ============================== */

function planMarkdown(state, focus) {
  const total = state.segments.reduce((a, s) => a + segOpportunity(s), 0);
  const lines = [];
  lines.push(`# Territory Plan — ${new Date().toISOString().slice(0, 10)}`);
  if (state.business) lines.push('', `> ${state.business}`);
  lines.push('', `**Charted opportunity:** ${fmtMoney(total)} across ${state.segments.length} segments · ${state.accounts.length} accounts on the ledger`, '');
  if (focus) {
    lines.push(`## Surveyor's verdict`, '',
      `**Plant the flag in “${focus.name}”** — ${fmtMoney(segOpportunity(focus))} expected opportunity (${total ? Math.round((segOpportunity(focus) / total) * 100) : 0}% of the chart). ${focus.vertical || 'n/a'} · ${focus.size} · ${focus.geo || 'n/a'}.`, '');
  }
  lines.push('## Segments', '', '| Segment | Vertical | Size | Geo | Accts (est) | Avg deal | Win % | Opportunity |', '|---|---|---|---|---:|---:|---:|---:|');
  for (const s of state.segments) {
    lines.push(`| ${s.name} | ${s.vertical || '—'} | ${s.size} | ${s.geo || '—'} | ${fmtInt(s.accountsEst)} | ${fmtMoney(s.avgDeal)} | ${s.winRate}% | ${fmtMoney(segOpportunity(s))} |`);
  }
  const segName = (id) => state.segments.find((s) => s.id === id)?.name || 'Unassigned';
  for (const t of TIER_KEYS) {
    const rows = state.accounts.filter((a) => a.tier === t);
    lines.push('', `## ${TIERS[t].long} (${TIERS[t].desc}) — ${rows.length} accounts`, '');
    if (!rows.length) lines.push('_none assigned_');
    for (const a of rows) lines.push(`- **${a.name}** — ${segName(a.segmentId)} · est ${fmtMoney(a.value)}${a.notes ? ` — ${a.notes}` : ''}`);
  }
  const un = state.accounts.filter((a) => !a.tier);
  if (un.length) {
    lines.push('', `## Untiered — ${un.length} accounts`, '');
    for (const a of un) lines.push(`- ${a.name} — ${segName(a.segmentId)} · est ${fmtMoney(a.value)}`);
  }
  const cap = state.capacity;
  lines.push('', '## Coverage math', '',
    `- Reps carrying territory: ${cap.reps}`,
    `- T1 slots: ${cap.reps * cap.t1PerRep} (${cap.t1PerRep}/rep) — assigned ${state.accounts.filter((a) => a.tier === 'T1').length}`,
    `- T2 slots: ${cap.reps * cap.t2PerRep} (${cap.t2PerRep}/rep) — assigned ${state.accounts.filter((a) => a.tier === 'T2').length}`,
    `- T3 slots: ${cap.reps * cap.t3PerRep} (${cap.t3PerRep}/rep) — assigned ${state.accounts.filter((a) => a.tier === 'T3').length}`);
  if (state.copilotNotes) lines.push('', '## Field notes (from Claude)', '', state.copilotNotes);
  lines.push('', '---', '_Charted with Territory Mapper._');
  return lines.join('\n');
}

function accountsCsv(state) {
  const segName = (id) => state.segments.find((s) => s.id === id)?.name || '';
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['account', 'segment', 'tier', 'est_value', 'notes'].join(',')];
  for (const a of state.accounts) rows.push([esc(a.name), esc(segName(a.segmentId)), esc(a.tier || ''), a.value, esc(a.notes)].join(','));
  return rows.join('\n');
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove(); return true;
    } catch { return false; }
  }
}

/* ============================== copilot prompts ============================== */

function stateBriefMd(state) {
  const total = state.segments.reduce((a, s) => a + segOpportunity(s), 0);
  const cap = state.capacity;
  const segName = (id) => state.segments.find((s) => s.id === id)?.name || 'Unassigned';
  const L = [];
  L.push(`**Business:** ${state.business || '(not described yet)'}`);
  L.push('', `**Segments charted (${state.segments.length}, ${fmtMoney(total)} total expected opportunity):**`);
  for (const s of state.segments) {
    L.push(`- ${s.name} — vertical: ${s.vertical || 'n/a'}; size band: ${s.size}; geo: ${s.geo || 'n/a'}; est. addressable accounts: ${fmtInt(s.accountsEst)}; avg deal: ${fmtMoney(s.avgDeal)}; assumed win rate: ${s.winRate}%; expected opportunity: ${fmtMoney(segOpportunity(s))}${s.notes ? `; field notes: ${s.notes}` : ''}`);
  }
  L.push('', `**Account ledger (${state.accounts.length}):**`);
  for (const t of TIER_KEYS) {
    const rows = state.accounts.filter((a) => a.tier === t);
    L.push(`- ${TIERS[t].long} (${rows.length}): ${rows.map((a) => `${a.name} [${segName(a.segmentId)}, ${fmtMoney(a.value)}]`).join('; ') || 'none'}`);
  }
  const un = state.accounts.filter((a) => !a.tier);
  if (un.length) L.push(`- Untiered (${un.length}): ${un.map((a) => a.name).join('; ')}`);
  L.push('', `**Coverage capacity:** ${cap.reps} reps · per-rep loads T1=${cap.t1PerRep}, T2=${cap.t2PerRep}, T3=${cap.t3PerRep} → total slots T1=${cap.reps * cap.t1PerRep}, T2=${cap.reps * cap.t2PerRep}, T3=${cap.reps * cap.t3PerRep}.`);
  return L.join('\n');
}

/* Console Deck integration: when this app is framed inside the Console, prepend
   a compact shared-context header to every Copilot prompt. Plain text only —
   never HTML — and a pure no-op when consoleCtx is null (standalone). */
function buildConsoleContextHeader(consoleCtx) {
  if (!consoleCtx) return '';
  const profile = consoleCtx.profile || {};
  const claude = consoleCtx.claude || {};
  const roster = consoleCtx.roster || {};
  const lines = [];
  if (profile.company) lines.push(`- My company: ${profile.company}`);
  if (profile.offer) lines.push(`- What I sell: ${profile.offer}`);
  if (profile.icp) lines.push(`- My ICP: ${profile.icp}`);
  if (profile.pricingAnchor) lines.push(`- Pricing anchor: ${profile.pricingAnchor}`);
  const nameVoice = [claude.userName, claude.voiceNotes].filter((v) => v && String(v).trim());
  if (nameVoice.length) lines.push(`- My name / voice: ${nameVoice.join(' — ')}`);
  if (Array.isArray(roster.accounts) && roster.accounts.length) {
    const accts = roster.accounts.slice(0, 12).map((a) => `${a.name}${a.segment ? ` (${a.segment})` : ''}`).join(', ');
    lines.push(`- Accounts on file: ${accts}`);
  }
  if (!lines.length) return '';
  return `## Shared context (from BizDev Console)\n${lines.join('\n')}`;
}

function withConsoleContext(prompt, consoleCtx) {
  const header = buildConsoleContextHeader(consoleCtx);
  return header ? `${header}\n\n${prompt}` : prompt;
}

function promptSizeSegment(state, seg, consoleCtx) {
  return withConsoleContext(`You are a senior B2B market analyst who sizes go-to-market segments for boutique firms. Be rigorous, cite reasoning, and flag every assumption. Do not flatter my numbers.

## My context
${stateBriefMd(state)}

## The segment to survey
- **Name:** ${seg.name}
- **Vertical:** ${seg.vertical || 'n/a'} · **Size band:** ${seg.size} · **Geo:** ${seg.geo || 'n/a'}
- **My current estimates:** ${fmtInt(seg.accountsEst)} addressable accounts × ${fmtMoney(seg.avgDeal)} avg deal × ${seg.winRate}% win rate = ${fmtMoney(segOpportunity(seg))} expected opportunity
${seg.notes ? `- **Field notes:** ${seg.notes}` : ''}

## What I need
1. **Sanity-check my account count.** Estimate the realistic number of companies matching this vertical × size band × geo. Show your estimation chain (top-down and bottom-up if possible).
2. **Layer the funnel:** TAM → SAM (reachable with my capacity and offer) → SOM for the next 12 months.
3. **Interrogate my win-rate and deal-size assumptions** against what is typical for a firm my size selling this kind of offer.
4. **List 5 public data sources or search recipes** I could use this week to firm up the count (directories, filings, job boards, tech-lookup tools).
5. **Verdict:** is this segment worth a named-account (T1) motion, a clustered (T2) motion, or programmatic-only (T3)?

## Output format
Markdown. Sections matching 1–5 above, then a final table: | Metric | My estimate | Your estimate | Delta | Confidence |. End with the top 3 risks that would shrink this segment.`, consoleCtx);
}

function promptTiering(state, consoleCtx) {
  const counts = { T1: 0, T2: 0, T3: 0, none: 0 };
  for (const a of state.accounts) counts[a.tier || 'none']++;
  const cap = state.capacity;
  return withConsoleContext(`You are a revenue architect who designs account-tiering systems for small B2B teams. You optimize for focus per rep-hour, not vanity coverage.

## My context
${stateBriefMd(state)}

## Current tier load vs capacity
- T1 named: ${counts.T1} assigned vs ${cap.reps * cap.t1PerRep} slots
- T2 clustered: ${counts.T2} assigned vs ${cap.reps * cap.t2PerRep} slots
- T3 programmatic: ${counts.T3} assigned vs ${cap.reps * cap.t3PerRep} slots
- Untiered: ${counts.none}

## What I need
1. **Tiering rules I can apply mechanically:** 3–5 objective criteria per tier (thresholds on deal size, fit signals, trigger events) so any account can be tiered in under a minute.
2. **A coverage motion per tier:** what a rep actually does weekly for a T1 vs T2 vs T3 account, sized to my per-rep loads above.
3. **Rebalancing moves:** given my current load vs slots, name which tiers to grow, freeze, or cut — and what promotion/demotion between tiers should require.
4. **The math check:** estimate weekly rep-hours my proposed loads imply; tell me if my per-rep numbers are fantasy for a team of ${cap.reps}.

## Output format
Markdown. A rules table per tier (| Criterion | Threshold | Why |), then the weekly motion per tier as short checklists, then rebalancing moves as a numbered action list I can execute this week.`, consoleCtx);
}

function promptValueProp(state, seg, consoleCtx) {
  return withConsoleContext(`You are a positioning strategist in the style of April Dunford, writing for a specific vertical — never generic B2B mush. Plain words, concrete nouns, no buzzwords.

## My context
${stateBriefMd(state)}

## The vertical to write for
- **Segment:** ${seg.name} — ${seg.vertical || 'n/a'} · ${seg.size} · ${seg.geo || 'n/a'}
- **Avg deal:** ${fmtMoney(seg.avgDeal)} · **Assumed win rate:** ${seg.winRate}%
${seg.notes ? `- **Field notes:** ${seg.notes}` : ''}

## What I need
1. **The 3 sharpest pains** this vertical feels that my offer addresses — stated in the buyer's own vocabulary (name the roles who feel each).
2. **A vertical value proposition:** one-liner (under 20 words), then a 50-word version, each naming the vertical explicitly.
3. **Proof angle:** what evidence this vertical trusts (peer names, metrics, compliance marks) and how I should present mine.
4. **Two cold-email opening lines** and **three discovery questions** tuned to this vertical.
5. **What NOT to say** — 3 phrases this vertical is numb to.

## Output format
Markdown with sections 1–5. Keep the one-liner and openers inside code fences so I can copy them verbatim.`, consoleCtx);
}

/* ============================== modal + toast ============================== */

function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-sepia-900/55 p-4 pt-[6vh] no-print" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}
        className={`tm-rise w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-sm border-2 border-sepia-700 bg-parch-100 shadow-deep outline-none`}>
        <div className="flex items-center justify-between border-b border-sepia-400/60 px-5 py-3">
          <h3 className="font-display text-lg font-black text-sepia-900">{title}</h3>
          <IconBtn label="Close dialog" onClick={onClose}><X className="h-4 w-4" aria-hidden /></IconBtn>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function Toast({ toast, onUndo, onDismiss }) {
  if (!toast) return null;
  return (
    <div className="tm-toast fixed bottom-4 left-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 rounded-sm border-2 border-sepia-700 bg-sepia-800 text-parch-100 shadow-deep no-print">
      <div className="flex items-center gap-3 px-4 py-3">
        <ScrollText className="h-4 w-4 shrink-0 text-brass-300" aria-hidden />
        <p className="flex-1 font-body text-sm">{toast.msg}</p>
        {toast.undo && (
          <button onClick={onUndo} className="inline-flex items-center gap-1 rounded-sm border border-brass-300/70 px-2 py-1 font-display text-xs font-semibold text-brass-300 hover:bg-sepia-700">
            <Undo2 className="h-3.5 w-3.5" aria-hidden /> Undo
          </button>
        )}
        <IconBtn label="Dismiss notice" onClick={onDismiss} className="text-parch-200 hover:bg-sepia-700 hover:text-parch-50"><X className="h-3.5 w-3.5" aria-hidden /></IconBtn>
      </div>
      <div className="h-0.5 bg-brass-400/80" style={{ animation: 'tm-toast-bar 7s linear forwards' }} />
    </div>
  );
}

/* ============================== segment editor ============================== */

function SegmentEditor({ seg, onSave, onCancel }) {
  const [f, setF] = useState({ ...seg });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Field label="Territory name" className="col-span-2">
        <input className={inputCls} value={f.name} onChange={set('name')} placeholder="e.g. Series B+ FinTech" />
      </Field>
      <Field label="Vertical">
        <input className={inputCls} value={f.vertical} onChange={set('vertical')} placeholder="FinTech" />
      </Field>
      <Field label="Size band">
        <select className={inputCls} value={f.size} onChange={set('size')}>
          {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Geography">
        <input className={inputCls} value={f.geo} onChange={set('geo')} placeholder="NA — East" />
      </Field>
      <Field label="Est. accounts">
        <input type="number" min="0" className={inputCls} value={f.accountsEst} onChange={set('accountsEst')} />
      </Field>
      <Field label="Avg deal ($)">
        <input type="number" min="0" step="1000" className={inputCls} value={f.avgDeal} onChange={set('avgDeal')} />
      </Field>
      <Field label="Win rate (%)">
        <input type="number" min="0" max="100" className={inputCls} value={f.winRate} onChange={set('winRate')} />
      </Field>
      <Field label="Field notes" className="col-span-2 sm:col-span-4">
        <textarea rows={2} className={inputCls} value={f.notes} onChange={set('notes')} placeholder="Why this territory, what you know, what you suspect…" />
      </Field>
      <div className="col-span-2 flex gap-2 sm:col-span-4">
        <BtnPrimary onClick={() => onSave(normalizeSegment(f))}><Check className="h-4 w-4" aria-hidden /> Save territory</BtnPrimary>
        <BtnGhost onClick={onCancel}>Cancel</BtnGhost>
      </div>
    </div>
  );
}

/* ============================== main app ============================== */

export default function App() {
  const [state, setState] = useState(loadState);
  const [showGuide, setShowGuide] = useState(() => !loadState().seenGuide);
  const [showExport, setShowExport] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [toast, setToast] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [addingSeg, setAddingSeg] = useState(false);
  const [selectedSeg, setSelectedSeg] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [acctQuery, setAcctQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [segFilter, setSegFilter] = useState('all');
  const [newAcct, setNewAcct] = useState({ name: '', segmentId: '', tier: 'T2', value: '' });
  const [copilotSegId, setCopilotSegId] = useState('');
  const [rosterOpen, setRosterOpen] = useState(false);
  const fileRef = useRef(null);
  const toastTimer = useRef(null);
  const rosterRef = useRef(null);
  const consoleCtx = useConsoleBus();

  /* close roster dropdown on outside click */
  useEffect(() => {
    if (!rosterOpen) return;
    const onDown = (e) => { if (!rosterRef.current?.contains(e.target)) setRosterOpen(false); };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [rosterOpen]);

  /* autosave (debounced) */
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
    }, 350);
    return () => clearTimeout(t);
  }, [state]);

  /* toast lifecycle */
  const fireToast = useCallback((msg, undo = null) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), 7000);
  }, []);
  const dismissToast = () => { clearTimeout(toastTimer.current); setToast(null); };

  /* derived */
  const totalOpp = useMemo(() => state.segments.reduce((a, s) => a + segOpportunity(s), 0), [state.segments]);
  const focus = useMemo(() => {
    if (!state.segments.length) return null;
    return [...state.segments].sort((a, b) => segOpportunity(b) - segOpportunity(a))[0];
  }, [state.segments]);
  const runnerUp = useMemo(() => {
    const sorted = [...state.segments].sort((a, b) => segOpportunity(b) - segOpportunity(a));
    return sorted[1] || null;
  }, [state.segments]);
  const tierCounts = useMemo(() => {
    const c = { T1: 0, T2: 0, T3: 0, none: 0 };
    for (const a of state.accounts) c[a.tier || 'none']++;
    return c;
  }, [state.accounts]);
  const slots = {
    T1: state.capacity.reps * state.capacity.t1PerRep,
    T2: state.capacity.reps * state.capacity.t2PerRep,
    T3: state.capacity.reps * state.capacity.t3PerRep,
  };
  const segName = (id) => state.segments.find((s) => s.id === id)?.name || 'Unassigned';

  /* actions */
  const closeGuide = () => { setShowGuide(false); setState((s) => ({ ...s, seenGuide: true })); };
  const loadDemo = () => { setState({ ...demoState(), seenGuide: true }); setSelectedSeg(null); fireToast('Demo expedition loaded — a data consultancy charting four territories.'); };
  const doReset = () => {
    setState(normalize({ seenGuide: true })); setSelectedSeg(null); setConfirmReset(false);
    fireToast('The chart was burned. Fresh parchment awaits.');
  };
  const deleteSegment = (id) => {
    const idx = state.segments.findIndex((s) => s.id === id);
    const seg = state.segments[idx];
    if (!seg) return;
    const removedAccts = state.accounts.filter((a) => a.segmentId === id);
    setState((s) => ({ ...s, segments: s.segments.filter((x) => x.id !== id), accounts: s.accounts.map((a) => a.segmentId === id ? { ...a, segmentId: null } : a) }));
    fireToast(`Territory “${seg.name}” struck from the chart.`, () => {
      setState((s) => {
        const segs = [...s.segments]; segs.splice(Math.min(idx, segs.length), 0, seg);
        const restored = new Set(removedAccts.map((a) => a.id));
        return { ...s, segments: segs, accounts: s.accounts.map((a) => restored.has(a.id) ? { ...a, segmentId: id } : a) };
      });
    });
  };
  const moveSegment = (id, dir) => {
    setState((s) => {
      const i = s.segments.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.segments.length) return s;
      const segs = [...s.segments];
      [segs[i], segs[j]] = [segs[j], segs[i]];
      return { ...s, segments: segs };
    });
  };
  const saveSegment = (seg) => {
    setState((s) => {
      const exists = s.segments.some((x) => x.id === seg.id);
      return { ...s, segments: exists ? s.segments.map((x) => (x.id === seg.id ? seg : x)) : [...s.segments, seg] };
    });
    setEditingId(null); setAddingSeg(false);
  };
  const deleteAccount = (id) => {
    const idx = state.accounts.findIndex((a) => a.id === id);
    const acct = state.accounts[idx];
    if (!acct) return;
    setState((s) => ({ ...s, accounts: s.accounts.filter((a) => a.id !== id) }));
    fireToast(`“${acct.name}” struck from the ledger.`, () => {
      setState((s) => { const arr = [...s.accounts]; arr.splice(Math.min(idx, arr.length), 0, acct); return { ...s, accounts: arr }; });
    });
  };
  const patchAccount = (id, patch) => setState((s) => ({ ...s, accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  const addAccount = () => {
    if (!newAcct.name.trim()) return;
    const acct = normalizeAccount({ ...newAcct, id: uid(), value: num(newAcct.value), segmentId: newAcct.segmentId || null }, new Set(state.segments.map((s) => s.id)));
    setState((s) => ({ ...s, accounts: [acct, ...s.accounts] }));
    setNewAcct({ name: '', segmentId: newAcct.segmentId, tier: newAcct.tier, value: '' });
  };
  /* console-linked convenience: pull an account straight from the console roster onto the ledger */
  const addAccountFromRoster = (rosterAcct) => {
    const matchSeg = rosterAcct.segment
      ? state.segments.find((s) => s.name.trim().toLowerCase() === String(rosterAcct.segment).trim().toLowerCase())
      : null;
    const acct = normalizeAccount({
      id: uid(),
      name: rosterAcct.name || '',
      segmentId: matchSeg ? matchSeg.id : (newAcct.segmentId || null),
      tier: newAcct.tier,
      value: 0,
      notes: rosterAcct.notes || '',
    }, new Set(state.segments.map((s) => s.id)));
    setState((s) => ({ ...s, accounts: [acct, ...s.accounts] }));
    fireToast(`“${acct.name}” pulled onto the ledger from the console roster.`);
  };
  const patchCapacity = (k) => (e) => setState((s) => ({ ...s, capacity: { ...s.capacity, [k]: clamp(num(e.target.value), 0, 1000000) } }));

  const doCopy = async (key, text, msg) => {
    const ok = await copyText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2200);
    if (msg) fireToast(ok ? msg : 'Copy failed — your browser blocked the clipboard.');
  };
  const copyPlan = () => doCopy('plan', planMarkdown(state, focus), 'Territory Plan copied as Markdown.');
  const downloadJson = () => download('territory-mapper.json', JSON.stringify(state, null, 2), 'application/json');
  const downloadCsv = () => download('territory-accounts.csv', accountsCsv(state), 'text/csv');
  const importJson = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try { setState(normalize(JSON.parse(String(rd.result)))); fireToast('Chart imported — every territory and account restored.'); }
      catch { fireToast('That file was not a valid Territory Mapper JSON.'); }
    };
    rd.readAsText(f);
    e.target.value = '';
  };

  /* keyboard */
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable;
      if (e.key === 'Escape') {
        if (showExport) setShowExport(false);
        else if (rosterOpen) setRosterOpen(false);
        else if (showGuide) closeGuide();
        else if (confirmReset) setConfirmReset(false);
        return;
      }
      if (typing) return;
      if (e.key === '?') { e.preventDefault(); setShowGuide(true); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); copyPlan(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* filtered accounts */
  const filteredAccounts = state.accounts.filter((a) => {
    if (tierFilter !== 'all' && (a.tier || 'none') !== tierFilter) return false;
    if (segFilter !== 'all' && (a.segmentId || 'none') !== segFilter) return false;
    if (acctQuery && !`${a.name} ${a.notes}`.toLowerCase().includes(acctQuery.toLowerCase())) return false;
    return true;
  });

  const copilotSeg = state.segments.find((s) => s.id === copilotSegId) || state.segments.find((s) => s.id === selectedSeg) || focus;

  const focusShare = focus && totalOpp ? Math.round((segOpportunity(focus) / totalOpp) * 100) : 0;
  const focusAccts = focus ? state.accounts.filter((a) => a.segmentId === focus.id) : [];
  const focusT1 = focusAccts.filter((a) => a.tier === 'T1').length;

  return (
    <main className="min-h-screen pb-24 font-body">
      {/* ======================= header ======================= */}
      <header className="no-print border-b-2 border-sepia-600/60 bg-parch-50/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 48 48" className="h-11 w-11" aria-hidden>
              <circle cx="24" cy="24" r="21" fill="var(--color-parch-200)" stroke="var(--color-sepia-700)" strokeWidth="2" />
              <circle cx="24" cy="24" r="16" fill="none" stroke="var(--color-inkline)" strokeWidth="0.8" strokeDasharray="2 3" />
              <path d="M24 6 L27 21 L42 24 L27 27 L24 42 L21 27 L6 24 L21 21 Z" fill="var(--color-sepia-700)" />
              <path d="M24 6 L27 21 L24 24 Z" fill="var(--color-oxide-500)" />
              <circle cx="24" cy="24" r="2.2" fill="var(--color-brass-400)" stroke="var(--color-sepia-800)" strokeWidth="0.8" />
            </svg>
            <div>
              <h1 className="font-display text-2xl font-black leading-none tracking-tight text-sepia-900">Territory Mapper</h1>
              <p className="mt-1 font-body text-[13px] italic text-sepia-500">Chart your segments, tier the accounts, plant the flag where the money is.</p>
            </div>
          </div>
          {consoleCtx && (
            <span
              className="inline-flex items-center gap-1.5 rounded-sm border border-oxide-500/50 bg-oxide-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-oxide-600"
              title="Linked to the BizDev Console Deck"
            >
              <Link2 className="h-3 w-3" aria-hidden /> Console linked
              {consoleCtx.profile?.company ? ` · ${consoleCtx.profile.company}` : ''}
            </span>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <BtnGhost onClick={loadDemo}><Ship className="h-4 w-4" aria-hidden /> Load demo</BtnGhost>
            {confirmReset ? (
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-oxide-500 bg-oxide-500/10 px-2 py-1">
                <span className="font-body text-xs italic text-oxide-600">Burn the chart?</span>
                <button onClick={doReset} className="rounded-sm bg-oxide-500 px-2 py-0.5 font-display text-xs font-semibold text-parch-50 hover:bg-oxide-600">Burn it</button>
                <button onClick={() => setConfirmReset(false)} className="px-1 font-display text-xs font-semibold text-sepia-600 hover:text-sepia-800">Keep</button>
              </span>
            ) : (
              <BtnGhost onClick={() => setConfirmReset(true)}><RotateCcw className="h-4 w-4" aria-hidden /> Reset</BtnGhost>
            )}
            <BtnGhost onClick={() => setShowGuide(true)}><HelpCircle className="h-4 w-4" aria-hidden /> How to use</BtnGhost>
            <div className="relative">
              <BtnPrimary onClick={() => setShowExport((v) => !v)} aria-expanded={showExport} aria-haspopup="menu">
                <Download className="h-4 w-4" aria-hidden /> Export
              </BtnPrimary>
              {showExport && (
                <div role="menu" className="tm-rise absolute right-0 z-40 mt-2 w-64 rounded-sm border-2 border-sepia-700 bg-parch-50 p-1.5 shadow-deep">
                  {[
                    { k: 'md', icon: FileText, label: copiedKey === 'plan' ? 'Copied to clipboard' : 'Copy plan as Markdown', hint: 'Ctrl/Cmd+S', act: copyPlan },
                    { k: 'json', icon: FileJson, label: 'Download JSON (full state)', hint: '', act: downloadJson },
                    { k: 'csv', icon: FileSpreadsheet, label: 'Download accounts CSV', hint: '', act: downloadCsv },
                    { k: 'imp', icon: Upload, label: 'Import JSON…', hint: '', act: () => fileRef.current?.click() },
                    { k: 'prt', icon: Printer, label: 'Print the Territory Plan', hint: '', act: () => window.print() },
                  ].map((it) => (
                    <button key={it.k} role="menuitem" onClick={() => { it.act(); if (it.k !== 'md') setShowExport(false); }}
                      className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left font-body text-sm text-sepia-800 hover:bg-parch-200">
                      <it.icon className="h-4 w-4 text-sepia-500" aria-hidden />
                      <span className="flex-1">{it.label}</span>
                      {it.hint && <kbd className="font-mono text-[10px] text-sepia-400">{it.hint}</kbd>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={importJson} aria-label="Import Territory Mapper JSON file" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* ======================= chart + verdict ======================= */}
        <section className="no-print mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="rounded-sm border-2 border-sepia-700 bg-parch-100 p-1.5 shadow-deep">
            <TerritoryChart state={state} focusId={focus?.id || null} selectedId={selectedSeg}
              onSelect={(id) => setSelectedSeg((cur) => (cur === id ? null : id))} onLoadDemo={loadDemo} />
          </div>
          <aside className="flex flex-col gap-4">
            <div className="rounded-sm border-2 border-oxide-500 bg-parch-50 p-4 shadow-card">
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-oxide-600">
                <Flag className="h-3.5 w-3.5" aria-hidden /> Surveyor's verdict
              </div>
              {focus ? (
                <>
                  <h3 className="mt-1 font-display text-xl font-black leading-tight text-sepia-900">Plant the flag in “{focus.name}”</h3>
                  <p className="mt-2 font-body text-sm leading-relaxed text-sepia-700">
                    <span className="font-mono font-semibold text-oxide-600">{fmtMoney(segOpportunity(focus))}</span> expected opportunity — {focusShare}% of everything charted.
                    You hold {focusAccts.length} listed account{focusAccts.length === 1 ? '' : 's'} there ({focusT1} named T1).
                    {focusT1 === 0 && focusAccts.length > 0 && ' Promote your best to T1 and pursue by name.'}
                    {focusAccts.length === 0 && ' The island is empty — put real account names on it this week.'}
                  </p>
                  {runnerUp && (
                    <p className="mt-2 border-t border-sepia-300/60 pt-2 font-body text-xs italic text-sepia-500">
                      Second landfall: {runnerUp.name} at {fmtMoney(segOpportunity(runnerUp))}. Keep it warm, not staffed.
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 font-body text-sm italic leading-relaxed text-sepia-600">
                  No verdict without a chart. Add territories below — the surveyor ranks them by accounts × deal × win rate and tells you where to land first.
                </p>
              )}
            </div>
            <div className="rounded-sm border border-sepia-400/70 bg-parch-50/80 p-4 shadow-card">
              <Field label="The expedition — what do you sell, and who sells it?">
                <textarea rows={4} className={inputCls} value={state.business}
                  onChange={(e) => setState((s) => ({ ...s, business: e.target.value }))}
                  placeholder="e.g. 6-person consultancy selling $5k/mo retainers; founder-led sales…" />
              </Field>
              <p className="mt-1.5 font-body text-[11px] italic text-sepia-500">Woven into every Copilot prompt so Claude knows your ship.</p>
            </div>
            <div className="rounded-sm border border-sepia-400/70 bg-parch-50/80 px-4 py-3 shadow-card">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-sepia-500">Charted opportunity</span>
                <span className="font-mono text-lg font-semibold text-sepia-900">{fmtMoney(totalOpp)}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-sepia-500">Ledger</span>
                <span className="font-mono text-sm text-sepia-700">{state.accounts.length} accts · T1 {tierCounts.T1} / T2 {tierCounts.T2} / T3 {tierCounts.T3}</span>
              </div>
            </div>
          </aside>
        </section>

        {/* ======================= segments ======================= */}
        <section className="no-print mt-10">
          <SectionHead icon={MapIcon} kicker="Charted territories" title="Segments"
            aside={<BtnPrimary onClick={() => { setAddingSeg(true); setEditingId(null); }}><Plus className="h-4 w-4" aria-hidden /> Chart a territory</BtnPrimary>} />
          {addingSeg && (
            <div className="mb-4 rounded-sm border-2 border-dashed border-sepia-500 bg-parch-50/80 p-4 shadow-card">
              <SegmentEditor seg={normalizeSegment({ name: '', winRate: 10, accountsEst: 100, avgDeal: 25000 })}
                onSave={saveSegment} onCancel={() => setAddingSeg(false)} />
            </div>
          )}
          {state.segments.length === 0 && !addingSeg && (
            <div className="rounded-sm border-2 border-dashed border-sepia-400 bg-parch-50/60 p-8 text-center">
              <Compass className="mx-auto h-8 w-8 text-sepia-400" aria-hidden />
              <p className="mx-auto mt-3 max-w-md font-body italic text-sepia-600">
                A territory is a vertical × size × geography you could own. Chart your first — even rough numbers beat a blank map — or load the demo to see a finished expedition.
              </p>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {state.segments.map((s, i) => {
              const opp = segOpportunity(s);
              const share = totalOpp ? opp / totalOpp : 0;
              const isFocus = focus?.id === s.id;
              const editing = editingId === s.id;
              return (
                <article key={s.id}
                  className={`rounded-sm border-2 bg-parch-50 p-4 shadow-card transition-shadow ${isFocus ? 'border-oxide-500' : selectedSeg === s.id ? 'border-sepia-700' : 'border-sepia-400/60'}`}>
                  {editing ? (
                    <SegmentEditor seg={s} onSave={saveSegment} onCancel={() => setEditingId(null)} />
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-lg font-black leading-tight text-sepia-900">{s.name}</h3>
                            {isFocus && <span className="rounded-sm border border-oxide-500 bg-oxide-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-oxide-600">Focus</span>}
                          </div>
                          <p className="mt-0.5 font-body text-xs italic text-sepia-500">
                            {[s.vertical, s.size, s.geo].filter(Boolean).join(' · ') || 'unspecified waters'}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <IconBtn label={`Move ${s.name} up`} onClick={() => moveSegment(s.id, -1)} disabled={i === 0} className="disabled:opacity-30"><ChevronUp className="h-4 w-4" aria-hidden /></IconBtn>
                          <IconBtn label={`Move ${s.name} down`} onClick={() => moveSegment(s.id, 1)} disabled={i === state.segments.length - 1} className="disabled:opacity-30"><ChevronDown className="h-4 w-4" aria-hidden /></IconBtn>
                          <IconBtn label={`Edit ${s.name}`} onClick={() => { setEditingId(s.id); setAddingSeg(false); }}><Pencil className="h-4 w-4" aria-hidden /></IconBtn>
                          <IconBtn label={`Delete ${s.name}`} onClick={() => deleteSegment(s.id)} className="hover:text-oxide-600"><Trash2 className="h-4 w-4" aria-hidden /></IconBtn>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-2 border-y border-sepia-300/50 py-2.5">
                        {[
                          ['Accounts', fmtInt(s.accountsEst)],
                          ['Avg deal', fmtMoney(s.avgDeal)],
                          ['Win rate', s.winRate + '%'],
                          ['Opportunity', fmtMoney(opp)],
                        ].map(([k, v], j) => (
                          <div key={k} className={j === 3 ? 'text-right' : ''}>
                            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-sepia-400">{k}</div>
                            <div className={`font-mono text-sm font-semibold ${j === 3 ? 'text-oxide-600' : 'text-sepia-800'}`}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2.5" aria-hidden="true">
                        <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="h-1.5 w-full">
                          <rect x="0" y="1.5" width="100" height="3" fill="var(--color-parch-300)" />
                          <rect x="0" y="0" width={Math.max(share * 100, 1.5)} height="6" fill={isFocus ? 'var(--color-oxide-500)' : 'var(--color-sepia-500)'} />
                        </svg>
                        <div className="mt-1 flex justify-between font-mono text-[10px] text-sepia-400">
                          <span>{Math.round(share * 100)}% of charted opportunity</span>
                          <span>{state.accounts.filter((a) => a.segmentId === s.id).length} on ledger</span>
                        </div>
                      </div>
                      {s.notes && <p className="mt-2 font-body text-[13px] italic leading-relaxed text-sepia-600">{s.notes}</p>}
                    </>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {/* ======================= accounts + coverage ======================= */}
        <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="no-print min-w-0">
            <SectionHead icon={Anchor} kicker="The ship's manifest" title="Account Ledger"
              aside={consoleCtx?.roster?.accounts?.length > 0 && (
                <div className="relative" ref={rosterRef}>
                  <BtnGhost onClick={() => setRosterOpen((v) => !v)} aria-haspopup="menu" aria-expanded={rosterOpen}>
                    <Link2 className="h-4 w-4" aria-hidden /> Pull from roster <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  </BtnGhost>
                  {rosterOpen && (
                    <div role="menu" className="tm-rise absolute right-0 z-40 mt-2 max-h-64 w-64 overflow-y-auto rounded-sm border-2 border-sepia-700 bg-parch-50 p-1.5 shadow-deep">
                      {consoleCtx.roster.accounts.slice(0, 50).map((a, i) => (
                        <button key={i} role="menuitem" onClick={() => { addAccountFromRoster(a); setRosterOpen(false); }}
                          className="flex w-full items-center justify-between gap-2 rounded-sm px-2.5 py-2 text-left font-body text-sm text-sepia-800 hover:bg-parch-200">
                          <span className="truncate">{a.name}</span>
                          {a.segment && <span className="ml-2 shrink-0 font-mono text-[10px] text-sepia-500">{a.segment}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )} />
            {/* add row */}
            <div className="mb-3 grid grid-cols-2 gap-2 rounded-sm border border-sepia-400/70 bg-parch-50/80 p-3 shadow-card sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_6rem_6rem_auto]">
              <input className={inputCls} placeholder="Account name…" value={newAcct.name}
                onChange={(e) => setNewAcct({ ...newAcct, name: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') addAccount(); }} aria-label="New account name" />
              <select className={inputCls} value={newAcct.segmentId} onChange={(e) => setNewAcct({ ...newAcct, segmentId: e.target.value })} aria-label="New account segment">
                <option value="">No territory</option>
                {state.segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select className={inputCls} value={newAcct.tier} onChange={(e) => setNewAcct({ ...newAcct, tier: e.target.value })} aria-label="New account tier">
                {TIER_KEYS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="number" min="0" step="1000" className={inputCls} placeholder="Est. $" value={newAcct.value}
                onChange={(e) => setNewAcct({ ...newAcct, value: e.target.value })} aria-label="New account estimated value" />
              <BtnPrimary onClick={addAccount} className="justify-center"><Plus className="h-4 w-4" aria-hidden /> Add</BtnPrimary>
            </div>
            {/* filters */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sepia-400" aria-hidden />
                <input className={`${inputCls} w-48 pl-7`} placeholder="Search the ledger…" value={acctQuery}
                  onChange={(e) => setAcctQuery(e.target.value)} aria-label="Search accounts" />
              </div>
              <div className="flex overflow-hidden rounded-sm border border-sepia-400/70" role="group" aria-label="Filter by tier">
                {['all', 'T1', 'T2', 'T3', 'none'].map((t) => (
                  <button key={t} onClick={() => setTierFilter(t)}
                    className={`px-2.5 py-1.5 font-mono text-xs ${tierFilter === t ? 'bg-sepia-700 text-parch-50' : 'bg-parch-50/70 text-sepia-600 hover:bg-parch-200'}`}>
                    {t === 'all' ? 'All' : t === 'none' ? 'Untiered' : t}
                  </button>
                ))}
              </div>
              <select className={`${inputCls} w-auto`} value={segFilter} onChange={(e) => setSegFilter(e.target.value)} aria-label="Filter by territory">
                <option value="all">All territories</option>
                {state.segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                <option value="none">Unassigned</option>
              </select>
              <span className="ml-auto font-mono text-[11px] text-sepia-500">{filteredAccounts.length} shown · {fmtMoney(filteredAccounts.reduce((a, x) => a + x.value, 0))}</span>
            </div>
            {/* rows */}
            {state.accounts.length === 0 ? (
              <div className="rounded-sm border-2 border-dashed border-sepia-400 bg-parch-50/60 p-8 text-center">
                <MapPin className="mx-auto h-8 w-8 text-sepia-400" aria-hidden />
                <p className="mx-auto mt-3 max-w-md font-body italic text-sepia-600">
                  The manifest is empty. Add the real companies you would pursue — then tier them: T1 named pursuit, T2 clustered plays, T3 programmatic touch.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-sepia-300/50 rounded-sm border border-sepia-400/70 bg-parch-50/80 shadow-card">
                {filteredAccounts.map((a) => (
                  <li key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-3 py-2.5 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_6.5rem_auto]">
                    <div className="min-w-0">
                      <div className="truncate font-display text-sm font-semibold text-sepia-900">{a.name}</div>
                      {a.notes && <div className="truncate font-body text-xs italic text-sepia-500">{a.notes}</div>}
                    </div>
                    <select className={`${inputCls} hidden py-1 text-xs sm:block`} value={a.segmentId || ''}
                      onChange={(e) => patchAccount(a.id, { segmentId: e.target.value || null })} aria-label={`Territory for ${a.name}`}>
                      <option value="">No territory</option>
                      {state.segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <div className="col-start-1 flex overflow-hidden rounded-sm border border-sepia-400/70 sm:col-start-auto" role="group" aria-label={`Tier for ${a.name}`}>
                      {TIER_KEYS.map((t) => (
                        <button key={t} onClick={() => patchAccount(a.id, { tier: a.tier === t ? null : t })}
                          title={TIERS[t].desc}
                          className={`px-2 py-1 font-mono text-[11px] font-semibold transition-colors ${a.tier === t
                            ? t === 'T1' ? 'bg-oxide-500 text-parch-50' : t === 'T2' ? 'bg-sepia-600 text-parch-50' : 'bg-verdi-500 text-parch-50'
                            : 'bg-parch-50/70 text-sepia-500 hover:bg-parch-200'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <input type="number" min="0" step="1000" className={`${inputCls} py-1 text-right font-mono text-xs`} value={a.value}
                      onChange={(e) => patchAccount(a.id, { value: clamp(num(e.target.value), 0, 1e9) })} aria-label={`Estimated value for ${a.name}`} />
                    <IconBtn label={`Delete ${a.name}`} onClick={() => deleteAccount(a.id)} className="justify-self-end hover:text-oxide-600"><Trash2 className="h-4 w-4" aria-hidden /></IconBtn>
                  </li>
                ))}
                {filteredAccounts.length === 0 && (
                  <li className="px-4 py-6 text-center font-body text-sm italic text-sepia-500">Nothing in the manifest matches those filters.</li>
                )}
              </ul>
            )}
          </section>

          {/* coverage */}
          <section className="no-print">
            <SectionHead icon={Ruler} kicker="Coverage instruments" title="Capacity" />
            <div className="rounded-sm border border-sepia-400/70 bg-parch-50/80 p-4 shadow-card">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Reps on territory">
                  <input type="number" min="0" className={inputCls} value={state.capacity.reps} onChange={patchCapacity('reps')} />
                </Field>
                <Field label="T1 named / rep">
                  <input type="number" min="0" className={inputCls} value={state.capacity.t1PerRep} onChange={patchCapacity('t1PerRep')} />
                </Field>
                <Field label="T2 clustered / rep">
                  <input type="number" min="0" className={inputCls} value={state.capacity.t2PerRep} onChange={patchCapacity('t2PerRep')} />
                </Field>
                <Field label="T3 programmatic / rep">
                  <input type="number" min="0" className={inputCls} value={state.capacity.t3PerRep} onChange={patchCapacity('t3PerRep')} />
                </Field>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-1 border-t border-sepia-300/60 pt-4 sm:gap-2">
                {TIER_KEYS.map((t) => (
                  <CoverageGauge key={t} tier={t} assigned={tierCounts[t]} slots={slots[t]} />
                ))}
              </div>
              {tierCounts.none > 0 && (
                <p className="mt-4 rounded-sm border border-brass-400/60 bg-brass-300/15 px-3 py-2 font-body text-xs italic text-sepia-700">
                  {tierCounts.none} account{tierCounts.none === 1 ? ' is' : 's are'} adrift with no tier — untiered accounts get no coverage motion at all.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* ======================= copilot ======================= */}
        <section className="no-print mt-12">
          <SectionHead icon={Sparkles} kicker="The cartographer's copilot" title="Claude Copilot" />
          <div className="rounded-sm border-2 border-sepia-700 bg-sepia-800 p-5 shadow-deep">
            <p className="max-w-3xl font-body text-sm italic leading-relaxed text-parch-200">
              Each action below writes a complete, expedition-briefed prompt with your live chart baked in.
              Copy one, paste it into <span className="font-semibold not-italic text-brass-300">claude.ai</span> — works with the standard $20 Claude subscription, no API key, no setup.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Field label="Territory for segment-specific prompts" className="w-full sm:w-72">
                <select className={inputCls} value={copilotSeg?.id || ''} onChange={(e) => setCopilotSegId(e.target.value)} disabled={!state.segments.length}>
                  {!state.segments.length && <option value="">Chart a territory first</option>}
                  {state.segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                {
                  k: 'size', icon: Crosshair, title: 'Survey a segment',
                  desc: 'Claude sanity-checks your account count, layers TAM→SAM→SOM, and hands you 5 data sources to verify with.',
                  need: !!copilotSeg, get: () => promptSizeSegment(state, copilotSeg, consoleCtx),
                },
                {
                  k: 'tier', icon: Ruler, title: 'Tune my tiering rules',
                  desc: 'Mechanical tier criteria, a weekly motion per tier, and rebalancing moves sized to your rep capacity.',
                  need: true, get: () => promptTiering(state, consoleCtx),
                },
                {
                  k: 'vp', icon: Flag, title: 'Draft the vertical value prop',
                  desc: 'Pains in the buyer\'s vocabulary, a vertical one-liner, cold-open lines, and what NOT to say.',
                  need: !!copilotSeg, get: () => promptValueProp(state, copilotSeg, consoleCtx),
                },
              ].map((c) => (
                <div key={c.k} className="flex flex-col rounded-sm border border-sepia-600 bg-sepia-900/40 p-4">
                  <div className="flex items-center gap-2">
                    <c.icon className="h-4 w-4 text-brass-300" aria-hidden />
                    <h3 className="font-display text-base font-black text-parch-100">{c.title}</h3>
                  </div>
                  <p className="mt-1.5 flex-1 font-body text-[13px] leading-relaxed text-parch-200/80">{c.desc}</p>
                  <button
                    onClick={() => c.need && doCopy('cp-' + c.k, c.get())}
                    disabled={!c.need}
                    className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-sm border border-brass-400 bg-brass-400/10 px-3 py-2 font-display text-sm font-semibold text-brass-300 transition-colors hover:bg-brass-400/25 disabled:cursor-not-allowed disabled:opacity-40">
                    {copiedKey === 'cp-' + c.k ? (<><Check className="h-4 w-4" aria-hidden /> Copied — paste into claude.ai</>) : (<><Copy className="h-4 w-4" aria-hidden /> Copy prompt</>)}
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Field label="Field notes — paste Claude's best findings back here (saved with your chart)">
                <textarea rows={4} className={`${inputCls} border-sepia-600 bg-sepia-900/40 text-parch-100 placeholder:text-parch-200/40`}
                  value={state.copilotNotes}
                  onChange={(e) => setState((s) => ({ ...s, copilotNotes: e.target.value }))}
                  placeholder="Revised segment sizes, tier rules Claude proposed, the value prop that landed…" />
              </Field>
            </div>
          </div>
        </section>

        <footer className="no-print mt-12 border-t border-sepia-400/50 pt-4 pb-2 text-center font-body text-xs italic text-sepia-500">
          Territory Mapper · your chart never leaves this device — stored locally, exportable always ·
          <kbd className="mx-1 rounded-sm border border-sepia-400/70 bg-parch-50 px-1.5 py-0.5 font-mono not-italic">?</kbd> help ·
          <kbd className="mx-1 rounded-sm border border-sepia-400/70 bg-parch-50 px-1.5 py-0.5 font-mono not-italic">Ctrl+S</kbd> copy plan
        </footer>
      </div>

      {/* ======================= print sheet ======================= */}
      <section className="print-only px-8 py-6" aria-hidden="true">
        <h1 className="font-display text-3xl font-black">Territory Plan — {new Date().toISOString().slice(0, 10)}</h1>
        {state.business && <p className="mt-2 font-body italic">{state.business}</p>}
        {focus && (
          <p className="mt-3 font-body"><strong>Verdict:</strong> plant the flag in “{focus.name}” — {fmtMoney(segOpportunity(focus))} expected ({focusShare}% of chart).</p>
        )}
        <h2 className="mt-5 font-display text-xl font-black">Segments</h2>
        {state.segments.map((s) => (
          <p key={s.id} className="mt-1.5 font-body text-sm">
            <strong>{s.name}</strong> — {[s.vertical, s.size, s.geo].filter(Boolean).join(' · ')} · {fmtInt(s.accountsEst)} accts × {fmtMoney(s.avgDeal)} × {s.winRate}% = <strong>{fmtMoney(segOpportunity(s))}</strong>{s.notes ? ` — ${s.notes}` : ''}
          </p>
        ))}
        {TIER_KEYS.map((t) => {
          const rows = state.accounts.filter((a) => a.tier === t);
          return (
            <div key={t}>
              <h2 className="mt-5 font-display text-xl font-black">{TIERS[t].long} — {rows.length}</h2>
              {rows.map((a) => (
                <p key={a.id} className="mt-1 font-body text-sm">{a.name} — {segName(a.segmentId)} · {fmtMoney(a.value)}{a.notes ? ` — ${a.notes}` : ''}</p>
              ))}
            </div>
          );
        })}
        <h2 className="mt-5 font-display text-xl font-black">Coverage</h2>
        <p className="mt-1 font-body text-sm">
          {state.capacity.reps} reps · T1 {tierCounts.T1}/{slots.T1} · T2 {tierCounts.T2}/{slots.T2} · T3 {tierCounts.T3}/{slots.T3}
        </p>
      </section>

      {/* ======================= guide modal ======================= */}
      {showGuide && (
        <Modal title="How to use Territory Mapper" onClose={closeGuide} wide>
          <ol className="list-decimal space-y-2.5 pl-5 font-body text-sm leading-relaxed text-sepia-800 marker:font-mono marker:text-oxide-600">
            <li><strong className="font-display">Describe the expedition.</strong> In the panel beside the chart, write what you sell and who sells it — every Copilot prompt uses it.</li>
            <li><strong className="font-display">Chart your territories.</strong> A segment is vertical × size × geography. Estimate addressable accounts, average deal, and win rate — the map computes expected opportunity and draws each segment as an island sized by it.</li>
            <li><strong className="font-display">Read the Surveyor's verdict.</strong> The flagged island is your biggest expected opportunity. Click any island to highlight its card below.</li>
            <li><strong className="font-display">Fill the Account Ledger.</strong> Add real company names, assign each to a territory, and tier them: <strong>T1</strong> named (1:1 pursuit), <strong>T2</strong> clustered (grouped plays), <strong>T3</strong> programmatic (automated touch).</li>
            <li><strong className="font-display">Check the Coverage instruments.</strong> Set reps and per-rep loads; the dials show tier load vs capacity. A needle past the red tick means cut or demote.</li>
            <li><strong className="font-display">Run the Copilot.</strong> Copy a prompt — segment survey, tiering rules, or vertical value prop — and paste it into claude.ai (standard $20 subscription, no API key). Paste the best findings back into Field notes.</li>
            <li><strong className="font-display">Export the plan.</strong> Copy it as Markdown, download JSON or the accounts CSV, print the plan sheet, or re-import a JSON later.</li>
          </ol>
          <div className="mt-4 border-t border-sepia-300/60 pt-3">
            <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-sepia-500">Keyboard</h4>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 font-body text-sm text-sepia-700 sm:grid-cols-3">
              {[['?', 'Open this guide'], ['Esc', 'Close dialogs & menus'], ['Ctrl/Cmd+S', 'Copy plan as Markdown'], ['Enter', 'Add account (in name field)']].map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <kbd className="rounded-sm border border-sepia-400/70 bg-parch-50 px-1.5 py-0.5 font-mono text-xs">{k}</kbd>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <BtnGhost onClick={() => { loadDemo(); closeGuide(); }}><Ship className="h-4 w-4" aria-hidden /> Load the demo</BtnGhost>
            <BtnPrimary onClick={closeGuide}><Check className="h-4 w-4" aria-hidden /> To the chart</BtnPrimary>
          </div>
        </Modal>
      )}

      <Toast toast={toast} onUndo={() => { toast?.undo?.(); dismissToast(); }} onDismiss={dismissToast} />
    </main>
  );
}
