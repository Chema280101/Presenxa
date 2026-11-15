"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MapPin,
  CalendarClock,
  UserCheck,
  MonitorSmartphone,
  BarChart3,
  Smartphone,
  Tablet,
  Settings,
  X,
  ExternalLink,
  CalendarDays,
  CalendarOff,
  ScrollText,
  Building2,
} from "lucide-react";
import { PresenxaIcon } from "@/components/ui/PresenxaLogo";
import { AdminManualButton } from "@/components/ui/AdminManualButton";
import { AdminWhatsAppSupportButton } from "@/components/ui/AdminWhatsAppSupportButton";
import type { ShellOrganizationData } from "@/components/layout/DashboardShell";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "SUPERADMIN"];

interface NavGroup {
  title?: string;
  items: {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    exact?: boolean;
    isExternal?: boolean;
    badge?: string;
    allowedRoles?: string[];
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "PRINCIPAL",
    items: [
      {
        label: "Command Center",
        href: "/",
        icon: LayoutDashboard,
        exact: true,
        badge: "LIVE",
      },
      {
        label: "Asistencias & Turnos",
        href: "/asistencias",
        icon: UserCheck,
      },
      {
        label: "Permisos & Ausencias",
        href: "/ausencias",
        icon: CalendarOff,
      },
      {
        label: "Colaboradores",
        href: "/usuarios",
        icon: Users,
      },
    ],
  },
  {
    title: "OPERACIONES",
    items: [
      {
        label: "Sedes & Zonas",
        href: "/sedes",
        icon: MapPin,
      },
      {
        label: "Departamentos",
        href: "/departamentos",
        icon: Building2,
      },
      {
        label: "Horarios & Rotativas",
        href: "/horarios",
        icon: CalendarClock,
      },
      {
        label: "Gestor de Feriados",
        href: "/feriados",
        icon: CalendarDays,
      },
      {
        label: "Auditoría de Sistema",
        href: "/auditoria",
        icon: ScrollText,
        badge: "LOGS",
        allowedRoles: ADMIN_ROLES,
      },
      {
        label: "Red Kiosks",
        href: "/kiosks",
        icon: MonitorSmartphone,
      },
      {
        label: "Centro de Reportes",
        href: "/reportes",
        icon: BarChart3,
      },
      {
        label: "Configuración Segura",
        href: "/configuracion",
        icon: Settings,
        allowedRoles: ADMIN_ROLES,
      },
    ],
  },
  {
    title: "ENTORNOS RÁPIDOS",
    items: [
      {
        label: "Portal Colaborador",
        href: "/app",
        icon: Smartphone,
        isExternal: true,
      },
      {
        label: "Terminal Kiosk (F11)",
        href: "/kiosk",
        icon: Tablet,
        badge: "TOTEM",
      },
    ],
  },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  userRole?: string;
  organization?: ShellOrganizationData | null;
}

