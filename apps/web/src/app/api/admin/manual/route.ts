import { auth } from "@/auth";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const role = (session.user as any)?.role;
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "SUPERADMIN"].includes(role);

  if (!isAdmin) {
    return NextResponse.json(
      { error: "Acceso denegado: solo administradores pueden descargar el manual del sistema" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const isInline = searchParams.get("inline") === "1";

  // Buscar el archivo PDF en public/docs
  const possiblePaths = [
    path.join(process.cwd(), "public", "docs", "Presenxa_Guia_de_Usuario_Definitiva.pdf"),
    path.join(process.cwd(), "public", "docs", "manual-admin-presenxa.pdf"),
  ];

  let targetPath: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      targetPath = p;
      break;
    }
  }

  if (!targetPath) {
    return NextResponse.json(
      { error: "El archivo del manual no se encuentra disponible en el servidor" },
      { status: 404 }
    );
  }

  try {
    const fileBuffer = fs.readFileSync(targetPath);
    const dispositionType = isInline ? "inline" : "attachment";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${dispositionType}; filename="Manual_Administrador_Hotel_Italia.pdf"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("[ManualDownloadAPI] Error al leer el archivo PDF:", error);
    return NextResponse.json(
      { error: "Error al procesar la descarga del manual" },
      { status: 500 }
    );
  }
}
