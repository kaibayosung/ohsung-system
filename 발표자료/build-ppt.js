/* 오성철강 · 산업통상자원부 장관 보고 PPT 생성 스크립트
 *
 * 실행 방법 (PowerShell):
 *   cd C:\Users\USER\Documents\개발\ohsung-system\발표자료
 *   npm install pptxgenjs
 *   node build-ppt.js
 *
 * 사진 넣는 법:
 *   이 폴더에 photos 폴더를 만들고 아래 이름으로 저장하면 자동으로 들어갑니다.
 *   없으면 점선 자리표시자가 대신 들어갑니다.
 *     photos/jamsil.jpg      잠실 주경기장 (표지·클로징 배경)
 *     photos/roof.jpg        잠실 지붕 또는 당시 사진 (2장)
 *     photos/tablet.jpg      태블릿 보는 작업자 (11장)
 *     photos/drawing.png     롤러·샤프트 개조 도면 (18장)
 *     photos/report.png      품질 리포트 표지 (19장)
 */

const fs = require('fs');
const path = require('path');
const PptxGenJS = require('pptxgenjs');

const C = {
  navy: '0F1E33', navyDark: '16233A',
  purple: '534AB7', purpleL: 'EEEDFE', purpleT: 'C9B8FF',
  amber: 'B8791A', amberL: 'FBEEDA',
  red: 'A32D2D', redL: 'FCEBEB',
  green: '2F6B2F', greenL: 'E8F3E8',
  grey: '5C6478', greyL: 'F6F8FC',
  line: 'DDE2EC', white: 'FFFFFF', muted: '9FB0CC', dim: '5A6E90',
};

const FONT = '맑은 고딕';   // 윈도우 기본 탑재. Pretendard 설치돼 있으면 'Pretendard'로 바꾸세요.

const W = 13.33, H = 7.5;
const M = 0.72;                // 좌우 여백
const CW = W - M * 2;          // 본문 폭

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = '오성철강';
pptx.title = '오성철강 AI 전환 보고';

let pageNo = 0;

/* ---------- 공통 헬퍼 ---------- */

function photo(name) {
  const p = path.join(__dirname, 'photos', name);
  return fs.existsSync(p) ? p : null;
}

function newSlide(opts = {}) {
  const s = pptx.addSlide();
  if (opts.bg) s.background = { color: opts.bg };
  if (opts.no !== false) {
    s.addText(String(pageNo), {
      x: W - 1.1, y: H - 0.62, w: 0.6, h: 0.35, align: 'right',
      fontSize: 12, bold: true, color: opts.dark ? C.dim : 'A8B0C0', fontFace: FONT,
    });
  }
  pageNo++;
  return s;
}

function tag(s, text, color = C.purple, fill = C.purpleL) {
  s.addShape(pptx.ShapeType.roundRect, {
    x: M, y: 0.5, w: Math.max(1.5, text.length * 0.19 + 0.5), h: 0.45,
    fill: { color: fill }, line: { color: fill }, rectRadius: 0.22,
  });
  s.addText(text, {
    x: M, y: 0.5, w: Math.max(1.5, text.length * 0.19 + 0.5), h: 0.45,
    align: 'center', valign: 'middle', fontSize: 14, bold: true, color, fontFace: FONT,
  });
}

function h2(s, text, y = 1.15, opts = {}) {
  s.addText(text, {
    x: M, y, w: opts.w || CW, h: opts.h || 1.5,
    fontSize: opts.size || 36, bold: true, color: opts.color || C.navy,
    fontFace: FONT, lineSpacing: opts.size ? opts.size * 1.25 : 45, valign: 'top',
    align: opts.align || 'left',
  });
}

function body(s, text, y, opts = {}) {
  s.addText(text, {
    x: opts.x || M, y, w: opts.w || CW, h: opts.h || 1.0,
    fontSize: opts.size || 19, color: opts.color || '2B3243', bold: opts.bold !== false,
    fontFace: FONT, lineSpacing: (opts.size || 19) * 1.5, valign: 'top',
    align: opts.align || 'left',
  });
}

function quote(s, text, y, opts = {}) {
  const h = opts.h || 1.35;
  s.addShape(pptx.ShapeType.rect, {
    x: M, y, w: 0.09, h, fill: { color: opts.bar || C.purple }, line: { color: opts.bar || C.purple },
  });
  s.addText(text, {
    x: M + 0.32, y, w: CW - 0.32, h,
    fontSize: opts.size || 23, bold: true, color: opts.color || C.navy,
    fontFace: FONT, lineSpacing: (opts.size || 23) * 1.45, valign: 'middle',
  });
}

