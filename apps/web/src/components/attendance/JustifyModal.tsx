"use client";

import { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Loader2,
  Check,
  FileCheck2,
  Pencil,
  ArrowLeft,
  Calendar,
  User,
  ShieldCheck,
  Printer,
  ExternalLink,
  Clock,
  AlertTriangle,
  Briefcase,
  Car,
  Stethoscope,
  HeartPulse,
  Info,
} from "lucide-react";
import { AttendanceStatus } from "@asistencias/db";
import { clsx } from "clsx";
import { ModalShell } from "@/components/ui/ModalShell";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { JustificationCertificateModal } from "./JustificationCertificateModal";

interface JustifyModalProps {
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
  onSuccess: () => void;
}

interface JustificationCategory {
  id: string;
  label: string;
  description: string;
  icon: any;
  defaultStatus: AttendanceStatus;
  suggestedPlaceholder: string;
}

// ─────────────────────────────────────────────────────────────
// Catálogos Contextuales por Incidencia (Sin títulos truncados)
// ─────────────────────────────────────────────────────────────

const INCOMPLETO_CATEGORIES: JustificationCategory[] = [
  {
    id: "OLVIDO_SALIDA",
    label: "Olvido involuntario de marcación de salida",
    description: "Laboró jornada regular completa pero omitió registrar la salida física al retirarse.",
    icon: Clock,
    defaultStatus: AttendanceStatus.JUSTIFICADO,
    suggestedPlaceholder:
      "Ej: Colaborador laboró jornada completa hasta las 18:00 hrs. Omitió marcar salida al retirarse; corroborado por jefatura inmediata de área...",
  },
  {
    id: "FALLA_BIOMETRICO",
    label: "Falla técnica en tótem, biométrico o red",
    description: "Corte de energía, lector huella/facial inoperativo o caída de red en la sede.",
    icon: AlertTriangle,
    defaultStatus: AttendanceStatus.JUSTIFICADO,
    suggestedPlaceholder:
      "Ej: Dispositivo biométrico de salida presentó corte de energía o intermitencia de red entre las 17:50 y 18:30 hrs...",
  },
  {
    id: "COMISION_SALIDA",
    label: "Comisión o gestión externa al cierre",
    description: "Culminó sus funciones fuera de la sede asignada por labores de campo o con clientes.",
    icon: Briefcase,
    defaultStatus: AttendanceStatus.PERMISO,
    suggestedPlaceholder:
      "Ej: Culminó jornada realizando entrega / supervisión externa y terminó labores fuera de sede con autorización previa...",
  },
  {
    id: "SALIDA_ANTICIPADA_AUTORIZADA",
    label: "Salida anticipada con visto bueno de jefatura",
    description: "Retiro previo al término regular coordinado y visado por jefatura inmediata.",
    icon: ShieldCheck,
    defaultStatus: AttendanceStatus.PERMISO,
    suggestedPlaceholder:
      "Ej: Salida anticipada autorizada a las 16:30 hrs para atender diligencia médica o trámite impostergable...",
  },
  {
    id: "OTRO_INCOMPLETO",
    label: "Otro motivo justificado",
    description: "Causal justificada diferente a las opciones anteriores.",
    icon: FileText,
    defaultStatus: AttendanceStatus.JUSTIFICADO,
    suggestedPlaceholder:
      "Ej: Detalle el motivo específico por el cual no se registró la salida...",
  },
];

