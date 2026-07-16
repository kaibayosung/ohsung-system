// src/pages/LedgerPage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import LedgerInputForm from '../components/LedgerInputForm';
import LedgerList from '../components/LedgerList';

function LedgerPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0, unpaid: 0 });

  useEffect(() => { fetchLedger(); }, [selectedDate]);

  const fetchLedger = async () => {
    const { data } = await supabase.from('daily_ledger').select('*').eq('trans_date', selectedDate).order('created_at', { ascending: false });
    if (data) {
      setRecords(data);
      // 지불완료 건만 잔액에 반영
      const income = data.filter(r => r.type === '수입' && r.status === '지불완료').reduce((a, c) => a + c.amount, 0);
      const expense = data.filter(r => r.type === '지출' && r.status === '지불완료').reduce((a, c) => a + c.amount, 0);
      // 지불예정 건만 따로 합산
      const unpaid = data.filter(r => r.status === '지불예정').reduce((a, c) => a + c.amount, 0);
      setSummary({ income, expense, balance: income - expense, unpaid });
    }
  };

  // [추가] 지불 상태를 업데이트하는 함수
  const handleUpdateStatus = async (id) => {
    if (window.confirm("지불 처리를 완료하시겠습니까? 오늘 잔액에서 차감됩니다.")) {
      await supabase.from('daily_ledger').update({ status: '지불완료' }).eq('id', id);
      fetchLedger();
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("삭제하시겠습니까?")) {
      await supabase.from('daily_ledger').delete().eq('id', id);
      fetchLedger();
    }
  };

  return (
    <div style={{ padding: '36px', backgroundColor: '#e2e8f0', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '26px' }}>
        <h2 style={{ margin: 0, fontSize: '32px' }}>🌀 오성철강 일일 금전출납부</h2>
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ padding: '12px 14px', borderRadius: '9px', border: 'none', fontSize: '17px' }} />
      </div>

      {/* 상단 4단 현황판 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '26px' }}>
        <div style={styles.sumCard}><h4 style={styles.sumLabel}>오늘 수입</h4><p style={styles.sumValue}>{summary.income.toLocaleString()}원</p></div>
        <div style={styles.sumCard}><h4 style={styles.sumLabel}>오늘 지출</h4><p style={styles.sumValue}>{summary.expense.toLocaleString()}원</p></div>
        <div style={styles.sumCard}><h4 style={styles.sumLabel}>현재 잔액</h4><p style={styles.sumValue}>{summary.balance.toLocaleString()}원</p></div>
        <div style={{...styles.sumCard, borderTop: '5px solid #ed8936', backgroundColor: '#fffaf0'}}>
          <h4 style={{...styles.sumLabel, color:'#c05621'}}>미지급 합계 (예정)</h4>
          <p style={{color:'#c05621', fontSize:'31px', fontWeight:'900', margin: '8px 0 0 0'}}>{summary.unpaid.toLocaleString()}원</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '24px' }}>
        <LedgerInputForm selectedDate={selectedDate} onTransactionAdded={fetchLedger} />
        <LedgerList records={records} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} />
      </div>
    </div>
  );
}

const styles = {
  sumCard: { backgroundColor: 'white', padding: '22px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 6px 12px rgba(0,0,0,0.08)' },
  sumLabel: { margin: 0, fontSize: '17px', color: '#4a5568' },
  sumValue: { margin: '8px 0 0 0', fontSize: '27px', fontWeight: 800 }
};

export default LedgerPage;