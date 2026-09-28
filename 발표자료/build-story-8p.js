// 오성철강 — 「자체개발형 AI 모델공장」 스토리 발표자료 (8장)
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = '오성철강 — 자체개발형 AI 모델공장';

const F='맑은 고딕', P=0.72, W=11.89;
const NAVY='0B1220', DEEP='101B31', PANEL='121D33', PANEL2='16233C', EDGE='2A3A55',
      INK='0F172A', INK2='334155', GRAY='64748B', GRAY2='94A3B8',
      LINE='E2E8F0', TINT='F8FAFC', WHITE='FFFFFF', SOFT='CBD5E1',
      IND='4F46E5', INDL='EEF0FF', INDB='C7CBFF',
      GOLD='F5B544', GOLDL='FFF8E8', GOLDB='FBD88B', GOLDD='1A1406',
      RED='DC2626', REDL='FEF2F2', REDB='FCA5A5',
      GRN='059669', GRNL='ECFDF5', GRNB='6EE7B7',
      VIO='7C3AED', VIOL='F5F3FF', VIOB='C4B5FD',
      BLU='0284C7', BLUL='E0F2FE', BLUB='7DD3FC';

let _n=0;
function base(dark){ const s=pptx.addSlide(); if(dark) s.background={color:NAVY}; _n++; return s; }
function T(s,t,o={}){ s.addText(t,{fontFace:F,color:o.color||INK2,valign:o.valign||'top',
  lineSpacingMultiple:o.lsm||1.32,...o}); }
function card(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:o.r||0.08,
  fill:{color:o.fill||WHITE},
  line:o.line===null?{type:'none'}:{color:o.line||LINE,width:o.lw!==undefined?o.lw:1.4}}); }
function rct(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.rect,{x,y,w,h,fill:{color:o.fill||WHITE},
  line:o.line?{color:o.line,width:o.lw||1.4}:{type:'none'}}); }
function bar(s,x,y,w,h,c,r=0.06){ s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:r,
  fill:{color:c},line:{type:'none'}}); }
function ell(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.ellipse,{x,y,w,h,
  fill:{color:o.fill||WHITE},line:o.line?{color:o.line,width:o.lw||1.4}:{type:'none'}}); }
function arw(s,x1,y1,x2,y2,c=GRAY2,w=2){
  s.addShape(pptx.ShapeType.line,{x:Math.min(x1,x2),y:Math.min(y1,y2),
    w:Math.abs(x2-x1)||0.008,h:Math.abs(y2-y1)||0.008,
    line:{color:c,width:w,endArrowType:'triangle'},flipH:x2<x1,flipV:y2<y1});
}
function pill(s,x,y,w,t,fg,bg,o={}){
  s.addText(t,{x,y,w,h:o.h||0.28,fontSize:o.fs||10,bold:true,color:fg,fill:{color:bg},
    line:o.bd?{color:o.bd,width:1.2}:{type:'none'},align:'center',valign:'middle',
    fontFace:F,shape:pptx.ShapeType.roundRect,rectRadius:0.13});
}
function head(s,kicker,runs,o={}){
  const acc=o.acc||IND, dark=o.dark;
  rct(s,P,0.62,0.055,0.26,{fill:acc});
  T(s,kicker,{x:P+0.20,y:0.58,w:9,h:0.30,fontSize:11.5,bold:true,color:acc,charSpacing:1.6});
  if(o.sub) T(s,o.sub,{x:P,y:0.98,w:W,h:0.28,fontSize:12.5,color:dark?GRAY2:GRAY});
  T(s,runs,{x:P,y:o.sub?1.28:1.04,w:W,h:0.60,fontSize:o.size||27,bold:true,
    color:dark?WHITE:INK,lsm:1.12});
}
function band(s,y,runs,o={}){
  card(s,P,y,W,o.h||0.80,{fill:o.fill||NAVY,line:o.line||null,lw:o.lw,r:0.09});
  T(s,runs,{x:P+0.30,y,w:W-0.60,h:o.h||0.80,fontSize:o.fs||16,bold:true,
    align:'center',valign:'middle'});
}
function foot(s,sec,dark){
  rct(s,P,6.94,W,0.012,{fill:dark?EDGE:LINE});
  T(s,sec,{x:P,y:7.02,w:6,h:0.26,fontSize:9.5,bold:true,color:dark?GRAY:GRAY2,charSpacing:1.4});
  T(s,'오성철강  ·  '+_n,{x:P+W-3,y:7.02,w:3,h:0.26,fontSize:9.5,bold:true,
    color:dark?GRAY:GRAY2,align:'right',charSpacing:1.2});
}

