// src/pages/LabPage.jsx
// 오성철강 연구실 — AI 도입계획안에서 제안한 신규 기능(OCR 문서인식, 카카오톡 주문접수 채널,
// FAX 작업요청서 접수, 현장 코일확정)을 실제 개발 전에 UI로 먼저 보여주는 공간.
// 기존 '테스트' 메뉴를 대체합니다.
import React, { useState } from 'react';
import { COLORS } from './test/theme';
import { OcrDocumentIntake, KakaoOrderChannel, FaxJoborderIntake, FieldCoilConfirm, OrderFlowV2 } from './test/proposalScreens';

const TABS = [
  { key: 'ocr', label: 'OCR 문서인식', icon: '📄' },
  { key: 'kakao', label: '카카오톡 주문접수', icon: '💬' },
  { key: 'fax-joborder', label: 'FAX 작업요청서 접수', icon: '📠' },
  { key: 'field-confirm', label: '현장 코일확정', icon: '🚜' },
  { key: 'order-flow-v2', label: '신규서비스 통합흐름 (v2)', icon: '🔄' },
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

function LabPage() {
  const [tab, setTab] = useState('ocr');
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

  return (
    <div style={styles.container}>
      <div style={styles.banner}>
        <span style={styles.bannerIcon}>🔬</span>
        <span>오성철강 연구실 — AI 도입계획안에서 제안한 신규 기능을 실제 개발 전에 UI로 먼저 체험해보는 공간입니다. 아래 화면들은 샘플 데이터로 동작하는 프로토타입입니다.</span>
      </div>
      <div style={styles.tabs}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              className="op-nav-btn"
              onClick={() => setTab(t.key)}
              style={{ ...styles.tabBtn, ...(active ? styles.tabBtnActive : {}) }}
            >
              {t.icon} {t.label}
            </button>
          );
        })}
      </div>
      {tab === 'ocr' && <OcrDocumentIntake />}
      {tab === 'kakao' && <KakaoOrderChannel />}
      {tab === 'fax-joborder' && (
        <FaxJoborderIntake drafts={joborderDrafts} onCreateDraft={createDraft} onApprove={approveDraft} />
      )}
      {tab === 'field-confirm' && (
        <FieldCoilConfirm drafts={joborderDrafts} onConfirmCoil={confirmCoil} />
      )}
      {tab === 'order-flow-v2' && (
        <OrderFlowV2 drafts={joborderDrafts} onCreateDraft={createDraft} onApprove={approveDraft} onConfirmCoil={confirmCoil} />
      )}
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
  tabs: { display: 'flex', gap: '10px', marginBottom: '26px' },
  tabBtn: {
    padding: '13px 24px', borderRadius: '12px', border: `1px solid ${COLORS.border}`,
    backgroundColor: COLORS.white, color: COLORS.steel, fontWeight: 600, fontSize: '16px',
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s ease',
  },
  tabBtnActive: {
    border: 'none', backgroundColor: COLORS.accent, color: '#ffffff', fontWeight: 800,
    boxShadow: '0 4px 12px rgba(232,131,15,0.32)',
  },
};

export default LabPage;
