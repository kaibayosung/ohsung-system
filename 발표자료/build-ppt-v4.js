// 오성철강 산업부 장관 발표자료 v4 — pptxgenjs 빌드 스크립트
// 실행: npm install pptxgenjs && node build-ppt-v4.js
// 출력: 오성철강_산업부장관_발표_v4.pptx  (13.33 x 7.5in, 흰 배경, 큰 폰트)

const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';            // 13.333 x 7.5 in
pptx.author = '오성철강';
pptx.title = '오성철강 AX 전환 종합 보고';

// ── 상수 ──────────────────────────────────────────────
const F = '맑은 고딕';
const P = 0.55, W = 12.233, SW = 13.333, SH = 7.5;

const INK='101828', INK2='344054', GRAY='667085', GRAY2='98A2B3',
      LINE='E4E7EC', TINT='F9FAFB', WHITE='FFFFFF',
      PP='4F46E5', PPL='EEF0FF', PPB='C7CDFF',
      RD='D92D20', RDL='FEF3F2', RDB='FDA29B',
      GR='067647', GRL='ECFDF3', GRB='A6F4C5',
      AM='B54708', AML='FFFAEB', AMB='FEC84B',
      YEL='FEC84B', NAVY='1D2939';

const TAGC = { pp:[PP,PPL], rd:[RD,RDL], gr:[GR,GRL], am:[AM,AML], bl:['026AA2','F0F9FF'] };

let _n = 0;
function S(){
  const s = pptx.addSlide();
  _n++;
  s.addText(String(_n), { x:12.45, y:7.03, w:0.6, h:0.28, fontSize:10, bold:true,
                          color:GRAY2, align:'right', fontFace:F });
  return s;
}
function tag(s, t, c='pp', y=0.40){
  const [fg,bg] = TAGC[c] || TAGC.pp;
  s.addText(t, { x:P, y, w:Math.min(W, 0.26*t.length+1.1), h:0.40, fontSize:13.5, bold:true,
                 color:fg, fill:{color:bg}, align:'center', valign:'middle',
                 fontFace:F, rectRadius:0.06, shape:pptx.ShapeType.roundRect });
}
function H(s, runs, o={}){
  s.addText(runs, { x:P, y:o.y!==undefined?o.y:0.95, w:o.w||W, h:o.h||1.0,
                    fontSize:o.size||29, bold:true, color:INK, fontFace:F,
                    valign:'top', lineSpacingMultiple:1.15, ...(o.extra||{}) });
}
function box(s,x,y,w,h,o={}){
  s.addShape(pptx.ShapeType.roundRect, { x,y,w,h, rectRadius:0.07,
    fill:{ color:o.fill||WHITE }, line:{ color:o.line||LINE, width:o.lw!==undefined?o.lw:1.75 } });
}
function rect(s,x,y,w,h,o={}){
  s.addShape(pptx.ShapeType.rect, { x,y,w,h,
    fill:{ color:o.fill||WHITE }, line:o.line===null?{type:'none'}:{ color:o.line||LINE, width:o.lw!==undefined?o.lw:1.5 } });
}
function T(s,t,o={}){
  s.addText(t, { fontFace:F, color:o.color||INK2, valign:o.valign||'top',
                 lineSpacingMultiple:o.lsm||1.35, ...o });
}
function arrow(s,x1,y1,x2,y2,c=GRAY2,w=2){
  s.addShape(pptx.ShapeType.line, { x:Math.min(x1,x2), y:Math.min(y1,y2),
    w:Math.abs(x2-x1), h:Math.abs(y2-y1),
    line:{ color:c, width:w, endArrowType:'triangle',
           beginArrowType:'none' },
    flipH: x2<x1, flipV: y2<y1 });
}
function pill(s,x,y,t,c='n',wOverride){
  const m = { n:[GRAY,TINT,LINE], g:[GR,GRL,GRB], a:[AM,AML,AMB], p:[PP,PPL,PPB], r:[RD,RDL,RDB] };
  const [fg,bg,ln] = m[c]||m.n;
  const w = wOverride || (0.145*t.length + 0.42);
  s.addText(t, { x,y,w,h:0.30, fontSize:11.5, bold:true, color:fg, fill:{color:bg},
                 line:{color:ln,width:1.4}, align:'center', valign:'middle', fontFace:F,
                 shape:pptx.ShapeType.roundRect, rectRadius:0.14 });
  return w;
}
function darkBar(s, y, runs, h=0.95){
  s.addShape(pptx.ShapeType.roundRect, { x:P, y, w:W, h, rectRadius:0.07,
    fill:{color:INK}, line:{type:'none'} });
  s.addText(runs, { x:P+0.2, y, w:W-0.4, h, fontSize:19, bold:true, color:WHITE,
                    align:'center', valign:'middle', fontFace:F, lineSpacingMultiple:1.25 });
}
function bar(s,x,y,w,pct,c=PP,h=0.17){
  rect(s,x,y,w,h,{fill:LINE,line:null});
  if(pct>0) rect(s,x,y,w*pct/100,h,{fill:c,line:null});
}

// ════════════════════════════════════════════════════
// 1 · 표지
// ════════════════════════════════════════════════════
{ const s=S();
  let x=P;
  ['1983 잠실 주경기장','43년','직원 12명'].forEach((t,i)=>{ x += pill(s,x,0.70,t,i===0?'p':'n')+0.14; });
  pill(s,x,0.70,'자체개발 41개','g');
  H(s,[{text:'낮에만 도는 공장에서,\n',options:{}},
       {text:'24시간 쉬지 않는 회사',options:{color:PP}},{text:'로',options:{}}],
    {y:1.45,h:2.1,size:44});
  T(s,[{text:'두 번 실패하고 남은 것은 ',options:{}},
       {text:'데이터',options:{bold:true,color:INK}},{text:'였습니다',options:{}}],
    {x:P,y:3.70,w:W,h:0.5,fontSize:21,bold:true});
  rect(s,P,5.55,W,0.035,{fill:LINE,line:null});
  T(s,'오성철강 AX 전환 종합 보고',{x:P,y:5.80,w:7,h:0.42,fontSize:19,bold:true,color:INK});
  T(s,'산업통상자원부 장관 보고',{x:P,y:6.24,w:7,h:0.34,fontSize:13.5,color:GRAY});
  T(s,'2026. 9.',{x:10.3,y:6.24,w:2.5,h:0.34,fontSize:13.5,color:GRAY,align:'right'});
}

// ════════════════════════════════════════════════════
// 2 · 전체 구조
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'이 보고의 전체 구조');
  H(s,[{text:'두 번의 실패가 ',options:{}},{text:'자산',options:{color:RD}},
       {text:'을 남기고,\nAI가 그것에 ',options:{}},{text:'물어볼 방법',options:{color:PP}},
       {text:'을 가져왔습니다',options:{}}],{y:0.88,h:1.55,size:25});
  // 1차/2차 실패
  box(s,P,2.52,2.55,1.15,{fill:RDL,line:RDB,lw:2});
  T(s,'1차 실패 · 장비',{x:P+0.15,y:2.62,w:2.3,h:0.3,fontSize:14,bold:true,color:RD});
  T(s,'생산성은 올랐지만\n값은 그대로',{x:P+0.15,y:2.94,w:2.3,h:0.62,fontSize:12.5,bold:true,color:INK});
  box(s,P,3.84,2.55,1.15,{fill:RDL,line:RDB,lw:2});
  T(s,'2차 실패 · AI 품질측정',{x:P+0.15,y:3.94,w:2.3,h:0.3,fontSize:14,bold:true,color:RD});
  T(s,'대상은 받았지만\n매출은 그대로',{x:P+0.15,y:4.26,w:2.3,h:0.62,fontSize:12.5,bold:true,color:INK});
  arrow(s,3.18,3.10,3.60,3.46);
  arrow(s,3.18,4.41,3.60,3.96);
  // 남은 것
  box(s,3.66,2.96,2.75,1.90,{fill:AML,line:AMB,lw:2});
  T(s,'남은 것',{x:3.82,y:3.08,w:2.4,h:0.3,fontSize:15,bold:true,color:AM});
  T(s,'· 생산성 높은 장비\n· 정밀 품질 측정 자료\n· 공정 데이터 187만 건',
    {x:3.82,y:3.44,w:2.5,h:0.95,fontSize:12.5,bold:true,color:INK,lsm:1.5});
  T(s,'AI 이전엔 쓸 수 없었다',{x:3.82,y:4.48,w:2.4,h:0.3,fontSize:11.5,bold:true,color:GRAY2});
  arrow(s,6.52,3.91,7.02,3.91,PP,2.5);
  // 두 질문
  box(s,7.08,2.52,2.85,1.55,{fill:PPL,line:PPB,lw:2});
  T(s,'질문 ①',{x:7.24,y:2.62,w:2.5,h:0.28,fontSize:13.5,bold:true,color:PP});
  T(s,'우리는\n무엇을 모르는가',{x:7.24,y:2.94,w:2.6,h:0.92,fontSize:17,bold:true,color:INK,lsm:1.25});
  box(s,7.08,4.21,2.85,1.55,{fill:PPL,line:PPB,lw:2});
  T(s,'질문 ②',{x:7.24,y:4.31,w:2.5,h:0.28,fontSize:13.5,bold:true,color:PP});
  T(s,'고객들은\n무엇을 원하는가',{x:7.24,y:4.63,w:2.6,h:0.92,fontSize:17,bold:true,color:INK,lsm:1.25});
  arrow(s,10.02,3.29,10.42,3.29,GR,2.5);
  arrow(s,10.02,4.98,10.42,4.98,GR,2.5);
  // 결과
  box(s,10.48,2.52,2.33,1.55,{fill:GRL,line:GRB,lw:2});
  T(s,'완벽한 품질\n기술 내재화',{x:10.62,y:2.74,w:2.1,h:0.8,fontSize:16,bold:true,color:GR,lsm:1.3});
  T(s,'진도 70%',{x:10.62,y:3.66,w:2.1,h:0.28,fontSize:11.5,bold:true,color:GRAY2});
  box(s,10.48,4.21,2.33,1.55,{fill:GRL,line:GRB,lw:2});
  T(s,'24시간\n서비스 회사',{x:10.62,y:4.41,w:2.1,h:0.8,fontSize:16,bold:true,color:GR,lsm:1.3});
  T(s,'진도 20%\n여기가 남았습니다',{x:10.62,y:5.20,w:2.05,h:0.5,fontSize:10,bold:true,color:RD,lsm:1.25});
  darkBar(s,6.05,[{text:'좋은 장비는 낮에만 돕니다.  ',options:{}},
                  {text:'서비스는 24시간 돕니다.',options:{color:YEL}}],0.85);
}

// ════════════════════════════════════════════════════
// 3 · 우리가 하는 일
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'1부 · 우리는 어떤 회사인가','bl');
  H(s,[{text:'전기차도, 건물도 ',options:{}},{text:'이 공정',options:{color:PP}},
       {text:'을 지나갑니다',options:{}}],{y:0.92,h:0.62});
  box(s,P,1.85,2.35,1.85,{fill:TINT});
  T(s,'제철소',{x:P,y:2.00,w:2.35,h:0.32,fontSize:15,bold:true,color:GRAY,align:'center'});
  s.addShape(pptx.ShapeType.ellipse,{x:P+0.55,y:2.45,w:1.25,h:0.72,fill:{color:'D0D5DD'},line:{type:'none'}});
  s.addShape(pptx.ShapeType.ellipse,{x:P+1.00,y:2.68,w:0.36,h:0.26,fill:{color:GRAY2},line:{type:'none'}});
  T(s,'넓고 거친 두루마리',{x:P,y:3.28,w:2.35,h:0.3,fontSize:12,bold:true,align:'center'});
  arrow(s,3.02,2.78,3.42,2.78);
  box(s,3.48,1.60,3.90,2.35,{fill:PPL,line:PP,lw:2.5});
  T(s,'오성철강',{x:3.48,y:1.74,w:3.9,h:0.38,fontSize:18,bold:true,color:PP,align:'center'});
  box(s,3.70,2.22,1.78,0.72);
  T(s,'슬리터',{x:3.70,y:2.31,w:1.78,h:0.28,fontSize:12.5,bold:true,color:INK,align:'center'});
  T(s,'폭으로 자름',{x:3.70,y:2.59,w:1.78,h:0.26,fontSize:11,color:GRAY,align:'center'});
  box(s,5.58,2.22,1.60,0.72);
  T(s,'레벨러',{x:5.58,y:2.31,w:1.60,h:0.28,fontSize:12.5,bold:true,color:INK,align:'center'});
  T(s,'휜 것을 펴줌',{x:5.58,y:2.59,w:1.60,h:0.26,fontSize:11,color:GRAY,align:'center'});
  box(s,3.70,3.06,3.48,0.66);
  T(s,'AI 표면 검사 · 두께 측정 (전수)',{x:3.70,y:3.18,w:3.48,h:0.4,fontSize:12.5,bold:true,color:INK,align:'center'});
  arrow(s,7.46,2.78,7.86,2.78);
  box(s,7.92,1.85,2.30,1.85,{fill:GRL,line:GRB,lw:2});
  T(s,'자동차 공장',{x:7.92,y:2.00,w:2.3,h:0.32,fontSize:15,bold:true,color:GR,align:'center'});
  T(s,'문짝 · 골조\n전기차 부품',{x:7.92,y:2.44,w:2.3,h:0.62,fontSize:12.5,bold:true,align:'center'});
  T(s,'바로 쓸 수 있는 상태로',{x:7.92,y:3.20,w:2.3,h:0.3,fontSize:11,color:GRAY2,align:'center'});
  box(s,10.42,1.85,2.38,1.85,{fill:TINT});
  T(s,'그런데',{x:10.42,y:1.98,w:2.38,h:0.3,fontSize:14,bold:true,color:RD,align:'center'});
  T(s,'이 공정을 하는\n공장들이',{x:10.42,y:2.36,w:2.38,h:0.62,fontSize:13,bold:true,align:'center'});
  T(s,'문을 닫고 있습니다',{x:10.42,y:3.08,w:2.38,h:0.36,fontSize:14,bold:true,color:RD,align:'center'});
  box(s,P,4.22,W,1.30,{fill:TINT});
  T(s,[{text:'완성차가 세계에서 경쟁하려면 ',options:{}},
       {text:'좋은 소재가 적정한 가격에',options:{bold:true,color:INK}},
       {text:' 들어가야 합니다.\n',options:{}},
       {text:'소재가 흔들리면 그 위의 산업 전체가 흔들립니다.',options:{bold:true,color:INK}}],
    {x:P+0.3,y:4.42,w:W-0.6,h:0.95,fontSize:19,bold:true,lsm:1.4});
}

// ════════════════════════════════════════════════════
// 4 · 1983
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'1부 · 우리는 어떤 회사인가','bl');
  H(s,[{text:'1983년, 저희는 ',options:{}},{text:'잠실 주경기장 지붕',options:{color:PP}},
       {text:'을 만들었습니다',options:{}}],{y:0.92,h:0.62});
  const cw=3.90, gap=0.28;
  box(s,P,1.82,cw,2.30,{fill:PPL,line:PPB,lw:2});
  T(s,'1983',{x:P+0.28,y:1.98,w:3.4,h:0.85,fontSize:44,bold:true,color:PP});
  T(s,'첨단 제조 회사였습니다',{x:P+0.28,y:2.90,w:3.4,h:0.4,fontSize:19,bold:true,color:INK});
  T(s,'서울에서 가장 큰 건물의 지붕을\n맡을 기술이 있었습니다.',
    {x:P+0.28,y:3.32,w:3.4,h:0.65,fontSize:14,lsm:1.4});
  box(s,P+cw+gap,1.82,cw,2.30,{fill:TINT});
  T(s,'43',{x:P+cw+gap,y:2.10,w:cw,h:1.05,fontSize:58,bold:true,color:GRAY2,align:'center'});
  T(s,'년이 지났습니다',{x:P+cw+gap,y:3.22,w:cw,h:0.4,fontSize:19,bold:true,color:INK2,align:'center'});
  box(s,P+2*(cw+gap),1.82,cw,2.30,{fill:RDL,line:RDB,lw:2});
  T(s,'2026',{x:P+2*(cw+gap)+0.28,y:1.98,w:3.4,h:0.85,fontSize:44,bold:true,color:RD});
  T(s,'그 경기장은 다시 짓고 있고,\n저희는 그대로였습니다',
    {x:P+2*(cw+gap)+0.28,y:2.90,w:3.4,h:0.8,fontSize:18,bold:true,color:INK,lsm:1.3});
  s.addShape(pptx.ShapeType.roundRect,{x:P,y:4.50,w:W,h:1.85,rectRadius:0.07,
    fill:{color:INK},line:{type:'none'}});
  s.addText([{text:'43년 전통의 회사가 아닙니다.\n',options:{color:WHITE}},
             {text:'회사도 오래되었고, 기계도 오래되었고, 사람도 오래되었습니다.',options:{color:RDB}}],
    {x:P+0.3,y:4.50,w:W-0.6,h:1.85,fontSize:25,bold:true,align:'center',valign:'middle',
     fontFace:F,lineSpacingMultiple:1.45});
}

// ════════════════════════════════════════════════════
// 5 · 지금 오성철강 (숫자)
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'1부 · 우리는 어떤 회사인가','bl');
  H(s,'지금 오성철강',{y:0.92,h:0.62});
  const d=[['12','전체 직원','',GRAY2],['5','외국인 직원','설명서는 전부 한국어',AM],
           ['40','공장장 경력(년)','정년이 눈앞',RD],['3','생산 라인','레벨링·슬리터1·2',GRAY2]];
  const cw=2.92, gap=0.22;
  d.forEach(([n,l,sub,c],i)=>{
    const x=P+i*(cw+gap);
    box(s,x,1.80,cw,2.35,{fill:TINT});
    T(s,n,{x,y:2.00,w:cw,h:1.05,fontSize:56,bold:true,color:i===0||i===3?INK:c,align:'center'});
    T(s,l,{x,y:3.15,w:cw,h:0.36,fontSize:18,bold:true,color:INK,align:'center'});
    if(sub) T(s,sub,{x,y:3.56,w:cw,h:0.32,fontSize:12,color:GRAY,align:'center'});
  });
  box(s,P,4.55,W,1.55,{fill:RDL,line:RDB,lw:2});
  T(s,[{text:'그동안 ',options:{}},{text:'고객이 요구하는 품질 수준은 계속 올라갔습니다.',options:{bold:true,color:INK}},
       {text:'\n',options:{}},{text:'저희는 따라가지 못했습니다.',options:{bold:true,color:RD}}],
    {x:P+0.35,y:4.55,w:W-0.7,h:1.55,fontSize:23,bold:true,valign:'middle',lsm:1.45});
}

