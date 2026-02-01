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

  // [기능] 월간 데이터 로딩 및 관리번호 분리
  const fetchMonthlyRecords = async () => {
    const start = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
    const end = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

    const { data } = await supabase.from('sales_records')
      .select('*')
      .gte('work_date', start)
      .lte('work_date', end)
      .order('work_date', { ascending: false });
    
    setMonthlyRecords(data?.map(r => ({
      ...r,
      product_name: r.management_no ? r.management_no.split(' | ')[0] : '',
      spec: r.management_no ? r.management_no.split(' | ')[1] : ''
    })) || []);
  };

  // [기능] 엑셀 데이터 분석 (탭 분리 로직)
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
        unit_price: Number(cols[5]?.replace(/,/g,'')), total_price: Number(cols[6]?.replace(/,/g,'')), work_type: workType 
      };
    }).filter(r => r !== null);
    setRows(parsed);
  };

  // --- [1단계 디버깅] 한 건씩 입력하며 중복 원인 파악 ---
  const handleSaveToDB = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    console.log("🚀 디버깅 시작: 총", rows.length, "건 처리 시도");

    for (const r of rows) {
      const { error } = await supabase.from('sales_records').insert([{
        work_date: r.work_date,
        customer_name: r.customer_name,
        management_no: `${r.product_name} | ${r.spec}`,
        coil_number: r.coil_number,
        weight: r.weight,
        unit_price: r.unit_price,
        total_price: r.total_price,
        work_type: r.work_type,
        company_id: 1 // 제약조건 에러 방지용 기본값
      }]);

      if (error) {
        // 이미 있는 데이터면 여기서 에러가 찍힙니다.
        console.error("❌ 저장 실패 항목:", r.work_date, r.coil_number, error.message);
        failCount++;
      } else {
        successCount++;
      }
    }

    alert(`[1단계 테스트 결과]\n성공: ${successCount}건\n실패(중복 등): ${failCount}건\n\n성공한 데이터는 아래 표에서 확인 가능합니다.`);
    setRows([]);
    setPasteData('');
    setLoading(false);
    fetchMonthlyRecords();
  };

  const handleInlineSave = async (id) => {
    const combinedName = `${editFormData.product_name} | ${editFormData.spec}`;
    await supabase.from('sales_records').update({ management_no: combinedName, weight: Number(editFormData.weight), total_price: Number(editFormData.total_price), work_type: editFormData.work_type, work_date: editFormData.work_date, customer_name: editFormData.customer_name }).eq('id', id);
    setEditingId(null); fetchMonthlyRecords();
  };

  const handleDelete = async (id) => {
    if (window.confirm("삭제하시겠습니까?")) {
      await supabase.from('sales_records').delete().eq('id', id);
      fetchMonthlyRecords();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.topSection}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📄 작업 일보 엑셀 붙여넣기 (디버깅 모드)</h3>
          <textarea style={styles.textArea} value={pasteData} onChange={e=>setPasteData(e.target.value)} placeholder="엑셀 복사 -> 붙여넣기" />
          <button onClick={handlePasteProcess} style={styles.blueBtn}>데이터 분석 실행</button>
        </div>
        <div style={styles.summaryCard}>
            <h3 style={styles.cardTitle}>📊 분석 요약</h3>
            {Object.entries(rows.reduce((acc, cur) => { acc[cur.work_type] = (acc[cur.work_type] || 0) + cur.total_price; return acc; }, {})).map(([k, v]) => <div key={k}>{k}: {v.toLocaleString()}원</div>)}
            <div style={styles.totalBox}>총합: {rows.reduce((a,b)=>a+b.total_price,0).toLocaleString()}원</div>
        </div>
      </div>

      {rows.length > 0 && (
        <button onClick={handleSaveToDB} disabled={loading} style={styles.greenBtn}>
          {loading ? '한 건씩 체크하며 저장 중...' : `${rows.length}건 디버깅 저장 시작`}
        </button>
      )}

      <div style={{...styles.card, marginTop:'20px'}}>
        <div style={styles.tableHeader}>
          <h3 style={styles.cardTitle}>📅 {selectedMonth}월 데이터 ({monthlyRecords.length}건)</h3>
          <select value={selectedMonth} onChange={e=>setSelectedMonth(Number(e.target.value))} style={styles.select}>
            {Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}월</option>)}
          </select>
        </div>
        <table style={styles.table}>
          <thead><tr style={styles.thRow}><th>일자</th><th>업체</th><th>품명</th><th>중량</th><th>금액</th><th>구분</th><th>관리</th></tr></thead>
          <tbody>
            {monthlyRecords.map(r => (
              <tr key={r.id} style={styles.tr}>
                {editingId === r.id ? (
                  <><td><input type="date" value={editFormData.work_date} onChange={e=>setEditFormData({...editFormData, work_date:e.target.value})}/></td><td><input value={editFormData.customer_name} onChange={e=>setEditFormData({...editFormData, customer_name:e.target.value})}/></td><td><input value={editFormData.product_name} onChange={e=>setEditFormData({...editFormData, product_name:e.target.value})}/></td><td><input value={editFormData.weight} onChange={e=>setEditFormData({...editFormData, weight:e.target.value})}/></td><td>{r.total_price?.toLocaleString()}</td><td>{r.work_type}</td><td><button onClick={()=>handleInlineSave(r.id)}>저장</button></td></>
                ) : (
                  <><td>{r.work_date}</td><td>{r.customer_name}</td><td>{r.product_name}</td><td>{r.weight?.toLocaleString()}</td><td style={{fontWeight:'bold'}}>{r.total_price?.toLocaleString()}</td><td>{r.work_type}</td><td><button onClick={()=>{setEditingId(r.id); setEditFormData(r);}}>수정</button> <button onClick={()=>handleDelete(r.id)}>삭제</button></td></>
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
  textArea: { width:'100%', height:'150px', borderRadius:'8px', border:'1px solid #ddd', padding:'10px', marginBottom:'10px' },
  blueBtn: { width:'100%', padding: '10px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  greenBtn: { width: '100%', padding: '15px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginBottom:'20px' },
  totalBox: { marginTop: '10px', borderTop:'1px solid #bee3f8', fontWeight:'bold', textAlign:'right', fontSize:'18px' },
  tableHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  thRow: { backgroundColor: '#f7fafc', textAlign: 'left' },
  tr: { borderBottom: '1px solid #edf2f7', height: '40px' },
  select: { padding: '5px' }
};

export default WorkLog;