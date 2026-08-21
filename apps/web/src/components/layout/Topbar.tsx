"use client";

import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { LogOut, ChevronDown, Building2, Menu, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { NotificationDropdown } from "@/components/NotificationDropdown";

// Mapa de rutas a títulos legibles
const ROUTE_TITLES: Record<string, string> = {
  "/":            "Dashboard General",
  "/asistencias": "Control de Asistencias",
  "/usuarios":    "Gestión de Usuarios",
  "/sedes":       "Sedes y Ubicaciones",
  "/horarios":    "Horarios y Turnos",
  "/kiosks":      "Dispositivos Kiosk",
  "/reportes":    "Métricas y Reportes",
  "/configuracion":"Configuración General",
};

interface TopbarProps {
  session: Session;
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
}

export function Topbar({ session, onMenuToggle, isMenuOpen }: TopbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const pageTitle = Object.entries(ROUTE_TITLES).find(([path]) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path)
  )?.[1] ?? "Panel";

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: "/login" });
  };

  const userInitials = session.user.name
    ? session.user.name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "AD";

  return (
    <header
      className="relative z-40 flex items-center justify-between px-4 sm:px-6 py-3 flex-shrink-0 bg-surface-900/80 backdrop-blur-xl border-b border-primary-400/10"
    >
      {/* Botón hamburguesa móvil + Título de la sección */}
      <div className="flex items-center gap-3.5 min-w-0">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            aria-label="Abrir menú de navegación"
            aria-expanded={isMenuOpen}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors md:hidden min-w-[40px] min-h-[40px] flex items-center justify-center -ml-1 focus:outline-none focus:ring-2 focus:ring-primary-400/50 cursor-pointer"
          >
            <Menu className="w-5 h-5 text-primary-400" />
          </button>
        )}

        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate flex items-center gap-2">
            <span>{pageTitle}</span>
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400 font-medium truncate">
            <Building2 className="w-3 h-3 text-primary-400 flex-shrink-0" />
            <span className="truncate">{session?.user?.organizationName || "Organización Principal"}</span>
          </div>
        </div>
      </div>

      {/* Acciones del header */}
      <div className="flex items-center gap-3">
        {/* Centro de Notificaciones Interactivo */}
        <NotificationDropdown />

        {/* Menú de usuario */}
        <div className="relative">
          <button
            id="user-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-2xl hover:bg-white/5
                       transition-all border border-white/8 hover:border-primary-400/30 cursor-pointer"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            {/* Avatar */}
            <div className="gradient-brand w-8 h-8 rounded-xl flex items-center justify-center
                            text-surface-950 text-xs font-black shadow-xs flex-shrink-0 ring-1 ring-primary-400/30">
              {userInitials}
            </div>

            <div className="text-left hidden sm:block max-w-[140px]">
              <p className="text-xs font-bold text-white leading-tight truncate">
                {session?.user?.name || "Usuario"}
              </p>
              <p className="text-[10px] text-primary-300 font-semibold uppercase tracking-wider mt-0.5">
                {(session?.user?.role || "ADMIN").toLowerCase().replace("_", " ")}
              </p>
            </div>

            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <>
              {/* Overlay para cerrar */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div
                className="absolute right-0 top-full mt-2 w-60 z-50 rounded-2xl
                           border border-primary-400/20 shadow-2xl shadow-black/90 overflow-hidden"
                style={{ background: "rgba(10, 27, 44, 0.98)", backdropFilter: "blur(20px)" }}
              >
                {/* Info del usuario */}
                <div className="px-4 py-3 border-b border-white/8 bg-surface-950/40">
                  <p className="text-xs font-bold text-white truncate">
                    {session?.user?.name || "Usuario"}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                    {session?.user?.email || ""}
                  </p>
                </div>

                {/* Acciones */}
                <div className="p-1.5">
                  <button
                    id="logout-btn"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-semibold
                               text-slate-300 hover:text-rose-300 hover:bg-rose-500/15
                               transition-all duration-150 disabled:opacity-50 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    {isSigningOut ? "Cerrando sesión..." : "Cerrar sesión"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
