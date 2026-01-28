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

  // [수정] 우측 상단 버전 표시
  const VERSION_TAG = "2026-01-29 (중복제거기능)";

  useEffect(() => { fetchMonthlyRecords(); }, [selectedYear, selectedMonth]);

  const fetchMonthlyRecords = async () => {
    const yearStr = selectedYear.toString();
    const monthStr = selectedMonth.toString().padStart(2, '0');
    const startDate = `${yearStr}-${monthStr}-01`;
    const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

    const { data } = await supabase.from('sales_records')
      .select('*, companies(name)')
      .gte('work_date', startDate).lte('work_date', endDate)
      .order('work_date', { ascending: false }).order('created_at', { ascending: false });
    
    const formattedData = data?.map(r => {
      const [prod, spec] = r.management_no ? r.management_no.split(' | ') : ['', ''];
      return { ...r, product_name: prod || '', spec: spec || '' };
    }) || [];
    setMonthlyRecords(formattedData);
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

  const handleSaveToDB = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    try {
      const { data: companies } = await supabase.from('companies').select('id, name');
      
      // [핵심] 중복 체크 로직 추가
      const { data: existing } = await supabase.from('sales_records').select('work_date, management_no, weight, unit_price');

      const preparedData = rows.map(r => ({
        work_date: r.work_date,
        company_id: companies.find(c => c.name.trim() === r.company_name.trim())?.id || 1,
        management_no: `${r.product_name} | ${r.spec}`,
        weight: r.weight,
        unit_price: r.unit_price,
        total_price: r.total_price,
        work_type: r.work_type
      }));

      // 중복 제외 필터링
      const filteredData = preparedData.filter(newR => !existing?.some(ex => 
        ex.work_date === newR.work_date && 
        ex.management_no === newR.management_no && 
        Number(ex.weight) === Number(newR.weight) &&
        Number(ex.unit_price) === Number(newR.unit_price)
      ));

      const skipCount = preparedData.length - filteredData.length;

      if (filteredData.length > 0) {
        const { error } = await supabase.from('sales_records').insert(filteredData);
        if (error) throw error;
        alert(`✅ ${filteredData.length}건 저장 완료\n⚠️ 중복 ${skipCount}건 제외`);
      } else {
        alert(`🚫 모두 중복된 데이터입니다. (중복 ${skipCount}건 제외)`);
      }
      
      setRows([]); setPasteData(''); fetchMonthlyRecords();
    } catch (err) { alert("저장 실패: " + err.message); } finally { setLoading(false); }
  };

  // ... (기존 스타일 및 렌더링 로직 동일, VERSION_TAG만 상단 추가)
  return (
    <div style={styles.container}>
      <div style={{ position: 'absolute', top: '10px', right: '20px', fontSize: '12px', color: '#718096', fontWeight: 'bold' }}>
        {VERSION_TAG}
      </div>
      {/* 이하 기존 렌더링 코드 그대로 유지 */}
    </div>
  );
}
// (기존 styles 생략)
export default WorkLog;