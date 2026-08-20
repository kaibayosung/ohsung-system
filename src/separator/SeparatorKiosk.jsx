// src/separator/SeparatorKiosk.jsx
// 슬리터2 현장 태블릿 전용 화면 (가로형·큰글씨). 로그인 후에는 이 화면만 보이고
// ERP2.0의 다른 메뉴는 노출되지 않습니다 — 태블릿에 그대로 배포하기 위한 용도입니다.
//
// 화면 흐름: ① 작업 선택 (슬리터2 작업지시서 목록, 5분마다 자동 동기화)
//          → ② 셋팅 화면 (가공규격 + 세퍼레이터①·②만 나란히 표시, ③은 ②와 항상 같아 생략)
//          → "작업 선택으로 돌아가기"를 누르면 중간 확인 없이 바로 ①로 복귀
// "작업완료" 버튼은 아직 그린ERP/DB에 상태를 기록하지 않습니다 — 지금은 목록으로 돌아가는
// 용도로만 동작합니다. 실제 작업 상태를 어딘가에 남길지는 추후 결정이 필요합니다.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { DEFAULT_DENOMS, DEFAULT_PLASTIC_THRESHOLD, DEFAULT_STATIONS, parseProcessRule, computeStationResults } from '../lib/separatorCalc';

// 클라이언트가 전달한 디자인 시안(claude.ai/design)에 맞춘 라벤더/퍼플 톤 팔레트.
// 기존 오렌지 포인트 컬러 대신 이 색으로 전체 화면을 통일합니다.
const PURPLE = {
  accent: '#6C5FCF', accentDark: '#5A4FC4', panelBg: '#EEF0FB', chipBg: '#E7E6F4',
  border: '#E6E3F5', text: '#22283A', textMuted: '#8A8FA8',
};

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5분
const KIOSK_STATIONS = DEFAULT_STATIONS.filter((s) => s.key === 1 || s.key === 2); // ③은 화면에서 아예 제외
const DENOMS_DESC = [...DEFAULT_DENOMS].sort((a, b) => b - a);

function minutesAgoLabel(date) {
  if (!date) return '동기화 전';
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins <= 0) return '방금';
  return `${mins}분 전`;
}

