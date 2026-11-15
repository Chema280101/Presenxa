"use client";

import { useState, useEffect } from "react";
import { Building2, Check, Plus, Tag } from "lucide-react";
import { ModalShell } from "@/components/ui/ModalShell";
import { FormField, getFormInputClass } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export interface DepartmentFormData {
  id?: string;
  name: string;
}

interface DepartmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DepartmentFormData) => Promise<boolean>;
  initialData?: DepartmentFormData | null;
}

export function DepartmentFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: DepartmentFormModalProps) {
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<DepartmentFormData>({
    name: "",
  });

  const [nameError, setNameError] = useState<string>("");
  const [serverError, setServerError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name || "",
      });
    } else {
      setFormData({
        name: "",
      });
    }
    setNameError("");
    setServerError("");
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const validateName = (value: string) => {
    if (!value.trim()) return "El nombre del departamento es obligatorio.";
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
      setServerError(err?.message || "Ocurrió un error al guardar el departamento.");
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
        form="department-form"
        variant="primary"
        size="lg"
        isLoading={isSubmitting}
        icon={isEditing ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      >
        {isSubmitting ? "Guardando..." : isEditing ? "Actualizar Área" : "Crear Área"}
      </Button>
    </>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      preventClose={isSubmitting}
      closeOnBackdropClick={!isSubmitting}
      title={isEditing ? "Editar Departamento" : "Nuevo Departamento"}
      description="Gestiona las áreas organizacionales de tu empresa"
      icon={Building2}
      iconVariant="primary"
      maxWidth="md"
      footer={footer}
    >
      <form onSubmit={handleSubmit} id="department-form" className="space-y-5 py-2" noValidate>
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

        <FormField
          label="Nombre del Área"
          icon={Tag}
          required
          error={nameError}
        >
          <input
            type="text"
            required
            placeholder="Ej: Recursos Humanos, Ventas"
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
      </form>
    </ModalShell>
  );
}
