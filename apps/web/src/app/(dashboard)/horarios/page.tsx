"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Plus,
  Search,
  Calendar,
  Users,
  Sliders,
  Edit2,
  Trash2,
  CheckCircle2,
  RefreshCw,
  ClockAlert,
  Sun,
  Moon,
  Sparkles,
  MapPin,
  ChevronDown,
} from "lucide-react";
import {
  ScheduleFormModal,
  ScheduleFormData,
} from "@/components/schedules/ScheduleFormModal";
import { TemplatesModal } from "@/components/schedules/TemplatesModal";
import { BulkAssignModal } from "@/components/schedules/BulkAssignModal";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterToolbar } from "@/components/ui/FilterToolbar";
import { ActionButton, ActionButtonGroup } from "@/components/ui/ActionButton";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import Link from "next/link";
import { useToast } from "@/providers/ToastProvider";
import { useConfirm } from "@/providers/ConfirmDialogProvider";

interface ScheduleItem {
  id: string;
  name: string;
  workdaysMask: number;
  entryHour: number;
  entryMinute: number;
  exitHour: number;
  exitMinute: number;
  toleranceMinutes: number;
  isSplit?: boolean;
  entryHour2?: number | null;
  entryMinute2?: number | null;
  exitHour2?: number | null;
  exitMinute2?: number | null;
  toleranceMinutes2?: number | null;
  isActive: boolean;
  location?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    userSchedules: number;
  };
}

