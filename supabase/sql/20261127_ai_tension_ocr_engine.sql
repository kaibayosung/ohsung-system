-- 2026-11-27 PR-DTC-3100 판독 방식 선택 (Groq / 구글 OCR / 둘 다) — Supabase에 적용 완료
alter table public.ai_tension_settings
  add column if not exists ocr_engine text not null default 'groq'
  check (ocr_engine in ('groq','google','both'));
alter table public.ai_tension_readings
  add column if not exists engine text not null default 'groq',
  add column if not exists capture_id text,
  add column if not exists ocr_ms integer;
create index if not exists ai_tension_readings_capture_id_idx on public.ai_tension_readings (capture_id) where capture_id is not null;
