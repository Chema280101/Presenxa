"use client";

import { useState, useEffect } from "react";
import { X, QrCode, Building, Loader2 } from "lucide-react";

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
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  if (!isOpen) return null;

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
      setError(err?.message || "Ocurrió un error al guardar el kiosk.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/80 backdrop-blur-md overflow-hidden animate-[fade-in_0.2s_ease-out]">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl glass border border-white/15 shadow-2xl shadow-black/90 my-auto overflow-hidden">
        {/* Header - Fixed Top */}
        <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-white/10 bg-white/[0.02] flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl gradient-brand text-white shadow-lg shadow-indigo-900/40">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
                {isEditing ? "Editar Terminal Kiosk" : "Registrar Terminal Kiosk"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Terminal o pantalla fija en recepción para el escaneo de código QR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} id="kiosk-form" className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
          {error && (
            <div className="px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
              <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0 animate-ping" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Configuración del Dispositivo */}
          <div className="rounded-2xl p-5 bg-white/[0.02] border border-white/10 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <QrCode className="w-4 h-4 text-indigo-400" />
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
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
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
                  className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
                <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3.5 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Las asistencias registradas desde este kiosk se asociarán a esta sede para los reportes.
              </p>
            </div>
          </div>
        </form>

        {/* Footer - Fixed Bottom */}
        <div className="px-6 md:px-8 py-4 border-t border-white/10 bg-black/30 backdrop-blur-sm flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="kiosk-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-brand hover:opacity-95 active:scale-[0.98] text-white text-sm font-semibold shadow-lg shadow-indigo-900/40 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : isEditing ? (
              "Actualizar Kiosk"
            ) : (
              "Crear Kiosk y Generar API Key"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
