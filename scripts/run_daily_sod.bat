@echo off
REM ============================================================================
REM AsistControl — Apertura Automática de Jornada (SOD)
REM Ejecuta el job daily_starter.py para generar asistencias PENDIENTE
REM ============================================================================

cd /d "%~dp0\..\packages\geo-worker"

IF EXIST ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" -m app.jobs.daily_starter
) ELSE (
    python -m app.jobs.daily_starter
)

exit /b %ERRORLEVEL%
