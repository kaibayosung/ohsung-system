// src/components/LedgerList.jsx
import React from 'react';

function LedgerList({ records, onUpdateStatus, onDelete }) {
  return (
    <div style={{ background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 6px 12px rgba(0,0,0,0.08)' }}>
      <h3 style={{ marginBottom: '24px', fontSize: '22px' }}>📋 일일 거래 리포트</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={styles.th}>상태</th>
              <th style={styles.th}>구분</th>
              <th style={styles.th}>거래처</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>금액</th>
              <th style={styles.th}>관리</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                <td style={styles.td}>
                  <span style={{
                    padding: '6px 13px', borderRadius: '14px', fontSize: '15px', fontWeight: 'bold',
                    backgroundColor: r.status === '지불예정' ? '#fed7d7' : '#c6f6d5',
                    color: r.status === '지불예정' ? '#c53030' : '#2f855a'
                  }}>
                    {r.status}
                  </span>
                </td>
                <td style={styles.td}>{r.type}</td>
                <td style={styles.td}>{r.company}</td>
                <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>{r.amount.toLocaleString()}원</td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', gap: '7px' }}>
                    {/* [추가] 지불예정일 때만 나타나는 버튼 */}
                    {r.status === '지불예정' && (
                      <button onClick={() => onUpdateStatus(r.id)} style={styles.payBtn}>지불완료</button>
                    )}
                    <button onClick={() => onDelete(r.id)} style={styles.delBtn}>삭제</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  th: { padding: '16px', color: '#4a5568', fontSize: '17px' },
  td: { padding: '16px', color: '#2d3748', fontSize: '17px' },
  payBtn: { padding: '8px 13px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' },
  delBtn: { padding: '8px 13px', backgroundColor: 'transparent', color: '#e53e3e', border: 'none', cursor: 'pointer', fontSize: '15px' }
};

export default LedgerList;
