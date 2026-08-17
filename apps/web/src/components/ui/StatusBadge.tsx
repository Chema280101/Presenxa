import React from "react";
import {
  CheckCircle2,
  Clock3,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  FileText,
  HelpCircle,
  UserCheck,
  ShieldAlert,
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
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({
  status,
  lateMinutes,
  hasExit,
  size = "md",
  className,
}: StatusBadgeProps) {
  const normStatus = (status || "").toUpperCase();

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[11px] gap-1"
      : "px-2.5 py-1 text-xs gap-1.5";

  switch (normStatus) {
    case "PRESENTE":
      if (hasExit) {
        return (
          <span
            className={clsx(
              "inline-flex items-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30 font-medium",
              sizeClasses,
              className
            )}
            title="Jornada completada con éxito (Entrada y Salida registradas)"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Completado
          </span>
        );
      }
      if (hasExit === false) {
        return (
          <span
            className={clsx(
              "inline-flex items-center rounded-xl bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40 font-medium",
              sizeClasses,
              className
            )}
            title="En jornada laboral activa"
          >
            <span className="relative flex h-2 w-2 mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            En Turno
          </span>
        );
      }
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-xl badge-presente",
            sizeClasses,
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Presente
        </span>
      );

    case "TARDE":
      if (hasExit) {
        return (
          <span
            className={clsx(
              "inline-flex items-center rounded-xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30 font-medium",
              sizeClasses,
              className
            )}
            title="Jornada completada con tardanza registrada"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            Completado {lateMinutes ? `(+${lateMinutes}m)` : "(Tarde)"}
          </span>
        );
      }
      if (hasExit === false) {
        return (
          <span
            className={clsx(
              "inline-flex items-center rounded-xl bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40 font-medium",
              sizeClasses,
              className
            )}
            title="En jornada laboral activa con tardanza registrada"
          >
            <span className="relative flex h-2 w-2 mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
            </span>
            En Turno {lateMinutes ? `(+${lateMinutes}m)` : "(Tarde)"}
          </span>
        );
      }
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-xl badge-tarde",
            sizeClasses,
            className
          )}
        >
          <Clock3 className="w-3.5 h-3.5" />
          Tardanza {lateMinutes ? `(+${lateMinutes}m)` : ""}
        </span>
      );

    case "ABANDONO_PUESTO":
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-xl badge-abandono animate-pulse",
            sizeClasses,
            className
          )}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          Abandono
        </span>
      );

    case "AUSENTE":
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-xl badge-ausente",
            sizeClasses,
            className
          )}
        >
          <XCircle className="w-3.5 h-3.5" />
          Ausente
        </span>
      );

    case "JUSTIFICADO":
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-xl badge-justificado",
            sizeClasses,
            className
          )}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Justificado
        </span>
      );

    case "PERMISO":
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-xl badge-permiso",
            sizeClasses,
            className
          )}
        >
          <FileText className="w-3.5 h-3.5" />
          Permiso
        </span>
      );

    case "INCOMPLETO":
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-xl badge-incompleto",
            sizeClasses,
            className
          )}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Incompleto
        </span>
      );

    case "FERIADO":
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-xl badge-pendiente",
            sizeClasses,
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Feriado
        </span>
      );

    case "PENDIENTE":
    default:
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-xl badge-pendiente",
            sizeClasses,
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
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
      ? "px-2 py-0.5 text-[10px] tracking-wide"
      : "px-2.5 py-1 text-xs tracking-wide";

  switch (normRole) {
    case "ADMIN":
      return (
        <span
          className={clsx(
            "inline-flex items-center rounded-lg badge-role-admin uppercase",
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
            "inline-flex items-center rounded-lg badge-role-supervisor uppercase",
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
            "inline-flex items-center rounded-lg badge-role-alumno uppercase",
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
            "inline-flex items-center rounded-lg badge-role-empleado uppercase",
            sizeClasses,
            className
          )}
        >
          Empleado
        </span>
      );
  }
}
