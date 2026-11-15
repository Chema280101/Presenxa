import { prisma } from "@asistencias/db";
import { NotificationType } from "@prisma/client";
import { sendPushToSupervisors, sendPushToUser } from "@/lib/webPush";

const SUPERVISOR_ROLES = ["ADMIN", "SUPERVISOR", "SUPER_ADMIN"] as const;

export interface OrgNotificationInput {
  organizationId: string;
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export interface UserNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

/**
 * Persiste una notificación en BD para todos los admins/supervisores activos de la
 * organización y despacha Web Push en paralelo de forma segura.
 */
export async function notifySupervisorsInOrg(input: OrgNotificationInput): Promise<void> {
  try {
    const supervisors = await prisma.user.findMany({
      where: {
        organizationId: input.organizationId,
        role: { in: [...SUPERVISOR_ROLES] },
        isActive: true,
      },
      select: { id: true },
    });

    const mergedData = {
      ...(input.data ?? {}),
      ...(input.url ? { url: input.url } : {}),
    };

    if (supervisors.length > 0) {
      await prisma.notification.createMany({
        data: supervisors.map((sup) => ({
          userId: sup.id,
          type: input.type,
          title: input.title,
          body: input.body,
          data: mergedData as any,
        })),
      });
    }

    await sendPushToSupervisors(input.organizationId, {
      title: input.title,
      body: input.body,
      url: input.url || "/asistencias",
      tag: input.tag,
      data: mergedData,
    });
  } catch (err) {
    console.error("[Notifications] Error notificando a supervisores:", err);
  }
}

/**
 * Persiste una notificación en BD para un colaborador y despacha Web Push de forma segura.
 */
export async function notifyUserWithPush(input: UserNotificationInput): Promise<void> {
  try {
    const mergedData = {
      ...(input.data ?? {}),
      ...(input.url ? { url: input.url } : {}),
    };

    const created = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: mergedData as any,
      },
    });

    await sendPushToUser(input.userId, {
      title: input.title,
      body: input.body,
      url: input.url || "/app",
      tag: input.tag,
      data: {
        notificationId: created.id,
        ...mergedData,
      },
    });
  } catch (err) {
    console.error("[Notifications] Error notificando al usuario:", err);
  }
}
