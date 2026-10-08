/**
 * Seed script — popula la base de datos con datos de prueba realistas y reducidos (7 días, alta variabilidad).
 * Ejecutar: pnpm db:seed
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

import { PrismaClient, OrgType, UserRole, AttendanceStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

async function main() {
  console.log("🌱 Iniciando seed con datos variados (1 semana)...");

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

  // ── Horarios ──────────────────────────────────────────────────
  const scheduleNormal = await prisma.schedule.upsert({
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

  const schedulePartTime = await prisma.schedule.upsert({
    where: { id: "00000000-0000-0000-0000-000000000005" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000005",
      organizationId: org.id,
      name: "Turno Part-Time (Lun-Vie 9am-1pm)",
      workdaysMask: 31,
      entryHour: 9,
      entryMinute: 0,
      exitHour: 13,
      exitMinute: 0,
      toleranceMinutes: 10,
    },
  });
  console.log(`✅ Horarios creados (Normal y Part-Time)`);

  // ── Usuarios ──────────────────────────────────────────────────
  const usersData = [
    {
      firstName: "Admin",
      lastName: "Sistema",
      email: "admin@demo.com",
      role: UserRole.ADMIN,
      documentId: "12345678",
      scheduleId: scheduleNormal.id,
      profile: "ADMIN"
    },
    {
      firstName: "Carlos",
      lastName: "Mendoza",
      email: "carlos.mendoza@demo.com",
      role: UserRole.EMPLEADO,
      documentId: "23456789",
      scheduleId: scheduleNormal.id,
      profile: "PUNTUAL"
    },
    {
      firstName: "Ana",
      lastName: "García",
      email: "ana.garcia@demo.com",
      role: UserRole.EMPLEADO,
      documentId: "34567890",
      scheduleId: scheduleNormal.id,
      profile: "PROBLEMATICO"
    },
    {
      firstName: "Luis",
      lastName: "Quispe",
      email: "luis.quispe@demo.com",
      role: UserRole.SUPERVISOR,
      documentId: "45678901",
      scheduleId: schedulePartTime.id,
      profile: "PART_TIME"
    },
  ];

  const dbUsers = [];
  for (const data of usersData) {
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        role: data.role,
        documentId: data.documentId,
        organizationId: org.id,
        locationId: location.id,
        passwordHash: hashPassword("password123"),
      },
    });

    await prisma.userSchedule.create({
      data: {
        userId: user.id,
        scheduleId: data.scheduleId,
      },
    }).catch(() => {});

    dbUsers.push({ ...user, profile: data.profile });
    console.log(`✅ Usuario: ${user.firstName} ${user.lastName} (${data.profile})`);
  }

  // ── Generar Asistencias de Prueba (Últimos 7 días) ───────────
  console.log("⏳ Generando histórico variado de 7 días...");
  const now = new Date();
  
  for (let i = 7; i >= 1; i--) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() - i);
    const dayOfWeek = targetDate.getDay(); 
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Saltar fines de semana

    for (const u of dbUsers) {
      const dateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      let status: AttendanceStatus = AttendanceStatus.PRESENTE;
      let entryHour = 8;
      let entryMin = 0;
      let exitHour = 17;
      let exitMin = 0;
      let lateMinutes = 0;
      let workedMinutes: number | null = null;
      let entryTime: Date | null = null;
      let exitTime: Date | null = null;
      
      const setTimes = () => {
        entryTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), entryHour, entryMin, 0);
        exitTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), exitHour, exitMin, 0);
        workedMinutes = Math.round((exitTime.getTime() - entryTime.getTime()) / 60000);
      };

      if (u.profile === "ADMIN") {
        // Admin es siempre puntual normal
        entryHour = 7;
        entryMin = 50;
        exitHour = 17;
        exitMin = 10;
        setTimes();
      } else if (u.profile === "PUNTUAL") {
        // Carlos siempre puntual
        entryHour = 7;
        entryMin = 55;
        exitHour = 17;
        exitMin = 5;
        setTimes();
      } else if (u.profile === "PART_TIME") {
        // Luis part time (9 a 13)
        if (i === 3) {
           // Un día de descanso médico
           status = AttendanceStatus.DESCANSO_MEDICO;
           entryTime = null;
           exitTime = null;
           workedMinutes = null;
        } else if (i === 5) {
           // Un día justificado
           status = AttendanceStatus.JUSTIFICADO;
           entryTime = null;
           exitTime = null;
           workedMinutes = null;
        } else {
           entryHour = 8;
           entryMin = 50;
           exitHour = 13;
           exitMin = 10;
           setTimes();
        }
      } else if (u.profile === "PROBLEMATICO") {
        // Ana: varios problemas
        if (i === 7) {
          // Día 7: Tarde
          status = AttendanceStatus.TARDE;
          entryHour = 8;
          entryMin = 35; // 35 min de retraso (tol 10)
          exitHour = 17;
          exitMin = 0;
          lateMinutes = 25;
          setTimes();
        } else if (i === 6) {
          // Día 6: Ausente
          status = AttendanceStatus.AUSENTE;
          entryTime = null;
          exitTime = null;
          workedMinutes = null;
        } else if (i === 5) {
          // Día 5: Incompleto (olvidó marcar salida)
          status = AttendanceStatus.INCOMPLETO;
          entryHour = 7;
          entryMin = 50;
          entryTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), entryHour, entryMin, 0);
          exitTime = null;
          workedMinutes = null;
        } else {
          // Otros días normal pero justo en el límite
          entryHour = 8;
          entryMin = 5;
          exitHour = 17;
          exitMin = 0;
          setTimes();
        }
      }

      await prisma.attendance.upsert({
        where: {
          userId_date: {
            userId: u.id,
            date: dateOnly,
          },
        },
        update: {},
        create: {
          userId: u.id,
          locationId: location.id,
          kioskId: kiosk.id,
          date: dateOnly,
          entryTime,
          exitTime,
          status: status,
          lateMinutes: lateMinutes > 0 ? lateMinutes : null,
          workedMinutes,
          notes: status === AttendanceStatus.JUSTIFICADO ? "Problemas familiares reportados" : null
        },
      });
    }
  }
  console.log("✅ Histórico variado generado correctamente.");

  console.log("\n🎉 Seed completado exitosamente.");
  console.log("\n📋 Credenciales de acceso:");
  console.log("   Admin: admin@demo.com / password123");
  console.log("   Empleado Puntual: carlos.mendoza@demo.com / password123");
  console.log("   Empleado Problemático: ana.garcia@demo.com / password123");
  console.log("   Supervisor Part-Time: luis.quispe@demo.com / password123");
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