// ════════════════════════════════════════════════════
// 6 · 1차 실패
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'2부 · 두 번의 실패','rd');
  H(s,[{text:'첫 번째 — ',options:{}},{text:'장비를 바꿨습니다',options:{color:RD}}],{y:0.92,h:0.62});
  const lw=5.85;
  const steps=[['우리의 생각','"생산성을 올리면 살아남는다"',WHITE,LINE,INK],
               ['결과 1','생산성은 실제로 올랐습니다',GRL,GRB,GR],
               ['결과 2','그런데 값은 오르지 않았습니다',RDL,RDB,RD]];
  steps.forEach(([lab,txt,fill,line,col],i)=>{
    const y=1.78+i*1.42;
    box(s,P,y,lw,1.08,{fill,line,lw:line===LINE?1.75:2});
    T(s,lab,{x:P+0.22,y:y+0.10,w:lw-0.4,h:0.26,fontSize:11.5,color:GRAY});
    T(s,txt,{x:P+0.22,y:y+0.38,w:lw-0.4,h:0.6,fontSize:19,bold:true,color:col});
    if(i<2) T(s,'↓',{x:P,y:y+1.08,w:lw,h:0.32,fontSize:19,color:GRAY2,align:'center'});
  });
  const rx=P+lw+0.32, rw=W-lw-0.32;
  box(s,rx,1.78,rw,3.94,{fill:TINT});
  pill(s,rx+0.25,1.96,'왜 그랬을까','a');
  // 세탁기 도해
  box(s,rx+0.35,2.55,1.85,1.45);
  s.addShape(pptx.ShapeType.ellipse,{x:rx+0.72,y:2.85,w:1.10,h:0.88,
    fill:{color:PPL},line:{color:PP,width:2}});
  s.addShape(pptx.ShapeType.ellipse,{x:rx+0.98,y:3.06,w:0.58,h:0.46,fill:{color:PPB},line:{type:'none'}});
  T(s,'비싼 세탁기',{x:rx+0.35,y:3.72,w:1.85,h:0.26,fontSize:11.5,bold:true,color:PP,align:'center'});
  T(s,'✕',{x:rx+2.28,y:3.05,w:0.5,h:0.4,fontSize:24,bold:true,color:RD,align:'center'});
  box(s,rx+2.85,2.55,rw-3.25,1.45,{fill:RDL,line:RDB,lw:2});
  T(s,'손님은 그 세탁기를\n볼 수 없습니다',
    {x:rx+2.95,y:2.70,w:rw-3.45,h:0.72,fontSize:15,bold:true,color:INK,align:'center',lsm:1.3});
  T(s,'그래서 세탁비를 못 올립니다',
    {x:rx+2.95,y:3.52,w:rw-3.45,h:0.3,fontSize:12.5,bold:true,color:RD,align:'center'});
  T(s,[{text:'고객 입장에서는 저희가 ',options:{}},
       {text:'어떤 기계를 쓰는지 볼 방법이 없었습니다.',options:{bold:true,color:INK}}],
    {x:rx+0.3,y:4.30,w:rw-0.6,h:1.0,fontSize:16,bold:true,lsm:1.4});
}

// ════════════════════════════════════════════════════
// 7 · 2차 실패
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'2부 · 두 번의 실패','rd');
  H(s,[{text:'두 번째 — ',options:{}},{text:'AI 품질측정을 만들었습니다',options:{color:RD}}],{y:0.92,h:0.62});
  const lw=4.30;
  box(s,P,1.78,lw,3.95,{fill:GRL,line:GRB,lw:2});
  pill(s,P+0.25,1.96,'기술은 성공','g');
  T(s,'코일센터 최초\nAI 기반 불량 측정',{x:P+0.25,y:2.42,w:lw-0.5,h:0.85,fontSize:20,bold:true,color:INK,lsm:1.25});
  T(s,'분당 250m로 지나가는 철판을\n사람 눈으로는 볼 수 없습니다.\n기계는 해냈습니다.',
    {x:P+0.25,y:3.35,w:lw-0.5,h:1.0,fontSize:14,lsm:1.45});
  box(s,P+0.25,4.50,lw-0.5,1.05);
  T(s,'대상',{x:P+0.25,y:4.60,w:lw-0.5,h:0.55,fontSize:30,bold:true,color:GR,align:'center'});
  T(s,'수상까지 했습니다',{x:P+0.25,y:5.22,w:lw-0.5,h:0.3,fontSize:12.5,color:GRAY,align:'center'});
  const rx=P+lw+0.30, rw=W-lw-0.30;
  pill(s,rx,1.80,'그런데 사업은 실패','r');
  const items=[['① 현장이 쓰지 않았습니다','결과를 보려면 다른 프로그램을 따로 켜야 했습니다. 작업자는 이미 여러 시스템에 같은 내용을 반복 입력하고 있었습니다.'],
               ['② 고객이 알지 못했습니다','전수 검사를 한다는 사실이 고객에게 전달될 통로가 없었습니다.']];
  items.forEach(([h,b],i)=>{
    const y=2.28+i*1.42;
    box(s,rx,y,rw,1.28,{fill:RDL,line:RDB,lw:2});
    T(s,h,{x:rx+0.22,y:y+0.13,w:rw-0.44,h:0.36,fontSize:18,bold:true,color:RD});
    T(s,b,{x:rx+0.22,y:y+0.52,w:rw-0.44,h:0.68,fontSize:13.5,lsm:1.35});
  });
  s.addShape(pptx.ShapeType.roundRect,{x:rx,y:5.12,w:rw,h:0.90,rectRadius:0.07,
    fill:{color:INK},line:{type:'none'}});
  T(s,'③ 그래서 매출은 그대로였습니다',
    {x:rx+0.22,y:5.12,w:rw-0.44,h:0.90,fontSize:21,bold:true,color:WHITE,valign:'middle'});
}

// ════════════════════════════════════════════════════
// 8 · 같은 착각
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'2부 · 두 번 다 같은 착각이었습니다','rd');
  rect(s,P+0.4,1.30,0.13,1.45,{fill:RD,line:null});
  T(s,'"좋은 것을 갖추면\n인정받는다"',
    {x:P+0.75,y:1.30,w:8.5,h:1.45,fontSize:34,bold:true,color:INK,lsm:1.3});
  const cw=5.0;
  box(s,P+0.9,3.05,cw,1.05);
  T(s,'1차',{x:P+1.15,y:3.15,w:cw-0.5,h:0.26,fontSize:11.5,color:GRAY});
  T(s,'좋은 장비',{x:P+1.15,y:3.42,w:cw-0.5,h:0.5,fontSize:21,bold:true,color:INK});
  box(s,P+0.9+cw+0.3,3.05,cw,1.05);
  T(s,'2차',{x:P+1.15+cw+0.3,y:3.15,w:cw-0.5,h:0.26,fontSize:11.5,color:GRAY});
  T(s,'좋은 검사 시스템',{x:P+1.15+cw+0.3,y:3.42,w:cw-0.5,h:0.5,fontSize:21,bold:true,color:INK});
  box(s,P+0.9,4.32,W-1.8,1.30,{fill:RDL,line:RDB,lw:2});
  T(s,[{text:'둘 다 훌륭했습니다. 그런데 둘 다\n',options:{color:INK}},
       {text:'아무도 볼 수 없는 곳에 있었습니다.',options:{color:RD}}],
    {x:P+1.1,y:4.32,w:W-2.2,h:1.30,fontSize:25,bold:true,align:'center',valign:'middle',lsm:1.4});
  T(s,[{text:'저희는 목표를 세운 게 아니라 ',options:{}},
       {text:'구매와 개발을 한 것',options:{bold:true,color:INK}},{text:'이었습니다.    ',options:{}},
       {text:'IT를 30년 한 저도 이것을 몰랐습니다.',options:{color:GRAY}}],
    {x:P,y:5.85,w:W,h:0.6,fontSize:16,bold:true,align:'center'});
}

// ════════════════════════════════════════════════════
// 9 · 남은 것
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'3부 · 전환점','am');
  H(s,[{text:'그런데 ',options:{}},{text:'실패가 남긴 것',options:{color:AM}},
       {text:'이 있었습니다',options:{}}],{y:0.92,h:0.62});
  const cw=3.92, gap=0.28;
  const d=[['1차가 남긴 것','생산성 높은 장비',null,'값은 못 올렸지만 생산 능력 자체는 확보했습니다. 지금도 돌고 있습니다.'],
           ['2차가 남긴 것','타사에 없는\n정밀 품질 측정 자료',null,'사업은 실패했지만 작동은 계속했습니다. 표면 전수 촬영, 결함 위치, 영상, 두께 — 매일, 모든 코일에.'],
           ['장비가 남긴 것','수백만 건의\n공정 데이터','187',null]];
  d.forEach(([lab,ttl,num,body],i)=>{
    const x=P+i*(cw+gap);
    box(s,x,1.78,cw,3.20,{fill:AML,line:AMB,lw:2});
    pill(s,x+0.22,1.94,lab,'a');
    T(s,ttl,{x:x+0.22,y:2.38,w:cw-0.44,h:0.85,fontSize:19,bold:true,color:INK,lsm:1.25});
    if(num){
      T(s,[{text:num,options:{fontSize:44,color:AM}},{text:' 만 건',options:{fontSize:19,color:INK}}],
        {x:x+0.22,y:3.28,w:cw-0.44,h:0.72,bold:true});
      T(s,'2초마다 한 줄씩\n설비 기록만 182만 줄',{x:x+0.22,y:4.06,w:cw-0.44,h:0.62,fontSize:12.5,color:GRAY,lsm:1.4});
    } else {
      T(s,body,{x:x+0.22,y:3.30,w:cw-0.44,h:1.45,fontSize:13.5,lsm:1.45});
    }
  });
  box(s,P,5.32,W,1.22,{fill:TINT});
  T(s,[{text:'저희는 팔 줄을 몰랐을 뿐, 가지고는 있었습니다.\n',options:{fontSize:23,color:GR}},
       {text:'— 그런데 아무도 보지 않았습니다. 그냥 쌓이고 있었습니다.',options:{fontSize:17,color:GRAY}}],
    {x:P,y:5.32,w:W,h:1.22,bold:true,align:'center',valign:'middle',lsm:1.4});
}

// ════════════════════════════════════════════════════
// 10 · AI 이전엔 왜 못했나
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'3부 · 전환점','am');
  H(s,[{text:'그런데 ',options:{}},{text:'AI 이전에는',options:{color:RD}},
       {text:' 이 데이터로 아무것도 할 수 없었습니다',options:{}}],{y:0.92,h:0.62});
  const cw=3.92, gap=0.28;
  const d=[['1','읽을 사람이 없었습니다','직원 12명 회사에 데이터 분석 인력이 있을 수 없습니다. 채용하려 해도 그 인력이 올 만한 회사가 아닙니다.',false],
           ['2','도구를 사려면 먼저\n무엇을 볼지 정해야 했습니다','견적은 수천만 원. 발주하려면 명세서에 써야 합니다. 그런데 무엇을 봐야 하는지 몰랐습니다.',false],
           ['3','가장 큰 이유 —\n무엇을 물어야 할지 몰랐습니다','데이터는 질문에만 답합니다.',true]];
  d.forEach(([n,ttl,body,hot],i)=>{
    const x=P+i*(cw+gap);
    box(s,x,1.78,cw,2.95,{fill:hot?RDL:WHITE,line:hot?RDB:LINE,lw:hot?2:1.75});
    T(s,n,{x:x+0.22,y:1.84,w:1.2,h:0.85,fontSize:46,bold:true,color:hot?RDB:LINE});
    T(s,ttl,{x:x+0.22,y:2.68,w:cw-0.44,h:0.85,fontSize:17,bold:true,color:hot?RD:INK,lsm:1.25});
    T(s,body,{x:x+0.22,y:3.56,w:cw-0.44,h:1.05,fontSize:13.5,lsm:1.45});
  });
  s.addShape(pptx.ShapeType.roundRect,{x:P,y:5.05,w:W,h:1.50,rectRadius:0.07,
    fill:{color:INK},line:{type:'none'}});
  s.addText([{text:'질문이 없으면 데이터는 ',options:{color:WHITE}},
             {text:'창고에 쌓인 재고',options:{color:YEL}},{text:'와 같습니다.\n',options:{color:WHITE}},
             {text:'자산으로 잡혀 있지만 아무것도 만들어내지 않습니다.',options:{color:'D0D5DD',fontSize:17}}],
    {x:P+0.3,y:5.05,w:W-0.6,h:1.50,fontSize:23,bold:true,align:'center',valign:'middle',
     fontFace:F,lineSpacingMultiple:1.5});
}

// ════════════════════════════════════════════════════
// 11 · AI가 나오자
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'3부 · 전환점','gr');
  H(s,[{text:'AI가 나오자 ',options:{}},{text:'세 가지가 동시에 풀렸습니다',options:{color:GR}}],{y:0.92,h:0.62});
  const cw=3.92, gap=0.28;
  // 1
  let x=P;
  box(s,x,1.78,cw,3.05,{fill:GRL,line:GRB,lw:2});
  T(s,'물어보면 됩니다',{x:x+0.22,y:1.94,w:cw-0.44,h:0.42,fontSize:20,bold:true,color:GR});
  T(s,'코일 60개, 2주치 기록을 훑는 일',{x:x+0.22,y:2.46,w:cw-0.44,h:0.4,fontSize:13.5});
  rect(s,x+0.22,3.42,cw-0.44,0.025,{fill:GRB,line:null});
  T(s,'사람',{x:x+0.22,y:3.00,w:1.5,h:0.36,fontSize:13,color:GRAY});
  T(s,'며칠',{x:x+cw-1.8,y:2.92,w:1.55,h:0.46,fontSize:22,bold:true,color:INK,align:'right'});
  T(s,'AI',{x:x+0.22,y:3.58,w:1.5,h:0.36,fontSize:13,color:GRAY});
  T(s,'한 번',{x:x+cw-1.8,y:3.50,w:1.55,h:0.46,fontSize:22,bold:true,color:GR,align:'right'});
  // 2
  x=P+cw+gap;
  box(s,x,1.78,cw,3.05,{fill:GRL,line:GRB,lw:2});
  T(s,'틀린 질문을 해도\n비용이 안 듭니다',{x:x+0.22,y:1.94,w:cw-0.44,h:0.8,fontSize:20,bold:true,color:GR,lsm:1.25});
  T(s,[{text:'이게 결정적이었습니다.',options:{bold:true,color:INK}},
       {text:'\n예전엔 질문 하나 확인하려면 발주서를 써야 했습니다.',options:{}}],
    {x:x+0.22,y:2.82,w:cw-0.44,h:0.8,fontSize:13.5,lsm:1.4});
  box(s,x+0.22,3.66,cw-0.44,1.02);
  T(s,[{text:'틀려도 되니까 많이 물었고,\n많이 물으니까 ',options:{color:INK}},
       {text:'발견',options:{color:GR}},{text:'이 나왔습니다.',options:{color:INK}}],
    {x:x+0.34,y:3.66,w:cw-0.68,h:1.02,fontSize:14.5,bold:true,valign:'middle',lsm:1.35});
  // 3
  x=P+2*(cw+gap);
  box(s,x,1.78,cw,3.05,{fill:GRL,line:GRB,lw:2});
  T(s,'화면을 만드는 것까지\n직접 할 수 있게 됐습니다',{x:x+0.22,y:1.94,w:cw-0.44,h:0.8,fontSize:19,bold:true,color:GR,lsm:1.25});
  T(s,'41',{x,y:2.80,w:cw,h:1.0,fontSize:56,bold:true,color:GR,align:'center'});
  T(s,'개 서비스',{x,y:3.84,w:cw,h:0.34,fontSize:17,bold:true,color:INK,align:'center'});
  T(s,'30개가 실데이터로 돌아감',{x,y:4.20,w:cw,h:0.3,fontSize:12.5,color:GRAY,align:'center'});
  T(s,'처음 만든 것은 조잡했습니다. 그래도 하나씩 만들었습니다.',
    {x:x+0.22,y:4.50,w:cw-0.44,h:0.3,fontSize:11.5,color:GRAY2});
  box(s,P,5.10,W,1.30,{fill:AML,line:AMB,lw:2});
  T(s,[{text:'두 번의 실패는 ',options:{color:INK}},{text:'자산을 쌓아두는 일',options:{color:INK}},
       {text:'이었고, 그것을 쓸 도구가 ',options:{color:INK}},{text:'뒤늦게 도착',options:{color:INK}},
       {text:'한 것이었습니다.\n',options:{color:INK}},
       {text:'실패가 헛되지 않았던 이유는 잘했기 때문이 아닙니다. 버티고 있었기 때문입니다.',
        options:{color:AM,fontSize:17}}],
    {x:P+0.3,y:5.10,w:W-0.6,h:1.30,fontSize:19,bold:true,align:'center',valign:'middle',lsm:1.45});
}

// ════════════════════════════════════════════════════
// 12 · 두 질문
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'4부 · 그래서 질문을 다시 바꿨습니다');
  T(s,'"무엇을 도입하면 경쟁력이 생길까"  —  두 번 다 틀렸습니다',
    {x:P,y:1.25,w:W,h:0.5,fontSize:19,bold:true,color:GRAY,align:'center',strike:true});
  const cw=5.85, gap=0.50;
  const d=[['①','우리는\n무엇을 모르는가','안','품질이 완벽해집니다'],
           ['②','우리 고객들은\n무엇을 원하는가','밖','값을 받을 수 있습니다']];
  d.forEach(([n,q,side,eff],i)=>{
    const x=P+i*(cw+gap);
    box(s,x,2.05,cw,3.55,{fill:PPL,line:PPB,lw:2.5});
    T(s,n,{x:x+0.35,y:2.22,w:1.2,h:0.85,fontSize:40,bold:true,color:PP});
    T(s,q,{x:x+0.35,y:3.10,w:cw-0.7,h:1.15,fontSize:29,bold:true,color:INK,lsm:1.3});
    T(s,[{text:side,options:{bold:true,color:INK}},{text:'을 보는 질문\n→ ',options:{}},
         {text:eff,options:{}}],
      {x:x+0.35,y:4.40,w:cw-0.7,h:0.9,fontSize:17,bold:true,lsm:1.4});
  });
}

