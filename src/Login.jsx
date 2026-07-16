import React, { useState } from 'react';
import { supabase } from './supabaseClient';

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Supabase 인증 시도
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // 2. 접속 IP 주소 확인 (외부 서비스 활용)
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipRes.json();
      const ipAddress = ipData.ip;

      // 3. 보안 로그 테이블(access_logs)에 기록 저장
      await supabase.from('access_logs').insert([
        { email: email, ip_address: ipAddress }
      ]);

      alert(`접속 성공! 기록된 IP: ${ipAddress}`);
      onLoginSuccess(); // 로그인 성공 시 메인 화면으로 전환
    } catch (err) {
      alert("로그인 정보가 올바르지 않습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={{fontSize:'34px', color:'#1a365d', marginBottom:'12px'}}>🏭 오성철강 관리 시스템</h2>
        <p style={{color:'#718096', marginBottom:'34px', fontSize:'18px'}}>인가된 사용자만 접속 가능합니다.</p>
        <form onSubmit={handleLogin} style={styles.form}>
          <input type="email" placeholder="이메일 주소" value={email} onChange={e=>setEmail(e.target.value)} style={styles.input} required />
          <input type="password" placeholder="비밀번호" value={password} onChange={e=>setPassword(e.target.value)} style={styles.input} required />
          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? '인증 중...' : '시스템 접속하기'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a365d' },
  card: { backgroundColor: 'white', padding: '54px', borderRadius: '26px', width: '480px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  form: { display: 'flex', flexDirection: 'column', gap: '22px' },
  input: { padding: '17px', borderRadius: '13px', border: '1px solid #cbd5e0', fontSize: '20px' },
  btn: { padding: '20px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '13px', fontSize: '22px', fontWeight: 'bold', cursor: 'pointer' }
};

export default Login;
