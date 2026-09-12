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
  ChevronsUpDown,
} from "lucide-react";
import { clsx } from "clsx";
import { PresenxaIcon } from "@/components/ui/PresenxaLogo";

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
        label: "Command Center",
        href: "/",
        icon: LayoutDashboard,
        exact: true,
        badge: "LIVE",
      },
      {
        label: "Asistencias & Turnos",
        href: "/asistencias",
        icon: ClipboardList,
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
        label: "Horarios & Rotativas",
        href: "/horarios",
        icon: Clock,
      },
      {
        label: "Red Kiosks",
        href: "/kiosks",
        icon: QrCode,
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
}

export function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [orgData, setOrgData] = useState<{ 
    name: string; 
    logoUrl?: string | null;
    subtitle?: string;
    locationName?: string;
    locationCode?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/organization")
      .then((res) => res.json())
      .then((data) => {
        if (data?.organization) {
          const firstLoc = data.organization.locations?.[0];
          setOrgData({
            name: data.organization.name,
            logoUrl: data.organization.logoUrl,
            subtitle: data.organization.settings?.address || (data.organization.type === 'COLEGIO' ? 'Institución Educativa' : 'Centro de Operaciones'),
            locationName: firstLoc?.name || "Sede Principal",
            locationCode: firstLoc?.id ? firstLoc.id.substring(0, 8).toUpperCase() : "HQ-01",
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
            {orgData?.logoUrl ? (
              <div className="w-12 h-12 rounded-2xl overflow-hidden border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-1 shrink-0 group-hover:scale-105 transition-all duration-300 shadow-md group-hover:shadow-lg group-hover:border-primary-500/50">
                <img src={orgData.logoUrl} alt={orgData.name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 p-2.5 flex items-center justify-center shadow-md group-hover:scale-105 transition-all duration-300 shrink-0 group-hover:shadow-lg group-hover:border-primary-500/50">
                <PresenxaIcon className="w-full h-full drop-shadow-sm" />
              </div>
            )}
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="font-black text-surface-900 dark:text-white text-lg tracking-tight leading-none group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{orgData?.name || "PRESENXA"}</span>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-info-50 dark:bg-info-500/20 text-info-600 dark:text-info-300 border border-info-200 dark:border-info-500/30 uppercase tracking-widest mt-0.5">PRO</span>
              </div>
              <span className="text-[13px] text-surface-500 dark:text-surface-400 font-medium tracking-wide truncate max-w-[150px] mt-1">{orgData?.subtitle || "Centro de Operaciones"}</span>
            </div>
          </Link>
          
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary-500 dark:bg-primary-400 shadow-[0_0_8px_rgba(0,166,80,0.6)]" title="Conectado vía WebSocket"></div>
            {isMobile && onMobileClose && (
              <button
                type="button"
                onClick={onMobileClose}
                className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-900 hover:bg-surface-200 dark:hover:text-white dark:hover:bg-surface-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Sede Switcher Dropdown Preview */}
        <div className="p-2.5 rounded-xl bg-surface-100 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700/50 flex items-center justify-between group hover:border-primary-500/30 dark:hover:border-primary-500/30 transition-colors cursor-pointer">
          <div className="flex items-center gap-2 text-xs min-w-0">
            <MapPin className="w-3.5 h-3.5 text-primary-500 dark:text-primary-400 shrink-0" />
            <div className="truncate min-w-0">
              <p className="font-semibold text-surface-700 dark:text-surface-200 text-xs truncate">{orgData?.locationName || "Sede Central"}</p>
              <p className="text-xs text-surface-500 dark:text-surface-400 font-mono truncate">ID: {orgData?.locationCode || "LIM-01"}</p>
            </div>
          </div>
          <ChevronsUpDown className="w-3.5 h-3.5 text-surface-400 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors shrink-0" />
        </div>

        {/* Menú de Navegación por Grupos */}
        {NAV_GROUPS.map((group, groupIdx) => (
          <div key={groupIdx} className="flex flex-col gap-1">
            {group.title && (
              <div className="flex items-center justify-between px-3 mb-1">
                <span className="text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest">{group.title}</span>
                {groupIdx === 0 && <span className="text-xs font-mono text-primary-600 dark:text-primary-300 bg-primary-100 dark:bg-primary-500/10 px-1.5 py-0.2 rounded border border-primary-200 dark:border-primary-500/20 uppercase tracking-wider">LIVE</span>}
              </div>
            )}
            
            {group.items.map((item) => {
              const active = isActive(item.href, item.exact);
              const Icon = item.icon;
              
              if (active) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => isMobile && onMobileClose?.()}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-primary-50 dark:from-primary-500/15 via-transparent to-transparent border border-primary-200 dark:border-primary-500/30 text-primary-700 dark:text-primary-300 font-semibold group"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      <span className="text-xs tracking-wide">{item.label}</span>
                    </div>
                    {item.badge ? (
                       <span className="text-xs font-mono text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-500/20 px-1.5 py-0.5 rounded border border-primary-200 dark:border-primary-500/30 uppercase tracking-wider">{item.badge}</span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-500 dark:bg-primary-400 shadow-[0_0_8px_rgba(0,166,80,0.5)]"></span>
                    )}
                  </Link>
                )
              }
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => isMobile && onMobileClose?.()}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-surface-600 dark:text-surface-300 hover:text-surface-900 hover:bg-surface-100 dark:hover:text-white dark:hover:bg-surface-800 transition-all text-xs font-medium group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 text-surface-400 dark:text-surface-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge ? (
                    <span className="text-xs font-mono text-surface-500 dark:text-surface-400 bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded border border-surface-200 dark:border-surface-700 uppercase tracking-wider">{item.badge}</span>
                  ) : item.isExternal ? (
                    <ExternalLink className="w-3.5 h-3.5 text-surface-400 group-hover:text-surface-600 dark:group-hover:text-surface-300 flex-shrink-0" />
                  ) : null}
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      {/* Sidebar Compliance & HSM Footer */}
      <div className="p-3.5 border-t border-surface-200 dark:border-surface-800 bg-surface-100/50 dark:bg-surface-950/50 flex flex-col gap-2 shrink-0 transition-colors">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
            </span>
            <span className="font-semibold text-surface-700 dark:text-surface-300">HSM Criptográfico</span>
          </div>
          <span className="font-mono text-primary-700 dark:text-primary-400 text-xs bg-primary-100 dark:bg-primary-500/10 px-1.5 py-0.5 rounded border border-primary-200 dark:border-primary-500/20 uppercase tracking-wider">SHA-256 OK</span>
        </div>
        <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400 font-mono pt-1 border-t border-surface-200 dark:border-surface-800">
          <span>Presenxa Enterprise</span>
          <span className="text-surface-400">v2.4-ent</span>
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

