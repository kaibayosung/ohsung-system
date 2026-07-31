// src/pages/test/cashFlowPnlScreen.jsx
// 계좌 손익 통합 데모 — 통장 거래내역(거래내역조회 엑셀)을 업로드하면 그린ERP 매출(가공+고철)과
// 합쳐 월간 손익을 바로 계산해 보여주는 개념 화면입니다.
//
// 배경: CEOMonthlyReport.jsx의 "확정 고정비" 카드는 지금 대표님이 통장 실적(거래내역조회)을
// 손으로 분석해 monthly_fixed_cost_items에 매달 스냅샷으로 저장해두는 방식으로 동작합니다.
// 이 화면은 그 과정을 "통장 엑셀을 업로드하면 자동 집계"로 바꿀 수 있는지 UI로 먼저 확인해보기
// 위한 프로토타입입니다. 매출(greenp_production/scrap_sales)은 실데이터를 그대로 읽어오지만,
// 업로드한 거래내역은 저장되지 않고 화면에서만 계산됩니다 — 방향이 확정되면 실제 저장 테이블과
// 지출결의서 매칭 로직을 개발합니다.
import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { COLORS, box, pill, fmtWon } from './theme';
import { supabase } from '../../supabaseClient';

const CATEGORY_OPTIONS = ['급여', '4대보험', '퇴직연금', '대출이자', '카드대금', '수도광열비', '통신비', '위탁대행/기타', '내부이체(제외)'];

const CATEGORY_RULES = [
  { cat: '대출이자', re: /이자/ },
  { cat: '급여', re: /급여|급료|월급/ },
  { cat: '4대보험', re: /국민연금|건강보험|고용보험|산재보험|4대보험/ },
  { cat: '퇴직연금', re: /퇴직연금/ },
  { cat: '카드대금', re: /카드/ },
  { cat: '수도광열비', re: /수도|전기|가스|공과금|한전/ },
  { cat: '통신비', re: /통신|인터넷|[Kk][Tt]|SKT|LGU/ },
];

const CAT_COLOR = {
  급여: [COLORS.blue, COLORS.blueBg],
  '4대보험': [COLORS.steel, '#e9edf3'],
  퇴직연금: [COLORS.steel, '#e9edf3'],
  대출이자: [COLORS.red, COLORS.redBg],
  카드대금: [COLORS.amber, COLORS.amberBg],
  수도광열비: [COLORS.amber, COLORS.amberBg],
  통신비: [COLORS.blue, COLORS.blueBg],
  '위탁대행/기타': [COLORS.steel, '#e9edf3'],
  '내부이체(제외)': [COLORS.steelLight, '#f1f4f8'],
};

function guessCategory(type, desc) {
  const text = `${type || ''} ${desc || ''}`;
  // 주의: 구분="대체"는 은행 거래유형 표기일 뿐, 실제 자사 계좌간 이체(내부이체)라는 뜻이
  // 아닙니다 (예: "대체 퇴직연금이체거래"는 실제 비용). 자사 계좌간 이체는 적요에 다른 쪽
  // 계좌 주인/계좌번호가 명시적으로 나올 때만 사람이 판단해 표에서 직접 "내부이체(제외)"로
  // 바꿔주세요 — 기본값은 항상 비용으로 포함합니다.
  for (const r of CATEGORY_RULES) if (r.re.test(text)) return r.cat;
  return '위탁대행/기타';
}

function toDateStr(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const m = s.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  return s.slice(0, 10);
}

