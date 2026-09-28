@echo off
setlocal

REM ============================================================
REM PR-DTC-3100 recognition - connection test (runs once, then stops)
REM Use this before run_ocr_monitor.bat to confirm the camera and
REM recognition are working correctly.
REM ============================================================

call "%~dp0ocr_monitor_secrets.local.bat"

cd /d "%~dp0"

python -m pip install --quiet opencv-python numpy curl_cffi

echo [TEST] Connecting to the phone camera and recognizing one frame with Groq...
echo.

python ocr_monitor_production.py --source "http://100.98.52.80:8080/video" --test

echo.
echo Done. Check whether the values above match what you see on the screen.
pause >nul
