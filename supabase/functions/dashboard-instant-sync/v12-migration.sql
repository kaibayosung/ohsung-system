-- 2026-10-12 dashboard-instant-sync v12 (배포 버전 19~20): 중복 방지용 컬럼
alter table public.dashboard_sync_log
  add column if not exists retired_at timestamptz,      -- 은퇴 시각(이어받기·중복 정리·이월 가드로 대체된 로그)
  add column if not exists retired_reason text,         -- adopted_by_new_joborder | duplicate_parked | superseded_before_rollover
  add column if not exists superseded_by bigint;        -- 대체한 dashboard_sync_log.id
create index if not exists dashboard_sync_log_product_name_idx on public.dashboard_sync_log (product_name);
create index if not exists dashboard_sync_log_board_date_idx on public.dashboard_sync_log (board_date);
alter table public.dashboard_sync_runs add column if not exists details jsonb;  -- v12 실행 요약(adopt/heal/claimRecovery)
