// src/pages/SalesWorkflowPage.jsx
// 오성철강 스마트 ERP 2.0 — 영업 워크플로우 (5개 역할: 대표 / 관리자 / 영업 / 지게차 기사 / 고객사)
// "오성철강_ERP2_동작프로토타입.html" 에서 확정한 UI/흐름을 그대로, 실제 Supabase 데이터로 재구현합니다.
import React, { useState, useEffect, useCallback } from 'react';
import { supabase, supabaseUrl } from '../supabaseClient';

/* ---------------- 컬러/스타일 토큰 (프로토타입과 동일한 팔레트) ---------------- */
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
const smallBtn = (variant) => {
  const base = { fontSize: '15px', padding: '5px 12px', borderRadius: '8px', border: `1.5px solid ${C.borderStrong}`, background: C.surface2, color: C.textPrimary, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 };
  if (variant === 'accent') return { ...base, background: C.accent, color: C.onAccent, borderColor: C.accent };
  if (variant === 'danger') return { ...base, color: C.textDanger, borderColor: C.borderDanger };
  return base;
};
const cardWrap = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px' };
const stepHead = { fontSize: '19px', fontWeight: 700, color: C.textAccent, letterSpacing: '0.02em', margin: '18px 0 10px', paddingBottom: '6px', borderBottom: `1px solid ${C.border}` };
const boxMsg = (text, extra) => <div style={{ background: C.surface1, border: `1px solid ${C.border}`, borderRadius: '8px', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', fontSize: '17px', color: C.textMuted, padding: '10px 14px', ...extra }}>{text}</div>;
const itemsTable = { width: '100%', borderCollapse: 'collapse', background: C.surface2, borderRadius: '8px', overflow: 'hidden' };
const th = { padding: '11px 10px', fontSize: '15px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, background: C.surface1, color: C.textSecondary, fontWeight: 700 };
const td = { padding: '10px 10px', fontSize: '17px', textAlign: 'left', borderBottom: `1px solid ${C.border}` };

const STATUSES = [['RECEIVED', '접수확인중'], ['SEARCH', '코일탐색중'], ['WORKING', '작업중'], ['DONE', '작업완료'], ['DISPATCH', '배차완료'], ['SHIPPED', '출고완료']];
const statusLabel = (k) => (STATUSES.find((s) => s[0] === k) || [k, k])[1];
const statusIndex = (k) => STATUSES.findIndex((s) => s[0] === k);
const ROLES = [['EX', '대표'], ['MG', '관리자'], ['OF', '영업'], ['FL', '지게차 기사']];
const OF_SUBS = [['kanban', '전체 현황판'], ['register', '① 발주 접수'], ['assign', '② 코일 배정 지시'], ['workorder', '③ 작업지시서 처리'], ['monitor', '④ 현장 공정 모니터링'], ['notify', '⑤ 고객 통지·배차 지시'], ['shipment', '⑥ 출고 처리'], ['aftercare', '⑦ 사후 대응·거래처 관리']];
const FL_SUBS = [['waiting', '대기 발주'], ['coil', '코일 검색·확정']];
const CP_SUBS = [['inventory', '📦 재고 현황'], ['work', '🛠 작업 내역'], ['outbound', '🚚 출고 내역'], ['place', '📝 발주하기']];
const MG_SUBS = [['search', '발주 추적'], ['inventory', '재고 수불원장(마감상태)']];
const EDGE_POINTS = [
  { t: 'FAX 스캔 접수', d: '그린ERP는 발주 내용을 전부 수기입력 — 우리는 팩스/스캔 파일만 올리면 접수 기록이 즉시 남습니다.' },
  { t: '지게차 기사 태블릿 화면', d: '경쟁 ERP는 PC 클라이언트뿐 — 현장 코일 검색·확정을 태블릿에서 바로 처리합니다.' },
  { t: '고객사 실시간 포털', d: '경쟁 ERP는 내부직원 전용 — 우리는 고객사가 직접 접속해 진행상태를 확인합니다.' },
  { t: '경영진 통합 대시보드', d: '경쟁 ERP는 화면별 개별조회 — 우리는 매출·비용·작업현황을 한 화면에서 봅니다.' },
  { t: '웹 기반(설치 불필요)', d: '경쟁 ERP는 PC 설치형 — 우리는 브라우저만 있으면 어디서든 접속됩니다.' },
];
const MATERIALS = [['7.85', '탄소강(7.85)'], ['2.7', '알루미늄(2.7)'], ['7.9', '스테인리스(7.9)']];
const FAVORITES = ['260*4, 175*1', '165*6, 225*1', '200*5, 210*1', '75*16'];

function todayStr() { return new Date().toISOString().slice(0, 10); }
function monthStartStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; }
// 한국 시간(KST) 기준 YYYY-MM-DD — 엔팩스 접수함의 "오늘" 판정에 사용 (UTC 자정~오전9시 경계 오차 방지)
function kstDateStr(d) { return new Date(d).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }); }
// "2026-07-19" → "7월 19일" — 대표 화면 조회 기간 표시에 사용
function fmtKDate(s) { if (!s) return ''; const [, m, d] = s.split('-'); return `${parseInt(m, 10)}월 ${parseInt(d, 10)}일`; }
// N개월 전 날짜(YYYY-MM-DD, KST 기준) — 고객사 포털 작업/출고 내역 기간 프리셋에 사용
function monthsAgoStr(n) { const d = new Date(); d.setMonth(d.getMonth() - n); return kstDateStr(d); }
function hoursSince(iso) { if (!iso) return 0; return (Date.now() - new Date(iso).getTime()) / 3600000; }
// 그린ERP 최종 동기화 시각 표시용 — "오후 5:32" 형태(KST)
function fmtKTime(iso) { if (!iso) return '-'; return new Date(iso).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }); }
function minsSince(iso) { if (!iso) return null; return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000)); }
function secsSince(iso) { if (!iso) return null; return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000)); }
function prodBadge(t) {
  t = t || '자사생산';
  const bg = t === '임가공' ? C.bgWarning : (t === '외주가공' ? C.bgAccent : C.bgSuccess);
  const fg = t === '임가공' ? C.textWarning : (t === '외주가공' ? C.textAccent : C.textSuccess);
  return <span style={{ display: 'inline-block', fontSize: '13px', padding: '2px 7px', borderRadius: '8px', background: bg, color: fg, fontWeight: 700 }}>{t}</span>;
}
function statCard(label, val, color) {
  return (
    <div style={{ background: C.surface1, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(15,30,51,0.05)' }}>
      <div style={{ fontSize: '15px', color: C.textMuted, marginBottom: '5px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 800, color: color || C.textPrimary }}>{val}</div>
    </div>
  );
}
function timelineHtml(activeKey) {
  const idx = statusIndex(activeKey);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', margin: '12px 0' }}>
      {STATUSES.map((s, i) => (
        <div key={s[0]} style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ width: '13px', height: '13px', borderRadius: '50%', margin: '0 auto 5px', background: i <= idx ? C.accent : C.borderStrong }} />
          <div style={{ fontSize: '14px', color: i === idx ? C.textAccent : C.textMuted }}>{s[1]}</div>
        </div>
      ))}
    </div>
  );
}
function coilTableRows(list) {
  return list.map((c) => `<tr><td>${c.coil_code}</td><td>${c.thickness}</td><td>${c.spec || '-'}</td><td>Bay ${c.bay_location || '-'}</td><td>${Number(c.remain_weight || 0).toLocaleString()}Kg</td><td>${c.received_date || '-'}</td></tr>`).join('');
}
function coilTableHtmlStr(list) {
  if (!list.length) return '<div style="font-size:15px;color:#8592A6;padding:8px 0;">해당 조건의 재고가 없습니다.</div>';
  return `<table style="width:100%;border-collapse:collapse;"><thead><tr><th>코일ID</th><th>두께</th><th>규격</th><th>위치</th><th>잔량</th><th>입고일</th></tr></thead><tbody>${coilTableRows(list)}</tbody></table>`;
}
function printHTML(title, bodyHtml) {
  const w = window.open('', '_blank', 'width=920,height=720');
  if (!w) { alert('팝업이 차단되었습니다. 브라우저의 팝업 차단을 해제해주세요.'); return; }
  w.document.write(`<html><head><meta charset="UTF-8"><title>${title}</title><style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Pretendard,sans-serif;padding:24px;color:#0F1E33;}
    h2{margin:0 0 4px;font-size:24px;} .meta{font-size:14px;color:#8592A6;margin-bottom:16px;}
    table{width:100%;border-collapse:collapse;} th,td{border:1px solid #C9D2E0;padding:8px 10px;font-size:15px;text-align:left;}
    th{background:#F4F6FA;color:#4D5C72;} @media print{button{display:none;}}
  </style></head><body><h2>${title}</h2><div class="meta">오성철강 스마트 ERP 2.0 · 출력일시 ${new Date().toLocaleString('ko-KR')}</div>
  ${bodyHtml}<div style="margin-top:18px;"><button onclick="window.print()" style="font-size:16px;padding:8px 16px;">인쇄</button></div></body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
}

/* ==================================================================== */
function SalesWorkflowPage() {
  const [role, setRole] = useState('EX');
  const [orders, setOrders] = useState([]);
  const [coils, setCoils] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [enfaxInbox, setEnfaxInbox] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [todayExpense, setTodayExpense] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [o, c, comp, fax, inq, ledger] = await Promise.all([
      supabase.from('sales_orders').select('*, coils(*)').order('priority', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('coils').select('*').order('thickness', { ascending: true }),
      supabase.from('companies').select('*').order('name', { ascending: true }),
      supabase.from('enfax_inbox').select('*').order('received_at', { ascending: false }).limit(50),
      supabase.from('company_inquiries').select('*').order('created_at', { ascending: false }),
      supabase.from('daily_ledger').select('amount').eq('trans_date', todayStr()).eq('type', '지출'),
    ]);
    setOrders(o.data || []);
    setCoils(c.data || []);
    setCompanies(comp.data || []);
    setEnfaxInbox(fax.data || []);
    setInquiries(inq.data || []);
    setTodayExpense((ledger.data || []).reduce((s, r) => s + Number(r.amount || 0), 0));
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ---- 공통 mutation 함수 (여러 역할 화면에서 재사용) ---- */
  const genOrderNo = () => {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const seq = String(orders.filter((o) => o.order_no.startsWith(ymd)).length + 1).padStart(2, '0');
    return `${ymd}${seq}`;
  };

  const createOrder = async (payload, items) => {
    const order_no = genOrderNo();
    const { data, error } = await supabase.from('sales_orders').insert({ order_no, ...payload }).select().single();
    if (error) { alert('발주 등록 실패: ' + error.message); return null; }
    if (items && items.length) {
      const rows = items.filter((it) => it.thick || it.slit).map((it) => ({ order_id: data.id, thickness: it.thick, width: it.width, weight: it.weight, maker: it.maker, slit_spec: it.slit, qty: it.qty }));
      if (rows.length) await supabase.from('order_items').insert(rows);
    }
    await fetchAll();
    return data;
  };

  const updateOrder = async (id, patch) => {
    const { error } = await supabase.from('sales_orders').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { alert('처리 실패: ' + error.message); return false; }
    await fetchAll();
    return true;
  };

  const deleteOrder = async (id) => {
    await supabase.from('sales_orders').delete().eq('id', id);
    await fetchAll();
  };

  const assignToDriver = async (id) => updateOrder(id, { status: 'SEARCH' });

  const selectCoil = async (orderId, coilId) => updateOrder(orderId, { coil_id: coilId, status: 'WORKING' });

  const completeWork = async (orderId) => updateOrder(orderId, { status: 'DONE' });

  const logCall = async (order) => {
    const log = Array.isArray(order.call_log) ? order.call_log : [];
    log.push(new Date().toLocaleString('ko-KR') + ' 현장 확인 요청 기록됨');
    await updateOrder(order.id, { call_log: log });
  };

  const notifyCustomer = async (id) => updateOrder(id, { notified: true });

  const dispatchOrder = async (id, driverName, vehicleNo, dispatchTime) =>
    updateOrder(id, { status: 'DISPATCH', driver_name: driverName, vehicle_no: vehicleNo, dispatch_time: dispatchTime });

  const shipOrder = async (order, actualWeight) => {
    const ok = await updateOrder(order.id, { status: 'SHIPPED', actual_weight: actualWeight || order.weight });
    if (ok && order.coil_id && order.coils) {
      const newRemain = Math.max(0, Number(order.coils.remain_weight || 0) - Number(actualWeight || order.weight || 0));
      await supabase.from('coils').update({ remain_weight: newRemain, status: newRemain <= 0 ? '소진' : '재고' }).eq('id', order.coil_id);
      await fetchAll();
    }
  };

  const saveCompanyField = async (companyId, patch) => {
    await supabase.from('companies').update(patch).eq('id', companyId);
    await fetchAll();
  };

  const addInquiry = async (companyId, note) => {
    if (!note) return;
    await supabase.from('company_inquiries').insert({ company_id: companyId, note });
    await fetchAll();
  };

  const requestFinanceCheck = async (companyId) => saveCompanyField(companyId, { finance_check_requested: true });

  const confirmEnfax = async (fax) => {
    await supabase.from('enfax_inbox').update({ status: 'done' }).eq('id', fax.id);
    await fetchAll();
  };

  const toggleCoilClosed = async (coil) => {
    await supabase.from('coils').update({ closed: !coil.closed }).eq('id', coil.id);
    await fetchAll();
  };

  const moveOrderPriority = async (order, dir) => {
    const sameStatus = orders.filter((o) => o.status === order.status).sort((a, b) => b.priority - a.priority);
    const idx = sameStatus.findIndex((o) => o.id === order.id);
    const swapWith = dir === 'up' ? sameStatus[idx - 1] : sameStatus[idx + 1];
    if (!swapWith) return;
    await Promise.all([
      supabase.from('sales_orders').update({ priority: swapWith.priority }).eq('id', order.id),
      supabase.from('sales_orders').update({ priority: order.priority }).eq('id', swapWith.id),
    ]);
    await fetchAll();
  };

  if (loading) return <div style={{ color: C.textMuted, fontSize: '18px', padding: '30px 0' }}>불러오는 중...</div>;

  const goto = (r, sub) => { setRole(r); if (sub) window.__ofInitialSub = sub; };

  return (
    <div style={{ background: C.surface0, minHeight: '100%', padding: '4px 4px 40px' }}>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {ROLES.map(([k, label]) => (
          <button key={k} style={btnStyle(role === k)} onClick={() => setRole(k)}>{label}</button>
        ))}
      </div>
      <div style={cardWrap}>
        {role === 'EX' && <ExecRole orders={orders} coils={coils} companies={companies} todayExpense={todayExpense} onGoto={goto} />}
        {role === 'MG' && <AdminRole orders={orders} coils={coils} onUpdateOrder={updateOrder} onDeleteOrder={deleteOrder} onToggleCoilClosed={toggleCoilClosed} />}
        {role === 'OF' && (
          <SalesRole
            orders={orders} coils={coils} companies={companies} enfaxInbox={enfaxInbox} inquiries={inquiries}
            onCreateOrder={createOrder} onAssignToDriver={assignToDriver} onUpdateOrder={updateOrder}
            onDeleteOrder={deleteOrder} onLogCall={logCall} onNotifyCustomer={notifyCustomer} onDispatchOrder={dispatchOrder}
            onShipOrder={shipOrder} onSaveCompanyField={saveCompanyField} onAddInquiry={addInquiry}
            onRequestFinanceCheck={requestFinanceCheck} onConfirmEnfax={confirmEnfax} onMovePriority={moveOrderPriority}
            fetchAll={fetchAll}
          />
        )}
        {role === 'FL' && <ForkliftRole orders={orders} coils={coils} onSelectCoil={selectCoil} onCompleteOrder={completeWork} />}
      </div>
    </div>
  );
}

/* ============================== EX 대표 ============================== */
const WORK_TYPE_GROUPS = [
  { key: 'SLITING', label: '슬리팅1' },
  { key: 'SLITING2', label: '슬리팅2' },
  { key: 'LEVELLING', label: '레벨링' },
];

function aggByCompany(rows) {
  const m = {};
  rows.forEach((r) => {
    if (!m[r.company_name]) m[r.company_name] = { count: 0, amount: 0 };
    m[r.company_name].count += 1;
    m[r.company_name].amount += Number(r.amount || 0);
  });
  return Object.entries(m).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.amount - a.amount);
}

function ExecRole({ orders, coils, companies, todayExpense, onGoto }) {
  const todayK = kstDateStr(new Date());
  const [selStart, setSelStart] = useState(todayK);
  const [selEnd, setSelEnd] = useState(todayK);
  const [erpJobs, setErpJobs] = useState([]);           // greenp_production (그린ERP 실적) — 선택 기간
  const [erpExpense, setErpExpense] = useState(0);       // expense_requests(결재완료) — 선택 기간
  const [monthErpJobs, setMonthErpJobs] = useState([]);  // greenp_production — 이번달 전체(추이 차트용)
  const [loadingRange, setLoadingRange] = useState(false);
  const [lastSync, setLastSync] = useState(null);        // greenp_sync_logs 최종 성공 동기화 시각
  const [nowTick, setNowTick] = useState(Date.now());     // "n분 n초 전" 초단위 실시간 표시용

  // 그린ERP 최종 데이터 갱신 시각 — 30초마다 DB에서 새로고침
  useEffect(() => {
    const fetchLastSync = () => {
      supabase.from('greenp_sync_logs').select('synced_at').eq('status', '성공').order('synced_at', { ascending: false }).limit(1)
        .then(({ data }) => { if (data && data[0]) setLastSync(data[0].synced_at); });
    };
    fetchLastSync();
    const timer = setInterval(fetchLastSync, 30000);
    return () => clearInterval(timer);
  }, []);

  // 경과 시간(n분 n초 전)을 초단위로 실시간 카운트하기 위한 1초 틱
  useEffect(() => {
    const tick = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingRange(true);
    (async () => {
      const [prod, exp, monthProd] = await Promise.all([
        supabase.from('greenp_production').select('*').gte('slip_date', selStart).lte('slip_date', selEnd).order('slip_date', { ascending: false }),
        supabase.from('expense_requests').select('total_amount, request_date').eq('status', '결재완료').gte('request_date', selStart).lte('request_date', selEnd),
        supabase.from('greenp_production').select('slip_date, amount').gte('slip_date', monthStartStr()),
      ]);
      if (cancelled) return;
      setErpJobs(prod.data || []);
      setErpExpense((exp.data || []).reduce((s, r) => s + Number(r.total_amount || 0), 0));
      setMonthErpJobs(monthProd.data || []);
      setLoadingRange(false);
    })();
    return () => { cancelled = true; };
  }, [selStart, selEnd]);

  const now = new Date();
  const dow = now.getDay();
  const monDate = new Date(now); monDate.setDate(now.getDate() + (dow === 0 ? -6 : 1 - dow));
  const weekStartK = kstDateStr(monDate);
  const monthStartK = monthStartStr();
  const isToday = selStart === todayK && selEnd === todayK;
  const isThisWeek = selStart === weekStartK && selEnd === todayK;
  const isThisMonth = selStart === monthStartK && selEnd === todayK;
  const isSingleDay = selStart === selEnd;
  const rangeLabel = isToday ? '오늘' : (isSingleDay ? fmtKDate(selStart) : `${fmtKDate(selStart)} ~ ${fmtKDate(selEnd)}`);
  void nowTick; // 1초마다 재렌더링을 유도해 아래 경과시간이 초단위로 갱신되도록 함
  const syncTotalSecs = secsSince(lastSync);
  const syncMins = syncTotalSecs === null ? null : Math.floor(syncTotalSecs / 60);
  const syncSecs = syncTotalSecs === null ? null : syncTotalSecs % 60;
  const syncFresh = syncMins !== null && syncMins <= 15;
  const syncStale = syncMins !== null && syncMins > 60;
  const syncColor = syncStale ? C.textDanger : (syncFresh ? C.textSuccess : C.textWarning);
  const syncBg = syncStale ? C.bgDanger : (syncFresh ? C.bgSuccess : C.bgWarning);
  const syncAgoLabel = syncTotalSecs === null ? '' : (syncMins > 0 ? `${syncMins}분 ${syncSecs}초 전` : `${syncSecs}초 전`);

  const setPresetToday = () => { setSelStart(todayK); setSelEnd(todayK); };
  const setPresetWeek = () => { setSelStart(weekStartK); setSelEnd(todayK); };
  const setPresetMonth = () => { setSelStart(monthStartK); setSelEnd(todayK); };

  // ---- 그린ERP 실적 리포트 (greenp_production 실데이터 기준) ----
  const jobCount = erpJobs.length;
  const totalRevenue = erpJobs.reduce((s, r) => s + Number(r.amount || 0), 0);
  const companySet = new Set(erpJobs.map((r) => r.company_name));
  const net = totalRevenue - erpExpense;

  const jobsByType = (key) => erpJobs.filter((j) => j.work_type === key);
  const otherJobs = erpJobs.filter((j) => !WORK_TYPE_GROUPS.some((g) => g.key === j.work_type));
  const topCompanies = aggByCompany(erpJobs).slice(0, 5);

  // ---- 이 앱 자체 발주 접수 현황 (sales_orders, 실시간) ----
  const rangeOrders = orders.filter((o) => o.order_date >= selStart && o.order_date <= selEnd);
  const inProgress = rangeOrders.filter((o) => o.status === 'SEARCH' || o.status === 'WORKING').length;
  const dispatchCnt = rangeOrders.filter((o) => o.status === 'DISPATCH').length;
  const appWeight = rangeOrders.reduce((s, o) => s + Number(o.weight || 0), 0);
  const stuck = orders.filter((o) => o.status === 'WORKING' && hoursSince(o.updated_at) >= 8);

  // 이번달 매출 추이 (일자별) — 그린ERP 실데이터 기준, 상단 기간 선택과 무관하게 항상 이번달
  const byDay = {};
  monthErpJobs.forEach((r) => { byDay[r.slip_date] = (byDay[r.slip_date] || 0) + Number(r.amount || 0); });
  const days = Object.keys(byDay).sort();
  const maxDay = Math.max(1, ...Object.values(byDay));
  const monthTotal = Object.values(byDay).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: C.surface1, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(15,30,51,0.05)' }}>
        <span style={{ fontSize: '16px', fontWeight: 700, color: C.textSecondary }}>📅 조회 기간</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button style={btnStyle(isToday)} onClick={setPresetToday}>오늘</button>
          <button style={btnStyle(isThisWeek)} onClick={setPresetWeek}>이번주</button>
          <button style={btnStyle(isThisMonth)} onClick={setPresetMonth}>이번달</button>
        </div>
        <input type="date" value={selStart} max={selEnd} onChange={(e) => setSelStart(e.target.value)} style={{ ...inputStyle, height: '38px', width: '150px', fontSize: '15px' }} />
        <span style={{ color: C.textMuted }}>~</span>
        <input type="date" value={selEnd} min={selStart} max={todayK} onChange={(e) => setSelEnd(e.target.value)} style={{ ...inputStyle, height: '38px', width: '150px', fontSize: '15px' }} />
        <span style={{ fontSize: '15px', color: C.textAccent, fontWeight: 700, marginLeft: 'auto' }}>{rangeLabel} 기준{loadingRange ? ' · 불러오는 중...' : ''}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', margin: '4px 0 8px' }}>
        <div style={{ fontSize: '19px', fontWeight: 700, color: C.textSecondary }}>📊 그린ERP 실적 리포트 <span style={{ fontSize: '14px', fontWeight: 500, color: C.textMuted }}>(그린ERP 동기화 실데이터 · {rangeLabel})</span></div>
        <span style={{ fontSize: '13px', fontWeight: 700, color: syncColor, background: syncBg, padding: '5px 12px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          🔄 최종 데이터 갱신: {fmtKTime(lastSync)}{syncAgoLabel && ` (${syncAgoLabel})`}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '10px', marginBottom: '16px' }}>
        {statCard('작업 건수', jobCount + '건')}
        {statCard('매출액', Math.round(totalRevenue / 10000).toLocaleString() + '만원', C.textAccent)}
        {statCard('거래처 수', companySet.size + '개')}
        {statCard('비용(결재완료)', Math.round(erpExpense / 10000).toLocaleString() + '만원', C.textWarning)}
        {statCard('순손익', (net >= 0 ? '+' : '') + Math.round(net / 10000).toLocaleString() + '만원', net >= 0 ? C.textSuccess : C.textDanger)}
      </div>

      <div style={{ fontSize: '19px', fontWeight: 700, margin: '16px 0 8px', color: C.textSecondary }}>🛠 작업 내용 <span style={{ fontSize: '14px', fontWeight: 500, color: C.textMuted }}>({rangeLabel} · 슬리팅1/슬리팅2/레벨링, 그린ERP 연동)</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '12px', marginBottom: '8px' }}>
        {WORK_TYPE_GROUPS.map((g) => {
          const rows = jobsByType(g.key);
          const amt = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
          const byCo = aggByCompany(rows);
          return (
            <div key={g.key} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px', boxShadow: '0 1px 3px rgba(15,30,51,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                <span style={{ fontSize: '17px', fontWeight: 800, color: C.textAccent }}>{g.label}</span>
                <span style={{ fontSize: '13px', color: C.textMuted }}>{rows.length}건</span>
              </div>
              {byCo.length === 0 ? (
                <div style={{ fontSize: '14px', color: C.textMuted, padding: '10px 0' }}>해당 기간 작업 내역 없음</div>
              ) : (
                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  {byCo.slice(0, 8).map((c) => (
                    <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${C.border}`, fontSize: '14px' }}>
                      <span style={{ fontWeight: 700, color: C.textPrimary }}>{c.name} <span style={{ fontWeight: 500, color: C.textMuted }}>({c.count}건)</span></span>
                      <span style={{ color: C.textSecondary }}>{c.amount.toLocaleString()}원</span>
                    </div>
                  ))}
                  {byCo.length > 8 && <div style={{ fontSize: '13px', color: C.textMuted, padding: '6px 0' }}>외 {byCo.length - 8}개 거래처 더</div>}
                </div>
              )}
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${C.border}`, textAlign: 'right', fontSize: '14px', fontWeight: 700, color: C.textSecondary }}>소계 {amt.toLocaleString()}원</div>
            </div>
          );
        })}
      </div>
      {otherJobs.length > 0 && <div style={{ fontSize: '13px', color: C.textMuted, marginBottom: '18px' }}>* 미분류 작업 {otherJobs.length}건은 위 3개 라인에 속하지 않아 제외됨</div>}

      <div style={{ fontSize: '19px', fontWeight: 700, margin: '16px 0 8px', color: C.textSecondary }}>🏢 거래처별 매출 TOP5 <span style={{ fontSize: '14px', fontWeight: 500, color: C.textMuted }}>({rangeLabel})</span></div>
      <div style={{ background: C.surface1, borderRadius: '10px', padding: '16px', marginBottom: '18px', boxShadow: '0 1px 3px rgba(15,30,51,0.05)' }}>
        {topCompanies.length === 0 ? boxMsg('해당 기간 매출 실적이 없습니다.', { justifyContent: 'center' }) : topCompanies.map((c, i) => {
          const pct = Math.round((c.amount / topCompanies[0].amount) * 100);
          return (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '9px' }}>
              <span style={{ width: '18px', fontSize: '14px', color: C.textMuted, fontWeight: 700 }}>{i + 1}</span>
              <span style={{ width: '140px', fontSize: '15px', color: C.textPrimary, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              <div style={{ flex: 1, background: C.surface2, borderRadius: '6px', overflow: 'hidden', height: '14px' }}><div style={{ width: pct + '%', height: '100%', background: C.accent }} /></div>
              <span style={{ width: '120px', textAlign: 'right', fontSize: '15px', fontWeight: 700 }}>{c.amount.toLocaleString()}원</span>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: '19px', fontWeight: 700, margin: '16px 0 8px', color: C.textSecondary }}>📈 이번달 매출 추이 <span style={{ fontSize: '14px', fontWeight: 500, color: C.textMuted }}>(그린ERP 실데이터 기준)</span></div>
      <div style={{ background: C.surface1, borderRadius: '10px', padding: '16px', marginBottom: '18px', boxShadow: '0 1px 3px rgba(15,30,51,0.05)' }}>
        {days.length === 0 ? boxMsg('이번달 그린ERP 실적이 없습니다.', { justifyContent: 'center' }) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '80px', marginBottom: '4px' }}>
              {days.map((d) => (
                <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }} title={`${d} · ${Math.round(byDay[d]).toLocaleString()}원`}>
                  <div style={{ width: '100%', maxWidth: '16px', margin: '0 auto', height: `${Math.round((byDay[d] / maxDay) * 100)}%`, borderRadius: '3px 3px 0 0', background: d === todayK ? C.accent : C.bgAccent, border: d === todayK ? 'none' : `1px solid ${C.borderAccent}` }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', color: C.textSecondary, borderTop: `1px solid ${C.border}`, paddingTop: '10px' }}>
              <span>이번달 누적 매출(그린ERP): <b style={{ color: C.textPrimary }}>{Math.round(monthTotal).toLocaleString()}원</b></span>
            </div>
          </>
        )}
      </div>

      <div style={{ fontSize: '19px', fontWeight: 700, margin: '24px 0 8px', color: C.textSecondary, borderTop: `2px solid ${C.border}`, paddingTop: '16px' }}>📥 이 앱 자체 발주 접수 현황 <span style={{ fontSize: '14px', fontWeight: 500, color: C.textMuted }}>(실시간 · 이 화면에서 직접 접수한 발주만 집계, 그린ERP와 별도)</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '10px', marginBottom: '10px' }}>
        {statCard('발주', rangeOrders.length + '건')}
        {statCard('진행중', inProgress + '건')}
        {statCard('출고예정', dispatchCnt + '건')}
        {statCard('총 중량', (appWeight / 1000).toFixed(1) + '톤')}
      </div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
        {STATUSES.map(([k, label]) => {
          const cnt = rangeOrders.filter((o) => o.status === k).length;
          return (
            <div key={k} style={{ flex: 1, cursor: 'pointer' }} onClick={() => onGoto('OF', 'kanban')}>
              <div style={{ fontSize: '14px', color: C.textMuted, textAlign: 'center', marginBottom: '5px' }}>{label}</div>
              {boxMsg(cnt + '건', { justifyContent: 'center', textAlign: 'center', fontSize: '18px' })}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: '19px', fontWeight: 700, margin: '16px 0 8px', color: C.textDanger }}>⚠️ 이상 신호 <span style={{ fontSize: '14px', fontWeight: 500, color: C.textMuted }}>(실시간)</span></div>
      {stuck.length === 0 ? boxMsg('현재 지연 건 없음', { justifyContent: 'center', textAlign: 'center' }) : stuck.map((o) => (
        <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', border: `1px solid ${C.borderWarning}`, background: C.bgWarning, borderRadius: '8px', marginBottom: '7px', fontSize: '16px', color: C.textWarning }}>
          <span style={{ flex: 1 }}>{o.company_name} · {o.order_no} · 작업중 {Math.floor(hoursSince(o.updated_at))}시간 경과</span>
          <button style={smallBtn()} onClick={() => onGoto('MG')}>관리자에서 보기</button>
        </div>
      ))}

      <div style={{ fontSize: '19px', fontWeight: 700, margin: '20px 0 8px', color: C.textSecondary }}>🏆 경쟁 ERP 대비 우리 강점</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: '10px' }}>
        {EDGE_POINTS.map((p) => (
          <div key={p.t} style={{ background: C.surface1, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '12px', boxShadow: '0 1px 3px rgba(15,30,51,0.04)' }}>
            <div style={{ fontSize: '17px', fontWeight: 700, color: C.textAccent, marginBottom: '4px' }}>✓ {p.t}</div>
            <div style={{ fontSize: '14px', color: C.textSecondary, lineHeight: 1.5 }}>{p.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================== MG 관리자 ============================== */
function AdminRole({ orders, coils, onUpdateOrder, onDeleteOrder, onToggleCoilClosed }) {
  const [sub, setSub] = useState('search');
  const [q, setQ] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const filtered = orders.filter((o) => !q || o.order_no.includes(q) || o.company_name.toLowerCase().includes(q.toLowerCase()));
  const detail = orders.find((o) => o.id === detailId);

  const startEdit = (o) => { setEditingId(o.id); setEditForm({ company_name: o.company_name, thickness: o.thickness }); };
  const saveEdit = async (id) => {
    if (!editForm.company_name || !editForm.thickness) { alert('거래처와 두께를 입력하세요.'); return; }
    await onUpdateOrder(id, { company_name: editForm.company_name, thickness: parseFloat(editForm.thickness) });
    setEditingId(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {MG_SUBS.map(([k, label]) => <button key={k} style={btnStyle(sub === k)} onClick={() => setSub(k)}>{label}</button>)}
      </div>

      {sub === 'search' && (
        <div>
          <input style={{ ...inputStyle, marginBottom: '12px' }} placeholder="코일ID · 거래처명 · 발주번호 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          <table style={{ ...itemsTable, marginBottom: '14px' }}>
            <thead><tr><th style={th}>발주번호</th><th style={th}>거래처</th><th style={th}>두께</th><th style={th}>생산유형</th><th style={th}>상태</th><th style={th}></th></tr></thead>
            <tbody>
              {filtered.map((o) => editingId === o.id ? (
                <tr key={o.id}>
                  <td style={td}>{o.order_no}</td>
                  <td style={td}><input style={{ ...inputStyle, height: '34px', fontSize: '15px' }} value={editForm.company_name} onChange={(e) => setEditForm((f) => ({ ...f, company_name: e.target.value }))} /></td>
                  <td style={td}><input style={{ ...inputStyle, height: '34px', fontSize: '15px', width: '80px' }} value={editForm.thickness} onChange={(e) => setEditForm((f) => ({ ...f, thickness: e.target.value }))} /></td>
                  <td style={td}>{prodBadge(o.prod_type)}</td><td style={td}>{statusLabel(o.status)}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <button style={smallBtn('accent')} onClick={() => saveEdit(o.id)}>저장</button>{' '}
                    <button style={smallBtn()} onClick={() => setEditingId(null)}>취소</button>
                  </td>
                </tr>
              ) : (
                <tr key={o.id}>
                  <td style={td}>{o.order_no}</td><td style={td}>{o.company_name}</td><td style={td}>{o.thickness}</td>
                  <td style={td}>{prodBadge(o.prod_type)}</td><td style={td}>{statusLabel(o.status)}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <button style={smallBtn()} onClick={() => setDetailId(o.id)}>추적</button>{' '}
                    <button style={smallBtn()} onClick={() => startEdit(o)}>수정</button>{' '}
                    <button style={smallBtn('danger')} onClick={() => { if (window.confirm(o.order_no + ' 발주를 삭제하시겠습니까? 되돌릴 수 없습니다.')) { onDeleteOrder(o.id); setDetailId(null); } }}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {detail ? (
            <div>
              <div style={{ fontSize: '19px', fontWeight: 700, marginBottom: '4px' }}>{detail.company_name} · {detail.order_no} 전후공정 추적 {prodBadge(detail.prod_type)}</div>
              {timelineHtml(detail.status)}
              {boxMsg(detail.coils ? `배정 코일: ${detail.coils.coil_code}` : '코일 미배정', { justifyContent: 'center' })}
            </div>
          ) : boxMsg("발주를 검색하거나 '추적' 버튼을 눌러 앞뒤 공정을 확인하세요.", {})}
        </div>
      )}

      {sub === 'inventory' && (
        <div>
          {boxMsg('코일별 현재고·위치·마감 상태(계산서 등록 완료 건은 수정 잠금)를 한눈에 확인합니다.', { marginBottom: '12px' })}
          <table style={itemsTable}>
            <thead><tr><th style={th}>코일ID</th><th style={th}>두께</th><th style={th}>위치</th><th style={th}>잔량</th><th style={th}>마감 상태</th></tr></thead>
            <tbody>
              {coils.map((c) => (
                <tr key={c.id}>
                  <td style={td}>{c.coil_code}</td><td style={td}>{c.thickness}</td><td style={td}>Bay {c.bay_location || '-'}</td>
                  <td style={td}>{Number(c.remain_weight || 0).toLocaleString()}Kg</td>
                  <td style={td}>
                    <button
                      style={{ fontSize: '13px', padding: '2px 8px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', background: c.closed ? C.bgSuccess : C.bgWarning, color: c.closed ? C.textSuccess : C.textWarning }}
                      onClick={() => onToggleCoilClosed(c)}
                    >{c.closed ? '🔒 마감(계산서 등록완료)' : '진행중(클릭 시 마감)'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============================== OF 영업 ============================== */
function SalesRole(props) {
  const { orders, coils, companies, enfaxInbox, inquiries, onCreateOrder, onAssignToDriver, onUpdateOrder, onDeleteOrder, onLogCall, onNotifyCustomer, onDispatchOrder, onShipOrder, onSaveCompanyField, onAddInquiry, onRequestFinanceCheck, onConfirmEnfax, onMovePriority, fetchAll } = props;
  const [sub, setSub] = useState(window.__ofInitialSub || 'kanban');
  useEffect(() => { if (window.__ofInitialSub) { window.__ofInitialSub = null; } }, []);

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {OF_SUBS.map(([k, label]) => <button key={k} style={btnStyle(sub === k)} onClick={() => setSub(k)}>{label}</button>)}
      </div>
      {sub === 'kanban' && <OFKanban orders={orders} onGoto={setSub} />}
      {sub === 'register' && <OFRegister companies={companies} enfaxInbox={enfaxInbox} onCreateOrder={onCreateOrder} onConfirmEnfax={onConfirmEnfax} onGoto={setSub} fetchAll={fetchAll} />}
      {sub === 'assign' && <OFAssign orders={orders} coils={coils} onAssignToDriver={onAssignToDriver} />}
      {sub === 'workorder' && <OFWorkorder orders={orders} onMovePriority={onMovePriority} onUpdateOrder={onUpdateOrder} />}
      {sub === 'monitor' && <OFMonitor orders={orders} onLogCall={onLogCall} />}
      {sub === 'notify' && <OFNotify orders={orders} onNotifyCustomer={onNotifyCustomer} onDispatchOrder={onDispatchOrder} />}
      {sub === 'shipment' && <OFShipment orders={orders} onShipOrder={onShipOrder} />}
      {sub === 'aftercare' && <OFAftercare orders={orders} companies={companies} inquiries={inquiries} onSaveCompanyField={onSaveCompanyField} onAddInquiry={onAddInquiry} onRequestFinanceCheck={onRequestFinanceCheck} />}
    </div>
  );
}

function OFKanban({ orders, onGoto }) {
  const targetSubFor = (status) => ({ RECEIVED: 'assign', SEARCH: 'workorder', WORKING: 'workorder', DONE: 'notify', DISPATCH: 'shipment' }[status] || null);
  return (
    <div>
      {boxMsg('전체 발주를 상태별로 조망합니다. 실제 처리는 아래 ①~⑦ 단계별 화면에서 이루어집니다.', { marginBottom: '10px' })}
      <div style={{ display: 'flex', gap: '6px' }}>
        {STATUSES.map(([key, label]) => {
          const list = orders.filter((o) => o.status === key);
          return (
            <div key={key} style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '15px', color: C.textSecondary, marginBottom: '7px', textAlign: 'center', whiteSpace: 'nowrap' }}>{label} ({list.length})</div>
              {list.map((o) => {
                const target = targetSubFor(o.status);
                return (
                  <div key={o.id} style={{ background: C.surface1, border: `1px solid ${o.urgent ? C.borderDanger : C.border}`, borderRadius: '8px', padding: '8px', marginBottom: '7px' }}>
                    {o.urgent && <div style={{ fontSize: '13px', fontWeight: 700, color: C.textDanger, marginBottom: '3px' }}>🔺 긴급</div>}
                    <div style={{ marginBottom: '3px' }}>{prodBadge(o.prod_type)}</div>
                    <div style={{ fontWeight: 700, fontSize: '17px', marginBottom: '3px' }}>{o.company_name}</div>
                    <div style={{ color: C.textMuted, fontSize: '14px', marginBottom: '7px' }}>{o.order_no}<br />두께 {o.thickness}</div>
                    {target ? <button style={{ ...smallBtn(), width: '100%' }} onClick={() => onGoto(target)}>{OF_SUBS.find((x) => x[0] === target)[1]} →</button> : <div style={{ color: C.textSuccess, fontSize: '14px', textAlign: 'center' }}>✓ 완료</div>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OFRegister({ companies, enfaxInbox, onCreateOrder, onConfirmEnfax, onGoto, fetchAll }) {
  const emptyItem = { thick: '', width: '', weight: '', maker: '', slit: '', qty: '' };
  const [sender, setSender] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [phone, setPhone] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [prodType, setProdType] = useState('자사생산');
  const [outsourceTo, setOutsourceTo] = useState('');
  const [items, setItems] = useState([emptyItem]);
  const [material, setMaterial] = useState('7.85');
  const [ct, setCt] = useState(''); const [cw, setCw] = useState(''); const [cl, setCl] = useState('');
  const [dupTarget, setDupTarget] = useState(null);
  const [ocrLoadingId, setOcrLoadingId] = useState(null);

  const matchedCompany = companies.find((c) => c.name === companyName);
  const unitWeight = (ct && cw && cl) ? ((parseFloat(ct) * parseFloat(cw) * parseFloat(cl) * parseFloat(material)) / 1000000) : null;

  const setItemField = (i, field, val) => setItems((list) => list.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  const addRow = () => setItems((list) => [...list, { ...emptyItem }]);
  const removeRow = (i) => setItems((list) => list.filter((_, idx) => idx !== i));
  const addFavorite = (spec) => setItems((list) => [...list, { thick: '', width: '1219', weight: '', maker: '', slit: spec, qty: '1' }]);

  const duplicateLatest = async () => {
    if (!companyName) { alert('업체명을 먼저 입력하세요.'); return; }
    const { data } = await supabase.from('sales_orders').select('*, order_items(*)').eq('company_name', companyName).order('created_at', { ascending: false }).limit(1);
    const last = data && data[0];
    if (!last) { alert('이 거래처의 이전 발주 이력이 없습니다.'); return; }
    setSender(last.sender || ''); setDueDate(last.due_date || ''); setPhone(last.contact_phone || ''); setProdType(last.prod_type || '자사생산');
    if (last.order_items && last.order_items.length) setItems(last.order_items.map((it) => ({ thick: it.thickness || '', width: it.width || '', weight: it.weight || '', maker: it.maker || '', slit: it.slit_spec || '', qty: it.qty || '' })));
    setDupTarget(last.order_no);
  };

  const submit = async () => {
    if (!companyName) { alert('업체명을 입력하세요.'); return; }
    const firstThick = items[0]?.thick;
    if (!firstThick) { alert('첫 품목의 두께를 입력하세요.'); return; }
    const totalWeightKg = items.reduce((s, it) => s + (parseFloat(it.weight) || 0), 0) * 1000 || null;
    const res = await onCreateOrder({
      company_name: companyName, thickness: parseFloat(firstThick), weight: totalWeightKg,
      urgent, prod_type: prodType, outsourcing_company: prodType === '외주가공' ? (outsourceTo || null) : null,
      status: 'RECEIVED', due_date: dueDate || null, sender: sender || null, contact_phone: phone || null,
    }, items);
    if (res) {
      alert((urgent ? '[긴급] ' : '') + `[${prodType}] 발주 등록 완료 · 발주번호 ${res.order_no}`);
      setSender(''); setCompanyName(''); setDueDate(''); setPhone(''); setUrgent(false); setProdType('자사생산'); setOutsourceTo(''); setItems([emptyItem]);
      onGoto('kanban');
    }
  };

  const runOcr = async (f) => {
    if (!f.file_path) { alert('파일 경로 정보가 없습니다.'); return; }
    setOcrLoadingId(f.id);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/enfax-ocr?filePath=${encodeURIComponent(f.file_path)}`);
      const json = await res.json();
      if (!json.ok) { alert('AI 인식 실패: ' + (json.error || '알 수 없는 오류')); return; }
      const ex = json.extracted || {};
      setCompanyName(ex.company_name || f.sender || '');
      setSender(f.sender || '');
      if (ex.due_date) setDueDate(ex.due_date);
      if (ex.phone) setPhone(ex.phone);
      if (Array.isArray(ex.items) && ex.items.length > 0) {
        setItems(ex.items.map((it) => ({
          thick: it.thick != null ? String(it.thick) : '',
          width: it.width != null ? String(it.width) : '',
          weight: it.weight != null ? String(it.weight) : '',
          maker: it.maker || '',
          slit: it.slit || '',
          qty: it.qty != null ? String(it.qty) : '',
        })));
      }
      alert('AI 자동인식 완료. 아래 발주 등록 폼 내용을 확인 후 접수하세요.');
    } catch (e) {
      alert('AI 인식 중 오류: ' + e.message);
    } finally {
      setOcrLoadingId(null);
    }
  };

  const todayK = kstDateStr(new Date());
  const todaysFax = enfaxInbox.filter((f) => kstDateStr(f.received_at) === todayK);
  const displayFax = todaysFax.length > 0 ? todaysFax : enfaxInbox.slice(0, 5);
  const pendingCount = displayFax.filter((f) => f.status !== 'done').length;

  return (
    <div>
      <div style={stepHead}>① 발주 원본 확인</div>
      <div style={{ background: C.surface1, border: `2px solid ${C.borderAccent}`, borderRadius: '10px', padding: '16px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '19px', fontWeight: 700, color: C.textAccent }}>📠 엔팩스 접수함</span>
          <span style={{ fontSize: '14px', color: C.textMuted }}>
            {todaysFax.length > 0 ? `오늘 수신 ${todaysFax.length}건 · 미등록 ${pendingCount}건` : (displayFax.length > 0 ? `오늘 수신 없음 · 최근 ${displayFax.length}건 표시` : '수신 없음')}
          </span>
        </div>
        {displayFax.length === 0 ? (
          <div style={{ fontSize: '14px', color: C.textMuted }}>엔팩스(fax.enfax.com)와 실시간 연동 중입니다 (10분 주기 자동 조회) · 수신된 팩스가 없습니다.</div>
        ) : displayFax.map((f) => (
          <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', background: f.status === 'new' ? C.surface0 : C.surface1, border: `1.5px solid ${f.status === 'new' ? C.borderAccent : C.border}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '8px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: f.status === 'new' ? 700 : 500 }}>{f.sender} {f.status === 'new' && <span style={{ fontSize: '12px', color: C.textAccent }}>NEW</span>}</div>
              <div style={{ fontSize: '13px', color: C.textMuted }}>{f.fax_number} · {new Date(f.received_at).toLocaleString('ko-KR')} · {f.pages}페이지 · {f.file_name}</div>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {f.status === 'new' && f.file_path && (
                <button style={smallBtn()} disabled={ocrLoadingId === f.id} onClick={() => runOcr(f)}>
                  {ocrLoadingId === f.id ? '인식 중...' : '🤖 AI 자동인식'}
                </button>
              )}
              {f.status === 'new' ? <button style={smallBtn('accent')} onClick={() => { setCompanyName(f.sender || ''); onConfirmEnfax(f); }}>확인 및 등록</button> : <span style={{ fontSize: '14px', color: C.textSuccess }}>✓ 등록완료</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '15px', color: C.textMuted }}>거래처별 최근 발주:</span>
        <button style={smallBtn()} onClick={duplicateLatest}>최근 발주 복제</button>
        {dupTarget && <span style={{ fontSize: '13px', color: C.textAccent }}>{dupTarget} 내용을 불러왔습니다</span>}
      </div>
      {matchedCompany && (
        <div style={{ background: C.bgAccent, borderRadius: '8px', padding: '12px 14px', marginBottom: '12px' }}>
          {matchedCompany.unit_price ? <div style={{ fontSize: '15px', color: C.textAccent, fontWeight: 700, marginBottom: '6px' }}>계약단가 등록됨: {Number(matchedCompany.unit_price).toLocaleString()}원/kg</div> : <div style={{ fontSize: '14px', color: C.textAccent, marginBottom: '6px' }}>⚠ 계약단가 미등록 — 사후대응 화면에서 등록하면 매출 집계에 반영됩니다.</div>}
          <div style={{ fontSize: '14px', color: C.textAccent, fontWeight: 600, marginBottom: '4px' }}>거래처 메모</div>
          <div style={{ fontSize: '15px', color: C.textSecondary }}>{matchedCompany.notes || '등록된 메모 없음'}</div>
        </div>
      )}

      <div style={{ border: `1.5px dashed ${C.borderStrong}`, borderRadius: '10px', padding: '18px', textAlign: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '15px', color: C.textMuted }}>발주서 스캔파일을 첨부하면 육안으로 원본을 대조할 수 있습니다. (자동 문자인식은 준비 중 — 아래 항목은 직접 입력합니다)</div>
      </div>

      <div style={stepHead}>② 발주 기본정보</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginBottom: '6px' }}>
        <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '14px', color: C.textMuted, marginBottom: '4px' }}>발신처(작성자)</div><input style={inputStyle} value={sender} onChange={(e) => setSender(e.target.value)} placeholder="예: 유민호" /></div>
        <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '14px', color: C.textMuted, marginBottom: '4px' }}>업체명 *</div><input style={inputStyle} list="of-company-list" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="예: (주)대한강재" /><datalist id="of-company-list">{companies.map((c) => <option key={c.id} value={c.name} />)}</datalist></div>
        <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '14px', color: C.textMuted, marginBottom: '4px' }}>출고예정일</div><input type="date" style={inputStyle} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
        <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '14px', color: C.textMuted, marginBottom: '4px' }}>담당 연락처</div><input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="예: 010-0000-0000" /></div>
      </div>

      <div style={stepHead}>③ 처리 옵션 · 재질/단중 계산</div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '16px', color: C.textSecondary }}><input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} /> 긴급 처리(우선 배정)</label>
        <span style={{ fontSize: '14px', color: C.textMuted, marginLeft: '8px' }}>생산유형</span>
        <select style={{ ...inputStyle, width: '160px' }} value={prodType} onChange={(e) => setProdType(e.target.value)}>
          <option value="자사생산">자사생산</option><option value="임가공">임가공(고객사 재료)</option><option value="외주가공">외주가공(우리 재고)</option>
        </select>
        {prodType === '외주가공' && <input style={{ ...inputStyle, width: '150px' }} value={outsourceTo} onChange={(e) => setOutsourceTo(e.target.value)} placeholder="외주처명" />}
      </div>
      {prodType === '임가공' && <div style={{ fontSize: '14px', color: C.textAccent, marginBottom: '8px' }}>⚠ 고객사 소유 재료 — 매입(입고) 등록이 선행되어야 합니다.</div>}
      {prodType === '외주가공' && <div style={{ fontSize: '14px', color: C.textAccent, marginBottom: '8px' }}>우리 재고를 외주처에 보내 가공합니다.</div>}
      <div style={{ background: C.surface1, borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', color: C.textSecondary, fontWeight: 700, marginBottom: '8px' }}>단중 자동계산 (두께 × 폭 × 길이 × 재질비중)</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select style={{ ...inputStyle, width: '150px' }} value={material} onChange={(e) => setMaterial(e.target.value)}>{MATERIALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <input style={{ ...inputStyle, width: '100px' }} value={ct} onChange={(e) => setCt(e.target.value)} placeholder="두께(mm)" />
          <input style={{ ...inputStyle, width: '100px' }} value={cw} onChange={(e) => setCw(e.target.value)} placeholder="폭(mm)" />
          <input style={{ ...inputStyle, width: '100px' }} value={cl} onChange={(e) => setCl(e.target.value)} placeholder="길이(mm)" />
          <span style={{ fontSize: '18px', color: C.textMuted }}>=</span>
          <span style={{ fontSize: '19px', fontWeight: 800, color: C.textAccent }}>{unitWeight !== null ? unitWeight.toFixed(1) + ' kg (이론중량)' : '- kg'}</span>
        </div>
      </div>

      <div style={stepHead}>④ 품목 내역</div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', margin: '0 0 10px' }}>
        <span style={{ fontSize: '15px', color: C.textMuted }}>즐겨찾기 규격:</span>
        {FAVORITES.map((f) => <button key={f} style={smallBtn()} onClick={() => addFavorite(f)}>{f}</button>)}
      </div>
      <table style={itemsTable}>
        <thead><tr><th style={th}>순번</th><th style={th}>두께</th><th style={th}>폭</th><th style={th}>중량(톤)</th><th style={th}>업체명(도금량)</th><th style={th}>Slitting Size</th><th style={th}>수량</th><th style={th}></th></tr></thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td style={td}>{i + 1}</td>
              <td style={td}><input style={{ ...inputStyle, height: '38px', fontSize: '15px' }} value={it.thick} onChange={(e) => setItemField(i, 'thick', e.target.value)} /></td>
              <td style={td}><input style={{ ...inputStyle, height: '38px', fontSize: '15px' }} value={it.width} onChange={(e) => setItemField(i, 'width', e.target.value)} /></td>
              <td style={td}><input style={{ ...inputStyle, height: '38px', fontSize: '15px' }} value={it.weight} onChange={(e) => setItemField(i, 'weight', e.target.value)} /></td>
              <td style={td}><input style={{ ...inputStyle, height: '38px', fontSize: '15px' }} value={it.maker} onChange={(e) => setItemField(i, 'maker', e.target.value)} /></td>
              <td style={td}><input style={{ ...inputStyle, height: '38px', fontSize: '15px' }} value={it.slit} onChange={(e) => setItemField(i, 'slit', e.target.value)} /></td>
              <td style={td}><input style={{ ...inputStyle, height: '38px', fontSize: '15px', width: '50px' }} value={it.qty} onChange={(e) => setItemField(i, 'qty', e.target.value)} /></td>
              <td style={td}><button style={smallBtn('danger')} onClick={() => removeRow(i)}>삭제</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ margin: '10px 0 18px' }}><button style={smallBtn()} onClick={addRow}>+ 행 추가</button></div>
      <button style={{ ...btnStyle(true), width: '100%' }} onClick={submit}>등록 → 발주 현황판 반영</button>
    </div>
  );
}

