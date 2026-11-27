@echo off
chcp 65001 >nul
cd /d "C:\Users\USER\Documents\개발\ohsung-system"

del .git\index.lock

git add public/leveler-quality-admin.html
git commit -m "lab: leveler quality admin PC — visual view (coil/box scope), defect images, full video, quality report" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_019J55LUFF1jsQHJQkNFAunY"
git push origin main

pause
