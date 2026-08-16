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

interface ScheduleItem {
  id: string;
  name: string;
  workdaysMask: number;
  entryHour: number;
  entryMinute: number;
  exitHour: number;
  exitMinute: number;
  toleranceMinutes: number;
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
    xM: number
  ): string => {
    let diffMinutes = xH * 60 + xM - (eH * 60 + eM);
    if (diffMinutes < 0) diffMinutes += 24 * 60; // Crosses midnight
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
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

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="gradient-brand w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/20">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Horarios y Turnos Laborales
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Configura las jornadas oficiales de trabajo o clases, tolerancias de tardanza y días laborables.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingSchedule(null);
            setIsModalOpen(true);
          }}
          className="gradient-brand flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-white font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-950/40 hover:opacity-95 active:scale-[0.98] transition-all flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nuevo Horario
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Total Turnos"
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
              placeholder="Buscar por nombre de horario..."
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
              <option value="ALL">Todos los horarios</option>
              <option value="ACTIVE">Solo Activos</option>
              <option value="INACTIVE">Solo Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Schedules Cards Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 card-surface">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-400" />
          <p className="text-sm">Cargando turnos y horarios...</p>
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
            const duration = calculateHours(
              sch.entryHour,
              sch.entryMinute,
              sch.exitHour,
              sch.exitMinute
            );

            return (
              <div
                key={sch.id}
                className="card-surface-interactive overflow-hidden flex flex-col group"
              >
                {/* Card Header */}
                <div className="p-6 pb-4 border-b border-white/5 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                        {sch.name}
                      </h3>
                      {sch.isActive ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Activo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Jornada de <strong className="text-slate-200">{duration}</strong>
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
                          isActive: sch.isActive,
                        });
                        setIsModalOpen(true);
                      }}
                      title="Editar Horario"
                      className="p-2 rounded-xl card-surface text-slate-300 hover:text-white transition-all active:scale-95"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleToggleStatus(sch)}
                      title={sch.isActive ? "Desactivar horario" : "Reactivar horario"}
                      className={`p-2 rounded-xl transition-all active:scale-95 border ${
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
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : "bg-white/5 text-slate-600 border border-white/5"
                              }`}
                            >
                              {d.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tolerancia y Asignados */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <Sliders className="w-3.5 h-3.5" />
                        Tolerancia:{" "}
                        <strong className="text-white font-mono">
                          +{sch.toleranceMinutes} min
                        </strong>
                      </span>

                      <span className="flex items-center gap-1 text-slate-400 font-medium">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        <strong className="text-white font-mono">
                          {sch._count?.userSchedules || 0}
                        </strong>{" "}
                        asignados
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
