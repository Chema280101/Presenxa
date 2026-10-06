"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ShieldAlert,
  Clock,
  User,
  Activity,
  Layers,
  Globe,
  Monitor,
  Copy,
  Check,
  ArrowRight,
  Code,
  FileCheck,
  AlertTriangle,
  Trash2,
  Edit3,
} from "lucide-react";
import { ModalShell } from "@/components/ui/ModalShell";
import { Button } from "@/components/ui/Button";

export interface AuditLogDetailItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  oldData: any;
  newData: any;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    photoUrl?: string | null;
  } | null;
  targetName?: string | null;
  targetDetail?: string | null;
}

interface AuditDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: AuditLogDetailItem | null;
}

// Diccionario de traducción de acciones
const ACTION_MAP: Record<string, { label: string; variant: "primary" | "warning" | "danger" | "info" | "success"; icon: any }> = {
  ATTENDANCE_SCANNED: { label: "Escaneo de Asistencia", variant: "primary", icon: FileCheck },
  ATTENDANCE_STATUS_CHANGED: { label: "Cambio de Estado Automático", variant: "info", icon: Activity },
  ATTENDANCE_JUSTIFIED: { label: "Justificación de Asistencia", variant: "success", icon: FileCheck },
  ATTENDANCE_EDITED_MANUAL: { label: "Edición Manual de Asistencia", variant: "warning", icon: Edit3 },
  QR_GENERATED: { label: "Generación de Código QR", variant: "success", icon: FileCheck },
  QR_REGENERATED: { label: "Regeneración de Código QR", variant: "primary", icon: Activity },
  QR_INVALIDATED: { label: "Revocación de Código QR", variant: "danger", icon: Trash2 },
  USER_CREATED: { label: "Creación de Usuario", variant: "success", icon: User },
  USER_UPDATED: { label: "Modificación de Usuario", variant: "warning", icon: Edit3 },
  USER_DEACTIVATED: { label: "Desactivación de Usuario", variant: "danger", icon: Trash2 },
  JOB_EXECUTED: { label: "Ejecución de Proceso (Cron)", variant: "info", icon: Activity },
  TIME_OFF_REQUESTED: { label: "Solicitud de Permiso / Vacaciones", variant: "info", icon: Activity },
  TIME_OFF_APPROVED: { label: "Permiso Aprobado", variant: "success", icon: FileCheck },
  TIME_OFF_REJECTED: { label: "Permiso Rechazado", variant: "danger", icon: AlertTriangle },
};

// Diccionario de traducción de tipos de entidad
const ENTITY_MAP: Record<string, string> = {
  USER: "Usuario",
  ATTENDANCE: "Asistencia",
  LOCATION: "Sede",
  KIOSK: "Kiosko",
  SCHEDULE: "Horario",
  SYSTEM: "Sistema",
};

// Diccionario de campos en español
const FIELD_LABELS: Record<string, string> = {
  firstName: "Nombres",
  lastName: "Apellidos",
  email: "Correo Electrónico",
  dni: "DNI / Documento",
  role: "Rol de Usuario",
  isActive: "Estado Activo",
  locationId: "Sede Asignada",
  department: "Área / Departamento",
  jobTitle: "Cargo / Puesto",
  status: "Estado de Asistencia",
  entryTime: "Hora de Entrada",
  exitTime: "Hora de Salida",
  entryTime2: "Entrada Refrigerio (T2)",
  exitTime2: "Salida Refrigerio (T2)",
  lateMinutes: "Minutos de Tardanza",
  lateMinutes2: "Tardanza Turno 2",
  notes: "Motivo / Observaciones",
  modifiedBy: "Modificado Por",
  statusChangedBy: "Cambiado Por",
  statusChangedAt: "Fecha de Modificación",
  code: "Código Identificador",
  name: "Nombre",
  reason: "Motivo",
};

