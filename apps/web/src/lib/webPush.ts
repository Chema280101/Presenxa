import webpush from "web-push";
import { prisma } from "@asistencias/db";

// Configure VAPID details if environment variables are available
const vapidPublicKey =
  process.env.VAPID_PUBLIC_KEY ||
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@asistcontrol.com";

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (err) {
    console.warn("[WebPush] Error al configurar VAPID details:", err);
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  data?: Record<string, any>;
}

/**
 * Enviar notificación push a todos los dispositivos registrados de un usuario.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;
    const expiredIds: string[] = [];

    const stringifiedPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/api/icon/192",
      badge: payload.badge || "/icon",
      tag: payload.tag || "asistcontrol-alert",
      url: payload.url || "/app",
      data: payload.data || {},
    });

    await Promise.all(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, stringifiedPayload);
          sent++;
        } catch (err: any) {
          failed++;
          // Si el endpoint expiró o fue desuscrito (410 o 404), limpiar de DB
          if (err.statusCode === 410 || err.statusCode === 404) {
            expiredIds.push(sub.id);
          } else {
            console.warn(`[WebPush] Falló envío a sub ${sub.id}:`, err.message);
          }
        }
      })
    );

    if (expiredIds.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: expiredIds } },
      });
    }

    return { sent, failed };
  } catch (error) {
    console.error("[WebPush] Error al despachar notificaciones push a usuario:", error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Enviar notificación push a supervisores y administradores de una organización.
 */
export async function sendPushToSupervisors(
  organizationId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  try {
    const supervisors = await prisma.user.findMany({
      where: {
        organizationId,
        role: { in: ["ADMIN", "SUPERVISOR", "SUPER_ADMIN"] },
        isActive: true,
      },
      select: { id: true },
    });

    let totalSent = 0;
    let totalFailed = 0;

    for (const sup of supervisors) {
      const res = await sendPushToUser(sup.id, payload);
      totalSent += res.sent;
      totalFailed += res.failed;
    }

    return { sent: totalSent, failed: totalFailed };
  } catch (err) {
    console.error("[WebPush] Error al enviar a supervisores:", err);
    return { sent: 0, failed: 0 };
  }
}
