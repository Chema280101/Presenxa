import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas — jornada laboral
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.organizationId = (user as any).organizationId;
        token.organizationName = (user as any).organizationName;
        token.locationId = (user as any).locationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.organizationId = token.organizationId as string;
        session.user.organizationName = token.organizationName as string;
        session.user.locationId = token.locationId as string | undefined;
      }
      return session;
    },
  },
  providers: [],
  trustHost: true,
  secret: (() => {
    const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!s && process.env.NODE_ENV === "production") {
      // Durante la fase de build / recopilación estática de rutas, permitir fallback temporal para que la compilación no falle
      if (
        process.env.NEXT_PHASE === "phase-production-build" ||
        process.env.npm_lifecycle_event === "build" ||
        process.env.STANDALONE === "1"
      ) {
        return "build-time-dummy-secret-not-for-production";
      }
      throw new Error("FATAL: AUTH_SECRET o NEXTAUTH_SECRET no configurado en producción");
    }
    return s || "dev-only-secret-not-for-production";
  })(),
} satisfies NextAuthConfig;


