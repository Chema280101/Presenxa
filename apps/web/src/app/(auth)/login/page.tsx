"use client";

import { useState, useTransition, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email o contraseña incorrectos.");
        return;
      }

      // Redirección post login
      if (callbackUrl && callbackUrl !== "/") {
        router.push(callbackUrl);
      } else {
        router.push("/");
      }
      router.refresh();
    });
  };

  return (
    <div className="w-full max-w-md">
      {/* Card principal */}
      <div
        className="rounded-3xl p-8 shadow-2xl shadow-black/80 border animate-[fade-in-up_0.35s_ease-out]"
        style={{
          background: "rgba(11, 20, 13, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderColor: "rgba(34, 197, 94, 0.15)",
        }}
      >
        {/* Logo y título */}
        <div className="flex flex-col items-center mb-8">
          <div className="gradient-brand w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-950/60 mb-4 ring-1 ring-emerald-400/20">
            <ShieldCheck className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
            AsistControl
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Control de Asistencia Biométrico & QR
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4" id="login-form">
          {/* Campo email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-slate-300">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@empresa.com"
              disabled={isPending}
              className="w-full px-4 py-3 rounded-2xl text-sm text-white placeholder-slate-500
                         bg-black/30 border border-white/10 outline-none
                         focus:border-primary-500 focus:ring-1 focus:ring-primary-500
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200 font-sans"
            />
          </div>

          {/* Campo contraseña */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-semibold text-slate-300">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isPending}
                className="w-full px-4 py-3 pr-12 rounded-2xl text-sm text-white placeholder-slate-500
                           bg-black/30 border border-white/10 outline-none
                           focus:border-primary-500 focus:ring-1 focus:ring-primary-500
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200 font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400
                           hover:text-slate-200 transition-colors cursor-pointer"
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div
              className="flex items-center gap-2.5 px-4 py-3 rounded-2xl
                         bg-danger-500/15 border border-danger-500/30 text-danger-300 text-xs font-medium animate-[shake_0.3s_ease-in-out]"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Botón de submit */}
          <button
            id="login-submit"
            type="submit"
            disabled={isPending}
            className="w-full gradient-brand py-3.5 rounded-2xl text-white font-bold text-sm
                       shadow-lg shadow-emerald-950/60 hover:opacity-95 active:scale-[0.98]
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
                       transition-all duration-200 flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando acceso...</span>
              </>
            ) : (
              "Ingresar al sistema"
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-slate-500 mt-5 font-medium">
        AsistControl &copy; {new Date().getFullYear()} · Sistema Inteligente de Asistencia
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
