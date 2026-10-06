"use client";

import React, { useState, useEffect } from "react";
import { Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { CustomSelect, CustomSelectOption } from "@/components/ui/CustomSelect";
import { useToast } from "@/providers/ToastProvider";

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface AdminTimeOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminTimeOffModal({
  isOpen,
  onClose,
  onSuccess,
}: AdminTimeOffModalProps) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [type, setType] = useState<string>("VACACIONES");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setIsLoadingUsers(true);
      fetch("/api/users?limit=100")
        .then((res) => res.json())
        .then((data) => {
          if (data.users) {
            const list = data.users.map((u: any) => ({
              id: u.id,
              name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
              email: u.email,
            }));
            setUsers(list);
            if (list.length > 0) {
              setSelectedUserId(list[0].id);
            }
          }
        })
        .catch((err) => console.error("Error loading users:", err))
        .finally(() => setIsLoadingUsers(false));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !startDate || !endDate) {
      toast.warning("Completa los campos obligatorios");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          type,
          startDate,
          endDate,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al crear la solicitud");
      }

      toast.success("Solicitud de ausencia registrada");
      onSuccess();
      onClose();
      setStartDate("");
      setEndDate("");
      setReason("");
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        disabled={isSubmitting}
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        form="admin-time-off-form"
        variant="primary"
        isLoading={isSubmitting}
        icon={<Calendar className="w-4 h-4" />}
      >
        Registrar Ausencia
      </Button>
    </>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Permiso o Ausencia"
      description="Registra vacaciones, licencias o descansos médicos oficiales."
      icon={Calendar}
      iconVariant="success"
      maxWidth="lg"
      footer={footer}
    >
      <form id="admin-time-off-form" onSubmit={handleSubmit} className="space-y-4">
        {/* User selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
            Colaborador *
          </label>
          <CustomSelect
            disabled={isLoadingUsers}
            value={selectedUserId}
            onChange={(val) => setSelectedUserId(val)}
            options={users.map((u) => ({
              value: u.id,
              label: `${u.name} (${u.email})`,
              icon: User,
            }))}
            placeholder={isLoadingUsers ? "Cargando colaboradores..." : "Selecciona un colaborador..."}
            hasLeftIcon
            leftIcon={User}
          />
        </div>

        {/* Type selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
            Tipo de Ausencia *
          </label>
          <CustomSelect
            value={type}
            onChange={(val) => setType(val)}
            options={[
              { value: "VACACIONES", label: "Vacaciones", badge: "Vacaciones" },
              { value: "DESCANSO_MEDICO", label: "Descanso Médico", badge: "Salud" },
              { value: "PERMISO_PERSONAL", label: "Permiso Personal", badge: "Personal" },
              { value: "MATERNIDAD_PATERNIDAD", label: "Maternidad / Paternidad", badge: "Familiar" },
              { value: "LUTO", label: "Licencia por Luto", badge: "Luto" },
            ]}
          />
        </div>

        {/* Date range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
              Fecha Inicio *
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition dark:[color-scheme:dark]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
              Fecha Fin *
            </label>
            <input
              type="date"
              required
              min={startDate}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition dark:[color-scheme:dark]"
            />
          </div>
        </div>

        {/* Reason */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
            Motivo o Justificación (Opcional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Detalles sobre el permiso, número de expediente médico o acuerdo..."
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition resize-none placeholder:text-surface-400"
          />
        </div>
      </form>
    </ModalShell>
  );
}
