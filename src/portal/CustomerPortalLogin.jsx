// src/portal/CustomerPortalLogin.jsx
// 고객사 전용 로그인 화면 — 별도 엔트리(portal)에서만 사용, 내부 App.jsx와 분리
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function CustomerPortalLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 비밀번호 찾기 모드
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: cu, error: cuErr } = await supabase
        .from('customer_users')
        .select('company_name, contact_name, is_active')
        .eq('id', data.user.id)
        .maybeSingle();
      if (cuErr || !cu || !cu.is_active) {
        await supabase.auth.signOut();
        throw new Error('고객사 포털 계정이 아니거나 비활성화된 계정입니다.');
      }

      // '로그인 상태 유지'를 해제한 경우 — 탭/창을 닫을 때 세션을 정리해서
      // 다음에 다시 열었을 때 로그인 화면부터 시작하도록 함
      if (!remember) {
        try { window.sessionStorage.setItem('cp_no_remember', '1'); } catch (_e) {}
      } else {
        try { window.sessionStorage.removeItem('cp_no_remember'); } catch (_e) {}
      }

      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const { ip } = await ipRes.json();
        await supabase.from('access_logs').insert([{ email, ip_address: ip }]);
      } catch (_e) { /* 로그 실패는 무시 */ }

      onLoginSuccess(cu);
    } catch (err) {
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setForgotSending(true);
    setForgotError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/portal`,
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (err) {
      setForgotError(err.message || '재설정 메일 발송에 실패했습니다.');
    } finally {
      setForgotSending(false);
    }
  };

  if (mode === 'forgot') {
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <img src="/ohsung-logo.jpg" alt="오성철강" style={{ width: 200, marginBottom: 34 }} />
          <h2 style={styles.title}>비밀번호 찾기</h2>
          <p style={styles.sub}>가입하신 이메일 주소로 재설정 링크를 보내드립니다</p>
          {forgotSent ? (
            <div>
              <div style={{ background: '#E2F5EA', color: '#1C7A4D', padding: '14px', borderRadius: 12, fontSize: 14, textAlign: 'left', marginBottom: 16 }}>
                메일을 보냈습니다. 받은편지함(스팸함도 확인)에서 링크를 눌러 새 비밀번호를 설정하세요.
              </div>
              <button style={styles.btn} onClick={() => { setMode('login'); setForgotSent(false); }}>로그인으로 돌아가기</button>
            </div>
          ) : (
            <form onSubmit={handleForgot} style={styles.form}>
              <input type="email" placeholder="이메일 주소" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} style={styles.input} required />
              {forgotError && <div style={styles.error}>{forgotError}</div>}
              <button type="submit" disabled={forgotSending} style={styles.btn}>{forgotSending ? '발송 중...' : '재설정 메일 보내기'}</button>
              <button type="button" onClick={() => setMode('login')} style={styles.linkBtn}>로그인으로 돌아가기</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <img src="/ohsung-logo.jpg" alt="오성철강" style={{ width: 200, marginBottom: 34 }} />
        <h2 style={styles.title}>고객사 포털 로그인</h2>
        <p style={styles.sub}>거래처 담당자 계정으로 로그인하세요</p>
        <form onSubmit={handleLogin} style={styles.form}>
          <input type="email" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} required />
          <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} required />
          <div style={styles.rowBetween}>
            <label style={styles.checkLabel}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ accentColor: '#2E3192' }} />
              로그인 상태 유지
            </label>
            <button type="button" onClick={() => { setMode('forgot'); setForgotEmail(email); }} style={styles.forgotLink}>비밀번호를 잊으셨나요?</button>
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" disabled={loading} style={styles.btn}>{loading ? '인증 중...' : '로그인'}</button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F6F8' },
  card: { background: '#fff', borderRadius: 20, padding: '60px 48px', width: 400, maxWidth: '90vw', textAlign: 'center', boxShadow: '0 20px 50px rgba(20,25,50,0.12)' },
  title: { fontSize: 20, fontWeight: 800, color: '#1A1B3A', margin: '0 0 6px' },
  sub: { fontSize: 14, color: '#9CA3AF', margin: '0 0 20px' },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  input: { height: 50, padding: '0 16px', border: '1.5px solid #E7E9EE', borderRadius: 12, fontSize: 16, background: '#F9FAFB' },
  btn: { height: 52, border: 'none', borderRadius: 12, background: '#2E3192', color: '#fff', fontSize: 17, fontWeight: 800, cursor: 'pointer' },
  linkBtn: { background: 'none', border: 'none', color: '#9CA3AF', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', marginTop: 4 },
  error: { color: '#C8372C', fontSize: 13, textAlign: 'left' },
  rowBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 6, color: '#6B7280', cursor: 'pointer' },
  forgotLink: { background: 'none', border: 'none', color: '#2E3192', cursor: 'pointer', fontWeight: 700, fontSize: 13, padding: 0 },
};
