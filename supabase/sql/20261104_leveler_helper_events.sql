-- 레벨러 AI 헬퍼(실데이터판) 태블릿 기록 테이블 — 2026-11-04 적용 (apply_migration: leveler_helper_events)
-- leveler-helper Edge Function(service role)만 읽고 쓴다. RLS 켜고 정책 없음.
create table if not exists public.leveler_helper_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  work_date date not null,
  coil text not null,
  box int,
  kind text not null check (kind in ('coil_pick','notes_read','order_check','setting_ack','alarm_ack','box_count')),
  data jsonb not null default '{}'::jsonb,
  device text,
  test boolean not null default false
);
comment on table public.leveler_helper_events is '레벨러 AI 헬퍼 태블릿에서 누른 기록(비고 읽음·셋팅 확인·알람 조치·박스 장수). leveler-helper Edge Function(service role)만 읽고 씀.';
create index if not exists leveler_helper_events_day_coil on public.leveler_helper_events (work_date, coil);
alter table public.leveler_helper_events enable row level security;
