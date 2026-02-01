// src/components/CEOReport.jsx (전체 교체용)
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line 
} from 'recharts';
// 새로 만든 월간 리포트 컴포넌트 임포트
import CEOMonthlyReport from './CEOMonthlyReport';

function CEOReport() {
  // 'daily' 또는 'monthly' 상태 관리
  const [viewMode, setViewMode] = useState('daily');
  
  // --- 기존 일일 리포트 로직 시작 ---
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState({ daily: { workSales: 0, otherIncome: 0, expense: 0, netProfit: 0 }, dailyClients: [], equipmentBar: [], dailyTrend: [] });
  const [notes, setNotes] = useState([]);
  const [expenseList, setExpenseList] = useState([]);
  const EQ_COLORS = { '슬리팅 1': '#3182ce', '슬리팅 2': '#805ad5', '레베링': '#38a169', '기타': '#718096' };

  useEffect(() => { if (viewMode === 'daily') { fetchCEOData(); fetchNotes(); } }, [selectedDate, viewMode]);

  const fetchCEOData = async () => {
    const [year, month] = selectedDate.split('-');
    const { data: dSales } = await supabase.from('sales_records').select('*').eq('work_date', selectedDate);
    const { data: dLedger } = await supabase.from('daily_ledger').select('*').eq('trans_date', selectedDate);
    const { data: mSales } = await supabase.from('sales_records').select('work_date, total_price').gte('work_date', `${year}-${month}-01`).lte('work_date', selectedDate);
    const calcTotal = (arr, type) => arr?.filter(r => !type || r.type === type).reduce((sum, r) => sum + (Number(r.total_price || r.amount) || 0), 0) || 0;
    const realtimeExpenses = dLedger?.filter(item => item.type === '지출').map(item => ({ id: item.id, item: item.description, amount: item.amount, note: item.note || '' })) || [];
    setExpenseList(realtimeExpenses);
    const clientMap = {}; dSales?.forEach(s => { const n = s.customer_name || s.companies?.name || '미지정'; clientMap[n] = (clientMap[n] || 0) + s.total_price; });
    const eqStats = { '슬리팅 1': { s:0, c:0 }, '슬리팅 2': { s:0, c:0 }, '레베링': { s:0, c:0 } };
    dSales?.forEach(s => { if(eqStats[s.work_type]) { eqStats[s.work_type].s += s.total_price; eqStats[s.work_type].c += 1; } });
    const trend = []; for (let i = 1; i <= new Date(selectedDate).getDate(); i++) { const d = `${year}-${month}-${i.toString().padStart(2, '0')}`; if ([1,2,3,4,5].includes(new Date(d).getDay())) { const s = mSales?.filter(x => x.work_date === d).reduce((a, b) => a + b.total_price, 0) || 0; trend.push({ name: `${i}일`, sales: Math.round(s / 1000) }); } }
    setReportData({ daily: { workSales: calcTotal(dSales), otherIncome: calcTotal(dLedger, '수입'), expense: calcTotal(dLedger, '지출'), netProfit: (calcTotal(dSales) + calcTotal(dLedger, '수입')) - calcTotal(dLedger, '지출') }, dailyClients: Object.entries(clientMap).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value), equipmentBar: Object.entries(eqStats).map(([name, d]) => ({ name, value: d.s, count: d.c })), dailyTrend: trend });
  };
  const fetchNotes = useCallback(async () => { const { data } = await supabase.from('daily_notes').select('*').eq('work_date', selectedDate).order('created_at', { ascending: true }); setNotes(data || []); }, [selectedDate]);
  const formattedDate = () => { const d = new Date(selectedDate); return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`; };
  // --- 기존 일일 리포트 로직 끝 ---

  // 뷰 모드에 따라 화면 렌더링 분기
  if (viewMode === 'monthly') {
    return (
        <div>
            {/* 상단 탭 버튼 */}
            <div className="no-print" style={{ padding: '20px 20px 0 20px', backgroundColor: '#e2e8f0', display: 'flex', gap: '10px' }}>
                <button onClick={() => setViewMode('daily')} style={styles.inactiveTab}>일일 브리핑</button>
                <button onClick={() => setViewMode('monthly')} style={styles.activeTab}>월간 분석</button>
            </div>
            <CEOMonthlyReport />
        </div>
    );
  }

  // 일일 리포트 뷰
  return (
    <div className="report-container" style={styles.container}>
      {/* 상단 탭 버튼 및 컨트롤 */}
      <div className="no-print">
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
            <button onClick={() => setViewMode('daily')} style={styles.activeTab}>일일 브리핑</button>
            <button onClick={() => setViewMode('monthly')} style={styles.inactiveTab}>월간 분석</button>
        </div>
        <div style={styles.headerControl}>
            <h1 style={styles.pageTitle}>오성철강 CEO 일일 경영 브리핑 ({formattedDate()})</h1>
            <div style={styles.controlGroup}>
                <button onClick={() => window.print()} style={styles.printBtn}>🖨️ 출력 보기</button>
                <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} style={styles.datePicker} />
            </div>
        </div>
      </div>

      {/* 일일 리포트 본문 (기존 코드 유지) */}
      <div className="printable-area" style={styles.reportContent}>
        <h2 className="print-only title" style={{display:'none', textAlign:'center', marginBottom:'20px'}}>오성철강 CEO 일일 경영 브리핑 ({formattedDate()})</h2>
        <div style={styles.topGrid}>
          <div style={styles.mainCard}><h3 style={styles.cardTitle}>총 수익</h3><p style={styles.mainValue}>{(reportData.daily.workSales + reportData.daily.otherIncome).toLocaleString()}원</p></div>
          <div style={styles.mainCard}><h3 style={styles.cardTitle}>총 지출</h3><p style={styles.mainValue}>{reportData.daily.expense.toLocaleString()}원</p></div>
          <div style={styles.mainCard}><h3 style={styles.cardTitle}>영업 이익</h3><p style={styles.mainValue}>{reportData.daily.netProfit.toLocaleString()}원</p></div>
        </div>
        <div style={styles.middleGrid}>
            <div style={{...styles.contentCard, flex: 1}}><h3 style={styles.cardTitle}>장비별 상세 실적</h3><div style={styles.eqBarChart}>{reportData.equipmentBar.map(e => { const totalSales = reportData.daily.workSales || 1; const widthPercentage = totalSales > 0 ? (e.value / totalSales) * 100 : 0; return ( <div key={e.name} style={styles.eqBarItem}> <span style={styles.eqName}>{e.name}</span> <div style={styles.barContainer}> <div className="color-bar" style={{...styles.barFill, width: `${widthPercentage}%`, backgroundColor: EQ_COLORS[e.name]}}></div> <span style={styles.barLabel}>{e.value.toLocaleString()}원 ({e.count}건)</span> </div> </div> ); })}</div></div>
            <div style={{...styles.contentCard, flex: 1}}><h3 style={styles.cardTitle}>비용 지출 내역 ({expenseList.length}건)</h3><div style={styles.tableContainer}><table style={styles.expenseTable}><thead><tr><th style={styles.th}>항목</th><th style={{...styles.th, textAlign: 'right'}}>금액</th><th style={styles.th}>비고</th></tr></thead><tbody>{expenseList.length > 0 ? ( expenseList.map(expense => ( <tr key={expense.id}> <td style={styles.td}>{expense.item}</td> <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold'}}>{expense.amount.toLocaleString()}원</td> <td style={styles.td}>{expense.note}</td> </tr> )) ) : ( <tr><td colSpan="3" style={{...styles.td, textAlign:'center', color:'#999'}}>내역 없음</td></tr> )}</tbody></table></div></div>
        </div>
        <div style={styles.bottomGrid}>
            <div style={styles.contentCard}><h3 style={styles.cardTitle}>이달의 매출 추이 (천원)</h3><div style={{height:'200px'}}><ResponsiveContainer><LineChart data={reportData.dailyTrend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Line type="monotone" dataKey="sales" stroke="#3182ce" strokeWidth={3}/></LineChart></ResponsiveContainer></div></div>
            <div style={styles.contentCard}><h3 style={styles.cardTitle}>거래처 매출</h3><div style={styles.clientList}>{reportData.dailyClients.map((c, i) => ( <div key={i} style={styles.clientItem}> <span style={styles.clientName}>{c.name}</span> <div style={styles.clientBarContainer}> <div className="color-bar" style={{...styles.clientBarFill, width: `${(c.value / (reportData.daily.workSales || 1)) * 100}%`}}></div> <span style={styles.clientValue}>{c.value.toLocaleString()}원</span> </div> </div> )) }</div></div>
            <div style={styles.contentCard}><h3 style={styles.cardTitle}>주요 내용</h3><div style={styles.noteList}>{notes.map((n, i) => ( <div key={i} style={styles.noteItem}> <span>• {n.content}</span> <button className="no-print" onClick={()=>supabase.from('daily_notes').delete().eq('id', n.id).then(()=>fetchNotes())} style={styles.deleteNoteBtn}>×</button> </div> ))}</div></div>
        </div>
      </div>
      <style>{` @media print { @page { size: A4 landscape; margin: 10mm; } body { background-color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .no-print { display: none !important; } .report-container { padding: 0 !important; margin: 0 !important; } .printable-area { box-shadow: none !important; padding: 0 !important; border-radius: 0 !important; } .print-only.title { display: block !important; font-size: 22px; font-weight: bold; margin-bottom: 15px; color: #1a365d; } .mainCard, .contentCard { break-inside: avoid; border: 1px solid #ccc !important; box-shadow: none !important; background-color: #f8fafc !important; } .color-bar { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .tableContainer, .clientList, .noteList { max-height: none !important; overflow: visible !important; } .topGrid, .middleGrid, .bottomGrid { gap: 15px !important; margin-bottom: 15px !important; } .mainValue { font-size: 24px !important; } } `}</style>
    </div>
  );
}

// 탭 스타일 추가
const styles = {
  activeTab: { padding: '10px 20px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '5px 5px 0 0', fontWeight: 'bold', cursor: 'pointer' },
  inactiveTab: { padding: '10px 20px', backgroundColor: '#cbd5e0', color: '#4a5568', border: 'none', borderRadius: '5px 5px 0 0', fontWeight: 'bold', cursor: 'pointer' },
  // 기존 스타일 유지...
  container: { padding: '20px', backgroundColor: '#e2e8f0', minHeight: '100vh' },
  headerControl: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '15px 20px', backgroundColor: 'white', color: '#2d3748', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  pageTitle: { margin: 0, fontSize: '24px', fontWeight: 'bold' },
  controlGroup: { display: 'flex', gap: '10px' },
  printBtn: { padding: '8px 15px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' },
  datePicker: { padding: '8px', borderRadius: '5px', border: '1px solid #cbd5e0', backgroundColor: 'white', color: '#333' },
  reportContent: { backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' },
  topGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' },
  mainCard: { backgroundColor: '#f7fafc', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #edf2f7' },
  cardTitle: { margin: '0 0 10px 0', fontSize: '16px', color: '#4a5568', fontWeight: 'bold' },
  mainValue: { margin: 0, fontSize: '28px', fontWeight: '900', color: '#2d3748' },
  middleGrid: { display: 'flex', gap: '20px', marginBottom: '20px' },
  contentCard: { backgroundColor: '#f7fafc', padding: '20px', borderRadius: '12px', border: '1px solid #edf2f7' },
  eqBarChart: { display: 'flex', flexDirection: 'column', gap: '12px' },
  eqBarItem: { display: 'flex', alignItems: 'center', fontSize: '14px' },
  eqName: { width: '80px', fontWeight: 'bold', color: '#4a5568' },
  barContainer: { flex: 1, backgroundColor: '#edf2f7', borderRadius: '5px', height: '24px', position: 'relative', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '5px' },
  barLabel: { position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 'bold', color: '#2d3748', textShadow: '0 0 2px white' },
  tableContainer: { maxHeight: '200px', overflowY: 'auto' },
  expenseTable: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#4a5568', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#f7fafc' },
  td: { padding: '10px', borderBottom: '1px solid #edf2f7', color: '#2d3748' },
  bottomGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' },
  clientList: { display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' },
  clientItem: { display: 'flex', alignItems: 'center', fontSize: '13px' },
  clientName: { width: '80px', color: '#4a5568' },
  clientBarContainer: { flex: 1, backgroundColor: '#edf2f7', borderRadius: '4px', height: '18px', position: 'relative', overflow: 'hidden' },
  clientBarFill: { height: '100%', backgroundColor: '#3182ce', borderRadius: '4px' },
  clientValue: { position: 'absolute', top: '50%', right: '8px', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 'bold', color: '#2d3748' },
  noteList: { display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' },
  noteItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' },
  deleteNoteBtn: { border: 'none', backgroundColor: 'transparent', color: '#a0aec0', cursor: 'pointer', fontSize: '16px', padding: '0 5px' }
};

export default CEOReport;