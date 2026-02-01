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

  // [기능 1] 월별 데이터 조회 (검색)
  const fetchMonthlyRecords = async () => {
    const start = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
    const end = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
    const { data } = await supabase.from('sales_records').select('*').gte('work_date', start).lte('work_date', end).order('work_date', { ascending: false });
    setMonthlyRecords(data?.map(r => ({ ...r, product_name: r.management_no?.split(' | ')[0] || '', spec: r.management_no?.split(' | ')[1] || '' })) || []);
  };

  // [기능 2] 엑셀 데이터 분석 및 자동 구분
  const handlePasteProcess = () => {
    if (!pasteData.trim()) return alert("데이터를 붙여넣어 주세요.");
    const lines = pasteData.trim().split('\n').filter(l => !l.includes("생산일자") && l.trim());
    setRows(lines.map((line, i) => {
      const cols = line.split(/\t| {2,}/).map(c => c.trim());
      const type = cols[7]?.includes('SLITING2') ? '슬리팅 2' : cols[7]?.includes('SLITING') ? '슬리팅 1' : cols[7]?.includes('LEVELLING') ? '레베링' : '기타';
      return { work_date: cols[0], customer_name: cols[1], product_name: cols[2], spec: cols[3], coil_number: cols[2], weight: Number(cols[4]?.replace(/,/g,'')), unit_price: Number(cols[5]?.replace(/,/g,'')), total_price: Number(cols[6]?.replace(/,/g,'')), work_type: type };
    }));
  };

  // [기능 3] 중복 자동 필터링 및 고속 벌크 저장 (에러 해결 핵심)
  const handleSaveToDB = async () => {
    setLoading(true);
    try {
      const { data: existing } = await supabase.from('sales_records').select('work_date, coil_number, weight').gte('work_date', `${selectedYear}-${selectedMonth}-01`).lte('work_date', `${selectedYear}-${selectedMonth}-31`);
      const validData = rows.filter(r => !existing?.some(ex => ex.work_date === r.work_date && ex.coil_number === r.coil_number && Math.abs(ex.weight - r.weight) < 0.1))
        .map(r => ({ ...r, management_no: `${r.product_name} | ${r.spec}`, company_id: 1 }));
      if (validData.length > 0) { await supabase.from('sales_records').insert(validData); alert(`✅ ${validData.length}건 저장 성공!`); }
      else alert("⚠️ 중복 데이터 제외 (0건 저장)");
      setRows([]); setPasteData(''); fetchMonthlyRecords();
    } catch (e) { alert("저장 실패: " + e.message); } finally { setLoading(false); }
  };

  // [기능 4] 인라인 수정 및 개별/전체 삭제
  const handleUpdate = async (id) => {
    await supabase.from('sales_records').update({ management_no: `${editFormData.product_name} | ${editFormData.spec}`, weight: editFormData.weight, total_price: editFormData.total_price, work_type: editFormData.work_type, customer_name: editFormData.customer_name }).eq('id', id);
    setEditingId(null); fetchMonthlyRecords();
  };
  const handleDelete = async (id) => { if (window.confirm('삭제할까요?')) { await supabase.from('sales_records').delete().eq('id', id); fetchMonthlyRecords(); } };
  const handleDeleteMonth = async () => { if (window.confirm('이 달의 모든 데이터를 삭제할까요?')) { await supabase.from('sales_records').delete().gte('work_date', `${selectedYear}-${selectedMonth}-01`).lte('work_date', `${selectedYear}-${selectedMonth}-31`); fetchMonthlyRecords(); } };

  return (
    <div style={styles.container}>
      <div style={styles.topSection}>
        <div style={styles.card}>
          <h3>📄 엑셀 붙여넣기</h3>
          <textarea style={styles.textArea} value={pasteData} onChange={e=>setPasteData(e.target.value)} />
          <button onClick={handlePasteProcess} style={styles.blueBtn}>데이터 분석</button>
        </div>
        <div style={styles.summaryCard}>
            <h3>📊 분석 요약</h3>
            {Object.entries(rows.reduce((a, c) => { a[c.work_type] = (a[c.work_type] || 0) + c.total_price; return a; }, {})).map(([k, v]) => <div key={k}>{k}: {v.toLocaleString()}원</div>)}
            <div style={styles.totalBox}>총합: {rows.reduce((a,b)=>a+b.total_price,0).toLocaleString()}원</div>
        </div>
      </div>
      {rows.length > 0 && <button onClick={handleSaveToDB} disabled={loading} style={styles.greenBtn}>{loading ? '처리 중...' : '중복 제외 고속 저장'}</button>}
      <div style={{...styles.card, marginTop:'20px'}}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
          <div style={{display:'flex', gap:'10px'}}>
            <select value={selectedYear} onChange={e=>setSelectedYear(Number(e.target.value))}><option value="2026">2026년</option><option value="2025">2025년</option></select>
            <select value={selectedMonth} onChange={e=>setSelectedMonth(Number(e.target.value))}>{Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}월</option>)}</select>
          </div>
          <button onClick={handleDeleteMonth} style={styles.dangerBtn}>🚨 월 데이터 삭제</button>
        </div>
        <table style={styles.table}>
          <thead><tr style={styles.thRow}><th>일자</th><th>업체</th><th>품명</th><th>중량</th><th>금액</th><th>구분</th><th>관리</th></tr></thead>
          <tbody>{monthlyRecords.map(r => (
            <tr key={r.id} style={styles.tr}>
              {editingId === r.id ? (
                <><td><input type="date" value={editFormData.work_date} onChange={e=>setEditFormData({...editFormData, work_date:e.target.value})}/></td><td><input value={editFormData.customer_name} onChange={e=>setEditFormData({...editFormData, customer_name:e.target.value})}/></td><td><input value={editFormData.product_name} onChange={e=>setEditFormData({...editFormData, product_name:e.target.value})}/></td><td><input value={editFormData.weight} onChange={e=>setEditFormData({...editFormData, weight:e.target.value})}/></td><td>{r.total_price?.toLocaleString()}</td><td>{r.work_type}</td><td><button onClick={()=>handleUpdate(r.id)}>저장</button></td></>
              ) : (
                <><td>{r.work_date}</td><td>{r.customer_name}</td><td>{r.product_name}</td><td>{r.weight?.toLocaleString()}</td><td style={{fontWeight:'bold'}}>{r.total_price?.toLocaleString()}</td><td>{r.work_type}</td><td><button onClick={()=>{setEditingId(r.id); setEditFormData(r);}}>수정</button> <button onClick={()=>handleDelete(r.id)}>삭제</button></td></>
              )}
            </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '20px' },
  topSection: { display: 'flex', gap: '20px', marginBottom:'20px' },
  card: { flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  summaryCard: { flex: 1, backgroundColor: '#ebf8ff', padding: '20px', borderRadius: '12px' },
  textArea: { width:'100%', height:'100px', borderRadius:'8px', border:'1px solid #ddd', padding:'10px' },
  blueBtn: { width:'100%', marginTop:'10px', padding: '10px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px' },
  greenBtn: { width: '100%', padding: '15px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' },
  totalBox: { marginTop: '10px', borderTop:'1px solid #bee3f8', fontWeight:'bold', textAlign:'right' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  thRow: { backgroundColor: '#f7fafc', textAlign: 'left' },
  tr: { borderBottom: '1px solid #edf2f7', height: '40px' },
  dangerBtn: { padding: '5px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '4px' }
};

export default WorkLog;