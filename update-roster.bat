@echo off
setlocal

echo ============================================
echo  Nirbana United EFC -- Update Roster
echo ============================================
echo.
echo This loads the club's real, complete 25-player roster (merged from the
echo tracker's Match Stats and Squad screens: real UIDs, devices, goals, and
echo win/draw/loss records). Matches, news, and club info are NOT touched by
echo this script.
echo.

if not exist "node_modules" (
  echo [ERROR] node_modules not found. Run setup-and-run.bat first.
  pause
  exit /b 1
)

if not exist "prisma\dev.db" (
  echo [ERROR] Database not found yet. Run setup-and-run.bat first, then run this.
  pause
  exit /b 1
)

call npx tsx prisma/update-roster.ts
if errorlevel 1 (
  echo.
  echo [ERROR] The update failed. Scroll up for the error message.
  pause
  exit /b 1
)

echo.
echo Done. Refresh the site in your browser to see the new roster.
echo (If the dev server is running, it will pick this up automatically.)
pause
