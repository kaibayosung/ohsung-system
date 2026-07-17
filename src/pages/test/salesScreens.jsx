// src/pages/test/salesScreens.jsx
// 영업/현장(SALES) 화면 5종: 작업지시서 등록 / 작업지시 현황판(칸반) / 작업완료 처리(모바일) / 거래명세서 조회 / 거래처 상세
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { COLORS, box, pill, fmtWon, fmtNum } from './theme';

const WORK_TYPES = ['슬리팅 1', '슬리팅 2', '레베링', '기타'];
const UNIT_PRICE_MAP = { '슬리팅 1': 12, '슬리팅 2': 23, '레베링': 70, '기타': 15 };

// ---------- 07 작업지시서 등록 ----------
export function WorkOrderForm() {
  const [form, setForm] = useState({ customer_name: '', work_type: '슬리팅 2', spec: '', desired_date: new Date().toISOString().split('T')[0], weight: '' });
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    supabase.from('companies').select('name').eq('type', '매출처').order('name').then(({ data }) => setCompanies(data || []));
  }, []);

  const unitPrice = UNIT_PRICE_MAP[form.work_type] || 0;

  const submit = async () => {
    if (!form.customer_name) { alert('고객사를 입력하세요.'); return; }
    setSaving(true);
    await supabase.from('work_orders').insert({
      customer_name: form.customer_name,
      work_type: form.work_type,
      spec: form.spec,
      desired_date: form.desired_date,
      weight: Number(form.weight) || 0,
      unit_price: unitPrice,
      status: '대기',
    });
    setSaving(false);
    alert('작업지시가 등록되었습니다. 현황판에서 확인하세요.');
    setForm({ customer_name: '', work_type: '슬리팅 2', spec: '', desired_date: new Date().toISOString().split('T')[0], weight: '' });
  };

  return (
    <div style={box.page}>
      <h2 style={box.title}>작업지시서 등록</h2>
      <div style={box.card}>
        <div style={box.formGrid}>
          <div>
            <label style={box.label}>고객사</label>
            <input style={box.input} list="company-list" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="예: (주)대한강재" />
            <datalist id="company-list">{companies.map((c) => <option key={c.name} value={c.name} />)}</datalist>
          </div>
          <div>
            <label style={box.label}>작업구분</label>
            <select style={box.input} value={form.work_type} onChange={(e) => setForm({ ...form, work_type: e.target.value })}>
              {WORK_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div><label style={box.label}>규격</label><input style={box.input} value={form.spec} onChange={(e) => setForm({ ...form, spec: e.target.value })} placeholder="예: SPCC 1.2T" /></div>
          <div><label style={box.label}>희망일</label><input type="date" style={box.input} value={form.desired_date} onChange={(e) => setForm({ ...form, desired_date: e.target.value })} /></div>
          <div><label style={box.label}>예상 중량(kg)</label><input type="number" style={box.input} value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="4200" /></div>
          <div><label style={box.label}>예상 단가 (자동계산)</label><div style={{ ...box.input, background: '#f8fafc', color: COLORS.steel }}>{unitPrice}원/kg</div></div>
        </div>
        <div style={{ marginTop: '18px' }}>
          <button style={box.primaryBtn} onClick={submit} disabled={saving}>{saving ? '등록 중...' : '등록'}</button>
        </div>
      </div>
    </div>
  );
}

