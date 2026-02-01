// src/components/CEOMonthlyReport.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

function CEOMonthlyReport() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const COLORS = ['#3182ce', '#63b3ed', '#4299e1', '#90cdf4', '#bee3f8'];
  const EQ_COLORS = { '슬리팅 1': '#3182ce', '슬리팅 2': '#805ad5', '레베링': '#38a169', '기타': '#718096' };

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedMonth]);

  const fetchMonthlyData = async () => {
    setLoading(true);
    const [year, month] = selectedMonth.split('-').map(Number);
    
    // 현재달 범위 계산
    const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
    const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];

    // 지난달 계산 (비교용)
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthVal = month === 1 ? 12 : month - 1;
    const prevStart = `${prevYear}-${String(prevMonthVal).padStart(2, '0')}-01`;
    const prevEnd = new Date(prevYear, prevMonthVal, 0).toISOString().split('T')[0];

    // 병렬 데이터 페칭
    const [currSalesProm, prevSalesProm, currLedgerProm, prevLedgerProm] = [
      supabase.from('sales_records').select('*').gte('work_date', startOfMonth).lte('work_date', endOfMonth),
      supabase.from('sales_records').select('*').gte('work_date', prevStart).lte('work_date', prevEnd),
      supabase.from('daily_ledger').select('*').eq('type', '지출').gte('trans_date', startOfMonth).lte('trans_date', endOfMonth),
      supabase.from('daily_ledger').select('*').eq('type', '지출').gte('trans_date', prevStart).lte('trans_date', prevEnd),
    ];

    const [{ data: currSales }, { data: prevSales }, { data: currExpenses }, { data: prevExpenses }] = await Promise.all([currSalesProm, prevSalesProm, currLedgerProm, prevLedgerProm]);

    // --- 데이터 집계 ---
    const sum = (arr, key) => arr?.reduce((acc, cur) => acc + (Number(cur[key]) || 0), 0) || 0;

    // 1. 상단 핵심 지표
    const totalSales = sum(currSales, 'total_price');
    const prevTotalSales = sum(prevSales, 'total_price');
    const salesGrowth = prevTotalSales ? ((totalSales - prevTotalSales) / prevTotalSales * 100).toFixed(1) : 0;

    const totalWeight = sum(currSales, 'weight'); // 생산 중량 대용
    const prevTotalWeight = sum(prevSales, 'weight');
    const weightGrowth = prevTotalWeight ? ((totalWeight - prevTotalWeight) / prevTotalWeight * 100).toFixed(1) : 0;

    const totalExpense = sum(currExpenses, 'amount');
    const operatingProfit = totalSales - totalExpense;
    const profitMargin = totalSales ? ((operatingProfit / totalSales) * 100).toFixed(1) : 0;

    // 2. 장비별 실적
    const eqStats = { '슬리팅 1': { s:0, w:0 }, '슬리팅 2': { s:0, w:0 }, '레베링': { s:0, w:0 } };
    currSales?.forEach(s => {
        if(eqStats[s.work_type]) { 
            eqStats[s.work_type].s += (s.total_price || 0); 
            eqStats[s.work_type].w += (s.weight || 0); 
        }
    });
    const equipmentData = Object.entries(eqStats).map(([name, d]) => ({ 
        name, sales: d.s, weight: Math.round(d.w / 1000), // 톤 단위 변환 표시용
        label: `${(d.s/100000000).toFixed(1)}억 / ${Math.round(d.w/1000)}t`
    }));

    // 3. 주간 매출 추이
    const weeklyData = Array(4).fill(0).map((_, i) => ({ name: `${i+1}주`, sales: 0 }));
    currSales?.forEach(s => {
        const date = new Date(s.work_date);
        const weekIndex = Math.min(Math.floor((date.getDate() - 1) / 7), 3);
        weeklyData[weekIndex].sales += (s.total_price || 0);
    });
    const weeklyTrend = weeklyData.map(d => ({ ...d, sales: Math.round(d.sales / 1000000) })); // 백만원 단위

    // 4. 거래처별 매출 Top 5
    const clientMap = {};
    currSales?.forEach(s => { const n = s.customer_name || '미지정'; clientMap[n] = (clientMap[n] || 0) + s.total_price; });
    const topClients = Object.entries(clientMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value)
        .slice(0, 5);

    // 5. 주요 생산 품목(규격) Top 5
    const specMap = {};
    currSales?.forEach(s => {
        const spec = s.management_no?.split('|')[1]?.trim() || '규격미상';
        specMap[spec] = (specMap[spec] || 0) + (s.weight || 0);
    });
    const topSpecs = Object.entries(specMap)
        .map(([name, value]) => ({ name, weight: Math.round(value / 1000) })) // 톤 단위
        .sort((a,b) => b.weight - a.weight)
        .slice(0, 5);

    // 6. 월간 비용 지출 분석 (파이차트)
    const expenseMap = {};
    currExpenses?.forEach(e => { expenseMap[e.description] = (expenseMap[e.description] || 0) + e.amount; });
    const expensePieData = Object.entries(expenseMap).map(([name, value]) => ({ name, value }));

    setData({
        summary: { totalSales, salesGrowth, totalWeight, weightGrowth, operatingProfit, profitMargin },
        equipment: equipmentData,
        weekly: weeklyTrend,
        clients: topClients,
        specs: topSpecs,
        expenses: expensePieData
    });
    setLoading(false);
  };

  if (loading) return <div style={{padding:'20px', textAlign:'center'}}>데이터 분석 중...</div>;

  const Card = ({ title, value, sub, color }) => (
    <div style={{backgroundColor: 'white', padding: '25px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)'}}>
      <h3 style={{margin: '0 0 10px 0', fontSize: '18px', color: '#4a5568', fontWeight:'bold'}}>{title}</h3>
      <p style={{margin: '0 0 10px 0', fontSize: '32px', fontWeight: '900', color: '#2d3748'}}>{value}</p>
      <p style={{margin: 0, fontSize: '14px', color: color, fontWeight:'bold'}}>{sub}</p>
    </div>
  );

  return (
    <div className="monthly-report" style={{ backgroundColor: '#e2e8f0', minHeight: '100vh' }}>
      {/* 헤더 */}
      <div style={{ backgroundColor: '#3182ce', color: 'white', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight:'bold' }}>오성철강 월간 경영 분석 리포트 ({selectedMonth})</h1>
        <div className="no-print">
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ padding: '8px', borderRadius: '5px', border: 'none', color:'#333' }} />
            <button onClick={() => window.print()} style={{ marginLeft: '10px', padding: '8px 15px', backgroundColor: 'white', color: '#3182ce', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>🖨️ 출력/저장</button>
        </div>
      </div>

      <div style={{ padding: '25px' }}>
        {/* 상단 핵심 요약 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '25px', marginBottom: '25px' }}>
          <Card title="월간 총 매출액" value={`${(data.summary.totalSales / 100000000).toFixed(1)}억 원`} sub={`전월 대비 ${data.summary.salesGrowth >= 0 ? '▲' : '▼'} ${Math.abs(data.summary.salesGrowth)}%`} color={data.summary.salesGrowth >= 0 ? '#e53e3e' : '#3182ce'} />
          <Card title="월간 총 생산 중량" value={`${Math.round(data.summary.totalWeight / 1000).toLocaleString()} 톤`} sub={`전월 대비 ${data.summary.weightGrowth >= 0 ? '▲' : '▼'} ${Math.abs(data.summary.weightGrowth)}%`} color={data.summary.weightGrowth >= 0 ? '#38a169' : '#e53e3e'} />
          <Card title="월간 영업 이익" value={`${(data.summary.operatingProfit / 100000000).toFixed(1)}억 원`} sub={`이익률 ${data.summary.profitMargin}%`} color="#3182ce" />
        </div>

        {/* 중단 분석 영역 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '25px' }}>
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>장비별 월간 실적 (매출/중량)</h3>
            <div style={{height: '250px'}}>
              <ResponsiveContainer>
                <BarChart layout="vertical" data={data.equipment} margin={{top:5, right:80, left:10, bottom:5}}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} tick={{fontWeight:'bold'}} />
                  <Tooltip formatter={(value, name, props) => props.payload.label} />
                  <Bar dataKey="sales" radius={[0, 5, 5, 0]}>
                    {data.equipment.map((entry, index) => <Cell key={`cell-${index}`} fill={EQ_COLORS[entry.name] || '#3182ce'} />)}
                    <LabelList dataKey="label" position="right" style={{fontWeight:'bold', fill:'#2d3748'}} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>주간 매출 추이 (백만원)</h3>
            <div style={{height: '250px'}}>
                <ResponsiveContainer>
                    <LineChart data={data.weekly} margin={{top:20, right:30, left:20, bottom:10}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{fontWeight:'bold'}} />
                        <YAxis tick={{fontWeight:'bold'}} />
                        <Tooltip formatter={(value) => `${value.toLocaleString()} 백만원`} />
                        <Line type="monotone" dataKey="sales" stroke="#3182ce" strokeWidth={4} dot={{r:6}} activeDot={{r:8}} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 하단 상세 분석 영역 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '25px' }}>
            <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>거래처별 매출 Top 5</h3>
                <div style={{height: '250px'}}>
                    <ResponsiveContainer>
                        <BarChart layout="vertical" data={data.clients} margin={{top:5, right:10, left:10, bottom:5}}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize:'12px', fontWeight:'bold'}} />
                            <Tooltip formatter={(value) => `${value.toLocaleString()}원`} />
                            <Bar dataKey="value" fill="#3182ce" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>주요 생산 품목(규격) Top 5 (톤)</h3>
                <div style={{height: '250px'}}>
                    <ResponsiveContainer>
                        <BarChart data={data.specs} margin={{top:20, right:10, left:10, bottom:5}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{fontSize:'12px', fontWeight:'bold'}} interval={0} />
                            <YAxis hide />
                            <Tooltip formatter={(value) => `${value}톤`} />
                            <Bar dataKey="weight" fill="#3182ce" radius={[5, 5, 0, 0]}>
                                <LabelList dataKey="weight" position="top" style={{fontWeight:'bold', fill:'#2d3748'}}formatter={v=>`${v}t`} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>월간 비용 지출 분석</h3>
                <div style={{height: '250px'}}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={data.expenses} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {data.expenses.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value) => `${value.toLocaleString()}원`} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      </div>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background-color: #e2e8f0 !important; }
          .no-print { display: none !important; }
          .monthly-report { padding: 0 !important; }
          .chartCard, .Card { break-inside: avoid; box-shadow: none !important; border: 1px solid #ccc !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
    chartCard: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
    chartTitle: { margin: '0 0 15px 0', fontSize: '18px', color: '#2d3748', fontWeight: 'bold', textAlign: 'center' }
};

import { LabelList } from 'recharts';
export default CEOMonthlyReport;