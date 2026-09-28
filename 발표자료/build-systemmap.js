// 별첨 · 오성철강 ERP 2.0 + 연구실 전체 기능 한 장 (흰 배경)
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = '오성철강 ERP 2.0 · 연구실 전체 기능 맵';

const F='맑은 고딕', P=0.72, W=11.89;
const WHITE='FFFFFF', LINE='E4E9F0', HAIR='EEF2F7', TINT='F8FAFC',
      INK='0B1220', INK2='3B4657', GRAY='6B7688', GRAY2='9AA4B2',
      NAVY='0B1220', SOFT='C9D2DF',
      BLU='0E6BA8', BLUL='EAF3FA', BLUB='B9D7EA', BLUS='38BDF8',
      IND='4F46E5', INDL='EEF0FF', INDB='CBCEFB',
      GRN='047857', GRNL='ECFDF5', GRNB='A7E8CD',
      GOLD='B8860B', GOLDL='FFFAEB', GOLDB='F2DDA4', GOLDS='F5B544';

function T(s,t,o={}){ s.addText(t,{fontFace:F,color:o.color||INK2,valign:o.valign||'top',
  lineSpacingMultiple:o.lsm||1.14,...o}); }
function card(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:o.r||0.09,
  fill:{color:o.fill||WHITE},
  line:o.line===null?{type:'none'}:{color:o.line||LINE,width:o.lw!==undefined?o.lw:1.3}}); }
function rct(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.rect,{x,y,w,h,fill:{color:o.fill||WHITE},
  line:o.line?{color:o.line,width:o.lw||1.2}:{type:'none'}}); }
function pill(s,x,y,w,t,fg,bg,o={}){
  s.addText(t,{x,y,w,h:o.h||0.26,fontSize:o.fs||10,bold:true,color:fg,fill:{color:bg},
    line:o.bd?{color:o.bd,width:1.1}:{type:'none'},align:'center',valign:'middle',
    fontFace:F,shape:pptx.ShapeType.roundRect,rectRadius:0.12});
}

const s=pptx.addSlide();

/* ───────── 헤드 ───────── */
T(s,'APPENDIX  ·  SYSTEM MAP',{x:P,y:0.36,w:7,h:0.28,fontSize:11.5,bold:true,
  color:GRAY2,charSpacing:3.6});
rct(s,P,0.74,W,0.014,{fill:INK});
T(s,[{text:'오성철강이 ',options:{color:INK}},{text:'직접 만들어 쓰는 시스템',options:{color:IND}},
     {text:',  한 장 요약',options:{color:INK}}],
  {x:P,y:0.86,w:W,h:0.50,fontSize:30,bold:true});

/* ───────── KPI 4칸 ───────── */
const KY=1.50, KH=0.70, kg=0.26, kw=(W-3*kg)/4;
[['54','전체 화면 · 서비스',INK],
 ['41','연구실 프로토타입',IND],
 ['28','실데이터 연동',GRN],
 ['3','접속 채널',BLU]].forEach(([n,lb,c],i)=>{
  const x=P+i*(kw+kg);
  card(s,x,KY,kw,KH,{fill:TINT,line:LINE,lw:1.2});
  rct(s,x,KY,0.075,KH,{fill:c});
  T(s,n,{x:x+0.22,y:KY+0.05,w:0.86,h:0.60,fontSize:29,bold:true,color:c,valign:'middle'});
  T(s,lb,{x:x+1.04,y:KY,w:kw-1.24,h:KH,fontSize:11.5,bold:true,color:INK2,valign:'middle'});
});

/* ───────── 본문 2단 ───────── */
const BY=2.36, BH=3.28, LW=4.44, RX=P+LW+0.34, RW=W-LW-0.34, HD=0.46;

/* ── 좌 : ERP 2.0 운영 시스템 */
card(s,P,BY,LW,BH,{fill:BLUL,line:BLUB,lw:1.5});
card(s,P,BY,LW,HD,{fill:BLU,line:null,r:0.09});
rct(s,P,BY+0.28,LW,HD-0.28,{fill:BLU});
T(s,'ERP 2.0  ·  매일 쓰는 운영 시스템',
  {x:P+0.26,y:BY,w:LW-0.52,h:HD,fontSize:13.5,bold:true,color:WHITE,valign:'middle'});

