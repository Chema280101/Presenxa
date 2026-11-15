import { NextResponse } from "next/server";
import { auth } from "@/auth";
import sharp from "sharp";
import { uploadBufferToStorage } from "@/lib/storage";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB
const MAX_PDF_SIZE = 2.5 * 1024 * 1024; // 2.5 MB
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo válido" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "El archivo supera el límite máximo permitido de 4 MB" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (file.type === "application/pdf") {
      if (file.size > MAX_PDF_SIZE) {
        return NextResponse.json(
          { error: "Los documentos PDF no pueden superar los 2.5 MB" },
          { status: 400 }
        );
      }

      const header = buffer.subarray(0, 5).toString("utf8");
      if (!header.startsWith("%PDF-")) {
        return NextResponse.json(
          { error: "El archivo PDF está dañado o no es válido" },
          { status: 400 }
        );
      }

      const uploaded = await uploadBufferToStorage({
        buffer,
        mimeType: "application/pdf",
        extension: "pdf",
        organizationId: session.user.organizationId || "default",
        category: "justifications",
      });

      return NextResponse.json({
        url: uploaded.url,
        fileName: file.name,
        mimeType: "application/pdf",
        size: buffer.length,
        provider: uploaded.provider,
      });
    }

    if (ALLOWED_IMAGE_TYPES.has(file.type)) {
      const optimizedBuffer = await sharp(buffer)
        .rotate()
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const uploaded = await uploadBufferToStorage({
        buffer: optimizedBuffer,
        mimeType: "image/webp",
        extension: "webp",
        organizationId: session.user.organizationId || "default",
        category: "attachments",
      });

      return NextResponse.json({
        url: uploaded.url,
        fileName: file.name,
        mimeType: "image/webp",
        size: optimizedBuffer.length,
        provider: uploaded.provider,
      });
    }

    return NextResponse.json(
      { error: "Formato no soportado. Usa PDF, JPG, PNG o WebP." },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Upload API] Error:", error);
    return NextResponse.json(
      { error: "Error al procesar el archivo adjunto" },
      { status: 500 }
    );
  }
}
