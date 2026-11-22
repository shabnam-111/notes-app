@echo off
title MindVault - Backend API
cd /d "%~dp0backend"
echo ========================================================
echo Starting MindVault Backend REST API on port 4000...
echo ========================================================
call npm.cmd run dev
pause
