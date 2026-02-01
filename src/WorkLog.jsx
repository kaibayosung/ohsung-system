import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function WorkLog() {
  const [pasteData, setPasteData] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [editingId, setEditingId] = useState(null); 
  const [editFormData, setEditFormData] = useState({}); 

  useEffect(() => { fetchMonthlyRecords(); }, [selectedYear, selectedMonth]);

  const fetchMonthlyRecords = async () => {
    const start = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
    const end = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
    const { data } = await supabase.from('sales_records').select('*').gte('work_date', start).lte('work_date', end).order('work_date', { ascending: false });
    setMonthlyRecords(data?.map(r => ({ ...r, product_name: r.management_no?.split(' | ')[0] || '', spec: r.management_no?.split(' | ')[1] || '' })) || []);
  };

  const handlePasteProcess = () => {
    if (!pasteData.trim()) return;
    const lines = pasteData.trim().split('\n').filter(l => !l.includes("생산일자") && l.trim());
    const parsed = lines.map((line, i) => {
      const cols = line.split(/\t| {2,}/).map(c => c.trim());
      const type = cols[7]?.includes('SLITING2') ? '슬리팅 2' : cols[7]?.includes('SLITING') ? '슬리팅 1' : cols[7]?.includes('LEVELLING') ? '레베링' : '기타';
      return { work_date: cols[0], customer_name: cols[1], product_name: cols[2], spec: cols[3], coil_number: cols[2], weight: Number(cols[4]?.replace(/,/g,'')), unit_price: Number(cols[5]?.replace(/,/g,'')), total_price: Number(cols[6]?.replace(/,/g,'')), work_type: type };
    });
    setRows(parsed);
  };

  const handleSaveToDB = async () => {
    setLoading(true);
    try {
      const dates = rows.map(r => r.work_date);
      const { data: existing } = await supabase.from('sales_records').select('work_date, coil_number, weight').gte('work_date', Math.min(...dates)).lte('work_date', Math.max(...dates));
      const validData = rows.filter(r => !existing?.some(ex => ex.work_date === r.work_date && ex.coil_number === r.coil_number && Number(ex.weight) === Number(r.weight)))
        .map(r => ({ ...r, management_no: `${r.product_name} | ${r.spec}`, company_id: 1 }));
      if (validData.length > 0) { await supabase.from('sales_records').insert(validData); alert(`✅ ${validData.length}건 저장 완료!`); }
      else alert("⚠️ 중복 데이터만 있어 저장되지 않았습니다.");
      setRows([]); setPasteData(''); fetchMonthlyRecords();
    } catch (e) { alert("저장 실패: " + e.message); } finally { setLoading(false); }
  };

  return (
    <div style={{padding:'20px'}}>
      <div style={{display:'flex', gap:'20px', marginBottom:'20px'}}>
        <div style={{flex:1, background:'white', padding:'20px', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
          <h3>📄 엑셀 붙여넣기</h3>
          <textarea style={{width:'100%', height:'100px', borderRadius:'8px', border:'1px solid #ddd', padding:'10px'}} value={pasteData} onChange={e=>setPasteData(e.target.value)} placeholder="엑셀 복사 -> 붙여넣기" />
          <button onClick={handlePasteProcess} style={{width:'100%', marginTop:'10px', padding:'10px', backgroundColor:'#3182ce', color:'white', border:'none', borderRadius:'6px', cursor:'pointer'}}>데이터 분석 실행</button>
        </div>
        <div style={{flex:1, background:'#ebf8ff', padding:'20px', borderRadius:'12px'}}>
          <h3>📊 분석 요약</h3>
          {Object.entries(rows.reduce((a, c) => { a[c.work_type] = (a[c.work_type] || 0) + c.total_price; return a; }, {})).map(([k, v]) => <div key={k}>{k}: {v.toLocaleString()}원</div>)}
          <div style={{marginTop:'10px', borderTop:'1px solid #bee3f8', fontWeight:'bold', textAlign:'right'}}>총합: {rows.reduce((a,b)=>a+b.total_price,0).toLocaleString()}원</div>
        </div>
      </div>
      {rows.length > 0 && <button onClick={handleSaveToDB} disabled={loading} style={{width:'100%', padding:'15px', backgroundColor:'#38a169', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold'}}>{loading ? '중복 체크 및 저장 중...' : '중복 제외하고 고속 저장'}</button>}
      <div style={{background:'white', padding:'20px', borderRadius:'12px', marginTop:'20px'}}>
        <h3>📅 {selectedMonth}월 데이터 ({monthlyRecords.length}건)</h3>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
          <thead><tr style={{background:'#f7fafc', textAlign:'left'}}><th>일자</th><th>업체</th><th>품명</th><th>중량</th><th>금액</th><th>구분</th><th>관리</th></tr></thead>
          <tbody>{monthlyRecords.map(r => (<tr key={r.id} style={{borderBottom:'1px solid #edf2f7', height:'40px'}}><td>{r.work_date}</td><td>{r.customer_name}</td><td>{r.product_name}</td><td>{r.weight?.toLocaleString()}</td><td style={{fontWeight:'bold'}}>{r.total_price?.toLocaleString()}</td><td>{r.work_type}</td><td><button onClick={()=>{if(window.confirm('삭제?')) supabase.from('sales_records').delete().eq('id', r.id).then(()=>fetchMonthlyRecords())}}>삭제</button></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
export default WorkLog;