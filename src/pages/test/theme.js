// src/pages/test/theme.js
// 스마트 ERP 2.0 공통 디자인 토큰 — 철강 산업 특유의 묵직한 다크 네이비/스틸 블루 팔레트에
// "용융 금속" 앰버를 포인트 컬러로 사용하는 산업-모던(Industrial-Modern) 테마.
// ⚠️ 아래 export된 이름(COLORS, box, pill, teamBadgeColors, fmtWon, fmtNum)은 ~30개 화면에서
//    import하고 있으므로 절대 이름을 바꾸지 마세요. 값만 교체하거나 새 키를 추가하세요.

export const COLORS = {
  // --- 기본 다크 네이비 (헤더/사이드바/강조 배경) ---
  navy: '#0f1e33',
  navy2: '#0a1524',

  // --- 스틸 블루 (보조 액션/링크/정보성 강조) ---
  blue: '#3672b0',

  // --- 텍스트/보더용 스틸 그레이 ---
  steel: '#4d5c72',
  steelLight: '#7d8ba1',

  border: '#e3e8f0',
  bg: '#eef1f6',
  white: '#ffffff',

  // --- 시맨틱 상태 색상 (기존 의미 유지: 초록=정상, 빨강=문제, 앰버=대기) ---
  red: '#c8372c',
  redBg: '#fbe6e4',
  green: '#1c7a4d',
  greenBg: '#e2f5ea',
  amber: '#a3610a',
  amberBg: '#fbedd2',
  blueBg: '#e6eef8',

  // --- 신규: 용융 금속 앰버 포인트 컬러 (CTA / 활성 상태 / 핵심 숫자 전용, 절제해서 사용) ---
  accent: '#e8830f',
  accentDark: '#c46b06',
  accentBg: '#fdecd6',
  accentSoft: '#fff6ea',

  // --- 신규: 그림자/입체감 토큰 ---
  shadowSm: '0 1px 2px rgba(10,21,36,0.06)',
  shadow: '0 2px 6px rgba(10,21,36,0.06), 0 8px 20px rgba(10,21,36,0.06)',
  shadowMd: '0 6px 18px rgba(10,21,36,0.10)',
  shadowLg: '0 16px 40px rgba(10,21,36,0.18)',

  // --- 신규: 네이비 그라디언트 (헤더/사이드바 배경용) ---
  navyGradient: 'linear-gradient(160deg, #16283f 0%, #0a1524 100%)',
};

export const box = {
  page: { display: 'flex', flexDirection: 'column', gap: '30px' },
  title: { margin: '0 0 6px 0', fontSize: '30px', fontWeight: 800, color: COLORS.navy, letterSpacing: '-0.01em' },
  subtitle: {
    fontSize: '22px', fontWeight: 700, color: '#1e293b', margin: '0 0 16px 0',
    paddingBottom: '12px', borderBottom: `2px solid ${COLORS.border}`,
  },
  hint: { color: COLORS.steelLight, fontSize: '15px', marginTop: '4px' },
  card: {
    backgroundColor: COLORS.white,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '18px',
    padding: '26px 28px',
    boxShadow: COLORS.shadow,
  },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '20px' },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: '16px',
    padding: '22px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    border: `1px solid ${COLORS.border}`,
    borderLeft: `4px solid ${COLORS.accent}`,
    boxShadow: COLORS.shadowSm,
  },
  statLabel: { fontSize: '15px', color: COLORS.steel, fontWeight: 700, letterSpacing: '0.01em' },
  statValue: { fontSize: '30px', fontWeight: 900, color: COLORS.navy, letterSpacing: '-0.01em', lineHeight: 1.15 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '17px' },
  th: {
    textAlign: 'left', padding: '15px 18px', backgroundColor: COLORS.navy, color: '#eef2f8',
    fontWeight: 700, fontSize: '15px', letterSpacing: '0.02em',
  },
  td: { padding: '14px 18px', borderBottom: `1px solid ${COLORS.border}`, color: '#243040' },
  loadingText: { color: COLORS.steelLight, fontSize: '18px', padding: '20px 0' },
  emptyText: { color: COLORS.steelLight, fontSize: '16px', padding: '16px 0' },
  input: {
    padding: '12px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '17px',
    width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', backgroundColor: COLORS.white,
  },
  label: { fontSize: '14px', fontWeight: 700, color: COLORS.steel, marginBottom: '6px', display: 'block' },
  primaryBtn: {
    padding: '13px 26px', backgroundColor: COLORS.accent, color: 'white', border: 'none',
    borderRadius: '11px', fontWeight: 800, fontSize: '16px', cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(232,131,15,0.32)', letterSpacing: '0.01em',
  },
  ghostBtn: {
    padding: '13px 26px', backgroundColor: '#eef2f7', color: COLORS.steel, border: `1px solid ${COLORS.border}`,
    borderRadius: '11px', fontWeight: 700, fontSize: '16px', cursor: 'pointer',
  },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' },
};

export function pill(bg, color) {
  return {
    display: 'inline-flex', alignItems: 'center', padding: '6px 15px', borderRadius: '999px',
    fontSize: '13px', fontWeight: 800, backgroundColor: bg, color, letterSpacing: '0.01em', lineHeight: 1.4,
  };
}

export const teamBadgeColors = {
  경영: { bg: COLORS.accentBg, color: COLORS.accentDark },
  '영업/현장': { bg: COLORS.greenBg, color: COLORS.green },
  생산: { bg: COLORS.blueBg, color: COLORS.blue },
  '경리/재무': { bg: COLORS.amberBg, color: COLORS.amber },
  공통: { bg: '#e9edf3', color: COLORS.steel },
  '고객사 포털': { bg: '#ece5f9', color: '#5a3d99' },
};

export function fmtWon(n) {
  return `${Number(n || 0).toLocaleString()}원`;
}

export function fmtNum(n) {
  return Number(n || 0).toLocaleString();
}
