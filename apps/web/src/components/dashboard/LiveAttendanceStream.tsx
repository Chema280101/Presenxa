"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Radio, 
  ChevronRight, 
  ShieldCheck, 
  Smartphone, 
  CreditCard, 
  KeyRound, 
  Tablet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  LogOut
} from "lucide-react";

export interface StreamEvent {
  id: string;
  initials: string;
  name: string;
  method: string | null;
  area: string;
  kiosk: string;
  status: string;
  lateDetail?: string;
  timeStr: string;
  avatarColor: "emerald" | "amber" | "rose" | "slate";
}

interface LiveAttendanceStreamProps {
  initialEvents: StreamEvent[];
  totalMarcaciones: number;
  onlineKiosks: number;
  totalKiosks: number;
}

export function LiveAttendanceStream({
  initialEvents,
  totalMarcaciones,
  onlineKiosks,
  totalKiosks
}: LiveAttendanceStreamProps) {
  const [events, setEvents] = useState<StreamEvent[]>(initialEvents);
  const [syncCount, setSyncCount] = useState<number>(totalMarcaciones);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    setEvents(initialEvents);
    setSyncCount(totalMarcaciones);
  }, [initialEvents, totalMarcaciones]);

  // Sincronización continua en segundo plano cada 10 segundos
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        setIsUpdating(true);
        const res = await fetch("/api/attendance");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && isMounted) {
          if (data.length > 0) {
            const mapped: StreamEvent[] = data.slice(0, 8).map((att: any) => {
              const timeDate = att.entryTime || att.checkInTime ? new Date(att.entryTime || att.checkInTime) : new Date(att.createdAt);
              const timeStr = timeDate.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
              const initials = `${att.user?.firstName?.[0] || ""}${att.user?.lastName?.[0] || ""}`.toUpperCase() || "CL";
              const avatarColor = (att.status === "PRESENTE" || att.status === "PUNTUAL") ? "emerald" : att.status === "TARDE" ? "rose" : "slate";
              return {
                id: att.id,
                initials,
                name: `${att.user?.firstName || ""} ${att.user?.lastName || ""}`.trim() || "Colaborador",
                method: att.entryMethod || att.checkInMethod || "KIOSK",
                area: att.user?.department?.name || att.user?.role || "General",
                kiosk: att.kiosk?.name || "Terminal Kiosk",
                status: att.status,
                lateDetail: att.lateMinutes ? `+${att.lateMinutes}m` : undefined,
                timeStr,
                avatarColor,
              };
            });
            setEvents(mapped);
          }
          setSyncCount(data.length);
        }
      } catch {
        // Polling silencioso tolerante a fallos
      } finally {
        if (isMounted) setIsUpdating(false);
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Caja principal del feed */}
      <div className="command-card p-5 space-y-4 flex flex-col justify-between">
        {/* Cabecera con indicador de streaming */}
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-surface-200 dark:border-white/[0.08]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 dark:bg-emerald-400 ${isUpdating ? "opacity-100" : "opacity-75"}`}></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 dark:bg-emerald-400"></span>
              </span>
              <h3 className="text-xs sm:text-sm font-extrabold text-surface-900 dark:text-white tracking-wider uppercase">
                MARCACIONES EN VIVO
              </h3>
            </div>
            <p className="text-[11px] text-surface-500 dark:text-surface-400 font-mono">
              Auto-sync activo • SSL Encriptado
            </p>
          </div>

          <Link
            href="/asistencias"
            className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center gap-1 transition-colors group"
          >
            <span>Auditoría</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Lista de Marcaciones con animación suave */}
        <div className="space-y-3 pt-1">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="p-2.5 rounded-xl bg-surface-100/60 hover:bg-surface-100 dark:bg-white/[0.02] dark:hover:bg-white/[0.04] border border-surface-200/80 hover:border-surface-300 dark:border-white/[0.05] dark:hover:border-white/10 transition-all flex items-center justify-between gap-3 group"
            >
              {/* Avatar + Info */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    evt.avatarColor === "emerald"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                      : evt.avatarColor === "amber"
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                      : evt.avatarColor === "rose"
                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30"
                      : "bg-surface-200 dark:bg-slate-700/40 text-surface-700 dark:text-slate-300 border border-surface-300 dark:border-white/10"
                  }`}
                >
                  {evt.initials}
                </div>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-surface-900 dark:text-white truncate">
                      {evt.name}
                    </span>

                    {/* Badge de método de acceso */}
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                        evt.method === "QR"
                          ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30"
                          : evt.method === "NFC"
                          ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {evt.method}
                    </span>
                  </div>

                  <p className="text-[10px] text-surface-500 dark:text-surface-400 truncate">
                    {evt.area} <span className="text-surface-300 dark:text-slate-600">•</span> {evt.kiosk}
                  </p>
                </div>
              </div>

              {/* Estado + Hora */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {(evt.status === "PUNTUAL" || evt.status === "PRESENTE") && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider">
                    PUNTUAL
                  </span>
                )}
                {evt.status === "POR VALIDAR" && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold text-[10px] uppercase tracking-wider animate-pulse">
                    POR VALIDAR
                  </span>
                )}
                {evt.status === "TARDE" && (
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-700 dark:text-rose-300 font-bold text-[10px] uppercase tracking-wider">
                    TARDE {evt.lateDetail}
                  </span>
                )}
                {evt.status === "SALIDA TM" && (
                  <span className="px-2 py-0.5 rounded bg-surface-200 dark:bg-slate-800 border border-surface-300 dark:border-slate-700 text-surface-700 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <LogOut className="w-2.5 h-2.5" />
                    SALIDA TM
                  </span>
                )}
                {!["PUNTUAL", "PRESENTE", "POR VALIDAR", "TARDE", "SALIDA TM"].includes(evt.status) && (
                  <span className="px-2 py-0.5 rounded bg-surface-200 dark:bg-white/10 border border-surface-300 dark:border-white/10 text-surface-700 dark:text-white font-bold text-[10px] uppercase tracking-wider">
                    {evt.status}
                  </span>
                )}

                <span className="text-[10px] text-surface-500 dark:text-surface-400 font-mono tracking-tight font-tabular">
                  {evt.timeStr}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer con buffer de seguridad */}
        <div className="mt-4 pt-3 border-t border-surface-200 dark:border-white/[0.06] flex items-center justify-between text-[11px]">
          <span className="text-surface-500 dark:text-surface-400 font-tabular font-mono">
            {syncCount} marcaciones hoy
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Buffer criptográfico activo
          </span>
        </div>
      </div>

      {/* Widget de Estado de Hardware Kiosks */}
      <div className="command-card p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <Tablet className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-surface-900 dark:text-white tracking-tight">TERMINALES KIOSK</h4>
            <p className="text-[10px] text-surface-500 dark:text-surface-400">Totems biométricos vinculados</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-[11px] font-mono font-bold">
            {onlineKiosks}/{totalKiosks} Online
          </span>
          <Link
            href="/kiosks"
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-900 dark:hover:text-white hover:bg-surface-200 dark:hover:bg-white/10 transition-colors"
            title="Administrar Kiosks"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
