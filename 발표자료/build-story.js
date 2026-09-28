// 오성철강 — 「자체개발형 AI 모델공장」 스토리 발표자료 (12장)
// 실행: NODE_PATH=<repo>/node_modules node build-story.js [파일명]
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = '오성철강 — 자체개발형 AI 모델공장';

const F='맑은 고딕', P=0.72, W=11.89;
const NAVY='0B1220', DEEP='101B31', PANEL='121D33', PANEL2='16233C', EDGE='2A3A55',
      INK='0F172A', INK2='334155', GRAY='64748B', GRAY2='94A3B8',
      LINE='E2E8F0', LINE2='F1F5F9', TINT='F8FAFC', WHITE='FFFFFF', SOFT='CBD5E1',
      IND='4F46E5', INDL='EEF0FF', INDB='C7CBFF',
      GOLD='F5B544', GOLDL='FFF8E8', GOLDB='FBD88B', GOLDD='1A1406',
      RED='DC2626', REDL='FEF2F2', REDB='FCA5A5', RED9='7F1D1D',
      GRN='059669', GRNL='ECFDF5', GRNB='6EE7B7',
      VIO='7C3AED', VIOL='F5F3FF', VIOB='C4B5FD',
      BLU='0284C7', BLUL='E0F2FE', BLUB='7DD3FC';

let _n=0;
function base(dark){ const s=pptx.addSlide(); if(dark) s.background={color:NAVY}; _n++; return s; }
function T(s,t,o={}){ s.addText(t,{fontFace:F,color:o.color||INK2,valign:o.valign||'top',
  lineSpacingMultiple:o.lsm||1.35,...o}); }
function card(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:o.r||0.08,
  fill:{color:o.fill||WHITE},
  line:o.line===null?{type:'none'}:{color:o.line||LINE,width:o.lw!==undefined?o.lw:1.5}}); }
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
  s.addText(t,{x,y,w,h:o.h||0.30,fontSize:o.fs||10.5,bold:true,color:fg,fill:{color:bg},
    line:o.bd?{color:o.bd,width:1.3}:{type:'none'},align:'center',valign:'middle',
    fontFace:F,shape:pptx.ShapeType.roundRect,rectRadius:0.14});
}
function head(s,kicker,runs,o={}){
  const acc=o.acc||IND, dark=o.dark;
  rct(s,P,0.62,0.055,0.26,{fill:acc});
  T(s,kicker,{x:P+0.20,y:0.58,w:9,h:0.30,fontSize:11.5,bold:true,color:acc,charSpacing:1.6});
  if(o.sub) T(s,o.sub,{x:P,y:0.98,w:W,h:0.28,fontSize:13,color:dark?GRAY2:GRAY});
  T(s,runs,{x:P,y:o.sub?1.28:1.02,w:W,h:0.62,fontSize:o.size||28,bold:true,
    color:dark?WHITE:INK,lsm:1.14});
}
function band(s,y,runs,o={}){
  card(s,P,y,W,o.h||0.86,{fill:o.fill||NAVY,line:o.line||null,lw:o.lw,r:0.09});
  T(s,runs,{x:P+0.30,y,w:W-0.60,h:o.h||0.86,fontSize:o.fs||16,bold:true,
    align:'center',valign:'middle'});
}
function foot(s,sec,dark){
  rct(s,P,6.94,W,0.012,{fill:dark?EDGE:LINE});
  T(s,sec,{x:P,y:7.02,w:6,h:0.26,fontSize:9.5,bold:true,color:dark?GRAY:GRAY2,charSpacing:1.4});
  T(s,'오성철강  ·  '+_n,{x:P+W-3,y:7.02,w:3,h:0.26,fontSize:9.5,bold:true,
    color:dark?GRAY:GRAY2,align:'right',charSpacing:1.2});
}

/* ───────────────────────── 01 · 표지 ───────────────────────── */
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