const TARDE_CATEGORIES: JustificationCategory[] = [
  {
    id: "TRAFICO_TRANSPORTE",
    label: "Congestión vehicular o retraso de transporte público",
    description: "Retraso fortuito por congestión masiva, avería de transporte o vía bloqueada.",
    icon: Car,
    defaultStatus: AttendanceStatus.JUSTIFICADO,
    suggestedPlaceholder:
      "Ej: Retraso masivo en vía principal por accidente / contingencia de transporte público debidamente comunicada...",
  },
  {
    id: "ATENCION_MEDICA",
    label: "Atención médica matutina o análisis clínico",
    description: "Cita asistencial en EsSalud / clínica o toma de análisis previa al ingreso laboral.",
    icon: Stethoscope,
    defaultStatus: AttendanceStatus.JUSTIFICADO,
    suggestedPlaceholder:
      "Ej: Cita asistencial en EsSalud / policlínico de 07:30 a 08:45 hrs. Se adjunta ticket / constancia de atención...",
  },
  {
    id: "COMISION_MATUTINA",
    label: "Gestión laboral o comisión matutina",
    description: "Inicio de jornada en notaría, banco o cliente antes de acudir a sede.",
    icon: Briefcase,
    defaultStatus: AttendanceStatus.PERMISO,
    suggestedPlaceholder:
      "Ej: Inicio de jornada gestionando firmas en notaría / trámite bancario para la organización antes de acudir a sede...",
  },
  {
    id: "EMERGENCIA_DOMESTICA",
    label: "Emergencia doméstica o fuerza mayor",
    description: "Contingencia personal o familiar urgente justificada ante jefatura.",
    icon: AlertTriangle,
    defaultStatus: AttendanceStatus.JUSTIFICADO,
    suggestedPlaceholder:
      "Ej: Emergencia doméstica urgente debidamente comunicada a primera hora a jefatura inmediata...",
  },
  {
    id: "OTRO_TARDE",
    label: "Otro motivo de tardanza",
    description: "Causal justificada diferente a las opciones anteriores.",
    icon: FileText,
    defaultStatus: AttendanceStatus.JUSTIFICADO,
    suggestedPlaceholder:
      "Ej: Detalle el motivo específico que generó la tardanza...",
  },
];

const AUSENTE_CATEGORIES: JustificationCategory[] = [
  {
    id: "FALTA_MEDICA",
    label: "Descanso médico (CITT / EsSalud / Clínica)",
    description: "Incapacidad temporal prescrita por EsSalud, MINSA o clínica con certificado.",
    icon: FileText,
    defaultStatus: AttendanceStatus.JUSTIFICADO,
    suggestedPlaceholder:
      "Ej: Certificado médico emitido por ESSALUD / CITT Nº 123456 con descanso médico prescrito por 2 días...",
  },
  {
    id: "PERMISO_PREAPROBADO",
    label: "Permiso pre-aprobado o licencia institucional",
    description: "Comisión de servicios, capacitación, duelo, paternidad o trámite autorizado.",
    icon: FileCheck2,
    defaultStatus: AttendanceStatus.PERMISO,
    suggestedPlaceholder:
      "Ej: Permiso institucional visado por gerencia / memorándum de capacitación o comisión de servicios...",
  },
  {
    id: "FUERZA_MAYOR_AUSENCIA",
    label: "Fuerza mayor o emergencia grave",
    description: "Causal fortuita grave que impidió la concurrencia a laborar.",
    icon: AlertTriangle,
    defaultStatus: AttendanceStatus.JUSTIFICADO,
    suggestedPlaceholder:
      "Ej: Contingencia fortuita / corte de vías de acceso o emergencia familiar grave acreditada...",
  },
  {
    id: "OTRO_AUSENTE",
    label: "Otro motivo de inasistencia",
    description: "Causal justificada diferente a las opciones anteriores.",
    icon: FileText,
    defaultStatus: AttendanceStatus.JUSTIFICADO,
    suggestedPlaceholder:
      "Ej: Detalle el motivo y sustento de la inasistencia...",
  },
];