/* ═══════════ 1 · 표지 ═══════════ */
{
const s=base(true);
rct(s,0,0,13.333,7.5,{fill:NAVY});
rct(s,0,0,0.30,7.5,{fill:GOLD});
T(s,'1983  —  2026',{x:P+0.30,y:1.30,w:8,h:0.32,fontSize:13,bold:true,color:GOLD,charSpacing:3.0});
T(s,'1983년, 우리는 경기장을 지었습니다',
  {x:P+0.30,y:2.10,w:11.2,h:0.80,fontSize:40,bold:true,color:WHITE});
T(s,'2026년, 우리를 다시 짓습니다',
  {x:P+0.30,y:3.00,w:11.2,h:0.80,fontSize:40,bold:true,color:GOLD});
rct(s,P+0.30,4.14,3.20,0.014,{fill:EDGE});
T(s,'전통 제조업에서 제조 서비스 회사로  —  「자체개발형 AI 모델공장」 시범 지정 요청',
  {x:P+0.30,y:4.40,w:11.0,h:0.34,fontSize:15,color:SOFT});
const ST=[['1983','창립 · 잠실 주경기장'],['43년','제조 현장'],['28년','AI · ROBOT · IT'],['41개','자체 개발 서비스']];
const sw=(11.2-3*0.30)/4;
ST.forEach(([n,l],i)=>{
  const x=P+0.30+i*(sw+0.30);
  rct(s,x,5.40,0.045,0.62,{fill:GOLD});
  T(s,n,{x:x+0.18,y:5.38,w:sw-0.18,h:0.38,fontSize:21,bold:true,color:WHITE});
  T(s,l,{x:x+0.18,y:5.80,w:sw-0.18,h:0.26,fontSize:10.5,color:GRAY2});
});
}

/* ═══════════ 2 · 창립 · 28년 만의 귀환 ═══════════ */
{
const s=base();
head(s,'FOUNDED 1983  ·  THE LONG WAY HOME',
  [{text:'1983년 경기장을 지으며 창립했고, ',options:{}},
   {text:'저는 28년 만에 돌아왔습니다',options:{color:IND}}],
  {sub:'짓는 일로 시작한 회사입니다'});

// 상단 · 창립
const AY=2.00, AH=1.52, LWd=4.30;
card(s,P,AY,LWd,AH,{fill:TINT});
ell(s,P+0.26,AY+0.18,1.34,0.86,{fill:WHITE,line:IND,lw:2.2});
ell(s,P+0.52,AY+0.32,0.82,0.58,{fill:INDL,line:INDB,lw:1.1});
T(s,'1983',{x:P+0.52,y:AY+0.47,w:0.82,h:0.26,fontSize:11,bold:true,color:IND,align:'center'});
T(s,'잠실 주경기장 시공',{x:P+1.74,y:AY+0.20,w:LWd-1.94,h:0.30,
  fontSize:13,bold:true,color:INK});
T(s,'오성철강 창립 · 1983년',{x:P+1.74,y:AY+0.50,w:LWd-1.94,h:0.26,fontSize:10.5,color:GRAY});
pill(s,P+1.74,AY+0.86,2.10,'2026 · 리모델링 중',INK,GOLDL,{bd:GOLDB,fs:10.5,h:0.30});

const RX=P+LWd+0.32, RW=W-LWd-0.32;
card(s,RX,AY,RW,AH,{fill:WHITE});
T(s,[{text:'43',options:{fontSize:34}},{text:'년',options:{fontSize:15}}],
  {x:RX+0.30,y:AY+0.30,w:1.7,h:0.56,bold:true,color:IND});
T(s,'그 사이 세상은 바뀌었고,  회사와 기계와 사람은 그대로 오래되었습니다',
  {x:RX+2.00,y:AY+0.22,w:RW-2.30,h:0.28,fontSize:12,color:INK2});
const cw2=(RW-2.00-0.30-0.24)/2;
[['그 경기장은 지금 리모델링 중입니다',GOLD,GOLDL,GOLDB],
 ['오성철강도 새로 태어날 준비를 하고 있습니다',IND,INDL,INDB]].forEach(([t,c,bg,bd],i)=>{
  const x=RX+2.00+i*(cw2+0.24);
  card(s,x,AY+0.60,cw2,0.62,{fill:bg,line:bd,lw:1.3});
  T(s,t,{x:x+0.18,y:AY+0.60,w:cw2-0.36,h:0.62,fontSize:11.5,bold:true,color:INK,valign:'middle'});
});

// 하단 · 귀환
const BY=3.66, BH=1.94, bw=(W-0.36)/2;
const CC=[
  ['ODYSSEUS','오디세우스','20년',GRAY,'334155',
   '많은 모험 끝에 고향으로 돌아왔습니다',
   '그 20년의 노하우로, 떠나기 전보다 더 강력한 왕국을 만들었습니다'],
  ['THE RETURN','저는','28년',IND,IND,
   'KT에서 IT · AI · ROBOT 전문기술을 익혔습니다',
   '43년 된 오성철강과 함께, 제조업과 AI를 결합한 새로운 회사로 거듭나겠습니다'],
];
CC.forEach(([k,who,yr,c,barc,l1,l2],i)=>{
  const x=P+i*(bw+0.36), hot=(i===1);
  card(s,x,BY,bw,BH,{fill:WHITE,line:hot?INDB:LINE,lw:hot?2.2:1.4});
  rct(s,x,BY,bw,0.06,{fill:c});
  T(s,k,{x:x+0.30,y:BY+0.16,w:bw-0.60,h:0.24,fontSize:9.5,bold:true,color:c,charSpacing:1.6});
  T(s,who,{x:x+0.30,y:BY+0.40,w:2.2,h:0.36,fontSize:18,bold:true,color:INK});
  T(s,yr,{x:x+bw-2.5,y:BY+0.34,w:2.2,h:0.44,fontSize:30,bold:true,color:c,align:'right'});
  bar(s,x+0.30,BY+0.88,(bw-0.60)*(i===0?20/28:1),0.22,barc);
  T(s,l1,{x:x+0.30,y:BY+1.14,w:bw-0.60,h:0.26,fontSize:11,color:GRAY});
  T(s,l2,{x:x+0.30,y:BY+1.40,w:bw-0.60,h:0.50,fontSize:11.5,bold:true,color:INK,lsm:1.16});
});
band(s,5.72,[{text:'떠나 있던 시간이 낭비가 아니었던 이유는,  ',options:{color:WHITE}},
             {text:'돌아올 곳이 남아 있었기 때문입니다',options:{color:GOLD}}],{h:0.78});
foot(s,'1. 우리는 왜 여기까지 왔나');
}

