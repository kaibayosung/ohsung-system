"""
PR-DTC-3100 LCD 인식 - 상용 운영 버전 (Groq 비전 모델 기반)
--------------------------------------------------------------
기존 ocr_monitor_fixed.py(Tesseract + 색상마스크 + 화면자동감지 + 슬라이딩
윈도우 다수결)를 대체하는 상용 버전입니다. 핵심 차이:

  - 화면(LCD) 자동 감지, 색상 마스크, REL_*_BOX 보정, 다수결 로직을
    전부 제거했습니다. 대신 프레임 1장을 그대로(크롭 없이) Groq 비전
    모델(qwen/qwen3.8-27b)에 보내 6개 값을 JSON으로 한 번에 받습니다.
    (이 방식이 개발용 웹 검증 도구 `ai-recognition-validation.html`에서
    이미 검증됨 - Tesseract 방식보다 훨씬 정확해 보정 로직 자체가 불필요.)
  - 인식 주기: 기본 2분에 1회. 대시보드(연구실 > PR-DTC-3100 페이지)에서
    1분/2분/5분 버튼을 누르면 Supabase의 ai_tension_settings 테이블 값이
    바뀌고, 이 스크립트가 매 주기 그 값을 읽어와 재시작 없이 반영합니다
    (Groq 무료 한도가 하루 토큰 200,000이라 1분 주기로 하루 종일 돌리면
    중간에 한도 초과로 멈추므로, 작업이 몰릴 때만 짧게 쓰라는 의도).
  - 저장 위치: 기존 taper_tension_readings(Tesseract/개발용)가 아니라
    새 테이블 ai_tension_readings(Groq/상용)에 저장합니다.
  - 인식 범위: 출력%, 전압, 두께, 장력율, 시작경, 장력설정 6개 전부.
  - 캡처한 프레임은 인식 성공/실패와 상관없이 개발서버 로컬의 captures/
    폴더에 날짜별로 저장합니다(인식이 잘 안 됐을 때 실제 화면을 눈으로
    다시 확인할 수 있도록). 오래된 폴더는 14일 보관 후 자동 삭제합니다.
  - 이 스크립트는 웹 대시보드를 내장하지 않습니다. 실시간 모니터링
    화면은 오성철강 연구실(웹앱)에 Supabase 직접 연동으로 별도 제작합니다
    (ai_tension_readings 테이블을 anon key로 읽는 정적 페이지) - 이 스크립트는
    카메라 연결 + 인식 + DB 저장 + 로컬 이미지 저장까지만 담당하는 headless
    백그라운드 프로세스입니다.

사용법
------
1) 사전 설치
   pip install opencv-python numpy curl_cffi

2) 환경변수 설정 (이 스크립트를 실행하는 PC에서만)
   Windows PowerShell:
     $env:GROQ_API_KEY = "gsk_..."
     $env:SUPABASE_SERVICE_ROLE_KEY = "..."
   Windows cmd:
     set GROQ_API_KEY=gsk_...
     set SUPABASE_SERVICE_ROLE_KEY=...
   (절대 이 파일에 키를 직접 적지 마세요.)

3) 연결 확인(테스트 1회, 반복 없이 값만 출력):
   python ocr_monitor_production.py --source "http://<폰 IP>:8080/video" --test

4) 상용 상시 실행 (백그라운드, 미리보기 없음):
   python ocr_monitor_production.py --source "http://<폰 IP>:8080/video" --no-preview

   실행 후 오성철강 연구실 > "PR-DTC-3100 실시간 인식 (상용)" 페이지에서
   결과를 확인합니다 (이 스크립트 자체는 화면을 띄우지 않습니다).

5) 종료: 미리보기 창에서 q, 또는 Ctrl+C

토큰 절감 (2026-10-15 추가 — Groq 무료 한도 하루 200,000 토큰 초과 대응)
--------------------------------------------------------------------
  1) 사진을 줄여 보냄: 긴 변 1024px로 축소(--max-dim, 0이면 원본). 컨트롤러 화면만
     잘라 보내려면 --crop "x0,y0,x1,y1"(0~1 비율) 또는 환경변수 OCR_CROP 사용.
     정확도 확인: python ocr_monitor_production.py --source ... --test --compare
     (원본과 축소본을 각각 1번씩 보내 값·토큰을 나란히 출력)
  2) 라인이 안 돌 때는 판독 건너뜀: 레벨러 PLC(LEVELING_DATA)에 최근 10분간 움직임이
     없으면 AI에 보내지 않고 2분마다 다시 확인(그래도 30분에 한 번은 판독). 직전에 보낸 화면과 거의 같으면 건너뜀
     (단 12분에 한 번은 무조건 판독). 끄려면 --always.
  3) 살아있음 신호: 매 주기 ai_tension_settings.last_seen_at/last_state 를 갱신 →
     모니터 화면이 '꺼짐'과 '라인 정지로 쉬는 중'을 구분해서 보여줌.

현장 전원 On/Off 연동 (자동 시작/대기)
--------------------------------------
카메라(현장) 신호가 없으면 연결에 실패하고 조용히 대기하며 주기적으로
재시도합니다. 신호가 다시 오면 자동으로 데이터 수집을 재개합니다.
"""

