"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CalendarDays, CalendarOff, SearchX, CheckCircle2, Clock, Plus, XCircle, FileText, Calendar, RefreshCw, Umbrella, Stethoscope, HeartHandshake, Baby, Trash2, Check, X, AlertCircle, ExternalLink, FolderTree, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { FilterToolbar } from "@/components/ui/FilterToolbar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/providers/ToastProvider";
import { useConfirm } from "@/providers/ConfirmDialogProvider";
import { ModalShell } from "@/components/ui/ModalShell";
import { FormField, formTextareaBaseClass, getFormInputClass } from "@/components/ui/FormField";
import { AdminTimeOffModal } from "@/components/time-off/AdminTimeOffModal";
import {
  DataTableContainer,
  DataTableHeader,
  DataTableHead,
  DataTableBody,
  DataTableRow,
  DataTableCell,
  DataTableEmptyState,
  DataTablePagination,
} from "@/components/ui/DataTable";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { ActionButton, ActionButtonGroup } from "@/components/ui/ActionButton";

interface TimeOffItem {
  id: string;
  userId: string;
  type: "VACACIONES" | "DESCANSO_MEDICO" | "PERMISO_PERSONAL" | "MATERNIDAD_PATERNIDAD" | "LUTO";
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  startDate: string;
  endDate: string;
  reason: string | null;
  documentUrl: string | null;
  rejectionReason: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    photoUrl: string | null;
    department?: {
      name: string;
    } | null;
  };
}

const TYPE_CONFIG = {
  VACACIONES: {
    label: "Vacaciones",
    icon: Umbrella,
    color: "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20",
  },
  DESCANSO_MEDICO: {
    label: "Descanso Médico",
    icon: Stethoscope,
    color: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20",
  },
  PERMISO_PERSONAL: {
    label: "Permiso Personal",
    icon: CalendarDays,
    color: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  },
  MATERNIDAD_PATERNIDAD: {
    label: "Maternidad / Paternidad",
    icon: Baby,
    color: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20",
  },
  LUTO: {
    label: "Licencia por Luto",
    icon: HeartHandshake,
    color: "bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 border-surface-200 dark:border-surface-700",
  },
};

