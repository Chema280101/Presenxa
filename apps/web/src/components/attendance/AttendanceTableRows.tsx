"use client";

import { AttendanceStatus } from "@asistencias/db";
import { format } from "date-fns";
import { AlertTriangle, Check, Edit3, Eye, MapPin, ShieldCheck, X } from "lucide-react";
import { ActionButton, ActionButtonGroup } from "@/components/ui/ActionButton";
import { DataTableCell, DataTableRow } from "@/components/ui/DataTable";
import { RowActionMenu, type RowActionMenuItem } from "@/components/ui/RowActionMenu";
import { StatusBadge } from "@/components/ui/StatusBadge";

export interface AttendanceRecordItem {
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
  exceededTolerance?: boolean;
  usedTolerance?: boolean;
  status: AttendanceStatus;
  workedMinutes?: number | null;
  lateMinutes?: number | null;
  lateMinutes2?: number | null;
  overtimeMinutes?: number | null;
  overtimeStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  attachmentUrl?: string | null;
  verificationPhotoUrl?: string | null;
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
    location?: {
      name?: string;
    };
  };
}

export interface AttendanceRowHandlers {
  onSelectProfile: (record: AttendanceRecordItem) => void;
  onVerifyDni: (id: string, action: "APPROVE" | "REJECT", firstName: string) => void;
  onOpenJustify: (record: AttendanceRecordItem) => void;
  onSelectEdit: (record: AttendanceRecordItem) => void;
  getSmartMenuItems: (record: AttendanceRecordItem, isMobile: boolean) => RowActionMenuItem[];
}

function isRecordPendingDni(record: AttendanceRecordItem): boolean {
  return Boolean(record.requiresManagerApproval || record.notes?.includes("[PENDIENTE_VALIDACION_DNI]"));
}

