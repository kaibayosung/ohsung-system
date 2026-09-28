// 슬라이드 25 리디자인 — 고객의 현실 (인포그래픽 강화)
// 실행: node build-slide25.js
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = '고객의 현실 — 인포그래픽';

const F='맑은 고딕', P=0.72, W=11.89, SH=7.5;
const NAVY='0B1220', INK='0F172A', INK2='334155', GRAY='64748B', GRAY2='94A3B8',
      LINE='E2E8F0', LINE2='F1F5F9', TINT='F8FAFC', WHITE='FFFFFF',
      IND='4F46E5', INDL='EEF0FF', INDB='C7CBFF',
      GOLD='F5B544', GOLDL='FFF8E8', GOLDB='FBD88B',
      RED='DC2626', REDL='FEF2F2', REDB='FCA5A5', RED9='7F1D1D',
      GRN='059669', GRNL='ECFDF5', GRNB='6EE7B7',
      BLU='0284C7', BLUL='E0F2FE', BLUB='7DD3FC',
      VIO='7C3AED', VIOL='F5F3FF', VIOB='C4B5FD',
      ORG='EA580C', ORGL='FFF7ED', ORGB='FDBA74';

let _n=0;
function base(){ const s=pptx.addSlide(); _n++; return s; }
function T(s,t,o={}){ s.addText(t,{fontFace:F,color:o.color||INK2,valign:o.valign||'top',
  lineSpacingMultiple:o.lsm||1.4,...o}); }
function card(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:o.r||0.08,
  fill:{color:o.fill||WHITE},
  line:o.line===null?{type:'none'}:{color:o.line||LINE,width:o.lw!==undefined?o.lw:1.5}}); }
function rct(s,x,y,w,h,o={}){ s.addShape(pptx.ShapeType.rect,{x,y,w,h,fill:{color:o.fill||WHITE},
  line:o.line?{color:o.line,width:o.lw||1.5}:{type:'none'}}); }
function arw(s,x1,y1,x2,y2,c=GRAY2,w=1.75){
  s.addShape(pptx.ShapeType.line,{x:Math.min(x1,x2),y:Math.min(y1,y2),
    w:Math.abs(x2-x1)||0.008,h:Math.abs(y2-y1)||0.008,
    line:{color:c,width:w,endArrowType:'triangle'},flipH:x2<x1,flipV:y2<y1});
}
function chip(s,x,y,t,fg,bg,bd,wf){
  const w=wf||(0.135*t.length+0.40);
  s.addText(t,{x,y,w,h:0.30,fontSize:11,bold:true,color:fg,fill:{color:bg},
    line:{color:bd,width:1.3},align:'center',valign:'middle',fontFace:F,
    shape:pptx.ShapeType.roundRect,rectRadius:0.14});
  return w;
}

const s=base();

// ── 헤드 ──
rct(s,P,0.66,0.055,0.26,{fill:RED});
T(s,'THE CUSTOMER REALITY',{x:P+0.20,y:0.62,w:8,h:0.30,fontSize:11.5,bold:true,
  color:RED,charSpacing:1.6});
T(s,[{text:'궁금한 시간은 ',options:{}},{text:'아무 때나',options:{color:VIO}},
     {text:', 물어볼 시간은 ',options:{}},{text:'하루 9시간',options:{color:RED}}],
  {x:P,y:1.02,w:W,h:0.56,fontSize:28,bold:true,color:INK});

// ══════════════════════════════════════════════
// 좌 · 하루 24시간 게이지
// ══════════════════════════════════════════════
const LW=5.42, LY=1.94, LH=2.30;
card(s,P,LY,LW,LH,{fill:TINT,line:LINE});
T(s,'하루 24시간 중 응대가 되는 시간',{x:P+0.24,y:LY+0.14,w:3.10,h:0.26,
  fontSize:11.5,bold:true,color:GRAY,charSpacing:0.6});
T(s,'● 밤 22시 궁금증 발생',{x:P+LW-2.30,y:LY+0.14,w:2.06,h:0.26,fontSize:10,
  bold:true,color:RED,align:'right'});

// 24칸 게이지
const gx=P+0.26, gw=LW-0.52, cellW=gw/24;
for(let h=0;h<24;h++){
  const open = h>=9 && h<18;
  rct(s,gx+h*cellW+0.012,LY+0.50,cellW-0.024,0.44,
    {fill:open?BLU:'CBD5E1',line:null});
}
[[0,'0시'],[6,'6'],[12,'12'],[18,'18'],[24,'24시']].forEach(([h,lb])=>{
  T(s,lb,{x:gx+h*cellW-0.32,y:LY+0.98,w:0.64,h:0.22,fontSize:8.5,color:GRAY2,align:'center'});
});
// 마커
s.addShape(pptx.ShapeType.ellipse,{x:gx+22*cellW+cellW/2-0.09,y:LY+0.63,w:0.18,h:0.18,
  fill:{color:RED},line:{color:WHITE,width:1.6}});

// 큰 숫자 2개
const nw=(LW-0.52-0.16)/2;
card(s,P+0.26,LY+1.30,nw,0.92,{fill:BLUL,line:BLUB,lw:1.4});
T(s,[{text:'9',options:{fontSize:26}},{text:' 시간',options:{fontSize:12}}],
  {x:P+0.40,y:LY+1.38,w:nw-0.28,h:0.44,bold:true,color:BLU});
T(s,'열려 있음',{x:P+0.40,y:LY+1.88,w:nw-0.28,h:0.24,fontSize:10,color:INK2,bold:true});
card(s,P+0.26+nw+0.16,LY+1.30,nw,0.92,{fill:REDL,line:REDB,lw:1.4});
T(s,[{text:'15',options:{fontSize:26}},{text:' 시간',options:{fontSize:12}}],
  {x:P+0.40+nw+0.16,y:LY+1.38,w:nw-0.28,h:0.44,bold:true,color:RED});
