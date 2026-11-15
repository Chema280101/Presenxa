"use client";

import { useState, useEffect } from "react";
import { MapPin, Building, Globe, Check, Plus } from "lucide-react";
import { ModalShell } from "@/components/ui/ModalShell";
import { FormField, getFormInputClass } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
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

  const [nameError, setNameError] = useState("");
  const [serverError, setServerError] = useState("");
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
    setNameError("");
    setServerError("");
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const validateName = (value: string) => {
    if (!value.trim()) return "El nombre de la sede es obligatorio.";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const err = validateName(formData.name);
    if (err) {
      setNameError(err);
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSave(formData);
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setServerError(err?.message || "Ocurrió un error al guardar la sede.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={onClose}
        disabled={isSubmitting}
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        form="location-form"
        variant="primary"
        size="lg"
        isLoading={isSubmitting}
        icon={isEditing ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      >
        {isSubmitting ? "Guardando sede..." : isEditing ? "Actualizar Sede" : "Crear Sede"}
      </Button>
    </>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      preventClose={isSubmitting}
      closeOnBackdropClick={!isSubmitting}
      title={isEditing ? "Editar Sede" : "Nueva Sede"}
      description="Configura la sede u oficina física de tu organización"
      icon={MapPin}
      iconVariant="primary"
      maxWidth="lg"
      footer={footer}
    >
      <form onSubmit={handleSubmit} id="location-form" className="space-y-5 py-2" noValidate>
        {serverError && (
          <div
            role="alert"
            aria-live="polite"
            className="px-4 py-3 rounded-2xl bg-danger-500/15 border border-danger-500/30 text-danger-700 dark:text-danger-300 text-xs flex items-center gap-2 animate-shake"
          >
            <span className="w-2 h-2 rounded-full bg-danger-500 flex-shrink-0 animate-ping" />
            <span>{serverError}</span>
          </div>
        )}

        <div className="space-y-5">
          <FormField label="Nombre de la Sede" icon={Building} required error={nameError}>
            <input
              type="text"
              required
              placeholder="Ej: Sede Central Miraflores"
              value={formData.name}
              onChange={(e) => {
                const val = e.target.value;
                setFormData({ ...formData, name: val });
                if (nameError) setNameError(validateName(val));
              }}
              onBlur={() => setNameError(validateName(formData.name))}
              className={getFormInputClass({ hasLeftIcon: true, hasError: !!nameError })}
            />
          </FormField>

          <FormField label="Dirección Física" icon={MapPin} optional>
            <input
              type="text"
              placeholder="Av. Principal 123, Distrito"
              value={formData.address || ""}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className={getFormInputClass({ hasLeftIcon: true })}
            />
          </FormField>

          <FormField label="Zona Horaria (Timezone)" icon={Globe}>
            <CustomSelect
              value={formData.timezone}
              onChange={(val) => setFormData({ ...formData, timezone: val })}
              options={TIMEZONE_OPTIONS}
              hasLeftIcon
            />
          </FormField>
        </div>
      </form>
    </ModalShell>
  );
}
