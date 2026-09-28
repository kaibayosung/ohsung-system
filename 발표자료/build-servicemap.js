// 별첨 · 오성철강 서비스 맵 (54개 전체 이름) — 1장 · 흰 배경
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = '오성철강 서비스 맵';

const F='맑은 고딕', P=0.60, W=12.13;
const WHITE='FFFFFF', LINE='E4E9F0', HAIR='EEF2F7', TINT='F8FAFC',
      INK='0B1220', INK2='3B4657', GRAY='6B7688', GRAY2='9AA4B2',
      NAVY='0B1220', SOFT='C9D2DF',
      BLU='0E6BA8', BLUL='F2F8FC',
      IND='4F46E5', INDL='F5F5FF',
      GOLD='B8860B', GOLDL='FFFCF2', GOLDS='F5B544',
      GRN='047857', GRNL='F3FBF7',
      SLATE='475569', SLATEL='F7F9FB';

function T(s,t,o={}){ s.addText(t,{fontFace:F,color:o.color||INK2,valign:o.valign||'top',
  lineSpacingMultiple:o.lsm||1.0,...o}); }
function card(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:o.r||0.07,
  fill:{color:o.fill||WHITE},
  line:o.line===null?{type:'none'}:{color:o.line||LINE,width:o.lw!==undefined?o.lw:1.2}}); }
function rct(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.rect,{x,y,w,h,fill:{color:o.fill||WHITE},
  line:o.line?{color:o.line,width:o.lw||1.2}:{type:'none'}}); }
function ell(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.ellipse,{x,y,w,h,
  fill:{color:o.fill||WHITE},line:o.line?{color:o.line,width:o.lw||1}:{type:'none'}}); }

const s=pptx.addSlide();

/* ───────── 헤드 ───────── */
T(s,'APPENDIX  ·  SERVICE MAP',{x:P,y:0.30,w:6,h:0.26,fontSize:11,bold:true,
  color:GRAY2,charSpacing:3.4});
rct(s,P,0.66,W,0.014,{fill:INK});
T(s,[{text:'오성철강이 쓰는 ',options:{color:INK}},
     {text:'54개 서비스',options:{color:IND}},
     {text:',  이름까지 전부',options:{color:INK}}],
  {x:P,y:0.80,w:7.40,h:0.44,fontSize:25,bold:true});

/* 범례 */
const LG=[['실데이터 동작 38',GRN],['현장 배포 2',GOLDS],['시범 · 준비 11',GRAY2]];
let lgx=P+7.90;
LG.forEach(([t,c])=>{
  ell(s,lgx,0.94,0.11,0.11,{fill:c});
  T(s,t,{x:lgx+0.17,y:0.89,w:1.30,h:0.22,fontSize:9,bold:true,color:GRAY,valign:'middle'});
  lgx+=1.50;
});

/* ───────── 섹션 렌더러 ───────── */
const RH=0.28, HH=0.35, PADB=0.11;
function section(x,y,w,title,c,bg,items){
  const h=HH+items.length*RH+PADB;
  card(s,x,y,w,h,{fill:bg,line:LINE,lw:1.2});
  card(s,x,y,w,HH,{fill:c,line:null,r:0.07});
  rct(s,x,y+0.18,w,HH-0.18,{fill:c});
  T(s,title,{x:x+0.16,y:y,w:w-0.74,h:HH,fontSize:10.5,bold:true,color:WHITE,valign:'middle'});
  T(s,String(items.length),{x:x+w-0.56,y:y,w:0.42,h:HH,fontSize:10.5,bold:true,
    color:WHITE,valign:'middle',align:'right'});
  items.forEach(([nm,st],i)=>{
    const ry=y+HH+0.055+i*RH;
    ell(s,x+0.17,ry+0.09,0.10,0.10,{fill:st==='L'?GRN:st==='D'?GOLDS:GRAY2});
    T(s,nm,{x:x+0.36,y:ry,w:w-0.50,h:RH,fontSize:10.5,color:INK,valign:'middle'});
  });
  return y+h+0.16;
}

const GAP=0.22, colw=(W-3*GAP)/4;
const CX=[P, P+colw+GAP, P+2*(colw+GAP), P+3*(colw+GAP)];
const Y0=1.52;