function card(s, { x, y, w, h, fill, title, text, titleColor, size }) {
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, fill: { color: fill || C.greyL }, line: { color: fill || C.greyL }, rectRadius: 0.12,
  });
  if (title) {
    s.addText(title, {
      x: x + 0.3, y: y + 0.25, w: w - 0.6, h: 0.55,
      fontSize: 20, bold: true, color: titleColor || C.navy, fontFace: FONT,
    });
  }
  if (text) {
    s.addText(text, {
      x: x + 0.3, y: y + (title ? 0.82 : 0.3), w: w - 0.6, h: h - (title ? 1.05 : 0.55),
      fontSize: size || 16, bold: true, color: '2B3243', fontFace: FONT,
      lineSpacing: (size || 16) * 1.45, valign: 'top',
    });
  }
}

function placeholder(s, { x, y, w, h, text }) {
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, fill: { color: 'EEF1F6' },
    line: { color: 'B6BFD0', width: 2, dashType: 'dash' }, rectRadius: 0.1,
  });
  s.addText(text, {
    x: x + 0.2, y, w: w - 0.4, h, align: 'center', valign: 'middle',
    fontSize: 14, bold: true, color: '7E8899', fontFace: FONT, lineSpacing: 22,
  });
}

/** 사진이 있으면 사진, 없으면 자리표시자 */
function pictureOrPlaceholder(s, file, box, caption) {
  const p = photo(file);
  if (p) s.addImage({ path: p, ...box, sizing: { type: 'cover', w: box.w, h: box.h } });
  else placeholder(s, { ...box, text: caption });
}

function stat(s, { x, y, w, value, label, color }) {
  s.addText(value, {
    x, y, w, h: 0.95, fontSize: 44, bold: true, color: color || C.purple,
    fontFace: FONT, align: 'left', valign: 'middle',
  });
  s.addText(label, {
    x, y: y + 0.9, w, h: 0.45, fontSize: 14, bold: true, color: C.grey, fontFace: FONT,
  });
}

function table(s, rows, y, opts = {}) {
  s.addTable(rows, {
    x: M, y, w: CW, colW: opts.colW,
    fontSize: opts.size || 15, fontFace: FONT, bold: true, color: '2B3243',
    border: { type: 'solid', color: C.line, pt: 1 },
    rowH: opts.rowH || 0.42, valign: 'middle',
    margin: [6, 12, 6, 12],
  });
}

/* ================= 슬라이드 ================= */

/* 0 · 표지 */
{
  const s = newSlide({ bg: C.navy, dark: true });
  const p = photo('jamsil.jpg');
  if (p) s.addImage({ path: p, x: 0, y: 0, w: W, h: H, sizing: { type: 'cover', w: W, h: H } });
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: C.navy, transparency: p ? 45 : 0 }, line: { color: C.navy } });
  if (!p) {
    s.addText('〔 배경 사진 : 잠실 주경기장 재건축 현장 항공사진 〕', {
      x: M, y: 1.2, w: CW, h: 0.5, fontSize: 14, color: C.dim, fontFace: FONT, align: 'center',
    });
  }
  s.addText('산업통상자원부 장관 보고 · 2026', {
    x: M, y: 3.55, w: CW, h: 0.4, fontSize: 15, bold: true, color: '7F93B5', fontFace: FONT, charSpacing: 1.5,
  });
  s.addText('43년 만에,\n우리도 다시 짓습니다', {
    x: M, y: 4.0, w: CW, h: 1.9, fontSize: 50, bold: true, color: C.white, fontFace: FONT, lineSpacing: 62,
  });
  s.addText('오성철강 · AI 전환 보고', {
    x: M, y: 6.0, w: CW, h: 0.5, fontSize: 20, bold: true, color: C.muted, fontFace: FONT,
  });
}

