@echo off
echo ========================================
echo Fresh Installation Script
echo ========================================
echo.

echo [1/5] Cleaning existing node_modules...
if exist "node_modules" rmdir /s /q "node_modules"
if exist "frontend\node_modules" rmdir /s /q "frontend\node_modules"
if exist "backend\node_modules" rmdir /s /q "backend\node_modules"

echo [2/5] Cleaning package-lock files...
if exist "package-lock.json" del "package-lock.json"
if exist "frontend\package-lock.json" del "frontend\package-lock.json"
if exist "backend\package-lock.json" del "backend\package-lock.json"

echo [3/5] Installing root dependencies...
call npm install

echo [4/5] Installing backend dependencies...
cd backend
call npm install
cd ..

echo [5/5] Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo ========================================
echo Installation completed!
echo ========================================
echo.
echo To start the system:
echo   scripts\start-backend.bat
echo   scripts\start-frontend.bat
echo.
pause
