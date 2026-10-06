import ExcelJS from "exceljs";

/**
 * Paleta corporativa de Presenxa para Hojas de Cálculo Ejecutivas.
 * Basada en el sistema de diseño oficial de Presenxa (Emerald #008540, Slate #0F172A).
 */
export const EXCEL_PALETTE = {
  // Brand
  EMERALD_PRIMARY: "FF008540", // Verde Presenxa corporativo
  EMERALD_LIGHT: "FFE5F6EC",   // Verde fondo suave
  EMERALD_TEXT: "FF006430",
  SLATE_HEADER: "FF0F172A",    // Slate 900 para encabezados de tablas
  SLATE_CARD: "FFF8FAFC",      // Slate 50 para fondos de tarjetas
  SLATE_MUTED: "FF64748B",     // Slate 500 para texto secundario
  SLATE_BORDER: "FFE2E8F0",    // Slate 200 para bordes
  SLATE_DARK_BORDER: "FFCBD5E1",
  WHITE: "FFFFFFFF",
  ZEBRA_ROW: "FFF8FAFC",

  // Estados & Semáforos
  STATUS_ACTIVO_BG: "FFDCFCE7",
  STATUS_ACTIVO_FG: "FF15803D",
  STATUS_INACTIVO_BG: "FFFEE2E2",
  STATUS_INACTIVO_FG: "FFB91C1C",

  STATUS_PUNTUAL_BG: "FFDCFCE7",
  STATUS_PUNTUAL_FG: "FF15803D",
  STATUS_TARDANZA_BG: "FFFEF3C7",
  STATUS_TARDANZA_FG: "FFB45309",
  STATUS_FALTA_BG: "FFFEE2E2",
  STATUS_FALTA_FG: "FFB91C1C",
  STATUS_JUSTIFICADO_BG: "FFE0F2FE",
  STATUS_JUSTIFICADO_FG: "FF0369A1",

  // Roles
  ROLE_ADMIN_BG: "FFF3E8FF",
  ROLE_ADMIN_FG: "FF7E22CE",
  ROLE_SUPER_ADMIN_BG: "FFF5D0FE",
  ROLE_SUPER_ADMIN_FG: "FF86198F",
  ROLE_SUPERVISOR_BG: "FFE0E7FF",
  ROLE_SUPERVISOR_FG: "FF3730A3",
  ROLE_EMPLEADO_BG: "FFF1F5F9",
  ROLE_EMPLEADO_FG: "FF334155",
} as const;

export interface KpiCardConfig {
  label: string;
  value: string | number;
  subtext?: string;
  bgHex?: string;
  borderHex?: string;
  textHex?: string;
  valueHex?: string;
}

export interface TableColumnConfig {
  header: string;
  key: string;
  width: number;
  align?: "left" | "center" | "right";
  isCodeOrDoc?: boolean;
}

/**
 * Crea un libro de trabajo Excel con metadatos corporativos de Presenxa.
 */
export function createPresenxaWorkbook(title: string): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Presenxa - Control Inteligente de Asistencias";
  workbook.lastModifiedBy = "Presenxa";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.title = title;
  return workbook;
}

/**
 * Renderiza el membrete y encabezado ejecutivo superior en una hoja.
 */
export function renderExecutiveHeader(
  worksheet: ExcelJS.Worksheet,
  options: {
    systemTitle?: string;
    reportTitle: string;
    organizationName: string;
    ruc?: string | null;
    metaInfo?: string;
    colSpan?: number;
  }
) {
  const colSpan = options.colSpan || 11;
  const sysTitle = options.systemTitle || "PRESENXA · CONTROL INTELIGENTE DE TALENTO & ASISTENCIAS";

  // Fila 1: Mini badge corporativo
  const r1 = worksheet.getRow(1);
  r1.height = 18;
  const c1 = r1.getCell(1);
  c1.value = sysTitle;
  c1.font = { name: "Segoe UI", size: 8, bold: true, color: { argb: "FF008540" } };
  c1.alignment = { vertical: "middle", horizontal: "left" };

  // Fila 2: Título principal
  const r2 = worksheet.getRow(2);
  r2.height = 26;
  const c2 = r2.getCell(1);
  c2.value = options.reportTitle.toUpperCase();
  c2.font = { name: "Segoe UI", size: 15, bold: true, color: { argb: EXCEL_PALETTE.SLATE_HEADER } };
  c2.alignment = { vertical: "middle", horizontal: "left" };

  // Fila 3: Metadatos de organización y emisión
  const r3 = worksheet.getRow(3);
  r3.height = 18;
  const c3 = r3.getCell(1);
  const rucText = options.ruc ? `  |  RUC: ${options.ruc}` : "";
  const meta = options.metaInfo ? `  |  ${options.metaInfo}` : "";
  c3.value = `Organización: ${options.organizationName}${rucText}${meta}`;
  c3.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: EXCEL_PALETTE.SLATE_MUTED } };
  c3.alignment = { vertical: "middle", horizontal: "left" };

  // Fila 4: Espacio separador
  worksheet.getRow(4).height = 10;
}

