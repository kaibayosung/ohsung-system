// src/pages/test/levelingCoilDetailScreen.jsx
// 레벨링 코일 상세분석 — 실데이터 연동 프로토타입.
//
// 데이터 흐름: 레벨러 시스템(osungsteel.servehttp.com:33306, ohsung DB)의 erp_data(사양)와
// LEVELING_DATA(레벨링 라인 PLC 실측 텔레메트리)를 leveler-explore Edge Function이 COIL_ID로
// 조인해 그 자리에서 통계를 계산해 반환합니다. LEVELING_DATA에 코일ID가 실제로 태깅되기 시작한
// 것은 2026-08-10~11부터라 아직 표본이 매우 적습니다(정식 데이터 아닌 값 0000000000/111111111111/
// 색상명 오입력 등은 Edge Function에서 걸러냅니다). leveling_date 모드로 그날 태깅된 작업만 골라
// 목록에 보여주고, leveling_coil_id+leveling_work_date 모드로 코일 하나를 선택했을 때 전체/박스별
// 통계(사이클타임, 절단길이 보정폭, 인버터 부하, 박스별 시트 수 추정치)를 가져옵니다.
//
// "총 절단 시트 수"는 실측 카운터가 아니라 (구간 소요시간 / 평균 사이클타임)으로 추정한 값이라
// 화면에 "추정치"로 표시합니다. 길이 정확도(±1mm)·설비 부하(70%) 기준선은 공식 스펙이 아니라
// 참고용 기준값임을 함께 안내합니다.
import React, { useState, useEffect, useMemo } from 'react';
import { fmtNum } from './theme';
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
  accent200: '#e7e5fe',
  green: '#3B6D11',
  greenBg: '#EAF3DE',
  greenBand: '#C0DD97',
  blue: '#185FA5',
  amberBg: '#FAEEDA',
  amberText: '#633806',
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

function StatCard({ icon, value, label }) {
  return (
    <div style={{ ...card, padding: '18px', textAlign: 'center' }}>
      <div style={{ fontSize: '20px' }}>{icon}</div>
      <div style={{ fontFamily: N.font, fontSize: '26px', fontWeight: 900, margin: '8px 0 2px', color: N.text900 }}>{value}</div>
      <div style={{ fontSize: '13px', color: N.text600, fontWeight: 700 }}>{label}</div>
    </div>
  );
}

function RingCard({ title, sub, valueLabel, pct, ok, ring }) {
  return (
    <div style={{ ...card, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '20px' }}>
      <div style={{
        width: '96px', height: '96px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `conic-gradient(${ring} ${pct}%, ${N.borderLight} 0)`,
      }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: N.surface, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: N.font, fontSize: '17px', fontWeight: 900, color: N.text900 }}>{valueLabel}</span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: '15.5px', fontWeight: 900, color: N.text900, marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '13px', color: N.text600, fontWeight: 700 }}>{sub}</div>
        <div style={{ fontSize: '13px', fontWeight: 900, color: ok ? N.green : N.amberText, marginTop: '6px' }}>{ok ? '정상' : '주의'}</div>
      </div>
    </div>
  );
}

