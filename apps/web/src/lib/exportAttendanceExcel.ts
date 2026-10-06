import { format } from "date-fns";
import ExcelJS from "exceljs";
import {
  createPresenxaWorkbook,
  renderExecutiveHeader,
  renderKpiCards,
  styleTableHeader,
  styleAsBadge,
  getRoleBadgeStyle,
  getStatusBadgeStyle,
  EXCEL_PALETTE,
  TableColumnConfig,
} from "./excelDesignEngine";
import { formatUserRole } from "./exportUsersExcel";

export interface AttendanceExportItem {
  id: string;
  date: Date | string;
  entryTime?: Date | string | null;
  exitTime?: Date | string | null;
  entryTime2?: Date | string | null;
  exitTime2?: Date | string | null;
  workedMinutes?: number | null;
  lateMinutes?: number | null;
  status: string;
  notes?: string | null;
  statusChangedBy?: string | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    documentId?: string | null;
    role: string;
  };
  location?: {
    name: string;
  } | null;
  kiosk?: {
    name: string;
  } | null;
}

export function formatAttendanceStatus(status: string): string {
  switch (status) {
    case "PRESENT":
      return "Puntual";
    case "LATE":
      return "Tardanza";
    case "ABSENT":
      return "Falta";
    case "EXCUSED":
      return "Justificado";
    default:
      return status;
  }
}

/**
 * Genera un libro de trabajo Excel (.xlsx) de alta dirección para el Control de Asistencias.
 */
