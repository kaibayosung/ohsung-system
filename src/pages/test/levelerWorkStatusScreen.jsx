// src/pages/test/levelerWorkStatusScreen.jsx
// 작업현황 대시보드 — 레벨러 시스템(osungsteel.servehttp.com:38080) 실데이터 연동 프로토타입.
//
// 데이터 흐름: 레벨러 시스템의 MariaDB(ohsung DB > erp_data)를 leveler-sync Edge Function이
// 10분 간격으로 Supabase(leveler_jobs)에 미러링하고, 이 화면은 leveler_jobs를 그대로 조회합니다.
// (세퍼레이터 키오스크가 leveler_jobs를 쓰기 시작한 이유와 동일 — 그린ERP의 joborder_date는
// 최초 지시일자로 고정되지만, 현장에서 날짜를 바꿔가며 재작업한 상태까지 반영된 실제 현재 상태는
// erp_data.work_date에만 있습니다.)
//
// 과거 조회: leveler_jobs는 삭제되지 않고 계속 누적되므로(leveler-sync가 최근 3일 창 안에서만
// upsert+정리하고 그 밖은 건드리지 않음), 동기화가 시작된 이후 날짜는 전부 조회할 수 있습니다.
// 다만 배포 시점(2026-08-06) 이전 날짜는 원본에도 남아있지 않아 데이터가 없을 수 있습니다.
//
// 비주얼: claude.ai/design 목업(Nocturne, 라벤더-화이트 배경 + 퍼플/그린/앰버 3색 라인 팔레트)의
// 레이아웃/색상은 유지하되, 폰트는 세퍼레이터 키오스크와 통일해 Pretendard + 라벨·제목·값 전부
// 굵게(900 위주)로 맞췄습니다 (사용자 피드백: "코일번호처럼 두꺼운 폰트를 라벨/제목 등 전체에도").
// 공용 theme.js(COLORS/box)는 ~30개 화면이 이름을 공유하므로 건드리지 않고, 이 화면 전용
// 토큰(N)을 로컬로 새로 정의합니다.
import React, { useState, useEffect, useMemo } from 'react';
import { fmtNum } from './theme';
import { supabase } from '../../supabaseClient';

const REFRESH_MS = 10 * 60 * 1000; // 10분

// --- Nocturne 디자인 토큰 (이 화면 전용) ---
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
  radiusSm: '4px',
  radiusMd: '8px',
  radiusLg: '14px',
  shadowSm: '0 1px 2px rgba(41,43,49,0.06)',
  shadowMd: '0 1px 2px rgba(41,43,49,0.04), 0 8px 24px rgba(41,43,49,0.07)',
  font: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

function tint(color, amt = 14) {
  return `color-mix(in srgb, ${color} ${amt}%, white)`;
}
function shade(color, amt = 30) {
  return `color-mix(in srgb, ${color} ${100 - amt}%, black)`;
}

const WORK_TYPES = [
  { key: 'LEVELLING', label: '레벨링', color: N.accent500 },
  { key: 'SLITING', label: '슬리팅1', color: N.green },
  { key: 'SLITING2', label: '슬리팅2', color: N.amber },
];

const STATUS_STYLE = {
  완료: [shade(N.green, 30), tint(N.green, 14)],
  진행중: [N.accent600, N.accent100],
  준비: [shade(N.amber, 30), tint(N.amber, 14)],
};

function fmtWon(n) {
  return `${Number(n || 0).toLocaleString()}원`;
}

function todayKST() {
  const now = new Date();
  const kstMs = now.getTime() + 9 * 3600000;
  return new Date(kstMs).toISOString().slice(0, 10);
}