T(s,'닫혀 있음  ·  하루의 62%',{x:P+0.40+nw+0.16,y:LY+1.88,w:nw-0.28,h:0.24,
  fontSize:10,color:RED,bold:true});

// ══════════════════════════════════════════════
// 우 · 다른 업종은 24시간
// ══════════════════════════════════════════════
const RX=P+LW+0.30, RW=W-LW-0.30;
T(s,'다른 업종에서는 이미 당연합니다',{x:RX+0.02,y:LY-0.32,w:RW,h:0.26,
  fontSize:11.5,bold:true,color:GRAY,charSpacing:0.6});
const bw=(RW-0.22)/2, bh=(LH-0.18)/2;
const BIZ=[
  ['온라인 쇼핑','밤에 주문, 새벽에 배송 조회','24시간',GRN,GRNL,GRNB,0],
  ['은행','잔고 · 이체 · 거래 명세','24시간',BLU,BLUL,BLUB,0],
  ['택배','지금 어느 터미널에 있는지까지','24시간',VIO,VIOL,VIOB,0],
  ['철강 발주','수천만 원인데 아침 9시를 기다림','업무시간만',RED,NAVY,RED,1],
];
BIZ.forEach(([t,d,tag,c,bg,bd,dark],i)=>{
  const x=RX+(i%2)*(bw+0.22), y=LY+Math.floor(i/2)*(bh+0.18);
  card(s,x,y,bw,bh,{fill:dark?NAVY:WHITE,line:dark?RED:LINE,lw:dark?2.2:1.5});
  rct(s,x,y,bw,0.055,{fill:c});
  T(s,t,{x:x+0.22,y:y+0.16,w:bw-0.44,h:0.30,fontSize:16,bold:true,
    color:dark?WHITE:c});
  T(s,d,{x:x+0.22,y:y+0.48,w:bw-0.44,h:0.28,fontSize:9.5,
    color:dark?'CBD5E1':GRAY,lsm:1.25});
  T(s,tag,{x:x+0.22,y:y+0.68,w:bw-0.44,h:0.32,fontSize:16,bold:true,
    color:dark?GOLD:c});
});

// ══════════════════════════════════════════════
// 중단 · 고객 이탈 경로 6단계
// ══════════════════════════════════════════════
const SY=4.50;
T(s,'그 사이 고객에게 일어나는 일',{x:P,y:SY-0.32,w:6,h:0.26,fontSize:11.5,
  bold:true,color:GRAY,charSpacing:0.6});
const STEP=[
  ['밤 22:00','궁금증 발생','"내 물건 언제 오지?"',VIO,VIOL,VIOB],
  ['11시간','그냥 기다림','아침 9시까지',BLU,BLUL,BLUB],
  ['09:00','전화','담당자 부재 · 다시',GOLD,GOLDL,GOLDB],
  ['답 들음','기록 안 남음','다음에 또 물어야',ORG,ORGL,ORGB],
  ['결국','안 묻고 넘어감','미안해서',RED,REDL,REDB],
  ['그래서','여유 재고 · 라인 대기','다른 업체 검토',WHITE,RED9,RED9],
];
const sw2=(W-5*0.22)/6, sh=1.40;
STEP.forEach(([t1,t2,t3,c,bg,bd],i)=>{
  const x=P+i*(sw2+0.22);
  const dark = i===5;
  card(s,x,SY,sw2,sh,{fill:dark?RED9:bg,line:dark?RED9:bd,lw:dark?2:1.5});
  T(s,t1,{x:x+0.16,y:SY+0.12,w:sw2-0.32,h:0.26,fontSize:10.5,bold:true,
    color:dark?'FCA5A5':c});
  T(s,t2,{x:x+0.16,y:SY+0.40,w:sw2-0.32,h:0.52,fontSize:13,bold:true,
    color:dark?WHITE:INK,lsm:1.2});
  T(s,t3,{x:x+0.16,y:SY+1.02,w:sw2-0.32,h:0.30,fontSize:9,
    color:dark?'FCA5A5':GRAY,lsm:1.25});
  if(i<5) arw(s,x+sw2+0.03,SY+sh/2,x+sw2+0.19,SY+sh/2,
    i<2?BLUB:(i<4?ORGB:REDB),2);
});

// ══════════════════════════════════════════════
// 하단 밴드
// ══════════════════════════════════════════════
card(s,P,6.06,W,0.66,{fill:NAVY,line:null});
T(s,[{text:'고객이 원하는 건 더 좋은 기술이 아니었습니다.   ',options:{color:WHITE}},
     {text:'다른 데서 다 되는 것이, 여기서만 안 되는 그 불편이었습니다.',options:{color:GOLD}}],
  {x:P+0.3,y:6.06,w:W-0.6,h:0.66,fontSize:16,bold:true,align:'center',valign:'middle'});

rct(s,P,6.94,W,0.012,{fill:LINE});
T(s,'5. 질문 ② 고객은 무엇을 원하는가',{x:P,y:7.02,w:6,h:0.26,fontSize:9.5,
  bold:true,color:GRAY2,charSpacing:1.4});
T(s,'오성철강  ·  25',{x:P+W-3,y:7.02,w:3,h:0.26,fontSize:9.5,bold:true,
  color:GRAY2,align:'right',charSpacing:1.2});

pptx.writeFile({ fileName: process.argv[2] || '오성철강_슬라이드25_리디자인.pptx' })
  .then(f=>console.log('✅ 완료: '+f))
  .catch(e=>{ console.error('❌', e); process.exit(1); });
