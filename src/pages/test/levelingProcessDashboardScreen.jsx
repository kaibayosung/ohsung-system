// src/pages/test/levelingProcessDashboardScreen.jsx
// 레벨링 공정 x ERP 통합 대시보드 — 실데이터 연동 프로토타입.
//
// 데이터 흐름:
//  1) leveler-explore(leveling_date)로 그날 코일ID가 태깅된 레벨링 작업 목록을 가져옵니다.
//  2) 목록의 코일마다 leveler-explore(leveling_coil_id+leveling_work_date)를 병렬 호출해 전체/박스별
//     PLC 실측 통계(가동시간, 사이클타임, 인버터 부하율, 추정 시트수)를 모읍니다. 이 값들을 모아
//     상단 KPI, 코일별 가동 타임라인, 부하율 비교 차트를 계산합니다.
//  3) 코일을 하나 선택하면 leveler-explore(leveling_rhythm)이 그 코일의 가동 구간을 시간 버킷(1~10분
//     적응형)으로 쪼갠 부하율·사이클타임 추이와, 값이 비정상적으로 고정(freeze)된 것으로 보이는 구간을
//     함께 반환합니다.
//  4) 그린ERP 확정 매출(greenp_production, work_type=LEVELLING)을 Supabase에서 직접 조회해, 작업지시
//     금액(erp_data.amount) 합계와 업체별로 대조합니다. 코일 단위 매칭 키가 없어 업체명 기준 합산
//     비교이며, 화면에도 그렇게 안내합니다.
//
// 레벨링 코일ID 태깅은 2026-08-10~11부터 시작된 초기 단계라 하루에 코일이 몇 건 없는 날이 많습니다.
import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, Cell,
} from 'recharts';
import { fmtNum, fmtWon } from './theme';
import { supabase, supabaseUrl } from '../../supabaseClient';

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
  accent200: '#e7e5fe',
  green: '#3B6D11',
  greenBg: '#EAF3DE',
  blue: '#185FA5',
  blueBg: '#E6F1FB',
  amber: '#8f4d00',
  amberBg: '#FAEEDA',
  amberText: '#633806',
  radiusSm: '6px',
  radiusMd: '10px',
  radiusLg: '14px',
  shadowSm: '0 1px 2px rgba(41,43,49,0.06)',
  font: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const COIL_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#4a3aa7'];

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
  return `${hh}:${mm}`;
}
function fmtDurationSec(sec) {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return '-';
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h <= 0) return `${m}분`;
  return `${h}시간 ${m}분`;
}
function durationSec(startTs, endTs) {
  if (!startTs || !endTs) return null;
  return (new Date(endTs).getTime() - new Date(startTs).getTime()) / 1000;
}
const card = { background: N.surface, border: `1px solid ${N.border}`, borderRadius: N.radiusMd, boxShadow: N.shadowSm };

function KpiCard({ label, value, sub }) {
  return (
    <div style={{ ...card, padding: '18px 20px' }}>
      <div style={{ fontSize: '13px', fontWeight: 800, color: N.text600 }}>{label}</div>
      <div style={{ fontFamily: N.font, fontSize: '25px', fontWeight: 900, marginTop: '6px', color: N.text900 }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', fontWeight: 700, color: N.text500, marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

function InfoBanner({ text, tone = 'accent' }) {
  const bg = tone === 'amber' ? N.amberBg : N.surface;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px', background: bg,
      border: `1px solid ${tone === 'amber' ? 'transparent' : N.border}`, borderRadius: N.radiusMd,
      padding: '14px 18px', fontSize: '14px', fontWeight: 700, lineHeight: 1.6,
      color: tone === 'amber' ? N.amberText : N.text700,
    }}>
      <span style={{ fontSize: '16px' }}>{tone === 'amber' ? '⚠️' : '💡'}</span>
      <span>{text}</span>
    </div>
  );
}

function ChartTooltip({ active, payload, label, suffix }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: N.text900, color: '#fff', borderRadius: '4px', padding: '7px 11px', fontSize: '12px', fontWeight: 700, fontFamily: N.font }}>
      <div style={{ marginBottom: '3px', opacity: 0.75 }}>{label}</div>
      {payload.map((p) => <div key={p.dataKey}>{p.name}: {p.value}{suffix}</div>)}
    </div>
  );
}

