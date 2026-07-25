// src/pages/test/proposalScreens.jsx
// AI 신규제안 화면 2종: OCR 문서인식(No.7) / 카카오톡 주문접수 채널(No.12)
// ⚠️ 아직 실제 OCR 엔진·카카오 비즈니스 API는 연동되지 않은 "UI 선공개" 프로토타입입니다.
// 오성철강_AI도입계획안.docx 우선순위 제안 ①·②에 해당하는 화면 흐름을 미리 보여주기 위해
// 샘플 데이터로 동작합니다. 실제 개발 시 OCR 인식/카카오 API 연동 로직이 이 화면 뒤에 연결됩니다.
import React, { useState } from 'react';
import { COLORS, box, pill } from './theme';

function ProposalBanner({ text }) {
  return (
    <div style={{
      background: COLORS.accentSoft, border: `1px solid ${COLORS.accentBg}`, borderRadius: '14px',
      padding: '14px 20px', fontSize: '14px', color: COLORS.accentDark, lineHeight: 1.6,
      display: 'flex', gap: '10px', alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: '16px' }}>💡</span>
      <span>{text}</span>
    </div>
  );
}

function confidenceStyle(c) {
  if (c >= 97) return [COLORS.greenBg, COLORS.green];
  if (c >= 90) return [COLORS.amberBg, COLORS.amber];
  return [COLORS.redBg, COLORS.red];
}

// ---------- OCR 문서인식 (No.7) ----------
const SAMPLE_DOCS = [
  { name: '이관요청서_삼성강판_0725.jpg', customer_name: '(주)삼성강판', material_no: 'MJ-20260725-014', product_name: 'SPHC 3.0T', spec: '1219x2438', original_weight: '1,240', due_date: '2026-07-28' },
  { name: '이관요청서_한일철강_0725.jpg', customer_name: '한일철강(주)', material_no: 'MJ-20260725-021', product_name: 'SGCC 2.3T', spec: '1000x2000', original_weight: '980', due_date: '2026-07-29' },
];

