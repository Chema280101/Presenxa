/**
 * instrumentation.ts — Validación de seguridad al arrancar Next.js
 *
 * Este archivo es el hook de startup oficial de Next.js (desde v13.4).
 * Se ejecuta UNA SOLA VEZ al iniciar el servidor (server-side only).
 * Documentación: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * ⚠️ Si se detectan valores "dev-*" en producción, el servidor arranca en
 *    modo advertencia pero NO se cae (para no interrumpir CI/CD sin aviso).
 *    En un deploy real se debería lanzar process.exit(1) si se requiere estricto.
 */
export async function register() {
  // Solo validar en el runtime de Node.js (no en Edge)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) return; // En dev los secretos de prueba son aceptables

  const DEV_PLACEHOLDER_PATTERN = /^dev-/i;

  const criticalSecrets: Array<{ name: string; value: string | undefined }> = [
    { name: "NEXTAUTH_SECRET",   value: process.env.NEXTAUTH_SECRET },
    { name: "QR_HMAC_SECRET",    value: process.env.QR_HMAC_SECRET },
    { name: "CRON_SECRET",       value: process.env.CRON_SECRET },
    { name: "VAPID_PRIVATE_KEY", value: process.env.VAPID_PRIVATE_KEY },
  ];

  const issues: string[] = [];

  for (const secret of criticalSecrets) {
    if (!secret.value) {
      issues.push(`  ❌ ${secret.name}: no está definida`);
    } else if (DEV_PLACEHOLDER_PATTERN.test(secret.value)) {
      issues.push(`  ❌ ${secret.name}: usa el valor de desarrollo ("${secret.value.slice(0, 10)}...") en producción`);
    } else if (secret.value.length < 20) {
      issues.push(`  ⚠️  ${secret.name}: parece demasiado corta (${secret.value.length} chars). Usa al menos 32 chars aleatorios.`);
    }
  }

  if (issues.length > 0) {
    const separator = "═".repeat(60);
    console.error(`\n${separator}`);
    console.error("🚨  ADVERTENCIA DE SEGURIDAD — AsistControl");
    console.error(separator);
    console.error("   Las siguientes variables de entorno tienen valores inseguros");
    console.error("   en un entorno de PRODUCCIÓN:\n");
    issues.forEach((msg) => console.error(msg));
    console.error("\n   Genera valores seguros con:");
    console.error("   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
    console.error(`${separator}\n`);

    // En producción, detener el servidor si los secretos no son seguros
    throw new Error("Abortando: secrets de producción no configurados correctamente.");
  } else {
    console.log("[AsistControl] ✅ Validación de secrets de producción: OK");
  }
}