/* ═══════════ 3 · 왜 떠나 있었나 (dark) ═══════════ */
{
const s=base(true);
rct(s,0,0,13.333,2.05,{fill:DEEP});
head(s,'WHY I LEFT',
  [{text:'열악한 제조 환경에서는, ',options:{}},{text:'꿈을 꾸기 어려웠습니다',options:{color:REDB}}],
  {dark:true,acc:REDB,sub:'28년 동안 밖을 떠돌았던 이유입니다'});
const CY=2.22, CH=2.52, cw=(W-0.50)/3;
const NO=[
  ['01','공장장 한 사람만','운영할 수 있는 설비',
   ['기준이 사람의 머릿속에만 있었습니다.','그분이 퇴직하면','회사의 기술도 같이 사라집니다.']],
  ['02','우리 회사만 할 수 있는','무기가 없음',
   ['같은 기계, 같은 공정.','단가 말고는 내세울 것이 없는','거래였습니다.']],
  ['03','고객이 체감할 수 있는','서비스가 없음',
   ['무엇을 잘하는지 고객이','볼 방법이 없었습니다.','잘해도 알아주지 않았습니다.']],
];
NO.forEach(([no,t1,t2,dd],i)=>{
  const x=P+i*(cw+0.25);
  card(s,x,CY,cw,CH,{fill:PANEL,line:EDGE,lw:1.4,r:0.09});
  rct(s,x,CY,cw,0.055,{fill:RED});
  pill(s,x+0.26,CY+0.26,0.62,no,WHITE,RED,{fs:10});
  T(s,t1,{x:x+0.26,y:CY+0.70,w:cw-0.52,h:0.32,fontSize:15,bold:true,color:WHITE});
  T(s,t2,{x:x+0.26,y:CY+1.02,w:cw-0.52,h:0.32,fontSize:15,bold:true,color:WHITE});
  rct(s,x+0.26,CY+1.44,cw-0.52,0.012,{fill:EDGE});
  dd.forEach((ln,k)=>
    T(s,ln,{x:x+0.26,y:CY+1.58+k*0.26,w:cw-0.52,h:0.26,fontSize:10.5,color:GRAY2}));
});
band(s,5.14,[{text:'이 모든 것이 불가능했기 때문에,  ',options:{color:WHITE}},
             {text:'오성철강은 늙어갔고 작아져 갔습니다',options:{color:REDB}}],
  {h:1.00,fill:'1A0A0A',line:RED,lw:1.8,fs:19});
foot(s,'1. 우리는 왜 여기까지 왔나',true);
}

