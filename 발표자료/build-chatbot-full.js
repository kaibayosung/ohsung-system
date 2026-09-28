// 고객용 챗봇 서비스 제안 (확장판) — 오성철강
// 실행: npm install pptxgenjs && node build-chatbot-full.js
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = '오성철강';
pptx.title = '챗봇 하나로, 오성철강의 모든 서비스';

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
// 1 · 표지
// ════════════════════════════════════════════════════
SEC.cur='고객용 챗봇 서비스';
{ const s=base(true);
  rct(s,0,0,0.14,SH,{fill:IND});
  rct(s,P,1.20,1.30,0.045,{fill:GOLD});
  T(s,'고객 서비스 제안',{x:P,y:1.50,w:8,h:0.34,fontSize:13,bold:true,color:GOLD,charSpacing:2.2});
  T(s,[{text:'챗봇 하나로,\n',options:{color:WHITE}},
       {text:'오성철강의 모든 서비스',options:{color:'A5B4FC'}}],
    {x:P,y:2.05,w:11.5,h:2.00,fontSize:44,bold:true,lsm:1.24});
  rct(s,P,4.32,2.10,0.035,{fill:'334155'});
  T(s,'주문 · 진행 · 완료 · 재고 · 월간 실적 · 불량 · 영상 · 품질 성적서',
    {x:P,y:4.58,w:11.4,h:0.42,fontSize:19,bold:true,color:'CBD5E1'});
  rct(s,P,5.62,W,0.02,{fill:'1E293B'});
  const m=[['24','시간 응대'],['7','가지 업무'],['187만','건 데이터'],['0','명 추가 인력']];
  m.forEach(([v,l],i)=>{
    const x=P+i*2.70;
    T(s,v,{x,y:5.88,w:2.5,h:0.48,fontSize:26,bold:true,color:WHITE});
    T(s,l,{x,y:6.38,w:2.5,h:0.28,fontSize:11,bold:true,color:GRAY2});
  });
  T(s,'2026. 9.',{x:P+W-2.5,y:6.38,w:2.5,h:0.28,fontSize:11,bold:true,color:GRAY2,align:'right'});
}
// ════════════════════════════════════════════════════
// 2 · 우리가 가진 데이터
// ════════════════════════════════════════════════════
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
// 3 · 챗봇이 답하는 7가지
// ════════════════════════════════════════════════════
{ const s=base();
  head(s,'ONE CHANNEL, EVERY SERVICE',
    [{text:'문의 창구 하나로 ',options:{}},{text:'일곱 가지 업무',options:{color:IND}},
     {text:'가 끝납니다',options:{}}]);
  const cw=(W-0.66)/4, ch=1.62;
  const SV=[
    ['01','주문 접수','카톡·팩스로 규격·수량을 보내면\nAI가 읽어 작업지시 초안 생성','24시간 접수',IND],
    ['02','진행 상황','지금 어느 라인에서 몇 % 진행\n완료 예정 시각까지','실시간',IND],
    ['03','작업 완료','완료 여부 · 완료 시각\n출고 가능 상태','자동 통보',GRN],
    ['04','재고 확인','맡긴 코일 몇 개 · 어느 자리\n중량 · 입고일','3D 창고 연동',GRN],
    ['05','월간 실적','이번 달 작업 건수 · 중량\n미출고 · 미수금','월 마감 없이',IND],
    ['06','불량 내용','결함 위치 · 유형 · 크기\n원소재 기인인지 가공 기인인지','전수 검사','B45309'],
    ['07','불량 영상','결함 지점 전후 촬영 영상\n그 순간의 가공 조건','영상 제공',RED],
    ['+','품질 성적서','위 전부를 한 장으로\n출하 시 자동 첨부','유상 서비스',RED],
  ];
  SV.forEach(([n,t,d,tag,c],i)=>{
    const x=P+(i%4)*(cw+0.22), y=1.96+Math.floor(i/4)*(ch+0.22);
    const hot = i===7;
    card(s,x,y,cw,ch,{fill:hot?REDL:WHITE,line:hot?REDB:LINE});
    rct(s,x,y,cw,0.05,{fill:c});
    T(s,n,{x:x+0.22,y:y+0.16,w:0.6,h:0.28,fontSize:13,bold:true,color:c});
    T(s,t,{x:x+0.22,y:y+0.44,w:cw-0.44,h:0.32,fontSize:16,bold:true,color:INK});
    T(s,d,{x:x+0.22,y:y+0.80,w:cw-0.44,h:0.50,fontSize:10.5,color:INK2,lsm:1.4});
    chip(s,x+0.22,y+ch-0.44,tag,c===GRN?'g':(c===RED?'r':(c==='B45309'?'o':'i')));
  });
  band(s,5.68,[{text:'전화도 팩스도 필요 없습니다. ',options:{}},
               {text:'물어보면 기록이 답합니다.',options:{color:GOLD}}],0.74);
  foot(s);
}

