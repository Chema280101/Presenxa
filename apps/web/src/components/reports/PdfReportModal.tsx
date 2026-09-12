"use client";

import React, { useState, useEffect } from "react";
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

  const getStatusBadgeStyle = (status: string, exitTime: string | null) => {
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

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Vista Previa de Reporte PDF Oficial"
      description="Diseñado para impresión profesional en tamaño Carta / A4"
      icon={Printer}
      iconVariant="success"
      maxWidth="6xl"
      footer={footer}
    >
      <div className="flex-1 overflow-y-auto bg-surface-50 dark:bg-black/50 p-4 sm:p-8 rounded-b-3xl max-h-[70vh] custom-scrollbar print:bg-white print:p-0 print:overflow-visible">
        {/* A4 Sheet Container */}
        <div
          id="printable-report"
          className="w-full max-w-[850px] mx-auto bg-white text-slate-900 rounded-2xl shadow-sm p-8 sm:p-10 space-y-6 font-sans text-xs border border-slate-200 print:border-none print:shadow-none print:p-6 print:rounded-none"
        >
          {/* Top Corporate Accent Bar */}
          <div className="h-2 w-full bg-gradient-to-r from-emerald-600 via-lime-500 to-teal-700 rounded-full mb-4 print:rounded-none" />

          {/* Header: Company Info + Co-Branding Presenxa */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            {/* Left: Client Company Logo & Info */}
            <div className="flex items-center gap-4">
              {organization?.logoUrl ? (
                <img
                  src={organization.logoUrl}
                  alt={organization.name}
                  className="h-14 max-w-[150px] object-contain rounded-lg border border-slate-100 p-1 bg-white"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-lime-400 flex items-center justify-center font-black text-xl shadow-md">
                  {organization?.name ? organization.name.charAt(0).toUpperCase() : "P"}
                </div>
              )}
              <div>
                <h1 className="text-lg font-black text-slate-900 leading-tight">
                  {organization?.name || "Empresa"}
                </h1>
                {orgSettings.ruc && (
                  <p className="text-xs font-bold text-slate-700">RUC / NIF: {orgSettings.ruc}</p>
                )}
                {orgSettings.address && (
                  <p className="text-[11px] text-slate-500">{orgSettings.address}</p>
                )}
                {orgSettings.phone && (
                  <p className="text-[11px] text-slate-500">Tel: {orgSettings.phone}</p>
                )}
              </div>
            </div>

            {/* Right: Report Title & Security Co-Branding */}
            <div className="text-left sm:text-right space-y-1">
              <span className="inline-block px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[10px] tracking-wider uppercase border border-emerald-200">
                Reporte Oficial de Asistencia
              </span>
              <p className="text-xs font-bold text-slate-800">{periodLabel}</p>
              <p className="text-[10px] text-slate-500">Emisión: {generatedAt}</p>
              <p className="text-[9px] text-slate-400 font-medium">
                Validado por <strong className="text-emerald-700 font-bold">Presenxa Intelligent Control</strong>
              </p>
            </div>
          </div>

          {/* KPI Summary Grid (Executive Metrics) */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 py-2">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-[10px] text-slate-500 font-medium">Registros</p>
              <p className="text-base font-black text-slate-900">{metrics.totalRecords}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <p className="text-[10px] text-emerald-700 font-medium">Puntuales</p>
              <p className="text-base font-black text-emerald-800">{metrics.presentCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <p className="text-[10px] text-amber-700 font-medium">Tardanzas</p>
              <p className="text-base font-black text-amber-800">{metrics.lateCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-center">
              <p className="text-[10px] text-rose-700 font-medium">Faltas / Aband.</p>
              <p className="text-base font-black text-rose-800">
                {metrics.absentCount + metrics.abandonedCount}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-center">
              <p className="text-[10px] text-sky-700 font-medium">Horas Trab.</p>
              <p className="text-base font-black text-sky-800">{metrics.totalWorkedHours}h</p>
            </div>
            <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-center">
              <p className="text-[10px] text-teal-700 font-medium">Puntualidad</p>
              <p className="text-base font-black text-teal-800">{metrics.punctualPercentage}%</p>
            </div>
          </div>

          {/* Attendance Detail Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                  <th className="py-2 px-2.5 w-8 text-center">#</th>
                  <th className="py-2 px-2.5">Fecha</th>
                  <th className="py-2 px-2.5">Empleado</th>
                  <th className="py-2 px-2.5">DNI / Doc</th>
                  <th className="py-2 px-2.5">Sede</th>
                  <th className="py-2 px-2.5 text-center">Entrada</th>
                  <th className="py-2 px-2.5 text-center">Salida</th>
                  <th className="py-2 px-2.5 text-center">Horas</th>
                  <th className="py-2 px-2.5 text-center">Estado</th>
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
                        className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}
                      >
                        <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-[10px]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-slate-700 whitespace-nowrap">
                          {dateFormatted}
                        </td>
                        <td className="py-2 px-2.5 font-semibold text-slate-900 whitespace-nowrap">
                          {a.user.lastName}, {a.user.firstName}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-slate-600">
                          {a.user.documentId || "—"}
                        </td>
                        <td className="py-2 px-2.5 text-slate-600 truncate max-w-[90px]">
                          {a.location?.name || "—"}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono font-medium text-slate-900">
                          {entryFormatted}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono font-medium text-slate-900">
                          {exitFormatted}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono text-slate-600">
                          {workedHoursStr}
                        </td>
                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeStyle(
                              a.status,
                              a.exitTime
                            )}`}
                          >
                            {getStatusLabel(a.status, a.exitTime, a.lateMinutes)}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-[10px] text-slate-500 max-w-[120px] truncate">
                          {a.notes || a.statusChangedBy ? `${a.notes || ""} ${a.statusChangedBy ? `(${a.statusChangedBy})` : ""}` : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Official Signature Boxes */}
          <div className="pt-8 grid grid-cols-2 gap-12 text-center text-slate-600">
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
                Revisión y Conformidad
              </p>
              <p className="text-[10px] text-slate-400">Firma de Auditoría / Control</p>
            </div>
          </div>

          {/* Document Footer */}
          <div className="border-t border-slate-200 pt-4 text-center space-y-1 text-[10px] text-slate-400">
            {orgSettings.footerText && (
              <p className="italic text-slate-600 font-medium">{orgSettings.footerText}</p>
            )}
            <p>
              Documento oficial generado a través de la plataforma <strong>Presenxa</strong> · Sistema Digital de Control de Asistencia
            </p>
          </div>
        </div>
      </div>

      {/* Print Specific CSS Style Injection */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report,
          #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
        }
      `}</style>
    </ModalShell>
  );
}
