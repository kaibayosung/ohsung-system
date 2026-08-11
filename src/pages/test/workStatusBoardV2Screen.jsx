// src/pages/test/workStatusBoardV2Screen.jsx
// 작업현황 대시보드 2 — 장비(라인)별 보드형 레이아웃 프로토타입.
//
// 기존 "작업현황 대시보드"(levelerWorkStatusScreen.jsx)와 데이터 소스(leveler_jobs)는 동일하지만,
// 화면 목적이 다릅니다: 라인별로 지금 뭘 하고 있는지 / 얼마짜리인지 / 오늘 얼마를 벌었는지 /
// 남은 작업을 오늘 안에 다 끝낼 수 있는지를 라인 단위 보드로 한눈에 봅니다.
//
// "오늘 완료 가능?" 예측 로직: leveler_jobs에는 완료·진행중 건에 started_at(착수시각)이 남아있어,
// 최근 7일간 완료된 건들의 (update_time - started_at) 평균 소요시간을 라인별로 구할 수 있습니다.
// 이 평균 소요시간 × 남은(진행중+준비) 건수로 예상 소요시간을 추정하고, 남은 근무시간
// (오늘 17:40 KST 기준 — greenp-sync 크론 업무시간 종료값과 동일하게 맞춤)과 비교해 배지로 보여줍니다.
// 표본이 2건 미만이면 "예측 불가"로 표시합니다. 대기 중인 작업은 실제 착수 전이라
// 이 예측은 근사치이며 확정값이 아님을 화면에 명시합니다.
import React, { useState, useEffect, useMemo } from 'react';
import { fmtNum } from './theme';
import { supabase } from '../../supabaseClient';

const REFRESH_MS = 10 * 60 * 1000; // 10분
const HISTORY_DAYS = 7;
const WORKDAY_END = { h: 17, m: 40 }; // KST 기준 업무 마감 (그린ERP 동기화 크론과 동일 기준)

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
  amber: 'oklch(70% 0.15 65)',
  red: 'oklch(62% 0.19 25)',
  radiusSm: '4px',
  radiusMd: '8px',
  radiusLg: '14px',
  shadowSm: '0 1px 2px rgba(41,43,49,0.06)',
  shadowMd: '0 1px 2px rgba(41,43,49,0.04), 0 8px 24px rgba(41,43,49,0.07)',
  font: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

function tint(color, amt = 14) { return `color-mix(in srgb, ${color} ${amt}%, white)`; }
function shade(color, amt = 30) { return `color-mix(in srgb, ${color} ${100 - amt}%, black)`; }

// 와이어프레임 순서: 레벨링 → 슬리팅2 → 슬리팅1
const LINES = [
  { key: 'LEVELLING', label: '레벨링', color: N.accent500 },
  { key: 'SLITING2', label: '슬리팅2', color: N.amber },
  { key: 'SLITING', label: '슬리팅1', color: N.green },
];

const STATUS_STYLE = {
  완료: [shade(N.green, 30), tint(N.green, 14)],
  진행중: [N.accent600, N.accent100],
  준비: [shade(N.amber, 30), tint(N.amber, 14)],
};

function normType(t) { return t === 'LEVELING' ? 'LEVELLING' : t; }
function fmtWon(n) { return `${Number(n || 0).toLocaleString()}원`; }

function todayKST() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
}
function nowKST() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 3600000);
}
function addDaysISO(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function fmtHM(d) {
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
function fmtDuration(mins) {
  if (mins == null) return '-';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h <= 0) return `${m}분`;
  return `${h}시간 ${m}분`;
}

function InfoBanner({ text, tone }) {
  const isAmber = tone === 'amber';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      background: isAmber ? '#FFF7E8' : N.surface,
      border: `1px solid ${isAmber ? '#F3DCA0' : N.border}`, borderRadius: N.radiusMd,
      padding: '16px 20px', fontSize: '15.5px', fontWeight: 700, lineHeight: 1.6,
      color: isAmber ? shade(N.amber, 40) : N.text700,
    }}>
      <span style={{ fontSize: '18px' }}>{isAmber ? '⚠️' : '💡'}</span>
      <span>{text}</span>
    </div>
  );
}

