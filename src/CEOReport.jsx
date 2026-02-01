import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import CEOMonthlyReport from './components/CEOMonthlyReport'; // components 폴더에서 임포트

function CEOReport() {
  const [viewMode, setViewMode] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState({ daily: { workSales: 0, otherIncome: 0, expense: 0, netProfit: 0 }, dailyClients: [], equipmentBar: [], dailyTrend: [] });
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [expenseList, setExpenseList] = useState([]);
  const EQ_COLORS = { '슬리팅 1': '#3182ce', '슬리팅 2': '#805ad5', '레베링': '#38a169', '기타': '#718096' };

  useEffect(() => { if (viewMode === 'daily') { fetchCEOData(); fetchNotes(); } }, [selectedDate, viewMode]);

  const fetchCEOData = async () => {
    const [year, month] = selectedDate.split('-');
    const { data: dSales } = await supabase.from('sales_records').select('*').eq('work_date', selectedDate);
    const { data: dLedger } = await supabase.from('daily_ledger').select('*').eq('trans_date', selectedDate);
    const { data: mSales } = await supabase.from('sales_records').select('work_date, total_price').gte('work_date', `${year}-${month}-01`).lte('work_date', selectedDate);
    
    setExpenseList(dLedger?.filter(i => i.type === '지출').map(i => ({ id: i.id, item: i.description, amount: i.amount, note: i.note || '' })) || []);
    const calcTotal = (arr, type) => arr?.filter(r => !type || r.type === type).reduce((sum, r) => sum + (Number(r.total_price || r.amount) || 0), 0) || 0;
    const clientMap = {}; dSales?.forEach(s => { const n = s.customer_name || '미지정'; clientMap[n] = (clientMap[n] || 0) + s.total_price; });
    const eqStats = { '슬리팅 1': { s:0, c:0 }, '슬리팅 2': { s:0, c:0 }, '레베링': { s:0, c:0 } };
    dSales?.forEach(s => { if(eqStats[s.work_type]) { eqStats[s.work_type].s += s.total_price; eqStats[s.work_type].c += 1; } });
    
    const trend = []; for (let i = 1; i <= new Date(selectedDate).getDate(); i++) { const d = `${year}-${month}-${i.toString().padStart(2, '0')}`; const s = mSales?.filter(x => x.work_date === d).reduce((a, b) => a + b.total_price, 0) || 0; trend.push({ name: `${i}일`, sales: Math.round(s / 1000) }); }
    setReportData({ daily: { workSales: calcTotal(dSales), otherIncome: calcTotal(dLedger, '수입'), expense: calcTotal(dLedger, '지출'), netProfit: (calcTotal(dSales) + calcTotal(dLedger, '수입')) - calcTotal(dLedger, '지출') }, dailyClients: Object.entries(clientMap).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value), equipmentBar: Object.entries(eqStats).map(([name, d]) => ({ name, value: d.s, count: d.c })), dailyTrend: trend });
  };

  const fetchNotes = useCallback(async () => { const { data } = await supabase.from('daily_notes').select('*').eq('work_date', selectedDate).order('created_at', { ascending: true }); setNotes(data || []); }, [selectedDate]);
  const handleAddNote = async () => { if (!newNote.trim()) return; await supabase.from('daily_notes').insert([{ work_date: selectedDate, content: newNote }]); setNewNote(''); fetchNotes(); };
  const handleDeleteNote = async (id) => { if (window.confirm("삭제하시겠습니까?")) { await supabase.from('daily_notes').delete().eq('id', id); fetchNotes(); } };
  const formattedDate = () => { const d = new Date(selectedDate); return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`; };

  return (
    <div style={styles.container}>
      <div className="no-print" style={styles.tabBar}>
        <button onClick={() => setViewMode('daily')} style={viewMode === 'daily' ? styles.activeTab : styles.inactiveTab}>일일 브리핑</button>
        <button onClick={() => setViewMode('monthly')} style={viewMode === 'monthly' ? styles.activeTab : styles.inactiveTab}>월간 분석</button>
      </div>

      {viewMode === 'daily' ? (
        <div className="printable-area" style={styles.reportContent}>
          <div className="no-print" style={styles.headerControl}>
            <h1 style={styles.pageTitle}>오성철강 CEO 일일 브리핑 ({formattedDate()})</h1>
            <div style={styles.controlGroup}>
              <button onClick={() => window.print()} style={styles.printBtn}>🖨️ 출력 보기</button>
              <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} style={styles.datePicker} />
            </div>
          </div>
          {/* 상단 3단 요약 카드 */}
          <div style={styles.topGrid}>
            <div style={styles.mainCard}><h3>총 수익</h3><p style={styles.mainValue}>{ (reportData.daily.workSales + reportData.daily.otherIncome).toLocaleString() }원</p></div>
            <div style={styles.mainCard}><h3>총 지출</h3><p style={{...styles.mainValue, color:'#e53e3e'}}>{ reportData.daily.expense.toLocaleString() }원</p></div>
            <div style={styles.mainCard}><h3>영업 이익</h3><p style={{...styles.mainValue, color:'#38a169'}}>{ reportData.daily.netProfit.toLocaleString() }원</p></div>
          </div>
          {/* 중간 2단 그리드 (장비별 / 지출내역) */}
          <div style={styles.middleGrid}>
            <div style={{...styles.contentCard, flex: 1}}><h3>장비별 상세 실적</h3><div style={styles.eqBarChart}>{reportData.equipmentBar.map(e => ( <div key={e.name} style={styles.eqBarItem}><span>{e.name}</span><div style={styles.barContainer}><div className="color-bar" style={{...styles.barFill, width:`${(e.value/(reportData.daily.workSales||1))*100}%`, backgroundColor:EQ_COLORS[e.name]}}></div><span style={styles.barLabel}>{e.value.toLocaleString()}원</span></div></div> ))}</div></div>
            <div style={{...styles.contentCard, flex: 1}}><h3>비용 지출 내역 ({expenseList.length}건)</h3><div style={styles.tableContainer}><table style={styles.expenseTable}><thead><tr><th>항목</th><th style={{textAlign:'right'}}>금액</th></tr></thead><tbody>{expenseList.map(ex => ( <tr key={ex.id}><td>{ex.item}</td><td style={{textAlign:'right', fontWeight:'bold'}}>{ex.amount.toLocaleString()}원</td></tr> ))}</tbody></table></div></div>
          </div>
          {/* 하단 3단 그리드 (추이 / 거래처 / 메모) */}
          <div style={styles.bottomGrid}>
            <div style={styles.contentCard}><h3>이달의 매출 추이</h3><div style={{height:150}}><ResponsiveContainer><LineChart data={reportData.dailyTrend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><Tooltip/><Line type="monotone" dataKey="sales" stroke="#3182ce" strokeWidth={3}/></LineChart></ResponsiveContainer></div></div>
            <div style={styles.contentCard}><h3>거래처 매출</h3><div style={styles.clientList}>{reportData.dailyClients.map((c, i) => ( <div key={i} style={styles.clientItem}><span>{c.name}</span><div style={styles.clientBarContainer}><div className="color-bar" style={{...styles.clientBarFill, width:`${(c.value/(reportData.daily.workSales||1))*100}%`}}></div></div></div> ))}</div></div>
            <div style={styles.contentCard}><h3>주요 내용 (메모)</h3><div className="no-print"><input value={newNote} onChange={e=>setNewNote(e.target.value)} onKeyPress={e=>e.key==='Enter'&&handleAddNote()} placeholder="입력 후 추가" style={styles.noteInput} /></div><div style={styles.noteList}>{notes.map(n => ( <div key={n.id} style={styles.noteItem}><span>• {n.content}</span><button className="no-print" onClick={()=>handleDeleteNote(n.id)} style={styles.delBtn}>×</button></div> ))}</div></div>
          </div>
        </div>
      ) : (
        <CEOMonthlyReport />
      )}
      <style>{` @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } } `}</style>
    </div>
  );
}

const styles = {
  container: { padding: '20px', backgroundColor: '#e2e8f0', minHeight: '100vh' },
  tabBar: { display: 'flex', gap: '5px' },
  activeTab: { padding: '12px 25px', backgroundColor: 'white', color: '#3182ce', border: 'none', borderRadius: '10px 10px 0 0', fontWeight: 'bold', cursor: 'pointer' },
  inactiveTab: { padding: '12px 25px', backgroundColor: '#cbd5e0', color: '#4a5568', border: 'none', borderRadius: '10px 10px 0 0', fontWeight: 'bold', cursor: 'pointer' },
  headerControl: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  reportContent: { backgroundColor: 'white', padding: '30px', borderRadius: '0 15px 15px 15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  pageTitle: { margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#1a365d' },
  controlGroup: { display: 'flex', gap: '10px' },
  printBtn: { padding: '6px 15px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  datePicker: { padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e0' },
  topGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' },
  mainCard: { backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #edf2f7' },
  mainValue: { margin: '10px 0 0 0', fontSize: '24px', fontWeight: '900' },
  middleGrid: { display: 'flex', gap: '20px', marginBottom: '20px' },
  contentCard: { backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #edf2f7' },
  eqBarChart: { display: 'flex', flexDirection: 'column', gap: '8px' },
  eqBarItem: { display: 'flex', alignItems: 'center', fontSize: '12px' },
  barContainer: { flex: 1, backgroundColor: '#edf2f7', borderRadius: '4px', height: '20px', position: 'relative', overflow: 'hidden', marginLeft:'10px' },
  barFill: { height: '100%', borderRadius: '4px' },
  barLabel: { position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 'bold' },
  tableContainer: { maxHeight: '150px', overflowY: 'auto' },
  expenseTable: { width: '100%', fontSize: '13px' },
  bottomGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' },
  clientList: { display: 'flex', flexDirection: 'column', gap: '5px' },
  clientItem: { display: 'flex', alignItems: 'center', fontSize: '11px' },
  clientBarContainer: { flex: 1, backgroundColor: '#edf2f7', height: '10px', marginLeft:'5px' },
  clientBarFill: { height: '100%', backgroundColor: '#3182ce' },
  noteInput: { width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e0', fontSize: '12px', marginBottom:'10px' },
  noteList: { display: 'flex', flexDirection: 'column', gap: '5px' },
  noteItem: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '5px', backgroundColor: 'white', borderRadius: '4px' },
  delBtn: { border: 'none', backgroundColor: 'transparent', color: '#e53e3e', cursor: 'pointer' }
};

export default CEOReport;