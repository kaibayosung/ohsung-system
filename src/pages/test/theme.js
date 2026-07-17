// src/pages/test/theme.js
// 스마트 ERP 2.0 "테스트" 메뉴 공통 색상/스타일 — 기존 앱(ExpenseDashboard 등)의 팔레트와 폰트 크기를 그대로 따릅니다.

export const COLORS = {
  navy: '#1a365d',
  navy2: '#15294a',
  blue: '#3182ce',
  steel: '#4a5568',
  steelLight: '#a0aec0',
  border: '#e2e8f0',
  bg: '#f1f5f9',
  white: '#ffffff',
  red: '#c53030',
  redBg: '#fde2e2',
  green: '#276749',
  greenBg: '#e3f6df',
  amber: '#975a16',
  amberBg: '#fdf1d6',
  blueBg: '#ebf4fb',
};

export const box = {
  page: { display: 'flex', flexDirection: 'column', gap: '28px' },
  title: { margin: '0 0 6px 0', fontSize: '30px', fontWeight: 800, color: COLORS.navy },
  subtitle: { fontSize: '22px', fontWeight: 700, color: '#2d3748', margin: '0 0 14px 0' },
  hint: { color: COLORS.steelLight, fontSize: '15px', marginTop: '4px' },
  card: { backgroundColor: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '24px 26px' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px' },
  statCard: { backgroundColor: '#f8fafc', borderRadius: '14px', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '8px' },
  statLabel: { fontSize: '15px', color: COLORS.steel, fontWeight: 600 },
  statValue: { fontSize: '24px', fontWeight: 800, color: COLORS.navy },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '17px' },
  th: { textAlign: 'left', padding: '14px 16px', backgroundColor: COLORS.navy, color: 'white', fontWeight: 700, fontSize: '15px' },
  td: { padding: '13px 16px', borderBottom: `1px solid ${COLORS.border}`, color: '#2d3748' },
  loadingText: { color: COLORS.steelLight, fontSize: '18px', padding: '20px 0' },
  emptyText: { color: COLORS.steelLight, fontSize: '16px', padding: '16px 0' },
  input: { padding: '12px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '17px', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' },
  label: { fontSize: '14px', fontWeight: 700, color: COLORS.steel, marginBottom: '6px', display: 'block' },
  primaryBtn: { padding: '13px 26px', backgroundColor: COLORS.blue, color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '16px', cursor: 'pointer' },
  ghostBtn: { padding: '13px 26px', backgroundColor: '#edf2f7', color: COLORS.steel, border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '16px', cursor: 'pointer' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' },
};

export function pill(bg, color) {
  return { display: 'inline-block', padding: '5px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, backgroundColor: bg, color };
}

export const teamBadgeColors = {
  경영: { bg: '#dce6f1', color: COLORS.navy },
  '영업/현장': { bg: COLORS.greenBg, color: COLORS.green },
  생산: { bg: COLORS.blueBg, color: COLORS.blue },
  '경리/재무': { bg: COLORS.amberBg, color: COLORS.amber },
  공통: { bg: '#edf2f7', color: COLORS.steel },
};

export function fmtWon(n) {
  return `${Number(n || 0).toLocaleString()}원`;
}

export function fmtNum(n) {
  return Number(n || 0).toLocaleString();
}
