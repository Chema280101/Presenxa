"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Printer, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ModalShell } from "@/components/ui/ModalShell";
import { formatUserRole, UserExportItem } from "@/lib/exportUsersExcel";

interface UsersPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserExportItem[];
  organization?: {
    name: string;
    logoUrl?: string | null;
    settings?: {
      ruc?: string | null;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      footerText?: string | null;
    };
  } | null;
}

export function UsersPdfModal({
  isOpen,
  onClose,
  users,
  organization,
}: UsersPdfModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const orgSettings = (organization?.settings as any) || {};
  const now = new Date();
  const dateFormatted = format(now, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const inactiveUsers = totalUsers - activeUsers;
  const adminCount = users.filter((u) => u.role === "ADMIN" || u.role === "SUPER_ADMIN" || u.role === "SUPERVISOR").length;
  const employeeCount = users.filter((u) => u.role === "EMPLEADO").length;

  const handlePrint = () => {
    window.print();
  };

  const footer = (
    <div className="flex items-center justify-end w-full gap-3">
      <button
        type="button"
        onClick={onClose}
        className="h-10 px-5 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-700 hover:text-surface-900 border border-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 dark:text-slate-300 dark:border-surface-700 text-xs font-semibold transition-colors cursor-pointer"
      >
        Cerrar
      </button>
      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center gap-2 h-10 px-6 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
      >
        <Printer className="w-4 h-4" />
        Imprimir / Guardar como PDF
      </button>
    </div>
  );

  const renderDocumentContent = (isPrint: boolean) => (
    <div
      className={
        isPrint
          ? "w-full bg-white text-slate-900 p-0 space-y-4 font-sans text-xs"
          : "w-full max-w-[1020px] mx-auto bg-white text-slate-900 rounded-2xl shadow-sm p-6 sm:p-8 space-y-5 font-sans text-xs border border-slate-200"
      }
    >
      {/* Top Corporate Accent Bar */}
      <div
        className={`h-2 w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-primary-600 mb-3 ${
          isPrint ? "rounded-none" : "rounded-full"
        }`}
      />

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        {/* Left: Organization Logo & Info */}
        <div className="flex items-center gap-3.5">
          {organization?.logoUrl ? (
            <img
              src={organization.logoUrl}
              alt={organization.name}
              className="h-12 max-w-[140px] object-contain rounded-lg border border-slate-100 p-1 bg-white"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-black text-lg shadow-sm">
              {organization?.name ? organization.name.charAt(0).toUpperCase() : "P"}
            </div>
          )}
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight leading-tight">
              {organization?.name || "Empresa"}
            </h1>
            {orgSettings.ruc && (
              <p className="text-[11px] font-bold text-slate-700">RUC: {orgSettings.ruc}</p>
            )}
            {orgSettings.address && (
              <p className="text-[10px] text-slate-500">{orgSettings.address}</p>
            )}
            {orgSettings.phone && (
              <p className="text-[10px] text-slate-500">Tel: {orgSettings.phone}</p>
            )}
          </div>
        </div>

        {/* Right: Document Title & Metadata */}
        <div className="text-left sm:text-right space-y-1">
          <span className="inline-block px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[10px] tracking-wider uppercase border border-emerald-200">
            Padrón Oficial de Colaboradores
          </span>
          <p className="text-xs font-bold text-slate-800">Directorio Institucional</p>
          <p className="text-[10px] text-slate-500">Emisión: {dateFormatted}</p>
          <p className="text-[9px] text-slate-400 font-medium">
            Validado por <strong className="text-emerald-700 font-bold">Presenxa Intelligent Control</strong>
          </p>
        </div>
      </div>

      {/* Metric Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 py-1 print-avoid-break">
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <p className="text-[10px] text-slate-500 font-medium">Total en Padrón</p>
          <p className="text-sm font-black text-slate-900">{totalUsers}</p>
        </div>
        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
          <p className="text-[10px] text-emerald-700 font-medium">Usuarios Activos</p>
          <p className="text-sm font-black text-emerald-800">{activeUsers}</p>
        </div>
        <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-center">
          <p className="text-[10px] text-rose-700 font-medium">Inactivos</p>
          <p className="text-sm font-black text-rose-800">{inactiveUsers}</p>
        </div>
        <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-center">
          <p className="text-[10px] text-sky-700 font-medium">Empleados</p>
          <p className="text-sm font-black text-sky-800">{employeeCount}</p>
        </div>
        <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-center">
          <p className="text-[10px] text-indigo-700 font-medium">Supervisores / Admins</p>
          <p className="text-sm font-black text-indigo-800">{adminCount}</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden print:overflow-visible print:border-slate-300">
        <table className="w-full text-left border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
              <th className="py-2 px-2 text-center w-8">#</th>
              <th className="py-2 px-2.5">Documento</th>
              <th className="py-2 px-2.5">Apellidos y Nombres</th>
              <th className="py-2 px-2.5">Contacto (Email / Tel)</th>
              <th className="py-2 px-2 text-center">Rol</th>
              <th className="py-2 px-2.5">Sede</th>
              <th className="py-2 px-2.5">Turno Asignado</th>
              <th className="py-2 px-2 text-center">NFC UID</th>
              <th className="py-2 px-2 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  No hay colaboradores que coincidan con los filtros aplicados.
                </td>
              </tr>
            ) : (
              users.map((u, idx) => {
                const scheduleName =
                  u.userSchedules && u.userSchedules.length > 0
                    ? u.userSchedules
                        .map((item) => {
                          const s = item.schedule;
                          if (!s) return "";
                          return `${s.name} (${String(s.entryHour).padStart(2, "0")}:${String(s.entryMinute).padStart(2, "0")} - ${String(s.exitHour).padStart(2, "0")}:${String(s.exitMinute).padStart(2, "0")})`;
                        })
                        .filter(Boolean)
                        .join(", ")
                    : "Sin turno";

                return (
                  <tr key={u.id || idx} className="print-avoid-break hover:bg-slate-50/70">
                    <td className="py-1.5 px-2 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2.5 font-mono font-medium text-slate-800">
                      {u.documentId || "-"}
                    </td>
                    <td className="py-1.5 px-2.5 font-bold text-slate-900">
                      {u.lastName}, {u.firstName}
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-600">
                      <div>{u.email}</div>
                      {u.phone && <div className="text-[9px] text-slate-400">{u.phone}</div>}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {formatUserRole(u.role)}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-700">
                      {u.location?.name || "Sin sede"}
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-600 max-w-[150px] truncate">
                      {scheduleName}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono text-[9px] text-slate-500">
                      {u.nfcCardUid || "No"}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          u.isActive
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {u.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer & Signature Section */}
      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 text-[10px] text-slate-500 print-avoid-break">
        <div className="space-y-1 text-center sm:text-left">
          <p>
            Documento oficial generado para fines de control de RRHH e inventario de credenciales.
          </p>
          <p className="text-[9px] text-slate-400">
            Plataforma <strong>Presenxa</strong> · Sistema de Control Biométrico y Tarjetas Inteligentes.
          </p>
        </div>

        <div className="flex items-center gap-8 print:flex">
          <div className="text-center w-36">
            <div className="border-b border-slate-400 h-8 mb-1" />
            <p className="font-bold text-slate-700 text-[9px]">Firma / Sello RRHH</p>
          </div>
          <div className="text-center w-36">
            <div className="border-b border-slate-400 h-8 mb-1" />
            <p className="font-bold text-slate-700 text-[9px]">Gerencia / Dirección</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Padrón de Colaboradores para Impresión / PDF"
        description="Vista preliminar optimizada para exportación oficial en hoja A4 (Horizontal)"
        icon={Users}
        iconVariant="success"
        maxWidth="7xl"
        footer={footer}
      >
        <div className="flex-1 overflow-y-auto bg-surface-50 dark:bg-black/50 p-4 sm:p-6 rounded-b-3xl max-h-[70vh] custom-scrollbar">
          {renderDocumentContent(false)}
        </div>
      </ModalShell>

      {/* Portal de Impresión Físico Montado Directamente en body */}
      {mounted &&
        createPortal(
          <div id="printable-users-report-portal" className="hidden print:block w-full">
            {renderDocumentContent(true)}
            <style jsx global>{`
              @media print {
                @page {
                  size: A4 landscape;
                  margin: 8mm 10mm;
                }
              }
            `}</style>
          </div>,
          document.body
        )}
    </>
  );
}
