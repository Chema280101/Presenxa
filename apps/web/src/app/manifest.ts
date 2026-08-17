import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Presenxa — Portal del Empleado",
    short_name: "Presenxa",
    description: "Credencial QR Digital, Control de Asistencia y Geolocalización en Tiempo Real",
    start_url: "/app",
    display: "standalone",
    background_color: "#102a43",
    theme_color: "#a3e635",
    icons: [
      {
        src: "/brand/isotipo-secundario.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/api/icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/api/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
