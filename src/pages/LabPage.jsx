// src/pages/LabPage.jsx
// 오성철강 연구실 — AI 도입계획안에서 제안한 신규 기능(OCR 문서인식, 카카오톡 주문접수 채널)을
// 실제 개발 전에 UI로 먼저 보여주는 공간. 기존 '테스트' 메뉴를 대체합니다.
import React, { useState } from 'react';
import { COLORS } from './test/theme';
import { OcrDocumentIntake, KakaoOrderChannel } from './test/proposalScreens';

const TABS = [
  { key: 'ocr', label: 'OCR 문서인식', icon: '📄' },
  { key: 'kakao', label: '카카오톡 주문접수', icon: '💬' },
];

function LabPage() {
  const [tab, setTab] = useState('ocr');

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
