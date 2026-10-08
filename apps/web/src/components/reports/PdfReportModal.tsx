"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import { ModalShell } from "@/components/ui/ModalShell";

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: {
    organization: {
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
    periodLabel: string;
    generatedAt: string;
    worker?: {
      id?: string;
      firstName: string;
      lastName: string;
      documentId?: string | null;
      email?: string | null;
      role?: string | null;
      department?: { id?: string; name: string } | null;
      location?: { id?: string; name: string } | null;
    } | null;
    metrics: {
      totalRecords: number;
      presentCount: number;
      lateCount: number;
      absentCount: number;
      abandonedCount: number;
      justifiedCount: number;
      totalLateMinutes: number;
      totalWorkedHours: string;
      punctualPercentage: number;
      attendanceRate: number;
    };
    attendances: Array<{
      id: string;
      date: string;
      entryTime: string | null;
      exitTime: string | null;
      workedMinutes: number | null;
      lateMinutes: number | null;
      status: string;
      notes: string | null;
      statusChangedBy: string | null;
      user: {
        firstName: string;
        lastName: string;
        documentId: string | null;
        email: string;
        role: string;
      };
      location: {
        name: string;
      } | null;
      kiosk: {
        name: string;
      } | null;
    }>;
  } | null;
}

export function PdfReportModal({ isOpen, onClose, reportData }: PdfReportModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !reportData || !mounted) return null;

  const { organization, periodLabel, generatedAt, metrics, attendances } = reportData;
  const orgSettings = (organization?.settings as any) || {};

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "PRESENTE":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "TARDE":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "AUSENTE":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "ABANDONO_PUESTO":
        return "bg-red-100 text-red-900 border-red-400";
      case "JUSTIFICADO":
      case "PERMISO":
        return "bg-sky-100 text-sky-800 border-sky-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  const getStatusLabel = (status: string, exitTime: string | null, lateMinutes: number | null) => {
    if (status === "PRESENTE") {
      return exitTime ? "Completado" : "En Turno";
    }
    if (status === "TARDE") {
      return exitTime ? `Completado (+${lateMinutes || 0}m)` : `En Turno (+${lateMinutes || 0}m)`;
    }
    if (status === "ABANDONO_PUESTO") return "Abandono";
    if (status === "AUSENTE") return "Ausente";
    if (status === "JUSTIFICADO") return "Justificado";
    if (status === "PERMISO") return "Permiso";
    return status;
  };

  const footer = (
    <div className="flex items-center justify-end w-full gap-3">
      <button
        onClick={onClose}
        className="h-10 px-6 rounded-xl bg-danger-50 hover:bg-danger-100 text-danger-700 hover:text-danger-800 border border-danger-200 hover:border-danger-300 dark:bg-danger-500/10 dark:hover:bg-danger-500/20 dark:text-danger-300 dark:hover:text-danger-200 dark:border-danger-500/30 dark:hover:border-danger-500/50 text-xs font-semibold transition-colors cursor-pointer"
      >
        Cancelar
      </button>
      <button
        onClick={handlePrint}
        className="inline-flex items-center gap-2 h-10 px-6 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
      >
        <Printer className="w-4 h-4" />
        Imprimir / Guardar en PDF
      </button>
    </div>
  );

  const renderReportContent = (isPrint: boolean) => {
    const isSingleWorker = Boolean(
      reportData.worker ||
      (attendances.length > 0 && attendances.every((a) => a.user.email === attendances[0].user.email))
    );
    const workerInfo = reportData.worker || (isSingleWorker && attendances[0]?.user ? {
      firstName: attendances[0].user.firstName,
      lastName: attendances[0].user.lastName,
      documentId: attendances[0].user.documentId,
      email: attendances[0].user.email,
      role: attendances[0].user.role,
      location: attendances[0].location,
      department: null,
    } : null);

    return (
    <div
      className={
        isPrint
          ? "w-full bg-white text-slate-900 p-0 space-y-4 font-sans text-xs"
          : "w-full max-w-[1020px] mx-auto bg-white text-slate-900 rounded-2xl shadow-sm p-6 sm:p-8 space-y-5 font-sans text-xs border border-slate-200"
      }
    >
      {/* Top Corporate Accent Bar */}
      <div
        className={`h-2 w-full bg-gradient-to-r from-emerald-600 via-lime-500 to-teal-700 mb-3 ${
          isPrint ? "rounded-none" : "rounded-full"
        }`}
      />

      {/* Header: Company Info + Co-Branding Presenxa */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        {/* Left: Client Company Logo & Info */}
        <div className="flex items-center gap-3.5">
          {organization?.logoUrl ? (
            <img
              src={organization.logoUrl}
              alt={organization.name}
              className="h-12 max-w-[140px] object-contain rounded-lg border border-slate-100 p-1 bg-white"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-lime-400 flex items-center justify-center font-black text-lg shadow-sm">
              {organization?.name ? organization.name.charAt(0).toUpperCase() : "P"}
            </div>
          )}
          <div>
            <h1 className="text-base font-black text-slate-900 leading-tight">
              {organization?.name || "Empresa"}
            </h1>
            {orgSettings.ruc && (
              <p className="text-[11px] font-bold text-slate-700">RUC / NIF: {orgSettings.ruc}</p>
            )}
            {orgSettings.address && (
              <p className="text-[10px] text-slate-500">{orgSettings.address}</p>
            )}
            {orgSettings.phone && (
              <p className="text-[10px] text-slate-500">Tel: {orgSettings.phone}</p>
            )}
          </div>
        </div>

        {/* Right: Report Title & Security Co-Branding */}
        <div className="text-left sm:text-right space-y-1">
          <span className="inline-block px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[10px] tracking-wider uppercase border border-emerald-200">
            {isSingleWorker ? "Kardex Oficial de Asistencia Individual" : "Reporte Oficial de Asistencia"}
          </span>
          <p className="text-xs font-bold text-slate-800">{periodLabel}</p>
          <p className="text-[10px] text-slate-500">Emisión: {generatedAt}</p>
          <p className="text-[9px] text-slate-400 font-medium">
            Validado por <strong className="text-emerald-700 font-bold">Presenxa Intelligent Control</strong>
          </p>
        </div>
      </div>

      {/* Individual Worker Profile Card (if applicable) */}
      {workerInfo && (
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs print-avoid-break">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-teal-500 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
              {workerInfo.firstName?.charAt(0)}{workerInfo.lastName?.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm">
                  {workerInfo.lastName}, {workerInfo.firstName}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {workerInfo.role || "EMPLEADO"}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-sans mt-0.5">
                DNI / Doc: <strong className="font-mono text-slate-800">{workerInfo.documentId || "No registrado"}</strong>
                {workerInfo.email && <span className="ml-2 text-slate-400">· {workerInfo.email}</span>}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {workerInfo.department?.name && (
              <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium">
                Área: <strong>{workerInfo.department.name}</strong>
              </span>
            )}
            {workerInfo.location?.name && (
              <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium">
                Sede: <strong>{workerInfo.location.name}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* KPI Summary Grid (Executive Metrics) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 py-1 print-avoid-break">
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <p className="text-[10px] text-slate-500 font-medium">Registros</p>
          <p className="text-base font-black text-slate-900">{metrics.totalRecords}</p>
        </div>
        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
          <p className="text-[10px] text-emerald-700 font-medium">Puntuales</p>
          <p className="text-base font-black text-emerald-800">{metrics.presentCount}</p>
        </div>
        <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-center">
          <p className="text-[10px] text-amber-700 font-medium">Tardanzas</p>
          <p className="text-base font-black text-amber-800">{metrics.lateCount}</p>
        </div>
        <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-center">
          <p className="text-[10px] text-rose-700 font-medium">Faltas / Aband.</p>
          <p className="text-base font-black text-rose-800">
            {metrics.absentCount + metrics.abandonedCount}
          </p>
        </div>
        <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-center">
          <p className="text-[10px] text-sky-700 font-medium">Horas Trab.</p>
          <p className="text-base font-black text-sky-800">{metrics.totalWorkedHours}h</p>
        </div>
        <div className="p-2 rounded-xl bg-teal-50 border border-teal-200 text-center">
          <p className="text-[10px] text-teal-700 font-medium">Puntualidad</p>
          <p className="text-base font-black text-teal-800">{metrics.punctualPercentage}%</p>
        </div>
      </div>

      {/* Attendance Detail Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden print:overflow-visible print:border-slate-300">
        <table className="w-full text-left border-collapse text-[10.5px]">
          <thead>
            <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
              <th className="py-2 px-2 w-8 text-center">#</th>
              <th className="py-2 px-2.5 whitespace-nowrap">Fecha</th>
              <th className="py-2 px-2.5">Empleado</th>
              <th className="py-2 px-2 whitespace-nowrap">DNI / Doc</th>
              <th className="py-2 px-2">Sede</th>
              <th className="py-2 px-2 text-center whitespace-nowrap">Entrada</th>
              <th className="py-2 px-2 text-center whitespace-nowrap">Salida</th>
              <th className="py-2 px-2 text-center whitespace-nowrap">Horas</th>
              <th className="py-2 px-2 text-center whitespace-nowrap">Estado</th>
              <th className="py-2 px-2.5">Observación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {attendances.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-400">
                  No se encontraron registros de asistencia para el período seleccionado.
                </td>
              </tr>
            ) : (
              attendances.map((a, idx) => {
                const dateFormatted = format(new Date(a.date), "dd/MM/yyyy");
                const entryFormatted = a.entryTime
                  ? format(new Date(a.entryTime), "HH:mm")
                  : "--:--";
                const exitFormatted = a.exitTime
                  ? format(new Date(a.exitTime), "HH:mm")
                  : "--:--";
                const workedHoursStr = a.workedMinutes
                  ? `${(a.workedMinutes / 60).toFixed(1)}h`
                  : "--";

                return (
                  <tr
                    key={a.id}
                    className={`print-avoid-break ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}`}
                  >
                    <td className="py-1.5 px-2 text-center text-slate-400 font-mono text-[10px]">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2.5 font-mono text-slate-700 whitespace-nowrap">
                      {dateFormatted}
                    </td>
                    <td className="py-1.5 px-2.5 font-semibold text-slate-900 min-w-[140px]">
                      {a.user.lastName}, {a.user.firstName}
                    </td>
                    <td className="py-1.5 px-2 font-mono text-slate-600 whitespace-nowrap">
                      {a.user.documentId || "—"}
                    </td>
                    <td className="py-1.5 px-2 text-slate-600 truncate max-w-[110px]">
                      {a.location?.name || "—"}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono font-medium text-slate-900 whitespace-nowrap">
                      {entryFormatted}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono font-medium text-slate-900 whitespace-nowrap">
                      {exitFormatted}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono text-slate-600 whitespace-nowrap">
                      {workedHoursStr}
                    </td>
                    <td className="py-1.5 px-2 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${getStatusBadgeStyle(
                          a.status
                        )}`}
                      >
                        {getStatusLabel(a.status, a.exitTime, a.lateMinutes)}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5 text-[10px] text-slate-500 max-w-[140px] truncate">
                      {a.notes || a.statusChangedBy
                        ? `${a.notes || ""} ${a.statusChangedBy ? `(${a.statusChangedBy})` : ""}`
                        : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Official Signature Boxes */}
      <div className="pt-6 grid grid-cols-2 gap-12 text-center text-slate-600 print-avoid-break">
        <div className="space-y-1">
          <div className="border-t border-slate-300 w-4/5 mx-auto pt-2" />
          <p className="font-bold text-[11px] text-slate-800">
            Responsable de RRHH / Gerencia
          </p>
          <p className="text-[10px] text-slate-400">Firma y Sello de la Empresa</p>
        </div>
        <div className="space-y-1">
          <div className="border-t border-slate-300 w-4/5 mx-auto pt-2" />
          <p className="font-bold text-[11px] text-slate-800">
            {workerInfo ? `Firma del Colaborador: ${workerInfo.lastName}, ${workerInfo.firstName}` : "Revisión y Conformidad"}
          </p>
          <p className="text-[10px] text-slate-400">
            {workerInfo ? `DNI / Doc: ${workerInfo.documentId || "____________________"}` : "Firma de Auditoría / Control"}
          </p>
        </div>
      </div>

      {/* Document Footer */}
      <div className="border-t border-slate-200 pt-3 text-center space-y-1 text-[10px] text-slate-400 print-avoid-break">
        {orgSettings.footerText && (
          <p className="italic text-slate-600 font-medium">{orgSettings.footerText}</p>
        )}
        <p>
          Documento oficial generado a través de la plataforma <strong>Presenxa</strong> · Sistema Digital de Control de Asistencia
        </p>
      </div>
    </div>
  );
  };

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Vista Previa de Reporte PDF Oficial"
        description="Diseñado para impresión y exportación profesional en hoja A4 (Horizontal)"
        icon={Printer}
        iconVariant="success"
        maxWidth="7xl"
        footer={footer}
      >
        <div className="flex-1 overflow-y-auto bg-surface-50 dark:bg-black/50 p-4 sm:p-6 rounded-b-3xl max-h-[70vh] custom-scrollbar">
          {renderReportContent(false)}
        </div>
      </ModalShell>

      {/* Portal de Impresión Físico Montado Directamente en body */}
      {mounted &&
        createPortal(
          <div id="printable-report-portal" className="hidden print:block w-full">
            {renderReportContent(true)}
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
