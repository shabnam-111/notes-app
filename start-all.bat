@echo off
title MindVault - Orchestrator
echo ========================================================
echo Launching MindVault Full-Stack System...
echo ========================================================

echo [1/3] Starting AI Microservice on http://localhost:8000 ...
start "MindVault - AI Service (8000)" cmd /k "cd /d %~dp0ai-service && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo [2/3] Starting Backend API on http://localhost:4000 ...
start "MindVault - Backend API (4000)" cmd /k "cd /d %~dp0backend && npm.cmd run dev"

timeout /t 2 /nobreak >nul

echo [3/3] Starting Frontend Web Client on http://localhost:3000 ...
start "MindVault - Frontend (3000)" cmd /k "cd /d %~dp0frontend && npm.cmd run dev"

echo.
echo ========================================================
echo All MindVault services are launching!
echo  - Frontend Web UI:  http://localhost:3000
echo  - Backend REST API: http://localhost:4000/api/v1
echo  - AI Microservice:  http://localhost:8000/docs
echo ========================================================
pause
