-- 2026-11-26 데일리 브리핑: Google OAuth refresh token 저장 (apply_migration daily_briefing_google_tokens 적용 완료)
-- mail-briefing-sync 의 /oauth-callback 이 kaibay@gmail.com 계정 확인 후 저장. Edge Function(service_role)만 접근.
create table public.google_oauth_tokens (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  google_email text not null,
  refresh_token text not null,
  scopes text,
  updated_at timestamptz not null default now()
);
alter table public.google_oauth_tokens enable row level security;
revoke all on public.google_oauth_tokens from anon, authenticated;
grant select, insert, update, delete on public.google_oauth_tokens to service_role;
