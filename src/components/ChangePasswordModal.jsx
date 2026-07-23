// src/components/ChangePasswordModal.jsx
// 로그인한 사용자 누구나(내부 직원/관리자) 자기 비밀번호를 직접 바꿀 수 있는 모달.
// 별도 서버 권한이 필요 없음 — supabase.auth.updateUser는 "현재 로그인된 세션 본인"의
// 비밀번호만 바꿀 수 있어서 admin-create-account 같은 Edge Function 없이 클라이언트에서 바로 처리.
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const C = {
  textPrimary: '#0F1E33', textMuted: '#8592A6', borderStrong: '#C9D2E0',
  accent: '#E8830F', onAccent: '#FFFFFF',
  bgSuccess: '#E2F5EA', textSuccess: '#1C7A4D', bgDanger: '#FBE6E4', textDanger: '#C8372C',
};

const inputStyle = { height: '46px', padding: '0 14px', border: `1.5px solid ${C.borderStrong}`, borderRadius: '10px', fontSize: '16px', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' };

export default function ChangePasswordModal({ onClose }) {
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!pw1 || pw1 !== pw2) { setError('두 비밀번호가 서로 다릅니다.'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw1 });
    setLoading(false);
    if (err) { setError(err.message || '비밀번호 변경에 실패했습니다.'); return; }
    setDone(true);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,30,51,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '380px', maxWidth: '90vw' }}>
        <div style={{ fontSize: '18px', fontWeight: 800, color: C.textPrimary, marginBottom: '16px' }}>🔒 비밀번호 변경</div>

        {done ? (
          <div>
            <div style={{ background: C.bgSuccess, color: C.textSuccess, padding: '14px', borderRadius: '10px', fontSize: '14px', marginBottom: '16px' }}>
              비밀번호가 변경됐습니다. 다음 로그인부터 새 비밀번호를 사용하세요.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ height: '42px', padding: '0 18px', borderRadius: '10px', border: 'none', background: C.accent, color: C.onAccent, fontWeight: 700, cursor: 'pointer' }}>닫기</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input style={inputStyle} type="password" placeholder="새 비밀번호" value={pw1} onChange={(e) => setPw1(e.target.value)} required autoFocus />
            <input style={inputStyle} type="password" placeholder="새 비밀번호 확인" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
            {error && <div style={{ background: C.bgDanger, color: C.textDanger, padding: '10px 12px', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" onClick={onClose} style={{ height: '42px', padding: '0 16px', borderRadius: '10px', border: `1.5px solid ${C.borderStrong}`, background: '#fff', color: C.textPrimary, fontWeight: 700, cursor: 'pointer' }}>취소</button>
              <button type="submit" disabled={loading} style={{ height: '42px', padding: '0 18px', borderRadius: '10px', border: 'none', background: C.accent, color: C.onAccent, fontWeight: 700, cursor: 'pointer' }}>{loading ? '변경 중...' : '변경'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
