"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  CalendarOff,
  User,
  UploadCloud,
  FileText,
  X,
  AlertCircle,
  Palmtree,
  Stethoscope,
  Baby,
  HeartHandshake,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { FormField, formTextareaBaseClass, getFormInputClass } from "@/components/ui/FormField";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useToast } from "@/providers/ToastProvider";

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface AdminTimeOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminTimeOffModal({
  isOpen,
  onClose,
  onSuccess,
}: Readonly<AdminTimeOffModalProps>) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [type, setType] = useState<string>("VACACIONES");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    userId?: string;
    startDate?: string;
    endDate?: string;
  }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setServerError("");
      setFieldErrors({});
      setIsLoadingUsers(true);
      fetch("/api/users?limit=100")
        .then((res) => res.json())
        .then((data) => {
          if (data.users) {
            const list = data.users.map((u: any) => ({
              id: u.id,
              name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
              email: u.email,
            }));
            setUsers(list);
            if (list.length > 0) {
              setSelectedUserId(list[0].id);
            }
          }
        })
        .catch((err) => console.error("Error loading users:", err))
        .finally(() => setIsLoadingUsers(false));
    }
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
    setServerError("");

    const userErr = !selectedUserId ? "Selecciona un colaborador." : undefined;
    const dateErrs = validateDates(startDate, endDate);
    if (userErr || dateErrs.startDate || dateErrs.endDate) {
      setFieldErrors({ userId: userErr, ...dateErrs });
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
          throw new Error(uploadData.error || "Error al subir el documento adjunto");
        }
        documentUrl = uploadData.url;
      }

      const res = await fetch("/api/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          type,
          startDate,
          endDate,
          reason,
          documentUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al crear la solicitud");
      }

      toast.success("Solicitud de ausencia registrada");
      onSuccess();
      onClose();
      setStartDate("");
      setEndDate("");
      setReason("");
      setFile(null);
      setFieldErrors({});
    } catch (err: any) {
      setServerError(err.message || "Error al guardar la ausencia.");
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
        form="admin-time-off-form"
        variant="primary"
        size="lg"
        isLoading={isSubmitting}
        icon={<Calendar className="w-4 h-4" />}
      >
        Registrar Ausencia
      </Button>
    </>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      preventClose={isSubmitting}
      closeOnBackdropClick={!isSubmitting}
      title="Registrar Permiso o Ausencia"
      description="Registra vacaciones, licencias o descansos médicos oficiales."
      icon={CalendarOff}
      iconVariant="success"
      maxWidth="lg"
      footer={footer}
    >
      <form id="admin-time-off-form" onSubmit={handleSubmit} className="space-y-4 py-1" noValidate>
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
          label="Colaborador"
          icon={User}
          required
          error={fieldErrors.userId}
        >
          <CustomSelect
            disabled={isLoadingUsers}
            value={selectedUserId}
            onChange={(val) => {
              setSelectedUserId(val);
              if (fieldErrors.userId) {
                setFieldErrors((prev) => ({ ...prev, userId: undefined }));
              }
            }}
            options={users.map((u) => ({
              value: u.id,
              label: `${u.name} (${u.email})`,
              icon: User,
            }))}
            placeholder={isLoadingUsers ? "Cargando colaboradores..." : "Selecciona un colaborador..."}
            hasLeftIcon
            searchable
          />
        </FormField>

        <FormField label="Tipo de Ausencia" icon={FileText} required>
          <CustomSelect
            value={type}
            onChange={(val) => setType(val)}
            hasLeftIcon
            options={[
              { value: "VACACIONES", label: "Vacaciones", badge: "Vacaciones", icon: Palmtree },
              { value: "DESCANSO_MEDICO", label: "Descanso Médico", badge: "Salud", icon: Stethoscope },
              { value: "PERMISO_PERSONAL", label: "Permiso Personal", badge: "Personal", icon: User },
              { value: "MATERNIDAD_PATERNIDAD", label: "Maternidad / Paternidad", badge: "Familiar", icon: Baby },
              { value: "LUTO", label: "Licencia por Luto", badge: "Luto", icon: HeartHandshake },
            ]}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            label="Fecha Inicio"
            icon={Calendar}
            required
            error={fieldErrors.startDate}
          >
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

          <FormField
            label="Fecha Fin"
            icon={Calendar}
            required
            error={fieldErrors.endDate}
          >
            <input
              type="date"
              required
              min={startDate}
              value={endDate}
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

        <FormField label="Motivo o Justificación" icon={FileText} optional>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Detalles sobre el permiso, número de expediente médico o acuerdo..."
            rows={2}
            className={`${formTextareaBaseClass} pl-10`}
          />
        </FormField>

        <div className="space-y-1.5">
          <span className="block text-xs font-semibold text-surface-900 dark:text-surface-100">
            Sustento / Certificado (PDF o Imagen) <span className="text-[10px] text-surface-400 font-normal">(Opcional)</span>
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/png,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
          />
          {file ? (
            <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" aria-hidden="true" />
                <span className="text-xs font-semibold text-primary-800 dark:text-primary-300 truncate">
                  {file.name}
                </span>
              </div>
              <button
                type="button"
                aria-label="Quitar archivo adjunto"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="p-1 rounded-lg text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-500/20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-surface-300 dark:border-surface-700 text-xs font-semibold text-surface-600 dark:text-surface-400 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <UploadCloud className="w-4 h-4" aria-hidden="true" />
              Adjuntar certificado o documento (máx. 4 MB)
            </button>
          )}
        </div>
      </form>
    </ModalShell>
  );
}
