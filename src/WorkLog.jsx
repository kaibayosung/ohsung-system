import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

function WorkLog() {
  const [pasteData, setPasteData] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(1);

  const EQ_COLORS = { '슬리팅 1': '#3182ce', '슬리팅 2': '#805ad5', '레베링': '#38a169', '기타': '#718096' };

  // 데이터 불러오기 함수
  const fetchMonthlyRecords = useCallback(async () => {
    const start = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
    const end = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('sales_records')
      .select('*')
      .gte('work_date', start)
      .lte('work_date', end)
      .order('work_date', { ascending: false });

    if (!error) setMonthlyRecords(data || []);
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    fetchMonthlyRecords();
  }, [fetchMonthlyRecords]);

  // 엑셀 분석 로직
  const handlePasteProcess = () => {
    const lines = pasteData.trim().split('\n').filter(l => !l.includes("생산일자") && l.trim());
    const parsed = lines.map((line, i) => {
      const cols = line.split(/\t| {2,}/).map(c => c.trim());
      const type = cols[7]?.includes('SLITING2') ? '슬리팅 2' : cols[7]?.includes('SLITING') ? '슬리팅 1' : cols[7]?.includes('LEVELLING') ? '레베링' : '기타';
      return { 
        work_date: cols[0], customer_name: cols[1], product_name: cols[2], spec: cols[3],
        coil_number: cols[2], weight: Number(cols[4]?.replace(/,/g,'')), 
        unit_price: Number(cols[5]?.replace(/,/g,'')), total_price: Number(cols[6]?.replace(/,/g,'')), work_type: type 
      };
    });
    setRows(parsed);
  };

  // [핵심] 중복 체크 후 저장 로직
  const handleSaveToDB = async () => {
    if (rows.length === 0) return;
    setLoading(true);

    try {
      // 1. 현재 붙여넣은 날짜 범위의 데이터를 가져와서 중복 대조
      const dates = rows.map(r => r.work_date);
      const minDate = dates.reduce((a, b) => a < b ? a : b);
      const maxDate = dates.reduce((a, b) => a > b ? a : b);

      const { data: existing } = await supabase
        .from('sales_records')
        .select('work_date, coil_number, weight')
        .gte('work_date', minDate)
        .lte('work_date', maxDate);

      // 2. 메모리 상에서 중복 필터링 (날짜+코일번호+중량이 같은 것 제외)
      const validData = rows.filter(r => {
        const isDuplicate = existing?.some(ex => 
          ex.work_date === r.work_date && 
          ex.coil_number === r.coil_number && 
          Number(ex.weight) === Number(r.weight)
        );
        return !isDuplicate;
      }).map(r => ({
        work_date: r.work_date,
        customer_name: r.customer_name,
        management_no: `${r.product_name} | ${r.spec}`,
        coil_number: r.coil_number,
        weight: r.weight,
        unit_price: r.unit_price,
        total_price: r.total_price,
        work_type: r.work_type,
        company_id: 1 
      }));

      // 3. 필터링된 데이터만 저장
      if (validData.length > 0) {
        const { error } = await supabase.from('sales_records').insert(validData);
        if (error) throw error;
        alert(`✅ ${validData.length}건이 성공적으로 저장되었습니다.\n(중복 ${rows.length - validData.length}건 제외)`);
      } else {
        alert("⚠️ 모두 이미 등록된 데이터입니다.");
      }

      setRows([]);
      setPasteData('');
      fetchMonthlyRecords(); // 저장 후 목록 즉시 갱신
    } catch (e) {
      alert("저장 에러: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h2 style={styles.pageTitle}>📄 작업 일보 고속 입력 (ERP 2.0)</h2>
      </div>

      <div style={styles.topSection}>
        <div style={styles.card}>
          <h4 style={styles.cardTitle}>1. 엑셀 데이터 붙여넣기</h4>
          <textarea 
            style={styles.textArea} 
            value={pasteData} 
            onChange={e=>setPasteData(e.target.value)} 
            placeholder="엑셀에서 복사한 내용을 여기에 붙여넣으세요."
          />
          <button onClick={handlePasteProcess} style={styles.blueBtn}>데이터 분석 실행</button>
        </div>
        
        <div style={styles.summaryCard}>
            <h4 style={styles.cardTitle}>2. 분석 결과 요약</h4>
            <div style={styles.summaryGrid}>
                {Object.entries(rows.reduce((acc, cur) => { acc[cur.work_type] = (acc[cur.work_type] || 0) + cur.total_price; return acc; }, {}))
                .map(([type, total]) => (
                    <div key={type} style={styles.summaryItem}>
                        <span style={{color: EQ_COLORS[type] || '#718096'}}>●</span> {type}: <b>{total.toLocaleString()}원</b>
                    </div>
                ))}
            </div>
            <div style={styles.totalBox}>총합: {rows.reduce((a,b)=>a+b.total_price,0).toLocaleString()}원</div>
        </div>
      </div>

      {rows.length > 0 && (
        <div style={{textAlign:'center', marginBottom: '20px'}}>
          <button onClick={handleSaveToDB} disabled={loading} style={styles.greenBtn}>
            {loading ? '중복 데이터 필터링 및 저장 중...' : `중복 제외하고 ${rows.length}건 DB 저장하기`}
          </button>
        </div>
      )}

      {/* 하단 검색 및 목록 영역 */}
      <div style={styles.listCard}>
        <div style={styles.listHeader}>
          <h3 style={styles.cardTitle}>📅 {selectedYear}년 {selectedMonth}월 작업 내역 ({monthlyRecords.length}건)</h3>
          <div style={styles.filterGroup}>
            <select value={selectedYear} onChange={e=>setSelectedYear(Number(e.target.value))} style={styles.select}>
                <option value="2026">2026년</option><option value="2025">2025년</option>
            </select>
            <select value={selectedMonth} onChange={e=>setSelectedMonth(Number(e.target.value))} style={styles.select}>
                {Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}월</option>)}
            </select>
          </div>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr>
                <th>일자</th><th>거래처</th><th>품명</th><th>규격</th><th>중량</th><th>금액</th><th>구분</th><th>관리</th>
              </tr>
            </thead>
            <tbody>
              {monthlyRecords.map(r => (
                <tr key={r.id} style={styles.tr}>
                  <td>{r.work_date}</td>
                  <td>{r.customer_name}</td>
                  <td style={{fontWeight:'bold'}}>{r.management_no?.split(' | ')[0]}</td>
                  <td style={{color:'#718096'}}>{r.management_no?.split(' | ')[1]}</td>
                  <td>{r.weight?.toLocaleString()}</td>
                  <td style={{fontWeight:'bold', color:'#2b6cb0'}}>{r.total_price?.toLocaleString()}</td>
                  <td>
                    <span style={{...styles.badge, backgroundColor: EQ_COLORS[r.work_type] || '#edf2f7'}}>
                        {r.work_type}
                    </span>
                  </td>
                  <td>
                    <button style={styles.smallDeleteBtn} onClick={async ()=>{
                        if(window.confirm('삭제하시겠습니까?')) {
                            await supabase.from('sales_records').delete().eq('id', r.id);
                            fetchMonthlyRecords();
                        }
                    }}>삭제</button>
                  </td>
                </tr>
              ))}
              {monthlyRecords.length === 0 && (
                <tr><td colSpan="8" style={{padding:'40px', textAlign:'center', color:'#999'}}>해당 월에 등록된 데이터가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '25px', backgroundColor: '#f4f7f9', minHeight: '100vh' },
  pageTitle: { margin: 0, color: '#1a365d', fontWeight: '900' },
  topSection: { display: 'flex', gap: '20px', marginBottom: '20px' },
  card: { flex: 2, backgroundColor: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  summaryCard: { flex: 1, backgroundColor: '#ebf8ff', padding: '20px', borderRadius: '15px', border: '1px solid #bee3f8' },
  cardTitle: { margin: '0 0 15px 0', fontSize: '16px', color: '#2d3748', borderLeft: '4px solid #3182ce', paddingLeft: '10px' },
  textArea: { width: '100%', height: '150px', border: '1px solid #cbd5e0', borderRadius: '10px', padding: '10px', fontSize: '13px', marginBottom: '15px' },
  blueBtn: { width: '100%', padding: '12px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  greenBtn: { padding: '15px 40px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(56, 161, 105, 0.4)' },
  summaryGrid: { display: 'flex', flexDirection: 'column', gap: '8px' },
  summaryItem: { fontSize: '14px', color: '#4a5568' },
  totalBox: { marginTop: '15px', paddingTop: '10px', borderTop: '2px solid #bee3f8', textAlign: 'right', fontWeight: 'bold', fontSize: '18px', color: '#2b6cb0' },
  listCard: { backgroundColor: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  listHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  filterGroup: { display: 'flex', gap: '10px' },
  select: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '14px' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  thead: { backgroundColor: '#f8fafc', borderBottom: '2px solid #edf2f7' },
  tr: { borderBottom: '1px solid #edf2f7' },
  badge: { padding: '4px 10px', borderRadius: '6px', color: 'white', fontSize: '11px', fontWeight: 'bold' },
  smallDeleteBtn: { padding: '4px 8px', backgroundColor: '#fed7d7', color: '#c53030', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }
};

export default WorkLog;