// ---------- 08 작업지시 현황판 (칸반) ----------
export function WorkOrderBoard() {
  const [orders, setOrders] = useState(null);

  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data } = await supabase.from('work_orders').select('*').order('created_at', { ascending: false });
    setOrders(data || []);
  };

  const advance = async (o) => {
    const next = o.status === '대기' ? '진행중' : o.status === '진행중' ? '완료' : null;
    if (!next) return;
    await supabase.from('work_orders').update({ status: next, completed_at: next === '완료' ? new Date().toISOString() : null }).eq('id', o.id);
    load();
  };

  if (!orders) return <p style={box.loadingText}>불러오는 중...</p>;
  const cols = [
    { key: '대기', label: '대기', bg: COLORS.white },
    { key: '진행중', label: '진행중', bg: COLORS.white },
    { key: '완료', label: '완료', bg: COLORS.greenBg },
  ];

  return (
    <div style={box.page}>
      <h2 style={box.title}>작업지시 현황판 (칸반)</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' }}>
        {cols.map((col) => {
          const items = orders.filter((o) => o.status === col.key);
          return (
            <div key={col.key}>
              <h3 style={{ ...box.subtitle, fontSize: '17px' }}>{col.label} ({items.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {items.length === 0 && <p style={box.emptyText}>없음</p>}
                {items.map((o) => (
                  <div key={o.id} style={{ background: col.bg, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: col.key === '완료' ? COLORS.green : COLORS.navy }}>{o.customer_name} · {o.work_type}</div>
                    <div style={{ fontSize: '13px', color: COLORS.steel, marginTop: '4px' }}>
                      {col.key === '완료' ? `완료 · ${fmtNum(o.weight)}kg` : `희망일 ${o.desired_date || '-'}${o.assignee ? ' · 담당 ' + o.assignee : ''}`}
                    </div>
                    {col.key !== '완료' && (
                      <button onClick={() => advance(o)} style={{ ...box.ghostBtn, marginTop: '10px', padding: '7px 14px', fontSize: '13px' }}>
                        {col.key === '대기' ? '진행중으로 →' : '완료 처리 →'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- 09 작업완료 처리 (모바일) ----------
export function WorkOrderComplete() {
  const [orders, setOrders] = useState(null);
  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data } = await supabase.from('work_orders').select('*').eq('status', '진행중').order('created_at');
    setOrders(data || []);
  };
  const complete = async (o) => {
    await supabase.from('work_orders').update({ status: '완료', completed_at: new Date().toISOString() }).eq('id', o.id);
    await supabase.from('sales_records').insert({
      work_date: new Date().toISOString().split('T')[0],
      customer_name: o.customer_name,
      work_type: o.work_type,
      weight: o.weight,
      unit_price: o.unit_price,
      total_price: Number(o.weight || 0) * Number(o.unit_price || 0),
      remarks: '작업완료 처리 화면에서 자동 생성',
    });
    alert('작업이 완료 처리되었고 생산전표(매출)에 자동 반영되었습니다.');
    load();
  };

  if (!orders) return <p style={box.loadingText}>불러오는 중...</p>;

  return (
    <div style={box.page}>
      <div>
        <h2 style={box.title}>작업완료 처리 (모바일)</h2>
        <p style={box.hint}>완료 처리 시 생산전표(매출)에 실제로 자동 반영됩니다.</p>
      </div>
      <div style={{ width: '340px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {orders.length === 0 && <p style={box.emptyText}>진행중인 작업지시가 없습니다.</p>}
        {orders.map((o) => (
          <div key={o.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '16px' }}>
            <div style={{ fontWeight: 700, color: COLORS.navy }}>{o.customer_name} · {o.work_type}</div>
            <div style={{ fontSize: '13px', color: COLORS.steel, margin: '6px 0 14px' }}>{o.unit_price}원/kg · 예상 {fmtNum(o.weight)}kg</div>
            <button onClick={() => complete(o)} style={{ ...box.primaryBtn, width: '100%', backgroundColor: '#dd6b20' }}>작업 완료</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- 10 거래명세서 조회 (세금계산서/증빙 문서 기준) ----------
export function ShipmentDocs() {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    supabase.from('tax_invoices').select('*').order('issue_date', { ascending: false }).then(({ data }) => setRows(data || []));
  }, []);
  if (!rows) return <p style={box.loadingText}>불러오는 중...</p>;
  return (
    <div style={box.page}>
      <h2 style={box.title}>거래명세서 조회</h2>
      <div style={box.card}>
        <table style={box.table}>
          <thead><tr><th style={box.th}>발행일</th><th style={box.th}>거래처</th><th style={box.th}>금액</th><th style={box.th}>상태</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td style={box.td} colSpan={4}>등록된 거래명세서가 없습니다.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={box.td}>{r.issue_date}</td>
                <td style={box.td}>{r.customer_name}</td>
                <td style={box.td}>{fmtWon(r.amount)}</td>
                <td style={box.td}><span style={pill(r.status === '발행완료' ? COLORS.greenBg : COLORS.redBg, r.status === '발행완료' ? COLORS.green : COLORS.red)}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- 11 거래처 상세 (360도 뷰) ----------
export function CompanyDetail({ companyName, onSelectCompany }) {
  const [companies, setCompanies] = useState([]);
  const [name, setName] = useState(companyName || '');
  const [data, setData] = useState(null);

  useEffect(() => {
    supabase.from('companies').select('name').order('name').then(({ data }) => setCompanies(data || []));
  }, []);

  useEffect(() => { if (companyName) setName(companyName); }, [companyName]);

  useEffect(() => {
    if (!name) return;
    (async () => {
      const [{ data: rec }, { data: sales }, { data: invoices }] = await Promise.all([
        supabase.from('receivables').select('*').eq('customer_name', name).maybeSingle(),
        supabase.from('sales_records').select('total_price, work_date, work_type, weight').eq('customer_name', name).order('work_date', { ascending: false }).limit(5),
        supabase.from('tax_invoices').select('status').eq('customer_name', name).order('issue_date', { ascending: false }).limit(1),
      ]);
      const { data: allSales } = await supabase.from('sales_records').select('total_price').eq('customer_name', name);
      const cumulative = (allSales || []).reduce((s, r) => s + Number(r.total_price || 0), 0);
      setData({ receivable: rec, recent: sales || [], cumulative, lastInvoiceStatus: invoices && invoices[0] ? invoices[0].status : null });
    })();
  }, [name]);

  return (
    <div style={box.page}>
      <h2 style={box.title}>거래처 상세 (360도 뷰)</h2>
      <div style={box.card}>
        <label style={box.label}>거래처 선택</label>
        <select style={{ ...box.input, maxWidth: '360px' }} value={name} onChange={(e) => { setName(e.target.value); onSelectCompany && onSelectCompany(e.target.value); }}>
          <option value="">선택하세요</option>
          {companies.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </div>
      {data && (
        <>
          <div style={box.statGrid}>
            <div style={box.statCard}><span style={box.statLabel}>미수금 잔액</span><span style={{ ...box.statValue, color: '#dd6b20' }}>{fmtWon(data.receivable?.amount || 0)}</span></div>
            <div style={box.statCard}><span style={box.statLabel}>누적 거래액</span><span style={box.statValue}>{fmtWon(data.cumulative)}</span></div>
            <div style={box.statCard}><span style={box.statLabel}>최근 세금계산서</span><span style={box.statValue}>{data.lastInvoiceStatus || '기록 없음'}</span></div>
          </div>
          <div style={box.card}>
            <h3 style={box.subtitle}>최근 거래이력</h3>
            {data.recent.length === 0 && <p style={box.emptyText}>거래 이력이 없습니다.</p>}
            <table style={box.table}>
              <thead><tr><th style={box.th}>일자</th><th style={box.th}>작업구분</th><th style={box.th}>중량</th><th style={box.th}>금액</th></tr></thead>
              <tbody>{data.recent.map((r, i) => <tr key={i}><td style={box.td}>{r.work_date}</td><td style={box.td}>{r.work_type}</td><td style={box.td}>{fmtNum(r.weight)}kg</td><td style={box.td}>{fmtWon(r.total_price)}</td></tr>)}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