// ════════════════════════════════════════════════════
// 4 · 대화 예시 ① 주문 · 진행 · 완료
// ════════════════════════════════════════════════════
function phone(s,px,py,pw,ph,title,time,turns,timeColor){
  card(s,px,py,pw,ph,{fill:NAVY,line:null});
  rct(s,px+0.13,py+0.44,pw-0.26,ph-0.58,{fill:WHITE});
  T(s,title,{x:px+0.18,y:py+0.09,w:pw-1.05,h:0.26,fontSize:9,bold:true,color:WHITE});
  T(s,time,{x:px+pw-0.92,y:py+0.09,w:0.76,h:0.26,fontSize:8.5,bold:true,
    color:timeColor||GOLD,align:'right'});
  let y=py+0.54;
  turns.forEach(([who,txt,h,runs])=>{
    if(who==='u'){
      card(s,px+0.24,y,pw-0.62,h,{fill:LINE2,line:null});
      T(s,txt,{x:px+0.34,y,w:pw-0.82,h,fontSize:7.5,bold:true,color:INK,valign:'middle',lsm:1.3});
    } else {
      card(s,px+0.38,y,pw-0.62,h,{fill:INDL,line:null});
      T(s,runs||txt,{x:px+0.48,y:y+0.04,w:pw-0.82,h:h-0.08,fontSize:7,color:INK,lsm:1.3});
    }
    y += h+0.10;
  });
  return y;
}
{ const s=base();
  head(s,'EXAMPLE 01',
    [{text:'주문 ',options:{color:IND}},{text:'·  진행 ',options:{}},{text:'·  완료',options:{}},
     {text:'   — 전화 한 통 없이',options:{fontSize:20,color:GRAY}}]);
  const pw=3.62, py=1.94, ph=4.42, gap=(W-3*pw)/2;
  // 1 주문
  phone(s,P,py,pw,ph,'카카오톡 · 오성철강','02:14',[
    ['u','SGCC 1.2T × 1219 폭\n8톤, 목요일까지 가능할까요?',0.56],
    ['a','',0.92,[{text:'접수했습니다.\n',options:{bold:true}},
      {text:'규격 SGCC 1.2×1219 · 8.0 t\n납기 9/18(목) — ',options:{}},
      {text:'가능합니다.',options:{bold:true}}]],
    ['a','',0.98,[{text:'적합 재고 ',options:{}},{text:'3개 코일',options:{bold:true}},
      {text:' 확인. 작업지시 초안을 만들어 두겠습니다.\n\n',options:{}},
      {text:'담당자 출근 후 확정 안내드립니다.',options:{color:IND}}]],
  ]);
  chip(s,P+0.38,py+3.52,'AI가 규격을 읽고 재고까지 확인','i',2.65);
  T(s,'새벽에도 접수됩니다.',{x:P,y:py+ph+0.10,w:pw,h:0.30,fontSize:12,bold:true,color:INK2,align:'center'});
  // 2 진행
  const x2=P+pw+gap;
  phone(s,x2,py,pw,ph,'진행 상황','14:20',[
    ['u','우리 물건 지금 어디까지 왔어요?',0.40],
    ['a','',1.10,[{text:'코일 1622057 — ',options:{}},{text:'레벨링 라인 가공 중',options:{bold:true}},
      {text:'\n진행 62% · 완료 예정 ',options:{}},{text:'16:40',options:{bold:true}},
      {text:'\n현재 속도 24 MPM · 표준 범위 내\n\n',options:{}},
      {text:'근거 · LEVELING_DATA 실시간',options:{fontSize:6.5,color:IND}}]],
    ['u','뒤에 대기 중인 것도 있나요?',0.40],
    ['a','',0.78,[{text:'2건 대기 중입니다.\n1622058 (슬리터2) · 1622061 (레벨링)\n',options:{}},
      {text:'오늘 안에 모두 완료 가능합니다.',options:{bold:true}}]],
  ]);
  chip(s,x2+0.38,py+3.66,'몇 시에 끝나는지까지','i',2.05);
  T(s,'전화해서 물어볼 필요가 없습니다.',{x:x2,y:py+ph+0.10,w:pw,h:0.30,fontSize:12,bold:true,color:INK2,align:'center'});
  // 3 완료
  const x3=P+2*(pw+gap);
  phone(s,x3,py,pw,ph,'완료 알림','16:41',[
    ['a','',0.94,[{text:'작업 완료',options:{bold:true,color:GRN}},
      {text:'\n코일 1622057 · SGCC 1.2×1219\n가공 8,040 kg · 완료 16:40\n',options:{}},
      {text:'중단 없음 · 표준 범위 내',options:{bold:true}}]],
    ['a','',0.66,[{text:'품질 성적서가 준비되었습니다.\n',options:{}},
      {text:'판정 · 적합',options:{bold:true,color:GRN}},
      {text:'   [성적서 열기]',options:{color:IND}}]],
    ['u','출고는 언제 되나요?',0.40],
    ['a','',0.78,[{text:'출고 가능 상태입니다.\n배차 요청하시면 ',options:{}},
      {text:'내일 오전 출고',options:{bold:true}},{text:' 가능합니다.',options:{}}]],
  ]);
  chip(s,x3+0.38,py+3.72,'묻지 않아도 먼저 알려줍니다','g',2.35);
  T(s,'완료 통보가 자동으로 나갑니다.',{x:x3,y:py+ph+0.10,w:pw,h:0.30,fontSize:12,bold:true,color:INK2,align:'center'});
  foot(s);
}

