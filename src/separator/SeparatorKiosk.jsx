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
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const kst = new Date(utcMs + 9 * 3600000);
  return kst.toISOString().slice(0, 10);
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
    // 그린ERP 작업목록(list) 기준으로 오늘 슬리터2 중 "작업완료"가 아닌 건만 추려냅니다.
    // (상세 테이블에는 진행상태가 없어서, 이미 끝난 작업이 계속 목록에 남는 문제가 있었습니다.)
    const { data: orders, error: ordersError } = await supabase
      .from('greenp_joborders')
      .select('joborder_no, status')
      .eq('work_type', 'SLITING2')
      .eq('joborder_date', today)
      .neq('status', '작업완료');
    if (ordersError) {
      setLoading(false);
      return;
    }
    const activeNos = (orders || []).map((o) => o.joborder_no);
    if (activeNos.length === 0) {
      setJobs([]);
      setLastSyncAt(new Date());
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('greenp_joborder_detail')
      .select('*')
      .eq('work_type', 'SLITING2')
      .eq('joborder_date', today)
      .in('joborder_no', activeNos)
      .not('process_rule', 'is', null)
      .order('id', { ascending: false })
      .limit(40);
    if (!error) {
      setJobs(data || []);
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
        <span style={styles.topStripText}>슬리터2 세퍼레이터 셋팅 · {staffName || '작업자'}님</span>
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
                <div style={{ ...styles.jobValue, fontSize: '24px' }}>{j.process_rule}</div>
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
        {stationResults.map((st) => (
          <div key={st.key} style={styles.stationCol}>
            <div style={styles.stationColHead}>
              <div style={styles.stationBadge}>{st.key === 1 ? '①' : '②'}</div>
              <div style={styles.stationNameBig}>{st.label}</div>
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
                    {r.width} {st.offset >= 0 ? '+' : '−'} {Math.abs(st.offset)} <span style={styles.eqOp}>=</span> <span style={styles.comboTarget}>{r.target}</span>
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
      backgroundColor: isPlastic ? '#3f8fe0' : '#d7dce4', color: isPlastic ? '#fff' : '#1c2b3f',
      boxShadow: '0 2px 6px rgba(20,30,50,.12)',
    }}>
      {size}
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#eef0f3', display: 'flex', flexDirection: 'column' },
  topStrip: { background: '#14161a', color: '#c3cad8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 26px', fontSize: '16px', fontWeight: 700 },
  topStripText: {},
  logoutBtn: { background: 'rgba(255,255,255,0.08)', color: '#c3cad8', border: '1px solid rgba(255,255,255,0.15)', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' },
  screenPad: { padding: '22px 30px 28px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 },

  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  topBarTitle: { fontSize: '30px', fontWeight: 900, color: '#16283F' },
  syncPill: { background: '#dff7ea', color: '#1c7a4d', fontWeight: 800, fontSize: '18px', padding: '10px 18px', borderRadius: '22px' },
  loadingText: { fontSize: '20px', color: '#8b98ac', padding: '30px 0' },

  jobList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  jobRow: { background: '#fff', borderRadius: '18px', boxShadow: '0 2px 10px rgba(20,30,50,.08)', padding: '22px 30px', display: 'flex', alignItems: 'center', gap: '26px', cursor: 'pointer' },
  jobCol: {},
  jobLabel: { fontSize: '15px', color: '#98a2b3', fontWeight: 700, marginBottom: '4px' },
  jobValue: { fontSize: '30px', fontWeight: 900, color: '#1c2b3f' },
  goArrow: { width: '58px', height: '58px', borderRadius: '50%', background: '#e8830f', color: '#fff', fontSize: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  infoRowSplit3: { display: 'flex', background: '#fff', borderRadius: '16px', boxShadow: '0 2px 10px rgba(20,30,50,.08)', marginBottom: '14px' },
  infoCol: { flex: 1, padding: '14px 24px', textAlign: 'center' },
  infoColBorder: { borderLeft: '2px solid #eef0f3' },
  infoLabel: { fontSize: '19px', color: '#98a2b3', fontWeight: 800, marginBottom: '4px' },
  infoValue: { fontSize: '58px', fontWeight: 900, color: '#1c2b3f', lineHeight: 1.05 },
  infoRowSingle: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: '16px', boxShadow: '0 2px 10px rgba(20,30,50,.08)', padding: '12px 28px', marginBottom: '14px', flex: '0 0 auto' },
  infoLabelInline: { fontSize: '20px', color: '#98a2b3', fontWeight: 800 },
  infoValueInline: { fontSize: '38px', fontWeight: 900, color: '#1c2b3f' },

  stationGrid: { display: 'flex', gap: '16px', flex: 1, minHeight: 0 },
  stationCol: { flex: 1, background: '#fff', borderRadius: '18px', boxShadow: '0 2px 10px rgba(20,30,50,.08)', padding: '16px 22px 20px', display: 'flex', flexDirection: 'column', minHeight: 0 },
  stationColHead: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px', paddingBottom: '10px', borderBottom: '3px solid #eef0f3', flex: '0 0 auto' },
  stationBadge: { width: '60px', height: '60px', borderRadius: '50%', background: '#e8830f', color: '#fff', fontSize: '30px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stationNameBig: { fontSize: '34px', fontWeight: 900, color: '#1c2b3f' },
  stationOffBig: { fontSize: '22px', color: '#98a2b3', fontWeight: 800, marginLeft: 'auto' },
  comboBlock: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#f6f7f9', borderRadius: '16px', padding: '14px 22px', marginBottom: '12px' },
  comboMeta: { fontSize: '16px', fontWeight: 800, color: '#8b98ac', marginBottom: '4px' },
  comboEquation: { fontSize: '34px', fontWeight: 900, color: '#4d5c72', marginBottom: '10px', display: 'flex', alignItems: 'baseline', gap: '10px' },
  eqOp: { color: '#98a2b3' },
  comboTarget: { fontSize: '48px', color: '#e8830f' },
  comboPieces: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  plusSm: { color: '#98a2b3', fontWeight: 900, fontSize: '36px' },
  remainderWarn: { marginTop: '10px', fontSize: '19px', color: '#c8372c', fontWeight: 900 },

  btnFooter: { display: 'flex', gap: '18px', marginTop: '14px', flex: '0 0 auto' },
  btnBig: { flex: 1, textAlign: 'center', padding: '26px', borderRadius: '18px', fontSize: '40px', fontWeight: 900, cursor: 'pointer' },
  btnOutline: { background: '#fff', border: '4px solid #d7dce4', color: '#4d5c72' },
  btnSolid: { background: '#1b2f52', color: '#fff' },
};
