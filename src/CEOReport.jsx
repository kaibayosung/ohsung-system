import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie
} from 'recharts';

// 아이콘 컴포넌트 (수정/삭제/저장/취소)
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const SaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38a169" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>;
const CancelIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#718096" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;


function CEOReport() {
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // 기존 리포트 데이터 상태
  const [reportData, setReportData] = useState({
    daily: { workSales: 0, otherIncome: 0, expense: 0, netProfit: 0 },
    dailyClients: [], otherIncomeList: [], expenseList: [], equipmentPie: [], equipmentBar: []
  });

  // [신규] 일일 주요 내용 관련 상태
  const [notes, setNotes] = useState([]); // 불러온 메모 리스트
  const [newNoteText, setNewNoteText] = useState(''); // 새로 입력할 내용
  const [editingId, setEditingId] = useState(null); // 수정 중인 메모 ID
  const [editText, setEditText] = useState(''); // 수정 중인 내용

  const EQ_COLORS = { '슬리팅 1': '#3182ce', '슬리팅 2': '#805ad5', '레베링': '#38a169', '기타': '#718096' };
  const PIE_COLORS = ['#3182ce', '#805ad5', '#38a169', '#ed8936'];

  useEffect(() => {
    fetchCEOData();
    fetchNotes(); // 날짜가 바뀌면 메모도 새로 불러옴
  }, [selectedDate]);

  // --- [기존] 리포트 데이터 불러오기 ---
  const fetchCEOData = async () => {
    setLoading(true);
    try {
      const { data: dSales } = await supabase.from('sales_records').select('*, companies(name)').eq('work_date', selectedDate);
      const { data: dLedger } = await supabase.from('daily_ledger').select('*').eq('trans_date', selectedDate);

      const calcTotal = (arr, field) => arr?.reduce((sum, r) => sum + (Number(r[field]) || 0), 0) || 0;
      const dWork = calcTotal(dSales, 'total_price');
      const dIncomeList = dLedger.filter(r => r.type === '수입');
      const dExpenseList = dLedger.filter(r => r.type === '지출');

      const todayCompMap = {};
      dSales?.forEach(s => {
        const name = s.customer_name || s.companies?.name || '미지정';
        todayCompMap[name] = (todayCompMap[name] || 0) + (Number(s.total_price) || 0);
      });
      const dailyClients = Object.entries(todayCompMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

      const eqStatsMap = { '슬리팅 1': { sales: 0, count: 0 }, '슬리팅 2': { sales: 0, count: 0 }, '레베링': { sales: 0, count: 0 } };
      dSales?.forEach(s => {
        const type = s.work_type || '기타';
        if (eqStatsMap[type]) { eqStatsMap[type].sales += s.total_price; eqStatsMap[type].count += 1; }
      });
      const equipmentBar = Object.entries(eqStatsMap).map(([name, data]) => ({ name, value: data.sales, count: data.count }));
      const equipmentPie = equipmentBar.filter(d => d.value > 0).map(d => ({ name: d.name, value: d.value }));

      setReportData({
        daily: { workSales: dWork, otherIncome: calcTotal(dIncomeList, 'amount'), expense: calcTotal(dExpenseList, 'amount'), netProfit: (dWork + calcTotal(dIncomeList, 'amount')) - calcTotal(dExpenseList, 'amount') },
        dailyClients, equipmentPie, equipmentBar, otherIncomeList: dIncomeList, expenseList: dExpenseList
      });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // --- [신규] 일일 주요 내용(메모) 관련 기능 ---

  // 1. 메모 불러오기 (Read)
  const fetchNotes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('daily_notes')
        .select('*')
        .eq('work_date', selectedDate)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('메모 불러오기 실패:', error.message);
    }
  }, [selectedDate]);

  // 2. 메모 추가하기 (Create)
  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    try {
      const { error } = await supabase
        .from('daily_notes')
        .insert([{ work_date: selectedDate, content: newNoteText.trim() }]);
      if (error) throw error;
      setNewNoteText('');
      fetchNotes(); // 목록 새로고침
    } catch (error) {
      alert('메모 추가 실패: ' + error.message);
    }
  };

  // 3. 메모 삭제하기 (Delete)
  const handleDeleteNote = async (id) => {
    if (!window.confirm('이 내용을 삭제하시겠습니까?')) return;
    try {
      const { error } = await supabase.from('daily_notes').delete().eq('id', id);
      if (error) throw error;
      fetchNotes();
    } catch (error) {
      alert('삭제 실패: ' + error.message);
    }
  };

  // 4. 메모 수정 모드 진입
  const startEditing = (note) => {
    setEditingId(note.id);
    setEditText(note.content);
  };

  // 5. 메모 수정 저장하기 (Update)
  const handleUpdateNote = async (id) => {
    if (!editText.trim()) return;
    try {
      const { error } = await supabase
        .from('daily_notes')
        .update({ content: editText.trim() })
        .eq('id', id);
      if (error) throw error;
      setEditingId(null);
      setEditText('');
      fetchNotes();
    } catch (error) {
      alert('수정 실패: ' + error.message);
    }
  };


  // 커스텀 툴팁 (막대 차트용)
  const BarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{backgroundColor:'white', padding:'10px', border:'1px solid #ccc', borderRadius:'5px', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
          <p style={{fontWeight:'bold', margin:0, color: EQ_COLORS[label]}}>{label}</p>
          <p style={{margin:0}}>매출: {data.value.toLocaleString()}원</p>
          <p style={{margin:0}}>수량: {data.count}건(Coil)</p>
        </div>
      );
    }
    return null;
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
          <p style={styles.label}>🛒 금일 총 수익 (매출+기타)</p>
          <h2 style={{...styles.val, color:'#2b6cb0'}}>{(reportData.daily.workSales + reportData.daily.otherIncome).toLocaleString()}원</h2>
        </div>
        <div style={{...styles.mainCard, borderTop: '4px solid #e53e3e'}}>
          <p style={styles.label}>💸 금일 총 지출</p>
          <h2 style={{...styles.val, color:'#c53030'}}>{reportData.daily.expense.toLocaleString()}원</h2>
        </div>
        <div style={{...styles.mainCard, borderTop: '4px solid #38a169', backgroundColor:'#f0fff4'}}>
          <p style={styles.label}>📈 금일 영업 이익</p>
          <h2 style={{...styles.val, color:'#2f855a'}}>{reportData.daily.netProfit.toLocaleString()}원</h2>
        </div>
      </div>

      {/* 2. 상단 컨텐츠 그리드 (거래처 / 설비 막대) */}
      <div style={{...styles.contentGrid, marginBottom:'20px'}}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>🏢 금일 거래처별 매출 현황</h3>
          <div style={styles.scrollList}>
            {reportData.dailyClients.map((client, idx) => (
              <div key={idx} style={styles.detailItem}>
                <span style={{fontSize:'15px', fontWeight: idx===0?'bold':'normal'}}>{idx+1}. {client.name}</span>
                <b style={{fontSize:'15px'}}>{client.value.toLocaleString()}원</b>
              </div>
            ))}
            {reportData.dailyClients.length === 0 && <p style={styles.noData}>금일 매출 내역 없음</p>}
          </div>
        </div>

        <div style={styles.card}>
        <h3 style={styles.cardTitle}>⚙️ 설비별 실적 (금액 & 수량)</h3>
        <div style={{height:'200px'}}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reportData.equipmentBar} margin={{top:20, right:30, left:20, bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{fontSize: 14, fontWeight:'bold'}} />
              <YAxis tick={{fontSize: 12}} tickFormatter={(v) => `${v / 10000}만`} />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} name="매출액">
                {reportData.equipmentBar.map((entry, idx) => (
                  <Cell key={idx} fill={EQ_COLORS[entry.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={styles.eqSummaryRow}>
            {reportData.equipmentBar.map(eq => (
              <div key={eq.name} style={styles.eqBadge}>
                <span style={{fontSize:'16px', fontWeight:'bold', color:'#2d3748'}}>{eq.value.toLocaleString()}원</span>
                <span style={{fontSize:'14px', fontWeight:'bold', color:EQ_COLORS[eq.name]}}>{eq.count}건</span>
              </div>
            ))}
        </div>
      </div>
      </div>

      {/* 3. 하단 컨텐츠 그리드 (수입/지출/주요내용) */}
      <div style={styles.bottomGrid}>
        {/* 기타 수입 */}
        <div style={styles.card}>
          <h3 style={{...styles.cardTitle, color:'#3182ce'}}>💰 금일 기타 수입 상세</h3>
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

        {/* 지출 내역 */}
        <div style={styles.card}>
          <h3 style={{...styles.cardTitle, color:'#c53030'}}>💸 금일 지출 상세 내역</h3>
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

        {/* [신규] 일일 주요 내용 (실제 작동 기능) */}
        <div style={styles.card}>
          <h3 style={{...styles.cardTitle, color:'#d69e2e', borderLeftColor:'#d69e2e'}}>📝 일일 주요 내용</h3>
          
          {/* 메모 리스트 영역 */}
          <div style={{...styles.scrollList, flex:1, marginBottom:'15px'}}>
            {notes.map((note, idx) => (
              <div key={note.id} style={styles.noteItem}>
                {editingId === note.id ? (
                  // 수정 모드
                  <div style={{display:'flex', width:'100%', gap:'10px'}}>
                    <input type="text" value={editText} onChange={(e)=>setEditText(e.target.value)} style={styles.editInput} autoFocus />
                    <button onClick={()=>handleUpdateNote(note.id)} style={styles.iconBtn} title="저장"><SaveIcon/></button>
                    <button onClick={()=>setEditingId(null)} style={styles.iconBtn} title="취소"><CancelIcon/></button>
                  </div>
                ) : (
                  // 일반 보기 모드
                  <>
                    <span style={{fontSize:'15px', flex:1, lineHeight:'1.4'}}>{idx+1}. {note.content}</span>
                    <div style={styles.noteActions}>
                      <button onClick={()=>startEditing(note)} style={{...styles.actionBtn, color:'#3182ce'}}><EditIcon/> 수정</button>
                      <button onClick={()=>handleDeleteNote(note.id)} style={{...styles.actionBtn, color:'#e53e3e'}}><DeleteIcon/> 삭제</button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {notes.length === 0 && <p style={styles.noData}>등록된 주요 내용이 없습니다.</p>}
          </div>

          {/* 입력 영역 */}
          <div style={styles.inputArea}>
            <input 
              type="text" 
              value={newNoteText} 
              onChange={(e)=>setNewNoteText(e.target.value)} 
              onKeyPress={(e)=>e.key==='Enter' && handleAddNote()}
              placeholder="내용을 입력하세요 (예: 휴가자, 특이사항 등)" 
              style={styles.noteInput} 
            />
            <button onClick={handleAddNote} style={styles.addBtn}>추가</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '25px', backgroundColor: '#f4f7f9', minHeight: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' },
  headerLeft: { display:'flex', flexDirection:'column' },
  reportTag: { fontSize:'12px', fontWeight:'bold', color:'#3182ce', letterSpacing:'1px', marginBottom:'4px' },
  title: { margin:0, fontSize:'28px', fontWeight:'900', color:'#1a365d' },
  datePicker: { padding:'10px 16px', borderRadius:'12px', border:'2px solid #cbd5e0', fontSize:'16px', fontWeight:'bold', color:'#2d3748', cursor:'pointer' },
  statGrid: { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'20px', marginBottom:'20px' },
  mainCard: { backgroundColor:'white', padding:'20px', borderRadius:'20px', boxShadow:'0 4px 10px rgba(0,0,0,0.05)' },
  label: { margin:0, fontSize:'14px', color:'#718096', fontWeight:'bold', marginBottom:'8px' },
  val: { margin:0, fontSize:'32px', fontWeight:'900' },
  contentGrid: { display:'grid', gridTemplateColumns:'1fr 2fr', gap:'20px' }, // 상단 그리드 비율 조정
  bottomGrid: { display:'grid', gridTemplateColumns:'1fr 1fr 2fr', gap:'20px', flex:1 }, // 하단 그리드 (수입/지출/메모)
  card: { backgroundColor:'white', padding:'25px', borderRadius:'20px', boxShadow:'0 4px 10px rgba(0,0,0,0.05)', display:'flex', flexDirection:'column', height:'100%' },
  cardTitle: { margin:'0 0 20px 0', fontSize:'18px', fontWeight:'bold', color:'#2d3748', borderLeft:'5px solid #3182ce', paddingLeft:'15px' },
  scrollList: { flex: 1, overflowY: 'auto', display:'flex', flexDirection:'column', gap:'10px', maxHeight:'300px' },
  detailItem: { display:'flex', justifyContent:'space-between', padding:'12px 15px', backgroundColor:'#f8fafc', borderRadius:'12px', alignItems:'center', fontSize:'15px' },
  noData: { textAlign:'center', color:'#999', fontSize:'15px', padding:'20px 0' },
  eqSummaryRow: { display:'flex', justifyContent:'space-around', marginTop:'15px', borderTop:'2px solid #edf2f7', paddingTop:'15px' },
  eqBadge: { display:'flex', flexDirection:'column', alignItems:'center' },
  
  // 메모 관련 스타일
  noteItem: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px', backgroundColor:'#fdfdea', borderRadius:'12px', border:'1px solid #f6e05e' },
  noteActions: { display:'flex', gap:'8px' },
  actionBtn: { display:'flex', alignItems:'center', gap:'4px', border:'none', background:'none', cursor:'pointer', fontSize:'13px', fontWeight:'bold', padding:'4px 8px', borderRadius:'4px', backgroundColor:'rgba(0,0,0,0.05)' },
  inputArea: { display:'flex', gap:'10px' },
  noteInput: { flex:1, padding:'12px', borderRadius:'8px', border:'2px solid #edf2f7', fontSize:'15px' },
  editInput: { flex:1, padding:'8px', borderRadius:'6px', border:'2px solid #3182ce', fontSize:'15px' },
  addBtn: { padding:'0 20px', backgroundColor:'#2d3748', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer', fontSize:'15px' },
  iconBtn: { border:'none', background:'none', cursor:'pointer', padding:'4px' }
};

export default CEOReport;