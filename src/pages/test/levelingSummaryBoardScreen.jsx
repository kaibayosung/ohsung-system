// src/pages/test/levelingSummaryBoardScreen.jsx
// 레벨링 종합 현황판 — 레벨링 라인의 ERP 작업지시서·PLC 실측·텐션 OCR 데이터를 한 화면에 모아
// 담당자가 매일 열어보는 "플래그십" 요약 보드로 디자인한 실데이터 연동 화면입니다.
//
// 기존 레벨링 모니터링 화면들(레벨링 라인 통합 관제/NMS, 레벨링 공정×ERP 통합 대시보드, 레벨링 공정
// 현황 모니터링)과 데이터 소스는 동일하지만, 그 화면들은 각각 "지금 뭘 하고 있나(관제)", "오늘 하루
// ERP 대조", "행정 단위 드릴다운"처럼 역할이 나뉘어 있어 한눈에 보기엔 흩어져 있었습니다. 이 화면은
// 그 데이터를 설비 흐름도(언코일러→레벨러→루프→샤링기→컨베이어) 위에 얹어 "라인 전체가 지금
// 어떤 상태인가"를 시각적으로 요약해서 보여주는 용도로 추가되었습니다(사용자 전용 종합 뷰).
//
// 데이터 흐름 (leveler-explore Edge Function, osungsteel.servehttp.com:33306 ohsung DB 실측):
//  - leveling_stroke_overview=<날짜> — 금일(또는 지정일) 코일·박스 현황 + KPI. 데이터가 없으면
//    최근 가동일까지 최대 14일 롤백합니다(레벨링 라인 통합 관제 화면과 동일 패턴).
//  - leveling_stroke_detail=<코일ID>&leveling_work_date=<날짜> — 선택된 코일·박스의 PLC 원본
//    로그, 행정별 사이클타임, 절단 사양(spec), 통계(stats).
//  - leveling_coil_id=<코일ID>&leveling_work_date=<날짜> — ERP 작업지시서(거래처·사양·중량).
// 텐션(언코일러)은 Supabase ai_tension_readings 테이블(PR-DTC-3100 카메라 OCR)을 직접 조회합니다.
//
// ⚠️ 타임존 주의 (ohsung-leveling-plc-analysis 스킬 §0): LEVELING_DATA.TIMESTAMP는 이미 KST라서
// 그대로 쓰고, ai_tension_readings.captured_at은 진짜 UTC라서 +9시간 보정이 필요합니다. 이 둘을
// 섞어 쓰는 코드가 이 화면 안에 공존하므로 fmtHM(레벨링용)과 fmtHMTension(텐션용)을 분리했습니다.
//
// 루프·샤링기·컨베이어 구간은 이 시스템에 개별 계측기가 없어, 설비 흐름도에서는 레벨러 라인 전체의
// 가동 상태만 공유해서 보여줍니다(수치를 지어내지 않습니다) — 언코일러(텐션)·레벨러(PLC)만 실측치입니다.
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, Cell,
} from 'recharts';
import { COLORS, box, fmtNum } from './theme';
import { supabase, supabaseUrl } from '../../supabaseClient';

