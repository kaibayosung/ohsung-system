// src/pages/test/levelingStrokeMonitorScreen.jsx
// 레벨링 공정 현황 모니터링 서비스 — 기획서(레벨링공정_모니터링서비스_기획서.pdf) 화면1/2/3을
// 하나의 컴포넌트에서 탭으로 전환하며 실데이터로 보여주는 연구실 프로토타입.
//
// 데이터 흐름 (모두 leveler-explore Edge Function, LEVELING_DATA 테이블 실측):
//  - 화면1(실시간 종합 현황): leveling_stroke_overview=<날짜> — 그날 코일·박스 전체의 KPI
//    (누적 행정, 평균/편차 행정시간, 가동률)와 코일·박스별 최신 상태(가동중/완료/준비, 진행률).
//  - 화면2(코일·박스별 상세) + 화면3(PLC 인사이트): leveling_stroke_detail=<코일ID>&leveling_work_date=<날짜>
//    (&box_idx=<박스> 선택 시) — 절단 사양, 최근 행정별 소요시간(이상치 자동 강조), 최근 PLC 원본 로그,
//    그리고 변동계수/저속비율/인버터계수 표준편차/이론 시간당 행정 등 통계 인사이트를 한 번에 반환.
//    화면2·3은 같은 코일(박스)의 같은 응답을 다른 방식으로 보여주는 것이라 API 호출을 하나로 합쳤습니다.
//
// 기획서 원본은 정적 샘플(56A5716A, 100건)로 만든 목업이었지만, 이 화면은 처음부터 실측 데이터로 동작합니다.
import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie,
} from 'recharts';
import { supabaseUrl } from '../../supabaseClient';

const N = {
  bg: '#f3f5fe',
  surface: '#ffffff',
  border: '#cfd3e5',
  borderLight: '#e4e7f5',
  text900: '#292b31',
  text700: '#595d6c',
  text600: '#75798c',
  text500: '#9397ab',
  accent500: '#968ae0',
  accent600: '#796cbf',
  accent100: '#f5f4ff',
  green: '#3B6D11',
  greenBg: '#EAF3DE',
  blue: '#185FA5',
  blueBg: '#E6F1FB',
  amber: '#8f4d00',
  amberBg: '#FAEEDA',
  amberText: '#633806',
  red: '#B3261E',
  redBg: '#FBE9E7',
  radiusSm: '6px',
  radiusMd: '10px',
  radiusLg: '14px',
  shadowSm: '0 1px 2px rgba(41,43,49,0.06)',
  font: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

function todayKST() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
}
function fmtHM(ts) {
  if (!ts) return '-';
  // leveler-explore가 돌려주는 ts는 이미 "UTC로 잘못 태깅된 KST 숫자"라 +9h를 더 더하면 안 됩니다(이중 보정 버그, 2026-08-21 수정).
  const d = new Date(ts);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}
