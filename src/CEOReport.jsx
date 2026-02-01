import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line 
} from 'recharts';

function CEOReport() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState({
    daily: { workSales: 0, otherIncome: 0, expense: 0, netProfit: 0 },
    dailyClients: [], equipmentBar: [], dailyTrend: []
  });
  const [notes, setNotes] = useState([]);
  // [수정] DB 데이터 연동을 위해 초기값을 빈 배열로 변경
  const [expenseList, setExpenseList] = useState([]);

  const EQ_COLORS = { '슬리팅 1': '#3182ce', '슬리팅 2': '#805ad5', '레베링': '#38a169', '기타': '#718096' };

  useEffect(() => { fetchCEOData(); fetchNotes(); }, [selectedDate]);

  const fetchCEOData = async () => {
    const [year, month] = selectedDate.split('-');
    // 1. DB에서 데이터 가져오기
    const { data: dSales } = await supabase.from('sales_records').select('*').eq('work_date', selectedDate);
    const { data: dLedger } = await supabase.from('daily_ledger').select('*').eq('trans_date', selectedDate);
    const { data: mSales } = await supabase.from('sales_records').select('work_date, total_price').gte('work_date', `${year}-${month}-01`).lte('work_date', selectedDate);

    // 2. 총액 계산
    const calcTotal = (arr, type) => arr?.filter(r => !type || r.type === type).reduce((sum, r) => sum + (Number(r.total_price || r.amount) || 0), 0) || 0;
    
    // 3. [핵심 수정] DB에서 가져온 Ledger 데이터 중 '지출'만 필터링하여 상세 내역 목록 업데이트
    const realtimeExpenses = dLedger
      ?.filter(item => item.type === '지출')
      .map(item => ({
        id: item.id,
        item: item.description, // DB의 description 컬럼을 항목명으로 사용
        amount: item.amount,
        note: item.note || ''
      })) || [];
    setExpenseList(realtimeExpenses);

    // 4. 기타 데이터 집계 (거래처, 장비, 트렌드)
    const clientMap = {}; dSales?.forEach(s => { const n = s.customer_name || s.companies?.name || '미지정'; clientMap[n] = (clientMap[n] || 0) + s.total_price; });
    const eqStats = { '슬리팅 1': { s:0, c:0 }, '슬리팅 2': { s:0, c:0 }, '레베링': { s:0, c:0 } };
    dSales?.forEach(s => { if(eqStats[s.work_type]) { eqStats[s.work_type].s += s.total_price; eqStats[s.work_type].c += 1; } });

    const trend = [];
    for (let i = 1; i <= new Date(selectedDate).getDate(); i++) {
      const d = `${year}-${month}-${i.toString().padStart(2, '0')}`;
      if ([1,2,3,4,5].includes(new Date(d).getDay())) {
        const s = mSales?.filter(x => x.work_date === d).reduce((a, b) => a + b.total_price, 0) || 0;
        trend.push({ name: `${i}일`, sales: Math.round(s / 1000) });
      }
    }

    // 5. 최종 리포트 데이터 업데이트
    setReportData({
      daily: { workSales: calcTotal(dSales), otherIncome: calcTotal(dLedger, '수입'), expense: calcTotal(dLedger, '지출'), netProfit: (calcTotal(dSales) + calcTotal(dLedger, '수입')) - calcTotal(dLedger, '지출') },
      dailyClients: Object.entries(clientMap).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value),
      equipmentBar: Object.entries(eqStats).map(([name, d]) => ({ name, value: d.s, count: d.c })), dailyTrend: trend
    });
  };

  const fetchNotes = useCallback(async () => {
    const { data } = await supabase.from('daily_notes').select('*').eq('work_date', selectedDate).order('created_at', { ascending: true });
    setNotes(data || []);
  }, [selectedDate]);

  const formattedDate = () => {
    const d = new Date(selectedDate);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  const handlePrint = () => { window.print(); };

  return (
    <div className="report-container" style={styles.container}>
      <div className="no-print" style={styles.headerControl}>
        <h1 style={styles.pageTitle}>오성철강 CEO 일일 경영 브리핑 ({formattedDate()})</h1>
        <div style={styles.controlGroup}>
            <button onClick={handlePrint} style={styles.printBtn}>🖨️ 출력 보기</button>
            <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} style={styles.datePicker} />
        </div>
      </div>

      <div style={styles.reportContent}>
        <div style={styles.topGrid}>
          <div style={styles.mainCard}>
            <h3 style={styles.cardTitle}>총 수익</h3>
            <p style={styles.mainValue}>{(reportData.daily.workSales + reportData.daily.otherIncome).toLocaleString()}원</p>
          </div>
          <div style={styles.mainCard}>
            <h3 style={styles.cardTitle}>총 지출</h3>
            <p style={styles.mainValue}>{reportData.daily.expense.toLocaleString()}원</p>
          </div>
          <div style={styles.mainCard}>
            <h3 style={styles.cardTitle}>영업 이익</h3>
            <p style={styles.mainValue}>{reportData.daily.netProfit.toLocaleString()}원</p>
          </div>
        </div>

        <div style={styles.middleGrid}>
            <div style={{...styles.contentCard, flex: 1}}>
                <h3 style={styles.cardTitle}>장비별 상세 실적</h3>
                <div style={styles.eqBarChart}>
                    {reportData.equipmentBar.map(e => {
                        const totalSales = reportData.daily.workSales || 1;
                        const widthPercentage = (e.value / totalSales) * 100;
                        return (
                            <div key={e.name} style={styles.eqBarItem}>
                                <span style={styles.eqName}>{e.name}</span>
                                <div style={styles.barContainer}>
                                    <div style={{...styles.barFill, width: `${widthPercentage}%`, backgroundColor: EQ_COLORS[e.name]}}></div>
                                    <span style={styles.barLabel}>{e.value.toLocaleString()}원 ({e.count}건)</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div style={{...styles.contentCard, flex: 1}}>
                <h3 style={styles.cardTitle}>비용 지출 내역 ({expenseList.length}건)</h3>
                <div style={styles.tableContainer}>
                    <table style={styles.expenseTable}>
                        <thead>
                            <tr>
                                <th style={styles.th}>항목</th>
                                <th style={{...styles.th, textAlign: 'right'}}>금액</th>
                                <th style={styles.th}>비고</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenseList.length > 0 ? (
                                expenseList.map(expense => (
                                    <tr key={expense.id}>
                                        <td style={styles.td}>{expense.item}</td>
                                        <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold'}}>{expense.amount.toLocaleString()}원</td>
                                        <td style={styles.td}>{expense.note}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="3" style={{...styles.td, textAlign:'center', color:'#999'}}>등록된 지출 내역이 없습니다.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div style={styles.bottomGrid}>
            <div style={styles.contentCard}>
                <h3 style={styles.cardTitle}>이달의 매출 추이 (천원)</h3>
                <div style={{height:'200px'}}><ResponsiveContainer><LineChart data={reportData.dailyTrend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Line type="monotone" dataKey="sales" stroke="#3182ce" strokeWidth={3}/></LineChart></ResponsiveContainer></div>
            </div>
            <div style={styles.contentCard}>
                <h3 style={styles.cardTitle}>거래처 매출</h3>
                <div style={styles.clientList}>
                    {reportData.dailyClients.map((c, i) => (
                        <div key={i} style={styles.clientItem}>
                            <span style={styles.clientName}>{c.name}</span>
                            <div style={styles.clientBarContainer}>
                                <div style={{...styles.clientBarFill, width: `${(c.value / (reportData.daily.workSales || 1)) * 100}%`}}></div>
                                <span style={styles.clientValue}>{c.value.toLocaleString()}원</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={styles.contentCard}>
                <h3 style={styles.cardTitle}>주요 내용</h3>
                <div style={styles.noteList}>
                    {notes.map((n, i) => (
                        <div key={i} style={styles.noteItem}>
                            <span>• {n.content}</span>
                            <button className="no-print" onClick={()=>supabase.from('daily_notes').delete().eq('id', n.id).then(()=>fetchNotes())} style={styles.deleteNoteBtn}>×</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .report-container { padding: 0 !important; background-color: white !important; }
          .report-content { box-shadow: none !important; padding: 20px !important; }
          body { -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: { padding: '20px', backgroundColor: '#e2e8f0', minHeight: '100vh' },
  headerControl: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '15px 20px', backgroundColor: 'white', color: '#2d3748', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  pageTitle: { margin: 0, fontSize: '24px', fontWeight: 'bold' },
  controlGroup: { display: 'flex', gap: '10px' },
  printBtn: { padding: '8px 15px', backgroundColor: 'white', color: '#4a5568', border: '1px solid #cbd5e0', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' },
  datePicker: { padding: '8px', borderRadius: '5px', border: '1px solid #cbd5e0', backgroundColor: 'white', color: '#333' },
  reportContent: { backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' },
  topGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' },
  mainCard: { backgroundColor: '#f7fafc', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #edf2f7' },
  cardTitle: { margin: '0 0 10px 0', fontSize: '16px', color: '#4a5568', fontWeight: 'bold' },
  mainValue: { margin: 0, fontSize: '28px', fontWeight: '900', color: '#2d3748' },
  middleGrid: { display: 'flex', gap: '20px', marginBottom: '20px' },
  contentCard: { backgroundColor: '#f7fafc', padding: '20px', borderRadius: '12px', border: '1px solid #edf2f7' },
  eqBarChart: { display: 'flex', flexDirection: 'column', gap: