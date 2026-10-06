@echo off
REM ============================================================================
REM AsistControl / Presenxa — Notificación Previa SOD
REM Ejecuta el job de Notificación para alertar a los administradores 10m antes
REM ============================================================================

set API_URL=%APP_URL%
if "%API_URL%"=="" set API_URL=http://localhost:3000

set SECRET=%CRON_SECRET%
if "%SECRET%"=="" set SECRET=dev-cron-secret

echo [NOTIFY-SOD] Enviando notificaciones previas a SOD en %API_URL%/api/jobs/notify-sod ...

curl -s -X POST "%API_URL%/api/jobs/notify-sod" ^
     -H "Content-Type: application/json" ^
     -H "x-cron-secret: %SECRET%"

echo.
exit /b %ERRORLEVEL%
