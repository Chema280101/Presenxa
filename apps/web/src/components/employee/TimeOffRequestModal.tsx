import { useState, useRef } from "react";
import { X, Calendar, FileText, UploadCloud, AlertCircle, CheckCircle2, ChevronDown, Activity } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CustomSelect } from "@/components/ui/CustomSelect";

interface TimeOffRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TimeOffRequestModal({ isOpen, onClose }: TimeOffRequestModalProps) {
  const [type, setType] = useState<string>("DESCANSO_MEDICO");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError("Por favor, selecciona las fechas.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      let documentUrl = null;
      if (file) {
        documentUrl = "https://example.com/simulated-upload.pdf"; // Simulamos carga
      }

      const res = await fetch("/api/user/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          startDate,
          endDate,
          reason,
          documentUrl,
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
          setType("DESCANSO_MEDICO");
          setStartDate("");
          setEndDate("");
          setReason("");
          setFile(null);
        }, 2500);
      } else {
        setError(data.error || "Error al enviar la solicitud.");
      }
    } catch (err: any) {
      setError("Error de conexión con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm transition-all"
    >
      {/* Tap to close background */}
      <div className="absolute inset-0 z-0" onClick={onClose} />

      <div
        className="w-full sm:max-w-md bg-white dark:bg-command-card sm:rounded-3xl rounded-t-3xl shadow-2xl z-10 flex flex-col relative animate-[slide-up_0.3s_cubic-bezier(0.16,1,0.3,1)] max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle for mobile */}
        <div className="w-full flex justify-center pt-3 pb-2 sm:hidden cursor-pointer" onClick={onClose}>
          <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-surface-700" />
        </div>

        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:pt-6 pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Reportar Ausencia
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Solicita permisos o justificaciones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-surface-800 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 sm:px-6 scrollbar-hide">
          {success ? (
            <div className="flex flex-col items-center justify-center py-10 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">¡Solicitud Enviada!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[250px]">
                RRHH ha recibido tu solicitud y la revisará en breve.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* Type Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Tipo de Solicitud
                </label>
                <CustomSelect
                  value={type}
                  onChange={(val) => setType(val)}
                  options={[
                    { value: "DESCANSO_MEDICO", label: "Descanso Médico", badge: "Salud" },
                    { value: "VACACIONES", label: "Vacaciones", badge: "Descanso" },
                    { value: "PERMISO_PERSONAL", label: "Permiso Personal", badge: "Personal" },
                    { value: "MATERNIDAD_PATERNIDAD", label: "Maternidad / Paternidad", badge: "Familiar" },
                    { value: "LUTO", label: "Luto", badge: "Luto" },
                  ]}
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Desde
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-3 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 transition dark:[color-scheme:dark]"
                    />
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Hasta
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-3 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 transition dark:[color-scheme:dark]"
                    />
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Motivo o Detalles (Opcional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: Reposo indicado por 3 días..."
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 transition resize-none placeholder:text-slate-400"
                />
              </div>

              {/* File Upload (Medical Certificate) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Adjuntar Sustento (Foto o PDF)
                </label>
                <div
                  className={`w-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-5 transition-colors cursor-pointer ${
                    file
                      ? "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10"
                      : "border-slate-300 dark:border-surface-600 bg-slate-50 dark:bg-surface-800/50 hover:bg-slate-100 dark:hover:bg-surface-800"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    accept="image/*,.pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  {file ? (
                    <>
                      <FileText className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mb-2" />
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 text-center truncate max-w-xs">
                        {file.name}
                      </p>
                      <p className="text-[10px] font-semibold text-emerald-600/70 dark:text-emerald-400/70 mt-1 uppercase">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • Toca para cambiar
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-surface-700 flex items-center justify-center text-slate-500 dark:text-slate-400 mb-2">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Subir receta médica o CITT
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        JPG, PNG o PDF (Max. 5MB)
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="pt-2 pb-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full h-12 text-sm"
                  isLoading={isSubmitting}
                >
                  Enviar Solicitud
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
