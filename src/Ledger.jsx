import React, { useState } from 'react';
import { supabase } from './supabaseClient';

function Ledger() {
  const [pasteData, setPasteData] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. 엑셀 파싱 (일자, 카테고리, 항목, 금액, 결제방식, 비고)
  const handlePasteProcess = () => {
    if (!pasteData.trim()) return alert("데이터를 붙여넣어 주세요.");
    const lines = pasteData.trim().split('\n');
    const dataLines = lines.filter(line => !line.includes("일자") && line.trim() !== "");

    const parsed = dataLines.map((line, index) => {
      const cols = line.split('\t');
      return {
        id: Date.now() + index,
        exp_date: cols[0] || '2026-01-27',
        category: cols[1] || '기타',
        item_name: cols[2] || '',
        amount: Number(cols[3]?.replace(/,/g,'')) || 0,
        payment_method: cols[4] || '계좌이체', // 현금, 계좌이체, 법인카드
        memo: cols[5] || ''
      };
    });
    setRows(parsed);
  };

  // 2. 저장 로직
  const handleSaveToDB = async () => {
    setLoading(true);
    try {
      const uploadData = rows.map(r => ({
        exp_date: r.exp_date,
        category: r.category,
        item_name: r.item_name,
        amount: r.amount,
        payment_method: r.payment_method,
        memo: r.memo
      }));

      const { error } = await supabase.from('ledger_records').insert(uploadData);
      if (error) throw error;

      alert(`지출 내역 ${rows.length}건 저장 완료!`);
      setRows([]); setPasteData('');
    } catch (err) { alert("저장 실패: " + err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={styles.main}>
      <h2 style={styles.title}>💸 지출 내역(매입) 관리</h2>
      <div style={styles.topSection}>
        <div style={styles.inputCard}>
          <div style={styles.label}>1. 지출 데이터 붙여넣기</div>
          <textarea 
            style={styles.textarea} 
            value={pasteData} 
            onChange={(e) => setPasteData(e.target.value)}
            placeholder="엑셀: 일자 | 구분 | 항목 | 금액 | 결제방식 | 비고"
          />
          <button onClick={handlePasteProcess} style={styles.blueButton}>내역 분석</button>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.label}>2. 지출 요약</div>
          <div style={styles.totalBox}>
            총 지출액: <strong style={{color: '#e53e3e'}}>{rows.reduce((acc, r) => acc + r.amount, 0).toLocaleString()}원</strong>
          </div>
          <p style={{fontSize: '12px', color: '#718096', marginTop: '10px'}}>※ 항목별 지출 비중은 분석 리포트에서 확인 가능합니다.</p>
        </div>
      </div>

      {rows.length > 0 && (
        <div style={styles.bottomSection}>
          <div style={styles.label}>3. 상세 내역 확인</div>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}><th>일자</th><th>구분</th><th>항목</th><th>금액</th><th>방식</th></tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} style={styles.tr}>
                    <td>{r.exp_date}</td><td>{r.category}</td><td>{r.item_name}</td>
                    <td style={{fontWeight: 'bold'}}>{r.amount.toLocaleString()}</td>
                    <td>{r.payment_method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={handleSaveToDB} disabled={loading} style={styles.greenButton}>최종 저장하기</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  main: { flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' },
  title: { fontSize: '22px', color: '#2d3748', borderLeft: '5px solid #e53e3e', paddingLeft: '15px' },
  topSection: { display: 'flex', gap: '20px', minHeight: '200px' },
  inputCard: { flex: 1, backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' },
  summaryCard: { flex: 1, backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  label: { fontSize: '14px', fontWeight: 'bold', color: '#4a5568', marginBottom: '10px' },
  textarea: { flex: 1, width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '10px', outline: 'none' },
  blueButton: { padding: '8px 20px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  totalBox: { marginTop: '20px', fontSize: '24px', textAlign: 'center' },
  bottomSection: { backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', flex: 1, display: 'flex', flexDirection: 'column' },
  tableWrapper: { flex: 1, overflowY: 'auto', marginBottom: '10px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { backgroundColor: '#fff5f5', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 },
  tr: { borderBottom: '1px solid #edf2f7', fontSize: '13px' },
  greenButton: { padding: '15px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }
};

export default Ledger;