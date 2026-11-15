"use client";

import { useState, useEffect } from "react";
import { KeyRound, Lock, Save, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { ModalShell } from "@/components/ui/ModalShell";
import { FormField, getFormInputClass } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/providers/ToastProvider";
import { PASSWORD_MIN_LENGTH, validatePasswordStrength } from "@/lib/passwordPolicy";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ current?: string; next?: string }>({});

  const { toast } = useToast();

  const { hasMinLength, hasNumber, hasSpecial, isValid: isPasswordValid, errorMessage } =
    validatePasswordStrength(newPassword);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentPassword("");
    setNewPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setServerError("");
    setFieldErrors({});
  }, [isOpen]);

  const validateCurrent = (val: string) => {
    if (!val) return "Ingresa tu contraseña actual.";
    return undefined;
  };

  const validateNext = (val: string) => {
    if (!val) return "Ingresa tu nueva contraseña.";
    const res = validatePasswordStrength(val);
    return res.isValid ? undefined : res.errorMessage;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const currentErr = validateCurrent(currentPassword);
    const nextErr = validateNext(newPassword);
    if (currentErr || nextErr) {
      setFieldErrors({ current: currentErr, next: nextErr });
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("¡Contraseña actualizada exitosamente!");
        onClose();
      } else {
        setServerError(data.error || "No se pudo cambiar la contraseña.");
      }
    } catch {
      setServerError("Error de conexión al cambiar la contraseña.");
    } finally {
      setIsLoading(false);
    }
  };

  const footer = (
    <>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={onClose}
        disabled={isLoading}
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        form="change-password-form"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        disabled={!currentPassword || !isPasswordValid || isLoading}
        icon={<Save className="w-4 h-4" />}
      >
        Guardar Contraseña
      </Button>
    </>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      preventClose={isLoading}
      closeOnBackdropClick={!isLoading && !currentPassword && !newPassword}
      title="Cambiar Contraseña"
      description="Actualiza tus credenciales de acceso"
      icon={KeyRound}
      iconVariant="primary"
      maxWidth="md"
      footer={footer}
    >
      <form id="change-password-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
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
          label="Contraseña Actual"
          icon={Lock}
          required
          error={fieldErrors.current}
        >
          {({ id, "aria-invalid": ariaInvalid, "aria-describedby": ariaDescribedBy }) => (
            <div className="relative">
              <input
                id={id}
                type={showCurrent ? "text" : "password"}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (fieldErrors.current) {
                    setFieldErrors((prev) => ({ ...prev, current: undefined }));
                  }
                }}
                onBlur={() =>
                  setFieldErrors((prev) => ({
                    ...prev,
                    current: validateCurrent(currentPassword),
                  }))
                }
                aria-invalid={ariaInvalid}
                aria-describedby={ariaDescribedBy}
                placeholder="Ingresa tu contraseña actual"
                className={getFormInputClass({
                  hasLeftIcon: true,
                  hasRightElement: true,
                  hasError: !!fieldErrors.current,
                })}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((prev) => !prev)}
                aria-pressed={showCurrent}
                aria-label={showCurrent ? "Ocultar contraseña actual" : "Mostrar contraseña actual"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
          )}
        </FormField>

        <div className="space-y-2.5">
          <FormField
            label="Nueva Contraseña"
            icon={KeyRound}
            required
            error={fieldErrors.next}
          >
            {({ id, "aria-invalid": ariaInvalid, "aria-describedby": ariaDescribedBy }) => (
              <div className="relative">
                <input
                  id={id}
                  type={showNew ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewPassword(val);
                    if (fieldErrors.next) {
                      setFieldErrors((prev) => ({ ...prev, next: validateNext(val) }));
                    }
                  }}
                  onBlur={() => {
                    if (newPassword) {
                      setFieldErrors((prev) => ({ ...prev, next: validateNext(newPassword) }));
                    }
                  }}
                  aria-invalid={ariaInvalid}
                  aria-describedby={ariaDescribedBy}
                  placeholder="Escribe tu nueva contraseña"
                  className={getFormInputClass({
                    hasLeftIcon: true,
                    hasRightElement: true,
                    hasError: !!fieldErrors.next,
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((prev) => !prev)}
                  aria-pressed={showNew}
                  aria-label={showNew ? "Ocultar nueva contraseña" : "Mostrar nueva contraseña"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  {showNew ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            )}
          </FormField>

          <div className="p-3 rounded-xl bg-surface-100/80 dark:bg-surface-950/60 border border-surface-200 dark:border-white/10">
            <p className="text-[10px] font-semibold text-surface-600 dark:text-surface-400 mb-1.5 uppercase tracking-wide">
              La contraseña debe tener:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div
                className={`flex items-center gap-1.5 ${
                  hasMinLength ? "text-success-600 dark:text-success-400" : "text-surface-500"
                }`}
              >
                {hasMinLength ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 opacity-60" aria-hidden="true" />
                )}
                <span>Mín. {PASSWORD_MIN_LENGTH} caracteres</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  hasNumber ? "text-success-600 dark:text-success-400" : "text-surface-500"
                }`}
              >
                {hasNumber ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 opacity-60" aria-hidden="true" />
                )}
                <span>Un número (0-9)</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  hasSpecial ? "text-success-600 dark:text-success-400" : "text-surface-500"
                }`}
              >
                {hasSpecial ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 opacity-60" aria-hidden="true" />
                )}
                <span>Un símbolo (@#$%)</span>
              </div>
            </div>
            {errorMessage && newPassword.length > 0 && !isPasswordValid && (
              <span className="sr-only">{errorMessage}</span>
            )}
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