export function LevelingProcessDashboardScreen() {
  const [date, setDate] = useState('2026-08-11' <= todayKST() ? '2026-08-11' : todayKST());
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState(null);

  const [details, setDetails] = useState({}); // product_name -> detail json
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [greenpRows, setGreenpRows] = useState([]);

  const [selectedCoil, setSelectedCoil] = useState(null);
  const [rhythm, setRhythm] = useState(null);
  const [loadingRhythm, setLoadingRhythm] = useState(false);
  const [rhythmError, setRhythmError] = useState(null);

  // 1) 날짜별 코일ID 태깅된 레벨링 작업 목록
  useEffect(() => {
    let cancelled = false;
    setJobs([]); setDetails({}); setSelectedCoil(null); setRhythm(null); setGreenpRows([]);
    (async () => {
      setLoadingJobs(true);
      setJobsError(null);
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/leveler-explore?leveling_date=${date}`);
        const json = await res.json();
        if (cancelled) return;
        if (!json.ok) throw new Error(json.error || '목록을 불러오지 못했습니다.');
        setJobs(json.rows || []);
      } catch (e) {
        if (!cancelled) setJobsError(e.message || String(e));
      }
      if (!cancelled) setLoadingJobs(false);
    })();
    return () => { cancelled = true; };
  }, [date]);

  // 2) 코일별 상세(전체+박스) 병렬 조회 + 그린ERP 확정 매출 조회
  useEffect(() => {
    if (jobs.length === 0) return;
    let cancelled = false;
    (async () => {
      setLoadingDetails(true);
      const entries = await Promise.all(jobs.map(async (j) => {
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/leveler-explore?leveling_coil_id=${encodeURIComponent(j.product_name)}&leveling_work_date=${date}`);
          const json = await res.json();
          return [j.product_name + '|' + j.update_time, json.ok ? json : null];
        } catch {
          return [j.product_name + '|' + j.update_time, null];
        }
      }));
      if (cancelled) return;
      setDetails(Object.fromEntries(entries));
      setLoadingDetails(false);

      const { data } = await supabase
        .from('greenp_production')
        .select('company_name, amount')
        .eq('slip_date', date)
        .eq('work_type', 'LEVELLING');
      if (!cancelled) setGreenpRows(data || []);
    })();
    return () => { cancelled = true; };
  }, [jobs, date]);

  // 3) 선택한 코일의 공정 리듬(시간 버킷별 부하율·사이클타임)
  useEffect(() => {
    if (!selectedCoil) { setRhythm(null); return; }
    let cancelled = false;
    (async () => {
      setLoadingRhythm(true);
      setRhythmError(null);
      setRhythm(null);
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/leveler-explore?leveling_rhythm=${encodeURIComponent(selectedCoil)}&leveling_work_date=${date}`);
        const json = await res.json();
        if (cancelled) return;
        if (!json.ok) throw new Error(json.error || '공정 리듬 데이터를 불러오지 못했습니다.');
        setRhythm(json);
      } catch (e) {
        if (!cancelled) setRhythmError(e.message || String(e));
      }
      if (!cancelled) setLoadingRhythm(false);
    })();
    return () => { cancelled = true; };
  }, [selectedCoil, date]);

  const jobKey = (j) => j.product_name + '|' + j.update_time;

  // 코일별 요약 리스트 (상세가 로딩된 것만)
  const coilSummaries = useMemo(() => {
    return jobs.map((j) => {
      const d = details[jobKey(j)];
      const overall = d?.overall || null;
      const dur = overall ? durationSec(overall.start_ts, overall.end_ts) : null;
      return {
        job: j,
        key: jobKey(j),
        detail: d,
        overall,
        dur,
        load: overall?.avg_load != null ? Number(overall.avg_load) : null,
        cycle: overall?.avg_cycle != null ? Number(overall.avg_cycle) : null,
        sheets: overall?.estimated_sheets ?? null,
        boxCount: d?.boxes?.length || 0,
      };
    });
  }, [jobs, details]);

  const summary = useMemo(() => {
    const doneCount = jobs.filter((j) => j.status === '완료').length;
    const totalWeight = jobs.reduce((a, j) => a + Number(j.original_weight || 0), 0);
    const totalDurSec = coilSummaries.reduce((a, c) => a + (c.dur || 0), 0);
    const totalSheets = coilSummaries.reduce((a, c) => a + (c.sheets || 0), 0);
    const greenpTotal = greenpRows.reduce((a, r) => a + Number(r.amount || 0), 0);
    const erpDoneAmount = jobs.filter((j) => j.status === '완료').reduce((a, j) => a + Number(j.amount || 0), 0);
    return { doneCount, totalCount: jobs.length, totalWeight, totalDurSec, totalSheets, greenpTotal, erpDoneAmount };
  }, [jobs, coilSummaries, greenpRows]);

  // 타임라인용 윈도우(가장 이른 시작 ~ 가장 늦은 종료, 여유 10분)
  const timeline = useMemo(() => {
    const spans = [];
    coilSummaries.forEach((c, i) => {
      if (!c.detail?.boxes?.length) {
        if (c.overall?.start_ts && c.overall?.end_ts) {
          spans.push({ label: `${c.job.product_name} · ${c.job.company_name}`, sub: c.job.status, start: c.overall.start_ts, end: c.overall.end_ts, color: COIL_COLORS[i % COIL_COLORS.length] });
        }
      } else {
        c.detail.boxes.forEach((b) => {
          spans.push({ label: `${c.job.product_name} (박스 ${b.box_idx})`, sub: c.job.company_name, start: b.start_ts, end: b.end_ts, color: COIL_COLORS[i % COIL_COLORS.length] });
        });
      }
    });
    if (spans.length === 0) return { spans: [], winStart: null, winEnd: null };
    const starts = spans.map((s) => new Date(s.start).getTime());
    const ends = spans.map((s) => new Date(s.end).getTime());
    const winStart = Math.min(...starts) - 10 * 60000;
    const winEnd = Math.max(...ends) + 10 * 60000;
    return { spans, winStart, winEnd };
  }, [coilSummaries]);

  const loadChartData = useMemo(() => coilSummaries
    .filter((c) => c.load != null)
    .map((c, i) => ({ name: c.job.product_name, load: c.load, fill: COIL_COLORS[i % COIL_COLORS.length] })), [coilSummaries]);

  const rhythmLoadData = useMemo(() => (rhythm?.points || []).map((p) => ({ t: p.t, load: p.avg_load != null ? Number(p.avg_load) : null })), [rhythm]);
  const rhythmCycleData = useMemo(() => (rhythm?.points || []).map((p) => ({ t: p.t, cycle: p.avg_cycle != null ? Number(p.avg_cycle) : null })), [rhythm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px', fontFamily: N.font, background: N.bg, margin: '-24px', padding: '32px 36px 56px', borderRadius: '18px' }}>
      <div>
        <h1 style={{ fontWeight: 900, fontSize: '34px', margin: '0 0 8px', color: N.text900 }}>🏭 레벨링 공정 × ERP 통합 대시보드</h1>
        <p style={{ fontSize: '15.5px', fontWeight: 700, color: N.text700, lineHeight: 1.6, maxWidth: '820px', margin: 0 }}>
          그날 코일ID가 태깅된 레벨링 작업의 ERP 사양과 PLC 실측(가동시간·사이클타임·부하율)을 모아 타임라인, 코일별 상세, 공정 리듬, 그린ERP 매출 대조까지 한 화면에서 보여줍니다.
        </p>
      </div>

      <InfoBanner text="코일ID 태깅은 2026-08-10~11부터 시작된 초기 단계라 하루에 코일이 몇 건 없는 날이 많습니다. 시트 수는 실측 카운터가 아니라 (소요시간 / 평균 사이클타임)으로 추정한 값입니다." />

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '15px', color: N.text700, fontWeight: 900 }}>날짜</span>
        <input
          type="date" value={date} max={todayKST()} onChange={(e) => setDate(e.target.value)}
          style={{ fontSize: '18px', fontWeight: 900, background: N.surface, border: `1px solid ${N.border}`, borderRadius: N.radiusMd, padding: '9px 16px', color: N.text900, colorScheme: 'light' }}
        />
      </div>

      {loadingJobs ? (
        <div style={{ color: N.text500, fontSize: '15px', fontWeight: 800 }}>목록 불러오는 중...</div>
      ) : jobsError ? (
        <div style={{ ...card, padding: '16px 20px', color: N.amberText, background: N.amberBg, fontWeight: 700, fontSize: '14px' }}>{jobsError}</div>
      ) : jobs.length === 0 ? (
        <div style={{ ...card, padding: '20px 24px', color: N.text500, fontWeight: 700, fontSize: '14.5px' }}>이 날짜엔 코일ID가 태깅된 레벨링 작업이 없습니다.</div>
      ) : (
        <>
          {/* KPI 요약 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
            <KpiCard label="총 코일" value={`${summary.totalCount}건`} sub={`완료 ${summary.doneCount} · 준비 ${summary.totalCount - summary.doneCount}`} />
            <KpiCard label="총 중량" value={`${(summary.totalWeight / 1000).toFixed(2)}톤`} sub="original_weight 합산" />
            <KpiCard label="그린ERP 확정 매출" value={fmtWon(summary.greenpTotal)} sub={`작업지시 완료금액 ${fmtWon(summary.erpDoneAmount)}`} />
            <KpiCard label="총 가동시간" value={fmtDurationSec(summary.totalDurSec)} sub={summary.totalSheets ? `추정 ${fmtNum(summary.totalSheets)}매` : '집계중'} />
          </div>

          {loadingDetails && <div style={{ color: N.text500, fontSize: '14px', fontWeight: 800 }}>코일별 실측 상세를 모으는 중...</div>}

          {/* 타임라인 */}
          {timeline.spans.length > 0 && (
            <div style={{ ...card, padding: '18px 22px' }}>
              <div style={{ fontSize: '14.5px', fontWeight: 900, color: N.text900, marginBottom: '12px' }}>
                코일별 가동 타임라인 ({fmtHM(new Date(timeline.winStart).toISOString())}~{fmtHM(new Date(timeline.winEnd).toISOString())})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {timeline.spans.map((s, i) => {
                  const total = timeline.winEnd - timeline.winStart;
                  const left = ((new Date(s.start).getTime() - timeline.winStart) / total) * 100;
                  const width = Math.max(0.6, ((new Date(s.end).getTime() - new Date(s.start).getTime()) / total) * 100);
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: N.text500, fontWeight: 700, marginBottom: '3px' }}>
                        <span>{s.label} · {s.sub}</span>
                        <span>{fmtHM(s.start)}~{fmtHM(s.end)}</span>
                      </div>
                      <div style={{ position: 'relative', height: '16px', background: N.bg, borderRadius: '4px' }}>
                        <div style={{ position: 'absolute', left: `${left}%`, width: `${width}%`, height: '100%', background: s.color, borderRadius: '4px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 코일별 상세 카드 (선택 가능) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
            {coilSummaries.map((c, i) => {
              const active = selectedCoil === c.job.product_name;
              return (
                <div
                  key={c.key}
                  onClick={() => setSelectedCoil(c.job.product_name)}
                  style={{
                    ...card, padding: '16px 18px', cursor: 'pointer',
                    borderColor: active ? COIL_COLORS[i % COIL_COLORS.length] : N.border,
                    borderWidth: active ? '2px' : '1px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '15px', fontWeight: 900, color: N.text900 }}>{c.job.product_name}</div>
                    <span style={{ fontSize: '11.5px', fontWeight: 900, padding: '2px 10px', borderRadius: '999px', background: c.job.status === '완료' ? N.greenBg : N.amberBg, color: c.job.status === '완료' ? N.green : N.amberText }}>{c.job.status}</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: N.text600, fontWeight: 700, margin: '4px 0 10px' }}>{c.job.company_name} · {c.job.specification} · {fmtNum(c.job.original_weight)}kg</div>
                  {c.overall ? (
                    <table style={{ width: '100%', fontSize: '12.5px' }}>
                      <tbody>
                        <tr><td style={{ color: N.text500, padding: '2px 0' }}>가동시간</td><td style={{ textAlign: 'right', fontWeight: 800 }}>{fmtDurationSec(c.dur)}</td></tr>
                        <tr><td style={{ color: N.text500, padding: '2px 0' }}>평균 사이클</td><td style={{ textAlign: 'right', fontWeight: 800 }}>{c.cycle != null ? `${c.cycle}초` : '-'}</td></tr>
                        <tr><td style={{ color: N.text500, padding: '2px 0' }}>평균 부하율</td><td style={{ textAlign: 'right', fontWeight: 800 }}>{c.load != null ? `${c.load}%` : '-'}</td></tr>
                        <tr><td style={{ color: N.text500, padding: '2px 0' }}>추정 시트수</td><td style={{ textAlign: 'right', fontWeight: 800 }}>{c.sheets != null ? `${fmtNum(c.sheets)}매` : '집계중'}</td></tr>
                        <tr><td style={{ color: N.text500, padding: '2px 0' }}>박스 구간</td><td style={{ textAlign: 'right', fontWeight: 800 }}>{c.boxCount > 0 ? `${c.boxCount}개` : '미태깅'}</td></tr>
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ fontSize: '12.5px', color: N.text500, fontWeight: 700 }}>{loadingDetails ? '불러오는 중...' : 'PLC 실측 기록이 없습니다.'}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 부하율 비교 */}
          {loadChartData.length > 0 && (
            <div style={{ ...card, padding: '18px 22px' }}>
              <div style={{ fontSize: '14.5px', fontWeight: 900, color: N.text900, marginBottom: '10px' }}>코일별 평균 인버터 부하율</div>
              <div style={{ width: '100%', height: Math.max(120, loadChartData.length * 42) }}>
                <ResponsiveContainer>
                  <BarChart data={loadChartData} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 0 }}>
                    <CartesianGrid stroke={N.borderLight} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12, fill: N.text500, fontFamily: N.font }} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: N.text700, fontFamily: N.font, fontWeight: 700 }} />
                    <Tooltip content={<ChartTooltip suffix="%" />} />
                    <Bar dataKey="load" name="평균 부하율" radius={[0, 4, 4, 0]}>
                      {loadChartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 공정 리듬 (선택한 코일) */}
          {selectedCoil && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '16px', fontWeight: 900, color: N.text900 }}>{selectedCoil} 공정 리듬</div>
              {loadingRhythm && <div style={{ color: N.text500, fontSize: '14px', fontWeight: 800 }}>공정 리듬 데이터를 불러오는 중...</div>}
              {rhythmError && <div style={{ ...card, padding: '14px 18px', color: N.amberText, background: N.amberBg, fontWeight: 700, fontSize: '13.5px' }}>{rhythmError}</div>}
              {rhythm && (
                <>
                  {rhythm.flagged_flat_segments?.length > 0 && (
                    <InfoBanner
                      tone="amber"
                      text={`${rhythm.flagged_flat_segments.map((f) => `${f.from_t}~${f.to_t}(${f.len}개 구간)`).join(', ')} 동안 부하율·사이클타임이 완전히 동일한 값으로 연속 기록됨 — 실제 정속 구간일 수도 있지만 PLC 값이 고정(freeze)됐을 가능성도 있어 확인이 필요합니다.`}
                    />
                  )}
                  <div style={{ ...card, padding: '18px 22px' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 900, color: N.text900, marginBottom: '10px' }}>인버터 부하율 추이 ({rhythm.bucket_sec >= 60 ? `${rhythm.bucket_sec / 60}분` : `${rhythm.bucket_sec}초`} 평균, %)</div>
                    <div style={{ width: '100%', height: 190 }}>
                      <ResponsiveContainer>
                        <LineChart data={rhythmLoadData} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
                          <CartesianGrid stroke={N.borderLight} vertical={false} />
                          <XAxis dataKey="t" tick={{ fontSize: 11, fill: N.text500, fontFamily: N.font }} interval="preserveStartEnd" minTickGap={24} />
                          <YAxis tick={{ fontSize: 12, fill: N.text500, fontFamily: N.font }} />
                          <Tooltip content={<ChartTooltip suffix="%" />} />
                          {rhythm.flagged_flat_segments?.map((f, i) => (
                            <ReferenceArea key={i} x1={f.from_t} x2={f.to_t} fill={N.amber} fillOpacity={0.08} />
                          ))}
                          <Line type="monotone" dataKey="load" name="부하율" stroke={N.accent500} strokeWidth={2.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div style={{ ...card, padding: '18px 22px' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 900, color: N.text900, marginBottom: '10px' }}>사이클타임 추이 ({rhythm.bucket_sec >= 60 ? `${rhythm.bucket_sec / 60}분` : `${rhythm.bucket_sec}초`} 평균, 초/행정)</div>
                    <div style={{ width: '100%', height: 190 }}>
                      <ResponsiveContainer>
                        <LineChart data={rhythmCycleData} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
                          <CartesianGrid stroke={N.borderLight} vertical={false} />
                          <XAxis dataKey="t" tick={{ fontSize: 11, fill: N.text500, fontFamily: N.font }} interval="preserveStartEnd" minTickGap={24} />
                          <YAxis tick={{ fontSize: 12, fill: N.text500, fontFamily: N.font }} />
                          <Tooltip content={<ChartTooltip suffix="초" />} />
                          {rhythm.flagged_flat_segments?.map((f, i) => (
                            <ReferenceArea key={i} x1={f.from_t} x2={f.to_t} fill={N.amber} fillOpacity={0.08} />
                          ))}
                          <Line type="monotone" dataKey="cycle" name="사이클타임" stroke="#eb6834" strokeWidth={2.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ERP 작업지시 vs 그린ERP 매출 대조 */}
          <div style={{ ...card, padding: '18px 22px' }}>
            <div style={{ fontSize: '14.5px', fontWeight: 900, color: N.text900, marginBottom: '4px' }}>ERP 작업지시 vs 그린ERP 매출 동기화</div>
            <div style={{ fontSize: '12px', color: N.text500, fontWeight: 700, marginBottom: '12px' }}>코일 단위로 직접 매칭할 키가 없어 업체명 기준으로 합산 대조합니다 (참고용).</div>
            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: N.text500, fontSize: '12px' }}>
                  <td style={{ padding: '4px 0' }}>업체</td>
                  <td style={{ textAlign: 'right' }}>작업지시 완료금액</td>
                  <td style={{ textAlign: 'right' }}>그린ERP 확정 매출</td>
                  <td style={{ textAlign: 'right' }}>상태</td>
                </tr>
              </thead>
              <tbody>
                {Object.values(jobs.filter((j) => j.status === '완료').reduce((acc, j) => {
                  const key = j.company_name;
                  if (!acc[key]) acc[key] = { company: key, erp: 0 };
                  acc[key].erp += Number(j.amount || 0);
                  return acc;
                }, {})).map((row) => {
                  const greenpAmt = greenpRows.filter((g) => g.company_name === row.company).reduce((a, g) => a + Number(g.amount || 0), 0);
                  const synced = greenpAmt > 0;
                  return (
                    <tr key={row.company} style={{ borderTop: `1px solid ${N.borderLight}` }}>
                      <td style={{ padding: '7px 0', fontWeight: 800, color: N.text900 }}>{row.company}</td>
                      <td style={{ textAlign: 'right' }}>{fmtWon(row.erp)}</td>
                      <td style={{ textAlign: 'right' }}>{synced ? fmtWon(greenpAmt) : '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: synced ? N.green : N.amberText }}>{synced ? '확정' : '미동기화'}</td>
                    </tr>
                  );
                })}
                {jobs.filter((j) => j.status === '완료').length === 0 && (
                  <tr><td colSpan={4} style={{ padding: '10px 0', color: N.text500, fontWeight: 700 }}>완료된 작업이 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
