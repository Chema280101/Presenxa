"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Clock, Wifi, Sparkles, UserCheck, Volume2, Radio, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useThemeSchedule } from "@/lib/themeSchedule";
import { playKioskSound, speakKioskGreeting, type KioskSoundType } from "@/lib/kioskAudio";
import { KioskConfigModal } from "@/components/kiosk/KioskConfigModal";
import { type ScanCelebrationData } from "@/components/kiosk/ScanCelebrationCard";
import { KioskTopbar, KioskScannerHud } from "@/components/kiosk/KioskScannerHud";
import { ManualDniModal } from "@/components/kiosk/ManualDniModal";
import { ConfettiCanvas } from "@/components/kiosk/ConfettiCanvas";

function decodeNdefTextRecord(record: any): string {
  if (!record?.data) return "";
  try {
    const view =
      record.data instanceof DataView
        ? record.data
        : new DataView(record.data.buffer || record.data);
    const statusByte = view.getUint8(0);
    const langLength = statusByte & 0x3f;
    const isUtf16 = (statusByte & 0x80) !== 0;
    const encoding = isUtf16 ? "utf-16" : "utf-8";
    const textBytes = new Uint8Array(
      view.buffer,
      view.byteOffset + 1 + langLength,
      view.byteLength - 1 - langLength
    );
    return new TextDecoder(encoding).decode(textBytes).trim();
  } catch {
    return new TextDecoder().decode(record.data).trim();
  }
}

function extractNfcCardId(event: any): string {
  let cardId: string = event.serialNumber || "";
  if (cardId || !event.message?.records?.length) return cardId;

  for (const record of event.message.records) {
    if (record.recordType === "text") {
      const decodedText = decodeNdefTextRecord(record);
      if (decodedText) {
        return decodedText;
      }
    }
  }
  return cardId;
}

function captureKioskFrameDataUrl(): string | null {
  try {
    const video = document.querySelector("#qr-reader video") as HTMLVideoElement | null;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      return null;
    }
    const maxW = 320;
    const scale = Math.min(1, maxW / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", 0.72);
  } catch {
    return null;
  }
}

