// src/pages/test/customerPortal.jsx
// 고객사 포털(데모) — 거래처가 스스로 미수금/작업현황/출고내역을 조회할 수 있는 셀프서비스 화면 시안
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { COLORS, box, pill, fmtWon, fmtNum } from './theme';

const STATUS_PILL = {
  작업완료: [COLORS.greenBg, COLORS.green],
  작업준비: [COLORS.amberBg, COLORS.amber],
};

function threeMonthsAgoStr() {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().split('T')[0];
}

// ---------- 31 고객사 포털 (데모) ----------
export function CustomerPortal() {
  const [companies, setCompanies] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [receivable, setReceivable] = useState(null);
  const [joborders, setJoborders] = useState(null);
  const [outbound, setOutbound] = useState(null);

  useEffect(() => {
    (async () => {
      const [{ data: j }, { data: o }, { data: r }] = await Promise.all([
        supabase.from('greenp_joborders').select('company_name'),
        supabase.from('greenp_outbound').select('company_name'),
        supabase.from('greenp_receivables').select('company_name'),
      ]);
      const set = new Set();
      [...(j || []), ...(o || []), ...(r || [])].forEach((row) => {
        if (row.company_name) set.add(row.company_name);
      });
      setCompanies([...set].sort((a, b) => a.localeCompare(b, 'ko')));
    })();
  }, []);

  useEffect(() => {
    if (!name) { setReceivable(null); setJoborders(null); setOutbound(null); return; }
    setLoading(true);
    const cutoff = threeMonthsAgoStr();
    (async () => {
      const [{ data: rec }, { data: jo }, { data: out }] = await Promise.all([
        supabase.from('greenp_receivables').select('*').eq('company_name', name).maybeSingle(),
        supabase.from('greenp_joborders').select('*').eq('company_name', name).gte('joborder_date', cutoff).order('joborder_date', { ascending: false }).limit(30),
        supabase.from('greenp_outbound').select('*').eq('company_name', name).gte('outbound_date', cutoff).order('outbound_date', { ascending: false }).limit(30),
      ]);
      setReceivable(rec || null);
      setJoborders(jo || []);
      setOutbound(out || []);
      setLoading(false);
    })();
  }, [name]);

  const totalOutboundWeight = (outbound || []).reduce((s, r) => s + Number(r.weight || 0), 0);

  return (
    <div style={box.page}>
      <div>
        <h2 style={box.title}>고객사 포털</h2>
        <p style={box.hint}>고객사 포털 데모 화면 — 실제 운영 시에는 거래처별 로그인 인증이 필요합니다.</p>
      </div>

      <div style={box.card}>
        <label style={box.label}>거래처 선택 ({companies.length}개사)</label>
        <input
          style={{ ...box.input, maxWidth: '420px' }}
          list="customer-portal-company-list"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="거래처명을 입력하거나 목록에서 선택하세요"
        />
        <datalist id="customer-portal-company-list">
          {companies.map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>

      {!name && <p style={box.emptyText}>거래처를 선택하면 미수금 현황, 진행중인 작업, 출고 내역을 확인할 수 있습니다.</p>}

      {name && loading && <p style={box.loadingText}>불러오는 중...</p>}

      {name && !loading && (
        <>
          <div style={box.statGrid}>
            <div style={box.statCard}>
              <span style={box.statLabel}>미수금액</span>
              <span style={{ ...box.statValue, color: '#dd6b20' }}>{fmtWon(receivable?.amount || 0)}</span>
            </div>
            <div style={box.statCard}>
              <span style={box.statLabel}>총 진행 작업건수</span>
              <span style={box.statValue}>{fmtNum((joborders || []).length)}건</span>
            </div>
            <div style={box.statCard}>
              <span style={box.statLabel}>총 출고건수 (3개월)</span>
              <span style={box.statValue}>{fmtNum((outbound || []).length)}건</span>
            </div>
            <div style={box.statCard}>
              <span style={box.statLabel}>총 출고중량 합계 (3개월)</span>
              <span style={box.statValue}>{fmtNum(totalOutboundWeight)}kg</span>
            </div>
          </div>

          <div style={box.card}>
            <h3 style={box.subtitle}>진행중인 작업 현황</h3>
            {(joborders || []).length === 0 && <p style={box.emptyText}>최근 3개월간 등록된 작업지시가 없습니다.</p>}
            {(joborders || []).length > 0 && (
              <>
                <table style={box.table}>
                  <thead>
                    <tr>
                      <th style={box.th}>작업일자</th>
                      <th style={box.th}>작업지시번호</th>
                      <th style={box.th}>작업구분</th>
                      <th style={box.th}>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {joborders.map((r, i) => {
                      const [bg, color] = STATUS_PILL[r.status] || ['#edf2f7', COLORS.steel];
                      return (
                        <tr key={r.joborder_no || i}>
                          <td style={box.td}>{r.joborder_date}</td>
                          <td style={box.td}>{r.joborder_no}</td>
                          <td style={box.td}>{r.work_type}</td>
                          <td style={box.td}><span style={pill(bg, color)}>{r.status}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {joborders.length >= 30 && <p style={box.hint}>최근 30건만 표시됩니다. 더 많은 이력은 담당자에게 문의하세요.</p>}
              </>
            )}
          </div>

          <div style={box.card}>
            <h3 style={box.subtitle}>최근 출고 내역</h3>
            {(outbound || []).length === 0 && <p style={box.emptyText}>최근 3개월간 출고 내역이 없습니다.</p>}
            {(outbound || []).length > 0 && (
              <>
                <table style={box.table}>
                  <thead>
                    <tr>
                      <th style={box.th}>출고일자</th>
                      <th style={box.th}>품명</th>
                      <th style={box.th}>규격</th>
                      <th style={box.th}>중량</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outbound.map((r, i) => (
                      <tr key={r.outbound_no || i}>
                        <td style={box.td}>{r.outbound_date}</td>
                        <td style={box.td}>{r.product_name}</td>
                        <td style={box.td}>{r.spec}</td>
                        <td style={box.td}>{fmtNum(r.weight)}kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {outbound.length >= 30 && <p style={box.hint}>최근 30건만 표시됩니다. 더 많은 이력은 담당자에게 문의하세요.</p>}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
