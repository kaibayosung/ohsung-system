// src/pages/LabPage.jsx
// 오성철강 연구실 — AI 도입계획안에서 제안한 신규 기능(OCR 문서인식, 카카오톡 주문접수 채널,
// FAX 작업요청서 접수, 현장 코일확정 등)을 실제 개발 전에 UI로 먼저 보여주는 공간.
// 기존 '테스트' 메뉴를 대체합니다.
//
// 디자인: 카드형 대시보드. 프로젝트가 계속 늘어나도 PROJECTS 배열에 항목 하나만 추가하면
// 자동으로 카테고리에 맞는 카드가 생기는 구조라, 탭이 옆으로 계속 늘어나 복잡해지는 문제가 없습니다.
import React, { useState } from 'react';
import { COLORS } from './test/theme';
import { OcrDocumentIntake, KakaoOrderChannel, FaxJoborderIntake, FieldCoilConfirm, OrderFlowV2 } from './test/proposalScreens';
import { SeparatorSetupScreen } from './test/separatorSetup';
import { SalesTargetCustomerList } from './test/salesTargetScreen';
import { CustomerOrderTrackerScreen } from './test/customerOrderTrackerScreen';
import { CustomerChatbotScreen } from './test/customerChatbotScreen';
import { IncidentAnalysisSample } from './test/incidentAnalysisScreen';
import { CashFlowPnlDemo } from './test/cashFlowPnlScreen';
import { DepositReconcileDemo } from './test/depositReconcileScreen';
import { LevelerWorkStatus } from './test/levelerWorkStatusScreen';
import { CoilAnalysisScreen } from './test/coilAnalysisScreen';
import { CoilAiHelperScreen } from './test/coilAiHelperScreen';
import { CoilAiHelperWorkScreen } from './test/coilAiHelperWorkScreen';
import { WorkStatusBoardV2 } from './test/workStatusBoardV2Screen';
import { LevelingCoilDetailScreen } from './test/levelingCoilDetailScreen';

