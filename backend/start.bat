@echo off
echo ========================================
echo    NexusFlow Backend Setup & Start
echo ========================================
echo.

echo Checking if Node.js is installed...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js is installed: 
node --version

echo.
echo Checking if MongoDB is running...
echo Please make sure MongoDB is running on localhost:27017

echo.
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Creating required directories...
if not exist "uploads" mkdir uploads
if not exist "temp" mkdir temp
if not exist "logs" mkdir logs

echo.
echo Starting NexusFlow Backend Server...
echo Server will be available at http://localhost:5000
echo API Documentation will be available at http://localhost:5000/api/health
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev

pause