/* ═══════════ 4 · AI가 바꾸기 시작했다 ═══════════ */
{
const s=base();
head(s,'AND THEN, AI',
  [{text:'AI가 이 셋을 ',options:{}},{text:'하나씩 바꾸기 시작했습니다',options:{color:GRN}}],
  {acc:GRN,sub:'구호가 아니라, 현장에서 매일 열리는 화면으로'});
const CY=2.00, rh=0.86, gy=0.12;
const RW2=[
  ['01','공장장만 아는 설비','화면이 계산하고, 화면이 판정합니다',
   '세퍼레이터 셋팅 키오스크  ·  AI 헬퍼 모바일(KR/EN)  ·  라인 통합관제 NMS'],
  ['02','우리만의 무기가 없음','전수 촬영 · 2초 단위 기록 · AI 판별',
   'AI 표면 전수검사  ·  장애 원인 분석  ·  품질 성적서'],
  ['03','고객이 볼 방법이 없음','24시간 조회 · 발주 · 품질 확인',
   '고객 포털  ·  고객사 챗봇  ·  주문 현황 트래커'],
];
RW2.forEach(([no,bef,aft,svc],i)=>{
  const y=CY+i*(rh+gy);
  card(s,P,y,W,rh,{fill:i%2?TINT:WHITE});
  pill(s,P+0.24,y+0.16,0.56,no,WHITE,GRAY,{fs:9.5});
  T(s,bef,{x:P+0.94,y:y+0.12,w:2.60,h:0.28,fontSize:12.5,bold:true,color:GRAY});
  T(s,'예전',{x:P+0.94,y:y+0.46,w:2.60,h:0.24,fontSize:9,color:GRAY2});
  arw(s,P+3.66,y+rh/2,P+4.08,y+rh/2,GRN,2.2);
  T(s,aft,{x:P+4.24,y:y+0.12,w:3.60,h:0.30,fontSize:14,bold:true,color:GRN});
  T(s,'지금',{x:P+4.24,y:y+0.48,w:3.60,h:0.24,fontSize:9,color:GRN});
  card(s,P+8.02,y+0.14,W-8.26,rh-0.28,{fill:GRNL,line:GRNB,lw:1.2});
  T(s,svc,{x:P+8.18,y:y+0.14,w:W-8.58,h:rh-0.28,fontSize:10,color:INK2,valign:'middle',lsm:1.2});
});

// 국내 유일
const UY=4.96, UH=1.12;
card(s,P,UY,W,UH,{fill:NAVY,line:null,r:0.09});
T(s,[{text:'이로써 우리는, ',options:{color:WHITE}},{text:'꿈을 꿀 수 있게 되었습니다',options:{color:GOLD}}],
  {x:P+0.34,y:UY,w:4.40,h:UH,fontSize:17,bold:true,valign:'middle'});
const bx0=P+4.92, bwu=1.92;
[[bx0,'28년','AI · ROBOT · IT',BLUB],[bx0+bwu+0.46,'43년','제조 현장',GOLDB]].forEach(([x,n,l,c])=>{
  card(s,x,UY+0.20,bwu,UH-0.40,{fill:PANEL2,line:EDGE,lw:1.2});
  T(s,n,{x:x+0.18,y:UY+0.28,w:bwu-0.36,h:0.36,fontSize:19,bold:true,color:c});
  T(s,l,{x:x+0.18,y:UY+0.64,w:bwu-0.36,h:0.24,fontSize:9.5,color:GRAY2});
});
T(s,'+',{x:bx0+bwu,y:UY+0.34,w:0.46,h:0.42,fontSize:20,bold:true,color:GRAY,align:'center'});
T(s,'=',{x:bx0+2*bwu+0.46,y:UY+0.34,w:0.46,h:0.42,fontSize:20,bold:true,color:GRAY,align:'center'});
const ux=bx0+2*bwu+0.92;
card(s,ux,UY+0.20,P+W-ux,UH-0.40,{fill:GOLDD,line:GOLD,lw:1.8});
T(s,'국내 유일',{x:ux,y:UY+0.26,w:P+W-ux,h:0.36,fontSize:19,bold:true,color:WHITE,align:'center'});
T(s,'개발사 없이 직접',{x:ux,y:UY+0.64,w:P+W-ux,h:0.24,fontSize:9.5,
  color:GOLD,align:'center'});

band(s,6.22,[{text:'대한민국 중소 제조업에서 유일하게,  ',options:{color:WHITE}},
             {text:'두 가지를 한 회사 안에 가지고 있습니다',options:{color:GOLD}}],
  {h:0.62,fs:14,fill:PANEL,line:EDGE,lw:1.2});
foot(s,'1. 우리는 왜 여기까지 왔나');
}

