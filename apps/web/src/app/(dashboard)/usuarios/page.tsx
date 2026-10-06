"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import Image from "next/image";
import QRCode from "qrcode";
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
  FolderTree,
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
  MapPin,
  Printer,
} from "lucide-react";
import { UserRole } from "@asistencias/db";
import { QrModal } from "@/components/users/QrModal";
import { UserFormModal, UserFormData } from "@/components/users/UserFormModal";
import { OverrideModal } from "@/components/users/OverrideModal";
import { StatCard } from "@/components/ui/StatCard";
import { RoleBadge, StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterToolbar } from "@/components/ui/FilterToolbar";
import { 
  DataTableContainer, 
  DataTableHeader, 
  DataTableHead, 
  DataTableBody, 
  DataTableRow, 
  DataTableCell, 
  DataTableEmptyState,
  DataTableCheckbox
} from "@/components/ui/DataTable";
import { ActionButton, ActionButtonGroup } from "@/components/ui/ActionButton";
import { Button } from "@/components/ui/Button";
import { BulkActionBar } from "@/components/users/BulkActionBar";
import { BulkEditModal } from "@/components/users/BulkEditModal";
import { BulkDeactivateModal } from "@/components/users/BulkDeactivateModal";
import { BulkImportModal } from "@/components/users/BulkImportModal";
import { BulkPrintModal } from "@/components/users/BulkPrintModal";
import { ExportUsersDropdown } from "@/components/users/ExportUsersDropdown";
import { UsersPdfModal } from "@/components/users/UsersPdfModal";
import { exportUsersToExcel, exportUsersToCsv } from "@/lib/exportUsersExcel";
import { FileSpreadsheet } from "lucide-react";
import { useToast } from "@/providers/ToastProvider";
import { useConfirm } from "@/providers/ConfirmDialogProvider";

interface UserItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  documentId?: string | null;
  birthDate?: string | Date | null;
  role: UserRole;
  isActive: boolean;
  qrToken: string;
  qrGeneratedAt: string;
  signedQrPayload?: string | null;
  nfcCardUid?: string | null;
  locationId?: string | null;
  location?: { id: string; name: string } | null;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
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

