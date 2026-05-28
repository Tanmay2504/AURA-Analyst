@echo off
setlocal
set "ROOT=%~dp0"

echo ============================================
echo  AURA Analyst - Starting Full Stack
echo  Backend  : http://localhost:8000
echo  API Docs : http://localhost:8000/api/docs
echo  Frontend : http://localhost:3000
echo ============================================

start "AURA Backend" cmd /k "cd /d "%ROOT%" && "%ROOT%backend\venv\Scripts\python.exe" -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 2 /nobreak >nul
start "AURA Frontend" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo Press any key to close this launcher...
pause >nul
