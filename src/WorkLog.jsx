import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

function WorkLog() {
  const [pasteData, setPasteData] = useState('');
  const [rows, setRows] = useState([]); // 분석 후 미리보기 데이터
  const [loading, setLoading] = useState(false);
  const [monthlyRecords, setMonthlyRecords] = useState([]); // DB에서 가져온 데이터
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const [editingId, setEditingId] = useState(null); 
  const [editFormData, setEditFormData] = useState({}); 

  const EQ_COLORS = { '슬리팅 1': '#3182ce', '슬리팅 2': '#805ad5', '레베링': '#38a169', '기타': '#718096' };

  useEffect(() => { fetchMonthlyRecords(); }, [selectedYear, selectedMonth]);

  // [기능 1] 월별 작업 내용 검색 (조회)
  const fetchMonthlyRecords = async () => {
    const start = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
    const end = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

    const { data, error } = await supabase.from('sales_records')
      .select('*').gte('work_date', start).lte('work_date', end)
      .order('work_date', { ascending: false });
    
    if (!error) {
      setMonthlyRecords(data?.map(r => {
        const [prod, spec] = r.management_no ? r.management_no.split(' | ') : ['', ''];
        return { ...r, product_name: prod, spec: spec };
      }) || []);
    }
  };

  // [기능 2] 엑셀 데이터 분석 및 요약 (검증용)
  const handlePasteProcess = () => {
    if (!pasteData.trim()) return alert("데이터를 먼저 붙여넣어 주세요.");
    const lines = pasteData.trim().split('\n').filter(l => !l.includes("생산일자") && l.trim());
    
    const parsed = lines.map((line, index) => {
      const cols = line.split(/\t| {2,}/).map(c => c.trim());
      if (cols.length < 5) return null;
      const rawType = cols[7]?.toUpperCase() || ''; 
      let workType = rawType.includes('SLITING2') ? '슬리팅 2' : rawType.includes('SLITING') ? '슬리팅 1' : rawType.includes('LEVELLING') ? '레베링' : '기타';
      
      return { 
        work_date: cols[0], customer_name: cols[1], product_name: cols[2], spec: cols[3],
        coil_number: cols[2], weight: Number(cols[4]?.replace(/,/g,'')), 
        unit_price: Number(cols[5]?.replace(/,/g,'')), total_price: Number(cols[6]?.replace(/,/g,'')), 
        work_type: workType 
      };
    }).filter(r => r !== null);

    setRows(parsed);
    alert(`분석 완료: 총 ${parsed.length}건\n총 금액을 확인하신 후 저장 버튼을 눌러주세요.`);
  };

  // [기능 3] DB 입력 작업 (UPSERT 적용으로 중복 에러 해결)
  const handleSaveToDB = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    try {
      const dbData = rows.map(r => ({
        work_date: r.work_date, customer_name: r.customer_name,
        management_no: `${r.product_name} | ${r.spec}`,
        coil_number: r.coil_number, weight: r.weight, unit_price: r.unit_price,
        total_price: r.total_price, work_type: r.work_type, company_id: 1 
      }));

      const { error } = await supabase.from('sales_records').upsert(dbData);
      if (error) throw error;

      alert(`✅ 성공: ${dbData.length}건의 데이터가 DB에 저장되었습니다.`);
      setRows([]); setPasteData(''); fetchMonthlyRecords();
    } catch (e) { alert("❌ 저장 실패: " + e.message); } finally { setLoading(false); }
  };

  // [기능 4] 인라인 수정 및 삭제 기능
  const handleInlineSave = async (id) => {
    const { error } = await supabase.from('sales_records').update({
      management_no: `${editFormData.product_name} | ${editFormData.spec}`,
      weight: Number(editFormData.weight), total_price: Number(editFormData.total_price),
      work_type: editFormData.work_type, work_date: editFormData.work_date, customer_name: editFormData.customer_name
    }).eq('id', id);
    if (!error) { setEditingId(null); fetchMonthlyRecords(); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("이 항목을 삭제하시겠습니까?")) {
      await supabase.from('sales_records').delete().eq('id', id);
      fetchMonthlyRecords();
    }
  };

  const handleDeleteMonth = async () => {
    if (window.confirm(`${selectedMonth}월 데이터를 전부 삭제하시겠습니까?`)) {
      const start = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
      const end = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
      await supabase.from('sales_records').delete().gte('work_date', start).lte('work_date', end);
      fetchMonthlyRecords();
    }
  };

  const summary = rows.reduce((acc, cur) => { acc[cur.work_type] = (acc[cur.work_type] || 0) + cur.total_price; return acc; }, {});

  return (
    <div style={styles.container}>
      <div style={styles.topSection}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📄 매출 엑셀 붙여넣기</h3>
          <textarea style={styles.textArea} value={pasteData} onChange={e=>setPasteData(e.target.value)} placeholder="엑셀 복사 -> 붙여넣기" />
          <button onClick={handlePasteProcess} style={styles.blueBtn}>1. 데이터 분석 및 요약 확인</button>
        </div>
        <div style={styles.summaryCard}>
            <h3 style={styles.cardTitle}>📊 분석 요약 (DB 저장 전)</h3>
            {Object.entries(summary).map(([k, v]) => <div key={k}>{k}: {v.toLocaleString()}원</div>)}
            <div style={styles.totalBox}>총합: {rows.reduce((a,b)=>a+b.total_price,0).toLocaleString()}원</div>
        </div>
      </div>

      {rows.length > 0 && (
        <button onClick={handleSaveToDB} disabled={loading} style={styles.greenBtn}>
          {loading ? 'DB 전송 중...' : `2. 총 ${rows.length}건 DB 저장 실행`}
        </button>
      )}

      <div style={{...styles.card, marginTop:'20px'}}>
        <div style={styles.tableHeader}>
          <h3 style={styles.cardTitle}>📅 {selectedYear}년 {selectedMonth}월 작업 데이터 ({monthlyRecords.length}건)</h3>
          <div style={{display:'flex', gap:'10px'}}>
            <select value={selectedYear} onChange={e=>setSelectedYear(Number(e.target.value))} style={styles.select}><option value="2026">2026년</option><option value="2025">2025년</option></select>
            <select value={selectedMonth} onChange={e=>setSelectedMonth(Number(e.target.value))} style={styles.select}>{Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}월</option>)}</select>
            <button onClick={handleDeleteMonth} style={styles.dangerBtn}>🚨 월 전체 삭제</button>
          </div>
        </div>
        <table style={styles.table}>
          <thead><tr style={styles.thRow}><th>일자</th><th>업체</th><th>품명</th><th>금액</th><th>구분</th><th>관리</th></tr></thead>
          <tbody>
            {monthlyRecords.map(r => (
              <tr key={r.id} style={styles.tr}>
                {editingId === r.id ? (
                  <><td><input type="date" value={editFormData.work_date} onChange={e=>setEditFormData({...editFormData, work_date:e.target.value})}/></td><td><input value={editFormData.customer_name} onChange={e=>setEditFormData({...editFormData, customer_name:e.target.value})}/></td><td><input value={editFormData.product_name} onChange={e=>setEditFormData({...editFormData, product_name:e.target.value})}/></td><td><input value={editFormData.total_price} onChange={e=>setEditFormData({...editFormData, total_price:e.target.value})}/></td><td><select value={editFormData.work_type} onChange={e=>setEditFormData({...editFormData, work_type:e.target.value})}><option value="슬리팅 1">슬리팅 1</option><option value="슬리팅 2">슬리팅 2</option><option value="레베링">레베링</option></select></td><td><button onClick={()=>handleInlineSave(r.id)}>저장</button></td></>
                ) : (
                  <><td>{r.work_date}</td><td>{r.customer_name}</td><td>{r.product_name}</td><td style={{fontWeight:'bold'}}>{r.total_price?.toLocaleString()}원</td><td><span style={{...styles.badge, backgroundColor:EQ_COLORS[r.work_type]}}>{r.work_type}</span></td><td><button onClick={()=>{setEditingId(r.id); setEditFormData(r);}}>수정</button> <button onClick={()=>handleDelete(r.id)}>삭제</button></td></>
                )}
              </tr>
            ))}
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
  cardTitle: { margin: '0 0 15px 0', fontSize: '18px', fontWeight:'bold' },
  textArea: { width:'100%', height:'120px', padding:'10px', borderRadius:'8px', border:'1px solid #ddd' },
  blueBtn: { width:'100%', marginTop:'10px', padding: '10px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor:'pointer' },
  greenBtn: { width: '100%', padding: '15px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize:'16px', cursor:'pointer' },
  totalBox: { marginTop: '15px', borderTop:'1px solid #bee3f8', fontWeight:'bold', fontSize:'18px', textAlign:'right' },
  tableHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  thRow: { backgroundColor: '#f7fafc', textAlign: 'left' },
  tr: { borderBottom: '1px solid #edf2f7', height: '40px' },
  badge: { padding: '2px 8px', color: 'white', borderRadius: '4px', fontSize: '11px' },
  dangerBtn: { padding: '5px 10px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '4px', cursor:'pointer' },
  select: { padding: '5px' }
};

export default WorkLog;