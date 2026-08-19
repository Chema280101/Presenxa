"""
AsistControl — Geo Worker
Servicio Python/FastAPI para validación geoespacial continua con PostGIS
y Automatización de Procesos de Asistencia (SOD, EOD, Late Monitor).
"""
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import os
import asyncio
from datetime import date, datetime
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load .env from geo-worker directory or workspace root
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from .services.geofence import GeofenceService
from .database import db
from .redis_client import redis_client
from .jobs.scheduler import JobScheduler
from .jobs.daily_starter import start_day
from .jobs.daily_closer import close_day
from .jobs.late_monitor import check_late_arrivals
from .jobs.cleanup_pings import purge_old_geo_pings
from .monitoring import init_monitoring

# Inicializar observabilidad (Sentry) si está configurado
init_monitoring()

scheduler = JobScheduler(db, redis_client)


def _validate_production_secrets() -> None:
    """
    Verifica que los secretos críticos no sean valores de desarrollo en producción.
    Solo actúa cuando NODE_ENV=production (o ENVIRONMENT=production).
    """
    env = os.getenv("NODE_ENV", os.getenv("ENVIRONMENT", "development")).lower()
    if env != "production":
        return

    issues: list[str] = []
    checks = {
        "GEO_WORKER_SECRET": os.getenv("GEO_WORKER_SECRET", ""),
        "DATABASE_URL": os.getenv("DATABASE_URL", ""),
    }

    for name, value in checks.items():
        if not value:
            issues.append(f"  ❌ {name}: no está definida")
        elif value.startswith("dev-"):
            issues.append(f"  ❌ {name}: usa el valor de desarrollo en producción")
        elif name == "GEO_WORKER_SECRET" and len(value) < 20:
            issues.append(f"  ⚠️  {name}: demasiado corta ({len(value)} chars). Usa al menos 32 chars.")

    if issues:
        sep = "═" * 60
        print(f"\n{sep}")
        print("🚨  ADVERTENCIA DE SEGURIDAD — Geo-Worker")
        print(sep)
        print("   Secrets inseguros detectados en PRODUCCIÓN:\n")
        for msg in issues:
            print(msg)
        print("\n   Genera un secret seguro con:")
        print("   python -c \"import secrets; print(secrets.token_hex(32))\"")
        print(f"{sep}\n")
        # Para modo estricto, descomenta la siguiente línea:
        # raise RuntimeError("Abortando: secrets de producción no configurados.")
    else:
        print("[Geo-Worker] ✅ Validación de secrets de producción: OK")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa conexiones y scheduler al arrancar, y las cierra al terminar."""
    _validate_production_secrets()
    await db.connect()
    await redis_client.connect()
    await scheduler.start()
    print("[OK] Geo Worker iniciado - DB, Redis y Scheduler conectados")
    yield
    await scheduler.stop()
    await db.disconnect()
    await redis_client.disconnect()
    print("[STOP] Geo Worker detenido")


app = FastAPI(
    title="AsistControl Geo Worker & Automation API",
    description="Servicio de validación geoespacial y automatización de asistencias",
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEO_WORKER_SECRET = os.getenv("GEO_WORKER_SECRET", "dev-worker-secret")


# ── Auth ──────────────────────────────────────────────────────
async def verify_internal_secret(x_worker_secret: str = Header(...)):
    """Solo Next.js o llamados internos autorizados pueden invocar este servicio."""
    if x_worker_secret != GEO_WORKER_SECRET:
        raise HTTPException(status_code=403, detail="Secreto inválido")


# ── Schemas ───────────────────────────────────────────────────
class GeoPingPayload(BaseModel):
    user_id: str = Field(..., description="UUID del usuario")
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy: Optional[float] = Field(None, description="Precisión GPS en metros")
    source: str = Field("APP", description="APP | BACKGROUND_FETCH | OFFLINE_SYNC")
    timestamp: Optional[datetime] = Field(None, description="Timestamp ISO original del ping (útil para sync offline)")


class GeoPingItem(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy: Optional[float] = Field(None, description="Precisión GPS en metros")
    source: str = Field("OFFLINE_SYNC", description="Fuente del ping")
    timestamp: Optional[datetime] = Field(None, description="Timestamp ISO original del ping")


class GeoPingBatchPayload(BaseModel):
    user_id: str = Field(..., description="UUID del usuario")
    pings: list[GeoPingItem] = Field(..., min_length=1, max_length=100, description="Lista de pings a sincronizar")


class GeoPingBatchResponse(BaseModel):
    processed: int
    saved: int
    last_status: Optional[str] = None
    message: Optional[str] = None


class GeoPingResponse(BaseModel):
    status: str
    is_inside: Optional[bool] = None
    grace_period_seconds_remaining: Optional[int] = None
    message: Optional[str] = None


class JobTriggerPayload(BaseModel):
    date: Optional[str] = Field(None, description="Fecha objetivo YYYY-MM-DD (opcional)")
    threshold_minutes: Optional[int] = Field(30, description="Minutos de tolerancia extra para tardanza")
    retention_days: Optional[int] = Field(45, description="Días de retención para historial de pings GPS")


# ── Health & Root Endpoints (Soporta GET y HEAD para UptimeRobot / Render) ──
@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {"status": "ok", "service": "geo-worker"}


@app.api_route("/health", methods=["GET", "HEAD"])
async def health():
    return {
        "status": "ok",
        "service": "geo-worker",
        "schedulerRunning": scheduler.get_status().get("isRunning", False),
    }


@app.post("/api/geo/ping", response_model=GeoPingResponse)
async def geo_ping(
    payload: GeoPingPayload,
    _: None = Depends(verify_internal_secret),
):
    """
    Recibe un ping de ubicación y valida si el usuario está dentro del perímetro.
    Aplica lógica de grace period si está fuera.
    """
    service = GeofenceService(db, redis_client)
    result = await service.handle_ping(
        user_id=payload.user_id,
        lat=payload.latitude,
        lng=payload.longitude,
        accuracy=payload.accuracy,
        source=payload.source,
        ping_time=payload.timestamp,
    )
    return result


@app.post("/api/geo/ping/batch", response_model=GeoPingBatchResponse)
async def geo_ping_batch(
    payload: GeoPingBatchPayload,
    _: None = Depends(verify_internal_secret),
):
    """
    Sincroniza un lote de pings acumulados offline en una sola petición.
    Procesa en orden cronológico respetando los timestamps originales.
    """
    service = GeofenceService(db, redis_client)
    saved_count = 0
    last_res = None

    # Ordenar por timestamp ascendente si vienen definidos
    sorted_pings = sorted(
        payload.pings,
        key=lambda x: x.timestamp or datetime.min.replace(tzinfo=timezone.utc),
    )

    for item in sorted_pings:
        res = await service.handle_ping(
            user_id=payload.user_id,
            lat=item.latitude,
            lng=item.longitude,
            accuracy=item.accuracy,
            source=item.source or "OFFLINE_SYNC",
            ping_time=item.timestamp,
        )
        if res.get("status") != "POOR_ACCURACY_SKIPPED":
            saved_count += 1
        last_res = res

    return GeoPingBatchResponse(
        processed=len(sorted_pings),
        saved=saved_count,
        last_status=last_res.get("status") if last_res else "OK",
        message=f"{saved_count} de {len(sorted_pings)} pings sincronizados exitosamente.",
    )


@app.get("/api/geo/status/{user_id}", response_model=GeoPingResponse)
async def geo_status(
    user_id: str,
    _: None = Depends(verify_internal_secret),
):
    """Retorna el estado actual de monitoreo de un usuario."""
    grace_key = f"grace_period:{user_id}"
    ttl = await redis_client.ttl(grace_key)

    return GeoPingResponse(
        status="GRACE_PERIOD_ACTIVE" if ttl > 0 else "OK",
        grace_period_seconds_remaining=max(0, ttl) if ttl > 0 else None,
    )


# ── Automation & Job Endpoints ────────────────────────────────
@app.get("/api/jobs/status")
async def get_jobs_status(
    _: None = Depends(verify_internal_secret),
):
    """Retorna el estado del scheduler de tareas y métricas de ejecución."""
    return scheduler.get_status()


@app.post("/api/jobs/daily-start")
async def trigger_daily_start(
    payload: Optional[JobTriggerPayload] = None,
    _: None = Depends(verify_internal_secret),
):
    """Dispara manualmente la apertura de jornada (creación de PENDIENTES)."""
    target = None
    if payload and payload.date:
        try:
            target = date.fromisoformat(payload.date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD")

    result = await start_day(target, external_db=db)
    scheduler._record_history("MANUAL_START_OF_DAY", result)
    return result


@app.post("/api/jobs/daily-close")
async def trigger_daily_close(
    payload: Optional[JobTriggerPayload] = None,
    _: None = Depends(verify_internal_secret),
):
    """Dispara manualmente el cierre de fin de día (EOD)."""
    target = None
    if payload and payload.date:
        try:
            target = date.fromisoformat(payload.date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD")

    result = await close_day(target, external_db=db)
    scheduler._record_history("MANUAL_END_OF_DAY", result)
    return result


@app.post("/api/jobs/check-late")
async def trigger_late_check(
    payload: Optional[JobTriggerPayload] = None,
    _: None = Depends(verify_internal_secret),
):
    """Dispara manualmente el escaneo y notificación de tardanzas."""
    target = None
    threshold = 30
    if payload:
        if payload.date:
            try:
                target = date.fromisoformat(payload.date)
            except ValueError:
                raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD")
        if payload.threshold_minutes is not None:
            threshold = payload.threshold_minutes

    result = await check_late_arrivals(
        target,
        threshold_minutes=threshold,
        external_db=db,
        external_redis=redis_client,
    )
    scheduler._record_history("MANUAL_LATE_MONITOR", result)
    return result


@app.post("/api/jobs/cleanup-pings")
async def trigger_cleanup_pings(
    payload: Optional[JobTriggerPayload] = None,
    _: None = Depends(verify_internal_secret),
):
    """Dispara manualmente la depuración de pings GPS antiguos (> 45 días)."""
    days = 45
    if payload and payload.retention_days is not None:
        days = payload.retention_days

    result = await purge_old_geo_pings(retention_days=days, external_db=db)
    scheduler._record_history("MANUAL_CLEANUP_OLD_PINGS", result)
    return result

