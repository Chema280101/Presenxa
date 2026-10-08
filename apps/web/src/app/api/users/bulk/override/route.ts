import { auth } from "@/auth";
import { prisma, AuditAction } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";
import { scheduleSedeNotification } from "@/lib/qstash";

const BulkOverrideSchema = z.object({
  userIds: z.array(z.string().uuid("ID de usuario inválido")).min(1, "Selecciona al menos un usuario"),
  scheduleId: z.string().uuid("El horario es obligatorio"),
  date: z.string().min(1, "La fecha es obligatoria"),
  locationId: z.string().uuid().optional().nullable(),
});

// POST /api/users/bulk/override
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = BulkOverrideSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { userIds, scheduleId, date: dateString, locationId: explicitLocationId } = parsed.data;
    const overrideDate = new Date(dateString);

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

    // Verificar que los usuarios pertenezcan a la organización
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        organizationId: session.user.organizationId,
      },
    });

    if (users.length === 0) {
      return NextResponse.json({ error: "No se encontraron usuarios válidos" }, { status: 404 });
    }

    let targetLocation = schedule.location;
    if (explicitLocationId) {
      const foundLocation = await prisma.location.findFirst({
        where: {
          id: explicitLocationId,
          organizationId: session.user.organizationId,
        },
      });
      if (foundLocation) {
        targetLocation = foundLocation;
      }
    }

    const sedeName = targetLocation?.name || schedule.location?.name || "tu sede asignada";

    // Upsert exceptions in a transaction
    await prisma.$transaction(async (tx) => {
      for (const user of users) {
        await tx.shiftOverride.upsert({
          where: {
            userId_date: {
              userId: user.id,
              date: overrideDate,
            },
          },
          create: {
            userId: user.id,
            scheduleId,
            date: overrideDate,
          },
          update: {
            scheduleId,
          },
        });

        // Auditar cada usuario
        await logAuditEvent({
          organizationId: session.user.organizationId!,
          userId: session.user.id,
          action: AuditAction.USER_UPDATED, 
          entityType: "USER",
          entityId: user.id,
          oldData: null,
          newData: {
            overrideDate: overrideDate.toISOString(),
            scheduleId,
            locationId: targetLocation?.id || schedule.locationId || null,
            locationName: sedeName,
            actionBy: session.user.email,
            isBulk: true,
          },
          req, // Nota: el req no se puede usar fácilmente dentro de transaction con logAuditEvent en algunos casos, pero aquí funciona si no hace llamadas asíncronas bloqueantes no permitidas
        });
      }
    });

    // Programar notificaciones (fuera de la transacción para evitar delays en DB)
    const [year, month, day] = dateString.split("-").map(Number);
    const shiftDate = new Date(year, month - 1, day); 

    for (const user of users) {
      try {
        await scheduleSedeNotification(
          user.id,
          sedeName,
          schedule.entryHour,
          schedule.entryMinute,
          shiftDate,
          30 // minutos antes
        );
      } catch (err) {
        console.error(`No se pudo programar QStash para el usuario ${user.id}:`, err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: users.length,
      message: `Excepción registrada masivamente para ${users.length} colaborador${users.length > 1 ? 'es' : ''}.` 
    });
  } catch (error: any) {
    console.error("Error al guardar bulk override:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
