import asyncio
import json
import os
import urllib.request
from datetime import date
from dotenv import load_dotenv
import asyncpg

load_dotenv()

BASE_URL = "http://localhost:8000"
SECRET = os.getenv("GEO_WORKER_SECRET", "dev-worker-secret")
DATABASE_URL = os.getenv("DATABASE_URL")

def request(method, path, body=None):
    url = f"{BASE_URL}{path}"
    headers = {
        "x-worker-secret": SECRET,
        "Content-Type": "application/json",
    }
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as response:
        return response.status, json.loads(response.read().decode("utf-8"))

async def test_geofencing():
    print("[TEST] Iniciando prueba con monitoreo activo (Entrada registrada)...")

    user_id = "b438f9fe-9d5a-413c-b6d5-c940d41771f3"
    today = date.today()

    conn = await asyncpg.connect(DATABASE_URL)
    try:
        user_info = await conn.fetchrow('SELECT "locationId" FROM users WHERE id = $1::uuid', user_id)
        location_id = user_info["locationId"]

        # Asegurar asistencia abierta hoy
        await conn.execute(
            """
            INSERT INTO attendances (id, "userId", "locationId", date, "entryTime", "exitTime", status, "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, NOW(), NULL, 'PRESENTE', NOW(), NOW())
            ON CONFLICT ("userId", date) DO UPDATE
            SET "entryTime" = NOW(), "exitTime" = NULL, status = 'PRESENTE'
            """,
            user_id, location_id, today
        )

        # 1. Ping DENTRO de Sede Central (-12.0964, -77.0428)
        inside_payload = {
            "user_id": user_id,
            "latitude": -12.0964,
            "longitude": -77.0428,
            "accuracy": 5.0,
            "source": "APP",
        }
        status, data = request("POST", "/api/geo/ping", inside_payload)
        print(f"1. Ping DENTRO: {status} -> {data}")
        assert data["is_inside"] is True, f"Esperaba is_inside=True pero obtuvo {data}"
        assert data["status"] == "INSIDE"

        # 2. Ping FUERA de Sede Central (5km lejos: -12.150000, -77.020000)
        outside_payload = {
            "user_id": user_id,
            "latitude": -12.150000,
            "longitude": -77.020000,
            "accuracy": 10.0,
            "source": "APP",
        }
        status, data = request("POST", "/api/geo/ping", outside_payload)
        print(f"2. Ping FUERA: {status} -> {data}")
        assert data["is_inside"] is False, f"Esperaba is_inside=False pero obtuvo {data}"
        assert "OUTSIDE" in data["status"]

        # 3. Geo Status check (debe mostrar Grace Period activo)
        status, data = request("GET", f"/api/geo/status/{user_id}")
        print(f"3. Geo Status: {status} -> {data}")
        assert data["status"] == "GRACE_PERIOD_ACTIVE"
        assert data["grace_period_seconds_remaining"] > 0

        # 4. Regreso DENTRO de la geocerca -> debe limpiar el Grace Period
        status, data = request("POST", "/api/geo/ping", inside_payload)
        print(f"4. Regreso DENTRO: {status} -> {data}")
        assert data["is_inside"] is True

        # 5. Geo Status check post-regreso -> debe estar en OK
        status, data = request("GET", f"/api/geo/status/{user_id}")
        print(f"5. Geo Status post-regreso: {status} -> {data}")
        assert data["status"] == "OK"

        print("[SUCCESS] Todas las pruebas de validación geoespacial con PostGIS y Redis pasaron al 100%!")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(test_geofencing())
