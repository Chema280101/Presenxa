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
import { useToast } from "@/providers/ToastProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { CustomSelect } from "@/components/ui/CustomSelect";

interface OrganizationData {
  id: string;
  name: string;
  type: "EMPRESA";
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
    offline_buffer?: boolean | null;
  };
  _count?: {
    users: number;
    locations: number;
    schedules: number;
    attendances: number;
  };
}

function ConfiguracionSkeleton() {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-fade-in-up pb-12">
      <main className="flex-1 overflow-y-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-surface-200 dark:border-surface-800">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-2xl" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-56 rounded-xl" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <Skeleton className="h-4 w-80 max-w-full rounded-lg" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-32 rounded-xl hidden sm:block" />
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
        </div>

        {/* 12-col Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Card 1: Logo Skeleton */}
            <div className="bg-white dark:bg-surface-900 rounded-2xl sm:rounded-3xl p-6 border border-surface-200 dark:border-surface-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-48 rounded-lg" />
                <Skeleton className="h-5 w-28 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-72 rounded-md" />
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-2">
                <div className="md:col-span-5 h-36 rounded-2xl bg-surface-50 dark:bg-surface-950/60 border border-surface-200 dark:border-surface-800 flex items-center justify-center">
                  <Skeleton className="w-20 h-20 rounded-2xl" />
                </div>
                <div className="md:col-span-7 space-y-3">
                  <Skeleton className="h-24 w-full rounded-2xl" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-36 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Organization Form Skeleton */}
            <div className="bg-white dark:bg-surface-900 rounded-2xl sm:rounded-3xl p-6 border border-surface-200 dark:border-surface-800 shadow-sm space-y-5">
              <Skeleton className="h-5 w-60 rounded-lg" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3.5 w-28 rounded-md" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </div>
                ))}
              </div>
              <div className="space-y-2 pt-2">
                <Skeleton className="h-3.5 w-48 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>

            {/* Card 3: Parameters Skeleton */}
            <div className="bg-white dark:bg-surface-900 rounded-2xl sm:rounded-3xl p-6 border border-surface-200 dark:border-surface-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-52 rounded-lg" />
                <Skeleton className="h-5 w-32 rounded-md" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
              </div>
            </div>
          </div>

          {/* Right Column (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Card 1: Membrete Skeleton */}
            <div className="bg-white dark:bg-surface-900 rounded-2xl sm:rounded-3xl p-6 border border-surface-200 dark:border-surface-800 shadow-sm space-y-4">
              <Skeleton className="h-5 w-40 rounded-lg" />
              <Skeleton className="h-44 w-full rounded-xl" />
            </div>

            {/* Card 2: KPIs Skeleton */}
            <div className="bg-white dark:bg-surface-900 rounded-2xl sm:rounded-3xl p-6 border border-surface-200 dark:border-surface-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32 rounded-lg" />
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ConfiguracionPage() {
  const [org, setOrg] = useState<OrganizationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Form states
  const [name, setName] = useState("");
  const [type, setType] = useState<"EMPRESA">("EMPRESA");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [ruc, setRuc] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [footerText, setFooterText] = useState("");
  const [toleranceMinutes, setToleranceMinutes] = useState<number>(10);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState<number>(10);
  const [timezone, setTimezone] = useState("America/Lima");
  const [offlineBuffer, setOfflineBuffer] = useState<boolean>(true);

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
        setOfflineBuffer(o.settings?.offline_buffer ?? true);
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
    if (type === "error") {
      toast.error(message);
    } else {
      toast.success(message);
    }
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
            offline_buffer: offlineBuffer,
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
    return <ConfiguracionSkeleton />;
  }

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in-up pb-12">
      {/* Page Header & Action CTA */}
      <PageHeader
          title="Personalización & Configuración del Sistema"
          titleBadge={
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/40">V2.4 PRODUCCIÓN</span>
          }
          subtitle="Personaliza la identidad visual corporativa (Marca Blanca), credenciales fiscales de la empresa y parámetros operativos de marcación en kiosks."
          icon={Shield}
          iconVariant="emerald"
          actionButtons={
            <>
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-primary-600 dark:text-primary-400 font-mono mr-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                <span>Todos los cambios respaldados</span>
              </div>
              <Button
                variant="primary"
                onClick={handleSave}
                isLoading={isSaving}
                icon={<Save className="w-4 h-4" />}
              >
                Guardar Cambios
              </Button>
            </>
          }
        />

        {/* Main Layout Grid: 2 Columns (~65% Left, ~35% Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* =================== LEFT COLUMN (Main Forms) =================== */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* CARD 1: Logotipo Corporativo (Marca Blanca) */}
            <section className="bg-white dark:bg-surface-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 relative overflow-hidden border border-surface-200 dark:border-surface-800 shadow-sm">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary-500/60 via-primary-400/20 to-transparent"></div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-200/60 dark:border-primary-800/40">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-surface-900 dark:text-white uppercase tracking-wider">Logotipo Corporativo (Marca Blanca)</h2>
                </div>
                <span className="self-start sm:self-auto text-[10px] font-semibold px-2.5 py-0.5 bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/40 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500 dark:bg-primary-400 animate-pulse"></span>
                  White-Label Activo
                </span>
              </div>
              <p className="text-xs text-surface-500 dark:text-surface-400 mb-4">
                Este logo se desplegará en encabezados, reportes ejecutivos en PDF, credenciales y pantallas de tótems Kiosk.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Current Logo Box */}
                <div className="md:col-span-5 flex flex-col items-center justify-center p-5 rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950/60 text-center relative group min-h-[140px]">
                  {logoUrl ? (
                    <div className="space-y-2">
                      <img src={logoUrl} alt="Logo de la empresa" className="max-h-24 max-w-full object-contain mx-auto rounded-lg" />
                      <div className="flex items-center gap-2 text-[10px] text-surface-500 dark:text-surface-400 font-mono mt-3 justify-center">
                        <span className="bg-surface-200/70 dark:bg-surface-800 px-2 py-0.5 rounded-md border border-surface-300 dark:border-surface-700">Personalizado</span>
                        <span className="bg-surface-200/70 dark:bg-surface-800 px-2 py-0.5 rounded-md border border-surface-300 dark:border-surface-700">Optimizado WebP</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-warning-500/20 via-primary-500/20 to-info-500/10 border border-warning-500/40 flex items-center justify-center shadow-sm">
                        <span className="font-serif text-2xl font-black bg-gradient-to-tr from-amber-400 to-primary-500 bg-clip-text text-transparent">P</span>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-surface-500 dark:text-surface-400">Logo por defecto</div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Action Upload & Dropzone Area */}
                <div className="md:col-span-7 flex flex-col justify-center space-y-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    id="logo-upload-input"
                  />
                  <label htmlFor="logo-upload-input" className="block border border-dashed border-surface-300 dark:border-surface-700 hover:border-primary-500 dark:hover:border-primary-400 rounded-2xl p-4 bg-surface-50/70 dark:bg-surface-950/40 text-center transition cursor-pointer group">
                    <div className="flex items-center justify-center gap-3">
                      <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 group-hover:scale-110 transition duration-150">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-semibold text-surface-800 dark:text-surface-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition">Haz clic para subir o arrastra el archivo</div>
                        <div className="text-[10px] text-surface-500 dark:text-surface-400">PNG con fondo transparente, SVG o WebP (Máx. 2 MB)</div>
                      </div>
                    </div>
                  </label>
                  
                  <div className="flex items-center gap-2 pt-1">
                    <label htmlFor="logo-upload-input" className="cursor-pointer px-3.5 py-2 rounded-xl bg-primary-50 dark:bg-primary-950/40 hover:bg-primary-100 dark:hover:bg-primary-900/50 border border-primary-200 dark:border-primary-800/40 text-primary-700 dark:text-primary-300 text-xs font-medium flex items-center gap-1.5 transition active:scale-95">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir Nuevo Logo</span>
                    </label>
                    {logoUrl && (
                      <button onClick={handleRemoveLogo} className="px-3.5 py-2 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 text-xs font-medium transition active:scale-95 cursor-pointer" type="button">
                        Restablecer por Defecto
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* CARD 2: Información de la Organización & Razón Social */}
            <section className="bg-white dark:bg-surface-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 relative border border-surface-200 dark:border-surface-800 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-200/60 dark:border-primary-800/40">
                  <Building2 className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-surface-900 dark:text-white uppercase tracking-wider">Información de la Organización & Razón Social</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Nombre Comercial */}
                <div>
                  <label className="block text-surface-700 dark:text-surface-300 font-medium mb-1.5">
                    Nombre Comercial / Razón Social <span className="text-primary-600 dark:text-primary-400">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 bg-surface-50 dark:bg-surface-950/60 border border-surface-200 dark:border-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500 font-medium focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                    placeholder="Ej. Corporación Andina S.A.C."
                  />
                </div>
                
                {/* RUC / NIF */}
                <div>
                  <label className="block text-surface-700 dark:text-surface-300 font-medium mb-1.5">
                    RUC / NIF / Identificador Fiscal
                  </label>
                  <input 
                    type="text" 
                    value={ruc}
                    onChange={(e) => setRuc(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 bg-surface-50 dark:bg-surface-950/60 border border-surface-200 dark:border-surface-800 text-surface-900 dark:text-surface-100 font-mono focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                    placeholder="Ej. 20601234567"
                  />
                </div>
                
                {/* Teléfono de Contacto */}
                <div>
                  <label className="block text-surface-700 dark:text-surface-300 font-medium mb-1.5">Teléfono de Contacto</label>
                  <input 
                    type="text" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 bg-surface-50 dark:bg-surface-950/60 border border-surface-200 dark:border-surface-800 text-surface-900 dark:text-surface-100 font-mono focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                    placeholder="Ej. +51 987 654 321"
                  />
                </div>
                
                {/* Correo Electrónico de RRHH / Admin */}
                <div>
                  <label className="block text-surface-700 dark:text-surface-300 font-medium mb-1.5">Correo Electrónico de RRHH / Admin</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 bg-surface-50 dark:bg-surface-950/60 border border-surface-200 dark:border-surface-800 text-surface-900 dark:text-surface-100 font-mono focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                    placeholder="rrhh@empresa.com"
                  />
                </div>
                
                {/* Dirección de Sede Central */}
                <div>
                  <label className="block text-surface-700 dark:text-surface-300 font-medium mb-1.5">Dirección de Sede Central</label>
                  <input 
                    type="text" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 bg-surface-50 dark:bg-surface-950/60 border border-surface-200 dark:border-surface-800 text-surface-900 dark:text-surface-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                    placeholder="Av. Principal 123"
                  />
                </div>
                
                {/* Texto de Pie de Página para Reportes */}
                <div className="sm:col-span-2">
                  <label className="block text-surface-700 dark:text-surface-300 font-medium mb-1.5">
                    Texto de Pie de Página (Para Reportes Oficiales & Constancias)
                  </label>
                  <input 
                    type="text" 
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 bg-surface-50 dark:bg-surface-950/60 border border-surface-200 dark:border-surface-800 text-surface-900 dark:text-surface-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
                    placeholder="Ej. Documento emitido por la Dirección de Gestión de Talento - Registro Inmutable SHA-256"
                  />
                  <p className="text-[10px] text-surface-500 dark:text-surface-400 mt-1">Este texto figurará en la nota de certificación inferior de cada reporte exportado.</p>
                </div>
              </div>
            </section>

            {/* CARD 3: Parámetros Operativos de Marcación en Kiosks */}
            <section className="bg-white dark:bg-surface-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 relative border border-surface-200 dark:border-surface-800 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-200/60 dark:border-primary-800/40">
                    <Clock className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-surface-900 dark:text-white uppercase tracking-wider">Parámetros Operativos de Marcación en Kiosks</h2>
                </div>
                <span className="text-[10px] bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 font-mono px-2.5 py-0.5 rounded-full border border-surface-200 dark:border-surface-700">Zero-GPS Protocol</span>
              </div>
              <p className="text-xs text-surface-500 dark:text-surface-400 mb-4">
                Reglas de negocio para validación de ingresos y sincronización de terminales físicos.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs mb-4">
                {/* Tolerancia de Entrada */}
                <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-950/60 border border-surface-200 dark:border-surface-800">
                  <label className="block text-surface-800 dark:text-surface-200 font-medium mb-1">Tolerancia de Entrada (min)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={toleranceMinutes}
                      onChange={(e) => setToleranceMinutes(Number(e.target.value))}
                      className="w-24 rounded-lg px-2.5 py-1.5 text-center font-bold text-primary-600 dark:text-primary-400 text-sm bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 focus:border-primary-500 outline-none" 
                    />
                    <span className="text-[11px] text-surface-500 dark:text-surface-400">minutos</span>
                  </div>
                  <p className="text-[10px] text-surface-500 dark:text-surface-400 mt-1.5 leading-snug">Margen de cortesía antes de clasificar como Tardanza.</p>
                </div>
                
                {/* Ventana de Anticipación */}
                <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-950/60 border border-surface-200 dark:border-surface-800">
                  <label className="block text-surface-800 dark:text-surface-200 font-medium mb-1">Ventana Anticipada (min)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={gracePeriodMinutes}
                      onChange={(e) => setGracePeriodMinutes(Number(e.target.value))}
                      className="w-24 rounded-lg px-2.5 py-1.5 text-center font-bold text-primary-600 dark:text-primary-400 text-sm bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 focus:border-primary-500 outline-none" 
                    />
                    <span className="text-[11px] text-surface-500 dark:text-surface-400">minutos</span>
                  </div>
                  <p className="text-[10px] text-surface-500 dark:text-surface-400 mt-1.5 leading-snug">Permite registrarse antes del inicio oficial del turno.</p>
                </div>
                
                {/* Expiración Token */}
                <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-950/60 border border-surface-200 dark:border-surface-800">
                  <label className="block text-surface-800 dark:text-surface-200 font-medium mb-1">Expiración Token QR (seg)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value="30" 
                      readOnly
                      className="w-24 rounded-lg px-2.5 py-1.5 text-center font-bold text-primary-600 dark:text-primary-400 text-sm bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 opacity-80" 
                    />
                    <span className="text-[11px] text-surface-500 dark:text-surface-400">segundos</span>
                  </div>
                  <p className="text-[10px] text-surface-500 dark:text-surface-400 mt-1.5 leading-snug">Rotación anti-suplantación en la App Colaborador.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-surface-200 dark:border-surface-800 text-xs">
                {/* Zona Horaria */}
                <div>
                  <label className="block text-surface-700 dark:text-surface-300 font-medium mb-1.5">Zona Horaria Oficial</label>
                  <CustomSelect 
                    value={timezone}
                    onChange={(val) => setTimezone(val)}
                    options={[
                      { value: "America/Lima", label: "America/Lima (UTC-05:00) · Hora Oficial" },
                      { value: "America/Bogota", label: "America/Bogota (UTC-05:00)" },
                      { value: "America/Mexico_City", label: "America/Mexico_City (UTC-06:00)" },
                      { value: "America/Santiago", label: "America/Santiago (UTC-04:00)" },
                      { value: "America/Buenos_Aires", label: "America/Buenos_Aires (UTC-03:00)" },
                      { value: "Europe/Madrid", label: "Europe/Madrid (UTC+01:00)" },
                    ]}
                  />
                </div>
                
                {/* Modo Offline Buffer */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-950/40 border border-surface-200 dark:border-surface-800">
                  <div>
                    <span className="block font-medium text-surface-800 dark:text-surface-200">Offline Buffer en Kiosks</span>
                    <span className="text-[10px] text-surface-500 dark:text-surface-400">Sync por lotes cada 10s ante pérdida red</span>
                  </div>
                  <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="toggle" 
                      id="offlineToggle" 
                      className="sr-only" 
                      checked={offlineBuffer}
                      onChange={(e) => setOfflineBuffer(e.target.checked)} 
                    />
                    <div className={`block w-10 h-5 rounded-full shadow-inner transition-colors ${offlineBuffer ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-700'}`}></div>
                    <div className={`absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform transform shadow-md ${offlineBuffer ? '' : '-translate-x-5'}`}></div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* =================== RIGHT COLUMN (Preview, KPIs, Security) =================== */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* CARD 1: Vista Previa de Membrete Oficial */}
            <section className="bg-white dark:bg-surface-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 relative border border-surface-200 dark:border-surface-800 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-200/60 dark:border-primary-800/40">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-surface-900 dark:text-white uppercase tracking-wider">Vista Previa Membrete PDF</h3>
                </div>
                <span className="text-[9px] font-mono text-surface-500 dark:text-surface-400 bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded-full border border-surface-200 dark:border-surface-700">PDF Header</span>
              </div>
              
              {/* Simulated Sheet Paper Preview */}
              <div className="bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 rounded-xl p-3.5 shadow-sm border border-surface-200 dark:border-surface-800">
                <div className="flex items-start justify-between border-b border-surface-200 dark:border-surface-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="max-h-7 max-w-[80px] object-contain" />
                    ) : (
                      <div className="w-7 h-7 rounded bg-surface-900 dark:bg-surface-800 text-warning-400 flex items-center justify-center font-bold text-xs">P</div>
                    )}
                    <div>
                      <div className="text-[11px] font-bold text-surface-900 dark:text-white uppercase tracking-tight truncate max-w-[120px]">{name || "Empresa"}</div>
                      <div className="text-[8px] text-surface-500 dark:text-surface-400 font-mono">{ruc ? `RUC: ${ruc}` : "RUC: 20XXXXXXXXX"} · Sede</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/40 uppercase">
                      Reporte Certificado
                    </span>
                    <div className="text-[7px] text-surface-400 dark:text-surface-500 font-mono mt-0.5">Emitido: Hoy</div>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 bg-surface-200 dark:bg-surface-800 rounded w-5/6"></div>
                  <div className="h-1.5 bg-surface-200 dark:bg-surface-800 rounded w-full"></div>
                  <div className="h-1.5 bg-surface-100 dark:bg-surface-800/60 rounded w-4/6"></div>
                </div>
                <div className="mt-2.5 pt-1.5 border-t border-surface-200 dark:border-surface-800 text-[7px] text-surface-500 dark:text-surface-400 text-center font-mono truncate px-1">
                  {footerText || "Validez de Auditoría Interna · Registro Criptográfico SHA-256"}
                </div>
              </div>
              <p className="text-[10px] text-surface-500 dark:text-surface-400 mt-3 text-center">
                Así se renderizará el membrete en descargas de asistencia mensual y constancias de RRHH.
              </p>
            </section>

            {/* CARD 2: Métricas del Tenant */}
            <section className="bg-white dark:bg-surface-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 relative border border-surface-200 dark:border-surface-800 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-200/60 dark:border-primary-800/40">
                    <LayoutDashboard className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-surface-900 dark:text-white uppercase tracking-wider">Métricas del Tenant</h3>
                </div>
                <span className="text-[9px] font-mono font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/50 px-2 py-0.5 rounded-full border border-primary-200 dark:border-primary-800/40">Sincronizado</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-950/60 border border-surface-200 dark:border-surface-800 text-center transition hover:border-primary-500/30">
                  <div className="text-lg font-bold font-mono text-surface-900 dark:text-white">{org?._count?.users ?? 0}</div>
                  <div className="text-[10px] text-surface-500 dark:text-surface-400 font-medium">Colaboradores</div>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-950/60 border border-surface-200 dark:border-surface-800 text-center transition hover:border-primary-500/30">
                  <div className="text-lg font-bold font-mono text-primary-600 dark:text-primary-400">{org?._count?.locations ?? 0}</div>
                  <div className="text-[10px] text-surface-500 dark:text-surface-400 font-medium">Sedes Físicas</div>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-950/60 border border-surface-200 dark:border-surface-800 text-center transition hover:border-primary-500/30">
                  <div className="text-lg font-bold font-mono text-surface-900 dark:text-white">{org?._count?.schedules ?? 0}</div>
                  <div className="text-[10px] text-surface-500 dark:text-surface-400 font-medium">Horarios Activos</div>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-950/60 border border-surface-200 dark:border-surface-800 text-center transition hover:border-primary-500/30">
                  <div className="text-lg font-bold font-mono text-primary-600 dark:text-primary-400">{org?._count?.attendances ?? 0}</div>
                  <div className="text-[10px] text-surface-500 dark:text-surface-400 font-medium">Marcaciones Hist.</div>
                </div>
              </div>
            </section>
          </div>
        </div>
    </div>
  );
}
