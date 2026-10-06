"use client";

import { useState, useEffect } from "react";
import { 
  Building2, 
  Activity, 
  Clock, 
  Download, 
  Bell, 
  ChevronDown, 
  ShieldCheck, 
  Sparkles,
  CheckCircle2,
  FileSpreadsheet
} from "lucide-react";
import { NotificationDropdown } from "@/components/NotificationDropdown";

interface CommandCenterHeaderProps {
  organizationName?: string;
  suiteName?: string;
  sedeName?: string;
  sedeId?: string;
  userRole?: string;
  userName?: string;
  userEmail?: string;
}

export function CommandCenterHeader({
  organizationName = "Presenxa Enterprise",
  suiteName = "SUITE CONTROL",
  sedeName = "Sede Principal",
  sedeId = "LIM-01",
  userRole = "Administrador Principal",
  userName = "Administrador",
  userEmail = "admin@hotelitalia.com",
}: CommandCenterHeaderProps) {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [latency, setLatency] = useState<number>(12);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedSuccess, setExportedSuccess] = useState(false);

  // Reloj digital en vivo con segundos precisos
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("es-PE", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
      
      const weekday = now.toLocaleDateString("es-PE", { weekday: "short" });
      const day = now.getDate();
      const month = now.toLocaleDateString("es-PE", { month: "short" });
      const year = now.getFullYear();
      setCurrentDate(`${weekday}, ${day} ${month} ${year}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);

    // Variación sutil de latencia de red en tiempo real (10ms - 18ms)
    const pingTimer = setInterval(() => {
      setLatency(Math.floor(10 + Math.random() * 8));
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(pingTimer);
    };
  }, []);

  const handleExportCSV = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setExportedSuccess(true);
      setTimeout(() => setExportedSuccess(false), 3000);
    }, 1200);
  };

  return (
    <div className="w-full space-y-3">
      {/* Barra de Telemetría Superior */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#08101a] border border-white/[0.07] text-xs text-slate-300 shadow-md">
        {/* Lado izquierdo: Suite & Sede */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-xs uppercase tracking-widest font-extrabold text-slate-300">
              {suiteName}
            </span>
            <span className="font-black text-white text-[15px] tracking-tight flex items-center gap-2 ml-1">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 shadow-sm">
                <Building2 className="w-4 h-4 text-cyan-400 drop-shadow-md" />
              </div>
              <span>{organizationName}</span>
            </span>
          </div>

          <span className="text-slate-600 hidden sm:inline">|</span>

          {/* Sede badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-300 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>{sedeName}</span>
            <span className="text-cyan-400 font-mono text-xs uppercase tracking-wider">({sedeId})</span>
          </div>
        </div>

        {/* Centro / Derecha: Telemetría en vivo */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap ml-auto">
          {/* Live Engine Latency Pill */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span className="font-semibold text-emerald-400">Live Engine</span>
            <span className="text-slate-400 font-tabular">{latency}ms</span>
          </div>

          {/* Reloj Digital */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-white/[0.04] border border-white/10 font-mono text-white">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-slate-400 capitalize">{currentDate}</span>
            <span className="font-bold text-cyan-300 text-xs tracking-wider font-tabular">
              {currentTime || "08:34:22"}
            </span>
          </div>

          {/* Apertura SOD Status */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-300 font-mono">
            <span className="text-slate-400">Apertura SOD:</span>
            <span className="text-slate-200 font-bold">06:00:00</span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              AM OK
            </span>
          </div>

          {/* Botón Exportar CSV */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className={`px-3 py-2 min-h-[32px] rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              exportedSuccess
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                : "bg-white/[0.05] hover:bg-white/[0.1] border-white/10 hover:border-cyan-400/40 text-slate-200 hover:text-white"
            }`}
            title="Exportar reporte estructurado en CSV"
          >
            {exportedSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Reporte Listo</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isExporting ? "Generando..." : "Exportar CSV"}</span>
              </>
            )}
          </button>

          {/* Centro de Notificaciones */}
          <NotificationDropdown />
        </div>
      </div>
    </div>
  );
}
