"use client";

import { useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  QrCode,
  Hash,
  Sparkles,
  Cake,
  Calendar,
  Bell,
  Sun,
  Sunrise,
  Moon,
  Flame,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  MapPin,
} from "lucide-react";

export interface ScanCelebrationData {
  scanType: "ENTRY" | "EXIT" | "ALREADY_REGISTERED";
  message: string;
  time: string;
  date: string;
  status: string;
  method?: "NFC" | "QR_SECURE" | "MANUAL_DNI" | "QR_STANDARD" | string;
  requiresVerification?: boolean;
  lateMinutes?: number | null;
  lateMinutes2?: number | null;
  workedMinutes?: number | null;
  user: {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    documentId?: string | null;
    role: string;
    photoUrl?: string | null;
    locationName?: string;
  };
  microInteraction?: {
    greeting: string;
    timeOfDay: "morning" | "afternoon" | "evening" | "night";
    timeBadge: string;
    motivationalPhrase: string;
    actionTitle: string;
    isBirthday: boolean;
    birthdayMessage?: string;
    colleagueBirthdays?: Array<{ name: string; role?: string }>;
    notice?: {
      type: "MEETING" | "ANNOUNCEMENT" | "REMINDER" | "INFO";
      title: string;
      description: string;
      time?: string;
      location?: string;
      priority?: "NORMAL" | "HIGH" | "URGENT";
    } | null;
    celebrationType: "BIRTHDAY" | "PUNCTUAL" | "MILESTONE" | "NONE";
    onTimeStreakDays?: number;
  };
}

interface ScanCelebrationCardProps {
  data: ScanCelebrationData;
  countdown: number;
  totalDuration: number;
  onDismiss: () => void;
}

