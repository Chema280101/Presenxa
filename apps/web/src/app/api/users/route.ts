import { auth } from "@/auth";
import { prisma, UserRole, AuditAction } from "@asistencias/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import crypto from "node:crypto";
import { generateSignedQrPayload } from "@/lib/qrCrypto";
import { logAuditEvent } from "@/lib/audit";

import { PASSWORD_MIN_LENGTH, validatePasswordStrength } from "@/lib/passwordPolicy";

const optionalUuidOrNull = z
  .string()
  .uuid()
  .optional()
  .nullable()
  .or(z.literal("").transform(() => null));

const CreateUserSchema = z.object({
  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastName: z.string().min(1, "El apellido es obligatorio"),
  email: z.string().email("Correo electrónico inválido"),
  phone: z.string().optional().nullable(),
  documentId: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  role: z.nativeEnum(UserRole).default(UserRole.EMPLEADO),
  locationId: optionalUuidOrNull,
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)
    .refine((val) => validatePasswordStrength(val).isValid, {
      message: "La contraseña debe incluir al menos un número y un símbolo (@#$%!).",
    })
    .optional()
    .nullable(),
  scheduleId: optionalUuidOrNull,
  nfcCardUid: z.string().optional().nullable(),
  departmentId: optionalUuidOrNull,
});

function buildUsersWhereClause(
  organizationId: string,
  userRole: string,
  supervisorLocationId: string | undefined,
  searchParams: URLSearchParams
) {
  const search = searchParams.get("search") || "";
  const role = searchParams.get("role") as UserRole | null;
  const locationId = searchParams.get("locationId");
  const departmentId = searchParams.get("departmentId");
  const isActiveParam = searchParams.get("isActive");

  const where: any = { organizationId };

  if (userRole === "SUPERVISOR" && supervisorLocationId) {
    where.locationId = supervisorLocationId;
  } else if (locationId) {
    where.locationId = locationId;
  }

  if (departmentId && departmentId !== "ALL") {
    where.departmentId = departmentId;
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

  return where;
}

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
  const where = buildUsersWhereClause(
    session.user.organizationId,
    userRole,
    supervisorLocationId,
    searchParams
  );

  try {
    const hasPagination = searchParams.has("page");
    const parsedPage = Number.parseInt(searchParams.get("page") || "1", 10);
    const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const parsedPageSize = Number.parseInt(searchParams.get("pageSize") || "25", 10);
    const pageSize = Number.isNaN(parsedPageSize)
      ? 25
      : Math.min(100, Math.max(10, parsedPageSize));

    const limitParam = searchParams.get("limit");
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    const legacyTake =
      parsedLimit && !Number.isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;

    const take = hasPagination ? pageSize : legacyTake;
    const skip = hasPagination ? (page - 1) * pageSize : undefined;

    const baseOrgWhere: any = { organizationId: session.user.organizationId };
    if (userRole === "SUPERVISOR" && supervisorLocationId) {
      baseOrgWhere.locationId = supervisorLocationId;
    }

    const [users, total, orgTotal, orgActive, orgEmployees, orgSupervisors] =
      await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take,
          orderBy: [{ isActive: "desc" }, { firstName: "asc" }],
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            documentId: true,
            birthDate: true,
            role: true,
            isActive: true,
            qrToken: true,
            qrGeneratedAt: true,
            nfcCardUid: true,
            locationId: true,
            location: {
              select: { id: true, name: true },
            },
            departmentId: true,
            department: {
              select: { id: true, name: true },
            },
            userSchedules: {
              where: {
                OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
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
        }),
        hasPagination ? prisma.user.count({ where }) : Promise.resolve(0),
        hasPagination ? prisma.user.count({ where: baseOrgWhere }) : Promise.resolve(0),
        hasPagination
          ? prisma.user.count({ where: { ...baseOrgWhere, isActive: true } })
          : Promise.resolve(0),
        hasPagination
          ? prisma.user.count({ where: { ...baseOrgWhere, role: UserRole.EMPLEADO } })
          : Promise.resolve(0),
        hasPagination
          ? prisma.user.count({
              where: {
                ...baseOrgWhere,
                role: { in: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.SUPER_ADMIN] },
              },
            })
          : Promise.resolve(0),
      ]);

    const usersWithSignedQr = users.map((u) => {
      return {
        ...u,
        signedQrPayload: generateSignedQrPayload(u.id, u.qrToken),
      };
    });

    if (hasPagination) {
      return NextResponse.json({
        users: usersWithSignedQr,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
        metrics: {
          total: orgTotal,
          active: orgActive,
          employees: orgEmployees,
          supervisors: orgSupervisors,
        },
      });
    }

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

  const userRole = (session.user as any).role;
  if (!["ADMIN", "SUPER_ADMIN", "SUPERVISOR"].includes(userRole)) {
    return NextResponse.json(
      { error: "No tienes permiso para crear usuarios" },
      { status: 403 }
    );
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

    // Validación jerárquica de roles
    const ROLE_HIERARCHY: Record<string, number> = {
      EMPLEADO: 0,
      SUPERVISOR: 1,
      ADMIN: 2,
      SUPER_ADMIN: 3,
    };
    const callerLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const targetLevel = ROLE_HIERARCHY[data.role] ?? 0;
    if (targetLevel > callerLevel) {
      return NextResponse.json(
        { error: "No puedes crear un usuario con un rol superior al tuyo" },
        { status: 403 }
      );
    }

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
          birthDate: data.birthDate && data.birthDate.trim() !== "" ? new Date(data.birthDate) : null,
          role: data.role,
          locationId: data.locationId || null,
          departmentId: data.departmentId || null,
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

    const { passwordHash: _, ...safeUser } = newUser;

    return NextResponse.json(
      {
        user: {
          ...safeUser,
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
