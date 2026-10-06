"use client";

import { useState } from "react";
import { UserX, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { ModalShell } from "@/components/ui/ModalShell";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/providers/ToastProvider";

interface BulkDeactivateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUserIds: string[];
  onSuccess: () => void;
}

export function BulkDeactivateModal({
  isOpen,
  onClose,
  selectedUserIds,
  onSuccess,
}: BulkDeactivateModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [confirmKeyword, setConfirmKeyword] = useState("");

  const needsKeywordConfirmation = selectedUserIds.length >= 3;
  const isKeywordValid = !needsKeywordConfirmation || confirmKeyword.trim().toUpperCase() === "DESACTIVAR";

  const handleDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isKeywordValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/users/bulk/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: selectedUserIds,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al dar de baja a los colaboradores");
      }

      toast.warning(data.message || `Se dieron de baja ${selectedUserIds.length} colaboradores.`);

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al procesar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-between w-full">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onClose}
        disabled={isSubmitting}
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        form="bulk-deactivate-form"
        variant="danger"
        size="sm"
        disabled={isSubmitting || !isKeywordValid}
        className="flex items-center gap-1.5"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Procesando baja...</span>
          </>
        ) : (
          <>
            <UserX className="w-3.5 h-3.5" />
            <span>Confirmar Baja Masiva ({selectedUserIds.length})</span>
          </>
        )}
      </Button>
    </div>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Baja Masiva de Colaboradores"
      description={`Estás a punto de suspender el acceso de ${selectedUserIds.length} colaboradores simultáneamente.`}
      icon={UserX}
      iconVariant="danger"
      maxWidth="md"
      footer={footer}
    >
      <form id="bulk-deactivate-form" onSubmit={handleDeactivate} className="space-y-4 py-1">
        {error && (
          <div
            role="alert"
            className="px-4 py-3 rounded-2xl bg-danger-500/15 border border-danger-500/30 text-danger-700 dark:text-danger-300 text-xs flex items-center gap-2 animate-shake"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 text-danger-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Banner de aviso sobre datos */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 text-xs space-y-2">
          <div className="font-bold flex items-center gap-2 text-amber-900 dark:text-amber-100">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            Impacto de la acción:
          </div>
          <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-300/90 pl-1 text-[11px]">
            <li>Pasarán a estado <strong>Inactivo</strong> de inmediato.</li>
            <li>No podrán marcar asistencia en quioscos ni ingresar al portal web.</li>
            <li><strong>El historial permanece seguro:</strong> no se eliminan marcaciones, permisos ni auditorías pasadas.</li>
          </ul>
        </div>

        {/* Motivo de la baja */}
        <div>
          <label className="block text-xs font-bold text-surface-700 dark:text-slate-300 mb-1.5">
            Motivo de la baja masiva (Opcional para auditoría)
          </label>
          <input
            type="text"
            placeholder="Ej: Fin de temporada, cese de contrato colectivo, etc."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full h-10 px-3.5 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 text-surface-900 dark:text-white text-xs placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-danger-500/40 transition"
          />
        </div>

        {/* Verificación con palabra clave si son 3 o más */}
        {needsKeywordConfirmation && (
          <div className="pt-2 border-t border-surface-200 dark:border-white/10">
            <label className="block text-xs font-bold text-surface-900 dark:text-white mb-1.5">
              Para confirmar, escribe <span className="font-mono text-danger-600 dark:text-danger-400 font-black">DESACTIVAR</span> a continuación:
            </label>
            <input
              type="text"
              required
              placeholder="DESACTIVAR"
              value={confirmKeyword}
              onChange={(e) => setConfirmKeyword(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl font-mono uppercase tracking-wider text-xs border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-danger-500/40"
            />
          </div>
        )}
      </form>
    </ModalShell>
  );
}
