# AsistControl 🏢

Sistema inteligente de control de asistencia con QR y geofencing para empresas y organizaciones corporativas.

## Stack

| Capa | Tecnología |
|------|-----------|
| Monorepo | pnpm + Turborepo |
| Panel Admin | Next.js 15 (App Router) + Tailwind CSS v4 |
| Kiosk | Next.js 15 (pantalla completa) + html5-qrcode |
| Geo Worker | Python 3.12 + FastAPI + asyncpg |
| Base de Datos | PostgreSQL 16 + PostGIS 3.4 |
| ORM | Prisma 6 |
| Cache / Jobs | Redis 7 + BullMQ |

## Estructura del Monorepo

```
asistencias/
├── apps/
│   ├── web/          # Panel administrativo (puerto 3000)
│   └── kiosk/        # Tablet de entrada (puerto 3001)
├── packages/
│   ├── db/           # Prisma client + schema + seed
│   ├── geo-worker/   # FastAPI — validación geoespacial (puerto 8000)
│   └── ui/           # Componentes y utilidades compartidas
├── docker-compose.yml
├── .env.example
└── turbo.json
```

## Setup Inicial

### 1. Requisitos previos

- Node.js ≥ 20
- pnpm ≥ 9
- Python ≥ 3.12
- Docker Desktop

### 2. Variables de entorno

```bash
# Copiar el .env de ejemplo (ya viene pre-llenado para desarrollo)
cp .env.example .env
```

### 3. Levantar infraestructura con Docker

```bash
docker compose up -d
```

Esto levanta:
- **PostgreSQL 16 + PostGIS** → `localhost:5432`
- **Redis 7** → `localhost:6379`
- **Redis Insight** (UI) → `http://localhost:5540`

### 4. Instalar dependencias Node

```bash
pnpm install
```

### 5. Configurar la base de datos

```bash
# Generar el cliente Prisma
pnpm db:generate

# Crear tablas (primera migración)
pnpm db:migrate

# Poblar con datos de prueba
pnpm db:seed
```

### 6. Configurar el Geo Worker (Python)

```bash
cd packages/geo-worker

# Crear entorno virtual
python -m venv .venv
.venv\Scripts\activate     # Windows
# source .venv/bin/activate  # Linux/Mac

# Instalar dependencias
pip install -r requirements.txt
```

### 7. Levantar todo

**Terminal 1 — Apps Next.js:**
```bash
pnpm dev
```

**Terminal 2 — Geo Worker Python:**
```bash
cd packages/geo-worker
uvicorn app.main:app --reload --port 8000
```

## URLs de Desarrollo

| Servicio | URL |
|---------|-----|
| Panel Admin | http://localhost:3000 |
| Kiosk | http://localhost:3001 |
| Geo Worker API | http://localhost:8000 |
| Geo Worker Docs | http://localhost:8000/docs |
| Redis Insight | http://localhost:5540 |
| Prisma Studio | `pnpm db:studio` → http://localhost:5555 |

## Credenciales de Prueba

```
Admin:    admin@demo.com    / password123
Empleado: carlos.mendoza@demo.com / password123
```

## Flujo de Negocio

```
1. Trabajador escanea QR en kiosk → se registra ENTRADA
2. App móvil/PWA envía pings de GPS cada 60 segundos al Geo Worker
3. PostGIS valida si está dentro de la geocerca
4. Si sale del perímetro → inicia grace period (5 min por defecto)
5. Si no regresa → estado cambia a ABANDONO_PUESTO
6. A las 23:59 → cron job cierra el día (AUSENTE / INCOMPLETO / TARDE)
```

## Comandos Útiles

```bash
# Ver estado de la DB en UI visual
pnpm db:studio

# Correr migración nueva
pnpm db:migrate

# Cierre manual de día (desarrollo)
cd packages/geo-worker && python -m app.jobs.daily_closer

# Verificar tipos TypeScript en todo el monorepo
pnpm typecheck
```
