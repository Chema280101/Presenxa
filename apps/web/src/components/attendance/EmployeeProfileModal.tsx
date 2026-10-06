"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Building,
  Clock,
  ExternalLink,
  Copy,
  Calendar,
  CheckCircle2,
  MapPin,
  AlertTriangle,
  CalendarDays,
  Percent,
  Timer,
  FileText,
  Sparkles,
  Loader2,
  History,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { clsx } from "clsx";
import { ModalShell } from "@/components/ui/ModalShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/providers/ToastProvider";

interface IncidentRecord {
  id: string;
  date: string;
  dateStr?: string;
  monthKey?: string;
  status: string;
  lateMinutes?: number | null;
  entryTime?: string | null;
  exitTime?: string | null;
  notes?: string | null;
  locationName?: string | null;
}

interface PeriodMetrics {
  latesCount: number;
  lateMinutesTotal: number;
  absencesCount: number;
  justifiedCount: number;
  presentsCount: number;
  totalRecords: number;
  punctualityRate: number;
}

interface PeriodData {
  key: string;
  label: string;
  shortName?: string;
  rangeLabel?: string;
  metrics: PeriodMetrics;
}

interface IncidentsApiResponse {
  periods: {
    currentMonth: PeriodData;
    previousMonth: PeriodData;
    week: PeriodData;
    all90Days: PeriodData;
  };
  totalIncidentsCount: number;
  incidents: IncidentRecord[];
}

interface EmployeeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: any | null;
}

type PeriodFilterKey = "all90Days" | "previousMonth" | "currentMonth";

