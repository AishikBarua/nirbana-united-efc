@echo off
setlocal

echo ============================================
echo  Nirbana United EFC -- Clean and Retry
echo ============================================
echo.
echo Use this ONLY if setup-and-run.bat failed with an error like:
echo   "EPERM: operation not permitted, unlink ... query_engine-windows.dll.node"
echo   or "npm install failed" more than once in a row.
echo.
echo This will:
echo   1. Close any leftover Node processes for this project
echo   2. Delete the node_modules folder completely
echo   3. Reinstall everything from scratch
echo.
echo Before continuing: please close any OTHER window that is running
echo "npm run dev" for this project (or just close all cmd/PowerShell
echo windows related to it).
echo.
pause

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found on this computer.
  pause
  exit /b 1
)

echo.
echo Removing node_modules -- this may take a minute...
if exist "node_modules" (
  rmdir /s /q "node_modules"
)

echo.
echo Reinstalling dependencies...
call node scripts\safe-npm-install.js
if errorlevel 1 (
  echo.
  echo [ERROR] Still failing. See the suggestions printed above, then try
  echo again, or share the exact error text for more help.
  pause
  exit /b 1
)

echo.
echo ============================================
echo  Done! Now double-click setup-and-run.bat to start the site.
echo ============================================
pause
