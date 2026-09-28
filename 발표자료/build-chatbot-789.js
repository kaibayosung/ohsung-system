// 고객챗봇 제안 7·8·9장 리디자인 (인포그래픽 강화)
// 실행: node build-chatbot-789.js
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = '고객챗봇 제안 — 7·8·9장 리디자인';

const F='맑은 고딕', P=0.72, W=11.89, SH=7.5;
const NAVY='0B1220', NAVY2='16203A',
      INK='0F172A', INK2='334155', GRAY='64748B', GRAY2='94A3B8',
      LINE='E2E8F0', LINE2='F1F5F9', TINT='F8FAFC', WHITE='FFFFFF',
      IND='4F46E5', INDL='EEF0FF', INDB='C7CBFF',
      GOLD='F5B544', GOLDL='FFF8E8', GOLDB='FBD88B', GOLDD='B45309',
      RED='DC2626', REDL='FEF2F2', REDB='FCA5A5', RED9='7F1D1D',
      GRN='059669', GRNL='ECFDF5', GRNB='6EE7B7',
      BLU='0284C7', BLUL='E0F2FE', BLUB='7DD3FC',
      VIO='7C3AED', VIOL='F5F3FF', VIOB='C4B5FD',
      ORG='EA580C', ORGL='FFF7ED', ORGB='FDBA74';

let _n=6;
function base(){ const s=pptx.addSlide(); _n++; return s; }
function T(s,t,o={}){ s.addText(t,{fontFace:F,color:o.color||INK2,valign:o.valign||'top',
  lineSpacingMultiple:o.lsm||1.4,...o}); }
function card(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:o.r||0.08,
  fill:{color:o.fill||WHITE},
  line:o.line===null?{type:'none'}:{color:o.line||LINE,width:o.lw!==undefined?o.lw:1.5}}); }
function rct(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.rect,{x,y,w,h,fill:{color:o.fill||WHITE},
  line:o.line?{color:o.line,width:o.lw||1.5}:{type:'none'}}); }
function ell(s,x,y,w,h,f,ln,lw){ s.addShape(pptx.ShapeType.ellipse,{x,y,w,h,
  fill:{color:f},line:ln?{color:ln,width:lw||1.5}:{type:'none'}}); }
function arw(s,x1,y1,x2,y2,c=GRAY2,w=1.75){
  s.addShape(pptx.ShapeType.line,{x:Math.min(x1,x2),y:Math.min(y1,y2),
    w:Math.abs(x2-x1)||0.008,h:Math.abs(y2-y1)||0.008,
    line:{color:c,width:w,endArrowType:'triangle'},flipH:x2<x1,flipV:y2<y1});
}
function head(s,kicker,runs,acc){
  rct(s,P,0.66,0.055,0.26,{fill:acc||IND});
  T(s,kicker,{x:P+0.20,y:0.62,w:8,h:0.30,fontSize:11.5,bold:true,color:acc||IND,charSpacing:1.6});
  T(s,runs,{x:P,y:1.02,w:W,h:0.58,fontSize:28,bold:true,color:INK,lsm:1.14});
}
function foot(s,sec){
  rct(s,P,6.94,W,0.012,{fill:LINE});
  T(s,sec,{x:P,y:7.02,w:6,h:0.26,fontSize:9.5,bold:true,color:GRAY2,charSpacing:1.4});
  T(s,'오성철강  ·  '+String(_n).padStart(2,'0'),{x:P+W-3,y:7.02,w:3,h:0.26,
    fontSize:9.5,bold:true,color:GRAY2,align:'right',charSpacing:1.2});
}
function band(s,y,runs,h=0.62,fill=NAVY){
  card(s,P,y,W,h,{fill,line:null});
  T(s,runs,{x:P+0.3,y,w:W-0.6,h,fontSize:16,bold:true,color:WHITE,
    align:'center',valign:'middle',lsm:1.3});
}

