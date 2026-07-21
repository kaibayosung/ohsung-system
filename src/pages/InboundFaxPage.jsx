// src/pages/InboundFaxPage.jsx
// 오성철강 스마트 ERP 2.0 — 입고현황 FAX 리포트
// 1) FAX번호 관리: 거래처별 팩스번호를 등록/관리합니다 (그린ERP 실거래 회사 전체 대상 검색).
// 2) 일일 입고 리포트: 선택한 날짜의 greenp_inbound 실데이터를 거래처별로 묶어
//    세련된 리포트로 미리보기·인쇄(PDF저장)하고, 발송 대기 큐(inbound_fax_queue)에 자동 등록합니다.
//    ※ 매일 17:00 자동 FAX 발송은 enfax.com 발신 기능(팩스씨앗 구매 필요) 확인 후 다음 단계에서 연결합니다.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';

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

const inputStyle = { height: '46px', padding: '0 12px', border: `1.5px solid ${C.borderStrong}`, borderRadius: '9px', fontSize: '16px', fontFamily: 'inherit', background: C.surface2, color: C.textPrimary, width: '100%', boxSizing: 'border-box' };
const btnStyle = (active) => ({ fontSize: '16px', padding: '10px 16px', borderRadius: '10px', border: `1.5px solid ${active ? C.accent : C.borderStrong}`, background: active ? C.accent : C.surface2, color: active ? C.onAccent : C.textPrimary, cursor: 'pointer', fontWeight: active ? 800 : 600, fontFamily: 'inherit' });
const boxMsg = (text, extra) => <div style={{ background: C.surface1, border: `1px solid ${C.border}`, borderRadius: '8px', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', fontSize: '16px', color: C.textMuted, padding: '10px 14px', ...extra }}>{text}</div>;
const th = { padding: '10px 10px', fontSize: '14px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, background: C.surface1, color: C.textSecondary, fontWeight: 700 };
const td = { padding: '9px 10px', fontSize: '15px', textAlign: 'left', borderBottom: `1px solid ${C.border}` };
function statCard(label, val, color) {
  return (
    <div style={{ background: C.surface1, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(15,30,51,0.05)' }}>
      <div style={{ fontSize: '14px', color: C.textMuted, marginBottom: '5px' }}>{label}</div>
      <div style={{ fontSize: '26px', fontWeight: 800, color: color || C.textPrimary }}>{val}</div>
    </div>
  );
}

const SUBS = [['queue', '📠 일일 입고 리포트'], ['numbers', '☎ FAX 번호 관리']];

function kstDateStr(d) { return new Date(d).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }); }
function todayStr() { return kstDateStr(new Date()); }
function fmtKDate(s) { if (!s) return ''; const [y, m, d] = s.split('-'); return `${y}년 ${parseInt(m, 10)}월 ${parseInt(d, 10)}일`; }

/* ---------------- 거래처 검색 콤보박스 (그린ERP 실거래 전체 회사) ---------------- */
function CompanySearchBox({ companies, value, onChange, placeholder }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  useEffect(() => { setQuery(value || ''); }, [value]);
  const matches = (query ? companies.filter((n) => n.includes(query)) : companies).slice(0, 30);
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        style={{ ...inputStyle, background: '#fff' }}
        placeholder={placeholder || '거래처명 검색'}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); onChange(e.target.value); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && matches.length > 0 && (
        <div style={{ position: 'absolute', top: '50px', left: 0, right: 0, background: C.surface2, border: `1.5px solid ${C.borderStrong}`, borderRadius: '9px', boxShadow: '0 8px 20px rgba(15,30,51,0.18)', maxHeight: '260px', overflowY: 'auto', zIndex: 50 }}>
          {matches.map((name) => (
            <div key={name} onMouseDown={() => { onChange(name); setQuery(name); setOpen(false); }}
              style={{ padding: '9px 14px', fontSize: '15px', cursor: 'pointer', color: name === value ? C.textAccent : C.textPrimary, fontWeight: name === value ? 800 : 500, background: name === value ? C.bgAccent : 'transparent' }}
              onMouseEnter={(e) => { if (name !== value) e.currentTarget.style.background = C.surface1; }}
              onMouseLeave={(e) => { if (name !== value) e.currentTarget.style.background = 'transparent'; }}>
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* 오성철강 로고 마크 (5엽 꽃 + 흰 링 + 노란 중심) — 인쇄 리포트용 인라인 SVG */
const OHSUNG_LOGO_SVG = '<svg width="42" height="42" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="display:block;flex-shrink:0;">' +
  '<g fill="#2B2A72">' +
  '<path d="M50,50 C38,50 25,40 25,22 C25,10 38,3 50,3 C62,3 75,10 75,22 C75,40 62,50 50,50 Z"/>' +
  '<path d="M50,50 C38,50 25,40 25,22 C25,10 38,3 50,3 C62,3 75,10 75,22 C75,40 62,50 50,50 Z" transform="rotate(72 50 50)"/>' +
  '<path d="M50,50 C38,50 25,40 25,22 C25,10 38,3 50,3 C62,3 75,10 75,22 C75,40 62,50 50,50 Z" transform="rotate(144 50 50)"/>' +
  '<path d="M50,50 C38,50 25,40 25,22 C25,10 38,3 50,3 C62,3 75,10 75,22 C75,40 62,50 50,50 Z" transform="rotate(216 50 50)"/>' +
  '<path d="M50,50 C38,50 25,40 25,22 C25,10 38,3 50,3 C62,3 75,10 75,22 C75,40 62,50 50,50 Z" transform="rotate(288 50 50)"/>' +
  '</g>' +
  '<circle cx="50" cy="50" r="21" fill="#FFFFFF"/>' +
  '<circle cx="50" cy="50" r="10.5" fill="#F5C518"/>' +
  '</svg>';

/* ---------------- 세련된 입고현황 리포트 인쇄 HTML ---------------- */
function printInboundReport(company, faxNumber, dateLabel, rows) {
  const w = window.open('', '_blank', 'width=880,height=760');
  if (!w) { alert('팝업이 차단되었습니다. 브라우저의 팝업 차단을 해제해주세요.'); return; }
  const totalWeight = rows.reduce((s, r) => s + Number(r.weight || 0), 0);
  const bodyRows = rows.map((r, i) => `
    <tr style="background:${i % 2 ? '#F7F9FC' : '#fff'}">
      <td>${r.inbound_date || '-'}</td>
      <td>${r.product_name || '-'}</td>
      <td>${r.spec || '-'}</td>
      <td style="text-align:right;font-weight:700;">${Number(r.weight || 0).toLocaleString()}</td>
    </tr>`).join('');
  w.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>입고현황 리포트 - ${company}</title>
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
    .stamp { display:flex; justify-content:flex-end; margin-top:44px; }
    .stamp-box { position:relative; text-align:right; font-size:15px; color:#4D5C72; padding-top:70px; }
    .stamp-box .co { margin-top:6px; font-size:18px; font-weight:900; color:#0F1E33; }
    .stamp-box .seal { position:absolute; top:0; right:8px; width:78px; height:78px; border:3px solid #C8372C; border-radius:50%; color:#C8372C; display:flex; align-items:center; justify-content:center; text-align:center; font-weight:900; font-size:19px; letter-spacing:.05em; transform:rotate(-10deg); opacity:.85; }
    @media print { button { display:none !important; } body { padding:16px 22px; } }
    .printbar { text-align:center; margin-top:26px; }
    .printbar button { font-size:16px; padding:10px 22px; border-radius:9px; border:none; background:#E8830F; color:#fff; font-weight:800; cursor:pointer; }
  </style></head>
  <body>
    <div class="head">
      <div class="brand" style="display:flex;align-items:center;gap:11px;">${OHSUNG_LOGO_SVG}<div><div style="font-size:17px;">오성철강사</div><div class="sub">OHSUNG STEEL · SMART ERP 2.0</div></div></div>
      <div class="brand" style="text-align:right">
        <div class="sub">발행일시</div>
        ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
      </div>
    </div>
    <div class="title">
      <h1>입 고 현 황 리 포 트</h1>
      <div class="badge">DAILY INBOUND COIL REPORT</div>
    </div>
    <div class="meta">
      <span>거래처: <b>${company}</b></span>
      <span>입고일자: <b>${dateLabel}</b></span>
      <span>수신 FAX: <b>${faxNumber || '미등록'}</b></span>
    </div>
    <table>
      <thead><tr><th>입고일자</th><th>품명</th><th>규격</th><th style="text-align:right">중량(kg)</th></tr></thead>
      <tbody>${bodyRows || '<tr><td colspan="4" style="text-align:center;color:#8592A6;padding:20px;">입고 내역이 없습니다</td></tr>'}</tbody>
      <tfoot><tr><td colspan="3" style="text-align:right;">중량 합계</td><td style="text-align:right;">${totalWeight.toLocaleString()} kg</td></tr></tfoot>
    </table>
    <div class="footnote">
      본 리포트는 오성철강 스마트 ERP 2.0에서 그린ERP 실시간 연동 데이터를 기반으로 자동 생성되었습니다.<br/>
      내용에 이상이 있으신 경우 오성철강사로 연락 주시기 바랍니다.
    </div>
    <div class="stamp">
      <div class="stamp-box">
        <div class="seal">확인</div>
        <div class="co">오 성 철 강 사</div>
      </div>
    </div>
    <div class="printbar"><button onclick="window.print()">🖨️ 인쇄 / PDF 저장</button></div>
  </body></html>`);
  w.document.close(); w.focus();
}

/* ==================================================================== */
export default function InboundFaxPage() {
  const [sub, setSub] = useState('queue');
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    supabase.from('greenp_customers').select('name').order('name', { ascending: true }).then(({ data }) => {
      setCompanies((data || []).map((r) => r.name));
    });
  }, []);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: C.navyGradient, borderRadius: '14px', padding: '18px 22px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(15,30,51,0.18)' }}>
        <span style={{ fontSize: '26px' }}>📠</span>
        <div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', marginBottom: '2px' }}>입고현황 FAX 리포트</div>
          <div style={{ fontSize: '21px', fontWeight: 800, color: '#fff' }}>거래처별 일일 입고 코일 리스트 발송</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
        {SUBS.map(([k, label]) => <button key={k} style={{ ...btnStyle(sub === k), fontSize: '16px', padding: '11px 18px' }} onClick={() => setSub(k)}>{label}</button>)}
      </div>

      {sub === 'queue' && <DailyQueueTab companies={companies} />}
      {sub === 'numbers' && <FaxNumbersTab companies={companies} />}
    </div>
  );
}

/* ---------------- 탭 1: 일일 입고 리포트 (발송 큐 자동 생성) ---------------- */
function DailyQueueTab({ companies }) {
  const [date, setDate] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]); // [{company, rows, count, weight, faxNumber, status}]
  const [faxMap, setFaxMap] = useState({}); // company_name -> {fax_number, active}

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: inbound }, { data: faxRows }] = await Promise.all([
      supabase.from('greenp_inbound').select('*').eq('inbound_date', date).order('company_name'),
      supabase.from('customer_fax_numbers').select('company_name, fax_number, active'),
    ]);
    const fm = {};
    (faxRows || []).forEach((r) => { fm[r.company_name] = r; });
    setFaxMap(fm);

    const byCo = {};
    (inbound || []).forEach((r) => {
      if (!byCo[r.company_name]) byCo[r.company_name] = { company: r.company_name, rows: [], weight: 0 };
      byCo[r.company_name].rows.push(r);
      byCo[r.company_name].weight += Number(r.weight || 0);
    });
    const list = Object.values(byCo).map((g) => {
      const fx = fm[g.company];
      const hasActiveFax = fx && fx.active && fx.fax_number;
      return { ...g, count: g.rows.length, faxNumber: fx?.fax_number || null, status: hasActiveFax ? 'ready' : 'no_fax_number' };
    }).sort((a, b) => b.weight - a.weight);
    setGroups(list);
    setLoading(false);

    // 발송 대기 큐에 자동 반영 (자동발송 연동 전까지는 상태 추적용)
    if (list.length > 0) {
      const upserts = list.map((g) => ({
        report_date: date, company_name: g.company, fax_number: g.faxNumber,
        coil_count: g.count, total_weight: g.weight, status: g.status,
      }));
      await supabase.from('inbound_fax_queue').upsert(upserts, { onConflict: 'report_date,company_name' });
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const totalCompanies = groups.length;
  const totalCoils = groups.reduce((s, g) => s + g.count, 0);
  const totalWeight = groups.reduce((s, g) => s + g.weight, 0);
  const noFaxCount = groups.filter((g) => g.status === 'no_fax_number').length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: C.surface1, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
        <span style={{ fontSize: '16px', fontWeight: 700, color: C.textSecondary }}>📅 조회일자</span>
        <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, height: '38px', width: '160px', fontSize: '15px' }} />
        <span style={{ fontSize: '15px', color: C.textAccent, fontWeight: 700 }}>{fmtKDate(date)}{loading ? ' · 불러오는 중...' : ''}</span>
      </div>

      <div style={{ background: C.bgAccent, border: `1px solid ${C.borderAccent}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '18px', fontSize: '14px', color: C.textAccent, lineHeight: 1.6 }}>
        ℹ️ 매일 오후 5시 자동 FAX 발송은 enfax.com 발신 크레딧(팩스씨앗) 확인 후 다음 단계에서 연결됩니다. 그 전까지는 이 화면에서 거래처별로 미리보기·인쇄(PDF저장) 후 수동으로 팩스 전송해주세요. 아래 목록은 발송 대기 큐에도 자동 기록됩니다.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '10px', marginBottom: '18px' }}>
        {statCard('입고 거래처', totalCompanies + '개사')}
        {statCard('총 코일 수', totalCoils.toLocaleString() + '개')}
        {statCard('총 중량', (totalWeight / 1000).toFixed(1) + '톤', C.textAccent)}
        {statCard('FAX 미등록', noFaxCount + '개사', noFaxCount > 0 ? C.textDanger : C.textSuccess)}
      </div>

      {loading ? boxMsg('불러오는 중...', { justifyContent: 'center' }) : groups.length === 0 ? boxMsg(`${fmtKDate(date)}에 입고 내역이 없습니다`, { justifyContent: 'center' }) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {groups.map((g) => (
            <div key={g.company} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', boxShadow: '0 1px 3px rgba(15,30,51,0.06)' }}>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <div style={{ fontSize: '17px', fontWeight: 800, color: C.textPrimary }}>{g.company}</div>
                <div style={{ fontSize: '13px', color: C.textMuted, marginTop: '3px' }}>
                  코일 {g.count}개 · {(g.weight / 1000).toFixed(1)}톤
                </div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, padding: '5px 12px', borderRadius: '999px', background: g.status === 'ready' ? C.bgSuccess : C.bgDanger, color: g.status === 'ready' ? C.textSuccess : C.textDanger }}>
                {g.status === 'ready' ? `☎ ${g.faxNumber}` : '⚠ FAX 번호 미등록'}
              </div>
              <button style={{ ...btnStyle(true), whiteSpace: 'nowrap' }} onClick={() => printInboundReport(g.company, g.faxNumber, fmtKDate(date), g.rows)}>🖨️ 미리보기/인쇄</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- 탭 2: FAX 번호 관리 ---------------- */
function FaxNumbersTab({ companies }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ id: null, company_name: '', fax_number: '', contact_person: '', memo: '', active: true });

  const load = useCallback(() => {
    setLoading(true);
    supabase.from('customer_fax_numbers').select('*').order('company_name').then(({ data }) => { setRows(data || []); setLoading(false); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const resetForm = () => setForm({ id: null, company_name: '', fax_number: '', contact_person: '', memo: '', active: true });

  const save = async () => {
    if (!form.company_name) { alert('거래처를 선택하세요.'); return; }
    if (!form.fax_number) { alert('FAX 번호를 입력하세요.'); return; }
    const payload = { company_name: form.company_name, fax_number: form.fax_number, contact_person: form.contact_person || null, memo: form.memo || null, active: form.active, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('customer_fax_numbers').upsert(payload, { onConflict: 'company_name' });
    if (error) { alert('저장 실패: ' + error.message); return; }
    resetForm();
    load();
  };

  const toggleActive = async (r) => {
    await supabase.from('customer_fax_numbers').update({ active: !r.active }).eq('id', r.id);
    load();
  };
  const remove = async (r) => {
    if (!window.confirm(`${r.company_name} FAX 번호를 삭제할까요?`)) return;
    await supabase.from('customer_fax_numbers').delete().eq('id', r.id);
    load();
  };

  return (
    <div>
      <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(15,30,51,0.06)' }}>
        <div style={{ fontSize: '17px', fontWeight: 800, color: C.textSecondary, marginBottom: '12px' }}>{form.id ? '✏️ FAX 번호 수정' : '➕ FAX 번호 등록'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '12px', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '13px', color: C.textMuted, marginBottom: '4px' }}>거래처</div>
            <CompanySearchBox companies={companies} value={form.company_name} onChange={(v) => setForm((f) => ({ ...f, company_name: v }))} placeholder="거래처명 검색 (예: 에버스틸, 태경)" />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: C.textMuted, marginBottom: '4px' }}>FAX 번호</div>
            <input style={inputStyle} value={form.fax_number} onChange={(e) => setForm((f) => ({ ...f, fax_number: e.target.value }))} placeholder="예: 031-123-4567" />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: C.textMuted, marginBottom: '4px' }}>담당자(선택)</div>
            <input style={inputStyle} value={form.contact_person} onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))} placeholder="예: 홍길동 과장" />
          </div>
        </div>
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '13px', color: C.textMuted, marginBottom: '4px' }}>메모(선택)</div>
          <input style={inputStyle} value={form.memo} onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))} placeholder="예: 매일 오후 5시 발송 희망" />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ ...btnStyle(true) }} onClick={save}>{form.id ? '수정 저장' : '등록'}</button>
          {form.id && <button style={btnStyle(false)} onClick={resetForm}>취소</button>}
        </div>
      </div>

      <div style={{ fontSize: '17px', fontWeight: 700, margin: '4px 0 8px', color: C.textSecondary }}>등록된 거래처 FAX 번호 <span style={{ fontSize: '14px', fontWeight: 500, color: C.textMuted }}>({rows.length}개사)</span></div>
      {loading ? boxMsg('불러오는 중...', { justifyContent: 'center' }) : rows.length === 0 ? boxMsg('등록된 FAX 번호가 없습니다', { justifyContent: 'center' }) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: C.surface2, borderRadius: '8px', overflow: 'hidden' }}>
          <thead><tr><th style={th}>거래처</th><th style={th}>FAX 번호</th><th style={th}>담당자</th><th style={th}>메모</th><th style={th}>상태</th><th style={th}></th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} style={{ background: i % 2 ? C.surface1 : 'transparent' }}>
                <td style={{ ...td, fontWeight: 700 }}>{r.company_name}</td>
                <td style={td}>{r.fax_number}</td>
                <td style={td}>{r.contact_person || '-'}</td>
                <td style={td}>{r.memo || '-'}</td>
                <td style={td}>
                  <button onClick={() => toggleActive(r)} style={{ fontSize: '13px', padding: '3px 10px', borderRadius: '999px', border: 'none', fontWeight: 700, cursor: 'pointer', background: r.active ? C.bgSuccess : C.bgWarning, color: r.active ? C.textSuccess : C.textWarning }}>
                    {r.active ? '발송대상' : '중지됨'}
                  </button>
                </td>
                <td style={td}>
                  <button onClick={() => setForm({ id: r.id, company_name: r.company_name, fax_number: r.fax_number, contact_person: r.contact_person || '', memo: r.memo || '', active: r.active })} style={{ fontSize: '13px', padding: '4px 10px', borderRadius: '7px', border: `1px solid ${C.borderStrong}`, background: '#fff', cursor: 'pointer', marginRight: '6px' }}>수정</button>
                  <button onClick={() => remove(r)} style={{ fontSize: '13px', padding: '4px 10px', borderRadius: '7px', border: `1px solid ${C.borderDanger}`, background: '#fff', color: C.textDanger, cursor: 'pointer' }}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
