"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import Image from "next/image";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  QrCode,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Building,
  Shield,
  Clock,
  RefreshCw,
  MoreVertical,
  ChevronDown,
  UserCheck,
  UserX,
  Sparkles,
  CreditCard,
  Download,
  Calendar,
} from "lucide-react";
import { UserRole } from "@asistencias/db";
import { QrModal } from "@/components/users/QrModal";
import { UserFormModal, UserFormData } from "@/components/users/UserFormModal";
import { OverrideModal } from "@/components/users/OverrideModal";
import { StatCard } from "@/components/ui/StatCard";
import { RoleBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useToast } from "@/providers/ToastProvider";
import { useConfirm } from "@/providers/ConfirmDialogProvider";

interface UserItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  documentId?: string | null;
  role: UserRole;
  isActive: boolean;
  qrToken: string;
  qrGeneratedAt: string;
  nfcCardUid?: string | null;
  location?: { id: string; name: string } | null;
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
}

export default function UsersPage() {
  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: usersData, isLoading, mutate: mutateUsers } = useSWR('/api/users', fetcher, {
    revalidateOnFocus: true,
  });
  const users: UserItem[] = usersData?.users || [];

  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [schedules, setSchedules] = useState<Array<any>>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedUserForQr, setSelectedUserForQr] = useState<any | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [selectedUserForOverride, setSelectedUserForOverride] = useState<any | null>(null);
  const [editingUserData, setEditingUserData] = useState<UserFormData | null>(null);

  const { toast } = useToast();
  const { confirm } = useConfirm();

  const fetchUsers = async () => {
    await mutateUsers();
  };

  const fetchLocationsAndSchedules = async () => {
    try {
      const [locRes, schRes] = await Promise.all([
        fetch("/api/locations"),
        fetch("/api/schedules"),
      ]);
      const locData = await locRes.json();
      const schData = await schRes.json();
      if (locData.locations) setLocations(locData.locations);
      if (schData.schedules) setSchedules(schData.schedules);
    } catch (err) {
      console.error("Error fetching locations or schedules:", err);
    }
  };

  useEffect(() => {
    fetchLocationsAndSchedules();
  }, []);

  // Filtered users calculation
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
      const matchesSearch =
        !search ||
        fullName.includes(search.toLowerCase()) ||
        (u.phone && u.phone.toLowerCase().includes(search.toLowerCase())) ||
        (u.documentId && u.documentId.toLowerCase().includes(search.toLowerCase())) ||
        (u.nfcCardUid && u.nfcCardUid.toLowerCase().includes(search.toLowerCase()));

      const matchesRole = selectedRole === "ALL" || u.role === selectedRole;
      const matchesLoc = selectedLocation === "ALL" || u.location?.id === selectedLocation;
      const matchesStatus =
        selectedStatus === "ALL" ||
        (selectedStatus === "ACTIVE" && u.isActive) ||
        (selectedStatus === "INACTIVE" && !u.isActive);

      return matchesSearch && matchesRole && matchesLoc && matchesStatus;
    });
  }, [users, search, selectedRole, selectedLocation, selectedStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const employees = users.filter((u) => u.role === UserRole.EMPLEADO || u.role === UserRole.ALUMNO).length;
    const supervisors = users.filter((u) => u.role === UserRole.ADMIN || u.role === UserRole.SUPERVISOR || u.role === UserRole.SUPER_ADMIN).length;
    return { total, active, employees, supervisors };
  }, [users]);

  // Handle Save (Create / Update)
  const handleSaveUser = async (data: UserFormData): Promise<boolean> => {
    try {
      if (data.id) {
        // Edit user
        const res = await fetch(`/api/users/${data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Error al actualizar usuario");

        toast.success("Usuario actualizado con éxito");
      } else {
        // Create user
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Error al crear usuario");

        toast.success("Usuario creado y QR generado exitosamente");
      }
      await fetchUsers();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Error al guardar el usuario");
      return false;
    }
  };

  // Handle QR Modal Open
  const handleOpenQr = (user: UserItem) => {
    setSelectedUserForQr({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      documentId: user.documentId,
      qrToken: user.qrToken,
      locationName: user.location?.name,
    });
    setIsQrModalOpen(true);
  };

  // Handle Regenerate QR Token
  const handleRegenerateQr = async (userId: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/users/${userId}/revoke-qr`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al regenerar QR");

      toast.success("Nuevo código QR generado");
      await fetchUsers();

      if (selectedUserForQr && selectedUserForQr.id === userId) {
        setSelectedUserForQr((prev: any) => ({
          ...prev,
          qrToken: data.user.qrToken,
        }));
      }
      return data.user.qrToken;
    } catch (err: any) {
      toast.error(err.message || "Error al regenerar código QR");
      return null;
    }
  };

  // Handle Toggle Active/Inactive
  const handleToggleStatus = async (user: UserItem) => {
    const actionName = user.isActive ? "desactivar" : "activar";
    const ok = await confirm({
      title: `¿${actionName.charAt(0).toUpperCase() + actionName.slice(1)} usuario?`,
      description: `¿Estás seguro de ${actionName} a ${user.firstName} ${user.lastName}? ${user.isActive ? "El colaborador no podrá registrar asistencias ni ingresar al sistema mientras esté inactivo." : "El colaborador volverá a tener acceso y registrar asistencia con normalidad."}`,
      confirmText: user.isActive ? "Desactivar" : "Activar",
      variant: user.isActive ? "danger" : "primary",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) {
        toast.success(`Usuario ${user.isActive ? "desactivado" : "activado"} correctamente`);
        await fetchUsers();
      }
    } catch (err) {
      console.error("Error toggling status:", err);
      toast.error("Error al cambiar estado del usuario");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="gradient-brand w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/20">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Gestión de Usuarios y Credenciales
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Administra los empleados, supervisores, turnos asignados y sus códigos QR de acceso.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            title="Recargar listado de usuarios"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-400" : "text-slate-400"}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <a
            href="/api/reports/export"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer"
            title="Exportar base de datos a CSV"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Exportar</span>
          </a>

          <button
            onClick={() => {
              setEditingUserData(null);
              setIsFormModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-primary-400 hover:bg-primary-300 text-surface-950 font-bold text-xs sm:text-sm shadow-lg shadow-primary-950/40 active:scale-[0.98] transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-surface-950" />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Total Usuarios"
          value={stats.total}
          sub="Registrados en la plataforma"
          icon={Users}
          variant="primary"
        />
        <StatCard
          label="Usuarios Activos"
          value={stats.active}
          sub={`${Math.round((stats.active / (stats.total || 1)) * 100)}% de operatividad`}
          icon={UserCheck}
          variant="success"
        />
        <StatCard
          label="Supervisores / Admins"
          value={stats.supervisors}
          sub="Roles de gestión"
          icon={Shield}
          variant="info"
        />
        <StatCard
          label="QR Tokens"
          value={stats.total}
          sub="Firmados criptográficamente"
          icon={QrCode}
          variant="warning"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="card-surface p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombre, email o DNI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 input-standard text-xs"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          </div>

          {/* Role selector */}
          <div className="relative">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 input-standard text-xs cursor-pointer appearance-none"
            >
              <option value="ALL">Todos los roles</option>
              <option value={UserRole.EMPLEADO}>Empleados</option>
              <option value={UserRole.ALUMNO}>Alumnos</option>
              <option value={UserRole.SUPERVISOR}>Supervisores</option>
              <option value={UserRole.ADMIN}>Administradores</option>
            </select>
            <Shield className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
          </div>

          {/* Location selector */}
          <div className="relative">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 input-standard text-xs cursor-pointer appearance-none"
            >
              <option value="ALL">Todas las sedes</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
          </div>

          {/* Status selector */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 input-standard text-xs cursor-pointer appearance-none"
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVE">Solo Activos</option>
              <option value="INACTIVE">Solo Inactivos</option>
            </select>
            <CheckCircle2 className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
          </div>
        </div>

        {/* Clear filters pill if active */}
        {(search || selectedRole !== "ALL" || selectedLocation !== "ALL" || selectedStatus !== "ALL") && (
          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400">
            <span>Filtros activos aplicados</span>
            <button
              onClick={() => {
                setSearch("");
                setSelectedRole("ALL");
                setSelectedLocation("ALL");
                setSelectedStatus("ALL");
              }}
              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Limpiar filtros</span>
            </button>
          </div>
        )}
      </div>

      {/* Users Display (Mobile Cards + Desktop Table) */}
      <div>
        {isLoading ? (
          <SkeletonTable rows={7} cols={7} />
        ) : filteredUsers.length === 0 ? (
          <div className="card-surface p-8">
            <EmptyState
              icon={UserX}
              title="Sin usuarios encontrados"
              description="No hay colaboradores o alumnos que coincidan con los filtros ingresados."
              action={{
                label: "Crear Usuario",
                icon: UserPlus,
                onClick: () => {
                  setEditingUserData(null);
                  setIsFormModalOpen(true);
                },
              }}
            />
          </div>
        ) : (
          <>
            {/* ── 1. Mobile Cards View (md:hidden) ── */}
            <div className="md:hidden space-y-3">
              {filteredUsers.map((user) => {
                const schedule = user.userSchedules?.[0]?.schedule;
                return (
                  <div
                    key={user.id}
                    className="card-surface p-4 rounded-2xl border border-white/10 space-y-3 shadow-lg"
                  >
                    {/* Header: Avatar + User Info + Role/Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Image
                          src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                            `${user.firstName} ${user.lastName}`
                          )}&backgroundColor=16a34a&textColor=ffffff`}
                          alt={user.firstName}
                          width={44}
                          height={44}
                          className="w-11 h-11 rounded-2xl ring-1 ring-emerald-500/20 flex-shrink-0 object-cover"
                          unoptimized
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-white text-sm truncate">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{user.email}</p>
                          {user.documentId && (
                            <p className="text-[11px] font-mono text-slate-500">DNI: {user.documentId}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <RoleBadge role={user.role} size="sm" />
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                            Inactivo
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sede y Horario info */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-black/20 p-2.5 rounded-xl border border-white/5">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Sede Asignada</span>
                        <div className="flex items-center gap-1 text-slate-300 truncate mt-0.5">
                          <Building className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span className="truncate">{user.location?.name || "Sin asignar"}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 text-[10px] block">Turno / Horario</span>
                        <div className="flex items-center gap-1 text-slate-300 truncate mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span className="truncate">{schedule ? schedule.name : "Sin horario"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Credenciales QR & NFC */}
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR Activo</span>
                      </span>
                      {user.nfcCardUid && (
                        <span className="flex items-center gap-1 text-lime-400 bg-lime-500/10 px-2 py-0.5 rounded-md border border-lime-500/20 font-mono text-[10px]">
                          <CreditCard className="w-3 h-3" />
                          <span>{user.nfcCardUid}</span>
                        </span>
                      )}
                    </div>

                    {/* Touch Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      {/* Ver QR */}
                      <button
                        onClick={() => handleOpenQr(user)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all min-h-[44px]"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Ver QR</span>
                      </button>

                      {/* Excepcion */}
                      <button
                        onClick={() => {
                          setSelectedUserForOverride({ id: user.id, name: `${user.firstName} ${user.lastName}` });
                          setIsOverrideModalOpen(true);
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all min-h-[44px]"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>1 Día</span>
                      </button>

                      {/* Editar */}
                      <button
                        onClick={() => {
                          setEditingUserData({
                            id: user.id,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            email: user.email,
                            phone: user.phone || "",
                            documentId: user.documentId || "",
                            role: user.role,
                            locationId: user.location?.id || "",
                            scheduleId: user.userSchedules?.[0]?.schedule?.id || "",
                            nfcCardUid: user.nfcCardUid || "",
                            isActive: user.isActive,
                          });
                          setIsFormModalOpen(true);
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl card-surface text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all min-h-[44px]"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Editar</span>
                      </button>

                      {/* Toggle Active */}
                      <button
                        onClick={() => handleToggleStatus(user)}
                        title={user.isActive ? "Desactivar" : "Reactivar"}
                        className={`p-2.5 rounded-xl transition-all active:scale-95 border min-w-[44px] min-h-[44px] flex items-center justify-center ${
                          user.isActive
                            ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20"
                            : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {user.isActive ? (
                          <Trash2 className="w-4 h-4" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── 2. Desktop Table View (hidden md:block) ── */}
            <div className="hidden md:block card-surface overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-xs font-semibold text-slate-400">
                      <th className="py-4 px-5">Usuario</th>
                      <th className="py-4 px-4">Documento</th>
                      <th className="py-4 px-4">Rol</th>
                      <th className="py-4 px-4">Sede Asignada</th>
                      <th className="py-4 px-4">Horario</th>
                      <th className="py-4 px-4">Estado</th>
                      <th className="py-4 px-5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {filteredUsers.map((user) => {
                      const schedule = user.userSchedules?.[0]?.schedule;
                      return (
                        <tr
                          key={user.id}
                          className="hover:bg-white/[0.02] transition-colors group"
                        >
                          {/* Usuario info & avatar */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <Image
                                src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                                  `${user.firstName} ${user.lastName}`
                                )}&backgroundColor=16a34a&textColor=ffffff`}
                                alt={user.firstName}
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded-xl ring-1 ring-emerald-500/20 flex-shrink-0 object-cover"
                                unoptimized
                              />
                              <div>
                                <p className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                                  {user.firstName} {user.lastName}
                                </p>
                                <p className="text-xs text-slate-400">{user.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Documento y NFC */}
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                            <div>{user.documentId || "—"}</div>
                            {user.nfcCardUid && (
                              <div className="flex items-center gap-1 text-[10px] text-lime-400 font-mono mt-0.5" title={`Tarjeta NFC: ${user.nfcCardUid}`}>
                                <CreditCard className="w-3 h-3 text-lime-400" />
                                <span>{user.nfcCardUid}</span>
                              </div>
                            )}
                          </td>

                          {/* Rol */}
                          <td className="py-3.5 px-4">
                            <RoleBadge role={user.role} size="sm" />
                          </td>

                          {/* Sede */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 text-xs text-slate-300">
                              <Building className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                              <span>{user.location?.name || "Sin asignar"}</span>
                            </div>
                          </td>

                          {/* Horario */}
                          <td className="py-3.5 px-4">
                            {schedule ? (
                              <div className="space-y-0.5 text-xs text-slate-300">
                                <div className="flex items-center gap-1.5 font-medium">
                                  <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                                  <span className="text-white">{schedule.name}</span>
                                  {schedule.isSplit && (
                                    <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                      Partido
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] font-mono text-slate-400 pl-5">
                                  {String(schedule.entryHour).padStart(2, "0")}:{String(schedule.entryMinute).padStart(2, "0")} - {String(schedule.exitHour).padStart(2, "0")}:{String(schedule.exitMinute).padStart(2, "0")}
                                  {schedule.isSplit && schedule.entryHour2 !== null && schedule.exitHour2 !== null ? (
                                    <> · {String(schedule.entryHour2).padStart(2, "0")}:{String(schedule.entryMinute2 || 0).padStart(2, "0")} - {String(schedule.exitHour2).padStart(2, "0")}:{String(schedule.exitMinute2 || 0).padStart(2, "0")}</>
                                  ) : null}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500">Sin horario</span>
                            )}
                          </td>

                          {/* Estado */}
                          <td className="py-3.5 px-4">
                            {user.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
                                Activo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                Inactivo
                              </span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Ver QR Button */}
                              <button
                                onClick={() => handleOpenQr(user)}
                                title="Ver Credencial QR"
                                className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 transition-all active:scale-95"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>

                              {/* Excepcion Button */}
                              <button
                                onClick={() => {
                                  setSelectedUserForOverride({ id: user.id, name: `${user.firstName} ${user.lastName}` });
                                  setIsOverrideModalOpen(true);
                                }}
                                title="Excepción de 1 Día"
                                className="p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-all active:scale-95"
                              >
                                <Calendar className="w-4 h-4" />
                              </button>

                              {/* Editar Button */}
                              <button
                                onClick={() => {
                                  setEditingUserData({
                                    id: user.id,
                                    firstName: user.firstName,
                                    lastName: user.lastName,
                                    email: user.email,
                                    phone: user.phone || "",
                                    documentId: user.documentId || "",
                                    role: user.role,
                                    locationId: user.location?.id || "",
                                    scheduleId: user.userSchedules?.[0]?.schedule?.id || "",
                                    nfcCardUid: user.nfcCardUid || "",
                                    isActive: user.isActive,
                                  });
                                  setIsFormModalOpen(true);
                                }}
                                title="Editar Usuario"
                                className="p-2 rounded-xl card-surface text-slate-300 hover:text-white transition-all active:scale-95"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Activar / Desactivar Button */}
                              <button
                                onClick={() => handleToggleStatus(user)}
                                title={user.isActive ? "Desactivar" : "Reactivar"}
                                className={`p-2 rounded-xl transition-all active:scale-95 border ${
                                  user.isActive
                                    ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20"
                                    : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                                }`}
                              >
                                {user.isActive ? (
                                  <Trash2 className="w-4 h-4" />
                                ) : (
                                  <UserCheck className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modales */}
      <QrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        user={selectedUserForQr}
        onRegenerateQr={handleRegenerateQr}
      />

      {selectedUserForOverride && (
        <OverrideModal
          isOpen={isOverrideModalOpen}
          onClose={() => setIsOverrideModalOpen(false)}
          userId={selectedUserForOverride.id}
          userName={selectedUserForOverride.name}
          schedules={schedules}
          onSuccess={() => {
            toast.success("Excepción programada correctamente");
            fetchUsers();
          }}
        />
      )}

      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveUser}
        initialData={editingUserData}
        locations={locations}
        schedules={schedules}
      />
    </div>
  );
}
