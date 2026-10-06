import { existsSync } from "fs";
import { resolve } from "path";
import dotenv from "dotenv";

const envPaths = [
  resolve(__dirname, "../.env"),
  resolve(__dirname, "../../../.env"),
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "packages/db/.env"),
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Iniciando purga de datos mockup / demo...");

  // 1. Eliminar logs de auditoría de prueba
  const deletedLogs = await prisma.auditLog.deleteMany({});
  console.log(`✅ Logs de auditoría eliminados: ${deletedLogs.count}`);

  // 2. Eliminar asistencias de prueba (si hubieran)
  const deletedAttendances = await prisma.attendance.deleteMany({});
  console.log(`✅ Asistencias de prueba eliminadas: ${deletedAttendances.count}`);

  // 3. Eliminar notificaciones y push
  try {
    const notifs = await prisma.notification.deleteMany({});
    console.log(`✅ Notificaciones eliminadas: ${notifs.count}`);
  } catch (e) {
    // Si la tabla no existe o ya está vacía
  }

  // 4. Eliminar asignaciones de horarios de usuarios demo
  const demoUsers = await prisma.user.findMany({
    where: {
      email: { contains: "@demo.com" },
    },
    select: { id: true, email: true },
  });

  const demoUserIds = demoUsers.map((u) => u.id);
  console.log(`🔍 Usuarios demo encontrados: ${demoUsers.map((u) => u.email).join(", ")}`);

  if (demoUserIds.length > 0) {
    await prisma.userSchedule.deleteMany({
      where: { userId: { in: demoUserIds } },
    });
    await prisma.shiftOverride.deleteMany({
      where: { userId: { in: demoUserIds } },
    });

    const deletedUsers = await prisma.user.deleteMany({
      where: { id: { in: demoUserIds } },
    });
    console.log(`✅ Usuarios demo eliminados: ${deletedUsers.count}`);
  }

  // 5. Verificar estado final
  const remainingUsers = await prisma.user.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true },
  });
  const totalAudit = await prisma.auditLog.count();
  const totalAttendances = await prisma.attendance.count();

  console.log("\n=======================================================");
  console.log("✨ RESULTADO DE LA BASE DE DATOS TRAS LA LIMPIEZA:");
  console.log("Organización:", orgs);
  console.log("Usuarios activos restantes:", remainingUsers);
  console.log("Total Asistencias:", totalAttendances);
  console.log("Total Logs de Auditoría:", totalAudit);
  console.log("=======================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Error durante la purga:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