// ════════════════════════════════════════════════════
// 13 · 한쪽만 하면
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'4부 · 두 질문');
  H(s,[{text:'한쪽만으로는 안 됩니다 — ',options:{}},
       {text:'그게 두 번의 실패였습니다',options:{color:RD}}],{y:0.92,h:0.62});
  const cw=3.60;
  [[P,'① 만 하면','품질은 좋아지는데\n아무도 모릅니다','= 첫 번째 실패'],
   [P+W-cw,'② 만 하면','팔 것은 있는데\n근거가 없습니다','= 두 번째 실패']].forEach(([x,t1,t2,t3])=>{
    box(s,x,1.80,cw,0.95,{fill:PPL,line:PPB,lw:2});
    T(s,t1,{x,y:1.80,w:cw,h:0.95,fontSize:22,bold:true,color:PP,align:'center',valign:'middle'});
    arrow(s,x+cw/2,2.82,x+cw/2,3.18);
    box(s,x,3.24,cw,0.98,{fill:TINT});
    T(s,t2,{x,y:3.24,w:cw,h:0.98,fontSize:17,bold:true,color:INK,align:'center',valign:'middle',lsm:1.3});
    box(s,x,4.34,cw,0.72,{fill:RDL,line:RDB,lw:2});
    T(s,t3,{x,y:4.34,w:cw,h:0.72,fontSize:19,bold:true,color:RD,align:'center',valign:'middle'});
  });
  const mx=P+cw+0.42, mw=W-2*cw-0.84;
  box(s,mx,2.62,mw,1.70,{fill:GRL,line:GR,lw:2.5});
  T(s,'①과 ②를\n동시에 물어야 했습니다',
    {x:mx+0.2,y:2.62,w:mw-0.4,h:1.70,fontSize:21,bold:true,color:GR,align:'center',valign:'middle',lsm:1.35});
  darkBar(s,5.45,[{text:'이걸 아는 데 ',options:{}},{text:'두 번',options:{color:YEL}},
                  {text:'이 걸렸습니다.',options:{}}],0.95);
}

// ════════════════════════════════════════════════════
// 14 · 몰랐던 것 4가지
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'5부 · 질문 ① 우리는 무엇을 모르는가');
  H(s,[{text:'큰 시스템을 만들지 않았습니다\n',options:{}},
       {text:'작업자가 답하지 못하는 질문을 하나씩 없앴습니다',options:{color:PP}}],{y:0.90,h:1.15,size:26});
  const cw=5.95, gap=0.35;
  const d=[['①','"지금 잘 돌아가고 있나?"','소리와 감으로 판단 · 공장장 머릿속에만 있었다',false],
           ['②','"아까 그 불량, 그때 어떻게 돌렸더라?"','기억에 의존 · 그래서 같은 불량이 또 났다',false],
           ['③','"이건 우리 잘못인가, 원래 그랬나?"','숫자만으로는 표면 흠집을 가릴 수 없었다',false],
           ['④','"우리 데이터는 믿을 만한가?"','가장 중요한 질문이었고, 답은 "아니오"였다',true]];
  d.forEach(([n,q,sub,hot],i)=>{
    const x=P+(i%2)*(cw+gap), y=2.28+Math.floor(i/2)*1.62;
    box(s,x,y,cw,1.40,{fill:hot?RDL:WHITE,line:hot?RDB:LINE,lw:hot?2:1.75});
    T(s,n,{x:x+0.22,y:y+0.28,w:0.85,h:0.8,fontSize:38,bold:true,color:hot?RD:PP});
    T(s,q,{x:x+1.12,y:y+0.22,w:cw-1.35,h:0.62,fontSize:18,bold:true,color:hot?RD:INK,lsm:1.2});
    T(s,sub,{x:x+1.12,y:y+0.88,w:cw-1.35,h:0.38,fontSize:12.5,color:GRAY});
  });
}

// ════════════════════════════════════════════════════
// 15 · UI ① AI 헬퍼 모바일
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'5부 · 몰랐던 것 ①');
  H(s,[{text:'지금 이 순간을 ',options:{}},{text:'큰 숫자로',options:{color:PP}},
       {text:' 보게 했습니다',options:{}}],{y:0.92,h:0.62});
  // 폰 목업
  const px=P, py=1.78, pw=2.75, ph=4.55;
  s.addShape(pptx.ShapeType.roundRect,{x:px,y:py,w:pw,h:ph,rectRadius:0.14,
    fill:{color:NAVY},line:{type:'none'}});
  rect(s,px+0.14,py+0.50,pw-0.28,ph-0.64,{fill:WHITE,line:null});
  T(s,'AI 헬퍼 · 슬리터2',{x:px+0.18,y:py+0.14,w:1.9,h:0.3,fontSize:11,bold:true,color:WHITE});
  T(s,'11:42',{x:px+pw-0.85,y:py+0.14,w:0.65,h:0.3,fontSize:11,bold:true,color:WHITE,align:'right'});
  T(s,'코일 162205708302',{x:px+0.28,y:py+0.60,w:2.2,h:0.3,fontSize:13,bold:true,color:INK});
  box(s,px+0.28,py+0.96,pw-0.56,1.05,{fill:GRL,line:GRB,lw:1.5});
  T(s,'현재 속도',{x:px+0.40,y:py+1.04,w:1.6,h:0.24,fontSize:9.5,bold:true,color:GR});
  T(s,[{text:'82',options:{fontSize:30}},{text:' mpm',options:{fontSize:12}}],
    {x:px+0.40,y:py+1.26,w:2.0,h:0.48,bold:true,color:GR});
  T(s,'권장 78~85 · 적정',{x:px+0.40,y:py+1.74,w:1.9,h:0.24,fontSize:9.5,bold:true,color:INK2});
  const tw=(pw-0.56-0.16)/3;
  [['텐션1','2.4',false],['텐션2','2.3',false],['텐션3','1.8',true]].forEach(([l,v,hot],i)=>{
    const x=px+0.28+i*(tw+0.08);
    box(s,x,py+2.10,tw,0.66,{fill:hot?AML:WHITE,line:hot?AMB:LINE,lw:1.4});
    T(s,l,{x,y:py+2.16,w:tw,h:0.22,fontSize:8.5,color:hot?AM:GRAY,align:'center',bold:true});
    T(s,v,{x,y:py+2.36,w:tw,h:0.34,fontSize:16,bold:true,color:hot?AM:INK,align:'center'});
  });
  T(s,'진행  995 / 1,989 m',{x:px+0.28,y:py+2.86,w:2.1,h:0.26,fontSize:9.5,color:GRAY,bold:true});
  bar(s,px+0.28,py+3.14,pw-0.56,50,PP,0.14);
  // 설명
  const rx=px+pw+0.40, rw=W-pw-0.40;
  box(s,rx,1.78,rw,2.05,{fill:RDL,line:RDB,lw:2});
  pill(s,rx+0.25,1.94,'예전','r');
  T(s,[{text:'작업자가 ',options:{}},{text:'기계 소리와 손끝 감각',options:{bold:true,color:INK}},
       {text:'으로 판단했습니다. 40년 경력 공장장님은 아셨습니다. 그런데 그 감각은 ',options:{}},
       {text:'어디에도 적혀 있지 않았습니다.\n',options:{bold:true,color:INK}},
       {text:'퇴직하시면 같이 사라지는 것이었습니다.',options:{bold:true,color:RD}}],
    {x:rx+0.25,y:2.36,w:rw-0.5,h:1.35,fontSize:16,lsm:1.45});
  box(s,rx,4.00,rw,2.28,{fill:GRL,line:GRB,lw:2});
  pill(s,rx+0.25,4.16,'지금','g');
  T(s,[{text:'태블릿과 휴대폰에 ',options:{}},{text:'지금 이 순간의 속도와 힘',options:{bold:true,color:INK}},
       {text:'이 큰 숫자로 뜹니다.\n공장장님이 암산하던 설정값은 화면이 알려줍니다.',options:{}}],
    {x:rx+0.25,y:4.58,w:rw-0.5,h:1.05,fontSize:16,lsm:1.45});
  let bx=rx+0.25;
  ['글자 크게','한국어판','영어판'].forEach(t=>{ bx += pill(s,bx,5.72,t,'n')+0.14; });
}

// ════════════════════════════════════════════════════
// 16 · UI ② 슬리터2 모니터
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'5부 · 몰랐던 것 ②');
  H(s,[{text:'문제가 생긴 ',options:{}},{text:'그 시점으로 되감아',options:{color:PP}},
       {text:' 볼 수 있게 했습니다',options:{}}],{y:0.92,h:0.62});
  const px=P, py=1.78, pw=2.75, ph=4.70;
  s.addShape(pptx.ShapeType.roundRect,{x:px,y:py,w:pw,h:ph,rectRadius:0.14,
    fill:{color:NAVY},line:{type:'none'}});
  rect(s,px+0.14,py+0.50,pw-0.28,ph-0.64,{fill:WHITE,line:null});
  T(s,'슬리터2 운행 정보',{x:px+0.18,y:py+0.14,w:2.0,h:0.3,fontSize:11,bold:true,color:WHITE});
  T(s,'◀ ▶',{x:px+pw-0.75,y:py+0.14,w:0.55,h:0.3,fontSize:11,bold:true,color:WHITE,align:'right'});
  T(s,'2026-09-03 · 코일 1622057',{x:px+0.28,y:py+0.60,w:2.2,h:0.28,fontSize:11.5,bold:true,color:INK});
  T(s,'길이 위치를 움직여 보세요',{x:px+0.28,y:py+0.86,w:2.2,h:0.24,fontSize:9,color:GRAY});
  bar(s,px+0.28,py+1.14,pw-0.56,62,PP,0.12);
  s.addShape(pptx.ShapeType.ellipse,{x:px+0.28+(pw-0.56)*0.60,y:py+1.02,w:0.30,h:0.30,
    fill:{color:PP},line:{color:WHITE,width:2}});
  T(s,[{text:'1,240',options:{fontSize:24}},{text:' m 지점',options:{fontSize:11,color:GRAY}}],
    {x:px+0.28,y:py+1.44,w:pw-0.56,h:0.42,bold:true,color:INK,align:'center'});
  const kv=[['속도','79 mpm'],['텐션 1~4','2.4 / 2.3 / 0.0 / 2.5'],['가동 상태','RUN'],['시각','09:21:14']];
  kv.forEach(([k,v],i)=>{
    const y=py+1.94+i*0.38;
    T(s,k,{x:px+0.28,y,w:1.0,h:0.3,fontSize:10,color:GRAY2});
    T(s,v,{x:px+1.20,y,w:pw-1.48,h:0.3,fontSize:10.5,bold:true,
           color:v==='RUN'?GR:INK,align:'right'});
    rect(s,px+0.28,y+0.32,pw-0.56,0.014,{fill:LINE,line:null});
  });
  box(s,px+0.28,py+3.54,pw-0.56,0.52,{fill:RDL,line:RDB,lw:1.5});
  T(s,'텐션3 이상 — 작업 내내 0',{x:px+0.28,y:py+3.54,w:pw-0.56,h:0.52,fontSize:10,bold:true,
    color:RD,align:'center',valign:'middle'});
  const rx=px+pw+0.40, rw=W-pw-0.40;
  box(s,rx,1.78,rw,1.85,{fill:RDL,line:RDB,lw:2});
  pill(s,rx+0.25,1.94,'예전','r');
  T(s,[{text:'불량이 나와도 ',options:{}},
       {text:'그 순간 기계가 어떤 상태였는지 아무도 답하지 못했습니다.',options:{bold:true,color:INK}},
       {text:' 기억은 사람마다 달랐습니다. ',options:{}},
       {text:'그래서 같은 불량이 또 났습니다.',options:{bold:true,color:RD}}],
    {x:rx+0.25,y:2.36,w:rw-0.5,h:1.15,fontSize:16,lsm:1.45});
  box(s,rx,3.80,rw,2.48,{fill:GRL,line:GRB,lw:2});
  pill(s,rx+0.25,3.96,'지금','g');
  const bullets=[['두루마리 번호 + 위치를 넣으면 ','그 지점의 속도·힘이 그대로'],
                 ['막대를 움직이면 ','전 구간을 되감아 봄'],
                 ['거래처 이름만 넣으면 ','3개 라인 전체에서 찾아 바로 답변']];
  bullets.forEach(([a,b],i)=>{
    const y=4.44+i*0.58;
    s.addShape(pptx.ShapeType.roundRect,{x:rx+0.28,y:y+0.11,w:0.13,h:0.13,rectRadius:0.03,
      fill:{color:GR},line:{type:'none'}});
    T(s,[{text:a,options:{}},{text:b,options:{bold:true,color:INK}}],
      {x:rx+0.58,y,w:rw-0.9,h:0.5,fontSize:16});
  });
}

// ════════════════════════════════════════════════════
// 17 · 카메라 OCR
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'5부 · 여기서 벽에 부딪혔습니다','am');
  H(s,[{text:'장비를 바꾸지 않고 데이터를 얻었습니다 — ',options:{}},
       {text:'휴대폰 한 대로',options:{color:AM}}],{y:0.92,h:0.62});
  // 오래된 장비
  box(s,P,1.85,2.75,2.55,{fill:TINT});
  T(s,'30년 된 장비',{x:P,y:1.98,w:2.75,h:0.3,fontSize:14,bold:true,color:GRAY,align:'center'});
  rect(s,P+0.45,2.40,1.85,0.90,{fill:NAVY,line:null});
  T(s,'2.43',{x:P+0.45,y:2.55,w:1.85,h:0.45,fontSize:22,bold:true,color:'12B76A',align:'center'});
  T(s,'PR-DTC-3100',{x:P+0.45,y:3.00,w:1.85,h:0.26,fontSize:9.5,bold:true,color:GRAY2,align:'center'});
  T(s,'데이터 단자가 없음',{x:P,y:3.80,w:2.75,h:0.32,fontSize:14,bold:true,color:RD,align:'center'});
  // 방법1
  box(s,P+3.00,1.85,2.85,1.15,{fill:RDL,line:RDB,lw:2});
  T(s,'방법 1 · 장비 교체',{x:P+3.00,y:1.96,w:2.85,h:0.3,fontSize:13.5,bold:true,color:RD,align:'center'});
  T(s,'수천만 원',{x:P+3.00,y:2.26,w:2.85,h:0.46,fontSize:24,bold:true,color:INK,align:'center'});
  T(s,'✕ 포기',{x:P+3.00,y:2.70,w:2.85,h:0.26,fontSize:12,bold:true,color:RD,align:'center'});
  // 방법2
  box(s,P+3.00,3.20,2.85,1.35,{fill:GRL,line:GR,lw:2.5});
  T(s,'방법 2 · 카메라 + AI',{x:P+3.00,y:3.30,w:2.85,h:0.3,fontSize:13.5,bold:true,color:GR,align:'center'});
  s.addShape(pptx.ShapeType.roundRect,{x:P+3.55,y:3.66,w:0.62,h:0.72,rectRadius:0.08,
    fill:{color:NAVY},line:{type:'none'}});
  s.addShape(pptx.ShapeType.ellipse,{x:P+3.74,y:3.80,w:0.26,h:0.26,fill:{color:PP},line:{type:'none'}});
  T(s,'휴대폰 1대',{x:P+4.32,y:3.86,w:1.45,h:0.4,fontSize:15,bold:true,color:INK});
  arrow(s,P+6.05,3.85,P+6.60,3.85,GR,2.5);
  T(s,'AI가 화면의\n숫자를 읽음',{x:P+5.85,y:3.15,w:1.0,h:0.6,fontSize:10.5,bold:true,color:GR,align:'center',lsm:1.3});
  // 결과
  box(s,P+6.70,1.85,W-6.70,2.70,{fill:PPL,line:PPB,lw:2});
  T(s,'1분마다 6개 값이 자동 기록',{x:P+6.95,y:2.05,w:W-7.2,h:0.4,fontSize:17,bold:true,color:PP});
  T(s,'출력% · 전압 · 두께\n시작경 · 장력설정 · 장력율',
    {x:P+6.95,y:2.60,w:W-7.2,h:0.9,fontSize:16,bold:true,color:INK,lsm:1.5});
  T(s,'→ 데이터베이스에 계속 쌓임',{x:P+6.95,y:3.72,w:W-7.2,h:0.34,fontSize:14,bold:true,color:GRAY});
  box(s,P,4.80,W,1.28,{fill:GRL,line:GRB,lw:2});
  T(s,[{text:'오래된 기계라고 데이터를 못 얻는 게 아니었습니다.  ',options:{color:INK}},
       {text:'방법을 몰랐던 것입니다.',options:{color:GR}}],
    {x:P+0.3,y:4.80,w:W-0.6,h:1.28,fontSize:21,bold:true,align:'center',valign:'middle'});
}

