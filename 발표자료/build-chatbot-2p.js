// 고객용 챗봇 서비스 설명 2장 — 오성철강
// 실행: npm install pptxgenjs && node build-chatbot-2p.js
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = '오성철강';
pptx.title = '고객용 챗봇 서비스 — 보유 데이터와 24시간 서비스';

const F='맑은 고딕', P=0.72, W=11.89, SH=7.5;
const NAVY='0B1220', NAVY2='16203A',
      INK='0F172A', INK2='334155', GRAY='64748B', GRAY2='94A3B8',
      LINE='E2E8F0', LINE2='F1F5F9', TINT='F8FAFC', WHITE='FFFFFF',
      IND='4F46E5', INDL='EEF0FF', INDB='C7CBFF',
      GOLD='F5B544', GOLDL='FFF8E8', GOLDB='FBD88B',
      RED='DC2626', REDL='FEF2F2', REDB='FCA5A5',
      GRN='059669', GRNL='ECFDF5', GRNB='6EE7B7';
let _n=0; const SEC={cur:''};

function base(dark){ const s=pptx.addSlide(); if(dark) s.background={color:NAVY}; _n++; return s; }
function foot(s){
  s.addShape(pptx.ShapeType.rect,{x:P,y:6.86,w:W,h:0.012,fill:{color:LINE},line:{type:'none'}});
  if(SEC.cur) s.addText(SEC.cur,{x:P,y:6.96,w:6,h:0.28,fontSize:9.5,bold:true,color:GRAY2,fontFace:F,charSpacing:1.4});
  s.addText('오성철강  ·  '+String(_n).padStart(2,'0'),{x:P+W-3,y:6.96,w:3,h:0.28,
    fontSize:9.5,bold:true,color:GRAY2,align:'right',fontFace:F,charSpacing:1.2});
}
function head(s,kicker,runs,o={}){
  const y=o.y!==undefined?o.y:0.62;
  s.addShape(pptx.ShapeType.rect,{x:P,y:y+0.04,w:0.055,h:0.26,fill:{color:o.acc||IND},line:{type:'none'}});
  s.addText(kicker,{x:P+0.20,y,w:8,h:0.30,fontSize:11.5,bold:true,color:o.acc||IND,fontFace:F,charSpacing:1.6});
  s.addText(runs,{x:P,y:y+0.40,w:o.w||W,h:o.h||0.86,fontSize:o.size||29,bold:true,color:INK,
    fontFace:F,valign:'top',lineSpacingMultiple:1.16});
}
function T(s,t,o={}){ s.addText(t,{fontFace:F,color:o.color||INK2,valign:o.valign||'top',
  lineSpacingMultiple:o.lsm||1.4,...o}); }
function card(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:0.08,
  fill:{color:o.fill||WHITE},
  line:o.line===null?{type:'none'}:{color:o.line||LINE,width:o.lw!==undefined?o.lw:1.5}}); }
function rct(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.rect,{x,y,w,h,fill:{color:o.fill||WHITE},
  line:o.line?{color:o.line,width:o.lw||1.5}:{type:'none'}}); }
function chip(s,x,y,t,kind='n',wf){
  const M={n:[GRAY,TINT,LINE],i:[IND,INDL,INDB],g:[GRN,GRNL,GRNB],r:[RED,REDL,REDB],o:['B45309',GOLDL,GOLDB]};
  const [fg,bg,ln]=M[kind]||M.n; const w=wf||(0.135*t.length+0.40);
  s.addText(t,{x,y,w,h:0.29,fontSize:10.5,bold:true,color:fg,fill:{color:bg},
    line:{color:ln,width:1.2},align:'center',valign:'middle',fontFace:F,
    shape:pptx.ShapeType.roundRect,rectRadius:0.13});
  return w;
}
function arw(s,x1,y1,x2,y2,c=GRAY2,w=1.75){
  s.addShape(pptx.ShapeType.line,{x:Math.min(x1,x2),y:Math.min(y1,y2),
    w:Math.abs(x2-x1)||0.008,h:Math.abs(y2-y1)||0.008,
    line:{color:c,width:w,endArrowType:'triangle'},flipH:x2<x1,flipV:y2<y1});
}
function band(s,y,runs,h=0.92,fill=NAVY){
  s.addShape(pptx.ShapeType.roundRect,{x:P,y,w:W,h,rectRadius:0.08,fill:{color:fill},line:{type:'none'}});
  s.addText(runs,{x:P+0.3,y,w:W-0.6,h,fontSize:18,bold:true,color:WHITE,align:'center',
    valign:'middle',fontFace:F,lineSpacingMultiple:1.3});
}

