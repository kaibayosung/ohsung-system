@echo off
chcp 65001 >nul
title 슬리터2 현장화면 HTTP 서버 (닫으면 종료)
cd /d "%~dp0public"
echo ================================================================
echo   슬리터2 현장화면 HTTP 서버
echo.
echo   1) 아래 명령으로 이 PC의 IP를 확인하세요 (다른 cmd 창):
echo        ipconfig   ^<-- IPv4 주소 (예: 192.168.0.50)
echo.
echo   2) 태블릿 크롬에서 접속:
echo        http://(이 PC IP):8080/slitter2-floor-en.html
echo        예) http://192.168.0.50:8080/slitter2-floor-en.html
echo.
echo   * 이 창을 닫으면 서버가 꺼집니다. 켜 두세요.
echo   * 처음 실행 시 방화벽 허용 창이 뜨면 [액세스 허용] 하세요.
echo ================================================================
echo.
python -m http.server 8080 2>nul || py -m http.server 8080 2>nul || npx --yes serve -l 8080 .
echo.
echo [서버가 종료되었거나 python/node가 없습니다] 아무 키나 누르세요...
pause >nul
