"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { KeyRound, X, Save, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/providers/ToastProvider";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();

  // Password validation rules
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasNumber && hasSpecial;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error("Por favor completa ambos campos.");
      return;
    }
    if (!isPasswordValid) {
      toast.error("La nueva contraseña no cumple los requisitos.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("¡Contraseña actualizada exitosamente!");
        setCurrentPassword("");
        setNewPassword("");
        onClose();
      } else {
        toast.error(data.error || "No se pudo cambiar la contraseña.");
      }
    } catch (err) {
      toast.error("Error de conexión al cambiar la contraseña.");
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-surface-900/60 dark:bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative bg-white dark:bg-surface-900 rounded-3xl w-full max-w-md shadow-2xl border border-surface-200 dark:border-surface-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-surface-900 dark:text-white uppercase tracking-wide">Cambiar Contraseña</h2>
              <p className="text-[11px] text-surface-500 dark:text-surface-400 font-medium">Actualiza tus credenciales de acceso</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Current Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300">
              Contraseña Actual <span className="text-danger-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Ingresa tu contraseña actual"
                className="w-full rounded-xl px-4 py-2.5 bg-surface-50 dark:bg-surface-950/50 border border-surface-200 dark:border-surface-800 text-surface-900 dark:text-surface-100 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors cursor-pointer"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300">
              Nueva Contraseña <span className="text-danger-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Escribe tu nueva contraseña"
                className="w-full rounded-xl px-4 py-2.5 bg-surface-50 dark:bg-surface-950/50 border border-surface-200 dark:border-surface-800 text-surface-900 dark:text-surface-100 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors cursor-pointer"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            {/* Inline validation */}
            <div className="mt-2 space-y-1 p-3 rounded-xl bg-surface-50 dark:bg-surface-900/50 border border-surface-100 dark:border-surface-800">
              <p className="text-[10px] font-semibold text-surface-600 dark:text-surface-400 mb-1.5 uppercase tracking-wide">La contraseña debe tener:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-success-600 dark:text-success-400' : 'text-surface-500 dark:text-surface-500'}`}>
                  {hasMinLength ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5 opacity-60" />}
                  <span>Mín. 8 caracteres</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-success-600 dark:text-success-400' : 'text-surface-500 dark:text-surface-500'}`}>
                  {hasNumber ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5 opacity-60" />}
                  <span>Un número (0-9)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-success-600 dark:text-success-400' : 'text-surface-500 dark:text-surface-500'}`}>
                  {hasSpecial ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5 opacity-60" />}
                  <span>Un símbolo (@#$%)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-surface-100 dark:border-surface-800 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              disabled={!currentPassword || !isPasswordValid || isLoading}
              icon={<Save className="w-4 h-4" />}
            >
              Guardar Contraseña
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
