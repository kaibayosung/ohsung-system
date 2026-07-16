// src/components/expense/ExpenseList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

const STATUS_STYLE = {
  '작성중': { bg: '#edf2f7', tx: '#4a5568' },
  '결재대기': { bg: '#fdf1d6', tx: '#975a16' },
  '결재완료': { bg: '#e3f6df', tx: '#276749' },
  '반려': { bg: '#fde2e2', tx: '#9b2c2c' },
};

function ExpenseList({ onOpenPrint, onOpenApproval, onOpenForm, onNew }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ from: '', to: '', status: '전체', accountId: '전체' });
  const [accounts, setAccounts] = useState([]);

  useEffect(() => { fetchAccounts(); }, []);
  useEffect(() => { fetchList(); }, [filters]);

  const fetchAccounts = async () => {
    const { data } = await supabase.from('company_bank_accounts').select('id, bank_name, account_no').order('id');
    setAccounts(data || []);
  };

  const fetchList = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('expense_requests')
      .select('*, company_bank_accounts(bank_name, account_no), expense_request_items(vendor_name)')
      .order('request_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.from) query = query.gte('request_date', filters.from);
    if (filters.to) query = query.lte('request_date', filters.to);
    if (filters.status !== '전체') query = query.eq('status', filters.status);
    if (filters.accountId !== '전체') query = query.eq('bank_account_id', filters.accountId);

    const { data, error } = await query;
    if (error) console.error(error);
    setRows(data || []);
    setLoading(false);
  }, [filters]);

  const vendorSummary = (items) => {
    if (!items || items.length === 0) return '-';
    const first = items[0]?.vendor_name || '-';
    return items.length > 1 ? `${first} 외 ${items.length - 1}건` : first;
  };

  const handleDelete = async (id) => {
    if (!window.confirm('이 지출결의서를 삭제하시겠습니까? 항목도 함께 삭제됩니다.')) return;
    const { error } = await supabase.from('expense_requests').delete().eq('id', id);
    if (error) { alert('삭제 실패: ' + error.message); return; }
    fetchList();
  };

  return (
    <div>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>지출결의서 목록</h2>
        <button onClick={onNew} style={styles.newBtn}>+ 새 결의서 작성</button>
      </div>

      <div style={styles.filterRow}>
        <div style={styles.field}>
          <label style={styles.label}>시작일</label>
          <input type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} style={styles.input} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>종료일</label>
          <input type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} style={styles.input} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>출금계좌</label>
          <select value={filters.accountId} onChange={(e) => setFilters((f) => ({ ...f, accountId: e.target.value }))} style={styles.input}>
            <option value="전체">전체</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.bank_name} {a.account_no}</option>
            ))}
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>상태</label>
          <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} style={styles.input}>
            {['전체', '작성중', '결재대기', '결재완료', '반려'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p style={styles.emptyText}>불러오는 중...</p>
      ) : rows.length === 0 ? (
        <p style={styles.emptyText}>조건에 맞는 지출결의서가 없습니다.</p>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>기안일자</th>
                <th style={styles.th}>출금계좌</th>
                <th style={styles.th}>작성자</th>
                <th style={styles.th}>거래처</th>
                <th style={styles.th}>합계금액</th>
                <th style={styles.th}>상태</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const badge = STATUS_STYLE[r.status] || STATUS_STYLE['작성중'];
                return (
                  <tr key={r.id} style={styles.tr}>
                    <td style={styles.td}>{r.request_date}</td>
                    <td style={styles.td}>{r.company_bank_accounts ? `${r.company_bank_accounts.bank_name} ${r.company_bank_accounts.account_no}` : '-'}</td>
                    <td style={styles.td}>{r.requester || '-'}</td>
                    <td style={styles.td}>{vendorSummary(r.expense_request_items)}</td>
                    <td style={{ ...styles.td, fontWeight: 700 }}>{Number(r.total_amount || 0).toLocaleString()}원</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, backgroundColor: badge.bg, color: badge.tx }}>{r.status}</span>
                    </td>
                    <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                      {r.status === '작성중' && (
                        <button onClick={() => onOpenForm(r.id)} style={styles.actionBtn}>수정</button>
                      )}
                      {(r.status === '결재대기' || r.status === '결재완료') && (
                        <button onClick={() => onOpenPrint(r.id)} style={styles.actionBtn}>출력</button>
                      )}
                      {r.status === '결재대기' && (
                        <button onClick={() => onOpenApproval(r.id)} style={styles.approveBtn}>결재완료</button>
                      )}
                      <button onClick={() => handleDelete(r.id)} style={styles.deleteBtn}>삭제</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { margin: 0, fontSize: '24px', fontWeight: 800, color: '#1a365d' },
  newBtn: { padding: '12px 22px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '9px', cursor: 'pointer', fontWeight: 700, fontSize: '15px', boxShadow: '0 4px 10px rgba(49,130,206,0.35)' },
  filterRow: { display: 'flex', gap: '16px', marginBottom: '22px', flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '13px', color: '#718096', fontWeight: 700 },
  input: { padding: '9px 11px', borderRadius: '8px', border: '1px solid #dfe4ea', fontSize: '15px', backgroundColor: '#fbfcfe' },
  emptyText: { color: '#718096', fontSize: '16px' },
  tableWrapper: { overflowX: 'auto', borderRadius: '12px', border: '1px solid #edf1f5' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '15px' },
  thRow: { backgroundColor: '#f7fafc', textAlign: 'left' },
  th: { padding: '13px 10px', borderBottom: '2px solid #e2e8f0', color: '#4a5568', fontSize: '14px', fontWeight: 700 },
  tr: { borderBottom: '1px solid #edf2f7' },
  td: { padding: '12px 10px' },
  badge: { padding: '5px 13px', borderRadius: '12px', fontSize: '13px', fontWeight: 700 },
  actionBtn: { padding: '7px 13px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, marginRight: '6px' },
  approveBtn: { padding: '7px 13px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, marginRight: '6px' },
  deleteBtn: { padding: '7px 13px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 },
};

export default ExpenseList;
