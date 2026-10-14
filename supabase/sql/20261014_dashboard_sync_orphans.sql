-- 2026-10-14 대시보드 동기화 v15 — 그린ERP에서 사라진 작업지시서 감시(B안: 목록만, 대시보드 줄은 자동 삭제 안 함)
-- (Supabase에 apply_migration으로 이미 적용됨. 기록용)

create table if not exists public.dashboard_sync_orphans (
  id bigserial primary key,
  log_id bigint unique,                       -- dashboard_sync_log.id (싱크 로그에 없는 옛 줄은 null)
  mdate date not null,
  mjunp text not null,
  work_type text not null,
  dashboard_erp_id integer,
  company_name text,
  product_name text,
  board_status text,
  board_work_date date,
  board_started boolean,
  source text not null default 'sync',        -- sync | backfill | backfill_unlogged | mirror_sweep
  first_missing_at timestamptz not null default now(),
  last_missing_at timestamptz not null default now(),
  miss_count integer not null default 1,
  resolved_at timestamptz,
  resolution text,                            -- reappeared | deleted_by_user | ...
  note text
);
create unique index if not exists dashboard_sync_orphans_erp_unlogged on public.dashboard_sync_orphans(dashboard_erp_id) where log_id is null;
alter table public.dashboard_sync_orphans enable row level security;

-- 작업지시일 4~30일 전 작업지시서 중 그린ERP 미러에서 사라진 것 → 목록에 올림 (최근 3일은 싱크가 매분 직접 감시)
create or replace function public.dashboard_orphan_sweep() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  d_today date := (now() at time zone 'Asia/Seoul')::date;
  n_new int; n_resolved int;
begin
  with miss as (
    select l.* from dashboard_sync_log l
    where not l.seeded and l.retired_at is null and l.dashboard_erp_id is not null and l.work_type is not null
      and l.mdate between d_today - 30 and d_today - 4
      and not exists (select 1 from greenp_joborders g where g.joborder_date = l.mdate and g.joborder_no = l.mjunp and g.work_type = l.work_type)
  ), ins as (
    insert into dashboard_sync_orphans (log_id, mdate, mjunp, work_type, dashboard_erp_id, company_name, product_name, source, note)
    select id, mdate, mjunp, work_type, dashboard_erp_id, company_name, product_name, 'mirror_sweep', '그린ERP 미러에 작업지시서 없음(4~30일 전) — 대시보드 상태는 점검 화면에서 확인'
    from miss
    on conflict (log_id) do update set last_missing_at = now(), miss_count = dashboard_sync_orphans.miss_count + 1
    returning (xmax = 0) as inserted
  )
  select count(*) filter (where inserted) into n_new from ins;

  update dashboard_sync_orphans o set resolved_at = now(), resolution = 'reappeared'
  where o.resolved_at is null and o.log_id is not null and o.source in ('mirror_sweep','sync','backfill')
    and o.mdate between d_today - 30 and d_today - 4
    and exists (select 1 from greenp_joborders g where g.joborder_date = o.mdate and g.joborder_no = o.mjunp and g.work_type = o.work_type);
  get diagnostics n_resolved = row_count;
  return jsonb_build_object('new', n_new, 'resolved', n_resolved, 'at', now());
end $$;

-- cron (UTC): 미러 갱신 07:55·12:55 KST, 목록 갱신 07:58·12:58 KST
-- select cron.schedule('greenp-joborders-refresh', '55 22,3 * * *', $c$select net.http_get(url:='https://mnlnbwcbgfgftdgawanh.supabase.co/functions/v1/greenp-joborders-refresh', timeout_milliseconds:=60000);$c$);
-- select cron.schedule('dashboard-orphan-sweep', '58 22,3 * * *', $c$select public.dashboard_orphan_sweep();$c$);
