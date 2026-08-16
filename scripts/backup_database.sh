#!/bin/bash
# ============================================================================
# AsistControl — Script de Respaldo Automático de Base de Datos PostgreSQL
# ============================================================================
# Ejecuta un volcado completo de la BD comprimido en .sql.gz y elimina backups
# con más de 7 días de antigüedad.
# ============================================================================

set -e

BACKUP_DIR="$(dirname "$0")/../backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/asistencias_backup_${TIMESTAMP}.sql.gz"
CONTAINER_NAME="asistcontrol_postgres_prod"

mkdir -p "$BACKUP_DIR"

echo "========================================================"
echo " Iniciando Respaldo de Base de Datos AsistControl"
echo " Fecha/Hora: $(date)"
echo " Destino: $BACKUP_FILE"
echo "========================================================"

# Verificar si el contenedor de Docker está corriendo
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "-> Exportando desde contenedor Docker: ${CONTAINER_NAME}..."
    docker exec -t "${CONTAINER_NAME}" pg_dump -U admin -d asistencias | gzip > "$BACKUP_FILE"
else
    echo "-> Exportando mediante pg_dump local en puerto 5433..."
    PGPASSWORD=admin123 pg_dump -h localhost -p 5433 -U admin -d asistencias | gzip > "$BACKUP_FILE"
fi

FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ [OK] Respaldo completado exitosamente: $BACKUP_FILE ($FILE_SIZE)"

# Rotación de copias de seguridad: Eliminar backups con más de 7 días
echo "-> Limpiando respaldos antiguos (> 7 días)..."
find "$BACKUP_DIR" -type f -name "asistencias_backup_*.sql.gz" -mtime +7 -exec rm -f {} \;
echo "✅ [OK] Rotación de copias finalizada."
