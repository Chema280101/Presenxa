import { NextResponse } from "next/server";
import { prisma } from "@asistencias/db";
import { auth } from "@/auth";
import { logAuditEvent } from "@/lib/audit";
import { parsePaginationParams, buildPaginationMeta } from "@/lib/pagination";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const { hasPagination, page, pageSize, skip, take } = parsePaginationParams(
      searchParams,
      25
    );

    const where: any = { organizationId };
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        include: {
          _count: {
            select: { users: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      hasPagination ? prisma.department.count({ where }) : Promise.resolve(0),
    ]);

    if (hasPagination) {
      return NextResponse.json({
        departments,
        pagination: buildPaginationMeta(page, pageSize, total),
      });
    }

    return NextResponse.json({ departments });
  } catch (error) {
    console.error("Error en GET /api/departments:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    const newDepartment = await prisma.department.create({
      data: {
        name: name.trim(),
        organizationId: session.user.organizationId,
      },
    });

    await logAuditEvent({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "ENTITY_CREATED",
      entityType: "DEPARTMENT",
      entityId: newDepartment.id,
      newData: { name: newDepartment.name },
      req,
    });

    return NextResponse.json({ department: newDepartment });
  } catch (error) {
    console.error("Error en POST /api/departments:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
