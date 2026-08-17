import { NextResponse } from "next/server";
import { auth } from "@/auth";

const GEO_WORKER_URL = process.env.GEO_WORKER_URL || "http://localhost:8000";
const GEO_WORKER_SECRET = process.env.GEO_WORKER_SECRET || "dev-worker-secret";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ action: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["ADMIN", "SUPER_ADMIN", "SUPERVISOR"].includes(role)) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  }

  const { action } = await params;

  if (action === "status") {
    try {
      const res = await fetch(`${GEO_WORKER_URL}/api/jobs/status`, {
        headers: {
          "x-worker-secret": GEO_WORKER_SECRET,
        },
        cache: "no-store",
      });

      if (!res.ok) {
        return NextResponse.json({
          online: false,
          status: "standby",
          message: `Geo-worker en reposo (${res.statusText})`,
          sodCount: 0,
          eodCount: 0,
        });
      }

      const data = await res.json();
      return NextResponse.json({ ...data, online: true });
    } catch (error: any) {
      // Graceful fallback when Geo Worker is offline in dev
      return NextResponse.json({
        online: false,
        status: "offline",
        message: "Geo-worker en reposo o no iniciado",
        sodCount: 0,
        eodCount: 0,
      });
    }
  }

  return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["ADMIN", "SUPER_ADMIN", "SUPERVISOR"].includes(role)) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  }

  const { action } = await params;
  const validActions = ["daily-start", "daily-close", "check-late", "cleanup-pings"];

  if (!validActions.includes(action)) {
    return NextResponse.json({ error: "Acción de automatización no válida" }, { status: 400 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    // Body opcional
  }

  try {
    const res = await fetch(`${GEO_WORKER_URL}/api/jobs/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-worker-secret": GEO_WORKER_SECRET,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData.detail || `Error en worker: ${res.statusText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: "No se pudo comunicar con el Geo Worker / Scheduler", detail: error.message },
      { status: 503 }
    );
  }
}
