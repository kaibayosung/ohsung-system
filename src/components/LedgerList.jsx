import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

function LedgerList({ transactions, loading, onDelete, onEdit }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = transactions.filter(t => t.company.includes(searchTerm) || (t.description && t.description.includes(searchTerm)));

  const handleDelete = async (id) => {
    if (!window.confirm("삭제할까요?")) return;
    const { error } = await supabase.from('daily_ledger').delete().eq('id', id);
    if (!error) onDelete();
  };

  return (
    <div style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>📊 일일 거래 리포트</h3>
        <input type="text" placeholder="거래처/적요 검색..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #edf2f7', textAlign: 'left' }}>
            <th style={{ padding: '12px' }}>구분</th><th style={{ padding: '12px' }}>거래처</th><th style={{ padding: '12px' }}>금액</th><th style={{ padding: '12px' }}>수단</th><th style={{ padding: '12px' }}>관리</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(t => (
            <tr key={t.id} style={{ borderBottom: '1px solid #edf2f7' }}>
              <td style={{ padding: '12px', color: t.type === '수입' ? '#38a169' : '#e53e3e', fontWeight: 'bold' }}>{t.type}</td>
              <td style={{ padding: '12px' }}>{t.company}<br/><small style={{ color: '#aaa' }}>{t.description}</small></td>
              <td style={{ padding: '12px', fontWeight: 'bold' }}>{t.amount.toLocaleString()}</td>
              <td style={{ padding: '12px' }}>{t.method}</td>
              <td style={{ padding: '12px' }}>
                <button onClick={() => onEdit(t)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' }}>✏️</button>
                <button onClick={() => handleDelete(t.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' }}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default LedgerList;