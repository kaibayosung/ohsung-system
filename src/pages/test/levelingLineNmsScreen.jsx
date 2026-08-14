// src/pages/test/levelingLineNmsScreen.jsx
// 레벨링 라인 통합 관제(NMS) — "지금 레벨링 라인이 뭘 하고 있는가"를 관제센터 스타일 한 화면으로.
//
// 기존 leveling_stroke_overview / leveling_stroke_detail 화면(탭 전환형)과 달리, 이 화면은
// ERP 작업지시서(leveling_coil_id 모드)까지 세 API를 한 코일에 대해 동시에 엮어
// "지금 이 코일이 어느 거래처 작업이고, 몇 %까지 왔고, 설비는 정상 속도로 도는가"를 하나의 뷰로 보여줍니다.
// 20초 간격 자동 폴링으로 라이브 갱신되며, 금일 가동 이력이 없으면 최근 가동일로 자동 롤백해
// "비가동 상태"임을 명확히 보여줍니다(관제 화면에서 데이터가 없는 것도 하나의 상태입니다).
//
// 화이트·볼드·고밀도 시각화 버전 — 승인된 기획 시안(흰 배경 + 큰 볼드 폰트 + 게이지/도넛/막대/스파크라인)을 반영.
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { supabaseUrl } from '../../supabaseClient';

const W = {
  bg: '#ffffff',
  panel: '#ffffff',
  panel2: '#f8fafc',
  border: '#e2e8f0',
  borderSoft: '#eef2f7',
  text: '#0f172a',
  textDim: '#64748b',
  textFaint: '#94a3b8',
  cyan: '#0ea5b7',
  green: '#16a34a',
  amber: '#d97706',
  red: '#dc2626',
  purple: '#7c3aed',
  sans: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

function todayKST() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
}
function shiftDate(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function fmtHM(ts) {
  if (!ts) return '-';
  const d = new Date(new Date(ts).getTime() + 9 * 3600000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}
function nowKstClock() {
  const d = new Date(new Date().getTime() + 9 * 3600000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')}`;
}
function num(v, digits = 1) {
  if (v === null || v === undefined || v === '') return '-';
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('ko-KR', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
function secsAgo(ts, nowMs) {
  if (!ts) return null;
  const t = new Date(ts).getTime();
  return Math.max(0, Math.round((nowMs - t) / 1000));
}
function gaugePoint(cx, cy, r, pct) {
  const theta = Math.PI - (Math.max(0, Math.min(100, pct)) / 100) * Math.PI;
  return { x: cx + r * Math.cos(theta), y: cy - r * Math.sin(theta) };
}

const STATUS_META = {
  가동중: { color: W.green, bg: '#dcfce7', label: '가동중' },
  완료: { color: W.cyan, bg: '#ecfeff', label: '완료' },
  준비: { color: W.amber, bg: '#fef3c7', label: '준비' },
};

function Ring({ pct, size = 168, stroke = 15, color = W.green, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={W.borderSoft} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (p / 100) * c}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}

function Donut({ pct, size = 130, stroke = 15, color = W.cyan, centerLabel }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={W.borderSoft} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (p / 100) * c} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '26px', fontWeight: 900, color: W.text }}>{centerLabel ?? (pct == null ? '-' : `${pct}%`)}</div>
      </div>
    </div>
  );
}

function MultiDonut({ segments, size = 130, stroke = 15 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.v, 0) || 1;
  const withOffsets = segments.reduce((acc, s) => {
    const len = (s.v / total) * c;
    const prevOffset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].len : 0;
    acc.push({ ...s, len, offset: prevOffset });
    return acc;
  }, []);
  return (
    <div style={{ width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={W.borderSoft} strokeWidth={stroke} />
        {withOffsets.map((s) => (
          <circle key={s.key} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke}
            strokeDasharray={`${s.len} ${c - s.len}`} strokeDashoffset={-s.offset} />
        ))}
      </svg>
    </div>
  );
}

function Gauge({ pct, size = 220, color = W.purple }) {
  const cx = size / 2;
  const cy = size * 0.56;
  const r = size * 0.4;
  const p = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  const start = gaugePoint(cx, cy, r, 0);
  const end = gaugePoint(cx, cy, r, p);
  const trackPath = `M${cx - r},${cy} A${r},${r} 0 0,1 ${cx + r},${cy}`;
  const valuePath = `M${start.x},${start.y} A${r},${r} 0 0,1 ${end.x},${end.y}`;
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: size }}>
      <svg width="100%" viewBox={`0 0 ${size} ${cy + 14}`}>
        <path d={trackPath} fill="none" stroke={W.borderSoft} strokeWidth={size * 0.08} strokeLinecap="round" />
        {p > 0 && <path d={valuePath} fill="none" stroke={color} strokeWidth={size * 0.08} strokeLinecap="round" />}
        <text x={cx} y={cy - size * 0.06} textAnchor="middle" fontSize={size * 0.17} fontWeight="900" fill={W.text}>{pct == null ? '-' : `${num(pct, 1)}%`}</text>
      </svg>
    </div>
  );
}

