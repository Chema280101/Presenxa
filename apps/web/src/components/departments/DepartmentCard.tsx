"use client";

import React from "react";
import { FolderTree, Edit2, Trash2, Users } from "lucide-react";
import { ActionButton, ActionButtonGroup } from "@/components/ui/ActionButton";

export interface DepartmentData {
  id: string;
  name: string;
  _count?: {
    users: number;
  };
}

interface DepartmentCardProps {
  department: DepartmentData;
  onEdit: (dept: DepartmentData) => void;
  onDelete: (dept: DepartmentData) => void;
}

export function DepartmentCard({ department, onEdit, onDelete }: DepartmentCardProps) {
  return (
    <article className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-primary-300 dark:hover:border-primary-500/30 transition-all duration-200 flex flex-col gap-4 group">
      
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-info-400 to-primary-600 opacity-0 group-hover:opacity-80 transition-opacity" />

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <div 
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors bg-surface-100 dark:bg-surface-800 text-surface-400 dark:text-surface-500 border border-surface-200 dark:border-surface-700 group-hover:bg-primary-50 dark:group-hover:bg-primary-500/10 group-hover:text-primary-600 dark:group-hover:text-primary-400 group-hover:border-primary-200 dark:group-hover:border-primary-500/20"
          >
            <FolderTree className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>

          <div className="flex flex-col min-w-0 pt-1">
            <h2 className="text-lg sm:text-xl font-bold text-surface-900 dark:text-surface-100 tracking-tight truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {department.name}
            </h2>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-surface-500 dark:text-surface-400 font-medium">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-surface-400 dark:text-surface-500" />
                <span>{department._count?.users || 0} Colaboradores</span>
              </span>
            </div>
          </div>
        </div>

        <ActionButtonGroup align="right" className="self-end sm:self-start shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <ActionButton
            size="md"
            variant="warning"
            icon={<Edit2 className="w-4 h-4" />}
            title="Editar Departamento"
            onClick={() => onEdit(department)}
          />
          <ActionButton
            size="md"
            variant="danger"
            icon={<Trash2 className="w-4 h-4" />}
            title="Eliminar Departamento"
            onClick={() => onDelete(department)}
            disabled={(department._count?.users || 0) > 0}
          />
        </ActionButtonGroup>
      </div>

    </article>
  );
}
