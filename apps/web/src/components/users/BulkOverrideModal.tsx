"use client";

import React, { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import {
  Calendar,
  Clock,
  Save,
  Building,
  MapPin,
  Bell,
  Sparkles,
} from "lucide-react";
import { ModalShell } from "@/components/ui/ModalShell";
import { Button } from "@/components/ui/Button";
import { CustomSelect, CustomSelectOption } from "@/components/ui/CustomSelect";
import { useToast } from "@/providers/ToastProvider";

export interface ScheduleOption {
  id: string;
  name: string;
  entryHour?: number;
  entryMinute?: number;
  exitHour?: number;
  exitMinute?: number;
  isSplit?: boolean;
  entryHour2?: number | null;
  entryMinute2?: number | null;
  exitHour2?: number | null;
  exitMinute2?: number | null;
  locationId?: string | null;
  location?: {
    id: string;
    name: string;
  } | null;
}

export interface LocationOption {
  id: string;
  name: string;
  address?: string | null;
}

interface BulkOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  userIds: string[];
  locations?: LocationOption[];
  schedules: ScheduleOption[];
  onSuccess?: () => void;
}

export function BulkOverrideModal({
  isOpen,
  onClose,
  userIds,
  locations: propLocations,
  schedules,
  onSuccess,
}: BulkOverrideModalProps) {
  const { toast } = useToast();
  
  // SWR fallback para sedes si no vienen pasadas por props
  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: locData } = useSWR(
    isOpen && (!propLocations || propLocations.length === 0) ? "/api/locations" : null,
    fetcher
  );

  const locations: LocationOption[] = useMemo(() => {
    if (propLocations && propLocations.length > 0) return propLocations;
    return locData?.locations || [];
  }, [propLocations, locData?.locations]);

  const [date, setDate] = useState("");
  const [locationId, setLocationId] = useState<string>("");
  const [scheduleId, setScheduleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (locations.length > 0) {
        setLocationId(locations[0].id);
      } else {
        setLocationId("");
      }

      if (schedules.length > 0) {
        setScheduleId((prev) => prev || schedules[0].id);
      }
    } else {
      setDate("");
      setScheduleId("");
      setLocationId("");
    }
  }, [isOpen, locations]);

  const filteredSchedules = useMemo(() => {
    if (!locationId) return schedules;

    const matched = schedules.filter(
      (sch) =>
        sch.locationId === locationId ||
        sch.location?.id === locationId ||
        (!sch.locationId && !sch.location)
    );

    return matched.length > 0 ? matched : schedules;
  }, [schedules, locationId]);

  const handleLocationChange = (newLocationId: string) => {
    setLocationId(newLocationId);

    const compatible = schedules.filter(
      (sch) =>
        sch.locationId === newLocationId ||
        sch.location?.id === newLocationId ||
        (!sch.locationId && !sch.location)
    );

    const isCurrentValid = compatible.some((sch) => sch.id === scheduleId);
    if (!isCurrentValid && compatible.length > 0) {
      setScheduleId(compatible[0].id);
    }
  };

  const formatTime = (h?: number | null, m?: number | null) => {
    if (h === undefined || m === undefined || h === null || m === null) return "";
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const locationOptions: CustomSelectOption[] = useMemo(() => {
    return locations.map((loc) => {
      return {
        value: loc.id,
        label: loc.name,
        description: loc.address || undefined,
        icon: Building,
      };
    });
  }, [locations]);

  const scheduleOptions: CustomSelectOption[] = useMemo(() => {
    return filteredSchedules.map((sch) => {
      const hasTime = sch.entryHour !== undefined && sch.exitHour !== undefined;
      const timeStr = hasTime
        ? `${formatTime(sch.entryHour, sch.entryMinute)} - ${formatTime(sch.exitHour, sch.exitMinute)}`
        : "";

      const locName = sch.location?.name;
      const label = timeStr ? `${sch.name} (${timeStr})` : sch.name;

      return {
        value: sch.id,
        label,
        description: locName
          ? `Asociado a ${locName}`
          : sch.isSplit
          ? "Jornada partida (2 tramos)"
          : "Turno continuo",
        badge: locName || (sch.isSplit ? "Partido" : undefined),
        icon: Clock,
      };
    });
  }, [filteredSchedules]);

  const selectedSchedule = useMemo(() => {
    return schedules.find((s) => s.id === scheduleId);
  }, [schedules, scheduleId]);

  const selectedLocation = useMemo(() => {
    return locations.find((l) => l.id === locationId);
  }, [locations, locationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !scheduleId) {
      setError("Por favor completa la fecha y el horario.");
      return;
    }
    if (userIds.length === 0) {
      setError("No hay colaboradores seleccionados.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/users/bulk/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds,
          date,
          scheduleId,
          locationId: locationId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al asignar la excepción masiva.");
      }
      
      const resData = await res.json();
      toast.success(resData.message || "Excepciones masivas aplicadas correctamente.");

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        disabled={loading}
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        form="bulk-override-form"
        variant="primary"
        isLoading={loading}
        icon={<Save className="w-4 h-4" />}
      >
        Aplicar Excepción Masiva
      </Button>
    </>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Asignar Excepción Masiva"
      description={`Configura un turno o sede temporal para ${userIds.length} colaborador${userIds.length > 1 ? 'es' : ''}.`}
      icon={Clock}
      iconVariant="primary"
      maxWidth="md"
      footer={footer}
    >
      <form id="bulk-override-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-600 dark:text-danger-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* 1. FECHA DE LA EXCEPCIÓN */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-surface-700 dark:text-surface-300 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary-500" />
            Fecha de la Excepción *
          </label>
          <div className="relative">
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition dark:[color-scheme:dark]"
            />
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
          </div>
          <p className="text-[11px] text-surface-500 dark:text-surface-400">
            Este cambio solo aplicará para el día seleccionado en los {userIds.length} seleccionados.
          </p>
        </div>

        {/* 2. SEDE ASIGNADA */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-surface-700 dark:text-surface-300 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary-500" />
              Sede Asignada *
            </label>
          </div>
          <CustomSelect
            value={locationId}
            onChange={handleLocationChange}
            options={locationOptions}
            placeholder="Selecciona la sede para esta fecha..."
            hasLeftIcon
            leftIcon={Building}
          />
          <p className="text-[11px] text-surface-500 dark:text-surface-400">
            Sede física donde los colaboradores deberán marcar asistencia en el kiosco ese día.
          </p>
        </div>

        {/* 3. HORARIO ASIGNADO */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-surface-700 dark:text-surface-300 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary-500" />
            Horario Asignado *
          </label>
          <CustomSelect
            value={scheduleId}
            onChange={(val) => setScheduleId(val)}
            options={scheduleOptions}
            placeholder="Selecciona un horario..."
            hasLeftIcon
            leftIcon={Clock}
          />
          {filteredSchedules.length < schedules.length && (
            <p className="text-[10.5px] text-surface-500 dark:text-surface-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary-500" />
              Mostrando horarios compatibles con la sede seleccionada.
            </p>
          )}
        </div>

        {/* 4. RESUMEN VISUAL DE LA EXCEPCIÓN */}
        {date && scheduleId && (
          <div className="p-3 rounded-xl bg-primary-50/70 dark:bg-primary-950/25 border border-primary-200/80 dark:border-primary-800/40 space-y-2 animate-fade-in text-xs">
            <div className="flex items-center justify-between text-primary-800 dark:text-primary-300 font-semibold text-[11px]">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                Resumen de la Excepción (Masiva)
              </span>
              <span className="px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-900/50 text-[10px] font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">
                1 Día / {userIds.length} Usr
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-surface-700 dark:text-slate-300 text-[11px] pt-1">
              <div>
                <span className="text-[10px] uppercase text-surface-400 block font-semibold">
                  Sede
                </span>
                <span className="font-bold flex items-center gap-1 text-surface-900 dark:text-white">
                  <MapPin className="w-3 h-3 text-primary-500" />
                  {selectedLocation?.name || "Sede Asignada"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-surface-400 block font-semibold">
                  Turno
                </span>
                <span className="font-bold flex items-center gap-1 text-surface-900 dark:text-white">
                  <Clock className="w-3 h-3 text-primary-500" />
                  {selectedSchedule?.name || "Horario"}
                </span>
              </div>
            </div>

            {selectedSchedule?.entryHour !== undefined && selectedSchedule?.exitHour !== undefined && (
              <div className="text-[10.5px] text-surface-600 dark:text-slate-300 pt-0.5">
                Jornada:{" "}
                <strong className="text-surface-900 dark:text-white">
                  {formatTime(selectedSchedule.entryHour, selectedSchedule.entryMinute)} a{" "}
                  {formatTime(selectedSchedule.exitHour, selectedSchedule.exitMinute)}
                </strong>
                {selectedSchedule.isSplit && selectedSchedule.entryHour2 !== null && (
                  <span>
                    {" "}y{" "}
                    <strong className="text-surface-900 dark:text-white">
                      {formatTime(selectedSchedule.entryHour2, selectedSchedule.entryMinute2)} a{" "}
                      {formatTime(selectedSchedule.exitHour2, selectedSchedule.exitMinute2)}
                    </strong>
                  </span>
                )}
              </div>
            )}

            <div className="flex items-start gap-1.5 text-[10px] text-surface-500 dark:text-slate-400 pt-1 border-t border-primary-200/50 dark:border-primary-800/30">
              <Bell className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
              <span>
                Los colaboradores recibirán un recordatorio automático 30 min antes de su turno informándoles sobre la sede programada.
              </span>
            </div>
          </div>
        )}
      </form>
    </ModalShell>
  );
}
