"""
Cron job para procesar el estado de asistencias al final del día laboral (EOD - End Of Day).
Se puede ejecutar independientemente por CLI, mediante el Scheduler interno de FastAPI o vía API.

Ejecutar manualmente:
    python packages/geo-worker/app/jobs/daily_closer.py
    python packages/geo-worker/app/jobs/daily_closer.py 2026-08-15
"""
import asyncio
import os
import re
import sys
from datetime import date, datetime
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
    """Extrae el número de filas afectadas de un string 'UPDATE 5' o 'INSERT 0 2'."""
    if not result_str:
        return 0
    match = re.search(r"\d+$", result_str.strip())
    return int(match.group(0)) if match else 0


try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo  # type: ignore

_TZ_NAME = os.getenv("GEO_WORKER_TIMEZONE", "America/Lima")
try:
    LOCAL_TZ = ZoneInfo(_TZ_NAME)
except Exception:
    LOCAL_TZ = ZoneInfo("America/Lima")


async def close_day(target_date: Optional[date] = None, external_db: Optional[Database] = None) -> Dict[str, Any]:
    """
    Procesa todos los registros de asistencia del día laboral especificado:
    1. PENDIENTE sin entrada -> AUSENTE
    2. Entrada sin salida -> INCOMPLETO
    3. Entrada + Salida con horario asignado -> Calcula lateMinutes, workedMinutes y clasifica TARDE o PRESENTE.
    4. Entrada + Salida sin horario directo -> Calcula workedMinutes y mantiene PRESENTE.
    """
    db_to_use = external_db or default_db
    is_internal_connection = False

    if not db_to_use.is_connected:
        await db_to_use.connect()
        is_internal_connection = True

    today = target_date or datetime.now(LOCAL_TZ).date()
    print(f"[CRON EOD] Iniciando cierre de dia para la fecha: {today}")

    stats = {
        "success": True,
        "date": str(today),
        "ausentes": 0,
        "incompletos": 0,
        "tardes_presentes": 0,
        "minutos_calculados": 0,
        "timestamp": datetime.now().isoformat(),
    }

    try:
        # 1. Marcar AUSENTE: usuarios con registro PENDIENTE que nunca registraron entrada
        res_ausente = await db_to_use.execute(
            """
            UPDATE attendances
            SET status = 'AUSENTE'::"AttendanceStatus",
                "statusChangedAt" = NOW(),
                "statusChangedBy" = 'CRON_EOD'
            WHERE date = $1
              AND "entryTime" IS NULL
              AND status = 'PENDIENTE'::"AttendanceStatus"
            """,
            today,
        )
        stats["ausentes"] = _parse_row_count(res_ausente)
        print(f"   [EOD] [AUSENTES] Registros marcados como AUSENTE: {stats['ausentes']}")

        # 2. Marcar INCOMPLETO: usuarios que registraron entrada pero no salida al cierre
        # (excluyendo estados ya determinados como ABANDONO_PUESTO, JUSTIFICADO, PERMISO)
        res_incompleto = await db_to_use.execute(
            """
            UPDATE attendances
            SET status = 'INCOMPLETO'::"AttendanceStatus",
                "statusChangedAt" = NOW(),
                "statusChangedBy" = 'CRON_EOD'
            WHERE date = $1
              AND "entryTime" IS NOT NULL
              AND "exitTime" IS NULL
              AND status NOT IN (
                  'ABANDONO_PUESTO'::"AttendanceStatus",
                  'JUSTIFICADO'::"AttendanceStatus",
                  'PERMISO'::"AttendanceStatus"
              )
            """,
            today,
        )
        stats["incompletos"] = _parse_row_count(res_incompleto)
        print(f"   [EOD] [INCOMPLETOS] Registros marcados como INCOMPLETO: {stats['incompletos']}")

        # 3. Procesar asistencias con entrada y salida con horario asignado:
        # Recalcula lateMinutes y status (fuente de verdad definitiva del EOD).
        # workedMinutes: usa COALESCE para respetar el valor ya calculado por el kiosk —
        # solo se rellena si todavía es NULL.
        res_tarde = await db_to_use.execute(
            """
            UPDATE attendances a
            SET "lateMinutes" = GREATEST(0,
                    ROUND(
                        (EXTRACT(EPOCH FROM (a."entryTime"::time - MAKE_TIME(s."entryHour", s."entryMinute", 0))) / 60)
                        - s."toleranceMinutes"
                    )::int
                ),
                status = CASE
                    WHEN (EXTRACT(EPOCH FROM (a."entryTime"::time - MAKE_TIME(s."entryHour", s."entryMinute", 0))) / 60) > s."toleranceMinutes"
                    THEN 'TARDE'::"AttendanceStatus"
                    ELSE 'PRESENTE'::"AttendanceStatus"
                END,
                "workedMinutes" = COALESCE(
                    a."workedMinutes",
                    GREATEST(0, ROUND(EXTRACT(EPOCH FROM (a."exitTime" - a."entryTime")) / 60)::int)
                ),
                "statusChangedAt" = NOW(),
                "statusChangedBy" = 'CRON_EOD'
            FROM user_schedules us
            JOIN schedules s ON us."scheduleId" = s.id
            WHERE a."userId" = us."userId"
              AND a.date = $1
              AND a."entryTime" IS NOT NULL
              AND a."exitTime" IS NOT NULL
              AND a.status IN ('PENDIENTE'::"AttendanceStatus", 'PRESENTE'::"AttendanceStatus", 'TARDE'::"AttendanceStatus")
              AND (us."validUntil" IS NULL OR us."validUntil" > NOW())
            """,
            today,
        )
        stats["tardes_presentes"] = _parse_row_count(res_tarde)
        print(f"   [EOD] [COMPLETADOS] Asistencias completadas (con horario vinculado): {stats['tardes_presentes']}")

        # 4. Procesar asistencias completas que no tengan horario asignado (calcular solo workedMinutes)
        res_general = await db_to_use.execute(
            """
            UPDATE attendances
            SET "workedMinutes" = GREATEST(0,
                    ROUND(EXTRACT(EPOCH FROM ("exitTime" - "entryTime")) / 60)::int
                ),
                status = CASE
                    WHEN status = 'PENDIENTE'::"AttendanceStatus" THEN 'PRESENTE'::"AttendanceStatus"
                    ELSE status
                END,
                "statusChangedAt" = NOW(),
                "statusChangedBy" = 'CRON_EOD'
            WHERE date = $1
              AND "entryTime" IS NOT NULL
              AND "exitTime" IS NOT NULL
              AND "workedMinutes" IS NULL
            """,
            today,
        )
        stats["minutos_calculados"] = _parse_row_count(res_general)
        print(f"   [EOD] [MINUTOS] Asistencias generales con minutos calculados: {stats['minutos_calculados']}")

        print(f"[CRON EOD] [OK] Cierre de dia para {today} finalizado con exito.\n")
        return stats

    except Exception as e:
        print(f"[CRON EOD] [ERROR] Error durante el cierre de dia: {e}")
        stats["success"] = False
        stats["error"] = str(e)
        return stats

    finally:
        if is_internal_connection:
            await db_to_use.disconnect()


if __name__ == "__main__":
    target = None
    if len(sys.argv) > 1:
        try:
            target = date.fromisoformat(sys.argv[1])
        except ValueError:
            print(f"Formato de fecha invalido: {sys.argv[1]}. Use YYYY-MM-DD.")
            sys.exit(1)

    asyncio.run(close_day(target))
