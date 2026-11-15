"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart3, Calendar, TrendingUp, Clock, AlertTriangle, RefreshCw, Award, User, Printer, FileText, FolderTree, X, ChevronRight, Inbox } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterToolbar } from "@/components/ui/FilterToolbar";
import { Button } from "@/components/ui/Button";
import { PdfReportModal } from "@/components/reports/PdfReportModal";
import { NominalBreakdownModal, StatusFilter } from "@/components/reports/NominalBreakdownModal";
import { Skeleton, SkeletonStatCard } from "@/components/ui/Skeleton";
import { AttendanceHeatmap } from "@/components/reports/AttendanceHeatmap";
import { ExportReportDropdown } from "@/components/reports/ExportReportDropdown";
import { exportPayrollToExcel } from "@/lib/exportPayrollExcel";
import { useToast } from "@/providers/ToastProvider";

interface DailyRecord {
  date: string;
  present: number;
  late: number;
  absent: number;
  abandoned: number;
}

interface ReportSummary {
  month: string;
  totalUsers: number;
  totalRecords: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  abandonedCount: number;
  justifiedCount: number;
  totalLateMinutes: number;
  punctualPercentage: number;
  attendanceRate: number;
  dailyBreakdown: DailyRecord[];
  lateSeverity: {
    tolerance: number;
    light: number;
    severe: number;
    critical: number;
  };
}

type PeriodType = "TODAY" | "WEEK" | "MONTH" | "CUSTOM";

interface WorkerItem {
  id: string;
  firstName: string;
  lastName: string;
  documentId?: string | null;
  role: string;
  locationId?: string | null;
  departmentId?: string | null;
  location?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
}

