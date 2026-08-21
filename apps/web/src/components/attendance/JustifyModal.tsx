"use client";

import { useState } from "react";
import { X, FileText, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";
import { AttendanceStatus } from "@asistencias/db";

interface JustifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendance: {
    id: string;
    userName: string;
    date: string;
    currentStatus: AttendanceStatus;
  } | null;
  onSuccess: () => void;
}

export function JustifyModal({
  isOpen,
  onClose,
  attendance,
  onSuccess,
}: JustifyModalProps) {
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<AttendanceStatus>(
    AttendanceStatus.JUSTIFICADO
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !attendance) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Por favor ingresa el motivo de la justificación.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/attendance/${attendance.id}/justify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim(), status }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al justificar");

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al procesar justificación");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-surface-950/80 backdrop-blur-md overflow-hidden animate-fade-in-up">
      <div 
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border border-primary-400/20 shadow-2xl shadow-black/90 my-auto overflow-hidden animate-scale-up"
        style={{ background: "rgba(10, 27, 44, 0.98)", backdropFilter: "blur(24px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-surface-950/40 flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Justificar Inasistencia / Permiso
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Colaborador: <strong className="text-slate-200">{attendance.userName}</strong> · Fecha: {attendance.date}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} id="justify-form" className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="px-4 py-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
              <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0 animate-ping" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Tipo */}
          <div className="rounded-2xl p-5 bg-surface-950/40 border border-white/8 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                1. Tipo de Justificación o Permiso
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus(AttendanceStatus.JUSTIFICADO)}
                className={`py-3.5 px-4 rounded-2xl text-xs font-semibold border transition-all text-left flex flex-col gap-1 cursor-pointer ${
                  status === AttendanceStatus.JUSTIFICADO
                    ? "bg-amber-500/20 text-amber-200 border-amber-500/40 ring-1 ring-amber-500/40"
                    : "bg-white/5 text-slate-400 border-white/5 hover:text-white hover:bg-white/10"
                }`}
              >
                <span className="font-bold text-sm">Falta Justificada</span>
                <span className="text-[11px] text-slate-400">Descanso médico, cita médica o fuerza mayor</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus(AttendanceStatus.PERMISO)}
                className={`py-3.5 px-4 rounded-2xl text-xs font-semibold border transition-all text-left flex flex-col gap-1 cursor-pointer ${
                  status === AttendanceStatus.PERMISO
                    ? "bg-sky-500/20 text-sky-200 border-sky-500/40 ring-1 ring-sky-500/40"
                    : "bg-white/5 text-slate-400 border-white/5 hover:text-white hover:bg-white/10"
                }`}
              >
                <span className="font-bold text-sm">Permiso Pre-Aprobado</span>
                <span className="text-[11px] text-slate-400">Comisión de servicios, capacitación o trámite</span>
              </button>
            </div>
          </div>

          {/* Section 2: Sustento */}
          <div className="rounded-2xl p-5 bg-surface-950/40 border border-white/8 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <FileText className="w-4 h-4 text-primary-400" />
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                2. Sustento o Documento de Respaldo
              </h4>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Motivo / Detalle del Sustento <span className="text-rose-400">*</span>
              </label>
              <textarea
                required
                rows={4}
                placeholder="Ej: Certificado médico emitido por ESSALUD / CITT N° 123456 con fecha 16/08/2026..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none transition-all resize-none input-standard"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-surface-950/60 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="justify-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-surface-950 font-bold text-xs shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Aprobar Justificación"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
