@echo off
REM ============================================================================
REM AsistControl — Cierre Automático de Día (EOD)
REM Ejecuta el job daily_closer.py usando el entorno virtual de Python
REM ============================================================================

cd /d "%~dp0\..\packages\geo-worker"

IF EXIST ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" -m app.jobs.daily_closer
) ELSE (
    python -m app.jobs.daily_closer
)

REM Exit code
exit /b %ERRORLEVEL%