/* ───────────────────────── 02 · 창립 ───────────────────────── */
{
const s=base();
head(s,'FOUNDED 1983','오성철강은 잠실 주경기장을 지으면서 창립했습니다',
  {sub:'짓는 일로 시작한 회사입니다'});
const LW=4.30, CY=2.10, CH=2.90;
card(s,P,CY,LW,CH,{fill:TINT});
ell(s,P+1.10,CY+0.40,2.10,1.20,{fill:WHITE,line:IND,lw:2.4});
ell(s,P+1.52,CY+0.60,1.26,0.80,{fill:INDL,line:INDB,lw:1.2});
T(s,'1983',{x:P+1.52,y:CY+0.82,w:1.26,h:0.30,fontSize:14,bold:true,color:IND,align:'center'});
T(s,'잠실 주경기장 시공  ·  오성철강 창립',
  {x:P+0.24,y:CY+1.78,w:LW-0.48,h:0.26,fontSize:11,color:GRAY,align:'center'});
pill(s,P+1.05,CY+2.14,2.20,'2026 · 리모델링 중',INK,GOLDL,{bd:GOLDB,fs:11});

const RX=P+LW+0.35, RW=W-LW-0.35;
card(s,RX,CY,RW,CH,{fill:WHITE});
T(s,[{text:'43',options:{fontSize:52}},{text:'년',options:{fontSize:20}}],
  {x:RX+0.34,y:CY+0.30,w:2.4,h:0.86,bold:true,color:IND});
T(s,'그 사이 세상은 바뀌었고,  회사와 기계와 사람은 그대로 오래되었습니다',
  {x:RX+0.34,y:CY+1.34,w:RW-0.68,h:0.30,fontSize:12.5,color:INK2});
rct(s,RX+0.34,CY+1.74,RW-0.68,0.012,{fill:LINE});
const RR=[
  ['그 경기장은','지금 리모델링 중입니다',GOLD,GOLDL,GOLDB],
  ['오성철강도','새로 태어날 준비를 하고 있습니다',IND,INDL,INDB],
];
const rw=(RW-0.68-0.28)/2;
RR.forEach(([a,b,c,bg,bd],i)=>{
  const x=RX+0.34+i*(rw+0.28);
  card(s,x,CY+1.92,rw,0.84,{fill:bg,line:bd,lw:1.4});
  T(s,a,{x:x+0.22,y:CY+2.04,w:rw-0.44,h:0.24,fontSize:10.5,bold:true,color:c});
  T(s,b,{x:x+0.22,y:CY+2.30,w:rw-0.44,h:0.32,fontSize:13,bold:true,color:INK});
});

band(s,5.28,[{text:'짓는 일로 시작한 회사가,  ',options:{color:WHITE}},
             {text:'이번에는 스스로를 다시 짓습니다',options:{color:GOLD}}],{h:0.90});
foot(s,'1. 우리는 왜 여기까지 왔나');
}

/* ───────────────────────── 03 · 오디세우스 ───────────────────────── */
{
const s=base();
head(s,'THE LONG WAY HOME',
  [{text:'오디세우스는 20년, ',options:{}},{text:'저는 28년이 걸렸습니다',options:{color:IND}}],
  {sub:'돌아오는 길이 길었던 만큼, 가지고 돌아온 것도 있었습니다'});
const CY=2.10, CH=2.86, cw=(W-0.36)/2;
const CC=[
  ['ODYSSEUS','오디세우스','20년',GRAY,TINT,LINE,'334155',
   '많은 모험 끝에 고향으로 돌아왔습니다',
   '그리고 20년간의 노하우로,  떠나기 전보다 더 강력한 왕국을 만들었습니다'],
  ['THE RETURN','저는','28년',IND,INDL,INDB,IND,
   'KT에서 IT · AI · ROBOT 전문기술을 익혔습니다',
   '그리고 43년 된 오성철강과 함께,  제조업과 AI를 결합한 새로운 회사로 거듭나겠습니다'],
];
CC.forEach(([k,who,yr,c,bg,bd,barc,l1,l2],i)=>{
  const x=P+i*(cw+0.36), hot=(i===1);
  card(s,x,CY,cw,CH,{fill:WHITE,line:hot?INDB:LINE,lw:hot?2.2:1.5});
  rct(s,x,CY,cw,0.06,{fill:c});
  T(s,k,{x:x+0.30,y:CY+0.26,w:cw-0.60,h:0.26,fontSize:10,bold:true,color:c,charSpacing:1.6});
  T(s,who,{x:x+0.30,y:CY+0.56,w:2.2,h:0.40,fontSize:20,bold:true,color:INK});
  T(s,yr,{x:x+cw-2.5,y:CY+0.50,w:2.2,h:0.50,fontSize:34,bold:true,color:c,align:'right'});
  bar(s,x+0.30,CY+1.14,(cw-0.60)*(i===0?20/28:1),0.26,barc);
  T(s,l1,{x:x+0.30,y:CY+1.58,w:cw-0.60,h:0.30,fontSize:12.5,color:INK2});
  card(s,x+0.30,CY+1.96,cw-0.60,0.72,{fill:bg,line:bd,lw:1.3});
  T(s,l2,{x:x+0.46,y:CY+2.06,w:cw-0.92,h:0.54,fontSize:12,bold:true,color:INK,lsm:1.25});
});
band(s,5.24,[{text:'떠나 있던 시간이 낭비가 아니었던 이유는,  ',options:{color:WHITE}},
             {text:'돌아올 곳이 남아 있었기 때문입니다',options:{color:GOLD}}],{h:0.92});
foot(s,'1. 우리는 왜 여기까지 왔나');
}