function formatScheduledHour(hour: number, minute: number): string {
  const h12 = String(hour % 12 || 12).padStart(2, "0");
  const min = String(minute).padStart(2, "0");
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${h12}:${min} ${suffix}`;
}

function getMobileCardClass(isPendingDni: boolean, status: AttendanceStatus): string {
  if (isPendingDni) {
    return "border-warning-300 dark:border-warning-500/40 bg-warning-50/20 dark:bg-warning-500/[0.04]";
  }
  if (status === "ABANDONO_PUESTO") {
    return "border-danger-300 dark:border-danger-500/40 bg-danger-50/20 dark:bg-danger-500/[0.03]";
  }
  return "border-surface-200 dark:border-surface-800";
}

function getDesktopRowClass(isPendingDni: boolean, status: AttendanceStatus): string | undefined {
  if (isPendingDni) {
    return "bg-warning-50/50 dark:bg-warning-500/[0.04] hover:bg-warning-100/50 dark:hover:bg-warning-500/[0.07] border-l-2 border-l-warning-500 dark:border-l-warning-400";
  }
  if (status === "ABANDONO_PUESTO") {
    return "bg-danger-50/50 dark:bg-danger-500/[0.03] hover:bg-danger-100/50 dark:hover:bg-danger-500/[0.06]";
  }
  return undefined;
}

function getAvatarGradient(isPendingDni: boolean, status: AttendanceStatus): string {
  if (isPendingDni) return "bg-gradient-to-tr from-warning-600 to-warning-400";
  if (status === "ABANDONO_PUESTO") return "bg-gradient-to-tr from-danger-600 to-danger-500";
  return "bg-gradient-to-tr from-primary-600 to-primary-500";
}

function getKioskDotColor(isPendingDni: boolean, status: AttendanceStatus): string {
  if (isPendingDni) return "bg-warning-500 dark:bg-warning-400";
  if (status === "ABANDONO_PUESTO") return "bg-danger-500 dark:bg-danger-400";
  return "bg-primary-500 dark:bg-primary-400";
}

function AttendanceEntryCell({
  record,
  isPendingDni,
  entryFormatted,
}: {
  record: AttendanceRecordItem;
  isPendingDni: boolean;
  entryFormatted: string;
}) {
  let timeClass = "text-primary-600 dark:text-primary-400";
  let badgeClass =
    "text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/20";

  if (isPendingDni) {
    timeClass = "text-warning-700 dark:text-warning-300";
    badgeClass =
      "text-warning-700 dark:text-warning-300 bg-warning-100 dark:bg-warning-500/15 border-warning-300 dark:border-warning-500/30";
  } else if (record.lateMinutes) {
    timeClass = "text-warning-600 dark:text-warning-400";
    badgeClass =
      "text-warning-700 dark:text-warning-300 bg-warning-50 dark:bg-warning-500/10 border-warning-200 dark:border-warning-500/20";
  }

  const isManual = record.entryMethod === "PIN" || isPendingDni;
  const lateSuffix = record.lateMinutes ? ` • +${record.lateMinutes}m` : "";
  const scanLabel = record.lateMinutes
    ? `+${record.lateMinutes} min tarde • Pulsera NFC`
    : "Puntual • QR Dinámico";

  return (
    <DataTableCell>
      <div className={`font-mono font-bold ${timeClass}`}>{entryFormatted}</div>
      <div className={`inline-flex items-center space-x-1 text-[10px] px-1.5 py-0.5 rounded border font-medium ${badgeClass}`}>
        {isManual ? (
          <span>Manual DNI{lateSuffix}</span>
        ) : (
          <>
            {!record.lateMinutes && (
              <svg className="w-2.5 h-2.5 text-primary-500 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            )}
            <span>{scanLabel}</span>
          </>
        )}
      </div>
    </DataTableCell>
  );
}

function getContinuousExitSubtext(record: AttendanceRecordItem, schedExitFormatted: string): string {
  if (record.lateMinutes && record.lateMinutes > 0) {
    return `Compensa ${record.lateMinutes} min`;
  }
  if (record.workedMinutes) {
    const hours = Math.floor(record.workedMinutes / 60);
    const mins = record.workedMinutes % 60;
    return `${hours}h ${mins}m trab. • Prog: ${schedExitFormatted}`;
  }
  return `Jornada finalizada • Prog: ${schedExitFormatted}`;
}

function AttendanceExitCell({
  record,
  isSplitSchedule,
  schedExitFormatted,
  schedExit2Formatted,
  exitFormatted,
  isTodayDate,
  isPastDate,
}: {
  record: AttendanceRecordItem;
  isSplitSchedule: boolean;
  schedExitFormatted: string;
  schedExit2Formatted: string;
  exitFormatted: string | null;
  isTodayDate: boolean;
  isPastDate: boolean;
}) {
  if (isSplitSchedule) {
    const t1Str = record.exitTime ? format(new Date(record.exitTime), "hh:mm a") : schedExitFormatted;
    const t2Fallback = isTodayDate ? `T2 en curso (${schedExit2Formatted})` : `Prog: ${schedExit2Formatted}`;
    const t2Str = record.exitTime2 ? format(new Date(record.exitTime2), "hh:mm a") : t2Fallback;

    return (
      <DataTableCell className="font-mono text-surface-700 dark:text-slate-300">
        <div>T1: {t1Str}</div>
        <div className="text-[10px] text-surface-500 dark:text-slate-500">T2: {t2Str}</div>
      </DataTableCell>
    );
  }

  if (record.status === "ABANDONO_PUESTO") {
    return (
      <DataTableCell className="font-mono text-surface-700 dark:text-slate-300">
        <div className="font-bold text-danger-600 dark:text-danger-400">Salida No Marcada</div>
        <div className="text-[10px] text-danger-500 dark:text-danger-300 font-sans">
          {record.entryTime ? "Ausente tras ingreso" : "Ausente"}
        </div>
      </DataTableCell>
    );
  }

  if (record.status === "AUSENTE") {
    return (
      <DataTableCell className="font-mono text-surface-700 dark:text-slate-300">
        <div className="text-surface-400 dark:text-slate-500">-</div>
        <div className="text-[10px] text-surface-400 dark:text-slate-500 font-sans">No asistió</div>
      </DataTableCell>
    );
  }

  if (record.status === "JUSTIFICADO" || record.status === "PERMISO") {
    return (
      <DataTableCell className="font-mono text-surface-700 dark:text-slate-300">
        <div className="text-surface-400 dark:text-slate-500">-</div>
        <div className="text-[10px] text-info-600 dark:text-info-400 font-sans">Justificado</div>
      </DataTableCell>
    );
  }

  if (exitFormatted) {
    const otMins = record.overtimeMinutes || 0;
    const otBadge =
      otMins >= 15 ? (
        <span
          className={`mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold font-sans ${
            record.overtimeStatus === "APPROVED"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              : record.overtimeStatus === "REJECTED"
              ? "bg-slate-200/70 dark:bg-white/10 text-slate-500 line-through"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
          }`}
        >
          +{Math.floor(otMins / 60)}h {otMins % 60}m H.E.{" "}
          {record.overtimeStatus === "APPROVED"
            ? "✓"
            : record.overtimeStatus === "REJECTED"
            ? "✗"
            : "(Pend.)"}
        </span>
      ) : null;

    return (
      <DataTableCell className="font-mono text-surface-700 dark:text-slate-300">
        <div className="font-bold text-surface-900 dark:text-white">{exitFormatted}</div>
        <div className="text-[10px] text-surface-500 dark:text-slate-400 font-sans">
          {getContinuousExitSubtext(record, schedExitFormatted)}
        </div>
        {otBadge}
      </DataTableCell>
    );
  }

  return (
    <DataTableCell className="font-mono text-surface-700 dark:text-slate-300">
      <div className="text-surface-600 dark:text-slate-300">Prog: {schedExitFormatted}</div>
      {isTodayDate && (
        <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Turno en curso</span>
        </span>
      )}
      {!isTodayDate && isPastDate && (
        <span className="block text-[10px] text-warning-600 dark:text-warning-400 font-sans font-medium">
          Sin marcación de salida
        </span>
      )}
      {!isTodayDate && !isPastDate && (
        <span className="block text-[10px] text-surface-400 dark:text-slate-500 font-sans">Programada</span>
      )}
    </DataTableCell>
  );
}

function AttendanceOperationalBadge({
  status,
  isPendingDni,
}: {
  status: AttendanceStatus;
  isPendingDni: boolean;
}) {
  if (isPendingDni) {
    return (
      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-warning-100 dark:bg-warning-500/20 text-warning-700 dark:text-warning-300 border border-warning-300 dark:border-warning-500/40 badge-glow-amber animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-warning-500 dark:bg-warning-400" />
        <span>VALIDAR DNI</span>
      </span>
    );
  }

  if (status === "ABANDONO_PUESTO") {
    return (
      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-danger-50 dark:bg-danger-500/20 text-danger-700 dark:text-danger-300 border border-danger-200 dark:border-danger-500/40 badge-glow-rose">
        <span className="w-1.5 h-1.5 rounded-full bg-danger-500 dark:bg-danger-400 animate-ping" />
        <span>ABANDONO</span>
      </span>
    );
  }

  if (status === "TARDE") {
    return (
      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-warning-50 dark:bg-warning-500/15 text-warning-700 dark:text-warning-300 border border-warning-200 dark:border-warning-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-warning-500 dark:bg-warning-400" />
        <span>TARDANZA</span>
      </span>
    );
  }

  if (status === "JUSTIFICADO" || status === "PERMISO") {
    return (
      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-info-50 dark:bg-info-500/15 text-info-700 dark:text-info-300 border border-info-200 dark:border-info-500/30">
        <svg className="w-3 h-3 text-info-600 dark:text-info-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
        <span>JUSTIFICADO</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary-50 dark:bg-primary-500/15 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-500/30 badge-glow-primary">
      <span className="w-1.5 h-1.5 rounded-full bg-primary-500 dark:bg-primary-400 animate-pulse" />
      <span>PRESENTE</span>
    </span>
  );
}

function ToleranceSubtitle({ record }: { record: AttendanceRecordItem }) {
  if (record.exceededTolerance) {
    return <div className="text-[10px] text-danger-500 font-medium">Límite de tolerancia excedido (semanal)</div>;
  }
  if (record.usedTolerance) {
    return <div className="text-[10px] text-warning-600 dark:text-warning-400 font-medium">Tolerancia usada (llegó en rango)</div>;
  }
  return <div className="text-[10px] text-surface-500 dark:text-slate-500">Puntual sin usar tolerancia</div>;
}

function AttendanceAuditCell({
  record,
  isPendingDni,
}: {
  record: AttendanceRecordItem;
  isPendingDni: boolean;
}) {
  if (isPendingDni) {
    return (
      <DataTableCell>
        <div className="text-[11px] text-warning-700 dark:text-warning-200 font-medium">Marcó DNI por olvido de tarjeta</div>
        <div className="text-[10px] text-surface-500 dark:text-slate-400">Captura fotográfica disponible en Kiosk</div>
      </DataTableCell>
    );
  }

  if (record.status === "TARDE") {
    return (
      <DataTableCell>
        <div className="text-[11px] text-surface-700 dark:text-slate-300 font-medium">Alerta enviada a Jefatura de Turno</div>
        <div className="text-[10px] text-surface-500 dark:text-slate-500">Registrado en el reporte de asistencia</div>
      </DataTableCell>
    );
  }

  if (record.status === "ABANDONO_PUESTO") {
    return (
      <DataTableCell>
        <div className="text-[11px] text-danger-700 dark:text-danger-300 font-semibold">Geocerca violada ({">"}180 min sin retorno)</div>
        <div className="text-[10px] text-surface-500 dark:text-slate-400">Notificación levantada a RRHH</div>
      </DataTableCell>
    );
  }

  if (record.status === "JUSTIFICADO") {
    return (
      <DataTableCell>
        <div className="text-[11px] text-surface-700 dark:text-slate-300 font-mono">CITT ESSALUD #48920-26</div>
        <div className="text-[10px] text-info-600 dark:text-info-400">Subsidio cubierto por empleador</div>
      </DataTableCell>
    );
  }

  return (
    <DataTableCell>
      <div className="text-[11px] text-surface-700 dark:text-slate-300 flex items-center space-x-1 font-mono">
        <svg className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
        <span>HSM SHA-256 Validado</span>
      </div>
      <ToleranceSubtitle record={record} />
    </DataTableCell>
  );
}

function PrimaryRowAction({
  record,
  isPendingDni,
  handlers,
}: {
  record: AttendanceRecordItem;
  isPendingDni: boolean;
  handlers: AttendanceRowHandlers;
}) {
  if (isPendingDni) {
    return (
      <>
        <ActionButton
          size="sm"
          variant="success"
          icon={<Check className="w-3.5 h-3.5" />}
          title="Aprobar Asistencia"
          onClick={() => handlers.onVerifyDni(record.id, "APPROVE", record.user.firstName)}
        />
        <ActionButton
          size="sm"
          variant="danger"
          icon={<X className="w-3.5 h-3.5" />}
          title="Rechazar y marcar Inasistencia"
          onClick={() => handlers.onVerifyDni(record.id, "REJECT", record.user.firstName)}
        />
      </>
    );
  }

  if (record.status === "ABANDONO_PUESTO") {
    return (
      <ActionButton
        size="sm"
        variant="danger"
        icon={<AlertTriangle className="w-3.5 h-3.5" />}
        title="Levantar Acta Disciplinaria"
      >
        Levantar Acta
      </ActionButton>
    );
  }

  if (record.status === "TARDE") {
    return (
      <ActionButton
        size="sm"
        variant="info"
        icon={<ShieldCheck className="w-3.5 h-3.5" />}
        title="Justificar Tardanza"
        onClick={() => handlers.onOpenJustify(record)}
      />
    );
  }

  if (record.status === "JUSTIFICADO" || record.status === "PERMISO") {
    return (
      <ActionButton
        size="sm"
        variant="info"
        icon={<Eye className="w-3.5 h-3.5" />}
        title="Ver Justificación / Sustento"
        onClick={() => handlers.onOpenJustify(record)}
      />
    );
  }

  return (
    <ActionButton
      size="sm"
      variant="warning"
      icon={<Edit3 className="w-3.5 h-3.5" />}
      title="Ajustar registro"
      onClick={() => handlers.onSelectEdit(record)}
    />
  );
}

export function AttendanceMobileCard({
  record,
  handlers,
}: {
  record: AttendanceRecordItem;
  handlers: AttendanceRowHandlers;
}) {
  const smartMenuItems = handlers.getSmartMenuItems(record, true);
  const isPendingDni = isRecordPendingDni(record);
  const entryFormatted = record.entryTime ? format(new Date(record.entryTime), "hh:mm a") : "-";
  const exitFormatted = record.exitTime ? format(new Date(record.exitTime), "hh:mm a") : null;
  const locationLabel = record.location?.name || record.kiosk?.location?.name || "Sede Principal";

  return (
    <div
      className={`p-4 rounded-2xl border bg-white dark:bg-surface-900 shadow-xs transition-all space-y-3 ${getMobileCardClass(
        isPendingDni,
        record.status
      )}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => handlers.onSelectProfile(record)}
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

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-100 dark:border-surface-800/80 text-xs">
        <div className="p-2.5 rounded-xl bg-surface-50 dark:bg-surface-950 border border-surface-200/60 dark:border-surface-800/60">
          <span className="text-[10px] uppercase font-bold text-surface-400">Entrada</span>
          <div className="font-bold text-surface-900 dark:text-white mt-0.5 font-mono">{entryFormatted}</div>
          {Boolean(record.lateMinutes && record.lateMinutes > 0) && (
            <span className="text-[10px] text-warning-600 dark:text-warning-400 font-semibold font-mono block">
              +{record.lateMinutes}m tardanza
            </span>
          )}
        </div>

        <div className="p-2.5 rounded-xl bg-surface-50 dark:bg-surface-950 border border-surface-200/60 dark:border-surface-800/60">
          <span className="text-[10px] uppercase font-bold text-surface-400">Salida</span>
          <div className="font-bold text-surface-900 dark:text-white mt-0.5 font-mono">{exitFormatted || "—"}</div>
          {Boolean(record.workedMinutes && record.workedMinutes > 0) && (
            <span className="text-[10px] text-surface-500 dark:text-surface-400 font-mono block">
              {Math.floor((record.workedMinutes || 0) / 60)}h {(record.workedMinutes || 0) % 60}m
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400 pt-0.5">
        <span className="inline-flex items-center gap-1 truncate">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-surface-400 dark:text-surface-500" aria-hidden="true" />
          <span className="truncate">{locationLabel}</span>
        </span>
        {record.kiosk?.name && (
          <span className="text-[10px] font-mono shrink-0 text-surface-400">{record.kiosk.name}</span>
        )}
      </div>

      {isPendingDni && (
        <div className="p-2.5 rounded-xl bg-warning-100/60 dark:bg-warning-500/15 border border-warning-300 dark:border-warning-500/30 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-warning-800 dark:text-warning-300">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-warning-600 dark:text-warning-400" aria-hidden="true" />
            <span>Requiere validación DNI</span>
          </span>
          <ActionButtonGroup align="right" className="shrink-0">
            <ActionButton
              size="sm"
              variant="danger"
              icon={<X className="w-3.5 h-3.5" />}
              title="Rechazar marcación"
              onClick={() => handlers.onVerifyDni(record.id, "REJECT", record.user.firstName)}
            />
            <ActionButton
              size="sm"
              variant="success"
              icon={<Check className="w-3.5 h-3.5" />}
              title="Aprobar marcación"
              onClick={() => handlers.onVerifyDni(record.id, "APPROVE", record.user.firstName)}
            >
              Aprobar
            </ActionButton>
          </ActionButtonGroup>
        </div>
      )}
    </div>
  );
}

