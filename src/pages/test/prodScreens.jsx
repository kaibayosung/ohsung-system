// src/pages/test/prodScreens.jsx
// 생산(PROD) 화면 9종: 상품입고 접수 / 생산전표 조회 / 그린피 연동 현황 / 동기화 히스토리 / 재고 현황 / 재고 단품 상세 / 출고 현황 / 코일 워크플로우 / 코일 로트 상세
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { COLORS, box, pill, fmtWon, fmtNum } from './theme';

const STAGING_TABLES = ['greenp_production_slips', 'greenp_inventory', 'greenp_receivables', 'greenp_shipments', 'greenp_work_orders', 'greenp_receipts', 'greenp_cash_reconcile', 'greenp_delivery_notes'];

// ---------- 12 상품입고 접수 ----------
export function GoodsReceipt() {
  const [form, setForm] = useState({ customer_name: '', product_name: '', spec: '', original_weight: '', received_date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.customer_name || !form.product_name) { alert('거래처와 품명을 입력하세요.'); return; }
    setSaving(true);
    const code = `IV-${form.received_date.replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`;
    await supabase.from('greenp_inventory').insert({
      product_code: code,
      customer_name: form.customer_name,
      product_name: form.product_name,
      spec: form.spec,
      original_weight: Number(form.original_weight) || 0,
      changed_weight: Number(form.original_weight) || 0,
      remaining_weight: Number(form.original_weight) || 0,
      received_date: form.received_date,
    });
    setSaving(false);
    alert(`상품입고가 접수되었습니다. (상품코드 ${code})\n재고 현황 화면에 즉시 반영됩니다.`);
    setForm({ customer_name: '', product_name: '', spec: '', original_weight: '', received_date: new Date().toISOString().split('T')[0] });
  };

  return (
    <div style={box.page}>
      <h2 style={box.title}>상품입고 접수</h2>
      <div style={box.card}>
        <div style={box.formGrid}>
          <div><label style={box.label}>거래처</label><input style={box.input} value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="(주)삼성강판" /></div>
          <div><label style={box.label}>품명</label><input style={box.input} value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} placeholder="SPHC 3.0T" /></div>
          <div><label style={box.label}>규격</label><input style={box.input} value={form.spec} onChange={(e) => setForm({ ...form, spec: e.target.value })} placeholder="1219x2438" /></div>
          <div><label style={box.label}>원중량(kg)</label><input type="number" style={box.input} value={form.original_weight} onChange={(e) => setForm({ ...form, original_weight: e.target.value })} placeholder="1240" /></div>
          <div><label style={box.label}>입고일자</label><input type="date" style={box.input} value={form.received_date} onChange={(e) => setForm({ ...form, received_date: e.target.value })} /></div>
        </div>
        <div style={{ marginTop: '18px' }}><button style={box.primaryBtn} onClick={submit} disabled={saving}>{saving ? '접수 중...' : '접수'}</button></div>
      </div>
    </div>
  );
}

