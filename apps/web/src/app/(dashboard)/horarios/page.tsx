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
} from "lucide-react";
import {
  ScheduleFormModal,
  ScheduleFormData,
} from "@/components/schedules/ScheduleFormModal";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

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

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleFormData | null>(
    null
  );

  // Toast alert
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

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
  }, []);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((sch) => {
      const matchesSearch =
        !search || sch.name.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        selectedStatus === "ALL" ||
        (selectedStatus === "ACTIVE" && sch.isActive) ||
        (selectedStatus === "INACTIVE" && !sch.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [schedules, search, selectedStatus]);

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

        showToast("Horario actualizado con éxito");
      } else {
        // Create
        const res = await fetch("/api/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Error al crear horario");

        showToast("Nuevo horario registrado con éxito");
      }
      await fetchSchedules();
      return true;
    } catch (err: any) {
      alert(err.message || "Error al guardar");
      return false;
    }
  };

  const handleToggleStatus = async (sch: ScheduleItem) => {
    const actionName = sch.isActive ? "desactivar" : "activar";
    if (!confirm(`¿Estás seguro de ${actionName} el horario "${sch.name}"?`))
      return;

    try {
      const res = await fetch(`/api/schedules/${sch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !sch.isActive }),
      });
      if (res.ok) {
        showToast(`Horario ${sch.isActive ? "desactivado" : "activado"} con éxito`);
        await fetchSchedules();
      }
    } catch (err) {
      console.error("Error toggling schedule status:", err);
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
    <div className="space-y-6 animate-fade-in-up">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 font-medium text-sm shadow-2xl shadow-black/80 backdrop-blur-xl animate-scale-up">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Clock className="w-7 h-7 text-emerald-400" />
            <span>Gestión de Turnos y Horarios</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Administra jornadas laborales continuas y partidas, tolerancias y asignaciones
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-shrink-0">
          <button
            onClick={fetchSchedules}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            title="Recargar listado de horarios"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-400" : "text-slate-400"}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button
            onClick={() => {
              setEditingSchedule(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand hover:opacity-95 text-white text-sm font-semibold shadow-lg shadow-indigo-900/40 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Horario</span>
          </button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total de Horarios"
          value={stats.total}
          sub="Configurados en el sistema"
          icon={Clock}
          variant="primary"
        />
        <StatCard
          label="Turnos Activos"
          value={stats.active}
          sub="En vigencia operativa"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          label="Empleados Asignados"
          value={stats.totalAssigned}
          sub="Con turno vigente"
          icon={Users}
          variant="info"
        />
        <StatCard
          label="Tolerancia Promedio"
          value={`${stats.avgTolerance}m`}
          sub="Margen antes de tardanza"
          icon={Sliders}
          variant="warning"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="card-surface p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar horario por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs sm:text-sm focus:border-indigo-500 outline-none transition-colors"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex gap-2">
            {[
              { id: "ALL", label: "Todos" },
              { id: "ACTIVE", label: "Activos" },
              { id: "INACTIVE", label: "Inactivos" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedStatus(f.id)}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  selectedStatus === f.id
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-white/5 text-slate-400 border-white/5 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="card-surface p-6 rounded-3xl border border-white/8 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <div className="flex gap-1.5">
                  <Skeleton className="h-8 w-8 rounded-xl" />
                  <Skeleton className="h-8 w-8 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 py-2">
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-16 rounded-2xl" />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredSchedules.length === 0 ? (
        <EmptyState
          icon={ClockAlert}
          title="Sin horarios encontrados"
          description="No se encontraron horarios que coincidan con la búsqueda o estado seleccionado."
          action={{
            label: "Crear Nuevo Horario",
            icon: Plus,
            onClick: () => {
              setEditingSchedule(null);
              setIsModalOpen(true);
            },
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchedules.map((sch) => {
            const entryStr = `${String(sch.entryHour).padStart(2, "0")}:${String(
              sch.entryMinute
            ).padStart(2, "0")}`;
            const exitStr = `${String(sch.exitHour).padStart(2, "0")}:${String(
              sch.exitMinute
            ).padStart(2, "0")}`;

            const entryStr2 = sch.entryHour2 !== null && sch.entryHour2 !== undefined
              ? `${String(sch.entryHour2).padStart(2, "0")}:${String(
                  sch.entryMinute2 || 0
                ).padStart(2, "0")}`
              : null;
            const exitStr2 = sch.exitHour2 !== null && sch.exitHour2 !== undefined
              ? `${String(sch.exitHour2).padStart(2, "0")}:${String(
                  sch.exitMinute2 || 0
                ).padStart(2, "0")}`
              : null;

            const duration = calculateHours(
              sch.entryHour,
              sch.entryMinute,
              sch.exitHour,
              sch.exitMinute,
              sch.isSplit,
              sch.entryHour2,
              sch.entryMinute2,
              sch.exitHour2,
              sch.exitMinute2
            );

            return (
              <div
                key={sch.id}
                className="card-surface-interactive overflow-hidden flex flex-col group rounded-3xl"
              >
                {/* Card Header */}
                <div className="p-6 pb-4 border-b border-white/5 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-lg font-bold text-white group-hover:text-primary-300 transition-colors">
                        {sch.name}
                      </h3>
                      {sch.isSplit && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-400/20 text-primary-300 ring-1 ring-primary-400/30">
                          Partido (2 Tramos)
                        </span>
                      )}
                      {sch.isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary-400/15 text-primary-300 ring-1 ring-primary-400/30">
                          Activo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Jornada neta de <strong className="text-slate-200">{duration}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => {
                        setEditingSchedule({
                          id: sch.id,
                          name: sch.name,
                          workdaysMask: sch.workdaysMask,
                          entryHour: sch.entryHour,
                          entryMinute: sch.entryMinute,
                          exitHour: sch.exitHour,
                          exitMinute: sch.exitMinute,
                          toleranceMinutes: sch.toleranceMinutes,
                          isSplit: sch.isSplit,
                          entryHour2: sch.entryHour2,
                          entryMinute2: sch.entryMinute2,
                          exitHour2: sch.exitHour2,
                          exitMinute2: sch.exitMinute2,
                          toleranceMinutes2: sch.toleranceMinutes2,
                          isActive: sch.isActive,
                        });
                        setIsModalOpen(true);
                      }}
                      title="Editar Horario"
                      className="p-2 rounded-xl card-surface text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleToggleStatus(sch)}
                      title={sch.isActive ? "Desactivar horario" : "Reactivar horario"}
                      className={`p-2 rounded-xl transition-all active:scale-95 border cursor-pointer ${
                        sch.isActive
                          ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20"
                          : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  {/* Time Range block */}
                  <div className="space-y-2">
                    {sch.isSplit ? (
                      <div className="space-y-2">
                        {/* Tramo 1 */}
                        <div className="p-3 rounded-2xl bg-black/40 border border-amber-500/20 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sun className="w-4 h-4 text-amber-400" />
                            <div>
                              <span className="text-[10px] text-amber-300 font-bold uppercase block">Tramo 1 (Mañana)</span>
                              <span className="font-mono font-bold text-white text-sm">
                                {entryStr} – {exitStr}
                              </span>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">
                            tol. +{sch.toleranceMinutes}m
                          </span>
                        </div>

                        {/* Tramo 2 */}
                        <div className="p-3 rounded-2xl bg-black/40 border border-indigo-500/20 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Moon className="w-4 h-4 text-indigo-400" />
                            <div>
                              <span className="text-[10px] text-indigo-300 font-bold uppercase block">Tramo 2 (Tarde)</span>
                              <span className="font-mono font-bold text-white text-sm">
                                {entryStr2 || "--:--"} – {exitStr2 || "--:--"}
                              </span>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">
                            tol. +{sch.toleranceMinutes2 ?? sch.toleranceMinutes}m
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                            <Sun className="w-3.5 h-3.5 text-amber-400" />
                            <span>Entrada Oficial</span>
                          </div>
                          <p className="text-xl font-bold font-mono text-white">
                            {entryStr}
                          </p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                            <Moon className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Salida Oficial</span>
                          </div>
                          <p className="text-xl font-bold font-mono text-white">
                            {exitStr}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Workdays & Tolerance */}
                  <div className="space-y-3">
                    {/* Días laborales */}
                    <div>
                      <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>Días de labor:</span>
                      </p>
                      <div className="flex gap-1.5">
                        {DAYS.map((d) => {
                          const active = Boolean(sch.workdaysMask & d.bit);
                          return (
                            <span
                              key={d.bit}
                              className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                                active
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                                  : "bg-white/5 text-slate-600 border border-white/5"
                              }`}
                            >
                              {d.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Asignados */}
                    <div className="pt-3 border-t border-white/5 text-xs flex justify-end">
                      <span className="flex items-center gap-1 text-slate-400 font-medium">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        <strong className="text-white font-mono">
                          {sch._count?.userSchedules || 0}
                        </strong>{" "}
                        empleados asignados
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
      <ScheduleFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSchedule}
        initialData={editingSchedule}
      />
    </div>
  );
}
