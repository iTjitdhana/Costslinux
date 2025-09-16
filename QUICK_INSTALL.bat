@echo off
echo ========================================
echo    Cost Calculation System Installer
echo ========================================
echo.

echo [1/4] Installing Frontend Dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install frontend dependencies
    pause
    exit /b 1
)

echo.
echo [2/4] Installing Backend Dependencies...
cd ..\backend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)

echo.
echo [3/4] Checking configuration...
cd ..
if not exist config.env (
    echo WARNING: config.env not found!
    echo Please copy config.env.example to config.env and configure it
    echo.
)

echo.
echo [4/4] Installation completed!
echo.
echo Next steps:
echo 1. Configure config.env file
echo 2. Start backend: cd backend && node server.js
echo 3. Start frontend: cd frontend && npm start
echo.
echo Press any key to exit...
pause > nul