function OFAssign({ orders, coils, onAssignToDriver }) {
  const [fullOpen, setFullOpen] = useState(false);
  const pending = orders.filter((o) => o.status === 'RECEIVED');
  return (
    <div>
      {boxMsg('재고 장부에서 두께 조건에 맞는 코일이 있는지 확인하고, 지게차 기사에게 배정을 지시합니다.', { marginBottom: '12px' })}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '10px' }}>
        <button style={smallBtn()} onClick={() => setFullOpen((v) => !v)}>📋 전체 재고 리스트 {fullOpen ? '닫기' : '보기'}</button>
        <button style={smallBtn()} onClick={() => printHTML('전체 재고 코일 리스트', coilTableHtmlStr(coils))}>🖨 전체 재고 리스트 출력</button>
      </div>
      {fullOpen && (
        <div style={{ marginBottom: '16px', background: C.surface1, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 12px' }}>
          <table style={itemsTable}><thead><tr><th style={th}>코일ID</th><th style={th}>두께</th><th style={th}>규격</th><th style={th}>위치</th><th style={th}>잔량</th><th style={th}>입고일</th></tr></thead>
            <tbody>{coils.map((c) => <tr key={c.id}><td style={td}>{c.coil_code}</td><td style={td}>{c.thickness}</td><td style={td}>{c.spec || '-'}</td><td style={td}>Bay {c.bay_location || '-'}</td><td style={td}>{Number(c.remain_weight || 0).toLocaleString()}Kg</td><td style={td}>{c.received_date || '-'}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {pending.length === 0 ? boxMsg('배정 지시 대기중인 발주가 없습니다', { justifyContent: 'center' }) : pending.map((o) => {
        const matched = coils.filter((c) => Number(c.thickness) === Number(o.thickness) && Number(c.remain_weight) > 0);
        return (
          <div key={o.id} style={{ background: C.surface1, border: `1px solid ${o.urgent ? C.borderDanger : C.border}`, borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
            {o.urgent && <div style={{ fontSize: '13px', fontWeight: 700, color: C.textDanger, marginBottom: '4px' }}>🔺 긴급</div>}
            <div style={{ fontWeight: 700, fontSize: '18px', marginBottom: '6px' }}>{o.company_name} · 두께 {o.thickness} · {o.order_no} {prodBadge(o.prod_type)}</div>
            {matched.length ? (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: C.textSuccess }}>✓ 재고 {matched.length}건 확인됨</span>
                  <button style={smallBtn()} onClick={() => printHTML(`${o.company_name} (${o.order_no}) 재고 코일 리스트`, coilTableHtmlStr(matched))}>🖨 이 조건 재고 출력</button>
                </div>
                <table style={itemsTable}><thead><tr><th style={th}>코일ID</th><th style={th}>두께</th><th style={th}>규격</th><th style={th}>위치</th><th style={th}>잔량</th><th style={th}>입고일</th></tr></thead>
                  <tbody>{matched.map((c) => <tr key={c.id}><td style={td}>{c.coil_code}</td><td style={td}>{c.thickness}</td><td style={td}>{c.spec || '-'}</td><td style={td}>Bay {c.bay_location || '-'}</td><td style={td}>{Number(c.remain_weight || 0).toLocaleString()}Kg</td><td style={td}>{c.received_date || '-'}</td></tr>)}</tbody>
                </table>
              </div>
            ) : boxMsg(`⚠ 두께 ${o.thickness} 재고 없음 — 대체 규격 검토 필요`, { marginBottom: '8px', background: C.bgWarning, color: C.textWarning })}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ ...btnStyle(true), flex: 1 }} disabled={!matched.length} onClick={() => onAssignToDriver(o.id)}>지게차 기사에게 배정 지시</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OFWorkorder({ orders, onMovePriority, onUpdateOrder }) {
  const list = orders.filter((o) => o.status === 'SEARCH' || o.status === 'WORKING').sort((a, b) => b.priority - a.priority);
  return (
    <div>
      {boxMsg('코일 탐색·확정 중인 발주의 작업지시서 처리 현황과 처리 우선순위를 조정합니다.', { marginBottom: '12px' })}
      {list.length === 0 ? boxMsg('처리중인 작업지시서가 없습니다', { justifyContent: 'center' }) : list.map((o) => (
        <div key={o.id} style={{ background: C.surface1, border: `1px solid ${o.urgent ? C.borderDanger : C.border}`, borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontWeight: 700, fontSize: '18px' }}>{o.company_name} · 두께 {o.thickness} · {o.order_no}</span>
            {o.urgent && <span style={{ fontSize: '13px', fontWeight: 700, color: C.textDanger }}>🔺 긴급</span>}
          </div>
          {o.coils ? boxMsg(`작업지시서 대시보드 등록됨 · 배정 코일: ${o.coils.coil_code}`, { marginBottom: '8px', background: C.bgSuccess, color: C.textSuccess }) : boxMsg('지게차 기사 코일 탐색중', { marginBottom: '8px' })}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button style={{ ...smallBtn(), flex: 1 }} onClick={() => onMovePriority(o, 'up')}>▲ 우선순위</button>
            <button style={{ ...smallBtn(), flex: 1 }} onClick={() => onMovePriority(o, 'down')}>▼ 순위내림</button>
            <button style={{ ...smallBtn(), flex: 1 }} onClick={() => onUpdateOrder(o.id, { urgent: !o.urgent })}>{o.urgent ? '긴급 해제' : '긴급 지정'}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function OFMonitor({ orders, onLogCall }) {
  const list = orders.filter((o) => o.status === 'WORKING');
  return (
    <div>
      {boxMsg('현장에서 작업 중인 건을 지켜보다가, 지연되는 건은 확인 전화를 기록합니다.', { marginBottom: '12px' })}
      {list.length === 0 ? boxMsg('현재 작업중인 발주가 없습니다', { justifyContent: 'center' }) : list.map((o) => {
        const h = hoursSince(o.updated_at);
        const delayed = h >= 8;
        const calls = Array.isArray(o.call_log) ? o.call_log : [];
        return (
          <div key={o.id} style={{ background: C.surface1, border: `1px solid ${delayed ? C.borderWarning : C.border}`, borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
            <div style={{ fontWeight: 700, fontSize: '18px', marginBottom: '6px' }}>{o.company_name} · {o.order_no} · 코일 {o.coils?.coil_code || '-'}</div>
            {boxMsg(`경과 ${Math.floor(h)}시간${delayed ? ' · ⚠ 지연 의심' : ''}`, { marginBottom: '8px', ...(delayed ? { background: C.bgWarning, color: C.textWarning } : {}) })}
            {calls.length > 0 && boxMsg(`확인 기록 ${calls.length}건 · 최근: ${calls[calls.length - 1]}`, { marginBottom: '8px' })}
            <button style={{ ...smallBtn(), width: '100%' }} onClick={() => onLogCall(o)}>현장 확인 요청 기록</button>
          </div>
        );
      })}
    </div>
  );
}

function OFNotify({ orders, onNotifyCustomer, onDispatchOrder }) {
  const list = orders.filter((o) => o.status === 'DONE');
  const [form, setForm] = useState({});
  return (
    <div>
      {boxMsg('작업완료를 확인하면 고객사에 통지하고, 희망 시간에 맞춰 배차를 지시합니다.', { marginBottom: '12px' })}
      {list.length === 0 ? boxMsg('고객 통지·배차 대기중인 발주가 없습니다', { justifyContent: 'center' }) : list.map((o) => (
        <div key={o.id} style={{ background: C.surface1, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
          <div style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>{o.company_name} · {o.order_no} · 두께 {o.thickness}</div>
          {o.notified ? boxMsg('✓ 고객 통지 완료', { marginBottom: '8px', background: C.bgSuccess, color: C.textSuccess }) : <button style={{ ...smallBtn(), width: '100%', marginBottom: '10px' }} onClick={() => onNotifyCustomer(o.id)}>고객 통지 발송</button>}
          {o.notified && (
            <>
              <div style={{ fontSize: '14px', color: C.textMuted, marginBottom: '4px' }}>배차 등록</div>
              <input style={{ ...inputStyle, marginBottom: '6px' }} placeholder="배차 기사명" value={form[o.id]?.driver || ''} onChange={(e) => setForm((f) => ({ ...f, [o.id]: { ...f[o.id], driver: e.target.value } }))} />
              <input style={{ ...inputStyle, marginBottom: '6px' }} placeholder="차량번호" value={form[o.id]?.vehicle || ''} onChange={(e) => setForm((f) => ({ ...f, [o.id]: { ...f[o.id], vehicle: e.target.value } }))} />
              <input style={{ ...inputStyle, marginBottom: '8px' }} placeholder="고객 희망 배차시간" value={form[o.id]?.time || ''} onChange={(e) => setForm((f) => ({ ...f, [o.id]: { ...f[o.id], time: e.target.value } }))} />
              <button style={{ ...btnStyle(true), width: '100%' }} onClick={() => onDispatchOrder(o.id, form[o.id]?.driver || '', form[o.id]?.vehicle || '', form[o.id]?.time || '')}>배차 등록 → 출고 처리로</button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function OFShipment({ orders, onShipOrder }) {
  const list = orders.filter((o) => o.status === 'DISPATCH');
  const [weightInput, setWeightInput] = useState({});
  const [preview, setPreview] = useState({});
  return (
    <div>
      {boxMsg('실측 중량을 확인하고 출고증을 발행합니다.', { marginBottom: '12px' })}
      {list.length === 0 ? boxMsg('출고 대기중인 발주가 없습니다', { justifyContent: 'center' }) : list.map((o) => (
        <div key={o.id} style={{ background: C.surface1, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
          <div style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>{o.company_name} · {o.order_no} · 배정 코일 {o.coils?.coil_code || '-'}</div>
          <input style={{ ...inputStyle, marginBottom: '8px' }} placeholder="실측 중량(Kg)" value={weightInput[o.id] || ''} onChange={(e) => setWeightInput((w) => ({ ...w, [o.id]: e.target.value }))} />
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            <button style={{ ...smallBtn(), flex: 1 }} onClick={() => setPreview((p) => ({ ...p, [o.id]: true }))}>출고증 미리보기</button>
            <button style={{ ...btnStyle(true), flex: 1 }} onClick={() => onShipOrder(o, parseFloat(weightInput[o.id]) || o.weight)}>출고증 발행</button>
          </div>
          {preview[o.id] && (
            <div style={{ background: C.surface2, border: `1px dashed ${C.borderStrong}`, borderRadius: '8px', padding: '12px', fontSize: '15px', lineHeight: 1.7 }}>
              <div style={{ fontWeight: 700, fontSize: '18px', textAlign: 'center', marginBottom: '8px' }}>출 고 증</div>
              <div>거래처: {o.company_name}</div><div>발주번호: {o.order_no}</div><div>두께: {o.thickness}</div>
              <div>배정 코일: {o.coils?.coil_code || '-'}</div><div>실측 중량: {weightInput[o.id] || o.weight}Kg</div><div>생산유형: {o.prod_type}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function OFAftercare({ orders, companies, inquiries, onSaveCompanyField, onAddInquiry, onRequestFinanceCheck }) {
  const [drafts, setDrafts] = useState({});
  const [inqDraft, setInqDraft] = useState({});
  return (
    <div>
      {boxMsg('거래처별 메모·발주 이력을 관리하고, 문의 응대 및 미수금 확인 요청을 처리합니다.', { marginBottom: '14px' })}
      {companies.map((c) => {
        const compOrders = orders.filter((o) => o.company_name === c.name);
        const inqs = inquiries.filter((q) => q.company_id === c.id);
        const draft = drafts[c.id] || { notes: c.notes || '', unit_price: c.unit_price || '' };
        return (
          <div key={c.id} style={{ ...cardWrap, marginBottom: '16px', padding: '14px' }}>
            <div style={{ fontWeight: 700, fontSize: '19px', marginBottom: '8px' }}>{c.name}</div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <div style={{ fontSize: '14px', color: C.textMuted, marginBottom: '4px' }}>계약단가(원/kg)</div>
                <input style={inputStyle} value={draft.unit_price} onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: { ...draft, unit_price: e.target.value } }))} placeholder="예: 900" />
              </div>
            </div>
            <div style={{ fontSize: '14px', color: C.textMuted, marginBottom: '4px' }}>거래처 메모(선호 규격·특이사항)</div>
            <textarea rows={2} style={{ ...inputStyle, height: 'auto', padding: '8px 12px', marginBottom: '6px' }} value={draft.notes} onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: { ...draft, notes: e.target.value } }))} />
            <button style={{ ...smallBtn(), marginBottom: '14px' }} onClick={() => onSaveCompanyField(c.id, { notes: draft.notes, unit_price: draft.unit_price ? parseFloat(draft.unit_price) : null })}>메모/단가 저장</button>

            <div style={{ fontSize: '14px', color: C.textMuted, marginBottom: '6px' }}>최근 발주 이력 ({compOrders.length}건)</div>
            {compOrders.length ? compOrders.slice(0, 4).map((o) => boxMsg(`${o.order_no} · 두께 ${o.thickness} · ${statusLabel(o.status)}`, { marginBottom: '5px' })) : boxMsg('발주 이력 없음', { marginBottom: '5px' })}

            <div style={{ fontSize: '14px', color: C.textMuted, margin: '12px 0 6px' }}>문의 이력</div>
            {inqs.length ? inqs.map((q) => boxMsg(q.note, { marginBottom: '5px' })) : boxMsg('문의 없음', { marginBottom: '5px' })}
            <div style={{ display: 'flex', gap: '6px', margin: '8px 0 12px' }}>
              <input style={{ ...inputStyle, flex: 1 }} placeholder="문의 내용 입력" value={inqDraft[c.id] || ''} onChange={(e) => setInqDraft((d) => ({ ...d, [c.id]: e.target.value }))} />
              <button style={smallBtn()} onClick={() => { onAddInquiry(c.id, inqDraft[c.id]); setInqDraft((d) => ({ ...d, [c.id]: '' })); }}>등록</button>
            </div>
            <button style={{ ...smallBtn(), width: '100%' }} onClick={() => onRequestFinanceCheck(c.id)}>{c.finance_check_requested ? '✓ 미수금 확인 요청됨' : '경리팀 미수금 확인 요청'}</button>
          </div>
        );
      })}
    </div>
  );
}

/* ============================== FL 지게차 기사 ============================== */
function ForkliftRole({ orders, coils, onSelectCoil, onCompleteOrder }) {
  const [sub, setSub] = useState('waiting');
  const [currentId, setCurrentId] = useState(null);
  const current = orders.find((o) => o.id === currentId);
  const waiting = orders.filter((o) => o.status === 'SEARCH' && !o.coil_id);
  const recent = orders.filter((o) => o.status === 'WORKING' || o.status === 'DONE');

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {FL_SUBS.map(([k, label]) => <button key={k} style={btnStyle(sub === k)} onClick={() => setSub(k)}>{label}</button>)}
      </div>
      {sub === 'waiting' && (
        <div>
          <div style={{ fontSize: '18px', color: C.textSecondary, marginBottom: '8px' }}>대기중</div>
          <div style={{ marginBottom: '16px' }}>
            {waiting.length === 0 ? boxMsg('대기중인 발주 없음', { justifyContent: 'center' }) : waiting.map((o) => (
              <div key={o.id} style={{ background: C.surface1, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '11px', marginBottom: '9px' }}>
                <div style={{ fontWeight: 700, fontSize: '19px' }}>{o.company_name} · 두께 {o.thickness}</div>
                <button style={{ ...btnStyle(true), marginTop: '7px', width: '100%' }} onClick={() => { setCurrentId(o.id); setSub('coil'); }}>코일 찾기</button>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '18px', color: C.textSecondary, marginBottom: '8px' }}>최근 처리 이력</div>
          {recent.length === 0 ? boxMsg('최근 처리 이력 없음', { justifyContent: 'center' }) : recent.map((o) => boxMsg(`${o.company_name} · ${statusLabel(o.status)}`, { marginBottom: '7px' }))}
        </div>
      )}
      {sub === 'coil' && (
        !current ? boxMsg('대기 발주에서 코일 찾기를 눌러 진입하세요.', { justifyContent: 'center', minHeight: '60px' }) : (
          <div>
            <div style={{ background: C.surface1, border: `2px solid ${C.borderAccent}`, borderRadius: '10px', padding: '18px', marginBottom: '14px' }}>
              <div style={{ fontSize: '19px', fontWeight: 700, color: C.textAccent, marginBottom: '10px' }}>이 작업이 찾는 코일 조건</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 18px' }}>
                <div><div style={{ fontSize: '13px', color: C.textMuted }}>거래처</div><div style={{ fontSize: '19px', fontWeight: 700 }}>{current.company_name}</div></div>
                <div><div style={{ fontSize: '13px', color: C.textMuted }}>두께</div><div style={{ fontSize: '19px', fontWeight: 700 }}>{current.thickness}</div></div>
                <div><div style={{ fontSize: '13px', color: C.textMuted }}>중량</div><div style={{ fontSize: '19px', fontWeight: 700 }}>{Number(current.weight || 0).toLocaleString()}Kg</div></div>
                <div><div style={{ fontSize: '13px', color: C.textMuted }}>규격</div><div style={{ fontSize: '19px', fontWeight: 700 }}>{current.spec || '-'}</div></div>
              </div>
            </div>
            {timelineHtml(current.status)}
            {!current.coil_id ? (
              (() => {
                const matched = coils.filter((c) => Number(c.thickness) === Number(current.thickness) && Number(c.remain_weight) > 0);
                return matched.length === 0 ? boxMsg('조건에 맞는 재고 코일 없음', { justifyContent: 'center', minHeight: '60px' }) : matched.map((c) => {
                  const enough = Number(c.remain_weight) >= Number(current.weight || 0);
                  const specOk = c.spec === current.spec;
                  return (
                    <div key={c.id} style={{ background: C.surface2, border: `2px solid ${specOk ? C.textSuccess : C.border}`, borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '21px' }}>{c.coil_code}</span>
                        {specOk ? <span style={{ fontSize: '14px', color: C.textSuccess, fontWeight: 700 }}>✓ 규격 일치</span> : <span style={{ fontSize: '14px', color: C.textWarning }}>규격 {c.spec || '-'}</span>}
                      </div>
                      <div style={{ color: C.textSecondary, fontSize: '17px', marginBottom: '12px' }}>
                        Bay {c.bay_location || '-'} · 잔량 {Number(c.remain_weight).toLocaleString()}Kg {enough ? <span style={{ color: C.textSuccess }}>(충분)</span> : <span style={{ color: C.textDanger }}>(부족 주의)</span>}
                      </div>
                      <button style={{ ...btnStyle(true), width: '100%' }} onClick={() => onSelectCoil(current.id, c.id)}>이 코일로 선택</button>
                    </div>
                  );
                });
              })()
            ) : (
              <>
                {boxMsg(`코일ID 확정: ${current.coils?.coil_code || ''}`, { background: C.bgSuccess, color: C.textSuccess, margin: '10px 0' })}
                <button style={{ ...btnStyle(true), width: '100%' }} onClick={() => { onCompleteOrder(current.id); setCurrentId(null); setSub('waiting'); }}>작업완료 처리</button>
              </>
            )}
          </div>
        )
      )}
    </div>
  );
}

export default SalesWorkflowPage;
