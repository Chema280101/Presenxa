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
          background: "rgba(16, 42, 67, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderColor: "rgba(163, 230, 53, 0.15)",
        }}
      >
        {/* Logo y título */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/brand/isotipo-secundario.svg"
            alt="Presenxa"
            className="w-16 h-16 rounded-2xl object-contain mb-3 shadow-lg shadow-black/50 ring-1 ring-lime-400/30"
          />
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">
            Presen<span className="text-lime-400">xa</span>
          </h1>
          <p className="text-xs text-slate-300 font-medium">
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
                         bg-white/5 border border-white/15 outline-none
                         focus:border-lime-400 focus:ring-1 focus:ring-lime-400/50
                         disabled:opacity-50 transition-colors"
            />
          </div>

          {/* Campo contraseña */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-xs font-semibold text-slate-300"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isPending}
              className="w-full px-4 py-3 rounded-2xl text-sm text-white placeholder-slate-500
                         bg-white/5 border border-white/15 outline-none
                         focus:border-lime-400 focus:ring-1 focus:ring-lime-400/50
                         disabled:opacity-50 transition-colors"
            />
          </div>

          {/* Mensaje de error */}
          {error && (
            <div
              className="p-3.5 rounded-2xl text-xs text-red-300 border border-red-500/20
                         bg-red-500/10 flex items-start gap-2.5 animate-[fade-in_0.2s_ease-out]"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Botón submit */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3.5 px-4 rounded-2xl text-sm font-bold text-slate-950
                       gradient-brand shadow-lg shadow-lime-950/40 hover:opacity-95 hover:scale-[1.01] active:scale-[0.99]
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
                       transition-all duration-200 flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Verificando acceso...</span>
              </>
            ) : (
              "Ingresar al sistema"
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-slate-400 mt-5 font-medium">
        Presenxa &copy; {new Date().getFullYear()} · Sistema Inteligente de Asistencia
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
