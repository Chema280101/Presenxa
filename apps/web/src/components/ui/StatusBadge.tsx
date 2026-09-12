import React from "react";
import {
  CheckCircle2,
  Clock3,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  FileText,
  HelpCircle,
} from "lucide-react";
import { clsx } from "clsx";

export type AttendanceStatusKey =
  | "PRESENTE"
  | "TARDE"
  | "AUSENTE"
  | "ABANDONO_PUESTO"
  | "INCOMPLETO"
  | "PENDIENTE"
  | "JUSTIFICADO"
  | "FERIADO"
  | "PERMISO";

export type RoleKey = "ADMIN" | "SUPERVISOR" | "EMPLEADO" | "ALUMNO";

interface StatusBadgeProps {
  status: AttendanceStatusKey | string;
  lateMinutes?: number | null;
  hasExit?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: React.ReactNode;
}

export function StatusBadge({
  status,
  lateMinutes,
  hasExit,
  size = "md",
  className,
  ...props
}: StatusBadgeProps) {
  const normStatus = (status || "").toUpperCase();

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[11px] gap-1.5"
      : "px-2.5 py-1 text-xs gap-2";

  switch (normStatus) {
    case "PRESENTE":
      if (hasExit) {
        return (
          <span
            className={clsx(
              "inline-flex items-center rounded-full bg-primary-50 dark:bg-emerald-500/15 text-primary-700 dark:text-emerald-300 border border-primary-200 dark:border-emerald-500/30 font-medium",
              sizeClasses,
              className
            )}
            title="Jornada completada con éxito (Entrada y Salida registradas)"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 dark:text-emerald-400" />
            Completado
          </span>
        );
      }
      if (hasExit === false) {
        return (
          <span
            className={clsx(
              "inline-flex items-center rounded-full bg-primary-50 dark:bg-emerald-500/20 text-primary-800 dark:text-emerald-200 border border-primary-300 dark:border-emerald-500/50 font-semibold shadow-xs dark:shadow-[0_0_10px_rgba(16,185,129,0.2)]",
              sizeClasses,
              className
            )}
            title="En jornada laboral activa"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-500 dark:bg-emerald-400 opacity-80"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500 dark:bg-emerald-400"></span>
            </span>
            En Turno
          </span>
        );
      }
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-full bg-primary-50 dark:bg-emerald-500/15 text-primary-700 dark:text-emerald-300 border border-primary-200 dark:border-emerald-500/30 font-semibold",
            sizeClasses,
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary-500 dark:bg-emerald-400" />
          Presente
        </span>
      );

    case "TARDE":
      if (hasExit) {
        return (
          <span
            className={clsx(
              "inline-flex items-center rounded-full bg-warning-50 dark:bg-amber-500/15 text-warning-800 dark:text-amber-300 border border-warning-200 dark:border-amber-500/30 font-medium",
              sizeClasses,
              className
            )}
            title="Jornada completada con tardanza registrada"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-warning-600 dark:text-amber-400" />
            Completado {lateMinutes ? `(+${lateMinutes}m)` : "(Tarde)"}
          </span>
        );
      }
      if (hasExit === false) {
        return (
          <span
            className={clsx(
              "inline-flex items-center rounded-full bg-warning-50 dark:bg-amber-500/20 text-warning-900 dark:text-amber-200 border border-warning-300 dark:border-amber-500/50 font-semibold shadow-xs dark:shadow-[0_0_10px_rgba(245,158,11,0.2)]",
              sizeClasses,
              className
            )}
            title="En jornada laboral activa con tardanza registrada"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning-500 dark:bg-amber-400 opacity-80"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-warning-500 dark:bg-amber-400"></span>
            </span>
            En Turno {lateMinutes ? `(+${lateMinutes}m)` : "(Tarde)"}
          </span>
        );
      }
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-full bg-warning-50 dark:bg-amber-500/15 text-warning-800 dark:text-amber-300 border border-warning-200 dark:border-amber-500/30 font-semibold",
            sizeClasses,
            className
          )}
        >
          <Clock3 className="w-3.5 h-3.5 text-warning-600 dark:text-amber-400" />
          Tardanza {lateMinutes ? `(+${lateMinutes}m)` : ""}
        </span>
      );

    case "ABANDONO_PUESTO":
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-full bg-danger-50 dark:bg-danger-500/20 text-danger-700 dark:text-danger-300 border border-danger-200 dark:border-danger-500/40 animate-pulse font-semibold",
            sizeClasses,
            className
          )}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-danger-600 dark:text-danger-400" />
          Abandono
        </span>
      );

    case "AUSENTE":
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-full bg-danger-50 dark:bg-danger-500/15 text-danger-700 dark:text-danger-300 border border-danger-200 dark:border-danger-500/30 font-semibold",
            sizeClasses,
            className
          )}
        >
          <XCircle className="w-3.5 h-3.5 text-danger-600 dark:text-danger-400" />
          Ausente
        </span>
      );

    case "JUSTIFICADO":
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-full bg-info-50 dark:bg-sky-500/15 text-info-700 dark:text-sky-300 border border-info-200 dark:border-sky-500/30 font-semibold",
            sizeClasses,
            className
          )}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-info-600 dark:text-sky-400" />
          Justificado
        </span>
      );

    case "PERMISO":
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-semibold",
            sizeClasses,
            className
          )}
        >
          <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          Permiso
        </span>
      );

    case "INCOMPLETO":
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-full bg-warning-50 dark:bg-amber-500/15 text-warning-800 dark:text-amber-300 border border-warning-200 dark:border-amber-500/30 font-semibold",
            sizeClasses,
            className
          )}
        >
          <HelpCircle className="w-3.5 h-3.5 text-warning-600 dark:text-amber-400" />
          Incompleto
        </span>
      );

    case "FERIADO":
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-full bg-cyan-50 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30 font-semibold",
            sizeClasses,
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 dark:bg-cyan-400" />
          Feriado
        </span>
      );

    case "ACTIVO":
      return (
        <span
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-full bg-primary-50 dark:bg-primary-500/15 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-500/30 font-semibold",
            sizeClasses,
            className
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-primary-500 dark:bg-primary-400"></span> {props.label || "Activo"}
        </span>
      );

    case "INACTIVO":
    case "OFFLINE":
      return (
        <span
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-full bg-danger-50 dark:bg-danger-500/15 text-danger-700 dark:text-danger-400 border border-danger-200 dark:border-danger-500/30 font-semibold",
            sizeClasses,
            className
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-danger-500 dark:bg-danger-400"></span> {props.label || "Inactivo"}
        </span>
      );

    case "PENDIENTE":
    default:
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-full bg-surface-100 dark:bg-slate-500/15 text-surface-700 dark:text-slate-300 border border-surface-200 dark:border-slate-500/30 font-semibold",
            sizeClasses,
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-surface-400 dark:bg-slate-400" />
          Pendiente
        </span>
      );
  }
}

