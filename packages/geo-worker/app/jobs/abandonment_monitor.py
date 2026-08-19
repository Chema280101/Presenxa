"""
AsistControl — Monitor Proactivo de Abandono de Puesto y Señal GPS
Job periódico que:
1. Revisa claves de grace period activas en Redis y registra ABANDONO_PUESTO inmediatamente si el tiempo venció
   (sin necesidad de esperar a que el usuario envíe otro ping).
2. Detecta pérdida prolongada de señal GPS (> 25 min) en empleados con jornada activa.
"""
import json
import os
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo  # type: ignore

_TZ_NAME = os.getenv("GEO_WORKER_TIMEZONE", "America/Lima")
try:
    LOCAL_TZ = ZoneInfo(_TZ_NAME)
except Exception:
    LOCAL_TZ = ZoneInfo("America/Lima")


async def check_active_abandonments(
    external_db: Any = None,
    external_redis: Any = None,
) -> Dict[str, Any]:
    """
    Escanea y procesa abandonos pendientes y pérdidas de señal.
    """
    from ..database import db as default_db
    from ..redis_client import redis_client as default_redis
    from ..services.geofence import GeofenceService

    db_to_use = external_db or default_db
    redis_to_use = external_redis or default_redis

    if not db_to_use.is_connected:
        await db_to_use.connect()
    if not redis_to_use.is_connected:
        await redis_to_use.connect()

    stats = {
        "abandonos_registrados": 0,
        "alertas_sin_senal": 0,
        "keys_procesadas": 0,
        "timestamp": datetime.now(LOCAL_TZ).isoformat(),
    }

    service = GeofenceService(db_to_use, redis_to_use)
    now_utc = datetime.now(timezone.utc)

    try:
        # ── 1. PROCESAR GRACE PERIODS EN REDIS ─────────────────────────────
        # Buscar todas las claves grace_period:*
        client = redis_to_use.client
        if client:
            keys = await client.keys("grace_period:*")
            stats["keys_procesadas"] = len(keys)

            for key in keys:
                key_str = key.decode("utf-8") if isinstance(key, bytes) else str(key)
                user_id = key_str.replace("grace_period:", "")
                raw_val = await redis_to_use.get(key_str)
                if not raw_val:
                    continue

                try:
                    data = json.loads(raw_val) if isinstance(raw_val, str) else json.loads(raw_val.decode("utf-8"))
                    started_at_str = data.get("started_at")
                    grace_minutes = int(data.get("grace_minutes", 10))
                    attendance_id = data.get("attendance_id")
                    user_name = data.get("user_name", "Empleado")

                    started_at = datetime.fromisoformat(started_at_str)
                    if started_at.tzinfo is None:
                        started_at = started_at.replace(tzinfo=timezone.utc)

                    elapsed = (now_utc - started_at).total_seconds()
                    if elapsed >= (grace_minutes * 60):
                        # Tiempo vencido -> Registrar abandono proactivamente
                        if attendance_id:
                            # Verificar que la asistencia siga abierta
                            att_check = await db_to_use.fetchrow(
                                """
                                SELECT status, "exitTime", "exitTime2"
                                FROM attendances
                                WHERE id = $1::uuid
                                """,
                                attendance_id,
                            )
                            if att_check and att_check["status"] in ("PRESENTE", "TARDE"):
                                await service._register_abandonment(attendance_id, user_id, user_name)
                                stats["abandonos_registrados"] += 1
                                print(f"[ABANDON_MONITOR] 🚨 Abandono registrado proactivamente para {user_name} ({user_id})")
                            else:
                                await redis_to_use.delete(key_str)
                except Exception as ex:
                    print(f"[ABANDON_MONITOR] Error procesando clave {key_str}: {ex}")

        # ── 2. MONITOREO DE PÉRDIDA DE SEÑAL PROLONGADA (> 25 MIN) ─────────
        today = datetime.now(LOCAL_TZ).date()
        open_attendances = await db_to_use.fetch(
            """
            SELECT a.id, a."userId", u."firstName", u."lastName",
                   MAX(p.timestamp) AS last_ping_time,
                   a."entryTime", a."entryTime2"
            FROM attendances a
            JOIN users u ON a."userId" = u.id
            LEFT JOIN geo_pings p ON a."userId" = p."userId" AND p.timestamp >= $2::timestamp
            WHERE a.date = $1
              AND a.status IN ('PRESENTE'::"AttendanceStatus", 'TARDE'::"AttendanceStatus")
              AND (
                  (a."entryTime" IS NOT NULL AND a."exitTime" IS NULL) OR
                  (a."entryTime2" IS NOT NULL AND a."exitTime2" IS NULL)
              )
            GROUP BY a.id, a."userId", u."firstName", u."lastName", a."entryTime", a."entryTime2"
            """,
            today,
            datetime.combine(today, datetime.min.time()),
        )

        for row in open_attendances:
            last_ping = row["last_ping_time"]
            user_id = str(row["userId"])
            user_name = f"{row['firstName']} {row['lastName']}"
            
            # Si nunca envió pings hoy, usar la hora de entrada del tramo activo
            if not last_ping:
                if row["entryTime2"] and not row.get("exitTime2"):
                    last_ping = row["entryTime2"]
                elif row["entryTime"]:
                    last_ping = row["entryTime"]

            if last_ping:
                last_ping_utc = last_ping.replace(tzinfo=timezone.utc) if last_ping.tzinfo is None else last_ping
                gap_minutes = (now_utc - last_ping_utc).total_seconds() / 60.0

                # Si no hay pings desde hace más de 25 minutos y no se ha alertado en la última hora
                if gap_minutes >= 25.0:
                    alert_key = f"signal_lost_alert:{user_id}"
                    already_alerted = await redis_to_use.get(alert_key)
                    if not already_alerted:
                        await redis_to_use.setex(alert_key, 3600, "1")  # Máx 1 alerta por hora
                        
                        is_never_pinged = row["last_ping_time"] is None
                        body_msg = (
                            f"{user_name} no ha activado su GPS desde que marcó su entrada hace {int(gap_minutes)} min." 
                            if is_never_pinged 
                            else f"No se reciben pings de {user_name} desde hace más de {int(gap_minutes)} min."
                        )
                        
                        await service._send_alert(
                            user_id=user_id,
                            notification_type="SALIDA_PERIMETRO",
                            title="⚠️ Sin reporte de ubicación GPS",
                            body=body_msg,
                            data={"attendanceId": str(row["id"]), "gapMinutes": int(gap_minutes), "neverPinged": is_never_pinged},
                            notify_supervisors=True,
                        )
                        stats["alertas_sin_senal"] += 1
                        print(f"[ABANDON_MONITOR] ⚠️ Alerta de señal perdida emitida para {user_name} (gap={int(gap_minutes)}m, never_pinged={is_never_pinged})")

    except Exception as e:
        print(f"[ABANDON_MONITOR] Error general en monitor de abandono: {e}")

    return stats
