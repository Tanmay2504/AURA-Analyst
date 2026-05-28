@echo off
setlocal
set "ROOT=%~dp0"
echo ============================================
echo  AURA Analyst - Starting Backend
echo  http://localhost:8000
echo  API Docs: http://localhost:8000/api/docs
echo ============================================
cd /d "%ROOT%"
"%ROOT%backend\venv\Scripts\python.exe" -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