import argparse
import base64
import csv
import json
import os
import re
import time
import urllib.error
import urllib.request
import urllib.parse
from datetime import datetime, timedelta

import cv2
import numpy as np

# ---------------------------------------------------------------------------
# 설정
# ---------------------------------------------------------------------------

CAPTURE_INTERVAL_SEC = 120.0   # 기본 2분에 1회 (대시보드에서 1/2/5분으로 변경 가능)
CSV_PATH = "ocr_log_production.csv"
RECONNECT_WAIT_SEC = 5
RECONNECT_LOG_EVERY = 12
PAUSED_POLL_SEC = 10   # 대시보드에서 "중단" 상태일 때, 재개 여부를 다시 확인하는 주기

CAPTURES_DIR = "captures"     # 캡처 프레임 로컬 저장 폴더 (날짜별 하위 폴더)
CAPTURE_RETENTION_DAYS = 14   # 이보다 오래된 날짜 폴더는 자동 삭제
CLEANUP_CHECK_EVERY_SEC = 6 * 3600  # 정리 작업은 6시간에 한 번만 확인 (매 주기 디스크 스캔 방지)

SUPABASE_URL = "https://mnlnbwcbgfgftdgawanh.supabase.co"
SUPABASE_TABLE = "ai_tension_readings"   # 신규 상용 테이블 (기존 taper_tension_readings와 별도)
SUPABASE_SETTINGS_TABLE = "ai_tension_settings"  # 인식 주기(초)를 저장하는 설정용 단일 행 테이블
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
# anon 키는 공개 프로젝트 설정값(Supabase 설계상 클라이언트에 노출되는 것이 정상)이며,
# ai-tension-monitor.html에도 동일한 값이 그대로 쓰인다. 설정 조회는 서비스키가 없어도
# 되도록 anon 키를 fallback으로 둔다.
SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ubG5id2NiZ2ZnZnRkZ2F3YW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NTYxMDQsImV4cCI6MjA4NTAzMjEwNH0."
    "-tS-m6hezjEclG0er5yUXERisE0uE3BYVJlviJKkQAo"
)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_MODEL = "qwen/qwen3.8-27b"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_TIMEOUT_SEC = 20
GROQ_MAX_WAIT_SEC = 60   # Groq가 이보다 오래 기다리라고 하면(하루 한도 초과) 이번 주기는 바로 포기

# --- 토큰 절감 (2026-10-15) ---
OCR_MAX_DIM_DEFAULT = 1024      # 긴 변 픽셀. 원본(1920 등) 대비 토큰 약 절반 이하
OCR_JPEG_QUALITY = 85
OCR_MAX_DIM = OCR_MAX_DIM_DEFAULT   # main()에서 --max-dim 값으로 바뀜
OCR_CROP = None                     # (x0, y0, x1, y1) 비율. main()에서 --crop / OCR_CROP 로 설정
LINE_CHECK_URL = "https://mnlnbwcbgfgftdgawanh.supabase.co/functions/v1/leveler-explore"
LINE_IDLE_MIN = 10              # 레벨러가 이 시간(분) 동안 안 움직였으면 '정지'로 보고 판독 쉼
IDLE_RECHECK_SEC = 120          # 정지 중에는 2분마다 다시 확인
IDLE_FORCE_READ_SEC = 30 * 60   # 정지로 보여도 30분에 한 번은 판독(레벨러 기록 프로그램이 멈춘 경우 대비)
FORCE_READ_EVERY_SEC = 12 * 60  # 화면 변화가 없어도 이 간격마다 한 번은 판독(모니터의 '공백' 표시 방지)
CHANGE_BLOCK_THRESHOLD = 12.0   # 화면 변화 판단: 작은 칸(블록) 하나라도 평균 밝기 차가 이 값 넘으면 '바뀜'

PROMPT = (
    "이 사진은 PORA PR-DTC-3100 타퍼 텐션 컨트롤러 LCD 화면입니다. "
    "화면에 표시된 다음 값을 정확히 읽어서 JSON으로만 답하세요"
    "(다른 설명 없이, 값이 안 보이면 null): "
    '{"output_percent": 숫자, "output_voltage": 숫자, "thickness_um": 숫자, '
    '"tension_rate": 숫자, "start_dia_mm": 숫자, "tension_set": 숫자}'
)

