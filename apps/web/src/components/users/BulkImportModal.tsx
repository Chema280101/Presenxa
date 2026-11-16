"use client";

import { useState, useRef, useEffect } from "react";
import ExcelJS from "exceljs";
import { UserRole } from "@asistencias/db";
import { parseCsvRFC4180 } from "@/lib/csvUtils";
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
  Check,
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
  const [isParsing, setIsParsing] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
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

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setParsedRows([]);
      setImportResult(null);
      setIsDragging(false);
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [isOpen]);

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
    if (isDownloadingTemplate) return;
    setIsDownloadingTemplate(true);
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

      // Validación desplegable para la columna Rol (filas 2 a 1000)
      for (let r = 2; r <= 1000; r++) {
        const cell = ws.getCell(r, 6);
        cell.dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: ['"EMPLEADO,SUPERVISOR,ADMIN,SUPER_ADMIN"'],
          showErrorMessage: true,
          errorTitle: "Rol no admitido",
          error: "Seleccione un rol de la lista desplegable: EMPLEADO, SUPERVISOR, ADMIN o SUPER_ADMIN.",
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
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // Procesador unificado para matrices de celdas (Excel o CSV) conservando número de fila real (1-based)
  const processMatrixData = (rawRows: any[][]) => {
    const indexedRows = rawRows
      .map((row, idx) => ({ row, excelRowNumber: idx + 1 }))
      .filter(
        ({ row }) =>
          row && row.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== "")
      );

    if (indexedRows.length < 2) {
      toast.warning("El archivo debe contener una fila de encabezados y al menos una fila con datos.");
      return;
    }

    // Localizar inteligentemente la fila de encabezados
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(indexedRows.length, 6); r++) {
      const rowStrings = indexedRows[r].row.map((c) =>
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

    const headerRow = indexedRows[headerRowIdx].row.map((h) =>
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

    for (let i = headerRowIdx + 1; i < indexedRows.length; i++) {
      const { row, excelRowNumber } = indexedRows[i];
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
        rowNumber: excelRowNumber,
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

  const extractExcelCellText = (val: ExcelJS.CellValue): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === "object") {
      if ("text" in val && typeof val.text === "string") return val.text;
      if ("richText" in val && Array.isArray(val.richText)) {
        return val.richText.map((rt) => rt.text).join("");
      }
      if ("result" in val && val.result !== undefined) return String(val.result);
    }
    return String(val);
  };

  const handleFileProcess = (file: File) => {
    const fileName = file.name.toLowerCase();
    const isXlsx = fileName.endsWith(".xlsx");
    const isLegacyXls = fileName.endsWith(".xls");
    const isCsv = fileName.endsWith(".csv");

    if (isLegacyXls) {
      toast.warning("El formato binario .xls antiguo no es compatible. Guarda el archivo como .xlsx o .csv.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (!isXlsx && !isCsv) {
      toast.warning("Formato de archivo no compatible. Selecciona un archivo Excel (.xlsx) o CSV (.csv).");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsParsing(true);
    const reader = new FileReader();

    reader.onerror = () => {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.error("No se pudo leer el archivo seleccionado.");
    };

    if (isXlsx) {
      reader.onload = async (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);
          const worksheet = workbook.worksheets[0];
          if (!worksheet) {
            toast.warning("El archivo de Excel no contiene hojas de datos.");
            return;
          }
          const rawRows: string[][] = [];
          worksheet.eachRow({ includeEmpty: true }, (row, rowNum) => {
            const values: string[] = [];
            for (let c = 1; c <= row.cellCount; c++) {
              values.push(extractExcelCellText(row.getCell(c).value));
            }
            rawRows[rowNum - 1] = values;
          });
          processMatrixData(rawRows);
        } catch (err: any) {
          toast.error("Error al leer el archivo de Excel: " + err.message);
        } finally {
          setIsParsing(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const rawRows = parseCsvRFC4180(text);
          if (rawRows.length < 2) {
            toast.warning("El archivo debe contener al menos dos líneas de datos.");
            return;
          }
          processMatrixData(rawRows);
        } catch (err: any) {
          toast.error("Error al procesar el archivo CSV: " + err.message);
        } finally {
          setIsParsing(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      reader.readAsText(file, "UTF-8");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isParsing) return;
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
    setIsDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Footer limpio y contextual
  const renderFooter = () => {
    if (currentStep === 1) {
      return (
        <div className="flex items-center justify-between w-full">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isParsing}>
            Cancelar
          </Button>
          <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-slate-400">
            <span>{isParsing ? "Leyendo hoja de cálculo..." : "Sube un archivo para previsualizar"}</span>
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
            onClick={handleReset}
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
      preventClose={isSubmitting || isParsing}
      title="Importación Masiva de Colaboradores"
      description="Carga listas de colaboradores directamente desde una hoja de cálculo."
      icon={FileSpreadsheet}
      iconVariant="primary"
      maxWidth="3xl"
      footer={renderFooter()}
    >
      {/* Stepper con Semántica ARIA y Diseño Responsive */}
      <ol
        aria-label="Pasos de importación"
        className="flex items-center justify-center flex-wrap gap-1.5 sm:gap-2.5 mb-6"
      >
        {(
          [
            { step: 1, label: "Archivo Excel" },
            { step: 2, label: "Validación" },
            { step: 3, label: "Resultado" },
          ] as const
        ).map(({ step, label }, idx) => {
          const isActive = currentStep === step;
          const isCompleted = currentStep > step;

          return (
            <li
              key={step}
              aria-current={isActive ? "step" : undefined}
              className="flex items-center gap-1.5 sm:gap-2.5"
            >
              <div
                className={clsx(
                  "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold transition border",
                  isActive
                    ? "bg-primary-500/15 text-primary-700 dark:text-primary-300 border-primary-500/30 shadow-xs"
                    : isCompleted
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                    : "bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 border-surface-200 dark:border-white/5"
                )}
              >
                <span
                  aria-hidden="true"
                  className={clsx(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
                    isActive
                      ? "bg-primary-600 text-white"
                      : isCompleted
                      ? "bg-emerald-500 text-white"
                      : "bg-surface-300 dark:bg-surface-700 text-surface-700 dark:text-surface-300"
                  )}
                >
                  {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : step}
                </span>
                <span>
                  {isCompleted && <span className="sr-only">Completado: </span>}
                  {label}
                </span>
              </div>

              {idx < 2 && (
                <div
                  aria-hidden="true"
                  className="w-3 sm:w-6 h-0.5 bg-surface-200 dark:bg-surface-800 rounded-full"
                />
              )}
            </li>
          );
        })}
      </ol>

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
              disabled={isDownloadingTemplate}
              onClick={handleDownloadExcelTemplate}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-white dark:bg-surface-800 hover:bg-surface-50 dark:hover:bg-surface-700 text-primary-700 dark:text-primary-300 border border-primary-300/80 dark:border-primary-500/30 shadow-xs hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              {isDownloadingTemplate ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600 dark:text-primary-400" />
                  <span>Generando...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                  <span>Descargar .xlsx</span>
                </>
              )}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Dropzone interactivo accesible por teclado */}
          <div
            role="button"
            tabIndex={isParsing ? -1 : 0}
            aria-disabled={isParsing}
            aria-label="Seleccionar o arrastrar tu archivo Excel (.xlsx) o CSV (.csv)"
            onDragOver={(e) => {
              e.preventDefault();
              if (!isParsing) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => {
              if (!isParsing) fileInputRef.current?.click();
            }}
            onKeyDown={(e) => {
              if (!isParsing && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={clsx(
              "border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all duration-200 group flex flex-col items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
              isParsing
                ? "border-primary-400 bg-primary-50/40 dark:bg-primary-950/20 cursor-wait opacity-80"
                : isDragging
                ? "border-primary-500 bg-primary-50/60 dark:bg-primary-950/40 scale-[1.01] ring-4 ring-primary-500/10 cursor-pointer"
                : "border-surface-300 dark:border-surface-700 hover:border-primary-500 dark:hover:border-primary-400 bg-surface-50/50 dark:bg-surface-900/30 cursor-pointer"
            )}
          >
            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-inner ring-1 ring-primary-500/20">
              {isParsing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </div>

            <h4 className="text-sm font-bold text-surface-900 dark:text-white mb-1">
              {isParsing
                ? "Procesando archivo..."
                : "Selecciona o arrastra tu archivo Excel (.xlsx) o CSV (.csv)"}
            </h4>
            <p className="text-xs text-surface-500 dark:text-slate-400 max-w-sm mb-3">
              {isParsing
                ? "Validando filas y columnas de la hoja de cálculo."
                : "Haz clic aquí para examinar archivos o suelta tu hoja de cálculo directamente."}
            </p>

            {/* Píldora de formato */}
            <div className="inline-flex flex-wrap items-center justify-center gap-1.5 px-3 py-1.5 rounded-2xl sm:rounded-full bg-surface-100 dark:bg-surface-800 text-[11px] font-mono text-surface-600 dark:text-slate-300 border border-surface-200 dark:border-white/10 text-center leading-relaxed">
              <span>Columnas: Nombres* • Apellidos* • Correo* • Documento • Teléfono • Rol</span>
            </div>
          </div>

          {/* Opciones por defecto opcionales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label
                htmlFor="bulk-import-default-location"
                className="text-xs font-bold text-surface-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5"
              >
                <Building className="w-3.5 h-3.5 text-primary-500" />
                Sede por defecto (Opcional)
              </label>
              <CustomSelect
                id="bulk-import-default-location"
                value={defaultLocationId}
                onChange={setDefaultLocationId}
                options={locationOptions}
                placeholder="Sin sede (asignar después)"
                leftIcon={Building}
              />
            </div>
            <div>
              <label
                htmlFor="bulk-import-default-schedule"
                className="text-xs font-bold text-surface-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-primary-500" />
                Horario / Turno por defecto (Opcional)
              </label>
              <CustomSelect
                id="bulk-import-default-schedule"
                value={defaultScheduleId}
                onChange={setDefaultScheduleId}
                options={scheduleOptions}
                placeholder="Sin horario (asignar después)"
                leftIcon={Clock}
              />
            </div>
          </div>
        </div>
      )}

      {/* PASO 2: Previsualización de datos */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-wrap">
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

          <div className="border border-surface-200 dark:border-surface-800 rounded-2xl overflow-auto max-h-72 shadow-inner">
            <table className="w-full text-xs text-left min-w-[520px]">
              <thead className="sticky top-0 z-10 bg-surface-100 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 text-[10px] uppercase font-bold text-surface-500">
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
                          <CheckCircle2 className="w-3 h-3 shrink-0" /> Válido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-danger-600 dark:text-danger-400 bg-danger-500/10 px-2.5 py-0.5 rounded-full text-left">
                          <XCircle className="w-3 h-3 shrink-0" />
                          <span>{row.errors.join(" • ")}</span>
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
          {importResult.created === 0 ? (
            <>
              <div className="w-16 h-16 rounded-3xl bg-danger-500/15 text-danger-500 flex items-center justify-center mx-auto shadow-inner">
                <XCircle className="w-9 h-9" />
              </div>
              <div>
                <h4 className="text-base font-bold text-surface-900 dark:text-white">
                  No se pudo importar ningún colaborador
                </h4>
                <p className="text-xs text-surface-500 dark:text-slate-400 mt-1">
                  Las <strong>{importResult.failed}</strong> filas enviadas presentaron incidencias. Revisa el detalle a continuación.
                </p>
              </div>
            </>
          ) : importResult.failed > 0 ? (
            <>
              <div className="w-16 h-16 rounded-3xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="w-9 h-9" />
              </div>
              <div>
                <h4 className="text-base font-bold text-surface-900 dark:text-white">
                  Importación completada con observaciones
                </h4>
                <p className="text-xs text-surface-500 dark:text-slate-400 mt-1">
                  Se crearon <strong>{importResult.created}</strong> colaboradores y{" "}
                  <strong>{importResult.failed}</strong> filas no pudieron procesarse.
                </p>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}

          {importResult.errors && importResult.errors.length > 0 && (
            <div className="text-left mt-4 p-4 rounded-2xl bg-danger-500/10 border border-danger-500/20">
              <div className="text-xs font-bold text-danger-700 dark:text-danger-300 mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {importResult.errors.length} incidencias no pudieron ser importadas:
              </div>
              <ul className="text-[11px] text-danger-600 dark:text-danger-400 space-y-1 list-disc list-inside max-h-36 overflow-y-auto">
                {importResult.errors.map((err) => (
                  <li key={`${err.row}-${err.email}`}>
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
