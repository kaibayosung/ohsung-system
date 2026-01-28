import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function Ledger() {
  const [pasteData, setPasteData] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(1);

  // 수정을 위한 상태 관리 (어떤 칸을 수정 중인지 저장)
  const [editingCell, setEditingCell] = useState({ id: null, field: null }); 

  useEffect(() => { fetchMonthlyRecords(); }, [selectedYear, selectedMonth]);

  const fetchMonthlyRecords = async () => {
    const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
    const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
    const { data } = await supabase.from('daily_ledger').select('*')
      .gte('trans_date', startDate).lte('trans_date', endDate)
      .order('trans_date', { ascending: false }).order('created_at', { ascending: false });
    setMonthlyRecords(data || []);
  };

  // --- [기능 1] 엑셀처럼 칸 단위 수정 로직 ---
  const handleCellUpdate = async (id, field, value) => {
    const updatedValue = field === 'amount' ? Number(value) : value;
    
    // UI 선반영
    setMonthlyRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: updatedValue } : r));

    try {
      const { error } = await supabase.from('daily_ledger').update({ [field]: updatedValue }).eq('id', id);
      if (error) throw error;
    } catch (e) {
      alert("수정 실패: " + e.message);
      fetchMonthlyRecords(); // 원복
    }
    setEditingCell({ id: null, field: null });
  };

  // --- [기능 2] 개별 행 삭제 ---
  const handleSingleDelete = async (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    const { error } = await supabase.from('daily_ledger').delete().eq('id', id);
    if (!error) fetchMonthlyRecords();
  };

  // --- [기능 3] 이미지 구조 기반 엑셀 데이터 파싱 ---
  const handlePasteProcess = () => {
    if (!pasteData.trim()) return alert("데이터를 붙여넣어 주세요.");
    const lines = pasteData.trim().split('\n');
    const parsedRows = [];
    let lastValidDate = ""; 

    lines.forEach((line) => {
      if (line.includes("날자") || line.includes("수입") || line.includes("지출계") || line.trim() === "") return;
      
      const cols = line.split('\t');
      if (cols.length < 5) return;

      let rowDate = cols[0]?.trim();
      if (rowDate && /^\d{4}-\d{2}-\d{2}$/.test(rowDate)) {
        lastValidDate = rowDate; 
      } else {
        rowDate = lastValidDate;
      }
      if (!rowDate) return;

      const company = cols[1]?.trim() || '';
      const description = cols[2]?.trim() || '';
      const parseAmt = (val) => Number(val?.replace(/,/g, '')) || 0;

      // 이미지 열 순서: [4]현금입금, [5]현금지출, [6]법인카드, [7]기타
      const incomeCash = parseAmt(cols[4]);
      const expenseCash = parseAmt(cols[5]);
      const expenseCard = parseAmt(cols[6]);
      const expenseOther = parseAmt(cols[7]);

      if (incomeCash > 0) parsedRows.push({ trans_date: rowDate, type: '수입', company, description, amount: incomeCash, method: '현금' });
      if (expenseCash > 0) parsedRows.push({ trans_date: rowDate, type: '지출', company, description, amount: expenseCash, method: '현금' });
      if (expenseCard > 0) parsedRows.push({ trans_date: rowDate, type: '지출', company, description, amount: expenseCard, method: '법인카드' });
      if (expenseOther > 0) parsedRows.push({ trans_date: rowDate, type: '지출', company, description, amount: expenseOther, method: '기타' });
    });
    setRows(parsedRows);
  };

  // --- [기능 4] 중복 데이터 체크 후 일괄 저장 ---
  const handleSave = async () => {
    if (rows.length === 0) return;
    setLoading(true);

    try {
      const dates = rows.map(r => r.trans_date);
      const minDate = dates.reduce((a, b) => a < b ? a : b);
      const maxDate = dates.reduce((a, b) => a > b ? a : b);

      const { data: existing } = await supabase.from('daily_ledger').select('*')
        .gte('trans_date', minDate).lte('trans_date', maxDate);

      const duplicates = rows.filter(newR => 
        existing.some(oldR => 
          oldR.trans_date === newR.trans_date && oldR.company === newR.company && 
          oldR.amount === newR.amount && oldR.method === newR.method
        )
      );

      if (duplicates.length > 0) {
        alert(`⚠️ 중복 데이터가 ${duplicates.length}건 있습니다. 저장을 중단합니다.`);
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('daily_ledger').insert(rows);
      if (error) throw error;
      
      alert(`${rows.length}건 저장되었습니다.`);
      setRows([]); setPasteData(''); fetchMonthlyRecords();
    } catch (err) { alert("오류: " + err.message); } finally { setLoading(false); }
  };

  // 인라인 수정용 칸 컴포넌트
  const EditableCell = ({ record, field, type = "text" }) => {
    const isEditing = editingCell.id === record.id && editingCell.field === field;
    if (isEditing) {
      return (
        <input
          autoFocus
          type={type}
          defaultValue={record[field]}
          onBlur={(e) => handleCellUpdate(record.id, field, e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCellUpdate(record.id, field, e.target.value)}
          style={styles.cellInput}
        />
      );
    }
    return (
      <div onClick={() => setEditingCell({ id: record.id, field })} style={styles.cellDiv}>
        {field === 'amount' ? record[field].toLocaleString() : record[field]}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.topSection}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📝 엑셀 붙여넣기</h3>
          <textarea style={styles.textarea} value={pasteData} onChange={e=>setPasteData(e.target.value)} placeholder="엑셀 데이터를 붙여넣으세요." />
          <button onClick={handlePasteProcess} style={styles.blueBtn}>데이터 분석 실행</button>
        </div>
        <div style={styles.summaryCard}>
          <h3>📊 분석 결과</h3>
          <p>수입: {rows.filter(r=>r.type==='수입').length}건 / 지출: {rows.filter(r=>r.type==='지출').length}건</p>
          <button onClick={handleSave} disabled={loading || rows.length===0} style={styles.greenBtn}>
            {loading ? '처리 중...' : '데이터베이스 저장'}
          </button>
        </div>
      </div>
      
      <div style={styles.listCard}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
          <h3 style={{margin:0}}>📅 {selectedYear}년 {selectedMonth}월 장부</h3>
          <select value={selectedMonth} onChange={e=>setSelectedMonth(Number(e.target.value))}>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m=><option key={m} value={m}>{m}월</option>)}
          </select>
        </div>

        <div style={styles.scrollWrapper}>
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr>
                <th style={{width:'12%'}}>날짜</th><th style={{width:'8%'}}>구분</th><th style={{width:'15%'}}>상호</th>
                <th style={{width:'35%'}}>적요</th><th style={{width:'12%'}}>금액</th><th style={{width:'10%'}}>방식</th><th style={{width:'8%'}}>관리</th>
              </tr>
            </thead>
            <tbody>
              {monthlyRecords.map(r => (
                <tr key={r.id} style={styles.tr}>
                  <td><EditableCell record={r} field="trans_date" type="date" /></td>
                  <td><EditableCell record={r} field="type" /></td>
                  <td><EditableCell record={r} field="company" /></td>
                  <td><EditableCell record={r} field="description" /></td>
                  <td style={{textAlign:'right'}}><EditableCell record={r} field="amount" type="number" /></td>
                  <td><EditableCell record={r} field="method" /></td>
                  <td><button onClick={() => handleSingleDelete(r.id)} style={styles.delBtn}>삭제</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '20px', height: '100vh', boxSizing:'border-box', display:'flex', flexDirection:'column', gap:'20px', backgroundColor:'#f4f7f9' },
  topSection: { display: 'flex', gap: '20px' },
  card: { flex: 2, backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  summaryCard: { flex: 1, backgroundColor: '#ebf8ff', padding: '20px', borderRadius: '12px', display:'flex', flexDirection:'column', justifyContent:'center' },
  textarea: { width:'100%', height:'120px', marginBottom:'10px', padding:'10px', boxSizing:'border-box' },
  blueBtn: { width:'100%', padding: '12px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', fontWeight:'bold', cursor: 'pointer' },
  greenBtn: { width: '100%', padding: '15px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor:'pointer' },
  listCard: { background:'white', padding:'20px', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 },
  scrollWrapper: { flex: 1, overflowY: 'auto', border: '1px solid #edf2f7' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  thead: { position: 'sticky', top: 0, backgroundColor: '#f7fafc', zIndex: 1 },
  tr: { borderBottom: '1px solid #edf2f7', height: '40px' },
  cellDiv: { padding: '8px', cursor: 'pointer', minHeight: '20px', width: '100%' },
  cellInput: { width: '90%', padding: '5px', border: '2px solid #3182ce', borderRadius: '4px', outline: 'none' },
  delBtn: { color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' },
  cardTitle: { margin: '0 0 10px 0' }
};

export default Ledger;