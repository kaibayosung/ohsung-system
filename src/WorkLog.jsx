import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

function WorkLog() {
  const [pasteData, setPasteData] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [editingId, setEditingId] = useState(null); 
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => { fetchMonthlyRecords(); }, [selectedYear, selectedMonth]);

  // [조회 기능] 월별 데이터 불러오기
  const fetchMonthlyRecords = async () => {
    const start = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
    const end = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
    const { data } = await supabase.from('sales_records').select('*').gte('work_date', start).lte('work_date', end).order('work_date', { ascending: false });
    setMonthlyRecords(data?.map(r => ({ ...r, product_name: r.management_no?.split(' | ')[0] || '', spec: r.management_no?.split(' | ')[1] || '' })) || []);
  };

  // [분석 기능] 엑셀 데이터 파싱
  const handlePasteProcess = () => {
    if (!pasteData.trim()) return;
    const lines = pasteData.trim().split('\n').filter(l => !l.includes("생산일자") && l.trim());
    setRows(lines.map(line => {
      const cols = line.split(/\t| {2,}/).map(c => c.trim());
      const type = cols[7]?.includes('SLITING2') ? '슬리팅 2' : cols[7]?.includes('SLITING') ? '슬리팅 1' : cols[7]?.includes('LEVELLING') ? '레베링' : '기타';
      return { work_date: cols[0], customer_name: cols[1], product_name: cols[2], spec: cols[3], coil_number: cols[2], weight: Number(cols[4]?.replace(/,/g,'')), unit_price: Number(cols[5]?.replace(/,/g,'')), total_price: Number(cols[6]?.replace(/,/g,'')), work_type: type };
    }));
  };

  // [저장 기능] UPSERT (중복 시 업데이트, 없으면 삽입)
  const handleSaveToDB = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    try {
      const formatted = rows.map(r => ({ ...r, management_no: `${r.product_name} | ${r.spec}`, company_id: 1 }));
      const { error } = await supabase.from('sales_records').upsert(formatted, { onConflict: 'work_date, coil_number, weight' });
      if (error) throw error;
      alert(`✅ ${rows.length}건 저장 및 동기화 완료!`);
      setRows([]); setPasteData(''); fetchMonthlyRecords();
    } catch (e) { alert("❌ 저장 실패: " + e.message); } finally { setLoading(false); }
  };

  // [수정/삭제 기능]
  const handleUpdate = async (id) => {
    await supabase.from('sales_records').update({ management_no: `${editFormData.product_name} | ${editFormData.spec}`, weight: Number(editFormData.weight), total_price: Number(editFormData.total_price), work_type: editFormData.work_type, customer_name: editFormData.customer_name }).eq('id', id);
    setEditingId(null); fetchMonthlyRecords();
  };

  return (
    <div style={{padding:'20px'}}>
      <div style={{display:'flex', gap:'20px', marginBottom:'20px'}}>
        <div style={{flex:1, background:'white', padding:'20px', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
          <h3>📄 엑셀 붙여넣기</h3>
          <textarea style={{width:'100%', height:'120px', padding:'10px'}} value={pasteData} onChange={e=>setPasteData(e.target.value)} />
          <button onClick={handlePasteProcess} style={{width:'100%', marginTop:'10px', padding:'10px', backgroundColor:'#3182ce', color:'white', border:'none', borderRadius:'6px'}}>데이터 분석</button>
        </div>
      </div>
      {rows.length > 0 && <button onClick={handleSaveToDB} disabled={loading} style={{width:'100%', padding:'15px', backgroundColor:'#38a169', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold'}}>{loading ? '저장 중...' : 'DB로 데이터 전송 및 동기화'}</button>}
      <div style={{background:'white', padding:'20px', borderRadius:'12px', marginTop:'20px'}}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
          <h3>📅 {selectedMonth}월 데이터 목록 ({monthlyRecords.length}건)</h3>
          <select value={selectedMonth} onChange={e=>setSelectedMonth(Number(e.target.value))}>{Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}월</option>)}</select>
        </div>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
          <thead><tr style={{background:'#f7fafc', textAlign:'left'}}><th>일자</th><th>업체</th><th>품명</th><th>중량</th><th>금액</th><th>관리</th></tr></thead>
          <tbody>{monthlyRecords.map(r => (<tr key={r.id} style={{borderBottom:'1px solid #edf2f7', height:'40px'}}><td>{r.work_date}</td><td>{r.customer_name}</td><td>{r.product_name}</td><td>{r.weight?.toLocaleString()}</td><td>{r.total_price?.toLocaleString()}</td><td><button onClick={()=>{if(window.confirm('삭제?')) supabase.from('sales_records').delete().eq('id', r.id).then(()=>fetchMonthlyRecords())}}>삭제</button></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}

export default WorkLog;