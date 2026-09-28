// 마무리(클로징) 리디자인 — 2장 / 인포그래픽 강화
// 실행: node build-closing.js [파일명]
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = '오성철강 — 마무리';

const F='맑은 고딕', P=0.72, W=11.89;
const NAVY='0B1220', PANEL='121D33', PANEL2='16233C', EDGE='2A3A55',
      WHITE='FFFFFF', SOFT='CBD5E1', GRAY='64748B', GRAY2='94A3B8',
      GOLD='F5B544', GOLDD='1A1406',
      IND='4F46E5', VIO='7C3AED', BLU='38BDF8';

let _n=39;
function base(){ const s=pptx.addSlide(); s.background={color:NAVY}; _n++; return s; }
function T(s,t,o={}){ s.addText(t,{fontFace:F,color:o.color||SOFT,valign:o.valign||'top',
  lineSpacingMultiple:o.lsm||1.35,...o}); }
function card(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:o.r||0.08,
  fill:{color:o.fill||PANEL},
  line:o.line===null?{type:'none'}:{color:o.line||EDGE,width:o.lw!==undefined?o.lw:1.4}}); }
function rct(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.rect,{x,y,w,h,fill:{color:o.fill||WHITE},
  line:o.line?{color:o.line,width:o.lw||1.4}:{type:'none'}}); }
function bar(s,x,y,w,h,c,r=0.06){ s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:r,
  fill:{color:c},line:{type:'none'}}); }
function ell(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.ellipse,{x,y,w,h,
  fill:{color:o.fill||NAVY},line:o.line?{color:o.line,width:o.lw||1.4}:{type:'none'}}); }
function arw(s,x1,y1,x2,y2,c=GRAY,w=2){
  s.addShape(pptx.ShapeType.line,{x:Math.min(x1,x2),y:Math.min(y1,y2),
    w:Math.abs(x2-x1)||0.008,h:Math.abs(y2-y1)||0.008,
    line:{color:c,width:w,endArrowType:'triangle'},flipH:x2<x1,flipV:y2<y1});
}
function head(s,kicker,runs,acc){
  rct(s,P,0.60,0.055,0.26,{fill:acc});
  T(s,kicker,{x:P+0.20,y:0.56,w:8,h:0.30,fontSize:11.5,bold:true,color:acc,charSpacing:1.6});
  T(s,runs,{x:P,y:1.26,w:W,h:0.62,fontSize:29,bold:true,color:WHITE,lsm:1.14});
}
function foot(s,sec){
  rct(s,P,6.94,W,0.012,{fill:EDGE});
  T(s,sec,{x:P,y:7.02,w:6,h:0.26,fontSize:9.5,bold:true,color:GRAY,charSpacing:1.4});
  T(s,'오성철강  ·  '+_n,{x:P+W-3,y:7.02,w:3,h:0.26,fontSize:9.5,bold:true,
    color:GRAY,align:'right',charSpacing:1.2});
}

