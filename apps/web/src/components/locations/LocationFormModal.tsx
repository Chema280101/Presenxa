"use client";

import { useState, useEffect } from "react";
import { MapPin, Building, Globe, Loader2, Check, Plus } from "lucide-react";
import { clsx } from "clsx";
import { ModalShell } from "@/components/ui/ModalShell";
import { CustomSelect, CustomSelectOption } from "@/components/ui/CustomSelect";

const TIMEZONE_OPTIONS: CustomSelectOption[] = [
  { value: "America/Lima", label: "America/Lima (UTC-5)" },
  { value: "America/Bogota", label: "America/Bogota (UTC-5)" },
  { value: "America/Santiago", label: "America/Santiago (UTC-4)" },
  { value: "America/Mexico_City", label: "America/Mexico_City (UTC-6)" },
  { value: "America/Argentina/Buenos_Aires", label: "America/Buenos_Aires (UTC-3)" },
  { value: "America/Madrid", label: "Europe/Madrid (UTC+1)" },
];

export interface LocationFormData {
  id?: string;
  name: string;
  address?: string;
  timezone: string;
  isActive?: boolean;
}

interface LocationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: LocationFormData) => Promise<boolean>;
  initialData?: LocationFormData | null;
}

export function LocationFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: LocationFormModalProps) {
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<LocationFormData>({
    name: "",
    address: "",
    timezone: "America/Lima",
    isActive: true,
  });

  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name || "",
        address: initialData.address || "",
        timezone: initialData.timezone || "America/Lima",
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
      });
    } else {
      setFormData({
        name: "",
        address: "",
        timezone: "America/Lima",
        isActive: true,
      });
    }
    setError("");
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("El nombre de la sede es obligatorio.");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSave(formData);
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al guardar la sede.");
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
        form="location-form"
        disabled={isSubmitting}
        className="h-10 px-5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white shadow-sm hover:shadow-md hover:shadow-primary-500/20 text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Guardando sede...</span>
          </>
        ) : isEditing ? (
          <>
            <Check className="w-4 h-4" />
            <span>Actualizar Sede</span>
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            <span>Crear Sede</span>
          </>
        )}
      </button>
    </>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Sede" : "Nueva Sede"}
      description="Configura la sede u oficina física de tu organización"
      icon={Building}
      iconVariant="primary"
      maxWidth="lg"
      footer={footer}
    >
      <form onSubmit={handleSubmit} id="location-form" className="space-y-5 py-2">
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

        <div className="space-y-5">
          <InputWrapper label="Nombre de la Sede" icon={Building} required>
            <input
              type="text"
              required
              placeholder="Ej: Sede Central Miraflores"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={premiumInputClass}
            />
          </InputWrapper>

          <InputWrapper label="Dirección Física" icon={MapPin}>
            <input
              type="text"
              placeholder="Av. Principal 123, Distrito"
              value={formData.address || ""}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className={premiumInputClass}
            />
          </InputWrapper>

          <InputWrapper label="Zona Horaria (Timezone)" icon={Globe}>
            <CustomSelect
              value={formData.timezone}
              onChange={(val) => setFormData({ ...formData, timezone: val })}
              options={TIMEZONE_OPTIONS}
              hasLeftIcon
            />
          </InputWrapper>
        </div>
      </form>
    </ModalShell>
  );
}
