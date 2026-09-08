"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, QrCode, Building, Loader2, Check, Sparkles } from "lucide-react";

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
  const [mounted, setMounted] = useState(false);

  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [error, setError] = useState("");
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
      setName(initialData.name || "");
      setLocationId(initialData.locationId || locations[0]?.id || "");
    } else {
      setName("");
      setLocationId(locations[0]?.id || "");
    }
    setError("");
  }, [initialData, isOpen, locations]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("El nombre del dispositivo kiosk es obligatorio.");
      return;
    }

    if (!locationId) {
      setError("Debes seleccionar una sede física para el kiosk.");
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
      setError(err?.message || "Ocurrió un error al guardar el terminal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-surface-950/80 backdrop-blur-md overflow-hidden animate-fade-in-up">
      <div 
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border border-primary-400/20 shadow-2xl shadow-black/90 my-auto overflow-hidden animate-scale-up"
        style={{ background: "rgba(10, 27, 44, 0.98)", backdropFilter: "blur(24px)" }}
      >
        {/* Header - Fixed Top */}
        <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-white/10 bg-surface-950/40 flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-primary-400/15 text-primary-300 ring-1 ring-primary-400/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {isEditing ? "Editar Terminal Kiosk" : "Registrar Terminal Kiosk"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Terminal o pantalla fija en recepción para el escaneo de código QR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} id="kiosk-form" className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="px-4 py-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-shake"
            >
              <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0 animate-ping" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Configuración del Dispositivo */}
          <div className="rounded-2xl p-5 bg-surface-950/40 border border-white/8 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <QrCode className="w-4 h-4 text-primary-400" />
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                1. Identificación y Ubicación Física
              </h4>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nombre / Identificador del Kiosk <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Tablet Recepción Principal - Puerta A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none transition-all input-standard"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Sede Física Asignada <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 rounded-xl bg-surface-950 border border-white/10 text-white text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none cursor-pointer appearance-none input-standard"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
                <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3.5 pointer-events-none" />
              </div>
            </div>
          </div>
        </form>

        {/* Footer - Fixed Bottom */}
        <div className="px-6 md:px-8 py-4 border-t border-white/10 bg-surface-950/60 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-400" />
            <span>Cancelar</span>
          </button>
          <button
            type="submit"
            form="kiosk-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-400 hover:bg-primary-300 text-surface-950 text-xs font-bold shadow-lg shadow-primary-950/50 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : isEditing ? (
              <>
                <Check className="w-4 h-4" />
                <span>Actualizar Kiosk</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Crear Kiosk y Generar API Key</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
