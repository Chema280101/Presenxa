@echo off
REM ============================================================================
REM AsistControl — Monitor de Tardanzas y Ausencias
REM Ejecuta el job late_monitor.py y despacha notificaciones push
REM ============================================================================

cd /d "%~dp0\..\packages\geo-worker"

IF EXIST ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" -m app.jobs.late_monitor
) ELSE (
    python -m app.jobs.late_monitor
)

exit /b %ERRORLEVEL%
