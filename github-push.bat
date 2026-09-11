@echo off
setlocal enabledelayedexpansion

echo ============================================
echo  Nirbana United EFC -- Push to GitHub
echo ============================================
echo.
echo Double-click this any time you want GitHub to catch up with the
echo current state of this project. It's safe to run any time, including
echo when nothing has changed (it'll just say so and stop).
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git was not found on this computer.
  echo.
  echo Install it from https://git-scm.com/download/win using the default
  echo options, then double-click this file again.
  pause
  exit /b 1
)

if not exist ".git" (
  echo This project isn't connected to Git yet -- setting that up now.
  echo.
  git init
  git branch -M main
)

git remote get-url origin >nul 2>nul
if errorlevel 1 (
  echo.
  echo This project isn't linked to a GitHub repository yet.
  echo.
  echo 1. Go to https://github.com/new in your browser.
  echo 2. Give it a name ^(e.g. nirbana-united-efc^), leave "Initialize with
  echo    a README" UNCHECKED, and click "Create repository".
  echo 3. On the next page, copy the URL that looks like
  echo    https://github.com/your-username/nirbana-united-efc.git
  echo.
  set /p REPO_URL="Paste that URL here and press Enter: "
  if "!REPO_URL!"=="" (
    echo [ERROR] No URL entered. Run this again when you're ready.
    pause
    exit /b 1
  )
  git remote add origin "!REPO_URL!"
)

echo.
echo Staging all changes...
git add -A

git diff --cached --quiet
if not errorlevel 1 (
  echo.
  echo Nothing has changed since your last push -- GitHub is already
  echo up to date.
  pause
  exit /b 0
)

for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set TODAY=%%a-%%b-%%c
set COMMIT_MSG=Update %TODAY% %time%

echo.
echo Committing...
git commit -m "!COMMIT_MSG!"
if errorlevel 1 (
  echo [ERROR] Commit failed. Scroll up for the error message.
  pause
  exit /b 1
)

echo.
echo Pushing to GitHub... a browser window may open asking you to sign in
echo the first time -- sign in there and this will continue automatically.
git push -u origin main
if errorlevel 1 (
  echo.
  echo [ERROR] Push failed. Scroll up for the error message -- if it
  echo mentions authentication, make sure you finished signing in in the
  echo browser window that opened.
  pause
  exit /b 1
)

echo.
echo ============================================
echo  Done. Your changes are now on GitHub.
echo ============================================
pause
