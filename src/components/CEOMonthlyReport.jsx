// src/components/CEOMonthlyReport.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // 상위 폴더의 파일을 찾기 위해 ../ 사용
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, LabelList
} from 'recharts';

function CEOMonthlyReport() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const COLORS = ['#3182ce', '#63b3ed', '#4299e1', '#90cdf4', '#bee3f8'];
  const EQ_COLORS = { '슬리팅 1': '#3182ce', '슬리팅 2': '#805ad5', '레베링': '#38a169', '기타': '#718096' };

  useEffect(() => { fetchMonthlyData(); }, [selectedMonth]);

  const fetchMonthlyData = async () => {
    setLoading(true);
    const [year, month] = selectedMonth.split('-').map(Number);
    const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
    const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];
    
    // 지난달 데이터 계산 (비교용)
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthVal = month === 1 ? 12 : month - 1;
    const prevStart = `${prevYear}-${String(prevMonthVal).padStart(2, '0')}-01`;
    const prevEnd = new Date(prevYear, prevMonthVal, 0).toISOString().split('T')[0];

    const [currSales, prevSales, currExp] = await Promise.all([
      supabase.from('sales_records').select('*').gte('work_date', startOfMonth).lte('work_date', endOfMonth),
      supabase.from('sales_records').select('*').gte('work_date', prevStart).lte('work_date', prevEnd),
      supabase.from('daily_ledger').select('*').eq('type', '지출').gte('trans_date', startOfMonth).lte('trans_date', endOfMonth)
    ]);

    const sum = (arr, key) => arr?.reduce((acc, cur) => acc + (Number(cur[key]) || 0), 0) || 0;
    const totalSales = sum(currSales.data, 'total_price');
    const prevTotalSales = sum(prevSales.data, 'total_price');
    const salesGrowth = prevTotalSales ? ((totalSales - prevTotalSales) / prevTotalSales * 100).toFixed(1) : 0;
    
    const totalWeight = sum(currSales.data, 'weight');
    const prevTotalWeight = sum(prevSales.data, 'weight');
    const weightGrowth = prevTotalWeight ? ((totalWeight - prevTotalWeight) / prevTotalWeight * 100).toFixed(1) : 0;

    const totalExpense = sum(currExp.data, 'amount');
    const operatingProfit = totalSales - totalExpense;

    // 장비별 실적 가공
    const eqStats = { '슬리팅 1': { s:0, w:0 }, '슬리팅 2': { s:0, w:0 }, '레베링': { s:0, w:0 } };
    currSales.data?.forEach(s => { if(eqStats[s.work_type]) { eqStats[s.work_type].s += s.total_price; eqStats[s.work_type].w += s.weight; } });

    // 주간 매출 추이 (4주차로 구분)
    const weeklyData = Array(4).fill(0).map((_, i) => ({ name: `${i+1}주`, sales: 0 }));
    currSales.data?.forEach(s => { const d = new Date(s.work_date); const w = Math.min(Math.floor((d.getDate() - 1) / 7), 3); weeklyData[w].sales += s.total_price; });

    setData({
        summary: { totalSales, salesGrowth, totalWeight, weightGrowth, operatingProfit, profitMargin: totalSales ? ((operatingProfit/totalSales)*100).toFixed(1) : 0 },
        equipment: Object.entries(eqStats).map(([name, d]) => ({ name, sales: d.s, label: `${(d.s/100000000).toFixed(1)}억 / ${Math.round(d.w/1000)}t` })),
        weekly: weeklyData.map(d => ({ ...d, sales: Math.round(d.sales / 1000000) })),
        expenses: Object.entries(currExp.data?.reduce((acc,cur)=>{acc[cur.description]=(acc[cur.description]||0)+cur.amount; return acc;}, {}) || {}).map(([name, value]) => ({ name, value }))
    });
    setLoading(false);
  };

  if (loading) return <div style={{padding:'50px', textAlign:'center'}}>월간 경영 데이터 분석 중...</div>;

  return (
    <div style={{ padding: '25px', backgroundColor: '#e2e8f0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div style={styles.card}><h3>월간 총 매출</h3><p style={styles.val}>{ (data.summary.totalSales/100000000).toFixed(1) }억</p><span style={{color: data.summary.salesGrowth >= 0 ? 'red' : 'blue'}}>전월대비 {data.summary.salesGrowth}%</span></div>
        <div style={styles.card}><h3>월간 총 생산량</h3><p style={styles.val}>{ Math.round(data.summary.totalWeight/1000) }t</p><span style={{color: data.summary.weightGrowth >= 0 ? 'green' : 'red'}}>전월대비 {data.summary.weightGrowth}%</span></div>
        <div style={styles.card}><h3>월간 영업 이익</h3><p style={styles.val}>{ (data.summary.operatingProfit/100000000).toFixed(1) }억</p><span>이익률 {data.summary.profitMargin}%</span></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={styles.chartCard}><h4>장비별 월간 실적</h4><div style={{height:250}}><ResponsiveContainer><BarChart layout="vertical" data={data.equipment} margin={{right:80}}><XAxis type="number" hide /><YAxis dataKey="name" type="category" /><Tooltip /><Bar dataKey="sales">{data.equipment.map((e,i)=><Cell key={i} fill={EQ_COLORS[e.name]}/>)}<LabelList dataKey="label" position="right" /></Bar></BarChart></ResponsiveContainer></div></div>
        <div style={styles.chartCard}><h4>주간 매출 추이 (백만원)</h4><div style={{height:250}}><ResponsiveContainer><LineChart data={data.weekly}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Line type="monotone" dataKey="sales" stroke="#3182ce" strokeWidth={4}/></LineChart></ResponsiveContainer></div></div>
      </div>
    </div>
  );
}

const styles = {
    card: { backgroundColor:'white', padding:'20px', borderRadius:'12px', textAlign:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.05)' },
    val: { fontSize:'28px', fontWeight:'900', margin:'10px 0' },
    chartCard: { backgroundColor:'white', padding:'15px', borderRadius:'12px', textAlign:'center' }
};

export default CEOMonthlyReport;