// src/pages/test/dailyBriefingScreen.jsx
// 연구실 「데일리 브리핑 (메일·일정)」 — Gmail·네이버 메일(Gmail 자동 전달분)·구글 캘린더 요약 화면.
//
// 데이터는 mail-briefing-sync Edge Function이 pg_cron으로 KST 07:00~20:50 10분마다 채웁니다.
//  - public.briefing_runs : 실행 기록 + 그 시점의 Top 3·총평·오늘/내일 일정·연결 상태
//  - public.mail_items    : 메일별 분류(회신/마감/공고/거래처/참고/광고)·한 줄 요약·처리 여부
// 두 테이블 모두 RLS로 소유자 본인(관리자 계정)만 읽을 수 있어, 다른 계정으로 열면 빈 화면 안내가 나옵니다.
// 이 화면은 메일을 보내거나 지우지 않습니다. 「처리」는 mail_items.is_done만 바꿉니다.
import React, { useState, useEffect, useCallback } from 'react';
import { COLORS } from './theme';
import { supabase } from '../../supabaseClient';

const REFRESH_MS = 60000;
const IMPORTANT = ['회신', '마감', '공고', '거래처'];
const CAT_ORDER = { 마감: 0, 회신: 1, 공고: 2, 거래처: 3 };
const TAG = {
  회신: { c: COLORS.red, bg: COLORS.redBg },
  마감: { c: COLORS.amber, bg: COLORS.amberBg },
  공고: { c: COLORS.blue, bg: COLORS.blueBg },
  거래처: { c: COLORS.steel, bg: COLORS.border },
  일정: { c: COLORS.blue, bg: COLORS.blueBg },
  확인: { c: COLORS.steel, bg: COLORS.border },
};

