import json
import os
import math
import asyncio
from datetime import datetime, date, timezone
from typing import Optional, Any
from ..database import Database
from ..redis_client import RedisClient


try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo  # type: ignore

_TZ_NAME = os.getenv("GEO_WORKER_TIMEZONE", "America/Lima")
try:
    LOCAL_TZ = ZoneInfo(_TZ_NAME)
except Exception:
    LOCAL_TZ = ZoneInfo("America/Lima")


class GeofenceService:
    def __init__(self, db: Database, redis: RedisClient):
        self.db = db
        self.redis = redis

    async def handle_ping(
        self,
        user_id: str,
        lat: float,
        lng: float,
        accuracy: Optional[float],
        source: str = "APP",
    ) -> dict:
        """
        Procesa un ping de ubicación:
        1. Busca al usuario y su sede
        2. Verifica si hay una asistencia abierta hoy
        3. Valida si está dentro de la geocerca (PostGIS)
        4. Aplica lógica de grace period si está fuera
        """

        # 0. Validación de precisión GPS (rechazar si accuracy > 100 metros)
        if accuracy is not None and (accuracy > 100.0 or accuracy <= 0):
            return {
                "status": "POOR_ACCURACY_SKIPPED",
                "is_inside": None,
                "message": f"Precision GPS insuficiente ({round(accuracy)}m > 100m). Ping descartado.",
            }

        # 1. Buscar usuario con su sede y configuración de geocerca
        user_row = await self.db.fetchrow(
            """
            SELECT u.id, u."organizationId", u."locationId",
                   u."firstName", u."lastName",
                   l."geofenceRadius", l."geofenceLat", l."geofenceLng",
                   l."geofencePolygon",
                   o.settings->>'grace_period_minutes' AS grace_minutes
            FROM users u
            LEFT JOIN locations l ON u."locationId" = l.id
            LEFT JOIN organizations o ON u."organizationId" = o.id
            WHERE u.id = $1::uuid AND u."isActive" = true
            """,
            user_id,
        )

        if not user_row:
            return {"status": "USER_NOT_FOUND"}

        if not user_row["locationId"]:
            return {"status": "NO_LOCATION_CONFIGURED"}

        # 2. ¿Tiene asistencia abierta hoy (entrada sin salida)? (Calculado con timezone local)
        today = datetime.now(LOCAL_TZ).date()
        attendance_row = await self.db.fetchrow(
            """
            SELECT id, "entryTime", "exitTime", status
            FROM attendances
            WHERE "userId" = $1::uuid AND date = $2
            """,
            user_id, today,
        )

        # 2.5 Detección de Teletransportación / GPS Spoofing Anómalo
        is_spoofing_suspected = False
        if attendance_row and attendance_row["entryTime"] and not attendance_row["exitTime"]:
            prev_ping = await self.db.fetchrow(
                """
                SELECT latitude, longitude, timestamp
                FROM geo_pings
                WHERE "userId" = $1::uuid
                ORDER BY timestamp DESC
                LIMIT 1
                """,
                user_id,
            )

            if prev_ping:
                prev_lat = float(prev_ping["latitude"])
                prev_lng = float(prev_ping["longitude"])
                prev_time = prev_ping["timestamp"]

                now_utc = datetime.now(timezone.utc)
                prev_utc = prev_time.replace(tzinfo=timezone.utc) if prev_time.tzinfo is None else prev_time
                delta_sec = max(1.0, (now_utc - prev_utc).total_seconds())

                if delta_sec <= 180:  # Si el ping anterior fue hace menos de 3 minutos
                    dist_meters = self._calculate_distance_meters(prev_lat, prev_lng, lat, lng)
                    speed_kmh = (dist_meters / 1000.0) / (delta_sec / 3600.0)

                    if speed_kmh > 150.0 and dist_meters > 800.0:
                        is_spoofing_suspected = True
                        print(f"[SECURITY] 🚨 GPS Spoofing sospechoso ({user_id}): Salto de {round(dist_meters)}m en {round(delta_sec)}s ({round(speed_kmh)} km/h)")
                        await self._send_alert(
                            user_id=user_id,
                            notification_type="SALIDA_PERIMETRO",
                            title="⚠️ Alerta de Teletransportación GPS",
                            body=f"Se detectó un desplazamiento anómalo para {user_row['firstName']} {user_row['lastName']}: {round(dist_meters)}m en {round(delta_sec)}s ({round(speed_kmh)} km/h). Posible GPS falso.",
                            data={"attendanceId": str(attendance_row["id"]), "speedKmh": round(speed_kmh), "distMeters": round(dist_meters)},
                            notify_supervisors=True,
                        )

        # 3. Validar geocerca con PostGIS
        is_inside = await self._check_geofence(user_row, lat, lng)

        # Si no hay entrada o ya marcó salida, registrar ping sin activar penalización de abandono
        if not attendance_row or not attendance_row["entryTime"] or attendance_row["exitTime"]:
            await self._save_ping(user_id, lat, lng, accuracy, None, is_inside, source)
            return {
                "status": "INSIDE" if is_inside else "OUTSIDE",
                "is_inside": is_inside,
                "message": "Sin jornada activa",
            }

        # 4. Guardar ping
        ping_source = "SPOOF_SUSPECTED" if is_spoofing_suspected else source
        await self._save_ping(
            user_id, lat, lng, accuracy, str(attendance_row["id"]), is_inside, ping_source
        )

        # Si se detectó spoofing, rechazar la ubicación de inmediato para no afectar el grace period o validarla
        if is_spoofing_suspected:
            return {
                "status": "SPOOFING_REJECTED",
                "is_inside": False,
                "message": "Ubicación rechazada por salto anómalo (teletransportación) detectado.",
            }

        # 5. Aplicar lógica de presencia
        if is_inside:
            await self._clear_grace_period(user_id)
            return {
                "status": "INSIDE",
                "is_inside": True,
            }
        else:
            grace_minutes = int(user_row["grace_minutes"] or 10)
            return await self._handle_outside(
                user_id=user_id,
                attendance_id=str(attendance_row["id"]),
                user_name=f"{user_row['firstName']} {user_row['lastName']}",
                grace_minutes=grace_minutes,
            )

    def _calculate_distance_meters(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calcula la distancia Haversine en metros entre dos coordenadas geográficas."""
        R = 6371000.0  # Radio de la Tierra en metros
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return R * c

    async def _check_geofence(self, user_row: Any, lat: float, lng: float) -> bool:
        """
        Usa PostGIS para determinar si el punto está dentro de la zona.
        Soporta geocercas circulares y poligonales.
        """
        if (user_row["geofenceRadius"] and
                user_row["geofenceLat"] and
                user_row["geofenceLng"]):
            # Geocerca CIRCULAR — ST_DWithin con geography (cálculo en metros exactos)
            row = await self.db.fetchrow(
                """
                SELECT ST_DWithin(
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                    ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography,
                    $5
                ) AS is_inside
                """,
                lng, lat,
                user_row["geofenceLng"],
                user_row["geofenceLat"],
                float(user_row["geofenceRadius"]),
            )
            return bool(row["is_inside"]) if row else True

        elif user_row["geofencePolygon"]:
            # Geocerca POLIGONAL — ST_Within con geometría exacta
            polygon_json = (
                user_row["geofencePolygon"]
                if isinstance(user_row["geofencePolygon"], str)
                else json.dumps(user_row["geofencePolygon"])
            )
            row = await self.db.fetchrow(
                """
                SELECT ST_Within(
                    ST_SetSRID(ST_MakePoint($1, $2), 4326),
                    ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)
                ) AS is_inside
                """,
                lng, lat, polygon_json,
            )
            return bool(row["is_inside"]) if row else True

        # Sin geocerca configurada → siempre válido
        return True

    async def _handle_outside(
        self,
        user_id: str,
        attendance_id: str,
        user_name: str,
        grace_minutes: int,
    ) -> dict:
        """
        Gestiona la lógica cuando el usuario está fuera del perímetro.
        Usa el TTL de Redis como contador del grace period.
        """
        grace_key = f"grace_period:{user_id}"
        ttl = await self.redis.ttl(grace_key)

        if ttl < 0:
            # Primera vez que sale → iniciar grace period
            await self.redis.setex(
                grace_key,
                grace_minutes * 60,
                datetime.now(timezone.utc).isoformat(),
            )

            # Notificar al usuario
            await self._send_alert(
                user_id=user_id,
                notification_type="SALIDA_PERIMETRO",
                title="⚠️ Saliste del perímetro",
                body=f"Tienes {grace_minutes} minutos para regresar o marcar tu salida.",
                data={"attendanceId": attendance_id},
            )

            return {
                "status": "OUTSIDE_GRACE_PERIOD_STARTED",
                "is_inside": False,
                "grace_period_seconds_remaining": grace_minutes * 60,
                "message": f"Grace period iniciado ({grace_minutes} min)",
            }

        elif ttl > 0:
            # Aún dentro del grace period
            return {
                "status": "OUTSIDE_GRACE_PERIOD_ACTIVE",
                "is_inside": False,
                "grace_period_seconds_remaining": ttl,
            }

        else:
            # TTL = 0: expiró → registrar abandono de puesto
            await self._register_abandonment(attendance_id, user_id, user_name)
            return {
                "status": "ABANDONMENT_REGISTERED",
                "is_inside": False,
                "grace_period_seconds_remaining": 0,
                "message": "Abandono de puesto registrado",
            }

    async def _register_abandonment(
        self, attendance_id: str, user_id: str, user_name: str
    ) -> None:
        """Cambia el estado de la asistencia a ABANDONO_PUESTO."""
        await self.db.execute(
            """
            UPDATE attendances
            SET status = 'ABANDONO_PUESTO',
                "statusChangedAt" = NOW(),
                "statusChangedBy" = 'SISTEMA_GEO',
                notes = 'Detectado por Geo-Worker: Fuera del perímetro de geocerca por más de 10 min.'
            WHERE id = $1::uuid
            """,
            attendance_id,
        )

        # Crear notificación en DB
        await self._send_alert(
            user_id=user_id,
            notification_type="ABANDONO_REGISTRADO",
            title="🚨 Abandono de puesto registrado",
            body=f"Se registró abandono de puesto para {user_name}.",
            data={"attendanceId": attendance_id},
            notify_supervisors=True,
        )

        await self._clear_grace_period(user_id)

    async def _save_ping(
        self,
        user_id: str,
        lat: float,
        lng: float,
        accuracy: Optional[float],
        attendance_id: Optional[str],
        is_inside: bool,
        source: str,
    ) -> None:
        valid_source = "APP"
        if "MANUAL" in (source or "").upper():
            valid_source = "MANUAL"
        elif "BACKGROUND" in (source or "").upper():
            valid_source = "BACKGROUND_FETCH"

        await self.db.execute(
            """
            INSERT INTO geo_pings
                (id, "userId", "attendanceId", latitude, longitude, accuracy,
                 "isInsideZone", source, timestamp)
            VALUES
                (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5, $6, $7::"PingSource", NOW())
            """,
            user_id, attendance_id, lat, lng, accuracy, is_inside, valid_source,
        )

    async def _send_alert(
        self,
        user_id: str,
        notification_type: str,
        title: str,
        body: str,
        data: Optional[dict] = None,
        notify_supervisors: bool = False,
    ) -> None:
        """Guarda la notificación en DB y despacha Web Push vía Next.js API."""
        await self.db.execute(
            """
            INSERT INTO notifications
                (id, "userId", type, title, body, data, "createdAt")
            VALUES
                (gen_random_uuid(), $1::uuid, $2::"NotificationType", $3, $4, $5::jsonb, NOW())
            """,
            user_id, notification_type, title, body,
            json.dumps(data) if data else None,
        )

        nextjs_url = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:3002")
        worker_secret = os.getenv("GEO_WORKER_SECRET", "dev-worker-secret")

        def _do_push():
            try:
                import urllib.request
                req_data = json.dumps({
                    "userId": user_id,
                    "type": notification_type,
                    "title": title,
                    "body": body,
                    "data": data or {},
                    "notifySupervisors": notify_supervisors,
                }).encode("utf-8")
                req = urllib.request.Request(
                    f"{nextjs_url}/api/notifications/send",
                    data=req_data,
                    headers={
                        "Content-Type": "application/json",
                        "x-worker-secret": worker_secret,
                    },
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=3) as resp:
                    pass
            except Exception as e:
                print(f"[Geo-Worker Push] Info al notificar push a Next.js: {e}")

        asyncio.create_task(asyncio.to_thread(_do_push))

    async def _clear_grace_period(self, user_id: str) -> None:
        await self.redis.delete(f"grace_period:{user_id}")
