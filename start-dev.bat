@echo off
setlocal

set "ROOT=%~dp0"

start "Backend" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location '%ROOT%backend'; & '%ROOT%backend\venv\Scripts\python.exe' -m uvicorn backend.main:app --reload --app-dir '%ROOT%'"
start "Frontend" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location '%ROOT%frontend'; & 'D:\nodejs\npm.cmd' run dev"

echo Started backend and frontend in separate windows.