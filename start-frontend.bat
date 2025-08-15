@echo off
echo ========================================
echo    Frontend Server Only
echo ========================================
echo.
echo Starting Frontend Server...
echo Port: 3014
echo API URL: http://192.168.0.94:3104/api
echo.
echo Local Access: http://localhost:3014
echo Network Access: http://192.168.0.94:3014
echo.

cd frontend
npm start

echo.
echo Frontend server stopped.
pause