// ════════════════════════════════════════════════════
// 18 · 데이터를 의심했다
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'5부 · 몰랐던 것 ④ — 가장 중요한 질문','rd');
  H(s,[{text:'저희는 숫자를 ',options:{}},{text:'믿지 않고, 확인합니다',options:{color:RD}}],{y:0.92,h:0.62});
  const cw=3.92, gap=0.28;
  // 1
  let x=P;
  box(s,x,1.78,cw,3.15,{fill:RDL,line:RDB,lw:2});
  pill(s,x+0.22,1.94,'우리 설비','r');
  T(s,'고장 난 센서를 찾아냈습니다',{x:x+0.22,y:2.36,w:cw-0.44,h:0.4,fontSize:17,bold:true,color:INK});
  T(s,[{text:'3/4',options:{fontSize:36,color:RD}},{text:'  센서가 작업 내내 0',options:{fontSize:13,color:GRAY}}],
    {x:x+0.22,y:2.82,w:cw-0.44,h:0.6,bold:true});
  T(s,[{text:'코일 60개·2주치를 한 번에 훑어 ',options:{}},{text:'5건',options:{bold:true,color:INK}},
       {text:' 발견. 가공 문제가 아니라 ',options:{}},{text:'배선이 끊어져 있던 것.\n',options:{bold:true,color:INK}},
       {text:'사람 눈으로는 평생 못 찾을 문제입니다.',options:{bold:true,color:RD}}],
    {x:x+0.22,y:3.48,w:cw-0.44,h:1.35,fontSize:13.5,lsm:1.45});
  // 2
  x=P+cw+gap;
  box(s,x,1.78,cw,3.15,{fill:RDL,line:RDB,lw:2});
  pill(s,x+0.22,1.94,'납품받은 시스템','r');
  T(s,'외부 검사 시스템을 뜯어봤습니다',{x:x+0.22,y:2.36,w:cw-0.44,h:0.4,fontSize:17,bold:true,color:INK});
  [['표본 20건 중 문제','30%',INK],['시험용 가짜 데이터','다수',RD],['두께 측정값 (표본 5건)','0건',RD]]
    .forEach(([k,v,c],i)=>{
      const y=2.82+i*0.48;
      T(s,k,{x:x+0.22,y,w:2.3,h:0.34,fontSize:12.5,color:GRAY});
      T(s,v,{x:x+cw-1.55,y:y-0.06,w:1.3,h:0.42,fontSize:20,bold:true,color:c,align:'right'});
      if(i<2) rect(s,x+0.22,y+0.38,cw-0.44,0.018,{fill:RDB,line:null});
    });
  T(s,'아예 돌고 있지 않았습니다.',{x:x+0.22,y:4.36,w:cw-0.44,h:0.4,fontSize:15,bold:true,color:INK});
  // 3
  x=P+2*(cw+gap);
  box(s,x,1.78,cw,3.15);
  pill(s,x+0.22,1.94,'우리가 만든 것','n');
  T(s,'저희 것도 의심했습니다',{x:x+0.22,y:2.36,w:cw-0.44,h:0.4,fontSize:17,bold:true,color:INK});
  T(s,[{text:'9',options:{fontSize:40,color:INK}},{text:'  시간씩 어긋남',options:{fontSize:14,color:GRAY}}],
    {x:x+0.22,y:2.90,w:cw-0.44,h:0.72,bold:true,align:'center'});
  T(s,[{text:'시각이 밀려 기록되던 오류를 ',options:{}},
       {text:'찾아 전부 고쳤습니다.',options:{bold:true,color:INK}}],
    {x:x+0.22,y:3.80,w:cw-0.44,h:0.85,fontSize:14,lsm:1.45});
  darkBar(s,5.12,[{text:'187만 건이 있어도, ',options:{}},
                  {text:'검증하지 않은 데이터는 자산이 아니라 위험입니다.',options:{color:YEL}}],1.20);
}

// ════════════════════════════════════════════════════
// 19 · 얻은 것 1 완벽한 품질
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'5부 · 첫 번째 질문이 남긴 것','gr');
  H(s,[{text:'얻은 것 1 — ',options:{}},{text:'완벽한 품질',options:{color:GR}}],{y:0.92,h:0.62});
  const cw=2.92, gap=0.22;
  const d=[['공정이 표준화됐습니다','감으로 하던 작업이 숫자가 되니 누가 작업하든 같은 기준이 됩니다. 경력 40년이든 입사 한 달이든 같은 화면, 같은 값.'],
           ['설정 불량이 거의 사라졌습니다','설정값 계산 도구를 만든 뒤, 기계 설정을 잘못해서 나던 불량은 사실상 없어졌습니다.'],
           ['전수 검증 체계','표면은 전부 촬영, 운전 조건은 2초마다 기록, 이상은 자동 필터. 샘플로 보지 않습니다. 전부 봅니다.'],
           ['데이터 자체를 검증','센서가 죽었는지, 측정이 돌고 있는지, 기록이 밀렸는지를 의심하고 확인합니다.']];
  d.forEach(([t,b],i)=>{
    const x=P+i*(cw+gap);
    box(s,x,1.80,cw,2.95,{fill:GRL,line:GRB,lw:2});
    T(s,t,{x:x+0.22,y:1.98,w:cw-0.44,h:0.75,fontSize:17,bold:true,color:GR,lsm:1.2});
    T(s,b,{x:x+0.22,y:2.82,w:cw-0.44,h:1.75,fontSize:13.5,lsm:1.45});
  });
  box(s,P,5.10,W,1.35,{fill:PPL,line:PPB,lw:2});
  T(s,[{text:'좋은 장비에 걸맞는 ',options:{color:INK}},{text:'품질 기술',options:{color:PP}},
       {text:'을, 이제 갖췄습니다.\n',options:{color:INK}},
       {text:'1차에서 장비를 샀고, 3차에 그 장비를 제대로 쓰는 기술을 얻었습니다.',
        options:{color:GRAY,fontSize:16}}],
    {x:P+0.3,y:5.10,w:W-0.6,h:1.35,fontSize:23,bold:true,align:'center',valign:'middle',lsm:1.45});
}

// ════════════════════════════════════════════════════
// 20 · 얻은 것 2 기술 내재화
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'5부 · 첫 번째 질문이 남긴 것','gr');
  H(s,[{text:'얻은 것 2 — ',options:{}},{text:'기술 내재화',options:{color:GR}},
       {text:' (이게 더 중요할지도 모릅니다)',options:{fontSize:22}}],{y:0.92,h:0.62});
  const lw=7.55;
  const nw=(lw-0.44)/3;
  [['41','직접 만든 서비스'],['0','외주 개발'],['며칠','현장 요구 반영 기간']].forEach(([n,l],i)=>{
    const x=P+i*(nw+0.22);
    box(s,x,1.78,nw,1.30,{fill:GRL,line:GRB,lw:2});
    T(s,n,{x,y:1.88,w:nw,h:0.70,fontSize:36,bold:true,color:GR,align:'center'});
    T(s,l,{x,y:2.60,w:nw,h:0.32,fontSize:12,color:GRAY,align:'center'});
  });
  box(s,P,3.22,lw,3.06,{fill:AML,line:AMB,lw:2});
  pill(s,P+0.25,3.40,'예상하지 못한 일','a');
  T(s,'외국인 직원들이 장비를 고치기 시작했습니다',
    {x:P+0.25,y:3.82,w:lw-0.5,h:0.42,fontSize:19,bold:true,color:INK});
  T(s,[{text:'직원 12명 중 5명이 외국에서 오신 분들. 그런데 설명서도 작업 기준도 ',options:{}},
       {text:'전부 한국어',options:{bold:true,color:INK}},{text:'였습니다 — 개선 제안이 나올 수 없는 구조.\n\n',options:{}},
       {text:'도구를 ',options:{}},{text:'한국어·영어 두 벌',options:{bold:true,color:INK}},
       {text:'로 만들자, AI의 도움으로 언어의 벽을 넘어 기계 기록을 직접 읽기 시작했습니다.',options:{}}],
    {x:P+0.25,y:4.32,w:lw-0.5,h:1.80,fontSize:15,lsm:1.5});
  // 도면
  const rx=P+lw+0.32, rw=W-lw-0.32;
  box(s,rx,1.78,rw,4.50);
  pill(s,rx+0.22,1.94,'지금 저희에게 있는 것','p');
  T(s,'장비 개조 도면',{x:rx+0.22,y:2.36,w:rw-0.44,h:0.38,fontSize:18,bold:true,color:INK});
  // 도면 그림
  rect(s,rx+0.30,2.82,rw-0.60,1.55,{fill:TINT,line:GRAY2,lw:1.2});
  rect(s,rx+0.95,3.38,2.15,0.44,{fill:WHITE,line:INK,lw:2});
  s.addShape(pptx.ShapeType.ellipse,{x:rx+0.72,y:3.38,w:0.46,h:0.44,fill:{type:'none'},line:{color:INK,width:2}});
  s.addShape(pptx.ShapeType.ellipse,{x:rx+2.88,y:3.38,w:0.46,h:0.44,fill:{type:'none'},line:{color:INK,width:2}});
  rect(s,rx+0.95,4.02,2.15,0.014,{fill:PP,line:null});
  T(s,'1,320 mm',{x:rx+0.95,y:4.06,w:2.15,h:0.26,fontSize:10,bold:true,color:PP,align:'center'});
  T(s,'Ø40',{x:rx+0.32,y:2.92,w:0.7,h:0.24,fontSize:10,bold:true,color:PP,align:'center'});
  T(s,'축 Ø20',{x:rx+2.60,y:2.92,w:0.9,h:0.24,fontSize:9.5,bold:true,color:GRAY,align:'center'});
  T(s,'롤러 지름 40 · 길이 1,320 · 축 20 · 베어링 규격까지',
    {x:rx+0.30,y:4.44,w:rw-0.6,h:0.3,fontSize:11,color:GRAY});
  box(s,rx+0.30,4.86,rw-0.60,1.22,{fill:GRL,line:GRB,lw:2});
  T(s,[{text:'이 도면을 그린 사람은\n엔지니어가 아니라 ',options:{color:INK}},
       {text:'저희 현장 직원입니다.',options:{color:GR}}],
    {x:rx+0.42,y:4.86,w:rw-0.84,h:1.22,fontSize:16,bold:true,valign:'middle',lsm:1.4});
}

// ════════════════════════════════════════════════════
// 21 · 현장이 먼저
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'5부 · 가장 큰 변화','gr');
  H(s,[{text:'현장에서 ',options:{}},{text:'먼저 요구가 올라왔습니다',options:{color:GR}}],{y:0.92,h:0.62});
  const cw=5.60;
  // 1·2차
  box(s,P,1.80,cw,2.95,{fill:RDL,line:RDB,lw:2});
  T(s,'1차 · 2차',{x:P,y:1.94,w:cw,h:0.4,fontSize:21,bold:true,color:RD,align:'center'});
  box(s,P+1.30,2.44,3.0,0.62);
  T(s,'경영진 / 외부 업체',{x:P+1.30,y:2.44,w:3.0,h:0.62,fontSize:15,bold:true,color:INK,align:'center',valign:'middle'});
  arrow(s,P+cw/2,3.12,P+cw/2,3.58,RD,2.5);
  box(s,P+1.30,3.64,3.0,0.62);
  T(s,'현장',{x:P+1.30,y:3.64,w:3.0,h:0.62,fontSize:15,bold:true,color:INK,align:'center',valign:'middle'});
  T(s,'✕',{x:P+4.45,y:3.72,w:0.5,h:0.45,fontSize:22,bold:true,color:RD});
  T(s,'위에서 내려준 것 → 안 썼습니다',{x:P,y:4.36,w:cw,h:0.32,fontSize:13.5,bold:true,color:RD,align:'center'});
  // 3차
  const x2=P+W-cw;
  box(s,x2,1.80,cw,2.95,{fill:GRL,line:GR,lw:2.5});
  T(s,'3차',{x:x2,y:1.94,w:cw,h:0.4,fontSize:21,bold:true,color:GR,align:'center'});
  box(s,x2+1.30,2.44,3.0,0.62);
  T(s,'경영진',{x:x2+1.30,y:2.44,w:3.0,h:0.62,fontSize:15,bold:true,color:INK,align:'center',valign:'middle'});
  arrow(s,x2+cw/2,3.58,x2+cw/2,3.12,GR,2.5);
  box(s,x2+1.30,3.64,3.0,0.62);
  T(s,'현장',{x:x2+1.30,y:3.64,w:3.0,h:0.62,fontSize:15,bold:true,color:INK,align:'center',valign:'middle'});
  T(s,'현장이 달라고 한 것 → 씁니다',{x:x2,y:4.36,w:cw,h:0.32,fontSize:13.5,bold:true,color:GR,align:'center'});
  box(s,P,5.05,W,1.35,{fill:GRL,line:GRB,lw:2});
  T(s,[{text:'시키지도 않았는데 직원들끼리 ',options:{}},{text:'품질 개선 회의',options:{bold:true,color:INK}},
       {text:'를 열었습니다. 그리고 ',options:{}},
       {text:'"설정값을 계산해주는 도구를 만들어달라"',options:{bold:true,color:INK}},
       {text:'는 요구가 ',options:{}},{text:'아래에서 올라왔습니다.',options:{bold:true,color:GR}}],
    {x:P+0.3,y:5.05,w:W-0.6,h:1.35,fontSize:18,valign:'middle',lsm:1.45});
}

// ════════════════════════════════════════════════════
// 22 · 41개 서비스 맵
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'AI를 얼마나 다양하게 쓰는가','pp');
  H(s,[{text:'41개',options:{color:PP}},{text:'를 직접 만들었고, ',options:{}},
       {text:'30개',options:{color:GR}},{text:'가 실데이터로 돌아갑니다',options:{}}],{y:0.92,h:0.62});
  // 큰 카드 (생산현장)
  box(s,P,1.78,5.95,3.85);
  pill(s,P+0.22,1.94,'생산현장 도구','p');
  T(s,'21',{x:P+0.22,y:2.34,w:1.5,h:0.65,fontSize:38,bold:true,color:PP});
  T(s,'세퍼레이터 키오스크 · 작업현황 대시보드 1/2/3 · 코일 상세분석 · 레벨링 공정×ERP · 행정 모니터링 · 라인 통합관제(NMS) · PLC 상세조회 · 통합 타임라인 · HMI 미러 · AI 헬퍼 3종 · 슬리터2 모니터 KR/EN · 라인배정 변경 KR/EN · 작업확인 · 재고검색 · 테이퍼 텐션 3종',
    {x:P+0.22,y:3.06,w:5.51,h:2.40,fontSize:13,color:GRAY,lsm:1.6});
  // 우측 5개
  const c2x=P+6.20, c3x=P+9.30, cw2=2.95;
  const right=[[c2x,1.78,'주문접수 자동화','5','통합흐름 v2 · OCR 문서인식 · 카카오톡 접수 · FAX 작업요청서 · 현장 코일확정',1.98],
               [c2x,3.90,'경영 · 재무','2','계좌 손익 통합 · 거래명세서 입금확인',1.73],
               [c3x,1.78,'고객 대면','3','주문 현황 트래커 · 고객사 챗봇 · 영업대상 리스트',1.48],
               [c3x,3.40,'창고 · 설비','2','코일창고 3D 뷰어 · 장애 원인 분석',1.38],
               [c3x,4.92,'시스템 연동','1','대시보드 자동연동 모니터링',1.38]];
  right.forEach(([x,y,lab,n,body,h])=>{
    box(s,x,y,cw2,h);
    pill(s,x+0.18,y+0.14,lab,'n');
    T(s,n,{x:x+0.18,y:y+0.48,w:1.2,h:0.52,fontSize:30,bold:true,color:INK});
    T(s,body,{x:x+0.18,y:y+1.00,w:cw2-0.36,h:h-1.06,fontSize:10.5,color:GRAY,lsm:1.45});
  });
  box(s,P,5.82,5.95,0.62,{fill:GRL,line:GRB,lw:2});
  let bx=P+0.22;
  bx += pill(s,bx,5.98,'현장 배포중 2','g')+0.14;
  bx += pill(s,bx,5.98,'실데이터 28','g')+0.14;
  bx += pill(s,bx,5.98,'시험판 8','a')+0.14;
  pill(s,bx,5.98,'개발용 3','n');
}

// ════════════════════════════════════════════════════
// 23 · AI 활용 6가지 유형
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'AI를 얼마나 다양하게 쓰는가','pp');
  H(s,[{text:'한 가지 AI가 아닙니다 — ',options:{}},{text:'여섯 가지 방식',options:{color:PP}},
       {text:'으로 씁니다',options:{}}],{y:0.92,h:0.62});
  const cw=3.92, gap=0.28, ch=1.98;
  const d=[['01','읽는 AI','계기판 사진에서 숫자를 읽고, 팩스 작업요청서와 지출 영수증에서 글자를 뽑아냅니다.','OCR · 이미지 인식'],
           ['02','보는 AI','분당 250m로 지나가는 철판 표면을 전수 촬영해 흠집 위치를 찾아냅니다.','비전 검사'],
           ['03','찾아내는 AI','코일 60개·2주치를 한 번에 훑어 고장 난 센서와 이상 구간을 걸러냅니다.','이상 탐지'],
           ['04','추천하는 AI','같은 사양 완료 코일들의 실측값으로 권장 속도·힘·예상 가동시간을 제시합니다.','설정값 추천 · 완료 예측'],
           ['05','답하는 AI','고객이 말로 물으면 실제 기록을 근거로 자연어로 답합니다. 사람이 응대하지 않습니다.','대화형 조회'],
           ['06','만드는 AI','화면과 분석 도구 자체를 AI로 만들었습니다. 41개가 이 방식으로 나왔습니다.','개발 자체를 AI로']];
  d.forEach(([n,t,b,tagT],i)=>{
    const x=P+(i%3)*(cw+gap), y=1.78+Math.floor(i/3)*(ch+0.24);
    box(s,x,y,cw,ch,{fill:PPL,line:PPB,lw:2});
    T(s,n,{x:x+0.22,y:y+0.10,w:1.0,h:0.48,fontSize:26,bold:true,color:PP});
    T(s,t,{x:x+0.22,y:y+0.58,w:cw-0.44,h:0.36,fontSize:18,bold:true,color:INK});
    T(s,b,{x:x+0.22,y:y+0.98,w:cw-0.44,h:0.62,fontSize:12.5,lsm:1.4});
    pill(s,x+0.22,y+ch-0.44,tagT,'p');
  });
  box(s,P,6.28,W,0.90,{fill:AML,line:AMB,lw:2});
  T(s,[{text:'06번이 앞의 다섯 개를 가능하게 했습니다.  ',options:{color:INK}},
       {text:'개발을 AI로 하니, 나머지를 직접 만들 수 있었습니다.',options:{color:AM}}],
    {x:P+0.3,y:6.28,w:W-0.6,h:0.90,fontSize:18,bold:true,align:'center',valign:'middle'});
}