function toNum(v) {
  if (v === '' || v == null) return 0;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

const HEAD_KEYS = ['거래일시', '거래일자', '적요', '출금액', '입금액'];

// 거래내역조회 엑셀은 상단에 제목/계좌정보 행이 섞여 있어, 헤더 키워드가 3개 이상 매칭되는
// 행을 찾아 그 아래부터 거래 행으로 취급합니다. (지출결의서 업로드에서 쓴 것과 같은 방식)
function parseBankRows(rows) {
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const line = (rows[i] || []).map((c) => String(c || ''));
    const hits = HEAD_KEYS.filter((k) => line.some((c) => c.includes(k)));
    if (hits.length >= 3) { headerIdx = i; break; }
  }
  if (headerIdx === -1) return [];

  const header = rows[headerIdx].map((c) => String(c || '').trim());
  const col = (keys) => header.findIndex((h) => keys.some((k) => h.includes(k)));
  const idxDate = col(['거래일시', '거래일자']);
  const idxType = col(['구분']);
  const idxDesc = col(['적요']);
  const idxOut = col(['출금액']);
  const idxIn = col(['입금액']);
  const idxBranch = col(['거래점']);

  const out = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === '' || c == null)) continue;
    const date = toDateStr(row[idxDate]);
    if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) continue;
    const type = idxType >= 0 ? String(row[idxType] || '') : '';
    const desc = idxDesc >= 0 ? String(row[idxDesc] || '') : '';
    const outAmt = idxOut >= 0 ? toNum(row[idxOut]) : 0;
    const inAmt = idxIn >= 0 ? toNum(row[idxIn]) : 0;
    const branch = idxBranch >= 0 ? String(row[idxBranch] || '') : '';
    if (outAmt === 0 && inAmt === 0) continue;
    out.push({
      id: `${i}-${date}-${outAmt}-${inAmt}`,
      date: date.slice(0, 10),
      type, desc, outAmt, inAmt, branch,
      category: guessCategory(type, desc),
      included: outAmt > 0, // 입금 행은 비용 집계에서 기본 제외
    });
  }
  return out;
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

