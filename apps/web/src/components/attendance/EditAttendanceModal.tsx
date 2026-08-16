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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-[fade-in_0.2s_ease-out]">
      <div className="relative w-full max-w-md rounded-3xl p-6 glass border border-white/10 shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl gradient-brand text-white shadow-lg shadow-indigo-900/40">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Editar Registro de Asistencia</h3>
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

          {/* Estado de asistencia */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Estado de la Asistencia
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
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

          {/* Horas de Marcación */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Hora de Entrada
              </label>
              <input
                type="time"
                value={entryTime}
                onChange={(e) => setEntryTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono outline-none"
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
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono outline-none"
              />
            </div>
          </div>

          {/* Minutos de tardanza */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Minutos de Retraso / Tardanza
            </label>
            <input
              type="number"
              min={0}
              value={lateMinutes}
              onChange={(e) => setLateMinutes(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono outline-none"
            />
          </div>

          {/* Notas o motivo del cambio */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Notas de Auditoría
            </label>
            <textarea
              rows={2}
              placeholder="Motivo del ajuste manual por administrador..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:border-indigo-500 outline-none resize-none"
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
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl gradient-brand text-white font-bold text-xs shadow-lg shadow-indigo-900/30 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Ajuste"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
