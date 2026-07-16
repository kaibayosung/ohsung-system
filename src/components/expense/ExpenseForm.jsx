// src/components/expense/ExpenseForm.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const emptyItem = () => ({ vendor_name: '', item_name: '', amount: '', note: '' });

function ExpenseForm({ requestId, onSaved, onCancel }) {
  const [accounts, setAccounts] = useState([]);
  const [header, setHeader] = useState({
    request_date: new Date().toISOString().split('T')[0],
    requester: '',
    bank_account_id: '',
  });
  const [items, setItems] = useState([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();
    initRequester();
    if (requestId) loadExisting(requestId);
  }, [requestId]);

  const initRequester = async () => {
    const { data } = await supabase.auth.getUser();
    const email = data?.user?.email;
    if (email) setHeader((h) => (h.requester ? h : { ...h, requester: email.split('@')[0] }));
  };

  const fetchAccounts = async () => {
    const { data } = await supabase.from('company_bank_accounts').select('*').eq('is_active', true).order('id');
    setAccounts(data || []);
  };

  const loadExisting = async (id) => {
    setLoading(true);
    const { data: req } = await supabase.from('expense_requests').select('*').eq('id', id).single();
    const { data: its } = await supabase.from('expense_request_items').select('*').eq('request_id', id).order('line_no');
    if (req) {
      setHeader({
        request_date: req.request_date,
        requester: req.requester || '',
        bank_account_id: req.bank_account_id || '',
      });
    }
    if (its && its.length > 0) {
      setItems(its.map((i) => ({
        vendor_name: i.vendor_name || '', item_name: i.item_name || '', amount: i.amount ?? '', note: i.note || '',
      })));
    }
    setLoading(false);
  };

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx) => setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));

  const total = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

  const validate = () => {
    if (!header.bank_account_id) { alert('출금계좌를 선택해주세요.'); return false; }
    if (items.every((it) => !it.vendor_name && !it.item_name && !it.amount)) { alert('최소 1개 항목을 입력해주세요.'); return false; }
    return true;
  };

  const save = async (nextStatus) => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        request_date: header.request_date,
        requester: header.requester,
        bank_account_id: header.bank_account_id,
        total_amount: total,
        status: nextStatus,
      };

      let id = requestId;
      if (id) {
        const { error } = await supabase.from('expense_requests').update(payload).eq('id', id);
        if (error) throw error;
        await supabase.from('expense_request_items').delete().eq('request_id', id);
      } else {
        const { data, error } = await supabase.from('expense_requests').insert(payload).select('id').single();
        if (error) throw error;
        id = data.id;
      }

      const validItems = items.filter((it) => it.vendor_name || it.item_name || it.amount);
      const itemRows = validItems.map((it, idx) => ({
        request_id: id,
        line_no: idx + 1,
        vendor_name: it.vendor_name || null,
        item_name: it.item_name || null,
        amount: Number(it.amount) || 0,
        payment_method: '현금',
        note: it.note || null,
      }));
      if (itemRows.length > 0) {
        const { error: itemError } = await supabase.from('expense_request_items').insert(itemRows);
        if (itemError) throw itemError;
      }

      alert(nextStatus === '결재대기' ? '저장 후 출력 화면으로 이동합니다.' : '임시 저장되었습니다.');
      onSaved(id);
    } catch (err) {
      alert('저장 실패: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={styles.loadingText}>불러오는 중...</p>;

  return (
    <div>
      <h2 style={styles.title}>지출결의서 작성</h2>

      <div style={styles.headerGrid}>
        <div style={styles.field}>
          <label style={styles.label}>기안일자</label>
          <input type="date" value={header.request_date} onChange={(e) => setHeader((h) => ({ ...h, request_date: e.target.value }))} style={styles.input} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>작성자</label>
          <input type="text" value={header.requester} onChange={(e) => setHeader((h) => ({ ...h, requester: e.target.value }))} style={styles.input} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>출금계좌 *</label>
          <select value={header.bank_account_id} onChange={(e) => setHeader((h) => ({ ...h, bank_account_id: e.target.value }))} style={styles.input}>
            <option value="">선택하세요</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.bank_name} {a.account_no} {a.purpose ? `(${a.purpose})` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.itemsHeader}>
        <h3 style={styles.subtitle}>지출 항목 (현금 결제)</h3>
        <button onClick={addItem} style={styles.addBtn}>+ 항목 추가</button>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={{ ...styles.th, width: '48px' }}>NO</th>
              <th style={styles.th}>거래처</th>
              <th style={styles.th}>품목</th>
              <th style={{ ...styles.th, width: '150px' }}>금액</th>
              <th style={styles.th}>비고</th>
              <th style={{ ...styles.th, width: '44px' }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx} style={styles.tr}>
                <td style={{ ...styles.td, textAlign: 'center', color: '#a0aec0' }}>{idx + 1}</td>
                <td style={styles.td}><input value={it.vendor_name} onChange={(e) => updateItem(idx, 'vendor_name', e.target.value)} style={styles.cellInput} placeholder="거래처명" /></td>
                <td style={styles.td}><input value={it.item_name} onChange={(e) => updateItem(idx, 'item_name', e.target.value)} style={styles.cellInput} placeholder="품목" /></td>
                <td style={styles.td}><input type="number" value={it.amount} onChange={(e) => updateItem(idx, 'amount', e.target.value)} style={styles.cellInput} placeholder="0" /></td>
                <td style={styles.td}><input value={it.note} onChange={(e) => updateItem(idx, 'note', e.target.value)} style={styles.cellInput} placeholder="선택 입력" /></td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  <button onClick={() => removeItem(idx)} style={styles.removeBtn}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.totalRow}>
        <span>합계</span>
        <strong>{total.toLocaleString()}원</strong>
      </div>

      <div style={styles.actions}>
        <button onClick={onCancel} style={styles.cancelBtn} disabled={saving}>목록으로</button>
        <button onClick={() => save('작성중')} style={styles.saveBtn} disabled={saving}>임시 저장</button>
        <button onClick={() => save('결재대기')} style={styles.submitBtn} disabled={saving}>저장 후 출력</button>
      </div>
    </div>
  );
}

