@echo off
title Collabex Full-Stack Launcher
echo ======================================================================
echo   Launching Collabex Platform via PowerShell (Bypassing Execution Policy)
echo ======================================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Launcher exited with error code %ERRORLEVEL%.
    pause
)
