// src/pages/ScrapSalesPage.jsx
// 오성철강 스마트 ERP 2.0 — 스크랩 매출 관리
// 가공 중 발생한 스크랩(포장판고철/고철 등)을 매각할 때 계량증명업소에서 발급하는
// 계량증명서(총중량/차중량/실중량 + 단가/부가세/합계) 내용을 등록·관리합니다.
// 가공비 외 유일한 추가 매출원이므로, 등록 시 daily_ledger(수입)에도 자동 반영되어
// 일계표/데일리 리포트/월간 분석/대표님 브리핑의 매출 집계에 함께 잡힙니다.
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const BUCKET = 'scrap-receipts';

const C = {
  surface0: '#EEF1F6', surface1: '#F4F6FA', surface2: '#FFFFFF',
  border: '#E3E8F0', borderStrong: '#C9D2E0',
  textPrimary: '#0F1E33', textSecondary: '#4D5C72', textMuted: '#8592A6',
  accent: '#1C7A4D', onAccent: '#FFFFFF', bgAccent: '#E2F5EA', textAccent: '#1C7A4D', borderAccent: '#1C7A4D',
  textDanger: '#C8372C', bgDanger: '#FBE6E4', borderDanger: '#C8372C',
  navyGradient: 'linear-gradient(160deg, #1c3d2e 0%, #0d1f16 100%)',
};

const inputStyle = { height: '46px', padding: '0 12px', border: `1.5px solid ${C.borderStrong}`, borderRadius: '9px', fontSize: '16px', fontFamily: 'inherit', background: C.surface2, color: C.textPrimary, width: '100%', boxSizing: 'border-box' };
const labelStyle = { fontSize: '13px', color: C.textMuted, marginBottom: '5px', fontWeight: 700 };
const btnStyle = (active, color) => ({ fontSize: '16px', padding: '10px 16px', borderRadius: '10px', border: `1.5px solid ${active ? (color || C.accent) : C.borderStrong}`, background: active ? (color || C.accent) : C.surface2, color: active ? C.onAccent : C.textPrimary, cursor: 'pointer', fontWeight: active ? 800 : 600, fontFamily: 'inherit' });
const th = { padding: '10px 10px', fontSize: '14px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, background: C.surface1, color: C.textSecondary, fontWeight: 700 };
const td = { padding: '9px 10px', fontSize: '15px', textAlign: 'left', borderBottom: `1px solid ${C.border}` };
const boxMsg = (text, extra) => <div style={{ background: C.surface1, border: `1px solid ${C.border}`, borderRadius: '8px', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', fontSize: '16px', color: C.textMuted, padding: '10px 14px', ...extra }}>{text}</div>;
function statCard(label, val, color) {
  return (
    <div style={{ background: C.surface1, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(15,30,51,0.05)' }}>
      <div style={{ fontSize: '14px', color: C.textMuted, marginBottom: '5px' }}>{label}</div>
      <div style={{ fontSize: '26px', fontWeight: 800, color: color || C.textPrimary }}>{val}</div>
    </div>
  );
}

const SUBS = [['dashboard', '📊 대시보드'], ['list', '📋 목록'], ['form', '➕ 등록']];
const ITEM_OPTIONS = ['포장판고철', '고철', '기타'];

function todayStr() { return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }); }
function fmtWon(n) { return Number(n || 0).toLocaleString() + '원'; }
function fmtKg(n) { return Number(n || 0).toLocaleString() + 'kg'; }

/* ==================================================================== */
export default function ScrapSalesPage() {
  const [sub, setSub] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: C.navyGradient, borderRadius: '14px', padding: '18px 22px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(15,30,51,0.18)' }}>
        <span style={{ fontSize: '26px' }}>♻️</span>
        <div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', marginBottom: '2px' }}>스크랩 매출 관리</div>
          <div style={{ fontSize: '21px', fontWeight: 800, color: '#fff' }}>가공 중 발생 스크랩(포장판고철/고철) 매각 매출</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
        {SUBS.map(([k, label]) => <button key={k} style={{ ...btnStyle(sub === k), fontSize: '16px', padding: '11px 18px' }} onClick={() => setSub(k)}>{label}</button>)}
      </div>

      {sub === 'dashboard' && <DashboardTab refreshKey={refreshKey} />}
      {sub === 'list' && <ListTab refreshKey={refreshKey} onChanged={bump} />}
      {sub === 'form' && <FormTab onSaved={() => { bump(); setSub('list'); }} />}
    </div>
  );
}