export default function KioskAppPage() {
  const [mounted, setMounted] = useState(false);
  const { theme, toggleTheme, isAuto } = useThemeSchedule();
  const [apiKey, setApiKey] = useState<string>("");
  const [kioskInfo, setKioskInfo] = useState<{
    id: string;
    name: string;
    locationName: string;
  } | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [offlineBufferEnabled, setOfflineBufferEnabled] = useState(true);

  // Focus & Zoom capabilities
  const [isFocusing, setIsFocusing] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number; max: number; step: number } | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  // Scan states
  const [isScanning, _setIsScanning] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanCelebrationData | null>(null);
  const [lastSuccessfulScan, setLastSuccessfulScan] = useState<{
    name: string;
    time: string;
    scanType: string;
    method?: string;
  } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(4);
  const [totalDuration, setTotalDuration] = useState(4);

  // Manual DNI keypad modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualInput, setManualInput] = useState("");

  const scannerRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const apiKeyRef = useRef<string>(apiKey);

  // ── Web NFC & USB Reader States ──────────────────────────────
  const [_nfcSupported, setNfcSupported] = useState(false);
  const [nfcActive, setNfcActive] = useState(false);
  const [_nfcStatusMessage, setNfcStatusMessage] = useState("");
  const nfcAbortCtrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    apiKeyRef.current = apiKey;
  }, [apiKey]);

  // Load saved camera preference (defaults to "environment" = rear camera)
  useEffect(() => {
    const savedFacing = localStorage.getItem("asistcontrol_kiosk_camera_facing");
    if (savedFacing === "user" || savedFacing === "environment") {
      setCameraFacing(savedFacing);
    }
  }, []);

  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch { /* Ignorado intencionalmente */ }
    }
    setCameraFacing(nextFacing);
    localStorage.setItem("asistcontrol_kiosk_camera_facing", nextFacing);
  };

  // Trigger camera focus / refocus on demand
  const handleTriggerFocus = async (e?: React.MouseEvent<HTMLDivElement>) => {
    setIsFocusing(true);
    if (e) {
      const rect = e.currentTarget.getBoundingClientRect();
      setFocusPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else {
      setFocusPoint({ x: 144, y: 144 });
    }

    try {
      const track = videoTrackRef.current;
      if (track) {
        const caps: any = track.getCapabilities?.() || {};
        if (caps.focusMode) {
          // Force camera to refocus
          await track.applyConstraints({ advanced: [{ focusMode: "single-shot" } as any] }).catch(() => { });
          setTimeout(() => {
            track.applyConstraints({ advanced: [{ focusMode: "continuous" } as any] }).catch(() => { });
          }, 250);
        }
      }
    } catch (err) {
      console.warn("Manual focus error / not supported:", err);
    }

    setTimeout(() => {
      setIsFocusing(false);
      setFocusPoint(null);
    }, 1200);
  };

  // Change digital zoom level
  const handleSetZoom = async (newZoom: number) => {
    try {
      const track = videoTrackRef.current;
      if (track) {
        await track.applyConstraints({ advanced: [{ zoom: newZoom } as any] });
        setZoomLevel(newZoom);
      }
    } catch (err) {
      console.warn("Zoom constraint failed:", err);
    }
  };

  // ── Start Web NFC Scanning (Chrome on Android) ────────────────
  const startNfcScanning = async () => {
    if (typeof window === "undefined") return;
    if (!("NDEFReader" in window)) {
      setNfcSupported(false);
      return;
    }
    setNfcSupported(true);

    try {
      if (nfcAbortCtrlRef.current) {
        nfcAbortCtrlRef.current.abort();
      }
      const abortCtrl = new AbortController();
      nfcAbortCtrlRef.current = abortCtrl;

      // @ts-ignore
      const ndef = new window.NDEFReader();
      await ndef.scan({ signal: abortCtrl.signal });

      setNfcActive(true);
      setNfcStatusMessage("Sensor NFC activo y escuchando");

      ndef.onreading = (event: any) => {
        try {
          if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
            navigator.vibrate([80, 40, 80]);
          }
        } catch { /* Ignorado intencionalmente */ }

        const cardId = extractNfcCardId(event);

        if (cardId) {
          console.log("[Presenxa Kiosk] Tarjeta NFC detectada:", cardId);
          handleQrScanned(cardId);
        } else {
          setScanError("Tarjeta NFC leída pero no contiene UID ni registros legibles.");
          setTimeout(() => setScanError(null), 3000);
        }
      };

      ndef.onreadingerror = (err: any) => {
        console.warn("[Presenxa Kiosk] Error o interferencia al leer tarjeta NFC:", err);
        setScanError("Tarjeta detectada, pero no tiene formato NDEF estándar. Si es una tarjeta virgen de fábrica, grábale un texto simple con la app NFC Tools.");
        playSound("ERROR");
        setTimeout(() => setScanError(null), 4500);
      };
    } catch (err: any) {
      console.warn("[Presenxa Kiosk] Web NFC info:", err);
      setNfcActive(false);
      setNfcStatusMessage(err.name === "NotAllowedError" ? "Permiso NFC denegado" : "NFC no activado");
    }
  };

  // Activar NFC al montar si el navegador lo permite
  useEffect(() => {
    if (!mounted) return;
    if (typeof window !== "undefined" && "NDEFReader" in window) {
      setNfcSupported(true);
      startNfcScanning();
    }
    return () => {
      if (nfcAbortCtrlRef.current) {
        nfcAbortCtrlRef.current.abort();
      }
    };
  }, [mounted]);

  // ── USB / HID Keyboard RFID Reader Global Listener ──────────
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTime > 200) {
        buffer = "";
      }
      lastKeyTime = now;

      if (e.key === "Enter") {
        const token = buffer.trim();
        if (token.length >= 3) {
          console.log("[Presenxa Kiosk] Lector USB detectó entrada:", token);
          handleQrScanned(token);
          buffer = "";
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isProcessing, apiKey]);

  // Synthesize sound effects using Web Audio API
  const playSound = (type: KioskSoundType) => {
    playKioskSound(audioCtxRef, soundEnabled, type);
  };

  // Optional Voice Greeting using Web Speech API
  const speakGreeting = (text: string) => {
    speakKioskGreeting(soundEnabled, text);
  };

  // Clock interval
  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Offline queue loader & network listeners
  useEffect(() => {
    const savedBufferPref = localStorage.getItem("asistcontrol_kiosk_offline_buffer");
    if (savedBufferPref === "false") {
      setOfflineBufferEnabled(false);
    }

    const savedQueue = localStorage.getItem("asistcontrol_offline_queue");
    if (savedQueue) {
      try {
        setOfflineQueue(JSON.parse(savedQueue));
      } catch { /* Ignorado intencionalmente */ }
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
    }
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Offline Sync Loop
  useEffect(() => {
    let isSyncing = false;
    const syncInterval = setInterval(async () => {
      if (!isOnline || offlineQueue.length === 0 || isSyncing || !apiKeyRef.current) return;
      isSyncing = true;
      try {
        const batch = offlineQueue.slice(0, 50);
        const res = await fetch("/api/attendance/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-kiosk-api-key": apiKeyRef.current,
          },
          body: JSON.stringify({ records: batch }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setOfflineQueue((prev) => {
            const successfulIds = data.results.filter((r: any) => r.success).map((r: any) => r.id);
            const newQueue = prev.filter((q: any) => !successfulIds.includes(q.id));
            localStorage.setItem("asistcontrol_offline_queue", JSON.stringify(newQueue));
            return newQueue;
          });
        }
      } catch (err) {
        console.warn("Error en sync offline:", err);
      } finally {
        isSyncing = false;
      }
    }, 10000); // Check every 10s
    return () => clearInterval(syncInterval);
  }, [isOnline, offlineQueue]);

  // Check saved API key on mount
  useEffect(() => {
    const saved = localStorage.getItem("asistcontrol_kiosk_api_key");
    if (saved) {
      setApiKey(saved);
      validateApiKey(saved);
    } else {
      setIsConfigOpen(true);
    }
  }, []);

  // Validate API key with server & send heartbeat
  const validateApiKey = async (key: string): Promise<boolean> => {
    if (!key) return false;
    try {
      const res = await fetch("/api/kiosks/heartbeat", {
        method: "POST",
        headers: { "x-kiosk-api-key": key.trim() },
      });
      const data = await res.json();
      if (res.ok) {
        setIsOnline(true);
        if (typeof data.settings?.offlineBuffer === "boolean") {
          setOfflineBufferEnabled(data.settings.offlineBuffer);
          localStorage.setItem("asistcontrol_kiosk_offline_buffer", String(data.settings.offlineBuffer));
        }
        setKioskInfo({
          id: key.trim(),
          name: data.kiosk?.name || "Kiosk de Asistencia",
          locationName: data.location?.name || "Sede",
        });
        localStorage.setItem("asistcontrol_kiosk_api_key", key.trim());
        setApiKey(key.trim());
        return true;
      } else {
        setIsOnline(false);
        if (res.status === 401) {
          localStorage.removeItem("asistcontrol_kiosk_api_key");
          setApiKey("");
          setKioskInfo(null);
          setIsConfigOpen(true);
        }
        return false;
      }
    } catch {
      setIsOnline(false);
      return false;
    }
  };

  // Heartbeat interval every 30 seconds
  useEffect(() => {
    if (!apiKey) return;
    const interval = setInterval(() => {
      validateApiKey(apiKey);
    }, 30000);
    return () => clearInterval(interval);
  }, [apiKey]);

  // Initialize Html5QrcodeScanner
  useEffect(() => {
    let html5QrCode: any = null;
    let isCancelled = false;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const element = document.getElementById("qr-reader");
        if (!element || isCancelled) return;

        html5QrCode = new Html5Qrcode("qr-reader", {
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
        scannerRef.current = html5QrCode;

        const config = {
          fps: 20,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.floor(minEdge * 0.85);
            return { width: Math.max(260, size), height: Math.max(260, size) };
          },
          aspectRatio: 1.0,
        };

        // Html5Qrcode requires exactly 1 key if passed as object: { facingMode: "environment" | "user" }
        await html5QrCode.start(
          { facingMode: cameraFacing },
          config,
          (decodedText: string) => {
            handleQrScanned(decodedText);
          },
          () => { }
        );

        if (isCancelled) {
          if (html5QrCode.isScanning) {
            html5QrCode.stop().catch(() => { });
          }
          return;
        }

        // Extract active video track for HD resolution, autofocus and zoom capabilities
        setTimeout(() => {
          try {
            const videoEl = document.querySelector("#qr-reader video") as HTMLVideoElement;
            if (videoEl && videoEl.srcObject) {
              const stream = videoEl.srcObject as MediaStream;
              const track = stream.getVideoTracks()[0];
              if (track) {
                videoTrackRef.current = track;

                // Try applying HD resolution and continuous focus
                track
                  .applyConstraints({
                    width: { ideal: 1920, min: 1280 },
                    height: { ideal: 1080, min: 720 },
                    advanced: [{ focusMode: "continuous" } as any],
                  })
                  .catch(() => { });

                const caps: any = track.getCapabilities?.() || {};

                // Detect zoom capabilities
                if (caps.zoom) {
                  setZoomCapabilities({
                    min: caps.zoom.min || 1,
                    max: Math.min(caps.zoom.max || 3, 3),
                    step: caps.zoom.step || 0.1,
                  });
                }
              }
            }
          } catch (e) {
            console.warn("Could not inspect video track capabilities:", e);
          }
        }, 500);
      } catch (err) {
        console.warn("Camera start warning (using simulated mode if needed):", err);
      }
    };

    if (isScanning && !lastScanResult && !isProcessing) {
      startScanner();
    }

    return () => {
      isCancelled = true;
      videoTrackRef.current = null;
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => { });
      }
    };
  }, [isScanning, lastScanResult, isProcessing, cameraFacing]);

  // Dedicated Auto-Dismiss Countdown Effect when a Scan Result is showing
  useEffect(() => {
    if (!lastScanResult) return;

    const initialSecs = lastScanResult.requiresVerification
      ? 6
      : lastScanResult.microInteraction?.isBirthday || lastScanResult.microInteraction?.notice
        ? 5
        : 4;

    setTotalDuration(initialSecs);
    setCountdown(initialSecs);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setLastScanResult(null);
          setIsProcessing(false);
          return initialSecs;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lastScanResult]);

  // Handle scanned QR code / NFC card / DNI
  const handleQrScanned = async (token: string, isManualDni = false) => {
    // If a request is actively in flight, debounce
    if (isProcessing && !lastScanResult) return;

    const verificationPhotoUrl = isManualDni ? captureKioskFrameDataUrl() : null;

    // Check if scanned QR is a kiosk pairing payload
    try {
      const parsed = JSON.parse(token.trim());
      if (parsed.apiKey) {
        setIsProcessing(true);
        const valid = await validateApiKey(parsed.apiKey);
        if (valid) {
          playSound("SUCCESS");
          setLastScanResult({
            scanType: "ENTRY",
            message: `Dispositivo Kiosk vinculado correctamente: ${parsed.kioskName || "Conectado"}`,
            time: new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            date: new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
            status: "OK",
            user: {
              firstName: parsed.kioskName || "Kiosk",
              lastName: "Vinculado",
              email: "Dispositivo Activo",
              role: "KIOSK",
            },
          });
          return;
        }
      }
    } catch { /* Ignorado intencionalmente */ }

    const activeKey = apiKeyRef.current || (typeof window !== "undefined" ? localStorage.getItem("asistcontrol_kiosk_api_key") : "") || apiKey;
    if (!activeKey) {
      playSound("ERROR");
      setScanError("Debes configurar la API Key del Kiosk (ícono de engranaje ⚙️)");
      setIsConfigOpen(true);
      return;
    }

    // Dismiss previous card immediately to process the next person without delay
    setLastScanResult(null);
    setIsProcessing(true);
    setScanError(null);

    // Safely pause scanner
    try {
      if (scannerRef.current && typeof scannerRef.current.pause === "function") {
        scannerRef.current.pause();
      }
    } catch { /* Ignorado intencionalmente */ }

    try {
      const res = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kiosk-api-key": activeKey.trim(),
        },
        body: JSON.stringify({
          qrToken: token.trim(),
          mode: "AUTO",
          ...(verificationPhotoUrl ? { verificationPhotoUrl } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        playSound("ERROR");
        setScanError(data.error || "No se pudo registrar la asistencia");
        if (res.status === 401 && (!activeKey || data.error?.includes("clave incorrecta") || data.error?.includes("Falta la clave"))) {
          setIsConfigOpen(true);
        }
        setTimeout(() => {
          setScanError(null);
          setIsProcessing(false);
          try {
            if (scannerRef.current && typeof scannerRef.current.resume === "function") {
              scannerRef.current.resume();
            }
          } catch { /* Ignorado intencionalmente */ }
        }, 3500);
        return;
      }

      // Success / Celebration / Verification feedback sound & voice
      if (data.microInteraction?.celebrationType === "BIRTHDAY" || data.microInteraction?.isBirthday) {
        playSound("CELEBRATION");
        speakGreeting(`¡Feliz cumpleaños, ${data.user.firstName}!`);
      } else if (data.requiresVerification) {
        playSound("WARNING");
      } else if (data.status === "TARDE") {
        playSound("WARNING");
      } else {
        playSound("SUCCESS");
        if (data.microInteraction?.greeting) {
          speakGreeting(`${data.microInteraction.greeting}, asistencia registrada.`);
        }
      }

      setLastScanResult(data);
      if (data.user) {
        setLastSuccessfulScan({
          name: `${data.user.firstName} ${data.user.lastName}`.trim(),
          time: data.time,
          scanType: data.scanType,
          method: data.method,
        });
      }
    } catch (err: any) {
      if (!isOnline || err.message?.includes("Failed to fetch") || err.name === "TypeError") {
        if (!offlineBufferEnabled) {
          playSound("ERROR");
          setScanError("Sin conexión con el servidor y el búfer offline está desactivado.");
          return;
        }
        // OFFLINE FALLBACK
        const record = {
          id: Date.now().toString() + Math.random().toString(36).substring(2),
          qrToken: token.trim(),
          scannedAt: new Date().toISOString(),
          mode: "AUTO",
        };
        setOfflineQueue((prev) => {
          const newQueue = [...prev, record];
          localStorage.setItem("asistcontrol_offline_queue", JSON.stringify(newQueue));
          return newQueue;
        });

        playSound("SUCCESS");
        setLastScanResult({
          scanType: "ENTRY",
          message: "Modo Offline: La asistencia se ha guardado localmente y se sincronizará cuando vuelva la red.",
          time: new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          date: new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
          status: "OFFLINE",
          user: {
            firstName: "Usuario",
            lastName: "Identificado",
            email: "Sincronización Pendiente",
            role: "EMPLEADO",
          },
        });
      } else {
        playSound("ERROR");
        setScanError("Error de conexión con el servidor");
        setTimeout(() => {
          setScanError(null);
          setIsProcessing(false);
          try {
            if (scannerRef.current && typeof scannerRef.current.resume === "function") {
              scannerRef.current.resume();
            }
          } catch { /* Ignorado intencionalmente */ }
        }, 3000);
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setIsManualModalOpen(false);
    handleQrScanned(manualInput.trim(), true);
    setManualInput("");
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => { });
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-[100dvh] lg:h-[100dvh] select-none overflow-x-hidden lg:overflow-hidden text-slate-900 dark:text-slate-100 font-sans antialiased flex flex-col justify-between relative bg-slate-50 dark:bg-command-bg transition-colors duration-500">
      {/* Ambient background mesh gradient (Light & Dark dynamic) */}
      <div className="absolute inset-0 z-0 pointer-events-none transition-colors duration-500 bg-gradient-to-b from-slate-100/90 via-slate-50 to-slate-100/80 dark:from-[#07090e] dark:via-[#0b0f17] dark:to-[#06080d]" />
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-60 dark:opacity-100 transition-opacity duration-500"
        style={{
          background: "radial-gradient(circle at 75% 45%, rgba(0, 166, 80, 0.08) 0%, transparent 45%), radial-gradient(circle at 20% 50%, rgba(0, 166, 80, 0.06) 0%, transparent 55%)"
        }}
      />

      {/* Styles for HUD animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes laser-sweep { 0% { top: 6%; opacity: 0.1; } 15% { opacity: 0.9; } 85% { opacity: 0.9; } 100% { top: 94%; opacity: 0.1; } }
        .scanner-line { animation: laser-sweep 2.8s ease-in-out infinite alternate; }
        .pulse-indicator { box-shadow: 0 0 0 0 rgba(0, 166, 80, 0.7); animation: pulse-ring 2s cubic-bezier(0.24, 0, 0.38, 1) infinite; }
        @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(0, 166, 80, 0.6); } 70% { box-shadow: 0 0 0 10px rgba(0, 166, 80, 0); } 100% { box-shadow: 0 0 0 0 rgba(0, 166, 80, 0); } }
        @media (prefers-reduced-motion: reduce) {
          .scanner-line, .pulse-indicator { animation: none !important; }
        }
      `}} />

      {/* Confetti & Celebration Particles FX */}
      <ConfettiCanvas
        active={Boolean(lastScanResult?.microInteraction?.isBirthday || lastScanResult?.microInteraction?.celebrationType === "PUNCTUAL")}
        type={lastScanResult?.microInteraction?.isBirthday ? "BIRTHDAY" : "PUNCTUAL"}
      />

      {/* Topbar */}
      <KioskTopbar
        kioskName={kioskInfo?.name}
        locationName={kioskInfo?.locationName}
        isOnline={isOnline}
        offlineQueueLength={offlineQueue.length}
        cameraFacing={cameraFacing}
        soundEnabled={soundEnabled}
        isFullscreen={isFullscreen}
        mounted={mounted}
        isAuto={isAuto}
        theme={theme}
        onToggleCameraFacing={toggleCameraFacing}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onToggleFullscreen={toggleFullscreen}
        onToggleTheme={toggleTheme}
        onOpenConfig={() => setIsConfigOpen(true)}
      />

      {/* Main Kiosk Viewport (Split Dual Screen) */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 lg:px-14 py-6 max-w-[1720px] mx-auto w-full z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center w-full">
          {/* LADO IZQUIERDO: Reloj Digital & Métodos de Acceso */}
          <section className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left space-y-7">
            <div className="space-y-1">
              <div className="inline-flex items-baseline font-mono tracking-tight text-slate-900 dark:text-white select-text transition-colors" suppressHydrationWarning>
                <span className="text-7xl xl:text-8xl font-black drop-shadow-sm dark:drop-shadow-[0_4px_16px_rgba(255,255,255,0.15)]">
                  {mounted && currentTime ? format(currentTime, "HH:mm") : "--:--"}
                </span>
                <span className="text-5xl xl:text-6xl font-bold text-primary-600 dark:text-primary-400 px-2">:</span>
                <span className="text-5xl xl:text-6xl font-extrabold text-primary-600 dark:text-primary-400 drop-shadow-sm dark:drop-shadow-[0_0_12px_rgba(0,166,80,0.5)]">
                  {mounted && currentTime ? format(currentTime, "ss") : "--"}
                </span>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-2.5 text-slate-700 dark:text-slate-300 text-lg xl:text-xl font-medium tracking-wide capitalize transition-colors" suppressHydrationWarning>
                <Clock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <span className="text-primary-700 dark:text-primary-400/90 font-semibold">
                  {mounted && currentTime ? format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }) : "Cargando fecha..."}
                </span>
              </div>
            </div>

            <div className="w-full max-w-lg bg-white/95 dark:bg-[#0e1420]/90 border border-slate-200/90 dark:border-white/10 rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-[0_12px_36px_0_rgba(0,0,0,0.45)] backdrop-blur-xl relative overflow-hidden group transition-all duration-500">
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-primary-500/10 dark:bg-primary-400/10 rounded-full blur-2xl pointer-events-none group-hover:bg-primary-500/20 dark:group-hover:bg-primary-400/20 transition-all duration-700"></div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-400/10 border border-primary-200 dark:border-primary-400/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Control Biométrico, QR Dinámico & NFC</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Punto de verificación de identidad sin contacto</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300/90 leading-relaxed mb-6 font-normal">
                Muestra tu código QR dinámico frente a la cámara o acerca tu tarjeta física / llavero NFC al lector para registrar tu ingreso o salida en 0.2 segundos.
              </p>
              <button
                onClick={() => setIsManualModalOpen(true)}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-primary-950/40 border border-slate-200 hover:border-primary-400 dark:border-primary-400/40 dark:hover:border-primary-400 text-slate-700 dark:text-white hover:text-primary-700 dark:hover:text-primary-400 font-semibold text-sm transition-all duration-200 shadow-sm dark:shadow-md group/btn cursor-pointer"
              >
                <span className="text-primary-600 dark:text-primary-400 font-mono font-bold text-base">#</span>
                <span>¿No tienes tu QR? Ingresar DNI manualmente</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 w-full max-w-lg">
              <button
                type="button"
                onClick={startNfcScanning}
                aria-label={nfcActive ? "Lector NFC activo" : "Activar lector NFC"}
                className="min-h-[44px] flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/95 hover:bg-slate-50 dark:bg-slate-900/90 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-primary-400/25 text-xs text-slate-700 dark:text-slate-200 shadow-sm cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              >
                <div className="relative flex items-center justify-center">
                  <Radio className={`w-4 h-4 ${nfcActive ? "text-primary-600 dark:text-primary-400" : "text-amber-600 dark:text-amber-400"}`} aria-hidden="true" />
                  {nfcActive && <span className="absolute w-2 h-2 rounded-full bg-primary-400/50 animate-ping motion-reduce:animate-none"></span>}
                </div>
                <span>{nfcActive ? "Lector NFC / RFID activo: Pasa tu tarjeta" : "NFC / RFID disponible: Toca para activar"}</span>
              </button>
              <div className="min-h-[44px] flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/5 text-xs text-slate-600 dark:text-slate-400 shadow-sm dark:shadow-none transition-colors">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" aria-hidden="true" />
                <span>Validación Criptográfica SHA-256</span>
              </div>
            </div>
          </section>

          {/* LADO DERECHO: Visor HUD de Escaneo & Reconocimiento */}
          <KioskScannerHud
            lastScanResult={lastScanResult}
            scanError={scanError}
            countdown={countdown}
            totalDuration={totalDuration}
            isFocusing={isFocusing}
            focusPoint={focusPoint}
            zoomLevel={zoomLevel}
            zoomCapabilities={zoomCapabilities}
            onDismissResult={() => {
              setLastScanResult(null);
              setIsProcessing(false);
            }}
            onClearError={() => setScanError(null)}
            onTriggerFocus={handleTriggerFocus}
            onToggleCameraFacing={toggleCameraFacing}
            onSetZoom={handleSetZoom}
          />
        </div>

        {/* WIDGET INFERIOR FLOTANTE: Última Marcación Exitosa */}
        {!lastScanResult && (
          <div className="w-full max-w-2xl mt-6 lg:mt-8 transition-opacity">
            <div className="flex items-center justify-between p-3.5 px-5 rounded-2xl bg-white/95 dark:bg-[#0e1420]/90 border border-slate-200/90 dark:border-primary-500/30 backdrop-blur-xl shadow-lg shadow-slate-200/50 dark:shadow-[0_12px_36px_0_rgba(0,0,0,0.45)]">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-slate-800 flex items-center justify-center text-primary-600 dark:text-slate-300 border border-primary-200 dark:border-primary-400/40">
                    <UserCheck className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white dark:text-slate-950">
                    <CheckCircle2 className="w-2.5 h-2.5 stroke-[3]" aria-hidden="true" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {lastSuccessfulScan
                        ? `Última marcación: ${lastSuccessfulScan.name}`
                        : "Terminal Kiosk Activo"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {lastSuccessfulScan
                      ? `${lastSuccessfulScan.scanType === "EXIT" ? "Salida" : "Ingreso"} registrado a las ${lastSuccessfulScan.time}`
                      : "Listo para recibir la siguiente marcación"}
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-white/10 pl-4">
                <Volume2 className="w-4 h-4 text-primary-600 dark:text-primary-400" aria-hidden="true" />
                <span>Timbre & Voz OK</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Manual DNI Input Modal (Accessible Fallback) */}
      <ManualDniModal
        isOpen={isManualModalOpen}
        manualInput={manualInput}
        onClose={() => setIsManualModalOpen(false)}
        onChangeInput={setManualInput}
        onSubmit={handleManualSubmit}
      />

      {/* Config Modal */}
      <KioskConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSaveKey={validateApiKey}
        currentKey={apiKey}
      />

      {/* Operational Footer */}
      <footer className="w-full px-6 py-3 border-t border-slate-200/80 dark:border-white/[0.06] bg-white/90 dark:bg-command-bg/90 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 z-30 transition-colors">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">PRESENXA © {new Date().getFullYear()}</span>
          <span className="text-slate-400 dark:text-slate-600">—</span>
          <span>Terminal de Asistencia Inteligente</span>
          <span className="text-slate-400 dark:text-slate-600">•</span>
          <span className="text-slate-600 dark:text-slate-400">{kioskInfo?.locationName || "Sede Principal"}</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-3 h-3 text-primary-600 dark:text-primary-400" />
            <span>TLS 1.3 Strict</span>
          </span>
          <span className="text-slate-400 dark:text-slate-600">•</span>
          <span>Kiosk Key: <strong className="text-slate-700 dark:text-slate-300">{apiKey ? `${apiKey.substring(0, 8)}...` : "No config"}</strong></span>
          <span className="text-slate-400 dark:text-slate-600">•</span>
          <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
            <Wifi className="w-3 h-3 text-primary-600 dark:text-primary-400" />
            <span>AC 100% Conectado</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
