import { prisma, AttendanceStatus, AuditAction } from "@asistencias/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { differenceInMinutes } from "date-fns";
import { checkRateLimit } from "@/lib/rateLimit";
import { isSignedQrPayload, verifySignedQrPayload } from "@/lib/qrCrypto";
import { logAuditEvent } from "@/lib/audit";
import { getLocalDateString, getLocalTodayDate, getLocalTimeParts, formatLocalTime } from "@/lib/dateUtils";

const ScanSchema = z.object({
  qrToken: z.string().min(1, "El token QR o documento es requerido"),
  mode: z.enum(["AUTO", "ENTRY", "EXIT"]).default("AUTO"),
});

// POST /api/attendance/scan
export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-kiosk-api-key");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Falta la clave de autenticación del Kiosk (x-kiosk-api-key)" },
        { status: 401 }
      );
    }

    // ── 1. RATE LIMITING: Máximo 10 peticiones por minuto por Kiosk / IP ─────
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
    const rateLimitKey = `kiosk_scan:${apiKey}:${ipAddress}`;

    const rateResult = await checkRateLimit({
      key: rateLimitKey,
      limit: 10,
      windowSeconds: 60,
    });

    if (!rateResult.success) {
      return NextResponse.json(
        {
          error: "Frecuencia de escaneos excedida (máx. 10 escaneos/min por Kiosk). Por favor espera unos segundos.",
          retryAfter: rateResult.resetSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateResult.resetSeconds),
            "X-RateLimit-Limit": String(rateResult.limit),
            "X-RateLimit-Remaining": String(rateResult.remaining),
          },
        }
      );
    }

    // ── 2. Validar Kiosk ───────────────────────────────────────────────────
    const kiosk = await prisma.kiosk.findUnique({
      where: { apiKey },
      include: {
        location: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!kiosk || !kiosk.isActive) {
      return NextResponse.json(
        { error: "Dispositivo Kiosk no registrado, inactivo o clave incorrecta" },
        { status: 401 }
      );
    }

    // Actualizar heartbeat del Kiosk
    await prisma.kiosk.update({
      where: { id: kiosk.id },
      data: { lastSeenAt: new Date(), ipAddress },
    });

    // ── 3. Parsear body ────────────────────────────────────────────────────
    const body = await req.json();
    const parsed = ScanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de escaneo inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { qrToken: rawToken, mode } = parsed.data;

    // ── 4. Validación de Firma Criptográfica HMAC (si el QR está firmado) ──
    let searchQrToken = rawToken.trim();
    let verifiedUserId: string | undefined;

    if (isSignedQrPayload(rawToken)) {
      const verification = verifySignedQrPayload(rawToken);
      if (!verification.isValid) {
        return NextResponse.json(
          { error: verification.error || "Firma criptográfica del código QR inválida o alterada" },
          { status: 403 }
        );
      }
      searchQrToken = verification.qrToken!;
      verifiedUserId = verification.userId;
    }

    // ── 5. Buscar Usuario en PostgreSQL ────────────────────────────────────
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      searchQrToken
    );

    const userWhere: any = {
      organizationId: kiosk.location.organizationId,
      isActive: true,
    };

    if (verifiedUserId) {
      userWhere.id = verifiedUserId;
      userWhere.qrToken = searchQrToken;
      userWhere.qrInvalidatedAt = null;
    } else if (isUuid) {
      userWhere.OR = [
        { qrToken: searchQrToken, qrInvalidatedAt: null },
        { documentId: searchQrToken },
      ];
    } else {
      userWhere.documentId = searchQrToken;
    }

    const user = await prisma.user.findFirst({
      where: userWhere,
      include: {
        location: true,
        userSchedules: {
          where: {
            OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
          },
          include: { schedule: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "Código QR no reconocido, revocado o usuario inactivo en esta organización",
        },
        { status: 404 }
      );
    }

    // ── 6. Control de Expiración por Tiempo (Máx 60 días sin renovar) ───────
    if (user.qrGeneratedAt) {
      const daysSinceGenerated =
        (Date.now() - new Date(user.qrGeneratedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceGenerated > 60) {
        return NextResponse.json(
          {
            error: "Tu credencial QR ha caducado por seguridad (> 60 días). Solicita su renovación a tu administrador.",
          },
          { status: 403 }
        );
      }
    }

    const isSigned = isSignedQrPayload(rawToken);
    const isQrTokenMatch = isUuid && user.qrToken && searchQrToken.toLowerCase() === user.qrToken.toLowerCase();
    const isDniScan = !isSigned && !isQrTokenMatch;

    const timezone = kiosk.location.timezone || "America/Lima";
    const now = new Date();
    const today = getLocalTodayDate(now, timezone);
    const schedule = user.userSchedules?.[0]?.schedule;

    // ── 7. Buscar o crear asistencia del día ────────────────────────────────
    let attendance = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        },
      },
    });

    let scanType: "ENTRY" | "EXIT" | "ALREADY_REGISTERED" = "ENTRY";
    let message = "";
    let status: AttendanceStatus = attendance?.status || AttendanceStatus.PRESENTE;
    let lateMinutes = attendance?.lateMinutes || 0;
    let workedMinutes = attendance?.workedMinutes || 0;

    const isSplit = Boolean(schedule?.isSplit);
    const localTimeFormatted = formatLocalTime(now, "HH:mm", timezone);
    const { hour: localHour, minute: localMinute } = getLocalTimeParts(now, timezone);
    const actualTotalMinutes = localHour * 60 + localMinute;

    const initialDniNotes = isDniScan
      ? `[PENDIENTE_VALIDACION_DNI] Marcación manual por DNI (${user.documentId || searchQrToken}) en ${kiosk.name} a las ${formatLocalTime(now, "HH:mm:ss", timezone)}.`
      : null;

    if (isSplit) {
      // ══════════════════════════════════════════════════════════════════════
      //  MODALIDAD: HORARIO PARTIDO (DOBLE TURNO / 4 MARCACIONES)
      // ══════════════════════════════════════════════════════════════════════

      if (!attendance || !attendance.entryTime) {
        // ── 1.ª MARCACIÓN: ENTRADA TRAMO 1 (MAÑANA) ──────────────────────────
        scanType = "ENTRY";
        let isLate = false;
        let diffLate = 0;

        if (schedule) {
          const scheduledMinutes = schedule.entryHour * 60 + schedule.entryMinute;
          const tolerance = schedule.toleranceMinutes || 0;
          const diff = actualTotalMinutes - (scheduledMinutes + tolerance);
          if (diff > 0) {
            isLate = true;
            diffLate = actualTotalMinutes - scheduledMinutes;
          }
        }

        status = isLate ? AttendanceStatus.TARDE : AttendanceStatus.PRESENTE;
        lateMinutes = diffLate;

        message = isLate
          ? `¡Hola, ${user.firstName}! Entrada Tramo 1 registrada con tardanza (+${diffLate} min).`
          : `¡Bienvenido(a), ${user.firstName}! Entrada Tramo 1 registrada puntualmente.`;

        if (isDniScan) {
          message += " (Pendiente de confirmación)";
        }

        attendance = await prisma.attendance.upsert({
          where: { userId_date: { userId: user.id, date: today } },
          update: {
            entryTime: now,
            status,
            lateMinutes: diffLate > 0 ? diffLate : null,
            locationId: kiosk.locationId,
            kioskId: kiosk.id,
            notes: initialDniNotes,
            statusChangedBy: isDniScan ? `KIOSK_DNI_${kiosk.name}` : `KIOSK_${kiosk.name}`,
            statusChangedAt: now,
          },
          create: {
            userId: user.id,
            locationId: kiosk.locationId,
            kioskId: kiosk.id,
            date: today,
            entryTime: now,
            status,
            lateMinutes: diffLate > 0 ? diffLate : null,
            notes: initialDniNotes,
            statusChangedBy: isDniScan ? `KIOSK_DNI_${kiosk.name}` : `KIOSK_${kiosk.name}`,
            statusChangedAt: now,
          },
        });
      } else if (!attendance.exitTime) {
        // ── 2.ª MARCACIÓN: SALIDA TRAMO 1 (RECESO / ALMUERZO) ────────────────
        scanType = "EXIT";
        const entryDate = new Date(attendance.entryTime);
        const shift1Worked = Math.max(0, differenceInMinutes(now, entryDate));
        workedMinutes = shift1Worked;

        const hours = Math.floor(shift1Worked / 60);
        const mins = shift1Worked % 60;
        const workedStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

        message = `¡Buen provecho, ${user.firstName}! Salida a receso registrada (Tramo 1: ${workedStr}).`;
        if (isDniScan) message += " (Pendiente de confirmación)";

        const exitNotes = isDniScan
          ? `${attendance.notes ? attendance.notes + " | " : ""}[PENDIENTE_VALIDACION_DNI] Salida Tramo 1 por DNI a las ${formatLocalTime(now, "HH:mm:ss", timezone)}.`
          : attendance.notes;

        attendance = await prisma.attendance.update({
          where: { id: attendance.id },
          data: {
            exitTime: now,
            workedMinutes: shift1Worked,
            notes: exitNotes,
            statusChangedBy: isDniScan ? `KIOSK_DNI_${kiosk.name}` : `KIOSK_${kiosk.name}`,
            statusChangedAt: now,
          },
        });
      } else if (!attendance.entryTime2) {
        // ── 3.ª MARCACIÓN: ENTRADA TRAMO 2 (RETORNO DE RECESO / TARDE) ───────
        const diffSinceExit1 = differenceInMinutes(now, new Date(attendance.exitTime));
        if (diffSinceExit1 < 2 && mode !== "ENTRY") {
          scanType = "ALREADY_REGISTERED";
          message = `Tu salida a receso fue registrada a las ${formatLocalTime(
            new Date(attendance.exitTime),
            "HH:mm",
            timezone
          )}. ¡Disfruta tu refrigerio!`;
        } else {
          scanType = "ENTRY";
          let diffLate2 = 0;

          if (schedule && schedule.entryHour2 !== null && schedule.entryHour2 !== undefined) {
            const scheduledMinutes2 = schedule.entryHour2 * 60 + (schedule.entryMinute2 || 0);
            const tolerance2 = schedule.toleranceMinutes2 ?? schedule.toleranceMinutes ?? 0;
            const diff = actualTotalMinutes - (scheduledMinutes2 + tolerance2);
            if (diff > 0) {
              diffLate2 = actualTotalMinutes - scheduledMinutes2;
            }
          }

          if (diffLate2 > 0) {
            status = AttendanceStatus.TARDE;
          }
          const totalLate = (attendance.lateMinutes || 0) + diffLate2;

          message = diffLate2 > 0
            ? `¡Bienvenido de vuelta, ${user.firstName}! Entrada Tramo 2 registrada con tardanza (+${diffLate2} min).`
            : `¡Bienvenido de vuelta, ${user.firstName}! Entrada Tramo 2 registrada a tiempo.`;

          if (isDniScan) message += " (Pendiente de confirmación)";

          const entry2Notes = isDniScan
            ? `${attendance.notes ? attendance.notes + " | " : ""}[PENDIENTE_VALIDACION_DNI] Entrada Tramo 2 por DNI a las ${formatLocalTime(now, "HH:mm:ss", timezone)}.`
            : attendance.notes;

          attendance = await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
              entryTime2: now,
              status: status === AttendanceStatus.TARDE || diffLate2 > 0 ? AttendanceStatus.TARDE : attendance.status,
              lateMinutes: totalLate > 0 ? totalLate : null,
              lateMinutes2: diffLate2 > 0 ? diffLate2 : null,
              notes: entry2Notes,
              statusChangedBy: isDniScan ? `KIOSK_DNI_${kiosk.name}` : `KIOSK_${kiosk.name}`,
              statusChangedAt: now,
            },
          });
        }
      } else if (!attendance.exitTime2) {
        // ── 4.ª MARCACIÓN: SALIDA TRAMO 2 (FIN DE JORNADA) ───────────────────
        scanType = "EXIT";
        const entryDate1 = new Date(attendance.entryTime);
        const exitDate1 = new Date(attendance.exitTime);
        const shift1Worked = Math.max(0, differenceInMinutes(exitDate1, entryDate1));

        const entryDate2 = new Date(attendance.entryTime2);
        const shift2Worked = Math.max(0, differenceInMinutes(now, entryDate2));

        workedMinutes = shift1Worked + shift2Worked;

        const hours = Math.floor(workedMinutes / 60);
        const mins = workedMinutes % 60;
        const workedStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

        message = `¡Hasta luego, ${user.firstName}! Jornada completada con éxito. Total trabajado: ${workedStr}.`;
        if (isDniScan) message += " (Pendiente de confirmación)";

        const exit2Notes = isDniScan
          ? `${attendance.notes ? attendance.notes + " | " : ""}[PENDIENTE_VALIDACION_DNI] Salida final por DNI a las ${formatLocalTime(now, "HH:mm:ss", timezone)}.`
          : attendance.notes;

        attendance = await prisma.attendance.update({
          where: { id: attendance.id },
          data: {
            exitTime2: now,
            workedMinutes,
            notes: exit2Notes,
            statusChangedBy: isDniScan ? `KIOSK_DNI_${kiosk.name}` : `KIOSK_${kiosk.name}`,
            statusChangedAt: now,
          },
        });
      } else {
        // ── RE-ESCANEO: JORNADA COMPLETA YA REGISTRADA ───────────────────────
        const diffSinceExit2 = differenceInMinutes(now, new Date(attendance.exitTime2));
        if (diffSinceExit2 < 2 && mode !== "EXIT") {
          scanType = "ALREADY_REGISTERED";
          message = `Tu salida final ya fue registrada a las ${formatLocalTime(
            new Date(attendance.exitTime2),
            "HH:mm",
            timezone
          )}. ¡Que tengas buen descanso!`;
        } else {
          scanType = "EXIT";
          const entryDate1 = new Date(attendance.entryTime);
          const exitDate1 = new Date(attendance.exitTime);
          const shift1Worked = Math.max(0, differenceInMinutes(exitDate1, entryDate1));

          const entryDate2 = new Date(attendance.entryTime2);
          const shift2Worked = Math.max(0, differenceInMinutes(now, entryDate2));
          workedMinutes = shift1Worked + shift2Worked;

          attendance = await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
              exitTime2: now,
              workedMinutes,
              statusChangedBy: isDniScan ? `KIOSK_DNI_${kiosk.name}` : `KIOSK_${kiosk.name}`,
              statusChangedAt: now,
            },
          });

          message = `Salida final actualizada a las ${formatLocalTime(now, "HH:mm", timezone)}. ¡Buen descanso!`;
        }
      }
    } else {
      // ══════════════════════════════════════════════════════════════════════
      //  MODALIDAD: JORNADA CONTINUA (TURNO ÚNICO / 2 MARCACIONES)
      // ══════════════════════════════════════════════════════════════════════

      const isExplicitExit = mode === "EXIT";

      if (!attendance || !attendance.entryTime) {
        // ── CASO A: REGISTRO DE ENTRADA ──────────────────────────────────
        scanType = "ENTRY";

        if (schedule) {
          const scheduledEntryHour = schedule.entryHour;
          const scheduledEntryMin = schedule.entryMinute;
          const tolerance = schedule.toleranceMinutes || 0;

          const scheduledTotalMinutes = scheduledEntryHour * 60 + scheduledEntryMin;
          const diff = actualTotalMinutes - (scheduledTotalMinutes + tolerance);

          if (diff > 0) {
            status = AttendanceStatus.TARDE;
            lateMinutes = actualTotalMinutes - scheduledTotalMinutes;
            message = isDniScan
              ? `¡Hola, ${user.firstName}! Entrada por DNI registrada (${localTimeFormatted}, +${lateMinutes} min tarde). Pendiente de confirmación del supervisor.`
              : `¡Hola, ${user.firstName}! Entrada registrada con tardanza (+${lateMinutes} min).`;
          } else {
            status = AttendanceStatus.PRESENTE;
            message = isDniScan
              ? `¡Hola, ${user.firstName}! Entrada por DNI registrada a las ${localTimeFormatted}. Pendiente de confirmación del supervisor.`
              : `¡Bienvenido(a), ${user.firstName}! Entrada registrada puntualmente.`;
          }
        } else {
          status = AttendanceStatus.PRESENTE;
          message = isDniScan
            ? `¡Hola, ${user.firstName}! Entrada por DNI registrada a las ${localTimeFormatted}. Pendiente de confirmación del supervisor.`
            : `¡Bienvenido(a), ${user.firstName}! Entrada registrada con éxito.`;
        }

        attendance = await prisma.attendance.upsert({
          where: {
            userId_date: {
              userId: user.id,
              date: today,
            },
          },
          update: {
            entryTime: now,
            status,
            lateMinutes: lateMinutes > 0 ? lateMinutes : null,
            locationId: kiosk.locationId,
            kioskId: kiosk.id,
            notes: initialDniNotes,
            statusChangedBy: isDniScan ? `KIOSK_DNI_${kiosk.name}` : `KIOSK_${kiosk.name}`,
            statusChangedAt: now,
          },
          create: {
            userId: user.id,
            locationId: kiosk.locationId,
            kioskId: kiosk.id,
            date: today,
            entryTime: now,
            status,
            lateMinutes: lateMinutes > 0 ? lateMinutes : null,
            notes: initialDniNotes,
            statusChangedBy: isDniScan ? `KIOSK_DNI_${kiosk.name}` : `KIOSK_${kiosk.name}`,
            statusChangedAt: now,
          },
        });
      } else if (!attendance.exitTime || isExplicitExit) {
        // ── CASO B: REGISTRO DE SALIDA ───────────────────────────────────
        scanType = "EXIT";

        const entryDate = new Date(attendance.entryTime);
        workedMinutes = Math.max(0, differenceInMinutes(now, entryDate));

        const finalStatus =
          attendance.status === AttendanceStatus.TARDE
            ? AttendanceStatus.TARDE
            : AttendanceStatus.PRESENTE;

        const exitNotes = isDniScan
          ? `${attendance.notes ? attendance.notes + " | " : ""}[PENDIENTE_VALIDACION_DNI] Salida manual por DNI a las ${formatLocalTime(now, "HH:mm:ss", timezone)}.`
          : attendance.notes;

        attendance = await prisma.attendance.update({
          where: { id: attendance.id },
          data: {
            exitTime: now,
            workedMinutes,
            status: finalStatus,
            notes: exitNotes,
            statusChangedBy: isDniScan ? `KIOSK_DNI_${kiosk.name}` : `KIOSK_${kiosk.name}`,
            statusChangedAt: now,
          },
        });

        const hours = Math.floor(workedMinutes / 60);
        const mins = workedMinutes % 60;
        const workedStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

        message = isDniScan
          ? `¡Hasta luego, ${user.firstName}! Salida por DNI registrada (${workedStr} trabajados). Pendiente de confirmación del supervisor.`
          : `¡Hasta luego, ${user.firstName}! Salida registrada. Tiempo trabajado: ${workedStr}.`;
      } else {
        // ── CASO C: YA TIENE ENTRADA Y SALIDA REGISTRADAS ─────────────────
        const diffSinceExit = differenceInMinutes(now, new Date(attendance.exitTime));
        if (diffSinceExit < 2 && !isExplicitExit) {
          scanType = "ALREADY_REGISTERED";
          message = `Tu salida ya fue registrada a las ${formatLocalTime(
            new Date(attendance.exitTime),
            "HH:mm",
            timezone
          )}. ¡Que tengas buen descanso!`;
        } else {
          scanType = "EXIT";
          const entryDate = new Date(attendance.entryTime);
          workedMinutes = Math.max(0, differenceInMinutes(now, entryDate));

          attendance = await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
              exitTime: now,
              workedMinutes,
              statusChangedBy: isDniScan ? `KIOSK_DNI_${kiosk.name}` : `KIOSK_${kiosk.name}`,
              statusChangedAt: now,
            },
          });

          message = `Salida actualizada a las ${formatLocalTime(now, "HH:mm", timezone)}. ¡Buen descanso!`;
        }
      }
    }

    // ── 8. Notificar a Supervisores si la marcación fue por DNI ─────────────
    if (isDniScan && scanType !== "ALREADY_REGISTERED") {
      try {
        const supervisors = await prisma.user.findMany({
          where: {
            organizationId: kiosk.location.organizationId,
            isActive: true,
            role: { in: ["ADMIN", "SUPERVISOR", "SUPER_ADMIN"] },
            OR: [
              { locationId: null },
              { locationId: kiosk.locationId },
            ],
          },
          select: { id: true },
        });

        const notifTitle = `⚠️ Solicitud de Marcación por DNI — ${user.firstName} ${user.lastName}`;
        const notifBody = `${user.firstName} ${user.lastName} (DNI: ${user.documentId || searchQrToken}) marcó ${scanType === "ENTRY" ? "ENTRADA" : "SALIDA"} manualmente en ${kiosk.name} a las ${formatLocalTime(now, "HH:mm", timezone)}. Requiere confirmación de identidad.`;

        const notificationData = {
          isDniApproval: true,
          attendanceId: attendance.id,
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          userPhoto: user.photoUrl,
          documentId: user.documentId || searchQrToken,
          scanType,
          time: formatLocalTime(now, "HH:mm:ss", timezone),
          locationId: kiosk.locationId,
          locationName: kiosk.location.name,
          kioskName: kiosk.name,
          proposedStatus: status,
        };

        if (supervisors.length > 0) {
          await prisma.notification.createMany({
            data: supervisors.map((sup) => ({
              userId: sup.id,
              type: "LLEGADA_TARDE", // Uso de tipo existente
              title: notifTitle,
              body: notifBody,
              data: notificationData,
            })),
          });
        }
      } catch (notifErr) {
        console.error("Error al despachar notificación de verificación DNI:", notifErr);
      }
    }

    // ── 9. Registrar Log de Auditoría ──────────────────────────────────────
    await logAuditEvent({
      organizationId: kiosk.location.organizationId,
      userId: user.id,
      action: AuditAction.ATTENDANCE_SCANNED,
      entityType: "ATTENDANCE",
      entityId: attendance.id,
      newData: {
        scanType,
        status: attendance.status,
        kioskId: kiosk.id,
        kioskName: kiosk.name,
        entryTime: attendance.entryTime,
        exitTime: attendance.exitTime,
        entryTime2: attendance.entryTime2,
        exitTime2: attendance.exitTime2,
        lateMinutes: attendance.lateMinutes,
        lateMinutes2: attendance.lateMinutes2,
        isSigned: isSigned,
        isDniScan,
        requiresVerification: isDniScan,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      scanType,
      message,
      requiresVerification: isDniScan,
      time: formatLocalTime(now, "HH:mm:ss", timezone),
      date: getLocalDateString(now, timezone),
      status: attendance.status,
      lateMinutes: attendance.lateMinutes,
      lateMinutes2: attendance.lateMinutes2,
      workedMinutes: attendance.workedMinutes,
      entryTime: attendance.entryTime,
      exitTime: attendance.exitTime,
      entryTime2: attendance.entryTime2,
      exitTime2: attendance.exitTime2,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        documentId: user.documentId,
        role: user.role,
        photoUrl: user.photoUrl,
        locationName: kiosk.location.name,
      },
      kiosk: {
        id: kiosk.id,
        name: kiosk.name,
      },
    });
  } catch (error: any) {
    console.error("Error en escaneo de asistencia:", error);
    return NextResponse.json(
      { error: "Error interno al procesar escaneo" },
      { status: 500 }
    );
  }
}
