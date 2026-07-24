import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { fetchMonthlyFixedCosts } from './lib/fixedCosts';

// greenp_production.work_type 실제 값(SLITING/SLITING2/LEVELLING) → 표시 라벨
const WORK_TYPE_LABELS = { SLITING: '슬리팅 1', SLITING2: '슬리팅 2', LEVELLING: '레베링' };
function workTypeLabel(t) { return WORK_TYPE_LABELS[t] || (t || '기타'); }

function MonthlyAnalysis() {
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const [data, setData] = useState({
    workSales: 0,
    scrapSales: 0,
    ledgerIncome: 0,
    incomeDetails: [],
    totalExpense: 0,
    expenseDetails: [],
    dailyTrend: [],
    equipmentData: [],
    companyData: [],
    fixedCostTotal: 0,
    fixedCostByCategory: [],
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
      // [수정] 그린ERP 동기화 테이블(greenp_production) 기준으로 조회.
      // 예전엔 sales_records(수기 입력, 2026-07-16 이후 미갱신)를 썼습니다.
      const { data: sales } = await supabase.from('greenp_production')
        .select('slip_date, amount, work_type, company_name')
        .gte('slip_date', start).lte('slip_date', end);

      const { data: scrap } = await supabase.from('scrap_sales').select('total_amount').gte('sale_date', start).lte('sale_date', end);
      const { data: ledger } = await supabase.from('daily_ledger').select('*').gte('trans_date', start).lte('trans_date', end);
      const fixedCostRes = await fetchMonthlyFixedCosts(start, end);

      const workSalesTotal = sales?.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0;
      const scrapSalesTotal = scrap?.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0) || 0;
      // ※ scrap_sales는 등록 시 daily_ledger(type=수입)에도 자동으로 함께 기록되므로
      //   아래 ledgerIncomeTotal 안에 스크랩 매출이 이미 포함되어 있습니다. 따라서
      //   총 매출 합계에는 scrapSalesTotal을 별도로 더하지 않고, 참고용 통계로만 표시합니다.
      const incomeRows = ledger?.filter(r => r.type === '수입') || [];
      const ledgerIncomeTotal = incomeRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0;
      const expenseRows = ledger?.filter(r => r.type === '지출') || [];
      const totalExpense = expenseRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0;
      const topExpenses = [...expenseRows].sort((a, b) => b.amount - a.amount).slice(0, 5);

      const trend = [];
      for (let i = 1; i <= lastDay; i++) {
        const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
        const dayOfWeek = new Date(dateStr).getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const daySales = sales?.filter(s => s.slip_date === dateStr).reduce((sum, s) => sum + (Number(s.amount) || 0), 0) || 0;
          trend.push({ name: `${i}일`, sales: Math.round(daySales / 10000) });
        }
      }

      const eqMap = { '슬리팅 1': 0, '슬리팅 2': 0, '레베링': 0, '기타': 0 };
      sales?.forEach(s => {
        const label = workTypeLabel(s.work_type);
        if (eqMap[label] !== undefined) eqMap[label] += (Number(s.amount) || 0);
        else eqMap['기타'] += (Number(s.amount) || 0);
      });
      const equipmentData = Object.entries(eqMap).filter(([_, v]) => v > 0).map(([name, value]) => ({ name, value }));

      const compMap = {};
      sales?.forEach(s => {
        const name = s.company_name || '미지정';
        compMap[name] = (compMap[name] || 0) + (Number(s.amount) || 0);
      });
      const companyData = Object.entries(compMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));

      setData({
        workSales: workSalesTotal,
        scrapSales: scrapSalesTotal,
        ledgerIncome: ledgerIncomeTotal,
        incomeDetails: incomeRows,
        totalExpense,
        expenseDetails: topExpenses,
        dailyTrend: trend,
        equipmentData,
        companyData,
        fixedCostTotal: fixedCostRes.total,
        fixedCostByCategory: fixedCostRes.byCategory,
        fixedCostConfirmed: fixedCostRes.isConfirmed,
        fixedCostComputedTotal: fixedCostRes.computedTotal,
      });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const totalRevenue = data.workSales + data.ledgerIncome;
  const netProfit = totalRevenue - data.totalExpense;
  const balanceDiff = totalRevenue - data.fixedCostTotal;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🏆 {selectedMonth}월 경영 분석 리포트 (출력용)</h2>
        <select value={selectedMonth} onChange={e=>setSelectedMonth(Number(e.target.value))} style={styles.select}>
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(m=><option key={m} value={m}>{m}월</option>)}
        </select>
      </div>

      <div style={styles.statGrid}>
        <div style={{...styles.statCard, borderLeft:'8px solid #3182ce'}}>
          <p style={styles.statLabel}>총 매출액 (작업 + 기타)</p>
          <h1 style={{color:'#2b6cb0', margin:'15px 0', fontSize:'36px'}}>{totalRevenue.toLocaleString()}원</h1>
          <div style={styles.statDetail}>
            <span>🏗️ 그린ERP 가공 매출: {data.workSales.toLocaleString()}원</span>
            <span>♻️ (포함) 스크랩 매출: {data.scrapSales.toLocaleString()}원</span>
            <span>💰 기타 수입(일계표): {data.ledgerIncome.toLocaleString()}원</span>
          </div>
        </div>
        <div style={{...styles.statCard, borderLeft:'8px solid #e53e3e'}}>
          <p style={styles.statLabel}>총 지출액</p>
          <h1 style={{color:'#c53030', margin:'15px 0', fontSize:'36px'}}>{data.totalExpense.toLocaleString()}원</h1>
          <p style={styles.statSub}>일계표(현금/카드/계산서) 기준 통합 지출</p>
        </div>
        <div style={{...styles.statCard, borderLeft:'8px solid #38a169', backgroundColor:'#f0fff4'}}>
          <p style={styles.statLabel}>예상 순이익</p>
          <h1 style={{color:'#2f855a', margin:'15px 0', fontSize:'36px'}}>{netProfit.toLocaleString()}원</h1>
          <p style={styles.statSub}>수익률: {totalRevenue > 0 ? ((netProfit/totalRevenue)*100).toFixed(1) : 0}%</p>
        </div>
      </div>

      {/* 월별 밸런스 — 지출결의서에 정기 지출로 등록된 고정비(급여/4대보험/대출이자/카드대금/
          수도광열비/통신비/위탁대행 등, 결재완료 건)를 기준으로 삼은 별도 손익 지표입니다.
          위 "총 지출액"(일계표 기준)과는 다른 기준이므로 서로 더하거나 빼지 않습니다. */}
      <div style={{...styles.card, marginBottom: '30px'}}>
        <h3 style={styles.cardTitle}>
          ⚖️ {selectedMonth}월 밸런스 (고정비 기준)
          {data.fixedCostConfirmed && <span style={{ marginLeft: '10px', fontSize: '13px', color: '#2f855a', background: '#f0fff4', padding: '3px 10px', borderRadius: '999px', fontWeight: 700 }}>통장 실적 확정값 사용중</span>}
        </h3>
        {data.fixedCostConfirmed && (
          <p style={{ margin: '-6px 0 14px', fontSize: '13px', color: '#718096' }}>
            5~6월 통장 출금내역 기준 대표님 확정 고정비({data.fixedCostTotal.toLocaleString()}원/월, 급여 제외)를 적용했습니다.
            {data.fixedCostComputedTotal !== data.fixedCostTotal && ` (참고: 지출결의서 입력분 ${data.fixedCostComputedTotal.toLocaleString()}원)`}
          </p>
        )}
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 260px' }}>
            <table style={styles.balanceTable}>
              <thead><tr><th style={styles.balanceTh}>고정비 항목</th><th style={{...styles.balanceTh, textAlign:'right'}}>금액</th></tr></thead>
              <tbody>
                {data.fixedCostByCategory.length === 0 ? (
                  <tr><td colSpan="2" style={{...styles.balanceTd, textAlign:'center', color:'#a0aec0'}}>이번달 승인된 정기 지출이 없습니다</td></tr>
                ) : data.fixedCostByCategory.map((c) => (
                  <tr key={c.name}>
                    <td style={styles.balanceTd}>{c.name}</td>
                    <td style={{...styles.balanceTd, textAlign:'right', fontWeight:700}}>{c.amount.toLocaleString()}원</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{...styles.balanceTd, fontWeight:900, borderTop:'2px solid #2d3748'}}>고정비 합계</td>
                  <td style={{...styles.balanceTd, fontWeight:900, borderTop:'2px solid #2d3748', textAlign:'right', color:'#c53030'}}>{data.fixedCostTotal.toLocaleString()}원</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div style={{ flex: '1 1 220px', backgroundColor: balanceDiff >= 0 ? '#f0fff4' : '#fff5f5', borderRadius: '14px', padding: '22px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '15px', color: '#718096', fontWeight: 'bold' }}>매출 − 고정비</p>
            <h2 style={{ margin: '12px 0', fontSize: '30px', color: balanceDiff >= 0 ? '#2f855a' : '#c53030' }}>{balanceDiff.toLocaleString()}원</h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#a0aec0' }}>{data.fixedCostTotal > 0 ? `고정비 대비 매출 ${Math.round((totalRevenue / data.fixedCostTotal) * 100)}%` : '고정비 데이터 없음'}</p>
          </div>
        </div>
      </div>

      <div style={styles.mainGrid}>
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

// 스타일 객체는 그대로 유지
const styles = {
  container: { padding: '40px', backgroundColor: '#f7fafc', minHeight: '100vh', overflowY:'auto' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px' },
  title: { margin:0, fontSize:'32px', fontWeight:'900', color:'#1a365d' },
  select: { padding:'12px 20px', borderRadius:'12px', border:'2px solid #cbd5e0', fontSize:'20px', fontWeight:'bold' },
  statGrid: { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'30px', marginBottom:'30px' },
  statCard: { backgroundColor:'white', padding:'30px', borderRadius:'20px', boxShadow:'0 6px 12px rgba(0,0,0,0.08)' },
  statLabel: { margin:0, color:'#718096', fontSize:'18px', fontWeight:'bold' },
  statDetail: { display:'flex', flexDirection:'column', fontSize:'16px', color:'#4a5568', gap:'8px', marginTop:'15px', borderTop:'2px solid #edf2f7', paddingTop:'15px' },
  statSub: { margin:0, fontSize:'16px', color:'#a0aec0' },
  card: { backgroundColor:'white', padding:'30px', borderRadius:'20px', boxShadow:'0 6px 12px rgba(0,0,0,0.08)', display:'flex', flexDirection:'column' },
  cardTitle: { margin:'0 0 25px 0', fontSize:'22px', fontWeight:'bold', color:'#2d3748', borderLeft:'8px solid #3182ce', paddingLeft:'15px' },
  balanceTable: { width: '100%', borderCollapse: 'collapse', fontSize: '16px' },
  balanceTh: { textAlign: 'left', padding: '10px 8px', borderBottom: '2px solid #e2e8f0', color: '#718096', fontSize: '14px' },
  balanceTd: { padding: '10px 8px', borderBottom: '1px solid #edf2f7' },
  mainGrid: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'30px' },
  detailList: { display:'flex', flexDirection:'column', gap:'15px' },
  detailRow: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px', backgroundColor:'#f8fafc', borderRadius:'12px', fontSize:'18px' },
  detailLabel: { color:'#4a5568', fontWeight:'500' },
  detailValue: { fontWeight:'bold', color:'#2d3748' },
  rankBadge: { width:'28px', height:'28px', backgroundColor:'#3182ce', color:'white', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'bold' },
  noData: { textAlign:'center', color:'#999', padding:'20px', fontSize:'18px' }
};

export default MonthlyAnalysis;
