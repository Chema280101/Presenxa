"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import QRCode from "qrcode";
import {
  QrCode,
  Calendar,
  Clock,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Sparkles,
  CheckCircle2,
  Wifi,
  WifiOff,
  Download,
  Bell,
  BellRing,
  ZoomIn,
  Sun,
  X,
  History,
  FileText,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { PresenxaIcon } from "@/components/ui/PresenxaLogo";
import { TimeOffRequestModal } from "@/components/employee/TimeOffRequestModal";

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  documentId?: string | null;
  photoUrl?: string | null;
  role: string;
  qrToken?: string | null;
  signedQrPayload?: string | null;
  qrGeneratedAt?: string | null;
  organization?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  location?: {
    id: string;
    name: string;
    address: string;
  } | null;
  schedule?: {
    id: string;
    name: string;
    entryTime: string;
    exitTime: string;
    isSplit?: boolean;
    entryTime2?: string | null;
    exitTime2?: string | null;
    toleranceMinutes: number;
    toleranceMinutes2?: number | null;
  } | null;
}

interface TodayAttendance {
  id: string;
  date: string;
  entryTime: string | null;
  exitTime: string | null;
  entryTime2?: string | null;
  exitTime2?: string | null;
  status: string;
  lateMinutes: number | null;
  lateMinutes2?: number | null;
  workedMinutes: number | null;
  notes?: string | null;
}

interface HistoryItem {
  id: string;
  date: string;
  entryTime: string | null;
  exitTime: string | null;
  entryTime2?: string | null;
  exitTime2?: string | null;
  status: string;
  lateMinutes: number | null;
  lateMinutes2?: number | null;
  workedMinutes: number | null;
  locationName: string;
}

interface HistoryMetrics {
  totalDays: number;
  presents: number;
  onTime: number;
  lates: number;
  absences: number;
  punctualityRate: number;
  totalHoursWorked: number;
}

