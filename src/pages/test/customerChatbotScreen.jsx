// src/pages/test/customerChatbotScreen.jsx
// 고객사 챗봇 데모 — (주)대한강재로 스코프를 고정한 외부 고객사 시연용 프로토타입.
// 연구실 전용이며 실제 /portal은 건드리지 않습니다.
//
// 방식: 프론트엔드가 실데이터(greenp_joborder_detail/greenp_joborders/greenp_unshipped/
// greenp_receivables, 최근 90일 기준)를 조회·가공해 "이 거래처 범위로 이미 스코핑된"
// 구조화 JSON을 만들고, customer-chatbot-ask Edge Function이 그 JSON만을 근거로 Claude에게
// 자연어 답변을 생성시킵니다. Edge Function 자체는 DB에 직접 접근하지 않으므로, 프론트엔드가
// 넘긴 데이터 범위(이 거래처) 밖의 정보가 새어나갈 수 없습니다. 고객 계정 로그인이 붙으면
// 회사명 고정 대신 로그인한 계정의 company_name을 쓰면 됩니다.
import React, { useState, useEffect, useRef } from 'react';
import { COLORS, box } from './theme';
import { supabase } from '../../supabaseClient';

const COMPANY = '(주)대한강재';
const WINDOW_DAYS = 90;
const STAGE_LABELS = ['접수', '작업지시', '작업진행', '작업완료', '출고완료'];

const SUGGESTED_QUESTIONS = [
  '지금 진행중인 작업이 몇 건이야?',
  '완료된 작업은 몇 건이야?',
  '출고 안 된 거 있어?',
  'T162204535801 어떻게 됐어?',
  '최근 작업 목록 보여줘',
  '이번 달 총 가공금액 얼마야?',
  '미수금 얼마 남았어?',
  '슬리팅1이랑 슬리팅2 각각 몇 건이야?',
  '이번 달 출고완료 비율 알려줘',
  '요즘 작업이 좀 늦어지는 것 같은데 어떻게 되고 있어?',
];

function kstTodayDate() {
  const now = new Date();
  const kstMs = now.getTime() + 9 * 3600000;
  return new Date(kstMs);
}
function isoDate(d) { return d.toISOString().slice(0, 10); }

function computeStageIndex(status, shipped) {
  if (status !== '작업완료') return 2;
  if (!shipped) return 3;
  return 4;
}

function ProposalBanner({ text, tone }) {
  const isAmber = tone === 'amber';
  return (
    <div style={{
      background: isAmber ? '#FFF7E8' : COLORS.accentSoft,
      border: `1px solid ${isAmber ? '#F3DCA0' : COLORS.accentBg}`, borderRadius: '14px',
      padding: '14px 20px', fontSize: '14px', color: isAmber ? '#8A5A00' : COLORS.accentDark, lineHeight: 1.6,
      display: 'flex', gap: '10px', alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: '16px' }}>{isAmber ? '⚠️' : '💡'}</span>
      <span>{text}</span>
    </div>
  );
}

function buildContext(orders, receivablesAmount, monthStart, monthLabel) {
  const monthOrders = orders.filter((o) => o.joborder_date >= monthStart);
  const inProgress = orders.filter((o) => o.stageIndex === 2);
  const done = orders.filter((o) => o.stageIndex >= 3);
  const waitingShip = orders.filter((o) => o.stageIndex === 3);
  const shipped = orders.filter((o) => o.stageIndex === 4);
  const s1 = orders.filter((o) => o.work_type === 'SLITING').length;
  const s2 = orders.filter((o) => o.work_type === 'SLITING2').length;
  const monthAmountTotal = monthOrders.reduce((s, o) => s + Number(o.amount || 0), 0);

  return {
    company: COMPANY,
    windowDays: WINDOW_DAYS,
    todayKST: isoDate(kstTodayDate()),
    monthLabel,
    stats: {
      totalOrders: orders.length,
      inProgressCount: inProgress.length,
      doneCount: done.length,
      waitingShipCount: waitingShip.length,
      shippedCount: shipped.length,
      shipRatioPct: done.length > 0 ? Math.round((shipped.length / done.length) * 100) : null,
      slitting1Count: s1,
      slitting2Count: s2,
      monthOrderCount: monthOrders.length,
      monthAmountTotalWon: monthAmountTotal,
      lastWorkDate: orders.length > 0 ? orders[0].joborder_date : null,
      receivablesAmountWon: receivablesAmount,
    },
    orders: orders.slice(0, 300).map((o) => ({
      product_name: o.product_name,
      spec: o.spec,
      joborder_date: o.joborder_date,
      work_type: o.work_type === 'SLITING2' ? '슬리팅2' : '슬리팅1',
      original_weight_kg: Number(o.original_weight || 0),
      amount_won: Number(o.amount || 0),
      stageLabel: STAGE_LABELS[o.stageIndex],
    })),
  };
}