export function ScanCelebrationCard({
  data,
  countdown,
  totalDuration,
  onDismiss,
}: ScanCelebrationCardProps) {
  const { user, microInteraction } = data;
  const isBirthday = Boolean(microInteraction?.isBirthday);
  const isLate = data.status === "TARDE" || (data.lateMinutes && data.lateMinutes > 0);
  const isVerification = Boolean(data.requiresVerification);

  // Time-of-day Icon
  const renderTimeIcon = () => {
    switch (microInteraction?.timeOfDay) {
      case "morning":
        return <Sunrise className="w-3.5 h-3.5 text-amber-400" />;
      case "afternoon":
        return <Sun className="w-3.5 h-3.5 text-amber-300" />;
      case "evening":
      case "night":
        return <Moon className="w-3.5 h-3.5 text-indigo-300" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-lime-400" />;
    }
  };

  // Progress bar percentage
  const progressPercent = Math.max(0, Math.min(100, (countdown / totalDuration) * 100));

  return (
    <div
      className={`w-full max-w-lg rounded-3xl p-6 sm:p-7 glass-card border shadow-2xl flex flex-col items-center text-center relative overflow-hidden transition-all animate-scale-up ${
        isBirthday
          ? "border-amber-400/50 shadow-amber-500/20 bg-gradient-to-b from-amber-500/10 via-surface-900/90 to-surface-950/95"
          : isVerification
          ? "border-amber-500/40 shadow-amber-500/20 bg-surface-900/95"
          : isLate
          ? "border-amber-400/30 shadow-amber-950/40 bg-surface-900/95"
          : "border-primary-400/40 shadow-primary-950/60 bg-surface-900/95"
      }`}
    >
      {/* Top Countdown Progress Bar */}
      <div className="absolute top-0 inset-x-0 h-1.5 bg-white/10 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            isBirthday
              ? "bg-gradient-to-r from-amber-400 via-pink-500 to-lime-400"
              : isVerification || isLate
              ? "bg-amber-400"
              : "bg-primary-400"
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Greeting Header Badge */}
      <div className="flex items-center gap-2 mb-4 mt-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-200">
          {renderTimeIcon()}
          <span>{microInteraction?.timeBadge || "Terminal de Asistencia"}</span>
        </div>

        {microInteraction?.onTimeStreakDays && microInteraction.onTimeStreakDays >= 3 && (
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-xs font-bold text-orange-300">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Racha: {microInteraction.onTimeStreakDays} días</span>
          </div>
        )}
      </div>

      {/* Main Avatar with Glow */}
      <div className="relative mb-3">
        <div
          className={`absolute -inset-1 rounded-3xl blur-md opacity-60 transition-all ${
            isBirthday
              ? "bg-gradient-to-r from-amber-400 via-pink-500 to-lime-400 animate-pulse"
              : isLate
              ? "bg-amber-400"
              : "bg-primary-400"
          }`}
        />
        <img
          src={
            user.photoUrl ||
            `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
              `${user.firstName} ${user.lastName}`
            )}&backgroundColor=a3e635&textColor=060e17`
          }
          alt="Avatar"
          className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-3xl ring-4 ring-white/10 shadow-2xl bg-surface-950 object-cover"
        />

        {/* Floating status icon */}
        <div
          className={`absolute -bottom-2 -right-2 p-1.5 rounded-2xl shadow-lg ${
            isBirthday
              ? "bg-amber-400 text-surface-950 ring-4 ring-amber-500/30 animate-bounce"
              : isVerification || isLate
              ? "bg-amber-400 text-surface-950 ring-4 ring-amber-500/30"
              : "bg-primary-400 text-surface-950 ring-4 ring-primary-400/30"
          }`}
        >
          {isBirthday ? (
            <Cake className="w-4 h-4 font-bold" />
          ) : isVerification ? (
            <AlertTriangle className="w-4 h-4 font-bold" />
          ) : isLate ? (
            <Clock className="w-4 h-4 font-bold" />
          ) : (
            <CheckCircle2 className="w-4 h-4 font-bold" />
          )}
        </div>
      </div>

      {/* Greeting Title & User Name */}
      <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-0.5">
        {microInteraction?.greeting || `¡Hola, ${user.firstName}!`}
      </h2>
      <p className="text-xs text-slate-300 font-medium mb-3">
        <span>{user.firstName} {user.lastName}</span>
        <span className="mx-1.5 text-slate-500">•</span>
        <span className="text-primary-300 font-semibold uppercase">{user.role}</span>
        {user.documentId ? <span className="text-slate-400"> (DNI: {user.documentId})</span> : null}
      </p>

      {/* Method & Scan Action Badges */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
        {data.method === "NFC" ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-lime-400/15 text-lime-300 border border-lime-400/30 text-[11px] font-bold">
            <CreditCard className="w-3 h-3" />
            NFC
          </span>
        ) : data.method === "QR_SECURE" ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-sky-400/15 text-sky-300 border border-sky-400/30 text-[11px] font-bold">
            <QrCode className="w-3 h-3" />
            QR Seguro
          </span>
        ) : data.method === "MANUAL_DNI" ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-400/15 text-amber-300 border border-amber-400/30 text-[11px] font-bold">
            <Hash className="w-3 h-3" />
            DNI Manual
          </span>
        ) : null}

        <span
          className={`px-3 py-1 rounded-xl text-xs font-extrabold border ${
            isVerification
              ? "bg-amber-500/20 text-amber-200 border-amber-500/40 animate-pulse"
              : data.scanType === "ENTRY"
              ? "bg-primary-400/20 text-primary-200 border-primary-400/40"
              : data.scanType === "EXIT"
              ? "bg-sky-500/20 text-sky-200 border-sky-500/40"
              : "bg-white/10 text-slate-200 border-white/15"
          }`}
        >
          {isVerification
            ? "⚠️ MARCACIÓN PENDIENTE DE VALIDACIÓN"
            : microInteraction?.actionTitle
            ? `✅ ${microInteraction.actionTitle.toUpperCase()}`
            : data.scanType === "ENTRY"
            ? "✅ INGRESO REGISTRADO"
            : data.scanType === "EXIT"
            ? "👋 SALIDA REGISTRADA"
            : "ℹ️ ASISTENCIA PREVIA"}
        </span>
      </div>

      {/* Motivational / Contextual Phrase */}
      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-4 max-w-md">
        {microInteraction?.motivationalPhrase || data.message}
      </p>

      {/* ── BIRTHDAY CELEBRATION BANNER ───────────────────────────── */}
      {isBirthday && (
        <div className="w-full mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-lime-500/20 border border-amber-400/40 text-left shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-400 text-surface-950 shrink-0 font-bold">
              🎂
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-amber-300 flex items-center gap-1.5">
                <span>¡Feliz Cumpleaños! 🎉</span>
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-200 leading-snug mt-0.5">
                {microInteraction?.birthdayMessage ||
                  "¡De parte de todo el equipo, te deseamos un día extraordinario lleno de éxitos y alegrías!"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── COLLEAGUE BIRTHDAYS REMINDER ─────────────────────────── */}
      {!isBirthday && microInteraction?.colleagueBirthdays && microInteraction.colleagueBirthdays.length > 0 && (
        <div className="w-full mb-4 p-3 rounded-2xl bg-pink-500/10 border border-pink-500/25 text-left">
          <div className="flex items-center gap-2.5 text-xs text-pink-200 font-medium">
            <span className="text-base">🎈</span>
            <span>
              Hoy cumple años{" "}
              <strong className="text-white font-bold">
                {microInteraction.colleagueBirthdays.map((c) => c.name).join(", ")}
              </strong>
              . ¡Pásate a felicitarlo/a en su día!
            </span>
          </div>
        </div>
      )}

      {/* ── DAILY NOTICE / MEETING CARD ──────────────────────────── */}
      {microInteraction?.notice && (
        <div className="w-full mb-4 p-3.5 rounded-2xl bg-surface-950/80 border border-primary-400/25 text-left shadow-md">
          <div className="flex items-start gap-2.5">
            <div
              className={`p-1.5 rounded-xl shrink-0 ${
                microInteraction.notice.type === "MEETING"
                  ? "bg-sky-500/20 text-sky-300"
                  : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {microInteraction.notice.type === "MEETING" ? (
                <Calendar className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-300">
                  {microInteraction.notice.type === "MEETING" ? "📅 Reunión de Hoy" : "📢 Aviso Importante"}
                </span>
                {microInteraction.notice.time && (
                  <span className="text-[11px] font-mono font-bold text-amber-300 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                    {microInteraction.notice.time}
                  </span>
                )}
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                {microInteraction.notice.title}
              </h4>
              <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">
                {microInteraction.notice.description}
              </p>
              {microInteraction.notice.location && (
                <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span>{microInteraction.notice.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Time & Metrics Strip */}
      <div className="w-full grid grid-cols-2 gap-2 text-xs font-mono p-3 rounded-2xl bg-surface-950/70 border border-white/10 mb-4">
        <div>
          <span className="text-slate-400 block text-[10px] font-sans font-semibold">HORA CAPTURADA</span>
          <span className="text-white font-bold text-sm tracking-wide">{data.time}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] font-sans font-semibold">ESTADO</span>
          <span
            className={`font-bold text-sm ${
              isVerification
                ? "text-amber-400"
                : isLate
                ? "text-amber-400"
                : "text-primary-400"
            }`}
          >
            {isVerification ? "POR VALIDAR" : data.status}
          </span>
        </div>
      </div>

      {/* Footer Countdown & Fast Advance Button */}
      <div className="flex items-center justify-between w-full pt-2 border-t border-white/10 text-xs">
        <div className="text-slate-400 flex items-center gap-1.5">
          <span>Siguiente escaneo en</span>
          <strong className="text-primary-400 font-mono text-sm font-bold">{countdown}s</strong>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="px-4 py-2 rounded-xl bg-primary-400/20 hover:bg-primary-400/30 text-primary-300 hover:text-white text-xs font-extrabold border border-primary-400/30 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
        >
          <span>Siguiente</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
