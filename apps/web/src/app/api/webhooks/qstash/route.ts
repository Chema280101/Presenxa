import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import webpush from "web-push";
// Asumo que tienes una exportación de prisma o db en algún lugar.
// Ajusta esta importación a cómo lo estés usando en tu proyecto, por ejemplo:
import { PrismaClient } from "@prisma/client";

// Inicializar prisma localmente para el webhook (o usa tu instancia global)
const prisma = new PrismaClient();

// Configuración de Web Push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@asistencias.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

// El Payload que esperamos de Upstash
interface QStashPayload {
  userId: string;
  sedeName: string;
  entryTime: string; // ej: "09:00"
}

/**
 * Este es el Endpoint que Upstash va a llamar automáticamente.
 * `verifySignature` se encarga de proteger la ruta para que NADIE más pueda llamarla
 * a menos que tenga las llaves criptográficas de Upstash.
 */
async function handler(req: Request) {
  try {
    const body: QStashPayload = await req.json();
    const { userId, sedeName, entryTime } = body;

    console.log(`[QStash Webhook] Procesando notificación para usuario ${userId} en ${sedeName}`);

    // 1. Crear la notificación en la Base de Datos para que quede el registro
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: "CAMBIO_SEDE_HORARIO", // El enum que agregamos hace poco
        title: "Recordatorio de Sede Asignada",
        body: `Recuerda que hoy tu turno empieza a las ${entryTime} en ${sedeName}. ¡Te esperamos!`,
      },
    });

    // 2. Buscar las suscripciones Push (dispositivos) del usuario
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    // 3. Enviar la alerta Web Push a todos sus dispositivos
    const pushPromises = subscriptions.map((sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      return webpush
        .sendNotification(
          pushConfig,
          JSON.stringify({
            title: notification.title,
            body: notification.body,
            url: "/dashboard", // a donde lo lleva si toca la notificación
          })
        )
        .catch((err) => {
          console.error(`Error enviando push a suscripción ${sub.id}:`, err);
          // Si el endpoint ya no existe (usuario revocó permisos), deberíamos eliminarlo
          if (err.statusCode === 410) {
            return prisma.pushSubscription.delete({ where: { id: sub.id } });
          }
        });
    });

    await Promise.all(pushPromises);

    return NextResponse.json({ success: true, message: "Notificaciones enviadas" });
  } catch (error) {
    console.error("[QStash Webhook] Fallo crítico:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);
