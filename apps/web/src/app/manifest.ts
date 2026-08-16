import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AsistControl — Portal del Empleado",
    short_name: "AsistControl",
    description: "Credencial QR Digital, Control de Asistencia y Geolocalización en Tiempo Real",
    start_url: "/app",
    display: "standalone",
    background_color: "#090d16",
    theme_color: "#6366f1",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
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
