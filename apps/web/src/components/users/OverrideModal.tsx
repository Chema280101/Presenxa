"use client";

import { useState } from "react";
import { X, Calendar, Clock, Loader2, Save } from "lucide-react";

interface Schedule {
  id: string;
  name: string;
}

interface OverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  schedules: Schedule[];
  onSuccess?: () => void;
}

export function OverrideModal({
  isOpen,
  onClose,
  userId,
  userName,
  schedules,
  onSuccess,
}: OverrideModalProps) {
  const [date, setDate] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !scheduleId) {
      setError("Por favor completa todos los campos.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/users/${userId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, scheduleId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Excepción Temporal</h3>
              <p className="text-xs text-slate-400">Para {userName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 ml-1">
              Fecha de la Excepción
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/20 border border-white/10 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
              />
              <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 ml-1">
              Este cambio solo aplicará para el día seleccionado.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 ml-1">
              Horario y Sede Asignada
            </label>
            <div className="relative">
              <select
                required
                value={scheduleId}
                onChange={(e) => setScheduleId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/20 border border-white/10 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none appearance-none cursor-pointer"
              >
                <option value="" disabled>Selecciona un horario...</option>
                {schedules.map((sch) => (
                  <option key={sch.id} value={sch.id}>
                    {sch.name}
                  </option>
                ))}
              </select>
              <Clock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/5 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-danger-50 hover:bg-danger-100 text-danger-700 hover:text-danger-800 border border-danger-200 hover:border-danger-300 dark:bg-danger-500/10 dark:hover:bg-danger-500/20 dark:text-danger-300 dark:hover:text-danger-200 dark:border-danger-500/30 dark:hover:border-danger-500/50 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-white transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Programar Alerta</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
