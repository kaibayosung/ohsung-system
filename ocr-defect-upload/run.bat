@echo off
REM 오성철강 불량 이미지 업로드 서비스 실행 (OCR 개발서버)
REM 저장 폴더를 여유 있는 드라이브로 바꾸세요 (예: D:\defect-img)
set DEFECT_IMG_ROOT=D:\defect-img
set DEFECT_PORT=8099
REM (선택) 업로드 보호 토큰. 쓰려면 아래 주석 해제하고 값 지정
REM set DEFECT_UPLOAD_TOKEN=change-me

python -m uvicorn defect_upload_service:app --host 0.0.0.0 --port %DEFECT_PORT%
pause
