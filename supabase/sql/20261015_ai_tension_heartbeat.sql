-- 2026-10-15 판독 프로그램 살아있음 신호 (Supabase에 이미 적용됨: migration ai_tension_settings_heartbeat)
-- ocr_monitor_production.py 가 매 주기 PATCH, ai-tension-monitor.html 이 읽어서 꺼짐/라인 정지/카메라 끊김을 구분
alter table public.ai_tension_settings
  add column if not exists last_seen_at timestamptz,
  add column if not exists last_state text,   -- reading | idle_line | unchanged | camera_lost | paused
  add column if not exists last_note text;
