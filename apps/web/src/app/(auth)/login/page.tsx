"use client";

import { useState, useTransition, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      <div className="relative rounded-3xl bg-surface-50/85 dark:bg-surface-900/85 border border-surface-200 dark:border-surface-800 p-7 sm:p-9 backdrop-blur-2xl shadow-xl transition-colors">
        {/* Glow accents inside card header */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-primary-500/60 to-transparent rounded-full"></div>
        
        {/* Card Header: Biometric Target Icon & Title */}
        <div className="flex flex-col items-center text-center">
          <div className="relative flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-surface-100 dark:bg-surface-950 border border-primary-500/30 shadow-[0_0_20px_rgba(0,166,80,0.15)]">
            <div className="absolute inset-0 rounded-2xl border border-primary-400/20 animate-pulse-ring"></div>
            <svg className="w-9 h-9 text-primary-500 dark:text-primary-400" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 36 36">
              <path d="M 9 14 C 9 10, 10 9, 14 9"></path>
              <path d="M 22 9 C 26 9, 27 10, 27 14"></path>
              <path d="M 27 22 C 27 26, 26 27, 22 27"></path>
              <path d="M 14 27 C 10 27, 9 26, 9 22"></path>
              <circle className="animate-ping" cx="18" cy="18" fill="currentColor" r="3" stroke="none" style={{ animationDuration: '3s' }}></circle>
              <circle cx="18" cy="18" fill="currentColor" r="2.5" stroke="none"></circle>
            </svg>
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
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400 dark:text-surface-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
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
              <a className="text-[11px] text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors" href="#">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400 dark:text-surface-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </div>
              <input 
                id="password" 
                type={showPassword ? "text" : "password"} 
                required 
                disabled={isPending}
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-10 py-2.5 text-sm bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-xl text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-500 shadow-inner focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all duration-150 disabled:opacity-50"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute inset-y-0 right-0 pr-3.5 flex items-center focus:outline-none transition-colors ${showPassword ? 'text-primary-500' : 'text-surface-400 hover:text-surface-600 dark:text-surface-500 dark:hover:text-surface-300'}`}
                aria-label="Mostrar u ocultar contraseña"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  {showPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  ) : (
                    <>
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"></path>
                      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round"></path>
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-surface-50 dark:bg-surface-950 border-surface-300 dark:border-surface-700 text-primary-500 focus:ring-primary-500 focus:ring-offset-0 transition" />
              <span className="text-xs text-surface-500 dark:text-surface-400">Recordar sesión en este dispositivo</span>
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
              className="w-full relative group overflow-hidden py-3 px-4 rounded-xl font-bold text-white bg-primary-500 hover:bg-primary-600 active:scale-[0.99] transition-all duration-200 shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm tracking-tight font-extrabold">Verificando...</span>
                </>
              ) : (
                <>
                  <span className="text-sm tracking-tight font-extrabold">Ingresar al sistema</span>
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
                    <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
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
