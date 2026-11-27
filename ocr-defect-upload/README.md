# 오성철강 불량 이미지 업로드 서비스 (OCR 개발서버)

핸드폰 등록화면이 보낸 사진을 받아 **압축 → OCR 개발서버 내부 디스크에 저장**하고, 저장 경로(`file_path`)를 돌려준다. 그 경로는 Supabase Edge Function을 거쳐 **상용 MariaDB**에 기록된다. 이미지 파일은 이 서버에만 저장한다(Supabase Storage 미사용).

## 1. 설치 (OCR 개발서버에서)

```
pip install -r requirements.txt
```

## 2. 저장 폴더 지정 + 실행

이미지는 용량이 커지므로 **여유 있는 드라이브**에 저장한다(예: `D:\defect-img`).

```
set DEFECT_IMG_ROOT=D:\defect-img
python -m uvicorn defect_upload_service:app --host 0.0.0.0 --port 8099
```

또는 `run.bat` 실행(경로는 파일 안에서 수정).

확인: 브라우저에서 `http://localhost:8099/health` → `{"ok": true, ...}`

## 3. 도메인(공개 https) 노출 — Tailscale Funnel

핸드폰(테일넷 밖)에서 접속하려면 공인 https 도메인이 필요하다. 포트 8099를 Funnel로 노출한다.

```
tailscale funnel 8099
```

- 실행하면 공개 주소가 출력된다: `https://<머신이름>.tail8d1b48.ts.net`
- 백그라운드 상시 실행: `tailscale funnel --bg 8099`
- 상태 확인: `tailscale funnel status`
- 만약 Funnel이 꺼져 있다는 안내가 나오면, 출력되는 링크로 테일넷 관리자에서 **HTTPS 인증서**와 **Funnel 노드 속성**을 켠다(최초 1회).

확인: `https://<머신이름>.tail8d1b48.ts.net/health` 가 열리면 성공.

→ **이 주소를 알려주시면** 핸드폰 등록화면과 조회화면에 연결한다.

## 4. 동작 요약

| 엔드포인트 | 설명 |
|---|---|
| `POST /upload` | `files`(사진 여러 장) 업로드 → 압축·저장 → `{file_path, file_count}` 반환 |
| `GET /img/<file_path>` | 저장된 이미지 서빙 (폴더면 1.jpg) |
| `GET /health` | 상태 확인 |

## 5. 설정값 (환경변수, 선택)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `DEFECT_IMG_ROOT` | `D:\defect-img` | 이미지 저장 폴더 |
| `DEFECT_PORT` | `8099` | 포트 |
| `DEFECT_MAX_EDGE` | `1600` | 긴 변 최대 px (압축) |
| `DEFECT_JPEG_QUALITY` | `80` | JPEG 품질 |
| `DEFECT_ALLOWED_ORIGINS` | vercel+localhost | 업로드 허용 출처(CORS) |
| `DEFECT_UPLOAD_TOKEN` | (없음) | 값 지정 시 업로드에 `X-Upload-Token` 헤더 요구 |

## 6. 보관·정리

- 1년 보관 기준 예상 7~12GB(압축 시). 저장 폴더 드라이브 여유 확인.
- 오래된 폴더는 날짜 기준으로 주기적으로 정리(예: 1년 경과분 삭제).
