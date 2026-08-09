// src/pages/test/coilAiHelperScreen.jsx
// 슬리팅2 AI 헬퍼 — 아직 가동 전인 작업지시서를 선택하면, 동일 사양(두께 ±0.03mm)의
// 최근 완료 코일들의 실측 PLC 데이터를 모아 길이 구간별 권장 속도·텐션 프로파일과
// 예상 가동시간을 미리 보여주는 프로토타입.
//
// 데이터 흐름:
//  1) 날짜 선택 시, 그날의 '준비' 상태 슬리팅/슬리팅2 작업지시서 목록을 Supabase(leveler_jobs)에서 조회합니다.
//  2) 작업지시서를 선택하면 leveler-explore Edge Function(recommend_for 모드)이 그 자리에서
//     레벨러 시스템 MariaDB의 erp_data에서 동일 사양 완료 코일들을 찾고, plc_data에서
//     그 코일들의 실측 속도·텐션을 길이 구간별로 모아 평균 낸 뒤, 권장 순항속도·예상 가동시간·
//     4존 텐션 밸런스를 계산해 반환합니다.
//
// 주의: LENGTH 필드는 2026년 3월 이후 코일 전체 길이를 온전히 기록하지 못하는 알려진 버그가 있어
// (실제 ~2~3km 코일이 수백m로 절단 기록됨), 여러 코일의 길이 구간을 겹쳐 평균하면 서로 다른
// 코일의 '끝부분(감속 구간)'과 '중간(순항 구간)'이 같은 구간에 섞여 그래프가 들쭉날쭉할 수 있습니다.
// 권장 순항속도(최고속도 평균)와 4존 텐션 밸런스는 이 영향을 덜 받아 신뢰도가 더 높습니다.
import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { fmtNum } from './theme';
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
  green: 'oklch(66% 0.13 150)',
  greenBg: 'oklch(66% 0.13 150 / 14%)',
  red: 'oklch(63% 0.19 25)',
  redBg: 'oklch(63% 0.19 25 / 12%)',
  amber: 'oklch(70% 0.15 65)',
  amberBg: 'oklch(70% 0.15 65 / 14%)',
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

function fmtDurationSec(sec) {
  if (!sec && sec !== 0) return '-';
  const totalMin = Math.round(sec / 60);
  if (totalMin < 60) return `약 ${totalMin}분`;
  return `약 ${Math.floor(totalMin / 60)}시간 ${totalMin % 60}분`;
}

function InfoBanner({ text, tone = 'accent' }) {
  const bg = tone === 'amber' ? N.amberBg : N.surface;
  const iconColor = tone === 'amber' ? shade(N.amber, 15) : N.text700;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      background: bg, border: `1px solid ${tone === 'amber' ? 'transparent' : N.border}`, borderRadius: N.radiusMd,
      padding: '16px 20px', fontSize: '15.5px', fontWeight: 700, lineHeight: 1.6, color: tone === 'amber' ? shade(N.amber, 35) : N.text700,
    }}>
      <span style={{ fontSize: '18px', color: iconColor }}>{tone === 'amber' ? '⚠️' : '💡'}</span>
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

