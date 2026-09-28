// 오성철강 — 「자체개발형 AI 모델공장」 (5장 · 연구소 모델 포함)
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = '오성철강 — 자체개발형 AI 모델공장 (4장)';

const F='맑은 고딕', P=0.72, W=11.89;
const NAVY='0B1220', DEEP='0E1729', PANEL='141F36', PANEL2='19243D', EDGE='2E3E5C',
      INK='0F172A', INK2='334155', GRAY='64748B', GRAY2='94A3B8',
      LINE='E2E8F0', TINT='F7F9FC', WHITE='FFFFFF', SOFT='D5DCE8',
      IND='4F46E5', INDL='EEF0FF', INDB='C7CBFF',
      GOLD='F5B544', GOLDL='FFF8E8', GOLDB='FBD88B', GOLDD='1C1407',
      RED='DC2626', REDL='FEF2F2', REDB='FCA5A5', REDD='1C0A0A',
      GRN='059669', GRNL='ECFDF5', GRNB='6EE7B7',
      VIO='7C3AED', VIOL='F5F3FF', VIOB='C4B5FD',
      BLU='0284C7', BLUL='E0F2FE', BLUB='7DD3FC';

let _n=0;
function base(dark){ const s=pptx.addSlide(); if(dark) s.background={color:NAVY}; _n++; return s; }
function T(s,t,o={}){ s.addText(t,{fontFace:F,color:o.color||INK2,valign:o.valign||'top',
  lineSpacingMultiple:o.lsm||1.26,...o}); }
function card(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:o.r||0.09,
  fill:{color:o.fill||WHITE},
  line:o.line===null?{type:'none'}:{color:o.line||LINE,width:o.lw!==undefined?o.lw:1.6}}); }
function rct(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.rect,{x,y,w,h,fill:{color:o.fill||WHITE},
  line:o.line?{color:o.line,width:o.lw||1.4}:{type:'none'}}); }
function ell(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.ellipse,{x,y,w,h,
  fill:{color:o.fill||WHITE},line:o.line?{color:o.line,width:o.lw||1.4}:{type:'none'}}); }
function ln(s,x1,y1,x2,y2,c=GRAY2,w=2.2){
  s.addShape(pptx.ShapeType.line,{x:Math.min(x1,x2),y:Math.min(y1,y2),
    w:Math.abs(x2-x1)||0.008,h:Math.abs(y2-y1)||0.008,line:{color:c,width:w}});
}
function arw(s,x1,y1,x2,y2,c=GRAY2,w=2.6){
  s.addShape(pptx.ShapeType.line,{x:Math.min(x1,x2),y:Math.min(y1,y2),
    w:Math.abs(x2-x1)||0.008,h:Math.abs(y2-y1)||0.008,
    line:{color:c,width:w,endArrowType:'triangle'},flipH:x2<x1,flipV:y2<y1});
}
function pill(s,x,y,w,t,fg,bg,o={}){
  s.addText(t,{x,y,w,h:o.h||0.36,fontSize:o.fs||13,bold:true,color:fg,fill:{color:bg},
    line:o.bd?{color:o.bd,width:1.4}:{type:'none'},align:'center',valign:'middle',
    fontFace:F,shape:pptx.ShapeType.roundRect,rectRadius:0.16});
}
function head(s,kicker,runs,o={}){
  const acc=o.acc||IND, dark=o.dark;
  rct(s,P,0.56,0.075,0.32,{fill:acc});
  T(s,kicker,{x:P+0.24,y:0.52,w:9,h:0.34,fontSize:13,bold:true,color:acc,charSpacing:2.0});
  if(o.sub) T(s,o.sub,{x:P,y:0.96,w:W,h:0.32,fontSize:15,color:dark?GRAY2:GRAY});
  T(s,runs,{x:P,y:o.sub?1.32:1.04,w:W,h:0.66,fontSize:o.size||32,bold:true,
    color:dark?WHITE:INK,lsm:1.10});
}
function band(s,y,runs,o={}){
  card(s,P,y,W,o.h||0.90,{fill:o.fill||NAVY,line:o.line||null,lw:o.lw,r:0.10});
  T(s,runs,{x:P+0.30,y,w:W-0.60,h:o.h||0.90,fontSize:o.fs||21,bold:true,
    align:'center',valign:'middle'});
}
function foot(s,sec,dark){
  rct(s,P,6.92,W,0.014,{fill:dark?EDGE:LINE});
  T(s,sec,{x:P,y:7.02,w:6,h:0.26,fontSize:10.5,bold:true,color:dark?GRAY:GRAY2,charSpacing:1.4});
  T(s,'오성철강  ·  '+_n,{x:P+W-3,y:7.02,w:3,h:0.26,fontSize:10.5,bold:true,
    color:dark?GRAY:GRAY2,align:'right',charSpacing:1.2});
}

