import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import webpush from "web-push";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// El Payload que esperamos de Upstash
interface QStashPayload {
  userId: string;
  sedeName: string;
  entryTime: string; // ej: "09:00"
}

export async function POST(req: Request) {
  // ── Verificar firma de QStash manualmente (lazy) ───────────────
  const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!currentKey || !nextKey) {
    console.error("[QStash Webhook] Signing keys no configuradas.");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const signature = req.headers.get("upstash-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const rawBody = await req.text();

  const receiver = new Receiver({
    currentSigningKey: currentKey,
    nextSigningKey: nextKey,
  });

  try {
    await receiver.verify({ signature, body: rawBody });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ── Procesar el payload ─────────────────────────────────────────
  try {
    const body: QStashPayload = JSON.parse(rawBody);
    const { userId, sedeName, entryTime } = body;

    console.log(`[QStash Webhook] Procesando notificación para usuario ${userId} en ${sedeName}`);

    // 1. Crear la notificación en la Base de Datos
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: "CAMBIO_SEDE_HORARIO",
        title: "Recordatorio de Sede Asignada",
        body: `Recuerda que hoy tu turno empieza a las ${entryTime} en ${sedeName}. ¡Te esperamos!`,
      },
    });

    // 2. Buscar las suscripciones Push del usuario
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length > 0) {
      // Configurar Web Push solo si hay suscripciones y keys disponibles
      const vapidPublic = process.env.VAPID_PUBLIC_KEY;
      const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
      const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@asistencias.com";

      if (!vapidPublic || !vapidPrivate) {
        console.error("[QStash Webhook] Faltan variables VAPID, no se enviarán push.");
      } else {
        webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

        const pushPromises = subscriptions.map((sub) =>
          webpush
            .sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify({
                title: notification.title,
                body: notification.body,
                url: "/dashboard",
              })
            )
            .catch((err) => {
              console.error(`Error enviando push a suscripción ${sub.id}:`, err);
              if (err.statusCode === 410) {
                return prisma.pushSubscription.delete({ where: { id: sub.id } });
              }
            })
        );

        await Promise.all(pushPromises);
      }
    }

    return NextResponse.json({ success: true, message: "Notificaciones enviadas" });
  } catch (error) {
    console.error("[QStash Webhook] Fallo crítico:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
