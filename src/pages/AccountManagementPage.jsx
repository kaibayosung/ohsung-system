// src/pages/AccountManagementPage.jsx
// 관리자 전용 — 내부 직원 계정 / 고객사 포털 계정 관리 화면
// App.jsx 라우팅 시 반드시 role==='admin'인 사람만 진입 가능하도록 가드해야 합니다
// (자세한 내용은 App.jsx.patch.md 참고). 이 페이지 자체는 role 체크를 하지 않습니다.
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const C = {
  surface0: '#EEF1F6', surface1: '#F4F6FA', surface2: '#FFFFFF',
  border: '#E3E8F0', borderStrong: '#C9D2E0',
  textPrimary: '#0F1E33', textSecondary: '#4D5C72', textMuted: '#8592A6',
  accent: '#E8830F', onAccent: '#FFFFFF',
  textSuccess: '#1C7A4D', bgSuccess: '#E2F5EA',
  textDanger: '#C8372C', bgDanger: '#FBE6E4',
};

const inputStyle = { height: '44px', padding: '0 12px', border: `1.5px solid ${C.borderStrong}`, borderRadius: '9px', fontSize: '16px', fontFamily: 'inherit', background: C.surface2, color: C.textPrimary, width: '100%', boxSizing: 'border-box' };
const btn = (variant = 'default') => ({
  height: '42px', padding: '0 18px', borderRadius: '10px', fontSize: '15px', fontWeight: 700,
  cursor: 'pointer', fontFamily: 'inherit',
  border: variant === 'primary' ? 'none' : `1.5px solid ${C.borderStrong}`,
  background: variant === 'primary' ? C.accent : C.surface2,
  color: variant === 'primary' ? C.onAccent : C.textPrimary,
});
const th = { padding: '10px 12px', fontSize: '14px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, background: C.surface1, color: C.textSecondary, fontWeight: 700, whiteSpace: 'nowrap' };
const td = { padding: '10px 12px', fontSize: '15px', borderBottom: `1px solid ${C.border}` };
const pill = (active) => ({ padding: '4px 10px', borderRadius: '999px', fontSize: '12.5px', fontWeight: 700, background: active ? C.bgSuccess : C.bgDanger, color: active ? C.textSuccess : C.textDanger, display: 'inline-block' });

export default function AccountManagementPage() {
  const [tab, setTab] = useState('staff'); // 'staff' | 'customer'
  const [staffList, setStaffList] = useState([]);
  const [customerList, setCustomerList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', role: 'staff', company_name: '', contact_name: '', phone: '' });
  const [resultInfo, setResultInfo] = useState(null); // { tempPassword, email }

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [{ data: staff }, { data: customers }] = await Promise.all([
      supabase.from('staff_users').select('*').order('created_at', { ascending: false }),
      supabase.from('customer_users').select('*').order('created_at', { ascending: false }),
    ]);
    setStaffList(staff || []);
    setCustomerList(customers || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const toggleStaffActive = async (row) => {
    await supabase.from('staff_users').update({ is_active: !row.is_active }).eq('id', row.id);
    loadAll();
  };
  const toggleCustomerActive = async (row) => {
    await supabase.from('customer_users').update({ is_active: !row.is_active }).eq('id', row.id);
    loadAll();
  };
  const changeStaffRole = async (row, role) => {
    await supabase.from('staff_users').update({ role }).eq('id', row.id);
    loadAll();
  };

  const openCreateModal = () => {
    setForm({ email: '', name: '', role: 'staff', company_name: '', contact_name: '', phone: '' });
    setResultInfo(null);
    setModalOpen(true);
  };

  const submitCreate = async () => {
    if (!form.email) { alert('이메일은 필수입니다.'); return; }
    if (tab === 'staff' && !form.name) { alert('이름은 필수입니다.'); return; }
    if (tab === 'customer' && !form.company_name) { alert('거래처명은 필수입니다.'); return; }
    setCreating(true);
    try {
      const payload = tab === 'staff'
        ? { type: 'staff', email: form.email, name: form.name, role: form.role }
        : { type: 'customer', email: form.email, company_name: form.company_name, contact_name: form.contact_name, phone: form.phone };
      const { data, error } = await supabase.functions.invoke('admin-create-account', { body: payload });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || '계정 생성에 실패했습니다.');
      setResultInfo({ tempPassword: data.tempPassword, email: form.email });
      loadAll();
    } catch (e) {
      alert('계정 생성 실패: ' + (e.message || e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ fontSize: '22px', fontWeight: 800, color: C.textPrimary }}>🔑 계정 관리</div>
        <div style={{ marginLeft: 'auto' }}>
          <button style={btn('primary')} onClick={openCreateModal}>+ 신규 계정 생성</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button style={btn(tab === 'staff' ? 'primary' : 'default')} onClick={() => setTab('staff')}>내부 직원 계정 ({staffList.length})</button>
        <button style={btn(tab === 'customer' ? 'primary' : 'default')} onClick={() => setTab('customer')}>고객사 포털 계정 ({customerList.length})</button>
      </div>

      {loading ? (
        <div style={{ color: C.textMuted, padding: '20px' }}>불러오는 중...</div>
      ) : tab === 'staff' ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: C.surface2, borderRadius: '10px', overflow: 'hidden' }}>
          <thead><tr>
            <th style={th}>이름</th><th style={th}>이메일</th><th style={th}>권한</th><th style={th}>상태</th><th style={th}>등록일</th><th style={th}></th>
          </tr></thead>
          <tbody>
            {staffList.map((r) => (
              <tr key={r.id}>
                <td style={{ ...td, fontWeight: 700 }}>{r.name}</td>
                <td style={td}>{r.email}</td>
                <td style={td}>
                  <select value={r.role} onChange={(e) => changeStaffRole(r, e.target.value)} style={{ ...inputStyle, height: '34px', width: '110px', fontSize: '14px' }}>
                    <option value="admin">관리자</option>
                    <option value="staff">일반직원</option>
                  </select>
                </td>
                <td style={td}><span style={pill(r.is_active)}>{r.is_active ? '활성' : '비활성'}</span></td>
                <td style={{ ...td, color: C.textMuted, fontSize: '13px' }}>{r.created_at?.slice(0, 10)}</td>
                <td style={td}>
                  <button style={btn()} onClick={() => toggleStaffActive(r)}>{r.is_active ? '비활성화' : '활성화'}</button>
                </td>
              </tr>
            ))}
            {staffList.length === 0 && <tr><td style={td} colSpan={6}>등록된 직원 계정이 없습니다.</td></tr>}
          </tbody>
        </table>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: C.surface2, borderRadius: '10px', overflow: 'hidden' }}>
          <thead><tr>
            <th style={th}>거래처명</th><th style={th}>담당자</th><th style={th}>이메일</th><th style={th}>연락처</th><th style={th}>상태</th><th style={th}></th>
          </tr></thead>
          <tbody>
            {customerList.map((r) => (
              <tr key={r.id}>
                <td style={{ ...td, fontWeight: 700 }}>{r.company_name}</td>
                <td style={td}>{r.contact_name || '-'}</td>
                <td style={td}>{r.email}</td>
                <td style={td}>{r.phone || '-'}</td>
                <td style={td}><span style={pill(r.is_active)}>{r.is_active ? '활성' : '비활성'}</span></td>
                <td style={td}>
                  <button style={btn()} onClick={() => toggleCustomerActive(r)}>{r.is_active ? '비활성화' : '활성화'}</button>
                </td>
              </tr>
            ))}
            {customerList.length === 0 && <tr><td style={td} colSpan={6}>등록된 고객사 계정이 없습니다.</td></tr>}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,30,51,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '420px', maxWidth: '90vw' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>
              {tab === 'staff' ? '신규 직원 계정 생성' : '신규 고객사 계정 생성'}
            </div>

            {!resultInfo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input style={inputStyle} placeholder="이메일 주소" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                {tab === 'staff' ? (
                  <>
                    <input style={inputStyle} placeholder="이름" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                    <select style={inputStyle} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                      <option value="staff">일반직원</option>
                      <option value="admin">관리자</option>
                    </select>
                  </>
                ) : (
                  <>
                    <input style={inputStyle} placeholder="거래처명 (greenp_customers의 회사명과 일치해야 함)" value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} />
                    <input style={inputStyle} placeholder="담당자명" value={form.contact_name} onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))} />
                    <input style={inputStyle} placeholder="연락처" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                  </>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }}>
                  <button style={btn()} onClick={() => setModalOpen(false)}>취소</button>
                  <button style={btn('primary')} disabled={creating} onClick={submitCreate}>{creating ? '생성 중...' : '생성'}</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ background: C.bgSuccess, color: C.textSuccess, padding: '14px', borderRadius: '10px', fontSize: '14px', marginBottom: '14px' }}>
                  계정이 생성되었습니다. 아래 임시 비밀번호는 <b>지금만</b> 표시되며 다시 볼 수 없으니, 담당자에게 안전한 방법으로 전달하고 로그인 후 반드시 비밀번호를 변경하도록 안내하세요.
                </div>
                <div style={{ ...inputStyle, height: 'auto', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'monospace', fontSize: '17px' }}>
                  <span>{resultInfo.email}</span>
                  <b>{resultInfo.tempPassword}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
                  <button style={btn('primary')} onClick={() => setModalOpen(false)}>닫기</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
