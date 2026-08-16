"""
Job de Monitoreo de Tardanzas y Ausencias Matutinas (Late Arrival Monitor).
Escanea asistencias del día actual que permanezcan en 'PENDIENTE' sin marcar entrada
después de transcurridos 30 minutos de su hora de inicio programada (+ tolerancia),
generando alertas en la base de datos y despachando notificaciones push a los supervisores.

Ejecutar manualmente:
    python packages/geo-worker/app/jobs/late_monitor.py
"""
import asyncio
import os
import sys
import json
from datetime import date, datetime, time
from pathlib import Path
from typing import Optional, Dict, Any, List
import urllib.request
import urllib.error
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
    from app.redis_client import RedisClient, redis_client as default_redis
except ImportError:
    from database import Database, db as default_db
    from redis_client import RedisClient, redis_client as default_redis


async def check_late_arrivals(
    target_date: Optional[date] = None,
    threshold_minutes: int = 30,
    external_db: Optional[Database] = None,
    external_redis: Optional[RedisClient] = None,
) -> Dict[str, Any]:
    """
    Identifica colaboradores que no han marcado entrada tras `threshold_minutes`
    pasados del inicio de su turno laboral + tolerancia.
    """
    db_to_use = external_db or default_db
    redis_to_use = external_redis or default_redis

    is_internal_db = False
    is_internal_redis = False

    if not db_to_use.is_connected:
        await db_to_use.connect()
        is_internal_db = True

    if not redis_to_use.is_connected:
        await redis_to_use.connect()
        is_internal_redis = True

    today = target_date or date.today()
    now = datetime.now()
    current_time_str = now.strftime("%H:%M:%S")

    print(f"[CRON LATE-MONITOR] Escaneando tardanzas criticas para {today} a las {current_time_str}")

    stats = {
        "success": True,
        "date": str(today),
        "currentTime": current_time_str,
        "thresholdMinutes": threshold_minutes,
        "unmarkedCount": 0,
        "alertsCreated": 0,
        "supervisorsNotified": 0,
        "timestamp": now.isoformat(),
        "alerts": [],
    }

    try:
        # 1. Buscar asistencias PENDIENTE sin entrada de usuarios con horario definido
        # donde la hora actual supera: entryHour:entryMinute + toleranceMinutes + thresholdMinutes
        query = """
            SELECT
                a.id AS "attendanceId",
                a.date,
                u.id AS "userId",
                u."firstName",
                u."lastName",
                u.email,
                u."organizationId",
                u."locationId",
                l.name AS "locationName",
                s.name AS "scheduleName",
                s."entryHour",
                s."entryMinute",
                s."toleranceMinutes",
                MAKE_TIME(s."entryHour", s."entryMinute", 0) AS "expectedEntryTime",
                ROUND(
                    (EXTRACT(EPOCH FROM (NOW()::time - MAKE_TIME(s."entryHour", s."entryMinute", 0))) / 60)
                )::int AS "minutesSinceStart"
            FROM attendances a
            JOIN users u ON a."userId" = u.id
            LEFT JOIN locations l ON a."locationId" = l.id
            JOIN user_schedules us ON u.id = us."userId" AND (us."validUntil" IS NULL OR us."validUntil" > NOW())
            JOIN schedules s ON us."scheduleId" = s.id
            WHERE a.date = $1
              AND a."entryTime" IS NULL
              AND a.status = 'PENDIENTE'::"AttendanceStatus"
              AND u."isActive" = true
              AND NOW()::time > (
                  MAKE_TIME(s."entryHour", s."entryMinute", 0)
                  + ((s."toleranceMinutes" + $2) || ' minutes')::interval
              )
        """

        pending_late_records = await db_to_use.fetch(query, today, threshold_minutes)
        stats["unmarkedCount"] = len(pending_late_records)
        print(f"   [LATE] [SCANNED] Empleados con retraso > {threshold_minutes} min: {stats['unmarkedCount']}")

        for record in pending_late_records:
            user_id = str(record["userId"])
            org_id = str(record["organizationId"])
            full_name = f"{record['firstName']} {record['lastName']}"
            minutes_late = record["minutesSinceStart"]
            expected_str = f"{record['entryHour']:02d}:{record['entryMinute']:02d}"

            # Clave de idempotencia en Redis para no spamear más de 1 vez al día por usuario
            redis_key = f"late_alert_sent:{user_id}:{today}"
            already_notified = await redis_to_use.get(redis_key)

            if already_notified:
                continue

            # Buscar supervisores y admins de la organización para notificar
            supervisors = await db_to_use.fetch(
                """
                SELECT id, email, "firstName", "lastName"
                FROM users
                WHERE "organizationId" = $1
                  AND role IN ('ADMIN'::"UserRole", 'SUPERVISOR'::"UserRole", 'SUPER_ADMIN'::"UserRole")
                  AND "isActive" = true
                """,
                record["organizationId"],
            )

            title = f"Alerta: Retraso no registrado ({full_name})"
            body = f"{full_name} no ha registrado ingreso (Turno: {expected_str}, {minutes_late} min de retraso) en sede {record['locationName']}."

            # Crear notificación en la base de datos para cada supervisor
            for sup in supervisors:
                await db_to_use.execute(
                    """
                    INSERT INTO notifications (
                        id,
                        "userId",
                        type,
                        title,
                        body,
                        data,
                        "createdAt"
                    ) VALUES (
                        gen_random_uuid(),
                        $1,
                        'LLEGADA_TARDE'::"NotificationType",
                        $2,
                        $3,
                        $4::jsonb,
                        NOW()
                    )
                    """,
                    sup["id"],
                    title,
                    body,
                    json.dumps({
                        "attendanceId": str(record["attendanceId"]),
                        "employeeId": user_id,
                        "employeeName": full_name,
                        "locationName": record["locationName"],
                        "minutesLate": minutes_late,
                        "expectedEntry": expected_str,
                    }),
                )
                stats["alertsCreated"] += 1

            # Despachar Web Push a supervisores mediante la API interna de Next.js
            try:
                push_url = os.getenv("WEB_API_URL", "http://localhost:3002") + "/api/notifications/send"
                secret = os.getenv("GEO_WORKER_SECRET", "dev-worker-secret")
                req_data = json.dumps({
                    "organizationId": org_id,
                    "notifySupervisors": True,
                    "type": "LLEGADA_TARDE",
                    "title": title,
                    "body": body,
                    "url": "/asistencias",
                    "data": {
                        "employeeId": user_id,
                        "attendanceId": str(record["attendanceId"]),
                    }
                }).encode("utf-8")

                req = urllib.request.Request(
                    push_url,
                    data=req_data,
                    headers={
                        "Content-Type": "application/json",
                        "x-worker-secret": secret,
                    },
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=3) as resp:
                    if resp.status == 200:
                        stats["supervisorsNotified"] += len(supervisors)
            except Exception as push_err:
                print(f"   [LATE] [WARN] No se pudo enviar push a supervisores: {push_err}")

            # Guardar en Redis con TTL de 24 horas
            await redis_to_use.set(redis_key, "1", ex=86400)
            stats["alerts"].append({
                "userId": user_id,
                "name": full_name,
                "minutesLate": minutes_late,
                "expectedEntry": expected_str,
            })
            print(f"   [LATE] [ALERT] Alerta despachada para {full_name} ({minutes_late} min de retraso)")

        print(f"[CRON LATE-MONITOR] [OK] Escaneo finalizado. Alertas creadas: {stats['alertsCreated']}\n")
        return stats

    except Exception as e:
        print(f"[CRON LATE-MONITOR] [ERROR] Error en escaneo de tardanzas: {e}")
        stats["success"] = False
        stats["error"] = str(e)
        return stats

    finally:
        if is_internal_db:
            await db_to_use.disconnect()
        if is_internal_redis:
            await redis_to_use.disconnect()


if __name__ == "__main__":
    asyncio.run(check_late_arrivals())
