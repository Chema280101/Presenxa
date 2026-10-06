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

import { PrismaClient, OrgType, UserRole, TimeOffType, RequestStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

const names = ["Juan", "Carlos", "Luis", "Ana", "Maria", "Sofia", "Jorge", "Miguel", "Lucia", "Carmen", "Pedro", "Diego", "Rosa", "Elena", "Fernando", "Raul", "Patricia", "Teresa", "Victor", "Andres", "Julio", "Hugo", "Isabel", "Marta", "Roberto"];
const surnames = ["Garcia", "Martinez", "Lopez", "Gonzalez", "Perez", "Rodriguez", "Sanchez", "Ramirez", "Cruz", "Flores", "Gomez", "Morales", "Ortiz", "Gutierrez", "Chavez", "Reyes", "Mendoza", "Aguilar", "Castillo", "Romero", "Vasquez", "Jimenez"];

function getRandomUser(role: UserRole = UserRole.EMPLEADO) {
  const firstName = names[Math.floor(Math.random() * names.length)];
  const lastName = surnames[Math.floor(Math.random() * surnames.length)] + " " + surnames[Math.floor(Math.random() * surnames.length)];
  const email = `${firstName.toLowerCase()}.${lastName.split(" ")[0].toLowerCase()}.${Math.floor(Math.random() * 10000)}@demo.com`.replace(/[^a-z0-9@.]/g, "");
  const documentId = Math.floor(10000000 + Math.random() * 90000000).toString();
  return { firstName, lastName, email, documentId, role };
}

async function main() {
  console.log("🌱 Iniciando seed medio...");

  // ── Organización ─────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "tech-solutions-peru" },
    update: {},
    create: {
      name: "Tech Solutions Perú SAC",
      type: OrgType.EMPRESA,
      slug: "tech-solutions-peru",
      settings: {
        timezone: "America/Lima",
      },
    },
  });
  console.log(`✅ Organización: ${org.name}`);

  // ── Departamentos ─────────────────────────────────────────────
  const deptsData = ["Desarrollo", "Ventas", "Recursos Humanos", "Soporte TI"];
  const departments = [];
  for (const name of deptsData) {
    const dept = await prisma.department.create({
      data: { name, organizationId: org.id },
    });
    departments.push(dept);
  }
  console.log(`✅ Departamentos: ${departments.length}`);

  // ── Sedes ──────────────────────────────────────────────────────
  const locationsData = [
    { name: "Sede Principal Miraflores", address: "Av. Larco 123", timezone: "America/Lima" },
    { name: "Sede Operaciones San Isidro", address: "Av. Navarrete 456", timezone: "America/Lima" },
  ];
  const locations = [];
  for (let i = 0; i < locationsData.length; i++) {
    const id = crypto.randomUUID();
    const loc = await prisma.location.upsert({
      where: { id: id },
      update: {},
      create: {
        id,
        organizationId: org.id,
        name: locationsData[i].name,
        address: locationsData[i].address,
        timezone: locationsData[i].timezone,
      },
    });
    locations.push(loc);
  }
  console.log(`✅ Sedes: ${locations.length}`);

  // ── Kiosks ─────────────────────────────────────────────────────
  const kiosks = [];
  for (let i = 0; i < locations.length; i++) {
    const kId = crypto.randomUUID();
    const kiosk = await prisma.kiosk.create({
      data: {
        id: kId,
        locationId: locations[i].id,
        name: `Kiosk Recepción - ${locations[i].name}`,
        apiKey: crypto.randomUUID(),
      },
    });
    kiosks.push(kiosk);
  }
  console.log(`✅ Kiosks: ${kiosks.length}`);

  // ── Horarios ──────────────────────────────────────────
  const schedules = [];
  schedules.push(await prisma.schedule.create({
    data: {
      organizationId: org.id,
      name: "Turno Oficina (Lun–Vie 8am–5pm)",
      workdaysMask: 31,
      entryHour: 8, entryMinute: 0,
      exitHour: 17, exitMinute: 0,
      toleranceMinutes: 10,
    },
  }));
  schedules.push(await prisma.schedule.create({
    data: {
      organizationId: org.id,
      name: "Turno Tarde (Lun–Sab 2pm–10pm)",
      workdaysMask: 63,
      entryHour: 14, entryMinute: 0,
      exitHour: 22, exitMinute: 0,
      toleranceMinutes: 15,
    },
  }));
  console.log(`✅ Horarios: ${schedules.length}`);

  // ── Feriados ───────────────────────────────────────────────────
  const holidaysDates = [
    { name: "Año Nuevo", date: new Date(2026, 0, 1) },
    { name: "Día del Trabajo", date: new Date(2026, 4, 1) },
    { name: "Fiestas Patrias", date: new Date(2026, 6, 28) },
    { name: "Fiestas Patrias", date: new Date(2026, 6, 29) },
    { name: "Combate de Angamos", date: new Date(2026, 9, 8) },
  ];
  for (const h of holidaysDates) {
    await prisma.holiday.create({
      data: {
        organizationId: org.id,
        name: h.name,
        date: h.date,
      }
    });
  }

  // ── Usuarios ──────────────────────────────────────────────────
  const usersToCreate = 40;
  const users = [];

  // Agregar Admin
  users.push(await prisma.user.upsert({
    where: { email: "admin2@demo.com" },
    update: {},
    create: {
      firstName: "Admin", lastName: "Tech", email: "admin2@demo.com", role: UserRole.ADMIN, documentId: "11111111",
      organizationId: org.id, locationId: locations[0].id, departmentId: departments[0].id,
      passwordHash: hashPassword("password123"),
    }
  }));

  for (let i = 0; i < usersToCreate; i++) {
    const role = i < 4 ? UserRole.SUPERVISOR : UserRole.EMPLEADO;
    const userData = getRandomUser(role);
    const loc = locations[i % locations.length];
    const dept = departments[i % departments.length];
    
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        organizationId: org.id,
        locationId: loc.id,
        departmentId: dept.id,
        passwordHash: hashPassword("password123"),
      },
    });

    const sched = schedules[i % schedules.length];
    await prisma.userSchedule.create({
      data: { userId: user.id, scheduleId: sched.id },
    }).catch(() => {});

    users.push(user);
  }
  console.log(`✅ Usuarios creados: ${users.length}`);

  // ── Solicitudes de Ausencia (TimeOffRequests) ─────────────────
  console.log("⏳ Generando solicitudes de ausencia...");
  for (let i = 0; i < 15; i++) {
    const u = users[Math.floor(Math.random() * users.length)];
    const isApproved = Math.random() > 0.3;
    const pastOffset = Math.floor(Math.random() * 60) + 5; // hace 5-65 días
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - pastOffset);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 5));

    await prisma.timeOffRequest.create({
      data: {
        userId: u.id,
        organizationId: org.id,
        type: Math.random() > 0.5 ? TimeOffType.VACACIONES : TimeOffType.DESCANSO_MEDICO,
        status: isApproved ? RequestStatus.APPROVED : (Math.random() > 0.5 ? RequestStatus.REJECTED : RequestStatus.PENDING),
        startDate: startDate,
        endDate: endDate,
        reason: "Descanso médico o vacaciones programadas",
        reviewedBy: isApproved ? users[0].id : null,
        reviewedAt: isApproved ? new Date() : null,
      }
    });
  }

  // ── Generar Asistencias de Prueba de los últimos 90 días ──
  console.log("⏳ Generando histórico de asistencias (90 días)...");
  
  const now = new Date();
  
  // Cache de horarios por usuario
  const userSchedMap = new Map();
  for (const u of users) {
    const us = await prisma.userSchedule.findFirst({ where: { userId: u.id }, include: { schedule: true } });
    if (us) userSchedMap.set(u.id, us.schedule);
  }

  for (let i = 90; i >= 0; i--) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() - i);
    const dayOfWeek = targetDate.getDay(); // 0: Dom, 6: Sab
    const dateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

    // Skip Sundays generally
    if (dayOfWeek === 0) continue;

    for (const u of users) {
      const sched = userSchedMap.get(u.id);
      if (!sched) continue;

      // Skip si el dia no le toca según bitmask
      const jsDayToBit = [64, 1, 2, 4, 8, 16, 32];
      const bit = jsDayToBit[dayOfWeek];
      if ((sched.workdaysMask & bit) === 0) continue;

      const locId = u.locationId;
      const kId = kiosks.find(k => k.locationId === locId)?.id;

      // Probabilidades
      const rand = Math.random();
      let status = "PRESENTE";
      let entryHour = sched.entryHour;
      let entryMin = sched.entryMinute;
      let lateMinutes = 0;
      let exitHour = sched.exitHour;
      let exitMin = sched.exitMinute + Math.floor(Math.random() * 30); // overtime o normal

      if (rand < 0.15) {
        status = "TARDE";
        const delay = Math.floor(Math.random() * 45) + sched.toleranceMinutes + 1; 
        entryMin += delay;
        while (entryMin >= 60) {
          entryHour++;
          entryMin -= 60;
        }
        lateMinutes = delay;
      } else if (rand < 0.18) {
        status = "AUSENTE";
      } else if (rand < 0.20) {
        status = "JUSTIFICADO";
      } else if (rand < 0.22) {
        status = "INCOMPLETO";
      }

      // Early arrival variation for PRESENTE
      if (status === "PRESENTE") {
        entryMin -= Math.floor(Math.random() * 15);
        if (entryMin < 0) {
          entryMin += 60;
          entryHour--;
        }
      }

      const entryTime = (status !== "AUSENTE" && status !== "JUSTIFICADO")
        ? new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), entryHour, entryMin, 0)
        : null;

      const exitTime = (status !== "AUSENTE" && status !== "JUSTIFICADO" && status !== "INCOMPLETO")
        ? new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), exitHour, exitMin, 0)
        : null;

      const workedMinutes = entryTime && exitTime
        ? Math.round((exitTime.getTime() - entryTime.getTime()) / 60000)
        : null;

      await prisma.attendance.upsert({
        where: { userId_date: { userId: u.id, date: dateOnly } },
        update: {},
        create: {
          userId: u.id,
          locationId: locId!,
          kioskId: kId,
          date: dateOnly,
          entryTime,
          exitTime,
          status: status as any,
          lateMinutes: lateMinutes > 0 ? lateMinutes : null,
          workedMinutes,
        },
      });
    }
  }
  console.log("✅ Histórico de asistencias de 90 días generado correctamente.");

  console.log("\n🎉 Seed medio completado exitosamente.");
  console.log("\n📋 Credenciales de acceso (Nueva Org):");
  console.log("   Admin: admin2@demo.com / password123");
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
