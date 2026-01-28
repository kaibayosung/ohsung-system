import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function WorkLog() {
  const [pasteData, setPasteData] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => { fetchMonthlyRecords(); }, [selectedYear, selectedMonth]);

  const fetchMonthlyRecords = async () => {
    const yearStr = selectedYear.toString();
    const monthStr = selectedMonth.toString().padStart(2, '0');
    const startDate = `${yearStr}-${monthStr}-01`;
    const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

    const { data } = await supabase.from('sales_records')
      .select('*, companies(name)')
      .gte('work_date', startDate)
      .lte('work_date', endDate)
      .order('work_date', { ascending: false })
      .order('created_at', { ascending: false });
    
    const formattedData = data?.map(r => {
      const [prod, spec] = r.management_no ? r.management_no.split(' | ') : ['', ''];
      return { ...r, product_name: prod || '', spec: spec || '' };
    }) || [];

    setMonthlyRecords(formattedData);
  };

  const handleEditClick = (record) => {
    setEditingId(record.id);
    setEditFormData({ ...record });
  };

  const handleInlineSave = async (id) => {
    setLoading(true);
    try {
      const combinedName = `${editFormData.product_name} | ${editFormData.spec}`;
      const { error } = await supabase.from('sales_records').update({
        management_no: combinedName,
        weight: Number(editFormData.weight),
        unit_price: Number(editFormData.unit_price),
        total_price: Number(editFormData.total_price),
        work_type: editFormData.work_type,
        work_date: editFormData.work_date
      }).eq('id', id);

      if (error) throw error;
      alert("수정되었습니다.");
      setEditingId(null);
      fetchMonthlyRecords();
    } catch (e) {
      alert("수정 실패: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMonth = async () => {
    if (!window.confirm(`${selectedYear}년 ${selectedMonth}월 데이터를 전부 삭제하시겠습니까?`)) return;
    setLoading(true);
    const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
    const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
    await supabase.from('sales_records').delete().gte('work_date', startDate).lte('work_date', endDate);
    alert("삭제 완료"); fetchMonthlyRecords(); setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("이 내역을 삭제하시겠습니까?")) return;
    const { error } = await supabase.from('sales_records').delete().eq('id', id);
    if (error) alert("삭제 실패: " + error.message); else fetchMonthlyRecords();
  };

  const handlePasteProcess = () => {
    if (!pasteData.trim()) return alert("데이터를 먼저 붙여넣어 주세요.");
    const lines = pasteData.trim().split('\n');
    const dataLines = lines.filter(line => !line.includes("생산일자") && line.trim() !== "");
    const parsed = dataLines.map((line, index) => {
      const cols = line.split('\t');
      const rawType = cols[7]?.toUpperCase().trim() || '';
      let workType = '기타';
      if (rawType.includes('SLITING2')) workType = '슬리팅 2';
      else if (rawType.includes('SLITING')) workType = '슬리팅 1';
      else if (rawType.includes('LEVELLING')) workType = '레베링';
      
      return { 
        id: Date.now() + index, 
        work_date: cols[0] || new Date().toISOString().split('T')[0], 
        company_name: cols[1] || '', 
        product_name: cols[2] || '', 
        spec: cols[3] || '', 
        weight: Number(cols[4]?.replace(/,/g,'')) || 0, 
        unit_price: Number(cols[5]?.replace(/,/g,'')) || 0, 
        total_price: Number(cols[6]?.replace(/,/g,'')) || 0, 
        work_type: workType 
      };
    });
    setRows(parsed);
  };

  // --- [핵심 수정 부분] 중복 체크 기능이 추가된 저장 함수 ---
  const handleSaveToDB = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    
    try {
      const { data: companies } = await supabase.from('companies').select('id, name');
      
      // 1. 저장할 데이터 준비
      const preparedData = rows.map(r => ({
        work_date: r.work_date,
        company_id: companies.find(c => c.name.trim() === r.company_name.trim())?.id || 1,
        management_no: `${r.product_name} | ${r.spec}`,
        weight: r.weight,
        unit_price: r.unit_price,
        total_price: r.total_price,
        work_type: r.work_type
      }));

      // 2. DB에 이미 있는 데이터와 대조 (하나씩 체크)
      let duplicates = [];
      for (const item of preparedData) {
        const { data: existing } = await supabase
          .from('sales_records')
          .select('id')
          .match({
            work_date: item.work_date,
            company_id: item.company_id,
            management_no: item.management_no,
            weight: item.weight
          })
          .maybeSingle();

        if (existing) {
          const companyName = companies.find(c => c.id === item.company_id)?.name;
          duplicates.push(`${item.work_date} | ${companyName} | ${item.management_no} | ${item.weight}kg`);
        }
      }

      // 3. 중복 발견 시 알림 후 중단
      if (duplicates.length > 0) {
        alert(`⚠️ 중복 데이터가 발견되어 저장이 중단되었습니다.\n\n[중복 내역]\n${duplicates.join('\n')}\n\n이미 등록된 내역인지 확인해 주세요.`);
        setLoading(false);
        return;
      }

      // 4. 중복이 없을 때만 저장 실행
      const { error } = await supabase.from('sales_records').insert(preparedData);
      if (error) throw error;
      
      alert("성공적으로 저장되었습니다.");
      setRows([]); setPasteData(''); fetchMonthlyRecords();
    } catch (err) { 
      alert("저장 실패: " + err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const summary = rows.reduce((acc, cur) => { acc[cur.work_type] = (acc[cur.work_type] || 0) + cur.total_price; return acc; }, {});

  return (
    <div style={styles.container}>
      <div style={styles.topSection}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📄 매출 엑셀 붙여넣기</h3>
          <textarea className="excel-input" value={pasteData} onChange={e=>setPasteData(e.target.value)} placeholder="엑셀 복사 -> 붙여넣기" style={styles.textarea} />
          <button onClick={handlePasteProcess} style={styles.blueBtn}>데이터 분석 실행</button>
        </div>
        <div style={styles.summaryCard}>
           <h3 style={styles.cardTitle}>📊 실시간 요약 (분석중)</h3>
           {Object.entries(summary).map(([k, v]) => <div key={k}>{k}: {v.toLocaleString()}원</div>)}
           <div style={styles.totalBox}>총합: {rows.reduce((a,b)=>a+b.total_price,0).toLocaleString()}원</div>
        </div>
      </div>

      {rows.length > 0 && <div style={styles.card}><button onClick={handleSaveToDB} disabled={loading} style={styles.greenBtn}>{loading ? '중복 데이터 검사 중...' : 'DB에 저장하기'}</button></div>}

      <div style={{...styles.card, marginTop:'20px', backgroundColor:'#f8fafc'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
          <h3 style={styles.cardTitle}>📅 {selectedYear}년 {selectedMonth}월 작업 데이터 ({monthlyRecords.length}건)</h3>
          <div style={{display:'flex', gap:'10px'}}>
            <select value={selectedYear} onChange={e=>setSelectedYear(e.target.value)} style={styles.select}><option value="2026">2026년</option><option value="2025">2025년</option></select>
            <select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} style={styles.select}>{Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}월</option>)}</select>
            <button onClick={handleDeleteMonth} style={styles.dangerBtn}>🚨 전체 삭제</button>
          </div>
        </div>
        
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th>일자</th><th>업체</th><th>품명</th><th>규격</th><th>중량</th><th>단가</th><th>금액</th><th>구분</th><th>관리</th>
              </tr>
            </thead>
            <tbody>
              {monthlyRecords.map(r => (
                <tr key={r.id} style={styles.tr}>
                  {editingId === r.id ? (
                    <>
                      <td><input type="date" value={editFormData.work_date} onChange={e=>setEditFormData({...editFormData, work_date:e.target.value})} style={styles.inlineInput}/></td>
                      <td>{r.companies?.name}</td>
                      <td><input type="text" value={editFormData.product_name} onChange={e=>setEditFormData({...editFormData, product_name:e.target.value})} style={styles.inlineInput}/></td>
                      <td><input type="text" value={editFormData.spec} onChange={e=>setEditFormData({...editFormData, spec:e.target.value})} style={styles.inlineInput}/></td>
                      <td><input type="number" value={editFormData.weight} onChange={e=>setEditFormData({...editFormData, weight:e.target.value})} style={styles.inlineInput}/></td>
                      <td><input type="number" value={editFormData.unit_price} onChange={e=>setEditFormData({...editFormData, unit_price:e.target.value})} style={styles.inlineInput}/></td>
                      <td><input type="number" value={editFormData.total_price} onChange={e=>setEditFormData({...editFormData, total_price:e.target.value})} style={styles.inlineInput}/></td>
                      <td>
                        <select value={editFormData.work_type} onChange={e=>setEditFormData({...editFormData, work_type:e.target.value})} style={styles.inlineInput}>
                          <option value="슬리팅 1">슬리팅 1</option><option value="슬리팅 2">슬리팅 2</option><option value="레베링">레베링</option><option value="기타">기타</option>
                        </select>
                      </td>
                      <td>
                        <button onClick={()=>handleInlineSave(r.id)} style={styles.saveBtn}>저장</button>
                        <button onClick={()=>{setEditingId(null)}} style={styles.cancelBtn}>취소</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{r.work_date}</td>
                      <td>{r.companies?.name}</td>
                      <td style={{fontWeight:'500'}}>{r.product_name}</td>
                      <td style={{color:'#666'}}>{r.spec}</td>
                      <td>{r.weight.toLocaleString()}</td>
                      <td>{r.unit_price.toLocaleString()}</td>
                      <td style={{fontWeight:'bold', color:'#2b6cb0'}}>{r.total_price.toLocaleString()}</td>
                      <td><span style={styles.badge}>{r.work_type}</span></td>
                      <td>
                        <button onClick={()=>handleEditClick(r)} style={styles.editBtn}>수정</button>
                        <button onClick={()=>handleDelete(r.id)} style={styles.deleteBtn}>삭제</button>
                      </td>
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
  textarea: { width: '100%', height: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '10px', boxSizing: 'border-box' },
  blueBtn: { width:'100%', padding: '10px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  greenBtn: { width: '100%', padding: '12px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  totalBox: { marginTop: '15px', paddingTop:'10px', borderTop:'1px solid #bee3f8', fontWeight:'bold', fontSize:'18px', textAlign:'right' },
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