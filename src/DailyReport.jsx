import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// 작업유형 매핑 — greenp_production.work_type 실제 값(SLITING/SLITING2/LEVELLING) 기준
// (예전엔 sales_records.work_type이 '슬리팅 1' 같은 한글 텍스트였는데, 그린ERP 동기화 테이블은
//  영문 코드로 들어와서 표시용 라벨을 별도로 매핑합니다.)
const WORK_TYPE_LABELS = { SLITING: '슬리팅 1', SLITING2: '슬리팅 2', LEVELLING: '레베링' };
function workTypeLabel(t) { return WORK_TYPE_LABELS[t] || (t || '기타'); }

function DailyReport() {
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('daily');

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const [dailySales, setDailySales] = useState([]);   // greenp_production(가공 매출)
  const [dailyScrap, setDailyScrap] = useState(0);     // scrap_sales(스크랩 매출) 합계
  const [dailyLedger, setDailyLedger] = useState([]);
  const [prevDaySales, setPrevDaySales] = useState(0);

  useEffect(() => {
    if (viewMode === 'daily') fetchDaily();
    else fetchMonthly();
  }, [viewMode, selectedDate, selectedYear, selectedMonth]);

  const fetchDaily = async () => {
    setLoading(true);
    try {
      // [수정] 그린ERP 동기화 테이블(greenp_production) 기준으로 조회 — sales_records는
      // 2026-07-16 이후로 갱신되지 않는 옛 수기입력 테이블이라 최신 데이터가 항상 0으로 보였습니다.
      const { data: sales } = await supabase.from('greenp_production').select('*').eq('slip_date', selectedDate).order('id', { ascending: false });
      const { data: scrap } = await supabase.from('scrap_sales').select('total_amount').eq('sale_date', selectedDate);
      const { data: ledger } = await supabase.from('daily_ledger').select('*').eq('trans_date', selectedDate);

      const prevDate = new Date(selectedDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().split('T')[0];
      const { data: pSales } = await supabase.from('greenp_production').select('amount').eq('slip_date', prevDateStr);
      const { data: pScrap } = await supabase.from('scrap_sales').select('total_amount').eq('sale_date', prevDateStr);

      setDailySales(sales || []);
      setDailyScrap((scrap || []).reduce((sum, r) => sum + Number(r.total_amount || 0), 0));
      setDailyLedger(ledger || []);
      setPrevDaySales(
        (pSales || []).reduce((sum, r) => sum + Number(r.amount || 0), 0)
        + (pScrap || []).reduce((sum, r) => sum + Number(r.total_amount || 0), 0)
      );
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
    sales: dailySales.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) + dailyScrap,
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
    const label = workTypeLabel(s.work_type);
    if (!workTypeAnalysis[label]) workTypeAnalysis[label] = { count: 0, sales: 0, color: '#718096' };
    workTypeAnalysis[label].count += 1;
    workTypeAnalysis[label].sales += (Number(s.amount) || 0);
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
            <StatCard title="금일 총 매출" value={dTotals.sales} sub={`전일 대비: ${salesDiff.toLocaleString()}원 (가공+스크랩)`} subColor={salesDiff>=0?'#38a169':'#e53e3e'} icon="🏗️" color="#3182ce" bg="#ebf8ff" />
            <StatCard title="최종 순수익" value={netProfit} sub="매출(가공+스크랩)+수입-지출" icon="💎" color="#805ad5" bg="#faf5ff" isBold={true} />
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
              <h3 style={styles.cardTitle}>📋 작업 상세 내역 <span style={{fontSize:'14px', fontWeight:500, color:'#a0aec0'}}>(그린ERP 실적)</span></h3>
              <div style={styles.tableScroll}>
                <table style={styles.table} className="dr-table">
                  <thead style={styles.thead}>
                    <tr><th>업체명</th><th>전표번호</th><th>금액</th><th>구분</th></tr>
                  </thead>
                  <tbody>
                    {dailySales.map(r => (
                      <tr key={r.id} style={styles.tr}>
                        <td style={{fontWeight:'bold'}}>{r.company_name || '미지정'}</td>
                        <td style={{fontSize:'15px'}}>{r.slip_no || '-'}</td>
                        <td style={{fontWeight:'bold', color:'#2b6cb0'}}>{Number(r.amount || 0).toLocaleString()}</td>
                        <td><span style={{...styles.badge, backgroundColor: (workTypeAnalysis[workTypeLabel(r.work_type)]?.color || '#718096') + '22', color: workTypeAnalysis[workTypeLabel(r.work_type)]?.color || '#718096'}}>{workTypeLabel(r.work_type)}</span></td>
                      </tr>
                    ))}
                    {dailySales.length === 0 && (
                      <tr><td colSpan="4" style={{textAlign:'center', color:'#a0aec0', padding:'20px'}}>해당일 작업 실적이 없습니다</td></tr>
                    )}
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
                        <div style={{fontSize:'17px', fontWeight:'bold'}}>{r.company}</div>
                        <div style={{fontSize:'14px', color:'#999'}}>{r.description}</div>
                      </div>
                      <span style={{fontWeight:'bold', color:'#2f855a'}}>+{r.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{...styles.ledgerSection, marginTop:'18px'}}>
                <div style={styles.ledgerHeader}>
                  <span style={{color:'#c53030', fontWeight:'bold'}}>📤 지출 내역</span>
                  <span style={{fontWeight:'bold'}}>{dTotals.expense.toLocaleString()}원</span>
                </div>
                <div style={styles.ledgerList}>
                  {expenseList.map(r => (
                    <div key={r.id} style={styles.ledgerRow}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'17px', fontWeight:'bold'}}>{r.company}</div>
                        <div style={{fontSize:'14px', color:'#999'}}>{r.description} | {r.method}</div>
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
      <style>{`
        .dr-table th, .dr-table td { padding: 14px 10px; }
      `}</style>
    </div>
  );
}

const StatCard = ({ title, value, sub, subColor, icon, color, bg, isBold }) => (
  <div style={{...styles.statCard, backgroundColor: bg}}><div style={{fontSize:'34px'}}>{icon}</div><div style={{flex:1}}><p style={styles.statTitle}>{title}</p><h2 style={{...styles.statValue, color, fontSize: isBold?'38px':'34px'}}>{value.toLocaleString()}원</h2><p style={{...styles.statSub, color: subColor || '#718096'}}>{sub}</p></div></div>
);

const styles = {
  container: { padding: '36px', backgroundColor: '#f0f2f5', minHeight: '100vh', display:'flex', flexDirection:'column', gap:'26px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: '32px', fontWeight: '900', color: '#1a365d' },
  headerActions: { display:'flex', gap:'18px', alignItems:'center' },
  tabGroup: { display:'flex', backgroundColor:'#e2e8f0', borderRadius:'10px', padding:'5px' },
  tab: (active) => ({ padding:'12px 22px', border:'none', borderRadius:'8px', cursor:'pointer', backgroundColor: active?'white':'transparent', fontWeight: active?'bold':'normal', color: active?'#3182ce':'#4a5568', fontSize: '17px' }),
  dateInput: { padding:'12px 16px', borderRadius:'10px', border:'1px solid #cbd5e0', fontSize: '17px' },
  content: { display:'flex', flexDirection:'column', gap:'26px' },
  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
  statCard: { padding: '30px', borderRadius: '20px', display: 'flex', gap: '20px', alignItems: 'center' },
  statTitle: { margin: 0, fontSize: '16px', color: '#718096', fontWeight: 'bold' },
  statValue: { margin: '6px 0', fontWeight: '900' },
  statSub: { margin: 0, fontSize: '15px' },
  workTypeGrid: { display:'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap:'18px', marginTop:'14px' },
  workTypeCard: { backgroundColor:'#f8fafc', padding:'20px', borderRadius:'13px', display:'flex', flexDirection:'column', gap:'8px' },
  workTypeInfo: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  workTypeName: { fontWeight:'bold', fontSize:'18px', color:'#2d3748' },
  workTypeCount: { fontSize:'22px', fontWeight:'900' },
  workTypeSales: { display:'flex', justifyContent:'space-between', fontSize:'16px' },
  progressBg: { height:'8px', backgroundColor:'#e2e8f0', borderRadius:'5px', marginTop:'6px', overflow:'hidden' },
  progressFill: { height:'100%', borderRadius:'5px' },
  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' },
  card: { backgroundColor: 'white', padding: '28px', borderRadius: '20px', boxShadow: '0 6px 12px rgba(0,0,0,0.08)' },
  cardTitle: { margin: '0 0 20px 0', fontSize: '22px', fontWeight: 'bold', color: '#2d3748', borderLeft:'5px solid #3182ce', paddingLeft:'13px' },
  tableScroll: { maxHeight: '520px', overflowY: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '17px', textAlign:'center' },
  thead: { position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 5 },
  tr: { borderBottom: '1px solid #edf2f7', height: '54px' },
  badge: { padding: '5px 12px', borderRadius: '7px', fontSize: '15px', fontWeight:'bold' },
  ledgerSection: { display: 'flex', flexDirection: 'column', gap: '10px' },
  ledgerHeader: { display: 'flex', justifyContent: 'space-between', fontSize: '17px', paddingBottom: '8px', borderBottom: '1px solid #edf2f7' },
  ledgerList: { maxHeight: '220px', overflowY: 'auto' },
  ledgerRow: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', backgroundColor:'#f8fafc', borderRadius:'10px', marginBottom:'7px' },
  noData: { textAlign:'center', color:'#999', padding:'14px', fontSize:'15px' },
  value: { fontWeight:'bold' }, label: { color:'#718096' }
};

export default DailyReport;