/* ───────────────────────── 04 · 왜 떠나 있었나 (dark) ───────────────────────── */
{
const s=base(true);
rct(s,0,0,13.333,2.05,{fill:DEEP});
head(s,'WHY I LEFT',
  [{text:'열악한 제조 환경에서는, ',options:{}},{text:'꿈을 꾸기 어려웠습니다',options:{color:REDB}}],
  {dark:true,acc:REDB,sub:'28년 동안 밖을 떠돌았던 이유입니다'});
const CY=2.22, CH=2.46, cw=(W-0.50)/3;
const NO=[
  ['01','공장장 한 사람만\n운영할 수 있는 설비',
   '기준이 사람의 머릿속에만 있었습니다.\n그분이 퇴직하면 회사의 기술도 같이 사라집니다.'],
  ['02','우리 회사만 할 수 있는\n무기가 없음',
   '같은 기계, 같은 공정.\n단가 말고는 내세울 것이 없는 거래였습니다.'],
  ['03','고객이 체감할 수 있는\n서비스가 없음',
   '무엇을 잘하는지 고객이 볼 방법이 없었습니다.\n잘해도 알아주지 않았습니다.'],
];
NO.forEach(([no,tt,dd],i)=>{
  const x=P+i*(cw+0.25);
  card(s,x,CY,cw,CH,{fill:PANEL,line:EDGE,lw:1.4,r:0.09});
  rct(s,x,CY,cw,0.055,{fill:RED});
  pill(s,x+0.26,CY+0.26,0.62,no,WHITE,RED,{fs:10.5});
  tt.split('\n').forEach((ln,k)=>
    T(s,ln,{x:x+0.26,y:CY+0.68+k*0.34,w:cw-0.52,h:0.34,fontSize:15,bold:true,color:WHITE}));
  rct(s,x+0.26,CY+1.44,cw-0.52,0.012,{fill:EDGE});
  dd.split('\n').forEach((ln,k)=>
    T(s,ln,{x:x+0.26,y:CY+1.58+k*0.28,w:cw-0.52,h:0.28,fontSize:11,color:GRAY2}));
});
band(s,5.10,[{text:'이 모든 것이 불가능했기 때문에,  ',options:{color:WHITE}},
             {text:'오성철강은 늙어갔고 작아져 갔습니다',options:{color:REDB}}],
  {h:1.00,fill:'1A0A0A',line:RED,lw:1.8,fs:19});
foot(s,'1. 우리는 왜 여기까지 왔나',true);
}

/* ───────────────────────── 05 · AI가 바꾸기 시작 ───────────────────────── */
{
const s=base();
head(s,'AND THEN, AI',
  [{text:'AI가 이 셋을 ',options:{}},{text:'하나씩 바꾸기 시작했습니다',options:{color:GRN}}],
  {acc:GRN,sub:'구호가 아니라, 현장에서 매일 열리는 화면으로'});
const CY=2.06, rh=0.98, gapy=0.18;
const RW2=[
  ['01','공장장만 아는 설비','화면이 계산하고, 화면이 판정합니다',
   '세퍼레이터 셋팅 키오스크  ·  AI 헬퍼 모바일(KR/EN)  ·  라인 통합관제 NMS'],
  ['02','우리만의 무기가 없음','전수 촬영 · 2초 단위 기록 · AI 판별',
   'AI 표면 전수검사  ·  장애 원인 분석  ·  품질 성적서'],
  ['03','고객이 볼 방법이 없음','24시간 조회 · 발주 · 품질 확인',
   '고객 포털  ·  고객사 챗봇  ·  주문 현황 트래커'],
];
RW2.forEach(([no,bef,aft,svc],i)=>{
  const y=CY+i*(rh+gapy);
  card(s,P,y,W,rh,{fill:i%2?TINT:WHITE});
  pill(s,P+0.24,y+0.18,0.58,no,WHITE,GRAY,{fs:10});
  T(s,bef,{x:P+0.96,y:y+0.14,w:2.70,h:0.30,fontSize:13,bold:true,color:GRAY,strike:true});
  T(s,'예전',{x:P+0.96,y:y+0.52,w:2.70,h:0.24,fontSize:9.5,color:GRAY2});
  arw(s,P+3.78,y+rh/2,P+4.22,y+rh/2,GRN,2.2);
  T(s,aft,{x:P+4.38,y:y+0.14,w:3.60,h:0.34,fontSize:14.5,bold:true,color:GRN});
  T(s,'지금',{x:P+4.38,y:y+0.54,w:3.60,h:0.24,fontSize:9.5,color:GRN});
  card(s,P+8.14,y+0.16,W-8.38,rh-0.32,{fill:GRNL,line:GRNB,lw:1.3});
  T(s,svc,{x:P+8.30,y:y+0.16,w:W-8.70,h:rh-0.32,fontSize:10.5,color:INK2,valign:'middle',lsm:1.25});
});
band(s,5.62,[{text:'AI는 우리에게 도구가 아니라,  ',options:{color:WHITE}},
             {text:'꿈을 꿀 수 있다는 가능성을 주었습니다',options:{color:GOLD}}],{h:0.86});
foot(s,'1. 우리는 왜 여기까지 왔나');
}

