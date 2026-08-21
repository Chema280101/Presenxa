@echo off
REM ============================================================================
REM AsistControl / Presenxa — Monitoreo de Tardanzas
REM Ejecuta el job para detectar usuarios sin entrada que superaron la tolerancia
REM ============================================================================

set API_URL=%APP_URL%
if "%API_URL%"=="" set API_URL=http://localhost:3000

set SECRET=%CRON_SECRET%
if "%SECRET%"=="" set SECRET=dev-cron-secret

echo [LATE_MONITOR] Verificando tardanzas en %API_URL%/api/jobs/check-late ...

curl -s -X POST "%API_URL%/api/jobs/check-late" ^
     -H "Content-Type: application/json" ^
     -H "x-cron-secret: %SECRET%"

echo.
exit /b %ERRORLEVEL%
