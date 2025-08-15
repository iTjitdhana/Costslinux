@echo off
echo ========================================
echo    Backend Server Only
echo ========================================
echo.
echo Starting Backend Server...
echo Port: 3104
echo Database: 192.168.0.94:3306
echo.
echo Health Check: http://localhost:3104/health
echo Test Endpoint: http://localhost:3104/test
echo.
echo Network Access: http://192.168.0.94:3104
echo.

cd backend
npm start

echo.
echo Backend server stopped.
pause
