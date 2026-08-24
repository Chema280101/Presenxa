import { prisma, AttendanceStatus, User, Attendance, Kiosk, Location, Organization } from "@asistencias/db";
import { getLocalDateString, getLocalTodayDate, getLocalTimeParts, formatLocalTime } from "@/lib/dateUtils";

export interface MicroInteractionData {
  greeting: string;
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  timeBadge: string;
  motivationalPhrase: string;
  actionTitle: string;
  isBirthday: boolean;
  birthdayMessage?: string;
  colleagueBirthdays?: Array<{ name: string; role?: string }>;
  notice?: {
    type: "MEETING" | "ANNOUNCEMENT" | "REMINDER" | "INFO";
    title: string;
    description: string;
    time?: string;
    location?: string;
    priority?: "NORMAL" | "HIGH" | "URGENT";
  } | null;
  celebrationType: "BIRTHDAY" | "PUNCTUAL" | "MILESTONE" | "NONE";
  onTimeStreakDays?: number;
}

interface GenerateInteractionParams {
  user: User & {
    location?: Location | null;
  };
  attendance: Attendance;
  scanType: "ENTRY" | "EXIT" | "ALREADY_REGISTERED";
  status: AttendanceStatus;
  lateMinutes?: number | null;
  organizationName?: string;
  timezone: string;
  now: Date;
  isSplit?: boolean;
}

