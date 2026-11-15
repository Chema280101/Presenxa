import { format } from "date-fns";
import {
  createPresenxaWorkbook,
  downloadExcelWorkbook,
  EXCEL_PALETTE,
  renderExecutiveHeader,
  styleTableHeader,
  TableColumnConfig,
} from "./excelDesignEngine";
import { formatUserRole } from "./exportUsersExcel";

export interface PayrollRow {
  documentId: string;
  fullName: string;
  email: string;
  role: string;
  locationName: string;
  departmentName: string;
  effectiveDays: number;
  holidayDays: number;
  vacationDays: number;
  medicalLeaveDays: number;
  permitDays: number;
  unexcusedAbsences: number;
  lateCount: number;
  totalLateMinutes: number;
  totalWorkedHours: number;
  approvedOvertimeHours: number;
}

export interface PayrollExportOptions {
  companyName?: string;
  ruc?: string | null;
}

export async function exportPayrollToExcel(
  rows: PayrollRow[],
  startDate: string,
  endDate: string,
  options: PayrollExportOptions = {}
) {
  const companyName = options.companyName || "Empresa";
  const ruc = options.ruc || undefined;
  const now = new Date();
  const dateFormatted = format(now, "dd/MM/yyyy HH:mm");

  const workbook = createPresenxaWorkbook(
    `Tareo Pre-Planilla - ${companyName} (${startDate} al ${endDate})`
  );

  const sheet = workbook.addWorksheet("Tareo Pre-Planilla", {
    views: [{ state: "frozen", ySplit: 5, showGridLines: true }],
  });

  renderExecutiveHeader(sheet, {
    reportTitle: `Tareo Mensual / Pre-Planilla Contable (${startDate} al ${endDate})`,
    organizationName: companyName,
    ruc,
    metaInfo: `Emisión: ${dateFormatted}  |  Colaboradores: ${rows.length}`,
    colSpan: 15,
  });

  const columns: TableColumnConfig[] = [
    { header: "DNI / Doc", key: "documentId", width: 15, align: "center", isCodeOrDoc: true },
    { header: "Colaborador", key: "fullName", width: 28, align: "left" },
    { header: "Sede", key: "locationName", width: 20, align: "left" },
    { header: "Departamento", key: "departmentName", width: 18, align: "left" },
    { header: "Rol", key: "role", width: 16, align: "center" },
    { header: "Días Efectivos", key: "effectiveDays", width: 14, align: "center" },
    { header: "Feriados", key: "holidayDays", width: 11, align: "center" },
    { header: "Vacaciones", key: "vacationDays", width: 12, align: "center" },
    { header: "Desc. Médico", key: "medicalLeaveDays", width: 13, align: "center" },
    { header: "Permisos", key: "permitDays", width: 11, align: "center" },
    { header: "Faltas Injust.", key: "unexcusedAbsences", width: 13, align: "center" },
    { header: "Tardanzas (#)", key: "lateCount", width: 13, align: "center" },
    { header: "Min. Tardanza", key: "totalLateMinutes", width: 14, align: "center" },
    { header: "Horas Trabajadas", key: "totalWorkedHours", width: 16, align: "right" },
    { header: "Horas Extras Aprob.", key: "approvedOvertimeHours", width: 18, align: "right" },
  ];

  const headerRowIdx = 5;
  styleTableHeader(sheet, headerRowIdx, columns, EXCEL_PALETTE.EMERALD_PRIMARY);

  sheet.autoFilter = {
    from: { row: headerRowIdx, column: 1 },
    to: { row: headerRowIdx, column: columns.length },
  };

  const totals = {
    effectiveDays: 0,
    holidayDays: 0,
    vacationDays: 0,
    medicalLeaveDays: 0,
    permitDays: 0,
    unexcusedAbsences: 0,
    lateCount: 0,
    totalLateMinutes: 0,
    totalWorkedHours: 0,
    approvedOvertimeHours: 0,
  };

  const startRow = headerRowIdx + 1;
  rows.forEach((r, index) => {
    const row = sheet.getRow(startRow + index);
    row.height = 21;
    const isEven = index % 2 === 0;
    const zebraBg = isEven ? EXCEL_PALETTE.WHITE : EXCEL_PALETTE.ZEBRA_ROW;

    totals.effectiveDays += r.effectiveDays;
    totals.holidayDays += r.holidayDays;
    totals.vacationDays += r.vacationDays;
    totals.medicalLeaveDays += r.medicalLeaveDays;
    totals.permitDays += r.permitDays;
    totals.unexcusedAbsences += r.unexcusedAbsences;
    totals.lateCount += r.lateCount;
    totals.totalLateMinutes += r.totalLateMinutes;
    totals.totalWorkedHours += r.totalWorkedHours;
    totals.approvedOvertimeHours += r.approvedOvertimeHours;

    const values = [
      r.documentId,
      r.fullName,
      r.locationName,
      r.departmentName,
      formatUserRole(r.role),
      r.effectiveDays,
      r.holidayDays,
      r.vacationDays,
      r.medicalLeaveDays,
      r.permitDays,
      r.unexcusedAbsences,
      r.lateCount,
      r.totalLateMinutes,
      Number(r.totalWorkedHours.toFixed(2)),
      Number(r.approvedOvertimeHours.toFixed(2)),
    ];

    values.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      const colDef = columns[colIdx];
      cell.value = val;
      cell.font = {
        name: "Segoe UI",
        size: 9.5,
        bold: colIdx === 1,
        color: { argb: EXCEL_PALETTE.SLATE_HEADER },
      };
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
      } else if (colIdx >= 13) {
        cell.numFmt = "0.00";
      }
    });
  });

  // Fila de totales consolidados
  const totalRow = sheet.getRow(startRow + rows.length);
  totalRow.height = 24;
  const totalValues = [
    "TOTAL GENERAL",
    `${rows.length} colaboradores`,
    "",
    "",
    "",
    totals.effectiveDays,
    totals.holidayDays,
    totals.vacationDays,
    totals.medicalLeaveDays,
    totals.permitDays,
    totals.unexcusedAbsences,
    totals.lateCount,
    totals.totalLateMinutes,
    Number(totals.totalWorkedHours.toFixed(2)),
    Number(totals.approvedOvertimeHours.toFixed(2)),
  ];

  totalValues.forEach((val, colIdx) => {
    const cell = totalRow.getCell(colIdx + 1);
    const colDef = columns[colIdx];
    cell.value = val;
    cell.font = {
      name: "Segoe UI",
      size: 9.5,
      bold: true,
      color: { argb: EXCEL_PALETTE.SLATE_HEADER },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: colDef.align || "left",
    };
    cell.border = {
      top: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_DARK_BORDER } },
      bottom: { style: "double", color: { argb: EXCEL_PALETTE.SLATE_DARK_BORDER } },
    };
    if (colIdx >= 13) {
      cell.numFmt = "0.00";
    }
  });

  const sanitizedOrg = companyName.replace(/[^a-zA-Z0-9]/g, "_");
  await downloadExcelWorkbook(
    workbook,
    `Tareo_PrePlanilla_${sanitizedOrg}_${startDate}_${endDate}.xlsx`
  );
}
