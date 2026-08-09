// src/pages/test/coilAnalysisScreen.jsx
// 코일 작업 상세 분석 — 슬리팅2(슬리터) 라인 실데이터 연동 프로토타입.
//
// 데이터 흐름:
//  1) 날짜 선택 시, 그날 작업된 슬리팅/슬리팅2 코일 목록을 Supabase(leveler_jobs, 10분 주기 미러)에서 조회합니다.
//  2) 코일을 선택하면 leveler-explore Edge Function(coil_id 모드)이 그 자리에서 레벨러 시스템 MariaDB의
//     erp_data(사양·중량·거래처)와 plc_data(코일 진행 중 2~3초 간격으로 기록된 실측 속도·텐션)를
//     COIL_ID로 조인해, 길이 구간별 평균 속도/텐션 프로파일과 동일 사양(두께 ±0.03mm) 완료 코일 대비
//     평균속도 편차를 계산해 반환합니다. (원본 테이블은 매우 커서 프론트에서 직접 긁지 않고,
//     Edge Function이 서버 사이드에서 구간 집계까지 마쳐서 내려줍니다.)
//
// 범위: 레벨링 라인은 원본 COIL_ID 필드가 아직 기본값만 기록되어 있어(2026년 8월 기준) 이 화면에서는
// 슬리팅1·슬리팅2만 다룹니다. 레벨링 쪽 COIL_ID가 채워지기 시작하면 동일한 방식으로 확장할 수 있습니다.
import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { fmtNum } from './theme';
import { supabase, supabaseUrl } from '../../supabaseClient';

// --- Nocturne 디자인 토큰 (작업현황 대시보드와 동일 계열, 이 화면 전용으로 로컬 정의) ---
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
  green: 'oklch(66% 0.13 150)',
  greenBg: 'oklch(66% 0.13 150 / 14%)',
  red: 'oklch(63% 0.19 25)',
  redBg: 'oklch(63% 0.19 25 / 12%)',
  amber: 'oklch(70% 0.15 65)',
  radiusSm: '4px',
  radiusMd: '8px',
  radiusLg: '14px',
  shadowSm: '0 1px 2px rgba(41,43,49,0.06)',
  shadowMd: '0 1px 2px rgba(41,43,49,0.04), 0 8px 24px rgba(41,43,49,0.07)',
  font: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const TENSION_COLORS = ['#378ADD', '#EB6834', '#1BAF7A', '#EDA100'];

function shade(color, amt = 30) {
  return `color-mix(in srgb, ${color} ${100 - amt}%, black)`;
}

function todayKST() {
  const now = new Date();
  const kstMs = now.getTime() + 9 * 3600000;
  return new Date(kstMs).toISOString().slice(0, 10);
}