// ════════════════════════════════════════════════════
// 24 · 실제 화면 3종
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'AI를 얼마나 다양하게 쓰는가','pp');
  H(s,[{text:'현장에서 ',options:{}},{text:'매일 열리는 화면들',options:{color:PP}}],{y:0.92,h:0.62});
  const cw=3.92, gap=0.28;
  // 1 세퍼레이터
  let x=P;
  box(s,x,1.80,cw,3.05,{lw:1.75});
  rect(s,x,1.80,cw,0.48,{fill:NAVY,line:null});
  T(s,'세퍼레이터 셋팅 계산기 · 키오스크',{x:x+0.15,y:1.80,w:cw-0.3,h:0.48,fontSize:11.5,bold:true,color:WHITE,valign:'middle'});
  T(s,'가공규격  0.75 × 4 × C',{x:x+0.22,y:2.40,w:cw-0.44,h:0.3,fontSize:11.5,color:GRAY});
  const sw=(cw-0.44-0.16)/3;
  [['스페이서 A','4.2',true],['B','3.0',false],['C','1.5',false]].forEach(([l,v,hot],i)=>{
    const bx2=x+0.22+i*(sw+0.08);
    box(s,bx2,2.76,sw,0.72,{fill:hot?PPL:WHITE,line:hot?PP:LINE,lw:hot?2:1.4});
    T(s,l,{x:bx2,y:2.82,w:sw,h:0.24,fontSize:8.5,bold:true,color:hot?PP:GRAY,align:'center'});
    T(s,v,{x:bx2,y:3.02,w:sw,h:0.38,fontSize:18,bold:true,color:INK,align:'center'});
  });
  box(s,x+0.22,3.58,cw-0.44,0.58,{fill:GRL,line:GRB,lw:1.5});
  T(s,'조합 확정 · 합계 8.7mm',{x:x+0.22,y:3.58,w:cw-0.44,h:0.58,fontSize:12,bold:true,color:GR,align:'center',valign:'middle'});
  T(s,[{text:'현장 배포중',options:{bold:true,color:INK}},{text:' · 공장장 암산을 화면이 대신합니다',options:{}}],
    {x:x,y:4.95,w:cw,h:0.6,fontSize:13,lsm:1.35});
  // 2 NMS
  x=P+cw+gap;
  box(s,x,1.80,cw,3.05,{lw:1.75});
  rect(s,x,1.80,cw,0.48,{fill:NAVY,line:null});
  T(s,'레벨링 라인 통합 관제 (NMS)',{x:x+0.15,y:1.80,w:cw-0.3,h:0.48,fontSize:11.5,bold:true,color:WHITE,valign:'middle'});
  const lw2=(cw-0.44-0.16)/3;
  [['레벨링 ● 가동','68%',true],['슬리터2 ● 가동','41%',true],['슬리터1 ○ 대기','—',false]].forEach(([l,v,on],i)=>{
    const bx2=x+0.22+i*(lw2+0.08);
    box(s,bx2,2.40,lw2,0.72,{fill:on?GRL:WHITE,line:on?GRB:LINE,lw:1.4});
    T(s,l,{x:bx2+0.04,y:2.46,w:lw2-0.08,h:0.24,fontSize:8,bold:true,color:on?GR:GRAY});
    T(s,v,{x:bx2+0.04,y:2.68,w:lw2-0.08,h:0.34,fontSize:15,bold:true,color:INK});
  });
  // 파형
  const pts=[[0,.72],[.08,.55],[.17,.63],[.25,.28],[.33,.42],[.42,.20],[.5,.33],[.58,.16],[.67,.38],[.75,.25],[.83,.46],[.92,.33],[1,.42]];
  for(let i=0;i<pts.length-1;i++){
    const x1=x+0.25+pts[i][0]*(cw-0.5), y1=3.24+pts[i][1]*0.52;
    const x2=x+0.25+pts[i+1][0]*(cw-0.5), y2=3.24+pts[i+1][1]*0.52;
    s.addShape(pptx.ShapeType.line,{x:Math.min(x1,x2),y:Math.min(y1,y2),
      w:Math.abs(x2-x1)||0.01,h:Math.abs(y2-y1)||0.01,
      line:{color:PP,width:2},flipV:y2<y1});
  }
  box(s,x+0.22,3.94,cw-0.44,0.55,{fill:AML,line:AMB,lw:1.5});
  T(s,'이상 알림 1건 · 20초 자동 갱신',{x:x+0.22,y:3.94,w:cw-0.44,h:0.55,fontSize:11,bold:true,color:AM,align:'center',valign:'middle'});
  T(s,[{text:'실데이터 연동',options:{bold:true,color:INK}},{text:' · 통신사 관제센터 방식을 공장에',options:{}}],
    {x:x,y:4.95,w:cw,h:0.6,fontSize:13,lsm:1.35});
  // 3 3D 창고
  x=P+2*(cw+gap);
  box(s,x,1.80,cw,3.05,{lw:1.75});
  rect(s,x,1.80,cw,0.48,{fill:NAVY,line:null});
  T(s,'코일창고 3D 뷰어 · 출고관리',{x:x+0.15,y:1.80,w:cw-0.3,h:0.48,fontSize:11.5,bold:true,color:WHITE,valign:'middle'});
  T(s,'A구역 · 거래처별 보관 코일',{x:x+0.22,y:2.40,w:cw-0.44,h:0.28,fontSize:10.5,color:GRAY,align:'center'});
  rect(s,x+0.30,3.34,cw-0.60,0.42,{fill:'F2F4F7',line:'D0D5DD',lw:1.2});
  [[0.55,3.16,PP],[1.28,3.16,'7A73F0'],[2.01,3.16,'8C86F5'],[2.74,3.16,GRAY2],[1.28,2.76,GR]]
    .forEach(([dx,yy,c])=>{
      s.addShape(pptx.ShapeType.ellipse,{x:x+dx,y:yy,w:0.68,h:0.38,fill:{color:c},line:{type:'none'}});
    });
  let px2=x+0.24;
  px2 += pill(s,px2,3.92,'대한강재 12','p')+0.10;
  px2 += pill(s,px2,3.92,'출고 가능 4','g')+0.10;
  pill(s,px2,3.92,'장기 3','n');
  T(s,[{text:'현장 배포중',options:{bold:true,color:INK}},{text:' · 어느 자리에 누구 물건인지 한눈에',options:{}}],
    {x:x,y:4.95,w:cw,h:0.6,fontSize:13,lsm:1.35});
}

// ════════════════════════════════════════════════════
// 25 · 표준이 없다
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'5부 · 다만, 아직 모르는 것이 남았습니다','am');
  H(s,[{text:'보여주기는 하고 — ',options:{}},{text:'판정은 하지 않습니다',options:{color:RD}}],{y:0.92,h:0.62});
  const cw=5.95, gap=0.35;
  // 지금
  box(s,P,1.80,cw,4.40);
  pill(s,P+0.25,1.98,'지금','n');
  box(s,P+0.25,2.44,cw-0.5,1.05,{fill:TINT});
  T(s,'추천 도구가 알려주는 값',{x:P+0.45,y:2.56,w:cw-0.9,h:0.3,fontSize:12,color:GRAY});
  T(s,'권장 속도 82',{x:P+0.45,y:2.86,w:cw-0.9,h:0.52,fontSize:26,bold:true,color:INK});
  box(s,P+0.25,3.68,cw-0.5,2.28,{fill:RDL,line:RDB,lw:2});
  T(s,[{text:'그런데 그 82는 ',options:{}},{text:'과거에 그렇게 돌렸던 평균',options:{bold:true,color:INK}},
       {text:'입니다.\n',options:{}},{text:'그렇게 돌려야 하는 값이 아닙니다.\n\n',options:{bold:true,color:RD}},
       {text:'과거에 불량이 났던 작업도 그 평균 안에 섞여 있습니다.',options:{bold:true,color:INK}}],
    {x:P+0.45,y:3.86,w:cw-0.9,h:1.95,fontSize:15.5,lsm:1.5});
  // 되어야 하는 것
  const x2=P+cw+gap;
  box(s,x2,1.80,cw,4.40,{fill:GRL,line:GRB,lw:2});
  pill(s,x2+0.25,1.98,'되어야 하는 것','g');
  box(s,x2+0.25,2.44,cw-0.5,1.35,{line:GRB,lw:2});
  T(s,'판정까지 해주는 화면',{x:x2+0.45,y:2.56,w:cw-0.9,h:0.3,fontSize:12,color:GRAY});
  T(s,[{text:'속도 82 ',options:{color:INK}},{text:'— 표준 78~85 이내 ✓',options:{color:GR}}],
    {x:x2+0.45,y:2.88,w:cw-0.9,h:0.38,fontSize:17,bold:true});
  T(s,[{text:'힘 1.8 ',options:{color:INK}},{text:'— 표준 2.2~2.6 이탈 ⚠',options:{color:RD}}],
    {x:x2+0.45,y:3.28,w:cw-0.9,h:0.38,fontSize:17,bold:true});
  box(s,x2+0.25,3.98,cw-0.5,1.98);
  T(s,[{text:'그리고 이탈하면 ',options:{}},{text:'한 줄 이유를 남기게',options:{bold:true,color:INK}},
       {text:' 합니다.\n',options:{}},
       {text:'원자재 / 설비 이상 / 고객 요청 / 급한 납기 / 기타\n\n',options:{fontSize:13,color:GRAY}},
       {text:'이 한 줄이 쌓이면 1년 뒤 ',options:{}},
       {text:'"표준을 못 지키는 진짜 이유"의 순위',options:{bold:true,color:INK}},
       {text:'가 나옵니다. ',options:{}},{text:'지금은 아무도 모릅니다.',options:{bold:true,color:AM}}],
    {x:x2+0.45,y:4.14,w:cw-0.9,h:1.70,fontSize:14.5,lsm:1.5});
}

// ════════════════════════════════════════════════════
// 26 · 운용체계 5단계
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'5부 · 남은 과제 — 운용 체계');
  H(s,[{text:'누가 작업해도 ',options:{}},{text:'같은 결과',options:{color:PP}},
       {text:'가 나오게, 그리고 ',options:{}},{text:'증명할 기록',options:{color:PP}},
       {text:'이 남게',options:{}}],{y:0.92,h:0.62});
  const cw=2.30, gap=0.18;
  const d=[['1','표준값 확정','불량·재작업·중단이 없었던 작업만 남겨 표준값을 뽑고 문서로 박습니다. 추천을 "과거 평균"에서 "표준값+허용범위"로.','선행: 품질이력↔작업데이터 연결','a'],
           ['2','화면이 판정','범위 안/밖을 표시하고 경고합니다. 이탈하면 이유 한 줄을 남깁니다.',null,null],
           ['3','작업 표준서를 화면으로','사양을 고르면 세팅 순서가 단계별로 뜨고, 확인하면 다음 단계로.','공장장 정년 전에 — 시한 있음','r'],
           ['4','데이터 결측 제거','센서 배선, 외부 시스템 가동, 카메라 고정, 코일번호 태깅 100%. 매일 아침 결측률을 봅니다.','가장 지루하고 가장 중요','a'],
           ['5','매일 마감','저녁마다 한 장이 자동으로: 작업 건수 · 이탈 건수(이유별) · 결측 · 정지.',null,null]];
  d.forEach(([n,t,b,note,nc],i)=>{
    const x=P+i*(cw+gap);
    box(s,x,1.80,cw,3.90,{fill:PPL,line:PPB,lw:2});
    T(s,n,{x:x+0.18,y:1.88,w:1.0,h:0.52,fontSize:30,bold:true,color:PP});
    T(s,t,{x:x+0.18,y:2.44,w:cw-0.36,h:0.75,fontSize:15,bold:true,color:INK,lsm:1.2});
    T(s,b,{x:x+0.18,y:3.24,w:cw-0.36,h:1.55,fontSize:11.5,lsm:1.5});
    if(note) pill(s,x+0.18,5.18,note,nc,cw-0.36);
  });
  darkBar(s,5.95,[{text:'사람이 챙기는 체계는 사람이 빠지면 멈추지만, ',options:{}},
                  {text:'매일 한 장이 나오는 체계는 멈추면 표가 납니다.',options:{color:YEL}}],0.95);
}

// ── 표 헬퍼 ───────────────────────────────────────────
function tbl(s, rows, o={}){
  s.addTable(rows, {
    x:o.x||P, y:o.y||1.85, w:o.w||W, colW:o.colW,
    border:{type:'solid',color:LINE,pt:1.5},
    fontFace:F, fontSize:o.fontSize||13, color:INK2, valign:'middle',
    rowH:o.rowH||0.52, autoPage:false, ...(o.extra||{})
  });
}
const TH = t => ({ text:t, options:{ bold:true, color:GRAY, fontSize:11.5, fill:{color:TINT} } });

// ════════════════════════════════════════════════════
// 27 · 고객의 말
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'6부 · 질문 ② 우리 고객들은 무엇을 원하는가','bl');
  T(s,[{text:'저희는 고객이 ',options:{}},{text:'더 정밀한 분석',options:{bold:true,color:INK}},
       {text:'을 원할 거라 생각했습니다.\n',options:{}},
       {text:'두 번째 실패가 바로 그 생각에서 나왔습니다.',options:{bold:true,color:RD}}],
    {x:P,y:1.20,w:W,h:0.85,fontSize:18,bold:true,align:'center',lsm:1.45});
  box(s,P+0.85,2.32,W-1.70,2.05,{fill:PPL,line:PPB,lw:2.5});
  T(s,[{text:'"그냥 아무 때나 물어보고,\n',options:{color:INK}},
       {text:'바로 확인받고 싶습니다."',options:{color:PP}}],
    {x:P+1.0,y:2.32,w:W-2.0,h:2.05,fontSize:36,bold:true,align:'center',valign:'middle',lsm:1.35});
  T(s,[{text:'정밀한 분석 리포트를 원하는 게 아닙니다.\n',options:{}},
       {text:'밤 열 시에 궁금한 것이 생겼을 때, 그때 답을 받고 싶은 것입니다.',options:{bold:true,color:INK}}],
    {x:P,y:4.75,w:W,h:1.0,fontSize:21,bold:true,align:'center',lsm:1.5});
}

// ════════════════════════════════════════════════════
// 28 · 고객의 현실 타임라인
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'6부 · 지금 고객이 겪는 현실','bl');
  H(s,[{text:'궁금한 시간은 ',options:{}},{text:'아무 때나',options:{color:PP}},
       {text:', 물어볼 시간은 ',options:{}},{text:'우리 업무시간뿐',options:{color:RD}}],{y:0.92,h:0.62});
  const tlY=3.05, tlX=P+0.3, tlW=9.05;
  rect(s,tlX,tlY,tlW,0.08,{fill:LINE,line:null});
  // 업무시간
  s.addShape(pptx.ShapeType.roundRect,{x:tlX+3.05,y:tlY-0.09,w:2.45,h:0.26,rectRadius:0.12,
    fill:{color:PP},line:{type:'none'}});
  T(s,'우리 업무시간 09:00–18:00',{x:tlX+2.55,y:tlY-0.50,w:3.45,h:0.3,fontSize:12.5,bold:true,color:PP,align:'center'});
  // 대기 구간
  rect(s,tlX+1.05,tlY,1.98,0.08,{fill:RDB,line:null});
  T(s,'11시간 대기',{x:tlX+1.20,y:tlY-0.50,w:1.70,h:0.3,fontSize:14,bold:true,color:RD,align:'center'});
  // 점
  const dots=[[1.05,RD,0.26,'밤 22:00','궁금증 발생','"내 물건 언제 오지?"',RD],
              [3.05,PP,0.26,'아침 09:00','전화','',PP],
              [4.28,AM,0.20,'담당자 부재','다시 걸어야 함','',AM],
              [5.50,GR,0.26,'답 들음','',' ',GR],
              [7.20,GRAY2,0.20,'다음에 또 물어야','','',GRAY]];
  dots.forEach(([dx,c,sz,l1,l2,l3,lc])=>{
    s.addShape(pptx.ShapeType.ellipse,{x:tlX+dx-sz/2,y:tlY+0.04-sz/2,w:sz,h:sz,
      fill:{color:c},line:{type:'none'}});
    T(s,l1,{x:tlX+dx-1.0,y:tlY+0.32,w:2.0,h:0.3,fontSize:13,bold:true,color:lc,align:'center'});
    if(l2) T(s,l2,{x:tlX+dx-1.0,y:tlY+0.62,w:2.0,h:0.3,fontSize:11.5,bold:true,color:INK,align:'center'});
    if(l3&&l3.trim()) T(s,l3,{x:tlX+dx-1.1,y:tlY+0.90,w:2.2,h:0.3,fontSize:10.5,color:GRAY,align:'center'});
  });
  T(s,'그런데 어디에도\n남지 않습니다',{x:tlX+4.70,y:tlY+0.60,w:1.6,h:0.6,fontSize:11,bold:true,color:RD,align:'center',lsm:1.3});
  // 결국
  box(s,P+9.85,2.05,W-9.85,2.85,{fill:RDL,line:RDB,lw:2});
  T(s,'그래서 결국',{x:P+9.85,y:2.20,w:W-9.85,h:0.3,fontSize:14,bold:true,color:RD,align:'center'});
  T(s,'미안해서\n안 묻고 넘어감',{x:P+9.85,y:2.62,w:W-9.85,h:0.68,fontSize:15,bold:true,color:INK,align:'center',lsm:1.3});
  T(s,'→ 여유 재고를 쥐고\n라인을 비워둠',{x:P+9.85,y:3.55,w:W-9.85,h:0.72,fontSize:14,bold:true,color:RD,align:'center',lsm:1.35});
  box(s,P,5.30,W,1.15,{fill:RDL,line:RDB,lw:2});
  T(s,[{text:'고객이 원하는 건 더 좋은 기술이 아니었습니다.  ',options:{color:INK}},
       {text:'다른 데서 다 되는 것이, 여기서만 안 되는 그 불편이었습니다.',options:{color:RD}}],
    {x:P+0.3,y:5.30,w:W-0.6,h:1.15,fontSize:19,bold:true,align:'center',valign:'middle',lsm:1.35});
}

