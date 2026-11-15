"use client";

import { useState, useEffect } from "react";
import { UserRole } from "@asistencias/db";
import {
  UserPlus,
  User,
  Mail,
  Phone,
  FileText,
  Lock,
  Building,
  Clock,
  ShieldCheck,
  CreditCard,
  Radio,
  Cake,
  Check,
  Sparkles,
  Loader2,
  FolderTree,
} from "lucide-react";
import { clsx } from "clsx";
import { ModalShell } from "@/components/ui/ModalShell";
import { FormField, getFormInputClass } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { CustomSelect, CustomSelectOption } from "@/components/ui/CustomSelect";
import { validatePasswordStrength } from "@/lib/passwordPolicy";

interface LocationOption {
  id: string;
  name: string;
}

interface DepartmentOption {
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
  birthDate?: string;
  role: UserRole;
  locationId?: string;
  scheduleId?: string;
  password?: string;
  nfcCardUid?: string;
  isActive?: boolean;
  departmentId?: string;
}

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: UserFormData) => Promise<boolean>;
  initialData?: UserFormData | null;
  locations: LocationOption[];
  schedules: ScheduleOption[];
  departments: DepartmentOption[];
}

const ROLE_OPTIONS: CustomSelectOption[] = [
  { value: UserRole.EMPLEADO, label: "Empleado / Trabajador" },
  { value: UserRole.SUPERVISOR, label: "Supervisor" },
  { value: UserRole.ADMIN, label: "Administrador" },
  { value: UserRole.SUPER_ADMIN, label: "Super Admin" },
];

