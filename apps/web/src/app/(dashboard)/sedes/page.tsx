"use client";

import { useState, useEffect, useMemo } from "react";
import {
  MapPin,
  Plus,
  Search,
  Building,
  Users,
  QrCode,
  Globe,
  Sliders,
  Edit2,
  Trash2,
  CheckCircle2,
  RefreshCw,
  MapPinOff,
  Navigation,
  ShieldCheck,
} from "lucide-react";
import { GeofenceMap } from "@/components/locations/GeofenceMap";
import {
  LocationFormModal,
  LocationFormData,
} from "@/components/locations/LocationFormModal";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";

interface LocationItem {
  id: string;
  name: string;
  address?: string | null;
  timezone: string;
  geofenceRadius?: number | null;
  geofenceLat?: number | null;
  geofenceLng?: number | null;
  geofencePolygon?: any;
  isActive: boolean;
  _count?: {
    users: number;
    kiosks: number;
    attendances: number;
  };
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationFormData | null>(
    null
  );

  // Toast alert
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/locations");
      const data = await res.json();
      if (data.locations) {
        setLocations(data.locations);
      }
    } catch (err) {
      console.error("Error fetching locations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchesSearch =
        !search ||
        loc.name.toLowerCase().includes(search.toLowerCase()) ||
        (loc.address && loc.address.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus =
        selectedStatus === "ALL" ||
        (selectedStatus === "ACTIVE" && loc.isActive) ||
        (selectedStatus === "INACTIVE" && !loc.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [locations, search, selectedStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = locations.length;
    const active = locations.filter((l) => l.isActive).length;
    const withGeofence = locations.filter(
      (l) => l.geofenceLat && l.geofenceLng && l.geofenceRadius
    ).length;
    const totalUsers = locations.reduce(
      (acc, l) => acc + (l._count?.users || 0),
      0
    );
    return { total, active, withGeofence, totalUsers };
  }, [locations]);

  const handleSaveLocation = async (
    data: LocationFormData
  ): Promise<boolean> => {
    try {
      if (data.id) {
        // Edit location
        const res = await fetch(`/api/locations/${data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Error al actualizar sede");

        showToast("Sede y geocerca actualizadas con éxito");
      } else {
        // Create location
        const res = await fetch("/api/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Error al crear sede");

        showToast("Nueva sede y geocerca registradas con éxito");
      }
      await fetchLocations();
      return true;
    } catch (err: any) {
      alert(err.message || "Error al guardar");
      return false;
    }
  };

  const handleToggleStatus = async (loc: LocationItem) => {
    const actionName = loc.isActive ? "desactivar" : "activar";
    if (!confirm(`¿Estás seguro de ${actionName} la sede "${loc.name}"?`))
      return;

    try {
      const res = await fetch(`/api/locations/${loc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !loc.isActive }),
      });
      if (res.ok) {
        showToast(`Sede ${loc.isActive ? "desactivada" : "activada"} con éxito`);
        await fetchLocations();
      }
    } catch (err) {
      console.error("Error toggling location status:", err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 font-medium text-sm shadow-2xl shadow-black/80 backdrop-blur-xl animate-scale-up">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="gradient-brand w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/20">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Sedes y Geocercas Espaciales
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Define los perímetros geográficos de validación continua y control de abandono de puesto.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingLocation(null);
            setIsModalOpen(true);
          }}
          className="gradient-brand flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-white font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-950/40 hover:opacity-95 active:scale-[0.98] transition-all flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nueva Sede
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Total Sedes"
          value={stats.total}
          sub="Ubicaciones corporativas"
          icon={Building}
          variant="primary"
        />
        <StatCard
          label="Geocercas Activas"
          value={stats.withGeofence}
          sub="Con radio GPS configurado"
          icon={ShieldCheck}
          variant="success"
        />
        <StatCard
          label="Empleados Asignados"
          value={stats.totalUsers}
          sub="Personal distribuido"
          icon={Users}
          variant="info"
        />
        <StatCard
          label="Sedes Operativas"
          value={stats.active}
          sub="En monitoreo continuo"
          icon={Globe}
          variant="default"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="card-surface p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombre o dirección..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 input-standard text-xs"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          </div>

          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2.5 input-standard text-xs cursor-pointer"
            >
              <option value="ALL">Todas las sedes</option>
              <option value="ACTIVE">Solo Activas</option>
              <option value="INACTIVE">Solo Inactivas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Locations Cards Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 card-surface">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-400" />
          <p className="text-sm">Cargando sedes y geocercas...</p>
        </div>
      ) : filteredLocations.length === 0 ? (
        <EmptyState
          icon={MapPinOff}
          title="Sin sedes encontradas"
          description="No se encontraron sedes que coincidan con la búsqueda o estado seleccionado."
          action={{
            label: "Crear Nueva Sede",
            icon: Plus,
            onClick: () => {
              setEditingLocation(null);
              setIsModalOpen(true);
            },
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredLocations.map((loc) => {
            const hasGeofence =
              loc.geofenceLat !== null &&
              loc.geofenceLng !== null &&
              loc.geofenceRadius !== null;

            return (
              <div
                key={loc.id}
                className="card-surface-interactive overflow-hidden flex flex-col group"
              >
                {/* Header of card */}
                <div className="p-6 border-b border-white/5 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                        {loc.name}
                      </h3>
                      {loc.isActive ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Activa
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          Inactiva
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span>{loc.address || "Sin dirección especificada"}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => {
                        setEditingLocation({
                          id: loc.id,
                          name: loc.name,
                          address: loc.address || "",
                          timezone: loc.timezone,
                          geofenceRadius: loc.geofenceRadius || 100,
                          geofenceLat: loc.geofenceLat || -12.046374,
                          geofenceLng: loc.geofenceLng || -77.042793,
                          isActive: loc.isActive,
                        });
                        setIsModalOpen(true);
                      }}
                      title="Editar Geocerca"
                      className="p-2 rounded-xl card-surface text-slate-300 hover:text-white transition-all active:scale-95"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleToggleStatus(loc)}
                      title={loc.isActive ? "Desactivar sede" : "Reactivar sede"}
                      className={`p-2 rounded-xl transition-all active:scale-95 border ${
                        loc.isActive
                          ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20"
                          : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Map Preview */}
                <div className="p-6 pt-4 flex-1 flex flex-col">
                  {hasGeofence ? (
                    <GeofenceMap
                      lat={loc.geofenceLat!}
                      lng={loc.geofenceLng!}
                      radius={loc.geofenceRadius!}
                      onChange={() => {}}
                      interactive={false}
                    />
                  ) : (
                    <div className="w-full h-80 rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center justify-center text-slate-500 text-xs p-6">
                      <MapPinOff className="w-8 h-8 mb-2 text-slate-600" />
                      <span>Sin geocerca configurada</span>
                    </div>
                  )}

                  {/* Summary badges */}
                  <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/5 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>
                        <strong className="text-white font-mono">
                          {loc._count?.users || 0}
                        </strong>{" "}
                        Empleados
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-emerald-400" />
                      <span>
                        <strong className="text-white font-mono">
                          {loc._count?.kiosks || 0}
                        </strong>{" "}
                        Kiosks
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-emerald-400" />
                      <span>
                        Radio:{" "}
                        <strong className="text-white font-mono">
                          {loc.geofenceRadius || 0}m
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form */}
      <LocationFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveLocation}
        initialData={editingLocation}
      />
    </div>
  );
}
