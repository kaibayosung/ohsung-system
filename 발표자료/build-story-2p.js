// 오성철강 — 「자체개발형 AI 모델공장」 요청 (2장 압축판)
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = '오성철강 — 자체개발형 AI 모델공장 (2장)';

const F='맑은 고딕', P=0.72, W=11.89;
const NAVY='0B1220', DEEP='101B31', PANEL='121D33', PANEL2='16233C', EDGE='2A3A55',
      INK='0F172A', INK2='334155', GRAY='64748B', GRAY2='94A3B8',
      LINE='E2E8F0', TINT='F8FAFC', WHITE='FFFFFF', SOFT='CBD5E1',
      IND='4F46E5', INDL='EEF0FF', INDB='C7CBFF',
      GOLD='F5B544', GOLDL='FFF8E8', GOLDB='FBD88B', GOLDD='1A1406',
      RED='DC2626', REDL='FEF2F2', REDB='FCA5A5',
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
  T(s,runs,{x:P,y:o.sub?1.28:1.02,w:W,h:0.60,fontSize:o.size||27,bold:true,
    color:dark?WHITE:INK,lsm:1.12});
}
function foot(s,sec,dark){
  rct(s,P,6.94,W,0.012,{fill:dark?EDGE:LINE});
  T(s,sec,{x:P,y:7.02,w:6,h:0.26,fontSize:9.5,bold:true,color:dark?GRAY:GRAY2,charSpacing:1.4});
  T(s,'오성철강  ·  '+_n,{x:P+W-3,y:7.02,w:3,h:0.26,fontSize:9.5,bold:true,
    color:dark?GRAY:GRAY2,align:'right',charSpacing:1.2});
}