const card = { background: N.surface, border: `1px solid ${N.border}`, borderRadius: N.radiusMd, boxShadow: N.shadowSm };

function SummaryCard({ label, amount, tons, accent }) {
  return (
    <div style={{ ...card, padding: '20px 24px', borderTop: `4px solid ${accent}` }}>
      <div style={{ fontSize: '15px', fontWeight: 800, color: N.text600, marginBottom: '10px' }}>{label}</div>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '12.5px', fontWeight: 800, color: N.text500 }}>금액</div>
          <div style={{ fontFamily: N.font, fontSize: '24px', fontWeight: 900, color: N.text900 }}>{fmtWon(amount)}</div>
        </div>
        <div>
          <div style={{ fontSize: '12.5px', fontWeight: 800, color: N.text500 }}>톤수</div>
          <div style={{ fontFamily: N.font, fontSize: '24px', fontWeight: 900, color: N.text900 }}>{fmtNum(Math.round(tons / 1000))}톤</div>
        </div>
      </div>
    </div>
  );
}

function FeasibilityBadge({ feas }) {
  if (!feas) return null;
  if (!feas.enough) {
    return (
      <span style={{
        fontSize: '12.5px', fontWeight: 900, padding: '5px 12px', borderRadius: '999px',
        background: N.borderLight, color: N.text600,
      }}>예측불가 (표본부족)</span>
    );
  }
  const map = {
    가능: [shade(N.green, 30), tint(N.green, 14)],
    빠듯함: [shade(N.amber, 30), tint(N.amber, 14)],
    어려움: [shade(N.red, 20), tint(N.red, 16)],
  };
  const [color, bg] = map[feas.level];
  return (
    <span style={{
      fontSize: '12.5px', fontWeight: 900, padding: '5px 12px', borderRadius: '999px',
      background: bg, color,
    }}>
      오늘 완료 {feas.level} · 예상 {fmtHM(feas.etaKST)}
    </span>
  );
}

