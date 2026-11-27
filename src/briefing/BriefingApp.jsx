// src/briefing/BriefingApp.jsx — 데일리 브리핑 전용 화면 (ohsung-system.vercel.app/briefing)
//
// 화면 3개 (해시 주소로 이동, 휴대폰 뒤로가기 지원)
//  #/            브리핑 홈: 오늘 꼭 할 일 Top 3, 오늘·내일 일정, 중요 메일 목록(답장 여부 표시)
//  #/mail/<id>   메일 상세: AI 요약, 본문, 첨부 이름, 답장 상태, 원문 열기
//  #/reply/<id>  답장 쓰기: AI 초안(말투·요지) → 직접 수정 → 확인 창 → 발송
//
// 데이터: briefing_runs / mail_items (RLS로 소유자 본인만). 본문·초안·발송은 mail-briefing-sync 함수의
//   /mail-detail · /draft · /send 경로를 소유자 로그인 토큰으로 호출합니다. 발송은 확인 창에서 「보내기」를 눌러야만 됩니다.
import React, { useState, useEffect, useCallback } from 'react';
import { supabase, supabaseUrl } from '../supabaseClient';

const C = {
  navy: '#0f1e33', ink: '#0f1e33', sub: '#5c6478', muted: '#7d8ba1', purple: '#796cbf', purpleBg: '#efedfb', purpleInk: '#534ab7',
  bg: '#f3f5fe', card: '#ffffff', line: '#e3e8f0', red: '#a32d2d', redBg: '#fdecec', amber: '#854f0b', amberBg: '#faeeda',
  green: '#27500a', greenBg: '#e6f4ea', blue: '#185fa5', blueBg: '#e6f1fb',
};
const FN = 'mail-briefing-sync';
const CONNECT_URL = `${supabaseUrl}/functions/v1/${FN}/oauth-start`;
const IMPORTANT = ['회신', '마감', '공고', '거래처'];
const CAT_ORDER = { 마감: 0, 회신: 1, 공고: 2, 거래처: 3 };
const TAG = {
  회신: [C.red, C.redBg], 마감: [C.amber, C.amberBg], 공고: [C.purpleInk, C.purpleBg], 거래처: [C.green, C.greenBg],
  일정: [C.blue, C.blueBg], 확인: [C.sub, C.line], 참고: [C.sub, C.line], 광고: [C.sub, C.line],
};
// 답장이 필요한 메일: 「회신」 분류이거나 기한 메모에 회신·답장이 들어간 메일 중 아직 답장 기록이 없는 것
const needsReply = (m) => (m.category === '회신' || /회신|답장/.test(m.due_text || '')) && !m.replied_at && !m.is_done;
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
// KST (double-offset 금지 패턴)
const kst = (ms) => new Date(ms + 9 * 3600000);
const kstDate = (ms) => kst(ms).toISOString().slice(0, 10);
const kstHM = (iso) => (iso ? kst(new Date(iso).getTime()).toISOString().slice(11, 16) : '-');
const kstMDHM = (iso) => { if (!iso) return ''; const d = kst(new Date(iso).getTime()); return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${d.toISOString().slice(11, 16)}`; };
const todayLabel = () => { const d = kst(Date.now()); return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WEEK[d.getUTCDay()]})`; };