/* ══════════════════ 1 · Why 오성철강 ══════════════════ */
{
const s=base();
head(s,'WHY OHSUNG',
  [{text:'Why ',options:{}},{text:'오성철강',options:{color:IND}},{text:' ?',options:{}}],
  {sub:'제조업 AI 프로젝트는 왜 실패하는가, 그리고 오성철강은 왜 다른가'});

const CY=2.00, PH=3.96, LWd=5.30;
// ── 좌 · 실패하는 이유
card(s,P,CY,LWd,PH,{fill:TINT,line:LINE});
T(s,'제조업 대상 AI 프로젝트가 실패하는 이유',
  {x:P+0.24,y:CY+0.16,w:LWd-0.48,h:0.26,fontSize:12,bold:true,color:RED,charSpacing:0.4});
const FAIL=[
  ['01','요구사항 정의가 어렵습니다',
   ['개발사와 제조사는 계약 전에 범위 · 비용 · 일정을 확정합니다.',
    '그러나 AI는 발견을 통해서만 모델이 만들어집니다.',
    '두 회사가 다르면 기간 안에 끝내야 해서 혁신이 불가능합니다.']],
  ['02','종료 후 업그레이드가 멈춥니다',
   ['소량 다품종 시장에 하나의 솔루션으로 다 되는 일은 없습니다.',
    '업그레이드에는 추가 계약이 필요하지만 현실적으로 되지 않고,',
    '그 결과 최적화 작업 자체가 멈춥니다.']],
];
FAIL.forEach(([no,tt,lines],i)=>{
  const y=CY+0.50+i*1.72;
  card(s,P+0.24,y,LWd-0.48,1.62,{fill:WHITE,line:REDB,lw:1.4});
  pill(s,P+0.42,y+0.16,0.62,no,WHITE,RED,{fs:9.5});
  T(s,tt,{x:P+1.14,y:y+0.14,w:LWd-1.38,h:0.30,fontSize:14,bold:true,color:INK});
  lines.forEach((ln,k)=>
    T(s,ln,{x:P+0.42,y:y+0.58+k*0.30,w:LWd-0.84,h:0.30,fontSize:10.5,color:INK2}));
});

// ── 우 · Why 오성철강
const RX=P+LWd+0.32, RW=W-LWd-0.32, ch=0.90, gy=0.12;
const WHY=[
  ['1','개발사 없이 개발 가능',
   '43년 제조 전문가와 28년 AI/ROBOT 전문가를 한 회사가 함께 보유 — 분할손이 없습니다',IND],
  ['2','데이터 수집 기반 완료',
   '3개 공정 중 2개 공정에 Vision 품질 + PLC 데이터 — 품질 · 장비운용 · 가공규격 확보',BLU],
  ['3','임직원들의 참여 의지',
   '직원 12명 중 5명이 외국인 — 현장에서 요구가 올라오고, 40여 개 서비스가 나왔습니다',VIO],
];
WHY.forEach(([no,tt,dd,c],i)=>{
  const y=CY+i*(ch+gy);
  card(s,RX,y,RW,ch,{fill:WHITE,line:LINE});
  rct(s,RX,y,0.06,ch,{fill:c});
  pill(s,RX+0.24,y+0.16,0.40,no,WHITE,c,{fs:9.5});
  T(s,tt,{x:RX+0.74,y:y+0.13,w:RW-0.98,h:0.30,fontSize:14,bold:true,color:INK});
  T(s,dd,{x:RX+0.24,y:y+0.50,w:RW-0.48,h:0.30,fontSize:10.5,color:INK2});
});
const y4=CY+3*(ch+gy);
card(s,RX,y4,RW,ch,{fill:NAVY,line:null});
rct(s,RX,y4,0.06,ch,{fill:GOLD});
pill(s,RX+0.24,y4+0.16,0.40,'4',NAVY,GOLD,{fs:9.5});
T(s,'연구실 프로세스 운용으로 최적화',{x:RX+0.74,y:y4+0.13,w:RW-0.98,h:0.30,
  fontSize:14,bold:true,color:WHITE});
const FL=['아이디어 발굴','AI 개발','상용 적용','문제점 도출','서비스 개선','상용 적용'];
let fx=RX+0.24;
FL.forEach((t,i)=>{
  const fw=0.098*t.length+0.26, last=(i===5);
  pill(s,fx,y4+0.50,fw,t,last?NAVY:WHITE,last?GOLD:PANEL2,{fs:8,h:0.26,bd:last?null:EDGE});
  fx+=fw;
  if(i<5){ arw(s,fx+0.02,y4+0.63,fx+0.13,y4+0.63,GRAY,1.4); fx+=0.15; }
});

card(s,P,6.08,W,0.72,{fill:NAVY,line:null,r:0.09});
T(s,[{text:'솔루션을 사는 공장이 아니라,  ',options:{color:WHITE}},
     {text:'스스로 만들고 스스로 고치는 공장입니다',options:{color:GOLD}}],
  {x:P+0.3,y:6.08,w:W-0.6,h:0.72,fontSize:17,bold:true,align:'center',valign:'middle'});
foot(s,'Why 오성철강');
}

