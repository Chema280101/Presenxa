"use client";

import { useState, useEffect } from "react";
import {
  X,
  Clock,
  Calendar,
  Sliders,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";

export interface ScheduleFormData {
  id?: string;
  name: string;
  workdaysMask: number;
  entryHour: number;
  entryMinute: number;
  exitHour: number;
  exitMinute: number;
  toleranceMinutes: number;
  isActive?: boolean;
}

interface ScheduleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ScheduleFormData) => Promise<boolean>;
  initialData?: ScheduleFormData | null;
}

const DAYS_OF_WEEK = [
  { bit: 1, label: "Lun", fullLabel: "Lunes" },
  { bit: 2, label: "Mar", fullLabel: "Martes" },
  { bit: 4, label: "Mié", fullLabel: "Miércoles" },
  { bit: 8, label: "Jue", fullLabel: "Jueves" },
  { bit: 16, label: "Vie", fullLabel: "Viernes" },
  { bit: 32, label: "Sáb", fullLabel: "Sábado" },
  { bit: 64, label: "Dom", fullLabel: "Domingo" },
];

export function ScheduleFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: ScheduleFormModalProps) {
  const isEditing = !!initialData?.id;

  const [name, setName] = useState("");
  const [workdaysMask, setWorkdaysMask] = useState(31); // Default Lun-Vie (1+2+4+8+16)
  const [entryTime, setEntryTime] = useState("08:00");
  const [exitTime, setExitTime] = useState("17:00");
  const [toleranceMinutes, setToleranceMinutes] = useState(10);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setWorkdaysMask(initialData.workdaysMask || 31);
      setEntryTime(
        `${String(initialData.entryHour).padStart(2, "0")}:${String(
          initialData.entryMinute
        ).padStart(2, "0")}`
      );
      setExitTime(
        `${String(initialData.exitHour).padStart(2, "0")}:${String(
          initialData.exitMinute
        ).padStart(2, "0")}`
      );
      setToleranceMinutes(initialData.toleranceMinutes ?? 10);
    } else {
      setName("");
      setWorkdaysMask(31);
      setEntryTime("08:00");
      setExitTime("17:00");
      setToleranceMinutes(10);
    }
    setError("");
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const toggleDay = (bit: number) => {
    if (workdaysMask & bit) {
      // Don't uncheck if it's the only one left
      if (workdaysMask === bit) return;
      setWorkdaysMask(workdaysMask & ~bit);
    } else {
      setWorkdaysMask(workdaysMask | bit);
    }
  };

  const applyPreset = (mask: number) => {
    setWorkdaysMask(mask);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("El nombre del turno o horario es obligatorio.");
      return;
    }

    const [eH, eM] = entryTime.split(":").map(Number);
    const [xH, xM] = exitTime.split(":").map(Number);

    if (isNaN(eH) || isNaN(eM) || isNaN(xH) || isNaN(xM)) {
      setError("Por favor ingresa horas válidas de entrada y salida.");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSave({
        id: initialData?.id,
        name: name.trim(),
        workdaysMask,
        entryHour: eH,
        entryMinute: eM,
        exitHour: xH,
        exitMinute: xM,
        toleranceMinutes,
        isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
      });
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al guardar el horario.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-[fade-in_0.2s_ease-out]">
      <div className="relative w-full max-w-lg rounded-3xl p-6 md:p-8 glass border border-white/10 shadow-2xl shadow-black/60 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl gradient-brand text-white shadow-lg shadow-indigo-900/40">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isEditing ? "Editar Turno / Horario" : "Nuevo Turno / Horario"}
              </h3>
              <p className="text-xs text-slate-400">
                Define las horas de entrada, salida y días laborables
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          {/* Nombre del horario */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre del Horario / Turno <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Turno Mañana (8am - 5pm)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          {/* Días laborables con selector visual */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Días Laborables
              </label>
              {/* Presets */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset(31)}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium border transition-colors ${
                    workdaysMask === 31
                      ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                      : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
                  }`}
                >
                  Lun-Vie
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(63)}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium border transition-colors ${
                    workdaysMask === 63
                      ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                      : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
                  }`}
                >
                  Lun-Sáb
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(127)}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium border transition-colors ${
                    workdaysMask === 127
                      ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                      : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
                  }`}
                >
                  Todos
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = Boolean(workdaysMask & d.bit);
                return (
                  <button
                    key={d.bit}
                    type="button"
                    onClick={() => toggleDay(d.bit)}
                    className={`py-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center transition-all ${
                      isSelected
                        ? "gradient-brand text-white shadow-md shadow-indigo-900/40 scale-100"
                        : "bg-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/10 border border-white/5"
                    }`}
                  >
                    <span>{d.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Horas de Entrada y Salida */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Hora de Entrada Oficial
              </label>
              <div className="relative">
                <input
                  type="time"
                  required
                  value={entryTime}
                  onChange={(e) => setEntryTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Hora de Salida Oficial
              </label>
              <div className="relative">
                <input
                  type="time"
                  required
                  value={exitTime}
                  onChange={(e) => setExitTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Tolerancia en minutos */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Tolerancia de Tardanza (Minutos):
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={toleranceMinutes}
                  onChange={(e) =>
                    setToleranceMinutes(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  className="w-16 px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-white text-xs font-mono text-center outline-none"
                />
                <span className="text-xs text-slate-400">min</span>
              </div>
            </div>

            <div className="flex gap-2">
              {[0, 5, 10, 15, 30].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setToleranceMinutes(t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors ${
                    toleranceMinutes === t
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-white/5 text-slate-400 border-white/5 hover:text-white"
                  }`}
                >
                  {t} min
                </button>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 mt-1">
              Pasados estos minutos después de la hora de entrada, la asistencia se registrará como{" "}
              <strong className="text-amber-300">TARDE</strong>.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand hover:opacity-95 active:scale-[0.98] text-white text-sm font-semibold shadow-lg shadow-indigo-900/40 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando horario...
                </>
              ) : isEditing ? (
                "Actualizar Horario"
              ) : (
                "Crear Horario"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
