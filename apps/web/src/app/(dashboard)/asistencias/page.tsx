"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ClipboardList,
  Calendar,
  Search,
  Building,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock3,
  ShieldCheck,
  FileText,
  Edit3,
  Download,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Sparkles,
  Bot,
  Sunrise,
  Sunset,
  BellRing,
  Activity,
  Play,
  Check,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { AttendanceStatus } from "@asistencias/db";
import { format, addDays, subDays, isToday, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { JustifyModal } from "@/components/attendance/JustifyModal";
import { EditAttendanceModal } from "@/components/attendance/EditAttendanceModal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModalShell } from "@/components/ui/ModalShell";

interface AttendanceRecord {
  id: string;
  date: string;
  entryTime?: string | null;
  exitTime?: string | null;
  status: AttendanceStatus;
  workedMinutes?: number | null;
  lateMinutes?: number | null;
  notes?: string | null;
  statusChangedBy?: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    documentId?: string | null;
    role: string;
    userSchedules?: Array<{
      schedule: {
        id: string;
        name: string;
        entryHour: number;
        entryMinute: number;
        exitHour: number;
        exitMinute: number;
      };
    }>;
  };
  location?: {
    id: string;
    name: string;
    address?: string | null;
  };
  kiosk?: {
    id: string;
    name: string;
  };
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<any>({
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
    abandoned: 0,
    incomplete: 0,
    pending: 0,
    justified: 0,
  });
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");

  // Modals state
  const [selectedForJustify, setSelectedForJustify] = useState<any | null>(null);
  const [selectedForEdit, setSelectedForEdit] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Automation Panel State
  const [showAutomation, setShowAutomation] = useState(false);
  const [isTriggeringJob, setIsTriggeringJob] = useState<string | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<any | null>(null);
  const [jobResultModal, setJobResultModal] = useState<{
    title: string;
    details: any;
  } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
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

  const fetchSchedulerStatus = async () => {
    try {
      const res = await fetch("/api/jobs/status");
      if (res.ok) {
        const data = await res.json();
        setSchedulerStatus(data);
      }
    } catch (err) {
      console.warn("Scheduler status fetch error:", err);
    }
  };

  const fetchAttendance = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        date: selectedDate,
      });
      if (selectedStatus !== "ALL") params.append("status", selectedStatus);
      if (selectedLocation !== "ALL") params.append("locationId", selectedLocation);
      if (search) params.append("search", search);

      const res = await fetch(`/api/attendance?${params.toString()}`);
      const data = await res.json();
      if (data.attendances) {
        setAttendances(data.attendances);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error("Error fetching attendances:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    fetchSchedulerStatus();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, selectedStatus, selectedLocation]);

  const handlePrevDay = () => {
    const prev = subDays(parseISO(selectedDate), 1);
    setSelectedDate(format(prev, "yyyy-MM-dd"));
  };

  const handleNextDay = () => {
    const next = addDays(parseISO(selectedDate), 1);
    setSelectedDate(format(next, "yyyy-MM-dd"));
  };

  const handleExportCsv = () => {
    window.open(
      `/api/reports/export?startDate=${selectedDate}&endDate=${selectedDate}`,
      "_blank"
    );
  };

  const handleVerifyDni = async (id: string, action: "APPROVE" | "REJECT", userName: string) => {
    try {
      const res = await fetch(`/api/attendance/${id}/verify-dni`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          action === "APPROVE"
            ? `Marcación por DNI de ${userName} aprobada con éxito.`
            : `Marcación por DNI de ${userName} rechazada y anulada.`,
          "success"
        );
        fetchAttendance();
      } else {
        showToast(data.error || "Error al verificar DNI", "error");
      }
    } catch (err) {
      showToast("Error de conexión con el servidor", "error");
    }
  };

  // Trigger Automation Jobs
  const triggerJob = async (action: "daily-start" | "daily-close" | "check-late") => {
    setIsTriggeringJob(action);
    try {
      const res = await fetch(`/api/jobs/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Error al ejecutar tarea automática", "error");
        return;
      }

      if (action === "daily-start") {
        showToast(`🌅 Apertura completada: ${data.created} asistencias PENDIENTE generadas.`);
        setJobResultModal({
          title: "🌅 Apertura de Jornada (SOD)",
          details: {
            "Fecha": data.date,
            "Día": data.dayName,
            "Colaboradores Elegibles": data.totalEligible,
            "Nuevos Registros Creados": data.created,
          },
        });
      } else if (action === "daily-close") {
        showToast(`🌙 Cierre de día completado: ${data.ausentes} ausentes, ${data.incompletos} incompletos.`);
        setJobResultModal({
          title: "🌙 Cierre de Fin de Día (EOD)",
          details: {
            "Fecha": data.date,
            "Marcados como AUSENTE": data.ausentes,
            "Marcados como INCOMPLETO": data.incompletos,
            "Completados (Presentes / Tardes)": data.tardes_presentes,
            "Minutos Trabajados Calculados": data.minutos_calculados,
          },
        });
      } else if (action === "check-late") {
        showToast(`🔍 Monitor de tardanzas: ${data.alertsCreated} alertas generadas.`);
        setJobResultModal({
          title: "🔍 Monitor de Tardanzas y Ausencias",
          details: {
            "Fecha": data.date,
            "Hora de Análisis": data.currentTime,
            "Colaboradores sin Registrar Entrada": data.unmarkedCount,
            "Alertas Creadas en BD": data.alertsCreated,
            "Supervisores Notificados (Push)": data.supervisorsNotified,
          },
        });
      }

      fetchAttendance();
      fetchSchedulerStatus();
    } catch (err: any) {
      showToast("Fallo al conectar con el servidor de tareas", "error");
    } finally {
      setIsTriggeringJob(null);
    }
  };

  const formattedDateTitle = useMemo(() => {
    try {
      const d = parseISO(selectedDate);
      return format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl text-white font-medium text-sm shadow-2xl shadow-black/80 backdrop-blur-xl animate-scale-up ${
            toastType === "error"
              ? "bg-rose-950/90 border border-rose-500/40 text-rose-200"
              : "bg-emerald-950/90 border border-emerald-500/40 text-emerald-200"
          }`}
        >
          {toastType === "error" ? (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header section with Date Navigation and Automation Launcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="gradient-brand w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/20">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Control Diario de Asistencias
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 capitalize flex items-center gap-2">
            <span>{formattedDateTitle}</span>
            {isToday(parseISO(selectedDate)) && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Hoy
              </span>
            )}
          </p>
        </div>

        {/* Date Selector, Automation & Export Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Day Stepper */}
          <div className="flex items-center rounded-2xl card-surface p-1">
            <button
              onClick={handlePrevDay}
              title="Día anterior"
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white text-xs font-mono px-2 py-1 outline-none cursor-pointer"
            />
            <button
              onClick={handleNextDay}
              title="Día siguiente"
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              isToday(parseISO(selectedDate))
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-lg shadow-emerald-950/40"
                : "card-surface text-slate-400 hover:text-white"
            }`}
          >
            Hoy
          </button>

          {/* Toggle Automation Toolbar Button */}
          <button
            onClick={() => setShowAutomation(!showAutomation)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all shadow-md active:scale-95 ${
              showAutomation
                ? "gradient-brand text-white border-emerald-400 shadow-emerald-950/50"
                : "card-surface text-emerald-300 border-emerald-500/30 hover:border-emerald-400"
            }`}
          >
            <Bot className="w-4 h-4 text-emerald-300" />
            <span>Automatizaciones</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
          </button>

          <button
            onClick={fetchAttendance}
            title="Refrescar datos"
            className="p-2 rounded-xl card-surface text-slate-300 hover:text-white transition-all active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
          </button>

          <button
            onClick={handleExportCsv}
            className="gradient-brand flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 hover:opacity-90 transition-opacity"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Automation Command Center (Collapsible Card) */}
      {showAutomation && (
        <div className="card-surface p-5 border border-emerald-500/30 shadow-2xl space-y-4 animate-scale-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  Consola de Tareas y Cron Jobs
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                    schedulerStatus?.online
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                  }`}>
                    {schedulerStatus?.online ? "Scheduler Activo" : "Scheduler Standby"}
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Ejecuta manualmente las tareas de inicio (SOD), monitoreo y cierre de jornada (EOD).
                </p>
              </div>
            </div>

            {schedulerStatus && (
              <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <Activity className={`w-3.5 h-3.5 ${schedulerStatus.online ? "text-emerald-400" : "text-slate-500"}`} />
                  SOD: {schedulerStatus.sodCount || 0} | EOD: {schedulerStatus.eodCount || 0}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Start Of Day (SOD) */}
            <div className="p-4 rounded-2xl bg-black/30 border border-white/10 flex flex-col justify-between gap-3 hover:border-amber-500/30 transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                    <Sunrise className="w-4 h-4" />
                    <span>Apertura de Jornada (SOD)</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">06:00 AM</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  Crea los registros <span className="text-slate-300 font-semibold">PENDIENTE</span> para todos los colaboradores según su turno.
                </p>
              </div>
              <button
                onClick={() => triggerJob("daily-start")}
                disabled={isTriggeringJob !== null}
                className="w-full py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isTriggeringJob === "daily-start" ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-amber-400" />
                )}
                <span>Ejecutar Apertura ({selectedDate})</span>
              </button>
            </div>

            {/* 2. Late Arrival Monitor */}
            <div className="p-4 rounded-2xl bg-black/30 border border-white/10 flex flex-col justify-between gap-3 hover:border-emerald-500/30 transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                    <BellRing className="w-4 h-4" />
                    <span>Monitor de Tardanzas</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Cada 15 min</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  Detecta personal sin marcar entrada (+30 min) y despacha <span className="text-emerald-300 font-semibold">Push a Supervisores</span>.
                </p>
              </div>
              <button
                onClick={() => triggerJob("check-late")}
                disabled={isTriggeringJob !== null}
                className="w-full py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isTriggeringJob === "check-late" ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-emerald-400" />
                )}
                <span>Escanear Tardanzas Ahora</span>
              </button>
            </div>

            {/* 3. End Of Day (EOD) */}
            <div className="p-4 rounded-2xl bg-black/30 border border-white/10 flex flex-col justify-between gap-3 hover:border-purple-500/30 transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
                    <Sunset className="w-4 h-4" />
                    <span>Cierre de Fin de Día (EOD)</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">23:59 PM</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  Calcula horas trabajadas, marca <span className="text-rose-300 font-semibold">AUSENTE</span>, <span className="text-slate-300 font-semibold">INCOMPLETO</span> y tardanzas.
                </p>
              </div>
              <button
                onClick={() => triggerJob("daily-close")}
                disabled={isTriggeringJob !== null}
                className="w-full py-2 px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isTriggeringJob === "daily-close" ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-purple-400" />
                )}
                <span>Ejecutar Cierre EOD ({selectedDate})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="card-surface p-3.5">
          <p className="text-xs text-slate-400 font-medium">Total Esperados</p>
          <p className="text-xl font-extrabold text-white font-mono mt-1">{summary.total}</p>
        </div>

        <div className="card-surface p-3.5 border-emerald-500/20">
          <p className="text-xs text-emerald-400 font-medium">Presentes</p>
          <p className="text-xl font-extrabold text-emerald-400 font-mono mt-1">{summary.present}</p>
        </div>

        <div className="card-surface p-3.5 border-amber-500/20">
          <p className="text-xs text-amber-400 font-medium">Tardanzas</p>
          <p className="text-xl font-extrabold text-amber-400 font-mono mt-1">{summary.late}</p>
        </div>

        <div className="card-surface p-3.5 border-rose-500/20">
          <p className="text-xs text-rose-400 font-medium">Ausentes</p>
          <p className="text-xl font-extrabold text-rose-400 font-mono mt-1">{summary.absent}</p>
        </div>

        <div className="card-surface p-3.5 border-rose-500/30 bg-rose-500/5">
          <p className="text-xs text-rose-300 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            Abandono
          </p>
          <p className="text-xl font-extrabold text-rose-300 font-mono mt-1">{summary.abandoned}</p>
        </div>

        <div className="card-surface p-3.5 border-sky-500/20">
          <p className="text-xs text-sky-400 font-medium">Justificados</p>
          <p className="text-xl font-extrabold text-sky-400 font-mono mt-1">{summary.justified}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-surface p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar colaborador o DNI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchAttendance()}
              className="w-full pl-9 pr-3 py-2.5 input-standard text-xs"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          </div>

          {/* Status selector */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2.5 input-standard text-xs cursor-pointer"
            >
              <option value="ALL">Todos los estados</option>
              <option value={AttendanceStatus.PRESENTE}>Presente</option>
              <option value={AttendanceStatus.TARDE}>Tardanza</option>
              <option value={AttendanceStatus.ABANDONO_PUESTO}>Abandono de Puesto</option>
              <option value={AttendanceStatus.AUSENTE}>Ausente</option>
              <option value={AttendanceStatus.JUSTIFICADO}>Justificado</option>
              <option value={AttendanceStatus.PERMISO}>Permiso</option>
              <option value={AttendanceStatus.PENDIENTE}>Pendiente</option>
            </select>
          </div>

          {/* Location selector */}
          <div className="relative">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2.5 input-standard text-xs cursor-pointer"
            >
              <option value="ALL">Todas las sedes</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="card-surface overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-xs font-semibold text-slate-400">
                <th className="py-4 px-5">Colaborador</th>
                <th className="py-4 px-4">Sede / Kiosco</th>
                <th className="py-4 px-4">Entrada</th>
                <th className="py-4 px-4">Salida</th>
                <th className="py-4 px-4">Estado</th>
                <th className="py-4 px-4">Auditoría / Notas</th>
                <th className="py-4 px-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                    Cargando registros de asistencia...
                  </td>
                </tr>
              ) : attendances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8">
                    <EmptyState
                      icon={UserX}
                      title="Sin registros para esta fecha"
                      description="No se encontraron marcaciones que coincidan con la fecha o filtros seleccionados."
                    />
                  </td>
                </tr>
              ) : (
                attendances.map((record) => {
                  const entryFormatted = record.entryTime
                    ? format(new Date(record.entryTime), "HH:mm:ss")
                    : "—";
                  const exitFormatted = record.exitTime
                    ? format(new Date(record.exitTime), "HH:mm:ss")
                    : "—";

                  const isPendingDni = record.notes?.includes("[PENDIENTE_VALIDACION_DNI]");

                  return (
                    <tr
                      key={record.id}
                      className={`hover:bg-white/[0.02] transition-colors group ${
                        isPendingDni ? "bg-amber-950/15 border-l-2 border-amber-400" : ""
                      }`}
                    >
                      {/* Empleado info */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <img
                            src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                              `${record.user.firstName} ${record.user.lastName}`
                            )}&backgroundColor=16a34a&textColor=ffffff`}
                            alt={record.user.firstName}
                            className="w-10 h-10 rounded-xl ring-1 ring-emerald-500/20 flex-shrink-0 object-cover"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                                {record.user.firstName} {record.user.lastName}
                              </p>
                              {isPendingDni && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40 animate-pulse">
                                  DNI por Validar
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400">
                              {record.user.documentId ? `DNI: ${record.user.documentId} · ` : ""}
                              {record.user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Sede / Kiosco */}
                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span>{record.location?.name || "Sin sede"}</span>
                        </div>
                        {record.kiosk && (
                          <span className="text-[11px] text-slate-500 font-mono">
                            {record.kiosk.name}
                          </span>
                        )}
                      </td>

                      {/* Hora Entrada */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs text-white">
                          {entryFormatted}
                        </span>
                        {record.lateMinutes && record.lateMinutes > 0 ? (
                          <p className="text-[11px] text-amber-400 font-mono">
                            +{record.lateMinutes} min tarde
                          </p>
                        ) : null}
                      </td>

                      {/* Hora Salida */}
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                        {exitFormatted}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={record.status} lateMinutes={record.lateMinutes} size="sm" />
                      </td>

                      {/* Notas / Auditoría */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {record.notes ? (
                          <p className="text-xs text-slate-300 truncate" title={record.notes}>
                            {record.notes}
                          </p>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                        {record.statusChangedBy && (
                          <p className="text-[10px] text-slate-500">
                            Por: {record.statusChangedBy}
                          </p>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick DNI Approval Buttons */}
                          {isPendingDni && (
                            <>
                              <button
                                onClick={() =>
                                  handleVerifyDni(
                                    record.id,
                                    "APPROVE",
                                    `${record.user.firstName} ${record.user.lastName}`
                                  )
                                }
                                title="Aprobar Marcación por DNI"
                                className="px-2 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Aprobar</span>
                              </button>
                              <button
                                onClick={() =>
                                  handleVerifyDni(
                                    record.id,
                                    "REJECT",
                                    `${record.user.firstName} ${record.user.lastName}`
                                  )
                                }
                                title="Rechazar y Anular Marcación"
                                className="px-2 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Rechazar</span>
                              </button>
                            </>
                          )}

                          {/* Justificar Button */}
                          <button
                            onClick={() =>
                              setSelectedForJustify({
                                id: record.id,
                                userName: `${record.user.firstName} ${record.user.lastName}`,
                                date: record.date,
                                currentStatus: record.status,
                              })
                            }
                            title="Justificar Inasistencia o Tardanza"
                            className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition-all active:scale-95"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>

                          {/* Ajustar Registro Button */}
                          <button
                            onClick={() =>
                              setSelectedForEdit({
                                id: record.id,
                                userName: `${record.user.firstName} ${record.user.lastName}`,
                                date: record.date,
                                status: record.status,
                                entryTime: record.entryTime,
                                exitTime: record.exitTime,
                                notes: record.notes,
                                lateMinutes: record.lateMinutes,
                              })
                            }
                            title="Ajustar Horas y Estado"
                            className="p-2 rounded-xl card-surface text-slate-300 hover:text-white transition-all active:scale-95"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Resultados de Ejecución Automática */}
      {jobResultModal && (
        <ModalShell
          isOpen={true}
          onClose={() => setJobResultModal(null)}
          title={jobResultModal.title}
          description="Resultado de la ejecución procesada por el servidor"
          icon={Sparkles}
          iconVariant="primary"
          maxWidth="md"
          footer={
            <button
              onClick={() => setJobResultModal(null)}
              className="gradient-brand w-full py-2.5 rounded-xl text-white font-semibold text-xs shadow-lg"
            >
              Entendido
            </button>
          }
        >
          <div className="divide-y divide-white/5 rounded-2xl bg-black/40 border border-white/5 p-3 text-xs">
            {Object.entries(jobResultModal.details).map(([key, val]) => (
              <div key={key} className="py-2.5 flex justify-between items-center">
                <span className="text-slate-400">{key}:</span>
                <span className="font-semibold text-white font-mono">{String(val)}</span>
              </div>
            ))}
          </div>
        </ModalShell>
      )}

      {/* Modals */}
      <JustifyModal
        isOpen={!!selectedForJustify}
        onClose={() => setSelectedForJustify(null)}
        attendance={selectedForJustify}
        onSuccess={() => {
          showToast("Asistencia justificada correctamente");
          fetchAttendance();
        }}
      />

      <EditAttendanceModal
        isOpen={!!selectedForEdit}
        onClose={() => setSelectedForEdit(null)}
        attendance={selectedForEdit}
        onSuccess={() => {
          showToast("Registro actualizado correctamente");
          fetchAttendance();
        }}
      />
    </div>
  );
}
