import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar Sesión",
  description: "Accede al panel de control de AsistControl",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans p-4"
      style={{
        background: "radial-gradient(ellipse at 50% 15%, #0d1e14 0%, #060a07 60%, #020403 100%)",
      }}
    >
      {/* Orbes decorativos sutiles */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />
      {children}
    </div>
  );
}