# CSV/콘솔 출력에서 공통으로 쓰는 필드 목록 (표시 순서)
FIELDS = [
    ("output_percent", "출력%"),
    ("output_voltage", "전압"),
    ("thickness_um", "두께"),
    ("start_dia_mm", "시작경"),
    ("tension_set", "장력설정"),
    ("tension_rate", "장력율"),
]

# ---------------------------------------------------------------------------
# Groq 인식
# ---------------------------------------------------------------------------

def parse_crop(text):
    """'x0,y0,x1,y1'(0~1 비율) -> 튜플. 잘못된 값이면 None(자르지 않음)."""
    if not text:
        return None
    try:
        v = [float(x) for x in str(text).split(",")]
        if len(v) == 4 and 0 <= v[0] < v[2] <= 1 and 0 <= v[1] < v[3] <= 1:
            return tuple(v)
    except ValueError:
        pass
    print(f"[경고] crop 값 '{text}' 를 읽을 수 없어 자르지 않습니다 (예: 0.30,0.20,0.95,0.80)")
    return None


def prepare_frame(frame, max_dim=None, crop=None):
    """(2026-10-15) 토큰 절감: 컨트롤러 화면 부분만 자르고(crop) 긴 변을 max_dim으로 줄인다.
    이전에는 '1분에 1회라 토큰 여유가 충분'하다는 가정으로 원본을 그대로 보냈지만,
    5분 주기로도 하루 한도(20만 토큰)에 걸려 축소가 기본이 됐다."""
    img = frame
    if crop:
        h, w = img.shape[:2]
        x0, y0, x1, y1 = int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)
        if x1 - x0 > 50 and y1 - y0 > 50:
            img = img[y0:y1, x0:x1]
    if max_dim:
        h, w = img.shape[:2]
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    return img


def encode_frame_to_b64(frame, max_dim=None, crop=None):
    """OpenCV 프레임(BGR numpy 배열)을 (자르고 줄인 뒤) JPEG로 인코딩해 base64 문자열로 변환."""
    img = prepare_frame(frame, max_dim, crop)
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, OCR_JPEG_QUALITY])
    if not ok:
        raise RuntimeError("JPEG 인코딩 실패")
    return base64.b64encode(buf.tobytes()).decode("ascii")


def _parse_retry_after_sec(msg):
    """'try again in 6m30.5s' / '1h2m3s' / '850ms' -> 초. (예전엔 6m30s를 30초로 잘못 읽었음)"""
    m = re.search(r"try again in ((?:[\d.]+h)?(?:[\d.]+m(?!s))?(?:[\d.]+(?:ms|s))?)", msg or "", re.IGNORECASE)
    if not m or not m.group(1):
        return 3.0
    total = 0.0
    for val, unit in re.findall(r"([\d.]+)(h|ms|m|s)", m.group(1).lower()):
        v = float(val)
        total += v * 3600 if unit == "h" else v * 60 if unit == "m" else v / 1000.0 if unit == "ms" else v
    return total + 0.5


def call_groq_once(b64, api_key, timeout=GROQ_TIMEOUT_SEC):
    """api.groq.com은 Cloudflare 뒤에 있는데, 파이썬 표준 urllib/ssl의 TLS
    핸드셰이크 지문(JA3)이 Cloudflare 봇 차단 규칙에 걸려 'HTTP 403 error code:
    1010'로 막히는 경우가 실측으로 확인됨(Groq API 자체 오류가 아니라 Cloudflare가
    요청을 대신 막은 것 - 브라우저에서 fetch()로 호출하면 정상 동작하는 것과 대조됨).
    curl_cffi로 크롬 TLS 지문을 흉내내어 우회한다."""
    from curl_cffi import requests as cffi_requests

    body = {
        "model": GROQ_MODEL,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": PROMPT},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
            ],
        }],
        "temperature": 0,
        "max_completion_tokens": 200,
    }

    resp = cffi_requests.post(
        GROQ_URL, json=body,
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=timeout, impersonate="chrome",
    )
    if resp.status_code != 200:
        try:
            msg = resp.json().get("error", {}).get("message", resp.text)
        except Exception:
            msg = resp.text
        err = RuntimeError(msg)
        err.status = resp.status_code
        raise err
    data = resp.json()
    text = data["choices"][0]["message"]["content"]
    usage = data.get("usage") or {}
    return text, usage