export async function generateMicroInteraction({
  user,
  attendance,
  scanType,
  status,
  lateMinutes = 0,
  organizationName = "Presenxa",
  timezone,
  now,
  isSplit = false,
}: GenerateInteractionParams): Promise<MicroInteractionData> {
  const { hour: localHour, minute: localMinute } = getLocalTimeParts(now, timezone);

  // ── 1. Saludo Inteligente por Momento del Día ────────────────────────────
  let timeOfDay: "morning" | "afternoon" | "evening" | "night" = "morning";
  let timeBadge = "🌅 Mañana";
  let greeting = `¡Buenos días, ${user.firstName}!`;

  if (localHour >= 5 && localHour < 12) {
    timeOfDay = "morning";
    timeBadge = "🌅 Mañana";
    greeting = `¡Buenos días, ${user.firstName}!`;
  } else if (localHour >= 12 && localHour < 19) {
    timeOfDay = "afternoon";
    timeBadge = "☀️ Tarde";
    greeting = `¡Buenas tardes, ${user.firstName}!`;
  } else if (localHour >= 19 && localHour <= 23) {
    timeOfDay = "evening";
    timeBadge = "🌙 Noche";
    greeting = `¡Buenas noches, ${user.firstName}!`;
  } else {
    timeOfDay = "night";
    timeBadge = "✨ Madrugada";
    greeting = `¡Hola, ${user.firstName}!`;
  }

  // ── 2. Frase Motivacional y Acción Contextual ────────────────────────────
  let actionTitle = "Marcación Registrada";
  let motivationalPhrase = "¡Excelente actitud para hoy!";
  let celebrationType: "BIRTHDAY" | "PUNCTUAL" | "MILESTONE" | "NONE" = "NONE";

  const isLate = status === AttendanceStatus.TARDE || (lateMinutes && lateMinutes > 0);

  if (scanType === "ENTRY") {
    if (isSplit && attendance.entryTime2 && attendance.entryTime) {
      actionTitle = "Retorno de Receso";
      motivationalPhrase = isLate
        ? `Entrada Tramo 2 registrada (+${lateMinutes} min). ¡Con todo para la tarde!`
        : "🔋 ¡Bienvenido de vuelta! Con toda la energía para la segunda mitad de la jornada.";
    } else {
      actionTitle = "Ingreso Registrado";
      if (isLate) {
        motivationalPhrase = `⏱️ Entrada registrada (+${lateMinutes} min). ¡Ánimo y a dar lo mejor en la jornada!`;
      } else {
        celebrationType = "PUNCTUAL";
        const morningPhrases = [
          "🎯 ¡Puntualidad impecable! Que tengas un día muy productivo.",
          "⚡ ¡A tiempo y con energía! Hoy será un gran día de trabajo.",
          "🌟 ¡Excelente llegada! Tu compromiso hace la diferencia.",
        ];
        motivationalPhrase = morningPhrases[Math.floor(Math.random() * morningPhrases.length)];
      }
    }
  } else if (scanType === "EXIT") {
    if (isSplit && !attendance.exitTime2) {
      actionTitle = "Salida a Receso";
      motivationalPhrase = "🥗 ¡Buen provecho! Disfruta tu refrigerio y recarga energías.";
    } else {
      actionTitle = "Salida Registrada";
      const exitPhrases = [
        "🏠 ¡Jornada completada con éxito! Que descanses y disfrutes tu tiempo.",
        "👋 ¡Gran labor el día de hoy! Hasta pronto y buen viaje a casa.",
        "✨ ¡Misión cumplida! Nos vemos en la próxima jornada.",
      ];
      motivationalPhrase = exitPhrases[Math.floor(Math.random() * exitPhrases.length)];
    }
  } else {
    actionTitle = "Asistencia Previa";
    motivationalPhrase = "ℹ️ Tu asistencia ya se encuentra registrada en el sistema.";
  }

  // ── 3. Motor de Cumpleaños ──────────────────────────────────────────────
  let isBirthday = false;
  let birthdayMessage: string | undefined;
  const colleagueBirthdays: Array<{ name: string; role?: string }> = [];

  // Fecha actual en la zona horaria del kiosk
  const localDateObj = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const currentMonth = localDateObj.getMonth() + 1; // 1-12
  const currentDay = localDateObj.getDate(); // 1-31

  // 3.1 Verificar si hoy es cumpleaños del colaborador escaneado
  if (user.birthDate) {
    const userBirth = new Date(user.birthDate);
    const birthMonth = userBirth.getUTCMonth() + 1;
    const birthDay = userBirth.getUTCDate();

    if (birthMonth === currentMonth && birthDay === currentDay) {
      isBirthday = true;
      celebrationType = "BIRTHDAY";
      birthdayMessage = `🎂 ¡Feliz Cumpleaños, ${user.firstName}! 🎉 De parte de todo el equipo de ${organizationName}, ¡que tengas un día extraordinario lleno de alegrías y éxitos!`;
    }
  }

  // 3.2 Consultar si algún compañero de la misma sede/organización cumple años hoy
  try {
    const potentialColleagues = await prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true,
        id: { not: user.id },
        birthDate: { not: null },
      },
      select: {
        firstName: true,
        lastName: true,
        role: true,
        birthDate: true,
      },
      take: 10,
    });

    for (const colleague of potentialColleagues) {
      if (colleague.birthDate) {
        const cBirth = new Date(colleague.birthDate);
        if (cBirth.getUTCMonth() + 1 === currentMonth && cBirth.getUTCDate() === currentDay) {
          colleagueBirthdays.push({
            name: `${colleague.firstName} ${colleague.lastName}`,
            role: colleague.role,
          });
        }
      }
    }
  } catch (err) {
    console.warn("Could not query colleague birthdays:", err);
  }

  // ── 4. Avisos y Reuniones Importantes del Día ────────────────────────────
  let notice: MicroInteractionData["notice"] = null;

  try {
    // Buscar notificaciones no leídas o avisos prioritarios para el usuario de hoy
    const recentNotification = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Últimas 24 horas
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentNotification) {
      const notifData = (recentNotification.data as any) || {};
      const titleLower = recentNotification.title.toLowerCase();
      const bodyLower = recentNotification.body.toLowerCase();

      const isMeeting = titleLower.includes("reunión") || titleLower.includes("reunion") || bodyLower.includes("reunión") || notifData.isMeeting;
      const isUrgent = titleLower.includes("urgente") || titleLower.includes("importante") || notifData.priority === "HIGH";

      notice = {
        type: isMeeting ? "MEETING" : isUrgent ? "ANNOUNCEMENT" : "REMINDER",
        title: recentNotification.title,
        description: recentNotification.body,
        time: notifData.time || notifData.meetingTime,
        location: notifData.location || notifData.room,
        priority: isUrgent ? "HIGH" : "NORMAL",
      };
    }
  } catch (notifErr) {
    console.warn("Could not query daily notice:", notifErr);
  }

  // ── 5. Racha de Puntualidad (Últimos 7 días) ─────────────────────────────
  let onTimeStreakDays = 0;
  try {
    const recentAttendances = await prisma.attendance.findMany({
      where: {
        userId: user.id,
        status: AttendanceStatus.PRESENTE,
        OR: [{ lateMinutes: null }, { lateMinutes: 0 }],
      },
      orderBy: { date: "desc" },
      take: 5,
    });
    onTimeStreakDays = recentAttendances.length;
  } catch {}

  return {
    greeting,
    timeOfDay,
    timeBadge,
    motivationalPhrase,
    actionTitle,
    isBirthday,
    birthdayMessage,
    colleagueBirthdays: colleagueBirthdays.length > 0 ? colleagueBirthdays : undefined,
    notice,
    celebrationType,
    onTimeStreakDays: onTimeStreakDays >= 3 ? onTimeStreakDays : undefined,
  };
}
