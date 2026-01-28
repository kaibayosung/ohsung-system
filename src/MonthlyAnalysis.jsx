import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line 
} from 'recharts';

function MonthlyAnalysis() {
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const [data, setData] = useState({
    workSales: 0,
    ledgerIncome: 0,
    incomeDetails: [], // 기타 수입 상세
    totalExpense: 0,
    expenseDetails: [], // 지출 상세
    dailyTrend: [],
    equipmentData: [],
    companyData: []
  });

  const COLORS = ['#3182ce', '#805ad5', '#38a169', '#ed8936', '#e53e3e'];

  useEffect(() => {
    fetchAnalysisData();
  }, [selectedYear, selectedMonth]);

  const fetchAnalysisData = async () => {
    setLoading(true);
    const start = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const end = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${lastDay}`;

    try {
      const { data: sales } = await supabase.from('sales_records').select('work_date, total_price, work_type, companies(name)').gte('work_date', start).lte('work_date', end);
      const { data: ledger } = await supabase.from('daily_ledger').select('*').gte('trans_date', start).lte('trans_date', end);

      const workSalesTotal = sales?.reduce((sum, r) => sum + (Number(r.total_price) || 0), 0) || 0;
      
      // [요청 2] 기타 수입 및 내역 추출
      const incomeRows = ledger?.filter(r => r.type === '수입') || [];
      const ledgerIncomeTotal = incomeRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0;

      // [요청 4] 지출 및 상세 내역 추출 (금액 큰 순서로 5개)
      const expenseRows = ledger?.filter(r => r.type === '지출') || [];
      const totalExpense = expenseRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0;
      const topExpenses = [...expenseRows].sort((a, b) => b.amount - a.amount).slice(0, 5);

      // [요청 3] 일일 작업추이 (주말 제외)
      const trend = [];
      for (let i = 1; i <= lastDay; i++) {
        const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
        const dayOfWeek = new Date(dateStr).getDay(); // 0:일, 6:토
        
        // 주말(0, 6)이 아닌 평일만 그래프 데이터에 포함
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const daySales = sales?.filter(s => s.work_date === dateStr).reduce((sum, s) => sum + (Number(s.total_price) || 0), 0) || 0;
          trend.push({ name: `${i}일`, sales: Math.round(daySales / 10000) });
        }
      }

      const eqMap = { '슬리팅 1': 0, '슬리팅 2': 0, '레베링': 0, '기타': 0 };
      sales?.forEach(s => {
        const type = s.work_type || '기타';
        if (eqMap[type] !== undefined) eqMap[type] += (Number(s.total_price) || 0);
        else eqMap['기타'] += (Number(s.total_price) || 0);
      });
      const equipmentData = Object.entries(eqMap).filter(([_, v]) => v > 0).map(([name, value]) => ({ name, value }));

      const compMap = {};
      sales?.forEach(s => {
        const name = s.companies?.name || '미지정';
        compMap[name] = (compMap[name] || 0) + (Number(s.total_price) || 0);
      });
      const companyData = Object.entries(compMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));

      setData({ 
        workSales: workSalesTotal, 
        ledgerIncome: ledgerIncomeTotal, 
        incomeDetails: incomeRows,
        totalExpense, 
        expenseDetails: topExpenses,
        dailyTrend: trend, 
        equipmentData, 
        companyData 
      });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const totalRevenue = data.workSales + data.ledgerIncome;
  const netProfit = totalRevenue - data.totalExpense;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🏆 {selectedMonth}월 경영 분석 리포트 (출력용)</h2>
        <select value={selectedMonth} onChange={e=>setSelectedMonth(Number(e.target.value))} style={styles.select}>
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(m=><option key={m} value={m}>{m}월</option>)}
        </select>
      </div>

      {/* 1. 요약 카드 (폰트 확대) */}
      <div style={styles.statGrid}>
        <div style={{...styles.statCard, borderLeft:'8px solid #3182ce'}}>
          <p style={styles.statLabel}>총 매출액 (작업 + 기타)</p>
          <h1 style={{color:'#2b6cb0', margin:'15px 0', fontSize:'36px'}}>{totalRevenue.toLocaleString()}원</h1>
          <div style={styles.statDetail}>
            <span>🏗️ 작업 매출: {data.workSales.toLocaleString()}원</span>
            <span>💰 기타 수입: {data.ledgerIncome.toLocaleString()}원</span>
          </div>
        </div>
        <div style={{...styles.statCard, borderLeft:'8px solid #e53e3e'}}>
          <p style={styles.statLabel}>총 지출액</p>
          <h1 style={{color:'#c53030', margin:'15px 0', fontSize:'36px'}}>{data.totalExpense.toLocaleString()}원</h1>
          <p style={styles.statSub}>현금/카드/계산서 통합 지출</p>
        </div>
        <div style={{...styles.statCard, borderLeft:'8px solid #38a169', backgroundColor:'#f0fff4'}}>
          <p style={styles.statLabel}>예상 순이익</p>
          <h1 style={{color:'#2f855a', margin:'15px 0', fontSize:'36px'}}>{netProfit.toLocaleString()}원</h1>
          <p style={styles.statSub}>수익률: {totalRevenue > 0 ? ((netProfit/totalRevenue)*100).toFixed(1) : 0}%</p>
        </div>
      </div>

      <div style={styles.mainGrid}>
        {/* 일별 작업 추이 (평일 기준) */}
        <div style={{...styles.card, gridColumn: 'span 2'}}>
          <h3 style={styles.cardTitle}>📈 평일 작업 매출 추이 (단위: 만원)</h3>
          <div style={{height:'350px', width:'100%'}}>
            <ResponsiveContainer>
              <LineChart data={data.dailyTrend} margin={{top:10, right:30, left:0, bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 14}} /> 
                <YAxis tick={{fontSize: 14}} /> 
                <Tooltip labelStyle={{fontSize: 16}} itemStyle={{fontSize: 16}} />
                <Line type="monotone" dataKey="sales" stroke="#3182ce" strokeWidth={4} dot={{r:6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 장비별 매출 비중 */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>⚙️ 장비별 매출 비중</h3>
          <div style={{height:'350px', width:'100%'}}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.equipmentData} innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value" label={{fontSize: 16}}>
                  {data.equipmentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v)=>v.toLocaleString()+'원'} />
                <Legend iconSize={15} wrapperStyle={{fontSize: 16}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* [요청 2] 기타 수입 상세 내역 */}
        <div style={styles.card}>
          <h3 style={{...styles.cardTitle, color:'#2f855a'}}>💰 기타 수입 상세 (Top 5)</h3>
          <div style={styles.detailList}>
            {data.incomeDetails.slice(0, 5).map((item, idx) => (
              <div key={idx} style={styles.detailRow}>
                <span style={styles.detailLabel}>{item.company || item.description}</span>
                <span style={styles.detailValue}>{item.amount.toLocaleString()}원</span>
              </div>
            ))}
            {data.incomeDetails.length === 0 && <p style={styles.noData}>내역 없음</p>}
          </div>
        </div>

        {/* [요청 4] 주요 지출 내역 */}
        <div style={styles.card}>
          <h3 style={{...styles.cardTitle, color:'#c53030'}}>💸 주요 지출 내역 (금액순)</h3>
          <div style={styles.detailList}>
            {data.expenseDetails.map((item, idx) => (
              <div key={idx} style={styles.detailRow}>
                <span style={styles.detailLabel}>{item.company} ({item.description})</span>
                <span style={styles.detailValue}>{item.amount.toLocaleString()}원</span>
              </div>
            ))}
            {data.expenseDetails.length === 0 && <p style={styles.noData}>내역 없음</p>}
          </div>
        </div>

        {/* 거래처 TOP 5 */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>🏢 우수 거래처 TOP 5</h3>
          <div style={styles.detailList}>
            {data.companyData.map((comp, idx) => (
              <div key={idx} style={styles.detailRow}>
                <span style={styles.rankBadge}>{idx+1}</span>
                <span style={{...styles.detailLabel, flex:1, marginLeft:'10px'}}>{comp.name}</span>
                <span style={styles.detailValue}>{comp.value.toLocaleString()}원</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '40px', backgroundColor: '#f7fafc', minHeight: '100vh', overflowY:'auto' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px' },
  title: { margin:0, fontSize:'32px', fontWeight:'900', color:'#1a365d' },
  select: { padding:'12px 20px', borderRadius:'12px', border:'2px solid #cbd5e0', fontSize:'20px', fontWeight:'bold' },
  
  statGrid: { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'30px', marginBottom:'30px' },
  statCard: { backgroundColor:'white', padding:'30px', borderRadius:'20px', boxShadow:'0 6px 12px rgba(0,0,0,0.08)' },
  statLabel: { margin:0, color:'#718096', fontSize:'18px', fontWeight:'bold' },
  statDetail: { display:'flex', flexDirection:'column', fontSize:'18px', color:'#4a5568', gap:'8px', marginTop:'15px', borderTop:'2px solid #edf2f7', paddingTop:'15px' },
  statSub: { margin:0, fontSize:'16px', color:'#a0aec0' },

  mainGrid: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'30px' },
  card: { backgroundColor:'white', padding:'30px', borderRadius:'20px', boxShadow:'0 6px 12px rgba(0,0,0,0.08)', display:'flex', flexDirection:'column' },
  cardTitle: { margin:'0 0 25px 0', fontSize:'22px', fontWeight:'bold', color:'#2d3748', borderLeft:'8px solid #3182ce', paddingLeft:'15px' },
  
  detailList: { display:'flex', flexDirection:'column', gap:'15px' },
  detailRow: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px', backgroundColor:'#f8fafc', borderRadius:'12px', fontSize:'18px' },
  detailLabel: { color:'#4a5568', fontWeight:'500' },
  detailValue: { fontWeight:'bold', color:'#2d3748' },
  rankBadge: { width:'28px', height:'28px', backgroundColor:'#3182ce', color:'white', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'bold' },
  noData: { textAlign:'center', color:'#999', padding:'20px', fontSize:'18px' }
};

export default MonthlyAnalysis;