// ═══════════════════════════════════════════════════
// 07 · 철판 품질 자료 — 네 층이 한 장으로
// ═══════════════════════════════════════════════════
{ const s=base();
  head(s,'STEEL QUALITY DATA',
    [{text:'코일 한 개에 ',options:{}},{text:'네 층의 기록',options:{color:GOLDD}},
     {text:'이 쌓입니다',options:{}}],GOLD);

  const TX=P, TW=7.45, ty=1.86;
  card(s,TX,ty,TW,4.24,{fill:TINT,line:LINE});
  T(s,'코일 1622057  ·  길이 1,989 m',{x:TX+0.26,y:ty+0.14,w:3.4,h:0.26,
    fontSize:11.5,bold:true,color:GRAY,charSpacing:0.6});
  T(s,'전 길이 · 전수 기록',{x:TX+TW-2.30,y:ty+0.14,w:2.04,h:0.26,
    fontSize:10,bold:true,color:GOLDD,align:'right'});

  const lx=TX+1.68, lw=TW-1.94;
  const TRK=[
    ['표면 결함','AI 비전',GOLD,GOLDL,GOLDB],
    ['결함 영상','전후 프레임',RED,REDL,REDB],
    ['두께 프로파일','실측 분포',BLU,BLUL,BLUB],
    ['가공 조건','PLC 운전기록',GRN,GRNL,GRNB],
  ];
  TRK.forEach(([t,d,c,bg,bd],i)=>{
    const y=ty+0.56+i*0.90;
    card(s,TX+0.26,y,1.32,0.70,{fill:bg,line:bd,lw:1.3});
    T(s,t,{x:TX+0.34,y:y+0.10,w:1.16,h:0.26,fontSize:11.5,bold:true,color:c});
    T(s,d,{x:TX+0.34,y:y+0.38,w:1.16,h:0.22,fontSize:8.5,color:GRAY});
    rct(s,lx,y,lw,0.70,{fill:WHITE,line:LINE,lw:1.2});

    if(i===0){
      [0.18,0.34,0.52,0.78].forEach((px,j)=>{
        ell(s,lx+lw*px-0.09,y+0.26,0.18,0.18,j%2?GOLD:RED,WHITE,1.4);
      });
      T(s,'결함 4건',{x:lx+0.10,y:y+0.06,w:1.0,h:0.20,fontSize:8,bold:true,color:GOLDD});
    }
    if(i===1){
      [0.18,0.52].forEach(px=>{
        rct(s,lx+lw*px-0.34,y+0.14,0.68,0.42,{fill:'475569'});
        s.addShape(pptx.ShapeType.line,{x:lx+lw*px-0.24,y:y+0.34,w:0.48,h:0.06,
          line:{color:'F1F5F9',width:1.4}});
      });
      T(s,'전후 0.5초 영상 보관',{x:lx+lw-1.60,y:y+0.06,w:1.50,h:0.20,fontSize:8,bold:true,color:RED,align:'right'});
    }
    if(i===2){
      const pts=[[0,.5],[.12,.42],[.25,.55],[.38,.46],[.5,.52],[.62,.44],[.75,.56],[.88,.48],[1,.5]];
      for(let k=0;k<pts.length-1;k++){
        const x1=lx+0.10+pts[k][0]*(lw-0.20), y1=y+0.14+pts[k][1]*0.42;
        const x2=lx+0.10+pts[k+1][0]*(lw-0.20), y2=y+0.14+pts[k+1][1]*0.42;
        s.addShape(pptx.ShapeType.line,{x:Math.min(x1,x2),y:Math.min(y1,y2),
          w:Math.abs(x2-x1)||0.008,h:Math.abs(y2-y1)||0.008,
          line:{color:BLU,width:1.8},flipV:y2<y1});
      }
      T(s,'± 0.01 mm',{x:lx+lw-1.10,y:y+0.06,w:1.0,h:0.20,fontSize:8,bold:true,color:BLU,align:'right'});
    }
    if(i===3){
      rct(s,lx+0.10,y+0.30,lw-0.20,0.10,{fill:GRNB});
      rct(s,lx+0.10+(lw-0.20)*0.62,y+0.30,(lw-0.20)*0.06,0.10,{fill:RED});
      T(s,'1,240 m · 4분 중단',{x:lx+0.10+(lw-0.20)*0.42,y:y+0.46,w:1.7,h:0.20,
        fontSize:8,bold:true,color:RED});
      T(s,'속도 · 장력 2초 단위',{x:lx+0.10,y:y+0.06,w:1.6,h:0.20,fontSize:8,bold:true,color:GRN});
    }
  });
  T(s,'0 m',{x:lx,y:ty+4.02,w:0.6,h:0.20,fontSize:8.5,color:GRAY2});
  T(s,'1,989 m',{x:lx+lw-0.8,y:ty+4.02,w:0.8,h:0.20,fontSize:8.5,color:GRAY2,align:'right'});

  arw(s,TX+TW+0.08,3.98,TX+TW+0.42,3.98,GOLDD,2.4);

  // 성적서
  const RX=TX+TW+0.52, RW=W-TW-0.52;
  card(s,RX,ty,RW,4.24,{fill:GOLDL,line:GOLDB,lw:2});
  T(s,'네 층을 합치면',{x:RX+0.24,y:ty+0.16,w:RW-0.48,h:0.26,fontSize:11.5,
    bold:true,color:GOLDD,charSpacing:0.6});
  card(s,RX+0.30,ty+0.52,RW-0.60,2.70,{fill:WHITE,line:GOLDB,lw:1.4});
  T(s,'코일 품질 성적서',{x:RX+0.46,y:ty+0.66,w:RW-0.92,h:0.30,fontSize:14,bold:true,color:INK});
  rct(s,RX+0.46,ty+1.00,RW-0.92,0.012,{fill:LINE});
  [['코일번호','1622057',INK],['거래처','(주)대한강재',INK],['표면 결함','원자재 기인 2건',GOLDD],
   ['결함 영상','2건 보관',RED],['두께 편차','± 0.01 mm',BLU],['작업 중단','1건 · 4분',GRN]]
   .forEach(([k,v,c],i)=>{
    const y=ty+1.12+i*0.27;
    T(s,k,{x:RX+0.46,y,w:1.20,h:0.22,fontSize:9,color:GRAY});
    T(s,v,{x:RX+0.46,y,w:RW-0.92,h:0.22,fontSize:9,bold:true,color:c,align:'right'});
  });
  card(s,RX+0.46,ty+2.78,RW-0.92,0.36,{fill:GRNL,line:GRNB,lw:1.2});
  T(s,'판정   적 합',{x:RX+0.46,y:ty+2.78,w:RW-0.92,h:0.36,fontSize:11.5,bold:true,
    color:GRN,align:'center',valign:'middle'});
  card(s,RX+0.30,ty+3.36,RW-0.60,0.72,{fill:WHITE,line:GOLDB,lw:1.3});
  T(s,[{text:'요약본  무료\n',options:{color:INK}},
       {text:'영상·실측 상세본  유상',options:{color:GOLDD}}],
    {x:RX+0.42,y:ty+3.36,w:RW-0.84,h:0.72,fontSize:11,bold:true,valign:'middle',lsm:1.35});

  band(s,6.26,[{text:'2차 때는 팔 줄을 몰랐습니다.   ',options:{}},
               {text:'같은 자료가 지금은 상품입니다.',options:{color:GOLD}}],0.58);
  foot(s,'고객용 챗봇 서비스');
}