function UsersPageContent() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams?.get("search") || "";

  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: usersData, isLoading, mutate: mutateUsers } = useSWR('/api/users', fetcher, {
    revalidateOnFocus: true,
  });
  const { data: orgData } = useSWR('/api/organization', fetcher);
  const users: UserItem[] = usersData?.users || [];

  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [schedules, setSchedules] = useState<Array<any>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);

  // Filters
  const [search, setSearch] = useState(urlSearch);
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  useEffect(() => {
    if (urlSearch) {
      setSearch(urlSearch);
    }
  }, [urlSearch]);

  useEffect(() => {
    if (urlSearch && users.length > 0) {
      const match = users.find(
        (u) =>
          u.documentId === urlSearch ||
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(urlSearch.toLowerCase()) ||
          u.email.toLowerCase() === urlSearch.toLowerCase()
      );
      if (match) {
        setSelectedUserForQr(match);
      }
    }
  }, [urlSearch, users]);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedUserForQr, setSelectedUserForQr] = useState<any | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [selectedUserForOverride, setSelectedUserForOverride] = useState<any | null>(null);
  const [editingUserData, setEditingUserData] = useState<UserFormData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Bulk actions state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isBulkDeactivateOpen, setIsBulkDeactivateOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isBulkPrintOpen, setIsBulkPrintOpen] = useState(false);
  const [printUsersOverride, setPrintUsersOverride] = useState<any[] | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const { toast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    // Para la credencial oficial fija (impresión y vista previa), se utiliza el qrToken permanente.
    const payloadToEncode = selectedUserForQr?.qrToken || "";
    if (payloadToEncode) {
      QRCode.toDataURL(payloadToEncode, {
        width: 400,
        margin: 2,
        color: {
          dark: "#060E17",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "H",
      })
      .then(setQrDataUrl)
      .catch(console.error);
    } else {
      setQrDataUrl("");
    }
  }, [selectedUserForQr?.qrToken, selectedUserForQr?.id]);

  const fetchUsers = async () => {
    await mutateUsers();
  };

  const fetchLocationsAndSchedules = async () => {
    try {
      const [locRes, schRes, deptRes] = await Promise.all([
        fetch("/api/locations"),
        fetch("/api/schedules"),
        fetch("/api/departments"),
      ]);
      const locData = await locRes.json();
      const schData = await schRes.json();
      const deptData = await deptRes.json();
      if (locData.locations) setLocations(locData.locations);
      if (schData.schedules) setSchedules(schData.schedules);
      if (deptData.departments) setDepartments(deptData.departments);
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
      const matchesDept = selectedDepartment === "ALL" || u.department?.id === selectedDepartment;
      const matchesStatus =
        selectedStatus === "ALL" ||
        (selectedStatus === "ACTIVE" && u.isActive) ||
        (selectedStatus === "INACTIVE" && !u.isActive);

      return matchesSearch && matchesRole && matchesLoc && matchesDept && matchesStatus;
    });
  }, [users, search, selectedRole, selectedLocation, selectedDepartment, selectedStatus]);

  // Colaboradores preparados para el estudio de credenciales
  const selectedUsersForPrint = useMemo(() => {
    const targetUsers =
      selectedUserIds.length > 0
        ? users.filter((u) => selectedUserIds.includes(u.id))
        : filteredUsers;

    return targetUsers.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      documentId: u.documentId,
      qrToken: u.qrToken,
      signedQrPayload: u.signedQrPayload,
      locationName: u.location?.name || null,
    }));
  }, [users, selectedUserIds, filteredUsers]);

  // Usuarios objetivo para exportación (seleccionados o filtrados actuales)
  const usersToExport = useMemo(() => {
    if (selectedUserIds.length > 0) {
      return users.filter((u) => selectedUserIds.includes(u.id));
    }
    return filteredUsers;
  }, [users, selectedUserIds, filteredUsers]);

  // Exportar a Excel (.xlsx)
  const handleExportExcel = async () => {
    if (usersToExport.length === 0) {
      toast.error("No hay colaboradores para exportar");
      return;
    }
    const orgName = orgData?.organization?.name || "Empresa";
    const ruc = orgData?.organization?.settings?.ruc || undefined;
    try {
      await exportUsersToExcel(usersToExport, orgName, ruc);
      toast.success(`Padrón de ${usersToExport.length} colaboradores exportado a Excel`);
    } catch (err) {
      console.error("Error al exportar Excel:", err);
      toast.error("Error al generar el archivo Excel");
    }
  };

  // Abrir vista previa PDF oficial
  const handleOpenPdf = () => {
    if (usersToExport.length === 0) {
      toast.error("No hay colaboradores para exportar");
      return;
    }
    setIsPdfModalOpen(true);
  };

  // Exportar a CSV plano (.csv)
  const handleExportCsv = () => {
    if (usersToExport.length === 0) {
      toast.error("No hay colaboradores para exportar");
      return;
    }
    const orgName = orgData?.organization?.name || "Empresa";
    const ruc = orgData?.organization?.settings?.ruc || undefined;
    try {
      exportUsersToCsv(usersToExport, orgName, ruc);
      toast.success(`Padrón de ${usersToExport.length} colaboradores exportado a CSV`);
    } catch (err) {
      console.error("Error al exportar CSV:", err);
      toast.error("Error al generar el archivo CSV");
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const employees = users.filter((u) => u.role === UserRole.EMPLEADO).length;
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
      signedQrPayload: user.signedQrPayload,
      locationName: user.location?.name,
      nfcCardUid: user.nfcCardUid,
      department: user.department?.name,
    });
    setIsQrModalOpen(true);
  };

  // Abrir estudio de impresión enfocado en una credencial individual
  const handlePrintSingleUser = (u: any) => {
    if (!u) return;
    setIsQrModalOpen(false);
    setPrintUsersOverride([
      {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
        documentId: u.documentId,
        qrToken: u.qrToken,
        signedQrPayload: u.signedQrPayload,
        locationName: u.locationName || u.location?.name || null,
        department: u.department?.name || (typeof u.department === "string" ? u.department : null),
        avatarUrl: u.avatarUrl || null,
      },
    ]);
    setIsBulkPrintOpen(true);
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
          signedQrPayload: data.user.signedQrPayload,
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

      <PageHeader 
        title="Gestión de Usuarios y Credenciales"
        subtitle="Administra colaboradores, supervisores, turnos asignados y emisión de credenciales QR / tarjetas NFC."
        icon={Users}
        iconVariant="emerald"
        actionButtons={
          <>
            <Button
              variant="secondary"
              onClick={fetchUsers}
              isLoading={isLoading}
              icon={<RefreshCw className="w-4 h-4" />}
              title="Actualizar listado de colaboradores"
            >
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
            
            <ExportUsersDropdown
              onExportExcel={handleExportExcel}
              onOpenPdf={handleOpenPdf}
              onExportCsv={handleExportCsv}
              selectedCount={selectedUserIds.length}
              totalCount={filteredUsers.length}
            />
            
            <Button
              variant="secondary"
              onClick={() => setIsBulkImportOpen(true)}
              icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            >
              <span className="hidden sm:inline">Importar en Lote</span>
              <span className="sm:hidden">Importar</span>
            </Button>

            <Button
              variant="secondary"
              onClick={() => setIsBulkPrintOpen(true)}
              icon={<Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
              title="Estudio de diseño e impresión masiva de credenciales y fotochecks"
            >
              <span className="hidden sm:inline">Credenciales</span>
              <span className="sm:hidden">Pases</span>
              <span>{selectedUserIds.length > 0 ? ` (${selectedUserIds.length})` : ` (${filteredUsers.length})`}</span>
            </Button>

            <Button
              variant="primary"
              onClick={() => {
                setEditingUserData(null);
                setIsFormModalOpen(true);
              }}
              icon={<UserPlus className="w-4 h-4 stroke-[2.5]" />}
            >
              <span className="hidden xs:inline">Nuevo</span> Usuario
            </Button>
          </>
        }
      />



      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Usuarios"
          value={stats.total}
          subLabel="Registrados en la plataforma"
          icon={Users}
          variant="emerald"
        />
        <StatCard
          label="Usuarios Activos"
          value={stats.active}
          subLabel="100% de operatividad en turno"
          subValue={`${Math.round((stats.active / (stats.total || 1)) * 100)}%`}
          icon={UserCheck}
          variant="emerald"
          trend={{ value: "", label: "Activos", isPositive: true }}
        />
        <StatCard
          label="Supervisores / Admins"
          value={stats.supervisors}
          subLabel="Roles de auditoría y gestión"
          subValue={`${stats.supervisors} Usuarios`}
          icon={Shield}
          variant="cyan"
        />
        <StatCard
          label="QR Tokens Criptográficos"
          value={stats.total}
          subLabel="Firmados criptográficamente SHA-256"
          icon={QrCode}
          variant="amber"
        />
      </section>

      <FilterToolbar 
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre, email, DNI o UID NFC..."
        onReset={() => {
          setSearch("");
          setSelectedRole("ALL");
          setSelectedLocation("ALL");
          setSelectedDepartment("ALL");
          setSelectedStatus("ALL");
        }}
        filters={[
          {
            id: "role",
            value: selectedRole,
            onChange: setSelectedRole,
            options: [
              { value: "ALL", label: "Todos los roles" },
              { value: UserRole.EMPLEADO, label: "Empleados" },
              { value: UserRole.SUPERVISOR, label: "Supervisores" },
              { value: UserRole.ADMIN, label: "Administradores" },
            ]
          },
          {
            id: "location",
            icon: Building,
            value: selectedLocation,
            onChange: setSelectedLocation,
            options: [
              { value: "ALL", label: "Todas las sedes" },
              ...locations.map(l => ({ value: l.id, label: l.name }))
            ]
          },
          {
            id: "department",
            icon: FolderTree,
            value: selectedDepartment,
            onChange: setSelectedDepartment,
            options: [
              { value: "ALL", label: "Todos los departamentos" },
              ...departments.map(d => ({ value: d.id, label: d.name }))
            ]
          },
          {
            id: "status",
            icon: CheckCircle2,
            value: selectedStatus,
            onChange: setSelectedStatus,
            options: [
              { value: "ALL", label: "Todos los estados" },
              { value: "ACTIVE", label: "Solo Activos" },
              { value: "INACTIVE", label: "Inactivos / Bajas" },
            ]
          }
        ]}
      />

      {/* Layout Grid: Main Users Table + Live Credential Side Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start mt-6">
        <DataTableContainer 
          className="xl:col-span-8 2xl:col-span-9"
          mobileContent={
            isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 animate-pulse space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-surface-200 dark:bg-surface-800"></div>
                      <div className="space-y-1.5 flex-1">
                        <div className="h-4 bg-surface-200 dark:bg-surface-800 rounded w-1/2"></div>
                        <div className="h-3 bg-surface-200 dark:bg-surface-800 rounded w-1/3"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-surface-500 text-xs">
                No hay colaboradores que coincidan con los filtros.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => {
                  const schedule = user.userSchedules?.[0]?.schedule;
                  const isSelected = selectedUserForQr?.id === user.id;
                  const isChecked = selectedUserIds.includes(user.id);

                  return (
                    <div
                      key={`mobile-${user.id}`}
                      onClick={() => {
                        setSelectedUserForQr({
                          id: user.id,
                          firstName: user.firstName,
                          lastName: user.lastName,
                          email: user.email,
                          role: user.role,
                          documentId: user.documentId,
                          qrToken: user.qrToken,
                          signedQrPayload: user.signedQrPayload,
                          locationName: user.location?.name,
                          nfcCardUid: user.nfcCardUid,
                          department: user.department?.name,
                        });
                      }}
                      className={`p-4 rounded-2xl border bg-white dark:bg-surface-900 shadow-xs transition-all space-y-3 cursor-pointer ${
                        isSelected || isChecked
                          ? "border-primary-500/60 bg-primary-50/20 dark:bg-primary-950/20 ring-1 ring-primary-500/30"
                          : "border-surface-200 dark:border-surface-800"
                      }`}
                    >
                      {/* Header: Checkbox + Avatar + Name + Badges */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                            <DataTableCheckbox
                              checked={isChecked}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (isChecked) {
                                  setSelectedUserIds((prev) => prev.filter((id) => id !== user.id));
                                } else {
                                  setSelectedUserIds((prev) => [...prev, user.id]);
                                }
                              }}
                              ariaLabel={`Seleccionar a ${user.firstName} ${user.lastName}`}
                            />
                          </div>
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm ${isSelected ? 'bg-gradient-to-tr from-info-600 to-info-500 text-white ring-1 ring-primary-500/40' : 'bg-gradient-to-tr from-primary-600 to-primary-500 text-white'}`}>
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm text-surface-900 dark:text-white truncate">
                              {user.firstName} {user.lastName}
                            </h4>
                            <p className="text-[11px] text-surface-500 dark:text-slate-400 font-mono truncate">
                              {user.email}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <RoleBadge role={user.role} />
                              <StatusBadge status={user.isActive ? "ACTIVO" : "INACTIVO"} size="sm" />
                            </div>
                          </div>
                        </div>

                        {/* Action buttons on mobile */}
                        <div className="shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <ActionButton
                            size="sm"
                            variant="primary"
                            icon={<QrCode className="w-3.5 h-3.5" />}
                            title="Ver QR"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenQr(user);
                            }}
                          />
                          <ActionButton
                            size="sm"
                            variant="warning"
                            icon={<Edit2 className="w-3.5 h-3.5" />}
                            title="Editar Perfil"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingUserData({
                                id: user.id,
                                firstName: user.firstName,
                                lastName: user.lastName,
                                email: user.email,
                                phone: user.phone || "",
                                documentId: user.documentId || "",
                                birthDate: user.birthDate ? String(user.birthDate).split("T")[0] : "",
                                role: user.role,
                                locationId: user.location?.id || user.locationId || "",
                                departmentId: user.department?.id || user.departmentId || "",
                                scheduleId: user.userSchedules?.[0]?.schedule?.id || "",
                                nfcCardUid: user.nfcCardUid || "",
                                isActive: user.isActive,
                              });
                              setIsFormModalOpen(true);
                            }}
                          />
                          <ActionButton
                            size="sm"
                            variant={user.isActive ? "danger" : "success"}
                            icon={user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            title={user.isActive ? "Desactivar" : "Reactivar"}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(user);
                            }}
                          />
                        </div>
                      </div>

                      {/* Metadata details grid */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-100 dark:border-surface-800 text-xs">
                        <div className="p-2 rounded-xl bg-surface-50 dark:bg-surface-950 border border-surface-200/60 dark:border-surface-800/60">
                          <span className="text-[10px] uppercase font-bold text-surface-400">DNI / Documento</span>
                          <div className="font-semibold text-surface-900 dark:text-white font-mono mt-0.5 truncate">
                            {user.documentId || "Sin DNI"}
                          </div>
                          {user.nfcCardUid && (
                            <span className="text-[10px] text-info-600 dark:text-info-400 font-mono block">
                              NFC: {user.nfcCardUid}
                            </span>
                          )}
                        </div>

                        <div className="p-2 rounded-xl bg-surface-50 dark:bg-surface-950 border border-surface-200/60 dark:border-surface-800/60">
                          <span className="text-[10px] uppercase font-bold text-surface-400">Sede & Dpto.</span>
                          <div className="font-semibold text-surface-900 dark:text-white mt-0.5 truncate">
                            {user.location?.name || "Sin sede"}
                          </div>
                          <span className="text-[10px] text-surface-500 dark:text-slate-400 truncate block">
                            {user.department?.name || "General"}
                          </span>
                        </div>
                      </div>

                      {/* Horario info footer */}
                      {schedule && (
                        <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400 pt-0.5">
                          <span className="truncate">
                            🕒 {schedule.name}
                          </span>
                          <span className="text-[10px] font-mono shrink-0">
                            {String(schedule.entryHour).padStart(2, "0")}:{String(schedule.entryMinute).padStart(2, "0")} - {String(schedule.exitHour).padStart(2, "0")}:{String(schedule.exitMinute).padStart(2, "0")}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          }
        >
          <DataTableHeader>
            <DataTableHead className="w-10 px-3">
              <DataTableCheckbox
                checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                indeterminate={selectedUserIds.length > 0 && selectedUserIds.length < filteredUsers.length}
                onChange={() => {
                  if (selectedUserIds.length === filteredUsers.length) {
                    setSelectedUserIds([]);
                  } else {
                    setSelectedUserIds(filteredUsers.map((u) => u.id));
                  }
                }}
                ariaLabel="Seleccionar todos los colaboradores"
              />
            </DataTableHead>
            <DataTableHead>Colaborador / Identidad</DataTableHead>
            <DataTableHead>Documento</DataTableHead>
            <DataTableHead>Rol & Dpto.</DataTableHead>
            <DataTableHead>Sede Asignada</DataTableHead>
            <DataTableHead>Horario / Turno</DataTableHead>
            <DataTableHead align="center">Estado</DataTableHead>
            <DataTableHead align="right">Acciones</DataTableHead>
          </DataTableHeader>
          <DataTableBody>
            {isLoading ? (
              <DataTableEmptyState colSpan={8} message="Cargando usuarios..." />
            ) : filteredUsers.length === 0 ? (
              <DataTableEmptyState colSpan={8} message="No hay colaboradores que coincidan con los filtros." />
            ) : (
              filteredUsers.map((user) => {
                const schedule = user.userSchedules?.[0]?.schedule;
                const isSelected = selectedUserForQr?.id === user.id;
                const isChecked = selectedUserIds.includes(user.id);
                return (
                  <DataTableRow
                    key={user.id}
                    isSelected={isSelected || isChecked}
                    onClick={() => {
                      setSelectedUserForQr({
                        id: user.id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        role: user.role,
                        documentId: user.documentId,
                        qrToken: user.qrToken,
                        signedQrPayload: user.signedQrPayload,
                        locationName: user.location?.name,
                        nfcCardUid: user.nfcCardUid,
                        department: user.department?.name,
                      });
                    }}
                  >
                    <DataTableCell className="w-10 px-3" onClick={(e) => e?.stopPropagation()}>
                      <DataTableCheckbox
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (isChecked) {
                            setSelectedUserIds((prev) => prev.filter((id) => id !== user.id));
                          } else {
                            setSelectedUserIds((prev) => [...prev, user.id]);
                          }
                        }}
                        ariaLabel={`Seleccionar a ${user.firstName} ${user.lastName}`}
                      />
                    </DataTableCell>
                    <DataTableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm ${isSelected ? 'bg-gradient-to-tr from-info-600 to-info-500 text-white ring-1 ring-primary-500/40' : 'bg-gradient-to-tr from-primary-600 to-primary-500 text-white'}`}>
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-surface-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-300 transition flex items-center gap-1.5">
                            {user.firstName} {user.lastName}
                            {isSelected && <span className="w-2 h-2 rounded-full bg-primary-500 dark:bg-primary-400" title="Seleccionado en visor lateral"></span>}
                          </div>
                          <div className="text-[11px] text-surface-500 dark:text-slate-400 font-mono mt-0.5">{user.email}</div>
                        </div>
                      </div>
                    </DataTableCell>

                    <DataTableCell className="font-mono text-surface-700 dark:text-slate-300">
                      <div>{user.documentId || "—"}</div>
                      {user.nfcCardUid ? (
                        <div className="text-[10px] text-info-600 dark:text-info-400 font-mono">NFC: {user.nfcCardUid}</div>
                      ) : (
                        <div className="text-[10px] text-surface-400 dark:text-slate-500 font-mono">NFC: Sin Asignar</div>
                      )}
                    </DataTableCell>

                    <DataTableCell>
                      <RoleBadge role={user.role} size="sm" />
                      <p className="text-[10px] text-surface-500 dark:text-slate-400 mt-0.5 truncate max-w-[130px] font-medium" title={user.department?.name || "Sin departamento"}>
                        {user.department?.name || (user.role === UserRole.EMPLEADO ? "Sin departamento" : "General")}
                      </p>
                    </DataTableCell>

                    <DataTableCell>
                      <div className="flex items-center gap-1.5 text-surface-700 dark:text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-surface-500 dark:text-slate-500 shrink-0" />
                        <span className="truncate">{user.location?.name || "Sin asignar"}</span>
                      </div>
                    </DataTableCell>

                    <DataTableCell>
                      {schedule ? (
                        <div>
                          <div className="flex items-center gap-1 text-surface-800 dark:text-slate-200">
                            <Clock className="w-3.5 h-3.5 text-surface-500 dark:text-slate-400" />
                            <span className="font-semibold text-[11px]">{schedule.name}</span>
                          </div>
                          <span className="text-[10px] text-surface-500 dark:text-slate-400 font-mono mt-0.5 block">
                            {String(schedule.entryHour).padStart(2, "0")}:{String(schedule.entryMinute).padStart(2, "0")} - {String(schedule.exitHour).padStart(2, "0")}:{String(schedule.exitMinute).padStart(2, "0")}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-surface-400 dark:text-slate-500 italic">Sin turno asignado</span>
                      )}
                    </DataTableCell>

                    <DataTableCell align="center">
                      <StatusBadge status={user.isActive ? "ACTIVO" : "INACTIVO"} size="sm" />
                    </DataTableCell>

                    <DataTableCell align="right">
                      <ActionButtonGroup align="right">
                        <ActionButton
                          size="sm"
                          variant="primary"
                          icon={<QrCode className="w-3.5 h-3.5" />}
                          title="Ver y Validar Credencial QR"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenQr(user);
                          }}
                        />
                        <ActionButton
                          size="sm"
                          variant="info"
                          icon={<Calendar className="w-3.5 h-3.5" />}
                          title="Excepción Rotativa 1 Día"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUserForOverride({
                              id: user.id,
                              name: `${user.firstName} ${user.lastName}`,
                              locationId: user.location?.id,
                              locationName: user.location?.name,
                            });
                            setIsOverrideModalOpen(true);
                          }}
                        />
                        <ActionButton
                          size="sm"
                          variant="warning"
                          icon={<Edit2 className="w-3.5 h-3.5" />}
                          title="Editar Perfil"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingUserData({
                              id: user.id,
                              firstName: user.firstName,
                              lastName: user.lastName,
                              email: user.email,
                              phone: user.phone || "",
                              documentId: user.documentId || "",
                              birthDate: user.birthDate ? String(user.birthDate).split("T")[0] : "",
                              role: user.role,
                              locationId: user.location?.id || user.locationId || "",
                              departmentId: user.department?.id || user.departmentId || "",
                              scheduleId: user.userSchedules?.[0]?.schedule?.id || "",
                              nfcCardUid: user.nfcCardUid || "",
                              isActive: user.isActive,
                            });
                            setIsFormModalOpen(true);
                          }}
                        />
                        <ActionButton
                          size="sm"
                          variant={user.isActive ? "danger" : "success"}
                          icon={user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          title={user.isActive ? "Desactivar Credencial" : "Reactivar Credencial"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(user);
                          }}
                        />
                      </ActionButtonGroup>
                    </DataTableCell>
                  </DataTableRow>
                );
              })
            )}
          </DataTableBody>
        </DataTableContainer>

            {/* BEGIN: LiveCredentialSideInspector */}
            <section className="xl:col-span-4 2xl:col-span-3 rounded-2xl p-5 border border-surface-200 dark:border-surface-800 shadow-xl space-y-4 bg-surface-50 dark:bg-surface-900 transition-colors">
              {selectedUserForQr ? (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-surface-200 dark:border-surface-800">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary-500 dark:bg-primary-400 animate-pulse"></span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-surface-700 dark:text-surface-300">Credencial Seleccionada</h3>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-primary-100 dark:bg-emerald-500/10 text-primary-700 dark:text-emerald-400 border border-primary-200 dark:border-emerald-500/20 px-2 py-0.5 rounded">QR NIVEL H</span>
                  </div>

                  {/* Virtual Fotocheck / Badge Preview */}
                  <div className="p-4 rounded-xl bg-gradient-to-b from-surface-100 dark:from-surface-950 via-surface-50 dark:via-surface-900 to-surface-200 dark:to-surface-800 border border-primary-300 dark:border-primary-500/30 relative overflow-hidden" >
                    {/* Background Chip Pattern */}
                    <div className="absolute -right-8 -top-8 w-28 h-28 bg-primary-500/10 rounded-full blur-xl pointer-events-none"></div>
                    
                    {/* Top Hotel Badge Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-surface-200 dark:border-surface-700/80">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-primary-500 flex items-center justify-center text-white font-black text-xs">
                          P
                        </div>
                        <span className="font-extrabold text-[11px] tracking-wider text-surface-900 dark:text-white">PRESENXA PASS</span>
                      </div>
                      <span className="text-[9px] font-mono text-info-600 dark:text-info-400 tracking-widest font-semibold uppercase">{selectedUserForQr.locationName?.substring(0, 10) || "ORG-01"}</span>
                    </div>

                    {/* Center: High-Resolution Cryptographic QR Code */}
                    <div className="my-4 flex flex-col items-center justify-center p-3 rounded-2xl bg-white shadow-lg border-2 border-surface-200">
                      <div className="w-40 h-40 relative flex items-center justify-center">
                        {/* Frame Corners */}
                        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary-500 rounded-tl"></div>
                        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary-500 rounded-tr"></div>
                        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary-500 rounded-bl"></div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary-500 rounded-br"></div>
                        
                        {qrDataUrl ? (
                          <img src={qrDataUrl} alt="QR de Credencial" className="w-[140px] h-[140px] object-contain rounded-lg" />
                        ) : (
                          <div className="w-10 h-10 border-4 border-surface-200 border-t-primary-500 rounded-full animate-spin"></div>
                        )}
                      </div>
                    </div>

                    {/* Colaborador Detail in Card */}
                    <div className="text-center space-y-1">
                      <div className="text-sm font-extrabold text-surface-900 dark:text-white">{selectedUserForQr.firstName} {selectedUserForQr.lastName}</div>
                      <div className="text-[11px] text-info-600 dark:text-cyan-400 font-medium">{selectedUserForQr.role} · {selectedUserForQr.locationName || "Sin sede"}</div>
                      <div className="font-mono text-[10px] text-surface-500 dark:text-slate-400 pt-1">
                        DNI: {selectedUserForQr.documentId || "—"} • NFC: {selectedUserForQr.nfcCardUid || "—"}
                      </div>
                    </div>

                    {/* Cryptographic Token Stamp */}
                    <div className="mt-3 pt-2.5 border-t border-surface-200 dark:border-slate-800 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-surface-500 dark:text-slate-400">TOKEN OFICIAL:</span>
                      <span 
                        className="text-primary-700 dark:text-emerald-400 font-bold bg-primary-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-primary-200 dark:border-emerald-900/60 truncate max-w-[170px]"
                        title={selectedUserForQr.qrToken}
                      >
                        {selectedUserForQr.qrToken || "No asignado"}
                      </span>
                    </div>
                  </div>

                  {/* Credential Action Buttons */}
                  <div className="space-y-2 pt-1">
                    <button
                      onClick={() => setIsQrModalOpen(true)}
                      className="w-full py-2.5 px-3 rounded-xl bg-surface-200 dark:bg-surface-800 hover:bg-surface-300 dark:hover:bg-surface-700 border border-surface-300 dark:border-surface-700 text-xs font-bold text-surface-900 dark:text-white flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
                    >
                      <QrCode className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      <span>Ver y Validar Credencial QR</span>
                    </button>
                    <button
                      onClick={() => handlePrintSingleUser(selectedUserForQr)}
                      className="w-full py-2 px-3 rounded-xl bg-surface-100 dark:bg-surface-800/80 hover:bg-surface-200 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700 text-xs font-bold text-surface-800 dark:text-slate-200 flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                      <span>Imprimir Credencial Oficial</span>
                    </button>
                    <button
                      onClick={() => handleRegenerateQr(selectedUserForQr.id)}
                      className="w-full py-2 px-3 rounded-xl bg-warning-50 dark:bg-amber-500/10 hover:bg-warning-100 dark:hover:bg-amber-500/20 border border-warning-200 dark:border-amber-500/30 text-xs font-bold text-warning-700 dark:text-amber-300 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-warning-600 dark:text-amber-400" />
                      <span>Regenerar QR Criptográfico</span>
                    </button>
                  </div>

                  {/* Security Audit Stamp Info */}
                  <div className="p-3 rounded-xl bg-surface-100 dark:bg-surface-950/60 border border-surface-200 dark:border-surface-800 text-[10px] text-surface-500 dark:text-surface-400 space-y-1">
                    <div className="flex items-center justify-between text-surface-700 dark:text-surface-300 font-medium">
                      <span>Algoritmo de Firma:</span>
                      <span className="font-mono text-primary-600 dark:text-emerald-400">HMAC-SHA256</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Última emisión:</span>
                      <span className="font-mono">{new Date().toLocaleDateString('es-PE')}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-surface-400 dark:text-surface-500 text-center border border-dashed border-surface-300 dark:border-surface-700 rounded-xl">
                  <QrCode className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-semibold">Ningún usuario seleccionado</p>
                  <p className="text-xs mt-1 max-w-[200px]">Haz clic en un colaborador de la tabla para ver su credencial.</p>
                </div>
              )}
            </section>
            {/* END: LiveCredentialSideInspector */}
          </div>

      {/* Modales */}
      <QrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        user={selectedUserForQr}
        onRegenerateQr={handleRegenerateQr}
        onPrint={handlePrintSingleUser}
      />

      {selectedUserForOverride && (
        <OverrideModal
          isOpen={isOverrideModalOpen}
          onClose={() => setIsOverrideModalOpen(false)}
          userId={selectedUserForOverride.id}
          userName={selectedUserForOverride.name}
          userLocationId={selectedUserForOverride.locationId}
          userLocationName={selectedUserForOverride.locationName}
          locations={locations}
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
        departments={departments}
      />

      {/* Barra de acciones flotante para selección masiva */}
      <BulkActionBar
        selectedCount={selectedUserIds.length}
        onClearSelection={() => setSelectedUserIds([])}
        onOpenBulkEdit={() => setIsBulkEditOpen(true)}
        onOpenBulkDeactivate={() => setIsBulkDeactivateOpen(true)}
        onOpenBulkPrint={() => {
          setPrintUsersOverride(null);
          setIsBulkPrintOpen(true);
        }}
      />

      {/* Estudio de diseño e impresión masiva o individual de credenciales */}
      <BulkPrintModal
        isOpen={isBulkPrintOpen}
        onClose={() => {
          setIsBulkPrintOpen(false);
          setPrintUsersOverride(null);
        }}
        users={printUsersOverride ?? selectedUsersForPrint}
        defaultOrgName={
          printUsersOverride?.[0]?.locationName
            ? printUsersOverride[0].locationName
            : selectedLocation !== "ALL"
            ? locations.find((l) => l.id === selectedLocation)?.name || "Hotel Italia"
            : "Hotel Italia"
        }
      />

      {/* Modal de edición masiva */}
      <BulkEditModal
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        selectedUserIds={selectedUserIds}
        locations={locations}
        schedules={schedules}
        onSuccess={() => {
          mutateUsers();
          setSelectedUserIds([]);
        }}
      />

      {/* Modal de baja masiva */}
      <BulkDeactivateModal
        isOpen={isBulkDeactivateOpen}
        onClose={() => setIsBulkDeactivateOpen(false)}
        selectedUserIds={selectedUserIds}
        onSuccess={() => {
          mutateUsers();
          setSelectedUserIds([]);
        }}
      />

      {/* Wizard de importación masiva */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        locations={locations}
        schedules={schedules}
        onSuccess={() => {
          mutateUsers();
        }}
      />

      {/* Modal oficial de exportación e impresión a PDF */}
      <UsersPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        users={usersToExport}
        organization={orgData?.organization || null}
      />
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-sans">Cargando gestión de colaboradores...</div>}>
      <UsersPageContent />
    </Suspense>
  );
}

