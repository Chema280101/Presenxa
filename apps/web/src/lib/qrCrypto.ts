import crypto from "crypto";

const DEFAULT_SECRET = process.env.QR_HMAC_SECRET || process.env.NEXTAUTH_SECRET || "asistcontrol-secret-qr-key-2026";
const DEFAULT_EXPIRATION_DAYS = 60; // 60 días de vigencia para el token firmado

export interface VerifiedQrPayload {
  isValid: boolean;
  userId?: string;
  qrToken?: string;
  issuedAt?: Date;
  isExpired?: boolean;
  error?: string;
}

/**
 * Genera un payload de código QR firmado digitalmente con HMAC-SHA256.
 * Formato: v1.<userId>.<qrToken>.<timestamp>.<hmacSignature>
 */
export function generateSignedQrPayload(
  userId: string,
  qrToken: string,
  secret: string = DEFAULT_SECRET
): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const dataToSign = `v1:${userId}:${qrToken}:${timestamp}`;
  const hmac = crypto.createHmac("sha256", secret).update(dataToSign).digest("hex");

  return `v1.${userId}.${qrToken}.${timestamp}.${hmac}`;
}

/**
 * Determina si una cadena escaneada sigue el estándar firmado de AsistControl.
 */
export function isSignedQrPayload(rawPayload: string): boolean {
  return typeof rawPayload === "string" && rawPayload.startsWith("v1.");
}

/**
 * Valida la autenticidad e integridad de un payload QR escaneado.
 */
export function verifySignedQrPayload(
  rawPayload: string,
  maxAgeDays: number = DEFAULT_EXPIRATION_DAYS,
  secret: string = DEFAULT_SECRET
): VerifiedQrPayload {
  if (!rawPayload || typeof rawPayload !== "string") {
    return { isValid: false, error: "Payload QR vacío o no válido" };
  }

  const parts = rawPayload.trim().split(".");
  if (parts.length !== 5 || parts[0] !== "v1") {
    return { isValid: false, error: "Estructura de firma QR no compatible" };
  }

  const [, userId, qrToken, timestampStr, providedSignature] = parts;
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(timestamp)) {
    return { isValid: false, error: "Marca de tiempo del QR corrupta" };
  }

  // 1. Verificar firma HMAC
  const dataToSign = `v1:${userId}:${qrToken}:${timestamp}`;
  const expectedSignature = crypto.createHmac("sha256", secret).update(dataToSign).digest("hex");

  // Comparación segura en tiempo constante contra timing attacks
  const isSignatureMatch =
    providedSignature.length === expectedSignature.length &&
    crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature));

  if (!isSignatureMatch) {
    return { isValid: false, error: "Firma criptográfica inválida o QR adulterado" };
  }

  // 2. Verificar caducidad por tiempo
  const nowSeconds = Math.floor(Date.now() / 1000);
  const ageSeconds = nowSeconds - timestamp;
  const maxAgeSeconds = maxAgeDays * 24 * 60 * 60;

  if (ageSeconds > maxAgeSeconds) {
    return {
      isValid: false,
      isExpired: true,
      userId,
      qrToken,
      issuedAt: new Date(timestamp * 1000),
      error: `El código QR ha expirado (emitido hace más de ${maxAgeDays} días). Por favor solicita una renovación.`,
    };
  }

  return {
    isValid: true,
    userId,
    qrToken,
    issuedAt: new Date(timestamp * 1000),
    isExpired: false,
  };
}
