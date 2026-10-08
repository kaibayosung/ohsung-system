-- dashboard-instant-sync 가 사용하는 테이블의 컬럼 이력 (이미 운영 DB에 적용된 상태를 문서화한 것).
-- 새 환경에 구성할 때만 순서대로 실행. 모두 IF NOT EXISTS 라 재실행해도 안전.

alter table public.dashboard_sync_log add column if not exists work_type text;           -- v3: SLITING / SLITING2 / LEVELLING
alter table public.dashboard_sync_log add column if not exists board_date date;          -- v4: 대시보드상 현재 날짜(이월 시 갱신)
alter table public.dashboard_sync_log add column if not exists last_rolled_at timestamptz; -- v4: 마지막 이월 시각
alter table public.dashboard_sync_log add column if not exists content_sig text;         -- v8/v10: 내용 서명(품명/규격/길이/중량/가공규칙/단가/금액)
comment on column public.dashboard_sync_log.content_sig is
  '대시보드에 반영한 내용의 서명(JSON 배열). 그린ERP 현재 내용과 다르면 대시보드 행을 UPDATE. v10에서 단가/금액 추가.';

-- dedup 키: (mjunp, mdate, work_type) — upsert onConflict 에 사용
-- create unique index if not exists dashboard_sync_log_uk on public.dashboard_sync_log (mjunp, mdate, work_type);

alter table public.dashboard_sync_runs add column if not exists rollover_checked int;
alter table public.dashboard_sync_runs add column if not exists rollover_updated int;
alter table public.dashboard_sync_runs add column if not exists rollover_already_done_on_board int;
alter table public.dashboard_sync_runs add column if not exists reconcile_reverted int;
