// src/pages/TestPage.jsx
// "테스트" 메뉴 — 스마트 ERP 2.0 UI 시나리오(30개 화면)를 실제 동작하는 화면으로 구현한 컨테이너.
// 팀별(경영/영업현장/생산/경리재무/공통) 서브 탭으로 구성됩니다.
import React, { useState } from 'react';
import { COLORS, teamBadgeColors } from './test/theme';
import {
  ExecDashboard, ExecDailyReport, ExecDailyAlert, ExecWeeklyReport, ExecMonthlyReport, ExecReportSubscriptions,
} from './test/execScreens';
import {
  WorkOrderForm, WorkOrderBoard, WorkOrderComplete, ShipmentDocs, CompanyDetail,
} from './test/salesScreens';
import {
  GoodsReceipt, ProductionSlips, GreenpStatus, GreenpHistory, InventoryList, InventoryDetail, ShipmentStatus, CoilFlowBoard, CoilFlowDetail,
} from './test/prodScreens';
import {
  ReceivablesList, ExpenseFormScreen, ExpenseDetailApproval, ExpenseApprovalScreen, ExpenseDashboardScreen, RecurringScreen, AccountsScreen, TaxInvoiceStatus,
} from './test/finScreens';
import {
  LoginHomeLauncher, NotificationCenter, GlobalSearch, AdminSettings,
} from './test/commonScreens';
import { CustomerPortal } from './test/customerPortal';

const TEAM_ICONS = {
  경영: '📊',
  '영업/현장': '🚚',
  생산: '🏭',
  '경리/재무': '💰',
  공통: '⚙️',
  '고객사 포털': '🤝',
};

const TEAM_GROUPS = [
  {
    key: 'exec', label: '경영', screens: [
      { key: 'dashboard', label: '01 통합 대시보드' },
      { key: 'daily', label: '02 일간 리포트' },
      { key: 'alert', label: '03 일일 실적 알림' },
      { key: 'weekly', label: '04 주간 리포트' },
      { key: 'monthly', label: '05 월간 리포트' },
      { key: 'subs', label: '06 리포트 구독 설정' },
    ],
  },
  {
    key: 'sales', label: '영업/현장', screens: [
      { key: 'worder-form', label: '07 작업지시서 등록' },
      { key: 'worder-board', label: '08 작업지시 현황판' },
      { key: 'worder-complete', label: '09 작업완료 처리' },
      { key: 'docs', label: '10 거래명세서 조회' },
      { key: 'company-detail', label: '11 거래처 상세' },
    ],
  },
  {
    key: 'prod', label: '생산', screens: [
      { key: 'receipt', label: '12 상품입고 접수' },
      { key: 'slips', label: '13 생산전표 조회' },
      { key: 'greenp-status', label: '14 그린피 연동 현황' },
      { key: 'greenp-history', label: '15 동기화 히스토리' },
      { key: 'inventory', label: '16 재고 현황' },
      { key: 'inventory-detail', label: '17 재고 단품 상세' },
      { key: 'shipments', label: '18 출고 현황' },
      { key: 'coilflow', label: '코일 워크플로우' },
      { key: 'coilflow-detail', label: '코일 로트 상세' },
    ],
  },
  {
    key: 'fin', label: '경리/재무', screens: [
      { key: 'receivables', label: '19 미수금 현황' },
      { key: 'expense-form', label: '20 지출결의서 작성' },
      { key: 'expense-detail', label: '21 지출결의서 상세' },
      { key: 'expense-approval', label: '22 지출결의서 결재함' },
      { key: 'expense-dashboard', label: '23 지출 대시보드' },
      { key: 'recurring', label: '24 정기지출 관리' },
      { key: 'accounts', label: '25 계좌관리' },
      { key: 'tax', label: '26 세금계산서 연동' },
    ],
  },
  {
    key: 'common', label: '공통', screens: [
      { key: 'login-home', label: '27 로그인 · 팀 홈' },
      { key: 'notifications', label: '28 알림 센터' },
      { key: 'search', label: '29 전역 검색' },
      { key: 'admin', label: '30 관리자 설정' },
    ],
  },
  {
    key: 'portal', label: '고객사 포털', screens: [
      { key: 'customer-portal', label: '31 고객사 포털 (데모)' },
    ],
  },
];

