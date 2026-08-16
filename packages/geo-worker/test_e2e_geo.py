import json
import os
import urllib.request
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://localhost:8000"
SECRET = os.getenv("GEO_WORKER_SECRET", "dev-worker-secret")

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

def run_tests():
    print("[START] Iniciando pruebas End-to-End del Geo Worker...")

    # 1. Health check
    status, data = request("GET", "/health")
    print(f"1. Health Check: {status} -> {data}")
    assert status == 200

    # Carlos Mendoza UUID
    user_id = "b438f9fe-9d5a-413c-b6d5-c940d41771f3"

    # 2. Ping DENTRO de la geocerca de Sede Central (-12.046374, -77.042793)
    inside_payload = {
        "user_id": user_id,
        "latitude": -12.046374,
        "longitude": -77.042793,
        "accuracy": 5.0,
        "source": "APP",
    }
    status, data = request("POST", "/api/geo/ping", inside_payload)
    print(f"2. Ping DENTRO Geocerca: {status} -> {data}")
    assert status == 200

    # 3. Ping FUERA de la geocerca (a 5 km de distancia: -12.100000, -77.020000)
    outside_payload = {
        "user_id": user_id,
        "latitude": -12.100000,
        "longitude": -77.020000,
        "accuracy": 8.0,
        "source": "APP",
    }
    status, data = request("POST", "/api/geo/ping", outside_payload)
    print(f"3. Ping FUERA Geocerca: {status} -> {data}")
    assert status == 200

    # 4. Estado de Grace Period
    status, data = request("GET", f"/api/geo/status/{user_id}")
    print(f"4. Estado Geo Status: {status} -> {data}")
    assert status == 200

    print("[SUCCESS] Todas las pruebas del Geo Worker pasaron exitosamente!")

if __name__ == "__main__":
    run_tests()