export function Sidebar({
  isMobileOpen = false,
  onMobileClose,
  userRole,
  organization,
}: SidebarProps) {
  const pathname = usePathname();
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const orgName = organization?.name || "PRESENXA";
  const orgSubtitle = organization?.subtitle || "Centro de Operaciones";
  const locationName = organization?.locationName || "Sede Principal";
  const locationCode = organization?.locationCode || "HQ-01";

  useEffect(() => {
    if (!isMobileOpen) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onMobileClose?.();
        return;
      }

      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [isMobileOpen, onMobileClose]);

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const renderSidebarContent = (isMobile = false) => (
    <div
      className="w-full bg-surface-50/95 dark:bg-surface-950/95 border-r border-surface-200 dark:border-surface-800 flex flex-col justify-between shrink-0 h-full select-none z-20 backdrop-blur-xl transition-colors"
      data-purpose="sidebar-navigation"
    >
      <div className="p-5 flex flex-col gap-5 overflow-y-auto scrollbar-subtle flex-1">
        {/* Tenant & Brand Header */}
        <div className="flex items-center justify-between pb-5 border-b border-surface-200 dark:border-surface-800">
          <Link
            href="/"
            onClick={() => isMobile && onMobileClose?.()}
            className="flex items-center gap-3.5 cursor-pointer group"
          >
            {organization?.logoUrl ? (
              <div className="w-12 h-12 rounded-2xl overflow-hidden border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-1 shrink-0 group-hover:scale-105 transition-all duration-300 shadow-md group-hover:shadow-lg group-hover:border-primary-500/50">
                <img src={organization.logoUrl} alt={orgName} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 p-2.5 flex items-center justify-center shadow-md group-hover:scale-105 transition-all duration-300 shrink-0 group-hover:shadow-lg group-hover:border-primary-500/50">
                <PresenxaIcon className="w-full h-full drop-shadow-sm" aria-hidden="true" />
              </div>
            )}
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="font-black text-surface-900 dark:text-white text-lg tracking-tight leading-none group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{orgName}</span>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-info-50 dark:bg-info-500/20 text-info-600 dark:text-info-300 border border-info-200 dark:border-info-500/30 uppercase tracking-widest mt-0.5">PRO</span>
              </div>
              <span className="text-[13px] text-surface-500 dark:text-surface-400 font-medium tracking-wide truncate max-w-[150px] mt-1">{orgSubtitle}</span>
            </div>
          </Link>

          {isMobile && onMobileClose && (
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onMobileClose}
              aria-label="Cerrar menú"
              className="min-w-11 min-h-11 flex items-center justify-center rounded-xl text-surface-500 hover:text-surface-900 hover:bg-surface-200 dark:text-surface-400 dark:hover:text-white dark:hover:bg-surface-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Tarjeta informativa de Sede activa */}
        <div className="p-2.5 rounded-xl bg-surface-100 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs min-w-0">
            <MapPin className="w-3.5 h-3.5 text-primary-500 dark:text-primary-400 shrink-0" aria-hidden="true" />
            <div className="truncate min-w-0">
              <p className="font-semibold text-surface-700 dark:text-surface-200 text-xs truncate">{locationName}</p>
              <p className="text-xs text-surface-500 dark:text-surface-400 font-mono truncate">ID: {locationCode}</p>
            </div>
          </div>
        </div>

        {/* Menú de Navegación por Grupos */}
        {NAV_GROUPS.map((group, groupIdx) => {
          const visibleItems = group.items.filter((item) => {
            if (!item.allowedRoles) return true;
            return userRole && item.allowedRoles.includes(userRole);
          });
          if (visibleItems.length === 0) return null;

          return (
            <div key={groupIdx} className="flex flex-col gap-1">
              {group.title && (
                <div className="flex items-center justify-between px-3 mb-1">
                  <span className="text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest">{group.title}</span>
                </div>
              )}

              {visibleItems.map((item) => {
              const active = isActive(item.href, item.exact);
              const Icon = item.icon;

              if (active) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current="page"
                    onClick={() => isMobile && onMobileClose?.()}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-primary-50 dark:from-primary-500/15 via-transparent to-transparent border border-primary-200 dark:border-primary-500/30 text-primary-700 dark:text-primary-300 font-semibold group"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" aria-hidden="true" />
                      <span className="text-xs tracking-wide">{item.label}</span>
                    </div>
                    {item.badge ? (
                       <span className="text-xs font-mono text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-500/20 px-1.5 py-0.5 rounded border border-primary-200 dark:border-primary-500/30 uppercase tracking-wider">{item.badge}</span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-500 dark:bg-primary-400 shadow-[0_0_8px_rgba(0,166,80,0.5)]" aria-hidden="true"></span>
                    )}
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  target={item.isExternal ? "_blank" : undefined}
                  rel={item.isExternal ? "noopener noreferrer" : undefined}
                  onClick={() => isMobile && onMobileClose?.()}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-surface-600 dark:text-surface-300 hover:text-surface-900 hover:bg-surface-100 dark:hover:text-white dark:hover:bg-surface-800 transition-all text-xs font-medium group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 text-surface-400 dark:text-surface-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      {item.label}
                      {item.isExternal && <span className="sr-only"> (se abre en una nueva pestaña)</span>}
                    </span>
                  </div>
                  {item.badge ? (
                    <span className="text-xs font-mono text-surface-500 dark:text-surface-400 bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded border border-surface-200 dark:border-surface-700 uppercase tracking-wider">{item.badge}</span>
                  ) : item.isExternal ? (
                    <ExternalLink className="w-3.5 h-3.5 text-surface-400 group-hover:text-surface-600 dark:group-hover:text-surface-300 flex-shrink-0" aria-hidden="true" />
                  ) : null}
                </Link>
              );
            })}
          </div>
          );
        })}
      </div>

      {/* Admin Manual Download & Support Widget (Solo Admins) */}
      {userRole && ADMIN_ROLES.includes(userRole) && (
        <div className="p-3 border-t border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900/40 shrink-0 space-y-2">
          <AdminManualButton variant="sidebar" userRole={userRole} />
          <AdminWhatsAppSupportButton variant="sidebar" userRole={userRole} />
        </div>
      )}

      {/* Sidebar Compliance & HSM Footer */}
      <div className="p-3.5 border-t border-surface-200 dark:border-surface-800 bg-surface-100/50 dark:bg-surface-950/50 flex flex-col gap-2 shrink-0 transition-colors">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
            </span>
            <span className="font-semibold text-surface-700 dark:text-surface-300">HSM Criptográfico</span>
          </div>
          <span className="font-mono text-primary-700 dark:text-primary-400 text-xs bg-primary-100 dark:bg-primary-500/10 px-1.5 py-0.5 rounded border border-primary-200 dark:border-primary-500/20 uppercase tracking-wider">SHA-256 OK</span>
        </div>
        <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400 font-mono pt-1 border-t border-surface-200 dark:border-surface-800">
          <span className="truncate">{orgName} — Asistencias</span>
          <span className="text-surface-400 shrink-0">v2.4-ent</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-72 md:flex-shrink-0 md:flex-col md:h-full z-30">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop con Blur */}
          <div
            className="fixed inset-0 bg-surface-950/80 backdrop-blur-md transition-opacity animate-fade-in-up motion-reduce:animate-none"
            onClick={onMobileClose}
            aria-hidden="true"
          />

          {/* Drawer deslizable */}
          <aside
            id="mobile-sidebar-drawer"
            ref={drawerRef}
            className="fixed inset-y-0 left-0 w-72 max-w-[85vw] flex flex-col h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-2xl shadow-black z-10 animate-slide-right motion-reduce:animate-none"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
          >
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}

