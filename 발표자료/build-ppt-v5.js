// 오성철강 산업부 장관 발표자료 v5 — 15분 / 20장 / 프리미엄 디자인
// 실행: npm install pptxgenjs && node build-ppt-v5.js
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
// 01 · 표지
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
// 02 · 한 장 요약
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
// 03 · 우리는 어떤 회사인가
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
    T(s,v,{x,y:3.78,w:cw,h:0.72,fontSize:44,bold:true,color:i===1?'B45309':(i===2?RED:INK),align:'center'});
    T(s,l,{x,y:4.52,w:cw,h:0.30,fontSize:14,bold:true,color:INK,align:'center'});
    if(sub) T(s,sub,{x:x+0.1,y:4.84,w:cw-0.2,h:0.28,fontSize:10.5,color:GRAY,align:'center'});
  });
  band(s,5.52,[{text:'43년 전통의 회사가 아닙니다.   ',options:{}},
               {text:'회사도, 기계도, 사람도 오래되었습니다.',options:{color:'FCA5A5'}}],1.02);
  foot(s);
}

// ════════════════════════════════════════════════════
// 04 · 두 번의 실패
// ════════════════════════════════════════════════════
SEC.cur='2. 두 번의 실패';
{ const s=base();
  head(s,'TWO FAILURES',
    [{text:'두 번 시도했고, ',options:{}},{text:'두 번 다 값을 받지 못했습니다',options:{color:RED}}],
    {acc:RED});
  const cw=(W-0.34)/2;
  // 1차
  card(s,P,2.10,cw,3.10,{fill:WHITE,line:LINE});
  rct(s,P,2.10,cw,0.06,{fill:REDB});
  chip(s,P+0.28,2.32,'첫 번째  ·  장비를 바꿨습니다','r');
  T(s,'생산성은 올랐습니다.\n그런데 값은 오르지 않았습니다.',
    {x:P+0.28,y:2.80,w:cw-0.56,h:0.82,fontSize:19,bold:true,color:INK,lsm:1.35});
  card(s,P+0.28,3.74,cw-0.56,1.22,{fill:TINT,line:null});
  T(s,'세탁소가 비싼 세탁기를 들여놨다고\n세탁비를 더 받지는 못합니다.\n손님은 그 세탁기를 볼 수 없기 때문입니다.',
    {x:P+0.46,y:3.74,w:cw-0.92,h:1.22,fontSize:14,color:INK2,valign:'middle',lsm:1.5});
  // 2차
  const x2=P+cw+0.34;
  card(s,x2,2.10,cw,3.10,{fill:WHITE,line:LINE});
  rct(s,x2,2.10,cw,0.06,{fill:REDB});
  chip(s,x2+0.28,2.32,'두 번째  ·  AI 품질측정을 만들었습니다','r');
  T(s,[{text:'코일센터 최초로 개발해 ',options:{color:INK}},{text:'대상',options:{color:GRN}},
       {text:'까지 받았습니다.\n',options:{color:INK}},
       {text:'기술은 성공했고, 사업은 실패했습니다.',options:{color:INK}}],
    {x:x2+0.28,y:2.80,w:cw-0.56,h:0.82,fontSize:19,bold:true,lsm:1.35});
  const rows=[['현장이 쓰지 않았습니다','결과를 보려면 다른 프로그램을 또 켜야 했습니다'],
              ['고객이 알지 못했습니다','전수 검사 사실이 전달될 통로가 없었습니다']];
  rows.forEach(([a,b],i)=>{
    const y=3.74+i*0.62;
    s.addShape(pptx.ShapeType.ellipse,{x:x2+0.30,y:y+0.12,w:0.11,h:0.11,fill:{color:RED},line:{type:'none'}});
    T(s,[{text:a,options:{bold:true,color:INK}},{text:'  '+b,options:{color:GRAY}}],
      {x:x2+0.54,y,w:cw-0.84,h:0.56,fontSize:13.5,lsm:1.35});
  });
  band(s,5.52,[{text:'둘 다 훌륭했습니다. 그런데 둘 다 ',options:{}},
               {text:'아무도 볼 수 없는 곳에 있었습니다.',options:{color:GOLD}}],1.02);
  foot(s);
}