/* ═══════════ 5 · AI 프로젝트가 실패하는 이유 ═══════════ */
{
const s=base();
head(s,'WHY AI PROJECTS FAIL',
  [{text:'제조업 대상 AI 프로젝트가 ',options:{}},{text:'실패하는 두 가지 이유',options:{color:RED}}],
  {acc:RED,sub:'기술의 문제가 아니라, 계약 구조의 문제입니다'});
const CY=2.00, CH=2.70, cw=(W-0.35)/2;

// ① 요구사항
card(s,P,CY,cw,CH,{fill:WHITE,line:REDB,lw:1.8});
pill(s,P+0.28,CY+0.20,0.62,'01',WHITE,RED,{fs:10});
T(s,'요구사항 정의가 어렵습니다',{x:P+1.00,y:CY+0.18,w:cw-1.28,h:0.32,
  fontSize:15.5,bold:true,color:INK});
const F1=[['개발 계약',GRAY],['AI는 발견',IND],['기간 제한',GOLD],['혁신 불가',RED]];
let fx=P+0.28;
F1.forEach(([t,c],i)=>{
  const fw=0.108*t.length+0.30;
  pill(s,fx,CY+0.64,fw,t,WHITE,c,{fs:9.5,h:0.28});
  fx+=fw;
  if(i<3){ arw(s,fx+0.03,CY+0.78,fx+0.16,CY+0.78,GRAY2,1.6); fx+=0.19; }
});
['개발사와 제조사는 계약 전에 개발 범위 · 비용 · 일정을 확정합니다.',
 '그러나 AI는 발견을 통해 모델을 구축해야 합니다.',
 '두 회사가 다르면 제한된 기간 안에 프로젝트를 끝내야 하고,',
 '그래서 AI를 통한 혁신 작업 자체가 불가능해집니다.'].forEach((ln,k)=>
  T(s,ln,{x:P+0.28,y:CY+1.10+k*0.32,w:cw-0.56,h:0.32,fontSize:11.5,color:INK2}));

// ② 업그레이드
const X2=P+cw+0.35;
card(s,X2,CY,cw,CH,{fill:WHITE,line:REDB,lw:1.8});
pill(s,X2+0.28,CY+0.20,0.62,'02',WHITE,RED,{fs:10});
T(s,'프로젝트 종료 후 지속 업그레이드',{x:X2+1.00,y:CY+0.18,w:cw-1.28,h:0.32,
  fontSize:15.5,bold:true,color:INK});
['제조 환경은 급속하게 변하고 있고, 소량 다품종인 중소 제조업 시장에',
 '하나의 솔루션으로 모든 게 해결되는 것은 불가능합니다.',
 '계약 후 업그레이드를 하려면 추가 계약이 필요하지만',
 '현실적으로 되지 않아, 최적화 작업 자체가 멈춥니다.'].forEach((ln,k)=>
  T(s,ln,{x:X2+0.28,y:CY+0.64+k*0.30,w:cw-0.56,h:0.30,fontSize:11.5,color:INK2}));
const vw=(cw-0.56-0.22)/2;
[['외주 개발 모델','계약 종료 = 정지',GRAY,TINT,LINE],
 ['오성철강 연구실','계속 업그레이드',IND,INDL,INDB]].forEach(([a,b,c,bg,bd],i)=>{
  const x=X2+0.28+i*(vw+0.22);
  card(s,x,CY+1.92,vw,0.64,{fill:bg,line:bd,lw:1.3});
  T(s,a,{x:x+0.18,y:CY+1.98,w:vw-0.36,h:0.22,fontSize:9.5,bold:true,color:c});
  T(s,b,{x:x+0.18,y:CY+2.20,w:vw-0.36,h:0.30,fontSize:14,bold:true,color:c});
});

// 오성철강은 왜 달랐나
const BY=4.84;
card(s,P,BY,W,1.10,{fill:INDL,line:INDB,lw:1.8});
rct(s,P,BY,0.07,1.10,{fill:IND});
T(s,'그런데 오성철강은 왜 성과가 났을까요',{x:P+0.36,y:BY+0.14,w:W-0.72,h:0.28,
  fontSize:12,bold:true,color:IND});
T(s,'개발사와 제조사가 같은 회사이기 때문입니다.  연구실에 40여 개의 서비스를 만들어 하나씩 제조 현장에 적용해 보고,',
  {x:P+0.36,y:BY+0.46,w:W-0.72,h:0.28,fontSize:12,color:INK});
T(s,'현장이 쓰지 않으면 버리고 다시 만들면서 최적의 모델을 찾았습니다.  기간에 쫓기지 않고 발견할 수 있었습니다.',
  {x:P+0.36,y:BY+0.74,w:W-0.72,h:0.28,fontSize:12,color:INK});

band(s,6.12,[{text:'AI 프로젝트는 계약으로 정의할 수 없습니다.  ',options:{color:WHITE}},
             {text:'해보면서 발견하는 수밖에 없습니다',options:{color:GOLD}}],{h:0.70,fs:15});
foot(s,'2. 왜 AI 프로젝트는 실패하는가');
}