/* 1 · 전기차와 강판 */
{
  const s = newSlide();
  tag(s, '왜 이 자리에 왔는가');
  h2(s, '전기차 한 대에는\n강판이 들어갑니다');
  body(s, '완성차가 경쟁력을 가지려면 고품질 소재가 경쟁력 있는 가격에 공급되어야 합니다.\n그 소재를 자르고 펴서 공장으로 보내는 일은, 우리 같은 회사가 합니다.', 2.75, { h: 0.95 });

  const bw = 2.5, gap = 0.42, by = 3.85, bh = 1.05;
  const items = [['코일', '소재', false], ['2차 가공', '우리', true], ['부품', '1차 벤더', false], ['완성차', '전기차', false]];
  items.forEach((it, i) => {
    const x = M + i * (bw + gap);
    card(s, { x, y: by, w: bw, h: bh, fill: it[2] ? C.purpleL : C.greyL });
    s.addText(it[0], { x, y: by + 0.12, w: bw, h: 0.5, align: 'center', fontSize: 21, bold: true, color: C.navy, fontFace: FONT });
    s.addText(it[1], { x, y: by + 0.58, w: bw, h: 0.4, align: 'center', fontSize: 15, bold: true, color: it[2] ? C.purple : C.grey, fontFace: FONT });
    if (i < 3) s.addText('→', { x: x + bw, y: by, w: gap, h: bh, align: 'center', valign: 'middle', fontSize: 24, color: 'B6BFD0', fontFace: FONT });
  });

  quote(s, '그런데 그 기초를 맡은 공장들이 무너지고 있습니다.\n소재가 흔들리면, 그 위의 모든 산업이 흔들립니다.', 5.35);
}

/* 2 · 1983 */
{
  const s = newSlide();
  tag(s, '우리가 그런 회사입니다');
  h2(s, '1983년,\n우리는 첨단이었습니다', 1.15, { w: 6.6 });
  body(s, '잠실 주경기장 지붕을 만들던 회사였습니다.\n그리고 43년이 지났습니다.', 2.85, { w: 6.6, h: 0.8 });
  stat(s, { x: M, y: 3.75, w: 3.0, value: '43년', label: '1983년 설립' });
  stat(s, { x: M + 3.2, y: 3.75, w: 3.0, value: '12명', label: '현재 임직원' });
  pictureOrPlaceholder(s, 'roof.jpg',
    { x: 7.5, y: 1.15, w: 5.1, h: 3.9 },
    '〔 잠실 주경기장 지붕 사진 〕\n당시 사진 또는 현재 재건축 사진');
  quote(s, '43년 전통의 회사가 아닙니다.\n회사도 오래되었고, 기계도 오래되었고, 사람도 오래되었습니다.', 5.45, { size: 24 });
}

/* 3 · 목적 */
{
  const s = newSlide();
  h2(s, '그래서 우리가 잡은 목적은\n생산성 향상이었습니다', 2.4, { size: 42, align: 'center' });
  body(s, '더 빨리, 더 많이 만들면 살아남을 줄 알았습니다.', 4.6, { size: 22, color: C.grey, align: 'center' });
}

/* 4 · 첫 번째 실패 */
{
  const s = newSlide();
  tag(s, '첫 번째 실패', C.red, C.redL);
  h2(s, '첫 번째 답은 장비였습니다');
  card(s, { x: M, y: 2.55, w: CW / 2 - 0.25, h: 1.5, fill: C.greenL, title: '올라간 것', text: '생산성', titleColor: C.green, size: 22 });
  card(s, { x: M + CW / 2 + 0.25, y: 2.55, w: CW / 2 - 0.25, h: 1.5, fill: C.redL, title: '오르지 않은 것', text: '값 · 고부가가치', titleColor: C.red, size: 22 });
  quote(s, '세탁소가 비싼 세탁기를 들여놨다고\n세탁비를 더 받지는 못합니다.', 4.5, { bar: C.amber, size: 26, h: 1.2 });
  body(s, '손님은 그 세탁기를 볼 수 없기 때문입니다.', 5.85, { size: 19, color: C.grey });
}

/* 5 · 두 번째 실패 */
{
  const s = newSlide();
  tag(s, '두 번째 실패', C.red, C.redL);
  h2(s, '두 번째 답은 차별화였습니다');
  body(s, '코일센터 최초로 AI 기반 불량 측정 서비스를 만들었습니다. 대상도 받았습니다.', 2.5, { h: 0.5 });
  card(s, { x: M, y: 3.15, w: CW / 2 - 0.25, h: 1.4, fill: C.greenL, title: '개발', text: '완벽하게 성공', titleColor: C.green, size: 22 });
  card(s, { x: M + CW / 2 + 0.25, y: 3.15, w: CW / 2 - 0.25, h: 1.4, fill: C.redL, title: '매출', text: '그대로', titleColor: C.red, size: 22 });
  quote(s, '아무리 좋은 서비스도\n고객에게 닿지 않으면 없는 것과 같았습니다.', 5.0, { bar: C.red });
}

