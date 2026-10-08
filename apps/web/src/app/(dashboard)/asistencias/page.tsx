"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Calendar,
  CalendarDays,
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
  ChevronsLeft,
  ChevronsRight,
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
  ChevronDown,
  Eye,
  X,
  MoreVertical,
  Copy,
  User,
  FolderTree,
} from "lucide-react";
import { AttendanceStatus } from "@asistencias/db";
import { format, addDays, subDays, isToday, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { JustifyModal } from "@/components/attendance/JustifyModal";
import { EditAttendanceModal } from "@/components/attendance/EditAttendanceModal";
import { EmployeeProfileModal } from "@/components/attendance/EmployeeProfileModal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/providers/ToastProvider";
import { ExportReportDropdown } from "@/components/reports/ExportReportDropdown";
import { PdfReportModal } from "@/components/reports/PdfReportModal";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModalShell } from "@/components/ui/ModalShell";
import { SkeletonTable } from "@/components/ui/Skeleton";
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
import { ActionButton, ActionButtonGroup } from "@/components/ui/ActionButton";
import { RowActionMenu } from "@/components/ui/RowActionMenu";
import { Button } from "@/components/ui/Button";

interface AttendanceRecord {
  id: string;
  date: string;
  entryTime?: string | null;
  exitTime?: string | null;
  entryTime2?: string | null;
  exitTime2?: string | null;
  entryMethod?: string | null;
  exitMethod?: string | null;
  requiresManagerApproval?: boolean;
  approvalReason?: string | null;
  status: AttendanceStatus;
  workedMinutes?: number | null;
  lateMinutes?: number | null;
  lateMinutes2?: number | null;
  notes?: string | null;
  statusChangedBy?: string | null;
  statusChangedAt?: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    documentId?: string | null;
    role: string;
    department?: {
      id: string;
      name: string;
    } | null;
    userSchedules?: Array<{
      schedule: {
        id: string;
        name: string;
        entryHour: number;
        entryMinute: number;
        exitHour: number;
        exitMinute: number;
        isSplit?: boolean;
        entryHour2?: number | null;
        entryMinute2?: number | null;
        exitHour2?: number | null;
        exitMinute2?: number | null;
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
  const router = useRouter();
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
  const [selectedForJustify, setSelectedForJustify] = useState<any | null>(null);
  const [selectedForEdit, setSelectedForEdit] = useState<any | null>(null);
  const [selectedForProfile, setSelectedForProfile] = useState<any | null>(null);
  const { toast } = useToast();

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, selectedStatus, selectedLocation, selectedDepartment, search]);

  const totalItems = attendances.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedAttendances = useMemo(() => {
    return attendances.slice(startIndex, endIndex);
  }, [attendances, startIndex, endIndex]);

  // Automation Panel State
  const [showAutomation, setShowAutomation] = useState(false);