/* ───────────────────────── 06 · 전환 (dark) ───────────────────────── */
{
const s=base(true);
rct(s,0,0,13.333,7.5,{fill:NAVY});
rct(s,P,1.36,0.055,0.26,{fill:GOLD});
T(s,'WE CAN DREAM NOW',{x:P+0.20,y:1.32,w:8,h:0.30,fontSize:11.5,bold:true,
  color:GOLD,charSpacing:1.8});
T(s,[{text:'이로써 우리는, ',options:{color:WHITE}},{text:'꿈을 꿀 수 있게 되었습니다',options:{color:GOLD}}],
  {x:P,y:1.78,w:W,h:0.70,fontSize:34,bold:true});
T(s,'대한민국 중소 제조업에서 유일하게, 두 가지를 한 회사 안에 가지고 있습니다',
  {x:P,y:2.62,w:W,h:0.30,fontSize:14,color:GRAY2});

const bw=3.62, by=3.26, bh=1.92;
card(s,P,by,bw,bh,{fill:PANEL,line:EDGE,lw:1.4,r:0.10});
T(s,[{text:'28',options:{fontSize:50}},{text:'년',options:{fontSize:18}}],
  {x:P+0.34,y:by+0.34,w:bw-0.68,h:0.80,bold:true,color:BLUB});
T(s,'AI · ROBOT · IT 전문기술',{x:P+0.34,y:by+1.30,w:bw-0.68,h:0.28,fontSize:13,bold:true,color:WHITE});
T(s,'KT에서 익힌 기술',{x:P+0.34,y:by+1.60,w:bw-0.68,h:0.26,fontSize:10.5,color:GRAY2});

T(s,'+',{x:P+bw,y:by+0.58,w:0.80,h:0.70,fontSize:34,bold:true,color:GRAY,align:'center'});

card(s,P+bw+0.80,by,bw,bh,{fill:PANEL,line:EDGE,lw:1.4,r:0.10});
T(s,[{text:'43',options:{fontSize:50}},{text:'년',options:{fontSize:18}}],
  {x:P+bw+1.14,y:by+0.34,w:bw-0.68,h:0.80,bold:true,color:GOLDB});
T(s,'제조 현장 전문기술',{x:P+bw+1.14,y:by+1.30,w:bw-0.68,h:0.28,fontSize:13,bold:true,color:WHITE});
T(s,'오성철강이 쌓아온 것',{x:P+bw+1.14,y:by+1.60,w:bw-0.68,h:0.26,fontSize:10.5,color:GRAY2});

const ex=P+2*bw+1.60, ew=W-2*bw-1.60;
card(s,ex,by,ew,bh,{fill:GOLDD,line:GOLD,lw:2.2,r:0.10});
T(s,'=',{x:ex,y:by+0.30,w:ew,h:0.44,fontSize:26,bold:true,color:GOLD,align:'center'});
T(s,'국내 유일',{x:ex,y:by+0.84,w:ew,h:0.44,fontSize:26,bold:true,color:WHITE,align:'center'});
T(s,'개발사 없이, 공장이 직접',{x:ex,y:by+1.38,w:ew,h:0.28,fontSize:11.5,
  color:GOLD,align:'center'});

band(s,5.62,[{text:'이제 우리는 물어볼 수 있습니다.  ',options:{color:WHITE}},
             {text:'그리고 발견은, 질문에서만 나옵니다',options:{color:GOLD}}],
  {h:0.86,fill:PANEL,line:EDGE,lw:1.4});
foot(s,'1. 우리는 왜 여기까지 왔나',true);
}

/* ───────────────────────── 07 · 실패 이유 ① ───────────────────────── */
{
const s=base();
head(s,'WHY AI PROJECTS FAIL  ·  01',
  [{text:'요구사항 정의가 ',options:{}},{text:'어렵습니다',options:{color:RED}}],
  {acc:RED,sub:'제조업 대상 AI 프로젝트가 실패하는 첫 번째 이유'});
const CY=2.06;
const ST=[
  ['개발 계약','개발 범위 · 비용 · 일정을\n계약 전에 확정합니다',GRAY,TINT,LINE],
  ['그런데 AI는','발견을 통해서만\n모델이 만들어집니다',IND,INDL,INDB],
  ['개발사 ≠ 제조사','제한된 기간 안에\n프로젝트를 끝내야 합니다',GOLD,GOLDL,GOLDB],
  ['결과','AI를 통한 혁신 작업이\n불가능해집니다',RED,REDL,REDB],
];
const sw=(W-3*0.30)/4, sh=1.52;
ST.forEach(([t,d,c,bg,bd],i)=>{
  const x=P+i*(sw+0.30);
  card(s,x,CY,sw,sh,{fill:bg,line:bd,lw:1.5});
  T(s,t,{x:x+0.22,y:CY+0.18,w:sw-0.44,h:0.30,fontSize:14,bold:true,color:c});
  d.split('\n').forEach((ln,k)=>
    T(s,ln,{x:x+0.22,y:CY+0.62+k*0.28,w:sw-0.44,h:0.28,fontSize:11.5,color:INK2}));
  if(i<3) arw(s,x+sw+0.05,CY+sh/2,x+sw+0.25,CY+sh/2,GRAY2,2);
});
const BY=3.90;
card(s,P,BY,W,1.44,{fill:WHITE,line:INDB,lw:2.2});
rct(s,P,BY,0.07,1.44,{fill:IND});
T(s,'그런데 오성철강은 왜 성과가 났을까요',{x:P+0.36,y:BY+0.20,w:W-0.72,h:0.30,
  fontSize:13,bold:true,color:IND});
T(s,'개발사와 제조사가 같은 회사이기 때문입니다.  연구실에 40여 개의 서비스를 만들어 하나씩 제조 현장에 적용해 보고,',
  {x:P+0.36,y:BY+0.58,w:W-0.72,h:0.30,fontSize:13,color:INK});
T(s,'현장이 쓰지 않으면 버리고 다시 만들면서 최적의 모델을 찾았습니다.  계약서에 없던 발견을, 기간에 쫓기지 않고 할 수 있었습니다.',
  {x:P+0.36,y:BY+0.92,w:W-0.72,h:0.30,fontSize:13,color:INK});

band(s,5.62,[{text:'AI 프로젝트는 계약으로 정의할 수 없습니다.  ',options:{color:WHITE}},
             {text:'해보면서 발견하는 수밖에 없습니다',options:{color:GOLD}}],{h:0.86});
foot(s,'2. 왜 AI 프로젝트는 실패하는가');
}

