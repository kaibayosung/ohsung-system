import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import LedgerInputForm from '../components/LedgerInputForm';
import LedgerList from '../components/LedgerList';

function LedgerPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [editingItem, setEditingItem] = useState(null);

  // 데이터 불러오기 함수
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_ledger')
        .select('*')
        .eq('trans_date', selectedDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
      
      const inc = data?.filter(d => d.type === '수입').reduce((a, b) => a + b.amount, 0) || 0;
      const exp = data?.filter(d => d.type === '지출').reduce((a, b) => a + b.amount, 0) || 0;
      setSummary({ income: inc, expense: exp, balance: inc - exp });
    } catch (error) {
      alert('데이터 로딩 실패: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleEditClick = (item) => {
    setEditingItem(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', backgroundColor: '#f7fafc', minHeight: '100vh' }}>
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, marginRight: '20px', color: '#2d3748' }}>🌀 오성철강 일일 금전출납부</h2>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} 
                 style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '16px' }} />
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1, padding: '20px', borderRadius: '12px', backgroundColor: '#38a169', color: 'white' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', opacity: 0.9 }}>오늘 수입</h3>
            <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{summary.income.toLocaleString()}원</p>
          </div>
          <div style={{ flex: 1, padding: '20px', borderRadius: '12px', backgroundColor: '#e53e3e', color: 'white' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', opacity: 0.9 }}>오늘 지출</h3>
            <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{summary.expense.toLocaleString()}원</p>
          </div>
          <div style={{ flex: 1, padding: '20px', borderRadius: '12px', backgroundColor: '#3182ce', color: 'white' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', opacity: 0.9 }}>현재 잔액</h3>
            <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{summary.balance.toLocaleString()}원</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '2', minWidth: '400px' }}>
          <LedgerInputForm selectedDate={selectedDate} onTransactionAdded={fetchTransactions} editingItem={editingItem} setEditingItem={setEditingItem} />
        </div>
        <div style={{ flex: '3', minWidth: '600px' }}>
          <LedgerList transactions={transactions} loading={loading} onDelete={fetchTransactions} onEdit={handleEditClick} />
        </div>
      </div>
    </div>
  );
}

export default LedgerPage;