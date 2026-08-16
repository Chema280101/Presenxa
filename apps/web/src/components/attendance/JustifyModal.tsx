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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-[fade-in_0.2s_ease-out]">
      <div className="relative w-full max-w-md rounded-3xl p-6 glass border border-white/10 shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Justificar Inasistencia / Incidencia
              </h3>
              <p className="text-xs text-slate-400">{attendance.userName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          {/* Tipo de justificación */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tipo de Resolución
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus(AttendanceStatus.JUSTIFICADO)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  status === AttendanceStatus.JUSTIFICADO
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-white/5 text-slate-400 border-white/5 hover:text-white"
                }`}
              >
                Falta Justificada (Salud/Cita)
              </button>
              <button
                type="button"
                onClick={() => setStatus(AttendanceStatus.PERMISO)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  status === AttendanceStatus.PERMISO
                    ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                    : "bg-white/5 text-slate-400 border-white/5 hover:text-white"
                }`}
              >
                Permiso Pre-Aprobado
              </button>
            </div>
          </div>

          {/* Motivo o Sustento */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Motivo o Documento de Sustento <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Ej: Descanso médico emitido por EsSalud / Permiso por comisión de servicios..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-900/30 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Aprobar Justificación"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