function Sparkline({ data, color = W.cyan, height = 26 }) {
  if (!data || data.length < 2) return <div style={{ height }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${22 - ((v - min) / range) * 20}`).join(' ');
  return (
    <svg width="100%" height={height} viewBox="0 0 100 24" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Panel({ title, right, children, style }) {
  return (
    <div style={{ background: W.panel, border: `2px solid ${W.border}`, borderRadius: '16px', padding: '18px 20px', ...style }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '0.05em', color: W.textDim, textTransform: 'uppercase' }}>{title}</div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

function Stat({ label, value, unit, color = W.text, size = '20px' }) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 800, color: W.textFaint, letterSpacing: '0.03em', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: size, fontWeight: 900, color, lineHeight: 1.2, wordBreak: 'keep-all' }}>
        {value}<span style={{ fontSize: '13px', fontWeight: 800, marginLeft: '3px', color: W.textDim }}>{unit}</span>
      </div>
    </div>
  );
}

function AlertBar({ tone, text }) {
  const map = {
    red: { bg: '#fef2f2', border: '#fecaca', color: W.red, icon: '⛔' },
    amber: { bg: '#fffbeb', border: '#fde68a', color: W.amber, icon: '⚠️' },
    cyan: { bg: '#ecfeff', border: '#a5f3fc', color: W.cyan, icon: 'ℹ️' },
  };
  const m = map[tone];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px', background: m.bg, border: `2px solid ${m.border}`,
      borderRadius: '12px', padding: '12px 18px', fontSize: '14px', fontWeight: 800, color: m.color,
    }}>
      <span>{m.icon}</span><span>{text}</span>
    </div>
  );
}

function ChartTip({ active, payload, label, suffix = '' }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: '#0f172a', color: '#fff', borderRadius: '6px', padding: '7px 11px', fontSize: '12px', fontWeight: 800 }}>
      <div style={{ opacity: 0.65, marginBottom: '2px' }}>{label}</div>
      {payload.map((p) => <div key={p.dataKey} style={{ color: p.stroke }}>{p.name}: {p.value}{suffix}</div>)}
    </div>
  );
}

export function LevelingLineNmsScreen() {
  const [baseDate, setBaseDate] = useState(todayKST());
  const [effectiveDate, setEffectiveDate] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState(null);

  const [selectedCoil, setSelectedCoil] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);
  const [detail, setDetail] = useState(null);
  const [erp, setErp] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [refreshTick, setRefreshTick] = useState(0);
  const [lastFetchAt, setLastFetchAt] = useState(null);
  const [clock, setClock] = useState(nowKstClock());
  const userPickedRef = useRef(false);

  // 시계 — 1초마다 갱신 (관제 화면 느낌)
  useEffect(() => {
    const id = setInterval(() => setClock(nowKstClock()), 1000);
    return () => clearInterval(id);
  }, []);

  // 자동 폴링 — 20초마다 재조회 (선택은 유지)
  useEffect(() => {
    const id = setInterval(() => setRefreshTick((t) => t + 1), 20000);
    return () => clearInterval(id);
  }, []);

  // 금일(또는 지정일) 기준 코일·박스 현황 — 데이터가 없으면 최근 가동일까지 최대 14일 롤백
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingOverview(true);
      setOverviewError(null);
      try {
        let d = baseDate;
        let json = null;
        for (let i = 0; i < 14; i++) {
          const res = await fetch(`${supabaseUrl}/functions/v1/leveler-explore?leveling_stroke_overview=${d}`);
          const j = await res.json();
          if (!j.ok) throw new Error(j.error || '현황을 불러오지 못했습니다.');
          if (j.total_coil_count > 0) { json = j; break; }
          d = shiftDate(d, -1);
        }
        if (cancelled) return;
        if (!json) {
          setOverview({ ok: true, boxes: [], total_coil_count: 0 });
          setEffectiveDate(baseDate);
          setLoadingOverview(false);
          return;
        }
        setOverview(json);
        setEffectiveDate(d);
        setLastFetchAt(Date.now());
        if (!userPickedRef.current || !json.boxes.some((b) => b.coil_id === selectedCoil && String(b.box_idx) === String(selectedBox))) {
          const active = json.boxes.find((b) => b.status === '가동중')
            || [...json.boxes].sort((a, b) => new Date(b.last_ts) - new Date(a.last_ts))[0]
            || json.boxes[0];
          if (active) { setSelectedCoil(active.coil_id); setSelectedBox(active.box_idx); }
        }
      } catch (e) {
        if (!cancelled) setOverviewError(e.message || String(e));
      }
      if (!cancelled) setLoadingOverview(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseDate, refreshTick]);

  // 선택된 코일·박스의 실시간 PLC 상세 + ERP 작업지시서
  useEffect(() => {
    if (!selectedCoil || !effectiveDate) { setDetail(null); setErp(null); return; }
    let cancelled = false;
    (async () => {
      setLoadingDetail(true);
      try {
        const boxParam = selectedBox != null ? `&box_idx=${encodeURIComponent(selectedBox)}` : '';
        const [detailRes, erpRes] = await Promise.all([
          fetch(`${supabaseUrl}/functions/v1/leveler-explore?leveling_stroke_detail=${encodeURIComponent(selectedCoil)}&leveling_work_date=${effectiveDate}${boxParam}`),
          fetch(`${supabaseUrl}/functions/v1/leveler-explore?leveling_coil_id=${encodeURIComponent(selectedCoil)}&leveling_work_date=${effectiveDate}`),
        ]);
        const [detailJson, erpJson] = await Promise.all([detailRes.json(), erpRes.json()]);
        if (cancelled) return;
        if (detailJson.ok) setDetail(detailJson);
        if (erpJson.erp) setErp(erpJson.erp);
      } catch {
        // 조용히 실패 — 관제 화면은 부분 데이터라도 계속 표시
      }
      if (!cancelled) setLoadingDetail(false);
    })();
    return () => { cancelled = true; };
  }, [selectedCoil, selectedBox, effectiveDate, refreshTick]);

  const kpi = overview?.kpi;
  const isHistorical = effectiveDate && effectiveDate !== todayKST();
  const nowMs = useMemo(() => new Date(new Date().getTime() + 9 * 3600000).getTime(), [clock]);
  const dataAgeSec = kpi?.last_ts ? secsAgo(new Date(kpi.last_ts).getTime() + 9 * 3600000, nowMs) : null;

  const selectedBoxMeta = useMemo(() => (overview?.boxes || []).find((b) => b.coil_id === selectedCoil && String(b.box_idx) === String(selectedBox)), [overview, selectedCoil, selectedBox]);

  const lineStatus = useMemo(() => {
    if (!overview || overview.total_coil_count === 0) return { key: 'offline', label: '비가동 · 데이터 없음', color: W.textFaint };
    const anyRunning = (overview.boxes || []).some((b) => b.status === '가동중');
    if (anyRunning) return { key: 'run', label: '가동중', color: W.green };
    return { key: 'idle', label: '대기', color: W.amber };
  }, [overview]);

  const statusCounts = useMemo(() => {
    const c = { 가동중: 0, 완료: 0, 준비: 0 };
    (overview?.boxes || []).forEach((b) => { if (c[b.status] != null) c[b.status] += 1; });
    return c;
  }, [overview]);

  const latestSample = useMemo(() => {
    if (!detail?.raw_log?.length) return null;
    return detail.raw_log[detail.raw_log.length - 1];
  }, [detail]);

  const latestStroke = useMemo(() => {
    if (!detail?.strokes?.length) return null;
    return detail.strokes[detail.strokes.length - 1];
  }, [detail]);

  const waveform = useMemo(() => {
    if (!detail?.raw_log) return [];
    return detail.raw_log.map((r) => ({
      t: fmtHM(r.TIMESTAMP).slice(0, 8),
      pos_pct: r.CUTLENSET && Number(r.CUTLENSET) > 0 ? Math.round((Number(r.POS) / Number(r.CUTLENSET)) * 1000) / 10 : null,
      inv_pct: r.INVERTERSPEEDPER != null ? Number(r.INVERTERSPEEDPER) : null,
    }));
  }, [detail]);

  const strokeBars = useMemo(() => (detail?.strokes || []).slice(-14).map((s, i) => ({ idx: i + 1, cycletm: Number(s.cycletm), anomaly: s.is_anomaly })), [detail]);
  const cycletmSeries = useMemo(() => (detail?.strokes || []).slice(-20).map((s) => Number(s.cycletm)), [detail]);
  const invSeries = useMemo(() => (detail?.raw_log || []).slice(-20).map((r) => Number(r.INVERTERSPEEDPER || 0)), [detail]);

  const alerts = useMemo(() => {
    const list = [];
    if (isHistorical) list.push({ tone: 'amber', text: `금일(${todayKST()}) 가동 이력이 없어 최근 가동일(${effectiveDate}) 데이터를 표시 중입니다.` });
    if (dataAgeSec != null && dataAgeSec > 300 && !isHistorical) list.push({ tone: 'amber', text: `최근 PLC 수신 후 ${Math.round(dataAgeSec / 60)}분 경과 — 라인이 정지했거나 통신이 지연되고 있을 수 있습니다.` });
    if (detail?.stats && latestStroke && detail.stats.mean_cycletm != null && detail.stats.stddev_cycletm != null) {
      const threshold = detail.stats.mean_cycletm + detail.stats.stddev_cycletm;
      if (Number(latestStroke.cycletm) > threshold) list.push({ tone: 'red', text: `최근 행정 소요시간 ${num(latestStroke.cycletm, 1)}초 — 평균(${num(detail.stats.mean_cycletm, 1)}초)+표준편차를 초과했습니다.` });
    }
    if (detail?.stats?.slow_pct != null && detail.stats.slow_pct >= 40) list.push({ tone: 'amber', text: `저속(인버터 1~5%) 구간 비율 ${num(detail.stats.slow_pct, 0)}% — 평소보다 저속 전환이 잦습니다.` });
    return list;
  }, [isHistorical, effectiveDate, dataAgeSec, detail, latestStroke]);

  return (
    <div style={{ background: W.bg, margin: '-24px', padding: '26px 30px 50px', borderRadius: '18px', fontFamily: W.sans, color: W.text, minHeight: '640px' }}>
      <style>{`
        @keyframes nmsPulse { 0% { box-shadow: 0 0 0 0 rgba(22,163,74,0.5); } 70% { box-shadow: 0 0 0 9px rgba(22,163,74,0); } 100% { box-shadow: 0 0 0 0 rgba(22,163,74,0); } }
        @keyframes nmsPulseAmber { 0% { box-shadow: 0 0 0 0 rgba(217,119,6,0.5); } 70% { box-shadow: 0 0 0 9px rgba(217,119,6,0); } 100% { box-shadow: 0 0 0 0 rgba(217,119,6,0); } }
      `}</style>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '22px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '12px', height: '12px', borderRadius: '50%', background: lineStatus.color,
              animation: lineStatus.key === 'run' ? 'nmsPulse 1.6s infinite' : lineStatus.key === 'idle' ? 'nmsPulseAmber 1.6s infinite' : 'none',
            }} />
            <h1 style={{ fontSize: '26px', fontWeight: 900, margin: 0, letterSpacing: '-0.01em' }}>레벨링 라인 통합 관제</h1>
            <span style={{ fontSize: '12px', fontWeight: 900, color: '#fff', background: W.text, borderRadius: '999px', padding: '3px 11px' }}>NMS</span>
          </div>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: W.textDim, marginTop: '5px' }}>
            ERP 작업지시서 × LEVELING_DATA 실측 텔레메트리 실시간 통합 · 20초 자동 갱신
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '26px', fontWeight: 900, color: W.cyan, letterSpacing: '0.01em' }}>{clock}</div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: W.textFaint }}>
              KST · {effectiveDate || baseDate}
              {lastFetchAt && <> · 갱신 {Math.max(0, Math.round((Date.now() - lastFetchAt) / 1000))}초 전</>}
            </div>
          </div>
          <input
            type="date" value={baseDate} max={todayKST()}
            onChange={(e) => { userPickedRef.current = false; setBaseDate(e.target.value); }}
            style={{ background: W.panel2, border: `2px solid ${W.border}`, borderRadius: '10px', padding: '8px 12px', color: W.text, fontSize: '13.5px', fontWeight: 800 }}
          />
        </div>
      </div>

      {loadingOverview && !overview ? (
        <div style={{ color: W.textDim, fontSize: '15px', fontWeight: 800, padding: '40px 0', textAlign: 'center' }}>관제 데이터 불러오는 중...</div>
      ) : overviewError ? (
        <AlertBar tone="red" text={overviewError} />
      ) : (
        <>
          {alerts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
              {alerts.map((a, i) => <AlertBar key={i} {...a} />)}
            </div>
          )}

          {!selectedCoil ? (
            <Panel><div style={{ color: W.textDim, fontSize: '14px', fontWeight: 800, textAlign: 'center', padding: '20px 0' }}>표시할 코일이 없습니다.</div></Panel>
          ) : (
            <>
              {/* 히어로: 라인상태 / ERP작업 / 라이브 지표(게이지) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(300px, 1.2fr) minmax(280px, 1fr)', gap: '14px', marginBottom: '14px' }}>
                <Panel title="라인 상태" right={<span style={{ fontSize: '12px', fontWeight: 800, color: W.textFaint }}>{selectedCoil} · 박스{selectedBox}</span>}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                    <Ring pct={selectedBoxMeta?.progress_pct} color={STATUS_META[selectedBoxMeta?.status]?.color || W.textFaint}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '28px', fontWeight: 900 }}>{selectedBoxMeta?.progress_pct != null ? `${selectedBoxMeta.progress_pct}%` : '-'}</div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: W.textFaint }}>진행률</div>
                      </div>
                    </Ring>
                    <div>
                      <div style={{
                        display: 'inline-block', fontSize: '14px', fontWeight: 900, padding: '5px 14px', borderRadius: '999px',
                        color: STATUS_META[selectedBoxMeta?.status]?.color || W.textFaint,
                        background: STATUS_META[selectedBoxMeta?.status]?.bg || '#f1f5f9',
                        marginBottom: '12px',
                      }}>{STATUS_META[selectedBoxMeta?.status]?.label || selectedBoxMeta?.status || '-'}</div>
                      <Stat label="위치 / 절단설정" value={`${num(selectedBoxMeta?.pos, 0)} / ${num(selectedBoxMeta?.cutlenset, 0)}`} unit="mm" />
                      <div style={{ height: '10px' }} />
                      <Stat label="최근 수신" value={selectedBoxMeta?.last_ts ? fmtHM(selectedBoxMeta.last_ts) : '-'} unit="" />
                    </div>
                  </div>
                </Panel>

                <Panel title="ERP 작업지시서" right={erp?.status && (
                  <span style={{ fontSize: '12px', fontWeight: 900, color: erp.status === '완료' ? W.cyan : W.amber, background: erp.status === '완료' ? '#ecfeff' : '#fef3c7', padding: '3px 10px', borderRadius: '999px' }}>{erp.status}</span>
                )}>
                  {erp ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>
                      <Stat label="거래처" value={erp.company_name || '-'} />
                      <Stat label="공정" value={erp.work_type || '-'} />
                      <Stat label="사양" value={erp.specification || '-'} size="17px" />
                      <Stat label="시작시각" value={erp.started_at ? fmtHM(erp.started_at) : '-'} />
                      <Stat label="발주중량" value={num(erp.original_weight, 0)} unit="kg" />
                      <Stat label="투입중량" value={num(erp.used_weight, 0)} unit="kg" />
                    </div>
                  ) : (
                    <div style={{ color: W.textFaint, fontSize: '13.5px', fontWeight: 700 }}>ERP 작업지시서 조회 중...</div>
                  )}
                </Panel>

                <Panel title="라이브 지표 — 인버터 속도">
                  <Gauge pct={latestSample?.inv_pct ?? Number(latestSample?.INVERTERSPEEDPER)} color={W.purple} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                    <Stat label="최근 사이클" value={num(latestStroke?.cycletm, 1)} unit="초" color={latestStroke?.anomaly ? W.red : W.green} />
                    <Stat label="평균 사이클" value={num(detail?.stats?.mean_cycletm, 1)} unit="초" />
                  </div>
                </Panel>
              </div>

              {/* 파형 + 도넛 2개 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <Panel title="실시간 파형 — 위치 % / 인버터속도 %"
                  right={loadingDetail && <span style={{ fontSize: '11.5px', fontWeight: 800, color: W.textFaint }}>갱신 중...</span>}>
                  <div style={{ width: '100%', height: 190 }}>
                    <ResponsiveContainer>
                      <LineChart data={waveform} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke={W.borderSoft} vertical={false} />
                        <XAxis dataKey="t" tick={{ fontSize: 10, fill: W.textFaint, fontWeight: 700 }} interval="preserveStartEnd" minTickGap={30} />
                        <YAxis tick={{ fontSize: 11, fill: W.textFaint, fontWeight: 700 }} domain={[0, 100]} />
                        <Tooltip content={<ChartTip suffix="%" />} />
                        <Line type="monotone" dataKey="pos_pct" name="위치%" stroke={W.cyan} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                        <Line type="monotone" dataKey="inv_pct" name="인버터%" stroke={W.purple} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>

                <Panel title="금일 가동률">
                  <Donut pct={kpi?.utilization_pct} color={W.cyan} />
                </Panel>

                <Panel title="코일·박스 상태 분포">
                  <MultiDonut segments={[
                    { key: '가동중', v: statusCounts.가동중, color: STATUS_META.가동중.color },
                    { key: '완료', v: statusCounts.완료, color: STATUS_META.완료.color },
                    { key: '준비', v: statusCounts.준비, color: STATUS_META.준비.color },
                  ]} />
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 900, color: STATUS_META.가동중.color }}>● 가동중 {statusCounts.가동중}</span>
                    <span style={{ fontSize: '11.5px', fontWeight: 900, color: STATUS_META.완료.color }}>● 완료 {statusCounts.완료}</span>
                    <span style={{ fontSize: '11.5px', fontWeight: 900, color: STATUS_META.준비.color }}>● 준비 {statusCounts.준비}</span>
                  </div>
                </Panel>
              </div>

              {/* 행정 소요시간 막대 + 타임라인 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '14px', marginBottom: '14px' }}>
                <Panel title="최근 행정별 소요시간">
                  <div style={{ width: '100%', height: 130 }}>
                    <svg width="100%" height="100%" viewBox="0 0 280 110" preserveAspectRatio="none">
                      {strokeBars.map((s, i) => {
                        const maxV = Math.max(1, ...strokeBars.map((x) => x.cycletm));
                        const h = Math.max(4, (s.cycletm / maxV) * 90);
                        return <rect key={i} x={i * 20} y={100 - h} width={14} height={h} rx={2} fill={s.anomaly ? W.red : W.cyan} />;
                      })}
                    </svg>
                  </div>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: W.textFaint, marginTop: '4px' }}>파랑: 정상 · 빨강: 평균+표준편차 초과(이상 행정) · 총 {num(detail?.spec?.stroke_count, 0)}행정</div>
                </Panel>

                <Panel title={`금일 코일·박스 타임라인 (${overview.total_coil_count}건, 가동 ${overview.active_coil_count}건)`}>
                  <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {(overview.boxes || []).map((b) => {
                      const active = b.coil_id === selectedCoil && String(b.box_idx) === String(selectedBox);
                      const meta = STATUS_META[b.status] || { color: W.textFaint, bg: '#f1f5f9', label: b.status };
                      return (
                        <div
                          key={`${b.coil_id}-${b.box_idx}`}
                          onClick={() => { userPickedRef.current = true; setSelectedCoil(b.coil_id); setSelectedBox(b.box_idx); }}
                          style={{
                            minWidth: '172px', cursor: 'pointer', borderRadius: '12px', padding: '11px 14px',
                            background: active ? '#ecfeff' : meta.bg,
                            border: `2px solid ${active ? W.cyan : 'transparent'}`,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 900 }}>{b.coil_id}</span>
                            <span style={{ fontSize: '10.5px', fontWeight: 900, color: meta.color }}>{meta.label}</span>
                          </div>
                          <div style={{ fontSize: '11.5px', fontWeight: 700, color: W.textDim, marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.company_name} · 박스{b.box_idx}</div>
                          <div style={{ height: '6px', background: '#fff', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${b.progress_pct ?? 0}%`, height: '100%', background: meta.color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              </div>

              {/* KPI 스트립 + 스파크라인 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
                <Panel>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: W.textFaint }}>사이클 변동계수</div>
                  <div style={{ fontSize: '36px', fontWeight: 900, margin: '4px 0', color: kpi?.cv_pct >= 30 ? W.amber : W.text }}>{num(kpi?.cv_pct, 1)}<span style={{ fontSize: '15px', color: W.textDim }}>%</span></div>
                  <Sparkline data={cycletmSeries} color={W.amber} />
                  <div style={{ fontSize: '10px', fontWeight: 700, color: W.textFaint, marginTop: '2px' }}>최근 20행정 사이클타임</div>
                </Panel>
                <Panel>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: W.textFaint }}>저속 구간 비율</div>
                  <div style={{ fontSize: '36px', fontWeight: 900, margin: '4px 0', color: detail?.stats?.slow_pct >= 40 ? W.red : W.text }}>{num(detail?.stats?.slow_pct, 0)}<span style={{ fontSize: '15px', color: W.textDim }}>%</span></div>
                  <Sparkline data={invSeries} color={W.red} />
                  <div style={{ fontSize: '10px', fontWeight: 700, color: W.textFaint, marginTop: '2px' }}>최근 인버터속도%</div>
                </Panel>
                <Panel>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: W.textFaint }}>이론 시간당 행정</div>
                  <div style={{ fontSize: '36px', fontWeight: 900, margin: '4px 0', color: W.cyan }}>{num(detail?.stats?.theoretical_per_hour, 0)}<span style={{ fontSize: '15px', color: W.textDim }}>회</span></div>
                  <Sparkline data={cycletmSeries} color={W.cyan} />
                  <div style={{ fontSize: '10px', fontWeight: 700, color: W.textFaint, marginTop: '2px' }}>최근 20행정 사이클타임</div>
                </Panel>
                <Panel>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: W.textFaint }}>금일 누적 행정</div>
                  <div style={{ fontSize: '36px', fontWeight: 900, margin: '4px 0', color: W.green }}>{num(kpi?.stroke_rows, 0)}<span style={{ fontSize: '15px', color: W.textDim }}>회</span></div>
                  <Sparkline data={invSeries} color={W.green} />
                  <div style={{ fontSize: '10px', fontWeight: 700, color: W.textFaint, marginTop: '2px' }}>최근 인버터속도%</div>
                </Panel>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
