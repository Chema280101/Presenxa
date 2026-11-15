"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  AlertTriangle,
  AlertOctagon,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/providers/ToastProvider";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: any;
  readAt: string | null;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    photoUrl?: string | null;
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replaceAll("-", "+").replaceAll("_", "/");
  const rawData = globalThis.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationDropdown() {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(true);
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?limit=15");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);

    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator
    ) {
      setPushSupported(true);
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setPushSubscribed(Boolean(sub)))
        .catch(() => setPushSubscribed(false));
    }

    return () => clearInterval(interval);
  }, []);

  const handleEnablePush = async () => {
    try {
      setIsSubscribingPush(true);
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Permiso de notificaciones denegado en el navegador.");
        return;
      }

      const keyRes = await fetch("/api/notifications/subscribe");
      const { publicKey } = await keyRes.json();
      if (!publicKey) {
        toast.error("No se pudo obtener la clave VAPID del servidor.");
        return;
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

      if (res.ok) {
        setPushSubscribed(true);
        toast.success("Alertas Push activadas en este navegador.");
      } else {
        toast.error("No se pudo registrar la suscripción Push.");
      }
    } catch (err) {
      console.error("Error enabling push:", err);
      toast.error("Error al activar notificaciones Push.");
    } finally {
      setIsSubscribingPush(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      setIsLoading(true);
      await fetch("/api/notifications", { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all read:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleDniAction = async (
    notificationId: string,
    attendanceId: string,
    action: "APPROVE" | "REJECT"
  ) => {
    setActionLoading(notificationId);
    try {
      const res = await fetch(`/api/attendance/${attendanceId}/verify-dni`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? {
                  ...n,
                  readAt: new Date().toISOString(),
                  body:
                    action === "APPROVE"
                      ? `✅ APROBADO: ${n.body}`
                      : `❌ RECHAZADO: ${n.body}`,
                  data: { ...n.data, isProcessed: true, decision: action },
                }
              : n
          )
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } else {
        alert(data.error || "No se pudo procesar la verificación");
      }
    } catch (err) {
      console.error("Error verifying DNI mark:", err);
      alert("Error al conectar con el servidor");
    } finally {
      setActionLoading(null);
    }
  };

  const getTypeIcon = (type: string, data?: any) => {
    if (data?.isDniApproval) {
      return <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 animate-pulse" />;
    }
    switch (type) {
      case "SALIDA_PERIMETRO":
        return <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
      case "ABANDONO_REGISTRADO":
        return <AlertOctagon className="w-4 h-4 text-danger-500 dark:text-danger-400" />;
      case "LLEGADA_TARDE":
        return <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
      case "BIENVENIDA":
        return <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" />;
      case "FALTA_REGISTRADA":
        return <XCircle className="w-4 h-4 text-danger-500 dark:text-danger-400" />;
      default:
        return <Bell className="w-4 h-4 text-primary-600 dark:text-primary-400" />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Justo ahora";
    if (diffMins < 60) return `Hace ${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return new Date(isoString).toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className={`relative min-w-11 min-h-11 sm:min-w-9 sm:min-h-9 flex items-center justify-center rounded-xl transition-all duration-150 cursor-pointer shadow-xs border ${
          isOpen
            ? "bg-primary-50 dark:bg-primary-950/50 border-primary-300 dark:border-primary-600/50 text-primary-600 dark:text-primary-400 ring-2 ring-primary-500/20"
            : "bg-surface-100 dark:bg-surface-800/60 border-surface-200 dark:border-surface-700/60 text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white hover:bg-surface-200/80 dark:hover:bg-surface-700/80"
        }`}
        title="Centro de Notificaciones"
        aria-label="Abrir centro de notificaciones"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger-500 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white dark:border-surface-950 shadow-sm animate-pulse motion-reduce:animate-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown Modal */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl sm:rounded-3xl border border-surface-200 dark:border-surface-800 bg-white/95 dark:bg-surface-900/95 backdrop-blur-xl shadow-2xl shadow-surface-950/10 dark:shadow-black/60 z-50 overflow-hidden animate-fade-in-up motion-reduce:animate-none">
          {/* Header */}
          <div className="p-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between bg-surface-50/80 dark:bg-surface-950/50">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-surface-900 dark:text-white uppercase tracking-wider">
                Notificaciones
              </h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 text-[10px] font-bold border border-primary-200 dark:border-primary-800/40">
                  {unreadCount} nuevas
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={isLoading}
                className="text-[11px] text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Marcar todas</span>
              </button>
            )}
          </div>

          {pushSupported && !pushSubscribed && (
            <div className="px-4 py-2.5 bg-primary-50/80 dark:bg-primary-950/40 border-b border-primary-200/70 dark:border-primary-800/40 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px] text-primary-800 dark:text-primary-200 min-w-0">
                <BellRing className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400 shrink-0" />
                <span className="truncate font-medium">Recibe alertas en tiempo real</span>
              </div>
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={isSubscribingPush}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
              >
                {isSubscribingPush ? "Activando..." : "Activar Push"}
              </button>
            </div>
          )}

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-surface-100 dark:divide-surface-800/80 scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center text-surface-400 dark:text-surface-500 text-xs">
                <Bell className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-2 opacity-60" />
                <p className="font-medium">No tienes notificaciones recientes.</p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.readAt;
                const isDniApproval = item.data?.isDniApproval && !item.data?.isProcessed;
                const isLoadingItem = actionLoading === item.id;

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 flex items-start gap-3 transition-colors ${
                      isUnread
                        ? "bg-primary-50/50 dark:bg-primary-950/30 hover:bg-primary-50 dark:hover:bg-primary-950/50 border-l-2 border-primary-500"
                        : "hover:bg-surface-50 dark:hover:bg-surface-800/40 opacity-85"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200/80 dark:border-surface-700/60 shrink-0 mt-0.5 shadow-xs">
                      {getTypeIcon(item.type, item.data)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <h3
                          className={`text-xs font-bold truncate ${
                            isUnread ? "text-surface-900 dark:text-white" : "text-surface-700 dark:text-surface-300"
                          }`}
                        >
                          {item.title}
                        </h3>
                        <span className="text-[10px] text-surface-400 dark:text-surface-500 shrink-0 font-medium font-mono">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>

                      <p className="text-[11px] text-surface-600 dark:text-surface-400 leading-snug break-words">
                        {item.body}
                      </p>

                      {/* Interactive Buttons for DNI verification */}
                      {isDniApproval && item.data?.attendanceId && (
                        <div className="pt-1.5 flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleDniAction(item.id, item.data.attendanceId, "APPROVE")
                            }
                            disabled={isLoadingItem}
                            className="px-3 py-1 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-semibold text-[11px] flex items-center gap-1 shadow-sm transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Aprobar</span>
                          </button>
                          <button
                            onClick={() =>
                              handleDniAction(item.id, item.data.attendanceId, "REJECT")
                            }
                            disabled={isLoadingItem}
                            className="px-3 py-1 rounded-lg bg-danger-50 dark:bg-danger-500/15 hover:bg-danger-100 dark:hover:bg-danger-500/25 text-danger-700 dark:text-danger-300 border border-danger-200 dark:border-danger-500/30 font-semibold text-[11px] flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Rechazar</span>
                          </button>
                        </div>
                      )}

                      {item.user && !isDniApproval && (
                        <p className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold">
                          {item.user.firstName} {item.user.lastName} ({item.user.role})
                        </p>
                      )}

                      {typeof item.data?.url === "string" && !isDniApproval && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isUnread) void markAsRead(item.id);
                            setIsOpen(false);
                            router.push(item.data.url);
                          }}
                          className="text-[10px] font-semibold text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1 cursor-pointer pt-0.5"
                        >
                          <span>Abrir módulo</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {isUnread && (
                      <button
                        onClick={() => markAsRead(item.id)}
                        className="p-1 rounded-lg text-surface-400 hover:text-surface-900 dark:hover:text-white hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors cursor-pointer"
                        title="Marcar como leída"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-surface-200 dark:border-surface-800 bg-surface-50/60 dark:bg-surface-950/60 text-center">
            <span className="text-[10px] text-surface-400 dark:text-surface-500 font-semibold tracking-wider uppercase font-mono">
              Presenxa Live Feed
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
