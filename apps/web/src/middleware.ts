import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

// Rutas que NO requieren autenticación
const PUBLIC_ROUTES = [
  "/login",
  "/kiosk",
  "/manifest.webmanifest",
  "/manifest.json",
  "/sw.js",
];

// Rutas de API que son públicas (kiosk, icon, auth, service worker, healthchecks)
const PUBLIC_API_ROUTES = [
  "/api/auth",
  "/api/attendance/scan",
  "/api/kiosks/heartbeat",
  "/api/icon",
  "/api/notifications/send",
  "/api/notifications/subscribe",
  "/api/health",
];

// Helper para obtener URL pública real detrás de proxies inversos (como Render, Vercel o Nginx)
function getPublicBaseUrl(req: any): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session;
  const path = nextUrl.pathname;
  const baseUrl = getPublicBaseUrl(req);

  // Permitir rutas públicas de API
  if (PUBLIC_API_ROUTES.some((r) => path.startsWith(r))) {
    return NextResponse.next();
  }

  // Rutas públicas de UI
  if (PUBLIC_ROUTES.includes(path) || path.endsWith("/sw.js")) {
    // Si ya está logueado y va a login, redirigir según su rol
    if (isLoggedIn && path === "/login") {
      const role = (session?.user as any)?.role;
      if (role === "EMPLEADO") {
        return NextResponse.redirect(new URL("/app", baseUrl));
      }
      return NextResponse.redirect(new URL("/", baseUrl));
    }
    return NextResponse.next();
  }

  // Rutas protegidas — redirigir al login si no hay sesión
  if (!isLoggedIn) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  // Si un EMPLEADO intenta entrar al dashboard admin "/", redirigir a "/app"
  const role = (session?.user as any)?.role;
  if (role === "EMPLEADO" && path === "/") {
    return NextResponse.redirect(new URL("/app", baseUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Aplicar middleware a todas las rutas excepto archivos estáticos
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
