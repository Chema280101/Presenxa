"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  Calendar,
  Download,
  Building,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  RefreshCw,
  Award,
  Users,
  ShieldCheck,
  Sparkles,
  Printer,
  FileText,
  Filter,
} from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterToolbar } from "@/components/ui/FilterToolbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { PdfReportModal } from "@/components/reports/PdfReportModal";
import { NominalBreakdownModal, StatusFilter } from "@/components/reports/NominalBreakdownModal";
import { Skeleton, SkeletonStatCard } from "@/components/ui/Skeleton";
import { AttendanceHeatmap } from "@/components/reports/AttendanceHeatmap";
import { DailyTrendChart } from "@/components/reports/DailyTrendChart";
import { LateSeverityChart } from "@/components/reports/LateSeverityChart";

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

export default function ReportsPage() {
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
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
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

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/locations");
      const data = await res.json();
      if (data.locations) setLocations(data.locations);
    } catch (err) {
      console.error("Error fetching locations:", err);
    }
  };

  const fetchReports = async () => {
    try {
      setIsLoading(true);

      const summaryParams = new URLSearchParams();
      const heatmapParams = new URLSearchParams();

      if (periodType === "MONTH") {
        summaryParams.append("month", selectedMonth);
        heatmapParams.append("month", selectedMonth);
      } else if (periodType === "CUSTOM") {
        heatmapParams.append("startDate", customStartDate);
        heatmapParams.append("endDate", customEndDate);
      } else if (periodType === "TODAY") {
        const todayStr = format(new Date(), "yyyy-MM-dd");
        heatmapParams.append("startDate", todayStr);
        heatmapParams.append("endDate", todayStr);
      } else if (periodType === "WEEK") {
        const now = new Date();
        const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
        const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
        heatmapParams.append("startDate", weekStart);
        heatmapParams.append("endDate", weekEnd);
      }

      if (selectedLocation !== "ALL") {
        summaryParams.append("locationId", selectedLocation);
        heatmapParams.append("locationId", selectedLocation);
      }
      if (selectedRole !== "ALL") {
        heatmapParams.append("role", selectedRole);
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [selectedMonth, selectedLocation, selectedRole, periodType, customStartDate, customEndDate]);

  // Generar Reporte PDF
  const handleOpenPdfModal = async () => {
    try {
      setIsGeneratingPdf(true);
      const params = new URLSearchParams({
        period: periodType,
      });

      if (periodType === "MONTH") {
        params.append("startDate", selectedMonth);
      } else if (periodType === "CUSTOM") {
        params.append("startDate", customStartDate);
        params.append("endDate", customEndDate);
      }

      if (selectedLocation !== "ALL") params.append("locationId", selectedLocation);
      if (selectedRole !== "ALL") params.append("role", selectedRole);

      const res = await fetch(`/api/reports/detailed?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data) {
        setPdfReportData(data);
        setIsPdfModalOpen(true);
      } else {
        alert(data.error || "No se pudo cargar los datos del reporte");
      }
    } catch (err) {
      console.error("Error al generar PDF:", err);
      alert("Error al conectar con el servidor para generar el reporte");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Abrir Desglose Nominal Detallado
  const handleOpenNominalModal = async (filter: StatusFilter = "ALL") => {
    setNominalStatusFilter(filter);

    if (pdfReportData?.attendances) {
      setIsNominalModalOpen(true);
      return;
    }

    try {
      setIsLoadingNominal(true);
      const params = new URLSearchParams({
        period: periodType,
      });

      if (periodType === "MONTH") {
        params.append("startDate", selectedMonth);
      } else if (periodType === "CUSTOM") {
        params.append("startDate", customStartDate);
        params.append("endDate", customEndDate);
      }

      if (selectedLocation !== "ALL") params.append("locationId", selectedLocation);
      if (selectedRole !== "ALL") params.append("role", selectedRole);

      const res = await fetch(`/api/reports/detailed?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data) {
        setPdfReportData(data);
        setIsNominalModalOpen(true);
      } else {
        alert(data.error || "No se pudo cargar los datos nominales");
      }
    } catch (err) {
      console.error("Error al cargar desglose nominal:", err);
      alert("Error al conectar con el servidor para obtener el desglose nominal");
    } finally {
      setIsLoadingNominal(false);
    }
  };

  // Exportar Excel / CSV
  const handleExportCsv = () => {
    const params = new URLSearchParams({
      period: periodType,
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
    if (selectedRole !== "ALL") params.append("role", selectedRole);

    window.open(`/api/reports/export?${params.toString()}`, "_blank");
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
            <Button
              variant="secondary"
              onClick={handleExportCsv}
              icon={<FileSpreadsheet className="w-4 h-4 text-primary-600 dark:text-emerald-400" />}
            >
              Exportar Excel
            </Button>
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
          setSelectedRole("ALL");
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
                <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-surface-900 dark:text-white font-mono outline-none cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:filter-[invert(1)] text-xs"
                />
              </div>
            )}

            {/* Custom Date Range Picker */}
            {periodType === "CUSTOM" && (
              <div className="h-10 flex items-center gap-2 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 px-3 rounded-xl text-xs font-medium">
                <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-surface-900 dark:text-white font-mono outline-none cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:filter-[invert(1)] text-xs"
                />
                <span className="text-surface-400 dark:text-surface-500">-</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-surface-900 dark:text-white font-mono outline-none cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:filter-[invert(1)] text-xs"
                />
              </div>
            )}
            
            {/* Refresh Button */}
            <button
              onClick={fetchReports}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white transition cursor-pointer"
              title="Refrescar métricas"
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
              ...locations.map((l) => ({ value: l.id, label: l.name }))
            ]
          },
          {
            id: "role",
            value: selectedRole,
            onChange: setSelectedRole,
            options: [
              { value: "ALL", label: "Todos los Roles" },
              { value: "EMPLEADO", label: "Solo Empleados" },
              { value: "SUPERVISOR", label: "Supervisores" },
              { value: "ALUMNO", label: "Alumnos" }
            ]
          }
        ]}
      />

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
                    ? { value: 0, label: "OK", isPositive: true }
                    : undefined
                  : undefined
              }
            />
          </section>

          {/* ── Visual Heatmaps & Peak Hours Analytics ──────────────── */}
          {heatmapData && (
            <div className="glass-panel rounded-2xl border border-surface-200 dark:border-white/5 bg-surface-50/50 dark:bg-[#0a111c]/40 backdrop-blur-md overflow-hidden">
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
            <div className="lg:col-span-5 glass-panel rounded-2xl border border-surface-200 dark:border-white/5 p-6 flex flex-col justify-between bg-surface-50 dark:bg-[#0a111c]/60 shadow-lg backdrop-blur-xl">
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
                <div className="mt-5 space-y-4">
                  <div 
                    onClick={() => handleOpenNominalModal("PRESENTE")}
                    className="space-y-1.5 p-1.5 -mx-1.5 rounded-xl hover:bg-surface-100 dark:hover:bg-white/[0.03] transition cursor-pointer group"
                    title="Clic para ver desglose nominal de puntuales"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-primary-500 dark:bg-emerald-400"></span>
                        <span className="text-surface-800 dark:text-slate-200 font-medium group-hover:text-primary-500 transition">Presentes Puntuales</span>
                      </div>
                      <div className="flex items-center space-x-2 font-mono">
                        <span className="text-surface-900 dark:text-white font-bold">{summary.presentCount}</span>
                        <span className="text-surface-500 dark:text-slate-400 text-[11px]">({summary.totalRecords ? Math.round((summary.presentCount / summary.totalRecords) * 100) : 0}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-surface-200 dark:bg-[#131b26] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all" style={{ width: `${summary.totalRecords ? (summary.presentCount / summary.totalRecords) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  <div 
                    onClick={() => handleOpenNominalModal("TARDE")}
                    className="space-y-1.5 p-1.5 -mx-1.5 rounded-xl hover:bg-surface-100 dark:hover:bg-white/[0.03] transition cursor-pointer group"
                    title="Clic para ver desglose nominal de tardanzas"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-warning-500 dark:bg-amber-400"></span>
                        <span className="text-surface-800 dark:text-slate-200 font-medium group-hover:text-warning-500 transition">Tardanzas Toleradas / Leves</span>
                      </div>
                      <div className="flex items-center space-x-2 font-mono">
                        <span className="text-warning-600 dark:text-amber-300 font-bold">{summary.lateCount}</span>
                        <span className="text-surface-500 dark:text-slate-400 text-[11px]">({summary.totalRecords ? Math.round((summary.lateCount / summary.totalRecords) * 100) : 0}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-surface-200 dark:bg-[#131b26] rounded-full overflow-hidden">
                      <div className="h-full bg-warning-500 dark:bg-amber-400 rounded-full transition-all" style={{ width: `${summary.totalRecords ? (summary.lateCount / summary.totalRecords) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  <div 
                    onClick={() => handleOpenNominalModal("JUSTIFICADO")}
                    className="space-y-1.5 p-1.5 -mx-1.5 rounded-xl hover:bg-surface-100 dark:hover:bg-white/[0.03] transition cursor-pointer group"
                    title="Clic para ver desglose nominal de justificados"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-info-500 dark:bg-cyan-400"></span>
                        <span className="text-surface-800 dark:text-slate-200 font-medium group-hover:text-info-500 transition">Justificados / Licencias</span>
                      </div>
                      <div className="flex items-center space-x-2 font-mono">
                        <span className="text-info-600 dark:text-cyan-300 font-bold">{summary.justifiedCount || 0}</span>
                        <span className="text-surface-500 dark:text-slate-400 text-[11px]">({summary.totalRecords ? Math.round(((summary.justifiedCount || 0) / summary.totalRecords) * 100) : 0}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-surface-200 dark:bg-[#131b26] rounded-full overflow-hidden">
                      <div className="h-full bg-info-500 dark:bg-cyan-400 rounded-full transition-all" style={{ width: `${summary.totalRecords ? ((summary.justifiedCount || 0) / summary.totalRecords) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  <div 
                    onClick={() => handleOpenNominalModal("AUSENTE")}
                    className="space-y-1.5 p-1.5 -mx-1.5 rounded-xl hover:bg-surface-100 dark:hover:bg-white/[0.03] transition cursor-pointer group"
                    title="Clic para ver desglose nominal de inasistencias"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-danger-500 dark:bg-rose-400"></span>
                        <span className="text-surface-800 dark:text-slate-200 font-medium group-hover:text-danger-500 transition">Inasistencias Injustificadas</span>
                      </div>
                      <div className="flex items-center space-x-2 font-mono">
                        <span className="text-danger-600 dark:text-rose-300 font-bold">{summary.absentCount}</span>
                        <span className="text-surface-500 dark:text-slate-400 text-[11px]">({summary.totalRecords ? Math.round((summary.absentCount / summary.totalRecords) * 100) : 0}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-surface-200 dark:bg-[#131b26] rounded-full overflow-hidden">
                      <div className="h-full bg-danger-500 dark:bg-rose-500 rounded-full transition-all" style={{ width: `${summary.totalRecords ? (summary.absentCount / summary.totalRecords) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-surface-200 dark:border-white/5">
                <button
                  onClick={() => handleOpenNominalModal("ALL")}
                  disabled={isLoadingNominal}
                  className="w-full py-2.5 px-3 rounded-xl bg-surface-200 dark:bg-white/5 hover:bg-surface-300 dark:hover:bg-white/10 hover:border-primary-300 dark:hover:border-emerald-500/30 border border-surface-300 dark:border-white/10 text-xs font-semibold text-surface-800 dark:text-slate-200 hover:text-surface-900 dark:hover:text-white flex items-center justify-center space-x-2 transition cursor-pointer active:scale-95 disabled:opacity-50"
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

            {/* Right Col: Consola de Exportación & Auditoría (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              
              <div className="glass-panel rounded-2xl border border-surface-200 dark:border-white/5 p-6 flex flex-col justify-between bg-surface-50 dark:bg-[#0a111c]/60 shadow-lg backdrop-blur-xl h-full">
                <div>
                  <div className="flex items-center justify-between border-b border-surface-200 dark:border-white/5 pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-info-50 dark:bg-cyan-500/10 border border-info-200 dark:border-cyan-500/30 flex items-center justify-center text-info-600 dark:text-cyan-400">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-surface-900 dark:text-white tracking-wide">Consola de Exportación & Control Operativo</h3>
                        <p className="text-[11px] text-surface-500 dark:text-slate-400 mt-0.5">Archivos consolidados para gestión interna de planillas, turnos y control de asistencia.</p>
                      </div>
                    </div>
                    <span className="hidden sm:inline-flex text-[10px] font-mono text-primary-700 dark:text-emerald-400 bg-primary-100 dark:bg-emerald-500/10 border border-primary-300 dark:border-emerald-500/30 px-2.5 py-1 rounded-md font-bold">
                      AUDITORÍA ACTIVA
                    </span>
                  </div>
                  {/* Features Grid */}
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-surface-100 dark:bg-command-bg border border-surface-200 dark:border-white/5 rounded-xl p-4 space-y-1.5">
                      <div className="flex items-center space-x-2 text-xs text-surface-800 dark:text-slate-200 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-primary-500 dark:text-emerald-400" />
                        <span>Control Biométrico</span>
                      </div>
                      <p className="text-[10px] text-surface-500 dark:text-slate-400 leading-relaxed">Registro de asistencias digital con identificación biométrica no modificable.</p>
                    </div>
                    <div className="bg-surface-100 dark:bg-command-bg border border-surface-200 dark:border-white/5 rounded-xl p-4 space-y-1.5">
                      <div className="flex items-center space-x-2 text-xs text-surface-800 dark:text-slate-200 font-semibold">
                        <Clock className="w-4 h-4 text-info-500 dark:text-cyan-400" />
                        <span>Horas Extras 25/35%</span>
                      </div>
                      <p className="text-[10px] text-surface-500 dark:text-slate-400 leading-relaxed">Cálculo automatizado de sobretiempo diurno y nocturno para la nómina mensual.</p>
                    </div>
                    <div className="bg-surface-100 dark:bg-command-bg border border-surface-200 dark:border-white/5 rounded-xl p-4 space-y-1.5">
                      <div className="flex items-center space-x-2 text-xs text-surface-800 dark:text-slate-200 font-semibold">
                        <Award className="w-4 h-4 text-accent-500 dark:text-purple-400" />
                        <span>Firma SHA-256</span>
                      </div>
                      <p className="text-[10px] text-surface-500 dark:text-slate-400 leading-relaxed">Inmutabilidad garantizada por hash criptográfico en cada checkpoint de ingreso.</p>
                    </div>
                  </div>
                  {/* Audit Snapshot Table Preview */}
                  <div className="mt-4 bg-surface-100 dark:bg-command-bg/80 border border-surface-200 dark:border-white/5 rounded-xl p-3.5 font-mono text-[11px] text-surface-500 dark:text-slate-400 space-y-1.5">
                    <div className="flex items-center justify-between text-surface-700 dark:text-slate-300 text-[10px] uppercase font-bold border-b border-surface-200 dark:border-white/5 pb-2 mb-2">
                      <span>ESTRUCTURA DE ARCHIVO GENERADO</span>
                      <span className="text-primary-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" /> VERIFICACIÓN INTERNA OK
                      </span>
                    </div>
                    <p className="truncate text-surface-700 dark:text-slate-300">PERIODO: {periodType} · REGISTROS: {summary.totalRecords}</p>
                    <p className="truncate text-surface-500 dark:text-slate-400">FORMATO: REPORTE_MENSUAL_CONSOLIDADO.CSV (HASH SECURE)</p>
                  </div>
                </div>
                {/* Bottom Action Buttons */}
                <div className="mt-6 pt-4 border-t border-surface-200 dark:border-white/5 flex flex-wrap items-center justify-end gap-3">
                  <button
                    onClick={handleExportCsv}
                    className="px-4 py-2.5 rounded-xl bg-surface-200 dark:bg-[#0a111c] hover:bg-surface-300 dark:hover:bg-[#131b26] border border-surface-300 dark:border-white/10 text-xs font-semibold text-surface-800 dark:text-slate-200 transition flex items-center space-x-2 cursor-pointer active:scale-95 shadow-md"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-primary-600 dark:text-emerald-400" />
                    <span>Descargar Nómina (.csv)</span>
                  </button>
                  <button
                    onClick={handleOpenPdfModal}
                    disabled={isGeneratingPdf}
                    className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition shadow-md shadow-primary-500/20 dark:shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center space-x-2 disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    {isGeneratingPdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                    <span>Descargar Acta Mensual Firmada (.pdf)</span>
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