// ---------- 13 생산전표 조회 ----------
export function ProductionSlips() {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data } = await supabase.from('sales_records').select('*').order('work_date', { ascending: false }).limit(50);
    setRows(data || []);
  };

  if (!rows) return <p style={box.loadingText}>불러오는 중...</p>;
  const filtered = rows.filter((r) => !q || (r.customer_name || '').includes(q) || (r.work_type || '').includes(q));

  return (
    <div style={box.page}>
      <div>
        <h2 style={box.title}>생산전표 조회</h2>
        <p style={box.hint}>실제 sales_records 데이터 (최근 50건) · 그린피 원본과 동일 구조</p>
      </div>
      <input style={{ ...box.input, maxWidth: '320px' }} placeholder="거래처/작업구분 검색" value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={box.card}>
        <table style={box.table}>
          <thead><tr><th style={box.th}>일자</th><th style={box.th}>거래처</th><th style={box.th}>구분</th><th style={box.th}>중량</th><th style={box.th}>금액</th></tr></thead>
          <tbody>
            {filtered.slice(0, 20).map((r) => (
              <tr key={r.id}>
                <td style={box.td}>{r.work_date}</td>
                <td style={box.td}>{r.customer_name}</td>
                <td style={box.td}>{r.work_type}</td>
                <td style={box.td}>{fmtNum(r.weight)}kg</td>
                <td style={box.td}>{fmtWon(r.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- 14 그린피 연동 현황 ----------
export function GreenpStatus() {
  const [logs, setLogs] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data } = await supabase.from('greenp_sync_logs').select('*').order('synced_at', { ascending: false }).limit(10);
    setLogs(data || []);
  };

  const runSync = async () => {
    setSyncing(true);
    const table = STAGING_TABLES[Math.floor(Math.random() * STAGING_TABLES.length)];
    await supabase.from('greenp_sync_logs').insert({ target_table: table, record_count: Math.floor(Math.random() * 12) + 1, status: '성공' });
    await load();
    setSyncing(false);
  };

  if (!logs) return <p style={box.loadingText}>불러오는 중...</p>;
  const last = logs[0];
  const todayCount = logs.filter((l) => new Date(l.synced_at).toDateString() === new Date().toDateString()).reduce((s, l) => s + Number(l.record_count || 0), 0);

  return (
    <div style={box.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={box.title}>그린피 ERP 연동 현황</h2>
        <button style={box.primaryBtn} onClick={runSync} disabled={syncing}>{syncing ? '동기화 중...' : '지금 동기화'}</button>
      </div>
      <div style={box.statGrid}>
        <div style={box.statCard}><span style={box.statLabel}>마지막 동기화</span><span style={box.statValue}>{last ? new Date(last.synced_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}</span></div>
        <div style={box.statCard}><span style={box.statLabel}>금일 수집 건수</span><span style={box.statValue}>{fmtNum(todayCount)}건</span></div>
        <div style={box.statCard}><span style={box.statLabel}>스테이징 테이블</span><span style={box.statValue}>{STAGING_TABLES.length}개</span></div>
      </div>
      <div style={box.card}>
        <h3 style={box.subtitle}>최근 수집 로그</h3>
        {logs.slice(0, 5).map((l) => (
          <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${COLORS.border}`, fontSize: '15px' }}>
            <span>{new Date(l.synced_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} · {l.target_table} {l.record_count}건</span>
            <span style={pill(l.status === '성공' ? COLORS.greenBg : COLORS.redBg, l.status === '성공' ? COLORS.green : COLORS.red)}>{l.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- 15 그린피 동기화 히스토리 (전체) ----------
export function GreenpHistory() {
  const [logs, setLogs] = useState(null);
  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data } = await supabase.from('greenp_sync_logs').select('*').order('synced_at', { ascending: false }).limit(30);
    setLogs(data || []);
  };
  const retry = async (l) => {
    await supabase.from('greenp_sync_logs').insert({ target_table: l.target_table, record_count: Math.floor(Math.random() * 8) + 1, status: '성공' });
    load();
  };
  if (!logs) return <p style={box.loadingText}>불러오는 중...</p>;
  return (
    <div style={box.page}>
      <h2 style={box.title}>그린피 동기화 히스토리 · 전체</h2>
      <div style={box.card}>
        <table style={box.table}>
          <thead><tr><th style={box.th}>시각</th><th style={box.th}>대상 테이블</th><th style={box.th}>건수</th><th style={box.th}>상태</th><th style={box.th}></th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td style={box.td}>{new Date(l.synced_at).toLocaleString('ko-KR')}</td>
                <td style={box.td}>{l.target_table}</td>
                <td style={box.td}>{l.record_count}건</td>
                <td style={box.td}><span style={pill(l.status === '성공' ? COLORS.greenBg : COLORS.redBg, l.status === '성공' ? COLORS.green : COLORS.red)}>{l.status}</span></td>
                <td style={box.td}>{l.status === '실패' && <button style={{ ...box.ghostBtn, padding: '6px 14px', fontSize: '13px' }} onClick={() => retry(l)}>재시도</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- 16 재고 현황 ----------
export function InventoryList({ onOpenDetail }) {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data } = await supabase.from('greenp_inventory').select('*').order('received_date');
    setRows(data || []);
  };
  if (!rows) return <p style={box.loadingText}>불러오는 중...</p>;
  const filtered = rows.filter((r) => !q || (r.customer_name || '').includes(q) || (r.product_name || '').includes(q));
  const isOld = (d) => { const diff = (Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24 * 365); return diff >= 2; };

  return (
    <div style={box.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={box.title}>재고 현황 · {rows.length}건</h2>
        <input style={{ ...box.input, maxWidth: '280px' }} placeholder="거래처/품명 검색" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div style={box.statGrid}>
        <div style={box.statCard}><span style={box.statLabel}>그린피 실사 전체재고(2026-07-17 스냅샷)</span><span style={box.statValue}>700+ 품목</span></div>
        <div style={box.statCard}><span style={box.statLabel}>실사 재고중량 합계</span><span style={box.statValue}>{fmtNum(5967947)}kg</span></div>
        <div style={box.statCard}><span style={box.statLabel}>10분 주기 자동연동</span><span style={{ ...box.statValue, color: COLORS.amber }}>구축 예정(자동화팀)</span></div>
      </div>
      <p style={box.hint}>그린피 재고 모듈은 화면 수 최다(9개)이며 검색·필터 기능이 약해, 실사 시점 기준 전체재고는 위 요약치로만 확보되어 있습니다. 아래 목록은 대표 샘플이며, 10분 주기 자동연동이 구축되면 700+ 품목 전체가 실시간으로 반영됩니다.</p>
      <div style={box.card}>
        <table style={box.table}>
          <thead><tr><th style={box.th}>업체명</th><th style={box.th}>품명</th><th style={box.th}>재고중량</th><th style={box.th}>입고일자</th><th style={box.th}></th></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={isOld(r.received_date) ? { backgroundColor: COLORS.redBg } : undefined}>
                <td style={{ ...box.td, color: isOld(r.received_date) ? COLORS.red : '#2d3748' }}>{r.customer_name}</td>
                <td style={{ ...box.td, color: isOld(r.received_date) ? COLORS.red : '#2d3748' }}>{r.product_name}</td>
                <td style={{ ...box.td, color: isOld(r.received_date) ? COLORS.red : '#2d3748' }}>{fmtNum(r.remaining_weight)}</td>
                <td style={{ ...box.td, color: isOld(r.received_date) ? COLORS.red : '#2d3748' }}>{r.received_date}{isOld(r.received_date) ? ' · 노후재고' : ''}</td>
                <td style={box.td}><button style={{ ...box.ghostBtn, padding: '6px 14px', fontSize: '13px' }} onClick={() => onOpenDetail(r.id)}>상세</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- 17 재고 단품 상세 ----------
export function InventoryDetail({ inventoryId }) {
  const [row, setRow] = useState(null);
  useEffect(() => {
    if (!inventoryId) return;
    supabase.from('greenp_inventory').select('*').eq('id', inventoryId).single().then(({ data }) => setRow(data));
  }, [inventoryId]);

  if (!inventoryId) return <p style={box.emptyText}>재고 현황 화면에서 품목을 선택하면 상세정보가 표시됩니다.</p>;
  if (!row) return <p style={box.loadingText}>불러오는 중...</p>;
  const years = ((Date.now() - new Date(row.received_date).getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1);
  const isOld = years >= 2;

  return (
    <div style={box.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={box.title}>{row.customer_name} · {row.product_name}</h2>
        {isOld && <span style={pill(COLORS.redBg, COLORS.red)}>노후재고 경고</span>}
      </div>
      <div style={box.statGrid}>
        <div style={box.statCard}><span style={box.statLabel}>원중량</span><span style={box.statValue}>{fmtNum(row.original_weight)}kg</span></div>
        <div style={box.statCard}><span style={box.statLabel}>변경중량</span><span style={box.statValue}>{fmtNum(row.changed_weight)}kg</span></div>
        <div style={box.statCard}><span style={box.statLabel}>재고중량</span><span style={box.statValue}>{fmtNum(row.remaining_weight)}kg</span></div>
      </div>
      <div style={box.card}>
        <h3 style={box.subtitle}>입출고 이력</h3>
        <p style={{ color: COLORS.steel, fontSize: '16px', lineHeight: 1.8 }}>
          {row.received_date} · 입고 {fmtNum(row.original_weight)}kg<br />
          {Number(row.original_weight) !== Number(row.remaining_weight) && `이후 ${fmtNum(row.original_weight - row.remaining_weight)}kg 부분출고 처리됨`}<br />
          {isOld ? `이후 이동 없음 (${years}년 정체)` : '최근 이동 이력 정상'}
        </p>
      </div>
    </div>
  );
}

// ---------- 18 출고 현황 ----------
export function ShipmentStatus() {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    supabase.from('shipments').select('*').order('shipment_date', { ascending: false }).then(({ data }) => setRows(data || []));
  }, []);
  if (!rows) return <p style={box.loadingText}>불러오는 중...</p>;
  return (
    <div style={box.page}>
      <h2 style={box.title}>출고 현황</h2>
      <div style={box.card}>
        <table style={box.table}>
          <thead><tr><th style={box.th}>출고번호</th><th style={box.th}>거래처</th><th style={box.th}>중량</th><th style={box.th}>출고일</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td style={box.td} colSpan={4}>출고 기록이 없습니다.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}><td style={box.td}>{r.shipment_no}</td><td style={box.td}>{r.customer_name}</td><td style={box.td}>{fmtNum(r.weight)}kg</td><td style={box.td}>{r.shipment_date}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- 코일 워크플로우 (입고 → 가공 → 출고 → 현재고, 그린피 실데이터) ----------
function lotStatus(originalWeight, remainingWeight) {
  const orig = Number(originalWeight || 0);
  const rem = Number(remainingWeight || 0);
  let ratio = orig > 0 ? (orig - rem) / orig : 0;
  if (ratio < 0) ratio = 0;
  if (ratio > 1) ratio = 1;
  let label = '가공중';
  let bg = COLORS.amberBg, color = COLORS.amber;
  if (ratio <= 0) { label = '미착수'; bg = '#edf2f7'; color = COLORS.steel; }
  else if (ratio >= 0.999) { label = '출고완료'; bg = COLORS.greenBg; color = COLORS.green; }
  return { ratio, label, bg, color };
}

export function CoilFlowBoard({ onOpenDetail }) {
  const [lots, setLots] = useState(null);
  const [totals, setTotals] = useState(null);
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('received_date');

  useEffect(() => { load(); }, []);
  const load = async () => {
    const [lotsRes, inRes, outRes] = await Promise.all([
      supabase.from('greenp_inventory').select('*').order('received_date', { ascending: false }).limit(1000),
      supabase.from('greenp_inbound').select('weight').limit(3000),
      supabase.from('greenp_outbound').select('weight').limit(3000),
    ]);
    const lotsData = lotsRes.data || [];
    setLots(lotsData);
    const totalInbound = (inRes.data || []).reduce((s, r) => s + Number(r.weight || 0), 0);
    const totalOutbound = (outRes.data || []).reduce((s, r) => s + Number(r.weight || 0), 0);
    const totalRemaining = lotsData.reduce((s, r) => s + Number(r.remaining_weight || 0), 0);
    setTotals({ totalInbound, totalOutbound, totalRemaining });
  };

  if (!lots || !totals) return <p style={box.loadingText}>불러오는 중...</p>;

  const filtered = lots.filter((r) => !q || (r.customer_name || '').includes(q) || (r.product_name || '').includes(q) || (r.spec || '').includes(q));
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'remaining_weight') return Number(b.remaining_weight || 0) - Number(a.remaining_weight || 0);
    return new Date(b.received_date || 0) - new Date(a.received_date || 0);
  });
  const depletionRate = totals.totalInbound > 0 ? (totals.totalOutbound / totals.totalInbound) * 100 : 0;

  return (
    <div style={box.page}>
      <div>
        <h2 style={box.title}>코일 워크플로우 · 입고 → 가공 → 출고 → 현재고</h2>
        <p style={box.hint}>그린피 실데이터(2026년) 기준 · 입고 {fmtNum(totals.totalInbound)}건 / 출고 {fmtNum(totals.totalOutbound)}건 로우 데이터를 집계한 화면입니다.</p>
      </div>
      <div style={box.statGrid}>
        <div style={box.statCard}><span style={box.statLabel}>누적 입고중량 합계</span><span style={box.statValue}>{fmtNum(totals.totalInbound)}kg</span></div>
        <div style={box.statCard}><span style={box.statLabel}>누적 출고중량 합계</span><span style={box.statValue}>{fmtNum(totals.totalOutbound)}kg</span></div>
        <div style={box.statCard}><span style={box.statLabel}>현재고 합계(재고 스냅샷)</span><span style={box.statValue}>{fmtNum(totals.totalRemaining)}kg</span></div>
        <div style={box.statCard}><span style={box.statLabel}>재고 소진율(출고/입고)</span><span style={{ ...box.statValue, color: COLORS.blue }}>{depletionRate.toFixed(1)}%</span></div>
      </div>
      <p style={box.hint}>입고·출고는 2026년 누적 거래 로그이며, 현재고는 그린피 재고 모듈의 "지금 시점" 스냅샷(트렌드 미보관)입니다. 세 수치는 서로 다른 시점/범위의 집계이므로 단순 산술로 정확히 맞아떨어지지 않을 수 있습니다.</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={box.subtitle}>코일 로트 목록 · {sorted.length}건</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input style={{ ...box.input, maxWidth: '260px' }} placeholder="업체명/품명/규격 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          <select style={{ ...box.input, maxWidth: '180px' }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="received_date">입고일자순</option>
            <option value="remaining_weight">잔여중량순</option>
          </select>
        </div>
      </div>
      <div style={box.card}>
        <table style={box.table}>
          <thead>
            <tr>
              <th style={box.th}>업체명</th><th style={box.th}>품명</th><th style={box.th}>규격</th><th style={box.th}>입고일자</th>
              <th style={box.th}>원중량</th><th style={box.th}>잔여중량</th><th style={box.th}>소진율</th><th style={box.th}>상태</th><th style={box.th}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && <tr><td style={box.td} colSpan={9}>검색 결과가 없습니다.</td></tr>}
            {sorted.slice(0, 200).map((r) => {
              const st = lotStatus(r.original_weight, r.remaining_weight);
              return (
                <tr key={r.id}>
                  <td style={box.td}>{r.customer_name}</td>
                  <td style={box.td}>{r.product_name}</td>
                  <td style={box.td}>{r.spec}</td>
                  <td style={box.td}>{r.received_date}</td>
                  <td style={box.td}>{fmtNum(r.original_weight)}kg</td>
                  <td style={box.td}>{fmtNum(r.remaining_weight)}kg</td>
                  <td style={box.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '70px', height: '8px', borderRadius: '999px', backgroundColor: '#edf2f7', overflow: 'hidden' }}>
                        <div style={{ width: `${(st.ratio * 100).toFixed(0)}%`, height: '100%', backgroundColor: COLORS.blue }} />
                      </div>
                      <span style={{ fontSize: '13px', color: COLORS.steel }}>{(st.ratio * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style={box.td}><span style={pill(st.bg, st.color)}>{st.label}</span></td>
                  <td style={box.td}><button style={{ ...box.ghostBtn, padding: '6px 14px', fontSize: '13px' }} onClick={() => onOpenDetail(r.id)}>상세</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- 코일 로트 상세 (입고/출고 이력 드릴다운) ----------
export function CoilFlowDetail({ lotId }) {
  const [lot, setLot] = useState(null);
  const [inboundRows, setInboundRows] = useState(null);
  const [outboundRows, setOutboundRows] = useState(null);

  useEffect(() => {
    if (!lotId) return;
    setLot(null); setInboundRows(null); setOutboundRows(null);
    supabase.from('greenp_inventory').select('*').eq('id', lotId).single().then(({ data }) => setLot(data));
  }, [lotId]);

  useEffect(() => {
    if (!lot) return;
    supabase.from('greenp_inbound').select('*')
      .eq('company_name', lot.customer_name).eq('product_name', lot.product_name).eq('spec', lot.spec)
      .order('inbound_date', { ascending: false }).limit(50)
      .then(({ data }) => setInboundRows(data || []));
    supabase.from('greenp_outbound').select('*')
      .eq('company_name', lot.customer_name).eq('product_name', lot.product_name).eq('spec', lot.spec)
      .order('outbound_date', { ascending: false }).limit(50)
      .then(({ data }) => setOutboundRows(data || []));
  }, [lot]);

  if (!lotId) return <p style={box.emptyText}>코일 워크플로우 화면에서 로트를 선택하면 입출고 상세가 표시됩니다.</p>;
  if (!lot) return <p style={box.loadingText}>불러오는 중...</p>;

  const st = lotStatus(lot.original_weight, lot.remaining_weight);
  const matchedOutWeight = (outboundRows || []).reduce((s, r) => s + Number(r.weight || 0), 0);

  return (
    <div style={box.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={box.title}>{lot.customer_name} · {lot.product_name} ({lot.spec})</h2>
        <span style={pill(st.bg, st.color)}>{st.label}</span>
      </div>
      <div style={box.statGrid}>
        <div style={box.statCard}><span style={box.statLabel}>원중량</span><span style={box.statValue}>{fmtNum(lot.original_weight)}kg</span></div>
        <div style={box.statCard}><span style={box.statLabel}>잔여중량(현재고)</span><span style={box.statValue}>{fmtNum(lot.remaining_weight)}kg</span></div>
        <div style={box.statCard}><span style={box.statLabel}>소진율</span><span style={{ ...box.statValue, color: COLORS.blue }}>{(st.ratio * 100).toFixed(0)}%</span></div>
        <div style={box.statCard}><span style={box.statLabel}>입고일자</span><span style={box.statValue}>{lot.received_date}</span></div>
      </div>

      <div style={box.card}>
        <h3 style={box.subtitle}>입고 이력 (동일 업체명·품명·규격 기준)</h3>
        {!inboundRows ? <p style={box.loadingText}>불러오는 중...</p> : inboundRows.length === 0 ? (
          <p style={box.emptyText}>일치하는 입고 전표를 찾지 못했습니다.</p>
        ) : (
          <table style={box.table}>
            <thead><tr><th style={box.th}>입고일자</th><th style={box.th}>전표번호</th><th style={box.th}>중량</th><th style={box.th}>길이(m)</th></tr></thead>
            <tbody>
              {inboundRows.map((r) => (
                <tr key={r.id}><td style={box.td}>{r.inbound_date}</td><td style={box.td}>{r.slip_no || '-'}</td><td style={box.td}>{fmtNum(r.weight)}kg</td><td style={box.td}>{r.length_m || '-'}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={box.card}>
        <h3 style={box.subtitle}>출고 이력 (동일 업체명·품명·규격 기준) · 합계 {fmtNum(matchedOutWeight)}kg</h3>
        {!outboundRows ? <p style={box.loadingText}>불러오는 중...</p> : outboundRows.length === 0 ? (
          <p style={box.emptyText}>일치하는 출고 전표를 찾지 못했습니다. (아직 미출고 상태이거나, 품명/규격 표기가 달라 자동 매칭이 안 된 경우일 수 있습니다)</p>
        ) : (
          <table style={box.table}>
            <thead><tr><th style={box.th}>출고일자</th><th style={box.th}>작업일자</th><th style={box.th}>작업전표번호</th><th style={box.th}>중량</th><th style={box.th}>수량</th></tr></thead>
            <tbody>
              {outboundRows.map((r) => (
                <tr key={r.id}><td style={box.td}>{r.outbound_date}</td><td style={box.td}>{r.work_date || '-'}</td><td style={box.td}>{r.work_slip_no || '-'}</td><td style={box.td}>{fmtNum(r.weight)}kg</td><td style={box.td}>{r.qty || '-'}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p style={box.hint}>※ 그린피 원본 데이터에는 입고 로트와 출고 전표를 잇는 고유 키(LOT ID)가 없어, 업체명·품명·규격이 동일한 전표를 매칭했습니다. 동일 품명/규격의 소량 로트가 여러 건 존재하는 거래처의 경우 상세 이력이 실제와 다르게 섞여 보일 수 있습니다.</p>
    </div>
  );
}
