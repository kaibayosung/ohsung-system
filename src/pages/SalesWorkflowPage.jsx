// src/pages/SalesWorkflowPage.jsx
// 영업 핵심 워크플로우 — 실제 Supabase 연동 프로그램.
// 발주접수 → 코일배정지시 → 작업지시서처리 → 현장공정모니터링 → 고객통지/배차지시 →
// 출고처리 → 사후대응/거래처관리, + 지게차 기사용 코일검색 화면.
// (오성철강_ERP2_동작프로토타입.html 에서 검증한 UX를 실데이터(coils/sales_orders)로 재구현)
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { COLORS, box, pill, fmtNum } from './test/theme';

const STEPS = [
  ['kanban', '전체 현황판'],
  ['register', '① 발주 접수'],
  ['assign', '② 코일 배정 지시'],
  ['workorder', '③ 작업지시서 처리'],
  ['monitor', '④ 현장 공정 모니터링'],
  ['notify', '⑤ 고객 통지 · 배차 지시'],
  ['shipment', '⑥ 출고 처리'],
  ['aftercare', '⑦ 사후 대응 · 거래처 관리'],
  ['forklift', '🚜 지게차 코일 검색'],
];

const STATUS_LABEL = {
  RECEIVED: '접수확인중', SEARCH: '코일탐색중', WORKING: '작업중',
  DONE: '작업완료', DISPATCH: '배차완료', SHIPPED: '출고완료',
};
const STATUS_COLOR = {
  RECEIVED: { bg: COLORS.amberBg, color: COLORS.amber },
  SEARCH: { bg: COLORS.blueBg, color: COLORS.blue },
  WORKING: { bg: COLORS.accentBg, color: COLORS.accentDark },
  DONE: { bg: COLORS.greenBg, color: COLORS.green },
  DISPATCH: { bg: COLORS.blueBg, color: COLORS.blue },
  SHIPPED: { bg: '#e9edf3', color: COLORS.steel },
};
const PROD_TYPE_COLOR = {
  자사생산: { bg: COLORS.greenBg, color: COLORS.green },
  임가공: { bg: COLORS.amberBg, color: COLORS.amber },
  외주가공: { bg: COLORS.accentBg, color: COLORS.accentDark },
};

function statusPill(status) {
  const c = STATUS_COLOR[status] || { bg: '#eee', color: '#555' };
  return <span style={pill(c.bg, c.color)}>{STATUS_LABEL[status] || status}</span>;
}
function prodTypePill(t) {
  const c = PROD_TYPE_COLOR[t] || { bg: '#eee', color: '#555' };
  return <span style={pill(c.bg, c.color)}>{t}</span>;
}