/* ══════════════════════════════════════════════════════════════
   40 · 다시 짓고 있습니다
   ══════════════════════════════════════════════════════════════ */
{
const s=base();
rct(s,0,0,13.333,2.05,{fill:'101B31'});

head(s,'CLOSING · 마무리',
  [{text:'오성철강도 전통 제조업에서 ',options:{}},
   {text:'제조 서비스 회사로 다시 짓고 있습니다',options:{color:GOLD}}],GOLD);
T(s,'오성철강 창립 때 저희가 수행했던 잠실 올림픽 스타디움도, 지금 다시 짓고 있습니다',
  {x:P,y:0.96,w:W,h:0.28,fontSize:13,color:GRAY2});

// ── 좌 · 경기장 ──
const LW=3.55, CY=2.20, CH=2.70;
card(s,P,CY,LW,CH,{fill:PANEL});
T(s,'잠실 올림픽 스타디움',{x:P+0.20,y:2.34,w:3.15,h:0.24,fontSize:10,color:GRAY2,
  align:'center',charSpacing:0.8});
ell(s,1.505,2.66,1.98,1.12,{fill:'1B2740',line:GOLD,lw:2.2});
ell(s,1.905,2.84,1.18,0.76,{fill:NAVY,line:'3E4C66',lw:1.2});
T(s,'1983',{x:1.905,y:3.05,w:1.18,h:0.30,fontSize:13,bold:true,color:GOLD,align:'center'});
s.addText('2026  ·  리모델링 중',{x:P+0.78,y:3.92,w:1.98,h:0.30,fontSize:10.5,bold:true,
  color:'1A1406',fill:{color:GOLD},line:{type:'none'},align:'center',valign:'middle',
  fontFace:F,shape:pptx.ShapeType.roundRect,rectRadius:0.14});
rct(s,P+0.55,4.38,2.45,0.012,{fill:EDGE});
T(s,'지었던 회사가,  스스로를 다시 짓습니다',
  {x:P+0.20,y:4.50,w:3.15,h:0.34,fontSize:12.5,bold:true,color:WHITE,align:'center'});

// ── 우 · 28년 만의 귀환 ──
const RX=P+3.85, RW=W-3.85, RXi=RX+0.32;
card(s,RX,CY,RW,CH,{fill:PANEL});
T(s,'THE LONG WAY HOME  ·  28년 만의 귀환',{x:RXi,y:2.42,w:RW-0.64,h:0.26,
  fontSize:10.5,bold:true,color:GRAY,charSpacing:1.2});

const bx=RXi+1.55, BMAX=4.95;
// 오디세우스
T(s,'오디세우스',{x:RXi,y:2.92,w:1.50,h:0.28,fontSize:12,bold:true,color:GRAY2});
bar(s,bx,2.90,BMAX*20/28,0.32,'334155');
T(s,'20년',{x:bx+BMAX*20/28+0.10,y:2.92,w:0.90,h:0.28,fontSize:13,bold:true,color:GRAY2});
T(s,'트로이에서 이타카까지',{x:bx,y:3.28,w:3.4,h:0.24,fontSize:9,color:GRAY});

// 저
T(s,'저는',{x:RXi,y:3.88,w:1.50,h:0.30,fontSize:13.5,bold:true,color:WHITE});
const SEG=[[1.20,'312E81'],[2.55,IND],[1.20,GOLD]];
let sx=bx;
SEG.forEach(([w,c],i)=>{ bar(s,sx,3.84,w,0.42,c,i===0||i===2?0.06:0.02); sx+=w; });
T(s,'28년',{x:bx+BMAX+0.10,y:3.82,w:0.90,h:0.34,fontSize:18,bold:true,color:GOLD});
[['오성을 떠남',0,1.20],['통신 · IT 28년',1.20,2.55],['오성으로 돌아옴',3.75,1.20]]
 .forEach(([t,o,w])=>{
  T(s,t,{x:bx+o,y:4.34,w:w,h:0.24,fontSize:9,color:GRAY2,align:'center'});
 });
T(s,'같은 회사로, 같은 자리로 — 다만 이번에는 다른 눈으로',
  {x:RXi,y:4.62,w:RW-0.64,h:0.24,fontSize:10,color:GRAY,align:'center'});

// ── 밴드 ──
card(s,P,5.20,W,1.25,{fill:GOLDD,line:GOLD,lw:1.6,r:0.10});
T(s,[{text:'AI는 우리에게 ',options:{color:WHITE}},
     {text:'꿈을 꾸게',options:{color:GOLD}},
     {text:' 만들어 주었습니다',options:{color:WHITE}}],
  {x:P+0.3,y:5.40,w:W-0.6,h:0.48,fontSize:23,bold:true,align:'center',valign:'middle'});
T(s,'두 번의 실패가 자산을 남겼고,  AI가 그 자산에 물어볼 방법을 가져다주었습니다',
  {x:P+0.3,y:5.94,w:W-0.6,h:0.30,fontSize:12.5,color:SOFT,align:'center'});

foot(s,'마무리');
}

