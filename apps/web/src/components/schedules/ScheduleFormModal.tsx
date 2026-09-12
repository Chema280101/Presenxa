"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  Sun,
  Moon,
  Layers,
  Check,
  Plus,
  MapPin,
  ChevronDown,
  Loader2,
  CalendarDays,
  FileText
} from "lucide-react";
import { clsx } from "clsx";
import { ModalShell } from "@/components/ui/ModalShell";
import { CustomSelect } from "@/components/ui/CustomSelect";

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
  isTemplate?: boolean;
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

  // Template flag
  const [isTemplate, setIsTemplate] = useState(false);

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
      setIsTemplate(initialData.isTemplate || false);
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
      setIsTemplate(false);
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

  if (!isOpen) return null;

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
      setExitTime("13:00");
    } else if (!split && exitTime === "13:00") {
      setExitTime("17:00");
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
        isTemplate,
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

  const premiumInputClass =
    "w-full h-11 pl-10 pr-4 text-sm bg-white dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-surface-900 dark:text-white placeholder:text-surface-400 dark:placeholder:text-surface-500 font-medium rounded-xl border border-surface-200 dark:border-white/10 dark:hover:border-white/20 shadow-xs focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20 outline-none transition-all";

  const InputWrapper = ({
    label,
    icon: Icon,
    required = false,
    optional = false,
    helperText,
    children,
  }: {
    label: string;
    icon: React.ElementType;
    required?: boolean;
    optional?: boolean;
    helperText?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-1">
          {label}
          {required && <span className="text-danger-500">*</span>}
        </label>
        {optional && (
          <span className="text-[10px] text-surface-400 dark:text-surface-500 font-normal">(Opcional)</span>
        )}
      </div>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400 group-focus-within:text-primary-500 transition-colors z-10">
          <Icon className="w-4 h-4" />
        </div>
        {children}
      </div>
      {helperText && (
        <div className="text-[11px] text-surface-500 dark:text-surface-400 mt-0.5 leading-tight">
          {helperText}
        </div>
      )}
    </div>
  );

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
        form="schedule-form"
        disabled={isSubmitting}
        className="h-10 px-5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white shadow-sm hover:shadow-md hover:shadow-primary-500/20 text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
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
    </>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Turno / Horario" : "Nuevo Turno / Horario"}
      description="Define las horas de entrada, salida, modalidad continua o partida y tolerancias"
      icon={Clock}
      iconVariant="primary"
      maxWidth="3xl"
      footer={footer}
    >
      <form onSubmit={handleSubmit} id="schedule-form" className="space-y-6 py-2">
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="px-4 py-3 rounded-2xl bg-danger-500/15 border border-danger-500/30 text-danger-700 dark:text-danger-300 text-xs flex items-center gap-2 animate-shake"
          >
            <span className="w-2 h-2 rounded-full bg-danger-500 flex-shrink-0 animate-ping" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <InputWrapper label="Nombre del Horario / Turno" icon={FileText} required>
            <input
              type="text"
              required
              placeholder="Ej: Turno Administrativo (8:00 AM - 5:00 PM)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={premiumInputClass}
            />
          </InputWrapper>

          <InputWrapper label="Sede (Opcional)" icon={MapPin}>
            <CustomSelect
              value={locationId}
              onChange={setLocationId}
              options={[
                { value: "", label: "Aplicar a todas las sedes (Global)" },
                ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
              ]}
              hasLeftIcon
            />
          </InputWrapper>

          <div className="md:col-span-2 space-y-2">
            <label className="block text-xs font-semibold text-surface-900 dark:text-surface-100">
              Tipo de Jornada
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleToggleSplit(false)}
                className={clsx(
                  "p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3",
                  !isSplit
                    ? "bg-primary-50 dark:bg-primary-500/10 border-primary-500 text-primary-900 dark:text-primary-100 shadow-sm ring-1 ring-primary-500/50"
                    : "bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-white/10 text-surface-600 dark:text-slate-400 hover:text-surface-900 hover:bg-surface-100 dark:hover:text-white dark:hover:bg-white/5"
                )}
              >
                <div
                  className={clsx(
                    "p-2 rounded-xl",
                    !isSplit ? "bg-primary-500 text-white" : "bg-surface-200 dark:bg-white/10 text-surface-500 dark:text-slate-400"
                  )}
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
                className={clsx(
                  "p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3",
                  isSplit
                    ? "bg-primary-50 dark:bg-primary-500/10 border-primary-500 text-primary-900 dark:text-primary-100 shadow-sm ring-1 ring-primary-500/50"
                    : "bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-white/10 text-surface-600 dark:text-slate-400 hover:text-surface-900 hover:bg-surface-100 dark:hover:text-white dark:hover:bg-white/5"
                )}
              >
                <div
                  className={clsx(
                    "p-2 rounded-xl",
                    isSplit ? "bg-primary-500 text-white" : "bg-surface-200 dark:bg-white/10 text-surface-500 dark:text-slate-400"
                  )}
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

          <div className="md:col-span-2 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-surface-500" />
                Días Laborables de la Semana
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset(31)}
                  className={clsx(
                    "text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors cursor-pointer",
                    workdaysMask === 31
                      ? "bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 border-primary-300 dark:border-primary-500/40"
                      : "bg-surface-100 dark:bg-white/5 text-surface-600 dark:text-slate-400 border-surface-200 dark:border-white/10 hover:text-surface-900 dark:hover:text-white hover:bg-surface-200 dark:hover:bg-white/10"
                  )}
                >
                  Lun - Vie
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(63)}
                  className={clsx(
                    "text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors cursor-pointer",
                    workdaysMask === 63
                      ? "bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 border-primary-300 dark:border-primary-500/40"
                      : "bg-surface-100 dark:bg-white/5 text-surface-600 dark:text-slate-400 border-surface-200 dark:border-white/10 hover:text-surface-900 dark:hover:text-white hover:bg-surface-200 dark:hover:bg-white/10"
                  )}
                >
                  Lun - Sáb
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(127)}
                  className={clsx(
                    "text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors cursor-pointer",
                    workdaysMask === 127
                      ? "bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 border-primary-300 dark:border-primary-500/40"
                      : "bg-surface-100 dark:bg-white/5 text-surface-600 dark:text-slate-400 border-surface-200 dark:border-white/10 hover:text-surface-900 dark:hover:text-white hover:bg-surface-200 dark:hover:bg-white/10"
                  )}
                >
                  Todos
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
                    className={clsx(
                      "py-2.5 rounded-xl text-xs font-semibold flex flex-col items-center justify-center transition-all cursor-pointer border",
                      isSelected
                        ? "bg-primary-500 text-white shadow-sm border-primary-600"
                        : "bg-surface-50 dark:bg-white/5 text-surface-500 dark:text-slate-400 hover:text-surface-800 dark:hover:text-slate-200 hover:bg-surface-100 dark:hover:bg-white/10 border-surface-200 dark:border-white/10"
                    )}
                  >
                    <span>{d.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2 p-4 rounded-2xl bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-warning-500" />
                <h4 className="text-xs font-bold text-surface-900 dark:text-white uppercase tracking-wider">
                  {isSplit ? "Tramo 1 (Turno Mañana)" : "Horario de la Jornada"}
                </h4>
              </div>
              {isSplit && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning-100 dark:bg-warning-500/15 text-warning-700 dark:text-warning-300 font-semibold border border-warning-200 dark:border-warning-500/30">
                  Bloque 1
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-slate-300 mb-1.5">
                  Hora de Entrada <span className="text-danger-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={entryTime}
                  onChange={(e) => setEntryTime(e.target.value)}
                  className={clsx(premiumInputClass, "font-mono !pl-4")}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-slate-300 mb-1.5">
                  {isSplit ? "Hora de Salida (Inicio Receso)" : "Hora de Salida Oficial"}{" "}
                  <span className="text-danger-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={exitTime}
                  onChange={(e) => setExitTime(e.target.value)}
                  className={clsx(premiumInputClass, "font-mono !pl-4")}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-surface-200 dark:border-white/10 mt-2">
              <label className="text-xs text-surface-600 dark:text-slate-400 font-medium">
                Tolerancia de Tardanza Tramo 1:
              </label>
              <div className="flex items-center gap-1.5 mt-2">
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={toleranceMinutes}
                  onChange={(e) =>
                    setToleranceMinutes(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  className="w-16 px-2 py-1.5 rounded-lg bg-white dark:bg-[#1A2333] border border-surface-200 dark:border-white/10 text-surface-900 dark:text-white text-xs font-mono text-center outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
                <span className="text-xs text-surface-500 dark:text-slate-500 font-medium">minutos</span>
              </div>
            </div>
          </div>

          {isSplit && (
            <div className="md:col-span-2 p-4 rounded-2xl bg-info-50 dark:bg-info-900/10 border border-info-200 dark:border-info-500/20 space-y-4 animate-[fade-in_0.2s_ease-out]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-info-500" />
                  <h4 className="text-xs font-bold text-surface-900 dark:text-white uppercase tracking-wider">
                    Tramo 2 (Turno Tarde)
                  </h4>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-info-100 dark:bg-info-500/20 text-info-700 dark:text-info-300 font-semibold border border-info-200 dark:border-info-500/30">
                  Bloque 2
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-slate-300 mb-1.5">
                    Hora de Retorno (Entrada Tarde) <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="time"
                    required={isSplit}
                    value={entryTime2}
                    onChange={(e) => setEntryTime2(e.target.value)}
                    className={clsx(premiumInputClass, "font-mono !pl-4")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-slate-300 mb-1.5">
                    Hora de Salida Final <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="time"
                    required={isSplit}
                    value={exitTime2}
                    onChange={(e) => setExitTime2(e.target.value)}
                    className={clsx(premiumInputClass, "font-mono !pl-4")}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-info-200/50 dark:border-info-500/20 mt-2">
                <label className="text-xs text-surface-600 dark:text-slate-400 font-medium">
                  Tolerancia de Tardanza Tramo 2:
                </label>
                <div className="flex items-center gap-1.5 mt-2">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={toleranceMinutes2}
                    onChange={(e) =>
                      setToleranceMinutes2(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-16 px-2 py-1.5 rounded-lg bg-white dark:bg-[#1A2333] border border-surface-200 dark:border-white/10 text-surface-900 dark:text-white text-xs font-mono text-center outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                  <span className="text-xs text-surface-500 dark:text-slate-500 font-medium">minutos</span>
                </div>
              </div>
            </div>
          )}

          <div className="md:col-span-2 flex items-center space-x-3 p-4 rounded-2xl bg-surface-50 dark:bg-white/5 border border-surface-200 dark:border-white/10">
            <input
              type="checkbox"
              id="isTemplate"
              checked={isTemplate}
              onChange={(e) => setIsTemplate(e.target.checked)}
              className="w-5 h-5 rounded-md bg-white dark:bg-[#1A2333] border-surface-300 dark:border-white/20 text-primary-500 focus:ring-primary-500/20 cursor-pointer"
            />
            <label htmlFor="isTemplate" className="text-sm text-surface-700 dark:text-slate-300 font-medium cursor-pointer select-none flex-1">
              <span className="block text-surface-900 dark:text-white font-semibold">Guardar como Plantilla Base</span>
              <span className="text-xs text-surface-500 dark:text-slate-400 block mt-0.5">No se asignará directamente, servirá para clonar horarios rápidamente.</span>
            </label>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