/* COL 1 — 레벨링 */
let y=Y0;
y=section(CX[0],y,colw,'레벨링 라인  ·  관제 / 분석',BLU,BLUL,[
  ['레벨링 라인 통합 관제 (NMS)','L'],
  ['레벨링 공정×ERP 대시보드','L'],
  ['레벨링 공정 현황 모니터링','L'],
  ['레벨링 통합 타임라인','L'],
  ['레벨링 코일 상세분석','L'],
  ['레벨링 PLC 상세 조회','L'],
  ['레벨링 실시간 HMI 미러','L'],
]);
y=section(CX[0],y,colw,'언코일러 텐션  ·  AI 인식',BLU,BLUL,[
  ['PR-DTC-3100 실시간 인식','L'],
  ['텐션 데이터 수신 확인','L'],
  ['테이퍼 텐션 원격 모니터링','S'],
  ['레벨링 작업 가이드 (외국인)','S'],
  ['AI 인식 검증 (개발용)','S'],
]);

/* COL 2 — 슬리터 · 작업현황 */
y=Y0;
y=section(CX[1],y,colw,'슬리터  ·  세퍼레이터',IND,INDL,[
  ['세퍼레이터 태블릿 키오스크','D'],
  ['세퍼레이터 셋팅 계산기','S'],
  ['AI 헬퍼 (지난작업 보기)','L'],
  ['AI 헬퍼 (작업용 실시간)','L'],
  ['AI 헬퍼 모바일 (KR / EN)','L'],
  ['슬리터2 운행 모니터 (KR / EN)','L'],
  ['슬리터1/2 배정 변경 (KR / EN)','L'],
  ['코일 작업 상세 분석','L'],
]);
y=section(CX[1],y,colw,'작업현황  ·  현장 조회',IND,INDL,[
  ['작업현황 대시보드','L'],
  ['작업현황 대시보드 2','L'],
  ['작업현황 대시보드 3','L'],
  ['작업 확인 (거래처별 검색)','L'],
  ['원자재 코일 검색 (발주 매칭)','L'],
]);

/* COL 3 — 주문접수 · 고객 */
y=Y0;
y=section(CX[2],y,colw,'주문접수 자동화',GOLD,GOLDL,[
  ['신규서비스 통합흐름 (v2)','S'],
  ['FAX 작업요청서 접수','S'],
  ['카카오톡 주문접수','S'],
  ['OCR 문서인식','S'],
  ['현장 코일확정 (지게차)','S'],
]);
y=section(CX[2],y,colw,'고객사  ·  창고  ·  영업',GOLD,GOLDL,[
  ['코일창고 3D 뷰어 · 출고관리','D'],
  ['고객 주문 현황 트래커','L'],
  ['고객사 챗봇 (대한강재)','L'],
  ['영업대상 고객사 리스트','L'],
]);
y=section(CX[2],y,colw,'설비 진단  ·  시스템 연동',SLATE,SLATEL,[
  ['장애 원인 분석 (AI)','S'],
  ['대시보드 자동연동 모니터링','L'],
]);

/* COL 4 — ERP 2.0 */
y=Y0;
y=section(CX[3],y,colw,'ERP 2.0  ·  운영 화면',NAVY,TINT,[
  ['입고 FAX 리포트','L'],
  ['작업일보','L'],
  ['영업 워크플로우','L'],
  ['스크랩 매출','L'],
  ['지출결의서','L'],
  ['일계표','L'],
  ['데일리 리포트','L'],
  ['월간 분석','L'],
  ['대표님 브리핑','L'],
  ['카톡용 일일 요약','L'],
  ['접속 로그','L'],
  ['고객사 포털','L'],
  ['계정 관리','L'],
]);
y=section(CX[3],y,colw,'경영  ·  재무',GRN,GRNL,[
  ['계좌 손익 통합 대시보드','L'],
  ['거래명세서 입금 확인','S'],
]);

/* ───────── 푸터 ───────── */
rct(s,P,7.00,W,0.014,{fill:LINE});
T(s,'별첨  ·  서비스 맵      ERP 2.0 운영 13  +  오성철강 연구실 41  =  54    (영문판 3종은 한국어판과 한 줄로 표기)',
  {x:P,y:7.10,w:9,h:0.24,fontSize:9.5,bold:true,color:GRAY2,charSpacing:1.0});
T(s,'오성철강',{x:P+W-3,y:7.10,w:3,h:0.24,fontSize:9.5,bold:true,
  color:GRAY2,align:'right',charSpacing:1.2});

pptx.writeFile({ fileName: process.argv[2] || '오성철강_서비스맵.pptx' })
  .then(f=>console.log('✅ 완료: '+f))
  .catch(e=>{ console.error('❌', e); process.exit(1); });
