@echo off
REM ============================================================================
REM AsistControl / Presenxa — Notificación Previa EOD
REM Ejecuta el job de Notificación para alertar a los administradores 10m antes
REM ============================================================================

set API_URL=%APP_URL%
if "%API_URL%"=="" set API_URL=http://localhost:3000

set SECRET=%CRON_SECRET%
if "%SECRET%"=="" set SECRET=dev-cron-secret

echo [NOTIFY-EOD] Enviando notificaciones previas a EOD en %API_URL%/api/jobs/notify-eod ...

curl -s -X POST "%API_URL%/api/jobs/notify-eod" ^
     -H "Content-Type: application/json" ^
     -H "x-cron-secret: %SECRET%"

echo.
exit /b %ERRORLEVEL%
