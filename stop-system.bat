@echo off
echo ========================================
echo    Stopping Production Cost System
echo ========================================
echo.

echo Stopping all Node.js processes...
taskkill /f /im node.exe 2>nul
if %errorlevel% equ 0 (
    echo Successfully stopped Node.js processes.
) else (
    echo No Node.js processes found or already stopped.
)

echo.
echo Stopping all npm processes...
taskkill /f /im npm.cmd 2>nul
if %errorlevel% equ 0 (
    echo Successfully stopped npm processes.
) else (
    echo No npm processes found or already stopped.
)

echo.
echo System stopped successfully!
echo.
pause
