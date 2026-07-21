// src/pages/CustomerPortalPage.jsx
// 오성철강 스마트 ERP 2.0 — 고객사 포털 (독립 메뉴)
// 내부 직원용 "영업 워크플로우" 5역할 탭과 분리된, 고객사 전용 화면입니다.
// 사용법: 거래처 검색·선택 + 날짜 선택만으로 재고/작업내역/출고내역을 조회합니다.
// 거래처 목록은 내부 companies 마스터가 아니라, 그린ERP에 실제 거래 이력이 있는
// 모든 회사(greenp_customers 뷰 = greenp_inventory/production/outbound 통합)에서 가져옵니다.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

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

const CHART_COLORS = ['#E8830F', '#16283f', '#1C7A4D', '#2E5AAC', '#C8372C', '#A3610A', '#8592A6', '#C46B06'];

function ChartCard({ title, note, children }) {
  return (
    <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(15,30,51,0.06)' }}>
      <div style={{ fontSize: '16px', fontWeight: 800, color: C.textSecondary, marginBottom: '2px' }}>{title}</div>
      {note && <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '8px' }}>{note}</div>}
      {children}
    </div>
  );
}

/* 인쇄 시에만 나타나는 리포트 헤더 — 화면에서는 숨김 */
function PrintHeader({ subTitle, companyName, rangeLabel }) {
  return (
    <div className="cp-print-header" style={{ display: 'none' }}>
      <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F1E33' }}>🏭 오성철강사에서 제공하는 리포트</div>
      <div style={{ fontSize: '15px', marginTop: '4px', color: '#333' }}>{subTitle} · 거래처: {companyName || '-'} · 조회기간: {rangeLabel}</div>
      <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>출력일시: {new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</div>
      <hr style={{ margin: '10px 0 16px', border: 'none', borderTop: '2px solid #16283f' }} />
    </div>
  );
}

/* 화면용 인쇄 버튼 (인쇄 시 자동 숨김) */
function PrintButton() {
  return <button className="no-print" style={{ ...btnStyle(false), whiteSpace: 'nowrap' }} onClick={() => window.print()}>🖨️ 인쇄 / PDF 저장</button>;
}

/* 오성철강 실제 로고 파일 (public/ohsung-logo.jpg) — 인쇄 리포트 헤더에 사용 */
const OHSUNG_LOGO_IMG = '<img src="' + window.location.origin + '/ohsung-logo.jpg" alt="오성철강" width="122" height="40" style="height:40px;width:122px;display:block;object-fit:contain;" />';
/* 오성철강 실제 확인 도장 스캔본 (public/ohsung-stamp2.png, 배경 투명 처리) — 도장 가운데 여백에 출력 시점 날짜를 같은 잉크색으로 얹어서 표시 */
function stampTodayLabel() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  const d = parts.find((p) => p.type === 'day').value;
  return `${y}.${m}.${d}`;
}
function ohsungStampHTML() {
  return `<div style="position:relative;width:200px;height:199px;">
    <img src="${window.location.origin}/ohsung-stamp2.png" alt="오성철강사 확인" width="200" height="199" style="width:200px;height:199px;display:block;object-fit:contain;" />
    <div style="position:absolute;left:34.8%;top:51.4%;transform:translate(-50%,-50%) rotate(-38deg);font-family:Arial,'Malgun Gothic',sans-serif;font-weight:700;font-size:12px;color:#16209c;white-space:nowrap;">${stampTodayLabel()}</div>
  </div>`;
}