export function OcrDocumentIntake() {
  const [step, setStep] = useState('idle'); // idle | scanning | reviewing
  const [docIdx, setDocIdx] = useState(0);
  const [form, setForm] = useState(null);
  const [history, setHistory] = useState([
    { name: '이관요청서_대한제강_0724.jpg', customer_name: '대한제강(주)', product_name: 'SPCC 1.6T', weight: '640', confidence: 97, registeredAt: '07-24 16:42' },
  ]);

  const scan = (idx) => {
    setDocIdx(idx);
    setStep('scanning');
    setTimeout(() => {
      setForm({ ...SAMPLE_DOCS[idx], confidence: { customer_name: 99, material_no: 96, product_name: 98, spec: 94, original_weight: 99, due_date: 92 } });
      setStep('reviewing');
    }, 900);
  };

  const register = () => {
    const avg = Math.round(Object.values(form.confidence).reduce((a, b) => a + b, 0) / Object.values(form.confidence).length);
    setHistory([{ name: SAMPLE_DOCS[docIdx].name, customer_name: form.customer_name, product_name: form.product_name, weight: form.original_weight, confidence: avg, registeredAt: '방금' }, ...history]);
    setStep('idle');
    setForm(null);
  };

  const FIELD_LABELS = [
    ['customer_name', '거래처'], ['material_no', '소재번호'], ['product_name', '품명'],
    ['spec', '규격'], ['original_weight', '원중량(kg)'], ['due_date', '입고예정일'],
  ];

  return (
    <div style={box.page}>
      <div>
        <h2 style={box.title}>OCR 문서인식 · 이관요청서 자동등록 <span style={{ marginLeft: '10px', verticalAlign: 'middle' }}><span style={pill(COLORS.accentBg, COLORS.accentDark)}>제안 · No.7</span></span></h2>
        <p style={box.hint}>FAX로 받는 이관요청서·송장·밀시트를 자동 판독해 ERP 입고예정에 등록합니다.</p>
      </div>
      <ProposalBanner text="제안 단계 화면입니다. 실제 OCR 엔진은 아직 연동 전이며, 아래는 샘플 문서로 인식 → 확인 → 등록 흐름을 미리 보여주는 프로토타입입니다." />

      <div style={box.card}>
        <h3 style={box.subtitle}>1. 문서 업로드</h3>
        <p style={{ fontSize: '15px', color: COLORS.steel, marginBottom: '16px' }}>실제 화면에서는 FAX 수신함에서 이관요청서 이미지를 자동으로 가져옵니다. 아래에서 샘플 문서를 선택해 인식 과정을 확인해보세요.</p>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          {SAMPLE_DOCS.map((d, i) => (
            <button key={d.name} onClick={() => scan(i)} disabled={step === 'scanning'}
              style={{
                ...box.ghostBtn, display: 'flex', alignItems: 'center', gap: '10px',
                borderColor: step !== 'idle' && docIdx === i ? COLORS.accent : COLORS.border,
              }}>
              📄 {d.name}
            </button>
          ))}
        </div>
      </div>

      {step === 'scanning' && (
        <div style={{ ...box.card, textAlign: 'center', color: COLORS.steel, fontSize: '16px' }}>
          🔍 OCR 인식 중입니다... ({SAMPLE_DOCS[docIdx].name})
        </div>
      )}

      {step === 'reviewing' && form && (
        <div style={box.card}>
          <h3 style={box.subtitle}>2. 인식 결과 확인 · 필드별 신뢰도</h3>
          <div style={box.formGrid}>
            {FIELD_LABELS.map(([key, label]) => {
              const [bg, color] = confidenceStyle(form.confidence[key]);
              return (
                <div key={key}>
                  <label style={box.label}>{label} <span style={{ ...pill(bg, color), marginLeft: '6px', fontSize: '11px', padding: '3px 10px' }}>신뢰도 {form.confidence[key]}%</span></label>
                  <input style={box.input} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                </div>
              );
            })}
          </div>
          <p style={box.hint}>신뢰도 90% 미만 항목은 붉은색으로 강조되어 담당자 확인을 유도합니다. 값은 등록 전 자유롭게 수정할 수 있습니다.</p>
          <div style={{ marginTop: '18px', display: 'flex', gap: '10px' }}>
            <button style={box.primaryBtn} onClick={register}>ERP 입고예정 등록</button>
            <button style={box.ghostBtn} onClick={() => { setStep('idle'); setForm(null); }}>취소</button>
          </div>
        </div>
      )}

      <div style={box.card}>
        <h3 style={box.subtitle}>최근 자동등록 내역</h3>
        <table style={box.table}>
          <thead><tr><th style={box.th}>문서명</th><th style={box.th}>거래처</th><th style={box.th}>품명</th><th style={box.th}>원중량</th><th style={box.th}>평균 신뢰도</th><th style={box.th}>등록시각</th></tr></thead>
          <tbody>
            {history.map((h, i) => {
              const [bg, color] = confidenceStyle(h.confidence);
              return (
                <tr key={i}>
                  <td style={box.td}>{h.name}</td>
                  <td style={box.td}>{h.customer_name}</td>
                  <td style={box.td}>{h.product_name}</td>
                  <td style={box.td}>{h.weight}kg</td>
                  <td style={box.td}><span style={pill(bg, color)}>{h.confidence}%</span></td>
                  <td style={box.td}>{h.registeredAt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- 카카오톡 주문접수 채널 (No.12) ----------
const SAMPLE_THREADS = [
  {
    id: 1, company: '(주)삼성강판', unread: true, status: '미확인', time: '09:12',
    messages: [
      { type: 'text', text: '안녕하세요, 오늘 이관요청서 보내드립니다.' },
      { type: 'image', text: '[이미지] 이관요청서_삼성강판_0725.jpg' },
      { type: 'text', text: 'SPHC 3.0T 1240kg 입고 예정입니다. 확인 부탁드려요.' },
    ],
    parsed: { customer_name: '(주)삼성강판', product_name: 'SPHC 3.0T', weight: '1,240', request: '이관요청서 접수' },
  },
  {
    id: 2, company: '한일철강(주)', unread: true, status: '미확인', time: '10:03',
    messages: [
      { type: 'text', text: '가공 요청드립니다. 슬리팅 폭 조정 가능할까요?' },
    ],
    parsed: { customer_name: '한일철강(주)', product_name: '-', weight: '-', request: '가공요청 문의' },
  },
  {
    id: 3, company: '대한제강(주)', unread: false, status: '등록완료', time: '어제',
    messages: [
      { type: 'image', text: '[이미지] 이관요청서_대한제강_0724.jpg' },
    ],
    parsed: { customer_name: '대한제강(주)', product_name: 'SPCC 1.6T', weight: '640', request: '이관요청서 접수' },
  },
];

function statusStyle(s) {
  if (s === '등록완료') return [COLORS.greenBg, COLORS.green];
  if (s === '처리중') return [COLORS.amberBg, COLORS.amber];
  return ['#edf2f7', COLORS.steel];
}

export function KakaoOrderChannel() {
  const [threads, setThreads] = useState(SAMPLE_THREADS);
  const [activeId, setActiveId] = useState(SAMPLE_THREADS[0].id);
  const active = threads.find((t) => t.id === activeId);

  const setStatus = (id, status) => {
    setThreads(threads.map((t) => (t.id === id ? { ...t, status, unread: false } : t)));
  };

  return (
    <div style={box.page}>
      <div>
        <h2 style={box.title}>카카오톡 주문접수 채널 <span style={{ marginLeft: '10px' }}><span style={pill(COLORS.accentBg, COLORS.accentDark)}>제안 · No.12</span></span></h2>
        <p style={box.hint}>전화·FAX 대신 카카오톡으로 문의와 이관요청서를 받아, OCR 문서인식(No.7)과 연계해 오성 ERP에 등록합니다.</p>
      </div>
      <ProposalBanner text="제안 단계 화면입니다. 실제 카카오 비즈니스 API는 아직 연동 전이며, 아래는 샘플 대화로 접수 → 확인 → 등록 흐름을 미리 보여주는 프로토타입입니다." />

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ ...box.card, width: '300px', flexShrink: 0, padding: '14px' }}>
          <h3 style={{ ...box.subtitle, fontSize: '17px', border: 'none', padding: '4px 8px 12px', margin: 0 }}>받은 문의 · {threads.filter((t) => t.unread).length}건 미확인</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {threads.map((t) => {
              const [bg, color] = statusStyle(t.status);
              return (
                <div key={t.id} onClick={() => setActiveId(t.id)} style={{
                  padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
                  backgroundColor: activeId === t.id ? COLORS.accentSoft : 'transparent',
                  border: activeId === t.id ? `1px solid ${COLORS.accentBg}` : '1px solid transparent',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: t.unread ? 800 : 600, fontSize: '15px', color: '#243040' }}>{t.company}</span>
                    <span style={{ fontSize: '12px', color: COLORS.steelLight }}>{t.time}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: COLORS.steel, marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.messages[t.messages.length - 1].text}
                  </div>
                  <span style={{ ...pill(bg, color), marginTop: '6px', fontSize: '11px', padding: '3px 10px', display: 'inline-flex' }}>{t.status}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ ...box.card, flex: 1, minWidth: '340px' }}>
          {!active ? <p style={box.emptyText}>왼쪽에서 대화를 선택하세요.</p> : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ ...box.subtitle, border: 'none', margin: 0, padding: 0 }}>{active.company}</h3>
                <span style={pill(...statusStyle(active.status))}>{active.status}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' }}>
                {active.messages.map((m, i) => (
                  <div key={i} style={{
                    alignSelf: 'flex-start', maxWidth: '70%', backgroundColor: '#fee500', color: '#3c1e1e',
                    padding: '10px 16px', borderRadius: '4px 16px 16px 16px', fontSize: '15px', lineHeight: 1.5,
                  }}>
                    {m.type === 'image' ? `🖼️ ${m.text}` : m.text}
                  </div>
                ))}
              </div>
              <div style={{ backgroundColor: COLORS.bg, borderRadius: '14px', padding: '18px 20px' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 800, color: COLORS.steel }}>자동 파싱 결과</h4>
                <p style={{ fontSize: '15px', color: '#2d3748', lineHeight: 1.9, margin: 0 }}>
                  거래처: {active.parsed.customer_name}<br />
                  품명: {active.parsed.product_name}<br />
                  중량: {active.parsed.weight !== '-' ? `${active.parsed.weight}kg` : '-'}<br />
                  요청유형: {active.parsed.request}
                </p>
              </div>
              <div style={{ marginTop: '18px', display: 'flex', gap: '10px' }}>
                <button style={box.primaryBtn} onClick={() => setStatus(active.id, '등록완료')} disabled={active.status === '등록완료'}>
                  {active.parsed.request === '이관요청서 접수' ? 'OCR 연계 · 이관요청서로 등록' : '문의로 등록'}
                </button>
                <button style={box.ghostBtn} onClick={() => setStatus(active.id, '처리중')} disabled={active.status === '등록완료'}>담당자 배정</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
