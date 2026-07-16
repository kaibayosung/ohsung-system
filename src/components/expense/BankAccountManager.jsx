// src/components/expense/BankAccountManager.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

function BankAccountManager() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ bank_name: '', account_no: '', purpose: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    const { data } = await supabase.from('company_bank_accounts').select('*').order('id');
    setAccounts(data || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.bank_name || !form.account_no) { alert('은행명과 계좌번호를 입력해주세요.'); return; }
    setSaving(true);
    const { error } = await supabase.from('company_bank_accounts').insert({
      bank_name: form.bank_name, account_no: form.account_no, purpose: form.purpose || null,
    });
    setSaving(false);
    if (error) { alert('등록 실패: ' + error.message); return; }
    setForm({ bank_name: '', account_no: '', purpose: '' });
    fetchAccounts();
  };

  const toggleActive = async (acc) => {
    await supabase.from('company_bank_accounts').update({ is_active: !acc.is_active }).eq('id', acc.id);
    fetchAccounts();
  };

  const handleDelete = async (acc) => {
    if (!window.confirm(`${acc.bank_name} ${acc.account_no} 계좌를 삭제하시겠습니까?`)) return;
    const { error } = await supabase.from('company_bank_accounts').delete().eq('id', acc.id);
    if (error) { alert('삭제 실패: 이 계좌를 사용하는 지출결의서가 있으면 삭제할 수 없습니다.'); return; }
    fetchAccounts();
  };

  return (
    <div>
      <h2 style={styles.title}>계좌 관리</h2>
      <p style={styles.subtitle}>지출결의서 작성 화면의 출금계좌 목록입니다. 용도별로 여러 계좌를 등록할 수 있습니다.</p>

      <div style={styles.formRow}>
        <input placeholder="은행명" value={form.bank_name} onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))} style={styles.input} />
        <input placeholder="계좌번호" value={form.account_no} onChange={(e) => setForm((f) => ({ ...f, account_no: e.target.value }))} style={styles.input} />
        <input placeholder="용도 (예: 원자재대금)" value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} style={styles.input} />
        <button onClick={handleAdd} disabled={saving} style={styles.addBtn}>계좌 등록</button>
      </div>

      {loading ? (
        <p style={styles.emptyText}>불러오는 중...</p>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>은행명</th>
                <th style={styles.th}>계좌번호</th>
                <th style={styles.th}>용도</th>
                <th style={styles.th}>사용 여부</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} style={styles.tr}>
                  <td style={styles.td}>{a.bank_name}</td>
                  <td style={styles.td}>{a.account_no}</td>
                  <td style={styles.td}>{a.purpose || '-'}</td>
                  <td style={styles.td}>
                    <button onClick={() => toggleActive(a)} style={a.is_active ? styles.activeBadge : styles.inactiveBadge}>
                      {a.is_active ? '사용' : '중지'}
                    </button>
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => handleDelete(a)} style={styles.deleteBtn}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { margin: '0 0 8px 0', fontSize: '24px', fontWeight: 800, color: '#1a365d' },
  subtitle: { margin: '0 0 24px 0', fontSize: '15px', color: '#718096' },
  formRow: { display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' },
  input: { padding: '11px 13px', borderRadius: '8px', border: '1px solid #dfe4ea', fontSize: '16px', flex: 1, minWidth: '160px', backgroundColor: '#fbfcfe' },
  addBtn: { padding: '11px 22px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '15px' },
  emptyText: { color: '#718096', fontSize: '16px' },
  tableWrapper: { overflowX: 'auto', borderRadius: '12px', border: '1px solid #edf1f5' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '15px' },
  thRow: { backgroundColor: '#f7fafc', textAlign: 'left' },
  th: { padding: '13px 10px', borderBottom: '2px solid #e2e8f0', color: '#4a5568', fontSize: '14px', fontWeight: 700 },
  tr: { borderBottom: '1px solid #edf2f7' },
  td: { padding: '12px 10px' },
  activeBadge: { padding: '6px 14px', backgroundColor: '#e3f6df', color: '#276749', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 },
  inactiveBadge: { padding: '6px 14px', backgroundColor: '#edf2f7', color: '#4a5568', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 },
  deleteBtn: { padding: '7px 13px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 },
};

export default BankAccountManager;
