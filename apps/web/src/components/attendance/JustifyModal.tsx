"use client";

import { useState, useEffect } from "react";
import { FileText, CheckCircle2, Loader2, Check } from "lucide-react";
import { AttendanceStatus } from "@asistencias/db";
import { clsx } from "clsx";
import { ModalShell } from "@/components/ui/ModalShell";

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

  const premiumInputClass =
    "w-full h-11 px-4 text-sm bg-white dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-surface-900 dark:text-white placeholder:text-surface-400 dark:placeholder:text-surface-500 font-medium rounded-xl border border-surface-200 dark:border-white/10 dark:hover:border-white/20 shadow-xs focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20 outline-none transition-all";

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="h-10 px-5 rounded-xl bg-danger-50 hover:bg-danger-100 text-danger-700 hover:text-danger-800 border border-danger-200 hover:border-danger-300 dark:bg-danger-500/10 dark:hover:bg-danger-500/20 dark:text-danger-300 dark:hover:text-danger-200 dark:border-danger-500/30 dark:hover:border-danger-500/50 text-sm font-semibold flex items-center justify-center transition cursor-pointer disabled:opacity-50"
      >
        Cancelar
      </button>
      <button
        type="submit"
        form="justify-form"
        disabled={isSubmitting}
        className="h-10 px-6 rounded-xl bg-warning-500 hover:bg-warning-600 text-white shadow-sm hover:shadow-md hover:shadow-warning-500/20 text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Guardando...</span>
          </>
        ) : (
          <>
            <Check className="w-4 h-4" />
            <span>Guardar Justificación</span>
          </>
        )}
      </button>
    </>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Justificar Inasistencia / Permiso"
      description={`Colaborador: ${attendance.userName} · Fecha: ${attendance.date}`}
      icon={FileText}
      iconVariant="warning"
      maxWidth="2xl"
      footer={footer}
    >
      <form onSubmit={handleSubmit} id="justify-form" className="space-y-6 py-2">
        {error && (
          <div className="px-4 py-3 rounded-2xl bg-danger-500/10 border border-danger-500/25 text-danger-700 dark:text-danger-300 text-xs flex items-center gap-2.5 animate-shake">
            <span className="w-2 h-2 rounded-full bg-danger-500 flex-shrink-0 animate-ping" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Tipo */}
        <div className="rounded-2xl p-5 bg-surface-50 dark:bg-surface-900/40 border border-surface-200 dark:border-white/10 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-surface-200 dark:border-white/5">
            <CheckCircle2 className="w-4 h-4 text-warning-500" />
            <h4 className="text-xs font-bold text-surface-900 dark:text-slate-200 uppercase tracking-wider">
              1. Tipo de Justificación o Permiso
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStatus(AttendanceStatus.JUSTIFICADO)}
              className={clsx(
                "py-3.5 px-4 rounded-2xl text-xs font-semibold border transition-all text-left flex flex-col gap-1 cursor-pointer",
                status === AttendanceStatus.JUSTIFICADO
                  ? "bg-warning-50 dark:bg-warning-500/20 text-warning-700 dark:text-warning-300 border-warning-200 dark:border-warning-500/40 ring-1 ring-warning-500/40 shadow-sm"
                  : "bg-white dark:bg-white/5 text-surface-500 dark:text-slate-400 border-surface-200 dark:border-white/5 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-white/10"
              )}
            >
              <span className="font-bold text-sm text-surface-900 dark:text-white">Falta Justificada</span>
              <span className="text-[11px] text-surface-500 dark:text-slate-400 font-medium mt-0.5">Descanso médico, cita médica o fuerza mayor</span>
            </button>
            <button
              type="button"
              onClick={() => setStatus(AttendanceStatus.PERMISO)}
              className={clsx(
                "py-3.5 px-4 rounded-2xl text-xs font-semibold border transition-all text-left flex flex-col gap-1 cursor-pointer",
                status === AttendanceStatus.PERMISO
                  ? "bg-info-50 dark:bg-info-500/20 text-info-700 dark:text-info-300 border-info-200 dark:border-info-500/40 ring-1 ring-info-500/40 shadow-sm"
                  : "bg-white dark:bg-white/5 text-surface-500 dark:text-slate-400 border-surface-200 dark:border-white/5 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-white/10"
              )}
            >
              <span className="font-bold text-sm text-surface-900 dark:text-white">Permiso Pre-Aprobado</span>
              <span className="text-[11px] text-surface-500 dark:text-slate-400 font-medium mt-0.5">Comisión de servicios, capacitación o trámite</span>
            </button>
          </div>
        </div>

        {/* Section 2: Sustento */}
        <div className="rounded-2xl p-5 bg-surface-50 dark:bg-surface-900/40 border border-surface-200 dark:border-white/10 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-surface-200 dark:border-white/5">
            <FileText className="w-4 h-4 text-primary-500" />
            <h4 className="text-xs font-bold text-surface-900 dark:text-slate-200 uppercase tracking-wider">
              2. Sustento o Documento de Respaldo
            </h4>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-slate-300 mb-1.5">
              Motivo / Detalle del Sustento <span className="text-danger-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Ej: Certificado médico emitido por ESSALUD / CITT N° 123456 con fecha 16/08/2026..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={clsx(premiumInputClass, "py-3 h-auto resize-none")}
            />
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
