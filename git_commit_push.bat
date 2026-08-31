@echo off
cd /d "C:\Users\USER\Documents\개발\ohsung-system"

del .git\index.lock

git add public/taper-tension-monitor.html src/pages/LabPage.jsx
git commit -m "taper tension monitor: add public mobile URL (/taper-tension-monitor.html)"
git push origin main

pause
