"use client";

import { useState, useEffect } from "react";
import { Clock, Edit3, ShieldAlert, Loader2, Sun, Moon, Check } from "lucide-react";
import { AttendanceStatus } from "@asistencias/db";
import { format } from "date-fns";
import { clsx } from "clsx";
import { ModalShell } from "@/components/ui/ModalShell";

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

  if (!isOpen || !attendance) return null;

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

  const premiumInputClass =
    "w-full h-11 px-4 text-sm bg-white dark:bg-white text-surface-900 placeholder:text-surface-400 font-medium rounded-xl border border-surface-200 dark:border-transparent shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all";

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
        form="edit-attendance-form"
        disabled={isSubmitting}
        className="h-10 px-5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white shadow-sm hover:shadow-md hover:shadow-primary-500/20 text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Guardando...</span>
          </>
        ) : (
          <>
            <Check className="w-4 h-4" />
            <span>Guardar Ajuste</span>
          </>
        )}
      </button>
    </>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Registro de Asistencia"
      description={`Colaborador: ${attendance.userName} · Fecha: ${attendance.date}`}
      icon={Edit3}
      iconVariant="primary"
      maxWidth="3xl"
      footer={footer}
    >
      <form onSubmit={handleSubmit} id="edit-attendance-form" className="space-y-6 py-2">
        {error && (
          <div className="px-4 py-3 rounded-2xl bg-danger-500/10 border border-danger-500/25 text-danger-700 dark:text-danger-300 text-xs flex items-center gap-2.5 animate-shake">
            <span className="w-2 h-2 rounded-full bg-danger-500 flex-shrink-0 animate-ping" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Estado General */}
        <div className="rounded-2xl p-5 bg-surface-50 dark:bg-surface-900/40 border border-surface-200 dark:border-white/10 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-surface-200 dark:border-white/5">
            <Clock className="w-4 h-4 text-primary-500" />
            <h4 className="text-xs font-bold text-surface-900 dark:text-slate-200 uppercase tracking-wider">
              1. Estado Oficial de la Asistencia
            </h4>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-slate-300 mb-1.5">
              Estado Calculado / Manual
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
              className={clsx(premiumInputClass, "cursor-pointer")}
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
        <div className="rounded-2xl p-5 bg-warning-50 dark:bg-warning-500/5 border border-warning-200 dark:border-warning-500/20 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-warning-200/50 dark:border-warning-500/10">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-warning-500" />
              <h4 className="text-xs font-bold text-warning-800 dark:text-warning-300 uppercase tracking-wider">
                2. Tramo 1 (Turno Mañana / Jornada Continua)
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-slate-300 mb-1.5">
                Hora de Entrada (T1)
              </label>
              <input
                type="time"
                value={entryTime}
                onChange={(e) => setEntryTime(e.target.value)}
                className={clsx(premiumInputClass, "font-mono")}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-slate-300 mb-1.5">
                Hora de Salida (T1 / Salida Continua)
              </label>
              <input
                type="time"
                value={exitTime}
                onChange={(e) => setExitTime(e.target.value)}
                className={clsx(premiumInputClass, "font-mono")}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-slate-300 mb-1.5">
              Minutos de Tardanza en Tramo 1
            </label>
            <input
              type="number"
              min={0}
              value={lateMinutes}
              onChange={(e) => setLateMinutes(Math.max(0, parseInt(e.target.value) || 0))}
              className={clsx(premiumInputClass, "font-mono")}
            />
          </div>
        </div>

        {/* Section 3: Tramo 2 (Horario Partido) */}
        <div className="rounded-2xl p-5 bg-info-50 dark:bg-info-500/5 border border-info-200 dark:border-info-500/20 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-info-200/50 dark:border-info-500/10">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-info-500" />
              <h4 className="text-xs font-bold text-info-800 dark:text-info-300 uppercase tracking-wider">
                3. Tramo 2 (Turno Tarde / Retorno de Receso)
              </h4>
            </div>
            <span className="text-[10px] text-info-600 dark:text-info-400 italic font-medium">Opcional (solo horario partido)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-slate-300 mb-1.5">
                Hora de Entrada (T2)
              </label>
              <input
                type="time"
                value={entryTime2}
                onChange={(e) => setEntryTime2(e.target.value)}
                className={clsx(premiumInputClass, "font-mono")}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-slate-300 mb-1.5">
                Hora de Salida Final (T2)
              </label>
              <input
                type="time"
                value={exitTime2}
                onChange={(e) => setExitTime2(e.target.value)}
                className={clsx(premiumInputClass, "font-mono")}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-slate-300 mb-1.5">
              Minutos de Tardanza en Tramo 2
            </label>
            <input
              type="number"
              min={0}
              value={lateMinutes2}
              onChange={(e) => setLateMinutes2(Math.max(0, parseInt(e.target.value) || 0))}
              className={clsx(premiumInputClass, "font-mono")}
            />
          </div>
        </div>

        {/* Section 4: Auditoría y Justificación */}
        <div className="rounded-2xl p-5 bg-surface-50 dark:bg-surface-900/40 border border-surface-200 dark:border-white/10 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-surface-200 dark:border-white/5">
            <ShieldAlert className="w-4 h-4 text-warning-500" />
            <h4 className="text-xs font-bold text-surface-900 dark:text-slate-200 uppercase tracking-wider">
              4. Notas de Auditoría y Justificación
            </h4>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-slate-300 mb-1.5">
              Motivo del Ajuste Manual
            </label>
            <textarea
              rows={3}
              placeholder="Indica la justificación o motivo del ajuste manual realizado por el administrador..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={clsx(premiumInputClass, "py-3 h-auto resize-none")}
            />
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
