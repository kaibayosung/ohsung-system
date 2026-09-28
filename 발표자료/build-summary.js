// ONE PAGE SUMMARY — 4단계 패널 구조 (구분 명확 + 정제된 마감)
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = '한 장 요약';

const F='맑은 고딕', P=0.72, W=11.89;
const WHITE='FFFFFF', LINE='E4E9F0', HAIR='EEF2F7',
      INK='0B1220', INK2='3B4657', GRAY='6B7688', GRAY2='9AA4B2',
      NAVY='0B1220', SOFT='C9D2DF',
      RED='D92D20', REDL='FEF3F2', REDB='FBCFCB',
      GOLD='B8860B', GOLDL='FFFAEB', GOLDB='F2DDA4', GOLDS='F5B544',
      IND='4F46E5', INDL='EEF0FF', INDB='CBCEFB',
      GRN='047857', GRNL='ECFDF5', GRNB='A7E8CD';

function T(s,t,o={}){ s.addText(t,{fontFace:F,color:o.color||INK2,valign:o.valign||'top',
  lineSpacingMultiple:o.lsm||1.18,...o}); }
function card(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:o.r||0.10,
  fill:{color:o.fill||WHITE},
  line:o.line===null?{type:'none'}:{color:o.line||LINE,width:o.lw!==undefined?o.lw:1.3}}); }
function rct(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.rect,{x,y,w,h,fill:{color:o.fill||WHITE},
  line:o.line?{color:o.line,width:o.lw||1.2}:{type:'none'}}); }
function ell(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.ellipse,{x,y,w,h,
  fill:{color:o.fill||WHITE},line:o.line?{color:o.line,width:o.lw||1.2}:{type:'none'}}); }
function pill(s,x,y,w,t,fg,bg,o={}){
  s.addText(t,{x,y,w,h:o.h||0.28,fontSize:o.fs||10.5,bold:true,color:fg,fill:{color:bg},
    line:{type:'none'},align:'center',valign:'middle',
    fontFace:F,shape:pptx.ShapeType.roundRect,rectRadius:0.13});
}

const s=pptx.addSlide();

/* ───────── 헤드 ───────── */
T(s,'ONE PAGE SUMMARY',{x:P,y:0.44,w:6,h:0.30,fontSize:11.5,bold:true,
  color:GRAY2,charSpacing:3.6});
rct(s,P,0.84,W,0.014,{fill:INK});
T(s,[{text:'두 번의 실패가 ',options:{color:INK}},{text:'자산',options:{color:RED}},
     {text:'을 남겼고,',options:{color:INK}}],
  {x:P,y:0.98,w:W,h:0.50,fontSize:29,bold:true});
T(s,[{text:'AI가 그 자산에서 ',options:{color:INK}},{text:'발견',options:{color:IND}},
     {text:'을 꺼냈습니다',options:{color:INK}}],
  {x:P,y:1.44,w:W,h:0.50,fontSize:29,bold:true});

/* ───────── 4 패널 ───────── */
const GAP=0.38, colw=(W-3*GAP)/4;
const CX=[P, P+colw+GAP, P+2*(colw+GAP), P+3*(colw+GAP)];
const CY=2.22, PH=3.54, HD=0.54;
const AC=[RED,GOLD,IND,GRN];
const BG=[REDL,GOLDL,INDL,GRNL];
const BD=[REDB,GOLDB,INDB,GRNB];
const LB=['두 번의 실패','남은 것','두 개의 질문','무엇이 되었나'];

LB.forEach((lb,i)=>{
  card(s,CX[i],CY,colw,PH,{fill:BG[i],line:BD[i],lw:1.4});
  card(s,CX[i],CY,colw,HD,{fill:AC[i],line:null,r:0.10});
  rct(s,CX[i],CY+0.32,colw,HD-0.32,{fill:AC[i]});
  T(s,'0'+(i+1),{x:CX[i]+0.22,y:CY,w:0.52,h:HD,fontSize:13,bold:true,
    color:WHITE,valign:'middle',charSpacing:0.8});
  T(s,lb,{x:CX[i]+0.76,y:CY,w:colw-0.96,h:HD,fontSize:15.5,bold:true,
    color:WHITE,valign:'middle'});
});

// 패널 사이 화살표
for(let i=0;i<3;i++){
  s.addShape(pptx.ShapeType.rightArrow,{x:CX[i]+colw+0.04,y:3.84,w:0.30,h:0.34,
    fill:{color:BD[i]},line:{type:'none'}});
}

const IX=0.20, A=CY+HD+0.18, iw=colw-IX*2;   // 콘텐츠 시작 2.94
const CH=1.32, GY=0.10;

/* 01 · 두 번의 실패 */
[['1 차','고성능 장비 도입','생산성은 올랐지만','단가는 그대로'],
 ['2 차','AI 품질측정','대상까지 받았지만','매출은 그대로']].forEach(([no,tt,a,b],i)=>{
  const x=CX[0]+IX, y=A+i*(CH+GY);
  card(s,x,y,iw,CH,{fill:WHITE,line:REDB,lw:1.2});
  T(s,no,{x:x+0.20,y:y+0.13,w:iw-0.40,h:0.24,fontSize:10.5,bold:true,
    color:RED,charSpacing:1.6});
  T(s,tt,{x:x+0.20,y:y+0.37,w:iw-0.40,h:0.34,fontSize:16.5,bold:true,color:INK});
  rct(s,x+0.20,y+0.78,iw-0.40,0.012,{fill:HAIR});
  T(s,a,{x:x+0.20,y:y+0.86,w:iw-0.40,h:0.24,fontSize:12,color:GRAY});
  T(s,b,{x:x+0.20,y:y+1.04,w:iw-0.40,h:0.26,fontSize:13.5,bold:true,color:RED});
});

