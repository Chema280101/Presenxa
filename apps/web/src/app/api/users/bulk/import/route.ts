import { auth } from "@/auth";
import { prisma, UserRole, AuditAction } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { logAuditEvent } from "@/lib/audit";

const UserImportItemSchema = z.object({
  rowNumber: z.number().optional(),
  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastName: z.string().min(1, "El apellido es obligatorio"),
  email: z.string().email("Correo electrónico inválido"),
  documentId: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  role: z.nativeEnum(UserRole).default(UserRole.EMPLEADO),
  locationId: z.string().uuid().optional().nullable(),
  scheduleId: z.string().uuid().optional().nullable(),
});

const BulkImportSchema = z.object({
  users: z.array(UserImportItemSchema).min(1, "Debe enviar al menos un registro para importar"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userRole = (session.user as any).role;
  const supervisorLocationId = (session.user as any).locationId;

  if (userRole === "EMPLEADO") {
    return NextResponse.json(
      { error: "No tienes permiso para importar colaboradores" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = BulkImportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Estructura de datos inválida", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { users } = parsed.data;

    // Detectar correos duplicados dentro del lote mismo
    const seenEmails = new Set<string>();
    const duplicateInBatchEmails = new Set<string>();
    users.forEach((u) => {
      const emailLower = u.email.toLowerCase().trim();
      if (seenEmails.has(emailLower)) {
        duplicateInBatchEmails.add(emailLower);
      } else {
        seenEmails.add(emailLower);
      }
    });

    // Consultar correos ya existentes en la BD
    const allEmails = Array.from(seenEmails);
    const existingUsers = await prisma.user.findMany({
      where: {
        email: { in: allEmails },
      },
      select: { email: true },
    });
    const existingEmailSet = new Set(existingUsers.map((u) => u.email.toLowerCase()));

    // Verificar sedes y horarios existentes para la organización
    const orgLocations = await prisma.location.findMany({
      where: { organizationId: session.user.organizationId, isActive: true },
      select: { id: true },
    });
    const validLocationIds = new Set(orgLocations.map((l) => l.id));

    const orgSchedules = await prisma.schedule.findMany({
      where: { organizationId: session.user.organizationId, isActive: true },
      select: { id: true },
    });
    const validScheduleIds = new Set(orgSchedules.map((s) => s.id));

    const createdUsers: Array<{ id: string; email: string }> = [];
    const errors: Array<{ row: number; email: string; error: string }> = [];

    // Procesar cada usuario de forma segura
    for (let i = 0; i < users.length; i++) {
      const item = users[i];
      const rowNum = item.rowNumber ?? i + 1;
      const emailLower = item.email.toLowerCase().trim();

      if (duplicateInBatchEmails.has(emailLower)) {
        errors.push({
          row: rowNum,
          email: item.email,
          error: "Correo duplicado en el mismo archivo cargado",
        });
        continue;
      }

      if (existingEmailSet.has(emailLower)) {
        errors.push({
          row: rowNum,
          email: item.email,
          error: "Ya existe un usuario con este correo electrónico en el sistema",
        });
        continue;
      }

      // Restricción para supervisor
      let targetLocationId = item.locationId;
      if (userRole === "SUPERVISOR") {
        targetLocationId = supervisorLocationId;
      } else if (targetLocationId && !validLocationIds.has(targetLocationId)) {
        errors.push({
          row: rowNum,
          email: item.email,
          error: "La sede indicada no pertenece a la organización o no existe",
        });
        continue;
      }

      let targetScheduleId = item.scheduleId;
      if (targetScheduleId && !validScheduleIds.has(targetScheduleId)) {
        targetScheduleId = null; // No bloquear la creación si el horario es opcional, o registrar aviso
      }

      // Supervisor no puede crear Administradores
      const targetRole = userRole === "SUPERVISOR" && item.role === UserRole.ADMIN 
        ? UserRole.EMPLEADO 
        : item.role;

      try {
        const qrToken = crypto.randomUUID();
        const created = await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              organizationId: session.user.organizationId,
              firstName: item.firstName.trim(),
              lastName: item.lastName.trim(),
              email: emailLower,
              documentId: item.documentId?.trim() || null,
              phone: item.phone?.trim() || null,
              role: targetRole,
              locationId: targetLocationId || null,
              qrToken,
              isActive: true,
            },
          });

          if (targetScheduleId) {
            await tx.userSchedule.create({
              data: {
                userId: user.id,
                scheduleId: targetScheduleId,
                validFrom: new Date(),
              },
            });
          }

          return user;
        });

        createdUsers.push({ id: created.id, email: created.email });
        existingEmailSet.add(emailLower); // Prevenir duplicados posteriores
      } catch (err: any) {
        errors.push({
          row: rowNum,
          email: item.email,
          error: err.message || "Error al crear registro en la base de datos",
        });
      }
    }

    // Auditoría si se crearon usuarios
    if (createdUsers.length > 0) {
      await logAuditEvent({
        organizationId: session.user.organizationId,
        userId: session.user.id,
        action: AuditAction.USER_CREATED,
        entityType: "USER",
        newData: {
          bulkCount: createdUsers.length,
          totalSubmitted: users.length,
          failedCount: errors.length,
          executedBy: session.user.email,
        },
        req,
      });
    }

    return NextResponse.json({
      success: true,
      total: users.length,
      created: createdUsers.length,
      failed: errors.length,
      errors,
    });
  } catch (error: any) {
    console.error("Error en bulk import:", error);
    return NextResponse.json({ error: "Error interno al procesar importación" }, { status: 500 });
  }
}
