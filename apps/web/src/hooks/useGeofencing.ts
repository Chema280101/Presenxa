"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import {
  addOfflinePing,
  getOfflinePings,
  clearOfflinePings,
  getOfflinePingsCount,
  OfflinePing,
} from "@/lib/offlineQueue";

interface GeofenceTarget {
  lat: number;
  lng: number;
  radius: number; // in meters
}

interface GeofenceState {
  isTracking: boolean;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  distanceToVenue: number | null; // meters
  isInside: boolean | null;
  status: string | null;
  gracePeriodSecondsRemaining: number | null;
  lastPingTime: string | null;
  error: string | null;
  isSendingPing: boolean;
  isOnline: boolean;
  pendingOfflinePings: number;
  isFlushingOfflineQueue: boolean;
  isNative: boolean;
  isGpsRevoked: boolean;
  isGpsDisabled: boolean;
}

// Haversine formula to compute distance in meters
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function useGeofencing(
  target: GeofenceTarget | null,
  options: { enabled?: boolean; pingIntervalMs?: number } = {}
) {
  const { enabled = true, pingIntervalMs = 45000 } = options;

  const [state, setState] = useState<GeofenceState>({
    isTracking: false,
    latitude: null,
    longitude: null,
    accuracy: null,
    distanceToVenue: null,
    isInside: null,
    status: null,
    gracePeriodSecondsRemaining: null,
    lastPingTime: null,
    error: null,
    isSendingPing: false,
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    pendingOfflinePings: 0,
    isFlushingOfflineQueue: false,
    isNative: false,
    isGpsRevoked: false,
    isGpsDisabled: false,
  });

  const targetRef = useRef<GeofenceTarget | null>(target);
  useEffect(() => {
    targetRef.current = target;
  }, [target?.lat, target?.lng, target?.radius]);

  const watchIdRef = useRef<number | null>(null);
  const lastCoordsRef = useRef<{ lat: number; lng: number; acc: number | null } | null>(null);
  const isSendingRef = useRef(false);
  const lastIncidentReportedRef = useRef<{ type: string; time: number } | null>(null);

  // Helper para reportar incidentes de seguridad al servidor sin saturar
  const reportIncident = useCallback(async (type: "GPS_PERMISSION_REVOKED" | "GPS_DISABLED", reason: string) => {
    const now = Date.now();
    const last = lastIncidentReportedRef.current;
    if (last && last.type === type && now - last.time < 60000) {
      return; // Máximo 1 reporte por minuto por tipo de incidente
    }
    lastIncidentReportedRef.current = { type, time: now };

    try {
      await fetch("/api/geo/incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          reason,
          metadata: {
            isNative: Capacitor.isNativePlatform(),
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Unknown",
          },
        }),
      });
    } catch (err) {
      console.warn("[Geofencing] No se pudo despachar reporte de incidencia GPS:", err);
    }
  }, []);

  // Refresh pending count
  const refreshPendingCount = useCallback(async () => {
    const count = await getOfflinePingsCount();
    setState((s) => ({ ...s, pendingOfflinePings: count }));
  }, []);

  // Flush offline queue when network is restored
  const flushOfflinePings = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    const queued = await getOfflinePings();
    if (queued.length === 0) return;

    setState((s) => ({ ...s, isFlushingOfflineQueue: true }));

    // Enviar en lotes de hasta 50 pings
    const batchSize = 50;
    const sentIds: number[] = [];

    for (let i = 0; i < queued.length; i += batchSize) {
      const chunk = queued.slice(i, i + batchSize);
      const payloadPings = chunk.map((item) => ({
        latitude: item.latitude,
        longitude: item.longitude,
        accuracy: item.accuracy,
        source: item.source || "OFFLINE_SYNC",
        timestamp: item.timestamp,
      }));

      try {
        const res = await fetch("/api/geo/ping/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pings: payloadPings }),
        });

        if (res.ok) {
          chunk.forEach((item) => {
            if (item.id) sentIds.push(item.id);
          });
        } else {
          console.warn("[Geofencing] Falló lote de pings offline:", res.status);
          break;
        }
      } catch (err) {
        console.warn("[Geofencing] Error de red al sincronizar lote offline:", err);
        break;
      }
    }

    if (sentIds.length > 0) {
      await clearOfflinePings(sentIds);
    }

    const remainingCount = await getOfflinePingsCount();
    setState((s) => ({
      ...s,
      isFlushingOfflineQueue: false,
      pendingOfflinePings: remainingCount,
    }));
  }, []);

  // Send ping to Next.js API (which forwards to Python Geo-Worker)
  const sendPing = useCallback(
    async (lat: number, lng: number, acc: number | null, source = "APP") => {
      if (isSendingRef.current) return;
      isSendingRef.current = true;

      setState((s) => ({ ...s, isSendingPing: true, error: null }));

      const currentTarget = targetRef.current;
      const distance =
        currentTarget && currentTarget.lat && currentTarget.lng
          ? calculateDistance(lat, lng, currentTarget.lat, currentTarget.lng)
          : null;

      // If browser is offline, store directly in IndexedDB
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await addOfflinePing({
          latitude: lat,
          longitude: lng,
          accuracy: acc,
          timestamp: new Date().toISOString(),
          source: `${source}_OFFLINE`,
        });

        const pendingCount = await getOfflinePingsCount();

        setState((s) => ({
          ...s,
          isSendingPing: false,
          latitude: lat,
          longitude: lng,
          accuracy: acc,
          distanceToVenue: distance,
          isInside:
            distance !== null ? distance <= (currentTarget?.radius || 100) : s.isInside,
          pendingOfflinePings: pendingCount,
          lastPingTime: `${new Date().toLocaleTimeString()} (Guardado Offline)`,
        }));

        isSendingRef.current = false;
        return;
      }

      try {
        const res = await fetch("/api/geo/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            source,
          }),
        });

        const nowStr = new Date().toLocaleTimeString();

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          // If server error / unreachable, queue offline
          await addOfflinePing({
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            timestamp: new Date().toISOString(),
            source: `${source}_RETRY`,
          });
          const pendingCount = await getOfflinePingsCount();

          setState((s) => ({
            ...s,
            isSendingPing: false,
            lastPingTime: nowStr,
            error: errData.error || "Error al enviar ping, guardado en cola",
            pendingOfflinePings: pendingCount,
          }));
          return;
        }

        const data = await res.json();

        setState((s) => ({
          ...s,
          isSendingPing: false,
          latitude: lat,
          longitude: lng,
          accuracy: acc,
          distanceToVenue: distance,
          isInside:
            data.is_inside ??
            (distance !== null ? distance <= (currentTarget?.radius || 100) : null),
          status: data.status,
          gracePeriodSecondsRemaining: data.grace_period_seconds_remaining ?? null,
          lastPingTime: nowStr,
        }));

        // Flush any previous offline pings if any
        flushOfflinePings();
      } catch (err: any) {
        // Queue to IndexedDB on network failure
        await addOfflinePing({
          latitude: lat,
          longitude: lng,
          accuracy: acc,
          timestamp: new Date().toISOString(),
          source: `${source}_OFFLINE_FAIL`,
        });
        const pendingCount = await getOfflinePingsCount();

        setState((s) => ({
          ...s,
          isSendingPing: false,
          distanceToVenue: distance,
          isInside:
            distance !== null ? distance <= (currentTarget?.radius || 100) : s.isInside,
          pendingOfflinePings: pendingCount,
          error: "Sin conexión con servidor. Guardado en cola local.",
        }));
      } finally {
        isSendingRef.current = false;
      }
    },
    [flushOfflinePings]
  );

  // Manual trigger
  const sendManualPing = useCallback(
    async (customLat?: number, customLng?: number) => {
      if (customLat !== undefined && customLng !== undefined) {
        return sendPing(customLat, customLng, 5.0, "MANUAL");
      }

      if (lastCoordsRef.current) {
        return sendPing(
          lastCoordsRef.current.lat,
          lastCoordsRef.current.lng,
          lastCoordsRef.current.acc,
          "MANUAL"
        );
      }

      if (typeof window !== "undefined" && "geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            sendPing(
              pos.coords.latitude,
              pos.coords.longitude,
              pos.coords.accuracy,
              "MANUAL"
            );
          },
          (err) => {
            setState((s) => ({ ...s, error: `GPS error: ${err.message}` }));
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
    },
    [sendPing]
  );

  // Track online / offline events
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setState((s) => ({ ...s, isOnline: true }));
      flushOfflinePings();
    };

    const handleOffline = () => {
      setState((s) => ({ ...s, isOnline: false }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check for pending pings
    refreshPendingCount();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [flushOfflinePings, refreshPendingCount]);

  // Start watching position (Browser Geolocation + Native Background Geolocation)
  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const isNative = Capacitor.isNativePlatform();
    setState((s) => ({ ...s, isTracking: true, isNative, error: null }));

    let nativeWatcherId: string | null = null;

    if (isNative) {
      // ── MODO NATIVO ANDROID: Servicio de Fondo Persistente ─────────
      try {
        const BackgroundGeolocation = registerPlugin<any>("BackgroundGeolocation");

        BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: "Monitoreo de geocerca laboral activo.",
            backgroundTitle: "Presenxa — Servicio de Asistencia",
            requestPermissions: true,
            stale: false,
            distanceFilter: 15,
          },
          (location: any, error: any) => {
            if (error) {
              if (error.code === "NOT_AUTHORIZED" || error.code === "PERMISSION_DENIED") {
                setState((s) => ({
                  ...s,
                  isGpsRevoked: true,
                  error:
                    "Para el funcionamiento correcto de Presenxa, selecciona 'Permitir todo el tiempo' en Ajustes de Ubicación.",
                }));
                reportIncident("GPS_PERMISSION_REVOKED", "Permiso de ubicación denegado en Android (NOT_AUTHORIZED)");
              }
              return;
            }

            if (location) {
              const { latitude, longitude, accuracy } = location;
              lastCoordsRef.current = { lat: latitude, lng: longitude, acc: accuracy };

              const currentTarget = targetRef.current;
              const distance =
                currentTarget && currentTarget.lat && currentTarget.lng
                  ? calculateDistance(latitude, longitude, currentTarget.lat, currentTarget.lng)
                  : null;

              setState((s) => ({
                ...s,
                latitude,
                longitude,
                accuracy,
                distanceToVenue: distance,
                isInside:
                  distance !== null ? distance <= (currentTarget?.radius || 100) : s.isInside,
                isGpsRevoked: false,
                isGpsDisabled: false,
                error: null,
              }));

              sendPing(latitude, longitude, accuracy, "NATIVE_BACKGROUND");
            }
          }
        ).then((watcherId: string) => {
          nativeWatcherId = watcherId;
        }).catch((err: any) => {
          console.warn("[BackgroundGeolocation] Error iniciando watcher nativo:", err);
        });
      } catch (e) {
        console.warn("No se pudo iniciar BackgroundGeolocation nativo:", e);
      }
    }

    // ── MODO WEB / PWA WATCHER ───────────────────────────────────────
    if ("geolocation" in navigator) {
      const handleSuccess = (position: GeolocationPosition) => {
        const { latitude, longitude, accuracy } = position.coords;
        lastCoordsRef.current = { lat: latitude, lng: longitude, acc: accuracy };

        const currentTarget = targetRef.current;
        const distance =
          currentTarget && currentTarget.lat && currentTarget.lng
            ? calculateDistance(latitude, longitude, currentTarget.lat, currentTarget.lng)
            : null;

        setState((s) => ({
          ...s,
          latitude,
          longitude,
          accuracy,
          distanceToVenue: distance,
          isInside:
            distance !== null ? distance <= (currentTarget?.radius || 100) : s.isInside,
          isGpsRevoked: false,
          isGpsDisabled: false,
          error: null,
        }));
      };

      const handleError = (error: GeolocationPositionError) => {
        let msg = "No se pudo obtener la ubicación.";
        let revoked = false;
        let disabled = false;

        if (error.code === error.PERMISSION_DENIED) {
          msg = "Permiso de ubicación denegado por el usuario.";
          revoked = true;
          reportIncident("GPS_PERMISSION_REVOKED", "Permiso de ubicación denegado en navegador Web/PWA");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Información de GPS no disponible (sensor apagado o sin señal).";
          disabled = true;
          reportIncident("GPS_DISABLED", "Sensor GPS apagado o información de posición no disponible");
        } else if (error.code === error.TIMEOUT) {
          msg = "Tiempo de espera agotado al consultar GPS.";
        }

        setState((s) => ({
          ...s,
          error: msg,
          isGpsRevoked: revoked,
          isGpsDisabled: disabled,
        }));
      };

      watchIdRef.current = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );

      // Initial ping
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          sendPing(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }

    // Periodic ping timer
    const intervalTimer = setInterval(() => {
      if (lastCoordsRef.current) {
        sendPing(
          lastCoordsRef.current.lat,
          lastCoordsRef.current.lng,
          lastCoordsRef.current.acc,
          isNative ? "NATIVE_INTERVAL" : "WEB_INTERVAL"
        );
      }
    }, pingIntervalMs);

    return () => {
      if (watchIdRef.current !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (nativeWatcherId && isNative) {
        try {
          const BackgroundGeolocation = registerPlugin<any>("BackgroundGeolocation");
          BackgroundGeolocation.removeWatcher({ id: nativeWatcherId }).catch(() => {});
        } catch {}
      }
      clearInterval(intervalTimer);
    };
  }, [enabled, pingIntervalMs, sendPing]);

  return {
    ...state,
    sendManualPing,
    flushOfflinePings,
    refreshPendingCount,
  };
}