/* 6 · 왜 실패했나 */
{
  const s = newSlide();
  tag(s, '왜 실패했는가');
  h2(s, '우리는 알고 있습니다');
  const lines = [
    '목표가 추상적이었습니다 — "생산성을 올린다"는 목표가 아니라 구호였습니다',
    '목적이 한쪽에 치우쳤습니다 — 만드는 쪽만 보고, 파는 쪽을 보지 않았습니다',
    '새 기계로 공정을 개선하려면 공정을 알아야 하는데, 우리 공정을 몰랐습니다',
  ];
  lines.forEach((t, i) => {
    const y = 2.55 + i * 0.72;
    s.addShape(pptx.ShapeType.ellipse, { x: M + 0.06, y: y + 0.16, w: 0.16, h: 0.16, fill: { color: C.purple }, line: { color: C.purple } });
    s.addText(t, { x: M + 0.45, y, w: CW - 0.45, h: 0.6, fontSize: 19, bold: true, color: '2B3243', fontFace: FONT, valign: 'middle' });
  });
  quote(s, '우리는 목표를 세운 게 아니라, 구매를 한 것이었습니다.\nIT를 30년 한 저도 못 했습니다.', 5.05, { size: 24 });
}

/* 7 · 전환점 */
{
  const s = newSlide({ bg: 'F7F6FF' });
  h2(s, '그런데 AI가 나오면서\n모든 것이 바뀌었습니다', 0.95, { size: 40, align: 'center' });
  body(s, '직접 만들 수 있게 되었습니다.\n처음 만든 것은 조잡했습니다. 그래도 하나씩 했습니다.', 2.85, { align: 'center', h: 0.9 });
  s.addText('11개', { x: M, y: 3.75, w: CW, h: 0.9, align: 'center', fontSize: 48, bold: true, color: C.purple, fontFace: FONT });
  s.addText('지금 매일 돌아가는 서비스', { x: M, y: 4.6, w: CW, h: 0.4, align: 'center', fontSize: 15, bold: true, color: C.grey, fontFace: FONT });
  quote(s, 'IT를 30년 한 저도 못 했던 일이, AI가 나오자 되기 시작했습니다.\n이 말은 — 이제 IT 전문가가 아니어도 된다는 뜻입니다.', 5.15, { size: 22 });
  s.addText('지금부터 우리가 어디로 가는지 말씀드리겠습니다', {
    x: M, y: 6.6, w: CW, h: 0.5, align: 'center', fontSize: 22, bold: true, color: C.navy, fontFace: FONT,
  });
}

/* 8 · 목표 재정의 */
{
  const s = newSlide();
  tag(s, '목표를 다시 세웠습니다');
  h2(s, '국가가 필요한 것과,\n공장이 필요한 것');
  card(s, { x: M, y: 3.0, w: CW / 2 - 0.25, h: 1.7, fill: C.purpleL, title: '국가', text: '고품질 소재를\n경쟁력 있는 가격에', titleColor: C.purple, size: 19 });
  card(s, { x: M + CW / 2 + 0.25, y: 3.0, w: CW / 2 - 0.25, h: 1.7, fill: C.amberL, title: '공장', text: '품질을 증명하지 못하면 값을 받지 못하고,\n값을 받지 못하면 품질에 투자할 수 없습니다', titleColor: C.amber, size: 17 });
  quote(s, '"잘 만드는 회사"가 아니라\n"품질을 증명해서 값을 받는 회사"가 된다', 5.15, { size: 25 });
}

