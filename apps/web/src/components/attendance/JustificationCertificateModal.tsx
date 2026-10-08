"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Printer,
  Building2,
  User,
  ShieldCheck,
  Calendar,
  FileText,
  FileCheck2,
  ExternalLink,
  MapPin,
  Clock,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ModalShell } from "@/components/ui/ModalShell";
import { AttendanceStatus } from "@asistencias/db";

interface JustificationCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendance: {
    id: string;
    userName: string;
    userDocumentId?: string | null;
    userRole?: string | null;
    departmentName?: string | null;
    locationName?: string | null;
    date: string;
    currentStatus: AttendanceStatus;
    notes?: string | null;
    statusChangedBy?: string | null;
    statusChangedAt?: string | null;
    entryTime?: string | null;
    exitTime?: string | null;
    lateMinutes?: number | null;
  } | null;
}

function parseJustification(notes?: string | null) {
  if (!notes) return { justification: "", categoryLabel: "", previousNotes: "" };
  const justMatch = notes.match(/\[JUSTIFICACI[ÓO]N(?:\s*-\s*Tipo:\s*([^\]]+))?\]:\s*([\s\S]*?)(?:\n\(Notas previas:|$)/i);
  const prevMatch = notes.match(/\(Notas previas:\s*([\s\S]*?)\)$/i);

  if (justMatch) {
    return {
      categoryLabel: justMatch[1] ? justMatch[1].trim() : "",
      justification: justMatch[2].trim(),
      previousNotes: prevMatch ? prevMatch[1].trim() : "",
    };
  }

  return {
    categoryLabel: "",
    justification: notes.trim(),
    previousNotes: "",
  };
}

