import { auth } from "@/auth";
import { NextResponse } from "next/server";

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

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session;
  const path = nextUrl.pathname;

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
        return NextResponse.redirect(new URL("/app", nextUrl));
      }
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
  }

  // Rutas protegidas — redirigir al login si no hay sesión
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  // Si un EMPLEADO intenta entrar al dashboard admin "/", redirigir a "/app"
  const role = (session?.user as any)?.role;
  if (role === "EMPLEADO" && path === "/") {
    return NextResponse.redirect(new URL("/app", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Aplicar middleware a todas las rutas excepto archivos estáticos
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