export function UserFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  locations,
  schedules,
  departments,
}: UserFormModalProps) {
  const isEditing = !!initialData?.id;
  
  const [formData, setFormData] = useState<UserFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    documentId: "",
    birthDate: "",
    role: UserRole.EMPLEADO,
    locationId: "",
    scheduleId: "",
    password: "",
    nfcCardUid: "",
    isActive: true,
    departmentId: "",
  });

  const [isNfcScanning, setIsNfcScanning] = useState(false);
  const [nfcScanSuccess, setNfcScanSuccess] = useState(false);
  const [error, setError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const locationOptions: CustomSelectOption[] = [
    { value: "", label: "Sin sede específica (Acceso global)" },
    ...locations.map((loc) => ({
      value: loc.id,
      label: loc.name,
    })),
  ];

  const departmentOptions: CustomSelectOption[] = [
    { value: "", label: "Sin departamento asignado" },
    ...departments.map((dept) => ({
      value: dept.id,
      label: dept.name,
    })),
  ];

  const scheduleOptions: CustomSelectOption[] = [
    { value: "", label: "Sin horario asignado (Flexible)" },
    ...schedules.map((sch) => {
      const shift1 = `${String(sch.entryHour).padStart(2, "0")}:${String(sch.entryMinute).padStart(2, "0")} - ${String(sch.exitHour).padStart(2, "0")}:${String(sch.exitMinute).padStart(2, "0")}`;
      const shift2 =
        sch.isSplit && sch.entryHour2 !== null && sch.exitHour2 !== null
          ? ` | ${String(sch.entryHour2).padStart(2, "0")}:${String(sch.entryMinute2 || 0).padStart(2, "0")} - ${String(sch.exitHour2).padStart(2, "0")}:${String(sch.exitMinute2 || 0).padStart(2, "0")}`
          : "";
      return {
        value: sch.id,
        label: sch.name,
        description: `${shift1}${shift2}`,
      };
    }),
  ];

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        firstName: initialData.firstName || "",
        lastName: initialData.lastName || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        documentId: initialData.documentId || "",
        birthDate: (initialData as any).birthDate ? String((initialData as any).birthDate).split("T")[0] : "",
        role: initialData.role || UserRole.EMPLEADO,
        locationId: initialData.locationId || "",
        scheduleId: initialData.scheduleId || "",
        password: "",
        nfcCardUid: initialData.nfcCardUid || "",
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
        departmentId: initialData.departmentId || "",
      });
    } else {
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        documentId: "",
        birthDate: "",
        role: UserRole.EMPLEADO,
        locationId: locations[0]?.id || "",
        scheduleId: schedules[0]?.id || "",
        password: "",
        nfcCardUid: "",
        isActive: true,
        departmentId: "",
      });
    }
    setError("");
    setFieldErrors({});
    setIsNfcScanning(false);
    setNfcScanSuccess(false);
  }, [initialData, isOpen, locations, schedules, departments]);

  const handleScanNfc = async () => {
    if (typeof window === "undefined") return;

    if (!("NDEFReader" in window)) {
      const nfcInput = document.getElementById("nfc-card-input");
      if (nfcInput) {
        nfcInput.focus();
      }
      setError("Web NFC está disponible en Chrome para Android. En PC, puedes pasar la tarjeta por tu lector USB o escribir el UID manualmente.");
      return;
    }

    try {
      setIsNfcScanning(true);
      setError("");
      // @ts-ignore
      const ndef = new window.NDEFReader();
      await ndef.scan();

      ndef.onreading = (event: any) => {
        let cardId = event.serialNumber;
        if (event.message?.records?.length > 0) {
          for (const record of event.message.records) {
            if (record.recordType === "text" && record.data) {
              try {
                const view = record.data instanceof DataView ? record.data : new DataView(record.data.buffer || record.data);
                const statusByte = view.getUint8(0);
                const langLength = statusByte & 0x3f;
                const isUtf16 = (statusByte & 0x80) !== 0;
                const encoding = isUtf16 ? "utf-16" : "utf-8";
                const textBytes = new Uint8Array(view.buffer, view.byteOffset + 1 + langLength, view.byteLength - 1 - langLength);
                const decodedText = new TextDecoder(encoding).decode(textBytes).trim();
                if (decodedText) {
                  if (!cardId || cardId === "") {
                    cardId = decodedText;
                  }
                }
              } catch {
                const fallbackText = new TextDecoder().decode(record.data).trim();
                if (fallbackText && (!cardId || cardId === "")) {
                  cardId = fallbackText;
                }
              }
            }
          }
        }

        if (cardId) {
          setFormData((prev) => ({ ...prev, nfcCardUid: cardId }));
          setIsNfcScanning(false);
          setNfcScanSuccess(true);
          setTimeout(() => setNfcScanSuccess(false), 3000);
        }
      };

      ndef.onreadingerror = () => {
        setError("Error al leer la tarjeta. Intenta acercarla nuevamente.");
        setIsNfcScanning(false);
      };
    } catch (err: any) {
      console.warn("Error Web NFC:", err);
      setIsNfcScanning(false);
      setError(err.name === "NotAllowedError" ? "Permiso NFC no otorgado." : "No se pudo iniciar el lector NFC.");
    }
  };

  const validateField = (field: "firstName" | "lastName" | "email" | "password", value: string) => {
    if (field === "firstName") return !value.trim() ? "El nombre es obligatorio." : undefined;
    if (field === "lastName") return !value.trim() ? "El apellido es obligatorio." : undefined;
    if (field === "email") {
      if (!value.trim()) return "El correo electrónico es obligatorio.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Ingresa un correo electrónico válido.";
      return undefined;
    }
    if (field === "password" && value) {
      const res = validatePasswordStrength(value);
      return res.isValid ? undefined : res.errorMessage;
    }
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const nextErrors = {
      firstName: validateField("firstName", formData.firstName),
      lastName: validateField("lastName", formData.lastName),
      email: validateField("email", formData.email),
      password: validateField("password", formData.password || ""),
    };

    if (nextErrors.firstName || nextErrors.lastName || nextErrors.email || nextErrors.password) {
      setFieldErrors(nextErrors);
      setError("Revisa los campos marcados antes de guardar.");
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

  const footer = (
    <>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={onClose}
        disabled={isSubmitting}
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        form="user-form"
        variant="primary"
        size="lg"
        isLoading={isSubmitting}
        icon={isEditing ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
      >
        {isSubmitting
          ? "Guardando..."
          : isEditing
            ? "Guardar Cambios"
            : "Crear Usuario y Generar QR"}
      </Button>
    </>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      preventClose={isSubmitting}
      closeOnBackdropClick={false}
      title={isEditing ? "Editar Usuario y Permisos" : "Registrar Nuevo Usuario"}
      description={
        isEditing
          ? "Modifica los datos personales, asignaciones operativas y credenciales"
          : "Ingresa los datos para registrar al colaborador y generar su credencial QR"
      }
      icon={UserPlus}
      iconVariant="primary"
      maxWidth="3xl"
      footer={footer}
    >
      <form onSubmit={handleSubmit} id="user-form" className="space-y-5 py-2" noValidate>
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="px-4 py-3 rounded-2xl bg-danger-500/15 border border-danger-500/30 text-danger-700 dark:text-danger-300 text-xs flex items-center gap-2 animate-shake"
          >
            <span className="w-2 h-2 rounded-full bg-danger-500 flex-shrink-0 animate-ping" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <FormField label="Nombres" icon={User} required error={fieldErrors.firstName}>
            <input
              type="text"
              required
              placeholder="Ej: Carlos"
              value={formData.firstName}
              onChange={(e) => {
                const val = e.target.value;
                setFormData({ ...formData, firstName: val });
                if (fieldErrors.firstName) {
                  setFieldErrors((prev) => ({ ...prev, firstName: validateField("firstName", val) }));
                }
              }}
              onBlur={() =>
                setFieldErrors((prev) => ({
                  ...prev,
                  firstName: validateField("firstName", formData.firstName),
                }))
              }
              className={getFormInputClass({ hasLeftIcon: true, hasError: !!fieldErrors.firstName })}
            />
          </FormField>

          <FormField label="Apellidos" icon={User} required error={fieldErrors.lastName}>
            <input
              type="text"
              required
              placeholder="Ej: Mendoza"
              value={formData.lastName}
              onChange={(e) => {
                const val = e.target.value;
                setFormData({ ...formData, lastName: val });
                if (fieldErrors.lastName) {
                  setFieldErrors((prev) => ({ ...prev, lastName: validateField("lastName", val) }));
                }
              }}
              onBlur={() =>
                setFieldErrors((prev) => ({
                  ...prev,
                  lastName: validateField("lastName", formData.lastName),
                }))
              }
              className={getFormInputClass({ hasLeftIcon: true, hasError: !!fieldErrors.lastName })}
            />
          </FormField>

          <FormField label="Correo Electrónico" icon={Mail} required error={fieldErrors.email}>
            <input
              type="email"
              required
              placeholder="carlos@empresa.com"
              value={formData.email}
              onChange={(e) => {
                const val = e.target.value;
                setFormData({ ...formData, email: val });
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: validateField("email", val) }));
                }
              }}
              onBlur={() =>
                setFieldErrors((prev) => ({
                  ...prev,
                  email: validateField("email", formData.email),
                }))
              }
              className={getFormInputClass({ hasLeftIcon: true, hasError: !!fieldErrors.email })}
            />
          </FormField>

          <FormField label="Teléfono / WhatsApp" icon={Phone} optional>
            <input
              type="tel"
              placeholder="+51 987 654 321"
              value={formData.phone || ""}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={getFormInputClass({ hasLeftIcon: true })}
            />
          </FormField>

          <FormField label="Documento de Identidad (DNI / Pasaporte / ID)" icon={FileText} optional>
            <input
              type="text"
              placeholder="Ej: 74859612"
              value={formData.documentId || ""}
              onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
              className={getFormInputClass({ hasLeftIcon: true, className: "font-mono" })}
            />
          </FormField>

          <FormField
            label="Fecha de Cumpleaños"
            icon={Cake}
            optional
            helperText="Dejar vacío si el colaborador prefiere no compartir su cumpleaños."
          >
            <input
              type="date"
              value={formData.birthDate || ""}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              className={getFormInputClass({
                hasLeftIcon: true,
                className: "cursor-pointer font-mono [color-scheme:light] dark:[color-scheme:dark]",
              })}
            />
          </FormField>

          <FormField label="Rol / Tipo de Usuario" icon={ShieldCheck}>
            <CustomSelect
              value={formData.role}
              onChange={(val) => setFormData({ ...formData, role: val as UserRole })}
              options={ROLE_OPTIONS}
              hasLeftIcon
            />
          </FormField>

          <FormField label="Sede / Ubicación Asignada" icon={Building}>
            <CustomSelect
              value={formData.locationId || ""}
              onChange={(val) => setFormData({ ...formData, locationId: val })}
              options={locationOptions}
              hasLeftIcon
            />
          </FormField>

          <FormField label="Departamento / Área" icon={FolderTree}>
            <CustomSelect
              value={formData.departmentId || ""}
              onChange={(val) => setFormData({ ...formData, departmentId: val })}
              options={departmentOptions}
              hasLeftIcon
            />
          </FormField>

          <FormField label="Turno / Horario Asignado" icon={Clock}>
            <CustomSelect
              value={formData.scheduleId || ""}
              onChange={(val) => setFormData({ ...formData, scheduleId: val })}
              options={scheduleOptions}
              hasLeftIcon
            />
          </FormField>

          {/* NFC Field */}
          <div className="md:col-span-2">
            <FormField
              label="Tarjeta o Llavero NFC Físico (UID)"
              htmlFor="nfc-card-input"
              icon={CreditCard}
              optional
              helperText={
                <div className="flex items-center justify-between">
                  <span>Puedes tocar este celular con la tarjeta física, usar un lector USB o escribir su código único.</span>
                  {nfcScanSuccess && (
                    <span className="text-primary-600 dark:text-primary-400 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> ¡Tarjeta detectada!
                    </span>
                  )}
                </div>
              }
            >
              <div className="flex gap-2">
                <input
                  id="nfc-card-input"
                  type="text"
                  placeholder="Ej: 04:A1:B2:C3:D4 (o acerca la tarjeta al lector)"
                  value={formData.nfcCardUid || ""}
                  onChange={(e) => setFormData({ ...formData, nfcCardUid: e.target.value })}
                  className={getFormInputClass({ hasLeftIcon: true, className: "flex-1 font-mono" })}
                />
                <button
                  type="button"
                  onClick={handleScanNfc}
                  className={clsx(
                    "h-11 px-4 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all cursor-pointer shrink-0 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                    isNfcScanning
                      ? "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-500/30 animate-pulse"
                      : "bg-surface-50 hover:bg-surface-100 dark:bg-white/5 dark:hover:bg-white/10 text-surface-700 dark:text-slate-200 border-surface-200 dark:border-white/10"
                  )}
                >
                  <Radio className={clsx("w-4 h-4", isNfcScanning ? "animate-spin text-primary-500" : "text-primary-500")} aria-hidden="true" />
                  <span>{isNfcScanning ? "Acerca la tarjeta..." : "Escanear NFC"}</span>
                </button>
              </div>
            </FormField>
          </div>

          <div className="md:col-span-2">
            <FormField
              label={
                isEditing
                  ? "Nueva Contraseña (dejar en blanco para conservar la actual)"
                  : "Contraseña de Acceso al Panel / App Web"
              }
              icon={Lock}
              optional
              helperText="Mínimo 8 caracteres, incluyendo un número y un símbolo (@#$%!)."
              error={fieldErrors.password}
            >
              <input
                type="password"
                placeholder={isEditing ? "••••••••" : "Mín. 8 caracteres, 1 número y 1 símbolo"}
                value={formData.password || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, password: val });
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: validateField("password", val) }));
                  }
                }}
                onBlur={() =>
                  setFieldErrors((prev) => ({
                    ...prev,
                    password: validateField("password", formData.password || ""),
                  }))
                }
                className={getFormInputClass({ hasLeftIcon: true, hasError: !!fieldErrors.password })}
              />
            </FormField>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
