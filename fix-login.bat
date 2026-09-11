@echo off
setlocal

echo ============================================
echo  Nirbana United EFC -- Fix Admin Login
echo ============================================
echo.
echo This repairs a broken SESSION_SECRET in your .env file, which is the
echo most common reason admin login silently fails even with the right
echo email and password.
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found on this computer.
  pause
  exit /b 1
)

node scripts\ensure-env.js
if errorlevel 1 (
  echo.
  echo [ERROR] Something went wrong. Scroll up for the error message.
  pause
  exit /b 1
)

echo.
echo ============================================
echo  Fixed. Now restart the site:
echo  1. Close the window that's running "npm run dev" (Ctrl+C in it, or just close it)
echo  2. Double-click setup-and-run.bat again
echo  3. Log in at http://localhost:3000/en/admin/login
echo     admin@nirbanaunited.club / ChangeMe123!  (unless you changed it in .env)
echo ============================================
pause
