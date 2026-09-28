// 오성철강 산업부 장관 발표자료 v6 — 상세본 / 33장 / 프리미엄 디자인
// 실행: npm install pptxgenjs && node build-ppt-v6.js
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = '오성철강';
pptx.title  = '오성철강 AX 전환 — 산업통상자원부 장관 보고';

// ── 디자인 토큰 ──────────────────────────────────────
const F = '맑은 고딕';
const P = 0.72, W = 11.89, SW = 13.333, SH = 7.5;

const NAVY='0B1220', NAVY2='16203A',
      INK='0F172A', INK2='334155', GRAY='64748B', GRAY2='94A3B8',
      LINE='E2E8F0', LINE2='F1F5F9', TINT='F8FAFC', WHITE='FFFFFF',
      IND='4F46E5', INDL='EEF0FF', INDB='C7CBFF', INDD='3730A3',
      GOLD='F5B544', GOLDL='FFF8E8', GOLDB='FBD88B',
      RED='DC2626', REDL='FEF2F2', REDB='FCA5A5',
      GRN='059669', GRNL='ECFDF5', GRNB='6EE7B7';

let _n = 0;
const SEC = { cur:'' };

function base(dark){
  const s = pptx.addSlide();
  if(dark) s.background = { color:NAVY };
  _n++;
  return s;
}
function foot(s){
  s.addShape(pptx.ShapeType.rect,{x:P,y:6.86,w:W,h:0.012,fill:{color:LINE},line:{type:'none'}});
  if(SEC.cur) s.addText(SEC.cur,{x:P,y:6.96,w:6,h:0.28,fontSize:9.5,bold:true,
    color:GRAY2,fontFace:F,charSpacing:1.4});
  s.addText('오성철강  ·  '+String(_n).padStart(2,'0'),{x:P+W-3,y:6.96,w:3,h:0.28,
    fontSize:9.5,bold:true,color:GRAY2,align:'right',fontFace:F,charSpacing:1.2});
}
// 제목: 왼쪽 악센트 바 + 킥커 + 헤드라인
function head(s, kicker, runs, o={}){
  const y = o.y!==undefined?o.y:0.62;
  s.addShape(pptx.ShapeType.rect,{x:P,y:y+0.04,w:0.055,h:0.26,fill:{color:o.acc||IND},line:{type:'none'}});
  s.addText(kicker,{x:P+0.20,y:y,w:8,h:0.30,fontSize:11.5,bold:true,color:o.acc||IND,
    fontFace:F,charSpacing:1.6});
  s.addText(runs,{x:P,y:y+0.40,w:o.w||W,h:o.h||0.86,fontSize:o.size||30,bold:true,
    color:INK,fontFace:F,valign:'top',lineSpacingMultiple:1.16});
}
function T(s,t,o={}){
  s.addText(t,{fontFace:F,color:o.color||INK2,valign:o.valign||'top',
    lineSpacingMultiple:o.lsm||1.4,...o});
}
function card(s,x,y,w,h,o={}){
  s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:0.08,
    fill:{color:o.fill||WHITE},
    line:o.line===null?{type:'none'}:{color:o.line||LINE,width:o.lw!==undefined?o.lw:1.5}});
}
function rct(s,x,y,w,h,o={}){
  s.addShape(pptx.ShapeType.rect,{x,y,w,h,fill:{color:o.fill||WHITE},
    line:o.line?{color:o.line,width:o.lw||1.5}:{type:'none'}});
}
function chip(s,x,y,t,kind='n',wf){
  const M={n:[GRAY,TINT,LINE],i:[IND,INDL,INDB],g:[GRN,GRNL,GRNB],
           r:[RED,REDL,REDB],o:[GOLD==='F5B544'?'B45309':GOLD,GOLDL,GOLDB],
           d:[WHITE,'1E293B','334155']};
  const [fg,bg,ln]=M[kind]||M.n;
  const w = wf || (0.135*t.length+0.40);
  s.addText(t,{x,y,w,h:0.29,fontSize:10.5,bold:true,color:fg,fill:{color:bg},
    line:{color:ln,width:1.2},align:'center',valign:'middle',fontFace:F,
    shape:pptx.ShapeType.roundRect,rectRadius:0.13,charSpacing:0.3});
  return w;
}
function arw(s,x1,y1,x2,y2,c=GRAY2,w=1.75){
  s.addShape(pptx.ShapeType.line,{x:Math.min(x1,x2),y:Math.min(y1,y2),
    w:Math.abs(x2-x1)||0.008,h:Math.abs(y2-y1)||0.008,
    line:{color:c,width:w,endArrowType:'triangle'},flipH:x2<x1,flipV:y2<y1});
}
function band(s,y,runs,h=0.92,fill=NAVY){
  s.addShape(pptx.ShapeType.roundRect,{x:P,y,w:W,h,rectRadius:0.08,
    fill:{color:fill},line:{type:'none'}});
  s.addText(runs,{x:P+0.3,y,w:W-0.6,h,fontSize:18,bold:true,color:WHITE,
    align:'center',valign:'middle',fontFace:F,lineSpacingMultiple:1.3});
}
function num(s,x,y,w,v,unit,c=IND,sz=54){
  s.addText([{text:v,options:{fontSize:sz}},
             unit?{text:' '+unit,options:{fontSize:Math.round(sz*0.32)}}:{text:''}],
    {x,y,w,h:sz/72*1.25,bold:true,color:c,fontFace:F});
}

// ════════════════════════════════════════════════════
// 01
// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════
{ const s=base(true);
  rct(s,0,0,0.14,SH,{fill:IND});
  rct(s,P,1.05,1.30,0.045,{fill:GOLD});
  T(s,'산업통상자원부 장관 보고',{x:P,y:1.35,w:8,h:0.34,fontSize:13,bold:true,
    color:GOLD,charSpacing:2.2});
  T(s,[{text:'낮에만 도는 공장에서,\n',options:{color:WHITE}},
       {text:'24시간 쉬지 않는 회사',options:{color:'A5B4FC'}},{text:'로',options:{color:WHITE}}],
    {x:P,y:1.95,w:11.5,h:2.30,fontSize:47,bold:true,lsm:1.22});
  rct(s,P,4.45,2.10,0.035,{fill:'334155'});
  T(s,[{text:'두 번 실패하고 남은 것은 ',options:{color:'CBD5E1'}},
       {text:'데이터',options:{color:GOLD}},{text:'였습니다',options:{color:'CBD5E1'}}],
    {x:P,y:4.72,w:10,h:0.50,fontSize:23,bold:true});
  // 하단 메타
  rct(s,P,5.95,W,0.02,{fill:'1E293B'});
  const meta=[['1983','잠실 주경기장 지붕'],['43','년'],['12','명'],['41','자체개발 서비스']];
  meta.forEach(([v,l],i)=>{
    const x=P+i*2.55;
    T(s,v,{x,y:6.20,w:2.4,h:0.48,fontSize:26,bold:true,color:WHITE});
    T(s,l,{x,y:6.70,w:2.4,h:0.28,fontSize:11,bold:true,color:GRAY2});
  });
  T(s,'2026. 9.',{x:P+W-2.5,y:6.70,w:2.5,h:0.28,fontSize:11,bold:true,color:GRAY2,align:'right'});
}

// ════════════════════════════════════════════════════
// 02
// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════
SEC.cur='요약';
{ const s=base();
  head(s,'ONE PAGE SUMMARY',
    [{text:'두 번의 실패가 ',options:{}},{text:'자산',options:{color:RED}},
     {text:'을 남기고, AI가 그것에 ',options:{}},{text:'물어볼 방법',options:{color:IND}},
     {text:'을 가져왔습니다',options:{}}],{size:27,h:1.05});
  const Y=2.20;
  // 실패
  card(s,P,Y,2.42,1.08,{fill:REDL,line:REDB});
  T(s,'1차 · 장비',{x:P+0.18,y:Y+0.12,w:2.1,h:0.28,fontSize:13,bold:true,color:RED});
  T(s,'생산성↑  값은 그대로',{x:P+0.18,y:Y+0.44,w:2.1,h:0.5,fontSize:12,bold:true,color:INK});
  card(s,P,Y+1.30,2.42,1.08,{fill:REDL,line:REDB});
  T(s,'2차 · AI 품질측정',{x:P+0.18,y:Y+1.42,w:2.1,h:0.28,fontSize:13,bold:true,color:RED});
  T(s,'대상 수상  매출 그대로',{x:P+0.18,y:Y+1.74,w:2.1,h:0.5,fontSize:12,bold:true,color:INK});
  arw(s,P+2.50,Y+0.54,P+2.92,Y+1.05,REDB);
  arw(s,P+2.50,Y+1.84,P+2.92,Y+1.33,REDB);
  // 자산
  card(s,P+3.00,Y+0.42,2.72,1.58,{fill:GOLDL,line:GOLDB});
  T(s,'남은 것',{x:P+3.18,y:Y+0.54,w:2.4,h:0.28,fontSize:14,bold:true,color:'B45309'});
  T(s,'생산성 높은 장비\n정밀 품질 측정 자료\n공정 데이터 187만 건',
    {x:P+3.18,y:Y+0.88,w:2.4,h:0.95,fontSize:12.5,bold:true,color:INK,lsm:1.55});
  arw(s,P+5.80,Y+1.21,P+6.22,Y+1.21,IND,2);
  // 질문
  [['01','우리는\n무엇을 모르는가',Y],['02','우리 고객들은\n무엇을 원하는가',Y+1.30]].forEach(([n,q,yy])=>{
    card(s,P+6.30,yy,2.82,1.08,{fill:INDL,line:INDB});
    T(s,n,{x:P+6.46,y:yy+0.10,w:0.6,h:0.3,fontSize:13,bold:true,color:IND});
    T(s,q,{x:P+6.46,y:yy+0.36,w:2.5,h:0.62,fontSize:14.5,bold:true,color:INK,lsm:1.2});
  });
  arw(s,P+9.20,Y+0.54,P+9.62,Y+0.54,GRN,2);
  arw(s,P+9.20,Y+1.84,P+9.62,Y+1.84,GRN,2);
  // 결과
  [['완벽한 품질\n기술 내재화','70%',Y,GRN],['24시간\n서비스 회사','20%',Y+1.30,GOLD]].forEach(([t,pc,yy,c])=>{
    card(s,P+9.70,yy,W-9.70,1.16,{fill:c===GRN?GRNL:GOLDL,line:c===GRN?GRNB:GOLDB});
    T(s,t,{x:P+9.86,y:yy+0.12,w:W-9.98,h:0.50,fontSize:13.5,bold:true,color:c===GRN?GRN:'B45309',lsm:1.22});
    rct(s,P+9.86,yy+0.70,1.50,0.12,{fill:WHITE});
    rct(s,P+9.86,yy+0.70,1.50*parseInt(pc)/100,0.12,{fill:c===GRN?GRN:GOLD});
    T(s,'진도 '+pc,{x:P+9.86,y:yy+0.86,w:1.8,h:0.24,fontSize:9.5,bold:true,color:GRAY});
  });
  band(s,5.28,[{text:'좋은 장비는 낮에만 돕니다.   ',options:{}},
               {text:'서비스는 24시간 돕니다.',options:{color:GOLD}}],0.92);
  T(s,'앞의 두 번은 갖추는 일이었고, 세 번째는 보이게 하는 일이었습니다.',
    {x:P,y:6.38,w:W,h:0.34,fontSize:14,bold:true,color:GRAY,align:'center'});
  foot(s);
}

// ════════════════════════════════════════════════════
// 03
// ════════════════════════════════════════════════════
SEC.cur='1. 우리는 어떤 회사인가';
{ const s=base();
  head(s,'WHAT WE DO',
    [{text:'전기차도, 건물도 ',options:{}},{text:'이 공정',options:{color:IND}},
     {text:'을 지나갑니다',options:{}}]);
  const fy=2.20;
  // 제철소
  card(s,P,fy,2.30,1.95,{fill:TINT,line:LINE});
  T(s,'제철소',{x:P,y:fy+0.18,w:2.30,h:0.32,fontSize:14,bold:true,color:GRAY,align:'center'});
  s.addShape(pptx.ShapeType.ellipse,{x:P+0.58,y:fy+0.66,w:1.14,h:0.66,fill:{color:'CBD5E1'},line:{type:'none'}});
  s.addShape(pptx.ShapeType.ellipse,{x:P+0.99,y:fy+0.87,w:0.32,h:0.24,fill:{color:GRAY2},line:{type:'none'}});
  T(s,'넓고 거친 두루마리',{x:P,y:fy+1.46,w:2.30,h:0.30,fontSize:12,bold:true,color:INK2,align:'center'});
  arw(s,P+2.40,fy+0.98,P+2.78,fy+0.98);
  // 오성철강
  card(s,P+2.86,fy-0.28,4.10,2.52,{fill:INDL,line:IND,lw:2});
  T(s,'오성철강',{x:P+2.86,y:fy-0.12,w:4.10,h:0.38,fontSize:18,bold:true,color:IND,align:'center'});
  card(s,P+3.10,fy+0.38,1.85,0.76,{fill:WHITE,line:INDB,lw:1.2});
  T(s,'슬리터',{x:P+3.10,y:fy+0.48,w:1.85,h:0.28,fontSize:13,bold:true,color:INK,align:'center'});
  T(s,'폭으로 자름',{x:P+3.10,y:fy+0.76,w:1.85,h:0.26,fontSize:11,color:GRAY,align:'center'});
  card(s,P+5.03,fy+0.38,1.68,0.76,{fill:WHITE,line:INDB,lw:1.2});
  T(s,'레벨러',{x:P+5.03,y:fy+0.48,w:1.68,h:0.28,fontSize:13,bold:true,color:INK,align:'center'});
  T(s,'휜 것을 펴줌',{x:P+5.03,y:fy+0.76,w:1.68,h:0.26,fontSize:11,color:GRAY,align:'center'});
  card(s,P+3.10,fy+1.26,3.61,0.70,{fill:WHITE,line:INDB,lw:1.2});
  T(s,'AI 표면 검사  ·  두께 측정   (전수)',{x:P+3.10,y:fy+1.26,w:3.61,h:0.70,
    fontSize:13,bold:true,color:INK,align:'center',valign:'middle'});
  arw(s,P+7.04,fy+0.98,P+7.42,fy+0.98);
  // 고객
  card(s,P+7.50,fy,2.30,1.95,{fill:GRNL,line:GRNB});
  T(s,'자동차 공장',{x:P+7.50,y:fy+0.18,w:2.30,h:0.32,fontSize:14,bold:true,color:GRN,align:'center'});
  T(s,'문짝 · 골조\n전기차 부품',{x:P+7.50,y:fy+0.66,w:2.30,h:0.62,fontSize:13,bold:true,color:INK,align:'center',lsm:1.4});
  T(s,'바로 쓸 수 있는 상태로',{x:P+7.50,y:fy+1.46,w:2.30,h:0.30,fontSize:11,color:GRAY,align:'center'});
  // 그런데
  card(s,P+9.88,fy,W-9.88,1.95,{fill:REDL,line:REDB});
  T(s,'그런데',{x:P+9.88,y:fy+0.18,w:W-9.88,h:0.30,fontSize:13,bold:true,color:RED,align:'center'});
  T(s,'이 공정을 하는\n공장들이',{x:P+9.88,y:fy+0.62,w:W-9.88,h:0.60,fontSize:13,bold:true,color:INK,align:'center',lsm:1.4});
  T(s,'문을 닫고\n있습니다',{x:P+9.88,y:fy+1.26,w:W-9.88,h:0.58,fontSize:14,bold:true,color:RED,align:'center',lsm:1.35});
  band(s,4.70,[{text:'완성차가 세계에서 경쟁하려면 좋은 소재가 적정한 가격에 들어가야 합니다.\n',options:{}},
               {text:'소재가 흔들리면 그 위의 산업 전체가 흔들립니다.',options:{color:GOLD}}],1.30);
  T(s,'철판을 필요한 폭으로 자르고, 휘어진 것을 펴서 자동차 공장이 바로 쓸 수 있게 만드는 일 — 그 일을 하는 것이 저희 같은 회사입니다.',
    {x:P,y:6.26,w:W,h:0.34,fontSize:13,bold:true,color:GRAY,align:'center'});
  foot(s);
}

// ════════════════════════════════════════════════════
// 04
// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════
SEC.cur='1. 우리는 어떤 회사인가';
{ const s=base();
  head(s,'WHO WE ARE',
    [{text:'1983년, 저희는 ',options:{}},{text:'잠실 주경기장 지붕',options:{color:IND}},
     {text:'을 만들었습니다',options:{}}]);
  // 타임라인
  const ty=2.30;
  rct(s,P,ty+0.52,W,0.03,{fill:LINE});
  s.addShape(pptx.ShapeType.ellipse,{x:P-0.09,y:ty+0.43,w:0.22,h:0.22,fill:{color:IND},line:{type:'none'}});
  s.addShape(pptx.ShapeType.ellipse,{x:P+W-0.13,y:ty+0.43,w:0.22,h:0.22,fill:{color:RED},line:{type:'none'}});
  T(s,'1983',{x:P-0.1,y:ty-0.12,w:2.2,h:0.52,fontSize:30,bold:true,color:IND});
  T(s,'첫 손에 꼽히던 첨단 제조 회사',{x:P-0.1,y:ty+0.78,w:3.4,h:0.3,fontSize:13,bold:true,color:INK2});
  T(s,'2026',{x:P+W-2.3,y:ty-0.12,w:2.4,h:0.52,fontSize:30,bold:true,color:RED,align:'right'});
  T(s,'경기장은 다시 짓고, 저희는 그대로',{x:P+W-3.6,y:ty+0.78,w:3.7,h:0.3,fontSize:13,bold:true,color:INK2,align:'right'});
  T(s,'43년',{x:P+W/2-1.2,y:ty+0.05,w:2.4,h:0.46,fontSize:20,bold:true,color:GRAY2,align:'center'});
  // 숫자
  const d=[['12','전체 직원',''],['5','외국인 직원','설명서는 전부 한국어'],
           ['40','공장장 경력(년)','정년이 눈앞'],['3','생산 라인','레벨링 · 슬리터1 · 2']];
  const cw=(W-3*0.24)/4;
  d.forEach(([v,l,sub],i)=>{
    const x=P+i*(cw+0.24);
    card(s,x,3.62,cw,1.62,{fill:TINT,line:LINE});
    T(s,v,{x,y:3.74,w:cw,h:0.66,fontSize:38,bold:true,color:i===1?'B45309':(i===2?RED:INK),align:'center'});
    T(s,l,{x,y:4.42,w:cw,h:0.30,fontSize:14,bold:true,color:INK,align:'center'});
    if(sub) T(s,sub,{x:x+0.1,y:4.76,w:cw-0.2,h:0.28,fontSize:10.5,color:GRAY,align:'center'});
  });
  band(s,5.52,[{text:'43년 전통의 회사가 아닙니다.   ',options:{}},
               {text:'회사도, 기계도, 사람도 오래되었습니다.',options:{color:'FCA5A5'}}],1.02);
  foot(s);
}

// ════════════════════════════════════════════════════
// 05
// ════════════════════════════════════════════════════
SEC.cur='2. 두 번의 실패';
{ const s=base();
  head(s,'FAILURE 01',
    [{text:'첫 번째 — ',options:{}},{text:'장비를 바꿨습니다',options:{color:RED}}],{acc:RED});
  const lw=6.10;
  const steps=[['우리의 생각','생산성을 올리면 살아남는다',WHITE,LINE,INK],
               ['결과 1','생산성은 실제로 올랐습니다',GRNL,GRNB,GRN],
               ['결과 2','그런데 값은 오르지 않았습니다',REDL,REDB,RED]];
  steps.forEach(([lab,txt,fill,line,col],i)=>{
    const y=2.15+i*1.35;
    card(s,P,y,lw,1.02,{fill,line});
    T(s,lab,{x:P+0.26,y:y+0.12,w:lw-0.5,h:0.24,fontSize:10.5,color:GRAY,charSpacing:0.6});
    T(s,txt,{x:P+0.26,y:y+0.38,w:lw-0.5,h:0.52,fontSize:19,bold:true,color:col});
    if(i<2) arw(s,P+lw/2,y+1.04,P+lw/2,y+1.30,GRAY2,1.6);
  });
  const rx=P+lw+0.36, rw=W-lw-0.36;
  card(s,rx,2.15,rw,4.05,{fill:TINT,line:LINE});
  chip(s,rx+0.30,2.36,'왜 그랬을까','o',1.3);
  // 세탁기 도해
  card(s,rx+0.36,2.86,1.72,1.42,{fill:WHITE,line:LINE});
  s.addShape(pptx.ShapeType.ellipse,{x:rx+0.68,y:3.12,w:1.08,h:0.90,
    fill:{color:INDL},line:{color:IND,width:2}});
  s.addShape(pptx.ShapeType.ellipse,{x:rx+0.94,y:3.34,w:0.56,h:0.46,fill:{color:INDB},line:{type:'none'}});
  T(s,'비싼 세탁기',{x:rx+0.36,y:4.32,w:1.72,h:0.26,fontSize:11,bold:true,color:IND,align:'center'});
  T(s,'✕',{x:rx+2.18,y:3.42,w:0.5,h:0.4,fontSize:22,bold:true,color:RED,align:'center'});
  card(s,rx+2.78,2.86,rw-3.14,1.42,{fill:REDL,line:REDB});
  T(s,'손님은 그 세탁기를\n볼 수 없습니다',{x:rx+2.88,y:2.98,w:rw-3.34,h:0.66,
    fontSize:15,bold:true,color:INK,align:'center',lsm:1.3});
  T(s,'그래서 세탁비를 못 올립니다',{x:rx+2.88,y:3.74,w:rw-3.34,h:0.30,
    fontSize:12,bold:true,color:RED,align:'center'});
  T(s,[{text:'고객 입장에서는 저희가 ',options:{}},
       {text:'어떤 기계를 쓰는지 볼 방법이 없었습니다.',options:{bold:true,color:INK}},
       {text:'\n생산성은 저희 안에서만 올랐습니다.',options:{}}],
    {x:rx+0.36,y:4.60,w:rw-0.72,h:1.20,fontSize:15,lsm:1.5});
  foot(s);
}

