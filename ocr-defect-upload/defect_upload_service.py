# -*- coding: utf-8 -*-
"""
오성철강 불량 이미지 업로드/서빙 서비스 (OCR 개발서버에서 실행)
- 핸드폰 등록화면이 보낸 사진을 받아 압축 후 내부 디스크에 저장
- 저장 경로(file_path)만 반환 → 그 값은 Supabase Edge Function을 거쳐 상용 MariaDB에 기록
- 이미지 파일은 이 서버 디스크에만 저장 (Supabase Storage 사용 안 함)

실행:
  pip install -r requirements.txt
  set DEFECT_IMG_ROOT=D:\\defect-img        (이미지 저장 폴더, 여유 드라이브)
  uvicorn defect_upload_service:app --host 0.0.0.0 --port 8099

공개(도메인) 노출: Tailscale Funnel  →  README.md 참조
"""
import os
import io
import time
import secrets
import pathlib
import datetime
import json
import urllib.request
import urllib.error
from urllib.parse import quote

from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.responses import FileResponse, Response, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps

# ──────────────────────────── 설정 ────────────────────────────
STORAGE_ROOT = os.environ.get("DEFECT_IMG_ROOT", r"D:\defect-img")  # 전용 저장 폴더
MAX_EDGE = int(os.environ.get("DEFECT_MAX_EDGE", "1600"))           # 긴 변 최대 px
JPEG_QUALITY = int(os.environ.get("DEFECT_JPEG_QUALITY", "80"))     # 압축 품질
MAX_FILES = 10                                                      # 1회 최대 장수
# 업로드 허용 출처 (등록화면이 뜨는 주소)
ALLOWED_ORIGINS = os.environ.get(
    "DEFECT_ALLOWED_ORIGINS",
    "https://ohsung-system.vercel.app,http://localhost:3000",
).split(",")
# 간단 보호용 토큰(선택). 값이 있으면 업로드 시 X-Upload-Token 헤더가 일치해야 함.
UPLOAD_TOKEN = os.environ.get("DEFECT_UPLOAD_TOKEN", "").strip()
# 검출 이미지(상용 비전서버 38080) 프록시 대상 — https 품질화면이 직접 받게 중계
VISION_SRC = os.environ.get("DEFECT_VISION_SRC", "http://osungsteel.servehttp.com:38080").rstrip("/")

app = FastAPI(title="오성철강 불량 이미지 업로드")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _new_folder() -> str:
    """저장 폴더: YYYY/MM/<타임스탬프>-<랜덤>  (코일ID 등 민감값은 경로에 넣지 않음)"""
    now = datetime.datetime.now()  # 로컬(KST) 시각
    return f"{now:%Y/%m}/{int(time.time())}-{secrets.token_hex(3)}"


def _resolve_under_root(rel: str) -> pathlib.Path:
    root = pathlib.Path(STORAGE_ROOT).resolve()
    p = (root / rel).resolve()
    if not str(p).startswith(str(root)):
        raise HTTPException(403, "bad path")
    return p


@app.get("/health")
def health():
    root = pathlib.Path(STORAGE_ROOT)
    return {
        "ok": True,
        "root": str(root),
        "root_exists": root.exists(),
        "max_edge": MAX_EDGE,
        "jpeg_quality": JPEG_QUALITY,
        "token_required": bool(UPLOAD_TOKEN),
    }


@app.post("/upload")
async def upload(
    files: list[UploadFile] = File(...),
    x_upload_token: str | None = Header(default=None),
):
    if UPLOAD_TOKEN and (x_upload_token or "") != UPLOAD_TOKEN:
        raise HTTPException(401, "token")
    if not files:
        raise HTTPException(400, "no files")

    folder = _new_folder()
    abspath = _resolve_under_root(folder)
    abspath.mkdir(parents=True, exist_ok=True)

    saved = 0
    for i, f in enumerate(files[:MAX_FILES], start=1):
        raw = await f.read()
        if not raw:
            continue
        try:
            img = Image.open(io.BytesIO(raw))
            img = ImageOps.exif_transpose(img)   # 핸드폰 회전(EXIF) 보정
            img = img.convert("RGB")
            img.thumbnail((MAX_EDGE, MAX_EDGE))   # 긴 변 기준 축소(확대 안 함)
            img.save(abspath / f"{i}.jpg", "JPEG", quality=JPEG_QUALITY, optimize=True)
            saved += 1
        except Exception as e:  # noqa: BLE001
            raise HTTPException(400, f"image {i}: {e}")

    if saved == 0:
        raise HTTPException(400, "저장된 이미지 없음")
    return {"ok": True, "file_path": folder, "file_count": saved}


@app.get("/img/{path:path}")
def img(path: str):
    """
    이미지 서빙. path 예:
      2026/11/1731000000-ab12cd            → 그 폴더의 1.jpg
      2026/11/1731000000-ab12cd/2.jpg      → 2번째 사진
    """
    p = _resolve_under_root(path)
    if p.is_dir():
        p = p / "1.jpg"
    if not p.exists():
        raise HTTPException(404, "not found")
    return FileResponse(str(p), media_type="image/jpeg")


@app.get("/det/{det_id}")
def det(det_id: str, thumb: int = 0):
    """
    검출 이미지 프록시: 상용 비전서버(38080)의 검출 이미지를 받아 그대로 돌려줌.
    품질화면(https)이 Supabase를 거치지 않고 이 서버(https)에서 직접 받게 하기 위함.
    예: /det/12345 → http://osungsteel.servehttp.com:38080/api/leveling/detections/12345/image
    """
    did = "".join(ch for ch in str(det_id) if ch.isdigit())
    if not did:
        raise HTTPException(400, "bad id")
    url = f"{VISION_SRC}/api/leveling/detections/{did}/image" + ("?thumb=1" if thumb else "")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ohsung-det-proxy"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            ctype = resp.headers.get("Content-Type", "image/jpeg")
    except urllib.error.HTTPError as e:
        raise HTTPException(502, f"vision {e.code}")
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"vision: {e}")
    return Response(content=data, media_type=ctype,
                    headers={"Cache-Control": "public, max-age=120"})


@app.get("/levvid")
def levvid(seg: str, file: str):
    """
    영상 재생 프록시(주소만). 38080에서 서명된 play-url을 받아 그 주소로 302 리다이렉트.
    → 실제 영상 바이트는 AI 서버에서 '직접' 스트리밍됨(이 서버를 거치지 않음).
    품질화면: window.open(OCR_BASE + '/levvid?seg=...&file=...')
    """
    if not seg or not file:
        raise HTTPException(400, "seg,file")
    url = f"{VISION_SRC}/api/leveling/videos/{quote(seg, safe='')}/files/{quote(file, safe='')}/play-url"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ohsung-levvid-proxy"})
        with urllib.request.urlopen(req, timeout=12) as resp:
            j = json.loads(resp.read().decode("utf-8", "replace"))
    except urllib.error.HTTPError as e:
        raise HTTPException(502, f"play-url {e.code}")
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"play-url: {e}")
    play = j.get("url") if isinstance(j, dict) else None
    if not play:
        raise HTTPException(502, "no url")
    return RedirectResponse(play, status_code=302)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("DEFECT_PORT", "8099")))
