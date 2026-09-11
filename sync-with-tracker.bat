@echo off
setlocal

echo ============================================
echo  Nirbana United EFC -- Sync With Tracker
echo ============================================
echo.
echo This pulls the latest data straight from the club's public tracker page
echo (cobegbd.com) -- matches, squad stats, transfers, and rankings -- and
echo updates this website to match.
echo.
echo It double-checks the tracker's own numbers against each other first.
echo If anything doesn't add up (which usually just means the tracker's page
echo layout changed), it stops and changes NOTHING, so your data is never
echo overwritten with something wrong.
echo.
echo Player photos, positions, join dates, and favorite players you set in
echo /admin are kept. News, gallery, and the league standings table are not
echo touched by this script.
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

echo Making sure the database has the latest tables (safe to run every time,
echo only ever adds -- never deletes -- anything)...
call npx prisma db push
if errorlevel 1 (
  echo.
  echo [ERROR] Could not update the database structure. Scroll up for details.
  pause
  exit /b 1
)
echo.

call npx tsx prisma/sync-from-tracker.ts
if errorlevel 1 (
  echo.
  echo [ERROR] The sync did not complete. Scroll up for details.
  echo Nothing was changed if the tracker's numbers didn't cross-check.
  pause
  exit /b 1
)

echo.
echo Done. Refresh the site in your browser to see the update.
echo (If the dev server is running, it will pick this up automatically.)
pause