// ════════════════════════════════════════════════════
// 06
// ════════════════════════════════════════════════════
SEC.cur='2. 두 번의 실패';
{ const s=base();
  head(s,'FAILURE 02',
    [{text:'두 번째 — ',options:{}},{text:'AI 품질측정을 만들었습니다',options:{color:RED}}],{acc:RED});
  const lw=4.55;
  card(s,P,2.15,lw,4.05,{fill:GRNL,line:GRNB});
  chip(s,P+0.30,2.36,'기술은 성공','g',1.2);
  T(s,'코일센터 최초\nAI 기반 불량 측정',{x:P+0.30,y:2.86,w:lw-0.6,h:0.90,
    fontSize:21,bold:true,color:INK,lsm:1.25});
  T(s,'분당 250m로 지나가는 철판을 사람 눈으로는 볼 수 없습니다.\n기계는 해냈습니다.',
    {x:P+0.30,y:3.86,w:lw-0.6,h:1.05,fontSize:13,lsm:1.5});
  card(s,P+0.30,5.02,lw-0.6,1.05,{fill:WHITE,line:GRNB});
  T(s,'대상',{x:P+0.30,y:5.08,w:lw-0.6,h:0.56,fontSize:30,bold:true,color:GRN,align:'center'});
  T(s,'수상까지 했습니다',{x:P+0.30,y:5.66,w:lw-0.6,h:0.30,fontSize:12,color:GRAY,align:'center'});
  const rx=P+lw+0.36, rw=W-lw-0.36;
  chip(s,rx,2.15,'그런데 사업은 실패했습니다','r',2.4);
  const items=[['현장이 쓰지 않았습니다','결과를 보려면 다른 프로그램을 따로 켜야 했습니다. 작업자는 이미 여러 시스템에 같은 내용을 반복 입력하고 있었는데, 하나가 더 늘어난 셈이었습니다.'],
               ['고객이 알지 못했습니다','저희가 전수 검사를 한다는 사실이 고객에게 전달될 통로가 없었습니다. 검사 결과는 저희 컴퓨터 안에만 있었습니다.']];
  items.forEach(([h,b],i)=>{
    const y=2.72+i*1.52;
    card(s,rx,y,rw,1.38,{fill:WHITE,line:REDB});
    rct(s,rx,y,0.055,1.38,{fill:RED});
    T(s,String(i+1),{x:rx+0.30,y:y+0.16,w:0.4,h:0.3,fontSize:14,bold:true,color:REDB});
    T(s,h,{x:rx+0.72,y:y+0.14,w:rw-1.0,h:0.34,fontSize:17,bold:true,color:RED});
    T(s,b,{x:rx+0.72,y:y+0.52,w:rw-1.0,h:0.74,fontSize:12.5,lsm:1.45});
  });
  card(s,rx,5.80,rw,0.62,{fill:NAVY,line:null});
  T(s,'그래서 매출은 그대로였습니다.',{x:rx,y:5.80,w:rw,h:0.62,fontSize:17,bold:true,
    color:WHITE,align:'center',valign:'middle'});
  foot(s);
}

// ════════════════════════════════════════════════════
// 07
// ════════════════════════════════════════════════════
SEC.cur='2. 두 번의 실패';
{ const s=base();
  head(s,'THE SAME MISTAKE, TWICE',
    [{text:'두 번 다 ',options:{}},{text:'같은 착각',options:{color:RED}},{text:'이었습니다',options:{}}],{acc:RED});
  rct(s,P+0.30,2.12,0.10,1.10,{fill:RED});
  T(s,'"좋은 것을 갖추면 인정받는다"',
    {x:P+0.66,y:2.12,w:W-1.0,h:1.10,fontSize:34,bold:true,color:INK,valign:'middle'});
  const cw=(W-0.34)/2;
  [['1차','좋은 장비를 샀습니다'],['2차','좋은 검사 시스템을 만들었습니다']].forEach(([k,t],i)=>{
    const x=P+i*(cw+0.34);
    card(s,x,3.48,cw,0.92,{fill:WHITE,line:LINE});
    T(s,k,{x:x+0.28,y:3.48,w:0.7,h:0.92,fontSize:14,bold:true,color:GRAY2,valign:'middle'});
    T(s,t,{x:x+0.92,y:3.48,w:cw-1.2,h:0.92,fontSize:18,bold:true,color:INK,valign:'middle'});
  });
  card(s,P,4.60,W,1.10,{fill:REDL,line:REDB});
  T(s,[{text:'둘 다 훌륭했습니다. 상까지 받았습니다. 그런데 둘 다 ',options:{color:INK}},
       {text:'아무도 볼 수 없는 곳에 있었습니다.',options:{color:RED}}],
    {x:P+0.3,y:4.60,w:W-0.6,h:1.10,fontSize:21,bold:true,align:'center',valign:'middle'});
  T(s,[{text:'저희는 목표를 세운 게 아니라 ',options:{color:GRAY}},
       {text:'구매와 개발을 한 것',options:{color:INK}},
       {text:'이었습니다.      IT를 30년 한 저도 이것을 몰랐습니다.',options:{color:GRAY}}],
    {x:P,y:5.94,w:W,h:0.40,fontSize:14,bold:true,align:'center'});
  foot(s);
}

// ════════════════════════════════════════════════════
// 08
// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════
SEC.cur='2. 두 번의 실패';
{ const s=base();
  head(s,'WHAT REMAINED',
    [{text:'그런데 ',options:{}},{text:'빈손이 아니었습니다',options:{color:'B45309'}}],{acc:GOLD});
  const cw=(W-0.48)/3;
  const d=[['1차가 남긴 것','생산성 높은 장비','값은 못 올렸지만 생산 능력 자체는 확보했습니다. 지금도 돌고 있습니다.',null],
           ['2차가 남긴 것','타사에 없는\n정밀 품질 측정 자료','사업은 실패했지만 작동은 계속했습니다. 표면 전수 촬영 · 결함 위치 · 영상 · 두께 — 매일, 모든 코일에.',null],
           ['장비가 남긴 것','수백만 건의\n공정 데이터','2초마다 한 줄씩 · 설비 기록만 182만 줄','187']];
  d.forEach(([lab,ttl,body,n],i)=>{
    const x=P+i*(cw+0.24);
    card(s,x,2.10,cw,2.55,{fill:GOLDL,line:GOLDB});
    T(s,lab,{x:x+0.26,y:2.26,w:cw-0.5,h:0.28,fontSize:11.5,bold:true,color:'B45309',charSpacing:0.6});
    T(s,ttl,{x:x+0.26,y:2.58,w:cw-0.5,h:0.76,fontSize:18,bold:true,color:INK,lsm:1.25});
    if(n){
      num(s,x+0.26,3.32,cw-0.5,n,'만 건','B45309',40);
      T(s,body,{x:x+0.26,y:4.08,w:cw-0.5,h:0.48,fontSize:12,color:GRAY,lsm:1.4});
    } else {
      T(s,body,{x:x+0.26,y:3.42,w:cw-0.5,h:1.10,fontSize:13,lsm:1.5});
    }
  });
  card(s,P,4.90,W,1.12,{fill:TINT,line:LINE});
  T(s,[{text:'저희는 팔 줄을 몰랐을 뿐, 가지고는 있었습니다.   ',options:{fontSize:20,color:GRN}},
       {text:'그런데 아무도 보지 않았습니다. 그냥 쌓이고 있었습니다.',options:{fontSize:15,color:GRAY}}],
    {x:P+0.3,y:4.90,w:W-0.6,h:1.12,bold:true,align:'center',valign:'middle',lsm:1.4});
  T(s,'실패가 헛되지 않았던 이유는 저희가 잘했기 때문이 아닙니다. 버티고 있었기 때문입니다.',
    {x:P,y:6.24,w:W,h:0.34,fontSize:14,bold:true,color:GRAY,align:'center'});
  foot(s);
}

// ════════════════════════════════════════════════════
// 09
// ════════════════════════════════════════════════════
SEC.cur='3. 전환점';
{ const s=base();
  head(s,'BEFORE AI',
    [{text:'데이터가 있었는데도 ',options:{}},{text:'아무것도 할 수 없었습니다',options:{color:RED}}],{acc:RED});
  const cw=(W-0.48)/3;
  const d=[['01','읽을 사람이 없었습니다',
            '직원 12명 회사에 데이터를 분석할 사람이 있을 수 없습니다. 채용하려 해도, 그 인력이 올 만한 회사가 아닙니다.',false],
           ['02','무엇을 볼지 먼저 정해야 했습니다',
            '분석 시스템 견적은 수천만 원. 발주하려면 "무엇을 볼 것인지"를 명세서에 써야 합니다. 그런데 몰랐습니다.',false],
           ['03','무엇을 물어야 할지 몰랐습니다',
            '가장 큰 이유였습니다. 데이터는 질문에만 답합니다.',true]];
  d.forEach(([n,t,b,hot],i)=>{
    const x=P+i*(cw+0.24);
    card(s,x,2.15,cw,2.85,{fill:hot?REDL:WHITE,line:hot?REDB:LINE});
    rct(s,x,2.15,cw,0.055,{fill:hot?RED:LINE});
    T(s,n,{x:x+0.28,y:2.34,w:1,h:0.42,fontSize:20,bold:true,color:hot?RED:'CBD5E1'});
    T(s,t,{x:x+0.28,y:2.84,w:cw-0.56,h:0.76,fontSize:17,bold:true,color:hot?RED:INK,lsm:1.25});
    T(s,b,{x:x+0.28,y:3.70,w:cw-0.56,h:1.10,fontSize:13,lsm:1.5});
  });
  band(s,5.32,[{text:'질문이 없으면 데이터는 ',options:{}},
               {text:'창고에 쌓인 재고',options:{color:GOLD}},
               {text:'와 같습니다.\n',options:{}},
               {text:'자산으로 잡혀 있지만 아무것도 만들어내지 않습니다.',options:{color:'94A3B8',fontSize:14}}],1.10);
  foot(s);
}

// ════════════════════════════════════════════════════
// 10
// ════════════════════════════════════════════════════
SEC.cur='3. 전환점';
{ const s=base();
  head(s,'AFTER AI',
    [{text:'AI가 나오자 ',options:{}},{text:'세 가지가 동시에 풀렸습니다',options:{color:GRN}}],{acc:GRN});
  const cw=(W-0.48)/3;
  // 1
  let x=P;
  card(s,x,2.15,cw,2.85,{fill:GRNL,line:GRNB});
  T(s,'물어보면 됩니다',{x:x+0.28,y:2.32,w:cw-0.56,h:0.40,fontSize:19,bold:true,color:GRN});
  T(s,'코일 60개, 2주치 기록을 훑는 일',{x:x+0.28,y:2.82,w:cw-0.56,h:0.32,fontSize:13,color:INK2});
  [['사람','며칠',GRAY],['AI','한 번',GRN]].forEach(([k,v,c],i)=>{
    const y=3.28+i*0.62;
    T(s,k,{x:x+0.28,y,w:1.2,h:0.34,fontSize:13,color:GRAY,valign:'middle'});
    T(s,v,{x:x+cw-2.0,y:y-0.06,w:1.72,h:0.46,fontSize:22,bold:true,color:c,align:'right'});
    if(i===0) rct(s,x+0.28,y+0.44,cw-0.56,0.012,{fill:GRNB});
  });
  // 2
  x=P+cw+0.24;
  card(s,x,2.15,cw,2.85,{fill:GRNL,line:GRNB});
  T(s,'틀린 질문을 해도\n비용이 안 듭니다',{x:x+0.28,y:2.32,w:cw-0.56,h:0.72,fontSize:19,bold:true,color:GRN,lsm:1.25});
  T(s,'예전엔 질문 하나 확인하려면 발주서를 써야 했습니다. 지금은 그냥 물어보고, 아니면 다시 물어봅니다.',
    {x:x+0.28,y:3.14,w:cw-0.56,h:0.75,fontSize:13,lsm:1.5});
  card(s,x+0.28,3.98,cw-0.56,0.86,{fill:WHITE,line:null});
  T(s,[{text:'틀려도 되니까 많이 물었고,\n많이 물으니까 ',options:{color:INK}},
       {text:'발견',options:{color:GRN}},{text:'이 나왔습니다.',options:{color:INK}}],
    {x:x+0.42,y:3.98,w:cw-0.84,h:0.86,fontSize:14,bold:true,valign:'middle',lsm:1.35});
  // 3
  x=P+2*(cw+0.24);
  card(s,x,2.15,cw,2.85,{fill:GRNL,line:GRNB});
  T(s,'화면까지 직접\n만들 수 있게 됐습니다',{x:x+0.28,y:2.32,w:cw-0.56,h:0.72,fontSize:19,bold:true,color:GRN,lsm:1.25});
  T(s,'41',{x,y:3.16,w:cw,h:0.90,fontSize:52,bold:true,color:GRN,align:'center'});
  T(s,'개 서비스  ·  30개가 실데이터로 가동',{x,y:4.08,w:cw,h:0.32,fontSize:13,bold:true,color:INK,align:'center'});
  T(s,'처음 만든 것은 조잡했습니다. 그래도 하나씩 만들었습니다.',
    {x:x+0.28,y:4.46,w:cw-0.56,h:0.34,fontSize:11.5,color:GRAY,align:'center'});
  card(s,P,5.32,W,1.10,{fill:GOLDL,line:GOLDB});
  T(s,[{text:'두 번의 실패는 자산을 쌓아두는 일이었고, 그것을 쓸 도구가 뒤늦게 도착한 것이었습니다.\n',options:{color:INK}},
       {text:'실패가 헛되지 않았던 이유는 저희가 잘했기 때문이 아닙니다. 버티고 있었기 때문입니다.',options:{color:'B45309',fontSize:15}}],
    {x:P+0.3,y:5.32,w:W-0.6,h:1.10,fontSize:18,bold:true,align:'center',valign:'middle',lsm:1.45});
  foot(s);
}

// ════════════════════════════════════════════════════
// 11
// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════
SEC.cur='';
{ const s=base(true);
  rct(s,0,0,0.14,SH,{fill:IND});
  rct(s,P,1.30,1.30,0.045,{fill:GOLD});
  T(s,'그래서 질문을 다시 바꿨습니다',{x:P,y:1.58,w:9,h:0.4,fontSize:15,bold:true,color:GOLD,charSpacing:1.6});
  T(s,'"무엇을 도입하면 경쟁력이 생길까"  —  두 번 다 틀렸습니다',
    {x:P,y:2.08,w:10,h:0.4,fontSize:15,bold:true,color:GRAY2,strike:true});
  const cw=(W-0.60)/2;
  [['01','우리는\n무엇을 모르는가','안을 보는 질문  →  품질이 완벽해집니다'],
   ['02','우리 고객들은\n무엇을 원하는가','밖을 보는 질문  →  값을 받을 수 있습니다']].forEach(([n,q,sub],i)=>{
    const x=P+i*(cw+0.60);
    rct(s,x,2.86,cw,0.045,{fill:'4F46E5'});
    T(s,n,{x,y:3.06,w:cw,h:0.60,fontSize:34,bold:true,color:'A5B4FC'});
    T(s,q,{x,y:3.76,w:cw,h:1.30,fontSize:33,bold:true,color:WHITE,lsm:1.26});
    T(s,sub,{x,y:5.16,w:cw,h:0.36,fontSize:14,bold:true,color:GRAY2});
  });
  card(s,P,5.86,W,0.92,{fill:NAVY2,line:'334155'});
  T(s,[{text:'①만 하면 품질은 좋아지는데 아무도 모릅니다 = 1차 실패    ·    ',options:{color:'CBD5E1'}},
       {text:'②만 하면 팔 것은 있는데 근거가 없습니다 = 2차 실패',options:{color:'CBD5E1'}}],
    {x:P+0.3,y:5.86,w:W-0.6,h:0.92,fontSize:14,bold:true,align:'center',valign:'middle'});
}

// ════════════════════════════════════════════════════
// 12
// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════
SEC.cur='4. 질문 ① 우리는 무엇을 모르는가';
{ const s=base();
  head(s,'QUESTION 01',
    [{text:'작업자가 ',options:{}},{text:'답하지 못하는 질문',options:{color:IND}},
     {text:'을 하나씩 없앴습니다',options:{}}]);
  const cw=(W-0.30)/2, ch=1.74;
  const d=[['01','"지금 잘 돌아가고 있나?"','소리와 감으로 판단 — 40년 공장장 머릿속에만 있었습니다',
            '세퍼레이터 셋팅 키오스크  ·  AI 헬퍼 모바일 KR/EN  ·  라인 통합관제(NMS)',false],
           ['02','"아까 그 불량, 그때 어떻게 돌렸더라?"','기억에 의존 — 그래서 같은 불량이 또 났습니다',
            '슬리터2 운행정보 모니터(길이 되감기)  ·  코일 작업 상세분석  ·  작업확인(거래처별 검색)',false],
           ['03','"이건 우리 잘못인가, 원래 그랬나?"','숫자만으로는 표면 흠집을 가릴 수 없었습니다',
            'AI 표면 전수검사  ·  장애 원인 분석(AI)  ·  공정×ERP 통합 대시보드  ·  품질 리포트',false],
           ['04','"우리 데이터는 믿을 만한가?"','가장 중요한 질문이었고, 답은 "아니오"였습니다',
            '텐션 데이터 수신 확인  ·  AI 인식 검증  ·  자동연동 모니터링',true]];
  d.forEach(([n,q,sub,svc,hot],i)=>{
    const x=P+(i%2)*(cw+0.30), y=2.10+Math.floor(i/2)*(ch+0.20);
    card(s,x,y,cw,ch,{fill:hot?REDL:WHITE,line:hot?REDB:LINE});
    rct(s,x,y,0.055,ch,{fill:hot?RED:IND});
    T(s,n,{x:x+0.30,y:y+0.20,w:0.70,h:0.40,fontSize:20,bold:true,color:hot?RED:INDB});
    T(s,q,{x:x+1.02,y:y+0.16,w:cw-1.30,h:0.58,fontSize:17,bold:true,color:hot?RED:INK,lsm:1.2});
    T(s,sub,{x:x+1.02,y:y+0.78,w:cw-1.30,h:0.34,fontSize:12.5,color:GRAY});
    rct(s,x+1.02,y+1.18,cw-1.30,0.012,{fill:hot?REDB:LINE});
    T(s,[{text:'적용 서비스  ',options:{color:GRAY2,fontSize:9.5}},{text:svc,options:{color:hot?RED:IND,fontSize:11}}],
      {x:x+1.02,y:y+1.24,w:cw-1.26,h:0.44,bold:true,lsm:1.3});
  });
  card(s,P,5.88,W,0.92,{fill:TINT,line:LINE});
  T(s,[{text:'큰 시스템을 만들지 않았습니다.  ',options:{color:INK}},
       {text:'답하지 못하는 질문을 찾아, 하나씩 지웠을 뿐입니다.',options:{color:IND}}],
    {x:P+0.3,y:5.88,w:W-0.6,h:0.92,fontSize:18,bold:true,align:'center',valign:'middle'});
  foot(s);
}