export function AttendanceDesktopRow({
  record,
  handlers,
}: {
  record: AttendanceRecordItem;
  handlers: AttendanceRowHandlers;
}) {
  const sched = record.user?.userSchedules?.[0]?.schedule;
  const isSplitSchedule = Boolean(sched?.isSplit);
  const schedExitFormatted = formatScheduledHour(sched?.exitHour ?? 17, sched?.exitMinute ?? 0);
  const schedExit2Formatted = formatScheduledHour(sched?.exitHour2 ?? 21, sched?.exitMinute2 ?? 0);

  const recordDateStr =
    typeof record.date === "string" ? record.date.slice(0, 10) : format(new Date(record.date), "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isPastDate = recordDateStr < todayStr;
  const isTodayDate = recordDateStr === todayStr;

  const entryFormatted = record.entryTime ? format(new Date(record.entryTime), "hh:mm a") : "-";
  const exitFormatted = record.exitTime ? format(new Date(record.exitTime), "hh:mm a") : null;
  const isPendingDni = isRecordPendingDni(record);
  const smartMenuItems = handlers.getSmartMenuItems(record, false);

  return (
    <DataTableRow className={getDesktopRowClass(isPendingDni, record.status)}>
      <DataTableCell>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => handlers.onSelectProfile(record)}
            title="Ver ficha del colaborador e incidencias"
            className={`w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-xs font-mono shadow-sm cursor-pointer transition-transform hover:scale-105 ${getAvatarGradient(
              isPendingDni,
              record.status
            )}`}
          >
            {record.user.firstName.charAt(0)}
            {record.user.lastName.charAt(0)}
          </button>
          <div>
            <div className="font-bold text-surface-900 dark:text-white flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handlers.onSelectProfile(record)}
                title="Ver ficha del colaborador e incidencias"
                className="hover:text-primary-600 dark:hover:text-primary-400 hover:underline transition-colors text-left cursor-pointer"
              >
                {record.user.firstName} {record.user.lastName}
              </button>
              {isSplitSchedule && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-info-100 dark:bg-info-500/20 text-info-700 dark:text-info-300 border border-info-200 dark:border-info-500/30">
                  Partido (2 Tramos)
                </span>
              )}
            </div>
            <div className="text-[11px] text-surface-500 dark:text-slate-400 font-mono flex items-center space-x-1.5 flex-wrap">
              <span>DNI {record.user.documentId || "—"}</span>
              <span>•</span>
              <span className="text-surface-700 dark:text-slate-300 truncate max-w-[150px]">{record.user.role}</span>
              {record.user.department?.name && (
                <>
                  <span>•</span>
                  <span className="text-primary-600 dark:text-emerald-400 font-sans font-medium">
                    {record.user.department.name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </DataTableCell>

      <DataTableCell>
        <div className="text-surface-800 dark:text-slate-200 font-medium truncate max-w-[150px]">
          {record.location?.name || "Miraflores Central"}
        </div>
        <div
          className={`text-[11px] font-mono flex items-center space-x-1 ${
            isPendingDni ? "text-warning-600 dark:text-warning-400" : "text-surface-500 dark:text-slate-400"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${getKioskDotColor(isPendingDni, record.status)}`} />
          <span className="truncate max-w-[120px]">{record.kiosk?.name || "Tótem Lobby #01"}</span>
        </div>
      </DataTableCell>

      <AttendanceEntryCell record={record} isPendingDni={isPendingDni} entryFormatted={entryFormatted} />

      <AttendanceExitCell
        record={record}
        isSplitSchedule={isSplitSchedule}
        schedExitFormatted={schedExitFormatted}
        schedExit2Formatted={schedExit2Formatted}
        exitFormatted={exitFormatted}
        isTodayDate={isTodayDate}
        isPastDate={isPastDate}
      />

      <DataTableCell>
        <div className="flex flex-col items-start gap-1">
          <AttendanceOperationalBadge status={record.status} isPendingDni={isPendingDni} />
          {isPendingDni && record.verificationPhotoUrl && (
            <a
              href={record.verificationPhotoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 hover:underline"
              title="Ver foto antifraude capturada en kiosko"
            >
              <Eye className="w-3 h-3" />
              <span>Ver Foto Kiosko</span>
            </a>
          )}
        </div>
      </DataTableCell>

      <AttendanceAuditCell record={record} isPendingDni={isPendingDni} />

      <DataTableCell align="right">
        <ActionButtonGroup align="right">
          <PrimaryRowAction record={record} isPendingDni={isPendingDni} handlers={handlers} />
          <RowActionMenu title="Opciones del registro" items={smartMenuItems} />
        </ActionButtonGroup>
      </DataTableCell>
    </DataTableRow>
  );
}
