// src/components/expense/ExpenseForm.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const emptyItem = () => ({
  vendor_name: '', item_name: '', amount: '', payment_method: '계좌이체',
  bank_name: '', account_no: '', account_holder: '', passbook_memo: '', note: '',
});

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
        vendor_name: i.vendor_name || '', item_name: i.item_name || '', amount: i.amount ?? '',
        payment_method: i.payment_method || '계좌이체', bank_name: i.bank_name || '', account_no: i.account_no || '',
        account_holder: i.account_holder || '', passbook_memo: i.passbook_memo || '', note: i.note || '',
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
    for (const it of items) {
      if (it.passbook_memo && it.passbook_memo.length > 6) { alert('통장 표시내용은 6자 이내로 입력해주세요.'); return false; }
    }
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
        payment_method: it.payment_method || null,
        bank_name: it.payment_method === '계좌이체' ? (it.bank_name || null) : null,
        account_no: it.payment_method === '계좌이체' ? (it.account_no || null) : null,
        account_holder: it.payment_method === '계좌이체' ? (it.account_holder || null) : null,
        passbook_memo: it.payment_method === '계좌이체' ? (it.passbook_memo || null) : null,
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

  if (loading) return <p style={{ color: '#718096' }}>불러오는 중...</p>;

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
        <h3 style={styles.subtitle}>지출 항목</h3>
        <button onClick={addItem} style={styles.addBtn}>+ 항목 추가</button>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={styles.th}>NO</th>
              <th style={styles.th}>거래처</th>
              <th style={styles.th}>품목</th>
              <th style={styles.th}>금액</th>
              <th style={styles.th}>지급방법</th>
              <th style={styles.th}>입금은행/계좌</th>
              <th style={styles.th}>예금주</th>
              <th style={styles.th}>통장표시(6자)</th>
              <th style={styles.th}>비고</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const isTransfer = it.payment_method === '계좌이체';
              return (
                <tr key={idx} style={styles.tr}>
                  <td style={styles.td}>{idx + 1}</td>
                  <td style={styles.td}><input value={it.vendor_name} onChange={(e) => updateItem(idx, 'vendor_name', e.target.value)} style={styles.cellInput} /></td>
                  <td style={styles.td}><input value={it.item_name} onChange={(e) => updateItem(idx, 'item_name', e.target.value)} style={styles.cellInput} /></td>
                  <td style={styles.td}><input type="number" value={it.amount} onChange={(e) => updateItem(idx, 'amount', e.target.value)} style={{ ...styles.cellInput, width: '90px' }} /></td>
                  <td style={styles.td}>
                    <select value={it.payment_method} onChange={(e) => updateItem(idx, 'payment_method', e.target.value)} style={styles.cellInput}>
                      <option value="계좌이체">계좌이체</option>
                      <option value="현금">현금</option>
                      <option value="어음">어음</option>
                    </select>
                  </td>
                  <td style={styles.td}>
                    <input disabled={!isTransfer} value={it.bank_name} onChange={(e) => updateItem(idx, 'bank_name', e.target.value)} placeholder="은행" style={{ ...styles.cellInput, width: '60px', marginBottom: '4px' }} />
                    <input disabled={!isTransfer} value={it.account_no} onChange={(e) => updateItem(idx, 'account_no', e.target.value)} placeholder="계좌번호" style={{ ...styles.cellInput, width: '110px' }} />
                  </td>
                  <td style={styles.td}><input disabled={!isTransfer} value={it.account_holder} onChange={(e) => updateItem(idx, 'account_holder', e.target.value)} style={styles.cellInput} /></td>
                  <td style={styles.td}>
                    <input
                      disabled={!isTransfer}
                      value={it.passbook_memo}
                      maxLength={6}
                      onChange={(e) => updateItem(idx, 'passbook_memo', e.target.value.slice(0, 6))}
                      style={{ ...styles.cellInput, width: '70px' }}
                    />
                  </td>
                  <td style={styles.td}><input value={it.note} onChange={(e) => updateItem(idx, 'note', e.target.value)} style={styles.cellInput} /></td>
                  <td style={styles.td}>
                    <button onClick={() => removeItem(idx)} style={styles.removeBtn}>×</button>
                  </td>
                </tr>
              );
            })}
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
  title: { margin: '0 0 16px 0', fontSize: '20px', color: '#1a365d' },
  headerGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 'bold', color: '#4a5568' },
  input: { padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px' },
  itemsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', marginBottom: '10px' },
  subtitle: { margin: 0, fontSize: '15px', color: '#2d3748' },
  addBtn: { padding: '6px 14px', backgroundColor: '#edf2f7', color: '#2d3748', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
  thRow: { backgroundColor: '#f7fafc', textAlign: 'left' },
  th: { padding: '8px 6px', borderBottom: '2px solid #e2e8f0', color: '#4a5568', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #edf2f7' },
  td: { padding: '6px' },
  cellInput: { width: '100%', padding: '6px 7px', borderRadius: '5px', border: '1px solid #e2e8f0', fontSize: '12px', boxSizing: 'border-box' },
  removeBtn: { border: 'none', backgroundColor: '#fde2e2', color: '#9b2c2c', borderRadius: '5px', width: '26px', height: '26px', cursor: 'pointer', fontWeight: 'bold' },
  totalRow: { display: 'flex', justifyContent: 'flex-end', gap: '14px', alignItems: 'center', marginTop: '14px', paddingTop: '14px', borderTop: '2px solid #2d3748', fontSize: '16px' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
  cancelBtn: { padding: '10px 18px', backgroundColor: '#edf2f7', color: '#2d3748', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  saveBtn: { padding: '10px 18px', backgroundColor: '#718096', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  submitBtn: { padding: '10px 18px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
};

export default ExpenseForm;