// ════════════════════════════════════════════════════
// 5 · 대화 예시 ② 재고 · 월간 실적
// ════════════════════════════════════════════════════
{ const s=base();
  head(s,'EXAMPLE 02',
    [{text:'재고 확인 ',options:{color:GRN}},{text:'·  이번 달 작업 내역',options:{}},
     {text:'   — 자료 요청 없이',options:{fontSize:20,color:GRAY}}]);
  const pw=3.10, py=1.94, ph=4.40;
  // 재고 폰
  phone(s,P,py,pw,ph,'재고 조회','21:07',[
    ['u','우리 재고 얼마나 남았어요?',0.38],
    ['a','',1.24,[{text:'(주)대한강재 보관 재고\n',options:{bold:true}},
      {text:'총 ',options:{}},{text:'12 코일 · 96.4 t',options:{bold:true}},
      {text:'\n\nSGCC 1.2T   5코일 · 41.2 t\nSGCC 2.0T   4코일 · 33.8 t\nSPCC 1.6T   3코일 · 21.4 t',options:{}}]],
    ['u','오래된 것도 있나요?',0.38],
    ['a','',0.90,[{text:'3코일이 ',options:{}},{text:'입고 90일 경과',options:{bold:true,color:'B45309'}},
      {text:'했습니다.\n1621402 · 1621408 · 1621415\n',options:{}},
      {text:'창고 A구역 · 3단 적재',options:{fontSize:6.5,color:GRAY}}]],
  ]);
  chip(s,P+0.38,py+3.88,'3D 창고 위치까지','g',1.75);
  // 월간 실적 폰
  const x2=P+pw+0.26;
  phone(s,x2,py,pw,ph,'이번 달 실적','21:12',[
    ['u','이번 달 우리 작업 내역 정리해 주세요',0.46],
    ['a','',1.66,[{text:'2026년 9월 (1일~13일)\n',options:{bold:true}},
      {text:'작업 완료   ',options:{}},{text:'18 건 · 142.6 t\n',options:{bold:true}},
      {text:'출고 완료   ',options:{}},{text:'15 건 · 118.2 t\n',options:{bold:true}},
      {text:'미출고      ',options:{}},{text:'3 건 · 24.4 t\n',options:{bold:true,color:'B45309'}},
      {text:'미수금      ',options:{}},{text:'2 건\n\n',options:{bold:true,color:RED}},
      {text:'중단 발생   1건 (1622051, 4분)\n불량 판정   0건',options:{}}]],
    ['u','엑셀로 받을 수 있나요?',0.38],
    ['a','',0.46,[{text:'전송했습니다. ',options:{}},{text:'[다운로드]',options:{color:IND,bold:true}}]],
  ]);
  chip(s,x2+0.38,py+3.88,'월 마감을 기다리지 않습니다','g',2.35);
  // 우측 설명
  const rx=P+2*pw+0.52, rw=W-2*pw-0.52;
  T(s,'지금 어떻게 하고 계신가요',{x:rx,y:py-0.02,w:rw,h:0.26,fontSize:10.5,bold:true,color:GRAY2,charSpacing:0.8});
  const AS=[
    ['재고 확인','전화 → 담당자가 창고 확인 → 회신','반나절',RED],
    ['월간 실적','월 마감 후 자료 요청 → 정리 → 발송','수일',RED],
    ['미출고 확인','팩스로 미출고 리스트 수신','하루 1회',RED],
  ];
  AS.forEach(([k,v,t,c],i)=>{
    const y=py+0.30+i*0.72;
    card(s,rx,y,rw,0.62,{fill:REDL,line:REDB});
    T(s,k,{x:rx+0.20,y,w:1.30,h:0.62,fontSize:12,bold:true,color:c,valign:'middle'});
    T(s,v,{x:rx+1.56,y,w:rw-2.50,h:0.62,fontSize:10,color:INK2,valign:'middle'});
    T(s,t,{x:rx+rw-1.00,y,w:0.80,h:0.62,fontSize:10.5,bold:true,color:c,align:'right',valign:'middle'});
  });
  card(s,rx,py+2.52,rw,1.10,{fill:GRNL,line:GRNB});
  T(s,[{text:'챗봇으로 바꾸면\n',options:{color:GRN,fontSize:11}},
       {text:'세 가지 모두  즉시 · 24시간',options:{color:INK,fontSize:16}}],
    {x:rx+0.20,y:py+2.52,w:rw-0.40,h:1.10,bold:true,valign:'middle',lsm:1.35});
  card(s,rx,py+3.76,rw,0.64,{fill:TINT,line:LINE});
  T(s,'응대 인력 추가 0명',{x:rx+0.20,y:py+3.76,w:rw-0.40,h:0.64,fontSize:12,bold:true,
    color:INK,valign:'middle'});
  foot(s);
}

