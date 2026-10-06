import crypto from "crypto";

const DEFAULT_SECRET = (() => {
  const s = process.env.QR_HMAC_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") {
    if (
      process.env.NEXT_PHASE === "phase-production-build" ||
      process.env.npm_lifecycle_event === "build" ||
      process.env.STANDALONE === "1"
    ) {
      return "build-time-dummy-qr-secret";
    }
    throw new Error("FATAL: QR_HMAC_SECRET no configurado en producción");
  }
  return s || "dev-qr-hmac-secret-not-for-prod";
})();
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
  maxAgeSeconds: number = 90, // Por defecto: 90 segundos de vigencia para el QR dinámico en pantalla
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

  // 2. Verificar caducidad por tiempo (Anti-Capturas de pantalla)
  const nowSeconds = Math.floor(Date.now() / 1000);
  const ageSeconds = nowSeconds - timestamp;

  // Permitir pequeño margen de tolerancia hacia el futuro por desincronización de relojes (hasta 15s)
  if (ageSeconds < -15) {
    return {
      isValid: false,
      error: "El reloj del dispositivo emisor del QR está desincronizado con el servidor.",
    };
  }

  if (ageSeconds > maxAgeSeconds) {
    const mins = Math.floor(ageSeconds / 60);
    return {
      isValid: false,
      isExpired: true,
      userId,
      qrToken,
      issuedAt: new Date(timestamp * 1000),
      error: `El código QR ha expirado (${mins > 0 ? `hace ${mins} min` : `hace ${ageSeconds}s`}). Por favor abre tu app para generar un QR en vivo.`,
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
