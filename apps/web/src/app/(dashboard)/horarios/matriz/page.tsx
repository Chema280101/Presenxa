"use client";

import { useState, useEffect, useMemo } from "react";
import { format, addDays, startOfWeek, endOfWeek, parseISO, isSameDay, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { PageHeader } from "@/components/ui/PageHeader";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon, Clock, X } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/providers/ToastProvider";

interface ScheduleInfo {
  id: string;
  name: string;
  entryHour: number;
  entryMinute: number;
  exitHour: number;
  exitMinute: number;
  isSplit?: boolean;
  workdaysMask?: number;
}

interface UserMatrix {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  location?: { id: string; name: string } | null;
  userSchedules: { schedule: ScheduleInfo; validUntil: string | null }[];
  shiftOverrides: { date: string; schedule: ScheduleInfo }[];
}

export default function MatrizRotacionPage() {
  const { toast } = useToast();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday
  const [weekEnd, setWeekEnd] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const [users, setUsers] = useState<UserMatrix[]>([]);
  const [schedules, setSchedules] = useState<ScheduleInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [editingCell, setEditingCell] = useState<{ userId: string; date: Date } | null>(null);
  
  // Array of 7 days
  const days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  }, [weekStart]);

  useEffect(() => {
    fetchData();
  }, [weekStart]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const startStr = format(weekStart, 'yyyy-MM-dd');
      const endStr = format(weekEnd, 'yyyy-MM-dd');
      
      const [matrixRes, schedRes] = await Promise.all([
        fetch(`/api/schedules/matrix?startDate=${startStr}&endDate=${endStr}`),
        fetch("/api/schedules")
      ]);
      
      const matrixData = await matrixRes.json();
      const schedData = await schedRes.json();
      
      if (matrixData.users) setUsers(matrixData.users);
      if (schedData.schedules) {
        setSchedules(schedData.schedules.filter((s: any) => !s.isTemplate && s.isActive));
      }
    } catch (error) {
      toast.error("Error al cargar la matriz");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevWeek = () => {
    setWeekStart(addDays(weekStart, -7));
    setWeekEnd(addDays(weekEnd, -7));
  };

  const handleNextWeek = () => {
    setWeekStart(addDays(weekStart, 7));
    setWeekEnd(addDays(weekEnd, 7));
  };
  
  const getScheduleForDay = (user: UserMatrix, date: Date) => {
    // Check overrides first
    const override = user.shiftOverrides.find(o => isSameDay(parseISO(o.date), date));
    if (override) return { schedule: override.schedule, isOverride: true };
    
    // Check base schedule
    if (user.userSchedules.length > 0) {
      const baseSched = user.userSchedules[0].schedule;
      // Evaluate workdaysMask
      // JavaScript getDay() returns 0 for Sunday, 1 for Monday...
      // Our mask: Lu=1, Ma=2, Mi=4, Ju=8, Vi=16, Sa=32, Do=64
      let jsDay = getDay(date); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
      let bitMap = jsDay === 0 ? 64 : Math.pow(2, jsDay - 1);
      
      if ((baseSched.workdaysMask ?? 127) & bitMap) {
        return { schedule: baseSched, isOverride: false };
      }
      return { schedule: null, isOverride: false, isRestDay: true };
    }
    
    return { schedule: null, isOverride: false };
  };

  const updateShift = async (userId: string, date: Date, scheduleId: string | null) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      if (scheduleId === null) {
        // Reset (delete override)
        await fetch(`/api/schedules/matrix?userId=${userId}&date=${dateStr}`, {
          method: "DELETE"
        });
      } else {
        // Create/Update override
        await fetch("/api/schedules/matrix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            date: dateStr,
            scheduleId
          })
        });
      }
      setEditingCell(null);
      fetchData(); // Reload data
      toast.success("Turno actualizado");
    } catch (error) {
      toast.error("Error al actualizar turno");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden max-h-[calc(100vh-64px)] sm:max-h-[calc(100vh-2rem)] animate-fade-in-up">
      {/* Top Controls Bar */}
      <div className="flex-shrink-0 px-4 sm:px-8 pt-5 sm:pt-6 pb-4 space-y-4">
        {/* Header with Back button */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/horarios"
            className="p-2.5 rounded-xl bg-surface-100 dark:bg-surface-800/80 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white border border-surface-200 dark:border-surface-700 transition-colors shadow-xs cursor-pointer"
            title="Volver a Horarios"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <PageHeader
            title="Matriz de Rotación Semanal"
            subtitle="Gestiona las excepciones y turnos rotativos del personal día por día."
            icon={CalendarIcon}
            iconVariant="emerald"
          />
        </div>

        {/* Week Navigator Card */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl shadow-sm">
          <button
            onClick={handlePrevWeek}
            className="p-2 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white rounded-xl border border-surface-200 dark:border-surface-700 transition cursor-pointer shadow-xs active:scale-95"
            title="Semana anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 border border-primary-200/60 dark:border-primary-800/40">
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-surface-900 dark:text-white capitalize tracking-tight">
              {format(weekStart, "dd 'de' MMM", { locale: es })} - {format(weekEnd, "dd 'de' MMM yyyy", { locale: es })}
            </h3>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/40">
              Semana Activa
            </span>
          </div>

          <button
            onClick={handleNextWeek}
            className="p-2 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white rounded-xl border border-surface-200 dark:border-surface-700 transition cursor-pointer shadow-xs active:scale-95"
            title="Semana siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 overflow-auto px-4 sm:px-8 pb-8">
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm min-w-[860px]">
          {/* Header Row */}
          <div className="grid grid-cols-[260px_repeat(7,1fr)] border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950/60">
            <div className="p-4 font-bold text-xs uppercase tracking-wider text-surface-600 dark:text-surface-400 border-r border-surface-200 dark:border-surface-800 flex items-center">
              Colaborador
            </div>
            {days.map((day, idx) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={idx}
                  className={`p-3 text-center border-r border-surface-200 dark:border-surface-800 last:border-0 ${
                    isToday ? "bg-primary-50/60 dark:bg-primary-950/40" : ""
                  }`}
                >
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-wider ${
                      isToday
                        ? "text-primary-600 dark:text-primary-400 font-bold"
                        : "text-surface-500 dark:text-surface-400"
                    }`}
                  >
                    {format(day, "EEEE", { locale: es })}
                  </p>
                  <p
                    className={`text-lg font-extrabold mt-0.5 ${
                      isToday
                        ? "text-primary-600 dark:text-primary-400"
                        : "text-surface-900 dark:text-white"
                    }`}
                  >
                    {format(day, "d")}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Body Rows */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
              <p className="text-xs text-surface-500 dark:text-surface-400 font-medium">
                Cargando matriz semanal...
              </p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-surface-400 dark:text-surface-500 text-xs font-medium">
              No hay colaboradores registrados o activos para esta semana.
            </div>
          ) : (
            <div className="divide-y divide-surface-200 dark:divide-surface-800">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="grid grid-cols-[260px_repeat(7,1fr)] hover:bg-surface-50/70 dark:hover:bg-surface-800/40 transition-colors group"
                >
                  {/* Collaborator column */}
                  <div className="p-4 border-r border-surface-200 dark:border-surface-800 flex items-center gap-3 bg-white dark:bg-surface-900">
                    <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/40 flex items-center justify-center font-bold text-xs shrink-0">
                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-surface-900 dark:text-white truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-surface-500 dark:text-surface-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* 7 Days columns */}
                  {days.map((day, idx) => {
                    const shiftData = getScheduleForDay(user, day);
                    const isEditing = editingCell?.userId === user.id && isSameDay(editingCell.date, day);

                    return (
                      <div
                        key={idx}
                        className={`p-2.5 border-r border-surface-200 dark:border-surface-800 last:border-0 relative flex items-center justify-center min-h-[88px] ${
                          isEditing
                            ? "bg-primary-50/60 dark:bg-primary-950/40 ring-2 ring-primary-500/30"
                            : "cursor-pointer hover:bg-surface-100/70 dark:hover:bg-surface-800/50 transition-colors"
                        }`}
                        onClick={() => !isEditing && setEditingCell({ userId: user.id, date: day })}
                      >
                        {isEditing ? (
                          <div className="absolute inset-1 z-20 bg-white dark:bg-surface-900 border border-primary-400/50 dark:border-primary-500/50 rounded-xl p-2.5 shadow-2xl flex flex-col gap-2">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-[11px] font-bold text-primary-600 dark:text-primary-400">
                                Asignar Turno
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCell(null);
                                }}
                                className="text-surface-400 hover:text-surface-900 dark:hover:text-white p-0.5 rounded cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <select
                              className="w-full text-xs bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-white border border-surface-200 dark:border-surface-700 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer"
                              onChange={(e) => updateShift(user.id, day, e.target.value)}
                              defaultValue={shiftData.isOverride ? shiftData.schedule?.id : ""}
                              autoFocus
                            >
                              <option value="" disabled>Seleccione turno...</option>
                              {schedules.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                            {shiftData.isOverride && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateShift(user.id, day, null);
                                }}
                                className="w-full text-[10px] font-medium bg-danger-50 dark:bg-danger-500/15 hover:bg-danger-100 dark:hover:bg-danger-500/25 text-danger-700 dark:text-danger-300 p-1.5 rounded-lg transition cursor-pointer border border-danger-200/60 dark:border-danger-500/30"
                              >
                                Restablecer Original
                              </button>
                            )}
                          </div>
                        ) : shiftData.schedule ? (
                          <div className="w-full flex flex-col items-center gap-1.5 p-1">
                            <span
                              className={`text-[11px] font-bold truncate max-w-full px-1 text-center ${
                                shiftData.isOverride
                                  ? "text-amber-700 dark:text-amber-300"
                                  : "text-surface-800 dark:text-surface-200"
                              }`}
                              title={shiftData.schedule.name}
                            >
                              {shiftData.schedule.name}
                            </span>
                            <span
                              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                                shiftData.isOverride
                                  ? "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/50 shadow-xs"
                                  : "bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 border-surface-200 dark:border-surface-700"
                              }`}
                            >
                              {String(shiftData.schedule.entryHour).padStart(2, "0")}:
                              {String(shiftData.schedule.entryMinute).padStart(2, "0")} -{" "}
                              {String(shiftData.schedule.exitHour).padStart(2, "0")}:
                              {String(shiftData.schedule.exitMinute).padStart(2, "0")}
                            </span>
                          </div>
                        ) : (
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                              shiftData.isRestDay
                                ? "text-surface-600 dark:text-surface-400 bg-surface-100 dark:bg-surface-800 border-surface-200 dark:border-surface-700"
                                : "text-surface-400 dark:text-surface-500 bg-surface-50 dark:bg-surface-950/60 border-surface-200/60 dark:border-surface-800 border-dashed"
                            }`}
                          >
                            {shiftData.isRestDay ? "DESCANSO" : "SIN TURNO"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
