import { auth } from "@/auth";
import { prisma, AuditAction } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";
import { scheduleSedeNotification } from "@/lib/qstash";

const OverrideSchema = z.object({
  scheduleId: z.string().uuid("El horario es obligatorio"),
  date: z.string().min(1, "La fecha es obligatoria"),
});

// POST /api/users/[id]/override
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: userId } = await params;

  try {
    const body = await req.json();
    const parsed = OverrideSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { scheduleId, date: dateString } = parsed.data;
    const overrideDate = new Date(dateString);

    // Multi-tenant: Verificar usuario
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: session.user.organizationId,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Verificar el horario seleccionado y traer la sede
    const schedule = await prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        organizationId: session.user.organizationId,
      },
      include: {
        location: true,
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: "Horario no encontrado" }, { status: 404 });
    }

    // Crear o actualizar la excepción
    const override = await prisma.shiftOverride.upsert({
      where: {
        userId_date: {
          userId,
          date: overrideDate,
        },
      },
      create: {
        userId,
        scheduleId,
        date: overrideDate,
      },
      update: {
        scheduleId,
      },
      include: {
        schedule: {
          include: { location: true },
        },
      },
    });

    // Auditar
    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: AuditAction.USER_UPDATED, 
      entityType: "USER",
      entityId: userId,
      oldData: null,
      newData: {
        overrideDate: overrideDate.toISOString(),
        scheduleId,
        actionBy: session.user.email,
      },
      req,
    });

    // Programar la notificación con QStash
    const sedeName = schedule.location?.name || "tu sede asignada";
    
    // Asumiendo que overrideDate viene como fecha "YYYY-MM-DD"
    const [year, month, day] = dateString.split("-").map(Number);
    const shiftDate = new Date(year, month - 1, day); 

    try {
      await scheduleSedeNotification(
        userId,
        sedeName,
        schedule.entryHour,
        schedule.entryMinute,
        shiftDate,
        30 // minutos antes
      );
    } catch (err) {
      console.error("No se pudo programar QStash (¿Tokens configurados?):", err);
    }

    return NextResponse.json({ 
      success: true, 
      override, 
      message: "Excepción registrada y alerta programada." 
    });
  } catch (error: any) {
    console.error("Error al guardar override:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