/* ═════════ 1 · 표지 ═════════ */
{
const s=base(true);
rct(s,0,0,13.333,7.5,{fill:NAVY});
rct(s,0,0,0.34,7.5,{fill:GOLD});
ell(s,9.60,-1.30,5.60,5.60,{fill:DEEP});
ell(s,10.30,-0.60,4.20,4.20,{fill:PANEL});

T(s,'1983   —   2026',{x:P+0.34,y:1.24,w:8,h:0.36,fontSize:15,bold:true,
  color:GOLD,charSpacing:3.4});
T(s,'1983년, 우리는 경기장을 지었습니다',
  {x:P+0.34,y:2.04,w:11.0,h:0.92,fontSize:46,bold:true,color:WHITE});
T(s,'2026년, 우리를 다시 짓습니다',
  {x:P+0.34,y:3.06,w:11.0,h:0.92,fontSize:46,bold:true,color:GOLD});
rct(s,P+0.34,4.28,3.60,0.018,{fill:GOLD});
T(s,'철강 가공 공장에서, AI로 일하는 회사로',
  {x:P+0.34,y:4.56,w:11.0,h:0.40,fontSize:18,color:SOFT});
T(s,'「자체개발형 AI 모델공장」 지정을 요청드립니다',
  {x:P+0.34,y:4.96,w:11.0,h:0.40,fontSize:18,bold:true,color:WHITE});

const ST=[['1983','창립'],['43년','공장'],['28년','AI · 로봇'],['41개','직접 만든 것']];
const sw=(11.0-3*0.34)/4;
ST.forEach(([n,l],i)=>{
  const x=P+0.34+i*(sw+0.34);
  rct(s,x,5.76,0.06,0.74,{fill:GOLD});
  T(s,n,{x:x+0.22,y:5.72,w:sw-0.22,h:0.46,fontSize:26,bold:true,color:WHITE});
  T(s,l,{x:x+0.22,y:6.22,w:sw-0.22,h:0.30,fontSize:13,color:GRAY2});
});
}