// 새 프로젝트를 추가할 때는 여기에 한 줄만 더하면 됩니다 — category가 같으면 같은 섹션에 묶입니다.
// external을 채우면(별도 배포 URL이 있는 경우) 카드 클릭 시 새 탭으로 열리고, 없으면 이 페이지 안에서 바로 열립니다.
const PROJECTS = [
  { key: 'order-flow-v2', label: '신규서비스 통합흐름 (v2)', icon: '🔄', category: '주문접수 자동화', desc: '접수부터 배차·코일확정까지 전체 흐름을 한 화면에서 봅니다.' },
  { key: 'ocr', label: 'OCR 문서인식', icon: '📄', category: '주문접수 자동화', desc: '주문서 이미지에서 텍스트를 자동으로 읽어냅니다.' },
  { key: 'kakao', label: '카카오톡 주문접수', icon: '💬', category: '주문접수 자동화', desc: '카카오톡 채널로 들어온 주문을 자동 접수합니다.' },
  { key: 'fax-joborder', label: 'FAX 작업요청서 접수', icon: '📠', category: '주문접수 자동화', desc: '팩스로 온 작업요청서를 자동 인식해 초안을 만듭니다.' },
  { key: 'field-confirm', label: '현장 코일확정', icon: '🚜', category: '주문접수 자동화', desc: '지게차 기사가 태블릿에서 코일을 확정합니다.' },
  { key: 'separator-setup', label: '세퍼레이터 셋팅 계산기', icon: '📐', category: '생산현장 도구', desc: '가공규격에 맞춰 스페이서 조합을 자동 계산합니다. (사무실용)' },
  { key: 'separator-kiosk', label: '세퍼레이터 태블릿 키오스크', icon: '🖥️', category: '생산현장 도구', desc: '슬리터2 현장에 배포된 실제 서비스로 이동합니다.', external: '/separator', badge: '현장 배포중' },
  { key: 'leveler-work-status', label: '작업현황 대시보드', icon: '📊', category: '생산현장 도구', desc: '레벨러 시스템(레벨링·슬리팅1·슬리팅2) 작업현황을 날짜별로 봅니다. 실데이터로 동작합니다.', badge: '실데이터 연동' },
  { key: 'work-status-board-2', label: '작업현황 대시보드 2', icon: '🗂️', category: '생산현장 도구', desc: '레벨링·슬리팅2·슬리팅1을 라인별 보드로 보고, 라인마다 오늘 번 금액과 남은 작업을 오늘 안에 끝낼 수 있는지(평균 소요시간 기반 예측)까지 확인합니다. 실데이터로 동작합니다.', badge: '실데이터 연동' },
  { key: 'coil-analysis', label: '코일 작업 상세 분석', icon: '🧭', category: '생산현장 도구', desc: '날짜·코일을 선택하면 길이 구간별 속도·텐션 변화와 동일 사양 대비 편차를 보여줍니다. 실데이터로 동작합니다.', badge: '실데이터 연동' },
  { key: 'leveling-coil-detail', label: '레벨링 코일 상세분석', icon: '🧭', category: '생산현장 도구', desc: '레벨링 라인에 코일ID가 태깅된 작업을 날짜·코일로 선택하면 시트 수 추정, 길이 정확도, 설비 부하, 박스별 현황을 보여줍니다. 실데이터로 동작합니다.', badge: '실데이터 연동' },
  { key: 'coil-ai-helper', label: 'AI 헬퍼 (슬리팅 2/지난작업보기)', icon: '🤖', category: '생산현장 도구', desc: '가동 전 작업지시서를 선택하면 동일 사양 완료 코일들의 실측 데이터로 권장 속도·텐션·예상 가동시간을 추천합니다. 실데이터로 동작합니다.', badge: '실데이터 연동' },
  { key: 'coil-ai-helper-work', label: 'AI 헬퍼 (슬리팅 2/작업용)', icon: '🎯', category: '생산현장 도구', desc: '코일을 선택하면 현재 진행 길이의 실측 속도·텐션1~4를 동일 사양 완료 코일 권장치와 비교해 적정/느림/빠름을 보여줍니다. 실데이터로 동작합니다.', badge: '실데이터 연동' },
  { key: 'sales-target', label: '영업대상 고객사 리스트', icon: '📋', category: '영업 지원', desc: '재고를 맡겨둔 거래처 중 최근 작업이 뜸한 곳을 자동으로 찾아줍니다. 실데이터로 동작합니다.', badge: '실데이터 연동' },
  { key: 'customer-order-tracker', label: '고객 주문 현황 트래커', icon: '📦', category: '고객사 시연', desc: '거래처를 선택하면 접수·작업지시·작업진행·작업완료·출고완료 5단계 진행상황을 한눈에 보여줍니다. 실제 /portal과 별개의 외부 시연용 프로토타입, 실데이터로 동작합니다.', badge: '실데이터 연동' },
  { key: 'customer-chatbot', label: '(주)대한강재 챗봇 (작업 현황·미수금·출고 여부)', icon: '💬', category: '고객사 시연', desc: '진행중/완료 건수, 미출고, 미수금, 코일별 상태 등을 자유롭게 물어보면 Claude가 실데이터를 근거로 자연어로 답합니다. 실제 /portal과 별개, 대한강재로 범위 고정.', badge: '실데이터 연동' },
  { key: 'warehouse-3d', label: '코일창고 3D 뷰어 · 출고관리', icon: '📦', category: '창고 관리', desc: '거래처별 보관 코일을 3D/평면도로 보고, 출고 처리까지 할 수 있는 실제 배포 서비스입니다.', external: '/warehouse-3d.html', badge: '현장 배포중' },
  { key: 'incident-analysis', label: '장애 원인 분석 (AI)', icon: '🧯', category: '설비 진단', desc: 'PLC 이력·CCTV 데이터를 AI가 분석해 사고 원인을 30분 내로 규명합니다. 실제 슬리터 사고 사례로 만든 샘플입니다.', badge: '샘플' },
  { key: 'cashflow-pnl', label: '계좌 손익 통합 대시보드', icon: '💰', category: '경영 · 재무', desc: '통장 거래내역을 업로드하면 그린ERP 매출(가공+고철)과 합쳐 월간 손익을 자동 계산합니다. 매출은 실데이터, 통장 내역은 화면에서만 계산(미저장)됩니다.', badge: '실데이터 연동' },
  { key: 'deposit-reconcile', label: '거래명세서 입금 확인', icon: '🧾', category: '경영 · 재무', desc: '기간을 정하고 매출 거래명세서 + 통장 거래내역 엑셀을 올리면 금액·거래처·시기를 맞춰 입금 여부를 자동 분류합니다. 장기 미입금 건만 따로 걸러볼 수 있습니다.' },
];