// ════════════════════════════════════════════════════
// 질문 ① 적용 서비스 — 지금 잘 돌아가고 있나
// ════════════════════════════════════════════════════
SEC.cur='4. 질문 ① 우리는 무엇을 모르는가';
{ const s=base();
  head(s,'QUESTION 01  ·  적용 서비스',
    [{text:'지금 이 순간의 상태를 ',options:{}},{text:'현장이 직접 봅니다',options:{color:IND}}]);
  const cw=(W-0.48)/3, cy=2.05, chh=3.62;

  // ── 1. 세퍼레이터 셋팅 키오스크 ──
  let x=P;
  card(s,x,cy,cw,chh,{fill:WHITE,line:LINE});
  rct(s,x,cy,cw,0.46,{fill:NAVY});
  T(s,'세퍼레이터 셋팅 키오스크',{x:x+0.18,y:cy,w:cw-0.9,h:0.46,fontSize:11,bold:true,color:WHITE,valign:'middle'});
  T(s,'태블릿',{x:x+cw-0.85,y:cy,w:0.70,h:0.46,fontSize:9,bold:true,color:'94A3B8',align:'right',valign:'middle'});
  T(s,'가공규격',{x:x+0.24,y:cy+0.60,w:1.0,h:0.24,fontSize:9.5,color:GRAY});
  card(s,x+0.24,cy+0.84,cw-0.48,0.46,{fill:TINT,line:LINE,lw:1.1});
  T(s,'0.75  ×  4  ×  C',{x:x+0.24,y:cy+0.84,w:cw-0.48,h:0.46,fontSize:14,bold:true,color:INK,align:'center',valign:'middle'});
  T(s,'AI 권장 스페이서 조합',{x:x+0.24,y:cy+1.42,w:2.2,h:0.24,fontSize:9.5,color:GRAY});
  const sw=(cw-0.48-0.16)/3;
  [['A','4.2',1],['B','3.0',0],['C','1.5',0]].forEach(([l,v,hot],i)=>{
    const bx=x+0.24+i*(sw+0.08);
    card(s,bx,cy+1.68,sw,0.76,{fill:hot?INDL:WHITE,line:hot?IND:LINE,lw:hot?1.8:1.2});
    T(s,l,{x:bx,y:cy+1.74,w:sw,h:0.22,fontSize:8.5,bold:true,color:hot?IND:GRAY,align:'center'});
    T(s,v,{x:bx,y:cy+1.94,w:sw,h:0.40,fontSize:19,bold:true,color:INK,align:'center'});
  });
  card(s,x+0.24,cy+2.54,cw-0.48,0.50,{fill:GRNL,line:GRNB,lw:1.2});
  T(s,'조합 확정  ·  합계 8.7 mm',{x:x+0.24,y:cy+2.54,w:cw-0.48,h:0.50,fontSize:11.5,bold:true,
    color:GRN,align:'center',valign:'middle'});
  chip(s,x+0.24,cy+3.14,'현장 배포중  ·  매일 사용','g',2.10);
  T(s,'40년 공장장이 암산하던 조합을 화면이 계산합니다.',
    {x,y:cy+chh+0.12,w:cw,h:0.32,fontSize:12,bold:true,color:INK2,align:'center'});

  // ── 2. AI 헬퍼 모바일 KR / EN ──
  x=P+cw+0.24;
  card(s,x,cy,cw,chh,{fill:WHITE,line:LINE});
  rct(s,x,cy,cw,0.46,{fill:NAVY});
  T(s,'AI 헬퍼 모바일',{x:x+0.18,y:cy,w:cw-1.2,h:0.46,fontSize:11,bold:true,color:WHITE,valign:'middle'});
  T(s,'KR / EN',{x:x+cw-1.15,y:cy,w:1.0,h:0.46,fontSize:9,bold:true,color:GOLD,align:'right',valign:'middle'});
  const pw2=(cw-0.48-0.16)/2;
  [['한국어','현재 속도','82','권장 78~85 · 적정','텐션'],
   ['English','Current speed','82','Rec. 78~85 · OK','Tension']].forEach(([lang,lab,v,ok,tl],i)=>{
    const bx=x+0.24+i*(pw2+0.16);
    card(s,bx,cy+0.60,pw2,2.44,{fill:i?GOLDL:TINT,line:i?GOLDB:LINE,lw:1.2});
    T(s,lang,{x:bx+0.10,y:cy+0.66,w:pw2-0.20,h:0.22,fontSize:8.5,bold:true,color:i?'B45309':GRAY});
    card(s,bx+0.10,cy+0.90,pw2-0.20,0.86,{fill:WHITE,line:GRNB,lw:1.1});
    T(s,lab,{x:bx+0.18,y:cy+0.95,w:pw2-0.36,h:0.20,fontSize:7.5,bold:true,color:GRN});
    T(s,v,{x:bx+0.18,y:cy+1.13,w:pw2-0.36,h:0.38,fontSize:22,bold:true,color:GRN});
    T(s,ok,{x:bx+0.18,y:cy+1.52,w:pw2-0.36,h:0.20,fontSize:7,bold:true,color:INK2});
    T(s,tl,{x:bx+0.10,y:cy+1.84,w:pw2-0.20,h:0.20,fontSize:7.5,color:GRAY});
    const tw=(pw2-0.20-0.10)/3;
    ['2.4','2.3','1.8'].forEach((tv,j)=>{
      const tx=bx+0.10+j*(tw+0.05);
      card(s,tx,cy+2.04,tw,0.42,{fill:j===2?REDL:WHITE,line:j===2?REDB:LINE,lw:1});
      T(s,tv,{x:tx-0.03,y:cy+2.04,w:tw+0.06,h:0.42,fontSize:8.5,bold:true,color:j===2?RED:INK,align:'center',valign:'middle'});
    });
    T(s,i?'progress 995 / 1,989 m':'진행 995 / 1,989 m',
      {x:bx+0.10,y:cy+2.54,w:pw2-0.20,h:0.20,fontSize:7,color:GRAY});
    rct(s,bx+0.10,cy+2.76,pw2-0.20,0.09,{fill:LINE});
    rct(s,bx+0.10,cy+2.76,(pw2-0.20)*0.5,0.09,{fill:IND});
  });
  chip(s,x+0.24,cy+3.14,'외국인 직원 5명이 통역 없이 사용','o',2.65);
  T(s,'같은 화면을 한국어·영어 두 벌로 만들었습니다.',
    {x,y:cy+chh+0.12,w:cw,h:0.32,fontSize:12,bold:true,color:INK2,align:'center'});

  // ── 3. 라인 통합관제 NMS ──
  x=P+2*(cw+0.24);
  card(s,x,cy,cw,chh,{fill:WHITE,line:LINE});
  rct(s,x,cy,cw,0.46,{fill:NAVY});
  T(s,'레벨링 라인 통합관제 (NMS)',{x:x+0.18,y:cy,w:cw-0.9,h:0.46,fontSize:11,bold:true,color:WHITE,valign:'middle'});
  T(s,'20초 갱신',{x:x+cw-1.0,y:cy,w:0.85,h:0.46,fontSize:8.5,bold:true,color:'94A3B8',align:'right',valign:'middle'});
  const lw3=(cw-0.48-0.16)/3;
  [['레벨링','68%',1],['슬리터2','41%',1],['슬리터1','대기',0]].forEach(([l,v,on],i)=>{
    const bx=x+0.24+i*(lw3+0.08);
    card(s,bx,cy+0.60,lw3,0.80,{fill:on?GRNL:TINT,line:on?GRNB:LINE,lw:1.2});
    s.addShape(pptx.ShapeType.ellipse,{x:bx+0.10,y:cy+0.70,w:0.11,h:0.11,
      fill:{color:on?GRN:GRAY2},line:{type:'none'}});
    T(s,l,{x:bx+0.26,y:cy+0.66,w:lw3-0.32,h:0.20,fontSize:8,bold:true,color:on?GRN:GRAY});
    T(s,v,{x:bx+0.10,y:cy+0.90,w:lw3-0.20,h:0.40,fontSize:16,bold:true,color:INK});
  });
  T(s,'실시간 파형 · 속도 (MPM)',{x:x+0.24,y:cy+1.52,w:2.4,h:0.22,fontSize:9,color:GRAY});
  rct(s,x+0.24,cy+1.78,cw-0.48,0.86,{fill:TINT,line:null});
  const pts=[[0,.72],[.09,.44],[.18,.58],[.27,.22],[.36,.40],[.45,.14],[.54,.30],[.63,.10],[.72,.36],[.81,.20],[.90,.42],[1,.28]];
  for(let i=0;i<pts.length-1;i++){
    const x1=x+0.30+pts[i][0]*(cw-0.60),   y1=cy+1.84+pts[i][1]*0.74;
    const x2=x+0.30+pts[i+1][0]*(cw-0.60), y2=cy+1.84+pts[i+1][1]*0.74;
    s.addShape(pptx.ShapeType.line,{x:Math.min(x1,x2),y:Math.min(y1,y2),
      w:Math.abs(x2-x1)||0.008,h:Math.abs(y2-y1)||0.008,
      line:{color:IND,width:2},flipV:y2<y1});
  }
  card(s,x+0.24,cy+2.74,cw-0.48,0.50,{fill:GOLDL,line:GOLDB,lw:1.2});
  T(s,'⚠  이상 알림 1건 — 슬리터2 텐션 편차',{x:x+0.24,y:cy+2.74,w:cw-0.48,h:0.50,
    fontSize:10,bold:true,color:'B45309',align:'center',valign:'middle'});
  T(s,'통신사 관제센터 방식을 공장에 적용했습니다.',
    {x,y:cy+chh+0.12,w:cw,h:0.32,fontSize:12,bold:true,color:INK2,align:'center'});

  band(s,6.14,[{text:'예전에는 기계 소리로 판단했습니다. ',options:{}},
               {text:'지금은 세 대의 라인이 지금 어떤 상태인지 화면에 떠 있습니다.',options:{color:GOLD}}],0.68);
  foot(s);
}

// ════════════════════════════════════════════════════
// 질문 ② 적용 서비스 — 그때 어떻게 돌렸더라
// ════════════════════════════════════════════════════
SEC.cur='4. 질문 ① 우리는 무엇을 모르는가';
{ const s=base();
  head(s,'QUESTION 02  ·  적용 서비스',
    [{text:'문제가 생긴 ',options:{}},{text:'그 지점으로 되감습니다',options:{color:IND}}]);
  const cw=(W-0.48)/3, cy=2.05, chh=3.62;

  // ── 1. 슬리터2 운행정보 모니터 ──
  let x=P;
  card(s,x,cy,cw,chh,{fill:WHITE,line:LINE});
  rct(s,x,cy,cw,0.46,{fill:NAVY});
  T(s,'슬리터2 운행정보 모니터',{x:x+0.18,y:cy,w:cw-0.9,h:0.46,fontSize:11,bold:true,color:WHITE,valign:'middle'});
  T(s,'모바일',{x:x+cw-0.85,y:cy,w:0.70,h:0.46,fontSize:9,bold:true,color:'94A3B8',align:'right',valign:'middle'});
  T(s,'2026-09-03  ·  코일 1622057',{x:x+0.24,y:cy+0.58,w:cw-0.48,h:0.24,fontSize:9.5,bold:true,color:INK});
  T(s,'길이 슬라이더를 움직여 보세요',{x:x+0.24,y:cy+0.82,w:cw-0.48,h:0.22,fontSize:8.5,color:GRAY});
  rct(s,x+0.24,cy+1.14,cw-0.48,0.12,{fill:LINE});
  rct(s,x+0.24,cy+1.14,(cw-0.48)*0.62,0.12,{fill:IND});
  s.addShape(pptx.ShapeType.ellipse,{x:x+0.24+(cw-0.48)*0.60,y:cy+1.03,w:0.32,h:0.32,
    fill:{color:IND},line:{color:WHITE,width:2.2}});
  T(s,'0 m',{x:x+0.24,y:cy+1.40,w:1.0,h:0.20,fontSize:7.5,color:GRAY2});
  T(s,'1,989 m',{x:x+cw-1.24,y:cy+1.40,w:1.0,h:0.20,fontSize:7.5,color:GRAY2,align:'right'});
  T(s,[{text:'1,240',options:{fontSize:24}},{text:'  m 지점',options:{fontSize:10,color:GRAY}}],
    {x:x+0.24,y:cy+1.62,w:cw-0.48,h:0.42,bold:true,color:INK,align:'center'});
  [['속도','79 mpm',0],['텐션 1~4','2.4 / 2.3 / 0.0 / 2.5',0],['가동 상태','RUN',2],['시각','09:21:14',0]]
   .forEach(([k,v,c],i)=>{
    const y=cy+2.06+i*0.27;
    T(s,k,{x:x+0.24,y,w:1.25,h:0.24,fontSize:8.5,color:GRAY2});
    T(s,v,{x:x+1.45,y,w:cw-1.69,h:0.24,fontSize:8.5,bold:true,color:c===2?GRN:INK,align:'right'});
    rct(s,x+0.24,y+0.26,cw-0.48,0.012,{fill:LINE2});
  });
  card(s,x+0.24,cy+3.14,cw-0.48,0.40,{fill:REDL,line:REDB,lw:1.2});
  T(s,'텐션3 이상 — 작업 내내 0',{x:x+0.24,y:cy+3.14,w:cw-0.48,h:0.40,fontSize:9.5,bold:true,
    color:RED,align:'center',valign:'middle'});
  T(s,'막대를 끌면 전 구간 어느 지점이든 되감아 봅니다.',
    {x,y:cy+chh+0.12,w:cw,h:0.32,fontSize:12,bold:true,color:INK2,align:'center'});

  // ── 2. 코일 작업 상세 분석 ──
  x=P+cw+0.24;
  card(s,x,cy,cw,chh,{fill:WHITE,line:LINE});
  rct(s,x,cy,cw,0.46,{fill:NAVY});
  T(s,'코일 작업 상세 분석',{x:x+0.18,y:cy,w:cw-0.9,h:0.46,fontSize:11,bold:true,color:WHITE,valign:'middle'});
  T(s,'PC',{x:x+cw-0.70,y:cy,w:0.55,h:0.46,fontSize:9,bold:true,color:'94A3B8',align:'right',valign:'middle'});
  T(s,'길이 구간별 속도 · 텐션 변화',{x:x+0.24,y:cy+0.58,w:cw-0.48,h:0.24,fontSize:9.5,bold:true,color:INK});
  rct(s,x+0.24,cy+0.90,cw-0.48,1.28,{fill:TINT,line:null});
  // 속도 라인 (인디고)
  const sp=[[0,.30],[.12,.62],[.25,.70],[.38,.66],[.50,.72],[.62,.55],[.75,.68],[.88,.64],[1,.36]];
  for(let i=0;i<sp.length-1;i++){
    const x1=x+0.32+sp[i][0]*(cw-0.64),   y1=cy+2.06-sp[i][1]*1.06;
    const x2=x+0.32+sp[i+1][0]*(cw-0.64), y2=cy+2.06-sp[i+1][1]*1.06;
    s.addShape(pptx.ShapeType.line,{x:Math.min(x1,x2),y:Math.min(y1,y2),
      w:Math.abs(x2-x1)||0.008,h:Math.abs(y2-y1)||0.008,
      line:{color:IND,width:2.2},flipV:y2<y1});
  }
  // 텐션 라인 (초록) — 중간에 급락 구간
  const tn=[[0,.52],[.12,.55],[.25,.54],[.38,.20],[.50,.18],[.62,.50],[.75,.52],[.88,.51],[1,.48]];
  for(let i=0;i<tn.length-1;i++){
    const x1=x+0.32+tn[i][0]*(cw-0.64),   y1=cy+2.06-tn[i][1]*1.06;
    const x2=x+0.32+tn[i+1][0]*(cw-0.64), y2=cy+2.06-tn[i+1][1]*1.06;
    s.addShape(pptx.ShapeType.line,{x:Math.min(x1,x2),y:Math.min(y1,y2),
      w:Math.abs(x2-x1)||0.008,h:Math.abs(y2-y1)||0.008,
      line:{color:GRN,width:2.2,dashType:'dash'},flipV:y2<y1});
  }
  // 이상 구간 표시
  rct(s,x+0.32+(cw-0.64)*0.34,cy+0.94,(cw-0.64)*0.20,1.20,{fill:'FEE2E2',line:null});
  T(s,'이상 구간',{x:x+0.32+(cw-0.64)*0.30,y:cy+2.14,w:1.2,h:0.20,fontSize:7.5,bold:true,color:RED,align:'center'});
  let lx=x+0.24;
  lx += chip(s,lx,cy+2.42,'— 속도','i')+0.10;
  chip(s,lx,cy+2.42,'--- 텐션','g');
  card(s,x+0.24,cy+2.84,cw-0.48,0.66,{fill:INDL,line:INDB,lw:1.2});
  T(s,'동일 사양 30개 코일 대비\n이 구간만 텐션 편차 +240%',
    {x:x+0.24,y:cy+2.84,w:cw-0.48,h:0.66,fontSize:9.5,bold:true,color:IND,align:'center',valign:'middle',lsm:1.3});
  T(s,'불량이 난 지점의 운전 조건이 그대로 남아 있습니다.',
    {x,y:cy+chh+0.12,w:cw,h:0.32,fontSize:12,bold:true,color:INK2,align:'center'});

  // ── 3. 작업 확인 (거래처별 검색) ──
  x=P+2*(cw+0.24);
  card(s,x,cy,cw,chh,{fill:WHITE,line:LINE});
  rct(s,x,cy,cw,0.46,{fill:NAVY});
  T(s,'작업 확인 (거래처별 검색)',{x:x+0.18,y:cy,w:cw-0.9,h:0.46,fontSize:11,bold:true,color:WHITE,valign:'middle'});
  T(s,'모바일',{x:x+cw-0.85,y:cy,w:0.70,h:0.46,fontSize:9,bold:true,color:'94A3B8',align:'right',valign:'middle'});
  T(s,'기사님 전화 응대용',{x:x+0.24,y:cy+0.58,w:cw-0.48,h:0.24,fontSize:9,color:GRAY});
  card(s,x+0.24,cy+0.86,cw-0.48,0.50,{fill:TINT,line:IND,lw:1.6});
  T(s,[{text:'거래처명   ',options:{fontSize:8.5,color:GRAY2}},{text:'대한강재',options:{fontSize:13,color:INK}}],
    {x:x+0.36,y:cy+0.86,w:cw-0.60,h:0.50,bold:true,valign:'middle'});
  T(s,'레벨링 · 슬리터1 · 슬리터2 전체에서 검색',{x:x+0.24,y:cy+1.42,w:cw-0.48,h:0.22,fontSize:8,color:GRAY2});
  [['1622057','0.75×4×C','09-03','완료',1],
   ['1622051','1.2×6×C','09-03','완료',1],
   ['1621998','0.8×5×C','09-02','작업중',2]].forEach(([id,spec,dt,st,k],i)=>{
    const y=cy+1.72+i*0.52;
    card(s,x+0.24,y,cw-0.48,0.44,{fill:WHITE,line:LINE,lw:1.1});
    T(s,id,{x:x+0.34,y:y,w:1.05,h:0.44,fontSize:9,bold:true,color:INK,valign:'middle'});
    T(s,spec,{x:x+1.42,y:y,w:1.0,h:0.44,fontSize:8,color:GRAY,valign:'middle'});
    T(s,dt,{x:x+2.40,y:y,w:0.72,h:0.44,fontSize:8,color:GRAY,valign:'middle'});
    T(s,st,{x:x+cw-1.10,y:y,w:0.86,h:0.44,fontSize:8.5,bold:true,
      color:k===1?GRN:IND,align:'right',valign:'middle'});
  });
  card(s,x+0.24,cy+3.30,cw-0.48,0.22,{fill:WHITE,line:null});
  T(s,'전화 받는 동안 답이 나옵니다.',
    {x,y:cy+chh+0.12,w:cw,h:0.32,fontSize:12,bold:true,color:INK2,align:'center'});

  band(s,6.14,[{text:'예전에는 "그때 어떻게 돌렸지"를 아무도 답하지 못했습니다. ',options:{}},
               {text:'지금은 코일번호와 위치만 있으면 됩니다.',options:{color:GOLD}}],0.68);
  foot(s);
}

