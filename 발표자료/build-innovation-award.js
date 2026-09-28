// 제33회 기업혁신대상 신청서 — 오성철강
// 실행: npm install docx && node build-innovation-award.js
const fs = require('fs');
const d = require('docx');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
        AlignmentType, HeadingLevel, BorderStyle, ShadingType, PageBreak,
        VerticalAlign, convertInchesToTwip } = d;

const F = '맑은 고딕';
const INK = '1A1A1A', GRAY = '666666', NAVY = '11325C', ACC = '1F4E79',
      LINE = 'D9D9D9', HEAD = 'EDF2F8', TINT = 'F7F9FC', GOLDBG = 'FFF6E5';

// ── 헬퍼 ─────────────────────────────────────────────
const P = (text, o = {}) => new Paragraph({
  alignment: o.align || AlignmentType.LEFT,
  spacing: { before: o.before ?? 60, after: o.after ?? 60, line: o.line ?? 300 },
  indent: o.indent,
  border: o.border,
  children: (Array.isArray(text) ? text : [{ t: text }]).map(r => new TextRun({
    text: r.t, bold: r.b ?? o.bold, size: r.sz ?? o.size ?? 20,
    color: r.c ?? o.color ?? INK, font: F, italics: r.i,
  })),
});
const H1 = t => new Paragraph({
  spacing: { before: 260, after: 140 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACC, space: 4 } },
  children: [new TextRun({ text: t, bold: true, size: 28, color: NAVY, font: F })],
});
const H2 = t => new Paragraph({
  spacing: { before: 200, after: 90 },
  children: [new TextRun({ text: t, bold: true, size: 23, color: ACC, font: F })],
});
const H3 = t => new Paragraph({
  spacing: { before: 150, after: 70 },
  children: [new TextRun({ text: t, bold: true, size: 21, color: INK, font: F })],
});
const BUL = (t, o = {}) => new Paragraph({
  spacing: { before: 40, after: 40, line: 290 },
  indent: { left: convertInchesToTwip(o.lv === 2 ? 0.52 : 0.26),
            hanging: convertInchesToTwip(0.18) },
  children: (Array.isArray(t) ? t : [{ t }]).map(r => new TextRun({
    text: r.t, bold: r.b, size: r.sz ?? 20, color: r.c ?? INK, font: F,
  })),
  bullet: { level: o.lv === 2 ? 1 : 0 },
});
const cell = (children, o = {}) => new TableCell({
  width: { size: o.w, type: WidthType.DXA },
  columnSpan: o.span,
  rowSpan: o.rspan,
  verticalAlign: VerticalAlign.CENTER,
  shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
  margins: { top: 90, bottom: 90, left: 120, right: 120 },
  children: Array.isArray(children) ? children : [children],
});
const tcell = (t, o = {}) => cell(P(t, {
  bold: o.b, size: o.sz ?? 19, align: o.align, color: o.color,
  before: 20, after: 20, line: 280,
}), o);
const TBL = (rows, colW) => new Table({
  columnWidths: colW,
  width: { size: colW.reduce((a, b) => a + b, 0), type: WidthType.DXA },
  borders: {
    top:    { style: BorderStyle.SINGLE, size: 4, color: LINE },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE },
    left:   { style: BorderStyle.SINGLE, size: 4, color: LINE },
    right:  { style: BorderStyle.SINGLE, size: 4, color: LINE },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: LINE },
    insideVertical:   { style: BorderStyle.SINGLE, size: 4, color: LINE },
  },
  rows,
});
const GAP = (h = 120) => new Paragraph({ spacing: { before: h, after: h }, children: [] });
const RULE = () => new Paragraph({
  spacing: { before: 120, after: 120 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: LINE, space: 2 } },
  children: [],
});
const NOTE = t => new Paragraph({
  spacing: { before: 80, after: 80, line: 290 },
  indent: { left: convertInchesToTwip(0.12) },
  shading: { type: ShadingType.CLEAR, fill: GOLDBG, color: 'auto' },
  children: [new TextRun({ text: t, size: 18, color: '7A4A00', font: F, bold: true })],
});
const BLANK = '                              ';

// ═══════════════════════════════════════════════════
const body = [];

// ── 표지 ─────────────────────────────────────────────
body.push(
  GAP(900),
  P('제33회 기업혁신대상', { align: AlignmentType.CENTER, size: 24, color: GRAY, bold: true }),
  GAP(60),
  P('참가신청서 및 활동개요', { align: AlignmentType.CENTER, size: 46, bold: true, color: NAVY }),
  GAP(200),
  P('낮에만 도는 공장에서, 24시간 쉬지 않는 회사로', { align: AlignmentType.CENTER, size: 26, bold: true, color: ACC }),
  GAP(40),
  P('— 두 번의 실패가 남긴 데이터로, 코일센터가 서비스업이 되기까지 —',
    { align: AlignmentType.CENTER, size: 20, color: GRAY }),
  GAP(700),
  P('오 성 철 강', { align: AlignmentType.CENTER, size: 32, bold: true }),
  GAP(60),
  P('2026. 9.', { align: AlignmentType.CENTER, size: 20, color: GRAY }),
  GAP(500),
  P('주최 산업통상부  ·  주관 대한상공회의소', { align: AlignmentType.CENTER, size: 18, color: GRAY }),
  new Paragraph({ children: [new PageBreak()] }),
);

// ── [첨부1] 참가신청서 ────────────────────────────────
body.push(H1('[첨부 1]  제33회 기업혁신대상 신청서'));
body.push(NOTE('※ 음영 칸은 회사 공식 정보 확인 후 기입해 주십시오. (사업자등록증·법인등기부 기준)'));
body.push(GAP());

