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

import { prisma, OrgType, UserRole, TimeOffType, RequestStatus, AttendanceStatus } from "./index";
import bcrypt from "bcryptjs";
import crypto from "crypto";


function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

const names = [
  "Carlos", "Ana", "Luis", "Maria", "Jorge", "Lucia", "Sofia", "Diego", 
  "Carmen", "Fernando", "Elena", "Pedro", "Rosa", "Raul", "Patricia", 
  "Victor", "Teresa", "Andres", "Julio", "Hugo", "Isabel", "Marta", 
  "Roberto", "Valeria", "Alejandro", "Camila", "Gonzalo", "Daniela", 
  "Gustavo", "Gabriela", "Mauricio", "Lorena", "Ricardo", "Vanessa", "Mateo"
];

const surnames = [
  "Garcia", "Martinez", "Lopez", "Gonzalez", "Perez", "Rodriguez", 
  "Sanchez", "Ramirez", "Flores", "Gomez", "Morales", "Ortiz", 
  "Gutierrez", "Chavez", "Reyes", "Mendoza", "Castillo", "Romero", 
  "Vasquez", "Jimenez", "Ramos", "Torres", "Diaz", "Castro", "Vargas"
];

async function main() {
  console.log("🏨 Iniciando inyección completa para Hotel Italia...");

  // 1. Limpiar la organización de prueba anterior para liberar memoria y recursos
  try {
    await prisma.organization.deleteMany({
      where: { slug: "tech-solutions-peru" }
    });
    console.log("🧹 Organización temporal anterior 'tech-solutions-peru' limpiada.");
  } catch (e) {
    console.log("Nota al limpiar org previa:", e);
  }

  // 2. Obtener la organización Hotel Italia
  let org = await prisma.organization.findFirst({
    where: {
      OR: [
        { id: "dc6d7a45-db1a-4eda-a5c1-3af0c162574b" },
        { slug: "mi-empresa" },
        { name: { contains: "Italia", mode: "insensitive" } }
      ]
    }
  });

  if (!org) {
    throw new Error("No se encontró la organización Hotel Italia.");
  }

  console.log(`✅ Organización destino: ${org.name} (${org.id})`);

  // 3. Departamentos para Hotel Italia
  const deptsData = [
    "Recepción & Front Desk",
    "Housekeeping / Pisos",
    "Alimentos & Bebidas",
    "Mantenimiento & Servicios",
    "Administración & RRHH"
  ];

  const departments = [];
  for (const name of deptsData) {
    let dept = await prisma.department.findFirst({
      where: { organizationId: org.id, name }
    });
    if (!dept) {
      dept = await prisma.department.create({
        data: { name, organizationId: org.id }
      });
    }
    departments.push(dept);
  }
  console.log(`✅ Departamentos listos: ${departments.length}`);

  // 4. Sedes de Hotel Italia
  let locations = await prisma.location.findMany({
    where: { organizationId: org.id }
  });

  if (locations.length === 0) {
    const mainLoc = await prisma.location.create({
      data: {
        organizationId: org.id,
        name: "Sede Principal - Miraflores",
        address: "Av. José Larco 850, Miraflores",
        timezone: "America/Lima",
        isActive: true
      }
    });
    locations.push(mainLoc);
  }

  // Añadir una segunda sede si solo tiene 1
  if (locations.length === 1) {
    const secondLoc = await prisma.location.create({
      data: {
        organizationId: org.id,
        name: "Sede Boutique - San Isidro",
        address: "Calle Los Libertadores 320, San Isidro",
        timezone: "America/Lima",
        isActive: true
      }
    });
    locations.push(secondLoc);
  }
  console.log(`✅ Sedes listas: ${locations.length}`);

  // 5. Kiosks
  const kiosks = [];
  for (const loc of locations) {
    let kiosk = await prisma.kiosk.findFirst({
      where: { locationId: loc.id }
    });
    if (!kiosk) {
      kiosk = await prisma.kiosk.create({
        data: {
          locationId: loc.id,
          name: `Kiosk Check-in (${loc.name})`,
          apiKey: crypto.randomUUID(),
          isActive: true
        }
      });
    }
    kiosks.push(kiosk);
  }
  console.log(`✅ Quioscos de marcación: ${kiosks.length}`);

  // 6. Horarios
  let schedules = await prisma.schedule.findMany({
    where: { organizationId: org.id }
  });

  if (schedules.length === 0) {
    const s1 = await prisma.schedule.create({
      data: {
        organizationId: org.id,
        name: "Turno Mañana Hotelero (07:00 - 15:00)",
        workdaysMask: 63, // Lun-Sab
        entryHour: 7, entryMinute: 0,
        exitHour: 15, exitMinute: 0,
        toleranceMinutes: 10
      }
    });
    const s2 = await prisma.schedule.create({
      data: {
        organizationId: org.id,
        name: "Turno Tarde Hotelero (14:30 - 22:30)",
        workdaysMask: 63, // Lun-Sab
        entryHour: 14, entryMinute: 30,
        exitHour: 22, exitMinute: 30,
        toleranceMinutes: 10
      }
    });
    const s3 = await prisma.schedule.create({
      data: {
        organizationId: org.id,
        name: "Turno Administrativo (08:30 - 17:30)",
        workdaysMask: 31, // Lun-Vie
        entryHour: 8, entryMinute: 30,
        exitHour: 17, exitMinute: 30,
        toleranceMinutes: 15
      }
    });
    schedules = [s1, s2, s3];
  }
  console.log(`✅ Horarios configurados: ${schedules.length}`);

  // 7. Usuarios para Hotel Italia
  const passwordHash = hashPassword("password123");
  const users = [];

  for (let i = 0; i < names.length; i++) {
    const firstName = names[i];
    const lastName = surnames[i % surnames.length] + " " + surnames[(i + 5) % surnames.length];
    const email = `${firstName.toLowerCase()}.${lastName.split(" ")[0].toLowerCase()}.${i + 1}@hotelitalia.pe`;
    const documentId = `${70000000 + i * 37}`;
    
    // Asignar departamento equilibrado
    const dept = departments[i % departments.length];
    const loc = locations[i % locations.length];
    const role = (i === 1 || i === 2) ? UserRole.SUPERVISOR : UserRole.EMPLEADO;

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        departmentId: dept.id,
        locationId: loc.id,
        organizationId: org.id
      },
      create: {
        organizationId: org.id,
        locationId: loc.id,
        departmentId: dept.id,
        firstName,
        lastName,
        email,
        documentId,
        role,
        passwordHash,
        isActive: true
      }
    });

    const sched = schedules[i % schedules.length];
    await prisma.userSchedule.create({
      data: { userId: user.id, scheduleId: sched.id }
    }).catch(() => {});

    users.push(user);
  }
  console.log(`✅ Colaboradores creados/sincronizados: ${users.length}`);

  // Asignar departamento al Admin Principal si no tiene
  const adminUser = await prisma.user.findFirst({
    where: { organizationId: org.id, role: UserRole.ADMIN }
  });
  if (adminUser && !adminUser.departmentId) {
    const adminDept = departments.find(d => d.name.includes("Administración")) || departments[0];
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { departmentId: adminDept.id }
    });
  }

  // 8. Solicitudes de Ausencia
  console.log("⏳ Creando solicitudes de ausencia para Hotel Italia...");
  for (let i = 0; i < 12; i++) {
    const u = users[i * 2];
    const pastOffset = Math.floor(Math.random() * 45) + 3;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - pastOffset);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 3);

    const isApproved = i % 3 === 0;

    await prisma.timeOffRequest.create({
      data: {
        userId: u.id,
        organizationId: org.id,
        type: i % 2 === 0 ? TimeOffType.VACACIONES : TimeOffType.DESCANSO_MEDICO,
        status: isApproved ? RequestStatus.APPROVED : (i % 2 === 0 ? RequestStatus.PENDING : RequestStatus.REJECTED),
        startDate,
        endDate,
        reason: i % 2 === 0 ? "Vacaciones anuales programadas" : "Atención médica ESSALUD",
        reviewedBy: isApproved && adminUser ? adminUser.id : null,
        reviewedAt: isApproved ? new Date() : null
      }
    }).catch(() => {});
  }
  console.log("✅ Solicitudes de ausencia creadas.");

  // 9. Asistencias Históricas de los últimos 60 días
  console.log("⏳ Generando historial de asistencias (inserción masiva de alto rendimiento)...");
  
  // Limpiar asistencias previas de estos usuarios para evitar duplicados y asegurar consistencia
  const userIds = users.map(u => u.id);
  await prisma.attendance.deleteMany({
    where: { userId: { in: userIds } }
  });

  const attendancesToInsert = [];
  const now = new Date();

  // Mapeo horario
  const userSchedMap = new Map();
  for (let i = 0; i < users.length; i++) {
    userSchedMap.set(users[i].id, schedules[i % schedules.length]);
  }

  // Últimos 60 días
  for (let d = 60; d >= 0; d--) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() - d);
    const dayOfWeek = targetDate.getDay();
    const dateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

    // Domingos descanso
    if (dayOfWeek === 0) continue;

    for (const u of users) {
      const sched = userSchedMap.get(u.id);
      if (!sched) continue;

      const jsDayToBit = [64, 1, 2, 4, 8, 16, 32];
      const bit = jsDayToBit[dayOfWeek];
      if ((sched.workdaysMask & bit) === 0) continue;

      const locId = u.locationId || locations[0].id;
      const kId = kiosks.find(k => k.locationId === locId)?.id;

      const rand = Math.random();
      let status: AttendanceStatus = AttendanceStatus.PRESENTE;
      let entryHour = sched.entryHour;
      let entryMin = sched.entryMinute;
      let lateMinutes = 0;
      let exitHour = sched.exitHour;
      let exitMin = sched.exitMinute + Math.floor(Math.random() * 20);

      if (rand < 0.12) {
        status = AttendanceStatus.TARDE;
        const delay = Math.floor(Math.random() * 35) + sched.toleranceMinutes + 2;
        entryMin += delay;
        while (entryMin >= 60) {
          entryHour++;
          entryMin -= 60;
        }
        lateMinutes = delay;
      } else if (rand < 0.15) {
        status = AttendanceStatus.AUSENTE;
      } else if (rand < 0.18) {
        status = AttendanceStatus.JUSTIFICADO;
      }

      if (status === AttendanceStatus.PRESENTE) {
        entryMin -= Math.floor(Math.random() * 10);
        if (entryMin < 0) {
          entryMin += 60;
          entryHour--;
        }
      }

      const entryTime = (status !== AttendanceStatus.AUSENTE && status !== AttendanceStatus.JUSTIFICADO)
        ? new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), entryHour, entryMin, 0)
        : null;

      const exitTime = (status !== AttendanceStatus.AUSENTE && status !== AttendanceStatus.JUSTIFICADO)
        ? new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), exitHour, exitMin, 0)
        : null;

      const workedMinutes = entryTime && exitTime
        ? Math.round((exitTime.getTime() - entryTime.getTime()) / 60000)
        : null;

      attendancesToInsert.push({
        userId: u.id,
        locationId: locId,
        kioskId: kId || null,
        date: dateOnly,
        entryTime,
        exitTime,
        status,
        lateMinutes: lateMinutes > 0 ? lateMinutes : null,
        workedMinutes
      });
    }
  }

  console.log(`📦 Insertando ${attendancesToInsert.length} registros de asistencia en lotes optimizados...`);
  
  // Inserción en lotes de 500
  const chunkSize = 500;
  for (let i = 0; i < attendancesToInsert.length; i += chunkSize) {
    const chunk = attendancesToInsert.slice(i, i + chunkSize);
    await prisma.attendance.createMany({
      data: chunk,
      skipDuplicates: true
    });
  }

  console.log(`🎉 ¡Inyección completada exitosamente para Hotel Italia!`);
  console.log(`📊 Total colaboradores: ${users.length + (adminUser ? 1 : 0)}`);
  console.log(`🏢 Departamentos creados: ${departments.length}`);
  console.log(`📅 Asistencias generadas: ${attendancesToInsert.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Error en la inyección:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
