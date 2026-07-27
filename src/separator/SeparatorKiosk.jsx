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
    const { data, error } = await supabase
      .from('greenp_joborder_detail')
      .select('*')
      .eq('work_type', 'SLITING2')
      .eq('joborder_date', todayKST())
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
            ) : st.rows.map((r, i) => (
              <div key={i} style={styles.comboBlock}>
                <div style={styles.comboQty}>{r.width}mm × {r.qty}</div>
                <div style={styles.comboPieces}>
                  {r.pieces.map((p, pi) => (
                    <React.Fragment key={pi}>
                      {pi > 0 && <span style={styles.plusSm}>+</span>}
                      <PieceBig size={p.size} />
                    </React.Fragment>
                  ))}
                </div>
                {r.remainder > 0 && (
                  <div style={styles.remainderWarn}>⚠ {r.remainder}mm 부족 — 더 작은 규격 필요</div>
                )}
              </div>
            ))}
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
  const width = Math.max(30, 22 + size * 0.5);
  return (
    <div style={{
      height: '42px', minWidth: `${width}px`, borderRadius: '8px', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontWeight: 900, fontSize: '18px', flexShrink: 0, padding: '0 6px',
      backgroundColor: isPlastic ? '#3f8fe0' : '#d7dce4', color: isPlastic ? '#fff' : '#1c2b3f',
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
  screenPad: { padding: '26px 32px 34px', flex: 1 },

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

  infoRowSplit3: { display: 'flex', background: '#fff', borderRadius: '16px', boxShadow: '0 2px 10px rgba(20,30,50,.08)', marginBottom: '16px' },
  infoCol: { flex: 1, padding: '22px 28px', textAlign: 'center' },
  infoColBorder: { borderLeft: '2px solid #eef0f3' },
  infoLabel: { fontSize: '17px', color: '#98a2b3', fontWeight: 700, marginBottom: '8px' },
  infoValue: { fontSize: '40px', fontWeight: 900, color: '#1c2b3f' },
  infoRowSingle: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: '16px', boxShadow: '0 2px 10px rgba(20,30,50,.08)', padding: '20px 30px', marginBottom: '18px' },
  infoLabelInline: { fontSize: '19px', color: '#98a2b3', fontWeight: 700 },
  infoValueInline: { fontSize: '32px', fontWeight: 900, color: '#1c2b3f' },

  stationGrid: { display: 'flex', gap: '18px' },
  stationCol: { flex: 1, background: '#fff', borderRadius: '18px', boxShadow: '0 2px 10px rgba(20,30,50,.08)', padding: '20px 22px 24px' },
  stationColHead: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', paddingBottom: '14px', borderBottom: '2px solid #eef0f3' },
  stationBadge: { width: '50px', height: '50px', borderRadius: '50%', background: '#e8830f', color: '#fff', fontSize: '24px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  stationNameBig: { fontSize: '24px', fontWeight: 900, color: '#1c2b3f' },
  stationOffBig: { fontSize: '17px', color: '#98a2b3', fontWeight: 800, marginLeft: 'auto' },
  comboBlock: { background: '#f6f7f9', borderRadius: '14px', padding: '16px 18px', marginBottom: '12px' },
  comboQty: { fontSize: '20px', fontWeight: 900, color: '#e8830f', marginBottom: '10px' },
  comboPieces: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' },
  plusSm: { color: '#98a2b3', fontWeight: 900, fontSize: '18px' },
  remainderWarn: { marginTop: '8px', fontSize: '15px', color: '#c8372c', fontWeight: 800 },

  btnFooter: { display: 'flex', gap: '18px', marginTop: '22px' },
  btnBig: { flex: 1, textAlign: 'center', padding: '28px', borderRadius: '18px', fontSize: '32px', fontWeight: 900, cursor: 'pointer' },
  btnOutline: { background: '#fff', border: '3px solid #d7dce4', color: '#4d5c72' },
  btnSolid: { background: '#1b2f52', color: '#fff' },
};
