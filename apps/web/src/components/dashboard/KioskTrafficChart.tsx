"use client";

import { useState } from "react";
import { QrCode, CreditCard, KeyRound, Zap, ShieldCheck } from "lucide-react";



export interface SlotData {
  time: string;
  count: number;
  isPeak?: boolean;
  isCurrent?: boolean;
  heightPercent: number;
}

interface KioskTrafficChartProps {
  slots: SlotData[];
  peakCount: number;
  methodsDist?: {
    qr: number;
    nfc: number;
    pin: number;
  };
}

export function KioskTrafficChart({
  slots = [],
  peakCount = 0,
  methodsDist = { qr: 0, nfc: 0, pin: 0 }
}: KioskTrafficChartProps) {
  const [activeSlot, setActiveSlot] = useState<SlotData | null>(null);

  return (
    <div className="command-card p-5 sm:p-6 space-y-5">
      {/* Header del gráfico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-surface-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Curva de Tráfico en Terminales Kiosk</span>
          </h3>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Distribución horaria y métodos biométricos/credenciales verificados
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-[11px]">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold">
            Turno Mañana
          </span>

          <div className="flex items-center gap-3 text-surface-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400" />
              <span>QR App ({methodsDist.qr}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500 dark:bg-teal-300" />
              <span>NFC Card ({methodsDist.nfc}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" />
              <span>DNI Pin ({methodsDist.pin}%)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Área de barras / Histograma */}
      <div className="pt-8 pb-2">
        <div className="h-44 sm:h-48 flex items-end justify-between gap-2 sm:gap-4 px-2 sm:px-4 border-b border-surface-200 dark:border-white/[0.08] relative">
          {/* Líneas horizontales tenues de fondo */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
            <div className="border-b border-dashed border-surface-400 dark:border-slate-600 w-full" />
            <div className="border-b border-dashed border-surface-400 dark:border-slate-600 w-full" />
            <div className="border-b border-dashed border-surface-400 dark:border-slate-600 w-full" />
          </div>

          {slots.map((slot, index) => {
            const isFaded = slot.count === 0;

            return (
              <div
                key={slot.time}
                className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer relative"
                onMouseEnter={() => setActiveSlot(slot)}
                onMouseLeave={() => setActiveSlot(null)}
              >
                {/* Badge de Pico */}
                {slot.isPeak && (
                  <div className="absolute -top-7 px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow-md shadow-emerald-950/80 animate-pulse whitespace-nowrap">
                    {slot.count} PICO
                  </div>
                )}

                {/* Badge de En Curso */}
                {slot.isCurrent && (
                  <div className="absolute -top-7 px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-500/20 border border-cyan-300 dark:border-cyan-400 text-cyan-700 dark:text-cyan-300 font-bold text-[10px] tracking-wider uppercase">
                    EN CURSO
                  </div>
                )}

                {/* Barra */}
                <div
                  className={`w-full max-w-[48px] rounded-t-lg transition-all duration-300 relative overflow-hidden ${
                    isFaded
                      ? "border border-dashed border-surface-300 dark:border-slate-700 bg-surface-200/50 dark:bg-slate-900/30"
                      : slot.isPeak
                      ? "bg-gradient-to-t from-emerald-600 via-teal-400 to-cyan-300 shadow-lg shadow-emerald-500/20 group-hover:brightness-110"
                      : slot.isCurrent
                      ? "bg-gradient-to-t from-cyan-600 to-cyan-400 ring-1 ring-cyan-300 shadow-md shadow-cyan-500/20"
                      : "bg-gradient-to-t from-emerald-800/70 to-emerald-600/70 group-hover:to-emerald-500"
                  }`}
                  style={{ height: `${slot.heightPercent}%` }}
                >
                  {/* Brillo superior en la barra */}
                  {!isFaded && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-white/40" />
                  )}
                </div>

                {/* Etiqueta de hora */}
                <span
                  className={`text-[11px] font-mono tracking-tight transition-colors ${
                    slot.isPeak
                      ? "text-emerald-600 dark:text-emerald-400 font-bold"
                      : slot.isCurrent
                      ? "text-cyan-600 dark:text-cyan-300 font-bold"
                      : isFaded
                      ? "text-surface-400 dark:text-slate-600"
                      : "text-surface-500 dark:text-slate-400 group-hover:text-surface-900 dark:group-hover:text-slate-200"
                  }`}
                >
                  {slot.time}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer de telemetría de hardware */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
          <span>
            Pico de <strong className="text-white">{peakCount} marcaciones</strong> en 15 minutos atendido sin colas
          </span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              <strong className="text-white font-mono font-bold">1.4s</strong> por colaborador
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Anti-Passback Activado</span>
          </div>
        </div>
      </div>
    </div>
  );
}
