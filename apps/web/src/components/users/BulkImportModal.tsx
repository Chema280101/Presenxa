"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { UserRole } from "@asistencias/db";
import {
  createPresenxaWorkbook,
  downloadExcelWorkbook,
  EXCEL_PALETTE,
} from "@/lib/excelDesignEngine";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Building,
  Clock,
  RefreshCw,
  FileCheck,
} from "lucide-react";
import { clsx } from "clsx";
import { ModalShell } from "@/components/ui/ModalShell";
import { CustomSelect, CustomSelectOption } from "@/components/ui/CustomSelect";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/providers/ToastProvider";

interface ParsedUserRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  email: string;
  documentId?: string;
  phone?: string;
  role: UserRole;
  isValid: boolean;
  errors: string[];
}

interface LocationOption {
  id: string;
  name: string;
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: LocationOption[];
  schedules: Array<any>;
  onSuccess: () => void;
}

export function BulkImportModal({
  isOpen,
  onClose,
  locations,
  schedules,
  onSuccess,
}: BulkImportModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedUserRow[]>([]);
  const [defaultLocationId, setDefaultLocationId] = useState<string>("");
  const [defaultScheduleId, setDefaultScheduleId] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<{
    total: number;
    created: number;
    failed: number;
    errors: Array<{ row: number; email: string; error: string }>;
  } | null>(null);

  const locationOptions: CustomSelectOption[] = [
    { value: "", label: "Sin sede (asignar después)" },
    ...locations.map((loc) => ({
      value: loc.id,
      label: loc.name,
      icon: Building,
    })),
  ];

  const scheduleOptions: CustomSelectOption[] = [
    { value: "", label: "Sin horario (asignar después)" },
    ...schedules.map((sch) => ({
      value: sch.id,
      label: `${sch.name} (${String(sch.entryHour).padStart(2, "0")}:${String(sch.entryMinute).padStart(2, "0")} - ${String(sch.exitHour).padStart(2, "0")}:${String(sch.exitMinute).padStart(2, "0")})`,
      icon: Clock,
    })),
  ];

  // Descarga de plantilla nativa de Excel (.xlsx) con validaciones y diseño ejecutivo
  const handleDownloadExcelTemplate = async () => {
    try {
      const workbook = createPresenxaWorkbook("Plantilla de Importación Masiva Presenxa");

      // Hoja 1: Colaboradores (Plantilla para ingresar datos)
      const ws = workbook.addWorksheet("Colaboradores", {
        views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
      });

      const headers = [
        { title: "Nombres *", width: 22, isRequired: true },
        { title: "Apellidos *", width: 24, isRequired: true },
        { title: "Correo Electrónico *", width: 34, isRequired: true },
        { title: "Documento / DNI", width: 18, isRequired: false },
        { title: "Teléfono", width: 18, isRequired: false },
        { title: "Rol", width: 18, isRequired: false },
      ];

      const headerRow = ws.getRow(1);
      headerRow.height = 26;

      headers.forEach((h, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = h.title.toUpperCase();
        cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: EXCEL_PALETTE.WHITE } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: h.isRequired ? EXCEL_PALETTE.EMERALD_PRIMARY : EXCEL_PALETTE.SLATE_HEADER },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin", color: { argb: "FF334155" } },
          bottom: { style: "medium", color: { argb: h.isRequired ? "FF006430" : "FF0F172A" } },
          left: { style: "thin", color: { argb: "FF334155" } },
          right: { style: "thin", color: { argb: "FF334155" } },
        };
        ws.getColumn(idx + 1).width = h.width;
      });

      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: headers.length },
      };

      const sampleData = [
        ["Juan Carlos", "Pérez Torres", "juan.perez@empresa.com", "72819201", "+51987654321", "EMPLEADO"],
        ["María Elena", "Gómez Rojas", "maria.gomez@empresa.com", "45128392", "+51912345678", "SUPERVISOR"],
        ["Carlos Alberto", "Mendoza Ríos", "carlos.mendoza@empresa.com", "78912345", "+51999888777", "EMPLEADO"],
      ];

      sampleData.forEach((rowVals, rIdx) => {
        const row = ws.getRow(rIdx + 2);
        row.height = 21;
        rowVals.forEach((val, cIdx) => {
          const cell = row.getCell(cIdx + 1);
          cell.value = val;
          cell.font = { name: "Segoe UI", size: 9.5, color: { argb: EXCEL_PALETTE.SLATE_HEADER } };
          cell.alignment = {
            vertical: "middle",
            horizontal: cIdx === 3 || cIdx === 4 || cIdx === 5 ? "center" : "left",
          };
          cell.border = {
            top: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_BORDER } },
            bottom: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_BORDER } },
            left: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_BORDER } },
            right: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_BORDER } },
          };
          if (cIdx === 3) cell.numFmt = "@";
        });
      });

      // Validación desplegable para la columna Rol (filas 2 a 300)
      for (let r = 2; r <= 300; r++) {
        const cell = ws.getCell(r, 6);
        cell.dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: ['"EMPLEADO,SUPERVISOR,ADMIN"'],
          showErrorMessage: true,
          errorTitle: "Rol no admitido",
          error: "Seleccione un rol de la lista desplegable: EMPLEADO, SUPERVISOR o ADMIN.",
        };
      }

      // Hoja 2: Instrucciones y Directrices
      const wsInfo = workbook.addWorksheet("Instrucciones y Formato", {
        views: [{ showGridLines: true }],
      });

      const infoTitle = wsInfo.getCell("A1");
      infoTitle.value = "PRESENXA · GUÍA OFICIAL PARA CARGA MASIVA DE COLABORADORES";
      infoTitle.font = { name: "Segoe UI", size: 12, bold: true, color: { argb: EXCEL_PALETTE.EMERALD_PRIMARY } };
      wsInfo.getRow(1).height = 24;

      const instructions = [
        ["Campo", "Obligatoriedad", "Formato y Reglas"],
        ["Nombres", "Obligatorio (Verde)", "Nombres del colaborador (ej: Juan Carlos)."],
        ["Apellidos", "Obligatorio (Verde)", "Apellidos paterno y materno (ej: Pérez Torres)."],
        ["Correo Electrónico", "Obligatorio (Verde)", "Correo único por colaborador (formato usuario@dominio.com)."],
        ["Documento / DNI", "Opcional (Slate)", "DNI o documento de identidad (8 a 12 caracteres numéricos)."],
        ["Teléfono", "Opcional (Slate)", "Número móvil de contacto (se recomienda incluir código de país, ej: +51)."],
        ["Rol", "Opcional (Slate)", "Valores admitidos: EMPLEADO, SUPERVISOR, ADMIN (por defecto EMPLEADO)."],
      ];

      instructions.forEach((insRow, iIdx) => {
        const r = wsInfo.getRow(iIdx + 3);
        r.height = 20;
        insRow.forEach((val, cIdx) => {
          const c = r.getCell(cIdx + 1);
          c.value = val;
          if (iIdx === 0) {
            c.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: EXCEL_PALETTE.WHITE } };
            c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_PALETTE.SLATE_HEADER } };
            c.alignment = { vertical: "middle", horizontal: "center" };
          } else {
            c.font = { name: "Segoe UI", size: 9, bold: cIdx === 0, color: { argb: EXCEL_PALETTE.SLATE_HEADER } };
            c.alignment = { vertical: "middle", horizontal: cIdx === 1 ? "center" : "left" };
            c.border = {
              top: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_BORDER } },
              bottom: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_BORDER } },
              left: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_BORDER } },
              right: { style: "thin", color: { argb: EXCEL_PALETTE.SLATE_BORDER } },
            };
          }
        });
      });

      wsInfo.getColumn(1).width = 22;
      wsInfo.getColumn(2).width = 20;
      wsInfo.getColumn(3).width = 72;

      await downloadExcelWorkbook(workbook, "plantilla_colaboradores_presenxa.xlsx");
      toast.success("Plantilla profesional de Excel descargada");
    } catch (err: any) {
      console.error("Error generando Excel:", err);
      toast.error("No se pudo generar la plantilla de Excel");
    }
  };

  // Procesador unificado para matrices de celdas (Excel o CSV)
  const processMatrixData = (rawRows: any[][]) => {
    const cleanRows = rawRows.filter(
      (row) => row && row.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== "")
    );

    if (cleanRows.length < 2) {
      toast.warning("El archivo debe contener una fila de encabezados y al menos una fila con datos.");
      return;
    }

    // Localizar inteligentemente la fila de encabezados
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(cleanRows.length, 6); r++) {
      const rowStrings = cleanRows[r].map((c) =>
        String(c || "")
          .toLowerCase()
          .trim()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
      );
      if (rowStrings.some((h) => h.includes("nombre") || h.includes("first") || h.includes("correo") || h.includes("email"))) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) headerRowIdx = 0;

    const headerRow = cleanRows[headerRowIdx].map((h) =>
      String(h || "")
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
    );

    const fnIdx = headerRow.findIndex((h) => h.includes("nombre") || h.includes("first"));
    const lnIdx = headerRow.findIndex((h) => h.includes("apellido") || h.includes("last"));
    const emIdx = headerRow.findIndex((h) => h.includes("correo") || h.includes("email") || h.includes("mail"));
    const docIdx = headerRow.findIndex((h) => h.includes("doc") || h.includes("dni") || h.includes("ident"));
    const phIdx = headerRow.findIndex((h) => h.includes("tel") || h.includes("cel") || h.includes("phone"));
    const roleIdx = headerRow.findIndex((h) => h.includes("rol") || h.includes("role"));

    const seenEmails = new Set<string>();
    const rows: ParsedUserRow[] = [];

    for (let i = headerRowIdx + 1; i < cleanRows.length; i++) {
      const row = cleanRows[i];
      const firstName = String((fnIdx >= 0 ? row[fnIdx] : row[0]) || "").trim();
      const lastName = String((lnIdx >= 0 ? row[lnIdx] : row[1]) || "").trim();
      const email = String((emIdx >= 0 ? row[emIdx] : row[2]) || "").toLowerCase().trim();
      const documentId = docIdx >= 0 && row[docIdx] ? String(row[docIdx]).trim() : undefined;
      const phone = phIdx >= 0 && row[phIdx] ? String(row[phIdx]).trim() : undefined;

      let parsedRole: UserRole = UserRole.EMPLEADO;
      if (roleIdx >= 0 && row[roleIdx]) {
        const rawRole = String(row[roleIdx]).trim().toUpperCase();
        if (rawRole.includes("SUPERVISOR")) parsedRole = UserRole.SUPERVISOR;
        else if (rawRole.includes("SUPER_ADMIN")) parsedRole = UserRole.SUPER_ADMIN;
        else if (rawRole.includes("ADMIN")) parsedRole = UserRole.ADMIN;
      }

      const rowErrors: string[] = [];
      if (!firstName) rowErrors.push("Falta nombre");
      if (!lastName) rowErrors.push("Falta apellido");
      if (!email) {
        rowErrors.push("Falta correo");
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowErrors.push("Correo inválido");
      } else if (seenEmails.has(email)) {
        rowErrors.push("Correo duplicado en archivo");
      } else {
        seenEmails.add(email);
      }

      rows.push({
        rowNumber: i,
        firstName,
        lastName,
        email,
        documentId: documentId || undefined,
        phone: phone || undefined,
        role: parsedRole,
        isValid: rowErrors.length === 0,
        errors: rowErrors,
      });
    }

    setParsedRows(rows);
    setCurrentStep(2);
  };

  const handleFileProcess = (file: File) => {
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

    const reader = new FileReader();

    if (isExcel) {
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          if (!firstSheetName) {
            toast.warning("El archivo de Excel no contiene hojas de datos.");
            return;
          }
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          processMatrixData(rawRows);
        } catch (err: any) {
          toast.error("Error al leer el archivo de Excel: " + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const lines = text
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

          if (lines.length < 2) {
            toast.warning("El archivo debe contener al menos dos líneas de datos.");
            return;
          }

          const separator = lines[0].includes(";") ? ";" : ",";
          const rawRows = lines.map((l) =>
            l.split(separator).map((c) => c.trim().replace(/^["']|["']$/g, ""))
          );
          processMatrixData(rawRows);
        } catch (err: any) {
          toast.error("Error al procesar el archivo CSV: " + err.message);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  const handleExecuteImport = async () => {
    if (validRows.length === 0) return;

    setIsSubmitting(true);
    try {
      const payloadUsers = validRows.map((r) => ({
        rowNumber: r.rowNumber,
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        documentId: r.documentId || null,
        phone: r.phone || null,
        role: r.role,
        locationId: defaultLocationId || null,
        scheduleId: defaultScheduleId || null,
      }));

      const res = await fetch("/api/users/bulk/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: payloadUsers }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ocurrió un error al procesar la importación");
      }

      setImportResult(data);
      setCurrentStep(3);

      if (data.failed > 0) {
        toast.warning(`Se crearon ${data.created} colaboradores. ${data.failed} filas tuvieron errores.`);
      } else {
        toast.success(`Se crearon ${data.created} colaboradores exitosamente.`);
      }

      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Error al conectar con el servidor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setParsedRows([]);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Footer limpio y contextual
  const renderFooter = () => {
    if (currentStep === 1) {
      return (
        <div className="flex items-center justify-between w-full">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-slate-400">
            <span>Sube un archivo para previsualizar</span>
          </div>
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div className="flex items-center justify-between w-full">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setCurrentStep(1)}
            disabled={isSubmitting}
            className="flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a cargar</span>
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-surface-500 font-medium">
              <strong className="text-surface-900 dark:text-white">{validRows.length}</strong> de {parsedRows.length} listos
            </span>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleExecuteImport}
              disabled={isSubmitting || validRows.length === 0}
              className="flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importando...</span>
                </>
              ) : (
                <>
                  <span>Confirmar e Importar ({validRows.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between w-full">
        <Button type="button" variant="secondary" size="sm" onClick={handleReset}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Importar otro archivo
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={onClose}>
          Finalizar y Cerrar
        </Button>
      </div>
    );
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Importación Masiva de Colaboradores"
      description="Carga listas de colaboradores directamente desde una hoja de cálculo."
      icon={FileSpreadsheet}
      iconVariant="primary"
      maxWidth="3xl"
      footer={renderFooter()}
    >
      {/* Stepper Rediseñado con Alto Contraste y Alineación */}
      <div className="flex items-center justify-center gap-3 mb-6">
        {/* Paso 1 */}
        <div
          className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition border",
            currentStep === 1
              ? "bg-primary-500/15 text-primary-700 dark:text-primary-300 border-primary-500/30 shadow-xs"
              : currentStep > 1
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
              : "bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 border-surface-200 dark:border-white/5"
          )}
        >
          <span
            className={clsx(
              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
              currentStep === 1
                ? "bg-primary-600 text-white"
                : currentStep > 1
                ? "bg-emerald-500 text-white"
                : "bg-surface-300 dark:bg-surface-700 text-surface-700 dark:text-surface-300"
            )}
          >
            {currentStep > 1 ? "✓" : "1"}
          </span>
          <span>Archivo Excel</span>
        </div>

        <div className="w-6 h-0.5 bg-surface-200 dark:bg-surface-800 rounded-full" />

        {/* Paso 2 */}
        <div
          className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition border",
            currentStep === 2
              ? "bg-primary-500/15 text-primary-700 dark:text-primary-300 border-primary-500/30 shadow-xs"
              : currentStep > 2
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
              : "bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 border-surface-200 dark:border-white/5"
          )}
        >
          <span
            className={clsx(
              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
              currentStep === 2
                ? "bg-primary-600 text-white"
                : currentStep > 2
                ? "bg-emerald-500 text-white"
                : "bg-surface-300 dark:bg-surface-700 text-surface-700 dark:text-surface-300"
            )}
          >
            {currentStep > 2 ? "✓" : "2"}
          </span>
          <span>Validación</span>
        </div>

        <div className="w-6 h-0.5 bg-surface-200 dark:bg-surface-800 rounded-full" />

        {/* Paso 3 */}
        <div
          className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition border",
            currentStep === 3
              ? "bg-primary-500/15 text-primary-700 dark:text-primary-300 border-primary-500/30 shadow-xs"
              : "bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 border-surface-200 dark:border-white/5"
          )}
        >
          <span
            className={clsx(
              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
              currentStep === 3
                ? "bg-primary-600 text-white"
                : "bg-surface-300 dark:bg-surface-700 text-surface-700 dark:text-surface-300"
            )}
          >
            3
          </span>
          <span>Resultado</span>
        </div>
      </div>

      {/* PASO 1: Subida de archivo Excel */}
      {currentStep === 1 && (
        <div className="space-y-4">
          {/* Banner de descarga de plantilla oficial */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-primary-50/70 dark:bg-primary-950/20 border border-primary-200/80 dark:border-primary-500/30 transition">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-500/15 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-surface-900 dark:text-white">
                  ¿Aún no tienes el formato estructurado?
                </p>
                <p className="text-[11px] text-surface-600 dark:text-slate-400">
                  Descarga la plantilla oficial en Excel (.xlsx) con los nombres de columna correctos.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadExcelTemplate}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-white dark:bg-surface-800 hover:bg-surface-50 dark:hover:bg-surface-700 text-primary-700 dark:text-primary-300 border border-primary-300/80 dark:border-primary-500/30 shadow-xs hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
              <span>Descargar .xlsx</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Dropzone interactivo */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
              "border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 group flex flex-col items-center justify-center",
              isDragging
                ? "border-primary-500 bg-primary-50/60 dark:bg-primary-950/40 scale-[1.01] ring-4 ring-primary-500/10"
                : "border-surface-300 dark:border-surface-700 hover:border-primary-500 dark:hover:border-primary-400 bg-surface-50/50 dark:bg-surface-900/30"
            )}
          >
            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-inner ring-1 ring-primary-500/20">
              <Upload className="w-6 h-6" />
            </div>

            <h4 className="text-sm font-bold text-surface-900 dark:text-white mb-1">
              Selecciona o arrastra tu archivo Excel (.xlsx)
            </h4>
            <p className="text-xs text-surface-500 dark:text-slate-400 max-w-sm mb-3">
              Haz clic aquí para examinar archivos o suelta tu hoja de cálculo directamente.
            </p>

            {/* Píldora de formato */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-100 dark:bg-surface-800 text-[11px] font-mono text-surface-600 dark:text-slate-300 border border-surface-200 dark:border-white/10">
              <span>Columnas: Nombres • Apellidos • Correo • Documento • Teléfono</span>
            </div>
          </div>

          {/* Opciones por defecto opcionales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-surface-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-primary-500" />
                Sede por defecto (Opcional)
              </label>
              <CustomSelect
                value={defaultLocationId}
                onChange={setDefaultLocationId}
                options={locationOptions}
                placeholder="Sin sede (asignar después)"
                hasLeftIcon
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-surface-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary-500" />
                Horario / Turno por defecto (Opcional)
              </label>
              <CustomSelect
                value={defaultScheduleId}
                onChange={setDefaultScheduleId}
                options={scheduleOptions}
                placeholder="Sin horario (asignar después)"
                hasLeftIcon
              />
            </div>
          </div>
        </div>
      )}

      {/* PASO 2: Previsualización de datos */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-surface-900 dark:text-white">
                {parsedRows.length} filas detectadas
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> {validRows.length} válidas
              </span>
              {invalidRows.length > 0 && (
                <span className="inline-flex items-center gap-1 text-danger-600 dark:text-danger-400 font-semibold">
                  <XCircle className="w-3.5 h-3.5" /> {invalidRows.length} con incidencias
                </span>
              )}
            </div>
          </div>

          <div className="border border-surface-200 dark:border-surface-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto shadow-inner">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-100 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 text-[10px] uppercase font-bold text-surface-500">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Colaborador</th>
                  <th className="py-2.5 px-3">Correo</th>
                  <th className="py-2.5 px-3">Documento</th>
                  <th className="py-2.5 px-3 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-surface-800/70 font-medium">
                {parsedRows.map((row) => (
                  <tr
                    key={row.rowNumber}
                    className={clsx(
                      "transition",
                      row.isValid ? "hover:bg-surface-50 dark:hover:bg-white/5" : "bg-danger-500/5 hover:bg-danger-500/10"
                    )}
                  >
                    <td className="py-2 px-3 text-surface-400 font-mono text-[11px]">{row.rowNumber}</td>
                    <td className="py-2 px-3 font-bold text-surface-900 dark:text-white">
                      {row.firstName} {row.lastName}
                    </td>
                    <td className="py-2 px-3 font-mono text-surface-600 dark:text-slate-300 text-[11px]">
                      {row.email}
                    </td>
                    <td className="py-2 px-3 font-mono text-surface-500 text-[11px]">
                      {row.documentId || "—"}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {row.isValid ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Válido
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-danger-600 dark:text-danger-400 bg-danger-500/10 px-2 py-0.5 rounded-full"
                          title={row.errors.join(", ")}
                        >
                          <XCircle className="w-3 h-3" /> {row.errors[0]}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PASO 3: Resumen Final */}
      {currentStep === 3 && importResult && (
        <div className="py-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div>
            <h4 className="text-base font-bold text-surface-900 dark:text-white">
              ¡Proceso de importación finalizado!
            </h4>
            <p className="text-xs text-surface-500 dark:text-slate-400 mt-1">
              Se crearon exitosamente <strong>{importResult.created}</strong> colaboradores en Presenxa.
            </p>
          </div>

          {importResult.errors && importResult.errors.length > 0 && (
            <div className="text-left mt-4 p-4 rounded-2xl bg-danger-500/10 border border-danger-500/20">
              <div className="text-xs font-bold text-danger-700 dark:text-danger-300 mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                {importResult.errors.length} incidencias no pudieron ser importadas:
              </div>
              <ul className="text-[11px] text-danger-600 dark:text-danger-400 space-y-1 list-disc list-inside max-h-36 overflow-y-auto">
                {importResult.errors.map((err, idx) => (
                  <li key={idx}>
                    Fila {err.row} ({err.email}): {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
}
