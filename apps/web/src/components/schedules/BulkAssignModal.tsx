"use client";

import { useState, useEffect, useMemo } from "react";
import { Users, Loader2, Search, MapPin, CheckSquare, Square, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";
import { useToast } from "@/providers/ToastProvider";
import { ModalShell } from "@/components/ui/ModalShell";

interface ScheduleItem {
  id: string;
  name: string;
  isActive: boolean;
  isTemplate?: boolean;
}

interface UserItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  location?: { id: string; name: string } | null;
  userSchedules?: any[];
}

interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkAssignModal({ isOpen, onClose, onSuccess }: BulkAssignModalProps) {
  const { toast } = useToast();

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("ALL");
  const [search, setSearch] = useState("");
  
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    } else {
      setSelectedUserIds(new Set());
      setSelectedScheduleId("");
      setSearch("");
      setSelectedLocationId("ALL");
    }
  }, [isOpen]);

  const fetchInitialData = async () => {
    try {
      setIsLoadingUsers(true);
      const [schedRes, locRes, usersRes] = await Promise.all([
        fetch("/api/schedules"),
        fetch("/api/locations"),
        fetch("/api/users?isActive=true")
      ]);
      
      const schedData = await schedRes.json();
      const locData = await locRes.json();
      const usersData = await usersRes.json();
      
      if (schedData.schedules) {
        setSchedules(schedData.schedules.filter((s: any) => !s.isTemplate && s.isActive));
      }
      if (locData.locations) {
        setLocations(locData.locations);
      }
      if (usersData.users) {
        setUsers(usersData.users);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = search === "" || 
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      
      const matchLocation = selectedLocationId === "ALL" || 
        (selectedLocationId === "GLOBAL" && !u.location) ||
        u.location?.id === selectedLocationId;
        
      return matchSearch && matchLocation;
    });
  }, [users, search, selectedLocationId]);

  const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.has(u.id));

  const toggleSelectAll = () => {
    const newSet = new Set(selectedUserIds);
    if (allFilteredSelected) {
      filteredUsers.forEach(u => newSet.delete(u.id));
    } else {
      filteredUsers.forEach(u => newSet.add(u.id));
    }
    setSelectedUserIds(newSet);
  };

  const toggleUser = (id: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedUserIds(newSet);
  };

  const handleSubmit = async () => {
    if (!selectedScheduleId) {
      toast.error("Selecciona un horario para asignar");
      return;
    }
    if (selectedUserIds.size === 0) {
      toast.error("Selecciona al menos un colaborador");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/schedules/assign-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: selectedScheduleId,
          userIds: Array.from(selectedUserIds),
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al asignar");
      
      toast.success(data.message || "Asignación masiva completada");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const premiumInputClass =
    "w-full h-11 pl-10 pr-4 text-sm bg-white dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-surface-900 dark:text-white placeholder:text-surface-400 dark:placeholder:text-surface-500 font-medium rounded-xl border border-surface-200 dark:border-white/10 dark:hover:border-white/20 shadow-xs focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20 outline-none transition-all";

  const footer = (
    <div className="flex items-center justify-between w-full">
      <span className="text-sm font-medium text-surface-500 dark:text-slate-400">
        <strong className="text-surface-900 dark:text-white mr-1">{selectedUserIds.size}</strong> 
        seleccionados
      </span>
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="h-10 px-5 rounded-xl bg-danger-50 hover:bg-danger-100 text-danger-700 hover:text-danger-800 border border-danger-200 hover:border-danger-300 dark:bg-danger-500/10 dark:hover:bg-danger-500/20 dark:text-danger-300 dark:hover:text-danger-200 dark:border-danger-500/30 dark:hover:border-danger-500/50 text-sm font-semibold flex items-center justify-center transition cursor-pointer disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || selectedUserIds.size === 0 || !selectedScheduleId}
          className="h-10 px-6 rounded-xl bg-primary-500 hover:bg-primary-600 text-white shadow-sm hover:shadow-md hover:shadow-primary-500/20 text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>Asignar a {selectedUserIds.size} colaboradores</span>
        </button>
      </div>
    </div>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Asignación Masiva de Horarios"
      description="Selecciona el horario y los colaboradores correspondientes a los que se aplicará."
      icon={Users}
      iconVariant="primary"
      maxWidth="4xl"
      footer={footer}
    >
      <div className="flex flex-col h-[60vh]">
        <div className="shrink-0 space-y-4 pb-4 border-b border-surface-200 dark:border-white/10 mb-4">
          <div>
            <label className="block text-xs font-semibold text-surface-900 dark:text-slate-300 mb-1.5">
              Horario a Asignar <span className="text-danger-500">*</span>
            </label>
            <select
              value={selectedScheduleId}
              onChange={(e) => setSelectedScheduleId(e.target.value)}
              className={clsx(premiumInputClass, "!pl-4 cursor-pointer appearance-none")}
            >
              <option value="">Selecciona un horario activo...</option>
              {schedules.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400 group-focus-within:text-primary-500 transition-colors">
                <Search className="w-4 h-4" />
              </div>
              <input 
                type="text" 
                placeholder="Buscar por nombre o correo..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={premiumInputClass}
              />
            </div>
            <div className="relative w-full sm:w-64 group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400 group-focus-within:text-primary-500 transition-colors">
                <MapPin className="w-4 h-4" />
              </div>
              <select
                value={selectedLocationId}
                onChange={e => setSelectedLocationId(e.target.value)}
                className={clsx(premiumInputClass, "cursor-pointer appearance-none")}
              >
                <option value="ALL">Todas las sedes</option>
                <option value="GLOBAL">Global (Sin Sede)</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {isLoadingUsers ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-4" />
              <p className="text-sm text-surface-500 dark:text-slate-400">Cargando colaboradores...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div 
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-100 dark:hover:bg-white/5 transition-colors cursor-pointer select-none border border-transparent"
                onClick={toggleSelectAll}
              >
                {allFilteredSelected ? (
                  <CheckSquare className="w-5 h-5 text-primary-500 shrink-0" />
                ) : (
                  <Square className="w-5 h-5 text-surface-400 shrink-0" />
                )}
                <span className="text-sm font-semibold text-surface-900 dark:text-slate-200">
                  Seleccionar todos los filtrados ({filteredUsers.length})
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {filteredUsers.map(user => {
                  const isSelected = selectedUserIds.has(user.id);
                  const currentScheduleName = user.userSchedules?.[0]?.schedule?.name || "Sin horario";
                  return (
                    <div 
                      key={user.id}
                      onClick={() => toggleUser(user.id)}
                      className={clsx(
                        "flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none",
                        isSelected 
                          ? "bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/30" 
                          : "bg-surface-50 dark:bg-white/5 border-surface-200 dark:border-transparent hover:border-surface-300 dark:hover:border-white/20"
                      )}
                    >
                      <div className="mt-0.5">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-primary-500" />
                        ) : (
                          <Square className="w-5 h-5 text-surface-400" />
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-surface-900 dark:text-white truncate">
                            {user.firstName} {user.lastName}
                          </p>
                        </div>
                        <p className="text-xs text-surface-500 dark:text-slate-400 truncate">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-200 dark:bg-white/10 text-surface-700 dark:text-slate-300 font-medium">
                            {user.location ? user.location.name : "Global"}
                          </span>
                          <span className="text-[10px] text-surface-500 dark:text-slate-500 truncate border-l border-surface-200 dark:border-white/10 pl-2">
                            Actual: {currentScheduleName}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {filteredUsers.length === 0 && (
                <div className="text-center py-12 text-surface-500 dark:text-slate-500">
                  No se encontraron colaboradores con esos filtros.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
