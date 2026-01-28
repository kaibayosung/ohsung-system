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

  const TABLE_NAME = 'daily_ledger';

  useEffect(() => { fetchMonthlyRecords(); }, [selectedYear, selectedMonth]);

  const fetchMonthlyRecords = async () => {
    const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
    const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
    const { data } = await supabase.from(TABLE_NAME).select('*')
      .gte('trans_date', startDate).lte('trans_date', endDate)
      .order('trans_date', { ascending: false });
    setMonthlyRecords(data || []);
  };

  const handleCellUpdate = async (id, field, value) => {
    const val = field === 'amount' ? Number(value) : value;
    setMonthlyRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
    try {
      const { error } = await supabase.from(TABLE_NAME).update({ [field]: val }).eq('id', id);
      if (error) throw error;
    } catch (e) { alert("수정 오류: " + e.message); fetchMonthlyRecords(); }
    setEditingCell({ id: null, field: null });
  };

  const handlePasteProcess = () => {
    if (!pasteData.trim()) return alert("데이터를 붙여넣어 주세요.");
    const lines = pasteData.trim().split('\n');
    const parsedRows = [];
    let lastDate = ""; 

    lines.forEach((line) => {
      if (line.includes("날자") || line.includes("수입") || line.trim() === "") return;
      const cols = line.split('\t');
      if (cols.length < 5) return;

      let rowDate = cols[0]?.trim();
      if (rowDate && /^\d{4}-\d{2}-\d{2}$/.test(rowDate)) lastDate = rowDate;
      else rowDate = lastDate;
      if (!rowDate) return;

      const parseAmt = (v) => Number(v?.replace(/,/g, '')) || 0;
      const data = { trans_date: rowDate, company: cols[1], description: cols[2] };

      if (parseAmt(cols[4]) > 0) parsedRows.push({ ...data, type: '수입', amount: parseAmt(cols[4]), method: '현금' });
      if (parseAmt(cols[5]) > 0) parsedRows.push({ ...data, type: '지출', amount: parseAmt(cols[5]), method: '현금' });
      if (parseAmt(cols[6]) > 0) parsedRows.push({ ...data, type: '지출', amount: parseAmt(cols[6]), method: '법인카드' });
      if (parseAmt(cols[7]) > 0) parsedRows.push({ ...data, type: '지출', amount: parseAmt(cols[7]), method: '기타' });
    });
    setRows(parsedRows);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: existingData } = await supabase.from(TABLE_NAME).select('*');
      const existing = existingData || [];
      const validRows = rows.filter(newR => !existing.some(oldR => 
        oldR.trans_date === newR.trans_date && oldR.company === newR.company && oldR.amount === newR.amount && oldR.method === newR.method
      ));

      if (validRows.length > 0) {
        const { error } = await supabase.from(TABLE_NAME).insert(validRows);
        if (error) throw error;
      }
      alert(`저장 완료: ${validRows.length}건 (중복 제외: ${rows.length - validRows.length}건)`);
      setRows([]); setPasteData(''); fetchMonthlyRecords();
    } catch (err) { alert("저장 실패: " + err.message); } finally { setLoading(false); }
  };

  const EditableCell = ({ record, field, type = "text" }) => (
    editingCell.id === record.id && editingCell.field === field ? 
    <input autoFocus type={type} defaultValue={record[field]} onBlur={(e) => handleCellUpdate(record.id, field, e.target.value)} style={{width:'90%'}} /> :
    <div onClick={() => setEditingCell({ id: record.id, field })} style={{padding:'5px', cursor:'pointer'}}>{field === 'amount' ? record[field].toLocaleString() : record[field]}</div>
  );

  return (
    <div style={{padding:'20px', fontFamily:'sans-serif'}}>
      <div style={{display:'flex', gap:'20px', marginBottom:'20px'}}>
        <div style={{flex:2, padding:'15px', background:'white', borderRadius:'8px', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
          <h3>📝 일계표 붙여넣기</h3>
          <textarea style={{width:'100%', height:'100px'}} value={pasteData} onChange={e=>setPasteData(e.target.value)} />
          <button onClick={handlePasteProcess} style={{width:'100%', marginTop:'10px', padding:'10px', background:'#3182ce', color:'white', border:'none', borderRadius:'4px'}}>데이터 분석</button>
        </div>
        <div style={{flex:1, padding:'20px', background:'#ebf8ff', borderRadius:'8px', display:'flex', flexDirection:'column', justifyContent:'center'}}>
          <p>분석 데이터: <b>{rows.length}</b>건</p>
          <button onClick={handleSave} disabled={loading || rows.length===0} style={{padding:'15px', background:'#38a169', color:'white', border:'none', borderRadius:'4px', fontWeight:'bold'}}>{loading ? '저장 중...' : '중복 제외 후 저장'}</button>
        </div>
      </div>
      <div style={{background:'white', padding:'15px', borderRadius:'8px', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
          <h3>📅 {selectedYear}년 {selectedMonth}월 장부</h3>
          <select value={selectedMonth} onChange={e=>setSelectedMonth(Number(e.target.value))} style={{padding:'5px'}}>{[1,2,3,4,5,6,7,8,9,10,11,12].map(m=><option key={m} value={m}>{m}월</option>)}</select>
        </div>
        <table style={{width:'100%', borderCollapse:'collapse', textAlign:'center', fontSize:'13px'}}>
          <thead style={{background:'#f7fafc'}}>
            <tr><th style={{padding:'10px', borderBottom:'1px solid #ddd'}}>날짜</th><th style={{borderBottom:'1px solid #ddd'}}>구분</th><th style={{borderBottom:'1px solid #ddd'}}>상호</th><th style={{borderBottom:'1px solid #ddd'}}>적요</th><th style={{borderBottom:'1px solid #ddd'}}>금합계</th><th style={{borderBottom:'1px solid #ddd'}}>방식</th></tr>
          </thead>
          <tbody>
            {monthlyRecords.map(r => (
              <tr key={r.id} style={{borderBottom:'1px solid #eee'}}>
                <td><EditableCell record={r} field="trans_date" type="date" /></td>
                <td style={{color:r.type==='수입'?'blue':'red', fontWeight:'bold'}}>{r.type}</td>
                <td><EditableCell record={r} field="company" /></td>
                <td><EditableCell record={r} field="description" /></td>
                <td style={{textAlign:'right', paddingRight:'10px'}}><EditableCell record={r} field="amount" type="number" /></td>
                <td><EditableCell record={r} field="method" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Ledger;