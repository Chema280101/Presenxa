"""
Test para validar la depuración y retención de geo_pings (> 45 días).
Inserta pings de prueba con distintas antigüedades (60d, 50d, 30d, 5d, 0d),
ejecuta purge_old_geo_pings(45) y verifica que solo se eliminen los > 45 días.
"""
import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv

# Cargar .env
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

pkg_root = Path(__file__).resolve().parent
if str(pkg_root) not in sys.path:
    sys.path.insert(0, str(pkg_root))

from app.database import db
from app.jobs.cleanup_pings import purge_old_geo_pings


async def run_cleanup_test():
    print("[TEST] 🧪 Iniciando prueba de retención de 45 días para geo_pings...")
    await db.connect()

    try:
        # 1. Obtener un usuario de prueba existente
        user_row = await db.fetchrow("SELECT id FROM users LIMIT 1")
        if not user_row:
            print("[TEST] ⚠️ No hay usuarios en la base de datos para correr la prueba. Ejecuta pnpm db:seed primero.")
            return

        user_id = str(user_row["id"])
        now = datetime.now(timezone.utc)

        # 2. Insertar pings de prueba con fechas específicas
        test_pings = [
            {"days_ago": 60, "should_delete": True, "label": "Antiguo (60 días)"},
            {"days_ago": 50, "should_delete": True, "label": "Antiguo (50 días)"},
            {"days_ago": 30, "should_delete": False, "label": "Conservar (30 días)"},
            {"days_ago": 10, "should_delete": False, "label": "Conservar (10 días)"},
            {"days_ago": 0,  "should_delete": False, "label": "Conservar (Hoy)"},
        ]

        inserted_ids = []
        for item in test_pings:
            ts = now - timedelta(days=item["days_ago"])
            row = await db.fetchrow(
                """
                INSERT INTO geo_pings
                    (id, "userId", latitude, longitude, accuracy, "isInsideZone", source, timestamp)
                VALUES
                    (gen_random_uuid(), $1::uuid, -12.046, -77.042, 5.0, true, 'APP', $2)
                RETURNING id
                """,
                user_id, ts,
            )
            ping_id = str(row["id"])
            item["id"] = ping_id
            inserted_ids.append(ping_id)
            print(f"  + Insertado ping de prueba: {item['label']} -> ID: {ping_id} (Fecha: {ts.strftime('%Y-%m-%d %H:%M')})")

        # 3. Ejecutar la función de depuración con 45 días
        print("\n[TEST] 🚀 Ejecutando purge_old_geo_pings(retention_days=45)...")
        result = await purge_old_geo_pings(retention_days=45, external_db=db)
        print(f"  Resultado de la función: {result}")

        assert result["status"] == "success", "La función debe retornar status=success"
        assert result["deletedCount"] >= 2, f"Se debieron eliminar al menos 2 pings antiguos, eliminados: {result['deletedCount']}"

        # 4. Verificar qué pings quedaron en la base de datos
        print("\n[TEST] 🔍 Verificando existencia de cada ping:")
        for item in test_pings:
            check_row = await db.fetchrow("SELECT id, timestamp FROM geo_pings WHERE id = $1::uuid", item["id"])
            exists = check_row is not None
            
            if item["should_delete"]:
                assert not exists, f"ERROR: El ping {item['label']} (ID: {item['id']}) NO debió existir tras el borrado!"
                print(f"  ✅ Correcto: {item['label']} fue ELIMINADO de la DB.")
            else:
                assert exists, f"ERROR: El ping {item['label']} (ID: {item['id']}) debió permanecer en la DB!"
                print(f"  ✅ Correcto: {item['label']} PERMANECE en la DB.")

        # Limpiar pings restantes de la prueba
        remaining_test_ids = [item["id"] for item in test_pings if not item["should_delete"]]
        for pid in remaining_test_ids:
            await db.execute("DELETE FROM geo_pings WHERE id = $1::uuid", pid)

        print("\n[TEST] 🏆 ¡PRUEBA EXITOSA! La política de retención de 45 días funciona a la perfección.")

    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(run_cleanup_test())