export function CoilAiHelperScreen() {
  const [date, setDate] = useState(todayKST());
  const [orders, setOrders] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const [rec, setRec] = useState(null);
  const [loadingRec, setLoadingRec] = useState(false);
  const [recError, setRecError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoadingList(true);
      setListError(null);
      setSelectedId(null);
      setRec(null);
      const { data, error } = await supabase
        .from('leveler_jobs')
        .select('source_id, company_name, product_name, specification, original_weight, work_type, status, update_time')
        .eq('work_date', date)
        .eq('status', '준비')
        .in('work_type', ['SLITING', 'SLITING2'])
        .order('update_time', { ascending: false });
      if (cancelled) return;
      if (error) {
        setListError(error.message);
      } else {
        setOrders(data || []);
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
      setLoadingRec(true);
      setRecError(null);
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/leveler-explore?recommend_for=${encodeURIComponent(selectedId)}`);
        const json = await res.json();
        if (cancelled) return;
        if (!json.ok) {
          setRecError(json.error || '추천 데이터를 계산하지 못했습니다.');
          setRec(json);
        } else {
          setRec(json);
        }
      } catch (e) {
        if (!cancelled) setRecError(e.message);
      }
      if (!cancelled) setLoadingRec(false);
    }
    run();
    return () => { cancelled = true; };
  }, [selectedId]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((c) => (
      (c.product_name || '').toLowerCase().includes(q)
      || (c.company_name || '').toLowerCase().includes(q)
    ));
  }, [orders, search]);

  const speedData = useMemo(() => {
    if (!rec?.speedProfile) return [];
    return rec.speedProfile
      .filter((r) => r.len_bucket >= 0)
      .map((r) => ({ len: r.len_bucket, speed: r.speed }));
  }, [rec]);

  const tensionData = useMemo(() => {
    if (!rec?.tensionProfile) return [];
    return rec.tensionProfile
      .filter((r) => r.len_bucket >= 0)
      .map((r) => ({ len: r.len_bucket, t1: r.t1, t2: r.t2, t3: r.t3, t4: r.t4 }));
  }, [rec]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: N.font, background: N.bg, margin: '-24px', padding: '32px 36px 56px', borderRadius: '18px' }}>
      <style>{`
        .aih-date-input { font-family: ${N.font}; }
        .aih-card-item:hover { border-color: ${N.accent500} !important; }
      `}</style>

      <div>
        <h1 style={{ fontFamily: N.font, fontWeight: 900, fontSize: '34px', margin: '0 0 8px 0', letterSpacing: '-0.01em', color: N.text900 }}>
          🤖 슬리팅2 AI 헬퍼
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.6, color: N.text700, maxWidth: '760px', margin: 0 }}>
          아직 가동 전인 작업지시서를 선택하면, 동일 사양의 최근 완료 코일 실측 데이터로부터 권장 속도·텐션과 예상 가동시간을 미리 보여줍니다.
        </p>
      </div>

      <InfoBanner text="선택한 작업지시서와 동일 사양(두께 ±0.03mm)의 최근 완료 코일 최대 30건을 찾아, 그 코일들의 plc_data 실측치를 길이 구간별로 평균 내어 계산하는 프로토타입입니다. 코일이 아직 가동되지 않았으므로 이 값은 참고용 권장치이며, 실제 작업 중에는 현장 상황에 맞게 조정이 필요합니다." />
      <InfoBanner tone="amber" text="LENGTH 필드는 2026년 3월 이후 일부 코일에서 전체 길이가 온전히 기록되지 않는 알려진 버그가 있어(장비쪽에서 수정 예정), 여러 코일을 겹쳐 평균한 길이별 그래프는 구간에 따라 값이 튈 수 있습니다. 권장 순항속도·예상 가동시간·텐션 밸런스는 코일 단위 통계라 이 영향을 덜 받습니다." />

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '16px', color: N.text700, fontWeight: 900 }}>날짜</span>
        <input
          className="aih-date-input"
          type="date"
          value={date}
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
        {/* 좌측: 작업지시서(준비 상태) 목록 */}
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
            {loadingList ? '불러오는 중...' : `준비 ${filteredOrders.length}건`}
          </div>
          {listError && <div style={{ color: shade(N.red, 10), fontSize: '13px', fontWeight: 700 }}>{listError}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '560px', overflowY: 'auto' }}>
            {filteredOrders.map((c) => {
              const active = c.product_name === selectedId;
              return (
                <div
                  key={c.source_id}
                  className="aih-card-item"
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
            {!loadingList && filteredOrders.length === 0 && (
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: N.text500, padding: '10px 0' }}>
                해당 날짜에 준비중인 슬리팅 작업지시서가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 우측: 추천 상세 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {!selectedId && (
            <div style={{ ...card, padding: '40px', textAlign: 'center', color: N.text500, fontWeight: 700 }}>
              좌측에서 작업지시서를 선택하세요.
            </div>
          )}

          {selectedId && loadingRec && (
            <div style={{ ...card, padding: '40px', textAlign: 'center', color: N.text500, fontWeight: 700 }}>
              동일 사양 완료 코일을 분석 중...
            </div>
          )}

          {selectedId && !loadingRec && recError && (
            <div style={{ ...card, padding: '28px', color: shade(N.red, 10), fontWeight: 700 }}>
              {recError}
            </div>
          )}

          {selectedId && !loadingRec && rec?.ok && (
            <>
              <div style={{ ...card, padding: '22px 26px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ fontFamily: N.font, fontSize: '22px', fontWeight: 900, color: N.text900 }}>{rec.coil_id}</span>
                      <span style={{
                        fontSize: '12.5px', fontWeight: 900, padding: '3px 12px', borderRadius: '999px',
                        background: N.accent100, color: N.accent600,
                      }}>
                        {rec.target?.status || '준비'}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: N.text600 }}>
                      {rec.target?.company_name} · {rec.target?.specification} · {fmtNum(rec.target?.original_weight)}kg
                    </div>
                  </div>
                  <span style={{
                    fontSize: '12.5px', fontWeight: 900, padding: '4px 13px', borderRadius: '999px',
                    background: N.accent100, color: N.accent600,
                  }}>
                    {rec.target?.work_type === 'SLITING2' ? '슬리팅2' : '슬리팅1'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                <KpiCard
                  label="권장 순항속도"
                  value={rec.recommendedCruiseSpeed != null ? `${rec.recommendedCruiseSpeed} m/min` : '-'}
                  sub={`동일 사양(두께 ${rec.thickness}mm) 완료 코일 ${rec.peerCount}건 기준`}
                  color={N.accent600}
                />
                <KpiCard
                  label="예상 가동시간"
                  value={fmtDurationSec(rec.avgDurationSec)}
                  sub="동일 사양 코일 평균"
                />
                <KpiCard
                  label="4존 텐션 밸런스"
                  value={rec.zoneBalance ? rec.zoneBalance.status : '-'}
                  sub={rec.zoneBalance ? `Zone1 ${rec.zoneBalance.t1} / Zone2 ${rec.zoneBalance.t2} (편차 ${rec.zoneBalance.gap})` : '데이터 부족'}
                  color={rec.zoneBalance?.status === '주의' ? shade(N.red, 10) : shade(N.green, 30)}
                />
              </div>

              <div style={{ ...card, padding: '20px 22px' }}>
                <div style={{ fontSize: '14.5px', fontWeight: 900, color: N.text900, marginBottom: '12px' }}>길이 구간별 권장 속도 (동일 사양 코일 평균)</div>
                <div style={{ width: '100%', height: 230 }}>
                  <ResponsiveContainer>
                    <LineChart data={speedData} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
                      <CartesianGrid stroke={N.borderLight} vertical={false} />
                      <XAxis dataKey="len" tick={{ fontSize: 12, fill: N.text500, fontFamily: N.font }} tickFormatter={(v) => `${v}m`} />
                      <YAxis tick={{ fontSize: 12, fill: N.text500, fontFamily: N.font }} />
                      <Tooltip content={<ChartTooltip suffix=" m/min" />} />
                      <Line type="monotone" dataKey="speed" name="권장속도" stroke={N.accent500} strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ ...card, padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ fontSize: '14.5px', fontWeight: 900, color: N.text900 }}>길이 구간별 권장 텐션 (4존)</div>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
