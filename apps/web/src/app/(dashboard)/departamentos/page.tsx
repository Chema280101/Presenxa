"use client";

import { useState, useEffect, useMemo } from "react";
import { FolderTree, Plus, Users, RefreshCw, Layers, Edit2, Trash2 } from "lucide-react";
import { ViewModeToggle } from "@/components/ui/ViewModeToggle";
import { DepartmentFormModal, DepartmentFormData } from "@/components/departments/DepartmentFormModal";
import { DepartmentCard, DepartmentData } from "@/components/departments/DepartmentCard";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterToolbar } from "@/components/ui/FilterToolbar";
import { Button } from "@/components/ui/Button";
import { ActionButton, ActionButtonGroup } from "@/components/ui/ActionButton";
import {
  DataTableContainer,
  DataTableHeader,
  DataTableHead,
  DataTableBody,
  DataTableRow,
  DataTableCell,
  DataTableEmptyState,
} from "@/components/ui/DataTable";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useToast } from "@/providers/ToastProvider";
import { useConfirm } from "@/providers/ConfirmDialogProvider";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentFormData | null>(null);

  const fetchDepartments = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/departments");
      const data = await res.json();
      if (data.departments) {
        setDepartments(data.departments);
      }
    } catch (err) {
      console.error("Error fetching departments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const filteredDepartments = useMemo(() => {
    return departments.filter((dept) => {
      return !search || dept.name.toLowerCase().includes(search.toLowerCase());
    });
  }, [departments, search]);

  const stats = useMemo(() => {
    const total = departments.length;
    const totalUsers = departments.reduce((acc, d) => acc + (d._count?.users || 0), 0);
    return { total, totalUsers };
  }, [departments]);

  const handleSaveDepartment = async (data: DepartmentFormData): Promise<boolean> => {
    try {
      if (data.id) {
        const res = await fetch(`/api/departments/${data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Error al actualizar departamento");
        toast.success("Departamento actualizado con éxito");
      } else {
        const res = await fetch("/api/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Error al crear departamento");
        toast.success("Nuevo departamento creado con éxito");
      }
      await fetchDepartments();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
      return false;
    }
  };

  const handleDelete = async (dept: DepartmentData) => {
    if ((dept._count?.users || 0) > 0) {
      toast.error("No se puede eliminar un área con empleados asignados.");
      return;
    }

    const ok = await confirm({
      title: "¿Eliminar Departamento?",
      description: `¿Estás seguro de eliminar el departamento "${dept.name}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/departments/${dept.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Departamento eliminado con éxito");
        await fetchDepartments();
      } else {
        throw new Error("Error eliminando");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al eliminar el departamento");
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in-up pb-10">
      <PageHeader 
        title="Departamentos"
        titleBadge={
          <span className="text-[10px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-500/20 whitespace-nowrap">
            {stats.total} Áreas Registradas
          </span>
        }
        subtitle="Estructura y organiza las áreas de trabajo de la empresa."
        icon={FolderTree}
        iconVariant="emerald"
        actionButtons={
          <>
            <Button
              variant="secondary"
              onClick={fetchDepartments}
              isLoading={isLoading}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Actualizar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setEditingDepartment(null);
                setIsModalOpen(true);
              }}
              icon={<Plus className="w-4 h-4" />}
            >
              Nuevo Departamento
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Total Áreas"
          value={stats.total}
          subLabel="Departamentos configurados"
          icon={Layers}
          variant="emerald"
        />
        <StatCard
          label="Empleados Asignados"
          value={stats.totalUsers}
          subLabel="Trabajadores en áreas específicas"
          icon={Users}
          variant="indigo"
        />
      </section>

      <FilterToolbar 
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar departamento por nombre..."
        onReset={() => setSearch("")}
        viewModeToggle={<ViewModeToggle value={viewMode} onChange={setViewMode} />}
      />

      {/* Main Content: Grid vs Table */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoading ? (
            <div className="col-span-full text-center py-16 bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800">
              <RefreshCw className="w-8 h-8 text-primary-500 dark:text-primary-400 animate-spin mx-auto mb-4" />
              <p className="text-surface-600 dark:text-surface-400 font-medium text-sm">Cargando departamentos...</p>
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-white dark:bg-surface-900 rounded-3xl border border-dashed border-surface-200 dark:border-surface-800 p-8">
              <FolderTree className="w-12 h-12 text-surface-400 dark:text-surface-500 mx-auto mb-4" />
              <p className="text-surface-900 dark:text-surface-100 text-base font-bold">No hay departamentos</p>
              <p className="text-surface-500 dark:text-surface-400 text-xs mt-1">Crea tu primer departamento para estructurar la organización.</p>
            </div>
          ) : (
            filteredDepartments.map((dept) => (
              <DepartmentCard
                key={dept.id}
                department={dept}
                onEdit={(data) => {
                  setEditingDepartment({ id: data.id, name: data.name });
                  setIsModalOpen(true);
                }}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      ) : (
        isLoading ? (
          <SkeletonTable rows={5} cols={4} />
        ) : (
          <DataTableContainer>
            <DataTableHeader>
              <DataTableHead>Área / Departamento</DataTableHead>
              <DataTableHead>Colaboradores Asignados</DataTableHead>
              <DataTableHead>Identificador</DataTableHead>
              <DataTableHead className="text-right">Acciones</DataTableHead>
            </DataTableHeader>
            <DataTableBody>
              {filteredDepartments.length === 0 ? (
                <DataTableEmptyState
                  colSpan={4}
                  message={search ? "No se encontraron departamentos con el criterio de búsqueda." : "Aún no se han configurado áreas de trabajo."}
                />
              ) : (
                filteredDepartments.map((dept) => {
                  const userCount = dept._count?.users || 0;
                  return (
                    <DataTableRow key={dept.id}>
                      <DataTableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-200/80 dark:border-primary-500/20 flex items-center justify-center shrink-0">
                            <FolderTree className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-sm text-surface-900 dark:text-white">
                              {dept.name}
                            </span>
                            <p className="text-[11px] text-surface-500 dark:text-slate-400 font-mono">
                              Unidad operativa
                            </p>
                          </div>
                        </div>
                      </DataTableCell>
                      <DataTableCell>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          userCount > 0
                            ? "bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 border border-primary-200/80 dark:border-primary-500/20"
                            : "bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 border border-surface-200 dark:border-surface-700"
                        }`}>
                          <Users className="w-3.5 h-3.5" />
                          <span>{userCount} {userCount === 1 ? "colaborador" : "colaboradores"}</span>
                        </span>
                      </DataTableCell>
                      <DataTableCell>
                        <span className="font-mono text-xs text-surface-500 dark:text-slate-400 bg-surface-100 dark:bg-surface-800/80 px-2 py-0.5 rounded border border-surface-200 dark:border-surface-700">
                          {dept.id.slice(0, 8)}
                        </span>
                      </DataTableCell>
                      <DataTableCell className="text-right">
                        <ActionButtonGroup>
                          <ActionButton
                            variant="warning"
                            onClick={() => {
                              setEditingDepartment({ id: dept.id, name: dept.name });
                              setIsModalOpen(true);
                            }}
                            title="Editar departamento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </ActionButton>
                          <ActionButton
                            variant="danger"
                            onClick={() => handleDelete(dept)}
                            title={userCount > 0 ? "No se puede eliminar (tiene colaboradores)" : "Eliminar departamento"}
                            disabled={userCount > 0}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </ActionButton>
                        </ActionButtonGroup>
                      </DataTableCell>
                    </DataTableRow>
                  );
                })
              )}
            </DataTableBody>
          </DataTableContainer>
        )
      )}

      <DepartmentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveDepartment}
        initialData={editingDepartment}
      />
    </div>
  );
}
