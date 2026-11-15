import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { UserRole } from "@asistencias/db";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  locationId?: string;
}

export type AuthResult =
  | { success: true; user: AuthenticatedUser }
  | { success: false; response: NextResponse };

/**
 * Valida que la sesión exista y que el usuario tenga uno de los roles permitidos.
 * Por defecto solo permite personal administrativo y supervisores.
 */
export async function requireAuthUser(
  allowedRoles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPERVISOR]
): Promise<AuthResult> {
  const session = await auth();

  if (!session?.user?.id || !session?.user?.organizationId) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "No autenticado. Inicie sesión para continuar." },
        { status: 401 }
      ),
    };
  }

  const role = session.user.role as UserRole;

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Acceso denegado: permisos insuficientes." },
        { status: 403 }
      ),
    };
  }

  return {
    success: true,
    user: {
      id: session.user.id,
      email: session.user.email || "",
      name: session.user.name || "",
      role,
      organizationId: session.user.organizationId,
      organizationName: session.user.organizationName,
      locationId: session.user.locationId,
    },
  };
}