export function CustomerChatbotScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'bot', text: `안녕하세요! ${COMPANY} 담당자님을 위한 챗봇 데모입니다. 최근 ${WINDOW_DAYS}일 작업 현황, 미수금, 출고 여부 등을 자유롭게 물어보세요.` },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const since = isoDate(new Date(kstTodayDate().getTime() - WINDOW_DAYS * 86400000));
        const [detailRes, unshippedRes, receivablesRes] = await Promise.all([
          supabase
            .from('greenp_joborder_detail')
            .select('joborder_no, joborder_date, product_name, spec, original_weight, amount, work_type')
            .eq('company_name', COMPANY)
            .gte('joborder_date', since)
            .order('joborder_date', { ascending: false })
            .limit(999),
          supabase.from('greenp_unshipped').select('product_name').eq('company_name', COMPANY),
          supabase.from('greenp_receivables').select('amount').eq('company_name', COMPANY).order('synced_at', { ascending: false }).limit(1),
        ]);
        if (detailRes.error) throw detailRes.error;
        if (unshippedRes.error) throw unshippedRes.error;

        const seen = new Set();
        const deduped = [];
        for (const r of detailRes.data || []) {
          if (seen.has(r.product_name)) continue;
          seen.add(r.product_name);
          deduped.push(r);
        }

        const dates = [...new Set(deduped.map((r) => r.joborder_date))];
        let statusMap = new Map();
        if (dates.length > 0) {
          const { data: statusRows, error: statusErr } = await supabase
            .from('greenp_joborders')
            .select('joborder_no, joborder_date, status')
            .eq('company_name', COMPANY)
            .in('joborder_date', dates);
          if (statusErr) throw statusErr;
          statusMap = new Map((statusRows || []).map((r) => [`${r.joborder_date}|${r.joborder_no}`, r.status]));
        }
        const unshippedSet = new Set((unshippedRes.data || []).map((r) => r.product_name));

        const orders = deduped.map((r) => {
          const status = statusMap.get(`${r.joborder_date}|${r.joborder_no}`) || '준비';
          const shipped = status === '작업완료' && !unshippedSet.has(r.product_name);
          return { ...r, status, shipped, stageIndex: computeStageIndex(status, shipped) };
        }).sort((a, b) => (a.joborder_date < b.joborder_date ? 1 : -1));

        const receivablesAmount = receivablesRes.data && receivablesRes.data[0] ? Number(receivablesRes.data[0].amount) : null;
        const today = kstTodayDate();
        const monthStart = isoDate(new Date(today.getFullYear(), today.getMonth(), 1));
        const monthLabel = `${today.getFullYear()}년 ${today.getMonth() + 1}월`;

        if (!cancelled) setCtx(buildContext(orders, receivablesAmount, monthStart, monthLabel));
      } catch (e) {
        if (!cancelled) setError(e.message || String(e));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const ask = async (question) => {
    const q = question.trim();
    if (!q || sending) return;
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setInput('');
    if (!ctx) {
      setMessages((m) => [...m, { role: 'bot', text: '데이터를 아직 불러오는 중입니다. 잠시 후 다시 시도해주세요.' }]);
      return;
    }
    setSending(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('customer-chatbot-ask', {
        body: { question: q, context: ctx },
      });
      if (fnError) throw fnError;
      if (!data?.ok) throw new Error(data?.error || '답변 생성에 실패했습니다.');
      setMessages((m) => [...m, { role: 'bot', text: data.answer }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'bot', text: `죄송해요, 지금 답변을 가져오지 못했어요. (${e.message || e})` }]);
    }
    setSending(false);
  };

  return (
    <div style={box.page}>
      <div>
        <h1 style={box.title}>💬 챗봇서비스 (대한강재/작업내용)</h1>
        <p style={box.hint}>실제 고객사 포털(/portal)과는 별개의 연구실 프로토타입입니다. 지금은 {COMPANY} 한 곳으로 범위를 고정해 시연용으로 만들었습니다.</p>
      </div>

      <ProposalBanner text={`Claude가 실데이터(최근 ${WINDOW_DAYS}일 작업현황·미출고현황·미수금)를 근거로 자연어로 답하는 데모입니다. 정해진 문구가 아니라 자유롭게 물어보셔도 되고, 챗봇은 이 JSON 범위(=${COMPANY} 작업현황) 밖의 내용은 답변하지 않도록 지시돼 있습니다. 실제 서비스로 만들 때는 로그인한 거래처 계정의 회사명을 자동으로 씁니다.`} />
      {error && <ProposalBanner tone="amber" text={`데이터 로딩 오류: ${error}`} />}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => ask(q)}
            disabled={loading || sending}
            style={{
              fontSize: '13.5px', fontWeight: 700, padding: '8px 14px', borderRadius: '999px',
              border: `1px solid ${COLORS.accentBg}`, background: COLORS.accentSoft, color: COLORS.accentDark,
              cursor: (loading || sending) ? 'default' : 'pointer', opacity: (loading || sending) ? 0.5 : 1,
            }}
          >
            {q}
          </button>
        ))}
      </div>

      <div style={{ ...box.card, padding: 0, display: 'flex', flexDirection: 'column', height: '520px' }}>
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {loading && <div style={box.loadingText}>대한강재 최근 작업 데이터를 불러오는 중...</div>}
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '72%', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '15px',
                padding: '12px 16px', borderRadius: '16px',
                background: m.role === 'user' ? COLORS.navy : '#F1F3F7',
                color: m.role === 'user' ? '#fff' : COLORS.navy,
                borderBottomRightRadius: m.role === 'user' ? '4px' : '16px',
                borderBottomLeftRadius: m.role === 'user' ? '16px' : '4px',
              }}>
                {m.text}
              </div>
            </div>
          ))}
          {sending && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '12px 16px', borderRadius: '16px', borderBottomLeftRadius: '4px',
                background: '#F1F3F7', color: COLORS.steelLight, fontSize: '15px',
              }}>
                답변을 생각하는 중...
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', padding: '16px 20px', borderTop: `1px solid ${COLORS.border}` }}>
          <input
            style={{ ...box.input, flex: 1 }}
            placeholder="예: 요즘 우리 작업 어떻게 되고 있어?"
            value={input}
            disabled={loading || sending}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') ask(input); }}
          />
          <button style={box.primaryBtn} disabled={loading || sending} onClick={() => ask(input)}>보내기</button>
        </div>
      </div>
    </div>
  );
}