// ═══════════════════════════════════════════════════
// 08 · 새벽 주문 → 아침 작업지시
// ═══════════════════════════════════════════════════
{ const s=base();
  head(s,'OVERNIGHT ORDER FLOW',
    [{text:'사람이 없는 ',options:{}},{text:'60초',options:{color:IND}},
     {text:' 동안 주문이 작업지시가 됩니다',options:{}}]);

  // ── 24시간 배경 띠 ──
  const bx=P, bw=W, by=2.26, bh=0.62;
  const hw=bw/24;
  for(let h=0;h<24;h++){
    const night = h<7 || h>=18;
    rct(s,bx+h*hw,by,hw,bh,{fill:night?NAVY2:LINE2});
  }
  [[0,'00'],[4,'04'],[8,'08'],[12,'12'],[16,'16'],[20,'20'],[24,'24']].forEach(([h,l])=>{
    T(s,l,{x:bx+h*hw-0.24,y:by+bh+0.06,w:0.48,h:0.20,fontSize:8.5,color:GRAY2,align:'center'});
  });
  T(s,'밤 · 사람 없음',{x:bx+0.12,y:by+0.18,w:1.6,h:0.26,fontSize:9.5,bold:true,color:'94A3B8'});
  T(s,'업무시간',{x:bx+12*hw-0.6,y:by+0.18,w:1.2,h:0.26,fontSize:9.5,bold:true,
    color:GRAY,align:'center'});

  // 마커 3개
  const MK=[[2.24,'02:14',IND,'자동 처리'],[7.83,'07:50',GOLD,'승인 1분'],[8.0,'08:00',GRN,'작업 시작']];
  MK.forEach(([h,lb,c],i)=>{
    const x=bx+h*hw;
    ell(s,x-0.10,by-0.10,0.20,0.20,c,WHITE,1.8);
  });
  T(s,'02:14',{x:bx+2.24*hw-0.60,y:by-0.46,w:1.2,h:0.24,fontSize:10.5,bold:true,color:IND,align:'center'});
  T(s,'07:50',{x:bx+7.83*hw-1.28,y:by-0.46,w:1.2,h:0.24,fontSize:10,bold:true,color:GOLDD,align:'right'});
  T(s,'08:00',{x:bx+8.0*hw+0.10,y:by-0.46,w:1.2,h:0.24,fontSize:10,bold:true,color:GRN});

  // 확대 콜아웃
  const cx=P+0.20, cw2=6.40, cy=3.42;
  card(s,cx,cy,cw2,1.86,{fill:INDL,line:IND,lw:2});
  T(s,'02:14 → 02:15   이 60초 안에',{x:cx+0.24,y:cy+0.14,w:cw2-0.48,h:0.28,
    fontSize:13,bold:true,color:IND});
  const sw=(cw2-0.48-0.36)/4;
  [['접수','카톡 주문 도착',VIO],['판독','규격·수량·납기 추출',BLU],
   ['조회','적합 코일 3개',IND],['초안','라인 배정 완료',GRN]]
   .forEach(([t,d,c],i)=>{
    const x=cx+0.24+i*(sw+0.12);
    card(s,x,cy+0.52,sw,1.08,{fill:WHITE,line:LINE,lw:1.3});
    rct(s,x,cy+0.52,sw,0.05,{fill:c});
    T(s,String(i+1),{x:x+0.12,y:cy+0.62,w:0.4,h:0.22,fontSize:9,bold:true,color:c});
    T(s,t,{x:x+0.12,y:cy+0.84,w:sw-0.24,h:0.28,fontSize:14,bold:true,color:INK});
    T(s,d,{x:x+0.12,y:cy+1.16,w:sw-0.24,h:0.34,fontSize:8.5,color:GRAY,lsm:1.25});
    if(i<3) T(s,'›',{x:x+sw+0.005,y:cy+0.90,w:0.12,h:0.30,fontSize:13,bold:true,
      color:INDB,align:'center'});
  });

  // 우측 아침
  const ax=cx+cw2+0.28, aw=W-cw2-0.48;
  card(s,ax,cy,aw,1.86,{fill:WHITE,line:LINE});
  T(s,'사람이 하는 일은 이것뿐',{x:ax+0.24,y:cy+0.14,w:aw-0.48,h:0.28,
    fontSize:13,bold:true,color:GOLDD});
  const aw2=(aw-0.48-0.16)/2;
  [['07:50','초안 확인 · 승인','1분',GOLD,GOLDL,GOLDB],
   ['08:00','라인 태블릿 표시','자동',GRN,GRNL,GRNB]]
   .forEach(([t1,t2,t3,c,bg,bd],i)=>{
    const x=ax+0.24+i*(aw2+0.16);
    card(s,x,cy+0.52,aw2,1.08,{fill:bg,line:bd,lw:1.4});
    T(s,t1,{x:x+0.14,y:cy+0.62,w:aw2-0.28,h:0.26,fontSize:11,bold:true,color:c});
    T(s,t2,{x:x+0.14,y:cy+0.88,w:aw2-0.28,h:0.44,fontSize:12,bold:true,color:INK,lsm:1.2});
    T(s,t3,{x:x+0.14,y:cy+1.32,w:aw2-0.28,h:0.22,fontSize:9,bold:true,color:c});
  });

  // ── 하단 간트 비교 ──
  const gy=5.62, glx=P+1.80, glw=W-1.80-3.40;
  T(s,'작업 시작까지  (00시 ~ 12시)',{x:P,y:gy-0.30,w:3.4,h:0.24,fontSize:10.5,bold:true,
    color:GRAY,charSpacing:0.6});
  [['지금','09:00 접수','10:30 시작',9.0,10.5,REDB,RED,0],
   ['도입 후','02:14 접수','08:00 시작',2.24,8.0,INDB,GRN,1]]
   .forEach(([lab,a,b,h1,h2,barC,endC,isNew],i)=>{
    const y=gy+i*0.40;
    T(s,lab,{x:P,y,w:1.60,h:0.30,fontSize:11.5,bold:true,
      color:isNew?GRN:RED,valign:'middle'});
    rct(s,glx,y+0.09,glw,0.12,{fill:LINE2});
    const x1=glx+glw*(h1/12), x2=glx+glw*(h2/12);
    rct(s,x1,y+0.09,x2-x1,0.12,{fill:barC});
    ell(s,x2-0.07,y+0.08,0.14,0.14,endC,WHITE,1.4);
    T(s,b,{x:x2+0.10,y,w:1.30,h:0.30,fontSize:9,bold:true,color:endC,valign:'middle'});
    T(s,a,{x:x1-1.05,y,w:0.95,h:0.30,fontSize:9,color:GRAY,align:'right',valign:'middle'});
  });
  card(s,P+9.62,gy-0.10,W-9.62,0.90,{fill:GRNL,line:GRN,lw:1.8});
  T(s,[{text:'2시간 30분',options:{fontSize:16,color:GRN}},
       {text:'\n빨리 시작합니다',options:{fontSize:10.5,color:INK2}}],
    {x:P+9.78,y:gy-0.10,w:W-9.94,h:0.90,bold:true,valign:'middle',lsm:1.3});

  band(s,6.52,[{text:'주문은 밤에 들어오고, 작업은 아침 8시에 시작됩니다.   ',options:{}},
               {text:'그 사이에 사람은 없습니다.',options:{color:GOLD}}],0.42);
  foot(s,'고객용 챗봇 서비스');
}

