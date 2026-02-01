import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, LineChart, Line, Legend
} from 'recharts';

// 아이콘 컴포넌트
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const SaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38a169" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>;

function CEOReport() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState({
    daily: { workSales: 0, otherIncome: 0, expense: 0, netProfit: 0 },
    dailyClients: [], otherIncomeList: [], expenseList: [], equipmentBar: [], dailyTrend: []
  });
  const [notes, setNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const EQ_COLORS = { '슬리팅 1': '#3182ce', '슬리팅 2': '#805ad5', '레베링': '#38a169', '기타': '#718096' };

  useEffect(() => { fetchCEOData(); fetchNotes(); }, [selectedDate]);

  const fetchCEOData = async () => {
    const [year, month] = selectedDate.split('-');
    const monthStart = `${year}-${month}-01`;
    try {
      const { data: dSales } = await supabase.from('sales_records').select('*, companies(name)').eq('work_date', selectedDate);
      const { data: dLedger } = await supabase.from('daily_ledger').select('*').eq('trans_date', selectedDate);
      const { data: mSales } = await supabase.from('sales_records').select('work_date, total_price').gte('work_date', monthStart).lte('work_date', selectedDate);

      const calcTotal = (arr, type) => arr?.filter(r => !type || r.type === type).reduce((sum, r) => sum + (Number(r.total_price || r.amount) || 0), 0) || 0;
      
      const todayCompMap = {};
      dSales?.forEach(s => {
        const name = s.customer_name || s.companies?.name || '미지정';
        todayCompMap[name] = (todayCompMap[name] || 0) + (Number(s.total_price) || 0);
      });
      const dailyClients = Object.entries(todayCompMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

      const eqStatsMap = { '슬리팅 1': { sales: 0, count: 0 }, '슬리팅 2': { sales: 0, count: 0 }, '레베링': { sales: 0, count: 0 } };
      dSales?.forEach(s => { if (eqStatsMap[s.work_type]) { eqStatsMap[s.work_type].sales += s.total_price; eqStatsMap[s.work_type].count += 1; } });
      
      const trend = [];
      for (let i = 1; i <= new Date(selectedDate).getDate(); i++) {
        const dStr = `${year}-${month}-${i.toString().padStart(2, '0')}`;
        if ([1,2,3,4,5].includes(new Date(dStr).getDay())) {
          const s = mSales?.filter(x => x.work_date === dStr).reduce((a, b) => a + b.total_price, 0) || 0;
          trend.push({ name: `${i}일`, sales: Math.round(s / 10000) });
        }
      }

      setReportData({
        daily: { workSales: calcTotal(dSales), otherIncome: calcTotal(dLedger, '수입'), expense: calcTotal(dLedger, '지출'), netProfit: (calcTotal(dSales) + calcTotal(dLedger, '수입')) - calcTotal(dLedger, '지출') },
        dailyClients, equipmentBar: Object.entries(eqStatsMap).map(([name, d]) => ({ name, value: d.sales, count: d.count })),
        dailyTrend: trend, otherIncomeList: dLedger.filter(r => r.type === '수입'), expenseList: dLedger.filter(r => r.type === '지출')
      });
    } catch (e) { console.error(e); }
  };

  const fetchNotes = useCallback(async () => {
    const { data } = await supabase.from('daily_notes').select('*').eq('work_date', selectedDate).order('created_at', { ascending: true });
    setNotes(data || []);
  }, [selectedDate]);

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    await supabase.from('daily_notes').insert([{ work_date: selectedDate, content: newNoteText.trim() }]);
    setNewNoteText(''); fetchNotes();
  };

  const handleDeleteNote = async (id) => { if (window.confirm('삭제할까요?')) { await supabase.from('daily_notes').delete().eq('id', id); fetchNotes(); } };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}><span style={styles.reportTag}>OFFICIAL BRIEFING</span><h1 style={styles.title}>CEO 일일 경영 브리핑</h1></div>
        <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} style={styles.datePicker} />
      </header>

      <div style={styles.statGrid}>
        <div style={{...styles.mainCard, borderTop: '4px solid #3182ce'}}><p style={styles.label}>🛒 총 수익</p><h2 style={{...styles.val, color:'#2b6cb0'}}>{(reportData.daily.workSales + reportData.daily.otherIncome).toLocaleString()}원</h2></div>
        <div style={{...styles.mainCard, borderTop: '4px solid #e53e3e'}}><p style={styles.label}>💸 총 지출</p><h2 style={{...styles.val, color:'#c53030'}}>{reportData.daily.expense.toLocaleString()}원</h2></div>
        <div style={{...styles.mainCard, borderTop: '4px solid #38a169', backgroundColor:'#f0fff4'}}><p style={styles.label}>📈 영업 이익</p><h2 style={{...styles.val, color:'#2f855a'}}>{reportData.daily.netProfit.toLocaleString()}원</h2></div>
      </div>

      <div style={styles.topRow}>
        <div style={styles.card}><h3 style={styles.cardTitle}>🏢 거래처 매출 현황</h3><div style={styles.scrollList}>{reportData.dailyClients.map((c, i) => <div key={i} style={styles.detailItem}><span>{i+1}. {c.name}</span><b>{c.value.toLocaleString()}원</b></div>)}</div></div>
        <div style={styles.card}><h3 style={styles.cardTitle}>⚙️ 설비별 실적</h3><div style={{height:'180px'}}><ResponsiveContainer><BarChart data={reportData.equipmentBar}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis tickFormatter={(v)=>`${v/10000}만`}/><Tooltip/><Bar dataKey="value" radius={[4,4,0,0]}>{reportData.equipmentBar.map((e, i) => <Cell key={i} fill={EQ_COLORS[e.name]} />)}</Bar></BarChart></ResponsiveContainer></div><div style={styles.eqSummaryRow}>{reportData.equipmentBar.map(e => <div key={e.name} style={styles.eqBadge}><span style={{fontSize:'12px'}}>{e.name}</span><span style={{fontWeight:'bold'}}>{e.value.toLocaleString()}원</span><span style={{color:EQ_COLORS[e.name], fontWeight:'bold'}}>{e.count}건</span></div>)}</div></div>
      </div>

      <div style={{...styles.card, margin:'20px 0'}}><h3 style={styles.cardTitle}>📈 이달의 작업 매출 추이 (만원)</h3><div style={{height:'220px'}}><ResponsiveContainer><LineChart data={reportData.dailyTrend} margin={{top:10, right:30, left:0, bottom:0}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis/><Tooltip/><Line type="monotone" dataKey="sales" stroke="#3182ce" strokeWidth={3} dot={{r:4}}/></LineChart></ResponsiveContainer></div></div>

      <div style={styles.bottomGrid}>
        <div style={styles.card}><h3 style={{...styles.cardTitle, color:'#3182ce'}}>💰 기타 수입</h3>{reportData.otherIncomeList.map((m, i) => <div key={i} style={styles.detailItem}><span>{m.company}</span><b>{m.amount.toLocaleString()}원</b></div>)}</div>
        <div style={styles.card}><h3 style={{...styles.cardTitle, color:'#c53030'}}>💸 지출 내역</h3>{reportData.expenseList.map((m, i) => <div key={i} style={styles.detailItem}><span>{m.company}</span><b>{m.amount.toLocaleString()}원</b></div>)}</div>
        <div style={styles.card}><h3 style={{...styles.cardTitle, color:'#d69e2e'}}>📝 주요 내용</h3><div style={{flex:1, overflowY:'auto', marginBottom:'10px'}}>{notes.map((n, i) => <div key={n.id} style={styles.noteItem}><span>{i+1}. {n.content}</span><button onClick={()=>handleDeleteNote(n.id)} style={{border:'none', background:'none', cursor:'pointer'}}><DeleteIcon/></button></div>)}</div><div style={{display:'flex', gap:'5px'}}><input value={newNoteText} onChange={e=>setNewNoteText(e.target.value)} onKeyPress={e=>e.key==='Enter'&&handleAddNote()} placeholder="입력..." style={styles.noteInput}/><button onClick={handleAddNote} style={styles.addBtn}>추가</button></div></div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '20px', backgroundColor: '#f4f7f9', minHeight: '100vh', display:'flex', flexDirection:'column' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px' },
  headerLeft: { display:'flex', flexDirection:'column' },
  reportTag: { fontSize:'10px', fontWeight:'bold', color:'#3182ce', letterSpacing:'1px' },
  title: { margin:0, fontSize:'24px', fontWeight:'900', color:'#1a365d' },
  datePicker: { padding:'8px 12px', borderRadius:'10px', border:'2px solid #cbd5e0', fontWeight:'bold' },
  statGrid: { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'20px', marginBottom:'20px' },
  mainCard: { backgroundColor:'white', padding:'20px', borderRadius:'20px', boxShadow:'0 4px 6px rgba(0,0,0,0.05)' },
  label: { margin:0, fontSize:'14px', color:'#718096', fontWeight:'bold' },
  val: { margin:0, fontSize:'28px', fontWeight:'900' },
  topRow: { display:'grid', gridTemplateColumns:'1fr 2fr', gap:'20px' },
  bottomGrid: { display:'grid', gridTemplateColumns:'1fr 1fr 2fr', gap:'20px', flex:1 },
  card: { backgroundColor:'white', padding:'25px', borderRadius:'20px', boxShadow:'0 4px 6px rgba(0,0,0,0.05)', display:'flex', flexDirection:'column' },
  cardTitle: { margin:'0 0 15px 0', fontSize:'16px', fontWeight:'bold', color:'#2d3748', borderLeft:'4px solid #3182ce', paddingLeft:'15px' },
  scrollList: { flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'10px' },
  detailItem: { display:'flex', justifyContent:'space-between', padding:'10px 15px', backgroundColor:'#f8fafc', borderRadius:'12px', fontSize:'14px' },
  noteItem: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px', backgroundColor:'#fdfdea', borderRadius:'10px', marginBottom:'8px', border:'1px solid #f6e05e' },
  eqSummaryRow: { display:'flex', justifyContent:'space-around', marginTop:'15px', borderTop:'1px solid #edf2f7', paddingTop:'15px' },
  eqBadge: { display:'flex', flexDirection:'column', alignItems:'center' },
  noteInput: { flex:1, padding:'10px', borderRadius:'8px', border:'1px solid #edf2f7' },
  addBtn: { padding:'0 20px', backgroundColor:'#2d3748', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer' }
};

export default CEOReport;