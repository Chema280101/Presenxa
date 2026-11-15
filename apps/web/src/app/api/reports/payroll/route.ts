import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, AttendanceStatus } from "@asistencias/db";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const locationId = searchParams.get("locationId");
    const departmentId = searchParams.get("departmentId");
    const roleFilter = searchParams.get("role");
    const userId = searchParams.get("userId");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Se requieren startDate y endDate" },
        { status: 400 }
      );
    }

    const startDb = new Date(`${startDate}T00:00:00.000Z`);
    const endDb = new Date(`${endDate}T23:59:59.999Z`);

    const userWhere: any = {
      organizationId: session.user.organizationId,
      isActive: true,
    };
    if (locationId && locationId !== "ALL") userWhere.locationId = locationId;
    if (departmentId && departmentId !== "ALL") userWhere.departmentId = departmentId;
    if (roleFilter && roleFilter !== "ALL") userWhere.role = roleFilter;
    if (userId && userId !== "ALL") userWhere.id = userId;

    const [organization, users] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: session.user.organizationId },
        select: { name: true, settings: true },
      }),
      prisma.user.findMany({
        where: userWhere,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          documentId: true,
          email: true,
          role: true,
          location: { select: { name: true } },
          department: { select: { name: true } },
          attendances: {
            where: {
              date: { gte: startDb, lte: endDb },
            },
            select: {
              status: true,
              workedMinutes: true,
              lateMinutes: true,
              lateMinutes2: true,
              overtimeMinutes: true,
              overtimeStatus: true,
            },
          },
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
    ]);

    const rows = users.map((u) => {
      let effectiveDays = 0;
      let holidayDays = 0;
      let vacationDays = 0;
      let medicalLeaveDays = 0;
      let permitDays = 0;
      let unexcusedAbsences = 0;
      let lateCount = 0;
      let totalLateMinutes = 0;
      let totalWorkedMinutes = 0;
      let approvedOvertimeMinutes = 0;

      for (const att of u.attendances) {
        totalWorkedMinutes += att.workedMinutes || 0;
        if (att.overtimeStatus === "APPROVED") {
          approvedOvertimeMinutes += att.overtimeMinutes || 0;
        }

        switch (att.status) {
          case AttendanceStatus.PRESENTE:
          case AttendanceStatus.JUSTIFICADO:
            effectiveDays += 1;
            break;
          case AttendanceStatus.TARDE:
            effectiveDays += 1;
            lateCount += 1;
            totalLateMinutes += (att.lateMinutes || 0) + (att.lateMinutes2 || 0);
            break;
          case AttendanceStatus.FERIADO:
            holidayDays += 1;
            break;
          case AttendanceStatus.VACACIONES:
            vacationDays += 1;
            break;
          case AttendanceStatus.DESCANSO_MEDICO:
            medicalLeaveDays += 1;
            break;
          case AttendanceStatus.PERMISO:
            permitDays += 1;
            break;
          case AttendanceStatus.AUSENTE:
          case AttendanceStatus.ABANDONO_PUESTO:
            unexcusedAbsences += 1;
            break;
          default:
            break;
        }
      }

      return {
        userId: u.id,
        documentId: u.documentId || "—",
        fullName: `${u.firstName} ${u.lastName}`.trim(),
        email: u.email,
        role: u.role,
        locationName: u.location?.name || "Sin sede",
        departmentName: u.department?.name || "General",
        effectiveDays,
        holidayDays,
        vacationDays,
        medicalLeaveDays,
        permitDays,
        unexcusedAbsences,
        lateCount,
        totalLateMinutes,
        totalWorkedHours: Math.round((totalWorkedMinutes / 60) * 100) / 100,
        approvedOvertimeHours: Math.round((approvedOvertimeMinutes / 60) * 100) / 100,
      };
    });

    const orgSettings = (organization?.settings as any) || {};

    return NextResponse.json({
      period: { startDate, endDate },
      organizationName: organization?.name || "Empresa",
      ruc: orgSettings.ruc || null,
      rows,
    });
  } catch (error) {
    console.error("[Payroll Report API] Error:", error);
    return NextResponse.json(
      { error: "Error al generar el tareo de pre-planilla" },
      { status: 500 }
    );
  }
}