export default function AusenciasPage() {
  const [requests, setRequests] = useState<TimeOffItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<"REQUESTS" | "KARDEX">("REQUESTS");
  const [kardexList, setKardexList] = useState<Array<{
    userId: string;
    fullName: string;
    email: string;
    documentId?: string | null;
    departmentName: string;
    locationName: string;
    vacationDaysPerYear: number;
    vacationDaysAdjustment: number;
    totalAssigned: number;
    daysTaken: number;
    pendingDays: number;
    availableDays: number;
  }>>([]);
  const [kardexYear, setKardexYear] = useState<number>(new Date().getFullYear());
  const [isLoadingKardex, setIsLoadingKardex] = useState(false);
  const [editingKardexUser, setEditingKardexUser] = useState<{
    userId: string;
    fullName: string;
    vacationDaysPerYear: number;
    vacationDaysAdjustment: number;
  } | null>(null);
  const [isSavingKardex, setIsSavingKardex] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [serverMetrics, setServerMetrics] = useState<{
    pending: number;
    approved: number;
    rejected: number;
    activeToday: number;
  } | null>(null);

  // Rejection modal state
  const [rejectingRequest, setRejectingRequest] = useState<TimeOffItem | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const { toast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((deptData) => {
        if (deptData.departments) setDepartments(deptData.departments);
      })
      .catch((err) => console.error("Error loading departments:", err));
  }, []);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(pageSize),
      });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (departmentFilter !== "ALL") params.set("departmentId", departmentFilter);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const res = await fetch(`/api/time-off?${params.toString()}`);
      const data = await res.json();
      if (data.requests) {
        setRequests(data.requests);
      }
      if (data.pagination) {
        setPagination(data.pagination);
      }
      if (data.metrics) {
        setServerMetrics(data.metrics);
      }
    } catch (err) {
      console.error("Error loading time off requests:", err);
      toast.error("Error al cargar las solicitudes de ausencia");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentPage, pageSize, statusFilter, typeFilter, departmentFilter, debouncedSearch]);

  const filteredRequests = requests;
  const totalPages = pagination.totalPages;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRequests = requests;

  // Statistics
  const stats = serverMetrics || { pending: 0, approved: 0, rejected: 0, activeToday: 0 };

  // Quick Approve
  const handleApprove = async (req: TimeOffItem) => {
    const ok = await confirm({
      title: "¿Aprobar solicitud de ausencia?",
      description: `Se autorizará la ausencia de ${req.user?.firstName} ${req.user?.lastName} del ${new Date(req.startDate).toLocaleDateString("es-PE", { timeZone: "UTC" })} al ${new Date(req.endDate).toLocaleDateString("es-PE", { timeZone: "UTC" })}. El sistema no generará penalidades de falta en esas fechas.`,
      confirmText: "Aprobar Solicitud",
      variant: "primary",
    });

    if (!ok) return;

    try {
      const res = await fetch(`/api/time-off/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al aprobar");
      }

      toast.success("Solicitud aprobada con éxito");
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la aprobación");
    }
  };

  // Submit Rejection
  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRequest) return;

    try {
      setIsRejecting(true);
      const res = await fetch(`/api/time-off/${rejectingRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT",
          rejectionReason: rejectionReasonText.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al rechazar");
      }

      toast.info("Solicitud rechazada");
      setRejectingRequest(null);
      setRejectionReasonText("");
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || "Error al rechazar");
    } finally {
      setIsRejecting(false);
    }
  };

  const fetchKardex = async () => {
    try {
      setIsLoadingKardex(true);
      const res = await fetch("/api/time-off/kardex");
      const data = await res.json();
      if (res.ok && data.kardex) {
        setKardexList(data.kardex);
        if (data.year) setKardexYear(data.year);
      }
    } catch {
      toast.error("Error al cargar el kardex vacacional");
    } finally {
      setIsLoadingKardex(false);
    }
  };

  useEffect(() => {
    if (activeView === "KARDEX" && kardexList.length === 0) {
      void fetchKardex();
    }
  }, [activeView]);

  const handleSaveKardex = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKardexUser) return;
    try {
      setIsSavingKardex(true);
      const res = await fetch("/api/time-off/kardex", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingKardexUser.userId,
          vacationDaysPerYear: Number(editingKardexUser.vacationDaysPerYear),
          vacationDaysAdjustment: Number(editingKardexUser.vacationDaysAdjustment),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      toast.success("Saldo vacacional actualizado");
      setEditingKardexUser(null);
      await fetchKardex();
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar saldo");
    } finally {
      setIsSavingKardex(false);
    }
  };

  // Delete Request
  const handleDelete = async (req: TimeOffItem) => {
    const ok = await confirm({
      title: "¿Eliminar registro de solicitud?",
      description: `Esta acción removerá permanentemente la solicitud de ${req.user?.firstName} ${req.user?.lastName}.`,
      confirmText: "Eliminar",
      variant: "danger",
    });

    if (!ok) return;

    try {
      const res = await fetch(`/api/time-off/${req.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar");
      }

      toast.success("Solicitud eliminada");
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar");
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in-up pb-10">
      {/* 1. Header */}
      <PageHeader
        title="Gestión de Permisos y Ausencias"
        titleBadge={
          stats.pending > 0 ? (
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap animate-pulse">
              {stats.pending} {stats.pending === 1 ? "Pendiente" : "Pendientes"}
            </span>
          ) : (
            <span className="text-[10px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
              Al Día
            </span>
          )
        }
        subtitle="Aprueba o rechaza solicitudes de vacaciones, permisos y descansos médicos con justificación oficial."
        icon={CalendarOff}
        iconVariant="emerald"
        actionButtons={
          <>
            <Button
              variant="secondary"
              onClick={fetchRequests}
              isLoading={isLoading}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Actualizar
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Nueva Solicitud
            </Button>
          </>
        }
      />

      {/* 2. View Switcher Tabs */}
      <div className="inline-flex p-1 rounded-xl bg-surface-100 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700">
        <button
          type="button"
          onClick={() => setActiveView("REQUESTS")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeView === "REQUESTS"
              ? "bg-white dark:bg-surface-900 text-surface-900 dark:text-white shadow-xs"
              : "text-surface-500 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200"
          }`}
        >
          Solicitudes y Permisos
        </button>
        <button
          type="button"
          onClick={() => setActiveView("KARDEX")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeView === "KARDEX"
              ? "bg-white dark:bg-surface-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
              : "text-surface-500 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200"
          }`}
        >
          <Umbrella className="w-3.5 h-3.5" />
          Kardex Vacacional {kardexYear}
        </button>
      </div>

      {activeView === "KARDEX" ? (
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-surface-200 dark:border-surface-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-surface-900 dark:text-white">
                Saldo de Vacaciones por Colaborador ({kardexYear})
              </h3>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                Cuenta corriente: Días anuales asignados + ajustes manuales menos días gozados aprobados.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchKardex}
              isLoading={isLoadingKardex}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Recalcular
            </Button>
          </div>

          {isLoadingKardex ? (
            <div className="p-6">
              <SkeletonTable rows={6} cols={6} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-50 dark:bg-surface-950/60 border-b border-surface-200 dark:border-surface-800 text-surface-500 dark:text-surface-400 uppercase font-bold">
                  <tr>
                    <th className="px-4 py-3">Colaborador</th>
                    <th className="px-4 py-3">Área / Sede</th>
                    <th className="px-4 py-3 text-center">Anual / Ajuste</th>
                    <th className="px-4 py-3 text-center">Gozados</th>
                    <th className="px-4 py-3 text-center">Pendientes</th>
                    <th className="px-4 py-3">Saldo Disponible</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {kardexList.map((row) => {
                    const pct = row.totalAssigned > 0 ? Math.min(100, Math.round((row.daysTaken / row.totalAssigned) * 100)) : 0;
                    return (
                      <tr key={row.userId} className="hover:bg-surface-50/80 dark:hover:bg-surface-800/40">
                        <td className="px-4 py-3">
                          <div className="font-bold text-surface-900 dark:text-white">{row.fullName}</div>
                          <div className="text-[11px] font-mono text-surface-500 dark:text-surface-400">{row.documentId || row.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-surface-800 dark:text-surface-200">{row.departmentName}</div>
                          <div className="text-[11px] text-surface-500 dark:text-surface-400">{row.locationName}</div>
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          <span className="font-bold text-surface-900 dark:text-white">{row.vacationDaysPerYear}d</span>
                          {row.vacationDaysAdjustment !== 0 && (
                            <span className={`ml-1 text-[11px] font-bold ${row.vacationDaysAdjustment > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                              ({row.vacationDaysAdjustment > 0 ? `+${row.vacationDaysAdjustment}` : row.vacationDaysAdjustment})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-cyan-600 dark:text-cyan-400">
                          {row.daysTaken} d
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-amber-600 dark:text-amber-400">
                          {row.pendingDays > 0 ? `${row.pendingDays} d` : "—"}
                        </td>
                        <td className="px-4 py-3 min-w-[160px]">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-mono font-black ${row.availableDays <= 3 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                              {row.availableDays} días libres
                            </span>
                            <span className="text-[10px] text-surface-500 dark:text-surface-400">{pct}% usado</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-surface-200 dark:bg-surface-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${row.availableDays <= 3 ? "bg-rose-500" : "bg-emerald-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ActionButtonGroup align="right">
                            <ActionButton
                              size="sm"
                              variant="neutral"
                              icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
                              title="Ajustar saldo de vacaciones"
                              onClick={() =>
                                setEditingKardexUser({
                                  userId: row.userId,
                                  fullName: row.fullName,
                                  vacationDaysPerYear: row.vacationDaysPerYear,
                                  vacationDaysAdjustment: row.vacationDaysAdjustment,
                                })
                              }
                            >
                              Ajustar
                            </ActionButton>
                          </ActionButtonGroup>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
      {/* 2. Operational KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pendientes"
          value={stats.pending}
          subLabel="Requieren revisión"
          icon={Clock}
          variant="amber"
          trend={stats.pending > 0 ? { value: stats.pending, label: "por revisar", isPositive: false } : undefined}
        />
        <StatCard
          label="Aprobadas"
          value={stats.approved}
          subLabel="Total históricas"
          icon={CheckCircle2}
          variant="emerald"
        />
        <StatCard
          label="Rechazadas"
          value={stats.rejected}
          subLabel="Desestimadas"
          icon={XCircle}
          variant="rose"
        />
        <StatCard
          label="Ausentes Hoy"
          value={stats.activeToday}
          subLabel="Con permiso activo hoy"
          icon={Calendar}
          variant="indigo"
        />
      </section>

      {/* 3. Search & Filter Bar */}
      <FilterToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por colaborador, correo o departamento..."
        onReset={() => {
          setSearch("");
          setDebouncedSearch("");
          setStatusFilter("ALL");
          setTypeFilter("ALL");
          setDepartmentFilter("ALL");
          setCurrentPage(1);
        }}
        filters={[
          {
            id: "status",
            value: statusFilter,
            onChange: (val) => { setStatusFilter(val); setCurrentPage(1); },
            options: [
              { value: "ALL", label: "Todos los estados" },
              { value: "PENDING", label: "Pendientes" },
              { value: "APPROVED", label: "Aprobados" },
              { value: "REJECTED", label: "Rechazados" },
            ],
          },
          {
            id: "type",
            value: typeFilter,
            onChange: (val) => { setTypeFilter(val); setCurrentPage(1); },
            options: [
              { value: "ALL", label: "Todos los tipos" },
              { value: "VACACIONES", label: "Vacaciones" },
              { value: "DESCANSO_MEDICO", label: "Descanso Médico" },
              { value: "PERMISO_PERSONAL", label: "Permiso Personal" },
              { value: "MATERNIDAD_PATERNIDAD", label: "Maternidad/Paternidad" },
              { value: "LUTO", label: "Licencia por Luto" },
            ],
          },
          {
            id: "department",
            icon: FolderTree,
            value: departmentFilter,
            onChange: (val) => { setDepartmentFilter(val); setCurrentPage(1); },
            options: [
              { value: "ALL", label: "Todos los departamentos" },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ],
          },
        ]}
      />

      {/* 4. Main Data Table */}
      {isLoading ? (
        <SkeletonTable rows={7} cols={6} />
      ) : (
        <DataTableContainer
          footer={
            <DataTablePagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={pagination.total}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              itemLabel="solicitudes de ausencia"
            />
          }
        >
          <DataTableHeader>
            <DataTableHead>Colaborador</DataTableHead>
            <DataTableHead>Tipo de Ausencia</DataTableHead>
            <DataTableHead>Fechas y Duración</DataTableHead>
            <DataTableHead>Motivo / Sustento</DataTableHead>
            <DataTableHead align="center">Estado</DataTableHead>
            <DataTableHead align="right">Acciones</DataTableHead>
          </DataTableHeader>
          <DataTableBody>
            {paginatedRequests.length === 0 ? (
              <DataTableEmptyState
                colSpan={6}
                icon={search || statusFilter !== "ALL" || typeFilter !== "ALL" ? SearchX : CalendarOff}
                message={
                  search || statusFilter !== "ALL" || typeFilter !== "ALL"
                    ? "No se encontraron solicitudes con los filtros seleccionados."
                    : "No hay solicitudes de permiso o ausencia registradas."
                }
              />
            ) : (
              paginatedRequests.map((req) => {
                const typeConf = TYPE_CONFIG[req.type] || TYPE_CONFIG.VACACIONES;
                const TypeIcon = typeConf.icon;

                const startDateObj = new Date(req.startDate);
                const endDateObj = new Date(req.endDate);

                const startFormatted = startDateObj.toLocaleDateString("es-PE", {
                  day: "2-digit",
                  month: "short",
                  timeZone: "UTC",
                });
                const endFormatted = endDateObj.toLocaleDateString("es-PE", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                });

                // Calculate days count
                const diffDays =
                  Math.round(
                    (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)
                  ) + 1;

                const userInitials = req.user
                  ? `${req.user.firstName?.[0] || ""}${req.user.lastName?.[0] || ""}`.toUpperCase() || "U"
                  : "U";

                return (
                  <DataTableRow key={req.id}>
                    {/* Colaborador */}
                    <DataTableCell>
                      <div className="flex items-center gap-3">
                        {req.user?.photoUrl ? (
                          <img
                            src={req.user.photoUrl}
                            alt="Avatar"
                            className="w-9 h-9 rounded-xl object-cover ring-1 ring-surface-200 dark:ring-surface-700 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                            {userInitials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-surface-900 dark:text-white leading-tight truncate">
                            {req.user?.firstName} {req.user?.lastName}
                          </div>
                          <div className="text-[11px] text-surface-500 dark:text-surface-400 font-mono truncate">
                            {req.user?.email}
                          </div>
                          {req.user?.department?.name && (
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] font-semibold bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                              {req.user.department.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </DataTableCell>

                    {/* Tipo */}
                    <DataTableCell>
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border ${typeConf.color}`}
                      >
                        <TypeIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{typeConf.label}</span>
                      </div>
                    </DataTableCell>

                    {/* Fechas */}
                    <DataTableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-surface-900 dark:text-surface-100 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-primary-500" />
                          {startFormatted} — {endFormatted}
                        </span>
                        <span className="text-[11px] font-mono text-surface-500 dark:text-surface-400 mt-0.5">
                          {diffDays} {diffDays === 1 ? "día calendario" : "días calendario"}
                        </span>
                      </div>
                    </DataTableCell>

                    {/* Motivo */}
                    <DataTableCell className="max-w-xs">
                      <div className="text-xs text-surface-700 dark:text-surface-300 leading-snug">
                        {req.reason ? (
                          <p className="line-clamp-2">{req.reason}</p>
                        ) : (
                          <span className="text-surface-500 dark:text-surface-400 italic">Sin observaciones</span>
                        )}
                      </div>
                      {req.rejectionReason && (
                        <p className="text-[11px] text-danger-600 dark:text-danger-400 mt-1 font-medium">
                          Motivo rechazo: {req.rejectionReason}
                        </p>
                      )}
                      {req.documentUrl && (
                        <a
                          href={req.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline mt-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Ver Sustento</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </a>
                      )}
                    </DataTableCell>

                    {/* Estado */}
                    <DataTableCell align="center">
                      {req.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                          <Clock className="w-3.5 h-3.5" />
                          Pendiente
                        </span>
                      )}
                      {req.status === "APPROVED" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Aprobado
                        </span>
                      )}
                      {req.status === "REJECTED" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                          <XCircle className="w-3.5 h-3.5" />
                          Rechazado
                        </span>
                      )}
                      {req.status === "CANCELLED" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 border border-surface-200 dark:border-surface-700">
                          <X className="w-3.5 h-3.5" />
                          Cancelado
                        </span>
                      )}
                    </DataTableCell>

                    {/* Acciones */}
                    <DataTableCell align="right">
                      <ActionButtonGroup align="right">
                        {req.status === "PENDING" ? (
                          <>
                            <ActionButton
                              size="sm"
                              variant="success"
                              icon={<Check className="w-3.5 h-3.5" />}
                              title="Aprobar solicitud"
                              onClick={() => handleApprove(req)}
                            >
                              Aprobar
                            </ActionButton>
                            <ActionButton
                              size="sm"
                              variant="danger"
                              icon={<X className="w-3.5 h-3.5" />}
                              title="Rechazar solicitud"
                              onClick={() => {
                                setRejectingRequest(req);
                                setRejectionReasonText("");
                              }}
                            >
                              Rechazar
                            </ActionButton>
                          </>
                        ) : (
                          <ActionButton
                            size="sm"
                            variant="danger"
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                            title="Eliminar registro"
                            onClick={() => handleDelete(req)}
                          />
                        )}
                        {req.documentUrl && (
                          <ActionButton
                            size="sm"
                            variant="neutral"
                            icon={<FileText className="w-3.5 h-3.5" />}
                            title="Ver documento adjunto"
                            onClick={() => {
                              if (req.documentUrl) {
                                window.open(req.documentUrl, "_blank", "noopener,noreferrer");
                              }
                            }}
                          />
                        )}
                      </ActionButtonGroup>
                    </DataTableCell>
                  </DataTableRow>
                );
              })
            )}
          </DataTableBody>
        </DataTableContainer>
      )}

      {/* Admin Time Off Modal */}
      <AdminTimeOffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchRequests}
      />
        </>
      )}

      {/* Modal de Ajuste de Saldo Vacacional */}
      {editingKardexUser && (
        <ModalShell
          isOpen={Boolean(editingKardexUser)}
          onClose={() => setEditingKardexUser(null)}
          title="Ajustar Saldo Vacacional"
          description={`Colaborador: ${editingKardexUser.fullName}`}
          icon={Umbrella}
          iconVariant="success"
          maxWidth="sm"
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => setEditingKardexUser(null)} disabled={isSavingKardex}>
                Cancelar
              </Button>
              <Button type="submit" form="kardex-adjust-form" variant="primary" isLoading={isSavingKardex}>
                Guardar Saldo
              </Button>
            </>
          }
        >
          <form id="kardex-adjust-form" onSubmit={handleSaveKardex} className="space-y-4">
            <FormField
              label="Días por Año (Ej. 30 General, 15 MYPE)"
              icon={Calendar}
              required
            >
              <input
                type="number"
                min={0}
                max={60}
                value={editingKardexUser.vacationDaysPerYear}
                onChange={(e) =>
                  setEditingKardexUser((prev) =>
                    prev ? { ...prev, vacationDaysPerYear: Number(e.target.value) } : null
                  )
                }
                className={getFormInputClass({ hasLeftIcon: true, className: "font-mono font-bold" })}
              />
            </FormField>
            <FormField
              label="Ajuste Manual (+/- Días acumulados o descontados)"
              icon={SlidersHorizontal}
            >
              <input
                type="number"
                min={-60}
                max={60}
                value={editingKardexUser.vacationDaysAdjustment}
                onChange={(e) =>
                  setEditingKardexUser((prev) =>
                    prev ? { ...prev, vacationDaysAdjustment: Number(e.target.value) } : null
                  )
                }
                className={getFormInputClass({ hasLeftIcon: true, className: "font-mono font-bold" })}
              />
            </FormField>
          </form>
        </ModalShell>
      )}

      {/* Rejection Prompt Modal */}
      {rejectingRequest && (
        <ModalShell
          isOpen={!!rejectingRequest}
          onClose={() => setRejectingRequest(null)}
          title="Rechazar Solicitud"
          description={`Colaborador: ${rejectingRequest.user?.firstName} ${rejectingRequest.user?.lastName}`}
          icon={AlertCircle}
          iconVariant="danger"
          maxWidth="md"
          footer={
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRejectingRequest(null)}
                disabled={isRejecting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="rejection-form"
                variant="danger"
                isLoading={isRejecting}
              >
                Confirmar Rechazo
              </Button>
            </>
          }
        >
          <form id="rejection-form" onSubmit={handleConfirmReject} className="space-y-4">
            <FormField label="Motivo de Rechazo" icon={FileText} optional>
              <textarea
                value={rejectionReasonText}
                onChange={(e) => setRejectionReasonText(e.target.value)}
                placeholder="Ej: Coincide con cierre de auditoría o cruce con otro turno clave..."
                rows={3}
                className={`${formTextareaBaseClass} pl-10`}
              />
            </FormField>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
