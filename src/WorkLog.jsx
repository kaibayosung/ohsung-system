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

  // [기능 1] 월별 데이터 검색 (조회)
  const fetchMonthlyRecords = async () => {
    const start = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
    const end = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
    const { data } = await supabase.from('sales_records').select('*').gte('work_date', start).lte('work_date', end).order('work_date', { ascending: false });
    setMonthlyRecords(data?.map(r => ({ ...r, product_name: r.management_no?.split(' | ')[0] || '', spec: r.management_no?.split(' | ')[1] || '' })) || []);
  };

  // [기능 2] 엑셀 붙여넣기 분석
  const handlePasteProcess = () => {
    const lines = pasteData.trim().split('\n').filter(l => !l.includes("생산일자") && l.trim());
    setRows(lines.map((line, i) => {
      const cols = line.split(/\t| {2,}/).map(c => c.trim());
      const type = cols[7]?.includes('SLITING2') ? '슬리팅 2' : cols[7]?.includes('SLITING') ? '슬리팅 1' : cols[7]?.includes('LEVELLING') ? '레베링' : '기타';
      return { work_date: cols[0], customer_name: cols[1], product_name: cols[2], spec: cols[3], coil_number: cols[2], weight: Number(cols[4]?.replace(/,/g,'')), unit_price: Number(cols[5]?.replace(/,/g,'')), total_price: Number(cols[6]?.replace(/,/g,'')), work_type: type };
    }));
  };

  // [기능 3] 초고속 벌크 저장 (중복 자동 필터링)
  const handleSaveToDB = async () => {
    setLoading(true);
    try {
      const dates = rows.map(r => r.work_date);
      const { data: existing } = await supabase.from('sales_records').select('work_date, coil_number, weight').gte('work_date', Math.min(...dates)).lte('work_date', Math.max(...dates));
      const validData = rows.filter(r => !existing?.some(ex => ex.work_date === r.work_date && ex.coil_number === r.coil_number && Number(ex.weight) === Number(r.weight)))
        .map(r => ({ ...r, management_no: `${r.product_name} | ${r.spec}`, company_id: 1 }));
      if (validData.length > 0) { await supabase.from('sales_records').insert(validData); alert(`✅ ${validData.length}건 저장 성공!`); }
      else alert("⚠️ 중복 데이터 제외 (0건 저장)");
      setRows([]); setPasteData(''); fetchMonthlyRecords();
    } catch (e) { alert("저장 실패: " + e.message); } finally { setLoading(false); }
  };

  // [기능 4] 수정 및 삭제
  const handleUpdate = async (id) => {
    await supabase.from('sales_records').update({ management_no: `${editFormData.product_name} | ${editFormData.spec}`, coil_number: editFormData.coil_number, weight: editFormData.weight, total_price: editFormData.total_price, work_type: editFormData.work_type }).eq('id', id);
    setEditingId(null); fetchMonthlyRecords();
  };
  const handleDelete = async (id) => { if (window.confirm('삭제할까요?')) { await supabase.from('sales_records').delete().eq('id', id); fetchMonthlyRecords(); } };
  const handleDeleteMonth = async () => { if (window.confirm('이 달의 모든 데이터를 삭제할까요?')) { await supabase.from('sales_records').delete().gte('work_date', `${selectedYear}-${selectedMonth}-01`).lte('work_date', `${selectedYear}-${selectedMonth}-31`); fetchMonthlyRecords(); } };

  return (
    <div style={{padding:'20px'}}>
      <div style={{display:'flex', gap:'20px', marginBottom:'20px'}}>
        <div style={{flex:1, background:'white', padding:'20px', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
          <h3>📄 엑셀 붙여넣기</h3>
          <textarea style={{width:'100%', height:'100px', borderRadius:'8px', border:'1px solid #ddd', padding:'10px'}} value={pasteData} onChange={e=>setPasteData(e.target.value)} />
          <button onClick={handlePasteProcess} style={{width:'100%', marginTop:'10px', padding:'10px', backgroundColor:'#3182ce', color:'white', border:'none', borderRadius:'6px'}}>데이터 분석</button>
        </div>
        <div style={{flex:1, background:'#ebf8ff', padding:'20px', borderRadius:'12px'}}>
          <h3>📊 분석 요약</h3>
          <div style={{fontSize:'14px'}}>{Object.entries(rows.reduce((a, c) => { a[c.work_type] = (a[c.work_type] || 0) + c.total_price; return a; }, {})).map(([k, v]) => <div key={k}>{k}: {v.toLocaleString()}원</div>)}</div>
          <div style={{marginTop:'10px', borderTop:'1px solid #bee3f8', fontWeight:'bold', textAlign:'right'}}>총합: {rows.reduce((a,b)=>a+b.total_price,0).toLocaleString()}원</div>
        </div>
      </div>
      {rows.length > 0 && <button onClick={handleSaveToDB} disabled={loading} style={{width:'100%', padding:'15px', backgroundColor:'#38a169', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold'}}>{loading ? '저장 중...' : '중복 제외하고 저장하기'}</button>}
      <div style={{background:'white', padding:'20px', borderRadius:'12px', marginTop:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
          <div style={{display:'flex', gap:'10px'}}>
            <select value={selectedYear} onChange={e=>setSelectedYear(e.target.value)} style={{padding:'5px'}}><option value="2026">2026년</option><option value="2025">2025년</option></select>
            <select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} style={{padding:'5px'}}>{Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}월</option>)}</select>
          </div>
          <button onClick={handleDeleteMonth} style={{padding:'5px 10px', backgroundColor:'#e53e3e', color:'white', border:'none', borderRadius:'4px'}}>🚨 월 전체 삭제</button>
        </div>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
          <thead><tr style={{background:'#f7fafc', textAlign:'left'}}><th>일자</th><th>업체</th><th>품명</th><th>금액</th><th>구분</th><th>관리</th></tr></thead>
          <tbody>{monthlyRecords.map(r => (<tr key={r.id} style={{borderBottom:'1px solid #edf2f7', height:'40px'}}>
            {editingId === r.id ? (
              <><td><input type="date" value={editFormData.work_date} onChange={e=>setEditFormData({...editFormData, work_date:e.target.value})}/></td><td><input value={editFormData.customer_name} onChange={e=>setEditFormData({...editFormData, customer_name:e.target.value})}/></td><td><input value={editFormData.product_name} onChange={e=>setEditFormData({...editFormData, product_name:e.target.value})}/></td><td><input value={editFormData.total_price} onChange={e=>setEditFormData({...editFormData, total_price:e.target.value})}/></td><td><select value={editFormData.work_type} onChange={e=>setEditFormData({...editFormData, work_type:e.target.value})}><option value="슬리팅 1">슬리팅 1</option><option value="슬리팅 2">슬리팅 2</option><option value="레베링">레베링</option></select></td><td><button onClick={()=>handleUpdate(r.id)}>저장</button></td></>
            ) : (
              <><td>{r.work_date}</td><td>{r.customer_name}</td><td>{r.product_name}</td><td style={{fontWeight:'bold'}}>{r.total_price?.toLocaleString()}원</td><td>{r.work_type}</td><td><button onClick={()=>{setEditingId(r.id); setEditFormData(r);}}>수정</button> <button onClick={()=>handleDelete(r.id)}>삭제</button></td></>
            )}
          </tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
export default WorkLog;