/* 9 · KT 표 */
{
  const s = newSlide();
  tag(s, '밖에서 배운 방식');
  s.addText('통신망은 장비만 감시하지 않습니다', { x: M, y: 1.12, w: CW, h: 0.6, fontSize: 26, bold: true, color: C.navy, fontFace: FONT });
  const hdr = { fill: C.navy, color: C.white, bold: true };
  const hl = { fill: C.purpleL, color: '2A2472' };
  const rows = [
    [{ text: 'KT에서 하던 일', options: hdr }, { text: '오성철강에서 하는 일', options: hdr }],
    ['모든 장비를 연결한다', '설비 연결 — 2초 간격, 182만 건'],
    ['실시간으로 감시한다', '라인 관제 · 현장 대시보드'],
    ['누구나 하도록 SOP를 만든다', '태블릿 · 한국어 영어 도구'],
    ['장애를 분석해 재발을 막는다', '작업 상세분석 · 이상 알람'],
    [{ text: '신청을 받아 자동으로 개통한다', options: hl }, { text: '주문 → 작업지시 자동 생성', options: hl }],
    [{ text: '완료되면 고객에게 통보한다', options: hl }, { text: '완료 · 출고 자동 통보', options: hl }],
    [{ text: '24시간 조회하게 한다', options: hl }, { text: '고객 포털 — 재고 · 작업 · 단가', options: hl }],
    [{ text: '이력을 보고 먼저 제안한다', options: hl }, { text: '조용해진 거래처 자동 탐지', options: hl }],
  ];
  table(s, rows, 1.85, { colW: [CW / 2, CW / 2], size: 15, rowH: 0.46 });
  s.addText('두 번째 실패는 정확히 아래 네 줄이 없어서 생긴 일이었습니다.', {
    x: M, y: 6.5, w: CW, h: 0.5, fontSize: 19, bold: true, color: C.purple, fontFace: FONT,
  });
}

/* 10 · 내비게이션 비유 */
{
  const s = newSlide();
  tag(s, '한 장으로 설명하면');
  h2(s, '공장에 내비게이션과\n블랙박스를 달았습니다');
  const hdr = { fill: C.navy, color: C.white, bold: true };
  const rows = [
    [{ text: '자동차', options: hdr }, { text: '우리 공장', options: hdr }],
    ['출발 전 경로 안내 — 남들은 몇 분 걸렸나', '작업 전 — 같은 제품을 전에 어떻게 만들었나'],
    ['주행 중 안내 — 지금 과속인가 저속인가', '작업 중 — 지금 빠른가 늦은가'],
    ['블랙박스 — 언제든 되돌려 본다', '작업 후 — 그 순간으로 되돌아간다'],
    ['사고 원인 분석', '불량 원인 분석'],
  ];
  table(s, rows, 3.3, { colW: [CW / 2, CW / 2], size: 16, rowH: 0.62 });
}

/* 11 · 경로안내 */
{
  const s = newSlide();
  tag(s, '① 경로 안내 · 실시간 안내');
  s.addText('숙련공의 기억이 아니라\n지난 작업의 실측이 기준입니다', {
    x: M, y: 1.15, w: 6.9, h: 1.4, fontSize: 27, bold: true, color: C.navy, fontFace: FONT, lineSpacing: 36,
  });
  body(s, '같은 제품을 이미 만든 코일들을 찾아, 그때 어떤 속도와 힘으로 돌았는지를 평균 내서 보여줍니다. 40년 공장장이 머릿속으로 하던 계산은 태블릿이 대신합니다.', 2.7, { w: 6.9, h: 1.5, size: 17 });
  card(s, { x: M, y: 4.3, w: 6.9, h: 1.25, fill: C.amberL, text: '이 서비스는 현장 직원의 요청으로 시작됐습니다.\n한국어판과 영어판을 따로 만들었습니다.', size: 17 });
  pictureOrPlaceholder(s, 'tablet.jpg', { x: 7.85, y: 1.15, w: 4.75, h: 4.4 }, '〔 현장 사진 〕\n태블릿을 보는 작업자');
  s.addText('※ 이 도구를 영어로도 만들었습니다. 나중에 이 사람들이 장비를 직접 고치기 시작합니다.', {
    x: M, y: 5.85, w: CW, h: 0.5, fontSize: 14, bold: true, color: C.grey, fontFace: FONT,
  });
}

/* 12 · 폰 카메라 */
{
  const s = newSlide();
  tag(s, '문제 하나가 있었습니다');
  h2(s, '데이터를 뽑을 단자가 없는 장비');
  card(s, { x: M, y: 2.75, w: CW / 2 - 0.25, h: 1.75, fill: C.redL, title: '기존 방법', text: '장비를 바꾼다\n수천만 원', titleColor: C.red, size: 21 });
  card(s, { x: M + CW / 2 + 0.25, y: 2.75, w: CW / 2 - 0.25, h: 1.75, fill: C.greenL, title: '우리가 한 것', text: '휴대폰 카메라를 계기판 앞에 두고\nAI가 숫자를 읽는다', titleColor: C.green, size: 18 });
  body(s, '1분마다 6개 값이 자동으로 기록됩니다.', 4.75, { size: 19 });
  quote(s, '장비를 바꾸지 않고 데이터를 얻었습니다.\n억대 설비 교체 대신, 휴대폰 한 대였습니다.', 5.35, { size: 24 });
}