  // PDF Report modal state
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfReportData, setPdfReportData] = useState<any>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isTriggeringJob, setIsTriggeringJob] = useState<string | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<any | null>(null);
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
      if (selectedDepartment !== "ALL") params.append("departmentId", selectedDepartment);
      if (search) params.append("search", search);

      const res = await fetch(`/api/attendance?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      if (data && data.attendances) {
        setAttendances(data.attendances);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err) {
      console.error("Error fetching attendances:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocationsAndDepartments();
    fetchSchedulerStatus();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, selectedStatus, selectedLocation, selectedDepartment]);

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

  const handleExportExcel = () => {
    window.open(
      `/api/reports/export?startDate=${selectedDate}&endDate=${selectedDate}&format=xlsx`,
      "_blank"
    );
  };

  const handleExportCsv = () => {
    window.open(
      `/api/reports/export?startDate=${selectedDate}&endDate=${selectedDate}&format=csv`,
      "_blank"
    );
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
        fetchAttendance();
      } else {
        toast.error(data.error || "Error al verificar DNI");
      }
    } catch (err) {
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

      fetchAttendance();
      fetchSchedulerStatus();
    } catch (err: any) {
      toast.error("Fallo al conectar con el servidor de tareas");
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
    });
  };

  const getRecordSmartMenuItems = (record: AttendanceRecord, isMobile = false) => {
    const isPendingDni = record.requiresManagerApproval || record.notes?.includes("[PENDIENTE_VALIDACION_DNI]");
    const canJustify = record.status === 'TARDE' || record.status === 'AUSENTE' || record.status === 'INCOMPLETO' || record.status === 'ABANDONO_PUESTO';
    const isAlreadyJustified = record.status === 'JUSTIFICADO' || record.status === 'PERMISO';
    const smartMenuItems: any[] = [];

    // Acciones de DNI (en móvil van al menú; en desktop ya tienen botones directos)
    if (isPendingDni && isMobile) {
      smartMenuItems.push({
        label: "Aprobar marcación DNI",
        icon: <Check className="w-3.5 h-3.5 text-emerald-500" />,
        onClick: () => handleVerifyDni(record.id, "APPROVE", record.user.firstName),
      });
      smartMenuItems.push({
        label: "Rechazar marcación DNI",
        icon: <X className="w-3.5 h-3.5 text-danger-500" />,
        variant: "danger",
        onClick: () => handleVerifyDni(record.id, "REJECT", record.user.firstName),
      });
    }

    // Justificaciones e Incidencias
    if (canJustify) {
      // En desktop, si es TARDE, ya tiene el botón directo "Justificar Tardanza".
      // Para AUSENTE, INCOMPLETO o en vista móvil, se mantiene la opción en el menú.
      const isDirectButtonOnDesktop = !isMobile && record.status === 'TARDE';
      if (isMobile || !isDirectButtonOnDesktop) {
        smartMenuItems.push({
          label: record.status === 'TARDE'
            ? "Justificar tardanza"
            : record.status === 'AUSENTE'
            ? "Justificar inasistencia"
            : "Justificar incidencia",
          icon: <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />,
          onClick: () => openJustificationModal(record),
        });
      }
    } else if (isAlreadyJustified) {
      // En desktop ya existe el botón directo "Ver Justificación / Sustento".
      // En móvil se incluye en el menú para no perder la acción.
      if (isMobile) {
        smartMenuItems.push({
          label: "Ver justificación registrada",
          icon: <Eye className="w-3.5 h-3.5 text-sky-500" />,
          onClick: () => openJustificationModal(record),
        });
      }
    }

    // Ajustar horas / estado
    // En desktop, si el botón directo ya es "Ajustar registro", no se duplica en el menú.
    // Si el registro tenía otro botón directo (TARDE, JUSTIFICADO, etc.), sí se ofrece en el menú.
    const isDirectEditOnDesktop = !isMobile && (record.status !== 'TARDE' && record.status !== 'JUSTIFICADO' && record.status !== 'PERMISO' && record.status !== 'ABANDONO_PUESTO' && !isPendingDni);
    if (isMobile || !isDirectEditOnDesktop) {
      smartMenuItems.push({
        label: "Ajustar horas / estado",
        icon: <Edit3 className="w-3.5 h-3.5 text-amber-500" />,
        onClick: () => setSelectedForEdit({
          id: record.id,
          userName: `${record.user.firstName} ${record.user.lastName}`,
          date: typeof record.date === 'string' ? record.date.slice(0, 10) : format(new Date(record.date), 'yyyy-MM-dd'),
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

    smartMenuItems.push({
      label: `Copiar DNI (${record.user.documentId || "Sin DNI"})`,
      icon: <Copy className="w-3.5 h-3.5 text-surface-500 dark:text-slate-400" />,
      disabled: !record.user.documentId,
      divider: true,
      onClick: () => {
        if (record.user.documentId) {
          navigator.clipboard.writeText(record.user.documentId);
          toast.success(`DNI ${record.user.documentId} copiado`);
        }
      },
    });

    smartMenuItems.push({
      label: "Ver ficha del colaborador",
      icon: <User className="w-3.5 h-3.5 text-emerald-500" />,
      onClick: () => {
        setSelectedForProfile(record);
      },
    });

    return smartMenuItems;
  };

  return (
    <div className="space-y-6 animate-fade-in-up">

      <PageHeader
        title="Control Diario de Asistencias"
        titleBadge={
          <span className="text-[11px] font-medium font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-2">En Vivo</span>
        }
        subtitle="Validación biométrica Kiosk QR, NFC y cotejo DNI"
        icon={ClipboardList}
        iconVariant="emerald"
        actionButtons={
          <>
            {/* Control de Navegación Rápida de Fecha */}
            <div className="flex items-center bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-0.5 shadow-inner mr-1 transition-colors">
              <button 
                onClick={handlePrevWeek} 
                title="Semana anterior (-7 días)" 
                aria-label="Semana anterior" 
                className="p-1.5 text-surface-400 hover:text-surface-800 dark:hover:text-white rounded-lg hover:bg-surface-200/60 dark:hover:bg-white/[0.08] transition-colors" 
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
              <div 
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
              </div>

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
                className="p-1.5 text-surface-400 hover:text-surface-800 dark:hover:text-white rounded-lg hover:bg-surface-200/60 dark:hover:bg-white/[0.08] transition-colors" 
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
                <ChevronDown className="w-3 h-3 text-surface-400 ml-1 inline-block" />
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-surface-900 dark:text-white flex items-center gap-2">
                  Consola de Tareas y Cron Jobs
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
                  <span className="text-[10px] font-mono text-surface-500">06:00 AM</span>
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
                  <span className="text-[10px] font-mono text-surface-500">Cada 15 min</span>
                </div>
                <p className="text-xs text-surface-600 dark:text-slate-400 mt-1.5">
                  Detecta personal sin marcar entrada (+30 min) y despacha <span className="text-primary-700 dark:text-emerald-300 font-semibold">Push a Supervisores</span>.
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
                  <span className="text-[10px] font-mono text-surface-500">23:59 PM</span>
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
          icon={ClipboardList}
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
          icon={ShieldCheck}
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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
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
                <svg className="w-3.5 h-3.5 text-surface-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                <span>Ver Foto Kiosk</span>
              </button>
              <button onClick={() => pendingRecord && handleVerifyDni(pendingRecord.id, "APPROVE", `${pendingRecord.user.firstName} ${pendingRecord.user.lastName}`)} className="px-3 py-1 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold transition-all shadow-md shadow-primary-500/20 flex items-center space-x-1.5" type="button">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
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
          isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 animate-pulse space-y-3">
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
          ) : attendances.length === 0 ? (
            <div className="p-8 text-center text-surface-500 text-xs">
              Sin registros para esta fecha. No se encontraron marcaciones con los filtros seleccionados.
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedAttendances.map((record) => {
                const smartMenuItems = getRecordSmartMenuItems(record, true);
                const isPendingDni = record.requiresManagerApproval || record.notes?.includes("[PENDIENTE_VALIDACION_DNI]");
                const entryFormatted = record.entryTime ? format(new Date(record.entryTime), "hh:mm a") : "-";
                const exitFormatted = record.exitTime ? format(new Date(record.exitTime), "hh:mm a") : null;

                return (
                  <div
                    key={`mobile-${record.id}`}
                    className={`p-4 rounded-2xl border bg-white dark:bg-surface-900 shadow-xs transition-all space-y-3 ${
                      isPendingDni
                        ? "border-warning-300 dark:border-warning-500/40 bg-warning-50/20 dark:bg-warning-500/[0.04]"
                        : record.status === "ABANDONO_PUESTO"
                        ? "border-danger-300 dark:border-danger-500/40 bg-danger-50/20 dark:bg-danger-500/[0.03]"
                        : "border-surface-200 dark:border-surface-800"
                    }`}
                  >
                    {/* Header: Colaborador y Estado */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <button
                          onClick={() => setSelectedForProfile(record)}
                          className="font-bold text-sm text-surface-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 text-left truncate cursor-pointer block w-full"
                        >
                          {record.user.firstName} {record.user.lastName}
                        </button>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-surface-500 dark:text-surface-400">
                          <span>{record.user.role}</span>
                          {record.user.documentId && (
                            <>
                              <span>•</span>
                              <span className="font-mono">DNI: {record.user.documentId}</span>
                            </>
                          )}
                        </div>
                        {record.user.department?.name && (
                          <span className="inline-block mt-1 text-[11px] font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-500/10 px-1.5 py-0.5 rounded border border-primary-200 dark:border-primary-500/20">
                            {record.user.department.name}
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <StatusBadge status={record.status} />
                        <RowActionMenu items={smartMenuItems} />
                      </div>
                    </div>

                    {/* Grilla de Tiempos */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-100 dark:border-surface-800/80 text-xs">
                      <div className="p-2.5 rounded-xl bg-surface-50 dark:bg-surface-950 border border-surface-200/60 dark:border-surface-800/60">
                        <span className="text-[10px] uppercase font-bold text-surface-400">Entrada</span>
                        <div className="font-bold text-surface-900 dark:text-white mt-0.5 font-mono">
                          {entryFormatted}
                        </div>
                        {record.lateMinutes && record.lateMinutes > 0 ? (
                          <span className="text-[10px] text-warning-600 dark:text-warning-400 font-semibold font-mono block">
                            +{record.lateMinutes}m tardanza
                          </span>
                        ) : null}
                      </div>

                      <div className="p-2.5 rounded-xl bg-surface-50 dark:bg-surface-950 border border-surface-200/60 dark:border-surface-800/60">
                        <span className="text-[10px] uppercase font-bold text-surface-400">Salida</span>
                        <div className="font-bold text-surface-900 dark:text-white mt-0.5 font-mono">
                          {exitFormatted || "—"}
                        </div>
                        {record.workedMinutes && record.workedMinutes > 0 ? (
                          <span className="text-[10px] text-surface-500 dark:text-surface-400 font-mono block">
                            {Math.floor(record.workedMinutes / 60)}h {record.workedMinutes % 60}m
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Sede y Kiosk */}
                    <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400 pt-0.5">
                      <span className="truncate">
                        📍 {record.location?.name || (record as any).kiosk?.location?.name || "Sede Principal"}
                      </span>
                      {record.kiosk?.name && (
                        <span className="text-[10px] font-mono shrink-0 text-surface-400">
                          {record.kiosk.name}
                        </span>
                      )}
                    </div>

                    {/* Acciones directas para anomalía de DNI */}
                    {isPendingDni && (
                      <div className="p-2.5 rounded-xl bg-warning-100/60 dark:bg-warning-500/15 border border-warning-300 dark:border-warning-500/30 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-warning-800 dark:text-warning-300">
                          ⚠️ Requiere validación DNI
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleVerifyDni(record.id, "REJECT", record.user.firstName)}
                            className="p-1.5 rounded-lg bg-danger-50 text-danger-700 hover:bg-danger-100 dark:bg-danger-500/20 dark:text-danger-300 text-xs font-bold"
                            title="Rechazar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleVerifyDni(record.id, "APPROVE", record.user.firstName)}
                            className="px-2.5 py-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 text-xs font-bold flex items-center gap-1 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Aprobar</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
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
              {isLoading ? (
                <DataTableRow>
                  <DataTableCell colSpan={7} align="center" className="p-8 text-slate-500">Cargando registros de asistencias...</DataTableCell>
                </DataTableRow>
              ) : attendances.length === 0 ? (
                <DataTableEmptyState
                  colSpan={7}
                  message="Sin registros para esta fecha. No se encontraron marcaciones que coincidan con la fecha o filtros seleccionados."
                />
              ) : (
                paginatedAttendances.map((record) => {
                  const hasShift2 = Boolean(record.entryTime2 || record.exitTime2);
                  const isSplitSchedule = Boolean(record.user?.userSchedules?.[0]?.schedule?.isSplit);

                  const sched = record.user?.userSchedules?.[0]?.schedule;
                  const schedExitHour = sched?.exitHour ?? 17;
                  const schedExitMin = sched?.exitMinute ?? 0;
                  const schedExitFormatted = `${String(schedExitHour % 12 || 12).padStart(2, '0')}:${String(schedExitMin).padStart(2, '0')} ${schedExitHour >= 12 ? 'PM' : 'AM'}`;

                  const schedExitHour2 = sched?.exitHour2 ?? 21;
                  const schedExitMin2 = sched?.exitMinute2 ?? 0;
                  const schedExit2Formatted = `${String(schedExitHour2 % 12 || 12).padStart(2, '0')}:${String(schedExitMin2).padStart(2, '0')} ${schedExitHour2 >= 12 ? 'PM' : 'AM'}`;

                  const recordDateStr = typeof record.date === 'string'
                    ? record.date.slice(0, 10)
                    : format(new Date(record.date), 'yyyy-MM-dd');
                  const todayStr = format(new Date(), 'yyyy-MM-dd');
                  const isPastDate = recordDateStr < todayStr;
                  const isTodayDate = recordDateStr === todayStr;

                  const entryFormatted = record.entryTime
                    ? format(new Date(record.entryTime), "hh:mm a")
                    : "-";
                  const exitFormatted = record.exitTime
                    ? format(new Date(record.exitTime), "hh:mm a")
                    : null;

                  const isPendingDni = record.requiresManagerApproval || record.notes?.includes("[PENDIENTE_VALIDACION_DNI]");
                  
                  const canJustify = record.status === 'TARDE' || record.status === 'AUSENTE' || record.status === 'INCOMPLETO' || record.status === 'ABANDONO_PUESTO';
                  const isAlreadyJustified = record.status === 'JUSTIFICADO' || record.status === 'PERMISO';

                  const smartMenuItems = getRecordSmartMenuItems(record, false);

                  return (
                    <DataTableRow 
                      key={record.id} 
                      className={isPendingDni ? "bg-warning-50/50 dark:bg-warning-500/[0.04] hover:bg-warning-100/50 dark:hover:bg-warning-500/[0.07] border-l-2 border-l-warning-500 dark:border-l-warning-400" : record.status === 'ABANDONO_PUESTO' ? "bg-danger-50/50 dark:bg-danger-500/[0.03] hover:bg-danger-100/50 dark:hover:bg-danger-500/[0.06]" : undefined}
                    >
                      <DataTableCell>
                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            onClick={() => setSelectedForProfile(record)}
                            title="Ver ficha del colaborador e incidencias"
                            className={`w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-xs font-mono shadow-sm cursor-pointer transition-transform hover:scale-105 ${isPendingDni ? 'bg-gradient-to-tr from-warning-600 to-warning-400' : record.status === 'ABANDONO_PUESTO' ? 'bg-gradient-to-tr from-danger-600 to-danger-500' : 'bg-gradient-to-tr from-primary-600 to-primary-500'}`}
                          >
                            {record.user.firstName.charAt(0)}{record.user.lastName.charAt(0)}
                          </button>
                          <div>
                            <div className="font-bold text-surface-900 dark:text-white flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => setSelectedForProfile(record)}
                                title="Ver ficha del colaborador e incidencias"
                                className="hover:text-primary-600 dark:hover:text-primary-400 hover:underline transition-colors text-left cursor-pointer"
                              >
                                {record.user.firstName} {record.user.lastName}
                              </button>
                              {isSplitSchedule && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-info-100 dark:bg-info-500/20 text-info-700 dark:text-info-300 border border-info-200 dark:border-info-500/30">Partido (2 Tramos)</span>
                              )}
                            </div>
                            <div className="text-[11px] text-surface-500 dark:text-slate-400 font-mono flex items-center space-x-1.5 flex-wrap">
                              <span>DNI {record.user.documentId || "—"}</span>
                              <span>•</span>
                              <span className="text-surface-700 dark:text-slate-300 truncate max-w-[150px]">{record.user.role}</span>
                              {record.user.department?.name && (
                                <>
                                  <span>•</span>
                                  <span className="text-primary-600 dark:text-emerald-400 font-sans font-medium">{record.user.department.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </DataTableCell>
                      <DataTableCell>
                        <div className="text-surface-800 dark:text-slate-200 font-medium truncate max-w-[150px]">{record.location?.name || "Miraflores Central"}</div>
                        <div className={`text-[11px] font-mono flex items-center space-x-1 ${isPendingDni ? 'text-warning-600 dark:text-warning-400' : 'text-surface-500 dark:text-slate-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isPendingDni ? 'bg-warning-500 dark:bg-warning-400' : record.status === 'ABANDONO_PUESTO' ? 'bg-danger-500 dark:bg-danger-400' : 'bg-primary-500 dark:bg-primary-400'}`}></span>
                          <span className="truncate max-w-[120px]">{record.kiosk?.name || "Tótem Lobby #01"}</span>
                        </div>
                      </DataTableCell>
                      <DataTableCell>
                        <div className={`font-mono font-bold ${isPendingDni ? 'text-warning-700 dark:text-warning-300' : record.lateMinutes ? 'text-warning-600 dark:text-warning-400' : 'text-primary-600 dark:text-primary-400'}`}>{entryFormatted}</div>
                        <div className={`inline-flex items-center space-x-1 text-[10px] px-1.5 py-0.5 rounded border font-medium ${isPendingDni ? 'text-warning-700 dark:text-warning-300 bg-warning-100 dark:bg-warning-500/15 border-warning-300 dark:border-warning-500/30' : record.lateMinutes ? 'text-warning-700 dark:text-warning-300 bg-warning-50 dark:bg-warning-500/10 border-warning-200 dark:border-warning-500/20' : 'text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/20'}`}>
                          {record.entryMethod === "PIN" || isPendingDni ? (
                            <span>Manual DNI{record.lateMinutes ? ` • +${record.lateMinutes}m` : ''}</span>
                          ) : (
                            <>
                              {!record.lateMinutes && <svg className="w-2.5 h-2.5 text-primary-500 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>}
                              <span>{record.lateMinutes ? `+${record.lateMinutes} min tarde • Pulsera NFC` : 'Puntual • QR Dinámico'}</span>
                            </>
                          )}
                        </div>
                      </DataTableCell>
                      <DataTableCell className="font-mono text-surface-700 dark:text-slate-300">
                        {isSplitSchedule ? (
                          <>
                            <div>T1: {record.exitTime ? format(new Date(record.exitTime), "hh:mm a") : schedExitFormatted}</div>
                            <div className="text-[10px] text-surface-500 dark:text-slate-500">
                              T2: {record.exitTime2 ? format(new Date(record.exitTime2), "hh:mm a") : (isTodayDate ? `T2 en curso (${schedExit2Formatted})` : `Prog: ${schedExit2Formatted}`)}
                            </div>
                          </>
                        ) : record.status === 'ABANDONO_PUESTO' ? (
                          <>
                            <div className="font-bold text-danger-600 dark:text-danger-400">Salida No Marcada</div>
                            <div className="text-[10px] text-danger-500 dark:text-danger-300 font-sans">
                              {record.entryTime ? "Ausente tras ingreso" : "Ausente"}
                            </div>
                          </>
                        ) : record.status === 'AUSENTE' ? (
                          <>
                            <div className="text-surface-400 dark:text-slate-500">-</div>
                            <div className="text-[10px] text-surface-400 dark:text-slate-500 font-sans">No asistió</div>
                          </>
                        ) : record.status === 'JUSTIFICADO' || record.status === 'PERMISO' ? (
                          <>
                            <div className="text-surface-400 dark:text-slate-500">-</div>
                            <div className="text-[10px] text-info-600 dark:text-info-400 font-sans">Justificado</div>
                          </>
                        ) : exitFormatted ? (
                          <>
                            <div className="font-bold text-surface-900 dark:text-white">{exitFormatted}</div>
                            <div className="text-[10px] text-surface-500 dark:text-slate-400 font-sans">
                              {record.lateMinutes && record.lateMinutes > 0
                                ? `Compensa ${record.lateMinutes} min`
                                : record.workedMinutes
                                ? `${Math.floor(record.workedMinutes / 60)}h ${record.workedMinutes % 60}m trab. • Prog: ${schedExitFormatted}`
                                : `Jornada finalizada • Prog: ${schedExitFormatted}`}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-surface-600 dark:text-slate-300">Prog: {schedExitFormatted}</div>
                            {isTodayDate ? (
                              <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span>Turno en curso</span>
                              </span>
                            ) : isPastDate ? (
                              <span className="block text-[10px] text-warning-600 dark:text-warning-400 font-sans font-medium">
                                Sin marcación de salida
                              </span>
                            ) : (
                              <span className="block text-[10px] text-surface-400 dark:text-slate-500 font-sans">
                                Programada
                              </span>
                            )}
                          </>
                        )}
                      </DataTableCell>
                      <DataTableCell>
                        {isPendingDni ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-warning-100 dark:bg-warning-500/20 text-warning-700 dark:text-warning-300 border border-warning-300 dark:border-warning-500/40 badge-glow-amber animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-warning-500 dark:bg-warning-400"></span>
                            <span>VALIDAR DNI</span>
                          </span>
                        ) : record.status === 'ABANDONO_PUESTO' ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-danger-50 dark:bg-danger-500/20 text-danger-700 dark:text-danger-300 border border-danger-200 dark:border-danger-500/40 badge-glow-rose">
                            <span className="w-1.5 h-1.5 rounded-full bg-danger-500 dark:bg-danger-400 animate-ping"></span>
                            <span>ABANDONO</span>
                          </span>
                        ) : record.status === 'TARDE' ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-warning-50 dark:bg-warning-500/15 text-warning-700 dark:text-warning-300 border border-warning-200 dark:border-warning-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-warning-500 dark:bg-warning-400"></span>
                            <span>TARDANZA</span>
                          </span>
                        ) : record.status === 'JUSTIFICADO' || record.status === 'PERMISO' ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-info-50 dark:bg-info-500/15 text-info-700 dark:text-info-300 border border-info-200 dark:border-info-500/30">
                            <svg className="w-3 h-3 text-info-600 dark:text-info-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                            <span>JUSTIFICADO</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary-50 dark:bg-primary-500/15 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-500/30 badge-glow-primary">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 dark:bg-primary-400 animate-pulse"></span>
                            <span>PRESENTE</span>
                          </span>
                        )}
                      </DataTableCell>
                      <DataTableCell>
                        {isPendingDni ? (
                          <>
                            <div className="text-[11px] text-warning-700 dark:text-warning-200 font-medium">Marcó DNI por olvido de tarjeta</div>
                            <div className="text-[10px] text-surface-500 dark:text-slate-400">Captura fotográfica disponible en Kiosk</div>
                          </>
                        ) : record.status === 'TARDE' ? (
                          <>
                            <div className="text-[11px] text-surface-700 dark:text-slate-300 font-medium">Alerta enviada a Jefatura de Turno</div>
                            <div className="text-[10px] text-surface-500 dark:text-slate-500">Registrado en el reporte de asistencia</div>
                          </>
                        ) : record.status === 'ABANDONO_PUESTO' ? (
                          <>
                            <div className="text-[11px] text-danger-700 dark:text-danger-300 font-semibold">Geocerca violada ({">"}180 min sin retorno)</div>
                            <div className="text-[10px] text-surface-500 dark:text-slate-400">Notificación levantada a RRHH</div>
                          </>
                        ) : record.status === 'JUSTIFICADO' ? (
                          <>
                            <div className="text-[11px] text-surface-700 dark:text-slate-300 font-mono">CITT ESSALUD #48920-26</div>
                            <div className="text-[10px] text-info-600 dark:text-info-400">Subsidio cubierto por empleador</div>
                          </>
                        ) : (
                          <>
                            <div className="text-[11px] text-surface-700 dark:text-slate-300 flex items-center space-x-1 font-mono">
                              <svg className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                              <span>HSM SHA-256 Validado</span>
                            </div>
                            {(record as any).exceededTolerance ? (
                               <div className="text-[10px] text-danger-500 font-medium">Límite de tolerancia excedido (semanal)</div>
                            ) : (record as any).usedTolerance ? (
                               <div className="text-[10px] text-warning-600 dark:text-warning-400 font-medium">Tolerancia usada (llegó en rango)</div>
                            ) : (
                               <div className="text-[10px] text-surface-500 dark:text-slate-500">Puntual sin usar tolerancia</div>
                            )}
                          </>
                        )}
                      </DataTableCell>
                      <DataTableCell align="right">
                        <ActionButtonGroup align="right">
                          {isPendingDni ? (
                            <>
                              <ActionButton
                                size="sm"
                                variant="success"
                                icon={<Check className="w-3.5 h-3.5" />}
                                title="Aprobar Asistencia"
                                onClick={() => handleVerifyDni(record.id, "APPROVE", record.user.firstName)}
                              />
                              <ActionButton
                                size="sm"
                                variant="danger"
                                icon={<X className="w-3.5 h-3.5" />}
                                title="Rechazar y marcar Inasistencia"
                                onClick={() => handleVerifyDni(record.id, "REJECT", record.user.firstName)}
                              />
                            </>
                          ) : record.status === 'ABANDONO_PUESTO' ? (
                            <ActionButton
                              size="sm"
                              variant="danger"
                              icon={<AlertTriangle className="w-3.5 h-3.5" />}
                              title="Levantar Acta Disciplinaria"
                            >
                              Levantar Acta
                            </ActionButton>
                          ) : record.status === 'TARDE' ? (
                            <ActionButton
                              size="sm"
                              variant="info"
                              icon={<ShieldCheck className="w-3.5 h-3.5" />}
                              title="Justificar Tardanza"
                              onClick={() => openJustificationModal(record)}
                            />
                          ) : record.status === 'JUSTIFICADO' || record.status === 'PERMISO' ? (
                            <ActionButton
                              size="sm"
                              variant="info"
                              icon={<Eye className="w-3.5 h-3.5" />}
                              title="Ver Justificación / Sustento"
                              onClick={() => openJustificationModal(record)}
                            />
                          ) : (
                            <ActionButton
                              size="sm"
                              variant="warning"
                              icon={<Edit3 className="w-3.5 h-3.5" />}
                              title="Ajustar registro"
                              onClick={() => setSelectedForEdit({
                                id: record.id,
                                userName: `${record.user.firstName} ${record.user.lastName}`,
                                date: typeof record.date === 'string' ? record.date.slice(0, 10) : format(new Date(record.date), 'yyyy-MM-dd'),
                                status: record.status,
                                entryTime: record.entryTime,
                                exitTime: record.exitTime,
                                entryTime2: record.entryTime2,
                                exitTime2: record.exitTime2,
                                notes: record.notes,
                                lateMinutes: record.lateMinutes,
                                lateMinutes2: record.lateMinutes2,
                              })}
                            />
                          )}
                          <RowActionMenu
                            title="Opciones del registro"
                            items={smartMenuItems}
                          />
                        </ActionButtonGroup>
                      </DataTableCell>
                    </DataTableRow>
                  );
                })
              )}
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
          toast.success("Asistencia justificada correctamente");
          fetchAttendance();
        }}
      />

      <EditAttendanceModal
        isOpen={!!selectedForEdit}
        onClose={() => setSelectedForEdit(null)}
        attendance={selectedForEdit}
        onSuccess={() => {
          toast.success("Registro actualizado correctamente");
          fetchAttendance();
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
