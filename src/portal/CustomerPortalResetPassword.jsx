// src/portal/CustomerPortalResetPassword.jsx
// '비밀번호를 잊으셨나요' 이메일 링크를 타고 돌아왔을 때(Supabase가 PASSWORD_RECOVERY
// 이벤트를 발생시킨 경우) 보여주는 새 비밀번호 설정 화면
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function CustomerPortalResetPassword({ onDone }) {
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
    <div style={styles.wrap}>
      <div style={styles.card}>
        <img src="/ohsung-logo.jpg" alt="오성철강" style={{ width: 200, marginBottom: 34 }} />
        <h2 style={styles.title}>새 비밀번호 설정</h2>
        {done ? (
          <div>
            <div style={{ background: '#E2F5EA', color: '#1C7A4D', padding: 14, borderRadius: 12, fontSize: 14, marginBottom: 16 }}>
              비밀번호가 변경됐습니다.
            </div>
            <button style={styles.btn} onClick={onDone}>로그인 화면으로</button>
          </div>
        ) : (
          <form onSubmit={submit} style={styles.form}>
            <input type="password" placeholder="새 비밀번호" value={pw1} onChange={(e) => setPw1(e.target.value)} style={styles.input} required autoFocus />
            <input type="password" placeholder="새 비밀번호 확인" value={pw2} onChange={(e) => setPw2(e.target.value)} style={styles.input} required />
            {error && <div style={styles.error}>{error}</div>}
            <button type="submit" disabled={loading} style={styles.btn}>{loading ? '변경 중...' : '비밀번호 변경'}</button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F6F8' },
  card: { background: '#fff', borderRadius: 20, padding: '60px 48px', width: 400, maxWidth: '90vw', textAlign: 'center', boxShadow: '0 20px 50px rgba(20,25,50,0.12)' },
  title: { fontSize: 20, fontWeight: 800, color: '#1A1B3A', margin: '0 0 20px' },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  input: { height: 50, padding: '0 16px', border: '1.5px solid #E7E9EE', borderRadius: 12, fontSize: 16, background: '#F9FAFB' },
  btn: { height: 52, border: 'none', borderRadius: 12, background: '#2E3192', color: '#fff', fontSize: 17, fontWeight: 800, cursor: 'pointer' },
  error: { color: '#C8372C', fontSize: 13, textAlign: 'left' },
};
