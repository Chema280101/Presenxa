# ============================================================================
# AsistControl — Script de Respaldo Automático de Base de Datos en Windows
# ============================================================================

$ErrorActionPreference = "Stop"

$RootDir = (Get-Item $PSScriptRoot).Parent.FullName
$BackupDir = Join-Path $RootDir "backups"
$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$BackupFile = Join-Path $BackupDir "asistencias_backup_${Timestamp}.sql"
$GzBackupFile = "${BackupFile}.gz"

if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Iniciando Respaldo de Base de Datos AsistControl" -ForegroundColor Cyan
Write-Host " Destino: $GzBackupFile" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$ContainerName = "asistencias_postgres"

# Verificar si Docker está corriendo
$DockerRunning = docker ps --format '{{.Names}}' 2>$null | Select-String $ContainerName

if ($DockerRunning) {
    Write-Host "-> Exportando desde contenedor Docker: $ContainerName..." -ForegroundColor Yellow
    docker exec $ContainerName pg_dump -U admin -d asistencias > $BackupFile
} else {
    Write-Host "-> Exportando mediante conexión local a PostgreSQL..." -ForegroundColor Yellow
    $env:PGPASSWORD = "admin123"
    pg_dump -h localhost -p 5433 -U admin -d asistencias > $BackupFile
}

if (Test-Path $BackupFile) {
    $FileSize = (Get-Item $BackupFile).Length / 1MB
    Write-Host ("`n[OK] Respaldo generado: {0} ({1:N2} MB)" -f $BackupFile, $FileSize) -ForegroundColor Green

    # Rotación: Eliminar respaldos de más de 7 días
    Write-Host "-> Limpiando respaldos con más de 7 días..." -ForegroundColor Gray
    Get-ChildItem -Path $BackupDir -Filter "asistencias_backup_*.sql*" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | Remove-Item -Force
    Write-Host "[OK] Rotación de copias completada." -ForegroundColor Green
} else {
    Write-Host "[ERROR] No se pudo generar el archivo de respaldo." -ForegroundColor Red
}
