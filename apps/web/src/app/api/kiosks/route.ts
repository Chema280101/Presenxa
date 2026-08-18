import { auth } from "@/auth";
import { prisma } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

const CreateKioskSchema = z.object({
  name: z.string().min(1, "El nombre del kiosk es obligatorio"),
  locationId: z.string().uuid("Selecciona una sede válida"),
});

// GET /api/kiosks
export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userRole = (session.user as any).role;
  if (!["ADMIN", "SUPER_ADMIN", "SUPERVISOR"].includes(userRole)) {
    return NextResponse.json(
      { error: "No tienes permiso para ver los kioskos" },
      { status: 403 }
    );
  }

  try {
    const kiosks = await prisma.kiosk.findMany({
      where: {
        location: {
          organizationId: session.user.organizationId,
        },
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      include: {
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        _count: {
          select: {
            attendances: true,
          },
        },
      },
    });

    return NextResponse.json({ kiosks });
  } catch (error: any) {
    console.error("Error al obtener kiosks:", error);
    return NextResponse.json(
      { error: "Error al obtener dispositivos kiosk" },
      { status: 500 }
    );
  }
}

// POST /api/kiosks
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CreateKioskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, locationId } = parsed.data;

    // Verify location belongs to organization
    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        organizationId: session.user.organizationId,
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "La sede especificada no existe o no pertenece a tu organización" },
        { status: 404 }
      );
    }

    const apiKey = crypto.randomUUID();

    const kiosk = await prisma.kiosk.create({
      data: {
        name,
        locationId,
        apiKey,
        isActive: true,
      },
      include: {
        location: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ kiosk }, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear kiosk:", error);
    return NextResponse.json(
      { error: "Error al crear dispositivo kiosk" },
      { status: 500 }
    );
  }
}
