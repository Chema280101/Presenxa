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
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";

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
}

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), "yyyy-MM")
  );
  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      const params = new URLSearchParams({ month: selectedMonth });
      if (selectedLocation !== "ALL") params.append("locationId", selectedLocation);

      const res = await fetch(`/api/reports/summary?${params.toString()}`);
      const data = await res.json();
      if (data) {
        setSummary(data);
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
  }, [selectedMonth, selectedLocation]);

  const handleExportCsv = () => {
    const [year, month] = selectedMonth.split("-");
    const startDate = `${selectedMonth}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${selectedMonth}-${String(lastDay).padStart(2, "0")}`;

    const params = new URLSearchParams({
      startDate,
      endDate,
    });
    if (selectedLocation !== "ALL") params.append("locationId", selectedLocation);

    window.open(`/api/reports/export?${params.toString()}`, "_blank");
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="gradient-brand w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Reportes y Analítica de Asistencia
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Métricas consolidadas de puntualidad, ausentismo y alertas de perímetro geocercado.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Month picker */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl card-surface text-white text-xs font-mono">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white outline-none cursor-pointer"
            />
          </div>

          {/* Sede selector */}
          <div className="relative">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-3 py-2.5 input-standard text-xs cursor-pointer"
            >
              <option value="ALL">Todas las Sedes</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchReports}
            title="Refrescar reporte"
            className="p-2 rounded-xl card-surface text-slate-300 hover:text-white transition-all active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
          </button>

          <button
            onClick={handleExportCsv}
            className="gradient-brand flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 hover:opacity-95 transition-all active:scale-[0.98]"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Excel / CSV
          </button>
        </div>
      </div>

      {isLoading || !summary ? (
        <div className="py-20 text-center text-slate-400 card-surface">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-400" />
          <p className="text-sm">Generando analítica consolidada del mes...</p>
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
              label="Alertas de Geocerca"
              value={summary.abandonedCount}
              sub={`${summary.abandonedCount} abandonos de puesto detectados`}
              icon={AlertTriangle}
              variant={summary.abandonedCount > 0 ? "danger" : "default"}
            />
          </div>

          {/* Breakdown & Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Breakdown distribution */}
            <div className="card-surface p-6 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
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
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      Tardanzas
                    </span>
                    <span className="font-bold text-white font-mono">
                      {summary.lateCount}
                    </span>
                  </div>
                  <div className="w-full bg-surface-600 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all duration-500"
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

                {/* Ausentes */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-medium">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      Ausentes / Faltas
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
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                      Abandonos de Puesto
                    </span>
                    <span className="font-bold text-white font-mono">
                      {summary.abandonedCount}
                    </span>
                  </div>
                  <div className="w-full bg-surface-600 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-rose-600 h-2 rounded-full transition-all duration-500"
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

                {/* Justificados */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-medium">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                      Justificados / Permisos
                    </span>
                    <span className="font-bold text-white font-mono">
                      {summary.justifiedCount}
                    </span>
                  </div>
                  <div className="w-full bg-surface-600 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-sky-500 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          summary.totalRecords
                            ? (summary.justifiedCount / summary.totalRecords) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Daily History Table / Breakdown */}
            <div className="lg:col-span-2 card-surface p-6 overflow-hidden flex flex-col justify-between">
              <div className="mb-4">
                <h3 className="text-base font-bold text-white mb-1">
                  Desglose Diario del Mes
                </h3>
                <p className="text-xs text-slate-400">
                  Comportamiento histórico día por día
                </p>
              </div>

              <div className="overflow-x-auto max-h-72 overflow-y-auto pr-1">
                {summary.dailyBreakdown.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No hay registros de asistencia acumulados en este mes.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400">
                        <th className="pb-2.5">Fecha</th>
                        <th className="pb-2.5 text-center">Presentes</th>
                        <th className="pb-2.5 text-center">Tardanzas</th>
                        <th className="pb-2.5 text-center">Ausencias</th>
                        <th className="pb-2.5 text-center">Abandono</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {summary.dailyBreakdown.map((row) => (
                        <tr key={row.date} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 font-mono text-slate-300">
                            {row.date}
                          </td>
                          <td className="py-2.5 text-center font-semibold text-emerald-400 font-mono">
                            {row.present}
                          </td>
                          <td className="py-2.5 text-center font-semibold text-amber-400 font-mono">
                            {row.late}
                          </td>
                          <td className="py-2.5 text-center font-semibold text-rose-400 font-mono">
                            {row.absent}
                          </td>
                          <td className="py-2.5 text-center font-semibold text-rose-500 font-mono">
                            {row.abandoned}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Empleados en Base:{" "}
                  <strong className="text-white font-mono">{summary.totalUsers}</strong>
                </span>
                <button
                  onClick={handleExportCsv}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors"
                >
                  Descargar Reporte Completo &rarr;
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
