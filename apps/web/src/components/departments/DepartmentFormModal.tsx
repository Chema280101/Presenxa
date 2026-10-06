"use client";

import { useState, useEffect } from "react";
import { FolderTree, Loader2, Check, Plus } from "lucide-react";
import { ModalShell } from "@/components/ui/ModalShell";

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

  const [error, setError] = useState<string>("");
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
    setError("");
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("El nombre del departamento es obligatorio.");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSave(formData);
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al guardar el departamento.");
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
        form="department-form"
        disabled={isSubmitting}
        className="h-10 px-5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white shadow-sm hover:shadow-md hover:shadow-primary-500/20 text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Guardando...</span>
          </>
        ) : isEditing ? (
          <>
            <Check className="w-4 h-4" />
            <span>Actualizar Área</span>
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            <span>Crear Área</span>
          </>
        )}
      </button>
    </>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Departamento" : "Nuevo Departamento"}
      description="Gestiona las áreas organizacionales de tu empresa"
      icon={FolderTree}
      iconVariant="primary"
      maxWidth="md"
      footer={footer}
    >
      <form onSubmit={handleSubmit} id="department-form" className="space-y-5 py-2">
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
          <InputWrapper label="Nombre del Área" icon={FolderTree} required>
            <input
              type="text"
              required
              placeholder="Ej: Recursos Humanos, Ventas"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={premiumInputClass}
            />
          </InputWrapper>
        </div>
      </form>
    </ModalShell>
  );
}