/* ───────────────────────── 08 · 실패 이유 ② ───────────────────────── */
{
const s=base();
head(s,'WHY AI PROJECTS FAIL  ·  02',
  [{text:'프로젝트가 끝나면, ',options:{}},{text:'업그레이드가 멈춥니다',options:{color:RED}}],
  {acc:RED,sub:'제조업 대상 AI 프로젝트가 실패하는 두 번째 이유'});
const CY=2.06, CH=1.62, cw=(W-0.32)/2;
const TWO=[
  ['제조 환경은 급속히 변합니다','소량 다품종인 중소 제조업 시장에서,\n하나의 솔루션으로 모든 게 해결되는 일은 없습니다',GOLD,GOLDL,GOLDB],
  ['업그레이드에는 추가 계약이 필요합니다','현실적으로 추가 계약은 잘 이뤄지지 않고,\n그 결과 최적화 작업 자체가 멈춥니다',RED,REDL,REDB],
];
TWO.forEach(([t,d,c,bg,bd],i)=>{
  const x=P+i*(cw+0.32);
  card(s,x,CY,cw,CH,{fill:bg,line:bd,lw:1.5});
  T(s,t,{x:x+0.26,y:CY+0.20,w:cw-0.52,h:0.32,fontSize:15,bold:true,color:c});
  d.split('\n').forEach((ln,k)=>
    T(s,ln,{x:x+0.26,y:CY+0.66+k*0.30,w:cw-0.52,h:0.30,fontSize:12.5,color:INK2}));
});
const BY=3.92, bh2=1.52;
card(s,P,BY,cw,bh2,{fill:TINT,line:LINE});
T(s,'외주 개발 모델',{x:P+0.26,y:BY+0.20,w:cw-0.52,h:0.28,fontSize:11.5,bold:true,color:GRAY});
T(s,'계약 종료  =  정지',{x:P+0.26,y:BY+0.56,w:cw-0.52,h:0.42,fontSize:24,bold:true,color:GRAY});
T(s,'현장이 바뀌어도 화면은 그대로 남습니다',{x:P+0.26,y:BY+1.06,w:cw-0.52,h:0.28,
  fontSize:11,color:GRAY2});

card(s,P+cw+0.32,BY,cw,bh2,{fill:INDL,line:IND,lw:2.2});
T(s,'오성철강 연구실',{x:P+cw+0.58,y:BY+0.20,w:cw-0.52,h:0.28,fontSize:11.5,bold:true,color:IND});
T(s,'계약 종료가  없습니다',{x:P+cw+0.58,y:BY+0.56,w:cw-0.52,h:0.42,fontSize:24,bold:true,color:IND});
T(s,'현장이 불편하다고 하면 며칠 안에 고칩니다',{x:P+cw+0.58,y:BY+1.06,w:cw-0.52,h:0.28,
  fontSize:11,bold:true,color:INK});

band(s,5.66,[{text:'솔루션은 끝나지만,  ',options:{color:WHITE}},
             {text:'공장은 끝나지 않습니다',options:{color:GOLD}}],{h:0.82});
foot(s,'2. 왜 AI 프로젝트는 실패하는가');
}