// ════════════════════════════════════════════════════
// 질문 ③ 적용 서비스 — 우리 잘못인가 원래 그랬나
// ════════════════════════════════════════════════════
SEC.cur='4. 질문 ① 우리는 무엇을 모르는가';
{ const s=base();
  head(s,'QUESTION 03  ·  적용 서비스',
    [{text:'원소재 결함인지 ',options:{}},{text:'가공 결함인지 가립니다',options:{color:IND}}]);
  const cw=(W-0.48)/3, cy=2.05, chh=3.62;

  // ── 1. AI 표면 전수검사 ──
  let x=P;
  card(s,x,cy,cw,chh,{fill:WHITE,line:LINE});
  rct(s,x,cy,cw,0.46,{fill:NAVY});
  T(s,'AI 표면 전수검사',{x:x+0.18,y:cy,w:cw-1.3,h:0.46,fontSize:11,bold:true,color:WHITE,valign:'middle'});
  T(s,'2차 실패 시스템',{x:x+cw-1.45,y:cy,w:1.30,h:0.46,fontSize:8.5,bold:true,color:GOLD,align:'right',valign:'middle'});
  T(s,'코일 전개 · 결함 위치 맵',{x:x+0.24,y:cy+0.58,w:cw-0.48,h:0.24,fontSize:9.5,bold:true,color:INK});
  rct(s,x+0.24,cy+0.90,cw-0.48,0.56,{fill:'E2E8F0',line:null});
  [[0.18,RED],[0.34,GOLD],[0.52,RED],[0.78,GOLD]].forEach(([px,c])=>{
    s.addShape(pptx.ShapeType.ellipse,{x:x+0.24+(cw-0.48)*px,y:cy+1.06,w:0.20,h:0.20,
      fill:{color:c},line:{color:WHITE,width:1.2}});
  });
  T(s,'0 m',{x:x+0.24,y:cy+1.48,w:0.9,h:0.20,fontSize:7.5,color:GRAY2});
  T(s,'1,989 m',{x:x+cw-1.14,y:cy+1.48,w:0.9,h:0.20,fontSize:7.5,color:GRAY2,align:'right'});
  T(s,'검출 결함 4건  ·  전수 촬영 (샘플 아님)',{x:x+0.24,y:cy+1.72,w:cw-0.48,h:0.22,fontSize:8.5,bold:true,color:RED});
  const iw=(cw-0.48-0.12)/2;
  [['352 m 지점','스크래치'],['1,024 m 지점','덴트']].forEach(([t,k],i)=>{
    const bx=x+0.24+i*(iw+0.12);
    rct(s,bx,cy+2.00,iw,0.72,{fill:'475569',line:null});
    s.addShape(pptx.ShapeType.line,{x:bx+0.20,y:cy+2.26,w:iw-0.40,h:0.18,
      line:{color:'F1F5F9',width:2}});
    T(s,t,{x:bx,y:cy+2.76,w:iw,h:0.20,fontSize:7.5,bold:true,color:INK,align:'center'});
    T(s,k,{x:bx,y:cy+2.94,w:iw,h:0.20,fontSize:7,color:GRAY,align:'center'});
  });
  chip(s,x+0.24,cy+3.22,'결함 전후 영상 보관','n',1.85);
  T(s,'3년 전 실패한 시스템이 남긴 자료입니다.',
    {x,y:cy+chh+0.12,w:cw,h:0.32,fontSize:12,bold:true,color:'B45309',align:'center'});

  // ── 2. 장애 원인 분석 (AI) ──
  x=P+cw+0.24;
  card(s,x,cy,cw,chh,{fill:WHITE,line:LINE});
  rct(s,x,cy,cw,0.46,{fill:NAVY});
  T(s,'장애 원인 분석 (AI)',{x:x+0.18,y:cy,w:cw-0.9,h:0.46,fontSize:11,bold:true,color:WHITE,valign:'middle'});
  T(s,'30분 내',{x:x+cw-0.90,y:cy,w:0.75,h:0.46,fontSize:8.5,bold:true,color:'94A3B8',align:'right',valign:'middle'});
  T(s,'운전 기록  ×  CCTV  동일 시간축 대조',{x:x+0.24,y:cy+0.58,w:cw-0.48,h:0.24,fontSize:9.5,bold:true,color:INK});
  // 시간축
  rct(s,x+0.24,cy+1.06,cw-0.48,0.045,{fill:LINE});
  [[0.15,'09:18',GRAY2],[0.42,'09:21',RED],[0.72,'09:24',GRAY2]].forEach(([px,t,c])=>{
    s.addShape(pptx.ShapeType.ellipse,{x:x+0.24+(cw-0.48)*px-0.08,y:cy+1.006,w:0.16,h:0.16,
      fill:{color:c},line:{type:'none'}});
    T(s,t,{x:x+0.24+(cw-0.48)*px-0.45,y:cy+1.22,w:0.90,h:0.20,fontSize:7.5,bold:true,color:c,align:'center'});
  });
  T(s,'PLC',{x:x+0.24,y:cy+0.86,w:0.6,h:0.18,fontSize:7,bold:true,color:GRAY2});
  // CCTV 프레임
  rct(s,x+0.24,cy+1.52,cw-0.48,0.82,{fill:'334155',line:null});
  T(s,'CCTV  09:21:14',{x:x+0.34,y:cy+1.58,w:1.6,h:0.20,fontSize:7,bold:true,color:'94A3B8'});
  s.addShape(pptx.ShapeType.rect,{x:x+1.30,y:cy+1.84,w:0.90,h:0.36,
    fill:{type:'none'},line:{color:GOLD,width:1.6}});
  T(s,'정지 순간',{x:x+2.28,y:cy+1.94,w:0.95,h:0.20,fontSize:7,bold:true,color:GOLD});
  // 원인 후보
  T(s,'AI 원인 후보',{x:x+0.24,y:cy+2.44,w:1.5,h:0.20,fontSize:8.5,bold:true,color:GRAY});
  [['원자재 표면 이물','68%',1],['장력 급변','22%',0],['롤 정렬','10%',0]].forEach(([t,pct,hot],i)=>{
    const y=cy+2.68+i*0.28;
    T(s,t,{x:x+0.24,y,w:1.7,h:0.24,fontSize:8,bold:hot?true:false,color:hot?RED:INK2});
    rct(s,x+2.00,y+0.08,1.05,0.10,{fill:LINE});
    rct(s,x+2.00,y+0.08,1.05*parseInt(pct)/100,0.10,{fill:hot?RED:GRAY2});
    T(s,pct,{x:x+cw-0.70,y,w:0.50,h:0.24,fontSize:8,bold:true,color:hot?RED:GRAY,align:'right'});
  });
  T(s,'가공 중단이 아니라 원자재가 원인이었습니다.',
    {x,y:cy+chh+0.12,w:cw,h:0.32,fontSize:12,bold:true,color:INK2,align:'center'});

  // ── 3. 품질 리포트 (고객 제출본) ──
  x=P+2*(cw+0.24);
  card(s,x,cy,cw,chh,{fill:WHITE,line:LINE});
  rct(s,x,cy,cw,0.46,{fill:IND});
  T(s,'품질 리포트',{x:x+0.18,y:cy,w:cw-1.3,h:0.46,fontSize:11,bold:true,color:WHITE,valign:'middle'});
  T(s,'고객 제출본',{x:x+cw-1.35,y:cy,w:1.20,h:0.46,fontSize:8.5,bold:true,color:'C7CBFF',align:'right',valign:'middle'});
  // A4 문서 미니어처
  card(s,x+0.40,cy+0.62,cw-0.80,2.60,{fill:WHITE,line:LINE,lw:1.4});
  T(s,'코일 품질 성적서',{x:x+0.54,y:cy+0.74,w:cw-1.08,h:0.26,fontSize:10.5,bold:true,color:INK});
  rct(s,x+0.54,cy+1.02,cw-1.08,0.012,{fill:LINE});
  [['코일번호','1622057'],['거래처','(주)대한강재'],['가공일','2026-09-03'],
   ['작업 중단','없음'],['표면 결함','원자재 기인 2건'],['두께 편차','± 0.01 mm']]
   .forEach(([k,v],i)=>{
    const y=cy+1.12+i*0.26;
    T(s,k,{x:x+0.54,y,w:1.25,h:0.22,fontSize:7.5,color:GRAY});
    T(s,v,{x:x+1.82,y,w:cw-2.36,h:0.22,fontSize:7.5,bold:true,color:INK,align:'right'});
  });
  card(s,x+0.54,cy+2.72,cw-1.08,0.40,{fill:GRNL,line:GRNB,lw:1.2});
  T(s,'판정   적 합',{x:x+0.54,y:cy+2.72,w:cw-1.08,h:0.40,fontSize:11,bold:true,
    color:GRN,align:'center',valign:'middle'});
  chip(s,x+0.40,cy+3.32,'출하 시 자동 첨부 (준비 중)','i',2.55);
  T(s,'방어 수단이 아니라, 팔 수 있는 물건이었습니다.',
    {x,y:cy+chh+0.12,w:cw,h:0.32,fontSize:12,bold:true,color:IND,align:'center'});

  band(s,6.14,[{text:'말로는 말을 이길 수 없습니다. ',options:{}},
               {text:'기록은 이깁니다.',options:{color:GOLD}}],0.68);
  foot(s);
}

// ════════════════════════════════════════════════════
// 질문 ④ 적용 서비스 — 데이터는 믿을 만한가
// ════════════════════════════════════════════════════
SEC.cur='4. 질문 ① 우리는 무엇을 모르는가';
{ const s=base();
  head(s,'QUESTION 04  ·  적용 서비스',
    [{text:'다른 서비스를 ',options:{}},{text:'감시하는 서비스',options:{color:RED}},
     {text:'입니다',options:{}}],{acc:RED});
  const cw=(W-0.48)/3, cy=2.05, chh=3.62;

  // ── 1. 텐션 데이터 수신 확인 ──
  let x=P;
  card(s,x,cy,cw,chh,{fill:WHITE,line:LINE});
  rct(s,x,cy,cw,0.46,{fill:NAVY});
  T(s,'텐션 데이터 수신 확인',{x:x+0.18,y:cy,w:cw-0.9,h:0.46,fontSize:11,bold:true,color:WHITE,valign:'middle'});
  T(s,'8초 갱신',{x:x+cw-0.95,y:cy,w:0.80,h:0.46,fontSize:8.5,bold:true,color:'94A3B8',align:'right',valign:'middle'});
  const nw=(cw-0.48-0.12)/2;
  [['오늘 저장','412 건'],['누적','38,740 건']].forEach(([l,v],i)=>{
    const bx=x+0.24+i*(nw+0.12);
    card(s,bx,cy+0.60,nw,0.78,{fill:TINT,line:LINE,lw:1.1});
    T(s,l,{x:bx,y:cy+0.66,w:nw,h:0.20,fontSize:8,color:GRAY,align:'center'});
    T(s,v,{x:bx,y:cy+0.86,w:nw,h:0.40,fontSize:15,bold:true,color:INK,align:'center'});
  });
  T(s,'최근 6시간 수신 커버리지',{x:x+0.24,y:cy+1.50,w:cw-0.48,h:0.22,fontSize:9,bold:true,color:GRAY});
  const bw=(cw-0.48-0.20)/6;
  [1,1,1,0,1,1].forEach((ok,i)=>{
    const bx=x+0.24+i*(bw+0.04);
    rct(s,bx,cy+1.76,bw,0.44,{fill:ok?GRNL:REDL,line:ok?GRNB:REDB,lw:1.1});
    T(s,ok?'✓':'✕',{x:bx,y:cy+1.76,w:bw,h:0.44,fontSize:11,bold:true,
      color:ok?GRN:RED,align:'center',valign:'middle'});
  });
  T(s,'11시대 결측 1건  ·  조명 변화 추정',{x:x+0.24,y:cy+2.26,w:cw-0.48,h:0.22,fontSize:8,bold:true,color:RED});
  T(s,'최근 저장 레코드',{x:x+0.24,y:cy+2.56,w:cw-0.48,h:0.22,fontSize:9,bold:true,color:GRAY});
  [['14:32','2.43  ·  신뢰도 0.97'],['14:31','2.41  ·  신뢰도 0.95']].forEach(([t,v],i)=>{
    const y=cy+2.80+i*0.28;
    T(s,t,{x:x+0.24,y,w:0.8,h:0.24,fontSize:8,color:GRAY2});
    T(s,v,{x:x+1.06,y,w:cw-1.30,h:0.24,fontSize:8,bold:true,color:INK,align:'right'});
  });
  T(s,'데이터가 지금도 들어오고 있는지를 봅니다.',
    {x,y:cy+chh+0.12,w:cw,h:0.32,fontSize:12,bold:true,color:INK2,align:'center'});

  // ── 2. AI 인식 검증 ──
  x=P+cw+0.24;
  card(s,x,cy,cw,chh,{fill:WHITE,line:LINE});
  rct(s,x,cy,cw,0.46,{fill:NAVY});
  T(s,'AI 인식 검증',{x:x+0.18,y:cy,w:cw-0.9,h:0.46,fontSize:11,bold:true,color:WHITE,valign:'middle'});
  T(s,'개발용',{x:x+cw-0.85,y:cy,w:0.70,h:0.46,fontSize:9,bold:true,color:'94A3B8',align:'right',valign:'middle'});
  T(s,'실제 사진  vs  AI 판독값',{x:x+0.24,y:cy+0.58,w:cw-0.48,h:0.24,fontSize:9.5,bold:true,color:INK});
  const hw=(cw-0.48-0.14)/2;
  // 좌: 계기판 사진
  rct(s,x+0.24,cy+0.90,hw,1.16,{fill:'1E293B',line:null});
  rct(s,x+0.40,cy+1.18,hw-0.32,0.52,{fill:'0B1220',line:null});
  T(s,'2.43',{x:x+0.40,y:cy+1.24,w:hw-0.32,h:0.40,fontSize:17,bold:true,color:'34D399',align:'center'});
  T(s,'촬영 원본',{x:x+0.24,y:cy+2.10,w:hw,h:0.20,fontSize:7.5,color:GRAY,align:'center'});
  // 우: 인식 결과
  card(s,x+0.24+hw+0.14,cy+0.90,hw,1.16,{fill:GRNL,line:GRNB,lw:1.2});
  T(s,'AI 판독',{x:x+0.24+hw+0.14,y:cy+0.98,w:hw,h:0.20,fontSize:7.5,color:GRN,align:'center'});
  T(s,'2.43',{x:x+0.24+hw+0.14,y:cy+1.22,w:hw,h:0.42,fontSize:19,bold:true,color:GRN,align:'center'});
  T(s,'신뢰도 0.97',{x:x+0.24+hw+0.14,y:cy+1.68,w:hw,h:0.20,fontSize:7.5,bold:true,color:INK2,align:'center'});
  T(s,'일치 ✓',{x:x+0.24+hw+0.14,y:cy+2.10,w:hw,h:0.20,fontSize:8,bold:true,color:GRN,align:'center'});
  rct(s,x+0.24,cy+2.40,cw-0.48,0.012,{fill:LINE});
  T(s,'표본 검증 결과',{x:x+0.24,y:cy+2.52,w:cw-0.48,h:0.22,fontSize:9,bold:true,color:GRAY});
  [['일치','186 / 200',GRN],['불일치','9 / 200',GOLD],['판독 실패','5 / 200',RED]].forEach(([k,v,c],i)=>{
    const y=cy+2.76+i*0.28;
    T(s,k,{x:x+0.24,y,w:1.5,h:0.24,fontSize:8.5,color:INK2});
    T(s,v,{x:x+cw-1.50,y,w:1.26,h:0.24,fontSize:8.5,bold:true,color:c,align:'right'});
  });
  T(s,'AI가 읽은 값도 사람이 다시 확인합니다.',
    {x,y:cy+chh+0.12,w:cw,h:0.32,fontSize:12,bold:true,color:INK2,align:'center'});

  // ── 3. 자동연동 모니터링 ──
  x=P+2*(cw+0.24);
  card(s,x,cy,cw,chh,{fill:WHITE,line:LINE});
  rct(s,x,cy,cw,0.46,{fill:NAVY});
  T(s,'자동연동 모니터링',{x:x+0.18,y:cy,w:cw-0.9,h:0.46,fontSize:11,bold:true,color:WHITE,valign:'middle'});
  T(s,'RPA 대체',{x:x+cw-1.00,y:cy,w:0.85,h:0.46,fontSize:8.5,bold:true,color:'94A3B8',align:'right',valign:'middle'});
  T(s,'ERP 작업지시 → 라인 대시보드 자동 등록',{x:x+0.24,y:cy+0.58,w:cw-0.48,h:0.24,fontSize:9,bold:true,color:INK});
  card(s,x+0.24,cy+0.90,cw-0.48,0.86,{fill:GRNL,line:GRNB,lw:1.2});
  T(s,'오늘 자동 등록',{x:x+0.36,y:cy+0.98,w:1.8,h:0.22,fontSize:8.5,bold:true,color:GRN});
  T(s,[{text:'37',options:{fontSize:22}},{text:' 건',options:{fontSize:11}}],
    {x:x+0.36,y:cy+1.18,w:1.6,h:0.44,bold:true,color:GRN});
  T(s,'수작업 0건',{x:x+cw-1.40,y:cy+1.28,w:1.16,h:0.24,fontSize:9,bold:true,color:INK,align:'right'});
  // 흐름
  const fw=(cw-0.48-0.40)/3;
  ['그린ERP','자동 등록','대시보드'].forEach((t,i)=>{
    const bx=x+0.24+i*(fw+0.20);
    card(s,bx,cy+1.94,fw,0.56,{fill:i===1?INDL:TINT,line:i===1?INDB:LINE,lw:1.1});
    T(s,t,{x:bx+0.03,y:cy+1.94,w:fw-0.06,h:0.56,fontSize:8,bold:true,
      color:i===1?IND:INK2,align:'center',valign:'middle'});
    if(i<2) T(s,'›',{x:bx+fw,y:cy+2.02,w:0.20,h:0.40,fontSize:13,bold:true,color:GRAY2,align:'center'});
  });
  T(s,'최근 실행 이력',{x:x+0.24,y:cy+2.58,w:cw-0.48,h:0.22,fontSize:9,bold:true,color:GRAY});
  [['14:30','정상 · 3건',GRN],['14:20','정상 · 0건',GRAY],['14:10','정상 · 5건',GRN]].forEach(([t,v,c],i)=>{
    const y=cy+2.80+i*0.24;
    T(s,t,{x:x+0.24,y,w:0.8,h:0.22,fontSize:8,color:GRAY2});
    T(s,v,{x:x+1.06,y,w:cw-1.30,h:0.22,fontSize:8,bold:true,color:c,align:'right'});
  });
  T(s,'사람이 옮겨 적던 일을 시스템이 대신합니다.',
    {x,y:cy+chh+0.12,w:cw,h:0.32,fontSize:12,bold:true,color:INK2,align:'center'});

  band(s,6.14,[{text:'187만 건이 있어도 ',options:{}},
               {text:'검증하지 않은 데이터는 자산이 아니라 위험입니다.',options:{color:GOLD}}],0.68,'7F1D1D');
  foot(s);
}

// ════════════════════════════════════════════════════
// 13
// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════
SEC.cur='4. 질문 ① 우리는 무엇을 모르는가';
{ const s=base();
  head(s,'IN THE FIELD',
    [{text:'지금 이 순간을 ',options:{color:INK}},{text:'큰 숫자로',options:{color:IND}},
     {text:', 지난 순간은 ',options:{color:INK}},{text:'되감아서',options:{color:IND}}]);
  const py=2.05, pw=2.32, ph=3.90;
  // 폰1
  let px=P+0.30;
  card(s,px,py,pw,ph,{fill:NAVY,line:null});
  rct(s,px+0.11,py+0.40,pw-0.22,ph-0.52,{fill:WHITE});
  T(s,'AI 헬퍼 · 슬리터2',{x:px+0.15,y:py+0.08,w:1.6,h:0.26,fontSize:9,bold:true,color:WHITE});
  T(s,'11:42',{x:px+pw-0.78,y:py+0.08,w:0.62,h:0.26,fontSize:9,bold:true,color:WHITE,align:'right'});
  card(s,px+0.24,py+0.56,pw-0.48,1.00,{fill:GRNL,line:GRNB,lw:1.2});
  T(s,'현재 속도',{x:px+0.34,y:py+0.62,w:1.5,h:0.22,fontSize:8.5,bold:true,color:GRN});
  T(s,[{text:'82',options:{fontSize:23}},{text:' mpm',options:{fontSize:9.5}}],
    {x:px+0.34,y:py+0.78,w:1.8,h:0.40,bold:true,color:GRN});
  T(s,'권장 78~85 · 적정',{x:px+0.34,y:py+1.26,w:1.7,h:0.22,fontSize:8,bold:true,color:INK2});
  const tw=(pw-0.48-0.14)/3;
  [['텐션1','2.4',0],['텐션2','2.3',0],['텐션3','1.8',1]].forEach(([l,v,hot],i)=>{
    const x=px+0.24+i*(tw+0.07);
    card(s,x,py+1.68,tw,0.56,{fill:hot?GOLDL:WHITE,line:hot?GOLDB:LINE,lw:1.1});
    T(s,l,{x,y:py+1.73,w:tw,h:0.20,fontSize:7.5,bold:true,color:hot?'B45309':GRAY,align:'center'});
    T(s,v,{x,y:py+1.90,w:tw,h:0.30,fontSize:14,bold:true,color:hot?'B45309':INK,align:'center'});
  });
  T(s,'진행  995 / 1,989 m',{x:px+0.24,y:py+2.36,w:1.8,h:0.22,fontSize:8.5,bold:true,color:GRAY});
  rct(s,px+0.24,py+2.60,pw-0.48,0.11,{fill:LINE});
  rct(s,px+0.24,py+2.60,(pw-0.48)*0.5,0.11,{fill:IND});
  chip(s,px+0.24,py+2.88,'현장 배포중','g',1.0);
  // 폰2
  px = P+0.30+pw+0.26;
  card(s,px,py,pw,ph,{fill:NAVY,line:null});
  rct(s,px+0.11,py+0.40,pw-0.22,ph-0.52,{fill:WHITE});
  T(s,'슬리터2 운행 정보',{x:px+0.15,y:py+0.08,w:1.6,h:0.26,fontSize:9,bold:true,color:WHITE});
  T(s,'되감기',{x:px+pw-0.78,y:py+0.08,w:0.62,h:0.26,fontSize:9,bold:true,color:WHITE,align:'right'});
  T(s,'2026-09-03 · 코일 1622057',{x:px+0.24,y:py+0.50,w:1.9,h:0.24,fontSize:9,bold:true,color:INK});
  rct(s,px+0.24,py+0.86,pw-0.48,0.10,{fill:LINE});
  rct(s,px+0.24,py+0.86,(pw-0.48)*0.62,0.10,{fill:IND});
  s.addShape(pptx.ShapeType.ellipse,{x:px+0.24+(pw-0.48)*0.60,y:py+0.77,w:0.26,h:0.26,
    fill:{color:IND},line:{color:WHITE,width:1.8}});
  T(s,[{text:'1,240',options:{fontSize:20}},{text:' m 지점',options:{fontSize:9,color:GRAY}}],
    {x:px+0.24,y:py+1.14,w:pw-0.48,h:0.36,bold:true,color:INK,align:'center'});
  [['속도','79 mpm',0],['텐션','2.4/2.3/0.0/2.5',0],['가동','RUN',2],['시각','09:21:14',0]]
   .forEach(([k,v,c],i)=>{
    const y=py+1.58+i*0.36;
    T(s,k,{x:px+0.24,y,w:0.66,h:0.26,fontSize:8.5,color:GRAY2});
    T(s,v,{x:px+0.80,y,w:pw-1.04,h:0.26,fontSize:8,bold:true,color:c===2?GRN:INK,align:'right'});
    rct(s,px+0.24,y+0.30,pw-0.48,0.012,{fill:LINE2});
  });
  card(s,px+0.24,py+3.16,pw-0.48,0.44,{fill:REDL,line:REDB,lw:1.1});
  T(s,'텐션3 — 작업 내내 0',{x:px+0.24,y:py+3.16,w:pw-0.48,h:0.44,fontSize:8.5,bold:true,
    color:RED,align:'center',valign:'middle'});
  // 설명
  const rx=P+0.30+2*pw+0.52+0.20, rw=P+W-rx;
  const blocks=[['예전','작업자가 기계 소리와 손끝 감각으로 판단했습니다. 40년 경력 공장장님은 아셨지만, 그 감각은 어디에도 적혀 있지 않았습니다. 퇴직하시면 같이 사라지는 것이었습니다.',REDL,REDB,'r'],
                ['지금','태블릿과 휴대폰에 지금 이 순간의 속도와 힘이 큰 숫자로 뜹니다. 코일 번호와 위치를 넣으면 그 지점으로 되감아 볼 수 있습니다. 한국어·영어 두 벌입니다.',GRNL,GRNB,'g']];
  blocks.forEach(([lab,body,fill,line,kind],i)=>{
    const y=py+i*1.98;
    card(s,rx,y,rw,1.86,{fill,line});
    chip(s,rx+0.24,y+0.14,lab,kind,0.62);
    T(s,body,{x:rx+0.24,y:y+0.56,w:rw-0.48,h:1.18,fontSize:13.5,color:INK2,lsm:1.5});
  });
  foot(s);
}

