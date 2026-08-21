/**
 * Seed script — popula la base de datos con datos de prueba realistas.
 * Ejecutar: pnpm db:seed
 */
import { PrismaClient, OrgType, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

async function main() {
  console.log("🌱 Iniciando seed...");

  // ── Organización ─────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "empresa-demo" },
    update: {},
    create: {
      name: "Empresa Demo S.A.C.",
      type: OrgType.EMPRESA,
      slug: "empresa-demo",
      settings: {
        timezone: "America/Lima",
      },
    },
  });
  console.log(`✅ Organización: ${org.name}`);

  // ── Sede ──────────────────────────────────────────────────────
  const location = await prisma.location.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      organizationId: org.id,
      name: "Sede Central Lima",
      address: "Av. Javier Prado Este 123, San Isidro, Lima",
      timezone: "America/Lima",
    },
  });
  console.log(`✅ Sede: ${location.name}`);

  // ── Kiosk ─────────────────────────────────────────────────────
  const kiosk = await prisma.kiosk.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      locationId: location.id,
      name: "Kiosk Principal — Recepción",
      apiKey: "00000000-0000-0000-0000-000000000003",
    },
  });
  console.log(`✅ Kiosk: ${kiosk.name} | API Key: ${kiosk.apiKey}`);

  // ── Horario estándar ──────────────────────────────────────────
  const schedule = await prisma.schedule.upsert({
    where: { id: "00000000-0000-0000-0000-000000000004" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000004",
      organizationId: org.id,
      name: "Turno Oficina (Lun–Vie 8am–5pm)",
      workdaysMask: 31, // Lunes a Viernes
      entryHour: 8,
      entryMinute: 0,
      exitHour: 17,
      exitMinute: 0,
      toleranceMinutes: 10,
    },
  });
  console.log(`✅ Horario: ${schedule.name}`);

  // ── Usuarios ──────────────────────────────────────────────────
  const users = [
    {
      firstName: "Admin",
      lastName: "Sistema",
      email: "admin@demo.com",
      role: UserRole.ADMIN,
      documentId: "12345678",
    },
    {
      firstName: "Carlos",
      lastName: "Mendoza",
      email: "carlos.mendoza@demo.com",
      role: UserRole.EMPLEADO,
      documentId: "23456789",
    },
    {
      firstName: "Ana",
      lastName: "García",
      email: "ana.garcia@demo.com",
      role: UserRole.EMPLEADO,
      documentId: "34567890",
    },
    {
      firstName: "Luis",
      lastName: "Quispe",
      email: "luis.quispe@demo.com",
      role: UserRole.SUPERVISOR,
      documentId: "45678901",
    },
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        organizationId: org.id,
        locationId: location.id,
        passwordHash: hashPassword("password123"),
      },
    });

    // Asignar horario
    await prisma.userSchedule.create({
      data: {
        userId: user.id,
        scheduleId: schedule.id,
      },
    }).catch(() => {}); // Ignorar si ya existe

    console.log(`✅ Usuario: ${user.firstName} ${user.lastName} | QR: ${user.qrToken}`);
  }

  console.log("\n🎉 Seed completado exitosamente.");
  console.log("\n📋 Credenciales de acceso:");
  console.log("   Admin: admin@demo.com / password123");
  console.log("   Empleado: carlos.mendoza@demo.com / password123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
