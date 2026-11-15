import { describe, it, expect } from "vitest";
import { generateAttendanceExcelWorkbook } from "../exportAttendanceExcel";
import { formatAttendanceStatus, calculatePunctualityRate } from "../attendanceFormatters";

describe("exportAttendanceExcel", () => {
  it("formatea correctamente los estados reales de AttendanceStatus", () => {
    expect(formatAttendanceStatus("PRESENTE")).toBe("Puntual");
    expect(formatAttendanceStatus("TARDE")).toBe("Tardanza");
    expect(formatAttendanceStatus("AUSENTE")).toBe("Falta");
    expect(formatAttendanceStatus("ABANDONO_PUESTO")).toBe("Abandono");
    expect(formatAttendanceStatus("INCOMPLETO")).toBe("Incompleto");
    expect(formatAttendanceStatus("JUSTIFICADO")).toBe("Justificado");
    expect(formatAttendanceStatus("PERMISO")).toBe("Permiso");
    expect(formatAttendanceStatus("VACACIONES")).toBe("Vacaciones");
    expect(formatAttendanceStatus("DESCANSO_MEDICO")).toBe("Desc. Médico");
    expect(formatAttendanceStatus("FERIADO")).toBe("Feriado");
    expect(formatAttendanceStatus("DIA_LIBRE")).toBe("Día Libre");
    expect(formatAttendanceStatus("PENDIENTE")).toBe("Pendiente");
  });

  it("calcula puntualidad consistente sobre marcaciones efectivas", () => {
    expect(calculatePunctualityRate(3, 1)).toBe(75);
    expect(calculatePunctualityRate(0, 0)).toBe(0);
  });

  it("genera KPIs y Hoja 2 con conteos reales y suma de lateMinutes + lateMinutes2", async () => {
    const workbook = await generateAttendanceExcelWorkbook({
      companyName: "Empresa Demo SAC",
      ruc: "20123456789",
      periodLabel: "Noviembre 2026",
      attendances: [
        {
          id: "1",
          date: "2026-11-02T05:00:00.000Z",
          entryTime: "2026-11-02T13:00:00.000Z",
          exitTime: "2026-11-02T22:00:00.000Z",
          workedMinutes: 480,
          lateMinutes: 0,
          lateMinutes2: 0,
          status: "PRESENTE",
          user: { firstName: "Ana", lastName: "Pérez", email: "ana@demo.com", documentId: "01234567", role: "EMPLEADO" },
          location: { name: "Sede Central" },
        },
        {
          id: "2",
          date: "2026-11-02T05:00:00.000Z",
          entryTime: "2026-11-02T13:15:00.000Z",
          exitTime: "2026-11-02T22:00:00.000Z",
          workedMinutes: 465,
          lateMinutes: 15,
          lateMinutes2: 10,
          status: "TARDE",
          user: { firstName: "Luis", lastName: "Gómez", email: "luis@demo.com", documentId: "76543210", role: "SUPERVISOR" },
          location: { name: "Sede Central" },
        },
        {
          id: "3",
          date: "2026-11-02T05:00:00.000Z",
          workedMinutes: 0,
          lateMinutes: 0,
          status: "AUSENTE",
          user: { firstName: "Carlos", lastName: "Ruiz", email: "carlos@demo.com", documentId: "88888888", role: "EMPLEADO" },
          location: { name: "Sede Central" },
        },
      ],
    });

    const wsMain = workbook.getWorksheet("Control de Asistencias")!;
    expect(wsMain).toBeDefined();

    // KPI Cards en fila 6: col 1=Total(3), col 3=Puntuales(1), col 5=Tardanzas(1), col 7=Faltas(1)
    expect(wsMain.getRow(6).getCell(1).value).toBe(3);
    expect(wsMain.getRow(6).getCell(3).value).toBe(1);
    expect(wsMain.getRow(6).getCell(5).value).toBe(1);
    expect(wsMain.getRow(6).getCell(7).value).toBe(1);

    // Fila de detalle 2 (row 11): Estado = "Tardanza", Min Tardanza = 15 + 10 = 25
    expect(wsMain.getRow(11).getCell(13).value).toBe("Tardanza");
    expect(wsMain.getRow(11).getCell(14).value).toBe(25);

    // Hoja 2: Resumen y Métricas (fila 6 = Sede Central)
    const wsSummary = workbook.getWorksheet("Resumen y Métricas")!;
    expect(wsSummary.getRow(6).getCell(1).value).toBe("Sede Central");
    expect(wsSummary.getRow(6).getCell(2).value).toBe(3); // Total
    expect(wsSummary.getRow(6).getCell(3).value).toBe(1); // Puntuales
    expect(wsSummary.getRow(6).getCell(4).value).toBe(1); // Tardanzas
    expect(wsSummary.getRow(6).getCell(5).value).toBe(1); // Faltas
    expect(wsSummary.getRow(6).getCell(6).value).toBe(25); // Min Tardanza
    expect(wsSummary.getRow(6).getCell(7).value).toBe("50.0%"); // 1 / (1 + 1)
  });
});
