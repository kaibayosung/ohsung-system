// 첫 번째 실패 — 장비를 바꿨습니다 (리디자인 1장 · 흰 배경)
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = '첫 번째 실패 — 장비를 바꿨습니다';

const F='맑은 고딕', P=0.72, W=11.89;
const WHITE='FFFFFF', TINT='F7F9FC', LINE='E2E8F0', LINE2='EDF1F6',
      INK='0F172A', INK2='334155', GRAY='64748B', GRAY2='94A3B8', SLATE='CBD5E1',
      NAVY='0B1220',
      RED='DC2626', REDL='FEF2F2', REDB='FCA5A5',
      GRN='059669', GRNL='ECFDF5', GRNB='6EE7B7',
      GOLD='F5B544', GOLDL='FFF8E8', GOLDB='FBD88B', GOLDD='B07A12';

function T(s,t,o={}){ s.addText(t,{fontFace:F,color:o.color||INK2,valign:o.valign||'top',
  lineSpacingMultiple:o.lsm||1.24,...o}); }
function card(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:o.r||0.09,
  fill:{color:o.fill||WHITE},
  line:o.line===null?{type:'none'}:{color:o.line||LINE,width:o.lw!==undefined?o.lw:1.6}}); }
function rct(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.rect,{x,y,w,h,fill:{color:o.fill||WHITE},
  line:o.line?{color:o.line,width:o.lw||1.4}:{type:'none'}}); }
function arw(s,x1,y1,x2,y2,c,w=2.6){
  s.addShape(pptx.ShapeType.line,{x:Math.min(x1,x2),y:Math.min(y1,y2),
    w:Math.abs(x2-x1)||0.008,h:Math.abs(y2-y1)||0.008,
    line:{color:c,width:w,endArrowType:'triangle'},flipH:x2<x1,flipV:y2<y1});
}

const s=pptx.addSlide();
rct(s,0,0,0.26,7.5,{fill:RED});
rct(s,0,2.02,13.333,0.014,{fill:LINE2});

// ── 헤드
rct(s,P,0.52,0.075,0.32,{fill:RED});
T(s,'FAILURE 01',{x:P+0.24,y:0.48,w:8,h:0.34,fontSize:13,bold:true,color:RED,charSpacing:2.4});
T(s,'생산성을 올리면 살아남는다고 생각했습니다',
  {x:P,y:0.92,w:W,h:0.32,fontSize:15,color:GRAY});
T(s,[{text:'첫 번째  —  ',options:{color:INK}},
     {text:'장비를 바꿨습니다',options:{color:RED}}],
  {x:P,y:1.28,w:W,h:0.66,fontSize:34,bold:true});

// ── 결과 4칸
const CY=2.20, CH=2.04, cw=(W-3*0.26)/4;
const M=[
  ['설비 투자','up',RED,WHITE,LINE,'크게 늘었습니다',INK,false],
  ['생산성','up',GRN,WHITE,LINE,'실제로 올랐습니다',INK,false],
  ['판매 가격','right',GRAY2,REDL,RED,'그대로였습니다',RED,true],
  ['이자 비용','up',RED,WHITE,LINE,'과다 발생',INK,false],
];
M.forEach(([lb,dir,c,bg,bd,val,vc,hot],i)=>{
  const x=P+i*(cw+0.26);
  card(s,x,CY,cw,CH,{fill:bg,line:bd,lw:hot?2.4:1.6});
  rct(s,x,CY,cw,0.075,{fill:hot?RED:c});
  T(s,lb,{x:x+0.26,y:CY+0.22,w:cw-0.52,h:0.32,fontSize:15,bold:true,color:hot?RED:GRAY});
  if(dir==='up'){
    s.addShape(pptx.ShapeType.upArrow,{x:x+cw/2-0.36,y:CY+0.64,w:0.72,h:0.86,
      fill:{color:c},line:{type:'none'}});
  } else {
    s.addShape(pptx.ShapeType.rightArrow,{x:x+cw/2-0.56,y:CY+0.90,w:1.12,h:0.40,
      fill:{color:c},line:{type:'none'}});
  }
  T(s,val,{x:x+0.20,y:CY+1.60,w:cw-0.40,h:0.36,fontSize:17,bold:true,
    color:vc,align:'center'});
});

// ── 세탁소 비유
const LY=4.66, LH=1.26, lw=(W-2*0.30)/3;
T(s,'세탁소로 비유하면',{x:P,y:4.30,w:6,h:0.28,fontSize:13.5,bold:true,
  color:GOLDD,charSpacing:0.8});
const L=[
  ['비싼 세탁기를','들여놔도',TINT,LINE,INK2,1.6],
  ['손님은 그 세탁기를','볼 수 없습니다',TINT,LINE,INK,1.6],
  ['그래서 세탁비를','못 올립니다',GOLDL,GOLD,GOLDD,2.4],
];
L.forEach(([a,b,bg,bd,fc,lwid],i)=>{
  const x=P+i*(lw+0.30);
  card(s,x,LY,lw,LH,{fill:bg,line:bd,lw:lwid});
  T(s,a,{x:x+0.28,y:LY+0.26,w:lw-0.56,h:0.34,fontSize:18,bold:true,color:fc});
  T(s,b,{x:x+0.28,y:LY+0.60,w:lw-0.56,h:0.34,fontSize:18,bold:true,color:fc});
  if(i<2) arw(s,x+lw+0.04,LY+LH/2,x+lw+0.26,LY+LH/2,SLATE,2.6);
});

// ── 밴드
card(s,P,6.08,W,0.72,{fill:NAVY,line:null,r:0.10});
T(s,[{text:'고객은 저희가 어떤 기계를 쓰는지 볼 방법이 없었습니다.   ',options:{color:WHITE}},
     {text:'생산성은 저희 안에서만 올랐습니다.',options:{color:GOLD}}],
  {x:P+0.30,y:6.08,w:W-0.60,h:0.72,fontSize:17,bold:true,align:'center',valign:'middle'});

rct(s,P,6.94,W,0.014,{fill:LINE});
T(s,'2. 두 번의 실패',{x:P,y:7.04,w:6,h:0.26,fontSize:10.5,bold:true,color:GRAY2,charSpacing:1.4});
T(s,'오성철강  ·  05',{x:P+W-3,y:7.04,w:3,h:0.26,fontSize:10.5,bold:true,
  color:GRAY2,align:'right',charSpacing:1.2});

pptx.writeFile({ fileName: process.argv[2] || '오성철강_첫번째실패_리디자인.pptx' })
  .then(f=>console.log('✅ 완료: '+f))
  .catch(e=>{ console.error('❌', e); process.exit(1); });
