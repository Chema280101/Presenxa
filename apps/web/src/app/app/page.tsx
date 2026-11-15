"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import QRCode from "qrcode";
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Sparkles,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { AttendanceStatus } from "@asistencias/db";
import { TimeOffRequestModal } from "@/components/employee/TimeOffRequestModal";
import { JustificationCertificateModal } from "@/components/attendance/JustificationCertificateModal";
import { PortalHeader } from "@/components/employee/PortalHeader";
import { WorkdayStatusCard } from "@/components/employee/WorkdayStatusCard";
import { QrCredentialCard } from "@/components/employee/QrCredentialCard";
import { MonthlyMetricsGrid } from "@/components/employee/MonthlyMetricsGrid";
import { AttendanceHistoryCard } from "@/components/employee/AttendanceHistoryCard";
import { RequestsInboxCard } from "@/components/employee/RequestsInboxCard";
import type {
  HistoryItem,
  HistoryMetrics,
  MyTimeOffItem,
  TodayAttendance,
  UserProfile,
} from "@/components/employee/types";

interface MeResponse {
  user: UserProfile;
  todayAttendance: TodayAttendance | null;
}

interface HistoryResponse {
  history: HistoryItem[];
  metrics: HistoryMetrics | null;
}

interface TimeOffResponse {
  requests: MyTimeOffItem[];
}

interface ToastState {
  type: "success" | "error";
  message: string;
}

async function jsonFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replaceAll("-", "+").replaceAll("_", "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.codePointAt(i) ?? 0;
  }
  return outputArray;
}

async function buildQrDataUrl(token: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(token, {
      width: 600,
      margin: 2,
      color: {
        dark: "#090d16",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    });
  } catch (err) {
    console.error("Error generando QR:", err);
    return null;
  }
}

async function fetchRotatedQrPayload(): Promise<string | null> {
  try {
    const res = await fetch("/api/user/qr-payload");
    if (!res.ok) return null;
    const data = await res.json();
    return data?.payload ?? null;
  } catch {
    return null;
  }
}

async function subscribeToWebPush(userId?: string): Promise<{ ok: boolean; error?: string }> {
  if (Capacitor.isNativePlatform()) {
    return { ok: true };
  }

  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator)
  ) {
    return {
      ok: false,
      error: "Las notificaciones web push no están soportadas en este navegador.",
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      error: "Permiso de notificaciones denegado por el navegador.",
    };
  }

  const keyRes = await fetch("/api/notifications/subscribe");
  const { publicKey } = await keyRes.json();
  if (!publicKey) {
    return { ok: false, error: "No se pudo obtener la clave VAPID del servidor." };
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const res = await fetch("/api/notifications/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription,
      userAgent: navigator.userAgent,
    }),
  });

  if (!res.ok) {
    return { ok: false, error: "No se pudo guardar la suscripción push." };
  }

  if (userId) {
    fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        type: "BIENVENIDA",
        title: "Notificaciones Push Activas",
        body: "Recibirás avisos y recordatorios de asistencia en tiempo real.",
      }),
    }).catch(() => {});
  }

  return { ok: true };
}

function detectAttendanceTransition(
  prev: TodayAttendance | null,
  next: TodayAttendance | null
): string | null {
  if (!next) return null;
  if (!prev) {
    if (next.entryTime) return "¡Entrada registrada exitosamente en el Kiosk!";
    return null;
  }
  if (!prev.entryTime && next.entryTime) {
    return "¡Entrada registrada exitosamente en el Kiosk!";
  }
  if (!prev.exitTime && next.exitTime) {
    return "¡Salida registrada exitosamente en el Kiosk!";
  }
  if (!prev.entryTime2 && next.entryTime2) {
    return "¡Retorno de turno registrado en el Kiosk!";
  }
  if (!prev.exitTime2 && next.exitTime2) {
    return "¡Salida final registrada exitosamente en el Kiosk!";
  }
  return null;
}