/* ---------------- 대시보드 ---------------- */
function DashboardTab({ refreshKey }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    supabase.from('scrap_sales').select('*').order('sale_date', { ascending: false }).then(({ data }) => setRows(data || []));
  }, [refreshKey]);

  if (!rows) return boxMsg('불러오는 중...', { justifyContent: 'center' });

  const now = new Date();
  const ym = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 7);
  const thisMonth = rows.filter((r) => (r.sale_date || '').slice(0, 7) === ym);
  const thisMonthTotal = thisMonth.reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const thisMonthWeight = thisMonth.reduce((s, r) => s + Number(r.net_weight || 0), 0);
  const allTotal = rows.reduce((s, r) => s + Number(r.total_amount || 0), 0);

  // 최근 6개월 월별 합계
  const byMonth = {};
  rows.forEach((r) => {
    const k = (r.sale_date || '').slice(0, 7);
    if (!k) return;
    byMonth[k] = (byMonth[k] || 0) + Number(r.total_amount || 0);
  });
  const months = Object.keys(byMonth).sort().slice(-6);
  const maxMonthTotal = Math.max(1, ...months.map((m) => byMonth[m]));

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '10px', marginBottom: '20px' }}>
        {statCard('이번달 스크랩 매출', fmtWon(thisMonthTotal), C.textAccent)}
        {statCard('이번달 건수', thisMonth.length + '건')}
        {statCard('이번달 매각 중량', fmtKg(thisMonthWeight))}
        {statCard('누적 스크랩 매출', fmtWon(allTotal))}
      </div>

      <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(15,30,51,0.06)' }}>
        <div style={{ fontSize: '16px', fontWeight: 800, color: C.textSecondary, marginBottom: '14px' }}>📈 최근 월별 스크랩 매출</div>
        {months.length === 0 ? boxMsg('등록된 스크랩 매출이 없습니다', { justifyContent: 'center' }) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {months.map((m) => {
              const pct = Math.round((byMonth[m] / maxMonthTotal) * 100);
              return (
                <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '70px', fontSize: '14px', fontWeight: 700, color: C.textPrimary }}>{m}</span>
                  <div style={{ flex: 1, background: C.surface1, borderRadius: '6px', overflow: 'hidden', height: '20px' }}>
                    <div style={{ width: pct + '%', height: '100%', background: C.accent }} />
                  </div>
                  <span style={{ width: '120px', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: C.textAccent }}>{fmtWon(byMonth[m])}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ background: C.bgAccent, border: `1px solid ${C.borderAccent}`, borderRadius: '10px', padding: '12px 16px', fontSize: '14px', color: C.textAccent, lineHeight: 1.6 }}>
        ℹ️ 가공비 외에 유일한 추가 매출원입니다. 매각 시 계량증명업소에서 받은 계량증명서를 기준으로 이 화면에서 등록하면, 일계표·데일리 리포트·월간 분석·대표님 브리핑의 매출 합계(기타 수입)에도 자동으로 반영됩니다.
      </div>
    </div>
  );
}

