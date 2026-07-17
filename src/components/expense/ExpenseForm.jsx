// src/components/expense/ExpenseForm.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const ACCOUNT_CATEGORIES = ['급여', '4대보험', '대출이자', '카드대금', '위탁대행/기타', '퇴직연금', '통신비', '수도광열비', '원자재매입', '기타'];

const emptyItem = () => ({ account_category: '', vendor_name: '', item_name: '', amount: '', bank_name: '', account_no: '', account_holder: '', passbook_memo: '', note: '' });

function ExpenseForm({ requestId, onSaved, onCancel }) {
  const [accounts, setAccounts] = useState([]);
  const [isRecurring, setIsRecurring] = useState(false);
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
      setIsRecurring(!!req.is_recurring);
    }
    if (its && its.length > 0) {
      setItems(its.map((i) => ({
        account_category: i.account_category || '',
        vendor_name: i.vendor_name || '', item_name: i.item_name || '', amount: i.amount ?? '',
        bank_name: i.bank_name || '', account_no: i.account_no || '', account_holder: i.account_holder || '', passbook_memo: i.passbook_memo || '',
        note: i.note || '',
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

  const filledItems = () => items.filter((it) => it.vendor_name || it.item_name || it.amount);
  const missingCategory = filledItems().some((it) => !it.account_category);

  const validate = (forSubmit) => {
    if (!header.bank_account_id) { alert('출금계좌를 선택해주세요.'); return false; }
    if (items.every((it) => !it.vendor_name && !it.item_name && !it.amount)) { alert('최소 1개 항목을 입력해주세요.'); return false; }
    if (forSubmit && missingCategory) { alert('계정과목을 선택하지 않은 항목이 있습니다. 모든 항목에 계정과목을 선택해주세요.'); return false; }
    return true;
  };

  const save = async (nextStatus) => {
    if (!validate(nextStatus === '결재대기')) return;
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

      const validItems = filledItems();
      const itemRows = validItems.map((it, idx) => ({
        request_id: id,
        line_no: idx + 1,
        account_category: it.account_category || null,
        vendor_name: it.vendor_name || null,
        item_name: it.item_name || null,
        amount: Number(it.amount) || 0,
        payment_method: '계좌이체',
        bank_name: it.bank_name || null,
        account_no: it.account_no || null,
        account_holder: it.account_holder || null,
        passbook_memo: it.passbook_memo || null,
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
      <h2 style={styles.title}>
        지출결의서 작성
        {isRecurring && <span style={styles.recurringBadge}>정기 항목</span>}
      </h2>

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
        <h3 style={styles.subtitle}>지출 항목 (지급방법: 계좌이체)</h3>
        <button onClick={addItem} style={styles.addBtn}>+ 항목 추가</button>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={{ ...styles.th, width: '48px' }}>NO</th>
              <th style={{ ...styles.th, width: '150px' }}>계정과목</th>
              <th style={styles.th}>거래처</th>
              <th style={styles.th}>품목</th>
              <th style={{ ...styles.th, width: '140px' }}>금액</th>
              <th style={styles.th}>입금은행</th>
              <th style={styles.th}>계좌번호</th>
              <th style={styles.th}>예금주</th>
              <th style={{ ...styles.th, width: '110px' }}>통장표시(6자)</th>
              <th style={styles.th}>비고</th>
              <th style={{ ...styles.th, width: '44px' }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx} style={styles.tr}>
                <td style={{ ...styles.td, textAlign: 'center', color: '#a0aec0' }}>{idx + 1}</td>
                <td style={styles.td}>
                  <select
                    value={it.account_category}
                    onChange={(e) => updateItem(idx, 'account_category', e.target.value)}
                    style={{ ...styles.cellInput, ...(!it.account_category && (it.vendor_name || it.item_name || it.amount) ? styles.cellInputWarn : {}) }}
                  >
                    <option value="">선택</option>
                    {ACCOUNT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </td>
                <td style={styles.td}><input value={it.vendor_name} onChange={(e) => updateItem(idx, 'vendor_name', e.target.value)} style={styles.cellInput} placeholder="거래처명" /></td>
                <td style={styles.td}><input value={it.item_name} onChange={(e) => updateItem(idx, 'item_name', e.target.value)} style={styles.cellInput} placeholder="품목" /></td>
                <td style={styles.td}><input type="number" value={it.amount} onChange={(e) => updateItem(idx, 'amount', e.target.value)} style={styles.cellInput} placeholder="0" /></td>
                <td style={styles.td}><input value={it.bank_name} onChange={(e) => updateItem(idx, 'bank_name', e.target.value)} style={styles.cellInput} placeholder="은행" /></td>
                <td style={styles.td}><input value={it.account_no} onChange={(e) => updateItem(idx, 'account_no', e.target.value)} style={styles.cellInput} placeholder="계좌번호" /></td>
                <td style={styles.td}><input value={it.account_holder} onChange={(e) => updateItem(idx, 'account_holder', e.target.value)} style={styles.cellInput} placeholder="예금주" /></td>
                <td style={styles.td}><input value={it.passbook_memo} onChange={(e) => updateItem(idx, 'passbook_memo', e.target.value)} style={styles.cellInput} placeholder="표시(6자)" maxLength={6} /></td>
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
        <button
          onClick={() => save('결재대기')}
          style={{ ...styles.submitBtn, ...(missingCategory ? styles.submitBtnDisabled : {}) }}
          disabled={saving || missingCategory}
          title={missingCategory ? '모든 항목에 계정과목을 선택해야 상신할 수 있습니다.' : ''}
        >
          저장 후 출력
        </button>
      </div>
      {missingCategory && <p style={styles.warnText}>계정과목을 선택하지 않은 항목이 있어 "저장 후 출력"이 비활성화되어 있습니다.</p>}
    </div>
  );
}

const styles = {
  loadingText: { color: '#718096', fontSize: '19px' },
  title: { margin: '0 0 26px 0', fontSize: '32px', fontWeight: 800, color: '#1a365d', display: 'flex', alignItems: 'center', gap: '14px' },
  recurringBadge: { fontSize: '15px', fontWeight: 700, color: '#3182ce', backgroundColor: '#ebf4fb', padding: '6px 14px', borderRadius: '999px' },
  headerGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '22px', marginBottom: '32px' },
  field: { display: 'flex', flexDirection: 'column', gap: '9px' },
  label: { fontSize: '18px', fontWeight: 700, color: '#4a5568' },
  input: { padding: '14px 16px', borderRadius: '10px', border: '1px solid #dfe4ea', fontSize: '19px', backgroundColor: '#fbfcfe' },
  itemsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', marginBottom: '18px' },
  subtitle: { margin: 0, fontSize: '24px', fontWeight: 700, color: '#2d3748' },
  addBtn: { padding: '12px 22px', backgroundColor: '#ebf4ff', color: '#2b6cb0', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '18px', fontWeight: 700 },
  tableWrapper: { overflowX: 'auto', borderRadius: '14px', border: '1px solid #edf1f5' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '18px' },
  thRow: { backgroundColor: '#f7fafc', textAlign: 'left' },
  th: { padding: '16px 14px', borderBottom: '2px solid #e2e8f0', color: '#4a5568', whiteSpace: 'nowrap', fontSize: '17px', fontWeight: 700 },
  tr: { borderBottom: '1px solid #edf2f7' },
  td: { padding: '12px 12px' },
  cellInput: { width: '100%', padding: '13px 14px', borderRadius: '9px', border: '1px solid #e2e8f0', fontSize: '18px', boxSizing: 'border-box' },
  cellInputWarn: { border: '1px solid #e53e3e', backgroundColor: '#fff5f5' },
  removeBtn: { border: 'none', backgroundColor: '#fde2e2', color: '#9b2c2c', borderRadius: '9px', width: '36px', height: '36px', cursor: 'pointer', fontWeight: 'bold', fontSize: '19px' },
  totalRow: { display: 'flex', justifyContent: 'flex-end', gap: '20px', alignItems: 'baseline', marginTop: '24px', paddingTop: '24px', borderTop: '2px solid #2d3748', fontSize: '24px' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px' },
  cancelBtn: { padding: '16px 28px', backgroundColor: '#edf2f7', color: '#2d3748', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '18px' },
  saveBtn: { padding: '16px 28px', backgroundColor: '#718096', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '18px' },
  submitBtn: { padding: '16px 30px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '18px', boxShadow: '0 4px 10px rgba(49,130,206,0.35)' },
  submitBtnDisabled: { backgroundColor: '#cbd5e0', cursor: 'not-allowed', boxShadow: 'none' },
  warnText: { textAlign: 'right', color: '#c53030', fontSize: '15px', marginTop: '10px' },
};

export default ExpenseForm;