// ════════════════════════════════════════════════════
// 6 · 대화 예시 ③ 불량 내용 · 영상
// ════════════════════════════════════════════════════
{ const s=base();
  head(s,'EXAMPLE 03',
    [{text:'불량 내용 ',options:{color:RED}},{text:'·  결함 영상 확인',options:{}},
     {text:'   — 여기가 다른 회사와 갈리는 지점입니다',options:{fontSize:18,color:GRAY}}],{acc:RED});
  const CHIPY=1.94;
  const pw=3.20, py=1.94, ph=4.30;
  phone(s,P,py,pw,ph,'품질 문의','22:35',[
    ['u','받은 코일에 스크래치가 있어요',0.40],
    ['a','',1.34,[{text:'코일 1622051 확인했습니다.\n',options:{bold:true}},
      {text:'전수 검사에서 표면 결함 ',options:{}},{text:'2건',options:{bold:true}},
      {text:' 기록되어 있습니다.\n\n',options:{}},
      {text:'· 352 m 지점 · 스크래치 · 폭 3 mm\n· 1,024 m 지점 · 덴트 · 지름 5 mm\n\n',options:{}},
      {text:'해당 지점 영상 있습니다. [보기]',options:{color:IND,bold:true}}]],
    ['u','우리 쪽 잘못인가요?',0.40],
    ['a','',1.24,[{text:'두 건 모두 ',options:{}},
      {text:'원소재 기인으로 판단됩니다.',options:{bold:true,color:GRN}},
      {text:'\n입고 시 촬영본에 동일 위치 결함이 이미 있었고, 해당 구간 가공 조건은 표준 범위 내였습니다.\n\n',options:{}},
      {text:'제철소 클레임 자료로 쓰실 수 있습니다.',options:{color:IND,bold:true}}]],
  ]);
  // 우측: 결함 맵 + 영상
  const rx=P+pw+0.32, rw=W-pw-0.32;
  card(s,rx,py,rw,2.10,{fill:WHITE,line:LINE});
  rct(s,rx,py,rw,0.42,{fill:NAVY});
  T(s,'표면 결함 위치 맵  ·  코일 1622051',{x:rx+0.18,y:py,w:rw-0.36,h:0.42,
    fontSize:10.5,bold:true,color:WHITE,valign:'middle'});
  rct(s,rx+0.26,py+0.66,rw-0.52,0.54,{fill:'E2E8F0'});
  [[0.18,RED,'352 m'],[0.52,GOLD,'1,024 m']].forEach(([px2,c,lb])=>{
    s.addShape(pptx.ShapeType.ellipse,{x:rx+0.26+(rw-0.52)*px2,y:py+0.80,w:0.22,h:0.22,
      fill:{color:c},line:{color:WHITE,width:1.4}});
    T(s,lb,{x:rx+0.26+(rw-0.52)*px2-0.45,y:py+1.26,w:1.1,h:0.22,fontSize:9,bold:true,
      color:c===RED?RED:'B45309',align:'center'});
  });
  T(s,'0 m',{x:rx+0.26,y:py+1.26,w:0.7,h:0.22,fontSize:8.5,color:GRAY2});
  T(s,'1,989 m',{x:rx+rw-0.96,y:py+1.26,w:0.7,h:0.22,fontSize:8.5,color:GRAY2,align:'right'});
  T(s,'전수 촬영 · 샘플 검사 아님 · 결함 좌표와 크기까지 기록',
    {x:rx+0.26,y:py+1.58,w:rw-0.52,h:0.26,fontSize:10,color:INK2});
  // 영상 썸네일
  card(s,rx,py+2.24,rw,1.60,{fill:WHITE,line:LINE});
  rct(s,rx,py+2.24,rw,0.42,{fill:NAVY});
  T(s,'결함 지점 전후 영상',{x:rx+0.18,y:py+2.24,w:rw-0.36,h:0.42,
    fontSize:10.5,bold:true,color:WHITE,valign:'middle'});
  const vw=(rw-0.52-0.24)/3;
  [['-0.5 초','정상'],['0 초','결함 검출'],['+0.5 초','정상']].forEach(([t,k],i)=>{
    const bx=rx+0.26+i*(vw+0.12);
    rct(s,bx,py+2.80,vw,0.62,{fill:i===1?'7F1D1D':'475569'});
    s.addShape(pptx.ShapeType.line,{x:bx+0.16,y:py+3.04,w:vw-0.32,h:0.14,
      line:{color:i===1?'FCA5A5':'F1F5F9',width:1.8}});
    T(s,t,{x:bx,y:py+3.46,w:vw,h:0.22,fontSize:8.5,bold:true,color:INK,align:'center'});
    T(s,k,{x:bx,y:py+3.66,w:vw,h:0.20,fontSize:8,color:i===1?RED:GRAY,align:'center'});
  });
  chip(s,P+0.38,CHIPY+4.02,'우리 잘못인지 아닌지를 가립니다','r',2.55);
  band(s,6.46,[{text:'결함이 있었는지가 아니라, ',options:{}},
               {text:'누구 책임인지를 데이터로 답합니다.',options:{color:GOLD}}],0.40);
  foot(s);
}

