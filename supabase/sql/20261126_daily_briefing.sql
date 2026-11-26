-- 2026-11-26 연구실 「데일리 브리핑 (메일·일정)」
-- Supabase에 apply_migration으로 적용 완료 (daily_briefing_tables, daily_briefing_tighten_grants, daily_briefing_cron).
-- 개인 메일 요약이므로 RLS는 소유자 본인(owner_id = auth.uid())만, anon 권한 없음.

create table public.mail_items (
  id bigserial primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  gmail_id text not null,
  thread_id text,
  src text not null default 'Gmail',          -- 'Gmail' | '네이버'
  from_name text,
  from_email text,
  subject text,
  summary text,
  category text not null default '참고',       -- 회신 | 마감 | 공고 | 거래처 | 참고 | 광고
  due_text text,
  due_date date,
  hot boolean not null default false,
  url text,
  received_at timestamptz,
  is_done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, gmail_id)
);
create index mail_items_owner_recv_idx on public.mail_items (owner_id, received_at desc);

create table public.briefing_runs (
  id bigserial primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  run_at timestamptz not null default now(),
  trigger text not null default 'cron',        -- cron | manual
  status text not null default 'ok',           -- ok | error | not_configured
  new_mails int not null default 0,
  checked_until timestamptz,
  lead text,
  top3 jsonb not null default '[]'::jsonb,
  events jsonb not null default '[]'::jsonb,
  tomorrow jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  error text
);
create index briefing_runs_owner_run_idx on public.briefing_runs (owner_id, run_at desc);

alter table public.mail_items enable row level security;
alter table public.briefing_runs enable row level security;

create policy mail_items_owner_select on public.mail_items for select to authenticated using (owner_id = auth.uid());
create policy mail_items_owner_update on public.mail_items for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy briefing_runs_owner_select on public.briefing_runs for select to authenticated using (owner_id = auth.uid());

-- 이 프로젝트는 아직 기본 권한이 넓게 자동 부여되므로 먼저 회수한 뒤 필요한 것만 부여
revoke all on public.mail_items, public.briefing_runs from anon, authenticated;
grant select, update on public.mail_items to authenticated;
grant select on public.briefing_runs to authenticated;
grant select, insert, update, delete on public.mail_items to service_role;
grant select, insert, update, delete on public.briefing_runs to service_role;
revoke all on sequence public.mail_items_id_seq, public.briefing_runs_id_seq from anon, authenticated;
grant usage, select on sequence public.mail_items_id_seq to service_role;
grant usage, select on sequence public.briefing_runs_id_seq to service_role;

-- KST 07:00~20:50 10분마다 (UTC 22,23,0-11시)
select cron.schedule('mail-briefing-sync', '*/10 22,23,0-11 * * *',
  $c$select net.http_post(url := 'https://mnlnbwcbgfgftdgawanh.supabase.co/functions/v1/mail-briefing-sync', headers := jsonb_build_object('Content-Type','application/json'), body := '{}'::jsonb, timeout_milliseconds := 120000) as request_id;$c$);
