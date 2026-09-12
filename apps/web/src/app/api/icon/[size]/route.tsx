import { ImageResponse } from "next/og";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeParam } = await params;
  const numSize = parseInt(sizeParam, 10) || 192;
  const size = Math.min(Math.max(numSize, 32), 512);

  // Requerimos la URL base absoluta para cargar la imagen en ImageResponse
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const logoUrl = `${baseUrl}/brand/logo.png`;

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
          padding: `${Math.round(size * 0.15)}px`, // 15% de margen (padding) para que no quede pegado a los bordes
        }}
      >
        <img
          src={logoUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
}
