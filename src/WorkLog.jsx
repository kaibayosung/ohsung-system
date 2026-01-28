import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function WorkLog() {
  const [pasteData, setPasteData] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

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
    setMonthlyRecords(data || []);
  };

  // [신규] 월별 데이터 일괄 삭제 함수
  const handleDeleteMonth = async () => {
    if (!window.confirm(`🚨 경고: ${selectedYear}년 ${selectedMonth}월의 모든 매출 데이터를 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다!`)) return;
    
    setLoading(true);
    try {
      const yearStr = selectedYear.toString();
      const monthStr = selectedMonth.toString().padStart(2, '0');
      const startDate = `${yearStr}-${monthStr}-01`;
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

      const { error, count } = await supabase.from('sales_records')
        .delete({ count: 'exact' })
        .gte('work_date', startDate)
        .lte('work_date', endDate);

      if (error) throw error;
      alert(`${selectedYear}년 ${selectedMonth}월 데이터 총 ${count}건이 삭제되었습니다.`);
      fetchMonthlyRecords(); // 목록 새로고침
    } catch (e) {
      alert("삭제 실패: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("이 내역을 정말 삭제하시겠습니까?")) return;
    const { error } = await supabase.from('sales_records').delete().eq('id', id);
    if (error) alert("삭제 실패: " + error.message); else fetchMonthlyRecords();
  };

  const handleEditClick = (record) => { setEditingRecord({ ...record }); setIsEditModalOpen(true); };

  const handleUpdate = async () => {
    if (!editingRecord) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('sales_records').update({
        weight: editingRecord.weight, unit_price: editingRecord.unit_price, total_price: editingRecord.total_price, work_type: editingRecord.work_type
      }).eq('id', editingRecord.id);
      if (error) throw error;
      alert("수정되었습니다."); setIsEditModalOpen(false); setEditingRecord(null); fetchMonthlyRecords();
    } catch (e) { alert("수정 실패: " + e.message); } finally { setLoading(false); }
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
      return { id: Date.now() + index, work_date: cols[0] || new Date().toISOString().split('T')[0], company_name: cols[1] || '', product_name: cols[2] || '', spec: cols[3] || '', weight: Number(cols[4]?.replace(/,/g,'')) || 0, unit_price: Number(cols[5]?.replace(/,/g,'')) || 0, total_price: Number(cols[6]?.replace(/,/g,'')) || 0, work_type: workType };
    });
    setRows(parsed);
  };

  const handleSaveToDB = async () => {
    if (rows.length === 0) return alert("저장할 데이터가 없습니다.");
    setLoading(true);
    try {
      const { data: companies } = await supabase.from('companies').select('id, name');
      const preparedData = rows.map(r => ({
        work_date: r.work_date,
        company_id: companies.find(c => c.name.trim() === r.company_name.trim())?.id || 1,
        management_no: `${r.product_name} | ${r.spec}`,
        weight: r.weight,
        unit_price: r.unit_price,
        total_price: r.total_price,
        work_type: r.work_type
      }));
      const involvedDates = [...new Set(preparedData.map(r => r.work_date))];
      const { data: existingRecords } = await supabase.from('sales_records').select('work_date, company_id, management_no, total_price, work_type').in('work_date', involvedDates);
      const existingSignatures = new Set(existingRecords.map(r => `${r.work_date}-${r.company_id}-${r.management_no}-${r.total_price}-${r.work_type}`));
      const finalUploadData = preparedData.filter(r => !existingSignatures.has(`${r.work_date}-${r.company_id}-${r.management_no}-${r.total_price}-${r.work_type}`));

      if (finalUploadData.length === 0) { alert("모든 데이터가 이미 DB에 존재합니다. (중복 건너뜀)"); } else {
        const { error } = await supabase.from('sales_records').insert(finalUploadData);
        if (error) throw error;
        alert(`총 ${rows.length}건 중 신규 ${finalUploadData.length}건이 저장되었습니다.\n(중복 ${rows.length - finalUploadData.length}건 건너뜀)`);
        setRows([]); setPasteData(''); fetchMonthlyRecords();
      }
    } catch (err) { alert("저장 실패: " + err.message); } finally { setLoading(false); }
  };

  const summary = rows.reduce((acc, cur) => { acc[cur.work_type] = (acc[cur.work_type] || 0) + cur.total_price; return acc; }, {});
  const totalAmount = rows.reduce((acc, cur) => acc + cur.total_price, 0);

  return (
    <div style={styles.container}>
      <div style={styles.topSection}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📄 매출 엑셀 붙여넣기</h3>
          <textarea className="excel-input" value={pasteData} onChange={e=>setPasteData(e.target.value)} placeholder="엑셀 복사(Ctrl+C) -> 붙여넣기(Ctrl+V)" />
          <button onClick={handlePasteProcess} style={styles.blueBtn}>데이터 분석 실행</button>
        </div>
        <div style={styles.summaryCard}>
           <h3 style={styles.cardTitle}>📊 실시간 작업 요약 (붙여넣기분)</h3>
           {Object.entries(summary).map(([key, val]) => (<div key={key} style={{display:'flex', justifyContent:'space-between', marginBottom:'8px', fontSize:'15px'}}><span>{key}</span><span style={{fontWeight:'bold'}}>{val.toLocaleString()}원</span></div>))}
           <div style={styles.totalBox}>총 매출: {totalAmount.toLocaleString()}원</div>
        </div>
      </div>
      {rows.length > 0 && (
        <div style={styles.card}>
          <div style={styles.tableWrapper}><table style={styles.table}><thead><tr style={styles.thRow}><th>일자</th><th>업체</th><th>품명/규격</th><th>중량(kg)</th><th>단가</th><th>금액</th><th>구분</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} style={styles.tr}><td>{r.work_date}</td><td>{r.company_name}</td><td style={{fontSize:'12px'}}>{r.product_name}<br/>{r.spec}</td><td>{r.weight.toLocaleString()}</td><td>{r.unit_price.toLocaleString()}</td><td style={{fontWeight:'bold', color:'#2b6cb0'}}>{r.total_price.toLocaleString()}</td><td><span style={styles.badge}>{r.work_type}</span></td></tr>)}</tbody></table></div>
          <button onClick={handleSaveToDB} disabled={loading} style={styles.greenBtn}>{loading?'저장 중... (중복 확인)':'DB에 저장하기 (중복 건너뜀)'}</button>
        </div>
      )}
      <div style={{...styles.card, marginTop:'20px', backgroundColor:'#f8fafc'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
          <h3 style={{...styles.cardTitle, margin:0}}>📅 {selectedYear}년 {selectedMonth}월 입력된 매출 내역 ({monthlyRecords.length}건)</h3>
          <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
            <select value={selectedYear} onChange={e=>setSelectedYear(e.target.value)} style={styles.select}><option value="2026">2026년</option><option value="2025">2025년</option></select>
            <select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} style={styles.select}>{Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}월</option>)}</select>
            {/* [신규] 월 일괄 삭제 버튼 */}
            <button onClick={handleDeleteMonth} disabled={loading} style={styles.dangerBtn}>🚨 이 달의 데이터 전체 삭제</button>
          </div>
        </div>
        <div style={styles.tableWrapper}><table style={styles.table}><thead><tr style={styles.thRow}><th>일자</th><th>업체</th><th>품명/규격</th><th>중량(kg)</th><th>단가</th><th>금액</th><th>구분</th><th>관리</th></tr></thead><tbody>{monthlyRecords.map(r=>(<tr key={r.id} style={styles.tr}><td>{r.work_date}</td><td>{r.companies?.name}</td><td style={{fontSize:'12px'}}>{r.management_no}</td><td>{r.weight.toLocaleString()}</td><td>{r.unit_price.toLocaleString()}</td><td style={{fontWeight:'bold'}}>{r.total_price.toLocaleString()}</td><td><span style={styles.badge}>{r.work_type}</span></td><td><button onClick={()=>handleEditClick(r)} style={styles.editBtn}>수정</button><button onClick={()=>handleDelete(r.id)} style={styles.deleteBtn}>삭제</button></td></tr>))}</tbody></table></div>
      </div>
      {isEditModalOpen && editingRecord && (
        <div style={styles.modalOverlay}><div style={styles.modalContent}><h3>내역 수정 ({editingRecord.companies?.name})</h3><div style={styles.inputGroup}><label>품명/규격 (수정불가)</label><input type="text" value={editingRecord.management_no} disabled style={styles.disabledInput} /></div><div style={styles.inputGroup}><label>중량(kg)</label><input type="number" value={editingRecord.weight} onChange={e=>setEditingRecord({...editingRecord, weight: e.target.value})} style={styles.modalInput} /></div><div style={styles.inputGroup}><label>단가</label><input type="number" value={editingRecord.unit_price} onChange={e=>setEditingRecord({...editingRecord, unit_price: e.target.value})} style={styles.modalInput} /></div><div style={styles.inputGroup}><label>총 금액</label><input type="number" value={editingRecord.total_price} onChange={e=>setEditingRecord({...editingRecord, total_price: e.target.value})} style={styles.modalInput} /></div><div style={styles.inputGroup}><label>작업구분</label><select value={editingRecord.work_type} onChange={e=>setEditingRecord({...editingRecord, work_type: e.target.value})} style={styles.modalInput}><option value="슬리팅 1">슬리팅 1</option><option value="슬리팅 2">슬리팅 2</option><option value="레베링">레베링</option><option value="기타">기타</option></select></div><div style={styles.modalActions}><button onClick={()=>setIsEditModalOpen(false)} style={styles.cancelBtn}>취소</button><button onClick={handleUpdate} disabled={loading} style={styles.saveBtn}>{loading?'저장중...':'수정 완료'}</button></div></div></div>
      )}
    </div>
  );
}
const styles = { container: { padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box', overflowY:'auto' }, topSection: { display: 'flex', gap: '20px' }, card: { flex: 1, backgroundColor: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }, summaryCard: { flex: 1, backgroundColor: '#ebf8ff', padding: '25px', borderRadius: '15px', border: '2px solid #bee3f8', display:'flex', flexDirection:'column', justifyContent:'center' }, cardTitle: { margin: '0 0 20px 0', fontSize: '18px', color: '#2d3748', fontWeight:'bold' }, blueBtn: { width:'100%', padding: '12px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize:'16px' }, totalBox: { marginTop: '20px', textAlign: 'right', fontSize: '22px', fontWeight: 'bold', color: '#2b6cb0', borderTop:'2px solid #bee3f8', paddingTop:'15px' }, tableWrapper: { overflowY: 'auto', maxHeight:'500px', marginBottom: '15px' }, table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' }, thRow: { backgroundColor: '#f7fafc', textAlign: 'left', position: 'sticky', top: 0 }, tr: { borderBottom: '1px solid #edf2f7', height:'40px' }, badge: { padding: '4px 8px', backgroundColor: '#bee3f8', color: '#2b6cb0', borderRadius: '6px', fontSize: '12px', fontWeight:'bold' }, greenBtn: { width: '100%', padding: '15px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }, editBtn: { padding: '6px 10px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize:'12px', marginRight:'5px' }, deleteBtn: { padding: '6px 10px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize:'12px' }, modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }, modalContent: { backgroundColor: 'white', padding: '30px', borderRadius: '15px', width: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }, inputGroup: { marginBottom: '15px' }, modalInput: { width: '100%', padding: '10px', border: '1px solid #cbd5e0', borderRadius: '6px', boxSizing:'border-box' }, disabledInput: { width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor:'#f7fafc', color:'#a0aec0', boxSizing:'border-box' }, modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }, cancelBtn: { padding: '10px 20px', border: '1px solid #cbd5e0', backgroundColor: 'white', borderRadius: '6px', cursor: 'pointer' }, saveBtn: { padding: '10px 20px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }, select: { padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0' },
dangerBtn: { padding: '8px 12px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight:'bold', fontSize:'13px' } };
export default WorkLog;