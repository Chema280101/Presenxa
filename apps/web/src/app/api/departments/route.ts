import { NextResponse } from "next/server";
import { prisma } from "@asistencias/db";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    const departments = await prisma.department.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'desc' }
    });

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

    return NextResponse.json({ department: newDepartment });
  } catch (error) {
    console.error("Error en POST /api/departments:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