// ════════════════════════════════════════════════════
// 7 · 철판 품질 자료 — 고객에게 제공 가능한 것
// ════════════════════════════════════════════════════
{ const s=base();
  head(s,'STEEL QUALITY DATA',
    [{text:'1차에 구축한 ',options:{}},{text:'철판 품질 자료',options:{color:'B45309'}},
     {text:'가 여기서 값을 합니다',options:{}}],{acc:GOLD});
  const cw=(W-0.66)/4, cy=1.94, chh=2.86;
  const Q=[
    ['표면 결함','AI 비전 전수 촬영','· 결함 위치 (m 단위)\n· 유형 (스크래치·덴트·홀)\n· 크기 (mm)\n· 등급 판정','전 코일 · 전 길이',GOLD],
    ['결함 영상','결함 지점 전후 프레임','· 검출 순간 영상\n· 전후 0.5초 비교\n· 육안 확인 가능\n· 고객 전달용 저장','분쟁 종결 근거',RED],
    ['두께 프로파일','실측 두께 분포','· 길이별 두께 편차\n· 허용 공차 대비\n· 최대/최소 지점\n· 평균 ± 표준편차','샘플 아닌 전수',IND],
    ['가공 조건','PLC 운전 기록','· 그 지점의 속도·장력\n· 중단 발생 여부·시각\n· 표준 범위 대비 판정\n· 2초 단위 원기록','귀책 판별 근거',GRN],
  ];
  Q.forEach(([t,src,items,tag,c],i)=>{
    const x=P+i*(cw+0.22);
    card(s,x,cy,cw,chh,{fill:WHITE,line:LINE});
    rct(s,x,cy,cw,0.05,{fill:c});
    T(s,t,{x:x+0.22,y:cy+0.16,w:cw-0.44,h:0.34,fontSize:17,bold:true,color:c});
    T(s,src,{x:x+0.22,y:cy+0.52,w:cw-0.44,h:0.24,fontSize:10,bold:true,color:GRAY});
    rct(s,x+0.22,cy+0.84,cw-0.44,0.012,{fill:LINE});
    T(s,items,{x:x+0.22,y:cy+0.96,w:cw-0.44,h:1.30,fontSize:10.5,color:INK2,lsm:1.5});
    chip(s,x+0.22,cy+chh-0.46,tag,c===GRN?'g':(c===RED?'r':(c===IND?'i':'o')));
  });
  // 성적서
  card(s,P,5.02,W,1.14,{fill:GOLDL,line:GOLDB});
  T(s,'네 가지를 합치면',{x:P+0.28,y:5.02,w:2.2,h:1.14,fontSize:12,bold:true,color:'B45309',valign:'middle'});
  arw(s,P+2.60,5.59,P+3.05,5.59,'B45309',2);
  card(s,P+3.20,5.14,3.30,0.90,{fill:WHITE,line:GOLDB,lw:1.4});
  T(s,'코일 품질 성적서',{x:P+3.20,y:5.14,w:3.30,h:0.90,fontSize:16,bold:true,color:INK,
    align:'center',valign:'middle'});
  T(s,[{text:'출하 시 자동 첨부  ·  요약본 무료 / ',options:{color:INK2}},
       {text:'영상·실측 포함 상세본은 유상',options:{color:'B45309'}}],
    {x:P+6.70,y:5.02,w:W-6.98,h:1.14,fontSize:13,bold:true,valign:'middle'});
  band(s,6.32,[{text:'2차 때는 팔 줄을 몰랐습니다. ',options:{}},
               {text:'같은 자료가 지금은 상품입니다.',options:{color:GOLD}}],0.46);
  foot(s);
}