def call_groq(b64, api_key, timeout=GROQ_TIMEOUT_SEC, max_retries=2):
    last_err = None
    for attempt in range(max_retries + 1):
        try:
            return call_groq_once(b64, api_key, timeout)
        except Exception as e:
            last_err = e
            is_rate_limit = getattr(e, "status", None) == 429 or "rate limit" in str(e).lower()
            wait = _parse_retry_after_sec(str(e)) if is_rate_limit else 0
            # 하루 한도 초과처럼 오래 기다려야 하면 붙잡고 있지 않고 이번 주기는 실패로 넘긴다
            if is_rate_limit and attempt < max_retries and wait <= GROQ_MAX_WAIT_SEC:
                time.sleep(wait)
                continue
            raise
    raise last_err


def parse_json_answer(text):
    if not text:
        return None
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Supabase 저장
# ---------------------------------------------------------------------------

def save_reading_to_supabase(values, model, usage, parse_ok, connected, raw_text, error_message):
    """SUPABASE_SERVICE_ROLE_KEY 환경변수가 없으면 조용히 건너뛴다.
    네트워크/서버 오류가 나도 예외를 여기서 삼켜서 로컬 CSV/콘솔 동작에는
    영향을 주지 않는다. 오성철강 연구실의 상용 모니터링 페이지가 이 테이블을
    anon key로 읽어서 화면에 보여준다(이 스크립트는 화면을 직접 그리지 않음)."""
    if not SUPABASE_SERVICE_KEY:
        return
    payload = [{
        "captured_at": datetime.now().astimezone().isoformat(),
        "output_percent": values.get("output_percent"),
        "output_voltage": values.get("output_voltage"),
        "thickness_um": values.get("thickness_um"),
        "tension_rate": values.get("tension_rate"),
        "start_dia_mm": values.get("start_dia_mm"),
        "tension_set": values.get("tension_set"),
        "model": model,
        "prompt_tokens": usage.get("prompt_tokens"),
        "total_tokens": usage.get("total_tokens"),
        "parse_ok": parse_ok,
        "connected": connected,
        "raw_response": raw_text,
        "error_message": error_message,
    }]
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/json", "Prefer": "return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        print(f"[DB 저장 실패] HTTP {e.code}: {e.read().decode('utf-8', 'ignore')[:200]}")
    except Exception as e:
        print(f"[DB 저장 실패] {e} (로컬 CSV는 계속 정상 동작)")


def fetch_settings_from_supabase(fallback):
    """대시보드(ai-tension-monitor.html)에서 바꾼 인식 주기/중단·시작 상태를
    읽어온다. 서비스키가 있으면 그걸, 없으면 anon 키를 쓴다(설정 조회는
    SELECT뿐이라 anon으로도 충분). 네트워크 오류/행 없음 등 어떤 이유로든
    실패하면 조용히 fallback({'interval':..,'enabled':..})을 그대로 반환한다."""
    key = SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{SUPABASE_SETTINGS_TABLE}?select=capture_interval_sec,enabled&id=eq.1&limit=1",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            rows = json.loads(resp.read().decode("utf-8"))
        if rows:
            row = rows[0]
            return {
                "interval": float(row["capture_interval_sec"]) if row.get("capture_interval_sec") else fallback["interval"],
                "enabled": bool(row["enabled"]) if row.get("enabled") is not None else fallback["enabled"],
            }
    except Exception:
        pass
    return fallback


# ---------------------------------------------------------------------------
# 로컬 이미지 저장 (Supabase가 아니라 개발서버 디스크에 남긴다 - 인식이 잘
# 안 됐을 때 그 순간 화면이 실제로 어땠는지 눈으로 확인하기 위한 용도)
# ---------------------------------------------------------------------------

_last_cleanup_check = 0.0