function printHTML(title, bodyHtml) {
  const w = window.open('', '_blank', 'width=920,height=720');
  if (!w) { alert('팝업이 차단되었습니다. 브라우저의 팝업 차단을 해제해주세요.'); return; }
  w.document.write(`<html><head><meta charset="UTF-8"><title>${title}</title><style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Pretendard,sans-serif;padding:24px;color:#0F1E33;}
    h2{margin:0 0 4px;font-size:24px;}
    .meta{font-size:14px;color:#8592A6;margin-bottom:16px;}
    table{width:100%;border-collapse:collapse;}
    th,td{border:1px solid #C9D2E0;padding:8px 10px;font-size:15px;text-align:left;}
    th{background:#F4F6FA;color:#4D5C72;}
    @media print{button{display:none;}}
  </style></head><body>
  <h2>${title}</h2><div class="meta">오성철강 스마트 ERP 2.0 · 출력일시 ${new Date().toLocaleString('ko-KR')}</div>
  ${bodyHtml}
  <div style="margin-top:18px;"><button onclick="window.print()" style="font-size:16px;padding:8px 16px;">인쇄</button></div>
  </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

function coilTableHtml(list) {
  if (!list.length) return '<div>해당 조건의 재고가 없습니다.</div>';
  const rows = list.map((c) => `<tr><td>${c.coil_code}</td><td>${c.thickness}</td><td>${c.spec || '-'}</td><td>Bay ${c.bay_location || '-'}</td><td>${fmtNum(c.remain_weight)}Kg</td><td>${c.received_date || '-'}</td></tr>`).join('');
  return `<table><thead><tr><th>코일ID</th><th>두께</th><th>규격</th><th>위치</th><th>잔량</th><th>입고일</th></tr></thead><tbody>${rows}</tbody></table>`;
}

const emptyForm = {
  company_name: '', thickness: '', spec: '', weight: '', urgent: false,
  prod_type: '자사생산', outsourcing_company: '', due_date: '', sender: '', contact_phone: '', memo: '',
};

function SalesWorkflowPage() {
  const [step, setStep] = useState('kanban');
  const [orders, setOrders] = useState([]);
  const [coils, setCoils] = useState([]);
  const [enfax, setEnfax] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [flSearch, setFlSearch] = useState({ company: '', thickness: '', spec: '' });
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [ordersRes, coilsRes, enfaxRes, companiesRes] = await Promise.all([
      supabase.from('sales_orders').select('*, coils(*)').order('created_at', { ascending: false }),
      supabase.from('coils').select('*').order('thickness', { ascending: true }),
      supabase.from('enfax_inbox').select('*').order('received_at', { ascending: false }),
      supabase.from('companies').select('*').order('name', { ascending: true }),
    ]);
    setOrders(ordersRes.data || []);
    setCoils(coilsRes.data || []);
    setEnfax(enfaxRes.data || []);
    setCompanies(companiesRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const genOrderNo = () => {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const seq = String(orders.filter((o) => o.order_no.startsWith(`OD${ymd}`)).length + 1).padStart(2, '0');
    return `OD${ymd}-${seq}`;
  };

  const createOrder = async () => {
    if (!form.company_name || !form.thickness) { alert('업체명과 두께는 필수입니다.'); return; }
    setSaving(true);
    const { error } = await supabase.from('sales_orders').insert({
      order_no: genOrderNo(),
      company_name: form.company_name,
      thickness: parseFloat(form.thickness),
      spec: form.spec || null,
      weight: form.weight ? parseFloat(form.weight) : null,
      urgent: !!form.urgent,
      prod_type: form.prod_type,
      outsourcing_company: form.prod_type === '외주가공' ? (form.outsourcing_company || null) : null,
      status: 'RECEIVED',
      due_date: form.due_date || null,
      sender: form.sender || null,
      contact_phone: form.contact_phone || null,
      memo: form.memo || null,
    });
    setSaving(false);
    if (error) { alert('등록 실패: ' + error.message); return; }
    setForm(emptyForm);
    fetchAll();
  };

  const confirmFax = async (fax) => {
    await supabase.from('enfax_inbox').update({ status: 'done' }).eq('id', fax.id);
    setForm((f) => ({ ...f, sender: fax.sender || f.sender }));
    setStep('register');
    fetchAll();
  };

  const assignCoil = async (orderId, coilId) => {
    if (!window.confirm('이 코일을 배정하시겠습니까?')) return;
    const { error } = await supabase.from('sales_orders').update({ coil_id: coilId, status: 'SEARCH', updated_at: new Date().toISOString() }).eq('id', orderId);
    if (error) { alert('배정 실패: ' + error.message); return; }
    fetchAll();
  };

  const updateStatus = async (orderId, status) => {
    const { error } = await supabase.from('sales_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId);
    if (error) { alert('처리 실패: ' + error.message); return; }
    fetchAll();
  };

  const shipOrder = async (order) => {
    if (!window.confirm(`${order.company_name} (${order.order_no}) 건을 출고 처리하시겠습니까?`)) return;
    const { error: e1 } = await supabase.from('sales_orders').update({ status: 'SHIPPED', updated_at: new Date().toISOString() }).eq('id', order.id);
    if (e1) { alert('출고 처리 실패: ' + e1.message); return; }
    if (order.coil_id && order.coils) {
      const newRemain = Math.max(0, Number(order.coils.remain_weight || 0) - Number(order.weight || 0));
      await supabase.from('coils').update({ remain_weight: newRemain, status: newRemain <= 0 ? '소진' : '재고' }).eq('id', order.coil_id);
    }
    fetchAll();
  };

  const startEdit = (o) => { setEditingOrderId(o.id); setEditForm({ company_name: o.company_name, thickness: o.thickness }); };
  const saveEdit = async (id) => {
    if (!editForm.company_name || !editForm.thickness) { alert('업체명/두께를 입력하세요.'); return; }
    await supabase.from('sales_orders').update({ company_name: editForm.company_name, thickness: parseFloat(editForm.thickness) }).eq('id', id);
    setEditingOrderId(null);
    fetchAll();
  };
  const deleteOrder = async (id) => {
    if (!window.confirm('이 발주를 삭제하시겠습니까? 되돌릴 수 없습니다.')) return;
    await supabase.from('sales_orders').delete().eq('id', id);
    fetchAll();
  };

  const saveCompanyNotes = async (companyId, notes) => {
    await supabase.from('companies').update({ notes }).eq('id', companyId);
    fetchAll();
  };

  if (loading) return <div style={box.loadingText}>불러오는 중...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.stepNav}>
        {STEPS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStep(key)}
            style={{
              ...styles.stepBtn,
              backgroundColor: step === key ? COLORS.accent : 'transparent',
              color: step === key ? '#fff' : '#334155',
              fontWeight: step === key ? 800 : 600,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {step === 'kanban' && <KanbanView orders={orders} onSelectOrder={() => setStep('assign')} />}

      {step === 'register' && (
        <RegisterView
          form={form} setForm={setForm} onSubmit={createOrder} saving={saving}
          enfax={enfax} onConfirmFax={confirmFax} companies={companies}
        />
      )}

      {step === 'assign' && (
        <AssignView orders={orders} coils={coils} onAssign={assignCoil} onPrint={(list, title) => printHTML(title, coilTableHtml(list))} />
      )}

      {step === 'workorder' && (
        <SimpleStatusView
          title="③ 작업지시서 처리 — 코일이 배정된 발주를 작업 시작 처리합니다."
          orders={orders.filter((o) => o.status === 'SEARCH')}
          actionLabel="작업 시작 (WORKING)"
          onAction={(o) => updateStatus(o.id, 'WORKING')}
        />
      )}

      {step === 'monitor' && (
        <SimpleStatusView
          title="④ 현장 공정 모니터링 — 작업중인 발주를 완료 처리합니다."
          orders={orders.filter((o) => o.status === 'WORKING')}
          actionLabel="작업 완료 (DONE)"
          onAction={(o) => updateStatus(o.id, 'DONE')}
        />
      )}

      {step === 'notify' && (
        <SimpleStatusView
          title="⑤ 고객 통지 · 배차 지시 — 완료된 작업을 고객사에 통지하고 배차 지시합니다."
          orders={orders.filter((o) => o.status === 'DONE')}
          actionLabel="배차 지시 완료 (DISPATCH)"
          onAction={(o) => updateStatus(o.id, 'DISPATCH')}
        />
      )}

      {step === 'shipment' && (
        <SimpleStatusView
          title="⑥ 출고 처리 — 배차 완료된 발주를 출고 처리합니다 (재고 잔량 자동 차감)."
          orders={orders.filter((o) => o.status === 'DISPATCH')}
          actionLabel="출고 완료 (SHIPPED)"
          onAction={shipOrder}
        />
      )}

      {step === 'aftercare' && (
        <AftercareView
          orders={orders} companies={companies} onSaveNotes={saveCompanyNotes}
          editingOrderId={editingOrderId} editForm={editForm} setEditForm={setEditForm}
          onStartEdit={startEdit} onSaveEdit={saveEdit} onDelete={deleteOrder}
        />
      )}

      {step === 'forklift' && (
        <ForkliftView coils={coils} search={flSearch} setSearch={setFlSearch} orders={orders} />
      )}
    </div>
  );
}

/* ---------------- 전체 현황판 ---------------- */
function KanbanView({ orders }) {
  const cols = ['RECEIVED', 'SEARCH', 'WORKING', 'DONE', 'DISPATCH', 'SHIPPED'];
  return (
    <div>
      <h2 style={box.title}>영업 워크플로우 — 전체 현황판</h2>
      <p style={box.hint}>발주 접수부터 출고까지 전체 발주의 상태를 한눈에 확인합니다.</p>
      <div style={{ display: 'flex', gap: '14px', marginTop: '20px', overflowX: 'auto' }}>
        {cols.map((s) => {
          const list = orders.filter((o) => o.status === s);
          return (
            <div key={s} style={{ ...box.card, minWidth: '230px', flex: 1 }}>
              <div style={{ marginBottom: '10px' }}>{statusPill(s)}</div>
              <div style={{ fontSize: '30px', fontWeight: 900, color: COLORS.navy, marginBottom: '10px' }}>{list.length}건</div>
              {list.slice(0, 5).map((o) => (
                <div key={o.id} style={{ fontSize: '14px', color: COLORS.steel, padding: '6px 0', borderTop: `1px solid ${COLORS.border}` }}>
                  {o.urgent && <span style={{ color: COLORS.red, fontWeight: 800 }}>🔺 </span>}
                  {o.company_name} · {o.thickness}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- ① 발주 접수 ---------------- */
function RegisterView({ form, setForm, onSubmit, saving, enfax, onConfirmFax, companies }) {
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const newFax = enfax.filter((f) => f.status === 'new');
  const company = companies.find((c) => c.name === form.company_name);
  return (
    <div>
      <div style={{ ...box.card, marginBottom: '20px', borderLeft: `4px solid ${COLORS.accent}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontWeight: 800, fontSize: '18px' }}>📠 엔팩스 신규 팩스함</span>
          <span style={{ color: COLORS.steelLight, fontSize: '14px' }}>{newFax.length > 0 ? `신규 ${newFax.length}건` : '신규 팩스 없음'}</span>
        </div>
        {enfax.map((f) => (
          <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', marginBottom: '6px', background: f.status === 'new' ? COLORS.accentSoft : '#f7f8fa', border: `1px solid ${f.status === 'new' ? COLORS.accent : COLORS.border}` }}>
            <div>
              <div style={{ fontWeight: f.status === 'new' ? 800 : 500 }}>{f.sender} {f.status === 'new' && <span style={{ color: COLORS.accentDark, fontSize: '12px' }}>NEW</span>}</div>
              <div style={{ fontSize: '13px', color: COLORS.steelLight }}>{f.fax_number} · {new Date(f.received_at).toLocaleString('ko-KR')} · {f.pages}페이지 · {f.file_name}</div>
            </div>
            {f.status === 'new' ? (
              <button style={box.primaryBtn} onClick={() => onConfirmFax(f)}>확인 및 등록</button>
            ) : (
              <span style={{ color: COLORS.green, fontWeight: 700 }}>✓ 등록완료</span>
            )}
          </div>
        ))}
      </div>

      <div style={box.card}>
        <h3 style={box.subtitle}>① 발주 접수 — 신규 발주 입력</h3>
        {company?.notes && (
          <div style={{ ...box.card, background: COLORS.accentSoft, border: `1px solid ${COLORS.accent}`, padding: '14px 16px', marginBottom: '16px' }}>
            <strong style={{ color: COLORS.accentDark }}>거래처 메모</strong> — {company.notes}
          </div>
        )}
        <div style={box.formGrid}>
          <div>
            <label style={box.label}>업체명 *</label>
            <input style={box.input} list="company-list" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} placeholder="예: (주)대한강재" />
            <datalist id="company-list">{companies.map((c) => <option key={c.id} value={c.name} />)}</datalist>
          </div>
          <div>
            <label style={box.label}>두께 (mm) *</label>
            <input style={box.input} value={form.thickness} onChange={(e) => set('thickness', e.target.value)} placeholder="예: 0.75" />
          </div>
          <div>
            <label style={box.label}>규격</label>
            <input style={box.input} value={form.spec} onChange={(e) => set('spec', e.target.value)} placeholder="예: 0.75X4XC" />
          </div>
          <div>
            <label style={box.label}>중량 (Kg)</label>
            <input style={box.input} value={form.weight} onChange={(e) => set('weight', e.target.value)} placeholder="예: 9410" />
          </div>
          <div>
            <label style={box.label}>생산유형</label>
            <select style={box.input} value={form.prod_type} onChange={(e) => set('prod_type', e.target.value)}>
              <option value="자사생산">자사생산</option>
              <option value="임가공">임가공</option>
              <option value="외주가공">외주가공</option>
            </select>
          </div>
          {form.prod_type === '외주가공' && (
            <div>
              <label style={box.label}>외주처</label>
              <input style={box.input} value={form.outsourcing_company} onChange={(e) => set('outsourcing_company', e.target.value)} placeholder="예: 태진" />
            </div>
          )}
          <div>
            <label style={box.label}>출고예정일</label>
            <input type="date" style={box.input} value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
          </div>
          <div>
            <label style={box.label}>발신처</label>
            <input style={box.input} value={form.sender} onChange={(e) => set('sender', e.target.value)} placeholder="담당자명" />
          </div>
          <div>
            <label style={box.label}>담당연락처</label>
            <input style={box.input} value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} placeholder="010-0000-0000" />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', fontWeight: 700, color: COLORS.red }}>
              <input type="checkbox" checked={form.urgent} onChange={(e) => set('urgent', e.target.checked)} /> 긴급 발주
            </label>
          </div>
        </div>
        <div style={{ marginTop: '14px' }}>
          <label style={box.label}>비고</label>
          <input style={box.input} value={form.memo} onChange={(e) => set('memo', e.target.value)} placeholder="특이사항" />
        </div>
        <div style={{ marginTop: '20px' }}>
          <button style={box.primaryBtn} disabled={saving} onClick={onSubmit}>{saving ? '등록 중...' : '발주 등록'}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- ② 코일 배정 지시 ---------------- */
