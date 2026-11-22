@echo off
title MindVault - AI Microservice
cd /d "%~dp0ai-service"
echo ========================================================
echo Starting MindVault AI Microservice on port 8000...
echo ========================================================
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
