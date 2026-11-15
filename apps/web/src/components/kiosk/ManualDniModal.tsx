import React, { useEffect, useRef } from "react";
import { CheckCircle2, Hash, X } from "lucide-react";

interface ManualDniModalProps {
  isOpen: boolean;
  manualInput: string;
  onClose: () => void;
  onChangeInput: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: (e: React.FormEvent) => void;
}

const KEYPAD_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Accessible touch keypad fallback modal for manual 8-digit DNI entry.
 */
export function ManualDniModal({
  isOpen,
  manualInput,
  onClose,
  onChangeInput,
  onSubmit,
}: ManualDniModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const appendDigit = (digit: string) => {
    if (manualInput.length < 8) {
      onChangeInput((prev) => prev + digit);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-dni-title"
      className="fixed inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-[fade-in_0.2s_ease-out]"
    >
      <div className="w-full max-w-md bg-white dark:bg-[#0e1420] border border-slate-200 dark:border-white/15 rounded-3xl p-6 shadow-2xl relative animate-[scale-up_0.2s_ease-out]">
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar teclado manual"
          className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-400/10 border border-primary-200 dark:border-primary-400/30 flex items-center justify-center text-primary-600 dark:text-primary-400 mx-auto mb-3">
            <Hash className="w-6 h-6" aria-hidden="true" />
          </div>
          <h3 id="manual-dni-title" className="text-lg font-bold text-slate-900 dark:text-white">
            Ingreso Manual por DNI
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Digita tus 8 dígitos en el teclado táctil
          </p>
        </div>

        <div className="mb-5">
          <div
            className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-xl py-3 px-4 text-center font-mono text-3xl font-bold tracking-widest min-h-[58px] flex items-center justify-center transition-colors ${manualInput.length > 0
                ? "border-primary-500/50 text-primary-600 dark:border-primary-400/40 dark:text-primary-400"
                : "border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-600"
              }`}
          >
            {manualInput.length > 0 ? manualInput.padEnd(8, "-") : "--------"}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mb-5 font-mono">
          {KEYPAD_DIGITS.map((num) => (
            <button
              key={num}
              onClick={() => appendDigit(String(num))}
              className="py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-primary-500 dark:hover:border-primary-400 text-xl font-bold text-slate-800 dark:text-white active:scale-95 transition-all cursor-pointer"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => onChangeInput("")}
            className="py-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 hover:border-rose-500 text-sm font-bold text-rose-600 dark:text-rose-300 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            BORRAR
          </button>
          <button
            onClick={() => appendDigit("0")}
            className="py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-primary-500 dark:hover:border-primary-400 text-xl font-bold text-slate-800 dark:text-white active:scale-95 transition-all cursor-pointer"
          >
            0
          </button>
          <button
            onClick={() => onChangeInput((prev) => prev.slice(0, -1))}
            className="py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:border-slate-400 dark:hover:border-white text-slate-600 dark:text-slate-300 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            ←
          </button>
        </div>

        <button
          onClick={(e) => onSubmit(e)}
          disabled={manualInput.length < 8}
          className="w-full py-3.5 rounded-xl bg-primary-600 hover:bg-primary-700 dark:bg-primary-400 dark:hover:bg-primary-300 text-white dark:text-slate-950 font-bold text-base shadow-lg shadow-primary-600/30 dark:shadow-[0_0_25px_-4px_rgba(0,166,80,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
          <span>Confirmar Marcación</span>
        </button>
      </div>
    </div>
  );
}