export function WorkStatusBoardV2() {
  const [date, setDate] = useState(todayKST());
  const [rows, setRows] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const isToday = date === todayKST();

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      const rowsQ = supabase
        .from('leveler_jobs')
        .select('source_id, company_name, product_name, specification, original_weight, amount, process_rule, work_type, status, started_at, update_time')
        .eq('work_date', date)
        .order('source_id', { ascending: true });

      const sinceDate = addDaysISO(date, -HISTORY_DAYS);
      const historyQ = supabase
        .from('leveler_jobs')
        .select('work_type, started_at, update_time')
        .eq('status', '완료')
        .not('started_at', 'is', null)
        .gte('work_date', sinceDate)
        .lte('work_date', date);

      const [rowsRes, historyRes] = await Promise.all([rowsQ, historyQ]);
      if (cancelled) return;
      if (rowsRes.error) {
        setError(rowsRes.error.message);
      } else {
        setRows(rowsRes.data || []);
        setHistory(historyRes.data || []);
        setLastSyncAt(new Date());
      }
      setLoading(false);
    }
    run();
    const timer = setInterval(run, REFRESH_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [date]);

  // 라인별 평균 소요시간(분) — 최근 HISTORY_DAYS일 완료건 기준, 표본 2건 미만이면 null
  const avgDurationMinByLine = useMemo(() => {
    const buckets = {};
    LINES.forEach((l) => { buckets[l.key] = []; });
    history.forEach((r) => {
      const key = normType(r.work_type);
      if (!buckets[key] || !r.started_at || !r.update_time) return;
      const mins = (new Date(r.update_time).getTime() - new Date(r.started_at).getTime()) / 60000;
      if (mins > 0 && mins < 8 * 60) buckets[key].push(mins); // 8시간 넘는 이상치 제외
    });
    const out = {};
    LINES.forEach((l) => {
      const arr = buckets[l.key];
      out[l.key] = arr.length >= 2 ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
    });
    return out;
  }, [history]);

  const byLine = useMemo(() => {
    const map = {};
    LINES.forEach((l) => { map[l.key] = { rows: [], amount: 0, tons: 0, doneAmount: 0, remaining: 0, inProgress: 0, done: 0 }; });
    rows.forEach((r) => {
      const key = normType(r.work_type);
      if (!map[key]) return;
      map[key].rows.push(r);
      map[key].amount += Number(r.amount || 0);
      map[key].tons += Number(r.original_weight || 0);
      if (r.status === '완료') { map[key].done += 1; map[key].doneAmount += Number(r.amount || 0); }
      else if (r.status === '진행중') map[key].inProgress += 1;
      if (r.status !== '완료') map[key].remaining += 1;
    });
    return map;
  }, [rows]);

  const feasibilityByLine = useMemo(() => {
    if (!isToday) return {};
    const now = nowKST();
    const endMs = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), WORKDAY_END.h, WORKDAY_END.m)).getTime();
    const out = {};
    LINES.forEach((l) => {
      const avgMin = avgDurationMinByLine[l.key];
      const remaining = byLine[l.key]?.remaining || 0;
      if (avgMin == null) { out[l.key] = { enough: false }; return; }
      if (remaining === 0) { out[l.key] = { enough: true, level: '가능', etaKST: now, remainingMin: 0 }; return; }
      const remainingMin = avgMin * remaining;
      const eta = new Date(now.getTime() + remainingMin * 60000);
      const marginMin = (endMs - eta.getTime()) / 60000;
      const level = marginMin >= 30 ? '가능' : marginMin >= -30 ? '빠듯함' : '어려움';
      out[l.key] = { enough: true, level, etaKST: eta, remainingMin };
    });
    return out;
  }, [isToday, avgDurationMinByLine, byLine]);

  const totals = useMemo(() => {
    const all = { amount: 0, tons: 0 };
    const inProgress = { amount: 0, tons: 0 };
    const remaining = { amount: 0, tons: 0 };
    rows.forEach((r) => {
      const amt = Number(r.amount || 0);
      const w = Number(r.original_weight || 0);
      all.amount += amt; all.tons += w;
      if (r.status === '진행중') { inProgress.amount += amt; inProgress.tons += w; }
      if (r.status !== '완료') { remaining.amount += amt; remaining.tons += w; }
    });
    return { all, inProgress, remaining };
  }, [rows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: N.font, background: N.bg, margin: '-24px', padding: '32px 36px 56px', borderRadius: '18px' }}>
      <style>{`
        @keyframes wsb2Pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.35 } }
        .wsb2-live-dot { animation: wsb2Pulse 1.6s ease-in-out infinite; }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: N.font, fontWeight: 900, fontSize: '38px', margin: '0 0 8px 0', letterSpacing: '-0.01em', color: N.text900 }}>📊 작업현황 대시보드 2</h1>
          <p style={{ fontSize: '16.5px', fontWeight: 700, lineHeight: 1.6, color: N.text700, maxWidth: '760px', margin: 0 }}>
            라인(레벨링·슬리팅2·슬리팅1)별로 지금 뭘 하고 있는지, 얼마짜리인지, 오늘 얼마를 벌었는지, 남은 작업을 오늘 안에 끝낼 수 있는지를 봅니다.
          </p>
        </div>
        {isToday && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: N.surface, border: `1px solid ${N.border}`, borderRadius: N.radiusMd, padding: '11px 16px', boxShadow: N.shadowSm }}>
            <span className="wsb2-live-dot" style={{ width: '9px', height: '9px', borderRadius: '50%', background: N.accent500, flexShrink: 0 }} />
            <span style={{ fontSize: '15px', fontWeight: 800, color: N.text700 }}>
              {lastSyncAt ? lastSyncAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '--:--'} 기준 · 10분마다 자동 새로고침
            </span>
          </div>
        )}
      </div>

      <InfoBanner text="leveler_jobs 실데이터를 그대로 조회하는 프로토타입입니다. '오늘 완료 가능?' 예측은 최근 7일 완료건의 평균 소요시간 × 남은 건수로 계산한 근사치이며, 실제 작업 순서·인력 배치 등은 반영하지 않습니다." />
      {error && <InfoBanner tone="amber" text={`데이터를 불러오지 못했습니다: ${error}`} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '16px', color: N.text700, fontWeight: 900 }}>날짜</span>
        <input
          type="date"
          value={date}
          max={todayKST()}
          onChange={(e) => setDate(e.target.value)}
          style={{
            fontSize: '20px', fontWeight: 900, background: N.surface, border: `1px solid ${N.border}`,
            borderRadius: N.radiusMd, padding: '9px 18px', color: N.text900, colorScheme: 'light',
          }}
        />
        {!isToday && (
          <button
            onClick={() => setDate(todayKST())}
            style={{
              fontFamily: N.font, fontSize: '15px', fontWeight: 900, color: N.accent600,
              background: N.accent100, border: `1px solid ${N.accent200}`, borderRadius: N.radiusMd,
              padding: '9px 16px', cursor: 'pointer',
            }}
          >오늘로</button>
        )}
        {!isToday && (
          <span style={{ fontSize: '14px', fontWeight: 700, color: N.text500 }}>과거 날짜 조회 중 — '오늘 완료 가능?' 예측은 오늘 날짜에서만 표시됩니다.</span>
        )}
      </div>

      {loading ? (
        <div style={{ color: N.text500, fontSize: '17px', fontWeight: 800, padding: '20px 0' }}>불러오는 중...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
            <SummaryCard label="총발주" amount={totals.all.amount} tons={totals.all.tons} accent={N.accent500} />
            <SummaryCard label="진행중" amount={totals.inProgress.amount} tons={totals.inProgress.tons} accent={N.amber} />
            <SummaryCard label="잔여 (진행중+대기)" amount={totals.remaining.amount} tons={totals.remaining.tons} accent={N.text600} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {LINES.map((line) => {
              const l = byLine[line.key];
              const feas = feasibilityByLine[line.key];
              const avgMin = avgDurationMinByLine[line.key];
              return (
                <div key={line.key} style={{ ...card, borderTop: `4px solid ${line.color}`, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '20px 22px 16px', borderBottom: `1px solid ${N.borderLight}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ fontFamily: N.font, fontSize: '21px', fontWeight: 900, color: N.text900 }}>{line.label}</div>
                      {isToday && <FeasibilityBadge feas={feas} />}
                    </div>
                    <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: N.text500 }}>오늘 번 금액 (완료 {l.done}건)</div>
                        <div style={{ fontFamily: N.font, fontSize: '22px', fontWeight: 900, color: shade(N.green, 30) }}>{fmtWon(l.doneAmount)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: N.text500 }}>전체 금액</div>
                        <div style={{ fontFamily: N.font, fontSize: '22px', fontWeight: 900, color: N.text900 }}>{fmtWon(l.amount)}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: N.text500 }}>
                      잔여 {l.remaining}건{avgMin != null ? ` · 건당 평균 ${fmtDuration(avgMin)}` : ' · 평균 소요시간 데이터 부족'}
                    </div>
                  </div>

                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {l.rows.length === 0 ? (
                      <div style={{ color: N.text500, fontSize: '14px', fontWeight: 700, padding: '10px 6px' }}>해당 날짜에 작업이 없습니다.</div>
                    ) : l.rows.map((r, i) => {
                      const [color, bg] = STATUS_STYLE[r.status] || [N.text700, N.borderLight];
                      return (
                        <div key={r.source_id} style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                          background: N.bg, borderRadius: N.radiusSm, border: `1px solid ${N.borderLight}`,
                        }}>
                          <span style={{
                            width: '24px', height: '24px', borderRadius: '50%', background: line.color, color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 900, flexShrink: 0,
                          }}>{i + 1}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: N.text900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {r.company_name} · {r.specification || '-'}
                            </div>
                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: N.text600 }}>
                              {fmtNum(r.original_weight)}kg · {fmtWon(r.amount)}
                            </div>
                          </div>
                          <span style={{
                            fontSize: '12px', fontWeight: 900, padding: '4px 10px', borderRadius: '999px',
                            background: bg, color, flexShrink: 0,
                          }}>{r.status}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
