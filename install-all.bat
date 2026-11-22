@echo off
title MindVault - One-Click Dependency Installer
echo ========================================================
echo   MindVault - Installing All Dependencies
echo ========================================================
echo.

echo [1/3] Installing Backend Dependencies & Preparing Database...
cd /d %~dp0backend
call npm.cmd install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install backend npm packages.
    pause
    exit /b %ERRORLEVEL%
)

echo Generating Prisma client...
call npx.cmd prisma generate
echo Pushing SQLite database schema...
call npx.cmd prisma db push
echo Seeding initial demo account...
call npm.cmd run prisma:seed

echo.
echo [2/3] Installing Frontend Dependencies...
cd /d %~dp0frontend
call npm.cmd install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install frontend npm packages.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Installing Python AI Microservice Dependencies...
cd /d %~dp0ai-service
call pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Pip install returned a non-zero code. If Python is not in PATH, please install Python 3.10+ or run with Docker.
)

echo.
echo ========================================================
echo   Installation Complete!
echo   You can now launch the entire app by running:
echo   start-all.bat
echo ========================================================
echo.
pause
