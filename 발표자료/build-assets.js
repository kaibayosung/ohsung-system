// 그런데 빈손이 아니었습니다 — 실패가 남긴 세 가지 자산 (1장 · 흰 배경)
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = '그런데 빈손이 아니었습니다';

const F='맑은 고딕', P=0.72, W=11.89;
const WHITE='FFFFFF', LINE='E4E9F0', HAIR='EEF2F7',
      INK='0B1220', INK2='3B4657', GRAY='6B7688', GRAY2='9AA4B2',
      NAVY='0B1220', SOFT='C9D2DF',
      BLU='0E6BA8', BLUL='EAF3FA', BLUB='B9D7EA',
      VIO='5B21B6', VIOL='F4F0FF', VIOB='D3C4F5',
      GOLD='B8860B', GOLDL='FFFAEB', GOLDB='F2DDA4', GOLDS='F5B544';

function T(s,t,o={}){ s.addText(t,{fontFace:F,color:o.color||INK2,valign:o.valign||'top',
  lineSpacingMultiple:o.lsm||1.18,...o}); }
function card(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:o.r||0.10,
  fill:{color:o.fill||WHITE},
  line:o.line===null?{type:'none'}:{color:o.line||LINE,width:o.lw!==undefined?o.lw:1.3}}); }
function rct(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.rect,{x,y,w,h,fill:{color:o.fill||WHITE},
  line:o.line?{color:o.line,width:o.lw||1.2}:{type:'none'}}); }
function pill(s,x,y,w,t,fg,bg,o={}){
  s.addText(t,{x,y,w,h:o.h||0.32,fontSize:o.fs||11,bold:true,color:fg,fill:{color:bg},
    line:o.bd?{color:o.bd,width:1.2}:{type:'none'},align:o.al||'center',valign:'middle',
    fontFace:F,shape:pptx.ShapeType.roundRect,rectRadius:0.14});
}

const s=pptx.addSlide();

/* ───────── 헤드 ───────── */
T(s,'WHAT REMAINED',{x:P,y:0.44,w:6,h:0.30,fontSize:11.5,bold:true,
  color:GRAY2,charSpacing:3.6});
rct(s,P,0.84,W,0.014,{fill:INK});
T(s,[{text:'그런데 ',options:{color:INK}},
     {text:'빈손이 아니었습니다',options:{color:GOLD}}],
  {x:P,y:1.02,w:W,h:0.62,fontSize:36,bold:true});
T(s,'철판 가공 설비와 데이터 축적 현황',
  {x:P,y:1.72,w:W,h:0.32,fontSize:15,color:GRAY});

/* ───────── 3 패널 ───────── */
const GAP=0.42, colw=(W-2*GAP)/3;
const CX=[P, P+colw+GAP, P+2*(colw+GAP)];
const CY=2.30, PH=3.42, HD=0.54;
const AC=[BLU,VIO,GOLD], BG=[BLUL,VIOL,GOLDL], BD=[BLUB,VIOB,GOLDB];
const LB=['고정밀 설비 확보','AI 품질관리 데이터','공정 데이터 축적'];

LB.forEach((lb,i)=>{
  card(s,CX[i],CY,colw,PH,{fill:BG[i],line:BD[i],lw:1.4});
  card(s,CX[i],CY,colw,HD,{fill:AC[i],line:null,r:0.10});
  rct(s,CX[i],CY+0.32,colw,HD-0.32,{fill:AC[i]});
  T(s,'0'+(i+1),{x:CX[i]+0.24,y:CY,w:0.52,h:HD,fontSize:13,bold:true,
    color:WHITE,valign:'middle',charSpacing:0.8});
  T(s,lb,{x:CX[i]+0.78,y:CY,w:colw-0.98,h:HD,fontSize:16,bold:true,
    color:WHITE,valign:'middle'});
});

const IX=0.24, iw=colw-IX*2;

