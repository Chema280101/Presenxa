"use client";

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

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="w-60 flex-shrink-0 flex flex-col h-full"
      style={{
        background: "rgba(5, 10, 6, 0.98)",
        borderRight: "1px solid rgba(22, 163, 74, 0.1)",
      }}
    >
      {/* Logo */}
      <div
        className="px-5 py-5"
        style={{ borderBottom: "1px solid rgba(22, 163, 74, 0.08)" }}
      >
        <div className="flex items-center gap-3">
          <div className="gradient-brand w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-green-900/40">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm tracking-tight">
              AsistControl
            </p>
            <p className="text-xs text-slate-500 font-medium">Panel Admin</p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav
        className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto"
        aria-label="Navegación principal"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group cursor-pointer",
                active
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]"
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
              <span className="flex-1">{item.label}</span>
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
          <p className="text-xs text-slate-600 font-medium">v1.0.0 · Live</p>
        </div>
      </div>
    </aside>
  );
}
