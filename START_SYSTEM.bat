@echo off
echo ========================================
echo    Starting Cost Calculation System
echo ========================================
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && node server.js"

echo Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo Starting Frontend...
start "Frontend" cmd /k "cd frontend && npm start"

echo.
echo System is starting...
echo Backend: http://localhost:3104
echo Frontend: http://localhost:3014
echo.
echo Press any key to exit this launcher...
pause > nul
