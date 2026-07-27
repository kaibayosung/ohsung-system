// src/pages/test/separatorSetup.jsx
// 세퍼레이터 셋팅 계산기 — 현장 태블릿용 신규 화면.
// 업로드된 "세퍼레이저 셋팅 가이드 프로그램.pdf"(손글씨 메모)를 기반으로 만든 계산 엔진입니다.
//
// 슬리터 구조: 언코일러 → 슬리터(칼날) → 세퍼레이터①→ 세퍼레이터②→ 세퍼레이터③ → 리코일러
// 즉 세퍼레이터 1/2/3은 서로 다른 3개의 리코일러가 아니라, 슬리터를 통과한 같은 가닥들이
// 차례로 지나가는 3개 지점(스테이션)입니다. 그래서 세 스테이션 모두 "가공규격"에 있는
// 모든 가닥(예: 138=6, 132=2, 122=1)을 각자 계산하되, 스테이션마다 기계적 보정값이 달라
// 스페이서 조합이 조금씩 달라집니다. 메모에 따르면:
//   세퍼레이터① : 목표폭 = 가닥폭 + 1
//   세퍼레이터② : 목표폭 = 가닥폭 - 25
//   세퍼레이터③ : 목표폭 = 가닥폭 - 25  (②·③은 동일 보정값 → 항상 같은 조합)
// 각 목표폭은 보유 중인 규격(100,90,...,1mm)들의 합으로 분해합니다(가장 큰 규격부터
// 채우는 방식 — 손글씨 예시 "30+30+10+5=75"와 같은 방식). 10mm 이상은 금속 세퍼레이터,
// 10mm 미만은 파란색 플라스틱 스페이서로 사진에서 확인되어 색으로 구분해 표시합니다.
//
// ⚠️ 원본 메모의 "세퍼레이터 종류" 규격표는 100·90·10·9~1만 나열되어 있었지만, 손글씨 계산
// 예시("30+30+10+5=75")를 그대로 재현하려면 30mm 같은 중간 규격이 실제로 있어야 합니다.
// 그래서 10~100mm 전체 십단위 + 1~9mm 낱개를 기본값으로 채워 넣었습니다. 아래 "규격 설정"에서
// 실제 보유 규격/재고 수량과 다르면 반드시 고쳐주세요 — 현장 검증 전까지는 참고용입니다.
import React, { useState, useEffect, useMemo } from 'react';
import { COLORS, box, pill } from './theme';
import { supabase } from '../../supabaseClient';
import { DEFAULT_DENOMS, DEFAULT_COUNTS, DEFAULT_STATIONS, DEFAULT_PLASTIC_THRESHOLD, parseProcessRule, decompose, groupPieces } from '../../lib/separatorCalc';

// 현장 태블릿 키오스크(전용 URL: /separator)는 이 계산 로직을 src/lib/separatorCalc.js로
// 공유해서 사용합니다 — 두 화면이 각자 계산식을 따로 들고 있으면 값이 어긋날 수 있어 하나로 모았습니다.

function Chip({ size, count, plasticThreshold }) {
  const isPlastic = size < plasticThreshold;
  return (
    <div style={{
      padding: '10px 14px', borderRadius: '10px', border: `2px solid ${isPlastic ? COLORS.blue : COLORS.steel}`,
      backgroundColor: isPlastic ? COLORS.blueBg : '#e7eaf0', fontWeight: 800, fontSize: '17px',
      color: isPlastic ? COLORS.blue : '#243040', minWidth: '54px', textAlign: 'center',
    }}>
      {size}{count > 1 ? ` ×${count}` : ''}
    </div>
  );
}