const ABANDONO_CATEGORIES: JustificationCategory[] = [
  {
    id: "URGENCIA_MEDICA",
    label: "Emergencia médica sobrevenida",
    description: "Evacuación médica por descompensación repentina o accidente en sede.",
    icon: HeartPulse,
    defaultStatus: AttendanceStatus.JUSTIFICADO,
    suggestedPlaceholder:
      "Ej: Retiro y traslado a centro médico por descompensación de salud sobrevenida a las 14:00 hrs...",
  },
  {
    id: "RETIRO_AUTORIZADO",
    label: "Retiro autorizado por jefatura",
    description: "Comisión urgente imprevista, inspección o contingencia operacional fuera de sede.",
    icon: ShieldCheck,
    defaultStatus: AttendanceStatus.PERMISO,
    suggestedPlaceholder:
      "Ej: Retiro autorizado por jefatura de operaciones para acudir a inspección de urgencia en planta...",
  },
  {
    id: "OTRO_ABANDONO",
    label: "Otro motivo justificado",
    description: "Causal justificada diferente a las opciones anteriores.",
    icon: FileText,
    defaultStatus: AttendanceStatus.JUSTIFICADO,
    suggestedPlaceholder:
      "Ej: Detalle el motivo del retiro y visto bueno recibido...",
  },
];

