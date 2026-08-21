"use client";

import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { LogOut, ChevronDown, Building2, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { NotificationDropdown } from "@/components/NotificationDropdown";

// Mapa de rutas a títulos legibles
const ROUTE_TITLES: Record<string, string> = {
  "/":            "Dashboard",
  "/asistencias": "Asistencias",
  "/usuarios":    "Usuarios",
  "/sedes":       "Sedes y Geocercas",
  "/horarios":    "Horarios",
  "/kiosks":      "Dispositivos Kiosk",
  "/reportes":    "Reportes",
  "/configuracion":"Configuración",
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
    : "??";

  return (
    <header
      className="relative z-40 flex items-center justify-between px-4 sm:px-6 py-3.5 flex-shrink-0"
      style={{
        background: "rgba(5, 10, 6, 0.85)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(22, 163, 74, 0.08)",
      }}
    >
      {/* Botón hamburguesa móvil + Título de la sección */}
      <div className="flex items-center gap-3 min-w-0">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            aria-label="Abrir menú de navegación"
            aria-expanded={isMenuOpen}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center -ml-1.5 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
          >
            <Menu className="w-5 h-5 text-lime-400" />
          </button>
        )}

        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-semibold text-white truncate">{pageTitle}</h2>
          <p className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{session?.user?.organizationName || "Presenxa"}</span>
          </p>
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
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/5
                       transition-all border border-transparent hover:border-white/8"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            {/* Avatar */}
            <div className="gradient-brand w-8 h-8 rounded-lg flex items-center justify-center
                            text-white text-xs font-bold flex-shrink-0">
              {userInitials}
            </div>

            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-white leading-none">
                {session?.user?.name || "Usuario"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 capitalize">
                {(session?.user?.role || "ADMIN").toLowerCase().replace("_", " ")}
              </p>
            </div>

            <ChevronDown
              className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
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
                className="absolute right-0 top-full mt-2 w-56 z-50 rounded-2xl
                           border border-emerald-500/20 shadow-2xl shadow-black/80 overflow-hidden"
                style={{ background: "rgba(11, 18, 16, 0.96)", backdropFilter: "blur(20px)" }}
              >
                {/* Info del usuario */}
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-sm font-medium text-white truncate">
                    {session?.user?.name || "Usuario"}
                  </p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {session?.user?.email || ""}
                  </p>
                </div>

                {/* Acciones */}
                <div className="p-1.5">
                  <button
                    id="logout-btn"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm
                               text-slate-400 hover:text-danger-400 hover:bg-danger-500/10
                               transition-all duration-150 disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4" />
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