/* ═════════ 2 · 우리 이야기 ═════════ */
{
const s=base();
head(s,'OUR STORY',
  [{text:'43년 된 공장이, ',options:{}},
   {text:'28년 만에 돌아온 사람과 다시 시작합니다',options:{color:IND}}],
  {sub:'오성철강은 1983년 잠실 주경기장을 지으면서 시작한 회사입니다'});

const AY=2.12, AH=1.64, LWd=5.42;
card(s,P,AY,LWd,AH,{fill:TINT,line:LINE});
rct(s,P,AY,0.08,AH,{fill:IND});
T(s,'1983',{x:P+0.34,y:AY+0.24,w:2.1,h:0.62,fontSize:40,bold:true,color:IND});
T(s,'잠실 주경기장을 지으며',{x:P+2.52,y:AY+0.26,w:LWd-2.86,h:0.34,
  fontSize:17,bold:true,color:INK});
T(s,'회사를 시작했습니다',{x:P+2.52,y:AY+0.60,w:LWd-2.86,h:0.34,
  fontSize:17,bold:true,color:INK});
pill(s,P+0.34,AY+1.06,4.20,'그 경기장도 지금 다시 짓고 있습니다',INK,GOLDL,{bd:GOLDB,fs:13.5,h:0.38});

const RX=P+LWd+0.34, RW=W-LWd-0.34;
card(s,RX,AY,RW,AH,{fill:WHITE,line:INDB,lw:2.0});
rct(s,RX,AY,0.08,AH,{fill:IND});
T(s,'28년',{x:RX+0.34,y:AY+0.24,w:2.1,h:0.62,fontSize:40,bold:true,color:IND});
T(s,'저는 그동안 KT에서',{x:RX+2.36,y:AY+0.26,w:RW-2.70,h:0.34,
  fontSize:17,bold:true,color:INK});
T(s,'AI · 로봇 기술을 배웠습니다',{x:RX+2.36,y:AY+0.60,w:RW-2.70,h:0.34,
  fontSize:17,bold:true,color:INK});
rct(s,RX+0.34,AY+1.06,RW-0.68,0.014,{fill:LINE});
T(s,'오디세우스는 20년,  저는 28년이 걸렸습니다',
  {x:RX+0.34,y:AY+1.18,w:RW-0.68,h:0.34,fontSize:15,bold:true,color:IND});

// 안 되던 세 가지
const CY=4.22, CH=1.58, cw=(W-0.50)/3;
T(s,'그동안 공장에서는 이 세 가지가 안 되었습니다',{x:P,y:3.82,w:8,h:0.30,
  fontSize:14,bold:true,color:RED,charSpacing:0.6});
const NO=[
  ['기계를 다룰 줄 아는','사람이 한 분뿐이었습니다','그만두시면 회사 기술도 같이 사라집니다'],
  ['우리만 할 수 있는','것이 없었습니다','값 깎는 것 말고는 내세울 게 없었습니다'],
  ['잘해도 고객이','알 수 없었습니다','잘 만들어도 보여줄 곳이 없었습니다'],
];
NO.forEach(([t1,t2,dd],i)=>{
  const x=P+i*(cw+0.25);
  card(s,x,CY,cw,CH,{fill:REDL,line:REDB,lw:1.8});
  rct(s,x,CY,cw,0.07,{fill:RED});
  T(s,t1,{x:x+0.28,y:CY+0.24,w:cw-0.56,h:0.32,fontSize:18,bold:true,color:INK});
  T(s,t2,{x:x+0.28,y:CY+0.56,w:cw-0.56,h:0.32,fontSize:18,bold:true,color:RED});
  T(s,dd,{x:x+0.28,y:CY+0.96,w:cw-0.56,h:0.50,fontSize:13,color:INK2,lsm:1.2});
});
band(s,5.90,[{text:'그래서 오성철강은 ',options:{color:WHITE}},
             {text:'점점 늙어갔고, 점점 작아졌습니다',options:{color:GOLD}}],{h:0.88});
foot(s,'1. 우리 이야기');
}