/* ═══════════ 6 · Why 오성철강 ═══════════ */
{
const s=base();
head(s,'WHY OHSUNG',
  [{text:'Why ',options:{}},{text:'오성철강',options:{color:IND}},{text:' ?',options:{}}],
  {sub:'개발사 없이, 공장이 직접 만들고 검증하는 구조'});
const CY=2.00, ch=1.66, ch2=1.72, cw=(W-0.32)/2, gy=0.14;
function qcard(x,y,w,h,no,tt,lines,c){
  card(s,x,y,w,h,{fill:WHITE,line:LINE});
  rct(s,x,y,w,0.055,{fill:c});
  pill(s,x+0.26,y+0.22,0.44,no,WHITE,c,{fs:10});
  T(s,tt,{x:x+0.82,y:y+0.20,w:w-1.08,h:0.32,fontSize:15,bold:true,color:INK});
  lines.forEach((ln,k)=>
    T(s,ln,{x:x+0.26,y:y+0.68+k*0.30,w:w-0.52,h:0.30,fontSize:11,color:INK2}));
}
qcard(P,CY,cw,ch,'1','개발사 없이 개발 가능',
  ['43년된 제조 전문가와 28년 경력의 AI/ROBOT 기술 전문가를',
   '보유하고 있어, 개발사와 제조사가 별도로 있어 생기는',
   '분할손 없이 서비스 개발이 가능합니다.'],IND);
qcard(P+cw+0.32,CY,cw,ch,'2','데이터 수집 기반 완료',
  ['3개 공정 중 2개 공정에 Vision 기반 철판 품질 데이터 및',
   'PLC 데이터까지 있어, 품질 · 장비운용 · 가공규격 등',
   'AI를 활용할 수 있는 모든 기반이 완료되어 있습니다.'],BLU);

const Y2=CY+ch+gy;
card(s,P,Y2,cw,ch2,{fill:WHITE,line:LINE});
rct(s,P,Y2,cw,0.055,{fill:VIO});
pill(s,P+0.26,Y2+0.22,0.44,'3',WHITE,VIO,{fs:10});
T(s,'임직원들의 참여 의지',{x:P+0.82,y:Y2+0.20,w:cw-1.08,h:0.32,fontSize:15,bold:true,color:INK});
const mw=(cw-0.52-0.22)/2;
[['12명 중 5명','외국인 직원 참여'],['40여 개','연구실 서비스']].forEach(([a,b],i)=>{
  const x=P+0.26+i*(mw+0.22);
  card(s,x,Y2+0.68,mw,0.62,{fill:VIOL,line:VIOB,lw:1.3});
  T(s,a,{x:x+0.18,y:Y2+0.72,w:mw-0.36,h:0.30,fontSize:15,bold:true,color:VIO});
  T(s,b,{x:x+0.18,y:Y2+1.02,w:mw-0.36,h:0.24,fontSize:10,color:INK2});
});
T(s,'시키지 않아도 현장에서 먼저 요구가 올라옵니다',{x:P+0.26,y:Y2+1.38,w:cw-0.52,h:0.26,
  fontSize:10.5,color:VIO});

const X2=P+cw+0.32;
card(s,X2,Y2,cw,ch2,{fill:NAVY,line:null});
rct(s,X2,Y2,cw,0.055,{fill:GOLD});
pill(s,X2+0.26,Y2+0.22,0.44,'4',NAVY,GOLD,{fs:10});
T(s,'연구실 프로세스 운용으로 최적화',{x:X2+0.82,y:Y2+0.20,w:cw-1.08,h:0.32,
  fontSize:15,bold:true,color:WHITE});
[['아이디어 발굴','AI 개발','상용 적용'],['문제점 도출','서비스 개선','상용 적용']]
 .forEach((row,r)=>{
  let fx=X2+0.26; const fy=Y2+0.70+r*0.36;
  row.forEach((t,i)=>{
    const fw=0.128*t.length+0.34, last=(r===1&&i===2);
    pill(s,fx,fy,fw,t,last?NAVY:WHITE,last?GOLD:PANEL2,{fs:9.5,h:0.28,bd:last?null:EDGE});
    fx+=fw;
    if(i<2){ arw(s,fx+0.04,fy+0.14,fx+0.18,fy+0.14,GRAY,1.6); fx+=0.22; }
  });
});
T(s,'지속적으로 움직이는 이 사이클에서 41개 서비스가 나왔습니다',
  {x:X2+0.26,y:Y2+1.42,w:cw-0.52,h:0.26,fontSize:10.5,color:GOLD});

band(s,5.62,[{text:'솔루션을 사는 공장이 아니라,  ',options:{color:WHITE}},
             {text:'스스로 만들고 스스로 고치는 공장입니다',options:{color:GOLD}}],{h:0.86});
foot(s,'3. Why 오성철강');
}