// 태블릿 기기의 시스템 시간대 설정과 무관하게 항상 한국시간 기준 "오늘" 날짜를 계산합니다.
// (그린ERP 동기화 자체가 한국 업무시간 기준으로 도는 것과 맞춰야 날짜가 어긋나지 않습니다.)
function todayKST() {
  // now.getTime()은 이미 타임존과 무관한 절대 시각(UTC 기준 epoch ms)이므로,
  // 여기에 getTimezoneOffset()을 더하는 건 이중 보정이 되어 버그였습니다.
  // (기기가 KST(UTC+9)일 때 보정이 서로 상쇄되어 결과적으로 UTC 날짜가 나왔고,
  //  KST 00:00~08:59 사이에는 실제 날짜보다 하루 이전 날짜로 조회되는 문제가 있었습니다.)
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

  const loadJobs = useCallback(async () => {
    const today = todayKST();
    // 그린ERP의 joborder_date는 최초 지시일자로 고정되지만, 현장에서는 "어제 못한 작업을
    // 오늘 날짜로 바꿔서" 레벨러 대시보드(osungsteel.servehttp.com:38080)에서 재작업하는
    // 경우가 있고, 이 날짜 변경은 레벨러 시스템(erp_data.work_date)에만 반영되고 그린ERP에는
    // 반영되지 않습니다. 그래서 그린ERP 기준으로 조회하면 실제로는 작업해야 할 건이 있는데도
    // "오늘 작업 없음"으로 잘못 표시되는 문제가 있었습니다.
    // 이제는 그 날짜 변경까지 반영된 leveler_jobs(레벨러 대시보드 미러, leveler-sync Edge
    // Function이 주기적으로 동기화)를 조회해 실제 현재 상태를 그대로 보여줍니다.
    // 작업자용 키오스크 화면 — 금액은 보여주지 않으므로 작업지시서 목록만 조회합니다.
    const jobsRes = await supabase
      .from('leveler_jobs')
      .select('id:source_id, company_name, product_name, process_rule, original_weight, status, work_type, work_date')
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

  const selected = jobs.find((j) => j.id === selectedId) || null;
  const strips = useMemo(() => (selected ? parseProcessRule(selected.process_rule) : []), [selected]);
  const stationResults = useMemo(() => computeStationResults(strips, KIOSK_STATIONS, DENOMS_DESC), [strips]);

  const openJob = (id) => { setSelectedId(id); setScreen('setup'); };
  const backToSelect = () => { setScreen('select'); loadJobs(); };

  return (
    <div style={styles.page}>
      <div style={styles.topStrip}>
        <div style={styles.topStripLeftGroup}>
          <span style={styles.topStripText}>슬리터2 세퍼레이터 셋팅 · {staffName || '작업자'}님</span>
        </div>
        <button style={styles.logoutBtn} onClick={onLogout}>로그아웃</button>
      </div>

      {screen === 'select' && (
        <SelectScreen jobs={jobs} loading={loading} syncLabel={minutesAgoLabel(lastSyncAt)} onOpen={openJob} nowTick={nowTick} />
      )}
      {screen === 'setup' && selected && (
        <SetupScreen job={selected} strips={strips} stationResults={stationResults} onBack={backToSelect} />
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
              <div style={{ ...styles.jobCol, flex: 1.3 }}>
                <div style={styles.jobLabel}>코일번호</div>
                <div style={styles.jobValue}>{j.product_name}</div>
              </div>
              <div style={{ ...styles.jobCol, flex: 1.2 }}>
                <div style={styles.jobLabel}>회사명</div>
                <div style={styles.jobValue}>{j.company_name}</div>
              </div>
              <div style={{ ...styles.jobCol, flex: 1.8 }}>
                <div style={styles.jobLabel}>가공규격</div>
                <div style={{ ...styles.jobValue, fontSize: '28px' }}>{j.process_rule}</div>
              </div>
              <div style={{ ...styles.jobCol, flex: 0.8, textAlign: 'right' }}>
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

function SetupScreen({ job, strips, stationResults, onBack }) {
  return (
    <div style={styles.screenPad}>
      <div style={styles.infoRowSplit3}>
        <InfoCol label="코일번호" value={job.product_name} />
        <InfoCol label="회사명" value={job.company_name} border />
        <InfoCol label="중량" value={Number(job.original_weight || 0).toLocaleString()} border />
      </div>
      <div style={styles.infoRowSingle}>
        <div style={styles.infoLabelInline}>가공규격</div>
        <div style={styles.infoValueInline}>{job.process_rule}</div>
      </div>

      <div style={styles.stationGrid}>
        <div style={styles.stationCard}>
          {stationResults.map((st, idx) => (
            <div key={st.key} style={{ ...styles.stationCol, ...(idx > 0 ? styles.stationColDivider : {}) }}>
              <div style={styles.stationColHead}>
                <div style={styles.stationBadge}>{st.key}</div>
                <div style={styles.stationNameBig}>세퍼레이터{st.key}</div>
                <div style={styles.stationOffBig}>{st.offset >= 0 ? '+' : ''}{st.offset}</div>
              </div>
              {strips.length === 0 ? (
                <div style={styles.loadingText}>가공규격을 읽을 수 없습니다.</div>
              ) : st.rows.map((r, i) => {
                // 조합에 필요한 낱개 규격 전체를 펼쳐서 보여줍니다 (같은 규격이 2개 필요하면 2개 다 표시).
                const flatPieces = r.pieces.flatMap((p) => Array(p.count).fill(p.size));
                return (
                  <div key={i} style={styles.comboBlock}>
                    <div style={styles.comboMeta}>{r.width}mm × {r.qty}가닥</div>
                    <div style={styles.comboEquation}>
                      {r.width} <span style={styles.eqSign}>{st.offset >= 0 ? '+' : '−'}</span> {Math.abs(st.offset)} <span style={styles.eqOp}>=</span> <span style={styles.comboTarget}>{r.target}</span>
                    </div>
                    <div style={styles.comboPieces}>
                      {flatPieces.map((size, pi) => (
                        <React.Fragment key={pi}>
                          {pi > 0 && <span style={styles.plusSm}>+</span>}
                          <PieceBig size={size} />
                        </React.Fragment>
                      ))}
                    </div>
                    {r.remainder > 0 && (
                      <div style={styles.remainderWarn}>⚠ {r.remainder}mm 부족 — 더 작은 규격 필요</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div style={styles.btnFooter}>
        <div style={{ ...styles.btnBig, ...styles.btnOutline }} onClick={onBack}>작업 선택으로 돌아가기</div>
        <div style={{ ...styles.btnBig, ...styles.btnSolid }} onClick={onBack}>작업완료</div>
      </div>
    </div>
  );
}

function InfoCol({ label, value, border }) {
  return (
    <div style={{ ...styles.infoCol, ...(border ? styles.infoColBorder : {}) }}>
      <div style={styles.infoLabel}>{label}</div>
      <div style={styles.infoValue}>{value}</div>
    </div>
  );
}

function PieceBig({ size }) {
  const isPlastic = size < DEFAULT_PLASTIC_THRESHOLD;
  const width = Math.max(84, 50 + size * 1.05);
  return (
    <div style={{
      height: '104px', minWidth: `${width}px`, borderRadius: '16px', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontWeight: 900, fontSize: '48px', flexShrink: 0, padding: '0 14px',
      backgroundColor: isPlastic ? PURPLE.accent : PURPLE.chipBg, color: isPlastic ? '#fff' : '#1c2b3f',
    }}>
      {size}
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#FAFAFE', display: 'flex', flexDirection: 'column', fontFamily: "'Pretendard', -apple-system, sans-serif" },
  topStrip: { background: '#fff', color: PURPLE.text, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 28px', fontSize: '19px', fontWeight: 900, borderBottom: `1px solid ${PURPLE.border}` },
  topStripLeftGroup: { display: 'flex', alignItems: 'center', gap: '26px', flexWrap: 'wrap' },
  topStripText: {},
  logoutBtn: { background: '#F2F1FA', color: PURPLE.textMuted, border: `1px solid ${PURPLE.border}`, padding: '10px 20px', borderRadius: '8px', fontSize: '16px', fontWeight: 900, cursor: 'pointer' },
  screenPad: { padding: '22px 30px 28px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 },

  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  topBarTitle: { fontSize: '36px', fontWeight: 900, color: PURPLE.text },
  syncPill: { background: '#dff7ea', color: '#1c7a4d', fontWeight: 900, fontSize: '20px', padding: '10px 18px', borderRadius: '22px' },
  loadingText: { fontSize: '24px', fontWeight: 900, color: PURPLE.textMuted, padding: '30px 0' },

  jobList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  jobRow: { background: '#fff', border: `1px solid ${PURPLE.border}`, borderRadius: '18px', padding: '22px 30px', display: 'flex', alignItems: 'center', gap: '26px', cursor: 'pointer' },
  jobCol: {},
  jobLabel: { fontSize: '18px', color: PURPLE.textMuted, fontWeight: 900, marginBottom: '4px' },
  jobValue: { fontSize: '36px', fontWeight: 900, color: PURPLE.text },
  goArrow: { width: '64px', height: '64px', borderRadius: '50%', background: PURPLE.accent, color: '#fff', fontSize: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  infoRowSplit3: { display: 'flex', background: PURPLE.panelBg, borderRadius: '16px', marginBottom: '14px' },
  infoCol: { flex: 1, padding: '14px 24px', textAlign: 'center' },
  infoColBorder: {},
  infoLabel: { fontSize: '22px', color: PURPLE.textMuted, fontWeight: 900, marginBottom: '4px' },
  infoValue: { fontSize: '68px', fontWeight: 900, color: PURPLE.text, lineHeight: 1.05 },
  infoRowSingle: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: `1px solid ${PURPLE.border}`, borderRadius: '16px', padding: '12px 28px', marginBottom: '14px', flex: '0 0 auto' },
  infoLabelInline: { fontSize: '24px', color: PURPLE.textMuted, fontWeight: 900 },
  infoValueInline: { fontSize: '46px', fontWeight: 900, color: PURPLE.text },

  stationGrid: { display: 'flex', gap: '16px', flex: 1, minHeight: 0 },
  stationCard: { flex: 1, minHeight: 0, display: 'flex', background: '#fff', border: `2px solid ${PURPLE.border}`, borderRadius: '20px' },
  stationCol: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '18px 26px 20px' },
  stationColDivider: { borderLeft: `2px solid ${PURPLE.border}` },
  stationColHead: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px', paddingBottom: '10px', borderBottom: `2px solid ${PURPLE.border}`, flex: '0 0 auto' },
  stationBadge: { width: '58px', height: '58px', borderRadius: '50%', background: PURPLE.panelBg, color: PURPLE.accentDark, fontSize: '30px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stationNameBig: { fontSize: '40px', fontWeight: 900, color: PURPLE.text },
  stationOffBig: { fontSize: '30px', color: PURPLE.accent, fontWeight: 900, marginLeft: 'auto' },
  comboBlock: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px 0' },
  comboMeta: { fontSize: '36px', fontWeight: 900, color: PURPLE.textMuted, marginBottom: '6px' },
  comboEquation: { fontSize: '44px', fontWeight: 900, color: PURPLE.text, marginBottom: '12px', display: 'flex', alignItems: 'baseline', gap: '10px' },
  eqSign: { color: PURPLE.text },
  eqOp: { color: PURPLE.textMuted },
  comboTarget: { fontSize: '56px', color: PURPLE.accent },
  comboPieces: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  plusSm: { color: PURPLE.textMuted, fontWeight: 900, fontSize: '40px' },
  remainderWarn: { marginTop: '10px', fontSize: '22px', color: '#c8372c', fontWeight: 900 },

  btnFooter: { display: 'flex', gap: '18px', marginTop: '14px', flex: '0 0 auto' },
  btnBig: { flex: 1, textAlign: 'center', padding: '28px', borderRadius: '18px', fontSize: '46px', fontWeight: 900, cursor: 'pointer' },
  btnOutline: { background: '#fff', border: `4px solid ${PURPLE.border}`, color: PURPLE.accentDark },
  btnSolid: { background: PURPLE.accent, color: '#fff' },
};
