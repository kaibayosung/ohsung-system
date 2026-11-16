// src/separator/SeparatorKiosk.jsx
// 슬리터2 현장 태블릿 전용 화면 (가로형·큰글씨). 로그인 후에는 이 화면만 보이고
// ERP2.0의 다른 메뉴는 노출되지 않습니다 — 태블릿에 그대로 배포하기 위한 용도입니다.
//
// 화면 흐름: ① 작업 선택 (슬리터2 작업지시서 목록, 5분마다 자동 동기화)
//          → ② 셋팅 화면 (가공규격별로 세퍼레이터①·② 셋팅. 규격이 많으면 페이지로 넘김)
//          → "작업 선택으로"를 누르면 중간 확인 없이 바로 ①로 복귀
//
// 2026-11 개편: 소형 가로 태블릿(Lenovo Tab M8 등, CSS 약 853×533)에서도 셋팅값이 크게
//   보이도록 (1) 1280 고정 디자인 축소(FitStage)를 걷어내고 실제 화면에 맞춘 반응형으로,
//   (2) 규격 2개씩 "페이지"로 나눠 번호 탭으로 이동, (3) 낱개(스페이서)를 크기별 고유 색으로
//   칠해 멀리서도 바로 구분되게 했습니다.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { DEFAULT_DENOMS, DEFAULT_STATIONS, computeStationResults } from '../lib/separatorCalc';

const PURPLE = {
  accent: '#6f63c4', accentDark: '#473c8c', panelBg: '#efecfa', chipBg: '#E7E6F4',
  border: '#e3e1f0', text: '#23213a', textMuted: '#7b7797',
};

// 낱개(스페이서) 크기별 고유 색 — 멀리서도 색만 보고 바로 구분. 모두 흰 글씨 대비.
const SPACER_COLOR = {
  100: '#17407a', 90: '#235fa6', 80: '#0f7d94', 70: '#1f9d57', 60: '#5a9e23',
  50: '#d99012', 40: '#dd6b12', 30: '#cf3224', 20: '#b12e74', 10: '#6f3ca0',
  9: '#8a5a2b', 8: '#167a7a', 7: '#3a4a9e', 6: '#b5283f', 5: '#6b7a1f',
  4: '#4a5568', 3: '#8a2e2e', 2: '#2e6a8a', 1: '#5a6270',
};
const spacerColor = (size) => SPACER_COLOR[size] || '#555a66';

const SPECS_PER_PAGE = 2;
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5분
const KIOSK_STATIONS = DEFAULT_STATIONS.filter((s) => s.key === 1 || s.key === 2); // ③은 화면에서 제외
const DENOMS_DESC = [...DEFAULT_DENOMS].sort((a, b) => b - a);

// 가공규격 파서(방어형). 세퍼레이터가 쓸 수 있는 "폭=가닥수"만 추립니다.
//  - 깨끗한 형식:   "67=1", "160=6(회동물산)"  → 폭 67 / 160
//  - 슬리터 형식:   "4X469=150"               → X 뒤의 폭(469)을 사용
//  - 메모/로스:     "로스=24", "한번감음"       → 건너뜀
// 이렇게 해야 "4X469"를 폭 4로 잘못 읽어 엉뚱한 셋팅을 보여주는 문제를 막습니다.
function parseSeparatorRule(rule) {
  if (!rule) return [];
  const out = [];
  rule.split(',').forEach((tok) => {
    const t = tok.trim();
    let m = t.match(/^\d+(?:\.\d+)?\s*[Xx]\s*(\d+(?:\.\d+)?)\s*=\s*(\d+)/); // 두께X폭=수량
    if (!m) m = t.match(/^(\d+(?:\.\d+)?)\s*=\s*(\d+)/);                      // 폭=수량
    if (!m) return;
    const width = parseFloat(m[1]);
    const qty = parseInt(m[2], 10);
    if (Number.isFinite(width) && width > 0 && width < 3000 && Number.isFinite(qty) && qty > 0) {
      out.push({ width, qty });
    }
  });
  return out;
}