// ════════════════════════════════════════════════════
// 05 · 실패가 남긴 것
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
// 06 · AI 이전 vs 이후
// ════════════════════════════════════════════════════
SEC.cur='3. 전환점';
{ const s=base();
  head(s,'THE TURNING POINT',
    [{text:'데이터는 ',options:{}},{text:'질문에만',options:{color:IND}},{text:' 답합니다',options:{}}]);
  const cw=(W-0.40)/2;
  // 이전
  card(s,P,2.10,cw,3.30,{fill:WHITE,line:LINE});
  rct(s,P,2.10,cw,0.06,{fill:REDB});
  chip(s,P+0.28,2.32,'AI 이전  —  아무것도 할 수 없었습니다','r');
  const before=[['읽을 사람이 없었습니다','직원 12명 회사에 분석 인력이 있을 수 없습니다'],
                ['무엇을 볼지 먼저 정해야 했습니다','견적 수천만 원. 명세서에 써야 하는데 몰랐습니다'],
                ['무엇을 물어야 할지 몰랐습니다','가장 큰 이유였습니다']];
  before.forEach(([a,b],i)=>{
    const y=2.82+i*0.80;
    T(s,String(i+1),{x:P+0.30,y,w:0.38,h:0.36,fontSize:16,bold:true,color:i===2?RED:GRAY2});
    T(s,a,{x:P+0.74,y:y-0.02,w:cw-1.0,h:0.34,fontSize:15.5,bold:true,color:i===2?RED:INK});
    T(s,b,{x:P+0.74,y:y+0.32,w:cw-1.0,h:0.34,fontSize:12,color:GRAY});
  });
  card(s,P+0.28,5.10,cw-0.56,0.16,{fill:REDL,line:null});
  // 이후
  const x2=P+cw+0.40;
  card(s,x2,2.10,cw,3.30,{fill:WHITE,line:LINE});
  rct(s,x2,2.10,cw,0.06,{fill:GRNB});
  chip(s,x2+0.28,2.32,'AI 이후  —  세 가지가 동시에 풀렸습니다','g');
  const after=[['물어보면 됩니다','코일 60개·2주치를 훑는 일 — 사람은 며칠, AI는 한 번'],
               ['틀린 질문을 해도 비용이 안 듭니다','틀려도 되니까 많이 물었고, 많이 물으니 발견이 나왔습니다'],
               ['화면까지 직접 만들 수 있게 됐습니다','처음 것은 조잡했습니다. 그래도 41개가 됐습니다']];
  after.forEach(([a,b],i)=>{
    const y=2.82+i*0.80;
    T(s,String(i+1),{x:x2+0.30,y,w:0.38,h:0.36,fontSize:16,bold:true,color:i===1?GRN:GRAY2});
    T(s,a,{x:x2+0.74,y:y-0.02,w:cw-1.0,h:0.34,fontSize:15.5,bold:true,color:i===1?GRN:INK});
    T(s,b,{x:x2+0.74,y:y+0.32,w:cw-1.0,h:0.34,fontSize:12,color:GRAY});
  });
  band(s,5.68,[{text:'질문이 없으면 데이터는 ',options:{}},
               {text:'창고에 쌓인 재고',options:{color:GOLD}},
               {text:'와 같습니다.',options:{}}],0.88);
  foot(s);
}

