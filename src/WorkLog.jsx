import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function WorkLog() {
  const [pasteData, setPasteData] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [editingCell, setEditingCell] = useState({ id: null, field: null });

  useEffect(() => { fetchMonthlyRecords(); }, [selectedYear, selectedMonth]);

  const fetchMonthlyRecords = async () => {
    const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
    const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
    const { data } = await supabase.from('work_log').select('*')
      .gte('work_date', startDate).lte('work_date', endDate)
      .order('work_date', { ascending: false });
    setMonthlyRecords(data || []);
  };

  const handleCellUpdate = async (id, field, value) => {
    setMonthlyRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    try {
      const { error } = await supabase.from('work_log').update({ [field]: value }).eq('id', id);
      if (error) throw error;
    } catch (e) {
      alert("수정 실패");
      fetchMonthlyRecords();
    }
    setEditingCell({ id: null, field: null });
  };

  const handleSingleDelete = async (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    const { error } = await supabase.from('work_log').delete().eq('id', id);
    if (!error) fetchMonthlyRecords();
  };

  const handlePasteProcess = () => {
    if (!pasteData.trim()) return alert("데이터를 붙여넣어 주세요.");
    const lines = pasteData.trim().split('\n');
    const parsedRows = [];
    lines.forEach((line) => {
      if (line.includes("날짜") || line.trim() === "") return;
      const cols = line.split('\t');
      if (cols.length < 3) return;
      // 예시 구조: 날짜 | 현장명 | 작업자 | 작업내용
      parsedRows.push({
        work_date: cols[0]?.trim(),
        project_name: cols[1]?.trim(),
        worker: cols[2]?.trim(),
        content: cols[3]?.trim()
      });
    });
    setRows(parsedRows);
  };

  const handleSave = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    try {
      const dates = rows.map(r => r.work_date);
      const minDate = dates.reduce((a, b) => a < b ? a : b);
      const maxDate = dates.reduce((a, b) => a > b ? a : b);

      const { data: existing } = await supabase.from('work_log').select('*')
        .gte('work_date', minDate).lte('work_date', maxDate);

      const duplicates = [];
      const validRows = [];

      rows.forEach(newR => {
        const isDup = existing.some(oldR => 
          oldR.work_date === newR.work_date && oldR.project_name === newR.project_name && oldR.worker === newR.worker
        );
        if (isDup) duplicates.push(`${newR.work_date} | ${newR.project_name} | ${newR.worker}`);
        else validRows.push(newR);
      });

      if (validRows.length > 0) {
        const { error } = await supabase.from('work_log').insert(validRows);
        if (error) throw error;
      }

      const dupMsg = duplicates.length > 0 
        ? `\n\n⚠️ 중복 제외(${duplicates.length}건):\n${duplicates.slice(0, 5).join('\n')}${duplicates.length > 5 ? '\n...외 더 있음' : ''}`
        : '';
      alert(`✅ 작업일보 ${validRows.length}건 저장 완료!${dupMsg}`);

      setRows([]); setPasteData(''); fetchMonthlyRecords();
    } catch (err) { alert("저장 오류: " + err.message); } finally { setLoading(false); }
  };

  const EditableCell = ({ record, field, type = "text" }) => {
    const isEditing = editingCell.id === record.id && editingCell.field === field;
    if (isEditing) {
      return (
        <input
          autoFocus type={type} defaultValue={record[field]}
          onBlur={(e) => handleCellUpdate(record.id, field, e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCellUpdate(record.id, field, e.target.value)}
          style={styles.cellInput}
        />
      );
    }
    return <div onClick={() => setEditingCell({ id: record.id, field })} style={styles.cellDiv}>{record[field]}</div>;
  };

  return (
    <div style={styles.container}>
      <div style={styles.topSection}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>👷 작업일보 엑셀 붙여넣기</h3>
          <textarea style={styles.textarea} value={pasteData} onChange={e=>setPasteData(e.target.value)} />
          <button onClick={handlePasteProcess} style={styles.blueBtn}>데이터 분석</button>
        </div>
        <div style={styles.summaryCard}>
          <p>분석 데이터: {rows.length}건</p>
          <button onClick={handleSave} disabled={loading || rows.length===0} style={styles.greenBtn}>중복 제외 저장</button>
        </div>
      </div>
      <div style={styles.listCard}>
        <div style={styles.headerRow}>
          <h3 style={{margin:0}}>📅 {selectedYear}년 {selectedMonth}월 작업기록</h3>
          <select value={selectedMonth} onChange={e=>setSelectedMonth(Number(e.target.value))}>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m=><option key={m} value={m}>{m}월</option>)}
          </select>
        </div>
        <div style={styles.scrollWrapper}>
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr><th>날짜</th><th>현장명</th><th>작업자</th><th>작업내용</th><th>관리</th></tr>
            </thead>
            <tbody>
              {monthlyRecords.map(r => (
                <tr key={r.id} style={styles.tr}>
                  <td><EditableCell record={r} field="work_date" type="date" /></td>
                  <td><EditableCell record={r} field="project_name" /></td>
                  <td><EditableCell record={r} field="worker" /></td>
                  <td><EditableCell record={r} field="content" /></td>
                  <td><button onClick={() => handleSingleDelete(r.id)} style={styles.delBtn}>삭제</button></td>
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
  container: { padding: '20px', height: '100vh', boxSizing:'border-box', display:'flex', flexDirection:'column', gap:'20px', backgroundColor:'#f9f9f9' },
  topSection: { display: 'flex', gap: '20px' },
  card: { flex: 2, backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  summaryCard: { flex: 1, backgroundColor: '#f0fff4', padding: '20px', borderRadius: '12px', display:'flex', flexDirection:'column', justifyContent:'center' },
  textarea: { width:'100%', height:'100px', marginBottom:'10px' },
  blueBtn: { width:'100%', padding: '10px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px' },
  greenBtn: { width: '100%', padding: '15px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' },
  listCard: { background:'white', padding:'20px', borderRadius:'12px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 },
  headerRow: { display:'flex', justifyContent:'space-between', marginBottom:'10px' },
  scrollWrapper: { flex: 1, overflowY: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  thead: { position: 'sticky', top: 0, backgroundColor: '#f7fafc', zIndex: 1 },
  tr: { borderBottom: '1px solid #edf2f7', height: '40px' },
  cellDiv: { padding: '8px', cursor: 'pointer', minHeight: '20px', width: '100%' },
  cellInput: { width: '90%', padding: '5px', border: '2px solid #3182ce', borderRadius: '4px' },
  delBtn: { color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer' },
  cardTitle: { margin: '0 0 10px 0' }
};

export default WorkLog;