def save_capture_image(frame, ok):
    """captures/YYYY-MM-DD/HHMMSS[_FAIL].jpg 로 저장. 실패 케이스는 파일명에
    _FAIL을 붙여 탐색기에서 바로 눈에 띄게 한다."""
    now = datetime.now()
    day_dir = os.path.join(CAPTURES_DIR, now.strftime("%Y-%m-%d"))
    try:
        os.makedirs(day_dir, exist_ok=True)
        suffix = "" if ok else "_FAIL"
        path = os.path.join(day_dir, now.strftime("%H%M%S") + suffix + ".jpg")
        cv2.imwrite(path, frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
    except Exception as e:
        print(f"[캡처 저장 실패] {e} (인식/DB 저장에는 영향 없음)")


def cleanup_old_captures():
    """CAPTURE_RETENTION_DAYS보다 오래된 날짜 폴더를 통째로 삭제한다.
    디스크 스캔 비용을 줄이려고 CLEANUP_CHECK_EVERY_SEC마다 한 번만 실행."""
    global _last_cleanup_check
    now = time.time()
    if now - _last_cleanup_check < CLEANUP_CHECK_EVERY_SEC:
        return
    _last_cleanup_check = now

    if not os.path.isdir(CAPTURES_DIR):
        return
    cutoff = datetime.now().timestamp() - CAPTURE_RETENTION_DAYS * 86400
    for name in os.listdir(CAPTURES_DIR):
        sub = os.path.join(CAPTURES_DIR, name)
        if not os.path.isdir(sub):
            continue
        try:
            folder_date = datetime.strptime(name, "%Y-%m-%d").timestamp()
        except ValueError:
            continue
        if folder_date < cutoff:
            import shutil
            try:
                shutil.rmtree(sub)
                print(f"[캡처 정리] {sub} 삭제 ({CAPTURE_RETENTION_DAYS}일 지난 폴더)")
            except Exception as e:
                print(f"[캡처 정리 실패] {sub}: {e}")


# ---------------------------------------------------------------------------
# CSV (로컬 백업 로그 - Supabase가 정본, CSV는 참고용)
# ---------------------------------------------------------------------------

def ensure_csv(path):
    is_new = not os.path.exists(path)
    f = open(path, "a", newline="", encoding="utf-8-sig")
    writer = csv.writer(f)
    if is_new:
        writer.writerow(["timestamp"] + [label for _, label in FIELDS] + ["parse_ok", "tokens", "note"])
    return f, writer


def log_event(csv_writer, csv_file, event):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    csv_writer.writerow([ts] + [""] * len(FIELDS) + ["", "", event])
    csv_file.flush()


def try_open(source):
    cap = cv2.VideoCapture(source)
    if cap.isOpened():
        return cap
    cap.release()
    return None


# ---------------------------------------------------------------------------
# 인식 1회 처리
# ---------------------------------------------------------------------------

def do_ocr_and_record(frame, last_values, csv_writer, csv_file):
    """last_values: 직전 확정값 딕셔너리(carry-forward 용, 화면에는 안 쓰지만
    콘솔 로그에서 '직전값 유지'를 표시할 때 참고)."""
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if not GROQ_API_KEY:
        msg = "GROQ_API_KEY 환경변수가 설정되지 않았습니다."
        print(f"[인식 오류] {msg}")
        log_event(csv_writer, csv_file, "error:no_groq_api_key")
        save_reading_to_supabase({}, GROQ_MODEL, {}, False, True, None, msg)
        return last_values

    try:
        b64 = encode_frame_to_b64(frame, OCR_MAX_DIM, OCR_CROP)
        text, usage = call_groq(b64, GROQ_API_KEY)
    except Exception as e:
        msg = f"{type(e).__name__}: {e}"
        print(f"[인식 오류] {msg}")
        log_event(csv_writer, csv_file, f"error:{msg}")
        save_reading_to_supabase({}, GROQ_MODEL, {}, False, True, None, msg)
        return last_values

    parsed = parse_json_answer(text)
    ok = bool(parsed)
    values = parsed if ok else {}

    save_capture_image(frame, ok)

    display_values = {key: (values.get(key) if ok else last_values.get(key)) for key, _ in FIELDS}
    summary = " ".join(f"{label}={display_values[key]}" for key, label in FIELDS)
    print(f"[{ts}] {summary}{'' if ok else ' | (파싱 실패 - Supabase에는 실패로 기록, 콘솔 표시만 직전값 유지)'}")

    csv_writer.writerow(
        [ts] + [values.get(k) for k, _ in FIELDS] + [ok, usage.get("total_tokens"), "" if ok else "parse_failed"]
    )
    csv_file.flush()

    # Supabase에는 이번 주기 실제 인식값만 저장한다(파싱 실패 시 null) -
    # carry-forward는 화면(연구실 페이지) 쪽에서 "직전 정상값 유지 표시" 형태로
    # 처리하는 편이 더 투명하다(DB에 가짜 값을 채워 넣지 않음).
    save_reading_to_supabase(values, GROQ_MODEL, usage, ok, True, text, None)

    return values if ok else last_values


# ---------------------------------------------------------------------------
# 토큰 절감: 레벨러 가동 확인 · 화면 변화 확인 · 살아있음 신호 (2026-10-15)
# ---------------------------------------------------------------------------

def line_activity():
    """레벨러 PLC(LEVELING_DATA) 최근 기록으로 라인이 도는지 본다.
    반환: ('running'|'idle'|'unknown', 설명). 조회 실패는 'unknown' -> 판독은 그대로 진행(안전 쪽).
    PLC 시각은 KST로 저장돼 있으므로 지금 시각도 KST로 비교한다."""
    sql = ("SELECT DATE_FORMAT(TIMESTAMP,'%Y-%m-%d %H:%i:%s') t, MOVELENSV m "
           "FROM LEVELING_DATA ORDER BY ID DESC LIMIT 300")
    url = LINE_CHECK_URL + "?sql=" + urllib.parse.quote(sql)
    try:
        with urllib.request.urlopen(url, timeout=15) as resp:
            rows = json.loads(resp.read().decode("utf-8")).get("rows") or []
    except Exception as e:
        return "unknown", f"레벨러 기록 조회 실패({type(e).__name__})"
    if not rows:
        return "unknown", "레벨러 기록 없음"
    now_kst = datetime.utcnow() + timedelta(hours=9)
    since = now_kst - timedelta(minutes=LINE_IDLE_MIN)
    recent = []
    for r in rows:
        try:
            t = datetime.strptime(str(r.get("t")), "%Y-%m-%d %H:%M:%S")
        except ValueError:
            continue
        if t >= since:
            recent.append(float(r.get("m") or 0))
    if not recent:
        last_t = str(rows[0].get("t"))[11:16]
        return "idle", f"레벨러 기록이 {LINE_IDLE_MIN}분 넘게 없음(마지막 {last_t})"
    moving = any(abs(recent[i] - recent[i + 1]) > 3 for i in range(len(recent) - 1))
    if not moving:
        return "idle", f"레벨러가 최근 {LINE_IDLE_MIN}분 동안 움직이지 않음"
    return "running", "레벨러 가동 중"


def frame_signature(frame):
    """화면 비교용 작은 흑백 사진(160x90)."""
    img = prepare_frame(frame, None, OCR_CROP)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return cv2.resize(gray, (160, 90), interpolation=cv2.INTER_AREA).astype(np.float32)


def frame_changed(a, b):
    """10x10 칸으로 나눠 칸별 평균 밝기 차를 보고, 한 칸이라도 크게 바뀌었으면 True.
    (숫자 한 자리만 바뀌어도 그 칸은 크게 달라지므로 전체 평균보다 민감하다)"""
    if a is None or b is None or a.shape != b.shape:
        return True
    d = np.abs(a - b).reshape(9, 10, 16, 10).mean(axis=(1, 3))
    return float(d.max()) > CHANGE_BLOCK_THRESHOLD


def send_heartbeat(state, note=""):
    """ai_tension_settings 행에 살아있음 신호를 남긴다(updated_at은 건드리지 않음).
    실패해도 판독 동작에는 영향 없음."""
    key = SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY
    body = {"last_seen_at": datetime.now().astimezone().isoformat(), "last_state": state, "last_note": (note or "")[:200]}
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{SUPABASE_SETTINGS_TABLE}?id=eq.1",
        data=json.dumps(body).encode("utf-8"), method="PATCH",
        headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json", "Prefer": "return=minimal"},
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            resp.read()
    except Exception:
        pass


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="PR-DTC-3100 LCD 인식 - 상용 운영 버전 (Groq)")
    parser.add_argument("--source", default="0", help="카메라 인덱스, 영상 파일 경로, 또는 http(s)://... 스트림 주소")
    parser.add_argument("--no-preview", action="store_true", help="OpenCV 미리보기 창 없이 동작 (서비스 실행 시 권장)")
    parser.add_argument("--interval", type=float, default=CAPTURE_INTERVAL_SEC,
                         help="초기 인식 주기(초), 기본 120. 실행 중에는 대시보드에서 바꾼 값이 우선됨")
    parser.add_argument("--test", action="store_true", help="프레임 1장만 받아 Groq 인식 결과를 출력하고 종료 (반복 없음)")
    parser.add_argument("--max-dim", type=int, default=OCR_MAX_DIM_DEFAULT,
                        help=f"AI에 보낼 사진 긴 변 픽셀(기본 {OCR_MAX_DIM_DEFAULT}, 0이면 원본 그대로)")
    parser.add_argument("--crop", default=os.environ.get("OCR_CROP"),
                        help='컨트롤러 화면만 잘라 보낼 영역 "x0,y0,x1,y1"(0~1 비율). 환경변수 OCR_CROP 로도 지정 가능')
    parser.add_argument("--compare", action="store_true", help="--test와 함께: 원본과 축소본을 각각 보내 값·토큰 비교")
    parser.add_argument("--always", action="store_true", help="라인 정지·화면 변화 없음이어도 건너뛰지 않고 매 주기 판독")
    args = parser.parse_args()

    global OCR_MAX_DIM, OCR_CROP
    OCR_MAX_DIM = args.max_dim if args.max_dim and args.max_dim > 0 else None
    OCR_CROP = parse_crop(args.crop)

    source = int(args.source) if args.source.isdigit() else args.source

    if args.test:
        print("[테스트] 소스에 연결해 프레임 1장을 가져와 Groq로 인식합니다...")
        cap = try_open(source)
        if cap is None:
            print("[실패] 소스에 연결할 수 없습니다. --source 값을 확인하세요.")
            return
        ok, frame = cap.read()
        cap.release()
        if not ok:
            print("[실패] 프레임을 읽지 못했습니다.")
            return
        if not GROQ_API_KEY:
            print("[실패] GROQ_API_KEY 환경변수가 설정되지 않았습니다.")
            return
        if args.compare:
            for label, md, cr in [("원본", None, None), (f"축소(긴 변 {OCR_MAX_DIM or '원본'}{', 자르기' if OCR_CROP else ''})", OCR_MAX_DIM, OCR_CROP)]:
                img = prepare_frame(frame, md, cr)
                t2, u2 = call_groq(encode_frame_to_b64(frame, md, cr), GROQ_API_KEY)
                p2 = parse_json_answer(t2) or {}
                print(f"[{label}] 사진 {img.shape[1]}x{img.shape[0]} | 토큰 {u2.get('total_tokens')} | " +
                      " ".join(f"{lab}={p2.get(k)}" for k, lab in FIELDS))
            return
        img = prepare_frame(frame, OCR_MAX_DIM, OCR_CROP)
        print(f"[보내는 사진] {img.shape[1]}x{img.shape[0]} (원본 {frame.shape[1]}x{frame.shape[0]})")
        b64 = encode_frame_to_b64(frame, OCR_MAX_DIM, OCR_CROP)
        text, usage = call_groq(b64, GROQ_API_KEY)
        print("[Groq 응답 원문]", text)
        parsed = parse_json_answer(text)
        if parsed:
            print("[파싱 성공]")
            for key, label in FIELDS:
                print(f"  {label}: {parsed.get(key)}")
        else:
            print("[파싱 실패] JSON을 찾지 못했습니다.")
        print(f"[토큰 사용량] {usage}")
        return

    if not GROQ_API_KEY:
        print("=" * 60)
        print("[경고] GROQ_API_KEY 환경변수가 설정되지 않았습니다.")
        print("       설치 전까지는 값 인식이 되지 않지만, 연결/CSV 로그는 계속 동작합니다.")
        print("=" * 60)

    csv_file, csv_writer = ensure_csv(CSV_PATH)

    print(f"[상시 실행] 소스: {source} | 초기 인식 주기: {args.interval:.0f}초 | 로그: {CSV_PATH}")
    print("인식 주기, 중단/시작은 대시보드(연구실 > PR-DTC-3100)에서 바꾸면 재시작 없이 반영됩니다.")
    print(f"캡처 이미지는 {os.path.abspath(CAPTURES_DIR)} 에 날짜별로 저장되고 {CAPTURE_RETENTION_DAYS}일 후 자동 삭제됩니다.")
    print("현장 신호가 없으면 연결 대기 상태로 조용히 기다립니다.")
    print("신호가 다시 오면 자동으로 수집을 재개합니다.")
    if SUPABASE_SERVICE_KEY:
        print(f"[DB 저장] 켜짐 -> {SUPABASE_URL} 의 {SUPABASE_TABLE} 테이블에 매 주기 저장합니다.")
        print("          결과는 오성철강 연구실 웹페이지에서 실시간으로 확인하세요.")
    else:
        print("[DB 저장] 꺼짐 -> SUPABASE_SERVICE_ROLE_KEY 환경변수가 없어 로컬 CSV만 남습니다.")
    print(f"[토큰 절감] 사진 긴 변 {OCR_MAX_DIM or '원본'}px{' · 컨트롤러 화면만 자름 ' + str(OCR_CROP) if OCR_CROP else ''}"
          f" · {'항상 판독(--always)' if args.always else f'레벨러 {LINE_IDLE_MIN}분 정지/화면 변화 없음이면 건너뜀(최대 {FORCE_READ_EVERY_SEC // 60}분마다는 판독)'}")
    print("종료: 미리보기 창에서 q, 또는 Ctrl+C\n")

    last_values = {key: None for key, _ in FIELDS}

    try:
        # 저부하 상시 모드 (미리보기 없음, 서비스 운영용): 매 주기 새로 연결해
        # 프레임 1장만 받는다 - HTTP MJPEG 스트림의 오래된 버퍼 프레임을
        # 받는 문제를 피하고, 카메라 신호가 끊겨도 즉시 감지할 수 있다.
        if args.no_preview:
            was_connected = False
            was_enabled = True
            current = {"interval": args.interval, "enabled": True}
            last_sig = None
            last_sent = 0.0
            last_line_state = None
            while True:
                cleanup_old_captures()

                new_settings = fetch_settings_from_supabase(current)
                if new_settings["enabled"] != current["enabled"]:
                    print(f"[상태 변경] {'재개' if new_settings['enabled'] else '일시중단'} (대시보드 중단/시작 버튼으로 변경됨)")
                if new_settings["interval"] != current["interval"]:
                    print(f"[인식 주기 변경] {current['interval']:.0f}초 -> {new_settings['interval']:.0f}초 (대시보드에서 변경됨)")
                current = new_settings

                if not current["enabled"]:
                    was_enabled = False
                    send_heartbeat("paused", "대시보드에서 중단됨")
                    time.sleep(PAUSED_POLL_SEC)
                    continue
                if not was_enabled:
                    print("[재개] 대시보드에서 다시 시작했습니다. 인식을 재개합니다.")
                    was_enabled = True

                # (2) 레벨러가 안 돌면 AI에 보내지 않고 쉰다
                if not args.always:
                    line_state, line_note = line_activity()
                    if line_state != last_line_state:
                        print(f"[레벨러] {line_note}" + (" -> 판독 쉼" if line_state == "idle" else ""))
                        last_line_state = line_state
                    if line_state == "idle" and time.time() - last_sent < IDLE_FORCE_READ_SEC:
                        send_heartbeat("idle_line", line_note)
                        time.sleep(IDLE_RECHECK_SEC)
                        continue

                cap = try_open(source)
                frame = None
                if cap is not None:
                    ok, f = cap.read()
                    if ok:
                        frame = f
                    cap.release()

                if frame is None:
                    if was_connected:
                        print("[연결 끊김] 카메라 신호가 사라졌습니다. 대기 모드로 전환합니다.")
                        log_event(csv_writer, csv_file, "session_end_lost_connection")
                        send_heartbeat("camera_lost", "카메라 영상을 받지 못함")
                    was_connected = False
                    time.sleep(RECONNECT_WAIT_SEC)
                    continue

                if not was_connected:
                    print("[연결됨] 카메라 신호 감지 -> 데이터 수집을 시작합니다.")
                    log_event(csv_writer, csv_file, "session_start")
                    was_connected = True

                # (2) 직전에 보낸 화면과 거의 같으면 건너뜀 (단 FORCE_READ_EVERY_SEC 마다는 판독)
                sig = frame_signature(frame)
                if not args.always and last_sig is not None and not frame_changed(last_sig, sig) \
                        and time.time() - last_sent < FORCE_READ_EVERY_SEC:
                    send_heartbeat("unchanged", "화면 변화 없음 - 판독 건너뜀")
                    time.sleep(current["interval"])
                    continue

                last_values = do_ocr_and_record(frame, last_values, csv_writer, csv_file)
                last_sig, last_sent = sig, time.time()
                send_heartbeat("reading", "판독함")
                time.sleep(current["interval"])

        # 미리보기 창을 띄운 확인 모드 (현장 설치 직후 프레이밍 확인용)
        current = {"interval": args.interval, "enabled": True}
        while True:
            attempt = 0
            cap = try_open(source)
            while cap is None:
                if attempt % RECONNECT_LOG_EVERY == 0:
                    print(f"[대기] 카메라 연결 안 됨. {RECONNECT_WAIT_SEC}초마다 재시도 중...")
                attempt += 1
                time.sleep(RECONNECT_WAIT_SEC)
                cap = try_open(source)

            print("[연결됨] 카메라 신호 감지 -> 데이터 수집을 시작합니다.")
            log_event(csv_writer, csv_file, "session_start")

            last_capture_time = 0.0
            lost_connection = False

            while True:
                ret, frame = cap.read()
                if not ret:
                    print("[연결 끊김] 카메라 신호가 사라졌습니다. 대기 모드로 전환합니다.")
                    log_event(csv_writer, csv_file, "session_end_lost_connection")
                    lost_connection = True
                    break

                cleanup_old_captures()
                now = time.time()
                if now - last_capture_time >= current["interval"]:
                    last_capture_time = now
                    new_settings = fetch_settings_from_supabase(current)
                    if new_settings["enabled"] != current["enabled"]:
                        print(f"[상태 변경] {'재개' if new_settings['enabled'] else '일시중단'} (대시보드 중단/시작 버튼으로 변경됨)")
                    if new_settings["interval"] != current["interval"]:
                        print(f"[인식 주기 변경] {current['interval']:.0f}초 -> {new_settings['interval']:.0f}초 (대시보드에서 변경됨)")
                    current = new_settings
                    if current["enabled"]:
                        last_values = do_ocr_and_record(frame, last_values, csv_writer, csv_file)

                cv2.imshow("PR-DTC-3100 인식 모니터 (q: 종료)", frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    cap.release()
                    return

            cap.release()
            if not lost_connection:
                break

    except KeyboardInterrupt:
        print("\n[종료] 사용자에 의해 중단되었습니다.")
    finally:
        csv_file.close()
        cv2.destroyAllWindows()
        print(f"[완료] 로그 저장됨: {os.path.abspath(CSV_PATH)}")


if __name__ == "__main__":
    main()
