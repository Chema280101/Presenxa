"use client";

import { useState, useEffect } from "react";
import { X, Clock, Edit3, ShieldAlert, Loader2 } from "lucide-react";
import { AttendanceStatus } from "@asistencias/db";
import { format } from "date-fns";

interface EditAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendance: {
    id: string;
    userName: string;
    date: string;
    status: AttendanceStatus;
    entryTime?: string | null;
    exitTime?: string | null;
    notes?: string | null;
    lateMinutes?: number | null;
  } | null;
  onSuccess: () => void;
}

export function EditAttendanceModal({
  isOpen,
  onClose,
  attendance,
  onSuccess,
}: EditAttendanceModalProps) {
  const [status, setStatus] = useState<AttendanceStatus>(AttendanceStatus.PRESENTE);
  const [entryTime, setEntryTime] = useState("");
  const [exitTime, setExitTime] = useState("");
  const [notes, setNotes] = useState("");
  const [lateMinutes, setLateMinutes] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (attendance) {
      setStatus(attendance.status);
      setEntryTime(
        attendance.entryTime ? format(new Date(attendance.entryTime), "HH:mm") : ""
      );
      setExitTime(
        attendance.exitTime ? format(new Date(attendance.exitTime), "HH:mm") : ""
      );
      setNotes(attendance.notes || "");
      setLateMinutes(attendance.lateMinutes || 0);
    }
    setError("");
  }, [attendance, isOpen]);

  if (!isOpen || !attendance) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      // Build date objects for entry/exit if specified
      let entryDateStr = null;
      let exitDateStr = null;

      if (entryTime) {
        const [eH, eM] = entryTime.split(":").map(Number);
        const d = new Date(attendance.date);
        d.setHours(eH, eM, 0, 0);
        entryDateStr = d.toISOString();
      }

      if (exitTime) {
        const [xH, xM] = exitTime.split(":").map(Number);
        const d = new Date(attendance.date);
        d.setHours(xH, xM, 0, 0);
        exitDateStr = d.toISOString();
      }

      const res = await fetch(`/api/attendance/${attendance.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          entryTime: entryDateStr,
          exitTime: exitDateStr,
          notes: notes.trim() || null,
          lateMinutes: Number(lateMinutes) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar");

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al actualizar registro");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/80 backdrop-blur-md overflow-hidden animate-[fade-in_0.2s_ease-out]">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl glass border border-white/15 shadow-2xl shadow-black/90 my-auto overflow-hidden">
        {/* Header - Fixed Top */}
        <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-white/10 bg-white/[0.02] flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl gradient-brand text-white shadow-lg shadow-indigo-900/40">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
                Editar Registro de Asistencia
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Empleado: <strong className="text-slate-200">{attendance.userName}</strong> · Fecha: {attendance.date}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} id="edit-attendance-form" className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
          {error && (
            <div className="px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
              <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0 animate-ping" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Estado */}
          <div className="rounded-2xl p-5 bg-white/[0.02] border border-white/10 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                1. Estado Oficial y Horas Marcadas
              </h4>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Estado de la Asistencia
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
              >
                <option value={AttendanceStatus.PRESENTE}>Presente (Completado)</option>
                <option value={AttendanceStatus.TARDE}>Tardanza</option>
                <option value={AttendanceStatus.AUSENTE}>Ausente (Falta)</option>
                <option value={AttendanceStatus.ABANDONO_PUESTO}>Abandono de Puesto</option>
                <option value={AttendanceStatus.INCOMPLETO}>Incompleto (Sin salida)</option>
                <option value={AttendanceStatus.PENDIENTE}>Pendiente (En curso)</option>
                <option value={AttendanceStatus.JUSTIFICADO}>Justificado</option>
                <option value={AttendanceStatus.PERMISO}>Permiso</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Hora de Entrada
                </label>
                <input
                  type="time"
                  value={entryTime}
                  onChange={(e) => setEntryTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white text-sm font-mono outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Hora de Salida
                </label>
                <input
                  type="time"
                  value={exitTime}
                  onChange={(e) => setExitTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white text-sm font-mono outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Minutos de Retraso / Tardanza Calculados
              </label>
              <input
                type="number"
                min={0}
                value={lateMinutes}
                onChange={(e) => setLateMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono outline-none"
              />
            </div>
          </div>

          {/* Section 2: Auditoría */}
          <div className="rounded-2xl p-5 bg-white/[0.02] border border-white/10 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                2. Notas de Auditoría y Justificación
              </h4>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Motivo del Ajuste Manual
              </label>
              <textarea
                rows={3}
                placeholder="Indica la justificación o motivo del ajuste manual realizado por el administrador..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-indigo-500 outline-none resize-none"
              />
            </div>
          </div>
        </form>

        {/* Footer - Fixed Bottom */}
        <div className="px-6 md:px-8 py-4 border-t border-white/10 bg-black/30 backdrop-blur-sm flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="edit-attendance-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-brand hover:opacity-95 active:scale-[0.98] text-white text-sm font-semibold shadow-lg shadow-indigo-900/40 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Ajuste"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