export function EmployeeProfileModal({
  isOpen,
  onClose,
  record,
}: EmployeeProfileModalProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"perfil" | "incidencias">("perfil");
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilterKey>("all90Days");
  const [incidentsData, setIncidentsData] = useState<IncidentsApiResponse | null>(null);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState<boolean>(false);

  const user = record?.user;
  const userId = user?.id;

  // Fetch incidents whenever modal opens for a user
  useEffect(() => {
    if (isOpen && userId) {
      setIsLoadingIncidents(true);
      fetch(`/api/users/${userId}/incidents`)
        .then((res) => {
          if (!res.ok) throw new Error("Error al obtener incidencias");
          return res.json();
        })
        .then((data: IncidentsApiResponse) => {
          setIncidentsData(data);
          // Si el mes actual no tiene tardanzas pero el mes anterior sí tiene, iniciamos en all90Days para no confundir al usuario
          setSelectedPeriod("all90Days");
        })
        .catch((err) => {
          console.error("Error al cargar historial de incidencias:", err);
        })
        .finally(() => {
          setIsLoadingIncidents(false);
        });
    } else {
      setActiveTab("perfil");
      setIncidentsData(null);
    }
  }, [isOpen, userId]);

  if (!isOpen || !record) return null;

  const sched = user?.userSchedules?.[0]?.schedule;
  const dni = user?.documentId || "No registrado";
  const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

  const handleCopyDni = () => {
    if (user?.documentId) {
      navigator.clipboard.writeText(user.documentId);
      toast.success(`DNI ${user.documentId} copiado al portapapeles`);
    }
  };

  const handleNavigateToUsers = () => {
    onClose();
    router.push(`/usuarios?search=${encodeURIComponent(user?.documentId || user?.email || fullName)}`);
  };

  // Scheduled hours formatting
  const schedEntry = sched
    ? `${String(sched.entryHour % 12 || 12).padStart(2, "0")}:${String(sched.entryMinute).padStart(2, "0")} ${sched.entryHour >= 12 ? "PM" : "AM"}`
    : "08:00 AM";
  const schedExit = sched
    ? `${String(sched.exitHour % 12 || 12).padStart(2, "0")}:${String(sched.exitMinute).padStart(2, "0")} ${sched.exitHour >= 12 ? "PM" : "AM"}`
    : "05:00 PM";

  const entryTimeFormatted = record.entryTime
    ? format(new Date(record.entryTime), "hh:mm a")
    : "Sin marcación";
  const exitTimeFormatted = record.exitTime
    ? format(new Date(record.exitTime), "hh:mm a")
    : "Sin marcación";

  const dateFormatted = record.date
    ? format(new Date(record.date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
    : "";

  const totalIncidentsCount = incidentsData?.totalIncidentsCount ?? 0;
  const activePeriodData = incidentsData ? incidentsData.periods[selectedPeriod] : null;

  // Filtrar incidentes según el período activo
  const displayedIncidents = incidentsData?.incidents.filter((inc) => {
    if (selectedPeriod === "all90Days") return true;
    if (selectedPeriod === "currentMonth") return inc.monthKey === incidentsData.periods.currentMonth.key;
    if (selectedPeriod === "previousMonth") return inc.monthKey === incidentsData.periods.previousMonth.key;
    return true;
  }) || [];

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="h-10 px-5 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-700 dark:bg-surface-800 dark:hover:bg-surface-700 dark:text-slate-300 text-sm font-semibold transition cursor-pointer"
      >
        Cerrar
      </button>
      <button
        type="button"
        onClick={handleNavigateToUsers}
        className="h-10 px-5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white shadow-sm hover:shadow-md hover:shadow-primary-500/20 text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer"
      >
        <span>Gestionar en Usuarios</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </button>
    </>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Ficha del Colaborador"
      description="Perfil laboral, turno asignado y métricas de puntualidad"
      icon={User}
      iconVariant="primary"
      maxWidth="3xl"
      footer={footer}
    >
      <div className="space-y-4 py-1">
        {/* Header: User Profile Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-surface-100 via-surface-50 to-primary-50/30 dark:from-surface-900/80 dark:via-surface-900/40 dark:to-primary-950/20 border border-surface-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-400 text-white font-bold text-lg flex items-center justify-center shadow-md shrink-0">
              {user?.firstName?.charAt(0) || "U"}{user?.lastName?.charAt(0) || ""}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-surface-900 dark:text-white">
                  {fullName}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary-100 dark:bg-primary-500/15 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-500/30">
                  {user?.role || "EMPLEADO"}
                </span>
              </div>
              <p className="text-xs text-surface-500 dark:text-slate-400 font-sans">
                {user?.email}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-mono text-surface-700 dark:text-slate-300 bg-surface-200/60 dark:bg-surface-800 px-2 py-0.5 rounded">
                  DNI: {dni}
                </span>
                {user?.documentId && (
                  <button
                    type="button"
                    onClick={handleCopyDni}
                    title="Copiar DNI"
                    className="p-1 text-surface-400 hover:text-surface-700 dark:hover:text-white transition cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Indicator Badge (Historial Global 90 días) */}
          {incidentsData && (
            <div className="flex sm:flex-col items-end gap-1.5 justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-surface-200 dark:border-white/5">
              <span className="text-[11px] text-surface-500 dark:text-slate-400 font-medium">
                Puntualidad Global (90 días)
              </span>
              <div className="flex items-center gap-2">
                <span className={clsx(
                  "text-base font-extrabold font-mono",
                  incidentsData.periods.all90Days.metrics.punctualityRate >= 90
                    ? "text-emerald-600 dark:text-emerald-400"
                    : incidentsData.periods.all90Days.metrics.punctualityRate >= 75
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400"
                )}>
                  {incidentsData.periods.all90Days.metrics.punctualityRate}%
                </span>
                <span className={clsx(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold",
                  totalIncidentsCount === 0
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20"
                    : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20"
                )}>
                  {totalIncidentsCount === 0
                    ? "0 Tardanzas"
                    : `${totalIncidentsCount} Tardanzas en 90 días`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-100 dark:bg-surface-800/80 rounded-xl border border-surface-200/70 dark:border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab("perfil")}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === "perfil"
                ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-xs"
                : "text-surface-600 dark:text-slate-400 hover:text-surface-900 dark:hover:text-white"
            )}
          >
            <Clock className="w-3.5 h-3.5 text-primary-500" />
            <span>Ficha & Turno de Hoy</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("incidencias")}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === "incidencias"
                ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-xs"
                : "text-surface-600 dark:text-slate-400 hover:text-surface-900 dark:hover:text-white"
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-warning-500" />
            <span>Historial de Incidencias</span>
            {totalIncidentsCount > 0 ? (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                {totalIncidentsCount} registradas
              </span>
            ) : (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                0 incidencias
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: PERFIL & HORARIO */}
        {activeTab === "perfil" && (
          <div className="space-y-4 animate-fade-in">
            {/* Section 1: Horario Asignado y Sede */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Horario */}
              <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-900/40 border border-surface-200 dark:border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Turno Asignado</span>
                </div>
                <div className="font-semibold text-sm text-surface-900 dark:text-white">
                  {sched?.name || "Horario Regular Administrativo"}
                </div>
                <div className="text-xs text-surface-600 dark:text-slate-400 font-mono">
                  Entrada: <span className="font-bold text-surface-800 dark:text-slate-200">{schedEntry}</span>
                  {" • "}
                  Salida: <span className="font-bold text-surface-800 dark:text-slate-200">{schedExit}</span>
                </div>
                <div className="text-[11px] text-surface-500 dark:text-slate-500">
                  Tolerancia: {sched?.toleranceMinutes ?? 5} min • {sched?.isSplit ? "Jornada Partida (2 Tramos)" : "Jornada Continua"}
                </div>
              </div>

              {/* Sede & Dispositivo */}
              <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-900/40 border border-surface-200 dark:border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-info-600 dark:text-info-400 text-xs font-bold uppercase tracking-wider">
                  <Building className="w-3.5 h-3.5" />
                  <span>Sede & Terminal</span>
                </div>
                <div className="font-semibold text-sm text-surface-900 dark:text-white">
                  {record.location?.name || "Miraflores Central"}
                </div>
                <div className="text-xs text-surface-600 dark:text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-surface-400" />
                  <span>{record.location?.address || "Av. Pardo 540, Miraflores"}</span>
                </div>
                <div className="text-[11px] text-surface-500 dark:text-slate-500">
                  Dispositivo: {record.kiosk?.name || "Tótem Lobby #01"}
                </div>
              </div>
            </div>

            {/* Section 2: Detalle de la Marcación del Día */}
            <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-900/40 border border-surface-200 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-surface-200 dark:border-white/5">
                <div className="flex items-center gap-2 text-xs font-bold text-surface-800 dark:text-slate-200 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-warning-500" />
                  <span>Registro del Día: {dateFormatted}</span>
                </div>
                <StatusBadge status={record.status} lateMinutes={record.lateMinutes} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-surface-100 dark:bg-surface-800/60">
                  <span className="text-[10px] text-surface-500 dark:text-slate-400 block mb-0.5">Entrada Real</span>
                  <span className="font-mono font-bold text-surface-900 dark:text-white">{entryTimeFormatted}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-100 dark:bg-surface-800/60">
                  <span className="text-[10px] text-surface-500 dark:text-slate-400 block mb-0.5">Salida Real</span>
                  <span className="font-mono font-bold text-surface-900 dark:text-white">{exitTimeFormatted}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-100 dark:bg-surface-800/60">
                  <span className="text-[10px] text-surface-500 dark:text-slate-400 block mb-0.5">Tardanza</span>
                  <span className={`font-mono font-bold ${record.lateMinutes ? 'text-warning-600 dark:text-warning-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {record.lateMinutes ? `+${record.lateMinutes} min` : "0 min (Puntual)"}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-100 dark:bg-surface-800/60">
                  <span className="text-[10px] text-surface-500 dark:text-slate-400 block mb-0.5">Horas Laboradas</span>
                  <span className="font-mono font-bold text-surface-900 dark:text-white">
                    {record.workedMinutes ? `${Math.floor(record.workedMinutes / 60)}h ${record.workedMinutes % 60}m` : "-"}
                  </span>
                </div>
              </div>

              {record.notes && (
                <div className="p-2.5 rounded-lg bg-info-50/60 dark:bg-info-950/20 border border-info-200/50 dark:border-info-500/20 text-xs">
                  <span className="font-semibold text-info-800 dark:text-info-300">Nota de auditoría: </span>
                  <span className="text-surface-700 dark:text-slate-300">{record.notes}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: HISTORIAL DE INCIDENCIAS */}
        {activeTab === "incidencias" && (
          <div className="space-y-4 animate-fade-in">
            {isLoadingIncidents ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-surface-500 dark:text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                <p className="text-xs font-semibold">Cargando métricas de incidencias...</p>
              </div>
            ) : incidentsData && activePeriodData ? (
              <>
                {/* Period Selector Bar */}
                <div className="p-2 rounded-xl bg-surface-100/80 dark:bg-surface-800/60 border border-surface-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs font-bold text-surface-700 dark:text-slate-300 flex items-center gap-1.5 pl-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-primary-500" />
                    <span>Filtrar por período:</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedPeriod("all90Days")}
                      className={clsx(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5",
                        selectedPeriod === "all90Days"
                          ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-xs font-bold ring-1 ring-black/5 dark:ring-white/10"
                          : "text-surface-600 dark:text-slate-400 hover:text-surface-900 dark:hover:text-white"
                      )}
                    >
                      <span>Últimos 90 días</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-surface-200 dark:bg-surface-800 font-mono font-bold">
                        {incidentsData.totalIncidentsCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPeriod("previousMonth")}
                      className={clsx(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5",
                        selectedPeriod === "previousMonth"
                          ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-xs font-bold ring-1 ring-black/5 dark:ring-white/10"
                          : "text-surface-600 dark:text-slate-400 hover:text-surface-900 dark:hover:text-white"
                      )}
                    >
                      <span className="capitalize">{incidentsData.periods.previousMonth.shortName}</span>
                      <span className={clsx(
                        "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                        incidentsData.periods.previousMonth.metrics.latesCount > 0
                          ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300"
                          : "bg-surface-200 dark:bg-surface-800 text-surface-600 dark:text-slate-400"
                      )}>
                        {incidentsData.periods.previousMonth.metrics.latesCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPeriod("currentMonth")}
                      className={clsx(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5",
                        selectedPeriod === "currentMonth"
                          ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-xs font-bold ring-1 ring-black/5 dark:ring-white/10"
                          : "text-surface-600 dark:text-slate-400 hover:text-surface-900 dark:hover:text-white"
                      )}
                    >
                      <span className="capitalize">{incidentsData.periods.currentMonth.shortName} (Actual)</span>
                      <span className={clsx(
                        "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                        incidentsData.periods.currentMonth.metrics.latesCount > 0
                          ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300"
                          : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      )}>
                        {incidentsData.periods.currentMonth.metrics.latesCount}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 3 Metric Summary KPI Cards (Calculadas para el período activo) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Card 1: Esta Semana */}
                  <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-900/40 border border-surface-200 dark:border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                        <Timer className="w-3.5 h-3.5" />
                        <span>Esta Semana</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-200/60 dark:bg-surface-800 text-surface-600 dark:text-slate-300 font-mono">
                        {incidentsData.periods.week.rangeLabel || "Lun - Dom"}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-surface-600 dark:text-slate-400">Tardanzas:</span>
                        <div className="text-right">
                          <span className={clsx(
                            "text-sm font-bold font-mono",
                            incidentsData.periods.week.metrics.latesCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-surface-800 dark:text-slate-200"
                          )}>
                            {incidentsData.periods.week.metrics.latesCount} {incidentsData.periods.week.metrics.latesCount === 1 ? "vez" : "veces"}
                          </span>
                          {incidentsData.periods.week.metrics.lateMinutesTotal > 0 && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-mono">
                              +{incidentsData.periods.week.metrics.lateMinutesTotal} min totales
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-baseline justify-between border-t border-surface-200/60 dark:border-white/5 pt-1.5">
                        <span className="text-xs text-surface-600 dark:text-slate-400">Inasistencias:</span>
                        <span className={clsx(
                          "text-sm font-bold font-mono",
                          incidentsData.periods.week.metrics.absencesCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-surface-800 dark:text-slate-200"
                        )}>
                          {incidentsData.periods.week.metrics.absencesCount} {incidentsData.periods.week.metrics.absencesCount === 1 ? "falta" : "faltas"}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between border-t border-surface-200/60 dark:border-white/5 pt-1.5">
                        <span className="text-xs text-surface-600 dark:text-slate-400">A tiempo:</span>
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                          {incidentsData.periods.week.metrics.presentsCount} días
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Período Seleccionado */}
                  <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-900/40 border border-surface-200 dark:border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span>{activePeriodData.label}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-200/60 dark:bg-surface-800 text-surface-600 dark:text-slate-300 font-mono">
                        {activePeriodData.metrics.totalRecords} días reg.
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-surface-600 dark:text-slate-400">Tardanzas:</span>
                        <div className="text-right">
                          <span className={clsx(
                            "text-sm font-bold font-mono",
                            activePeriodData.metrics.latesCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-surface-800 dark:text-slate-200"
                          )}>
                            {activePeriodData.metrics.latesCount} {activePeriodData.metrics.latesCount === 1 ? "vez" : "veces"}
                          </span>
                          {activePeriodData.metrics.lateMinutesTotal > 0 && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-mono">
                              +{activePeriodData.metrics.lateMinutesTotal} min totales
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-baseline justify-between border-t border-surface-200/60 dark:border-white/5 pt-1.5">
                        <span className="text-xs text-surface-600 dark:text-slate-400">Inasistencias:</span>
                        <span className={clsx(
                          "text-sm font-bold font-mono",
                          activePeriodData.metrics.absencesCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-surface-800 dark:text-slate-200"
                        )}>
                          {activePeriodData.metrics.absencesCount} {activePeriodData.metrics.absencesCount === 1 ? "falta" : "faltas"}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between border-t border-surface-200/60 dark:border-white/5 pt-1.5">
                        <span className="text-xs text-surface-600 dark:text-slate-400">Justificados:</span>
                        <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 font-mono">
                          {activePeriodData.metrics.justifiedCount} permisos
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Tasa de Puntualidad del Período */}
                  <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-900/40 border border-surface-200 dark:border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        <Percent className="w-3.5 h-3.5" />
                        <span>Puntualidad</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-200/60 dark:bg-surface-800 text-surface-600 dark:text-slate-300 font-mono">
                        {activePeriodData.label.slice(0, 15)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className={clsx(
                          "text-2xl font-black font-mono tracking-tight",
                          activePeriodData.metrics.punctualityRate >= 90
                            ? "text-emerald-600 dark:text-emerald-400"
                            : activePeriodData.metrics.punctualityRate >= 75
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400"
                        )}>
                          {activePeriodData.metrics.punctualityRate}%
                        </span>
                        <span className="text-[11px] text-surface-500 dark:text-slate-400 text-right">
                          {activePeriodData.metrics.presentsCount} a tiempo
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-surface-200 dark:bg-surface-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={clsx(
                            "h-full rounded-full transition-all duration-500",
                            activePeriodData.metrics.punctualityRate >= 90
                              ? "bg-emerald-500"
                              : activePeriodData.metrics.punctualityRate >= 75
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          )}
                          style={{ width: `${activePeriodData.metrics.punctualityRate}%` }}
                        />
                      </div>

                      <div className="text-[11px] text-surface-500 dark:text-slate-400 truncate">
                        {activePeriodData.metrics.totalRecords} días evaluados en este período
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subtext info si el mes actual está en 0 pero hay histórico en septiembre */}
                {selectedPeriod === "currentMonth" && activePeriodData.metrics.latesCount === 0 && incidentsData.periods.previousMonth.metrics.latesCount > 0 && (
                  <div className="p-3 rounded-xl bg-info-50/70 dark:bg-info-950/20 border border-info-200/60 dark:border-info-500/20 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-info-800 dark:text-info-300">
                      <Info className="w-4 h-4 text-info-600 shrink-0" />
                      <span>
                        En el mes actual ({incidentsData.periods.currentMonth.shortName}) no registra tardanzas, pero tiene <strong>{incidentsData.periods.previousMonth.metrics.latesCount} tardanzas en {incidentsData.periods.previousMonth.shortName}</strong>.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPeriod("previousMonth")}
                      className="px-2.5 py-1 rounded-lg bg-info-600 text-white font-bold text-[11px] hover:bg-info-500 transition cursor-pointer shrink-0"
                    >
                      Ver {incidentsData.periods.previousMonth.shortName}
                    </button>
                  </div>
                )}

                {/* Timeline / Incidents List */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-surface-800 dark:text-slate-200 uppercase tracking-wider">
                      <History className="w-3.5 h-3.5 text-primary-500" />
                      <span>
                        Historial de Incidencias: {activePeriodData.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-surface-500 dark:text-slate-400">
                      {displayedIncidents.length} {displayedIncidents.length === 1 ? "registro encontrado" : "registros encontrados"}
                    </span>
                  </div>

                  {displayedIncidents.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-emerald-500/5 border border-dashed border-emerald-500/30 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-sm text-surface-900 dark:text-white">
                        ¡Sin incidencias en {activePeriodData.label}!
                      </h4>
                      <p className="text-xs text-surface-500 dark:text-slate-400 max-w-sm mx-auto">
                        Este colaborador no registra tardanzas ni inasistencias en el período seleccionado ({activePeriodData.label}).
                      </p>
                      {selectedPeriod === "currentMonth" && incidentsData.totalIncidentsCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedPeriod("all90Days")}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition cursor-pointer"
                        >
                          <span>Ver historial de 90 días ({incidentsData.totalIncidentsCount} registradas)</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {displayedIncidents.map((incident) => {
                        const incidentDateFormatted = incident.date
                          ? format(new Date(incident.date), "EEEE, d 'de' MMMM, yyyy", { locale: es })
                          : "Fecha no disponible";
                        const entryFormatted = incident.entryTime
                          ? format(new Date(incident.entryTime), "hh:mm a")
                          : "Sin marcación";
                        const exitFormatted = incident.exitTime
                          ? format(new Date(incident.exitTime), "hh:mm a")
                          : "Sin salida";

                        return (
                          <div
                            key={incident.id}
                            className="p-3 rounded-xl bg-surface-50 dark:bg-surface-900/40 border border-surface-200 dark:border-white/5 hover:border-surface-300 dark:hover:border-white/10 transition-colors space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-surface-900 dark:text-white capitalize">
                                  {incidentDateFormatted}
                                </span>
                                {incident.locationName && (
                                  <span className="text-[10px] text-surface-500 dark:text-slate-400 flex items-center gap-1">
                                    • {incident.locationName}
                                  </span>
                                )}
                              </div>
                              <StatusBadge
                                status={incident.status}
                                lateMinutes={incident.lateMinutes}
                                size="sm"
                              />
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-surface-600 dark:text-slate-400 font-mono">
                              <div>
                                Entrada: <span className="font-bold text-surface-800 dark:text-slate-200">{entryFormatted}</span>
                                {incident.lateMinutes && incident.lateMinutes > 0 && (
                                  <span className="text-warning-600 dark:text-warning-400 font-bold ml-1">
                                    (+{incident.lateMinutes} min tarde)
                                  </span>
                                )}
                              </div>
                              <div>
                                Salida: <span className="font-bold text-surface-800 dark:text-slate-200">{exitFormatted}</span>
                              </div>
                            </div>

                            {incident.notes && (
                              <div className="p-2 rounded-lg bg-surface-100 dark:bg-surface-800/80 text-[11px] text-surface-700 dark:text-slate-300 flex items-start gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-surface-400 shrink-0 mt-0.5" />
                                <span>{incident.notes}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-6 text-center text-xs text-surface-500 dark:text-slate-400">
                No se pudo cargar la información de incidencias.
              </div>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
}