/* ---------------- 목록 ---------------- */
function ListTab({ refreshKey, onChanged }) {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    supabase.from('scrap_sales').select('*').order('sale_date', { ascending: false }).order('id', { ascending: false }).then(({ data }) => setRows(data || []));
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  if (!rows) return boxMsg('불러오는 중...', { justifyContent: 'center' });
  const filtered = rows.filter((r) => !q || (r.item_name || '').includes(q) || (r.vehicle_no || '').includes(q) || (r.buyer_name || '').includes(q));
  const totalAmount = filtered.reduce((s, r) => s + Number(r.total_amount || 0), 0);

  const viewReceipt = async (r) => {
    if (!r.receipt_file_path) { alert('첨부된 계량증명서 사진이 없습니다.'); return; }
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(r.receipt_file_path, 60 * 10);
    if (error || !data) { alert('사진 열기 실패: ' + (error?.message || '')); return; }
    window.open(data.signedUrl, '_blank');
  };

  const removeRow = async (r) => {
    if (!window.confirm(`${r.sale_date} · ${r.item_name} · ${fmtWon(r.total_amount)} 내역을 삭제할까요?`)) return;
    if (r.ledger_id) await supabase.from('daily_ledger').delete().eq('id', r.ledger_id);
    if (r.receipt_file_path) await supabase.storage.from(BUCKET).remove([r.receipt_file_path]);
    await supabase.from('scrap_sales').delete().eq('id', r.id);
    load();
    onChanged();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
        <div style={{ fontSize: '17px', fontWeight: 700, color: C.textSecondary }}>스크랩 매출 내역 · {filtered.length}건 · 합계 {fmtWon(totalAmount)}</div>
        <input style={{ ...inputStyle, maxWidth: '260px' }} placeholder="품명/차량번호/매입처 검색" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {filtered.length === 0 ? boxMsg('등록된 스크랩 매출이 없습니다', { justifyContent: 'center' }) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>일자</th><th style={th}>차량번호</th><th style={th}>품명</th><th style={th}>매입처</th>
                <th style={th}>실중량</th><th style={th}>단가</th><th style={th}>공급가액</th><th style={th}>부가세</th><th style={th}>합계</th>
                <th style={th}></th><th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 ? C.surface1 : 'transparent' }}>
                  <td style={td}>{r.sale_date}</td>
                  <td style={td}>{r.vehicle_no || '-'}</td>
                  <td style={td}>{r.item_name}</td>
                  <td style={td}>{r.buyer_name}</td>
                  <td style={td}>{fmtKg(r.net_weight)}</td>
                  <td style={td}>{Number(r.unit_price || 0).toLocaleString()}원/kg</td>
                  <td style={td}>{fmtWon(r.supply_amount)}</td>
                  <td style={td}>{fmtWon(r.vat_amount)}</td>
                  <td style={{ ...td, fontWeight: 800, color: C.textAccent }}>{fmtWon(r.total_amount)}</td>
                  <td style={td}><button style={{ ...btnStyle(false), padding: '6px 12px', fontSize: '13px' }} onClick={() => viewReceipt(r)}>📷 증명서</button></td>
                  <td style={td}><button style={{ ...btnStyle(false, C.textDanger), padding: '6px 12px', fontSize: '13px', borderColor: C.borderDanger, color: C.textDanger }} onClick={() => removeRow(r)}>삭제</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------- 등록 ---------------- */
function FormTab({ onSaved }) {
  const initial = {
    sale_date: todayStr(), vehicle_no: '', item_name: '포장판고철', buyer_name: '제일계량증명업소',
    gross_weight: '', tare_weight: '', net_weight: '', unit_price: '', supply_amount: '', vat_amount: '', total_amount: '', memo: '',
  };
  const [form, setForm] = useState(initial);
  const [autoCalc, setAutoCalc] = useState(true);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // 총중량/차중량 입력 시 실중량 자동 계산
  useEffect(() => {
    if (!autoCalc) return;
    const g = Number(form.gross_weight), t = Number(form.tare_weight);
    if (form.gross_weight !== '' && form.tare_weight !== '' && !isNaN(g) && !isNaN(t)) {
      set('net_weight', String(Math.max(0, g - t)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.gross_weight, form.tare_weight, autoCalc]);

  // 실중량 × 단가 → 공급가액 → 부가세(10%) → 합계 자동 계산
  useEffect(() => {
    if (!autoCalc) return;
    const w = Number(form.net_weight), p = Number(form.unit_price);
    if (form.net_weight !== '' && form.unit_price !== '' && !isNaN(w) && !isNaN(p)) {
      const supply = Math.round(w * p);
      const vat = Math.round(supply * 0.1);
      setForm((f) => ({ ...f, supply_amount: String(supply), vat_amount: String(vat), total_amount: String(supply + vat) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.net_weight, form.unit_price, autoCalc]);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (f && f.size > 15 * 1024 * 1024) { alert('파일 용량은 15MB 이하로 올려주세요.'); e.target.value = ''; return; }
    setFile(f || null);
  };

  const reset = () => { setForm(initial); setFile(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.sale_date || !form.item_name || !form.net_weight || !form.unit_price || !form.total_amount) {
      alert('계량일자/품명/실중량/단가/합계금액은 필수입니다.'); return;
    }
    setSaving(true);
    try {
      let receiptPath = null, receiptName = null;
      if (file) {
        const safeName = file.name.replace(/[^\w.\-가-힣]/g, '_');
        receiptPath = `receipts/${form.sale_date}/${Date.now()}_${safeName}`;
        receiptName = file.name;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(receiptPath, file, { upsert: false });
        if (upErr) throw upErr;
      }

      // 1) daily_ledger에 매출(수입)로 먼저 반영
      const { data: ledgerRow, error: ledgerErr } = await supabase.from('daily_ledger').insert({
        trans_date: form.sale_date, type: '수입', company: form.buyer_name,
        description: `스크랩 매출(${form.item_name}${form.vehicle_no ? ' · ' + form.vehicle_no : ''})`,
        amount: Number(form.total_amount), method: '이체', status: '지불완료',
      }).select('id').single();
      if (ledgerErr) throw ledgerErr;

      // 2) scrap_sales 등록 (daily_ledger row와 연결)
      const { error: insErr } = await supabase.from('scrap_sales').insert({
        sale_date: form.sale_date, vehicle_no: form.vehicle_no || null, item_name: form.item_name, buyer_name: form.buyer_name,
        gross_weight: form.gross_weight ? Number(form.gross_weight) : null,
        tare_weight: form.tare_weight ? Number(form.tare_weight) : null,
        net_weight: Number(form.net_weight), unit_price: Number(form.unit_price),
        supply_amount: Number(form.supply_amount || 0), vat_amount: Number(form.vat_amount || 0), total_amount: Number(form.total_amount),
        receipt_file_path: receiptPath, receipt_file_name: receiptName, memo: form.memo || null,
        ledger_id: ledgerRow.id,
      });
      if (insErr) throw insErr;

      alert('✅ 스크랩 매출이 등록되었습니다. (일계표 매출에도 자동 반영됨)');
      reset();
      onSaved();
    } catch (err) {
      alert('등록 실패: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '22px', boxShadow: '0 1px 3px rgba(15,30,51,0.06)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '16px', marginBottom: '16px' }}>
        <div><div style={labelStyle}>계량일자 *</div><input type="date" style={inputStyle} value={form.sale_date} max={todayStr()} onChange={(e) => set('sale_date', e.target.value)} required /></div>
        <div><div style={labelStyle}>차량번호</div><input style={inputStyle} placeholder="예: 6792" value={form.vehicle_no} onChange={(e) => set('vehicle_no', e.target.value)} /></div>
        <div>
          <div style={labelStyle}>품명 *</div>
          <select style={inputStyle} value={form.item_name} onChange={(e) => set('item_name', e.target.value)}>
            {ITEM_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div><div style={labelStyle}>매입처(계량증명업소)</div><input style={inputStyle} value={form.buyer_name} onChange={(e) => set('buyer_name', e.target.value)} /></div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <label style={{ fontSize: '14px', color: C.textSecondary, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input type="checkbox" checked={autoCalc} onChange={(e) => setAutoCalc(e.target.checked)} />
          중량/금액 자동 계산 (실중량=총중량-차중량, 부가세 10%)
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '16px', marginBottom: '16px' }}>
        <div><div style={labelStyle}>총중량(kg)</div><input type="number" style={inputStyle} value={form.gross_weight} onChange={(e) => set('gross_weight', e.target.value)} /></div>
        <div><div style={labelStyle}>차중량(kg)</div><input type="number" style={inputStyle} value={form.tare_weight} onChange={(e) => set('tare_weight', e.target.value)} /></div>
        <div><div style={labelStyle}>실중량(kg) *</div><input type="number" style={inputStyle} value={form.net_weight} onChange={(e) => set('net_weight', e.target.value)} required /></div>
        <div><div style={labelStyle}>단가(원/kg) *</div><input type="number" style={inputStyle} value={form.unit_price} onChange={(e) => set('unit_price', e.target.value)} required /></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '16px', marginBottom: '20px' }}>
        <div><div style={labelStyle}>공급가액(원)</div><input type="number" style={inputStyle} value={form.supply_amount} onChange={(e) => set('supply_amount', e.target.value)} /></div>
        <div><div style={labelStyle}>부가세(원)</div><input type="number" style={inputStyle} value={form.vat_amount} onChange={(e) => set('vat_amount', e.target.value)} /></div>
        <div><div style={labelStyle}>합계금액(원) *</div><input type="number" style={{ ...inputStyle, fontWeight: 800, color: C.textAccent }} value={form.total_amount} onChange={(e) => set('total_amount', e.target.value)} required /></div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={labelStyle}>계량증명서 사진 첨부 (선택)</div>
        <input type="file" accept="image/*,.pdf" onChange={handleFile} style={{ fontSize: '15px' }} />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={labelStyle}>메모</div>
        <input style={inputStyle} placeholder="선택 입력" value={form.memo} onChange={(e) => set('memo', e.target.value)} />
      </div>

      <button type="submit" disabled={saving} style={{ width: '100%', padding: '16px', background: C.accent, color: '#fff', border: 'none', borderRadius: '11px', fontWeight: 800, fontSize: '18px', cursor: 'pointer' }}>
        {saving ? '저장 중...' : '스크랩 매출 등록'}
      </button>
    </form>
  );
}
