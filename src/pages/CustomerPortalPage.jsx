// src/pages/CustomerPortalPage.jsx
// 오성철강 스마트 ERP 2.0 — 고객사 포털 (독립 메뉴)
// 내부 직원용 "영업 워크플로우" 5역할 탭과 분리된, 고객사 전용 화면입니다.
// 사용법: 거래처 선택 + 날짜 선택만으로 재고/작업내역/출고내역을 조회합니다.
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

/* ---------------- 컬러/스타일 토큰 (SalesWorkflowPage와 동일 팔레트) ---------------- */
const C = {
  surface0: '#EEF1F6', surface1: '#F4F6FA', surface2: '#FFFFFF',
  border: '#E3E8F0', borderStrong: '#C9D2E0',
  textPrimary: '#0F1E33', textSecondary: '#4D5C72', textMuted: '#8592A6',
  accent: '#E8830F', onAccent: '#FFFFFF', bgAccent: '#FDECD6', textAccent: '#C46B06', borderAccent: '#E8830F',
  textSuccess: '#1C7A4D', bgSuccess: '#E2F5EA',
  textWarning: '#A3610A', bgWarning: '#FBEDD2', borderWarning: '#C98A1B',
  textDanger: '#C8372C', bgDanger: '#FBE6E4', borderDanger: '#C8372C',
  navyGradient: 'linear-gradient(160deg, #16283f 0%, #0a1524 100%)',
};