// ════════════════════════════════════════════════════
// 29 · 택배는 되는데
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'6부 · 고객은 이미 24시간을 경험하고 있습니다','bl');
  H(s,[{text:'택배는 ',options:{}},{text:'어느 터미널에 있는지까지',options:{color:GR}},
       {text:' 보는데',options:{}}],{y:0.92,h:0.62});
  const cw=2.92, gap=0.22;
  const d=[['온라인 쇼핑','밤에 주문하고\n새벽에 배송 상태 확인','24시간',false],
           ['은행','잔고·이체·명세\n언제든 조회','24시간',false],
           ['택배','지금 어느 터미널에\n있는지까지','24시간',false],
           ['철강 발주','수천만 원짜리인데\n아침 9시를 기다림','업무시간만',true]];
  d.forEach(([t,b,p,hot],i)=>{
    const x=P+i*(cw+gap);
    box(s,x,1.80,cw,2.75,{fill:hot?RDL:GRL,line:hot?RDB:GRB,lw:2});
    T(s,t,{x,y:2.00,w:cw,h:0.42,fontSize:20,bold:true,color:hot?RD:GR,align:'center'});
    T(s,b,{x:x+0.15,y:2.56,w:cw-0.3,h:0.85,fontSize:14,bold:hot,color:INK2,align:'center',lsm:1.4});
    pill(s,x+(cw-1.35)/2,3.70,p,hot?'r':'g',1.35);
  });
  darkBar(s,4.95,[{text:'수천만 원짜리 철강 발주 건이,\n',options:{}},
                  {text:'가장 확인하기 어려운 거래가 되어 있었습니다.',options:{color:YEL}}],1.50);
}

// ════════════════════════════════════════════════════
// 30 · 24시간 5가지
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'6부 · 고객이 원하는 것','bl');
  H(s,[{text:'다섯 가지였습니다 — ',options:{}},{text:'전부 "24시간"',options:{color:PP}}],{y:0.92,h:0.62});
  const rows=[[TH(''),TH('고객이 하고 싶은 것'),TH('지금')]];
  const d=[['①','24시간 문의','언제든 묻고 바로 답받기','업무시간에 전화, 담당자 없으면 다시',false],
           ['②','24시간 발주','밤에도 주문 넣기','팩스·전화, 업무시간만',false],
           ['③','24시간 진행 조회','내 물건이 지금 어디까지','전화해서 물어봐야 함',false],
           ['④','24시간 상세 내역','지난 거래·미출고·미수금·맡긴 재고','요청하면 정리해서 보내줌',false],
           ['⑤','24시간 품질 결과','내가 발주한 그 물건의 AI 검사 결과','어디에도 없음',true]];
  d.forEach(([n,t,sub,now,hot])=>{
    rows.push([
      { text:n, options:{ bold:true, color:hot?PP:PP, fontSize:19, align:'center',
                          fill:{color:hot?PPL:WHITE} } },
      { text:[{text:t,options:{bold:true,fontSize:hot?19:18,color:hot?PP:INK}},
              {text:'  — '+sub,options:{fontSize:14,color:INK2}}],
        options:{ fill:{color:hot?PPL:WHITE} } },
      { text:now, options:{ fontSize:hot?16:13.5, bold:hot, color:hot?RD:GRAY,
                            fill:{color:hot?PPL:WHITE} } }
    ]);
  });
  tbl(s,rows,{y:1.80,colW:[0.75,7.70,3.78],rowH:0.62});
  const cw=5.95;
  box(s,P,5.62,cw,0.95);
  T(s,[{text:'①~④는 ',options:{}},{text:'온라인 쇼핑에서 이미 당연한 것들',options:{bold:true,color:INK}},
       {text:'입니다.  ',options:{}},{text:'언젠가 다른 코일센터도 하게 될 것입니다.',options:{color:GRAY}}],
    {x:P+0.2,y:5.62,w:cw-0.4,h:0.95,fontSize:14,valign:'middle',lsm:1.4});
  box(s,P+cw+0.35,5.62,W-cw-0.35,0.95,{fill:PPL,line:PPB,lw:2});
  T(s,[{text:'⑤가 다릅니다.',options:{bold:true,color:PP,fontSize:18}},
       {text:'  5부에서 얻은 것이 없으면 불가능합니다.',options:{color:INK,fontSize:15}}],
    {x:P+cw+0.55,y:5.62,w:W-cw-0.75,h:0.95,bold:true,valign:'middle',lsm:1.4});
}

// ════════════════════════════════════════════════════
// 31 · ⑤번이 결정적
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'6부 · ⑤번이 왜 결정적인가','bl');
  H(s,[{text:'①~④는 ',options:{}},{text:'시스템만 만들면',options:{color:GRAY}},
       {text:' 됩니다. ',options:{}},{text:'⑤는 다릅니다.',options:{color:PP}}],{y:0.92,h:0.62});
  const cw=3.92, gap=0.28;
  // ①~④
  let x=P;
  box(s,x,1.80,cw,3.10,{fill:TINT});
  T(s,'①~④\n문의·발주·조회·내역',{x:x+0.2,y:1.96,w:cw-0.4,h:0.75,fontSize:17,bold:true,color:GRAY,align:'center',lsm:1.25});
  T(s,'필요한 것: 돈과 시간',{x:x+0.2,y:2.86,w:cw-0.4,h:0.34,fontSize:14,bold:true,color:INK2,align:'center'});
  T(s,'누구나 할 수 있습니다',{x:x+0.2,y:3.30,w:cw-0.4,h:0.4,fontSize:18,bold:true,color:INK,align:'center'});
  pill(s,x+(cw-1.5)/2,3.90,'= 편의','n',1.5);
  T(s,'경쟁사도 언젠가 합니다',{x:x+0.2,y:4.38,w:cw-0.4,h:0.3,fontSize:12,color:GRAY2,align:'center'});
  // ⑤
  x=P+cw+gap;
  box(s,x,1.80,cw,3.10,{fill:PPL,line:PP,lw:2.5});
  T(s,'⑤ 품질 결과',{x:x+0.2,y:1.96,w:cw-0.4,h:0.42,fontSize:19,bold:true,color:PP,align:'center'});
  T(s,'필요한 것:',{x:x+0.2,y:2.48,w:cw-0.4,h:0.3,fontSize:14,bold:true,color:INK2,align:'center'});
  T(s,'전수 촬영 자료\n2초 단위 운전 기록\n검증된 데이터',
    {x:x+0.2,y:2.82,w:cw-0.4,h:1.05,fontSize:15,bold:true,color:INK,align:'center',lsm:1.5});
  pill(s,x+(cw-1.7)/2,4.08,'= 차별화','p',1.7);
  // 5부의 답
  x=P+2*(cw+gap);
  box(s,x,1.80,cw,3.10,{fill:GRL,line:GR,lw:2.5});
  T(s,'그건 5부의 답입니다',{x:x+0.2,y:1.98,w:cw-0.4,h:0.4,fontSize:17,bold:true,color:GR,align:'center'});
  T(s,'첫 번째 질문에 답하지\n않았다면',{x:x+0.2,y:2.56,w:cw-0.4,h:0.7,fontSize:15,bold:true,color:INK2,align:'center',lsm:1.4});
  T(s,'다섯 번째는 못 합니다',{x:x+0.2,y:3.40,w:cw-0.4,h:0.45,fontSize:19,bold:true,color:GR,align:'center'});
  T(s,'두 질문이 여기서 연결됩니다',{x:x+0.2,y:4.30,w:cw-0.4,h:0.3,fontSize:12,bold:true,color:GRAY2,align:'center'});
  box(s,P,5.15,W,1.35,{fill:PPL,line:PPB,lw:2});
  T(s,[{text:'진행 상황만 보여주는 포털은 ',options:{color:INK}},{text:'편리한 서비스',options:{color:GRAY}},
       {text:'입니다.\n',options:{color:INK}},
       {text:'품질 결과까지 보여주는 포털은 ',options:{color:INK}},
       {text:'검사를 대신해주는 서비스',options:{color:PP}},{text:'입니다.',options:{color:INK}}],
    {x:P+0.3,y:5.15,w:W-0.6,h:1.35,fontSize:20,bold:true,align:'center',valign:'middle',lsm:1.45});
}

// ════════════════════════════════════════════════════
// 32 · 밤 11시 UI (고객 포털 + 챗봇)
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'6부 · 그래서 만약','bl');
  H(s,[{text:'고객이 ',options:{}},{text:'밤 열한 시',options:{color:PP}},
       {text:'에 휴대폰을 열어서',options:{}}],{y:0.92,h:0.62});
  // 폰 1 — 포털
  let px=P, py=1.78, pw=2.60, ph=4.62;
  s.addShape(pptx.ShapeType.roundRect,{x:px,y:py,w:pw,h:ph,rectRadius:0.14,fill:{color:NAVY},line:{type:'none'}});
  rect(s,px+0.13,py+0.46,pw-0.26,ph-0.60,{fill:WHITE,line:null});
  T(s,'오성철강 고객 포털',{x:px+0.17,y:py+0.12,w:1.9,h:0.28,fontSize:10,bold:true,color:WHITE});
  T(s,'23:04',{x:px+pw-0.92,y:py+0.12,w:0.74,h:0.28,fontSize:9.5,bold:true,color:WHITE,align:'right'});
  T(s,'(주)대한강재님',{x:px+0.26,y:py+0.55,w:2.1,h:0.28,fontSize:12,bold:true,color:INK});
  box(s,px+0.26,py+0.88,pw-0.52,0.98,{fill:PPL,line:PPB,lw:1.5});
  T(s,'진행중 · 코일 1622057',{x:px+0.36,y:py+0.95,w:1.9,h:0.24,fontSize:9,bold:true,color:PP});
  T(s,'62%',{x:px+0.36,y:py+1.16,w:0.85,h:0.36,fontSize:19,bold:true,color:INK});
  T(s,[{text:'완료 예정 ',options:{}},{text:'01:40',options:{bold:true,color:INK}}],
    {x:px+1.15,y:py+1.24,w:1.25,h:0.26,fontSize:9,bold:true,align:'right'});
  bar(s,px+0.36,py+1.58,pw-0.72,62,PP,0.11);
  box(s,px+0.26,py+1.96,pw-0.52,1.28,{fill:GRL,line:GRB,lw:1.5});
  T(s,'오늘 받은 물건 품질 결과',{x:px+0.36,y:py+2.03,w:1.95,h:0.24,fontSize:9,bold:true,color:GR});
  T(s,'적합 · 표준 범위 내',{x:px+0.36,y:py+2.26,w:1.95,h:0.3,fontSize:13,bold:true,color:GR});
  T(s,'표면 결함 0 · 두께 편차 ±0.01\n중단 없음',{x:px+0.36,y:py+2.56,w:1.95,h:0.42,fontSize:8.5,color:INK2,lsm:1.35});
  T(s,'영상 보기 ›',{x:px+0.36,y:py+2.98,w:1.95,h:0.22,fontSize:9,bold:true,color:GR});
  const hw=(pw-0.52-0.10)/2;
  [['미출고','3건'],['맡긴 재고','12코일']].forEach(([l,v],i)=>{
    const bx2=px+0.26+i*(hw+0.10);
    box(s,bx2,py+3.34,hw,0.58,{lw:1.4});
    T(s,l,{x:bx2,y:py+3.39,w:hw,h:0.22,fontSize:8,color:GRAY,align:'center'});
    T(s,v,{x:bx2,y:py+3.58,w:hw,h:0.3,fontSize:13,bold:true,color:INK,align:'center'});
  });
  s.addShape(pptx.ShapeType.roundRect,{x:px+0.26,y:py+4.00,w:pw-0.52,h:0.46,rectRadius:0.08,
    fill:{color:PP},line:{type:'none'}});
  T(s,'+ 새 주문 넣기',{x:px+0.26,y:py+4.00,w:pw-0.52,h:0.46,fontSize:10.5,bold:true,color:WHITE,
    align:'center',valign:'middle'});
  // 폰 2 — 챗봇
  px = P+pw+0.28;
  s.addShape(pptx.ShapeType.roundRect,{x:px,y:py,w:pw,h:ph,rectRadius:0.14,fill:{color:NAVY},line:{type:'none'}});
  rect(s,px+0.13,py+0.46,pw-0.26,ph-0.60,{fill:WHITE,line:null});
  T(s,'문의',{x:px+0.17,y:py+0.12,w:1.2,h:0.28,fontSize:10,bold:true,color:WHITE});
  T(s,'23:06',{x:px+pw-0.92,y:py+0.12,w:0.74,h:0.28,fontSize:9.5,bold:true,color:WHITE,align:'right'});
  s.addShape(pptx.ShapeType.roundRect,{x:px+0.26,y:py+0.56,w:pw-0.62,h:0.56,rectRadius:0.10,
    fill:{color:'F2F4F7'},line:{type:'none'}});
  T(s,'어제 보낸 코일 중에\n중단된 게 있었나요?',{x:px+0.36,y:py+0.60,w:pw-0.80,h:0.48,fontSize:9,bold:true,color:INK,lsm:1.3});
  s.addShape(pptx.ShapeType.roundRect,{x:px+0.36,y:py+1.22,w:pw-0.62,h:1.62,rectRadius:0.10,
    fill:{color:PPL},line:{type:'none'}});
  T(s,[{text:'어제(9/12) 출고 6건 중 1건',options:{bold:true}},
       {text:'에서 작업 중단 기록이 있습니다.\n\n코일 1622051 · 1,240m 지점에서 ',options:{}},
       {text:'4분 정지',options:{bold:true}},{text:' 후 재가동. 해당 구간 표면 검사는 ',options:{}},
       {text:'이상 없음',options:{bold:true}},{text:'입니다.',options:{}}],
    {x:px+0.46,y:py+1.26,w:pw-0.82,h:1.22,fontSize:8,color:INK,lsm:1.3});
  T(s,'근거 기록 보기 ›',{x:px+0.46,y:py+2.56,w:pw-0.82,h:0.2,fontSize:8,bold:true,color:PP});
  s.addShape(pptx.ShapeType.roundRect,{x:px+0.26,y:py+2.94,w:pw-0.62,h:0.40,rectRadius:0.10,
    fill:{color:'F2F4F7'},line:{type:'none'}});
  T(s,'미수금도 알려주세요',{x:px+0.36,y:py+2.94,w:pw-0.80,h:0.40,fontSize:9,bold:true,color:INK,valign:'middle'});
  box(s,px+0.26,py+3.50,pw-0.52,0.72,{fill:AML,line:AMB,lw:1.5});
  T(s,'사람이 응대하지 않습니다',{x:px+0.36,y:py+3.58,w:pw-0.72,h:0.24,fontSize:8.5,bold:true,color:AM});
  T(s,'기록이 응대합니다',{x:px+0.36,y:py+3.80,w:pw-0.72,h:0.3,fontSize:12,bold:true,color:INK});
  // 우측 설명
  const rx=P+2*pw+0.56, rw=W-2*pw-0.56;
  const bl=[['새 주문을 넣고',''],
            ['어제 넣은 주문이 ','지금 어느 라인에서 가공 중인지 보고'],
            ['','몇 시에 끝나는지 확인하고'],
            ['지난달 거래 내역과 안 나간 물량을 확인하고',''],
            ['','오늘 받은 물건의 품질 검사 결과를 열어보고'],
            ['궁금하면 채팅으로 물어서 ','실제 기록에 근거한 답을 받는다면']];
  bl.forEach(([a,b],i)=>{
    const y=1.80+i*0.48;
    s.addShape(pptx.ShapeType.roundRect,{x:rx+0.06,y:y+0.11,w:0.13,h:0.13,rectRadius:0.03,
      fill:{color:i===4?GR:PP},line:{type:'none'}});
    T(s,[{text:a,options:{}},{text:b,options:{bold:true,color:i===4?GR:INK}}],
      {x:rx+0.34,y,w:rw-0.4,h:0.44,fontSize:15});
  });
  box(s,rx,4.78,rw,0.92,{fill:PPL,line:PPB,lw:2});
  T(s,[{text:'그 회사는 코일 가공업체가 아닙니다. ',options:{color:INK}},
       {text:'24시간 돌아가는 서비스 회사입니다.',options:{color:PP}}],
    {x:rx+0.2,y:4.78,w:rw-0.4,h:0.92,fontSize:16,bold:true,valign:'middle',lsm:1.35});
  box(s,rx,5.82,rw,0.72,{fill:GRL,line:GRB,lw:2});
  T(s,[{text:'단가가 조금 싼 곳으로 ',options:{}},{text:'옮기지 않습니다. ',options:{bold:true,color:INK}},
       {text:'옮기면 이 모든 게 없어지기 때문입니다.',options:{bold:true,color:GR}}],
    {x:rx+0.2,y:5.82,w:rw-0.4,h:0.72,fontSize:14,valign:'middle'});
}

// ════════════════════════════════════════════════════
// 33 · 이미 만든 것 / 남은 것
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'6부 · 솔직하게 나누면','am');
  H(s,[{text:'기능은 ',options:{}},{text:'대부분 있습니다',options:{color:GR}},
       {text:'. 그런데 ',options:{}},{text:'고객에게 나간 것은 하나도 없습니다.',options:{color:RD}}],
    {y:0.92,h:0.62,size:26});
  const rows=[[TH(''),TH('이미 만든 것'),TH('남은 것')]];
  const d=[['① 문의','실데이터로 답하는 채팅 창구','시연용 → 실서비스 전환','r',false],
           ['② 발주','팩스·카톡·문서인식 자동 접수 (시험판 4개)','실배포 — 현재 0건','r',false],
           ['③ 진행 조회','고객 포털 · 진행 트래커 · 완료 예측','예정시각 정확도 검증 후 개방','a',false],
           ['④ 상세 내역','재고·미출고·미수금 조회 · 3D 창고 뷰어','고객 계정에 연결','a',false],
           ['⑤ 품질 결과','전수 촬영 자료 · 운전 기록 · 분석 도구','양식 + 자동 발행 + 판정 기준','p',true]];
  const PC={r:[RD,RDL],a:[AM,AML],p:[PP,PPL]};
  d.forEach(([k,made,left,c,hot])=>{
    const [fg,bg]=PC[c];
    rows.push([
      { text:k, options:{ bold:true, fontSize:17, color:hot?PP:INK, fill:{color:hot?PPL:WHITE} } },
      { text:made, options:{ fontSize:14, fill:{color:hot?PPL:WHITE} } },
      { text:left, options:{ bold:true, fontSize:14, color:fg, fill:{color:bg}, align:'center' } }
    ]);
  });
  tbl(s,rows,{y:1.80,colW:[2.15,6.18,3.90],rowH:0.64});
  box(s,P,5.60,W,1.10,{fill:RDL,line:RDB,lw:2});
  T(s,[{text:'두 번의 실패가 ',options:{color:INK}},
       {text:'"아무도 볼 수 없는 곳에 좋은 것을 두었다"',options:{color:INK}},
       {text:'는 것이었습니다.\n',options:{color:INK}},
       {text:'지금 상태는 그 실수의 축소판이고, 저희는 반복 직전에 있습니다.',options:{color:RD}}],
    {x:P+0.3,y:5.60,w:W-0.6,h:1.10,fontSize:19,bold:true,align:'center',valign:'middle',lsm:1.4});
}

