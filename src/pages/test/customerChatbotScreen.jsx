// src/pages/test/customerChatbotScreen.jsx
// 고객사 챗봇 데모 — (주)대한강재로 스코프를 고정한 외부 고객사 시연용 프로토타입.
// 연구실 전용이며 실제 /portal은 건드리지 않습니다.
//
// 방식: 범용 LLM 호출 없이, 정해진 10가지 질문 유형을 키워드로 인식해 그 자리에서
// 실데이터(greenp_joborder_detail/greenp_joborders/greenp_unshipped/greenp_receivables,
// 최근 90일 기준)를 조회·계산해 답합니다. 데모 신뢰성을 위해 의도적으로 "정해진 질문에
// 정확히 답하는" 규칙기반 방식을 택했고, 실제 서비스로 만든다면 이 10가지 인텐트를
// LLM 함수호출(tool use)의 도구 목록으로 그대로 옮겨 자유 질문까지 확장할 수 있습니다.
// 고객 계정 로그인이 붙으면 회사명 고정 대신 로그인한 계정의 company_name을 쓰면 됩니다.
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { COLORS, box, fmtWon, fmtNum } from './theme';
import { supabase } from '../../supabaseClient';

const COMPANY = '(주)대한강재';
const WINDOW_DAYS = 90;

