import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function WorkLog() {
  const [pasteData, setPasteData] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(1);

  useEffect(() => { fetchMonthlyRecords(); }, [selectedYear, selectedMonth]);

  const fetchMonthlyRecords = async () => {
    const start = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
    const end = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
    const { data } = await supabase.from('sales_records').select('*').gte('work_date', start).lte('work_date', end).order('work_date', { ascending: false });
    setMonthlyRecords(data?.map(r => ({ ...r, product_name: r.management_no?.split(' | ')[0] || '', spec: r.management_no?.split(' | ')[1] || '' })) || []);
  };

  // [개선] 더 정밀한 엑셀 데이터 분석 로직
  const handlePasteProcess = () => {
    if (!pasteData.trim()) return alert("데이터를 붙여넣어 주세요.");
    
    const lines = pasteData.trim().split('\n').filter(line => line.trim() !== "");
    const parsed = lines.map((line, index) => {
      // 탭(\t) 또는 2개 이상의 공백으로 분리
      const cols = line.split(/\t| {2,}/).map(c => c.trim());
      
      // 데이터가 너무 짧으면 분석 제외
      if (cols.length < 5) return null;

      const rawType = cols[cols.length - 1]?.toUpperCase() || '';
      let workType = '기타';
      if (rawType.includes('SLITING2')) workType = '슬리팅 2';
      else if (rawType.includes('SLITING')) workType = '슬리팅 1';
      else if (rawType.includes('LEVELLING')) workType = '레베링';

      return {
        work_date: cols[0],
        customer_name: cols[1],
        product_name: cols[2],
        spec: cols[3],
        coil_number: cols[2], // 품명을 코일번호로 활용
        weight: Number(cols[4]?.replace(/,/g, '')) || 0,
        unit_price: Number(cols[5]?.replace(/,/g, '')) || 0,
        total_price: Number(cols[6]?.replace(/,/g, '')) || 0,
        work_type: workType
      };
    }).filter(r => r !== null && !isNaN(r.weight));

    setRows(parsed);
    alert(`${parsed.length}건의 데이터를 분석했습니다. 'DB 저장'을 눌러주세요.`);
  };

  // [개선] 중복 자동 스킵 + 벌크 저장
  const handleSaveToDB = async () => {
    if (rows.length === 0) return;
    setLoading(true);

    try {
      // 1. 이번 달 기존 데이터를 모두 가져와서 중복 대조군 생성
      const start = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
      const end = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
      const { data: existing } = await supabase.from('sales_records').select('work_date, coil_number, weight').gte('work_date', start).lte('work_date', end);

      // 2. 메모리에서 중복 제거 (날짜, 코일번호, 중량 세 가지가 모두 같으면 중복)
      const validData = rows.filter(r => {
        return !existing?.some(ex => 
          ex.work_date === r.work_date && 
          ex.coil_number === r.coil_number && 
          Math.abs(Number(ex.weight) - Number(r.weight)) < 1 // 1kg 미만 오차는 중복처리
        );
      }).map(r => ({
        work_date: r.work_date,
        customer_name: r.customer_name,
        management_no: `${r.product_name} | ${r.spec}`,
        coil_number: r.coil_number,
        weight: r.weight,
        unit_price: r.unit_price,
        total_price: r.total_price,
        work_type: r.work_type,
        company_id: 1 
      }));

      // 3. 필터링된 데이터만 전송
      if (validData.length > 0) {
        const { error } = await supabase.from('sales_records').insert(validData);
        if (error) throw error;
        alert(`✅ ${validData.length}건 저장 성공!\n(이미 저장된 ${rows.length - validData.length}건은 제외되었습니다.)`);
      } else {
        alert("⚠️ 모든 데이터가 이미 DB에 저장되어 있습니다.");
      }

      setRows([]); setPasteData(''); fetchMonthlyRecords();
    } catch (e) {
      alert("저장 에러: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{padding:'20px'}}>
      <h2 style={{color:'#1a365d'}}>📄 작업 일보 고속 입력기 (1월 집중 로직)</h2>
      <textarea 
        style={{width:'100%', height:'200px', borderRadius:'10px', padding:'15px', border:'2px solid #3182ce'}} 
        value={pasteData} 
        onChange={e=>setPasteData(e.target.value)} 
        placeholder="엑셀 데이터를 여기에 붙여넣으세요" 
      />
      <div style={{marginTop:'15px', display:'flex', gap:'10px'}}>
        <button onClick={handlePasteProcess} style={styles.blueBtn}>1. 데이터 분석</button>
        {rows.length > 0 && <button onClick={handleSaveToDB} disabled={loading} style={styles.greenBtn}>{loading ? '저장 중...' : '2. 중복 제외하고 저장하기'}</button>}
      </div>

      <div style={{marginTop:'30px', background:'white', padding:'20px', borderRadius:'15px', boxShadow:'0 4px 6px rgba(0,0,0,0.1)'}}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
          <h3 style={{margin:0}}>📅 1월 데이터 현황 ({monthlyRecords.length}건)</h3>
          <button onClick={()=>{if(window.confirm('1월 데이터를 전부 지울까요?')) supabase.from('sales_records').delete().gte('work_date','2026-01-01').lte('work_date','2026-01-31').then(()=>fetchMonthlyRecords())}} style={styles.dangerBtn}>🚨 1월 전체 삭제</button>
        </div>
        <div style={{maxHeight:'400px', overflowY:'auto'}}>
          <table style={styles.table}>
            <thead style={styles.thead}><tr><th>일자</th><th>업체</th><th>품명</th><th>중량</th><th>금액</th><th>구분</th><th>관리</th></tr></thead>
            <tbody>
              {monthlyRecords.map(r => (
                <tr key={r.id} style={styles.tr}>
                  <td>{r.work_date}</td><td>{r.customer_name}</td><td>{r.product_name}</td><td>{r.weight?.toLocaleString()}</td><td style={{fontWeight:'bold'}}>{r.total_price?.toLocaleString()}</td><td>{r.work_type}</td>
                  <td><button onClick={async ()=>{if(window.confirm('삭제?')){await supabase.from('sales_records').delete().eq('id',r.id); fetchMonthlyRecords();}}} style={styles.deleteBtn}>삭제</button></td>
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
  blueBtn: { padding:'12px 25px', backgroundColor:'#3182ce', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'bold' },
  greenBtn: { padding:'12px 25px', backgroundColor:'#38a169', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold' },
  dangerBtn: { padding:'8px 15px', backgroundColor:'#e53e3e', color:'white', border:'none', borderRadius:'8px', fontSize:'13px' },
  table: { width:'100%', borderCollapse:'collapse', fontSize:'13px' },
  thead: { backgroundColor:'#f7fafc', position:'sticky', top:0 },
  tr: { borderBottom:'1px solid #edf2f7', height:'40px' },
  deleteBtn: { padding:'4px 8px', backgroundColor:'#fed7d7', color:'#c53030', border:'none', borderRadius:'4px', cursor:'pointer' }
};

export default WorkLog;