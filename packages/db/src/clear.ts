/**
 * Script para purgar / eliminar todos los datos de prueba y registros mock de la base de datos.
 * Ejecutar con: pnpm db:clear
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function safeDelete(name: string, deleteFn: () => Promise<{ count: number }>) {
  try {
    const res = await deleteFn();
    console.log(`🗑️ ${name} eliminados: ${res.count}`);
  } catch (err: any) {
    if (err.code === "P2021") {
      console.log(`ℹ️ ${name}: La tabla aún no existe en la base de datos (omitida).`);
    } else {
      console.warn(`⚠️ Error eliminando ${name}:`, err.message || err);
    }
  }
}

async function main() {
  console.log("🧹 Iniciando purga total de datos en Supabase...");

  await safeDelete("GeoPings", () => prisma.geoPing.deleteMany());
  await safeDelete("AuditLogs", () => prisma.auditLog.deleteMany());
  await safeDelete("Notificaciones", () => prisma.notification.deleteMany());
  await safeDelete("Suscripciones Push", () => prisma.pushSubscription.deleteMany());
  await safeDelete("Asistencias", () => prisma.attendance.deleteMany());
  await safeDelete("Asignaciones de Horarios", () => prisma.userSchedule.deleteMany());
  await safeDelete("Usuarios", () => prisma.user.deleteMany());
  await safeDelete("Kiosks", () => prisma.kiosk.deleteMany());
  await safeDelete("Horarios", () => prisma.schedule.deleteMany());
  await safeDelete("Sedes", () => prisma.location.deleteMany());
  await safeDelete("Organizaciones", () => prisma.organization.deleteMany());

  console.log("\n✨ Base de datos completamente limpia y lista para datos reales.");
}

main()
  .catch((e) => {
    console.error("❌ Error inesperado durante la purga:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