// ════════════════════════════════════════════════════
// 07 · [섹션] 두 개의 질문
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
// 08 · 질문① 몰랐던 것 4가지
// ════════════════════════════════════════════════════
SEC.cur='4. 질문 ① 우리는 무엇을 모르는가';
{ const s=base();
  head(s,'QUESTION 01',
    [{text:'작업자가 ',options:{}},{text:'답하지 못하는 질문',options:{color:IND}},
     {text:'을 하나씩 없앴습니다',options:{}}]);
  const cw=(W-0.30)/2, ch=1.28;
  const d=[['01','"지금 잘 돌아가고 있나?"','소리와 감으로 판단 — 40년 공장장 머릿속에만 있었습니다',false],
           ['02','"아까 그 불량, 그때 어떻게 돌렸더라?"','기억에 의존 — 그래서 같은 불량이 또 났습니다',false],
           ['03','"이건 우리 잘못인가, 원래 그랬나?"','숫자만으로는 표면 흠집을 가릴 수 없었습니다',false],
           ['04','"우리 데이터는 믿을 만한가?"','가장 중요한 질문이었고, 답은 "아니오"였습니다',true]];
  d.forEach(([n,q,sub,hot],i)=>{
    const x=P+(i%2)*(cw+0.30), y=2.14+Math.floor(i/2)*(ch+0.26);
    card(s,x,y,cw,ch,{fill:hot?REDL:WHITE,line:hot?REDB:LINE});
    rct(s,x,y,0.055,ch,{fill:hot?RED:IND});
    T(s,n,{x:x+0.30,y:y+0.20,w:0.70,h:0.40,fontSize:20,bold:true,color:hot?RED:INDB});
    T(s,q,{x:x+1.02,y:y+0.20,w:cw-1.30,h:0.42,fontSize:18,bold:true,color:hot?RED:INK});
    T(s,sub,{x:x+1.02,y:y+0.68,w:cw-1.30,h:0.42,fontSize:12.5,color:GRAY});
  });
  card(s,P,5.28,W,1.22,{fill:TINT,line:LINE});
  T(s,[{text:'큰 시스템을 만들지 않았습니다.  ',options:{color:INK}},
       {text:'답하지 못하는 질문을 찾아, 하나씩 지웠을 뿐입니다.',options:{color:IND}}],
    {x:P+0.3,y:5.28,w:W-0.6,h:1.22,fontSize:19,bold:true,align:'center',valign:'middle'});
  foot(s);
}

// ════════════════════════════════════════════════════
// 09 · UI 2종
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
    const y=py+i*1.74;
    card(s,rx,y,rw,1.62,{fill,line});
    chip(s,rx+0.24,y+0.14,lab,kind,0.62);
    T(s,body,{x:rx+0.24,y:y+0.54,w:rw-0.48,h:1.00,fontSize:12.5,color:INK2,lsm:1.45});
  });
  card(s,rx,py+3.62,rw,0.86,{fill:INDL,line:INDB});
  T(s,[{text:'데이터 단자가 없는 30년 된 장비는 ',options:{color:INK}},
       {text:'휴대폰 카메라',options:{color:IND}},
       {text:'를 세워두고 AI가 계기판 숫자를 읽게 했습니다. 1분마다 6개 값이 자동 기록됩니다.',options:{color:INK}}],
    {x:rx+0.24,y:py+3.62,w:rw-0.48,h:0.86,fontSize:12.5,bold:true,valign:'middle',lsm:1.4});
  foot(s);
}

// ════════════════════════════════════════════════════
// 10 · 데이터를 의심했다
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
    card(s,x,2.10,cw,3.00,{fill:WHITE,line:LINE});
    rct(s,x,2.10,cw,0.06,{fill:c===RED?REDB:LINE});
    T(s,lab,{x:x+0.26,y:2.30,w:cw-0.5,h:0.26,fontSize:11,bold:true,color:GRAY,charSpacing:0.6});
    T(s,ttl,{x:x+0.26,y:2.58,w:cw-0.5,h:0.34,fontSize:17,bold:true,color:INK});
    T(s,v,{x:x+0.26,y:3.00,w:cw-0.5,h:0.72,fontSize:42,bold:true,color:c});
    T(s,vl,{x:x+0.26,y:3.74,w:cw-0.5,h:0.26,fontSize:11.5,bold:true,color:GRAY});
    rct(s,x+0.26,4.06,cw-0.5,0.012,{fill:LINE});
    T(s,body,{x:x+0.26,y:4.18,w:cw-0.5,h:0.82,fontSize:12.5,lsm:1.45});
  });
  band(s,5.38,[{text:'187만 건이 있어도, ',options:{}},
               {text:'검증하지 않은 데이터는 자산이 아니라 위험입니다.',options:{color:GOLD}}],1.02);
  foot(s);
}