function TestPage() {
  const [teamKey, setTeamKey] = useState('exec');
  const [screenKey, setScreenKey] = useState('dashboard');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedInventoryId, setSelectedInventoryId] = useState(null);
  const [selectedCoilLotId, setSelectedCoilLotId] = useState(null);

  const team = TEAM_GROUPS.find((t) => t.key === teamKey);

  const selectTeam = (key) => {
    setTeamKey(key);
    setScreenKey(TEAM_GROUPS.find((t) => t.key === key).screens[0].key);
  };

  const goCompanyDetail = (name) => {
    setSelectedCompany(name);
    setTeamKey('sales');
    setScreenKey('company-detail');
  };

  const goInventoryDetail = (id) => {
    setSelectedInventoryId(id);
    setScreenKey('inventory-detail');
  };

  const goCoilFlowDetail = (id) => {
    setSelectedCoilLotId(id);
    setScreenKey('coilflow-detail');
  };

  const selectTeamByLabel = (label) => {
    const found = TEAM_GROUPS.find((t) => t.label === label);
    if (found) selectTeam(found.key);
  };

  const renderScreen = () => {
    switch (screenKey) {
      case 'dashboard': return <ExecDashboard />;
      case 'daily': return <ExecDailyReport />;
      case 'alert': return <ExecDailyAlert />;
      case 'weekly': return <ExecWeeklyReport />;
      case 'monthly': return <ExecMonthlyReport />;
      case 'subs': return <ExecReportSubscriptions />;

      case 'worder-form': return <WorkOrderForm />;
      case 'worder-board': return <WorkOrderBoard />;
      case 'worder-complete': return <WorkOrderComplete />;
      case 'docs': return <ShipmentDocs />;
      case 'company-detail': return <CompanyDetail companyName={selectedCompany} onSelectCompany={setSelectedCompany} />;

      case 'receipt': return <GoodsReceipt />;
      case 'slips': return <ProductionSlips />;
      case 'greenp-status': return <GreenpStatus />;
      case 'greenp-history': return <GreenpHistory />;
      case 'inventory': return <InventoryList onOpenDetail={goInventoryDetail} />;
      case 'inventory-detail': return <InventoryDetail inventoryId={selectedInventoryId} />;
      case 'shipments': return <ShipmentStatus />;
      case 'coilflow': return <CoilFlowBoard onOpenDetail={goCoilFlowDetail} />;
      case 'coilflow-detail': return <CoilFlowDetail lotId={selectedCoilLotId} />;

      case 'receivables': return <ReceivablesList onSelectCompany={goCompanyDetail} />;
      case 'expense-form': return <ExpenseFormScreen />;
      case 'expense-detail': return <ExpenseDetailApproval />;
      case 'expense-approval': return <ExpenseApprovalScreen />;
      case 'expense-dashboard': return <ExpenseDashboardScreen />;
      case 'recurring': return <RecurringScreen />;
      case 'accounts': return <AccountsScreen />;
      case 'tax': return <TaxInvoiceStatus />;

      case 'login-home': return <LoginHomeLauncher onSelectTeam={selectTeamByLabel} />;
      case 'notifications': return <NotificationCenter />;
      case 'search': return <GlobalSearch />;
      case 'admin': return <AdminSettings />;

      case 'customer-portal': return <CustomerPortal />;
      default: return null;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.banner}>
        <span style={styles.bannerIcon}>🧪</span>
        <span>테스트 메뉴 — 스마트 ERP 2.0 UI 시나리오 30개 화면을 실제로 동작하는 화면으로 미리 구현한 공간입니다. 그린피 자동 연동/카카오 알림톡 발송 등 외부 연동이 필요한 기능은 실데이터 대신 준비된 테스트 데이터로 동작합니다.</span>
      </div>
      <div style={styles.layout}>
        <aside style={styles.sidebar}>
          <div style={styles.teamTabs}>
            {TEAM_GROUPS.map((t) => {
              const c = teamBadgeColors[t.label];
              const active = t.key === teamKey;
              return (
                <button
                  key={t.key}
                  className="op-team-tab"
                  onClick={() => selectTeam(t.key)}
                  style={{
                    ...styles.teamTab,
                    backgroundColor: active ? c.bg : 'transparent',
                    color: active ? c.color : '#aeb9c9',
                    fontWeight: active ? 800 : 600,
                    boxShadow: active ? 'inset 0 0 0 1px rgba(255,255,255,0.06)' : 'none',
                  }}
                >
                  <span style={styles.teamTabIcon}>{TEAM_ICONS[t.label]}</span>
                  {t.label}
                </button>
              );
            })}
          </div>
          <div style={styles.screenList}>
            {team.screens.map((s) => {
              const active = screenKey === s.key;
              return (
                <button
                  key={s.key}
                  className="op-screen-btn"
                  onClick={() => setScreenKey(s.key)}
                  style={{
                    ...styles.screenBtn,
                    backgroundColor: active ? COLORS.accent : 'transparent',
                    color: active ? 'white' : '#334155',
                    fontWeight: active ? 700 : 500,
                    boxShadow: active ? '0 4px 10px rgba(232,131,15,0.28)' : 'none',
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </aside>
        <main className="test-content" style={styles.content}>{renderScreen()}</main>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '28px 36px', backgroundColor: COLORS.bg, minHeight: '100vh' },
  banner: {
    background: COLORS.navyGradient, color: '#c8d3e2', padding: '18px 24px', borderRadius: '14px',
    fontSize: '14px', lineHeight: 1.6, marginBottom: '22px', display: 'flex', gap: '12px', alignItems: 'flex-start',
    boxShadow: COLORS.shadowMd,
  },
  bannerIcon: { fontSize: '18px', flexShrink: 0 },
  layout: { display: 'flex', gap: '24px', alignItems: 'flex-start' },
  sidebar: {
    width: '250px', flexShrink: 0, background: COLORS.navyGradient, borderRadius: '18px',
    overflow: 'hidden', boxShadow: COLORS.shadowMd, position: 'sticky', top: '20px',
  },
  teamTabs: { display: 'flex', flexDirection: 'column', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '10px', gap: '2px' },
  teamTab: {
    border: 'none', padding: '12px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '15px',
    textAlign: 'left', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background-color 0.15s ease',
  },
  teamTabIcon: { fontSize: '16px' },
  screenList: { display: 'flex', flexDirection: 'column', padding: '10px', gap: '3px', backgroundColor: COLORS.white },
  screenBtn: {
    border: 'none', padding: '11px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px',
    textAlign: 'left', fontFamily: 'inherit', transition: 'background-color 0.15s ease',
  },
  content: {
    flex: 1, backgroundColor: 'white', borderRadius: '18px', border: `1px solid ${COLORS.border}`,
    padding: '34px 36px', minHeight: '70vh', boxShadow: COLORS.shadow,
  },
};

export default TestPage;
