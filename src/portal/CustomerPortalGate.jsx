// src/portal/CustomerPortalGate.jsx
// 로그인 게이트: 세션 없으면 로그인 화면, 비밀번호 재설정 링크로 온 경우 재설정 화면,
// 로그인 상태면 담당자의 회사로 고정된 대시보드/상세 화면을 전환하며 렌더
//
// [중요] customer_users 조회는 이 파일에서만(onAuthStateChange 콜백 안에서만) 수행합니다.
// 예전엔 CustomerPortalLogin.jsx도 로그인 성공 직후 같은 조회를 따로 했는데,
// 두 조회가 거의 동시에 실행되면서 Supabase 내부적으로 "signal is aborted without reason"
// 에러가 나는 경쟁 상태(race condition)가 있었습니다. 조회 지점을 한 곳으로 합쳐서 해결.
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
  const [loginError, setLoginError] = useState('');
  const [view, setView] = useState(null); // null = 대시보드 홈, 문자열이면 CustomerPortalPage의 sub

  useEffect(() => {
    let settled = false;
    const finish = () => { if (!settled) { settled = true; setChecking(false); } };

    // customer_users 조회 — 드물게 브라우저 탭 간 인증 락 경합 등으로 일시적인
    // AbortError가 날 수 있어(실제 계정 문제가 아님), 최대 2회까지 재시도한다.
    const fetchCustomer = async (userId) => {
      let lastErr = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const { data, error } = await supabase
          .from('customer_users')
          .select('company_name, contact_name, is_active')
          .eq('id', userId)
          .maybeSingle();
        if (!error) return { data, error: null };
        lastErr = error;
        await new Promise((r) => setTimeout(r, 400));
      }
      return { data: null, error: lastErr };
    };

    const handleSession = async (session, opts = {}) => {
      setSession(session);
      if (!session) { setCustomer(null); finish(); return; }

      const { data: cu, error } = await fetchCustomer(session.user.id);

      if (error) {
        // 계정이 없는 게 아니라 일시적인 조회 오류 — 로그아웃시키지 않고 재시도를 안내
        console.error('[portal] customer_users 조회 실패(재시도 후에도)', error);
        setLoginError('일시적인 오류가 발생했습니다. 다시 로그인해주세요.');
        finish();
        return;
      }

      if (!cu || !cu.is_active) {
        setLoginError('고객사 포털 계정이 아니거나 비활성화된 계정입니다.');
        setCustomer(null);
        await supabase.auth.signOut();
        finish();
        return;
      }

      setLoginError('');
      setCustomer(cu);

      if (opts.logAccess) {
        // 접속 로그는 로그인 흐름을 절대 막지 않도록 fire-and-forget으로 처리
        fetch('https://api.ipify.org?format=json')
          .then((r) => r.json())
          .then(({ ip }) => supabase.from('access_logs').insert([{ email: session.user.email, ip_address: ip }]))
          .catch(() => {});
      }
      finish();
    };

    // getSession()을 별도로 호출하지 않고 onAuthStateChange 하나로 통일합니다.
    // (supabase-js v2는 subscribe 시점에 현재 세션으로 한 번 즉시 콜백을 호출해줍니다.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') { setRecoveryMode(true); finish(); return; }
      handleSession(session, { logAccess: event === 'SIGNED_IN' }).catch((e) => {
        console.error('[portal] 세션 처리 실패', e);
        finish();
      });
    });

    // 어떤 이유로든 8초 안에 응답이 없으면 화면이 영구 블랭크로 남지 않도록 강제 진행
    const safetyTimer = setTimeout(() => {
      if (!settled) console.error('[portal] 세션 확인 지연 — 타임아웃으로 진행');
      finish();
    }, 8000);

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

  const handleLogout = async () => {
    if (window.confirm('로그아웃 하시겠습니까?')) await supabase.auth.signOut();
  };

  if (recoveryMode) {
    return <CustomerPortalResetPassword onDone={() => { setRecoveryMode(false); }} />;
  }

  if (checking) return null;

  if (!session || !customer) {
    return <CustomerPortalLogin error={loginError} />;
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
