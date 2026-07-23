// src/portal/CustomerPortalGate.jsx
// 로그인 게이트: 세션 없으면 로그인 화면, 비밀번호 재설정 링크로 온 경우 재설정 화면,
// 로그인 상태면 담당자의 회사로 고정된 대시보드/상세 화면을 전환하며 렌더
import React, { useState, useEffect } from 'react';
import { supabase, supabaseUrl } from '../supabaseClient';
import CustomerPortalLogin from './CustomerPortalLogin';
import CustomerPortalResetPassword from './CustomerPortalResetPassword';
import CustomerPortalDashboard from './CustomerPortalDashboard';
import CustomerPortalPage from '../pages/CustomerPortalPage';

export default function CustomerPortalGate() {
  const [session, setSession] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [checking, setChecking] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [view, setView] = useState(null); // null = 대시보드 홈, 문자열이면 CustomerPortalPage의 sub

  useEffect(() => {
    // 어떤 이유로든(잠금 경합, 네트워크 지연 등) getSession()이 응답하지 않는 경우를 대비해
    // 화면이 영구 블랭크로 남지 않도록 안전장치(타임아웃)를 둔다.
    let settled = false;
    const finish = (session) => {
      if (settled) return;
      settled = true;
      setSession(session);
      setChecking(false);
    };

    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (session) {
          try { await loadCustomer(session); } catch (e) { console.error('[portal] loadCustomer 실패', e); }
        }
        finish(session);
      })
      .catch((e) => { console.error('[portal] getSession 실패', e); finish(null); });

    const safetyTimer = setTimeout(() => {
      if (!settled) console.error('[portal] getSession 응답 지연 — 5초 타임아웃으로 로그인 화면 표시');
      finish(null);
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') { setRecoveryMode(true); return; }
      if (session) {
        try { await loadCustomer(session); } catch (e) { console.error('[portal] loadCustomer 실패', e); }
      } else {
        setCustomer(null);
      }
      finish(session);
    });

    return () => { subscription.unsubscribe(); clearTimeout(safetyTimer); };
  }, []);

  // '로그인 상태 유지'를 껐을 때 — 탭/창을 닫으면 이 브라우저의 세션을 지워서
  // 다음에 열었을 때 다시 로그인하도록 함
  useEffect(() => {
    const handler = () => {
      try {
        if (window.sessionStorage.getItem('cp_no_remember') !== '1') return;
        const ref = (supabaseUrl.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1];
        if (ref) window.localStorage.removeItem(`sb-${ref}-auth-token`);
      } catch (_e) { /* 무시 */ }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const loadCustomer = async (session) => {
    const { data } = await supabase
      .from('customer_users')
      .select('company_name, contact_name')
      .eq('id', session.user.id)
      .maybeSingle();
    setCustomer(data);
  };

  const handleLogout = async () => {
    if (window.confirm('로그아웃 하시겠습니까?')) await supabase.auth.signOut();
  };

  if (recoveryMode) {
    return <CustomerPortalResetPassword onDone={() => { setRecoveryMode(false); }} />;
  }

  if (checking) return null;

  if (!session || !customer) {
    return <CustomerPortalLogin onLoginSuccess={setCustomer} />;
  }

  return (
    <div>
      <div style={styles.bar}>
        <span style={styles.company}>{customer.company_name} · {customer.contact_name} 담당자님</span>
        <button style={styles.logout} onClick={handleLogout}>로그아웃</button>
      </div>
      {view === null ? (
        <CustomerPortalDashboard companyName={customer.company_name} onNavigate={(sub) => setView(sub)} />
      ) : (
        <CustomerPortalPage lockedCompanyName={customer.company_name} initialSub={view} onBack={() => setView(null)} />
      )}
    </div>
  );
}

const styles = {
  bar: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14, padding: '12px 24px', background: '#fff', borderBottom: '1px solid #ECEEF2' },
  company: { fontSize: 14, color: '#4D5C72', fontWeight: 700, marginRight: 'auto' },
  logout: { border: '1px solid #E7E9EE', background: '#fff', color: '#6B7280', fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 9, cursor: 'pointer' },
};