/* 13 · 블랙박스 */
{
  const s = newSlide();
  tag(s, '② 블랙박스');
  h2(s, '"그때 어떻게 돌렸지?"에\n이제 답할 수 있습니다');
  card(s, { x: M, y: 3.3, w: CW / 2 - 0.25, h: 1.9, fill: C.redL, title: '예전', text: '불량이 나와도\n아무도 답하지 못했습니다', titleColor: C.red, size: 19 });
  card(s, { x: M + CW / 2 + 0.25, y: 3.3, w: CW / 2 - 0.25, h: 1.9, fill: C.greenL, title: '지금', text: '코일 번호와 위치를 넣으면\n그 순간의 속도와 힘이 그대로 나옵니다', titleColor: C.green, size: 19 });
  body(s, '기사님이 전화하면 거래처 이름만 넣어 세 개 라인 전체에서 찾습니다.', 5.5, { size: 19 });
}

/* 14 · 사고 원인 분석 */
{
  const s = newSlide();
  tag(s, '③ 사고 원인 분석');
  h2(s, '데이터가 찾아낸 것들');
  const cw = (CW - 0.5) / 3;
  card(s, { x: M, y: 2.6, w: cw, h: 2.5, fill: C.greyL, title: '고장 난 센서', titleColor: C.purple, size: 15,
    text: '코일 60건을 한 번에 훑었더니, 5건은 힘을 재는 센서 4개 중 3개가 가동 내내 0이었습니다. 가공이 아니라 배선 문제였습니다.' });
  card(s, { x: M + cw + 0.25, y: 2.6, w: cw, h: 2.5, fill: C.greyL, title: '남의 시스템', titleColor: C.purple, size: 15,
    text: '납품받은 검사 시스템을 뜯어봤더니 일부 코일은 결함 기록의 94.2%가 시험용 가짜 데이터였습니다.' });
  card(s, { x: M + (cw + 0.25) * 2, y: 2.6, w: cw, h: 2.5, fill: C.greyL, title: '우리 시스템', titleColor: C.purple, size: 15,
    text: '우리 화면에서 시각이 9시간 밀려 기록되던 오류를 찾아 전부 고쳤습니다.' });
  quote(s, '우리는 숫자를 믿지 않고, 확인합니다.', 5.45, { size: 26, h: 0.9 });
}

/* 15 · 자동화 */
{
  const s = newSlide();
  tag(s, '주문에서 통보까지');
  h2(s, '사람 손이 없습니다');
  const steps = ['주문\n접수', '내용\n자동 확인', '작업지시서\n자동 생성', '현장\n하달', '생산', '완료\n보고', '출고 ·\n고객 통보'];
  const sw = (CW - 0.6) / 7;
  steps.forEach((t, i) => {
    const x = M + i * (sw + 0.1);
    card(s, { x, y: 2.6, w: sw, h: 1.25, fill: C.greyL });
    s.addText(String(i + 1), { x, y: 2.7, w: sw, h: 0.3, align: 'center', fontSize: 13, bold: true, color: C.purple, fontFace: FONT });
    s.addText(t, { x, y: 3.0, w: sw, h: 0.75, align: 'center', fontSize: 14, bold: true, color: C.navy, fontFace: FONT, lineSpacing: 18 });
  });
  card(s, { x: M, y: 4.4, w: CW / 2 - 0.25, h: 1.6, fill: C.redL, title: '예전', text: '사람이 보고 손으로 다시 입력\n빠뜨리면 현장이 모릅니다', titleColor: C.red, size: 18 });
  card(s, { x: M + CW / 2 + 0.25, y: 4.4, w: CW / 2 - 0.25, h: 1.6, fill: C.greenL, title: '지금', text: '업무시간 동안 1분마다 자동\n팩스 요청서는 AI가 읽습니다', titleColor: C.green, size: 18 });
}

