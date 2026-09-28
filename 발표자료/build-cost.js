// 비용 분석 — 항목별 정산표 (1장 · 흰 배경)
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = '비용 분석 — 총 32.5억 원';

const F='맑은 고딕', P=0.72, W=11.89;
const WHITE='FFFFFF', TINT='F8FAFC', LINE='E2E8F0', LINE2='EDF1F6',
      INK='0F172A', INK2='334155', GRAY='64748B', GRAY2='94A3B8', SLATE='CBD5E1',
      NAVY='0B1220', SOFT='D5DCE8',
      RED='DC2626', REDL='FEF2F2', REDB='FCA5A5', REDLT='FF6B6B',
      GOLD='F5B544';

function T(s,t,o={}){ s.addText(t,{fontFace:F,color:o.color||INK2,valign:o.valign||'top',
  lineSpacingMultiple:o.lsm||1.22,...o}); }
function card(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:o.r||0.08,
  fill:{color:o.fill||WHITE},
  line:o.line===null?{type:'none'}:{color:o.line||LINE,width:o.lw!==undefined?o.lw:1.4}}); }
function rct(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.rect,{x,y,w,h,fill:{color:o.fill||WHITE},
  line:o.line?{color:o.line,width:o.lw||1.4}:{type:'none'}}); }
function bar(s,x,y,w,h,c,r=0.05){ s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:r,
  fill:{color:c},line:{type:'none'}}); }
function pill(s,x,y,w,t,fg,bg,o={}){
  s.addText(t,{x,y,w,h:o.h||0.32,fontSize:o.fs||12,bold:true,color:fg,fill:{color:bg},
    line:o.bd?{color:o.bd,width:1.3}:{type:'none'},align:'center',valign:'middle',
    fontFace:F,shape:pptx.ShapeType.roundRect,rectRadius:0.14});
}

const s=pptx.addSlide();
rct(s,0,0,0.26,7.5,{fill:RED});

// ── 헤드
rct(s,P,0.52,0.075,0.32,{fill:RED});
T(s,'COST ANALYSIS',{x:P+0.24,y:0.48,w:8,h:0.34,fontSize:13,bold:true,color:RED,charSpacing:2.4});
T(s,'도입했을 때 실제로 발생하는 비용을 항목별로 계산했습니다',
  {x:P,y:0.90,w:W,h:0.32,fontSize:15,color:GRAY});
T(s,[{text:'계산해 보면  —  ',options:{color:INK}},
     {text:'32.5억 원 손실입니다',options:{color:RED}}],
  {x:P,y:1.26,w:W,h:0.66,fontSize:34,bold:true});

// ── 표 좌표
const CX1=P, CW1=3.30;                 // 항목
const CX2=P+3.30, CW2=5.10;            // 세부 내역
const CX3=P+8.40, CW3=W-8.40;          // 금액

// 헤더 행
const HY=2.14;
T(s,'항  목',{x:CX1+0.30,y:HY,w:CW1,h:0.34,fontSize:12,bold:true,color:GRAY2,
  charSpacing:1.4,valign:'middle'});
T(s,'세 부  내 역',{x:CX2,y:HY,w:CW2,h:0.34,fontSize:12,bold:true,color:GRAY2,
  charSpacing:1.4,valign:'middle'});
T(s,'금  액',{x:CX3,y:HY,w:CW3-0.24,h:0.34,fontSize:12,bold:true,color:GRAY2,
  charSpacing:1.4,align:'right',valign:'middle'});
rct(s,P,HY+0.40,W,0.022,{fill:INK});

// ── 본문 행
const RY=2.64, RH=0.94, BMAX=4.40;
const ROWS=[
  ['01','도입 및 구축 비용','장비  10억 원   +   부지  18억 원','− 28억 원',28,RED],
  ['02','기회 비용','연 매출 9억 원 × 50%   ( 6개월 가공 중단 )','− 4.5억 원',4.5,RED],
  ['03','연간 운영비 절감','초기 안정화 비용 발생으로  절감 불가','0 원',0,GRAY],
];
ROWS.forEach(([no,lb,det,amt,val,c],i)=>{
  const y=RY+i*RH;
  if(i%2===1) rct(s,P,y,W,RH,{fill:TINT});
  rct(s,P,y+RH,W,0.014,{fill:LINE});
  pill(s,CX1,y+RH/2-0.16,0.54,no,RED,REDL,{fs:11,h:0.32,bd:REDB});
  T(s,lb,{x:CX1+0.72,y:y,w:CW1-0.80,h:RH,fontSize:17,bold:true,color:INK,valign:'middle'});
  T(s,det,{x:CX2,y:y+0.16,w:CW2-0.30,h:0.34,fontSize:13.5,color:INK2});
  // 비중 막대
  rct(s,CX2,y+0.60,BMAX,0.12,{fill:LINE2});
  if(val>0) bar(s,CX2,y+0.60,BMAX*val/28,0.12,c);

  T(s,amt,{x:CX3,y:y,w:CW3-0.24,h:RH,fontSize:28,bold:true,color:c,
    align:'right',valign:'middle'});
});

// ── 합계 행
const TY=RY+3*RH+0.26, TH=1.16;
card(s,P,TY,W,TH,{fill:NAVY,line:null,r:0.09});
rct(s,P,TY,0.09,TH,{fill:RED});
T(s,'종합 결론',{x:CX1+0.42,y:TY+0.22,w:3.0,h:0.42,fontSize:21,bold:true,color:WHITE});
T(s,'28억 ( 투자 )   +   4.5억 ( 가공 중단 )   +   0 ( 절감 )',
  {x:CX1+0.42,y:TY+0.68,w:6.2,h:0.30,fontSize:13.5,color:SOFT});
T(s,[{text:'−',options:{fontSize:26}},{text:' 32.5억 원',options:{fontSize:38}}],
  {x:CX3-0.50,y:TY,w:CW3+0.26,h:TH,bold:true,color:REDLT,align:'right',valign:'middle'});

rct(s,P,6.92,W,0.014,{fill:LINE});
T(s,'비용 분석',{x:P,y:7.02,w:6,h:0.26,fontSize:10.5,bold:true,color:GRAY2,charSpacing:1.4});
T(s,'오성철강',{x:P+W-3,y:7.02,w:3,h:0.26,fontSize:10.5,bold:true,
  color:GRAY2,align:'right',charSpacing:1.2});

pptx.writeFile({ fileName: process.argv[2] || '오성철강_비용분석.pptx' })
  .then(f=>console.log('✅ 완료: '+f))
  .catch(e=>{ console.error('❌', e); process.exit(1); });
