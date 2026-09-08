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

import { PrismaClient, OrgType, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("\n⏳ Creando registros en Supabase...");

  const orgName = "Mi Empresa";
  const orgSlug = "mi-empresa";
  const orgType = OrgType.EMPRESA;
  const locationName = "Sede Central";
  const locationAddress = "Av. Principal 123";
  const entryHourStr = "8";
  const exitHourStr = "17";
  const adminFirst = "Admin";
  const adminLast = "Principal";
  const adminEmail = "admin@tuempresa.com";
  const adminPass = "Admin2026*";

  // Crear Organización
  const org = await prisma.organization.create({
    data: {
      name: orgName,
      type: orgType,
      slug: orgSlug,
      settings: {
        timezone: "America/Lima",
      },
    },
  });
  console.log(`✅ Organización creada: ${org.name} (ID: ${org.id})`);

  // Crear Sede
  const location = await prisma.location.create({
    data: {
      organizationId: org.id,
      name: locationName,
      address: locationAddress,
      timezone: "America/Lima",
    },
  });
  console.log(`✅ Sede creada: ${location.name}`);

  // Crear Horario
  const schedule = await prisma.schedule.create({
    data: {
      organizationId: org.id,
      name: `Turno Estándar (${entryHourStr}:00 - ${exitHourStr}:00)`,
      workdaysMask: 31, // Lun a Vie
      entryHour: parseInt(entryHourStr, 10) || 8,
      entryMinute: 0,
      exitHour: parseInt(exitHourStr, 10) || 17,
      exitMinute: 0,
      toleranceMinutes: 10,
    },
  });
  console.log(`✅ Horario creado: ${schedule.name}`);

  // Crear Kiosk inicial
  const kiosk = await prisma.kiosk.create({
    data: {
      locationId: location.id,
      name: "Kiosk Recepción Principal",
    },
  });
  console.log(`✅ Kiosk creado: ${kiosk.name} (API Key: ${kiosk.apiKey})`);

  // Crear Super Admin
  const passwordHash = bcrypt.hashSync(adminPass, 12);
  const admin = await prisma.user.create({
    data: {
      organizationId: org.id,
      locationId: location.id,
      firstName: adminFirst,
      lastName: adminLast,
      email: adminEmail.toLowerCase().trim(),
      role: UserRole.SUPER_ADMIN,
      passwordHash,
    },
  });

  // Asignar horario al admin
  await prisma.userSchedule.create({
    data: {
      userId: admin.id,
      scheduleId: schedule.id,
    },
  });

  console.log(`✅ Administrador creado: ${admin.firstName} ${admin.lastName} (${admin.email})`);
}

main()
  .catch((e) => {
    console.error("❌ Error en la inicialización:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