const SANS = "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function todayKST() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
}
function shiftDate(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
// LEVELING_DATA.TIMESTAMP는 레벨러 서버(MariaDB)의 KST 벽시계 값이 그대로 들어오며, 직렬화 시
// "...Z"가 붙어 UTC처럼 보일 뿐 실제로는 이미 KST입니다 — 여기서 +9시간을 또 더하면 안 됩니다.
function fmtHM(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
// ai_tension_readings.captured_at은 진짜 UTC이므로(위 LEVELING_DATA와 반대) KST로 보려면 +9시간.
function fmtHMTension(capturedAtIso) {
  if (!capturedAtIso) return '-';
  const d = new Date(new Date(capturedAtIso).getTime() + 9 * 3600000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
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
  return Math.max(0, Math.round((nowMs - new Date(ts).getTime()) / 1000));
}

const STATUS_META = {
  가동중: { color: COLORS.green, bg: COLORS.greenBg, label: '가동중' },
  완료: { color: COLORS.blue, bg: COLORS.blueBg, label: '완료' },
  준비: { color: COLORS.amber, bg: COLORS.amberBg, label: '준비' },
};

// --- 작은 시각 부품들 ---------------------------------------------------

function Ring({ pct, size = 88, stroke = 9, color = COLORS.accent, trackColor = COLORS.border, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (p / 100) * c}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
    </div>
  );
}

function StageIcon({ type, color }) {
  const p = { width: 26, height: 26, viewBox: '0 0 48 48', fill: 'none', stroke: color, strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (type) {
    case 'uncoiler':
      return (<svg {...p}><circle cx="24" cy="24" r="16" /><circle cx="24" cy="24" r="7" /><circle cx="24" cy="24" r="2" fill={color} stroke="none" /></svg>);
    case 'leveller':
      return (<svg {...p}><rect x="6" y="16" width="36" height="16" rx="3" /><line x1="13" y1="16" x2="13" y2="32" /><line x1="21" y1="16" x2="21" y2="32" /><line x1="29" y1="16" x2="29" y2="32" /><line x1="37" y1="16" x2="37" y2="32" /></svg>);
    case 'loop':
      return (<svg {...p}><path d="M7 13 C 7 34, 41 10, 41 31" /></svg>);
    case 'shearing':
      return (<svg {...p}><rect x="8" y="27" width="32" height="9" rx="2" /><path d="M24 6 L34 27 L14 27 Z" /></svg>);
    case 'conveyor':
      return (<svg {...p}><rect x="4" y="18" width="40" height="8" rx="4" /><circle cx="13" cy="34" r="4" /><circle cx="35" cy="34" r="4" /></svg>);
    default:
      return null;
  }
}

function EquipmentFlow({ stages }) {
  return (
    <div style={{ position: 'relative', padding: '2px 2px 4px' }}>
      <div style={{ position: 'absolute', left: '6%', right: '6%', top: '100px', height: '3px', background: COLORS.border, borderRadius: '2px', zIndex: 0 }} />
      <div style={{ display: 'flex', gap: '8px', position: 'relative', zIndex: 1 }}>
        {stages.map((s) => (
          <div key={s.key} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '100%', height: '58px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center',
              background: s.current ? COLORS.accentSoft : '#f8fafc',
              border: `1.5px solid ${s.current ? COLORS.accent : COLORS.border}`, borderRadius: '12px',
              padding: '6px 8px', textAlign: 'center', overflow: 'hidden',
            }}>
              <div style={{ fontSize: '10.5px', fontWeight: 800, color: s.current ? COLORS.accentDark : COLORS.steelLight, marginBottom: '2px' }}>{s.label}</div>
              {s.lines.map((l, i) => (
                <div key={i} style={{
                  fontSize: i === 0 ? '13px' : '10.5px', fontWeight: i === 0 ? 900 : 700,
                  color: i === 0 ? COLORS.navy : COLORS.steel, lineHeight: 1.3, whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{l}</div>
              ))}
            </div>
            <div style={{ width: '2px', height: '16px', background: s.current ? COLORS.accent : COLORS.border }} />
            <div style={{
              position: 'relative', width: '52px', height: '52px', borderRadius: '50%',
              background: s.current ? '#fff' : COLORS.bg, border: `2px solid ${s.current ? COLORS.accent : COLORS.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: s.current ? `0 0 0 6px ${COLORS.accentBg}` : 'none',
            }}>
              <StageIcon type={s.icon} color={s.current ? COLORS.accent : COLORS.steelLight} />
              {s.current && (
                <span style={{
                  position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: '50%',
                  background: COLORS.accent, border: '2px solid #fff', animation: 'lvPulse 1.6s infinite',
                }} />
              )}
            </div>
            <div style={{ fontSize: '9.5px', fontWeight: 800, color: s.current ? COLORS.accentDark : COLORS.steelLight, marginTop: '5px', letterSpacing: '0.04em' }}>{s.labelEn}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({ title, right, children, style }) {
  return (
    <div style={{ ...box.card, ...style }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.02em', color: COLORS.steel, textTransform: 'uppercase' }}>{title}</div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

function KpiTile({ label, value, unit, color = COLORS.navy }) {
  return (
    <div style={{
      background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: '14px',
      borderLeft: `4px solid ${color}`, padding: '16px 18px', boxShadow: COLORS.shadowSm,
    }}>
      <div style={{ fontSize: '12.5px', fontWeight: 700, color: COLORS.steel, marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '26px', fontWeight: 900, color: COLORS.navy, lineHeight: 1.1 }}>
        {value}<span style={{ fontSize: '13px', fontWeight: 700, marginLeft: '3px', color: COLORS.steelLight }}>{unit}</span>
      </div>
    </div>
  );
}

function ChecklistRow({ ok, label, detail }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: `1px solid ${COLORS.border}` }}>
      <span style={{
        width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: ok ? COLORS.greenBg : COLORS.amberBg, color: ok ? COLORS.green : COLORS.amber, fontSize: '12px', fontWeight: 900,
      }}>{ok ? '✓' : '!'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 700, color: COLORS.navy }}>{label}</div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: COLORS.steelLight }}>{detail}</div>
      </div>
    </div>
  );
}

function AlertBanner({ tone, text }) {
  const map = {
    amber: { bg: COLORS.amberBg, color: '#633806', icon: '⚠️' },
    red: { bg: COLORS.redBg, color: COLORS.red, icon: '⛔' },
  };
  const m = map[tone] || map.amber;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px', background: m.bg, borderRadius: '12px',
      padding: '11px 16px', fontSize: '13.5px', fontWeight: 700, color: m.color,
    }}>
      <span>{m.icon}</span><span>{text}</span>
    </div>
  );
}

function ChartTip({ active, payload, label, suffix = '' }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: COLORS.navy, color: '#fff', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontWeight: 700 }}>
      <div style={{ opacity: 0.65, marginBottom: '3px' }}>{label}</div>
      {payload.filter((p) => p.value != null).map((p) => (
        <div key={p.dataKey} style={{ color: p.stroke || p.fill }}>{p.name}: {num(p.value, 1)}{suffix}</div>
      ))}
    </div>
  );
}

// --- 메인 화면 ------------------------------------------------------------

export function LevelingSummaryBoardScreen() {
  const [baseDate, setBaseDate] = useState(todayKST());
  const [effectiveDate, setEffectiveDate] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState(null);

  const [selectedCoil, setSelectedCoil] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);
  const [detail, setDetail] = useState(null);
  const [erp, setErp] = useState(null);

  const [tension, setTension] = useState([]);

  const [refreshTick, setRefreshTick] = useState(0);
  const [lastFetchAt, setLastFetchAt] = useState(null);
  const [clock, setClock] = useState(nowKstClock());
  const userPickedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setClock(nowKstClock()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setRefreshTick((t) => t + 1), 20000);
    return () => clearInterval(id);
  }, []);

  // 금일(또는 지정일) 코일·박스 현황 — 데이터 없으면 최근 가동일까지 최대 14일 롤백
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
          setOverview({ ok: true, boxes: [], total_coil_count: 0, active_coil_count: 0 });
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

  // 선택 코일·박스의 PLC 상세 + ERP 작업지시서
  useEffect(() => {
    if (!selectedCoil || !effectiveDate) { setDetail(null); setErp(null); return; }
    let cancelled = false;
    (async () => {
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
        // 조용히 실패 — 부분 데이터라도 계속 표시
      }
    })();
    return () => { cancelled = true; };
  }, [selectedCoil, selectedBox, effectiveDate, refreshTick]);

  // 금일(지정일) 텐션 OCR 읽기 — captured_at은 진짜 UTC라 KST 하루 범위를 UTC로 변환해 조회
  useEffect(() => {
    if (!effectiveDate) return;
    let cancelled = false;
    (async () => {
      try {
        const startIso = new Date(`${effectiveDate}T00:00:00+09:00`).toISOString();
        const endIso = new Date(`${effectiveDate}T23:59:59+09:00`).toISOString();
        const { data, error } = await supabase
          .from('ai_tension_readings')
          .select('captured_at, output_percent, thickness_um, start_dia_mm')
          .eq('parse_ok', true)
          .gte('captured_at', startIso)
          .lte('captured_at', endIso)
          .order('captured_at', { ascending: true })
          .limit(300);
        if (!cancelled && !error && data) setTension(data);
      } catch {
        // 조용히 실패 — 텐션 카메라는 별도 시스템이라 끊겨도 나머지 화면은 계속 표시
      }
    })();
    return () => { cancelled = true; };
  }, [effectiveDate, refreshTick]);

  const kpi = overview?.kpi;
  const isHistorical = effectiveDate && effectiveDate !== todayKST();
  const nowMs = useMemo(() => new Date(new Date().getTime() + 9 * 3600000).getTime(), [clock]);
  const dataAgeSec = kpi?.last_ts ? secsAgo(kpi.last_ts, nowMs) : null;

  const selectedBoxMeta = useMemo(
    () => (overview?.boxes || []).find((b) => b.coil_id === selectedCoil && String(b.box_idx) === String(selectedBox)),
    [overview, selectedCoil, selectedBox],
  );

  const lineStatus = useMemo(() => {
    if (!overview || overview.total_coil_count === 0) return { key: 'offline', label: '비가동 · 데이터 없음', color: COLORS.steelLight };
    const anyRunning = (overview.boxes || []).some((b) => b.status === '가동중');
    if (anyRunning) return { key: 'run', label: '가동중', color: COLORS.green };
    return { key: 'idle', label: '대기', color: COLORS.amber };
  }, [overview]);

  const waveform = useMemo(() => {
    if (!detail?.raw_log) return [];
    return detail.raw_log.map((r) => {
      const inv = r.INVERTERSPEEDPER != null ? Number(r.INVERTERSPEEDPER) : null;
      return { t: fmtHM(r.TIMESTAMP), inv, inv_slow: inv != null && inv > 0 && inv <= 5 ? inv : null };
    });
  }, [detail]);

  const strokeBars = useMemo(
    () => (detail?.strokes || []).slice(-20).map((s, i) => ({ idx: i + 1, cycletm: Number(s.cycletm), anomaly: !!s.is_anomaly })),
    [detail],
  );

  const tensionSeries = useMemo(
    () => tension.map((r) => ({ t: fmtHMTension(r.captured_at), pct: r.output_percent != null ? Number(r.output_percent) : null })),
    [tension],
  );
  const latestTension = tension.length ? tension[tension.length - 1] : null;
  const tensionAgeMin = latestTension ? Math.round((Date.now() - new Date(latestTension.captured_at).getTime()) / 60000) : null;

  const stages = useMemo(() => {
    const lineLine = `${lineStatus.label}`;
    return [
      {
        key: 'uncoiler', label: '언코일러', labelEn: 'UNCOILER', icon: 'uncoiler',
        lines: latestTension
          ? [`장력 ${num(latestTension.output_percent, 1)}%`, `두께 ${num(latestTension.thickness_um, 0)}um`]
          : ['텐션 데이터 없음'],
      },
      {
        key: 'leveller', label: '레벨러', labelEn: 'LEVELLER', icon: 'leveller', current: true,
        lines: selectedBoxMeta
          ? [`진행률 ${num(selectedBoxMeta.progress_pct, 0)}%`, STATUS_META[selectedBoxMeta.status]?.label || selectedBoxMeta.status || '-']
          : ['작업 없음'],
      },
      { key: 'loop', label: '루프', labelEn: 'LOOP', icon: 'loop', lines: [lineLine] },
      { key: 'shearing', label: '샤링기', labelEn: 'SHEARING', icon: 'shearing', lines: [lineLine] },
      { key: 'conveyor', label: '컨베이어', labelEn: 'CONVEYOR', icon: 'conveyor', lines: [lineLine] },
    ];
  }, [latestTension, selectedBoxMeta, lineStatus]);

  const alerts = useMemo(() => {
    const list = [];
    if (isHistorical) list.push({ tone: 'amber', text: `금일(${todayKST()}) 가동 이력이 없어 최근 가동일(${effectiveDate}) 데이터를 표시 중입니다.` });
    if (dataAgeSec != null && dataAgeSec > 300 && !isHistorical) list.push({ tone: 'amber', text: `최근 PLC 수신 후 ${Math.round(dataAgeSec / 60)}분 경과 — 라인이 정지했거나 통신이 지연되고 있을 수 있습니다.` });
    if (tensionAgeMin != null && tensionAgeMin > 15) list.push({ tone: 'amber', text: `텐션 OCR 수신 후 ${tensionAgeMin}분 경과 — 카메라·모니터링 PC 상태를 확인해보세요.` });
    return list;
  }, [isHistorical, effectiveDate, dataAgeSec, tensionAgeMin]);

  const checklist = useMemo(() => ([
    { ok: kpi?.cv_pct == null || kpi.cv_pct < 30, label: '사이클 변동계수 안정', detail: `${num(kpi?.cv_pct, 1)}% (기준 30% 미만)` },
    { ok: detail?.stats?.slow_pct == null || detail.stats.slow_pct < 40, label: '저속 구간 비율 정상', detail: `${num(detail?.stats?.slow_pct, 0)}% (기준 40% 미만)` },
    { ok: dataAgeSec == null || dataAgeSec < 300, label: 'PLC 수신 최신', detail: dataAgeSec != null ? `${Math.round(dataAgeSec / 60)}분 전 수신` : '수신 이력 없음' },
    { ok: tensionAgeMin == null || tensionAgeMin < 15, label: '텐션 OCR 수신 최신', detail: tensionAgeMin != null ? `${tensionAgeMin}분 전 수신` : '수신 이력 없음' },
  ]), [kpi, detail, dataAgeSec, tensionAgeMin]);

  return (
    <div style={{ background: COLORS.bg, margin: '-24px', padding: '26px 30px 50px', borderRadius: '18px', fontFamily: SANS, color: COLORS.navy, minHeight: '640px' }}>
      <style>{`
        @keyframes lvPulse { 0% { box-shadow: 0 0 0 0 rgba(232,131,15,0.5); } 70% { box-shadow: 0 0 0 9px rgba(232,131,15,0); } 100% { box-shadow: 0 0 0 0 rgba(232,131,15,0); } }
        @keyframes lvPulseDot { 0% { box-shadow: 0 0 0 0 rgba(28,122,77,0.5); } 70% { box-shadow: 0 0 0 8px rgba(28,122,77,0); } 100% { box-shadow: 0 0 0 0 rgba(28,122,77,0); } }
      `}</style>

      {/* 히어로 */}
      <div style={{
        background: COLORS.navyGradient, borderRadius: '20px', padding: '26px 30px', color: '#fff', boxShadow: COLORS.shadowLg,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', marginBottom: '18px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '11px', height: '11px', borderRadius: '50%', background: lineStatus.color,
              animation: lineStatus.key === 'run' ? 'lvPulseDot 1.6s infinite' : 'none',
            }} />
            <h1 style={{ fontSize: '24px', fontWeight: 900, margin: 0, letterSpacing: '-0.01em' }}>레벨링 종합 현황판</h1>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.navy, background: '#fff', borderRadius: '999px', padding: '3px 12px' }}>{lineStatus.label}</span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#aebbd0', marginTop: '7px' }}>
            ERP 작업지시서 × PLC 실측 × 텐션 OCR — 레벨링 라인 전체를 한 화면에
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
          <Ring pct={selectedBoxMeta?.progress_pct} size={78} stroke={8} color={COLORS.accent} trackColor="rgba(255,255,255,0.16)">
            <div style={{ fontSize: '17px', fontWeight: 900, color: '#fff' }}>{selectedBoxMeta?.progress_pct != null ? `${selectedBoxMeta.progress_pct}%` : '-'}</div>
          </Ring>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#fff' }}>{clock}</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#aebbd0' }}>
              KST · {effectiveDate || baseDate}
              {lastFetchAt && <> · 갱신 {Math.max(0, Math.round((Date.now() - lastFetchAt) / 1000))}초 전</>}
            </div>
          </div>
          <input
            type="date" value={baseDate} max={todayKST()}
            onChange={(e) => { userPickedRef.current = false; setBaseDate(e.target.value); }}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '10px', padding: '8px 12px', color: '#fff', fontSize: '13px', fontWeight: 700 }}
          />
        </div>
      </div>

      {loadingOverview && !overview ? (
        <div style={{ color: COLORS.steel, fontSize: '15px', fontWeight: 700, padding: '40px 0', textAlign: 'center' }}>현황 불러오는 중...</div>
      ) : overviewError ? (
        <AlertBanner tone="red" text={overviewError} />
      ) : (
        <>
          {alerts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
              {alerts.map((a, i) => <AlertBanner key={i} {...a} />)}
            </div>
          )}

          {!selectedCoil ? (
            <Card><div style={{ color: COLORS.steel, fontSize: '14px', fontWeight: 700, textAlign: 'center', padding: '20px 0' }}>표시할 코일이 없습니다.</div></Card>
          ) : (
            <>
              {/* KPI 스트립 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                <KpiTile label="금일 가동률" value={num(kpi?.utilization_pct, 0)} unit="%" color={COLORS.blue} />
                <KpiTile label="선택 박스 진행률" value={num(selectedBoxMeta?.progress_pct, 0)} unit="%" color={COLORS.accent} />
                <KpiTile label="사이클 변동계수" value={num(kpi?.cv_pct, 1)} unit="%" color={kpi?.cv_pct >= 30 ? COLORS.amber : COLORS.steel} />
                <KpiTile label="저속 구간 비율" value={num(detail?.stats?.slow_pct, 0)} unit="%" color={detail?.stats?.slow_pct >= 40 ? COLORS.red : COLORS.steel} />
                <KpiTile label="이론 시간당 행정" value={num(detail?.stats?.theoretical_per_hour, 0)} unit="회" color={COLORS.blue} />
                <KpiTile label="금일 누적 행정" value={num(kpi?.stroke_rows, 0)} unit="회" color={COLORS.green} />
              </div>

              {/* 설비 흐름도 */}
              <Card title="⚙️ 설비 흐름 · 현재 위치" style={{ marginBottom: '16px' }}>
                <EquipmentFlow stages={stages} />
                <div style={{ ...box.hint, marginTop: '10px', fontSize: '12.5px' }}>
                  ℹ️ 루프·샤링기·컨베이어 구간은 개별 계측기가 없어 레벨러 라인의 가동 상태를 함께 표시합니다. 언코일러 값은 텐션 OCR(PR-DTC-3100), 레벨러 값은 LEVELING_DATA 실측치입니다.
                </div>
              </Card>

              {/* 차트 3종 — 축 하나씩, 이중축 사용하지 않음 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                <Card title="부하율 추이 (인버터속도 %)">
                  <div style={{ width: '100%', height: 190 }}>
                    <ResponsiveContainer>
                      <LineChart data={waveform} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke={COLORS.border} vertical={false} />
                        <XAxis dataKey="t" tick={{ fontSize: 10, fill: COLORS.steelLight, fontWeight: 700 }} interval="preserveStartEnd" minTickGap={30} />
                        <YAxis tick={{ fontSize: 11, fill: COLORS.steelLight, fontWeight: 700 }} domain={[0, 100]} />
                        <Tooltip content={<ChartTip suffix="%" />} />
                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                        <Line type="monotone" dataKey="inv" name="인버터속도%" stroke={COLORS.blue} strokeWidth={2.4} dot={false} isAnimationActive={false} connectNulls />
                        <Line type="monotone" dataKey="inv_slow" name="저속 구간(≤5%)" stroke={COLORS.red} strokeWidth={0} dot={{ r: 3, fill: COLORS.red }} isAnimationActive={false} legendType="circle" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card title="행정별 사이클타임 (최근 20행정)">
                  <div style={{ width: '100%', height: 190 }}>
                    <ResponsiveContainer>
                      <BarChart data={strokeBars} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke={COLORS.border} vertical={false} />
                        <XAxis dataKey="idx" tick={{ fontSize: 10, fill: COLORS.steelLight, fontWeight: 700 }} />
                        <YAxis tick={{ fontSize: 11, fill: COLORS.steelLight, fontWeight: 700 }} />
                        <Tooltip content={<ChartTip suffix="초" />} />
                        {detail?.stats?.mean_cycletm != null && (
                          <ReferenceLine y={Number(detail.stats.mean_cycletm)} stroke={COLORS.steelLight} strokeDasharray="4 4" label={{ value: '평균', position: 'right', fontSize: 10, fill: COLORS.steelLight }} />
                        )}
                        <Bar dataKey="cycletm" name="사이클타임" radius={[3, 3, 0, 0]}>
                          {strokeBars.map((s, i) => <Cell key={i} fill={s.anomaly ? COLORS.red : COLORS.blue} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.steelLight, marginTop: '4px' }}>파랑: 정상 · 빨강: 평균+표준편차 초과(이상 행정)</div>
                </Card>

                <Card title="언코일러 텐션 추이 (금일)" right={latestTension && (
                  <span style={{ fontSize: '12px', fontWeight: 800, color: COLORS.accent }}>현재 {num(latestTension.output_percent, 1)}%</span>
                )}>
                  {tensionSeries.length > 0 ? (
                    <div style={{ width: '100%', height: 190 }}>
                      <ResponsiveContainer>
                        <LineChart data={tensionSeries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                          <CartesianGrid stroke={COLORS.border} vertical={false} />
                          <XAxis dataKey="t" tick={{ fontSize: 10, fill: COLORS.steelLight, fontWeight: 700 }} interval="preserveStartEnd" minTickGap={30} />
                          <YAxis tick={{ fontSize: 11, fill: COLORS.steelLight, fontWeight: 700 }} domain={[0, 100]} />
                          <Tooltip content={<ChartTip suffix="%" />} />
                          <Line type="monotone" dataKey="pct" name="텐션%" stroke={COLORS.accent} strokeWidth={2.4} dot={false} isAnimationActive={false} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div style={{ color: COLORS.steelLight, fontSize: '13px', fontWeight: 700, padding: '60px 0', textAlign: 'center' }}>금일 텐션 OCR 데이터가 아직 없습니다.</div>
                  )}
                </Card>
              </div>

              {/* ERP / 설정값 / 품질 체크리스트 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                <Card title="ERP 작업지시서">
                  {erp ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: COLORS.steelLight, marginBottom: '3px' }}>거래처</div>
                        <div style={{ fontSize: '15px', fontWeight: 800 }}>{erp.company_name || '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: COLORS.steelLight, marginBottom: '3px' }}>사양</div>
                        <div style={{ fontSize: '15px', fontWeight: 800 }}>{erp.specification || '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: COLORS.steelLight, marginBottom: '3px' }}>시작시각</div>
                        <div style={{ fontSize: '15px', fontWeight: 800 }}>{erp.started_at ? fmtHM(erp.started_at) : '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: COLORS.steelLight, marginBottom: '3px' }}>발주중량</div>
                        <div style={{ fontSize: '15px', fontWeight: 800 }}>{num(erp.original_weight, 0)}kg</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: COLORS.steelLight, fontSize: '13px', fontWeight: 700 }}>ERP 작업지시서 조회 중...</div>
                  )}
                </Card>

                <Card title="PLC 설정값">
                  {detail?.spec ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: COLORS.steelLight, marginBottom: '3px' }}>절단길이 설정</div>
                        <div style={{ fontSize: '15px', fontWeight: 800 }}>{num(detail.spec.cutlenset, 1)}mm</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: COLORS.steelLight, marginBottom: '3px' }}>가속/감속</div>
                        <div style={{ fontSize: '15px', fontWeight: 800 }}>{num(detail.spec.acctm, 1)}/{num(detail.spec.dectm, 1)}초</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: COLORS.steelLight, marginBottom: '3px' }}>저속길이 설정</div>
                        <div style={{ fontSize: '15px', fontWeight: 800 }}>{num(detail.spec.slowlenset, 0)}mm</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: COLORS.steelLight, marginBottom: '3px' }}>총 행정 수</div>
                        <div style={{ fontSize: '15px', fontWeight: 800 }}>{num(detail.spec.stroke_count, 0)}회</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: COLORS.steelLight, fontSize: '13px', fontWeight: 700 }}>PLC 설정값 조회 중...</div>
                  )}
                </Card>

                <Card title="품질 체크리스트">
                  <div>
                    {checklist.map((c, i) => <ChecklistRow key={i} {...c} />)}
                  </div>
                </Card>
              </div>

              {/* 금일 코일·박스 타임라인 */}
              <Card title={`금일 코일·박스 타임라인 (${overview.total_coil_count}건, 가동 ${overview.active_coil_count}건)`}>
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {(overview.boxes || []).map((b) => {
                    const active = b.coil_id === selectedCoil && String(b.box_idx) === String(selectedBox);
                    const meta = STATUS_META[b.status] || { color: COLORS.steelLight, bg: COLORS.bg, label: b.status };
                    return (
                      <div
                        key={`${b.coil_id}-${b.box_idx}`}
                        onClick={() => { userPickedRef.current = true; setSelectedCoil(b.coil_id); setSelectedBox(b.box_idx); }}
                        style={{
                          minWidth: '172px', cursor: 'pointer', borderRadius: '12px', padding: '11px 14px',
                          background: active ? COLORS.accentSoft : meta.bg,
                          border: `2px solid ${active ? COLORS.accent : 'transparent'}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 900 }}>{b.coil_id}</span>
                          <span style={{ fontSize: '10.5px', fontWeight: 900, color: meta.color }}>{meta.label}</span>
                        </div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: COLORS.steel, marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.company_name} · 박스{b.box_idx}</div>
                        <div style={{ height: '6px', background: '#fff', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${b.progress_pct ?? 0}%`, height: '100%', background: meta.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
