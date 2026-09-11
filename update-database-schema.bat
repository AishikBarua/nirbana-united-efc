@echo off
setlocal

echo ============================================
echo  Nirbana United EFC -- Update Database Schema
echo ============================================
echo.
echo Run this ONCE after an update adds a new database table/field (like the
echo new Notifications feature). It's safe to run any time, including again
echo later for a future update -- it only ADDS what's missing and never
echo deletes or changes your existing players, matches, news, or gallery data.
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found on this computer.
  pause
  exit /b 1
)

call npx prisma db push
if errorlevel 1 (
  echo.
  echo [ERROR] Something went wrong. Scroll up for the error message.
  pause
  exit /b 1
)

echo.
echo ============================================
echo  Done. Now restart the site if it's currently running:
echo  1. Close the window running "npm run dev"
echo  2. Double-click setup-and-run.bat again
echo ============================================
pause
