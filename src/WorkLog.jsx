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

    const { data } = await supabase.from('sales_records')
      .select('*').gte('work_date', start).lte('work_date', end)
      .order('work_date', { ascending: false }).order('created_at', { ascending: false });
    
    setMonthlyRecords(data?.map(r => {
      const [prod, spec] = r.management_no ? r.management_no.split(' | ') : ['', ''];
      return { ...r, product_name: prod || '', spec: spec || '' };
    }) || []);
  };

  const handleEditClick = (record) => { setEditingId(record.id); setEditFormData({ ...record }); };

  const handleInlineSave = async (id) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('sales_records').update({
        management_no: `${editFormData.product_name} | ${editFormData.spec}`,
        coil_number: editFormData.coil_number,
        weight: Number(editFormData.weight),
        unit_price: Number(editFormData.unit_price),
        total_price: Number(editFormData.total_price),
        work_type: editFormData.work_type,
        work_date: editFormData.work_date,
        customer_name: editFormData.customer_name,
        company_id: 1 
      }).eq('id', id);
      if (error) throw error;
      alert("수정되었습니다."); setEditingId(null); fetchMonthlyRecords();
    } catch (e) { alert("수정 실패: " + e.message); } finally { setLoading(false); }
  };

  const handleDeleteMonth = async () => {
    if (!window.confirm("이 달의 데이터를 전부 삭제하시겠습니까?")) return;
    setLoading(true);
    const start = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
    const end = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
    await supabase.from('sales_records').delete().gte('work_date', start).lte('work_date', end);
    alert("삭제 완료"); fetchMonthlyRecords(); setLoading(false);
  };

  const handlePasteProcess = () => {
    if (!pasteData.trim()) return alert("데이터를 먼저 붙여넣어 주세요.");
    const lines = pasteData.trim().split('\n').filter(line => !line.includes("생산일자") && line.trim() !== "");
    const parsed = lines.map((line, index) => {
      const cols = line.split(/\t| {2,}/).map(c => c.trim());
      if (cols.length < 5) return null;
      const rawType = cols[7]?.toUpperCase() || ''; 
      let workType = rawType.includes('SLITING2') ? '슬리팅 2' : rawType.includes('SLITING') ? '슬리팅 1' : rawType.includes('LEVELLING') ? '레베링' : '기타';
      return { 
        work_date: cols[0], customer_name: cols[1] || '', 
        product_name: cols[2] || '', spec: cols[3] || '', coil_number: cols[2] || '', 
        weight: Number(cols[4]?.replace(/,/g,'')) || 0, 
        unit_price: Number(cols[5]?.replace(/,/g,'')) || 0, 
        total_price: Number(cols[6]?.replace(/,/g,'')) || 0, work_type: workType 
      };
    }).filter(r => r !== null);
    setRows(parsed);
  };

  // --- [개선된 초고속 저장 로직] ---
  const handleSaveToDB = async () => {
    if (rows.length === 0) return;
    setLoading(true);

    try {
      // 1. 붙여넣은 데이터의 날짜 범위를 한 번에 가져와서 중복 체크 준비
      const dates = rows.map(r => r.work_date);
      const minDate = dates.reduce((a, b) => a < b ? a : b);
      const maxDate = dates.reduce((a, b) => a > b ? a : b);

      const { data: existingRecords } = await supabase.from('sales_records')
        .select('work_date, coil_number, weight')
        .gte('work_date', minDate).lte('work_date', maxDate);

      // 2. 메모리 상에서 광속으로 중복 제외 필터링
      const validData = rows.filter(r => {
        return !existingRecords?.some(ex => 
          ex.work_date === r.work_date && 
          ex.coil_number === r.coil_number && 
          Number(ex.weight) === Number(r.weight)
        );
      }).map(r => ({
        work_date: r.work_date,
        customer_name: r.customer_name,
        management_no: `${r.product_name} | ${r.spec}`,
        coil_number: r.coil_number,
        weight: Number(r.weight),
        unit_price: Number(r.unit_price),
        total_price: Number(r.total_price),
        work_type: r.work_type,
        company_id: 1 
      }));

      // 3. 한 번의 요청으로 벌크(Bulk) 저장
      if (validData.length > 0) {
        const { error } = await supabase.from('sales_records').insert(validData);
        if (error) throw error;
        alert(`✅ ${validData.length}건 저장 완료!`);
      } else {
        alert("⚠️ 이미 저장된 데이터이거나 중복된 항목뿐입니다.");
      }

      setRows([]); setPasteData(''); fetchMonthlyRecords();
    } catch (err) {
      alert("저장 실패: " + err.message);
    } finally { setLoading(false); }
  };

  const summary = rows.reduce((acc, cur) => { acc[cur.work_type] = (acc[cur.work_type] || 0) + cur.total_price; return acc; }, {});

  return (
    <div style={styles.container}>
      <div style={styles.topSection}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📄 매출 엑셀 붙여넣기</h3>
          <textarea style={styles.textArea} value={pasteData} onChange={e=>setPasteData(e.target.value)} placeholder="엑셀 복사 -> 붙여넣기" />
          <button onClick={handlePasteProcess} style={styles.blueBtn}>데이터 분석 실행</button>
        </div>
        <div style={styles.summaryCard}>
            <h3 style={styles.cardTitle}>📊 분석 요약</h3>
            {Object.entries(summary).map(([k, v]) => <div key={k}>{k}: {v.toLocaleString()}원</div>)}
            <div style={styles.totalBox}>총합: {rows.reduce((a,b)=>a+b.total_price,0).toLocaleString()}원</div>
        </div>
      </div>

      {rows.length > 0 && (
        <div style={styles.card}>
          <button onClick={handleSaveToDB} disabled={loading} style={styles.greenBtn}>
            {loading ? '중복 체크 및 고속 저장 중...' : `중복 제외하고 ${rows.length}건 즉시 저장`}
          </button>
        </div>
      )}

      <div style={{...styles.card, marginTop:'20px', backgroundColor:'#f8fafc'}}>
        <div style={styles.tableHeader}>
          <h3 style={styles.cardTitle}>📅 {selectedYear}년 {selectedMonth}월 ({monthlyRecords.length}건)</h3>
          <div style={{display:'flex', gap:'10px'}}>
            <select value={selectedYear} onChange={e=>setSelectedYear(e.target.value)} style={styles.select}><option value="2026">2026년</option><option value="2025">2025년</option></select>
            <select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} style={styles.select}>{Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}월</option>)}</select>
            <button onClick={handleDeleteMonth} style={styles.dangerBtn}>🚨 월 전체 삭제</button>
          </div>
        </div>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead><tr style={styles.thRow}><th>일자</th><th>업체</th><th>품명</th><th>규격</th><th>코일번호</th><th>중량</th><th>단가</th><th>금액</th><th>구분</th><th>관리</th></tr></thead>
            <tbody>
              {monthlyRecords.map(r => (
                <tr key={r.id} style={styles.tr}>
                  {editingId === r.id ? (
                    <>
                      <td><input type="date" value={editFormData.work_date} onChange={e=>setEditFormData({...editFormData, work_date:e.target.value})} style={styles.inlineInput}/></td>
                      <td><input type="text" value={editFormData.customer_name} onChange={e=>setEditFormData({...editFormData, customer_name:e.target.value})} style={styles.inlineInput}/></td>
                      <td><input type="text" value={editFormData.product_name} onChange={e=>setEditFormData({...editFormData, product_name:e.target.value})} style={styles.inlineInput}/></td>
                      <td><input type="text" value={editFormData.spec} onChange={e=>setEditFormData({...editFormData, spec:e.target.value})} style={styles.inlineInput}/></td>
                      <td><input type="text" value={editFormData.coil_number} onChange={e=>setEditFormData({...editFormData, coil_number:e.target.value})} style={styles.inlineInput}/></td>
                      <td><input type="number" value={editFormData.weight} onChange={e=>setEditFormData({...editFormData, weight:e.target.value})} style={styles.inlineInput}/></td>
                      <td><input type="number" value={editFormData.unit_price} onChange={e=>setEditFormData({...editFormData, unit_price:e.target.value})} style={styles.inlineInput}/></td>
                      <td><input type="number" value={editFormData.total_price} onChange={e=>setEditFormData({...editFormData, total_price:e.target.value})} style={styles.inlineInput}/></td>
                      <td><select value={editFormData.work_type} onChange={e=>setEditFormData({...editFormData, work_type:e.target.value})} style={styles.inlineInput}><option value="슬리팅 1">슬리팅 1</option><option value="슬리팅 2">슬리팅 2</option><option value="레베링">레베링</option><option value="기타">기타</option></select></td>
                      <td><button onClick={()=>handleInlineSave(r.id)} style={styles.saveBtn}>저장</button><button onClick={()=>setEditingId(null)} style={styles.cancelBtn}>취소</button></td>
                    </>
                  ) : (
                    <>
                      <td>{r.work_date}</td><td>{r.customer_name}</td><td style={{fontWeight:'500'}}>{r.product_name}</td><td style={{color:'#666'}}>{r.spec}</td><td>{r.coil_number}</td><td>{r.weight?.toLocaleString()}</td><td>{r.unit_price?.toLocaleString()}</td><td style={{fontWeight:'bold', color:'#2b6cb0'}}>{r.total_price?.toLocaleString()}</td><td><span style={styles.badge}>{r.work_type}</span></td><td><button onClick={()=>handleEditClick(r)} style={styles.editBtn}>수정</button><button onClick={()=> {if(window.confirm('삭제할까요?')) {supabase.from('sales_records').delete().eq('id', r.id).then(()=>fetchMonthlyRecords())}}} style={styles.deleteBtn}>삭제</button></td>
                    </>
                  )}
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
  container: { padding: '20px', overflowY:'auto' },
  topSection: { display: 'flex', gap: '20px', marginBottom:'20px' },
  card: { flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  summaryCard: { flex: 1, backgroundColor: '#ebf8ff', padding: '20px', borderRadius: '12px' },
  cardTitle: { margin: '0 0 15px 0', fontSize: '18px', fontWeight:'bold' },
  textArea: { width:'100%', height:'120px', borderRadius:'8px', border:'1px solid #ddd', padding:'10px' },
  blueBtn: { width:'100%', marginTop:'10px', padding: '10px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  greenBtn: { width: '100%', padding: '15px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize:'16px' },
  totalBox: { marginTop: '15px', paddingTop:'10px', borderTop:'1px solid #bee3f8', fontWeight:'bold', fontSize:'18px', textAlign:'right' },
  tableHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  thRow: { backgroundColor: '#f7fafc', textAlign: 'left' },
  tr: { borderBottom: '1px solid #edf2f7', height: '45px' },
  badge: { padding: '2px 6px', backgroundColor: '#bee3f8', color: '#2b6cb0', borderRadius: '4px', fontSize: '11px' },
  editBtn: { padding: '4px 8px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' },
  deleteBtn: { padding: '4px 8px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  saveBtn: { padding: '4px 8px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' },
  cancelBtn: { padding: '4px 8px', backgroundColor: '#a0aec0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  inlineInput: { width: '90%', padding: '5px', border: '1px solid #3182ce', borderRadius: '4px', fontSize: '13px' },
  select: { padding: '5px', borderRadius: '4px', border: '1px solid #ddd' },
  dangerBtn: { padding: '5px 10px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold' }
};

export default WorkLog;