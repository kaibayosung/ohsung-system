import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';

function CEOReport() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState({ daily: { workSales: 0, otherIncome: 0, expense: 0, netProfit: 0 }, dailyClients: [], equipmentBar: [], dailyTrend: [] });
  const [notes, setNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');
  const EQ_COLORS = { '슬리팅 1': '#3182ce', '슬리팅 2': '#805ad5', '레베링': '#38a169', '기타': '#718096' };

  useEffect(() => { fetchCEOData(); fetchNotes(); }, [selectedDate]);

  const fetchCEOData = async () => {
    const [year, month] = selectedDate.split('-');
    const { data: dSales } = await supabase.from('sales_records').select('*, companies(name)').eq('work_date', selectedDate);
    const { data: dLedger } = await supabase.from('daily_ledger').select('*').eq('trans_date', selectedDate);
    const { data: mSales } = await supabase.from('sales_records').select('work_date, total_price').gte('work_date', `${year}-${month}-01`).lte('work_date', selectedDate);

    const calcTotal = (arr, type) => arr?.filter(r => !type || r.type === type).reduce((sum, r) => sum + (Number(r.total_price || r.amount) || 0), 0) || 0;
    const clientMap = {}; dSales?.forEach(s => { const n = s.customer_name || s.companies?.name || '미지정'; clientMap[n] = (clientMap[n] || 0) + s.total_price; });
    const eqMap = { '슬리팅 1': { s:0, c:0 }, '슬리팅 2': { s:0, c:0 }, '레베링': { s:0, c:0 } };
    dSales?.forEach(s => { if(eqMap[s.work_type]) { eqMap[s.work_type].s += s.total_price; eqMap[s.work_type].c += 1; } });

    const trend = [];
    for (let i = 1; i <= new Date(selectedDate).getDate(); i++) {
      const d = `${year}-${month}-${i.toString().padStart(2, '0')}`;
      if ([1,2,3,4,5].includes(new Date(d).getDay())) {
        const s = mSales?.filter(x => x.work_date === d).reduce((a, b) => a + b.total_price, 0) || 0;
        trend.push({ name: `${i}일`, sales: Math.round(s / 10000) });
      }
    }
    setReportData({
      daily: { workSales: calcTotal(dSales), otherIncome: calcTotal(dLedger, '수입'), expense: calcTotal(dLedger, '지출'), netProfit: (calcTotal(dSales) + calcTotal(dLedger, '수입')) - calcTotal(dLedger, '지출') },
      dailyClients: Object.entries(clientMap).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value),
      equipmentBar: Object.entries(eqMap).map(([name, d]) => ({ name, value: d.s, count: d.c })), dailyTrend: trend
    });
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

  return (
    <div style={{padding:'20px', backgroundColor:'#f4f7f9', minHeight:'100vh'}}>
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
        <h2>CEO 일일 경영 브리핑</h2>
        <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} />
      </div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'15px', marginBottom:'20px'}}>
        <div style={{background:'white', padding:'15px', borderRadius:'10px', borderTop:'4px solid #3182ce'}}><h4>총 수익</h4><h3>{(reportData.daily.workSales + reportData.daily.otherIncome).toLocaleString()}원</h3></div>
        <div style={{background:'white', padding:'15px', borderRadius:'10px', borderTop:'4px solid #e53e3e'}}><h4>총 지출</h4><h3>{reportData.daily.expense.toLocaleString()}원</h3></div>
        <div style={{background:'white', padding:'15px', borderRadius:'10px', borderTop:'4px solid #38a169'}}><h4>영업 이익</h4><h3>{reportData.daily.netProfit.toLocaleString()}원</h3></div>
      </div>
      <div style={{background:'white', padding:'20px', borderRadius:'10px', marginBottom:'20px'}}>
        <h4>📈 이달의 매출 추이 (만원)</h4>
        <div style={{height:'200px'}}><ResponsiveContainer><LineChart data={reportData.dailyTrend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Line type="monotone" dataKey="sales" stroke="#3182ce" strokeWidth={3}/></LineChart></ResponsiveContainer></div>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1.5fr', gap:'20px'}}>
        <div style={{background:'white', padding:'15px', borderRadius:'10px'}}><h4>🏢 거래처 매출</h4>{reportData.dailyClients.map((c, i) => <div key={i} style={{display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'5px'}}><span>{c.name}</span><b>{c.value.toLocaleString()}원</b></div>)}</div>
        <div style={{background:'white', padding:'15px', borderRadius:'10px'}}><h4>⚙️ 설비별 실적</h4><div style={{height:'150px'}}><ResponsiveContainer><BarChart data={reportData.equipmentBar}><Bar dataKey="value">{reportData.equipmentBar.map((e,i)=><Cell key={i} fill={EQ_COLORS[e.name]}/>)}</Bar></BarChart></ResponsiveContainer></div><div style={{display:'flex', justifyContent:'space-around', fontSize:'12px'}}>{reportData.equipmentBar.map(e=><div key={e.name}><span>{e.name}</span><br/><b>{e.count}건</b></div>)}</div></div>
        <div style={{background:'white', padding:'15px', borderRadius:'10px'}}><h4>📝 주요 내용</h4><div style={{maxHeight:'150px', overflowY:'auto'}}>{notes.map((n, i) => <div key={i} style={{background:'#fdfdea', padding:'5px', marginBottom:'5px', fontSize:'13px', display:'flex', justifyContent:'space-between'}}><span>{i+1}. {n.content}</span><button onClick={()=>supabase.from('daily_notes').delete().eq('id', n.id).then(()=>fetchNotes())}>❌</button></div>)}</div><div style={{display:'flex', gap:'5px', marginTop:'10px'}}><input value={newNoteText} onChange={e=>setNewNoteText(e.target.value)} onKeyPress={e=>e.key==='Enter'&&handleAddNote()} placeholder="입력" style={{flex:1}}/><button onClick={handleAddNote}>추가</button></div></div>
      </div>
    </div>
  );
}
export default CEOReport;