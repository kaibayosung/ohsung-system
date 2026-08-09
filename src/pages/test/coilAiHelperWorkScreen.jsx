// src/pages/test/coilAiHelperWorkScreen.jsx
// AI 헬퍼 (슬리팅2/작업용) — 코일 작업 중(또는 방금 끝난) 실측 데이터를 동일 사양 완료 코일들의
// 권장 프로파일과 실시간으로 비교해, 지금 속도가 적정한지/너무 느린지/너무 빠른지를 한눈에 보여주는 화면.
//
// 데이터 흐름:
//  1) 날짜 선택 시, 그날의 슬리팅/슬리팅2 코일 목록을 Supabase(leveler_jobs)에서 조회합니다.
//  2) 코일을 선택하면 leveler-explore Edge Function(recommend_for 모드)이 동일 사양(두께 ±0.03mm)
//     완료 코일들의 길이 구간별 평균 속도/텐션 프로파일과, 이 코일 자체의 최신 실측 1행(latest:
//     현재 길이/속도/텐션1-4/RUN)을 함께 반환합니다.
//  3) 프론트에서 현재 길이에 해당하는 구간의 권장 속도를 찾아 실제 속도와 비교, 적정/느림/빠름 상태를
//     계산합니다.
//
// 주의: LENGTH 필드는 2026년 3월 이후 일부 코일에서 전체 길이가 온전히 기록되지 않는 알려진 버그가 있어
// 권장 프로파일이 실제보다 짧은 구간에 몰려 보일 수 있습니다. (지난작업보기 화면과 동일한 주의사항)
import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot, ReferenceLine,
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
  gray: 'oklch(60% 0.01 260)',
  grayBg: 'oklch(60% 0.01 260 / 12%)',
  radiusSm: '4px',
  radiusMd: '8px',
  radiusLg: '14px',
  shadowSm: '0 1px 2px rgba(41,43,49,0.06)',
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

// 현재 길이(currentLen)에 해당하는 구간의 권장값을, len_bucket <= currentLen 중 가장 가까운 행에서 찾는다.
// (currentLen이 프로파일 범위보다 짧으면 첫 행, 벗어나면 마지막 행으로 대체)
function nearestAtLen(profile, currentLen) {
  if (!profile || profile.length === 0 || currentLen == null) return null;
  let best = profile[0];
  for (const row of profile) {
    if (row.len_bucket <= currentLen) best = row;
    else break;
  }
  return best;
}

function statusOf(rec, cur) {
  if (rec == null || cur == null) return { label: '비교 데이터 부족', tone: 'gray' };
  if (rec <= 5) return { label: '가감속 구간', tone: 'gray' };
  const diff = ((cur - rec) / rec) * 100;
  if (Math.abs(diff) <= 5) return { label: '적정 속도', tone: 'green', diff };
  if (diff < -5) return { label: '너무 느림', tone: 'amber', diff };
  return { label: '너무 빠름', tone: 'red', diff };
}

const TONE_STYLE = {
  green: { bg: N.greenBg, text: shade(N.green, 30), icon: '✓' },
  amber: { bg: N.amberBg, text: shade(N.amber, 20), icon: '▽' },
  red: { bg: N.redBg, text: shade(N.red, 10), icon: '△' },
  gray: { bg: N.grayBg, text: N.text600, icon: '·' },
};

function InfoBanner({ text, tone = 'accent' }) {
  const bg = tone === 'amber' ? N.amberBg : N.surface;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      background: bg, border: `1px solid ${tone === 'amber' ? 'transparent' : N.border}`, borderRadius: N.radiusMd,
      padding: '16px 20px', fontSize: '15.5px', fontWeight: 700, lineHeight: 1.6,
      color: tone === 'amber' ? shade(N.amber, 35) : N.text700,
    }}>
      <span style={{ fontSize: '18px' }}>{tone === 'amber' ? '⚠️' : '💡'}</span>
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

