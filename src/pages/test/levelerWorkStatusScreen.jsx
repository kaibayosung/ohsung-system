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
import React, { useState, useEffect, useMemo } from 'react';
import { COLORS, box, pill, fmtWon, fmtNum } from './theme';
import { supabase } from '../../supabaseClient';

const REFRESH_MS = 10 * 60 * 1000; // 10분

const WORK_TYPES = [
  { key: 'LEVELLING', label: '레벨링' },
  { key: 'SLITING', label: '슬리팅1' },
  { key: 'SLITING2', label: '슬리팅2' },
];

const STATUS_STYLE = {
  완료: [COLORS.green, COLORS.greenBg],
  진행중: [COLORS.blue, COLORS.blueBg],
  준비: [COLORS.amber, COLORS.amberBg],
};

function todayKST() {
  const now = new Date();
  const kstMs = now.getTime() + 9 * 3600000;
  return new Date(kstMs).toISOString().slice(0, 10);
}

function fmtTime(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  const kst = new Date(d.getTime() + 9 * 3600000);
  const hh = String(kst.getUTCHours()).padStart(2, '0');
  const mm = String(kst.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function ProposalBanner({ text }) {
  return (
    <div style={{
      background: COLORS.accentSoft, border: `1px solid ${COLORS.accentBg}`, borderRadius: '14px',
      padding: '14px 20px', fontSize: '14px', color: COLORS.accentDark, lineHeight: 1.6,
      display: 'flex', gap: '10px', alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: '16px' }}>💡</span>
      <span>{text}</span>
    </div>
  );
}

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
        .select('source_id, company_name, product_name, specification, original_weight, process_rule, work_type, status, update_time')
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
    <div style={box.page}>
      <div>
        <h2 style={box.title}>작업현황 대시보드 <span style={{ marginLeft: '10px', verticalAlign: 'middle' }}><span style={pill(COLORS.accentBg, COLORS.accentDark)}>실데이터 연동</span></span></h2>
        <p style={box.hint}>레벨러 시스템(레벨링·슬리팅1·슬리팅2) 작업목록을 날짜별로 봅니다. 날짜 변경(재작업)이 반영된 실제 현재 상태를 그대로 보여줍니다.</p>
      </div>
      <ProposalBanner text="leveler_jobs 실데이터를 그대로 조회하는 프로토타입입니다. leveler-sync Edge Function이 10분 간격으로 레벨러 시스템 DB와 동기화하며, 이 화면도 10분마다 자동 새로고침됩니다. 배포일(2026-08-06) 이전 날짜는 원본에 데이터가 없어 조회되지 않을 수 있습니다." />

      <div style={{ ...box.card, display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <label style={{ ...box.label, marginBottom: 0 }}>날짜</label>
        <input
          type="date"
          value={date}
          max={todayKST()}
          onChange={(e) => setDate(e.target.value)}
          style={{ ...box.input, width: 'auto', padding: '10px 14px' }}
        />
        {!isToday && (
          <button style={{ ...box.ghostBtn, padding: '9px 16px', fontSize: '14px' }} onClick={() => setDate(todayKST())}>오늘로</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '13px', color: COLORS.steelLight }}>
          {lastSyncAt ? `${lastSyncAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준` : ''}
        </span>
      </div>

      {error && (
        <div style={{ ...box.card, color: COLORS.red, fontSize: '15px' }}>데이터를 불러오지 못했습니다: {error}</div>
      )}

      {loading ? (
        <div style={box.loadingText}>불러오는 중...</div>
      ) : (
        <>
          <div style={box.statGrid}>
            <div style={box.statCard}>
              <div style={box.statLabel}>전체 작업</div>
              <div style={box.statValue}>{fmtNum(summary.total)}건</div>
            </div>
            <div style={{ ...box.statCard, borderLeft: `4px solid ${COLORS.green}` }}>
              <div style={box.statLabel}>완료</div>
              <div style={{ ...box.statValue, color: COLORS.green }}>{fmtNum(summary.done)}건</div>
            </div>
            <div style={{ ...box.statCard, borderLeft: `4px solid ${COLORS.amber}` }}>
              <div style={box.statLabel}>진행중 · 대기</div>
              <div style={{ ...box.statValue, color: COLORS.amber }}>{fmtNum(summary.remaining)}건</div>
            </div>
            <div style={box.statCard}>
              <div style={box.statLabel}>총 생산금액</div>
              <div style={box.statValue}>{fmtWon(summary.amount)}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
            {WORK_TYPES.map((t) => {
              const s = byType[t.key];
              return (
                <div key={t.key} style={box.card}>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: COLORS.navy, marginBottom: '14px' }}>{t.label}</div>
                  <div style={{ display: 'flex', gap: '18px', marginBottom: '14px' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: COLORS.steelLight, fontWeight: 700 }}>전체</div>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.navy }}>{s.total}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: COLORS.steelLight, fontWeight: 700 }}>완료</div>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.green }}>{s.done}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: COLORS.steelLight, fontWeight: 700 }}>잔여</div>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.amber }}>{s.remaining}</div>
                    </div>
                  </div>
                  <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: COLORS.steelLight }}>금액</span>
                      <span style={{ fontWeight: 700, color: COLORS.navy }}>{fmtWon(s.amount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: COLORS.steelLight }}>중량</span>
                      <span style={{ fontWeight: 700, color: COLORS.navy }}>{fmtNum(s.weight)}kg</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={box.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
              <div style={{ fontSize: '17px', fontWeight: 800, color: COLORS.navy }}>작업 목록</div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                {['전체', ...WORK_TYPES.map((t) => t.key)].map((k) => (
                  <button
                    key={k}
                    onClick={() => setTypeFilter(k)}
                    style={{
                      ...box.ghostBtn, padding: '9px 16px', fontSize: '14px',
                      backgroundColor: typeFilter === k ? COLORS.navy : '#eef2f7',
                      color: typeFilter === k ? '#fff' : COLORS.steel,
                      border: `1px solid ${typeFilter === k ? COLORS.navy : COLORS.border}`,
                    }}
                  >
                    {k === '전체' ? `전체 ${rows.length}` : WORK_TYPES.find((t) => t.key === k)?.label}
                  </button>
                ))}
              </div>
            </div>

            {visibleRows.length === 0 ? (
              <div style={box.emptyText}>해당 날짜에 작업 데이터가 없습니다.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={box.table}>
                  <thead>
                    <tr>
                      <th style={box.th}>업체명</th>
                      <th style={box.th}>품명</th>
                      <th style={box.th}>규격</th>
                      <th style={box.th}>중량</th>
                      <th style={box.th}>가공규격</th>
                      <th style={box.th}>구분</th>
                      <th style={box.th}>상태</th>
                      <th style={box.th}>UPDATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((r) => {
                      const typeKey = r.work_type === 'LEVELING' ? 'LEVELLING' : r.work_type;
                      const label = WORK_TYPES.find((t) => t.key === typeKey)?.label || r.work_type;
                      const [color, bg] = STATUS_STYLE[r.status] || [COLORS.steel, '#eef2f7'];
                      return (
                        <tr key={r.source_id}>
                          <td style={box.td}>{r.company_name}</td>
                          <td style={box.td}>{r.product_name}</td>
                          <td style={box.td}>{r.specification}</td>
                          <td style={box.td}>{fmtNum(r.original_weight)}</td>
                          <td style={box.td}>{r.process_rule}</td>
                          <td style={box.td}>{label}</td>
                          <td style={box.td}><span style={pill(bg, color)}>{r.status}</span></td>
                          <td style={box.td}>{fmtTime(r.update_time)}</td>
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
