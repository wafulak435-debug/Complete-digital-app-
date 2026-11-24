@echo off
:: Zion Digital App - Dedicated CMD Quick-Runner
:: Usage: Simply type 'run_cmd.bat' or double click in Windows CMD

title Zion Digital App - CMD Direct Runner
color 0A
cls

echo =======================================================================
echo          ZION DIGITAL APP - DIRECT COMMAND PROMPT (CMD) RUNNER
echo =======================================================================
echo.

:: 1. Verify Node.js runtime
where node >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is missing! Please install Node.js v18+ from https://nodejs.org
    pause
    exit /b
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [INFO] Node.js Version: %NODE_VER%

:: 2. Verify dependencies
if not exist "node_modules\" (
    echo [INFO] First time setup detected. Restoring npm packages...
    call npm install
    if %errorLevel% neq 0 (
        color 0C
        echo [ERROR] npm install failed. Please check your network connection.
        pause
        exit /b
    )
)

:: 3. Launch application server
echo [SUCCESS] Environment ready. Launching Zion App Server on http://localhost:3000
echo.
echo Press Ctrl + C in this CMD window to stop the server at any time.
echo.

start /b "" cmd /c "timeout /t 3 >nul && start http://localhost:3000"
call npm run dev
pause