function parseJustificationNotes(notes?: string | null) {
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

function formatPunchTime(t?: string | null) {
  if (!t) return null;
  try {
    if (t.includes("T")) {
      return format(parseISO(t), "hh:mm a");
    }
    return t.slice(0, 5);
  } catch {
    return t;
  }
}

export function JustifyModal({
  isOpen,
  onClose,
  attendance,
  onSuccess,
}: JustifyModalProps) {
  const isAlreadyJustified = useMemo(() => {
    return (
      attendance?.currentStatus === AttendanceStatus.JUSTIFICADO ||
      attendance?.currentStatus === AttendanceStatus.PERMISO
    );
  }, [attendance?.currentStatus]);

  const [isEditing, setIsEditing] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<AttendanceStatus>(AttendanceStatus.JUSTIFICADO);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Regularización opcional de hora de salida (para INCOMPLETO)
  const [regularizeExit, setRegularizeExit] = useState(false);
  const [exitTimeInput, setExitTimeInput] = useState("18:00");

  const { justification: existingJustification, categoryLabel: existingCategoryLabel, previousNotes } = useMemo(() => {
    return parseJustificationNotes(attendance?.notes);
  }, [attendance?.notes]);

  const extractedUrl = useMemo(() => {
    if (!existingJustification) return null;
    const match = existingJustification.match(/(https?:\/\/[^\s]+)/i);
    return match ? match[1] : null;
  }, [existingJustification]);

  // Selección de catálogo según estado
  const availableCategories = useMemo(() => {
    if (!attendance) return AUSENTE_CATEGORIES;
    switch (attendance.currentStatus) {
      case AttendanceStatus.INCOMPLETO:
        return INCOMPLETO_CATEGORIES;
      case AttendanceStatus.TARDE:
        return TARDE_CATEGORIES;
      case AttendanceStatus.ABANDONO_PUESTO:
        return ABANDONO_CATEGORIES;
      case AttendanceStatus.AUSENTE:
      default:
        return AUSENTE_CATEGORIES;
    }
  }, [attendance?.currentStatus]);

  const selectedCategory = useMemo(() => {
    return (
      availableCategories.find((c) => c.id === selectedCategoryId) ||
      availableCategories[0]
    );
  }, [availableCategories, selectedCategoryId]);

  useEffect(() => {
    if (!attendance || !isOpen) return;

    const alreadyJustified =
      attendance.currentStatus === AttendanceStatus.JUSTIFICADO ||
      attendance.currentStatus === AttendanceStatus.PERMISO;

    const parsed = parseJustificationNotes(attendance.notes);
    setReason(parsed.justification);
    setStatus(
      attendance.currentStatus === AttendanceStatus.PERMISO
        ? AttendanceStatus.PERMISO
        : AttendanceStatus.JUSTIFICADO
    );

    const matchedCategory = availableCategories.find(
      (c) => c.label.toLowerCase() === parsed.categoryLabel.toLowerCase()
    );
    setSelectedCategoryId(matchedCategory ? matchedCategory.id : availableCategories[0]?.id || "");

    setRegularizeExit(false);
    setExitTimeInput("18:00");
    setIsEditing(!alreadyJustified);
    setShowCertificate(false);
    setError("");
  }, [attendance, isOpen, availableCategories]);

  const formattedDate = useMemo(() => {
    if (!attendance?.date) return "";
    try {
      const raw =
        typeof attendance.date === "string"
          ? attendance.date.slice(0, 10)
          : "";
      const d = parseISO(raw);
      return format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    } catch {
      return String(attendance.date);
    }
  }, [attendance?.date]);

  const formattedAuditDate = useMemo(() => {
    if (!attendance?.statusChangedAt) return null;
    try {
      const d = parseISO(attendance.statusChangedAt);
      return format(d, "d MMM yyyy, hh:mm a", { locale: es });
    } catch {
      return null;
    }
  }, [attendance?.statusChangedAt]);

  if (!isOpen || !attendance) return null;

  const handleSelectCategory = (category: JustificationCategory) => {
    setSelectedCategoryId(category.id);
    setStatus(category.defaultStatus);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Por favor ingresa el motivo o sustento de la justificación.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const payload: any = {
        reason: reason.trim(),
        category: selectedCategory.id,
        categoryLabel: selectedCategory.label,
        status: status,
      };

      if (attendance.currentStatus === AttendanceStatus.INCOMPLETO && regularizeExit && exitTimeInput) {
        payload.exitTime = exitTimeInput;
      }

      const res = await fetch(`/api/attendance/${attendance.id}/justify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al procesar la justificación");

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al procesar la justificación");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDynamicModalTitle = () => {
    if (!isEditing) return "Detalle de Justificación";
    if (isAlreadyJustified) return "Modificar Justificación";
    switch (attendance.currentStatus) {
      case AttendanceStatus.INCOMPLETO:
        return "Justificar Omisión de Salida";
      case AttendanceStatus.TARDE:
        return "Justificar Tardanza";
      case AttendanceStatus.ABANDONO_PUESTO:
        return "Justificar Retiro Anticipado";
      case AttendanceStatus.AUSENTE:
        return "Justificar Inasistencia";
      default:
        return "Justificar Incidencia Laboral";
    }
  };

  const getIncidentBadgeLabel = () => {
    switch (attendance.currentStatus) {
      case AttendanceStatus.INCOMPLETO:
        return "Sin marcación de salida";
      case AttendanceStatus.TARDE:
        return `Tardanza (${attendance.lateMinutes || 0} min)`;
      case AttendanceStatus.ABANDONO_PUESTO:
        return "Retiro anticipado";
      case AttendanceStatus.AUSENTE:
        return "Inasistencia";
      default:
        return "Incidencia";
    }
  };

  const isIncIncompleto = attendance.currentStatus === AttendanceStatus.INCOMPLETO;

  // Footers según el modo
  const viewFooter = (
    <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="h-9 px-3.5 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-700 hover:text-surface-900 dark:bg-white/10 dark:hover:bg-white/15 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5" />
          <span>Modificar</span>
        </button>

        {extractedUrl && (
          <a
            href={extractedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-3.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 dark:text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Abrir Enlace</span>
          </a>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-3.5 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-700 hover:text-surface-900 dark:bg-white/10 dark:hover:bg-white/15 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
        >
          Cerrar
        </button>

        <button
          type="button"
          onClick={() => setShowCertificate(true)}
          className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs hover:shadow transition flex items-center gap-1.5 cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Descargar Certificado A4</span>
        </button>
      </div>
    </div>
  );

  const editFooter = (
    <div className="flex items-center justify-between w-full">
      {isAlreadyJustified ? (
        <button
          type="button"
          onClick={() => {
            setIsEditing(false);
            setReason(existingJustification);
            setError("");
          }}
          disabled={isSubmitting}
          className="h-9 px-3.5 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-700 hover:text-surface-900 dark:bg-white/10 dark:hover:bg-white/15 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Detalle</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="h-9 px-4 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-700 hover:text-surface-900 dark:bg-white/10 dark:hover:bg-white/15 dark:text-slate-200 text-xs font-semibold flex items-center transition cursor-pointer disabled:opacity-50"
        >
          Cancelar
        </button>
      )}

      <button
        type="submit"
        form="justify-form"
        disabled={isSubmitting}
        className="h-9 px-5 rounded-xl bg-warning-500 hover:bg-warning-600 text-white shadow-xs hover:shadow text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Guardando...</span>
          </>
        ) : (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>{isAlreadyJustified ? "Actualizar Justificación" : "Guardar Justificación"}</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title={getDynamicModalTitle()}
        description={`Colaborador: ${attendance.userName} · ${formattedDate || attendance.date}`}
        icon={!isEditing ? FileCheck2 : FileText}
        iconVariant={!isEditing ? "info" : "warning"}
        maxWidth="2xl"
        footer={!isEditing ? viewFooter : editFooter}
      >
        {/* VISTA 1: MODO CONSULTA / DETALLE */}
        {!isEditing ? (
          <div className="space-y-3.5 py-1">
            {/* Banner certificado membretado */}
            <div className="rounded-xl p-3 bg-gradient-to-r from-emerald-500/10 via-primary-500/5 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-surface-900 dark:text-white block">
                    Certificado Oficial Membretado (A4 / PDF)
                  </span>
                  <span className="text-[11px] text-surface-500 dark:text-slate-400 block">
                    Constancia formal con tipificación oficial y firmas de RRHH para legajo o SUNAFIL.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCertificate(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Emitir PDF</span>
              </button>
            </div>

            {/* Card del Estado y Categoría Acreditada */}
            <div className="rounded-xl p-3.5 bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-white/10 flex items-start gap-3">
              <div
                className={clsx(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  attendance.currentStatus === AttendanceStatus.PERMISO
                    ? "bg-info-500/15 text-info-600 dark:text-info-400 border border-info-500/30"
                    : "bg-warning-500/15 text-warning-600 dark:text-warning-400 border border-warning-500/30"
                )}
              >
                <ShieldCheck className="w-4 h-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={clsx(
                      "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase",
                      attendance.currentStatus === AttendanceStatus.PERMISO
                        ? "bg-info-100 text-info-700 dark:bg-info-500/20 dark:text-info-300 border border-info-300 dark:border-info-500/30"
                        : "bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300 border border-warning-300 dark:border-warning-500/30"
                    )}
                  >
                    {attendance.currentStatus === AttendanceStatus.PERMISO
                      ? "Permiso Aprobado"
                      : "Incidencia Justificada"}
                  </span>

                  {existingCategoryLabel && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-primary-500/10 text-primary-700 dark:text-primary-300 border border-primary-500/20">
                      {existingCategoryLabel}
                    </span>
                  )}
                </div>

                <p className="text-xs text-surface-600 dark:text-slate-400 mt-1">
                  Estado oficial regularizado en nómina de control de asistencia.
                </p>
              </div>
            </div>

            {/* Marcaciones de Entrada y Salida */}
            {(attendance.entryTime || attendance.exitTime) && (
              <div className="rounded-xl p-3 bg-surface-50 dark:bg-surface-900/40 border border-surface-200 dark:border-white/10 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-surface-400 uppercase font-bold block mb-0.5">
                    Entrada Registrada
                  </span>
                  <span className="font-mono font-bold text-surface-900 dark:text-white">
                    {formatPunchTime(attendance.entryTime) || "No registrada"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-surface-400 uppercase font-bold block mb-0.5">
                    Salida Acreditada
                  </span>
                  <span className="font-mono font-bold text-surface-900 dark:text-white">
                    {formatPunchTime(attendance.exitTime) || "Regularizada sin marcación física"}
                  </span>
                </div>
              </div>
            )}

            {/* Sustento Registrado */}
            <div className="rounded-xl p-3.5 bg-surface-50 dark:bg-surface-900/40 border border-surface-200 dark:border-white/10 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-surface-900 dark:text-slate-200 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5 text-primary-500" />
                <span>Documento de Respaldo / Motivo Registrado</span>
              </div>

              <div className="rounded-lg p-3 bg-white dark:bg-white/[0.03] border border-surface-200/80 dark:border-white/5 text-xs text-surface-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {existingJustification || (
                  <span className="italic text-surface-400 dark:text-slate-500">
                    Sin motivo o sustento detallado registrado.
                  </span>
                )}
              </div>
            </div>

            {/* Metadatos y Auditoría */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-lg p-2.5 bg-surface-50 dark:bg-surface-900/40 border border-surface-200 dark:border-white/10 flex items-center gap-2.5">
                <User className="w-3.5 h-3.5 text-surface-400" />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-surface-400 block">
                    Registrado por
                  </span>
                  <span className="font-semibold text-surface-900 dark:text-white truncate block">
                    {attendance.statusChangedBy || "Administración"}
                  </span>
                </div>
              </div>

              <div className="rounded-lg p-2.5 bg-surface-50 dark:bg-surface-900/40 border border-surface-200 dark:border-white/10 flex items-center gap-2.5">
                <Calendar className="w-3.5 h-3.5 text-surface-400" />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-surface-400 block">
                    Fecha de Aplicación
                  </span>
                  <span className="font-semibold text-surface-900 dark:text-white truncate block">
                    {formattedAuditDate || formattedDate || attendance.date}
                  </span>
                </div>
              </div>
            </div>

            {previousNotes && (
              <div className="rounded-lg p-2.5 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div className="min-w-0 text-[11px]">
                  <span className="font-bold">Observación previa: </span>
                  <span>{previousNotes}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* VISTA 2: MODO EDICIÓN CON ESPACIADO LIMPIO Y SIN TRUNCAMIENTOS */
          <form onSubmit={handleSubmit} id="justify-form" className="space-y-3.5 py-1">
            {error && (
              <div className="px-3.5 py-2.5 rounded-xl bg-danger-500/10 border border-danger-500/25 text-danger-700 dark:text-danger-300 text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-danger-500 shrink-0 animate-ping" />
                <span>{error}</span>
              </div>
            )}

            {/* Strip Contextual Compacto */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl bg-surface-100/70 dark:bg-white/[0.03] border border-surface-200/80 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-xs font-semibold text-surface-900 dark:text-white">
                  {getIncidentBadgeLabel()}
                </span>
                <span className="text-xs text-surface-400 dark:text-slate-500">•</span>
                <span className="text-xs text-surface-500 dark:text-slate-400">
                  {formattedDate}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                {attendance.entryTime && (
                  <span className="px-2 py-0.5 rounded-md bg-white dark:bg-white/5 border border-surface-200 dark:border-white/10 text-surface-700 dark:text-slate-300">
                    Entrada: <strong className="text-surface-900 dark:text-white">{formatPunchTime(attendance.entryTime)}</strong>
                  </span>
                )}
                {attendance.exitTime ? (
                  <span className="px-2 py-0.5 rounded-md bg-white dark:bg-white/5 border border-surface-200 dark:border-white/10 text-surface-700 dark:text-slate-300">
                    Salida: <strong className="text-surface-900 dark:text-white">{formatPunchTime(attendance.exitTime)}</strong>
                  </span>
                ) : isIncIncompleto ? (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-sans font-medium text-[11px]">
                    Salida omitida
                  </span>
                ) : null}
              </div>
            </div>

            {/* Section 1: Selector Vertical Limpio (Texto completo, sin truncar) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-surface-700 dark:text-slate-300 uppercase tracking-wider">
                1. Causal o Motivo de la Incidencia
              </label>

              <div className="space-y-1.5">
                {availableCategories.map((category) => {
                  const IconComponent = category.icon;
                  const isSelected = selectedCategory.id === category.id;

                  return (
                    <label
                      key={category.id}
                      onClick={() => handleSelectCategory(category)}
                      className={clsx(
                        "flex items-start gap-3 px-3 py-2 rounded-xl border transition-all cursor-pointer group",
                        isSelected
                          ? "bg-warning-500/10 border-warning-500/50 dark:border-warning-500/50 shadow-xs ring-1 ring-warning-500/30"
                          : "bg-surface-50/70 dark:bg-white/[0.02] border-surface-200/70 dark:border-white/5 hover:border-surface-300 dark:hover:border-white/15 hover:bg-surface-100/50 dark:hover:bg-white/[0.04]"
                      )}
                    >
                      {/* Radio dot */}
                      <div
                        className={clsx(
                          "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all",
                          isSelected
                            ? "border-warning-500 bg-warning-500 text-white"
                            : "border-surface-300 dark:border-white/20 group-hover:border-surface-400"
                        )}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>

                      {/* Icon */}
                      <div
                        className={clsx(
                          "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                          isSelected
                            ? "bg-warning-500/20 text-warning-600 dark:text-warning-400"
                            : "bg-surface-200/50 dark:bg-white/5 text-surface-500 dark:text-slate-400"
                        )}
                      >
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>

                      {/* Textos amplios sin ellipsis */}
                      <div className="min-w-0 flex-1 leading-tight">
                        <span
                          className={clsx(
                            "text-xs block",
                            isSelected
                              ? "text-surface-900 dark:text-white font-bold"
                              : "text-surface-800 dark:text-slate-300 font-medium"
                          )}
                        >
                          {category.label}
                        </span>
                        <span className="text-[11px] text-surface-500 dark:text-slate-400 block mt-0.5">
                          {category.description}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Regularización Opcional de Hora de Salida (Solo para INCOMPLETO) */}
            {isIncIncompleto && (
              <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-surface-50/80 dark:bg-white/[0.02] border border-surface-200/80 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-warning-500 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-surface-800 dark:text-slate-200 block">
                      Regularizar hora efectiva de salida
                    </span>
                    <span className="text-[11px] text-surface-500 dark:text-slate-400 block">
                      Registra la hora cumplida para computar horas trabajadas en nómina.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {regularizeExit && (
                    <input
                      type="time"
                      value={exitTimeInput}
                      onChange={(e) => setExitTimeInput(e.target.value)}
                      className="h-8 px-2.5 text-xs font-mono font-bold rounded-lg border border-surface-200 dark:border-white/10 bg-white dark:bg-white/5 text-surface-900 dark:text-white outline-none focus:ring-1 focus:ring-warning-500"
                    />
                  )}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regularizeExit}
                      onChange={(e) => setRegularizeExit(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-surface-300 peer-focus:outline-none rounded-full peer dark:bg-white/15 peer-checked:after:translate-x-3.5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-warning-500"></div>
                  </label>
                </div>
              </div>
            )}

            {/* Section 2: Sustento o Motivo */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-surface-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-warning-500" />
                  <span>2. Sustento o Detalle del Registro</span>
                  <span className="text-danger-500">*</span>
                </label>
                <span className="text-[10px] text-surface-400 dark:text-slate-500">
                  Obligatorio
                </span>
              </div>

              <textarea
                required
                rows={3}
                placeholder={selectedCategory.suggestedPlaceholder}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-white/[0.04] text-surface-900 dark:text-white placeholder:text-surface-400 dark:placeholder:text-surface-500 rounded-xl border border-surface-200 dark:border-white/10 focus:border-warning-500 focus:ring-2 focus:ring-warning-500/20 outline-none transition-all resize-none shadow-xs leading-relaxed"
              />
              <span className="text-[11px] text-surface-400 dark:text-slate-500 block">
                Indique número de CITT, memorándum de jefatura, ticket de soporte o enlace web de respaldo.
              </span>
            </div>
          </form>
        )}
      </ModalShell>

      {/* Modal de Constancia Imprimible y Exportable a PDF */}
      <JustificationCertificateModal
        isOpen={showCertificate}
        onClose={() => setShowCertificate(false)}
        attendance={attendance}
      />
    </>
  );
}
