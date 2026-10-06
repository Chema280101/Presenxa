/**
 * Script interactivo para crear tu primera Organización, Sede y Usuario Administrador real.
 * Ejecutar: pnpm db:init
 */
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
import readline from "readline";

const prisma = new PrismaClient();

function ask(question: string, defaultValue: string = ""): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function main() {
  console.log("\n=======================================================");
  console.log(" 🚀 AsistControl — Inicialización de Empresa y Admin");
  console.log("=======================================================\n");

  // 1. Datos de la Organización
  const orgName = await ask("1. Nombre de tu Empresa", "Mi Empresa");
  const orgSlug = orgName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const orgType = OrgType.EMPRESA;

  // 2. Datos de la Sede Principal
  const locationName = await ask("2. Nombre de la Sede Principal", "Sede Central");
  const locationAddress = await ask("Dirección de la Sede", "Av. Principal 123");

  // 3. Horario Estándar
  const entryHourStr = await ask("3. Hora de entrada laboral (formato 24h, ej: 8)", "8");
  const exitHourStr = await ask("Hora de salida laboral (formato 24h, ej: 17)", "17");

  // 4. Usuario Administrador
  const adminFirst = await ask("4. Nombre del Administrador", "Admin");
  const adminLast = await ask("Apellido del Administrador", "Principal");
  const adminEmail = await ask("Correo electrónico del Administrador", "admin@tuempresa.com");
  const adminPass = await ask("Contraseña para el Administrador", "Admin2026*");

  console.log("\n⏳ Creando registros en Supabase...");

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

  console.log("\n=======================================================");
  console.log(" 🎉 ¡Inicialización completada con éxito en Supabase!");
  console.log("=======================================================");
  console.log(`\n📋 Credenciales de Acceso para Vercel:`);
  console.log(`   URL: https://tu-proyecto.vercel.app/login`);
  console.log(`   Usuario:    ${admin.email}`);
  console.log(`   Contraseña: ${adminPass}`);
  console.log(`   Kiosk API Key: ${kiosk.apiKey}\n`);
}

main()
  .catch((e) => {
    console.error("❌ Error en la inicialización:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
