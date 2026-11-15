/**
 * Adaptador de almacenamiento Cloud (S3 / Cloudflare R2 / Supabase Storage) con fallback a Base64.
 */
import crypto from "node:crypto";

export interface StorageUploadParams {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  organizationId: string;
  category?: "justifications" | "kiosk-photos" | "logos" | "attachments";
}

export interface StorageUploadResult {
  url: string;
  key?: string;
  provider: "s3" | "inline-base64";
}

interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl?: string;
}

function getS3Config(): S3Config | null {
  const endpoint = process.env.S3_ENDPOINT?.trim().replace(/\/+$/, "");
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    endpoint,
    region: process.env.S3_REGION?.trim() || "auto",
    bucket,
    accessKeyId,
    secretAccessKey,
    publicUrl: process.env.S3_PUBLIC_URL?.trim().replace(/\/+$/, "") || undefined,
  };
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function encodeS3Path(key: string): string {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/**
 * Sube un archivo a Cloudflare R2 / AWS S3 / Supabase S3 usando firma AWS SigV4 nativa.
 * Si no hay variables S3 configuradas en el entorno, realiza fallback transparente a Data URL Base64.
 */
export async function uploadBufferToStorage(
  params: StorageUploadParams
): Promise<StorageUploadResult> {
  const config = getS3Config();
  if (!config) {
    return {
      url: `data:${params.mimeType};base64,${params.buffer.toString("base64")}`,
      provider: "inline-base64",
    };
  }

  const now = new Date();
  const yearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const category = params.category || "attachments";
  const fileUuid = crypto.randomUUID();
  const safeExt = params.extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  const objectKey = `${params.organizationId}/${category}/${yearMonth}/${fileUuid}.${safeExt}`;

  const targetUrl = new URL(`${config.endpoint}/${config.bucket}/${encodeS3Path(objectKey)}`);
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(params.buffer);

  const canonicalHeaders =
    `content-type:${params.mimeType}\n` +
    `host:${targetUrl.host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "PUT",
    targetUrl.pathname,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmacSha256(`AWS4${config.secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, config.region);
  const kService = hmacSha256(kRegion, "s3");
  const kSigning = hmacSha256(kService, "aws4_request");
  const signature = crypto
    .createHmac("sha256", kSigning)
    .update(stringToSign, "utf8")
    .digest("hex");

  const authorizationHeader =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(targetUrl.toString(), {
    method: "PUT",
    headers: {
      "Content-Type": params.mimeType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: authorizationHeader,
    },
    body: new Uint8Array(params.buffer),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Error al subir archivo a Object Storage (${res.status}): ${errText}`);
  }

  const publicUrl = config.publicUrl
    ? `${config.publicUrl}/${encodeS3Path(objectKey)}`
    : targetUrl.toString();

  return {
    url: publicUrl,
    key: objectKey,
    provider: "s3",
  };
}

/**
 * Si un cliente (ej. Kiosk) envía una foto como Data URL Base64 y Object Storage está configurado,
 * la sube a R2/S3 y devuelve la URL pública para no almacenar binarios en PostgreSQL.
 */
export async function offloadDataUrlIfConfigured(
  rawUrl: string | null | undefined,
  organizationId: string,
  category: StorageUploadParams["category"] = "kiosk-photos"
): Promise<string | null | undefined> {
  if (!rawUrl || !rawUrl.startsWith("data:") || !getS3Config()) {
    return rawUrl;
  }

  const match = /^data:([^;]+);base64,(.+)$/i.exec(rawUrl);
  if (!match) return rawUrl;

  const mimeType = match[1].toLowerCase();
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, "base64");
  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "webp";

  const uploaded = await uploadBufferToStorage({
    buffer,
    mimeType,
    extension: ext,
    organizationId,
    category,
  });

  return uploaded.url;
}
