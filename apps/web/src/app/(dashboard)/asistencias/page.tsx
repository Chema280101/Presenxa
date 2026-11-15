"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  BadgeCheck,
  ClipboardList,
  Calendar,
  Building,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Users,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Sunrise,
  Sunset,
  BellRing,
  Activity,
  Play,
  Check,
  CheckCircle2,
  Edit3,
  X,
  XCircle,
  ChevronDown,
  Eye,
  Copy,
  User,
  UserCheck,
  SearchX,
  FolderTree,
} from "lucide-react";
import { AttendanceStatus } from "@asistencias/db";
import { format, addDays, subDays, isToday, parseISO } from "date-fns";
import { JustifyModal } from "@/components/attendance/JustifyModal";
import { EditAttendanceModal } from "@/components/attendance/EditAttendanceModal";
import { EmployeeProfileModal } from "@/components/attendance/EmployeeProfileModal";
import {
  AttendanceDesktopRow,
  AttendanceMobileCard,
  type AttendanceRecordItem,
  type AttendanceRowHandlers,
} from "@/components/attendance/AttendanceTableRows";
import { useToast } from "@/providers/ToastProvider";
import { ExportReportDropdown } from "@/components/reports/ExportReportDropdown";
import { PdfReportModal } from "@/components/reports/PdfReportModal";
import { StatCard } from "@/components/ui/StatCard";
import { ModalShell } from "@/components/ui/ModalShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterToolbar } from "@/components/ui/FilterToolbar";
import { 
  DataTableContainer, 
  DataTableHeader, 
  DataTableHead, 
  DataTableBody, 
  DataTableRow, 
  DataTableCell, 
  DataTableEmptyState,
  DataTablePagination
} from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";

type AttendanceRecord = AttendanceRecordItem;

