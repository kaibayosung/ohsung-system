import React, { useState, useEffect, useRef } from 'react';
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
import CEODailyKpiPage from './pages/CEODailyKpiPage';
import ExpensePage from './pages/ExpensePage';
import TestPage from './pages/TestPage';
import SalesWorkflowPage from './pages/SalesWorkflowPage';
import CustomerPortalPage from './pages/CustomerPortalPage';
import InboundFaxPage from './pages/InboundFaxPage';
import ScrapSalesPage from './pages/ScrapSalesPage';
import AccountManagementPage from './pages/AccountManagementPage';
import ChangePasswordModal from './components/ChangePasswordModal';

function App() {
  // 상태 관리: 로그인 세션 및 현재 페이지
  const [session, setSession] = useState(null);
  const [currentPage, setCurrentPage] = useState('daily'); // 기본 시작 화면: 데일리 리포트
  const [expensePendingCount, setExpensePendingCount] = useState(0);
  const [openMenu, setOpenMenu] = useState(null); // 현재 열려있는 드롭다운 메뉴 그룹 key
  const navRef = useRef(null); // 메뉴 바깥 클릭 감지용
  const [myStaff, setMyStaff] = useState(null); // { name, role } — staff_users 조회 결과
  const [roleChecking, setRoleChecking] = useState(true); // role 조회 중 로딩 플래그
  const [showPwModal, setShowPwModal] = useState(false); // 비밀번호 변경 모달

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

  // 2-1. [계정 기반 접근 제어] 로그인한 사용자가 staff_users에 등록된 직원인지 확인.
  // customer_users 계정으로 내부 URL에 잘못 로그인했거나, 아직 staff_users에 등록되지
  // 않은 계정(레거시 공유 로그인 포함)은 아래 4-2에서 접근거부 화면을 보게 됩니다.
  useEffect(() => {
    if (!session) { setMyStaff(null); setRoleChecking(false); return; }
    setRoleChecking(true);
    supabase.from('staff_users').select('name, role, is_active').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => {
        setMyStaff(data && data.is_active ? data : null);
        setRoleChecking(false);
      });
  }, [session]);

  // 2-2. 일반직원 계정은 대표님 경영보고(admin 전용)가 아닌 실무 화면을 기본 화면으로
  useEffect(() => {
    if (myStaff && myStaff.role !== 'admin' && currentPage === 'daily') {
      setCurrentPage('sales');
    }
  }, [myStaff]);

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

  // 3-1. [메뉴 구조] 역할별(운영자/경리/대표님/고객사)로 최적화한 카테고리 메뉴
  //  - 워크플로우 관리: 현장 실무(입고·작업일보) — 운영자용
  //  - 매출 관리: 매출이 발생하는 지점(영업·스크랩) — 운영자·경리용
  //  - 비용 관리: 지출 처리·장부 기록 — 경리용
  //  - 대표님 경영보고: 실적·인사이트 확인 — 대표님용
  //  - 고객사 포털 / 테스트: 성격이 달라 그룹에 넣지 않고 독립 메뉴로 분리
  const menuGroups = [
    {
      key: 'workflow', label: '워크플로우 관리', icon: '🔧', role: '운영자용 · 현장 실무',
      items: [
        { page: 'inboundfax', label: '입고 FAX 리포트', icon: '📠' },
        { page: 'worklog', label: '작업일보', icon: '📝' },
      ],
    },
    {
      key: 'revenue', label: '매출 관리', icon: '💰', role: '운영자 · 경리용',
      items: [
        { page: 'sales', label: '영업 워크플로우', icon: '🚚' },
        { page: 'scrap', label: '스크랩 매출', icon: '♻️' },
      ],
    },
    {
      key: 'cost', label: '비용 관리', icon: '📋', role: '경리용',
      items: [
        { page: 'expense', label: '지출결의서', icon: '📎', badge: true },
        { page: 'ledger', label: '일계표', icon: '📒' },
      ],
    },
    {
      key: 'report', label: '대표님 경영보고', icon: '📊', role: '대표님용', adminOnly: true,
      items: [
        { page: 'daily', label: '데일리 리포트', icon: '📅' },
        { page: 'monthly', label: '월간 분석', icon: '📊' },
        { page: 'ceo', label: '대표님 브리핑', icon: '🌟' },
        { page: 'dailykpi', label: '카톡용 일일 요약', icon: '💬' },
        { page: 'accesslog', label: '접속 로그', icon: '🔐' },
      ],
    },
  ];

  const standaloneItems = [
    { page: 'customer', label: '고객사 포털', icon: '🏢', role: '고객사 조회용' },
    { page: 'account', label: '계정 관리', icon: '🔑', role: '관리자용', adminOnly: true },
    { page: 'test', label: '테스트', icon: '🧪', role: '개발자용', adminOnly: true },
  ];

  // admin이 아니면 adminOnly로 표시된 그룹/메뉴는 목록 자체에서 제외 (버튼을 숨기는 것뿐 아니라
  // 아래 4-2/5에서 currentPage 기준으로도 한 번 더 막습니다 — 이중 방어)
  const visibleMenuGroups = menuGroups.filter((g) => !g.adminOnly || myStaff?.role === 'admin');
  const visibleStandaloneItems = standaloneItems.filter((i) => !i.adminOnly || myStaff?.role === 'admin');

  const groupBtnStyle = (isActive, isOpen) => ({
    padding: '13px 18px',
    backgroundColor: isActive ? '#e8830f' : (isOpen ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'),
    color: isActive ? '#ffffff' : '#c8d3e2',
    border: isActive ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.05)',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: isActive ? 800 : 600,
    fontSize: '17px',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: isActive ? '0 4px 12px rgba(232,131,15,0.35)' : 'none',
  });

  const dropdownItemStyle = (isActive) => ({
    padding: '14px 18px',
    minHeight: '46px',
    backgroundColor: isActive ? 'rgba(232,131,15,0.18)' : 'transparent',
    color: isActive ? '#ffb15c' : '#dbe4f0',
    border: 'none',
    borderRadius: '9px',
    cursor: 'pointer',
    fontWeight: isActive ? 700 : 500,
    fontSize: '16px',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    width: '100%',
    whiteSpace: 'nowrap',
  });

  // 4. [보안 성문] 로그인이 안 되어 있으면 무조건 로그인 화면만 노출
  if (!session) {
    return <Login onLoginSuccess={() => setCurrentPage('daily')} />;
  }

  // 4-1. staff_users 조회가 끝나기 전까지는 아무 화면도 보여주지 않음
  // (권한 확인 전 깜빡임으로 admin 전용 화면이 잠깐 노출되는 것을 방지)
  if (roleChecking) return null;

  // 4-2. 로그인은 됐지만 staff_users에 등록되지 않았거나 비활성화된 계정 — 접근 거부
  // (고객사 포털 계정으로 내부 URL에 잘못 로그인한 경우도 여기서 걸러집니다)
  if (!myStaff) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', background: '#0a1524', color: '#fff' }}>
        <div style={{ fontSize: '20px', fontWeight: 800 }}>⛔ 접근 권한이 없습니다</div>
        <div style={{ fontSize: '15px', color: '#c8d3e2' }}>이 계정은 내부 시스템 사용자로 등록되어 있지 않습니다. 관리자에게 계정 등록을 요청하세요.</div>
        <button onClick={handleLogout} style={{ marginTop: '10px', padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#e8830f', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>로그아웃</button>
      </div>
    );
  }

  // 상단 메뉴 바깥을 클릭하면 열려있는 드롭다운을 닫음 (호버 방식은 하위 메뉴 선택이 어려워 클릭 방식으로 변경)
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // 5. [메인 시스템] 로그인 성공 시에만 진입 가능한 영역
  return (
    <div className="app-shell" style={styles.appContainer}>
      {/* 상단 통합 네비게이션 바 (인쇄 시 숨김) */}
      <header className="no-print" style={styles.header}>
        <div style={styles.logo} onClick={() => setCurrentPage('daily')}>
          🏭 오성철강 <span style={{fontWeight:'300', fontSize:'16px', marginLeft:'10px'}}>SMART ERP 2.0</span>
        </div>
        
        <nav style={styles.nav} ref={navRef}>
          {visibleMenuGroups.map((group) => {
            const isActive = group.items.some((i) => i.page === currentPage);
            const isOpen = openMenu === group.key;
            return (
              <div
                key={group.key}
                style={styles.navGroup}
              >
                <button
                  className="op-nav-btn"
                  style={groupBtnStyle(isActive, isOpen)}
                  onClick={() => setOpenMenu(isOpen ? null : group.key)}
                  title={group.role}
                >
                  {group.icon} {group.label}
                  <span style={{ fontSize: '11px', marginLeft: '2px', opacity: 0.8 }}>{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <div style={styles.dropdown}>
                    <div style={styles.dropdownRole}>{group.role}</div>
                    {group.items.map((item) => (
                      <button
                        key={item.page}
                        className="op-nav-btn"
                        style={dropdownItemStyle(currentPage === item.page)}
                        onClick={() => { setCurrentPage(item.page); setOpenMenu(null); }}
                      >
                        <span>{item.icon} {item.label}</span>
                        {item.badge && expensePendingCount > 0 && (
                          <span style={styles.navBadgeInline}>{expensePendingCount}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div style={styles.navDivider} />

          {visibleStandaloneItems.map((item) => (
            <button
              key={item.page}
              className="op-nav-btn"
              onClick={() => { setCurrentPage(item.page); setOpenMenu(null); }}
              style={getBtnStyle(item.page)}
              title={item.role}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <div style={styles.userSection}>
          <span style={styles.userName}>{myStaff?.name || session.user.email.split('@')[0]}{myStaff?.role === 'admin' ? ' 관리자님' : ' 님'}</span>
          <button className="op-logout-btn" onClick={() => setShowPwModal(true)} style={{ ...styles.logoutBtn, background: 'rgba(255,255,255,0.06)' }}>비밀번호 변경</button>
          <button className="op-logout-btn" onClick={handleLogout} style={styles.logoutBtn}>로그아웃</button>
        </div>
      </header>

      {showPwModal && <ChangePasswordModal onClose={() => setShowPwModal(false)} />}

      {/* 메인 콘텐츠 영역 (선택된 메뉴의 화면을 렌더링) */}
      <main className="app-main" style={styles.mainContent}>
        {currentPage === 'sales' && <SalesWorkflowPage />}
        {currentPage === 'customer' && <CustomerPortalPage />}
        {currentPage === 'inboundfax' && <InboundFaxPage />}
        {currentPage === 'worklog' && <WorkLog />}
        {/* [수정됨] 이제 구버전이 아닌 새로운 LedgerPage를 보여줍니다. */}
        {currentPage === 'ledger' && <LedgerPage />} 
        {/* 대표님 경영보고 그룹 + 테스트 + 계정관리 — admin 전용 */}
        {currentPage === 'daily' && myStaff?.role === 'admin' && <DailyReport />}
        {currentPage === 'monthly' && myStaff?.role === 'admin' && <MonthlyAnalysis />}
        {currentPage === 'ceo' && myStaff?.role === 'admin' && <CEOReport />}
        {currentPage === 'dailykpi' && myStaff?.role === 'admin' && <CEODailyKpiPage />}
        {currentPage === 'accesslog' && myStaff?.role === 'admin' && <AccessLog />}
        {currentPage === 'test' && myStaff?.role === 'admin' && <TestPage />}
        {currentPage === 'account' && myStaff?.role === 'admin' && <AccountManagementPage />}
        {currentPage === 'scrap' && <ScrapSalesPage />}
        {currentPage === 'expense' && <ExpensePage />}
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
  nav: { display: 'flex', gap: '8px', alignItems: 'center' },
  navGroup: { position: 'relative' },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    minWidth: '230px',
    background: 'linear-gradient(160deg, #1c3049 0%, #0d1c30 100%)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    boxShadow: '0 12px 28px rgba(0,0,0,0.35)',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    zIndex: 2000,
  },
  dropdownRole: {
    fontSize: '12px',
    color: '#8fa2ba',
    fontWeight: 700,
    padding: '2px 10px 8px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    marginBottom: '4px',
  },
  navDivider: {
    width: '1px',
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.12)',
    margin: '0 6px',
  },
  navBadgeInline: {
    backgroundColor: '#e8830f',
    color: 'white',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 'bold',
    minWidth: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 5px',
  },
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