export function JustificationCertificateModal({
  isOpen,
  onClose,
  attendance,
}: JustificationCertificateModalProps) {
  const [mounted, setMounted] = useState(false);
  const [org, setOrg] = useState<{
    name: string;
    logoUrl?: string | null;
    settings?: {
      ruc?: string | null;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      footerText?: string | null;
    };
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/organization")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.organization) {
          setOrg(data.organization);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const { justification, categoryLabel, previousNotes } = useMemo(() => {
    return parseJustification(attendance?.notes);
  }, [attendance?.notes]);

  const extractedUrl = useMemo(() => {
    if (!justification) return null;
    const match = justification.match(/(https?:\/\/[^\s]+)/i);
    return match ? match[1] : null;
  }, [justification]);

  const formatPunchTime = (timeStr?: string | null) => {
    if (!timeStr) return "No registrada";
    try {
      if (timeStr.includes("T")) {
        const d = parseISO(timeStr);
        return format(d, "HH:mm:ss");
      }
      return timeStr.slice(0, 8);
    } catch {
      return timeStr;
    }
  };

  const formattedDate = useMemo(() => {
    if (!attendance?.date) return "";
    try {
      const raw = typeof attendance.date === "string" ? attendance.date.slice(0, 10) : "";
      const d = parseISO(raw);
      return format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    } catch {
      return String(attendance.date);
    }
  }, [attendance?.date]);

  const formattedShortDate = useMemo(() => {
    if (!attendance?.date) return "";
    try {
      const raw = typeof attendance.date === "string" ? attendance.date.slice(0, 10) : "";
      const d = parseISO(raw);
      return format(d, "dd/MM/yyyy");
    } catch {
      return String(attendance.date);
    }
  }, [attendance?.date]);

  const formattedAuditDate = useMemo(() => {
    if (!attendance?.statusChangedAt) return null;
    try {
      const d = parseISO(attendance.statusChangedAt);
      return format(d, "dd/MM/yyyy HH:mm:ss", { locale: es });
    } catch {
      return null;
    }
  }, [attendance?.statusChangedAt]);

  const issueDateFormatted = useMemo(() => {
    return format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
  }, []);

  if (!isOpen || !attendance || !mounted) return null;

  const certificateFolio = `JUST-${attendance.id.slice(0, 8).toUpperCase()}`;
  const orgName = org?.name || "Empresa";
  const orgRuc = org?.settings?.ruc;
  const isPermiso = attendance.currentStatus === AttendanceStatus.PERMISO;

  const handlePrint = () => {
    window.print();
  };

  const renderCertificateContent = (isPrintPortal = false) => {
    return (
      <div
        className={`w-full max-w-4xl mx-auto bg-white text-slate-800 p-8 sm:p-12 space-y-7 font-sans ${
          isPrintPortal ? "print:p-6 print:m-0 print:shadow-none" : "shadow-md rounded-2xl border border-slate-200"
        }`}
      >
        {/* Cabecera Membretada Oficial */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-6 border-b-2 border-slate-900 print-avoid-break">
          <div className="flex items-center gap-4">
            {org?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={org.logoUrl}
                alt={orgName}
                className="w-16 h-16 object-contain rounded-lg border border-slate-200 p-1"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-xs">
                {orgName.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                {orgName}
              </h1>
              {orgRuc && (
                <p className="text-xs font-mono font-bold text-slate-600 mt-0.5">
                  RUC: {orgRuc}
                </p>
              )}
              {org?.settings?.address && (
                <p className="text-[11px] text-slate-500 mt-0.5 max-w-md">
                  {org.settings.address}
                </p>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 font-mono font-bold text-xs rounded border border-slate-300">
              {certificateFolio}
            </span>
            <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
              Emisión: <span className="font-semibold text-slate-700">{issueDateFormatted}</span>
            </p>
            <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mt-0.5">
              ● Estado: Acreditado en Nómina
            </p>
          </div>
        </div>

        {/* Título Principal de la Constancia */}
        <div className="text-center space-y-1 py-1 print-avoid-break">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-wide uppercase underline underline-offset-4 decoration-2 decoration-slate-900">
            {isPermiso
              ? "Constancia Oficial de Permiso Laboral Acreditado"
              : categoryLabel
              ? `Constancia Oficial de Justificación: ${categoryLabel}`
              : "Constancia Oficial de Justificación de Incidencia Laboral"}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Documento de control laboral expedido bajo el Reglamento Interno de Trabajo
          </p>
        </div>

        {/* Ficha de Datos del Trabajador */}
        <div className="rounded-xl border border-slate-300 overflow-hidden text-xs print-avoid-break">
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-slate-700" />
            <span>1. Datos del Colaborador</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6">
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">Apellidos y Nombres:</span>
              <span className="font-bold text-slate-900 text-sm">{attendance.userName}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">N° Documento de Identidad (DNI):</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {attendance.userDocumentId || "No consignado"}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">Área o Departamento:</span>
              <span className="font-semibold text-slate-800">
                {attendance.departmentName || "General"}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">Sede Asignada / Cargo:</span>
              <span className="font-semibold text-slate-800">
                {attendance.locationName ? `${attendance.locationName} · ` : ""}
                {attendance.userRole || "Colaborador"}
              </span>
            </div>
          </div>
        </div>

        {/* Ficha de la Incidencia Justificada */}
        <div className="rounded-xl border border-slate-300 overflow-hidden text-xs print-avoid-break">
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-700" />
            <span>2. Acreditación de la Jornada Laboral</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-y-2.5 gap-x-4">
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">Fecha Afectada:</span>
              <span className="font-bold text-slate-900">{formattedDate || attendance.date}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">Tipo de Incidencia / Regularización:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[11px] inline-block ${
                  isPermiso
                    ? "bg-sky-100 text-sky-800 border border-sky-300"
                    : "bg-amber-100 text-amber-800 border border-amber-300"
                }`}
              >
                {categoryLabel || (isPermiso ? "Permiso Pre-Aprobado" : "Justificación de Incidencia")}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">Efecto en Nómina:</span>
              <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                No Computa Inasistencia Injustificada
              </span>
            </div>
          </div>

          {(attendance.entryTime || attendance.exitTime) && (
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">Marcación de Entrada:</span>
                <span className="font-mono font-bold text-slate-900 text-xs px-2 py-0.5 rounded bg-white border border-slate-200">
                  {formatPunchTime(attendance.entryTime)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">Marcación de Salida:</span>
                <span className="font-mono font-bold text-slate-900 text-xs px-2 py-0.5 rounded bg-white border border-slate-200">
                  {attendance.exitTime ? formatPunchTime(attendance.exitTime) : "Sin marcación física (Regularizada)"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sustento o Documento Registrado */}
        <div className="rounded-xl border border-slate-300 overflow-hidden text-xs print-avoid-break">
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-slate-700" />
            <span>3. Sustento Documentario / Detalle Registrado</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed font-mono text-[11px]">
              {justification || "Sin motivo o sustento adicional detallado al momento del registro."}
            </div>

            {extractedUrl && (
              <div className="text-[11px] text-slate-600 flex items-center gap-1.5 font-sans">
                <span className="font-bold">Enlace de respaldo detectado:</span>
                <span className="text-sky-700 underline font-mono break-all">{extractedUrl}</span>
              </div>
            )}

            {previousNotes && (
              <div className="text-[11px] text-slate-500 font-sans pt-1 border-t border-slate-200">
                <span className="font-bold text-slate-700">Observaciones previas del sistema: </span>
                <span>{previousNotes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Auditoría de Aprobación */}
        <div className="rounded-xl border border-slate-300 p-4 text-xs bg-slate-50/70 print-avoid-break">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">Autorizado / Registrado por:</span>
              <span className="font-bold text-slate-900">
                {attendance.statusChangedBy || "Administración / Jefatura de RRHH"}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">Fecha y Hora de Auditoría:</span>
              <span className="font-mono font-semibold text-slate-800">
                {formattedAuditDate || "Fecha de jornada regular"}
              </span>
            </div>
          </div>
        </div>

        {/* Cuadros de Firma Oficiales */}
        <div className="pt-8 grid grid-cols-2 gap-12 text-center text-slate-600 print-avoid-break">
          <div className="space-y-1.5">
            <div className="border-t border-slate-400 w-4/5 mx-auto pt-2" />
            <p className="font-bold text-xs text-slate-900">
              Responsable de RRHH / Jefatura
            </p>
            <p className="text-[10px] text-slate-500">Firma y Sello de la Empresa</p>
          </div>
          <div className="space-y-1.5">
            <div className="border-t border-slate-400 w-4/5 mx-auto pt-2" />
            <p className="font-bold text-xs text-slate-900">{attendance.userName}</p>
            <p className="text-[10px] text-slate-500">
              DNI: {attendance.userDocumentId || "____________________"} · Trabajador
            </p>
          </div>
        </div>

        {/* Pie de Página Formal */}
        <div className="border-t border-slate-300 pt-4 text-center space-y-1 text-[10px] text-slate-500 print-avoid-break">
          <p>
            Constancia oficial emitida a través de la plataforma <strong>Presenxa</strong> · Sistema de Gestión y Fiscalización Laboral
          </p>
          <p className="text-[9px] text-slate-400 font-mono">
            ID de Registro: {attendance.id} · Certificado válido para legajo laboral de nómina
          </p>
        </div>
      </div>
    );
  };

  const footer = (
    <div className="flex items-center justify-between w-full">
      {extractedUrl ? (
        <a
          href={extractedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="h-10 px-4 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 dark:text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Abrir Enlace de Respaldo</span>
        </a>
      ) : (
        <span className="text-xs text-surface-400 dark:text-slate-500">
          Formato optimizado para hoja A4
        </span>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-10 px-4 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-700 hover:text-surface-900 dark:bg-white/10 dark:hover:bg-white/15 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
        >
          Cerrar
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm hover:shadow-md transition flex items-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir / Guardar como PDF</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Constancia Oficial de Justificación"
        description={`Colaborador: ${attendance.userName} · Folio: ${certificateFolio}`}
        icon={FileCheck2}
        iconVariant="success"
        maxWidth="4xl"
        footer={footer}
      >
        <div className="flex-1 overflow-y-auto bg-surface-100 dark:bg-black/60 p-4 sm:p-6 rounded-2xl max-h-[75vh] custom-scrollbar">
          {renderCertificateContent(false)}
        </div>
      </ModalShell>

      {/* Portal de Impresión Físico Montado en body para window.print() */}
      {mounted &&
        createPortal(
          <div id="printable-certificate-portal" className="hidden print:block w-full">
            {renderCertificateContent(true)}
            <style jsx global>{`
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 10mm 12mm;
                }
                body * {
                  visibility: hidden;
                }
                #printable-certificate-portal,
                #printable-certificate-portal * {
                  visibility: visible;
                }
                #printable-certificate-portal {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  background: white !important;
                  color: black !important;
                }
                .print-avoid-break {
                  break-inside: avoid;
                  page-break-inside: avoid;
                }
              }
            `}</style>
          </div>,
          document.body
        )}
    </>
  );
}
