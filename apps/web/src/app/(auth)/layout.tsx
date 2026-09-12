import type { Metadata } from "next";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export const metadata: Metadata = {
  title: "Iniciar Sesión",
  description: "Accede al panel de control de AsistControl",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col justify-between font-sans text-surface-900 dark:text-surface-200 antialiased bg-surface-50 dark:bg-surface-950 relative overflow-x-hidden selection:bg-primary-500/30 selection:text-primary-800 dark:selection:text-primary-200 transition-colors">
      <style dangerouslySetInnerHTML={{__html: `
        .glow-radial-brand {
          background: radial-gradient(circle at 50% 50%, rgba(0, 166, 80, 0.05) 0%, transparent 60%);
        }
        .dark .glow-radial-brand {
          background: radial-gradient(circle at 50% 50%, rgba(0, 166, 80, 0.1) 0%, transparent 60%);
        }
      `}} />
      
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 glow-radial-brand transition-opacity"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-primary-50 dark:from-primary-500/10 via-transparent to-transparent blur-3xl"></div>
      </div>
      
      {/* Top Security Bar */}
      <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between border-b border-surface-200 dark:border-surface-800 bg-surface-50/60 dark:bg-surface-950/60 backdrop-blur-md transition-colors">
        {/* Left: Branding */}
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-primary-500 dark:bg-primary-400 animate-pulse"></div>
          <span className="text-xs font-semibold tracking-wider text-surface-700 dark:text-surface-300 uppercase">
            Presenxa <span className="text-surface-500 dark:text-surface-500 font-normal">| Control de Asistencia</span>
          </span>
        </div>
        {/* Right: Security Status & Theme */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-500/20 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 dark:bg-primary-400"></span>
              Conexión Segura SSL
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-5 text-center text-[11px] text-surface-500 font-mono border-t border-surface-200 dark:border-surface-800 transition-colors">
        <p>
          Presenxa &copy; {new Date().getFullYear()} · Sistema Inteligente de Control de Asistencia
        </p>
      </footer>
    </div>
  );
}
