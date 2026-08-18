import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, AuditAction } from "@asistencias/db";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";
import { getLocalTodayDate, formatLocalTime } from "@/lib/dateUtils";

const IncidentSchema = z.object({
  type: z.enum(["GPS_PERMISSION_REVOKED", "GPS_DISABLED", "GPS_MOCK_DETECTED", "GPS_TIMEOUT"]),
  reason: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// POST /api/geo/incident
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json().catch(() => ({}));
    const parsed = IncidentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload de incidencia inválido", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { type, reason, metadata } = parsed.data;

    // 1. Obtener usuario con su organización y sede
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        location: true,
        organization: true,
      },
    });

    if (!user || !user.organizationId) {
      return NextResponse.json({ error: "Usuario u organización no encontrados" }, { status: 404 });
    }

    const timezone = user.location?.timezone || "America/Lima";
    const now = new Date();
    const today = getLocalTodayDate(now, timezone);
    const timeFormatted = formatLocalTime(now, "HH:mm:ss", timezone);

    // 2. Verificar si tiene asistencia activa hoy
    const attendance = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        },
      },
    });

    const isShiftActive = Boolean(attendance?.entryTime && !attendance?.exitTime);

    // 3. Si la jornada está activa, marcar nota de auditoría en la asistencia
    if (attendance && isShiftActive) {
      const incidentNote = `[ALERTA_SEGURIDAD_GPS: ${type} a las ${timeFormatted}]`;
      const currentNotes = attendance.notes || "";
      const updatedNotes = currentNotes.includes(type)
        ? currentNotes
        : currentNotes ? `${currentNotes} | ${incidentNote}` : incidentNote;

      await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          notes: updatedNotes,
          statusChangedAt: now,
          statusChangedBy: "SISTEMA_SEGURIDAD_GPS",
        },
      });
    }

    // 4. Registrar en Audit Logs
    await logAuditEvent({
      organizationId: user.organizationId,
      userId: user.id,
      action: AuditAction.USER_UPDATED,
      entityType: "USER",
      entityId: user.id,
      newData: {
        securityIncident: type,
        reason: reason || "Permiso de geolocalización revocado o desactivado durante el turno",
        isShiftActive,
        time: timeFormatted,
        metadata: metadata || {},
      },
      req,
    });

    // 5. Notificar a Supervisores y Administradores
    const supervisors = await prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true,
        role: { in: ["ADMIN", "SUPERVISOR", "SUPER_ADMIN"] },
        OR: [
          { locationId: null },
          { locationId: user.locationId },
        ],
      },
      select: { id: true },
    });

    const notifTitle = `🚨 Incidencia de Seguridad GPS — ${user.firstName} ${user.lastName}`;
    const notifBody = `${user.firstName} ${user.lastName} ha desactivado los permisos de ubicación a las ${timeFormatted} mientras tiene su jornada laboral activa.`;

    if (supervisors.length > 0) {
      await prisma.notification.createMany({
        data: supervisors.map((sup) => ({
          userId: sup.id,
          type: "SALIDA_PERIMETRO", // Tipo de notificación de alerta existente
          title: notifTitle,
          body: notifBody,
          data: {
            isSecurityIncident: true,
            incidentType: type,
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            time: timeFormatted,
            attendanceId: attendance?.id,
            locationName: user.location?.name,
          },
        })),
      });

      // Disparar Push a supervisores
      const nextjsUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const workerSecret = process.env.GEO_WORKER_SECRET || "dev-worker-secret";

      try {
        fetch(`${nextjsUrl}/api/notifications/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-worker-secret": workerSecret,
          },
          body: JSON.stringify({
            userId: user.id,
            type: "SALIDA_PERIMETRO",
            title: notifTitle,
            body: notifBody,
            notifySupervisors: true,
          }),
        }).catch(() => {});
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: "Incidencia registrada y notificada a los supervisores.",
      incident: {
        type,
        time: timeFormatted,
        isShiftActive,
      },
    });
  } catch (error: any) {
    console.error("Error al registrar incidencia GPS:", error);
    return NextResponse.json(
      { error: "Error interno al registrar incidencia GPS", detail: error.message },
      { status: 500 }
    );
  }
}
