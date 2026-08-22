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
    default: "Presenxa — Control de Asistencia Inteligente",
    template: "%s | Presenxa",
  },
  description:
    "Presenxa: Sistema inteligente de control de asistencia biométrico, QR dinámico y geocercas GPS en tiempo real.",
  keywords: ["presenxa", "asistencia", "control", "geofencing", "qr", "empresa", "biometrico"],
  icons: {
    icon: "/brand/isotipo-secundario.svg",
    apple: "/brand/isotipo-secundario.svg",
  },
};

import { SessionProvider } from "@/components/providers/SessionProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={plusJakartaSans.variable} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