/**
 * Renderiza tarjetas ejecutivas de KPI (Dashboard superior en Excel).
 * Utiliza columnas de 2 en 2 a partir de la fila 5.
 */
export function renderKpiCards(
  worksheet: ExcelJS.Worksheet,
  cards: KpiCardConfig[],
  startRow: number = 5
) {
  const topRow = worksheet.getRow(startRow);
  const valRow = worksheet.getRow(startRow + 1);
  const subRow = worksheet.getRow(startRow + 2);

  topRow.height = 16;
  valRow.height = 26;
  subRow.height = 15;

  const cardWidth = 2; // cada card ocupa 2 columnas

  cards.forEach((card, idx) => {
    const colStart = 1 + idx * cardWidth;
    const colEnd = colStart + cardWidth - 1;

    const bg = card.bgHex || EXCEL_PALETTE.SLATE_CARD;
    const border = card.borderHex || EXCEL_PALETTE.SLATE_BORDER;
    const textFg = card.textHex || EXCEL_PALETTE.SLATE_MUTED;
    const valFg = card.valueHex || EXCEL_PALETTE.SLATE_HEADER;

    // Merge horizontal para cada nivel de la card
    worksheet.mergeCells(startRow, colStart, startRow, colEnd);
    worksheet.mergeCells(startRow + 1, colStart, startRow + 1, colEnd);
    worksheet.mergeCells(startRow + 2, colStart, startRow + 2, colEnd);

    // Celda Label
    const cellLabel = topRow.getCell(colStart);
    cellLabel.value = card.label.toUpperCase();
    cellLabel.font = { name: "Segoe UI", size: 7.5, bold: true, color: { argb: textFg } };
    cellLabel.alignment = { vertical: "bottom", horizontal: "center" };

    // Celda Valor
    const cellVal = valRow.getCell(colStart);
    cellVal.value = card.value;
    cellVal.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: valFg } };
    cellVal.alignment = { vertical: "middle", horizontal: "center" };

    // Celda Subtexto opcional
    const cellSub = subRow.getCell(colStart);
    cellSub.value = card.subtext || "";
    cellSub.font = { name: "Segoe UI", size: 7.5, italic: true, color: { argb: textFg } };
    cellSub.alignment = { vertical: "top", horizontal: "center" };

    // Aplicar fills y bordes a toda el área de la card
    for (let r = startRow; r <= startRow + 2; r++) {
      for (let c = colStart; c <= colEnd; c++) {
        const cell = worksheet.getRow(r).getCell(c);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: bg },
        };
        cell.border = {
          top: r === startRow ? { style: "thin", color: { argb: border } } : undefined,
          bottom: r === startRow + 2 ? { style: "thin", color: { argb: border } } : undefined,
          left: c === colStart ? { style: "thin", color: { argb: border } } : undefined,
          right: c === colEnd ? { style: "thin", color: { argb: border } } : undefined,
        };
      }
    }
  });

  // Espaciador después de las cards
  worksheet.getRow(startRow + 3).height = 12;
}

/**
 * Estiliza el encabezado de una tabla principal en una fila determinada.
 */