const W = [1600, 3400, 1600, 3400];
body.push(TBL([
  new TableRow({ children: [
    tcell('회사명', { w: W[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('오성철강', { w: W[1], b: true }),
    tcell('사업자등록번호', { w: W[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell(BLANK, { w: W[3], fill: TINT }),
  ]}),
  new TableRow({ children: [
    tcell('대표이사 성명', { w: W[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell(BLANK, { w: W[1], fill: TINT }),
    tcell('직인', { w: W[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('(날인)', { w: W[3], color: GRAY, align: AlignmentType.CENTER }),
  ]}),
  new TableRow({ children: [
    tcell('연락처 (Tel.)', { w: W[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell(BLANK, { w: W[1], fill: TINT }),
    tcell('e-mail', { w: W[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell(BLANK, { w: W[3], fill: TINT }),
  ]}),
  new TableRow({ children: [
    tcell('연락처 (Mobile)', { w: W[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell(BLANK, { w: W[1], fill: TINT }),
    tcell('', { w: W[2], fill: HEAD }),
    tcell('', { w: W[3] }),
  ]}),
], W));

body.push(GAP(120));
body.push(H2('담당 임원 (경영혁신 · ESG경영)'));
body.push(TBL([
  new TableRow({ children: [
    tcell('성명', { w: W[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell(BLANK, { w: W[1], fill: TINT }),
    tcell('직위', { w: W[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell(BLANK, { w: W[3], fill: TINT }),
  ]}),
  new TableRow({ children: [
    tcell('연락처 (Tel.)', { w: W[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell(BLANK, { w: W[1], fill: TINT }),
    tcell('e-mail', { w: W[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell(BLANK, { w: W[3], fill: TINT }),
  ]}),
  new TableRow({ children: [
    tcell('연락처 (Mobile)', { w: W[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell(BLANK, { w: W[1], fill: TINT }),
    tcell('', { w: W[2], fill: HEAD }),
    tcell('', { w: W[3] }),
  ]}),
], W));

body.push(GAP(120));
body.push(H2('실무 담당자'));
body.push(TBL([
  new TableRow({ children: [
    tcell('성명', { w: W[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell(BLANK, { w: W[1], fill: TINT }),
    tcell('직위', { w: W[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell(BLANK, { w: W[3], fill: TINT }),
  ]}),
  new TableRow({ children: [
    tcell('부서', { w: W[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell(BLANK, { w: W[1], fill: TINT }),
    tcell('e-mail', { w: W[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell(BLANK, { w: W[3], fill: TINT }),
  ]}),
  new TableRow({ children: [
    tcell('연락처 (Tel.)', { w: W[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell(BLANK, { w: W[1], fill: TINT }),
    tcell('연락처 (Mobile)', { w: W[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell(BLANK, { w: W[3], fill: TINT }),
  ]}),
], W));

body.push(GAP(240));
body.push(P('2026년 제33회 기업혁신대상에 응모합니다.', { align: AlignmentType.CENTER, size: 22, bold: true }));
body.push(GAP(130));
body.push(P('2026.        .        .', { align: AlignmentType.CENTER, size: 20 }));
body.push(GAP(120));
body.push(P('회사명 :  오성철강', { align: AlignmentType.CENTER, size: 20, bold: true }));
body.push(P('대표이사 :                              (직인)', { align: AlignmentType.CENTER, size: 20, bold: true }));
body.push(GAP(150));
body.push(P('대한상공회의소 귀중', { align: AlignmentType.CENTER, size: 24, bold: true }));
body.push(new Paragraph({ children: [new PageBreak()] }));

// ── [첨부2] 기업 개요 ─────────────────────────────────
body.push(H1('[첨부 2]  기업 개요'));
body.push(NOTE('※ 음영 칸(매출액·순이익·종업원수·사업자등록번호 등)은 재무제표 및 원천징수이행상황신고서 기준으로 기입해 주십시오.'));
body.push(GAP());

const C = [1550, 2450, 1550, 2450, 1000];
body.push(TBL([
  new TableRow({ children: [
    tcell('회사명', { w: C[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('오성철강', { w: C[1], b: true }),
    tcell('사업자등록번호', { w: C[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell(BLANK, { w: C[3] + C[4], span: 2, fill: TINT }),
  ]}),
  new TableRow({ children: [
    tcell('주소', { w: C[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('경기도 안산시 반월시화 국가산업단지 ' + BLANK, { w: C[1] + C[2] + C[3] + C[4], span: 4, fill: TINT }),
  ]}),
  new TableRow({ children: [
    tcell('대표자', { w: C[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell(BLANK, { w: C[1], fill: TINT }),
    tcell('홈페이지', { w: C[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('ohsung-system.vercel.app', { w: C[3] + C[4], span: 2 }),
  ]}),
  new TableRow({ children: [
    tcell('업종', { w: C[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('1차 철강 가공 (코일센터)', { w: C[1] }),
    tcell('주생산품', { w: C[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('슬리팅·레벨링 가공 강판 (자동차·건설용 소재)', { w: C[3] + C[4], span: 2 }),
  ]}),
  new TableRow({ children: [
    tcell('사업장수', { w: C[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('국내 1', { w: C[1], align: AlignmentType.CENTER }),
    tcell('해외 0', { w: C[2], align: AlignmentType.CENTER }),
    tcell('합계 1', { w: C[3] + C[4], span: 2, align: AlignmentType.CENTER }),
  ]}),
  new TableRow({ children: [
    tcell('기업 규모', { w: C[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('대기업 (   )      중견 (   )      중소 ( ✓ )', { w: C[1] + C[2] + C[3] + C[4], span: 4, b: true }),
  ]}),
], C));

body.push(GAP(140));
const D = [1550, 2500, 2500, 2450];
body.push(TBL([
  new TableRow({ children: [
    tcell('구분', { w: D[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('2023년', { w: D[1], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('2024년', { w: D[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('2025년', { w: D[3], b: true, fill: HEAD, align: AlignmentType.CENTER }),
  ]}),
  new TableRow({ children: [
    tcell('매출액 (억원)', { w: D[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell(BLANK, { w: D[1], fill: TINT }), tcell(BLANK, { w: D[2], fill: TINT }), tcell(BLANK, { w: D[3], fill: TINT }),
  ]}),
  new TableRow({ children: [
    tcell('순이익 (억원)', { w: D[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell(BLANK, { w: D[1], fill: TINT }), tcell(BLANK, { w: D[2], fill: TINT }), tcell(BLANK, { w: D[3], fill: TINT }),
  ]}),
  new TableRow({ children: [
    tcell('종업원수 (명)', { w: D[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell(BLANK, { w: D[1], fill: TINT }), tcell(BLANK, { w: D[2], fill: TINT }),
    tcell('12  (외국인 5 포함)', { w: D[3], b: true }),
  ]}),
], D));

// ── 주요 성과 (300~500자) ────────────────────────────
body.push(GAP(180));
body.push(H2('주요 성과  (300~500자)'));
body.push(TBL([
  new TableRow({ children: [
    cell([
      P([{ t: '외주 개발 없이 현장이 직접 만든 41개 AI 서비스로, 43년 된 코일센터를 「24시간 응답하는 소재 서비스 기업」으로 전환하고 있습니다. ', b: true },
         { t: '설비를 교체하지 않고 휴대폰 카메라와 AI로 30년 된 장비의 계기판을 읽어내 데이터 공백을 메웠고, 2초 단위 설비 기록 182만 건을 포함해 187만 건의 공정 데이터 자산을 확보했습니다. 자체 개발한 설정값 산출 도구로 설정 오류로 인한 불량을 사실상 제거했으며, AI 전수 분석으로 사람 눈으로는 찾을 수 없던 단선 센서 5건과 외부 납품 검사시스템의 데이터 결함 30%를 적발해 품질 신뢰의 기반을 다시 세웠습니다. ' },
         { t: '특히 전 직원의 42%인 외국인 근로자를 위해 모든 현장 도구를 한국어·영어 2개 언어로 제공한 결과, 현장 직원이 직접 설비 개조 도면을 작성하는 단계에 이르렀습니다. ', b: true },
         { t: '축적된 공정 기록은 고객사에 제공하는 품질 리포트라는 신규 서비스로 전환되어, 가공 단가 경쟁에서 벗어난 새로운 수익 기반을 열고 있습니다.' }],
        { size: 19, line: 300 }),
      P('(공백 포함 약 480자)', { size: 16, color: GRAY, align: AlignmentType.RIGHT, before: 80 }),
    ], { w: 9000, span: 1 }),
  ]}),
], [9000]));

body.push(new Paragraph({ children: [new PageBreak()] }));

// ═══════════════════════════════════════════════════
// 활동개요 — 심사기준 5개 항목
// ═══════════════════════════════════════════════════
body.push(H1('활동개요'));
body.push(P('※ 심사기준 항목 순서에 따라 기술하였습니다. (기재내용이 많아 별지로 작성)',
  { size: 18, color: GRAY }));

// ── 1. 추진배경 및 목표설정 ───────────────────────────
body.push(H2('1.  경영혁신 추진배경 및 목표설정   [배점 30 / 35점]'));

body.push(H3('가.  추진배경 — 두 번의 실패가 출발점이었습니다'));
body.push(P('당사는 1983년 잠실 주경기장 지붕 자재를 공급하던 제조기업으로 출발했습니다. 그러나 43년이 지난 현재, 회사도 설비도 인력도 함께 노후화되었습니다. 전 직원 12명 중 5명이 외국인 근로자이며, 40년 경력 공장장의 정년이 임박해 있습니다. 그 사이 고객이 요구하는 품질 수준은 지속적으로 상승했으나 당사는 이를 따라가지 못했습니다.'));
body.push(P('이에 두 차례에 걸쳐 혁신을 시도하였으나 모두 사업적 성과로 이어지지 못했습니다.'));
body.push(BUL([{ t: '1차 (설비 투자) : ', b: true },
  { t: '생산성 향상을 목표로 설비를 교체하여 생산성은 실제로 개선되었으나, 고객이 당사의 설비 수준을 확인할 방법이 없어 단가에 반영되지 못했습니다.' }]));
body.push(BUL([{ t: '2차 (AI 품질측정 개발) : ', b: true },
  { t: '코일센터 최초로 AI 기반 표면 결함 측정 시스템을 개발해 대상을 수상했으나, 현장은 별도 시스템 접속 부담으로 사용하지 않았고 검사 결과가 고객에게 전달될 통로가 없어 매출로 연결되지 않았습니다.' }]));
body.push(P([{ t: '두 차례 모두 "좋은 것을 갖추면 인정받는다"는 전제가 잘못되었습니다. 우수한 설비와 기술이 모두 ', },
             { t: '아무도 볼 수 없는 곳에 놓여 있었던 것', b: true },
             { t: '이 실패의 공통 원인이었습니다.' }]));

body.push(H3('나.  전환점 — 실패가 남긴 자산과 AI의 등장'));
body.push(P('두 차례의 시도는 성과를 내지 못했으나 세 가지 자산을 남겼습니다.'));
body.push(BUL('① 생산성이 확보된 가공 설비'));
body.push(BUL('② 동종 업계에서 보유 사례가 드문 정밀 표면검사·두께 측정 자료 (전수 촬영 기반)'));
body.push(BUL('③ 설비가 2초마다 자동 생성해 온 공정 데이터 (누적 182만 행)'));
body.push(P('그러나 AI 도입 이전에는 이 데이터를 활용할 수 없었습니다. 12인 규모 기업에 데이터 분석 인력을 둘 수 없었고, 외부 분석 시스템 도입은 수천만 원의 비용이 소요되는 데다 발주 명세에 "무엇을 분석할 것인가"를 먼저 정의해야 했으나 그 질문 자체를 알지 못했습니다. 데이터는 있었으나 질문이 없어 활용되지 못하는 상태였습니다.'));
body.push(P([{ t: 'AI의 등장으로 이 제약이 해소되었습니다. 질문을 시도하는 데 비용이 들지 않게 되면서 반복적 탐색이 가능해졌고, 분석 화면까지 내부에서 직접 제작할 수 있게 되었습니다. ' },
             { t: '핵심은 AI를 "개발 수단"이 아니라 "질문 수단"으로 사용한 것입니다.', b: true }]));

body.push(H3('다.  목표설정 — 질문을 두 가지로 재정의'));
body.push(P('3차 혁신에서는 "무엇을 도입할 것인가"라는 기존 질문을 폐기하고, 다음 두 가지 질문을 경영혁신의 축으로 설정하였습니다.'));

const Q = [2100, 3300, 3600];
body.push(TBL([
  new TableRow({ children: [
    tcell('구분', { w: Q[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('질문 ① 우리는 무엇을 모르는가', { w: Q[1], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('질문 ② 고객은 무엇을 원하는가', { w: Q[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
  ]}),
  new TableRow({ children: [
    tcell('관점', { w: Q[0], b: true, fill: TINT, align: AlignmentType.CENTER }),
    tcell('내부 — 공정과 품질', { w: Q[1] }),
    tcell('외부 — 고객 경험과 수익', { w: Q[2] }),
  ]}),
  new TableRow({ children: [
    tcell('목표', { w: Q[0], b: true, fill: TINT, align: AlignmentType.CENTER }),
    tcell('설비 성능에 부합하는 품질 관리 기술의 내재화', { w: Q[1] }),
    tcell('24시간 응답 가능한 소재 서비스 체계 구축', { w: Q[2] }),
  ]}),
  new TableRow({ children: [
    tcell('미달 시', { w: Q[0], b: true, fill: TINT, align: AlignmentType.CENTER }),
    tcell('품질은 개선되나 외부에 인지되지 않음 (= 1차 실패)', { w: Q[1], color: 'B00020' }),
    tcell('판매할 서비스는 있으나 근거가 없음 (= 2차 실패)', { w: Q[2], color: 'B00020' }),
  ]}),
], Q));
body.push(P('두 질문은 병행 추진되어야 하며, 어느 한쪽만으로는 성과에 도달할 수 없다는 점이 앞선 두 차례 실패에서 확인된 교훈입니다.',
  { size: 19, color: GRAY, before: 100 }));

body.push(GAP(200));

// ── 2. 추진방향 및 세부내용 ───────────────────────────
body.push(H2('2.  경영혁신 추진방향 및 세부내용   [배점 30 / 35점]'));

body.push(H3('가.  추진 원칙 — 대형 시스템 구축이 아닌, 미응답 질문의 순차적 제거'));
body.push(P('통합 시스템을 일괄 구축하는 대신, 현장 작업자가 즉시 답할 수 없는 질문을 하나씩 찾아 해소하는 방식을 채택했습니다. 이는 소규모 기업이 감당 가능한 투자 규모를 유지하면서도 현장 활용률을 확보하기 위한 선택이었습니다.'));

const K = [900, 3300, 4800];
body.push(TBL([
  new TableRow({ children: [
    tcell('No', { w: K[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('현장이 답하지 못하던 질문', { w: K[1], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('해소 방식', { w: K[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
  ]}),
  new TableRow({ children: [
    tcell('①', { w: K[0], b: true, align: AlignmentType.CENTER }),
    tcell('지금 설비가 정상 범위에서 운전되고 있는가', { w: K[1], b: true }),
    tcell('태블릿·모바일에 실시간 속도·장력을 대형 숫자로 표시. 공장장이 암산하던 설정값을 시스템이 자동 산출', { w: K[2] }),
  ]}),
  new TableRow({ children: [
    tcell('②', { w: K[0], b: true, align: AlignmentType.CENTER }),
    tcell('불량 발생 시점의 설비 상태는 어떠했는가', { w: K[1], b: true }),
    tcell('코일번호·길이 위치 입력 시 해당 지점의 운전 조건을 재생. 전 구간 구간별 소급 조회 가능', { w: K[2] }),
  ]}),
  new TableRow({ children: [
    tcell('③', { w: K[0], b: true, align: AlignmentType.CENTER }),
    tcell('원소재 결함인가, 가공 중 발생한 결함인가', { w: K[1], b: true }),
    tcell('AI 비전 전수 촬영 자료와 설비 운전 기록을 동일 시간축에서 대조하여 귀책 구분', { w: K[2] }),
  ]}),
  new TableRow({ children: [
    tcell('④', { w: K[0], b: true, align: AlignmentType.CENTER, color: 'B00020' }),
    tcell('우리 데이터는 신뢰할 수 있는가', { w: K[1], b: true, color: 'B00020' }),
    tcell('자사 설비·외부 납품 시스템·자체 개발 시스템을 모두 검증 대상으로 설정하여 전수 점검', { w: K[2] }),
  ]}),
], K));

body.push(H3('나.  설비 교체 없는 데이터 확보 — 저비용 혁신 사례'));
body.push(P('장력 제어 장비(PR-DTC-3100)는 도입 30년 경과 기종으로 데이터 출력 단자가 존재하지 않았습니다. 데이터 취득을 위해서는 설비 교체가 필요하며 수천만 원의 투자가 요구되는 상황이었습니다.'));
body.push(P([{ t: '당사는 계기판 전면에 스마트폰 카메라를 고정 설치하고 AI 영상인식으로 표시값을 판독하는 방식을 채택했습니다. 현재 1분 주기로 출력%·전압·두께·시작경·장력설정·장력율 6개 항목이 자동 수집·저장되고 있습니다. ' },
             { t: '설비 교체 없이 노후 장비를 데이터 자산화한 사례로, 동종 중소 제조기업에 즉시 이전 가능한 방식입니다.', b: true }]));

body.push(H3('다.  조직 구조 및 직무 재설계'));
body.push(BUL([{ t: '역할 기반 권한 분리 : ', b: true }, { t: '운영자·경리·대표 3개 역할군으로 메뉴와 데이터 접근 범위를 분리하고, 관리자 전용 기능(경영보고·계정관리)은 일반 권한에서 노출되지 않도록 설계' }]));
body.push(BUL([{ t: '이중 언어 직무 표준화 : ', b: true }, { t: '전 현장 도구를 한국어·영어 2개 버전으로 병행 제작하여, 외국인 근로자가 통역 없이 설비 데이터를 직접 판독할 수 있는 환경 구축' }]));
body.push(BUL([{ t: '암묵지의 형식지 전환 : ', b: true }, { t: '40년 숙련 공장장의 경험적 판단 기준을 화면 표시값으로 전환. 정년 이후에도 동일 기준으로 작업이 가능하도록 기술 승계 체계 마련' }]));
body.push(BUL([{ t: '외부 의존 최소화 : ', b: true }, { t: '전 서비스를 내부 개발로 수행. 현장 개선 요구를 견적·계약 절차 없이 수일 내 반영하는 체제 확립' }]));

body.push(H3('라.  AI 활용의 6개 유형 — 단일 기술이 아닌 목적별 분화'));
const A6 = [2200, 3200, 3600];
body.push(TBL([
  new TableRow({ children: [
    tcell('유형', { w: A6[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('적용 기술', { w: A6[1], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('적용 사례', { w: A6[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
  ]}),
  ...[['① 판독', '영상 문자인식 (OCR)', '계기판 수치, 팩스 작업요청서, 지출 증빙 자동 판독'],
      ['② 검사', 'AI 비전', '분당 250m 주행 강판 표면 전수 촬영 및 결함 위치 기록'],
      ['③ 탐지', '이상치 탐지', '2주치 전수 분석으로 단선 센서·이상 운전 구간 자동 추출'],
      ['④ 추천', '유사 사양 기반 추론', '동일 사양 실적 기반 권장 속도·장력·예상 가동시간 산출'],
      ['⑤ 응답', '자연어 질의응답', '고객 문의에 실제 운전 기록을 근거로 자연어 응답'],
      ['⑥ 개발', '생성형 AI 기반 개발', '분석 화면 및 도구 자체를 내부 인력이 AI로 직접 제작']]
    .map(([a, b, c], i) => new TableRow({ children: [
      tcell(a, { w: A6[0], b: true, fill: i === 5 ? GOLDBG : undefined }),
      tcell(b, { w: A6[1], fill: i === 5 ? GOLDBG : undefined }),
      tcell(c, { w: A6[2], fill: i === 5 ? GOLDBG : undefined }),
    ]})),
], A6));
body.push(P('⑥ 유형이 나머지 5개 유형의 내재화를 가능하게 한 핵심 요인입니다. 개발 행위 자체를 AI로 수행함으로써, 전문 개발 인력 없이 41개 서비스를 자체 구축할 수 있었습니다.',
  { size: 19, before: 100, bold: true }));

body.push(GAP(200));

// ── 3. 실천사례 및 참여도 ─────────────────────────────
body.push(H2('3.  경영혁신 실천사례 및 참여도   [배점 50 / 60점]'));

body.push(H3('가.  자체 개발 서비스 41종 현황'));
const S4 = [3000, 1200, 5000];
body.push(TBL([
  new TableRow({ children: [
    tcell('분류', { w: S4[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('건수', { w: S4[1], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('주요 내용', { w: S4[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
  ]}),
  ...[['생산현장 도구', '21', '설정 계산 키오스크, 작업현황 대시보드, 라인 통합관제(NMS), 설비 상세조회, AI 헬퍼, 운행정보 모니터 등'],
      ['주문접수 자동화', '5', '팩스 작업요청서 판독, 카카오톡 접수, 문서인식, 현장 코일확정'],
      ['고객 대면 서비스', '3', '주문 현황 트래커, 자연어 문의 응답, 거래 소강 고객사 자동 식별'],
      ['창고 · 설비', '2', '코일창고 3D 재고 조회 및 출고관리, 설비 사고 원인 분석'],
      ['경영 · 재무', '2', '계좌 연동 손익 집계, 거래명세서 입금 자동 대사'],
      ['시스템 연동', '1', '기간계 ERP 작업지시 자동 등록 (수작업 대체)']]
    .map(([a, b, c]) => new TableRow({ children: [
      tcell(a, { w: S4[0], b: true }), tcell(b, { w: S4[1], b: true, align: AlignmentType.CENTER }),
      tcell(c, { w: S4[2], sz: 18 }),
    ]})),
  new TableRow({ children: [
    tcell('합계', { w: S4[0], b: true, fill: TINT }),
    tcell('41', { w: S4[1], b: true, fill: TINT, align: AlignmentType.CENTER }),
    tcell('이 중 30종이 실데이터 기반으로 가동 중, 2종은 현장 상시 운영, 외주 개발 0건', { w: S4[2], b: true, fill: TINT }),
  ]}),
], S4));

body.push(H3('나.  데이터 신뢰성 검증 — 자사·협력사·자체시스템 전수 점검'));
body.push(P('데이터 기반 경영의 전제는 데이터 자체의 신뢰성입니다. 당사는 검증 대상을 자사 설비에 한정하지 않고 외부 납품 시스템과 자체 개발 결과물까지 확대하였습니다.'));
const V = [2400, 2000, 4800];
body.push(TBL([
  new TableRow({ children: [
    tcell('검증 대상', { w: V[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('발견 사항', { w: V[1], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('조치 및 의미', { w: V[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
  ]}),
  new TableRow({ children: [
    tcell('자사 설비 (센서)', { w: V[0], b: true }),
    tcell('4개 중 3개 무신호', { w: V[1], b: true, color: 'B00020', align: AlignmentType.CENTER }),
    tcell('코일 60건·2주치 전수 분석으로 5건 적발. 가공 이상이 아닌 배선 단선이 원인. 육안 점검으로는 발견이 불가능한 유형', { w: V[2] }),
  ]}),
  new TableRow({ children: [
    tcell('외부 납품 검사시스템', { w: V[0], b: true }),
    tcell('표본 30% 결함', { w: V[1], b: true, color: 'B00020', align: AlignmentType.CENTER }),
    tcell('기록된 결함의 상당수가 시험용 데이터였으며, 두께 측정은 표본 5건 전부 미작동. 협력사 납품물에 대한 검수 체계 재정립', { w: V[2] }),
  ]}),
  new TableRow({ children: [
    tcell('자체 개발 시스템', { w: V[0], b: true }),
    tcell('시각 9시간 오차', { w: V[1], b: true, align: AlignmentType.CENTER }),
    tcell('자체 결과물도 예외 없이 검증하여 전 화면 수정. 내부 통제의 자기점검 원칙 확립', { w: V[2] }),
  ]}),
], V));

body.push(H3('다.  구성원 자발적 참여 — 하향식에서 상향식으로의 전환'));
body.push(P('1·2차 혁신은 경영진 또는 외부 업체가 주도하여 현장 활용률이 저조했습니다. 3차에서는 현장이 직접 도구를 요구하는 구조로 전환되었습니다.'));
body.push(BUL([{ t: '자발적 품질 개선 회의 개최 : ', b: true }, { t: '경영진 지시 없이 현장 구성원이 자체적으로 품질 개선 논의를 시작' }]));
body.push(BUL([{ t: '현장 발의 도구 개발 : ', b: true }, { t: '"설정값 자동 산출 도구"는 현장의 요청으로 개발된 사례이며, 현재 상시 사용 중' }]));
body.push(BUL([{ t: '외국인 근로자의 기술 참여 : ', b: true },
  { t: '현장 도구의 이중 언어 제공 이후, 외국인 근로자가 설비 데이터를 직접 판독하고 개선점을 도출. 롤러 지름 40mm, 길이 1,320mm, 축경 20mm, 베어링 규격이 명기된 설비 개조 도면을 현장 직원이 직접 작성', b: true }]));
body.push(P('외국인 근로자가 언어 장벽을 넘어 설비 개선 제안 주체가 된 것은 당초 계획에 없던 성과이며, 인적 다양성이 기술 역량으로 전환된 사례입니다.',
  { size: 19, color: ACC, bold: true, before: 80 }));

body.push(H3('라.  교육 및 확산 체계'));
body.push(BUL('현장 도구를 교육 자료로 활용 — 별도 교재 없이 실제 사용 화면으로 작업 표준을 학습하는 체계'));
body.push(BUL('신규·외국인 인력이 경력 40년 인력과 동일한 화면·동일한 기준값으로 작업 — 숙련도에 따른 품질 편차 최소화'));
body.push(BUL('사내 연구실(Lab) 운영 — 신규 아이디어를 정식 개발 전 시제품 형태로 공개하여 현장 검증 후 정식 도입'));

body.push(GAP(200));

// ── 4. 경영성과 ──────────────────────────────────────
body.push(H2('4.  경영혁신 경영성과   [배점 80 / 100점 — 최고 배점 항목]'));
body.push(NOTE('※ 매출액·순이익·고용 증감 수치는 재무제표 확정치로 보완 기입이 필요합니다. (아래 「보완 필요 항목」 참조)'));

body.push(H3('가.  정량 성과'));
const R = [3200, 1900, 1900, 2200];
body.push(TBL([
  new TableRow({ children: [
    tcell('구분', { w: R[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('도입 전', { w: R[1], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('현재', { w: R[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('효과', { w: R[3], b: true, fill: HEAD, align: AlignmentType.CENTER }),
  ]}),
  ...[['자체 개발 서비스', '0건', '41건', '30건 실데이터 가동'],
      ['외주 개발 비용', '건별 발주 필요', '0원', '전량 내재화'],
      ['현장 개선 반영 기간', '견적·계약 후 수개월', '수일', '대폭 단축'],
      ['확보 데이터', '미활용 방치', '187만 건', '설비 기록 182만 행 포함'],
      ['설정 오류 불량', '상시 발생', '사실상 소멸', '설정값 산출 도구 적용 후'],
      ['노후 설비 데이터화', '불가 (단자 없음)', '1분 주기 6개 항목', '설비 교체비 미발생'],
      ['센서 이상 발견', '육안 점검 의존', '전수 분석 5건 적발', '재발 방지 체계 확보'],
      ['협력사 납품물 검증', '미수행', '표본 30% 결함 적발', '검수 체계 신설']]
    .map(([a, b, c, e]) => new TableRow({ children: [
      tcell(a, { w: R[0], b: true }), tcell(b, { w: R[1], sz: 18, color: GRAY, align: AlignmentType.CENTER }),
      tcell(c, { w: R[2], b: true, align: AlignmentType.CENTER }), tcell(e, { w: R[3], sz: 18 }),
    ]})),
], R));

body.push(H3('나.  재무구조 개선 효과'));
body.push(BUL([{ t: '개발 투자비 절감 : ', b: true }, { t: '41개 서비스를 외부 발주할 경우 발생했을 개발비를 전액 절감. 소규모 기업에서 실행 가능한 유일한 방식이었습니다.' }]));
body.push(BUL([{ t: '설비 투자 회피 : ', b: true }, { t: '노후 장력 제어 장비의 데이터화를 설비 교체 없이 해결하여 수천만 원 규모의 투자를 회피' }]));
body.push(BUL([{ t: '품질 비용 절감 : ', b: true }, { t: '설정 오류 불량 제거로 재작업·폐기 손실 및 관련 자재·전력 소모 감소' }]));
body.push(BUL([{ t: '수작업 대체 : ', b: true }, { t: '기간계 ERP 작업지시 자동 등록으로 반복 입력 업무 제거' }]));

body.push(H3('다.  정성 성과 — 사업 모델의 전환'));
body.push(P('가장 중요한 성과는 수치가 아니라 사업 구조의 변화입니다.'));
body.push(P([{ t: '고객사와의 품질 이견이 발생한 사안에서, 해당 코일의 운전 기록을 전수 분석하여 작업 중단 여부와 가공 조건이 기재된 ' },
             { t: '품질 리포트', b: true },
             { t: '를 제출함으로써 분쟁이 종결되었습니다. 이 과정에서 내부 품질 관리 목적으로 축적한 데이터가 ' },
             { t: '고객에게 제공 가능한 상품', b: true },
             { t: '이라는 점을 확인하였습니다.' }]));
body.push(P('코일 가공업은 통상 단가와 납기만으로 경쟁합니다. 품질 이력을 근거 자료로 제공할 수 있게 되면서, 가공 단가 경쟁에서 벗어난 서비스 기반 수익 구조의 가능성이 열렸습니다. 이는 "가공업체"에서 "소재 품질을 증명하고 24시간 응답하는 서비스 기업"으로의 전환을 의미합니다.'));

body.push(H3('라.  고용 및 인적 성과'));
body.push(BUL('전 직원의 42%에 해당하는 외국인 근로자가 언어 장벽 없이 설비 데이터에 접근 — 정보 격차 해소'));
body.push(BUL('외국인 근로자가 설비 개조 도면을 직접 작성하는 수준의 기술 역량 확보 — 단순 노무에서 기술 인력으로의 전환'));
body.push(BUL('40년 숙련 인력의 암묵지를 시스템에 이전 — 정년에 따른 기술 단절 위험 해소'));
body.push(BUL('숙련도 무관 동일 품질 확보 — 신규 채용 인력의 조기 전력화 기반 마련'));

body.push(GAP(200));

// ── 5. 향후 추진계획 ──────────────────────────────────
body.push(H2('5.  향후 추진계획   [배점 30 / 45점]'));

body.push(H3('가.  현 진척도에 대한 자체 평가'));
body.push(P('당사는 현재 위치를 다음과 같이 판단하고 있습니다.'));
const PR = [3000, 1400, 6000];
body.push(TBL([
  new TableRow({ children: [
    tcell('구분', { w: PR[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('진척도', { w: PR[1], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('현황 및 잔여 과제', { w: PR[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
  ]}),
  new TableRow({ children: [
    tcell('질문 ① 내부 품질·기술', { w: PR[0], b: true }),
    tcell('70%', { w: PR[1], b: true, align: AlignmentType.CENTER, color: '1E7B3C' }),
    tcell('품질 관리 기술과 개발 역량은 확보. 다만 현재 시스템은 측정값을 표시할 뿐 적정 여부를 판정하지 않음. 사양별 표준값 확정이 잔여 과제', { w: PR[2] }),
  ]}),
  new TableRow({ children: [
    tcell('질문 ② 고객 서비스', { w: PR[0], b: true }),
    tcell('20%', { w: PR[1], b: true, align: AlignmentType.CENTER, color: 'B00020' }),
    tcell('기능은 대부분 구현했으나 고객에게 실제 개방된 서비스가 부재. 24시간 창구 개설이 핵심 과제', { w: PR[2] }),
  ]}),
], PR));

body.push(H3('나.  단계별 실행 계획'));
const PL = [1700, 3200, 5100];
body.push(TBL([
  new TableRow({ children: [
    tcell('기간', { w: PL[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('목표', { w: PL[1], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('세부 과제', { w: PL[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
  ]}),
  new TableRow({ children: [
    tcell('1~3개월', { w: PL[0], b: true, align: AlignmentType.CENTER }),
    tcell('데이터 결측 제거\n(신규 개발 없음)', { w: PL[1], b: true }),
    tcell('센서 배선 보수 · 카메라 고정 · 코일번호 태깅 100% 달성 · 품질 이력과 공정 데이터 연결 · 기존 도구 3종의 현장 상시 운영 전환', { w: PL[2] }),
  ]}),
  new TableRow({ children: [
    tcell('3~6개월', { w: PL[0], b: true, align: AlignmentType.CENTER }),
    tcell('판정 기준 수립 및\n고객 창구 개설', { w: PL[1], b: true }),
    tcell('사양별 표준값 확정·문서화 · 화면의 적정/이탈 판정 기능 도입 · 이탈 사유 기록 체계 · 고객 포털 실서비스 전환(1개사) · 품질 리포트 시범 발행', { w: PL[2] }),
  ]}),
  new TableRow({ children: [
    tcell('6~12개월', { w: PL[0], b: true, align: AlignmentType.CENTER }),
    tcell('24시간 체계 완성 및\n서비스 유상화', { w: PL[1], b: true }),
    tcell('24시간 발주 접수 실배포 · 품질 리포트 전 거래처 확대 및 상세본 유상화 · 계약서 명시 · 보관 대행 요율 계약 · 작업 표준서 화면 완성', { w: PL[2] }),
  ]}),
], PL));

body.push(H3('다.  최고경영자의 관심 및 실천'));
body.push(P('본 혁신은 최고경영자가 직접 기획·개발·검증을 수행하고 있습니다. 통신업계에서 약 30년간 IT 업무를 수행한 경험을 보유하고 있으나, AI 도입 이전에는 동일한 데이터를 보유하고도 활용하지 못했습니다. 41개 서비스는 전량 내부에서 제작되었으며, 현장 요구가 발생하면 경영진이 직접 수일 내에 반영하는 체제로 운영되고 있습니다.'));
body.push(P('현재는 최고경영자 1인이 개발을 전담하고 있어, 지속 가능성 확보를 위한 전담 인력 확충을 2027년 과제로 설정하였습니다.'));

body.push(H3('라.  산업 확산 계획'));
body.push(P('당사의 방식은 특정 기업에 국한되지 않습니다. 반월시화 국가산업단지에는 유사 규모·유사 노후도의 제조기업 약 4,000개사가 소재하며, 대부분이 활용되지 않는 설비 데이터를 보유하고 있습니다.'));
body.push(BUL('공개 실증장 운영 — 산업단지 내 타 기업이 직접 방문하여 운영 현황을 확인할 수 있는 상설 견학 체계'));
body.push(BUL('이전 가능 형태로의 정리 — 당사 구축물을 타 기업이 적용 가능한 표준 형태로 문서화'));
body.push(BUL('교육 프로그램 운영 — "외주 없이 직접 만드는 방식"을 동종 업계에 전수'));
body.push(BUL('2027년 시범 운영 → 2028년 코일 가공 업종 전반으로 확대'));

body.push(GAP(200));

// ── ESG 부문 ─────────────────────────────────────────
body.push(H1('ESG 부문'));
body.push(NOTE('※ ESG 부문은 1차 심사 400점 중 180점(45%)으로 배점 비중이 높습니다. 아래 내용은 실제 운영 중인 체계를 기준으로 작성하였으며, 미수립 항목은 「보완 필요 항목」에 별도 표기하였습니다.'));

body.push(H2('E  ·  환경   [배점 65 / 80점]'));
body.push(H3('가.  환경경영 목표 및 추진 방향'));
body.push(P('당사는 코일 가공 공정의 특성상 자원 손실(불량·재작업)과 전력 소비가 환경 부하의 주요 요인입니다. 이에 「불량 감축을 통한 자원 손실 최소화」를 환경경영의 1차 목표로 설정하고, 공정 데이터를 근거로 관리하고 있습니다.'));

body.push(H3('나.  실천 내용'));
body.push(BUL([{ t: '자원 손실 저감 : ', b: true }, { t: '설정 오류로 인한 불량을 사실상 제거하여 재작업·폐기에 소모되던 강재·전력·시간을 절감. 불량 1건 감소는 원자재 손실과 재가공 전력 소비를 동시에 줄이는 효과를 가집니다.' }]));
body.push(BUL([{ t: '설비 수명 연장 (전자폐기물 저감) : ', b: true }, { t: '노후 장력 제어 장비를 교체하는 대신 카메라·AI 판독 방식으로 데이터화하여 계속 사용. 설비 폐기에 따른 산업폐기물 발생을 회피한 순환경제형 개선 사례입니다.' }]));
body.push(BUL([{ t: '자원 순환 관리 : ', b: true }, { t: '가공 공정에서 발생하는 스크랩(고철)의 발생·판매 이력을 시스템에 기록·관리하여 재자원화 흐름을 수치로 추적' }]));
body.push(BUL([{ t: '종이 사용 저감 : ', b: true }, { t: '팩스 작업요청서·수기 작업지시·지출 증빙을 디지털 판독 체계로 전환하여 출력물 사용 축소' }]));
body.push(BUL([{ t: '에너지 사용 가시화 : ', b: true }, { t: '설비 가동·정지 이력이 2초 단위로 기록되어, 비가동 중 전력 소모 구간을 식별할 수 있는 데이터 기반 확보' }]));

body.push(H3('다.  향후 계획'));
body.push(BUL('불량률·재작업률의 환경 지표화 — 절감된 강재량·전력량으로 환산하여 연간 관리'));
body.push(BUL('설비별 전력 사용량 계측 연계 — 가동 데이터와 결합한 에너지 원단위 관리 체계 수립'));
body.push(BUL('고객사 제공 품질 리포트에 자원 손실 저감 실적 병기 — 공급망 전반의 환경 성과 공유'));

body.push(H2('S  ·  사회   [배점 65 / 80점]'));
body.push(H3('가.  외국인 근로자의 정보 접근권 보장 — 당사의 핵심 사회 성과'));
body.push(P('당사 전 직원 12명 중 5명(42%)이 외국인 근로자입니다. 그러나 설비 매뉴얼과 작업 기준이 전량 한국어로만 제공되어, 이들이 공정을 이해하거나 개선을 제안할 수 있는 구조 자체가 부재했습니다.'));
body.push(P([{ t: '당사는 전 현장 도구를 한국어·영어 2개 언어로 병행 제작하였습니다. 그 결과 외국인 근로자가 통역 없이 설비 데이터를 직접 판독하게 되었고, ' },
             { t: '현재는 설비 개조 도면을 직접 작성하는 수준에 이르렀습니다.', b: true },
             { t: ' 언어를 이유로 배제되던 인력이 기술 개선의 주체가 된 사례로, 인적 다양성을 역량으로 전환한 실천입니다.' }]));

body.push(H3('나.  보건 · 안전'));
body.push(BUL([{ t: '설비 사고 원인 규명 체계 : ', b: true }, { t: '설비 운전 기록과 CCTV 영상을 동일 시간축에서 대조하여 사고 원인을 신속히 규명하고 재발 방지 조치에 반영' }]));
body.push(BUL([{ t: '이상 상태 조기 감지 : ', b: true }, { t: '센서 단선·이상 운전 구간을 자동 탐지하여, 설비 이상이 안전 사고로 확대되기 전 단계에서 조치' }]));
body.push(BUL([{ t: '원격 확인 체계 : ', b: true }, { t: '관리자가 현장에 상주하지 않아도 모바일로 설비 상태를 확인할 수 있어, 외국인 운전자의 단독 판단 부담을 경감' }]));

body.push(H3('다.  숙련 승계 및 인적 자본'));
body.push(BUL('40년 숙련 인력의 판단 기준을 시스템에 이전 — 정년에 따른 기술 단절 방지'));
body.push(BUL('숙련도와 무관하게 동일 화면·동일 기준으로 작업 — 신규 인력의 조기 전력화 및 작업 품질 편차 해소'));
body.push(BUL('현장 발의 개선 제안 체계 — 구성원이 필요한 도구를 직접 요구하고 수일 내 반영되는 참여형 운영'));

body.push(H3('라.  정보보호 및 고객 데이터 관리'));
body.push(BUL([{ t: '거래처별 데이터 격리 : ', b: true }, { t: '고객 포털은 데이터베이스 레벨의 행 단위 접근제어를 적용하여, 각 거래처가 자사 데이터만 조회 가능하도록 기술적으로 차단' }]));
body.push(BUL([{ t: '계정 체계 분리 : ', b: true }, { t: '임직원 계정과 고객사 계정을 물리적으로 분리된 테이블로 운영하며, 상호 접근이 원천적으로 불가능한 구조' }]));
body.push(BUL([{ t: '접근 이력 관리 : ', b: true }, { t: '시스템 접근 기록을 별도 저장하여 사후 추적이 가능한 체계 운영' }]));

body.push(H2('G  ·  지배구조   [배점 50 / 65점]'));
body.push(H3('가.  데이터 기반 의사결정 체계'));
body.push(BUL([{ t: '경영 현황의 상시 가시화 : ', b: true }, { t: '일별 작업 실적·라인별 가동률·매출 연동 현황을 대표이사가 직접 조회하는 전용 화면 운영. 보고 자료 작성을 거치지 않고 원데이터를 확인하는 체계' }]));
body.push(BUL([{ t: '자동 마감 리포트 : ', b: true }, { t: '일일 작업 건수·이상 발생 건수·데이터 결측 현황을 자동 집계. 담당자 부재 시에도 관리가 중단되지 않는 구조' }]));
body.push(BUL([{ t: '전자 결재 : ', b: true }, { t: '지출결의 및 승인 절차를 시스템화하여 승인 이력을 기록·보존' }]));

body.push(H3('나.  권한 관리 및 내부 통제'));
body.push(BUL('역할 기반 권한 분리 — 운영자·경리·대표 3개 역할군으로 데이터 접근 범위를 구분하고, 관리자 전용 기능은 일반 권한에서 노출되지 않도록 설계'));
body.push(BUL('계정 생애주기 관리 — 계정의 생성·비활성화·삭제를 관리자 화면에서 이력과 함께 처리'));
body.push(BUL('자기 검증 원칙 — 자체 개발 시스템의 오류(시각 9시간 오차)를 스스로 발견·수정. 내부 산출물도 검증 대상에서 예외를 두지 않음'));

body.push(H3('다.  윤리경영 및 협력사 관리'));
body.push(P('외부에서 납품받은 검사시스템의 데이터를 자체 검증한 결과, 기록된 결함의 상당수가 실제 측정값이 아닌 시험용 데이터였으며 두께 측정 기능은 표본 전부에서 미작동 상태임을 확인하였습니다. 당사는 이를 근거로 협력사 납품물에 대한 검수 체계를 신설하였습니다.'));
body.push(P('납품받은 시스템을 무조건 신뢰하지 않고 데이터 수준에서 검증하는 원칙은, 고객사에 제공하는 품질 리포트의 신뢰성을 담보하기 위한 전제이기도 합니다.'));

body.push(H3('라.  고객 대상 투명성'));
body.push(BUL('품질 근거 공개 — 고객 요청 시 해당 코일의 가공 조건·작업 중단 여부·표면 검사 결과를 근거 자료로 제공'));
body.push(BUL('귀책 구분의 객관화 — 원소재 결함과 가공 결함을 데이터로 구분하여, 분쟁을 주장이 아닌 기록으로 해소'));
body.push(BUL('진행 상황 공개 — 고객이 자사 물량의 공정 진행 상황을 직접 조회할 수 있는 포털 운영 (실서비스 전환 추진 중)'));

body.push(new Paragraph({ children: [new PageBreak()] }));

// ── 보완 필요 항목 + 체크리스트 ──────────────────────
body.push(H1('부록  ·  제출 전 확인 사항'));

body.push(H2('1.  보완 필요 항목  (회사 확정 정보 기입 필요)'));
const N = [700, 3600, 5700];
body.push(TBL([
  new TableRow({ children: [
    tcell('No', { w: N[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('항목', { w: N[1], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('필요 사유 및 출처', { w: N[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
  ]}),
  ...[['1', '매출액 · 순이익 (2023~2025)', '기업개요 필수 기재. 경영성과(80점) 항목의 핵심 근거. → 결산 재무제표'],
      ['2', '종업원수 (2023~2024)', '고용 창출 성과 입증. → 원천징수이행상황신고서'],
      ['3', '불량률 · 클레임 건수 (도입 전후)', '경영성과 최고 배점 항목의 정량 근거. 현재 "사실상 소멸"로 서술되어 있으나 수치 제시 시 설득력 대폭 상승'],
      ['4', '2차 AI 품질측정 수상 내역', '정확한 상훈 명칭·주최기관·수상연도. 기술력 입증 자료'],
      ['5', '1차 설비 투자 내역', '투자 시기·설비명·투자액. 추진배경의 구체성 확보'],
      ['6', '사업자등록번호 · 소재지 · 대표자', '신청서 필수 기재사항'],
      ['7', '담당 임원 · 실무 담당자 정보', '신청서 필수 기재사항'],
      ['8', '스크랩 발생·재활용 실적', 'E(환경) 항목의 정량 근거. → 고철 판매 기록'],
      ['9', '산업재해 발생 건수', 'S(사회) 항목. 무재해 기록 보유 시 강력한 근거'],
      ['10', '환경·안전 관련 인증 보유 여부', 'ISO 14001, ISO 45001 등 보유 시 기재']]
    .map(([a, b, c]) => new TableRow({ children: [
      tcell(a, { w: N[0], b: true, align: AlignmentType.CENTER }),
      tcell(b, { w: N[1], b: true }), tcell(c, { w: N[2], sz: 18 }),
    ]})),
], N));

body.push(H2('2.  제출 서류 체크리스트'));
const CK = [700, 4600, 4700];
body.push(TBL([
  new TableRow({ children: [
    tcell('확인', { w: CK[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('제출 서류', { w: CK[1], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('제출 방법 및 비고', { w: CK[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
  ]}),
  ...[['☐', '참가신청서 1부', '본 문서 [첨부1] — 대표이사 직인 날인 필요'],
      ['☐', '회사개요 1부', '본 문서 [첨부2] — 재무·고용 수치 기입 필요'],
      ['☐', '활동사례 및 성과 소개자료 (자유양식)', '파워포인트 30장 내외 → 기제작 발표자료 v6(36장) 활용 가능. 30장 내외로 조정 권장'],
      ['☐', '사업자등록증 1부', '사본'],
      ['☐', '최근 3년 결산 재무제표 (연도별)', '2023 · 2024 · 2025년 각 1부'],
      ['☐', '원천징수이행상황신고서 (최근 3년)', '연도별 각 1부 — 상시 근로자 확인용']]
    .map(([a, b, c]) => new TableRow({ children: [
      tcell(a, { w: CK[0], b: true, align: AlignmentType.CENTER, sz: 22 }),
      tcell(b, { w: CK[1], b: true }), tcell(c, { w: CK[2], sz: 18 }),
    ]})),
], CK));

body.push(H2('3.  접수 정보 및 일정'));
const AC = [2600, 7400];
body.push(TBL([
  ...[['응모 마감', '2026. 9. 23.(수)  —  잔여 기간 확인 후 일정 관리 필요'],
      ['제출 방법', '전체 서류 이메일 전송 + 인쇄본 10부 우편·방문 제출'],
      ['접수처', '대한상공회의소 회원CEO팀 유현주 연구원'],
      ['주소', '서울특별시 중구 세종대로 39 상공회의소회관 19층 (우) 04513'],
      ['연락처', '02-6050-3422  /  hjyu@korcham.net'],
      ['심사 절차', '1차 서류심사 → 2차 종합심사(서류 통과 6개사 대상 대면 PT 및 질의응답)'],
      ['시상', '대통령상 · 국무총리상 · 산업통상부장관상 · 대한상공회의소회장상'],
      ['시상식', '2026년 12월 중 예정']]
    .map(([a, b]) => new TableRow({ children: [
      tcell(a, { w: AC[0], b: true, fill: HEAD }), tcell(b, { w: AC[1] }),
    ]})),
], AC));

body.push(H2('4.  심사 배점 대비 대응 현황'));
const SC = [2400, 1500, 1500, 4600];
body.push(TBL([
  new TableRow({ children: [
    tcell('심사 항목', { w: SC[0], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('1차', { w: SC[1], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('2차', { w: SC[2], b: true, fill: HEAD, align: AlignmentType.CENTER }),
    tcell('대응 상태', { w: SC[3], b: true, fill: HEAD, align: AlignmentType.CENTER }),
  ]}),
  ...[['추진배경 및 목표설정', '30', '35', '작성 완료 — 두 차례 실패를 배경으로 서술'],
      ['추진방향 및 세부내용', '30', '35', '작성 완료 — 4개 질문 · AI 6개 유형'],
      ['실천사례 및 참여도', '50', '60', '작성 완료 — 41개 서비스 · 상향식 참여'],
      ['경영성과', '80', '100', '정성 성과 완료 / 재무·불량률 수치 보완 필요'],
      ['향후 추진계획', '30', '45', '작성 완료 — 3단계 계획 · 산업 확산'],
      ['환경 (E)', '65', '80', '작성 완료 / 스크랩·인증 실적 보완 시 강화'],
      ['사회 (S)', '65', '80', '작성 완료 — 외국인 근로자 사례가 핵심'],
      ['지배구조 (G)', '50', '65', '작성 완료 — 협력사 검증 사례 포함']]
    .map(([a, b, c, e], i) => new TableRow({ children: [
      tcell(a, { w: SC[0], b: true, fill: i === 3 ? GOLDBG : undefined }),
      tcell(b, { w: SC[1], align: AlignmentType.CENTER, fill: i === 3 ? GOLDBG : undefined }),
      tcell(c, { w: SC[2], align: AlignmentType.CENTER, fill: i === 3 ? GOLDBG : undefined }),
      tcell(e, { w: SC[3], sz: 18, fill: i === 3 ? GOLDBG : undefined }),
    ]})),
  new TableRow({ children: [
    tcell('합계', { w: SC[0], b: true, fill: TINT }),
    tcell('400', { w: SC[1], b: true, fill: TINT, align: AlignmentType.CENTER }),
    tcell('600', { w: SC[2], b: true, fill: TINT, align: AlignmentType.CENTER }),
    tcell('ESG 부문이 1차 400점 중 180점(45%)을 차지하므로 소홀히 다룰 수 없음', { w: SC[3], b: true, fill: TINT, sz: 18 }),
  ]}),
], SC));

// ── 문서 생성 ────────────────────────────────────────
const doc = new Document({
  creator: '오성철강',
  title: '제33회 기업혁신대상 신청서 — 오성철강',
  numbering: {
    config: [{
      reference: 'bul',
      levels: [
        { level: 0, format: d.LevelFormat.BULLET, text: '·', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: convertInchesToTwip(0.26), hanging: convertInchesToTwip(0.18) } } } },
        { level: 1, format: d.LevelFormat.BULLET, text: '-', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: convertInchesToTwip(0.52), hanging: convertInchesToTwip(0.18) } } } },
      ],
    }],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },       // A4
        margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
      },
    },
    children: body,
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = process.argv[2] || '오성철강_기업혁신대상_신청서.docx';
  fs.writeFileSync(out, buf);
  console.log('✅ 완료: ' + out);
}).catch(e => { console.error('❌ 실패:', e); process.exit(1); });
