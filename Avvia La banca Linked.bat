@echo off
cd /d "%~dp0"
if not exist node_modules call npm install
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep 8; Start-Process http://localhost:3210"
npm run dev
