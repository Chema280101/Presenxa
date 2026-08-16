import { prisma, AuditAction } from "@asistencias/db";

export interface LogAuditParams {
  organizationId?: string | null;
  userId?: string | null;
  action: AuditAction;
  entityType: "ATTENDANCE" | "USER" | "LOCATION" | "KIOSK" | "SCHEDULE" | "SYSTEM";
  entityId?: string | null;
  oldData?: any;
  newData?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  req?: Request;
}

/**
 * Registra un evento de auditoría inmutable en la base de datos PostgreSQL.
 */
export async function logAuditEvent(params: LogAuditParams): Promise<void> {
  try {
    let ip = params.ipAddress || null;
    let ua = params.userAgent || null;

    if (params.req) {
      const forwarded = params.req.headers.get("x-forwarded-for");
      ip = forwarded ? forwarded.split(",")[0].trim() : ip || "127.0.0.1";
      ua = params.req.headers.get("user-agent") || ua;
    }

    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId || null,
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        oldData: params.oldData ? JSON.parse(JSON.stringify(params.oldData)) : undefined,
        newData: params.newData ? JSON.parse(JSON.stringify(params.newData)) : undefined,
        ipAddress: ip,
        userAgent: ua,
      },
    });
  } catch (error: any) {
    console.error("[Audit] Error al registrar evento de auditoría:", error.message);
  }
}