// ════════════════════════════════════════════════════
// 11 · 얻은 것 두 가지
// ════════════════════════════════════════════════════
SEC.cur='4. 질문 ① 우리는 무엇을 모르는가';
{ const s=base();
  head(s,'WHAT WE GAINED',
    [{text:'질문 ①이 남긴 것 — ',options:{}},{text:'완벽한 품질',options:{color:GRN}},
     {text:'과 ',options:{}},{text:'기술 내재화',options:{color:GRN}}],{acc:GRN});
  const cw=(W-0.34)/2;
  // 품질
  card(s,P,2.10,cw,3.28,{fill:GRNL,line:GRNB});
  chip(s,P+0.28,2.30,'01  완벽한 품질','g',1.75);
  const q=[['공정이 표준화됐습니다','경력 40년이든 입사 한 달이든 같은 화면, 같은 값'],
           ['설정 불량이 거의 사라졌습니다','설정값 계산 도구를 만든 뒤 이 유형은 사실상 소멸'],
           ['전수 검증','샘플로 보지 않습니다. 표면은 전부 촬영, 조건은 2초마다 기록'],
           ['데이터 자체를 검증','센서가 죽었는지, 측정이 도는지를 의심하고 확인']];
  q.forEach(([a,b],i)=>{
    const y=2.78+i*0.62;
    s.addShape(pptx.ShapeType.ellipse,{x:P+0.30,y:y+0.13,w:0.10,h:0.10,fill:{color:GRN},line:{type:'none'}});
    T(s,[{text:a,options:{bold:true,color:INK}},{text:'\n'+b,options:{color:GRAY,fontSize:11.5}}],
      {x:P+0.52,y,w:cw-0.82,h:0.58,fontSize:14,lsm:1.35});
  });
  T(s,'1차에서 장비를 샀고, 3차에 그 장비를 제대로 쓰는 기술을 얻었습니다.',
    {x:P+0.28,y:5.02,w:cw-0.56,h:0.3,fontSize:12,bold:true,color:GRN});
  // 내재화
  const x2=P+cw+0.34;
  card(s,x2,2.10,cw,3.28,{fill:WHITE,line:LINE});
  chip(s,x2+0.28,2.30,'02  기술 내재화','i',1.85);
  const nw=(cw-0.56-0.28)/3;
  [['41','직접 만든 서비스'],['0','외주 개발'],['며칠','현장 요구 반영']].forEach(([v,l],i)=>{
    const x=x2+0.28+i*(nw+0.14);
    card(s,x,2.76,nw,0.90,{fill:TINT,line:null});
    T(s,v,{x,y:2.84,w:nw,h:0.46,fontSize:24,bold:true,color:IND,align:'center'});
    T(s,l,{x,y:3.30,w:nw,h:0.26,fontSize:10,color:GRAY,align:'center'});
  });
  card(s,x2+0.28,3.80,cw-0.56,1.48,{fill:GOLDL,line:GOLDB});
  T(s,[{text:'현장 도구를 한국어·영어 두 벌로 만들자, 외국인 직원들이 AI의 도움으로 기계 기록을 직접 읽기 시작했습니다.\n',options:{color:INK2}},
       {text:'지금 저희에겐 롤러 Ø40 · 길이 1,320 · 축 Ø20까지 정리된 장비 개조 도면이 있습니다. 그린 사람은 엔지니어가 아니라 현장 직원입니다.',options:{color:INK}}],
    {x:x2+0.46,y:3.80,w:cw-0.92,h:1.48,fontSize:13,bold:true,valign:'middle',lsm:1.45});
  band(s,5.62,[{text:'그리고 ',options:{}},{text:'"설정값 도구를 만들어달라"',options:{color:GOLD}},
               {text:'는 요구가 아래에서 올라왔습니다. 앞의 두 번은 위에서 내려준 것이었습니다.',options:{}}],0.92);
  foot(s);
}

