import { format } from "date-fns";
import {
  createPresenxaWorkbook,
  renderExecutiveHeader,
  renderKpiCards,
  styleTableHeader,
  styleAsBadge,
  getRoleBadgeStyle,
  getStatusBadgeStyle,
  downloadExcelWorkbook,
  EXCEL_PALETTE,
  TableColumnConfig,
} from "./excelDesignEngine";

export interface UserExportItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  documentId?: string | null;
  role: string;
  isActive: boolean;
  qrToken?: string;
  nfcCardUid?: string | null;
  location?: { id: string; name: string } | null;
  userSchedules?: Array<{
    schedule: {
      id: string;
      name: string;
      entryHour: number;
      entryMinute: number;
      exitHour: number;
      exitMinute: number;
      isSplit?: boolean;
      entryHour2?: number | null;
      entryMinute2?: number | null;
      exitHour2?: number | null;
      exitMinute2?: number | null;
    };
  }>;
}

export function formatUserRole(role: string): string {
  switch (role) {
    case "ADMIN":
      return "Administrador";
    case "SUPER_ADMIN":
      return "Super Admin";
    case "SUPERVISOR":
      return "Supervisor";
    case "EMPLEADO":
      return "Empleado";
    default:
      return role;
  }
}

/**
 * Exporta el padrón oficial de usuarios en un archivo Excel (.xlsx) corporativo
 * de alta fidelidad, con tarjetas KPI, diseño ejecutivo, filtros y badges.
 */