function formatValue(value: any): string {
  if (value === null || value === undefined) return "No registrado";
  if (typeof value === "boolean") return value ? "Sí (Activo)" : "No (Inactivo)";
  if (typeof value === "string") {
    // Si parece fecha ISO
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
      try {
        return format(new Date(value), "dd/MM/yyyy HH:mm:ss");
      } catch {
        return value;
      }
    }
    return value;
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export function AuditDetailModal({ isOpen, onClose, log }: AuditDetailModalProps) {
  const [showRawJson, setShowRawJson] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!log) return null;

  const actionInfo = ACTION_MAP[log.action] || {
    label: log.action,
    variant: "info",
    icon: ShieldAlert,
  };

  const entityLabel = ENTITY_MAP[log.entityType] || log.entityType;

  const handleCopyId = () => {
    if (log.id) {
      navigator.clipboard.writeText(log.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Comparativa de campos entre oldData y newData
  const allKeys = Array.from(
    new Set([
      ...Object.keys(log.oldData || {}),
      ...Object.keys(log.newData || {}),
    ])
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Detalle de Auditoría"
      description={`Registro del evento auditado • ${format(
        new Date(log.createdAt),
        "EEEE d 'de' MMMM, yyyy - HH:mm:ss",
        { locale: es }
      )}`}
      icon={actionInfo.icon}
      iconVariant={actionInfo.variant}
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={() => setShowRawJson(!showRawJson)}
            className="text-xs font-semibold text-surface-500 hover:text-surface-800 dark:hover:text-surface-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Code className="w-3.5 h-3.5" />
            <span>{showRawJson ? "Ocultar JSON técnico" : "Ver JSON técnico crudo"}</span>
          </button>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Tarjeta de Resumen Principal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-surface-100/70 dark:bg-surface-900/60 border border-surface-200 dark:border-surface-800">
          {/* Acción */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
              Acción Realizada
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 shadow-2xs">
                {actionInfo.label}
              </span>
            </div>
          </div>

          {/* Actor / Responsable */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
              Responsable (Actor)
            </span>
            <div className="flex items-center gap-2 mt-1">
              {log.user ? (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-xs">
                    {log.user.firstName[0]}
                    {log.user.lastName[0]}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-surface-900 dark:text-surface-100 leading-tight">
                      {log.user.firstName} {log.user.lastName}
                    </div>
                    <div className="text-[10px] text-surface-500 font-mono">
                      {log.user.email}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-surface-600 dark:text-surface-300">
                  <Activity className="w-4 h-4 text-primary-500" />
                  <span className="text-xs font-semibold">Sistema Automático (Cron)</span>
                </div>
              )}
            </div>
          </div>

          {/* Entidad Afectada */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
              Entidad y Destinatario Afectado
            </span>
            <div className="mt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-surface-900 dark:text-surface-100">
                  {log.targetName || entityLabel}
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface-200/80 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                  {entityLabel}
                </span>
              </div>
              {log.targetDetail && (
                <p className="text-[11px] text-surface-500 font-mono mt-0.5">
                  {log.targetDetail}
                </p>
              )}
              {log.entityId && !log.targetName && (
                <p className="text-[10px] text-surface-400 font-mono truncate mt-0.5">
                  ID: {log.entityId}
                </p>
              )}
            </div>
          </div>

          {/* Metadatos de Red */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
              Origen de la Petición
            </span>
            <div className="mt-1 space-y-0.5 text-xs text-surface-600 dark:text-surface-300">
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <Globe className="w-3.5 h-3.5 text-surface-400" />
                <span>IP: {log.ipAddress || "127.0.0.1 (Local / Servidor)"}</span>
              </div>
              {log.userAgent && (
                <div
                  className="flex items-center gap-1.5 text-[10px] text-surface-400 truncate max-w-[260px]"
                  title={log.userAgent}
                >
                  <Monitor className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{log.userAgent}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Comparativa de Cambios */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-surface-700 dark:text-surface-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary-500" />
              <span>Modificaciones Registradas en este Evento</span>
            </h4>
            <button
              type="button"
              onClick={handleCopyId}
              className="text-[11px] font-mono text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 flex items-center gap-1 transition-colors cursor-pointer"
              title="Copiar ID del log"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-500">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>ID: {log.id.slice(0, 8)}...</span>
                </>
              )}
            </button>
          </div>

          {allKeys.length === 0 ? (
            <div className="p-4 rounded-xl bg-surface-100/50 dark:bg-surface-900/30 border border-surface-200/60 dark:border-surface-800 text-center text-xs text-surface-500 italic">
              Este evento no incluye parámetros de modificación en el registro.
            </div>
          ) : (
            <div className="rounded-xl border border-surface-200 dark:border-surface-800 overflow-hidden divide-y divide-surface-200 dark:divide-surface-800 text-xs">
              <div className="grid grid-cols-12 bg-surface-100/70 dark:bg-surface-950/60 px-3 py-2 font-bold text-[10px] uppercase tracking-wider text-surface-500">
                <div className="col-span-4">Campo Modificado</div>
                <div className="col-span-4 text-rose-600 dark:text-rose-400">Valor Anterior</div>
                <div className="col-span-4 text-emerald-600 dark:text-emerald-400">Valor Nuevo</div>
              </div>

              {allKeys.map((key) => {
                const oldVal = log.oldData ? log.oldData[key] : undefined;
                const newVal = log.newData ? log.newData[key] : undefined;
                const isChanged = oldVal !== newVal;

                return (
                  <div
                    key={key}
                    className={`grid grid-cols-12 px-3 py-2.5 items-center gap-2 ${
                      isChanged
                        ? "bg-amber-500/5 dark:bg-amber-500/5"
                        : "hover:bg-surface-50 dark:hover:bg-surface-900/40"
                    }`}
                  >
                    <div className="col-span-4 font-semibold text-surface-800 dark:text-surface-200">
                      {FIELD_LABELS[key] || key}
                      <div className="text-[10px] font-mono text-surface-400 font-normal">
                        {key}
                      </div>
                    </div>
                    <div className="col-span-4 text-surface-600 dark:text-surface-400 break-words">
                      {oldVal !== undefined ? (
                        <span className="p-1 rounded bg-danger-50 dark:bg-danger-500/10 text-danger-700 dark:text-danger-300 font-medium">
                          {formatValue(oldVal)}
                        </span>
                      ) : (
                        <span className="text-surface-400 italic font-mono text-[10px]">
                          — (Vacío)
                        </span>
                      )}
                    </div>
                    <div className="col-span-4 text-surface-900 dark:text-surface-100 break-words">
                      {newVal !== undefined ? (
                        <span className="p-1 rounded bg-success-50 dark:bg-success-500/10 text-success-700 dark:text-success-300 font-bold">
                          {formatValue(newVal)}
                        </span>
                      ) : (
                        <span className="text-surface-400 italic font-mono text-[10px]">
                          — (Vacío)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* JSON Técnico (Colapsable) */}
        {showRawJson && (
          <div className="p-3.5 rounded-xl bg-surface-950 text-slate-200 font-mono text-[10px] space-y-2 border border-surface-800 animate-fade-in-up">
            <div className="flex items-center justify-between text-surface-400 font-bold uppercase tracking-wider">
              <span>Payload JSON Original</span>
              <span>{log.id}</span>
            </div>
            <pre className="overflow-x-auto p-2 rounded bg-black/40 text-emerald-400 max-h-48">
              {JSON.stringify(
                {
                  id: log.id,
                  action: log.action,
                  entityType: log.entityType,
                  entityId: log.entityId,
                  createdAt: log.createdAt,
                  oldData: log.oldData,
                  newData: log.newData,
                  actor: log.user,
                  ipAddress: log.ipAddress,
                  userAgent: log.userAgent,
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
