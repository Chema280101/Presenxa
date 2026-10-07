"use client";

import React from "react";
import { MessageSquare, ExternalLink, Headphones, PhoneCall } from "lucide-react";
import { clsx } from "clsx";

export interface AdminWhatsAppSupportButtonProps {
  variant?: "sidebar" | "topbar-item" | "topbar-icon" | "card" | "button";
  userRole?: string | null;
  userName?: string;
  organizationName?: string;
  phone?: string;
  customMessage?: string;
  className?: string;
}

const ADMIN_ROLES = [
  "ADMIN",
  "SUPER_ADMIN",
  "SUPERADMIN",
  "Administrador",
  "Super Admin",
  "Super Administrador",
  "ADMINISTRADOR",
  "SUPER ADMIN",
];

// Icono oficial de WhatsApp vectorizado
export function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.03C9.36 7.03 9.08 7.1 8.84 7.36C8.6 7.62 7.92 8.26 7.92 9.55C7.92 10.84 8.86 12.08 9 12.26C9.13 12.44 10.88 15.13 13.56 16.29C14.2 16.57 14.69 16.73 15.08 16.85C15.73 17.06 16.31 17.03 16.77 16.96C17.29 16.88 18.36 16.31 18.59 15.68C18.81 15.05 18.81 14.51 18.75 14.39C18.69 14.27 18.52 14.2 18.26 14.07C18 13.94 16.73 13.31 16.5 13.22C16.26 13.14 16.09 13.1 15.92 13.35C15.76 13.61 15.28 14.17 15.14 14.34C14.99 14.51 14.85 14.53 14.59 14.4C14.33 14.27 13.49 14 12.5 13.11C11.73 12.42 11.21 11.57 11.06 11.31C10.91 11.05 11.04 10.92 11.17 10.79C11.29 10.67 11.43 10.49 11.56 10.34C11.69 10.19 11.73 10.08 11.82 9.91C11.91 9.74 11.86 9.59 11.8 9.46C11.73 9.33 11.21 8.05 11 7.53C10.79 7.03 10.58 7.1 10.42 7.09C10.27 7.08 10.1 7.08 9.93 7.08C9.76 7.08 9.53 7.03 9.53 7.03Z" />
    </svg>
  );
}

export function AdminWhatsAppSupportButton({
  variant = "button",
  userRole,
  userName,
  organizationName = "Hotel Italia",
  phone = "51951171534",
  customMessage,
  className,
}: AdminWhatsAppSupportButtonProps) {
  // Verificación de rol opcional: si se suministra userRole y no es admin, no renderizar
  if (userRole && !ADMIN_ROLES.includes(userRole)) {
    return null;
  }

  // Generación de mensaje personalizado contextual exclusivo para Hotel Italia
  const buildMessage = () => {
    if (customMessage) return customMessage;
    const parts = [
      "¡Hola! Necesito soporte técnico especializado para el sistema de asistencias de Hotel Italia.",
    ];
    if (userName) {
      parts.push(`👤 Administrador: ${userName}`);
    }
    parts.push("🏨 Empresa: Hotel Italia");
    parts.push("¿Podrías asistirme por favor? Muchas gracias.");
    return parts.join("\n");
  };

  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(buildMessage())}`;

  // ─────────────────────────────────────────────────────────────
  // 1. VARIANTE: SIDEBAR (Botón integrado en tarjeta lateral)
  // ─────────────────────────────────────────────────────────────
  if (variant === "sidebar") {
    return (
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={clsx(
          "flex items-center justify-between w-full p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 text-xs font-semibold transition-all duration-200 active:scale-98 group cursor-pointer",
          className
        )}
        title="Abrir chat de soporte en WhatsApp para Hotel Italia (951 171 534)"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
            <WhatsAppIcon className="w-3.5 h-3.5" />
          </div>
          <div className="truncate text-left">
            <span className="block font-bold text-[11px] leading-tight">Soporte Hotel Italia</span>
            <span className="text-[10px] opacity-80 font-mono">951 171 534</span>
          </div>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
      </a>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. VARIANTE: TOPBAR-ITEM (Opción en menú de perfil)
  // ─────────────────────────────────────────────────────────────
  if (variant === "topbar-item") {
    return (
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={clsx(
          "flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-surface-700 dark:text-surface-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all duration-150 group cursor-pointer text-left",
          className
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-5 h-5 rounded-md bg-emerald-500 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
            <WhatsAppIcon className="w-3 h-3" />
          </div>
          <span className="truncate">Soporte Hotel Italia (951 171 534)</span>
        </div>
        <ExternalLink className="w-3 h-3 text-surface-400 group-hover:text-emerald-500 transition-colors shrink-0" />
      </a>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. VARIANTE: CARD (Tarjeta en /configuracion)
  // ─────────────────────────────────────────────────────────────
  if (variant === "card") {
    return (
      <section
        className={clsx(
          "bg-white dark:bg-surface-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 relative border border-emerald-500/20 dark:border-emerald-500/20 shadow-sm overflow-hidden group hover:border-emerald-500/40 transition-all duration-300",
          className
        )}
      >
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none group-hover:bg-emerald-500/15 transition-all" />

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
              <WhatsAppIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-surface-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Soporte Directo — Hotel Italia</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  WHATSAPP
                </span>
              </h3>
              <p className="text-[11px] text-surface-500 dark:text-surface-400 font-medium">
                Atención técnica directa para administradores de Hotel Italia
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-500/30">
            951 171 534
          </span>
        </div>

        <p className="text-xs text-surface-600 dark:text-surface-300 mb-4 leading-relaxed">
          ¿Dudas técnicas, problemas con marcación de colaboradores o configuración de turnos y sedes de Hotel Italia? Inicia una conversación directa con soporte especializado a través de WhatsApp.
        </p>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs transition-all shadow-sm hover:shadow-md hover:shadow-emerald-600/20 active:scale-[0.99] cursor-pointer group"
        >
          <WhatsAppIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span>Abrir Soporte en WhatsApp · Hotel Italia (+51 951 171 534)</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
        </a>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 4. VARIANTE: BUTTON (Pill estándar con colores de marca)
  // ─────────────────────────────────────────────────────────────
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx(
        "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 shadow-sm transition-all duration-200 active:scale-95 cursor-pointer group",
        className
      )}
      title="Contactar soporte técnico por WhatsApp (951 171 534)"
    >
      <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
        <WhatsAppIcon className="w-2.5 h-2.5" />
      </div>
      <span>Soporte WhatsApp</span>
      <span className="text-[10px] font-mono opacity-80">951 171 534</span>
    </a>
  );
}
