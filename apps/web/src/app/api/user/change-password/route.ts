import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@asistencias/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión para continuar." },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "La contraseña actual y la nueva son requeridas." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 8 caracteres." },
        { status: 400 }
      );
    }

    // Obtener el usuario de la DB
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado." },
        { status: 404 }
      );
    }

    // Verificar la contraseña actual
    if (user.passwordHash) {
      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "La contraseña actual es incorrecta." },
          { status: 400 }
        );
      }
    } else {
      // Si el usuario no tiene contraseña (ingresó con otro proveedor tal vez), 
      // y está intentando cambiarla, podríamos permitirlo o requerir flujo diferente.
      // Asumiremos que si no tiene passwordHash, algo está mal, ya que usamos credentials.
      return NextResponse.json(
        { error: "Tu cuenta no tiene una contraseña configurada." },
        { status: 400 }
      );
    }

    // Hashear la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Actualizar la contraseña en la DB
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    return NextResponse.json({ success: true, message: "Contraseña actualizada exitosamente." });
  } catch (error: any) {
    console.error("Error al cambiar contraseña:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al procesar la solicitud." },
      { status: 500 }
    );
  }
}