/* ═════════ 3 · AI가 바꿨습니다 ═════════ */
{
const s=base();
head(s,'AND THEN, AI',
  [{text:'AI가 그 세 가지를 ',options:{}},{text:'하나씩 바꿔 주었습니다',options:{color:GRN}}],
  {acc:GRN,sub:'말이 아니라, 현장에서 매일 켜는 화면으로 바뀌었습니다'});

const CY=2.06, CH=1.56, cw=(W-0.50)/3;
const CH3=[
  ['공장장 머릿속에만 있었습니다',['화면이','알려줍니다'],'속도와 힘을 띄우고 잘못되면 경고합니다'],
  ['우리만의 강점이 없었습니다',['철판을 전부 찍어','검사합니다'],'흠집 위치까지 기록해 고객에게 드립니다'],
  ['물어볼 곳이 없었습니다',['고객이 밤에도','휴대폰으로 봅니다'],'주문 · 진행 · 품질까지 24시간 확인'],
];
CH3.forEach(([bef,aft,dd],i)=>{
  const x=P+i*(cw+0.25);
  card(s,x,CY,cw,CH,{fill:WHITE,line:GRNB,lw:2.0});
  rct(s,x,CY,cw,0.07,{fill:GRN});
  T(s,'예전  ·  '+bef,{x:x+0.28,y:CY+0.20,w:cw-0.56,h:0.30,fontSize:13,color:GRAY2});
  aft.forEach((ln,k)=>
    T(s,ln,{x:x+0.28,y:CY+0.54+k*0.32,w:cw-0.56,h:0.34,fontSize:19,bold:true,color:GRN}));
  T(s,dd,{x:x+0.28,y:CY+1.20,w:cw-0.56,h:0.30,fontSize:12.5,color:INK2});
  if(i<2) arw(s,x+cw+0.04,CY+CH/2,x+cw+0.21,CY+CH/2,GRNB,2.6);
});

const BY=3.76, BH=2.46, bw=(W-0.32)/2;
card(s,P,BY,bw,BH,{fill:TINT,line:LINE});
rct(s,P,BY,bw,0.07,{fill:RED});
T(s,'다른 공장들은 왜 잘 안 됐을까요',{x:P+0.30,y:BY+0.24,w:bw-0.60,h:0.34,
  fontSize:17,bold:true,color:RED});
[['무엇을 만들지 미리 다 정해야 합니다','AI는 해봐야 압니다. 계약서는 미리 적으라고 합니다'],
 ['계약이 끝나면 고쳐줄 사람이 없습니다','공장은 계속 바뀌는데 프로그램은 멈춰 있습니다']]
 .forEach(([a,b],i)=>{
  const y=BY+0.70+i*0.72;
  T(s,'·  '+a,{x:P+0.30,y:y,w:bw-0.60,h:0.32,fontSize:15.5,bold:true,color:INK});
  T(s,'    '+b,{x:P+0.30,y:y+0.32,w:bw-0.60,h:0.30,fontSize:12.5,color:INK2});
});
T(s,'그래서 돈은 썼는데 현장은 그대로인 경우가 많습니다',
  {x:P+0.30,y:BY+2.12,w:bw-0.60,h:0.28,fontSize:13,bold:true,color:RED});

const X2=P+bw+0.32;
card(s,X2,BY,bw,BH,{fill:INDL,line:IND,lw:2.2});
rct(s,X2,BY,bw,0.07,{fill:IND});
T(s,'오성철강은 왜 다를까요',{x:X2+0.30,y:BY+0.24,w:bw-0.60,h:0.34,
  fontSize:17,bold:true,color:IND});
[['만드는 사람과 쓰는 사람이 같은 회사입니다','제조 43년 + AI · 로봇 28년'],
 ['기계가 이미 기록을 남기고 있습니다','3개 공정 중 2개에 품질 사진과 운전 기록'],
 ['직원들이 먼저 만들어 달라고 합니다','12명 중 5명이 외국인, 현장에서 요구가 올라옵니다']]
 .forEach(([a,b],i)=>{
  const y=BY+0.68+i*0.46;
  T(s,'·  '+a,{x:X2+0.30,y:y,w:bw-0.60,h:0.30,fontSize:15,bold:true,color:INK});
  T(s,'    '+b,{x:X2+0.30,y:y+0.26,w:bw-0.60,h:0.26,fontSize:12,color:INK2});
});
T(s,'그리고 「연구소」라는 방식이 있습니다   →   다음 장',
  {x:X2+0.30,y:BY+2.12,w:bw-0.60,h:0.28,fontSize:13,bold:true,color:IND});

band(s,6.34,[{text:'프로그램을 사다 쓰는 공장이 아니라,  ',options:{color:WHITE}},
             {text:'스스로 만들고 고치는 공장입니다',options:{color:GOLD}}],{h:0.52,fs:16});
foot(s,'2. AI가 바꾼 것');
}