function AssignView({ orders, coils, onAssign, onPrint }) {
  const [fullListOpen, setFullListOpen] = useState(false);
  const pending = orders.filter((o) => o.status === 'RECEIVED');
  return (
    <div>
      <h3 style={box.subtitle}>② 코일 배정 지시</h3>
      <p style={box.hint}>재고 장부에서 두께 조건에 맞는 코일이 있는지 확인하고 배정합니다.</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', margin: '14px 0' }}>
        <button style={box.ghostBtn} onClick={() => setFullListOpen((v) => !v)}>📋 전체 재고 리스트 {fullListOpen ? '닫기' : '보기'}</button>
        <button style={box.ghostBtn} onClick={() => onPrint(coils, '전체 재고 코일 리스트')}>🖨 전체 재고 리스트 출력</button>
      </div>
      {fullListOpen && (
        <div style={{ ...box.card, marginBottom: '16px' }}>
          <CoilTable list={coils} />
        </div>
      )}
      {pending.length === 0 && <div style={box.emptyText}>배정 지시 대기중인 발주가 없습니다.</div>}
      {pending.map((o) => {
        const matched = coils.filter((c) => Number(c.thickness) === Number(o.thickness) && Number(c.remain_weight) > 0);
        return (
          <div key={o.id} style={{ ...box.card, marginBottom: '14px', borderLeft: `4px solid ${o.urgent ? COLORS.red : COLORS.border}` }}>
            {o.urgent && <div style={{ color: COLORS.red, fontWeight: 800, marginBottom: '4px' }}>🔺 긴급</div>}
            <div style={{ fontWeight: 800, fontSize: '18px', marginBottom: '10px' }}>{o.company_name} · 두께 {o.thickness} · {o.order_no} {prodTypePill(o.prod_type)}</div>
            {matched.length > 0 ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ color: COLORS.green, fontWeight: 700 }}>✓ 재고 {matched.length}건 확인됨</span>
                  <button style={box.ghostBtn} onClick={() => onPrint(matched, `${o.company_name} (${o.order_no}) 재고 코일 리스트`)}>🖨 이 조건 재고 출력</button>
                </div>
                <CoilTable list={matched} onAssign={(coilId) => onAssign(o.id, coilId)} />
              </>
            ) : (
              <div style={{ color: COLORS.amber, background: COLORS.amberBg, padding: '10px 14px', borderRadius: '8px' }}>⚠ 두께 {o.thickness} 재고 없음 — 대체 규격 검토 필요</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CoilTable({ list, onAssign }) {
  if (!list.length) return <div style={box.emptyText}>해당 조건의 재고가 없습니다.</div>;
  return (
    <table style={box.table}>
      <thead><tr><th style={box.th}>코일ID</th><th style={box.th}>두께</th><th style={box.th}>규격</th><th style={box.th}>위치</th><th style={box.th}>잔량</th><th style={box.th}>입고일</th>{onAssign && <th style={box.th}></th>}</tr></thead>
      <tbody>
        {list.map((c) => (
          <tr key={c.id}>
            <td style={box.td}>{c.coil_code}</td>
            <td style={box.td}>{c.thickness}</td>
            <td style={box.td}>{c.spec || '-'}</td>
            <td style={box.td}>Bay {c.bay_location || '-'}</td>
            <td style={box.td}>{fmtNum(c.remain_weight)}Kg</td>
            <td style={box.td}>{c.received_date || '-'}</td>
            {onAssign && <td style={box.td}><button style={box.primaryBtn} onClick={() => onAssign(c.id)}>배정</button></td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---------------- 공통: 단계별 상태 리스트 ---------------- */
function SimpleStatusView({ title, orders, actionLabel, onAction }) {
  return (
    <div>
      <h3 style={box.subtitle}>{title}</h3>
      {orders.length === 0 && <div style={box.emptyText}>해당 단계의 발주가 없습니다.</div>}
      {orders.map((o) => (
        <div key={o.id} style={{ ...box.card, marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '17px', marginBottom: '4px' }}>
              {o.urgent && <span style={{ color: COLORS.red }}>🔺 </span>}
              {o.company_name} · {o.order_no} {prodTypePill(o.prod_type)}
            </div>
            <div style={{ color: COLORS.steel, fontSize: '15px' }}>두께 {o.thickness} · {fmtNum(o.weight)}Kg {o.coils ? `· 배정코일 ${o.coils.coil_code} (Bay ${o.coils.bay_location}, 잔량 ${fmtNum(o.coils.remain_weight)}Kg)` : ''}</div>
          </div>
          <button style={box.primaryBtn} onClick={() => onAction(o)}>{actionLabel}</button>
        </div>
      ))}
    </div>
  );
}

/* ---------------- ⑦ 사후 대응 · 거래처 관리 ---------------- */
function AftercareView({ orders, companies, onSaveNotes, editingOrderId, editForm, setEditForm, onStartEdit, onSaveEdit, onDelete }) {
  const [q, setQ] = useState('');
  const [noteDraft, setNoteDraft] = useState({});
  const filtered = orders.filter((o) => !q || o.company_name.includes(q) || o.order_no.includes(q));
  return (
    <div>
      <h3 style={box.subtitle}>⑦ 사후 대응 · 거래처 관리</h3>
      <div style={{ marginBottom: '16px' }}>
        <input style={{ ...box.input, maxWidth: '320px' }} placeholder="업체명 또는 발주번호 검색" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <table style={box.table}>
        <thead><tr><th style={box.th}>발주번호</th><th style={box.th}>업체명</th><th style={box.th}>두께</th><th style={box.th}>상태</th><th style={box.th}>수정/삭제</th></tr></thead>
        <tbody>
          {filtered.map((o) => (
            <tr key={o.id}>
              {editingOrderId === o.id ? (
                <>
                  <td style={box.td}>{o.order_no}</td>
                  <td style={box.td}><input style={box.input} value={editForm.company_name} onChange={(e) => setEditForm((f) => ({ ...f, company_name: e.target.value }))} /></td>
                  <td style={box.td}><input style={box.input} value={editForm.thickness} onChange={(e) => setEditForm((f) => ({ ...f, thickness: e.target.value }))} /></td>
                  <td style={box.td}>{statusPill(o.status)}</td>
                  <td style={box.td}>
                    <button style={{ ...box.primaryBtn, padding: '8px 14px', marginRight: '6px' }} onClick={() => onSaveEdit(o.id)}>저장</button>
                    <button style={{ ...box.ghostBtn, padding: '8px 14px' }} onClick={() => onStartEdit(null)}>취소</button>
                  </td>
                </>
              ) : (
                <>
                  <td style={box.td}>{o.order_no}</td>
                  <td style={box.td}>{o.company_name}</td>
                  <td style={box.td}>{o.thickness}</td>
                  <td style={box.td}>{statusPill(o.status)}</td>
                  <td style={box.td}>
                    <button style={{ ...box.ghostBtn, padding: '8px 14px', marginRight: '6px' }} onClick={() => onStartEdit(o)}>수정</button>
                    <button style={{ ...box.ghostBtn, padding: '8px 14px', color: COLORS.red }} onClick={() => onDelete(o.id)}>삭제</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ ...box.subtitle, marginTop: '32px' }}>거래처별 메모 관리</h3>
      {companies.map((c) => (
        <div key={c.id} style={{ ...box.card, marginBottom: '10px' }}>
          <div style={{ fontWeight: 800, marginBottom: '6px' }}>{c.name}</div>
          <textarea
            style={{ ...box.input, minHeight: '60px' }}
            value={noteDraft[c.id] !== undefined ? noteDraft[c.id] : (c.notes || '')}
            onChange={(e) => setNoteDraft((d) => ({ ...d, [c.id]: e.target.value }))}
          />
          <div style={{ marginTop: '8px' }}>
            <button style={{ ...box.primaryBtn, padding: '9px 18px' }} onClick={() => onSaveNotes(c.id, noteDraft[c.id] !== undefined ? noteDraft[c.id] : (c.notes || ''))}>메모 저장</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- 지게차 기사 코일 검색 ---------------- */
function ForkliftView({ coils, search, setSearch, orders }) {
  const active = orders.filter((o) => ['RECEIVED', 'SEARCH'].includes(o.status));
  const matched = coils.filter((c) => {
    if (search.company) { /* 업체명은 발주 매칭용 참고 정보로만 표시 */ }
    if (search.thickness && Number(c.thickness) !== Number(search.thickness)) return false;
    if (search.spec && !(c.spec || '').includes(search.spec)) return false;
    return true;
  });
  return (
    <div>
      <h3 style={box.subtitle}>🚜 지게차 코일 검색 — 작업지시 조건에 맞는 코일 찾기</h3>
      <div style={{ ...box.card, marginBottom: '20px' }}>
        <div style={box.formGrid}>
          <div>
            <label style={box.label}>거래처(참고)</label>
            <input style={box.input} value={search.company} onChange={(e) => setSearch((s) => ({ ...s, company: e.target.value }))} placeholder="예: 대한강재" />
          </div>
          <div>
            <label style={box.label}>두께</label>
            <input style={box.input} value={search.thickness} onChange={(e) => setSearch((s) => ({ ...s, thickness: e.target.value }))} placeholder="예: 0.75" />
          </div>
          <div>
            <label style={box.label}>규격 포함어</label>
            <input style={box.input} value={search.spec} onChange={(e) => setSearch((s) => ({ ...s, spec: e.target.value }))} placeholder="예: 4XC" />
          </div>
        </div>
      </div>

      <div style={{ ...box.card, marginBottom: '20px', background: COLORS.accentSoft }}>
        <div style={{ fontWeight: 800, marginBottom: '8px' }}>대기중인 작업지시 (배정 대상)</div>
        {active.length === 0 && <div style={box.emptyText}>대기중인 작업지시가 없습니다.</div>}
        {active.map((o) => (
          <div key={o.id} style={{ fontSize: '15px', padding: '4px 0' }}>
            {o.company_name} · 두께 {o.thickness} · {fmtNum(o.weight)}Kg · {o.spec || '-'}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
        {matched.map((c) => (
          <div key={c.id} style={{ ...box.card, border: `2px solid ${COLORS.border}` }}>
            <div style={{ fontSize: '24px', fontWeight: 900, color: COLORS.navy }}>{c.coil_code}</div>
            <div style={{ color: COLORS.steel, marginTop: '6px' }}>두께 {c.thickness} · {c.spec || '-'}</div>
            <div style={{ color: COLORS.steel }}>Bay {c.bay_location || '-'} · 잔량 {fmtNum(c.remain_weight)}Kg</div>
            <div style={{ fontSize: '13px', color: COLORS.steelLight, marginTop: '4px' }}>입고일 {c.received_date || '-'}</div>
          </div>
        ))}
        {matched.length === 0 && <div style={box.emptyText}>조건에 맞는 코일이 없습니다.</div>}
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px' },
  stepNav: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' },
  stepBtn: { border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '10px 16px', fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit' },
};

export default SalesWorkflowPage;