const inputStyle = { height: '48px', padding: '0 12px', border: `1.5px solid ${C.borderStrong}`, borderRadius: '9px', fontSize: '18px', fontFamily: 'inherit', background: C.surface2, color: C.textPrimary, width: '100%', boxSizing: 'border-box' };
const btnStyle = (active) => ({ fontSize: '17px', padding: '10px 16px', borderRadius: '12px', border: `1.5px solid ${active ? C.accent : C.borderStrong}`, background: active ? C.accent : C.surface2, color: active ? C.onAccent : C.textPrimary, cursor: 'pointer', fontWeight: active ? 800 : 600, fontFamily: 'inherit' });
const boxMsg = (text, extra) => <div style={{ background: C.surface1, border: `1px solid ${C.border}`, borderRadius: '8px', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', fontSize: '17px', color: C.textMuted, padding: '10px 14px', ...extra }}>{text}</div>;
const itemsTable = { width: '100%', borderCollapse: 'collapse', background: C.surface2, borderRadius: '8px', overflow: 'hidden' };
const th = { padding: '11px 10px', fontSize: '15px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, background: C.surface1, color: C.textSecondary, fontWeight: 700 };
const td = { padding: '10px 10px', fontSize: '17px', textAlign: 'left', borderBottom: `1px solid ${C.border}` };
function statCard(label, val, color) {
  return (
    <div style={{ background: C.surface1, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(15,30,51,0.05)' }}>
      <div style={{ fontSize: '15px', color: C.textMuted, marginBottom: '5px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 800, color: color || C.textPrimary }}>{val}</div>
    </div>
  );
}

const WORK_TYPE_GROUPS = [
  { key: 'SLITING', label: '슬리팅1' },
  { key: 'SLITING2', label: '슬리팅2' },
  { key: 'LEVELLING', label: '레벨링' },
];
const CP_SUBS = [['inventory', '📦 재고 현황'], ['work', '🛠 작업 내역'], ['outbound', '🚚 출고 내역'], ['place', '📝 발주하기']];

function kstDateStr(d) { return new Date(d).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }); }
function todayStr() { return kstDateStr(new Date()); }

export default function CustomerPortalPage() {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [sub, setSub] = useState('inventory');
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [form, setForm] = useState({ thick: '', width: '', weight: '', qty: '', slit: '' });
  const company = companies.find((c) => c.id === companyId);

  useEffect(() => {
    supabase.from('companies').select('*').order('name', { ascending: true }).then(({ data }) => {
      setCompanies(data || []);
      if (data && data[0]) setCompanyId((prev) => prev || data[0].id);
    });
  }, []);

  // ---- 1) 재고 현황 (greenp_inventory 실데이터 — 항상 현재 시점 기준) ----
  const [inv, setInv] = useState([]);
  const [invLoading, setInvLoading] = useState(false);
  const [invQuery, setInvQuery] = useState('');
  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    setInvLoading(true);
    supabase.from('greenp_inventory').select('*').eq('customer_name', company.name).order('received_date', { ascending: false })
      .then(({ data }) => { if (!cancelled) { setInv(data || []); setInvLoading(false); } });
    return () => { cancelled = true; };
  }, [company?.name]);
  const invFiltered = inv.filter((r) => !invQuery || (r.product_name || '').includes(invQuery) || (r.spec || '').includes(invQuery));
  const invTotalWeight = inv.reduce((s, r) => s + Number(r.remaining_weight || 0), 0);
  const invSpecCount = new Set(inv.map((r) => r.spec).filter(Boolean)).size;
  const byThickness = {};
  inv.forEach((r) => {
    const m = (r.spec || '').match(/^([0-9.]+)/);
    const key = m ? m[1] + 'T' : '기타';
    if (!byThickness[key]) byThickness[key] = { count: 0, weight: 0 };
    byThickness[key].count += 1;
    byThickness[key].weight += Number(r.remaining_weight || 0);
  });
  const thicknessRows = Object.entries(byThickness).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => parseFloat(a.key) - parseFloat(b.key));
  const bySpec = {};
  inv.forEach((r) => {
    const key = r.spec || '기타';
    if (!bySpec[key]) bySpec[key] = { count: 0, weight: 0 };
    bySpec[key].count += 1;
    bySpec[key].weight += Number(r.remaining_weight || 0);
  });
  const specRows = Object.entries(bySpec).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.weight - a.weight);
  const maxSpecWeight = Math.max(1, ...specRows.map((r) => r.weight));

  // ---- 2) 작업 내역 (greenp_production, 선택한 날짜 하루 기준 + greenp_outbound 가공규격 매칭) ----
  const [workRows, setWorkRows] = useState([]);
  const [workSpecMap, setWorkSpecMap] = useState({});
  const [workLoading, setWorkLoading] = useState(false);
  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    setWorkLoading(true);
    Promise.all([
      supabase.from('greenp_production').select('*').eq('company_name', company.name).eq('slip_date', selectedDate).order('slip_no', { ascending: true }),
      supabase.from('greenp_joborders').select('joborder_no, joborder_date, prod_slip_no, prod_date').eq('company_name', company.name).eq('joborder_date', selectedDate),
      supabase.from('greenp_outbound').select('work_date, work_slip_no, spec').eq('company_name', company.name).eq('work_date', selectedDate),
    ]).then(([prod, jobs, out]) => {
      if (cancelled) return;
      setWorkRows(prod.data || []);
      const outMap = {};
      (out.data || []).forEach((r) => {
        if (!r.work_date || !r.work_slip_no) return;
        const key = `${r.work_date}_${r.work_slip_no}`;
        if (!outMap[key]) outMap[key] = new Set();
        if (r.spec) outMap[key].add(r.spec);
      });
      const flat = {};
      (jobs.data || []).forEach((j) => {
        if (!j.prod_date || !j.prod_slip_no) return;
        const set = outMap[`${j.joborder_date}_${j.joborder_no}`];
        if (set && set.size) flat[`${j.prod_date}_${j.prod_slip_no}`] = Array.from(set).join(', ');
      });
      setWorkSpecMap(flat);
      setWorkLoading(false);
    });
    return () => { cancelled = true; };
  }, [company?.name, selectedDate]);
  const workTotal = workRows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const workTypeLabel = (t) => (WORK_TYPE_GROUPS.find((g) => g.key === t) || [null, t || '기타'])[1];
  const workSpecOf = (r) => workSpecMap[`${r.slip_date}_${r.slip_no}`] || '-';

  // ---- 3) 출고 내역 (greenp_outbound, 선택한 날짜 하루 기준 + 검색어) ----
  const [outKeyword, setOutKeyword] = useState('');
  const [outRows, setOutRows] = useState([]);
  const [outLoading, setOutLoading] = useState(false);
  const runOutSearch = useCallback(() => {
    if (!company) return;
    setOutLoading(true);
    let q = supabase.from('greenp_outbound').select('*').eq('company_name', company.name).eq('outbound_date', selectedDate);
    if (outKeyword) q = q.or(`product_name.ilike.%${outKeyword}%,spec.ilike.%${outKeyword}%`);
    q.order('id', { ascending: true }).then(({ data }) => { setOutRows(data || []); setOutLoading(false); });
  }, [company?.name, selectedDate, outKeyword]);
  useEffect(() => { runOutSearch(); }, [company?.name, selectedDate]);
  const outTotalWeight = outRows.reduce((s, r) => s + Number(r.weight || 0), 0);

  // ---- 4) 발주하기 ----
  const submitOrder = async () => {
    if (!company) { alert('거래처를 선택하세요.'); return; }
    if (!form.thick) { alert('두께를 입력하세요.'); return; }
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const { count } = await supabase.from('sales_orders').select('id', { count: 'exact', head: true }).like('order_no', `${ymd}%`);
    const order_no = `${ymd}${String((count || 0) + 1).padStart(2, '0')}`;
    const { data, error } = await supabase.from('sales_orders').insert({
      order_no, company_name: company.name, thickness: parseFloat(form.thick),
      weight: form.weight ? parseFloat(form.weight) * 1000 : null, status: 'RECEIVED', prod_type: '자사생산',
      memo: `Slitting: ${form.slit} / 수량: ${form.qty}`,
    }).select().single();
    if (error) { alert('발주 등록 실패: ' + error.message); return; }
    if (form.thick || form.slit) {
      await supabase.from('order_items').insert({ order_id: data.id, thickness: form.thick, width: form.width, weight: form.weight, slit_spec: form.slit, qty: form.qty });
    }
    alert(`발주가 접수되었습니다(발주번호 ${order_no}) — 영업팀 발주 현황판에 실시간 반영됩니다.`);
    setForm({ thick: '', width: '', weight: '', qty: '', slit: '' });
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: C.navyGradient, borderRadius: '14px', padding: '18px 22px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(15,30,51,0.18)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '26px' }}>🏢</span>
        <div style={{ flex: 1, minWidth: '160px' }}>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', marginBottom: '2px' }}>고객사 포털</div>
          <div style={{ fontSize: '21px', fontWeight: 800, color: '#fff' }}>{company ? company.name : '거래처를 선택하세요'}</div>
        </div>
        <select style={{ ...inputStyle, width: '220px', background: '#fff' }} value={companyId || ''} onChange={(e) => setCompanyId(Number(e.target.value))}>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" value={selectedDate} max={todayStr()} onChange={(e) => setSelectedDate(e.target.value)} style={{ ...inputStyle, width: '170px' }} />
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
        {CP_SUBS.map(([k, label]) => <button key={k} style={{ ...btnStyle(sub === k), fontSize: '16px', padding: '11px 18px' }} onClick={() => setSub(k)}>{label}</button>)}
      </div>

      {sub === 'inventory' && (
        <div>
          <div style={{ fontSize: '13px', color: C.textMuted, marginBottom: '10px' }}>재고는 항상 현재 시점 기준입니다. (날짜 선택은 작업 내역·출고 내역에 적용됩니다)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '10px', marginBottom: '18px' }}>
            {statCard('보유 품목수', inv.length + '건')}
            {statCard('총 잔량', (invTotalWeight / 1000).toFixed(1) + '톤', C.textAccent)}
            {statCard('규격 종류', invSpecCount + '종')}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '14px', marginBottom: '20px' }}>
            <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(15,30,51,0.06)' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: C.textSecondary, marginBottom: '10px' }}>📊 현재 재고 통계 <span style={{ fontSize: '13px', fontWeight: 500, color: C.textMuted }}>(두께별)</span></div>
              {thicknessRows.length === 0 ? boxMsg('재고 데이터가 없습니다', { justifyContent: 'center' }) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={{ ...th, fontSize: '13px' }}>두께</th><th style={{ ...th, fontSize: '13px' }}>코일 수</th><th style={{ ...th, fontSize: '13px' }}>무게</th></tr></thead>
                  <tbody>
                    {thicknessRows.map((r, i) => (
                      <tr key={r.key} style={{ background: i % 2 ? C.surface1 : 'transparent' }}>
                        <td style={{ ...td, fontWeight: 700 }}>{r.key}</td>
                        <td style={td}>{r.count}개</td>
                        <td style={{ ...td, fontWeight: 700, color: C.textAccent }}>{(r.weight / 1000).toFixed(1)}톤</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(15,30,51,0.06)' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: C.textSecondary, marginBottom: '10px' }}>📊 미출고 재고 통계 <span style={{ fontSize: '13px', fontWeight: 500, color: C.textMuted }}>(가공규격별)</span></div>
              {specRows.length === 0 ? boxMsg('재고 데이터가 없습니다', { justifyContent: 'center' }) : (
                <div style={{ maxHeight: '210px', overflowY: 'auto' }}>
                  {specRows.slice(0, 10).map((r) => {
                    const pct = Math.round((r.weight / maxSpecWeight) * 100);
                    return (
                      <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ width: '90px', fontSize: '13px', fontWeight: 700, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.key}</span>
                        <div style={{ flex: 1, background: C.surface1, borderRadius: '5px', overflow: 'hidden', height: '13px' }}><div style={{ width: pct + '%', height: '100%', background: C.accent }} /></div>
                        <span style={{ width: '80px', textAlign: 'right', fontSize: '13px', color: C.textSecondary }}>{r.count}개 · {(r.weight / 1000).toFixed(1)}톤</span>
                      </div>
                    );
                  })}
                  {specRows.length > 10 && <div style={{ fontSize: '12px', color: C.textMuted }}>외 {specRows.length - 10}종 더</div>}
                </div>
              )}
            </div>
          </div>

          <div style={{ fontSize: '17px', fontWeight: 700, margin: '4px 0 8px', color: C.textSecondary }}>재고 상세 내역</div>
          <input style={{ ...inputStyle, marginBottom: '10px' }} placeholder="품명/규격 검색" value={invQuery} onChange={(e) => setInvQuery(e.target.value)} />
          {invLoading ? boxMsg('불러오는 중...', { justifyContent: 'center' }) : invFiltered.length === 0 ? boxMsg('해당 재고가 없습니다', { justifyContent: 'center' }) : (
            <table style={itemsTable}>
              <thead><tr><th style={th}>품명</th><th style={th}>가공규격</th><th style={th}>입고일</th><th style={th}>원중량</th><th style={th}>잔량</th></tr></thead>
              <tbody>
                {invFiltered.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 ? C.surface1 : 'transparent' }}>
                    <td style={td}>{r.product_name || '-'}</td><td style={td}>{r.spec || '-'}</td><td style={td}>{r.received_date || '-'}</td><td style={td}>{Number(r.original_weight || 0).toLocaleString()}kg</td><td style={{ ...td, fontWeight: 700 }}>{Number(r.remaining_weight || 0).toLocaleString()}kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {sub === 'work' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '10px', marginBottom: '14px' }}>
            {statCard('작업 건수', workRows.length + '건')}
            {statCard('합계 금액', workTotal.toLocaleString() + '원', C.textAccent)}
          </div>
          {workLoading ? boxMsg('불러오는 중...', { justifyContent: 'center' }) : workRows.length === 0 ? boxMsg(`${selectedDate}에 작업 내역이 없습니다`, { justifyContent: 'center' }) : (
            <table style={itemsTable}>
              <thead><tr><th style={th}>일자</th><th style={th}>작업유형</th><th style={th}>가공규격</th><th style={th}>전표번호</th><th style={th}>금액</th></tr></thead>
              <tbody>
                {workRows.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 ? C.surface1 : 'transparent' }}>
                    <td style={td}>{r.slip_date}</td><td style={td}>{workTypeLabel(r.work_type)}</td><td style={td}>{workSpecOf(r)}</td><td style={td}>{r.slip_no}</td><td style={{ ...td, fontWeight: 700 }}>{Number(r.amount || 0).toLocaleString()}원</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {sub === 'outbound' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <input style={inputStyle} placeholder="품명/규격 검색" value={outKeyword} onChange={(e) => setOutKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') runOutSearch(); }} />
            <button style={{ ...btnStyle(true), whiteSpace: 'nowrap' }} onClick={runOutSearch}>검색</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '10px', marginBottom: '10px' }}>
            {statCard('출고 건수', outRows.length + '건')}
            {statCard('합계 중량', (outTotalWeight / 1000).toFixed(1) + '톤')}
          </div>
          {outLoading ? boxMsg('불러오는 중...', { justifyContent: 'center' }) : outRows.length === 0 ? boxMsg(`${selectedDate}에 출고 내역이 없습니다`, { justifyContent: 'center' }) : (
            <table style={itemsTable}>
              <thead><tr><th style={th}>출고일</th><th style={th}>품명</th><th style={th}>가공규격</th><th style={th}>중량</th><th style={th}>수량</th></tr></thead>
              <tbody>
                {outRows.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 ? C.surface1 : 'transparent' }}>
                    <td style={td}>{r.outbound_date}</td><td style={td}>{r.product_name || '-'}</td><td style={td}>{r.spec || '-'}</td><td style={{ ...td, fontWeight: 700 }}>{Number(r.weight || 0).toLocaleString()}kg</td><td style={td}>{r.qty || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {sub === 'place' && (
        <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(15,30,51,0.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '14px', color: C.textMuted, marginBottom: '4px' }}>두께</div><input style={inputStyle} value={form.thick} onChange={(e) => setForm((f) => ({ ...f, thick: e.target.value }))} placeholder="예: 0.750" /></div>
            <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '14px', color: C.textMuted, marginBottom: '4px' }}>폭</div><input style={inputStyle} value={form.width} onChange={(e) => setForm((f) => ({ ...f, width: e.target.value }))} placeholder="예: 1219" /></div>
            <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '14px', color: C.textMuted, marginBottom: '4px' }}>중량(톤)</div><input style={inputStyle} value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))} placeholder="예: 9" /></div>
            <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '14px', color: C.textMuted, marginBottom: '4px' }}>수량</div><input style={inputStyle} value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} placeholder="예: 1" /></div>
          </div>
          <div style={{ marginBottom: '16px' }}><div style={{ fontSize: '14px', color: C.textMuted, marginBottom: '4px' }}>Slitting Size</div><input style={inputStyle} value={form.slit} onChange={(e) => setForm((f) => ({ ...f, slit: e.target.value }))} placeholder="예: 260*4, 175*1" /></div>
          <button style={{ ...btnStyle(true), width: '100%' }} onClick={submitOrder}>발주 제출</button>
        </div>
      )}
    </div>
  );
}