export async function generateAttendanceExcelWorkbook(options: {
  attendances: AttendanceExportItem[];
  companyName: string;
  ruc?: string;
  periodLabel: string;
}): Promise<ExcelJS.Workbook> {
  const { attendances, companyName, ruc, periodLabel } = options;
  const now = new Date();
  const dateFormatted = format(now, "dd/MM/yyyy HH:mm");

  const workbook = createPresenxaWorkbook(
    `Reporte de Asistencias - ${companyName}`
  );

  // -------------------------------------------------------------
  // HOJA 1: REGISTRO DETALLADO DE ASISTENCIAS
  // -------------------------------------------------------------
  const wsMain = workbook.addWorksheet("Control de Asistencias", {
    views: [{ state: "frozen", ySplit: 9, showGridLines: true }],
  });

  // 1. Membrete Ejecutivo
  renderExecutiveHeader(wsMain, {
    reportTitle: "Reporte Oficial de Asistencia y Puntualidad",
    organizationName: companyName,
    ruc,
    metaInfo: `Período: ${periodLabel}  |  Emisión: ${dateFormatted}  |  Registros: ${attendances.length}`,
    colSpan: 15,
  });

  // 2. Cálculo de métricas para tarjetas KPI
  let puntualesCount = 0;
  let tardanzasCount = 0;
  let faltasCount = 0;
  let totalWorkedMinutes = 0;
  let totalLateMinutes = 0;

  attendances.forEach((a) => {
    if (a.status === "PRESENT") puntualesCount++;
    else if (a.status === "LATE") {
      tardanzasCount++;
      totalLateMinutes += a.lateMinutes || 0;
    } else if (a.status === "ABSENT") faltasCount++;

    if (a.workedMinutes) totalWorkedMinutes += a.workedMinutes;
  });

  const totalHours = (totalWorkedMinutes / 60).toFixed(1);
  const punctualityRate =
    attendances.length > 0
      ? Math.round((puntualesCount / attendances.length) * 100)
      : 0;

  renderKpiCards(
    wsMain,
    [
      {
        label: "Total Marcaciones",
        value: attendances.length,
        subtext: "Registros en período",
        bgHex: "FFF8FAFC",
        borderHex: EXCEL_PALETTE.SLATE_BORDER,
        textHex: EXCEL_PALETTE.SLATE_MUTED,
        valueHex: EXCEL_PALETTE.SLATE_HEADER,
      },
      {
        label: "Puntuales",
        value: puntualesCount,
        subtext: `${punctualityRate}% de puntualidad`,
        bgHex: "FFECFDF5",
        borderHex: "FFA7F3D0",
        textHex: "FF047857",
        valueHex: "FF047857",
      },
      {
        label: "Tardanzas",
        value: tardanzasCount,
        subtext: `${totalLateMinutes} min acumulados`,
        bgHex: "FFFEF3C7",
        borderHex: "FFFDE68A",
        textHex: "FFB45309",
        valueHex: "FFB45309",
      },
      {
        label: "Faltas / Ausencias",
        value: faltasCount,
        subtext: "Sin registro de jornada",
        bgHex: "FFFFF1F2",
        borderHex: "FFFECDD3",
        textHex: "FFBE123C",
        valueHex: "FFBE123C",
      },
      {
        label: "Horas Laboradas",
        value: `${totalHours} hrs`,
        subtext: "Efectivas computadas",
        bgHex: "FFF0F9FF",
        borderHex: "FFBAE6FD",
        textHex: "FF0369A1",
        valueHex: "FF0369A1",
      },
    ],
    5
  );

  // 3. Encabezados de la Tabla Principal (Fila 9)
  const columns: TableColumnConfig[] = [
    { header: "N°", key: "index", width: 6, align: "center" },
    { header: "Fecha", key: "date", width: 13, align: "center" },
    { header: "Documento / DNI", key: "dni", width: 17, align: "center", isCodeOrDoc: true },
    { header: "Apellidos y Nombres", key: "userName", width: 26, align: "left" },
    { header: "Rol", key: "role", width: 16, align: "center" },
    { header: "Sede / Sucursal", key: "location", width: 22, align: "left" },
    { header: "Kiosk / Dispositivo", key: "kiosk", width: 20, align: "left" },
    { header: "Entrada T1", key: "in1", width: 13, align: "center" },
    { header: "Salida T1 (Receso)", key: "out1", width: 14, align: "center" },
    { header: "Entrada T2 (Retorno)", key: "in2", width: 14, align: "center" },
    { header: "Salida T2 (Final)", key: "out2", width: 13, align: "center" },
    { header: "Horas Trabajadas", key: "hours", width: 15, align: "right" },
    { header: "Estado", key: "status", width: 15, align: "center" },
    { header: "Min Tardanza", key: "late", width: 14, align: "right" },
    { header: "Notas / Justificación", key: "notes", width: 28, align: "left" },
    { header: "Auditado Por", key: "audited", width: 18, align: "left" },
  ];

  styleTableHeader(wsMain, 9, columns, EXCEL_PALETTE.SLATE_HEADER);

  // Filtros automáticos
  wsMain.autoFilter = {
    from: { row: 9, column: 1 },
    to: { row: 9, column: columns.length },
  };

  // 4. Filas de Datos
  const startRow = 10;
  attendances.forEach((a, index) => {
    const rowNumber = startRow + index;
    const row = wsMain.getRow(rowNumber);
    row.height = 21;

    const isEven = index % 2 === 0;
    const zebraBg = isEven ? EXCEL_PALETTE.WHITE : EXCEL_PALETTE.ZEBRA_ROW;

    const dateStr = format(new Date(a.date), "dd/MM/yyyy");
    const in1 = a.entryTime ? format(new Date(a.entryTime), "HH:mm:ss") : "--:--:--";
    const out1 = a.exitTime ? format(new Date(a.exitTime), "HH:mm:ss") : "--:--:--";
    const in2 = a.entryTime2 ? format(new Date(a.entryTime2), "HH:mm:ss") : "--:--:--";
    const out2 = a.exitTime2 ? format(new Date(a.exitTime2), "HH:mm:ss") : "--:--:--";
    const workedHours = a.workedMinutes ? (a.workedMinutes / 60).toFixed(2) + " hrs" : "0.00 hrs";
    const fullName = `${a.user.lastName}, ${a.user.firstName}`;
    const roleText = formatUserRole(a.user.role);
    const statusText = formatAttendanceStatus(a.status);

    const values = [
      index + 1,
      dateStr,
      a.user.documentId || "-",
      fullName,
      roleText,
      a.location?.name || "Sin sede",
      a.kiosk?.name || "Virtual / Web",
      in1,
      out1,
      in2,
      out2,
      workedHours,
      statusText,
      a.lateMinutes || 0,
      a.notes || "-",
      a.statusChangedBy || "Sistema",
    ];

    values.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;

      cell.font = {
        name: "Segoe UI",
        size: 9.5,
        bold: colIdx === 3, // Nombre del colaborador en bold
        color: { argb: EXCEL_PALETTE.SLATE_HEADER },
      };

      const colDef = columns[colIdx];
      cell.alignment = {
        vertical: "middle",
        horizontal: colDef.align || "left",
      };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: zebraBg },
      };

      cell.border = {
        top: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_BORDER } },
        bottom: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_BORDER } },
        left: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_BORDER } },
        right: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_BORDER } },
      };

      if (colDef.isCodeOrDoc) {
        cell.numFmt = "@";
      }
    });

    // Badge para Rol (Columna 5)
    const roleBadge = getRoleBadgeStyle(a.user.role);
    styleAsBadge(row.getCell(5), roleBadge.bgHex, roleBadge.fgHex);

    // Badge para Estado de Asistencia (Columna 13)
    const statusBadge = getStatusBadgeStyle(a.status);
    styleAsBadge(row.getCell(13), statusBadge.bgHex, statusBadge.fgHex);
  });

  // Fila de cierre / Certificación
  const footerRowIdx = startRow + attendances.length + 1;
  const footerRow = wsMain.getRow(footerRowIdx);
  footerRow.height = 20;
  wsMain.mergeCells(footerRowIdx, 1, footerRowIdx, columns.length);
  const footerCell = footerRow.getCell(1);
  footerCell.value = `Reporte generado oficialmente por Presenxa. Certificado para control laboral, nómina y fiscalización.`;
  footerCell.font = { name: "Segoe UI", size: 8, italic: true, color: { argb: EXCEL_PALETTE.SLATE_MUTED } };
  footerCell.alignment = { vertical: "middle", horizontal: "left" };

  // -------------------------------------------------------------
  // HOJA 2: MÉTRICAS Y RESUMEN POR SEDE
  // -------------------------------------------------------------
  const wsSummary = workbook.addWorksheet("Resumen y Métricas", {
    views: [{ showGridLines: true }],
  });

  renderExecutiveHeader(wsSummary, {
    reportTitle: "Resumen Consolidado de Asistencia por Sede",
    organizationName: companyName,
    ruc,
    metaInfo: `Período: ${periodLabel}`,
    colSpan: 7,
  });

  const sedeHeaderRow = wsSummary.getRow(5);
  sedeHeaderRow.height = 24;
  const sedeCols = [
    "Sede / Sucursal",
    "Total Marcaciones",
    "Puntuales",
    "Tardanzas",
    "Faltas",
    "Min. Tardanza Total",
    "% Puntualidad",
  ];
  const sedeWidths = [26, 18, 14, 14, 14, 20, 16];

  sedeCols.forEach((h, idx) => {
    const c = sedeHeaderRow.getCell(idx + 1);
    c.value = h.toUpperCase();
    c.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: EXCEL_PALETTE.WHITE } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_PALETTE.EMERALD_PRIMARY } };
    c.alignment = { vertical: "middle", horizontal: idx === 0 ? "left" : "center" };
    wsSummary.getColumn(idx + 1).width = sedeWidths[idx];
  });

  const locationMap = new Map<
    string,
    { total: number; puntuales: number; tardanzas: number; faltas: number; lateMins: number }
  >();

  attendances.forEach((a) => {
    const loc = a.location?.name || "Sin Sede Asignada";
    const cur = locationMap.get(loc) || { total: 0, puntuales: 0, tardanzas: 0, faltas: 0, lateMins: 0 };
    cur.total++;
    if (a.status === "PRESENT") cur.puntuales++;
    else if (a.status === "LATE") {
      cur.tardanzas++;
      cur.lateMins += a.lateMinutes || 0;
    } else if (a.status === "ABSENT") cur.faltas++;
    locationMap.set(loc, cur);
  });

  let currentSedeRow = 6;
  locationMap.forEach((stats, locName) => {
    const r = wsSummary.getRow(currentSedeRow);
    r.height = 21;
    const rate = stats.total > 0 ? (stats.puntuales / stats.total) * 100 : 0;

    [
      locName,
      stats.total,
      stats.puntuales,
      stats.tardanzas,
      stats.faltas,
      stats.lateMins,
      `${rate.toFixed(1)}%`,
    ].forEach((val, idx) => {
      const c = r.getCell(idx + 1);
      c.value = val;
      c.font = { name: "Segoe UI", size: 9, color: { argb: EXCEL_PALETTE.SLATE_HEADER } };
      c.alignment = { vertical: "middle", horizontal: idx === 0 ? "left" : "center" };
      c.border = {
        top: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_BORDER } },
        bottom: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_BORDER } },
        left: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_BORDER } },
        right: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_BORDER } },
      };
    });
    currentSedeRow++;
  });

  // Fila Total
  const totalRow = wsSummary.getRow(currentSedeRow);
  totalRow.height = 24;
  [
    "TOTAL CONSOLIDADO",
    attendances.length,
    puntualesCount,
    tardanzasCount,
    faltasCount,
    totalLateMinutes,
    `${punctualityRate.toFixed(1)}%`,
  ].forEach((val, idx) => {
    const c = totalRow.getCell(idx + 1);
    c.value = val;
    c.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: EXCEL_PALETTE.SLATE_HEADER } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    c.alignment = { vertical: "middle", horizontal: idx === 0 ? "left" : "center" };
    c.border = {
      top: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_DARK_BORDER } },
      bottom: { style: "double", color: { argb: EXCEL_PALETTE.SLATE_DARK_BORDER } },
    };
  });

  return workbook;
}