// ════════════════════════════════════════════════════
// 14
// ════════════════════════════════════════════════════
SEC.cur='4. 질문 ① 우리는 무엇을 모르는가';
{ const s=base();
  head(s,'NO NEW EQUIPMENT',
    [{text:'장비를 바꾸지 않고 데이터를 얻었습니다 — ',options:{}},
     {text:'휴대폰 한 대로',options:{color:'B45309'}}],{acc:GOLD});
  // 오래된 장비
  card(s,P,2.20,2.80,2.70,{fill:TINT,line:LINE});
  T(s,'30년 된 장비',{x:P,y:2.36,w:2.80,h:0.30,fontSize:13,bold:true,color:GRAY,align:'center'});
  rct(s,P+0.48,2.82,1.84,0.92,{fill:NAVY});
  T(s,'2.43',{x:P+0.48,y:2.96,w:1.84,h:0.46,fontSize:22,bold:true,color:'34D399',align:'center'});
  T(s,'PR-DTC-3100',{x:P+0.48,y:3.42,w:1.84,h:0.26,fontSize:9.5,bold:true,color:GRAY2,align:'center'});
  T(s,'데이터 단자가\n아예 없습니다',{x:P,y:3.92,w:2.80,h:0.62,fontSize:14,bold:true,color:RED,align:'center',lsm:1.35});
  // 두 방법
  card(s,P+3.04,2.20,3.00,1.18,{fill:REDL,line:REDB});
  T(s,'방법 1 · 장비 교체',{x:P+3.04,y:2.32,w:3.00,h:0.30,fontSize:13,bold:true,color:RED,align:'center'});
  T(s,'수천만 원',{x:P+3.04,y:2.62,w:3.00,h:0.46,fontSize:23,bold:true,color:INK,align:'center'});
  T(s,'✕  포기',{x:P+3.04,y:3.06,w:3.00,h:0.26,fontSize:12,bold:true,color:RED,align:'center'});
  card(s,P+3.04,3.62,3.00,1.28,{fill:GRNL,line:GRN,lw:2});
  T(s,'방법 2 · 카메라 + AI',{x:P+3.04,y:3.74,w:3.00,h:0.30,fontSize:13,bold:true,color:GRN,align:'center'});
  s.addShape(pptx.ShapeType.roundRect,{x:P+3.70,y:4.10,w:0.60,h:0.68,rectRadius:0.08,
    fill:{color:NAVY},line:{type:'none'}});
  s.addShape(pptx.ShapeType.ellipse,{x:P+3.88,y:4.24,w:0.24,h:0.24,fill:{color:IND},line:{type:'none'}});
  T(s,'휴대폰 1대',{x:P+4.44,y:4.28,w:1.5,h:0.36,fontSize:15,bold:true,color:INK});
  arw(s,P+6.20,4.26,P+6.70,4.26,GRN,2);
  T(s,'AI가 화면의\n숫자를 읽음',{x:P+6.06,y:3.58,w:1.70,h:0.58,fontSize:10.5,bold:true,color:GRN,align:'center',lsm:1.3});
  // 결과
  card(s,P+6.80,2.20,W-6.80,2.70,{fill:INDL,line:INDB});
  T(s,'1분마다 6개 값이 자동 기록',{x:P+7.08,y:2.42,w:W-7.36,h:0.40,fontSize:18,bold:true,color:IND});
  const vals=['출력 %','전압','두께','시작경','장력 설정','장력율'];
  const vw=(W-7.36-0.24)/3;
  vals.forEach((v,i)=>{
    const x=P+7.08+(i%3)*(vw+0.12), y=2.94+Math.floor(i/3)*0.62;
    card(s,x,y,vw,0.50,{fill:WHITE,line:INDB,lw:1.2});
    T(s,v,{x,y,w:vw,h:0.50,fontSize:12,bold:true,color:INK,align:'center',valign:'middle'});
  });
  T(s,'→ 데이터베이스에 계속 쌓입니다',{x:P+7.08,y:4.28,w:W-7.36,h:0.34,fontSize:13,bold:true,color:GRAY});
  band(s,5.22,[{text:'오래된 기계라고 데이터를 못 얻는 게 아니었습니다.   ',options:{}},
               {text:'방법을 몰랐던 것입니다.',options:{color:GOLD}}],1.05);
  foot(s);
}

// ════════════════════════════════════════════════════
// 15
// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════
SEC.cur='4. 질문 ① 우리는 무엇을 모르는가';
{ const s=base();
  head(s,'WE VERIFY, NOT TRUST',
    [{text:'저희는 숫자를 ',options:{}},{text:'믿지 않고, 확인합니다',options:{color:RED}}],{acc:RED});
  const cw=(W-0.48)/3;
  const d=[['우리 설비','고장 난 센서','3/4','센서가 작업 내내 0',
            '코일 60개·2주치를 한 번에 훑어 5건 발견. 가공 문제가 아니라 배선이 끊어져 있었습니다. 사람 눈으로는 평생 못 찾을 문제입니다.',RED],
           ['납품받은 시스템','외부 검사 시스템','30%','표본 20건 중 문제',
            '기록된 흠집의 상당수가 시험용 가짜 데이터였고, 두께 측정은 표본 5건 모두 값이 0 — 아예 돌고 있지 않았습니다.',RED],
           ['우리가 만든 것','우리 시스템','9','시간씩 어긋남',
            '시각이 밀려 기록되던 오류를 찾아 전부 고쳤습니다. 남의 것만 의심하지 않았습니다.',INK]];
  d.forEach(([lab,ttl,v,vl,body,c],i)=>{
    const x=P+i*(cw+0.24);
    card(s,x,2.10,cw,3.22,{fill:WHITE,line:LINE});
    rct(s,x,2.10,cw,0.06,{fill:c===RED?REDB:LINE});
    T(s,lab,{x:x+0.26,y:2.30,w:cw-0.5,h:0.26,fontSize:11,bold:true,color:GRAY,charSpacing:0.6});
    T(s,ttl,{x:x+0.26,y:2.58,w:cw-0.5,h:0.34,fontSize:17,bold:true,color:INK});
    T(s,v,{x:x+0.26,y:2.96,w:cw-0.5,h:0.66,fontSize:36,bold:true,color:c});
    T(s,vl,{x:x+0.26,y:3.64,w:cw-0.5,h:0.26,fontSize:11.5,bold:true,color:GRAY});
    rct(s,x+0.26,3.96,cw-0.5,0.012,{fill:LINE});
    T(s,body,{x:x+0.26,y:4.08,w:cw-0.5,h:1.20,fontSize:12.5,lsm:1.45});
  });
  band(s,5.54,[{text:'187만 건이 있어도, ',options:{}},
               {text:'검증하지 않은 데이터는 자산이 아니라 위험입니다.',options:{color:GOLD}}],1.02);
  foot(s);
}

// ════════════════════════════════════════════════════
// 16
// ════════════════════════════════════════════════════
SEC.cur='4. 질문 ① 우리는 무엇을 모르는가';
{ const s=base();
  head(s,'GAIN 01',
    [{text:'얻은 것 1 — ',options:{}},{text:'완벽한 품질',options:{color:GRN}}],{acc:GRN});
  const cw=(W-0.72)/4;
  const d=[['공정이 표준화됐습니다','감으로 하던 작업이 숫자가 되니 누가 작업하든 같은 기준이 됩니다. 경력 40년이든 입사 한 달이든 같은 화면, 같은 값.'],
           ['설정 불량이 거의 사라졌습니다','설정값을 계산해주는 도구를 만든 뒤, 기계 설정을 잘못해서 나던 불량은 사실상 없어졌습니다.'],
           ['전수 검증 체계','표면은 전부 촬영, 운전 조건은 2초마다 기록, 이상은 자동으로 걸러집니다. 샘플로 보지 않습니다.'],
           ['데이터 자체를 검증','센서가 죽었는지, 측정이 돌고 있는지, 기록이 밀렸는지를 의심하고 확인합니다.']];
  d.forEach(([t,b],i)=>{
    const x=P+i*(cw+0.24);
    card(s,x,2.15,cw,2.95,{fill:GRNL,line:GRNB});
    T(s,String(i+1).padStart(2,'0'),{x:x+0.26,y:2.32,w:1,h:0.34,fontSize:14,bold:true,color:GRNB});
    T(s,t,{x:x+0.26,y:2.72,w:cw-0.52,h:0.72,fontSize:16,bold:true,color:GRN,lsm:1.2});
    T(s,b,{x:x+0.26,y:3.54,w:cw-0.52,h:1.40,fontSize:12.5,lsm:1.5});
  });
  card(s,P,5.42,W,1.02,{fill:INDL,line:INDB});
  T(s,[{text:'좋은 장비에 걸맞는 ',options:{color:INK}},{text:'품질 기술',options:{color:IND}},
       {text:'을, 이제 갖췄습니다.   ',options:{color:INK}},
       {text:'1차에서 장비를 샀고, 3차에 그 장비를 제대로 쓰는 기술을 얻었습니다.',options:{color:GRAY,fontSize:14}}],
    {x:P+0.3,y:5.42,w:W-0.6,h:1.02,fontSize:19,bold:true,align:'center',valign:'middle',lsm:1.4});
  foot(s);
}

// ════════════════════════════════════════════════════
// 17
// ════════════════════════════════════════════════════
SEC.cur='4. 질문 ① 우리는 무엇을 모르는가';
{ const s=base();
  head(s,'GAIN 02',
    [{text:'얻은 것 2 — ',options:{}},{text:'기술 내재화',options:{color:IND}},
     {text:'  (이게 더 중요할지도 모릅니다)',options:{fontSize:20,color:GRAY}}]);
  const lw=7.35;
  const nw=(lw-0.48)/3;
  [['41','직접 만든 서비스'],['0','외주 개발'],['며칠','현장 요구 반영 기간']].forEach(([v,l],i)=>{
    const x=P+i*(nw+0.24);
    card(s,x,2.15,nw,1.20,{fill:INDL,line:INDB});
    T(s,v,{x,y:2.28,w:nw,h:0.60,fontSize:30,bold:true,color:IND,align:'center'});
    T(s,l,{x,y:2.92,w:nw,h:0.28,fontSize:11.5,color:GRAY,align:'center'});
  });
  card(s,P,3.52,lw,2.70,{fill:GOLDL,line:GOLDB});
  chip(s,P+0.30,3.72,'예상하지 못한 일','o',1.6);
  T(s,'외국인 직원들이 장비를 고치기 시작했습니다',
    {x:P+0.30,y:4.16,w:lw-0.6,h:0.40,fontSize:19,bold:true,color:INK});
  T(s,[{text:'직원 12명 중 5명이 외국에서 오신 분들입니다. 그런데 설명서도 작업 기준도 ',options:{}},
       {text:'전부 한국어',options:{bold:true,color:INK}},
       {text:'였습니다 — 개선 제안이 나올 수 없는 구조였습니다.\n\n현장 도구를 ',options:{}},
       {text:'한국어·영어 두 벌',options:{bold:true,color:INK}},
       {text:'로 만들자, AI의 도움으로 언어의 벽을 넘어 기계 기록을 직접 읽기 시작했고, 원인을 알게 되니 고치는 방법이 보이기 시작했습니다.',options:{}}],
    {x:P+0.30,y:4.66,w:lw-0.6,h:1.40,fontSize:14,lsm:1.5});
  // 도면
  const rx=P+lw+0.34, rw=W-lw-0.34;
  card(s,rx,2.15,rw,4.07,{fill:WHITE,line:LINE});
  chip(s,rx+0.26,2.34,'지금 저희에게 있는 것','i',1.9);
  T(s,'장비 개조 도면',{x:rx+0.26,y:2.78,w:rw-0.52,h:0.38,fontSize:18,bold:true,color:INK});
  rct(s,rx+0.30,3.24,rw-0.60,1.55,{fill:TINT,line:GRAY2,lw:1.1});
  rct(s,rx+0.98,3.80,2.12,0.44,{fill:WHITE,line:INK,lw:2});
  s.addShape(pptx.ShapeType.ellipse,{x:rx+0.74,y:3.80,w:0.46,h:0.44,fill:{type:'none'},line:{color:INK,width:2}});
  s.addShape(pptx.ShapeType.ellipse,{x:rx+2.88,y:3.80,w:0.46,h:0.44,fill:{type:'none'},line:{color:INK,width:2}});
  rct(s,rx+0.98,4.44,2.12,0.012,{fill:IND});
  T(s,'1,320 mm',{x:rx+0.98,y:4.48,w:2.12,h:0.26,fontSize:10,bold:true,color:IND,align:'center'});
  T(s,'Ø40',{x:rx+0.36,y:3.34,w:0.7,h:0.24,fontSize:10,bold:true,color:IND});
  T(s,'축 Ø20',{x:rx+2.52,y:3.34,w:0.9,h:0.24,fontSize:9.5,bold:true,color:GRAY});
  T(s,'롤러 지름 40 · 길이 1,320 · 축 20 · 베어링 규격까지',
    {x:rx+0.30,y:4.88,w:rw-0.60,h:0.28,fontSize:11,color:GRAY});
  card(s,rx+0.30,5.24,rw-0.60,0.82,{fill:GRNL,line:GRNB});
  T(s,[{text:'이 도면을 그린 사람은 엔지니어가 아니라 ',options:{color:INK}},
       {text:'저희 현장 직원입니다.',options:{color:GRN}}],
    {x:rx+0.44,y:5.24,w:rw-0.88,h:0.82,fontSize:14,bold:true,valign:'middle',lsm:1.35});
  foot(s);
}

// ════════════════════════════════════════════════════
// 18
// ════════════════════════════════════════════════════
SEC.cur='4. 질문 ① 우리는 무엇을 모르는가';
{ const s=base();
  head(s,'BOTTOM-UP',
    [{text:'현장에서 ',options:{}},{text:'먼저 요구가 올라왔습니다',options:{color:GRN}}],{acc:GRN});
  const cw=(W-0.40)/2;
  // 1·2차
  card(s,P,2.20,cw,2.95,{fill:REDL,line:REDB});
  T(s,'1차 · 2차',{x:P,y:2.36,w:cw,h:0.38,fontSize:19,bold:true,color:RED,align:'center'});
  card(s,P+1.45,2.86,cw-2.9,0.62,{fill:WHITE,line:REDB});
  T(s,'경영진 / 외부 업체',{x:P+1.45,y:2.86,w:cw-2.9,h:0.62,fontSize:14,bold:true,color:INK,align:'center',valign:'middle'});
  arw(s,P+cw/2,3.54,P+cw/2,4.02,RED,2.2);
  card(s,P+1.45,4.08,cw-2.9,0.62,{fill:WHITE,line:REDB});
  T(s,'현장',{x:P+1.45,y:4.08,w:cw-2.9,h:0.62,fontSize:14,bold:true,color:INK,align:'center',valign:'middle'});
  T(s,'✕',{x:P+cw-1.25,y:4.14,w:0.5,h:0.45,fontSize:20,bold:true,color:RED});
  T(s,'위에서 내려준 것  →  안 썼습니다',{x:P,y:4.80,w:cw,h:0.30,fontSize:13,bold:true,color:RED,align:'center'});
  // 3차
  const x2=P+cw+0.40;
  card(s,x2,2.20,cw,2.95,{fill:GRNL,line:GRN,lw:2});
  T(s,'3차',{x:x2,y:2.36,w:cw,h:0.38,fontSize:19,bold:true,color:GRN,align:'center'});
  card(s,x2+1.45,2.86,cw-2.9,0.62,{fill:WHITE,line:GRNB});
  T(s,'경영진',{x:x2+1.45,y:2.86,w:cw-2.9,h:0.62,fontSize:14,bold:true,color:INK,align:'center',valign:'middle'});
  arw(s,x2+cw/2,4.02,x2+cw/2,3.54,GRN,2.2);
  card(s,x2+1.45,4.08,cw-2.9,0.62,{fill:WHITE,line:GRNB});
  T(s,'현장',{x:x2+1.45,y:4.08,w:cw-2.9,h:0.62,fontSize:14,bold:true,color:INK,align:'center',valign:'middle'});
  T(s,'현장이 달라고 한 것  →  씁니다',{x:x2,y:4.80,w:cw,h:0.30,fontSize:13,bold:true,color:GRN,align:'center'});
  card(s,P,5.42,W,1.02,{fill:TINT,line:LINE});
  T(s,[{text:'시키지도 않았는데 직원들끼리 품질 개선 회의를 열었습니다. 그리고 ',options:{color:INK2}},
       {text:'"설정값을 계산해주는 도구를 만들어달라"',options:{color:INK}},
       {text:'는 요구가 ',options:{color:INK2}},
       {text:'아래에서 올라왔습니다.',options:{color:GRN}}],
    {x:P+0.3,y:5.42,w:W-0.6,h:1.02,fontSize:16,bold:true,align:'center',valign:'middle',lsm:1.4});
  foot(s);
}

// ════════════════════════════════════════════════════
// 19
// ════════════════════════════════════════════════════
SEC.cur='4. 질문 ① 우리는 무엇을 모르는가';
{ const s=base();
  head(s,'41 SERVICES',
    [{text:'41개',options:{color:IND}},{text:'를 직접 만들었고, ',options:{}},
     {text:'30개',options:{color:GRN}},{text:'가 실데이터로 돌아갑니다',options:{}}]);
  const bw=6.30;
  card(s,P,2.15,bw,3.55,{fill:WHITE,line:LINE});
  rct(s,P,2.15,bw,0.055,{fill:IND});
  chip(s,P+0.28,2.34,'생산현장 도구','i',1.5);
  T(s,'21',{x:P+0.28,y:2.72,w:1.5,h:0.68,fontSize:38,bold:true,color:IND});
  T(s,'세퍼레이터 키오스크 · 작업현황 대시보드 1/2/3 · 코일 상세분석 · 레벨링 공정×ERP · 행정 모니터링 · 라인 통합관제(NMS) · PLC 상세조회 · 통합 타임라인 · HMI 미러 · AI 헬퍼 3종 · 슬리터2 모니터 KR/EN · 라인배정 변경 KR/EN · 작업확인 · 재고검색 · 테이퍼 텐션 3종',
    {x:P+0.28,y:3.46,w:bw-0.56,h:2.10,fontSize:12.5,color:GRAY,lsm:1.6});
  const c2=P+bw+0.24, cw2=(W-bw-0.24-0.24)/2, c3=c2+cw2+0.24;
  const right=[[c2,2.15,'주문접수 자동화','5','통합흐름 v2 · OCR 문서인식 · 카카오톡 접수 · FAX 작업요청서 · 현장 코일확정',2.10],
               [c2,4.49,'경영 · 재무','2','계좌 손익 통합 · 거래명세서 입금확인',1.50],
               [c3,2.15,'고객 대면','3','주문 현황 트래커 · 고객사 챗봇 · 영업대상 리스트',1.58],
               [c3,3.85,'창고 · 설비','2','코일창고 3D 뷰어 · 장애 원인 분석',1.42],
               [c3,5.39,'시스템 연동','1','대시보드 자동연동 모니터링',1.30]];
  right.forEach(([x,y,lab,n,body,h])=>{
    card(s,x,y,cw2,h,{fill:WHITE,line:LINE});
    T(s,lab,{x:x+0.24,y:y+0.14,w:cw2-0.48,h:0.26,fontSize:11,bold:true,color:GRAY,charSpacing:0.6});
    T(s,n,{x:x+0.24,y:y+0.42,w:1.2,h:0.50,fontSize:26,bold:true,color:INK});
    T(s,body,{x:x+0.24,y:y+0.94,w:cw2-0.48,h:h-1.00,fontSize:10,color:GRAY,lsm:1.45});
  });
  card(s,P,5.90,bw,0.58,{fill:TINT,line:LINE});
  let bx=P+0.22;
  bx += chip(s,bx,6.04,'현장 배포중 2','g')+0.12;
  bx += chip(s,bx,6.04,'실데이터 28','g')+0.12;
  bx += chip(s,bx,6.04,'시험판 8','o')+0.12;
  chip(s,bx,6.04,'개발용 3','n');
  foot(s);
}

