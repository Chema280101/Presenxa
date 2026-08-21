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
  ShieldCheck,
  Smartphone,
  Tablet,
  Settings,
  X,
} from "lucide-react";
import { clsx } from "clsx";

const NAV_ITEMS = [
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
      className="flex flex-col h-full w-full"
      style={{
        background: "#0a1b2c",
        borderRight: isMobile ? "none" : "1px solid rgba(163, 230, 53, 0.12)",
      }}
    >
      {/* Logo y Botón de cierre en móviles */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(163, 230, 53, 0.1)" }}
      >
        <Link
          href="/"
          onClick={() => isMobile && onMobileClose?.()}
          className="flex items-center gap-3 group min-w-0"
        >
          {orgData?.logoUrl ? (
            <img
              src={orgData.logoUrl}
              alt={orgData.name || "Logo"}
              className="w-9 h-9 rounded-xl object-contain shadow-lg ring-1 ring-lime-400/20 group-hover:scale-105 transition-transform bg-black/20 flex-shrink-0"
            />
          ) : (
            <img
              src="/brand/isotipo-secundario.svg"
              alt="Presenxa"
              className="w-9 h-9 rounded-xl object-contain shadow-lg ring-1 ring-lime-400/20 group-hover:scale-105 transition-transform flex-shrink-0"
            />
          )}
          <div className="overflow-hidden">
            {orgData?.name ? (
              <p className="font-extrabold text-white text-sm tracking-tight truncate group-hover:text-lime-300 transition-colors">
                {orgData.name}
              </p>
            ) : (
              <p className="font-extrabold text-white text-base tracking-tight flex items-center">
                <span>Presen</span>
                <span className="text-lime-400">x</span>
                <span>a</span>
              </p>
            )}
            <p className="text-[11px] text-slate-400 font-medium truncate">Panel Admin</p>
          </div>
        </Link>

        {isMobile && onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Cerrar navegación"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navegación */}
      <nav
        className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
        aria-label="Navegación principal"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => isMobile && onMobileClose?.()}
              className={clsx(
                "relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 group cursor-pointer min-h-[44px]",
                active
                  ? "text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              )}
              style={
                active
                  ? {
                      background:
                        "linear-gradient(90deg, rgba(22,163,74,0.18) 0%, rgba(22,163,74,0.06) 100%)",
                      boxShadow: "inset 3px 0 0 #16a34a",
                    }
                  : undefined
              }
              aria-current={active ? "page" : undefined}
            >
              <item.icon
                className={clsx(
                  "w-4 h-4 flex-shrink-0 transition-colors",
                  active
                    ? "text-primary-400"
                    : "text-slate-500 group-hover:text-slate-300"
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {active && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer del sidebar */}
      <div
        className="px-5 py-4"
        style={{ borderTop: "1px solid rgba(22, 163, 74, 0.08)" }}
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse-dot flex-shrink-0" />
          <p className="text-xs text-slate-500 font-medium">v1.0.0 · Live</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── 1. Desktop Sidebar (Fijo para md y superior) ── */}
      <aside className="hidden md:flex md:w-60 md:flex-shrink-0 md:flex-col md:h-full">
        {renderSidebarContent(false)}
      </aside>

      {/* ── 2. Mobile Sidebar Drawer (Deslizable para < md) ── */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop con Blur */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fade-in-up"
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