export default function EmployeeAppPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"qr" | "history">("qr");

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isQrZoomOpen, setIsQrZoomOpen] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isRegeneratingQr, setIsRegeneratingQr] = useState(false);
  const [qrSuccessToast, setQrSuccessToast] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // History state
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyMetrics, setHistoryMetrics] = useState<HistoryMetrics | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Push notification state
  const [pushPermission, setPushPermission] = useState<string>("default");
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);

  // Dynamic QR auto-rotation state (30s timer)
  const [qrSecondsLeft, setQrSecondsLeft] = useState(30);

  // Mounted flag to avoid SSR hydration mismatches
  const [mounted, setMounted] = useState(false);
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Buenos días";
    if (hour >= 12 && hour < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      if ("Notification" in window) {
        setPushPermission(Notification.permission);
        if (Notification.permission === "granted") {
          setPushSubscribed(true);
        }
      }

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/sw.js")
          .catch((err) => console.warn("[PWA] Error SW:", err));
      }

      window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setIsInstallable(true);
      });

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // Dynamic QR auto-rotation effect every 30 seconds
  useEffect(() => {
    if (!profile?.qrToken) return;

    const timer = setInterval(() => {
      setQrSecondsLeft((prev) => {
        if (prev <= 1) {
          fetch("/api/user/qr-payload")
            .then((res) => res.json())
            .then((data) => {
              if (data.payload) {
                generateQrCode(data.payload);
              }
            })
            .catch(() => { });
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [profile?.qrToken]);

  // Helper to convert base64 VAPID key
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleSubscribePush = async () => {
    if (Capacitor.isNativePlatform()) {
      setPushSubscribed(true);
      return;
    }

    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator)
    ) {
      alert("Las notificaciones web push no están soportadas en este navegador.");
      return;
    }

    try {
      setIsSubscribingPush(true);
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== "granted") {
        alert("Permiso de notificaciones denegado.");
        return;
      }

      const keyRes = await fetch("/api/notifications/subscribe");
      const { publicKey } = await keyRes.json();
      if (!publicKey) throw new Error("No se pudo obtener la clave VAPID");

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

      if (res.ok) {
        setPushSubscribed(true);
        if (profile?.id) {
          fetch("/api/notifications/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: profile.id,
              type: "BIENVENIDA",
              title: "🔔 Notificaciones Push Activas",
              body: "Recibirás avisos y recordatorios de asistencia en tiempo real.",
            }),
          }).catch(() => { });
        }
      }
    } catch (err: any) {
      console.error("Error al suscribirse a push:", err);
      alert(`Error al activar notificaciones: ${err.message}`);
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

  // Load Profile & Today's Attendance
  const loadProfile = async () => {
    try {
      setIsLoadingProfile(true);
      const res = await fetch("/api/user/me");
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        setTodayAttendance(data.todayAttendance);

        if (data.user?.qrToken) {
          const payload = data.user.signedQrPayload || data.user.qrToken;
          generateQrCode(payload);
        }
      }
    } catch (e) {
      console.error("Error al cargar perfil:", e);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const silentCheckAttendance = async () => {
    try {
      const res = await fetch("/api/user/me");
      if (res.ok) {
        const data = await res.json();
        const newAttendance = data.todayAttendance;
        if (newAttendance && (newAttendance.entryTime || newAttendance.entryTime2)) {
          if (!todayAttendance?.entryTime && newAttendance.entryTime) {
            setTodayAttendance(newAttendance);
            setQrSuccessToast("¡Asistencia registrada exitosamente en el Kiosk!");
            setTimeout(() => setQrSuccessToast(null), 4000);
          }
        }
      }
    } catch (e) {
      // ignore silent errors
    }
  };

  // Generate QR Canvas/DataUrl
  const generateQrCode = async (token: string) => {
    try {
      const url = await QRCode.toDataURL(token, {
        width: 600,
        margin: 2,
        color: {
          dark: "#090d16",
          light: "#ffffff",
        },
        errorCorrectionLevel: "H",
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error("Error generando QR:", err);
    }
  };

  // Regenerate QR Token
  const handleRegenerateQr = async () => {
    try {
      setIsRegeneratingQr(true);
      const res = await fetch("/api/user/regenerate-qr", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setProfile((prev) =>
          prev
            ? {
              ...prev,
              qrToken: data.qrToken,
              signedQrPayload: data.signedQrPayload,
            }
            : null
        );
        const payload = data.signedQrPayload || data.qrToken;
        await generateQrCode(payload);
        setQrSuccessToast("¡Credencial QR renovada con firma HMAC-SHA256!");
        setTimeout(() => setQrSuccessToast(null), 3500);
      }
    } catch (e) {
      console.error("Error regenerando QR:", e);
    } finally {
      setIsRegeneratingQr(false);
    }
  };

  // Load History
  const loadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await fetch("/api/user/history");
      if (res.ok) {
        const data = await res.json();
        setHistoryItems(data.history || []);
        setHistoryMetrics(data.metrics || null);
      }
    } catch (e) {
      console.error("Error al cargar historial:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (activeTab === "history" && historyItems.length === 0) {
      loadHistory();
    }
  }, [activeTab]);

  // Sondeo inteligente: Si está en la pestaña QR y no tiene salida marcada, consultar cada 4 segundos
  useEffect(() => {
    if (activeTab === "qr") {
      const timer = setInterval(() => {
        silentCheckAttendance();
      }, 4000);
    }
  }, [activeTab, todayAttendance]);

  // Escape key handler for fullscreen modal
  useEffect(() => {
    if (!isQrZoomOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsQrZoomOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isQrZoomOpen]);

  // Live Workday Status Calculation
  const isSplitSchedule = Boolean(profile?.schedule?.isSplit);
  const hasEntry1 = Boolean(todayAttendance?.entryTime);
  const hasExit1 = Boolean(todayAttendance?.exitTime);
  const hasEntry2 = Boolean(todayAttendance?.entryTime2);
  const hasExit2 = Boolean(todayAttendance?.exitTime2);

  let workdayState = {
    badgeText: "Pendiente",
    badgeStyle: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
    headline: "Pendiente de Entrada",
    subtext: `Turno: ${profile?.schedule?.entryTime || "--:--"} (Tolerancia: ${profile?.schedule?.toleranceMinutes || 10} min)`,
    timeDisplay: profile?.schedule?.entryTime || "--:--",
    isLive: false,
  };

  if (hasEntry1) {
    if (!isSplitSchedule) {
      if (!hasExit1) {
        workdayState = {
          badgeText: "En Jornada",
          badgeStyle: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
          headline: "En Jornada Laboral",
          subtext: `Entrada registrada a las ${todayAttendance?.entryTime}. Salida prevista: ${profile?.schedule?.exitTime || "--:--"}.`,
          timeDisplay: todayAttendance?.entryTime || "--:--",
          isLive: true,
        };
      } else {
        const workedHrs = todayAttendance?.workedMinutes
          ? `${Math.floor(todayAttendance.workedMinutes / 60)}h ${todayAttendance.workedMinutes % 60}m`
          : "Jornada cumplida";
        workdayState = {
          badgeText: "Finalizado",
          badgeStyle: "bg-slate-100 dark:bg-surface-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-surface-700",
          headline: "Jornada Finalizada",
          subtext: `Salida marcada a las ${todayAttendance?.exitTime} · Total: ${workedHrs}`,
          timeDisplay: todayAttendance?.exitTime || "--:--",
          isLive: false,
        };
      }
    } else {
      if (!hasExit1) {
        workdayState = {
          badgeText: "Turno 1",
          badgeStyle: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
          headline: "Turno Mañana Activo",
          subtext: `Entrada 1 a las ${todayAttendance?.entryTime}. Pausa prevista: ${profile?.schedule?.exitTime || "--:--"}.`,
          timeDisplay: todayAttendance?.entryTime || "--:--",
          isLive: true,
        };
      } else if (!hasEntry2) {
        workdayState = {
          badgeText: "En Pausa",
          badgeStyle: "bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800/40",
          headline: "En Refrigerio / Pausa",
          subtext: `Retorno turno tarde a las ${profile?.schedule?.entryTime2 || "--:--"}.`,
          timeDisplay: todayAttendance?.exitTime || "--:--",
          isLive: false,
        };
      } else if (!hasExit2) {
        workdayState = {
          badgeText: "Turno 2",
          badgeStyle: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
          headline: "Turno Tarde Activo",
          subtext: `Entrada 2 a las ${todayAttendance?.entryTime2}. Salida final: ${profile?.schedule?.exitTime2 || "--:--"}.`,
          timeDisplay: todayAttendance?.entryTime2 || "--:--",
          isLive: true,
        };
      } else {
        const workedHrs = todayAttendance?.workedMinutes
          ? `${Math.floor(todayAttendance.workedMinutes / 60)}h ${todayAttendance.workedMinutes % 60}m`
          : "Jornada cumplida";
        workdayState = {
          badgeText: "Finalizado",
          badgeStyle: "bg-slate-100 dark:bg-surface-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-surface-700",
          headline: "Jornada Finalizada",
          subtext: `Turno completo registrado · Total: ${workedHrs}`,
          timeDisplay: todayAttendance?.exitTime2 || "--:--",
          isLive: false,
        };
      }
    }
  }

  return (
    <div
      className="min-h-screen font-sans antialiased relative overflow-x-hidden selection:bg-emerald-500 selection:text-black flex flex-col transition-colors duration-200 bg-slate-50 dark:bg-command-bg text-slate-900 dark:text-slate-200"
    >
      {/* Background ambient lighting */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0 overflow-hidden hidden dark:block">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-emerald-500/10 rounded-full blur-[140px]"></div>
        <div className="absolute top-[50%] right-[-10%] w-[500px] h-[500px] bg-emerald-900/10 rounded-full blur-[160px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-700/10 rounded-full blur-[150px]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px] opacity-70"></div>
      </div>

      {/* Toast Notification */}
      {qrSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/90 text-white text-xs font-bold shadow-2xl shadow-emerald-950/80 backdrop-blur-md animate-[slide-up_0.2s_ease-out] border border-emerald-400/40 max-w-[90%]">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{qrSuccessToast}</span>
        </div>
      )}

      <div className="relative z-10 flex flex-col flex-1">
        {/* TopBar */}
        <header className="sticky top-0 z-40 border-b px-4 lg:px-8 py-3 transition-colors bg-white/90 border-slate-200 dark:bg-command-bg/80 dark:border-white/5 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            {/* Left: System Identity */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-surface-850 border border-slate-200 dark:border-white/10 p-2 flex items-center justify-center shadow-sm">
                <PresenxaIcon className="w-full h-full" />
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tracking-wide text-slate-900 dark:text-white">PRESENXA</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 tracking-wide">PORTAL</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{profile?.organization?.name || "Cargando..."}</p>
              </div>
            </div>

            {/* Center: Security Badge */}
            <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-full border text-xs shadow-inner bg-slate-100 border-slate-200 text-slate-700 dark:bg-[#10131a]/90 dark:border-white/5 dark:text-slate-300">
              <span className={`w-2 h-2 rounded-full animate-ping ${mounted && isOnline ? "bg-emerald-500 dark:bg-emerald-400" : "bg-amber-500 dark:bg-amber-400"}`}></span>
              <span className="font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
                {mounted && isOnline ? "Kiosk Engine v2.4 • Online" : "Modo Offline Activo"}
              </span>
            </div>

            {/* Right: User Avatar + ThemeToggle */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <ThemeToggle />
              <div className="flex items-center gap-2.5 pl-1.5 pr-3.5 py-1 rounded-xl border transition bg-white dark:bg-command-card border-slate-200 dark:border-white/10 shadow-sm">
                {profile?.photoUrl || session?.user?.image ? (
                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-slate-100 dark:bg-surface-800 ring-1 ring-black/5 dark:ring-white/10">
                    <img
                      src={profile?.photoUrl || session?.user?.image || ""}
                      alt={profile?.firstName || "Usuario"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                    {profile
                      ? `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.toUpperCase() || "U"
                      : session?.user?.name
                      ? session.user.name
                          .split(" ")
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                      : "U"}
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold leading-tight flex items-center gap-1.5 text-slate-900 dark:text-white">
                    {profile?.firstName ? `${profile.firstName} ${profile.lastName || ""}`.trim() : session?.user?.name || "Usuario"}
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1 uppercase">
                    <span>{profile?.role || "COLAB"}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => signOut({ callbackUrl: "/login" })} className="p-2.5 rounded-xl border transition bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border-slate-200 dark:bg-[#181c22]/80 dark:hover:bg-red-500/10 dark:hover:text-red-400 dark:border-white/5 dark:hover:border-red-500/30 dark:text-slate-400" title="Cerrar Sesión">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16 space-y-6">
          {/* Welcome Greeting Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-white/5">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {getGreeting()},{" "}
                <span className="text-emerald-600 dark:text-emerald-400">
                  {profile?.firstName || session?.user?.name?.split(" ")[0] || "Colaborador"}
                </span>{" "}
                👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {mounted
                  ? new Intl.DateTimeFormat("es-PE", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }).format(new Date()).replace(/^\w/, (c) => c.toUpperCase())
                  : "Bienvenido a tu portal de asistencia"}
              </p>
            </div>
            <div className="mt-2 sm:mt-0 pt-1 sm:pt-0 border-t sm:border-0 border-slate-200/50 dark:border-white/5">
              <button 
                onClick={() => setIsTimeOffModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs tracking-wide shadow-lg transition active:scale-95 dark:bg-emerald-500 dark:hover:bg-emerald-400"
              >
                <FileText className="w-4 h-4" />
                Reportar Ausencia / Pedir Permiso
              </button>
            </div>
          </div>

          {/* PWA Banner */}
          {isInstallable && (
            <section className="rounded-2xl p-3.5 sm:px-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-500/30">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-950 dark:text-white">Instala Presenxa en tu pantalla de inicio</p>
                  <p className="text-xs text-emerald-800 dark:text-slate-400">Acceso ultrarrápido al código QR incluso con red inestable o modo avión.</p>
                </div>
              </div>
              <button onClick={handleInstallPwa} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs tracking-wide shadow-lg shadow-emerald-500/25 transition active:scale-95">
                <Download className="w-4 h-4" />
                Instalar PWA
              </button>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-6 xl:col-span-5 flex flex-col gap-5 mx-auto w-full max-w-md lg:max-w-none">

              {/* Asistencia de Hoy - Live Workday Status */}
              <div className="rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm bg-white border border-slate-200 dark:bg-command-card dark:border-emerald-500/20">
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    workdayState.isLive
                      ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-surface-700 text-slate-600 dark:text-slate-400"
                  }`}>
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase font-medium tracking-wider text-slate-500 dark:text-slate-400">Asistencia de Hoy</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${workdayState.badgeStyle}`}>
                        {workdayState.isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                        {workdayState.badgeText}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                      {workdayState.headline}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {workdayState.subtext}
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-white/5 flex sm:flex-col justify-between items-center sm:items-end">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block sm:hidden">Hora clave</span>
                  <span className="text-xs sm:text-sm font-mono px-3 py-1.5 rounded-xl border font-bold bg-slate-100 border-slate-200 text-slate-800 dark:bg-[#181c22] dark:border-white/5 dark:text-slate-200 shadow-inner">
                    {workdayState.timeDisplay}
                  </span>
                </div>
              </div>

              {/* Notificaciones Push */}
              <div className="rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm bg-white border border-slate-200 dark:bg-command-card dark:border-white/5">
                <div className="flex items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${pushSubscribed || (mounted && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-500" : "bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-500"}`}>
                    {pushSubscribed || (mounted && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {pushSubscribed || (mounted && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") ? "Notificaciones Activas" : "Notificaciones Push"}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {pushSubscribed || (mounted && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") ? "Recibiendo alertas de asistencia" : "Activa alertas y recordatorios"}
                    </p>
                  </div>
                </div>
                {!pushSubscribed && !(mounted && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") && (
                  <button onClick={handleSubscribePush} disabled={isSubscribingPush} className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs shadow-sm transition active:scale-95 flex items-center gap-1.5 disabled:opacity-50">
                    <Bell className={`w-3.5 h-3.5 ${isSubscribingPush ? "animate-spin" : ""}`} />
                    {isSubscribingPush ? "Activando..." : "Activar"}
                  </button>
                )}
              </div>

              {/* Credencial Digital */}
              <div className="rounded-3xl p-5 sm:p-6 border relative overflow-hidden transition-colors shadow-sm bg-white border-slate-200 dark:bg-command-card dark:border-emerald-500/30 dark:shadow-[0_0_35px_2px_rgba(16,185,129,0.15)]">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold tracking-widest text-emerald-600 dark:text-emerald-500 uppercase">CREDENCIAL DIGITAL</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    </div>
                    <h2 className="text-base font-bold mt-0.5 text-slate-900 dark:text-white">{profile?.location?.name || "Sede Asignada"}</h2>
                  </div>
                </div>

                <div className="my-5 relative flex flex-col items-center">
                  <div className="relative bg-white p-4 sm:p-5 rounded-2xl shadow-xl border-4 border-slate-200 dark:border-[#10131a] group transition duration-300 cursor-pointer" onClick={() => setIsQrZoomOpen(true)}>
                    <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent z-20 pointer-events-none opacity-90 shadow-[0_0_12px_#10b981] animate-[scanline_2.8s_ease-in-out_infinite_alternate]" style={{ animationName: "scanline" }}>
                      <style>{`@keyframes scanline { 0% { transform: translateY(0%); opacity: 0.8; } 50% { opacity: 1; } 100% { transform: translateY(220px); opacity: 0.8; } }`}</style>
                    </div>
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="QR Code" className="w-64 h-64 sm:w-72 sm:h-72 object-contain select-none pointer-events-none" />
                    ) : (
                      <div className="w-64 h-64 flex flex-col items-center justify-center text-slate-400">
                        <RefreshCw className="w-8 h-8 animate-spin mb-2 text-emerald-500" />
                        <span className="text-xs">Generando QR...</span>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setIsQrZoomOpen(true)} className="mt-3 mx-auto w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-command-bg dark:hover:bg-[#181c22] dark:text-emerald-400 dark:border-emerald-500/30">
                    <ZoomIn className="w-3.5 h-3.5" />
                    Toca para ampliar QR
                  </button>
                </div>

                <div className="mt-4 p-3.5 rounded-2xl border space-y-2 bg-slate-50 border-slate-200 dark:bg-command-card dark:border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 font-semibold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>QR Dinámico Anti-Capturas</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono font-bold text-emerald-600 dark:text-emerald-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{qrSecondsLeft}s</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-[#181c22]">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_8px_#10b981]" style={{ width: `${(qrSecondsLeft / 30) * 100}%` }}></div>
                  </div>
                </div>

                <div className="mt-4 text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md border bg-slate-100 border-slate-200 text-slate-700 dark:bg-[#10131a] dark:border-white/5 dark:text-white">
                    <span className="text-xs font-mono font-bold text-slate-500">DNI:</span>
                    <span className="text-xs font-mono font-extrabold tracking-wider">{profile?.documentId || "---"}</span>
                  </div>
                  <p className="text-xs max-w-xs mx-auto leading-relaxed text-slate-600 dark:text-slate-400">
                    Muestra este código frente al Kiosk de la entrada para registrar tu ingreso o salida.
                  </p>
                  <button onClick={handleRegenerateQr} disabled={isRegeneratingQr} className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-500 hover:text-emerald-500 transition py-1.5 px-3 rounded-lg hover:bg-emerald-500/10">
                    <RefreshCw className={`w-4 h-4 ${isRegeneratingQr ? "animate-spin" : ""}`} />
                    Regenerar código QR seguro
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-6 xl:col-span-7 space-y-6">

              {/* KPIs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Métricas del Mes Actual
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded border font-medium bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">Ciclo Activo</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="rounded-2xl p-4 border flex flex-col justify-between transition bg-white border-slate-200 shadow-sm hover:border-emerald-300 dark:bg-command-card dark:border-white/5 dark:hover:border-emerald-500/30">
                    <span className="text-[11px] font-semibold text-slate-500">Días Asistidos</span>
                    <div className="mt-2">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{historyMetrics?.presents || 0}</span>
                      <span className="text-xs text-slate-500 ml-1">/ {historyMetrics?.totalDays || 0}</span>
                    </div>
                  </div>
                  <div className="rounded-2xl p-4 border flex flex-col justify-between transition bg-white border-slate-200 shadow-sm hover:border-emerald-300 dark:bg-command-card dark:border-white/5 dark:hover:border-emerald-500/30">
                    <span className="text-[11px] font-semibold text-slate-500">Puntualidad</span>
                    <div className="mt-2">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">{historyMetrics?.punctualityRate || 100}%</span>
                    </div>
                  </div>
                  <div className="rounded-2xl p-4 border flex flex-col justify-between transition bg-white border-slate-200 shadow-sm hover:border-emerald-300 dark:bg-command-card dark:border-white/5 dark:hover:border-emerald-500/30">
                    <span className="text-[11px] font-semibold text-slate-500">Tardanzas</span>
                    <div className="mt-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-amber-500 tracking-tight">{historyMetrics?.lates || 0}</span>
                    </div>
                  </div>
                  <div className="rounded-2xl p-4 border flex flex-col justify-between transition bg-white border-slate-200 shadow-sm hover:border-emerald-300 dark:bg-command-card dark:border-white/5 dark:hover:border-emerald-500/30">
                    <span className="text-[11px] font-semibold text-slate-500">Horas Reales</span>
                    <div className="mt-2">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{historyMetrics?.totalHoursWorked || 0}</span>
                      <span className="text-xs text-slate-500 ml-1">hrs</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Turno */}
              <div className="rounded-2xl p-5 border space-y-4 bg-white border-slate-200 shadow-sm dark:bg-command-card dark:border-white/10">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-500">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Programación de Turno Asignado</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{profile?.schedule?.name || "Sin turno asignado"}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full border text-xs font-semibold bg-slate-100 border-slate-200 text-slate-700 dark:bg-[#20252e] dark:border-emerald-500/30 dark:text-emerald-400">Turno Oficial</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="p-3 rounded-xl border bg-slate-50 border-slate-200 dark:bg-emerald-950/20 dark:border-white/5">
                    <span className="text-[11px] text-slate-500 block font-medium">Horario de Marcación</span>
                    <div className="text-base font-bold font-mono mt-0.5 text-slate-900 dark:text-white">{profile?.schedule?.entryTime || "--:--"} — {profile?.schedule?.exitTime || "--:--"}</div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">Tolerancia: {profile?.schedule?.toleranceMinutes || 0} min</span>
                  </div>
                  <div className="p-3 rounded-xl border bg-slate-50 border-slate-200 dark:bg-emerald-950/20 dark:border-white/5">
                    <span className="text-[11px] text-slate-500 block font-medium">Sede & Punto Asignado</span>
                    <div className="text-sm font-semibold mt-0.5 truncate text-slate-900 dark:text-white">{profile?.location?.name || "Sin asignar"}</div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{profile?.organization?.name}</span>
                  </div>
                  <div className="p-3 rounded-xl border bg-slate-50 border-slate-200 dark:bg-emerald-950/20 dark:border-white/5">
                    <span className="text-[11px] text-slate-500 block font-medium">Refrigerio / Pausa</span>
                    <div className="text-base font-bold font-mono mt-0.5 text-slate-900 dark:text-white">
                      {profile?.schedule?.isSplit ? "Turno Partido" : "Continuo"}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Según contrato</span>
                  </div>
                </div>
              </div>

              {/* Historial */}
              <div className="rounded-2xl p-5 border space-y-4 bg-white border-slate-200 shadow-sm dark:bg-command-card dark:border-white/10">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                  <div>
                    <h4 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                      <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Historial de Marcaciones en Kiosk
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Auditoría criptográfica con token verificado</p>
                  </div>
                  <button onClick={loadHistory} className="p-1.5 rounded-lg transition-colors text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10">
                    <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? "animate-spin" : ""}`} />
                  </button>
                </div>

                <div className="space-y-3">
                  {isLoadingHistory ? (
                    <div className="py-4 flex justify-center"><RefreshCw className="w-5 h-5 animate-spin text-emerald-500" /></div>
                  ) : historyItems.length === 0 ? (
                    <div className="py-4 text-center text-sm text-slate-500">No hay registros recientes.</div>
                  ) : (
                    historyItems.slice(0, 3).map((item) => (
                      <div key={item.id} className="p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border-slate-200 hover:border-emerald-300 dark:bg-command-card dark:border-white/5 dark:hover:border-emerald-500/20">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ring-4 ${item.status === 'TARDE' ? 'bg-amber-400 ring-amber-500/20' : 'bg-emerald-400 ring-emerald-500/20'}`}></div>
                          <div>
                            <div className="text-xs font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                              {item.date}
                              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${item.status === 'TARDE' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'}`}>{item.status}</span>
                            </div>
                            <div className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400">{item.locationName}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-mono justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-white/5">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] text-slate-500 block">ENTRADA</span>
                            <span className={`font-bold ${item.status === 'TARDE' ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{item.entryTime || "--:--"}</span>
                          </div>
                          <div className="text-slate-400">→</div>
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] text-slate-500 block">SALIDA</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{item.exitTime || "--:--"}</span>
                          </div>
                          <div className="text-left sm:text-right pl-2 border-l border-slate-200 dark:border-white/10">
                            <span className="text-[10px] text-slate-500 block">TOTAL</span>
                            <span className="font-bold text-slate-800 dark:text-slate-300">{item.workedMinutes ? Math.floor(item.workedMinutes / 60) + 'h ' + (item.workedMinutes % 60) + 'm' : '--'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Trust Badge */}
              <div className="p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50 border-slate-200 text-slate-600 dark:bg-command-card dark:border-white/5 dark:text-slate-400">
                <div className="flex items-center gap-2.5 text-left">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
                  <span>{isOnline ? 'Conexión Segura Activa: ' : 'Modo Offline: '} <strong>Credencial Encriptada</strong> con firma HMAC-SHA256.</span>
                </div>
                <div className="font-mono text-[11px] text-slate-500 flex items-center gap-3">
                  <span>QR Ready</span>
                  <span>•</span>
                  <span className="text-emerald-600 dark:text-emerald-500 font-semibold">TLS 1.3 Strict</span>
                </div>
              </div>

            </div>
          </div>
        </main>

        <footer className="border-t py-4 px-4 text-center text-xs mt-auto bg-white border-slate-200 text-slate-500 dark:bg-command-bg dark:border-white/5 dark:text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© {new Date().getFullYear()} PRESENXA · Sistema de Control de Asistencia. Todos los derechos reservados.</p>
            <p className="font-mono text-[11px]">Colaborador ID: <span className="text-emerald-600 dark:text-emerald-500 font-bold">{profile?.documentId || "---"}</span> • Tenant: {profile?.organization?.name || "Empresa"}</p>
          </div>
        </footer>
      </div>

      {/* FULLSCREEN QR ZOOM MODAL (KIOSK-READY) */}
      {isQrZoomOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-[fade-in_0.2s_ease-out]"
          onClick={() => setIsQrZoomOpen(false)}
        >
          {/* Top action bar */}
          <div className="absolute top-5 sm:top-6 right-5 sm:right-6 z-10 flex items-center gap-3">
            <button
              onClick={() => setIsQrZoomOpen(false)}
              className="p-3 rounded-2xl bg-white/10 hover:bg-rose-500 text-white border border-white/15 hover:border-rose-500 transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-2 text-xs font-semibold"
              title="Cerrar vista ampliada (Esc)"
            >
              <X className="w-5 h-5" />
              <span className="hidden sm:inline">Cerrar (Esc)</span>
            </button>
          </div>

          <div
            className="w-full max-w-sm sm:max-w-md rounded-3xl p-6 sm:p-7 bg-white text-slate-950 shadow-2xl shadow-emerald-500/20 flex flex-col items-center text-center animate-[scale-up_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="w-full mb-2">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] font-mono font-extrabold uppercase tracking-widest text-emerald-700">
                  CREDENCIAL OFICIAL KIOSK
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {profile?.firstName} {profile?.lastName}
              </h2>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                {profile?.role} {profile?.documentId ? `· DNI: ${profile.documentId}` : ""}
              </p>
            </div>

            {/* Kiosk-Ready QR Card with high contrast and scanline */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border-4 border-slate-900 shadow-2xl my-2 w-full flex items-center justify-center relative select-none">
              <div
                className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent z-20 pointer-events-none opacity-90 shadow-[0_0_12px_#10b981] animate-[scanline_2s_ease-in-out_infinite_alternate]"
                style={{ animationName: "scanline" }}
              ></div>
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Código QR de Asistencia"
                  className="w-72 h-72 sm:w-80 sm:h-80 object-contain rounded-lg"
                />
              ) : (
                <div className="w-72 h-72 flex flex-col items-center justify-center text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin mb-2 text-emerald-500" />
                  <span className="text-xs">Cargando credencial...</span>
                </div>
              )}
            </div>

            {/* Dynamic 30s Countdown Timer In Fullscreen */}
            <div className="w-full mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Rotación Anti-Captura</span>
              </div>
              <span className="font-mono font-extrabold text-emerald-700 px-2 py-0.5 rounded bg-emerald-100 border border-emerald-200">
                {qrSecondsLeft}s restantes
              </span>
            </div>

            {/* Scanner Guidance */}
            <div className="w-full mt-3 space-y-0.5">
              <p className="text-xs font-bold text-slate-900">
                Coloca la pantalla a unos 15–20 cm del lector del Kiosk
              </p>
              <p className="text-[11px] text-slate-500">
                {profile?.location?.name ? `Sede Asignada: ${profile.location.name}` : "Presenxa Smart Attendance"}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setIsQrZoomOpen(false)}
              className="w-full mt-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-black/30 flex items-center justify-center gap-2 active:scale-95"
            >
              Cerrar Pantalla Completa
            </button>
          </div>
        </div>
      )}

      <TimeOffRequestModal 
        isOpen={isTimeOffModalOpen}
        onClose={() => setIsTimeOffModalOpen(false)}
      />
    </div>
  );
}