/* 02 · 남은 것 */
['생산성 높은 장비','정밀 품질 측정 자료'].forEach((t,i)=>{
  const x=CX[1]+IX, y=A+i*0.72;
  card(s,x,y,iw,0.62,{fill:WHITE,line:GOLDB,lw:1.2});
  T(s,t,{x:x+0.20,y:y,w:iw-0.40,h:0.62,fontSize:14.5,bold:true,color:INK,valign:'middle'});
});
{
  const x=CX[1]+IX, y=A+1.44;
  card(s,x,y,iw,CH,{fill:WHITE,line:GOLDS,lw:1.8});
  T(s,'공정 데이터',{x:x+0.20,y:y+0.12,w:iw-0.40,h:0.24,fontSize:10.5,bold:true,
    color:GOLD,charSpacing:1.6});
  T(s,[{text:'187',options:{fontSize:34}},{text:' 만 건',options:{fontSize:14}}],
    {x:x+0.20,y:y+0.36,w:iw-0.40,h:0.68,bold:true,color:GOLD});
  T(s,'2초마다 한 줄씩',{x:x+0.20,y:y+1.04,w:iw-0.40,h:0.24,
    fontSize:11.5,color:GRAY});
}

/* 03 · 두 개의 질문 */
[['Q1','우리는','무엇을 모르는가'],
 ['Q2','우리 고객들은','무엇을 원하는가']].forEach(([q,a,b],i)=>{
  const x=CX[2]+IX, y=A+i*(CH+GY);
  card(s,x,y,iw,CH,{fill:WHITE,line:INDB,lw:1.2});
  pill(s,x+0.20,y+0.14,0.60,q,WHITE,IND,{fs:10.5,h:0.28});
  T(s,a,{x:x+0.20,y:y+0.52,w:iw-0.40,h:0.34,fontSize:17,bold:true,color:INK});
  T(s,b,{x:x+0.20,y:y+0.86,w:iw-0.40,h:0.34,fontSize:17,bold:true,color:IND});
});

/* 04 · 무엇이 되었나 */
[['완벽한 품질','기술 내재화',50,GRN],
 ['24시간 서비스','제공 가능한 회사',20,GOLDS]].forEach(([a,b,pc,c],i)=>{
  const x=CX[3]+IX, y=A+i*(CH+GY);
  card(s,x,y,iw,CH,{fill:WHITE,line:GRNB,lw:1.2});
  T(s,a,{x:x+0.20,y:y+0.14,w:iw-0.40,h:0.34,fontSize:16.5,bold:true,color:INK});
  T(s,b,{x:x+0.20,y:y+0.46,w:iw-0.40,h:0.34,fontSize:16.5,bold:true,color:INK});
  const gw=iw-0.40, gy=y+0.90;
  rct(s,x+0.20,gy,gw,0.10,{fill:HAIR});
  rct(s,x+0.20,gy,gw*pc/100,0.10,{fill:c});
  ell(s,x+0.20+gw*pc/100-0.09,gy-0.04,0.18,0.18,{fill:c,line:WHITE,lw:1.6});
  T(s,'진도  '+pc+'%',{x:x+0.20,y:gy+0.16,w:gw,h:0.24,fontSize:11.5,bold:true,color:c});
});

/* ───────── 풀블리드 결론 밴드 ───────── */
rct(s,0,5.94,13.333,0.96,{fill:NAVY});
rct(s,0,5.94,13.333,0.045,{fill:GOLDS});
T(s,'좋은 장비로 높은 생산성을 내는 것은 기본입니다',
  {x:0,y:6.10,w:13.333,h:0.30,fontSize:14,color:SOFT,align:'center'});
T(s,[{text:'AI는 ',options:{color:WHITE}},
     {text:'지속 가능한 고품질 생산',options:{color:GOLDS}},
     {text:'과 ',options:{color:WHITE}},
     {text:'24시간 서비스',options:{color:GOLDS}},
     {text:'를 가능하게 합니다',options:{color:WHITE}}],
  {x:0,y:6.42,w:13.333,h:0.38,fontSize:19,bold:true,align:'center'});

T(s,'요약',{x:P,y:7.06,w:6,h:0.24,fontSize:10,bold:true,color:GRAY2,charSpacing:1.8});
T(s,'오성철강  ·  02',{x:P+W-3,y:7.06,w:3,h:0.24,fontSize:10,bold:true,
  color:GRAY2,align:'right',charSpacing:1.4});

pptx.writeFile({ fileName: process.argv[2] || '오성철강_한장요약_리디자인.pptx' })
  .then(f=>console.log('✅ 완료: '+f))
  .catch(e=>{ console.error('❌', e); process.exit(1); });
