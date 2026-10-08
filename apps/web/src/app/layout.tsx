import type { Metadata } from "next";
import { Outfit, Work_Sans } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin"],
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
import { ThemeProvider } from "@/components/providers/ThemeProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${outfit.variable} ${workSans.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var n=new Date(),h=n.getHours(),isNight=h>=19||h<6;var r=new Date(n);if(isNight&&h<6)r.setDate(r.getDate()-1);var y=r.getFullYear(),m=String(r.getMonth()+1).padStart(2,'0'),d=String(r.getDate()).padStart(2,'0');var slotId=(isNight?'night_':'day_')+y+'-'+m+'-'+d;var eff=isNight?'dark':'light';var raw=localStorage.getItem('presenxa_theme_override');if(raw){var p=JSON.parse(raw);if(p&&p.slotId===slotId&&(p.theme==='light'||p.theme==='dark'))eff=p.theme;}localStorage.setItem('theme',eff);if(eff==='dark'){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased bg-surface-50 text-surface-900 dark:bg-surface-900 dark:text-surface-50" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
