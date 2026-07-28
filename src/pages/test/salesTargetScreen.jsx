// src/pages/test/salesTargetScreen.jsx
// 영업대상 고객사 리스트 — 제안(오성철강_영업대상고객사리스트_기획서.docx) No.1단계 프로토타입.
//
// 목적: 재고를 맡겨둔(입고) 거래처 중 최근 작업(생산) 실적이 뜸한 곳을 자동으로 찾아내어
// 영업팀이 먼저 연락하도록 안내합니다. "재고는 있는데 요즘 일이 없는" 거래처를 놓치지 않는 것이 핵심.
//
// 데이터: greenp_inventory(재고, remaining_weight>0) + greenp_joborder_detail(작업이력)을
// 그대로 조회해 화면에서 휴면 로직만 계산합니다 — 신규 테이블이 필요 없어 실데이터로 바로 동작합니다.
// (기획서 1단계) 담당자 지정·연락메모·"연락완료" 이력 저장은 2단계에서 신규 테이블로 구현 예정이며,
// 이 프로토타입의 "연락완료" 체크는 새로고침하면 초기화되는 화면 내 임시 상태입니다.
//
// 등급 기준(초기 제안값, 조정 가능): 위험 = 작업이력 없음 또는 45일 이상 휴면 / 주의 = 21~44일 / 정상 = 20일 이하
import React, { useState, useEffect, useMemo } from 'react';
import { COLORS, box, pill } from './theme';
import { supabase } from '../../supabaseClient';