/* ═════════ 4 · 오성철강 연구소 ═════════ */
{
const s=base();
head(s,'OHSUNG LAB  ·  오성철강 연구소',
  [{text:'두 가지 기술을 가지고, ',options:{}},{text:'이렇게 일합니다',options:{color:IND}}],
  {sub:'「자체개발형 AI 모델공장」의 핵심은 장비가 아니라 이 방식입니다'});

// ── 두 기둥
const AY=1.98, AH=1.34, pw=5.42;
[[P,'43년','제조 전문 기술','철판을 어떻게 다뤄야 하는지','몸으로 아는 사람들',GOLD,GOLDL,GOLDB],
 [P+pw+1.05,'28년','AI · 로봇 기술','그것을 프로그램으로','만들 줄 아는 사람',IND,INDL,INDB]]
 .forEach(([x,n,t,a,b,c,bg,bd])=>{
  card(s,x,AY,pw,AH,{fill:bg,line:bd,lw:2.0});
  rct(s,x,AY,0.09,AH,{fill:c});
  T(s,n,{x:x+0.34,y:AY+0.30,w:1.86,h:0.62,fontSize:40,bold:true,color:c});
  T(s,t,{x:x+2.24,y:AY+0.26,w:pw-2.56,h:0.34,fontSize:19,bold:true,color:INK});
  T(s,a,{x:x+2.24,y:AY+0.64,w:pw-2.56,h:0.28,fontSize:13.5,color:INK2});
  T(s,b,{x:x+2.24,y:AY+0.90,w:pw-2.56,h:0.28,fontSize:13.5,color:INK2});
});
T(s,'+',{x:P+pw,y:AY+0.42,w:1.05,h:0.52,fontSize:30,bold:true,color:GRAY,align:'center'});

T(s,'이 둘이 한 회사 안에 있어서,  연구소가 이렇게 돌아갑니다',
  {x:P,y:3.28,w:8,h:0.28,fontSize:14,bold:true,color:IND,charSpacing:0.4});

// ── 1단계 · 만들어 보고 써 본다
const SY=3.70, SH=1.00, sw3=(W-2*0.34)/3;
[['아이디어가 나오면','현장에서든 사무실에서든'],
 ['먼저 만들어 봅니다','AI로 며칠이면 됩니다'],
 ['현장에서 써 봅니다','진짜 작업에 넣어 봅니다']]
 .forEach(([a,b],i)=>{
  const x=P+i*(sw3+0.34);
  card(s,x,SY,sw3,SH,{fill:WHITE,line:INDB,lw:2.0});
  pill(s,x+0.26,SY+0.16,0.42,String(i+1),WHITE,IND,{fs:12,h:0.30});
  T(s,a,{x:x+0.80,y:SY+0.16,w:sw3-1.06,h:0.34,fontSize:17,bold:true,color:INK});
  T(s,b,{x:x+0.26,y:SY+0.62,w:sw3-0.52,h:0.28,fontSize:12.5,color:INK2});
  if(i<2) arw(s,x+sw3+0.05,SY+SH/2,x+sw3+0.29,SY+SH/2,INDB,2.6);
});

// ── 2단계 · 갈림길
const BY2=5.18, BH2=1.02;
const okX=2.52, okW=4.80, ngX=7.62, ngW=W+P-7.62;
const s3c=P+2*(sw3+0.34)+sw3/2, rail=4.94;
ln(s,s3c,SY+SH,s3c,rail,GRAY2,2.2);
ln(s,okX+okW/2,rail,s3c,rail,GRAY2,2.2);
arw(s,okX+okW/2,rail,okX+okW/2,BY2-0.02,GRN,2.4);
arw(s,ngX+ngW/2,rail,ngX+ngW/2,BY2-0.02,GOLD,2.4);
T(s,'효과를 확인합니다',{x:s3c-1.7,y:rail-0.30,w:1.5,h:0.26,fontSize:11.5,
  bold:true,color:GRAY,align:'right'});

card(s,okX,BY2,okW,BH2,{fill:GRNL,line:GRN,lw:2.2});
T(s,'효과가 있으면',{x:okX+0.28,y:BY2+0.14,w:okW-0.56,h:0.26,fontSize:12.5,color:GRN});
T(s,'제대로 된 서비스로 만듭니다',{x:okX+0.28,y:BY2+0.44,w:okW-0.56,h:0.38,
  fontSize:19,bold:true,color:GRN});

card(s,ngX,BY2,ngW,BH2,{fill:GOLDL,line:GOLD,lw:2.2});
T(s,'효과가 없으면',{x:ngX+0.28,y:BY2+0.14,w:ngW-0.56,h:0.26,fontSize:12.5,color:'B07A12'});
T(s,'버리고, 새로운 방법으로 다시',{x:ngX+0.28,y:BY2+0.44,w:ngW-0.56,h:0.38,
  fontSize:19,bold:true,color:'B07A12'});

// ── 되돌아가는 화살표
const RY=6.42;
ln(s,ngX+ngW/2,BY2+BH2,ngX+ngW/2,RY,GOLD,2.4);
ln(s,1.86,RY,ngX+ngW/2,RY,GOLD,2.4);
arw(s,1.86,RY,1.86,SY+SH+0.04,GOLD,2.4);
T(s,'처음부터 다시',{x:2.08,y:RY-0.32,w:2.2,h:0.26,fontSize:12,bold:true,color:GOLD});
T(s,'이 사이클을 계속 돌려서 41개를 만들었습니다',
  {x:P+6.0,y:RY+0.10,w:W-6.0,h:0.28,fontSize:13.5,bold:true,color:IND,align:'right'});
foot(s,'3. 오성철강 연구소');
}