// leveler_jobs.update_time은 leveler-sync가 그대로 미러링한 값이라 이미 "UTC로 잘못 태깅된 KST 숫자"입니다.
// +9h를 더 더하면 안 됩니다(이중 보정 버그, 2026-08-21 수정).
function fmtTime(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
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

export function LevelerWorkStatus() {
  const [date, setDate] = useState(todayKST());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [typeFilter, setTypeFilter] = useState('전체');

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('leveler_jobs')
        .select('source_id, company_name, product_name, specification, original_weight, amount, process_rule, work_type, status, update_time')
        .eq('work_date', date)
        .order('source_id', { ascending: false });
      if (cancelled) return;
      if (err) {
        setError(err.message);
      } else {
        setRows(data || []);
        setLastSyncAt(new Date());
      }
      setLoading(false);
    }
    run();
    const timer = setInterval(run, REFRESH_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [date]);

  const byType = useMemo(() => {
    const map = {};
    WORK_TYPES.forEach((t) => { map[t.key] = { total: 0, done: 0, remaining: 0, amount: 0, weight: 0 }; });
    rows.forEach((r) => {
      const key = r.work_type === 'LEVELING' ? 'LEVELLING' : r.work_type; // ING_DATA 쪽 오래된 표기 방어
      if (!map[key]) return;
      map[key].total += 1;
      if (r.status === '완료') map[key].done += 1;
      else map[key].remaining += 1;
      map[key].amount += Number(r.amount || 0);
      map[key].weight += Number(r.original_weight || 0);
    });
    return map;
  }, [rows]);

  const summary = useMemo(() => {
    return WORK_TYPES.reduce((acc, t) => ({
      total: acc.total + byType[t.key].total,
      done: acc.done + byType[t.key].done,
      remaining: acc.remaining + byType[t.key].remaining,
      amount: acc.amount + byType[t.key].amount,
    }), { total: 0, done: 0, remaining: 0, amount: 0 });
  }, [byType]);

  const visibleRows = useMemo(() => {
    if (typeFilter === '전체') return rows;
    return rows.filter((r) => (r.work_type === 'LEVELING' ? 'LEVELLING' : r.work_type) === typeFilter);
  }, [rows, typeFilter]);

  const isToday = date === todayKST();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: N.font, background: N.bg, margin: '-24px', padding: '32px 36px 56px', borderRadius: '18px' }}>
      <style>{`
        @keyframes levelerLivePulse { 0%,100% { opacity: 1 } 50% { opacity: 0.35 } }
        .leveler-live-dot { animation: levelerLivePulse 1.6s ease-in-out infinite; }
        .leveler-date-input { font-family: ${N.font}; }
        .leveler-seg-btn:hover { background: ${N.accent100} !important; }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: N.font, fontWeight: 900, fontSize: '38px', margin: '0 0 8px 0', letterSpacing: '-0.01em', color: N.text900 }}>📊 작업현황 대시보드</h1>
          <p style={{ fontSize: '16.5px', fontWeight: 700, lineHeight: 1.6, color: N.text700, maxWidth: '740px', margin: 0 }}>
            레벨러 시스템(레벨링·슬리팅1·슬리팅2) 작업목록을 날짜별로 봅니다. 날짜 변경(재작업)이 반영된 실제 현재 상태를 그대로 보여줍니다.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: N.surface, border: `1px solid ${N.border}`, borderRadius: N.radiusMd, padding: '11px 16px', boxShadow: N.shadowSm }}>
          <span className="leveler-live-dot" style={{ width: '9px', height: '9px', borderRadius: '50%', background: N.accent500, flexShrink: 0 }} />
          <span style={{ fontSize: '15px', fontWeight: 800, color: N.text700 }}>
            {lastSyncAt ? lastSyncAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '--:--'} 기준 · 10분마다 자동 새로고침
          </span>
        </div>
      </div>

      <InfoBanner text="leveler_jobs 실데이터를 그대로 조회하는 프로토타입입니다. leveler-sync Edge Function이 10분 간격으로 레벨러 시스템 DB와 동기화하며, 이 화면도 10분마다 자동 새로고침됩니다. 배포일(2026-08-06) 이전 날짜는 원본에 데이터가 없어 조회되지 않을 수 있습니다." />

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '16px', color: N.text700, fontWeight: 900 }}>날짜</span>
        <input
          className="leveler-date-input"
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
          >
            오늘로
          </button>
        )}
        <span style={{ fontSize: '14px', fontWeight: 700, color: N.text500 }}>
          {lastSyncAt ? `${lastSyncAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준` : ''}
        </span>
      </div>

      {error && (
        <div style={{ ...card, padding: '20px 24px', color: shade(N.amber, 40), fontSize: '15px', fontWeight: 700 }}>
          데이터를 불러오지 못했습니다: {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: N.text500, fontSize: '17px', fontWeight: 800, padding: '20px 0' }}>불러오는 중...</div>
      ) : (
        <>
          {/* 총 생산금액 히어로 카드 */}
          <div style={{ ...card, boxShadow: N.shadowMd, padding: '36px 40px' }}>
            <div style={{ fontSize: '17px', fontWeight: 800, color: N.text600, marginBottom: '4px' }}>총 생산금액</div>
            <div style={{ fontFamily: N.font, fontSize: '72px', fontWeight: 900, color: N.accent600, lineHeight: 1 }}>
              {fmtNum(summary.amount)}<span style={{ fontSize: '28px', fontWeight: 800, color: N.text500 }}>원</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginTop: '28px', paddingTop: '24px', borderTop: `1px solid ${N.borderLight}` }}>
              {WORK_TYPES.map((t) => (
                <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: N.text600 }}>{t.label} 금액</div>
                    <div style={{ fontFamily: N.font, fontSize: '26px', fontWeight: 900, color: N.text900 }}>{fmtWon(byType[t.key].amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 요약 3카드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px' }}>
            <div style={{ ...card, padding: '20px 24px' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: N.text600 }}>전체 작업</div>
              <div style={{ fontFamily: N.font, fontSize: '42px', fontWeight: 900, marginTop: '6px', color: N.text900 }}>
                {fmtNum(summary.total)}<span style={{ fontSize: '18px', fontWeight: 800, color: N.text500 }}>건</span>
              </div>
            </div>
            <div style={{ ...card, padding: '20px 24px' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: N.text600 }}>완료</div>
              <div style={{ fontFamily: N.font, fontSize: '42px', fontWeight: 900, marginTop: '6px', color: shade(N.green, 30) }}>
                {fmtNum(summary.done)}<span style={{ fontSize: '18px', fontWeight: 800, color: N.text500 }}>건</span>
              </div>
            </div>
            <div style={{ ...card, padding: '20px 24px' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: N.text600 }}>진행중 · 대기</div>
              <div style={{ fontFamily: N.font, fontSize: '42px', fontWeight: 900, marginTop: '6px', color: N.text900 }}>
                {fmtNum(summary.remaining)}<span style={{ fontSize: '18px', fontWeight: 800, color: N.text500 }}>건</span>
              </div>
            </div>
          </div>

          {/* 라인별 현황 */}
          <div>
            <h2 style={{ fontFamily: N.font, fontWeight: 900, fontSize: '22px', margin: '0 0 14px 0', color: N.text900 }}>라인별 현황</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
              {WORK_TYPES.map((t) => {
                const s = byType[t.key];
                const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
                return (
                  <div key={t.key} style={{ ...card, borderTop: `4px solid ${t.color}`, padding: '22px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px' }}>
                      <div style={{ fontFamily: N.font, fontSize: '20px', fontWeight: 900, color: N.text900 }}>{t.label}</div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: t.color }}>{pct}% 완료</div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: N.text600 }}>금액</div>
                      <div style={{ fontFamily: N.font, fontSize: '32px', fontWeight: 900, color: t.color }}>{fmtWon(s.amount)}</div>
                    </div>

                    <div style={{ height: '8px', background: N.borderLight, borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                      <div style={{ height: '100%', background: t.color, borderRadius: '4px', width: `${pct}%` }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 18px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: N.text600 }}>전체</div>
                        <div style={{ fontSize: '19px', fontWeight: 900, fontFamily: N.font, color: N.text900 }}>{s.total}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: N.text600 }}>완료</div>
                        <div style={{ fontSize: '19px', fontWeight: 900, fontFamily: N.font, color: N.text900 }}>{s.done}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: N.text600 }}>잔여</div>
                        <div style={{ fontSize: '19px', fontWeight: 900, fontFamily: N.font, color: N.text900 }}>{s.remaining}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: N.text600 }}>중량</div>
                        <div style={{ fontSize: '19px', fontWeight: 900, fontFamily: N.font, color: N.text900 }}>{fmtNum(s.weight)}kg</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 작업 목록 */}
          <div style={{ ...card, padding: '26px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
              <div style={{ fontFamily: N.font, fontSize: '20px', fontWeight: 900, color: N.text900 }}>작업 목록</div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                {['전체', ...WORK_TYPES.map((t) => t.key)].map((k) => {
                  const active = typeFilter === k;
                  return (
                    <button
                      key={k}
                      className="leveler-seg-btn"
                      onClick={() => setTypeFilter(k)}
                      style={{
                        fontFamily: N.font, fontSize: '14px', fontWeight: 900, cursor: 'pointer',
                        padding: '8px 15px', borderRadius: N.radiusMd,
                        background: active ? N.accent600 : N.bg,
                        color: active ? '#fff' : N.text700,
                        border: `1px solid ${active ? N.accent600 : N.border}`,
                      }}
                    >
                      {k === '전체' ? `전체 ${rows.length}` : WORK_TYPES.find((t) => t.key === k)?.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {visibleRows.length === 0 ? (
              <div style={{ color: N.text500, fontSize: '15px', fontWeight: 700, padding: '16px 0' }}>해당 날짜에 작업 데이터가 없습니다.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
                  <thead>
                    <tr>
                      {['업체명', '품명', '규격', '중량', '가공규격', '구분', '상태', 'UPDATE'].map((h) => (
                        <th key={h} style={{
                          textAlign: 'left', padding: '10px 14px', fontSize: '12.5px', letterSpacing: '0.04em',
                          textTransform: 'uppercase', color: N.text600, borderBottom: `1px solid ${N.borderLight}`,
                          fontWeight: 900,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((r) => {
                      const typeKey = r.work_type === 'LEVELING' ? 'LEVELLING' : r.work_type;
                      const label = WORK_TYPES.find((t) => t.key === typeKey)?.label || r.work_type;
                      const [color, bg] = STATUS_STYLE[r.status] || [N.text700, N.borderLight];
                      const td = { padding: '13px 14px', borderBottom: `1px solid ${N.borderLight}`, color: N.text900, fontWeight: 800 };
                      return (
                        <tr key={r.source_id}>
                          <td style={td}>{r.company_name}</td>
                          <td style={td}>{r.product_name}</td>
                          <td style={td}>{r.specification}</td>
                          <td style={td}>{fmtNum(r.original_weight)}</td>
                          <td style={td}>{r.process_rule}</td>
                          <td style={td}>{label}</td>
                          <td style={td}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', padding: '5px 13px', borderRadius: '999px',
                              fontSize: '13px', fontWeight: 900, background: bg, color,
                            }}>{r.status}</span>
                          </td>
                          <td style={td}>{fmtTime(r.update_time)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
