// src/pages/test/levelingLineNmsScreen.jsx
// 레벨링 라인 통합 관제(NMS) — "지금 레벨링 라인이 뭘 하고 있는가"를 관제센터 스타일 한 화면으로.
//
// 기존 leveling_stroke_overview / leveling_stroke_detail 화면(탭 전환형)과 달리, 이 화면은
// ERP 작업지시서(leveling_coil_id 모드)까지 세 API를 한 코일에 대해 동시에 엮어
// "지금 이 코일이 어느 거래처 작업이고, 몇 %까지 왔고, 설비는 정상 속도로 도는가"를 하나의 뷰로 보여줍니다.
// 20초 간격 자동 폴링으로 라이브 갱신되며, 금일 가동 이력이 없으면 최근 가동일로 자동 롤백해
// "비가동 상태"임을 명확히 보여줍니다(관제 화면에서 데이터가 없는 것도 하나의 상태입니다).
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { supabaseUrl } from '../../supabaseClient';

const D = {
  bg: '#070b13',
  panel: '#0d1420',
  panel2: '#101927',
  border: '#1c2740',
  borderSoft: '#151f33',
  text: '#e8edf7',
  textDim: '#8b95ac',
  textFaint: '#5a6480',
  cyan: '#39d6e8',
  green: '#3ee08a',
  amber: '#f5b342',
  red: '#f2596a',
  purple: '#a78bfa',
  mono: "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace",
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

const STATUS_META = {
  가동중: { color: D.green, glow: 'rgba(62,224,138,0.45)', label: '가동중' },
  완료: { color: D.cyan, glow: 'rgba(57,214,232,0.35)', label: '완료' },
  준비: { color: D.amber, glow: 'rgba(245,179,66,0.35)', label: '준비' },
};

function Ring({ pct, size = 168, stroke = 13, color = D.green, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={D.borderSoft} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (p / 100) * c}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease', filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}

function Panel({ title, right, children, style }) {
  return (
    <div style={{ background: D.panel, border: `1px solid ${D.border}`, borderRadius: '14px', padding: '18px 20px', ...style }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.06em', color: D.textDim, textTransform: 'uppercase' }}>{title}</div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

function Stat({ label, value, unit, color = D.text, size = '26px' }) {
  return (
    <div>
      <div style={{ fontSize: '10.5px', fontWeight: 700, color: D.textFaint, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontFamily: D.mono, fontSize: size, fontWeight: 700, color }}>
        {value}<span style={{ fontSize: '12px', fontWeight: 600, marginLeft: '3px', color: D.textDim }}>{unit}</span>
      </div>
    </div>
  );
}

function AlertBar({ tone, text }) {
  const map = {
    red: { bg: 'rgba(242,89,106,0.1)', border: 'rgba(242,89,106,0.4)', color: D.red, icon: '⛔' },
    amber: { bg: 'rgba(245,179,66,0.1)', border: 'rgba(245,179,66,0.4)', color: D.amber, icon: '⚠️' },
    cyan: { bg: 'rgba(57,214,232,0.08)', border: 'rgba(57,214,232,0.3)', color: D.cyan, icon: 'ℹ️' },
  };
  const m = map[tone];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px', background: m.bg, border: `1px solid ${m.border}`,
      borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, color: m.color,
    }}>
      <span>{m.icon}</span><span>{text}</span>
    </div>
  );
}

function ChartTip({ active, payload, label, suffix = '' }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: '#000', color: '#fff', border: `1px solid ${D.border}`, borderRadius: '4px', padding: '6px 10px', fontSize: '11.5px', fontFamily: D.mono }}>
      <div style={{ opacity: 0.6, marginBottom: '2px' }}>{label}</div>
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
    if (!overview || overview.total_coil_count === 0) return { key: 'offline', label: '비가동 · 데이터 없음', color: D.textFaint };
    const anyRunning = (overview.boxes || []).some((b) => b.status === '가동중');
    if (anyRunning) return { key: 'run', label: '가동중', color: D.green };
    return { key: 'idle', label: '대기', color: D.amber };
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
    <div style={{ background: D.bg, margin: '-24px', padding: '26px 30px 50px', borderRadius: '18px', fontFamily: D.sans, color: D.text, minHeight: '640px' }}>
      <style>{`
        @keyframes nmsPulse { 0% { box-shadow: 0 0 0 0 rgba(62,224,138,0.55); } 70% { box-shadow: 0 0 0 8px rgba(62,224,138,0); } 100% { box-shadow: 0 0 0 0 rgba(62,224,138,0); } }
        @keyframes nmsPulseAmber { 0% { box-shadow: 0 0 0 0 rgba(245,179,66,0.55); } 70% { box-shadow: 0 0 0 8px rgba(245,179,66,0); } 100% { box-shadow: 0 0 0 0 rgba(245,179,66,0); } }
      `}</style>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '10px', height: '10px', borderRadius: '50%', background: lineStatus.color,
              animation: lineStatus.key === 'run' ? 'nmsPulse 1.6s infinite' : lineStatus.key === 'idle' ? 'nmsPulseAmber 1.6s infinite' : 'none',
            }} />
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '0.01em' }}>레벨링 라인 통합 관제</h1>
            <span style={{ fontSize: '11px', fontWeight: 800, color: D.textFaint, border: `1px solid ${D.border}`, borderRadius: '999px', padding: '2px 9px' }}>NMS</span>
          </div>
          <div style={{ fontSize: '12.5px', color: D.textDim, marginTop: '4px' }}>
            ERP 작업지시서 × LEVELING_DATA 실측 텔레메트리 실시간 통합 · 20초 자동 갱신
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: D.mono, fontSize: '22px', fontWeight: 700, color: D.cyan, letterSpacing: '0.03em' }}>{clock}</div>
            <div style={{ fontSize: '10.5px', color: D.textFaint }}>
              KST · {effectiveDate || baseDate}
              {lastFetchAt && <> · 갱신 {Math.max(0, Math.round((Date.now() - lastFetchAt) / 1000))}초 전</>}
            </div>
          </div>
          <input
            type="date" value={baseDate} max={todayKST()}
            onChange={(e) => { userPickedRef.current = false; setBaseDate(e.target.value); }}
            style={{ background: D.panel2, border: `1px solid ${D.border}`, borderRadius: '8px', padding: '7px 10px', color: D.text, fontSize: '12.5px', fontWeight: 700, colorScheme: 'dark' }}
          />
        </div>
      </div>

      {loadingOverview && !overview ? (
        <div style={{ color: D.textDim, fontSize: '14px', padding: '40px 0', textAlign: 'center' }}>관제 데이터 불러오는 중...</div>
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
            <Panel><div style={{ color: D.textDim, fontSize: '13.5px', textAlign: 'center', padding: '20px 0' }}>표시할 코일이 없습니다.</div></Panel>
          ) : (
            <>
              {/* 히어로: 라인상태 / ERP작업 / 라이브 지표 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(260px, 1.2fr) minmax(260px, 1fr)', gap: '14px', marginBottom: '14px' }}>
                <Panel title="라인 상태" right={<span style={{ fontSize: '10.5px', color: D.textFaint, fontFamily: D.mono }}>{selectedCoil} · 박스{selectedBox}</span>}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                    <Ring pct={selectedBoxMeta?.progress_pct} color={STATUS_META[selectedBoxMeta?.status]?.color || D.textFaint}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: D.mono, fontSize: '26px', fontWeight: 800 }}>{selectedBoxMeta?.progress_pct != null ? `${selectedBoxMeta.progress_pct}%` : '-'}</div>
                        <div style={{ fontSize: '10px', color: D.textFaint }}>진행률</div>
                      </div>
                    </Ring>
                    <div>
                      <div style={{
                        display: 'inline-block', fontSize: '13px', fontWeight: 800, padding: '4px 12px', borderRadius: '999px',
                        color: STATUS_META[selectedBoxMeta?.status]?.color || D.textFaint,
                        background: STATUS_META[selectedBoxMeta?.status]?.glow || 'rgba(139,149,172,0.12)',
                        marginBottom: '10px',
                      }}>{STATUS_META[selectedBoxMeta?.status]?.label || selectedBoxMeta?.status || '-'}</div>
                      <Stat label="위치 / 절단설정" value={`${num(selectedBoxMeta?.pos, 0)} / ${num(selectedBoxMeta?.cutlenset, 0)}`} unit="mm" size="16px" />
                      <div style={{ height: '8px' }} />
                      <Stat label="최근 수신" value={selectedBoxMeta?.last_ts ? fmtHM(selectedBoxMeta.last_ts) : '-'} unit="" size="16px" />
                    </div>
                  </div>
                </Panel>

                <Panel title="ERP 작업지시서" right={erp?.status && (
                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: erp.status === '완료' ? D.cyan : D.amber }}>{erp.status}</span>
                )}>
                  {erp ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                      <Stat label="거래처" value={erp.company_name || '-'} size="16px" />
                      <Stat label="공정" value={erp.work_type || '-'} size="16px" />
                      <Stat label="사양" value={erp.specification || '-'} size="15px" />
                      <Stat label="시작시각" value={erp.started_at ? fmtHM(erp.started_at) : '-'} size="16px" />
                      <Stat label="발주중량" value={num(erp.original_weight, 0)} unit="kg" size="16px" />
                      <Stat label="투입중량" value={num(erp.used_weight, 0)} unit="kg" size="16px" />
                    </div>
                  ) : (
                    <div style={{ color: D.textFaint, fontSize: '13px' }}>ERP 작업지시서 조회 중...</div>
                  )}
                </Panel>

                <Panel title="라이브 지표">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
                    <Stat label="인버터 속도" value={num(latestSample?.inv_pct ?? latestSample?.INVERTERSPEEDPER, 1)} unit="%" color={D.purple} />
                    <Stat
                      label="최근 사이클"
                      value={num(latestStroke?.cycletm, 1)}
                      unit="초"
                      color={latestStroke?.anomaly ? D.red : D.green}
                    />
                    <Stat label="평균 사이클" value={num(detail?.stats?.mean_cycletm, 1)} unit="초" />
                    <Stat label="금일 누적 행정" value={num(kpi?.stroke_rows, 0)} unit="회" color={D.cyan} />
                  </div>
                </Panel>
              </div>

              {/* 실시간 파형 */}
              <Panel title="실시간 파형 — 위치 % / 인버터속도 %" style={{ marginBottom: '14px' }}
                right={loadingDetail && <span style={{ fontSize: '10.5px', color: D.textFaint }}>갱신 중...</span>}>
                <div style={{ width: '100%', height: 190 }}>
                  <ResponsiveContainer>
                    <LineChart data={waveform} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke={D.borderSoft} vertical={false} />
                      <XAxis dataKey="t" tick={{ fontSize: 9.5, fill: D.textFaint, fontFamily: D.mono }} interval="preserveStartEnd" minTickGap={30} />
                      <YAxis tick={{ fontSize: 10.5, fill: D.textFaint, fontFamily: D.mono }} domain={[0, 100]} />
                      <Tooltip content={<ChartTip suffix="%" />} />
                      <Line type="monotone" dataKey="pos_pct" name="위치%" stroke={D.cyan} strokeWidth={2} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="inv_pct" name="인버터%" stroke={D.purple} strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              {/* 금일 타임라인 */}
              <Panel title={`금일 코일·박스 타임라인 (${overview.total_coil_count}건, 가동 ${overview.active_coil_count}건)`} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {(overview.boxes || []).map((b) => {
                    const active = b.coil_id === selectedCoil && String(b.box_idx) === String(selectedBox);
                    const meta = STATUS_META[b.status] || { color: D.textFaint, glow: 'transparent', label: b.status };
                    return (
                      <div
                        key={`${b.coil_id}-${b.box_idx}`}
                        onClick={() => { userPickedRef.current = true; setSelectedCoil(b.coil_id); setSelectedBox(b.box_idx); }}
                        style={{
                          minWidth: '168px', cursor: 'pointer', borderRadius: '10px', padding: '10px 13px',
                          background: active ? 'rgba(57,214,232,0.08)' : D.panel2,
                          border: `1px solid ${active ? D.cyan : D.border}`,
                          boxShadow: active ? `0 0 0 1px ${D.cyan}55` : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontFamily: D.mono, fontSize: '12px', fontWeight: 700 }}>{b.coil_id}</span>
                          <span style={{ fontSize: '9.5px', fontWeight: 800, color: meta.color }}>{meta.label}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: D.textDim, marginBottom: '7px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.company_name} · 박스{b.box_idx}</div>
                        <div style={{ height: '5px', background: D.borderSoft, borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${b.progress_pct ?? 0}%`, height: '100%', background: meta.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              {/* KPI 스트립 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                <Panel><Stat label="금일 가동률" value={num(kpi?.utilization_pct, 1)} unit="%" color={D.green} /></Panel>
                <Panel><Stat label="사이클 변동계수" value={num(kpi?.cv_pct, 1)} unit="%" color={kpi?.cv_pct >= 30 ? D.amber : D.text} /></Panel>
                <Panel><Stat label="저속 구간 비율" value={num(detail?.stats?.slow_pct, 0)} unit="%" color={detail?.stats?.slow_pct >= 40 ? D.red : D.text} /></Panel>
                <Panel><Stat label="이론 시간당 행정" value={num(detail?.stats?.theoretical_per_hour, 0)} unit="회" color={D.cyan} /></Panel>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
