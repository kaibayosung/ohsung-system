// 두 번 다 같은 착각이었습니다 (1장 · 흰 배경 · 큰 글씨)
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = '두 번 다 같은 착각이었습니다';

const F='맑은 고딕', P=0.72, W=11.89;
const WHITE='FFFFFF', LINE='E4E9F0', HAIR='EEF2F7', TINT='F8FAFC',
      INK='0B1220', INK2='3B4657', GRAY='6B7688', GRAY2='9AA4B2',
      NAVY='0B1220', SOFT='C9D2DF',
      RED='D92D20', REDL='FEF3F2', REDB='FBCFCB', REDLT='FF7B72',
      GOLD='F5B544', GOLDL='FFFAEB', GOLDB='F2DDA4', GOLDD='B8860B';

function T(s,t,o={}){ s.addText(t,{fontFace:F,color:o.color||INK2,valign:o.valign||'top',
  lineSpacingMultiple:o.lsm||1.16,...o}); }
function card(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:o.r||0.10,
  fill:{color:o.fill||WHITE},
  line:o.line===null?{type:'none'}:{color:o.line||LINE,width:o.lw!==undefined?o.lw:1.4}}); }
function rct(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.rect,{x,y,w,h,fill:{color:o.fill||WHITE},
  line:o.line?{color:o.line,width:o.lw||1.2}:{type:'none'}}); }
function arw(s,x1,y1,x2,y2,c,w=3){
  s.addShape(pptx.ShapeType.line,{x:Math.min(x1,x2),y:Math.min(y1,y2),
    w:Math.abs(x2-x1)||0.008,h:Math.abs(y2-y1)||0.008,
    line:{color:c,width:w,endArrowType:'triangle'},flipH:x2<x1,flipV:y2<y1});
}
function pill(s,x,y,w,t,fg,bg,o={}){
  s.addText(t,{x,y,w,h:o.h||0.36,fontSize:o.fs||13,bold:true,color:fg,fill:{color:bg},
    line:o.bd?{color:o.bd,width:1.4}:{type:'none'},align:'center',valign:'middle',
    fontFace:F,shape:pptx.ShapeType.roundRect,rectRadius:0.16});
}

const s=pptx.addSlide();

/* ───────── 헤드 ───────── */
T(s,'THE SAME MISTAKE, TWICE',{x:P,y:0.40,w:8,h:0.30,fontSize:12,bold:true,
  color:RED,charSpacing:3.2});
rct(s,P,0.80,W,0.016,{fill:INK});
T(s,[{text:'두 번 다 ',options:{color:INK}},{text:'같은 착각',options:{color:RED}},
     {text:'이었습니다',options:{color:INK}}],
  {x:P,y:0.94,w:W,h:0.68,fontSize:40,bold:true});
T(s,'직원이 특별히 배우지 않아도 고품질을 내고,  고객이 놀랄 서비스를 주려고 했습니다',
  {x:P,y:1.78,w:W,h:0.32,fontSize:15,color:GRAY});

/* ───────── 착각 (히어로) ───────── */
const QY=2.24, QH=1.36;
card(s,P,QY,W,QH,{fill:REDL,line:REDB,lw:1.8});
rct(s,P,QY,0.14,QH,{fill:RED});
T(s,'두 번 다 이렇게 생각했습니다',{x:P+0.46,y:QY+0.14,w:6,h:0.28,fontSize:13,
  bold:true,color:RED,charSpacing:0.8});
T(s,'"좋은 것을 갖추면 인정받는다"',
  {x:P,y:QY+0.46,w:W,h:0.84,fontSize:44,bold:true,color:INK,align:'center'});

/* ───────── 두 번의 시도 ───────── */
const CY=3.76, CH=1.48, cw=(W-0.40)/2;
[['1 차','좋은 장비를 샀습니다','훌륭했습니다'],
 ['2 차','좋은 검사 시스템을 만들었습니다','상까지 받았습니다']].forEach(([no,tt,tag],i)=>{
  const x=P+i*(cw+0.40);
  card(s,x,CY,cw,CH,{fill:WHITE,line:LINE,lw:1.6});
  rct(s,x,CY,cw,0.08,{fill:INK});
  pill(s,x+0.32,CY+0.26,0.86,no,WHITE,INK,{fs:13,h:0.34});
  pill(s,x+cw-2.48,CY+0.26,2.16,tag,GOLDD,GOLDL,{fs:13,h:0.34,bd:GOLDB});
  T(s,tt,{x:x+0.32,y:CY+0.78,w:cw-0.64,h:0.50,fontSize:24,bold:true,color:INK});
});

/* ───────── 수렴 화살표 ───────── */
const MID=P+W/2;
arw(s,P+cw/2,CY+CH+0.06,MID,5.72,REDB,3);
arw(s,P+cw+0.40+cw/2,CY+CH+0.06,MID,5.72,REDB,3);

/* ───────── 결론 밴드 ───────── */
rct(s,0,5.80,13.333,1.12,{fill:NAVY});
rct(s,0,5.80,13.333,0.05,{fill:RED});
T(s,[{text:'그런데 둘 다,  ',options:{color:WHITE}},
     {text:'고객은 아무도 알 수 없었습니다',options:{color:REDLT}}],
  {x:0,y:5.96,w:13.333,h:0.44,fontSize:24,bold:true,align:'center'});
T(s,'좋은 것을 갖추는 일과,  알게 하는 일은 다른 일이었습니다',
  {x:0,y:6.48,w:13.333,h:0.32,fontSize:15,color:SOFT,align:'center'});

T(s,'2. 두 번의 실패',{x:P,y:7.06,w:6,h:0.24,fontSize:10,bold:true,
  color:GRAY2,charSpacing:1.8});
T(s,'오성철강  ·  07',{x:P+W-3,y:7.06,w:3,h:0.24,fontSize:10,bold:true,
  color:GRAY2,align:'right',charSpacing:1.4});

pptx.writeFile({ fileName: process.argv[2] || '오성철강_같은착각_리디자인.pptx' })
  .then(f=>console.log('✅ 완료: '+f))
  .catch(e=>{ console.error('❌', e); process.exit(1); });
