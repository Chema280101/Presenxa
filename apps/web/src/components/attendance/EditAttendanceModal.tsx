"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Clock, Edit3, ShieldAlert, Loader2, Sun, Moon } from "lucide-react";
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
    entryTime2?: string | null;
    exitTime2?: string | null;
    notes?: string | null;
    lateMinutes?: number | null;
    lateMinutes2?: number | null;
  } | null;
  onSuccess: () => void;
}

export function EditAttendanceModal({
  isOpen,
  onClose,
  attendance,
  onSuccess,
}: EditAttendanceModalProps) {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<AttendanceStatus>(AttendanceStatus.PRESENTE);
  const [entryTime, setEntryTime] = useState("");
  const [exitTime, setExitTime] = useState("");
  const [entryTime2, setEntryTime2] = useState("");
  const [exitTime2, setExitTime2] = useState("");
  const [notes, setNotes] = useState("");
  const [lateMinutes, setLateMinutes] = useState(0);
  const [lateMinutes2, setLateMinutes2] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (attendance) {
      setStatus(attendance.status);
      setEntryTime(
        attendance.entryTime ? format(new Date(attendance.entryTime), "HH:mm") : ""
      );
      setExitTime(
        attendance.exitTime ? format(new Date(attendance.exitTime), "HH:mm") : ""
      );
      setEntryTime2(
        attendance.entryTime2 ? format(new Date(attendance.entryTime2), "HH:mm") : ""
      );
      setExitTime2(
        attendance.exitTime2 ? format(new Date(attendance.exitTime2), "HH:mm") : ""
      );
      setNotes(attendance.notes || "");
      setLateMinutes(attendance.lateMinutes || 0);
      setLateMinutes2(attendance.lateMinutes2 || 0);
    }
    setError("");
  }, [attendance, isOpen]);

  if (!isOpen || !attendance || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/attendance/${attendance.id}/edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          entryTime: entryTime || null,
          exitTime: exitTime || null,
          entryTime2: entryTime2 || null,
          exitTime2: exitTime2 || null,
          notes: notes.trim(),
          lateMinutes,
          lateMinutes2,
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-surface-950/80 backdrop-blur-md overflow-hidden animate-fade-in-up">
      <div 
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl border border-primary-400/20 shadow-2xl shadow-black/90 my-auto overflow-hidden animate-scale-up"
        style={{ background: "rgba(10, 27, 44, 0.98)", backdropFilter: "blur(24px)" }}
      >
        {/* Header - Fixed Top */}
        <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-white/10 bg-surface-950/40 flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-primary-400/15 text-primary-300 ring-1 ring-primary-400/30">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Editar Registro de Asistencia
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
        <form onSubmit={handleSubmit} id="edit-attendance-form" className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
          {error && (
            <div className="px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
              <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0 animate-ping" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Estado General */}
          <div className="rounded-2xl p-5 bg-white/[0.02] border border-white/10 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                1. Estado Oficial de la Asistencia
              </h4>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Estado Calculado / Manual
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
          </div>

          {/* Section 2: Tramo 1 */}
          <div className="rounded-2xl p-5 bg-amber-500/[0.03] border border-amber-500/20 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-amber-500/10">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  2. Tramo 1 (Turno Mañana / Jornada Continua)
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Hora de Entrada (T1)
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
                  Hora de Salida (T1 / Salida Continua)
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
                Minutos de Tardanza en Tramo 1
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

          {/* Section 3: Tramo 2 (Horario Partido) */}
          <div className="rounded-2xl p-5 bg-indigo-500/[0.03] border border-indigo-500/20 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-500/10">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                  3. Tramo 2 (Turno Tarde / Retorno de Receso)
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 italic">Opcional (solo horario partido)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Hora de Entrada (T2)
                </label>
                <input
                  type="time"
                  value={entryTime2}
                  onChange={(e) => setEntryTime2(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white text-sm font-mono outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Hora de Salida Final (T2)
                </label>
                <input
                  type="time"
                  value={exitTime2}
                  onChange={(e) => setExitTime2(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white text-sm font-mono outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Minutos de Tardanza en Tramo 2
              </label>
              <input
                type="number"
                min={0}
                value={lateMinutes2}
                onChange={(e) => setLateMinutes2(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono outline-none"
              />
            </div>
          </div>

          {/* Section 4: Auditoría y Justificación */}
          <div className="rounded-2xl p-5 bg-white/[0.02] border border-white/10 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                4. Notas de Auditoría y Justificación
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

        {/* Footer */}
        <div className="px-6 md:px-8 py-4 border-t border-white/10 bg-surface-950/60 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="edit-attendance-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-400 hover:bg-primary-300 text-surface-950 text-xs font-bold shadow-lg shadow-primary-950/50 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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
    </div>,
    document.body
  );
}
