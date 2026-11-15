import { prisma, AttendanceStatus, User, Attendance, Location } from "@asistencias/db";
import { getLocalTimeParts } from "@/lib/dateUtils";

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

function resolveTimeGreeting(localHour: number, firstName: string) {
  if (localHour >= 5 && localHour < 12) {
    return {
      timeOfDay: "morning" as const,
      timeBadge: "🌅 Mañana",
      greeting: `¡Buenos días, ${firstName}!`,
    };
  }
  if (localHour >= 12 && localHour < 19) {
    return {
      timeOfDay: "afternoon" as const,
      timeBadge: "☀️ Tarde",
      greeting: `¡Buenas tardes, ${firstName}!`,
    };
  }
  if (localHour >= 19 && localHour <= 23) {
    return {
      timeOfDay: "evening" as const,
      timeBadge: "🌙 Noche",
      greeting: `¡Buenas noches, ${firstName}!`,
    };
  }
  return {
    timeOfDay: "night" as const,
    timeBadge: "✨ Madrugada",
    greeting: `¡Hola, ${firstName}!`,
  };
}

function resolveActionAndPhrase(
  scanType: GenerateInteractionParams["scanType"],
  isSplit: boolean,
  isLate: boolean,
  lateMinutes: number,
  attendance: GenerateInteractionParams["attendance"]
) {
  if (scanType === "ENTRY") {
    if (isSplit && attendance.entryTime2 && attendance.entryTime) {
      return {
        actionTitle: "Retorno de Receso",
        motivationalPhrase: isLate
          ? `Entrada Tramo 2 registrada (+${lateMinutes} min). ¡Con todo para la tarde!`
          : "🔋 ¡Bienvenido de vuelta! Con toda la energía para la segunda mitad de la jornada.",
        celebrationType: "NONE" as const,
      };
    }
    if (isLate) {
      return {
        actionTitle: "Ingreso Registrado",
        motivationalPhrase: `⏱️ Entrada registrada (+${lateMinutes} min). ¡Ánimo y a dar lo mejor en la jornada!`,
        celebrationType: "NONE" as const,
      };
    }
    const morningPhrases = [
      "🎯 ¡Puntualidad impecable! Que tengas un día muy productivo.",
      "⚡ ¡A tiempo y con energía! Hoy será un gran día de trabajo.",
      "🌟 ¡Excelente llegada! Tu compromiso hace la diferencia.",
    ];
    return {
      actionTitle: "Ingreso Registrado",
      motivationalPhrase: morningPhrases[Math.floor(Math.random() * morningPhrases.length)],
      celebrationType: "PUNCTUAL" as const,
    };
  }

  if (scanType === "EXIT") {
    if (isSplit && !attendance.exitTime2) {
      return {
        actionTitle: "Salida a Receso",
        motivationalPhrase: "🥗 ¡Buen provecho! Disfruta tu refrigerio y recarga energías.",
        celebrationType: "NONE" as const,
      };
    }
    const exitPhrases = [
      "🏠 ¡Jornada completada con éxito! Que descanses y disfrutes tu tiempo.",
      "👋 ¡Gran labor el día de hoy! Hasta pronto y buen viaje a casa.",
      "✨ ¡Misión cumplida! Nos vemos en la próxima jornada.",
    ];
    return {
      actionTitle: "Salida Registrada",
      motivationalPhrase: exitPhrases[Math.floor(Math.random() * exitPhrases.length)],
      celebrationType: "NONE" as const,
    };
  }

  return {
    actionTitle: "Asistencia Previa",
    motivationalPhrase: "ℹ️ Tu asistencia ya se encuentra registrada en el sistema.",
    celebrationType: "NONE" as const,
  };
}

function resolveNoticeType(isMeeting: boolean, isUrgent: boolean): "MEETING" | "ANNOUNCEMENT" | "REMINDER" {
  if (isMeeting) return "MEETING";
  return isUrgent ? "ANNOUNCEMENT" : "REMINDER";
}

async function findColleagueBirthdays(
  userId: string,
  organizationId: string,
  currentMonth: number,
  currentDay: number
): Promise<Array<{ name: string; role?: string }>> {
  try {
    const potentialColleagues = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        id: { not: userId },
        birthDate: { not: null },
      },
      select: { firstName: true, lastName: true, role: true, birthDate: true },
      take: 10,
    });

    return potentialColleagues
      .filter((colleague) => {
        if (!colleague.birthDate) return false;
        const cBirth = new Date(colleague.birthDate);
        return cBirth.getUTCMonth() + 1 === currentMonth && cBirth.getUTCDate() === currentDay;
      })
      .map((colleague) => ({
        name: `${colleague.firstName} ${colleague.lastName}`,
        role: colleague.role,
      }));
  } catch (err) {
    console.warn("Could not query colleague birthdays:", err);
    return [];
  }
}

async function findDailyNotice(
  userId: string,
  now: Date
): Promise<MicroInteractionData["notice"]> {
  try {
    const recentNotification = await prisma.notification.findFirst({
      where: {
        userId,
        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!recentNotification) return null;

    const notifData = (recentNotification.data as any) || {};
    const titleLower = recentNotification.title.toLowerCase();
    const bodyLower = recentNotification.body.toLowerCase();

    const isMeeting =
      titleLower.includes("reunión") ||
      titleLower.includes("reunion") ||
      bodyLower.includes("reunión") ||
      notifData.isMeeting;
    const isUrgent =
      titleLower.includes("urgente") ||
      titleLower.includes("importante") ||
      notifData.priority === "HIGH";

    return {
      type: resolveNoticeType(Boolean(isMeeting), Boolean(isUrgent)),
      title: recentNotification.title,
      description: recentNotification.body,
      time: notifData.time || notifData.meetingTime,
      location: notifData.location || notifData.room,
      priority: isUrgent ? "HIGH" : "NORMAL",
    };
  } catch (notifErr) {
    console.warn("Could not query daily notice:", notifErr);
    return null;
  }
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
  const { hour: localHour } = getLocalTimeParts(now, timezone);
  const { timeOfDay, timeBadge, greeting } = resolveTimeGreeting(localHour, user.firstName);
  const isLate = Boolean(status === AttendanceStatus.TARDE || (lateMinutes && lateMinutes > 0));
  const { actionTitle, motivationalPhrase, celebrationType: baseCelebration } =
    resolveActionAndPhrase(scanType, isSplit, isLate, lateMinutes ?? 0, attendance);

  let celebrationType: "BIRTHDAY" | "PUNCTUAL" | "MILESTONE" | "NONE" = baseCelebration;

  // ── 3. Motor de Cumpleaños ──────────────────────────────────────────────
  let isBirthday = false;
  let birthdayMessage: string | undefined;

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
  const colleagueBirthdays = await findColleagueBirthdays(
    user.id,
    user.organizationId,
    currentMonth,
    currentDay
  );

  // ── 4. Avisos y Reuniones Importantes del Día ────────────────────────────
  const notice = await findDailyNotice(user.id, now);

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
  } catch { /* Ignorado intencionalmente */ }

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
