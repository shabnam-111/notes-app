@echo off
title MindVault - Frontend Web Client
cd /d "%~dp0frontend"
echo ========================================================
echo Starting MindVault Frontend on port 3000...
echo ========================================================
call npm.cmd run dev
pause
