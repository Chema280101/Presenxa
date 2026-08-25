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
import { EmptyState } from "@/components/ui/EmptyState";
import { PdfReportModal } from "@/components/reports/PdfReportModal";
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

      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="gradient-brand w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Centro de Reportes & Exportación
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Genera constancias, reportes ejecutivos en PDF membretados y hojas de cálculo para nómina.
          </p>
        </div>

        {/* Action Buttons: PDF & Excel */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleOpenPdfModal}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 text-xs font-bold shadow-lg shadow-lime-400/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isGeneratingPdf ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            Generar Reporte PDF
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 shadow-md transition-all active:scale-[0.98]"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Exportar Excel (.csv)
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="card-surface p-4 rounded-2xl border border-white/5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Period Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5 overflow-x-auto">
            <button
              onClick={() => setPeriodType("TODAY")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                periodType === "TODAY"
                  ? "bg-lime-400 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Hoy (Diario)
            </button>
            <button
              onClick={() => setPeriodType("WEEK")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                periodType === "WEEK"
                  ? "bg-lime-400 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setPeriodType("MONTH")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                periodType === "MONTH"
                  ? "bg-lime-400 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setPeriodType("CUSTOM")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                periodType === "CUSTOM"
                  ? "bg-lime-400 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Rango de Fechas
            </button>
          </div>

          {/* Sede and Role filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Sede selector */}
            <div className="relative">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white text-xs cursor-pointer focus:outline-none focus:border-lime-400"
              >
                <option value="ALL">Todas las Sedes</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Role selector */}
            <div className="relative">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white text-xs cursor-pointer focus:outline-none focus:border-lime-400"
              >
                <option value="ALL">Todos los Roles</option>
                <option value="EMPLEADO">Solo Empleados</option>
                <option value="SUPERVISOR">Supervisores</option>
                <option value="ALUMNO">Alumnos</option>
              </select>
            </div>

            <button
              onClick={fetchReports}
              title="Refrescar métricas"
              className="p-2 rounded-xl bg-black/30 border border-white/10 text-slate-300 hover:text-white transition-all active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-lime-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Date Inputs based on Period */}
        {periodType === "MONTH" && (
          <div className="flex items-center gap-2.5 pt-2 border-t border-white/5">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-lime-400" />
              Seleccionar Mes:
            </span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs font-mono outline-none cursor-pointer focus:border-lime-400"
            />
          </div>
        )}

        {periodType === "CUSTOM" && (
          <div className="flex items-center gap-3 pt-2 border-t border-white/5 flex-wrap">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-lime-400" />
              Rango:
            </span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs font-mono outline-none cursor-pointer focus:border-lime-400"
            />
            <span className="text-xs text-slate-500">hasta</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs font-mono outline-none cursor-pointer focus:border-lime-400"
            />
          </div>
        )}
      </div>

      {isLoading || !summary ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card-surface p-6 rounded-3xl border border-white/8 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <div className="space-y-3 pt-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
            <div className="lg:col-span-2 card-surface p-6 rounded-3xl border border-white/8 space-y-4">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Key KPI Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <StatCard
              label="Tasa de Asistencia"
              value={`${summary.attendanceRate}%`}
              sub={`${summary.presentCount + summary.lateCount} de ${summary.totalRecords} esperadas`}
              icon={TrendingUp}
              variant="primary"
              trend={{ value: `${summary.attendanceRate}% global`, isPositive: summary.attendanceRate >= 80 }}
            />
            <StatCard
              label="Puntualidad Oficial"
              value={`${summary.punctualPercentage}%`}
              sub={`${summary.presentCount} ingresos dentro de tolerancia`}
              icon={Award}
              variant="success"
              trend={{ value: `${summary.punctualPercentage}% puntual`, isPositive: summary.punctualPercentage >= 75 }}
            />
            <StatCard
              label="Tardanzas Acumuladas"
              value={`${summary.totalLateMinutes}m`}
              sub={`En ${summary.lateCount} eventos de retraso`}
              icon={Clock}
              variant="warning"
            />
            <StatCard
              label="Abandonos de Puesto"
              value={summary.abandonedCount}
              sub={`${summary.abandonedCount} incidencias registradas`}
              icon={AlertTriangle}
              variant={summary.abandonedCount > 0 ? "danger" : "default"}
            />
          </div>

          {/* ── Visual Heatmaps & Peak Hours Analytics ──────────────── */}
          {heatmapData && (
            <AttendanceHeatmap
              matrix={heatmapData.peakHoursMatrix}
              locationPatterns={heatmapData.locationPatterns}
              rolePatterns={heatmapData.rolePatterns}
              insights={heatmapData.insights}
              isLoading={isLoading}
            />
          )}

          {/* Breakdown & Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Breakdown distribution */}
            <div className="card-surface p-6 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-lime-400" />
                  Distribución de Estados
                </h3>
                <p className="text-xs text-slate-400">
                  Resumen de los {summary.totalRecords} registros del mes
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Presentes */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-medium">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Presentes Puntuales
                    </span>
                    <span className="font-bold text-white font-mono">
                      {summary.presentCount}
                    </span>
                  </div>
                  <div className="w-full bg-surface-600 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          summary.totalRecords
                            ? (summary.presentCount / summary.totalRecords) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Tardanzas */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-medium">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      Tardanzas
                    </span>
                    <span className="font-bold text-white font-mono">
                      {summary.lateCount}
                    </span>
                  </div>
                  <div className="w-full bg-surface-600 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-400 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          summary.totalRecords
                            ? (summary.lateCount / summary.totalRecords) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Ausencias */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-medium">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      Inasistencias
                    </span>
                    <span className="font-bold text-white font-mono">
                      {summary.absentCount}
                    </span>
                  </div>
                  <div className="w-full bg-surface-600 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-rose-500 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          summary.totalRecords
                            ? (summary.absentCount / summary.totalRecords) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Abandonos */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-medium">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-700" />
                      Abandonos de Perímetro
                    </span>
                    <span className="font-bold text-white font-mono">
                      {summary.abandonedCount}
                    </span>
                  </div>
                  <div className="w-full bg-surface-600 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-rose-700 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          summary.totalRecords
                            ? (summary.abandonedCount / summary.totalRecords) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
                </div>
              </div>

              {summary.lateSeverity && (
                <div className="pt-2">
                  <LateSeverityChart data={summary.lateSeverity} totalLates={summary.lateCount} />
                </div>
              )}

              <div className="pt-2 border-t border-white/5">
                <button
                  onClick={handleOpenPdfModal}
                  className="w-full py-2.5 rounded-xl bg-lime-400/10 hover:bg-lime-400/20 text-lime-300 text-xs font-bold border border-lime-400/20 transition-all flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Ver Reporte Completo en PDF
                </button>
              </div>
            </div>

            {/* Daily timeline trend */}
            <div className="lg:col-span-2 flex flex-col">
              {(!summary.dailyBreakdown || summary.dailyBreakdown.length === 0) ? (
                <div className="card-surface p-6 h-full flex flex-col justify-center">
                  <EmptyState
                    icon={BarChart3}
                    title="Sin registros para este periodo"
                    description="Aún no hay marcaciones o asistencias procesadas en este rango seleccionado."
                  />
                </div>
              ) : (
                <DailyTrendChart data={summary.dailyBreakdown} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
