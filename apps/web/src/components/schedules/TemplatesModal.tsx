"use client";

import { useState, useEffect } from "react";
import { Calendar, Copy, Loader2, Clock } from "lucide-react";
import { ModalShell } from "@/components/ui/ModalShell";

interface ScheduleItem {
  id: string;
  name: string;
  workdaysMask: number;
  entryHour: number;
  entryMinute: number;
  exitHour: number;
  exitMinute: number;
  toleranceMinutes: number;
  isSplit?: boolean;
  entryHour2?: number | null;
  entryMinute2?: number | null;
  exitHour2?: number | null;
  exitMinute2?: number | null;
  toleranceMinutes2?: number | null;
}

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: ScheduleItem) => void;
}

export function TemplatesModal({ isOpen, onClose, onSelectTemplate }: TemplatesModalProps) {
  const [templates, setTemplates] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/schedules?templates=true");
      const data = await res.json();
      if (data.schedules) {
        setTemplates(data.schedules);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Plantillas Base"
      description="Selecciona una plantilla para crear un nuevo horario."
      icon={Calendar}
      iconVariant="primary"
      maxWidth="2xl"
    >
      <div className="flex flex-col max-h-[60vh] overflow-y-auto custom-scrollbar py-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-4" />
            <p className="text-sm text-surface-500 dark:text-slate-400">Cargando plantillas...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 bg-surface-50 dark:bg-white/5 rounded-2xl border border-dashed border-surface-200 dark:border-white/10">
            <Calendar className="w-12 h-12 text-surface-400 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-surface-700 dark:text-slate-300 font-semibold mb-1">No hay plantillas guardadas</p>
            <p className="text-xs text-surface-500 dark:text-slate-500">Crea un horario y marca la opción "Guardar como Plantilla Base"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {templates.map(tpl => (
              <div 
                key={tpl.id} 
                className="p-4 bg-white dark:bg-white/5 border border-surface-200 dark:border-white/10 rounded-2xl flex items-center justify-between group hover:bg-surface-50 dark:hover:bg-white/10 transition-colors shadow-sm"
              >
                <div>
                  <h3 className="font-bold text-surface-900 dark:text-white mb-1">{tpl.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-surface-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5" /> 
                      {String(tpl.entryHour).padStart(2,'0')}:{String(tpl.entryMinute).padStart(2,'0')} - {String(tpl.exitHour).padStart(2,'0')}:{String(tpl.exitMinute).padStart(2,'0')}
                    </span>
                    {tpl.isSplit && <span className="px-1.5 py-0.5 rounded bg-info-100 dark:bg-info-500/20 text-info-700 dark:text-info-300 font-medium">Partido</span>}
                  </div>
                </div>
                <button 
                  onClick={() => {
                    onSelectTemplate(tpl);
                    onClose();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-500/20 hover:bg-primary-100 dark:hover:bg-primary-500 text-primary-700 dark:text-primary-300 dark:hover:text-white rounded-xl transition-all text-sm font-semibold cursor-pointer border border-primary-100 dark:border-transparent"
                >
                  <Copy className="w-4 h-4" />
                  <span>Usar Plantilla</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
