"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import QRCode from "qrcode";
import {
  QrCode,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Navigation,
  LogOut,
  Sparkles,
  CheckCircle2,
  XCircle,
  Building2,
  Sun,
  Flame,
  Radio,
  History,
  TrendingUp,
  AlertOctagon,
  Wifi,
  WifiOff,
  Download,
  Database,
  ArrowUpRight,
  Bell,
  BellRing,
  ZoomIn,
  Maximize2,
  X,
} from "lucide-react";
import { useGeofencing } from "@/hooks/useGeofencing";
import { Capacitor } from "@capacitor/core";

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
    geofenceLat: number | null;
    geofenceLng: number | null;
    geofenceRadius: number | null;
    geofencePolygon?: any;
  } | null;
  schedule?: {
    id: string;
    name: string;
    entryTime: string;
    exitTime: string;
    toleranceMinutes: number;
  } | null;
}

interface TodayAttendance {
  id: string;
  date: string;
  entryTime: string | null;
  exitTime: string | null;
  status: string;
  lateMinutes: number | null;
  workedMinutes: number | null;
  notes?: string | null;
}

interface HistoryItem {
  id: string;
  date: string;
  entryTime: string | null;
  exitTime: string | null;
  status: string;
  lateMinutes: number | null;
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
  const [activeTab, setActiveTab] = useState<"qr" | "geo" | "history">("qr");

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [maxBrightness, setMaxBrightness] = useState(false);
  const [isQrZoomOpen, setIsQrZoomOpen] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isRegeneratingQr, setIsRegeneratingQr] = useState(false);
  const [qrSuccessToast, setQrSuccessToast] = useState<string | null>(null);

  // History state
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyMetrics, setHistoryMetrics] = useState<HistoryMetrics | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Mounted flag to avoid SSR hydration mismatches
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const geofenceTarget = useMemo(() => {
    if (!profile?.location?.geofenceLat || !profile?.location?.geofenceLng) return null;
    return {
      lat: profile.location.geofenceLat,
      lng: profile.location.geofenceLng,
      radius: profile.location.geofenceRadius || 100,
    };
  }, [
    profile?.location?.geofenceLat,
    profile?.location?.geofenceLng,
    profile?.location?.geofenceRadius,
  ]);

  // El rastreo solo se activa durante la jornada laboral activa (desde que marca entrada hasta que marca salida)
  const isShiftActive = Boolean(
    todayAttendance?.entryTime && !todayAttendance?.exitTime
  );

  const geo = useGeofencing(geofenceTarget, {
    enabled: Boolean(profile?.location && isShiftActive),
    pingIntervalMs: 45000,
  });

  // Register Service Worker & capture install prompt
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[PWA] Service Worker registrado:", reg.scope);
          })
          .catch((err) => {
            console.warn("[PWA] Error al registrar Service Worker:", err);
          });
      }

      window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setIsInstallable(true);
      });
    }
  }, []);

  // Push notification state
  const [pushPermission, setPushPermission] = useState<string>("default");
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);

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

  // Dynamic QR auto-rotation state (30s timer)
  const [qrSecondsLeft, setQrSecondsLeft] = useState(30);

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
            .catch(() => {});
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [profile?.qrToken]);

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

      // Get VAPID public key
      const keyRes = await fetch("/api/notifications/subscribe");
      const { publicKey } = await keyRes.json();
      if (!publicKey) throw new Error("No se pudo obtener la clave VAPID");

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send to server
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
        // Send a test welcome push notification
        if (profile?.id) {
          fetch("/api/notifications/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: profile.id,
              type: "BIENVENIDA",
              title: "🔔 Notificaciones Push Activas",
              body: "Recibirás alertas inmediatas de geocerca y recordatorios de asistencia.",
            }),
          }).catch(() => {});
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

  return (
    <div
      className={`min-h-screen text-slate-100 flex flex-col transition-colors duration-300 ${
        maxBrightness ? "bg-white text-slate-900" : "bg-[#090d16]"
      }`}
    >
      {/* Background ambient lighting */}
      {!maxBrightness && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-15%] left-[20%] w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] rounded-full bg-pink-600/10 blur-[120px]" />
        </div>
      )}

      {/* Toast Notification */}
      {qrSuccessToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/90 text-white text-xs font-bold shadow-2xl shadow-emerald-950/80 backdrop-blur-md animate-[slide-up_0.2s_ease-out] border border-emerald-400/40 max-w-[90%]">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{qrSuccessToast}</span>
        </div>
      )}

      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/10 px-4 py-3 bg-slate-950/80">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/25">
              {profile?.firstName?.[0] || session?.user?.name?.[0] || "U"}
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">
                {profile ? `${profile.firstName} ${profile.lastName}` : "Cargando..."}
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] text-indigo-300/80 font-medium">
                <span>{profile?.role || "EMPLEADO"}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  {mounted && geo.isOnline ? (
                    <span className="text-emerald-400 flex items-center gap-0.5">
                      <Wifi className="w-3 h-3" /> Online
                    </span>
                  ) : mounted && !geo.isOnline ? (
                    <span className="text-amber-400 flex items-center gap-0.5 font-bold animate-pulse">
                      <WifiOff className="w-3 h-3" /> Offline
                    </span>
                  ) : (
                    <span className="text-emerald-400/70 flex items-center gap-0.5">
                      <Wifi className="w-3 h-3" /> Online
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* GPS Pulse */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                mounted && geo.isInside === true
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : mounted && geo.isInside === false
                  ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
              title="Estado de Geocerca"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  mounted && geo.isInside === true
                    ? "bg-emerald-400 animate-pulse"
                    : mounted && geo.isInside === false
                    ? "bg-rose-400 animate-ping"
                    : "bg-slate-500"
                }`}
              />
              <span>
                {mounted && geo.isInside === true
                  ? "En Sede"
                  : mounted && geo.isInside === false
                  ? "Fuera"
                  : "GPS..."}
              </span>
            </div>

            {/* Logout */}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Offline Sync Banner if pending pings exist */}
      {geo.pendingOfflinePings > 0 && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-200 z-30">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>{geo.pendingOfflinePings}</strong> pings GPS en cola local (IndexedDB)
              </span>
            </div>
            {geo.isOnline && (
              <button
                onClick={() => geo.flushOfflinePings()}
                disabled={geo.isFlushingOfflineQueue}
                className="px-2 py-0.5 rounded-lg bg-amber-500/30 hover:bg-amber-500/40 text-amber-100 font-bold border border-amber-500/40 flex items-center gap-1 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${geo.isFlushingOfflineQueue ? "animate-spin" : ""}`} />
                <span>Sincronizar</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* PWA Install Banner */}
      {isInstallable && (
        <div
          className="px-4 py-2.5 text-xs text-emerald-100 z-30"
          style={{
            background: "linear-gradient(90deg, rgba(22,163,74,0.3) 0%, rgba(13,148,136,0.2) 100%)",
            borderBottom: "1px solid rgba(34,197,94,0.2)",
          }}
        >
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-lime-400 shrink-0" />
              <span>Instala Presenxa en tu pantalla de inicio</span>
            </div>
            <button
              onClick={handleInstallPwa}
              className="px-3 py-1 rounded-xl gradient-brand text-slate-950 font-bold text-[11px] shadow-lg shadow-lime-950/40 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar PWA</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-md mx-auto w-full p-4 pb-24 z-10 flex flex-col">
        {/* TAB 1: DIGITAL QR CREDENTIAL */}
        {activeTab === "qr" && (
          <div className="space-y-4 flex-1 flex flex-col">
            {/* Today status pill */}
            <div
              className="p-4 rounded-2xl border backdrop-blur-md"
              style={{
                background: "rgba(11, 20, 13, 0.75)",
                borderColor: "rgba(34, 197, 94, 0.15)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Asistencia de Hoy</span>
                    <span className="text-sm font-bold text-white">
                      {todayAttendance?.entryTime
                        ? `Entrada: ${todayAttendance.entryTime}`
                        : "Pendiente de Entrada"}
                    </span>
                  </div>
                </div>

                {todayAttendance?.status && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      todayAttendance.status === "PRESENTE"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : todayAttendance.status === "TARDE"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-slate-800 text-slate-300 border border-slate-700"
                    }`}
                  >
                    {todayAttendance.status}
                  </span>
                )}
              </div>
            </div>

            {/* Push Notification Card */}
            <div
              className="p-3.5 rounded-2xl border backdrop-blur-md flex items-center justify-between"
              style={{
                background: "rgba(16, 42, 67, 0.85)",
                borderColor: "rgba(163, 230, 53, 0.15)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    geo.isNative || pushSubscribed || (mounted && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted")
                      ? "bg-lime-400/20 text-lime-400 border border-lime-400/30"
                      : "bg-white/10 text-slate-400"
                  }`}
                >
                  {geo.isNative || pushSubscribed || (mounted && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") ? (
                    <BellRing className="w-4 h-4 text-lime-400" />
                  ) : (
                    <Bell className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    {geo.isNative
                      ? "Alertas Nativas Activas"
                      : pushSubscribed || (mounted && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted")
                      ? "Alertas Push Activas"
                      : "Notificaciones Push"}
                  </span>
                  <span className="text-[10px] text-slate-300">
                    {geo.isNative
                      ? "Servicio de geocerca integrado en Android"
                      : pushSubscribed || (mounted && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted")
                      ? "Recibirás avisos de geocerca en tiempo real"
                      : "Activa alertas de geocerca y recordatorios"}
                  </span>
                </div>
              </div>

              {geo.isNative || pushSubscribed || (mounted && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") ? (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-lime-400/20 text-lime-300 border border-lime-400/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-lime-400" />
                  <span>Activo</span>
                </span>
              ) : (
                <button
                  onClick={handleSubscribePush}
                  disabled={isSubscribingPush}
                  className="px-3 py-1.5 rounded-xl gradient-brand text-slate-950 font-bold text-xs shadow-lg shadow-lime-950/40 transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                >
                  <Bell className={`w-3.5 h-3.5 ${isSubscribingPush ? "animate-spin" : ""}`} />
                  <span>{isSubscribingPush ? "Activando..." : "Activar"}</span>
                </button>
              )}
            </div>

            {/* GPS Security Alert Banner */}
            {isShiftActive && (geo.isGpsRevoked || geo.isGpsDisabled) && (
              <div className="p-4 rounded-2xl border border-rose-500/40 bg-rose-950/40 text-rose-200 backdrop-blur-md animate-pulse">
                <div className="flex items-start gap-3">
                  <AlertOctagon className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      {geo.isGpsRevoked ? "⚠️ Permiso de Ubicación Desactivado" : "⚠️ Sensor GPS No Disponible"}
                    </h4>
                    <p className="text-[11px] text-rose-300 mt-1 leading-relaxed">
                      Tu turno laboral está activo y requiere supervisión de geocerca continua. Se ha emitido un reporte de seguridad a tus supervisores. Reactiva la ubicación para mantener tu asistencia al día.
                    </p>
                    <button
                      onClick={() => geo.sendManualPing()}
                      className="mt-2.5 px-3 py-1 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reintentar Conexión GPS</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* QR Card */}
            <div
              className={`p-6 rounded-3xl border shadow-2xl flex flex-col items-center text-center relative overflow-hidden transition-all duration-300 ${
                maxBrightness
                  ? "bg-white text-slate-950 border-slate-300 shadow-slate-300/50"
                  : "border-white/10 backdrop-blur-2xl shadow-emerald-950/40"
              }`}
              style={
                !maxBrightness
                  ? {
                      background: "rgba(11, 20, 13, 0.9)",
                      borderColor: "rgba(34, 197, 94, 0.15)",
                    }
                  : undefined
              }
            >
              {/* Header inside card */}
              <div className="w-full flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="text-left">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block">
                    Credencial Digital
                  </span>
                  <span className={`text-xs font-semibold ${maxBrightness ? "text-slate-800" : "text-slate-200"}`}>
                    {profile?.location?.name || "Sede Asignada"}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setMaxBrightness(!maxBrightness)}
                    className={`p-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1 cursor-pointer ${
                      maxBrightness
                        ? "bg-slate-900 text-white border-slate-800"
                        : "bg-white/10 text-slate-300 border-white/10 hover:bg-white/20"
                    }`}
                    title="Ajustar brillo de escaneo"
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>{maxBrightness ? "Normal" : "Brillo"}</span>
                  </button>
                </div>
              </div>

              {/* QR Image Box with Zoom Trigger */}
              <div
                onClick={() => setIsQrZoomOpen(true)}
                onContextMenu={(e) => e.preventDefault()}
                className="relative group p-4 rounded-3xl bg-white shadow-xl flex flex-col items-center justify-center my-2 ring-2 ring-emerald-500/20 hover:ring-emerald-400 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 select-none"
                title="Toca para ampliar el código QR a pantalla completa"
              >
                {qrDataUrl ? (
                  <>
                    <img
                      src={qrDataUrl}
                      alt="Código QR de Asistencia"
                      onContextMenu={(e) => e.preventDefault()}
                      draggable={false}
                      className="w-56 h-56 md:w-64 md:h-64 object-contain rounded-xl select-none pointer-events-none"
                    />
                    {/* Floating Zoom Badge */}
                    <div className="mt-2.5 px-3 py-1 rounded-full bg-slate-900/90 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5 shadow-md group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors select-none">
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>Toca para ampliar QR</span>
                    </div>
                  </>
                ) : (
                  <div className="w-56 h-56 flex flex-col items-center justify-center text-slate-400 select-none">
                    <RefreshCw className="w-8 h-8 animate-spin mb-2 text-emerald-500" />
                    <span className="text-xs">Generando QR...</span>
                  </div>
                )}
              </div>

              {/* Dynamic QR Security Indicator with Countdown */}
              <div
                className={`w-full mt-3 p-3 rounded-2xl border transition-all flex flex-col gap-2 ${
                  maxBrightness
                    ? "bg-slate-100 border-slate-200"
                    : "bg-emerald-500/10 border-emerald-500/25"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className={`w-4 h-4 ${maxBrightness ? "text-emerald-600" : "text-emerald-400"}`} />
                    <span className={`text-[11px] font-bold ${maxBrightness ? "text-slate-800" : "text-emerald-300"}`}>
                      QR Dinámico Anti-Capturas
                    </span>
                  </div>
                  <div className={`flex items-center gap-1 font-mono text-[11px] font-bold ${maxBrightness ? "text-slate-700" : "text-emerald-400"}`}>
                    <Clock className="w-3 h-3" />
                    <span>{qrSecondsLeft}s</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${maxBrightness ? "bg-slate-300" : "bg-white/10"}`}>
                  <div
                    className="h-full bg-emerald-500 transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${(qrSecondsLeft / 30) * 100}%` }}
                  />
                </div>
              </div>

              {/* User details footer */}
              <div className="w-full mt-3 space-y-1.5">
                <p className={`text-xs font-mono font-bold ${maxBrightness ? "text-slate-900" : "text-slate-200"}`}>
                  DNI: {profile?.documentId || "No registrado"}
                </p>
                <p className={`text-[11px] leading-tight ${maxBrightness ? "text-slate-600" : "text-slate-400"}`}>
                  Muestra este código frente al Kiosk de la entrada para registrar tu ingreso o salida.
                </p>
              </div>

              {/* Regenerate Action */}
              <div className="mt-4 w-full pt-3 border-t border-white/10 flex justify-center">
                <button
                  onClick={handleRegenerateQr}
                  disabled={isRegeneratingQr}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 font-medium transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingQr ? "animate-spin" : ""}`} />
                  <span>Regenerar código QR seguro</span>
                </button>
              </div>
            </div>

            {/* FULLSCREEN QR ZOOM MODAL */}
            {isQrZoomOpen && (
              <div
                className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-[fade-in_0.2s_ease-out]"
                onClick={() => setIsQrZoomOpen(false)}
              >
                {/* Close Button Floating */}
                <div className="absolute top-6 right-6 z-10 flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMaxBrightness(!maxBrightness);
                    }}
                    className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors cursor-pointer flex items-center gap-2 text-xs font-semibold"
                  >
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="hidden sm:inline">Modo Brillo</span>
                  </button>
                  <button
                    onClick={() => setIsQrZoomOpen(false)}
                    className="p-3 rounded-2xl bg-white/10 hover:bg-rose-500 text-white border border-white/15 hover:border-rose-500 transition-colors cursor-pointer"
                    title="Cerrar vista ampliada"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Main Zoom Card Container */}
                <div
                  className="w-full max-w-sm sm:max-w-md rounded-3xl p-6 sm:p-8 bg-white text-slate-950 shadow-2xl shadow-emerald-500/20 flex flex-col items-center text-center animate-[scale-up_0.2s_ease-out]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* User info banner */}
                  <div className="w-full mb-3">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                      Presenxa ID · Credencial Digital
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                      {profile?.firstName} {profile?.lastName}
                    </h2>
                    <p className="text-xs text-slate-600 font-semibold mt-0.5">
                      {profile?.role} {profile?.documentId ? `· DNI: ${profile.documentId}` : ""}
                    </p>
                  </div>

                  {/* Giant High-Contrast QR Code */}
                  <div className="p-3 sm:p-4 rounded-2xl bg-white ring-4 ring-slate-900/10 shadow-inner my-2 w-full flex items-center justify-center">
                    {qrDataUrl && (
                      <img
                        src={qrDataUrl}
                        alt="Código QR Gigante"
                        className="w-72 h-72 sm:w-80 sm:h-80 object-contain rounded-lg"
                      />
                    )}
                  </div>

                  {/* Instructions */}
                  <div className="w-full mt-3 space-y-1">
                    <p className="text-xs font-bold text-slate-900">
                      Acerca este código a la cámara del Kiosk
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {profile?.location?.name ? `Sede: ${profile.location.name}` : "Presenxa Smart Attendance"}
                    </p>
                  </div>

                  <button
                    onClick={() => setIsQrZoomOpen(false)}
                    className="w-full mt-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-black/30 flex items-center justify-center gap-2"
                  >
                    <span>Cerrar Pantalla Completa</span>
                  </button>
                </div>
              </div>
            )}

            {/* Schedule Callout */}
            {profile?.schedule && (
              <div
                className="p-4 rounded-2xl border backdrop-blur-md flex items-center justify-between text-xs"
                style={{
                  background: "rgba(11, 20, 13, 0.75)",
                  borderColor: "rgba(34, 197, 94, 0.12)",
                }}
              >
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>
                    Turno: <strong>{profile.schedule.name}</strong>
                  </span>
                </div>
                <span className="font-mono font-bold text-emerald-300">
                  {profile.schedule.entryTime} - {profile.schedule.exitTime}
                </span>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIVE GEOFENCING & GPS RADAR */}
        {activeTab === "geo" && (
          <div className="space-y-4">
            {/* Status Radar Card */}
            <div
              className={`p-6 rounded-3xl border relative overflow-hidden backdrop-blur-xl transition-all ${
                geo.isInside === true
                  ? "bg-emerald-950/30 border-emerald-500/30"
                  : geo.isInside === false
                  ? "bg-rose-950/40 border-rose-500/40 shadow-rose-900/20 shadow-2xl"
                  : "bg-slate-900/60 border-white/10"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2.5 rounded-2xl ${
                      geo.isInside === true
                        ? "bg-emerald-500/20 text-emerald-400"
                        : geo.isInside === false
                        ? "bg-rose-500/20 text-rose-400 animate-pulse"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Monitoreo Satelital en Vivo</h2>
                    <p className="text-[11px] text-slate-400">Validación con PostGIS y GPS</p>
                  </div>
                </div>

                <button
                  onClick={() => geo.sendManualPing()}
                  disabled={geo.isSendingPing}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Enviar ping manual"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${geo.isSendingPing ? "animate-spin" : ""}`} />
                  <span>Ping GPS</span>
                </button>
              </div>

              {/* Status Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-center gap-3 my-3 ${
                  geo.isInside === true
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                    : geo.isInside === false
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-200"
                    : "bg-slate-800/60 border-slate-700 text-slate-300"
                }`}
              >
                {geo.isInside === true ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                ) : geo.isInside === false ? (
                  <AlertOctagon className="w-6 h-6 text-rose-400 shrink-0 animate-bounce" />
                ) : (
                  <Navigation className="w-6 h-6 text-slate-400 shrink-0 animate-spin" />
                )}

                <div>
                  <h3 className="text-sm font-bold">
                    {geo.isInside === true
                      ? "Dentro del Perímetro Autorizado"
                      : geo.isInside === false
                      ? "Fuera del Perímetro Asignado"
                      : "Obteniendo Coordenadas GPS..."}
                  </h3>
                  <p className="text-[11px] opacity-80 leading-snug">
                    {geo.isInside === true
                      ? "Tu presencia en la sede está confirmada y activa."
                      : geo.isInside === false
                      ? "Regresa al perímetro de la sede para evitar registro de abandono."
                      : "Asegúrate de conceder permisos de ubicación."}
                  </p>
                </div>
              </div>

              {/* Grace Period Countdown Box */}
              {geo.gracePeriodSecondsRemaining !== null && geo.gracePeriodSecondsRemaining > 0 && (
                <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-300">
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
                      Tiempo de Tolerancia (Grace Period):
                    </span>
                    <span className="font-mono text-base font-extrabold text-white">
                      {Math.floor(geo.gracePeriodSecondsRemaining / 60)}:
                      {String(geo.gracePeriodSecondsRemaining % 60).padStart(2, "0")} min
                    </span>
                  </div>
                  <div className="w-full bg-rose-950/80 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-400 to-rose-500 h-full transition-all duration-1000"
                      style={{
                        width: `${Math.min(
                          100,
                          (geo.gracePeriodSecondsRemaining / (10 * 60)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Telemetry Metrics Grid */}
              <div className="grid grid-cols-2 gap-2.5 mt-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 font-medium block">Distancia a la Sede</span>
                  <span className="text-sm font-bold text-white font-mono">
                    {geo.distanceToVenue !== null ? `${geo.distanceToVenue} metros` : "Calculando..."}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 font-medium block">Radio Geocerca</span>
                  <span className="text-sm font-bold text-emerald-300 font-mono">
                    {profile?.location?.geofenceRadius || 150} m
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 font-medium block">Precisión GPS</span>
                  <span className="text-sm font-bold text-slate-200 font-mono">
                    {geo.accuracy ? `±${Math.round(geo.accuracy)} m` : "Normal"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 font-medium block">Último Ping</span>
                  <span className="text-sm font-bold text-slate-200 font-mono">
                    {geo.lastPingTime || "Esperando..."}
                  </span>
                </div>
              </div>

              {/* Sede Info */}
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-slate-400">
                <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">
                  {profile?.location?.name}: {profile?.location?.address}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ATTENDANCE HISTORY & STATS */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {/* KPI Metrics */}
            {historyMetrics && (
              <div className="grid grid-cols-3 gap-2.5">
                <div
                  className="p-3 rounded-2xl border text-center"
                  style={{
                    background: "rgba(11, 20, 13, 0.8)",
                    borderColor: "rgba(34, 197, 94, 0.12)",
                  }}
                >
                  <span className="text-[10px] text-slate-400 font-medium block">Puntualidad</span>
                  <span className="text-lg font-extrabold text-emerald-400">
                    {historyMetrics.punctualityRate}%
                  </span>
                </div>

                <div
                  className="p-3 rounded-2xl border text-center"
                  style={{
                    background: "rgba(11, 20, 13, 0.8)",
                    borderColor: "rgba(34, 197, 94, 0.12)",
                  }}
                >
                  <span className="text-[10px] text-slate-400 font-medium block">Asistencias</span>
                  <span className="text-lg font-extrabold text-emerald-400">
                    {historyMetrics.presents}
                  </span>
                </div>

                <div
                  className="p-3 rounded-2xl border text-center"
                  style={{
                    background: "rgba(11, 20, 13, 0.8)",
                    borderColor: "rgba(34, 197, 94, 0.12)",
                  }}
                >
                  <span className="text-[10px] text-slate-400 font-medium block">Tardanzas</span>
                  <span className="text-lg font-extrabold text-amber-400">
                    {historyMetrics.lates}
                  </span>
                </div>
              </div>
            )}

            {/* Attendance list */}
            <div
              className="p-4 rounded-3xl border backdrop-blur-xl space-y-3"
              style={{
                background: "rgba(11, 20, 13, 0.8)",
                borderColor: "rgba(34, 197, 94, 0.12)",
              }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-400" />
                  <span>Historial de Asistencia (Últimos 30 días)</span>
                </h3>
                <button
                  onClick={loadHistory}
                  className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Actualizar historial"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? "animate-spin" : ""}`} />
                </button>
              </div>

              {isLoadingHistory ? (
                <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                  <span>Cargando historial...</span>
                </div>
              ) : historyItems.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No hay registros de asistencia en los últimos 30 días.
                </div>
              ) : (
                <div className="space-y-2">
                  {historyItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs hover:border-white/10 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-white block">{item.date}</span>
                        <span className="text-[11px] text-slate-400">
                          {item.entryTime ? `Entrada: ${item.entryTime}` : "Sin entrada"}
                          {item.exitTime ? ` • Salida: ${item.exitTime}` : ""}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.lateMinutes && item.lateMinutes > 0 ? (
                          <span className="text-[10px] font-mono text-amber-400 font-semibold">
                            +{item.lateMinutes}m
                          </span>
                        ) : null}

                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            item.status === "PRESENTE"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : item.status === "TARDE"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : item.status === "ABANDONO_PUESTO"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Floating Navigation Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-2xl py-2 px-4"
        style={{
          background: "rgba(5, 10, 6, 0.92)",
          borderTop: "1px solid rgba(22, 163, 74, 0.12)",
        }}
      >
        <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
          <button
            onClick={() => setActiveTab("qr")}
            className={`py-2 px-3 rounded-2xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === "qr"
                ? "bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <QrCode className="w-5 h-5" />
            <span className="text-[10px]">Mi QR</span>
          </button>

          <button
            onClick={() => setActiveTab("geo")}
            className={`py-2 px-3 rounded-2xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === "geo"
                ? "bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span className="text-[10px]">Geocerca</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`py-2 px-3 rounded-2xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === "history"
                ? "bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px]">Historial</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