/* 01 · 설비 */
{
  const x=CX[0]+IX;
  pill(s,x,3.00,2.30,'1차 실패가 남긴 것',BLU,WHITE,{fs:11,h:0.32,bd:BLUB,al:'center'});
  T(s,[{text:'24',options:{fontSize:44}},{text:' / ',options:{fontSize:26}},
       {text:'7',options:{fontSize:44}}],
    {x:x,y:3.46,w:iw,h:0.70,bold:true,color:BLU});
  T(s,'지금도 쉬지 않고 가동 중입니다',{x:x,y:4.22,w:iw,h:0.28,fontSize:13,color:INK2});
  card(s,x,4.60,iw,1.06,{fill:WHITE,line:BLUB,lw:1.2});
  T(s,'생산 능력 자체 확보',{x:x+0.22,y:4.70,w:iw-0.44,h:0.34,fontSize:16.5,
    bold:true,color:INK});
  rct(s,x+0.22,5.10,iw-0.44,0.012,{fill:HAIR});
  T(s,'값은 못 올렸지만 능력은 남았습니다',
    {x:x+0.22,y:5.20,w:iw-0.44,h:0.28,fontSize:12.5,color:GRAY});
}

/* 02 · 품질 데이터 */
{
  const x=CX[1]+IX;
  pill(s,x,3.00,2.30,'2차 실패가 남긴 것',VIO,WHITE,{fs:11,h:0.32,bd:VIOB,al:'center'});
  T(s,'100%',{x:x,y:3.46,w:iw,h:0.70,fontSize:44,bold:true,color:VIO});
  T(s,'전수 검사  —  샘플이 아닙니다',{x:x,y:4.22,w:iw,h:0.28,fontSize:13,color:INK2});
  const sq=0.235, sg=0.075;
  for(let k=0;k<10;k++)
    rct(s,x+k*(sq+sg),4.54,sq,0.20,{fill:VIO});
  card(s,x,4.86,iw,0.40,{fill:WHITE,line:VIOB,lw:1.2});
  T(s,'표면 촬영 · 결함 위치 · 영상',
    {x:x+0.20,y:4.86,w:iw-0.40,h:0.40,fontSize:12.5,bold:true,color:INK,valign:'middle'});
  card(s,x,5.30,iw,0.40,{fill:WHITE,line:VIOB,lw:1.2});
  T(s,'두께 측정 — 매일, 모든 코일',
    {x:x+0.20,y:5.30,w:iw-0.40,h:0.40,fontSize:12.5,bold:true,color:INK,valign:'middle'});
}

/* 03 · 공정 데이터 */
{
  const x=CX[2]+IX;
  pill(s,x,3.00,2.30,'장비가 남긴 것',GOLD,WHITE,{fs:11,h:0.32,bd:GOLDB,al:'center'});
  T(s,[{text:'187',options:{fontSize:44}},{text:' 만 건',options:{fontSize:17}}],
    {x:x,y:3.46,w:iw,h:0.70,bold:true,color:GOLD});
  T(s,'공정 데이터 누적',{x:x,y:4.22,w:iw,h:0.28,fontSize:13,color:INK2});
  rct(s,x,4.58,iw,0.16,{fill:LINE});
  rct(s,x,4.58,iw*0.97,0.16,{fill:GOLDS});
  T(s,'설비 기록만  182만 줄',{x:x,y:4.82,w:iw,h:0.28,fontSize:12.5,bold:true,color:GOLD});
  card(s,x,5.16,iw,0.54,{fill:WHITE,line:GOLDB,lw:1.2});
  T(s,'2초마다 한 줄씩 실시간 기록',
    {x:x+0.20,y:5.16,w:iw-0.40,h:0.54,fontSize:13,bold:true,color:INK,valign:'middle'});
}

/* ───────── 풀블리드 결론 밴드 ───────── */
rct(s,0,5.98,13.333,0.92,{fill:NAVY});
rct(s,0,5.98,13.333,0.045,{fill:GOLDS});
T(s,[{text:'설비도, 데이터도, 품질 결과 자료까지 있었습니다.   ',options:{color:WHITE}},
     {text:'다만 가지고만 있었습니다.',options:{color:GOLDS}}],
  {x:0,y:5.98,w:13.333,h:0.92,fontSize:20,bold:true,align:'center',valign:'middle'});

T(s,'3. 실패가 남긴 것',{x:P,y:7.04,w:6,h:0.24,fontSize:10,bold:true,
  color:GRAY2,charSpacing:1.8});
T(s,'오성철강',{x:P+W-3,y:7.04,w:3,h:0.24,fontSize:10,bold:true,
  color:GRAY2,align:'right',charSpacing:1.4});

pptx.writeFile({ fileName: process.argv[2] || '오성철강_남은것_리디자인.pptx' })
  .then(f=>console.log('✅ 완료: '+f))
  .catch(e=>{ console.error('❌', e); process.exit(1); });
