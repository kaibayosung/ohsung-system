import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function LedgerInputForm({ selectedDate, onTransactionAdded, editingItem, setEditingItem }) {
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const initialFormState = { type: '지출', company: '', description: '', amount: '', method: '법인카드' };
  const [formData, setFormData] = useState(initialFormState);
  const [cashEntries, setCashEntries] = useState([{ company: '', amount: '' }]);

  useEffect(() => {
    if (editingItem) {
      setFormData({ ...editingItem });
      setIsEditMode(true);
    } else {
      setFormData(initialFormState);
      setCashEntries([{ company: '', amount: '' }]);
      setIsEditMode(false);
    }
  }, [editingItem]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let entriesToSave = [];
      if (isEditMode) {
        entriesToSave.push({ ...formData, amount: Number(formData.amount), trans_date: selectedDate });
      } else if (formData.type === '수입' && formData.method === '현금') {
        entriesToSave = cashEntries.filter(e => e.company && e.amount).map(e => ({
          trans_date: selectedDate, type: '수입', company: e.company, description: '현금 입금(상세)', amount: Number(e.amount), method: '현금'
        }));
      } else {
        entriesToSave.push({ ...formData, amount: Number(formData.amount), trans_date: selectedDate });
      }

      const validData = [];
      const skippedData = [];

      for (const entry of entriesToSave) {
        const { data: existing } = await supabase.from('daily_ledger').select('id').match({
          trans_date: entry.trans_date, type: entry.type, company: entry.company, amount: entry.amount, description: entry.description
        }).maybeSingle();

        if (existing && !isEditMode) skippedData.push(`${entry.company} (${entry.amount}원)`);
        else validData.push(entry);
      }

      if (isEditMode) {
        await supabase.from('daily_ledger').update(validData[0]).eq('id', editingItem.id);
        alert("수정 완료");
        setEditingItem(null);
      } else if (validData.length > 0) {
        await supabase.from('daily_ledger').insert(validData);
        alert(`✅ ${validData.length}건 저장 완료` + (skippedData.length ? `\n⚠️ 중복 제외: ${skippedData.length}건` : ""));
      }

      setFormData(initialFormState);
      setCashEntries([{ company: '', amount: '' }]);
      onTransactionAdded();
    } catch (err) { alert("오류: " + err.message); } finally { setLoading(false); }
  };

  const btnStyle = (active, color) => ({ flex: 1, padding: '12px', background: active ? color : 'white', color: active ? 'white' : '#718096', border: `2px solid ${active ? color : '#e2e8f0'}`, borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' });

  return (
    <div style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <h3 style={{ marginBottom: '20px' }}>{isEditMode ? '✏️ 내역 수정' : '➕ 거래 등록'}</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button type="button" onClick={() => setFormData({ ...formData, type: '수입' })} style={btnStyle(formData.type === '수입', '#38a169')}>수입</button>
          <button type="button" onClick={() => setFormData({ ...formData, type: '지출' })} style={btnStyle(formData.type === '지출', '#e53e3e')}>지출</button>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {['현금', '법인카드', '이체'].map(m => (
            <button key={m} type="button" onClick={() => setFormData({ ...formData, method: m })} style={btnStyle(formData.method === m, '#3182ce')}>{m}</button>
          ))}
        </div>

        {formData.type === '수입' && formData.method === '현금' && !isEditMode ? (
          <div style={{ background: '#f0fff4', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            {cashEntries.map((entry, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input type="text" placeholder="거래처" value={entry.company} onChange={e => { const n = [...cashEntries]; n[i].company = e.target.value; setCashEntries(n); }} style={{ flex: 2, padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} />
                <input type="number" placeholder="금액" value={entry.amount} onChange={e => { const n = [...cashEntries]; n[i].amount = e.target.value; setCashEntries(n); }} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} />
              </div>
            ))}
            <button type="button" onClick={() => setCashEntries([...cashEntries, { company: '', amount: '' }])} style={{ width: '100%', padding: '8px', background: 'white', border: '1px solid #38a169', color: '#38a169', borderRadius: '6px', cursor: 'pointer' }}>+ 항목 추가</button>
          </div>
        ) : (
          <>
            <input type="text" placeholder="거래처명" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }} required />
            <input type="text" placeholder="적요(선택)" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }} />
            <input type="number" placeholder="금액" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }} required />
          </>
        )}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '15px', background: isEditMode ? '#d69e2e' : '#3182ce', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}>
          {loading ? '처리 중...' : isEditMode ? '수정 내용 저장' : '데이터 등록하기'}
        </button>
      </form>
    </div>
  );
}

export default LedgerInputForm;