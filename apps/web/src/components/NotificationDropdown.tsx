"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bell,
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

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
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
    return () => clearInterval(interval);
  }, []);

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
        // Mark notification as read and updated
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
      return <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />;
    }
    switch (type) {
      case "SALIDA_PERIMETRO":
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case "ABANDONO_REGISTRADO":
        return <AlertOctagon className="w-4 h-4 text-rose-400" />;
      case "LLEGADA_TARDE":
        return <Clock className="w-4 h-4 text-orange-400" />;
      case "BIENVENIDA":
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
      case "FALTA_REGISTRADA":
        return <XCircle className="w-4 h-4 text-rose-400" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-400" />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Justo ahora";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    return new Date(isoString).toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
        title="Centro de Notificaciones"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center border-2 border-slate-950 animate-pulse shadow-lg shadow-rose-500/50">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown Modal */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-3xl bg-[#0b1210]/95 border border-emerald-500/20 backdrop-blur-2xl shadow-2xl shadow-black/90 z-50 overflow-hidden animate-[slide-up_0.2s_ease-out]">
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Notificaciones</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  {unreadCount} nuevas
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={isLoading}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Marcar todas</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-white/5 scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-400 text-xs">
                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                <p>No tienes notificaciones recientes.</p>
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
                        ? "bg-emerald-950/20 hover:bg-emerald-950/35 border-l-2 border-emerald-500"
                        : "hover:bg-white/5 opacity-80"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 shrink-0 mt-0.5">
                      {getTypeIcon(item.type, item.data)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <h3
                          className={`text-xs font-bold truncate ${
                            isUnread ? "text-white" : "text-slate-300"
                          }`}
                        >
                          {item.title}
                        </h3>
                        <span className="text-[10px] text-slate-500 shrink-0 font-medium">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-snug break-words">
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
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-[11px] flex items-center gap-1 shadow-md shadow-emerald-950/40 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Aprobar</span>
                          </button>
                          <button
                            onClick={() =>
                              handleDniAction(item.id, item.data.attendanceId, "REJECT")
                            }
                            disabled={isLoadingItem}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-semibold text-[11px] flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Rechazar</span>
                          </button>
                        </div>
                      )}

                      {item.user && !isDniApproval && (
                        <p className="text-[10px] text-emerald-400/90 font-medium">
                          {item.user.firstName} {item.user.lastName} ({item.user.role})
                        </p>
                      )}
                    </div>

                    {isUnread && (
                      <button
                        onClick={() => markAsRead(item.id)}
                        className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
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
          <div className="p-2.5 border-t border-white/5 bg-black/40 text-center">
            <span className="text-[11px] text-slate-400 font-medium">
              Presenxa Notificaciones
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
