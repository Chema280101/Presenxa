"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Session } from "next-auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

interface DashboardShellProps {
  session: Session;
  children: React.ReactNode;
}

export function DashboardShell({ session, children }: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  // Cerrar menú móvil automáticamente al cambiar de ruta
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Bloquear scroll de fondo en móviles cuando el drawer está abierto
  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-surface-950">
      {/* Sidebar Desktop (fijo) + Sidebar Mobile (drawer deslizable) */}
      <Sidebar
        isMobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      {/* Área principal */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar
          session={session}
          onMenuToggle={() => setMobileNavOpen((prev) => !prev)}
          isMenuOpen={mobileNavOpen}
        />

        {/* Contenido con scroll dinámico */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
