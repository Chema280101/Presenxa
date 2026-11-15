"use client";

import React from "react";
import { ExternalLink } from "lucide-react";
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

const ADMIN_ROLES = new Set([
  "ADMIN",
  "SUPER_ADMIN",
  "SUPERADMIN",
  "Administrador",
  "Super Admin",
  "Super Administrador",
  "ADMINISTRADOR",
  "SUPER ADMIN",
]);

// Icono oficial de WhatsApp (Simple Icons con margen seguro en viewBox)
export function WhatsAppIcon({ className = "w-4 h-4" }: Readonly<{ className?: string }>) {
  return (
    <svg
      viewBox="-1 -1 26 26"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export function AdminWhatsAppSupportButton({
  variant = "button",
  userRole,
  userName,
  organizationName: _organizationName = "Hotel Italia",
  phone = "51951171534",
  customMessage,
  className,
}: Readonly<AdminWhatsAppSupportButtonProps>) {
  // Verificación de rol opcional: si se suministra userRole y no es admin, no renderizar
  if (userRole && !ADMIN_ROLES.has(userRole)) {
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
    parts.push(
      "🏨 Empresa: Hotel Italia",
      "¿Podrías asistirme por favor? Muchas gracias."
    );
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
        role="menuitem"
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