const DAYS = [
  { bit: 1, label: "L" },
  { bit: 2, label: "M" },
  { bit: 4, label: "M" },
  { bit: 8, label: "J" },
  { bit: 16, label: "V" },
  { bit: 32, label: "S" },
  { bit: 64, label: "D" },
];

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");

  const { toast } = useToast();
  const { confirm } = useConfirm();

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleFormData | null>(
    null
  );

  const fetchSchedules = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/schedules");
      const data = await res.json();
      if (data.schedules) {
        setSchedules(data.schedules);
      }
    } catch (err) {
      console.error("Error fetching schedules:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetch("/api/locations")
      .then((res) => res.json())
      .then((data) => {
        if (data.locations) setLocations(data.locations);
      })
      .catch((err) => console.error("Error fetching locations:", err));
  }, []);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((sch) => {
      const matchesSearch =
        !search || sch.name.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        selectedStatus === "ALL" ||
        (selectedStatus === "ACTIVE" && sch.isActive) ||
        (selectedStatus === "INACTIVE" && !sch.isActive);

      const matchesLocation =
        selectedLocation === "ALL" ||
        (selectedLocation === "GLOBAL" && !sch.location) ||
        sch.location?.id === selectedLocation;

      return matchesSearch && matchesStatus && matchesLocation;
    });
  }, [schedules, search, selectedStatus, selectedLocation]);

  // Statistics
  const stats = useMemo(() => {
    const total = schedules.length;
    const active = schedules.filter((s) => s.isActive).length;
    const avgTolerance = total
      ? Math.round(
          schedules.reduce((acc, s) => acc + s.toleranceMinutes, 0) / total
        )
      : 0;
    const totalAssigned = schedules.reduce(
      (acc, s) => acc + (s._count?.userSchedules || 0),
      0
    );
    return { total, active, avgTolerance, totalAssigned };
  }, [schedules]);

  const handleSaveSchedule = async (
    data: ScheduleFormData
  ): Promise<boolean> => {
    try {
      if (data.id) {
        // Edit
        const res = await fetch(`/api/schedules/${data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Error al actualizar horario");

        toast.success("Horario actualizado con éxito");
      } else {
        // Create
        const res = await fetch("/api/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Error al crear horario");

        toast.success("Nuevo horario registrado con éxito");
      }
      await fetchSchedules();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Error al guardar el horario");
      return false;
    }
  };

  const handleToggleStatus = async (sch: ScheduleItem) => {
    const actionName = sch.isActive ? "desactivar" : "activar";
    const ok = await confirm({
      title: `¿${actionName.charAt(0).toUpperCase() + actionName.slice(1)} horario?`,
      description: `¿Estás seguro de ${actionName} el horario "${sch.name}"? Los empleados con este turno ${sch.isActive ? "no tendrán un horario activo hasta que les asignes otro." : "volverán a operar con esta regla de marcación."}`,
      confirmText: sch.isActive ? "Desactivar" : "Activar",
      variant: sch.isActive ? "danger" : "primary",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/schedules/${sch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !sch.isActive }),
      });
      if (res.ok) {
        toast.success(`Horario ${sch.isActive ? "desactivado" : "activado"} con éxito`);
        await fetchSchedules();
      }
    } catch (err) {
      console.error("Error toggling schedule status:", err);
      toast.error("Error al cambiar el estado del horario");
    }
  };

  const calculateHours = (
    eH: number,
    eM: number,
    xH: number,
    xM: number,
    isSplit?: boolean,
    eH2?: number | null,
    eM2?: number | null,
    xH2?: number | null,
    xM2?: number | null
  ): string => {
    let diffMinutes1 = xH * 60 + xM - (eH * 60 + eM);
    if (diffMinutes1 < 0) diffMinutes1 += 24 * 60; // Crosses midnight

    let totalMinutes = diffMinutes1;

    if (isSplit && eH2 !== null && eH2 !== undefined && xH2 !== null && xH2 !== undefined) {
      let diffMinutes2 = xH2 * 60 + (xM2 || 0) - (eH2 * 60 + (eM2 || 0));
      if (diffMinutes2 < 0) diffMinutes2 += 24 * 60;
      totalMinutes += diffMinutes2;
    }

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} horas`;
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in-up pb-10">

      {/* BEGIN: PageHeader */}
      <PageHeader
        title="Gestión de Turnos y Horarios"
        subtitle="Administra jornadas laborales continuas y rotativas, turnos partidos, y tolerancias."
        icon={Clock}
        iconVariant="emerald"
        actionButtons={
          <>
            <Button
              variant="secondary"
              onClick={fetchSchedules}
              isLoading={isLoading}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Actualizar
            </Button>
            <Button 
              variant="secondary"
              className="hidden sm:inline-flex"
              onClick={() => setIsTemplatesModalOpen(true)}
              icon={<Calendar className="w-4 h-4" />}
            >
              Plantillas
            </Button>
            <Button 
              variant="secondary"
              className="hidden sm:inline-flex"
              href="/horarios/matriz"
              icon={<Calendar className="w-4 h-4" />}
            >
              Matriz Semanal
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setEditingSchedule(null);
                setIsModalOpen(true);
              }}
              icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
            >
              Crear Horario
            </Button>
          </>
        }
      />

      {/* BEGIN: KpiMetricsCards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total de Horarios"
          value={stats.total}
          subLabel="Configurados en el sistema"
          icon={Clock}
          variant="emerald"
        />
        <StatCard
          label="Turnos Activos"
          value={stats.active}
          subLabel="En vigencia operativa"
          icon={CheckCircle2}
          variant="cyan"
          trend={{ value: 100, label: "Activos", isPositive: true }}
        />
        <StatCard
          label="Empleados Asignados"
          value={stats.totalAssigned}
          subLabel="Con turno vigente distribuido"
          icon={Users}
          variant="indigo"
        />
        <StatCard
          label="Tolerancia Promedio"
          value={`${stats.avgTolerance}m`}
          subLabel="Margen de gracia (promedio global)"
          icon={Sliders}
          variant="amber"
        />
      </section>

      {/* BEGIN: OperationalAuditBanner */}
      <section className="glass-panel p-5 rounded-2xl border border-primary-200 dark:border-emerald-500/20 bg-gradient-to-r from-primary-50 dark:from-emerald-950/20 via-surface-50 dark:via-[#0a111c] to-info-50 dark:to-cyan-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-primary-500/5 dark:shadow-emerald-500/5">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-emerald-500/20 border border-primary-200 dark:border-emerald-500/40 flex items-center justify-center text-primary-700 dark:text-emerald-400 shrink-0">
            <ClockAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-surface-900 dark:text-white">Esquema de Rotativas y Horarios Partidos Activo</h3>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary-100 dark:bg-emerald-500/20 text-primary-700 dark:text-emerald-300 border border-primary-200 dark:border-emerald-500/30">AUDITADO</span>
            </div>
            <p className="text-xs text-surface-600 dark:text-slate-300 mt-1 max-w-3xl">
              Los turnos partidos registran doble tramo de marcación en kiosk con validación horaria de entrada, receso y salida efectiva de la jornada.
            </p>
          </div>
        </div>
        <Link 
          href="/horarios/matriz"
          className="shrink-0 px-4 py-2 bg-surface-200 dark:bg-white/5 hover:bg-surface-300 dark:hover:bg-white/10 text-surface-800 dark:text-slate-200 border border-surface-300 dark:border-white/10 rounded-xl text-xs font-semibold transition flex items-center space-x-2 cursor-pointer"
        >
          <span>Ver Matriz de Rotación Semanal</span>
          <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
        </Link>
      </section>

      {/* BEGIN: FilterToolBar */}
      <FilterToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar horario por nombre..."
        onReset={() => {
          setSearch("");
          setSelectedStatus("ALL");
          setSelectedLocation("ALL");
        }}
        filters={[
          {
            id: "status",
            value: selectedStatus,
            onChange: setSelectedStatus,
            options: [
              { value: "ALL", label: `Todos (${stats.total})` },
              { value: "ACTIVE", label: `Activos (${stats.active})` },
              { value: "INACTIVE", label: `Inactivos (${stats.total - stats.active})` },
            ]
          },
          {
            id: "location",
            icon: MapPin,
            value: selectedLocation,
            onChange: setSelectedLocation,
            options: [
              { value: "ALL", label: "Todas las sedes" },
              { value: "GLOBAL", label: "Solo Globales" },
              ...locations.map((loc) => ({ value: loc.id, label: loc.name }))
            ]
          }
        ]}
      />
      {/* END: FilterToolBar */}

      {/* BEGIN: MainContentSplitLayout */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* Left Column: Schedules Catalog List (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-primary-500 dark:text-emerald-500 animate-spin mx-auto mb-4" />
              <p className="text-surface-500 dark:text-slate-400">Cargando horarios...</p>
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="text-center py-12 bg-surface-50 dark:bg-white/[0.02] rounded-3xl border border-dashed border-surface-200 dark:border-white/10">
              <ClockAlert className="w-12 h-12 text-surface-400 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-surface-500 dark:text-slate-400 text-lg font-semibold">Sin horarios encontrados</p>
            </div>
          ) : (
            filteredSchedules.map((sch) => {
              const isNightShift = sch.exitHour < sch.entryHour || sch.entryHour >= 18;
              let accentColor = sch.isSplit ? "cyan" : isNightShift ? "indigo" : "emerald";
              let IconComp = sch.isSplit ? Sun : isNightShift ? Moon : Sun;

              const entryStr = `${String(sch.entryHour).padStart(2, "0")}:${String(sch.entryMinute).padStart(2, "0")}`;
              const exitStr = `${String(sch.exitHour).padStart(2, "0")}:${String(sch.exitMinute).padStart(2, "0")}`;
              
              const entryStr2 = sch.entryHour2 !== null && sch.entryHour2 !== undefined
                ? `${String(sch.entryHour2).padStart(2, "0")}:${String(sch.entryMinute2 || 0).padStart(2, "0")}`
                : null;
              const exitStr2 = sch.exitHour2 !== null && sch.exitHour2 !== undefined
                ? `${String(sch.exitHour2).padStart(2, "0")}:${String(sch.exitMinute2 || 0).padStart(2, "0")}`
                : null;

              const duration = calculateHours(
                sch.entryHour, sch.entryMinute, sch.exitHour, sch.exitMinute,
                sch.isSplit, sch.entryHour2, sch.entryMinute2, sch.exitHour2, sch.exitMinute2
              );

              return (
                <article key={sch.id} className={`glass-panel p-6 rounded-3xl border-l-4 relative bg-surface-50 dark:bg-command-card/80 backdrop-blur-2xl border border-surface-200 dark:border-white/5 hover:bg-surface-100 dark:hover:bg-[#0d1624] transition-all duration-300 shadow-xl ${
                  accentColor === 'cyan' ? 'border-l-info-400 dark:border-l-cyan-400 hover:border-info-500/40 dark:hover:border-cyan-500/40' :
                  accentColor === 'indigo' ? 'border-l-indigo-500 dark:border-l-indigo-400 hover:border-indigo-600/40 dark:hover:border-indigo-500/40' :
                  'border-l-primary-500 dark:border-l-emerald-400 hover:border-primary-600/40 dark:hover:border-emerald-500/40'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-surface-900 dark:text-white tracking-tight">{sch.name}</h3>
                        {sch.isActive ? (
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                            accentColor === 'cyan' ? 'bg-info-50 dark:bg-cyan-500/15 text-info-700 dark:text-cyan-300 border-info-200 dark:border-cyan-500/30' :
                            accentColor === 'indigo' ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30' :
                            'bg-primary-50 dark:bg-emerald-500/15 text-primary-700 dark:text-emerald-300 border-primary-200 dark:border-emerald-500/30'
                          }`}>Activo</span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-surface-200 dark:bg-slate-800 text-surface-600 dark:text-slate-400 border border-surface-300 dark:border-slate-700">Inactivo</span>
                        )}
                        {sch.isSplit && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-info-50 dark:bg-cyan-500/20 text-info-700 dark:text-cyan-300 border border-info-200 dark:border-cyan-500/30">Partido (2 Tramos)</span>
                        )}
                        {isNightShift && !sch.isSplit && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">Nocturno</span>
                        )}
                      </div>
                      <p className="text-xs text-surface-500 dark:text-slate-400 mt-1">
                        Sede: <span className="text-surface-800 dark:text-slate-200 font-medium">{sch.location ? sch.location.name : "Global"}</span> • Jornada neta: <span className={`font-semibold ${
                          accentColor === 'cyan' ? 'text-info-600 dark:text-cyan-400' : accentColor === 'indigo' ? 'text-indigo-600 dark:text-indigo-400' : 'text-primary-600 dark:text-emerald-400'
                        }`}>{duration}</span> • Tol: <span className="text-warning-600 dark:text-amber-300 font-mono">{sch.toleranceMinutes} min</span>
                      </p>
                    </div>
                    <ActionButtonGroup align="right" className="ml-2">
                      <ActionButton 
                        size="md"
                        variant="warning"
                        title="Editar Horario"
                        icon={<Edit2 className="w-4 h-4" />}
                        onClick={() => {
                          setEditingSchedule({
                            id: sch.id, name: sch.name, workdaysMask: sch.workdaysMask, entryHour: sch.entryHour, entryMinute: sch.entryMinute, exitHour: sch.exitHour, exitMinute: sch.exitMinute, toleranceMinutes: sch.toleranceMinutes, isSplit: sch.isSplit, entryHour2: sch.entryHour2, entryMinute2: sch.entryMinute2, exitHour2: sch.exitHour2, exitMinute2: sch.exitMinute2, toleranceMinutes2: sch.toleranceMinutes2, locationId: sch.location?.id || null, isActive: sch.isActive,
                          });
                          setIsModalOpen(true);
                        }}
                      />
                      <ActionButton 
                        size="md"
                        variant={sch.isActive ? "danger" : "success"}
                        title={sch.isActive ? "Desactivar Horario" : "Reactivar Horario"}
                        icon={<Trash2 className="w-4 h-4" />}
                        onClick={() => handleToggleStatus(sch)}
                      />
                    </ActionButtonGroup>
                  </div>

                  {/* Time Blocks */}
                  {sch.isSplit ? (
                    <div className="my-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Tramo 1 */}
                      <div className="bg-surface-100 dark:bg-command-bg p-4 rounded-2xl border border-surface-200 dark:border-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase text-info-600 dark:text-cyan-400 tracking-wider">Tramo 1 (Ingreso)</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div><span className="text-[10px] text-surface-500 dark:text-slate-400 block">Entrada 1</span><span className="text-xl font-black text-surface-900 dark:text-white font-mono">{entryStr}</span></div>
                          <span className="text-xs text-surface-400 dark:text-slate-600">→</span>
                          <div className="text-right"><span className="text-[10px] text-surface-500 dark:text-slate-400 block">Salida 1</span><span className="text-xl font-black text-surface-900 dark:text-white font-mono">{exitStr}</span></div>
                        </div>
                      </div>
                      {/* Tramo 2 */}
                      <div className="bg-surface-100 dark:bg-command-bg p-4 rounded-2xl border border-surface-200 dark:border-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase text-primary-600 dark:text-emerald-400 tracking-wider">Tramo 2 (Retorno)</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div><span className="text-[10px] text-surface-500 dark:text-slate-400 block">Entrada 2</span><span className="text-xl font-black text-surface-900 dark:text-white font-mono">{entryStr2 || "--:--"}</span></div>
                          <span className="text-xs text-surface-400 dark:text-slate-600">→</span>
                          <div className="text-right"><span className="text-[10px] text-surface-500 dark:text-slate-400 block">Salida 2</span><span className="text-xl font-black text-surface-900 dark:text-white font-mono">{exitStr2 || "--:--"}</span></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="my-5 grid grid-cols-2 gap-4">
                      {/* Official Entry */}
                      <div className="bg-surface-100 dark:bg-command-bg p-4 rounded-2xl border border-surface-200 dark:border-white/5 flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
                          isNightShift ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'bg-warning-50 dark:bg-amber-500/10 border-warning-200 dark:border-amber-500/20 text-warning-600 dark:text-amber-400'
                        }`}>
                          {isNightShift ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-surface-500 dark:text-slate-400 block tracking-wider">Entrada Oficial</span>
                          <div className="flex items-baseline space-x-2">
                            <span className="text-2xl font-black text-surface-900 dark:text-white font-mono">{entryStr}</span>
                          </div>
                        </div>
                      </div>
                      {/* Official Exit */}
                      <div className="bg-surface-100 dark:bg-command-bg p-4 rounded-2xl border border-surface-200 dark:border-white/5 flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
                          isNightShift ? 'bg-warning-50 dark:bg-amber-500/10 border-warning-200 dark:border-amber-500/20 text-warning-600 dark:text-amber-400' : 'bg-primary-50 dark:bg-emerald-500/10 border-primary-200 dark:border-emerald-500/20 text-primary-600 dark:text-emerald-400'
                        }`}>
                          {isNightShift ? <Sun className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-surface-500 dark:text-slate-400 block tracking-wider">Salida Oficial</span>
                          <div className="flex items-baseline space-x-2">
                            <span className="text-2xl font-black text-surface-900 dark:text-white font-mono">{exitStr}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Days Badges & Assignment Footer */}
                  <div className="pt-4 border-t border-surface-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs text-surface-500 dark:text-slate-400 mr-2 font-medium">Días:</span>
                      {DAYS.map((d) => {
                        const active = Boolean(sch.workdaysMask & d.bit);
                        return (
                          <span
                            key={d.bit}
                            className={`w-7 h-7 rounded-lg font-mono text-[11px] font-bold flex items-center justify-center transition-colors ${
                              active
                                ? `bg-primary-100 dark:bg-emerald-500/20 text-primary-700 dark:text-emerald-300 border border-primary-300 dark:border-emerald-500/30`
                                : `bg-surface-100 dark:bg-white/[0.02] text-surface-400 dark:text-slate-600 border border-surface-200 dark:border-white/5`
                            }`}
                          >
                            {d.label}
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2 text-sm text-surface-800 dark:text-slate-300">
                        <Users className={`w-4 h-4 ${
                          accentColor === 'cyan' ? 'text-info-600 dark:text-cyan-400' : accentColor === 'indigo' ? 'text-indigo-600 dark:text-indigo-400' : 'text-primary-600 dark:text-emerald-400'
                        }`} />
                        <span className="font-bold text-surface-900 dark:text-white">{sch._count?.userSchedules || 0}</span>
                        <span className="text-surface-500 dark:text-slate-400 text-xs">asignados</span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="lg:col-span-5 space-y-6 sticky top-24">
          <div className="glass-panel p-6 rounded-3xl border border-primary-200 dark:border-emerald-500/20 shadow-primary-500/5 dark:shadow-[0_0_20px_rgba(16,185,129,0.05)] bg-surface-50 dark:bg-[#0a111c]/90 backdrop-blur-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-surface-200 dark:border-white/5">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-primary-500 dark:bg-emerald-400 animate-pulse"></div>
                <h3 className="text-base font-extrabold text-surface-900 dark:text-white">Inspector &amp; Reglas Operativas</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary-50 dark:bg-emerald-500/10 text-primary-700 dark:text-emerald-400 border border-primary-200 dark:border-emerald-500/30">EN VIVO</span>
            </div>

            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold uppercase text-surface-500 dark:text-slate-400 tracking-wider">Reglas de Control &amp; Tolerancia</h4>
              
              <div className="p-4 rounded-2xl bg-surface-100 dark:bg-command-bg border border-surface-200 dark:border-white/5 flex items-start space-x-4">
                <div className="w-8 h-8 rounded-xl bg-warning-50 dark:bg-amber-500/10 text-warning-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ClockAlert className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-surface-900 dark:text-white block text-sm">Cálculo de Tardanza Automático</span>
                  <p className="text-surface-500 dark:text-slate-400 mt-1">El Totem Kiosk marca tardanza inmediatamente post-tolerancia y registra los minutos acumulados para cálculo automático de reportes.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface-100 dark:bg-command-bg border border-surface-200 dark:border-white/5 flex items-start space-x-4">
                <div className="w-8 h-8 rounded-xl bg-info-50 dark:bg-cyan-500/10 text-info-600 dark:text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-surface-900 dark:text-white block text-sm">Validación de Turno Partido</span>
                  <p className="text-surface-500 dark:text-slate-400 mt-1">Exige 4 marcaciones obligatorias. Si falta 1 registro, el cierre nocturno SOD lo categoriza como "JORNADA INCOMPLETA".</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface-100 dark:bg-command-bg border border-surface-200 dark:border-white/5 flex items-start space-x-4">
                <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-emerald-500/10 text-primary-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-surface-900 dark:text-white block text-sm">Validación Antifraude Activa</span>
                  <p className="text-surface-500 dark:text-slate-400 mt-1">Marcación validada con sello de tiempo criptográfico del hardware, independiente de la hora local del dispositivo del usuario.</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsBulkAssignModalOpen(true)}
              className="w-full py-3.5 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-sm shadow-md shadow-primary-500/20 dark:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition duration-200 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Users className="w-5 h-5" />
              <span>Asignar Masivamente a Colaboradores</span>
            </button>

            <div className="p-4 rounded-2xl bg-surface-200 dark:bg-slate-900/50 border border-surface-300 dark:border-slate-800 flex items-start space-x-3 text-xs text-surface-600 dark:text-slate-400">
              <Sliders className="w-4 h-4 text-primary-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span><strong className="text-surface-800 dark:text-slate-300">Control de Asistencia:</strong> Las tolerancias configuradas determinan el cálculo automático de tardanzas y los minutos efectivos trabajados en cada jornada.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Modal Form */}
      <ScheduleFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSchedule}
        initialData={editingSchedule}
      />
      
      {/* Templates Modal */}
      <TemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onSelectTemplate={(template) => {
          setEditingSchedule({
            name: `${template.name} (Copia)`,
            workdaysMask: template.workdaysMask,
            entryHour: template.entryHour,
            entryMinute: template.entryMinute,
            exitHour: template.exitHour,
            exitMinute: template.exitMinute,
            toleranceMinutes: template.toleranceMinutes,
            isSplit: template.isSplit,
            entryHour2: template.entryHour2,
            entryMinute2: template.entryMinute2,
            exitHour2: template.exitHour2,
            exitMinute2: template.exitMinute2,
            toleranceMinutes2: template.toleranceMinutes2,
            isActive: true,
          });
          setIsModalOpen(true);
        }}
      />
      
      {/* Bulk Assign Modal */}
      <BulkAssignModal
        isOpen={isBulkAssignModalOpen}
        onClose={() => setIsBulkAssignModalOpen(false)}
        onSuccess={() => {
          fetchSchedules(); // Actualizar contadores de asignados
        }}
      />
    </div>
  );
}
