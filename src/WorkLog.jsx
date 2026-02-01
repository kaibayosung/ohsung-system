import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function WorkLog() {
  const [pasteData, setPasteData] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(1);

  useEffect(() => { fetchMonthlyRecords(); }, [selectedMonth]);

  const fetchMonthlyRecords = async () => {
    const start = `2026-${selectedMonth.toString().padStart(2, '0')}-01`;
    const end = new Date(2026, selectedMonth, 0).toISOString().split('T')[0];
    const { data } = await supabase.from('sales_records').select('*').gte('work_date', start).lte('work_date', end).order('work_date', { ascending: false });
    
    // DB에서 가져올 때만 품명과 규격을 분리해서 보여줍니다.
    setMonthlyRecords(data?.map(r => {
      const [prod, spec] = r.management_no ? r.management_no.split(' | ') : ['', ''];
      return { ...r, product_name: prod, spec: spec };
    }) || []);
  };

  const handlePasteProcess = () => {
    if (!pasteData.trim()) return;
    const lines = pasteData.trim().split('\n').filter(l => !l.includes("생산일자") && l.trim());
    const parsed = lines.map(line => {
      const cols = line.split(/\t| {2,}/).map(c => c.trim());
      return { 
        work_date: cols[0], customer_name: cols[1], product_name: cols[2], spec: cols[3],
        coil_number: cols[2], weight: Number(cols[4]?.replace(/,/g,'')), 
        unit_price: Number(cols[5]?.replace(/,/g,'')), total_price: Number(cols[6]?.replace(/,/g,'')), 
        work_type: cols[7]?.includes('SLITING2') ? '슬리팅 2' : cols[7]?.includes('SLITING') ? '슬리팅 1' : '레베링'
      };
    });
    setRows(parsed);
  };

  const handleSaveToDB = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    try {
      // [중요] DB에 없는 'product_name' 칸은 빼고, 'management_no'에 합쳐서 보냅니다.
      const dbData = rows.map(r => ({
        work_date: r.work_date,
        customer_name: r.customer_name,
        management_no: `${r.product_name} | ${r.spec}`, // 두 정보를 하나로 합침
        coil_number: r.coil_number,
        weight: r.weight,
        unit_price: r.unit_price,
        total_price: r.total_price,
        work_type: r.work_type,
        company_id: 1 
      }));

      const { error } = await supabase.from('sales_records').insert(dbData);
      if (error) throw error;
      
      alert(`✅ 성공: ${dbData.length}건이 DB에 저장되었습니다!`);
      setRows([]); setPasteData(''); fetchMonthlyRecords();
    } catch (e) {
      alert("❌ 저장 실패 원인: " + e.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{padding:'20px'}}>
      <h3 style={{color:'#1a365d'}}>오성철강 ERP 2.0 - 작업 일보</h3>
      <div style={{display:'flex', gap:'20px', marginBottom:'20px'}}>
        <div style={{flex:1, background:'white', padding:'20px', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
          <h4>📄 데이터 붙여넣기</h4>
          <textarea style={{width:'100%', height:'120px'}} value={pasteData} onChange={e=>setPasteData(e.target.value)} placeholder="엑셀 복사 -> 붙여넣기" />
          <button onClick={handlePasteProcess} style={{width:'100%', marginTop:'10px', padding:'10px', backgroundColor:'#3182ce', color:'white', border:'none', borderRadius:'6px'}}>데이터 분석</button>
        </div>
      </div>
      {rows.length > 0 && <button onClick={handleSaveToDB} disabled={loading} style={{width:'100%', padding:'15px', backgroundColor:'#38a169', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold'}}>{loading ? 'DB 전송 중...' : `${rows.length}건 DB 저장하기`}</button>}
      <div style={{background:'white', padding:'20px', borderRadius:'12px', marginTop:'20px'}}>
        <h4>📅 1월 데이터 목록 ({monthlyRecords.length}건)</h4>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
          <thead><tr style={{background:'#f7fafc', textAlign:'left'}}><th>일자</th><th>업체</th><th>품명</th><th>중량</th><th>금액</th><th>관리</th></tr></thead>
          <tbody>{monthlyRecords.map(r => (<tr key={r.id} style={{borderBottom:'1px solid #edf2f7', height:'40px'}}><td>{r.work_date}</td><td>{r.customer_name}</td><td>{r.product_name}</td><td>{r.weight?.toLocaleString()}</td><td>{r.total_price?.toLocaleString()}</td><td><button onClick={()=>{if(window.confirm('삭제?')) supabase.from('sales_records').delete().eq('id', r.id).then(()=>fetchMonthlyRecords())}}>삭제</button></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}

export default WorkLog;