// ════════════════════════════════════════════════════
// 20
// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════
SEC.cur='4. 질문 ① 우리는 무엇을 모르는가';
{ const s=base();
  head(s,'41 SERVICES, 6 WAYS',
    [{text:'한 가지 AI가 아닙니다 — ',options:{}},{text:'여섯 가지 방식',options:{color:IND}},
     {text:'으로 씁니다',options:{}}]);
  const cw=(W-0.48)/3, ch=1.48;
  const d=[['01','읽는 AI','계기판 사진의 숫자, 팩스 작업요청서, 지출 영수증을 읽습니다'],
           ['02','보는 AI','분당 250m로 지나가는 철판 표면을 전수 촬영해 흠집을 찾습니다'],
           ['03','찾아내는 AI','2주치를 한 번에 훑어 고장 난 센서와 이상 구간을 걸러냅니다'],
           ['04','추천하는 AI','같은 사양 실측값으로 권장 속도·힘·예상 가동시간을 제시합니다'],
           ['05','답하는 AI','고객이 말로 물으면 실제 기록을 근거로 답합니다'],
           ['06','만드는 AI','화면과 분석 도구 자체를 AI로 만들었습니다']];
  d.forEach(([n,t,b],i)=>{
    const x=P+(i%3)*(cw+0.24), y=2.15+Math.floor(i/3)*(ch+0.26);
    const hot = i===5;
    card(s,x,y,cw,ch,{fill:hot?INDL:WHITE,line:hot?INDB:LINE});
    T(s,n,{x:x+0.26,y:y+0.16,w:0.8,h:0.32,fontSize:15,bold:true,color:hot?IND:INDB});
    T(s,t,{x:x+0.26,y:y+0.46,w:cw-0.5,h:0.32,fontSize:16.5,bold:true,color:INK});
    T(s,b,{x:x+0.26,y:y+0.80,w:cw-0.5,h:0.60,fontSize:12,color:GRAY,lsm:1.4});
  });
  band(s,5.62,[{text:'06번이 앞의 다섯 개를 가능하게 했습니다.  ',options:{}},
               {text:'개발을 AI로 하니, 나머지를 직접 만들 수 있었습니다.',options:{color:GOLD}}],0.78);
  foot(s);
}

// ════════════════════════════════════════════════════
// 21
// ════════════════════════════════════════════════════
SEC.cur='4. 질문 ① 우리는 무엇을 모르는가';
{ const s=base();
  head(s,'REAL SCREENS',
    [{text:'현장에서 ',options:{}},{text:'매일 열리는 화면들',options:{color:IND}}]);
  const cw=(W-0.48)/3;
  // 1 세퍼레이터
  let x=P;
  card(s,x,2.15,cw,3.05,{fill:WHITE,line:LINE});
  rct(s,x,2.15,cw,0.46,{fill:NAVY});
  T(s,'세퍼레이터 셋팅 계산기 · 키오스크',{x:x+0.18,y:2.15,w:cw-0.36,h:0.46,
    fontSize:11,bold:true,color:WHITE,valign:'middle'});
  T(s,'가공규격   0.75 × 4 × C',{x:x+0.26,y:2.74,w:cw-0.52,h:0.28,fontSize:11.5,color:GRAY});
  const sw=(cw-0.52-0.16)/3;
  [['스페이서 A','4.2',1],['B','3.0',0],['C','1.5',0]].forEach(([l,v,hot],i)=>{
    const bx2=x+0.26+i*(sw+0.08);
    card(s,bx2,3.10,sw,0.72,{fill:hot?INDL:WHITE,line:hot?IND:LINE,lw:hot?1.8:1.2});
    T(s,l,{x:bx2,y:3.16,w:sw,h:0.24,fontSize:8.5,bold:true,color:hot?IND:GRAY,align:'center'});
    T(s,v,{x:bx2,y:3.36,w:sw,h:0.38,fontSize:18,bold:true,color:INK,align:'center'});
  });
  card(s,x+0.26,3.94,cw-0.52,0.58,{fill:GRNL,line:GRNB});
  T(s,'조합 확정 · 합계 8.7mm',{x:x+0.26,y:3.94,w:cw-0.52,h:0.58,fontSize:12,bold:true,
    color:GRN,align:'center',valign:'middle'});
  chip(s,x+0.26,4.68,'현장 배포중','g',1.1);
  T(s,'공장장 암산을 화면이 대신합니다',{x:x,y:5.32,w:cw,h:0.32,fontSize:12.5,bold:true,color:INK2,align:'center'});
  // 2 NMS
  x=P+cw+0.24;
  card(s,x,2.15,cw,3.05,{fill:WHITE,line:LINE});
  rct(s,x,2.15,cw,0.46,{fill:NAVY});
  T(s,'레벨링 라인 통합 관제 (NMS)',{x:x+0.18,y:2.15,w:cw-0.36,h:0.46,
    fontSize:11,bold:true,color:WHITE,valign:'middle'});
  const lw2=(cw-0.52-0.16)/3;
  [['레벨링 ● 가동','68%',1],['슬리터2 ● 가동','41%',1],['슬리터1 ○ 대기','—',0]].forEach(([l,v,on],i)=>{
    const bx2=x+0.26+i*(lw2+0.08);
    card(s,bx2,2.74,lw2,0.72,{fill:on?GRNL:WHITE,line:on?GRNB:LINE,lw:1.2});
    T(s,l,{x:bx2+0.04,y:2.80,w:lw2-0.08,h:0.22,fontSize:7.5,bold:true,color:on?GRN:GRAY});
    T(s,v,{x:bx2+0.04,y:3.00,w:lw2-0.08,h:0.34,fontSize:15,bold:true,color:INK});
  });
  const pts=[[0,.70],[.09,.50],[.18,.60],[.27,.24],[.36,.40],[.45,.16],[.54,.32],[.63,.12],[.72,.38],[.81,.22],[.90,.44],[1,.30]];
  for(let i=0;i<pts.length-1;i++){
    const x1=x+0.30+pts[i][0]*(cw-0.60), y1=3.60+pts[i][1]*0.46;
    const x2b=x+0.30+pts[i+1][0]*(cw-0.60), y2=3.60+pts[i+1][1]*0.46;
    s.addShape(pptx.ShapeType.line,{x:Math.min(x1,x2b),y:Math.min(y1,y2),
      w:Math.abs(x2b-x1)||0.008,h:Math.abs(y2-y1)||0.008,
      line:{color:IND,width:1.8},flipV:y2<y1});
  }
  card(s,x+0.26,4.24,cw-0.52,0.52,{fill:GOLDL,line:GOLDB});
  T(s,'이상 알림 1건 · 20초 자동 갱신',{x:x+0.26,y:4.24,w:cw-0.52,h:0.52,fontSize:10.5,bold:true,
    color:'B45309',align:'center',valign:'middle'});
  chip(s,x+0.26,4.92,'실데이터 연동','g',1.2);
  T(s,'통신사 관제센터 방식을 공장에',{x:x,y:5.32,w:cw,h:0.32,fontSize:12.5,bold:true,color:INK2,align:'center'});
  // 3 3D 창고
  x=P+2*(cw+0.24);
  card(s,x,2.15,cw,3.05,{fill:WHITE,line:LINE});
  rct(s,x,2.15,cw,0.46,{fill:NAVY});
  T(s,'코일창고 3D 뷰어 · 출고관리',{x:x+0.18,y:2.15,w:cw-0.36,h:0.46,
    fontSize:11,bold:true,color:WHITE,valign:'middle'});
  T(s,'A구역 · 거래처별 보관 코일',{x:x+0.26,y:2.72,w:cw-0.52,h:0.28,fontSize:10.5,color:GRAY,align:'center'});
  rct(s,x+0.34,3.66,cw-0.68,0.44,{fill:LINE2,line:'CBD5E1',lw:1.1});
  [[0.58,3.46,IND],[1.32,3.46,'6366F1'],[2.06,3.46,'818CF8'],[2.80,3.46,GRAY2],[1.32,3.04,GRN]]
    .forEach(([dx,yy,c])=>{
      s.addShape(pptx.ShapeType.ellipse,{x:x+dx,y:yy,w:0.70,h:0.40,fill:{color:c},line:{type:'none'}});
    });
  let px2=x+0.28;
  px2 += chip(s,px2,4.26,'대한강재 12','i')+0.10;
  px2 += chip(s,px2,4.26,'출고 가능 4','g')+0.10;
  chip(s,px2,4.26,'장기 3','n');
  chip(s,x+0.26,4.76,'현장 배포중','g',1.1);
  T(s,'어느 자리에 누구 물건인지 한눈에',{x:x,y:5.32,w:cw,h:0.32,fontSize:12.5,bold:true,color:INK2,align:'center'});
  band(s,5.86,[{text:'외부에 맡기지 않고 직접 만들었기 때문에, ',options:{}},
               {text:'현장이 불편하다고 하면 며칠 안에 고칩니다.',options:{color:GOLD}}],0.72);
  foot(s);
}

// ════════════════════════════════════════════════════
// 22
// ════════════════════════════════════════════════════
SEC.cur='4. 질문 ① 우리는 무엇을 모르는가';
{ const s=base();
  head(s,'WHAT WE STILL LACK',
    [{text:'보여주기는 하고 — ',options:{}},{text:'판정은 하지 않습니다',options:{color:RED}}],{acc:RED});
  const cw=(W-0.34)/2;
  card(s,P,2.15,cw,3.05,{fill:WHITE,line:LINE});
  chip(s,P+0.28,2.34,'지금','n',0.72);
  card(s,P+0.28,2.78,cw-0.56,1.00,{fill:TINT,line:null});
  T(s,'추천 도구가 알려주는 값',{x:P+0.46,y:2.88,w:cw-0.92,h:0.28,fontSize:11.5,color:GRAY});
  T(s,'권장 속도 82',{x:P+0.46,y:3.16,w:cw-0.92,h:0.50,fontSize:25,bold:true,color:INK});
  card(s,P+0.28,3.96,cw-0.56,1.08,{fill:REDL,line:REDB});
  T(s,[{text:'그 82는 ',options:{}},{text:'과거에 그렇게 돌렸던 평균',options:{bold:true,color:INK}},
       {text:'입니다. ',options:{}},{text:'그렇게 돌려야 하는 값이 아닙니다.',options:{bold:true,color:RED}},
       {text:'  과거에 불량이 났던 작업도 그 평균 안에 섞여 있습니다.',options:{}}],
    {x:P+0.46,y:3.96,w:cw-0.92,h:1.08,fontSize:13.5,valign:'middle',lsm:1.45});
  const x2=P+cw+0.34;
  card(s,x2,2.15,cw,3.05,{fill:GRNL,line:GRNB});
  chip(s,x2+0.28,2.34,'되어야 하는 것','g',1.5);
  card(s,x2+0.28,2.78,cw-0.56,1.20,{fill:WHITE,line:GRNB});
  T(s,'판정까지 해주는 화면',{x:x2+0.46,y:2.86,w:cw-0.92,h:0.26,fontSize:11.5,color:GRAY});
  T(s,[{text:'속도 82 ',options:{color:INK}},{text:'— 표준 78~85 이내 ✓',options:{color:GRN}}],
    {x:x2+0.46,y:3.14,w:cw-0.92,h:0.34,fontSize:15.5,bold:true});
  T(s,[{text:'힘 1.8 ',options:{color:INK}},{text:'— 표준 2.2~2.6 이탈 ⚠',options:{color:RED}}],
    {x:x2+0.46,y:3.50,w:cw-0.92,h:0.34,fontSize:15.5,bold:true});
  card(s,x2+0.28,4.16,cw-0.56,0.88,{fill:WHITE,line:null});
  T(s,[{text:'이탈하면 ',options:{}},{text:'한 줄 이유',options:{bold:true,color:INK}},
       {text:'를 남깁니다 — 원자재 / 설비 이상 / 고객 요청 / 급한 납기 / 기타.\n',options:{}},
       {text:'1년 뒤 "표준을 못 지키는 진짜 이유"의 순위가 나옵니다. 지금은 아무도 모릅니다.',options:{bold:true,color:INK}}],
    {x:x2+0.46,y:4.16,w:cw-0.92,h:0.88,fontSize:12.5,valign:'middle',lsm:1.45});
  band(s,5.42,[{text:'질문 ①은 70%입니다. ',options:{}},
               {text:'판정하는 표준을 세우는 일이 남았습니다.',options:{color:GOLD}}],1.02);
  foot(s);
}

// ════════════════════════════════════════════════════
// 23
// ════════════════════════════════════════════════════
SEC.cur='4. 질문 ① 우리는 무엇을 모르는가';
{ const s=base();
  head(s,'OPERATING SYSTEM',
    [{text:'누가 작업해도 ',options:{}},{text:'같은 결과',options:{color:IND}},
     {text:'가 나오게, ',options:{}},{text:'증명할 기록',options:{color:IND}},{text:'이 남게',options:{}}]);
  const cw=(W-4*0.20)/5;
  const d=[['1','표준값 확정','불량·재작업·중단이 없었던 작업만 남겨 표준값을 뽑고 문서로 박습니다. 추천을 "과거 평균"에서 "표준값+허용범위"로.','선행: 품질이력↔작업데이터 연결','o'],
           ['2','화면이 판정','범위 안/밖을 표시하고 경고합니다. 이탈하면 이유 한 줄을 남깁니다.',null,null],
           ['3','작업 표준서를 화면으로','사양을 고르면 세팅 순서가 단계별로 뜨고, 확인하면 다음 단계로 넘어갑니다.','공장장 정년 전에 — 시한 있음','r'],
           ['4','데이터 결측 제거','센서 배선, 외부 시스템 가동, 카메라 고정, 코일번호 태깅 100%. 매일 아침 결측률을 봅니다.','가장 지루하고 가장 중요','o'],
           ['5','매일 마감','저녁마다 한 장이 자동으로: 작업 건수 · 이탈 건수(이유별) · 결측 · 정지 횟수.',null,null]];
  d.forEach(([n,t,b,note,nc],i)=>{
    const x=P+i*(cw+0.20);
    card(s,x,2.15,cw,3.82,{fill:INDL,line:INDB});
    rct(s,x,2.15,cw,0.055,{fill:IND});
    T(s,n,{x:x+0.22,y:2.34,w:0.8,h:0.46,fontSize:26,bold:true,color:IND});
    T(s,t,{x:x+0.22,y:2.88,w:cw-0.44,h:0.70,fontSize:14.5,bold:true,color:INK,lsm:1.2});
    T(s,b,{x:x+0.22,y:3.66,w:cw-0.44,h:1.62,fontSize:10.5,lsm:1.5});
    if(note) chip(s,x+0.22,5.44,note,nc,cw-0.44);
  });
  band(s,6.10,[{text:'사람이 챙기는 체계는 사람이 빠지면 멈추지만, ',options:{}},
               {text:'매일 한 장이 나오는 체계는 멈추면 표가 납니다.',options:{color:GOLD}}],0.72);
  foot(s);
}

// ════════════════════════════════════════════════════
// 24
// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════
SEC.cur='';
{ const s=base(true);
  rct(s,0,0,0.14,SH,{fill:IND});
  rct(s,P,1.20,1.30,0.045,{fill:GOLD});
  T(s,'질문 02',{x:P,y:1.48,w:9,h:0.4,fontSize:15,bold:true,color:GOLD,charSpacing:1.6});
  T(s,'우리 고객들은 무엇을 원하는가',
    {x:P,y:1.96,w:11.4,h:0.72,fontSize:31,bold:true,color:'A5B4FC'});
  T(s,'저희는 고객이 더 정밀한 분석을 원할 거라 생각했습니다. 두 번째 실패가 그 생각에서 나왔습니다.',
    {x:P,y:2.74,w:11.4,h:0.38,fontSize:14.5,bold:true,color:GRAY2});
  rct(s,P,3.42,0.09,1.70,{fill:GOLD});
  T(s,[{text:'"그냥 아무 때나 물어보고,\n',options:{color:WHITE}},
       {text:'바로 확인받고 싶습니다."',options:{color:GOLD}}],
    {x:P+0.42,y:3.42,w:11.0,h:1.70,fontSize:39,bold:true,lsm:1.30});
  T(s,'정밀한 분석 리포트를 원하는 게 아닙니다.  밤 열 시에 궁금한 것이 생겼을 때, 그때 답을 받고 싶은 것입니다.',
    {x:P+0.42,y:5.40,w:11.0,h:0.4,fontSize:16,bold:true,color:'CBD5E1'});
  card(s,P,6.02,W,0.86,{fill:NAVY2,line:'334155'});
  T(s,[{text:'택배는 어느 터미널에 있는지까지 봅니다. 은행도 24시간입니다.   ',options:{color:'CBD5E1'}},
       {text:'그런데 수천만 원짜리 철강 발주가 가장 확인하기 어려운 거래였습니다.',options:{color:GOLD}}],
    {x:P+0.3,y:6.02,w:W-0.6,h:0.86,fontSize:14,bold:true,align:'center',valign:'middle'});
}

// ════════════════════════════════════════════════════
// 25
// ════════════════════════════════════════════════════
SEC.cur='5. 질문 ② 고객은 무엇을 원하는가';
{ const s=base();
  head(s,'THE CUSTOMER REALITY',
    [{text:'궁금한 시간은 ',options:{}},{text:'아무 때나',options:{color:IND}},
     {text:', 물어볼 시간은 ',options:{}},{text:'우리 업무시간뿐',options:{color:RED}}]);
  const tlY=3.40, tlX=P+0.40, tlW=8.60;
  rct(s,tlX,tlY,tlW,0.055,{fill:LINE});
  rct(s,tlX+2.90,tlY-0.05,2.35,0.16,{fill:IND});
  T(s,'우리 업무시간  09:00 – 18:00',{x:tlX+2.35,y:tlY-0.52,w:3.45,h:0.30,
    fontSize:12,bold:true,color:IND,align:'center'});
  rct(s,tlX+1.00,tlY,1.88,0.055,{fill:REDB});
  T(s,'11시간 대기',{x:tlX+1.10,y:tlY-0.52,w:1.70,h:0.30,fontSize:13.5,bold:true,color:RED,align:'center'});
  const dots=[[1.00,RED,0.24,'밤 22:00','궁금증 발생','"내 물건 언제 오지?"'],
              [3.05,IND,0.24,'아침 09:00','전화',''],
              [4.55,GOLD,0.18,'담당자 부재','다시 걸어야 함',''],
              [6.05,GRN,0.24,'답 들음','그런데','어디에도 남지 않습니다'],
              [7.75,GRAY2,0.18,'다음에 또','물어야 합니다','']];
  dots.forEach(([dx,c,sz,l1,l2,l3])=>{
    s.addShape(pptx.ShapeType.ellipse,{x:tlX+dx-sz/2,y:tlY+0.028-sz/2,w:sz,h:sz,
      fill:{color:c},line:{type:'none'}});
    T(s,l1,{x:tlX+dx-0.85,y:tlY+0.26,w:1.70,h:0.28,fontSize:12,bold:true,color:c===GOLD?'B45309':c,align:'center'});
    if(l2) T(s,l2,{x:tlX+dx-0.85,y:tlY+0.54,w:1.70,h:0.28,fontSize:11,bold:true,color:INK,align:'center'});
    if(l3) T(s,l3,{x:tlX+dx-1.0,y:tlY+0.82,w:2.0,h:0.28,fontSize:9.5,color:c===GRN?RED:GRAY,align:'center'});
  });
  card(s,P+9.52,2.30,W-9.52,2.55,{fill:REDL,line:REDB});
  T(s,'그래서 결국',{x:P+9.52,y:2.46,w:W-9.52,h:0.30,fontSize:13,bold:true,color:RED,align:'center'});
  T(s,'미안해서\n안 묻고 넘어감',{x:P+9.52,y:2.86,w:W-9.52,h:0.62,fontSize:15,bold:true,color:INK,align:'center',lsm:1.3});
  rct(s,P+9.80,3.60,W-10.08,0.012,{fill:REDB});
  T(s,'→ 여유 재고를 쥐고\n라인을 비워둠',{x:P+9.52,y:3.76,w:W-9.52,h:0.62,
    fontSize:13.5,bold:true,color:RED,align:'center',lsm:1.35});
  // 비교
  const cw=(W-0.72)/4;
  [['온라인 쇼핑','밤에 주문, 새벽에 조회','24시간',0],['은행','잔고·이체·명세','24시간',0],
   ['택배','지금 어느 터미널에','24시간',0],['철강 발주','아침 9시를 기다림','업무시간만',1]]
   .forEach(([t,b,p,hot],i)=>{
    const x=P+i*(cw+0.24);
    card(s,x,4.92,cw,1.12,{fill:hot?REDL:GRNL,line:hot?REDB:GRNB});
    T(s,t,{x:x+0.20,y:5.02,w:cw-0.40,h:0.30,fontSize:14,bold:true,color:hot?RED:GRN});
    T(s,b,{x:x+0.20,y:5.32,w:cw-0.40,h:0.28,fontSize:11,color:GRAY});
    chip(s,x+0.20,5.62,p,hot?'r':'g',1.1);
  });
  T(s,'고객이 원하는 건 더 좋은 기술이 아니었습니다. 다른 데서 다 되는 것이, 여기서만 안 되는 그 불편이었습니다.',
    {x:P,y:6.28,w:W,h:0.34,fontSize:14,bold:true,color:GRAY,align:'center'});
  foot(s);
}