// ═══════════════════════════════════════════════════
// 09 · 정리 — 전후 대비
// ═══════════════════════════════════════════════════
{ const s=base();
  head(s,'WHY IT MATTERS',
    [{text:'가공업체에서 ',options:{}},
     {text:'24시간 응답하는 소재 서비스 기업',options:{color:IND}},{text:'으로',options:{}}]);

  const cw=(W-1.30)/2, LX=P, RX2=P+cw+1.30;
  card(s,LX,1.86,cw,4.20,{fill:TINT,line:LINE});
  rct(s,LX,1.86,cw,0.055,{fill:GRAY2});
  T(s,'지금',{x:LX+0.26,y:1.98,w:cw-0.52,h:0.32,fontSize:17,bold:true,color:GRAY});
  card(s,RX2,1.86,cw,4.20,{fill:WHITE,line:IND,lw:2});
  rct(s,RX2,1.86,cw,0.055,{fill:IND});
  T(s,'챗봇 도입 후',{x:RX2+0.26,y:1.98,w:cw-0.52,h:0.32,fontSize:17,bold:true,color:IND});

  const RW2=[
    ['주문 접수','업무시간 · 전화/팩스','24시간 · 자동 판독',VIO],
    ['진행 확인','전화 문의 · 담당자 확인','실시간 · 완료시각 포함',BLU],
    ['완료 통보','별도 연락 없음','자동 통보 + 성적서',GRN],
    ['재고 확인','전화 → 창고 → 회신','즉시 · 위치·중량·경과일',GRN],
    ['월간 실적','월 마감 후 요청·정리','실시간 · 엑셀 즉시',IND],
    ['불량 대응','주장 대 주장 · 수주 소요','좌표·크기·영상·귀책',ORG],
    ['품질 증빙','제공 수단 없음','성적서 자동 발행',RED],
  ];
  RW2.forEach(([k,a,b,c],i)=>{
    const y=2.44+i*0.50;
    T(s,k,{x:LX+0.26,y,w:1.70,h:0.40,fontSize:12,bold:true,color:INK2,valign:'middle'});
    T(s,a,{x:LX+1.98,y,w:cw-2.20,h:0.40,fontSize:10,color:GRAY,valign:'middle'});
    if(i<6) rct(s,LX+0.26,y+0.42,cw-0.52,0.012,{fill:LINE});
    arw(s,LX+cw+0.30,y+0.20,LX+cw+0.98,y+0.20,c,2);
    ell(s,RX2+0.20,y+0.13,0.14,0.14,c,null);
    T(s,b,{x:RX2+0.46,y,w:cw-0.72,h:0.40,fontSize:12,bold:true,color:c,valign:'middle'});
    if(i<6) rct(s,RX2+0.26,y+0.42,cw-0.52,0.012,{fill:LINE});
  });

  const nw=(W-0.48)/3;
  [['0','명','추가 응대 인력',IND,INDL,INDB],
   ['3','배','응대 가능 시간',GRN,GRNL,GRNB],
   ['0원 → ?','','가공 외 매출',GOLDD,GOLDL,GOLDB]]
   .forEach(([v,u,l,c,bg,bd],i)=>{
    const x=P+i*(nw+0.24);
    card(s,x,6.20,nw,0.72,{fill:bg,line:bd,lw:1.4});
    T(s,[{text:v,options:{fontSize:20}},{text:u?' '+u:'',options:{fontSize:12}},
         {text:'   '+l,options:{fontSize:11,color:INK2}}],
      {x:x+0.26,y:6.20,w:nw-0.52,h:0.72,bold:true,color:c,valign:'middle'});
  });
  foot(s,'고객용 챗봇 서비스');
}

pptx.writeFile({ fileName: process.argv[2] || '오성철강_고객챗봇_789_리디자인.pptx' })
  .then(f=>console.log('✅ 완료: '+f))
  .catch(e=>{ console.error('❌', e); process.exit(1); });
