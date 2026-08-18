"""
Job de Inicio de Jornada (SOD - Start Of Day).
Genera registros de asistencia con estado 'PENDIENTE' para todos los empleados/alumnos activos
que tengan jornada laboral programada para el día actual.

Se puede ejecutar manualmente por CLI, mediante el Scheduler o vía API.

Ejecutar manualmente:
    python packages/geo-worker/app/jobs/daily_starter.py
    python packages/geo-worker/app/jobs/daily_starter.py 2026-08-15
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
    """Extrae el número de filas afectadas de un string 'INSERT 0 3'."""
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


async def start_day(target_date: Optional[date] = None, external_db: Optional[Database] = None) -> Dict[str, Any]:
    """
    Genera registros de asistencia PENDIENTE para todos los usuarios activos
    según su sede y calendario laboral (workdaysMask).
    """
    db_to_use = external_db or default_db
    is_internal_connection = False

    if not db_to_use.is_connected:
        await db_to_use.connect()
        is_internal_connection = True

    today = target_date or datetime.now(LOCAL_TZ).date()
    # En Python: Monday=0, Tuesday=1, ... Sunday=6
    # Bitmask: Lun=1, Mar=2, Mié=4, Jue=8, Vie=16, Sáb=32, Dom=64
    day_bit = 1 << today.weekday()
    day_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    day_name = day_names[today.weekday()]

    print(f"[CRON SOD] Iniciando apertura de jornada para {today} ({day_name}, bitmask={day_bit})")

    stats = {
        "success": True,
        "date": str(today),
        "dayName": day_name,
        "created": 0,
        "totalEligible": 0,
        "timestamp": datetime.now().isoformat(),
    }

    try:
        # 1. Contar usuarios elegibles para el día de hoy
        eligible_users = await db_to_use.fetch(
            """
            SELECT u.id, u."firstName", u."lastName", u."locationId"
            FROM users u
            LEFT JOIN user_schedules us ON u.id = us."userId" AND (us."validUntil" IS NULL OR us."validUntil" > NOW())
            LEFT JOIN schedules s ON us."scheduleId" = s.id
            WHERE u."isActive" = true
              AND u.role IN ('EMPLEADO'::"UserRole", 'ALUMNO'::"UserRole")
              AND u."locationId" IS NOT NULL
              AND (
                  s.id IS NULL -- Si no tiene horario específico, se incluye por defecto
                  OR (s."workdaysMask" & $1) > 0 -- O si su horario incluye el día de hoy
              )
            """,
            day_bit,
        )

        stats["totalEligible"] = len(eligible_users)
        print(f"   [SOD] [USERS] Usuarios elegibles para jornada hoy: {stats['totalEligible']}")

        # 2. Insertar registros PENDIENTE de forma masiva (evitando duplicados con ON CONFLICT)
        insert_query = """
            INSERT INTO attendances (
                id,
                "userId",
                "locationId",
                date,
                status,
                "statusChangedBy",
                "statusChangedAt",
                "createdAt",
                "updatedAt"
            )
            SELECT
                gen_random_uuid(),
                u.id,
                u."locationId",
                $1::date,
                'PENDIENTE'::"AttendanceStatus",
                'CRON_SOD',
                NOW(),
                NOW(),
                NOW()
            FROM users u
            LEFT JOIN user_schedules us ON u.id = us."userId" AND (us."validUntil" IS NULL OR us."validUntil" > NOW())
            LEFT JOIN schedules s ON us."scheduleId" = s.id
            WHERE u."isActive" = true
              AND u.role IN ('EMPLEADO'::"UserRole", 'ALUMNO'::"UserRole")
              AND u."locationId" IS NOT NULL
              AND (
                  s.id IS NULL
                  OR (s."workdaysMask" & $2) > 0
              )
            ON CONFLICT ("userId", date) DO NOTHING;
        """

        res_insert = await db_to_use.execute(insert_query, today, day_bit)
        stats["created"] = _parse_row_count(res_insert)
        print(f"   [SOD] [OK] Nuevos registros PENDIENTE creados: {stats['created']}")
        print(f"[CRON SOD] [OK] Apertura de jornada para {today} completada con éxito.\n")
        return stats

    except Exception as e:
        print(f"[CRON SOD] [ERROR] Error en apertura de jornada: {e}")
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
            print(f"Formato de fecha inválido: {sys.argv[1]}. Use YYYY-MM-DD.")
            sys.exit(1)

    asyncio.run(start_day(target))
