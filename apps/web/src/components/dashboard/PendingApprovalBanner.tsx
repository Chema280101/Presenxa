"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, X, ShieldAlert, Camera } from "lucide-react";

interface PendingApprovalBannerProps {
  pendingCount?: number;
  collaboratorName?: string;
  role?: string;
  code?: string;
  kioskName?: string;
  timeStr?: string;
  reason?: string;
  photoUrl?: string;
}

export function PendingApprovalBanner({
  pendingCount = 1,
  collaboratorName = "Marcos Huamán",
  role = "Ayudante de Cocina",
  code = "#44892",
  kioskName = "Kiosk Cocina Caliente",
  timeStr = "08:31:02 AM",
  reason = "olvido de fotocheck NFC",
  photoUrl,
}: PendingApprovalBannerProps) {
  const [approved, setApproved] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (dismissed) return null;

  const handleApprove = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setApproved(true);
      setTimeout(() => {
        setDismissed(true);
      }, 2500);
    }, 600);
  };

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
          approved
            ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-200"
            : "border-amber-500/35 bg-gradient-to-r from-amber-500/10 via-[#16130b] to-[#0d121c] text-amber-200 shadow-lg shadow-amber-950/20"
        } p-4 sm:p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4`}
      >
        {/* Glow de fondo */}
        <div className="absolute top-0 right-1/4 w-96 h-20 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3.5 z-10 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              approved
                ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40"
                : "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40"
            }`}
          >
            {approved ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-scale-up" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
            )}
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white tracking-tight">
                {approved
                  ? "Marcación Manual Validada con Éxito"
                  : "Marcación Manual por DNI Requiere Validación"}
              </span>
              {!approved && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-400/40 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
                  {pendingCount} PENDIENTE
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {approved ? (
                <span>
                  La asistencia de <strong className="text-white">{collaboratorName}</strong> ha sido registrada como <span className="text-emerald-400 font-semibold">PUNTUAL (con justificación manual)</span>.
                </span>
              ) : (
                <span>
                  <strong className="text-amber-100">{collaboratorName}</strong> ({role} {code}) marcó vía teclado en{" "}
                  <span className="text-white font-medium">{kioskName}</span> a las{" "}
                  <span className="font-mono text-amber-300 font-bold">{timeStr}</span> por{" "}
                  <span className="text-slate-200 underline decoration-amber-500/40">{reason}</span>.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Acciones */}
        {!approved && (
          <div className="flex items-center gap-2.5 z-10 flex-shrink-0 self-end md:self-center">
            <button
              onClick={handleApprove}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-amber-950/50 hover:shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>{loading ? "Aprobando..." : "Aprobar Marcación"}</span>
            </button>

            <button
              onClick={() => setIsPhotoModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 font-semibold text-xs sm:text-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>Revisar Foto</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal de Verificación Biométrica */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in-up">
          <div className="relative w-full max-w-lg command-card p-6 border border-white/15 bg-[#0b1320] shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Camera className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Auditoría Biométrica Kiosk</h3>
                  <p className="text-[11px] text-slate-400">Captura instantánea de cámara de seguridad</p>
                </div>
              </div>
              <button
                onClick={() => setIsPhotoModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-5 space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                {/* Foto perfil */}
                <div className="space-y-1.5 text-center">
                  <div className="text-[11px] font-semibold text-slate-400">Foto en Padrón RR.HH.</div>
                  <div className="w-full aspect-square rounded-xl bg-slate-900 border border-white/10 overflow-hidden relative flex items-center justify-center">
                    <img
                      src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(collaboratorName)}&backgroundColor=0ea5e9&textColor=ffffff`}
                      alt="Padrón"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-white">
                      Activo #44892
                    </div>
                  </div>
                </div>

                {/* Foto capturada por Kiosk */}
                <div className="space-y-1.5 text-center">
                  <div className="text-[11px] font-semibold text-amber-400 flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    Captura Tótem {timeStr}
                  </div>
                  <div className="w-full aspect-square rounded-xl bg-slate-900 border border-amber-500/40 overflow-hidden relative flex items-center justify-center">
                    <img
                      src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(collaboratorName)}&backgroundColor=f59e0b&textColor=060e17`}
                      alt="Captura Kiosk"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-amber-500/90 text-[10px] font-mono font-bold text-slate-950">
                      Coincidencia 98.4%
                    </div>
                  </div>
                </div>
              </div>

              {/* Detalles de Auditoría */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1 text-xs text-slate-300 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Ubicación Tótem:</span>
                  <span className="text-white font-semibold">{kioskName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Método de Marcación:</span>
                  <span className="text-amber-400 font-bold">DNI Pin Manual (Teclado)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Verificación Liveness:</span>
                  <span className="text-emerald-400 font-semibold">Humano Real (Anti-Spoofing OK)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                onClick={() => setIsPhotoModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setIsPhotoModalOpen(false);
                  handleApprove();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-950/50 cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aprobar y Registrar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
