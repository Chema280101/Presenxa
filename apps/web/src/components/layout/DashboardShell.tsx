"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Session } from "next-auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { PresenxaIcon } from "@/components/ui/PresenxaLogo";

export interface ShellOrganizationData {
  name: string;
  logoUrl?: string | null;
  subtitle?: string | null;
  locationName?: string | null;
  locationCode?: string | null;
}

interface DashboardShellProps {
  session: Session;
  organization?: ShellOrganizationData | null;
  children: React.ReactNode;
}

export function DashboardShell({ session, organization, children }: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const logoUrl = organization?.logoUrl ?? null;

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
    <div className="flex h-[100dvh] bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 font-sans antialiased overflow-hidden selection:bg-primary-500/30 selection:text-primary-800 dark:selection:text-primary-200 transition-colors">
      <style dangerouslySetInnerHTML={{__html: `
        /* Custom subtle glass gradient and glow */
        .radial-glow-brand {
          background: radial-gradient(circle at 18% 10%, rgba(0, 166, 80, 0.05) 0%, transparent 45%),
                      radial-gradient(circle at 85% 85%, rgba(0, 166, 80, 0.03) 0%, transparent 40%);
        }
        .dark .radial-glow-brand {
          background: radial-gradient(circle at 18% 10%, rgba(0, 166, 80, 0.08) 0%, transparent 45%),
                      radial-gradient(circle at 85% 85%, rgba(0, 166, 80, 0.05) 0%, transparent 40%);
        }
        .scrollbar-subtle::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .scrollbar-subtle::-webkit-scrollbar-track {
          background: rgba(163, 163, 163, 0.05); /* surface-400 at 5% */
        }
        .dark .scrollbar-subtle::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .scrollbar-subtle::-webkit-scrollbar-thumb {
          background: rgba(163, 163, 163, 0.3); /* surface-400 at 30% */
          border-radius: 9999px;
        }
        .dark .scrollbar-subtle::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
        }
        .scrollbar-subtle::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 166, 80, 0.4);
        }
      `}} />
      {/* Skip Link para navegación por teclado */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-primary-600 focus:text-white focus:text-xs focus:font-bold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
      >
        Saltar al contenido principal
      </a>

      {/* Ambient Background Glow */}
      <div className="fixed inset-0 pointer-events-none radial-glow-brand z-0 transition-opacity" aria-hidden="true"></div>

      {/* Sidebar Desktop (fijo) + Sidebar Mobile (drawer deslizable) */}
      <Sidebar
        isMobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        userRole={(session.user as { role?: string } | undefined)?.role}
        organization={organization}
      />

      {/* Área principal */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-surface-50 dark:bg-surface-950 relative z-10 transition-colors">
        
        {/* Watermark Brand Presence */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden select-none">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt="Watermark" 
              className="w-[120%] h-[120%] max-w-[900px] max-h-[900px] object-contain opacity-[0.03] dark:opacity-[0.02] transform-gpu -rotate-[4deg] blur-[1px] grayscale mix-blend-luminosity" 
            />
          ) : (
            <PresenxaIcon className="w-[120%] h-[120%] max-w-[900px] max-h-[900px] text-primary-900 dark:text-white opacity-[0.03] dark:opacity-[0.02] transform-gpu -rotate-[4deg] blur-[1px]" />
          )}
        </div>

        <Topbar
          session={session}
          organization={organization}
          onMenuToggle={() => setMobileNavOpen((prev) => !prev)}
          isMenuOpen={mobileNavOpen}
        />

        {/* Contenido con scroll dinámico */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 xl:p-8 scrollbar-subtle relative z-0 focus:outline-none"
        >
          <div className="mx-auto w-full max-w-[1920px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