/* ═════════ 5 · 요청 · 꿈 · 감사합니다 ═════════ */
{
const s=base(true);
rct(s,0,0,13.333,2.06,{fill:DEEP});
head(s,'OUR REQUEST',
  [{text:'「자체개발형 AI 모델공장」으로 ',options:{}},
   {text:'지정해 주십시오',options:{color:GOLD}}],
  {dark:true,acc:GOLD,
   sub:'프로그램을 사주는 지원이 아니라, 공장이 스스로 만들 수 있게 해주는 지원입니다'});

const AY=2.16, AH=1.50, aw=(W-2*0.30)/3;
const US=[
  ['사람 2명','데이터를 볼 한 명,','현장에 적용할 한 명'],
  ['만들어 볼 예산','남은 공정까지 완성하고,','다른 공장도 쓸 수 있게 정리'],
  ['와서 볼 수 있는 곳','산업단지 안에 상설 견학장,','주변 공장 대상 교육'],
];
US.forEach(([t,a,b],i)=>{
  const x=P+i*(aw+0.30);
  card(s,x,AY,aw,AH,{fill:PANEL,line:EDGE,lw:1.6});
  rct(s,x,AY,aw,0.07,{fill:BLUB});
  T(s,t,{x:x+0.28,y:AY+0.26,w:aw-0.56,h:0.38,fontSize:20,bold:true,color:WHITE});
  T(s,a,{x:x+0.28,y:AY+0.76,w:aw-0.56,h:0.30,fontSize:13.5,color:SOFT});
  T(s,b,{x:x+0.28,y:AY+1.06,w:aw-0.56,h:0.30,fontSize:13.5,color:SOFT});
});
T(s,'오성철강 한 곳을 도와주시면,  주변 공장들이 와서 보고 배울 곳이 생깁니다',
  {x:P,y:3.76,w:W,h:0.32,fontSize:15,bold:true,color:GOLD,align:'center'});

const DY=4.44, dh=1.32, dw=(W-2*0.28)/3;
T(s,'AI는 저희에게 꿈을 꾸게 해주었습니다',{x:P,y:4.06,w:8,h:0.28,
  fontSize:13.5,bold:true,color:GRAY2,charSpacing:0.8});
const D=[
  ['외국인 직원들에게',['전문 기술자가','될 수 있다는 꿈'],VIOB,PANEL2,false],
  ['오성철강에게',['싸구려가 아니라','좋은 품질로 파는 꿈'],BLUB,PANEL2,false],
  ['4,000곳의 철강 회사에',['이 꿈을 같이','꾸게 하고 싶습니다'],GOLD,GOLDD,true],
];
D.forEach(([a,lines,c,bg,hot],i)=>{
  const x=P+i*(dw+0.28);
  card(s,x,DY,dw,dh,{fill:bg,line:hot?GOLD:EDGE,lw:hot?2.4:1.6});
  rct(s,x,DY,dw,0.07,{fill:c});
  T(s,a,{x:x+0.28,y:DY+0.22,w:dw-0.56,h:0.30,fontSize:13.5,color:hot?GOLD:GRAY2});
  lines.forEach((ln,k)=>
    T(s,ln,{x:x+0.28,y:DY+0.58+k*0.32,w:dw-0.56,h:0.34,fontSize:18,bold:true,
      color:hot?WHITE:SOFT}));
});

T(s,'감사합니다',{x:P,y:5.96,w:5.4,h:0.72,fontSize:34,bold:true,color:WHITE,charSpacing:2.6});
T(s,[{text:'AI는 새로 만드는 것이 아니라, ',options:{color:WHITE}},
     {text:'찾아내는 것',options:{color:GOLD}},
     {text:'이었습니다',options:{color:WHITE}}],
  {x:P+5.6,y:6.08,w:W-5.6,h:0.34,fontSize:18,bold:true,align:'right'});
T(s,'그리고 찾아내려면, 계속 물어봐야 합니다',
  {x:P+5.6,y:6.46,w:W-5.6,h:0.30,fontSize:13.5,color:GRAY2,align:'right'});
foot(s,'4. 요청',true);
}

pptx.writeFile({ fileName: process.argv[2] || '오성철강_AI모델공장_5장.pptx' })
  .then(f=>console.log('✅ 완료: '+f))
  .catch(e=>{ console.error('❌', e); process.exit(1); });
