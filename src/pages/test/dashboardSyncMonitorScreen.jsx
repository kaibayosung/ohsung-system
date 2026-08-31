// src/pages/test/dashboardSyncMonitorScreen.jsx
// 그린ERP → 슬리팅 대시보드(osungsteel.servehttp.com:38080) 자동연동 모니터링.
//
// auto_work_order.py(Selenium RPA)를 대체하는 dashboard-instant-sync Edge Function이
// 업무시간(KST 08:00~17:00) 동안 pg_cron으로 1분마다 실행되며, 실행할 때마다
// public.dashboard_sync_runs(실행 이력)와 public.dashboard_sync_log(등록 내역, mjunp+mdate로
// 중복방지)에 기록을 남깁니다. 이 화면은 그 두 테이블을 읽기만 해서 "지금 잘 돌고 있는지"를 보여줍니다.
//
// 15초 간격으로 자동 새로고침합니다. 실제 동기화 자체는 이 화면과 무관하게 Supabase 쪽에서
// 독립적으로 계속 돕니다 — 이 화면을 안 열어도 동기화는 그대로 돕니다.
import React, { useState, useEffect, useCallback } from 'react';
import { COLORS, box, pill } from './theme';
import { supabase } from '../../supabaseClient';

const REFRESH_MS = 15000;
const BUSINESS_START_MIN = 8 * 60; // KST 08:00
const BUSINESS_END_MIN = 17 * 60; // KST 17:00

function nowKST() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 3600000);
}

function fmtTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 3600000);
  return kst.toISOString().slice(11, 19);
}

function fmtAgo(iso) {
  if (!iso) return '-';
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  return `${hr}시간 전`;
}

function secondsToNextMinute() {
  const kst = nowKST();
  return 60 - kst.getUTCSeconds();
}

function isBusinessHoursNow() {
  const kst = nowKST();
  const mins = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  return mins >= BUSINESS_START_MIN && mins <= BUSINESS_END_MIN;
}

