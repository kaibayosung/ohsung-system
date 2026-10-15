-- 2026-10-15 레벨링 현장 화면(leveling-floor) 지난 작업 분석 캐시 (Supabase에 이미 적용됨: migration leveling_floor_cache)
-- edge function leveling-floor(service role)만 읽고 쓴다. RLS 켜고 정책 없음 = anon 접근 불가.
create table if not exists public.leveling_job_cache (
  work_date date not null,
  coil_id text not null,
  version text not null,
  thk numeric,
  summary jsonb not null,
  job jsonb not null,
  computed_at timestamptz not null default now(),
  primary key (work_date, coil_id)
);
create table if not exists public.leveling_day_cache (
  work_date date primary key,
  version text not null,
  n int not null default 0,
  extra jsonb,
  computed_at timestamptz not null default now()
);
alter table public.leveling_job_cache enable row level security;
alter table public.leveling_day_cache enable row level security;
comment on table public.leveling_job_cache is '레벨링 현장 화면(leveling-floor) 지난 작업 분석 캐시 — edge function(service role)만 읽고 씀';
-- 캐시 다시 만들기: GET /functions/v1/leveling-floor?mode=backfill&force=true&from=YYYY-MM-DD&to=YYYY-MM-DD (2주 단위 권장)