// FAX 작업요청서 접수(No.13-1)와 현장 코일확정(No.13-2)은 하나의 흐름(초안 → 배차대기 → 배정완료)을
// 공유하므로, 두 화면이 같은 draft 목록을 보도록 상태를 여기서 관리합니다.
// 실제 개발 시에는 이 배열이 ERP2.0의 작업지시서 초안 테이블로 대체됩니다.
const INITIAL_JOBORDER_DRAFTS = [
  {
    id: 1, customer_name: '(주)대한강재', material: 'SGCC 0.75T', spec: '0.75 X 4 X C',
    qty_weight: '9,800', work_type: '슬리팅', due_date: '2026-07-27',
    source: 'FAX', sourceDoc: '작업요청서_대한강재_0725.jpg', confidence: 97,
    status: '배차대기', assigned_coil_id: null,
  },
];

function groupByCategory(items) {
  const order = [];
  const map = new Map();
  items.forEach((item) => {
    if (!map.has(item.category)) {
      map.set(item.category, []);
      order.push(item.category);
    }
    map.get(item.category).push(item);
  });
  return order.map((name) => ({ name, items: map.get(name) }));
}

function LabPage() {
  const [view, setView] = useState('home'); // 'home' | PROJECTS[].key
  const [joborderDrafts, setJoborderDrafts] = useState(INITIAL_JOBORDER_DRAFTS);

  const createDraft = (payload) => {
    setJoborderDrafts((prev) => [
      ...prev,
      { id: Date.now(), status: '초안', assigned_coil_id: null, ...payload },
    ]);
  };
  const approveDraft = (id) => {
    setJoborderDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status: '배차대기' } : d)));
  };
  const confirmCoil = (id, coilId, driverName) => {
    setJoborderDrafts((prev) => prev.map((d) => (d.id === id ? {
      ...d, status: '배정완료', assigned_coil_id: coilId,
      assigned_driver_name: driverName || null, confirmed_at: new Date().toISOString(),
    } : d)));
  };

  const openProject = (p) => {
    if (p.external) {
      window.open(p.external, '_blank', 'noopener');
      return;
    }
    setView(p.key);
  };

  const current = PROJECTS.find((p) => p.key === view) || null;
  const categories = groupByCategory(PROJECTS);

  return (
    <div style={styles.container}>
      <div style={styles.banner}>
        <span style={styles.bannerIcon}>🔬</span>
        <span>오성철강 연구실 — AI 도입계획안에서 제안한 신규 기능을 실제 개발 전에 UI로 먼저 체험해보는 공간입니다. 아래 화면들은 샘플 데이터로 동작하는 프로토타입입니다.</span>
      </div>

      {view === 'home' ? (
        <div style={styles.home}>
          {categories.map((cat) => (
            <div key={cat.name} style={styles.section}>
              <div style={styles.sectionTitle}>{cat.name}</div>
              <div style={styles.cardGrid}>
                {cat.items.map((p) => (
                  <div
                    key={p.key}
                    className="op-project-card"
                    style={styles.projectCard}
                    onClick={() => openProject(p)}
                  >
                    <div style={styles.cardIconWrap}>{p.icon}</div>
                    <div style={styles.cardBody}>
                      <div style={styles.cardTitleRow}>
                        <span style={styles.cardTitle}>{p.label}</span>
                        {p.badge && <span style={styles.cardBadge}>{p.badge}</span>}
                      </div>
                      <div style={styles.cardDesc}>{p.desc}</div>
                    </div>
                    <div style={styles.cardArrow}>{p.external ? '↗' : '→'}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <div style={styles.backBar}>
            <button className="op-nav-btn" style={styles.backBtn} onClick={() => setView('home')}>← 연구실 홈</button>
            {current && (
              <span style={styles.backBarTitle}>{current.icon} {current.label}</span>
            )}
          </div>

          {view === 'ocr' && <OcrDocumentIntake />}
          {view === 'kakao' && <KakaoOrderChannel />}
          {view === 'fax-joborder' && (
            <FaxJoborderIntake drafts={joborderDrafts} onCreateDraft={createDraft} onApprove={approveDraft} />
          )}
          {view === 'field-confirm' && (
            <FieldCoilConfirm drafts={joborderDrafts} onConfirmCoil={confirmCoil} />
          )}
          {view === 'order-flow-v2' && (
            <OrderFlowV2 drafts={joborderDrafts} onCreateDraft={createDraft} onApprove={approveDraft} onConfirmCoil={confirmCoil} />
          )}
          {view === 'separator-setup' && <SeparatorSetupScreen />}
          {view === 'sales-target' && <SalesTargetCustomerList />}
          {view === 'customer-order-tracker' && <CustomerOrderTrackerScreen />}
          {view === 'customer-chatbot' && <CustomerChatbotScreen />}
          {view === 'incident-analysis' && <IncidentAnalysisSample />}
          {view === 'cashflow-pnl' && <CashFlowPnlDemo />}
          {view === 'deposit-reconcile' && <DepositReconcileDemo />}
          {view === 'leveler-work-status' && <LevelerWorkStatus />}
          {view === 'work-status-board-2' && <WorkStatusBoardV2 />}
          {view === 'leveling-coil-detail' && <LevelingCoilDetailScreen />}
          {view === 'coil-analysis' && <CoilAnalysisScreen />}
          {view === 'coil-ai-helper' && <CoilAiHelperScreen />}
          {view === 'coil-ai-helper-work' && <CoilAiHelperWorkScreen />}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '28px 36px', backgroundColor: COLORS.bg, minHeight: '100vh' },
  banner: {
    background: COLORS.navyGradient, color: '#c8d3e2', padding: '18px 24px', borderRadius: '14px',
    fontSize: '14px', lineHeight: 1.6, marginBottom: '26px', display: 'flex', gap: '12px', alignItems: 'flex-start',
    boxShadow: COLORS.shadowMd,
  },
  bannerIcon: { fontSize: '18px', flexShrink: 0 },

  home: { display: 'flex', flexDirection: 'column', gap: '30px' },
  section: {},
  sectionTitle: {
    fontSize: '18px', fontWeight: 800, color: COLORS.navy, marginBottom: '14px',
    paddingLeft: '2px', letterSpacing: '-0.01em',
  },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' },
  projectCard: {
    display: 'flex', alignItems: 'flex-start', gap: '16px', backgroundColor: COLORS.white,
    border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '20px 20px 20px 18px',
    cursor: 'pointer', boxShadow: COLORS.shadowSm,
  },
  cardIconWrap: {
    width: '48px', height: '48px', borderRadius: '13px', backgroundColor: COLORS.accentSoft,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0,
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitleRow: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' },
  cardTitle: { fontSize: '17px', fontWeight: 800, color: COLORS.navy },
  cardBadge: {
    fontSize: '11px', fontWeight: 800, color: COLORS.green, backgroundColor: COLORS.greenBg,
    padding: '3px 9px', borderRadius: '999px', letterSpacing: '0.01em',
  },
  cardDesc: { fontSize: '14px', color: COLORS.steelLight, lineHeight: 1.5 },
  cardArrow: { fontSize: '18px', color: COLORS.steelLight, flexShrink: 0, marginTop: '4px' },

  backBar: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '22px' },
  backBtn: {
    padding: '11px 20px', borderRadius: '11px', border: `1px solid ${COLORS.border}`,
    backgroundColor: COLORS.white, color: COLORS.steel, fontWeight: 700, fontSize: '15px',
    cursor: 'pointer', fontFamily: 'inherit',
  },
  backBarTitle: { fontSize: '20px', fontWeight: 800, color: COLORS.navy },
};

export default LabPage;