/* 16 · 고객 */
{
  const s = newSlide();
  tag(s, '고객이 24시간 봅니다');
  s.addText('자기 코일의 재고 · 작업 · 출고를\n언제든 봅니다', {
    x: M, y: 1.15, w: 7.2, h: 1.3, fontSize: 27, bold: true, color: C.navy, fontFace: FONT, lineSpacing: 36,
  });
  body(s, '진행 상황은 접수부터 출고완료까지 5단계로 추적되고,\n궁금한 것은 채팅으로 물으면 실제 데이터로 답합니다.', 2.6, { w: 7.2, h: 1.1, size: 18 });
  card(s, { x: M, y: 3.9, w: 7.2, h: 1.6, fill: C.purpleL, title: '그리고 우리가 먼저 찾아갑니다', titleColor: C.purple, size: 17,
    text: '재고를 맡겨둔 채 조용해진 거래처를 시스템이 먼저 찾아냅니다.' });
  stat(s, { x: 8.6, y: 1.8, w: 4.0, value: '9곳', label: '거래처 20곳 중 위험군 자동 식별', color: C.red });
  stat(s, { x: 8.6, y: 3.6, w: 4.0, value: '171.9톤', label: '그 거래처들에 묶여 있는 재고', color: C.red });
}

/* 17 · 현장이 먼저 */
{
  const s = newSlide();
  tag(s, '예상하지 못한 일 ①', C.green, C.greenL);
  h2(s, '현장이 먼저\n요구하기 시작했습니다');
  body(s, '시키지 않았는데 내부에서 품질 개선 회의가 열렸습니다.\n설정값을 계산해주는 도구를 만들어달라는 요구가 현장에서 올라왔습니다.', 2.9, { h: 1.0 });
  card(s, { x: M, y: 4.0, w: CW, h: 1.1, fill: C.greenL, text: '만들어 적용했더니 설정을 잘못해서 나던 불량이 거의 사라졌습니다.', size: 21 });
  quote(s, '지시로 시작된 개선이 아니라,\n현장이 스스로 낸 요구였습니다.', 5.35);
}

/* 18 · 외국인 직원 도면 */
{
  const s = newSlide();
  tag(s, '예상하지 못한 일 ②', C.green, C.greenL);
  s.addText('외국인 직원들이\n장비를 고치기 시작했습니다', {
    x: M, y: 1.15, w: 6.6, h: 1.35, fontSize: 27, bold: true, color: C.navy, fontFace: FONT, lineSpacing: 36,
  });
  body(s, '직원 12명 중 다섯은 외국인입니다. 설명서도 작업 기준도 전부 한국어라, 개선 제안이 나올 수 없는 구조였습니다.\n\n도구를 한국어와 영어 두 벌로 만들자 상황이 바뀌었습니다. AI의 도움으로 언어의 벽을 넘어 장비 데이터를 직접 읽기 시작했고, 원인을 알게 되자 고치는 방법이 보였습니다.', 2.65, { w: 6.6, h: 2.6, size: 16 });
  pictureOrPlaceholder(s, 'drawing.png', { x: 7.55, y: 1.15, w: 5.05, h: 4.1 },
    '〔 롤러 · 샤프트 개조 도면 〕\nØ40 롤러 / 1,320mm / Ø20 샤프트 / 6204-2RS');
  quote(s, '이 도면을 만든 사람은 엔지니어가 아니라, 우리 현장 직원입니다.', 5.5, { size: 24, h: 0.9 });
}

/* 19 · 품질 리포트 */
{
  const s = newSlide();
  tag(s, '예상하지 못한 일 ③', C.green, C.greenL);
  h2(s, '고객이 불량이라 했고,\n아무도 우리를 믿지 않았습니다');
  body(s, '증명할 방법이 없었습니다. 말은 말을 이기지 못합니다.', 2.9, { h: 0.5 });
  card(s, { x: M, y: 3.5, w: 7.2, h: 1.7, fill: C.greyL, title: '그래서 AI에게 물었습니다', titleColor: C.purple, size: 18,
    text: '그 코일들의 작업 기록을 전부 분석해 품질 리포트를 만들어냈습니다.' });
  pictureOrPlaceholder(s, 'report.png', { x: 8.6, y: 3.5, w: 4.0, h: 1.7 }, '〔 품질 분석 리포트 표지 〕');
  quote(s, '분쟁이 데이터로 끝났습니다.\n이건 방어 수단이 아니라 팔 수 있는 것이었습니다.', 5.45, { size: 22, h: 1.0 });
}

