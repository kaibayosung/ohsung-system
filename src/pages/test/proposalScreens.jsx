// src/pages/test/proposalScreens.jsx
// AI 신규제안 화면 3종: OCR 문서인식(No.7) / 카카오톡 주문접수 채널(No.12) / 현장 코일 확정(No.13)
// ⚠️ 아직 실제 OCR 엔진·카카오 비즈니스 API·그린ERP 쓰기 연동은 연결되지 않은 "UI 선공개" 프로토타입입니다.
// 오성철강_AI도입계획안.docx 우선순위 제안 ①·②·③에 해당하는 화면 흐름을 미리 보여주기 위해
// 샘플 데이터로 동작합니다. 실제 개발 시 OCR 인식/카카오 API/그린ERP 저장 로직이 이 화면 뒤에 연결됩니다.
// 추가: OrderFlowV2 (파일 하단) — 이해관계자 검토회의(1~5차) 12개 결정사항을 반영한 통합 흐름입니다.
import React, { useState, useEffect } from 'react';
import { COLORS, box, pill } from './theme';
import { supabase, supabaseUrl } from '../../supabaseClient';

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

// ---------- FAX 작업요청서 접수 → 작업지시서 초안 (No.13-1) ----------
// 주문접수 자동화 상세 시나리오 STEP 1·2에 해당. 카카오톡 계정이 아직 없어 우선 FAX 접수분만 다룹니다.
// 여기서 만든 초안은 ERP2.0 내부에만 존재하며(그린ERP에는 아직 반영 안 함), 담당자 승인 후 '배차대기'로
// 바뀌어야 현장 코일확정(No.13-2) 화면에 노출됩니다 — 사람 확인 절차를 유지하기 위함입니다.
export function FaxJoborderIntake({ drafts, onCreateDraft, onApprove }) {
  // 이 화면은 이제 샘플 문서가 아니라, 이미 운영 중인 실제 FAX 수신 기능(엔팩스 enfax.com 연동,
  // SalesWorkflowPage.jsx의 영업(OF) 발주등록 화면과 동일한 enfax-sync / enfax-ocr Edge Function)을
  // 그대로 재사용합니다. 다른 점은 딱 하나 — 여기서는 enfax_inbox.status를 건드리지 않습니다.
  // (그 값은 실제 영업 담당자의 발주등록 화면이 같이 쓰는 큐 상태라서, 이 프로토타입에서 'done'
  // 처리해버리면 실제 업무 화면에서 그 팩스가 사라져 보이는 문제가 생기기 때문입니다.)
  const [inbox, setInbox] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [checkingFax, setCheckingFax] = useState(false);
  const [ocrLoadingId, setOcrLoadingId] = useState(null);
  const [ocrError, setOcrError] = useState('');
  const [form, setForm] = useState(null); // { fax, customer_name, material, spec, qty_weight, work_type, due_date }

  const loadInbox = async () => {
    setLoadingInbox(true);
    const { data, error } = await supabase.from('enfax_inbox').select('*').order('received_at', { ascending: false }).limit(20);
    if (!error) setInbox(data || []);
    setLoadingInbox(false);
  };

  useEffect(() => { loadInbox(); }, []);

  const checkFaxNow = async () => {
    setCheckingFax(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/enfax-sync?recordCount=50`);
      const json = await res.json();
      if (!json.ok) { alert('FAX 정보 확인 실패: ' + (json.error || '알 수 없는 오류')); return; }
      await loadInbox();
      alert(json.insertedCount > 0 ? `신규 팩스 ${json.insertedCount}건을 받아왔습니다.` : '새로 수신된 팩스가 없습니다.');
    } catch (e) {
      alert('FAX 정보 확인 중 오류: ' + e.message);
    } finally {
      setCheckingFax(false);
    }
  };

  const runOcr = async (f) => {
    if (!f.file_path) { alert('파일 경로 정보가 없습니다.'); return; }
    setOcrLoadingId(f.id);
    setOcrError('');
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/enfax-ocr?filePath=${encodeURIComponent(f.file_path)}`);
      const json = await res.json();
      if (!json.ok) { setOcrError('AI 인식 실패: ' + (json.error || '알 수 없는 오류')); return; }
      const ex = json.extracted || {};
      const first = Array.isArray(ex.items) && ex.items.length > 0 ? ex.items[0] : {};
      setForm({
        fax: f,
        customer_name: ex.company_name || f.sender || '',
        // 실제 OCR 결과는 두께/폭/중량/메이커/슬릿규격/수량(품목표) 단위입니다.
        // 작업지시서 초안 필드(강종·규격·가공내용)로 근사 매핑한 것으로, 담당자 확인이 꼭 필요합니다.
        material: first.maker || '',
        spec: [first.thick, first.width].filter(Boolean).join(' X ') || '',
        qty_weight: first.weight != null ? String(first.weight) : '',
        work_type: first.slit || '',
        due_date: ex.due_date || '',
      });
    } catch (e) {
      setOcrError('AI 인식 중 오류: ' + e.message);
    } finally {
      setOcrLoadingId(null);
    }
  };

  const createDraft = () => {
    onCreateDraft({
      customer_name: form.customer_name, material: form.material, spec: form.spec,
      qty_weight: form.qty_weight, work_type: form.work_type, due_date: form.due_date,
      source: 'FAX(엔팩스 실연동)', sourceDoc: form.fax.file_name, confidence: null,
    });
    setForm(null);
  };

  const FIELD_LABELS = [
    ['customer_name', '거래처'], ['material', '강종/재질(메이커 값 참고)'], ['spec', '규격(두께 X 폭)'],
    ['qty_weight', '요청중량(kg)'], ['work_type', '가공내용(슬릿규격 참고)'], ['due_date', '희망납기일'],
  ];

  function statusPill(s) {
    if (s === '배정완료') return pill(COLORS.greenBg, COLORS.green);
    if (s === '배차대기') return pill(COLORS.amberBg, COLORS.amber);
    return pill('#edf2f7', COLORS.steel); // 초안
  }

  return (
    <div style={box.page}>
      <div>
        <h2 style={box.title}>FAX 작업요청서 접수 · 작업지시서 초안 <span style={{ marginLeft: '10px', verticalAlign: 'middle' }}><span style={pill(COLORS.accentBg, COLORS.accentDark)}>제안 · No.13-1</span></span></h2>
        <p style={box.hint}>실제 운영 중인 엔팩스 FAX 수신함(엔팩스)과 AI 자동인식을 그대로 사용해, ERP2.0 안에 작업지시서 초안을 만듭니다. 그린ERP에는 아직 반영하지 않고, 담당자 승인 후 지게차 기사 화면(현장 코일확정)에 노출됩니다.</p>
      </div>
      <ProposalBanner text="카카오톡 채널은 아직 계정이 없어 이번 1차 개발 범위에서 제외했습니다. 대신 이미 만들어져 있는 실제 FAX 수신(엔팩스) + AI 자동인식 기능을 그대로 재사용합니다 — 아래 목록은 실제 수신함 데이터입니다." />

      <div style={box.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ ...box.subtitle, border: 'none', margin: 0, padding: 0 }}>1. 엔팩스 수신함 (실제 데이터)</h3>
          <button style={{ ...box.primaryBtn, padding: '10px 20px', fontSize: '15px' }} disabled={checkingFax} onClick={checkFaxNow}>
            {checkingFax ? '확인 중...' : '📠 FAX 정보 확인하기'}
          </button>
        </div>
        {loadingInbox ? (
          <p style={box.loadingText}>불러오는 중...</p>
        ) : inbox.length === 0 ? (
          <p style={box.emptyText}>수신된 팩스가 없습니다. 위 버튼을 눌러 엔팩스(fax.enfax.com) 수신함을 조회해보세요.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {inbox.map((f) => (
              <div key={f.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                background: f.status === 'new' ? COLORS.accentSoft : COLORS.bg,
                border: `1px solid ${f.status === 'new' ? COLORS.accentBg : COLORS.border}`,
                borderRadius: '10px', padding: '12px 16px',
              }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: f.status === 'new' ? 800 : 600, color: '#243040' }}>
                    {f.sender || '(발신자 미상)'} {f.status === 'new' && <span style={{ fontSize: '11px', color: COLORS.accentDark, marginLeft: '6px' }}>NEW</span>}
                  </div>
                  <div style={{ fontSize: '13px', color: COLORS.steelLight, marginTop: '2px' }}>
                    {f.fax_number} · {f.received_at ? new Date(f.received_at).toLocaleString('ko-KR') : ''} · {f.pages}페이지 · {f.file_name}
                  </div>
                </div>
                <button style={{ ...box.ghostBtn, padding: '9px 16px', fontSize: '14px' }} disabled={!f.file_path || ocrLoadingId === f.id} onClick={() => runOcr(f)}>
                  {ocrLoadingId === f.id ? '인식 중...' : '🤖 AI 자동인식'}
                </button>
              </div>
            ))}
          </div>
        )}
        {ocrError && (
          <div style={{ marginTop: '14px', backgroundColor: COLORS.redBg, color: COLORS.red, padding: '12px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 700 }}>⚠️ {ocrError}</div>
        )}
      </div>

      {form && (
        <div style={box.card}>
          <h3 style={box.subtitle}>2. 인식 결과 확인 · 작업지시서 초안으로 변환</h3>
          <p style={box.hint}>원본 팩스: {form.fax.file_name} · 발신 {form.fax.sender}</p>
          <div style={box.formGrid}>
            {FIELD_LABELS.map(([key, label]) => (
              <div key={key}>
                <label style={box.label}>{label}</label>
                <input style={box.input} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
          </div>
          <p style={box.hint}>거래처는 자동으로 확정하지 않습니다 — 담당자가 이 화면에서 직접 확인한 뒤 등록해야 합니다(3자 거래 사례 대응). AI 인식 항목은 실제 발주등록 화면의 품목 스키마(두께·폭·메이커·슬릿규격)를 강종/규격/가공내용으로 근사 매핑한 값이라 반드시 원본과 대조해주세요.</p>
          <div style={{ marginTop: '18px', display: 'flex', gap: '10px' }}>
            <button style={box.primaryBtn} onClick={createDraft}>작업지시서 초안 등록</button>
            <button style={box.ghostBtn} onClick={() => setForm(null)}>취소</button>
          </div>
        </div>
      )}

      <div style={box.card}>
        <h3 style={box.subtitle}>작업지시서 초안 목록</h3>
        <table style={box.table}>
          <thead>
            <tr>
              <th style={box.th}>거래처</th><th style={box.th}>강종/규격</th><th style={box.th}>요청중량</th>
              <th style={box.th}>가공내용</th><th style={box.th}>희망납기일</th><th style={box.th}>상태</th><th style={box.th}>승인</th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((d) => (
              <tr key={d.id}>
                <td style={box.td}>{d.customer_name}</td>
                <td style={box.td}>{d.material} · {d.spec}</td>
                <td style={box.td}>{d.qty_weight}kg</td>
                <td style={box.td}>{d.work_type}</td>
                <td style={box.td}>{d.due_date}</td>
                <td style={box.td}><span style={statusPill(d.status)}>{d.status}</span></td>
                <td style={box.td}>
                  {d.status === '초안' ? (
                    <button style={{ ...box.ghostBtn, padding: '7px 14px', fontSize: '13px' }} onClick={() => onApprove(d.id)}>배차 승인</button>
                  ) : d.status === '배차대기' ? (
                    <span style={{ color: COLORS.steelLight, fontSize: '13px' }}>현장 확정 대기중</span>
                  ) : (
                    <span style={{ color: COLORS.steelLight, fontSize: '13px' }}>코일 {d.assigned_coil_id}</span>
                  )}
                </td>
              </tr>
            ))}
            {drafts.length === 0 && (
              <tr><td style={box.td} colSpan={7}><span style={box.emptyText}>등록된 작업지시서 초안이 없습니다.</span></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- 현장 코일확정 (No.13-2) — 지게차 기사 화면 ----------
// 시나리오 STEP 3·4 통합본: 코일 선택은 전적으로 지게차 기사의 역할입니다. 사무실이 후보를 미리
// 걸러두지 않고, 기사가 QR 스캔 또는 코일ID 검색 중 편한 방식으로 실물 코일을 확정합니다.
// 재고 목록은 샘플이 아니라 그린ERP에서 실시간 동기화되는 실제 재고(greenp_inventory)를 그대로
// 읽어옵니다 — 품명(product_name) 필드가 곧 실물 코일ID입니다(6장 코일ID 정정 확인 참고).
// 동시배정은 '확정' 순간 재고 상태를 다시 검사하는 원자적 체크로 방지합니다 — 처음 불러온 재고 중
// 하나를 데모용으로 '이미 배정됨'으로 표시해 그 처리를 시연합니다. (실제로는 서버측 조건부 UPDATE로 대체)
export function FieldCoilConfirm({ drafts, onConfirmCoil }) {
  const waiting = drafts.filter((d) => d.status === '배차대기');
  const [activeId, setActiveId] = useState(waiting[0]?.id ?? null);
  const active = drafts.find((d) => d.id === activeId);
  const [mode, setMode] = useState('qr'); // qr | search
  const [scannedCoil, setScannedCoil] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [loadingInv, setLoadingInv] = useState(true);
  const [takenIds, setTakenIds] = useState(new Set());

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from('greenp_inventory')
        .select('*')
        .gt('remaining_weight', 0)
        .order('received_date', { ascending: false })
        .limit(30);
      if (!err && data) {
        setInventory(data);
        // 데모용 — 방금 불러온 재고 중 첫 번째를 이미 다른 작업에 배정된 것으로 가정해
        // 동시배정 방지 흐름을 바로 확인할 수 있게 합니다.
        if (data.length > 0) setTakenIds(new Set([data[0].product_name]));
      }
      setLoadingInv(false);
    })();
  }, []);

  const openOrder = (id) => {
    setActiveId(id);
    setScannedCoil(null);
    setQuery('');
    setError('');
    setMode('qr');
  };

  const simulateScan = () => {
    // 데모용 — 매번 아직 배정되지 않은 코일 중 하나를 스캔한 것으로 시뮬레이션
    const candidates = inventory.filter((c) => !takenIds.has(c.product_name));
    if (candidates.length === 0) return;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    setScannedCoil(picked.product_name);
    setError('');
  };

  const filteredInventory = inventory.filter((c) =>
    query.trim() === '' || (c.product_name || '').toLowerCase().includes(query.trim().toLowerCase())
  );

  const confirmCoil = (coilId) => {
    const coil = inventory.find((c) => c.product_name === coilId);
    if (!coil) return;
    if (takenIds.has(coilId)) {
      // 원자적 체크 실패 시나리오 — 이미 다른 작업지시서에 배정된 코일
      setError(`코일 ${coilId}는 이미 다른 작업에 배정되어 있습니다. 다른 코일을 선택해주세요.`);
      return;
    }
    setSaving(true);
    setError('');
    setTimeout(() => {
      setTakenIds((prev) => new Set(prev).add(coilId)); // 데모용 즉시 잠금 (실제로는 서버측 조건부 UPDATE)
      onConfirmCoil(active.id, coilId);
      setSaving(false);
      setScannedCoil(null);
      const next = drafts.find((d) => d.status === '배차대기' && d.id !== active.id);
      setActiveId(next ? next.id : null);
    }, 700);
  };

  return (
    <div style={box.page}>
      <div>
        <h2 style={box.title}>현장 코일확정 · 지게차 기사용 <span style={{ marginLeft: '10px', verticalAlign: 'middle' }}><span style={pill(COLORS.accentBg, COLORS.accentDark)}>제안 · No.13-2</span></span></h2>
        <p style={box.hint}>배차대기 중인 작업지시서에서, 실제로 어떤 코일을 쓸지는 지게차 기사가 야드에서 직접 확정합니다. QR 스캔 또는 코일ID 검색 중 편한 방식을 쓸 수 있습니다.</p>
      </div>
      <ProposalBanner text="지게차 기사가 코일을 확정하는 순간 재고 상태를 다시 검사해, 이미 다른 작업에 배정된 코일이면 즉시 막습니다(동시배정 방지). 사무실이 후보를 미리 걸러두지 않아도 안전합니다." />

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ ...box.card, width: '300px', flexShrink: 0, padding: '14px' }}>
          <h3 style={{ ...box.subtitle, fontSize: '17px', border: 'none', padding: '4px 8px 12px', margin: 0 }}>배차대기 · {waiting.length}건</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {waiting.map((d) => (
              <div key={d.id} onClick={() => openOrder(d.id)} style={{
                padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
                backgroundColor: activeId === d.id ? COLORS.accentSoft : 'transparent',
                border: activeId === d.id ? `1px solid ${COLORS.accentBg}` : '1px solid transparent',
              }}>
                <div style={{ fontWeight: 800, fontSize: '15px', color: '#243040' }}>{d.customer_name}</div>
                <div style={{ fontSize: '13px', color: COLORS.steel, marginTop: '4px' }}>{d.material} · {d.spec}</div>
                <div style={{ fontSize: '12px', color: COLORS.steelLight, marginTop: '2px' }}>{d.work_type} · 납기 {d.due_date}</div>
              </div>
            ))}
            {waiting.length === 0 && <p style={box.emptyText}>배차대기 중인 작업지시서가 없습니다.</p>}
          </div>
        </div>

        <div style={{ ...box.card, flex: 1, minWidth: '380px' }}>
          {!active ? <p style={box.emptyText}>왼쪽에서 작업지시서를 선택하세요.</p> : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ ...box.subtitle, border: 'none', margin: 0, padding: 0 }}>{active.customer_name}</h3>
                <span style={pill(COLORS.amberBg, COLORS.amber)}>배차대기</span>
              </div>
              <p style={{ fontSize: '15px', color: '#2d3748', lineHeight: 1.8, margin: '0 0 18px' }}>
                요청규격: {active.material} · {active.spec}<br />
                요청중량: {active.qty_weight}kg &nbsp;·&nbsp; 가공내용: {active.work_type} &nbsp;·&nbsp; 희망납기: {active.due_date}
              </p>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button onClick={() => setMode('qr')} style={{ ...box.ghostBtn, padding: '9px 18px', fontSize: '14px', ...(mode === 'qr' ? { backgroundColor: COLORS.navy, color: '#fff', borderColor: COLORS.navy } : {}) }}>📷 QR 스캔</button>
                <button onClick={() => setMode('search')} style={{ ...box.ghostBtn, padding: '9px 18px', fontSize: '14px', ...(mode === 'search' ? { backgroundColor: COLORS.navy, color: '#fff', borderColor: COLORS.navy } : {}) }}>🔎 코일ID 검색</button>
              </div>

              {mode === 'qr' ? (
                <div style={{ backgroundColor: COLORS.bg, borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
                  {!scannedCoil ? (
                    <>
                      <p style={{ color: COLORS.steel, fontSize: '15px', marginBottom: '14px' }}>스캐너로 코일에 붙은 QR을 스캔하세요. (현재는 회사 보유 스캐너 모델 확인 전이라 시뮬레이션 버튼으로 대체)</p>
                      <button style={box.primaryBtn} onClick={simulateScan}>QR 스캔 시뮬레이션</button>
                    </>
                  ) : (
                    <>
                      <p style={{ color: COLORS.steel, fontSize: '14px', marginBottom: '8px' }}>스캔된 코일ID</p>
                      <p style={{ fontSize: '24px', fontWeight: 900, color: COLORS.navy, marginBottom: '18px' }}>{scannedCoil}</p>
                      <button style={box.primaryBtn} onClick={() => confirmCoil(scannedCoil)} disabled={saving}>{saving ? '확정 처리중...' : '이 코일로 확정'}</button>
                      <button style={{ ...box.ghostBtn, marginLeft: '10px' }} onClick={() => setScannedCoil(null)}>다시 스캔</button>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <input style={{ ...box.input, marginBottom: '12px' }} placeholder="코일ID로 검색 (예: H3D)" value={query} onChange={(e) => setQuery(e.target.value)} />
                  {loadingInv ? (
                    <p style={box.loadingText}>실제 재고(그린ERP) 불러오는 중...</p>
                  ) : (
                    <table style={box.table}>
                      <thead><tr><th style={box.th}>코일ID(품명)</th><th style={box.th}>거래처</th><th style={box.th}>규격</th><th style={box.th}>잔량</th><th style={box.th}>상태</th><th style={box.th}></th></tr></thead>
                      <tbody>
                        {filteredInventory.map((c) => {
                          const taken = takenIds.has(c.product_name);
                          return (
                            <tr key={c.product_code || c.product_name}>
                              <td style={box.td}>{c.product_name}</td>
                              <td style={box.td}>{c.customer_name}</td>
                              <td style={box.td}>{c.spec}</td>
                              <td style={box.td}>{Number(c.remaining_weight || 0).toLocaleString()}kg</td>
                              <td style={box.td}>{taken ? <span style={pill(COLORS.redBg, COLORS.red)}>배정됨</span> : <span style={pill(COLORS.greenBg, COLORS.green)}>가용</span>}</td>
                              <td style={box.td}>
                                <button style={{ ...box.ghostBtn, padding: '7px 14px', fontSize: '13px' }} disabled={taken || saving} onClick={() => confirmCoil(c.product_name)}>확정</button>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredInventory.length === 0 && (
                          <tr><td style={box.td} colSpan={6}><span style={box.emptyText}>검색된 재고가 없습니다.</span></td></tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {error && (
                <div style={{ marginTop: '14px', backgroundColor: COLORS.redBg, color: COLORS.red, padding: '12px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 700 }}>
                  ⚠️ {error}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div style={box.card}>
        <h3 style={box.subtitle}>확정 완료 · 그린ERP 반영 대기</h3>
        <table style={box.table}>
          <thead><tr><th style={box.th}>거래처</th><th style={box.th}>확정 코일ID</th><th style={box.th}>가공내용</th><th style={box.th}>상태</th></tr></thead>
          <tbody>
            {drafts.filter((d) => d.status === '배정완료').map((d) => (
              <tr key={d.id}>
                <td style={box.td}>{d.customer_name}</td>
                <td style={box.td}>{d.assigned_coil_id}</td>
                <td style={box.td}>{d.work_type}</td>
                <td style={box.td}><span style={pill(COLORS.greenBg, COLORS.green)}>배정완료 · 그린ERP 반영 대기(1차: 입력보조)</span></td>
              </tr>
            ))}
            {drafts.filter((d) => d.status === '배정완료').length === 0 && (
              <tr><td style={box.td} colSpan={4}><span style={box.emptyText}>아직 확정된 작업이 없습니다.</span></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- 신규서비스 통합 흐름 v2 ----------
// 2026-07 이해관계자 검토회의(1~5차, 이원춘 이사/지게차 기사/고객사 담당자/멜벤/대표님/정대균 실장)에서
// 확정한 12개 결정사항을 반영한 통합 프로토타입입니다. 기존 'FAX 작업요청서 접수'·'현장 코일확정' 탭은
// 그대로 남겨두고(결정12: 언제든 기존 방식과 병행 가능), 이 화면은 회의에서 새로 확정된 요구사항을
// 반영한 버전입니다.
//  결정3 초안 등록 화면에 원본 팩스 대조 UI 추가
//        (※ 엔팩스 파일은 로그인 세션이 있어야 열람 가능해 지금 당장 <img>로 띄울 수 없습니다.
//         이미지 프록시 Edge Function은 아직 없다는 점을 화면에 그대로 안내하고, "대조 확인" 체크를
//         받는 방식으로 우선 구현했습니다.)
//  결정5 거래처는 자동확정하지 않고, "원본과 대조 확인" 체크를 완료해야 초안 등록 버튼이 활성화됨
//  결정6 현장 코일확정 화면에 요청 규격을 태블릿에서 큼직하게 참고 표시 (자동 필터링 아님)
//  결정7 확정된 코일 정보를 멜벤용 라인 대시보드에도 표시
//  결정8 1차 상용화 범위 = 슬리팅2 라인 (화면 상단 배지로 명시)
//  결정9 지게차 기사는 정식 로그인 대신 "기사 이름 선택 + 확정 이력 기록"으로 최소 추적성 확보
const DRIVER_NAMES = ['김철수', '박영수', '이만호'];

const V2_SUBTABS = [
  { key: 'intake', label: '① 주문접수 · 초안', icon: '📠' },
  { key: 'field', label: '② 현장 코일확정 (태블릿)', icon: '🚜' },
  { key: 'line', label: '③ 라인 대시보드 · 멜벤', icon: '🖥️' },
];

export function OrderFlowV2({ drafts, onCreateDraft, onApprove, onConfirmCoil }) {
  const [sub, setSub] = useState('intake');
  return (
    <div style={box.page}>
      <div>
        <h2 style={box.title}>
          신규서비스 통합 흐름
          <span style={{ marginLeft: '10px', verticalAlign: 'middle' }}>
            <span style={pill(COLORS.accentBg, COLORS.accentDark)}>v2 · 이해관계자 검토회의 반영</span>
          </span>
        </h2>
        <p style={box.hint}>이원춘 이사 · 지게차 기사 · 고객사 담당자 · 멜벤 · 대표님 · 정대균 실장 5차 검토회의에서 확정한 12개 결정사항을 반영했습니다. 1차 시범 범위: 슬리팅2 라인 · 거래처 1~2곳 · 2주.</p>
      </div>
      <ProposalBanner text="이 화면은 기존 'FAX 작업요청서 접수' · '현장 코일확정' 탭을 대체하지 않습니다. 언제든 기존 방식과 병행 운영할 수 있도록(결정12) 별도 메뉴로 추가했습니다." />

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {V2_SUBTABS.map((t) => (
          <button key={t.key} onClick={() => setSub(t.key)} style={{
            ...box.ghostBtn, padding: '11px 20px', fontSize: '15px',
            ...(sub === t.key ? { backgroundColor: COLORS.navy, color: '#fff', borderColor: COLORS.navy } : {}),
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {sub === 'intake' && <IntakeSectionV2 drafts={drafts} onCreateDraft={onCreateDraft} onApprove={onApprove} />}
      {sub === 'field' && <FieldConfirmTablet drafts={drafts} onConfirmCoil={onConfirmCoil} />}
      {sub === 'line' && <LineDashboardMelben drafts={drafts} />}
    </div>
  );
}

function IntakeSectionV2({ drafts, onCreateDraft, onApprove }) {
  const [inbox, setInbox] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [checkingFax, setCheckingFax] = useState(false);
  const [ocrLoadingId, setOcrLoadingId] = useState(null);
  const [ocrError, setOcrError] = useState('');
  const [form, setForm] = useState(null);
  const [sourceChecked, setSourceChecked] = useState(false);

  const loadInbox = async () => {
    setLoadingInbox(true);
    const { data, error } = await supabase.from('enfax_inbox').select('*').order('received_at', { ascending: false }).limit(20);
    if (!error) setInbox(data || []);
    setLoadingInbox(false);
  };

  useEffect(() => { loadInbox(); }, []);

  const checkFaxNow = async () => {
    setCheckingFax(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/enfax-sync?recordCount=50`);
      const json = await res.json();
      if (!json.ok) { alert('FAX 정보 확인 실패: ' + (json.error || '알 수 없는 오류')); return; }
      await loadInbox();
      alert(json.insertedCount > 0 ? `신규 팩스 ${json.insertedCount}건을 받아왔습니다.` : '새로 수신된 팩스가 없습니다.');
    } catch (e) {
      alert('FAX 정보 확인 중 오류: ' + e.message);
    } finally {
      setCheckingFax(false);
    }
  };

  const runOcr = async (f) => {
    if (!f.file_path) { alert('파일 경로 정보가 없습니다.'); return; }
    setOcrLoadingId(f.id);
    setOcrError('');
    setSourceChecked(false);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/enfax-ocr?filePath=${encodeURIComponent(f.file_path)}`);
      const json = await res.json();
      if (!json.ok) { setOcrError('AI 인식 실패: ' + (json.error || '알 수 없는 오류')); return; }
      const ex = json.extracted || {};
      const first = Array.isArray(ex.items) && ex.items.length > 0 ? ex.items[0] : {};
      setForm({
        fax: f,
        customer_name: ex.company_name || f.sender || '',
        material: first.maker || '',
        spec: [first.thick, first.width].filter(Boolean).join(' X ') || '',
        qty_weight: first.weight != null ? String(first.weight) : '',
        work_type: first.slit || '',
        due_date: ex.due_date || '',
      });
    } catch (e) {
      setOcrError('AI 인식 중 오류: ' + e.message);
    } finally {
      setOcrLoadingId(null);
    }
  };

  const createDraft = () => {
    onCreateDraft({
      customer_name: form.customer_name, material: form.material, spec: form.spec,
      qty_weight: form.qty_weight, work_type: form.work_type, due_date: form.due_date,
      source: 'FAX(엔팩스 실연동)', sourceDoc: form.fax.file_name, confidence: null,
    });
    setForm(null);
    setSourceChecked(false);
  };

  const FIELD_LABELS = [
    ['customer_name', '거래처'], ['material', '강종/재질(메이커 값 참고)'], ['spec', '규격(두께 X 폭)'],
    ['qty_weight', '요청중량(kg)'], ['work_type', '가공내용(슬릿규격 참고)'], ['due_date', '희망납기일'],
  ];

  function statusPill(s) {
    if (s === '배정완료') return pill(COLORS.greenBg, COLORS.green);
    if (s === '배차대기') return pill(COLORS.amberBg, COLORS.amber);
    return pill('#edf2f7', COLORS.steel);
  }

  return (
    <>
      <div style={box.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ ...box.subtitle, border: 'none', margin: 0, padding: 0 }}>엔팩스 수신함 (실제 데이터)</h3>
          <button style={{ ...box.primaryBtn, padding: '10px 20px', fontSize: '15px' }} disabled={checkingFax} onClick={checkFaxNow}>
            {checkingFax ? '확인 중...' : '📠 FAX 정보 확인하기'}
          </button>
        </div>
        {loadingInbox ? (
          <p style={box.loadingText}>불러오는 중...</p>
        ) : inbox.length === 0 ? (
          <p style={box.emptyText}>수신된 팩스가 없습니다. 위 버튼을 눌러 엔팩스(fax.enfax.com) 수신함을 조회해보세요.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {inbox.map((f) => (
              <div key={f.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                background: f.status === 'new' ? COLORS.accentSoft : COLORS.bg,
                border: `1px solid ${f.status === 'new' ? COLORS.accentBg : COLORS.border}`,
                borderRadius: '10px', padding: '12px 16px',
              }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: f.status === 'new' ? 800 : 600, color: '#243040' }}>
                    {f.sender || '(발신자 미상)'} {f.status === 'new' && <span style={{ fontSize: '11px', color: COLORS.accentDark, marginLeft: '6px' }}>NEW</span>}
                  </div>
                  <div style={{ fontSize: '13px', color: COLORS.steelLight, marginTop: '2px' }}>
                    {f.fax_number} · {f.received_at ? new Date(f.received_at).toLocaleString('ko-KR') : ''} · {f.pages}페이지 · {f.file_name}
                  </div>
                </div>
                <button style={{ ...box.ghostBtn, padding: '9px 16px', fontSize: '14px' }} disabled={!f.file_path || ocrLoadingId === f.id} onClick={() => runOcr(f)}>
                  {ocrLoadingId === f.id ? '인식 중...' : '🤖 AI 자동인식'}
                </button>
              </div>
            ))}
          </div>
        )}
        {ocrError && (
          <div style={{ marginTop: '14px', backgroundColor: COLORS.redBg, color: COLORS.red, padding: '12px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 700 }}>⚠️ {ocrError}</div>
        )}
      </div>

      {form && (
        <div style={box.card}>
          <h3 style={box.subtitle}>인식 결과 확인 · 원본 대조 후 초안 등록 <span style={{ marginLeft: '8px' }}><span style={pill(COLORS.greenBg, COLORS.green)}>결정3·5 반영</span></span></h3>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ width: '280px', flexShrink: 0 }}>
              <label style={box.label}>원본 팩스</label>
              <div style={{
                border: `1.5px dashed ${COLORS.border}`, borderRadius: '12px', padding: '18px', textAlign: 'center',
                backgroundColor: COLORS.bg, minHeight: '220px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '10px',
              }}>
                <span style={{ fontSize: '28px' }}>📠</span>
                <span style={{ fontSize: '14px', color: COLORS.steel, fontWeight: 700 }}>{form.fax.file_name}</span>
                <span style={{ fontSize: '13px', color: COLORS.steelLight }}>발신 {form.fax.sender} · {form.fax.pages}페이지</span>
                <span style={{ fontSize: '12px', color: COLORS.amber, marginTop: '6px' }}>⚠ 엔팩스 원본은 로그인 세션이 필요해 아직 화면에서 바로 열람할 수 없습니다 (이미지 프록시 별도 개발 필요)</span>
              </div>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '12px', fontSize: '14px', color: COLORS.steel, cursor: 'pointer' }}>
                <input type="checkbox" checked={sourceChecked} onChange={(e) => setSourceChecked(e.target.checked)} style={{ marginTop: '3px' }} />
                엔팩스 원본(발신자·품목)과 아래 인식 결과를 대조 확인했습니다
              </label>
            </div>
            <div style={{ flex: 1, minWidth: '340px' }}>
              <p style={box.hint}>원본 팩스: {form.fax.file_name} · 발신 {form.fax.sender}</p>
              <div style={box.formGrid}>
                {FIELD_LABELS.map(([key, label]) => (
                  <div key={key}>
                    <label style={box.label}>{label}</label>
                    <input style={box.input} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                  </div>
                ))}
              </div>
              <p style={box.hint}>거래처는 자동으로 확정하지 않습니다 — 왼쪽 체크를 완료해야 등록 버튼이 활성화됩니다(3자 거래 사례 대응).</p>
              <div style={{ marginTop: '18px', display: 'flex', gap: '10px' }}>
                <button style={{ ...box.primaryBtn, opacity: sourceChecked ? 1 : 0.45, cursor: sourceChecked ? 'pointer' : 'not-allowed' }} disabled={!sourceChecked} onClick={createDraft}>작업지시서 초안 등록</button>
                <button style={box.ghostBtn} onClick={() => { setForm(null); setSourceChecked(false); }}>취소</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={box.card}>
        <h3 style={box.subtitle}>작업지시서 초안 목록</h3>
        <table style={box.table}>
          <thead>
            <tr>
              <th style={box.th}>거래처</th><th style={box.th}>강종/규격</th><th style={box.th}>요청중량</th>
              <th style={box.th}>가공내용</th><th style={box.th}>희망납기일</th><th style={box.th}>상태</th><th style={box.th}>승인</th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((d) => (
              <tr key={d.id}>
                <td style={box.td}>{d.customer_name}</td>
                <td style={box.td}>{d.material} · {d.spec}</td>
                <td style={box.td}>{d.qty_weight}kg</td>
                <td style={box.td}>{d.work_type}</td>
                <td style={box.td}>{d.due_date}</td>
                <td style={box.td}><span style={statusPill(d.status)}>{d.status}</span></td>
                <td style={box.td}>
                  {d.status === '초안' ? (
                    <button style={{ ...box.ghostBtn, padding: '7px 14px', fontSize: '13px' }} onClick={() => onApprove(d.id)}>배차 승인</button>
                  ) : d.status === '배차대기' ? (
                    <span style={{ color: COLORS.steelLight, fontSize: '13px' }}>현장 확정 대기중</span>
                  ) : (
                    <span style={{ color: COLORS.steelLight, fontSize: '13px' }}>코일 {d.assigned_coil_id}</span>
                  )}
                </td>
              </tr>
            ))}
            {drafts.length === 0 && (
              <tr><td style={box.td} colSpan={7}><span style={box.emptyText}>등록된 작업지시서 초안이 없습니다.</span></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// 태블릿(지게차 거치) 전용 — 큰 글씨·큰 터치영역·단일 컬럼. 실제 재고 데이터/동시배정 방지 로직은
// 기존 FieldCoilConfirm과 동일하며, 여기서는 '검색 결과를 탭하면 선택되고, 하단의 확정 버튼을
// 눌러야 실제로 확정'되는 2단계 방식으로 오조작을 줄였습니다.
function FieldConfirmTablet({ drafts, onConfirmCoil }) {
  const waiting = drafts.filter((d) => d.status === '배차대기');
  const [activeId, setActiveId] = useState(waiting[0]?.id ?? null);
  const active = drafts.find((d) => d.id === activeId) || waiting[0];
  const [mode, setMode] = useState('search'); // 결정1: QR 없이 코일ID 검색을 기본으로
  const [scannedCoil, setScannedCoil] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [loadingInv, setLoadingInv] = useState(true);
  const [takenIds, setTakenIds] = useState(new Set());
  const [driverName, setDriverName] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from('greenp_inventory')
        .select('*')
        .gt('remaining_weight', 0)
        .order('received_date', { ascending: false })
        .limit(30);
      if (!err && data) {
        setInventory(data);
        if (data.length > 0) setTakenIds(new Set([data[0].product_name]));
      }
      setLoadingInv(false);
    })();
  }, []);

  const simulateScan = () => {
    const candidates = inventory.filter((c) => !takenIds.has(c.product_name));
    if (candidates.length === 0) return;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    setScannedCoil(picked.product_name);
    setError('');
  };

  const filteredInventory = inventory.filter((c) =>
    query.trim() === '' || (c.product_name || '').toLowerCase().includes(query.trim().toLowerCase())
  );

  const confirmCoil = (coilId) => {
    if (!driverName) { setError('먼저 기사 이름을 선택해주세요.'); return; }
    const coil = inventory.find((c) => c.product_name === coilId);
    if (!coil) return;
    if (takenIds.has(coilId)) {
      setError(`코일 ${coilId}는 이미 다른 작업에 배정되어 있습니다. 다른 코일을 선택해주세요.`);
      return;
    }
    setSaving(true);
    setError('');
    setTimeout(() => {
      setTakenIds((prev) => new Set(prev).add(coilId));
      onConfirmCoil(active.id, coilId, driverName);
      setSaving(false);
      setScannedCoil(null);
      setDriverName('');
      const next = drafts.find((d) => d.status === '배차대기' && d.id !== active.id);
      setActiveId(next ? next.id : null);
    }, 700);
  };

  const tabletCard = { backgroundColor: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: '20px', padding: '22px', boxShadow: COLORS.shadow };
  const bigBtnStyle = (isActive) => ({
    flex: 1, padding: '22px', borderRadius: '16px', fontSize: '18px', fontWeight: 800,
    border: `2px solid ${isActive ? COLORS.navy : COLORS.border}`,
    backgroundColor: isActive ? COLORS.navy : COLORS.white, color: isActive ? '#fff' : COLORS.steel,
    cursor: 'pointer', textAlign: 'center',
  });

  if (!active) {
    return <div style={tabletCard}><p style={box.emptyText}>배차대기 중인 작업지시서가 없습니다.</p></div>;
  }

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <span style={pill(COLORS.amberBg, COLORS.amber)}>배차대기 {waiting.length}건</span>
        <span style={pill(COLORS.blueBg, COLORS.blue)}>1차 시범 · 슬리팅2 라인 (결정8)</span>
      </div>

      {waiting.length > 1 && (
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          {waiting.map((d) => (
            <button key={d.id} onClick={() => { setActiveId(d.id); setScannedCoil(null); setQuery(''); setError(''); }}
              style={{
                flexShrink: 0, padding: '12px 18px', borderRadius: '14px', fontSize: '15px', fontWeight: 700,
                border: `2px solid ${activeId === d.id ? COLORS.accent : COLORS.border}`,
                backgroundColor: activeId === d.id ? COLORS.accentSoft : COLORS.white, color: COLORS.steel, cursor: 'pointer',
              }}>
              {d.customer_name}
            </button>
          ))}
        </div>
      )}

      <div style={{ ...tabletCard, textAlign: 'center', backgroundColor: COLORS.bg }}>
        <div style={{ fontSize: '20px', fontWeight: 800, color: COLORS.navy, marginBottom: '10px' }}>{active.customer_name}</div>
        <div style={{ fontSize: '13px', color: COLORS.steelLight, fontWeight: 700, letterSpacing: '0.04em', marginBottom: '6px' }}>요청 규격 (참고용 · 자동 필터 아님 · 결정6)</div>
        <div style={{ fontSize: '34px', fontWeight: 900, color: COLORS.accentDark, lineHeight: 1.2 }}>{active.material} / {active.spec}</div>
        <div style={{ fontSize: '16px', color: COLORS.steel, marginTop: '10px' }}>요청중량 {active.qty_weight}kg · {active.work_type} · 납기 {active.due_date}</div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={bigBtnStyle(mode === 'qr')} onClick={() => setMode('qr')}>📷 QR 스캔</div>
        <div style={bigBtnStyle(mode === 'search')} onClick={() => setMode('search')}>🔎 코일ID 검색</div>
      </div>

      {mode === 'qr' ? (
        <div style={{ ...tabletCard, textAlign: 'center' }}>
          {!scannedCoil ? (
            <>
              <p style={{ color: COLORS.steel, fontSize: '16px', marginBottom: '16px' }}>스캐너로 코일에 붙은 QR을 스캔하세요. (회사 보유 스캐너 모델 확인 전이라 시뮬레이션 버튼으로 대체)</p>
              <button style={{ ...box.primaryBtn, padding: '18px 32px', fontSize: '17px' }} onClick={simulateScan}>QR 스캔 시뮬레이션</button>
            </>
          ) : (
            <>
              <p style={{ color: COLORS.steel, fontSize: '14px', marginBottom: '8px' }}>스캔된 코일ID</p>
              <p style={{ fontSize: '28px', fontWeight: 900, color: COLORS.navy, marginBottom: '10px' }}>{scannedCoil}</p>
              <button style={{ ...box.ghostBtn, padding: '10px 20px' }} onClick={() => setScannedCoil(null)}>다시 스캔</button>
            </>
          )}
        </div>
      ) : (
        <div style={tabletCard}>
          <input style={{ ...box.input, marginBottom: '14px', padding: '16px', fontSize: '18px' }} placeholder="코일ID로 검색 (예: H3D)" value={query} onChange={(e) => setQuery(e.target.value)} />
          {loadingInv ? (
            <p style={box.loadingText}>실제 재고(그린ERP) 불러오는 중...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
              {filteredInventory.map((c) => {
                const taken = takenIds.has(c.product_name);
                const isSelected = scannedCoil === c.product_name;
                return (
                  <div key={c.product_code || c.product_name} onClick={() => !taken && !saving && setScannedCoil(c.product_name)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px',
                      borderRadius: '14px', border: `2px solid ${isSelected ? COLORS.accent : COLORS.border}`,
                      backgroundColor: taken ? '#f4f5f7' : (isSelected ? COLORS.accentSoft : COLORS.white),
                      cursor: taken ? 'not-allowed' : 'pointer', opacity: taken ? 0.6 : 1,
                    }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: COLORS.navy }}>{c.product_name}</div>
                      <div style={{ fontSize: '14px', color: COLORS.steel, marginTop: '2px' }}>{c.customer_name} · {c.spec} · 잔량 {Number(c.remaining_weight || 0).toLocaleString()}kg</div>
                    </div>
                    {taken ? <span style={pill(COLORS.redBg, COLORS.red)}>배정됨</span> : <span style={pill(COLORS.greenBg, COLORS.green)}>가용</span>}
                  </div>
                );
              })}
              {filteredInventory.length === 0 && <p style={box.emptyText}>검색된 재고가 없습니다.</p>}
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: COLORS.redBg, color: COLORS.red, padding: '14px 18px', borderRadius: '14px', fontSize: '15px', fontWeight: 700 }}>⚠️ {error}</div>
      )}

      <div style={{ ...tabletCard, display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px' }}>
          <label style={box.label}>기사 이름 (결정9 · 로그인 대신 이름선택으로 책임소재 기록)</label>
          <select style={{ ...box.input, padding: '14px', fontSize: '17px' }} value={driverName} onChange={(e) => setDriverName(e.target.value)}>
            <option value="">선택하세요</option>
            {DRIVER_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button
          style={{ ...box.primaryBtn, flex: '2 1 260px', padding: '22px', fontSize: '19px', opacity: (scannedCoil && driverName && !saving) ? 1 : 0.5, cursor: (scannedCoil && driverName && !saving) ? 'pointer' : 'not-allowed' }}
          disabled={!scannedCoil || !driverName || saving}
          onClick={() => confirmCoil(scannedCoil)}
        >
          {saving ? '확정 처리중...' : '✓ 코일 확정'}
        </button>
      </div>
    </div>
  );
}

// 멜벤(장비 운용 담당)이 보는 라인 대시보드 — 결정7. 기존 설비 운전현황 화면은 그대로 두고,
// 지게차 기사가 확정한 코일 정보만 새 패널로 덧붙입니다(실제 개발 시 기존 대시보드 화면에 삽입).
function LineDashboardMelben({ drafts }) {
  const assigned = drafts.filter((d) => d.status === '배정완료');
  return (
    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ ...box.card, flex: '1 1 380px' }}>
        <h3 style={{ ...box.subtitle, border: 'none', margin: 0, padding: '0 0 12px' }}>슬리팅2 라인 · 설비 운전현황 (기존 화면)</h3>
        <div style={{
          border: `1.5px dashed ${COLORS.border}`, borderRadius: '14px', padding: '40px', textAlign: 'center',
          color: COLORS.steelLight, fontSize: '15px', backgroundColor: COLORS.bg,
        }}>
          기존 설비 대시보드 영역 (변경 없음)
        </div>
      </div>
      <div style={{ ...box.card, flex: '1 1 320px' }}>
        <h3 style={{ ...box.subtitle, border: 'none', margin: 0, padding: '0 0 12px' }}>
          현재 투입 예정 코일 <span style={{ marginLeft: '8px' }}><span style={pill(COLORS.greenBg, COLORS.green)}>결정7 신규</span></span>
        </h3>
        {assigned.length === 0 ? (
          <p style={box.emptyText}>아직 확정된 작업이 없습니다. 지게차 기사가 코일을 확정하면 여기 표시됩니다.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {assigned.map((d) => (
              <div key={d.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '16px 18px', backgroundColor: COLORS.white }}>
                <span style={pill(COLORS.greenBg, COLORS.green)}>배정완료 · 지게차 확정</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: COLORS.navy, marginTop: '8px' }}>{d.assigned_coil_id}</div>
                <div style={{ fontSize: '14px', color: COLORS.steel, marginTop: '2px' }}>{d.material} · {d.spec} · {d.customer_name}</div>
                <div style={{ fontSize: '12px', color: COLORS.steelLight, marginTop: '8px' }}>
                  확정: {d.assigned_driver_name || '-'} {d.confirmed_at ? `· ${new Date(d.confirmed_at).toLocaleTimeString('ko-KR')}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