/* ---------------- 입고 내역 — 세련된 별도 창 PDF 리포트 (확인 도장 포함) ---------------- */
function printInboundPDF(company, rangeLabel, rows) {
  const w = window.open('', '_blank', 'width=880,height=760');
  if (!w) { alert('팝업이 차단되었습니다. 브라우저의 팝업 차단을 해제해주세요.'); return; }
  const totalWeight = rows.reduce((s, r) => s + Number(r.weight || 0), 0);
  const bodyRows = rows.map((r, i) => `
    <tr style="background:${i % 2 ? '#F7F9FC' : '#fff'}">
      <td>${r.inbound_date || '-'}</td>
      <td>${r.company_name || '-'}</td>
      <td>${r.product_name || '-'}</td>
      <td>${r.spec || '-'}</td>
      <td style="text-align:right;font-weight:700;">${Number(r.weight || 0).toLocaleString()}</td>
    </tr>`).join('');
  w.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>입고현황 리스트 - ${company}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Pretendard,sans-serif; color:#0F1E33; margin:0; padding:36px 42px; }
    .head { display:flex; align-items:center; justify-content:space-between; padding-bottom:18px; border-bottom:3px solid #16283f; margin-bottom:22px; }
    .brand { font-size:15px; font-weight:800; color:#16283f; letter-spacing:.02em; }
    .brand .sub { font-size:12px; font-weight:600; color:#8592A6; margin-top:2px; }
    .title { text-align:center; margin: 4px 0 20px; }
    .title h1 { font-size:30px; margin:0; letter-spacing:.15em; font-weight:900; }
    .title .badge { display:inline-block; margin-top:8px; background:#FDECD6; color:#C46B06; font-weight:800; font-size:13px; padding:5px 14px; border-radius:999px; }
    .meta { display:flex; justify-content:space-between; font-size:14.5px; color:#4D5C72; margin-bottom:16px; padding:12px 16px; background:#F4F6FA; border-radius:10px; }
    .meta b { color:#0F1E33; }
    table { width:100%; border-collapse:collapse; margin-top:6px; }
    th { background:#16283f; color:#fff; font-size:13.5px; padding:11px 10px; text-align:left; font-weight:700; }
    td { padding:9px 10px; font-size:14.5px; border-bottom:1px solid #E3E8F0; }
    tfoot td { font-weight:900; font-size:16px; border-top:2px solid #16283f; border-bottom:none; padding-top:13px; }
    .footnote { margin-top:22px; font-size:13px; color:#8592A6; line-height:1.7; }
    .stamp { display:flex; justify-content:flex-end; align-items:flex-end; gap:10px; margin-top:44px; }
    .stamp-box { text-align:right; font-size:15px; color:#4D5C72; }
    .stamp-box .co { margin-top:2px; font-size:18px; font-weight:900; color:#0F1E33; }
    @media print { button { display:none !important; } body { padding:16px 22px; } }
    .printbar { text-align:center; margin-top:26px; }
    .printbar button { font-size:16px; padding:10px 22px; border-radius:9px; border:none; background:#E8830F; color:#fff; font-weight:800; cursor:pointer; }
  </style></head>
  <body>
    <div class="head">
      <div class="brand" style="display:flex;align-items:center;gap:11px;">${OHSUNG_LOGO_IMG}<div class="sub" style="align-self:flex-end;">SMART ERP 2.0</div></div>
      <div class="brand" style="text-align:right">
        <div class="sub">발행일시</div>
        ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
      </div>
    </div>
    <div class="title">
      <h1>입 고 현 황 리 스 트</h1>
      <div class="badge">INBOUND COIL LIST</div>
    </div>
    <div class="meta">
      <span>거래처: <b>${company}</b></span>
      <span>기간: <b>${rangeLabel}</b></span>
      <span>건수: <b>${rows.length}건</b></span>
    </div>
    <table>
      <thead><tr><th>입고일자</th><th>업체명</th><th>품명</th><th>규격</th><th style="text-align:right">중량(kg)</th></tr></thead>
      <tbody>${bodyRows || '<tr><td colspan="5" style="text-align:center;color:#8592A6;padding:20px;">입고 내역이 없습니다</td></tr>'}</tbody>
      <tfoot><tr><td colspan="4" style="text-align:right;">중량 합계</td><td style="text-align:right;">${totalWeight.toLocaleString()} kg</td></tr></tfoot>
    </table>
    <div class="footnote">
      본 리스트는 오성철강 스마트 ERP 2.0에서 그린ERP 실시간 연동 데이터를 기반으로 자동 생성되었습니다.<br/>
      내용에 이상이 있으신 경우 오성철강사로 연락 주시기 바랍니다.
    </div>
    <div class="stamp">
      ${ohsungStampHTML()}
      <div class="stamp-box">
        <div class="co">오 성 철 강 사</div>
      </div>
    </div>
    <div class="printbar"><button onclick="window.print()">🖨️ 인쇄 / PDF 저장</button></div>
  </body></html>`);
  w.document.close(); w.focus();
}

/* ---------------- 출고 내역 — 세련된 별도 창 PDF 리포트 (확인 도장 포함, 입고 리포트와 동일 양식) ---------------- */
function printOutboundPDF(company, rangeLabel, rows) {
  const w = window.open('', '_blank', 'width=880,height=760');
  if (!w) { alert('팝업이 차단되었습니다. 브라우저의 팝업 차단을 해제해주세요.'); return; }
  const totalWeight = rows.reduce((s, r) => s + Number(r.weight || 0), 0);
  const bodyRows = rows.map((r, i) => `
    <tr style="background:${i % 2 ? '#F7F9FC' : '#fff'}">
      <td>${r.outbound_date || '-'}</td>
      <td>${r.product_name || '-'}</td>
      <td>${r.spec || '-'}</td>
      <td style="text-align:right;">${r.qty || '-'}</td>
      <td style="text-align:right;font-weight:700;">${Number(r.weight || 0).toLocaleString()}</td>
    </tr>`).join('');
  w.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>출고현황 리스트 - ${company}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Pretendard,sans-serif; color:#0F1E33; margin:0; padding:36px 42px; }
    .head { display:flex; align-items:center; justify-content:space-between; padding-bottom:18px; border-bottom:3px solid #16283f; margin-bottom:22px; }
    .brand { font-size:15px; font-weight:800; color:#16283f; letter-spacing:.02em; }
    .brand .sub { font-size:12px; font-weight:600; color:#8592A6; margin-top:2px; }
    .title { text-align:center; margin: 4px 0 20px; }
    .title h1 { font-size:30px; margin:0; letter-spacing:.15em; font-weight:900; }
    .title .badge { display:inline-block; margin-top:8px; background:#FDECD6; color:#C46B06; font-weight:800; font-size:13px; padding:5px 14px; border-radius:999px; }
    .meta { display:flex; justify-content:space-between; font-size:14.5px; color:#4D5C72; margin-bottom:16px; padding:12px 16px; background:#F4F6FA; border-radius:10px; }
    .meta b { color:#0F1E33; }
    table { width:100%; border-collapse:collapse; margin-top:6px; }
    th { background:#16283f; color:#fff; font-size:13.5px; padding:11px 10px; text-align:left; font-weight:700; }
    td { padding:9px 10px; font-size:14.5px; border-bottom:1px solid #E3E8F0; }
    tfoot td { font-weight:900; font-size:16px; border-top:2px solid #16283f; border-bottom:none; padding-top:13px; }
    .footnote { margin-top:22px; font-size:13px; color:#8592A6; line-height:1.7; }
    .stamp { display:flex; justify-content:flex-end; align-items:flex-end; gap:10px; margin-top:44px; }
    .stamp-box { text-align:right; font-size:15px; color:#4D5C72; }
    .stamp-box .co { margin-top:2px; font-size:18px; font-weight:900; color:#0F1E33; }
    @media print { button { display:none !important; } body { padding:16px 22px; } }
    .printbar { text-align:center; margin-top:26px; }
    .printbar button { font-size:16px; padding:10px 22px; border-radius:9px; border:none; background:#E8830F; color:#fff; font-weight:800; cursor:pointer; }
  </style></head>
  <body>
    <div class="head">
      <div class="brand" style="display:flex;align-items:center;gap:11px;">${OHSUNG_LOGO_IMG}<div class="sub" style="align-self:flex-end;">SMART ERP 2.0</div></div>
      <div class="brand" style="text-align:right">
        <div class="sub">발행일시</div>
        ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
      </div>
    </div>
    <div class="title">
      <h1>출 고 현 황 리 스 트</h1>
      <div class="badge">OUTBOUND COIL LIST</div>
    </div>
    <div class="meta">
      <span>거래처: <b>${company}</b></span>
      <span>기간: <b>${rangeLabel}</b></span>
      <span>건수: <b>${rows.length}건</b></span>
    </div>
    <table>
      <thead><tr><th>출고일자</th><th>품명</th><th>가공규격</th><th style="text-align:right">수량</th><th style="text-align:right">중량(kg)</th></tr></thead>
      <tbody>${bodyRows || '<tr><td colspan="5" style="text-align:center;color:#8592A6;padding:20px;">출고 내역이 없습니다</td></tr>'}</tbody>
      <tfoot><tr><td colspan="4" style="text-align:right;">중량 합계</td><td style="text-align:right;">${totalWeight.toLocaleString()} kg</td></tr></tfoot>
    </table>
    <div class="footnote">
      본 리스트는 오성철강 스마트 ERP 2.0에서 그린ERP 실시간 연동 데이터를 기반으로 자동 생성되었습니다.<br/>
      내용에 이상이 있으신 경우 오성철강사로 연락 주시기 바랍니다.
    </div>
    <div class="stamp">
      ${ohsungStampHTML()}
      <div class="stamp-box">
        <div class="co">오 성 철 강 사</div>
      </div>
    </div>
    <div class="printbar"><button onclick="window.print()">🖨️ 인쇄 / PDF 저장</button></div>
  </body></html>`);
  w.document.close(); w.focus();
}

const WORK_TYPE_GROUPS = [
  { key: 'SLITING', label: '슬리팅1' },
  { key: 'SLITING2', label: '슬리팅2' },
  { key: 'LEVELLING', label: '레벨링' },
];
const CP_SUBS = [['inventory', '📦 재고 현황'], ['work', '🛠 작업 내역'], ['outbound', '🚚 출고 내역'], ['inbound', '📥 입고 내역'], ['place', '📝 발주하기']];

function kstDateStr(d) { return new Date(d).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }); }
function todayStr() { return kstDateStr(new Date()); }
function daysAgoStr(n) { const d = new Date(); d.setDate(d.getDate() - n); return kstDateStr(d); }
function monthsAgoStr(n) { const d = new Date(); d.setMonth(d.getMonth() - n); return kstDateStr(d); }
function fmtKDate(s) { if (!s) return ''; const [, m, d] = s.split('-'); return `${parseInt(m, 10)}월 ${parseInt(d, 10)}일`; }

/* ---------------- 거래처 검색 콤보박스 ---------------- */
function CompanySearchBox({ companies, value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  const matches = (query ? companies.filter((n) => n.includes(query)) : companies).slice(0, 30);

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '260px' }}>
      <input
        style={{ ...inputStyle, background: '#fff' }}
        placeholder="거래처명 검색 (예: 에버스틸, 태경)"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && matches.length > 0 && (
        <div style={{ position: 'absolute', top: '52px', left: 0, right: 0, background: C.surface2, border: `1.5px solid ${C.borderStrong}`, borderRadius: '9px', boxShadow: '0 8px 20px rgba(15,30,51,0.18)', maxHeight: '280px', overflowY: 'auto', zIndex: 50 }}>
          {matches.map((name) => (
            <div
              key={name}
              onMouseDown={() => { onChange(name); setQuery(name); setOpen(false); }}
              style={{ padding: '10px 14px', fontSize: '16px', cursor: 'pointer', color: name === value ? C.textAccent : C.textPrimary, fontWeight: name === value ? 800 : 500, background: name === value ? C.bgAccent : 'transparent' }}
              onMouseEnter={(e) => { if (name !== value) e.currentTarget.style.background = C.surface1; }}
              onMouseLeave={(e) => { if (name !== value) e.currentTarget.style.background = 'transparent'; }}
            >
              {name}
            </div>
          ))}
        </div>
      )}
      {open && query && matches.length === 0 && (
        <div style={{ position: 'absolute', top: '52px', left: 0, right: 0, background: C.surface2, border: `1.5px solid ${C.borderStrong}`, borderRadius: '9px', boxShadow: '0 8px 20px rgba(15,30,51,0.18)', padding: '12px 14px', fontSize: '15px', color: C.textMuted, zIndex: 50 }}>
          일치하는 거래처가 없습니다
        </div>
      )}
    </div>
  );
}

export default function CustomerPortalPage() {
  const [companies, setCompanies] = useState([]); // 그린ERP 실거래 회사명 전체 목록
  const [companyName, setCompanyName] = useState('');
  const [sub, setSub] = useState('inventory');
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [form, setForm] = useState({ thick: '', width: '', weight: '', qty: '', slit: '' });

  const isToday = startDate === todayStr() && endDate === todayStr();
  const isWeek = startDate === daysAgoStr(6) && endDate === todayStr();
  const isMonth = startDate === monthsAgoStr(1) && endDate === todayStr();
  const is3Month = startDate === monthsAgoStr(3) && endDate === todayStr();
  const rangeLabel = startDate === endDate ? fmtKDate(startDate) : `${fmtKDate(startDate)} ~ ${fmtKDate(endDate)}`;
  const setPreset = (start) => { setStartDate(start); setEndDate(todayStr()); };

  useEffect(() => {
    supabase.from('greenp_customers').select('name').order('name', { ascending: true }).then(({ data }) => {
      const names = (data || []).map((r) => r.name);
      setCompanies(names);
      if (names.length) setCompanyName((prev) => prev || names[0]);
    });
  }, []);

  // ---- 1) 재고 현황 (greenp_inventory 실데이터 — 항상 현재 시점 기준) ----
  const [inv, setInv] = useState([]);
  const [invLoading, setInvLoading] = useState(false);
  const [invQuery, setInvQuery] = useState('');
  useEffect(() => {
    if (!companyName) return;
    let cancelled = false;
    setInvLoading(true);
    supabase.from('greenp_inventory').select('*').eq('customer_name', companyName).order('received_date', { ascending: false })
      .then(({ data }) => { if (!cancelled) { setInv(data || []); setInvLoading(false); } });
    return () => { cancelled = true; };
  }, [companyName]);
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
  const thicknessChartData = thicknessRows.map((r) => ({ name: r.key, 코일수: r.count, 무게톤: +(r.weight / 1000).toFixed(2) }));

  // ---- 2) 작업 내역 (greenp_production, 선택한 기간 기준 + greenp_outbound 가공규격 매칭) ----
  const [workRows, setWorkRows] = useState([]);
  const [workSpecMap, setWorkSpecMap] = useState({});
  const [workLoading, setWorkLoading] = useState(false);
  useEffect(() => {
    if (!companyName) return;
    let cancelled = false;
    setWorkLoading(true);
    Promise.all([
      supabase.from('greenp_production').select('*').eq('company_name', companyName).gte('slip_date', startDate).lte('slip_date', endDate).order('slip_date', { ascending: false }).limit(500),
      supabase.from('greenp_joborders').select('joborder_no, joborder_date, prod_slip_no, prod_date').eq('company_name', companyName).gte('joborder_date', startDate).lte('joborder_date', endDate),
      supabase.from('greenp_outbound').select('work_date, work_slip_no, spec').eq('company_name', companyName).gte('work_date', startDate).lte('work_date', endDate),
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
  }, [companyName, startDate, endDate]);
  const workTotal = workRows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const workTypeLabel = (t) => { const g = WORK_TYPE_GROUPS.find((g) => g.key === t); return g ? g.label : (t || '기타'); };
  const workSpecOf = (r) => workSpecMap[`${r.slip_date}_${r.slip_no}`] || '-';
  // 작업유형별 비교 (막대)
  const workTypeAgg = {};
  workRows.forEach((r) => {
    const label = workTypeLabel(r.work_type);
    if (!workTypeAgg[label]) workTypeAgg[label] = { count: 0, amount: 0 };
    workTypeAgg[label].count += 1;
    workTypeAgg[label].amount += Number(r.amount || 0);
  });
  const workTypeChartData = Object.entries(workTypeAgg).map(([name, v]) => ({ name, 건수: v.count, 금액만원: Math.round(v.amount / 10000) }));
  // 기간별 추이 (라인) — 일자별 작업 건수/금액
  const workByDate = {};
  workRows.forEach((r) => {
    if (!r.slip_date) return;
    if (!workByDate[r.slip_date]) workByDate[r.slip_date] = { date: r.slip_date, 건수: 0, 금액만원: 0 };
    workByDate[r.slip_date].건수 += 1;
    workByDate[r.slip_date].금액만원 += Number(r.amount || 0) / 10000;
  });
  const workTrendData = Object.values(workByDate).sort((a, b) => a.date.localeCompare(b.date)).map((r) => ({ ...r, 금액만원: Math.round(r.금액만원), dateLabel: fmtKDate(r.date) }));

  // ---- 3) 출고 내역 (greenp_outbound, 선택한 기간 기준 + 검색어) ----
  const [outKeyword, setOutKeyword] = useState('');
  const [outRows, setOutRows] = useState([]);
  const [outTotalCount, setOutTotalCount] = useState(0);
  const [outLoading, setOutLoading] = useState(false);
  const runOutSearch = useCallback(() => {
    if (!companyName) return;
    setOutLoading(true);
    let q = supabase.from('greenp_outbound').select('*', { count: 'exact' }).eq('company_name', companyName).gte('outbound_date', startDate).lte('outbound_date', endDate);
    if (outKeyword) q = q.or(`product_name.ilike.%${outKeyword}%,spec.ilike.%${outKeyword}%`);
    q.order('outbound_date', { ascending: false }).limit(300).then(({ data, count }) => { setOutRows(data || []); setOutTotalCount(count || 0); setOutLoading(false); });
  }, [companyName, startDate, endDate, outKeyword]);
  useEffect(() => { runOutSearch(); }, [companyName, startDate, endDate]);
  const outTotalWeight = outRows.reduce((s, r) => s + Number(r.weight || 0), 0);
  // 두께별 분포 (막대/파이) — spec 선두 숫자를 두께로 파싱
  const outByThickness = {};
  outRows.forEach((r) => {
    const m = (r.spec || '').match(/^([0-9.]+)/);
    const key = m ? m[1] + 'T' : '기타';
    if (!outByThickness[key]) outByThickness[key] = { count: 0, weight: 0 };
    outByThickness[key].count += 1;
    outByThickness[key].weight += Number(r.weight || 0);
  });
  const outThicknessChartData = Object.entries(outByThickness).map(([k, v]) => ({ name: k, 건수: v.count, 중량톤: +(v.weight / 1000).toFixed(2) })).sort((a, b) => (parseFloat(a.name) || 999) - (parseFloat(b.name) || 999));
  // 기간별 추이 (라인) — 일자별 출고 중량
  const outByDate = {};
  outRows.forEach((r) => {
    if (!r.outbound_date) return;
    if (!outByDate[r.outbound_date]) outByDate[r.outbound_date] = { date: r.outbound_date, 건수: 0, 중량톤: 0 };
    outByDate[r.outbound_date].건수 += 1;
    outByDate[r.outbound_date].중량톤 += Number(r.weight || 0) / 1000;
  });
  const outTrendData = Object.values(outByDate).sort((a, b) => a.date.localeCompare(b.date)).map((r) => ({ ...r, 중량톤: +r.중량톤.toFixed(2), dateLabel: fmtKDate(r.date) }));

  // ---- 3.5) 입고 내역 (greenp_inbound, 선택한 기간 기준 + 검색어) ----
  const [inKeyword, setInKeyword] = useState('');
  const [inRows, setInRows] = useState([]);
  const [inTotalCount, setInTotalCount] = useState(0);
  const [inLoading, setInLoading] = useState(false);
  const runInSearch = useCallback(() => {
    if (!companyName) return;
    setInLoading(true);
    let q = supabase.from('greenp_inbound').select('*', { count: 'exact' }).eq('company_name', companyName).gte('inbound_date', startDate).lte('inbound_date', endDate);
    if (inKeyword) q = q.or(`product_name.ilike.%${inKeyword}%,spec.ilike.%${inKeyword}%`);
    q.order('inbound_date', { ascending: false }).limit(300).then(({ data, count }) => { setInRows(data || []); setInTotalCount(count || 0); setInLoading(false); });
  }, [companyName, startDate, endDate, inKeyword]);
  useEffect(() => { runInSearch(); }, [companyName, startDate, endDate]);
  const inTotalWeight = inRows.reduce((s, r) => s + Number(r.weight || 0), 0);

  // ---- 4) 발주하기 ----
  const submitOrder = async () => {
    if (!companyName) { alert('거래처를 선택하세요.'); return; }
    if (!form.thick) { alert('두께를 입력하세요.'); return; }
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const { count } = await supabase.from('sales_orders').select('id', { count: 'exact', head: true }).like('order_no', `${ymd}%`);
    const order_no = `${ymd}${String((count || 0) + 1).padStart(2, '0')}`;
    const { data, error } = await supabase.from('sales_orders').insert({
      order_no, company_name: companyName, thickness: parseFloat(form.thick),
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
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .cp-print-header { display: block !important; }
          body { background: #fff !important; }
        }
      `}</style>
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: C.navyGradient, borderRadius: '14px', padding: '18px 22px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(15,30,51,0.18)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '26px' }}>🏢</span>
        <div style={{ flex: 1, minWidth: '160px' }}>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', marginBottom: '2px' }}>고객사 포털 <span style={{ color: 'rgba(255,255,255,0.4)' }}>· 거래처 {companies.length}곳</span></div>
          <div style={{ fontSize: '21px', fontWeight: 800, color: '#fff' }}>{companyName || '거래처를 선택하세요'}</div>
        </div>
        <CompanySearchBox companies={companies} value={companyName} onChange={setCompanyName} />
      </div>

      <div className="no-print" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', background: C.surface1, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(15,30,51,0.05)' }}>
        <span style={{ fontSize: '16px', fontWeight: 700, color: C.textSecondary }}>📅 조회 기간</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button style={btnStyle(isToday)} onClick={() => setPreset(todayStr())}>오늘</button>
          <button style={btnStyle(isWeek)} onClick={() => setPreset(daysAgoStr(6))}>최근 1주</button>
          <button style={btnStyle(isMonth)} onClick={() => setPreset(monthsAgoStr(1))}>최근 1개월</button>
          <button style={btnStyle(is3Month)} onClick={() => setPreset(monthsAgoStr(3))}>최근 3개월</button>
        </div>
        <input type="date" value={startDate} max={endDate} onChange={(e) => setStartDate(e.target.value)} style={{ ...inputStyle, height: '38px', width: '150px', fontSize: '15px' }} />
        <span style={{ color: C.textMuted }}>~</span>
        <input type="date" value={endDate} min={startDate} max={todayStr()} onChange={(e) => setEndDate(e.target.value)} style={{ ...inputStyle, height: '38px', width: '150px', fontSize: '15px' }} />
        <span style={{ fontSize: '15px', color: C.textAccent, fontWeight: 700, marginLeft: 'auto' }}>{rangeLabel} 기준 <span style={{ color: C.textMuted, fontWeight: 500 }}>(작업·출고 내역에 적용)</span></span>
      </div>

      <div className="no-print" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
        {CP_SUBS.map(([k, label]) => <button key={k} style={{ ...btnStyle(sub === k), fontSize: '16px', padding: '11px 18px' }} onClick={() => setSub(k)}>{label}</button>)}
      </div>

      {sub === 'inventory' && (
        <div>
          <PrintHeader subTitle="재고 현황 리포트" companyName={companyName} rangeLabel="현재 시점 기준" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ fontSize: '13px', color: C.textMuted }}>재고는 항상 현재 시점 기준입니다. (조회 기간은 작업 내역·출고 내역에만 적용됩니다)</div>
            <div style={{ marginLeft: 'auto' }}><PrintButton /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '10px', marginBottom: '18px' }}>
            {statCard('보유 품목수', inv.length + '건')}
            {statCard('총 잔량', (invTotalWeight / 1000).toFixed(1) + '톤', C.textAccent)}
            {statCard('규격 종류', invSpecCount + '종')}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '14px', marginBottom: '14px' }}>
            <ChartCard title="📈 두께별 재고 분포 (막대)" note="두께(T)별 잔량 무게 비교">
              {thicknessChartData.length === 0 ? boxMsg('데이터가 없습니다', { justifyContent: 'center', minHeight: '220px' }) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={thicknessChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} label={{ value: '톤', angle: 0, position: 'top', fontSize: 11 }} />
                    <Tooltip formatter={(v, n) => [n === '무게톤' ? `${v}톤` : `${v}개`, n]} />
                    <Bar dataKey="무게톤" fill={C.accent} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
            <ChartCard title="🥧 두께별 비중 (파이)" note="잔량 무게 기준 구성비">
              {thicknessChartData.length === 0 ? boxMsg('데이터가 없습니다', { justifyContent: 'center', minHeight: '220px' }) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={thicknessChartData} dataKey="무게톤" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {thicknessChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${v}톤`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
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
          <PrintHeader subTitle="작업 내역 리포트" companyName={companyName} rangeLabel={rangeLabel} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}><PrintButton /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '10px', marginBottom: '14px' }}>
            {statCard('작업 건수', workRows.length + '건')}
            {statCard('합계 금액', workTotal.toLocaleString() + '원', C.textAccent)}
          </div>

          {workRows.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '14px', marginBottom: '18px' }}>
              <ChartCard title="📈 기간별 작업 추이 (라인)" note="일자별 작업 금액 추이 (만원)">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={workTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v, n) => [n === '금액만원' ? `${v.toLocaleString()}만원` : `${v}건`, n]} />
                    <Line type="monotone" dataKey="금액만원" stroke={C.accent} strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="📊 작업유형별 비교 (막대)" note="슬리팅1 / 슬리팅2 / 레벨링 등 유형별 금액">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={workTypeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v, n) => [n === '금액만원' ? `${v.toLocaleString()}만원` : `${v}건`, n]} />
                    <Bar dataKey="금액만원" radius={[4, 4, 0, 0]}>
                      {workTypeChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}

          {workLoading ? boxMsg('불러오는 중...', { justifyContent: 'center' }) : workRows.length === 0 ? boxMsg(`${rangeLabel}에 작업 내역이 없습니다`, { justifyContent: 'center' }) : (
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
          <PrintHeader subTitle="출고 내역 리포트" companyName={companyName} rangeLabel={rangeLabel} />
          <div className="no-print" style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <input style={inputStyle} placeholder="품명/규격 검색" value={outKeyword} onChange={(e) => setOutKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') runOutSearch(); }} />
            <button style={{ ...btnStyle(true), whiteSpace: 'nowrap' }} onClick={runOutSearch}>검색</button>
            <button style={{ ...btnStyle(false), whiteSpace: 'nowrap' }} onClick={() => printOutboundPDF(companyName, rangeLabel, outRows)}>🖨️ 세련된 PDF로 저장</button>
            <PrintButton />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '10px', marginBottom: '10px' }}>
            {statCard('출고 건수', outTotalCount.toLocaleString() + '건')}
            {statCard('합계 중량(표시분)', (outTotalWeight / 1000).toFixed(1) + '톤')}
          </div>
          {outTotalCount > outRows.length && <div className="no-print" style={{ fontSize: '13px', color: C.textMuted, marginBottom: '10px' }}>전체 {outTotalCount.toLocaleString()}건 중 최근 {outRows.length}건 표시 — 기간을 좁히거나 검색어를 입력하면 더 정확히 조회됩니다.</div>}

          {outRows.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '14px', marginBottom: '18px' }}>
              <ChartCard title="📊 두께별 출고 분포 (막대)" note="가공규격 선두 두께(T) 기준 출고 중량">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={outThicknessChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v, n) => [n === '중량톤' ? `${v}톤` : `${v}건`, n]} />
                    <Bar dataKey="중량톤" fill={C.accent} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="📈 기간별 출고 추이 (라인)" note="일자별 출고 중량(톤) 추이">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={outTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v, n) => [n === '중량톤' ? `${v}톤` : `${v}건`, n]} />
                    <Line type="monotone" dataKey="중량톤" stroke={C.accent} strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}

          {outLoading ? boxMsg('불러오는 중...', { justifyContent: 'center' }) : outRows.length === 0 ? boxMsg(`${rangeLabel}에 출고 내역이 없습니다`, { justifyContent: 'center' }) : (
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

      {sub === 'inbound' && (
        <div>
          <PrintHeader subTitle="입고 내역 리포트" companyName={companyName} rangeLabel={rangeLabel} />
          <div className="no-print" style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <input style={inputStyle} placeholder="품명/규격 검색" value={inKeyword} onChange={(e) => setInKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') runInSearch(); }} />
            <button style={{ ...btnStyle(true), whiteSpace: 'nowrap' }} onClick={runInSearch}>검색</button>
            <button style={{ ...btnStyle(false), whiteSpace: 'nowrap' }} onClick={() => printInboundPDF(companyName, rangeLabel, inRows)}>🖨️ 세련된 PDF로 저장</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '10px', marginBottom: '10px' }}>
            {statCard('입고 건수', inTotalCount.toLocaleString() + '건')}
            {statCard('합계 중량(표시분)', (inTotalWeight / 1000).toFixed(1) + '톤', C.textAccent)}
          </div>
          {inTotalCount > inRows.length && <div className="no-print" style={{ fontSize: '13px', color: C.textMuted, marginBottom: '10px' }}>전체 {inTotalCount.toLocaleString()}건 중 최근 {inRows.length}건 표시 — 기간을 좁히거나 검색어를 입력하면 더 정확히 조회됩니다.</div>}

          {inLoading ? boxMsg('불러오는 중...', { justifyContent: 'center' }) : inRows.length === 0 ? boxMsg(`${rangeLabel}에 입고 내역이 없습니다`, { justifyContent: 'center' }) : (
            <table style={itemsTable}>
              <thead><tr><th style={th}>입고일자</th><th style={th}>업체명</th><th style={th}>품명</th><th style={th}>규격</th><th style={th}>중량</th></tr></thead>
              <tbody>
                {inRows.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 ? C.surface1 : 'transparent' }}>
                    <td style={td}>{r.inbound_date}</td><td style={td}>{r.company_name || '-'}</td><td style={td}>{r.product_name || '-'}</td><td style={td}>{r.spec || '-'}</td><td style={{ ...td, fontWeight: 700 }}>{Number(r.weight || 0).toLocaleString()}kg</td>
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