/* ───────────────────────── 09 · Why 오성철강 ───────────────────────── */
{
const s=base();
head(s,'WHY OHSUNG',[{text:'Why ',options:{}},{text:'오성철강',options:{color:IND}},{text:' ?',options:{}}],
  {sub:'개발사 없이, 공장이 직접 만들고 검증하는 구조'});
const CY=2.02, ch=1.52, ch2=1.70, cw=(W-0.32)/2, gy=0.18;
function qcard(x,y,w,h,no,tt,lines,c,bg,bd){
  card(s,x,y,w,h,{fill:bg||WHITE,line:bd||LINE,lw:bd?2.0:1.5});
  rct(s,x,y,w,0.055,{fill:c});
  pill(s,x+0.26,y+0.22,0.44,no,WHITE,c,{fs:10});
  T(s,tt,{x:x+0.82,y:y+0.20,w:w-1.08,h:0.32,fontSize:15,bold:true,color:INK});
  lines.forEach((ln,k)=>
    T(s,ln,{x:x+0.26,y:y+0.70+k*0.30,w:w-0.52,h:0.30,fontSize:11,color:INK2}));
}
qcard(P,CY,cw,ch,'1','개발사 없이 개발 가능',
  ['43년 제조 전문가와 28년 AI/ROBOT 전문가를 함께 보유합니다.',
   '개발사와 제조사가 따로 있어 생기는 분할손이 없습니다.'],IND);
qcard(P+cw+0.32,CY,cw,ch,'2','데이터 수집 기반 완료',
  ['3개 공정 중 2개 공정에 Vision 품질 데이터와 PLC 데이터가 있습니다.',
   '품질 · 장비 운용 · 가공 규격 — 기반이 이미 완료되어 있습니다.'],BLU);

const Y2=CY+ch+gy;
card(s,P,Y2,cw,ch2,{fill:WHITE,line:LINE});
rct(s,P,Y2,cw,0.055,{fill:VIO});
pill(s,P+0.26,Y2+0.22,0.44,'3',WHITE,VIO,{fs:10});
T(s,'임직원들의 참여 의지',{x:P+0.82,y:Y2+0.20,w:cw-1.08,h:0.32,fontSize:15,bold:true,color:INK});
const mw=(cw-0.52-0.22)/2;
[['12명 중 5명','외국인 직원 참여'],['40여 개','연구실 서비스']].forEach(([a,b],i)=>{
  const x=P+0.26+i*(mw+0.22);
  card(s,x,Y2+0.66,mw,0.66,{fill:VIOL,line:VIOB,lw:1.3});
  T(s,a,{x:x+0.18,y:Y2+0.70,w:mw-0.36,h:0.32,fontSize:16,bold:true,color:VIO});
  T(s,b,{x:x+0.18,y:Y2+1.04,w:mw-0.36,h:0.24,fontSize:10,color:INK2});
});

const X2=P+cw+0.32;
card(s,X2,Y2,cw,ch2,{fill:NAVY,line:null});
rct(s,X2,Y2,cw,0.055,{fill:GOLD});
pill(s,X2+0.26,Y2+0.22,0.44,'4',NAVY,GOLD,{fs:10});
T(s,'연구실 프로세스 운용으로 최적화',{x:X2+0.82,y:Y2+0.20,w:cw-1.08,h:0.32,
  fontSize:15,bold:true,color:WHITE});
[['아이디어 발굴','AI 개발','상용 적용'],['문제점 도출','서비스 개선','상용 적용']]
 .forEach((row,r)=>{
  let fx=X2+0.26; const fy=Y2+0.68+r*0.36;
  row.forEach((t,i)=>{
    const fw=0.128*t.length+0.34, last=(r===1&&i===2);
    pill(s,fx,fy,fw,t,last?NAVY:WHITE,last?GOLD:PANEL2,{fs:9.5,h:0.28,bd:last?null:EDGE});
    fx+=fw;
    if(i<2){ arw(s,fx+0.04,fy+0.14,fx+0.18,fy+0.14,GRAY,1.6); fx+=0.22; }
  });
  if(r===0) T(s,'↓',{x:X2+0.26,y:fy+0.28,w:0.30,h:0.16,fontSize:9,color:GRAY,align:'center'});
});
T(s,'끊기지 않고 계속 도는 이 사이클에서 41개 서비스가 나왔습니다',
  {x:X2+0.26,y:Y2+1.40,w:cw-0.52,h:0.26,fontSize:10.5,color:GOLD});

band(s,5.56,[{text:'솔루션을 사는 공장이 아니라,  ',options:{color:WHITE}},
             {text:'스스로 만들고 스스로 고치는 공장입니다',options:{color:GOLD}}],{h:0.82});
foot(s,'3. Why 오성철강');
}

