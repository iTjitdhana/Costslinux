@echo off
echo ========================================
echo    Production Cost Calculation System
echo ========================================
echo.

echo Starting Backend Server...
echo Port: 3104
echo Database: 192.168.0.94:3306
echo.
cd backend
start "Backend Server" cmd /k "npm start"
cd ..

echo.
echo Starting Frontend Server...
echo Port: 3014
echo API URL: http://192.168.0.94:3104/api
echo.
cd frontend
start "Frontend Server" cmd /k "npm start"
cd ..

echo.
echo ========================================
echo    System Starting...
echo ========================================
echo Backend:  http://localhost:3104
echo Frontend: http://localhost:3014
echo Health:   http://localhost:3104/health
echo Test:     http://localhost:3104/test
echo.
echo Network Access:
echo Backend:  http://192.168.0.94:3104
echo Frontend: http://192.168.0.94:3014
echo.
echo Press any key to close this window...
pause > nul