// ════════════════════════════════════════════════════
// 12 · AI 41개 · 여섯 가지 방식
// ════════════════════════════════════════════════════
SEC.cur='4. 질문 ① 우리는 무엇을 모르는가';
{ const s=base();
  head(s,'41 SERVICES, 6 WAYS',
    [{text:'한 가지 AI가 아닙니다 — ',options:{}},{text:'여섯 가지 방식',options:{color:IND}},
     {text:'으로 씁니다',options:{}}]);
  const cw=(W-0.48)/3, ch=1.22;
  const d=[['01','읽는 AI','계기판 사진의 숫자, 팩스 작업요청서, 지출 영수증을 읽습니다'],
           ['02','보는 AI','분당 250m로 지나가는 철판 표면을 전수 촬영해 흠집을 찾습니다'],
           ['03','찾아내는 AI','2주치를 한 번에 훑어 고장 난 센서와 이상 구간을 걸러냅니다'],
           ['04','추천하는 AI','같은 사양 실측값으로 권장 속도·힘·예상 가동시간을 제시합니다'],
           ['05','답하는 AI','고객이 말로 물으면 실제 기록을 근거로 답합니다'],
           ['06','만드는 AI','화면과 분석 도구 자체를 AI로 만들었습니다']];
  d.forEach(([n,t,b],i)=>{
    const x=P+(i%3)*(cw+0.24), y=2.08+Math.floor(i/3)*(ch+0.22);
    const hot = i===5;
    card(s,x,y,cw,ch,{fill:hot?INDL:WHITE,line:hot?INDB:LINE});
    T(s,n,{x:x+0.26,y:y+0.16,w:0.8,h:0.32,fontSize:15,bold:true,color:hot?IND:INDB});
    T(s,t,{x:x+0.26,y:y+0.46,w:cw-0.5,h:0.32,fontSize:16.5,bold:true,color:INK});
    T(s,b,{x:x+0.26,y:y+0.78,w:cw-0.5,h:0.36,fontSize:11.5,color:GRAY,lsm:1.35});
  });
  // 통계 줄
  card(s,P,4.94,W,0.84,{fill:TINT,line:LINE});
  const st=[['41','자체개발'],['30','실데이터 가동'],['2','현장 상주'],['187만','누적 데이터'],['0','외주']];
  st.forEach(([v,l],i)=>{
    const x=P+0.30+i*((W-0.60)/5);
    T(s,[{text:v,options:{fontSize:19,color:IND}},{text:'  '+l,options:{fontSize:12,color:GRAY}}],
      {x,y:4.94,w:(W-0.60)/5,h:0.84,bold:true,valign:'middle'});
  });
  band(s,6.00,[{text:'06번이 앞의 다섯 개를 가능하게 했습니다.  ',options:{}},
               {text:'개발을 AI로 하니, 나머지를 직접 만들 수 있었습니다.',options:{color:GOLD}}],0.78);
  foot(s);
}