// KST (double-offset 금지 패턴)
const kstDate = (ms) => new Date(ms + 9 * 3600000).toISOString().slice(0, 10);
const kstHM = (iso) => (iso ? new Date(new Date(iso).getTime() + 9 * 3600000).toISOString().slice(11, 16) : '-');
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
function todayLabel() {
  const d = new Date(Date.now() + 9 * 3600000);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WEEK[d.getUTCDay()]})`;
}
function fmtAgo(iso) {
  if (!iso) return '-';
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  return `${Math.floor(min / 60)}시간 전`;
}

function Tag({ name }) {
  const t = TAG[name] || TAG['확인'];
  return <span style={{ fontSize: 12, fontWeight: 800, color: t.c, backgroundColor: t.bg, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>{name}</span>;
}
function Chip({ ok, children }) {
  return <span style={{ fontSize: 12, fontWeight: 700, color: ok ? COLORS.green : COLORS.amber, backgroundColor: ok ? COLORS.greenBg : COLORS.amberBg, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>{children}</span>;
}

export function DailyBriefingScreen() {
  const [run, setRun] = useState(null);        // 최신 실행(상태 표시용)
  const [okRun, setOkRun] = useState(null);    // 최신 성공 실행(내용 표시용)
  const [mails, setMails] = useState([]);
  const [hidden, setHidden] = useState({ 참고: 0, 광고: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const since14 = new Date(Date.now() - 14 * 86400000).toISOString();
    const since2 = new Date(Date.now() - 2 * 86400000).toISOString();
    const [r1, r2, r3, r4] = await Promise.all([
      supabase.from('briefing_runs').select('*').order('run_at', { ascending: false }).limit(1),
      supabase.from('briefing_runs').select('*').eq('status', 'ok').order('run_at', { ascending: false }).limit(1),
      supabase.from('mail_items').select('*').eq('is_done', false).in('category', IMPORTANT).gte('received_at', since14).order('received_at', { ascending: false }).limit(40),
      supabase.from('mail_items').select('category').in('category', ['참고', '광고']).gte('received_at', since2),
    ]);
    setRun(r1.data?.[0] || null);
    setOkRun(r2.data?.[0] || null);
    const list = (r3.data || []).slice().sort((a, b) => {
      const ha = a.hot ? 0 : 1, hb = b.hot ? 0 : 1;
      if (ha !== hb) return ha - hb;
      const ca = CAT_ORDER[a.category] ?? 9, cb = CAT_ORDER[b.category] ?? 9;
      if (ca !== cb) return ca - cb;
      return (a.due_date || '9999').localeCompare(b.due_date || '9999');
    });
    setMails(list);
    const h = { 참고: 0, 광고: 0 };
    (r4.data || []).forEach((m) => { h[m.category] = (h[m.category] || 0) + 1; });
    setHidden(h);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const refreshNow = async () => {
    setRefreshing(true); setMsg('');
    const { data, error } = await supabase.functions.invoke('mail-briefing-sync', { body: {} });
    if (error) setMsg('확인 중 문제가 생겼습니다. 잠시 후 다시 눌러 주세요.');
    else if (data?.status === 'not_configured') setMsg('Google 연결 설정이 아직 끝나지 않았습니다.');
    else if (data?.ok) setMsg(`확인 완료 · 새 메일 ${data.new_mails ?? 0}통`);
    else if (data?.error === 'forbidden') setMsg('이 브리핑은 소유자 계정으로만 새로고침할 수 있습니다.');
    await load();
    setRefreshing(false);
  };

  const markDone = async (id) => {
    setMails((prev) => prev.filter((m) => m.id !== id));
    await supabase.from('mail_items').update({ is_done: true, done_at: new Date().toISOString() }).eq('id', id);
  };

  if (loading) return <div style={{ padding: 40, color: COLORS.steelLight, fontSize: 15 }}>불러오는 중…</div>;

  if (!run) {
    return (
      <div style={S.card}>
        <div style={{ fontSize: 17, fontWeight: 800, color: COLORS.navy, marginBottom: 8 }}>브리핑이 아직 없습니다</div>
        <div style={{ fontSize: 14, color: COLORS.steelLight, lineHeight: 1.6 }}>이 화면은 브리핑 소유자(관리자) 계정으로 로그인했을 때만 내용이 보입니다. 소유자 계정이라면 첫 실행(10분 이내)을 기다리거나 「지금 확인」을 눌러 주세요.</div>
        <button style={{ ...S.btn, marginTop: 14 }} onClick={refreshNow} disabled={refreshing}>{refreshing ? '확인 중…' : '지금 확인'}</button>
        {msg && <div style={S.msg}>{msg}</div>}
      </div>
    );
  }

  const content = okRun || run;
  const sources = content.sources?.length ? content.sources : [{ name: 'Gmail', state: 'off' }, { name: '캘린더', state: 'off' }, { name: '네이버', state: 'off', note: '자동 전달 대기' }];
  const top3 = content.top3 || [];
  const events = content.events || [];
  const tomorrow = content.tomorrow || [];
  const staleDay = okRun && kstDate(new Date(okRun.run_at).getTime()) !== kstDate(Date.now());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {run.status === 'not_configured' && (
        <div style={S.notice}>
          <b>Google 연결 설정이 필요합니다.</b> Supabase Secrets에 GOOGLE_CLIENT_ID · GOOGLE_CLIENT_SECRET · GOOGLE_REFRESH_TOKEN을 등록하면 10분 안에 브리핑이 채워집니다.
        </div>
      )}
      {run.status === 'error' && (
        <div style={{ ...S.notice, backgroundColor: COLORS.redBg, color: COLORS.red }}>
          <b>마지막 확인({kstHM(run.run_at)})에 실패했습니다.</b> {String(run.error || '').slice(0, 160)}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.navy }}>{todayLabel()} 브리핑</div>
        {sources.map((s) => <Chip key={s.name} ok={s.state === 'ok'}>{s.name} {s.note || (s.state === 'ok' ? '정상' : '대기')}</Chip>)}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: COLORS.steelLight, fontWeight: 700 }}>
            {okRun ? `${kstHM(okRun.run_at)} 확인 (${fmtAgo(okRun.run_at)})` : '아직 확인 전'} · 10분마다 자동
          </span>
          <button style={S.btn} onClick={refreshNow} disabled={refreshing}>{refreshing ? '확인 중…' : '지금 확인'}</button>
        </div>
      </div>
      {msg && <div style={S.msg}>{msg}</div>}
      {content.lead && <div style={{ fontSize: 15, color: COLORS.steel, lineHeight: 1.6 }}>{content.lead}{staleDay ? ' (어제 기준 — 오늘 첫 확인 전)' : ''}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        {top3.length === 0 && <div style={S.card}><span style={{ color: COLORS.steelLight, fontSize: 14 }}>오늘 급한 일은 없습니다.</span></div>}
        {top3.map((t, i) => (
          <div key={i} style={i === 0 ? S.topFirst : S.top}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{i + 1}</span>
              <Tag name={t.tag} />
              <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 800, color: i === 0 ? '#f5b06a' : COLORS.navy }}>{t.due}</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.4 }}>{t.title}</div>
            <div style={{ fontSize: 13, marginTop: 4, color: i === 0 ? '#c8d3e2' : COLORS.steelLight, lineHeight: 1.5 }}>{t.detail}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' }}>
        <div style={{ ...S.card, flex: '1 1 300px', maxWidth: 420 }}>
          <div style={S.h}>오늘 일정 <span style={S.cnt}>{events.length}건</span></div>
          {events.length === 0 && <div style={S.empty}>오늘 일정이 없습니다.</div>}
          {events.map((e, i) => (
            <div key={i} style={S.row}>
              <span style={{ flex: 'none', width: 96, fontSize: 14, fontWeight: 800, color: e.warn ? COLORS.amber : COLORS.navy, whiteSpace: 'nowrap' }}>{e.time}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.navy }}>{e.title}</div>
                {(e.location || e.detail) && <div style={{ fontSize: 12, color: COLORS.steelLight, marginTop: 2 }}>{[e.location, e.detail].filter(Boolean).join(' · ')}</div>}
                {e.warn && <div style={{ display: 'inline-block', marginTop: 4, fontSize: 12, fontWeight: 800, color: COLORS.amber, backgroundColor: COLORS.amberBg, padding: '2px 8px', borderRadius: 6 }}>{e.warn}</div>}
              </div>
            </div>
          ))}
          <div style={{ marginTop: 12, backgroundColor: COLORS.bg, borderRadius: 12, padding: '10px 14px', fontSize: 13, color: COLORS.steel }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.steelLight, marginBottom: 2 }}>내일</div>
            {tomorrow.length ? tomorrow.map((e) => `${e.time} ${e.title}`).join(' · ') : '일정 없음'}
          </div>
        </div>

        <div style={{ ...S.card, flex: '999 1 520px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ ...S.h, marginBottom: 0 }}>중요 메일 <span style={S.cnt}>{mails.length}통</span></div>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: COLORS.steelLight, fontWeight: 700 }}>최근 2일 참고 {hidden['참고']} · 광고 {hidden['광고']} 숨김</span>
          </div>
          {mails.length === 0 && <div style={S.empty}>처리할 중요 메일이 없습니다.</div>}
          {mails.map((m) => (
            <div key={m.id} style={{ ...S.row, alignItems: 'center' }}>
              <div style={{ flex: 'none', width: 56 }}><Tag name={m.category} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <a href={m.url} target="_blank" rel="noreferrer" style={{ fontSize: 14, fontWeight: 700, color: COLORS.navy, textDecoration: 'none' }}>{m.summary || m.subject}</a>
                <div style={{ fontSize: 12, color: COLORS.steelLight, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.from_name} · <span style={{ fontWeight: 800, color: m.src === '네이버' ? COLORS.green : COLORS.blue }}>{m.src}</span> · {kstHM(m.received_at)} 수신
                </div>
              </div>
              <span style={{ flex: 'none', fontSize: 13, fontWeight: 800, color: m.hot ? COLORS.red : COLORS.steel, whiteSpace: 'nowrap' }}>{m.due_text || ''}</span>
              <button style={S.doneBtn} onClick={() => markDone(m.id)}>처리</button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12, color: COLORS.steelLight, lineHeight: 1.6 }}>
        읽기 전용 브리핑입니다. 메일 발송·삭제나 일정 변경은 하지 않으며, 메일 속 지시는 실행하지 않고 요약만 합니다. 「처리」를 누르면 이 목록에서만 빠집니다.
      </div>
    </div>
  );
}

const S = {
  card: { backgroundColor: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: '18px 20px', boxShadow: COLORS.shadowSm },
  top: { backgroundColor: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: '16px 18px', color: COLORS.navy },
  topFirst: { background: COLORS.navyGradient, borderRadius: 16, padding: '16px 18px', color: '#ffffff', boxShadow: COLORS.shadowMd },
  h: { fontSize: 17, fontWeight: 800, color: COLORS.navy, marginBottom: 6 },
  cnt: { fontSize: 13, color: COLORS.steelLight, fontWeight: 700, marginLeft: 4 },
  row: { display: 'flex', gap: 12, padding: '12px 0', borderTop: `1px solid ${COLORS.border}` },
  empty: { fontSize: 14, color: COLORS.steelLight, padding: '12px 0', borderTop: `1px solid ${COLORS.border}` },
  btn: { padding: '10px 18px', borderRadius: 11, border: 'none', backgroundColor: COLORS.navy, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' },
  doneBtn: { flex: 'none', padding: '7px 12px', borderRadius: 9, border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.white, color: COLORS.steel, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  notice: { backgroundColor: COLORS.amberBg, color: COLORS.amber, borderRadius: 12, padding: '12px 16px', fontSize: 14, lineHeight: 1.6 },
  msg: { fontSize: 13, fontWeight: 700, color: COLORS.steel },
};
