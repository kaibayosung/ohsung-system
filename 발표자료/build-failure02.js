// 두 번째 실패 — 차별화 서비스를 만들었습니다 (1장 · 흰 배경)
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = '두 번째 실패 — 차별화 서비스를 만들었습니다';

const F='맑은 고딕', P=0.72, W=11.89;
const WHITE='FFFFFF', TINT='F8FAFC', LINE='E2E8F0', LINE2='EDF1F6',
      INK='0F172A', INK2='334155', GRAY='64748B', GRAY2='94A3B8', SLATE='CBD5E1',
      NAVY='0B1220', SOFT='D5DCE8',
      RED='DC2626', REDL='FEF2F2', REDB='FCA5A5',
      GRN='059669', GRNL='ECFDF5', GRNB='6EE7B7',
      GOLD='F5B544', GOLDL='FFF8E8', GOLDB='FBD88B', GOLDD='B07A12';

function T(s,t,o={}){ s.addText(t,{fontFace:F,color:o.color||INK2,valign:o.valign||'top',
  lineSpacingMultiple:o.lsm||1.22,...o}); }
function card(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:o.r||0.09,
  fill:{color:o.fill||WHITE},
  line:o.line===null?{type:'none'}:{color:o.line||LINE,width:o.lw!==undefined?o.lw:1.6}}); }
function rct(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.rect,{x,y,w,h,fill:{color:o.fill||WHITE},
  line:o.line?{color:o.line,width:o.lw||1.4}:{type:'none'}}); }
function ell(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.ellipse,{x,y,w,h,
  fill:{color:o.fill||WHITE},line:o.line?{color:o.line,width:o.lw||1.4}:{type:'none'}}); }
function pill(s,x,y,w,t,fg,bg,o={}){
  s.addText(t,{x,y,w,h:o.h||0.36,fontSize:o.fs||13,bold:true,color:fg,fill:{color:bg},
    line:o.bd?{color:o.bd,width:1.4}:{type:'none'},align:'center',valign:'middle',
    fontFace:F,shape:pptx.ShapeType.roundRect,rectRadius:0.16});
}

const s=pptx.addSlide();
rct(s,0,0,0.26,7.5,{fill:RED});

// ── 헤드
rct(s,P,0.52,0.075,0.32,{fill:RED});
T(s,'FAILURE 02',{x:P+0.24,y:0.48,w:8,h:0.34,fontSize:13,bold:true,color:RED,charSpacing:2.4});
T(s,'차별화 서비스를 만들면 값을 받을 수 있다고 생각했습니다',
  {x:P,y:0.90,w:W,h:0.32,fontSize:15,color:GRAY});
T(s,[{text:'두 번째  —  ',options:{color:INK}},
     {text:'차별화 서비스를 만들었습니다',options:{color:RED}}],
  {x:P,y:1.26,w:W,h:0.66,fontSize:34,bold:true});

/* ═══ 좌 · 기술은 성공 ═══ */
const LX=P, LW=4.30, CY=2.16, CH=3.80;
card(s,LX,CY,LW,CH,{fill:GRNL,line:GRNB,lw:2.0});
rct(s,LX,CY,LW,0.075,{fill:GRN});
pill(s,LX+0.28,CY+0.24,1.62,'기술은 성공',WHITE,GRN,{fs:13,h:0.34});

T(s,'코일센터 최초',{x:LX+0.28,y:CY+0.70,w:LW-0.56,h:0.36,fontSize:20,bold:true,color:INK});
T(s,'AI 기반 불량 측정',{x:LX+0.28,y:CY+1.04,w:LW-0.56,h:0.36,fontSize:20,bold:true,color:INK});

rct(s,LX+0.28,CY+1.46,LW-0.56,0.014,{fill:GRNB});

T(s,[{text:'250',options:{fontSize:44}},{text:'  m / 분',options:{fontSize:16}}],
  {x:LX+0.28,y:CY+1.56,w:LW-0.56,h:0.70,bold:true,color:GRN});
T(s,'이 속도로 지나가는 철판입니다',
  {x:LX+0.28,y:CY+2.34,w:LW-0.56,h:0.28,fontSize:13,color:INK2});

