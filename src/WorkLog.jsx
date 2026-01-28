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

  // [명세서 확인 완료] 실제 DB 테이블명
  const TABLE_NAME = 'daily_work_report';

  useEffect(() => { fetchMonthlyRecords(); }, [selectedYear, selectedMonth]);

  const fetchMonthlyRecords = async () => {
    const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
    const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
    const { data } = await supabase.from(TABLE_NAME).select('*')
      .gte('work_date', startDate).lte('work_date', endDate)
      .order('work_date', { ascending: false });
    setMonthlyRecords(data || []);
  };

  const handleCellUpdate = async (id, field, value) => {
    setMonthlyRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    try {
      const { error } = await supabase.from(TABLE_NAME).update({ [field]: value }).eq('id', id);
      if (error) throw error;
    } catch (e) { alert("수정 실패: " + e.message); fetchMonthlyRecords(); }
    setEditingCell({ id: null, field: null });
  };

  const handlePasteProcess = () => {
    if (!pasteData.trim()) return alert("데이터를 붙여넣어 주세요.");
    const lines = pasteData.trim().split('\n');
    const parsedRows = [];
    lines.forEach((line) => {
      if (line.includes("날짜") || line.trim() === "") return;
      const cols = line.split('\t');
      if (cols.length < 3) return;
      
      // 명세서 필드 매핑: 날짜 | 현장명 | 작업자 | 작업내용
      parsedRows.push({
        work_date: cols[0]?.trim(),
        site_name: cols[1]?.trim(),    
        worker_name: cols[2]?.trim(),  
        work_content: cols[3]?.trim()  
      });
    });
    setRows(parsedRows);
  };

  const handleSave = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    try {
      // 해당 범위의 기존 데이터를 한 번에 가져옴 (성능 최적화)
      const { data: existingData } = await supabase.from(TABLE_NAME).select('work_date, site_name, worker_name');
      const existing = existingData || [];

      // 중복 체크 로직: 날짜, 현장명, 작업자가 모두 같으면 제외
      const validRows = rows.filter(newR => !existing.some(oldR => 
        oldR.work_date === newR.work_date && 
        oldR.site_name === newR.site_name && 
        oldR.worker_name === newR.worker_name
      ));

      if (validRows.length > 0) {
        const { error } = await supabase.from(TABLE_NAME).insert(validRows);
        if (error) throw error;
      }

      const dupCount = rows.length - validRows.length;
      alert(`✅ 저장 완료: ${validRows.length}건\n⚠️ 중복 제외: ${dupCount}건`);
      
      setRows([]); setPasteData(''); fetchMonthlyRecords();
    } catch (err) { alert("저장 오류: " + err.message); } finally { setLoading(false); }
  };

  const EditableCell = ({ record, field, type = "text" }) => (
    editingCell.id === record.id && editingCell.field === field ? 
    <input 
      autoFocus type={type} 
      defaultValue={record[field]} 
      onBlur={(e) => handleCellUpdate(record.id, field, e.target.value)} 
      onKeyDown={(e) => e.key === 'Enter' && handleCellUpdate(record.id, field, e.target.value)}
      style={{width:'90%', padding:'4px', border:'2px solid #3182ce'}} 
    /> :
    <div onClick={() => setEditingCell({ id: record.id, field })} style={{padding:'8px', cursor:'pointer', minHeight:'20px'}}>
      {record[field]}
    </div>
  );

  return (
    <div style={{padding:'20px', background:'#f7fafc', minHeight:'100vh'}}>
      <div style={{display:'flex', gap:'20px', marginBottom:'20px'}}>
        <div style={{flex:2, background:'white', padding:'20px', borderRadius:'12px', boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
          <h3 style={{marginTop:0}}>👷 작업일보 엑셀 붙여넣기</h3>
          <textarea 
            style={{width:'100%', height:'120px', padding:'10px', boxSizing:'border-box', borderRadius:'8px', border:'1px solid #ddd'}} 
            value={pasteData} onChange={e=>setPasteData(e.target.value)} 
            placeholder="날짜	현장명	작업자	내용 순으로 붙여넣으세요."
          />
          <button onClick={handlePasteProcess} style