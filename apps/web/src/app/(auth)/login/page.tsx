"use client";

import { useState, useTransition, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { PresenxaIcon } from "@/components/ui/PresenxaLogo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotInfo, setShowForgotInfo] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        if (result.error.includes("RATE_LIMIT_EXCEEDED") || result.code === "RATE_LIMIT_EXCEEDED") {
          setError("Bloqueo de 5 min ante intentos fallidos reiterados.");
        } else {
          setError("Email o contraseña incorrectos.");
        }
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
    <div className="w-full max-w-[440px]">
      {/* Authentication Card */}
      <div className="relative rounded-3xl bg-white/95 dark:bg-surface-900/90 border border-surface-200/90 dark:border-surface-800 p-7 sm:p-9 backdrop-blur-2xl shadow-xl transition-colors">
        {/* Glow accents inside card header */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-primary-500/60 to-transparent rounded-full"></div>
        
        {/* Card Header: Biometric & QR Brand Emblem */}
        <div className="flex flex-col items-center text-center">
          <div className="relative flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-b from-primary-50 to-white dark:from-primary-950/60 dark:to-surface-950 border border-primary-500/25 ring-1 ring-inset ring-white/70 dark:ring-white/5 shadow-[0_8px_24px_-6px_rgba(0,166,80,0.25)]">
            <PresenxaIcon className="w-9 h-9 drop-shadow-xs" />
          </div>
          <div className="flex items-center justify-center gap-0.5">
            <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-white">Presen<span className="text-primary-500 font-extrabold">x</span>a</h1>
          </div>
          <p className="mt-1 text-xs sm:text-[13px] font-medium text-surface-500 dark:text-surface-400">
            Control de Asistencia Biométrico & QR
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1.5" htmlFor="email">
              Correo electrónico
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400 dark:text-surface-500 group-focus-within:text-primary-500 transition-colors">
                <Mail className="w-4 h-4" aria-hidden="true" />
              </div>
              <input 
                id="email" 
                type="email" 
                autoComplete="email" 
                required 
                disabled={isPending}
                placeholder="correo@empresa.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 text-sm bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-500 shadow-inner focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all duration-150 disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300" htmlFor="password">
                Contraseña
              </label>
              <button
                type="button"
                onClick={() => setShowForgotInfo((prev) => !prev)}
                aria-expanded={showForgotInfo}
                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            {showForgotInfo && (
              <div className="mb-2.5 p-2.5 rounded-xl text-xs text-surface-700 dark:text-surface-300 bg-surface-100 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700">
                Para restablecer tu contraseña, contacta al administrador de tu organización.
              </div>
            )}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400 dark:text-surface-500 group-focus-within:text-primary-500 transition-colors">
                <Lock className="w-4 h-4" aria-hidden="true" />
              </div>
              <input 
                id="password" 
                type={showPassword ? "text" : "password"} 
                autoComplete="current-password"
                required 
                disabled={isPending}
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-11 py-2.5 text-sm bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-500 shadow-inner focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all duration-150 disabled:opacity-50"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                aria-pressed={showPassword}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className={`absolute inset-y-0 right-0 px-3.5 flex items-center rounded-r-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors cursor-pointer ${showPassword ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400 hover:text-surface-600 dark:text-surface-500 dark:hover:text-surface-300'}`}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded accent-primary-500 bg-surface-50 dark:bg-surface-950 border-surface-300 dark:border-surface-700 text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-0 transition cursor-pointer"
              />
              <span className="text-[13px] text-surface-600 dark:text-surface-300">Recordar sesión en este dispositivo</span>
            </label>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl text-xs text-danger-700 dark:text-danger-300 border border-danger-200 dark:border-danger-500/20 bg-danger-50 dark:bg-danger-500/10 flex items-start gap-2.5 animate-[fade-in_0.2s_ease-out]" role="alert">
              <AlertCircle className="w-4 h-4 text-danger-500 dark:text-danger-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isPending}
              className="w-full relative group overflow-hidden py-3 px-4 rounded-xl font-bold text-white bg-primary-500 hover:bg-primary-600 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-900 transition-all duration-200 shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm tracking-tight font-extrabold">Verificando...</span>
                </>
              ) : (
                <>
                  <span className="text-sm tracking-tight font-extrabold">Ingresar al sistema</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