/* ══════════════════════════════════════════════════════════════
   41 · 세 개의 꿈 · 감사합니다
   ══════════════════════════════════════════════════════════════ */
{
const s=base();
rct(s,0,0,13.333,2.05,{fill:'101B31'});

head(s,'THREE DREAMS · 세 개의 꿈',
  [{text:'이 꿈을, ',options:{}},
   {text:'4,000곳과 함께',options:{color:GOLD}},
   {text:' 꾸고 싶습니다',options:{}}],GOLD);
T(s,'AI가 저희에게 준 것은 도구가 아니라, 꿈을 꿀 수 있다는 가능성이었습니다',
  {x:P,y:0.96,w:W,h:0.28,fontSize:13,color:GRAY2});

const cw=3.66, gap=0.455, BOT=5.15;
const D=[
  ['01','외국인 근로자',['전문 엔지니어로 나아갈 수 있는','꿈을 꾸게 해주었고'],
   '직원 12명 중 5명이 외국인입니다',VIO,2.26],
  ['02','오성철강',['싸고 낮은 품질이 아니라,','높은 품질의 제조 서비스를','제공할 수 있는 꿈을 꾸게 해주었고'],
   '41개 서비스를 직접 만들었습니다  ·  외주 0',BLU,2.76],
  ['03','4,000곳 이상의 철강 회사',['저희는 더 많은 꿈을 꾸고 싶고,','이 꿈을 국내 4,000곳 이상의','철강 회사가 같이','꾸게 하고 싶습니다'],
   '반월시화, 그리고 그 너머까지',GOLD,3.06],
];
const TOP=[];
D.forEach(([no,tt,body,note,c,h],i)=>{
  const x=P+i*(cw+gap), y=BOT-h, hot=(i===2);
  TOP.push(y);
  card(s,x,y,cw,h,{fill:hot?'1A1406':PANEL2,line:hot?GOLD:EDGE,lw:hot?2.2:1.4,r:0.10});
  rct(s,x,y,cw,0.06,{fill:c});
  s.addText(no,{x:x+0.26,y:y+0.26,w:0.64,h:0.28,fontSize:10.5,bold:true,
    color:hot?'1A1406':WHITE,fill:{color:c},line:{type:'none'},align:'center',valign:'middle',
    fontFace:F,shape:pptx.ShapeType.roundRect,rectRadius:0.13});
  T(s,tt,{x:x+0.26,y:y+0.64,w:cw-0.52,h:0.34,fontSize:15.5,bold:true,color:hot?GOLD:WHITE});
  rct(s,x+0.26,y+1.06,cw-0.52,0.012,{fill:hot?'3A2C12':EDGE});
  body.forEach((ln,k)=>{
    T(s,ln,{x:x+0.26,y:y+1.20+k*0.30,w:cw-0.52,h:0.30,fontSize:12.5,
      color:hot?WHITE:SOFT,bold:hot});
  });
  T(s,note,{x:x+0.26,y:y+1.20+body.length*0.30+0.16,w:cw-0.52,h:0.28,
    fontSize:9.5,color:hot?GOLD:GRAY});
});
// 상승 화살표
arw(s,P+cw+0.10,TOP[0]+0.22,P+cw+gap-0.10,TOP[1]+0.22,'475569',2);
arw(s,P+2*cw+gap+0.10,TOP[1]+0.22,P+2*(cw+gap)-0.10,TOP[2]+0.22,GOLD,2.4);

// ── 감사합니다 ──
T(s,'감사합니다',{x:P,y:5.62,w:5.2,h:0.86,fontSize:40,bold:true,color:WHITE,
  charSpacing:2.4});
T(s,[{text:'AI는 개발이 아니라, ',options:{color:WHITE}},
     {text:'발견',options:{color:GOLD}},
     {text:'이었습니다.',options:{color:WHITE}}],
  {x:P+5.4,y:5.80,w:W-5.4,h:0.34,fontSize:17,bold:true,align:'right'});
T(s,'그리고 발견은, 질문에서만 나옵니다',
  {x:P+5.4,y:6.20,w:W-5.4,h:0.28,fontSize:12,color:GRAY2,align:'right'});

foot(s,'마무리');
}

pptx.writeFile({ fileName: process.argv[2] || '오성철강_마무리_리디자인.pptx' })
  .then(f=>console.log('✅ 완료: '+f))
  .catch(e=>{ console.error('❌', e); process.exit(1); });
