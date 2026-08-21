"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error caught:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">
        Error al cargar los datos del panel
      </h2>
      <p className="text-sm text-slate-400 max-w-md mb-6">
        No se pudieron obtener las métricas en tiempo real. Esto puede deberse a una intermitencia de conexión o de sesión.
      </p>
      {error?.digest && (
        <p className="text-xs text-slate-500 font-mono mb-4">
          ID: {error.digest}
        </p>
      )}
      <button
        onClick={() => reset()}
        className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Reintentar carga
      </button>
    </div>
  );
}
