"use client";

import { Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { TodayAttendance, UserProfile } from "./types";

function formatWorkedDuration(workedMinutes?: number | null): string {
  if (!workedMinutes) return "Jornada cumplida";
  return `${Math.floor(workedMinutes / 60)}h ${workedMinutes % 60}m`;
}

function computeWorkdayState(
  profile: UserProfile | null,
  todayAttendance: TodayAttendance | null
) {
  const isSplitSchedule = Boolean(profile?.schedule?.isSplit);
  const hasEntry1 = Boolean(todayAttendance?.entryTime);
  const hasExit1 = Boolean(todayAttendance?.exitTime);
  const hasEntry2 = Boolean(todayAttendance?.entryTime2);
  const hasExit2 = Boolean(todayAttendance?.exitTime2);

  if (!hasEntry1) {
    return {
      badgeText: "Pendiente",
      badgeStyle:
        "bg-warning-100 dark:bg-warning-950/40 text-warning-800 dark:text-warning-300 border-warning-200 dark:border-warning-800/40",
      headline: "Pendiente de Entrada",
      subtext: `Turno: ${profile?.schedule?.entryTime || "--:--"} (Tolerancia: ${
        profile?.schedule?.toleranceMinutes ?? 10
      } min)`,
      timeDisplay: profile?.schedule?.entryTime || "--:--",
      isLive: false,
    };
  }

  if (!isSplitSchedule) {
    if (!hasExit1) {
      return {
        badgeText: "En Jornada",
        badgeStyle:
          "bg-primary-100 dark:bg-primary-950/50 text-primary-800 dark:text-primary-300 border-primary-200 dark:border-primary-800/40",
        headline: "En Jornada Laboral",
        subtext: `Entrada registrada a las ${todayAttendance?.entryTime}. Salida prevista: ${
          profile?.schedule?.exitTime || "--:--"
        }.`,
        timeDisplay: todayAttendance?.entryTime || "--:--",
        isLive: true,
      };
    }
    return {
      badgeText: "Finalizado",
      badgeStyle:
        "bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 border-surface-200 dark:border-surface-700",
      headline: "Jornada Finalizada",
      subtext: `Salida marcada a las ${todayAttendance?.exitTime} · Total: ${formatWorkedDuration(
        todayAttendance?.workedMinutes
      )}`,
      timeDisplay: todayAttendance?.exitTime || "--:--",
      isLive: false,
    };
  }

  if (!hasExit1) {
    return {
      badgeText: "Turno 1",
      badgeStyle:
        "bg-primary-100 dark:bg-primary-950/50 text-primary-800 dark:text-primary-300 border-primary-200 dark:border-primary-800/40",
      headline: "Turno Mañana Activo",
      subtext: `Entrada 1 a las ${todayAttendance?.entryTime}. Pausa prevista: ${
        profile?.schedule?.exitTime || "--:--"
      }.`,
      timeDisplay: todayAttendance?.entryTime || "--:--",
      isLive: true,
    };
  }
  if (!hasEntry2) {
    return {
      badgeText: "En Pausa",
      badgeStyle:
        "bg-info-100 dark:bg-info-950/40 text-info-800 dark:text-info-300 border-info-200 dark:border-info-800/40",
      headline: "En Refrigerio / Pausa",
      subtext: `Retorno turno tarde a las ${profile?.schedule?.entryTime2 || "--:--"}.`,
      timeDisplay: todayAttendance?.exitTime || "--:--",
      isLive: false,
    };
  }
  if (!hasExit2) {
    return {
      badgeText: "Turno 2",
      badgeStyle:
        "bg-primary-100 dark:bg-primary-950/50 text-primary-800 dark:text-primary-300 border-primary-200 dark:border-primary-800/40",
      headline: "Turno Tarde Activo",
      subtext: `Entrada 2 a las ${todayAttendance?.entryTime2}. Salida final: ${
        profile?.schedule?.exitTime2 || "--:--"
      }.`,
      timeDisplay: todayAttendance?.entryTime2 || "--:--",
      isLive: true,
    };
  }
  return {
    badgeText: "Finalizado",
    badgeStyle:
      "bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 border-surface-200 dark:border-surface-700",
    headline: "Jornada Finalizada",
    subtext: `Turno completo registrado · Total: ${formatWorkedDuration(
      todayAttendance?.workedMinutes
    )}`,
    timeDisplay: todayAttendance?.exitTime2 || "--:--",
    isLive: false,
  };
}

interface WorkdayStatusCardProps {
  profile: UserProfile | null;
  todayAttendance: TodayAttendance | null;
  isLoading: boolean;
}

export function WorkdayStatusCard({
  profile,
  todayAttendance,
  isLoading,
}: Readonly<WorkdayStatusCardProps>) {
  if (isLoading && !profile) {
    return (
      <div className="rounded-2xl p-4 sm:p-5 bg-white border border-surface-200 dark:bg-command-card dark:border-white/10 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 flex-1">
          <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-9 w-20 rounded-xl shrink-0" />
      </div>
    );
  }

  const workdayState = computeWorkdayState(profile, todayAttendance);

  return (
    <section
      aria-label="Asistencia de hoy"
      className="rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm bg-white border border-surface-200 dark:bg-command-card dark:border-primary-500/20"
    >
      <div className="flex items-center gap-3.5">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            workdayState.isLive
              ? "bg-primary-500/15 border border-primary-500/30 text-primary-600 dark:text-primary-400"
              : "bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400"
          }`}
        >
          <Clock className="w-6 h-6" aria-hidden="true" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase font-semibold tracking-wider text-surface-500 dark:text-surface-400">
              Asistencia de Hoy
            </span>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${workdayState.badgeStyle}`}
            >
              {workdayState.isLive && (
                <span
                  aria-hidden="true"
                  className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse motion-reduce:animate-none"
                />
              )}
              {workdayState.badgeText}
            </span>
          </div>
          <h2 className="text-base font-bold text-surface-900 dark:text-white mt-0.5">
            {workdayState.headline}
          </h2>
          <p className="text-xs text-surface-600 dark:text-surface-400 mt-0.5">
            {workdayState.subtext}
          </p>
        </div>
      </div>
      <div className="text-left sm:text-right border-t sm:border-t-0 pt-2.5 sm:pt-0 border-surface-100 dark:border-white/5 flex sm:flex-col justify-between items-center sm:items-end shrink-0">
        <span className="text-xs font-mono uppercase tracking-wider text-surface-500 dark:text-surface-400 block sm:hidden">
          Hora clave
        </span>
        <span className="text-sm font-mono px-3 py-1.5 rounded-xl border font-bold bg-surface-100 border-surface-200 text-surface-800 dark:bg-surface-900 dark:border-white/10 dark:text-surface-200 shadow-inner">
          {workdayState.timeDisplay}
        </span>
      </div>
    </section>
  );
}