export function LevelingCoilDetailScreen() {
  const [date, setDate] = useState(todayKST());
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState(null);
  const [selected, setSelected] = useState(null); // { product_name, ... }

  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    let cancelled = false;
    setSelected(null);
    setDetail(null);
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

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setActiveTab('all');
    (async () => {
      setLoadingDetail(true);
      setDetailError(null);
      setDetail(null);
      try {
        const res = await fetch(
          `${supabaseUrl}/functions/v1/leveler-explore?leveling_coil_id=${encodeURIComponent(selected.product_name)}&leveling_work_date=${date}`,
        );
        const json = await res.json();
        if (cancelled) return;
        if (!json.ok) throw new Error(json.error || '상세 정보를 불러오지 못했습니다.');
        setDetail(json);
      } catch (e) {
        if (!cancelled) setDetailError(e.message || String(e));
      }
      if (!cancelled) setLoadingDetail(false);
    })();
    return () => { cancelled = true; };
  }, [selected, date]);

  const view = useMemo(() => {
    if (!detail) return null;
    const src = activeTab === 'all'
      ? detail.overall
      : detail.boxes.find((b) => String(b.box_idx) === activeTab) || detail.overall;
    const dur = activeTab === 'all'
      ? durationSec(detail.overall.start_ts, detail.overall.end_ts)
      : durationSec(src.start_ts, src.end_ts);
    const corr = src.avg_corr != null ? Number(src.avg_corr) : null;
    const load = src.avg_load != null ? Number(src.avg_load) : null;
    const corrTolPct = corr != null ? Math.min(100, Math.round((corr / 1) * 100)) : null;
    return {
      sheets: src.estimated_sheets != null ? `${fmtNum(src.estimated_sheets)}장` : '집계중',
      time: activeTab === 'all' ? fmtDurationSec(dur) : `${fmtHM(src.start_ts)}~${fmtHM(src.end_ts)}`,
      timeLabel: activeTab === 'all' ? '작업한 시간' : '작업 시간대',
      cycle: src.avg_cycle != null ? `${Number(src.avg_cycle).toFixed(1)}초` : '-',
      throughput: (dur && detail.erp.original_weight)
        ? `${fmtNum(Math.round((Number(detail.erp.original_weight) / dur) * 3600 * (src.cnt / detail.overall.cnt || 1)))}kg`
        : '-',
      corr, load, corrTolPct,
      corrOk: corr == null ? true : corr <= 1,
      loadOk: load == null ? true : load <= 70,
    };
  }, [detail, activeTab]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px', fontFamily: N.font, background: N.bg, margin: '-24px', padding: '32px 36px 56px', borderRadius: '18px' }}>
      <div>
        <h1 style={{ fontWeight: 900, fontSize: '34px', margin: '0 0 8px', color: N.text900 }}>🧭 레벨링 코일 상세분석</h1>
        <p style={{ fontSize: '15.5px', fontWeight: 700, color: N.text700, lineHeight: 1.6, maxWidth: '760px', margin: 0 }}>
          레벨링 라인 코일ID 태깅(2026-08-10~ 시작)이 된 작업만 골라, ERP 사양과 PLC 실측을 합쳐 전체/박스별로 보여줍니다.
        </p>
      </div>

      <div style={{ ...card, padding: '16px 20px', display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '14.5px', fontWeight: 700, color: N.text700, lineHeight: 1.6 }}>
        <span style={{ fontSize: '17px' }}>💡</span>
        <span>레벨링 코일ID 태깅이 막 시작된 초기 단계라, 대부분의 작업일에는 표시할 코일이 없을 수 있습니다. 시트 수는 실측 카운터가 아니라 (소요시간 / 평균 사이클타임)으로 추정한 값이고, 길이 정확도(±1mm)·설비 부하(70%) 기준은 참고용입니다.</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '15px', color: N.text700, fontWeight: 900 }}>날짜</span>
        <input
          type="date"
          value={date}
          max={todayKST()}
          onChange={(e) => setDate(e.target.value)}
          style={{
            fontSize: '18px', fontWeight: 900, background: N.surface, border: `1px solid ${N.border}`,
            borderRadius: N.radiusMd, padding: '9px 16px', color: N.text900, colorScheme: 'light',
          }}
        />
      </div>

      {loadingJobs ? (
        <div style={{ color: N.text500, fontSize: '15px', fontWeight: 800 }}>목록 불러오는 중...</div>
      ) : jobsError ? (
        <div style={{ ...card, padding: '16px 20px', color: N.amberText, background: N.amberBg, fontWeight: 700, fontSize: '14px' }}>{jobsError}</div>
      ) : jobs.length === 0 ? (
        <div style={{ ...card, padding: '20px 24px', color: N.text500, fontWeight: 700, fontSize: '14.5px' }}>이 날짜엔 코일ID가 태깅된 레벨링 작업이 없습니다.</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {jobs.map((j, i) => {
            const active = selected && selected.product_name === j.product_name && selected.update_time === j.update_time;
            return (
              <button
                key={`${j.product_name}-${i}`}
                onClick={() => setSelected(j)}
                style={{
                  fontFamily: N.font, cursor: 'pointer', textAlign: 'left', padding: '12px 16px', borderRadius: N.radiusMd,
                  border: `1.5px solid ${active ? N.accent500 : N.border}`, background: active ? N.accent100 : N.surface,
                }}
              >
                <div style={{ fontSize: '14.5px', fontWeight: 900, color: N.text900 }}>{j.product_name} · {j.company_name}</div>
                <div style={{ fontSize: '12.5px', color: N.text600, fontWeight: 700 }}>{j.specification} · {fmtNum(j.original_weight)}kg · {j.status}</div>
              </button>
            );
          })}
        </div>
      )}

      {loadingDetail && <div style={{ color: N.text500, fontSize: '15px', fontWeight: 800 }}>상세 데이터 불러오는 중...</div>}
      {detailError && <div style={{ ...card, padding: '16px 20px', color: N.amberText, background: N.amberBg, fontWeight: 700, fontSize: '14px' }}>{detailError}</div>}

      {detail && view && (
        <>
          <div style={{ background: N.greenBg, borderRadius: N.radiusLg, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '28px' }}>✅</span>
            <div>
              <div style={{ fontWeight: 900, fontSize: '18px', color: N.green }}>{detail.coil_id} · 문제없이 잘 끝났어요</div>
              <div style={{ fontSize: '13.5px', color: N.text700, fontWeight: 700, marginTop: '3px' }}>
                {detail.erp.company_name} · {detail.erp.specification} · {fmtNum(detail.erp.original_weight)}kg · {detail.work_date}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                fontFamily: N.font, fontSize: '14.5px', fontWeight: 900, padding: '9px 18px', borderRadius: N.radiusMd, cursor: 'pointer',
                border: `1px solid ${N.border}`, background: activeTab === 'all' ? N.text900 : 'transparent', color: activeTab === 'all' ? '#fff' : N.text900,
              }}
            >전체</button>
            {detail.boxes.map((b) => (
              <button
                key={b.box_idx}
                onClick={() => setActiveTab(String(b.box_idx))}
                style={{
                  fontFamily: N.font, fontSize: '14.5px', fontWeight: 900, padding: '9px 18px', borderRadius: N.radiusMd, cursor: 'pointer',
                  border: `1px solid ${N.border}`, background: activeTab === String(b.box_idx) ? N.text900 : 'transparent', color: activeTab === String(b.box_idx) ? '#fff' : N.text900,
                }}
              >{b.box_idx}번 박스</button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
            <StatCard icon="📦" value={view.sheets} label="잘라낸 시트 수 (추정)" />
            <StatCard icon="⏱️" value={view.time} label={view.timeLabel} />
            <StatCard icon="⚡" value={view.cycle} label="한 장 자르는 시간" />
            <StatCard icon="📊" value={view.throughput} label="시간당 처리량" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            <RingCard
              title="길이가 정확했나요" sub={`목표 ${detail.overall.avg_cutlen}mm · 허용오차 ±1mm (참고 기준)`}
              valueLabel={view.corr != null ? `${view.corr}mm` : '-'} pct={view.corrTolPct ?? 0}
              ok={view.corrOk} ring={N.green}
            />
            <RingCard
              title="설비에 무리가 갔나요" sub="모터 부하, 기준 70% 넘으면 주의 (참고 기준)"
              valueLabel={view.load != null ? `${view.load}%` : '-'} pct={view.load ?? 0}
              ok={view.loadOk} ring={N.blue}
            />
          </div>

          <div style={{ ...card, padding: '20px 24px' }}>
            <div style={{ fontSize: '16px', fontWeight: 900, color: N.text900, marginBottom: '14px' }}>박스별로 몇 장씩 담겼나요</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {detail.boxes.map((b) => (
                <div
                  key={b.box_idx}
                  onClick={() => setActiveTab(String(b.box_idx))}
                  style={{
                    borderRadius: N.radiusMd, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                    border: `2px solid ${activeTab === String(b.box_idx) ? N.accent500 : 'transparent'}`,
                    background: activeTab === String(b.box_idx) ? N.accent100 : N.bg,
                  }}
                >
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: N.accent200, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '19px', flexShrink: 0 }}>📦</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 900, color: N.text900 }}>{b.box_idx}번 박스</div>
                    <div style={{ fontFamily: N.font, fontSize: '18px', fontWeight: 900, color: N.text900, margin: '2px 0' }}>
                      {b.estimated_sheets != null ? `${fmtNum(b.estimated_sheets)}장` : '집계중'}
                    </div>
                    <div style={{ fontSize: '11.5px', color: N.text500, fontWeight: 700 }}>{fmtHM(b.start_ts)}~{fmtHM(b.end_ts)}</div>
                  </div>
                </div>
              ))}
              {detail.boxes.length === 0 && (
                <div style={{ fontSize: '14px', color: N.text500, fontWeight: 700 }}>박스 구분 정보가 없습니다.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