function fmtClock(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  const kst = new Date(d.getTime() + 9 * 3600000);
  const hh = String(kst.getUTCHours()).padStart(2, '0');
  const mm = String(kst.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function fmtDuration(startTs, endTs) {
  if (!startTs || !endTs) return '-';
  const ms = new Date(endTs).getTime() - new Date(startTs).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '-';
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin}분`;
  return `${Math.floor(totalMin / 60)}시간 ${totalMin % 60}분`;
}

function thicknessOf(spec) {
  if (!spec) return null;
  const n = parseFloat(String(spec).split(/x/i)[0]);
  return Number.isNaN(n) ? null : n;
}

function InfoBanner({ text }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      background: N.surface, border: `1px solid ${N.border}`, borderRadius: N.radiusMd,
      padding: '16px 20px', fontSize: '15.5px', fontWeight: 700, lineHeight: 1.6, color: N.text700,
    }}>
      <span style={{ fontSize: '18px' }}>💡</span>
      <span>{text}</span>
    </div>
  );
}

const card = {
  background: N.surface,
  border: `1px solid ${N.border}`,
  borderRadius: N.radiusMd,
  boxShadow: N.shadowSm,
};

function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{ ...card, padding: '18px 20px' }}>
      <div style={{ fontSize: '13.5px', fontWeight: 800, color: N.text600 }}>{label}</div>
      <div style={{ fontFamily: N.font, fontSize: '26px', fontWeight: 900, marginTop: '6px', color: color || N.text900 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '12.5px', fontWeight: 700, color: N.text500, marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

function ChartTooltip({ active, payload, label, suffix }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: N.text900, color: '#fff', borderRadius: N.radiusSm, padding: '8px 12px',
      fontSize: '12.5px', fontWeight: 700, fontFamily: N.font,
    }}>
      <div style={{ marginBottom: '4px', opacity: 0.75 }}>{label}m 지점</div>
      {payload.map((p) => (
        <div key={p.dataKey}>{p.name}: {p.value}{suffix}</div>
      ))}
    </div>
  );
}

export function CoilAnalysisScreen() {
  const [date, setDate] = useState(todayKST());
  const [coils, setCoils] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoadingList(true);
      setListError(null);
      setSelectedId(null);
      setDetail(null);
      const { data, error } = await supabase
        .from('leveler_jobs')
        .select('source_id, company_name, product_name, specification, original_weight, work_type, status, update_time')
        .eq('work_date', date)
        .in('work_type', ['SLITING', 'SLITING2'])
        .order('update_time', { ascending: false });
      if (cancelled) return;
      if (error) {
        setListError(error.message);
      } else {
        setCoils(data || []);
        if (data && data.length > 0) setSelectedId(data[0].product_name);
      }
      setLoadingList(false);
    }
    run();
    return () => { cancelled = true; };
  }, [date]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    async function run() {
      setLoadingDetail(true);
      setDetailError(null);
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/leveler-explore?coil_id=${encodeURIComponent(selectedId)}`);
        const json = await res.json();
        if (cancelled) return;
        if (!json.ok) {
          setDetailError(json.error || '데이터를 불러오지 못했습니다.');
          setDetail(json);
        } else {
          setDetail(json);
        }
      } catch (e) {
        if (!cancelled) setDetailError(e.message);
      }
      if (!cancelled) setLoadingDetail(false);
    }
    run();
    return () => { cancelled = true; };
  }, [selectedId]);

  const filteredCoils = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return coils;
    return coils.filter((c) => (
      (c.product_name || '').toLowerCase().includes(q)
      || (c.company_name || '').toLowerCase().includes(q)
    ));
  }, [coils, search]);

  const speedData = useMemo(() => {
    if (!detail?.speedProfile) return [];
    return detail.speedProfile.map((r) => ({ len: r.len_bucket, speed: r.speed }));
  }, [detail]);

  const tensionData = useMemo(() => {
    if (!detail?.tensionProfile) return [];
    return detail.tensionProfile.map((r) => ({ len: r.len_bucket, t1: r.t1, t2: r.t2, t3: r.t3, t4: r.t4 }));
  }, [detail]);

  const delta = useMemo(() => {
    if (!detail?.group || !detail?.summary?.avg_speed) return null;
    const mine = Number(detail.summary.avg_speed);
    const grp = Number(detail.group.groupAvgSpeed);
    if (!grp) return null;
    const pct = Math.round(((mine - grp) / grp) * 100);
    return { pct, faster: pct >= 0, groupCount: detail.group.groupCount };
  }, [detail]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: N.font, background: N.bg, margin: '-24px', padding: '32px 36px 56px', borderRadius: '18px' }}>
      <style>{`
        .coil-date-input { font-family: ${N.font}; }
        .coil-card-item:hover { border-color: ${N.accent500} !important; }
      `}</style>

      <div>
        <h1 style={{ fontFamily: N.font, fontWeight: 900, fontSize: '34px', margin: '0 0 8px 0', letterSpacing: '-0.01em', color: N.text900 }}>
          🧭 코일 작업 상세 분석
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.6, color: N.text700, maxWidth: '760px', margin: 0 }}>
          날짜와 코일을 선택하면 그 코일이 실제로 어떻게 가공됐는지 — 길이 구간별 속도·텐션 변화와 동일 사양 대비 편차를 보여줍니다.
        </p>
      </div>

      <InfoBanner text="슬리팅2 라인 PLC 원시 데이터(plc_data)와 그린ERP 작업정보(erp_data)를 코일ID로 실시간 조인하는 프로토타입입니다. 코일 목록은 leveler_jobs(10분 주기 미러)에서, 선택한 코일의 상세 그래프는 leveler-explore Edge Function이 그 자리에서 원본 DB를 조회해 계산합니다. 레벨링 라인은 코일ID가 아직 기록되지 않아 대상에서 제외했습니다." />

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '16px', color: N.text700, fontWeight: 900 }}>날짜</span>
        <input
          className="coil-date-input"
          type="date"
          value={date}
          max={todayKST()}
          onChange={(e) => setDate(e.target.value)}
          style={{
            fontSize: '18px', fontWeight: 900, background: N.surface, border: `1px solid ${N.border}`,
            borderRadius: N.radiusMd, padding: '9px 18px', color: N.text900, colorScheme: 'light',
          }}
        />
        {date !== todayKST() && (
          <button
            onClick={() => setDate(todayKST())}
            style={{
              fontFamily: N.font, fontSize: '15px', fontWeight: 900, color: N.accent600,
              background: N.accent100, border: `1px solid ${N.accent200}`, borderRadius: N.radiusMd,
              padding: '9px 16px', cursor: 'pointer',
            }}
          >
            오늘로
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0,1fr)', gap: '20px', alignItems: 'flex-start' }}>
        {/* 좌측: 코일 검색/목록 */}
        <div style={{ ...card, padding: '18px' }}>
          <input
            type="text"
            placeholder="코일ID 또는 거래처 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box', fontFamily: N.font, fontSize: '14px', fontWeight: 700,
              padding: '9px 12px', borderRadius: N.radiusMd, border: `1px solid ${N.border}`, marginBottom: '14px',
              color: N.text900,
            }}
          />
          <div style={{ fontSize: '12.5px', fontWeight: 800, color: N.text500, marginBottom: '10px' }}>
            {loadingList ? '불러오는 중...' : `${filteredCoils.length}건`}
          </div>
          {listError && <div style={{ color: shade(N.red, 10), fontSize: '13px', fontWeight: 700 }}>{listError}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '560px', overflowY: 'auto' }}>
            {filteredCoils.map((c) => {
              const active = c.product_name === selectedId;
              return (
                <div
                  key={c.source_id}
                  className="coil-card-item"
                  onClick={() => setSelectedId(c.product_name)}
                  style={{
                    cursor: 'pointer', borderRadius: N.radiusMd, padding: '10px 12px',
                    border: `1px solid ${active ? N.accent500 : N.border}`,
                    background: active ? N.accent100 : N.bg,
                  }}
                >
                  <div style={{ fontSize: '13.5px', fontWeight: 900, color: N.text900 }}>{c.product_name}</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: N.text600, marginTop: '2px' }}>
                    {c.company_name} · {c.specification}
                  </div>
                </div>
              );
            })}
            {!loadingList && filteredCoils.length === 0 && (
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: N.text500, padding: '10px 0' }}>
                해당 날짜에 슬리팅 작업이 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 우측: 상세 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {!selectedId && (
            <div style={{ ...card, padding: '40px', textAlign: 'center', color: N.text500, fontWeight: 700 }}>
              좌측에서 코일을 선택하세요.
            </div>
          )}

          {selectedId && loadingDetail && (
            <div style={{ ...card, padding: '40px', textAlign: 'center', color: N.text500, fontWeight: 700 }}>
              불러오는 중...
            </div>
          )}

          {selectedId && !loadingDetail && detailError && (
            <div style={{ ...card, padding: '28px', color: shade(N.red, 10), fontWeight: 700 }}>
              {detailError}
            </div>
          )}

          {selectedId && !loadingDetail && detail?.ok && (
            <>
              <div style={{ ...card, padding: '22px 26px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ fontFamily: N.font, fontSize: '22px', fontWeight: 900, color: N.text900 }}>{detail.coil_id}</span>
                      <span style={{
                        fontSize: '12.5px', fontWeight: 900, padding: '3px 12px', borderRadius: '999px',
                        background: detail.erp?.status === '완료' ? N.greenBg : N.accent100,
                        color: detail.erp?.status === '완료' ? shade(N.green, 30) : N.accent600,
                      }}>
                        {detail.erp?.status || '-'}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: N.text600 }}>
                      {detail.erp?.company_name} · {detail.erp?.specification} · {fmtNum(detail.erp?.original_weight)}kg · {fmtClock(detail.summary.start_ts)}~{fmtClock(detail.summary.end_ts)} ({fmtDuration(detail.summary.start_ts, detail.summary.end_ts)})
                    </div>
                  </div>
                  <span style={{
                    fontSize: '12.5px', fontWeight: 900, padding: '4px 13px', borderRadius: '999px',
                    background: N.accent100, color: N.accent600,
                  }}>
                    {detail.erp?.work_type === 'SLITING2' ? '슬리팅2' : '슬리팅1'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                <KpiCard label="평균속도" value={`${detail.summary.avg_speed} m/min`} />
                <KpiCard label="최고속도" value={`${detail.summary.max_speed} m/min`} />
                <KpiCard label="총 가공길이" value={`${detail.summary.max_length}m`} />
                <KpiCard
                  label="동일 사양 대비"
                  value={delta ? `${delta.faster ? '+' : ''}${delta.pct}%` : '비교 데이터 부족'}
                  sub={delta ? `${detail.group.groupCount}건 평균(${detail.group.groupAvgSpeed} m/min) 대비` : null}
                  color={delta ? (delta.faster ? shade(N.green, 30) : shade(N.red, 10)) : N.text500}
                />
              </div>

              <div style={{ ...card, padding: '20px 22px' }}>
                <div style={{ fontSize: '14.5px', fontWeight: 900, color: N.text900, marginBottom: '12px' }}>길이별 속도 변화</div>
                <div style={{ width: '100%', height: 230 }}>
                  <ResponsiveContainer>
                    <LineChart data={speedData} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
                      <CartesianGrid stroke={N.borderLight} vertical={false} />
                      <XAxis dataKey="len" tick={{ fontSize: 12, fill: N.text500, fontFamily: N.font }} tickFormatter={(v) => `${v}m`} />
                      <YAxis tick={{ fontSize: 12, fill: N.text500, fontFamily: N.font }} />
                      <Tooltip content={<ChartTooltip suffix=" m/min" />} />
                      <Line type="monotone" dataKey="speed" name="속도" stroke={N.accent500} strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ ...card, padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ fontSize: '14.5px', fontWeight: 900, color: N.text900 }}>길이별 텐션 변화 (4존)</div>
                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                    {['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4'].map((label, i) => (
                      <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 800, color: N.text600 }}>
                        <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: TENSION_COLORS[i] }} />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ width: '100%', height: 230 }}>
                  <ResponsiveContainer>
                    <LineChart data={tensionData} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
                      <CartesianGrid stroke={N.borderLight} vertical={false} />
                      <XAxis dataKey="len" tick={{ fontSize: 12, fill: N.text500, fontFamily: N.font }} tickFormatter={(v) => `${v}m`} />
                      <YAxis tick={{ fontSize: 12, fill: N.text500, fontFamily: N.font }} />
                      <Tooltip content={<ChartTooltip suffix="" />} />
                      <Line type="monotone" dataKey="t1" name="Zone 1" stroke={TENSION_COLORS[0]} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="t2" name="Zone 2" stroke={TENSION_COLORS[1]} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="t3" name="Zone 3" stroke={TENSION_COLORS[2]} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="t4" name="Zone 4" stroke={TENSION_COLORS[3]} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {thicknessOf(detail.erp?.specification) !== null && !detail.group && (
                <div style={{ fontSize: '13px', fontWeight: 700, color: N.text500 }}>
                  동일 사양(두께 {thicknessOf(detail.erp?.specification)}mm) 완료 코일이 아직 충분하지 않아 편차 비교를 제공하지 못했습니다.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
