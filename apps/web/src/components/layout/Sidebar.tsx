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
        background: "#0a1b2c",
        borderRight: "1px solid rgba(163, 230, 53, 0.12)",
      }}
    >
      {/* Logo */}
      <div
        className="px-5 py-5"
        style={{ borderBottom: "1px solid rgba(163, 230, 53, 0.1)" }}
      >
        <Link href="/" className="flex items-center gap-3 group">
          <img
            src="/brand/isotipo-secundario.svg"
            alt="Presenxa"
            className="w-9 h-9 rounded-xl object-contain shadow-lg ring-1 ring-lime-400/20 group-hover:scale-105 transition-transform"
          />
          <div>
            <p className="font-extrabold text-white text-base tracking-tight flex items-center">
              <span>Presen</span>
              <span className="text-lime-400">x</span>
              <span>a</span>
            </p>
            <p className="text-[11px] text-slate-400 font-medium">Panel Admin</p>
          </div>
        </Link>
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