export function CashFlowPnlDemo() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [revenue, setRevenue] = useState(null);
  const [loadingRevenue, setLoadingRevenue] = useState(false);
  const [expenseReqs, setExpenseReqs] = useState([]);
  const [loadingExpenseReqs, setLoadingExpenseReqs] = useState(false);
  const [txns, setTxns] = useState([]);
  const [fileName, setFileName] = useState('');
  const [interest, setInterest] = useState('6000000');
  const [parseError, setParseError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const [y, mo] = month.split('-').map(Number);
    const start = `${y}-${String(mo).padStart(2, '0')}-01`;
    const end = new Date(y, mo, 0).toISOString().slice(0, 10);

    const loadRevenue = async () => {
      setLoadingRevenue(true);
      const [prodRes, scrapRes] = await Promise.all([
        supabase.from('greenp_production').select('amount').gte('slip_date', start).lte('slip_date', end),
        supabase.from('scrap_sales').select('total_amount').gte('sale_date', start).lte('sale_date', end),
      ]);
      if (cancelled) return;
      const processing = (prodRes.data || []).reduce((a, c) => a + (Number(c.amount) || 0), 0);
      const scrap = (scrapRes.data || []).reduce((a, c) => a + (Number(c.total_amount) || 0), 0);
      setRevenue({ processing, scrap, total: processing + scrap });
      setLoadingRevenue(false);
    };

    // 정기초안(월급여 등, is_recurring=true)은 이미 별도 고정비 체계(monthly_fixed_cost_items)로
    // 관리되고 있고 통장 출금에도 그대로 잡히므로 여기서는 제외 — "지금 결재 올린 건"에 해당하는
    // 수시 지출결의서(is_recurring=false)만 통장 데이터와 합산할 비용으로 가져옵니다.
    const loadExpenseReqs = async () => {
      setLoadingExpenseReqs(true);
      const { data } = await supabase
        .from('expense_requests')
        .select('id, request_date, requester, status, total_amount')
        .eq('is_recurring', false)
        .gte('request_date', start)
        .lte('request_date', end)
        .order('request_date');
      if (cancelled) return;
      setExpenseReqs((data || []).map((r) => ({ ...r, included: true })));
      setLoadingExpenseReqs(false);
    };

    loadRevenue();
    loadExpenseReqs();
    return () => { cancelled = true; };
  }, [month]);

  const updateExpenseReq = (id, patch) => setExpenseReqs((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const expenseReqTotal = useMemo(
    () => expenseReqs.filter((r) => r.included).reduce((a, c) => a + (Number(c.total_amount) || 0), 0),
    [expenseReqs],
  );

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setParseError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array', cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        const parsed = parseBankRows(rows);
        if (parsed.length === 0) {
          setParseError('거래내역을 찾지 못했습니다. 거래일시/적요/출금액/입금액 열이 있는 표인지 확인해주세요.');
        }
        setTxns(parsed);
      } catch (err) {
        setParseError('파일을 읽는 중 오류가 발생했습니다: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const updateTxn = (id, patch) => setTxns((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const monthTxns = useMemo(() => txns.filter((t) => t.date.startsWith(month)), [txns, month]);

  const byCategory = useMemo(() => {
    const map = {};
    monthTxns.forEach((t) => {
      if (!t.included || t.category === '내부이체(제외)') return;
      map[t.category] = (map[t.category] || 0) + t.outAmt;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthTxns]);

  const bankExpenseTotal = byCategory.reduce((a, [, v]) => a + v, 0);
  const interestAmt = toNum(interest);
  const costTotal = expenseReqTotal + bankExpenseTotal + interestAmt;
  const revenueTotal = revenue ? revenue.total : 0;
  const profit = revenueTotal - costTotal;

  return (
    <div style={box.page}>
      <ProposalBanner text="이 화면은 (1) 결재 진행 중인 수시 지출결의서 + (2) 통장 거래내역 업로드 + (3) 이자 수기입력, 세 가지를 합쳐 이번 달 비용을 계산하고, 그린ERP 매출(가공+고철)과 맞춰 손익을 보여주는 개념 검증용 데모입니다. 급여 등 정기초안(is_recurring)은 통장 출금에 이미 포함되므로 제외했습니다. 업로드한 파일은 저장되지 않고 새로고침하면 초기화됩니다." />

      <div style={box.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={box.subtitle}>{month} 월간 손익 (데모)</div>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ ...box.input, width: 'auto' }} />
        </div>

        <div style={{ ...box.statGrid, marginTop: '18px' }}>
          <div style={box.statCard}>
            <span style={box.statLabel}>가공 매출 (greenp_production)</span>
            <span style={box.statValue}>{loadingRevenue ? '…' : fmtWon(revenue?.processing)}</span>
          </div>
          <div style={{ ...box.statCard, borderLeftColor: COLORS.green }}>
            <span style={box.statLabel}>♻️ 스크랩 매출 (scrap_sales)</span>
            <span style={{ ...box.statValue, color: COLORS.green }}>{loadingRevenue ? '…' : fmtWon(revenue?.scrap)}</span>
          </div>
          <div style={{ ...box.statCard, borderLeftColor: COLORS.blue, backgroundColor: COLORS.blueBg }}>
            <span style={box.statLabel}>매출 합계</span>
            <span style={{ ...box.statValue, color: COLORS.blue }}>{loadingRevenue ? '…' : fmtWon(revenueTotal)}</span>
          </div>
        </div>

        <div style={{ ...box.statGrid, marginTop: '14px' }}>
          <div style={{ ...box.statCard, borderLeftColor: COLORS.red }}>
            <span style={box.statLabel}>지출결의서 (결재 진행중 {expenseReqs.filter((r) => r.included).length}건)</span>
            <span style={{ ...box.statValue, color: COLORS.red }}>{loadingExpenseReqs ? '…' : fmtWon(expenseReqTotal)}</span>
          </div>
          <div style={{ ...box.statCard, borderLeftColor: COLORS.red }}>
            <span style={box.statLabel}>통장 출금 합계</span>
            <span style={{ ...box.statValue, color: COLORS.red }}>{fmtWon(bankExpenseTotal)}</span>
          </div>
          <div style={{ ...box.statCard, borderLeftColor: COLORS.red }}>
            <span style={box.statLabel}>이자 (수기입력)</span>
            <span style={{ ...box.statValue, color: COLORS.red }}>{fmtWon(interestAmt)}</span>
          </div>
          <div style={{ ...box.statCard, borderLeftColor: COLORS.red, backgroundColor: COLORS.redBg }}>
            <span style={box.statLabel}>비용 합계</span>
            <span style={{ ...box.statValue, color: COLORS.red }}>{fmtWon(costTotal)}</span>
          </div>
        </div>

        <div style={{ marginTop: '14px' }}>
          <div style={{ ...box.statCard, borderLeftColor: profit >= 0 ? COLORS.green : COLORS.red, backgroundColor: profit >= 0 ? COLORS.greenBg : COLORS.redBg }}>
            <span style={box.statLabel}>월간 손익 (매출 합계 − 비용 합계)</span>
            <span style={{ ...box.statValue, fontSize: '38px', color: profit >= 0 ? COLORS.green : COLORS.red }}>{profit >= 0 ? '+' : ''}{fmtWon(profit)}</span>
          </div>
        </div>
      </div>

      {expenseReqs.length > 0 && (
        <div style={box.card}>
          <div style={box.subtitle}>1. {month} 지출결의서 (정기초안 제외, 결재 진행중 포함)</div>
          <table style={box.table}>
            <thead>
              <tr>
                <th style={box.th}>포함</th>
                <th style={box.th}>번호</th>
                <th style={box.th}>일자</th>
                <th style={box.th}>요청자</th>
                <th style={box.th}>상태</th>
                <th style={{ ...box.th, textAlign: 'right' }}>금액</th>
              </tr>
            </thead>
            <tbody>
              {expenseReqs.map((r) => (
                <tr key={r.id} style={{ opacity: r.included ? 1 : 0.45 }}>
                  <td style={box.td}>
                    <input type="checkbox" checked={r.included} onChange={(e) => updateExpenseReq(r.id, { included: e.target.checked })} />
                  </td>
                  <td style={box.td}>#{r.id}</td>
                  <td style={box.td}>{r.request_date}</td>
                  <td style={box.td}>{r.requester}</td>
                  <td style={box.td}><span style={pill(r.status === '결재완료' ? COLORS.greenBg : COLORS.amberBg, r.status === '결재완료' ? COLORS.green : COLORS.amber)}>{r.status}</span></td>
                  <td style={{ ...box.td, textAlign: 'right', fontWeight: 800 }}>{fmtWon(r.total_amount)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={5} style={{ ...box.td, fontWeight: 900, textAlign: 'right', borderTop: `2px solid ${COLORS.navy}` }}>합계</td>
                <td style={{ ...box.td, textAlign: 'right', fontWeight: 900, fontSize: '19px', borderTop: `2px solid ${COLORS.navy}` }}>{fmtWon(expenseReqTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div style={box.card}>
        <div style={box.subtitle}>2. 계좌 거래내역 업로드</div>
        <div style={uploadStyles.dropzone} onClick={() => fileRef.current?.click()}>
          <div style={uploadStyles.icon}>📄</div>
          <div style={uploadStyles.text}>{fileName || '거래내역조회 엑셀(.xls/.xlsx/.csv) 클릭해서 업로드'}</div>
          <div style={uploadStyles.hint}>은행 홈페이지에서 내려받은 거래내역조회 파일을 그대로 올리면 됩니다</div>
          <input ref={fileRef} type="file" accept=".xls,.xlsx,.csv" onChange={handleFile} style={{ display: 'none' }} />
        </div>
        {parseError && <div style={{ color: COLORS.red, fontSize: '14px', marginTop: '10px' }}>{parseError}</div>}
        {txns.length > 0 && (
          <div style={{ ...box.hint, marginTop: '10px' }}>
            업로드 파일 총 {txns.length}건 중 {month} 해당 {monthTxns.length}건을 아래 표에 표시합니다.
          </div>
        )}
      </div>

      {monthTxns.length > 0 && (
        <>
          <div style={box.card}>
            <div style={box.subtitle}>3. 통장 카테고리별 비용 집계 (자동 분류, 표에서 직접 수정 가능)</div>
            <table style={box.table}>
              <thead>
                <tr>
                  <th style={box.th}>카테고리</th>
                  <th style={{ ...box.th, textAlign: 'right' }}>금액</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.map(([cat, amt]) => {
                  const [color, bg] = CAT_COLOR[cat] || [COLORS.steel, '#e9edf3'];
                  return (
                    <tr key={cat}>
                      <td style={box.td}><span style={pill(bg, color)}>{cat}</span></td>
                      <td style={{ ...box.td, textAlign: 'right', fontWeight: 800 }}>{fmtWon(amt)}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td style={box.td}><span style={pill(COLORS.accentBg, COLORS.accentDark)}>이자 (수기입력)</span></td>
                  <td style={{ ...box.td, textAlign: 'right' }}>
                    <input
                      type="number"
                      value={interest}
                      onChange={(e) => setInterest(e.target.value)}
                      placeholder="0"
                      style={{ ...box.input, width: '160px', textAlign: 'right', display: 'inline-block' }}
                    />
                  </td>
                </tr>
                <tr>
                  <td style={{ ...box.td, fontWeight: 900, borderTop: `2px solid ${COLORS.navy}` }}>통장 출금 + 이자 소계</td>
                  <td style={{ ...box.td, textAlign: 'right', fontWeight: 900, fontSize: '19px', borderTop: `2px solid ${COLORS.navy}` }}>{fmtWon(bankExpenseTotal + interestAmt)}</td>
                </tr>
                <tr>
                  <td style={{ ...box.td, color: COLORS.steelLight, fontSize: '13px' }}>+ 지출결의서(결재 진행중)</td>
                  <td style={{ ...box.td, textAlign: 'right', color: COLORS.steelLight, fontSize: '13px' }}>{fmtWon(expenseReqTotal)}</td>
                </tr>
                <tr>
                  <td style={{ ...box.td, fontWeight: 900, borderTop: `2px solid ${COLORS.navy}` }}>비용 총합계</td>
                  <td style={{ ...box.td, textAlign: 'right', fontWeight: 900, fontSize: '19px', borderTop: `2px solid ${COLORS.navy}` }}>{fmtWon(costTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={box.card}>
            <div style={box.subtitle}>4. {month} 거래 내역 ({monthTxns.length}건)</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={box.table}>
                <thead>
                  <tr>
                    <th style={box.th}>포함</th>
                    <th style={box.th}>일자</th>
                    <th style={box.th}>구분</th>
                    <th style={box.th}>적요</th>
                    <th style={{ ...box.th, textAlign: 'right' }}>출금액</th>
                    <th style={{ ...box.th, textAlign: 'right' }}>입금액</th>
                    <th style={box.th}>거래점</th>
                    <th style={box.th}>카테고리</th>
                  </tr>
                </thead>
                <tbody>
                  {monthTxns.map((t) => (
                    <tr key={t.id} style={{ opacity: t.included ? 1 : 0.45 }}>
                      <td style={box.td}>
                        <input type="checkbox" checked={t.included} onChange={(e) => updateTxn(t.id, { included: e.target.checked })} />
                      </td>
                      <td style={box.td}>{t.date}</td>
                      <td style={box.td}>{t.type}</td>
                      <td style={box.td}>{t.desc}</td>
                      <td style={{ ...box.td, textAlign: 'right', color: t.outAmt ? COLORS.red : COLORS.steelLight }}>{t.outAmt ? fmtWon(t.outAmt) : '-'}</td>
                      <td style={{ ...box.td, textAlign: 'right', color: t.inAmt ? COLORS.green : COLORS.steelLight }}>{t.inAmt ? fmtWon(t.inAmt) : '-'}</td>
                      <td style={box.td}>{t.branch}</td>
                      <td style={box.td}>
                        <select
                          value={t.category}
                          onChange={(e) => updateTxn(t.id, { category: e.target.value })}
                          style={{ padding: '6px 8px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '13px', fontFamily: 'inherit' }}
                        >
                          {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div style={{ ...box.card, backgroundColor: '#f7f9fc' }}>
        <div style={box.subtitle}>다음 단계 (방향 확정 시 개발)</div>
        <ul style={{ margin: 0, paddingLeft: '20px', color: COLORS.steel, fontSize: '15px', lineHeight: 1.9 }}>
          <li>업로드한 거래내역을 실제 테이블에 저장 (계좌별 · 월별, 중복 업로드 방지)</li>
          <li>지출결의서(계좌이체 건)와 금액·날짜·거래처로 자동 매칭 → 이중 집계 방지 + 결재완료 자동 반영</li>
          <li>CEOMonthlyReport의 "확정 고정비" 카드를 이 자동 집계 값으로 교체 (지금은 대표님이 매달 수기로 확정)</li>
          <li>계좌 2개(1005-404-709760, 433-910049-16804) 동시 업로드 지원 + 계좌간 내부이체 자동 상계</li>
        </ul>
      </div>
    </div>
  );
}

const uploadStyles = {
  dropzone: {
    border: `2px dashed ${COLORS.border}`, borderRadius: '14px', padding: '32px 20px', textAlign: 'center',
    cursor: 'pointer', backgroundColor: COLORS.accentSoft,
  },
  icon: { fontSize: '30px', marginBottom: '8px' },
  text: { fontSize: '16px', fontWeight: 700, color: COLORS.navy, marginBottom: '4px' },
  hint: { fontSize: '13px', color: COLORS.steelLight },
};