function MobileAttendanceContent({
  isLoading,
  totalCount,
  paginatedAttendances,
  rowHandlers,
}: Readonly<{
  isLoading: boolean;
  totalCount: number;
  paginatedAttendances: AttendanceRecord[];
  rowHandlers: AttendanceRowHandlers;
}>) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {["skel-1", "skel-2", "skel-3"].map((skelKey) => (
          <div key={skelKey} className="p-4 rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 animate-pulse space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-4 bg-surface-200 dark:bg-surface-850 rounded w-1/3"></div>
              <div className="h-5 bg-surface-200 dark:bg-surface-850 rounded-full w-20"></div>
            </div>
            <div className="h-3 bg-surface-200 dark:bg-surface-850 rounded w-1/2"></div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-100 dark:border-surface-800">
              <div className="h-10 bg-surface-100 dark:bg-surface-800/50 rounded-xl"></div>
              <div className="h-10 bg-surface-100 dark:bg-surface-800/50 rounded-xl"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (totalCount === 0) {
    return (
      <div className="p-8 text-center text-surface-500 dark:text-surface-400 text-xs">
        Sin registros para esta fecha. No se encontraron marcaciones con los filtros seleccionados.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {paginatedAttendances.map((record) => (
        <AttendanceMobileCard key={`mobile-${record.id}`} record={record} handlers={rowHandlers} />
      ))}
    </div>
  );
}

function DesktopAttendanceRows({
  isLoading,
  totalCount,
  paginatedAttendances,
  rowHandlers,
}: Readonly<{
  isLoading: boolean;
  totalCount: number;
  paginatedAttendances: AttendanceRecord[];
  rowHandlers: AttendanceRowHandlers;
}>) {
  if (isLoading) {
    return (
      <DataTableRow>
        <DataTableCell colSpan={7} align="center" className="p-8 text-slate-600 dark:text-slate-400">Cargando registros de asistencias...</DataTableCell>
      </DataTableRow>
    );
  }
  if (totalCount === 0) {
    return (
      <DataTableEmptyState
        colSpan={7}
        icon={SearchX}
        message="Sin registros para esta fecha"
        description="No se encontraron marcaciones que coincidan con la fecha o filtros seleccionados."
      />
    );
  }
  return (
    <>
      {paginatedAttendances.map((record) => (
        <AttendanceDesktopRow key={record.id} record={record} handlers={rowHandlers} />
      ))}
    </>
  );
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
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");

  // Modals state
  const [selectedForJustify, setSelectedForJustify] = useState<any>(null);
  const [selectedForEdit, setSelectedForEdit] = useState<any>(null);
  const [selectedForProfile, setSelectedForProfile] = useState<any>(null);
  const { toast } = useToast();

  // Pagination state (server-side)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 1,
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, selectedStatus, selectedLocation, selectedDepartment, search]);

  const totalItems = pagination.total;
  const totalPages = pagination.totalPages;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedAttendances = attendances;

  // Automation Panel State
  const [showAutomation, setShowAutomation] = useState(false);

  // PDF Report modal state
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfReportData, setPdfReportData] = useState<any>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isTriggeringJob, setIsTriggeringJob] = useState<string | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null);
  const [jobResultModal, setJobResultModal] = useState<{
    title: string;
    details: any;
  } | null>(null);

  const fetchLocationsAndDepartments = async () => {
    try {
      const [locRes, deptRes] = await Promise.all([
        fetch("/api/locations"),
        fetch("/api/departments"),
      ]);
      const locData = await locRes.json();
      const deptData = await deptRes.json();
      if (locData.locations) setLocations(locData.locations);
      if (deptData.departments) setDepartments(deptData.departments);
    } catch (err) {
      console.error("Error fetching locations or departments:", err);
    }
  };

  const fetchSchedulerStatus = async () => {
    try {
      const res = await fetch(`/api/jobs/status?date=${encodeURIComponent(selectedDate)}`);
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
        page: String(currentPage),
        pageSize: String(pageSize),
      });
      if (selectedStatus !== "ALL") params.append("status", selectedStatus);
      if (selectedLocation !== "ALL") params.append("locationId", selectedLocation);
      if (selectedDepartment !== "ALL") params.append("departmentId", selectedDepartment);
      if (search) params.append("search", search);

      const res = await fetch(`/api/attendance?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      if (data?.attendances) {
        setAttendances(data.attendances);
        if (data.summary) {
          setSummary(data.summary);
        }
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (err) {
      console.error("Error fetching attendances:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchLocationsAndDepartments();
  }, []);

  useEffect(() => {
    void fetchSchedulerStatus();
  }, [selectedDate]);

  useEffect(() => {
    void fetchAttendance();
  }, [selectedDate, selectedStatus, selectedLocation, selectedDepartment, currentPage, pageSize]);

  // Date Navigation State & Refs
  const [showDatePresets, setShowDatePresets] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const presetsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setShowDatePresets(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const quickDateJumps = useMemo(() => [
    { label: "Hoy", value: format(new Date(), "yyyy-MM-dd"), sub: "Día actual" },
    { label: "Ayer", value: format(subDays(new Date(), 1), "yyyy-MM-dd"), sub: "1 día atrás" },
    { label: "Hace 7 días", value: format(subDays(new Date(), 7), "yyyy-MM-dd"), sub: "1 semana atrás" },
    { label: "Hace 15 días", value: format(subDays(new Date(), 15), "yyyy-MM-dd"), sub: "2 semanas atrás" },
    { label: "Hace 30 días", value: format(subDays(new Date(), 30), "yyyy-MM-dd"), sub: "1 mes atrás" },
    { label: "Hace 60 días", value: format(subDays(new Date(), 60), "yyyy-MM-dd"), sub: "2 meses atrás" },
  ], []);

  const handlePrevDay = () => {
    const prev = subDays(parseISO(selectedDate), 1);
    setSelectedDate(format(prev, "yyyy-MM-dd"));
  };

  const handleNextDay = () => {
    const next = addDays(parseISO(selectedDate), 1);
    setSelectedDate(format(next, "yyyy-MM-dd"));
  };

  const handlePrevWeek = () => {
    const prev = subDays(parseISO(selectedDate), 7);
    setSelectedDate(format(prev, "yyyy-MM-dd"));
  };

  const handleNextWeek = () => {
    const next = addDays(parseISO(selectedDate), 7);
    setSelectedDate(format(next, "yyyy-MM-dd"));
  };

  const buildDailyExportUrl = (formatType: "xlsx" | "csv") => {
    const params = new URLSearchParams({
      startDate: selectedDate,
      endDate: selectedDate,
      format: formatType,
    });
    if (selectedLocation !== "ALL") {
      params.append("locationId", selectedLocation);
    }
    return `/api/reports/export?${params.toString()}`;
  };

  const handleExportExcel = () => {
    window.open(buildDailyExportUrl("xlsx"), "_blank");
  };

  const handleExportCsv = () => {
    window.open(buildDailyExportUrl("csv"), "_blank");
  };

  const handleOpenPdfModal = async () => {
    try {
      setIsGeneratingPdf(true);
      const params = new URLSearchParams({
        period: "CUSTOM",
        startDate: selectedDate,
        endDate: selectedDate,
      });
      if (selectedLocation !== "ALL") params.append("locationId", selectedLocation);

      const res = await fetch(`/api/reports/detailed?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data) {
        setPdfReportData(data);
        setIsPdfModalOpen(true);
      } else {
        toast.error(data.error || "No se pudo cargar el reporte en PDF");
      }
    } catch (err) {
      console.error("Error al generar PDF de asistencia:", err);
      toast.error("Error al conectar con el servidor para generar el PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
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
        if (action === "APPROVE") {
          toast.success(`Marcación por DNI de ${userName} aprobada con éxito.`);
        } else {
          toast.success(`Marcación por DNI de ${userName} rechazada y anulada.`);
        }
        void fetchAttendance();
      } else {
        toast.error(data.error || "Error al verificar DNI");
      }
    } catch {
      toast.error("Error de conexión con el servidor");
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
        toast.error(data.error || "Error al ejecutar tarea automática");
        return;
      }

      if (action === "daily-start") {
        toast.success(`🌅 Apertura completada: ${data.created} asistencias PENDIENTE generadas.`);
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
        toast.success(`🌙 Cierre de día completado: ${data.ausentes} ausentes, ${data.incompletos} incompletos.`);
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
        toast.success(`🔍 Monitor de tardanzas: ${data.alertsCreated} alertas generadas.`);
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

      void fetchAttendance();
      void fetchSchedulerStatus();
    } catch {
      toast.error("Fallo al conectar con el servidor de tareas");
    } finally {
      setIsTriggeringJob(null);
    }
  };

  const openJustificationModal = (record: AttendanceRecord) => {
    setSelectedForJustify({
      id: record.id,
      userName: `${record.user.firstName} ${record.user.lastName}`,
      userDocumentId: record.user.documentId,
      userRole: record.user.role,
      departmentName: record.user.department?.name,
      locationName: record.location?.name,
      date: typeof record.date === 'string' ? record.date.slice(0, 10) : format(new Date(record.date), 'yyyy-MM-dd'),
      currentStatus: record.status,
      notes: record.notes,
      statusChangedBy: record.statusChangedBy,
      statusChangedAt: record.statusChangedAt,
      entryTime: record.entryTime,
      exitTime: record.exitTime,
      lateMinutes: record.lateMinutes,
      attachmentUrl: record.attachmentUrl,
    });
  };

  const handleReviewOvertime = async (
    id: string,
    action: "APPROVE" | "REJECT",
    firstName: string
  ) => {
    try {
      const res = await fetch(`/api/attendance/${id}/overtime`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al revisar horas extras");

      toast.success(
        action === "APPROVE"
          ? `Horas extras aprobadas para ${firstName}`
          : `Horas extras rechazadas para ${firstName}`
      );
      await fetchAttendance();
    } catch (err: any) {
      toast.error(err.message || "Error al procesar sobretiempo");
    }
  };

  const getJustifyLabel = (status: string) => {
    if (status === "TARDE") return "Justificar tardanza";
    return status === "AUSENTE" ? "Justificar inasistencia" : "Justificar incidencia";
  };

  const getRecordSmartMenuItems = (record: AttendanceRecord, isMobile = false) => {
    const isPendingDni = record.requiresManagerApproval || record.notes?.includes("[PENDIENTE_VALIDACION_DNI]");
    const canJustify = ["TARDE", "AUSENTE", "INCOMPLETO", "ABANDONO_PUESTO"].includes(record.status);
    const isAlreadyJustified = record.status === "JUSTIFICADO" || record.status === "PERMISO";
    const smartMenuItems: any[] = [];

    if (isPendingDni && isMobile) {
      smartMenuItems.push(
        {
          label: "Aprobar marcación DNI",
          icon: <Check className="w-3.5 h-3.5 text-emerald-500" />,
          onClick: () => handleVerifyDni(record.id, "APPROVE", record.user.firstName),
        },
        {
          label: "Rechazar marcación DNI",
          icon: <X className="w-3.5 h-3.5 text-danger-500" />,
          variant: "danger",
          onClick: () => handleVerifyDni(record.id, "REJECT", record.user.firstName),
        }
      );
    }

    if ((record.overtimeMinutes || 0) >= 15 && record.overtimeStatus === "PENDING") {
      smartMenuItems.push(
        {
          label: `Aprobar Horas Extras (+${Math.floor((record.overtimeMinutes || 0) / 60)}h ${(record.overtimeMinutes || 0) % 60}m)`,
          icon: <Check className="w-3.5 h-3.5 text-emerald-500" />,
          onClick: () => handleReviewOvertime(record.id, "APPROVE", record.user.firstName),
        },
        {
          label: "Rechazar Horas Extras",
          icon: <X className="w-3.5 h-3.5 text-danger-500" />,
          variant: "danger",
          onClick: () => handleReviewOvertime(record.id, "REJECT", record.user.firstName),
        }
      );
    }

    if (canJustify && (isMobile || record.status !== "TARDE")) {
      smartMenuItems.push({
        label: getJustifyLabel(record.status),
        icon: <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />,
        onClick: () => openJustificationModal(record),
      });
    } else if (isAlreadyJustified && isMobile) {
      smartMenuItems.push({
        label: "Ver justificación registrada",
        icon: <Eye className="w-3.5 h-3.5 text-sky-500" />,
        onClick: () => openJustificationModal(record),
      });
    }

    const hasDirectEditOnDesktop =
      !isMobile &&
      !["TARDE", "JUSTIFICADO", "PERMISO", "ABANDONO_PUESTO"].includes(record.status) &&
      !isPendingDni;
    if (isMobile || !hasDirectEditOnDesktop) {
      smartMenuItems.push({
        label: "Ajustar horas / estado",
        icon: <Edit3 className="w-3.5 h-3.5 text-amber-500" />,
        onClick: () =>
          setSelectedForEdit({
            id: record.id,
            userName: `${record.user.firstName} ${record.user.lastName}`,
            date: typeof record.date === "string" ? record.date.slice(0, 10) : format(new Date(record.date), "yyyy-MM-dd"),
            status: record.status,
            entryTime: record.entryTime,
            exitTime: record.exitTime,
            entryTime2: record.entryTime2,
            exitTime2: record.exitTime2,
            notes: record.notes,
            lateMinutes: record.lateMinutes,
            lateMinutes2: record.lateMinutes2,
          }),
      });
    }

    smartMenuItems.push(
      {
        label: `Copiar DNI (${record.user.documentId || "Sin DNI"})`,
        icon: <Copy className="w-3.5 h-3.5 text-surface-500 dark:text-slate-400" />,
        disabled: !record.user.documentId,
        divider: true,
        onClick: () => {
          if (record.user.documentId) {
            void navigator.clipboard.writeText(record.user.documentId);
            toast.success(`DNI ${record.user.documentId} copiado`);
          }
        },
      },
      {
        label: "Ver ficha del colaborador",
        icon: <User className="w-3.5 h-3.5 text-emerald-500" />,
        onClick: () => {
          setSelectedForProfile(record);
        },
      }
    );

    return smartMenuItems;
  };

  const rowHandlers: AttendanceRowHandlers = {
    onSelectProfile: (record) => setSelectedForProfile(record),
    onVerifyDni: handleVerifyDni,
    onOpenJustify: openJustificationModal,
    onSelectEdit: (record) =>
      setSelectedForEdit({
        id: record.id,
        userName: `${record.user.firstName} ${record.user.lastName}`,
        date: typeof record.date === "string" ? record.date.slice(0, 10) : format(new Date(record.date), "yyyy-MM-dd"),
        status: record.status,
        entryTime: record.entryTime,
        exitTime: record.exitTime,
        entryTime2: record.entryTime2,
        exitTime2: record.exitTime2,
        notes: record.notes,
        lateMinutes: record.lateMinutes,
        lateMinutes2: record.lateMinutes2,
      }),
    getSmartMenuItems: getRecordSmartMenuItems,
  };

  return (
    <div className="space-y-6 animate-fade-in-up">

      <PageHeader
        title="Control Diario de Asistencias"
        titleBadge={
          <span className="text-[11px] font-medium font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 ml-2">En Vivo</span>
        }
        subtitle="Validación biométrica Kiosk QR, NFC y cotejo DNI"
        icon={UserCheck}
        iconVariant="emerald"
        actionButtons={
          <>
            {/* Control de Navegación Rápida de Fecha */}
            <div className="flex items-center bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-0.5 shadow-inner mr-1 transition-colors">
              <button 
                onClick={handlePrevWeek} 
                title="Semana anterior (-7 días)" 
                aria-label="Semana anterior" 
                className="p-1.5 text-surface-500 dark:text-surface-400 hover:text-surface-800 dark:hover:text-white rounded-lg hover:bg-surface-200/60 dark:hover:bg-white/[0.08] transition-colors" 
                type="button"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handlePrevDay} 
                title="Día anterior (-1 día)" 
                aria-label="Día anterior" 
                className="p-1.5 text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white rounded-lg hover:bg-surface-200/60 dark:hover:bg-white/[0.08] transition-colors" 
                type="button"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Selector interactivo con calendario emergente al clic */}
              <button
                type="button"
                onClick={() => dateInputRef.current?.showPicker?.()}
                className="relative flex items-center space-x-2 px-2.5 py-1 rounded-lg hover:bg-surface-200/50 dark:hover:bg-white/[0.08] cursor-pointer transition-colors group"
                title="Clic para abrir calendario y elegir cualquier fecha"
              >
                <span className="font-mono text-xs font-bold text-surface-900 dark:text-slate-200 tracking-wide select-none group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {format(parseISO(selectedDate), "dd / MM / yyyy")}
                </span>
                <Calendar className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform" />
                <input
                  ref={dateInputRef}
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) setSelectedDate(e.target.value);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  tabIndex={-1}
                />
              </button>

              <button 
                onClick={handleNextDay} 
                title="Día siguiente (+1 día)" 
                aria-label="Día siguiente" 
                className="p-1.5 text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white rounded-lg hover:bg-surface-200/60 dark:hover:bg-white/[0.08] transition-colors" 
                type="button"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button 
                onClick={handleNextWeek} 
                title="Semana siguiente (+7 días)" 
                aria-label="Semana siguiente" 
                className="p-1.5 text-surface-500 dark:text-surface-400 hover:text-surface-800 dark:hover:text-white rounded-lg hover:bg-surface-200/60 dark:hover:bg-white/[0.08] transition-colors" 
                type="button"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Menú de Atajos Rápidos */}
            <div className="relative" ref={presetsRef}>
              <Button
                onClick={() => setShowDatePresets(!showDatePresets)}
                variant="secondary"
                icon={<Clock className="w-3.5 h-3.5 text-primary-500" />}
              >
                <span className="hidden sm:inline">Saltar a</span>
                <ChevronDown className="w-3 h-3 text-surface-500 dark:text-surface-400 ml-1 inline-block" />
              </Button>
              {showDatePresets && (
                <div className="absolute right-0 sm:left-0 mt-1.5 w-52 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 backdrop-blur-md">
                  <div className="px-3 py-1 text-[10px] font-semibold text-surface-400 dark:text-slate-500 uppercase tracking-wider">
                    Saltos Rápidos
                  </div>
                  {quickDateJumps.map((jump) => {
                    const isCurrent = selectedDate === jump.value;
                    return (
                      <button
                        key={jump.label}
                        onClick={() => {
                          setSelectedDate(jump.value);
                          setShowDatePresets(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors ${
                          isCurrent 
                            ? "bg-primary-50 dark:bg-primary-500/15 text-primary-700 dark:text-primary-300 font-semibold" 
                            : "text-surface-700 dark:text-slate-300 hover:bg-surface-100 dark:hover:bg-white/[0.06] hover:text-surface-900 dark:hover:text-white"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span>{jump.label}</span>
                          <span className="text-[10px] text-surface-400 dark:text-slate-500 font-normal">{jump.sub}</span>
                        </div>
                        <span className="font-mono text-[10px] text-surface-500 dark:text-slate-400">
                          {format(parseISO(jump.value), "dd/MM")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <Button 
              onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))} 
              variant={isToday(parseISO(selectedDate)) ? "primary" : "secondary"}
            >
              Hoy
            </Button>
            <div className="relative">
              <Button 
                onClick={() => setShowAutomation(!showAutomation)} 
                variant="secondary"
                icon={<span className="w-2 h-2 rounded-full bg-primary-500 dark:bg-primary-400 animate-pulse" />}
              >
                <span className="hidden sm:inline">Tareas (SOD/EOD)</span>
                <ChevronDown className="w-3.5 h-3.5 text-surface-500 dark:text-surface-400 ml-1 inline-block" />
              </Button>
            </div>
            <Button 
              onClick={fetchAttendance} 
              aria-label="Actualizar registros" 
              variant="secondary"
              size="icon"
              isLoading={isLoading}
              icon={<RefreshCw className="w-4 h-4" />}
            />
            <ExportReportDropdown
              onExportExcel={handleExportExcel}
              onExportPdf={handleOpenPdfModal}
              onExportCsv={handleExportCsv}
              periodLabel={selectedDate}
              isLoadingPdf={isGeneratingPdf}
            />
          </>
        }
      />

      {/* Automation Command Center (Collapsible Card) */}
      {showAutomation && (
        <div className="glass-panel-glow rounded-xl p-5 shadow-xl space-y-4 animate-fade-in-up mt-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary-50 dark:bg-primary-500/15 border border-primary-200 dark:border-primary-500/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-surface-900 dark:text-white flex items-center gap-2">
                  Consola de Tareas y Cron Jobs{" "}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                    schedulerStatus?.online
                      ? "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-500/20"
                      : "bg-surface-100 dark:bg-slate-500/10 text-surface-600 dark:text-slate-400 border-surface-200 dark:border-slate-500/20"
                  }`}>
                    {schedulerStatus?.online ? "Scheduler Activo" : "Scheduler Standby"}
                  </span>
                </h2>
                <p className="text-xs text-surface-500 dark:text-slate-400">
                  Ejecuta manualmente las tareas de inicio (SOD), monitoreo y cierre de jornada (EOD).
                </p>
              </div>
            </div>
            {schedulerStatus && (
              <div className="flex items-center gap-4 text-xs text-surface-600 dark:text-slate-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <Activity className={`w-3.5 h-3.5 ${schedulerStatus.online ? "text-primary-500 dark:text-emerald-400" : "text-surface-400 dark:text-slate-500"}`} />
                  SOD: {schedulerStatus.sodCount || 0} | EOD: {schedulerStatus.eodCount || 0}
                </span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* SOD */}
            <div className="p-4 rounded-2xl bg-surface-50 dark:bg-black/30 border border-surface-200 dark:border-white/10 flex flex-col justify-between gap-3 hover:border-amber-500/30 transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                    <Sunrise className="w-4 h-4" />
                    <span>Apertura de Jornada (SOD)</span>
                  </div>
                  <span className="text-[10px] font-mono text-surface-500 dark:text-surface-400">00:01 AM</span>
                </div>
                <p className="text-xs text-surface-600 dark:text-slate-400 mt-1.5">
                  Crea los registros <span className="text-surface-900 dark:text-slate-300 font-semibold">PENDIENTE</span> para todos los colaboradores según su turno.
                </p>
              </div>
              <button
                onClick={() => triggerJob("daily-start")}
                disabled={isTriggeringJob !== null}
                className="w-full py-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isTriggeringJob === "daily-start" ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>Ejecutar Apertura ({selectedDate})</span>
              </button>
            </div>
            {/* LATE */}
            <div className="p-4 rounded-2xl bg-surface-50 dark:bg-black/30 border border-surface-200 dark:border-white/10 flex flex-col justify-between gap-3 hover:border-primary-500/30 transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary-600 dark:text-emerald-400 font-semibold text-xs">
                    <BellRing className="w-4 h-4" />
                    <span>Monitor de Tardanzas</span>
                  </div>
                  <span className="text-[10px] font-mono text-surface-500 dark:text-surface-400">Cada 15 min</span>
                </div>
                <p className="text-xs text-surface-600 dark:text-slate-400 mt-1.5">
                  Detecta personal sin marcar entrada (según tolerancia) y despacha <span className="text-primary-700 dark:text-emerald-300 font-semibold">Push a Supervisores</span>.
                </p>
              </div>
              <button
                onClick={() => triggerJob("check-late")}
                disabled={isTriggeringJob !== null}
                className="w-full py-2 px-3 rounded-xl bg-primary-50 dark:bg-emerald-500/15 hover:bg-primary-100 dark:hover:bg-emerald-500/25 text-primary-700 dark:text-emerald-300 border border-primary-200 dark:border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isTriggeringJob === "check-late" ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>Escanear Tardanzas Ahora</span>
              </button>
            </div>
            {/* EOD */}
            <div className="p-4 rounded-2xl bg-surface-50 dark:bg-black/30 border border-surface-200 dark:border-white/10 flex flex-col justify-between gap-3 hover:border-info-500/30 transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-info-600 dark:text-purple-400 font-semibold text-xs">
                    <Sunset className="w-4 h-4" />
                    <span>Cierre de Fin de Día (EOD)</span>
                  </div>
                  <span className="text-[10px] font-mono text-surface-500 dark:text-surface-400">10:00 AM (+1d)</span>
                </div>
                <p className="text-xs text-surface-600 dark:text-slate-400 mt-1.5">
                  Calcula horas trabajadas, marca <span className="text-danger-600 dark:text-rose-300 font-semibold">AUSENTE</span>, <span className="text-surface-700 dark:text-slate-300 font-semibold">INCOMPLETO</span> y tardanzas.
                </p>
              </div>
              <button
                onClick={() => triggerJob("daily-close")}
                disabled={isTriggeringJob !== null}
                className="w-full py-2 px-3 rounded-xl bg-info-50 dark:bg-purple-500/15 hover:bg-info-100 dark:hover:bg-purple-500/25 text-info-700 dark:text-purple-300 border border-info-200 dark:border-purple-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isTriggeringJob === "daily-close" ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>Ejecutar Cierre EOD ({selectedDate})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BEGIN: DailyMetricsKPIs */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-purpose="kpi-cards">
        <StatCard
          label="Total Esperados"
          value={summary.total}
          subLabel="Total Registrados"
          icon={Users}
          variant="emerald"
        />
        <StatCard
          label="Presentes"
          value={summary.present}
          subLabel={`${summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0}%`}
          icon={CheckCircle2}
          variant="emerald"
        />
        <StatCard
          label="Tardanzas"
          value={summary.late}
          subLabel={`${summary.total > 0 ? Math.round((summary.late / summary.total) * 100) : 0}% de incidencias`}
          icon={Clock}
          variant="amber"
        />
        <StatCard
          label="Ausentes"
          value={summary.absent}
          subLabel={`${summary.total > 0 ? Math.round((summary.absent / summary.total) * 100) : 0}%`}
          icon={XCircle}
          variant="rose"
        />
        <StatCard
          label="Abandono"
          value={summary.abandoned}
          subLabel={summary.abandoned > 0 ? 'Alerta Activa' : 'Sin Alertas'}
          icon={AlertTriangle}
          variant="rose"
        />
        <StatCard
          label="Justificados"
          value={summary.justified}
          subLabel="Aprobados"
          icon={BadgeCheck}
          variant="cyan"
        />
      </section>
      {/* END: DailyMetricsKPIs */}

      {/* BEGIN: OperationalBannerDNI */}
      {attendances.some(r => r.requiresManagerApproval || r.notes?.includes("[PENDIENTE_VALIDACION_DNI]")) && (() => {
        const pendingRecord = attendances.find(r => r.requiresManagerApproval || r.notes?.includes("[PENDIENTE_VALIDACION_DNI]"));
        return (
          <section className="glass-panel-glow rounded-xl p-3 border-warning-200 dark:border-warning-500/30 bg-gradient-to-r from-warning-50 dark:from-warning-500/10 via-surface-50 dark:via-surface-900/60 to-surface-100 dark:to-surface-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition-colors" data-purpose="dni-validation-alert">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-warning-100 dark:bg-warning-500/20 border border-warning-300 dark:border-warning-500/40 flex items-center justify-center text-warning-600 dark:text-warning-400 flex-shrink-0 animate-bounce">
                <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-warning-700 dark:text-warning-300">Revisión de Seguridad: 1 Marcación Manual con DNI</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-warning-100 dark:bg-warning-400/20 text-warning-700 dark:text-warning-200 border border-warning-300 dark:border-warning-400/30">Sin Fotocheck NFC</span>
                </div>
                <p className="text-[11px] text-surface-700 dark:text-slate-300">
                  Colaborador: <strong className="text-surface-900 dark:text-white">{pendingRecord?.user.firstName} {pendingRecord?.user.lastName}</strong> ({pendingRecord?.user.role}) ingresó por teclado en <span className="font-mono text-surface-800 dark:text-slate-200">{pendingRecord?.kiosk?.name || 'Kiosk'}</span> a las {pendingRecord?.entryTime ? format(new Date(pendingRecord.entryTime), "hh:mm a") : ''}.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 self-end md:self-center">
              <button className="px-2.5 py-1 rounded-lg bg-surface-200 dark:bg-white/[0.06] hover:bg-surface-300 dark:hover:bg-white/[0.1] text-xs font-medium text-surface-800 dark:text-slate-200 border border-surface-300 dark:border-white/[0.1] transition-colors flex items-center space-x-1.5" type="button">
                <svg aria-hidden="true" className="w-3.5 h-3.5 text-surface-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                <span>Ver Foto Kiosk</span>
              </button>
              <button onClick={() => pendingRecord && handleVerifyDni(pendingRecord.id, "APPROVE", `${pendingRecord.user.firstName} ${pendingRecord.user.lastName}`)} className="px-3 py-1 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold transition-all shadow-md shadow-primary-500/20 flex items-center space-x-1.5" type="button">
                <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                <span>Aprobar Asistencia</span>
              </button>
            </div>
          </section>
        );
      })()}
      {/* END: OperationalBannerDNI */}

      {/* BEGIN: FilterAndSearchToolbar */}
      <FilterToolbar 
        searchQuery={search}
        onSearchChange={setSearch}
        onSearchSubmit={fetchAttendance}
        searchPlaceholder="Buscar colaborador, documento o UID de pulsera NFC (Presiona Enter)..."
        onReset={() => {
          setSearch("");
          setSelectedStatus("ALL");
          setSelectedLocation("ALL");
          setSelectedDepartment("ALL");
        }}
        filters={[
          {
            id: "status",
            value: selectedStatus,
            onChange: setSelectedStatus,
            options: [
              { value: "ALL", label: "Todos los estados" },
              { value: AttendanceStatus.PRESENTE, label: "Presente (Puntual)" },
              { value: AttendanceStatus.TARDE, label: "Tardanza" },
              { value: AttendanceStatus.ABANDONO_PUESTO, label: "Abandono de Puesto" },
              { value: AttendanceStatus.AUSENTE, label: "Ausente" },
              { value: AttendanceStatus.JUSTIFICADO, label: "Justificado / Permiso" },
              { value: AttendanceStatus.PENDIENTE, label: "Pendiente" },
            ]
          },
          {
            id: "location",
            icon: Building,
            value: selectedLocation,
            onChange: setSelectedLocation,
            options: [
              { value: "ALL", label: "Todas las sedes" },
              ...locations.map(l => ({ value: l.id, label: l.name }))
            ]
          },
          {
            id: "department",
            icon: FolderTree,
            value: selectedDepartment,
            onChange: setSelectedDepartment,
            options: [
              { value: "ALL", label: "Todos los departamentos" },
              ...departments.map(d => ({ value: d.id, label: d.name }))
            ]
          }
        ]}
      />
      {attendances.some(r => r.requiresManagerApproval || r.notes?.includes("[PENDIENTE_VALIDACION_DNI]")) && (
        <div className="flex justify-end mt-2">
          <button className="px-2.5 py-2 rounded-lg bg-warning-50 dark:bg-warning-500/10 border border-warning-200 dark:border-warning-500/30 hover:bg-warning-100 dark:hover:bg-warning-500/20 text-warning-700 dark:text-warning-300 text-xs font-semibold transition-all flex items-center space-x-1.5" type="button">
            <span className="w-2 h-2 rounded-full bg-warning-500 dark:bg-warning-400 animate-ping"></span>
            <span>DNI por Validar</span>
            <span className="ml-1 px-1.5 py-0.2 bg-warning-200 dark:bg-warning-500/30 text-warning-800 dark:text-warning-200 rounded-full font-mono text-[10px]">{attendances.filter(r => r.requiresManagerApproval || r.notes?.includes("[PENDIENTE_VALIDACION_DNI]")).length}</span>
          </button>
        </div>
      )}
      {/* END: FilterAndSearchToolbar */}

      {/* BEGIN: AttendanceDataGrid */}
      <DataTableContainer
        mobileContent={
          <MobileAttendanceContent
            isLoading={isLoading}
            totalCount={attendances.length}
            paginatedAttendances={paginatedAttendances}
            rowHandlers={rowHandlers}
          />
        }
        footer={
          <DataTablePagination
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 25, 50, 100]}
            itemLabel="registros de dotación"
          />
        }
      >
        <DataTableHeader>
          <DataTableHead>Colaborador / DNI / Rol</DataTableHead>
          <DataTableHead>Sede & Dispositivo</DataTableHead>
          <DataTableHead>Entrada (Marcación)</DataTableHead>
          <DataTableHead>Salida (Marcación / Prog.)</DataTableHead>
          <DataTableHead>Estado Operativo</DataTableHead>
          <DataTableHead>Notas y Auditoría</DataTableHead>
          <DataTableHead className="text-right">Acciones</DataTableHead>
        </DataTableHeader>
        <DataTableBody>
          <DesktopAttendanceRows
            isLoading={isLoading}
            totalCount={attendances.length}
            paginatedAttendances={paginatedAttendances}
            rowHandlers={rowHandlers}
          />
        </DataTableBody>
      </DataTableContainer>
      {/* END: AttendanceDataGrid */}

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
              className="bg-emerald-500 hover:bg-emerald-400 w-full py-2.5 rounded-xl text-slate-950 font-semibold text-xs shadow-lg transition-colors"
            >
              Entendido
            </button>
          }
        >
          <div className="divide-y divide-surface-200 dark:divide-white/5 rounded-2xl bg-surface-100 dark:bg-black/40 border border-surface-200 dark:border-white/5 p-3 text-xs">
            {Object.entries(jobResultModal.details).map(([key, val]) => (
              <div key={key} className="py-2.5 flex justify-between items-center">
                <span className="text-surface-600 dark:text-slate-400">{key}:</span>
                <span className="font-semibold text-surface-900 dark:text-white font-mono">{String(val)}</span>
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
          toast.success("Asistencia justificada correctamente");
          void fetchAttendance();
        }}
      />

      <EditAttendanceModal
        isOpen={!!selectedForEdit}
        onClose={() => setSelectedForEdit(null)}
        attendance={selectedForEdit}
        onSuccess={() => {
          toast.success("Registro actualizado correctamente");
          void fetchAttendance();
        }}
      />

      <EmployeeProfileModal
        isOpen={!!selectedForProfile}
        onClose={() => setSelectedForProfile(null)}
        record={selectedForProfile}
      />

      {/* PDF Report Modal */}
      <PdfReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        reportData={pdfReportData}
      />
    </div>
  );
}
