"use client";

import { useState } from "react";
import { UserRole } from "@asistencias/db";
import {
  Edit2,
  Building,
  ShieldCheck,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { clsx } from "clsx";
import { ModalShell } from "@/components/ui/ModalShell";
import { CustomSelect, CustomSelectOption } from "@/components/ui/CustomSelect";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/providers/ToastProvider";

interface LocationOption {
  id: string;
  name: string;
}

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUserIds: string[];
  locations: LocationOption[];
  schedules: Array<any>;
  onSuccess: () => void;
}

const ROLE_OPTIONS: CustomSelectOption[] = [
  { value: UserRole.EMPLEADO, label: "Empleado / Colaborador", icon: ShieldCheck },
  { value: UserRole.SUPERVISOR, label: "Supervisor de Sede", icon: ShieldCheck },
];

export function BulkEditModal({
  isOpen,
  onClose,
  selectedUserIds,
  locations,
  schedules,
  onSuccess,
}: BulkEditModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Switches para determinar qué campos actualizar
  const [enableLocation, setEnableLocation] = useState(false);
  const [locationId, setLocationId] = useState<string>("");

  const [enableRole, setEnableRole] = useState(false);
  const [role, setRole] = useState<UserRole>(UserRole.EMPLEADO);

  const [enableSchedule, setEnableSchedule] = useState(false);
  const [scheduleId, setScheduleId] = useState<string>("");

  const locationOptions: CustomSelectOption[] = [
    { value: "NONE", label: "— Sin sede asignada —" },
    ...locations.map((loc) => ({
      value: loc.id,
      label: loc.name,
      icon: Building,
    })),
  ];

  const scheduleOptions: CustomSelectOption[] = [
    { value: "NONE", label: "— Sin horario asignado —" },
    ...schedules.map((sch) => ({
      value: sch.id,
      label: `${sch.name} (${String(sch.entryHour).padStart(2, "0")}:${String(sch.entryMinute).padStart(2, "0")} - ${String(sch.exitHour).padStart(2, "0")}:${String(sch.exitMinute).padStart(2, "0")})`,
      icon: Clock,
    })),
  ];

  const hasAnyFieldSelected = enableLocation || enableRole || enableSchedule;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAnyFieldSelected) {
      setError("Debes marcar al menos un atributo para actualizar en lote.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: {
      locationId?: string | null;
      role?: UserRole;
      scheduleId?: string | null;
    } = {};

    if (enableLocation) {
      payload.locationId = locationId === "NONE" || !locationId ? null : locationId;
    }
    if (enableRole) {
      payload.role = role;
    }
    if (enableSchedule) {
      payload.scheduleId = scheduleId === "NONE" || !scheduleId ? null : scheduleId;
    }

    try {
      const res = await fetch("/api/users/bulk/edit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: selectedUserIds,
          data: payload,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ocurrió un error al actualizar colaboradores");
      }

      toast.success(data.message || `Se actualizaron ${selectedUserIds.length} colaboradores correctamente.`);

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al procesar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-between w-full">
      <div className="text-xs text-surface-500 dark:text-slate-400">
        Afectará a <span className="font-bold text-surface-900 dark:text-white">{selectedUserIds.length}</span> colaboradores
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          form="bulk-edit-form"
          variant="primary"
          size="sm"
          disabled={isSubmitting || !hasAnyFieldSelected}
          className="flex items-center gap-1.5"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Aplicar Cambios</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Edición Masiva de Colaboradores"
      description="Selecciona los campos que deseas reasignar. Los campos no marcados conservarán sus valores individuales."
      icon={Edit2}
      iconVariant="primary"
      maxWidth="lg"
      footer={footer}
    >
      <form id="bulk-edit-form" onSubmit={handleSubmit} className="space-y-4 py-1">
        {error && (
          <div
            role="alert"
            className="px-4 py-3 rounded-2xl bg-danger-500/15 border border-danger-500/30 text-danger-700 dark:text-danger-300 text-xs flex items-center gap-2 animate-shake"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-danger-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Campo 1: Sede */}
        <div
          className={clsx(
            "p-3.5 rounded-2xl border transition-all",
            enableLocation
              ? "bg-surface-50 dark:bg-surface-900/60 border-primary-500/40 ring-1 ring-primary-500/20 shadow-sm"
              : "bg-surface-100/40 dark:bg-white/5 border-surface-200 dark:border-white/10 opacity-75"
          )}
        >
          <label className="flex items-center justify-between cursor-pointer mb-2">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={enableLocation}
                onChange={(e) => setEnableLocation(e.target.checked)}
                className="w-4 h-4 rounded text-primary-600 accent-primary-600 focus:ring-primary-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-surface-900 dark:text-white flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-primary-500" />
                Reasignar Sede / Ubicación
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold text-surface-400">
              {enableLocation ? "Activado" : "Omitir"}
            </span>
          </label>

          {enableLocation && (
            <div className="pt-2">
              <CustomSelect
                value={locationId}
                onChange={(val) => setLocationId(val)}
                options={locationOptions}
                placeholder="Seleccionar nueva sede..."
                hasLeftIcon
              />
            </div>
          )}
        </div>

        {/* Campo 2: Rol */}
        <div
          className={clsx(
            "p-3.5 rounded-2xl border transition-all",
            enableRole
              ? "bg-surface-50 dark:bg-surface-900/60 border-primary-500/40 ring-1 ring-primary-500/20 shadow-sm"
              : "bg-surface-100/40 dark:bg-white/5 border-surface-200 dark:border-white/10 opacity-75"
          )}
        >
          <label className="flex items-center justify-between cursor-pointer mb-2">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={enableRole}
                onChange={(e) => setEnableRole(e.target.checked)}
                className="w-4 h-4 rounded text-primary-600 accent-primary-600 focus:ring-primary-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-surface-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary-500" />
                Cambiar Rol de Acceso
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold text-surface-400">
              {enableRole ? "Activado" : "Omitir"}
            </span>
          </label>

          {enableRole && (
            <div className="pt-2">
              <CustomSelect
                value={role}
                onChange={(val) => setRole(val as UserRole)}
                options={ROLE_OPTIONS}
                hasLeftIcon
              />
            </div>
          )}
        </div>

        {/* Campo 3: Turno / Horario */}
        <div
          className={clsx(
            "p-3.5 rounded-2xl border transition-all",
            enableSchedule
              ? "bg-surface-50 dark:bg-surface-900/60 border-primary-500/40 ring-1 ring-primary-500/20 shadow-sm"
              : "bg-surface-100/40 dark:bg-white/5 border-surface-200 dark:border-white/10 opacity-75"
          )}
        >
          <label className="flex items-center justify-between cursor-pointer mb-2">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={enableSchedule}
                onChange={(e) => setEnableSchedule(e.target.checked)}
                className="w-4 h-4 rounded text-primary-600 accent-primary-600 focus:ring-primary-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-surface-900 dark:text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary-500" />
                Asignar Turno / Horario
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold text-surface-400">
              {enableSchedule ? "Activado" : "Omitir"}
            </span>
          </label>

          {enableSchedule && (
            <div className="pt-2">
              <CustomSelect
                value={scheduleId}
                onChange={(val) => setScheduleId(val)}
                options={scheduleOptions}
                placeholder="Seleccionar nuevo turno..."
                hasLeftIcon
              />
              <p className="text-[10px] text-surface-500 dark:text-slate-400 mt-1.5">
                Cerrará automáticamente la vigencia del horario previo y activará el nuevo a partir de hoy.
              </p>
            </div>
          )}
        </div>
      </form>
    </ModalShell>
  );
}
