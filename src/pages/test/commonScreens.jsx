// src/pages/test/commonScreens.jsx
// 공통(COMMON) 화면 4종: 로그인·팀 홈 런처 / 알림 센터 / 전역 검색 / 관리자 설정
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { COLORS, box, pill, teamBadgeColors, fmtWon } from './theme';

// ---------- 27 로그인 · 팀 홈 런처 ----------
export function LoginHomeLauncher({ onSelectTeam }) {
  const teams = ['경영', '영업/현장', '생산', '경리/재무'];
  return (
    <div style={box.page}>
      <h2 style={box.title}>팀을 선택하세요</h2>
      <p style={box.hint}>로그인 후 소속 팀에 맞는 홈 화면으로 자동 이동합니다. 아래에서 팀을 선택하면 해당 팀의 서브 메뉴로 바로 이동합니다.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px', maxWidth: '640px' }}>
        {teams.map((t) => {
          const c = teamBadgeColors[t];
          return (
            <button key={t} onClick={() => onSelectTeam && onSelectTeam(t)} style={{ background: c.bg, border: 'none', borderRadius: '16px', padding: '32px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: c.color }}>{t}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- 28 알림 센터 ----------
export function NotificationCenter() {
  const [rows, setRows] = useState(null);
  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(30);
    setRows(data || []);
  };
  const markRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    load();
  };
  if (!rows) return <p style={box.loadingText}>불러오는 중...</p>;
  const typeColor = { 결재요청: [COLORS.amberBg, COLORS.amber], 동기화실패: [COLORS.redBg, COLORS.red], 재고알림: [COLORS.blueBg, COLORS.blue] };
  const unread = rows.filter((r) => !r.is_read).length;

  return (
    <div style={box.page}>
      <h2 style={box.title}>알림 센터 · 읽지 않음 {unread}건</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {rows.length === 0 && <p style={box.emptyText}>알림이 없습니다.</p>}
        {rows.map((r) => {
          const [bg, color] = typeColor[r.type] || ['#edf2f7', COLORS.steel];
          return (
            <div key={r.id} onClick={() => markRead(r.id)} style={{ ...box.card, cursor: 'pointer', opacity: r.is_read ? 0.55 : 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={pill(bg, color)}>{r.type}</span>
              <span style={{ fontSize: '16px', color: '#2d3748' }}>{r.message}</span>
              <span style={{ fontSize: '12px', color: COLORS.steelLight }}>{new Date(r.created_at).toLocaleString('ko-KR')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- 29 전역 검색 ----------
export function GlobalSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const run = async () => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    const [{ data: companies }, { data: orders }, { data: sales }] = await Promise.all([
      supabase.from('companies').select('name, type').ilike('name', `%${q}%`).limit(5),
      supabase.from('work_orders').select('id, customer_name, work_type, status').ilike('customer_name', `%${q}%`).limit(5),
      supabase.from('sales_records').select('id, customer_name, total_price, work_date').ilike('customer_name', `%${q}%`).order('work_date', { ascending: false }).limit(5),
    ]);
    const merged = [
      ...(companies || []).map((c) => ({ type: '거래처', label: c.name, desc: c.type })),
      ...(orders || []).map((o) => ({ type: '작업지시', label: `#${o.id}`, desc: `${o.customer_name} · ${o.work_type} · ${o.status}` })),
      ...(sales || []).map((s) => ({ type: '전표', label: `#${s.id}`, desc: `${s.customer_name} · ${fmtWon(s.total_price)} · ${s.work_date}` })),
    ];
    setResults(merged);
    setSearching(false);
  };

  return (
    <div style={box.page}>
      <h2 style={box.title}>전역 검색</h2>
      <div style={{ display: 'flex', gap: '10px', maxWidth: '520px' }}>
        <input style={box.input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} placeholder="거래처/작업지시/전표 검색" />
        <button style={box.primaryBtn} onClick={run} disabled={searching}>검색</button>
      </div>
      <div style={box.card}>
        {results.length === 0 && <p style={box.emptyText}>{q ? '검색 결과가 없습니다.' : '검색어를 입력하세요.'}</p>}
        <table style={box.table}>
          <thead><tr><th style={box.th}>유형</th><th style={box.th}>결과</th><th style={box.th}>설명</th></tr></thead>
          <tbody>{results.map((r, i) => <tr key={i}><td style={box.td}>{r.type}</td><td style={box.td}>{r.label}</td><td style={box.td}>{r.desc}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- 30 관리자 설정 ----------
export function AdminSettings() {
  const [session, setSession] = useState(null);
  const [subs, setSubs] = useState([]);
  const [avgIntervalMin, setAvgIntervalMin] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    supabase.from('report_subscriptions').select('*').eq('is_active', true).then(({ data }) => setSubs(data || []));
    supabase.from('greenp_sync_logs').select('synced_at').order('synced_at', { ascending: false }).limit(10).then(({ data }) => {
      if (!data || data.length < 2) return;
      const diffs = [];
      for (let i = 0; i < data.length - 1; i++) diffs.push(Math.abs(new Date(data[i].synced_at) - new Date(data[i + 1].synced_at)) / 60000);
      setAvgIntervalMin(Math.round(diffs.reduce((s, v) => s + v, 0) / diffs.length));
    });
  }, []);

  return (
    <div style={box.page}>
      <h2 style={box.title}>관리자 설정 (팀 · 권한)</h2>
      <div style={box.card}>
        <h3 style={box.subtitle}>현재 로그인 관리자</h3>
        <p style={{ fontSize: '17px', color: '#2d3748' }}>{session?.user?.email || '로그인 정보 없음'}</p>
      </div>
      <div style={box.card}>
        <h3 style={box.subtitle}>그린피 동기화 · 리포트 발송 설정</h3>
        <p style={{ fontSize: '16px', color: COLORS.steel, lineHeight: 2 }}>
          평균 동기화 주기: {avgIntervalMin !== null ? `약 ${avgIntervalMin}분 (최근 로그 기준 실측)` : '데이터 부족'}<br />
          활성 리포트 구독: {subs.length}건 ("경영 · 06 리포트 구독 설정" 화면에서 관리)
        </p>
      </div>
      <p style={box.hint}>사용자별 화면 접근 권한 관리는 Supabase Auth 역할(role) 체계와 연동이 필요하며, 현재는 로그인 계정 단위로 전체 화면에 접근 가능합니다.</p>
    </div>
  );
}
