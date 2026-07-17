// src/components/expense/RecurringDraft.jsx
// 정기 지출 자동초안 — 매월 1일, 전월 결재완료(또는 최근) 데이터를 복사해
// 8개 정기 고정비 항목의 초안을 만들고, 담당자가 확인 후 상신하도록 합니다.
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const RECURRING_ITEMS = [
  { key: '급여', label: '인건비(급여)' },
  { key: '4대보험', label: '4대보험' },
  { key: '대출이자', label: '대출이자' },
  { key: '카드대금', label: '카드대금' },
  { key: '위탁대행/기타', label: '위탁대행/기타' },
  { key: '퇴직연금', label: '퇴직연금' },
  { key: '통신비', label: '통신비' },
  { key: '수도광열비', label: '수도광열비' },
];

function monthRange(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth();
  const from = new Date(y, m, 1).toISOString().split('T')[0];
  const to = new Date(y, m + 1, 0).toISOString().split('T')[0];
  return { from, to };
}

function RecurringDraft({ onOpenForm }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true);
    await autoGenerateMissing();
    await load();
    setLoading(false);
  };

  const load = async () => {
    const { from, to } = monthRange();
    const { data } = await supabase
      .from('expense_requests')
      .select('*, expense_request_items(amount)')
      .eq('is_recurring', true)
      .gte('request_date', from)
      .lte('request_date', to);

    const byKey = {};
    (data || []).forEach((r) => { byKey[r.recurring_key] = r; });

    setRows(RECURRING_ITEMS.map((it) => ({ ...it, request: byKey[it.key] || null })));
  };

  // 전월(또는 가장 최근) 같은 계정과목의 정기 지출결의서를 복사해 이번 달 초안을 만듭니다.
  const autoGenerateMissing = async () => {
    setGenerating(true);
    const { from, to } = monthRange();
    const { data: existing } = await supabase
      .from('expense_requests')
      .select('recurring_key')
      .eq('is_recurring', true)
      .gte('request_date', from)
      .lte('request_date', to);
    const existingKeys = new Set((existing || []).map((r) => r.recurring_key));

    for (const it of RECURRING_ITEMS) {
      if (existingKeys.has(it.key)) continue;

      const { data: prev } = await supabase
        .from('expense_requests')
        .select('*, expense_request_items(*)')
        .eq('is_recurring', true)
        .eq('recurring_key', it.key)
        .order('request_date', { ascending: false })
        .limit(1);

      const prevReq = prev && prev[0];
      if (!prevReq) continue; // 이전 데이터가 없으면 자동 생성하지 않음 — 목록화면에서 "최초 등록 필요"로 표시됨

      const { data: newReq, error } = await supabase
        .from('expense_requests')
        .insert({
          request_date: new Date().toISOString().split('T')[0],
          requester: prevReq.requester,
          bank_account_id: prevReq.bank_account_id,
          total_amount: prevReq.total_amount,
          status: '작성중',
          is_recurring: true,
          recurring_key: it.key,
          request_type: '정기',
        })
        .select('id')
        .single();
      if (error || !newReq) continue;

      const items = (prevReq.expense_request_items || []).map((prevIt, idx) => ({
        request_id: newReq.id,
        line_no: idx + 1,
        account_category: prevIt.account_category || it.key,
        vendor_name: prevIt.vendor_name,
        item_name: prevIt.item_name,
        amount: prevIt.amount,
        payment_method: '계좌이체',
        bank_name: prevIt.bank_name,
        account_no: prevIt.account_no,
        account_holder: prevIt.account_holder,
        passbook_memo: prevIt.passbook_memo,
        note: '자동생성 초안 — 전월 금액을 복사했습니다. 확인 후 상신해주세요.',
      }));
      if (items.length > 0) {
        await supabase.from('expense_request_items').insert(items);
      }
    }
    setGenerating(false);
  };

  const statusOf = (row) => {
    if (!row.request) return { text: '최초 등록 필요', bg: '#f7fafc', tx: '#a0aec0' };
    if (row.request.status === '결재대기') return { text: '결재대기', bg: '#fdf1d6', tx: '#975a16' };
    if (row.request.status === '결재완료') return { text: '결재완료', bg: '#e3f6df', tx: '#276749' };
    if (row.request.status === '반려') return { text: '반려', bg: '#fde2e2', tx: '#9b2c2c' };
    return { text: '검토대기', bg: '#ebf4fb', tx: '#3182ce' };
  };

  const amountOf = (row) => {
    if (!row.request) return '—';
    const sum = (row.request.expense_request_items || []).reduce((s, i) => s + Number(i.amount || 0), 0);
    return `${sum.toLocaleString()}원`;
  };

  if (loading) return <p style={styles.loadingText}>{generating ? '이번 달 정기초안을 생성하는 중...' : '불러오는 중...'}</p>;

  return (
    <div>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>정기 지출 자동초안</h2>
        <button onClick={init} style={styles.refreshBtn}>다시 확인</button>
      </div>
      <p style={styles.desc}>매월 1일, 전월 결재완료 데이터를 복사해 아래 8개 정기 고정비 항목의 초안이 자동으로 만들어집니다. 금액이 바뀐 항목만 열어서 수정한 뒤 상신해주세요.</p>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={styles.th}>항목</th>
              <th style={styles.th}>이번 달 금액</th>
              <th style={{ ...styles.th, width: '160px' }}>상태</th>
              <th style={{ ...styles.th, width: '120px' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const st = statusOf(row);
              return (
                <tr key={row.key} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: 700 }}>{row.label}</td>
                  <td style={styles.td}>{amountOf(row)}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, backgroundColor: st.bg, color: st.tx }}>{st.text}</span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <button
                      onClick={() => onOpenForm(row.request ? row.request.id : null)}
                      style={styles.openBtn}
                    >
                      {row.request ? '확인·수정' : '새로 등록'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  loadingText: { color: '#718096', fontSize: '19px' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  title: { margin: 0, fontSize: '32px', fontWeight: 800, color: '#1a365d' },
  refreshBtn: { padding: '12px 20px', backgroundColor: '#edf2f7', color: '#2d3748', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: 700 },
  desc: { color: '#718096', fontSize: '18px', marginBottom: '28px', lineHeight: 1.6 },
  tableWrapper: { overflowX: 'auto', borderRadius: '14px', border: '1px solid #edf1f5' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '18px' },
  thRow: { backgroundColor: '#f7fafc', textAlign: 'left' },
  th: { padding: '18px 20px', borderBottom: '2px solid #e2e8f0', color: '#4a5568', fontSize: '17px', fontWeight: 700 },
  tr: { borderBottom: '1px solid #edf2f7' },
  td: { padding: '18px 20px', color: '#2d3748' },
  badge: { display: 'inline-block', padding: '7px 14px', borderRadius: '999px', fontSize: '15px', fontWeight: 700 },
  openBtn: { padding: '10px 18px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '15px', fontWeight: 700 },
};

export default RecurringDraft;
