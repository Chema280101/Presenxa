import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@asistencias/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";

import { checkRateLimit } from "./lib/rateLimit";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const normalizedEmail = email.toLowerCase().trim();

        // Protección contra ataques de fuerza bruta (5 intentos en ventana de 5 minutos por email)
        const rateResult = await checkRateLimit({
          key: `login_attempt:${normalizedEmail}`,
          limit: 5,
          windowSeconds: 300,
        });

        if (!rateResult.success) {
          console.warn(`[Auth RateLimit] Bloqueado intento excesivo para: ${normalizedEmail}`);
          throw new Error("RATE_LIMIT_EXCEEDED");
        }

        const user = await prisma.user.findFirst({
          where: {
            email: {
              equals: normalizedEmail,
              mode: "insensitive",
            },
            isActive: true,
          },
          include: { organization: true, location: true },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        // Actualizar lastLoginAt
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          image: user.photoUrl ?? undefined,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organization.name,
          locationId: user.locationId ?? undefined,
        };
      },
    }),
  ],
});

// Extensión de tipos para TypeScript
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      organizationId: string;
      organizationName: string;
      locationId?: string;
    };
  }
}
