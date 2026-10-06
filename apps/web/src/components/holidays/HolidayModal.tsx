"use client";

import React, { useState, useEffect } from "react";
import { Calendar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useToast } from "@/providers/ToastProvider";

interface LocationOption {
  id: string;
  name: string;
}

interface HolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locations?: LocationOption[];
  initialDate?: string;
}

export function HolidayModal({
  isOpen,
  onClose,
  onSuccess,
  locations = [],
  initialDate,
}: HolidayModalProps) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [locationId, setLocationId] = useState<string>("GLOBAL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (initialDate) {
        setDate(initialDate);
      } else {
        setDate("");
      }
      setName("");
      setLocationId("GLOBAL");
    }
  }, [isOpen, initialDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) {
      toast.warning("Completa el nombre y la fecha del feriado");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          date,
          locationId: locationId === "GLOBAL" ? null : locationId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al crear el feriado");
      }

      toast.success("Feriado registrado con éxito");
      setName("");
      setDate("");
      setLocationId("GLOBAL");
      onSuccess();
      onClose();
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
        form="holiday-form"
        variant="primary"
        isLoading={isSubmitting}
        icon={<Calendar className="w-4 h-4" />}
      >
        Guardar Feriado
      </Button>
    </>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Feriado Oficial"
      description="Los colaboradores no serán penalizados por faltas en este día."
      icon={Calendar}
      iconVariant="success"
      maxWidth="lg"
      footer={footer}
    >
      <form id="holiday-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
            Motivo o Nombre del Feriado *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Día del Trabajo, Navidad, Fiestas Patrias..."
            className="w-full px-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
            Fecha No Laborable *
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition dark:[color-scheme:dark]"
          />
        </div>

        {locations.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
              Alcance Geográfico
            </label>
            <CustomSelect
              value={locationId}
              onChange={(val) => setLocationId(val)}
              options={[
                { value: "GLOBAL", label: "🌍 Alcance Global (Todas las sedes)" },
                ...locations.map((loc) => ({
                  value: loc.id,
                  label: `📍 Solo ${loc.name}`,
                })),
              ]}
            />
          </div>
        )}

        {/* Info pill */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <span>
            El cierre automatizado de medianoche (EOD) omitirá registrar faltas en este día, protegiendo las métricas de puntualidad de los colaboradores.
          </span>
        </div>
      </form>
    </ModalShell>
  );
}
