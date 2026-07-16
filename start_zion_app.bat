@echo off
:: Zion Digital App - Windows 1-Click Startup Launcher & Diagnostic Tool
:: Designed for local laptop execution via Windows Command Prompt (CMD)

title Zion Digital App Hub - Bungoma Gateway Launcher
color 0B
cls

echo =======================================================================
echo           ZION DIGITAL APP - LOCAL RUNNER & DIAGNOSTIC GATEWAY
echo =======================================================================
echo   This tool automates Node.js initialization, dependency check,
echo   and launching of the Zion Digital full-stack application.
echo =======================================================================
echo.

:: 1. Check for Administrative / Privileged Access (Optional recommendation)
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [STATUS] Running with Administrative privileges. Perfect.
) else (
    echo [INFO] Running in normal user context.
    echo        (For advanced features like local network Wi-Fi Hotspot sharing,
    echo         running as Administrator is highly recommended.)
)
echo.

:: 2. Check Node.js installation
echo Checking for Node.js runtime...
where node >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is NOT installed on this computer!
    echo         To run this app on your laptop, you must download and install Node.js.
    echo.
    echo         1. Download Node.js from: https://nodejs.org/ (v18 or newer recommended)
    echo         2. Run the installer and accept all default configurations.
    echo         3. Restart this launcher script (start_zion_app.bat).
    echo.
    pause
    exit /b
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [SUCCESS] Node.js is active: %NODE_VERSION%
echo.

:: 3. Check and restore NPM Dependencies
if not exist "node_modules\" (
    echo =======================================================================
    echo   [INITIALIZATION] First-time setup detected. Restoring packages...
    echo =======================================================================
    echo Running 'npm install'... This may take 1-2 minutes depending on connection.
    call npm install
    if %errorLevel% neq 0 (
        color 0C
        echo [ERROR] NPM package restoration failed! Please check your internet connection.
        pause
        exit /b
    )
    echo [SUCCESS] Package dependencies restored successfully.
    echo.
) else (
    echo [STATUS] Dependencies verified (node_modules folder present).
)

:: 4. Prompt for execution mode
echo =======================================================================
echo   SELECT RUNNING MODE:
echo =======================================================================
echo   [1] Developer Mode (Enables Hot Reload - fast, best for code editing)
echo   [2] Production Mode (Compiles optimized assets - lightning fast execution)
echo.
set /p runMode="Enter selection [1 or 2, default is 1]: "

if "%runMode%"=="" set runMode=1

echo.
echo Launching local server on http://localhost:3000 ...
echo Press Ctrl + C inside this window to terminate the application at any time.
echo.

:: Start browser auto-opener in 4 seconds in background
start /b "" cmd /c "timeout /t 4 >nul && start http://localhost:3000"

if "%runMode%"=="2" (
    echo Building static and bundled server assets...
    call npm run build
    if %errorLevel% neq 0 (
        echo [WARNING] Build stage returned errors. Attempting to start regardless...
    )
    echo Starting optimized production server...
    call npm run start
) else (
    echo Launching development server...
    call npm run dev
)

pause
