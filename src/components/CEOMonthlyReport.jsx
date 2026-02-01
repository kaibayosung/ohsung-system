// src/components/CEOMonthlyReport.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, LabelList
} from 'recharts';

function CEOMonthlyReport() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const EQ_COLORS = { '슬리팅 1': '#3182ce', '슬리팅 2': '#805ad5', '레베링': '#38a169' };
  const PIE_COLORS = ['#3182ce', '#63b3ed', '#4299e1', '#90cdf4'];

  useEffect(() => { fetchMonthlyData(); }, [selectedMonth]);

  const fetchMonthlyData = async () => {
    setLoading(true);
    const [year, month] = selectedMonth.split('-').map(Number);
    const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
    const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];
    
    const [salesRes, expRes] = await Promise.all([
      supabase.from('sales_records').select('*').gte('work_date', startOfMonth).lte('work_date', endOfMonth),
      supabase.from('daily_ledger').select('*').eq('type', '지출').gte('trans_date', startOfMonth).lte('trans_date', endOfMonth)
    ]);

    const sum = (arr, key) => arr?.reduce((acc, cur) => acc + (Number(cur[key]) || 0), 0) || 0;
    const totalSales = sum(salesRes.data, 'total_price');
    const totalWeight = sum(salesRes.data, 'weight');
    const totalExpense = sum(expRes.data, 'amount');
    const profit = totalSales - totalExpense;

    // 인사이트 데이터 계산
    const revPerTon = totalWeight > 0 ? Math.round(totalSales / (totalWeight / 1000)) : 0;
    const clientMap = {};
    salesRes.data?.forEach(s => { const n = s.customer_name || '미지정'; clientMap[n] = (clientMap[n] || 0) + s.total_price; });
    const sortedClients = Object.entries(clientMap).sort((a,b) => b[1] - a[1]);
    const top3Sales = sortedClients.slice(0, 3).reduce((acc, cur) => acc + cur[1], 0);

    const eqStats = { '슬리팅 1': { s:0, w:0 }, '슬리팅 2': { s:0, w:0 }, '레베링': { s:0, w:0 } };
    salesRes.data?.forEach(s => { if(eqStats[s.work_type]) { eqStats[s.work_type].s += s.total_price; eqStats[s.work_type].w += s.weight; } });

    // 주간 추이 (백만원 단위가 작을 경우를 대비해 원 단위로 유지하되 그래프 축 최적화)
    const weeklyData = Array(4).fill(0).map((_, i) => ({ name: `${i+1}주`, sales: 0 }));
    salesRes.data?.forEach(s => {
        const d = new Date(s.work_date);
        const w = Math.min(Math.floor((d.getDate() - 1) / 7), 3);
        weeklyData[w].sales += s.total_price;
    });

    setData({
        summary: { totalSales, totalWeight, profit },
        insights: { 
            revPerTon, 
            top3Ratio: totalSales > 0 ? ((top3Sales / totalSales) * 100).toFixed(1) : 0,
            expRatio: totalSales > 0 ? ((totalExpense / totalSales) * 100).toFixed(1) : 0
        },
        equipment: Object.entries(eqStats).map(([name, d]) => ({ 
            name, 
            sales: d.s, 
            label: `${d.s.toLocaleString()}원 / ${Math.round(d.w/1000)}t` 
        })),
        weekly: weeklyData,
        expenses: Object.entries(expRes.data?.reduce((acc,cur)=>{acc[cur.description]=(acc[cur.description]||0)+cur.amount; return acc;}, {}) || {}).map(([name, value]) => ({ name, value }))
    });
    setLoading(false);
  };

  if (loading) return <div style={{padding:'50px', textAlign:'center'}}>데이터 분석 중...</div>;

  return (
    <div style={{ backgroundColor: '#e2e8f0', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#1a365d', color: 'white', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>📊 {selectedMonth} 경영 리포트 및 인사이트</h2>
        <div className="no-print">
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ padding: '8px', borderRadius: '5px', fontWeight: 'bold' }} />
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {/* 핵심 요약 (원 단위 적용) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
          <div style={styles.card}><h4>월간 총 매출</h4><p style={styles.summaryVal}>{data.summary.totalSales.toLocaleString()}원</p></div>
          <div style={styles.card}><h4>월간 총 생산량</h4><p style={styles.summaryVal}>{Math.round(data.summary.totalWeight/1000).toLocaleString()}t</p></div>
          <div style={styles.card}><h4>월간 영업 이익</h4><p style={{...styles.summaryVal, color: data.summary.profit >= 0 ? '#38a169' : '#e53e3e'}}>{data.summary.profit.toLocaleString()}원</p></div>
        </div>

        {/* 인사이트 대시보드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
          <div style={{...styles.insightCard, borderTop: '5px solid #3182ce'}}>
            <span style={styles.insightLabel}>생산 효율성 (톤당 매출)</span>
            <p style={styles.insightVal}>{data.insights.revPerTon.toLocaleString()}원 / t</p>
          </div>
          <div style={{...styles.insightCard, borderTop: '5px solid #e53e3e'}}>
            <span style={styles.insightLabel}>상위 3사 매출 비중</span>
            <p style={styles.insightVal}>{data.insights.top3Ratio}%</p>
          </div>
          <div style={{...styles.insightCard, borderTop: '5px solid #38a169'}}>
            <span style={styles.insightLabel}>지출 비율 / 영업 이익률</span>
            <p style={styles.insightVal}>{data.insights.expRatio}% / {(100 - data.insights.expRatio).toFixed(1)}%</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={styles.chartCard}>
            <h4>장비별 상세 실적 (원)</h4>
            <div style={{height: 250}}>
              <ResponsiveContainer>
                <BarChart layout="vertical" data={data.equipment} margin={{right: 120}}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip formatter={(v) => `${v.toLocaleString()}원`} />
                  <Bar dataKey="sales" radius={[0, 5, 5, 0]}>
                    {data.equipment.map((e,i) => <Cell key={i} fill={EQ_COLORS[e.name]} />)}
                    <LabelList dataKey="label" position="right" style={{fontSize: '12px', fontWeight: 'bold'}} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={styles.chartCard}>
            <h4>주간 매출 추이 (원)</h4>
            <div style={{height: 250}}>
                <ResponsiveContainer>
                    <LineChart data={data.weekly} margin={{top:20, right:30, left:20, bottom:10}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(v) => v.toLocaleString()} />
                        <Tooltip formatter={(v) => `${v.toLocaleString()}원`} />
                        <Line type="monotone" dataKey="sales" stroke="#3182ce" strokeWidth={4} dot={{r:6}} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: { backgroundColor: 'white', padding: '15px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  summaryVal: { fontSize: '22px', fontWeight: '900', margin: '5px 0' },
  insightCard: { backgroundColor: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  insightLabel: { fontSize: '13px', color: '#4a5568', fontWeight: 'bold' },
  insightVal: { fontSize: '20px', fontWeight: '900', margin: '5px 0', color: '#1a365d' },
  chartCard: { backgroundColor: 'white', padding: '20px', borderRadius: '12px' }
};

export default CEOMonthlyReport;