/* ═══════════ 7 · 요청 ═══════════ */
{
const s=base();
head(s,'OUR REQUEST',
  [{text:'「자체개발형 AI 모델공장」 ',options:{}},{text:'시범 지정을 요청드립니다',options:{color:IND}}],
  {sub:'솔루션을 사주는 지원이 아니라, 공장이 직접 물어볼 수 있는 역량에 투자하는 지원입니다',
   size:27});
const CY=2.14, CH=1.72, cw=(W-0.32)/2;
const RQ=[
  ['국내 유일한 결합','오성철강은 국내에서 유일하게',
   'AI/ROBOT 기술과 제조 기술을 함께 보유한 회사입니다',IND,INDB],
  ['발견 → 투입 → 효과 확인','중소 제조업에 맞는 최적의 AI 기술을 발견하고 공정에 투입하여',
   '효과까지 확인할 수 있는 국내 유일한 회사입니다',GOLD,GOLDB],
];
RQ.forEach(([t,a,b,c,bd],i)=>{
  const x=P+i*(cw+0.32);
  card(s,x,CY,cw,CH,{fill:WHITE,line:bd,lw:2.0});
  rct(s,x,CY,cw,0.06,{fill:c});
  T(s,t,{x:x+0.28,y:CY+0.24,w:cw-0.56,h:0.34,fontSize:16,bold:true,color:INK});
  rct(s,x+0.28,CY+0.68,cw-0.56,0.012,{fill:LINE});
  T(s,a,{x:x+0.28,y:CY+0.84,w:cw-0.56,h:0.30,fontSize:12.5,color:INK2});
  T(s,b,{x:x+0.28,y:CY+1.16,w:cw-0.56,h:0.34,fontSize:13,bold:true,color:c});
});
const FY=4.32;
T(s,'지원해 주시면, 오성철강은 이렇게 씁니다',{x:P,y:FY-0.32,w:6,h:0.26,
  fontSize:11,bold:true,color:GRAY,charSpacing:0.6});
const US=[
  ['전담 인력 2명','데이터를 다룰 한 명,\n현장에 적용할 한 명'],
  ['실증 예산','남은 공정의 품질 측정을 완성하고,\n다른 공장에 이전 가능한 형태로 정리'],
  ['공개 실증장 · 교육','산업단지 안에 상설 견학,\n주변 공장 대상 교육 프로그램 운영'],
];
const uw=(W-2*0.28)/3;
US.forEach(([t,d],i)=>{
  const x=P+i*(uw+0.28);
  card(s,x,FY,uw,1.10,{fill:TINT,line:LINE});
  T(s,t,{x:x+0.24,y:FY+0.14,w:uw-0.48,h:0.28,fontSize:13,bold:true,color:IND});
  d.split('\n').forEach((ln,k)=>
    T(s,ln,{x:x+0.24,y:FY+0.48+k*0.26,w:uw-0.48,h:0.26,fontSize:10.5,color:INK2}));
});
band(s,5.62,[{text:'이에 오성철강이 ',options:{color:WHITE}},
             {text:'많은 발견',options:{color:GOLD}},
             {text:'을 할 수 있도록, 많은 지원 부탁드립니다',options:{color:WHITE}}],
  {h:0.96,fs:19});
foot(s,'4. 요청');
}

