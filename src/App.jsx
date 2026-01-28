import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// 1. 모든 부품(컴포넌트) 불러오기
import Login from './Login';
import WorkLog from './WorkLog';
import Ledger from './Ledger';
import DailyReport from './DailyReport';
import MonthlyAnalysis from './MonthlyAnalysis';
import AccessLog from './AccessLog';
import CEOReport from './CEOReport';

function App() {
  // 상태 관리: 로그인 세션 및 현재 페이지
  const [session, setSession] = useState(null);
  const [currentPage, setCurrentPage] = useState('daily'); // 기본 시작 화면: 데일리 리포트

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

  // 로그아웃 처리 함수
  const handleLogout = async () => {
    if (window.confirm("로그아웃 하시겠습니까?")) {
      await supabase.auth.signOut();
      alert("안전하게 로그아웃되었습니다.");
    }
  };

  // 3. 버튼 스타일 정의 (선택된 메뉴 강조)
  const getBtnStyle = (pageName) => ({
    padding: '10px 18px',
    backgroundColor: currentPage === pageName ? '#3182ce' : '#2d3748',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  });

  // 4. [보안 성문] 로그인이 안 되어 있으면 무조건 로그인 화면만 노출
  if (!session) {
    return <Login onLoginSuccess={() => setCurrentPage('daily')} />;
  }

  // 5. [메인 시스템] 로그인 성공 시에만 진입 가능한 영역
  return (
    <div style={styles.appContainer}>
      {/* 상단 통합 네비게이션 바 */}
      <header style={styles.header}>
        <div style={styles.logo} onClick={() => setCurrentPage('daily')}>
          🏭 오성철강 <span style={{fontWeight:'300', fontSize:'14px', marginLeft:'10px'}}>SMART ERP</span>
        </div>
        
        <nav style={styles.nav}>
          <button onClick={() => setCurrentPage('worklog')} style={getBtnStyle('worklog')}>작업일보</button>
          <button onClick={() => setCurrentPage('ledger')} style={getBtnStyle('ledger')}>일계표</button>
          <button onClick={() => setCurrentPage('daily')} style={getBtnStyle('daily')}>📅 데일리 리포트</button>
          <button onClick={() => setCurrentPage('monthly')} style={getBtnStyle('monthly')}>📊 월간 분석</button>
          <button onClick={() => setCurrentPage('ceo')} style={getBtnStyle('ceo')}>🌟 대표님 브리핑</button>
          <button onClick={() => setCurrentPage('accesslog')} style={getBtnStyle('accesslog')}>🔐 접속 로그</button>
        </nav>

        <div style={styles.userSection}>
          <span style={styles.userName}>{session.user.email.split('@')[0]} 실장님</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>로그아웃</button>
        </div>
      </header>

      {/* 메인 콘텐츠 영역 (선택된 메뉴의 화면을 렌더링) */}
      <main style={styles.mainContent}>
        {currentPage === 'worklog' && <WorkLog />}
        {currentPage === 'ledger' && <Ledger />}
        {currentPage === 'daily' && <DailyReport />}
        {currentPage === 'monthly' && <MonthlyAnalysis />}
        {currentPage === 'ceo' && <CEOReport />}
        {currentPage === 'accesslog' && <AccessLog />}
      </main>
    </div>
  );
}

// 전체 레이아웃 스타일
const styles = {
  appContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#f8fafc',
    overflow: 'hidden'
  },
  header: {
    height: '70px',
    backgroundColor: '#1a365d',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 30px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 1000,
    flexShrink: 0
  },
  logo: { fontSize: '22px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  nav: { display: 'flex', gap: '8px' },
  userSection: { display: 'flex', alignItems: 'center', gap: '15px' },
  userName: { fontSize: '14px', color: '#cbd5e0' },
  logoutBtn: { 
    backgroundColor: '#e53e3e', 
    color: 'white', 
    border: 'none', 
    padding: '8px 15px', 
    borderRadius: '6px', 
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold'
  },
  mainContent: {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: '#f1f5f9'
  }
};

export default App;