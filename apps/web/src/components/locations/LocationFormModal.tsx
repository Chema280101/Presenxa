"use client";

import { useState, useEffect } from "react";
import {
  X,
  MapPin,
  Building,
  Globe,
  Sliders,
  Navigation,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { GeofenceMap } from "./GeofenceMap";

export interface LocationFormData {
  id?: string;
  name: string;
  address?: string;
  timezone: string;
  geofenceRadius: number;
  geofenceLat: number;
  geofenceLng: number;
  isActive?: boolean;
}

interface LocationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: LocationFormData) => Promise<boolean>;
  initialData?: LocationFormData | null;
}

const DEFAULT_LAT = -12.046374; // Lima, Perú
const DEFAULT_LNG = -77.042793;

export function LocationFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: LocationFormModalProps) {
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<LocationFormData>({
    name: "",
    address: "",
    timezone: "America/Lima",
    geofenceRadius: 100,
    geofenceLat: DEFAULT_LAT,
    geofenceLng: DEFAULT_LNG,
    isActive: true,
  });

  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name || "",
        address: initialData.address || "",
        timezone: initialData.timezone || "America/Lima",
        geofenceRadius: initialData.geofenceRadius || 100,
        geofenceLat: initialData.geofenceLat || DEFAULT_LAT,
        geofenceLng: initialData.geofenceLng || DEFAULT_LNG,
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
      });
    } else {
      setFormData({
        name: "",
        address: "",
        timezone: "America/Lima",
        geofenceRadius: 100,
        geofenceLat: DEFAULT_LAT,
        geofenceLng: DEFAULT_LNG,
        isActive: true,
      });
    }
    setError("");
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          geofenceLat: pos.coords.latitude,
          geofenceLng: pos.coords.longitude,
        }));
        setIsLocating(false);
      },
      (err) => {
        console.error(err);
        alert("No se pudo obtener la ubicación actual.");
        setIsLocating(false);
      }
    );
  };

  const handleMapChange = (coords: { lat: number; lng: number; radius: number }) => {
    setFormData((prev) => ({
      ...prev,
      geofenceLat: coords.lat,
      geofenceLng: coords.lng,
      geofenceRadius: coords.radius,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("El nombre de la sede es obligatorio.");
      return;
    }

    if (!formData.geofenceLat || !formData.geofenceLng) {
      setError("Por favor define las coordenadas de la sede en el mapa.");
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-[fade-in_0.2s_ease-out]">
      <div className="relative w-full max-w-2xl rounded-3xl p-6 md:p-8 glass border border-white/10 shadow-2xl shadow-black/60 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl gradient-brand text-white shadow-lg shadow-indigo-900/40">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isEditing ? "Editar Sede y Geocerca" : "Nueva Sede y Geocerca"}
              </h3>
              <p className="text-xs text-slate-400">
                Configura el perímetro espacial donde se validará la asistencia
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

          {/* Nombre y Timezone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                />
                <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
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
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  <option value="America/Lima">America/Lima (UTC-5)</option>
                  <option value="America/Bogota">America/Bogota (UTC-5)</option>
                  <option value="America/Santiago">America/Santiago (UTC-4)</option>
                  <option value="America/Mexico_City">America/Mexico_City (UTC-6)</option>
                  <option value="America/Argentina/Buenos_Aires">America/Buenos_Aires (UTC-3)</option>
                  <option value="America/Madrid">Europe/Madrid (UTC+1)</option>
                </select>
                <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Dirección Física (Referencial)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Av. Larco 123, Miraflores, Lima"
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
              <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          {/* Radio de la Geocerca con Slider */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Radio de Validación (Metros):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={10}
                  max={2000}
                  step={10}
                  value={formData.geofenceRadius}
                  onChange={(e) =>
                    setFormData({ ...formData, geofenceRadius: Number(e.target.value) || 50 })
                  }
                  className="w-20 px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-white text-xs font-mono text-center outline-none"
                />
                <span className="text-xs text-slate-400">m</span>
              </div>
            </div>

            <input
              type="range"
              min={20}
              max={1000}
              step={10}
              value={formData.geofenceRadius}
              onChange={(e) =>
                setFormData({ ...formData, geofenceRadius: Number(e.target.value) })
              }
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>20m (Oficina pequeña)</span>
              <span>200m (Edificio/Campus)</span>
              <span>1000m (Zona amplia)</span>
            </div>
          </div>

          {/* Mapa de Geocerca */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Punto Central de la Geocerca (Haz clic o arrastra el pin)
              </label>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 transition-all active:scale-95"
              >
                <Navigation className={`w-3 h-3 ${isLocating ? "animate-spin" : ""}`} />
                <span>{isLocating ? "Localizando..." : "Mi Ubicación GPS"}</span>
              </button>
            </div>

            <GeofenceMap
              lat={formData.geofenceLat}
              lng={formData.geofenceLng}
              radius={formData.geofenceRadius}
              onChange={handleMapChange}
            />
          </div>

          {/* Coordenadas numéricas directas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Latitud</label>
              <input
                type="number"
                step="any"
                value={formData.geofenceLat}
                onChange={(e) =>
                  setFormData({ ...formData, geofenceLat: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Longitud</label>
              <input
                type="number"
                step="any"
                value={formData.geofenceLng}
                onChange={(e) =>
                  setFormData({ ...formData, geofenceLng: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono outline-none"
              />
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
                  Guardando sede...
                </>
              ) : isEditing ? (
                "Actualizar Sede y Geocerca"
              ) : (
                "Crear Sede y Activar Geocerca"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
