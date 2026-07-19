import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// 1. 모든 부품(컴포넌트) 불러오기
import Login from './Login';
import WorkLog from './WorkLog';
// [수정됨] 구버전 Ledger 대신 새 폴더에 만든 LedgerPage를 불러옵니다.
import LedgerPage from './pages/LedgerPage';
import DailyReport from './DailyReport';
import MonthlyAnalysis from './MonthlyAnalysis';
import AccessLog from './AccessLog';
import CEOReport from './CEOReport';
import ExpensePage from './pages/ExpensePage';
import TestPage from './pages/TestPage';
import SalesWorkflowPage from './pages/SalesWorkflowPage';

function App() {
  // 상태 관리: 로그인 세션 및 현재 페이지
  const [session, setSession] = useState(null);
  const [currentPage, setCurrentPage] = useState('daily'); // 기본 시작 화면: 데일리 리포트
  const [expensePendingCount, setExpensePendingCount] = useState(0);

  // 2. 로그인 상태 실시간 감시 (인증 관문)
  useEffect(() => {
    // 현재 세션 가져오기
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 로그인/로그아웃 상태 변화를 감지하여 session 업데이트
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 지출결의서 결재대기 건수 — 상단 메뉴 알림 배지용 (1분마다 갱신)
  useEffect(() => {
    if (!session) return;
    const fetchPending = async () => {
      const { count } = await supabase.from('expense_requests').select('id', { count: 'exact', head: true }).eq('status', '결재대기');
      setExpensePendingCount(count || 0);
    };
    fetchPending();
    const timer = setInterval(fetchPending, 60000);
    return () => clearInterval(timer);
  }, [session]);

  // 로그아웃 처리 함수
  const handleLogout = async () => {
    if (window.confirm("로그아웃 하시겠습니까?")) {
      await supabase.auth.signOut();
      alert("안전하게 로그아웃되었습니다.");
    }
  };

  // 3. 버튼 스타일 정의 (선택된 메뉴 강조 — 활성 탭은 앰버 포인트 컬러로 강조)
  const getBtnStyle = (pageName) => ({
    padding: '13px 22px',
    backgroundColor: currentPage === pageName ? '#e8830f' : 'rgba(255,255,255,0.06)',
    color: currentPage === pageName ? '#ffffff' : '#c8d3e2',
    border: currentPage === pageName ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.05)',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: currentPage === pageName ? 800 : 600,
    fontSize: '17px',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: currentPage === pageName ? '0 4px 12px rgba(232,131,15,0.35)' : 'none',
  });

  // 4. [보안 성문] 로그인이 안 되어 있으면 무조건 로그인 화면만 노출
  if (!session) {
    return <Login onLoginSuccess={() => setCurrentPage('daily')} />;
  }

  // 5. [메인 시스템] 로그인 성공 시에만 진입 가능한 영역
  return (
    <div className="app-shell" style={styles.appContainer}>
      {/* 상단 통합 네비게이션 바 (인쇄 시 숨김) */}
      <header className="no-print" style={styles.header}>
        <div style={styles.logo} onClick={() => setCurrentPage('daily')}>
          🏭 오성철강 <span style={{fontWeight:'300', fontSize:'16px', marginLeft:'10px'}}>SMART ERP 2.0</span>
        </div>
        
        <nav style={styles.nav}>
          <button className="op-nav-btn" onClick={() => setCurrentPage('sales')} style={getBtnStyle('sales')}>🚚 영업 워크플로우</button>
          <button className="op-nav-btn" onClick={() => setCurrentPage('worklog')} style={getBtnStyle('worklog')}>📝 작업일보</button>
          <button className="op-nav-btn" onClick={() => setCurrentPage('ledger')} style={getBtnStyle('ledger')}>📒 일계표</button>
          <button className="op-nav-btn" onClick={() => setCurrentPage('daily')} style={getBtnStyle('daily')}>📅 데일리 리포트</button>
          <button className="op-nav-btn" onClick={() => setCurrentPage('monthly')} style={getBtnStyle('monthly')}>📊 월간 분석</button>
          <button className="op-nav-btn" onClick={() => setCurrentPage('ceo')} style={getBtnStyle('ceo')}>🌟 대표님 브리핑</button>
          <button className="op-nav-btn" onClick={() => setCurrentPage('accesslog')} style={getBtnStyle('accesslog')}>🔐 접속 로그</button>
          <button className="op-nav-btn" onClick={() => setCurrentPage('expense')} style={{ ...getBtnStyle('expense'), position: 'relative' }}>
            📎 지출결의서
            {expensePendingCount > 0 && <span style={styles.navBadge}>{expensePendingCount}</span>}
          </button>
          <button className="op-nav-btn" onClick={() => setCurrentPage('test')} style={getBtnStyle('test')}>🧪 테스트</button>
        </nav>

        <div style={styles.userSection}>
          <span style={styles.userName}>{session.user.email.split('@')[0]} 실장님</span>
          <button className="op-logout-btn" onClick={handleLogout} style={styles.logoutBtn}>로그아웃</button>
        </div>
      </header>

      {/* 메인 콘텐츠 영역 (선택된 메뉴의 화면을 렌더링) */}
      <main className="app-main" style={styles.mainContent}>
        {currentPage === 'sales' && <SalesWorkflowPage />}
        {currentPage === 'worklog' && <WorkLog />}
        {/* [수정됨] 이제 구버전이 아닌 새로운 LedgerPage를 보여줍니다. */}
        {currentPage === 'ledger' && <LedgerPage />} 
        {currentPage === 'daily' && <DailyReport />}
        {currentPage === 'monthly' && <MonthlyAnalysis />}
        {currentPage === 'ceo' && <CEOReport />}
        {currentPage === 'accesslog' && <AccessLog />}
        {currentPage === 'expense' && <ExpensePage />}
        {currentPage === 'test' && <TestPage />}
      </main>
    </div>
  );
}

// 전체 레이아웃 스타일 — 산업-모던(다크 네이비 + 스틸 블루 + 앰버 포인트) 테마
const styles = {
  appContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#eef1f6',
    overflow: 'hidden'
  },
  header: {
    height: '84px',
    background: 'linear-gradient(160deg, #16283f 0%, #0a1524 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    boxShadow: '0 4px 16px rgba(10,21,36,0.28)',
    zIndex: 1000,
    flexShrink: 0,
    borderBottom: '1px solid rgba(255,255,255,0.06)'
  },
  logo: { fontSize: '27px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', letterSpacing: '-0.01em' },
  nav: { display: 'flex', gap: '8px' },
  userSection: { display: 'flex', alignItems: 'center', gap: '16px' },
  userName: { fontSize: '17px', color: '#c8d3e2' },
  navBadge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    backgroundColor: '#e8830f',
    color: 'white',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 'bold',
    minWidth: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 5px',
    boxShadow: '0 0 0 2px #0a1524'
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: '#e2e8f0',
    border: '1px solid rgba(255,255,255,0.14)',
    padding: '11px 20px',
    borderRadius: '9px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    transition: 'background-color 0.15s ease'
  },
  mainContent: {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: '#eef1f6'
  }
};

export default App;