/* ───────────────────────── 10 · 요청 ───────────────────────── */
{
const s=base();
head(s,'OUR REQUEST',
  [{text:'「자체개발형 AI 모델공장」 ',options:{}},{text:'시범 지정을 요청드립니다',options:{color:IND}}],
  {sub:'솔루션을 사주는 지원이 아니라, 공장이 직접 물어볼 수 있는 역량에 투자하는 지원입니다',
   size:27});
const CY=2.14, CH=1.72, cw=(W-0.32)/2;
const RQ=[
  ['국내 유일한 결합','오성철강은 국내에서 유일하게','AI/ROBOT 기술과 제조 기술을 함께 보유한 회사입니다',IND,INDL,INDB],
  ['발견 → 투입 → 효과 확인','중소 제조업에 맞는 최적의 AI 기술을 발견하고 공정에 투입하여',
   '효과까지 확인할 수 있는 국내 유일한 회사입니다',GOLD,GOLDL,GOLDB],
];
RQ.forEach(([t,a,b,c,bg,bd],i)=>{
  const x=P+i*(cw+0.32);
  card(s,x,CY,cw,CH,{fill:WHITE,line:bd,lw:2.0});
  rct(s,x,CY,cw,0.06,{fill:c});
  T(s,t,{x:x+0.28,y:CY+0.24,w:cw-0.56,h:0.34,fontSize:16,bold:true,color:INK});
  rct(s,x+0.28,CY+0.68,cw-0.56,0.012,{fill:LINE});
  T(s,a,{x:x+0.28,y:CY+0.84,w:cw-0.56,h:0.30,fontSize:12.5,color:INK2});
  T(s,b,{x:x+0.28,y:CY+1.16,w:cw-0.56,h:0.34,fontSize:13,bold:true,color:c});
});
const FY=4.32;
T(s,'지원해 주시면, 오성철강은 이렇게 씁니다',{x:P,y:FY-0.34,w:6,h:0.26,
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
band(s,5.52,[{text:'이에 오성철강이 ',options:{color:WHITE}},
             {text:'많은 발견',options:{color:GOLD}},
             {text:'을 할 수 있도록, 많은 지원 부탁드립니다',options:{color:WHITE}}],
  {h:0.96,fs:19});
foot(s,'4. 요청');
}

/* ───────────────────────── 11 · 마무리 (dark) ───────────────────────── */
{
const s=base(true);
rct(s,0,0,13.333,2.05,{fill:DEEP});
head(s,'CLOSING · 마무리',
  [{text:'오성철강도 전통 제조업에서 ',options:{}},
   {text:'제조 서비스 회사로 다시 짓고 있습니다',options:{color:GOLD}}],
  {dark:true,acc:GOLD,sub:'오성철강 창립 때 저희가 수행했던 잠실 올림픽 스타디움도, 지금 다시 짓고 있습니다'});
const LW=3.55, CY=2.20, CH=2.70;
card(s,P,CY,LW,CH,{fill:PANEL,line:EDGE,lw:1.4});
T(s,'잠실 올림픽 스타디움',{x:P+0.20,y:2.34,w:3.15,h:0.24,fontSize:10,color:GRAY2,
  align:'center',charSpacing:0.8});
ell(s,1.505,2.66,1.98,1.12,{fill:'1B2740',line:GOLD,lw:2.2});
ell(s,1.905,2.84,1.18,0.76,{fill:NAVY,line:'3E4C66',lw:1.2});
T(s,'1983',{x:1.905,y:3.05,w:1.18,h:0.30,fontSize:13,bold:true,color:GOLD,align:'center'});
pill(s,P+0.78,3.92,1.98,'2026  ·  리모델링 중',GOLDD,GOLD,{fs:10.5});
rct(s,P+0.55,4.38,2.45,0.012,{fill:EDGE});
T(s,'지었던 회사가,  스스로를 다시 짓습니다',
  {x:P+0.20,y:4.50,w:3.15,h:0.34,fontSize:12.5,bold:true,color:WHITE,align:'center'});

const RX=P+3.85, RW=W-3.85, RXi=RX+0.32;
card(s,RX,CY,RW,CH,{fill:PANEL,line:EDGE,lw:1.4});
T(s,'THE LONG WAY HOME  ·  28년 만의 귀환',{x:RXi,y:2.42,w:RW-0.64,h:0.26,
  fontSize:10.5,bold:true,color:GRAY,charSpacing:1.2});
const bx=RXi+1.55, BMAX=4.95;
T(s,'오디세우스',{x:RXi,y:2.92,w:1.50,h:0.28,fontSize:12,bold:true,color:GRAY2});
bar(s,bx,2.90,BMAX*20/28,0.32,'334155');
T(s,'20년',{x:bx+BMAX*20/28+0.10,y:2.92,w:0.90,h:0.28,fontSize:13,bold:true,color:GRAY2});
T(s,'그 20년의 노하우로 더 강력한 왕국을 만들었습니다',{x:bx,y:3.28,w:4.2,h:0.24,
  fontSize:9,color:GRAY});
T(s,'저는',{x:RXi,y:3.88,w:1.50,h:0.30,fontSize:13.5,bold:true,color:WHITE});
const SEG=[[1.20,'312E81'],[2.55,IND],[1.20,GOLD]];
let sx=bx;
SEG.forEach(([w,c],i)=>{ bar(s,sx,3.84,w,0.42,c,i===1?0.02:0.06); sx+=w; });
T(s,'28년',{x:bx+BMAX+0.10,y:3.82,w:0.90,h:0.34,fontSize:18,bold:true,color:GOLD});
[['오성을 떠남',0,1.20],['KT · IT / AI / ROBOT',1.20,2.55],['오성으로 돌아옴',3.75,1.20]]
 .forEach(([t,o,w])=>T(s,t,{x:bx+o,y:4.34,w:w,h:0.24,fontSize:9,color:GRAY2,align:'center'}));
T(s,'그 28년의 기술로, 43년 된 오성철강과 함께 새로운 회사로 거듭나겠습니다',
  {x:RXi,y:4.62,w:RW-0.64,h:0.24,fontSize:10,color:GRAY,align:'center'});

card(s,P,5.20,W,1.25,{fill:GOLDD,line:GOLD,lw:1.6,r:0.10});
T(s,[{text:'AI는 우리에게 ',options:{color:WHITE}},{text:'꿈을 꾸게',options:{color:GOLD}},
     {text:' 만들어 주었습니다',options:{color:WHITE}}],
  {x:P+0.3,y:5.40,w:W-0.6,h:0.48,fontSize:23,bold:true,align:'center',valign:'middle'});
T(s,'꿈을 꿀 수 없던 구조가 바뀌었고,  그 자리에 꿈이 들어왔습니다',
  {x:P+0.3,y:5.94,w:W-0.6,h:0.30,fontSize:12.5,color:SOFT,align:'center'});
foot(s,'마무리',true);
}

/* ───────────────────────── 12 · 세 개의 꿈 · 감사합니다 (dark) ───────────────────────── */
{
const s=base(true);
rct(s,0,0,13.333,2.05,{fill:DEEP});
head(s,'THREE DREAMS · 세 개의 꿈',
  [{text:'이 꿈을, ',options:{}},{text:'4,000곳과 함께',options:{color:GOLD}},
   {text:' 꾸고 싶습니다',options:{}}],
  {dark:true,acc:GOLD,sub:'AI가 저희에게 준 것은 도구가 아니라, 꿈을 꿀 수 있다는 가능성이었습니다'});
const cw=3.66, gap=0.455, BOT=5.15;
const D=[
  ['01','외국인 근로자',['전문 엔지니어로 나아갈 수 있는','꿈을 꾸게 해주었고'],
   '직원 12명 중 5명이 외국인입니다',VIO,2.26],
  ['02','오성철강',['싸고 낮은 품질이 아니라,','높은 품질의 제조 서비스를','제공할 수 있는 꿈을 꾸게 해주었고'],
   '41개 서비스를 직접 만들었습니다  ·  외주 0',BLUB,2.76],
  ['03','4,000곳 이상의 철강 회사',['저희는 더 많은 꿈을 꾸고 싶고,','이 꿈을 국내 4,000곳 이상의','철강 회사가 같이','꾸게 하고 싶습니다'],
   '반월시화, 그리고 그 너머까지',GOLD,3.06],
];
const TOP=[];
D.forEach(([no,tt,body,note,c,h],i)=>{
  const x=P+i*(cw+gap), y=BOT-h, hot=(i===2);
  TOP.push(y);
  card(s,x,y,cw,h,{fill:hot?GOLDD:PANEL2,line:hot?GOLD:EDGE,lw:hot?2.2:1.4,r:0.10});
  rct(s,x,y,cw,0.06,{fill:c});
  pill(s,x+0.26,y+0.26,0.64,no,hot?GOLDD:NAVY,c,{fs:10.5});
  T(s,tt,{x:x+0.26,y:y+0.64,w:cw-0.52,h:0.34,fontSize:15.5,bold:true,color:hot?GOLD:WHITE});
  rct(s,x+0.26,y+1.06,cw-0.52,0.012,{fill:hot?'3A2C12':EDGE});
  body.forEach((ln,k)=>
    T(s,ln,{x:x+0.26,y:y+1.20+k*0.30,w:cw-0.52,h:0.30,fontSize:12.5,
      color:hot?WHITE:SOFT,bold:hot}));
  T(s,note,{x:x+0.26,y:y+1.20+body.length*0.30+0.16,w:cw-0.52,h:0.28,
    fontSize:9.5,color:hot?GOLD:GRAY});
});
arw(s,P+cw+0.10,TOP[0]+0.22,P+cw+gap-0.10,TOP[1]+0.22,'475569',2);
arw(s,P+2*cw+gap+0.10,TOP[1]+0.22,P+2*(cw+gap)-0.10,TOP[2]+0.22,GOLD,2.4);

T(s,'감사합니다',{x:P,y:5.62,w:5.2,h:0.86,fontSize:40,bold:true,color:WHITE,charSpacing:2.4});
T(s,[{text:'AI는 개발이 아니라, ',options:{color:WHITE}},{text:'발견',options:{color:GOLD}},
     {text:'이었습니다.',options:{color:WHITE}}],
  {x:P+5.4,y:5.80,w:W-5.4,h:0.34,fontSize:17,bold:true,align:'right'});
T(s,'그리고 발견은, 질문에서만 나옵니다',
  {x:P+5.4,y:6.20,w:W-5.4,h:0.28,fontSize:12,color:GRAY2,align:'right'});
foot(s,'마무리',true);
}

pptx.writeFile({ fileName: process.argv[2] || '오성철강_AI모델공장_스토리.pptx' })
  .then(f=>console.log('✅ 완료: '+f))
  .catch(e=>{ console.error('❌', e); process.exit(1); });
