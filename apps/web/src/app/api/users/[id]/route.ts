import { auth } from "@/auth";
import { prisma, UserRole, AuditAction } from "@asistencias/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";

const UpdateUserSchema = z.object({
  firstName: z.string().min(1, "El nombre es obligatorio").optional(),
  lastName: z.string().min(1, "El apellido es obligatorio").optional(),
  email: z.string().email("Correo electrónico inválido").optional(),
  phone: z.string().optional().nullable(),
  documentId: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  role: z.nativeEnum(UserRole).optional(),
  locationId: z.string().uuid().optional().nullable(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional().nullable(),
  scheduleId: z.string().uuid().optional().nullable(),
  nfcCardUid: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET /api/users/[id]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const user = await prisma.user.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
      include: {
        location: true,
        userSchedules: {
          include: {
            schedule: true,
          },
        },
        attendances: {
          orderBy: { date: "desc" },
          take: 10,
          include: {
            location: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("Error al obtener detalle de usuario:", error);
    return NextResponse.json({ error: "Error al obtener usuario" }, { status: 500 });
  }
}

// PUT /api/users/[id]
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = UpdateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Multi-tenant: Verificar que el usuario pertenezca a la organización
    const existing = await prisma.user.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Verificar unicidad de correo si cambió
    if (data.email && data.email.toLowerCase() !== existing.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      if (emailTaken) {
        return NextResponse.json(
          { error: "Ya existe otro usuario con este correo" },
          { status: 409 }
        );
      }
    }

    // Verificar unicidad de tarjeta NFC si cambió
    if (data.nfcCardUid && data.nfcCardUid.trim() !== "" && data.nfcCardUid.trim() !== existing.nfcCardUid) {
      const nfcTaken = await prisma.user.findUnique({
        where: { nfcCardUid: data.nfcCardUid.trim() },
      });
      if (nfcTaken && nfcTaken.id !== id) {
        return NextResponse.json(
          { error: "Ya existe otro usuario con esta tarjeta NFC asignada" },
          { status: 409 }
        );
      }
    }

    const updateData: any = {};
    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.email) updateData.email = data.email.toLowerCase();
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.documentId !== undefined) updateData.documentId = data.documentId;
    if (data.birthDate !== undefined) {
      updateData.birthDate = data.birthDate && data.birthDate.trim() !== "" ? new Date(data.birthDate) : null;
    }
    if (data.role) updateData.role = data.role;
    if (data.locationId !== undefined) updateData.locationId = data.locationId;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.nfcCardUid !== undefined) {
      updateData.nfcCardUid = data.nfcCardUid && data.nfcCardUid.trim() !== "" ? data.nfcCardUid.trim() : null;
    }

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: updateData,
        include: {
          location: true,
        },
      });

      if (data.scheduleId !== undefined) {
        await tx.userSchedule.updateMany({
          where: { userId: id, validUntil: null },
          data: { validUntil: new Date() },
        });

        if (data.scheduleId) {
          await tx.userSchedule.create({
            data: {
              userId: id,
              scheduleId: data.scheduleId,
              validFrom: new Date(),
            },
          });
        }
      }

      return user;
    });

    // ── Log de Auditoría ───────────────────────────────────────────────────
    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: AuditAction.USER_UPDATED,
      entityType: "USER",
      entityId: id,
      oldData: {
        firstName: existing.firstName,
        lastName: existing.lastName,
        email: existing.email,
        role: existing.role,
        isActive: existing.isActive,
        locationId: existing.locationId,
      },
      newData: {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        locationId: updatedUser.locationId,
        updatedBy: session.user.email,
      },
      req,
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 });
  }
}

// DELETE /api/users/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.user.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Soft delete: desactivar usuario y revocar QR
    const user = await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        qrInvalidatedAt: new Date(),
      },
    });

    // ── Log de Auditoría ───────────────────────────────────────────────────
    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: AuditAction.USER_DEACTIVATED,
      entityType: "USER",
      entityId: id,
      oldData: { isActive: existing.isActive, email: existing.email },
      newData: { isActive: false, qrInvalidatedAt: new Date(), deactivatedBy: session.user.email },
      req,
    });

    return NextResponse.json({ message: "Usuario desactivado correctamente", user });
  } catch (error: any) {
    console.error("Error al desactivar usuario:", error);
    return NextResponse.json({ error: "Error al desactivar usuario" }, { status: 500 });
  }
}