/* ═══════════ 8 · 마무리 · 세 개의 꿈 · 감사합니다 (dark) ═══════════ */
{
const s=base(true);
rct(s,0,0,13.333,2.00,{fill:DEEP});
head(s,'CLOSING · 마무리',
  [{text:'오성철강도 전통 제조업에서 ',options:{}},
   {text:'제조 서비스 회사로 다시 짓고 있습니다',options:{color:GOLD}}],
  {dark:true,acc:GOLD,
   sub:'오성철강 창립 때 저희가 수행했던 잠실 올림픽 스타디움도, 지금 다시 짓고 있습니다'});

// 상단 · 리모델링 + 28년
const AY=1.98, AH=1.58, LWd=3.40;
card(s,P,AY,LWd,AH,{fill:PANEL,line:EDGE,lw:1.4});
ell(s,P+1.08,AY+0.14,1.24,0.76,{fill:'1B2740',line:GOLD,lw:2.0});
ell(s,P+1.32,AY+0.27,0.76,0.50,{fill:NAVY,line:'3E4C66',lw:1.1});
T(s,'1983',{x:P+1.32,y:AY+0.39,w:0.76,h:0.26,fontSize:10.5,bold:true,color:GOLD,align:'center'});
T(s,'잠실 올림픽 스타디움  ·  지금 리모델링 중',
  {x:P+0.20,y:AY+0.98,w:LWd-0.40,h:0.26,fontSize:10,color:GRAY2,align:'center'});
T(s,'지었던 회사가,  스스로를 다시 짓습니다',
  {x:P+0.20,y:AY+1.24,w:LWd-0.40,h:0.26,fontSize:10.5,bold:true,color:GOLD,align:'center'});

const RX=P+LWd+0.30, RW=W-LWd-0.30, RXi=RX+0.30;
card(s,RX,AY,RW,AH,{fill:PANEL,line:EDGE,lw:1.4});
const bx=RXi+1.40, BMAX=4.70;
T(s,'오디세우스',{x:RXi,y:AY+0.26,w:1.36,h:0.26,fontSize:11,bold:true,color:GRAY2});
bar(s,bx,AY+0.24,BMAX*20/28,0.28,'334155');
T(s,'20년',{x:bx+BMAX*20/28+0.10,y:AY+0.26,w:0.80,h:0.26,fontSize:12,bold:true,color:GRAY2});
T(s,'그 20년의 노하우로 더 강력한 왕국을 만들었습니다',{x:bx,y:AY+0.58,w:4.2,h:0.24,
  fontSize:9,color:GRAY});
T(s,'저는',{x:RXi,y:AY+0.94,w:1.36,h:0.28,fontSize:12.5,bold:true,color:WHITE});
const SEG=[[1.14,'312E81'],[2.42,IND],[1.14,GOLD]];
let sx=bx;
SEG.forEach(([w,c],i)=>{ bar(s,sx,AY+0.90,w,0.38,c,i===1?0.02:0.06); sx+=w; });
T(s,'28년',{x:bx+BMAX+0.10,y:AY+0.90,w:0.86,h:0.32,fontSize:16,bold:true,color:GOLD});
[['오성을 떠남',0,1.14],['KT · IT / AI / ROBOT',1.14,2.42],['오성으로 돌아옴',3.56,1.14]]
 .forEach(([t,o,w])=>T(s,t,{x:bx+o,y:AY+1.32,w:w,h:0.22,fontSize:8.5,color:GRAY2,align:'center'}));

// 세 개의 꿈
const DY=3.94, dh=1.28, dw=(W-2*0.26)/3;
T(s,'AI는 우리에게 꿈을 꾸게 만들어 주었습니다  —  세 개의 꿈',
  {x:P,y:DY-0.36,w:8,h:0.26,fontSize:11,bold:true,color:GOLD,charSpacing:0.6});
const D=[
  ['외국인 근로자',['전문 엔지니어로 나아갈 수 있는','꿈을 꾸게 해주었고'],VIOB,PANEL2,false],
  ['오성철강',['싸고 저품질 생산이 아니라, 고품질','제조 서비스를 제공할 꿈을 꾸게'],BLUB,PANEL2,false],
  ['4,000곳 이상의 철강 회사',['저희는 더 많은 꿈을 꾸고 싶고,','이 꿈을 같이 꾸게 하고 싶습니다'],GOLD,GOLDD,true],
];
D.forEach(([tt,lines,c,bg,hot],i)=>{
  const x=P+i*(dw+0.26);
  card(s,x,DY,dw,dh,{fill:bg,line:hot?GOLD:EDGE,lw:hot?2.0:1.4,r:0.09});
  rct(s,x,DY,dw,0.055,{fill:c});
  T(s,tt,{x:x+0.24,y:DY+0.20,w:dw-0.48,h:0.32,fontSize:14.5,bold:true,color:hot?GOLD:WHITE});
  lines.forEach((ln,k)=>
    T(s,ln,{x:x+0.24,y:DY+0.62+k*0.28,w:dw-0.48,h:0.28,fontSize:11.5,
      color:hot?WHITE:SOFT,bold:hot}));
});

card(s,P,5.38,W,0.74,{fill:GOLDD,line:GOLD,lw:1.6,r:0.09});
T(s,[{text:'두 번의 실패가 자산을 남겼고,  ',options:{color:WHITE}},
     {text:'AI가 그 자산에 물어볼 방법을 가져다주었습니다',options:{color:GOLD}}],
  {x:P+0.3,y:5.38,w:W-0.6,h:0.74,fontSize:15,bold:true,align:'center',valign:'middle'});

T(s,'감사합니다',{x:P,y:6.24,w:5.0,h:0.58,fontSize:27,bold:true,color:WHITE,charSpacing:2.0});
T(s,[{text:'AI는 개발이 아니라, ',options:{color:WHITE}},{text:'발견',options:{color:GOLD}},
     {text:'이었습니다.  그리고 발견은, 질문에서만 나옵니다',options:{color:GRAY2}}],
  {x:P+5.2,y:6.36,w:W-5.2,h:0.32,fontSize:13,bold:true,align:'right'});
foot(s,'마무리',true);
}

pptx.writeFile({ fileName: process.argv[2] || '오성철강_AI모델공장_8장.pptx' })
  .then(f=>console.log('✅ 완료: '+f))
  .catch(e=>{ console.error('❌', e); process.exit(1); });