export default function EmployeeAppPage() {
  const { data: session } = useSession();

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isQrZoomOpen, setIsQrZoomOpen] = useState(false);
  const [isRegeneratingQr, setIsRegeneratingQr] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [mounted, setMounted] = useState(false);

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Push notification state
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);

  // Dynamic QR auto-rotation state (30s timer)
  const [qrSecondsLeft, setQrSecondsLeft] = useState(30);

  // Modals
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false);
  const [selectedCertItem, setSelectedCertItem] = useState<HistoryItem | null>(null);

  const prevAttendanceRef = useRef<TodayAttendance | null>(null);
  const hasInitializedAttendanceRef = useRef(false);

  const showToast = (type: "success" | "error", message: string, duration = 4000) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, duration);
  };

  // SWR Data Fetching (loads profile, history & requests immediately on mount)
  const {
    data: meData,
    isLoading: isLoadingProfile,
    mutate: mutateMe,
  } = useSWR<MeResponse>("/api/user/me", jsonFetcher, {
    refreshInterval: 5000,
    refreshWhenHidden: false,
    revalidateOnFocus: true,
  });

  const {
    data: historyData,
    isLoading: isLoadingHistory,
    isValidating: isValidatingHistory,
    mutate: mutateHistory,
  } = useSWR<HistoryResponse>("/api/user/history", jsonFetcher, {
    revalidateOnFocus: false,
  });

  const {
    data: requestsData,
    isLoading: isLoadingRequests,
    isValidating: isValidatingRequests,
    mutate: mutateRequests,
  } = useSWR<TimeOffResponse>("/api/user/time-off", jsonFetcher, {
    revalidateOnFocus: false,
  });

  const profile = meData?.user ?? null;
  const todayAttendance = meData?.todayAttendance ?? null;
  const historyItems = historyData?.history ?? [];
  const historyMetrics = historyData?.metrics ?? null;
  const myRequests = requestsData?.requests ?? [];

  // Initialize QR when profile loads/changes
  useEffect(() => {
    if (!profile?.qrToken) return;
    const payload = profile.signedQrPayload || profile.qrToken;
    void buildQrDataUrl(payload).then((url) => {
      if (url) setQrDataUrl(url);
    });
  }, [profile?.qrToken, profile?.signedQrPayload]);

  // Detect any Kiosk attendance transition (entry, exit, split-shift) and refresh history
  useEffect(() => {
    if (!meData) return;
    if (!hasInitializedAttendanceRef.current) {
      hasInitializedAttendanceRef.current = true;
      prevAttendanceRef.current = todayAttendance;
      return;
    }

    const transitionMsg = detectAttendanceTransition(
      prevAttendanceRef.current,
      todayAttendance
    );
    prevAttendanceRef.current = todayAttendance;

    if (transitionMsg) {
      showToast("success", transitionMsg, 4500);
      void mutateHistory();
    }
  }, [meData, todayAttendance, mutateHistory]);

  // Browser environment setup (online/offline, SW, PWA install, Push permission)
  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if ("Notification" in window && Notification.permission === "granted") {
      setPushSubscribed(true);
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("[PWA] Error SW:", err));
    }

    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
    };
  }, []);

  // Dynamic QR auto-rotation effect every 30 seconds
  useEffect(() => {
    if (!profile?.qrToken) return;

    const rotateQr = async () => {
      const payload = await fetchRotatedQrPayload();
      if (!payload) return;
      const url = await buildQrDataUrl(payload);
      if (url) setQrDataUrl(url);
    };

    const timer = setInterval(() => {
      setQrSecondsLeft((prev) => {
        if (prev <= 1) {
          void rotateQr();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [profile?.qrToken]);

  const handleSubscribePush = async () => {
    try {
      setIsSubscribingPush(true);
      const result = await subscribeToWebPush(profile?.id);
      if (result.ok) {
        setPushSubscribed(true);
        showToast("success", "Notificaciones push activadas correctamente.");
      } else if (result.error) {
        showToast("error", result.error, 5000);
      }
    } catch (err: any) {
      showToast("error", `Error al activar notificaciones: ${err?.message || "desconocido"}`, 5000);
    } finally {
      setIsSubscribingPush(false);
    }
  };

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const handleRegenerateQr = async () => {
    try {
      setIsRegeneratingQr(true);
      const res = await fetch("/api/user/regenerate-qr", { method: "POST" });
      if (!res.ok) {
        showToast("error", "No se pudo renovar la credencial QR.");
        return;
      }
      const data = await res.json();
      await mutateMe(
        (curr) =>
          curr
            ? {
                ...curr,
                user: {
                  ...curr.user,
                  qrToken: data.qrToken,
                  signedQrPayload: data.signedQrPayload,
                },
              }
            : curr,
        false
      );
      const payload = data.signedQrPayload || data.qrToken;
      const url = await buildQrDataUrl(payload);
      if (url) setQrDataUrl(url);
      setQrSecondsLeft(30);
      showToast("success", "¡Credencial QR renovada con firma HMAC-SHA256!", 3500);
    } catch {
      showToast("error", "Error de conexión al regenerar el QR.");
    } finally {
      setIsRegeneratingQr(false);
    }
  };

  const isPushGranted =
    pushSubscribed ||
    (mounted &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted");

  return (
    <div className="min-h-screen font-sans antialiased relative overflow-x-hidden selection:bg-primary-500 selection:text-black flex flex-col transition-colors duration-200 bg-surface-50 dark:bg-command-bg text-surface-900 dark:text-surface-200">
      {/* Background ambient lighting */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden hidden dark:block"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-primary-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[50%] right-[-10%] w-[500px] h-[500px] bg-primary-900/10 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary-700/10 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px] opacity-70" />
      </div>

      {/* Accessible Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl text-white text-xs font-bold shadow-2xl backdrop-blur-md border max-w-[90%] ${
            toast.type === "error"
              ? "bg-danger-600/95 border-danger-400/40"
              : "bg-primary-600/95 border-primary-400/40"
          }`}
        >
          {toast.type === "error" ? (
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="relative z-10 flex flex-col flex-1">
        <PortalHeader
          profile={profile}
          sessionName={session?.user?.name}
          sessionImage={session?.user?.image}
          isOnline={isOnline}
          mounted={mounted}
          isLoadingProfile={isLoadingProfile}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 pb-16 space-y-5 sm:space-y-6">
          {/* Welcome Greeting Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-surface-200/70 dark:border-white/10">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                {getGreeting()},{" "}
                <span className="text-primary-600 dark:text-primary-400">
                  {profile?.firstName || session?.user?.name?.split(" ")[0] || "Colaborador"}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-0.5">
                {mounted
                  ? new Intl.DateTimeFormat("es-PE", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                      .format(new Date())
                      .replace(/^\w/, (c) => c.toUpperCase())
                  : "Bienvenido a tu portal de asistencia"}
              </p>
            </div>
            <div className="pt-1 sm:pt-0">
              <button
                type="button"
                onClick={() => setIsTimeOffModalOpen(true)}
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-900 hover:bg-surface-800 text-white font-bold text-xs tracking-wide shadow-lg transition active:scale-95 dark:bg-primary-500 dark:hover:bg-primary-400 dark:text-surface-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              >
                <FileText className="w-4 h-4" aria-hidden="true" />
                Reportar Ausencia / Pedir Permiso
              </button>
            </div>
          </div>

          {/* PWA Banner */}
          {isInstallable && (
            <section
              aria-label="Instalar aplicación"
              className="rounded-2xl p-3.5 sm:px-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm bg-primary-50 border border-primary-200 dark:bg-primary-950/25 dark:border-primary-500/30"
            >
              <div className="flex items-center gap-3 text-center sm:text-left">
                <div className="w-10 h-10 rounded-xl bg-primary-500/20 text-primary-700 dark:text-primary-400 border border-primary-500/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary-950 dark:text-white">
                    Instala Presenxa en tu pantalla de inicio
                  </p>
                  <p className="text-xs text-primary-800 dark:text-surface-400">
                    Acceso rápido al código QR incluso con red inestable.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleInstallPwa}
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs tracking-wide shadow-lg transition active:scale-95"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                Instalar PWA
              </button>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Prioritizes Workday Status + QR above the fold on mobile */}
            <div className="lg:col-span-6 xl:col-span-5 flex flex-col gap-5 mx-auto w-full max-w-md lg:max-w-none">
              <WorkdayStatusCard
                profile={profile}
                todayAttendance={todayAttendance}
                isLoading={isLoadingProfile}
              />

              <QrCredentialCard
                profile={profile}
                qrDataUrl={qrDataUrl}
                qrSecondsLeft={qrSecondsLeft}
                isRegeneratingQr={isRegeneratingQr}
                isZoomOpen={isQrZoomOpen}
                onOpenZoom={() => setIsQrZoomOpen(true)}
                onCloseZoom={() => setIsQrZoomOpen(false)}
                onRegenerateQr={handleRegenerateQr}
                isLoading={isLoadingProfile}
              />

              {/* Push Notifications CTA: only shown prominently if not yet granted */}
              {mounted && !isPushGranted && (
                <section
                  aria-label="Activar notificaciones push"
                  className="rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-sm bg-white border border-surface-200 dark:bg-command-card dark:border-white/10"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-info-500/10 border border-info-500/25 text-info-600 dark:text-info-400 shrink-0">
                      <Bell className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-surface-900 dark:text-white">
                        Notificaciones Push
                      </h3>
                      <p className="text-xs text-surface-500 dark:text-surface-400">
                        Activa alertas y recordatorios de asistencia
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSubscribePush}
                    disabled={isSubscribingPush}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs shadow-sm transition active:scale-95 flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                  >
                    <Bell
                      className={`w-3.5 h-3.5 ${isSubscribingPush ? "animate-spin motion-reduce:animate-none" : ""}`}
                      aria-hidden="true"
                    />
                    {isSubscribingPush ? "Activando..." : "Activar"}
                  </button>
                </section>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-6 xl:col-span-7 space-y-6">
              <MonthlyMetricsGrid metrics={historyMetrics} isLoading={isLoadingHistory} />

              {/* Assigned Shift */}
              <section
                aria-label="Programación de turno asignado"
                className="rounded-2xl p-5 border space-y-4 bg-white border-surface-200 shadow-sm dark:bg-command-card dark:border-white/10"
              >
                <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
                      <Calendar className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-surface-900 dark:text-white">
                        Programación de Turno Asignado
                      </h3>
                      <p className="text-xs text-surface-500 dark:text-surface-400">
                        {profile?.schedule?.name || "Sin turno asignado"}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full border text-xs font-semibold bg-surface-100 border-surface-200 text-surface-700 dark:bg-surface-800 dark:border-primary-500/30 dark:text-primary-400">
                    Turno Oficial
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="p-3 rounded-xl border bg-surface-50 border-surface-200 dark:bg-primary-950/20 dark:border-white/10">
                    <span className="text-xs text-surface-500 dark:text-surface-400 block font-medium">
                      Horario de Marcación
                    </span>
                    <div className="text-base font-bold font-mono mt-0.5 text-surface-900 dark:text-white">
                      {profile?.schedule?.entryTime || "--:--"} —{" "}
                      {profile?.schedule?.exitTime || "--:--"}
                    </div>
                    <span className="text-xs text-primary-600 dark:text-primary-400 font-medium block mt-0.5">
                      Tolerancia: {profile?.schedule?.toleranceMinutes ?? 0} min
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border bg-surface-50 border-surface-200 dark:bg-primary-950/20 dark:border-white/10">
                    <span className="text-xs text-surface-500 dark:text-surface-400 block font-medium">
                      Sede Asignada
                    </span>
                    <div className="text-sm font-semibold mt-0.5 truncate text-surface-900 dark:text-white">
                      {profile?.location?.name || "Sin asignar"}
                    </div>
                    <span className="text-xs text-surface-500 dark:text-surface-400 block mt-0.5 truncate">
                      {profile?.organization?.name || "Organización"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border bg-surface-50 border-surface-200 dark:bg-primary-950/20 dark:border-white/10">
                    <span className="text-xs text-surface-500 dark:text-surface-400 block font-medium">
                      Refrigerio / Pausa
                    </span>
                    <div className="text-base font-bold font-mono mt-0.5 text-surface-900 dark:text-white">
                      {profile?.schedule?.isSplit ? "Turno Partido" : "Continuo"}
                    </div>
                    <span className="text-xs text-surface-500 dark:text-surface-400 block mt-0.5">
                      Según contrato
                    </span>
                  </div>
                </div>
              </section>

              <AttendanceHistoryCard
                items={historyItems}
                isLoading={isLoadingHistory || isValidatingHistory}
                onRefresh={() => void mutateHistory()}
                onViewCertificate={(item) => setSelectedCertItem(item)}
              />

              <RequestsInboxCard
                requests={myRequests}
                isLoading={isLoadingRequests || isValidatingRequests}
                onRefresh={() => void mutateRequests()}
              />

              {/* Trust Badge */}
              <div className="p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-surface-50 border-surface-200 text-surface-600 dark:bg-command-card dark:border-white/10 dark:text-surface-400">
                <div className="flex items-center gap-2.5 text-left">
                  <div
                    aria-hidden="true"
                    className={`w-2 h-2 rounded-full ${
                      isOnline ? "bg-primary-500 animate-pulse motion-reduce:animate-none" : "bg-warning-500"
                    }`}
                  />
                  <span>
                    {isOnline ? "Conexión Segura Activa: " : "Modo Offline: "}
                    <strong>Credencial Encriptada</strong> con firma HMAC-SHA256.
                  </span>
                </div>
                <div className="font-mono text-xs text-surface-500 dark:text-surface-400 flex items-center gap-3">
                  <span>QR Ready</span>
                  <span aria-hidden="true">•</span>
                  <span className="text-primary-600 dark:text-primary-400 font-semibold">
                    TLS 1.3 Strict
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="border-t py-4 px-4 text-center text-xs mt-auto bg-white border-surface-200 text-surface-500 dark:bg-command-bg dark:border-white/10 dark:text-surface-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>
              © {new Date().getFullYear()} PRESENXA · Sistema de Control de Asistencia. Todos los
              derechos reservados.
            </p>
            <p className="font-mono text-xs">
              Colaborador ID:{" "}
              <span className="text-primary-600 dark:text-primary-400 font-bold">
                {profile?.documentId || "---"}
              </span>{" "}
              • Tenant: {profile?.organization?.name || "Empresa"}
            </p>
          </div>
        </footer>
      </div>

      <TimeOffRequestModal
        isOpen={isTimeOffModalOpen}
        onClose={() => setIsTimeOffModalOpen(false)}
        onSuccess={() => void mutateRequests()}
      />

      <JustificationCertificateModal
        isOpen={Boolean(selectedCertItem)}
        onClose={() => setSelectedCertItem(null)}
        attendance={
          selectedCertItem
            ? {
                id: selectedCertItem.id,
                userName: profile ? `${profile.firstName} ${profile.lastName}`.trim() : "Colaborador",
                userDocumentId: profile?.documentId,
                userRole: profile?.role,
                locationName: selectedCertItem.locationName,
                date: selectedCertItem.date,
                currentStatus: selectedCertItem.status as AttendanceStatus,
                notes: selectedCertItem.notes,
                statusChangedBy: selectedCertItem.statusChangedBy,
                statusChangedAt: selectedCertItem.statusChangedAt,
                entryTime: selectedCertItem.entryTime,
                exitTime: selectedCertItem.exitTime,
                lateMinutes: selectedCertItem.lateMinutes,
                attachmentUrl: selectedCertItem.attachmentUrl,
              }
            : null
        }
      />
    </div>
  );
}