// ════════════════════════════════════════════════════
// 26
// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════
SEC.cur='5. 질문 ② 고객은 무엇을 원하는가';
{ const s=base();
  head(s,'QUESTION 02',
    [{text:'다섯 가지였습니다 — ',options:{}},{text:'전부 "24시간"',options:{color:IND}}]);
  const rowH=0.60, y0=2.10;
  const d=[['01','24시간 문의','언제든 묻고 바로 답받기','업무시간에 전화, 담당자 없으면 다시',0],
           ['02','24시간 발주','밤에도 주문 넣기','팩스·전화, 업무시간만',0],
           ['03','24시간 진행 조회','내 물건이 지금 어디까지','전화해서 물어봐야 함',0],
           ['04','24시간 상세 내역','거래·미출고·미수금·맡긴 재고','요청하면 정리해서 보내줌',0],
           ['05','24시간 품질 결과','내가 발주한 그 물건의 AI 검사 결과','어디에도 없음',1]];
  // 헤더
  T(s,'고객이 하고 싶은 것',{x:P+0.90,y:y0-0.34,w:5,h:0.28,fontSize:11,bold:true,color:GRAY2,charSpacing:0.8});
  T(s,'지금',{x:P+7.90,y:y0-0.34,w:3,h:0.28,fontSize:11,bold:true,color:GRAY2,charSpacing:0.8});
  d.forEach(([n,t,sub,now,hot],i)=>{
    const y=y0+i*(rowH+0.10);
    if(hot) card(s,P,y,W,rowH,{fill:INDL,line:INDB});
    else rct(s,P,y+rowH,W,0.012,{fill:LINE});
    T(s,n,{x:P+0.14,y,w:0.7,h:rowH,fontSize:15,bold:true,color:hot?IND:INDB,valign:'middle'});
    T(s,t,{x:P+0.90,y,w:3.3,h:rowH,fontSize:hot?19:17.5,bold:true,color:hot?IND:INK,valign:'middle'});
    T(s,sub,{x:P+4.30,y,w:3.5,h:rowH,fontSize:13,color:INK2,valign:'middle'});
    T(s,now,{x:P+7.90,y,w:W-8.05,h:rowH,fontSize:hot?15:13,bold:hot?true:false,
      color:hot?RED:GRAY,valign:'middle'});
  });
  const cw=(W-0.34)/2;
  card(s,P,5.60,cw,0.98,{fill:WHITE,line:LINE});
  T(s,[{text:'①~④는 온라인 쇼핑에서 이미 당연한 것들입니다.  ',options:{color:INK}},
       {text:'언젠가 다른 코일센터도 하게 됩니다.',options:{color:GRAY}}],
    {x:P+0.24,y:5.60,w:cw-0.48,h:0.98,fontSize:13.5,bold:true,valign:'middle',lsm:1.4});
  card(s,P+cw+0.34,5.60,cw,0.98,{fill:INDL,line:INDB});
  T(s,[{text:'⑤는 다릅니다.  ',options:{color:IND,fontSize:17}},
       {text:'전수 촬영 자료 · 2초 단위 기록 · 검증된 데이터가 있어야 합니다. 질문 ①의 답이 없으면 불가능합니다.',
        options:{color:INK,fontSize:13}}],
    {x:P+cw+0.58,y:5.60,w:cw-0.48,h:0.98,bold:true,valign:'middle',lsm:1.4});
  foot(s);
}

// ════════════════════════════════════════════════════
// 27
// ════════════════════════════════════════════════════
SEC.cur='5. 질문 ② 고객은 무엇을 원하는가';
{ const s=base();
  head(s,'WHY ⑤ MATTERS',
    [{text:'①~④는 ',options:{}},{text:'시스템만 만들면',options:{color:GRAY}},
     {text:' 됩니다. ',options:{}},{text:'⑤는 다릅니다.',options:{color:IND}}]);
  const cw=(W-0.48)/3;
  let x=P;
  card(s,x,2.20,cw,3.00,{fill:TINT,line:LINE});
  T(s,'①~④\n문의 · 발주 · 조회 · 내역',{x:x+0.24,y:2.40,w:cw-0.48,h:0.72,
    fontSize:16,bold:true,color:GRAY,align:'center',lsm:1.25});
  rct(s,x+1.0,3.24,cw-2.0,0.012,{fill:LINE});
  T(s,'필요한 것',{x:x+0.24,y:3.42,w:cw-0.48,h:0.28,fontSize:12,color:GRAY,align:'center'});
  T(s,'돈과 시간',{x:x+0.24,y:3.70,w:cw-0.48,h:0.42,fontSize:20,bold:true,color:INK,align:'center'});
  chip(s,x+(cw-1.5)/2,4.28,'= 편의','n',1.5);
  T(s,'경쟁사도 언젠가 합니다',{x:x+0.24,y:4.76,w:cw-0.48,h:0.28,fontSize:11.5,color:GRAY2,align:'center'});
  x=P+cw+0.24;
  card(s,x,2.20,cw,3.00,{fill:INDL,line:IND,lw:2});
  T(s,'⑤\n24시간 품질 결과',{x:x+0.24,y:2.40,w:cw-0.48,h:0.72,
    fontSize:17,bold:true,color:IND,align:'center',lsm:1.25});
  rct(s,x+1.0,3.24,cw-2.0,0.012,{fill:INDB});
  T(s,'필요한 것',{x:x+0.24,y:3.42,w:cw-0.48,h:0.28,fontSize:12,color:GRAY,align:'center'});
  T(s,'전수 촬영 자료\n2초 단위 운전 기록\n검증된 데이터',
    {x:x+0.24,y:3.70,w:cw-0.48,h:0.90,fontSize:14,bold:true,color:INK,align:'center',lsm:1.45});
  chip(s,x+(cw-1.7)/2,4.72,'= 차별화','i',1.7);
  x=P+2*(cw+0.24);
  card(s,x,2.20,cw,3.00,{fill:GRNL,line:GRN,lw:2});
  T(s,'그건 질문 ①의 답입니다',{x:x+0.24,y:2.46,w:cw-0.48,h:0.40,fontSize:16,bold:true,color:GRN,align:'center'});
  T(s,'첫 번째 질문에 답하지 않았다면',{x:x+0.24,y:3.04,w:cw-0.48,h:0.34,fontSize:13.5,bold:true,color:INK2,align:'center'});
  T(s,'다섯 번째는\n못 합니다',{x:x+0.24,y:3.50,w:cw-0.48,h:0.80,fontSize:22,bold:true,color:GRN,align:'center',lsm:1.3});
  T(s,'두 질문이 여기서 연결됩니다',{x:x+0.24,y:4.60,w:cw-0.48,h:0.30,fontSize:11.5,bold:true,color:GRAY2,align:'center'});
  card(s,P,5.44,W,1.08,{fill:WHITE,line:INDB});
  T(s,[{text:'진행 상황만 보여주는 포털은 ',options:{color:INK}},{text:'편리한 서비스',options:{color:GRAY}},
       {text:'입니다.   품질 결과까지 보여주는 포털은 ',options:{color:INK}},
       {text:'검사를 대신해주는 서비스',options:{color:IND}},{text:'입니다.',options:{color:INK}}],
    {x:P+0.3,y:5.44,w:W-0.6,h:1.08,fontSize:18,bold:true,align:'center',valign:'middle',lsm:1.4});
  foot(s);
}

// ════════════════════════════════════════════════════
// 28
// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════
SEC.cur='5. 질문 ② 고객은 무엇을 원하는가';
{ const s=base();
  head(s,'IF, AT 11 PM',
    [{text:'고객이 ',options:{}},{text:'밤 열한 시',options:{color:IND}},
     {text:'에 휴대폰을 열어서',options:{}}]);
  const py=2.05, pw=2.32, ph=4.10;
  // 포털
  let px=P+0.20;
  card(s,px,py,pw,ph,{fill:NAVY,line:null});
  rct(s,px+0.11,py+0.40,pw-0.22,ph-0.52,{fill:WHITE});
  T(s,'오성철강 고객 포털',{x:px+0.15,y:py+0.08,w:1.6,h:0.26,fontSize:8.5,bold:true,color:WHITE});
  T(s,'23:04',{x:px+pw-0.82,y:py+0.08,w:0.66,h:0.26,fontSize:8.5,bold:true,color:WHITE,align:'right'});
  T(s,'(주)대한강재님',{x:px+0.24,y:py+0.50,w:1.9,h:0.26,fontSize:11,bold:true,color:INK});
  card(s,px+0.24,py+0.82,pw-0.48,0.88,{fill:INDL,line:INDB,lw:1.2});
  T(s,'진행중 · 코일 1622057',{x:px+0.34,y:py+0.88,w:1.8,h:0.22,fontSize:8,bold:true,color:IND});
  T(s,'62%',{x:px+0.34,y:py+1.08,w:0.8,h:0.32,fontSize:17,bold:true,color:INK});
  T(s,'완료 01:40',{x:px+1.05,y:py+1.16,w:1.05,h:0.24,fontSize:8.5,bold:true,color:INK,align:'right'});
  rct(s,px+0.34,py+1.50,pw-0.68,0.09,{fill:LINE});
  rct(s,px+0.34,py+1.50,(pw-0.68)*0.62,0.09,{fill:IND});
  card(s,px+0.24,py+1.82,pw-0.48,1.12,{fill:GRNL,line:GRNB,lw:1.2});
  T(s,'오늘 받은 물건 품질 결과',{x:px+0.34,y:py+1.88,w:1.9,h:0.22,fontSize:8,bold:true,color:GRN});
  T(s,'적합 · 표준 범위 내',{x:px+0.34,y:py+2.08,w:1.9,h:0.28,fontSize:12,bold:true,color:GRN});
  T(s,'표면 결함 0 · 두께 ±0.01 · 중단 없음',{x:px+0.34,y:py+2.36,w:1.9,h:0.34,fontSize:8,color:INK2,lsm:1.3});
  T(s,'영상 보기 ›',{x:px+0.34,y:py+2.68,w:1.9,h:0.20,fontSize:8,bold:true,color:GRN});
  const hw=(pw-0.48-0.09)/2;
  [['미출고','3건'],['맡긴 재고','12코일']].forEach(([l,v],i)=>{
    const bx=px+0.24+i*(hw+0.09);
    card(s,bx,py+3.02,hw,0.52,{fill:WHITE,line:LINE,lw:1.1});
    T(s,l,{x:bx,y:py+3.06,w:hw,h:0.20,fontSize:7.5,color:GRAY,align:'center'});
    T(s,v,{x:bx,y:py+3.22,w:hw,h:0.28,fontSize:12,bold:true,color:INK,align:'center'});
  });
  card(s,px+0.24,py+3.62,pw-0.48,0.42,{fill:IND,line:null});
  T(s,'+ 새 주문 넣기',{x:px+0.24,y:py+3.62,w:pw-0.48,h:0.42,fontSize:9.5,bold:true,
    color:WHITE,align:'center',valign:'middle'});
  // 챗봇
  px = P+0.20+pw+0.24;
  card(s,px,py,pw,ph,{fill:NAVY,line:null});
  rct(s,px+0.11,py+0.40,pw-0.22,ph-0.52,{fill:WHITE});
  T(s,'문의',{x:px+0.15,y:py+0.08,w:1.2,h:0.26,fontSize:8.5,bold:true,color:WHITE});
  T(s,'23:06',{x:px+pw-0.82,y:py+0.08,w:0.66,h:0.26,fontSize:8.5,bold:true,color:WHITE,align:'right'});
  card(s,px+0.24,py+0.50,pw-0.58,0.50,{fill:LINE2,line:null});
  T(s,'어제 보낸 코일 중에\n중단된 게 있었나요?',{x:px+0.34,y:py+0.54,w:pw-0.76,h:0.44,
    fontSize:8,bold:true,color:INK,lsm:1.3});
  card(s,px+0.34,py+1.10,pw-0.58,1.62,{fill:INDL,line:null});
  T(s,[{text:'어제(9/12) 출고 6건 중 1건',options:{bold:true}},
       {text:'에서 작업 중단 기록이 있습니다.\n\n코일 1622051 · 1,240m 지점에서 ',options:{}},
       {text:'4분 정지',options:{bold:true}},
       {text:' 후 재가동. 해당 구간 표면 검사는 ',options:{}},
       {text:'이상 없음',options:{bold:true}},{text:'입니다.',options:{}}],
    {x:px+0.44,y:py+1.14,w:pw-0.78,h:1.22,fontSize:7,color:INK,lsm:1.30});
  T(s,'근거 기록 보기 ›',{x:px+0.44,y:py+2.48,w:pw-0.78,h:0.18,fontSize:7,bold:true,color:IND});
  card(s,px+0.24,py+2.84,pw-0.58,0.38,{fill:LINE2,line:null});
  T(s,'미수금도 알려주세요',{x:px+0.34,y:py+2.84,w:pw-0.76,h:0.38,fontSize:8,bold:true,
    color:INK,valign:'middle'});
  card(s,px+0.24,py+3.28,pw-0.48,0.68,{fill:GOLDL,line:GOLDB,lw:1.2});
  T(s,[{text:'사람이 응대하지 않습니다\n',options:{fontSize:8,color:'B45309'}},
       {text:'기록이 응대합니다',options:{fontSize:11.5,color:INK}}],
    {x:px+0.36,y:py+3.28,w:pw-0.72,h:0.68,bold:true,valign:'middle',lsm:1.35});
  // 우측
  const rx=P+0.20+2*pw+0.48+0.24, rw=P+W-rx;
  const bl=[['새 주문을 넣고',0],['어제 넣은 주문이 지금 어느 라인에서 가공 중인지 보고',0],
            ['몇 시에 끝나는지 확인하고',0],['지난달 거래 내역과 안 나간 물량을 확인하고',0],
            ['오늘 받은 물건의 품질 검사 결과를 열어보고',1],
            ['궁금하면 채팅으로 물어서 실제 기록에 근거한 답을 받는다면',0]];
  bl.forEach(([t,hot],i)=>{
    const y=py+0.05+i*0.46;
    s.addShape(pptx.ShapeType.ellipse,{x:rx+0.04,y:y+0.14,w:0.11,h:0.11,
      fill:{color:hot?GRN:INDB},line:{type:'none'}});
    T(s,t,{x:rx+0.30,y,w:rw-0.35,h:0.42,fontSize:14.5,bold:hot?true:false,
      color:hot?GRN:INK2});
  });
  card(s,rx,py+2.90,rw,1.10,{fill:INDL,line:INDB});
  T(s,[{text:'그 회사는 코일 가공업체가 아닙니다.\n',options:{color:INK}},
       {text:'24시간 돌아가는 서비스 회사입니다.',options:{color:IND}}],
    {x:rx+0.26,y:py+2.90,w:rw-0.52,h:1.10,fontSize:19,bold:true,valign:'middle',lsm:1.35});
  T(s,'단가가 조금 싼 곳으로 옮기지 않습니다. 옮기면 이 전부를 잃기 때문입니다.',
    {x:rx,y:py+4.10,w:rw,h:0.32,fontSize:13,bold:true,color:GRN});
  foot(s);
}

// ════════════════════════════════════════════════════
// 29
// ════════════════════════════════════════════════════
SEC.cur='5. 질문 ② 고객은 무엇을 원하는가';
{ const s=base();
  head(s,'HONESTLY',
    [{text:'기능은 ',options:{}},{text:'대부분 있습니다',options:{color:GRN}},
     {text:'. 그런데 ',options:{}},{text:'고객에게 나간 것은 하나도 없습니다.',options:{color:RED}}],{size:26});
  const y0=2.20, rh=0.72;
  T(s,'이미 만든 것',{x:P+2.30,y:y0-0.32,w:5,h:0.26,fontSize:11,bold:true,color:GRAY2,charSpacing:0.8});
  T(s,'남은 것',{x:P+8.30,y:y0-0.32,w:3,h:0.26,fontSize:11,bold:true,color:GRAY2,charSpacing:0.8});
  const d=[['① 문의','실데이터로 답하는 채팅 창구','시연용 → 실서비스 전환','r',0],
           ['② 발주','팩스·카톡·문서인식 자동 접수 (시험판 4개)','실배포 — 현재 0건','r',0],
           ['③ 진행 조회','고객 포털 · 진행 트래커 · 완료 예측','예정시각 정확도 검증 후 개방','o',0],
           ['④ 상세 내역','재고·미출고·미수금 조회 · 3D 창고 뷰어','고객 계정에 연결','o',0],
           ['⑤ 품질 결과','전수 촬영 자료 · 운전 기록 · 분석 도구','양식 + 자동 발행 + 판정 기준','i',1]];
  d.forEach(([k,made,left,kind,hot],i)=>{
    const y=y0+i*(rh+0.08);
    if(hot) card(s,P,y,W,rh,{fill:INDL,line:INDB});
    else rct(s,P,y+rh,W,0.012,{fill:LINE});
    T(s,k,{x:P+0.20,y,w:2.0,h:rh,fontSize:hot?17:16,bold:true,color:hot?IND:INK,valign:'middle'});
    T(s,made,{x:P+2.30,y,w:5.8,h:rh,fontSize:13.5,color:INK2,valign:'middle'});
    chip(s,P+8.30,y+(rh-0.29)/2,left,kind,3.30);
  });
  card(s,P,6.02,W,0.86,{fill:REDL,line:REDB});
  T(s,[{text:'두 번의 실패가 "아무도 볼 수 없는 곳에 좋은 것을 두었다"는 것이었습니다.   ',options:{color:INK}},
       {text:'지금 상태는 그 실수의 축소판입니다.',options:{color:RED}}],
    {x:P+0.3,y:5.98,w:W-0.6,h:0.80,fontSize:16,bold:true,align:'center',valign:'middle'});
  foot(s);
}

// ════════════════════════════════════════════════════
// 30
// ════════════════════════════════════════════════════
SEC.cur='5. 질문 ② 고객은 무엇을 원하는가';
{ const s=base();
  head(s,'HOW WE CHARGE',
    [{text:'전부 무료면 값을 못 받고, ',options:{}},{text:'전부 유료면 아무도 안 씁니다',options:{color:IND}}]);
  const y0=2.20, rh=0.70;
  T(s,'서비스',{x:P+0.20,y:y0-0.32,w:4,h:0.26,fontSize:11,bold:true,color:GRAY2,charSpacing:0.8});
  T(s,'제공 방식',{x:P+5.60,y:y0-0.32,w:4,h:0.26,fontSize:11,bold:true,color:GRAY2,charSpacing:0.8});
  T(s,'목적',{x:P+9.00,y:y0-0.32,w:3,h:0.26,fontSize:11,bold:true,color:GRAY2,charSpacing:0.8});
  const d=[['24시간 문의 · 발주 · 진행 조회','무료, 단 계약서에 명시','거래 조건화 · 이탈 방지','n',0],
           ['품질 결과 요약  (판정만)','전 거래처 무료','표준으로 자리 잡게','n',0],
           ['품질 성적서 상세본  (영상·실측)','단가 반영 또는 별도','값을 받는 지점','g',1],
           ['분쟁 판별 리포트','건당 유상 또는 연간 약정','값을 받는 지점','g',1],
           ['보관 · 재고 대행','요율 계약','고정 수입 · 이탈 방지','g',1]];
  d.forEach(([k,how,why,kind,hot],i)=>{
    const y=y0+i*(rh+0.08);
    if(hot) card(s,P,y,W,rh,{fill:GRNL,line:GRNB});
    else rct(s,P,y+rh,W,0.012,{fill:LINE});
    T(s,k,{x:P+0.20,y,w:5.3,h:rh,fontSize:17,bold:true,color:INK,valign:'middle'});
    T(s,how,{x:P+5.60,y,w:3.3,h:rh,fontSize:13.5,color:INK2,valign:'middle'});
    chip(s,P+9.00,y+(rh-0.29)/2,why,kind,2.60);
  });
  band(s,6.14,[{text:'모든 신규 견적서에 "24시간 조회 · 품질 결과 제공"을 한 줄 적습니다.   ',options:{}},
               {text:'적히지 않은 서비스는 존재하지 않는 서비스입니다.',options:{color:GOLD}}],0.70);
  foot(s);
}

// ════════════════════════════════════════════════════
// 31
// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════
SEC.cur='6. 두 질문이 만난 곳';
{ const s=base();
  head(s,'THEY WERE ONE',
    [{text:'안을 보려고 만든 것이, ',options:{}},{text:'그대로 밖에 내보낼 것',options:{color:GRN}},
     {text:'이 되었습니다',options:{}}],{acc:GRN});
  // 매핑
  const y0=2.10, rowH=0.58;
  T(s,'질문 ① 의 답',{x:P,y:y0-0.34,w:5,h:0.28,fontSize:11,bold:true,color:GRAY2,charSpacing:0.8});
  T(s,'질문 ② 의 답',{x:P+6.60,y:y0-0.34,w:5,h:0.28,fontSize:11,bold:true,color:GRAY2,charSpacing:0.8});
  const m=[['지금 잘 돌아가나','실시간 상태','③ 24시간 진행 조회',0],
           ['그때 어떻게 돌렸나','구간별 기록','⑤ 24시간 품질 결과',1],
           ['우리 잘못인가','원소재/가공 판별','분쟁 판별 리포트 (유상)',0],
           ['데이터를 믿을 수 있나','전수 검증','위 전부의 신뢰 근거',0]];
  m.forEach(([a,sub,b,hot],i)=>{
    const y=y0+i*(rowH+0.08);
    if(hot) card(s,P,y,W,rowH,{fill:INDL,line:INDB});
    T(s,[{text:a,options:{bold:true,color:INK,fontSize:15}},
         {text:'   '+sub,options:{color:GRAY,fontSize:11.5}}],
      {x:P+0.26,y,w:5.6,h:rowH,valign:'middle'});
    arw(s,P+6.05,y+rowH/2,P+6.48,y+rowH/2,IND,1.8);
    T(s,b,{x:P+6.70,y,w:W-6.95,h:rowH,fontSize:hot?17:15,bold:true,
      color:hot?IND:INK,valign:'middle'});
  });
  // 세 번의 시도
  const cy=4.78, cw=(W-0.48)/3;
  [['첫 번째','무엇을 사면 될까','장비를 남겼다',REDL,REDB,RED],
   ['두 번째','무엇을 만들면 될까','데이터를 남겼다',REDL,REDB,RED],
   ['세 번째','무엇을 모르나 / 무엇을 원하나','그 둘을 쓸 수 있게 만들었다',GRNL,GRNB,GRN]]
   .forEach(([k,q,got,fill,line,c],i)=>{
    const x=P+i*(cw+0.24);
    card(s,x,cy,cw,1.22,{fill,line});
    T(s,k,{x:x+0.24,y:cy+0.14,w:cw-0.48,h:0.30,fontSize:15,bold:true,color:c});
    T(s,q,{x:x+0.24,y:cy+0.46,w:cw-0.48,h:0.30,fontSize:12,color:GRAY});
    T(s,got,{x:x+0.24,y:cy+0.78,w:cw-0.48,h:0.32,fontSize:14,bold:true,color:INK});
  });
  band(s,6.22,[{text:'AI로 ',options:{}},{text:'만들려다',options:{color:'FCA5A5'}},
               {text:' 두 번 실패하고, AI로 ',options:{}},{text:'묻기 시작하자',options:{color:GOLD}},
               {text:' 달라졌습니다.',options:{}}],0.62);
  foot(s);
}