function minutesAgoLabel(date) {
  if (!date) return '동기화 전';
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins <= 0) return '방금';
  return `${mins}분 전`;
}

function todayKST() {
  const now = new Date();
  const kstMs = now.getTime() + 9 * 3600000;
  return new Date(kstMs).toISOString().slice(0, 10);
}

export default function SeparatorKiosk({ staffName, onLogout }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [screen, setScreen] = useState('select'); // 'select' | 'setup'
  const [selectedId, setSelectedId] = useState(null);
  const [autoBanner, setAutoBanner] = useState(false);
  const [dismissedAutoIds, setDismissedAutoIds] = useState(() => new Set());
  const [setupPage, setSetupPage] = useState(0);

  const loadJobs = useCallback(async () => {
    const today = todayKST();
    const jobsRes = await supabase
      .from('leveler_jobs')
      .select('id:source_id, company_name, product_name, process_rule, original_weight, status, work_type, work_date, started_at')
      .eq('work_type', 'SLITING2')
      .eq('work_date', today)
      .neq('status', '완료')
      .not('process_rule', 'is', null)
      .order('source_id', { ascending: false })
      .limit(40);
    if (!jobsRes.error) {
      setJobs(jobsRes.data || []);
      setLastSyncAt(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadJobs();
    const syncTimer = setInterval(loadJobs, SYNC_INTERVAL_MS);
    const tickTimer = setInterval(() => setNowTick(Date.now()), 30000);
    return () => { clearInterval(syncTimer); clearInterval(tickTimer); };
  }, [loadJobs]);

  useEffect(() => {
    if (screen !== 'select') return;
    const inProgress = jobs.filter((j) => j.status === '진행중' && j.started_at && !dismissedAutoIds.has(j.id));
    if (inProgress.length === 0) return;
    inProgress.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
    const candidate = inProgress[0];
    setSelectedId(candidate.id);
    setSetupPage(0);
    setScreen('setup');
    setAutoBanner(true);
  }, [jobs, screen, dismissedAutoIds]);

  useEffect(() => {
    if (!autoBanner) return;
    const t = setTimeout(() => setAutoBanner(false), 6000);
    return () => clearTimeout(t);
  }, [autoBanner]);

  const selected = jobs.find((j) => j.id === selectedId) || null;
  const strips = useMemo(() => (selected ? parseSeparatorRule(selected.process_rule) : []), [selected]);
  const stationResults = useMemo(() => computeStationResults(strips, KIOSK_STATIONS, DENOMS_DESC), [strips]);

  const openJob = (id) => { setSelectedId(id); setSetupPage(0); setScreen('setup'); setAutoBanner(false); };
  const backToSelect = () => {
    if (selectedId) setDismissedAutoIds((prev) => new Set(prev).add(selectedId));
    setAutoBanner(false);
    setScreen('select');
    loadJobs();
  };

  return (
    <div style={styles.page}>
      <div style={styles.topStrip}>
        <span>슬리터2 세퍼레이터 셋팅 · {staffName || '작업자'}님</span>
        <button style={styles.logoutBtn} onClick={onLogout}>로그아웃</button>
      </div>

      {screen === 'select' && (
        <SelectScreen jobs={jobs} loading={loading} syncLabel={minutesAgoLabel(lastSyncAt)} onOpen={openJob} nowTick={nowTick} />
      )}
      {screen === 'setup' && selected && (
        <SetupScreen
          job={selected} strips={strips} stationResults={stationResults}
          page={setupPage} setPage={setSetupPage} onBack={backToSelect} autoDetected={autoBanner}
        />
      )}
    </div>
  );
}

function SelectScreen({ jobs, loading, syncLabel, onOpen }) {
  return (
    <div style={styles.screenPad}>
      <div style={styles.topBar}>
        <div style={styles.topBarTitle}>🔧 슬리터2 · 작업 선택</div>
        <div style={styles.syncPill}>🔄 {syncLabel} 동기화</div>
      </div>
      {loading ? (
        <div style={styles.loadingText}>불러오는 중...</div>
      ) : jobs.length === 0 ? (
        <div style={styles.loadingText}>슬리터2 작업지시서가 없습니다.</div>
      ) : (
        <div style={styles.jobList}>
          {jobs.map((j) => (
            <div key={j.id} style={styles.jobRow} onClick={() => onOpen(j.id)}>
              <div style={{ flex: 1.3, minWidth: 0 }}>
                <div style={styles.jobLabel}>코일번호</div>
                <div style={styles.jobValue}>{j.product_name}</div>
              </div>
              <div style={{ flex: 1.1, minWidth: 0 }}>
                <div style={styles.jobLabel}>회사명</div>
                <div style={styles.jobValue}>{j.company_name}</div>
              </div>
              <div style={{ flex: 1.8, minWidth: 0 }}>
                <div style={styles.jobLabel}>가공규격</div>
                <div style={styles.jobRule}>{j.process_rule}</div>
              </div>
              <div style={{ flex: 0.7, minWidth: 0, textAlign: 'right' }}>
                <div style={styles.jobLabel}>중량</div>
                <div style={styles.jobValue}>{Number(j.original_weight || 0).toLocaleString()}</div>
              </div>
              <div style={styles.goArrow}>▶</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Spacer({ size }) {
  return (
    <div style={{ ...styles.spacer, background: spacerColor(size) }}>{size}</div>
  );
}

function StationCol({ station, row, divider }) {
  const flat = row && row.pieces ? row.pieces.flatMap((p) => Array(p.count).fill(p.size)) : [];
  const off = station.offset;
  const sym = station.key === 1 ? '①' : station.key === 2 ? '②' : station.key;
  return (
    <div style={{ ...styles.stc, ...(divider ? styles.stcDivider : {}) }}>
      <div style={styles.sthd}>
        <div style={styles.bdg}>{sym}</div>
        <div style={styles.snm}>세퍼레이터{station.key}</div>
        <div style={styles.off}>{off >= 0 ? '+' : '−'}{Math.abs(off)}</div>
      </div>
      <div style={styles.eq}>
        {row.width} <span style={styles.eqOp}>{off >= 0 ? '＋' : '－'}{Math.abs(off)}</span>
        <span style={styles.eqOp}> = </span>
        <span style={styles.eqTarget}>{row.target}</span>
      </div>
      <div style={styles.pcs}>
        {flat.map((size, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={styles.plusSm}>+</span>}
            <Spacer size={size} />
          </React.Fragment>
        ))}
        {row.remainder > 0 && (
          <span style={styles.warn}>⚠ {row.remainder} 부족</span>
        )}
      </div>
    </div>
  );
}

function Band({ strip, stripIndex, stationResults }) {
  const st1 = stationResults[0];
  const st2 = stationResults[1];
  return (
    <div style={styles.band}>
      <div style={styles.wbox}>
        <div style={styles.wv}>{strip.width}<small style={styles.wvUnit}>mm</small></div>
        <div style={styles.wq}>×{strip.qty}가닥</div>
      </div>
      {st1 && <StationCol station={st1} row={st1.rows[stripIndex]} />}
      {st2 && <StationCol station={st2} row={st2.rows[stripIndex]} divider />}
    </div>
  );
}

function SetupScreen({ job, strips, stationResults, page, setPage, onBack, autoDetected }) {
  const total = Math.max(1, Math.ceil(strips.length / SPECS_PER_PAGE));
  const cur = Math.min(Math.max(0, page), total - 1);
  const start = cur * SPECS_PER_PAGE;
  const pageStrips = strips.slice(start, start + SPECS_PER_PAGE);
  const lo = start + 1;
  const hi = Math.min(start + SPECS_PER_PAGE, strips.length);

  return (
    <div style={styles.setupPad}>
      {autoDetected && (
        <div style={styles.autoBanner}>🔄 슬리팅2 대시보드에서 자동 감지됨 — 이 코일로 자동 전환되었습니다</div>
      )}

      <div style={styles.setHead}>
        <div style={styles.backBtn} onClick={onBack}>← 작업 선택</div>
        <div style={styles.coilInfo}>
          <b style={styles.coilNo}>{job.product_name}</b>
          <span style={styles.coilSub}>{job.company_name} · {Number(job.original_weight || 0).toLocaleString()}kg{strips.length ? ` · 규격 ${strips.length}개` : ''}</span>
        </div>
        {strips.length > 0 && (
          <div style={styles.pageInd}>{strips.length > SPECS_PER_PAGE ? `규격 ${lo}~${hi} · ` : ''}<b style={styles.pageIndNum}>{cur + 1} / {total}</b> 페이지</div>
        )}
        <div style={styles.doneBtn} onClick={onBack}>작업완료</div>
      </div>

      {strips.length === 0 ? (
        <div style={styles.cantRead}>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#c8372c' }}>⚠ 가공규격을 읽을 수 없습니다</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: PURPLE.textMuted, marginTop: '8px' }}>원본: {job.process_rule || '(없음)'}</div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: PURPLE.textMuted, marginTop: '4px' }}>관리자에게 규격 형식을 확인하세요.</div>
        </div>
      ) : (
        <>
          <div style={styles.bands}>
            {pageStrips.map((s, k) => (
              <Band key={start + k} strip={s} stripIndex={start + k} stationResults={stationResults} />
            ))}
          </div>

          <div style={styles.setFoot}>
            <div style={{ ...styles.navBtn, ...(total <= 1 ? styles.navDisabled : {}) }} onClick={() => total > 1 && setPage((cur - 1 + total) % total)}>◀ 이전</div>
            <div style={styles.ptabs}>
              {Array.from({ length: total }).map((_, i) => (
                <div key={i} style={{ ...styles.ptab, ...(i === cur ? styles.ptabOn : {}) }} onClick={() => setPage(i)}>{i + 1}</div>
              ))}
            </div>
            <div style={{ ...styles.navBtn, ...styles.navNext, ...(total <= 1 ? styles.navDisabled : {}) }} onClick={() => total > 1 && setPage((cur + 1) % total)}>다음 ▶</div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  page: { height: '100vh', width: '100vw', background: '#f5f4fb', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Pretendard', -apple-system, sans-serif" },
  topStrip: { background: '#fff', color: PURPLE.text, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 20px', fontSize: '17px', fontWeight: 900, borderBottom: `1px solid ${PURPLE.border}`, flex: '0 0 auto' },
  logoutBtn: { background: '#f1f0f8', color: PURPLE.textMuted, border: `1px solid ${PURPLE.border}`, padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 900, cursor: 'pointer' },

  // ── 작업 선택 ──
  screenPad: { padding: '12px 18px 16px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flex: '0 0 auto' },
  topBarTitle: { fontSize: '26px', fontWeight: 900, color: PURPLE.text },
  syncPill: { background: '#dff7ea', color: '#1c7a4d', fontWeight: 900, fontSize: '15px', padding: '8px 14px', borderRadius: '20px' },
  loadingText: { fontSize: '20px', fontWeight: 900, color: PURPLE.textMuted, padding: '24px 0' },
  jobList: { display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', minHeight: 0 },
  jobRow: { background: '#fff', border: `1px solid ${PURPLE.border}`, borderRadius: '14px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', flex: '0 0 auto' },
  jobLabel: { fontSize: '13px', color: PURPLE.textMuted, fontWeight: 900, marginBottom: '2px' },
  jobValue: { fontSize: '24px', fontWeight: 900, color: PURPLE.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  jobRule: { fontSize: '17px', fontWeight: 900, color: PURPLE.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  goArrow: { width: '44px', height: '44px', borderRadius: '50%', background: PURPLE.accent, color: '#fff', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  // ── 셋팅 (페이지) ──
  setupPad: { padding: '10px 16px 12px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '10px' },
  autoBanner: { background: PURPLE.panelBg, color: PURPLE.accentDark, fontWeight: 900, fontSize: '16px', padding: '9px 16px', borderRadius: '12px', flex: '0 0 auto' },

  setHead: { display: 'flex', alignItems: 'center', gap: '12px', flex: '0 0 auto' },
  backBtn: { background: '#fff', border: `2px solid ${PURPLE.border}`, color: PURPLE.accentDark, borderRadius: '11px', padding: '10px 16px', fontSize: '17px', fontWeight: 900, cursor: 'pointer', flex: '0 0 auto' },
  coilInfo: { display: 'flex', alignItems: 'baseline', gap: '10px', minWidth: 0, flex: 1, flexWrap: 'wrap' },
  coilNo: { fontSize: '22px', fontWeight: 900, color: PURPLE.text },
  coilSub: { fontSize: '15px', fontWeight: 800, color: PURPLE.textMuted },
  pageInd: { fontSize: '15px', fontWeight: 900, color: PURPLE.accentDark, flex: '0 0 auto' },
  pageIndNum: { fontSize: '21px', color: PURPLE.accent },
  doneBtn: { background: PURPLE.accent, color: '#fff', borderRadius: '11px', padding: '10px 20px', fontSize: '18px', fontWeight: 900, cursor: 'pointer', flex: '0 0 auto' },

  bands: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '10px' },
  band: { flex: 1, minHeight: 0, background: '#fff', border: `2px solid ${PURPLE.border}`, borderRadius: '15px', display: 'flex', alignItems: 'stretch', overflow: 'hidden' },
  wbox: { flex: '0 0 112px', background: PURPLE.panelBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: `2px solid ${PURPLE.border}` },
  wv: { fontSize: '36px', fontWeight: 900, color: PURPLE.text, lineHeight: 1 },
  wvUnit: { fontSize: '16px', color: PURPLE.textMuted },
  wq: { fontSize: '15px', fontWeight: 900, color: PURPLE.textMuted, marginTop: '3px' },

  stc: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px 16px', gap: '6px' },
  stcDivider: { borderLeft: `2px dashed ${PURPLE.border}` },
  sthd: { display: 'flex', alignItems: 'center', gap: '8px' },
  bdg: { width: '28px', height: '28px', borderRadius: '50%', background: PURPLE.accent, color: '#fff', fontSize: '15px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  snm: { fontSize: '16px', fontWeight: 900, color: PURPLE.text },
  off: { marginLeft: 'auto', fontSize: '15px', fontWeight: 900, color: '#fff', background: PURPLE.accent, borderRadius: '8px', padding: '2px 11px' },
  eq: { fontSize: '27px', fontWeight: 900, color: PURPLE.text, display: 'flex', alignItems: 'baseline', gap: '6px' },
  eqOp: { color: PURPLE.textMuted, fontSize: '21px' },
  eqTarget: { color: PURPLE.accent, fontSize: '40px' },
  pcs: { display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' },
  spacer: { height: '54px', minWidth: '60px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '31px', fontWeight: 900, color: '#fff', padding: '0 12px', boxShadow: '0 2px 0 rgba(0,0,0,.15)' },
  plusSm: { fontSize: '21px', fontWeight: 900, color: '#9a96ad' },
  warn: { fontSize: '16px', fontWeight: 900, color: '#c8372c', marginLeft: '6px' },

  setFoot: { flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  navBtn: { fontSize: '18px', fontWeight: 900, padding: '11px 18px', borderRadius: '12px', background: '#fff', border: `3px solid ${PURPLE.border}`, color: PURPLE.accentDark, cursor: 'pointer' },
  navNext: {},
  navDisabled: { opacity: 0.35, cursor: 'default' },
  ptabs: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' },
  ptab: { minWidth: '50px', height: '50px', borderRadius: '12px', background: '#fff', border: `3px solid ${PURPLE.border}`, color: PURPLE.accentDark, fontSize: '22px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '0 8px' },
  ptabOn: { background: PURPLE.accent, borderColor: PURPLE.accent, color: '#fff' },

  cantRead: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
};