export function styleTableHeader(
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  columns: TableColumnConfig[],
  bgHex: string = EXCEL_PALETTE.SLATE_HEADER
) {
  const row = worksheet.getRow(rowNumber);
  row.height = 25;

  columns.forEach((col, idx) => {
    const cell = row.getCell(idx + 1);
    cell.value = col.header.toUpperCase();
    cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: EXCEL_PALETTE.WHITE } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: bgHex },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: col.align || "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF334155" } },
      bottom: { style: "medium", color: { argb: "FF008540" } }, // Acento verde inferior
      left: { style: "thin", color: { argb: "FF334155" } },
      right: { style: "thin", color: { argb: "FF334155" } },
    };
  });

  // Configurar anchos de columna en worksheet
  columns.forEach((col, idx) => {
    const wsCol = worksheet.getColumn(idx + 1);
    wsCol.width = col.width;
  });
}

/**
 * Estiliza una celda como badge con fondo pastel y texto de alto contraste.
 */
export function styleAsBadge(
  cell: ExcelJS.Cell,
  bgHex: string,
  fgHex: string
) {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: bgHex },
  };
  cell.font = {
    name: "Segoe UI",
    size: 8.5,
    bold: true,
    color: { argb: fgHex },
  };
  cell.alignment = {
    vertical: "middle",
    horizontal: "center",
  };
}

/**
 * Resuelve los estilos de badge para roles.
 */
export function getRoleBadgeStyle(role: string): { bgHex: string; fgHex: string } {
  switch (role) {
    case "ADMIN":
    case "Administrador":
      return { bgHex: EXCEL_PALETTE.ROLE_ADMIN_BG, fgHex: EXCEL_PALETTE.ROLE_ADMIN_FG };
    case "SUPER_ADMIN":
    case "Super Admin":
      return { bgHex: EXCEL_PALETTE.ROLE_SUPER_ADMIN_BG, fgHex: EXCEL_PALETTE.ROLE_SUPER_ADMIN_FG };
    case "SUPERVISOR":
    case "Supervisor":
      return { bgHex: EXCEL_PALETTE.ROLE_SUPERVISOR_BG, fgHex: EXCEL_PALETTE.ROLE_SUPERVISOR_FG };
    case "EMPLEADO":
    case "Empleado":
    default:
      return { bgHex: EXCEL_PALETTE.ROLE_EMPLEADO_BG, fgHex: EXCEL_PALETTE.ROLE_EMPLEADO_FG };
  }
}

/**
 * Resuelve los estilos de badge para estados de usuario o asistencia.
 */
export function getStatusBadgeStyle(status: string | boolean): { bgHex: string; fgHex: string } {
  if (typeof status === "boolean") {
    return status
      ? { bgHex: EXCEL_PALETTE.STATUS_ACTIVO_BG, fgHex: EXCEL_PALETTE.STATUS_ACTIVO_FG }
      : { bgHex: EXCEL_PALETTE.STATUS_INACTIVO_BG, fgHex: EXCEL_PALETTE.STATUS_INACTIVO_FG };
  }

  const s = String(status).toUpperCase();
  if (s.includes("ACTIVO") || s.includes("PRESENT") || s.includes("PUNTUAL")) {
    return { bgHex: EXCEL_PALETTE.STATUS_PUNTUAL_BG, fgHex: EXCEL_PALETTE.STATUS_PUNTUAL_FG };
  }
  if (s.includes("TARDANZA") || s.includes("LATE")) {
    return { bgHex: EXCEL_PALETTE.STATUS_TARDANZA_BG, fgHex: EXCEL_PALETTE.STATUS_TARDANZA_FG };
  }
  if (s.includes("FALTA") || s.includes("ABSENT") || s.includes("INACTIVO")) {
    return { bgHex: EXCEL_PALETTE.STATUS_FALTA_BG, fgHex: EXCEL_PALETTE.STATUS_FALTA_FG };
  }
  if (s.includes("JUSTIFICAD") || s.includes("PERMISO")) {
    return { bgHex: EXCEL_PALETTE.STATUS_JUSTIFICADO_BG, fgHex: EXCEL_PALETTE.STATUS_JUSTIFICADO_FG };
  }

  return { bgHex: EXCEL_PALETTE.SLATE_CARD, fgHex: EXCEL_PALETTE.SLATE_MUTED };
}

/**
 * Descarga en el navegador un workbook de ExcelJS de forma directa y elegante.
 */
export async function downloadExcelWorkbook(
  workbook: ExcelJS.Workbook,
  fileName: string
): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
