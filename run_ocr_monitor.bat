@echo off
setlocal

REM ============================================================
REM PR-DTC-3100 live recognition - production run (double-click to start)
REM ============================================================

call "%~dp0ocr_monitor_secrets.local.bat"

cd /d "%~dp0"

echo [1/2] Checking required libraries (skips fast if already installed)...
python -m pip install --quiet opencv-python numpy curl_cffi

echo [2/2] Starting recognition. Press Ctrl+C in this window to stop.
echo.

python ocr_monitor_production.py --source "http://100.98.52.80:8080/video" --no-preview

echo.
echo Program stopped. Press any key to close this window.
pause >nul