const LR=[
  ['워크플로우 관리','2','입고 FAX 리포트 · 작업일보'],
  ['매출 관리','2','영업 워크플로우 · 스크랩 매출'],
  ['비용 관리','2','지출결의서 · 일계표'],
  ['대표님 경영보고','5','데일리 · 월간 · 브리핑 · 카톡요약 · 접속로그'],
  ['고객사 포털 · 계정','2','거래처 조회 화면 · 계정 관리'],
];
const lx=P+0.22, lw2=LW-0.44, rh=0.46, rg=0.06;
LR.forEach(([tt,n,d],i)=>{
  const y=BY+HD+0.12+i*(rh+rg);
  card(s,lx,y,lw2,rh,{fill:WHITE,line:BLUB,lw:1.1});
  T(s,tt,{x:lx+0.18,y:y+0.055,w:lw2-0.80,h:0.24,fontSize:12.5,bold:true,color:INK});
  T(s,d,{x:lx+0.18,y:y+0.265,w:lw2-0.40,h:0.20,fontSize:9.5,color:GRAY});
  pill(s,lx+lw2-0.66,y+0.09,0.48,n,WHITE,BLU,{fs:10.5,h:0.25});
});

/* ── 우 : 오성철강 연구실 */
card(s,RX,BY,RW,BH,{fill:INDL,line:INDB,lw:1.5});
card(s,RX,BY,RW,HD,{fill:IND,line:null,r:0.09});
rct(s,RX,BY+0.28,RW,HD-0.28,{fill:IND});
T(s,'오성철강 연구실  ·  먼저 만들어 보고, 되는 것만 서비스로',
  {x:RX+0.26,y:BY,w:RW-0.52,h:HD,fontSize:13.5,bold:true,color:WHITE,valign:'middle'});

const CAT=[
  ['생산현장 도구','28','레벨링·슬리터 관제, AI 헬퍼',true],
  ['주문접수 자동화','5','FAX · 카카오톡 · OCR 접수',false],
  ['고객사 시연','2','주문 트래커 · 고객 챗봇',false],
  ['경영 · 재무','2','계좌 손익 · 입금 확인',false],
  ['창고 관리','1','코일창고 3D 뷰어',false],
  ['설비 진단','1','장애 원인 분석 (AI)',false],
  ['영업 지원','1','영업대상 고객사 리스트',false],
  ['시스템 연동','1','대시보드 자동연동 감시',false],
];
const cx0=RX+0.24, ciw=RW-0.48, cg=0.20, cw2=(ciw-cg)/2, ch=0.61, cvg=0.06;
CAT.forEach(([tt,n,d,hot],i)=>{
  const col=i%2, row=(i-col)/2;
  const x=cx0+col*(cw2+cg), y=BY+HD+0.12+row*(ch+cvg);
  card(s,x,y,cw2,ch,{fill:hot?IND:WHITE,line:hot?IND:INDB,lw:hot?0:1.1});
  T(s,n,{x:x+0.08,y:y+0.06,w:0.82,h:0.48,fontSize:hot?24:21,bold:true,
    color:hot?WHITE:IND,valign:'middle',align:'center'});
  T(s,tt,{x:x+0.96,y:y+0.10,w:cw2-1.10,h:0.24,fontSize:12.5,bold:true,
    color:hot?WHITE:INK});
  T(s,d,{x:x+0.96,y:y+0.335,w:cw2-1.10,h:0.22,fontSize:9,color:hot?INDB:GRAY});
});

/* ───────── 기반 밴드 ───────── */
rct(s,0,5.78,13.333,1.12,{fill:NAVY});
rct(s,0,5.78,13.333,0.05,{fill:GOLDS});
T(s,[{text:'그린ERP 데이터를 10분마다 가져와,  ',options:{color:WHITE}},
     {text:'54개 화면이 모두 같은 실데이터로 움직입니다',options:{color:GOLDS}}],
  {x:0,y:5.94,w:13.333,h:0.42,fontSize:21,bold:true,align:'center'});
T(s,'현장 태블릿 · 고객사 포털 · 대표님 보고까지  —  외주 없이 회사 안에서 직접 만들었습니다',
  {x:0,y:6.44,w:13.333,h:0.30,fontSize:13.5,color:SOFT,align:'center'});

T(s,'별첨  ·  전체 기능 맵',{x:P,y:7.04,w:6,h:0.24,fontSize:10,bold:true,
  color:GRAY2,charSpacing:1.8});
T(s,'오성철강',{x:P+W-3,y:7.04,w:3,h:0.24,fontSize:10,bold:true,
  color:GRAY2,align:'right',charSpacing:1.4});

pptx.writeFile({ fileName: process.argv[2] || '오성철강_전체기능맵.pptx' })
  .then(f=>console.log('✅ 완료: '+f))
  .catch(e=>{ console.error('❌', e); process.exit(1); });
