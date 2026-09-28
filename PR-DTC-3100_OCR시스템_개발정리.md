# PR-DTC-3100 실시간 인식 시스템 — 개발 정리

## 1. 배경과 목표

PR-DTC-3100 타퍼 텐션 컨트롤러는 통신 포트가 없어 PLC/ERP와 직접 연동할 수 없다. 그래서 컨트롤러의 LCD 화면을 카메라로 찍어 OCR로 값을 뽑아내고, 관리자가 원격(웹)으로 현재 상태를 확인할 수 있게 만든 것이 이 프로젝트다.

인식 대상은 6개 필드: 출력%(`output_percent`), 전압(`output_voltage`), 두께(`thickness_um`), 시작경(`start_dia_mm`), 장력설정(`tension_set`), 장력율(`tension_rate`).

개발 전 단계에서 이미 Tesseract 기반 프로토타입(`ocr_monitor_fixed.py`)이 있었으나, 화면 자동감지·색상마스크·다수결 보정 로직이 복잡한 데 비해 `tension_set` 필드 외에는 정확도가 낮아 6개 필드 전체로 확장하지 못하고 있었다.

## 2. 전체 아키텍처

```
폰(IP Webcam 앱, Tailscale) → MJPEG 스트림(http://<phone-ip>:8080/video)
        ↓
개발서버의 ocr_monitor_production.py (Python, headless)
        ↓ 프레임 1장을 그대로 Groq Vision API에 전송
Groq (qwen/qwen3.8-27b) → JSON 응답(6개 필드)
        ↓
Supabase 테이블 ai_tension_readings (신규 저장) + 로컬 CSV 백업 + 로컬 이미지 저장
        ↓
오성철강 연구실 웹앱의 public/ai-tension-monitor.html (Supabase anon key로 8초마다 폴링)
```

기존 개발용 도구 `ai-recognition-validation.html`(브라우저에서 직접 Groq 호출, 사진 폴더 선택 후 값 비교)이 먼저 있었고, 이 도구로 검증된 프롬프트/모델 조합을 그대로 상용 스크립트에 재사용했다.

## 3. 데이터베이스 (Supabase project `mnlnbwcbgfgftdgawanh`)

### `ai_tension_readings` — 인식 결과 저장 (신규, 기존 `taper_tension_readings`와 별도)

```sql
create table public.ai_tension_readings (
  id bigint generated always as identity primary key,
  captured_at timestamptz not null default now(),
  output_percent numeric, output_voltage numeric, thickness_um numeric,
  tension_rate numeric, start_dia_mm numeric, tension_set numeric,
  model text, prompt_tokens int, total_tokens int,
  parse_ok boolean not null default false,
  connected boolean not null default true,
  raw_response text, error_message text,
  created_at timestamptz not null default now()
);
-- RLS: anon+authenticated SELECT만 허용 (쓰기는 서비스키로만)
```

### `ai_tension_settings` — 대시보드에서 바꾸는 운영 설정 (단일 행, id=1)

```sql
create table public.ai_tension_settings (
  id int primary key default 1,
  capture_interval_sec int not null default 120,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
-- RLS: anon+authenticated SELECT/UPDATE 둘 다 허용 (대시보드 버튼이 anon key로 직접 PATCH)
```

이 테이블 하나로 "인식 주기(1/2/5분)"와 "중단/재개" 두 가지를 제어한다. 개발서버 스크립트는 재시작 없이 이 값을 폴링해서 반영한다.

## 4. `ocr_monitor_production.py` (개발서버, 리포에는 미포함 — API 키가 bat 파일에 들어가므로 git 밖에 둠)

### 4.1 핵심 함수

