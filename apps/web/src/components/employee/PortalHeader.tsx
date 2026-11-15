"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { PresenxaIcon } from "@/components/ui/PresenxaLogo";
import type { UserProfile } from "./types";

function getUserInitials(profile: UserProfile | null, sessionName?: string | null): string {
  if (profile) {
    return `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.toUpperCase() || "U";
  }
  if (sessionName) {
    return sessionName
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }
  return "U";
}

interface PortalHeaderProps {
  profile: UserProfile | null;
  sessionName?: string | null;
  sessionImage?: string | null;
  isOnline: boolean;
  mounted: boolean;
  isLoadingProfile?: boolean;
}

export function PortalHeader({
  profile,
  sessionName,
  sessionImage,
  isOnline,
  mounted,
  isLoadingProfile = false,
}: Readonly<PortalHeaderProps>) {
  const [imgError, setImgError] = useState(false);
  const avatarSrc = !imgError ? profile?.photoUrl || sessionImage || "" : "";
  const displayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName || ""}`.trim()
    : sessionName || "Colaborador";

  return (
    <header className="sticky top-0 z-40 border-b px-4 lg:px-8 py-3 transition-colors bg-white/90 border-surface-200 dark:bg-command-bg/85 dark:border-white/10 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: System Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-surface-850 border border-surface-200 dark:border-white/10 p-2 flex items-center justify-center shadow-sm shrink-0">
            <PresenxaIcon className="w-full h-full" />
          </div>
          <div className="hidden sm:block leading-tight min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-wide text-surface-900 dark:text-white">
                PRESENXA
              </span>
              <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-primary-500/15 text-primary-700 dark:text-primary-400 border border-primary-500/30 tracking-wide">
                PORTAL
              </span>
            </div>
            <p className="text-xs text-surface-500 dark:text-surface-400 truncate">
              {isLoadingProfile && !profile
                ? "Sincronizando..."
                : profile?.organization?.name || "Portal de Colaborador"}
            </p>
          </div>
        </div>

        {/* Center: Connectivity Badge */}
        <div className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border text-xs shadow-inner bg-surface-100 border-surface-200 text-surface-700 dark:bg-surface-900 dark:border-white/10 dark:text-surface-300">
          <span
            aria-hidden="true"
            className={`w-2 h-2 rounded-full motion-reduce:animate-none ${
              mounted && isOnline
                ? "bg-primary-500 dark:bg-primary-400 animate-ping"
                : "bg-warning-500 dark:bg-warning-400"
            }`}
          />
          <span className="font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            {mounted && isOnline ? "Kiosk Engine v2.4 · Online" : "Modo Offline Activo"}
          </span>
        </div>

        {/* Right: ThemeToggle, User Avatar & Sign Out */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <ThemeToggle />
          <div className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-xl border transition bg-white dark:bg-command-card border-surface-200 dark:border-white/10 shadow-sm min-h-[44px]">
            {avatarSrc ? (
              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-surface-100 dark:bg-surface-800 ring-1 ring-black/5 dark:ring-white/10">
                <img
                  src={avatarSrc}
                  alt={displayName}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800/40 text-primary-700 dark:text-primary-400 font-bold text-xs flex items-center justify-center shrink-0">
                {getUserInitials(profile, sessionName)}
              </div>
            )}
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold leading-tight flex items-center gap-1.5 text-surface-900 dark:text-white">
                {displayName}
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary-500" aria-hidden="true" />
              </div>
              <div className="text-xs text-surface-500 dark:text-surface-400 font-mono uppercase">
                {profile?.role || "COLAB"}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border transition bg-surface-100 hover:bg-danger-50 text-surface-600 hover:text-danger-600 border-surface-200 dark:bg-surface-900 dark:hover:bg-danger-500/10 dark:hover:text-danger-400 dark:border-white/10 dark:hover:border-danger-500/30 dark:text-surface-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
