import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runDailyStarter } from "@/lib/jobs/dailyStarter";
import { runDailyCloser } from "@/lib/jobs/dailyCloser";
import { runLateMonitor } from "@/lib/jobs/lateMonitor";

const CRON_SECRET = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET || "dev-cron-secret";

async function isAuthorized(request: Request): Promise<boolean> {
  // 1. Verificar header de autorización (para llamadas desde Windows Scheduler / Linux Cron)
  const authHeader = request.headers.get("authorization");
  const secretHeader = request.headers.get("x-cron-secret") || request.headers.get("x-worker-secret");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (token === CRON_SECRET) return true;
  }
  if (secretHeader && secretHeader === CRON_SECRET) {
    return true;
  }

  // 2. Verificar sesión de usuario autenticado (Admin o Supervisor)
  const session = await auth();
  if (session?.user) {
    const role = (session.user as any).role;
    if (["ADMIN", "SUPER_ADMIN", "SUPERVISOR"].includes(role)) {
      return true;
    }
  }

  return false;
}

function resolveTargetDate(request: Request, body?: any): Date | undefined {
  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const targetParam = url.searchParams.get("target");

  if (body?.target === "yesterday" || targetParam === "yesterday") {
    return new Date(Date.now() - 24 * 60 * 60 * 1000);
  }

  if (body?.date) {
    return new Date(body.date);
  }

  if (dateParam) {
    return new Date(dateParam);
  }

  return undefined;
}

async function handleAction(action: string, targetDate?: Date) {
  switch (action) {
    case "daily-start": {
      const result = await runDailyStarter(targetDate);
      return NextResponse.json(result);
    }
    case "daily-close": {
      const result = await runDailyCloser(targetDate);
      return NextResponse.json(result);
    }
    case "check-late": {
      const result = await runLateMonitor(targetDate);
      return NextResponse.json(result);
    }
    default:
      return NextResponse.json(
        { error: `Acción '${action}' no válida. Use: daily-start, daily-close, check-late` },
        { status: 400 }
      );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ action: string }> }
) {
  const authorized = await isAuthorized(request);
  if (!authorized) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { action } = await params;

  if (action === "status") {
    return NextResponse.json({
      online: true,
      status: "active",
      message: "Motor de automatizaciones nativo activo",
      schedulerRunning: true,
      timestamp: new Date().toISOString(),
    });
  }

  if (["daily-start", "daily-close", "check-late"].includes(action)) {
    const targetDate = resolveTargetDate(request);
    return handleAction(action, targetDate);
  }

  return NextResponse.json({ error: "Acción GET no soportada" }, { status: 400 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> }
) {
  const authorized = await isAuthorized(request);
  if (!authorized) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { action } = await params;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // Body opcional
  }

  const targetDate = resolveTargetDate(request, body);
  return handleAction(action, targetDate);
}
