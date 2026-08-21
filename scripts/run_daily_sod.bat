@echo off
REM ============================================================================
REM AsistControl / Presenxa — Apertura Automática de Jornada (SOD)
REM Ejecuta el job de Apertura para generar asistencias PENDIENTE del día
REM ============================================================================

set API_URL=%APP_URL%
if "%API_URL%"=="" set API_URL=http://localhost:3000

set SECRET=%CRON_SECRET%
if "%SECRET%"=="" set SECRET=dev-cron-secret

echo [SOD] Ejecutando apertura de jornada en %API_URL%/api/jobs/daily-start ...

curl -s -X POST "%API_URL%/api/jobs/daily-start" ^
     -H "Content-Type: application/json" ^
     -H "x-cron-secret: %SECRET%"

echo.
exit /b %ERRORLEVEL%
