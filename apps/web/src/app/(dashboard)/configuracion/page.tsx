"use client";

import { useState, useEffect, useRef } from "react";
import {
  Building2,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Save,
  Trash2,
  Globe,
  Clock,
  Shield,
  FileText,
  Tablet,
  LayoutDashboard,
  Eye,
  RefreshCw,
  Sparkles,
} from "lucide-react";

interface OrganizationData {
  id: string;
  name: string;
  type: "EMPRESA" | "COLEGIO";
  slug: string;
  logoUrl?: string | null;
  settings?: {
    ruc?: string | null;
    brandColor?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    footerText?: string | null;
    grace_period_minutes?: number | null;
    tolerance_minutes?: number | null;
    timezone?: string | null;
  };
  _count?: {
    users: number;
    locations: number;
    schedules: number;
    attendances: number;
  };
}

export default function ConfiguracionPage() {
  const [org, setOrg] = useState<OrganizationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [type, setType] = useState<"EMPRESA" | "COLEGIO">("EMPRESA");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [ruc, setRuc] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [footerText, setFooterText] = useState("");
  const [toleranceMinutes, setToleranceMinutes] = useState<number>(10);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState<number>(10);
  const [timezone, setTimezone] = useState("America/Lima");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchOrganization = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/organization");
      const data = await res.json();

      if (res.ok && data.organization) {
        const o: OrganizationData = data.organization;
        setOrg(o);
        setName(o.name || "");
        setType(o.type || "EMPRESA");
        setLogoUrl(o.logoUrl || null);
        setRuc(o.settings?.ruc || "");
        setPhone(o.settings?.phone || "");
        setEmail(o.settings?.email || "");
        setAddress(o.settings?.address || "");
        setFooterText(o.settings?.footerText || "");
        setToleranceMinutes(o.settings?.tolerance_minutes ?? 10);
        setGracePeriodMinutes(o.settings?.grace_period_minutes ?? 10);
        setTimezone(o.settings?.timezone || "America/Lima");
      } else {
        showToast(data.error || "No se pudo cargar la organización", "error");
      }
    } catch (err: any) {
      showToast("Error de conexión al cargar datos", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganization();
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Manejador de subida de archivo de logo con redimensionamiento automático
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Por favor selecciona un archivo de imagen válido (PNG, SVG, JPG, WebP)", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 480;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedDataUrl = canvas.toDataURL("image/webp", 0.9);
          setLogoUrl(optimizedDataUrl);
          showToast("Logo optimizado y cargado. Haz clic en 'Guardar Cambios' para aplicar.", "success");
        } else {
          setLogoUrl(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    showToast("Logo removido. Haz clic en 'Guardar Cambios' para confirmar.", "success");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("El nombre de la empresa es obligatorio", "error");
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          logoUrl,
          settings: {
            ruc: ruc.trim() || null,
            phone: phone.trim() || null,
            email: email.trim() || null,
            address: address.trim() || null,
            footerText: footerText.trim() || null,
            tolerance_minutes: Number(toleranceMinutes) || 0,
            grace_period_minutes: Number(gracePeriodMinutes) || 10,
            timezone,
          },
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast("¡Configuración y logo guardados exitosamente!", "success");
        setOrg(data.organization);
      } else {
        showToast(data.error || "Error al guardar cambios", "error");
      }
    } catch (err: any) {
      showToast("Error de conexión al guardar", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="w-8 h-8 text-lime-400 animate-spin" />
        <p className="text-sm text-slate-400">Cargando configuración de la empresa...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4 ${
            toast.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-200"
              : "bg-rose-950/80 border-rose-500/40 text-rose-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-lime-400/10 border border-lime-400/20 text-lime-400">
              <Building2 className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Personalización & Configuración
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Personaliza el logotipo institucional, datos fiscales de la empresa y parámetros de asistencia.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-lime-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar Cambios
            </>
          )}
        </button>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUMNA IZQUIERDA: Logo & Identidad de Marca (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Logo de la Empresa */}
          <div className="card-surface p-6 rounded-2xl border border-white/5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-lime-400" />
                  Logotipo Corporativo (Marca Blanca)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Este logo aparecerá en el encabezado, reportes PDF y pantallas de Kiosk.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-lime-400 bg-lime-400/10 px-2.5 py-1 rounded-full border border-lime-400/20">
                White-Label Activo
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Preview del Logo Actual */}
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-black/40 border border-white/10 min-h-[160px] text-center">
                {logoUrl ? (
                  <div className="space-y-2">
                    <img
                      src={logoUrl}
                      alt="Logo de la empresa"
                      className="max-h-24 max-w-full object-contain mx-auto rounded-lg"
                    />
                    <p className="text-[10px] text-emerald-400 font-medium">Logo Personalizado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <img
                      src="/brand/isotipo-secundario.svg"
                      alt="Presenxa Default"
                      className="w-16 h-16 mx-auto object-contain opacity-40 grayscale"
                    />
                    <p className="text-[11px] text-slate-500">Logo por defecto (Presenxa)</p>
                  </div>
                )}
              </div>

              {/* Botones de acción / Subida */}
              <div className="md:col-span-2 space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  id="logo-upload-input"
                />

                <div className="flex flex-wrap gap-2.5">
                  <label
                    htmlFor="logo-upload-input"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs border border-white/10 transition-all hover:border-lime-400/40"
                  >
                    <Upload className="w-4 h-4 text-lime-400" />
                    Subir Nuevo Logo
                  </label>

                  {logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-medium text-xs border border-rose-500/20 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      Restablecer
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Formatos recomendados: <strong className="text-slate-300">PNG con fondo transparente o SVG</strong>. Tamaño máximo: 2 MB. Dimensiones sugeridas: 400x120px o formato cuadrado 300x300px.
                </p>
              </div>
            </div>
          </div>

          {/* Card: Datos Fiscales y de la Empresa */}
          <div className="card-surface p-6 rounded-2xl border border-white/5 space-y-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-lime-400" />
              Información de la Organización
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nombre Comercial / Institución *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Corporación Andina S.A.C."
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-lime-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tipo de Institución
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as "EMPRESA" | "COLEGIO")}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-lime-400 transition-colors"
                >
                  <option value="EMPRESA">Empresa / Negocio Comercial</option>
                  <option value="COLEGIO">Colegio / Instituto Educativo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  RUC / NIF / Identificador Fiscal
                </label>
                <input
                  type="text"
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  placeholder="Ej. 20601234567"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-lime-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Teléfono de Contacto
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. +51 987 654 321"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-lime-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Correo Electrónico de RRHH / Admin
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rrhh@empresa.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-lime-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Dirección de Sede Central
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Av. Principal 123, Of. 401"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-lime-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Texto de Pie de Página (Para Reportes Oficiales & Constancias)
              </label>
              <input
                type="text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Ej. Documento emitido por el Departamento de Gestión Humana - Validez oficial"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-lime-400 transition-colors"
              />
            </div>
          </div>

          {/* Card: Parámetros Operativos */}
          <div className="card-surface p-6 rounded-2xl border border-white/5 space-y-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-lime-400" />
              Parámetros Globales de Asistencia & Geocercas
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tolerancia de Entrada (min)
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={toleranceMinutes}
                  onChange={(e) => setToleranceMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-lime-400 transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">Minutos antes de marcar 'Tardanza'</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Periodo de Gracia Geo (min)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={gracePeriodMinutes}
                  onChange={(e) => setGracePeriodMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-lime-400 transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">Antes de registrar 'Abandono de puesto'</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Zona Horaria
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-lime-400 transition-colors"
                >
                  <option value="America/Lima">America/Lima (UTC-5)</option>
                  <option value="America/Bogota">America/Bogota (UTC-5)</option>
                  <option value="America/Mexico_City">America/Mexico_City (UTC-6)</option>
                  <option value="America/Santiago">America/Santiago (UTC-3)</option>
                  <option value="America/Buenos_Aires">America/Buenos_Aires (UTC-3)</option>
                  <option value="America/Madrid">Europe/Madrid (UTC+1)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Para cálculo exacto de horas</p>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Vista Previa en Vivo & Resumen (1 col) */}
        <div className="space-y-6">
          {/* Card: Vista previa en vivo del Membrete */}
          <div className="card-surface p-5 rounded-2xl border border-lime-400/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-lime-400" />
                Vista Previa Membrete PDF
              </span>
              <span className="text-[10px] font-mono text-slate-400">PDF Header</span>
            </div>

            {/* Simulación de Hoja de Reporte */}
            <div className="p-4 rounded-xl bg-white text-slate-900 shadow-md space-y-3 font-sans text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2.5">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="h-9 max-w-[120px] object-contain"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-lime-400 flex items-center justify-center font-black text-xs">
                      P
                    </div>
                  )}
                  <div>
                    <p className="font-extrabold text-slate-900 text-xs leading-tight">
                      {name || "Nombre de la Empresa"}
                    </p>
                    <p className="text-[9px] text-slate-500 font-medium">
                      {ruc ? `RUC: ${ruc}` : "RUC: 20XXXXXXXXX"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                    REPORTE OFICIAL
                  </span>
                  <p className="text-[8px] text-slate-400 mt-0.5">Fecha: 17/08/2026</p>
                </div>
              </div>

              <div className="py-1 space-y-1">
                <div className="h-2 bg-slate-100 rounded w-full"></div>
                <div className="h-2 bg-slate-100 rounded w-4/5"></div>
              </div>

              {footerText && (
                <p className="text-[8px] text-slate-400 italic text-center border-t border-slate-100 pt-1.5">
                  {footerText}
                </p>
              )}
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Así se verá el encabezado en las descargas de asistencia y constancias de RRHH.
            </p>
          </div>

          {/* Card: Resumen de Organización */}
          <div className="card-surface p-5 rounded-2xl border border-white/5 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider text-slate-400">
              Métricas del Tenant
            </h3>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                <p className="text-lg font-black text-white">{org?._count?.users ?? 0}</p>
                <p className="text-[10px] text-slate-400">Usuarios</p>
              </div>
              <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                <p className="text-lg font-black text-lime-400">{org?._count?.locations ?? 0}</p>
                <p className="text-[10px] text-slate-400">Sedes</p>
              </div>
              <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                <p className="text-lg font-black text-emerald-400">{org?._count?.schedules ?? 0}</p>
                <p className="text-[10px] text-slate-400">Horarios</p>
              </div>
              <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                <p className="text-lg font-black text-sky-400">{org?._count?.attendances ?? 0}</p>
                <p className="text-[10px] text-slate-400">Marcaciones</p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
