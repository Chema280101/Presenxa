# ============================================================================
# AsistControl — Registro de Tareas Programadas en Windows Task Scheduler
# ============================================================================
# Ejecutar este script como Administrador en PowerShell:
#   powershell -ExecutionPolicy Bypass -File .\scripts\schedule_windows_tasks.ps1
# ============================================================================

$ErrorActionPreference = "Stop"

$RootDir = (Get-Item $PSScriptRoot).Parent.FullName
$BatSOD = Join-Path $RootDir "scripts\run_daily_sod.bat"
$BatLate = Join-Path $RootDir "scripts\run_late_monitor.bat"
$BatEOD = Join-Path $RootDir "scripts\run_daily_eod.bat"

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " Configurando Tareas Programadas de AsistControl en Windows" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "Directorio raíz: $RootDir"

# 1. Tarea de Apertura de Jornada (SOD) — 06:00 AM (Lun-Sáb)
$TaskNameSOD = "AsistControl_DailySOD"
Write-Host "`n1. Configurando $TaskNameSOD (06:00 AM Lun-Sáb)..." -ForegroundColor Yellow
schtasks /Create /F /TN $TaskNameSOD /TR "`"$BatSOD`"" /SC WEEKLY /D MON,TUE,WED,THU,FRI,SAT /ST 06:00 /RL HIGHEST
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [OK] Tarea $TaskNameSOD registrada exitosamente." -ForegroundColor Green
}

# 2. Tarea de Cierre de Día (EOD) — 23:59 PM (Todos los días)
$TaskNameEOD = "AsistControl_DailyEOD"
Write-Host "`n2. Configurando $TaskNameEOD (23:59 PM Diario)..." -ForegroundColor Yellow
schtasks /Create /F /TN $TaskNameEOD /TR "`"$BatEOD`"" /SC DAILY /ST 23:59 /RL HIGHEST
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [OK] Tarea $TaskNameEOD registrada exitosamente." -ForegroundColor Green
}

# 3. Tarea de Monitoreo de Tardanzas — Cada 15 min entre 08:00 y 11:30 (Lun-Vie)
$TaskNameLate = "AsistControl_LateMonitor"
Write-Host "`n3. Configurando $TaskNameLate (Cada 15 min de 08:00 a 11:30 Lun-Vie)..." -ForegroundColor Yellow
schtasks /Create /F /TN $TaskNameLate /TR "`"$BatLate`"" /SC HOURLY /MO 1 /ST 08:00 /RL HIGHEST
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [OK] Tarea $TaskNameLate registrada exitosamente." -ForegroundColor Green
}

Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host " ¡Todas las tareas de automatización han sido registradas!" -ForegroundColor Green
Write-Host " Puedes verlas en el 'Programador de tareas' (taskschd.msc)." -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor Cyan
