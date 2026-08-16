"""
Módulo de Observabilidad y Monitoreo para FastAPI con Sentry.
"""
import os


def init_monitoring():
    """Inicializa Sentry SDK si está configurado SENTRY_DSN."""
    dsn = os.getenv("SENTRY_DSN")
    if not dsn:
        return

    try:
        import sentry_sdk  # type: ignore
        from sentry_sdk.integrations.fastapi import FastApiIntegration  # type: ignore

        sentry_sdk.init(
            dsn=dsn,
            integrations=[FastApiIntegration()],
            traces_sample_rate=0.2,
            environment=os.getenv("ENVIRONMENT", "production"),
        )
        print("[MONITORING] Sentry SDK inicializado exitosamente en Geo-Worker")
    except ImportError:
        print("[MONITORING] sentry-sdk no instalado, omitiendo inicialización")
    except Exception as e:
        print(f"[MONITORING] Error al inicializar Sentry: {e}")