- `encode_frame_to_b64(frame, max_dim=None)` — JPEG 인코딩 후 base64. `max_dim`을 넘겨도 실측 결과 토큰 수가 거의 안 줄어들어(640px~192px 전부 토큰 ~1,390 동일) 기본은 축소 없이 원본 전송.
- `call_groq_once(b64, api_key)` — **`curl_cffi`(`impersonate="chrome"`)로 크롬 TLS 지문을 흉내내어 호출**. 표준 `urllib`로 호출하면 Cloudflare가 "HTTP 403, error code: 1010"으로 차단하는 문제가 실측으로 확인되어 이렇게 우회함(Groq API 자체 오류 아님 — 브라우저 `fetch()`는 원래 잘 됨).
- `call_groq(...)` — 429(rate limit) 시 최대 2회 재시도, `retry-after` 파싱해서 대기.
- `parse_json_answer(text)` — 정규식으로 `{...}` 추출 후 `json.loads`.
- `save_reading_to_supabase(...)` — `SUPABASE_SERVICE_ROLE_KEY` 환경변수 없으면 조용히 스킵. 파싱 실패 시에도 `parse_ok=false`로 행을 남겨 대시보드에서 실패율을 볼 수 있게 함(값은 null, 화면 쪽에서만 "직전값 유지" 표시).
- `fetch_settings_from_supabase(fallback)` — 매 사이클 `ai_tension_settings`를 조회해 `{interval, enabled}` 반환. 실패하면 조용히 fallback 유지.
- `save_capture_image(frame, ok)` — `captures/YYYY-MM-DD/HHMMSS[_FAIL].jpg`로 로컬 저장(Supabase Storage 아님 — 사용자 요청으로 로컬 디스크만 사용). 실패 케이스는 파일명에 `_FAIL`을 붙여 탐색기에서 바로 구분되게 함.
- `cleanup_old_captures()` — 6시간마다 한 번만 스캔해서 14일 지난 날짜 폴더 삭제.

### 4.2 메인 루프 (`--no-preview`, 실사용 모드)

매 사이클마다: 캡처 폴더 정리 → 설정 조회(주기/중단여부 변경 감지·로그 출력) → **중단 상태면 카메라도 안 열고 10초 후 재확인만 하고 넘어감** → 카메라 연결(매번 새로 열어 MJPEG 오래된 버퍼 프레임 문제 회피) → 프레임 1장 → Groq 인식 → CSV/Supabase 저장 → 로컬 이미지 저장 → `sleep(current interval)`.

카메라 신호가 없으면 5초 간격으로 조용히 재시도하고, 신호가 오면 자동으로 재개한다(현장 전원 On/Off에 자동 대응).

`--test` 모드는 프레임 1장만 받아 Groq 결과를 콘솔에 출력하고 종료 — Supabase에는 쓰지 않는 순수 연결 확인용.

### 4.3 배포 파일 (리포 밖, 개발서버 로컬에만 존재)

- `run_ocr_monitor.bat` — `GROQ_API_KEY`/`SUPABASE_SERVICE_ROLE_KEY` 환경변수 설정 후 `--no-preview`로 상시 실행. 더블클릭 한 번으로 동작.
- `run_ocr_monitor_test.bat` — 같은 방식으로 `--test` 1회 실행 (Supabase 키는 필요 없어 미포함).
- **두 파일 모두 순수 ASCII로 작성** — 처음 UTF-8+한글로 만들었을 때 Windows 콘솔 코드페이지(CP949로 추정) 불일치로 명령어 자체가 깨져(mojibake) 실행이 안 되는 문제가 있었음. `chcp 65001`보다 ASCII 전용이 더 안전한 해결책이라 판단.

## 5. 대시보드 (`public/ai-tension-monitor.html`)

정적 HTML(빌드 불필요), Pretendard 폰트, 기존 `taper-tension-ingestion-status.html`과 동일한 코드 패턴(`pgrest()` fetch 헬퍼, KST 타임스탬프 변환, 8초 폴링) 재사용.

