import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AsistControl — Control de Asistencia Inteligente",
    template: "%s | AsistControl",
  },
  description:
    "Sistema inteligente de control de asistencia con QR y geofencing para empresas y colegios.",
  keywords: ["asistencia", "control", "geofencing", "qr", "empresa", "colegio"],
};

import { SessionProvider } from "@/components/providers/SessionProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={plusJakartaSans.variable}>
      <body className="antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
