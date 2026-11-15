"use client";

import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { LogOut, ChevronDown, Menu, KeyRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AdminManualButton } from "@/components/ui/AdminManualButton";
import { AdminWhatsAppSupportButton } from "@/components/ui/AdminWhatsAppSupportButton";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";
import type { ShellOrganizationData } from "@/components/layout/DashboardShell";

// Mapa de rutas a títulos legibles
const ROUTE_TITLES: Record<string, string> = {
  "/horarios/matriz": "Matriz Semanal de Turnos",
  "/asistencias":     "Control de Asistencias",
  "/ausencias":       "Permisos y Ausencias",
  "/usuarios":        "Gestión de Usuarios",
  "/sedes":           "Sedes y Ubicaciones",
  "/departamentos":   "Departamentos",
  "/horarios":        "Horarios y Turnos",
  "/feriados":        "Gestor de Feriados",
  "/kiosks":          "Dispositivos Kiosk",
  "/kiosk":           "Terminal Kiosk",
  "/reportes":        "Métricas y Reportes",
  "/auditoria":       "Auditoría de Sistema",
  "/configuracion":   "Configuración General",
  "/":                "Dashboard General",
};

interface TopbarProps {
  session: Session;
  organization?: ShellOrganizationData | null;
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Super Admin",
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  SUPERVISOR: "Supervisor",
};

export function Topbar({ session, organization, onMenuToggle, isMenuOpen = false }: Readonly<TopbarProps>) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const orgName = organization?.name || session?.user?.organizationName || "Presenxa";

  useEffect(() => {
    if (!menuOpen) return;

    const timer = window.setTimeout(() => {
      const firstItem = profileMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])');
      firstItem?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMenuOpen(false);
        profileTriggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

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

  const roleLabel = ROLE_LABELS[session?.user?.role ?? ""] ?? "Colaborador";

  return (
    <header
      className="min-h-16 pt-[env(safe-area-inset-top)] px-3 sm:px-6 flex items-center justify-between border-b border-surface-200 dark:border-surface-800 bg-surface-50/80 dark:bg-surface-950/80 backdrop-blur-xl shrink-0 z-40 transition-colors"
      data-purpose="top-navigation-header"
    >
      {/* Left: Clean, real breadcrumb navigation */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            aria-label={isMenuOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
            aria-expanded={Boolean(isMenuOpen)}
            aria-controls="mobile-sidebar-drawer"
            className="min-w-11 min-h-11 flex items-center justify-center rounded-xl text-surface-500 hover:text-surface-900 hover:bg-surface-200 dark:text-surface-400 dark:hover:text-surface-50 dark:hover:bg-surface-800 transition-colors md:hidden cursor-pointer shrink-0"
          >
            <Menu className="w-5 h-5 text-primary-500 dark:text-primary-400" aria-hidden="true" />
          </button>
        )}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs min-w-0">
          <span className="hidden sm:inline font-medium text-surface-500 dark:text-surface-400 truncate max-w-[180px]">
            {orgName}
          </span>
          <span className="hidden sm:inline text-surface-300 dark:text-surface-700 select-none" aria-hidden="true">/</span>
          <h1 className="font-bold text-sm text-surface-900 dark:text-white tracking-tight truncate max-w-[160px] sm:max-w-none">
            {pageTitle}
          </h1>
        </nav>
      </div>

      {/* Right: Functional actions & User profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Real Notification Center Dropdown */}
        <NotificationDropdown />

        {/* Theme Toggle (Light / Dark) */}
        <ThemeToggle />

        {/* Acceso rápido a Manual Admin (Solo Admins) */}
        <AdminManualButton variant="topbar-icon" userRole={(session?.user as { role?: string } | undefined)?.role} />

        {/* Profile Avatar and Menu */}
        <div className="relative border-l border-surface-200 dark:border-surface-800 pl-2 sm:pl-3 ml-0.5 sm:ml-1">
          <button
            ref={profileTriggerRef}
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls="user-profile-menu"
            aria-label="Menú de perfil de usuario"
            className="flex items-center gap-2.5 min-h-11 sm:min-h-0 hover:bg-surface-100 dark:hover:bg-surface-800/50 p-1.5 rounded-xl transition-all cursor-pointer"
          >
            {session?.user?.image ? (
              <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 bg-surface-100 dark:bg-surface-800 ring-1 ring-surface-200 dark:ring-surface-800">
                <img
                  src={session.user.image}
                  alt={session?.user?.name || "Avatar"}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-950/60 border border-primary-200/80 dark:border-primary-800/40 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                {userInitials}
              </div>
            )}
            <div className="flex-col text-left hidden sm:flex max-w-[170px]">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-surface-900 dark:text-white leading-tight truncate">
                  {session?.user?.name || "Administrador"}
                </span>
                <span className="text-[11px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-md bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/40 shrink-0">
                  {roleLabel}
                </span>
              </div>
              <span className="text-xs text-surface-500 dark:text-surface-400 font-mono truncate">
                {session?.user?.email || ""}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-surface-400 hidden sm:block" aria-hidden="true" />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Cerrar menú"
                tabIndex={-1}
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setMenuOpen(false)}
              />
              <div
                id="user-profile-menu"
                ref={profileMenuRef}
                role="menu"
                aria-label="Opciones de usuario"
                className="absolute right-0 top-full mt-2 w-60 z-50 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-2xl overflow-hidden bg-white/95 dark:bg-surface-900/95 backdrop-blur-xl"
              >
                <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-800 bg-surface-50/80 dark:bg-surface-950/80">
                  <p className="text-xs font-bold text-surface-900 dark:text-white truncate">{session?.user?.name || "Usuario"}</p>
                  <p className="text-xs text-surface-500 dark:text-surface-400 truncate mt-0.5 font-mono">{session?.user?.email || ""}</p>
                </div>
                <div className="p-1.5 space-y-1">
                  <AdminManualButton variant="topbar-item" userRole={(session?.user as { role?: string } | undefined)?.role} />
                  <AdminWhatsAppSupportButton
                    variant="topbar-item"
                    userRole={(session?.user as { role?: string } | undefined)?.role}
                    userName={session?.user?.name || undefined}
                    organizationName={orgName}
                  />
                  <div className="border-t border-surface-200 dark:border-surface-800 my-1" role="separator"></div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setIsPasswordModalOpen(true);
                    }}
                    className="group flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-surface-700 dark:text-surface-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/15 transition-all duration-150 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-surface-400 group-hover:text-primary-500" aria-hidden="true" />
                    Cambiar contraseña
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-surface-700 dark:text-surface-300 hover:text-danger-600 dark:hover:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-500/15 transition-all duration-150 disabled:opacity-50 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-danger-500 dark:text-danger-400" aria-hidden="true" />
                    {isSigningOut ? "Cerrando sesión..." : "Cerrar sesión"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      <ChangePasswordModal 
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </header>
  );
}
