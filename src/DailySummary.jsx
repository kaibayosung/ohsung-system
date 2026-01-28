import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function DailySummary() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState({ sales: 0, income: 0, expense: 0 });
  const [prevWeekSummary, setPrevWeekSummary] = useState(null); // 지난주 데이터
  const [isClosed, setIsClosed] = useState(false);
  const [loading, setLoading] = useState(false);

  // 날짜 변경 시 데이터 다시 불러오기
  useEffect(() => { fetchDailyData(selectedDate); }, [selectedDate]);

  const fetchDailyData = async (date) => {
    setLoading(true);
    try {
      // 1. 금일 데이터 조회 (마감 여부 확인)
      const { data: closing } = await supabase.from('daily_closings').select('*').eq('closing_date', date).single();
      
      if (closing && closing.is_closed) {
        // 마감된 경우: 마감 테이블에서 확정 데이터 가져오기
        setSummary({ sales: closing.total_sales, income: closing.total_income, expense: closing.total_expense });
        setIsClosed(true);
      } else {
        // 미마감 경우: 실시간 데이터 집계
        const { data: s } = await supabase.from('sales_records').select('total_price').eq('work_date', date);
        const { data: l } = await supabase.from('daily_ledger').select('amount, type').eq('trans_date', date);
        setSummary({
          sales: s?.reduce((acc, cur) => acc + Number(cur.total_price), 0) || 0,
          income: l?.filter(r => r.type === '수입').reduce((acc, cur) => acc + Number(cur.amount), 0) || 0,
          expense: l?.filter(r => r.type === '지출').reduce((acc, cur) => acc + Number(cur.amount), 0) || 0
        });
        setIsClosed(false);
      }

      // 2. 지난주 동요일 데이터 조회 (추이 비교용)
      const prevDate = new Date(date);
      prevDate.setDate(prevDate.getDate() - 7);
      const prevDateStr = prevDate.toISOString().split('T')[0];
      
      // (간단히 마감된 데이터 기준으로만 조회)
      const { data: prevClosing } = await supabase.from('daily_closings').select('*').eq('closing_date', prevDateStr).single();
      if (prevClosing) {
        setPrevWeekSummary({ sales: prevClosing.total_sales, expense: prevClosing.total_expense });
      } else {
        setPrevWeekSummary(null); // 지난주 데이터 없음
      }

    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // 마감 처리 및 이메일 발송
  const handleCloseDay = async () => {
    const netProfit = (summary.sales + summary.income) - summary.expense;
    if (!window.confirm(`${selectedDate} 일계를 마감하시겠습니까?\n마감 후에는 이메일이 발송됩니다.`)) return;
    
    setLoading(true);
    try {
      // 1. DB에 마감 기록 저장
      const { error: dbError } = await supabase.from('daily_closings').upsert({
        closing_date: selectedDate, total_sales: summary.sales, total_income: summary.income, total_expense: summary.expense, net_profit: netProfit, is_closed: true, closed_at: new Date().toISOString(), closed_by: '정대균 실장'
      });
      if (dbError) throw dbError;

      setIsClosed(true);
      alert("마감이 완료되었습니다. 이메일 발송을 시도합니다...");

      // 2. Edge Function 호출하여 이메일 발송 (이 부분이 핵심!)
      // 주의: Edge Function이 배포되어 있어야 작동합니다.
      const { error: funcError } = await supabase.functions.invoke('send-closing-email', {
        body: { date: selectedDate, sales: summary.sales, income: summary.income, expense: summary.expense, profit: netProfit }
      });
      
      if (funcError) throw funcError;
      alert("이메일 발송이 완료되었습니다! (kaibay@naver.com)");

    } catch (err) {
      console.error(err);
      alert("마감은 되었으나 이메일 발송에 실패했을 수 있습니다. (Edge Function 설정을 확인하세요)");
    } finally {
      setLoading(false);
    }
  };

  // 마감 해제 (수정 모드)
  const handleUnlockDay = async () => {
    if (!window.confirm(`경고: ${selectedDate} 마감을 해제하시겠습니까?\n해제 후 데이터를 수정할 수 있습니다.`)) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('daily_closings').update({ is_closed: false }).eq('closing_date', selectedDate);
      if (error) throw error;
      alert("마감이 해제되었습니다. 작업일보/일계표에서 데이터를 수정한 후 다시 마감해주세요.");
      fetchDailyData(selectedDate); // 데이터 재조회
    } catch (err) { alert("해제 실패: " + err.message); } finally { setLoading(false); }
  };

  const netProfit = (summary.sales + summary.income) - summary.expense;

  // 지난주 대비 증감율 계산 함수
  const getTrend = (current, prev) => {
    if (!prev || prev === 0) return null;
    const diff = current - prev;
    const percent = (diff / prev) * 100;
    return { diff, percent, isUp: diff > 0 };
  };
  const salesTrend = getTrend(summary.sales, prevWeekSummary?.sales);
  const expenseTrend = getTrend(summary.expense, prevWeekSummary?.expense);


  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
          <h2 style={{margin: 0}}>📅 일일 결산 보고서</h2>
          {/* 날짜 선택기 */}
          <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} style={styles.dateInput} />
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
          <span style={{...styles.badge, backgroundColor: isClosed ? '#48bb78' : '#ed8936'}}>{isClosed ? '● 마감 완료' : '○ 입력 중 (미마감)'}</span>
          {isClosed && <button onClick={handleUnlockDay} style={styles.unlockBtn}>🔒 마감 해제(수정)</button>}
        </div>
      </div>

      {/* 주간 추이 비교 섹션 */}
      <div style={styles.trendSection}>
        <TrendCard title="매출 추이 (vs 지난주)" current={summary.sales} trend={salesTrend} color="#2b6cb0" />
        <TrendCard title="지출 추이 (vs 지난주)" current={summary.expense} trend={expenseTrend} color="#c53030" inverse={true} />
      </div>

      <div style={styles.grid}>
        <Card title="① 총 작업 매출" value={summary.sales} color="#2b6cb0" />
        <Card title="② 기타 수입" value={summary.income} color="#2c7a7b" />
        <Card title="③ 총 지출" value={summary.expense} color="#c53030" />
      </div>
      <div style={{...styles.resultCard, borderColor: isClosed ? '#48bb78' : '#cbd5e0'}}>
        <p style={{fontSize:'18px', color:'#4a5568', marginBottom:'5px'}}>오늘의 최종 순이익 (①+②-③)</p>
        <h2 style={{fontSize:'42px', margin:'10px 0', color: netProfit >= 0 ? '#2f855a' : '#c53030'}}>{netProfit.toLocaleString()} 원</h2>
        {!isClosed ? (
          <button onClick={handleCloseDay} disabled={loading} style={styles.closeBtn}>
            {loading ? '처리 중...' : '오늘 업무 마감 및 이메일 발송'}
          </button>
        ) : (
          <p style={{color: '#48bb78', fontWeight:'bold'}}>※ 마감이 완료된 날짜입니다.</p>
        )}
      </div>
      <button onClick={()=>fetchDailyData(selectedDate)} style={styles.refreshBtn}>데이터 새로고침</button>
    </div>
  );
}

