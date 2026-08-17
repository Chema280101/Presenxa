"""
Job para depuración y retención de historial GPS (geo_pings).
Elimina los registros de geo_pings con más de N días de antigüedad (por defecto: 45 días)
para mantener la base de datos dentro de los límites de almacenamiento (ej. 500 MB de Supabase Free).
La información resumida de asistencias (tabla 'attendances') NUNCA se borra.

Ejecución manual:
    python packages/geo-worker/app/jobs/cleanup_pings.py
    python packages/geo-worker/app/jobs/cleanup_pings.py 45
"""
import asyncio
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any
from dotenv import load_dotenv

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Cargar .env de geo-worker
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Agregar raíz del paquete al sys.path
pkg_root = Path(__file__).resolve().parent.parent
if str(pkg_root) not in sys.path:
    sys.path.insert(0, str(pkg_root))

try:
    from app.database import Database, db as default_db
except ImportError:
    from database import Database, db as default_db


def _parse_row_count(result_str: str) -> int:
    """Extrae el número de filas afectadas de un string 'DELETE 15'."""
    if not result_str:
        return 0
    match = re.search(r"\d+$", result_str.strip())
    return int(match.group(0)) if match else 0


async def purge_old_geo_pings(
    retention_days: Optional[int] = None,
    external_db: Optional[Database] = None,
) -> Dict[str, Any]:
    """
    Elimina registros de la tabla 'geo_pings' con más de `retention_days` de antigüedad.
    Por defecto toma el valor de la variable de entorno GEO_PING_RETENTION_DAYS o 45 días.
    """
    start_time = time.time()
    
    if retention_days is None:
        try:
            retention_days = int(os.getenv("GEO_PING_RETENTION_DAYS", "45"))
        except ValueError:
            retention_days = 45

    if retention_days < 1:
        raise ValueError("retention_days debe ser al menos 1 día")

    db_to_use = external_db or default_db
    is_internal_connection = False

    if not db_to_use.is_connected:
        await db_to_use.connect()
        is_internal_connection = True

    try:
        print(f"\n[CLEANUP] 🧹 Iniciando depuración de GPS pings con antigüedad > {retention_days} días...")

        # 1. Contar pings candidatos a eliminación antes de borrar
        count_row = await db_to_use.fetchrow(
            """
            SELECT COUNT(*) AS total_to_delete
            FROM geo_pings
            WHERE timestamp < NOW() - ($1 || ' days')::interval
            """,
            str(retention_days),
        )
        total_candidates = int(count_row["total_to_delete"]) if count_row else 0

        # 2. Ejecutar la eliminación por lotes/directa
        delete_result = await db_to_use.execute(
            """
            DELETE FROM geo_pings
            WHERE timestamp < NOW() - ($1 || ' days')::interval
            """,
            str(retention_days),
        )
        deleted_count = _parse_row_count(delete_result)

        # 3. Contar pings restantes en la tabla
        remaining_row = await db_to_use.fetchrow("SELECT COUNT(*) AS total_remaining FROM geo_pings")
        total_remaining = int(remaining_row["total_remaining"]) if remaining_row else 0

        elapsed_sec = round(time.time() - start_time, 3)

        print(f"[CLEANUP] ✅ Depuración completada: {deleted_count} pings eliminados en {elapsed_sec}s.")
        print(f"[CLEANUP] 📊 Pings históricos restantes en base de datos: {total_remaining}")

        return {
            "status": "success",
            "retentionDays": retention_days,
            "deletedCount": deleted_count,
            "remainingCount": total_remaining,
            "elapsedSeconds": elapsed_sec,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        print(f"[CLEANUP] ❌ Error durante la depuración de geo_pings: {e}")
        return {
            "status": "error",
            "retentionDays": retention_days,
            "error": str(e),
            "elapsedSeconds": round(time.time() - start_time, 3),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    finally:
        if is_internal_connection and db_to_use.is_connected:
            await db_to_use.disconnect()


if __name__ == "__main__":
    days_arg = 45
    if len(sys.argv) > 1:
        try:
            days_arg = int(sys.argv[1])
        except ValueError:
            print(f"⚠️ Argumento '{sys.argv[1]}' no es un número válido. Usando 45 días por defecto.")

    result = asyncio.run(purge_old_geo_pings(retention_days=days_arg))
    print("\nResultado JSON:")
    print(result)
