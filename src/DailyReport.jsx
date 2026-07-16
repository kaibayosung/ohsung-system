import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, LineChart, Line, Legend 
} from 'recharts';

function DailyReport() {
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('daily'); 
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  
  const [dailySales, setDailySales] = useState([]);
  const [dailyLedger, setDailyLedger] = useState([]);
  const [prevDaySales, setPrevDaySales] = useState(0); 

  useEffect(() => {
    if (viewMode === 'daily') fetchDaily();
    else fetchMonthly();
  }, [viewMode, selectedDate, selectedYear, selectedMonth]);

  const fetchDaily = async () => {
    setLoading(true);
    try {
      // [수정] customer_name 컬럼이 포함되도록 쿼리 확인
      const { data: sales } = await supabase.from('sales_records').select('*, companies(name)').eq('work_date', selectedDate);
      const { data: ledger } = await supabase.from('daily_ledger').select('*').eq('trans_date', selectedDate);
      
      const prevDate = new Date(selectedDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const { data: pSales } = await supabase.from('sales_records').select('total_price').eq('work_date', prevDate.toISOString().split('T')[0]);
      
      setDailySales(sales || []);
      setDailyLedger(ledger || []);
      setPrevDaySales(pSales?.reduce((sum, r) => sum + r.total_price, 0) || 0);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchMonthly = async () => {
    setLoading(true);
    // 월간 요약 로직 (기존 유지)
    setLoading(false);
  };

  const incomeList = dailyLedger.filter(r => r.type === '수입');
  const expenseList = dailyLedger.filter(r => r.type === '지출');

  const dTotals = {
    sales: dailySales.reduce((sum, r) => sum + (Number(r.total_price) || 0), 0),
    income: incomeList.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    expense: expenseList.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
  };
  const netProfit = (dTotals.sales + dTotals.income) - dTotals.expense;
  const salesDiff = dTotals.sales - prevDaySales;

  const workTypeAnalysis = {
    '슬리팅 1': { count: 0, sales: 0, color: '#3182ce' },
    '슬리팅 2': { count: 0, sales: 0, color: '#805ad5' },
    '레베링': { count: 0, sales: 0, color: '#38a169' },
    '기타': { count: 0, sales: 0, color: '#718096' }
  };

  dailySales.forEach(s => {
    const type = s.work_type || '기타';
    if (!workTypeAnalysis[type]) workTypeAnalysis[type] = { count: 0, sales: 0, color: '#718096' };
    workTypeAnalysis[type].count += 1;
    workTypeAnalysis[type].sales += (Number(s.total_price) || 0);
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📈 오성철강 데일리 리포트 (2026)</h2>
        <div style={styles.headerActions}>
          <div style={styles.tabGroup}>
            <button onClick={() => setViewMode('daily')} style={styles.tab(viewMode==='daily')}>일별 상세</button>
            <button onClick={() => setViewMode('monthly')} style={styles.tab(viewMode==='monthly')}>월간 요약</button>
          </div>
          <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} style={styles.dateInput}/>
        </div>
      </div>

      {viewMode === 'daily' && (
        <div style={styles.content}>
          <div style={styles.statGrid}>
            <StatCard title="금일 총 매출" value={dTotals.sales} sub={`전일 대비: ${salesDiff.toLocaleString()}원`} subColor={salesDiff>=0?'#38a169':'#e53e3e'} icon="🏗️" color="#3182ce" bg="#ebf8ff" />
            <StatCard title="최종 순수익" value={netProfit} sub="매출+수입-지출" icon="💎" color="#805ad5" bg="#faf5ff" isBold={true} />
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>⚙️ 설비별 작업 생산성 분석</h3>
            <div style={styles.workTypeGrid}>
              {Object.entries(workTypeAnalysis).map(([name, data]) => (
                <div key={name} style={{...styles.workTypeCard, borderLeft: `5px solid ${data.color}`}}>
                  <div style={styles.workTypeInfo}>
                    <span style={styles.workTypeName}>{name}</span>
                    <span style={{...styles.workTypeCount, color: data.color}}>{data.count} <small>건</small></span>
                  </div>
                  <div style={styles.workTypeSales}>
                    <span style={styles.label}>매출액:</span>
                    <span style={styles.value}>{data.sales.toLocaleString()}원</span>
                  </div>
                  <div style={styles.progressBg}>
                    <div style={{...styles.progressFill, width: `${(data.sales / (dTotals.sales || 1)) * 100}%`, backgroundColor: data.color}}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.mainGrid}>
            <div style={{...styles.card, gridColumn: 'span 2'}}>
              <h3 style={styles.cardTitle}>📋 작업 상세 내역</h3>
              <div style={styles.tableScroll}>
                <table style={styles.table}>
                  <thead style={styles.thead}>
                    <tr><th>업체명</th><th>품명/규격</th><th>중량</th><th>금액</th><th>구분</th></tr>
                  </thead>
                  <tbody>
                    {dailySales.map(r => (
                      <tr key={r.id} style={styles.tr}>
                        {/* [수정] 직접 입력한 업체명을 우선 표시 */}
                        <td style={{fontWeight:'bold'}}>{r.customer_name || r.companies?.name || '미지정'}</td>
                        <td style={{textAlign:'left', fontSize:'13px'}}>{r.management_no}</td>
                        <td>{r.weight.toLocaleString()}</td>
                        <td style={{fontWeight:'bold', color:'#2b6cb0'}}>{r.total_price.toLocaleString()}</td>
                        <td><span style={{...styles.badge, backgroundColor: workTypeAnalysis[r.work_type]?.color + '22', color: workTypeAnalysis[r.work_type]?.color}}>{r.work_type}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={{...styles.cardTitle, color:'#2d3748', borderLeftColor:'#4a5568'}}>🧾 기타 수입/지출 상세</h3>
              <div style={styles.ledgerSection}>
                <div style={styles.ledgerHeader}>
                  <span style={{color:'#2f855a', fontWeight:'bold'}}>📥 기타 수입</span>
                  <span style={{fontWeight:'bold'}}>{dTotals.income.toLocaleString()}원</span>
                </div>
                <div style={styles.ledgerList}>
                  {incomeList.map(r => (
                    <div key={r.id} style={styles.ledgerRow}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'15px', fontWeight:'bold'}}>{r.company}</div>
                        <div style={{fontSize:'13px', color:'#999'}}>{r.description}</div>
                      </div>
                      <span style={{fontWeight:'bold', color:'#2f855a'}}>+{r.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{...styles.ledgerSection, marginTop:'15px'}}>
                <div style={styles.ledgerHeader}>
                  <span style={{color:'#c53030', fontWeight:'bold'}}>📤 지출 내역</span>
                  <span style={{fontWeight:'bold'}}>{dTotals.expense.toLocaleString()}원</span>
                </div>
                <div style={styles.ledgerList}>
                  {expenseList.map(r => (
                    <div key={r.id} style={styles.ledgerRow}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'15px', fontWeight:'bold'}}>{r.company}</div>
                        <div style={{fontSize:'13px', color:'#999'}}>{r.description} | {r.method}</div>
                      </div>
                      <span style={{fontWeight:'bold', color:'#c53030'}}>-{r.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const StatCard = ({ title, value, sub, subColor, icon, color, bg, isBold }) => (
  <div style={{...styles.statCard, backgroundColor: bg}}><div style={{fontSize:'28px'}}>{icon}</div><div style={{flex:1}}><p style={styles.statTitle}>{title}</p><h2 style={{...styles.statValue, color, fontSize: isBold?'30px':'26px'}}>{value.toLocaleString()}원</h2><p style={{...styles.statSub, color: subColor || '#718096'}}>{sub}</p></div></div>
);

const styles = {
  container: { padding: '28px', backgroundColor: '#f0f2f5', minHeight: '100vh', display:'flex', flexDirection:'column', gap:'22px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: '27px', fontWeight: '900', color: '#1a365d' },
  headerActions: { display:'flex', gap:'16px', alignItems:'center' },
  tabGroup: { display:'flex', backgroundColor:'#e2e8f0', borderRadius:'9px', padding:'4px' },
  tab: (active) => ({ padding:'10px 18px', border:'none', borderRadius:'7px', cursor:'pointer', backgroundColor: active?'white':'transparent', fontWeight: active?'bold':'normal', color: active?'#3182ce':'#4a5568', fontSize: '15px' }),
  dateInput: { padding:'10px 14px', borderRadius:'9px', border:'1px solid #cbd5e0', fontSize: '15px' },
  content: { display:'flex', flexDirection:'column', gap:'22px' },
  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  statCard: { padding: '24px', borderRadius: '16px', display: 'flex', gap: '16px', alignItems: 'center' },
  statTitle: { margin: 0, fontSize: '14px', color: '#718096', fontWeight: 'bold' },
  statValue: { margin: '4px 0', fontWeight: '900' },
  statSub: { margin: 0, fontSize: '13px' },
  workTypeGrid: { display:'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap:'16px', marginTop:'12px' },
  workTypeCard: { backgroundColor:'#f8fafc', padding:'17px', borderRadius:'11px', display:'flex', flexDirection:'column', gap:'6px' },
  workTypeInfo: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  workTypeName: { fontWeight:'bold', fontSize:'16px', color:'#2d3748' },
  workTypeCount: { fontSize:'20px', fontWeight:'900' },
  workTypeSales: { display:'flex', justifyContent:'space-between', fontSize:'14px' },
  progressBg: { height:'7px', backgroundColor:'#e2e8f0', borderRadius:'4px', marginTop:'6px', overflow:'hidden' },
  progressFill: { height:'100%', borderRadius:'4px' },
  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' },
  card: { backgroundColor: 'white', padding: '22px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
  cardTitle: { margin: '0 0 17px 0', fontSize: '18px', fontWeight: 'bold', color: '#2d3748', borderLeft:'4px solid #3182ce', paddingLeft:'11px' },
  tableScroll: { maxHeight: '500px', overflowY: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '15px', textAlign:'center' },
  thead: { position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 5 },
  tr: { borderBottom: '1px solid #edf2f7', height: '46px' },
  badge: { padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight:'bold' },
  ledgerSection: { display: 'flex', flexDirection: 'column', gap: '9px' },
  ledgerHeader: { display: 'flex', justifyContent: 'space-between', fontSize: '15px', paddingBottom: '6px', borderBottom: '1px solid #edf2f7' },
  ledgerList: { maxHeight: '200px', overflowY: 'auto' },
  ledgerRow: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', backgroundColor:'#f8fafc', borderRadius:'9px', marginBottom:'6px' },
  noData: { textAlign:'center', color:'#999', padding:'12px', fontSize:'13px' },
  value: { fontWeight:'bold' }, label: { color:'#718096' }
};

export default DailyReport;
