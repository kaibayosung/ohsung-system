import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function Ledger() {
  const [pasteData, setPasteData] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(1);

  const [editingId, setEditingId] = useState(null); 
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => { fetchMonthlyRecords(); }, [selectedYear, selectedMonth]);

  const fetchMonthlyRecords = async () => {
    const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
    const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
    const { data } = await supabase.from('daily_ledger').select('*')
      .gte('trans_date', startDate).lte('trans_date', endDate)
      .order('trans_date', { ascending: false }).order('created_at', { ascending: false });
    setMonthlyRecords(data || []);
  };

  const handleEditClick = (record) => {
    setEditingId(record.id);
    setEditFormData({ ...record });
  };

  const handleInlineSave = async (id) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('daily_ledger').update({
        trans_date: editFormData.trans_date,
        type: editFormData.type,
        company: editFormData.company,
        description: editFormData.description,
        amount: Number(editFormData.amount),
        method: editFormData.method
      }).eq('id', id);
      if (error) throw error;
      alert("수정되었습니다.");
      setEditingId(null);
      fetchMonthlyRecords();
    } catch (e) { alert("수정 실패: " + e.message); } finally { setLoading(false); }
  };

  // [핵심] 엑셀 데이터 파싱 로직 수정
  const handlePasteProcess = () => {
    if (!pasteData.trim()) return alert("데이터를 붙여넣어 주세요.");
    const lines = pasteData.trim().split('\n');
    const parsedRows = [];
    let lastValidDate = ""; 

    lines.forEach((line, index) => {
      // 불필요한 행 제외 (헤더, 합계 등)
      if (line.includes("일 계 표") || line.includes("수입계") || line.includes("지출계") || 
          line.includes("날자") || line.trim() === "" || line.startsWith("계") || 
          line.includes("18,729,280")) return;
      
      const cols = line.split('\t');
      if (cols.length < 3) return;

      // 1. 날짜 인식 (A열 우선)
      let rowDate = cols[0]?.trim();
      if (rowDate && /^\d{4}-\d{2}-\d{2}$/.test(rowDate)) {
        lastValidDate = rowDate; 
      } else {
        rowDate = lastValidDate;
      }
      if (!rowDate) return; // 날짜 없으면 스킵

      // 2. 상호 및 적요 매칭 (B열, C열)
      const company = cols[1]?.trim() || '';
      const description = cols[2]?.trim() || '';

      // 3. 금액 유형 인식 (E, F, G, H열)
      const incomeCash = Number(cols[4]?.replace(/,/g,'')) || 0;    // E열: 현금 입금
      const expenseCash = Number(cols[5]?.replace(/,/g,'')) || 0;   // F열: 현금 지출
      const expenseCard = Number(cols[6]?.replace(/,/g,'')) || 0;   // G열: 법인카드
      const expenseOther = Number(cols[7]?.replace(/,/g,'')) || 0;  // H열: 기타

      // 수입 등록
      if (incomeCash > 0) {
        parsedRows.push({ trans_date: rowDate, type: '수입', company, description, amount: incomeCash, method: '현금' });
      }
      // 지출 등록 (현금)
      if (expenseCash > 0) {
        parsedRows.push({ trans_date: rowDate, type: '지출', company, description, amount: expenseCash, method: '현금' });
      }
      // 지출 등록 (법인카드)
      if (expenseCard > 0) {
        parsedRows.push({ trans_date: rowDate, type: '지출', company, description, amount: expenseCard, method: '법인카드' });
      }
      // 지출 등록 (기타)
      if (expenseOther > 0) {
        parsedRows.push({ trans_date: rowDate, type: '지출', company, description, amount: expenseOther, method: '기타' });
      }
    });
    setRows(parsedRows);
  };

  const handleSave = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    const { error } = await supabase.from('daily_ledger').insert(rows);
    if (error) alert("저장 실패: " + error.message); 
    else { alert(`${rows.length}건 저장 완료!`); setRows([]); setPasteData(''); fetchMonthlyRecords(); }
    setLoading(false);
  };

  const handleDeleteMonth = async () => {
    if (!window.confirm(`${selectedMonth}월 데이터를 전부 삭제하시겠습니까?`)) return;
    const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
    const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
    await supabase.from('daily_ledger').delete().gte('trans_date', startDate).lte('trans_date', endDate);
    fetchMonthlyRecords();
  };

  return (
    <div style={styles.container}>
      <div style={styles.topSection}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📝 엑셀 붙여넣기 (입력창 확대)</h3>
          <textarea 
            style={styles.textarea} 
            value={pasteData} 
            onChange={e=>setPasteData(e.target.value)} 
            placeholder="엑셀에서 날짜~기타 범위를 복사해서 붙여넣으세요." 
          />
          <button onClick={handlePasteProcess} style={styles.blueBtn}>데이터 분석 실행</button>
        </div>
        <div style={styles.summaryCard}>
          <h3 style={styles.cardTitle}>📊 분석 결과 요약</h3>
          <div style={{fontSize:'18px', marginBottom:'15px'}}>
            수입 항목: <span style={{color:'blue', fontWeight:'bold'}}>{rows.filter(r=>r.type==='수입').length}건</span><br/>
            지출 항목: <span style={{color:'red', fontWeight:'bold'}}>{rows.filter(r=>r.type==='지출').length}건</span><br/>
            총합계: {rows.reduce((a,b)=>a+b.amount,0).toLocaleString()}원
          </div>
          <button onClick={handleSave} disabled={loading || rows.length===0} style={styles.greenBtn}>데이터베이스에 최종 저장</button>
        </div>
      </div>
      
      <div style={styles.listCard}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
          <h3 style={{margin:0}}>📅 {selectedYear}년 {selectedMonth}월 데이터 내역 ({monthlyRecords.length}건)</h3>
          <div style={{display:'flex', gap:'10px'}}>
            <select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} style={styles.select}>{[1,2,3,4,5,6,7,8,9,10,11,12].map(m=><option key={m} value={m}>{m}월</option>)}</select>
            <button onClick={handleDeleteMonth} style={styles.dangerBtn}>🚨 전체 삭제</button>
          </div>
        </div>

        {/* [스크롤 영역] */}
        <div style={styles.scrollWrapper}>
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr style={styles.thRow}>
                <th style={{width:'15%'}}>날짜</th><th style={{width:'10%'}}>구분</th><th style={{width:'15%'}}>상호</th><th style={{width:'30%'}}>적요</th><th style={{width:'15%'}}>금액</th><th style={{width:'10%'}}>방식</th><th style={{width:'5%'}}>관리</th>
              </tr>
            </thead>
            <tbody>
              {monthlyRecords.map(r => (
                <tr key={r.id} style={styles.tr}>
                  {editingId === r.id ? (
                    <>
                      <td><input type="date" value={editFormData.trans_date} onChange={e=>setEditFormData({...editFormData, trans_date:e.target.value})} style={styles.inlineInput}/></td>
                      <td><select value={editFormData.type} onChange={e=>setEditFormData({...editFormData, type:e.target.value})} style={styles.inlineInput}><option value="수입">수입</option><option value="지출">지출</option></select></td>
                      <td><input type="text" value={editFormData.company} onChange={e=>setEditFormData({...editFormData, company:e.target.value})} style={styles.inlineInput}/></td>
                      <td><input type="text" value={editFormData.description} onChange={e=>setEditFormData({...editFormData, description:e.target.value})} style={styles.inlineInput}/></td>
                      <td><input type="number" value={editFormData.amount} onChange={e=>setEditFormData({...editFormData, amount:e.target.value})} style={styles.inlineInput}/></td>
                      <td><input type="text" value={editFormData.method} onChange={e=>setEditFormData({...editFormData, method:e.target.value})} style={styles.inlineInput}/></td>
                      <td><button onClick={()=>handleInlineSave(r.id)} style={styles.saveBtn}>저장</button></td>
                    </>
                  ) : (
                    <>
                      <td>{r.trans_date}</td>
                      <td style={{color:r.type==='수입'?'blue':'red', fontWeight:'bold'}}>{r.type}</td>
                      <td>{r.company}</td>
                      <td style={{textAlign:'left'}}>{r.description}</td>
                      <td style={{fontWeight:'bold'}}>{r.amount.toLocaleString()}</td>
                      <td>{r.method}</td>
                      <td><button onClick={()=>handleEditClick(r)} style={styles.editBtn}>수정</button></td>
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
  container: { padding: '20px', height: '100vh', boxSizing:'border-box', display:'flex', flexDirection:'column', gap:'20px', backgroundColor:'#f4f7f9' },
  topSection: { display: 'flex', gap: '20px', flexShrink: 0 },
  card: { flex: 2, backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  summaryCard: { flex: 1, backgroundColor: '#f0f4f8', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  textarea: { width:'100%', height:'220px', marginBottom:'10px', padding:'15px', borderRadius:'8px', border:'1px solid #cbd5e0', fontSize:'14px', boxSizing:'border-box', resize: 'none' },
  blueBtn: { width:'100%', padding: '12px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', fontWeight:'bold', cursor: 'pointer' },
  greenBtn: { width: '100%', padding: '15px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize:'16px' },
  listCard: { background:'white', padding:'20px', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 },
  scrollWrapper: { flex: 1, overflowY: 'auto', border: '1px solid #edf2f7', borderRadius: '8px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign:'center', tableLayout: 'fixed' },
  thead: { position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f7fafc' },
  tr: { borderBottom: '1px solid #edf2f7', height: '45px' },
  inlineInput: { width: '95%', padding: '4px', border: '1px solid #3182ce', borderRadius: '4px' },
  editBtn: { padding: '4px 8px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  saveBtn: { padding: '4px 8px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  dangerBtn: { backgroundColor: '#e53e3e', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor:'pointer' },
  select: { padding: '6px 12px', borderRadius: '6px' },
  cardTitle: { margin:'0 0 10px 0', fontSize:'18px', fontWeight:'bold' }
};

export default Ledger;