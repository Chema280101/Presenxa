"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MapPin,
  Clock,
  ClipboardList,
  QrCode,
  BarChart3,
  Smartphone,
  Tablet,
  Settings,
  X,
  ExternalLink,
} from "lucide-react";
import { clsx } from "clsx";

interface NavGroup {
  title?: string;
  items: {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    exact?: boolean;
    isExternal?: boolean;
    badge?: string;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "PRINCIPAL",
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        label: "Asistencias",
        href: "/asistencias",
        icon: ClipboardList,
      },
      {
        label: "Usuarios",
        href: "/usuarios",
        icon: Users,
      },
    ],
  },
  {
    title: "OPERACIONES",
    items: [
      {
        label: "Sedes",
        href: "/sedes",
        icon: MapPin,
      },
      {
        label: "Horarios",
        href: "/horarios",
        icon: Clock,
      },
      {
        label: "Kiosks",
        href: "/kiosks",
        icon: QrCode,
      },
      {
        label: "Reportes",
        href: "/reportes",
        icon: BarChart3,
      },
      {
        label: "Configuración",
        href: "/configuracion",
        icon: Settings,
      },
    ],
  },
  {
    title: "ACCESOS RÁPIDOS",
    items: [
      {
        label: "Portal Empleado",
        href: "/app",
        icon: Smartphone,
      },
      {
        label: "Pantalla Kiosk",
        href: "/kiosk",
        icon: Tablet,
      },
    ],
  },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [orgData, setOrgData] = useState<{ name: string; logoUrl?: string | null } | null>(null);

  useEffect(() => {
    fetch("/api/organization")
      .then((res) => res.json())
      .then((data) => {
        if (data?.organization) {
          setOrgData({
            name: data.organization.name,
            logoUrl: data.organization.logoUrl,
          });
        }
      })
      .catch(() => {});
  }, []);

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const renderSidebarContent = (isMobile = false) => (
    <div
      className="flex flex-col h-full w-full bg-surface-900/95 backdrop-blur-xl"
      style={{
        borderRight: isMobile ? "none" : "1px solid rgba(163, 230, 53, 0.12)",
      }}
    >
      {/* Logo y Encabezado de la Organización */}
      <div
        className="px-5 py-4.5 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.07)" }}
      >
        <Link
          href="/"
          onClick={() => isMobile && onMobileClose?.()}
          className="flex items-center gap-3 group min-w-0"
        >
          <div className="relative flex-shrink-0">
            {orgData?.logoUrl ? (
              <img
                src={orgData.logoUrl}
                alt={orgData.name || "Logo"}
                className="w-9 h-9 rounded-xl object-contain shadow-md ring-1 ring-primary-400/30 group-hover:scale-105 transition-transform bg-surface-950/40 p-0.5"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-950/40 ring-1 ring-primary-300/40 group-hover:scale-105 transition-transform">
                <span className="text-surface-950 font-black text-base tracking-tighter">P</span>
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary-400 ring-2 ring-surface-900 animate-pulse-dot" />
          </div>

          <div className="overflow-hidden min-w-0">
            {orgData?.name ? (
              <p className="font-bold text-white text-sm tracking-tight truncate group-hover:text-primary-300 transition-colors">
                {orgData.name}
              </p>
            ) : (
              <p className="font-extrabold text-white text-base tracking-tight flex items-center">
                <span>Presen</span>
                <span className="text-primary-400">x</span>
                <span>a</span>
              </p>
            )}
            <p className="text-[11px] text-slate-400 font-medium truncate flex items-center gap-1.5">
              <span>Panel Operativo</span>
            </p>
          </div>
        </Link>

        {isMobile && onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Cerrar navegación"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Menú de Navegación por Grupos */}
      <nav
        className="flex-1 px-3 py-4 space-y-6 overflow-y-auto"
        aria-label="Navegación principal"
      >
        {NAV_GROUPS.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {group.title && (
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.title}
              </p>
            )}
            {group.items.map((item) => {
              const active = isActive(item.href, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => isMobile && onMobileClose?.()}
                  className={clsx(
                    "relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group cursor-pointer min-h-[40px]",
                    active
                      ? "text-primary-300 bg-primary-400/12 border border-primary-400/30 shadow-xs shadow-primary-950/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] border border-transparent"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon
                    className={clsx(
                      "w-4 h-4 flex-shrink-0 transition-colors duration-200",
                      active
                        ? "text-primary-400"
                        : "text-slate-400 group-hover:text-slate-200"
                    )}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400 shadow-xs shadow-primary-400 flex-shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer del sidebar */}
      <div
        className="px-5 py-3.5 flex items-center justify-between border-t border-white/5 bg-surface-950/30 flex-shrink-0"
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-400"></span>
          </span>
          <p className="text-[11px] text-slate-400 font-medium">Sistema Activo</p>
        </div>
        <span className="text-[10px] font-mono text-slate-400">v1.2.0</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-shrink-0 md:flex-col md:h-full z-30">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop con Blur */}
          <div
            className="fixed inset-0 bg-surface-950/80 backdrop-blur-md transition-opacity animate-fade-in-up"
            onClick={onMobileClose}
            aria-hidden="true"
          />

          {/* Drawer deslizable */}
          <aside
            className="fixed inset-y-0 left-0 w-72 max-w-[85vw] flex flex-col h-[100dvh] shadow-2xl shadow-black z-10 animate-slide-right"
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