// ════════════════════════════════════════════════════
// 1 · 우리가 가진 데이터
// ════════════════════════════════════════════════════
SEC.cur='고객용 챗봇 서비스';
{ const s=base();
  head(s,'WHAT WE ALREADY HAVE',
    [{text:'고객 질문에 답할 데이터는 ',options:{}},
     {text:'이미 데이터베이스에 있습니다',options:{color:IND}}]);

  const cw=(W-0.60)/4, cy=1.92, chh=3.40;
  const L=[
    ['거래','그린ERP 미러','작업지시서 · 생산 · 입출고\n재고 · 미출고 · 미수금',
     '10분','주기 자동 동기화','업무시간 08:00–17:40',
     ['"내 물건 지금 어디까지?"','"이번 달 미출고 얼마?"','"맡긴 재고 몇 코일?"'],IND,INDL,INDB],
    ['공정','PLC 실측','속도 · 절단길이 · 사이클타임\n가동/정지 · 부하율',
     '182만','행 누적','2초마다 1행 자동 기록',
     ['"그 코일 중단된 적 있나?"','"어떤 조건으로 가공됐나?"','"몇 시에 끝나나?"'],GRN,GRNL,GRNB],
    ['품질','AI 비전 전수검사','표면 결함 위치 · 전후 영상\n두께 실측 프로파일',
     '전수','샘플 아님','모든 코일 · 매일',
     ['"표면 결함 있었나?"','"우리 잘못인가 원래 그랬나?"','"두께 편차 얼마?"'],GOLD,GOLDL,GOLDB],
    ['설비','센서 · 카메라 OCR','장력 6개 값 · 코일 외경\n인식 신뢰도',
     '1분','주기 수집','노후 장비도 카메라로',
     ['"장력은 적정했나?"','"설비 이상 없었나?"'],GRAY,TINT,LINE],
  ];
  L.forEach(([lab,src,cols,num,numl,note,qs,c,bg,bd],i)=>{
    const x=P+i*(cw+0.20);
    card(s,x,cy,cw,chh,{fill:WHITE,line:LINE});
    rct(s,x,cy,cw,0.055,{fill:c});
    T(s,lab,{x:x+0.22,y:cy+0.18,w:cw-0.44,h:0.36,fontSize:19,bold:true,color:c});
    T(s,src,{x:x+0.22,y:cy+0.56,w:cw-0.44,h:0.24,fontSize:10.5,bold:true,color:GRAY,charSpacing:0.4});
    T(s,cols,{x:x+0.22,y:cy+0.86,w:cw-0.44,h:0.62,fontSize:11.5,color:INK2,lsm:1.4});
    rct(s,x+0.22,cy+1.56,cw-0.44,0.012,{fill:LINE});
    T(s,[{text:num,options:{fontSize:24}},{text:'  '+numl,options:{fontSize:10,color:GRAY}}],
      {x:x+0.22,y:cy+1.68,w:cw-0.44,h:0.46,bold:true,color:INK});
    T(s,note,{x:x+0.22,y:cy+2.20,w:cw-0.44,h:0.24,fontSize:9.5,color:GRAY2});
    card(s,x+0.22,cy+2.52,cw-0.44,0.76,{fill:bg,line:bd,lw:1.2});
    T(s,qs.map(q=>q).join('\n'),{x:x+0.32,y:cy+2.50,w:cw-0.64,h:0.78,fontSize:8.5,bold:true,
      color:c===GOLD?'B45309':(c===GRAY?INK2:c),valign:'middle',lsm:1.35});
  });

  // 합계 줄
  card(s,P,5.50,W,0.80,{fill:TINT,line:LINE});
  const st=[['187만 건','전체 데이터 자산'],['4개 계층','거래·공정·품질·설비'],
            ['30개','실데이터 가동 서비스'],['0건','외주 개발']];
  st.forEach(([v,l],i)=>{
    const x=P+0.30+i*((W-0.60)/4);
    T(s,[{text:v,options:{fontSize:17,color:IND}},{text:'   '+l,options:{fontSize:11,color:GRAY}}],
      {x,y:5.50,w:(W-0.60)/4,h:0.80,bold:true,valign:'middle'});
  });
  band(s,6.42,[{text:'네 계층이 ',options:{}},{text:'코일번호 하나로 연결',options:{color:GOLD}},
               {text:'됩니다. 한 번의 질문에 네 가지를 함께 답합니다.',options:{}}],0.44);
  foot(s);
}

