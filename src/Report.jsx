import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function Report() {
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [typeBreakdown, setTypeBreakdown] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState({ sales:0, expense:0, fixedCost:0, netProfit:0 });
  const [fixedCostInput, setFixedCostInput] = useState('');
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => { fetchReportData(); }, [selectedYear, selectedMonth]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const yearStr = selectedYear.toString();
      const monthStr = selectedMonth.toString().padStart(2, '0');
      const currentYearMonth = `${yearStr}-${monthStr}`;
      const startDate = `${currentYearMonth}-01`;
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

      // 1. 연간 매출 추이
      const { data: salesData } = await supabase.from('sales_records').select('work_date, total_price, work_type').gte('work_date', `${yearStr}-01-01`).lte('work_date', `${yearStr}-12-31`);
      const trendMap = Array(12).fill(0);
      salesData?.forEach(item => { trendMap[new Date(item.work_date).getMonth()] += Number(item.total_price); });
      setMonthlyTrend(trendMap.map((amount, index) => ({ month: `${index + 1}월`, 매출액: amount })));

      // 2. 선택 월의 실시간 합계 계산 (마감 테이블 대신 원장 테이블 사용)
      const { data: monthSales } = await supabase.from('sales_records').select('total_price').gte('work_date', startDate).lte('work_date', endDate);
      const { data: monthLedger } = await supabase.from('daily_ledger').select('amount, type').gte('trans_date', startDate).lte('trans_date', endDate);
      
      const totalSales = (monthSales?.reduce((acc,cur)=>acc+Number(cur.total_price),0)||0) + (monthLedger?.filter(r=>r.type==='수입').reduce((acc,cur)=>acc+Number(cur.amount),0)||0);
      const totalVarExpense = monthLedger?.filter(r=>r.type==='지출').reduce((acc,cur)=>acc+Number(cur.amount),0)||0;

      // 3. 고정비 조회 및 최종 계산
      const { data: fixed } = await supabase.from('monthly_fixed_costs').select('amount').eq('year_month', currentYearMonth).single();
      const fixedCost = fixed ? Number(fixed.amount) : 0;
      setFixedCostInput(fixedCost.toString());
      setMonthlySummary({ sales: totalSales, expense: totalVarExpense, fixedCost: fixedCost, netProfit: totalSales - totalVarExpense - fixedCost });

      // 4. 파이차트 데이터
      const currentMonthSalesData = salesData?.filter(item => (new Date(item.work_date).getMonth() + 1) === parseInt(selectedMonth)) || [];
      const typeMap = {};
      currentMonthSalesData.forEach(item => { const type = item.work_type || '기타'; typeMap[type] = (typeMap[type] || 0) + Number(item.total_price); });
      setTypeBreakdown(Object.keys(typeMap).map(key => ({ name: key, value: typeMap[key] })));
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleSaveFixedCost = async () => {
    const amount = Number(fixedCostInput.replace(/,/g, ''));
    const yearMonth = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
    const { error } = await supabase.from('monthly_fixed_costs').upsert({ year_month: yearMonth, amount: amount });
    if (error) alert("저장 실패"); else { alert("고정비가 저장되었습니다."); fetchReportData(); }
  };
  const formatCurrency = (value) => new Intl.NumberFormat('ko-KR').format(value);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📈 월간 경영 분석 리포트</h2>
        <div style={styles.filters}>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={styles.select}><option value="2026">2026년</option><option value="2025">2025년</option></select>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={styles.select}>{Array.from({length: 12}, (_, i) => i + 1).map(m => (<option key={m} value={m}>{m}월</option>))}</select>
          <button onClick={fetchReportData} style={styles.refreshBtn}>{loading ? '로딩중...' : '조회'}</button>
        </div>
      </div>
      <div style={styles.pnlSection}>
        <h3 style={styles.cardTitle}>💰 {selectedMonth}월 손익 요약 (P&L, 실시간)</h3>
        <div style={styles.pnlGrid}>
          <PnlCard title="① 월 총 매출(수입포함)" value={monthlySummary.sales} color="#2b6cb0" />
          <PnlCard title="② 변동 지출(일계표)" value={monthlySummary.expense} color="#c53030" />
          <div style={{...styles.pnlCard, backgroundColor:'#fffaf0', border:'2px solid #ecc94b'}}>
            <p style={styles.label}>③ 월 고정비(인건비 등)</p>
            <div style={{display:'flex', gap:'5px'}}><input type="text" value={fixedCostInput} onChange={e=>setFixedCostInput(e.target.value)} placeholder="금액 입력" style={styles.costInput} /><button onClick={handleSaveFixedCost} style={styles.saveBtn}>저장</button></div>
            <p style={{fontSize:'12px', color:'#ecc94b', marginTop:'5px'}}>* 입력 후 저장 버튼 클릭</p>
          </div>
        </div>
        <div style={styles.finalProfit}><p>💎 이달의 최종 영업이익 (① - ② - ③)</p><h2 style={{color: monthlySummary.netProfit >= 0 ? '#2f855a' : '#e53e3e', fontSize:'36px', margin:'10px 0'}}>{formatCurrency(monthlySummary.netProfit)} 원</h2></div>
      </div>
      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <h3 style={styles.cardTitle}>📊 {selectedYear}년 월별 매출 추이</h3>
          <ResponsiveContainer width="100%" height={300}><BarChart data={monthlyTrend} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis tickFormatter={(value) => `${value / 1000000}백만`} /><Tooltip formatter={(value) => formatCurrency(value) + '원'} /><Legend /><Bar dataKey="매출액" fill="#3182ce" name="월 매출" /></BarChart></ResponsiveContainer>
        </div>
        <div style={styles.chartCard}>
          <h3 style={styles.cardTitle}>💿 {selectedMonth}월 작업 종류별 매출 비중</h3>
          <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={typeBreakdown} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">{typeBreakdown.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip formatter={(value) => formatCurrency(value) + '원'} /><Legend /></PieChart></ResponsiveContainer>
          {typeBreakdown.length === 0 && <p style={{textAlign: 'center', color: '#999'}}>데이터가 없습니다.</p>}
        </div>
      </div>
    </div>
  );
}
const PnlCard = ({title, value, color}) => (<div style={styles.pnlCard}><p style={styles.label}>{title}</p><h3 style={{color: color, fontSize: '24px', margin: '10px 0'}}>{new Intl.NumberFormat('ko-KR').format(value)}원</h3></div>);
const styles = { container: { padding: '30px', backgroundColor: '#f4f7f9', minHeight: '100%', overflowY:'auto' }, header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }, title: { fontSize: '24px', color: '#1a365d', margin: 0, fontWeight: '800' }, filters: { display: 'flex', gap: '10px' }, select: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '16px' }, refreshBtn: { padding: '8px 20px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }, pnlSection: { backgroundColor:'white', padding:'30px', borderRadius:'20px', marginBottom:'30px', boxShadow:'0 4px 10px rgba(0,0,0,0.05)' }, cardTitle: { fontSize: '18px', color: '#4a5568', marginBottom: '20px', textAlign: 'center', fontWeight: 'bold' }, pnlGrid: { display:'flex', gap:'20px', marginBottom:'20px' }, pnlCard: { flex:1, backgroundColor:'#f7fafc', padding:'20px', borderRadius:'15px', textAlign:'center' }, label: { fontSize: '14px', color: '#718096', margin:0 }, costInput: { width:'100%', padding:'10px', fontSize:'18px', borderRadius:'8px', border:'1px solid #cbd5e0', textAlign:'right' }, saveBtn: { padding:'10px 15px', backgroundColor:'#ecc94b', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'bold' }, finalProfit: { textAlign:'center', padding:'20px', backgroundColor:'#f0fff4', borderRadius:'15px', border:'2px solid #68d391' }, chartsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }, chartCard: { backgroundColor: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', minHeight: '400px' } };
export default Report;