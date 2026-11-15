"use client";

import { useState, useRef, useEffect } from "react";
import {
  Calendar,
  FileText,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  Activity,
  Palmtree,
  Stethoscope,
  User,
  Baby,
  HeartHandshake,
} from "lucide-react";
import { ModalShell } from "@/components/ui/ModalShell";
import { FormField, formTextareaBaseClass, getFormInputClass } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { CustomSelect } from "@/components/ui/CustomSelect";

interface TimeOffRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TimeOffRequestModal({ isOpen, onClose, onSuccess }: TimeOffRequestModalProps) {
  const [type, setType] = useState<string>("DESCANSO_MEDICO");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ startDate?: string; endDate?: string }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setServerError(null);
    setFieldErrors({});
  }, [isOpen]);

  const validateDates = (start: string, end: string) => {
    const errs: { startDate?: string; endDate?: string } = {};
    if (!start) errs.startDate = "Selecciona la fecha de inicio.";
    if (!end) errs.endDate = "Selecciona la fecha de fin.";
    else if (start && end < start) errs.endDate = "La fecha fin no puede ser anterior al inicio.";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const errs = validateDates(startDate, endDate);
    if (errs.startDate || errs.endDate) {
      setFieldErrors(errs);
      return;
    }

    try {
      setIsSubmitting(true);

      let documentUrl: string | null = null;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          setServerError(uploadData.error || "Error al subir el documento adjunto.");
          return;
        }
        documentUrl = uploadData.url;
      }

      const res = await fetch("/api/user/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          startDate,
          endDate,
          reason,
          documentUrl,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        onSuccess?.();
        setTimeout(() => {
          setSuccess(false);
          onClose();
          setType("DESCANSO_MEDICO");
          setStartDate("");
          setEndDate("");
          setReason("");
          setFile(null);
          setFieldErrors({});
        }, 2500);
      } else {
        setServerError(data.error || "Error al enviar la solicitud.");
      }
    } catch {
      setServerError("Error de conexión con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasUnsavedChanges = Boolean(startDate || endDate || reason || file);

  const footer = !success ? (
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
        form="time-off-request-form"
        variant="primary"
        size="lg"
        isLoading={isSubmitting}
      >
        Enviar Solicitud
      </Button>
    </>
  ) : undefined;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      variant="sheet"
      preventClose={isSubmitting}
      closeOnBackdropClick={!isSubmitting && !hasUnsavedChanges}
      title="Reportar Ausencia"
      description="Solicita permisos o justificaciones"
      icon={Activity}
      iconVariant="success"
      maxWidth="md"
      footer={footer}
    >
      {success ? (
        <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
          </div>
          <h3 className="text-xl font-bold text-surface-900 dark:text-white mb-2">
            ¡Solicitud Enviada!
          </h3>
          <p className="text-sm text-surface-500 dark:text-surface-400 max-w-[260px]">
            RRHH ha recibido tu solicitud y la revisará en breve.
          </p>
        </div>
      ) : (
        <form id="time-off-request-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
          {serverError && (
            <div
              role="alert"
              aria-live="polite"
              className="p-3 rounded-xl bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/20 text-danger-600 dark:text-danger-400 text-xs font-semibold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <p>{serverError}</p>
            </div>
          )}

          <FormField label="Tipo de Solicitud" icon={FileText} required>
            <CustomSelect
              value={type}
              onChange={(val) => setType(val)}
              hasLeftIcon
              options={[
                { value: "DESCANSO_MEDICO", label: "Descanso Médico", badge: "Salud", icon: Stethoscope },
                { value: "VACACIONES", label: "Vacaciones", badge: "Descanso", icon: Palmtree },
                { value: "PERMISO_PERSONAL", label: "Permiso Personal", badge: "Personal", icon: User },
                { value: "MATERNIDAD_PATERNIDAD", label: "Maternidad / Paternidad", badge: "Familiar", icon: Baby },
                { value: "LUTO", label: "Luto", badge: "Luto", icon: HeartHandshake },
              ]}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Desde" icon={Calendar} required error={fieldErrors.startDate}>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setStartDate(val);
                  if (fieldErrors.startDate) {
                    setFieldErrors((prev) => ({ ...prev, startDate: undefined }));
                  }
                }}
                onBlur={() =>
                  setFieldErrors((prev) => ({
                    ...prev,
                    startDate: !startDate ? "Selecciona la fecha de inicio." : undefined,
                  }))
                }
                className={getFormInputClass({
                  hasLeftIcon: true,
                  hasError: !!fieldErrors.startDate,
                  className: "cursor-pointer font-mono [color-scheme:light] dark:[color-scheme:dark]",
                })}
              />
            </FormField>

            <FormField label="Hasta" icon={Calendar} required error={fieldErrors.endDate}>
              <input
                type="date"
                required
                value={endDate}
                min={startDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setEndDate(val);
                  if (fieldErrors.endDate) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      endDate: validateDates(startDate, val).endDate,
                    }));
                  }
                }}
                onBlur={() =>
                  setFieldErrors((prev) => ({
                    ...prev,
                    endDate: validateDates(startDate, endDate).endDate,
                  }))
                }
                className={getFormInputClass({
                  hasLeftIcon: true,
                  hasError: !!fieldErrors.endDate,
                  className: "cursor-pointer font-mono [color-scheme:light] dark:[color-scheme:dark]",
                })}
              />
            </FormField>
          </div>

          <FormField label="Motivo o Detalles" icon={FileText} optional>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Reposo indicado por 3 días..."
              rows={2}
              className={`${formTextareaBaseClass} pl-10`}
            />
          </FormField>

          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-surface-900 dark:text-surface-100">
              Adjuntar Sustento (Foto o PDF) <span className="text-[10px] text-surface-400 font-normal">(Opcional)</span>
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                file
                  ? "border-primary-500/50 bg-primary-50 dark:bg-primary-500/10"
                  : "border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-white/[0.03] hover:bg-surface-100 dark:hover:bg-white/[0.06]"
              }`}
            >
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                accept="image/*,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <>
                  <FileText className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-2" aria-hidden="true" />
                  <p className="text-sm font-bold text-primary-700 dark:text-primary-300 text-center truncate max-w-xs">
                    {file.name}
                  </p>
                  <p className="text-[10px] font-semibold text-primary-600/70 dark:text-primary-400/70 mt-1 uppercase">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • Toca para cambiar
                  </p>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-surface-200 dark:bg-surface-800 flex items-center justify-center text-surface-500 dark:text-surface-400 mb-2">
                    <UploadCloud className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-bold text-surface-700 dark:text-surface-200">
                    Subir receta médica o CITT
                  </p>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                    JPG, PNG o PDF (Max. 5MB)
                  </p>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}
