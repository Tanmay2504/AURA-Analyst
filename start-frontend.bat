@echo off
setlocal
set "ROOT=%~dp0"
echo ============================================
echo  AURA Analyst - Starting Frontend
echo  http://localhost:3000
echo ============================================
cd /d "%ROOT%frontend"
npm run dev