// ════════════════════════════════════════════════════
// 2 · 챗봇 24시간 서비스
// ════════════════════════════════════════════════════
{ const s=base();
  head(s,'24/7 CUSTOMER SERVICE',
    [{text:'고객이 ',options:{}},{text:'밤에 물어도',options:{color:IND}},
     {text:' 기록이 답합니다',options:{}}]);

  // ── 폰 목업 ──
  const px=P, py=1.96, pw=2.86, ph=4.30;
  card(s,px,py,pw,ph,{fill:NAVY,line:null});
  rct(s,px+0.13,py+0.46,pw-0.26,ph-0.60,{fill:WHITE});
  T(s,'오성철강 문의',{x:px+0.18,y:py+0.10,w:1.8,h:0.28,fontSize:9.5,bold:true,color:WHITE});
  T(s,'23:41',{x:px+pw-0.86,y:py+0.10,w:0.70,h:0.28,fontSize:9,bold:true,color:GOLD,align:'right'});

  // 대화 1
  card(s,px+0.26,py+0.56,pw-0.66,0.38,{fill:LINE2,line:null});
  T(s,'1622057 어디까지 왔어요?',{x:px+0.36,y:py+0.56,w:pw-0.86,h:0.38,fontSize:8,bold:true,
    color:INK,valign:'middle'});
  card(s,px+0.40,py+1.02,pw-0.66,0.82,{fill:INDL,line:null});
  T(s,[{text:'레벨링 라인에서 가공 중입니다. 62% 진행, ',options:{}},
       {text:'완료 예정 01:40',options:{bold:true}},
       {text:'.\n현재 속도 24 MPM · 표준 범위 내.',options:{}}],
    {x:px+0.50,y:py+1.06,w:pw-0.86,h:0.74,fontSize:7.5,color:INK,lsm:1.3});

  // 대화 2
  card(s,px+0.26,py+1.96,pw-0.66,0.38,{fill:LINE2,line:null});
  T(s,'중단된 적 있나요?',{x:px+0.36,y:py+1.96,w:pw-0.86,h:0.38,fontSize:8,bold:true,
    color:INK,valign:'middle'});
  card(s,px+0.40,py+2.42,pw-0.66,0.96,{fill:INDL,line:null});
  T(s,[{text:'1,240 m 지점에서 ',options:{}},{text:'4분 정지',options:{bold:true}},
       {text:' 후 재가동했습니다. 해당 구간 표면 검사는 ',options:{}},
       {text:'이상 없음',options:{bold:true}},{text:'.\n\n',options:{}},
       {text:'근거 · LEVELING_DATA 2,140행',options:{fontSize:6.5,color:IND}}],
    {x:px+0.50,y:py+2.46,w:pw-0.86,h:0.88,fontSize:7.5,color:INK,lsm:1.3});

  // 대화 3
  card(s,px+0.26,py+3.50,pw-0.66,0.38,{fill:LINE2,line:null});
  T(s,'미수금도 알려주세요',{x:px+0.36,y:py+3.50,w:pw-0.86,h:0.38,fontSize:8,bold:true,
    color:INK,valign:'middle'});
  chip(s,px+0.40,py+3.82,'사람이 응대하지 않습니다','o',1.85);

  // ── 우측: 질문 유형 × 근거 ──
  const rx=P+pw+0.34, rw=W-pw-0.34;
  T(s,'고객이 묻는 것  ×  답의 근거',{x:rx,y:py-0.02,w:rw,h:0.26,fontSize:10.5,bold:true,
    color:GRAY2,charSpacing:0.8});
  const rows=[
    ['진행 상황','지금 어디까지 · 몇 시에 끝나나','거래 + 공정',IND],
    ['작업 이력','중단 여부 · 어떤 조건으로 가공','공정',GRN],
    ['품질 결과','표면 결함 · 두께 편차 · 판정','품질 + 공정','B45309'],
    ['거래 내역','미출고 · 미수금 · 맡긴 재고','거래',IND],
    ['귀책 판별','원소재 결함인가 가공 결함인가','품질 + 공정 + 설비',RED],
  ];
  const rh=0.56;
  rows.forEach(([k,q,src,c],i)=>{
    const y=py+0.32+i*(rh+0.08);
    card(s,rx,y,rw,rh,{fill:i===4?REDL:WHITE,line:i===4?REDB:LINE});
    rct(s,rx,y,0.05,rh,{fill:c});
    T(s,k,{x:rx+0.24,y,w:1.55,h:rh,fontSize:13,bold:true,color:c,valign:'middle'});
    T(s,q,{x:rx+1.86,y,w:rw-4.10,h:rh,fontSize:11.5,color:INK2,valign:'middle'});
    T(s,src,{x:rx+rw-2.20,y,w:1.96,h:rh,fontSize:10,bold:true,color:GRAY,
      align:'right',valign:'middle'});
  });

  // 24시간 대비
  const by=py+0.32+5*(rh+0.08)+0.10;
  T(s,'사람 응대',{x:rx,y:by,w:1.5,h:0.28,fontSize:10.5,bold:true,color:GRAY});
  rct(s,rx+1.60,by,rw-1.60,0.26,{fill:LINE2});
  rct(s,rx+1.60+(rw-1.60)*0.375,by,(rw-1.60)*0.25,0.26,{fill:GRAY2});
  T(s,'09:00 – 18:00',{x:rx+1.60+(rw-1.60)*0.375,y:by,w:(rw-1.60)*0.25,h:0.26,fontSize:9,
    bold:true,color:WHITE,align:'center',valign:'middle'});
  T(s,'기록 응대',{x:rx,y:by+0.40,w:1.5,h:0.28,fontSize:10.5,bold:true,color:IND});
  rct(s,rx+1.60,by+0.40,rw-1.60,0.26,{fill:IND});
  T(s,'00:00 — 24:00   쉬지 않습니다',{x:rx+1.60,y:by+0.40,w:rw-1.60,h:0.26,fontSize:9.5,
    bold:true,color:WHITE,align:'center',valign:'middle'});

  band(s,6.34,[{text:'직원 12명 회사가 ',options:{}},
               {text:'인력을 늘리지 않고 응대 시간을 세 배로',options:{color:GOLD}},
               {text:' 늘리는 유일한 방법입니다.',options:{}}],0.46);
  foot(s);
}

const OUT = process.argv[2] || '오성철강_고객챗봇_2장.pptx';
pptx.writeFile({ fileName: OUT }).then(()=>{
  console.log('✅ 완료: ' + OUT + '  (총 ' + _n + '장)');
}).catch(e=>{ console.error('❌ 실패:', e); process.exit(1); });
