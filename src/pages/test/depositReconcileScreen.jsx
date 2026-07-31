// src/pages/test/depositReconcileScreen.jsx
// 매출 거래명세서 ↔ 통장 입금 대사 — 기간을 정하고 거래명세서 엑셀 + 통장 거래내역 엑셀을 올리면
// 금액·거래처·시기를 맞춰 입금 여부를 자동 분류해주는 개념 화면입니다.
//
// 배경: 2026-07-31 대화에서 실제 거래명세서(거래처/공급금액/부가세/합계금액) 125건과 통장
// 거래내역(2025-08~2026-07) 파일을 올려 수작업으로 대사했던 것과 완전히 같은 로직을
// 화면에 그대로 옮긴 것입니다 — 결과는 85건 확인/22건 정산주기 내 대기/18건 장기 미입금이었습니다.
// 업로드한 파일은 저장되지 않고 화면에서만 계산됩니다 — 방향이 확정되면 greenp_receivables 등
// 실데이터 자동 연동과 결과 저장을 다음 단계로 개발합니다.
import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { COLORS, box, pill, fmtWon } from './theme';

// ---------- 공통 유틸 ----------
function toNum(v) {
  if (v === '' || v == null) return 0;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}
function normName(s) {
  return String(s || '').replace(/\(주\)|㈜|\s/g, '').replace(/[^\w가-힣A-Za-z0-9]/g, '').toUpperCase();
}
function toDateStr(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const m = s.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  return s.slice(0, 10);
}
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function diffDays(a, b) {
  return Math.round((new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24));
}

// ---------- 거래명세서 파싱 ----------
const INVOICE_HEAD_KEYS = ['기간', '업체명', '공급금액', '부가세', '합계금액'];
function parseInvoiceRows(rows) {
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const line = (rows[i] || []).map((c) => String(c || ''));
    const hits = INVOICE_HEAD_KEYS.filter((k) => line.some((c) => c.includes(k)));
    if (hits.length >= 3) { headerIdx = i; break; }
  }
  if (headerIdx === -1) return [];
  const header = rows[headerIdx].map((c) => String(c || '').trim());
  const col = (keys) => header.findIndex((h) => keys.some((k) => h.includes(k)));
  const idxPeriod = col(['기간']);
  const idxVendor = col(['업체명', '거래처']);
  const idxSupply = col(['공급금액', '공급가액']);
  const idxVat = col(['부가세']);
  const idxTotal = col(['합계금액', '합계']);

  const out = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === '' || c == null)) continue;
    const vendor = idxVendor >= 0 ? String(row[idxVendor] || '').trim() : '';
    if (!vendor) continue;
    const periodRaw = idxPeriod >= 0 ? String(row[idxPeriod] || '') : '';
    const m = periodRaw.match(/(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/);
    const start = m ? m[1] : '';
    const end = m ? m[2] : start;
    const total = idxTotal >= 0 ? toNum(row[idxTotal]) : 0;
    if (!start || total === 0) continue;
    out.push({
      id: `inv-${i}`,
      period: periodRaw,
      start, end,
      vendor,
      supply: idxSupply >= 0 ? toNum(row[idxSupply]) : 0,
      vat: idxVat >= 0 ? toNum(row[idxVat]) : 0,
      total,
    });
  }
  return out;
}

// ---------- 통장 거래내역 파싱 (입금/출금 모두 추출, 대사에는 입금만 사용) ----------
const BANK_HEAD_KEYS = ['거래일시', '거래일자', '적요', '출금액', '입금액'];
function parseBankRows(rows) {
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const line = (rows[i] || []).map((c) => String(c || ''));
    const hits = BANK_HEAD_KEYS.filter((k) => line.some((c) => c.includes(k)));
    if (hits.length >= 3) { headerIdx = i; break; }
  }
  if (headerIdx === -1) return [];
  const header = rows[headerIdx].map((c) => String(c || '').trim());
  const col = (keys) => header.findIndex((h) => keys.some((k) => h.includes(k)));
  const idxDate = col(['거래일시', '거래일자']);
  const idxDesc = col(['적요']);
  const idxOut = col(['출금액']);
  const idxIn = col(['입금액']);

  const out = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === '' || c == null)) continue;
    const date = toDateStr(row[idxDate]);
    if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) continue;
    const desc = idxDesc >= 0 ? String(row[idxDesc] || '') : '';
    const outAmt = idxOut >= 0 ? toNum(row[idxOut]) : 0;
    const inAmt = idxIn >= 0 ? toNum(row[idxIn]) : 0;
    if (outAmt === 0 && inAmt === 0) continue;
    out.push({ id: `bank-${i}-${date}-${inAmt}`, date: date.slice(0, 10), desc, out: outAmt, in: inAmt, norm: normName(desc) });
  }
  return out;
}

