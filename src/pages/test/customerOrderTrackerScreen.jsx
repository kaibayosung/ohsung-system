// src/pages/test/customerOrderTrackerScreen.jsx
// 고객 주문 현황 트래커 — 외부 고객사 시연용 프로토타입 (연구실 전용, 실제 /portal은 건드리지 않음)
//
// 목적: "내가 넣은 작업이 지금 어디까지 진행됐는지"를 접수→작업지시→작업진행→작업완료→출고완료
// 5단계로 한눈에 보여줍니다. 실제 고객사 포털(/portal)과는 완전히 별개의 연구실 화면이며,
// 이 화면에서는 거래처를 직접 선택해 "그 거래처 입장에서 보이는 화면"을 미리 볼 수 있습니다
// (실제 서비스가 되면 로그인한 거래처 계정 기준으로 자동 필터링하면 됩니다).
//
// 데이터: greenp_joborder_detail(작업지시 상세) + greenp_joborders(상태: 준비/작업완료) +
// greenp_unshipped(미출고현황) 세 미러 테이블을 그대로 조회해 화면에서 단계만 계산합니다.
// 신규 테이블 없이 실데이터로 바로 동작합니다.
//
// 참고: 그린ERP는 "접수"와 "작업지시"를 하나의 이벤트로 함께 기록하기 때문에, 이 두 단계는
// 화면에 항상 같은 시점에 완료로 표시됩니다(그린ERP 자체에 접수 전용 타임스탬프가 없음).
// 또한 greenp_joborder_detail 미러에는 동일 건이 중복 동기화되는 경우가 있어, product_name
// 기준으로 화면에서 중복 제거해 보여줍니다.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { COLORS, box, pill, fmtWon, fmtNum } from './theme';
import { supabase } from '../../supabaseClient';

const STAGES = ['접수', '작업지시', '작업진행', '작업완료', '출고완료'];

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

// stageIndex: 0/1(접수·작업지시)은 행이 존재하면 항상 완료, 2(작업진행)~4(출고완료)는 실제 상태로 계산
function computeStageIndex(status, shipped) {
  if (status !== '작업완료') return 2; // 아직 진행중
  if (!shipped) return 3; // 작업은 끝났지만 출고 전
  return 4; // 출고까지 완료
}