// ════════════════════════════════════════════════════
// 13 · [섹션] 고객은 무엇을 원하는가
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
// 14 · 24시간 다섯 가지
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
// 15 · 밤 11시 UI
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
// 16 · 두 질문이 하나였다
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
// 17 · 오성철강은 무엇이 되었나
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
// 18 · 진단 + 로드맵
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
    T(s,[{text:String(pc),options:{fontSize:40}},{text:'%',options:{fontSize:20}}],
      {x:x+0.28,y:2.56,w:2,h:0.62,bold:true,color:c});
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
// 19 · 요청
// ════════════════════════════════════════════════════
SEC.cur='9. 요청';
{ const s=base();
  head(s,'OUR REQUEST',
    [{text:'「자체개발형 AI 모델공장」 ',options:{}},{text:'시범 지정',options:{color:IND}},
     {text:'을 요청드립니다',options:{}}]);
  card(s,P,2.05,W,0.80,{fill:INDL,line:INDB});
  T(s,[{text:'솔루션을 사주는 지원이 아니라, ',options:{color:INK}},
       {text:'공장이 직접 물어볼 수 있는 역량',options:{color:IND}},
       {text:'에 투자하는 지원입니다.',options:{color:INK}}],
    {x:P+0.3,y:2.05,w:W-0.6,h:0.80,fontSize:18,bold:true,align:'center',valign:'middle'});
  const cw=(W-0.48)/3;
  const d=[['전담 인력','2명','데이터를 다룰 한 명, 현장에 적용할 한 명.',
            '지금 이 41개를 저 혼자 만들고 있습니다. 혼자서도 여기까지 왔습니다.\n혼자가 아니면 어디까지 갈 수 있을지 확인하고 싶습니다.',REDL,REDB],
           ['실증 예산','품질측정 완성','남은 공정의 품질측정을 완성해 24시간 품질 결과 제공을 끝까지 완성하고,',
            '저희가 만든 것을 다른 공장도 쓸 수 있는 형태로 정리하는 데 쓰겠습니다.',TINT,LINE],
           ['확산 채널','공개 실증장','산업단지 안에 공개 실증장을 열어 다른 공장이 보러 오게 하고,',
            '교육 프로그램을 운영하겠습니다.  2027 시범 → 2028 반월시화 확대.',TINT,LINE]];
  d.forEach(([lab,big,body,note,fill,line],i)=>{
    const x=P+i*(cw+0.24);
    card(s,x,3.05,cw,2.35,{fill:WHITE,line:LINE});
    rct(s,x,3.05,cw,0.06,{fill:IND});
    T(s,lab,{x:x+0.26,y:3.24,w:cw-0.5,h:0.28,fontSize:11.5,bold:true,color:GRAY,charSpacing:0.8});
    T(s,big,{x:x+0.26,y:3.52,w:cw-0.5,h:0.50,fontSize:24,bold:true,color:IND});
    T(s,body,{x:x+0.26,y:4.10,w:cw-0.5,h:0.60,fontSize:12.5,lsm:1.45});
    card(s,x+0.26,4.72,cw-0.52,0.54,{fill,line:line===LINE?null:line});
    T(s,note,{x:x+0.38,y:4.72,w:cw-0.76,h:0.54,fontSize:10.5,bold:true,color:INK,
      valign:'middle',lsm:1.35});
  });
  card(s,P,5.62,W,1.02,{fill:TINT,line:LINE});
  T(s,[{text:'1년 뒤 이걸로 확인해 주십시오 —  ',options:{color:GRAY}},
       {text:'표준값 있는 사양 80%  ·  데이터 결측률 3% 이하  ·  24시간 창구 쓰는 거래처 5곳  ·  업무시간 외 접속 30%  ·  가공 외 매출 0원이 아니게',
        options:{color:INK}}],
    {x:P+0.3,y:5.62,w:W-0.6,h:1.02,fontSize:13,bold:true,align:'center',valign:'middle',lsm:1.45});
  foot(s);
}

// ════════════════════════════════════════════════════
// 20 · 클로징
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

// ════════════════════════════════════════════════════
const OUT = process.argv[2] || '오성철강_산업부장관_발표_v5.pptx';
pptx.writeFile({ fileName: OUT }).then(()=>{
  console.log('✅ 완료: ' + OUT + '  (총 ' + _n + '장)');
}).catch(e=>{ console.error('❌ 실패:', e); process.exit(1); });
