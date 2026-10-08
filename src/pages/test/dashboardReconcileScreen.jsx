// src/pages/test/dashboardReconcileScreen.jsx
// ERP 대조 — 그린ERP(미러)와 슬리팅 대시보드(erp_data)를 날짜별로 비교해 "다른 행"만 보여주는 읽기 전용 화면.
//
// 비교는 dashboard-reconcile Edge Function이 서버에서 계산합니다(대시보드 DB는 브라우저에서 직접 읽지 않음).
// 이 화면은 아무것도 수정·삭제하지 않습니다. 제안 문구는 사람이 확인하기 위한 안내일 뿐입니다.
// 그린ERP 미러는 약 10분 주기로 갱신되므로 방금 생긴 작업은 잠시 "차이"로 보일 수 있습니다.
import React, { useState, useEffect, useCallback } from 'react';
import { COLORS, box, pill } from './theme';
import { supabase } from '../../supabaseClient';

const REFRESH_MS = 60000;

const KINDS = {
  diff: { label: '내용 다름', bg: COLORS.amberBg, color: COLORS.amber },
  dup: { label: '중복 의심', bg: COLORS.redBg, color: COLORS.red },
  gone: { label: 'ERP에 없음', bg: COLORS.blueBg, color: COLORS.blue },
  miss: { label: '대시보드에 없음', bg: COLORS.redBg, color: COLORS.red },
};

function todayKST() {
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
}

function fmtKstTime(iso) {
  if (!iso) return '-';
  const kst = new Date(new Date(iso).getTime() + 9 * 3600000);
  return kst.toISOString().slice(11, 19);
}

export function DashboardReconcileScreen() {
  const [date, setDate] = useState(todayKST());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const { data: res, error: fnErr } = await supabase.functions.invoke(`dashboard-reconcile?date=${date}`, { method: 'GET' });
      if (fnErr) throw fnErr;
      if (!res || res.ok === false) throw new Error(res?.error || '대조 결과를 받지 못했습니다.');
      setData(res);
      setError(null);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    setLoading(true);
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const summary = data?.summary;
  const issues = data?.issues || [];
  const counts = summary?.counts || { diff: 0, dup: 0, gone: 0, miss: 0 };
  const shown = filter === 'all' ? issues : issues.filter((i) => i.kind === filter);

  const chip = (key, label, n) => (
    <button
      key={key}
      onClick={() => setFilter(key)}
      style={{
        padding: '8px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
        border: `1.5px solid ${filter === key ? COLORS.accent : COLORS.border}`,
        backgroundColor: filter === key ? '#f3f5fe' : '#fff',
        color: filter === key ? COLORS.accent : COLORS.steel,
      }}
    >
      {label} {n}
    </button>
  );

  return (
    <div style={box.page}>
      <div>
        <h1 style={box.title}>ERP 대조</h1>
        <div style={box.hint}>
          그린ERP 작업지시서와 대시보드 행을 비교해 다른 곳만 보여줍니다 · 읽기 전용 · dashboard-reconcile
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ padding: '8px 10px', fontSize: '15px', borderRadius: '8px', border: `1.5px solid ${COLORS.border}` }}
        />
        <button
          onClick={() => { setLoading(true); load(); }}
          style={{ padding: '8px 14px', fontSize: '14px', fontWeight: 700, borderRadius: '8px', border: `1.5px solid ${COLORS.border}`, backgroundColor: '#fff', cursor: 'pointer' }}
        >
          새로고침
        </button>
        <div style={{ fontSize: '13px', color: COLORS.steelLight }}>
          {data?.mirrorSyncedAt ? `그린ERP 미러 기준 ${fmtKstTime(data.mirrorSyncedAt)}` : ''}
        </div>
      </div>

      {error && (
        <div style={{ ...box.card, borderLeft: `4px solid ${COLORS.red}`, color: COLORS.red, fontSize: '15px' }}>
          조회 실패: {error}
        </div>
      )}

      <div style={box.statGrid}>
        <div style={box.statCard}>
          <div style={box.statLabel}>그린ERP</div>
          <div style={box.statValue}>{summary ? `${summary.erp}건` : '-'}</div>
          <div style={box.hint}>작업지시서</div>
        </div>
        <div style={box.statCard}>
          <div style={box.statLabel}>대시보드</div>
          <div style={box.statValue}>{summary ? `${summary.dashboard}건` : '-'}</div>
          <div style={box.hint}>해당 날짜 행</div>
        </div>
        <div style={{ ...box.statCard, borderLeft: `4px solid ${COLORS.green}` }}>
          <div style={box.statLabel}>일치</div>
          <div style={{ ...box.statValue, color: COLORS.green }}>{summary ? `${summary.matched}건` : '-'}</div>
          <div style={box.hint}>내용까지 같음</div>
        </div>
        <div style={{ ...box.statCard, borderLeft: `4px solid ${summary && summary.issues > 0 ? COLORS.amber : COLORS.accent}` }}>
          <div style={box.statLabel}>확인 필요</div>
          <div style={{ ...box.statValue, color: summary && summary.issues > 0 ? COLORS.amber : COLORS.navy }}>
            {summary ? `${summary.issues}건` : '-'}
          </div>
          <div style={box.hint}>아래 표</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {chip('all', '전체', issues.length)}
        {chip('diff', '내용 다름', counts.diff)}
        {chip('dup', '중복 의심', counts.dup)}
        {chip('gone', 'ERP에 없음', counts.gone)}
        {chip('miss', '대시보드에 없음', counts.miss)}
      </div>

      <div style={box.card}>
        <div style={box.subtitle}>다른 행</div>
        {loading && !data ? (
          <div style={box.loadingText}>불러오는 중...</div>
        ) : shown.length === 0 ? (
          <div style={box.emptyText}>{issues.length === 0 ? '차이가 없습니다. 그린ERP와 대시보드가 일치합니다.' : '이 종류의 차이는 없습니다.'}</div>
        ) : (
          <table style={box.table}>
            <thead>
              <tr>
                <th style={box.th}>구분</th>
                <th style={box.th}>업체 · 작업</th>
                <th style={box.th}>차이 내용</th>
                <th style={box.th}>제안</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((i, idx) => {
                const k = KINDS[i.kind] || KINDS.diff;
                return (
                  <tr key={`${i.kind}-${i.mjunp}-${i.workType}-${idx}`}>
                    <td style={box.td}><span style={pill(k.bg, k.color)}>{k.label}</span></td>
                    <td style={box.td}>
                      {i.company || '-'}
                      <div style={{ ...box.hint, marginTop: '2px' }}>{i.workType}{i.mjunp ? ` · #${i.mjunp}` : ''}</div>
                    </td>
                    <td style={box.td}>
                      {i.detail}
                      {i.dashIds && i.dashIds.length > 0 && (
                        <div style={{ ...box.hint, marginTop: '2px' }}>대시보드 행 {i.dashIds.join(', ')}</div>
                      )}
                    </td>
                    <td style={box.td}>{i.suggestion}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div style={{ ...box.hint, marginTop: '10px' }}>
          읽기 전용입니다. 삭제·수정은 하지 않고 어디가 다른지만 알려줍니다. 방금 생긴 작업은 1~10분 안에 사라질 수 있습니다.
        </div>
      </div>
    </div>
  );
}
