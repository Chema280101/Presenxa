import { ImageResponse } from "next/og";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeParam } = await params;
  const numSize = parseInt(sizeParam, 10) || 192;
  const size = Math.min(Math.max(numSize, 32), 512);

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: Math.round(size * 0.52),
          background: "#102a43",
          border: `${Math.max(2, Math.round(size * 0.04))}px solid #a3e635`,
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          borderRadius: Math.round(size * 0.24),
          fontWeight: 900,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <span>P</span>
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
}
