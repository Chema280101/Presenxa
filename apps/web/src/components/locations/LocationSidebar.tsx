"use client";

import React from "react";
import Link from "next/link";
import { 
  MapPin, 
  QrCode, 
  Activity, 
  Building, 
  ArrowRight, 
  ShieldCheck, 
  Wifi,
  Server
} from "lucide-react";

interface LocationSidebarProps {
  totalLocations: number;
  totalKiosks: number;
}

export function LocationSidebar({ totalLocations, totalKiosks }: LocationSidebarProps) {
  return (
    <aside className="flex flex-col gap-6">
      {/* 1. KIOSKS MANAGEMENT CALLOUT */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-surface-200 dark:border-surface-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">Puntos Kiosk Locales</h3>
              <p className="text-[11px] text-surface-500 dark:text-surface-400">{totalKiosks} terminales en {totalLocations} sedes</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-800 flex flex-col items-center text-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-surface-100 dark:bg-surface-700/50 flex items-center justify-center text-surface-500 dark:text-surface-400 mb-1">
            <QrCode className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-surface-900 dark:text-surface-100">
            Gestión de Hardware Centralizada
          </span>
          <p className="text-[11px] text-surface-500 dark:text-surface-400 leading-relaxed max-w-xs">
            Para emparejar nuevos tótems, revisar latencias de red y asignar periféricos, utiliza el módulo de kioskos.
          </p>

          <Link
            href="/kiosks"
            className="mt-2 w-full py-2 px-3 rounded-xl bg-primary-50 dark:bg-primary-500/10 hover:bg-primary-100 dark:hover:bg-primary-500/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-500/30 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <span>Administrar Kioskos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 2. HARDWARE HEALTH & TELEMETRY */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-surface-200 dark:border-surface-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-info-50 dark:bg-info-500/10 border border-info-200 dark:border-info-500/20 flex items-center justify-center text-info-600 dark:text-info-400">
              <Server className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">Salud del Hardware</h3>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-500/15 border border-primary-200 dark:border-primary-500/30 text-primary-700 dark:text-primary-300 font-mono text-[10px] font-bold">
            Monitoreo Activo
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {/* Row 1: Telemetría de Red */}
          <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-surface-100 dark:bg-surface-700/60 flex items-center justify-center text-surface-600 dark:text-surface-300">
                <Wifi className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xs text-surface-900 dark:text-surface-100">Telemetría de Red</span>
                <span className="text-[10px] text-surface-500 dark:text-surface-400">Latencia estimada ~12ms</span>
              </div>
            </div>
            <span className="text-primary-700 dark:text-primary-400 font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20">
              OK
            </span>
          </div>

          {/* Row 2: Sincronización Local */}
          <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-surface-100 dark:bg-surface-700/60 flex items-center justify-center text-surface-600 dark:text-surface-300">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xs text-surface-900 dark:text-surface-100">Sincronización Local</span>
                <span className="text-[10px] text-surface-500 dark:text-surface-400">Protocolo offline activo</span>
              </div>
            </div>
            <span className="text-info-700 dark:text-info-400 font-mono text-xs font-bold bg-info-50 dark:bg-info-500/10 border border-info-200 dark:border-info-500/20 px-2 py-0.5 rounded">
              Activa
            </span>
          </div>

          {/* Row 3: Seguridad & Cifrado */}
          <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-surface-100 dark:bg-surface-700/60 flex items-center justify-center text-surface-600 dark:text-surface-300">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xs text-surface-900 dark:text-surface-100">Seguridad QR</span>
                <span className="text-[10px] text-surface-500 dark:text-surface-400">Firma HMAC-SHA256</span>
              </div>
            </div>
            <span className="text-primary-700 dark:text-primary-400 font-mono text-xs font-bold bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 px-2 py-0.5 rounded">
              Protegido
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
