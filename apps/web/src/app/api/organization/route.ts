import { auth } from "@/auth";
import { prisma } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const UpdateOrganizationSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  type: z.enum(["EMPRESA", "COLEGIO"]).default("EMPRESA"),
  logoUrl: z.string().nullable().optional(),
  settings: z
    .object({
      ruc: z.string().optional().nullable(),
      brandColor: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      footerText: z.string().optional().nullable(),
      grace_period_minutes: z.number().min(1).max(60).optional().nullable(),
      tolerance_minutes: z.number().min(0).max(120).optional().nullable(),
      timezone: z.string().optional().nullable(),
    })
    .passthrough()
    .optional(),
});

// GET /api/organization - Obtener datos de la organización actual
export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      include: {
        _count: {
          select: {
            users: { where: { isActive: true } },
            locations: { where: { isActive: true } },
            schedules: { where: { isActive: true } },
            attendances: true,
          },
        },
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ organization: org });
  } catch (error: any) {
    console.error("[ORGANIZATION_GET_ERROR]", error);
    return NextResponse.json({ error: "Error al obtener la organización" }, { status: 500 });
  }
}

// PATCH /api/organization - Actualizar logo y datos de la organización
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo los administradores pueden modificar la configuración" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = UpdateOrganizationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, type, logoUrl, settings } = parsed.data;

    // Obtener configuración previa para merge
    const currentOrg = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { settings: true },
    });

    const currentSettings =
      typeof currentOrg?.settings === "object" && currentOrg?.settings !== null
        ? (currentOrg.settings as Record<string, any>)
        : {};

    const updatedSettings = {
      ...currentSettings,
      ...(settings || {}),
    };

    const updated = await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: {
        name,
        type,
        logoUrl: logoUrl !== undefined ? logoUrl : undefined,
        settings: updatedSettings,
      },
    });

    return NextResponse.json({
      success: true,
      organization: updated,
      message: "Configuración y personalización de empresa actualizada con éxito",
    });
  } catch (error: any) {
    console.error("[ORGANIZATION_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Error al actualizar la organización" }, { status: 500 });
  }
}