// ---------- 대사 로직 (Python 프로토타입과 동일한 규칙) ----------
function reconcile(invoices, deposits, today) {
  const used = new Set();
  return invoices.map((inv) => {
    const name = normName(inv.vendor);
    const windowStart = addDays(inv.start, -5);
    const windowEnd = addDays(inv.end, 45);
    const tryMatch = (withWindow) => {
      const cands = deposits.filter((d) => {
        if (used.has(d.id) || d.in !== inv.total) return false;
        if (withWindow) return d.date >= windowStart && d.date <= windowEnd;
        return true;
      });
      if (cands.length === 0) return null;
      const nameHit = cands.find((d) => name.length >= 3 && (d.norm.includes(name.slice(0, 3)) || name.includes(d.norm.slice(0, 3))));
      return nameHit || cands[0];
    };
    const match = tryMatch(true) || tryMatch(false);
    if (match) {
      used.add(match.id);
      return { ...inv, status: '확인됨', depositDate: match.date, depositDesc: match.desc, note: '' };
    }
    const daysSince = diffDays(today, inv.end);
    const note = daysSince <= 45 ? '정산주기 내 (정상 대기)' : '장기 미입금 - 확인 필요';
    return { ...inv, status: '미확인', depositDate: '', depositDesc: '', note };
  });
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

function StepBadge({ n }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: '26px', height: '26px', borderRadius: '50%', backgroundColor: COLORS.navy,
      color: '#fff', fontSize: '13px', fontWeight: 800, marginRight: '10px', flexShrink: 0,
    }}>{n}</span>
  );
}

