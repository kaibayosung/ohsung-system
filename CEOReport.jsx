import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, LineChart, Line, Legend 
} from 'recharts';

function CEOReport() {
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [reportData, setReportData] = useState({
    daily: { workSales: 0, otherIncome: 0, expense: 0, netProfit: 0, weight: 0 },
    otherIncomeList: [], // 기타 수입 상세 내역
    expenseList: [],     // [신규] 지출 상세 내역
    monthly: { workSales: 0, otherIncome: 0, expense: 0, netProfit: 0 },
    equipment: [],
    dailyTrend: []
  });

  const EQ_COLORS = { '슬리팅 1': '#3182ce', '슬리팅 2': '#805ad5', '레베링': '#38a169', '기타': '#718096' };

  useEffect(() => {
    fetchCEOData();
  }, [selectedDate]);

  const fetchCEOData = async () => {
    setLoading(true);
    const [year, month, day] = selectedDate.split('-');
    const monthStart = `${year}-${month}-01`;

    try {
      const { data: dSales } = await supabase.from('sales_records').select('*').eq('work_date', selectedDate);
      const { data: dLedger } = await supabase.from('daily_ledger').select('*').eq('trans_date', selectedDate);
      const { data: mSales } = await supabase.from('sales_records').select('*').gte('work_date', monthStart).lte('work_date', selectedDate);
      const { data: mLedger } = await supabase.from('daily_ledger').select('*').gte('trans_date', monthStart).lte('trans_date', selectedDate);

      const calcTotal = (arr, field) => arr?.reduce((sum, r) => sum + (Number(r[field]) || 0), 0) || 0;
      
      const dWork = calcTotal(dSales, 'total_price');
      const dIncomeList = dLedger.filter(r => r.type === '수입');
      const dExpenseList = dLedger.filter(r => r.type === '지출'); // [신규] 지출 리스트 추출

      const eqMap = { '슬리팅 1': { sales:0, count:0 }, '슬리팅 2': { sales:0, count:0 }, '레베링': { sales:0, count:0 } };
      dSales?.forEach(s => {
        if(eqMap[s.work_type]) {
          eqMap[s.work_type].sales += s.total_price;
          eqMap[s.work_type].count += 1;
        }
      });
      const equipment = Object.entries(eqMap).map(([name, data]) => ({ name, value: data.sales, count: data.count }));

      const trend = [];
      const currentDay = new Date(selectedDate).getDate();
      for (let i = 1; i <= currentDay; i++) {
        const dateStr = `${year}-${month}-${i.toString().padStart(2, '0')}`;
        if (new Date(dateStr).getDay() !== 0 && new Date(dateStr).getDay() !== 6) {
          const daySales = mSales?.filter(s => s.work_date === dateStr).reduce((sum, s) => sum + s.total_price, 0) || 0;
          trend.push({ name: `${i}일`, sales: Math.round(daySales / 10000) });
        }
      }

      setReportData({
        daily: { workSales: dWork, otherIncome: calcTotal(dIncomeList, 'amount'), expense: calcTotal(dExpenseList, 'amount'), netProfit: (dWork + calcTotal(dIncomeList, 'amount')) - calcTotal(dExpenseList, 'amount'), weight: calcTotal(dSales, 'weight') },
        otherIncomeList: dIncomeList,
        expenseList: dExpenseList,
        monthly: { workSales: calcTotal(mSales, 'total_price'), otherIncome: calcTotal(mLedger.filter(r=>r.type==='수입'), 'amount'), expense: calcTotal(mLedger.filter(r=>r.type==='지출'), 'amount'), netProfit: 0 },
        equipment,
        dailyTrend: trend
      });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.reportTag}>OFFICIAL BRIEFING</span>
          <h1 style={styles.title}>CEO 일일 경영 브리핑</h1>
        </div>
        <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} style={styles.datePicker} />
      </header>

      {/* 1. 핵심 지표 요약 */}
      <div style={styles.statGrid}>
        <div style={{...styles.mainCard, borderTop: '4px solid #3182ce'}}>
          <p style={styles.label}>금일 총 수익 (매출+기타)</p>
          <h2 style={{...styles.val, color:'#2b6cb0'}}>{(reportData.daily.workSales + reportData.daily.otherIncome).toLocaleString()}원</h2>
          <div style={styles.miniDetail}>
            <span>🏗️ 작업매출: {reportData.daily.workSales.toLocaleString()}</span>
            <span>💰 기타수입: {reportData.daily.otherIncome.toLocaleString()}</span>
          </div>
        </div>
        <div style={{...styles.mainCard, borderTop: '4px solid #e53e3e'}}>
          <p style={styles.label}>금일 총 지출</p>
          <h2 style={{...styles.val, color:'#c53030'}}>{reportData.daily.expense.toLocaleString()}원</h2>
          <p style={styles.subText}>현금/카드/계산서 전체 합계</p>
        </div>
        <div style={{...styles.mainCard, borderTop: '4px solid #38a169', backgroundColor:'#f0fff4'}}>
          <p style={styles.label}>금일 영업 이익</p>
          <h2 style={{...styles.val, color:'#2f855a'}}>{reportData.daily.netProfit.toLocaleString()}원</h2>
          <p style={styles.subText}>당일 수익률: {((reportData.daily.netProfit / (reportData.daily.workSales + reportData.daily.otherIncome || 1)) * 100).toFixed(1)}%</p>
        </div>
      </div>

      <div style={styles.contentGrid}>
        {/* [요청 1] 설비 가공 및 매출 (금액 + 갯수 통합 표시) */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>⚙️ 설비별 실적 (금액 & 수량)</h3>
          <div style={{height:'220px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.equipment} margin={{top:10, right:20, left:0, bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 14, fontWeight:'bold'}} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip formatter={(v)=>v.toLocaleString()+'원'} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {reportData.equipment.map((entry, idx) => (
                    <Cell key={idx} fill={EQ_COLORS[entry.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={styles.eqSummaryRow}>
            {reportData.equipment.map(eq => (
              <div key={eq.name} style={styles.eqBadge}>
                <span style={{fontSize:'12px', color:'#718096'}}>{eq.name}</span>
                <span style={{fontSize:'16px', fontWeight:'bold'}}>{eq.value.toLocaleString()}원</span>
                <span style={{fontSize:'14px', color:EQ_COLORS[eq.name]}}>{eq.count}건(Coil)</span>
              </div>
            ))}
          </div>
        </div>

        {/* 매출 추이 */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📈 평일 매출 흐름 (만원)</h3>
          <div style={{height:'220px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reportData.dailyTrend} margin={{top:10, right:20, left:0, bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#3182ce" strokeWidth={3} dot={{r:4}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{textAlign:'right', marginTop:'10px', fontSize:'14px', fontWeight:'bold'}}>
             총 생산중량: <span style={{color:'#3182ce'}}>{reportData.daily.weight.toLocaleString()} kg</span>
          </div>
        </div>

        {/* [요청 2] 상세 내역 추가 - 기타 수입 */}
        <div style={styles.card}>
          <h3 style={{...styles.cardTitle, color:'#3182ce'}}>💰 기타 수입 상세</h3>
          <div style={styles.scrollList}>
            {reportData.otherIncomeList.map((item, idx) => (
              <div key={idx} style={styles.detailItem}>
                <span style={{fontSize:'14px', flex:1}}>{item.company} <small style={{color:'#999'}}>({item.description})</small></span>
                <b style={{color:'#3182ce', fontSize:'15px'}}>{item.amount.toLocaleString()}원</b>
              </div>
            ))}
            {reportData.otherIncomeList.length === 0 && <p style={styles.noData}>발생 내역 없음</p>}
          </div>
        </div>

        {/* [요청 2] 상세 내역 추가 - 지출 내역 */}
        <div style={styles.card}>
          <h3 style={{...styles.cardTitle, color:'#c53030'}}>💸 지출 상세 내역</h3>
          <div style={styles.scrollList}>
            {reportData.expenseList.map((item, idx) => (
              <div key={idx} style={styles.detailItem}>
                <span style={{fontSize:'14px', flex:1}}>{item.company} <small style={{color:'#999'}}>({item.description})</small></span>
                <b style={{color:'#c53030', fontSize:'15px'}}>{item.amount.toLocaleString()}원</b>
              </div>
            ))}
            {reportData.expenseList.length === 0 && <p style={styles.noData}>집행 내역 없음</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '15px 25px', backgroundColor: '#f4f7f9', height: '100vh', boxSizing: 'border-box', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px', flexShrink: 0 },
  headerLeft: { display:'flex', flexDirection:'column' },
  reportTag: { fontSize:'10px', fontWeight:'bold', color:'#3182ce', letterSpacing:'1px' },
  title: { margin:0, fontSize:'26px', fontWeight:'900', color:'#1a365d' },
  datePicker: { padding:'8px 16px', borderRadius:'10px', border:'2px solid #cbd5e0', fontSize:'16px', fontWeight:'bold' },
  statGrid: { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'15px', marginBottom:'15px', flexShrink: 0 },
  mainCard: { backgroundColor:'white', padding:'12px 20px', borderRadius:'15px', boxShadow:'0 4px 6px rgba(0,0,0,0.05)' },
  label: { margin:0, fontSize:'13px', color:'#718096', fontWeight:'bold' },
  val: { margin:'4px 0', fontSize:'28px', fontWeight:'900' },
  miniDetail: { display:'flex', flexDirection:'column', borderTop:'1px solid #edf2f7', paddingTop:'6px', fontSize:'12px', color:'#4a5568' },
  subText: { margin:0, fontSize:'12px', color:'#a0aec0' },
  contentGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', flex: 1, minHeight: 0 },
  card: { backgroundColor:'white', padding:'12px 18px', borderRadius:'15px', boxShadow:'0 4px 6px rgba(0,0,0,0.05)', display:'flex', flexDirection:'column', overflow: 'hidden' },
  cardTitle: { margin:'0 0 10px 0', fontSize:'15px', fontWeight:'bold', color:'#2d3748', borderLeft:'5px solid #3182ce', paddingLeft:'10px' },
  eqSummaryRow: { display:'flex', justifyContent:'space-around', marginTop:'8px', borderTop:'1px solid #edf2f7', paddingTop:'8px' },
  eqBadge: { display:'flex', flexDirection:'column', alignItems:'center' },
  scrollList: { flex: 1, overflowY: 'auto', display:'flex', flexDirection:'column', gap:'6px' },
  detailItem: { display:'flex', justifyContent:'space-between', padding:'6px 12px', backgroundColor:'#f8fafc', borderRadius:'8px', alignItems:'center' },
  noData: { textAlign:'center', color:'#999', fontSize:'13px', marginTop:'10px' }
};

export default CEOReport;