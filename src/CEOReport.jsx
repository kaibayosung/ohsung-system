import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient'; // src 폴더 내 위치
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line 
} from 'recharts';
// components 폴더 내 월간 리포트 임포트
import CEOMonthlyReport from './components/CEOMonthlyReport';

function CEOReport() {
  const [viewMode, setViewMode] = useState('daily'); // 'daily' 또는 'monthly'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState({ 
    daily: { workSales: 0, otherIncome: 0, expense: 0, netProfit: 0 }, 
    dailyClients: [], 
    equipmentBar: [], 
    dailyTrend: [] 
  });
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [expenseList, setExpenseList] = useState([]);
  const EQ_COLORS = { '슬리팅 1': '#3182ce', '슬리팅 2': '#805ad5', '레베링': '#38a169', '기타': '#718096' };

  useEffect(() => { 
    if (viewMode === 'daily') { 
      fetchCEOData(); 
      fetchNotes(); 
    } 
  }, [selectedDate, viewMode]);

  const fetchCEOData = async () => {
    const [year, month] = selectedDate.split('-');
    const { data: dSales } = await supabase.from('sales_records').select('*').eq('work_date', selectedDate);
    const { data: dLedger } = await supabase.from('daily_ledger').select('*').eq('trans_date', selectedDate);
    const { data: mSales } = await supabase.from('sales_records').select('work_date, total_price').gte('work_date', `${year}-${month}-01`).lte('work_date', selectedDate);
    
    // 지출 내역 가공 (지불 상태 포함)
    const realtimeExpenses = dLedger?.filter(item => item.type === '지출').map(item => ({ 
      id: item.id, 
      item: item.description || item.customer, 
      amount: item.amount, 
      status: item.status || '지불완료' // 상태값 반영
    })) || [];
    setExpenseList(realtimeExpenses);

    // 총 합계 계산 (지불완료된 건만 실제 이익에 반영)
    const calcTotal = (arr, type) => arr?.filter(r => (!type || r.type === type) && r.status !== '지불예정').reduce((sum, r) => sum + (Number(r.total_price || r.amount) || 0), 0) || 0;
    
    const clientMap = {}; 
    dSales?.forEach(s => { 
      const n = s.customer_name || '미지정'; 
      clientMap[n] = (clientMap[n] || 0) + s.total_price; 
    });

    const eqStats = { '슬리팅 1': { s:0, c:0 }, '슬리팅 2': { s:0, c:0 }, '레베링': { s:0, c:0 } };
    dSales?.forEach(s => { if(eqStats[s.work_type]) { eqStats[s.work_type].s += s.total_price; eqStats[s.work_type].c += 1; } });
    
    const trend = []; 
    for (let i = 1; i <= new Date(selectedDate).getDate(); i++) { 
      const d = `${year}-${month}-${i.toString().padStart(2, '0')}`; 
      const s = mSales?.filter(x => x.work_date === d).reduce((a, b) => a + b.total_price, 0) || 0; 
      trend.push({ name: `${i}일`, sales: Math.round(s / 1000) }); 
    }

    setReportData({ 
      daily: { 
        workSales: calcTotal(dSales), 
        otherIncome: calcTotal(dLedger, '수입'), 
        expense: calcTotal(dLedger, '지출'), 
        netProfit: (calcTotal(dSales) + calcTotal(dLedger, '수입')) - calcTotal(dLedger, '지출') 
      }, 
      dailyClients: Object.entries(clientMap).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value), 
      equipmentBar: Object.entries(eqStats).map(([name, d]) => ({ name, value: d.s, count: d.c })), 
      dailyTrend: trend 
    });
  };

  const fetchNotes = useCallback(async () => {
    const { data } = await supabase.from('daily_notes').select('*').eq('work_date', selectedDate).order('created_at', { ascending: true });
    setNotes(data || []);
  }, [selectedDate]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await supabase.from('daily_notes').insert([{ work_date: selectedDate, content: newNote }]);
    setNewNote('');
    fetchNotes();
  };

  const handleDeleteNote = async (id) => {
    if (window.confirm("삭제하시겠습니까?")) {
      await supabase.from('daily_notes').delete().eq('id', id);
      fetchNotes();
    }
  };

  const formattedDate = () => { const d = new Date(selectedDate); return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`; };

  return (
    <div style={styles.container}>
      {/* 탭 네비게이션 */}
      <div className="no-print" style={styles.tabBar}>
        <button onClick={() => setViewMode('daily')} style={viewMode === 'daily' ? styles.activeTab : styles.inactiveTab}>일일 브리핑</button>
        <button onClick={() => setViewMode('monthly')} style={viewMode === 'monthly' ? styles.activeTab : styles.inactiveTab}>월간 분석</button>
      </div>

      {viewMode === 'daily' ? (
        <div className="printable-area" style={styles.reportContent}>
          {/* 헤더 컨트롤 */}
          <div className="no-print" style={styles.headerControl}>
            <h1 style={styles.pageTitle}>오성철강 CEO 일일 경영 브리핑 ({formattedDate()})</h1>
            <div style={styles.controlGroup}>
              <button onClick={() => window.print()} style={styles.printBtn}>🖨️ 출력 보기</button>
              <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} style={styles.datePicker} />
            </div>
          </div>

          {/* 1단: 요약 카드 */}
          <div style={styles.topGrid}>
            <div style={styles.mainCard}><h3 style={styles.cardTitle}>총 수익</h3><p style={styles.mainValue}>{(reportData.daily.workSales + reportData.daily.otherIncome).toLocaleString()}원</p></div>
            <div style={styles.mainCard}><h3 style={styles.cardTitle}>총 지출</h3><p style={{...styles.mainValue, color:'#e53e3e'}}>{reportData.daily.expense.toLocaleString()}원</p></div>
            <div style={styles.mainCard}><h3 style={styles.cardTitle}>영업 이익</h3><p style={{...styles.mainValue, color:'#38a169'}}>{reportData.daily.netProfit.toLocaleString()}원</p></div>
          </div>

          {/* 2단: 장비 및 지출 리스트 */}
          <div style={styles.middleGrid}>
            <div style={{...styles.contentCard, flex: 1.2}}>
              <h3 style={styles.cardTitle}>장비별 상세 실적</h3>
              <div style={styles.eqBarChart}>
                {reportData.equipmentBar.map(e => (
                  <div key={e.name} style={styles.eqBarItem}>
                    <span style={styles.eqName}>{e.name}</span>
                    <div style={styles.barContainer}>
                      <div className="color-bar" style={{...styles.barFill, width: `${(e.value / (reportData.daily.workSales || 1)) * 100}%`, backgroundColor: EQ_COLORS[e.name]}}></div>
                      <span style={styles.barLabel}>{e.value.toLocaleString()}원 ({e.count}건)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{...styles.contentCard, flex: 1}}>
              <h3 style={styles.cardTitle}>비용 지출 내역 ({expenseList.length}건)</h3>
              <div style={styles.tableContainer}>
                <table style={styles.expenseTable}>
                  <thead><tr><th>항목</th><th style={{textAlign:'right'}}>금액</th></tr></thead>
                  <tbody>
                    {expenseList.length > 0 ? expenseList.map(ex => (
                      <tr key={ex.id}>
                        <td style={styles.td}>
                          {ex.status === '지불예정' && <span style={{color: '#e53e3e', fontWeight: 'bold', marginRight: '5px'}}>[예정]</span>}
                          {ex.item}
                        </td>
                        <td style={{...styles.td, textAlign:'right', fontWeight:'bold'}}>{ex.amount.toLocaleString()}원</td>
                      </tr>
                    )) : <tr><td colSpan="2" style={{textAlign:'center', padding:'20px', color:'#999'}}>지출 내역 없음</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 3단: 추이, 거래처, 메모 */}
          <div style={styles.bottomGrid}>
            <div style={styles.contentCard}>
              <h3 style={styles.cardTitle}>이달의 매출 추이 (천원)</h3>
              <div style={{height:'180px'}}>
                <ResponsiveContainer><LineChart data={reportData.dailyTrend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Line type="monotone" dataKey="sales" stroke="#3182ce" strokeWidth={3}/></LineChart></ResponsiveContainer>
              </div>
            </div>
            <div style={styles.contentCard}>
              <h3 style={styles.cardTitle}>거래처 매출</h3>
              <div style={styles.clientList}>
                {reportData.dailyClients.map((c, i) => (
                  <div key={i} style={styles.clientItem}>
                    <span style={styles.clientName}>{c.name}</span>
                    <div style={styles.clientBarContainer}><div className="color-bar" style={{...styles.clientBarFill, width: `${(c.value / (reportData.daily.workSales || 1)) * 100}%`}}></div><span style={styles.clientValue}>{c.value.toLocaleString()}원</span></div>
                  </div>
                ))}
              </div>
            </div>
            <div style={styles.contentCard}>
              <h3 style={styles.cardTitle}>주요 내용</h3>
              <div className="no-print" style={styles.noteInputGroup}>
                <input value={newNote} onChange={e=>setNewNote(e.target.value)} onKeyPress={e=>e.key==='Enter'&&handleAddNote()} placeholder="메모 입력 후 엔터" style={styles.noteInput} />
              </div>
              <div style={styles.noteList}>
                {notes.map(n => (
                  <div key={n.id} style={styles.noteItem}>
                    <span>• {n.content}</span>
                    <button className="no-print" onClick={()=>handleDeleteNote(n.id)} style={styles.delBtn}>×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <CEOMonthlyReport />
      )}
      <style>{` @media print { .no-print { display: none !important; } body { background-color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .report-container { padding: 0 !important; } .printable-area { box-shadow: none !important; padding: 0 !important; } .color-bar { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } } `}</style>
    </div>
  );
}

const styles = {
  container: { padding: '36px', backgroundColor: '#e2e8f0', minHeight: '100vh' },
  tabBar: { display: 'flex', gap: '7px' },
  activeTab: { padding: '16px 30px', backgroundColor: 'white', color: '#3182ce', border: 'none', borderRadius: '14px 14px 0 0', fontWeight: 'bold', cursor: 'pointer', fontSize: '18px' },
  inactiveTab: { padding: '16px 30px', backgroundColor: '#cbd5e0', color: '#4a5568', border: 'none', borderRadius: '14px 14px 0 0', fontWeight: 'bold', cursor: 'pointer', fontSize: '18px' },
  headerControl: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '26px', paddingBottom:'18px', borderBottom:'1px solid #edf2f7' },
  reportContent: { backgroundColor: 'white', padding: '36px', borderRadius: '0 18px 18px 18px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' },
  pageTitle: { margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#1a365d' },
  controlGroup: { display: 'flex', gap: '14px' },
  printBtn: { padding: '12px 20px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '9px', fontWeight: 'bold', cursor: 'pointer', fontSize: '17px' },
  datePicker: { padding: '12px', borderRadius: '9px', border: '1px solid #cbd5e0', fontSize: '17px' },
  topGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' },
  mainCard: { backgroundColor: '#f8fafc', padding: '28px', borderRadius: '16px', textAlign: 'center', border: '1px solid #edf2f7' },
  cardTitle: { margin: '0 0 13px 0', fontSize: '18px', color: '#4a5568', fontWeight: 'bold' },
  mainValue: { margin: 0, fontSize: '36px', fontWeight: '900', color: '#2d3748' },
  middleGrid: { display: 'flex', gap: '24px', marginBottom: '24px' },
  contentCard: { backgroundColor: '#f8fafc', padding: '22px', borderRadius: '16px', border: '1px solid #edf2f7' },
  eqBarChart: { display: 'flex', flexDirection: 'column', gap: '13px' },
  eqBarItem: { display: 'flex', alignItems: 'center', fontSize: '17px' },
  eqName: { width: '90px', fontWeight: 'bold' },
  barContainer: { flex: 1, backgroundColor: '#edf2f7', borderRadius: '7px', height: '30px', position: 'relative', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '7px' },
  barLabel: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', fontWeight: 'bold' },
  tableContainer: { maxHeight: '230px', overflowY: 'auto' },
  expenseTable: { width: '100%', borderCollapse: 'collapse', fontSize: '17px' },
  td: { padding: '13px', borderBottom: '1px solid #edf2f7' },
  th: { padding: '13px', borderBottom: '2px solid #e2e8f0', textAlign: 'left', backgroundColor: '#f8fafc', position: 'sticky', top: 0 },
  bottomGrid: { display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '24px' },
  clientList: { display: 'flex', flexDirection: 'column', gap: '11px' },
  clientItem: { display: 'flex', alignItems: 'center', fontSize: '16px' },
  clientName: { width: '86px', color: '#4a5568', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  clientBarContainer: { flex: 1, backgroundColor: '#edf2f7', height: '20px', position: 'relative', borderRadius: '5px' },
  clientBarFill: { height: '100%', backgroundColor: '#3182ce', borderRadius: '5px' },
  clientValue: { position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: 'bold' },
  noteInputGroup: { marginBottom: '13px' },
  noteInput: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e0', boxSizing: 'border-box', fontSize: '17px' },
  noteList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  noteItem: { display: 'flex', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: 'white', borderRadius: '8px', fontSize: '16px', border: '1px solid #edf2f7' },
  delBtn: { border: 'none', backgroundColor: 'transparent', color: '#e53e3e', cursor: 'pointer', fontSize: '17px' }
};

export default CEOReport;