export function CoilAiHelperWorkScreen() {
  const [date, setDate] = useState(todayKST());
  const [coils, setCoils] = useState([]);
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
      setLoadingRec(true);
      setRecError(null);
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/leveler-explore?recommend_for=${encodeURIComponent(selectedId)}`);
        const json = await res.json();
        if (cancelled) return;
        if (!json.ok) {
          setRecError(json.error || '데이터를 불러오지 못했습니다.');
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

  const filteredCoils = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return coils;
    return coils.filter((c) => (
      (c.product_name || '').toLowerCase().includes(q)
      || (c.company_name || '').toLowerCase().includes(q)
    ));
  }, [coils, search]);

  const currentLen = rec?.latest?.LENGTH != null ? Number(rec.latest.LENGTH) : null;
  const currentSpeed = rec?.latest?.LINE_SPEED_VALUE != null ? Number(rec.latest.LINE_SPEED_VALUE) : null;

  const recAtLen = useMemo(() => nearestAtLen(rec?.speedProfile, currentLen), [rec, currentLen]);
  const recSpeedAtLen = recAtLen ? Number(recAtLen.speed) : null;
  const status = useMemo(() => statusOf(recSpeedAtLen, currentSpeed), [recSpeedAtLen, currentSpeed]);
  const toneStyle = TONE_STYLE[status.tone];

  const tensionAtLen = useMemo(() => nearestAtLen(rec?.tensionProfile, currentLen), [rec, currentLen]);

  const speedData = useMemo(() => {
    if (!rec?.speedProfile) return [];
    return rec.speedProfile.map((r) => ({ len: r.len_bucket, speed: r.speed }));
  }, [rec]);

  const maxDomain = useMemo(() => {
    const lens = (rec?.speedProfile || []).map((r) => r.len_bucket);
    const m = Math.max(0, ...lens, currentLen || 0);
    return m + 10;
  }, [rec, currentLen]);

  const tensionZones = useMemo(() => {
    if (!rec?.latest || !tensionAtLen) return [];
    const cur = [rec.latest.TENSION1, rec.latest.TENSION2, rec.latest.TENSION3, rec.latest.TENSION4];
    const recv = [tensionAtLen.t1, tensionAtLen.t2, tensionAtLen.t3, tensionAtLen.t4];
    return cur.map((c, i) => {
      const r = Number(recv[i]);
      const cv = Number(c);
      const diff = Math.round((cv - r) * 10) / 10;
      const ok = Math.abs(diff) <= Math.max(12, r * 0.08);
      return { zone: i + 1, cur: cv, rec: r, diff, ok };
    });
  }, [rec, tensionAtLen]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: N.font, background: N.bg, margin: '-24px', padding: '32px 36px 56px', borderRadius: '18px' }}>
      <style>{`
        .aihw-date-input { font-family: ${N.font}; }
        .aihw-card-item:hover { border-color: ${N.accent500} !important; }
      `}</style>

      <div>
        <h1 style={{ fontFamily: N.font, fontWeight: 900, fontSize: '34px', margin: '0 0 8px 0', letterSpacing: '-0.01em', color: N.text900 }}>
          🎯 AI 헬퍼 (슬리팅2/작업용)
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.6, color: N.text700, maxWidth: '760px', margin: 0 }}>
          코일을 선택하면 현재 진행 길이의 실측 속도·텐션1~4를 동일 사양 완료 코일들의 권장치와 비교해, 지금 너무 느리거나 빠르지 않은지 보여줍니다.
        </p>
      </div>

      <InfoBanner text="선택한 코일의 최신 실측 1행(길이·속도·텐션)을, 동일 사양(두께 ±0.03mm) 완료 코일들의 길이 구간별 평균과 비교하는 프로토타입입니다. 코일 목록은 leveler_jobs에서, 비교 계산은 leveler-explore Edge Function이 그 자리에서 원본 DB를 조회해 처리합니다." />
      <InfoBanner tone="amber" text="LENGTH 필드는 2026년 3월 이후 일부 코일에서 전체 길이가 온전히 기록되지 않는 알려진 버그가 있어(장비쪽에서 수정 예정), 권장 프로파일이 실제 코일 길이보다 짧은 구간에 몰려 보일 수 있습니다. 참고용으로 활용해 주세요." />

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '16px', color: N.text700, fontWeight: 900 }}>날짜</span>
        <input
          className="aihw-date-input"
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
        {/* 좌측: 코일 목록 */}
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
                  className="aihw-card-item"
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

        {/* 우측: 실시간 비교 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {!selectedId && (
            <div style={{ ...card, padding: '40px', textAlign: 'center', color: N.text500, fontWeight: 700 }}>
              좌측에서 코일을 선택하세요.
            </div>
          )}

          {selectedId && loadingRec && (
            <div style={{ ...card, padding: '40px', textAlign: 'center', color: N.text500, fontWeight: 700 }}>
              불러오는 중...
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
                        {rec.target?.status || '-'}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: N.text600 }}>
                      {rec.target?.company_name} · {rec.target?.specification} · {fmtNum(rec.target?.original_weight)}kg
                      {rec.latest && ` · 최근 기록 ${fmtClock(rec.latest.TIMESTAMP)}`}
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

              {!rec.latest && (
                <div style={{ ...card, padding: '28px', textAlign: 'center', color: N.text500, fontWeight: 700 }}>
                  이 코일은 아직 가동 기록(plc_data)이 없습니다. 가동을 시작하면 실시간 비교가 표시됩니다.
                </div>
              )}

              {rec.latest && (
                <>
                  <div style={{ ...card, padding: '22px 26px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: N.text600, marginBottom: '8px' }}>현재 속도 상태</div>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '20px', fontWeight: 900,
                          padding: '7px 18px', borderRadius: '999px', background: toneStyle.bg, color: toneStyle.text,
                        }}>
                          <span>{toneStyle.icon}</span>{status.label}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '28px', textAlign: 'right' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: N.text600 }}>권장 속도</div>
                          <div style={{ fontFamily: N.font, fontSize: '24px', fontWeight: 900, color: N.text900 }}>
                            {recSpeedAtLen != null ? `${recSpeedAtLen} m/min` : '-'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: N.text600 }}>현재 속도</div>
                          <div style={{ fontFamily: N.font, fontSize: '24px', fontWeight: 900, color: N.accent600 }}>
                            {currentSpeed != null ? `${currentSpeed} m/min` : '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                    <KpiCard label="현재 진행 길이" value={currentLen != null ? `${currentLen}m` : '-'} />
                    <KpiCard label="권장 순항속도" value={rec.recommendedCruiseSpeed != null ? `${rec.recommendedCruiseSpeed} m/min` : '-'} sub={`동일 사양 완료 코일 ${rec.peerCount}건 기준`} />
                    <KpiCard
                      label="속도 편차"
                      value={status.diff != null ? `${status.diff >= 0 ? '+' : ''}${Math.round(status.diff)}%` : '-'}
                      color={status.tone === 'red' ? shade(N.red, 10) : status.tone === 'amber' ? shade(N.amber, 20) : status.tone === 'green' ? shade(N.green, 30) : N.text500}
                    />
                  </div>

                  <div style={{ ...card, padding: '20px 22px' }}>
                    <div style={{ fontSize: '14.5px', fontWeight: 900, color: N.text900, marginBottom: '12px' }}>길이별 권장 속도 (현재 위치 표시)</div>
                    <div style={{ width: '100%', height: 230 }}>
                      <ResponsiveContainer>
                        <LineChart data={speedData} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
                          <CartesianGrid stroke={N.borderLight} vertical={false} />
                          <XAxis dataKey="len" type="number" domain={[0, maxDomain]} tick={{ fontSize: 12, fill: N.text500, fontFamily: N.font }} tickFormatter={(v) => `${v}m`} />
                          <YAxis tick={{ fontSize: 12, fill: N.text500, fontFamily: N.font }} />
                          <Tooltip content={<ChartTooltip suffix=" m/min" />} />
                          <Line type="monotone" dataKey="speed" name="권장속도" stroke={N.accent500} strokeWidth={2.5} dot={false} />
                          {currentLen != null && (
                            <ReferenceLine x={currentLen} stroke={N.text500} strokeDasharray="3 3" />
                          )}
                          {currentLen != null && currentSpeed != null && (
                            <ReferenceDot x={currentLen} y={currentSpeed} r={7} fill={toneStyle.text} stroke="#fff" strokeWidth={2} />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div style={{ ...card, padding: '20px 22px' }}>
                    <div style={{ fontSize: '14.5px', fontWeight: 900, color: N.text900, marginBottom: '12px' }}>텐션 1~4존 (현재 vs 권장)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                      {tensionZones.map((z) => (
                        <div key={z.zone} style={{
                          background: N.bg, borderRadius: N.radiusMd, padding: '14px 16px',
                          borderLeft: `4px solid ${TENSION_COLORS[z.zone - 1]}`,
                        }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: N.text600, marginBottom: '4px' }}>Zone {z.zone}</div>
                          <div style={{ fontSize: '19px', fontWeight: 900, color: N.text900 }}>{Number.isFinite(z.cur) ? z.cur : '-'}</div>
                          <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '4px', color: z.ok ? shade(N.green, 30) : shade(N.amber, 20) }}>
                            {z.ok ? '정상' : '주의'} · 권장 {Number.isFinite(z.rec) ? z.rec : '-'} (편차 {z.diff >= 0 ? '+' : ''}{z.diff})
                          </div>
                        </div>
                      ))}
                      {tensionZones.length === 0 && (
                        <div style={{ fontSize: '13px', fontWeight: 700, color: N.text500 }}>텐션 비교 데이터가 부족합니다.</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
