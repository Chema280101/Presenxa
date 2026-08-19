"""
In-process Async Scheduler para tareas automáticas de AsistControl.
Gestiona la ejecución periódica de:
- Apertura de Jornada (SOD) a las 06:00 AM (Lun-Sáb)
- Monitor de Tardanzas cada 15 min entre 08:00 AM y 11:30 AM
- Cierre de Fin de Día (EOD) a las 23:59 PM (Diario)

El scheduler respeta la zona horaria configurada en GEO_WORKER_TIMEZONE
(por defecto: America/Lima) para que SOD y EOD disparen en la hora
local correcta sin importar en qué servidor esté corriendo.
"""
import asyncio
import os
from datetime import datetime, date, time
try:
    from zoneinfo import ZoneInfo  # Python 3.9+
except ImportError:
    from backports.zoneinfo import ZoneInfo  # type: ignore[import]  # Python 3.8 fallback
from typing import Dict, Any, Optional
from .daily_starter import start_day
from .daily_closer import close_day
from .late_monitor import check_late_arrivals
from .cleanup_pings import purge_old_geo_pings
from .abandonment_monitor import check_active_abandonments

# Zona horaria configurable — leer de env o usar Lima por defecto
_TZ_NAME = os.getenv("GEO_WORKER_TIMEZONE", "America/Lima")
_RETENTION_DAYS = int(os.getenv("GEO_PING_RETENTION_DAYS", "45"))
try:
    LOCAL_TZ = ZoneInfo(_TZ_NAME)
except Exception:
    print(f"[SCHEDULER] ⚠️ Timezone '{_TZ_NAME}' no reconocida, usando America/Lima")
    LOCAL_TZ = ZoneInfo("America/Lima")

# Soporte dominical para el monitor de tardanzas.
# Por defecto excluye el domingo (como la mayoría de organizaciones).
# Cambiar a "true" si la org trabaja domingos.
_INCLUDE_SUNDAY = os.getenv("LATE_MONITOR_INCLUDE_SUNDAY", "false").lower() == "true"
_MAX_WEEKDAY = 6 if _INCLUDE_SUNDAY else 5  # 6=domingo incluido, 5=sábado como último


class JobScheduler:
    def __init__(self, db, redis_client):
        self.db = db
        self.redis = redis_client
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._status: Dict[str, Any] = {
            "isRunning": False,
            "startedAt": None,
            "lastSOD": None,
            "lastEOD": None,
            "lastLateCheck": None,
            "lastCleanup": None,
            "sodCount": 0,
            "eodCount": 0,
            "lateCheckCount": 0,
            "cleanupCount": 0,
            "retentionDays": _RETENTION_DAYS,
            "history": [],
        }

    def get_status(self) -> Dict[str, Any]:
        """Retorna el estado actual del scheduler y métricas de ejecución."""
        return {
            **self._status,
            "currentTime": datetime.now(LOCAL_TZ).isoformat(),
            "timezone": _TZ_NAME,
        }

    def _record_history(self, job_name: str, result: Dict[str, Any]):
        entry = {
            "job": job_name,
            "timestamp": datetime.now().isoformat(),
            "result": result,
        }
        self._status["history"].insert(0, entry)
        # Mantener solo las últimas 25 entradas
        if len(self._status["history"]) > 25:
            self._status["history"] = self._status["history"][:25]

    async def start(self):
        """Inicia el bucle asíncrono del scheduler."""
        if self._running:
            return
        self._running = True
        self._status["isRunning"] = True
        self._status["startedAt"] = datetime.now(LOCAL_TZ).isoformat()
        self._task = asyncio.create_task(self._loop())
        print(f"[SCHEDULER] ⏱️ In-process Job Scheduler iniciado exitosamente (tz={_TZ_NAME}, sunday={'on' if _INCLUDE_SUNDAY else 'off'}, retention={_RETENTION_DAYS}d)")

    async def stop(self):
        """Detiene el scheduler de forma segura."""
        self._running = False
        self._status["isRunning"] = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        print("[SCHEDULER] 🛑 In-process Job Scheduler detenido")

    async def _loop(self):
        """Bucle principal de verificación cada 30 segundos."""
        last_checked_minute = -1
        while self._running:
            try:
                now = datetime.now(LOCAL_TZ)  # ← Hora local correcta
                hour = now.hour
                minute = now.minute
                current_date = now.date()

                # Ejecutar solo una vez por minuto
                if minute != last_checked_minute:
                    last_checked_minute = minute

                    # 1. Depuración y Retención de GPS a las 03:00 AM diario (pings > 45 días)
                    if hour == 3 and minute == 0:
                        print(f"[SCHEDULER] 🧹 Disparando Depuración de GPS Pings (> {_RETENTION_DAYS} días)...")
                        res = await purge_old_geo_pings(_RETENTION_DAYS, external_db=self.db)
                        self._status["lastCleanup"] = datetime.now(LOCAL_TZ).isoformat()
                        self._status["cleanupCount"] += 1
                        self._record_history("CLEANUP_OLD_PINGS", res)

                    # 2. Apertura de Jornada (SOD) a las 06:00
                    if hour == 6 and minute == 0:
                        print(f"[SCHEDULER] 🌅 Disparando Apertura de Jornada Automática (SOD)...")
                        res = await start_day(current_date, external_db=self.db)
                        self._status["lastSOD"] = datetime.now(LOCAL_TZ).isoformat()
                        self._status["sodCount"] += 1
                        self._record_history("START_OF_DAY", res)

                    # 3. Monitoreo de tardanzas: configurable (Lun-Sáb por defecto, Dom opcional)
                    if (8 <= hour <= 11) and (minute in (0, 15, 30, 45)) and (now.weekday() < _MAX_WEEKDAY):
                        print(f"[SCHEDULER] 🔍 Disparando Monitor de Tardanzas Automático...")
                        res = await check_late_arrivals(
                            current_date,
                            threshold_minutes=30,
                            external_db=self.db,
                            external_redis=self.redis,
                        )
                        self._status["lastLateCheck"] = datetime.now(LOCAL_TZ).isoformat()
                        self._status["lateCheckCount"] += 1
                        self._record_history("LATE_MONITOR", res)

                    # 4. Cierre de Jornada (EOD) a las 23:59
                    if hour == 23 and minute == 59:
                        print(f"[SCHEDULER] 🌙 Disparando Cierre de Fin de Día Automático (EOD)...")
                        res = await close_day(current_date, external_db=self.db)
                        self._status["lastEOD"] = datetime.now(LOCAL_TZ).isoformat()
                        self._status["eodCount"] += 1
                        self._record_history("END_OF_DAY", res)

                    # 5. Monitor Proactivo de Abandono de Puesto y Pérdida de Señal (cada 2 min)
                    if minute % 2 == 0:
                        res_ab = await check_active_abandonments(external_db=self.db, external_redis=self.redis)
                        if res_ab.get("abandonos_registrados", 0) > 0 or res_ab.get("alertas_sin_senal", 0) > 0:
                            self._record_history("ABANDON_MONITOR", res_ab)

                await asyncio.sleep(30)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[SCHEDULER] ⚠️ Excepción en bucle de tareas: {e}")
                await asyncio.sleep(30)
