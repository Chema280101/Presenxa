import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@asistencias/db";
import { z } from "zod";

const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
  userAgent: z.string().optional(),
});

export async function GET() {
  const publicKey =
    process.env.VAPID_PUBLIC_KEY ||
    process.env.VAPID_PUBLIC_KEY ||
    "";
  return NextResponse.json({ publicKey });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Formato de suscripción inválido", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { endpoint, keys } = parsed.data.subscription;

    const saved = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: session.user.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: parsed.data.userAgent || null,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: parsed.data.userAgent || null,
      },
    });

    return NextResponse.json({
      success: true,
      subscriptionId: saved.id,
      message: "Suscripción push registrada correctamente",
    });
  } catch (error: any) {
    console.error("Error al registrar suscripción push:", error);
    return NextResponse.json(
      { error: "Error al guardar suscripción push", details: error.message },
      { status: 500 }
    );
  }
}
