"use client";

import { useState, useEffect, useMemo } from "react";
import {
  FileSpreadsheet,
  Users,
  Search,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { clsx } from "clsx";
import { ModalShell } from "@/components/ui/ModalShell";

export type StatusFilter = "ALL" | "PRESENTE" | "TARDE" | "JUSTIFICADO" | "AUSENTE" | "ABANDONO_PUESTO";

interface AttendanceRecord {
  id: string;
  date: string;
  entryTime: string | null;
  exitTime: string | null;
  workedMinutes: number | null;
  lateMinutes: number | null;
  status: string;
  notes: string | null;
  statusChangedBy: string | null;
  user: {
    firstName: string;
    lastName: string;
    documentId: string | null;
    email: string;
    role: string;
  };
  location: {
    name: string;
  } | null;
  kiosk: {
    name: string;
  } | null;
}

interface NominalBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodLabel: string;
  attendances: AttendanceRecord[];
  initialStatusFilter?: StatusFilter;
}

export function NominalBreakdownModal({
  isOpen,
  onClose,
  periodLabel,
  attendances,
  initialStatusFilter = "ALL",
}: NominalBreakdownModalProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter);

  useEffect(() => {
    if (isOpen) {
      setStatusFilter(initialStatusFilter);
      setSearch("");
    }
  }, [isOpen, initialStatusFilter]);

  // Counts by status
  const counts = useMemo(() => {
    const res = {
      ALL: attendances.length,
      PRESENTE: 0,
      TARDE: 0,
      JUSTIFICADO: 0,
      AUSENTE: 0,
      ABANDONO_PUESTO: 0,
    };
    attendances.forEach((a) => {
      if (a.status === "PRESENTE") res.PRESENTE++;
      else if (a.status === "TARDE") res.TARDE++;
      else if (a.status === "JUSTIFICADO" || a.status === "PERMISO") res.JUSTIFICADO++;
      else if (a.status === "AUSENTE") res.AUSENTE++;
      else if (a.status === "ABANDONO_PUESTO") res.ABANDONO_PUESTO++;
    });
    return res;
  }, [attendances]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return attendances.filter((record) => {
      // Status filter
      let matchesStatus = true;
      if (statusFilter === "PRESENTE") matchesStatus = record.status === "PRESENTE";
      else if (statusFilter === "TARDE") matchesStatus = record.status === "TARDE";
      else if (statusFilter === "JUSTIFICADO") matchesStatus = record.status === "JUSTIFICADO" || record.status === "PERMISO";
      else if (statusFilter === "AUSENTE") matchesStatus = record.status === "AUSENTE";
      else if (statusFilter === "ABANDONO_PUESTO") matchesStatus = record.status === "ABANDONO_PUESTO";

      if (!matchesStatus) return false;

      // Text search
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const fullName = `${record.user.firstName} ${record.user.lastName}`.toLowerCase();
      const doc = (record.user.documentId || "").toLowerCase();
      const loc = (record.location?.name || "").toLowerCase();
      const email = (record.user.email || "").toLowerCase();

      return fullName.includes(q) || doc.includes(q) || loc.includes(q) || email.includes(q);
    });
  }, [attendances, statusFilter, search]);

  const handleExportTableCsv = () => {
    if (!filteredRecords.length) return;

    const headers = ["Fecha", "DNI/Documento", "Colaborador", "Rol", "Sede", "Hora Entrada", "Hora Salida", "Tardanza (min)", "Horas Trabajadas", "Estado", "Notas"];
    const rows = filteredRecords.map((r) => {
      const fecha = r.date ? format(parseISO(r.date), "dd/MM/yyyy") : "";
      const dni = r.user.documentId || "";
      const nombre = `"${r.user.firstName} ${r.user.lastName}"`;
      const rol = r.user.role;
      const sede = `"${r.location?.name || "Sin sede"}"`;
      const entrada = r.entryTime ? format(parseISO(r.entryTime), "HH:mm:ss") : "--:--";
      const salida = r.exitTime ? format(parseISO(r.exitTime), "HH:mm:ss") : "--:--";
      const tardanza = r.lateMinutes || 0;
      const horasTrab = r.workedMinutes ? (r.workedMinutes / 60).toFixed(1) : "0.0";
      const estado = r.status;
      const notas = `"${(r.notes || "").replace(/"/g, '""')}"`;

      return [fecha, dni, nombre, rol, sede, entrada, salida, tardanza, horasTrab, estado, notas].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `desglose_nominal_${statusFilter.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string, lateMinutes: number | null) => {
    switch (status) {
      case "PRESENTE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-success-50 dark:bg-success-500/15 text-success-700 dark:text-success-400 border border-success-200 dark:border-success-500/30 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-success-500 dark:bg-success-400"></span>
            Puntual
          </span>
        );
      case "TARDE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-warning-50 dark:bg-warning-500/15 text-warning-700 dark:text-warning-400 border border-warning-200 dark:border-warning-500/30 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-warning-500 dark:bg-warning-400"></span>
            Tardanza (+{lateMinutes || 0}m)
          </span>
        );
      case "JUSTIFICADO":
      case "PERMISO":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-info-50 dark:bg-info-500/15 text-info-700 dark:text-info-300 border border-info-200 dark:border-info-500/30 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-info-500 dark:bg-info-400"></span>
            Justificado
          </span>
        );
      case "ABANDONO_PUESTO":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-danger-50 dark:bg-danger-500/20 text-danger-700 dark:text-danger-300 border border-danger-200 dark:border-danger-500/30 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-danger-500 dark:bg-danger-400"></span>
            Abandono
          </span>
        );
      case "AUSENTE":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-danger-50 dark:bg-danger-500/15 text-danger-700 dark:text-danger-400 border border-danger-200 dark:border-danger-500/30 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-danger-500 dark:bg-danger-400"></span>
            Inasistencia
          </span>
        );
    }
  };

  if (!isOpen) return null;

  const footer = (
    <div className="flex items-center justify-between w-full">
      <p className="text-[11px] text-surface-500 dark:text-slate-400">
        Mostrando <span className="text-surface-900 dark:text-white font-bold">{filteredRecords.length}</span> de <span className="text-surface-900 dark:text-white font-bold">{attendances.length}</span> registros nominales.
      </p>
      <button
        onClick={onClose}
        className="h-9 px-6 rounded-xl bg-surface-100 dark:bg-white/10 hover:bg-surface-200 dark:hover:bg-white/15 text-surface-900 dark:text-white font-semibold text-xs transition-colors cursor-pointer"
      >
        Cerrar
      </button>
    </div>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          Desglose Nominal Detallado
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-500/30 font-normal">
            {periodLabel}
          </span>
        </span>
      }
      description="Auditoría nominal con identificación de colaboradores, horarios de marcación y estado de asistencia."
      icon={Users}
      iconVariant="primary"
      maxWidth="6xl"
      footer={footer}
    >
      <div className="flex flex-col h-[70vh]">
        {/* Toolbar & Filters */}
        <div className="pb-4 mb-4 border-b border-surface-200 dark:border-white/5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar p-1 bg-surface-100 dark:bg-black/40 rounded-xl border border-surface-200 dark:border-white/5 text-xs">
            {[
              { id: "ALL", label: `Todos (${counts.ALL})` },
              { id: "PRESENTE", label: `Puntuales (${counts.PRESENTE})` },
              { id: "TARDE", label: `Tardanzas (${counts.TARDE})` },
              { id: "JUSTIFICADO", label: `Justificados (${counts.JUSTIFICADO})` },
              { id: "AUSENTE", label: `Inasistencias (${counts.AUSENTE})` },
              { id: "ABANDONO_PUESTO", label: `Abandonos (${counts.ABANDONO_PUESTO})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as StatusFilter)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer",
                  statusFilter === tab.id
                    ? tab.id === "PRESENTE"
                      ? "bg-success-100 dark:bg-success-500/20 text-success-700 dark:text-success-400 border border-success-300 dark:border-success-500/30 shadow-sm"
                      : tab.id === "TARDE"
                      ? "bg-warning-100 dark:bg-warning-500/20 text-warning-700 dark:text-warning-400 border border-warning-300 dark:border-warning-500/30 shadow-sm"
                      : tab.id === "AUSENTE" || tab.id === "ABANDONO_PUESTO"
                      ? "bg-danger-100 dark:bg-danger-500/20 text-danger-700 dark:text-danger-300 border border-danger-300 dark:border-danger-500/30 shadow-sm"
                      : "bg-white dark:bg-slate-800 text-surface-900 dark:text-white border border-surface-300 dark:border-white/10 shadow-sm"
                    : "text-surface-600 dark:text-slate-400 hover:text-surface-900 dark:hover:text-white border border-transparent"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Export Action */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 sm:w-64 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400 group-focus-within:text-primary-500 transition-colors">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Buscar por colaborador, DNI..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white dark:bg-surface-950/80 border border-surface-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 shadow-sm transition"
              />
            </div>
            <button
              onClick={handleExportTableCsv}
              disabled={filteredRecords.length === 0}
              className="h-8 px-3.5 rounded-xl bg-surface-50 dark:bg-white/5 hover:bg-surface-100 dark:hover:bg-white/10 border border-surface-200 dark:border-white/10 text-surface-700 dark:text-slate-200 hover:text-surface-900 dark:hover:text-white text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shrink-0 shadow-sm"
              title="Exportar registros mostrados a CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-primary-500 dark:text-primary-400" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-16 bg-surface-50 dark:bg-white/[0.01] rounded-2xl border border-dashed border-surface-200 dark:border-white/10">
              <Users className="w-12 h-12 text-surface-400 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-surface-700 dark:text-slate-300 font-semibold text-sm">Sin registros que mostrar</p>
              <p className="text-surface-500 dark:text-slate-500 text-xs mt-1">
                {search
                  ? "No se encontraron coincidencias para tu búsqueda."
                  : "No existen asistencias registradas para el estado y período seleccionados."}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-surface-200 dark:border-white/5 overflow-hidden bg-white dark:bg-[#1A2333]/40 shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-white/10 bg-surface-50 dark:bg-surface-950/60 text-[11px] uppercase tracking-wider text-surface-500 dark:text-slate-400 font-semibold">
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Sede / Dispositivo</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Ingreso</th>
                    <th className="py-3 px-4">Salida</th>
                    <th className="py-3 px-4">Jornada</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-white/5">
                  {filteredRecords.map((r) => {
                    const fullName = `${r.user.firstName} ${r.user.lastName}`;
                    const initials = `${r.user.firstName.charAt(0)}${r.user.lastName.charAt(0)}`.toUpperCase();
                    const formattedDate = r.date ? format(parseISO(r.date), "EEE d MMM yyyy", { locale: es }) : "N/A";
                    const entryFormatted = r.entryTime ? format(parseISO(r.entryTime), "HH:mm") : "--:--";
                    const exitFormatted = r.exitTime ? format(parseISO(r.exitTime), "HH:mm") : "--:--";
                    const hoursWorked = r.workedMinutes ? `${Math.floor(r.workedMinutes / 60)}h ${r.workedMinutes % 60}m` : "--";

                    return (
                      <tr key={r.id} className="hover:bg-surface-50 dark:hover:bg-white/[0.02] transition">
                        {/* Colaborador */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-surface-900 dark:text-white truncate">{fullName}</p>
                              <p className="text-[11px] text-surface-500 dark:text-slate-400 font-mono">
                                DNI: {r.user.documentId || "No reg."} · <span className="capitalize">{r.user.role.toLowerCase()}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Sede */}
                        <td className="py-3 px-4 text-surface-700 dark:text-slate-300">
                          <div className="space-y-0.5">
                            <p className="font-medium text-surface-800 dark:text-slate-200">{r.location?.name || "Sin sede"}</p>
                            {r.kiosk && (
                              <p className="text-[10px] text-surface-500 dark:text-slate-500 font-mono">Tótem: {r.kiosk.name}</p>
                            )}
                          </div>
                        </td>

                        {/* Fecha */}
                        <td className="py-3 px-4 text-surface-700 dark:text-slate-300 font-mono capitalize">
                          {formattedDate}
                        </td>

                        {/* Entrada */}
                        <td className="py-3 px-4">
                          <span className={clsx("font-mono font-semibold", r.entryTime ? "text-primary-600 dark:text-primary-400" : "text-surface-500 dark:text-slate-500")}>
                            {entryFormatted}
                          </span>
                        </td>

                        {/* Salida */}
                        <td className="py-3 px-4">
                          <span className={clsx("font-mono font-semibold", r.exitTime ? "text-info-600 dark:text-info-400" : "text-surface-500 dark:text-slate-500")}>
                            {exitFormatted}
                          </span>
                        </td>

                        {/* Jornada */}
                        <td className="py-3 px-4 font-mono text-surface-700 dark:text-slate-300">
                          {hoursWorked}
                        </td>

                        {/* Estado */}
                        <td className="py-3 px-4">
                          {getStatusBadge(r.status, r.lateMinutes)}
                        </td>

                        {/* Notas */}
                        <td className="py-3 px-4 text-[11px] text-surface-500 dark:text-slate-400 max-w-xs truncate">
                          {r.notes || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
