"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  ShieldCheck,
  MapPin,
  RefreshCw,
  Sparkles,
  Clock,
  CheckCircle2,
  CalendarDays,
  LayoutGrid,
  List,
} from "lucide-react";
import { ViewModeToggle } from "@/components/ui/ViewModeToggle";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { FilterToolbar } from "@/components/ui/FilterToolbar";
import { Button } from "@/components/ui/Button";
import { SkeletonTable } from "@/components/ui/Skeleton";
import {
  DataTableContainer,
  DataTableHeader,
  DataTableHead,
  DataTableBody,
  DataTableRow,
  DataTableCell,
} from "@/components/ui/DataTable";
import { ActionButtonGroup, ActionButton } from "@/components/ui/ActionButton";
import { useToast } from "@/providers/ToastProvider";
import { useConfirm } from "@/providers/ConfirmDialogProvider";
import { HolidayModal } from "@/components/holidays/HolidayModal";
import { YearCalendarView } from "@/components/holidays/YearCalendarView";

interface HolidayItem {
  id: string;
  name: string;
  date: string;
  locationId: string | null;
  isActive: boolean;
}

interface LocationOption {
  id: string;
  name: string;
}

export default function FeriadosPage() {
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [viewMode, setViewMode] = useState<"calendar" | "grid" | "table">("calendar");
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { toast } = useToast();
  const { confirm } = useConfirm();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [holidaysRes, locationsRes] = await Promise.all([
        fetch("/api/holidays"),
        fetch("/api/locations"),
      ]);

      const holidaysData = await holidaysRes.json();
      const locationsData = await locationsRes.json();

      if (holidaysData.holidays) {
        setHolidays(holidaysData.holidays);
      }
      if (locationsData.locations) {
        setLocations(
          locationsData.locations.map((l: any) => ({
            id: l.id,
            name: l.name,
          }))
        );
      }
    } catch (err) {
      console.error("Error fetching holidays:", err);
      toast.error("Error al cargar los feriados");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered holidays
  const filteredHolidays = useMemo(() => {
    return holidays.filter((h) => {
      const hDate = new Date(h.date);
      const matchesYear =
        selectedYear === "ALL" || hDate.getUTCFullYear().toString() === selectedYear;
      const matchesSearch =
        !search || h.name.toLowerCase().includes(search.toLowerCase());
      return matchesYear && matchesSearch;
    });
  }, [holidays, selectedYear, search]);

  // Statistics
  const stats = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const currentYear = new Date().getFullYear();
    const thisYearHolidays = holidays.filter((h) => {
      const d = new Date(h.date);
      return d.getUTCFullYear() === currentYear;
    });

    const upcomingHolidays = holidays
      .map((h) => ({ ...h, dObj: new Date(h.date) }))
      .filter((h) => h.dObj >= now)
      .sort((a, b) => a.dObj.getTime() - b.dObj.getTime());

    const nextHoliday = upcomingHolidays[0] || null;
    let daysUntilNext = null;
    if (nextHoliday) {
      const diffTime = nextHoliday.dObj.getTime() - now.getTime();
      daysUntilNext = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      totalThisYear: thisYearHolidays.length,
      upcomingCount: upcomingHolidays.length,
      nextHolidayName: nextHoliday ? nextHoliday.name : "Ninguno próximo",
      daysUntilNext,
    };
  }, [holidays]);

  const handleDelete = async (holiday: HolidayItem) => {
    const formattedDate = new Intl.DateTimeFormat("es-PE", {
      dateStyle: "long",
      timeZone: "UTC",
    }).format(new Date(holiday.date));

    const ok = await confirm({
      title: "¿Eliminar día feriado?",
      description: `¿Estás seguro de eliminar el feriado "${holiday.name}" (${formattedDate})? El cierre automatizado (EOD) volverá a exigir marcaciones normales ese día.`,
      confirmText: "Eliminar Feriado",
      variant: "danger",
    });

    if (!ok) return;

    try {
      const res = await fetch(`/api/holidays/${holiday.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar");
      }

      toast.success("Feriado eliminado con éxito");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar el feriado");
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in-up pb-10">
      {/* 1. Header */}
      <PageHeader
        title="Gestor de Feriados Oficiales"
        titleBadge={
          <span className="text-[10px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 whitespace-nowrap">
            {holidays.length} Registrados
          </span>
        }
        subtitle="Configura los días no laborables oficiales. El cierre automatizado de medianoche (EOD) no registrará faltas en estas fechas."
        icon={CalendarIcon}
        iconVariant="emerald"
        actionButtons={
          <>
            <Button
              variant="secondary"
              onClick={fetchData}
              isLoading={isLoading}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Actualizar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setModalInitialDate(undefined);
                setIsModalOpen(true);
              }}
              icon={<Plus className="w-4 h-4" />}
            >
              Nuevo Feriado
            </Button>
          </>
        }
      />

      {/* 2. Operational KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={`Feriados ${new Date().getFullYear()}`}
          value={stats.totalThisYear}
          subLabel="Días oficiales registrados"
          icon={CalendarDays}
          variant="emerald"
        />
        <StatCard
          label="Próximo Feriado"
          value={
            stats.daysUntilNext !== null
              ? stats.daysUntilNext === 0
                ? "¡Hoy!"
                : `En ${stats.daysUntilNext} días`
              : "Sin próximos"
          }
          subLabel={stats.nextHolidayName}
          icon={Clock}
          variant="cyan"
        />
        <StatCard
          label="Restantes del Año"
          value={stats.upcomingCount}
          subLabel="Por conmemorar"
          icon={Sparkles}
          variant="amber"
        />
        <StatCard
          label="Cierre EOD"
          value="Automático"
          subLabel="Sin penalidad de falta"
          icon={ShieldCheck}
          variant="indigo"
        />
      </section>

      {/* 3. View Switcher & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Toggle Mode */}
        <ViewModeToggle
          value={viewMode}
          onChange={setViewMode}
          options={[
            {
              id: "calendar",
              label: "Calendario",
              icon: CalendarDays,
              title: "Vista en Calendario Anual (12 Meses)",
            },
            {
              id: "grid",
              label: "Cuadrícula",
              icon: LayoutGrid,
              title: "Vista en Cuadrícula",
            },
            {
              id: "table",
              label: "Tabla",
              icon: List,
              title: "Vista en Tabla",
            },
          ]}
        />

        {viewMode !== "calendar" && (
          <div className="text-xs text-surface-500 font-mono">
            {filteredHolidays.length} {filteredHolidays.length === 1 ? "feriado filtrado" : "feriados filtrados"}
          </div>
        )}
      </div>

      {/* Filters (Shown in grid & table modes) */}
      {viewMode !== "calendar" && (
        <FilterToolbar
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar feriado por nombre o motivo..."
          onReset={() => {
            setSearch("");
            setSelectedYear(new Date().getFullYear().toString());
          }}
          filters={[
            {
              id: "year",
              value: selectedYear,
              onChange: setSelectedYear,
              options: [
                { value: "ALL", label: "Todos los años" },
                { value: "2024", label: "Año 2024" },
                { value: "2025", label: "Año 2025" },
                { value: "2026", label: "Año 2026" },
                { value: "2027", label: "Año 2027" },
              ],
            },
          ]}
        />
      )}

      {/* 4. Main Body: Calendar Grid, Cards Grid, or Table */}
      {viewMode === "calendar" ? (
        isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-3xl">
            <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mb-3" />
            <p className="text-sm font-medium text-surface-500">Cargando calendario oficial...</p>
          </div>
        ) : (
          <YearCalendarView
            year={
              selectedYear === "ALL"
                ? new Date().getFullYear()
                : parseInt(selectedYear, 10) || new Date().getFullYear()
            }
            onYearChange={(newYear) => setSelectedYear(newYear.toString())}
            holidays={holidays}
            locations={locations}
            onSelectEmptyDate={(dateStr) => {
              setModalInitialDate(dateStr);
              setIsModalOpen(true);
            }}
            onDeleteHoliday={handleDelete}
          />
        )
      ) : viewMode === "grid" ? (
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-3xl p-5 sm:p-7 shadow-sm">
          <div className="flex items-center justify-between pb-5 border-b border-surface-100 dark:border-surface-800">
            <div>
              <h2 className="text-base font-bold text-surface-900 dark:text-white tracking-tight">
                Calendario Oficial de Fechas No Laborables
              </h2>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                Días exentos de marcación para todo el personal asignado.
              </p>
            </div>
            <span className="px-3 py-1 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 rounded-full text-xs font-semibold font-mono">
              {filteredHolidays.length} {filteredHolidays.length === 1 ? "día" : "días"}
            </span>
          </div>

          {isLoading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mb-3" />
              <p className="text-sm font-medium text-surface-500">Cargando calendario oficial...</p>
            </div>
          ) : filteredHolidays.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700 flex items-center justify-center text-surface-400 mb-4">
                <CalendarIcon className="w-8 h-8 opacity-60" />
              </div>
              <h3 className="text-base font-bold text-surface-900 dark:text-white mb-1">
                No hay feriados para mostrar
              </h3>
              <p className="text-xs text-surface-500 dark:text-surface-400 max-w-sm mb-5">
                {search || selectedYear !== "ALL"
                  ? "No se encontraron feriados con los filtros aplicados."
                  : "Aún no se han registrado días no laborables para tu organización."}
              </p>
              <Button
                variant="primary"
                onClick={() => {
                  setModalInitialDate(undefined);
                  setIsModalOpen(true);
                }}
                icon={<Plus className="w-4 h-4" />}
              >
                Registrar Primer Feriado
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-6">
              {filteredHolidays.map((holiday) => {
                const hDate = new Date(holiday.date);
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const isPast = hDate < now;
                const locationName = holiday.locationId
                  ? locations.find((l) => l.id === holiday.locationId)?.name || "Sede específica"
                  : "Alcance Global (Todas las sedes)";

                const monthStr = new Intl.DateTimeFormat("es-PE", {
                  month: "short",
                  timeZone: "UTC",
                }).format(hDate);

                const dayStr = new Intl.DateTimeFormat("es-PE", {
                  day: "2-digit",
                  timeZone: "UTC",
                }).format(hDate);

                const weekdayFull = new Intl.DateTimeFormat("es-PE", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                }).format(hDate);

                return (
                  <div
                    key={holiday.id}
                    className={`group relative p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                      isPast
                        ? "bg-surface-50/50 dark:bg-surface-900/40 border-surface-200/70 dark:border-surface-800 opacity-75 hover:opacity-100"
                        : "bg-white dark:bg-surface-800/40 border-surface-200 dark:border-surface-700/60 hover:shadow-md hover:border-emerald-500/40 dark:hover:border-emerald-500/30"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Date Block */}
                      <div
                        className={`w-13 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border transition-transform group-hover:scale-105 shadow-2xs ${
                          isPast
                            ? "bg-surface-200/50 dark:bg-surface-800 border-surface-300/50 dark:border-surface-700 text-surface-500"
                            : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        <span className="text-[10px] font-black uppercase tracking-wider leading-none mb-0.5">
                          {monthStr}
                        </span>
                        <span className="text-xl font-extrabold leading-none">
                          {dayStr}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md ${
                              isPast
                                ? "bg-surface-200/60 dark:bg-surface-800 text-surface-600 dark:text-surface-400"
                                : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40"
                            }`}
                          >
                            {isPast ? "Pasado" : "Próximo"}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-surface-900 dark:text-white leading-snug truncate">
                          {holiday.name}
                        </h4>
                        <p className="text-[11px] text-surface-500 dark:text-surface-400 capitalize mt-0.5">
                          {weekdayFull}
                        </p>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDelete(holiday)}
                        className="p-2 rounded-xl text-surface-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                        title="Eliminar feriado"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Scope pill footer */}
                    <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-800/60 flex items-center justify-between text-[11px] text-surface-500 dark:text-surface-400">
                      <span className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                        <span className="truncate">{locationName}</span>
                      </span>
                      <span className="font-mono text-[10px] text-surface-400">
                        {hDate.getUTCFullYear()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        isLoading ? (
          <SkeletonTable rows={5} cols={5} />
        ) : filteredHolidays.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-3xl shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700 flex items-center justify-center text-surface-400 mb-4">
              <CalendarIcon className="w-8 h-8 opacity-60" />
            </div>
            <h3 className="text-base font-bold text-surface-900 dark:text-white mb-1">
              No hay feriados para mostrar
            </h3>
            <p className="text-xs text-surface-500 dark:text-surface-400 max-w-sm mb-5">
              {search || selectedYear !== "ALL"
                ? "No se encontraron feriados con los filtros aplicados."
                : "Aún no se han registrado días no laborables para tu organización."}
            </p>
            <Button
              variant="primary"
              onClick={() => {
                setModalInitialDate(undefined);
                setIsModalOpen(true);
              }}
              icon={<Plus className="w-4 h-4" />}
            >
              Registrar Primer Feriado
            </Button>
          </div>
        ) : (
          <DataTableContainer>
            <DataTableHeader>
              <DataTableHead>Fecha</DataTableHead>
              <DataTableHead>Festividad / Motivo</DataTableHead>
              <DataTableHead>Alcance / Sede</DataTableHead>
              <DataTableHead>Estado</DataTableHead>
              <DataTableHead align="right">Acciones</DataTableHead>
            </DataTableHeader>
            <DataTableBody>
                {filteredHolidays.map((holiday) => {
                  const hDate = new Date(holiday.date);
                  const now = new Date();
                  now.setHours(0, 0, 0, 0);
                  const isPast = hDate < now;
                  const isToday = hDate.toDateString() === now.toDateString();
                  const locationName = holiday.locationId
                    ? locations.find((l) => l.id === holiday.locationId)?.name || "Sede específica"
                    : "Alcance Global (Todas las sedes)";

                  const weekdayFull = new Intl.DateTimeFormat("es-PE", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  }).format(hDate);

                  const monthStr = new Intl.DateTimeFormat("es-PE", {
                    month: "short",
                    timeZone: "UTC",
                  }).format(hDate);

                  const dayStr = new Intl.DateTimeFormat("es-PE", {
                    day: "2-digit",
                    timeZone: "UTC",
                  }).format(hDate);

                  return (
                    <DataTableRow key={holiday.id}>
                      <DataTableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 border shadow-2xs ${
                              isPast
                                ? "bg-surface-200/50 dark:bg-surface-800 border-surface-300/50 dark:border-surface-700 text-surface-500"
                                : isToday
                                ? "bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400"
                                : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            <span className="text-[9px] font-black uppercase tracking-wider leading-none mb-0.5">
                              {monthStr}
                            </span>
                            <span className="text-base font-extrabold leading-none">
                              {dayStr}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-surface-900 dark:text-white capitalize block text-sm">
                              {weekdayFull}
                            </span>
                            <span className="text-xs text-surface-500 font-mono">
                              {holiday.date.split("T")[0]}
                            </span>
                          </div>
                        </div>
                      </DataTableCell>
                      <DataTableCell>
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="font-bold text-surface-900 dark:text-white text-sm">
                            {holiday.name}
                          </span>
                        </div>
                      </DataTableCell>
                      <DataTableCell>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 border border-surface-200 dark:border-surface-700/60">
                          <MapPin className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                          <span>{locationName}</span>
                        </div>
                      </DataTableCell>
                      <DataTableCell>
                        {isToday ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800/40">
                            <Clock className="w-3 h-3" />
                            ¡Hoy!
                          </span>
                        ) : isPast ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-200/60 dark:bg-surface-800 text-surface-600 dark:text-surface-400">
                            Pasado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                            Próximo
                          </span>
                        )}
                      </DataTableCell>
                      <DataTableCell align="right">
                        <ActionButtonGroup align="right">
                          <ActionButton
                            size="sm"
                            variant="danger"
                            title="Eliminar feriado"
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                            onClick={() => handleDelete(holiday)}
                          />
                        </ActionButtonGroup>
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
          </DataTableContainer>
        )
      )}

      {/* Modal */}
      <HolidayModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalInitialDate(undefined);
        }}
        onSuccess={fetchData}
        locations={locations}
        initialDate={modalInitialDate}
      />
    </div>
  );
}
