// src/components/expense/ExpenseDashboard.jsx
// 지출결의서 대시보드 — 결재대기/정기초안/반려/결재완료 현황과 계좌 잔액을 한눈에 보여줍니다.
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

function monthRange(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth();
  const from = new Date(y, m, 1).toISOString().split('T')[0];
  const to = new Date(y, m + 1, 0).toISOString().split('T')[0];
  return { from, to };
}

function ExpenseDashboard({ onGoList, onGoRecurring }) {
  const [counts, setCounts] = useState({ pending: 0, recurringDraft: 0, rejected: 0, approvedThisMonth: 0 });
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { from, to } = monthRange();

    const [{ count: pending }, { count: recurringDraft }, { count: rejected }, { count: approvedThisMonth }, { data: accs }, { data: unpaid }] = await Promise.all([
      supabase.from('expense_requests').select('id', { count: 'exact', head: true }).eq('status', '결재대기'),
      supabase.from('expense_requests').select('id', { count: 'exact', head: true }).eq('is_recurring', true).eq('status', '작성중').gte('request_date', from).lte('request_date', to),
      supabase.from('expense_requests').select('id', { count: 'exact', head: true }).eq('status', '반려'),
      supabase.from('expense_requests').select('id', { count: 'exact', head: true }).eq('status', '결재완료').gte('request_date', from).lte('request_date', to),
      supabase.from('company_bank_accounts').select('*').eq('is_active', true).order('id'),
      supabase.from('expense_requests').select('bank_account_id, total_amount').in('status', ['결재대기', '결재완료']).gte('request_date', from).lte('request_date', to),
    ]);

    const dueByAccount = {};
    (unpaid || []).forEach((r) => {
      if (!r.bank_account_id) return;
      dueByAccount[r.bank_account_id] = (dueByAccount[r.bank_account_id] || 0) + Number(r.total_amount || 0);
    });

    setCounts({ pending: pending || 0, recurringDraft: recurringDraft || 0, rejected: rejected || 0, approvedThisMonth: approvedThisMonth || 0 });
    setAccounts((accs || []).map((a) => ({ ...a, dueThisMonth: dueByAccount[a.id] || 0 })));
    setLoading(false);
  };

  if (loading) return <p style={styles.loadingText}>불러오는 중...</p>;

  const cards = [
    { key: 'pending', label: '결재대기', value: `${counts.pending}건`, bg: '#fdf1d6', tx: '#975a16', onClick: () => onGoList('결재대기') },
    { key: 'recurring', label: '이번달 정기초안', value: counts.recurringDraft > 0 ? `${counts.recurringDraft}건 검토필요` : '전체 상신 완료', bg: '#ebf4fb', tx: '#3182ce', onClick: onGoRecurring },
    { key: 'rejected', label: '반려', value: `${counts.rejected}건`, bg: '#f7fafc', tx: '#718096', onClick: () => onGoList('반려') },
    { key: 'approved', label: '이번달 결재완료', value: `${counts.approvedThisMonth}건`, bg: '#e3f6df', tx: '#276749', onClick: () => onGoList('결재완료') },
  ];

  return (
    <div>
      <h2 style={styles.title}>지출결의서 현황</h2>

      <div style={styles.cardGrid}>
        {cards.map((c) => (
          <button key={c.key} onClick={c.onClick} style={{ ...styles.card, backgroundColor: c.bg }}>
            <span style={styles.cardLabel}>{c.label}</span>
            <span style={{ ...styles.cardValue, color: c.tx }}>{c.value}</span>
          </button>
        ))}
      </div>

      <h3 style={styles.subtitle}>계좌 잔액</h3>
      <div style={styles.accountList}>
        {accounts.length === 0 && <p style={styles.emptyText}>등록된 계좌가 없습니다.</p>}
        {accounts.map((a) => {
          const short = Number(a.balance || 0) < Number(a.dueThisMonth || 0);
          return (
            <div key={a.id} style={styles.accountRow}>
              <span style={styles.accountName}>{a.bank_name} <span style={styles.accountNo}>{a.account_no}</span></span>
              <span style={{ ...styles.accountBalance, color: short ? '#c53030' : '#276749' }}>
                {Number(a.balance || 0).toLocaleString()}원
                {short && <span style={styles.warnBadge}>⚠ 이번달 지급예정액 부족</span>}
              </span>
            </div>
          );
        })}
      </div>
      <p style={styles.hint}>계좌 잔액은 "계좌 관리" 탭에서 최신 값으로 갱신할 수 있습니다.</p>
    </div>
  );
}

const styles = {
  loadingText: { color: '#718096', fontSize: '19px' },
  title: { margin: '0 0 26px 0', fontSize: '32px', fontWeight: 800, color: '#1a365d' },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '40px' },
  card: { border: 'none', borderRadius: '18px', padding: '30px 26px', display: 'flex', flexDirection: 'column', gap: '14px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' },
  cardLabel: { fontSize: '18px', fontWeight: 700, color: '#4a5568' },
  cardValue: { fontSize: '28px', fontWeight: 900 },
  subtitle: { fontSize: '24px', fontWeight: 700, color: '#2d3748', margin: '0 0 18px 0' },
  accountList: { border: '1px solid #e2e8f0', borderRadius: '14px', padding: '6px 0' },
  accountRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 26px', borderBottom: '1px solid #f1f5f9', fontSize: '19px' },
  accountName: { fontWeight: 700, color: '#2d3748' },
  accountNo: { fontWeight: 400, color: '#a0aec0', fontSize: '16px', marginLeft: '8px' },
  accountBalance: { fontWeight: 800, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' },
  warnBadge: { fontSize: '13px', fontWeight: 700, color: '#c53030', backgroundColor: '#fde2e2', padding: '4px 10px', borderRadius: '999px' },
  emptyText: { padding: '20px 26px', color: '#a0aec0', fontSize: '17px' },
  hint: { marginTop: '14px', color: '#a0aec0', fontSize: '15px' },
};

export default ExpenseDashboard;