카드 구성(위→아래):
1. **메인 카드** — 출력% 큰 숫자 + 전압/두께/시작경/장력설정/장력율/평균토큰 6칸 KPI 그리드, 실시간 상태 점(정상수신/수신지연/수신끊김/**중단됨**).
2. **오늘 API 사용량** — 오늘(KST) 누적 토큰·호출횟수를 `ai_tension_readings`에서 직접 합산해 Groq 무료 한도(토큰 200,000, 요청 1,000) 대비 진행바로 표시. 80% 넘으면 경고색.
3. **인식 주기 / 중단·시작** — 1분/2분/5분 버튼 + "⏸ 인식 중단하기"/"▶ 인식 재개하기" 토글 버튼. 클릭 시 `ai_tension_settings`를 anon key로 직접 PATCH(서버 API 없이 클라이언트에서 바로 씀 — 다른 유사 페이지들도 같은 패턴).
4. **누적 현황** — 총/오늘 저장 건수, 최근 20건 중 파싱 실패율.
5. **최근 6시간 수신 커버리지** — 10분 단위 막대.
6. **최근 저장 레코드 표** — 최근 20건, 상태 칩(정상/파싱실패).

`LabPage.jsx`의 `PROJECTS` 배열에 `key: 'ai-tension-monitor'`로 등록, 카테고리 "생산현장 도구", badge "실데이터 연동".

## 6. 트러블슈팅 히스토리 (재발 시 참고)

| 증상 | 원인 | 해결 |
|---|---|---|
| bat 실행 시 명령어가 깨진 문자로 나오며 실행 안 됨 | UTF-8+한글 bat 파일과 콘솔 코드페이지 불일치 | bat 파일을 순수 ASCII로 재작성 |
| `HTTP 403 Forbidden`, `error code: 1010` | Cloudflare가 Python 표준 TLS 핸드셰이크 지문을 봇으로 차단(Groq API 자체 문제 아님) | `curl_cffi`로 크롬 TLS 지문 흉내 |
| `python ocr_monitor_production.py` 직접 실행 시 `GROQ_API_KEY 없음` + `소스: 0`(로컬 웹캠) 오류 | bat 파일을 안 거치고 스크립트를 터미널에서 직접 실행해서 env/--source 인자가 빠짐 | 반드시 bat 파일을 더블클릭으로 실행 |
| `Rate limit... tokens per day (TPD): Limit 200000, Used 199833` | Groq 무료 한도 도달. 이 한도는 **계정(조직) 전체가 공유** — 검증 도구·테스트 호출도 같은 예산을 쓴다 | 아래 7번 항목 참고 |

## 7. Groq 무료 한도 실측 결과

- `qwen/qwen3.8-27b` 무료 한도: RPM 30, **RPD 1,000, TPM 8,000, TPD 200,000**.
- 회당 실측 토큰: 약 1,390(입력) + 80(출력) = **총 1,470**.
- **TPD 200,000이 병목** — 2분 주기 기준 하루 약 4~5시간이 실제 한계(계산상 200,000÷1,470≈136회, 2분 간격이면 약 272분).
- 리셋 방식은 "매일 UTC 자정"이 아니라 **최근 24시간 롤링 윈도우**로 확인됨(실제 429 에러의 "n분 후 재시도" 값이 자정까지 남은 시간과 안 맞음 — 오래된 사용량이 24시간 지나며 하나씩 빠지는 구조).
- 검증 도구(`ai-recognition-validation.html`) 사용, 연결 테스트(`--test`)도 전부 같은 계정 예산을 공유하므로, 개발/테스트가 많은 날은 상용 프로그램이 쓸 수 있는 몫이 줄어든다.
- **유료 Dev Tier 참고 견적**: 공식 요금(qwen3.6-27b 기준, 입력 $0.60/M·출력 $3.00/M) 적용 시 회당 약 $0.00107(약 1.4원). 1분 주기로 24시간 풀가동해도 한 달 약 $46, 업무시간(하루 10시간)만이면 한 달 약 $19 수준 — 로컬 인식 전환의 개발/유지보수 공수 대비 저렴할 수 있음.

## 8. 향후 검토 중인 대안 (별도 문서)

Groq 없이 로컬(개발서버, GPU 없음)에서 숫자만 인식하는 방법을 `PR-DTC-3100_로컬인식_전환검토.md`에 상세 검토해둠. 요약: Tesseract는 이미 정확도 부족으로 기각, 1순위는 세그먼트(7-segment) 디코딩, 2순위는 이진화 템플릿 비교, 3순위는 Groq 라벨을 자동 활용한 소형 분류기 학습. 각 방식의 레드팀 관점 위험 요인(카메라 재배치 취약성, 조용한 오답, 조명 변화 민감도, 유지보수 부담 등)도 정리되어 있음.

## 9. 파일 목록 정리

**리포에 커밋된 것:**
- `public/ai-tension-monitor.html` (대시보드)
- `src/pages/LabPage.jsx` (PROJECTS 배열에 1줄 등록)

**리포 밖(개발서버 로컬 전용, git 미포함 — API 키 노출 방지):**
- `ocr_monitor_production.py`
- `run_ocr_monitor.bat`, `run_ocr_monitor_test.bat`
- `ocr_log_production.csv` (실행 시 자동 생성, 로컬 백업 로그)
- `captures/` (실행 시 자동 생성, 날짜별 캡처 이미지, 14일 보관)

**참고용 기존 자산:**
- `public/ai-recognition-validation.html` (개발용 브라우저 검증 도구, 프롬프트/모델 검증 출처)
- `ocr_monitor_fixed.py` (Tesseract 기반 구버전, 참고용)
