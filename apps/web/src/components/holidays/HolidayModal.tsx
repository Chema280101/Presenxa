"use client";

import React, { useState, useEffect } from "react";
import { Calendar, CalendarDays, Sparkles, MapPin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { FormField, getFormInputClass } from "@/components/ui/FormField";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useToast } from "@/providers/ToastProvider";

interface LocationOption {
  id: string;
  name: string;
}

interface HolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locations?: LocationOption[];
  initialDate?: string;
}

export function HolidayModal({
  isOpen,
  onClose,
  onSuccess,
  locations = [],
  initialDate,
}: HolidayModalProps) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [locationId, setLocationId] = useState<string>("GLOBAL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; date?: string }>({});
  const [serverError, setServerError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setDate(initialDate || "");
      setName("");
      setLocationId("GLOBAL");
      setFieldErrors({});
      setServerError("");
    }
  }, [isOpen, initialDate]);

  const validateName = (value: string) => {
    if (!value.trim()) return "El nombre del feriado es obligatorio.";
    return undefined;
  };

  const validateDate = (value: string) => {
    if (!value) return "Selecciona la fecha no laborable.";
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const nameErr = validateName(name);
    const dateErr = validateDate(date);
    if (nameErr || dateErr) {
      setFieldErrors({ name: nameErr, date: dateErr });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          date,
          locationId: locationId === "GLOBAL" ? null : locationId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al crear el feriado");
      }

      toast.success("Feriado registrado con éxito");
      setName("");
      setDate("");
      setLocationId("GLOBAL");
      onSuccess();
      onClose();
    } catch (err: any) {
      setServerError(err.message || "Error al guardar el feriado.");
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
        form="holiday-form"
        variant="primary"
        size="lg"
        isLoading={isSubmitting}
        icon={<Calendar className="w-4 h-4" />}
      >
        Guardar Feriado
      </Button>
    </>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      preventClose={isSubmitting}
      closeOnBackdropClick={!isSubmitting}
      title="Registrar Feriado Oficial"
      description="Los colaboradores no serán penalizados por faltas en este día."
      icon={CalendarDays}
      iconVariant="success"
      maxWidth="lg"
      footer={footer}
    >
      <form id="holiday-form" onSubmit={handleSubmit} className="space-y-5 py-1" noValidate>
        {serverError && (
          <div
            role="alert"
            aria-live="polite"
            className="px-4 py-3 rounded-2xl bg-danger-500/15 border border-danger-500/30 text-danger-700 dark:text-danger-300 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-danger-500" aria-hidden="true" />
            <span>{serverError}</span>
          </div>
        )}

        <FormField
          label="Motivo o Nombre del Feriado"
          icon={Calendar}
          required
          error={fieldErrors.name}
        >
          <input
            type="text"
            required
            value={name}
            onChange={(e) => {
              const val = e.target.value;
              setName(val);
              if (fieldErrors.name) {
                setFieldErrors((prev) => ({ ...prev, name: validateName(val) }));
              }
            }}
            onBlur={() => setFieldErrors((prev) => ({ ...prev, name: validateName(name) }))}
            placeholder="Ej: Día del Trabajo, Navidad, Fiestas Patrias..."
            className={getFormInputClass({ hasLeftIcon: true, hasError: !!fieldErrors.name })}
          />
        </FormField>

        <FormField
          label="Fecha No Laborable"
          icon={Calendar}
          required
          error={fieldErrors.date}
        >
          <input
            type="date"
            required
            value={date}
            onChange={(e) => {
              const val = e.target.value;
              setDate(val);
              if (fieldErrors.date) {
                setFieldErrors((prev) => ({ ...prev, date: validateDate(val) }));
              }
            }}
            onBlur={() => setFieldErrors((prev) => ({ ...prev, date: validateDate(date) }))}
            className={getFormInputClass({
              hasLeftIcon: true,
              hasError: !!fieldErrors.date,
              className: "cursor-pointer font-mono [color-scheme:light] dark:[color-scheme:dark]",
            })}
          />
        </FormField>

        {locations.length > 0 && (
          <FormField label="Alcance Geográfico" icon={MapPin}>
            <CustomSelect
              value={locationId}
              onChange={(val) => setLocationId(val)}
              hasLeftIcon
              options={[
                { value: "GLOBAL", label: "Alcance Global (Todas las sedes)" },
                ...locations.map((loc) => ({
                  value: loc.id,
                  label: `Solo ${loc.name}`,
                })),
              ]}
            />
          </FormField>
        )}

        <div className="p-3.5 rounded-2xl bg-primary-50/80 dark:bg-primary-950/30 border border-primary-200/60 dark:border-primary-800/40 text-xs text-primary-800 dark:text-primary-300 leading-relaxed flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            El cierre automatizado de medianoche (EOD) omitirá registrar faltas en este día, protegiendo las métricas de puntualidad de los colaboradores.
          </span>
        </div>
      </form>
    </ModalShell>
  );
}