interface RoleBadgeProps {
  role: RoleKey | string;
  size?: "sm" | "md";
  className?: string;
}

export function RoleBadge({ role, size = "md", className }: RoleBadgeProps) {
  const normRole = (role || "").toUpperCase();
  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[10px] tracking-wider"
      : "px-2.5 py-1 text-xs tracking-wider";

  switch (normRole) {
    case "ADMIN":
    case "SUPER_ADMIN":
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 uppercase font-mono font-bold",
            sizeClasses,
            className
          )}
        >
          Admin
        </span>
      );
    case "SUPERVISOR":
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-md bg-cyan-50 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30 uppercase font-mono font-bold",
            sizeClasses,
            className
          )}
        >
          Supervisor
        </span>
      );
    case "ALUMNO":
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-md bg-danger-50 dark:bg-danger-500/15 text-danger-700 dark:text-danger-300 border border-danger-200 dark:border-danger-500/30 uppercase font-mono font-bold",
            sizeClasses,
            className
          )}
        >
          Alumno
        </span>
      );
    case "EMPLEADO":
    default:
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-md bg-primary-50 dark:bg-emerald-500/15 text-primary-700 dark:text-emerald-300 border border-primary-200 dark:border-emerald-500/30 uppercase font-mono font-bold",
            sizeClasses,
            className
          )}
        >
          Empleado
        </span>
      );
  }
}
