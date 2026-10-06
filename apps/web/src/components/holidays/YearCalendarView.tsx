"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  Trash2,
  X,
  Plus,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface HolidayItem {
  id: string;
  name: string;
  date: string;
  locationId: string | null;
  isActive: boolean;
}

export interface LocationOption {
  id: string;
  name: string;
}

interface YearCalendarViewProps {
  year: number;
  onYearChange: (year: number) => void;
  holidays: HolidayItem[];
  locations: LocationOption[];
  onSelectEmptyDate: (dateStr: string) => void;
  onDeleteHoliday: (holiday: HolidayItem) => void;
}

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Setiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

export function YearCalendarView({
  year,
  onYearChange,
  holidays,
  locations,
  onSelectEmptyDate,
  onDeleteHoliday,
}: YearCalendarViewProps) {
  const [selectedHoliday, setSelectedHoliday] = useState<HolidayItem | null>(null);

  // Group holidays by date YYYY-MM-DD
  const holidaysByDate = useMemo(() => {
    const map = new Map<string, HolidayItem[]>();
    for (const h of holidays) {
      const dateKey = h.date.slice(0, 10);
      const list = map.get(dateKey) || [];
      list.push(h);
      map.set(dateKey, list);
    }
    return map;
  }, [holidays]);

  // Current date info
  const today = new Date();
  const currentYear = today.getFullYear();
  const todayKey = `${currentYear}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;

  // Count holidays in the selected year
  const totalYearHolidays = useMemo(() => {
    return holidays.filter((h) => {
      const hDate = new Date(h.date);
      return hDate.getUTCFullYear() === year;
    }).length;
  }, [holidays, year]);

  return (
    <div className="space-y-6">
      {/* 1. Header controls & Legend */}
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-3xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Year navigator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-surface-100 dark:bg-surface-800/80 rounded-2xl p-1 border border-surface-200 dark:border-surface-700/60">
              <button
                type="button"
                onClick={() => onYearChange(year - 1)}
                className="p-2 rounded-xl text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white hover:bg-white dark:hover:bg-surface-700 transition cursor-pointer"
                title="Año anterior"
                aria-label="Año anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-1 text-lg font-black font-mono text-surface-900 dark:text-white tracking-wider">
                {year}
              </span>
              <button
                type="button"
                onClick={() => onYearChange(year + 1)}
                className="p-2 rounded-xl text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white hover:bg-white dark:hover:bg-surface-700 transition cursor-pointer"
                title="Año siguiente"
                aria-label="Año siguiente"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {year !== currentYear && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onYearChange(currentYear)}
              >
                Ir a {currentYear}
              </Button>
            )}

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-surface-200 dark:border-surface-800">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20 font-mono">
                {totalYearHolidays} {totalYearHolidays === 1 ? "feriado registrado" : "feriados registrados"}
              </span>
            </div>
          </div>

          {/* Visual Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-surface-600 dark:text-surface-400 pt-2 md:pt-0 border-t md:border-t-0 border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500 shrink-0 shadow-2xs" />
              <span>Feriado Global</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-indigo-500 shrink-0 shadow-2xs" />
              <span>Por Sede</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md border-2 border-primary-500 shrink-0" />
              <span>Hoy</span>
            </div>
            <div className="flex items-center gap-1.5 text-surface-400 dark:text-surface-500">
              <Plus className="w-3 h-3" />
              <span>Clic en día libre para registrar</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 12-Month Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4.5">
        {MONTH_NAMES.map((monthName, monthIndex) => {
          // Calculate first day of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
          const firstDayDate = new Date(Date.UTC(year, monthIndex, 1));
          // Shift so Monday is index 0: Mon=0, Tue=1, ..., Sun=6
          const startDayOffset = (firstDayDate.getUTCDay() + 6) % 7;
          // Days in this month
          const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

          // Count holidays in this specific month
          let monthHolidaysCount = 0;
          for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            if (holidaysByDate.has(dateStr)) {
              monthHolidaysCount += holidaysByDate.get(dateStr)!.length;
            }
          }

          return (
            <div
              key={monthName}
              className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-3xl p-4 shadow-2xs hover:border-surface-300 dark:hover:border-surface-700 transition flex flex-col justify-between"
            >
              {/* Month Card Header */}
              <div className="flex items-center justify-between pb-3 mb-2.5 border-b border-surface-100 dark:border-surface-800/80">
                <h3 className="text-sm font-bold text-surface-900 dark:text-white capitalize">
                  {monthName}
                </h3>
                {monthHolidaysCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20">
                    {monthHolidaysCount} {monthHolidaysCount === 1 ? "feriado" : "feriados"}
                  </span>
                ) : (
                  <span className="text-[10px] text-surface-400 dark:text-surface-500 font-mono">
                    0 feriados
                  </span>
                )}
              </div>

              {/* Days of week header */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                {WEEKDAYS.map((wd, i) => (
                  <div
                    key={`${monthName}-wd-${i}`}
                    className={`text-[10px] font-bold font-mono py-0.5 ${
                      i >= 5
                        ? "text-surface-400 dark:text-surface-500"
                        : "text-surface-500 dark:text-surface-400"
                    }`}
                  >
                    {wd}
                  </div>
                ))}
              </div>

              {/* Day cells grid */}
              <div className="grid grid-cols-7 gap-1 text-center flex-1">
                {/* Empty cells before month starts */}
                {Array.from({ length: startDayOffset }).map((_, i) => (
                  <div key={`empty-${monthIndex}-${i}`} className="aspect-square" />
                ))}

                {/* Day numbers */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(
                    dayNum
                  ).padStart(2, "0")}`;
                  const dayHolidays = holidaysByDate.get(dateStr);
                  const isHoliday = Boolean(dayHolidays && dayHolidays.length > 0);
                  const holiday = dayHolidays ? dayHolidays[0] : null;
                  const isToday = dateStr === todayKey;
                  const dayOfWeek = (startDayOffset + i) % 7;
                  const isWeekend = dayOfWeek >= 5;

                  const isGlobal = holiday ? holiday.locationId === null : false;

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => {
                        if (isHoliday && holiday) {
                          setSelectedHoliday(holiday);
                        } else {
                          onSelectEmptyDate(dateStr);
                        }
                      }}
                      title={
                        isHoliday && holiday
                          ? `${holiday.name} (${holiday.locationId ? "Sede específica" : "Global"})`
                          : `Registrar feriado para el ${dayNum} de ${monthName}`
                      }
                      className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        isHoliday
                          ? isGlobal
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-xs hover:scale-108 z-10"
                            : "bg-indigo-500 hover:bg-indigo-600 text-white font-bold shadow-xs hover:scale-108 z-10"
                          : isToday
                          ? "ring-2 ring-primary-500 text-primary-600 dark:text-primary-400 font-extrabold hover:bg-primary-50 dark:hover:bg-primary-950/30"
                          : isWeekend
                          ? "text-surface-400 dark:text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-white"
                          : "text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-white"
                      }`}
                    >
                      <span className="leading-none">{dayNum}</span>

                      {/* Small visual dot for multiple holidays on same date */}
                      {dayHolidays && dayHolidays.length > 1 && (
                        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-white animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Floating / Modal Holiday Inspector */}
      {selectedHoliday && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/50 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-md bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-3xl p-6 shadow-xl space-y-4 animate-scale-in"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm ${
                    selectedHoliday.locationId ? "bg-indigo-500" : "bg-emerald-500"
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span
                    className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md ${
                      selectedHoliday.locationId
                        ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20"
                        : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                    }`}
                  >
                    {selectedHoliday.locationId ? "Feriado por Sede" : "Feriado Oficial Global"}
                  </span>
                  <h3 className="text-base font-bold text-surface-900 dark:text-white mt-1 leading-snug">
                    {selectedHoliday.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHoliday(null)}
                className="p-1.5 rounded-xl text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details */}
            <div className="p-4 rounded-2xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/60 dark:border-surface-700/50 space-y-2.5 text-xs text-surface-700 dark:text-surface-300">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-surface-400 shrink-0" />
                <span className="font-semibold capitalize">
                  {new Intl.DateTimeFormat("es-PE", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  }).format(new Date(selectedHoliday.date))}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-surface-400 shrink-0" />
                <span>
                  {selectedHoliday.locationId
                    ? locations.find((l) => l.id === selectedHoliday.locationId)?.name ||
                      "Sede específica"
                    : "Alcance Global (Todas las sedes)"}
                </span>
              </div>
              <div className="flex items-start gap-2 pt-2 border-t border-surface-200/40 dark:border-surface-700/40 text-[11px] text-surface-500 dark:text-surface-400">
                <Info className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  El cierre diario (EOD) no registrará faltas injustificadas en esta fecha.
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  const toDelete = selectedHoliday;
                  setSelectedHoliday(null);
                  onDeleteHoliday(toDelete);
                }}
                icon={<Trash2 className="w-4 h-4" />}
              >
                Eliminar Feriado
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedHoliday(null)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
