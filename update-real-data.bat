@echo off
setlocal

echo ============================================
echo  Nirbana United EFC -- Update Real Club Data
echo ============================================
echo.
echo This applies real club info, match results, and fixtures pulled from
echo cobegbd.com to your existing database. Players and gallery images are
echo left untouched.
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

call npx tsx prisma/update-real-data.ts
if errorlevel 1 (
  echo.
  echo [ERROR] The update failed. Scroll up for the error message.
  pause
  exit /b 1
)

echo.
echo Done. Refresh the site in your browser to see the changes.
echo (If the dev server is running, it will pick this up automatically.)
pause
