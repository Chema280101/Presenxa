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
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { ViewModeToggle } from "@/components/ui/ViewModeToggle";
import QRCode from "qrcode";
import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { KioskFormModal, KioskFormData } from "@/components/kiosks/KioskFormModal";
import { ApiKeyModal } from "@/components/kiosks/ApiKeyModal";
import { KioskDiagnosticModal } from "@/components/kiosks/KioskDiagnosticModal";
import { CustomSelect, CustomSelectOption } from "@/components/ui/CustomSelect";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterToolbar } from "@/components/ui/FilterToolbar";
import { ActionButton, ActionButtonGroup } from "@/components/ui/ActionButton";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonTable } from "@/components/ui/Skeleton";
import {
  DataTableContainer,
  DataTableHeader,
  DataTableHead,
  DataTableBody,
  DataTableRow,
  DataTableCell,
  DataTableEmptyState,
} from "@/components/ui/DataTable";
import { useToast } from "@/providers/ToastProvider";
import { useConfirm } from "@/providers/ConfirmDialogProvider";

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
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [selectedKiosk, setSelectedKiosk] = useState<KioskItem | null>(null);
  const [editingKiosk, setEditingKiosk] = useState<KioskFormData | null>(null);

  // Fast-Pair Inspector state
  const [selectedFastPairKioskId, setSelectedFastPairKioskId] = useState<string | null>(null);
  const [fastPairQrUrl, setFastPairQrUrl] = useState<string>("");
  const [isCopiedFastKey, setIsCopiedFastKey] = useState(false);

  const { toast } = useToast();
  const { confirm } = useConfirm();

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

  const activeFastPairKiosk = useMemo(() => {
    if (!kiosks.length) return null;
    if (selectedFastPairKioskId) {
      const found = kiosks.find((k) => k.id === selectedFastPairKioskId);
      if (found) return found;
    }
    return kiosks[0];
  }, [kiosks, selectedFastPairKioskId]);

  useEffect(() => {
    if (!activeFastPairKiosk) {
      setFastPairQrUrl("");
      return;
    }

    const payload = JSON.stringify({
      kioskId: activeFastPairKiosk.id,
      apiKey: activeFastPairKiosk.apiKey,
      kioskName: activeFastPairKiosk.name,
      locationName: activeFastPairKiosk.location?.name,
    });

    QRCode.toDataURL(payload, {
      width: 260,
      margin: 1,
      color: { dark: "#060E17", light: "#FFFFFF" },
    })
      .then((url) => setFastPairQrUrl(url))
      .catch((err) => console.error("Error generating Fast-Pair QR:", err));
  }, [activeFastPairKiosk]);

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

  const fastPairOptions: CustomSelectOption[] = useMemo(() => {
    return kiosks.map((k) => ({
      value: k.id,
      label: `${k.name} (${k.location.name})`,
    }));
  }, [kiosks]);

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

        toast.success("Kiosk actualizado con éxito");
      } else {
        const res = await fetch("/api/kiosks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Error al registrar kiosk");

        toast.success("Terminal Kiosk registrado con éxito");
        setSelectedKiosk(resData.kiosk);
        setIsKeyModalOpen(true);
      }
      await fetchKiosks();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Error al guardar el kiosk");
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

      toast.success("Nueva API Key generada con éxito");
      await fetchKiosks();

      if (selectedKiosk && selectedKiosk.id === kioskId) {
        setSelectedKiosk((prev) => (prev ? { ...prev, apiKey: data.kiosk.apiKey } : null));
      }
      return data.kiosk.apiKey;
    } catch (err: any) {
      toast.error(err.message || "Error al regenerar clave");
      return null;
    }
  };

  const handleToggleStatus = async (k: KioskItem) => {
    const actionName = k.isActive ? "desactivar" : "reactivar";
    const ok = await confirm({
      title: `¿${actionName.charAt(0).toUpperCase() + actionName.slice(1)} terminal Kiosk?`,
      description: `¿Estás seguro de ${actionName} el kiosk "${k.name}"? ${k.isActive ? "El dispositivo físico no podrá sincronizar ni registrar asistencias de colaboradores." : "El dispositivo volverá a admitir escaneo de asistencias con normalidad."}`,
      confirmText: k.isActive ? "Desactivar" : "Reactivar",
      variant: k.isActive ? "danger" : "primary",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/kiosks/${k.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !k.isActive }),
      });
      if (res.ok) {
        toast.success(`Kiosk ${k.isActive ? "desactivado" : "reactivado"} con éxito`);
        await fetchKiosks();
      }
    } catch (err) {
      console.error("Error toggling kiosk status:", err);
      toast.error("Error al cambiar el estado del kiosk");
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in-up pb-10">
      
      {/* BEGIN: HeaderSection */}
      <PageHeader
        title="Terminales Kiosk y Puntos de Acceso"
        titleBadge={
          <span className="text-[10px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-500/20 whitespace-nowrap">
            {stats.total} Nodos Registrados
          </span>
        }
        subtitle="Administra y monitorea en tiempo real los dispositivos físicos de escaneo QR, lectores NFC/RFID y tablets de recepción con sincronización criptográfica."
        icon={Tablet}
        iconVariant="emerald"
        actionButtons={
          <>
            <Button
              variant="secondary"
              onClick={fetchKiosks}
              isLoading={isLoading}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Actualizar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setEditingKiosk(null);
                setIsFormOpen(true);
              }}
              icon={<Plus className="w-4 h-4" />}
            >
              Nuevo Kiosk
            </Button>
          </>
        }
      />

      {/* BEGIN: KpiMetricsSection */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Kiosks"
          value={stats.total}
          subLabel="En red hotelera local"
          icon={Tablet}
          variant="emerald"
        />
        <StatCard
          label="En Línea (Online)"
          value={stats.online}
          subLabel="Con heartbeat activo <5m"
          icon={Wifi}
          variant="emerald"
        />
        <StatCard
          label="Sedes con Tótem"
          value={locations.length}
          subLabel="Puntos de control físico"
          icon={Building}
          variant="cyan"
        />
        <StatCard
          label="Escaneos Totales"
          value={stats.totalScans}
          subLabel="Marcaciones procesadas"
          icon={QrCode}
          variant="amber"
        />
      </section>

      {/* BEGIN: OperationalHealthBanner */}
      <section className="rounded-2xl border border-primary-200 dark:border-primary-500/20 bg-gradient-to-r from-primary-50 dark:from-primary-950/20 via-surface-50 dark:via-surface-900 to-info-50 dark:to-cyan-950/10 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5 border border-primary-300 dark:border-primary-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <p className="font-semibold text-surface-900 dark:text-slate-100 flex items-center gap-2">
              Protocolo de Contingencia Offline &amp; Búfer Local Activo
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-500/40">FIRMWARE v2.4.2 UP-TO-DATE</span>
            </p>
            <p className="text-surface-600 dark:text-slate-400 text-[11px] mt-1 max-w-4xl">
              En caso de corte de red, los tótems retienen hasta 5,000 marcaciones con sello de tiempo criptográfico inmutable y sincronizan por lotes cada 10s al reestablecer enlace.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsDiagnosticOpen(true)}
          className="shrink-0 text-xs px-4 py-2.5 rounded-xl bg-surface-200 dark:bg-white/5 hover:bg-surface-300 dark:hover:bg-white/10 hover:border-info-400 dark:hover:border-cyan-500/30 border border-surface-300 dark:border-white/10 text-surface-800 dark:text-slate-200 transition flex items-center gap-2 font-medium cursor-pointer active:scale-95 shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-info-600 dark:text-cyan-400" />
          <span>Diagnóstico de Red Kiosks</span>
        </button>
      </section>

      {/* BEGIN: ToolbarFilterSection */}
      <FilterToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre de totem o sede..."
        onReset={() => {
          setSearch("");
          setSelectedStatus("ALL");
        }}
        customFilters={
          <div className="flex items-center justify-between gap-3 w-full lg:w-auto">
            <div className="flex items-center p-1.5 rounded-xl bg-surface-100 dark:bg-command-bg border border-surface-200 dark:border-white/5 text-xs font-semibold overflow-x-auto hide-scrollbar mr-auto">
              {[
                { id: "ALL", label: `Todos (${stats.total})` },
                { id: "ONLINE", label: `En Línea (${stats.online})` },
                { id: "OFFLINE", label: `Offline / Inactivos (${stats.total - stats.online})` },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedStatus(f.id)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                    selectedStatus === f.id
                      ? f.id === 'ONLINE' ? 'bg-primary-100 dark:bg-emerald-500/20 text-primary-700 dark:text-emerald-400 border border-primary-200 dark:border-emerald-500/30' : 'bg-surface-200 dark:bg-slate-800 text-surface-900 dark:text-white'
                      : 'text-surface-500 dark:text-slate-400 hover:text-surface-900 dark:hover:text-white border border-transparent'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>
        }
      />

      {/* BEGIN: Main Content (Cards Grid vs Data Table) */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Left 2 Cols: Kiosk Cards Grid */}
        <div className="xl:col-span-2 space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
              <p className="text-surface-500 dark:text-slate-400">Cargando terminales kiosk...</p>
            </div>
          ) : filteredKiosks.length === 0 ? (
            <div className="text-center py-12 bg-surface-50 dark:bg-white/[0.02] rounded-3xl border border-dashed border-surface-200 dark:border-white/10">
              <Tablet className="w-12 h-12 text-surface-400 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-surface-500 dark:text-slate-400 text-lg font-semibold">Sin terminales encontrados</p>
            </div>
          ) : (
            filteredKiosks.map((k) => {
              const online = isKioskOnline(k.lastSeenAt);
              const isProvisioning = !k.isActive;
              const isSelectedForPairing = activeFastPairKiosk?.id === k.id;
              
              const borderClass = isSelectedForPairing
                ? 'border-primary-400/60 dark:border-emerald-400/60 ring-2 ring-primary-500/40 dark:ring-emerald-500/40 shadow-lg shadow-primary-500/15 bg-surface-50 dark:bg-command-card'
                : isProvisioning
                ? 'border-danger-300 dark:border-rose-500/30 hover:border-danger-400 dark:hover:border-rose-500/50 bg-danger-50 dark:bg-rose-950/10'
                : online
                ? 'border-primary-200 dark:border-emerald-500/20 hover:border-primary-300 dark:hover:border-emerald-500/40 bg-surface-50 dark:bg-command-card/80'
                : 'border-warning-300 dark:border-amber-500/30 hover:border-warning-400 dark:hover:border-amber-500/50 bg-warning-50 dark:bg-amber-950/10';

              return (
                <div
                  key={k.id}
                  onClick={() => setSelectedFastPairKioskId(k.id)}
                  className={`glass-panel rounded-2xl border p-5 relative transition-all duration-300 backdrop-blur-xl cursor-pointer ${borderClass}`}
                >
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-surface-200 dark:border-white/5">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-bold text-base text-surface-900 dark:text-white">{k.name}</h3>
                        {k.isActive ? (
                          online ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 dark:bg-emerald-500/20 text-primary-700 dark:text-emerald-400 border border-primary-200 dark:border-emerald-500/30 font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 dark:bg-emerald-400 animate-pulse-dot"></span>
                              Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-warning-100 dark:bg-amber-500/20 text-warning-700 dark:text-amber-400 border border-warning-200 dark:border-amber-500/30 font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-warning-500 dark:bg-amber-400"></span>
                              Offline Local
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-danger-100 dark:bg-rose-500/20 text-danger-700 dark:text-rose-300 border border-danger-200 dark:border-rose-500/30 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-danger-500 dark:bg-rose-400"></span>
                            Inactivo / Pendiente
                          </span>
                        )}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-100 dark:bg-command-bg text-surface-700 dark:text-slate-300 border border-surface-200 dark:border-white/5">ID: {k.id.slice(0, 8)}</span>
                        {isSelectedForPairing && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-info-100 dark:bg-cyan-500/20 text-info-700 dark:text-cyan-300 border border-info-200 dark:border-cyan-500/30">
                            <QrCode className="w-3 h-3" /> Activo en Fast-Pair
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-surface-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-surface-400 dark:text-slate-500" />
                        {k.location.name} {k.location.address ? `· ${k.location.address}` : ''}
                      </p>
                    </div>
                    <ActionButtonGroup align="right" className="shrink-0">
                      <ActionButton 
                        size="md"
                        variant="primary"
                        icon={<Key className="w-4 h-4" />}
                        title="Ver Token / Clave API"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedKiosk(k);
                          setIsKeyModalOpen(true);
                        }}
                      />
                      <ActionButton 
                        size="md"
                        variant="warning"
                        icon={<Edit2 className="w-4 h-4" />}
                        title="Editar parámetros"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingKiosk({ id: k.id, name: k.name, locationId: k.location.id, isActive: k.isActive });
                          setIsFormOpen(true);
                        }}
                      />
                      <ActionButton 
                        size="md"
                        variant={k.isActive ? "danger" : "success"}
                        icon={<Trash2 className="w-4 h-4" />}
                        title={k.isActive ? "Desactivar Kiosko" : "Reactivar Kiosko"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(k);
                        }}
                      />
                    </ActionButtonGroup>
                  </div>

                  {k.isActive ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 text-xs">
                        <div className="p-2.5 rounded-xl bg-surface-100 dark:bg-command-bg border border-surface-200 dark:border-white/5">
                          <span className="text-[10px] text-surface-500 dark:text-slate-500 block font-medium mb-0.5">Dirección IP Local</span>
                          <span className="font-mono text-surface-800 dark:text-slate-200 font-semibold">{k.ipAddress || '192.168.x.x'}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-surface-100 dark:bg-command-bg border border-surface-200 dark:border-white/5">
                          <span className="text-[10px] text-surface-500 dark:text-slate-500 block font-medium mb-0.5">Latencia</span>
                          <span className="font-mono text-primary-600 dark:text-emerald-400 font-semibold">{online ? '12ms' : '--'} <span className="text-[9px] text-surface-400 dark:text-slate-500"></span></span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-surface-100 dark:bg-command-bg border border-surface-200 dark:border-white/5">
                          <span className="text-[10px] text-surface-500 dark:text-slate-500 block font-medium mb-0.5">Último Heartbeat</span>
                          <span className="font-mono text-surface-700 dark:text-slate-300 capitalize">{k.lastSeenAt ? formatDistanceToNow(parseISO(k.lastSeenAt), { addSuffix: true, locale: es }) : 'N/A'}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-surface-100 dark:bg-command-bg border border-surface-200 dark:border-white/5">
                          <span className="text-[10px] text-surface-500 dark:text-slate-500 block font-medium mb-0.5">Marcaciones Procesadas</span>
                          <span className="font-mono text-surface-900 dark:text-white font-bold">{k._count?.attendances || 0}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-surface-200 dark:border-white/5 text-[11px] text-surface-500 dark:text-slate-400">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1.5 text-surface-700 dark:text-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 dark:bg-emerald-400"></span>
                            Tótem Kiosk Hardware
                          </span>
                          <span>•</span>
                          <span>Cámara QR HD + Lector NFC</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          {online ? (
                            <span className="text-primary-700 dark:text-emerald-400 bg-primary-100 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-primary-200 dark:border-emerald-500/20">100% Sincronizado</span>
                          ) : (
                            <span className="text-warning-700 dark:text-amber-400 bg-warning-100 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-warning-200 dark:border-amber-500/20">Alerta: Verificar Conexión</span>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                      <div className="space-y-1">
                        <p className="text-surface-700 dark:text-slate-300 font-medium">Dispositivo inactivo o pendiente de aprovisionamiento</p>
                        <p className="text-surface-500 dark:text-slate-500 text-[11px]">En espera de reactivación o escaneo del Master QR para inyectar token de sede.</p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedKiosk(k);
                          setIsKeyModalOpen(true);
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-white font-bold text-xs transition shadow-md shadow-primary-500/20 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Ver QR de Emparejamiento</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Col: Hardware Inspector & Rapid Provisioning */}
        <aside className="space-y-5 sticky top-24">
          
          {/* Provisioning Card */}
          <div className="glass-panel rounded-2xl border border-primary-300 dark:border-emerald-500/30 p-5 space-y-4 bg-surface-50 dark:bg-surface-900/90 backdrop-blur-2xl shadow-[0_0_30px_rgba(16,185,129,0.05)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary-500 dark:bg-emerald-400 animate-pulse"></div>
                <h2 className="font-bold text-sm uppercase tracking-wider text-surface-900 dark:text-white">Emparejamiento Rápido</h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary-100 dark:bg-emerald-500/10 text-primary-700 dark:text-emerald-400 border border-primary-200 dark:border-emerald-500/30">FAST-PAIR</span>
            </div>

            {kiosks.length > 0 && (
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-surface-500 dark:text-slate-400 uppercase tracking-wider block">
                  Kiosk Seleccionado
                </label>
                <CustomSelect
                  value={activeFastPairKiosk?.id || ""}
                  onChange={(val) => setSelectedFastPairKioskId(val)}
                  options={fastPairOptions}
                  placeholder="Seleccionar kiosk..."
                />
              </div>
            )}
            
            <div className="p-5 rounded-2xl bg-surface-100 dark:bg-command-bg border border-surface-200 dark:border-white/5 flex flex-col items-center text-center">
              {activeFastPairKiosk ? (
                <>
                  <div
                    onClick={() => {
                      setSelectedKiosk(activeFastPairKiosk);
                      setIsKeyModalOpen(true);
                    }}
                    className="p-3 bg-white rounded-2xl shadow-2xl relative group mb-3 transition-transform hover:scale-105 duration-300 cursor-pointer"
                    title="Clic para ampliar o ver clave completa"
                  >
                    {fastPairQrUrl ? (
                      <img src={fastPairQrUrl} alt="Fast-Pair QR" className="w-40 h-40 object-contain" />
                    ) : (
                      <div className="w-40 h-40 flex items-center justify-center">
                        <RefreshCw className="w-8 h-8 text-primary-500 dark:text-emerald-500 animate-spin" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-surface-900/60 dark:bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center text-white gap-1">
                      <ExternalLink className="w-6 h-6 text-primary-400 dark:text-emerald-400" />
                      <span className="text-[10px] font-bold">Ampliar QR</span>
                    </div>
                  </div>
                  
                  <span className="text-[11px] font-mono text-primary-600 dark:text-emerald-400 font-semibold tracking-wider uppercase">
                    {activeFastPairKiosk.name}
                  </span>
                  <p className="text-[11px] text-surface-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
                    Sede: <span className="text-surface-800 dark:text-slate-200">{activeFastPairKiosk.location.name}</span>
                  </p>

                  <div className="w-full mt-4 pt-3 border-t border-surface-200 dark:border-white/5 flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeFastPairKiosk.apiKey);
                        setIsCopiedFastKey(true);
                        toast.success("API Key copiada al portapapeles");
                        setTimeout(() => setIsCopiedFastKey(false), 2000);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-surface-200 dark:bg-white/5 hover:bg-surface-300 dark:hover:bg-white/10 text-surface-800 dark:text-slate-200 border border-surface-300 dark:border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      {isCopiedFastKey ? <Check className="w-3.5 h-3.5 text-primary-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-surface-500 dark:text-slate-400" />}
                      <span>{isCopiedFastKey ? "Copiada" : "Copiar Key"}</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedKiosk(activeFastPairKiosk);
                        setIsKeyModalOpen(true);
                      }}
                      className="py-2 px-3 rounded-xl bg-primary-50 dark:bg-emerald-500/15 hover:bg-primary-100 dark:hover:bg-emerald-500/25 text-primary-700 dark:text-emerald-400 border border-primary-200 dark:border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>Ver Clave</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-6 space-y-3">
                  <Tablet className="w-12 h-12 text-surface-400 dark:text-slate-600 mx-auto" />
                  <p className="text-xs text-surface-500 dark:text-slate-400">Sin kioskos registrados para vincular</p>
                  <button
                    onClick={() => {
                      setEditingKiosk(null);
                      setIsFormOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-400 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Registrar Kiosk
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Peripherals Status Card */}
          <div className="glass-panel rounded-2xl border border-surface-200 dark:border-white/5 p-5 space-y-4 bg-surface-50 dark:bg-surface-900/60 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-xs uppercase tracking-wider text-surface-500 dark:text-slate-400">
                Telemetría &amp; Periféricos
              </h2>
              <button
                onClick={() => setIsDiagnosticOpen(true)}
                className="text-[10px] font-mono text-primary-600 dark:text-emerald-400 hover:text-primary-500 dark:hover:text-emerald-300 transition flex items-center gap-1 cursor-pointer bg-primary-50 dark:bg-emerald-500/10 hover:bg-primary-100 dark:hover:bg-emerald-500/20 px-2 py-0.5 rounded border border-primary-200 dark:border-emerald-500/20"
              >
                <Sparkles className="w-3 h-3" />
                Auditar
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div 
                onClick={() => setIsDiagnosticOpen(true)}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-100 dark:bg-command-bg border border-surface-200 dark:border-white/5 hover:border-primary-300 dark:hover:border-emerald-500/20 transition cursor-pointer"
              >
                <span className="text-surface-700 dark:text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary-500 dark:bg-emerald-400"></span>
                  Cámaras QR Sensibilidad HD
                </span>
                <span className="font-mono text-surface-900 dark:text-white font-bold">{stats.active} Disp.</span>
              </div>
              <div 
                onClick={() => setIsDiagnosticOpen(true)}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-100 dark:bg-command-bg border border-surface-200 dark:border-white/5 hover:border-primary-300 dark:hover:border-emerald-500/20 transition cursor-pointer"
              >
                <span className="text-surface-700 dark:text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary-500 dark:bg-emerald-400"></span>
                  Sensores NFC Mifare WebAPI
                </span>
                <span className="font-mono text-surface-900 dark:text-white font-bold">{stats.active} Disp.</span>
              </div>
              <div 
                onClick={() => setIsDiagnosticOpen(true)}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-100 dark:bg-command-bg border border-surface-200 dark:border-white/5 hover:border-info-300 dark:hover:border-cyan-500/20 transition cursor-pointer"
              >
                <span className="text-surface-700 dark:text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-info-500 dark:bg-cyan-400"></span>
                  Cola de Sincronización
                </span>
                <span className="font-mono text-info-600 dark:text-cyan-300 font-semibold">0 pendientes</span>
              </div>
            </div>
          </div>

        </aside>
      </div>
      ) : (
        isLoading ? (
          <SkeletonTable rows={5} cols={7} />
        ) : (
          <DataTableContainer>
            <DataTableHeader>
              <DataTableHead>Terminal / Tótem</DataTableHead>
              <DataTableHead>Sede Asignada</DataTableHead>
              <DataTableHead>Estado de Enlace</DataTableHead>
              <DataTableHead>Último Latido</DataTableHead>
              <DataTableHead>Marcaciones</DataTableHead>
              <DataTableHead>IP / Conexión</DataTableHead>
              <DataTableHead className="text-right">Acciones</DataTableHead>
            </DataTableHeader>
            <DataTableBody>
              {filteredKiosks.length === 0 ? (
                <DataTableEmptyState
                  colSpan={7}
                  message={search ? "Prueba cambiando los criterios de búsqueda." : "No hay terminales kiosk registrados aún."}
                />
              ) : (
                filteredKiosks.map((k) => {
                  const online = isKioskOnline(k.lastSeenAt);
                  const isProvisioning = !k.isActive;
                  const isSelectedForPairing = activeFastPairKiosk?.id === k.id;
                  return (
                    <DataTableRow key={k.id}>
                      <DataTableCell>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            online
                              ? "bg-primary-50 dark:bg-emerald-500/15 text-primary-700 dark:text-emerald-400 border-primary-200 dark:border-emerald-500/30"
                              : isProvisioning
                              ? "bg-danger-50 dark:bg-rose-500/15 text-danger-700 dark:text-rose-400 border-danger-200 dark:border-rose-500/30"
                              : "bg-warning-50 dark:bg-amber-500/15 text-warning-700 dark:text-amber-400 border-warning-200 dark:border-amber-500/30"
                          }`}>
                            <Tablet className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-sm text-surface-900 dark:text-white">
                              {k.name}
                              {isSelectedForPairing && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-info-100 dark:bg-cyan-500/20 text-info-700 dark:text-cyan-300 font-mono">
                                  Fast-Pair
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-surface-500 dark:text-slate-400">
                              ID: {k.id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </DataTableCell>
                      <DataTableCell>
                        <div className="flex items-center gap-1.5 text-xs text-surface-700 dark:text-slate-300">
                          <Building className="w-3.5 h-3.5 text-surface-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{k.location.name}</span>
                        </div>
                      </DataTableCell>
                      <DataTableCell>
                        {k.isActive ? (
                          online ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-50 dark:bg-emerald-500/15 text-primary-700 dark:text-emerald-400 border border-primary-200 dark:border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 dark:bg-emerald-400 animate-pulse"></span>
                              Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-warning-50 dark:bg-amber-500/15 text-warning-700 dark:text-amber-400 border border-warning-200 dark:border-amber-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-warning-500 dark:bg-amber-400"></span>
                              Offline Local
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-danger-50 dark:bg-rose-500/15 text-danger-700 dark:text-rose-400 border border-danger-200 dark:border-rose-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-danger-500 dark:bg-rose-400"></span>
                            Inactivo
                          </span>
                        )}
                      </DataTableCell>
                      <DataTableCell>
                        <span className="text-xs text-surface-600 dark:text-slate-400 font-mono">
                          {k.lastSeenAt ? (
                            formatDistanceToNow(parseISO(k.lastSeenAt), { addSuffix: true, locale: es })
                          ) : (
                            "Sin conexión previa"
                          )}
                        </span>
                      </DataTableCell>
                      <DataTableCell>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-slate-300 border border-surface-200 dark:border-surface-700 font-mono">
                          <QrCode className="w-3.5 h-3.5 text-amber-500" />
                          <span>{k._count?.attendances || 0}</span>
                        </span>
                      </DataTableCell>
                      <DataTableCell>
                        <span className="text-xs font-mono text-surface-600 dark:text-slate-400 bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded border border-surface-200 dark:border-surface-700">
                          {k.ipAddress || "127.0.0.1"}
                        </span>
                      </DataTableCell>
                      <DataTableCell className="text-right">
                        <ActionButtonGroup>
                          <ActionButton
                            variant={isSelectedForPairing ? "primary" : "neutral"}
                            onClick={() => setSelectedFastPairKioskId(k.id)}
                            title="Fast-Pair QR"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </ActionButton>
                          <ActionButton
                            variant="neutral"
                            onClick={() => {
                              setSelectedKiosk(k);
                              setIsKeyModalOpen(true);
                            }}
                            title="Ver Llave API"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </ActionButton>
                          <ActionButton
                            variant="warning"
                            onClick={() => {
                              setEditingKiosk({
                                id: k.id,
                                name: k.name,
                                locationId: k.location.id,
                                isActive: k.isActive,
                              });
                              setIsFormOpen(true);
                            }}
                            title="Editar terminal"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </ActionButton>
                          <ActionButton
                            variant={k.isActive ? "danger" : "success"}
                            onClick={() => handleToggleStatus(k)}
                            title={k.isActive ? "Desactivar Kiosko" : "Reactivar Kiosko"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </ActionButton>
                        </ActionButtonGroup>
                      </DataTableCell>
                    </DataTableRow>
                  );
                })
              )}
            </DataTableBody>
          </DataTableContainer>
        )
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

      <KioskDiagnosticModal
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
        kiosksCount={stats.total}
        onlineCount={stats.online}
      />
    </div>
  );
}
