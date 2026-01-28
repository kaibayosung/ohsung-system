import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function Ledger() {
  const [pasteData, setPasteData] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(1);
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

  const handleCellUpdate = async (id, field, value) => {
    const updatedValue = field === 'amount' ? Number(value) : value;
    setMonthlyRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: updatedValue } : r));
    try {
      const { error } = await supabase.from('daily_ledger').update({ [field]: updatedValue }).eq('id', id);
      if (error) throw error;
    } catch (e) {
      alert("수정 실패: " + e.message);
      fetchMonthlyRecords();
    }
    setEditingCell({ id: null, field: null });
  };

  const handleSingleDelete = async (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    const { error } = await supabase.from('daily_ledger').delete().eq('id', id);
    if (!error) fetchMonthlyRecords();
  };

  const handlePasteProcess = () => {
    if (!pasteData.trim()) return alert("데이터를 붙여넣어 주세요.");
    const lines = pasteData.trim().split('\n');
    const parsedRows = [];
    let lastValidDate = ""; 
    lines.forEach((line) => {
      if (line.includes("날자") || line.includes("수입") || line.trim() === "") return;
      const cols = line.split('\t');
      if (cols.length < 5) return;
      let rowDate = cols[0]?.trim();
      if (rowDate && /^\d{4}-\d{2}-\d{2}$/.test(rowDate)) lastValidDate = rowDate;
      else rowDate = lastValidDate;
      if (!rowDate) return;
      const parseAmt = (val) => Number(val?.replace(/,/g, '')) || 0;
      const income = parseAmt(cols[4]);
      const expCash = parseAmt(cols[5]);
      const expCard = parseAmt(cols[6]);
      const expOther = parseAmt(cols[7]);
      if (income > 0) parsedRows.push({ trans_date: rowDate, type: '수입', company: cols[1], description: cols[2], amount: income, method: '현금' });
      if (expCash > 0) parsedRows.push({ trans_date: rowDate, type: '지출', company: cols[1], description: cols[2], amount: expCash, method: '현금' });
      if (expCard > 0) parsedRows.push({ trans_date: rowDate, type: '지출', company: cols[1], description: cols[2], amount: expCard, method: '법인카드' });
      if (expOther > 0) parsedRows.push({ trans_date: rowDate, type: '지출', company: cols[1], description: cols[2], amount: expOther, method: '기타' });
    });
    setRows(parsedRows);
  };

  const handleSave = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    try {
      const dates = rows.map(r => r.trans_date);
      const minDate = dates.reduce((a, b) => a < b ? a : b);
      const maxDate = dates.reduce((a, b) => a > b ? a : b);

      const { data: existingData } = await supabase.from('daily_ledger').select('*')
        .gte('trans_date', minDate).lte('trans_date', maxDate);

      // [에러 방지] 데이터가 없을 경우 빈 배열 처리
      const existing = existingData || []; 

      const duplicates = [];
      const validRows = [];

      rows.forEach(newR => {
        const isDup = existing.some(oldR => 
          oldR.trans_date === newR.trans_date && oldR.company === newR.company && 
          oldR.amount === newR.amount && oldR.method === newR.method && 
          (oldR.description || '') === (newR.description || '')
        );
        if (isDup) duplicates.push(`${newR.trans_date} | ${newR.company} | ${newR.amount.toLocaleString()}원`);
        else validRows.push(newR);
      });

      if (validRows.length > 0) {
        const { error } = await supabase.from('daily_ledger').insert(validRows);
        if (error) throw error;
      }

      const dupMsg = duplicates.length > 0 
        ? `\n\n⚠️ 중복 제외(${duplicates.length}건):\n${duplicates.slice(0, 5).join('\n')}${duplicates.length > 5 ? '\n...외 더 있음' : ''}`
        : '';
      alert(`✅ ${validRows.length}건 저장 완료!${dupMsg}`);
      setRows([]); setPasteData(''); fetchMonthlyRecords();
    } catch (err) { alert("저장 오류: " + err.message); } finally { setLoading(false); }
  };

  const EditableCell = ({ record, field, type = "text" }) => {
    const isEditing = editingCell.id === record.id && editingCell.field === field;
    if (isEditing) {
      return (
        <input
          autoFocus type={type} defaultValue={record[field]}
          onBlur={(e) => handleCellUpdate(record.id, field, e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCellUpdate(record.id, field, e.target.value)}
          style={styles.cellInput}
        />
      );
    }
    return <div onClick={() => setEditingCell({ id: record.id, field })} style={styles.cellDiv}>{field === 'amount' ? record[field].toLocaleString() : record[field]}</div>;
  };

  return (
    <div style={styles.container}>
      <div style={styles.topSection}>
        <div style={styles.card}><h3 style={styles.cardTitle}>📝 일계표 엑셀 붙여넣기</h3><textarea style={styles.textarea} value={pasteData} onChange={e=>setPasteData(e.target.value)} /><button onClick={handlePasteProcess} style={styles.blueBtn}>데이터 분석</button></div>
        <div style={styles.summaryCard}><h3>📊 분석 결과</h3><p>수입: {rows.filter(r=>r.type==='수입').length}건 / 지출: {rows.filter(r=>r.type==='지출').length}건</p><button onClick={handleSave} disabled={loading || rows.length===0} style={styles.greenBtn}>{loading ? '처리 중...' : '중복 제외 후 저장'}</button></div>
      </div>
      <div style={styles.listCard}>
        <div style={styles.headerRow}><h3>📅 {selectedYear}년 {selectedMonth}월 내역</h3><select value={selectedMonth} onChange={e=>setSelectedMonth(Number(e.target.value))}>{[1,2,3,4,5,6,7,8,9,10,11,12].map(m=><option key={m} value={m}>{m}월</option>)}</select></div>
        <div style={styles.scrollWrapper}><table style={styles.table}><thead style={styles.thead}><tr><th>날짜</th><th>구분</th><th>상호</th><th>적요</th><th>금액</th><th>방식</th><th>관리</th></tr></thead>
        <tbody>{monthlyRecords.map(r => (<tr key={r.id} style={styles.tr}><td><EditableCell record={r} field="trans_date" type="date" /></td><td><EditableCell record={r} field="type" /></td><td><EditableCell record={r} field="company" /></td><td><EditableCell record={r} field="description" /></td><td style={{textAlign:'right'}}><EditableCell record={r} field="amount" type="number" /></td><td><EditableCell record={r} field="method" /></td><td><button onClick={() => handleSingleDelete(r.id)} style={styles.delBtn}>삭제</button></td></tr>))}</tbody></table></div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '20px', height: '100vh', boxSizing:'border-box', display:'flex', flexDirection:'column', gap:'20px', backgroundColor:'#f4f7f9' },
  topSection: { display: 'flex', gap: '20px' },
  card: { flex: 2, backgroundColor: 'white', padding: '20px', borderRadius: '12px' },
  summaryCard: { flex: 1, backgroundColor: '#ebf8ff', padding: '20px', borderRadius: '12px' },
  textarea: { width:'100%', height:'100px', marginBottom:'10px' },
  blueBtn: { width:'100%', padding: '10px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor:'pointer' },
  greenBtn: { width: '100%', padding: '15px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor:'pointer' },
  listCard: { background:'white', padding:'20px', borderRadius:'12px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 },
  headerRow: { display:'flex', justifyContent:'space-between', marginBottom:'10px' },
  scrollWrapper: { flex: 1, overflowY: 'auto', border: '1px solid #edf2f7' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  thead: { position: 'sticky', top: 0, backgroundColor: '#f7fafc', zIndex: 1 },
  tr: { borderBottom: '1px solid #edf2f7', height: '40px' },
  cellDiv: { padding: '8px', cursor: 'pointer', minHeight: '20px', width: '100%' },
  cellInput: { width: '90%', padding: '5px', border: '2px solid #3182ce', borderRadius: '4px', outline: 'none' },
  delBtn: { color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer' },
  cardTitle: { margin: '0 0 10px 0' }
};

export default Ledger;