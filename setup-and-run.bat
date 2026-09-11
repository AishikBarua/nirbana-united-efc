@echo off
setlocal

echo ============================================
echo  Nirbana United EFC -- Setup ^& Run
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found on this computer.
  echo Please install Node.js 18.18+ from https://nodejs.org, then double-click this file again.
  pause
  exit /b 1
)

set FIRST_ENV_SETUP=0
if not exist ".env" set FIRST_ENV_SETUP=1

node scripts\ensure-env.js
if errorlevel 1 (
  echo.
  echo [ERROR] Could not set up .env. Scroll up for the error message.
  pause
  exit /b 1
)

if "%FIRST_ENV_SETUP%"=="1" (
  echo.
  echo Default admin login: admin@nirbanaunited.club / ChangeMe123!
  echo ^(Edit .env before going live to set your own admin email/password,
  echo   then delete the database and re-run this script to apply it.^)
  echo.
)

echo Installing dependencies -- this can take a few minutes the first time...
call node scripts\safe-npm-install.js
if errorlevel 1 (
  echo.
  echo [ERROR] npm install failed. Scroll up for the error message.
  pause
  exit /b 1
)

if not exist "prisma\dev.db" (
  echo.
  echo Setting up the database and loading sample data...
  call npx prisma db push
  call npm run db:seed
)

echo.
echo ============================================
echo  Starting the site at http://localhost:3000
echo  Admin panel: http://localhost:3000/en/admin/login
echo  Press Ctrl+C in this window to stop the server.
echo ============================================
echo.

start "" http://localhost:3000
call npm run dev

pause
