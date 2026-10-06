"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ShieldAlert,
  RefreshCw,
  Clock,
  User,
  Activity,
  FileText,
  Eye,
  CheckCircle2,
  Edit3,
  Server,
  Layers,
  Building,
  Monitor,
} from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { FilterToolbar } from "@/components/ui/FilterToolbar";
import { StatCard } from "@/components/ui/StatCard";
import { SkeletonStatCard, SkeletonTable } from "@/components/ui/Skeleton";
import { ActionButton } from "@/components/ui/ActionButton";
import {
  DataTableContainer,
  DataTableHeader,
  DataTableHead,
  DataTableBody,
  DataTableRow,
  DataTableCell,
  DataTableEmptyState,
} from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import {
  AuditDetailModal,
  AuditLogDetailItem,
} from "@/components/audit/AuditDetailModal";

// Diccionario de acciones en español
const ACTION_TRANSLATIONS: Record<
  string,
  { label: string; badgeClass: string }
> = {
  ATTENDANCE_SCANNED: {
    label: "Escaneo de Asistencia",
    badgeClass:
      "bg-primary-50 text-primary-700 border-primary-200/80 dark:bg-primary-500/10 dark:text-primary-300 dark:border-primary-500/30",
  },
  ATTENDANCE_STATUS_CHANGED: {
    label: "Cambio de Estado",
    badgeClass:
      "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
  },
  ATTENDANCE_JUSTIFIED: {
    label: "Justificación de Asistencia",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  ATTENDANCE_EDITED_MANUAL: {
    label: "Edición Manual Asistencia",
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  },
  QR_GENERATED: {
    label: "Generación de QR",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  QR_REGENERATED: {
    label: "Regeneración de QR",
    badgeClass:
      "bg-primary-50 text-primary-700 border-primary-200/80 dark:bg-primary-500/10 dark:text-primary-300 dark:border-primary-500/30",
  },
  QR_INVALIDATED: {
    label: "Revocación de QR",
    badgeClass:
      "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
  },
  USER_CREATED: {
    label: "Creación de Usuario",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  USER_UPDATED: {
    label: "Modificación de Usuario",
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  },
  USER_DEACTIVATED: {
    label: "Desactivación de Usuario",
    badgeClass:
      "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
  },
  JOB_EXECUTED: {
    label: "Proceso del Sistema (Cron)",
    badgeClass:
      "bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30",
  },
  TIME_OFF_REQUESTED: {
    label: "Solicitud de Permiso",
    badgeClass:
      "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
  },
  TIME_OFF_APPROVED: {
    label: "Permiso Aprobado",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  TIME_OFF_REJECTED: {
    label: "Permiso Rechazado",
    badgeClass:
      "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
  },
};

// Traducción de tipos de entidades en español
const ENTITY_CONFIG: Record<string, { label: string; icon: any }> = {
  USER: { label: "Usuario", icon: User },
  ATTENDANCE: { label: "Asistencia", icon: Clock },
  LOCATION: { label: "Sede", icon: Building },
  KIOSK: { label: "Kiosko", icon: Monitor },
  SCHEDULE: { label: "Horario", icon: FileText },
  SYSTEM: { label: "Sistema", icon: Server },
};

// Diccionario de campos para resumen limpio
const FIELD_TRANSLATIONS: Record<string, string> = {
  status: "Estado",
  entryTime: "Entrada",
  exitTime: "Salida",
  entryTime2: "Entrada Refrigerio",
  exitTime2: "Salida Refrigerio",
  notes: "Motivo",
  lateMinutes: "Tardanza",
  role: "Rol",
  firstName: "Nombre",
  lastName: "Apellido",
  isActive: "Activo",
  email: "Correo",
  locationId: "Sede",
};

export default function AuditoriaPage() {
  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data, isLoading, mutate } = useSWR("/api/auditoria", fetcher, {
    revalidateOnFocus: true,
  });

  const logs: AuditLogDetailItem[] = data?.logs || [];

  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("ALL");
  const [selectedEntity, setSelectedEntity] = useState<string>("ALL");

  // Modal de Detalle
  const [selectedLog, setSelectedLog] = useState<AuditLogDetailItem | null>(
    null
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Métricas calculadas para las StatCards
  const metrics = useMemo(() => {
    const total = logs.length;
    const manualEdits = logs.filter(
      (l) =>
        l.action === "ATTENDANCE_EDITED_MANUAL" || l.action === "USER_UPDATED"
    ).length;
    const justifications = logs.filter(
      (l) => l.action === "ATTENDANCE_JUSTIFIED"
    ).length;
    const systemJobs = logs.filter(
      (l) => !l.user || l.action === "JOB_EXECUTED"
    ).length;

    return { total, manualEdits, justifications, systemJobs };
  }, [logs]);

  // Filtrado reactivo en español
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const actorName = log.user
        ? `${log.user.firstName} ${log.user.lastName}`.toLowerCase()
        : "sistema automático";
      const targetName = (log.targetName || "").toLowerCase();
      const targetDetail = (log.targetDetail || "").toLowerCase();
      const actionText = (
        ACTION_TRANSLATIONS[log.action]?.label || log.action
      ).toLowerCase();
      const entityText = (
        ENTITY_CONFIG[log.entityType]?.label || log.entityType
      ).toLowerCase();

      const term = search.toLowerCase();
      const matchesSearch =
        !search ||
        actorName.includes(term) ||
        targetName.includes(term) ||
        targetDetail.includes(term) ||
        actionText.includes(term) ||
        entityText.includes(term) ||
        (log.entityId && log.entityId.toLowerCase().includes(term));

      const matchesAction =
        selectedAction === "ALL" || log.action === selectedAction;
      const matchesEntity =
        selectedEntity === "ALL" || log.entityType === selectedEntity;

      return matchesSearch && matchesAction && matchesEntity;
    });
  }, [logs, search, selectedAction, selectedEntity]);

  const handleOpenDetail = (log: AuditLogDetailItem) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  // Renderizador resumen de cambios para la celda de la tabla
  const renderQuickSummary = (log: AuditLogDetailItem) => {
    const oldData = log.oldData;
    const newData = log.newData;

    if (!oldData && !newData) {
      return (
        <span className="text-[11px] text-surface-400 italic">
          Sin modificaciones de datos
        </span>
      );
    }

    const changedKeys = Array.from(
      new Set([
        ...Object.keys(oldData || {}),
        ...Object.keys(newData || {}),
      ])
    ).slice(0, 3); // Mostramos los primeros 3 cambios en la tabla

    return (
      <div className="flex flex-wrap gap-1.5 items-center">
        {changedKeys.map((key) => {
          const label = FIELD_TRANSLATIONS[key] || key;
          const newVal = newData ? newData[key] : undefined;
          return (
            <span
              key={key}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 border border-surface-200 dark:border-surface-700"
            >
              <span className="font-semibold text-surface-900 dark:text-surface-100">
                {label}:
              </span>
              <span className="truncate max-w-[90px]">
                {newVal !== undefined ? String(newVal) : "—"}
              </span>
            </span>
          );
        })}
        {changedKeys.length > 3 && (
          <span className="text-[10px] text-surface-400 font-mono">
            +{changedKeys.length - 3} más
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in-up pb-10">
      {/* ── Encabezado Principal ────────────────────────────────────────── */}
      <PageHeader
        title="Auditoría de Sistema"
        subtitle="Monitoreo transparente de todas las acciones de seguridad, modificaciones manuales y procesos automáticos."
        icon={ShieldAlert}
        iconVariant="emerald"
        actionButtons={
          <Button
            variant="secondary"
            onClick={() => mutate()}
            isLoading={isLoading}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Actualizar Historial
          </Button>
        }
      />

      {/* ── Tarjetas de Métricas (StatCards) ────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total de Eventos Auditados"
            value={metrics.total}
            subLabel="Registros recientes en el sistema"
            icon={ShieldAlert}
            variant="emerald"
          />
          <StatCard
            label="Ediciones Manuales"
            value={metrics.manualEdits}
            subLabel="Modificaciones de asistencia y usuarios"
            icon={Edit3}
            variant="amber"
          />
          <StatCard
            label="Justificaciones Registradas"
            value={metrics.justifications}
            subLabel="Tardanzas y faltas justificadas"
            icon={CheckCircle2}
            variant="cyan"
          />
          <StatCard
            label="Procesos del Sistema"
            value={metrics.systemJobs}
            subLabel="Cierres diarios y tareas automáticas"
            icon={Server}
            variant="indigo"
          />
        </div>
      )}

      {/* ── Barra de Filtros en Español ──────────────────────────────────── */}
      <FilterToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por persona afectada, actor responsable o acción..."
        onReset={() => {
          setSearch("");
          setSelectedAction("ALL");
          setSelectedEntity("ALL");
        }}
        filters={[
          {
            id: "action",
            value: selectedAction,
            onChange: setSelectedAction,
            options: [
              { value: "ALL", label: "Todas las acciones" },
              {
                value: "ATTENDANCE_EDITED_MANUAL",
                label: "Edición Manual de Asistencia",
              },
              {
                value: "ATTENDANCE_JUSTIFIED",
                label: "Justificación de Asistencia",
              },
              {
                value: "ATTENDANCE_SCANNED",
                label: "Escaneos de Asistencia",
              },
              { value: "USER_CREATED", label: "Creación de Usuarios" },
              { value: "USER_UPDATED", label: "Modificación de Usuarios" },
              {
                value: "USER_DEACTIVATED",
                label: "Desactivación de Usuarios",
              },
              { value: "QR_GENERATED", label: "Generación de QR" },
              { value: "QR_REGENERATED", label: "Regeneración de QR" },
              { value: "QR_INVALIDATED", label: "Revocación de QR" },
              { value: "TIME_OFF_REQUESTED", label: "Solicitud de Permisos" },
              { value: "TIME_OFF_APPROVED", label: "Permisos Aprobados" },
              { value: "TIME_OFF_REJECTED", label: "Permisos Rechazados" },
              { value: "JOB_EXECUTED", label: "Procesos Automáticos (Cron)" },
            ],
          },
          {
            id: "entity",
            icon: Layers,
            value: selectedEntity,
            onChange: setSelectedEntity,
            options: [
              { value: "ALL", label: "Todas las entidades" },
              { value: "ATTENDANCE", label: "Asistencias" },
              { value: "USER", label: "Usuarios y Empleados" },
              { value: "LOCATION", label: "Sedes" },
              { value: "KIOSK", label: "Kioskos" },
              { value: "SYSTEM", label: "Sistema" },
            ],
          },
        ]}
      />

      {/* ── Tabla de Auditoría ─────────────────────────────────────────── */}
      {isLoading ? (
        <SkeletonTable rows={7} cols={6} />
      ) : (
        <DataTableContainer>
          <DataTableHeader>
            <DataTableHead>Fecha y Hora</DataTableHead>
            <DataTableHead>Responsable (Actor)</DataTableHead>
            <DataTableHead>Acción Realizada</DataTableHead>
            <DataTableHead>Destinatario / Entidad</DataTableHead>
            <DataTableHead>Resumen de Modificación</DataTableHead>
            <DataTableHead className="w-[80px] text-right">Detalle</DataTableHead>
          </DataTableHeader>
          <DataTableBody>
            {filteredLogs.length === 0 ? (
              <DataTableEmptyState
                colSpan={6}
                message="No hay registros de auditoría que coincidan con los filtros aplicados."
              />
            ) : (
              filteredLogs.map((log) => {
                const actionInfo = ACTION_TRANSLATIONS[log.action] || {
                  label: log.action,
                  badgeClass:
                    "bg-surface-100 text-surface-700 border-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:border-surface-700",
                };

                const entityInfo = ENTITY_CONFIG[log.entityType] || {
                  label: log.entityType,
                  icon: FileText,
                };
                const EntityIcon = entityInfo.icon;

                return (
                  <DataTableRow key={log.id}>
                    {/* 1. Fecha y Hora */}
                    <DataTableCell className="w-[145px]">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-surface-900 dark:text-surface-100 text-[11px]">
                            {format(new Date(log.createdAt), "dd MMM yyyy", {
                              locale: es,
                            })}
                          </div>
                          <div className="text-[10px] text-surface-500 font-mono mt-0.5">
                            {format(new Date(log.createdAt), "HH:mm:ss")}
                          </div>
                        </div>
                      </div>
                    </DataTableCell>

                    {/* 2. Responsable (Actor) */}
                    <DataTableCell className="w-[185px]">
                      {log.user ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                            {log.user.firstName[0]}
                            {log.user.lastName[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[11px] text-surface-900 dark:text-surface-100 truncate">
                              {log.user.firstName} {log.user.lastName}
                            </div>
                            <div className="text-[10px] text-surface-500 font-mono truncate">
                              {log.user.email}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                          <div className="w-7 h-7 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center flex-shrink-0">
                            <Server className="w-3.5 h-3.5 text-surface-500" />
                          </div>
                          <div>
                            <div className="font-bold text-[11px] text-surface-800 dark:text-surface-200">
                              Sistema (Cron)
                            </div>
                            <div className="text-[9px] text-surface-400 italic">
                              Automático
                            </div>
                          </div>
                        </div>
                      )}
                    </DataTableCell>

                    {/* 3. Acción Realizada */}
                    <DataTableCell className="w-[190px]">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border tracking-wide shadow-2xs ${actionInfo.badgeClass}`}
                      >
                        {actionInfo.label}
                      </span>
                    </DataTableCell>

                    {/* 4. Destinatario / Entidad Afectada */}
                    <DataTableCell className="w-[200px]">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <EntityIcon className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                          <span className="font-bold text-[11px] text-surface-900 dark:text-surface-100 truncate">
                            {log.targetName || entityInfo.label}
                          </span>
                        </div>
                        {log.targetDetail ? (
                          <div className="text-[10px] font-mono text-surface-500 pl-5">
                            {log.targetDetail}
                          </div>
                        ) : log.entityId && !log.targetName ? (
                          <div
                            className="text-[9px] font-mono text-surface-400 pl-5 truncate"
                            title={log.entityId}
                          >
                            ID: {log.entityId.slice(0, 13)}...
                          </div>
                        ) : null}
                      </div>
                    </DataTableCell>

                    {/* 5. Resumen de Modificación */}
                    <DataTableCell>
                      {renderQuickSummary(log)}
                    </DataTableCell>

                    {/* 6. Acción: Botón Ojo para Ver Detalle */}
                    <DataTableCell className="text-right">
                      <ActionButton
                        variant="neutral"
                        size="sm"
                        icon={<Eye className="w-4 h-4" />}
                        title="Ver detalle completo del evento"
                        aria-label="Ver detalle del evento"
                        onClick={() => handleOpenDetail(log)}
                      />
                    </DataTableCell>
                  </DataTableRow>
                );
              })
            )}
          </DataTableBody>
        </DataTableContainer>
      )}

      {/* ── Modal de Detalle de Auditoría ───────────────────────────────── */}
      <AuditDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedLog(null);
        }}
        log={selectedLog}
      />
    </div>
  );
}