function num(v, digits = 1) {
  if (v === null || v === undefined || v === '') return '-';
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('ko-KR', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

const card = { background: N.surface, border: `1px solid ${N.border}`, borderRadius: N.radiusMd, boxShadow: N.shadowSm };

function KpiCard({ label, value, unit, tone = 'default' }) {
  const toneMap = {
    default: { bg: N.surface, text: N.text900 },
    blue: { bg: N.blueBg, text: N.blue },
    green: { bg: N.greenBg, text: N.green },
    amber: { bg: N.amberBg, text: N.amberText },
    red: { bg: N.redBg, text: N.red },
  };
  const t = toneMap[tone];
  return (
    <div style={{ ...card, background: t.bg, padding: '16px 20px', border: tone === 'default' ? `1px solid ${N.border}` : '1px solid transparent' }}>
      <div style={{ fontSize: '12.5px', fontWeight: 800, color: tone === 'default' ? N.text600 : t.text, opacity: tone === 'default' ? 1 : 0.75 }}>{label}</div>
      <div style={{ fontFamily: N.font, fontSize: '24px', fontWeight: 900, marginTop: '5px', color: t.text }}>
        {value}<span style={{ fontSize: '14px', fontWeight: 800, marginLeft: '3px' }}>{unit}</span>
      </div>
    </div>
  );
}

function Donut({ value, label, color = N.accent500, sub }) {
  const data = [{ name: 'v', value }, { name: 'r', value: Math.max(0, 100 - value) }];
  return (
    <div style={{ ...card, padding: '16px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', height: 150, position: 'relative' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={48} outerRadius={68} startAngle={90} endAngle={-270} stroke="none">
              <Cell fill={color} />
              <Cell fill={N.borderLight} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <div style={{ fontSize: '26px', fontWeight: 900, color: N.text900 }}>{value == null ? '-' : `${value}%`}</div>
        </div>
      </div>
      <div style={{ fontSize: '13px', fontWeight: 800, color: N.text700, marginTop: '4px' }}>{label}</div>
      {sub && <div style={{ fontSize: '11.5px', color: N.text500, fontWeight: 700 }}>{sub}</div>}
    </div>
  );
}

function StatusDonut({ counts }) {
  const entries = [
    { key: '완료', color: N.green, v: counts['완료'] || 0 },
    { key: '가동중', color: N.blue, v: counts['가동중'] || 0 },
    { key: '준비', color: N.amberText, v: counts['준비'] || 0 },
  ];
  const total = entries.reduce((s, e) => s + e.v, 0);
  return (
    <div style={{ ...card, padding: '16px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', height: 150 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={entries} dataKey="v" nameKey="key" innerRadius={48} outerRadius={68} stroke="none">
              {entries.map((e) => <Cell key={e.key} fill={e.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ fontSize: '13px', fontWeight: 800, color: N.text700, marginTop: '4px' }}>코일·박스 상태 분포(금일 {total}건)</div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {entries.map((e) => (
          <span key={e.key} style={{ fontSize: '11.5px', fontWeight: 800, color: e.color }}>● {e.key} {e.v}</span>
        ))}
      </div>
    </div>
  );
}

function InsightBanner({ text, tone = 'accent' }) {
  const bg = tone === 'amber' ? N.amberBg : N.accent100;
  const color = tone === 'amber' ? N.amberText : N.accent600;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px', background: bg,
      borderRadius: N.radiusMd, padding: '13px 18px', fontSize: '13.5px', fontWeight: 700, lineHeight: 1.6, color,
    }}>
      <span>{tone === 'amber' ? '⚠️' : '💡'}</span>
      <span>{text}</span>
    </div>
  );
}

function ChartTip({ active, payload, label, suffix = '' }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: N.text900, color: '#fff', borderRadius: '4px', padding: '7px 11px', fontSize: '12px', fontWeight: 700, fontFamily: N.font }}>
      <div style={{ marginBottom: '3px', opacity: 0.75 }}>{label}</div>
      {payload.map((p) => <div key={p.dataKey}>{p.name}: {p.value}{suffix}</div>)}
    </div>
  );
}

const TABS = [
  { key: 'overview', label: '화면1 · 실시간 종합 현황' },
  { key: 'detail', label: '화면2 · 코일·박스별 상세' },
  { key: 'insight', label: '화면3 · PLC 인사이트' },
];

export function LevelingStrokeMonitorScreen() {
  const [date, setDate] = useState('2026-08-11' <= todayKST() ? '2026-08-11' : todayKST());
  const [tab, setTab] = useState('overview');

  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState(null);

  const [selectedCoil, setSelectedCoil] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setOverview(null); setSelectedCoil(null); setSelectedBox(null); setDetail(null);
    (async () => {
      setLoadingOverview(true);
      setOverviewError(null);
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/leveler-explore?leveling_stroke_overview=${date}`);
        const json = await res.json();
        if (cancelled) return;
        if (!json.ok) throw new Error(json.error || '현황을 불러오지 못했습니다.');
        setOverview(json);
        if (json.boxes && json.boxes.length > 0) {
          const active = json.boxes.find((b) => b.status === '가동중') || json.boxes[0];
          setSelectedCoil(active.coil_id);
          setSelectedBox(active.box_idx);
        }
      } catch (e) {
        if (!cancelled) setOverviewError(e.message || String(e));
      }
      if (!cancelled) setLoadingOverview(false);
    })();
    return () => { cancelled = true; };
  }, [date]);

  useEffect(() => {
    if (!selectedCoil) { setDetail(null); return; }
    let cancelled = false;
    (async () => {
      setLoadingDetail(true);
      setDetailError(null);
      try {
        const boxParam = selectedBox != null ? `&box_idx=${encodeURIComponent(selectedBox)}` : '';
        const res = await fetch(`${supabaseUrl}/functions/v1/leveler-explore?leveling_stroke_detail=${encodeURIComponent(selectedCoil)}&leveling_work_date=${date}${boxParam}`);
        const json = await res.json();
        if (cancelled) return;
        if (!json.ok) throw new Error(json.error || '상세 데이터를 불러오지 못했습니다.');
        setDetail(json);
      } catch (e) {
        if (!cancelled) setDetailError(e.message || String(e));
      }
      if (!cancelled) setLoadingDetail(false);
    })();
    return () => { cancelled = true; };
  }, [selectedCoil, selectedBox, date]);

  const statusCounts = useMemo(() => {
    const c = {};
    (overview?.boxes || []).forEach((b) => { c[b.status] = (c[b.status] || 0) + 1; });
    return c;
  }, [overview]);

  const kpi = overview?.kpi;

  const waveformData = useMemo(() => {
    if (!detail?.raw_log) return [];
    return detail.raw_log.map((r) => ({
      t: fmtHM(r.TIMESTAMP).slice(0, 8),
      pos_pct: r.CUTLENSET && Number(r.CUTLENSET) > 0 ? Math.round((Number(r.POS) / Number(r.CUTLENSET)) * 1000) / 10 : null,
      inv_pct: r.INVERTERSPEEDPER != null ? Number(r.INVERTERSPEEDPER) : null,
    }));
  }, [detail]);

  const insightText = useMemo(() => {
    if (!detail?.stats) return null;
    const { cv_pct, slow_pct, mean_cycletm } = detail.stats;
    if (cv_pct == null) return null;
    const level = cv_pct >= 40 ? '매우 높음' : cv_pct >= 20 ? '높음' : '안정적';
    return `평균 행정시간 ${num(mean_cycletm, 1)}초, 변동계수 ${num(cv_pct, 1)}%(${level}). 저속(인버터 1~5%) 구간 비율 ${num(slow_pct, 0)}% — 매 행정 전환 시점의 정상 패턴과 겹치는 수준인지 확인이 필요합니다.`;
  }, [detail]);

  const strokeBars = useMemo(() => {
    if (!detail?.strokes) return [];
    return detail.strokes.slice(-51).map((s, i) => ({ idx: i + 1, cycletm: Number(s.cycletm), anomaly: s.is_anomaly }));
  }, [detail]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', fontFamily: N.font, background: N.bg, margin: '-24px', padding: '32px 36px 56px', borderRadius: '18px' }}>
      <div>
        <h1 style={{ fontWeight: 900, fontSize: '32px', margin: '0 0 8px', color: N.text900 }}>🧭 레벨링 공정 현황 모니터링</h1>
        <p style={{ fontSize: '15px', fontWeight: 700, color: N.text700, lineHeight: 1.6, maxWidth: '820px', margin: 0 }}>
          레벨링 PLC 로그(2초 간격 행정 데이터)를 초 단위로 시각화해, 코일·박스별 실시간 상태부터 행정 하나하나의 이상 여부까지 드릴다운으로 확인합니다.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '15px', color: N.text700, fontWeight: 900 }}>날짜</span>
        <input
          type="date" value={date} max={todayKST()} onChange={(e) => setDate(e.target.value)}
          style={{ fontSize: '17px', fontWeight: 900, background: N.surface, border: `1px solid ${N.border}`, borderRadius: N.radiusMd, padding: '8px 14px', color: N.text900, colorScheme: 'light' }}
        />
        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto', background: N.surface, border: `1px solid ${N.border}`, borderRadius: N.radiusMd, padding: '4px' }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 800, cursor: 'pointer',
                background: tab === t.key ? N.accent500 : 'transparent', color: tab === t.key ? '#fff' : N.text600,
              }}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {loadingOverview ? (
        <div style={{ color: N.text500, fontSize: '15px', fontWeight: 800 }}>현황 불러오는 중...</div>
      ) : overviewError ? (
        <div style={{ ...card, padding: '16px 20px', color: N.red, background: N.redBg, fontWeight: 700, fontSize: '14px' }}>{overviewError}</div>
      ) : !overview || overview.total_coil_count === 0 ? (
        <div style={{ ...card, padding: '20px 24px', color: N.text500, fontWeight: 700, fontSize: '14.5px' }}>이 날짜엔 코일ID가 태깅된 레벨링 작업이 없습니다.</div>
      ) : (
        <>
          {/* ===== 화면1 ===== */}
          {tab === 'overview' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
                <KpiCard label="가동 중 코일" value={`${overview.active_coil_count}/${overview.total_coil_count}`} unit="" tone="blue" />
                <KpiCard label="금일 누적 행정" value={num(kpi?.stroke_rows, 0)} unit="회" tone="green" />
                <KpiCard label="평균 행정시간" value={num(kpi?.avg_cycletm, 1)} unit="초" tone="amber" />
                <KpiCard label="행정시간 편차" value={`±${num(kpi?.cv_pct, 0)}`} unit="%" tone="red" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <Donut value={kpi?.utilization_pct ?? null} label="금일 가동률" color={N.accent500} sub={`전체 로그 ${num(kpi?.total_rows, 0)}건 중 가동 ${num(kpi?.run_rows, 0)}건`} />
                <StatusDonut counts={statusCounts} />
              </div>

              <div style={{ ...card, padding: '18px 22px' }}>
                <div style={{ fontSize: '14.5px', fontWeight: 900, color: N.text900, marginBottom: '12px' }}>코일·박스별 상태 & 진행률</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(overview.boxes || []).map((b) => {
                    const active = selectedCoil === b.coil_id && selectedBox === b.box_idx;
                    const badgeBg = b.status === '완료' ? N.greenBg : b.status === '가동중' ? N.blueBg : N.amberBg;
                    const badgeColor = b.status === '완료' ? N.green : b.status === '가동중' ? N.blue : N.amberText;
                    return (
                      <div
                        key={`${b.coil_id}-${b.box_idx}`}
                        onClick={() => { setSelectedCoil(b.coil_id); setSelectedBox(b.box_idx); setTab('detail'); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: N.radiusSm, cursor: 'pointer',
                          background: active ? N.accent100 : N.bg, border: `1px solid ${active ? N.accent500 : N.borderLight}`,
                        }}
                      >
                        <div style={{ minWidth: '150px' }}>
                          <div style={{ fontSize: '13.5px', fontWeight: 900, color: N.text900 }}>{b.coil_id} · 박스{b.box_idx}</div>
                          <div style={{ fontSize: '11.5px', color: N.text500, fontWeight: 700 }}>{b.company_name} · {b.specification}</div>
                        </div>
                        <div style={{ flex: 1, position: 'relative', height: '14px', background: N.borderLight, borderRadius: '4px' }}>
                          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${b.progress_pct ?? 0}%`, background: N.accent500, borderRadius: '4px' }} />
                        </div>
                        <div style={{ width: '52px', textAlign: 'right', fontSize: '12.5px', fontWeight: 800, color: N.text700 }}>{b.progress_pct != null ? `${b.progress_pct}%` : '-'}</div>
                        <span style={{ fontSize: '11.5px', fontWeight: 900, padding: '3px 10px', borderRadius: '999px', background: badgeBg, color: badgeColor }}>{b.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedCoil && (
                <div style={{ ...card, padding: '18px 22px' }}>
                  <div style={{ fontSize: '14.5px', fontWeight: 900, color: N.text900, marginBottom: '4px' }}>실시간 파형 — {selectedCoil} · 박스{selectedBox} (최근 100건)</div>
                  <div style={{ fontSize: '12px', color: N.text500, fontWeight: 700, marginBottom: '10px' }}>위치(절단길이 대비 %)와 인버터 현재속도(%)를 함께 표시 — 절단 행정의 톱니 패턴을 확인할 수 있습니다.</div>
                  {loadingDetail ? <div style={{ color: N.text500, fontSize: '13px', fontWeight: 700 }}>불러오는 중...</div> : (
                    <div style={{ width: '100%', height: 220 }}>
                      <ResponsiveContainer>
                        <LineChart data={waveformData} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
                          <CartesianGrid stroke={N.borderLight} vertical={false} />
                          <XAxis dataKey="t" tick={{ fontSize: 10, fill: N.text500, fontFamily: N.font }} interval="preserveStartEnd" minTickGap={30} />
                          <YAxis tick={{ fontSize: 11, fill: N.text500, fontFamily: N.font }} domain={[0, 100]} />
                          <Tooltip content={<ChartTip suffix="%" />} />
                          <Line type="monotone" dataKey="pos_pct" name="위치%" stroke={N.accent500} strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="inv_pct" name="인버터속도%" stroke="#eb6834" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}

              {insightText && <InsightBanner text={`[${selectedCoil} · 박스${selectedBox}] ${insightText}`} tone={detail?.stats?.cv_pct >= 40 ? 'amber' : 'accent'} />}
            </>
          )}

          {/* ===== 화면2 ===== */}
          {tab === 'detail' && (
            <>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 900, color: N.text700 }}>코일 선택</span>
                <select
                  value={selectedCoil || ''}
                  onChange={(e) => { setSelectedCoil(e.target.value); setSelectedBox(null); }}
                  style={{ fontSize: '13.5px', fontWeight: 800, padding: '7px 12px', borderRadius: N.radiusSm, border: `1px solid ${N.border}`, background: N.surface }}
                >
                  {Array.from(new Set((overview.boxes || []).map((b) => b.coil_id))).map((cid) => (
                    <option key={cid} value={cid}>{cid}</option>
                  ))}
                </select>
                {detail?.boxes?.length > 0 && (
                  <select
                    value={selectedBox ?? ''}
                    onChange={(e) => setSelectedBox(e.target.value)}
                    style={{ fontSize: '13.5px', fontWeight: 800, padding: '7px 12px', borderRadius: N.radiusSm, border: `1px solid ${N.border}`, background: N.surface }}
                  >
                    {detail.boxes.map((bi) => <option key={bi} value={bi}>박스 {bi}</option>)}
                  </select>
                )}
              </div>

              {loadingDetail && <div style={{ color: N.text500, fontSize: '14px', fontWeight: 800 }}>불러오는 중...</div>}
              {detailError && <div style={{ ...card, padding: '14px 18px', color: N.red, background: N.redBg, fontWeight: 700, fontSize: '13.5px' }}>{detailError}</div>}

              {detail && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
                    <KpiCard label="절단길이 설정" value={num(detail.spec.cutlenset, 1)} unit="mm" tone="blue" />
                    <KpiCard label="가속/감속" value={`${num(detail.spec.acctm, 1)}/${num(detail.spec.dectm, 1)}`} unit="초" tone="default" />
                    <KpiCard label="저속길이 설정" value={num(detail.spec.slowlenset, 0)} unit="mm" tone="amber" />
                    <KpiCard label="인버터속도계수" value={num(detail.spec.inverterspeedcoeff, 1)} unit="" tone="green" />
                  </div>

                  <div style={{ ...card, padding: '18px 22px' }}>
                    <div style={{ fontSize: '14.5px', fontWeight: 900, color: N.text900, marginBottom: '4px' }}>행정별 소요시간 (최근 {strokeBars.length}행정)</div>
                    <div style={{ fontSize: '12px', color: N.text500, fontWeight: 700, marginBottom: '10px' }}>파랑: 정상 · 빨강: 평균+표준편차 초과 (총 {num(detail.spec.stroke_count, 0)}행정 중 최근 구간)</div>
                    <div style={{ width: '100%', height: 200 }}>
                      <ResponsiveContainer>
                        <BarChart data={strokeBars} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
                          <CartesianGrid stroke={N.borderLight} vertical={false} />
                          <XAxis dataKey="idx" tick={{ fontSize: 10, fill: N.text500, fontFamily: N.font }} />
                          <YAxis tick={{ fontSize: 11, fill: N.text500, fontFamily: N.font }} unit="초" />
                          <Tooltip content={<ChartTip suffix="초" />} />
                          <Bar dataKey="cycletm" name="1행정시간" radius={[3, 3, 0, 0]}>
                            {strokeBars.map((s, i) => <Cell key={i} fill={s.anomaly ? '#d64545' : N.accent500} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div style={{ ...card, padding: '18px 22px' }}>
                    <div style={{ fontSize: '14.5px', fontWeight: 900, color: N.text900, marginBottom: '10px' }}>PLC 원본 로그 (최근 100건)</div>
                    <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', fontSize: '12.5px', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ position: 'sticky', top: 0, background: N.surface, color: N.text500, fontSize: '11.5px' }}>
                            <td style={{ padding: '6px 4px' }}>시간</td>
                            <td style={{ textAlign: 'right' }}>이동길이sv</td>
                            <td style={{ textAlign: 'right' }}>속도pps</td>
                            <td style={{ textAlign: 'right' }}>인버터속도%</td>
                            <td style={{ textAlign: 'right' }}>1행정시간</td>
                          </tr>
                        </thead>
                        <tbody>
                          {(detail.raw_log || []).slice().reverse().map((r, i) => {
                            const cyc = Number(r.CYCLETM);
                            const isAnomaly = detail.stats.mean_cycletm != null && detail.stats.stddev_cycletm != null
                              && cyc > detail.stats.mean_cycletm + detail.stats.stddev_cycletm;
                            return (
                              <tr key={i} style={{ background: isAnomaly ? N.redBg : 'transparent', borderTop: `1px solid ${N.borderLight}` }}>
                                <td style={{ padding: '5px 4px', color: N.text700, fontWeight: 700 }}>{fmtHM(r.TIMESTAMP)}</td>
                                <td style={{ textAlign: 'right' }}>{num(r.MOVELENSV, 3)}</td>
                                <td style={{ textAlign: 'right' }}>{num(r.SPEEDPPS, 0)}</td>
                                <td style={{ textAlign: 'right' }}>{num(r.INVERTERSPEEDPER, 1)}</td>
                                <td style={{ textAlign: 'right', fontWeight: isAnomaly ? 900 : 700, color: isAnomaly ? N.red : N.text900 }}>
                                  {cyc > 0 ? `${num(cyc, 1)}${isAnomaly ? ' (이상)' : ''}` : '0'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ===== 화면3 ===== */}
          {tab === 'insight' && (
            <>
              {loadingDetail && <div style={{ color: N.text500, fontSize: '14px', fontWeight: 800 }}>불러오는 중...</div>}
              {detail && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
                    <KpiCard label="행정시간 변동계수" value={num(detail.stats.cv_pct, 1)} unit="%" tone="amber" />
                    <KpiCard label="저속(1~5%) 구간 비율" value={num(detail.stats.slow_pct, 0)} unit="%" tone="red" />
                    <KpiCard label="인버터계수 표준편차" value={num(detail.stats.coeff_stddev, 2)} unit="" tone="green" />
                    <KpiCard label="이론 시간당 행정" value={num(detail.stats.theoretical_per_hour, 0)} unit="회" tone="blue" />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '14px' }}>
                    <div style={{ ...card, padding: '18px 22px' }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 900, color: N.text900, marginBottom: '10px' }}>행정시간 분포 (최근 {strokeBars.length}행정)</div>
                      <div style={{ width: '100%', height: 220 }}>
                        <ResponsiveContainer>
                          <BarChart data={detail.stats.histogram} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
                            <CartesianGrid stroke={N.borderLight} vertical={false} />
                            <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: N.text500, fontFamily: N.font }} unit="초" />
                            <YAxis tick={{ fontSize: 11, fill: N.text500, fontFamily: N.font }} />
                            <Tooltip content={<ChartTip suffix="건" />} />
                            <Bar dataKey="count" name="건수" fill={N.accent500} radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <Donut value={detail.stats.slow_pct} label="저속 전환 비율" color="#eb6834" sub="가동 구간 중 인버터 1~5%" />
                  </div>

                  <div style={{ ...card, padding: '18px 22px' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 900, color: N.text900, marginBottom: '10px' }}>인버터속도계수 안정성 (최근 100건)</div>
                    <div style={{ width: '100%', height: 200 }}>
                      <ResponsiveContainer>
                        <LineChart data={detail.stats.coeff_series.map((p) => ({ t: fmtHM(p.t).slice(0, 8), v: Number(p.v) }))} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
                          <CartesianGrid stroke={N.borderLight} vertical={false} />
                          <XAxis dataKey="t" tick={{ fontSize: 10, fill: N.text500, fontFamily: N.font }} interval="preserveStartEnd" minTickGap={30} />
                          <YAxis tick={{ fontSize: 11, fill: N.text500, fontFamily: N.font }} domain={['auto', 'auto']} />
                          <Tooltip content={<ChartTip />} />
                          <Line type="monotone" dataKey="v" name="인버터속도계수" stroke={N.green} strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <InsightBanner
                    tone={detail.stats.cv_pct >= 40 ? 'amber' : 'accent'}
                    text={`행정시간 변동계수 ${num(detail.stats.cv_pct, 1)}%. 인버터속도계수 표준편차는 ${num(detail.stats.coeff_stddev, 2)}로 ${detail.stats.coeff_stddev != null && detail.stats.coeff_stddev < 1 ? '안정적' : '변동이 큰 편'}입니다 — ${detail.stats.coeff_stddev != null && detail.stats.coeff_stddev < 1 ? '구동계 자체보다는 소재 투입·센싱 타이밍 등 공정 변수에 의한 지연 가능성이 높습니다' : '구동계 상태를 점검해볼 필요가 있습니다'}.`}
                  />
                  <InsightBanner
                    tone="accent"
                    text={`저속(인버터 1~5%) 구간 비율 ${num(detail.stats.slow_pct, 0)}% — 매 행정 종료·시작 시점의 정상 전환 구간과 겹치는 수준인지 확인하고, 이 비율이 점차 늘어나는 추세라면 정지 전조로 볼 수 있습니다.`}
                  />
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
