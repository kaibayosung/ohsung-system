// src/components/CEOMonthlyReport.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, LabelList, Legend
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
    
    // DB 데이터 가져오기
    const [salesRes, expRes] = await Promise.all([
      supabase.from('sales_records').select('*').gte('work_date', startOfMonth).lte('work_date', endOfMonth),
      supabase.from('daily_ledger').select('*').eq('type', '지출').gte('trans_date', startOfMonth).lte('trans_date', endOfMonth)
    ]);

    const sum = (arr, key) => arr?.reduce((acc, cur) => acc + (Number(cur[key]) || 0), 0) || 0;
    const totalSales = sum(salesRes.data, 'total_price');
    const totalWeight = sum(salesRes.data, 'weight');
    const totalExpense = sum(expRes.data, 'amount');
    const profit = totalSales - totalExpense;

    // [인사이트 1] 톤당 매출액 (Efficiency)
    const revPerTon = totalWeight > 0 ? Math.round(totalSales / (totalWeight / 1000)) : 0;

    // [인사이트 2] 상위 거래처 의존도 (Risk)
    const clientMap = {};
    salesRes.data?.forEach(s => { const n = s.customer_name || '미지정'; clientMap[n] = (clientMap[n] || 0) + s.total_price; });
    const sortedClients = Object.entries(clientMap).sort((a,b) => b[1] - a[1]);
    const top3Sales = sortedClients.slice(0, 3).reduce((acc, cur) => acc + cur[1], 0);
    const top3Ratio = totalSales > 0 ? ((top3Sales / totalSales) * 100).toFixed(1) : 0;

    // 장비별 실적 가공
    const eqStats = { '슬리팅 1': { s:0, w:0 }, '슬리팅 2': { s:0, w:0 }, '레베링': { s:0, w:0 } };
    salesRes.data?.forEach(s => { if(eqStats[s.work_type]) { eqStats[s.work_type].s += s.total_price; eqStats[s.work_type].w += s.weight; } });

    setData({
        summary: { totalSales, totalWeight, profit, profitMargin: totalSales > 0 ? ((profit/totalSales)*100).toFixed(1) : 0 },
        insights: { revPerTon, top3Ratio, expRatio: totalSales > 0 ? ((totalExpense/totalSales)*100).toFixed(1) : 0 },
        equipment: Object.entries(eqStats).map(([name, d]) => ({ name, sales: d.s, label: `${(d.s/100000000).toFixed(1)}억 / ${Math.round(d.w/1000)}t` })),
        clients: sortedClients.slice(0, 5).map(([name, value]) => ({ name, value })),
        expenses: Object.entries(expRes.data?.reduce((acc,cur)=>{acc[cur.description]=(acc[cur.description]||0)+cur.amount; return acc;}, {}) || {}).map(([name, value]) => ({ name, value }))
    });
    setLoading(false);
  };

  if (loading) return <div style={{padding:'50px', textAlign:'center'}}>오성철강 경영 데이터 분석 중...</div>;

  return (
    <div style={{ backgroundColor: '#e2e8f0', minHeight: '100vh' }}>
      {/* 월 선택 헤더 */}
      <div style={{ backgroundColor: '#1a365d', color: 'white', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>📊 {selectedMonth} 경영 리포트 및 인사이트</h2>
        <div className="no-print">
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ padding: '8px', borderRadius: '5px', fontWeight: 'bold' }} />
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {/* 핵심 인사이트 대시보드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
          <div style={{...styles.insightCard, borderTop: '5px solid #3182ce'}}>
            <span style={styles.insightLabel}>생산 효율성 (톤당 매출)</span>
            <p style={styles.insightVal}>{data.insights.revPerTon.toLocaleString()}원 / t</p>
            <small style={{color:'#666'}}>*높을수록 고부가가치 제품 비중 높음</small>
          </div>
          <div style={{...styles.insightCard, borderTop: '5px solid #e53e3e'}}>
            <span style={styles.insightLabel}>상위 3사 매출 비중</span>
            <p style={styles.insightVal}>{data.insights.top3Ratio}%</p>
            <small style={{color:'#666'}}>*70% 이상 시 거래처 다변화 검토 권장</small>
          </div>
          <div style={{...styles.insightCard, borderTop: '5px solid #38a169'}}>
            <span style={styles.insightLabel}>매출액 대비 지출 비율</span>
            <p style={styles.insightVal}>{data.insights.expRatio}%</p>
            <small style={{color:'#666'}}>*영업 이익률 {(100 - data.insights.expRatio).toFixed(1)}%</small>
          </div>
        </div>

        {/* 기존 그래프 및 상세 데이터 섹션 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
          <div style={styles.card}><h4>월간 총 매출</h4><p style={styles.summaryVal}>{(data.summary.totalSales/100000000).toFixed(1)}억</p></div>
          <div style={styles.card}><h4>월간 총 생산량</h4><p style={styles.summaryVal}>{Math.round(data.summary.totalWeight/1000)}t</p></div>
          <div style={styles.card}><h4>월간 영업 이익</h4><p style={styles.summaryVal}>{(data.summary.profit/100000000).toFixed(1)}억</p></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={styles.chartCard}>
            <h4>장비별 실적 및 가동 효율</h4>
            <div style={{height: 250}}>
              <ResponsiveContainer>
                <BarChart layout="vertical" data={data.equipment} margin={{right: 80}}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="sales" radius={[0, 5, 5, 0]}>
                    {data.equipment.map((e,i) => <Cell key={i} fill={EQ_COLORS[e.name]} />)}
                    <LabelList dataKey="label" position="right" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={styles.chartCard}>
            <h4>지출 항목별 비중 분석</h4>
            <div style={{height: 250}}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.expenses} dataKey="value" nameKey="name" label={({name, percent})=>`${name} ${(percent*100).toFixed(0)}%`} outerRadius={80}>
                    {data.expenses.map((e,i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v)=>`${v.toLocaleString()}원`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  insightCard: { backgroundColor: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  insightLabel: { fontSize: '14px', color: '#4a5568', fontWeight: 'bold' },
  insightVal: { fontSize: '22px', fontWeight: '900', margin: '5px 0', color: '#1a365d' },
  card: { backgroundColor: 'white', padding: '15px', borderRadius: '12px', textAlign: 'center' },
  summaryVal: { fontSize: '24px', fontWeight: '900', margin: '5px 0' },
  chartCard: { backgroundColor: 'white', padding: '20px', borderRadius: '12px' }
};

export default CEOMonthlyReport;