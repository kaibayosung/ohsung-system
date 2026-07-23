import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// [중요] 기본 설정(navigator.locks 기반 탭간 잠금)이 일부 브라우저/환경에서
// 잠금을 정상적으로 해제하지 못하고 계속 대기하다가 10초 후
// "AbortError: signal is aborted without reason" 로 실패하는 문제가 있었습니다.
// (로그인 자체는 성공하지만, 그 직후 세션/프로필 조회가 전부 이 잠금 대기에 걸려 실패)
// 이 앱은 사용자당 보통 탭 1개로 사용되므로, 탭간 동시성 잠금을 끄고
// 즉시 실행하는 방식(lockNoOp와 동일)으로 바꿔 문제를 근본적으로 제거합니다.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: async (_name, _acquireTimeout, fn) => await fn(),
  },
});
export { supabaseUrl };