/* ══════════════════ 2 · 스토리 · 요청 · 감사합니다 ══════════════════ */
{
const s=base(true);
rct(s,0,0,13.333,2.00,{fill:DEEP});
head(s,'OUR STORY & REQUEST',
  [{text:'「자체개발형 AI 모델공장」 ',options:{}},
   {text:'시범 지정을 요청드립니다',options:{color:GOLD}}],
  {dark:true,acc:GOLD,
   sub:'솔루션을 사주는 지원이 아니라, 공장이 직접 물어볼 수 있는 역량에 투자하는 지원입니다'});

// ── 스토리 4단계
const SY=1.94, sh=1.48, sw=(W-3*0.22)/4;
const STORY=[
  ['1983','잠실 주경기장을 지으며 창립','짓는 일로 시작한 회사입니다',
   '그 경기장은 지금 리모델링 중입니다',GOLD,PANEL],
  ['28년','오성으로 돌아오는 데 28년','KT에서 IT · AI · ROBOT',
   '오디세우스는 20년이 걸렸습니다',BLUB,PANEL],
  ['왜 떠나 있었나','공장장만 아는 설비','무기 없음 · 고객이 못 봄',
   '오성철강은 늙어갔고 작아져 갔습니다',REDB,'1A0A0A'],
  ['그리고 AI','AI가 이 셋을 바꿨습니다','화면 판정 · 전수 품질 · 24시간',
   '이로써 우리는 꿈을 꾸게 되었습니다',GOLD,GOLDD],
];
STORY.forEach(([t1,l1,l2,note,c,bg],i)=>{
  const x=P+i*(sw+0.22), hot=(i===3), bad=(i===2);
  card(s,x,SY,sw,sh,{fill:bg,line:hot?GOLD:(bad?RED:EDGE),lw:hot||bad?1.8:1.4,r:0.09});
  T(s,t1,{x:x+0.22,y:SY+0.16,w:sw-0.44,h:0.34,fontSize:t1.length>4?15:22,bold:true,color:c});
  T(s,l1,{x:x+0.22,y:SY+0.58,w:sw-0.44,h:0.26,fontSize:10.5,color:SOFT});
  T(s,l2,{x:x+0.22,y:SY+0.82,w:sw-0.44,h:0.26,fontSize:10.5,color:SOFT});
  rct(s,x+0.22,SY+1.08,sw-0.44,0.012,{fill:hot?'3A2C12':EDGE});
  T(s,note,{x:x+0.22,y:SY+1.16,w:sw-0.44,h:0.26,fontSize:10,bold:true,color:c});
  if(i<3) arw(s,x+sw+0.03,SY+sh/2,x+sw+0.19,SY+sh/2,i===2?GOLD:GRAY,2);
});

// ── 세 개의 꿈
const DY=3.80, dh=1.26, dw=(W-2*0.26)/3;
T(s,'AI는 우리에게 꿈을 꾸게 만들어 주었습니다  —  세 개의 꿈',
  {x:P,y:DY-0.38,w:8,h:0.26,fontSize:11,bold:true,color:GOLD,charSpacing:0.6});
const D=[
  ['외국인 근로자','전문 엔지니어로 나아갈 수 있는','꿈을 꾸게 해주었고',VIOB,PANEL2,false],
  ['오성철강','싸고 낮은 품질이 아니라 고품질','제조 서비스를 제공할 꿈을 꾸게',BLUB,PANEL2,false],
  ['4,000곳 이상의 철강 회사','이 꿈을 국내 4,000곳 이상이','같이 꾸게 하고 싶습니다',GOLD,GOLDD,true],
];
D.forEach(([tt,a,b,c,bg,hot],i)=>{
  const x=P+i*(dw+0.26);
  card(s,x,DY,dw,dh,{fill:bg,line:hot?GOLD:EDGE,lw:hot?2.0:1.4,r:0.09});
  rct(s,x,DY,dw,0.055,{fill:c});
  T(s,tt,{x:x+0.24,y:DY+0.18,w:dw-0.48,h:0.32,fontSize:14.5,bold:true,color:hot?GOLD:WHITE});
  T(s,a,{x:x+0.24,y:DY+0.58,w:dw-0.48,h:0.26,fontSize:11.5,color:hot?WHITE:SOFT,bold:hot});
  T(s,b,{x:x+0.24,y:DY+0.84,w:dw-0.48,h:0.26,fontSize:11.5,color:hot?WHITE:SOFT,bold:hot});
});

// ── 요청 + 감사합니다
card(s,P,5.18,W,0.92,{fill:GOLDD,line:GOLD,lw:1.8,r:0.09});
T(s,[{text:'이에 오성철강이 ',options:{color:WHITE}},
     {text:'많은 발견',options:{color:GOLD}},
     {text:'을 할 수 있도록, 많은 지원 부탁드립니다',options:{color:WHITE}}],
  {x:P+0.3,y:5.18,w:W-0.6,h:0.92,fontSize:20,bold:true,align:'center',valign:'middle'});

T(s,'감사합니다',{x:P,y:6.24,w:5.0,h:0.58,fontSize:27,bold:true,color:WHITE,charSpacing:2.0});
T(s,[{text:'AI는 개발이 아니라, ',options:{color:WHITE}},{text:'발견',options:{color:GOLD}},
     {text:'이었습니다.  그리고 발견은, 질문에서만 나옵니다',options:{color:GRAY2}}],
  {x:P+5.2,y:6.36,w:W-5.2,h:0.32,fontSize:13,bold:true,align:'right'});
foot(s,'요청 · 마무리',true);
}

pptx.writeFile({ fileName: process.argv[2] || '오성철강_AI모델공장_2장.pptx' })
  .then(f=>console.log('✅ 완료: '+f))
  .catch(e=>{ console.error('❌', e); process.exit(1); });