function StageTracker({ stageIndex }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {STAGES.map((label, i) => {
        const state = i < stageIndex ? 'done' : i === stageIndex ? 'current' : 'pending';
        const circleColor = state === 'done' ? COLORS.green : state === 'current' ? COLORS.accent : COLORS.border;
        const textColor = state === 'pending' ? COLORS.steelLight : COLORS.navy;
        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <div style={{ width: '20px', height: '2px', background: i <= stageIndex ? COLORS.green : COLORS.border, flexShrink: 0 }} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '56px' }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%', background: circleColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 900,
                boxShadow: state === 'current' ? `0 0 0 4px ${COLORS.accentBg}` : 'none',
              }}>
                {state === 'done' ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: textColor, whiteSpace: 'nowrap' }}>{label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function CustomerOrderTrackerScreen() {
  const [companies, setCompanies] = useState([]);
  const [company, setCompany] = useState('(주)대한강재');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('greenp_customers').select('name').order('name');
      if (!cancelled) setCompanies((data || []).map((r) => r.name).filter(Boolean));
    })();
    return () => { cancelled = true; };
  }, []);

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError(null);
    try {
      const [detailRes, unshippedRes] = await Promise.all([
        supabase
          .from('greenp_joborder_detail')
          .select('joborder_no, joborder_date, product_name, spec, original_weight, amount, work_type, process_rule')
          .eq('company_name', company)
          .order('joborder_date', { ascending: false })
          .limit(200),
        supabase
          .from('greenp_unshipped')
          .select('product_name')
          .eq('company_name', company),
      ]);
      if (detailRes.error) throw detailRes.error;
      if (unshippedRes.error) throw unshippedRes.error;

      // product_name 기준 중복 제거 (미러 재동기화로 인한 중복 행 방지)
      const seen = new Set();
      const deduped = [];
      for (const r of detailRes.data || []) {
        if (seen.has(r.product_name)) continue;
        seen.add(r.product_name);
        deduped.push(r);
      }

      const topRows = deduped.slice(0, 40);

      // joborder_no는 "그 날짜의 N번째 슬립" 같은 일자별 재사용 번호라 그 자체로는 유일하지
      // 않습니다 — (거래처, 작업일, joborder_no) 조합이어야 실제 슬립 1건과 일치합니다.
      // 그래서 joborder_no만으로 조회하면 다른 날짜의 동일 번호 슬립까지 섞여 상태가 틀어집니다.
      const dates = [...new Set(topRows.map((r) => r.joborder_date))];
      let statusMap = new Map();
      if (dates.length > 0) {
        const { data: statusRows, error: statusErr } = await supabase
          .from('greenp_joborders')
          .select('joborder_no, joborder_date, status')
          .eq('company_name', company)
          .in('joborder_date', dates);
        if (statusErr) throw statusErr;
        statusMap = new Map((statusRows || []).map((r) => [`${r.joborder_date}|${r.joborder_no}`, r.status]));
      }

      const unshippedSet = new Set((unshippedRes.data || []).map((r) => r.product_name));

      const merged = topRows.map((r) => {
        const status = statusMap.get(`${r.joborder_date}|${r.joborder_no}`) || '준비';
        const shipped = status === '작업완료' && !unshippedSet.has(r.product_name);
        return { ...r, status, shipped, stageIndex: computeStageIndex(status, shipped) };
      });

      setRows(merged);
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(false);
  }, [company]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const total = rows.length;
    const inProgress = rows.filter((r) => r.stageIndex === 2).length;
    const done = rows.filter((r) => r.stageIndex >= 3).length;
    const shipped = rows.filter((r) => r.stageIndex === 4).length;
    const waitingShip = rows.filter((r) => r.stageIndex === 3).length;
    return { total, inProgress, done, shipped, waitingShip };
  }, [rows]);

  return (
    <div style={box.page}>
      <div>
        <h1 style={box.title}>📦 고객 주문 현황 트래커</h1>
        <p style={box.hint}>거래처를 선택하면, 그 거래처가 넣은 작업이 접수부터 출고까지 어느 단계에 있는지 한눈에 보여줍니다. 외부 고객사 시연용 연구실 프로토타입입니다.</p>
      </div>

      <ProposalBanner text="실제 고객사 포털(/portal)과는 별개의 연구실 프로토타입입니다. 그린ERP 미러 데이터(작업지시·미출고현황)를 그대로 조회하며, 실제 서비스로 만든다면 로그인한 거래처 계정 기준으로 이 화면이 자동 필터링됩니다. 그린ERP는 접수와 작업지시를 하나의 이벤트로 기록하기 때문에 두 단계는 항상 함께 완료로 표시됩니다." />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '15px', fontWeight: 800, color: COLORS.steel }}>거래처</label>
        <select
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          style={{ ...box.input, width: 'auto', minWidth: '260px' }}
        >
          {!companies.includes(company) && <option value={company}>{company}</option>}
          {companies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button style={box.ghostBtn} onClick={load}>새로고침</button>
      </div>

      {loading ? (
        <div style={box.loadingText}>불러오는 중...</div>
      ) : error ? (
        <div style={{ ...box.card, color: COLORS.red }}>{error}</div>
      ) : (
        <>
          <div style={box.statGrid}>
            <div style={box.statCard}>
              <div style={box.statLabel}>전체 주문</div>
              <div style={box.statValue}>{fmtNum(stats.total)}건</div>
            </div>
            <div style={{ ...box.statCard, borderLeftColor: COLORS.blue }}>
              <div style={box.statLabel}>작업 진행중</div>
              <div style={{ ...box.statValue, color: COLORS.blue }}>{fmtNum(stats.inProgress)}건</div>
            </div>
            <div style={{ ...box.statCard, borderLeftColor: COLORS.green }}>
              <div style={box.statLabel}>작업완료</div>
              <div style={{ ...box.statValue, color: COLORS.green }}>{fmtNum(stats.done)}건</div>
            </div>
            <div style={{ ...box.statCard, borderLeftColor: COLORS.amber }}>
              <div style={box.statLabel}>출고 대기</div>
              <div style={{ ...box.statValue, color: COLORS.amber }}>{fmtNum(stats.waitingShip)}건</div>
            </div>
            <div style={{ ...box.statCard, borderLeftColor: COLORS.accent }}>
              <div style={box.statLabel}>출고완료</div>
              <div style={{ ...box.statValue, color: COLORS.accentDark }}>{fmtNum(stats.shipped)}건</div>
            </div>
          </div>

          <div style={box.card}>
            <div style={box.subtitle}>주문 목록 (최근 {rows.length}건)</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={box.table}>
                <thead>
                  <tr>
                    <th style={box.th}>작업일</th>
                    <th style={box.th}>품명</th>
                    <th style={box.th}>규격</th>
                    <th style={box.th}>구분</th>
                    <th style={box.th}>중량</th>
                    <th style={box.th}>금액</th>
                    <th style={box.th}>진행 현황</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.product_name}>
                      <td style={{ ...box.td, whiteSpace: 'nowrap', color: COLORS.steelLight, fontSize: '14px' }}>{r.joborder_date}</td>
                      <td style={{ ...box.td, fontWeight: 700, fontFamily: 'monospace' }}>{r.product_name}</td>
                      <td style={box.td}>{r.spec}</td>
                      <td style={box.td}>
                        <span style={pill(COLORS.blueBg, COLORS.blue)}>{r.work_type}</span>
                      </td>
                      <td style={{ ...box.td, textAlign: 'right' }}>{fmtNum(r.original_weight)}kg</td>
                      <td style={{ ...box.td, textAlign: 'right' }}>{fmtWon(r.amount)}</td>
                      <td style={{ ...box.td, minWidth: '340px' }}>
                        <StageTracker stageIndex={r.stageIndex} />
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td style={box.td} colSpan={7}>해당 거래처의 최근 작업 내역이 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
