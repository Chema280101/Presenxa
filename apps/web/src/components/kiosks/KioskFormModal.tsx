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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-[fade-in_0.2s_ease-out]">
      <div className="relative w-full max-w-md rounded-3xl p-6 md:p-8 glass border border-white/10 shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl gradient-brand text-white shadow-lg shadow-indigo-900/40">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isEditing ? "Editar Kiosk" : "Registrar Terminal Kiosk"}
              </h3>
              <p className="text-xs text-slate-400">
                Tablet o pantalla fija para escaneo de QR en puerta
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          {/* Nombre del Kiosk */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre / Identificador del Kiosk <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Kiosk Puerta Principal - Recepción"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          {/* Sede física */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Sede Física Asignada <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <select
                required
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
              <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand hover:opacity-95 active:scale-[0.98] text-white text-sm font-semibold shadow-lg shadow-indigo-900/40 transition-all disabled:opacity-50"
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
        </form>
      </div>
    </div>
  );
}
