"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  MapPin,
  Building,
  Globe,
  Loader2,
  CheckCircle2,
} from "lucide-react";

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
  const [mounted, setMounted] = useState(false);

  const [formData, setFormData] = useState<LocationFormData>({
    name: "",
    address: "",
    timezone: "America/Lima",
    isActive: true,
  });

  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

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

  if (!isOpen || !mounted) return null;

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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-surface-950/80 backdrop-blur-md overflow-hidden animate-fade-in-up">
      <div 
        className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl border border-primary-400/20 shadow-2xl shadow-black/90 my-auto overflow-hidden animate-scale-up"
        style={{ background: "rgba(10, 27, 44, 0.98)", backdropFilter: "blur(24px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-white/10 bg-surface-950/40 flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-primary-400/15 text-primary-300 ring-1 ring-primary-400/30">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {isEditing ? "Editar Sede" : "Nueva Sede"}
              </h3>
              <p className="text-xs text-slate-400">
                Configura la sede u oficina física de tu organización
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} id="location-form" className="p-6 sm:p-8 space-y-5 flex-1 overflow-y-auto">
          {error && (
            <div className="px-4 py-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-shake">
              <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0 animate-ping" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nombre de la Sede <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ej: Sede Central Miraflores"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none transition-all input-standard"
                />
                <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Dirección Física
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Av. Principal 123, Distrito"
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none transition-all input-standard"
                />
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Zona Horaria (Timezone)
              </label>
              <div className="relative">
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-950 border border-white/10 text-white text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none cursor-pointer appearance-none input-standard"
                >
                  <option value="America/Lima">America/Lima (UTC-5)</option>
                  <option value="America/Bogota">America/Bogota (UTC-5)</option>
                  <option value="America/Santiago">America/Santiago (UTC-4)</option>
                  <option value="America/Mexico_City">America/Mexico_City (UTC-6)</option>
                  <option value="America/Argentina/Buenos_Aires">America/Buenos_Aires (UTC-3)</option>
                  <option value="America/Madrid">Europe/Madrid (UTC+1)</option>
                </select>
                <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 sm:px-8 py-4 border-t border-white/10 bg-surface-950/60 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="location-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-400 hover:bg-primary-300 text-surface-950 text-xs font-bold shadow-lg shadow-primary-950/50 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando sede...
              </>
            ) : isEditing ? (
              "Actualizar Sede"
            ) : (
              "Crear Sede"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
