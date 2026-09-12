"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  MapPin,
  Plus,
  Search,
  Building,
  Users,
  QrCode,
  Globe,
  Edit2,
  Trash2,
  CheckCircle2,
  RefreshCw,
  MapPinOff,
  Activity,
  ArrowRight,
} from "lucide-react";
import {
  LocationFormModal,
  LocationFormData,
} from "@/components/locations/LocationFormModal";
import { LocationCard } from "@/components/locations/LocationCard";
import { LocationSidebar } from "@/components/locations/LocationSidebar";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterToolbar } from "@/components/ui/FilterToolbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/providers/ToastProvider";
import { useConfirm } from "@/providers/ConfirmDialogProvider";

interface LocationItem {
  id: string;
  name: string;
  address?: string | null;
  timezone: string;
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

  const { toast } = useToast();
  const { confirm } = useConfirm();

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationFormData | null>(
    null
  );

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
    const totalKiosks = locations.reduce(
      (acc, l) => acc + (l._count?.kiosks || 0),
      0
    );
    const totalUsers = locations.reduce(
      (acc, l) => acc + (l._count?.users || 0),
      0
    );
    return { total, active, totalKiosks, totalUsers };
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

        toast.success("Sede actualizada con éxito");
      } else {
        // Create location
        const res = await fetch("/api/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Error al crear sede");

        toast.success("Nueva sede registrada con éxito");
      }
      await fetchLocations();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Error al guardar la sede");
      return false;
    }
  };

  const handleToggleStatus = async (loc: LocationItem) => {
    const actionName = loc.isActive ? "desactivar" : "activar";
    const ok = await confirm({
      title: `¿${actionName.charAt(0).toUpperCase() + actionName.slice(1)} sede?`,
      description: `¿Estás seguro de ${actionName} la sede "${loc.name}"? Los colaboradores y kiosks asignados a esta sede ${loc.isActive ? "quedarán sin operaciones activas." : "volverán a estar operativos."}`,
      confirmText: loc.isActive ? "Desactivar" : "Activar",
      variant: loc.isActive ? "danger" : "primary",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/locations/${loc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !loc.isActive }),
      });
      if (res.ok) {
        toast.success(`Sede ${loc.isActive ? "desactivada" : "activada"} con éxito`);
        await fetchLocations();
      }
    } catch (err) {
      console.error("Error toggling location status:", err);
      toast.error("Error al cambiar el estado de la sede");
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in-up pb-10">

      {/* 1. EXECUTIVE OPERATIONAL TOPBAR & BREADCRUMBS */}
      <header className="flex flex-col gap-4">
        {/* Telemetry meta-strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
          {/* Breadcrumb path */}
          <div className="flex items-center gap-2 text-sm font-mono text-surface-500 dark:text-slate-400">
            <span className="text-primary-600 dark:text-emerald-400 font-bold uppercase tracking-wider">SEDES Y UBICACIONES</span>
            <span className="text-surface-300 dark:text-white/20">/</span>
            <span className="text-surface-900 dark:text-white">Panel de Control</span>
          </div>
          {/* Realtime telemetry indicators */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-200/70 dark:bg-white/[0.04] border border-surface-300/80 dark:border-white/[0.08] shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-primary-500 dark:bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]"></span>
              <span className="font-mono text-xs font-semibold text-surface-900 dark:text-white">Live Sync</span>
              <span className="font-mono text-xs font-bold text-primary-600 dark:text-emerald-400">12ms</span>
            </div>
          </div>
        </div>

        {/* Section Main Title & Action Triggers */}
        <PageHeader 
          title="Sedes y Zonas Operativas"
          subtitle="Administra las sedes, terminales kiosk y puntos físicos de marcación de la organización."
          icon={Building}
          iconVariant="emerald"
          actionButtons={
            <>
              <Button
                variant="secondary"
                onClick={fetchLocations}
                isLoading={isLoading}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Actualizar
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setEditingLocation(null);
                  setIsModalOpen(true);
                }}
                icon={<Plus className="w-4 h-4" />}
              >
                Nueva Sede
              </Button>
            </>
          }
        />
      </header>

      {/* 2. HIGH PRIORITY OPERATIONAL KPIS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Sedes"
          value={stats.total}
          subLabel="Complejos registrados"
          icon={Building}
          variant="emerald"
        />
        <StatCard
          label="Sedes Operativas"
          value={stats.active}
          subLabel="Estado de red"
          icon={Globe}
          variant="cyan"
          trend={{ value: 100, label: "Activas", isPositive: true }}
        />
        <StatCard
          label="Colaboradores"
          value={stats.totalUsers}
          subLabel="Personal distribuido globalmente"
          icon={Users}
          variant="indigo"
        />
        <StatCard
          label="Kiosks Emparejados"
          value={stats.totalKiosks}
          subLabel="Sincronización activa"
          icon={QrCode}
          variant="amber"
        />
      </section>

      {/* 3. INFRASTRUCTURE BANNER */}
      <div className="relative overflow-hidden p-5 lg:p-6 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm text-surface-900 dark:text-surface-100 font-bold">Red de Terminales Físicos y Puntos de Marcación</span>
              <span className="px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-500/15 text-primary-700 dark:text-primary-300 font-mono text-[10px] font-bold border border-primary-200 dark:border-primary-500/30">HARDWARE OK</span>
            </div>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 max-w-2xl">
              {stats.totalKiosks} tótems de acceso sincronizando en tiempo real. Protocolo offline activado para asegurar continuidad operativa.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
          <Link 
            href="/kiosks"
            className="px-4 py-2 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-900 dark:text-surface-100 border border-surface-200 dark:border-surface-700 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <span>Ver Red de Kioskos</span>
          </Link>
        </div>
      </div>

      {/* 4. SEARCH, FILTER CONTROLS */}
      <FilterToolbar 
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre o dirección..."
        onReset={() => {
          setSearch("");
          setSelectedStatus("ALL");
        }}
        filters={[
          {
            id: "status",
            value: selectedStatus,
            onChange: setSelectedStatus,
            options: [
              { value: "ALL", label: "Todas las sedes" },
              { value: "ACTIVE", label: "Activas" },
              { value: "INACTIVE", label: "Inactivas" },
            ]
          }
        ]}
      />

      {/* 5. MAIN CONTENT SPLIT: SITES GRID (LEFT) + RIGHT SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* SITES CARDS GRID (8 COLS) */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {isLoading ? (
            <div className="text-center py-16 bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800">
              <RefreshCw className="w-8 h-8 text-primary-500 dark:text-primary-400 animate-spin mx-auto mb-4" />
              <p className="text-surface-600 dark:text-surface-400 font-medium text-sm">Cargando sedes...</p>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-surface-900 rounded-3xl border border-dashed border-surface-200 dark:border-surface-800 p-8">
              <MapPinOff className="w-12 h-12 text-surface-400 dark:text-surface-500 mx-auto mb-4" />
              <p className="text-surface-900 dark:text-surface-100 text-base font-bold">Sin sedes encontradas</p>
              <p className="text-surface-500 dark:text-surface-400 text-xs mt-1">Prueba cambiando los filtros o registra una nueva sede.</p>
            </div>
          ) : (
            filteredLocations.map((loc) => (
              <LocationCard
                key={loc.id}
                location={loc}
                onEdit={(locData) => {
                  setEditingLocation({
                    id: locData.id,
                    name: locData.name,
                    address: locData.address || "",
                    timezone: locData.timezone,
                    isActive: locData.isActive,
                  });
                  setIsModalOpen(true);
                }}
                onToggleStatus={handleToggleStatus}
              />
            ))
          )}
        </div>

        {/* 6. RIGHT SIDEBAR: GEOCERCA INSPECTOR & HEALTH MONITOR */}
        <div className="lg:col-span-4">
          <LocationSidebar 
            totalLocations={locations.length}
            totalKiosks={stats.totalKiosks}
          />
        </div>
      </div>

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