function Dropzone({ icon, title, hint, fileNames, onFile, accent }) {
  const ref = useRef(null);
  return (
    <div
      onClick={() => ref.current?.click()}
      style={{
        flex: 1, minWidth: '260px', border: `2px dashed ${accent ? COLORS.accentBg : COLORS.border}`,
        borderRadius: '16px', padding: '26px 20px', textAlign: 'center', cursor: 'pointer',
        backgroundColor: accent ? COLORS.accentSoft : '#f7f9fc',
      }}
    >
      <div style={{ fontSize: '28px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '15.5px', fontWeight: 800, color: COLORS.navy, marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '12.5px', color: COLORS.steelLight, marginBottom: '8px' }}>{hint}</div>
      {fileNames.length > 0 ? (
        <div style={{ fontSize: '12.5px', color: COLORS.green, fontWeight: 700 }}>
          {fileNames.map((f) => <div key={f}>✓ {f}</div>)}
        </div>
      ) : (
        <div style={{ fontSize: '12.5px', color: COLORS.steelLight }}>클릭해서 파일 선택 (.xls/.xlsx/.csv, 여러 개 가능)</div>
      )}
      <input ref={ref} type="file" accept=".xls,.xlsx,.csv" multiple style={{ display: 'none' }} onChange={onFile} />
    </div>
  );
}

const STATUS_META = {
  확인됨: { color: COLORS.green, bg: COLORS.greenBg, icon: '✅', label: '입금 확인됨' },
  '정산주기 내 (정상 대기)': { color: COLORS.amber, bg: COLORS.amberBg, icon: '⏳', label: '정산주기 내 대기' },
  '장기 미입금 - 확인 필요': { color: COLORS.red, bg: COLORS.redBg, icon: '⚠️', label: '장기 미입금' },
};
function rowMeta(r) {
  if (r.status === '확인됨') return STATUS_META['확인됨'];
  return STATUS_META[r.note] || STATUS_META['장기 미입금 - 확인 필요'];
}

const TABS = ['전체', '확인됨', '정산주기 내 대기', '장기 미입금'];

export function DepositReconcileDemo() {
  const today = new Date().toISOString().slice(0, 10);
  const [periodStart, setPeriodStart] = useState(`${today.slice(0, 7)}-01`);
  const [periodEnd, setPeriodEnd] = useState(today);

  const [invoices, setInvoices] = useState([]);
  const [invoiceFiles, setInvoiceFiles] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [bankFiles, setBankFiles] = useState([]);
  const [parseError, setParseError] = useState('');
  const [results, setResults] = useState(null);
  const [tab, setTab] = useState('전체');
  const [search, setSearch] = useState('');

  const readFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array', cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

  const handleInvoiceFile = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setParseError('');
    try {
      let all = [];
      for (const f of files) {
        const rows = await readFile(f);
        all = all.concat(parseInvoiceRows(rows));
      }
      setInvoices(all);
      setInvoiceFiles(files.map((f) => f.name));
      setResults(null);
    } catch (err) {
      setParseError('거래명세서 파일을 읽는 중 오류: ' + err.message);
    }
  };

  const handleBankFile = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setParseError('');
    try {
      let all = [];
      for (const f of files) {
        const rows = await readFile(f);
        all = all.concat(parseBankRows(rows));
      }
      setDeposits(all);
      setBankFiles(files.map((f) => f.name));
      setResults(null);
    } catch (err) {
      setParseError('통장 거래내역 파일을 읽는 중 오류: ' + err.message);
    }
  };

  const canAnalyze = invoices.length > 0 && deposits.length > 0;

  const runAnalysis = () => {
    const filtered = invoices.filter((inv) => inv.start >= periodStart && inv.start <= periodEnd);
    const depositRows = deposits.filter((d) => d.in > 0);
    const matched = reconcile(filtered, depositRows, today);
    setResults(matched);
    setTab('전체');
  };

  const summary = useMemo(() => {
    if (!results) return null;
    const by = { 확인됨: [], '정산주기 내 대기': [], '장기 미입금': [] };
    results.forEach((r) => {
      if (r.status === '확인됨') by['확인됨'].push(r);
      else if (r.note === '정산주기 내 (정상 대기)') by['정산주기 내 대기'].push(r);
      else by['장기 미입금'].push(r);
    });
    const sum = (arr) => arr.reduce((a, c) => a + c.total, 0);
    return {
      total: results.length, totalAmt: sum(results),
      confirmed: by['확인됨'].length, confirmedAmt: sum(by['확인됨']),
      pending: by['정산주기 내 대기'].length, pendingAmt: sum(by['정산주기 내 대기']),
      overdue: by['장기 미입금'].length, overdueAmt: sum(by['장기 미입금']),
    };
  }, [results]);

  const filteredRows = useMemo(() => {
    if (!results) return [];
    let rows = results;
    if (tab === '확인됨') rows = rows.filter((r) => r.status === '확인됨');
    else if (tab === '정산주기 내 대기') rows = rows.filter((r) => r.note === '정산주기 내 (정상 대기)');
    else if (tab === '장기 미입금') rows = rows.filter((r) => r.note === '장기 미입금 - 확인 필요');
    if (search.trim()) rows = rows.filter((r) => r.vendor.includes(search.trim()));
    return [...rows].sort((a, b) => (a.end < b.end ? 1 : -1));
  }, [results, tab, search]);

  return (
    <div style={box.page}>
      <ProposalBanner text="매출 거래명세서와 통장 거래내역, 두 엑셀을 올리면 금액·거래처·기간을 맞춰 입금 여부를 자동으로 분류합니다. 기간이 지났는데도 입금이 확인되지 않은 건만 따로 모아 보여줘서, 매번 손으로 대사하지 않아도 됩니다. 업로드한 파일은 저장되지 않고 화면에서만 계산됩니다." />

      <div style={box.card}>
        <div style={box.subtitle}><StepBadge n={1} />대상 기간 선택</div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={box.label}>거래명세서 기준 시작일</label>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} style={box.input} />
          </div>
          <div>
            <label style={box.label}>종료일</label>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} style={box.input} />
          </div>
          <div style={{ ...box.hint, marginBottom: '13px' }}>거래명세서의 기간 시작일이 이 범위 안에 있는 건만 대사합니다.</div>
        </div>
      </div>

      <div style={box.card}>
        <div style={box.subtitle}><StepBadge n={2} />파일 업로드</div>
        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
          <Dropzone
            icon="🧾" title="매출 거래명세서" hint="기간 · 업체명 · 공급금액 · 부가세 · 합계금액 컬럼"
            fileNames={invoiceFiles} onFile={handleInvoiceFile} accent
          />
          <Dropzone
            icon="🏦" title="통장 거래내역" hint="거래일시 · 적요 · 출금액 · 입금액 컬럼 (거래내역조회 원본)"
            fileNames={bankFiles} onFile={handleBankFile}
          />
        </div>
        {parseError && <div style={{ color: COLORS.red, fontSize: '14px', marginTop: '12px' }}>{parseError}</div>}
        {(invoices.length > 0 || deposits.length > 0) && (
          <div style={{ ...box.hint, marginTop: '12px' }}>
            거래명세서 {invoices.length}건 · 통장 거래 {deposits.length}건 (입금 {deposits.filter((d) => d.in > 0).length}건) 인식됨
          </div>
        )}
        <button
          onClick={runAnalysis}
          disabled={!canAnalyze}
          style={{ ...box.primaryBtn, marginTop: '18px', opacity: canAnalyze ? 1 : 0.4, cursor: canAnalyze ? 'pointer' : 'not-allowed' }}
        >
          🔍 입금 대사 분석하기
        </button>
      </div>

      {summary && (
        <>
          <div style={box.card}>
            <div style={box.subtitle}><StepBadge n={3} />분석 결과</div>
            <div style={box.statGrid}>
              <div style={{ ...box.statCard, borderLeftColor: COLORS.navy }}>
                <span style={box.statLabel}>전체 거래명세서</span>
                <span style={box.statValue}>{summary.total}건</span>
                <span style={{ fontSize: '14px', color: COLORS.steelLight, fontWeight: 700 }}>{fmtWon(summary.totalAmt)}</span>
              </div>
              <div style={{ ...box.statCard, borderLeftColor: COLORS.green, backgroundColor: COLORS.greenBg }}>
                <span style={{ ...box.statLabel, color: COLORS.green }}>✅ 입금 확인됨</span>
                <span style={{ ...box.statValue, color: COLORS.green }}>{summary.confirmed}건</span>
                <span style={{ fontSize: '14px', color: COLORS.green, fontWeight: 700 }}>{fmtWon(summary.confirmedAmt)}</span>
              </div>
              <div style={{ ...box.statCard, borderLeftColor: COLORS.amber, backgroundColor: COLORS.amberBg }}>
                <span style={{ ...box.statLabel, color: COLORS.amber }}>⏳ 정산주기 내 대기</span>
                <span style={{ ...box.statValue, color: COLORS.amber }}>{summary.pending}건</span>
                <span style={{ fontSize: '14px', color: COLORS.amber, fontWeight: 700 }}>{fmtWon(summary.pendingAmt)}</span>
              </div>
              <div style={{ ...box.statCard, borderLeftColor: COLORS.red, backgroundColor: COLORS.redBg }}>
                <span style={{ ...box.statLabel, color: COLORS.red }}>⚠️ 장기 미입금</span>
                <span style={{ ...box.statValue, color: COLORS.red }}>{summary.overdue}건</span>
                <span style={{ fontSize: '14px', color: COLORS.red, fontWeight: 700 }}>{fmtWon(summary.overdueAmt)}</span>
              </div>
            </div>
          </div>

          <div style={box.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {TABS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      padding: '9px 16px', borderRadius: '999px', border: `1px solid ${tab === t ? COLORS.navy : COLORS.border}`,
                      backgroundColor: tab === t ? COLORS.navy : '#fff', color: tab === t ? '#fff' : COLORS.steel,
                      fontWeight: 800, fontSize: '13.5px', cursor: 'pointer',
                    }}
                  >
                    {t}{t !== '전체' && summary ? ` (${t === '확인됨' ? summary.confirmed : t === '정산주기 내 대기' ? summary.pending : summary.overdue})` : ''}
                  </button>
                ))}
              </div>
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="거래처명 검색" style={{ ...box.input, width: '200px' }}
              />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={box.table}>
                <thead>
                  <tr>
                    <th style={box.th}>기간</th>
                    <th style={box.th}>업체명</th>
                    <th style={{ ...box.th, textAlign: 'right' }}>합계금액</th>
                    <th style={box.th}>상태</th>
                    <th style={box.th}>입금일</th>
                    <th style={box.th}>입금적요</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr><td colSpan={6} style={box.emptyText}>해당하는 항목이 없습니다.</td></tr>
                  ) : filteredRows.map((r) => {
                    const meta = rowMeta(r);
                    return (
                      <tr key={r.id}>
                        <td style={box.td}>{r.period}</td>
                        <td style={{ ...box.td, fontWeight: 700 }}>{r.vendor}</td>
                        <td style={{ ...box.td, textAlign: 'right', fontWeight: 800 }}>{fmtWon(r.total)}</td>
                        <td style={box.td}><span style={pill(meta.bg, meta.color)}>{meta.icon} {meta.label}</span></td>
                        <td style={box.td}>{r.depositDate || '-'}</td>
                        <td style={{ ...box.td, color: COLORS.steelLight, fontSize: '14px' }}>{r.depositDesc || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ ...box.hint, marginTop: '14px' }}>
              ※ 같은 거래처·같은 금액이 한 달에 여러 번 나오는 항목은 원본 거래명세서 자체에 중복 집계가 있을 수 있습니다. 함께 확인해주세요.
            </div>
          </div>
        </>
      )}

      <div style={{ ...box.card, backgroundColor: '#f7f9fc' }}>
        <div style={box.subtitle}>다음 단계 (방향 확정 시 개발)</div>
        <ul style={{ margin: 0, paddingLeft: '20px', color: COLORS.steel, fontSize: '15px', lineHeight: 1.9 }}>
          <li>거래명세서를 엑셀 업로드 대신 greenp_receivables(그린ERP 미수금) 실데이터로 자동 조회</li>
          <li>통장 거래내역도 계좌 손익 대시보드와 같은 업로드/저장 파이프라인으로 통합</li>
          <li>장기 미입금 건은 알림(카카오톡/이메일)으로 담당자에게 자동 발송</li>
          <li>대사 결과를 매번 다시 계산하지 않도록 확정된 건은 저장해 다음 번엔 신규 건만 대사</li>
        </ul>
      </div>
    </div>
  );
}