// Supabase(PostgREST) 기본 1000행 캡 회피용 공용 페이지네이션 헬퍼
// (CustomerPortalPage.jsx의 fetchAllRows와 동일한 패턴 — 미출고 리스트에서 겪은 잘림 버그 재발 방지)
async function fetchAllRows(table, selectCols, applyFilters) {
  const pageSize = 1000;
  let all = [];
  let from = 0;
  for (;;) {
    let q = supabase.from(table).select(selectCols);
    if (applyFilters) q = applyFilters(q);
    q = q.range(from, from + pageSize - 1);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function kstToday() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
}

function idleDaysFrom(dateStr) {
  if (!dateStr) return null;
  const today = kstToday();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((today - d) / (1000 * 60 * 60 * 24));
}

function gradeOf(idleDays) {
  if (idleDays === null) return '위험';
  if (idleDays >= 45) return '위험';
  if (idleDays >= 21) return '주의';
  return '정상';
}

const GRADE_STYLE = {
  위험: [COLORS.red, COLORS.redBg],
  주의: [COLORS.amber, COLORS.amberBg],
  정상: [COLORS.green, COLORS.greenBg],
};

const GRADE_ORDER = { 위험: 0, 주의: 1, 정상: 2 };

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

export function SalesTargetCustomerList() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [gradeFilter, setGradeFilter] = useState('전체');
  const [sortKey, setSortKey] = useState('idle'); // 'idle' | 'stock'
  const [contacted, setContacted] = useState({}); // { [customer_name]: true } — 화면 내 임시 상태

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [invRows, workRows] = await Promise.all([
          fetchAllRows('greenp_inventory', 'customer_name,remaining_weight,received_date', (q) => q.gt('remaining_weight', 0)),
          fetchAllRows('greenp_joborder_detail', 'company_name,joborder_date'),
        ]);
        if (cancelled) return;

        const invByCompany = new Map();
        for (const r of invRows) {
          if (!r.customer_name) continue;
          const cur = invByCompany.get(r.customer_name) || { stockWeight: 0, stockCount: 0, lastReceived: null };
          cur.stockWeight += Number(r.remaining_weight || 0);
          cur.stockCount += 1;
          if (!cur.lastReceived || (r.received_date && r.received_date > cur.lastReceived)) cur.lastReceived = r.received_date;
          invByCompany.set(r.customer_name, cur);
        }

        const lastWorkByCompany = new Map();
        for (const r of workRows) {
          if (!r.company_name || !r.joborder_date) continue;
          const cur = lastWorkByCompany.get(r.company_name);
          if (!cur || r.joborder_date > cur) lastWorkByCompany.set(r.company_name, r.joborder_date);
        }

        const merged = Array.from(invByCompany.entries()).map(([customer_name, inv]) => {
          const lastWork = lastWorkByCompany.get(customer_name) || null;
          const idle = idleDaysFrom(lastWork);
          return {
            customer_name,
            stockWeight: inv.stockWeight,
            stockCount: inv.stockCount,
            lastReceived: inv.lastReceived,
            lastWork,
            idle,
            grade: gradeOf(idle),
          };
        });

        if (!cancelled) setRows(merged);
      } catch (e) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const toggleContacted = (name) => setContacted((prev) => ({ ...prev, [name]: !prev[name] }));

  const visibleRows = useMemo(() => {
    let list = rows.filter((r) => !contacted[r.customer_name]);
    if (gradeFilter !== '전체') list = list.filter((r) => r.grade === gradeFilter);
    list = [...list].sort((a, b) => {
      if (sortKey === 'stock') return b.stockWeight - a.stockWeight;
      // idle: 위험(이력없음 포함) 먼저, 그 다음 휴면일수 내림차순
      const gDiff = GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade];
      if (gDiff !== 0) return gDiff;
      const aIdle = a.idle === null ? Infinity : a.idle;
      const bIdle = b.idle === null ? Infinity : b.idle;
      return bIdle - aIdle;
    });
    return list;
  }, [rows, gradeFilter, sortKey, contacted]);

  const stats = useMemo(() => {
    const total = rows.length;
    const risky = rows.filter((r) => r.grade === '위험');
    const riskyTon = risky.reduce((s, r) => s + r.stockWeight, 0) / 1000;
    return { total, riskyCount: risky.length, riskyTon };
  }, [rows]);

  return (
    <div style={box.page}>
      <div>
        <h2 style={box.title}>영업대상 고객사 리스트 <span style={{ marginLeft: '10px', verticalAlign: 'middle' }}><span style={pill(COLORS.accentBg, COLORS.accentDark)}>제안 · 영업 지원</span></span></h2>
        <p style={box.hint}>재고를 맡겨둔 거래처 중 최근 작업이 뜸한 곳을 자동으로 찾아 영업팀에 알려줍니다.</p>
      </div>
      <ProposalBanner text="1단계 프로토타입 화면입니다. greenp_inventory·greenp_joborder_detail 실데이터를 그대로 조회해 휴면 등급을 계산합니다. 연락완료 체크는 아직 저장되지 않는 화면 내 임시 표시이며, 2단계에서 담당자 지정·연락 이력 저장 기능이 추가될 예정입니다." />

      {error && (
        <div style={{ ...box.card, color: COLORS.red, fontSize: '15px' }}>데이터를 불러오지 못했습니다: {error}</div>
      )}

      {loading ? (
        <div style={box.loadingText}>불러오는 중...</div>
      ) : (
        <>
          <div style={box.statGrid}>
            <div style={box.statCard}>
              <div style={box.statLabel}>재고보유 거래처</div>
              <div style={box.statValue}>{stats.total}곳</div>
            </div>
            <div style={{ ...box.statCard, borderLeft: `4px solid ${COLORS.red}` }}>
              <div style={box.statLabel}>위험군</div>
              <div style={{ ...box.statValue, color: COLORS.red }}>{stats.riskyCount}곳</div>
            </div>
            <div style={{ ...box.statCard, borderLeft: `4px solid ${COLORS.red}` }}>
              <div style={box.statLabel}>위험군 재고 합계</div>
              <div style={{ ...box.statValue, color: COLORS.red }}>{stats.riskyTon.toFixed(1)}톤</div>
            </div>
          </div>

          <div style={box.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['전체', '위험', '주의', '정상'].map((g) => (
                  <button
                    key={g}
                    onClick={() => setGradeFilter(g)}
                    style={{
                      ...box.ghostBtn, padding: '9px 18px', fontSize: '14px',
                      backgroundColor: gradeFilter === g ? COLORS.navy : '#eef2f7',
                      color: gradeFilter === g ? '#fff' : COLORS.steel,
                      border: `1px solid ${gradeFilter === g ? COLORS.navy : COLORS.border}`,
                    }}
                  >
                    {g}{g !== '전체' ? ` ${rows.filter((r) => r.grade === g).length}` : ` ${rows.length}`}
                  </button>
                ))}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setSortKey('idle')}
                  style={{ ...box.ghostBtn, padding: '9px 16px', fontSize: '14px', backgroundColor: sortKey === 'idle' ? COLORS.accentBg : '#eef2f7', color: sortKey === 'idle' ? COLORS.accentDark : COLORS.steel }}
                >휴면일수순</button>
                <button
                  onClick={() => setSortKey('stock')}
                  style={{ ...box.ghostBtn, padding: '9px 16px', fontSize: '14px', backgroundColor: sortKey === 'stock' ? COLORS.accentBg : '#eef2f7', color: sortKey === 'stock' ? COLORS.accentDark : COLORS.steel }}
                >재고량순</button>
              </div>
            </div>

            {visibleRows.length === 0 ? (
              <div style={box.emptyText}>조건에 맞는 거래처가 없습니다.</div>
            ) : (
              <table style={box.table}>
                <thead>
                  <tr>
                    <th style={box.th}>거래처명</th>
                    <th style={box.th}>보유재고</th>
                    <th style={box.th}>최근 입고일</th>
                    <th style={box.th}>최근 작업일</th>
                    <th style={box.th}>휴면일수</th>
                    <th style={box.th}>등급</th>
                    <th style={box.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((r) => {
                    const [color, bg] = GRADE_STYLE[r.grade];
                    return (
                      <tr key={r.customer_name}>
                        <td style={{ ...box.td, fontWeight: 700 }}>{r.customer_name}</td>
                        <td style={box.td}>{(r.stockWeight / 1000).toFixed(1)}톤 <span style={{ color: COLORS.steelLight, fontSize: '13px' }}>({r.stockCount}건)</span></td>
                        <td style={box.td}>{r.lastReceived || '-'}</td>
                        <td style={box.td}>{r.lastWork || '이력 없음'}</td>
                        <td style={box.td}>{r.idle === null ? '-' : `${r.idle}일`}</td>
                        <td style={box.td}><span style={pill(bg, color)}>{r.grade}</span></td>
                        <td style={box.td}>
                          <button onClick={() => toggleContacted(r.customer_name)} style={{ ...box.ghostBtn, padding: '7px 14px', fontSize: '13px' }}>연락완료</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {Object.values(contacted).some(Boolean) && (
            <div style={{ fontSize: '13px', color: COLORS.steelLight }}>
              연락완료 처리된 {Object.values(contacted).filter(Boolean).length}곳은 목록에서 숨겨져 있습니다. (새로고침하면 초기화되는 임시 상태입니다)
            </div>
          )}
        </>
      )}
    </div>
  );
}
