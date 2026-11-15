import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import webpush from "web-push";
import { prisma } from "@asistencias/db";
import { z } from "zod";

const QStashPayloadSchema = z.object({
  userId: z.string().uuid("ID de usuario inválido"),
  sedeName: z.string().min(1, "Nombre de sede requerido"),
  entryTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:mm esperado"),
});

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
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
    }

    const parseResult = QStashPayloadSchema.safeParse(parsedJson);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Payload inválido", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { userId, sedeName, entryTime } = parseResult.data;

    // Verificar existencia del usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      console.warn(`[QStash Webhook] Usuario ${userId} inactivo o no existe.`);
      return NextResponse.json({ success: false, message: "Usuario inactivo o no encontrado" });
    }

    console.log(`[QStash Webhook] Procesando notificación para usuario ${userId} en ${sedeName}`);

    // 1. Crear la notificación en la Base de Datos
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: "CAMBIO_SEDE_HORARIO",
        title: "Recordatorio de Sede Asignada",
        body: `Recuerda que hoy tu turno empieza a las ${entryTime} en ${sedeName}. ¡Te esperamos!`,
        data: { sedeName, entryTime },
      },
    });

    // 2. Buscar las suscripciones Push del usuario
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length > 0) {
      const vapidPublic =
        process.env.VAPID_PUBLIC_KEY ||
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
      const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@asistencias.com";

      if (!vapidPublic || !vapidPrivate) {
        console.warn("[QStash Webhook] Faltan variables VAPID, no se enviarán push.");
      } else {
        webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

        const pushPromises = subscriptions.map((sub) =>
          webpush
            .sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify({
                title: notification.title,
                body: notification.body,
                url: "/app",
                data: {
                  notificationId: notification.id,
                  type: "CAMBIO_SEDE_HORARIO",
                  sedeName,
                  entryTime,
                },
              })
            )
            .catch((err) => {
              console.error(`Error enviando push a suscripción ${sub.id}:`, err);
              // Limpiar endpoints revocados o caducados (404 o 410)
              if (err.statusCode === 410 || err.statusCode === 404) {
                return prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => null);
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
