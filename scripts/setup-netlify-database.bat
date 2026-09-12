@echo off
setlocal enabledelayedexpansion

REM ============================================================================
REM  ONE-TIME setup for your Netlify production database.
REM
REM  Run this ONCE, after you have:
REM    1. Created a Netlify Database for this site (in the Netlify dashboard)
REM    2. Copied its Postgres connection string
REM
REM  This script creates all the tables in that empty database and creates
REM  your production admin login. It does NOT touch your local dev.db file
REM  or your local site in any way — safe to run any time.
REM ============================================================================

cd /d "%~dp0.."

echo.
echo  ================================================================
echo   Nirbana United EFC — Netlify database setup
echo  ================================================================
echo.
echo  You will need the connection string from your Netlify Database.
echo  In the Netlify dashboard: Project -^> Database -^> Connection string.
echo  It looks like: postgresql://user:password@host/dbname?sslmode=require
echo.

set /p PROD_DATABASE_URL="Paste your Netlify Database connection string and press Enter: "

if "%PROD_DATABASE_URL%"=="" (
  echo.
  echo  No connection string entered — stopping. Nothing was changed.
  pause
  exit /b 1
)

echo.
echo  ----------------------------------------------------------------
echo  Step 1 of 3: Creating tables in your production database...
echo  ----------------------------------------------------------------
set "DATABASE_URL=%PROD_DATABASE_URL%"
call npx prisma db push --schema=./prisma/schema.production.prisma
if errorlevel 1 (
  echo.
  echo  Something went wrong creating the tables. Nothing further was run.
  echo  Double-check the connection string and your internet connection.
  pause
  exit /b 1
)

echo.
echo  ----------------------------------------------------------------
echo  Step 2 of 3: Creating your production admin login...
echo  ----------------------------------------------------------------
set /p PROD_ADMIN_EMAIL="Admin email for the LIVE site [admin@nirbanaunited.club]: "
if "%PROD_ADMIN_EMAIL%"=="" set "PROD_ADMIN_EMAIL=admin@nirbanaunited.club"

set /p PROD_ADMIN_PASSWORD="Admin password for the LIVE site [ChangeMe123!]: "
if "%PROD_ADMIN_PASSWORD%"=="" set "PROD_ADMIN_PASSWORD=ChangeMe123!"

set "ADMIN_EMAIL=%PROD_ADMIN_EMAIL%"
set "ADMIN_PASSWORD=%PROD_ADMIN_PASSWORD%"
call npx tsx prisma/seed-production.ts
if errorlevel 1 (
  echo.
  echo  Something went wrong creating the admin account. See the error above.
  echo  Your tables were still created in Step 1 — you can re-run just this
  echo  script again once the issue is fixed; it's safe to run more than once.
) else (
  echo.
  echo  Admin account ready: %PROD_ADMIN_EMAIL%
  echo  IMPORTANT: change this password from the admin dashboard right after
  echo  your first login on the live site.
)

echo.
echo  ----------------------------------------------------------------
echo  Step 3 of 3: Restoring your LOCAL dev database connection...
echo  ----------------------------------------------------------------
REM  `prisma db push`/`generate` above regenerated the shared Prisma client
REM  against the PRODUCTION (Postgres) schema. Your local `npm run dev`
REM  needs it regenerated back against the LOCAL (SQLite) schema, or local
REM  development will break. This is why this script must always be run to
REM  completion rather than closed partway through.
call npx prisma generate --schema=./prisma/schema.prisma

echo.
echo  ================================================================
echo   Done! Your production database is set up.
echo  ================================================================
echo.
echo  Next: set these in your Netlify dashboard (Site settings -^>
echo  Environment variables) if you haven't already —
echo    DATABASE_URL   = the same connection string you pasted above
echo    SESSION_SECRET = the value from CREDENTIALS.md on this PC
echo    SYNC_SECRET    = the value from CREDENTIALS.md on this PC
echo  Then trigger a deploy (or push to GitHub) so the live site picks
echo  these up.
echo.
pause
