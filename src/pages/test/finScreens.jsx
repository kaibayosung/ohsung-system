// src/pages/test/finScreens.jsx
// 경리/재무(FIN) 화면 8종 — 기존 지출결의서 컴포넌트를 재사용하고, 미수금/결재라인상세/세금계산서는 신규 구현
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { COLORS, box, pill, fmtWon } from './theme';
import ExpenseForm from '../../components/expense/ExpenseForm';
import ExpenseApproval from '../../components/expense/ExpenseApproval';
import ExpenseDashboard from '../../components/expense/ExpenseDashboard';
import RecurringDraft from '../../components/expense/RecurringDraft';
import BankAccountManager from '../../components/expense/BankAccountManager';

// ---------- 19 미수금 현황 ----------
export function ReceivablesList({ onSelectCompany }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    supabase.from('receivables').select('*').order('amount', { ascending: false }).then(({ data }) => setRows(data || []));
  }, []);
  if (!rows) return <p style={box.loadingText}>불러오는 중...</p>;
  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div style={box.page}>
      <h2 style={box.title}>미수금 현황</h2>
      <div style={box.statGrid}>
        <div style={box.statCard}><span style={box.statLabel}>총 미수금</span><span style={{ ...box.statValue, color: '#dd6b20' }}>{fmtWon(total)}</span></div>
        <div style={box.statCard}><span style={box.statLabel}>거래처 수</span><span style={box.statValue}>{rows.length}개사</span></div>
        <div style={box.statCard}><span style={box.statLabel}>최다 미수</span><span style={{ ...box.statValue, color: COLORS.red }}>{rows[0]?.customer_name} {fmtWon(rows[0]?.amount)}</span></div>
      </div>
      <div style={box.card}>
        <table style={box.table}>
          <thead><tr><th style={box.th}>거래처</th><th style={box.th}>미수금액</th><th style={box.th}>비고</th><th style={box.th}></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={box.td}>{r.customer_name}</td>
                <td style={box.td}>{fmtWon(r.amount)}</td>
                <td style={box.td}>{r.overdue_days > 0 ? <span style={pill(COLORS.redBg, COLORS.red)}>연체 {r.overdue_days}일</span> : (r.note || '-')}</td>
                <td style={box.td}>
                  {onSelectCompany && <button style={{ ...box.ghostBtn, padding: '6px 14px', fontSize: '13px' }} onClick={() => onSelectCompany(r.customer_name)}>거래처 상세</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- 20 지출결의서 작성 ----------
export function ExpenseFormScreen() {
  return (
    <div style={box.page}>
      <h2 style={box.title}>지출결의서 작성</h2>
      <div style={box.card}>
        <ExpenseForm requestId={null} onSaved={() => alert('결의서가 저장되었습니다. "결재함"에서 확인하세요.')} onCancel={() => {}} />
      </div>
    </div>
  );
}

// ---------- 21 지출결의서 상세 (결재라인) ----------
export function ExpenseDetailApproval() {
  const [requests, setRequests] = useState([]);
  const [id, setId] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    supabase.from('expense_requests').select('id, request_date, requester, status, total_amount').order('id', { ascending: false }).limit(30).then(({ data }) => setRequests(data || []));
  }, []);

  useEffect(() => {
    if (!id) return;
    supabase.from('expense_requests').select('*, expense_request_items(*)').eq('id', id).single().then(({ data }) => setDetail(data));
  }, [id]);

  const steps = detail ? [
    { label: '기안', done: true, ts: detail.created_at },
    { label: '결재대기', done: ['결재대기', '결재완료', '반려'].includes(detail.status), ts: detail.status === '결재대기' ? detail.updated_at : (detail.status !== '작성중' ? detail.updated_at : null) },
    { label: detail.status === '반려' ? '반려' : '결재완료', done: detail.status === '결재완료' || detail.status === '반려', ts: detail.approved_at },
  ] : [];

  return (
    <div style={box.page}>
      <h2 style={box.title}>지출결의서 상세 (결재라인)</h2>
      <div style={box.card}>
        <label style={box.label}>결의서 선택</label>
        <select style={{ ...box.input, maxWidth: '420px' }} value={id || ''} onChange={(e) => setId(Number(e.target.value) || null)}>
          <option value="">선택하세요</option>
          {requests.map((r) => <option key={r.id} value={r.id}>#{r.id} · {r.request_date} · {r.requester || '작성자 미상'} · {fmtWon(r.total_amount)}</option>)}
        </select>
      </div>
      {detail && (
        <>
          <div style={box.card}>
            <h3 style={box.subtitle}>결재 진행 상황</h3>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              {steps.map((s, i) => (
                <div key={i} style={{ flex: 1, minWidth: '160px', background: s.done ? (s.label === '반려' ? COLORS.redBg : COLORS.greenBg) : '#f1f5f9', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontWeight: 700, color: s.done ? (s.label === '반려' ? COLORS.red : COLORS.green) : COLORS.steel }}>{s.label}</div>
                  <div style={{ fontSize: '13px', color: COLORS.steel, marginTop: '6px' }}>{s.ts ? new Date(s.ts).toLocaleString('ko-KR') : '대기중'}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={box.card}>
            <h3 style={box.subtitle}>상세 내역</h3>
            <table style={box.table}>
              <thead><tr><th style={box.th}>계정과목</th><th style={box.th}>거래처</th><th style={box.th}>금액</th><th style={box.th}>지급방법</th></tr></thead>
              <tbody>{(detail.expense_request_items || []).map((it) => <tr key={it.id}><td style={box.td}>{it.account_category || '-'}</td><td style={box.td}>{it.vendor_name}</td><td style={box.td}>{fmtWon(it.amount)}</td><td style={box.td}>{it.payment_method}</td></tr>)}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ---------- 22 지출결의서 결재함 ----------
export function ExpenseApprovalScreen() {
  const [requests, setRequests] = useState(null);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data } = await supabase.from('expense_requests').select('id, request_date, requester, status, total_amount').eq('status', '결재대기').order('id');
    setRequests(data || []);
  };

  if (activeId) {
    return <ExpenseApproval requestId={activeId} onDone={() => { setActiveId(null); load(); }} />;
  }

  if (!requests) return <p style={box.loadingText}>불러오는 중...</p>;

  return (
    <div style={box.page}>
      <h2 style={box.title}>지출결의서 결재함 · 대기 {requests.length}건</h2>
      <div style={box.card}>
        {requests.length === 0 && <p style={box.emptyText}>결재 대기중인 결의서가 없습니다.</p>}
        {requests.map((r) => (
          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${COLORS.border}` }}>
            <div>
              <div style={{ fontWeight: 700, color: COLORS.navy }}>#{r.id} · {r.request_date}</div>
              <div style={{ fontSize: '13px', color: COLORS.steel }}>신청자 {r.requester || '미상'}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontWeight: 700 }}>{fmtWon(r.total_amount)}</span>
              <button style={{ ...pill(COLORS.greenBg, COLORS.green), border: 'none', cursor: 'pointer', padding: '8px 18px', fontSize: '14px' }} onClick={() => setActiveId(r.id)}>결재 처리</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- 23 지출 대시보드 ----------
export function ExpenseDashboardScreen() {
  return (
    <div style={box.page}>
      <ExpenseDashboard onGoList={() => {}} onGoRecurring={() => {}} />
    </div>
  );
}

// ---------- 24 정기지출 관리 ----------
export function RecurringScreen() {
  return (
    <div style={box.page}>
      <h2 style={box.title}>정기지출(고정비) 관리</h2>
      <RecurringDraft onOpenForm={() => {}} />
    </div>
  );
}

// ---------- 25 계좌관리 ----------
export function AccountsScreen() {
  return (
    <div style={box.page}>
      <h2 style={box.title}>계좌관리</h2>
      <BankAccountManager />
    </div>
  );
}

// ---------- 26 세금계산서 연동 현황 ----------
export function TaxInvoiceStatus() {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    supabase.from('tax_invoices').select('*').order('issue_date', { ascending: false }).then(({ data }) => setRows(data || []));
  }, []);
  if (!rows) return <p style={box.loadingText}>불러오는 중...</p>;
  const issued = rows.filter((r) => r.status === '발행완료').length;

  return (
    <div style={box.page}>
      <h2 style={box.title}>세금계산서 연동 현황</h2>
      <div style={box.statGrid}>
        <div style={box.statCard}><span style={box.statLabel}>금월 발행 건수</span><span style={box.statValue}>{issued}건</span></div>
        <div style={box.statCard}><span style={box.statLabel}>국세청 전송</span><span style={{ ...box.statValue, color: COLORS.green }}>정상</span></div>
        <div style={box.statCard}><span style={box.statLabel}>EDI 연동 상태</span><span style={{ ...box.statValue, color: COLORS.green }}>정상 (스마일EDI)</span></div>
      </div>
      <div style={box.card}>
        <table style={box.table}>
          <thead><tr><th style={box.th}>발행일</th><th style={box.th}>거래처</th><th style={box.th}>금액</th><th style={box.th}>상태</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}><td style={box.td}>{r.issue_date}</td><td style={box.td}>{r.customer_name}</td><td style={box.td}>{fmtWon(r.amount)}</td><td style={box.td}><span style={pill(r.status === '발행완료' ? COLORS.greenBg : COLORS.redBg, r.status === '발행완료' ? COLORS.green : COLORS.red)}>{r.status}</span></td></tr>)}</tbody>
        </table>
      </div>
      <p style={box.hint}>법정 서류이므로 실제 발행은 그린피(스마일EDI)에서 유지되며, 이 화면은 발행 이력만 조회합니다.</p>
    </div>
  );
}