const bw=(LW-0.56-0.18)/2;
[['사람 눈','볼 수 없음',GRAY,WHITE,LINE],
 ['기계','해냈습니다',GRN,WHITE,GRNB]].forEach(([a,b,c,bg,bd],i)=>{
  const x=LX+0.28+i*(bw+0.18);
  card(s,x,CY+2.72,bw,0.60,{fill:bg,line:bd,lw:1.5});
  T(s,a,{x:x+0.14,y:CY+2.78,w:bw-0.28,h:0.24,fontSize:11,color:GRAY2,align:'center'});
  T(s,b,{x:x+0.14,y:CY+2.98,w:bw-0.28,h:0.28,fontSize:14,bold:true,color:c,align:'center'});
});

pill(s,LX+0.28,CY+3.42,LW-0.56,'AI 전환 공모전 대상 수상',GOLDD,GOLDL,{fs:14,h:0.36,bd:GOLDB});

/* ═══ 우 · 사업은 실패 ═══ */
const RX=P+LW+0.32;
pill(s,RX,CY+0.02,2.34,'그런데 사업은 실패',WHITE,RED,{fs:13,h:0.34});

const RAIL=RX+0.30, KX=RX+0.78, KW=P+W-KX;
rct(s,RAIL-0.025,CY+0.58,0.05,3.22,{fill:REDB});

const STEP=[
  [CY+0.50,1.24,'현장이 쓰지 않았습니다',
   ['결과를 보려면 다른 프로그램을 따로 켜야 했습니다.',
    '작업자는 이미 여러 시스템에 같은 내용을 반복 입력하고 있었습니다.'],false],
  [CY+1.86,1.02,'고객이 알지 못했습니다',
   ['전수 검사를 한다는 사실이 고객에게 전달될 통로가 없었습니다.'],false],
  [CY+3.08,0.72,'그래서 매출은 그대로였습니다',[],true],
];
STEP.forEach(([y,h,tt,dd,dark],i)=>{
  card(s,KX,y,KW,h,{fill:dark?NAVY:REDL,line:dark?null:REDB,lw:dark?0:1.8});
  ell(s,RAIL-0.23,y+h/2-0.23,0.46,0.46,{fill:dark?NAVY:RED});
  T(s,String(i+1),{x:RAIL-0.23,y:y+h/2-0.14,w:0.46,h:0.28,fontSize:14,bold:true,
    color:WHITE,align:'center'});
  if(dark){
    T(s,tt,{x:KX+0.34,y:y,w:KW-0.68,h:h,fontSize:24,bold:true,color:WHITE,valign:'middle'});
  } else {
    T(s,tt,{x:KX+0.34,y:y+0.20,w:KW-0.68,h:0.40,fontSize:22,bold:true,color:RED});
    dd.forEach((d,k)=>
      T(s,d,{x:KX+0.34,y:y+0.64+k*0.28,w:KW-0.68,h:0.28,fontSize:13.5,color:INK2}));
  }
});

/* ═══ 하단 밴드 ═══ */
card(s,P,6.10,W,0.70,{fill:NAVY,line:null,r:0.10});
T(s,[{text:'좋은 기술을 만들었지만,   ',options:{color:WHITE}},
     {text:'아무도 볼 수 없는 곳에 두었습니다.',options:{color:GOLD}}],
  {x:P+0.30,y:6.10,w:W-0.60,h:0.70,fontSize:18,bold:true,align:'center',valign:'middle'});

rct(s,P,6.92,W,0.014,{fill:LINE});
T(s,'2. 두 번의 실패',{x:P,y:7.02,w:6,h:0.26,fontSize:10.5,bold:true,color:GRAY2,charSpacing:1.4});
T(s,'오성철강  ·  07',{x:P+W-3,y:7.02,w:3,h:0.26,fontSize:10.5,bold:true,
  color:GRAY2,align:'right',charSpacing:1.2});

pptx.writeFile({ fileName: process.argv[2] || '오성철강_두번째실패_리디자인.pptx' })
  .then(f=>console.log('✅ 완료: '+f))
  .catch(e=>{ console.error('❌', e); process.exit(1); });