// ════════════════════════════════════════════════════
// 8 · 새벽 주문 → 출근 시 자동 작업지시
// ════════════════════════════════════════════════════
{ const s=base();
  head(s,'OVERNIGHT ORDER FLOW',
    [{text:'새벽 02시 카톡 주문이 ',options:{}},
     {text:'아침 08시 작업지시',options:{color:IND}},{text:'로 이어집니다',options:{}}]);
  // 타임라인
  const tx=P+0.30, tw=W-0.60, ty=2.86;
  rct(s,tx,ty,tw,0.05,{fill:LINE});
  rct(s,tx,ty,tw*0.62,0.05,{fill:IND});
  const ST=[
    [0.00,'02:14','고객 카톡 주문','SGCC 1.2T × 1219\n8톤 · 목요일 납기',IND,1],
    [0.16,'02:14','AI 주문서 판독','규격·수량·납기 추출\n오타·약어까지 해석',IND,1],
    [0.32,'02:15','재고 자동 조회','적합 코일 3개 후보\n중량·입고일 확인',IND,1],
    [0.48,'02:15','작업지시 초안','라인 배정 · 예상 시간\n대기 상태로 저장',IND,1],
    [0.62,'07:50','담당자 출근','초안 확인 · 승인\n소요 1분',GOLD,0],
    [0.82,'08:00','라인 태블릿 표시','작업지시 자동 도착\n작업 시작',GRN,0],
  ];
  ST.forEach(([p,t,ttl,d,c,night])=>{
    const x=tx+tw*p;
    s.addShape(pptx.ShapeType.ellipse,{x:x-0.11,y:ty-0.085,w:0.22,h:0.22,
      fill:{color:c},line:{color:WHITE,width:2}});
    T(s,t,{x:x-0.62,y:ty-0.56,w:1.24,h:0.26,fontSize:12,bold:true,color:c,align:'center'});
    card(s,x-0.86,ty+0.32,1.72,1.32,{fill:night?INDL:(c===GOLD?GOLDL:GRNL),
      line:night?INDB:(c===GOLD?GOLDB:GRNB)});
    T(s,ttl,{x:x-0.78,y:ty+0.42,w:1.56,h:0.42,fontSize:11,bold:true,
      color:night?IND:(c===GOLD?'B45309':GRN),align:'center',lsm:1.2});
    T(s,d,{x:x-0.78,y:ty+0.86,w:1.56,h:0.66,fontSize:8.5,color:INK2,align:'center',lsm:1.35});
  });
  // 구간 라벨
  T(s,'사람이 없는 시간  ·  자동 처리',{x:tx,y:ty-1.02,w:tw*0.58,h:0.28,fontSize:11.5,
    bold:true,color:IND,align:'center',charSpacing:0.6});
  T(s,'출근 후  ·  확인만',{x:tx+tw*0.60,y:ty-1.02,w:tw*0.40,h:0.28,fontSize:11.5,
    bold:true,color:'B45309',align:'center',charSpacing:0.6});
  // 비교
  const cy2=5.06, cw2=(W-0.34)/2;
  card(s,P,cy2,cw2,1.20,{fill:REDL,line:REDB});
  T(s,'지금',{x:P+0.24,y:cy2+0.14,w:1.0,h:0.28,fontSize:11,bold:true,color:RED});
  T(s,'09:00 전화·팩스 수신 → 수기 입력 → 재고 확인 → 라인 배정 → 10:30 작업 시작',
    {x:P+0.24,y:cy2+0.46,w:cw2-0.48,h:0.58,fontSize:12,bold:true,color:INK,lsm:1.35});
  card(s,P+cw2+0.34,cy2,cw2,1.20,{fill:GRNL,line:GRNB});
  T(s,'챗봇 도입 후',{x:P+cw2+0.58,y:cy2+0.14,w:1.6,h:0.28,fontSize:11,bold:true,color:GRN});
  T(s,'02:14 접수·판독·재고확인·초안 완료  →  07:50 승인 1분  →  08:00 작업 시작',
    {x:P+cw2+0.58,y:cy2+0.46,w:cw2-0.48,h:0.58,fontSize:12,bold:true,color:INK,lsm:1.35});
  band(s,6.42,[{text:'주문은 밤에 들어오고, ',options:{}},
               {text:'작업은 아침 8시에 시작됩니다.',options:{color:GOLD}},
               {text:'  그 사이에 사람은 없습니다.',options:{}}],0.44);
  foot(s);
}

