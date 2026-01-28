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

  // [수정] 우측 상단 버전 표시
  const VERSION_TAG = "2026-01-29 (중복제거기능)";

  useEffect(() => { fetchMonthlyRecords(); }, [selectedYear, selectedMonth]);

  const fetchMonthlyRecords = async () => {
    const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
    const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
    const { data } = await supabase.from('daily_ledger').select('*')
      .gte('trans_date', startDate).lte('trans_date', endDate)
      .order('trans_date', { ascending: false }).order('created_at', { ascending: false });
    setMonthlyRecords(data || []);
  };

  const handleSave = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    try {
      // [핵심] 중복 체크를 위한 기존 데이터 조회
      const { data: existing } = await supabase.from('daily_ledger').select('trans_date, type, company, description, amount, method');

      // 중복 제외 필터링 (날짜, 구분, 상호, 적요, 금액, 방식 일치 시 제외)
      const filteredRows = rows.filter(newR => !existing?.some(ex => 
        ex.trans_date === newR.trans_date && 
        ex.type === newR.type && 
        ex.company === newR.company && 
        ex.description === newR.description && 
        Number(ex.amount) === Number(newR.amount) &&
        ex.method === newR.method
      ));

      const skipCount = rows.length - filteredRows.length;

      if (filteredRows.length > 0) {
        const { error } = await supabase.from('daily_ledger').insert(filteredRows);
        if (error) throw error;
        alert(`✅ ${filteredRows.length}건 저장 완료\n⚠️ 중복 ${skipCount}건 제외`);
      } else {
        alert(`🚫 새로운 데이터가 없습니다. (전부 중복: ${skipCount}건)`);
      }

      setRows([]); setPasteData(''); fetchMonthlyRecords();
    } catch (err) { alert("저장 실패: " + err.message); } finally { setLoading(false); }
  };

  // ... (기존 파싱 로직 및 스타일 동일, VERSION_TAG만 상단 추가)
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
export default Ledger;