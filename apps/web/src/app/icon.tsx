import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  let logoData;
  try {
    // Intentar buscar en root/apps/web/public (si se corre desde la raíz del monorepo)
    logoData = readFileSync(join(process.cwd(), "apps/web/public/brand/logo.png"));
  } catch (e) {
    try {
      // Intentar buscar en root/public (si se corre desde apps/web)
      logoData = readFileSync(join(process.cwd(), "public/brand/logo.png"));
    } catch (e2) {
      // Fallback a un pixel transparente si no se encuentra (para no romper el build/render)
      logoData = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
    }
  }
  
  const logoBase64 = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: "#ffffff",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "4px", // Margen para que no toque los bordes del favicon
        }}
      >
        <img
          src={logoBase64}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
    ),
    { ...size }
  );
}