export function SeparatorSetupScreen() {
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [stationKey, setStationKey] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  const [denomRows, setDenomRows] = useState(DEFAULT_DENOMS.map((d) => ({ size: d, count: DEFAULT_COUNTS[d] })));
  const [stations, setStations] = useState(DEFAULT_STATIONS);
  const [plasticThreshold, setPlasticThreshold] = useState(DEFAULT_PLASTIC_THRESHOLD);

  useEffect(() => {
    (async () => {
      setLoadingJobs(true);
      const { data, error } = await supabase
        .from('greenp_joborder_detail')
        .select('*')
        .not('process_rule', 'is', null)
        .order('joborder_date', { ascending: false })
        .limit(60);
      if (!error) setJobs(data || []);
      setLoadingJobs(false);
    })();
  }, []);

  const filteredJobs = jobs.filter((j) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (j.product_name || '').toLowerCase().includes(q) || (j.company_name || '').includes(query.trim());
  });

  const selected = jobs.find((j) => j.id === selectedId) || null;
  const strips = useMemo(() => (selected ? parseProcessRule(selected.process_rule) : []), [selected]);
  const totalQty = strips.reduce((s, x) => s + x.qty, 0);

  const denomsDesc = useMemo(() => [...denomRows].map((r) => r.size).sort((a, b) => b - a), [denomRows]);
  const countsMap = useMemo(() => Object.fromEntries(denomRows.map((r) => [r.size, r.count])), [denomRows]);

  const stationResults = useMemo(() => {
    return stations.map((st) => {
      const rows = strips.map((s) => {
        const target = s.width + st.offset;
        const { pieces, remainder } = decompose(target, denomsDesc);
        return { ...s, target, pieces: groupPieces(pieces), remainder };
      });
      return { ...st, rows };
    });
  }, [strips, stations, denomsDesc]);

  const usageCheck = useMemo(() => {
    const need = {};
    stationResults.forEach((st) => {
      st.rows.forEach((r) => {
        r.pieces.forEach((p) => {
          need[p.size] = (need[p.size] || 0) + p.count * r.qty;
        });
      });
    });
    return Object.entries(need)
      .map(([size, qty]) => ({ size: Number(size), needed: qty, available: countsMap[size] ?? 0 }))
      .sort((a, b) => b.size - a.size);
  }, [stationResults, countsMap]);

  const currentStation = stationResults.find((s) => s.key === stationKey) || stationResults[0];

  const updateDenomRow = (idx, field, value) => {
    setDenomRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: Number(value) || 0 } : r)));
  };
  const removeDenomRow = (idx) => setDenomRows((prev) => prev.filter((_, i) => i !== idx));
  const addDenomRow = () => setDenomRows((prev) => [...prev, { size: 0, count: 0 }]);
  const updateStationOffset = (key, value) => {
    setStations((prev) => prev.map((s) => (s.key === key ? { ...s, offset: Number(value) || 0 } : s)));
  };

  const tabletCard = { backgroundColor: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: '20px', padding: '22px', boxShadow: COLORS.shadow };

  return (
    <div style={box.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={box.title}>
            세퍼레이터 셋팅 계산기
            <span style={{ marginLeft: '10px', verticalAlign: 'middle' }}>
              <span style={pill(COLORS.accentBg, COLORS.accentDark)}>현장 태블릿 · 신규</span>
            </span>
          </h2>
          <p style={box.hint}>작업지시서(가공규격)를 선택하면 세퍼레이터 ①·②·③에 필요한 스페이서 조합을 자동 계산합니다.</p>
        </div>
        <button style={{ ...box.ghostBtn, padding: '11px 18px', fontSize: '15px' }} onClick={() => setShowSettings((v) => !v)}>
          ⚙ 규격·보정값 설정
        </button>
      </div>

      <div style={{
        background: COLORS.accentSoft, border: `1px solid ${COLORS.accentBg}`, borderRadius: '14px',
        padding: '14px 20px', fontSize: '14px', color: COLORS.accentDark, lineHeight: 1.6,
        display: 'flex', gap: '10px', alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: '16px' }}>💡</span>
        <span>세퍼레이터 셋팅 가이드 메모를 바탕으로 자동 계산한 값입니다. 실제 셋팅 전 담당자가 반드시 검증해주세요. 보유 규격·재고·보정값이 다르면 위 "⚙ 규격·보정값 설정"에서 수정할 수 있습니다. 현장 슬리터2 태블릿용 전용 화면은 <a href="/separator" target="_blank" rel="noopener" style={{ color: COLORS.accentDark, fontWeight: 800 }}>/separator</a> 주소로 바로 접속할 수 있습니다 (①·② 두 스테이션만 큰 글씨로 표시).</span>
      </div>

      {showSettings && (
        <div style={box.card}>
          <h3 style={box.subtitle}>규격·보정값 설정</h3>
          <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <label style={box.label}>세퍼레이터별 보정값 (목표폭 = 가닥폭 + 보정값)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                {stations.map((st) => (
                  <div key={st.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '110px', fontSize: '14px', color: COLORS.steel, fontWeight: 700 }}>{st.label}</span>
                    <input type="number" style={{ ...box.input, width: '110px' }} value={st.offset} onChange={(e) => updateStationOffset(st.key, e.target.value)} />
                  </div>
                ))}
              </div>
              <label style={{ ...box.label, marginTop: '18px' }}>플라스틱/금속 구분 기준 (이 값 미만 = 플라스틱)</label>
              <input type="number" style={{ ...box.input, width: '110px' }} value={plasticThreshold} onChange={(e) => setPlasticThreshold(Number(e.target.value) || 0)} />
            </div>
            <div style={{ flex: '2 1 360px' }}>
              <label style={box.label}>보유 규격 · 재고 (mm / 개수)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', maxHeight: '280px', overflowY: 'auto' }}>
                {denomRows.map((r, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="number" style={{ ...box.input, width: '90px' }} value={r.size} onChange={(e) => updateDenomRow(idx, 'size', e.target.value)} placeholder="규격mm" />
                    <span style={{ color: COLORS.steelLight }}>mm ·</span>
                    <input type="number" style={{ ...box.input, width: '90px' }} value={r.count} onChange={(e) => updateDenomRow(idx, 'count', e.target.value)} placeholder="재고" />
                    <span style={{ color: COLORS.steelLight }}>개</span>
                    <button style={{ ...box.ghostBtn, padding: '6px 12px', fontSize: '13px' }} onClick={() => removeDenomRow(idx)}>삭제</button>
                  </div>
                ))}
              </div>
              <button style={{ ...box.ghostBtn, padding: '8px 16px', fontSize: '14px', marginTop: '10px' }} onClick={addDenomRow}>+ 규격 추가</button>
            </div>
          </div>
        </div>
      )}

      <div style={box.card}>
        <h3 style={{ ...box.subtitle, border: 'none', margin: 0, padding: '0 0 12px' }}>작업지시서 선택 (실제 그린ERP 데이터)</h3>
        <input style={{ ...box.input, marginBottom: '12px' }} placeholder="코일ID 또는 거래처로 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
        {loadingJobs ? (
          <p style={box.loadingText}>불러오는 중...</p>
        ) : filteredJobs.length === 0 ? (
          <p style={box.emptyText}>가공규격이 있는 작업지시서가 없습니다.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
            {filteredJobs.map((j) => (
              <div key={j.id} onClick={() => setSelectedId(j.id)} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px',
                borderRadius: '12px', cursor: 'pointer', gap: '10px',
                border: `2px solid ${selectedId === j.id ? COLORS.accent : COLORS.border}`,
                backgroundColor: selectedId === j.id ? COLORS.accentSoft : COLORS.white,
              }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy }}>{j.product_name} <span style={{ fontWeight: 600, color: COLORS.steel, fontSize: '13px' }}>· {j.company_name}</span></div>
                  <div style={{ fontSize: '13px', color: COLORS.steelLight, marginTop: '2px' }}>{j.spec} · {j.work_type} · {j.joborder_date}</div>
                </div>
                <div style={{ fontSize: '13px', color: COLORS.accentDark, fontWeight: 700, whiteSpace: 'nowrap' }}>{j.process_rule}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <>
          <div style={tabletCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: COLORS.navy }}>{selected.product_name} · {selected.company_name}</div>
              <span style={pill(COLORS.blueBg, COLORS.blue)}>총 {totalQty}본</span>
            </div>
            <div style={{ fontSize: '15px', color: COLORS.steel, marginBottom: '14px' }}>{selected.spec} · 원중량 {Number(selected.original_weight || 0).toLocaleString()}kg</div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {strips.map((s, i) => (
                <span key={i} style={pill('#eef2f7', COLORS.steel)}>{s.width}mm × {s.qty}개</span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {stations.map((st) => (
              <div key={st.key} onClick={() => setStationKey(st.key)} style={{
                flex: 1, padding: '20px', borderRadius: '16px', fontSize: '18px', fontWeight: 800, textAlign: 'center',
                cursor: 'pointer', border: `2px solid ${stationKey === st.key ? COLORS.navy : COLORS.border}`,
                backgroundColor: stationKey === st.key ? COLORS.navy : COLORS.white,
                color: stationKey === st.key ? '#fff' : COLORS.steel,
              }}>
                {st.label}
                <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '4px', opacity: 0.85 }}>
                  보정 {st.offset >= 0 ? '+' : ''}{st.offset}mm
                </div>
              </div>
            ))}
          </div>

          {currentStation && (
            <div style={tabletCard}>
              <h3 style={{ ...box.subtitle, border: 'none', margin: 0, padding: '0 0 14px' }}>
                {currentStation.label} · 스페이서 조합
                {stationKey !== 1 && <span style={{ marginLeft: '10px' }}><span style={pill(COLORS.greenBg, COLORS.green)}>②·③ 동일 규격</span></span>}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {currentStation.rows.map((r, i) => (
                  <div key={i} style={{ border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '16px 18px', backgroundColor: COLORS.bg }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: COLORS.navy }}>{r.width}mm <span style={{ color: COLORS.steel, fontWeight: 600 }}>× {r.qty}개</span></div>
                      <div style={{ fontSize: '13px', color: COLORS.steelLight }}>목표폭 {r.width}{currentStation.offset >= 0 ? '+' : ''}{currentStation.offset} = <b style={{ color: COLORS.accentDark }}>{r.target}mm</b></div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {r.pieces.map((p, pi) => (
                        <React.Fragment key={pi}>
                          {pi > 0 && <span style={{ color: COLORS.steelLight, fontWeight: 800 }}>+</span>}
                          <Chip size={p.size} count={p.count} plasticThreshold={plasticThreshold} />
                        </React.Fragment>
                      ))}
                      <span style={{ color: COLORS.steelLight, fontWeight: 800, marginLeft: '4px' }}>= {r.target}mm</span>
                    </div>
                    {r.remainder > 0 && (
                      <div style={{ marginTop: '8px', fontSize: '13px', color: COLORS.red, fontWeight: 700 }}>
                        ⚠ {r.remainder}mm 분해 불가 — 더 작은 규격이 필요합니다 (설정에서 규격 추가)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={box.card}>
            <h3 style={box.subtitle}>규격별 필요 수량 · 재고 확인 (3개 스테이션 합산)</h3>
            <table style={box.table}>
              <thead><tr><th style={box.th}>규격</th><th style={box.th}>필요 수량</th><th style={box.th}>보유 재고</th><th style={box.th}>상태</th></tr></thead>
              <tbody>
                {usageCheck.map((u) => (
                  <tr key={u.size}>
                    <td style={box.td}>{u.size}mm {u.size < plasticThreshold ? '(플라스틱)' : '(금속)'}</td>
                    <td style={box.td}>{u.needed}개</td>
                    <td style={box.td}>{u.available}개</td>
                    <td style={box.td}>
                      {u.needed > u.available
                        ? <span style={pill(COLORS.redBg, COLORS.red)}>부족 {u.needed - u.available}개</span>
                        : <span style={pill(COLORS.greenBg, COLORS.green)}>충분</span>}
                    </td>
                  </tr>
                ))}
                {usageCheck.length === 0 && (
                  <tr><td style={box.td} colSpan={4}><span style={box.emptyText}>계산된 규격이 없습니다.</span></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
