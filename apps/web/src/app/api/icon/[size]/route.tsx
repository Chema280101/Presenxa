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
          fontSize: Math.round(size * 0.5),
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          borderRadius: Math.round(size * 0.22),
          fontWeight: 900,
          boxShadow: "inset 0 2px 8px rgba(255,255,255,0.3)",
        }}
      >
        A
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
}