const styles = {
  loadingText: { color: '#718096', fontSize: '16px' },
  title: { margin: '0 0 20px 0', fontSize: '24px', fontWeight: 800, color: '#1a365d' },
  headerGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginBottom: '26px' },
  field: { display: 'flex', flexDirection: 'column', gap: '7px' },
  label: { fontSize: '15px', fontWeight: 700, color: '#4a5568' },
  input: { padding: '11px 13px', borderRadius: '8px', border: '1px solid #dfe4ea', fontSize: '16px', backgroundColor: '#fbfcfe' },
  itemsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', marginBottom: '14px' },
  subtitle: { margin: 0, fontSize: '18px', fontWeight: 700, color: '#2d3748' },
  addBtn: { padding: '9px 18px', backgroundColor: '#ebf4ff', color: '#2b6cb0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 700 },
  tableWrapper: { overflowX: 'auto', borderRadius: '12px', border: '1px solid #edf1f5' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '15px' },
  thRow: { backgroundColor: '#f7fafc', textAlign: 'left' },
  th: { padding: '13px 12px', borderBottom: '2px solid #e2e8f0', color: '#4a5568', whiteSpace: 'nowrap', fontSize: '14px', fontWeight: 700 },
  tr: { borderBottom: '1px solid #edf2f7' },
  td: { padding: '9px 10px' },
  cellInput: { width: '100%', padding: '10px 11px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '15px', boxSizing: 'border-box' },
  removeBtn: { border: 'none', backgroundColor: '#fde2e2', color: '#9b2c2c', borderRadius: '7px', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' },
  totalRow: { display: 'flex', justifyContent: 'flex-end', gap: '16px', alignItems: 'baseline', marginTop: '18px', paddingTop: '18px', borderTop: '2px solid #2d3748', fontSize: '18px' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '26px' },
  cancelBtn: { padding: '13px 22px', backgroundColor: '#edf2f7', color: '#2d3748', border: 'none', borderRadius: '9px', cursor: 'pointer', fontWeight: 700, fontSize: '15px' },
  saveBtn: { padding: '13px 22px', backgroundColor: '#718096', color: 'white', border: 'none', borderRadius: '9px', cursor: 'pointer', fontWeight: 700, fontSize: '15px' },
  submitBtn: { padding: '13px 24px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '9px', cursor: 'pointer', fontWeight: 700, fontSize: '15px', boxShadow: '0 4px 10px rgba(49,130,206,0.35)' },
};

export default ExpenseForm;
