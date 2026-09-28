// 통신사의 통합 관제를 공장에서 — AI Inside (1장 · 흰 배경)
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = '통신사의 통합 관제를 공장에서';

const F='맑은 고딕', P=0.72, W=11.89;
const WHITE='FFFFFF', LINE='E4E9F0', HAIR='EEF2F7', TINT='F8FAFC',
      INK='0B1220', INK2='3B4657', GRAY='6B7688', GRAY2='9AA4B2',
      NAVY='0B1220', SOFT='C9D2DF',
      BLU='0E6BA8', BLUL='EAF3FA', BLUB='B9D7EA', BLUS='38BDF8',
      IND='4F46E5', INDL='EEF0FF', INDB='CBCEFB',
      GOLD='F5B544', GOLDL='FFFAEB', GOLDB='F2DDA4', GOLDD='B8860B';

function T(s,t,o={}){ s.addText(t,{fontFace:F,color:o.color||INK2,valign:o.valign||'top',
  lineSpacingMultiple:o.lsm||1.18,...o}); }
function card(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:o.r||0.10,
  fill:{color:o.fill||WHITE},
  line:o.line===null?{type:'none'}:{color:o.line||LINE,width:o.lw!==undefined?o.lw:1.4}}); }
function rct(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.rect,{x,y,w,h,fill:{color:o.fill||WHITE},
  line:o.line?{color:o.line,width:o.lw||1.2}:{type:'none'}}); }
function pill(s,x,y,w,t,fg,bg,o={}){
  s.addText(t,{x,y,w,h:o.h||0.34,fontSize:o.fs||12,bold:true,color:fg,fill:{color:bg},
    line:o.bd?{color:o.bd,width:1.3}:{type:'none'},align:'center',valign:'middle',
    fontFace:F,shape:pptx.ShapeType.roundRect,rectRadius:0.15});
}

const s=pptx.addSlide();

/* ───────── 헤드 ───────── */
T(s,'FROM TELECOM TO FACTORY',{x:P,y:0.40,w:8,h:0.30,fontSize:12,bold:true,
  color:BLU,charSpacing:3.2});
rct(s,P,0.80,W,0.016,{fill:INK});
T(s,[{text:'통신사가 하던 ',options:{color:INK}},{text:'통합 관제',options:{color:BLU}},
     {text:'를, 공장에서 합니다',options:{color:INK}}],
  {x:P,y:0.92,w:W,h:0.58,fontSize:35,bold:true});

/* ───────── 좌우 비교 ───────── */
const AY=1.80, AH=1.50, cw=(W-0.40)/2;
[['TELECOM','통신사는',
  ['모든 장비를 네트워크로 연결해','현장에 가지 않아도 24시간 관제합니다'],BLU,BLUL,BLUB],
 ['MANUFACTURING','오성철강은',
  ['AI가 기존 장비에 데이터 수집·분석을 붙여','같은 방식의 통합 관제가 가능해집니다'],IND,INDL,INDB]]
 .forEach(([kick,who,lines,c,bg,bd],i)=>{
  const x=P+i*(cw+0.40);
  card(s,x,AY,cw,AH,{fill:bg,line:bd,lw:1.6});
  rct(s,x,AY,0.10,AH,{fill:c});
  T(s,kick,{x:x+0.34,y:AY+0.14,w:cw-0.68,h:0.26,fontSize:11,bold:true,
    color:c,charSpacing:2.4});
  T(s,who,{x:x+0.34,y:AY+0.40,w:cw-0.68,h:0.38,fontSize:21,bold:true,color:INK});
  lines.forEach((ln,k)=>
    T(s,ln,{x:x+0.34,y:AY+0.86+k*0.29,w:cw-0.68,h:0.29,fontSize:13.5,color:INK2}));
});

/* ───────── 3단계 흐름 ───────── */
const FY=3.52, FH=1.74, GAP=0.66, fw=(W-2*GAP)/3;
const FX=[P, P+fw+GAP, P+2*(fw+GAP)];
const FL=[
  ['STEP 01','기존 제조 장비','30년 된 설비도','바꾸지 않습니다',GRAY,WHITE,LINE,INK],
  ['STEP 02 · DATA','AI Inside','장비에 데이터 수집·분석을 붙여','정밀 제어로 바꿉니다',IND,INDL,INDB,IND],
  ['STEP 03','통합 관제','전 라인·전 코일을','한 화면에서 봅니다',BLU,BLU,BLU,WHITE],
];
FL.forEach(([kick,tt,a,b,c,bg,bd,fg],i)=>{
  const x=FX[i], hot=(i===2);
  card(s,x,FY,fw,FH,{fill:bg,line:bd,lw:hot?0:1.6});
  if(!hot) rct(s,x,FY,fw,0.08,{fill:c});
  T(s,kick,{x:x+0.30,y:FY+(hot?0.22:0.26),w:fw-0.60,h:0.26,fontSize:10.5,bold:true,
    color:hot?BLUB:c,charSpacing:2.0});
  T(s,tt,{x:x+0.30,y:FY+0.54,w:fw-0.60,h:0.44,fontSize:23,bold:true,color:fg});
  T(s,a,{x:x+0.30,y:FY+1.08,w:fw-0.60,h:0.28,fontSize:12.5,color:hot?BLUL:INK2});
  T(s,b,{x:x+0.30,y:FY+1.34,w:fw-0.60,h:0.28,fontSize:13,bold:true,
    color:hot?WHITE:INK});
});
for(let i=0;i<2;i++){
  s.addShape(pptx.ShapeType.rightArrow,{x:FX[i]+fw+0.14,y:FY+FH/2-0.20,w:0.38,h:0.40,
    fill:{color:i===0?INDB:BLUB},line:{type:'none'}});
}

/* ───────── 모니터링 포인트 ───────── */
T(s,[{text:'생산에 몰입하면 품질 확인이 어렵습니다.   ',options:{color:GRAY}},
     {text:'관제 화면이 객관적으로 대신 봅니다.',options:{color:INK}}],
  {x:0,y:5.42,w:13.333,h:0.30,fontSize:14,bold:true,align:'center'});

/* ───────── 결론 밴드 ───────── */
rct(s,0,5.80,13.333,1.10,{fill:NAVY});
rct(s,0,5.80,13.333,0.05,{fill:BLUS});
T(s,[{text:'장비를 바꾸지 않고,  ',options:{color:WHITE}},
     {text:'장비에 눈을 달았습니다',options:{color:BLUS}}],
  {x:0,y:5.96,w:13.333,h:0.44,fontSize:24,bold:true,align:'center'});
T(s,'통신사가 통신망을 관제하듯,  공장이 공정을 관제합니다',
  {x:0,y:6.48,w:13.333,h:0.30,fontSize:14,color:SOFT,align:'center'});

T(s,'AI 통합 관제',{x:P,y:7.04,w:6,h:0.24,fontSize:10,bold:true,
  color:GRAY2,charSpacing:1.8});
T(s,'오성철강',{x:P+W-3,y:7.04,w:3,h:0.24,fontSize:10,bold:true,
  color:GRAY2,align:'right',charSpacing:1.4});

pptx.writeFile({ fileName: process.argv[2] || '오성철강_통합관제.pptx' })
  .then(f=>console.log('✅ 완료: '+f))
  .catch(e=>{ console.error('❌', e); process.exit(1); });