const SUGGESTED_QUESTIONS = [
  '지금 진행중인 작업이 몇 건이야?',
  '완료된 작업은 몇 건이야?',
  '출고 안 된 거 있어?',
  'T162204535801 어떻게 됐어?',
  '최근 작업 목록 보여줘',
  '이번 달 총 가공금액 얼마야?',
  '미수금 얼마 남았어?',
  '슬리팅1이랑 슬리팅2 각각 몇 건이야?',
  '최근 작업이 언제였어?',
  '이번 달 출고완료 비율 알려줘',
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

// --- 인텐트 정의: 위에서부터 순서대로 검사해 먼저 매치되는 것을 사용 ---
function buildIntents(ctx) {
  const { orders, receivablesAmount, monthLabel } = ctx;
  const monthOrders = orders.filter((o) => o.joborder_date >= ctx.monthStart);
  const inProgress = orders.filter((o) => o.stageIndex === 2);
  const done = orders.filter((o) => o.stageIndex >= 3);
  const waitingShip = orders.filter((o) => o.stageIndex === 3);
  const shipped = orders.filter((o) => o.stageIndex === 4);

  return [
    {
      name: 'coil_lookup',
      match: (q) => {
        const tokens = q.match(/[A-Za-z0-9]{5,}/g) || [];
        for (const t of tokens) {
          const found = orders.find((o) => o.product_name.toLowerCase() === t.toLowerCase());
          if (found) return found;
        }
        return null;
      },
      respond: (found) => {
        const stageLabel = ['접수', '작업지시', '작업진행', '작업완료', '출고완료'][found.stageIndex];
        return `${found.product_name} (${found.spec}, ${fmtNum(found.original_weight)}kg)는 현재 "${stageLabel}" 단계입니다. 작업일 ${found.joborder_date}, 구분 ${found.work_type === 'SLITING2' ? '슬리팅2' : '슬리팅1'}.`;
      },
    },
    {
      name: 'month_amount',
      match: (q) => /(이번\s*달|이달).*(금액|얼마|매출)/.test(q) || /(금액|매출).*(이번\s*달|이달)/.test(q),
      respond: () => {
        const total = monthOrders.reduce((s, o) => s + Number(o.amount || 0), 0);
        return `${monthLabel} 기준 가공금액 합계는 ${fmtWon(total)}입니다 (최근 90일 내 등록된 작업 ${monthOrders.length}건 기준).`;
      },
    },
    {
      name: 'receivables',
      match: (q) => /미수금|수금/.test(q),
      respond: () => (receivablesAmount != null
        ? `현재 미수금 잔액은 ${fmtWon(receivablesAmount)}입니다.`
        : '미수금 데이터를 아직 확인할 수 없습니다.'),
    },
    {
      name: 'ship_ratio',
      match: (q) => /출고.*(비율|율)/.test(q),
      respond: () => {
        const base = done.length;
        if (base === 0) return '이번 달 완료된 작업이 없어 출고 비율을 계산할 수 없습니다.';
        const pct = Math.round((shipped.length / base) * 100);
        return `완료된 작업 ${base}건 중 ${shipped.length}건이 출고완료되어, 출고완료 비율은 ${pct}%입니다. (출고대기 ${waitingShip.length}건)`;
      },
    },
    {
      name: 'unshipped',
      match: (q) => /출고/.test(q) && (/안|미출고|대기|남/.test(q)),
      respond: () => {
        if (waitingShip.length === 0) return '현재 출고 대기 중인 작업이 없습니다. 완료된 작업은 모두 출고됐습니다.';
        const list = waitingShip.slice(0, 5).map((o) => `${o.product_name}(${o.joborder_date})`).join(', ');
        return `출고 대기 중인 작업이 ${waitingShip.length}건 있습니다: ${list}${waitingShip.length > 5 ? ' 외' : ''}`;
      },
    },
    {
      name: 'line_compare',
      match: (q) => /슬리팅\s*1.*슬리팅\s*2|슬리팅\s*2.*슬리팅\s*1|비교/.test(q),
      respond: () => {
        const s1 = orders.filter((o) => o.work_type === 'SLITING').length;
        const s2 = orders.filter((o) => o.work_type === 'SLITING2').length;
        return `최근 ${WINDOW_DAYS}일 기준 슬리팅1 ${s1}건, 슬리팅2 ${s2}건입니다.`;
      },
    },
    {
      name: 'done_count',
      match: (q) => /완료/.test(q) && /(몇|건수|얼마나)/.test(q),
      respond: () => `완료된 작업은 최근 ${WINDOW_DAYS}일 기준 ${done.length}건입니다. (그 중 출고완료 ${shipped.length}건, 출고대기 ${waitingShip.length}건)`,
    },
    {
      name: 'in_progress_count',
      match: (q) => /진행/.test(q),
      respond: () => `현재 진행중인 작업은 ${inProgress.length}건입니다.`,
    },
    {
      name: 'recent_list',
      match: (q) => /목록|리스트|보여줘|알려줘.*작업/.test(q) && !/코일|규격/.test(q),
      respond: () => {
        const list = orders.slice(0, 5);
        if (list.length === 0) return `최근 ${WINDOW_DAYS}일 내 작업 내역이 없습니다.`;
        const lines = list.map((o) => `${o.joborder_date} · ${o.product_name} · ${o.spec} · ${['접수', '작업지시', '작업진행', '작업완료', '출고완료'][o.stageIndex]}`);
        return `최근 작업 ${list.length}건입니다.\n${lines.join('\n')}`;
      },
    },
    {
      name: 'last_work_date',
      match: (q) => /(최근|마지막).*(언제|날짜)/.test(q),
      respond: () => (orders.length === 0 ? '최근 작업 내역이 없습니다.' : `가장 최근 작업일은 ${orders[0].joborder_date}입니다 (${orders[0].product_name}).`),
    },
  ];
}

const FALLBACK = `죄송해요, 아직 이 질문에는 답변드리기 어려워요. 예시 질문 버튼을 눌러보시거나 아래처럼 물어봐 주세요.\n· "진행중인 작업 몇 건이야?"\n· "미수금 얼마 남았어?"\n· "T162204535801 어떻게 됐어?"`;

export function CustomerChatbotScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'bot', text: `안녕하세요! ${COMPANY} 담당자님을 위한 챗봇 데모입니다. 최근 ${WINDOW_DAYS}일 작업 현황, 미수금, 출고 여부 등을 물어보세요.` },
  ]);
  const [input, setInput] = useState('');
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

        if (!cancelled) setCtx({ orders, receivablesAmount, monthStart, monthLabel });
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

  const intents = useMemo(() => (ctx ? buildIntents(ctx) : []), [ctx]);

  const answer = useCallback((question) => {
    const q = question.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: 'user', text: q }]);
    if (!ctx) {
      setMessages((m) => [...m, { role: 'bot', text: '데이터를 아직 불러오는 중입니다. 잠시 후 다시 시도해주세요.' }]);
      return;
    }
    for (const intent of intents) {
      const matched = intent.match(q);
      if (matched) {
        const text = intent.name === 'coil_lookup' ? intent.respond(matched) : intent.respond();
        setMessages((m) => [...m, { role: 'bot', text }]);
        return;
      }
    }
    setMessages((m) => [...m, { role: 'bot', text: FALLBACK }]);
  }, [ctx, intents]);

  const send = () => {
    answer(input);
    setInput('');
  };

  return (
    <div style={box.page}>
      <div>
        <h1 style={box.title}>💬 고객사 챗봇 데모 — {COMPANY}</h1>
        <p style={box.hint}>실제 고객사 포털(/portal)과는 별개의 연구실 프로토타입입니다. 지금은 {COMPANY} 한 곳으로 범위를 고정해 시연용으로 만들었습니다.</p>
      </div>

      <ProposalBanner text={`범용 AI 대화가 아니라, 정해진 10가지 질문 유형을 인식해 실데이터(최근 ${WINDOW_DAYS}일 작업현황 · 미출고현황 · 미수금)로 즉시 답하는 규칙기반 데모입니다. 실제 서비스로 만들 때는 로그인한 거래처 계정의 회사명을 자동으로 쓰고, 이 10가지 인텐트를 LLM 함수호출 도구로 확장하면 자유 질문까지 받을 수 있습니다.`} />
      {error && <ProposalBanner tone="amber" text={`데이터 로딩 오류: ${error}`} />}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => answer(q)}
            disabled={loading}
            style={{
              fontSize: '13.5px', fontWeight: 700, padding: '8px 14px', borderRadius: '999px',
              border: `1px solid ${COLORS.accentBg}`, background: COLORS.accentSoft, color: COLORS.accentDark,
              cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1,
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
        </div>
        <div style={{ display: 'flex', gap: '10px', padding: '16px 20px', borderTop: `1px solid ${COLORS.border}` }}>
          <input
            style={{ ...box.input, flex: 1 }}
            placeholder="예: 출고 안 된 거 있어?"
            value={input}
            disabled={loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          />
          <button style={box.primaryBtn} disabled={loading} onClick={send}>보내기</button>
        </div>
      </div>
    </div>
  );
}