// ════════════════════════════════════════════════════
// 9 · 정리
// ════════════════════════════════════════════════════
{ const s=base();
  head(s,'WHY IT MATTERS',
    [{text:'가공업체가 아니라 ',options:{}},
     {text:'24시간 응답하는 소재 서비스 기업',options:{color:IND}},{text:'으로',options:{}}]);
  const rows=[
    ['주문 접수','업무시간 · 전화/팩스','24시간 · 자동 판독 + 초안 생성',IND],
    ['진행 확인','전화 문의 · 담당자 확인','실시간 · 완료 예정시각 포함',IND],
    ['완료 통보','별도 연락 없음','자동 통보 + 성적서 동봉',GRN],
    ['재고 확인','전화 → 창고 확인 → 회신','즉시 · 위치·중량·경과일',GRN],
    ['월간 실적','월 마감 후 요청·정리','실시간 · 엑셀 즉시 전송',IND],
    ['불량 대응','주장 대 주장 · 수 주 소요','좌표·크기·영상·귀책 판별','B45309'],
    ['품질 증빙','제공 수단 없음','성적서 자동 발행 (상세본 유상)',RED],
  ];
  const y0=1.92, rh=0.48;
  T(s,'업무',{x:P+0.24,y:y0-0.32,w:2,h:0.26,fontSize:10.5,bold:true,color:GRAY2,charSpacing:0.8});
  T(s,'지금',{x:P+2.60,y:y0-0.32,w:3,h:0.26,fontSize:10.5,bold:true,color:GRAY2,charSpacing:0.8});
  T(s,'챗봇 도입 후',{x:P+6.40,y:y0-0.32,w:4,h:0.26,fontSize:10.5,bold:true,color:IND,charSpacing:0.8});
  rows.forEach(([k,a,b,c],i)=>{
    const y=y0+i*(rh+0.06);
    const hot=i>=5;
    if(hot) card(s,P,y,W,rh,{fill:i===6?REDL:GOLDL,line:i===6?REDB:GOLDB});
    else rct(s,P,y+rh,W,0.012,{fill:LINE});
    T(s,k,{x:P+0.24,y,w:2.20,h:rh,fontSize:13.5,bold:true,color:hot?c:INK,valign:'middle'});
    T(s,a,{x:P+2.60,y,w:3.60,h:rh,fontSize:11.5,color:GRAY,valign:'middle'});
    arw(s,P+6.05,y+rh/2,P+6.28,y+rh/2,c,1.6);
    T(s,b,{x:P+6.40,y,w:W-6.64,h:rh,fontSize:12.5,bold:true,color:c,valign:'middle'});
  });
  const by=y0+7*(rh+0.06)+0.16;
  const cw3=(W-0.48)/3;
  [['0명','추가 응대 인력',IND],['3배','응대 가능 시간',GRN],['0원 → ?','가공 외 매출','B45309']]
   .forEach(([v,l,c],i)=>{
    const x=P+i*(cw3+0.24);
    card(s,x,by,cw3,0.80,{fill:TINT,line:LINE});
    T(s,[{text:v,options:{fontSize:20,color:c}},{text:'   '+l,options:{fontSize:12,color:GRAY}}],
      {x:x+0.24,y:by,w:cw3-0.48,h:0.80,bold:true,valign:'middle'});
  });
  foot(s);
}

const OUT = process.argv[2] || '오성철강_고객챗봇_서비스제안.pptx';
pptx.writeFile({ fileName: OUT }).then(()=>{
  console.log('✅ 완료: ' + OUT + '  (총 ' + _n + '장)');
}).catch(e=>{ console.error('❌ 실패:', e); process.exit(1); });