// ════════════════════════════════════════════════════
// 34 · 값 받는 지점
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'6부 · 값은 어떻게 받나','am');
  H(s,'전부 무료면 값을 못 받고, 전부 유료면 아무도 안 씁니다',{y:0.92,h:0.62});
  const rows=[[TH('서비스'),TH('제공 방식'),TH('목적')]];
  const d=[['24시간 문의 · 발주 · 진행 조회','무료, 단 계약서에 명시','거래 조건화 · 이탈 방지','n',false],
           ['품질 결과 요약  (판정만)','전 거래처 무료','표준으로 자리 잡게','n',false],
           ['품질 성적서 상세본  (영상·실측)','단가 반영 또는 별도','값을 받는 지점','g',true],
           ['분쟁 판별 리포트','건당 유상 또는 연간 약정','값을 받는 지점','g',true],
           ['보관 · 재고 대행','요율 계약','고정 수입 · 이탈 방지','g',true]];
  d.forEach(([k,how,why,c,hot])=>{
    rows.push([
      { text:k, options:{ bold:true, fontSize:17, color:INK, fill:{color:hot?GRL:WHITE} } },
      { text:how, options:{ fontSize:14.5, fill:{color:hot?GRL:WHITE} } },
      { text:why, options:{ bold:true, fontSize:14, color:hot?GR:GRAY,
                            fill:{color:hot?WHITE:TINT}, align:'center' } }
    ]);
  });
  tbl(s,rows,{y:1.80,colW:[5.30,3.60,3.33],rowH:0.66});
  darkBar(s,5.55,[{text:'모든 신규 견적서에 ',options:{}},
                  {text:'"24시간 조회 · 품질 결과 제공"',options:{color:YEL}},
                  {text:'을 한 줄 적습니다.\n',options:{}},
                  {text:'적히지 않은 서비스는 존재하지 않는 서비스입니다.',options:{fontSize:24}}],1.30);
}

// ════════════════════════════════════════════════════
// 35 · 두 질문이 하나였다
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'7부 · 두 질문이 만난 곳','gr');
  H(s,[{text:'안을 들여다보려고 만든 것이, ',options:{}},
       {text:'그대로 밖에 내보낼 것',options:{color:GR}},{text:'이 되었습니다',options:{}}],{y:0.92,h:0.62});
  const rows=[[TH('① 우리는 무엇을 모르는가 — 의 답'),TH(''),TH('② 고객은 무엇을 원하는가 — 의 답')]];
  const d=[['지금 잘 돌아가나','(실시간 상태)','③ 24시간 진행 조회',false],
           ['그때 어떻게 돌렸나','(구간별 기록)','⑤ 24시간 품질 결과',true],
           ['우리 잘못인가','(원소재/가공 판별)','분쟁 판별 리포트',false],
           ['데이터를 믿을 수 있나','(전수 검증)','위 전부의 신뢰 근거',false]];
  d.forEach(([a,sub,b,hot])=>{
    rows.push([
      { text:[{text:a,options:{fontSize:15.5,color:INK2}},{text:'  '+sub,options:{fontSize:12.5,color:GRAY}}],
        options:{ fill:{color:hot?PPL:WHITE} } },
      { text:'→', options:{ fontSize:18, bold:true, color:PP, align:'center', fill:{color:hot?PPL:WHITE} } },
      { text:b, options:{ bold:true, fontSize:hot?18:16, color:hot?PP:INK, fill:{color:hot?PPL:WHITE} } }
    ]);
  });
  tbl(s,rows,{y:1.80,colW:[5.65,0.95,5.63],rowH:0.60});
  const cw=5.95;
  box(s,P,4.70,cw,1.85);
  pill(s,P+0.22,4.86,'사건','r');
  T(s,[{text:'고객이 불량이라고 했고 저희는 아니라고 했습니다. ',options:{}},
       {text:'증명할 방법이 없었습니다.',options:{bold:true,color:INK}},
       {text:' 그래서 AI에게 물어 ',options:{}},{text:'품질 리포트',options:{bold:true,color:INK}},
       {text:'를 만들어냈습니다.',options:{}}],
    {x:P+0.22,y:5.28,w:cw-0.44,h:1.10,fontSize:14.5,lsm:1.45});
  box(s,P+cw+0.35,4.70,W-cw-0.35,1.85,{fill:GRL,line:GRB,lw:2});
  pill(s,P+cw+0.57,4.86,'그날의 깨달음','g');
  T(s,[{text:'"우리는 무엇을 모르는가"에 답하려고 모은 기록이,\n그대로 ',options:{color:INK}},
       {text:'"고객이 무엇을 원하는가"의 답',options:{color:GR}},{text:'이었습니다.',options:{color:INK}}],
    {x:P+cw+0.57,y:5.26,w:W-cw-0.79,h:1.15,fontSize:17,bold:true,lsm:1.4});
}

// ════════════════════════════════════════════════════
// 36 · 세 번의 시도
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'7부 · 세 번을 나란히 놓으면');
  H(s,[{text:'앞의 두 번이 ',options:{}},{text:'실패가 아니었던',options:{color:AM}},
       {text:' 이유',options:{}}],{y:0.92,h:0.62});
  const rows=[[TH(''),TH('무엇을 물었나'),TH('얻은 것'),TH('결과')]];
  const d=[['첫 번째','무엇을 사면 될까','생산성 높은 장비','값은 그대로',false],
           ['두 번째','무엇을 만들면 될까','품질 측정 자료 + 공정 데이터','매출은 그대로',false],
           ['세 번째','우리는 무엇을 모르나\n고객은 무엇을 원하나','완벽한 품질 + 기술 내재화\n+ 24시간 서비스','회사의 성격이\n바뀜',true]];
  d.forEach(([k,q,got,res,hot])=>{
    const bg = hot?GRL:WHITE;
    rows.push([
      { text:k, options:{ bold:true, fontSize:19, color:hot?GR:INK, fill:{color:bg} } },
      { text:q, options:{ fontSize:hot?16:15, bold:hot, color:INK2, fill:{color:bg} } },
      { text:got, options:{ bold:true, fontSize:16, color:hot?GR:AM, fill:{color:bg} } },
      { text:res, options:{ bold:hot, fontSize:hot?16:14, color:hot?GR:GRAY, fill:{color:bg} } }
    ]);
  });
  tbl(s,rows,{y:1.80,colW:[1.85,3.60,4.35,2.43],rowH:0.78});
  box(s,P,4.75,W,1.12,{fill:AML,line:AMB,lw:2});
  T(s,[{text:'첫 번째가 ',options:{color:INK}},{text:'장비',options:{color:INK}},
       {text:'를 남기고, 두 번째가 ',options:{color:INK}},{text:'데이터',options:{color:INK}},
       {text:'를 남겼고,\n',options:{color:INK}},
       {text:'세 번째가 그 둘을 쓸 수 있게 만들었습니다.',options:{color:AM}}],
    {x:P+0.3,y:4.75,w:W-0.6,h:1.12,fontSize:20,bold:true,align:'center',valign:'middle',lsm:1.4});
  box(s,P,6.00,W,0.92,{fill:PPL,line:PPB,lw:2});
  T(s,[{text:'AI로 ',options:{color:INK}},{text:'만들려다',options:{color:INK}},
       {text:' 두 번 실패하고, AI로 ',options:{color:INK}},{text:'묻기 시작하자',options:{color:PP}},
       {text:' 달라졌습니다.',options:{color:INK}}],
    {x:P+0.3,y:6.00,w:W-0.6,h:0.92,fontSize:21,bold:true,align:'center',valign:'middle'});
}

// ════════════════════════════════════════════════════
// 37 · 오성철강은 무엇이 되었나
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'8부 · 그래서 오성철강은 무엇이 되었나','gr');
  const cw=5.95, gap=0.35;
  box(s,P,1.25,cw,3.85,{fill:GRL,line:GRB,lw:2});
  T(s,'1)',{x:P+0.30,y:1.38,w:1.2,h:0.62,fontSize:32,bold:true,color:GR});
  T(s,[{text:'생산성 높은 장비에 걸맞는\n',options:{color:INK}},
       {text:'완벽한 품질 기술',options:{color:GR}},{text:'을 확보했습니다',options:{color:INK}}],
    {x:P+0.30,y:2.05,w:cw-0.6,h:1.05,fontSize:22,bold:true,lsm:1.3});
  T(s,[{text:'장비는 첫 번째 시도에서 샀습니다. 그런데 ',options:{}},
       {text:'그 장비를 제대로 쓰는 기술이 없었습니다.\n\n',options:{bold:true,color:INK}},
       {text:'지금은 있습니다 — 공정 표준화, 설정 불량 제거, 전수 검증, 데이터 자체의 검증.\n\n',options:{}},
       {text:'그리고 외주로 산 게 아니라 직접 만들었기 때문에, 계속 고칠 수 있습니다.',options:{bold:true,color:INK}}],
    {x:P+0.30,y:3.22,w:cw-0.6,h:1.75,fontSize:14.5,lsm:1.5});
  const x2=P+cw+gap;
  box(s,x2,1.25,cw,3.85,{fill:PPL,line:PPB,lw:2});
  T(s,'2)',{x:x2+0.30,y:1.38,w:1.2,h:0.62,fontSize:32,bold:true,color:PP});
  T(s,[{text:'이 차별화 기술로\n',options:{color:INK}},
       {text:'24시간 쉬지 않는 서비스 회사',options:{color:PP}},{text:'로 거듭납니다',options:{color:INK}}],
    {x:x2+0.30,y:2.05,w:cw-0.6,h:1.05,fontSize:22,bold:true,lsm:1.3});
  T(s,[{text:'고객이 밤에 주문을 넣고, 진행 상황을 보고, 품질 결과를 확인합니다.\n\n',options:{}},
       {text:'사람이 응대하지 않아도 됩니다. 기록이 응대합니다.\n\n',options:{bold:true,color:INK}},
       {text:'이건 직원 12명 회사가 ',options:{}},
       {text:'인력을 늘리지 않고 영업시간을 세 배로 늘리는 유일한 방법',options:{bold:true,color:INK}},
       {text:'입니다.',options:{}}],
    {x:x2+0.30,y:3.22,w:cw-0.6,h:1.75,fontSize:14.5,lsm:1.5});
  darkBar(s,5.32,[{text:'오성철강은 이제 철판을 자르는 회사가 아닙니다.\n',options:{}},
                  {text:'철판을 자르고, 그 결과를 증명하고, 24시간 답하는 회사입니다.',options:{color:YEL}}],1.55);
}

// ════════════════════════════════════════════════════
// 38 · 장비 vs 서비스
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'8부 · 그리고 이게 가격 경쟁에서 벗어나는 길입니다','gr');
  H(s,[{text:'장비는 ',options:{}},{text:'낮에만',options:{color:GRAY}},
       {text:' 돕니다. 서비스는 ',options:{}},{text:'24시간',options:{color:PP}},
       {text:' 돕니다.',options:{}}],{y:0.92,h:0.62});
  T(s,'장비 · 사람',{x:P,y:1.82,w:2.0,h:0.3,fontSize:14,bold:true,color:GRAY});
  rect(s,P,2.18,W,0.58,{fill:'F2F4F7',lw:1.5});
  rect(s,P+4.30,2.18,2.80,0.58,{fill:GRAY2,line:null});
  T(s,'09:00 – 18:00',{x:P+4.30,y:2.18,w:2.80,h:0.58,fontSize:15,bold:true,color:WHITE,align:'center',valign:'middle'});
  T(s,'멈춤',{x:P+1.4,y:2.18,w:1.5,h:0.58,fontSize:13,bold:true,color:GRAY2,align:'center',valign:'middle'});
  T(s,'멈춤',{x:P+8.4,y:2.18,w:1.5,h:0.58,fontSize:13,bold:true,color:GRAY2,align:'center',valign:'middle'});
  T(s,'서비스 · 기록',{x:P,y:3.05,w:2.2,h:0.3,fontSize:14,bold:true,color:PP});
  rect(s,P,3.41,W,0.62,{fill:PP,line:null});
  T(s,'00:00 — 24:00 · 쉬지 않습니다',{x:P,y:3.41,w:W,h:0.62,fontSize:17,bold:true,color:WHITE,align:'center',valign:'middle'});
  T(s,'새벽에도',{x:P+0.6,y:3.41,w:1.4,h:0.62,fontSize:12,bold:true,color:PPB,align:'center',valign:'middle'});
  T(s,'주말에도',{x:P+10.2,y:3.41,w:1.4,h:0.62,fontSize:12,bold:true,color:PPB,align:'center',valign:'middle'});
  box(s,P,4.40,W,2.12,{fill:GRL,line:GRB,lw:2});
  T(s,[{text:'코일센터는 단가와 납기로만 비교됩니다. 그건 사실입니다.\n\n',options:{color:INK2}},
       {text:'그런데 고객이 ',options:{color:INK2}},
       {text:'밤에 확인할 수 있고, 품질 결과를 받아보고, 재고를 맡겨두고 있으면',options:{bold:true,color:INK}},
       {text:' —\n',options:{color:INK2}},
       {text:'단가 몇 % 차이로는 옮기지 않습니다. 옮기면 이 전부를 잃기 때문입니다.',
        options:{bold:true,color:GR,fontSize:23}}],
    {x:P+0.35,y:4.40,w:W-0.7,h:2.12,fontSize:18,bold:true,valign:'middle',lsm:1.5});
}

// ════════════════════════════════════════════════════
// 39 · 진단 (진도)
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'9부 · 냉정한 진단 — 지금 어디까지 왔나','rd');
  H(s,'두 질문의 진도',{y:0.92,h:0.62});
  const cw=4.30, gap=0.28;
  // ①
  let x=P;
  box(s,x,1.80,cw,3.95,{fill:GRL,line:GRB,lw:2});
  pill(s,x+0.22,1.96,'질문 ① 우리는 무엇을 모르는가','g');
  T(s,[{text:'70',options:{fontSize:56}},{text:'%',options:{fontSize:30}}],
    {x:x+0.22,y:2.42,w:cw-0.44,h:1.0,bold:true,color:GR});
  bar(s,x+0.22,3.52,cw-0.44,70,GR,0.22);
  T(s,[{text:'완벽한 품질과 기술 내재화는 얻었습니다.\n',options:{bold:true,color:INK}},
       {text:'판정하는 ',options:{}},{text:'표준이 없는 것',options:{bold:true,color:INK}},
       {text:'이 남았습니다.',options:{}}],
    {x:x+0.22,y:3.92,w:cw-0.44,h:1.55,fontSize:14.5,lsm:1.5});
  // ②
  x=P+cw+gap;
  box(s,x,1.80,cw,3.95,{fill:RDL,line:RDB,lw:2});
  pill(s,x+0.22,1.96,'질문 ② 고객은 무엇을 원하는가','r');
  T(s,[{text:'20',options:{fontSize:56}},{text:'%',options:{fontSize:30}}],
    {x:x+0.22,y:2.42,w:cw-0.44,h:1.0,bold:true,color:RD});
  bar(s,x+0.22,3.52,cw-0.44,20,RD,0.22);
  T(s,[{text:'답은 찾았고 기능도 거의 만들었습니다.\n',options:{}},
       {text:'그런데 고객에게 나간 것이 하나도 없습니다.\n',options:{bold:true,color:RD}},
       {text:'24시간 창구가 아직 닫혀 있습니다.',options:{}}],
    {x:x+0.22,y:3.92,w:cw-0.44,h:1.55,fontSize:14.5,lsm:1.5});
  // 41개 상태
  x=P+2*(cw+gap);
  const cw3=W-2*(cw+gap);
  box(s,x,1.80,cw3,3.95);
  pill(s,x+0.20,1.96,'41개의 실제 상태','n');
  const st=[['보는 도구','24',false],['추천 도구','5',false],['현장이 값을 넣는 도구','4',false],
            ['고객에게 나가는 것','3  전부 시연용',true],['주문접수 자동화','4  실배포 0',true]];
  st.forEach(([k,v,hot],i)=>{
    const y=2.42+i*0.48;
    if(hot) rect(s,x+0.12,y-0.04,cw3-0.24,0.46,{fill:RDL,line:null});
    T(s,k,{x:x+0.20,y,w:1.95,h:0.36,fontSize:12.5,color:INK2});
    T(s,v,{x:x+cw3-1.85,y:y-0.02,w:1.65,h:0.40,fontSize:hot?12:16,bold:true,
           color:hot?RD:INK,align:'right'});
    if(!hot) rect(s,x+0.20,y+0.40,cw3-0.40,0.014,{fill:LINE,line:null});
  });
  box(s,x+0.20,4.92,cw3-0.40,0.72,{fill:RDL,line:RDB,lw:2});
  T(s,[{text:'현장에 매일 상주하는 것은\n',options:{color:INK}},
       {text:'2개뿐입니다.',options:{color:RD}}],
    {x:x+0.30,y:4.92,w:cw3-0.60,h:0.72,fontSize:14,bold:true,valign:'middle',lsm:1.3});
  box(s,P,5.95,W,0.92,{fill:PPL,line:PPB,lw:2});
  T(s,[{text:'24시간 서비스 회사라고 말할 수 있으려면, ',options:{color:INK}},
       {text:'두 번째 질문을 80%까지 올려야 합니다.',options:{color:PP}}],
    {x:P+0.3,y:5.95,w:W-0.6,h:0.92,fontSize:20,bold:true,align:'center',valign:'middle'});
}