/* 20 · AI는 발견 */
{
  const s = newSlide({ bg: C.navy, dark: true });
  s.addText('우리는 AI로 무언가를 만들려다 두 번 실패했습니다.\n세 번째에는 AI로 보기 시작했습니다.', {
    x: M, y: 2.1, w: CW, h: 1.2, align: 'center', fontSize: 20, bold: true, color: C.muted, fontFace: FONT, lineSpacing: 34,
  });
  s.addText('AI는 개발이 아니라,\n발견을 하게 해줍니다', {
    x: M, y: 3.6, w: CW, h: 2.0, align: 'center', fontSize: 44, bold: true, color: C.white, fontFace: FONT, lineSpacing: 58,
  });
}

/* 21 · 요청 */
{
  const s = newSlide();
  tag(s, '요청드립니다');
  h2(s, '「자체개발형 AI 모델공장」 시범 지정', 1.1, { size: 32, h: 0.8 });
  body(s, '반월시화에는 우리 같은 공장이 4,000곳 있습니다.\n그런데 이 모든 것을 지금 저 혼자 하고 있습니다.', 2.05, { h: 0.9, size: 18 });
  const cw = (CW - 0.5) / 3;
  card(s, { x: M, y: 3.15, w: cw, h: 1.85, fill: C.purpleL, title: '전담 인력 2명', titleColor: C.purple, size: 16,
    text: '데이터 담당 1\n현장 적용 담당 1' });
  card(s, { x: M + cw + 0.25, y: 3.15, w: cw, h: 1.85, fill: C.purpleL, title: '실증 예산', titleColor: C.purple, size: 16,
    text: '품질측정 완결 +\n다른 공장도 쓸 범용 모듈화' });
  card(s, { x: M + (cw + 0.25) * 2, y: 3.15, w: cw, h: 1.85, fill: C.purpleL, title: '확산 채널', titleColor: C.purple, size: 16,
    text: '산단 내 공개 실증장\n견학 · 교육 프로그램' });
  s.addText('2027년 1년 시범 → 2028년 반월시화 코일가공 업종 확대', {
    x: M, y: 5.3, w: CW, h: 0.5, fontSize: 19, bold: true, color: C.navy, fontFace: FONT,
  });
  s.addText('검증 지표 : 불량률 개선 · 적용 업체 수 · 신규 1곳 적용 소요기간 · 공개 모듈 개수', {
    x: M, y: 5.8, w: CW, h: 0.5, fontSize: 15, bold: true, color: C.grey, fontFace: FONT,
  });
}

/* 22 · 클로징 */
{
  const s = newSlide({ bg: C.navy, dark: true });
  const p = photo('jamsil.jpg');
  if (p) s.addImage({ path: p, x: 0, y: 0, w: W, h: H, sizing: { type: 'cover', w: W, h: H } });
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: C.navy, transparency: p ? 40 : 0 }, line: { color: C.navy } });
  s.addText('오디세우스는 고향에 돌아오는 데 20년이 걸렸습니다.\n저는 30년이 걸렸습니다.\n돌아와 보니, 밖에서 배운 것이 여기서 쓸모가 있었습니다.', {
    x: M, y: 1.55, w: CW, h: 1.5, align: 'center', fontSize: 18, bold: true, color: C.muted, fontFace: FONT, lineSpacing: 30,
  });
  s.addText('그 경기장도 다시 짓고 있습니다\n우리도 다시 짓고 있습니다', {
    x: M, y: 3.35, w: CW, h: 1.7, align: 'center', fontSize: 38, bold: true, color: C.white, fontFace: FONT, lineSpacing: 50,
  });
  s.addText('AI는 개발이 아니라, 발견이었습니다', {
    x: M, y: 5.3, w: CW, h: 0.7, align: 'center', fontSize: 24, bold: true, color: C.purpleT, fontFace: FONT,
  });
}

/* ---------- 저장 ---------- */
const OUT = '오성철강_산업부장관_발표.pptx';
pptx.writeFile({ fileName: path.join(__dirname, OUT) })
  .then(() => {
    console.log('');
    console.log('  완료 : ' + OUT);
    console.log('  총 ' + pageNo + '장');
    const missing = ['jamsil.jpg', 'roof.jpg', 'tablet.jpg', 'drawing.png', 'report.png'].filter((f) => !photo(f));
    if (missing.length) {
      console.log('');
      console.log('  사진 자리표시자로 들어간 항목 (photos 폴더에 넣고 다시 실행하면 반영됩니다):');
      missing.forEach((f) => console.log('    - photos/' + f));
    }
    console.log('');
  })
  .catch((e) => { console.error('실패:', e); process.exit(1); });