export default function ReportsPage() {
  const { toast } = useToast();
  // Period states
  const [periodType, setPeriodType] = useState<PeriodType>("MONTH");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), "yyyy-MM")
  );
  const [customStartDate, setCustomStartDate] = useState<string>(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );

  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [selectedUser, setSelectedUser] = useState<string>("ALL");
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [usersList, setUsersList] = useState<WorkerItem[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [heatmapData, setHeatmapData] = useState<{
    peakHoursMatrix: any[];
    locationPatterns: any[];
    rolePatterns: any[];
    insights: any;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // PDF modal state
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfReportData, setPdfReportData] = useState<any>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Nominal breakdown modal state
  const [isNominalModalOpen, setIsNominalModalOpen] = useState(false);
  const [nominalStatusFilter, setNominalStatusFilter] = useState<StatusFilter>("ALL");
  const [isLoadingNominal, setIsLoadingNominal] = useState(false);

  // Cascading worker list based on location, department, and role
  const cascadingUsersList = useMemo(() => {
    return usersList.filter((u) => {
      if (selectedLocation !== "ALL" && u.locationId !== selectedLocation) {
        return false;
      }
      if (selectedDepartment !== "ALL" && u.departmentId !== selectedDepartment) {
        return false;
      }
      if (selectedRole !== "ALL" && u.role !== selectedRole) {
        return false;
      }
      return true;
    });
  }, [usersList, selectedLocation, selectedDepartment, selectedRole]);

  // Gracefully auto-reset worker if they are filtered out by Sede / Departamento / Rol
  useEffect(() => {
    if (selectedUser !== "ALL") {
      const exists = cascadingUsersList.some((u) => u.id === selectedUser);
      if (!exists) {
        setSelectedUser("ALL");
      }
    }
  }, [cascadingUsersList, selectedUser]);

  // Rich options for the predictive Combobox
  const userSelectOptions = useMemo(() => {
    const isCascaded = selectedLocation !== "ALL" || selectedDepartment !== "ALL" || selectedRole !== "ALL";
    const allLabel = isCascaded
      ? `Todos en filtro (${cascadingUsersList.length})`
      : "Todos los Colaboradores";

    return [
      {
        value: "ALL",
        label: allLabel,
        description: `${cascadingUsersList.length} colaboradores disponibles`,
      },
      ...cascadingUsersList.map((u) => {
        const parts: string[] = [];
        if (u.location?.name) parts.push(u.location.name);
        if (u.department?.name) parts.push(u.department.name);
        const desc = parts.length > 0 ? parts.join(" · ") : undefined;

        return {
          value: u.id,
          label: `${u.lastName}, ${u.firstName}`,
          description: desc,
          badge: u.documentId ? `DNI: ${u.documentId}` : undefined,
        };
      }),
    ];
  }, [cascadingUsersList, selectedLocation, selectedDepartment, selectedRole]);

  const selectedUserObj = useMemo(() => {
    return usersList.find((u) => u.id === selectedUser) || null;
  }, [usersList, selectedUser]);

  const fetchLocationsAndDepartments = async () => {
    try {
      const [locRes, deptRes, usersRes] = await Promise.all([
        fetch("/api/locations"),
        fetch("/api/departments"),
        fetch("/api/users"),
      ]);
      const locData = await locRes.json();
      const deptData = await deptRes.json();
      const usersData = await usersRes.json();
      if (locData.locations) setLocations(locData.locations);
      if (deptData.departments) setDepartments(deptData.departments);
      if (usersData.users) setUsersList(usersData.users);
    } catch (err) {
      console.error("Error fetching locations, departments or users:", err);
    }
  };

  const isCustomRangeInvalid = periodType === "CUSTOM" && Boolean(customStartDate && customEndDate && customStartDate > customEndDate);

  const getResolvedDateRange = () => {
    if (periodType === "TODAY") {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      return { startDate: todayStr, endDate: todayStr };
    }
    if (periodType === "WEEK") {
      const now = new Date();
      return {
        startDate: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        endDate: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      };
    }
    if (periodType === "MONTH") {
      const [y, m] = selectedMonth.split("-").map(Number);
      const monthDate = new Date(y, m - 1, 1);
      return {
        startDate: format(startOfMonth(monthDate), "yyyy-MM-dd"),
        endDate: format(endOfMonth(monthDate), "yyyy-MM-dd"),
      };
    }
    return { startDate: customStartDate, endDate: customEndDate };
  };

  const fetchReports = async () => {
    if (isCustomRangeInvalid) return;
    try {
      setIsLoading(true);

      const summaryParams = new URLSearchParams();
      const heatmapParams = new URLSearchParams();

      if (periodType === "MONTH") {
        summaryParams.append("month", selectedMonth);
        heatmapParams.append("month", selectedMonth);
      } else {
        const { startDate, endDate } = getResolvedDateRange();
        summaryParams.append("startDate", startDate);
        summaryParams.append("endDate", endDate);
        heatmapParams.append("startDate", startDate);
        heatmapParams.append("endDate", endDate);
      }

      if (selectedLocation !== "ALL") {
        summaryParams.append("locationId", selectedLocation);
        heatmapParams.append("locationId", selectedLocation);
      }
      if (selectedDepartment !== "ALL") {
        summaryParams.append("departmentId", selectedDepartment);
        heatmapParams.append("departmentId", selectedDepartment);
      }
      if (selectedRole !== "ALL") {
        summaryParams.append("role", selectedRole);
        heatmapParams.append("role", selectedRole);
      }
      if (selectedUser !== "ALL") {
        summaryParams.append("userId", selectedUser);
        heatmapParams.append("userId", selectedUser);
      }

      // Execute summary and heatmap requests in parallel
      const [summaryRes, heatmapRes] = await Promise.all([
        fetch(`/api/reports/summary?${summaryParams.toString()}`),
        fetch(`/api/reports/heatmap?${heatmapParams.toString()}`),
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        if (data && Array.isArray(data.dailyBreakdown)) {
          setSummary(data);
        }
      }

      if (heatmapRes.ok) {
        const hData = await heatmapRes.json();
        if (hData && hData.peakHoursMatrix) {
          setHeatmapData(hData);
        }
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
      toast.error("No se pudieron cargar las métricas del reporte");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocationsAndDepartments();
  }, []);

  // Invalidate cached detailed report whenever any filter changes
  useEffect(() => {
    setPdfReportData(null);
  }, [periodType, selectedMonth, customStartDate, customEndDate, selectedLocation, selectedDepartment, selectedRole, selectedUser]);

  useEffect(() => {
    fetchReports();
  }, [periodType, selectedMonth, customStartDate, customEndDate, selectedLocation, selectedDepartment, selectedRole, selectedUser]);

  const buildDetailedParams = () => {
    const params = new URLSearchParams({ period: periodType });
    if (periodType === "MONTH") {
      params.append("startDate", selectedMonth);
    } else if (periodType === "CUSTOM") {
      params.append("startDate", customStartDate);
      params.append("endDate", customEndDate);
    }
    if (selectedLocation !== "ALL") params.append("locationId", selectedLocation);
    if (selectedDepartment !== "ALL") params.append("departmentId", selectedDepartment);
    if (selectedRole !== "ALL") params.append("role", selectedRole);
    if (selectedUser !== "ALL") params.append("userId", selectedUser);
    return params;
  };

  // Generar Reporte PDF
  const handleOpenPdfModal = async () => {
    if (isCustomRangeInvalid) {
      toast.error("La fecha de inicio no puede ser mayor a la fecha de fin");
      return;
    }
    if (pdfReportData?.attendances) {
      setIsPdfModalOpen(true);
      return;
    }
    try {
      setIsGeneratingPdf(true);
      const res = await fetch(`/api/reports/detailed?${buildDetailedParams().toString()}`);
      const data = await res.json();

      if (res.ok && data) {
        setPdfReportData(data);
        setIsPdfModalOpen(true);
      } else {
        toast.error(data.error || "No se pudo cargar los datos del reporte");
      }
    } catch (err) {
      console.error("Error al generar PDF:", err);
      toast.error("Error al conectar con el servidor para generar el reporte");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Abrir Desglose Nominal Detallado
  const handleOpenNominalModal = async (filter: StatusFilter = "ALL") => {
    if (isCustomRangeInvalid) {
      toast.error("La fecha de inicio no puede ser mayor a la fecha de fin");
      return;
    }
    setNominalStatusFilter(filter);

    if (pdfReportData?.attendances) {
      setIsNominalModalOpen(true);
      return;
    }

    try {
      setIsLoadingNominal(true);
      const res = await fetch(`/api/reports/detailed?${buildDetailedParams().toString()}`);
      const data = await res.json();

      if (res.ok && data) {
        setPdfReportData(data);
        setIsNominalModalOpen(true);
      } else {
        toast.error(data.error || "No se pudo cargar los datos nominales");
      }
    } catch (err) {
      console.error("Error al cargar desglose nominal:", err);
      toast.error("Error al conectar con el servidor para obtener el desglose nominal");
    } finally {
      setIsLoadingNominal(false);
    }
  };

  // Construcción unificada de URL de exportación (XLSX o CSV)
  const buildExportUrl = (format: "xlsx" | "csv") => {
    const params = new URLSearchParams({
      period: periodType,
      format,
    });

    if (periodType === "MONTH") {
      const [year, month] = selectedMonth.split("-");
      const startDate = `${selectedMonth}-01`;
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const endDate = `${selectedMonth}-${String(lastDay).padStart(2, "0")}`;
      params.append("startDate", startDate);
      params.append("endDate", endDate);
    } else if (periodType === "CUSTOM") {
      params.append("startDate", customStartDate);
      params.append("endDate", customEndDate);
    }

    if (selectedLocation !== "ALL") params.append("locationId", selectedLocation);
    if (selectedDepartment !== "ALL") params.append("departmentId", selectedDepartment);
    if (selectedRole !== "ALL") params.append("role", selectedRole);
    if (selectedUser !== "ALL") params.append("userId", selectedUser);

    return `/api/reports/export?${params.toString()}`;
  };

  const handleExportExcel = () => {
    window.open(buildExportUrl("xlsx"), "_blank");
  };

  const handleExportCsv = () => {
    window.open(buildExportUrl("csv"), "_blank");
  };

  const handleExportPayroll = async () => {
    if (isCustomRangeInvalid) {
      toast.error("La fecha de inicio no puede ser mayor a la fecha de fin");
      return;
    }
    try {
      const { startDate, endDate } = getResolvedDateRange();

      const params = new URLSearchParams({ startDate, endDate });
      if (selectedLocation !== "ALL") params.append("locationId", selectedLocation);
      if (selectedDepartment !== "ALL") params.append("departmentId", selectedDepartment);
      if (selectedRole !== "ALL") params.append("role", selectedRole);
      if (selectedUser !== "ALL") params.append("userId", selectedUser);

      const res = await fetch(`/api/reports/payroll?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar tareo");

      await exportPayrollToExcel(data.rows || [], startDate, endDate, {
        companyName: data.organizationName,
        ruc: data.ruc,
      });
      toast.success("Tareo de planilla exportado correctamente");
    } catch (err: any) {
      console.error("Error exportando tareo:", err);
      toast.error(err?.message || "No se pudo exportar el tareo de planilla");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      {/* PDF Modal */}
      <PdfReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        reportData={pdfReportData}
      />

      {/* Nominal Breakdown Modal */}
      <NominalBreakdownModal
        isOpen={isNominalModalOpen}
        onClose={() => setIsNominalModalOpen(false)}
        periodLabel={pdfReportData?.periodLabel || (summary ? `Mes: ${summary.month}` : "Período actual")}
        attendances={pdfReportData?.attendances || []}
        initialStatusFilter={nominalStatusFilter}
      />

      {/* BEGIN: PageHeaderSection */}
      <PageHeader
        title="Centro de Reportes & Exportación"
        subtitle="Genera constancias oficiales, reportes ejecutivos en PDF membretados y hojas de cálculo en Excel para gestión interna de nómina y RRHH."
        icon={BarChart3}
        iconVariant="emerald"
        actionButtons={
          <>
            <ExportReportDropdown
              onExportExcel={handleExportExcel}
              onExportPayroll={handleExportPayroll}
              onExportPdf={handleOpenPdfModal}
              onExportCsv={handleExportCsv}
              periodLabel={
                selectedUserObj
                  ? `${selectedUserObj.lastName}, ${selectedUserObj.firstName}`
                  : periodType === "MONTH"
                  ? selectedMonth
                  : undefined
              }
              isLoadingPdf={isGeneratingPdf}
            />
            <Button
              variant="primary"
              onClick={handleOpenPdfModal}
              isLoading={isGeneratingPdf}
              icon={<Printer className="w-4 h-4" />}
            >
              Generar PDF
            </Button>
          </>
        }
      />

      {/* BEGIN: FilterBarSection */}
      <FilterToolbar
        onReset={() => {
          setPeriodType("MONTH");
          setSelectedLocation("ALL");
          setSelectedDepartment("ALL");
          setSelectedRole("ALL");
          setSelectedUser("ALL");
        }}
        customFilters={
          <div className="flex flex-wrap items-center gap-2">
            {/* Period Type Preset Tabs */}
            <div className="h-10 p-1 flex items-center gap-1 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs">
              {["TODAY", "WEEK", "MONTH", "CUSTOM"].map((p) => {
                const labels: any = { TODAY: "Hoy", WEEK: "Semana", MONTH: "Mensual", CUSTOM: "Rango" };
                const isActive = periodType === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPeriodType(p as PeriodType)}
                    className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      isActive 
                        ? "bg-white dark:bg-surface-700 text-primary-700 dark:text-primary-300 shadow-sm border border-primary-200/80 dark:border-primary-500/30" 
                        : "text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white"
                    }`}
                  >
                    {labels[p]}
                  </button>
                );
              })}
            </div>

            {/* Month Picker */}
            {periodType === "MONTH" && (
              <div className="h-10 flex items-center gap-2 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 px-3 rounded-xl text-xs font-medium">
                <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" aria-hidden="true" />
                <input
                  type="month"
                  aria-label="Seleccionar mes del reporte"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-surface-900 dark:text-white font-mono outline-none cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:filter-[invert(1)] text-xs"
                />
              </div>
            )}

            {/* Custom Date Range Picker */}
            {periodType === "CUSTOM" && (
              <div className={`h-10 flex items-center gap-2 bg-surface-100 dark:bg-surface-800 border px-3 rounded-xl text-xs font-medium ${isCustomRangeInvalid ? "border-danger-500 ring-1 ring-danger-500/40" : "border-surface-200 dark:border-surface-700"}`}>
                <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" aria-hidden="true" />
                <input
                  type="date"
                  aria-label="Fecha de inicio"
                  value={customStartDate}
                  max={customEndDate || undefined}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-surface-900 dark:text-white font-mono outline-none cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:filter-[invert(1)] text-xs"
                />
                <span className="text-surface-400 dark:text-surface-500" aria-hidden="true">-</span>
                <input
                  type="date"
                  aria-label="Fecha de fin"
                  value={customEndDate}
                  min={customStartDate || undefined}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-surface-900 dark:text-white font-mono outline-none cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:filter-[invert(1)] text-xs"
                />
              </div>
            )}
            
            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchReports}
              disabled={isCustomRangeInvalid}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white transition cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              title="Refrescar métricas"
              aria-label="Refrescar métricas del reporte"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-primary-600 dark:text-primary-400" : ""}`} />
            </button>
          </div>
        }
        filters={[
          {
            id: "location",
            value: selectedLocation,
            onChange: setSelectedLocation,
            options: [
              { value: "ALL", label: "Todas las Sedes" },
              ...locations.map((l) => ({ value: l.id, label: l.name })),
            ],
            className: "w-full sm:w-auto sm:min-w-[150px]",
          },
          {
            id: "department",
            icon: FolderTree,
            value: selectedDepartment,
            onChange: setSelectedDepartment,
            options: [
              { value: "ALL", label: "Todos los Departamentos" },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ],
            className: "w-full sm:w-auto sm:min-w-[170px]",
          },
          {
            id: "user",
            icon: User,
            value: selectedUser,
            onChange: setSelectedUser,
            options: userSelectOptions,
            searchable: true,
            searchPlaceholder: "Buscar por DNI o apellido...",
            className: "w-full sm:w-auto sm:min-w-[260px] lg:min-w-[300px]",
            dropdownClassName: "min-w-[300px] sm:min-w-[360px]",
          },
          {
            id: "role",
            value: selectedRole,
            onChange: setSelectedRole,
            options: [
              { value: "ALL", label: "Todos los Roles" },
              { value: "EMPLEADO", label: "Solo Empleados" },
              { value: "SUPERVISOR", label: "Supervisores" },
            ],
            className: "w-full sm:w-auto sm:min-w-[140px]",
          },
        ]}
      />

      {/* Alerta de rango inválido */}
      {isCustomRangeInvalid && (
        <div role="alert" className="flex items-center justify-between p-3.5 rounded-2xl bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-500/30 text-xs text-danger-700 dark:text-danger-300">
          <span className="font-medium">La fecha de inicio ({customStartDate}) no puede ser posterior a la fecha de fin ({customEndDate}).</span>
          <button
            type="button"
            onClick={() => setCustomEndDate(customStartDate)}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-danger-200 dark:border-danger-500/30 font-semibold hover:bg-danger-100 dark:hover:bg-white/15 transition cursor-pointer"
          >
            Ajustar fecha fin
          </button>
        </div>
      )}

      {/* Banner de enfoque individual cuando hay un colaborador seleccionado */}
      {selectedUserObj && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-primary-500/10 dark:bg-primary-500/15 border border-primary-500/30 text-xs animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary-600 text-white font-bold flex items-center justify-center text-xs shadow-sm shrink-0">
              {selectedUserObj.firstName.charAt(0)}{selectedUserObj.lastName.charAt(0)}
            </div>
            <div>
              <span className="text-surface-600 dark:text-slate-300 font-medium">Reporte enfocado exclusivamente en: </span>
              <strong className="text-primary-800 dark:text-primary-300 font-bold">
                {selectedUserObj.lastName}, {selectedUserObj.firstName}
              </strong>
              {selectedUserObj.documentId && (
                <span className="ml-2 font-mono text-[11px] text-surface-500 dark:text-slate-400">
                  (DNI: {selectedUserObj.documentId})
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedUser("ALL")}
            className="px-3 py-1.5 rounded-xl bg-surface-200/80 hover:bg-surface-300 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
            title="Restablecer filtro a todos los colaboradores"
          >
            <X className="w-3.5 h-3.5" />
            <span>Ver toda la empresa</span>
          </button>
        </div>
      )}

      {isLoading || !summary ? (
        <div className="space-y-6 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-surface-900 p-6 rounded-2xl sm:rounded-3xl border border-surface-200 dark:border-surface-800 space-y-4 shadow-sm">
              <Skeleton className="h-6 w-48 rounded-xl" />
              <div className="space-y-3 pt-3">
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-full rounded-lg" />
              </div>
            </div>
            <div className="lg:col-span-2 bg-white dark:bg-surface-900 p-6 rounded-2xl sm:rounded-3xl border border-surface-200 dark:border-surface-800 space-y-4 shadow-sm">
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      ) : summary.totalRecords === 0 ? (
        <div className="glass-panel rounded-2xl border border-surface-200 dark:border-white/5 bg-surface-50 dark:bg-surface-900/60 p-10 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-surface-100 dark:bg-white/5 border border-surface-200 dark:border-white/10 flex items-center justify-center mx-auto text-surface-500 dark:text-slate-400">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-surface-900 dark:text-white">
            Sin registros de asistencia para este filtro
          </h3>
          <p className="text-xs text-surface-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            No se encontraron marcaciones en el período o combinación de sede, departamento, rol y colaborador seleccionados.
          </p>
          <div className="pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setPeriodType("MONTH");
                setSelectedLocation("ALL");
                setSelectedDepartment("ALL");
                setSelectedRole("ALL");
                setSelectedUser("ALL");
              }}
            >
              Restablecer filtros
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* BEGIN: KpiMetricsCards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard
              label="Tasa de Asistencia"
              value={`${summary.attendanceRate}%`}
              subLabel={`${summary.presentCount + summary.lateCount} de ${summary.totalRecords} esperados`}
              icon={TrendingUp}
              variant="emerald"
              trend={
                summary.totalRecords > 0
                  ? summary.attendanceRate >= 80
                    ? { value: 80, label: "Obj", isPositive: true }
                    : { value: 80, label: "Obj", isPositive: false }
                  : undefined
              }
            />
            <StatCard
              label="Puntualidad Oficial"
              value={`${summary.punctualPercentage}%`}
              subLabel={`${summary.presentCount} ingresos dentro de tolerancia`}
              icon={Award}
              variant="cyan"
            />
            <StatCard
              label="Tardanzas Acumuladas"
              value={`${summary.totalLateMinutes}m`}
              subLabel={`${summary.lateCount} eventos de retraso`}
              icon={Clock}
              variant="amber"
              trend={
                summary.lateCount > 0
                  ? {
                      value: Math.round(summary.totalLateMinutes / summary.lateCount),
                      label: "Prom. min",
                      isPositive: false,
                    }
                  : undefined
              }
            />
            <StatCard
              label="Salidas & Abandonos"
              value={summary.abandonedCount}
              subLabel={`${summary.abandonedCount} abandonos sin permiso`}
              icon={AlertTriangle}
              variant={summary.abandonedCount > 0 ? "rose" : "emerald"}
              trend={
                summary.totalRecords > 0
                  ? summary.abandonedCount === 0
                    ? { value: "0", label: "Sin abandonos", isNeutral: true }
                    : undefined
                  : undefined
              }
            />
          </section>

          {/* ── Visual Heatmaps & Peak Hours Analytics ──────────────── */}
          {heatmapData && (
            <div className="glass-panel rounded-2xl border border-surface-200 dark:border-white/5 bg-surface-50/50 dark:bg-surface-900/40 backdrop-blur-md overflow-hidden">
              <AttendanceHeatmap
                matrix={heatmapData.peakHoursMatrix}
                locationPatterns={heatmapData.locationPatterns}
                rolePatterns={heatmapData.rolePatterns}
                insights={heatmapData.insights}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* BEGIN: BottomAnalyticalConsoleRow */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Col: Distribución de Estados (5 Cols) */}
            <div className="lg:col-span-5 glass-panel rounded-2xl border border-surface-200 dark:border-white/5 p-6 flex flex-col justify-between bg-surface-50 dark:bg-surface-900/60 shadow-lg backdrop-blur-xl">
              <div>
                <div className="flex items-center justify-between border-b border-surface-200 dark:border-white/5 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-emerald-500/10 border border-primary-200 dark:border-emerald-500/30 flex items-center justify-center text-primary-600 dark:text-emerald-400">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-surface-900 dark:text-white tracking-wide">Distribución de Estados</h3>
                  </div>
                  <span className="text-[10px] font-mono text-surface-500 dark:text-slate-400 bg-surface-200 dark:bg-white/5 px-2 py-1 rounded border border-surface-300 dark:border-white/5">{summary.totalRecords} Registros</span>
                </div>
                
                {/* Breakdown Bars */}
                <div className="mt-5 space-y-2.5">
                  {[
                    {
                      filter: "PRESENTE" as StatusFilter,
                      label: "Presentes Puntuales",
                      count: summary.presentCount,
                      dotClass: "bg-primary-500 dark:bg-emerald-400",
                      countClass: "text-surface-900 dark:text-white",
                      hoverClass: "group-hover:text-primary-600 dark:group-hover:text-emerald-400",
                      barClass: "bg-gradient-to-r from-primary-500 to-primary-400",
                    },
                    {
                      filter: "TARDE" as StatusFilter,
                      label: "Tardanzas Toleradas / Leves",
                      count: summary.lateCount,
                      dotClass: "bg-warning-500 dark:bg-amber-400",
                      countClass: "text-warning-700 dark:text-amber-300",
                      hoverClass: "group-hover:text-warning-600 dark:group-hover:text-amber-300",
                      barClass: "bg-warning-500 dark:bg-amber-400",
                    },
                    {
                      filter: "JUSTIFICADO" as StatusFilter,
                      label: "Justificados / Licencias",
                      count: summary.justifiedCount || 0,
                      dotClass: "bg-info-500 dark:bg-cyan-400",
                      countClass: "text-info-700 dark:text-cyan-300",
                      hoverClass: "group-hover:text-info-600 dark:group-hover:text-cyan-300",
                      barClass: "bg-info-500 dark:bg-cyan-400",
                    },
                    {
                      filter: "AUSENTE" as StatusFilter,
                      label: "Inasistencias Injustificadas",
                      count: summary.absentCount,
                      dotClass: "bg-danger-500 dark:bg-rose-400",
                      countClass: "text-danger-700 dark:text-rose-300",
                      hoverClass: "group-hover:text-danger-600 dark:group-hover:text-rose-300",
                      barClass: "bg-danger-500 dark:bg-rose-500",
                    },
                  ].map((item) => {
                    const pct = summary.totalRecords ? Math.round((item.count / summary.totalRecords) * 100) : 0;
                    const widthPct = summary.totalRecords ? (item.count / summary.totalRecords) * 100 : 0;
                    return (
                      <button
                        key={item.filter}
                        type="button"
                        onClick={() => handleOpenNominalModal(item.filter)}
                        aria-label={`Ver desglose nominal de ${item.label}: ${item.count} (${pct}%)`}
                        className="w-full text-left space-y-1.5 p-2 -mx-2 rounded-xl hover:bg-surface-100 dark:hover:bg-white/[0.04] transition cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${item.dotClass}`} aria-hidden="true" />
                            <span className={`text-surface-800 dark:text-slate-200 font-medium truncate transition ${item.hoverClass}`}>
                              {item.label}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 font-mono shrink-0">
                            <span className={`font-bold ${item.countClass}`}>{item.count}</span>
                            <span className="text-surface-500 dark:text-slate-400 text-[11px]">({pct}%)</span>
                            <ChevronRight className="w-3.5 h-3.5 text-surface-400 dark:text-slate-500 group-hover:text-surface-700 dark:group-hover:text-slate-300 transition-colors" aria-hidden="true" />
                          </div>
                        </div>
                        <div className="w-full h-2 bg-surface-200 dark:bg-[#131b26] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${item.barClass}`} style={{ width: `${widthPct}%` }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-surface-200 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => handleOpenNominalModal("ALL")}
                  disabled={isLoadingNominal}
                  className="w-full min-h-[40px] py-2.5 px-3 rounded-xl bg-white dark:bg-white/5 hover:bg-surface-50 dark:hover:bg-white/10 hover:border-primary-300 dark:hover:border-emerald-500/30 border border-surface-300 dark:border-white/10 shadow-xs text-xs font-semibold text-surface-800 dark:text-slate-200 hover:text-surface-900 dark:hover:text-white flex items-center justify-center space-x-2 transition cursor-pointer active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  {isLoadingNominal ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-primary-600 dark:text-emerald-400" />
                  ) : (
                    <FileText className="w-4 h-4 text-primary-600 dark:text-emerald-400" />
                  )}
                  <span>Ver Desglose Nominal Detallado</span>
                </button>
              </div>
            </div>

            {/* Right Col: Severidad de Tardanzas & Resumen del Período (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="glass-panel rounded-2xl border border-surface-200 dark:border-white/5 p-6 flex flex-col justify-between bg-surface-50 dark:bg-surface-900/60 shadow-lg backdrop-blur-xl h-full">
                <div>
                  <div className="flex items-center justify-between border-b border-surface-200 dark:border-white/5 pb-4 gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-warning-50 dark:bg-amber-500/10 border border-warning-200 dark:border-amber-500/30 flex items-center justify-center text-warning-600 dark:text-amber-400 shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-surface-900 dark:text-white tracking-wide">
                          Severidad de Tardanzas &amp; Cobertura
                        </h3>
                        <p className="text-[11px] text-surface-600 dark:text-slate-400 mt-0.5">
                          Clasificación real de minutos de retraso en el período seleccionado.
                        </p>
                      </div>
                    </div>
                    <span className="hidden sm:inline-flex text-[11px] font-mono text-surface-600 dark:text-slate-300 bg-surface-100 dark:bg-white/5 border border-surface-200 dark:border-white/10 px-2.5 py-1 rounded-full font-semibold shrink-0">
                      {summary.dailyBreakdown.length} días con actividad
                    </span>
                  </div>

                  {/* Late Severity Breakdown */}
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {[
                      {
                        label: "En tolerancia (1–5 min)",
                        count: summary.lateSeverity.tolerance,
                        badgeClass: "text-primary-700 dark:text-emerald-400 bg-primary-50 dark:bg-emerald-500/10 border-primary-200 dark:border-emerald-500/20",
                        barClass: "bg-primary-500 dark:bg-emerald-400",
                      },
                      {
                        label: "Leve (6–15 min)",
                        count: summary.lateSeverity.light,
                        badgeClass: "text-info-700 dark:text-cyan-400 bg-info-50 dark:bg-cyan-500/10 border-info-200 dark:border-cyan-500/20",
                        barClass: "bg-info-500 dark:bg-cyan-400",
                      },
                      {
                        label: "Severa (16–30 min)",
                        count: summary.lateSeverity.severe,
                        badgeClass: "text-warning-700 dark:text-amber-400 bg-warning-50 dark:bg-amber-500/10 border-warning-200 dark:border-amber-500/20",
                        barClass: "bg-warning-500 dark:bg-amber-400",
                      },
                      {
                        label: "Crítica (+30 min)",
                        count: summary.lateSeverity.critical,
                        badgeClass: "text-danger-700 dark:text-rose-400 bg-danger-50 dark:bg-rose-500/10 border-danger-200 dark:border-rose-500/20",
                        barClass: "bg-danger-500 dark:bg-rose-500",
                      },
                    ].map((tier) => {
                      const pct = summary.lateCount > 0 ? Math.round((tier.count / summary.lateCount) * 100) : 0;
                      return (
                        <div
                          key={tier.label}
                          className="bg-white dark:bg-command-bg border border-surface-200 dark:border-white/5 rounded-xl p-4 space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-surface-800 dark:text-slate-200">
                              {tier.label}
                            </span>
                            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border ${tier.badgeClass}`}>
                              {tier.count}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-surface-200 dark:bg-[#131b26] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${tier.barClass}`} style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[11px] text-surface-500 dark:text-slate-400 font-mono">
                            {pct}% del total de tardanzas
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Period Summary Metrics */}
                  <div className="mt-4 bg-surface-100 dark:bg-command-bg/80 border border-surface-200 dark:border-white/5 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <span className="text-[11px] text-surface-600 dark:text-slate-400 block">Colaboradores</span>
                      <span className="text-sm font-bold font-mono text-surface-900 dark:text-white">{summary.totalUsers}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-surface-600 dark:text-slate-400 block">Justificados</span>
                      <span className="text-sm font-bold font-mono text-info-700 dark:text-cyan-300">{summary.justifiedCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-surface-600 dark:text-slate-400 block">Prom. Retraso</span>
                      <span className="text-sm font-bold font-mono text-warning-700 dark:text-amber-300">
                        {summary.lateCount > 0 ? `${Math.round(summary.totalLateMinutes / summary.lateCount)}m` : "0m"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-surface-200 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] text-surface-600 dark:text-slate-400">
                    Para exportar Excel, CSV, Tareo o PDF oficial usa los controles en la cabecera.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleOpenNominalModal("TARDE")}
                    disabled={isLoadingNominal || summary.lateCount === 0}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-white dark:bg-white/5 hover:bg-surface-50 dark:hover:bg-white/10 border border-surface-300 dark:border-white/10 shadow-xs text-xs font-semibold text-surface-800 dark:text-slate-200 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  >
                    <Clock className="w-4 h-4 text-warning-600 dark:text-amber-400" />
                    <span>Auditar Tardanzas ({summary.lateCount})</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
