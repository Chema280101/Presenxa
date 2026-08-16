import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, NotificationType } from "@asistencias/db";
import { sendPushToUser, sendPushToSupervisors } from "@/lib/webPush";
import { z } from "zod";

const sendNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1),
  body: z.string().min(1),
  data: z.record(z.any()).optional(),
  notifySupervisors: z.boolean().optional().default(false),
  organizationId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  // Check authorization: either internal worker secret OR admin session
  const workerSecretHeader = req.headers.get("x-worker-secret");
  const expectedSecret = process.env.GEO_WORKER_SECRET || "dev-worker-secret";
  const isWorkerAuth = workerSecretHeader === expectedSecret;

  let session = null;
  if (!isWorkerAuth) {
    session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    const body = await req.json();
    const parsed = sendNotificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de notificación inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { userId, type, title, body: notifBody, data, notifySupervisors, organizationId } = parsed.data;

    // 1. Create DB notification record
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body: notifBody,
        data: data || {},
      },
    });

    // 2. Dispatch Web Push notification to user
    const pushResult = await sendPushToUser(userId, {
      title,
      body: notifBody,
      data: {
        notificationId: notification.id,
        type,
        ...data,
      },
    });

    // 3. If requested (e.g. abandonment or severe alert), also notify supervisors
    let supervisorPushResult = null;
    if (notifySupervisors) {
      let targetOrgId = organizationId;
      if (!targetOrgId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { organizationId: true },
        });
        targetOrgId = user?.organizationId;
      }

      if (targetOrgId) {
        supervisorPushResult = await sendPushToSupervisors(targetOrgId, {
          title: `[Alerta] ${title}`,
          body: notifBody,
          data: {
            notificationId: notification.id,
            type,
            userId,
            ...data,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      notificationId: notification.id,
      userPush: pushResult,
      supervisorPush: supervisorPushResult,
    });
  } catch (error: any) {
    console.error("Error al despachar notificación:", error);
    return NextResponse.json(
      { error: "Error al enviar notificación", details: error.message },
      { status: 500 }
    );
  }
}