export async function exportUsersToExcel(
  users: UserExportItem[],
  organizationName: string = "Empresa",
  ruc?: string
): Promise<void> {
  const now = new Date();
  const dateFormatted = format(now, "dd/MM/yyyy HH:mm");

  const workbook = createPresenxaWorkbook(
    `Padrón de Colaboradores - ${organizationName}`
  );

  // -------------------------------------------------------------
  // HOJA 1: PADRÓN DE COLABORADORES
  // -------------------------------------------------------------
  const wsMain = workbook.addWorksheet("Colaboradores", {
    views: [{ state: "frozen", ySplit: 9, showGridLines: true }],
  });

  // 1. Membrete Ejecutivo Superior
  renderExecutiveHeader(wsMain, {
    reportTitle: "Padrón Oficial de Colaboradores y Personal",
    organizationName,
    ruc,
    metaInfo: `Emisión: ${dateFormatted}  |  Registros: ${users.length}`,
    colSpan: 11,
  });

  // 2. Cálculo de métricas para tarjetas KPI
  const activeCount = users.filter((u) => u.isActive).length;
  const inactiveCount = users.length - activeCount;
  const uniqueLocations = new Set(
    users.map((u) => u.location?.name || "Sin sede").filter(Boolean)
  );

  renderKpiCards(
    wsMain,
    [
      {
        label: "Total Colaboradores",
        value: users.length,
        subtext: "Registros en padrón",
        bgHex: "FFF8FAFC",
        borderHex: EXCEL_PALETTE.SLATE_BORDER,
        textHex: EXCEL_PALETTE.SLATE_MUTED,
        valueHex: EXCEL_PALETTE.SLATE_HEADER,
      },
      {
        label: "Activos",
        value: activeCount,
        subtext: `${users.length > 0 ? Math.round((activeCount / users.length) * 100) : 0}% de la nómina`,
        bgHex: "FFECFDF5",
        borderHex: "FFA7F3D0",
        textHex: "FF047857",
        valueHex: "FF047857",
      },
      {
        label: "Inactivos / Bajas",
        value: inactiveCount,
        subtext: `${inactiveCount} colaboradores`,
        bgHex: "FFFFF1F2",
        borderHex: "FFFECDD3",
        textHex: "FFBE123C",
        valueHex: "FFBE123C",
      },
      {
        label: "Sedes Asignadas",
        value: uniqueLocations.size,
        subtext: "Centros de trabajo",
        bgHex: "FFF0F9FF",
        borderHex: "FFBAE6FD",
        textHex: "FF0369A1",
        valueHex: "FF0369A1",
      },
    ],
    5
  );

  // 3. Encabezados de la Tabla (Fila 9)
  const columns: TableColumnConfig[] = [
    { header: "N°", key: "index", width: 7, align: "center" },
    { header: "Documento / DNI", key: "doc", width: 18, align: "center", isCodeOrDoc: true },
    { header: "Apellidos", key: "lastName", width: 22, align: "left" },
    { header: "Nombres", key: "firstName", width: 22, align: "left" },
    { header: "Correo Electrónico", key: "email", width: 32, align: "left" },
    { header: "Teléfono", key: "phone", width: 16, align: "center" },
    { header: "Rol", key: "role", width: 18, align: "center" },
    { header: "Sede Asignada", key: "location", width: 24, align: "left" },
    { header: "Turno / Horario", key: "schedule", width: 32, align: "left" },
    { header: "Tarjeta NFC (UID)", key: "nfc", width: 20, align: "center", isCodeOrDoc: true },
    { header: "Estado", key: "status", width: 15, align: "center" },
  ];

  styleTableHeader(wsMain, 9, columns, EXCEL_PALETTE.SLATE_HEADER);

  // Filtros automáticos en Excel
  wsMain.autoFilter = {
    from: { row: 9, column: 1 },
    to: { row: 9, column: columns.length },
  };

  // 4. Filas de datos
  const startRow = 10;
  users.forEach((u, index) => {
    const rowNumber = startRow + index;
    const row = wsMain.getRow(rowNumber);
    row.height = 22;

    const schedules =
      u.userSchedules && u.userSchedules.length > 0
        ? u.userSchedules
            .map((item) => {
              const sch = item.schedule;
              if (!sch) return null;
              const h1 = `${String(sch.entryHour).padStart(2, "0")}:${String(sch.entryMinute).padStart(2, "0")} - ${String(sch.exitHour).padStart(2, "0")}:${String(sch.exitMinute).padStart(2, "0")}`;
              return `${sch.name} (${h1})`;
            })
            .filter(Boolean)
            .join(" | ")
        : "Sin horario asignado";

    const isEven = index % 2 === 0;
    const zebraBg = isEven ? EXCEL_PALETTE.WHITE : EXCEL_PALETTE.ZEBRA_ROW;

    // Valores
    const roleText = formatUserRole(u.role);
    const statusText = u.isActive ? "Activo" : "Inactivo";

    const values = [
      index + 1,
      u.documentId || "-",
      u.lastName,
      u.firstName,
      u.email,
      u.phone || "-",
      roleText,
      u.location?.name || "Sin sede asignada",
      schedules,
      u.nfcCardUid || "No vinculada",
      statusText,
    ];

    values.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;

      // Formato tipográfico
      cell.font = {
        name: "Segoe UI",
        size: 9.5,
        bold: colIdx === 2, // Apellidos en bold
        color: { argb: EXCEL_PALETTE.SLATE_HEADER },
      };

      // Alineación
      const colDef = columns[colIdx];
      cell.alignment = {
        vertical: "middle",
        horizontal: colDef.align || "left",
      };

      // Fondo normal o zebra
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: zebraBg },
      };

      // Borde sutil
      cell.border = {
        top: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_BORDER } },
        bottom: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_BORDER } },
        left: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_BORDER } },
        right: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_BORDER } },
      };

      // Formato para DNI y NFC (evitar pérdida de ceros a la izquierda)
      if (colDef.isCodeOrDoc) {
        cell.numFmt = "@";
      }
    });

    // Badge para Rol (Columna 7)
    const roleBadge = getRoleBadgeStyle(u.role);
    const roleCell = row.getCell(7);
    styleAsBadge(roleCell, roleBadge.bgHex, roleBadge.fgHex);

    // Badge para Estado (Columna 11)
    const statusBadge = getStatusBadgeStyle(u.isActive);
    const statusCell = row.getCell(11);
    styleAsBadge(statusCell, statusBadge.bgHex, statusBadge.fgHex);
  });

  // Fila de cierre / Certificación
  const footerRowIdx = startRow + users.length + 1;
  const footerRow = wsMain.getRow(footerRowIdx);
  footerRow.height = 20;
  wsMain.mergeCells(footerRowIdx, 1, footerRowIdx, columns.length);
  const footerCell = footerRow.getCell(1);
  footerCell.value = `Documento emitido automáticamente por Presenxa · Software de Control Biométrico y Gestión de Asistencias.`;
  footerCell.font = { name: "Segoe UI", size: 8, italic: true, color: { argb: EXCEL_PALETTE.SLATE_MUTED } };
  footerCell.alignment = { vertical: "middle", horizontal: "left" };

  // -------------------------------------------------------------
  // HOJA 2: RESUMEN EJECUTIVO (SEDES Y ROLES)
  // -------------------------------------------------------------
  const wsSummary = workbook.addWorksheet("Resumen Ejecutivo", {
    views: [{ showGridLines: true }],
  });

  renderExecutiveHeader(wsSummary, {
    reportTitle: "Resumen Estadístico y Distribución",
    organizationName,
    ruc,
    metaInfo: `Total colaboradores: ${users.length}`,
    colSpan: 6,
  });

  // Tabla A: Distribución por Sede
  const sedeRowStart = 5;
  const sedeHeader = wsSummary.getRow(sedeRowStart);
  sedeHeader.height = 22;
  const sedeCols = ["Sede / Sucursal", "Colaboradores", "Activos", "Inactivos", "% del Total"];
  const sedeWidths = [28, 16, 14, 14, 16];

  sedeCols.forEach((h, idx) => {
    const c = sedeHeader.getCell(idx + 1);
    c.value = h.toUpperCase();
    c.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: EXCEL_PALETTE.WHITE } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_PALETTE.EMERALD_PRIMARY } };
    c.alignment = { vertical: "middle", horizontal: idx === 0 ? "left" : "center" };
    wsSummary.getColumn(idx + 1).width = sedeWidths[idx];
  });

  // Agrupar por sede
  const locationStats = new Map<string, { total: number; active: number; inactive: number }>();
  users.forEach((u) => {
    const locName = u.location?.name || "Sin Sede Asignada";
    const current = locationStats.get(locName) || { total: 0, active: 0, inactive: 0 };
    current.total++;
    if (u.isActive) current.active++;
    else current.inactive++;
    locationStats.set(locName, current);
  });

  let currentSedeRow = sedeRowStart + 1;
  locationStats.forEach((stats, locName) => {
    const r = wsSummary.getRow(currentSedeRow);
    r.height = 20;
    const pct = users.length > 0 ? (stats.total / users.length) * 100 : 0;

    [
      locName,
      stats.total,
      stats.active,
      stats.inactive,
      `${pct.toFixed(1)}%`,
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

  // Fila Total Sedes
  const totalSedeRow = wsSummary.getRow(currentSedeRow);
  totalSedeRow.height = 22;
  [
    "TOTAL GENERAL",
    users.length,
    activeCount,
    inactiveCount,
    "100.0%",
  ].forEach((val, idx) => {
    const c = totalSedeRow.getCell(idx + 1);
    c.value = val;
    c.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: EXCEL_PALETTE.SLATE_HEADER } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    c.alignment = { vertical: "middle", horizontal: idx === 0 ? "left" : "center" };
    c.border = {
      top: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_DARK_BORDER } },
      bottom: { style: "double", color: { argb: EXCEL_PALETTE.SLATE_DARK_BORDER } },
    };
  });

  // Tabla B: Distribución por Rol
  const roleRowStart = currentSedeRow + 3;
  const roleTitleRow = wsSummary.getRow(roleRowStart - 1);
  roleTitleRow.getCell(1).value = "DISTRIBUCIÓN POR ROLES";
  roleTitleRow.getCell(1).font = { name: "Segoe UI", size: 10, bold: true, color: { argb: EXCEL_PALETTE.SLATE_HEADER } };

  const roleHeader = wsSummary.getRow(roleRowStart);
  roleHeader.height = 22;
  const roleCols = ["Rol / Perfil", "Total Asignados", "% del Padrón"];
  roleCols.forEach((h, idx) => {
    const c = roleHeader.getCell(idx + 1);
    c.value = h.toUpperCase();
    c.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: EXCEL_PALETTE.WHITE } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_PALETTE.SLATE_HEADER } };
    c.alignment = { vertical: "middle", horizontal: idx === 0 ? "left" : "center" };
  });

  const roleStats = new Map<string, number>();
  users.forEach((u) => {
    const rName = formatUserRole(u.role);
    roleStats.set(rName, (roleStats.get(rName) || 0) + 1);
  });

  let currentRoleRow = roleRowStart + 1;
  roleStats.forEach((count, rName) => {
    const r = wsSummary.getRow(currentRoleRow);
    r.height = 20;
    const pct = users.length > 0 ? (count / users.length) * 100 : 0;

    [rName, count, `${pct.toFixed(1)}%`].forEach((val, idx) => {
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
    currentRoleRow++;
  });

  // Generar y descargar archivo en el cliente
  const sanitizedOrg = organizationName.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `Padron_Usuarios_${sanitizedOrg}_${format(now, "yyyyMMdd_HHmm")}.xlsx`;

  await downloadExcelWorkbook(workbook, fileName);
}

/**
 * Exporta el padrón oficial de colaboradores en formato CSV plano (.csv)
 * delimitado por punto y coma (;) con codificación UTF-8 y marca BOM para
 * máxima compatibilidad con Microsoft Excel, Google Sheets y sistemas de nómina/ERP.
 */
export function exportUsersToCsv(
  users: UserExportItem[],
  organizationName: string = "Empresa",
  ruc?: string
): void {
  const now = new Date();
  const dateFormatted = format(now, "dd/MM/yyyy HH:mm:ss");

  const metaHeader = [
    `"PADRÓN OFICIAL DE COLABORADORES - ${organizationName.toUpperCase()}"`,
    `"${ruc ? `RUC: ${ruc} - ` : ""}Generado: ${dateFormatted} - Total Registros: ${users.length}"`,
    `"Software: Presenxa Control Inteligente"`,
    "",
  ];

  const tableHeader = [
    "ID",
    "Tipo Doc",
    "N° Documento",
    "Apellidos",
    "Nombres",
    "Nombre Completo",
    "Correo Electrónico",
    "Teléfono",
    "Rol",
    "Estado",
    "Sede Principal",
    "Horario Asignado",
    "Tarjeta NFC UID",
    "Token QR",
  ].join(";");

  const rows = users.map((u) => {
    const fullName = `${u.lastName}, ${u.firstName}`.replace(/"/g, '""');
    const docId = (u.documentId || "").replace(/"/g, '""');
    const phone = (u.phone || "").replace(/"/g, '""');
    const role = formatUserRole(u.role).replace(/"/g, '""');
    const status = u.isActive ? "Activo" : "Inactivo";
    const locationName = (u.location?.name || "Sin sede").replace(/"/g, '""');
    const scheduleName = (u.userSchedules?.[0]?.schedule?.name || "Sin horario").replace(/"/g, '""');
    const nfcUid = (u.nfcCardUid || "").replace(/"/g, '""');
    const qrToken = (u.qrToken || "").replace(/"/g, '""');
    const email = (u.email || "").replace(/"/g, '""');
    const lastName = (u.lastName || "").replace(/"/g, '""');
    const firstName = (u.firstName || "").replace(/"/g, '""');

    return [
      `"${u.id}"`,
      `"DNI"`,
      `"${docId}"`,
      `"${lastName}"`,
      `"${firstName}"`,
      `"${fullName}"`,
      `"${email}"`,
      `"${phone}"`,
      `"${role}"`,
      `"${status}"`,
      `"${locationName}"`,
      `"${scheduleName}"`,
      `"${nfcUid}"`,
      `"${qrToken}"`,
    ].join(";");
  });

  const csvContent = "\uFEFF" + [...metaHeader, tableHeader, ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const sanitizedOrg = organizationName.replace(/[^a-zA-Z0-9]/g, "_");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `Padron_Usuarios_${sanitizedOrg}_${format(now, "yyyyMMdd_HHmm")}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

