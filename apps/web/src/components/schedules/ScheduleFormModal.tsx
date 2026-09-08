"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Clock,
  Calendar,
  Sliders,
  CheckCircle2,
  Loader2,
  Sparkles,
  Sun,
  Moon,
  Layers,
  Info,
  Check,
  Plus,
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
  isSplit?: boolean;
  entryHour2?: number | null;
  entryMinute2?: number | null;
  exitHour2?: number | null;
  exitMinute2?: number | null;
  toleranceMinutes2?: number | null;
  locationId?: string | null;
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
  const [mounted, setMounted] = useState(false);

  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [locationId, setLocationId] = useState("");
  const [name, setName] = useState("");
  const [workdaysMask, setWorkdaysMask] = useState(31); // Default Lun-Vie (1+2+4+8+16)
  const [isSplit, setIsSplit] = useState(false);

  // Tramo 1 (Mañana / Jornada Continua)
  const [entryTime, setEntryTime] = useState("08:00");
  const [exitTime, setExitTime] = useState("17:00");
  const [toleranceMinutes, setToleranceMinutes] = useState(10);

  // Tramo 2 (Tarde / Horario Partido)
  const [entryTime2, setEntryTime2] = useState("15:00");
  const [exitTime2, setExitTime2] = useState("19:00");
  const [toleranceMinutes2, setToleranceMinutes2] = useState(10);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setWorkdaysMask(initialData.workdaysMask || 31);
      setIsSplit(Boolean(initialData.isSplit));

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

      if (initialData.entryHour2 !== undefined && initialData.entryHour2 !== null) {
        setEntryTime2(
          `${String(initialData.entryHour2).padStart(2, "0")}:${String(
            initialData.entryMinute2 || 0
          ).padStart(2, "0")}`
        );
      } else {
        setEntryTime2("15:00");
      }

      if (initialData.exitHour2 !== undefined && initialData.exitHour2 !== null) {
        setExitTime2(
          `${String(initialData.exitHour2).padStart(2, "0")}:${String(
            initialData.exitMinute2 || 0
          ).padStart(2, "0")}`
        );
      } else {
        setExitTime2("19:00");
      }

      setToleranceMinutes2(initialData.toleranceMinutes2 ?? 10);
      setLocationId(initialData.locationId || "");
    } else {
      setName("");
      setWorkdaysMask(31);
      setIsSplit(false);
      setEntryTime("08:00");
      setExitTime("17:00");
      setToleranceMinutes(10);
      setEntryTime2("15:00");
      setExitTime2("19:00");
      setToleranceMinutes2(10);
      setLocationId("");
    }
    setError("");
  }, [initialData, isOpen]);

  useEffect(() => {
    if (isOpen && locations.length === 0) {
      fetch("/api/locations")
        .then((res) => res.json())
        .then((data) => {
          if (data.locations) setLocations(data.locations);
        })
        .catch((err) => console.error("Error fetching locations:", err));
    }
  }, [isOpen]);

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

  if (!isOpen || !mounted) return null;

  const toggleDay = (bit: number) => {
    if (workdaysMask & bit) {
      if (workdaysMask === bit) return;
      setWorkdaysMask(workdaysMask & ~bit);
    } else {
      setWorkdaysMask(workdaysMask | bit);
    }
  };

  const applyPreset = (mask: number) => {
    setWorkdaysMask(mask);
  };

  const handleToggleSplit = (split: boolean) => {
    setIsSplit(split);
    if (split && exitTime === "17:00") {
      setExitTime("13:00"); // Sugerencia de salida tramo 1 al activar partido
    } else if (!split && exitTime === "13:00") {
      setExitTime("17:00"); // Restaurar salida normal
    }
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
      setError("Por favor ingresa horas válidas para el Tramo 1.");
      return;
    }

    let eH2: number | null = null;
    let eM2: number | null = null;
    let xH2: number | null = null;
    let xM2: number | null = null;

    if (isSplit) {
      const [parsedEH2, parsedEM2] = entryTime2.split(":").map(Number);
      const [parsedXH2, parsedXM2] = exitTime2.split(":").map(Number);

      if (isNaN(parsedEH2) || isNaN(parsedEM2) || isNaN(parsedXH2) || isNaN(parsedXM2)) {
        setError("Por favor ingresa horas válidas para el Tramo 2 (turno partido).");
        return;
      }

      eH2 = parsedEH2;
      eM2 = parsedEM2;
      xH2 = parsedXH2;
      xM2 = parsedXM2;
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
        toleranceMinutes: Number(toleranceMinutes) || 0,
        isSplit,
        entryHour2: eH2,
        entryMinute2: eM2,
        exitHour2: xH2,
        exitMinute2: xM2,
        toleranceMinutes2: isSplit ? Number(toleranceMinutes2) || 0 : null,
        locationId: locationId || null,
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-surface-950/80 backdrop-blur-md overflow-hidden animate-fade-in-up">
      <div 
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl border border-primary-400/20 shadow-2xl shadow-black/90 my-auto overflow-hidden animate-scale-up"
        style={{ background: "rgba(10, 27, 44, 0.98)", backdropFilter: "blur(24px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-white/10 bg-surface-950/40 flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-primary-400/15 text-primary-300 ring-1 ring-primary-400/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {isEditing ? "Editar Turno / Horario" : "Nuevo Turno / Horario"}
              </h3>
              <p className="text-xs text-slate-400">
                Define las horas de entrada, salida, modalidad continua o partida y tolerancias
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} id="schedule-form" className="p-6 sm:p-8 space-y-6 overflow-y-auto">
          {error && (
            <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre del Horario / Turno <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Turno Administrativo (8:00 AM - 5:00 PM)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          {/* Sede */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Sede (Opcional)
            </label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="">Aplicar a todas las sedes (Global)</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id} className="bg-slate-900 text-white">
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Modalidad: Continua vs Partida */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Tipo de Jornada
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleToggleSplit(false)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  !isSplit
                    ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/50"
                    : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <div
                  className={`p-2 rounded-xl ${
                    !isSplit ? "bg-indigo-500 text-white" : "bg-white/10 text-slate-400"
                  }`}
                >
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold">Jornada Continua</p>
                  <p className="text-[11px] opacity-70">1 Entrada y 1 Salida por día</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleToggleSplit(true)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  isSplit
                    ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/50"
                    : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <div
                  className={`p-2 rounded-xl ${
                    isSplit ? "bg-indigo-500 text-white" : "bg-white/10 text-slate-400"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold">Horario Partido / Doble Turno</p>
                  <p className="text-[11px] opacity-70">2 Tramos (4 marcaciones con receso)</p>
                </div>
              </button>
            </div>
          </div>

          {/* Días Laborables */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Días Laborables de la Semana
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset(31)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors cursor-pointer ${
                    workdaysMask === 31
                      ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold"
                      : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
                  }`}
                >
                  Lun - Vie
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(63)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors cursor-pointer ${
                    workdaysMask === 63
                      ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold"
                      : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
                  }`}
                >
                  Lun - Sáb
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(127)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors cursor-pointer ${
                    workdaysMask === 127
                      ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold"
                      : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
                  }`}
                >
                  Todos (7 días)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = Boolean(workdaysMask & d.bit);
                return (
                  <button
                    key={d.bit}
                    type="button"
                    onClick={() => toggleDay(d.bit)}
                    className={`py-2.5 rounded-xl text-xs font-semibold flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? "gradient-brand text-white shadow-md shadow-indigo-900/40 scale-100 font-bold"
                        : "bg-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/10 border border-white/5"
                    }`}
                  >
                    <span>{d.label}</span>
                    <span className="text-[10px] opacity-70 hidden sm:inline">{d.fullLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configuración de Horas: Tramo 1 */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  {isSplit ? "Tramo 1 (Turno Mañana / Primer Bloque)" : "Horario de la Jornada"}
                </h4>
              </div>
              {isSplit && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30">
                  Bloque 1
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Hora de Entrada <span className="text-rose-400">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={entryTime}
                  onChange={(e) => setEntryTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {isSplit ? "Hora de Salida (Inicio Receso)" : "Hora de Salida Oficial"}{" "}
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={exitTime}
                  onChange={(e) => setExitTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="text-xs text-slate-300">
                Tolerancia de Tardanza Tramo 1:
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
                  className="w-14 px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-white text-xs font-mono text-center outline-none"
                />
                <span className="text-xs text-slate-400">minutos</span>
              </div>
            </div>
          </div>

          {/* Configuración de Horas: Tramo 2 (Solo si isSplit) */}
          {isSplit && (
            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-3.5 animate-[fade-in_0.2s_ease-out]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Tramo 2 (Turno Tarde / Segundo Bloque)
                  </h4>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  Bloque 2
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Hora de Retorno (Entrada Tarde) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="time"
                    required={isSplit}
                    value={entryTime2}
                    onChange={(e) => setEntryTime2(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Hora de Salida Final (Fin de Jornada) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="time"
                    required={isSplit}
                    value={exitTime2}
                    onChange={(e) => setExitTime2(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="text-xs text-slate-300">
                  Tolerancia de Tardanza Tramo 2:
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={toleranceMinutes2}
                    onChange={(e) =>
                      setToleranceMinutes2(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-14 px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-white text-xs font-mono text-center outline-none"
                  />
                  <span className="text-xs text-slate-400">minutos</span>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Form Footer */}
        <div className="flex items-center justify-end gap-3 px-6 sm:px-8 py-4 border-t border-white/10 bg-surface-950/60 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-400" />
            <span>Cancelar</span>
          </button>
          <button
            type="submit"
            form="schedule-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-400 hover:bg-primary-300 text-surface-950 text-xs font-bold shadow-lg shadow-primary-950/50 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando horario...</span>
              </>
            ) : isEditing ? (
              <>
                <Check className="w-4 h-4" />
                <span>Actualizar Horario</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Crear Horario</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
