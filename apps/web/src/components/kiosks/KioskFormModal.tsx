"use client";

import { useState, useEffect } from "react";
import { QrCode, Building, Check, Sparkles, MonitorSmartphone } from "lucide-react";
import { ModalShell } from "@/components/ui/ModalShell";
import { FormField, getFormInputClass } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { CustomSelect } from "@/components/ui/CustomSelect";

export interface KioskFormData {
  id?: string;
  name: string;
  locationId: string;
  isActive?: boolean;
}

interface KioskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: KioskFormData) => Promise<boolean>;
  initialData?: KioskFormData | null;
  locations: Array<{ id: string; name: string }>;
}

export function KioskFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  locations,
}: KioskFormModalProps) {
  const isEditing = !!initialData?.id;

  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; locationId?: string }>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setLocationId(initialData.locationId || locations[0]?.id || "");
    } else {
      setName("");
      setLocationId(locations[0]?.id || "");
    }
    setFieldErrors({});
    setServerError("");
  }, [initialData, isOpen, locations]);

  if (!isOpen) return null;

  const validateName = (value: string) => {
    if (!value.trim()) return "El nombre del dispositivo kiosk es obligatorio.";
    return undefined;
  };

  const validateLocation = (value: string) => {
    if (!value) return "Debes seleccionar una sede física para el kiosk.";
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const nameErr = validateName(name);
    const locErr = validateLocation(locationId);
    if (nameErr || locErr) {
      setFieldErrors({ name: nameErr, locationId: locErr });
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSave({
        id: initialData?.id,
        name: name.trim(),
        locationId,
        isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
      });
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setServerError(err?.message || "Ocurrió un error al guardar el terminal.");
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
        form="kiosk-form"
        variant="primary"
        size="lg"
        isLoading={isSubmitting}
        icon={isEditing ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
      >
        {isSubmitting
          ? "Guardando..."
          : isEditing
            ? "Actualizar Kiosk"
            : "Crear Kiosk y Generar API Key"}
      </Button>
    </>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      preventClose={isSubmitting}
      closeOnBackdropClick={!isSubmitting}
      title={isEditing ? "Editar Terminal Kiosk" : "Registrar Terminal Kiosk"}
      description="Terminal o pantalla fija en recepción para el escaneo de código QR."
      icon={QrCode}
      iconVariant="primary"
      maxWidth="lg"
      footer={footer}
    >
      <form onSubmit={handleSubmit} id="kiosk-form" className="space-y-6 py-2" noValidate>
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

        <div className="rounded-2xl p-5 bg-surface-50 dark:bg-surface-900/40 border border-surface-200 dark:border-white/10 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-surface-200 dark:border-white/10">
            <MonitorSmartphone className="w-4 h-4 text-primary-500" aria-hidden="true" />
            <h4 className="text-xs font-bold text-surface-900 dark:text-slate-200 uppercase tracking-wider">
              1. Identificación y Ubicación Física
            </h4>
          </div>

          <div className="space-y-5">
            <FormField
              label="Nombre / Identificador del Kiosk"
              icon={MonitorSmartphone}
              required
              error={fieldErrors.name}
            >
              <input
                type="text"
                required
                placeholder="Ej: Tablet Recepción Principal - Puerta A"
                value={name}
                onChange={(e) => {
                  const val = e.target.value;
                  setName(val);
                  if (fieldErrors.name) {
                    setFieldErrors((prev) => ({ ...prev, name: validateName(val) }));
                  }
                }}
                onBlur={() => setFieldErrors((prev) => ({ ...prev, name: validateName(name) }))}
                className={getFormInputClass({ hasLeftIcon: true, hasError: !!fieldErrors.name })}
              />
            </FormField>

            <FormField
              label="Sede Física Asignada"
              icon={Building}
              required
              error={fieldErrors.locationId}
            >
              <CustomSelect
                value={locationId}
                onChange={(val) => {
                  setLocationId(val);
                  if (fieldErrors.locationId) {
                    setFieldErrors((prev) => ({ ...prev, locationId: validateLocation(val) }));
                  }
                }}
                options={locations.map((loc) => ({ value: loc.id, label: loc.name }))}
                hasLeftIcon
                placeholder="Seleccione una sede..."
              />
            </FormField>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