const S = {
  page: { minHeight: '100vh', background: C.bg, fontFamily: 'Pretendard, "Malgun Gothic", sans-serif', color: C.ink },
  wrap: { maxWidth: 640, margin: '0 auto', padding: '0 0 40px' },
  bar: { position: 'sticky', top: 0, zIndex: 5, background: C.navy, color: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  card: { background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: '14px 16px', margin: '10px 12px' },
  h: { fontSize: 15, fontWeight: 800, margin: '18px 16px 4px', color: C.ink },
  btn: { border: `1.5px solid ${C.line}`, background: '#fff', color: C.ink, borderRadius: 10, padding: '11px 14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  btnP: { border: 'none', background: C.purple, color: '#fff', borderRadius: 10, padding: '12px 14px', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' },
  btnN: { border: 'none', background: C.navy, color: '#fff', borderRadius: 10, padding: '13px 14px', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' },
  muted: { color: C.muted, fontSize: 13 },
  barBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,.35)', color: '#fff', borderRadius: 8, padding: '6px 10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  input: { width: '100%', boxSizing: 'border-box', border: `1.5px solid ${C.line}`, borderRadius: 10, padding: '12px', fontSize: 15, fontFamily: 'inherit', color: C.ink },
};

function Tag({ name, small }) {
  const [c, bg] = TAG[name] || TAG['확인'];
  return <span style={{ fontSize: small ? 12 : 13, fontWeight: 800, color: c, background: bg, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{name}</span>;
}

// 함수 호출 (소유자 로그인 토큰이 자동으로 붙음)
async function callFn(path, body) {
  const { data, error } = await supabase.functions.invoke(`${FN}/${path}`, { body });
  if (error) {
    let msg = error.message;
    try { const j = await error.context?.json?.(); if (j?.error) msg = j.error; } catch { /* */ }
    return { ok: false, error: msg };
  }
  return data;
}

function useHashRoute() {
  const get = () => (window.location.hash || '#/').slice(1);
  const [route, setRoute] = useState(get());
  useEffect(() => { const f = () => { setRoute(get()); window.scrollTo(0, 0); }; window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return route;
}
const go = (r) => { window.location.hash = r; };

// ── 로그인 ──
function LoginView() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) setErr('이메일 또는 비밀번호를 확인해 주세요.');
    setBusy(false);
  };
  return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form onSubmit={submit} style={{ ...S.card, width: '100%', maxWidth: 380, padding: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>데일리 브리핑</div>
        <div style={{ ...S.muted, margin: '6px 0 18px' }}>오성철강 관리자 계정으로 로그인하세요</div>
        <input style={S.input} type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        <div style={{ height: 10 }} />
        <input style={S.input} type="password" placeholder="비밀번호" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required />
        {err && <div style={{ color: C.red, fontSize: 13, marginTop: 8 }}>{err}</div>}
        <button type="submit" disabled={busy} style={{ ...S.btnN, width: '100%', marginTop: 16 }}>{busy ? '확인 중…' : '로그인'}</button>
      </form>
    </div>
  );
}

// ── 홈 ──
function HomeView({ data, reload, onSignOut }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('전체');
  const { run, okRun, mails, hidden } = data;

  const refreshNow = async () => {
    setBusy(true); setMsg('');
    const { data: res } = await supabase.functions.invoke(FN, { body: {} });
    setMsg(res?.ok ? `확인 완료 · 새 메일 ${res.new_mails ?? 0}통` : '확인 중 문제가 생겼습니다. 잠시 후 다시 눌러 주세요.');
    await reload(); setBusy(false);
  };

  if (!run) {
    return (
      <div style={S.card}>
        <div style={{ fontWeight: 800, fontSize: 17 }}>브리핑이 아직 없습니다</div>
        <div style={{ ...S.muted, marginTop: 6, lineHeight: 1.6 }}>이 화면은 브리핑 소유자(관리자) 계정에서만 내용이 보입니다.</div>
        <button style={{ ...S.btn, marginTop: 12 }} onClick={onSignOut}>다른 계정으로 로그인</button>
      </div>
    );
  }
  const content = okRun || run;
  const top3 = content.top3 || [];
  const events = content.events || [];
  const tomorrow = content.tomorrow || [];
  const sources = content.sources || [];
  const needReply = mails.filter(needsReply);
  const shown = mails.filter((m) => filter === '전체' || (filter === '답장 필요' ? needsReply(m) : m.category === filter));
  const filters = ['전체', '답장 필요', '마감', '공고', '거래처'];

  return (
    <>
      {run.status === 'error' && <div style={{ ...S.card, background: C.redBg, color: C.red, fontSize: 14 }}>마지막 확인({kstHM(run.run_at)})에 실패했습니다. 잠시 후 자동으로 다시 시도합니다.</div>}
      {run.status === 'not_configured' && (
        <div style={{ ...S.card, background: C.amberBg, color: C.amber, fontSize: 14 }}>
          Google 계정 연결이 필요합니다. <a href={CONNECT_URL} target="_blank" rel="noreferrer" style={{ color: C.amber, fontWeight: 800 }}>Google 계정 연결</a>
        </div>
      )}

      <div style={{ ...S.card, background: C.navy, color: '#fff', border: 'none' }}>
        <div style={{ fontSize: 13, opacity: 0.75 }}>{todayLabel()} · 오늘 꼭 할 일</div>
        {top3.length === 0 && <div style={{ fontSize: 15, marginTop: 8 }}>급한 일이 없습니다.</div>}
        {top3.map((t, i) => (
          <div key={i} style={{ marginTop: 12, display: 'flex', gap: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 800, opacity: 0.6, width: 18 }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.4 }}>{t.title}</div>
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>{t.detail}{t.due ? ` · ${t.due}` : ''}</div>
            </div>
          </div>
        ))}
        {content.lead && <div style={{ fontSize: 13, opacity: 0.75, marginTop: 14, lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,.15)', paddingTop: 10 }}>{content.lead}</div>}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '4px 12px' }}>
        {sources.map((s) => (
          <span key={s.name} style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999, color: s.state === 'ok' ? C.green : C.amber, background: s.state === 'ok' ? C.greenBg : C.amberBg }}>
            {s.name} {s.note || (s.state === 'ok' ? '정상' : '확인 필요')}
          </span>
        ))}
        <span style={{ ...S.muted, alignSelf: 'center', marginLeft: 'auto' }}>{kstHM(run.run_at)} 확인</span>
      </div>

      <div style={S.h}>오늘 일정 {events.length ? `${events.length}건` : ''}</div>
      <div style={S.card}>
        {events.length === 0 && <div style={S.muted}>오늘 일정이 없습니다.</div>}
        {events.map((e, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderTop: i ? `1px solid ${C.line}` : 'none' }}>
            <div style={{ width: 86, fontSize: 14, fontWeight: 800, color: C.purpleInk }}>{e.time}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{e.title}</div>
              {(e.location || e.detail) && <div style={{ ...S.muted, marginTop: 2 }}>{[e.location, e.detail].filter(Boolean).join(' · ')}</div>}
              {e.warn && <div style={{ fontSize: 13, color: C.red, fontWeight: 700, marginTop: 3 }}>{e.warn}</div>}
            </div>
          </div>
        ))}
        {tomorrow.length > 0 && <div style={{ ...S.muted, marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.line}` }}>내일: {tomorrow.map((t) => `${t.time} ${t.title}`).join(' / ')}</div>}
      </div>

      <div style={{ ...S.h, display: 'flex', alignItems: 'center', gap: 8 }}>
        중요 메일 {mails.length}통 {needReply.length > 0 && <Tag name="회신" small />}{needReply.length > 0 && <span style={{ fontSize: 13, color: C.red }}>답장 필요 {needReply.length}</span>}
      </div>
      {needReply.length > 0 && <a href="/reply" style={{ ...S.btnP, display: 'block', textAlign: 'center', textDecoration: 'none', margin: '8px 12px' }}>답장할 메일 {needReply.length}건 · 초안과 함께 보기 →</a>}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 12px' }}>
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ ...S.btn, padding: '7px 12px', fontSize: 13, whiteSpace: 'nowrap', background: filter === f ? C.navy : '#fff', color: filter === f ? '#fff' : C.sub, borderColor: filter === f ? C.navy : C.line }}>{f}</button>
        ))}
      </div>
      {shown.length === 0 && <div style={{ ...S.card, ...S.muted }}>해당하는 메일이 없습니다.</div>}
      {shown.map((m) => (
        <div key={m.id} onClick={() => go(`/mail/${encodeURIComponent(m.gmail_id)}`)} style={{ ...S.card, cursor: 'pointer', borderColor: m.hot ? C.purple : C.line, borderWidth: m.hot ? 1.5 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Tag name={m.category} small />
            {m.due_text && <span style={{ fontSize: 12, fontWeight: 700, color: m.hot ? C.red : C.amber }}>{m.due_text}</span>}
            <span style={{ ...S.muted, marginLeft: 'auto', fontSize: 12 }}>
              {m.src} · {m.replied_at ? <b style={{ color: C.green }}>답장함</b> : needsReply(m) ? <b style={{ color: C.red }}>미답장</b> : kstMDHM(m.received_at)}
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, marginTop: 6, lineHeight: 1.4 }}>{m.summary || m.subject}</div>
          <div style={{ ...S.muted, marginTop: 3 }}>{m.from_name} · {m.subject}</div>
        </div>
      ))}
      <div style={{ ...S.muted, margin: '10px 16px' }}>참고 {hidden.참고}통 · 광고 {hidden.광고}통은 목록에서 뺐습니다.</div>

      <div style={{ display: 'flex', gap: 8, margin: '14px 12px' }}>
        <button style={{ ...S.btn, flex: 1 }} onClick={refreshNow} disabled={busy}>{busy ? '확인 중…' : '지금 확인'}</button>
        <button style={S.btn} onClick={onSignOut}>로그아웃</button>
      </div>
      {msg && <div style={{ ...S.muted, margin: '0 16px' }}>{msg}</div>}
    </>
  );
}

// ── 메일 상세 ──
function MailView({ id, row, reload }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let live = true;
    setD(null); setErr('');
    callFn('mail-detail', { id }).then((r) => { if (!live) return; if (r?.ok) setD(r.detail); else setErr(r?.error || '불러오지 못했습니다'); });
    return () => { live = false; };
  }, [id]);
  const markDone = async () => {
    if (row) await supabase.from('mail_items').update({ is_done: true, done_at: new Date().toISOString() }).eq('id', row.id);
    await reload(); go('/');
  };
  const replied = d?.replied || row?.replied_at;
  return (
    <>
      <div style={S.card}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {row && <Tag name={row.category} />}{row?.due_text && <span style={{ fontSize: 13, fontWeight: 800, color: row.hot ? C.red : C.amber }}>{row.due_text}</span>}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, marginTop: 8, lineHeight: 1.4 }}>{d?.subject || row?.subject || '…'}</div>
        <div style={{ ...S.muted, marginTop: 4 }}>{d?.from || row?.from_name} · {kstMDHM(d?.date || row?.received_at)} · {d?.src || row?.src}</div>
        {d?.cc && <div style={{ ...S.muted, marginTop: 2 }}>참조: {d.cc}</div>}
      </div>
      {row?.summary && (
        <div style={{ ...S.card, background: '#f7f6fe' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.purpleInk }}>AI 요약</div>
          <div style={{ fontSize: 15, marginTop: 4, lineHeight: 1.6 }}>{row.summary}</div>
        </div>
      )}
      <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>답장 상태</span>
        {!d && !err ? <span style={S.muted}>확인 중…</span>
          : replied ? <span style={{ color: C.green, fontWeight: 800, fontSize: 14 }}>답장함{row?.replied_at ? ` (${kstMDHM(row.replied_at)})` : ''}</span>
          : <span style={{ color: C.red, fontWeight: 800, fontSize: 14 }}>아직 답장 안 함</span>}
      </div>
      <div style={S.card}>
        {err && <div style={{ color: C.red, fontSize: 14 }}>본문을 불러오지 못했습니다: {err}</div>}
        {!d && !err && <div style={S.muted}>본문 불러오는 중…</div>}
        {d && <div style={{ fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#2b3548' }}>{d.text || '(본문 없음)'}</div>}
        {d?.atts?.length > 0 && <div style={{ ...S.muted, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>첨부 {d.atts.length}개 · {d.atts.join(', ')} <span style={{ color: C.sub }}>(원문에서 열기)</span></div>}
      </div>
      <div style={{ display: 'flex', gap: 8, margin: '12px' }}>
        <button style={{ ...S.btnP, flex: 1.4 }} onClick={() => go(`/reply/${encodeURIComponent(id)}`)}>답장 쓰기</button>
        <button style={{ ...S.btn, flex: 1 }} onClick={markDone}>처리 완료</button>
      </div>
      {(d?.open_url || row?.url) && <div style={{ margin: '0 12px' }}><a href={d?.open_url || row?.url} target="_blank" rel="noreferrer" style={{ ...S.btn, display: 'block', textAlign: 'center', textDecoration: 'none' }}>원문 열기 ({d?.src || row?.src})</a></div>}
    </>
  );
}

// ── 답장 쓰기 ──
function ReplyView({ id, row, reload }) {
  const [d, setD] = useState(null);
  const [text, setText] = useState('');
  const [tone, setTone] = useState('기본');
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [sent, setSent] = useState(null);
  const draftKey = `briefing-draft:${id}`;
  useEffect(() => {
    callFn('mail-detail', { id }).then((r) => { if (r?.ok) setD(r.detail); else setErr(r?.error || '메일을 불러오지 못했습니다'); });
    try { const s = localStorage.getItem(draftKey); if (s) setText(s); } catch { /* */ }
  }, [id]);
  useEffect(() => { try { if (text) localStorage.setItem(draftKey, text); } catch { /* */ } }, [text]);

  const makeDraft = async () => {
    setBusy('draft'); setErr('');
    const r = await callFn('draft', { id, tone, hint });
    if (r?.ok) setText(r.body); else setErr(r?.error || '초안을 만들지 못했습니다');
    setBusy('');
  };
  const send = async () => {
    setBusy('send'); setErr('');
    const r = await callFn('send', { id, body: text, confirm: true });
    setBusy(''); setConfirm(false);
    if (r?.ok) { setSent(r); try { localStorage.removeItem(draftKey); } catch { /* */ } await reload(); }
    else setErr(r?.error === 'need_gmail_send' ? 'need_gmail_send' : (r?.error || '보내지 못했습니다'));
  };

  if (sent) {
    return (
      <div style={{ ...S.card, textAlign: 'center', padding: 28 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>답장을 보냈습니다</div>
        <div style={{ ...S.muted, marginTop: 6 }}>{sent.to} · {kstMDHM(sent.replied_at)}</div>
        <button style={{ ...S.btnN, marginTop: 18, width: '100%' }} onClick={() => go('/')}>브리핑으로 돌아가기</button>
      </div>
    );
  }
  const to = d ? (d.reply_to || d.from) : '';
  const quote = (d?.text || '').split('\n').slice(0, 6).join('\n');
  return (
    <>
      <div style={{ ...S.card, fontSize: 14, lineHeight: 1.7 }}>
        <div><span style={S.muted}>받는 사람</span> <b>{to || '…'}</b></div>
        <div><span style={S.muted}>제목</span> {d ? (/^\s*re:/i.test(d.subject) ? d.subject : `Re: ${d.subject}`) : row?.subject}</div>
        <div><span style={S.muted}>보내는 계정</span> {d?.send_from || (row?.src === '네이버' ? 'kaibay@naver.com' : 'kaibay@gmail.com')}</div>
      </div>
      {d && !d.can_send && (
        <div style={{ ...S.card, background: C.amberBg, color: C.amber, fontSize: 14, lineHeight: 1.6 }}>
          Gmail로 답장하려면 Google 계정을 한 번 다시 연결해 발송 권한을 허용해야 합니다.
          <a href={CONNECT_URL} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 8, fontWeight: 800, color: C.amber }}>Google 계정 다시 연결 →</a>
        </div>
      )}
      <div style={{ ...S.card }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {['기본', '짧게', '정중하게'].map((t) => (
            <button key={t} onClick={() => setTone(t)} style={{ ...S.btn, padding: '6px 12px', fontSize: 13, borderColor: tone === t ? C.purple : C.line, color: tone === t ? C.purpleInk : C.sub }}>{t}</button>
          ))}
        </div>
        <input style={{ ...S.input, marginTop: 10, fontSize: 14 }} placeholder="전하고 싶은 요지 (예: A안으로 진행, 납기 확인 요청)" value={hint} onChange={(e) => setHint(e.target.value)} />
        <button style={{ ...S.btnP, width: '100%', marginTop: 10 }} onClick={makeDraft} disabled={!!busy}>{busy === 'draft' ? 'AI 초안 만드는 중…' : text ? 'AI 초안 다시 만들기' : 'AI 초안 만들기'}</button>
      </div>
      <div style={S.card}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="답장 내용을 쓰거나 AI 초안을 만들어 고치세요" style={{ ...S.input, minHeight: 220, lineHeight: 1.7, resize: 'vertical', border: 'none', padding: 0 }} />
        {quote && <div style={{ ...S.muted, whiteSpace: 'pre-wrap', borderTop: `1px solid ${C.line}`, paddingTop: 8, marginTop: 8 }}>{'> '}{quote.replace(/\n/g, '\n> ')}{'\n'}<span style={{ color: C.sub }}>(원문 일부가 아래에 인용되어 함께 갑니다)</span></div>}
      </div>
      {text.includes('[확인 필요') && <div style={{ ...S.card, background: C.amberBg, color: C.amber, fontSize: 13 }}>[확인 필요] 표시가 남아 있습니다. 내용을 채운 뒤 보내세요.</div>}
      {err && err !== 'need_gmail_send' && <div style={{ ...S.card, background: C.redBg, color: C.red, fontSize: 14 }}>{err}</div>}
      {err === 'need_gmail_send' && <div style={{ ...S.card, background: C.amberBg, color: C.amber, fontSize: 14 }}>Gmail 발송 권한이 없습니다. <a href={CONNECT_URL} target="_blank" rel="noreferrer" style={{ fontWeight: 800, color: C.amber }}>Google 계정 다시 연결</a> 후 다시 보내세요.</div>}
      <div style={{ margin: 12 }}>
        <button style={{ ...S.btnN, width: '100%', opacity: text.trim().length < 2 || !d ? 0.5 : 1 }} onClick={() => { if (text.trim().length < 2) { setErr('답장 내용을 입력하세요'); return; } setConfirm(true); }} disabled={!d}>보내기</button>
        <div style={{ ...S.muted, textAlign: 'center', marginTop: 6 }}>보내기 전에 한 번 더 확인합니다 · 작성 중인 내용은 이 기기에 자동 저장됩니다</div>
      </div>

      {confirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,30,51,.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 20 }} onClick={() => busy || setConfirm(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 640, borderRadius: '18px 18px 0 0', padding: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>이 답장을 보낼까요?</div>
            <div style={{ fontSize: 14, marginTop: 10, lineHeight: 1.7 }}>
              <div><span style={S.muted}>받는 사람</span> <b>{to}</b></div>
              <div><span style={S.muted}>보내는 계정</span> {d?.send_from}</div>
            </div>
            <div style={{ fontSize: 14, color: C.sub, whiteSpace: 'pre-wrap', maxHeight: 180, overflow: 'auto', background: C.bg, borderRadius: 10, padding: 12, marginTop: 10 }}>{text}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button style={{ ...S.btn, flex: 1 }} onClick={() => setConfirm(false)} disabled={!!busy}>취소</button>
              <button style={{ ...S.btnN, flex: 1.5 }} onClick={send} disabled={!!busy}>{busy === 'send' ? '보내는 중…' : '보내기'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// ── 답장할 메일 (/reply) : 메일 원문 + 바로 아래 답장 초안을 한 통의 메일처럼 ──
// 같은 대화(Gmail 스레드, 또는 같은 보낸이+제목)는 최신 1통으로 묶고 몇 통인지 표시합니다.
// 답장 초안은 처음 열 때 AI가 만들어 mail_items.reply_draft 에 저장 → 다음에 열면 그대로 이어서 고칩니다.
const baseSubj = (s) => String(s || '').replace(/^\s*((re|fw|fwd|회신|답장|전달)\s*:\s*)+/gi, '').replace(/\s+/g, ' ').trim();
function groupThreads(list) {
  const map = new Map();
  for (const m of list) {
    const key = m.thread_id || `${m.from_email}|${baseSubj(m.subject)}`;
    const g = map.get(key);
    if (!g) map.set(key, { key, latest: m, items: [m] });
    else { g.items.push(m); if ((m.received_at || '') > (g.latest.received_at || '')) g.latest = m; }
  }
  return [...map.values()].sort((a, b) => (a.latest.hot === b.latest.hot ? (b.latest.received_at || '').localeCompare(a.latest.received_at || '') : a.latest.hot ? -1 : 1));
}

// 최신 메일 본문과 아래에 인용된 지난 대화를 나눔
const QUOTE_RE = /^[ \t]*(-{3,}\s*(original message|원본 메일|원본 메시지|forwarded message)|from:\s.+$\n^\s*(sent|date|보낸 날짜):|on .{5,120} wrote:\s*$|\d{4}[.\-/년 ].{3,80}(님이 작성|작성:|wrote:)|>)/im;
function splitQuote(body) {
  const m = body.match(QUOTE_RE);
  if (!m || m.index === undefined || m.index < 20) return [body, ''];
  return [body.slice(0, m.index).trimEnd(), body.slice(m.index)];
}
function ReplyLetter({ group, reload, draftQueue }) {
  const row = group.latest;
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [more, setMore] = useState(false);
  const [text, setText] = useState(row.reply_draft || '');
  const [busy, setBusy] = useState(row.reply_draft ? '' : 'draft');
  const [confirm, setConfirm] = useState(false);
  const [sent, setSent] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => { callFn('mail-detail', { id: row.gmail_id }).then((r) => (r?.ok ? setD(r.detail) : setErr(r?.error || '불러오지 못했습니다'))); }, [row.gmail_id]);
  const makeDraft = useCallback(async () => {
    setBusy('draft');
    const r = await callFn('draft', { id: row.gmail_id, tone: '기본' });
    if (r?.ok && r.body) {
      setText(r.body);
      await supabase.from('mail_items').update({ reply_draft: r.body, reply_draft_at: new Date().toISOString() }).eq('id', row.id);
    } else setMsg(r?.error || '초안을 만들지 못했습니다');
    setBusy('');
  }, [row.gmail_id, row.id]);
  // 초안이 없으면 차례대로 자동 생성 (동시에 여러 개를 부르지 않도록 큐 사용)
  useEffect(() => { if (!row.reply_draft) draftQueue(makeDraft); }, []); // eslint-disable-line
  const saveDraft = async () => { await supabase.from('mail_items').update({ reply_draft: text, reply_draft_at: new Date().toISOString() }).eq('id', row.id); setMsg('초안을 저장했습니다'); };
  const skip = async () => { await supabase.from('mail_items').update({ is_done: true, done_at: new Date().toISOString() }).eq('id', row.id); reload(); };
  const send = async () => {
    setBusy('send'); setMsg('');
    const r = await callFn('send', { id: row.gmail_id, body: text, confirm: true });
    setBusy(''); setConfirm(false);
    if (r?.ok) { setSent(r); reload(); } else setMsg(r?.error === 'need_gmail_send' ? 'need_gmail_send' : (r?.error || '보내지 못했습니다'));
  };
  const to = d ? (d.reply_to || d.from) : `${row.from_name} <${row.from_email}>`;
  const [body, history] = splitQuote(d?.text || '');
  const long = more || body.length > 1400;

  if (sent) return <div style={{ ...S.card, background: C.greenBg, color: C.green, fontWeight: 800 }}>답장 보냄 · {sent.to} · {kstMDHM(sent.replied_at)} — {row.subject}</div>;

  return (
    <div style={{ ...S.card, padding: 0, overflow: 'hidden', borderColor: row.hot ? C.purple : C.line, borderWidth: row.hot ? 1.5 : 1 }}>
      {/* 받은 메일 */}
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Tag name={row.category} small />
          {row.due_text && <span style={{ fontSize: 12, fontWeight: 800, color: row.hot ? C.red : C.amber }}>{row.due_text}</span>}
          {group.items.length > 1 && <span style={{ fontSize: 12, fontWeight: 700, color: C.sub, background: C.line, borderRadius: 999, padding: '2px 8px' }}>같은 대화 {group.items.length}통</span>}
          <span style={{ ...S.muted, marginLeft: 'auto', fontSize: 12 }}>{row.src}</span>
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, marginTop: 8, lineHeight: 1.4 }}>{d?.subject || row.subject}</div>
        <table style={{ fontSize: 13, marginTop: 8, borderCollapse: 'collapse', width: '100%' }}><tbody>
          <tr><td style={{ ...S.muted, width: 64, padding: '2px 0', verticalAlign: 'top' }}>보낸 사람</td><td style={{ padding: '2px 0', wordBreak: 'break-all' }}>{d?.from || `${row.from_name} <${row.from_email}>`}</td></tr>
          {d?.cc && <tr><td style={{ ...S.muted, padding: '2px 0', verticalAlign: 'top' }}>참조</td><td style={{ padding: '2px 0', wordBreak: 'break-all' }}>{d.cc}</td></tr>}
          <tr><td style={{ ...S.muted, padding: '2px 0' }}>받은 시각</td><td style={{ padding: '2px 0' }}>{kstMDHM(d?.date || row.received_at)}</td></tr>
        </tbody></table>
        {row.summary && <div style={{ background: '#f7f6fe', borderRadius: 10, padding: '8px 12px', marginTop: 10, fontSize: 14 }}><b style={{ color: C.purpleInk, fontSize: 12 }}>AI 요약 </b>{row.summary}</div>}
        <div style={{ fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#2b3548', marginTop: 12 }}>
          {err ? <span style={{ color: C.red }}>본문을 불러오지 못했습니다: {err}</span> : !d ? <span style={S.muted}>본문 불러오는 중…</span> : (!more && body.length > 1400 ? body.slice(0, 1400) + '…' : body) || '(본문 없음)'}
          {more && history && <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${C.line}`, color: C.muted, fontSize: 14 }}>{history}</div>}
        </div>
        {(history || body.length > 1400) && <button style={{ ...S.btn, padding: '6px 12px', fontSize: 13, marginTop: 8 }} onClick={() => setMore(!more)}>{more ? '접기' : history ? '이전 대화 보기' : '본문 전체 보기'}</button>}
        {d?.atts?.length > 0 && <div style={{ ...S.muted, marginTop: 8 }}>첨부 {d.atts.length}개 · {d.atts.join(', ')}</div>}
        {d?.open_url && <a href={d.open_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8, fontSize: 13, color: C.purpleInk, fontWeight: 700 }}>원문 열기 ↗</a>}
      </div>
      {/* 답장 초안 */}
      <div style={{ padding: '14px 16px', background: '#fbfbff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>↳ 답장 초안</span>
          <span style={{ ...S.muted, fontSize: 12 }}>받는 사람 {to}</span>
        </div>
        {busy === 'draft' && !text
          ? <div style={{ ...S.muted, padding: '14px 0' }}>AI가 답장 초안을 쓰는 중…</div>
          : <textarea value={text} onChange={(e) => setText(e.target.value)} onBlur={saveDraft} style={{ ...S.input, minHeight: 180, lineHeight: 1.7, marginTop: 8, resize: 'vertical', background: '#fff' }} />}
        {text.includes('[확인 필요') && <div style={{ fontSize: 13, color: C.amber, marginTop: 6 }}>[확인 필요] 부분을 채운 뒤 보내세요.</div>}
        {d && !d.can_send && <div style={{ fontSize: 13, color: C.amber, marginTop: 6 }}>Gmail 답장은 <a href={CONNECT_URL} target="_blank" rel="noreferrer" style={{ color: C.amber, fontWeight: 800 }}>Google 계정 다시 연결</a> 후 보낼 수 있습니다.</div>}
        {msg && msg !== 'need_gmail_send' && <div style={{ fontSize: 13, color: msg.includes('저장') ? C.green : C.red, marginTop: 6 }}>{msg}</div>}
        {msg === 'need_gmail_send' && <div style={{ fontSize: 13, color: C.amber, marginTop: 6 }}>Gmail 발송 권한이 없습니다. <a href={CONNECT_URL} target="_blank" rel="noreferrer" style={{ color: C.amber, fontWeight: 800 }}>Google 계정 다시 연결</a></div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button style={{ ...S.btnN, flex: 1.4, minWidth: 120 }} disabled={!d || !!busy} onClick={() => (text.trim().length < 2 ? setMsg('답장 내용을 입력하세요') : setConfirm(true))}>보내기</button>
          <button style={{ ...S.btn, flex: 1 }} disabled={!!busy} onClick={makeDraft}>{busy === 'draft' ? '만드는 중…' : '초안 다시 만들기'}</button>
          <button style={{ ...S.btn, flex: 1 }} onClick={skip}>답장 안 함</button>
        </div>
      </div>
      {confirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,30,51,.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 20 }} onClick={() => busy || setConfirm(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 640, borderRadius: '18px 18px 0 0', padding: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>이 답장을 보낼까요?</div>
            <div style={{ fontSize: 14, marginTop: 10, lineHeight: 1.7 }}>
              <div><span style={S.muted}>받는 사람</span> <b>{to}</b></div>
              <div><span style={S.muted}>보내는 계정</span> {d?.send_from}</div>
            </div>
            <div style={{ fontSize: 14, color: C.sub, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto', background: C.bg, borderRadius: 10, padding: 12, marginTop: 10 }}>{text}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button style={{ ...S.btn, flex: 1 }} onClick={() => setConfirm(false)} disabled={!!busy}>취소</button>
              <button style={{ ...S.btnN, flex: 1.5 }} onClick={send} disabled={!!busy}>{busy === 'send' ? '보내는 중…' : '보내기'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReplyInbox({ data, reload }) {
  const pending = data.mails.filter(needsReply);
  const groups = groupThreads(pending);
  const pendingKeys = new Set(groups.map((g) => g.key));
  const [pickedKeys, setPickedKeys] = useState([]);
  const rest = groupThreads(data.mails.filter((m) => ['회신', '거래처', '마감'].includes(m.category))).filter((g) => !pendingKeys.has(g.key));
  const picked = rest.filter((g) => pickedKeys.includes(g.key));
  const others = rest.filter((g) => !pickedKeys.includes(g.key));
  // 초안 자동 생성 큐 (한 번에 하나씩)
  const q = React.useRef(Promise.resolve());
  const draftQueue = useCallback((fn) => { q.current = q.current.then(fn).catch(() => {}); }, []);
  return (
    <>
      <div style={{ ...S.card, background: C.navy, color: '#fff', border: 'none' }}>
        <div style={{ fontSize: 13, opacity: 0.75 }}>{todayLabel()}</div>
        <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>답장할 메일 {groups.length}건</div>
        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6, lineHeight: 1.6 }}>받은 메일 아래에 AI 답장 초안이 있습니다. 고친 내용은 자동 저장되고, 「보내기」는 확인 창에서 한 번 더 눌러야 발송됩니다.</div>
      </div>
      {groups.length === 0 && <div style={{ ...S.card, ...S.muted }}>지금 답장할 메일이 없습니다. 아래 업무 메일 중 답장할 것을 골라 초안을 만들 수 있습니다.</div>}
      {groups.map((g) => <ReplyLetter key={g.key + g.latest.id} group={g} reload={reload} draftQueue={draftQueue} />)}
      {picked.map((g) => <ReplyLetter key={'p' + g.key + g.latest.id} group={g} reload={reload} draftQueue={draftQueue} />)}

      {others.length > 0 && <div style={S.h}>다른 업무 메일 {others.length}건 <span style={{ ...S.muted, fontWeight: 400 }}>· 필요하면 답장</span></div>}
      {others.map((g) => (
        <div key={'o' + g.key} style={{ ...S.card, display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Tag name={g.latest.category} small />{g.items.length > 1 && <span style={{ ...S.muted, fontSize: 12 }}>같은 대화 {g.items.length}통</span>}<span style={{ ...S.muted, fontSize: 12, marginLeft: 'auto' }}>{g.latest.src} · {kstMDHM(g.latest.received_at)}</span></div>
            <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4 }}>{g.latest.summary || g.latest.subject}</div>
            <div style={{ ...S.muted, fontSize: 12, marginTop: 2 }}>{g.latest.from_name}{g.latest.replied_at ? ' · 답장함' : ''}</div>
          </div>
          <button style={{ ...S.btn, padding: '8px 12px', fontSize: 13, whiteSpace: 'nowrap' }} onClick={() => setPickedKeys((k) => [...k, g.key])}>답장 초안</button>
        </div>
      ))}
      <div style={{ margin: 12 }}><a href="/briefing" style={{ ...S.btn, display: 'block', textAlign: 'center', textDecoration: 'none' }}>전체 브리핑 보기</a></div>
    </>
  );
}

// ── 앱 ──
export default function BriefingApp() {
  const [session, setSession] = useState(undefined);
  const [data, setData] = useState({ run: null, okRun: null, mails: [], hidden: { 참고: 0, 광고: 0 } });
  const [loaded, setLoaded] = useState(false);
  const route = useHashRoute();
  const m1 = route.match(/^\/(mail|reply)\/(.+)$/);
  const isInbox = window.location.pathname.replace(/\/+$/, '') === '/reply';
  const view = m1 ? m1[1] : isInbox ? 'inbox' : 'home';
  const id = m1 ? decodeURIComponent(m1[2]) : '';
  const [extraRow, setExtraRow] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: s }) => setSession(s.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s || null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    const since14 = new Date(Date.now() - 14 * 86400000).toISOString();
    const since2 = new Date(Date.now() - 2 * 86400000).toISOString();
    const [r1, r2, r3, r4] = await Promise.all([
      supabase.from('briefing_runs').select('*').order('run_at', { ascending: false }).limit(1),
      supabase.from('briefing_runs').select('*').eq('status', 'ok').order('run_at', { ascending: false }).limit(1),
      supabase.from('mail_items').select('*').eq('is_done', false).in('category', IMPORTANT).gte('received_at', since14).order('received_at', { ascending: false }).limit(60),
      supabase.from('mail_items').select('category').in('category', ['참고', '광고']).gte('received_at', since2),
    ]);
    const mails = (r3.data || []).slice().sort((a, b) => {
      const ra = needsReply(a) ? 0 : 1, rb = needsReply(b) ? 0 : 1;
      const ha = a.hot ? 0 : 1, hb = b.hot ? 0 : 1;
      if (ha !== hb) return ha - hb;
      if (ra !== rb) return ra - rb;
      const ca = CAT_ORDER[a.category] ?? 9, cb = CAT_ORDER[b.category] ?? 9;
      if (ca !== cb) return ca - cb;
      return (b.received_at || '').localeCompare(a.received_at || '');
    });
    const hidden = { 참고: 0, 광고: 0 };
    (r4.data || []).forEach((m) => { hidden[m.category] = (hidden[m.category] || 0) + 1; });
    setData({ run: r1.data?.[0] || null, okRun: r2.data?.[0] || null, mails, hidden });
    setLoaded(true);
  }, []);

  // 「회신」 메일 중 아직 답장 기록이 없는 것은 실제 메일함에서 답장 여부를 한 번씩 확인해 반영
  const checked = React.useRef(new Set());
  useEffect(() => {
    const todo = data.mails.filter((m) => needsReply(m) && !checked.current.has(m.gmail_id)).slice(0, 6);
    if (!todo.length) return;
    todo.forEach((m) => checked.current.add(m.gmail_id));
    (async () => {
      let changed = false;
      for (const m of todo) {
        const r = await callFn('mail-detail', { id: m.gmail_id });
        if (r?.ok && r.detail?.replied) {
          await supabase.from('mail_items').update({ replied_at: new Date().toISOString(), is_done: true, done_at: new Date().toISOString() }).eq('id', m.id); // 이미 답장한 메일은 처리 완료로(오늘 할 일에서도 빠짐)
          changed = true;
        }
      }
      if (changed) load();
    })();
  }, [data.mails, load]);

  useEffect(() => {
    if (!session) return;
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [session, load]);

  // 목록에 없는 메일(처리 완료 등)을 열면 따로 읽어 옴
  useEffect(() => {
    setExtraRow(null);
    if (!session || !id || data.mails.some((m) => m.gmail_id === id)) return;
    supabase.from('mail_items').select('*').eq('gmail_id', id).maybeSingle().then(({ data: r }) => setExtraRow(r || null));
  }, [session, id, data.mails]);

  if (session === undefined) return <div style={S.page} />;
  if (!session) return <LoginView />;

  const signOut = async () => { await supabase.auth.signOut(); go('/'); };
  const row = id ? (data.mails.find((m) => m.gmail_id === id) || extraRow) : null;

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={S.bar}>
          {view === 'home'
            ? <span style={{ fontSize: 17, fontWeight: 800 }}>데일리 브리핑</span>
            : view === 'inbox' ? <span style={{ fontSize: 17, fontWeight: 800 }}>답장할 메일</span>
            : <button style={S.barBtn} onClick={() => (view === 'reply' ? go(`/mail/${encodeURIComponent(id)}`) : go('/'))}>‹ {view === 'reply' ? '메일' : '브리핑'}</button>}
          <span style={{ fontSize: 13, opacity: 0.8 }}>{view === 'home' || view === 'inbox' ? (data.run ? `${kstHM(data.run.run_at)} 갱신` : '') : view === 'mail' ? '메일' : '답장 쓰기'}</span>
        </div>
        {!loaded ? <div style={{ ...S.muted, padding: 24 }}>불러오는 중…</div>
          : view === 'mail' ? <MailView id={id} row={row} reload={load} />
          : view === 'reply' ? <ReplyView id={id} row={row} reload={load} />
          : view === 'inbox' ? <ReplyInbox data={data} reload={load} />
          : <HomeView data={data} reload={load} onSignOut={signOut} />}
      </div>
    </div>
  );
}
