"use client";

import { useState, useEffect } from "react";
import { X, User, Mail, Phone, FileText, Lock, Building, Clock, ShieldCheck, Loader2 } from "lucide-react";
import { UserRole } from "@asistencias/db";

interface LocationOption {
  id: string;
  name: string;
}

interface ScheduleOption {
  id: string;
  name: string;
  entryHour: number;
  entryMinute: number;
  exitHour: number;
  exitMinute: number;
  isSplit?: boolean;
  entryHour2?: number | null;
  entryMinute2?: number | null;
  exitHour2?: number | null;
  exitMinute2?: number | null;
}

export interface UserFormData {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  documentId?: string;
  role: UserRole;
  locationId?: string;
  scheduleId?: string;
  password?: string;
  isActive?: boolean;
}

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: UserFormData) => Promise<boolean>;
  initialData?: UserFormData | null;
  locations: LocationOption[];
  schedules: ScheduleOption[];
}

export function UserFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  locations,
  schedules,
}: UserFormModalProps) {
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<UserFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    documentId: "",
    role: UserRole.EMPLEADO,
    locationId: "",
    scheduleId: "",
    password: "",
    isActive: true,
  });

  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        firstName: initialData.firstName || "",
        lastName: initialData.lastName || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        documentId: initialData.documentId || "",
        role: initialData.role || UserRole.EMPLEADO,
        locationId: initialData.locationId || "",
        scheduleId: initialData.scheduleId || "",
        password: "",
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
      });
    } else {
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        documentId: "",
        role: UserRole.EMPLEADO,
        locationId: locations[0]?.id || "",
        scheduleId: schedules[0]?.id || "",
        password: "",
        isActive: true,
      });
    }
    setError("");
  }, [initialData, isOpen, locations, schedules]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      setError("Por favor complete los campos obligatorios: Nombres, Apellidos y Correo.");
      return;
    }

    if (!isEditing && formData.password && formData.password.length < 6) {
      setError("La contraseña debe tener mínimo 6 caracteres.");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSave(formData);
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al guardar el usuario.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-[fade-in_0.2s_ease-out]">
      <div className="relative w-full max-w-4xl rounded-3xl glass border border-white/15 shadow-2xl shadow-black/90 my-auto overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-2xl gradient-brand text-white shadow-lg shadow-indigo-900/40">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {isEditing ? "Editar Usuario y Permisos" : "Registrar Nuevo Usuario"}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? "Modifica los datos personales, asignaciones operativas y credenciales"
                  : "Ingresa los datos para registrar al usuario y generar su código QR único"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Clean 2-column spacious grid */}
        <form onSubmit={handleSubmit} id="user-form" className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Grid de 2 Columnas amplias */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Fila 1: Nombres y Apellidos */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nombres <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Apellidos <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ej: Mendoza"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            {/* Fila 2: Correo y Teléfono */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Correo Electrónico <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="carlos@empresa.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Teléfono / WhatsApp
              </label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="+51 987 654 321"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                />
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            {/* Fila 3: Documento y Rol */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Documento de Identidad (DNI / Pasaporte / ID)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ej: 74859612"
                  value={formData.documentId || ""}
                  onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                />
                <FileText className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Rol / Tipo de Usuario
              </label>
              <div className="relative">
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value={UserRole.EMPLEADO}>Empleado / Trabajador</option>
                  <option value={UserRole.ALUMNO}>Alumno / Estudiante</option>
                  <option value={UserRole.SUPERVISOR}>Supervisor</option>
                  <option value={UserRole.ADMIN}>Administrador</option>
                  <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                </select>
                <ShieldCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Fila 4: Sede y Turno / Horario con ancho amplio */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Sede / Ubicación Asignada
              </label>
              <div className="relative">
                <select
                  value={formData.locationId || ""}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Sin sede específica (Acceso global)</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
                <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Turno / Horario Asignado
              </label>
              <div className="relative">
                <select
                  value={formData.scheduleId || ""}
                  onChange={(e) => setFormData({ ...formData, scheduleId: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Sin horario asignado (Flexible)</option>
                  {schedules.map((sch) => {
                    const shift1 = `${String(sch.entryHour).padStart(2, "0")}:${String(sch.entryMinute).padStart(2, "0")} - ${String(sch.exitHour).padStart(2, "0")}:${String(sch.exitMinute).padStart(2, "0")}`;
                    const shift2 = sch.isSplit && sch.entryHour2 !== null && sch.exitHour2 !== null
                      ? ` | ${String(sch.entryHour2).padStart(2, "0")}:${String(sch.entryMinute2 || 0).padStart(2, "0")} - ${String(sch.exitHour2).padStart(2, "0")}:${String(sch.exitMinute2 || 0).padStart(2, "0")}`
                      : "";
                    return (
                      <option key={sch.id} value={sch.id}>
                        {sch.name} ({shift1}{shift2})
                      </option>
                    );
                  })}
                </select>
                <Clock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Fila 5: Contraseña de Acceso (Ocupa ambas columnas) */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isEditing ? "Nueva Contraseña (dejar en blanco para conservar la actual)" : "Contraseña de Acceso al Panel / App Web"}
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder={isEditing ? "••••••••" : "Mínimo 6 caracteres"}
                  value={formData.password || ""}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-brand hover:opacity-95 active:scale-[0.98] text-white text-sm font-semibold shadow-lg shadow-indigo-900/40 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                isEditing ? "Guardar Cambios" : "Crear Usuario y Generar QR"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
