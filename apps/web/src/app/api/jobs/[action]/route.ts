import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runDailyStarter } from "@/lib/jobs/dailyStarter";
import { runDailyCloser } from "@/lib/jobs/dailyCloser";
import { runLateMonitor } from "@/lib/jobs/lateMonitor";
import { sendPushToAllAdmins } from "@/lib/webPush";

const CRON_SECRET = (() => {
  const s = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") {
    throw new Error("FATAL: CRON_SECRET no configurado en producción");
  }
  return s || "dev-cron-secret";
})();

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
    case "notify-sod": {
      const result = await sendPushToAllAdmins({
        title: "🌅 Preparando Apertura (SOD)",
        body: "La apertura automática de jornada comenzará en 10 minutos. Revisa que todos los horarios estén listos.",
        icon: "/brand/logo.png",
        badge: "/brand/logo.png",
        tag: "sod-alert",
      });
      return NextResponse.json({ success: true, action: "notify-sod", ...result });
    }
    case "notify-eod": {
      const result = await sendPushToAllAdmins({
        title: "🌙 Preparando Cierre (EOD)",
        body: "El cierre automático de jornada comenzará en 10 minutos. Último aviso para justificaciones manuales.",
        icon: "/brand/logo.png",
        badge: "/brand/logo.png",
        tag: "eod-alert",
      });
      return NextResponse.json({ success: true, action: "notify-eod", ...result });
    }
    default:
      return NextResponse.json(
        { error: `Acción '${action}' no válida. Use: daily-start, daily-close, check-late, notify-sod, notify-eod` },
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

  if (["daily-start", "daily-close", "check-late", "notify-sod", "notify-eod"].includes(action)) {
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