export function DashboardSyncMonitorScreen() {
  const [runs, setRuns] = useState([]);
  const [syncLog, setSyncLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshedAt, setRefreshedAt] = useState(null);

  const load = useCallback(async () => {
    try {
      const [runsRes, logRes] = await Promise.all([
        supabase.from('dashboard_sync_runs').select('*').order('run_at', { ascending: false }).limit(20),
        supabase.from('dashboard_sync_log').select('*').order('synced_at', { ascending: false }).limit(30),
      ]);
      if (runsRes.error) throw runsRes.error;
      if (logRes.error) throw logRes.error;
      setRuns(runsRes.data || []);
      setSyncLog(logRes.data || []);
      setError(null);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
      setRefreshedAt(new Date());
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const lastRun = runs[0] || null;
  const lastRunAgoSec = lastRun ? Math.floor((Date.now() - new Date(lastRun.run_at).getTime()) / 1000) : null;
  const businessHours = isBusinessHoursNow();

  let statusLabel = '확인 중';
  let statusColor = COLORS.steelLight;
  let statusBg = '#eef1f6';
  if (!loading) {
    if (!businessHours) {
      statusLabel = '업무시간 외 (08:00~17:00에 재개)';
      statusColor = COLORS.steel;
      statusBg = '#eef1f6';
    } else if (!lastRun) {
      statusLabel = '실행 기록 없음';
      statusColor = COLORS.red;
      statusBg = COLORS.redBg;
    } else if (!lastRun.ok) {
      statusLabel = '마지막 실행 실패';
      statusColor = COLORS.red;
      statusBg = COLORS.redBg;
    } else if (lastRunAgoSec !== null && lastRunAgoSec > 180) {
      statusLabel = '실행 지연 (3분 이상 갱신 없음)';
      statusColor = COLORS.amber;
      statusBg = COLORS.amberBg;
    } else {
      statusLabel = '정상 작동중';
      statusColor = COLORS.green;
      statusBg = COLORS.greenBg;
    }
  }

  const today = (() => {
    const kst = nowKST();
    return kst.toISOString().slice(0, 10);
  })();
  const todayRuns = runs.filter((r) => r.date === today);
  const todayHeaderCount = todayRuns[0]?.header_count ?? 0;
  const todayLog = syncLog.filter((r) => r.mdate === today);
  const todayAutoCount = todayLog.filter((r) => !r.seeded).length;
  const todayBaselineCount = todayLog.filter((r) => r.seeded).length;
  const errorCount24h = runs.filter((r) => !r.ok).length;

  return (
    <div style={box.page}>
      <div>
        <h1 style={box.title}>그린ERP → 대시보드 자동연동 모니터링</h1>
        <div style={box.hint}>auto_work_order.py(RPA) 대체 · dashboard-instant-sync (Supabase Edge Function, 업무시간 1분 간격)</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={pill(statusBg, statusColor)}>
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: statusColor, marginRight: '8px', display: 'inline-block' }} />
          {statusLabel}
        </div>
        <div style={{ fontSize: '14px', color: COLORS.steelLight }}>
          {refreshedAt ? `화면 새로고침: ${fmtAgo(refreshedAt.toISOString())}` : ''}
          {businessHours && ` · 다음 실행 약 ${secondsToNextMinute()}초 후`}
        </div>
      </div>

      {error && (
        <div style={{ ...box.card, borderLeft: `4px solid ${COLORS.red}`, color: COLORS.red, fontSize: '15px' }}>
          조회 실패: {error}
        </div>
      )}

      <div style={box.statGrid}>
        <div style={box.statCard}>
          <div style={box.statLabel}>마지막 실행</div>
          <div style={box.statValue}>{lastRun ? fmtAgo(lastRun.run_at) : '-'}</div>
          <div style={box.hint}>{lastRun ? fmtTime(lastRun.run_at) : ''}</div>
        </div>
        <div style={box.statCard}>
          <div style={box.statLabel}>오늘 작업지시서</div>
          <div style={box.statValue}>{todayHeaderCount}건</div>
          <div style={box.hint}>그린ERP 등록 기준</div>
        </div>
        <div style={box.statCard}>
          <div style={box.statLabel}>자동 등록</div>
          <div style={box.statValue}>{todayAutoCount}건</div>
          <div style={box.hint}>기존(컷오버 전) {todayBaselineCount}건 별도</div>
        </div>
        <div style={{ ...box.statCard, borderLeft: `4px solid ${errorCount24h > 0 ? COLORS.red : COLORS.accent}` }}>
          <div style={box.statLabel}>오류</div>
          <div style={{ ...box.statValue, color: errorCount24h > 0 ? COLORS.red : COLORS.navy }}>{errorCount24h}건</div>
          <div style={box.hint}>최근 실행 {runs.length}회 중</div>
        </div>
      </div>

      <div style={box.card}>
        <div style={box.subtitle}>최근 실행 기록</div>
        {loading ? (
          <div style={box.loadingText}>불러오는 중...</div>
        ) : runs.length === 0 ? (
          <div style={box.emptyText}>실행 기록이 없습니다.</div>
        ) : (
          <table style={box.table}>
            <thead>
              <tr>
                <th style={box.th}>시각</th>
                <th style={box.th}>전체</th>
                <th style={box.th}>신규</th>
                <th style={box.th}>스킵</th>
                <th style={box.th}>등록</th>
                <th style={box.th}>소요</th>
                <th style={box.th}>상태</th>
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 12).map((r) => (
                <tr key={r.id}>
                  <td style={box.td}>{fmtTime(r.run_at)}</td>
                  <td style={box.td}>{r.header_count ?? '-'}</td>
                  <td style={box.td}>{r.new_count ?? '-'}</td>
                  <td style={box.td}>{r.skipped_count ?? '-'}</td>
                  <td style={box.td}>{r.committed_count ?? '-'}</td>
                  <td style={{ ...box.td, color: COLORS.steelLight }}>{r.timings?.totalMs ? `${(r.timings.totalMs / 1000).toFixed(1)}초` : '-'}</td>
                  <td style={box.td}>
                    {r.ok ? (
                      <span style={pill(COLORS.greenBg, COLORS.green)}>성공</span>
                    ) : (
                      <span style={pill(COLORS.redBg, COLORS.red)} title={r.error || ''}>실패</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={box.card}>
        <div style={box.subtitle}>오늘 대시보드에 등록된 작업지시서</div>
        {loading ? (
          <div style={box.loadingText}>불러오는 중...</div>
        ) : todayLog.length === 0 ? (
          <div style={box.emptyText}>오늘 등록된 작업지시서가 없습니다.</div>
        ) : (
          <table style={box.table}>
            <thead>
              <tr>
                <th style={box.th}>시각</th>
                <th style={box.th}>업체명</th>
                <th style={box.th}>품명</th>
                <th style={box.th}>그린ERP#</th>
                <th style={box.th}>경로</th>
              </tr>
            </thead>
            <tbody>
              {todayLog.slice(0, 20).map((r) => (
                <tr key={`${r.mjunp}-${r.mdate}`}>
                  <td style={box.td}>{fmtTime(r.synced_at)}</td>
                  <td style={box.td}>{r.company_name || '-'}</td>
                  <td style={box.td}>{r.product_name || '-'}</td>
                  <td style={box.td}>#{r.mjunp}</td>
                  <td style={box.td}>
                    {r.seeded ? (
                      <span style={pill(COLORS.amberBg, COLORS.amber)}>기존(RPA)</span>
                    ) : (
                      <span style={pill(COLORS.greenBg, COLORS.green)}>자동등록</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