// ════════════════════════════════════════════════════
// 32
// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════
SEC.cur='7. 그래서 무엇이 되었나';
{ const s=base();
  head(s,'WHAT WE BECAME','오성철강은 이제 어떤 회사인가');
  const cw=(W-0.34)/2;
  card(s,P,2.10,cw,2.55,{fill:GRNL,line:GRNB});
  T(s,'01',{x:P+0.30,y:2.26,w:1,h:0.46,fontSize:24,bold:true,color:GRN});
  T(s,'생산성 높은 장비에 걸맞는\n완벽한 품질 기술을 확보했습니다',
    {x:P+0.30,y:2.76,w:cw-0.6,h:0.82,fontSize:19,bold:true,color:INK,lsm:1.3});
  T(s,'공정 표준화 · 설정 불량 제거 · 전수 검증 · 데이터 자체의 검증.\n외주로 산 게 아니라 직접 만들었기 때문에, 계속 고칠 수 있습니다.',
    {x:P+0.30,y:3.70,w:cw-0.6,h:0.78,fontSize:13.5,lsm:1.5});
  const x2=P+cw+0.34;
  card(s,x2,2.10,cw,2.55,{fill:INDL,line:INDB});
  T(s,'02',{x:x2+0.30,y:2.26,w:1,h:0.46,fontSize:24,bold:true,color:IND});
  T(s,'이 차별화 기술로\n24시간 쉬지 않는 서비스 회사로',
    {x:x2+0.30,y:2.76,w:cw-0.6,h:0.82,fontSize:19,bold:true,color:INK,lsm:1.3});
  T(s,'사람이 응대하지 않아도 됩니다. 기록이 응대합니다.\n직원 12명 회사가 인력을 늘리지 않고 영업시간을 세 배로 늘리는 유일한 방법입니다.',
    {x:x2+0.30,y:3.70,w:cw-0.6,h:0.78,fontSize:13.5,lsm:1.5});
  // 낮 vs 24시간
  T(s,'장비 · 사람',{x:P,y:4.92,w:2,h:0.28,fontSize:12,bold:true,color:GRAY});
  rct(s,P+1.75,4.92,W-1.75,0.30,{fill:LINE2});
  rct(s,P+1.75+(W-1.75)*0.375,4.92,(W-1.75)*0.25,0.30,{fill:GRAY2});
  T(s,'09:00 – 18:00',{x:P+1.75+(W-1.75)*0.375,y:4.92,w:(W-1.75)*0.25,h:0.30,
    fontSize:11,bold:true,color:WHITE,align:'center',valign:'middle'});
  T(s,'서비스 · 기록',{x:P,y:5.42,w:2,h:0.28,fontSize:12,bold:true,color:IND});
  rct(s,P+1.75,5.42,W-1.75,0.30,{fill:IND});
  T(s,'00:00 — 24:00   쉬지 않습니다',{x:P+1.75,y:5.42,w:W-1.75,h:0.30,
    fontSize:11.5,bold:true,color:WHITE,align:'center',valign:'middle'});
  band(s,5.98,[{text:'단가 몇 % 차이로는 옮기지 않습니다. ',options:{}},
               {text:'옮기면 이 전부를 잃기 때문입니다.',options:{color:GOLD}}],0.78);
  foot(s);
}

// ════════════════════════════════════════════════════
// 33
// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════
SEC.cur='8. 지금 어디까지 왔나';
{ const s=base();
  head(s,'HONEST DIAGNOSIS',
    [{text:'질문 ①은 70%, ',options:{}},{text:'질문 ②는 20%',options:{color:RED}},
     {text:'입니다',options:{}}],{acc:RED});
  const cw=(W-0.34)/2;
  [['질문 ① 우리는 무엇을 모르는가',70,GRN,GRNL,GRNB,'완벽한 품질과 기술 내재화는 얻었습니다.\n판정하는 표준이 없는 것이 남았습니다.'],
   ['질문 ② 고객은 무엇을 원하는가',20,RED,REDL,REDB,'답은 찾았고 기능도 거의 만들었습니다.\n그런데 고객에게 나간 것이 하나도 없습니다.']]
   .forEach(([t,pc,c,fill,line,body],i)=>{
    const x=P+i*(cw+0.34);
    card(s,x,2.10,cw,1.72,{fill,line});
    T(s,t,{x:x+0.28,y:2.24,w:cw-0.56,h:0.30,fontSize:13,bold:true,color:c});
    T(s,[{text:String(pc),options:{fontSize:33}},{text:'%',options:{fontSize:17}}],
      {x:x+0.28,y:2.54,w:2,h:0.56,bold:true,color:c});
    rct(s,x+0.28,3.24,cw-0.56,0.14,{fill:WHITE});
    rct(s,x+0.28,3.24,(cw-0.56)*pc/100,0.14,{fill:c});
    T(s,body,{x:x+0.28,y:3.44,w:cw-0.56,h:0.34,fontSize:11.5,color:INK2,lsm:1.35});
  });
  card(s,P,4.00,W,0.72,{fill:TINT,line:LINE});
  T(s,[{text:'41개 중 고객에게 나가는 것은 3개 — 전부 시연용.  주문접수 자동화 4개 — 실배포 0건.  ',options:{color:INK}},
       {text:'두 번의 실패와 같은 자리에 있습니다.',options:{color:RED}}],
    {x:P+0.3,y:4.00,w:W-0.6,h:0.72,fontSize:13.5,bold:true,align:'center',valign:'middle'});
  // 로드맵
  const ry=5.00, cw3=(W-0.48)/3;
  [['1~3개월','신규 개발 없음','센서 배선 · 코일번호 태깅 100% · 품질이력↔작업데이터 연결 · 도구 3개 현장 상주',LINE,WHITE,GRAY],
   ['3~6개월','기준선을 만들고 창구를 엽니다','표준값 확정 · 화면이 판정 · 포털 실서비스 전환(1곳) · 품질 결과 1호 발행',INDB,INDL,IND],
   ['6~12개월','24시간을 완성하고 값을 받습니다','24시간 발주 실배포 · 상세본 유상화 · 계약서 명시 · 보관 대행 요율 계약',GRNB,GRNL,GRN]]
   .forEach(([lab,ttl,body,line,fill,c],i)=>{
    const x=P+i*(cw3+0.24);
    card(s,x,ry,cw3,1.62,{fill,line});
    T(s,lab,{x:x+0.24,y:ry+0.14,w:cw3-0.48,h:0.26,fontSize:11,bold:true,color:c,charSpacing:0.6});
    T(s,ttl,{x:x+0.24,y:ry+0.42,w:cw3-0.48,h:0.34,fontSize:15,bold:true,color:INK});
    T(s,body,{x:x+0.24,y:ry+0.80,w:cw3-0.48,h:0.72,fontSize:11.5,color:GRAY,lsm:1.45});
  });
  foot(s);
}

// ════════════════════════════════════════════════════
// 34
// ════════════════════════════════════════════════════
SEC.cur='8. 지금 어디까지 왔나';
{ const s=base();
  head(s,'CHECK US IN A YEAR',
    [{text:'1년 뒤에 ',options:{}},{text:'이걸로 확인해 주십시오',options:{color:IND}}]);
  const cw=(W-0.34)/2;
  // ①
  card(s,P,2.15,cw,4.30,{fill:WHITE,line:LINE});
  rct(s,P,2.15,cw,0.055,{fill:GRN});
  chip(s,P+0.28,2.36,'① 품질과 기술이 단단해졌는지','g',3.0);
  const r1=[['표준값 있는 사양','0%','80%'],['표준 이탈률','측정 안 됨','측정·하락'],
            ['데이터 결측률','구간별 존재','3% 이하'],['코일번호 태깅률','미완','100%'],
            ['셋업 시간','측정 안 됨','측정·하락'],['재작업·클레임','기록 산재','집계·하락']];
  r1.forEach(([a,b,c],i)=>{
    const y=2.88+i*0.52;
    T(s,a,{x:P+0.28,y,w:2.15,h:0.40,fontSize:12.5,color:INK2,valign:'middle'});
    T(s,b,{x:P+2.48,y,w:1.35,h:0.40,fontSize:11.5,color:GRAY,valign:'middle'});
    T(s,'→',{x:P+3.88,y,w:0.30,h:0.40,fontSize:12,color:GRAY2,valign:'middle'});
    T(s,c,{x:P+4.24,y,w:cw-4.52,h:0.40,fontSize:12.5,bold:true,color:INK,valign:'middle'});
    rct(s,P+0.28,y+0.44,cw-0.56,0.012,{fill:LINE2});
  });
  T(s,'"측정 안 됨 → 측정됨"도 성과입니다.',{x:P+0.28,y:6.02,w:cw-0.56,h:0.30,
    fontSize:12.5,bold:true,color:GRN});
  // ②
  const x2=P+cw+0.34;
  card(s,x2,2.15,cw,4.30,{fill:GRNL,line:GRNB});
  rct(s,x2,2.15,cw,0.055,{fill:IND});
  chip(s,x2+0.28,2.36,'② 24시간이 실제로 열렸는지','i',2.9);
  const r2=[['24시간 창구 쓰는 거래처','0 (시연만)','5곳+',0],
            ['업무시간 외 접속 비율','0%','30%+',1],
            ['온라인 발주 비율','0%','30%+',0],
            ['품질 결과 받는 거래처','0곳','5곳+',0],
            ['진행 문의 전화 건수','현재 수준','감소',0],
            ['서비스 적힌 견적서','0%','100%',0]];
  r2.forEach(([a,b,c,hot],i)=>{
    const y=2.88+i*0.52;
    if(hot) card(s,x2+0.20,y-0.04,cw-0.40,0.48,{fill:WHITE,line:null});
    T(s,a,{x:x2+0.28,y,w:2.45,h:0.40,fontSize:hot?13:12.5,bold:hot?true:false,color:INK2,valign:'middle'});
    T(s,b,{x:x2+2.78,y,w:1.20,h:0.40,fontSize:11.5,color:GRAY,valign:'middle'});
    T(s,'→',{x:x2+4.02,y,w:0.30,h:0.40,fontSize:12,color:GRAY2,valign:'middle'});
    T(s,c,{x:x2+4.38,y,w:cw-4.66,h:0.40,fontSize:hot?13.5:12.5,bold:true,color:hot?GRN:INK,valign:'middle'});
    if(!hot) rct(s,x2+0.28,y+0.44,cw-0.56,0.012,{fill:GRNB});
  });
  T(s,'밤·주말에 고객이 들어오면 진짜 24시간 회사, 낮에만 들어오면 화면 하나 더 만든 것입니다.',
    {x:x2+0.28,y:6.02,w:cw-0.56,h:0.30,fontSize:11.5,bold:true,color:GRN});
  foot(s);
}
// ════════════════════════════════════════════════════
// 35
// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════
SEC.cur='9. 요청';
{ const s=base();
  head(s,'OUR REQUEST',
    [{text:'「자체개발형 AI 모델공장」 ',options:{}},{text:'시범 지정',options:{color:IND}},
     {text:'을 요청드립니다',options:{}}]);
  card(s,P,1.72,W,0.70,{fill:INDL,line:INDB});
  T(s,[{text:'솔루션을 사주는 지원이 아니라, ',options:{color:INK}},
       {text:'공장이 직접 만들고 검증할 수 있는 역량',options:{color:IND}},
       {text:'에 투자하는 지원입니다.',options:{color:INK}}],
    {x:P+0.3,y:1.72,w:W-0.6,h:0.70,fontSize:17,bold:true,align:'center',valign:'middle'});

  const ax=P, aw=3.20, bx=P+3.52, bw=4.55, cx=P+8.42, cw2=W-8.42;

  // ── A. 지원해 주시면 ──
  T(s,'지원해 주시면',{x:ax,y:2.62,w:aw,h:0.28,fontSize:12,bold:true,color:GRAY,charSpacing:0.8});
  [['전담 인력  2명','데이터를 다룰 한 명\n현장에 적용할 한 명',RED,REDL,REDB],
   ['실증 예산','남은 공정 품질측정 완성\n이전 가능한 형태로 정리',IND,INDL,INDB],
   ['공개 실증장 · 교육',' 산업단지 안에 상설 견학\n교육 프로그램 운영',IND,INDL,INDB]]
   .forEach(([t,d2,c,bg,bd],i)=>{
    const y=3.00+i*1.06;
    card(s,ax,y,aw,0.92,{fill:bg,line:bd});
    T(s,t,{x:ax+0.22,y:y+0.10,w:aw-0.44,h:0.30,fontSize:14,bold:true,color:c});
    T(s,d2,{x:ax+0.22,y:y+0.42,w:aw-0.44,h:0.44,fontSize:10.5,color:INK2,lsm:1.35});
  });
  arw(s,ax+aw+0.06,4.06,bx-0.08,4.06,IND,2.2);

  // ── B. 오성철강이 돌리는 사이클 ──
  card(s,bx,2.56,bw,3.70,{fill:TINT,line:LINE});
  T(s,'오성철강은 이 사이클을 돌립니다',{x:bx+0.22,y:2.70,w:bw-0.44,h:0.28,
    fontSize:12,bold:true,color:IND,charSpacing:0.6});
  const sx=bx+0.66, sw=bw-0.92;
  [['기획','현장이 필요하다고 말한 것에서 출발'],
   ['개발','AI로 직접 제작 — 외주 없이 며칠'],
   ['검증','실데이터로 확인 · 안 쓰이면 폐기'],
   ['상용 전환','매일 쓰이는 서비스로 · 고객에게 제공']]
   .forEach(([t,d2],i)=>{
    const y=3.04+i*0.70;
    card(s,sx,y,sw,0.58,{fill:WHITE,line:INDB,lw:1.4});
    T(s,String(i+1),{x:sx+0.16,y,w:0.32,h:0.58,fontSize:12,bold:true,color:INDB,valign:'middle'});
    T(s,t,{x:sx+0.52,y,w:1.05,h:0.58,fontSize:13,bold:true,color:INK,valign:'middle'});
    T(s,d2,{x:sx+1.60,y,w:sw-1.76,h:0.58,fontSize:9.5,color:GRAY,valign:'middle',lsm:1.25});
    if(i<3) arw(s,sx+sw/2,y+0.60,sx+sw/2,y+0.68,INDB,1.6);
  });
  s.addShape(pptx.ShapeType.line,{x:bx+0.34,y:3.33,w:0.32,h:0.01,line:{color:IND,width:1.8}});
  s.addShape(pptx.ShapeType.line,{x:bx+0.34,y:3.33,w:0.01,h:2.10,line:{color:IND,width:1.8}});
  arw(s,bx+0.34,5.43,bx+0.64,5.43,IND,1.8);
  T(s,'다음\n서비스',{x:bx+0.10,y:4.14,w:0.52,h:0.50,fontSize:8,bold:true,color:IND,
    align:'center',lsm:1.2});
  card(s,sx,5.80,sw,0.38,{fill:INDL,line:null});
  T(s,'41개가 이 사이클로 나왔습니다',{x:sx,y:5.80,w:sw,h:0.38,fontSize:10.5,bold:true,
    color:IND,align:'center',valign:'middle'});
  arw(s,bx+bw+0.06,4.06,cx-0.08,4.06,GRN,2.2);

  // ── C. 주변 공장 ──
  T(s,'주변 공장은',{x:cx,y:2.62,w:cw2,h:0.28,fontSize:12,bold:true,color:GRAY,charSpacing:0.8});
  card(s,cx,3.00,cw2,0.66,{fill:GRNL,line:GRN,lw:2});
  T(s,'직접 와서 봅니다',{x:cx+0.20,y:3.00,w:cw2-0.40,h:0.66,fontSize:15,bold:true,
    color:GRN,valign:'middle'});
  arw(s,cx+cw2/2,3.70,cx+cw2/2,3.86,GRN,1.8);
  [['솔루션 도입','검증된 것만 골라서\n안전하게 산다'],
   ['직접 개발','만드는 방법을 배워\n스스로 만든다']]
   .forEach(([t,d2],i)=>{
    const y=3.92+i*1.02;
    card(s,cx,y,cw2,0.94,{fill:WHITE,line:GRNB});
    rct(s,cx,y,0.05,0.94,{fill:GRN});
    T(s,t,{x:cx+0.24,y:y+0.12,w:cw2-0.48,h:0.30,fontSize:14,bold:true,color:GRN});
    T(s,d2,{x:cx+0.24,y:y+0.44,w:cw2-0.48,h:0.44,fontSize:10.5,color:INK2,lsm:1.35});
  });
  card(s,cx,5.96,cw2,0.34,{fill:TINT,line:LINE});
  T(s,'= 모델 공장',{x:cx,y:5.96,w:cw2,h:0.34,fontSize:12,bold:true,color:INK,
    align:'center',valign:'middle'});

  band(s,6.40,[{text:'오성철강 한 곳을 지원하면, ',options:{}},
    {text:'반월시화 4,000곳이 보고 배울 곳',options:{color:GOLD}},
    {text:'이 생깁니다.',options:{}}],0.40);
  foot(s);
}

// ════════════════════════════════════════════════════
// 36
// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════
SEC.cur='';
{ const s=base(true);
  rct(s,0,0,0.14,SH,{fill:IND});
  T(s,'오디세우스는 고향으로 돌아오는 데 20년이 걸렸다고 합니다.',
    {x:P,y:1.12,w:11.4,h:0.36,fontSize:15,bold:true,color:GRAY2});
  T(s,[{text:'저는 ',options:{color:WHITE}},{text:'30년',options:{color:GOLD}},
       {text:'이 걸렸습니다.',options:{color:WHITE}}],
    {x:P,y:1.56,w:11.4,h:0.62,fontSize:32,bold:true});
  const cw=(W-0.40)/2;
  card(s,P,2.52,cw,1.62,{fill:NAVY2,line:'334155'});
  T(s,'밖에서 배운 것',{x:P+0.28,y:2.62,w:cw-0.56,h:0.26,fontSize:10.5,bold:true,color:GRAY2,charSpacing:0.8});
  T(s,[{text:'모든 장비를 연결하고, 실시간으로 지켜보고, 기준을 만들고, 원인을 분석해 다시는 안 생기게 하는 것.\n',options:{color:'CBD5E1'}},
       {text:'그리고 통신망은 24시간 돕니다. 사람이 자는 동안에도.',options:{color:WHITE}}],
    {x:P+0.28,y:3.00,w:cw-0.56,h:1.05,fontSize:12.5,bold:true,lsm:1.5});
  card(s,P+cw+0.40,2.52,cw,1.62,{fill:NAVY2,line:'334155'});
  T(s,'두 번의 실패는 헛되지 않았습니다',{x:P+cw+0.68,y:2.62,w:cw-0.56,h:0.26,
    fontSize:10.5,bold:true,color:GRAY2,charSpacing:0.8});
  T(s,[{text:'첫 번째는 ',options:{color:'CBD5E1'}},{text:'장비',options:{color:GOLD}},
       {text:'를 남겼고, 두 번째는 ',options:{color:'CBD5E1'}},{text:'데이터',options:{color:GOLD}},
       {text:'를 남겼습니다.\n그리고 AI가 그 데이터에 물어볼 방법을 가져다주었습니다.',options:{color:'CBD5E1'}}],
    {x:P+cw+0.68,y:3.00,w:cw-0.56,h:1.05,fontSize:12.5,bold:true,lsm:1.5});
  // 두 결론
  [['질문 ①로','완벽한 품질과, 직접 만들고 고칠 수 있는 기술'],
   ['질문 ②로','24시간 쉬지 않는 서비스 회사']].forEach(([lab,t],i)=>{
    const x=P+i*(cw+0.40);
    rct(s,x,4.42,cw,0.035,{fill:IND});
    T(s,lab,{x,y:4.58,w:cw,h:0.28,fontSize:11,bold:true,color:'A5B4FC',charSpacing:0.8});
    T(s,t,{x,y:4.88,w:cw,h:0.62,fontSize:17,bold:true,color:WHITE,lsm:1.3});
  });
  T(s,'그 경기장도 지금 다시 짓고 있습니다.  저희도 다시 짓고 있습니다.',
    {x:P,y:5.66,w:11.4,h:0.34,fontSize:14,bold:true,color:GRAY2});
  rct(s,P,6.18,1.30,0.045,{fill:GOLD});
  T(s,[{text:'AI는 개발이 아니라, ',options:{color:WHITE}},{text:'발견',options:{color:GOLD}},
       {text:'이었습니다.',options:{color:WHITE}}],
    {x:P,y:6.40,w:11.4,h:0.48,fontSize:26,bold:true});
  T(s,'그리고 발견은 질문에서만 나옵니다.',{x:P+7.5,y:6.52,w:3.9,h:0.34,
    fontSize:13,bold:true,color:GRAY2,align:'right'});
}

const OUT = process.argv[2] || '오성철강_산업부장관_발표_v6.pptx';
pptx.writeFile({ fileName: OUT }).then(()=>{
  console.log('✅ 완료: ' + OUT + '  (총 ' + _n + '장)');
}).catch(e=>{ console.error('❌ 실패:', e); process.exit(1); });
