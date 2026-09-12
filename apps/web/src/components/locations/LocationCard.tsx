"use client";

import React, { useState } from "react";
import { 
  Building, 
  MapPin, 
  Edit2, 
  Trash2, 
  Users, 
  QrCode, 
  Activity, 
  Check, 
  Copy,
  Clock,
  Radio
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ActionButton, ActionButtonGroup } from "@/components/ui/ActionButton";

export interface LocationData {
  id: string;
  name: string;
  address?: string | null;
  timezone: string;
  isActive: boolean;
  _count?: {
    users: number;
    kiosks: number;
    attendances: number;
  };
}

interface LocationCardProps {
  location: LocationData;
  onEdit: (loc: LocationData) => void;
  onToggleStatus: (loc: LocationData) => void;
}

export function LocationCard({ location, onEdit, onToggleStatus }: LocationCardProps) {
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(location.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const shortId = location.id.substring(0, 8).toUpperCase();

  return (
    <article className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-primary-300 dark:hover:border-primary-500/30 transition-all duration-200 flex flex-col gap-5 group">
      {/* Top Active Accent Line */}
      {location.isActive && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-info-400 to-primary-600 opacity-80" />
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
          {/* Location Icon Badge */}
          <div 
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
              location.isActive
                ? "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-500/20 shadow-sm"
                : "bg-surface-100 dark:bg-surface-800 text-surface-400 dark:text-surface-500 border border-surface-200 dark:border-surface-700"
            }`}
          >
            <Building className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>

          {/* Title & Metadata */}
          <div className="flex flex-col min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-surface-900 dark:text-surface-100 tracking-tight truncate">
                {location.name}
              </h2>
              <StatusBadge
                status={location.isActive ? "ACTIVO" : "INACTIVO"}
                label={location.isActive ? "Activa" : "Inactiva"}
                size="sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-surface-500 dark:text-surface-400">
              {/* Monospace Copyable ID */}
              <button
                onClick={handleCopyId}
                title="Copiar ID completo"
                className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 bg-primary-50/60 dark:bg-primary-500/10 px-1.5 py-0.5 rounded border border-primary-200/60 dark:border-primary-500/20 transition cursor-pointer"
              >
                <span>ID: {shortId}</span>
                {copiedId ? (
                  <Check className="w-3 h-3 text-primary-600 dark:text-primary-400" />
                ) : (
                  <Copy className="w-2.5 h-2.5 opacity-60" />
                )}
              </button>

              <span className="text-surface-300 dark:text-surface-700">•</span>

              {/* Address */}
              <span className="flex items-center gap-1 truncate max-w-[240px] sm:max-w-xs" title={location.address || "Sin dirección"}>
                <MapPin className="w-3.5 h-3.5 shrink-0 text-surface-400 dark:text-surface-500" />
                <span>{location.address || "Sin dirección especificada"}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <ActionButtonGroup align="right" className="self-end sm:self-start shrink-0">
          <ActionButton
            size="md"
            variant="warning"
            icon={<Edit2 className="w-4 h-4" />}
            title="Editar Sede"
            onClick={() => onEdit(location)}
          />
          <ActionButton
            size="md"
            variant={location.isActive ? "danger" : "success"}
            icon={<Trash2 className="w-4 h-4" />}
            title={location.isActive ? "Desactivar Sede" : "Reactivar Sede"}
            onClick={() => onToggleStatus(location)}
          />
        </ActionButtonGroup>
      </div>

      {/* Timezone & Operational Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-2 px-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700/80 text-xs">
        <div className="flex items-center gap-2 font-mono text-[11px] text-surface-600 dark:text-surface-400">
          <Clock className="w-3.5 h-3.5 text-surface-400 dark:text-surface-500" />
          <span>Zona horaria: <strong className="text-surface-800 dark:text-surface-200 font-semibold">{location.timezone}</strong></span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-500/20 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 dark:bg-primary-400 animate-pulse" />
            Sistema: Validado
          </span>
        </div>
      </div>

      {/* Operational Metrics Multi-Box */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {/* Metric 1: Colaboradores */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-surface-500 dark:text-surface-400 mb-1">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">Colaboradores</span>
            <Users className="w-3.5 h-3.5 text-surface-400 dark:text-surface-500" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-surface-900 dark:text-white tabular-nums">
            {location._count?.users || 0}
          </span>
        </div>

        {/* Metric 2: Kiosks */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-surface-500 dark:text-surface-400 mb-1">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">Kioskos</span>
            <QrCode className="w-3.5 h-3.5 text-primary-500 dark:text-primary-400" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-primary-600 dark:text-primary-400 tabular-nums">
            {location._count?.kiosks || 0}
          </span>
        </div>

        {/* Metric 3: Transacciones */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-surface-500 dark:text-surface-400 mb-1">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">Marcaciones</span>
            <Activity className="w-3.5 h-3.5 text-info-500 dark:text-info-400" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-info-600 dark:text-info-400 tabular-nums">
            {location._count?.attendances || 0}
          </span>
        </div>
      </div>
    </article>
  );
}
