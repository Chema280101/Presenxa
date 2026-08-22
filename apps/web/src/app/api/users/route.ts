import { auth } from "@/auth";
import { prisma, UserRole, AuditAction } from "@asistencias/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import crypto from "crypto";
import { generateSignedQrPayload } from "@/lib/qrCrypto";
import { logAuditEvent } from "@/lib/audit";

const CreateUserSchema = z.object({
  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastName: z.string().min(1, "El apellido es obligatorio"),
  email: z.string().email("Correo electrónico inválido"),
  phone: z.string().optional().nullable(),
  documentId: z.string().optional().nullable(),
  role: z.nativeEnum(UserRole).default(UserRole.EMPLEADO),
  locationId: z.string().uuid().optional().nullable(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional().nullable(),
  scheduleId: z.string().uuid().optional().nullable(),
  nfcCardUid: z.string().optional().nullable(),
});

// GET /api/users
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userRole = (session.user as any).role;
  const supervisorLocationId = (session.user as any).locationId;

  if (userRole === "EMPLEADO") {
    return NextResponse.json(
      { error: "No tienes permiso para consultar el directorio de usuarios" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const role = searchParams.get("role") as UserRole | null;
  const locationId = searchParams.get("locationId");
  const isActiveParam = searchParams.get("isActive");

  const where: any = {
    organizationId: session.user.organizationId,
  };

  // RBAC: Supervisor solo puede ver usuarios de su sede
  if (userRole === "SUPERVISOR" && supervisorLocationId) {
    where.locationId = supervisorLocationId;
  } else if (locationId) {
    where.locationId = locationId;
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { documentId: { contains: search, mode: "insensitive" } },
      { nfcCardUid: { contains: search, mode: "insensitive" } },
    ];
  }

  if (role && Object.values(UserRole).includes(role)) {
    where.role = role;
  }

  if (isActiveParam !== null && isActiveParam !== undefined && isActiveParam !== "") {
    where.isActive = isActiveParam === "true";
  }

  try {
    const users = await prisma.user.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { firstName: "asc" }],
      include: {
        location: {
          select: { id: true, name: true },
        },
        userSchedules: {
          where: {
            OR: [
              { validUntil: null },
              { validUntil: { gt: new Date() } }
            ]
          },
          include: {
            schedule: {
              select: {
                id: true,
                name: true,
                entryHour: true,
                entryMinute: true,
                exitHour: true,
                exitMinute: true,
                isSplit: true,
                entryHour2: true,
                entryMinute2: true,
                exitHour2: true,
                exitMinute2: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    const usersWithSignedQr = users.map((u) => {
      const { passwordHash, ...safeUser } = u;
      return {
        ...safeUser,
        signedQrPayload: generateSignedQrPayload(u.id, u.qrToken),
      };
    });

    return NextResponse.json({ users: usersWithSignedQr });
  } catch (error: any) {
    console.error("Error al obtener usuarios:", error);
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
  }
}

// POST /api/users
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CreateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verificar si el correo ya existe
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un usuario con este correo electrónico" },
        { status: 409 }
      );
    }

    if (data.nfcCardUid && data.nfcCardUid.trim() !== "") {
      const existingNfc = await prisma.user.findUnique({
        where: { nfcCardUid: data.nfcCardUid.trim() },
      });
      if (existingNfc) {
        return NextResponse.json(
          { error: "Ya existe un usuario registrado con esta tarjeta NFC" },
          { status: 409 }
        );
      }
    }

    const passwordHash = data.password ? await bcrypt.hash(data.password, 12) : null;
    const qrToken = crypto.randomUUID();

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          organizationId: session.user.organizationId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email.toLowerCase(),
          phone: data.phone || null,
          documentId: data.documentId || null,
          role: data.role,
          locationId: data.locationId || null,
          passwordHash,
          qrToken,
          nfcCardUid: data.nfcCardUid && data.nfcCardUid.trim() !== "" ? data.nfcCardUid.trim() : null,
          isActive: true,
        },
        include: {
          location: true,
        },
      });

      // Asignar horario si fue proporcionado
      if (data.scheduleId) {
        await tx.userSchedule.create({
          data: {
            userId: user.id,
            scheduleId: data.scheduleId,
            validFrom: new Date(),
          },
        });
      }

      return user;
    });

    const signedQrPayload = generateSignedQrPayload(newUser.id, newUser.qrToken);

    // ── Log de Auditoría ───────────────────────────────────────────────────
    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: AuditAction.USER_CREATED,
      entityType: "USER",
      entityId: newUser.id,
      newData: {
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        locationId: newUser.locationId,
        createdBy: session.user.email,
      },
      req,
    });

    return NextResponse.json(
      {
        user: {
          ...newUser,
          signedQrPayload,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });
  }
}