// 추이 카드 컴포넌트
const TrendCard = ({title, current, trend, color, inverse=false}) => {
  if (!trend) return <div style={styles.trendCard}><p style={styles.label}>{title}</p><h3 style={{color}}>{current.toLocaleString()}</h3><span style={{fontSize:'12px', color:'#aaa'}}>(지난주 데이터 없음)</span></div>;
  const isGood = inverse ? !trend.isUp : trend.isUp; // 지출은 줄어야 좋은 것
  return (
    <div style={styles.trendCard}>
      <p style={styles.label}>{title}</p>
      <h3 style={{color, margin:'10px 0'}}>{current.toLocaleString()}</h3>
      <div style={{display:'flex', alignItems:'center', fontSize:'14px', color: isGood?'#48bb78':'#e53e3e', fontWeight:'bold'}}>
        <span>{trend.isUp ? '▲' : '▼'} {Math.abs(trend.diff).toLocaleString()} ({Math.abs(trend.percent).toFixed(1)}%)</span>
      </div>
    </div>
  );
}

const Card = ({title, value, color}) => (
  <div style={{flex: 1, backgroundColor: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center'}}>
    <p style={styles.label}>{title}</p>
    <h3 style={{color: color, fontSize: '22px', margin: 0}}>{value.toLocaleString()}원</h3>
  </div>
);

const styles = { container: { padding: '40px', maxWidth: '1000px', margin: '0 auto', overflowY:'auto' }, header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', backgroundColor:'white', padding:'20px', borderRadius:'15px' }, dateInput:{ fontSize:'18px', padding:'10px', borderRadius:'8px', border:'1px solid #cbd5e0' }, badge: { padding: '8px 15px', borderRadius: '20px', color: 'white', fontSize: '14px', fontWeight: 'bold' }, unlockBtn:{marginLeft:'10px', padding:'8px 15px', backgroundColor:'#a0aec0', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'bold'}, trendSection:{ display:'flex', gap:'20px', marginBottom:'30px' }, trendCard:{ flex:1, backgroundColor:'white', padding:'20px', borderRadius:'15px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)' }, label: { fontSize: '14px', color: '#718096', marginBottom: '10px' }, grid: { display: 'flex', gap: '20px', marginBottom: '30px' }, resultCard: { backgroundColor: 'white', padding: '40px', borderRadius: '25px', textAlign: 'center', border: '3px solid' }, closeBtn: { marginTop: '20px', padding: '20px 40px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '12px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', boxShadow:'0 4px 15px rgba(49,130,206,0.3)' }, refreshBtn: { marginTop: '30px', background: 'none', border: 'none', color: '#a0aec0', cursor: 'pointer', textDecoration: 'underline', width:'100%' } };
export default DailySummary;