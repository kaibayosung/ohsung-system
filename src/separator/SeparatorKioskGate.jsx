// src/separator/SeparatorKioskGate.jsx
// 세퍼레이터 셋팅 태블릿 키오스크의 로그인 게이트.
// 기존 스태프 로그인(Login.jsx, staff_users 테이블)을 그대로 재사용합니다 — 별도 계정 체계를
// 새로 만들지 않았습니다. Supabase 세션은 브라우저에 자동으로 저장되므로, 태블릿에서 처음 한 번만
// 로그인하면 이후에는 브라우저를 껐다 켜도 로그인 상태가 유지됩니다(전용 태블릿 배포를 전제로 한 설계).
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Login from '../Login';
import SeparatorKiosk from './SeparatorKiosk';

export default function SeparatorKioskGate() {
  const [session, setSession] = useState(null);
  const [staff, setStaff] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let settled = false;
    const finish = () => { if (!settled) { settled = true; setChecking(false); } };

    const handleSession = async (sess) => {
      setSession(sess);
      if (!sess) { setStaff(null); finish(); return; }
      const { data } = await supabase.from('staff_users').select('name, role, is_active').eq('id', sess.user.id).maybeSingle();
      setStaff(data && data.is_active ? data : null);
      finish();
    };

    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setTimeout(() => handleSession(sess), 0);
    });

    const safetyTimer = setTimeout(finish, 8000);
    return () => { subscription.unsubscribe(); clearTimeout(safetyTimer); };
  }, []);

  const handleLogout = async () => {
    if (window.confirm('로그아웃 하시겠습니까?')) await supabase.auth.signOut();
  };

  if (checking) return null;

  if (!session) {
    return <Login onLoginSuccess={() => {}} />;
  }

  if (!staff) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', background: '#0a1524', color: '#fff' }}>
        <div style={{ fontSize: '20px', fontWeight: 800 }}>⛔ 접근 권한이 없습니다</div>
        <div style={{ fontSize: '15px', color: '#c8d3e2' }}>이 계정은 내부 시스템 사용자로 등록되어 있지 않습니다. 관리자에게 계정 등록을 요청하세요.</div>
        <button onClick={handleLogout} style={{ marginTop: '10px', padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#e8830f', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>로그아웃</button>
      </div>
    );
  }

  return <SeparatorKiosk staffName={staff.name} onLogout={handleLogout} />;
}
