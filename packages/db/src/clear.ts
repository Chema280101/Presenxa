/**
 * Script para purgar / eliminar todos los datos de prueba y registros mock de la base de datos.
 * Ejecutar con: pnpm db:clear
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Iniciando purga total de datos de prueba y mockups...");

  const deletedGeoPings = await prisma.geoPing.deleteMany();
  console.log(`🗑️ GeoPings eliminados: ${deletedGeoPings.count}`);

  const deletedAuditLogs = await prisma.auditLog.deleteMany();
  console.log(`🗑️ AuditLogs eliminados: ${deletedAuditLogs.count}`);

  const deletedNotifications = await prisma.notification.deleteMany();
  console.log(`🗑️ Notificaciones eliminadas: ${deletedNotifications.count}`);

  const deletedPushSubs = await prisma.pushSubscription.deleteMany();
  console.log(`🗑️ Suscripciones Push eliminadas: ${deletedPushSubs.count}`);

  const deletedAttendances = await prisma.attendance.deleteMany();
  console.log(`🗑️ Asistencias eliminadas: ${deletedAttendances.count}`);

  const deletedUserSchedules = await prisma.userSchedule.deleteMany();
  console.log(`🗑️ Asignaciones de Horarios eliminadas: ${deletedUserSchedules.count}`);

  const deletedUsers = await prisma.user.deleteMany();
  console.log(`🗑️ Usuarios eliminados: ${deletedUsers.count}`);

  const deletedKiosks = await prisma.kiosk.deleteMany();
  console.log(`🗑️ Kiosks eliminados: ${deletedKiosks.count}`);

  const deletedSchedules = await prisma.schedule.deleteMany();
  console.log(`🗑️ Horarios eliminados: ${deletedSchedules.count}`);

  const deletedLocations = await prisma.location.deleteMany();
  console.log(`🗑️ Sedes eliminadas: ${deletedLocations.count}`);

  const deletedOrgs = await prisma.organization.deleteMany();
  console.log(`🗑️ Organizaciones eliminadas: ${deletedOrgs.count}`);

  console.log("\n✨ Base de datos completamente limpia y lista para datos reales.");
}

main()
  .catch((e) => {
    console.error("❌ Error durante la purga:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