// ════════════════════════════════════════════════════
// 40 · 로드맵
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'10부 · 그래서 무엇부터 하나');
  H(s,[{text:'새로 만들지 않습니다 — ',options:{}},
       {text:'이미 만든 것을 쓰이게 만듭니다',options:{color:PP}}],{y:0.92,h:0.62});
  const cw=3.92, gap=0.28;
  const cols=[
    ['1~3개월','신규 개발 없음',null,LINE,WHITE,
     ['센서 배선 수리 · 카메라 고정','코일 번호 태깅 100%','외부 검사 두께 측정 가동 요구',
      '품질이력 ↔ 작업데이터 연결','되는 도구 3개를 현장 상주로'],
     ['전부 ① 데이터 구멍 막기','a'], PP],
    ['3~6개월','기준선을 만들고 창구를 엽니다',null,PPB,PPL,
     ['사양별 표준값 확정·문서화','화면에 판정·경고 + 이유 한 줄','포털을 시연용 → 실서비스 (1곳)',
      '품질 결과 1호 발행 (3개월 무료)','완료 예정시각 정확도 2개월 측정','매일 저녁 자동 마감 리포트'],
     ['못 맞히는 예측은 안 보여주는 것보다 나쁩니다','r'], PP],
    ['6~12개월','24시간을 완성하고 값을 받습니다',null,GRB,GRL,
     ['24시간 발주 실배포 (시험판 4개)','품질 결과 전 거래처 + 상세본 유상화',
      '24시간 조회·품질을 계약서에 명시','분쟁 판별 리포트 표준 양식',
      '보관 대행 1개 거래처 요율 계약','작업 표준서 화면 — 정년 전에'],
     null, GR]];
  cols.forEach(([lab,ttl,_,line,fill,items,note,bc],i)=>{
    const x=P+i*(cw+gap);
    box(s,x,1.80,cw,4.60,{fill,line,lw:fill===WHITE?1.75:2});
    pill(s,x+0.22,1.96,lab,i===0?'n':(i===1?'p':'g'));
    T(s,ttl,{x:x+0.22,y:2.40,w:cw-0.44,h:0.62,fontSize:16,bold:true,color:INK,lsm:1.2});
    items.forEach((it,j)=>{
      const y=3.08+j*0.48;
      s.addShape(pptx.ShapeType.roundRect,{x:x+0.24,y:y+0.10,w:0.11,h:0.11,rectRadius:0.03,
        fill:{color:bc},line:{type:'none'}});
      T(s,it,{x:x+0.48,y,w:cw-0.72,h:0.46,fontSize:12.5,lsm:1.35});
    });
    if(note) pill(s,x+0.22,5.98,note[0],note[1],cw-0.44);
  });
}

// ════════════════════════════════════════════════════
// 41 · 지표
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'11부 · 1년 뒤에 이걸로 확인해 주십시오');
  const cw=5.95, gap=0.35;
  // ①
  box(s,P,1.20,cw,4.55);
  pill(s,P+0.22,1.36,'① 품질과 기술이 단단해졌는지','p');
  const r1=[[TH('지표'),TH('지금'),TH('1년 뒤')]];
  [['표준값 있는 사양','0%','주요 80%'],['표준 이탈률','측정 안 됨','측정+하락'],
   ['데이터 결측률','구간별 존재','3% 이하'],['코일번호 태깅률','미완','100%'],
   ['셋업 시간','측정 안 됨','측정+하락'],['재작업·클레임','기록 산재','집계+하락']]
   .forEach(([a,b,c])=>{ r1.push([
     {text:a,options:{fontSize:13.5,color:INK2}},
     {text:b,options:{fontSize:12.5,color:GRAY}},
     {text:c,options:{fontSize:13.5,bold:true,color:INK}}]); });
  tbl(s,r1,{x:P+0.22,y:1.80,w:cw-0.44,colW:[2.60,1.42,1.49],rowH:0.44,fontSize:13});
  T(s,'"측정 안 됨 → 측정됨"도 성과입니다.',
    {x:P+0.22,y:5.28,w:cw-0.44,h:0.32,fontSize:13.5,bold:true,color:INK});
  // ②
  const x2=P+cw+gap;
  box(s,x2,1.20,cw,4.55,{fill:GRL,line:GRB,lw:2});
  pill(s,x2+0.22,1.36,'② 24시간이 실제로 열렸는지','g');
  const r2=[[TH('지표'),TH('지금'),TH('1년 뒤')]];
  [['24시간 창구 쓰는 거래처','0 (시연만)','5곳+',false],
   ['업무시간 외 접속 비율','0%','30%+',true],
   ['온라인 발주 비율','0%','30%+',false],
   ['품질 결과 받는 거래처','0곳','5곳+',false],
   ['진행 문의 전화 건수','현재 수준','감소',false],
   ['서비스 적힌 견적서','0%','100%',false]]
   .forEach(([a,b,c,hot])=>{ r2.push([
     {text:a,options:{fontSize:hot?14:13.5,bold:hot,color:INK2,fill:{color:hot?WHITE:GRL}}},
     {text:b,options:{fontSize:12.5,color:GRAY,fill:{color:hot?WHITE:GRL}}},
     {text:c,options:{fontSize:hot?15:13.5,bold:true,color:hot?GR:INK,fill:{color:hot?WHITE:GRL}}}]); });
  tbl(s,r2,{x:x2+0.22,y:1.80,w:cw-0.44,colW:[2.75,1.32,1.44],rowH:0.44,fontSize:13});
  box(s,x2+0.22,5.10,cw-0.44,0.55);
  T(s,[{text:'밤·주말에 고객이 들어오면 진짜 24시간 회사, 낮에만 들어오면 ',options:{color:INK}},
       {text:'화면 하나 더 만든 것',options:{color:RD}},{text:'입니다.',options:{color:INK}}],
    {x:x2+0.32,y:5.10,w:cw-0.64,h:0.55,fontSize:12,bold:true,valign:'middle'});
  darkBar(s,5.95,[{text:'가공 외 매출  ',options:{}},{text:'0원',options:{color:RDB}},
                  {text:'  →  ',options:{}},{text:'0원이 아니게',options:{color:YEL}},
                  {text:'\n',options:{}},
                  {text:'1원과 0원의 차이가, 1,000만 원과 1,100만 원의 차이보다 큽니다.',
                   options:{fontSize:15,color:'D0D5DD'}}],0.92);
}

// ════════════════════════════════════════════════════
// 42 · 4,000곳
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'12부 · 이건 저희만의 이야기가 아닙니다','bl');
  H(s,[{text:'반월시화에는 저희 같은 공장이 ',options:{}},{text:'4,000곳',options:{color:PP}},
       {text:' 있습니다',options:{}}],{y:0.92,h:0.62});
  const cw=5.95, gap=0.35;
  box(s,P,1.80,cw,3.55);
  T(s,[{text:'저는 통신회사에서 30년 가까이 IT를 했습니다.\n',options:{}},
       {text:'그런 저도 AI 이전에는 못 했습니다.\n',options:{bold:true,color:RD}},
       {text:'데이터를 두고도 못 했습니다. 두 번 실패했습니다.\n\n',options:{}},
       {text:'그런데 AI가 나오자 ',options:{}},{text:'물어볼 수 있게 됐습니다.',options:{bold:true,color:INK}},
       {text:' 그게 전부였습니다.',options:{}}],
    {x:P+0.28,y:2.00,w:cw-0.56,h:1.75,fontSize:16,lsm:1.55});
  box(s,P+0.28,3.92,cw-0.56,1.25,{fill:PPL,line:PPB,lw:2});
  T(s,[{text:'이 말은,\n',options:{color:INK}},
       {text:'이제 IT 전문가가 아니어도 된다',options:{color:PP}},{text:'는 뜻입니다.',options:{color:INK}}],
    {x:P+0.45,y:3.92,w:cw-0.90,h:1.25,fontSize:21,bold:true,valign:'middle',lsm:1.4});
  // 우측 — 순서 도해
  const x2=P+cw+gap;
  box(s,x2,1.80,cw,3.55,{fill:AML,line:AMB,lw:2});
  pill(s,x2+0.25,1.96,'왜 외주로는 안 되나','a');
  const chain=['직접 물음','직접 만듦','며칠 만에 고침','실제로 쓰임'];
  const bw=(cw-0.5-0.45)/4;
  chain.forEach((t,i)=>{
    const bx2=x2+0.25+i*(bw+0.15);
    box(s,bx2,2.46,bw,0.72,{fill:i===3?GRL:WHITE,line:i===3?GR:AMB,lw:i===3?2:1.5});
    T(s,t,{x:bx2+0.04,y:2.46,w:bw-0.08,h:0.72,fontSize:11,bold:true,
           color:i===3?GR:INK,align:'center',valign:'middle',lsm:1.2});
    if(i<3) T(s,'›',{x:bx2+bw,y:2.60,w:0.15,h:0.4,fontSize:14,bold:true,color:AM,align:'center'});
  });
  box(s,x2+0.25,3.34,cw-0.5,0.58,{fill:GRL,line:GR,lw:2});
  T(s,'기록이 쌓임 → 고객에게 답할 근거',
    {x:x2+0.25,y:3.34,w:cw-0.5,h:0.58,fontSize:13,bold:true,color:GR,align:'center',valign:'middle'});
  T(s,[{text:'외주를 줬다면 이 순서가 성립하지 않았을 겁니다.',options:{bold:true,color:INK}},
       {text:' 질문 하나를 확인하는 데 견적서부터 받아야 했을 테니까요. ',options:{}},
       {text:'그리고 저희는 무엇을 물어야 할지 처음부터 알지도 못했습니다.',options:{bold:true,color:RD}}],
    {x:x2+0.25,y:4.10,w:cw-0.5,h:1.10,fontSize:14,lsm:1.45});
  darkBar(s,5.58,[{text:'4,000곳 전부 회사도 오래되고, 기계도 오래되고, 사람도 오래되었습니다.\n',options:{}},
                  {text:'그리고 전부, 쓰지 못하고 쌓아둔 데이터를 갖고 있습니다. 전부, 아침 아홉 시에만 열립니다.',
                   options:{color:YEL,fontSize:17}}],1.30);
}

// ════════════════════════════════════════════════════
// 43 · 요청
// ════════════════════════════════════════════════════
{ const s=S();
  tag(s,'12부 · 요청드립니다');
  H(s,'「자체개발형 AI 모델공장」 시범 지정',{y:0.92,h:0.62});
  box(s,P,1.72,W,0.88,{fill:PPL,line:PPB,lw:2});
  T(s,[{text:'솔루션을 사주는 지원이 아니라, ',options:{color:INK}},
       {text:'공장이 직접 물어볼 수 있는 역량',options:{color:PP}},
       {text:'에 투자하는 지원입니다.',options:{color:INK}}],
    {x:P+0.3,y:1.72,w:W-0.6,h:0.88,fontSize:20,bold:true,align:'center',valign:'middle'});
  const cw=3.92, gap=0.28;
  // 인력
  let x=P;
  box(s,x,2.78,cw,3.30);
  T(s,'2명',{x:x+0.25,y:2.92,w:cw-0.5,h:0.65,fontSize:34,bold:true,color:PP});
  T(s,'전담 인력',{x:x+0.25,y:3.62,w:cw-0.5,h:0.38,fontSize:18,bold:true,color:INK});
  T(s,'데이터를 다룰 한 명,\n현장에 적용할 한 명.',
    {x:x+0.25,y:4.04,w:cw-0.5,h:0.65,fontSize:14,lsm:1.45});
  box(s,x+0.25,4.78,cw-0.5,1.18,{fill:RDL,line:RDB,lw:2});
  T(s,[{text:'지금 이 41개를 ',options:{color:INK}},{text:'저 혼자',options:{color:RD}},
       {text:' 만들고 있습니다. 혼자서도 여기까지 왔습니다. ',options:{color:INK}},
       {text:'혼자가 아니면 어디까지 갈 수 있을지 확인하고 싶습니다.',options:{color:INK}}],
    {x:x+0.36,y:4.84,w:cw-0.72,h:1.06,fontSize:12.5,bold:true,lsm:1.4});
  // 예산
  x=P+cw+gap;
  box(s,x,2.78,cw,3.30);
  T(s,'실증',{x:x+0.25,y:2.92,w:cw-0.5,h:0.65,fontSize:34,bold:true,color:PP});
  T(s,'예산',{x:x+0.25,y:3.62,w:cw-0.5,h:0.38,fontSize:18,bold:true,color:INK});
  T(s,[{text:'남은 공정의 품질측정을 완성해 ',options:{}},
       {text:'24시간 품질 결과 제공을 끝까지 완성',options:{bold:true,color:INK}},
       {text:'하고,\n\n저희가 만든 것을 ',options:{}},
       {text:'다른 공장도 쓸 수 있는 형태로',options:{bold:true,color:INK}},
       {text:' 정리하는 데 쓰겠습니다.',options:{}}],
    {x:x+0.25,y:4.04,w:cw-0.5,h:1.85,fontSize:14,lsm:1.5});
  // 확산
  x=P+2*(cw+gap);
  box(s,x,2.78,cw,3.30);
  T(s,'확산',{x:x+0.25,y:2.92,w:cw-0.5,h:0.65,fontSize:34,bold:true,color:PP});
  T(s,'채널',{x:x+0.25,y:3.62,w:cw-0.5,h:0.38,fontSize:18,bold:true,color:INK});
  T(s,[{text:'산업단지 안에 ',options:{}},{text:'공개 실증장',options:{bold:true,color:INK}},
       {text:'을 열어 다른 공장이 보러 오게 하고, ',options:{}},
       {text:'교육 프로그램',options:{bold:true,color:INK}},{text:'을 운영하겠습니다.',options:{}}],
    {x:x+0.25,y:4.04,w:cw-0.5,h:1.25,fontSize:14,lsm:1.5});
  let bx=x+0.25;
  bx += pill(s,bx,5.42,'2027 시범','p')+0.14;
  pill(s,bx,5.42,'2028 반월시화 확대','g');
}

// ════════════════════════════════════════════════════
// 44 · 클로징
// ════════════════════════════════════════════════════
{ const s=S();
  T(s,'오디세우스는 고향으로 돌아오는 데 20년이 걸렸다고 합니다.',
    {x:P,y:0.62,w:W,h:0.38,fontSize:17,bold:true,color:INK2,align:'center'});
  T(s,[{text:'저는 ',options:{color:INK}},{text:'30년',options:{color:PP}},
       {text:'이 걸렸습니다.',options:{color:INK}}],
    {x:P,y:1.04,w:W,h:0.55,fontSize:27,bold:true,align:'center'});
  const cw=5.95, gap=0.35;
  box(s,P,1.78,cw,2.48);
  T(s,'밖에서 배운 것',{x:P+0.25,y:1.90,w:cw-0.5,h:0.28,fontSize:12,color:GRAY});
  T(s,'모든 장비를 연결하고, 실시간으로 지켜보고, 누구나 할 수 있게 기준을 만들고, 문제가 생기면 원인을 분석해 다시는 안 생기게 하는 것.',
    {x:P+0.25,y:2.24,w:cw-0.5,h:1.00,fontSize:13.5,lsm:1.5});
  T(s,[{text:'그리고 ',options:{color:INK}},{text:'통신망은 24시간 돕니다.',options:{color:PP}},
       {text:'   사람이 자는 동안에도.',options:{color:GRAY,fontSize:13}}],
    {x:P+0.25,y:3.44,w:cw-0.5,h:0.55,fontSize:16,bold:true,lsm:1.35});
  const x2=P+cw+gap;
  box(s,x2,1.78,cw,2.48,{fill:AML,line:AMB,lw:2});
  T(s,'두 번의 실패는 헛되지 않았습니다',{x:x2+0.25,y:1.90,w:cw-0.5,h:0.28,fontSize:12,color:GRAY});
  T(s,[{text:'첫 번째는 ',options:{color:INK}},{text:'장비',options:{color:AM}},
       {text:'를 남겼고, 두 번째는 ',options:{color:INK}},{text:'데이터',options:{color:AM}},
       {text:'를 남겼습니다.\n그리고 AI가 그 데이터에 ',options:{color:INK}},
       {text:'물어볼 방법',options:{color:INK}},{text:'을 가져다주었습니다.',options:{color:INK}}],
    {x:x2+0.25,y:2.24,w:cw-0.5,h:1.96,fontSize:14,bold:true,lsm:1.5});
  box(s,P,4.38,cw,1.02,{fill:GRL,line:GRB,lw:2});
  pill(s,P+0.22,4.49,'질문 ①로','g');
  T(s,'완벽한 품질과, 직접 만들고 고칠 수 있는 기술',
    {x:P+2.10,y:4.38,w:cw-2.3,h:1.02,fontSize:15.5,bold:true,color:INK,valign:'middle',lsm:1.3});
  box(s,x2,4.38,cw,1.02,{fill:PPL,line:PPB,lw:2});
  pill(s,x2+0.22,4.49,'질문 ②로','p');
  T(s,'24시간 쉬지 않는 서비스 회사',
    {x:x2+2.10,y:4.38,w:cw-2.3,h:1.02,fontSize:15.5,bold:true,color:INK,valign:'middle',lsm:1.3});
  T(s,[{text:'그 경기장도 지금 다시 짓고 있습니다. ',options:{}},
       {text:'저희도 다시 짓고 있습니다.',options:{bold:true,color:INK}}],
    {x:P,y:5.52,w:W,h:0.4,fontSize:17,bold:true,align:'center'});
  darkBar(s,6.02,[{text:'AI는 개발이 아니라, ',options:{}},{text:'발견',options:{color:YEL}},
                  {text:'이었습니다.\n',options:{}},
                  {text:'그리고 발견은 질문에서만 나옵니다.',options:{fontSize:19,color:'D0D5DD'}}],1.05);
}

// ════════════════════════════════════════════════════
const OUT = process.argv[2] || '오성철강_산업부장관_발표_v4.pptx';
pptx.writeFile({ fileName: OUT }).then(()=>{
  console.log('✅ 완료: ' + OUT + '  (총 ' + _n + '장)');
}).catch(e=>{ console.error('❌ 실패:', e); process.exit(1); });

