"use client";

import { useState, useEffect, useRef } from "react";
import {
  QrCode,
  CheckCircle2,
  Clock,
  Building,
  Wifi,
  WifiOff,
  Settings,
  Sparkles,
  UserCheck,
  UserX,
  AlertTriangle,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RefreshCw,
  Hash,
  X,
  ShieldAlert,
  Camera,
  SwitchCamera,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { KioskConfigModal } from "@/components/kiosk/KioskConfigModal";

interface ScanResult {
  scanType: "ENTRY" | "EXIT" | "ALREADY_REGISTERED";
  message: string;
  time: string;
  date: string;
  status: string;
  requiresVerification?: boolean;
  lateMinutes?: number | null;
  workedMinutes?: number | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    documentId?: string | null;
    role: string;
    photoUrl?: string | null;
    locationName?: string;
  };
}

export default function KioskAppPage() {
  const [mounted, setMounted] = useState(false);
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

  // Scan states
  const [isScanning, setIsScanning] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(4);

  // Manual DNI keypad modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualInput, setManualInput] = useState("");

  const scannerRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const apiKeyRef = useRef<string>(apiKey);

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
      } catch {}
    }
    setCameraFacing(nextFacing);
    localStorage.setItem("asistcontrol_kiosk_camera_facing", nextFacing);
  };

  // Synthesize sound effects using Web Audio API
  const playSound = (type: "SUCCESS" | "WARNING" | "ERROR") => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "SUCCESS") {
        // High pleasant ding-dong chime
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (type === "WARNING") {
        // Double pulse alert
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(370, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else {
        // Low error buzz
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(164.81, ctx.currentTime); // E3
        osc.frequency.setValueAtTime(130.81, ctx.currentTime + 0.18); // C3
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch (e) {
      console.warn("Audio playback not allowed yet:", e);
    }
  };

  // Clock interval
  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
        headers: { "x-kiosk-api-key": key },
      });
      const data = await res.json();
      if (res.ok) {
        setIsOnline(true);
        setKioskInfo({
          id: key,
          name: data.kiosk?.name || "Kiosk de Asistencia",
          locationName: data.location?.name || "Sede",
        });
        localStorage.setItem("asistcontrol_kiosk_api_key", key);
        return true;
      } else {
        setIsOnline(false);
        return false;
      }
    } catch (err) {
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

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const element = document.getElementById("qr-reader");
        if (!element) return;

        html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0,
        };

        try {
          await html5QrCode.start(
            { facingMode: cameraFacing },
            config,
            (decodedText: string) => {
              handleQrScanned(decodedText);
            },
            () => {}
          );
        } catch (firstErr) {
          console.warn(`Could not start camera with facingMode: ${cameraFacing}, attempting fallback...`, firstErr);
          // Fallback to alternate camera or any available video input
          const fallbackFacing = cameraFacing === "environment" ? "user" : "environment";
          await html5QrCode.start(
            { facingMode: fallbackFacing },
            config,
            (decodedText: string) => {
              handleQrScanned(decodedText);
            },
            () => {}
          );
        }
      } catch (err) {
        console.warn("Camera start warning (using simulated mode if needed):", err);
      }
    };

    if (isScanning && !lastScanResult && !isProcessing) {
      startScanner();
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [isScanning, lastScanResult, isProcessing, cameraFacing]);

  // Handle scanned QR code
  const handleQrScanned = async (token: string) => {
    if (isProcessing) return;
    const activeKey = apiKeyRef.current || (typeof window !== "undefined" ? localStorage.getItem("asistcontrol_kiosk_api_key") : "") || apiKey;
    if (!activeKey) {
      playSound("ERROR");
      setScanError("Debes configurar la API Key del Kiosk (ícono de engranaje ⚙️)");
      setIsConfigOpen(true);
      return;
    }
    setIsProcessing(true);
    setScanError(null);

    // Safely pause scanner
    try {
      if (scannerRef.current && typeof scannerRef.current.pause === "function") {
        scannerRef.current.pause();
      }
    } catch {}

    try {
      const res = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kiosk-api-key": activeKey.trim(),
        },
        body: JSON.stringify({ qrToken: token.trim(), mode: "AUTO" }),
      });

      const data = await res.json();

      if (!res.ok) {
        playSound("ERROR");
        setScanError(data.error || "No se pudo registrar la asistencia");
        // Solo abrir configuración si realmente la clave no existe o es inválida
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
          } catch {}
        }, 3500);
        return;
      }

      // Success / Verification feedback sound
      if (data.requiresVerification) {
        playSound("WARNING");
      } else if (data.status === "TARDE") {
        playSound("WARNING");
      } else {
        playSound("SUCCESS");
      }

      setLastScanResult(data);

      // Countdown auto-dismiss
      setCountdown(data.requiresVerification ? 6 : 4);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setLastScanResult(null);
            setIsProcessing(false);
            try {
              if (scannerRef.current && typeof scannerRef.current.resume === "function") {
                scannerRef.current.resume();
              }
            } catch {}
            return 4;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      playSound("ERROR");
      setScanError("Error de conexión con el servidor");
      setTimeout(() => {
        setScanError(null);
        setIsProcessing(false);
      }, 3000);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setIsManualModalOpen(false);
    handleQrScanned(manualInput.trim());
    setManualInput("");
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      className="min-h-screen text-white flex flex-col justify-between select-none relative overflow-hidden font-sans"
      style={{
        background: "radial-gradient(ellipse at 50% 0%, #102a43 0%, #0a1b2c 60%, #060e17 100%)",
      }}
    >
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-lime-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-sky-600/10 blur-3xl pointer-events-none" />

      {/* Topbar of Kiosk */}
      <header
        className="p-6 md:px-10 flex items-center justify-between z-10"
        style={{
          background: "rgba(10, 27, 44, 0.9)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(163, 230, 53, 0.12)",
        }}
      >
        <div className="flex items-center gap-4">
          <img
            src="/brand/isotipo-secundario.svg"
            alt="Presenxa"
            className="w-12 h-12 rounded-2xl object-contain shadow-lg shadow-black/50 ring-1 ring-lime-400/30"
          />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>Presen</span>
              <span className="text-lime-400">x</span>
              <span>a</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-lime-400/15 text-lime-300 border border-lime-400/30 font-semibold">
                Tablet Kiosk
              </span>
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              <span>{kioskInfo?.locationName || "Sede Principal"}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300">{kioskInfo?.name || "Terminal 01"}</span>
            </p>
          </div>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex items-center gap-3">
          {/* Online status */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isOnline
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }`}
          >
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>En Línea</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Sin Conexión</span>
              </>
            )}
          </div>

          {/* Camera facing switcher */}
          <button
            onClick={toggleCameraFacing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title={`Cambiar a ${cameraFacing === "environment" ? "Cámara Frontal" : "Cámara Trasera"}`}
          >
            <SwitchCamera className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold hidden md:inline">
              {cameraFacing === "environment" ? "Cámara Trasera" : "Cámara Frontal"}
            </span>
          </button>

          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
            title={soundEnabled ? "Silenciar" : "Activar sonido"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
            title="Pantalla Completa"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Settings */}
          <button
            onClick={() => setIsConfigOpen(true)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
            title="Configurar Kiosk"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 md:p-12 gap-8 max-w-7xl mx-auto w-full z-10">
        {/* Left Side: Big Digital Clock & Instructions */}
        <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
          {/* Big Glowing Clock */}
          <div className="space-y-1" suppressHydrationWarning>
            <div
              className="text-6xl md:text-8xl font-extrabold tracking-tight font-mono text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-emerald-200 drop-shadow-sm"
              suppressHydrationWarning
            >
              {mounted && currentTime ? format(currentTime, "HH:mm:ss") : "--:--:--"}
            </div>
            <p
              className="text-lg md:text-xl font-medium text-emerald-400 capitalize"
              suppressHydrationWarning
            >
              {mounted && currentTime
                ? format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
                : "Cargando fecha..."}
            </p>
          </div>

          {/* Instruction callout */}
          <div className="p-6 rounded-3xl glass border border-white/10 max-w-md space-y-3 shadow-xl">
            <div className="flex items-center gap-3 text-white font-bold text-base">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <span>Control de Asistencia Biométrico / QR</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Muestra tu código QR personal frente a la cámara para marcar tu hora
              oficial de ingreso o salida.
            </p>

            {/* Manual DNI button */}
            <div className="pt-2">
              <button
                onClick={() => setIsManualModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Hash className="w-4 h-4 text-emerald-400" />
                <span>¿No tienes tu QR? Ingresar DNI manualmente</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Camera Viewfinder OR Result Confirmation Card */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center">
          {lastScanResult ? (
            /* Result Feedback Card */
            <div className="w-full max-w-md rounded-3xl p-8 glass border border-white/20 shadow-2xl shadow-black/80 flex flex-col items-center text-center animate-[scale-up_0.25s_ease-out]">
              {/* Status Icon */}
              <div className="relative mb-4">
                <img
                  src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                    `${lastScanResult.user.firstName} ${lastScanResult.user.lastName}`
                  )}&backgroundColor=16a34a&textColor=ffffff`}
                  alt="Avatar"
                  className="w-24 h-24 rounded-3xl ring-4 ring-emerald-500/30 shadow-2xl"
                />
                <div
                  className={`absolute -bottom-2 -right-2 p-2 rounded-2xl shadow-lg ${
                    lastScanResult.requiresVerification
                      ? "bg-amber-500 text-slate-950 animate-pulse ring-4 ring-amber-500/30"
                      : lastScanResult.status === "TARDE"
                      ? "bg-amber-500 text-slate-950"
                      : "bg-emerald-500 text-slate-950"
                  }`}
                >
                  {lastScanResult.requiresVerification ? (
                    <Clock className="w-5 h-5" />
                  ) : lastScanResult.status === "TARDE" ? (
                    <Clock className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>
              </div>

              {/* User Name & Role */}
              <h2 className="text-2xl font-bold text-white mb-1">
                {lastScanResult.user.firstName} {lastScanResult.user.lastName}
              </h2>
              <p className="text-xs text-emerald-300 font-semibold uppercase tracking-wider mb-4">
                {lastScanResult.user.role} {lastScanResult.user.documentId ? `· DNI ${lastScanResult.user.documentId}` : ""}
              </p>

              {/* Scan Type Badge */}
              <div
                className={`py-2 px-5 rounded-2xl text-sm font-bold border mb-4 ${
                  lastScanResult.requiresVerification
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                    : lastScanResult.scanType === "ENTRY"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : lastScanResult.scanType === "EXIT"
                    ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                }`}
              >
                {lastScanResult.requiresVerification
                  ? "⚠️ MARCACIÓN POR DNI — PENDIENTE DE VALIDACIÓN"
                  : lastScanResult.scanType === "ENTRY"
                  ? "✅ INGRESO REGISTRADO"
                  : lastScanResult.scanType === "EXIT"
                  ? "👋 SALIDA REGISTRADA"
                  : "ℹ️ ASISTENCIA PREVIA"}
              </div>

              {/* Message */}
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                {lastScanResult.message}
              </p>

              {/* Time & Late/Worked chip */}
              <div className="w-full grid grid-cols-2 gap-2 text-xs font-mono p-3 rounded-2xl bg-white/5 border border-white/10 mb-6">
                <div>
                  <span className="text-slate-400 block text-[11px]">HORA CAPTURADA</span>
                  <span className="text-white font-bold text-sm">
                    {lastScanResult.time}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">ESTADO</span>
                  <span
                    className={`font-bold text-sm ${
                      lastScanResult.requiresVerification
                        ? "text-amber-400"
                        : lastScanResult.status === "TARDE"
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {lastScanResult.requiresVerification ? "POR CONFIRMAR" : lastScanResult.status}
                  </span>
                </div>
              </div>

              {/* Countdown return */}
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <span>Listo para el siguiente en</span>
                <strong className="text-emerald-400 font-mono">{countdown}s</strong>
              </div>
            </div>
          ) : scanError ? (
            /* Error Card */
            <div className="w-full max-w-md rounded-3xl p-8 glass border border-rose-500/30 bg-rose-500/5 shadow-2xl flex flex-col items-center text-center animate-[shake_0.3s_ease-in-out]">
              <div className="p-4 rounded-3xl bg-rose-500/20 text-rose-400 mb-4">
                <ShieldAlert className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Código Inválido o No Reconocido
              </h3>
              <p className="text-xs text-rose-300 leading-relaxed mb-6">
                {scanError}
              </p>
              <button
                onClick={() => setScanError(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          ) : (
            /* Camera Viewfinder Box */
            <div className="w-full max-w-sm flex flex-col items-center">
              <div className="relative w-72 h-72 rounded-3xl overflow-hidden glass border-2 border-emerald-500/40 shadow-2xl shadow-emerald-950/60 flex items-center justify-center bg-black/60">
                {/* HTML5 QR Container */}
                <div id="qr-reader" className="w-full h-full object-cover" />

                {/* Animated laser line */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_14px_#22c55e] animate-[scan-laser_2s_infinite_ease-in-out] pointer-events-none" />

                {/* Viewfinder corner brackets */}
                <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg pointer-events-none" />
                <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg pointer-events-none" />
                <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg pointer-events-none" />
                <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-lg pointer-events-none" />

                {/* Badge inside viewfinder */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-emerald-300 pointer-events-none">
                  {cameraFacing === "environment" ? "📷 Cámara Trasera" : "🤳 Cámara Frontal"}
                </div>
              </div>

              <div className="flex items-center justify-between w-full mt-4 px-2">
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Escaneando QR</span>
                </p>
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                  title="Alternar entre cámara trasera y frontal"
                >
                  <SwitchCamera className="w-3.5 h-3.5" />
                  <span>{cameraFacing === "environment" ? "Usar Frontal" : "Usar Trasera"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer info */}
      <footer
        className="p-4 text-center text-xs text-slate-500 flex items-center justify-between px-10"
        style={{
          borderTop: "1px solid rgba(22, 163, 74, 0.08)",
        }}
      >
        <span className="text-slate-400">Presenxa &copy; {new Date().getFullYear()} — Control Biométrico & QR</span>
        <span className="font-mono text-[11px] text-slate-500">
          Kiosk Key: {apiKey ? `${apiKey.substring(0, 8)}...` : "No configurado"}
        </span>
      </footer>

      {/* Config Modal */}
      <KioskConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSaveKey={validateApiKey}
        currentKey={apiKey}
      />

      {/* Manual DNI Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl p-6 glass border border-white/15 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Hash className="w-4 h-4 text-emerald-400" />
                Ingreso por DNI o Token
              </h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Número de Documento (DNI) o Token
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej: 23456789"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/15 text-white font-mono text-center text-lg tracking-wider focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl gradient-brand text-white text-xs font-bold shadow-lg shadow-emerald-950/50 cursor-pointer"
                >
                  Registrar Asistencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kiosk Configuration Modal */}
      <KioskConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        currentKey={apiKey}
        onSaveKey={async (newKey: string) => {
          setApiKey(newKey);
          const valid = await validateApiKey(newKey);
          if (valid) {
            localStorage.setItem("asistcontrol_kiosk_api_key", newKey);
            setIsConfigOpen(false);
          }
          return valid;
        }}
      />
    </div>
  );
}
