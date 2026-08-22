"use client";

import { useState, useEffect, useMemo } from "react";
import {
  QrCode,
  Plus,
  Search,
  Building,
  Key,
  Wifi,
  WifiOff,
  Edit2,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Tablet,
  Globe,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { KioskFormModal, KioskFormData } from "@/components/kiosks/KioskFormModal";
import { ApiKeyModal } from "@/components/kiosks/ApiKeyModal";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

interface KioskItem {
  id: string;
  name: string;
  apiKey: string;
  isActive: boolean;
  lastSeenAt?: string | null;
  ipAddress?: string | null;
  location: {
    id: string;
    name: string;
    address?: string | null;
  };
  _count?: {
    attendances: number;
  };
}

export default function KiosksPage() {
  const [kiosks, setKiosks] = useState<KioskItem[]>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [selectedKiosk, setSelectedKiosk] = useState<KioskItem | null>(null);
  const [editingKiosk, setEditingKiosk] = useState<KioskFormData | null>(null);

  // Toast alert
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/locations");
      const data = await res.json();
      if (data.locations) setLocations(data.locations);
    } catch (err) {
      console.error("Error fetching locations:", err);
    }
  };

  const fetchKiosks = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/kiosks");
      const data = await res.json();
      if (data.kiosks) {
        setKiosks(data.kiosks);
      }
    } catch (err) {
      console.error("Error fetching kiosks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    fetchKiosks();
  }, []);

  const isKioskOnline = (lastSeen?: string | null) => {
    if (!lastSeen) return false;
    const diffMs = Date.now() - new Date(lastSeen).getTime();
    return diffMs < 5 * 60 * 1000; // Online if seen in the last 5 minutes
  };

  const filteredKiosks = useMemo(() => {
    return kiosks.filter((k) => {
      const matchesSearch =
        !search ||
        k.name.toLowerCase().includes(search.toLowerCase()) ||
        k.location.name.toLowerCase().includes(search.toLowerCase());

      const online = isKioskOnline(k.lastSeenAt);

      const matchesStatus =
        selectedStatus === "ALL" ||
        (selectedStatus === "ONLINE" && online && k.isActive) ||
        (selectedStatus === "OFFLINE" && !online && k.isActive) ||
        (selectedStatus === "INACTIVE" && !k.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [kiosks, search, selectedStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = kiosks.length;
    const active = kiosks.filter((k) => k.isActive).length;
    const online = kiosks.filter((k) => k.isActive && isKioskOnline(k.lastSeenAt)).length;
    const totalScans = kiosks.reduce((acc, k) => acc + (k._count?.attendances || 0), 0);
    return { total, active, online, totalScans };
  }, [kiosks]);

  const handleSaveKiosk = async (data: KioskFormData): Promise<boolean> => {
    try {
      if (data.id) {
        const res = await fetch(`/api/kiosks/${data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Error al actualizar kiosk");

        showToast("Kiosk actualizado con éxito");
      } else {
        const res = await fetch("/api/kiosks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Error al registrar kiosk");

        showToast("Terminal Kiosk registrado con éxito");
        setSelectedKiosk(resData.kiosk);
        setIsKeyModalOpen(true);
      }
      await fetchKiosks();
      return true;
    } catch (err: any) {
      alert(err.message || "Error al guardar");
      return false;
    }
  };

  const handleRegenerateKey = async (kioskId: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/kiosks/${kioskId}/regenerate-key`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al regenerar clave");

      showToast("Nueva API Key generada con éxito");
      await fetchKiosks();

      if (selectedKiosk && selectedKiosk.id === kioskId) {
        setSelectedKiosk((prev) => (prev ? { ...prev, apiKey: data.kiosk.apiKey } : null));
      }
      return data.kiosk.apiKey;
    } catch (err: any) {
      alert(err.message || "Error");
      return null;
    }
  };

  const handleToggleStatus = async (k: KioskItem) => {
    const actionName = k.isActive ? "desactivar" : "reactivar";
    if (!confirm(`¿Estás seguro de ${actionName} el kiosk "${k.name}"?`)) return;

    try {
      const res = await fetch(`/api/kiosks/${k.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !k.isActive }),
      });
      if (res.ok) {
        showToast(`Kiosk ${k.isActive ? "desactivado" : "reactivado"} con éxito`);
        await fetchKiosks();
      }
    } catch (err) {
      console.error("Error toggling kiosk status:", err);
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
              <Tablet className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Terminales Kiosk y Puntos de Acceso
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Administra los dispositivos de escaneo físico de QR instalados en recepción y puertas.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            onClick={fetchKiosks}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            title="Recargar terminales Kiosk"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-400" : "text-slate-400"}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button
            onClick={() => {
              setEditingKiosk(null);
              setIsFormOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-primary-400 hover:bg-primary-300 text-surface-950 font-bold text-xs sm:text-sm shadow-lg shadow-primary-950/40 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-surface-950" />
            <span>Nuevo Kiosk</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Total Kiosks"
          value={stats.total}
          sub="Dispositivos registrados"
          icon={Tablet}
          variant="primary"
        />
        <StatCard
          label="En Línea (Online)"
          value={stats.online}
          sub="Con heartbeat activo"
          icon={Wifi}
          variant="success"
        />
        <StatCard
          label="Sedes con Totem"
          value={locations.length}
          sub="Puntos de control físico"
          icon={Building}
          variant="info"
        />
        <StatCard
          label="Escaneos Totales"
          value={stats.totalScans}
          sub="Marcaciones procesadas"
          icon={QrCode}
          variant="warning"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="card-surface p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombre o sede..."
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
              <option value="ALL">Todos los estados</option>
              <option value="ONLINE">En Línea (Online)</option>
              <option value="OFFLINE">Desconectados (Offline)</option>
              <option value="INACTIVE">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kiosks Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="card-surface p-6 rounded-3xl border border-white/8 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <div className="flex gap-1.5">
                  <Skeleton className="h-8 w-8 rounded-xl" />
                  <Skeleton className="h-8 w-8 rounded-xl" />
                  <Skeleton className="h-8 w-8 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 py-1">
                <Skeleton className="h-14 rounded-2xl" />
                <Skeleton className="h-14 rounded-2xl" />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredKiosks.length === 0 ? (
        <EmptyState
          icon={Tablet}
          title="Sin terminales encontrados"
          description="No se encontraron dispositivos kiosk con los filtros aplicados."
          action={{
            label: "Crear Nuevo Kiosk",
            icon: Plus,
            onClick: () => {
              setEditingKiosk(null);
              setIsFormOpen(true);
            },
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredKiosks.map((k) => {
            const online = isKioskOnline(k.lastSeenAt);
            const lastSeenText = k.lastSeenAt
              ? formatDistanceToNow(parseISO(k.lastSeenAt), {
                  addSuffix: true,
                  locale: es,
                })
              : "Nunca conectado";

            return (
              <div
                key={k.id}
                className="card-surface-interactive overflow-hidden flex flex-col justify-between group rounded-3xl"
              >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-white/5 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-white group-hover:text-primary-300 transition-colors">
                        {k.name}
                      </h3>
                      {k.isActive ? (
                        online ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary-400/15 text-primary-300 ring-1 ring-primary-400/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse-dot" />
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20">
                            <WifiOff className="w-3 h-3" />
                            Offline
                          </span>
                        )
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20">
                          Inactivo
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span>{k.location.name}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => {
                        setSelectedKiosk(k);
                        setIsKeyModalOpen(true);
                      }}
                      title="Ver API Key y QR de Emparejamiento"
                      className="p-2 rounded-xl bg-primary-400/10 hover:bg-primary-400/20 text-primary-300 border border-primary-400/20 transition-all active:scale-95 cursor-pointer"
                    >
                      <Key className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setEditingKiosk({
                          id: k.id,
                          name: k.name,
                          locationId: k.location.id,
                          isActive: k.isActive,
                        });
                        setIsFormOpen(true);
                      }}
                      title="Editar Kiosk"
                      className="p-2 rounded-xl card-surface text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleToggleStatus(k)}
                      title={k.isActive ? "Desactivar" : "Reactivar"}
                      className={`p-2 rounded-xl transition-all active:scale-95 border cursor-pointer ${
                        k.isActive
                          ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20"
                          : "bg-primary-400/10 hover:bg-primary-400/20 text-primary-400 border-primary-400/20"
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-6 space-y-3">
                  {/* IP Address & Last Seen */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5">
                      <p className="text-slate-500 text-[11px] mb-0.5">Dirección IP</p>
                      <p className="font-mono text-slate-300">
                        {k.ipAddress || "127.0.0.1"}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5">
                      <p className="text-slate-500 text-[11px] mb-0.5">Última Conexión</p>
                      <p className="text-slate-300 capitalize">{lastSeenText}</p>
                    </div>
                  </div>

                  {/* Scans processed */}
                  <div className="pt-3 flex items-center justify-between text-xs text-slate-400 border-t border-white/5">
                    <span className="flex items-center gap-1.5 font-medium">
                      <QrCode className="w-3.5 h-3.5 text-primary-400" />
                      Marcaciones Procesadas:
                    </span>
                    <strong className="text-white font-mono">
                      {k._count?.attendances || 0}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <KioskFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveKiosk}
        initialData={editingKiosk}
        locations={locations}
      />

      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        kiosk={
          selectedKiosk
            ? {
                id: selectedKiosk.id,
                name: selectedKiosk.name,
                locationName: selectedKiosk.location.name,
                apiKey: selectedKiosk.apiKey,
              }
            : null
        }
        onRegenerateKey={handleRegenerateKey}
      />
    </div>
  );
}
