@echo off
setlocal enabledelayedexpansion

REM ============================================================================
REM  Update your Netlify (production) database's TABLES ONLY, after a code
REM  update adds a new table/field (like the Player Highlights and Match
REM  Report features).
REM
REM  This is SAFE to run any time an update needs it:
REM    - It only ADDS what's missing (new tables/columns) — it never deletes
REM      or changes your existing players, matches, news, gallery, or admin
REM      login on the live site.
REM    - Unlike scripts\setup-netlify-database.bat (the ONE-TIME initial
REM      setup script), this does NOT touch your admin login at all — it
REM      will never ask you for a new admin email/password, and your
REM      current live-site password keeps working exactly as it does today.
REM
REM  You will need your Netlify Database connection string — the same one
REM  from when you first set up the live site (Netlify dashboard: Project ->
REM  Database -> Connection string). If you saved it in
REM  PROJECT-CREDENTIALS.md on this PC, you can copy it from there.
REM ============================================================================

cd /d "%~dp0.."

echo.
echo  ================================================================
echo   Nirbana United EFC — Update production database tables
echo  ================================================================
echo.
echo  This only updates the LIVE site's database structure. It will NOT
echo  change your admin login, and it will NOT touch any existing players,
echo  matches, news, or photos on the live site.
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
echo  Updating tables in your production database...
echo  ----------------------------------------------------------------
set "DATABASE_URL=%PROD_DATABASE_URL%"
call npx prisma db push --schema=./prisma/schema.production.prisma
if errorlevel 1 (
  echo.
  echo  Something went wrong updating the tables. Nothing further was run.
  echo  Double-check the connection string and your internet connection.
  pause
  exit /b 1
)

echo.
echo  ----------------------------------------------------------------
echo  Restoring your LOCAL dev database connection...
echo  ----------------------------------------------------------------
REM  `prisma db push` above regenerated the shared Prisma client against the
REM  PRODUCTION (Postgres) schema. Your local `npm run dev` needs it
REM  regenerated back against the LOCAL (SQLite) schema, or local
REM  development will break. This is why this script must always be run to
REM  completion rather than closed partway through.
call npx prisma generate --schema=./prisma/schema.prisma

echo.
echo  ================================================================
echo   Done! Your live site's database is up to date.
echo  ================================================================
echo.
echo  Your admin login was not touched — keep using the same email and
echo  password as before. Next: push your code changes to GitHub (or
echo  redeploy) so the live site's code matches its updated database.
echo.
pause
