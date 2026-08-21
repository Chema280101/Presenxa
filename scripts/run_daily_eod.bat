@echo off
REM ============================================================================
REM AsistControl / Presenxa — Cierre Automático de Jornada (EOD)
REM Ejecuta el job de Cierre para procesar ausencias, incompletos y tardanzas
REM ============================================================================

set API_URL=%APP_URL%
if "%API_URL%"=="" set API_URL=http://localhost:3000

set SECRET=%CRON_SECRET%
if "%SECRET%"=="" set SECRET=dev-cron-secret

echo [EOD] Ejecutando cierre de jornada en %API_URL%/api/jobs/daily-close ...

curl -s -X POST "%API_URL%/api/jobs/daily-close" ^
     -H "Content-Type: application/json" ^
     -H "x-cron-secret: %SECRET%"

echo.
exit /b %ERRORLEVEL%
